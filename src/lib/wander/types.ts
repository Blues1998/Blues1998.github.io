import type * as THREE from "three";
import type { Noise2D } from "./math";

/* User-facing simulation settings plus the clock. Mutated by the UI and read
   by everything; deliberately one flat object so a module never has to own a
   setting another module also needs. */
export interface WanderState {
  started: boolean;
  tod: number; // time of day, 0..1
  phase: number; // season phase, 0..4 (centres at .5/1.5/2.5/3.5)
  timeScale: number;
  seasonMode: "auto" | "manual";
  seasonTarget: number;
  weatherMode: string;
  camMode: number; // 0: chase, 1: hood, 2: cockpit, 3: cinematic
  wiperMode?: number; // 0: auto, 1: slow, 2: fast, 3: off
  quality: number;
  muted: boolean;
  vol: number;
  auto: boolean; // autopilot
  simT: number; // scaled simulation time, drives all shader animation
}

export interface CarState {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  pitch: number;
  roll: number;
  off: number; // 0 on tarmac, 1 fully off the shoulder
  lastRoadIdx: number;
  s: number; // arc length along the road
  yv: number;
  pitchV: number;
  rollV: number;
  velDir: number; // direction of travel, lags heading when grip is low
  yawRate: number; // angular yaw velocity (rad/s)
  slipAngle: number; // chassis sideslip angle relative to travel direction (degrees)
  slipVel: number; // lateral sliding velocity (m/s) for tire screech audio and smoke VFX
  isDrifting: boolean; // whether car is currently in controlled oversteer
  handbrake: boolean; // whether handbrake / E-brake is engaged
}

/* Derived each frame from the sun position; read by audio, weather and the
   vegetation palette. */
export interface EnvState {
  daylight: number;
  night: number;
  snow: number;
  sunElev: number;
}

export interface WeatherState {
  cloud: number;
  rain: number;
  fog: number;
  tCloud: number; // targets, approached over tens of seconds
  tRain: number;
  tFog: number;
  next: number; // simT at which to roll again
  snowMode: boolean;
}

export interface RoadPt {
  x: number;
  y: number;
  z: number;
  dx: number;
  dz: number;
  k: number; // |curvature|, used by the autopilot to pick a corner speed
}

/* What queryRoad returns: the closest point on the centreline, or null when
   nothing is within the search radius. */
export interface RoadQuery {
  d: number;
  x: number;
  y: number;
  z: number;
  tx: number;
  tz: number;
  idx: number;
  s: number;
  /* The nearest point on a different branch of the route, when the road runs
     back within blend distance of itself. Only the ground shaping reads it -
     see the note on `query` in road.ts. Null on the alt itself. */
  alt: RoadQuery | null;
}

export type SampleGround = (x: number, z: number, rq?: RoadQuery | null) => number;

/* The independent noise fields. Split by concern so that changing how
   vegetation scatters can never alter the shape of the road. `temp` and
   `moist` are the climate pair that biome identity is resolved from. */
export interface NoiseFields {
  road: Noise2D;
  terrain: Noise2D;
  veg: Noise2D;
  temp: Noise2D;
  moist: Noise2D;
}

/* The shared uniform block. Every custom material holds references to these
   exact objects, so mutating `.value` here updates the whole scene at once. */
export interface Uniforms {
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uHemiSky: { value: THREE.Color };
  uHemiGround: { value: THREE.Color };
  uFogColor: { value: THREE.Color };
  uFogDensity: { value: number };
  /* Seasonal snow, biome-agnostic. The terrain shader multiplies this by the
     per-vertex biome's own snow factor, so one draw can be white on the
     alpine ridge and bare on the mesa behind it. */
  uSnow: { value: number };
  /* The same value already resolved against the biome at the *car*, for
     near-field things (verge grass, flowers, trees) that have no baked
     climate of their own. Without this, winter puts snow on grass growing in
     red sand. */
  uSnowNear: { value: number };
  uWet: { value: number };
  uTime: { value: number };
  uHL: { value: number };
  uHLPos: { value: THREE.Vector3 };
  uHLDir: { value: THREE.Vector3 };
  uGrass: { value: THREE.Color };
  uGrassAlt: { value: THREE.Color };
  uCamPos: { value: THREE.Vector3 };
  uShadowMap: { value: THREE.Texture | null };
  uShadowMat: { value: THREE.Matrix4 };
  uShadowOn: { value: number };
  uGrassGrow: { value: number };
  uBloom: { value: number };
  /* Per-biome palette arrays, indexed by biome. The terrain shader resolves
     these against the climate baked into each vertex, which is what lets the
     mesa on the horizon stay red while the ground underfoot is basalt.
     `uGrass`/`uGrassAlt` above remain the car-local blend, used by the verge
     grass and flowers, which are only ever near-field. */
  uBClim: { value: THREE.Vector3[] };
  uBGrass: { value: THREE.Color[] };
  uBGrassAlt: { value: THREE.Color[] };
  uBRock: { value: THREE.Color[] };
  uBDirt: { value: THREE.Color[] };
  uBSnow: { value: THREE.Vector2[] };
}

/* Anything with GPU resources returns one of these from its factory. */
export interface Disposable {
  dispose(): void;
}
