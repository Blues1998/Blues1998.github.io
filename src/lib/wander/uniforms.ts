import * as THREE from "three";
import { BIOMES } from "./biomes";
import type { Uniforms } from "./types";

/*
 * One uniform block, shared by reference across every custom material.
 *
 * This is the spine of the whole renderer: terrain, road, trees, grass and
 * flowers all receive this same object, so writing `U.uSnow.value = 1` turns
 * the entire world white in one assignment. Materials that need extras
 * (leaf colour, say) Object.assign over it, which copies the *references*,
 * not the values, so shared updates still propagate.
 *
 * `shadowMatrix` comes from the sun light and is held, not copied, for the
 * same reason.
 */
export function createUniforms(shadowMatrix: THREE.Matrix4): Uniforms {
  return {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uHemiSky: { value: new THREE.Color(0.5, 0.6, 0.75) },
    uHemiGround: { value: new THREE.Color(0.25, 0.25, 0.2) },
    uFogColor: { value: new THREE.Color(0.78, 0.84, 0.91) },
    uFogDensity: { value: 0.0016 },
    uSnow: { value: 0 },
    uSnowNear: { value: 0 },
    uWet: { value: 0 },
    uTime: { value: 0 },
    uHL: { value: 0 },
    uHLPos: { value: new THREE.Vector3() },
    uHLDir: { value: new THREE.Vector3(0, 0, 1) },
    uGrass: { value: new THREE.Color(0x74b054) },
    uGrassAlt: { value: new THREE.Color(0x5f9a49) },
    uCamPos: { value: new THREE.Vector3() },
    uShadowMap: { value: null },
    uShadowMat: { value: shadowMatrix },
    uShadowOn: { value: 0 },
    uGrassGrow: { value: 1 },
    uBloom: { value: 1 },
    /* Anchors are constant for the life of the scene; the colour arrays are
       rewritten by environment.ts as the season phase moves. Allocated once
       here so no frame ever builds a new array for the GPU to re-upload. */
    uBClim: { value: BIOMES.map((b) => new THREE.Vector3(b.temp, b.moist, b.spread)) },
    uBGrass: { value: BIOMES.map(() => new THREE.Color()) },
    uBGrassAlt: { value: BIOMES.map(() => new THREE.Color()) },
    uBRock: { value: BIOMES.map((b) => b.rock.clone()) },
    uBDirt: { value: BIOMES.map((b) => b.dirt.clone()) },
    uBSnow: { value: BIOMES.map((b) => new THREE.Vector2(b.snowMul, b.snowLine)) },
  };
}
