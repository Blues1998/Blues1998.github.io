import { createAudio } from "./audio";
import { BIOMES, createClimate } from "./biomes";
import { createCameraRig } from "./cameraRig";
import { createCar } from "./car";
import { createChunks } from "./chunks";
import { createEnvironment } from "./environment";
import { createGrass } from "./grass";
import { createHeightField } from "./heightField";
import { createInput, type Input } from "./input";
import { makeSimplex } from "./math";
import { createPrecipitation } from "./precip";
import { createRenderer } from "./renderer";
import { createRoad } from "./road";
import { createRoadMesh } from "./roadMesh";
import { createSky } from "./sky";
import { createTerrain } from "./terrain";
import { createUI } from "./ui";
import { createUniforms } from "./uniforms";
import { createVegetation } from "./vegetation";
import { createWeather } from "./weather";
import type { EnvState, NoiseFields, WanderState } from "./types";

/*
 * Wander: a procedural, endless scenic drive.
 *
 * This is the orchestrator. Every subsystem is a factory that takes what it
 * needs and returns `{ update, dispose }`; the only thing that lives here is
 * the order they are built in and the order they are stepped in. Both matter:
 *
 *   - Build order is a dependency chain. The road exists before the terrain
 *     that bends to meet it, which exists before anything that stands on it.
 *   - Step order is a frame. The car moves first, so everything downstream
 *     (which chunks to stream, where the shadow box goes, where the camera
 *     wants to be) is reacting to this frame's position rather than last
 *     frame's.
 *
 * `mountWander` owns the window listeners, the timers and the render loop,
 * and returns a teardown that releases all of them.
 */
export function mountWander(container: HTMLElement): () => void {
  let disposed = false;
  const timers: number[] = [];
  const setT = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (!disposed) fn();
    }, ms);
    timers.push(id);
  };

  /* ---- seed ---- */
  const urlParams = new URLSearchParams(window.location.search);
  const SEED = (urlParams.get("seed") ? +urlParams.get("seed")! : Math.random() * 1e9) | 0;
  /* Independent fields off one seed. Salting them apart means a change to
     vegetation scatter can never move the road. */
  const noise: NoiseFields = {
    road: makeSimplex(SEED ^ 0x9e3779b9),
    terrain: makeSimplex(SEED ^ 0xc2b2ae35),
    veg: makeSimplex((SEED + 1013904223) | 0),
    temp: makeSimplex(SEED ^ 0x27d4eb2f),
    moist: makeSimplex(SEED ^ 0x165667b1),
  };

  const state: WanderState = {
    started: false,
    tod: 0.36,
    phase: 0.85,
    timeScale: 1,
    seasonMode: "auto",
    seasonTarget: 0,
    weatherMode: "auto",
    camMode: 2,
    quality: 1,
    muted: false,
    vol: 0.8,
    auto: true,
    simT: 0,
  };
  const env: EnvState = { daylight: 1, night: 0, snow: 0, sunElev: 1 };

  /* ---- build, in dependency order ---- */
  const rb = createRenderer(container, state);
  const U = createUniforms(rb.sunLight.shadow.matrix);
  const sky = createSky(U, rb.scene);
  /* Climate, then the bare landscape, then the road, then the terrain that
     joins them. The road samples the height field to choose its own
     elevation, and the terrain blends the two, so this order is the whole
     reason the road sits on the land instead of cutting a trench through it. */
  const climate = createClimate(noise.temp, noise.moist, SEED);
  const heightField = createHeightField(noise, climate);
  const road = createRoad(noise, heightField);
  const terrain = createTerrain(road, heightField, U);
  const veg = createVegetation(U);
  const chunks = createChunks(noise, road, terrain, climate, veg, state, rb.scene, SEED);
  const grass = createGrass(road, terrain, climate, U, state, rb.scene, SEED);
  /* the road mesh drives grass refills: new tarmac means a new verge */
  const roadMesh = createRoadMesh(road, U, state, rb.scene, (carS) => grass.queueRefill(carS));
  const carObj = createCar(road, terrain, U, state, rb.scene);
  (window as any).__carObj = carObj;
  const camRig = createCameraRig(rb.camera, carObj.car, carObj.tilt, terrain, state, sky.mesh);
  const weather = createWeather(state, env, U, climate, carObj.car);
  const environment = createEnvironment(state, env, weather.wx, U, sky, rb, carObj, veg, grass, roadMesh.postGlow, climate);
  const precip = createPrecipitation(state, weather.wx, rb.camera, rb.scene);

  /* input and audio are mutually referential: audio samples the throttle,
     input routes the mute key. Declared first, assigned below. */
  let input!: Input;
  const audio = createAudio(
    state,
    carObj.car,
    weather.wx,
    env,
    () => input.throttle(),
    () => carObj.windshield.popWiperAudioCue()
  );

  const ui = createUI(container, state, carObj.car, env, weather.wx, SEED, () => BIOMES[environment.getLocal().dominant].name, {
    onStart() {
      audio.init();
      audio.resume();
    },
    onQualityChange() {
      rb.applySize();
      grass.queueRefill(carObj.car.s);
    },
    onVolumeChange() {
      audio.setVolume();
    },
  });

  input = createInput({
    toggleAuto: () => ui.setAuto(!state.auto),
    cycleCamera: () => ui.setCam((state.camMode + 1) % 4),
    toggleMute: () => audio.toggleMute(),
    resetCar: () => carObj.reset(),
    togglePanel: () => ui.togglePanel(),
    setSeason: (s) => ui.setSeason(s),
    disableAuto: () => ui.setAuto(false),
    isAuto: () => state.auto,
    toggleWipers: () => {
      ui.setWiper(((state.wiperMode ?? 0) + 1) % 4);
    },
  });

  const onResize = () => rb.applySize();
  window.addEventListener("resize", onResize);

  /* ---- warm up ---- */
  road.extendTo(3000);
  const spawnPt = carObj.spawn();
  camRig.placeAtSpawn(spawnPt.x, spawnPt.y, spawnPt.z, spawnPt.dx, spawnPt.dz);
  /* a generous synchronous budget, once: the first frame must not show a
     half-built world, and nothing is animating yet to hitch */
  chunks.update(carObj.car.x, carObj.car.z, 400);
  roadMesh.ensure(carObj.car.s);

  ui.wireStart(setT);

  /* ---- adaptive resolution ---- */
  let fpsAcc = 0,
    fpsN = 0,
    fpsNext = 4;
  function adaptQuality(dt: number, t: number) {
    fpsAcc += dt;
    fpsN++;
    if (t < fpsNext) return;
    const avg = fpsN / Math.max(fpsAcc, 1e-4);
    fpsAcc = 0;
    fpsN = 0;
    fpsNext = t + 3;
    /* asymmetric thresholds with a dead band between them, so a frame rate
       sitting near the limit doesn't oscillate the resolution */
    const scale = rb.getRenderScale();
    if (avg < 42 && scale > 0.55) rb.setRenderScale(Math.max(0.55, scale * 0.88));
    else if (avg > 57 && scale < 1) rb.setRenderScale(Math.min(1, scale * 1.08));
  }

  /* ---- main loop ---- */
  rb.applySize();
  let last = performance.now();
  let wallT = 0;
  rb.renderer.setAnimationLoop((now: number) => {
    /* clamped dt: a backgrounded tab returns one enormous frame, and every
       spring in the simulation would explode on it */
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    wallT += dt;

    carObj.update(dt, env, weather.wx, wallT, input.throttle(), input.steer(), input.braking(), input.handbrake());
    roadMesh.ensure(carObj.car.s);
    chunks.update(carObj.car.x, carObj.car.z, 5);
    grass.processJobs(2.5);
    environment.update(dt);
    weather.update(dt);
    precip.update(dt);
    camRig.update(dt, wallT, U);
    audio.update();
    ui.updateHUD(wallT);
    adaptQuality(dt, wallT);

    rb.composer.render();
  });

  /* ---- teardown ---- */
  return () => {
    disposed = true;
    rb.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", onResize);
    input.dispose();
    for (const id of timers) window.clearTimeout(id);
    audio.dispose();

    roadMesh.dispose();
    chunks.dispose();
    veg.dispose();
    terrain.dispose();
    grass.dispose();
    precip.dispose();
    sky.dispose();
    carObj.dispose();
    rb.dispose();
  };
}
