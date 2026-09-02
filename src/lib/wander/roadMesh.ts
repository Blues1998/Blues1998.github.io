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
    side: THREE.DoubleSide,
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
      // Traveled wheel tracks are polished and slightly darker
      alb *= 1.0 - 0.16 * exp(-pow((abs(u) - 0.45) * 5.5, 2.0));
      float edge = 1.0 - smoothstep(0.018, 0.034, abs(abs(u) - 0.86));
      float dash = (1.0 - smoothstep(0.014, 0.03, abs(u))) * step(fract(vUv.y * 0.125), 0.5);
      float wear = 0.55 + 0.45 * vnoise(vec2(vUv.y * 0.9, u * 3.0));
      // Lane markings (only on the road deck, not on the side skirts)
      float onDeck = 1.0 - step(1.0, abs(u));
      alb = mix(alb, vec3(0.8, 0.8, 0.78), max(edge, dash) * 0.85 * wear * onDeck);
      alb *= 1.0 - uWet * 0.4;

      // Dark aggregate foundation for side skirts extending into the terrain bed
      float skirtM = smoothstep(1.0, 1.08, abs(u));
      alb = mix(alb, vec3(0.055, 0.058, 0.062), skirtM);

      // Winter highway: plowed, salted dark asphalt travel lanes with wet reflections;
      // packed snowbanks concentrated along shoulders and verges for clear visual separation
      if (uSnow > 0.01) {
        float shoulderSnow = smoothstep(0.78, 1.0, abs(u)) * 0.95;
        float centerSlush = (1.0 - smoothstep(0.02, 0.18, abs(u))) * 0.22 * vnoise(vec2(vUv.y * 0.8, 0.0));
        float snowFactor = uSnow * clamp(shoulderSnow + centerSlush, 0.0, 1.0);
        vec3 plowedAsphalt = alb * vec3(0.82, 0.85, 0.90);
        alb = mix(plowedAsphalt, vec3(0.92, 0.94, 0.97), snowFactor);
      }

      vec3 nn = normalize(vN);
      vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
      if (uWet > 0.01 || uSnow > 0.01) {
        vec3 V = normalize(uCamPos - vP);
        vec3 H = normalize(V + uSunDir);
        float specAmt = max(uWet * 0.5, uSnow * 0.35 * (1.0 - smoothstep(0.75, 1.0, abs(u))));
        col += uSunColor * pow(max(dot(nn, H), 0.0), 60.0) * specAmt;
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
    // 4 vertices per cross-section: [0: left skirt base, 1: left edge, 2: right edge, 3: right skirt base]
    const pos = new Float32Array(count * 4 * 3);
    const nor = new Float32Array(count * 4 * 3);
    const uv = new Float32Array(count * 4 * 2);
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

      const y = p.y + 0.08;
      const skirtY = p.y - 0.85; // penetrates 85 cm into terrain foundation bed
      const skirtOffset = ROAD_HALF + 0.45;

      const vi = i * 4;
      const o = vi * 3;

      // Vertex 0: Left skirt bottom
      pos[o] = p.x - rx * skirtOffset;
      pos[o + 1] = skirtY;
      pos[o + 2] = p.z - rz * skirtOffset;
      nor[o] = -rx * 0.85 + nx * 0.15;
      nor[o + 1] = 0.2;
      nor[o + 2] = -rz * 0.85 + nz * 0.15;

      // Vertex 1: Left road edge
      pos[o + 3] = p.x - rx * ROAD_HALF;
      pos[o + 4] = y;
      pos[o + 5] = p.z - rz * ROAD_HALF;
      nor[o + 3] = nx;
      nor[o + 4] = ny;
      nor[o + 5] = nz;

      // Vertex 2: Right road edge
      pos[o + 6] = p.x + rx * ROAD_HALF;
      pos[o + 7] = y;
      pos[o + 8] = p.z + rz * ROAD_HALF;
      nor[o + 6] = nx;
      nor[o + 7] = ny;
      nor[o + 8] = nz;

      // Vertex 3: Right skirt bottom
      pos[o + 9] = p.x + rx * skirtOffset;
      pos[o + 10] = skirtY;
      pos[o + 11] = p.z + rz * skirtOffset;
      nor[o + 9] = rx * 0.85 + nx * 0.15;
      nor[o + 10] = 0.2;
      nor[o + 11] = rz * 0.85 + nz * 0.15;

      const s = (i0 + i) * DS;
      const uvi = vi * 2;
      uv[uvi] = -1.25;
      uv[uvi + 1] = s;
      uv[uvi + 2] = -1.0;
      uv[uvi + 3] = s;
      uv[uvi + 4] = 1.0;
      uv[uvi + 5] = s;
      uv[uvi + 6] = 1.25;
      uv[uvi + 7] = s;

      if (i > 0) {
        const a = (i - 1) * 4;
        const b = i * 4;
        // Quad 0: Left skirt (CCW viewed from left)
        idx.push(a, b, a + 1, b, b + 1, a + 1);
        // Quad 1: Road carriageway surface (CCW viewed from above)
        idx.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
        // Quad 2: Right skirt (CCW viewed from right)
        idx.push(a + 2, b + 2, a + 3, b + 2, b + 3, a + 3);
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
