import * as THREE from "three";
import type { Climate } from "./biomes";
import { DS, FLOWER_CAP, GRASS_CAP, QUAL, ROAD_HALF } from "./config";
import { GLSL_COMMON } from "./glsl";
import { hash2i, mulberry32, TAU } from "./math";
import type { Road } from "./road";
import type { Terrain } from "./terrain";
import type { Uniforms, WanderState } from "./types";

/*
 * Verge grass and flowers.
 *
 * Unlike trees, these are not attached to chunks. They are scattered along
 * the *road*, in a band either side, because that is the only place the
 * camera ever gets close enough to resolve a blade. One fixed-size instance
 * buffer is refilled as the car moves rather than allocated per region, so
 * the vertex count is constant and there is nothing to garbage collect.
 *
 * Refilling is a job queue drained a couple of milliseconds per frame:
 * placing a blade costs a `queryRoad` plus a ground sample, and doing four
 * thousand of those in one frame is a stall.
 */
export function createGrass(road: Road, terrain: Terrain, climate: Climate, U: Uniforms, state: WanderState, scene: THREE.Scene, seed: number) {
  /* own probe: the refill loop reads cover density and then samples ground */
  const bio = climate.probe();

  /* Five vertices: a tapered strip that comes to a point. Cheaper than a
     quad and the silhouette is better. */
  const grassGeo = new THREE.InstancedBufferGeometry();
  {
    const pos = new Float32Array([-0.055, 0, 0, 0.055, 0, 0, -0.032, 0.55, 0, 0.032, 0.55, 0, 0, 1.0, 0]);
    const uvA = new Float32Array([0, 0, 1, 0, 0.2, 0.55, 0.8, 0.55, 0.5, 1]);
    grassGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    grassGeo.setAttribute("uv", new THREE.BufferAttribute(uvA, 2));
    grassGeo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  }
  const grassOff = new Float32Array(GRASS_CAP * 3);
  const grassRnd = new Float32Array(GRASS_CAP * 4);
  const grassOffAttr = new THREE.InstancedBufferAttribute(grassOff, 3).setUsage(THREE.DynamicDrawUsage);
  const grassRndAttr = new THREE.InstancedBufferAttribute(grassRnd, 4).setUsage(THREE.DynamicDrawUsage);
  grassGeo.setAttribute("aOffset", grassOffAttr);
  grassGeo.setAttribute("aRand", grassRndAttr);
  grassGeo.instanceCount = 0;

  const grassMat = new THREE.ShaderMaterial({
    uniforms: U as unknown as Record<string, THREE.IUniform>,
    fog: false,
    side: THREE.DoubleSide,
    vertexShader:
      GLSL_COMMON +
      `
    attribute vec3 aOffset; attribute vec4 aRand;
    uniform float uGrassGrow;
    varying vec3 vP; varying float vT, vR, vSh;
    void main(){
      float c = cos(aRand.x * 6.28318), s = sin(aRand.x * 6.28318);
      vec3 p = position;
      p.x *= 0.8 + aRand.z * 0.5;
      p.y *= (0.55 + aRand.y * 0.5) * uGrassGrow;
      float sway = sin(uTime * 1.6 + aOffset.x * 0.33 + aOffset.z * 0.27) * (0.10 + 0.08 * aRand.z)
                 + sin(uTime * 4.3 + aOffset.z * 1.7) * 0.03;
      /* bend scales with y^2 so the base stays planted and only the tip moves */
      float lean = (aRand.w - 0.5) * 0.55 + sway;
      p.x += lean * p.y * p.y * 1.7;
      p.z += (aRand.z - 0.5) * 0.35 * p.y * p.y;
      vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
      vec3 wp = aOffset + rp;
      vP = wp; vT = uv.y; vR = aRand.z;
      /* shadowed per-vertex with an up normal: grass is too thin for the
         per-fragment cost to buy anything */
      vSh = sunShadow(wp, vec3(0.0, 1.0, 0.0));
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,
    fragmentShader:
      GLSL_COMMON +
      `
    varying vec3 vP; varying float vT, vR, vSh;
    void main(){
      vec3 alb = mix(uGrass * 0.5, mix(uGrass, uGrassAlt, vR) * 1.3, vT);
      alb *= 0.9 + 0.2 * hash12(floor(vP.xz * 7.0));
      alb *= 1.0 - uWet * 0.35;
      alb = mix(alb, vec3(0.93, 0.95, 0.98), uSnowNear * 0.85);
      vec3 col = doLight(alb, vec3(0.0, 1.0, 0.0), vP, vSh);
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const grassMesh = new THREE.Mesh(grassGeo, grassMat);
  grassMesh.frustumCulled = false;
  scene.add(grassMesh);

  /* flowers: crossed quads in clusters, scaled by a seasonal bloom factor */
  const FLOWER_COLS = ["#ffffff", "#ffd94a", "#ff9ec6", "#b7a6ff", "#ff7a5c", "#8fd0ff"].map((h) => new THREE.Color(h));
  const flowerTex = (() => {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = 64;
    const ctx = cnv.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 11, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd94a";
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, TAU);
    ctx.fill();
    const t = new THREE.CanvasTexture(cnv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const flowerGeo = new THREE.InstancedBufferGeometry();
  {
    const pos: number[] = [],
      uvA: number[] = [],
      idx: number[] = [];
    let vi = 0;
    for (const ang of [0, Math.PI / 2]) {
      const c = Math.cos(ang),
        s = Math.sin(ang);
      for (const [x, y] of [
        [-0.14, 0],
        [0.14, 0],
        [0.14, 0.3],
        [-0.14, 0.3],
      ])
        pos.push(x * c, y, x * s);
      uvA.push(0, 0, 1, 0, 1, 1, 0, 1);
      idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
    flowerGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
    flowerGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvA), 2));
    flowerGeo.setIndex(idx);
  }
  const flowerOff = new Float32Array(FLOWER_CAP * 3);
  const flowerRnd = new Float32Array(FLOWER_CAP * 2);
  const flowerCol = new Float32Array(FLOWER_CAP * 3);
  const flowerOffAttr = new THREE.InstancedBufferAttribute(flowerOff, 3).setUsage(THREE.DynamicDrawUsage);
  const flowerRndAttr = new THREE.InstancedBufferAttribute(flowerRnd, 2).setUsage(THREE.DynamicDrawUsage);
  const flowerColAttr = new THREE.InstancedBufferAttribute(flowerCol, 3).setUsage(THREE.DynamicDrawUsage);
  flowerGeo.setAttribute("aOffset", flowerOffAttr);
  flowerGeo.setAttribute("aRand", flowerRndAttr);
  flowerGeo.setAttribute("aColor", flowerColAttr);
  flowerGeo.instanceCount = 0;

  const flowerMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({ uMap: { value: flowerTex } }, U) as unknown as Record<string, THREE.IUniform>,
    fog: false,
    side: THREE.DoubleSide,
    vertexShader:
      GLSL_COMMON +
      `
    attribute vec3 aOffset; attribute vec2 aRand; attribute vec3 aColor;
    uniform float uBloom;
    varying vec2 vUv; varying vec3 vC, vP;
    void main(){
      vUv = uv; vC = aColor;
      vec3 p = position * aRand.x * uBloom;
      float c = cos(aRand.y * 6.28318), s = sin(aRand.y * 6.28318);
      vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
      rp.x += sin(uTime * 1.9 + aOffset.z * 0.8) * 0.05 * p.y;
      vec3 wp = aOffset + rp;
      vP = wp;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,
    fragmentShader:
      GLSL_COMMON +
      `
    uniform sampler2D uMap;
    varying vec2 vUv; varying vec3 vC, vP;
    void main(){
      vec4 tex = texture2D(uMap, vUv);
      if (tex.a < 0.55) discard;
      vec3 alb = tex.rgb * vC;
      alb = mix(alb, vec3(0.93, 0.95, 0.98), uSnowNear * 0.6);
      vec3 col = doLight(alb, vec3(0.0, 1.0, 0.0), vP, 1.0);
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const flowerMesh = new THREE.Mesh(flowerGeo, flowerMat);
  flowerMesh.frustumCulled = false;
  scene.add(flowerMesh);

  /* Refill queues, consumed a few ms per frame. A job packs (roadIndex, side,
     slot) into one int so the queue is a flat number[] with no allocation. */
  const grassJobs: number[] = [];
  const flowerJobs: number[] = [];
  let grassFilled = 0,
    flowerFilled = 0;

  function queueRefill(carS: number) {
    const iLo = Math.max(4, Math.floor((carS - 420) / DS));
    const iHi = Math.min(road.pts.length - 3, Math.ceil((carS + QUAL[state.quality].radius * 132 + 380) / DS));
    const step = state.quality === 0 ? 2 : 1;
    const perSide = state.quality === 2 ? 4 : state.quality === 1 ? 3 : 2;
    const idxs: number[] = [];
    for (let i = iLo; i < iHi; i += step) idxs.push(i);
    /* nearest-first, because the queue is drained from the *end* (pop) and
       may never reach the far entries before the next refill */
    idxs.sort((a, b) => Math.abs(a * DS - carS) - Math.abs(b * DS - carS));
    grassJobs.length = 0;
    flowerJobs.length = 0;
    for (const i of idxs) {
      const p = road.pts[i];
      const cover = bio.at(p.x, p.z).grassCover;
      /* Fractional cover is resolved with a stable per-index hash rather than
         by rounding, so a verge at 0.18 cover thins out evenly along the road
         instead of snapping between two blades and none at some threshold. */
      const raw = perSide * cover;
      const n = Math.floor(raw) + ((hash2i(i, 97, seed) % 1000) / 1000 < raw % 1 ? 1 : 0);
      for (let sd = 0; sd < 2; sd++)
        for (let b = 0; b < n && grassJobs.length < GRASS_CAP; b++) grassJobs.push((i << 3) | (sd << 2) | b);
    }
    for (let i = iLo + 3; i < iHi; i += 6) {
      const p = road.pts[i];
      const fCover = bio.at(p.x, p.z).flowerCover;
      if (fCover < 0.01) continue; // nothing blooms in basalt or salt
      for (let sd = 0; sd < 2; sd++) {
        /* half of candidate clusters survived originally; biome cover scales
           that survival rate rather than the blooms per cluster, so flowers
           stay clumped instead of spreading into a thin even dusting */
        if ((hash2i(i, 733 + sd * 7, seed) % 1000) / 1000 < 1 - 0.5 * fCover) continue;
        for (let c = 0; c < 4 && flowerJobs.length < FLOWER_CAP; c++) flowerJobs.push((i << 3) | (sd << 2) | c);
      }
    }
    grassFilled = 0;
    flowerFilled = 0;
    grassGeo.instanceCount = 0;
    flowerGeo.instanceCount = 0;
  }

  function processJobs(budgetMs: number) {
    if (!grassJobs.length && !flowerJobs.length) return;
    const t0 = performance.now();
    while (grassJobs.length) {
      const job = grassJobs.pop()!;
      const side = ((job >> 2) & 1) * 2 - 1,
        i = job >> 3;
      const o = grassFilled++;
      const p = road.pts[i];
      const rng = mulberry32(hash2i(i, 11 + (job & 7), seed));
      const rx = p.dz,
        rz = -p.dx;
      const along = (rng() - 0.5) * 3.6;
      /* pow(rng, 1.6) biases blades toward the tarmac edge, where they read */
      const lat = side * (ROAD_HALF + 0.55 + Math.pow(rng(), 1.6) * 8.5);
      const px = p.x + rx * lat + p.dx * along;
      const pz = p.z + rz * lat + p.dz * along;
      const rq = road.query(px, pz);
      /* dropped far below ground rather than skipped, so the instance slot
         stays stable and the buffer needs no compaction */
      let h = -500;
      if (!rq || rq.d > ROAD_HALF + 0.3) h = terrain.sampleGround(px, pz, rq || undefined) - 0.03;
      grassOff[o * 3] = px;
      grassOff[o * 3 + 1] = h;
      grassOff[o * 3 + 2] = pz;
      grassRnd[o * 4] = rng();
      grassRnd[o * 4 + 1] = rng();
      grassRnd[o * 4 + 2] = rng();
      grassRnd[o * 4 + 3] = rng();
      grassGeo.instanceCount = grassFilled;
      if (performance.now() - t0 > budgetMs) break;
    }
    grassOffAttr.needsUpdate = true;
    grassRndAttr.needsUpdate = true;
    while (flowerJobs.length && performance.now() - t0 <= budgetMs) {
      const job = flowerJobs.pop()!;
      const cI = job & 3,
        side = ((job >> 2) & 1) * 2 - 1,
        i = job >> 3;
      const o = flowerFilled++;
      const p = road.pts[i];
      const rx = p.dz,
        rz = -p.dx;
      /* two RNGs: one for the cluster centre, one per bloom within it, so
         flowers arrive in clumps the way they actually grow */
      const crng = mulberry32(hash2i(i, 733 + ((job >> 2) & 1) * 7, seed));
      const clat = side * (ROAD_HALF + 1.2 + crng() * 7.5);
      const calong = (crng() - 0.5) * 4;
      const cx0 = p.x + rx * clat + p.dx * calong;
      const cz0 = p.z + rz * clat + p.dz * calong;
      const jr = mulberry32(hash2i(i, 1553 + cI, seed));
      const px = cx0 + (jr() - 0.5) * 2.2;
      const pz = cz0 + (jr() - 0.5) * 2.2;
      const rq = road.query(px, pz);
      let h = -500;
      if (!rq || rq.d > ROAD_HALF + 0.4) h = terrain.sampleGround(px, pz, rq || undefined) - 0.02;
      flowerOff[o * 3] = px;
      flowerOff[o * 3 + 1] = h;
      flowerOff[o * 3 + 2] = pz;
      flowerRnd[o * 2] = 0.7 + jr() * 0.7;
      flowerRnd[o * 2 + 1] = jr();
      const col = FLOWER_COLS[(jr() * FLOWER_COLS.length) | 0];
      flowerCol[o * 3] = col.r;
      flowerCol[o * 3 + 1] = col.g;
      flowerCol[o * 3 + 2] = col.b;
      flowerGeo.instanceCount = flowerFilled;
    }
    flowerOffAttr.needsUpdate = true;
    flowerRndAttr.needsUpdate = true;
    flowerColAttr.needsUpdate = true;
  }

  return {
    flowerMesh,
    queueRefill,
    processJobs,
    dispose() {
      grassGeo.dispose();
      grassMat.dispose();
      flowerGeo.dispose();
      flowerMat.dispose();
      flowerTex.dispose();
    },
  };
}

export type Grass = ReturnType<typeof createGrass>;
