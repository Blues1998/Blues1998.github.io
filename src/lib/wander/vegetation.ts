import * as THREE from "three";
import { GLSL_COMMON } from "./glsl";
import { hash2i } from "./math";
import type { Uniforms } from "./types";

/*
 * Tree and rock geometry, and the material that draws them.
 *
 * Each species is a handful of primitives merged into one non-indexed buffer
 * with two extra attributes baked in: `color` (per-vertex albedo, so trunk and
 * canopy share a draw call) and `aFoliage` (1 on leaves, 0 on wood). Foliage
 * is what the shader keys on to apply seasonal colour, wind sway and the
 * autumn thinning, so a tree loses its leaves without any geometry changing.
 */

interface MergePart {
  geo: THREE.BufferGeometry;
  matrix?: THREE.Matrix4;
  color: THREE.Color;
  foliage: number;
}

function mergeParts(parts: MergePart[]) {
  const posA: number[] = [],
    norA: number[] = [],
    colA: number[] = [],
    folA: number[] = [];
  for (const part of parts) {
    const g = part.geo.toNonIndexed();
    if (part.matrix) g.applyMatrix4(part.matrix);
    const p = g.getAttribute("position").array as unknown as number[],
      nn = g.getAttribute("normal").array as unknown as number[];
    for (let i = 0; i < p.length; i++) {
      posA.push(p[i]);
      norA.push(nn[i]);
    }
    const n = g.getAttribute("position").count;
    for (let i = 0; i < n; i++) {
      colA.push(part.color.r, part.color.g, part.color.b);
      folA.push(part.foliage);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posA), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(norA), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colA), 3));
  g.setAttribute("aFoliage", new THREE.BufferAttribute(new Float32Array(folA), 1));
  return g;
}

const M4 = (x: number, y: number, z: number, s = 1) => new THREE.Matrix4().makeScale(s, s, s).setPosition(x, y, z);

export function createVegetation(U: Uniforms) {
  const trunkCol = new THREE.Color(0x5a4633);
  /* Foliage vertices are painted white and tinted by the shader's seasonal
     leaf uniforms; the baked colour is only meaningful on wood. */
  const white = new THREE.Color(1, 1, 1);

  const coniferGeo = mergeParts([
    { geo: new THREE.CylinderGeometry(0.2, 0.32, 2.2, 6), matrix: M4(0, 1.1, 0), color: trunkCol, foliage: 0 },
    { geo: new THREE.ConeGeometry(1.55, 2.7, 7), matrix: M4(0, 2.9, 0), color: white, foliage: 1 },
    { geo: new THREE.ConeGeometry(1.2, 2.3, 7), matrix: M4(0, 4.5, 0), color: white, foliage: 1 },
    { geo: new THREE.ConeGeometry(0.8, 1.9, 7), matrix: M4(0, 6.0, 0), color: white, foliage: 1 },
  ]);

  const decidGeo = mergeParts([
    { geo: new THREE.CylinderGeometry(0.22, 0.36, 2.9, 6), matrix: M4(0, 1.45, 0), color: trunkCol, foliage: 0 },
    { geo: new THREE.IcosahedronGeometry(1.5, 1), matrix: M4(0, 3.8, 0, 1.25), color: white, foliage: 1 },
    { geo: new THREE.IcosahedronGeometry(1.0, 1), matrix: M4(1.0, 3.1, 0.35), color: white, foliage: 1 },
    { geo: new THREE.IcosahedronGeometry(1.05, 1), matrix: M4(-0.9, 3.25, -0.25), color: white, foliage: 1 },
  ]);

  /* A sphere jittered by a positional hash, so every rock is the same mesh
     but reads as irregular; flattened on Y so they sit like boulders rather
     than float like marbles. */
  const rockGeoBase = new THREE.IcosahedronGeometry(1, 1);
  {
    const pa = rockGeoBase.getAttribute("position");
    for (let i = 0; i < pa.count; i++) {
      const j = 0.75 + 0.5 * ((hash2i((pa.getX(i) * 100) | 0, (pa.getZ(i) * 100) | 0, 7) % 1000) / 1000);
      pa.setXYZ(i, pa.getX(i) * j, pa.getY(i) * j * 0.65, pa.getZ(i) * j);
    }
    rockGeoBase.computeVertexNormals();
  }
  const rockGeo = mergeParts([{ geo: rockGeoBase, color: new THREE.Color(0x767068), foliage: 0 }]);
  rockGeoBase.dispose();

  /*
   * One material per species so each can hold its own leaf palette while
   * still sharing the global uniform block by reference.
   *
   * `biomeRock` swaps the baked vertex albedo for a per-instance colour. Rock
   * geometry is shared across every chunk, so it cannot carry a per-chunk
   * attribute; three binds `instanceColor` from the mesh rather than the
   * geometry, which is exactly the hook needed. Rock colour is season
   * independent, so baking it once per instance costs nothing per frame.
   */
  function makeVegMat(biomeRock = false) {
    return new THREE.ShaderMaterial({
      uniforms: Object.assign(
        {
          uLeafA: { value: new THREE.Color(0x4f8f3b) },
          uLeafB: { value: new THREE.Color(0x6aa348) },
          uLeafDensity: { value: 1 },
        },
        U,
      ) as unknown as Record<string, THREE.IUniform>,
      fog: false,
      /* `instanceColor` is deliberately not declared here. three's ShaderMaterial
         prefix already emits it under USE_INSTANCING_COLOR whenever the mesh has
         instance colours, exactly as it does for `instanceMatrix` below, and
         declaring it again fails to compile with a redefinition error. */
      vertexShader: `
      attribute vec3 color; attribute float aFoliage;
      varying vec3 vC, vN, vP, vO; varying float vF, vR;
      uniform float uTime;
      float hsh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        vR = hsh(vec2(instanceMatrix[3].x * 0.371, instanceMatrix[3].z * 0.593));
        wp.x += aFoliage * sin(uTime * 1.2 + wp.x * 0.4 + wp.z * 0.35) * 0.05 * position.y;
        vP = wp.xyz; vO = position; vF = aFoliage;
        vC = ` +
        (biomeRock ? "instanceColor" : "color") +
        `;
        vN = normalize(mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
      fragmentShader:
        GLSL_COMMON +
        `
      uniform vec3 uLeafA, uLeafB;
      uniform float uLeafDensity;
      varying vec3 vC, vN, vP, vO; varying float vF, vR;
      void main(){
        vec3 alb;
        if (vF > 0.5) {
          /* Autumn thinning: discard a stable hash-selected fraction of leaf
             fragments. Keyed on object-space position so the same specks
             vanish every frame instead of shimmering. */
          float h = hash12(floor(vO.xz * 13.0) + vec2(floor(vO.y * 13.0) * 3.1, vR * 37.0));
          if (h > uLeafDensity) discard;
          alb = mix(uLeafA, uLeafB, vR);
          alb *= 0.8 + 0.4 * vnoise(vO.xy * 2.6 + vR * 21.0);
        } else {
          alb = vC;
        }
        float sn = uSnowNear * smoothstep(0.05, 0.6, vN.y) * (vF > 0.5 ? 0.9 : 0.5);
        alb = mix(alb, vec3(0.92, 0.94, 0.97), sn);
        vec3 nn = normalize(vN);
        vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
        col = doFog(col, vP);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    });
  }

  const coniferMat = makeVegMat();
  const decidMat = makeVegMat();
  const rockMat = makeVegMat(true);

  return {
    coniferGeo,
    decidGeo,
    rockGeo,
    coniferMat,
    decidMat,
    rockMat,
    dispose() {
      coniferGeo.dispose();
      decidGeo.dispose();
      rockGeo.dispose();
      coniferMat.dispose();
      decidMat.dispose();
      rockMat.dispose();
    },
  };
}

export type Vegetation = ReturnType<typeof createVegetation>;
