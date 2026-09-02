import * as THREE from "three";
import { BIOMES, NB, type BlendedBiome, type Climate } from "./biomes";
import { DAY_LEN, QUAL, SEASON_LEN, SHADOW_DIST, SHADOW_EXT } from "./config";
import { clamp, smoothstep, TAU } from "./math";
import { FLOWER_SEASON, PAL, seasonMix } from "./seasons";
import type { Car } from "./car";
import type { Grass } from "./grass";
import type { RendererBundle } from "./renderer";
import type { Sky } from "./sky";
import type { Vegetation } from "./vegetation";
import type { EnvState, Uniforms, WanderState, WeatherState } from "./types";

/*
 * The clock, and everything downstream of it.
 *
 * This is the one module that writes to almost every uniform in the scene,
 * because time of day, season and weather all resolve into the same small set
 * of lighting values. Order matters: sun direction feeds sky colour, sky
 * colour feeds fog and hemisphere light, and season feeds the vegetation
 * palette and the snow coverage that half the shaders sample.
 */
export function createEnvironment(
  state: WanderState,
  env: EnvState,
  wx: WeatherState,
  U: Uniforms,
  sky: Sky,
  rb: RendererBundle,
  car: Car,
  veg: Vegetation,
  grass: Grass,
  postGlow: { value: number },
  climate: Climate,
) {
  /* car-position probe: drives everything global (fog, weather odds, the
     near-field grass palette, the HUD label) */
  const bio = climate.probe();
  let local: BlendedBiome = bio.at(0, 0);

  const C = (h: number) => new THREE.Color(h);
  const _colA = new THREE.Color(),
    _colB = new THREE.Color(),
    _colC = new THREE.Color();
  const DAY_ZEN = C(0x3568b5),
    DAY_HOR = C(0xbdd2e7);
  const NIGHT_ZEN = C(0x050810),
    NIGHT_HOR = C(0x0d1322);
  const DUSK = C(0xff8f4a);
  const CLOUD_DAY = C(0xffffff),
    CLOUD_GRAY = C(0x8d97a3),
    CLOUD_NIGHT = C(0x161a24);
  const SUN_WARM = C(0xffd9a8),
    SUN_WHITE = C(0xfff6e8);

  const { sunLight, hemiLight, scene } = rb;

  /* Sun/shadow rig: the shadow box follows the car, snapped to the shadow-map
     texel grid (in light space) so shadow edges don't shimmer while driving.
     Without the snap, sub-texel motion of the light frustum makes every hard
     edge in the scene crawl. */
  const UP_V = new THREE.Vector3(0, 1, 0);
  const _sv1 = new THREE.Vector3(),
    _sv2 = new THREE.Vector3(),
    _sv3 = new THREE.Vector3(),
    _sv4 = new THREE.Vector3();
  function placeSunShadow() {
    const dir = U.uSunDir.value;
    _sv1.set(car.car.x, car.car.y, car.car.z);
    _sv2.crossVectors(UP_V, dir);
    if (_sv2.lengthSq() < 1e-4) _sv2.set(1, 0, 0);
    else _sv2.normalize();
    _sv3.crossVectors(dir, _sv2).normalize();
    _sv4.set(
      car.car.x + dir.x * SHADOW_DIST,
      car.car.y + Math.max(dir.y, 0.06) * SHADOW_DIST,
      car.car.z + dir.z * SHADOW_DIST,
    );
    const texel = (SHADOW_EXT * 2) / sunLight.shadow.mapSize.x;
    const rawX = _sv4.dot(_sv2),
      rawY = _sv4.dot(_sv3);
    const dx = Math.round(rawX / texel) * texel - rawX;
    const dy = Math.round(rawY / texel) * texel - rawY;
    _sv4.addScaledVector(_sv2, dx).addScaledVector(_sv3, dy);
    sunLight.position.copy(_sv4);
    sunLight.target.position.copy(_sv1).addScaledVector(_sv2, dx).addScaledVector(_sv3, dy);
  }

  const _bTmp = new THREE.Color();

  function update(dt: number) {
    /* Resolve the biome under the car once per frame. `sample` is kept
       separate from `blend` here because the raw weights are needed twice:
       for the scalar knobs, and to mix the near-field grass palette. */
    const w = bio.sample(car.car.x, car.car.z);
    local = bio.blend(w);

    state.simT += dt * state.timeScale;
    state.tod = (state.tod + (dt * state.timeScale) / DAY_LEN) % 1;
    if (state.seasonMode === "auto") {
      state.phase = (state.phase + (dt * state.timeScale) / SEASON_LEN) % 4;
    } else {
      /* manual: walk the phase the short way round to the requested season,
         at a fixed rate, so picking "winter" is a transition and not a cut */
      const target = state.seasonTarget + 0.5;
      const d = ((target - state.phase + 6) % 4) - 2;
      state.phase = (state.phase + clamp(d, -dt * 0.6, dt * 0.6) + 4) % 4;
    }
    U.uTime.value = state.simT;

    /* sun path */
    const th = (state.tod - 0.25) * TAU;
    U.uSunDir.value.set(Math.cos(th), Math.sin(th), 0.42).normalize();
    const sunY = U.uSunDir.value.y;
    env.sunElev = sunY;
    env.daylight = smoothstep(-0.09, 0.24, sunY);
    env.night = 1 - smoothstep(-0.16, -0.015, sunY);
    /* narrow band around the horizon that drives every warm colour shift */
    const duskGlow = Math.exp(-Math.abs(sunY) * 9) * smoothstep(-0.25, 0.02, sunY);
    sky.uniforms.uMoonDir.value.set(-U.uSunDir.value.x, Math.max(0.25, -sunY + 0.3), -0.3).normalize();
    sky.uniforms.uNight.value = env.night;

    const clearF = 1 - wx.cloud * 0.6 - wx.fog * 0.35;

    /* sky colors */
    _colA.lerpColors(NIGHT_ZEN, DAY_ZEN, env.daylight);
    _colB.lerpColors(NIGHT_HOR, DAY_HOR, env.daylight);
    _colB.lerp(DUSK, duskGlow * 0.75 * clearF);
    const grayT = clamp(wx.cloud * 0.45 + wx.fog * 0.55, 0, 0.85);
    _colC.copy(_colA);
    _colC.lerp(_colB, 0.55); // gray reference
    _colA.lerp(_colC, grayT * 0.6);
    sky.uniforms.uZenith.value.copy(_colA);
    sky.uniforms.uHorizon.value.copy(_colB);
    sky.uniforms.uCloud.value = 0.22 + wx.cloud * 0.62;
    _colC.lerpColors(CLOUD_NIGHT, CLOUD_DAY, env.daylight);
    _colC.lerp(CLOUD_GRAY, wx.cloud * 0.7 * env.daylight);
    _colC.lerp(DUSK, duskGlow * 0.4);
    sky.uniforms.uCloudCol.value.copy(_colC);

    /* Fog takes the horizon colour, not a fixed grey, which is what makes
       the far terrain dissolve into the sky instead of into a haze band. */
    U.uFogColor.value.copy(_colB).lerp(sky.uniforms.uZenith.value, 0.25);
    /* Only the base density is biome-scaled. The weather terms are weather,
       and a desert downpour should still close the view down. */
    const fogD = QUAL[state.quality].fog * local.fogMul + wx.fog * 0.0042 + wx.rain * 0.001;
    U.uFogDensity.value = fogD;
    (scene.fog as THREE.FogExp2).color.copy(U.uFogColor.value);
    (scene.fog as THREE.FogExp2).density = fogD;

    /* Lights: sun by day, moon by night. The moon reuses the sun's direction
       slot (lerped past it after dusk) so there is only ever one key light
       and one shadow pass. */
    const sunI = env.daylight * clearF;
    const moonI = env.night * (1 - wx.cloud * 0.65) * 0.3;
    _colA.lerpColors(SUN_WARM, SUN_WHITE, smoothstep(0.02, 0.35, sunY));
    _colA.lerp(DUSK, duskGlow * 0.6);
    U.uSunColor.value.copy(_colA).multiplyScalar(1.45 * sunI);
    _colC.setRGB(0.62, 0.72, 0.95).multiplyScalar(moonI);
    U.uSunColor.value.add(_colC);
    if (env.night > 0.001) U.uSunDir.value.lerp(sky.uniforms.uMoonDir.value, env.night).normalize();
    U.uHemiSky.value
      .copy(sky.uniforms.uZenith.value)
      .multiplyScalar(0.55 + 0.45 * env.daylight)
      .addScalar(0.012);
    U.uHemiSky.value.add(_colC.setRGB(0.045, 0.06, 0.1).multiplyScalar(env.night));
    U.uHemiGround.value.setRGB(0.16, 0.15, 0.12).multiplyScalar(env.daylight * clearF + 0.06);
    U.uHemiGround.value.add(_colC.setRGB(0.012, 0.016, 0.028).multiplyScalar(env.night));
    sunLight.color.copy(_colA);
    if (env.night > 0.001) sunLight.color.lerp(_colC.setRGB(0.62, 0.72, 0.95), env.night * 0.85);
    sunLight.intensity = 3.1 * sunI + moonI * 1.5;
    placeSunShadow();
    /* fade shadows out at dusk rather than switching them off, or the whole
       world flicks flat in one frame */
    const dayF = smoothstep(0.04, 0.25, env.daylight + moonI * 1.2);
    U.uShadowOn.value += (dayF - U.uShadowOn.value) * Math.min(1, dt * 2.5);
    sunLight.castShadow = U.uShadowOn.value > 0.02;
    if (sunLight.shadow.map) U.uShadowMap.value = sunLight.shadow.map.texture;
    hemiLight.color.copy(U.uHemiSky.value).multiplyScalar(1.6);
    hemiLight.groundColor.copy(U.uHemiGround.value).multiplyScalar(1.6);
    hemiLight.intensity = 1.0;

    /* Seasons -> per-biome palette arrays. Every biome's ground colour is
       resolved for the current season, and the terrain shader then picks
       among them per fragment using the climate baked into each vertex. Ten
       colour lerps a frame, which is nothing, and it means season and biome
       compose without a combinatorial table. */
    for (let i = 0; i < NB; i++) {
      seasonMix(BIOMES[i].grass, state.phase, U.uBGrass.value[i]);
      seasonMix(BIOMES[i].grassAlt, state.phase, U.uBGrassAlt.value[i]);
    }
    /* The near-field pair: the same arrays collapsed to the car's own climate,
       for verge grass and flowers, which carry no baked climate of their own. */
    U.uGrass.value.setRGB(0, 0, 0);
    U.uGrassAlt.value.setRGB(0, 0, 0);
    for (let i = 0; i < NB; i++) {
      const f = w[i];
      if (f < 1e-4) continue;
      U.uGrass.value.add(_bTmp.copy(U.uBGrass.value[i]).multiplyScalar(f));
      U.uGrassAlt.value.add(_bTmp.copy(U.uBGrassAlt.value[i]).multiplyScalar(f));
    }

    seasonMix(PAL.leafA, state.phase, veg.decidMat.uniforms.uLeafA.value);
    seasonMix(PAL.leafB, state.phase, veg.decidMat.uniforms.uLeafB.value);
    seasonMix(PAL.conifA, state.phase, veg.coniferMat.uniforms.uLeafA.value);
    seasonMix(PAL.conifB, state.phase, veg.coniferMat.uniforms.uLeafB.value);
    veg.decidMat.uniforms.uLeafDensity.value = seasonMix(PAL.leafDen, state.phase);
    /* Seasonal snowfall is global; whether it *lies* is a property of the
       biome. `uSnow` stays unscaled because the terrain shader applies each
       vertex's own factor, while `env.snow` (grip, snow-vs-rain) and
       `uSnowNear` (grass, flowers, trees) use the car's biome, so it rains on
       the salt flats in the same storm that buries the alpine. */
    const seasonSnow = seasonMix(PAL.snow, state.phase);
    U.uSnow.value = seasonSnow;
    env.snow = seasonSnow * local.snowMul;
    U.uSnowNear.value = env.snow;
    U.uGrassGrow.value = 1 - env.snow * 0.78;
    U.uBloom.value = seasonMix(FLOWER_SEASON, state.phase);
    grass.flowerMesh.visible = U.uBloom.value > 0.03;

    /* Headlights come on for darkness *or* bad visibility, and fade rather
       than switch, which also drives the reflector posts and the tail bar. */
    const hlOn = sunY < 0.03 || wx.fog > 0.55 || wx.rain > 0.6;
    const hl = hlOn ? 1 : 0;
    U.uHL.value += (hl - U.uHL.value) * Math.min(1, dt * 3);
    for (const sp of car.hlSpots) sp.intensity = U.uHL.value * 40;
    for (const g of car.glowSprites) (g.material as THREE.SpriteMaterial).opacity = U.uHL.value * 0.85;
    car.headMat.emissiveIntensity = 0.25 + U.uHL.value * 2.4;
    car.tailMat.emissiveIntensity = 0.35 + U.uHL.value * 2.6;
    postGlow.value = U.uHL.value * 0.85 + env.night * 0.15;
  }

  return {
    update,
    /* the car's current biome, for weather rolls and the HUD */
    getLocal: () => local,
  };
}

export type Environment = ReturnType<typeof createEnvironment>;
