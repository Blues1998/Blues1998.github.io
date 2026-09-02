import * as THREE from "three";
import { BIOMES, NB, type Climate } from "./biomes";
import { CHUNK, QUAL, RES, ROAD_BLEND_DIST } from "./config";
import { clamp, fbm, hash2i, mulberry32, smoothstep, TAU } from "./math";
import type { Road } from "./road";
import type { Terrain } from "./terrain";
import type { Vegetation } from "./vegetation";
import type { NoiseFields, WanderState } from "./types";

/*
 * Terrain chunks and the scenery scattered on them.
 *
 * A chunk owns one heightfield mesh plus up to three InstancedMeshes (conifer,
 * deciduous, rock). Everything about a chunk derives from its integer
 * coordinates and the world seed, so a chunk evicted behind the car rebuilds
 * bit-identically if you turn around and come back.
 *
 * Building is amortised: `update` is given a millisecond budget and stops
 * when it runs out, nearest chunk first. A chunk is a few thousand
 * `queryRoad` calls, so building the whole ring in one frame is a visible
 * hitch at speed.
 */
export function createChunks(
  noise: NoiseFields,
  road: Road,
  terrain: Terrain,
  climate: Climate,
  veg: Vegetation,
  state: WanderState,
  scene: THREE.Scene,
  seed: number,
) {
  /* independent of the terrain's probe, because the scatter loop reads a
     biome and then calls sampleGround, which evaluates one of its own */
  const bio = climate.probe();
  const chunks = new Map<string, { cx: number; cz: number; meshes: THREE.Object3D[] }>();
  const queue: [number, number, number, number][] = [];
  const chunkKey = (cx: number, cz: number) => cx + ":" + cz;
  /* Chunks whose ground was baked before the road reached them. The road is
     generated forward only, so a chunk built while the route was still
     elsewhere holds the bare landscape; when the road later curves back into
     it, the tarmac is laid over terrain that knows nothing about it and the
     surface floats or sinks. Measured at 11 to 34 chunks over a few minutes
     of driving - rare, but each one is a stretch of road visibly not in the
     ground. Nothing invalidated them before, because a chunk was assumed to
     be a pure function of its coordinates and the seed, which it stopped
     being the moment its height depended on how much road existed yet. */
  const dirty = new Set<string>();
  const _m4 = new THREE.Matrix4();
  const _q4 = new THREE.Quaternion();
  const _v3 = new THREE.Vector3();
  const _s3 = new THREE.Vector3();
  const _rock = new THREE.Color();
  const _rockTmp = new THREE.Color();

  function build(cx: number, cz: number) {
    const x0 = cx * CHUNK,
      z0 = cz * CHUNK;
    const cell = CHUNK / RES;
    /* Sample a 1-cell border beyond the mesh so normals at the chunk seam are
       computed from real neighbours; without it every chunk edge gets a
       visible lighting crease. */
    const G = RES + 3;
    const hts = new Float32Array(G * G);
    const rds = new Float32Array(G * G);
    for (let j = 0; j < G; j++)
      for (let i = 0; i < G; i++) {
        const x = x0 + (i - 1) * cell,
          z = z0 + (j - 1) * cell;
        const rq = road.query(x, z);
        hts[j * G + i] = terrain.sampleGround(x, z, rq);
        rds[j * G + i] = rq ? rq.d : 999;
      }
    const V = RES + 1;
    const pos = new Float32Array(V * V * 3);
    const nor = new Float32Array(V * V * 3);
    const aRoad = new Float32Array(V * V);
    /* Climate is baked per vertex rather than looked up per fragment, so one
       chunk can span a biome boundary and shade correctly across it, and so
       the far mountains carry their own biome's palette instead of the one
       the car happens to be standing in. */
    const aClimate = new Float32Array(V * V * 2);
    for (let j = 0; j < V; j++)
      for (let i = 0; i < V; i++) {
        const gi = (j + 1) * G + (i + 1);
        const o = (j * V + i) * 3;
        const x = x0 + i * cell,
          z = z0 + j * cell;
        pos[o] = x;
        pos[o + 1] = hts[gi];
        pos[o + 2] = z;
        const nx = hts[gi - 1] - hts[gi + 1];
        const ny = 2 * cell;
        const nz = hts[gi - G] - hts[gi + G];
        const nl = Math.hypot(nx, ny, nz);
        nor[o] = nx / nl;
        nor[o + 1] = ny / nl;
        nor[o + 2] = nz / nl;
        aRoad[j * V + i] = Math.min(rds[gi], 99);
        aClimate[(j * V + i) * 2] = climate.temperatureAt(x, z);
        aClimate[(j * V + i) * 2 + 1] = climate.moistureAt(x, z);
      }
    const idx = new Uint32Array(RES * RES * 6);
    let ii = 0;
    for (let j = 0; j < RES; j++)
      for (let i = 0; i < RES; i++) {
        const a = j * V + i,
          b = a + 1,
          c = a + V,
          d = c + 1;
        idx[ii++] = a;
        idx[ii++] = c;
        idx[ii++] = b;
        idx[ii++] = b;
        idx[ii++] = c;
        idx[ii++] = d;
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("aRoad", new THREE.BufferAttribute(aRoad, 1));
    g.setAttribute("aClimate", new THREE.BufferAttribute(aClimate, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, terrain.material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    const meshes: THREE.Object3D[] = [mesh];

    /* scenery */
    const rng = mulberry32(hash2i(cx, cz, seed));
    const conM: THREE.Matrix4[] = [],
      decM: THREE.Matrix4[] = [],
      rokM: THREE.Matrix4[] = [],
      rokC: THREE.Color[] = [];
    for (let t = 0; t < 72; t++) {
      const px = x0 + rng() * CHUNK,
        pz = z0 + rng() * CHUNK;
      const rq = road.query(px, pz);
      if (rq && rq.d < 13) continue; // keep the verge clear
      /* Read the biome first and copy out what we need: everything below
         calls sampleGround, which drives the terrain's own probe. */
      const b = bio.at(px, pz);
      const treeDensity = b.treeDensity,
        coniferBias = b.coniferBias,
        treeScale = b.treeScale;
      if (treeDensity < 0.005) continue; // salt flats have no trees at all
      /* Forest density is its own low-frequency field, so woodland has edges
         and clearings instead of an even sprinkle; the biome then scales how
         much of that field actually becomes canopy. */
      const forest = fbm(noise.veg, px * 0.003, pz * 0.003, 2);
      if (rng() > smoothstep(-0.28, 0.55, forest) * 0.9 * treeDensity) continue;
      const h = terrain.sampleGround(px, pz, rq);
      const hX = terrain.sampleGround(px + 2.5, pz);
      const hZ = terrain.sampleGround(px, pz + 2.5);
      if (Math.hypot(hX - h, hZ - h) / 2.5 > 0.6) continue; // too steep to root
      const sc = (0.7 + rng() * 0.9) * treeScale;
      _q4.setFromAxisAngle(_v3.set(0, 1, 0), rng() * TAU);
      _m4.compose(_v3.set(px, h - 0.15, pz), _q4, _s3.set(sc, sc * (0.9 + rng() * 0.25), sc));
      /* Species by another slow field plus an altitude rule, which gives
         coherent stands rather than a random mix, and a treeline. The biome
         shifts the threshold rather than replacing the field, so stands stay
         coherent across a boundary instead of dissolving into a checkerboard:
         bias 1 puts the threshold below the field's floor (all conifer), bias
         0 above its ceiling (none). */
      const coniferField = noise.veg(px * 0.0006 + 50.2, pz * 0.0006 - 30.7);
      const conifer = coniferField > clamp(1 - 2 * coniferBias, -1, 1) || h > 95;
      (conifer ? conM : decM).push(_m4.clone());
    }
    for (let t = 0; t < 9; t++) {
      const px = x0 + rng() * CHUNK,
        pz = z0 + rng() * CHUNK;
      const rq = road.query(px, pz);
      if (rq && rq.d < 9) continue;
      const w = bio.sample(px, pz);
      const b = bio.blend(w);
      const rockDensity = b.rockDensity,
        rockScale = b.rockScale;
      /* 0.4 was the tuned base rate; the biome scales it, so a boulder field
         in the alpine and a bare pan in the salt flats come from one number */
      if (rng() > 0.4 * rockDensity) continue;
      /* Bake the blended rock colour per instance. Without this a boulder is
         the same grey in basalt and in red sandstone, which is the single
         most obvious way scattered geometry gives away that only the ground
         is biome-aware. Safe to read `w` here: sampleGround below drives the
         terrain's own probe, not this one. */
      _rock.setRGB(0, 0, 0);
      for (let i = 0; i < NB; i++) {
        const f = w[i];
        if (f < 1e-4) continue;
        _rock.add(_rockTmp.copy(BIOMES[i].rock).multiplyScalar(f));
      }
      const h = terrain.sampleGround(px, pz, rq);
      const sc = (0.5 + rng() * rng() * 2.4) * rockScale; // squared: many small, few large
      _q4.setFromAxisAngle(_v3.set(0, 1, 0), rng() * TAU);
      _m4.compose(_v3.set(px, h + 0.1 * sc, pz), _q4, _s3.set(sc, sc, sc));
      rokM.push(_m4.clone());
      rokC.push(_rock.clone());
    }
    const addInst = (geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], cols?: THREE.Color[]) => {
      if (!mats.length) return;
      const im = new THREE.InstancedMesh(geo, mat, mats.length);
      for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
      im.instanceMatrix.needsUpdate = true;
      if (cols) {
        for (let i = 0; i < cols.length; i++) im.setColorAt(i, cols[i]);
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      }
      im.computeBoundingSphere();
      im.castShadow = true;
      im.receiveShadow = true;
      scene.add(im);
      meshes.push(im);
    };
    addInst(veg.coniferGeo, veg.coniferMat, conM);
    addInst(veg.decidGeo, veg.decidMat, decM);
    addInst(veg.rockGeo, veg.rockMat, rokM, rokC);
    chunks.set(chunkKey(cx, cz), { cx, cz, meshes });
  }

  /* Shared species geometry must survive chunk eviction; only per-chunk
     heightfields are actually owned by the chunk. */
  const isShared = (geo: THREE.BufferGeometry) => geo === veg.coniferGeo || geo === veg.decidGeo || geo === veg.rockGeo;

  function release(ch: { meshes: THREE.Object3D[] }) {
    for (const m of ch.meshes) {
      scene.remove(m);
      const mesh = m as THREE.Mesh | THREE.InstancedMesh;
      if (!isShared(mesh.geometry as THREE.BufferGeometry)) mesh.geometry.dispose();
      if ("dispose" in mesh && typeof (mesh as THREE.InstancedMesh).dispose === "function") (mesh as THREE.InstancedMesh).dispose();
    }
  }

  /* Mark every resident chunk the newly finished road runs through, plus the
     halo its earthworks reach into. Cheap: a frame adds ~10 centreline points
     and almost all of them land far outside the resident ring. */
  const HALO = Math.ceil(ROAD_BLEND_DIST / CHUNK);
  function markRoadGrowth() {
    const { from, to } = road.drainNew();
    for (let i = from; i < to; i++) {
      const p = road.pts[i];
      const cx = Math.floor(p.x / CHUNK),
        cz = Math.floor(p.z / CHUNK);
      for (let dx = -HALO; dx <= HALO; dx++)
        for (let dz = -HALO; dz <= HALO; dz++) {
          const key = chunkKey(cx + dx, cz + dz);
          if (chunks.has(key)) dirty.add(key);
        }
    }
  }

  function update(px: number, pz: number, budgetMs: number) {
    const R = QUAL[state.quality].radius;
    const ccx = Math.round(px / CHUNK),
      ccz = Math.round(pz / CHUNK);
    markRoadGrowth();
    // drop far chunks (one ring of hysteresis, so driving a seam doesn't thrash)
    for (const [key, ch] of chunks) {
      if (Math.max(Math.abs(ch.cx - ccx), Math.abs(ch.cz - ccz)) > R + 1) {
        release(ch);
        chunks.delete(key);
        dirty.delete(key);
      }
    }
    // queue missing and stale, near-first
    queue.length = 0;
    for (let dx = -R; dx <= R; dx++)
      for (let dz = -R; dz <= R; dz++) {
        const cx = ccx + dx,
          cz = ccz + dz;
        const key = chunkKey(cx, cz);
        if (!chunks.has(key)) queue.push([dx * dx + dz * dz, cx, cz, 0]);
        else if (dirty.has(key)) queue.push([dx * dx + dz * dz, cx, cz, 1]);
      }
    if (!queue.length) return;
    queue.sort((a, b) => a[0] - b[0]);
    const t0 = performance.now();
    for (const [, cx, cz, rebuild] of queue) {
      const key = chunkKey(cx, cz);
      if (rebuild) {
        const ch = chunks.get(key);
        if (ch) release(ch);
        chunks.delete(key);
        dirty.delete(key);
      }
      build(cx, cz);
      if (performance.now() - t0 > budgetMs) break;
    }
  }

  return {
    update,
    dispose() {
      for (const ch of chunks.values()) release(ch);
      chunks.clear();
      dirty.clear();
    },
  };
}

export type Chunks = ReturnType<typeof createChunks>;
