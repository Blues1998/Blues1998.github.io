import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { QUAL, SHADOW_EXT, SHADOW_MAP_SIZE } from "./config";
import type { WanderState } from "./types";

/*
 * Renderer, scene, camera, post chain and the two built-in lights.
 *
 * The built-in lights exist only for the objects that use stock three
 * materials (the car, the reflector posts). Everything procedural is lit by
 * the shared uniform block instead, which is why the sun appears twice: once
 * as a DirectionalLight and once as `U.uSunDir`. `environment.ts` keeps the
 * two in step.
 */
export function createRenderer(container: HTMLElement, state: WanderState) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc8d6e8, 0.0016);
  const camera = new THREE.PerspectiveCamera(63, window.innerWidth / window.innerHeight, 0.06, 7000);
  camera.position.set(0, 8, -20);

  const sunLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(sunLight);
  scene.add(sunLight.target);
  const hemiLight = new THREE.HemisphereLight(0xbfd6f0, 0x4e5a45, 0.9);
  scene.add(hemiLight);

  /* sun shadows: one tight cascade that follows the car */
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  Object.assign(sunLight.shadow.camera, {
    left: -SHADOW_EXT,
    right: SHADOW_EXT,
    top: SHADOW_EXT,
    bottom: -SHADOW_EXT,
    near: 150,
    far: 380,
  });
  sunLight.shadow.camera.updateProjectionMatrix();

  /* post-processing chain: scene -> bloom -> tone map/sRGB output */
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = 4;
  composer.renderTarget2.samples = 4;
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.5, 0.88);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  /* Resolution scale, driven down by the adaptive-quality loop when frames
     get long. Separate from the quality tier: the tier changes what is drawn,
     this changes how many pixels it is drawn into. */
  let renderScale = 1;

  function applySize() {
    const pr = Math.min(window.devicePixelRatio || 1, QUAL[state.quality].prCap) * renderScale;
    renderer.setPixelRatio(pr);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(pr);
    composer.setSize(window.innerWidth, window.innerHeight);
  }

  return {
    canvas,
    renderer,
    scene,
    camera,
    composer,
    bloomPass,
    sunLight,
    hemiLight,
    applySize,
    getRenderScale: () => renderScale,
    setRenderScale: (v: number) => {
      renderScale = v;
      applySize();
    },
    dispose() {
      composer.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}

export type RendererBundle = ReturnType<typeof createRenderer>;
