import * as THREE from "three";
import { DS, PIECE, POST_CAP, QUAL, ROAD_HALF } from "./config";
import { GLSL_COMMON } from "./glsl";
import type { Road } from "./road";
import type { Uniforms, WanderState } from "./types";

/*
 * The paved surface and the reflector posts beside it.
 *
 * The road is built in fixed-length pieces rather than one growing mesh, so
 * the strip behind the car can be dropped as the strip ahead is added and the
 * vertex count stays constant however far you drive. Markings (centre dashes,
 * edge lines, wear) are shaded from UV, not textured: `uv.x` is -1..1 across
 * the width and `uv.y` is arc length in metres, which makes dash spacing a
 * real-world distance instead of a texture repeat that stretches in corners.
 */
export function createRoadMesh(road: Road, U: Uniforms, state: WanderState, scene: THREE.Scene, onPiecesChanged: (carS: number) => void) {
  const material = new THREE.ShaderMaterial({
    uniforms: U as unknown as Record<string, THREE.IUniform>,
    fog: false,
    vertexShader: `
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      vUv = uv; vN = normal; vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader:
      GLSL_COMMON +
      `
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      float u = vUv.x;
      vec3 alb = vec3(0.082, 0.085, 0.092);
      float n = vnoise(vec2(u * 42.0, vUv.y * 2.1));
      alb *= 0.88 + 0.24 * n;
      alb *= 1.0 - 0.16 * exp(-pow((abs(u) - 0.45) * 5.5, 2.0));
      float edge = 1.0 - smoothstep(0.018, 0.034, abs(abs(u) - 0.86));
      float dash = (1.0 - smoothstep(0.014, 0.03, abs(u))) * step(fract(vUv.y * 0.125), 0.5);
      float wear = 0.55 + 0.45 * vnoise(vec2(vUv.y * 0.9, u * 3.0));
      alb = mix(alb, vec3(0.8, 0.8, 0.78), max(edge, dash) * 0.85 * wear);
      alb *= 1.0 - uWet * 0.4;
      float sn = uSnow * (smoothstep(0.5, 0.95, abs(u)) * 0.9 + 0.25 * vnoise(vec2(vUv.y * 0.5, u * 4.0)));
      alb = mix(alb, vec3(0.9, 0.92, 0.95), clamp(sn, 0.0, 1.0));
      vec3 nn = normalize(vN);
      vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
      if (uWet > 0.01) {
        vec3 V = normalize(uCamPos - vP);
        vec3 H = normalize(V + uSunDir);
        col += uSunColor * pow(max(dot(nn, H), 0.0), 60.0) * uWet * 0.5;
      }
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });

  const pieces = new Map<number, THREE.Mesh>();

  function buildPiece(pi: number) {
    const i0 = pi * PIECE,
      i1 = Math.min(i0 + PIECE, road.pts.length - 1);
    if (i1 <= i0) return null;
    const count = i1 - i0 + 1;
    const pos = new Float32Array(count * 2 * 3);
    const nor = new Float32Array(count * 2 * 3);
    const uv = new Float32Array(count * 2 * 2);
    const idx: number[] = [];
    for (let i = 0; i < count; i++) {
      const p = road.pts[i0 + i];
      const prev = road.pts[Math.max(i0 + i - 1, 0)];
      const next = road.pts[Math.min(i0 + i + 1, road.pts.length - 1)];
      const slope = (next.y - prev.y) / Math.max(2 * DS, 1);
      const rx = p.dz,
        rz = -p.dx; // right perpendicular
      let fx = p.dx,
        fy = slope,
        fz = p.dz;
      const fl = Math.hypot(fx, fy, fz);
      fx /= fl;
      fy /= fl;
      fz /= fl;
      // normal = cross(forward, right)
      let nx = fy * rz - fz * 0,
        ny = fz * rx - fx * rz,
        nz = fx * 0 - fy * rx;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const y = p.y + 0.06;
      const o = i * 6;
      pos[o] = p.x - rx * ROAD_HALF;
      pos[o + 1] = y;
      pos[o + 2] = p.z - rz * ROAD_HALF;
      pos[o + 3] = p.x + rx * ROAD_HALF;
      pos[o + 4] = y;
      pos[o + 5] = p.z + rz * ROAD_HALF;
      nor[o] = nx;
      nor[o + 1] = ny;
      nor[o + 2] = nz;
      nor[o + 3] = nx;
      nor[o + 4] = ny;
      nor[o + 5] = nz;
      const s = (i0 + i) * DS;
      uv[i * 4] = -1;
      uv[i * 4 + 1] = s;
      uv[i * 4 + 2] = 1;
      uv[i * 4 + 3] = s;
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  /* ---------------- roadside reflector posts ---------------- */
  function makePostGeometry() {
    const stem = new THREE.BoxGeometry(0.13, 0.85, 0.13).translate(0, 0.425, 0);
    const band = new THREE.BoxGeometry(0.145, 0.13, 0.145).translate(0, 0.72, 0);
    const colorize = (g: THREE.BufferGeometry, c: THREE.Color) => {
      const n = g.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    };
    const parts = [colorize(stem, new THREE.Color(0.85, 0.86, 0.88)), colorize(band, new THREE.Color(0.85, 0.1, 0.08))];
    const merged = new THREE.BufferGeometry();
    const attrs = ["position", "normal", "color"] as const;
    const data: Record<string, number[]> = {};
    for (const a of attrs) data[a] = [];
    for (const part of parts) {
      const ng = part.toNonIndexed();
      for (const a of attrs) data[a].push(...(ng.getAttribute(a).array as unknown as number[]));
    }
    for (const a of attrs) merged.setAttribute(a, new THREE.BufferAttribute(new Float32Array(data[a]), 3));
    return merged;
  }

  const postGeo = makePostGeometry();
  const postMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x222222, emissiveIntensity: 0.4 });
  const postGlow = { value: 0 };
  /* Reflector bands flare up in the headlights at night. Picked out in the
     shader by colour (red channel high, green low) rather than by a second
     material, so both parts stay in one instanced draw. */
  postMat.onBeforeCompile = (sh: { uniforms: Record<string, unknown>; fragmentShader: string }) => {
    sh.uniforms.uPostGlow = postGlow;
    sh.fragmentShader =
      "uniform float uPostGlow;\n" +
      sh.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
     totalEmissiveRadiance += vColor.rgb * step(0.5, vColor.r) * step(vColor.g, 0.4) * uPostGlow;`,
      );
  };
  const postsMesh = new THREE.InstancedMesh(postGeo, postMat, POST_CAP);
  postsMesh.frustumCulled = false;
  postsMesh.castShadow = true;
  postsMesh.receiveShadow = true;
  scene.add(postsMesh);
  const _pm = new THREE.Matrix4();

  let rangeLo = -1,
    rangeHi = -1;

  /* Keep the window of built pieces centred on the car: 500 m behind, out to
     the fog line ahead. Early-outs when the window hasn't moved, which is
     most frames. */
  function ensure(carS: number) {
    const lo = Math.max(0, Math.floor((carS - 500) / (PIECE * DS)));
    const hi = Math.floor((carS + QUAL[state.quality].radius * 132 + 400) / (PIECE * DS));
    if (lo === rangeLo && hi === rangeHi) return;
    rangeLo = lo;
    rangeHi = hi;
    for (const [pi, mesh] of pieces) {
      if (pi < lo || pi > hi) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        pieces.delete(pi);
      }
    }
    for (let pi = lo; pi <= hi; pi++) {
      if (!pieces.has(pi)) {
        const m = buildPiece(pi);
        if (m) pieces.set(pi, m);
      }
    }
    // refresh posts
    let n = 0;
    const iLo = lo * PIECE,
      iHi = Math.min(hi * PIECE + PIECE, road.pts.length - 1);
    for (let i = iLo; i <= iHi && n < POST_CAP - 1; i += 12) {
      const p = road.pts[i];
      const rx = p.dz,
        rz = -p.dx;
      for (const side of [-1, 1]) {
        _pm.makeRotationY(Math.atan2(p.dx, p.dz));
        _pm.setPosition(p.x + rx * (ROAD_HALF + 1.1) * side, p.y, p.z + rz * (ROAD_HALF + 1.1) * side);
        postsMesh.setMatrixAt(n++, _pm);
      }
    }
    postsMesh.count = n;
    postsMesh.instanceMatrix.needsUpdate = true;
    onPiecesChanged(carS);
  }

  return {
    material,
    postGlow,
    ensure,
    dispose() {
      for (const mesh of pieces.values()) mesh.geometry.dispose();
      pieces.clear();
      postGeo.dispose();
      postMat.dispose();
      material.dispose();
    },
  };
}

export type RoadMesh = ReturnType<typeof createRoadMesh>;
