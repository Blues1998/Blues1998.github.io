import * as THREE from "three";
import { CLIMATE_MOIST_FREQ, CLIMATE_TEMP_FREQ } from "./config";
import { clamp, hash2i, type Noise2D } from "./math";

/*
 * Biomes, resolved from climate rather than placed.
 *
 * Two very low frequency noise fields give every point in the world a
 * temperature and a moisture. Each biome is an anchor in that 2D climate
 * space with a falloff, and a point's biome is however much of each anchor it
 * is near. Nothing is ever "in" a biome discretely: `weightsAt` returns five
 * normalised weights and everything downstream blends by them.
 *
 * Three things fall out of doing it this way rather than painting regions:
 *
 *   - Transitions need no code. You leave the woodland because the ground got
 *     drier, not because you crossed a line someone drew.
 *   - Distant terrain is shaded by *its own* climate, because the weights are
 *     baked per terrain vertex. The mesa on the horizon stays red while you
 *     are still in basalt.
 *   - Implausible neighbours become impossible. Salt flats never border
 *     alpine, because no point is both freezing and the driest place around.
 *
 * The same weight function is duplicated in GLSL (see `BIOME_GLSL`) so the
 * shader agrees with the CPU exactly. If you change the falloff here, change
 * it there.
 */

const C = (h: number) => new THREE.Color(h);

export interface Biome {
  name: string;
  /* anchor in climate space, both 0..1, plus the falloff radius that decides
     how much of the world this biome claims */
  temp: number;
  moist: number;
  spread: number;

  /* terrain shape, all multipliers on the base terrain functions */
  amp: number;
  ridge: number;
  detail: number;
  /* terracing, for flat-topped mesas. 0 is smooth ground. */
  terrace: number;

  /* ground palette, keyed at season centres like everything else in PAL */
  grass: THREE.Color[];
  grassAlt: THREE.Color[];
  rock: THREE.Color;
  dirt: THREE.Color;

  /* scenery */
  treeDensity: number;
  coniferBias: number; // 0 all deciduous, 1 all conifer
  treeScale: number;
  rockDensity: number;
  rockScale: number;

  /* verge cover */
  grassCover: number;
  flowerCover: number;

  /* atmosphere */
  fogMul: number;
  snowMul: number; // 0 means this biome never holds snow
  snowLine: number; // altitude at which permanent snow starts
  weather: number[]; // clear, cloudy, precip, fog
}

/*
 * "Road movie" roster: one green biome to leave, and four increasingly
 * hostile ones to arrive in. Four of the five are near-vegetationless, which
 * is also why this set is the cheapest to draw.
 */
export const BIOMES: Biome[] = [
  {
    name: "Woodland",
    temp: 0.55,
    moist: 0.78,
    spread: 0.24,
    amp: 1,
    ridge: 1,
    detail: 1,
    terrace: 0,
    grass: [C(0x74b054), C(0x7fa844), C(0xa38b47), C(0x8b9078)],
    grassAlt: [C(0x5f9a49), C(0x6c9439), C(0x8f7439), C(0x7b8069)],
    rock: C(0x665d54),
    dirt: C(0x6b5c47),
    treeDensity: 1,
    coniferBias: 0.5,
    treeScale: 1,
    rockDensity: 1,
    rockScale: 1,
    grassCover: 1,
    flowerCover: 1,
    fogMul: 1,
    snowMul: 1,
    snowLine: 115,
    weather: [0.4, 0.26, 0.22, 0.12],
  },
  {
    name: "Alpine",
    temp: 0.11,
    moist: 0.58,
    spread: 0.232,
    /* the only biome that builds real mountains: ridge is what turns the
       terrain's 1-|noise| term into aretes rather than lumps */
    amp: 1.85,
    ridge: 2.5,
    detail: 1.25,
    terrace: 0,
    grass: [C(0x6f9e58), C(0x74a352), C(0x8d8b5a), C(0x8a9090)],
    grassAlt: [C(0x5b8a4c), C(0x628f45), C(0x7a7749), C(0x77807e)],
    rock: C(0x7b7d80),
    dirt: C(0x6e6a63),
    treeDensity: 0.55,
    coniferBias: 1,
    treeScale: 0.85,
    rockDensity: 2.6,
    rockScale: 1.4,
    grassCover: 0.5,
    flowerCover: 0.55,
    fogMul: 1.3,
    snowMul: 1,
    /* Snow line is an absolute altitude, so it has to be read against this
       biome's own amp: at 1.85 the alpine reaches ~280 m where woodland tops
       out near 150, and 190 leaves roughly the top third under permanent
       snow. It was 62 while terrain was still flattened near the road; once
       the road stopped carving a corridor, real ground heights arrived and
       62 buried the entire biome, road included. */
    snowLine: 190,
    weather: [0.3, 0.25, 0.28, 0.17],
  },
  {
    name: "High Desert",
    temp: 0.79,
    moist: 0.21,
    spread: 0.192,
    amp: 1.15,
    ridge: 1.45,
    detail: 0.55,
    terrace: 0.75, // mesas
    grass: [C(0xab9450), C(0xa88a44), C(0x9c7d3f), C(0x93803f)],
    grassAlt: [C(0x8f7a42), C(0x927c3c), C(0x866a35), C(0x7d6c38)],
    rock: C(0x9c5a38),
    dirt: C(0xb07a4e),
    treeDensity: 0.06,
    coniferBias: 0.25,
    treeScale: 0.6,
    rockDensity: 1.8,
    rockScale: 1.2,
    grassCover: 0.18,
    flowerCover: 0.05,
    /* The long view is the point of a desert, but fog is also what hides the
       edge of the loaded world. Chunk radius is ~790 m, and much below 0.7
       here the terrain visibly stops instead of fading. Clearing the haze
       further needs a bigger draw distance first, not a smaller number. */
    fogMul: 0.72,
    snowMul: 0.05,
    snowLine: 260,
    weather: [0.82, 0.14, 0.02, 0.02],
  },
  {
    name: "Badlands",
    temp: 0.63,
    moist: 0.37,
    spread: 0.2,
    amp: 1.5,
    ridge: 2,
    detail: 1.7, // the high-frequency term is what reads as erosion
    terrace: 0.25,
    grass: [C(0x5e5b50), C(0x615e51), C(0x5a564a), C(0x565750)],
    grassAlt: [C(0x4d4a41), C(0x504d42), C(0x48453c), C(0x464740)],
    rock: C(0x33312f),
    dirt: C(0x4a4642),
    treeDensity: 0.02,
    coniferBias: 0.6,
    treeScale: 0.5,
    rockDensity: 3.2,
    rockScale: 1.3,
    grassCover: 0.08,
    flowerCover: 0,
    fogMul: 1.15, // sulphur haze
    snowMul: 0.35,
    snowLine: 190,
    weather: [0.45, 0.34, 0.09, 0.12],
  },
  {
    name: "Salt Flats",
    temp: 0.88,
    moist: 0.01,
    spread: 0.152,
    /* almost nothing: amp near zero is what makes the horizon go dead level */
    amp: 0.1,
    ridge: 0.04,
    detail: 0.12,
    terrace: 0,
    grass: [C(0xd9d7cd), C(0xdcdad0), C(0xd5d3c9), C(0xd2d2cc)],
    grassAlt: [C(0xc4c2b8), C(0xc7c5bb), C(0xc0beb4), C(0xbdbdb7)],
    rock: C(0xb8b4a8),
    dirt: C(0xcfccc0),
    treeDensity: 0,
    coniferBias: 0.5,
    treeScale: 0.5,
    rockDensity: 0.15,
    rockScale: 0.8,
    grassCover: 0.02,
    flowerCover: 0,
    fogMul: 0.8, // same draw-distance floor as the desert
    snowMul: 0,
    snowLine: 400,
    weather: [0.9, 0.08, 0, 0.02],
  },
];

export const NB = BIOMES.length;

/* Blended biome parameters, filled in place. This is evaluated for every
   terrain vertex and every scatter candidate, so it must never allocate,
   which means the returned object is reused between calls.
   That is only safe because each consumer takes its own `probe()` - see the
   note there. */
export interface BlendedBiome {
  amp: number;
  ridge: number;
  detail: number;
  terrace: number;
  treeDensity: number;
  coniferBias: number;
  treeScale: number;
  rockDensity: number;
  rockScale: number;
  grassCover: number;
  flowerCover: number;
  fogMul: number;
  snowMul: number;
  weather: number[];
  dominant: number;
}

export function createClimate(tempNoise: Noise2D, moistNoise: Noise2D, seed: number) {
  /*
   * Per-world origin offset. This is not decoration.
   *
   * Simplex noise is exactly zero at its lattice origin, and the road always
   * starts at world (0, 0). Sampling the climate there returns 0 whatever the
   * seed, which maps to a temperature of exactly 0.5 in every world ever
   * generated: alpine, desert and salt flats could never be a starting biome,
   * and "new world" would drop you in the same climate every time.
   *
   * Offsetting the sample point per seed, by hundreds of kilometres so it
   * lands many features away, is what makes a new seed a genuinely new world
   * rather than a reshuffled version of the same one.
   */
  const ox = (hash2i(seed, 0x5b1f, 0x2c9d) % 2000000) - 1000000;
  const oz = (hash2i(seed, 0x77e3, 0x41ab) % 2000000) - 1000000;

  /* A single octave, deliberately. A second octave at twice the frequency
     adds wiggle that drags the climate path back and forth across anchor
     boundaries, which measured as a third of the pure-core time (76% -> 68%)
     and pushed a sixth of all biome stretches under a kilometre. These fields
     want to be smooth over tens of kilometres and nothing else. */
  function temperatureAt(x: number, z: number) {
    return clamp(tempNoise((x + ox) * CLIMATE_TEMP_FREQ, (z + oz) * CLIMATE_TEMP_FREQ) * 0.85 + 0.5, 0, 1);
  }
  function moistureAt(x: number, z: number) {
    return clamp(moistNoise((x + oz) * CLIMATE_MOIST_FREQ + 41.7, (z + ox) * CLIMATE_MOIST_FREQ - 18.3) * 0.85 + 0.5, 0, 1);
  }

  /*
   * A probe is an independent evaluator with its own scratch buffers.
   *
   * Every consumer takes one of its own, and the reason is aliasing: the
   * chunk builder reads a biome at a candidate position and *then* calls
   * `sampleGround`, which evaluates a biome of its own deeper down. Sharing
   * one buffer would silently overwrite the outer result between the read and
   * its use. Separate probes make that class of bug impossible rather than
   * something every future caller has to remember.
   */
  function probe() {
    const weights = new Float32Array(NB);
    const blended: BlendedBiome = {
      amp: 1,
      ridge: 1,
      detail: 1,
      terrace: 0,
      treeDensity: 1,
      coniferBias: 0.5,
      treeScale: 1,
      rockDensity: 1,
      rockScale: 1,
      grassCover: 1,
      flowerCover: 1,
      fogMul: 1,
      snowMul: 1,
      weather: [0, 0, 0, 0],
      dominant: 0,
    };

    /* Normalised gaussian falloff from each anchor. Mirrored exactly in
       BIOME_GLSL below. */
    function weightsAt(t: number, m: number) {
      let sum = 0;
      for (let i = 0; i < NB; i++) {
        const b = BIOMES[i];
        const dt = t - b.temp,
          dm = m - b.moist;
        const w = Math.exp(-(dt * dt + dm * dm) / (b.spread * b.spread));
        weights[i] = w;
        sum += w;
      }
      const inv = 1 / (sum || 1);
      for (let i = 0; i < NB; i++) weights[i] *= inv;
      return weights;
    }

    function sample(x: number, z: number) {
      return weightsAt(temperatureAt(x, z), moistureAt(x, z));
    }

    /* Weighted average of every scalar knob, plus which biome is winning (for
       the HUD only - nothing visual is allowed to depend on the dominant one,
       or boundaries would pop). */
    function blend(w: Float32Array): BlendedBiome {
      blended.amp = 0;
      blended.ridge = 0;
      blended.detail = 0;
      blended.terrace = 0;
      blended.treeDensity = 0;
      blended.coniferBias = 0;
      blended.treeScale = 0;
      blended.rockDensity = 0;
      blended.rockScale = 0;
      blended.grassCover = 0;
      blended.flowerCover = 0;
      blended.fogMul = 0;
      blended.snowMul = 0;
      blended.weather[0] = blended.weather[1] = blended.weather[2] = blended.weather[3] = 0;
      let best = 0,
        bestW = -1;
      for (let i = 0; i < NB; i++) {
        const f = w[i];
        if (f > bestW) {
          bestW = f;
          best = i;
        }
        if (f < 1e-4) continue;
        const b = BIOMES[i];
        blended.amp += b.amp * f;
        blended.ridge += b.ridge * f;
        blended.detail += b.detail * f;
        blended.terrace += b.terrace * f;
        blended.treeDensity += b.treeDensity * f;
        blended.coniferBias += b.coniferBias * f;
        blended.treeScale += b.treeScale * f;
        blended.rockDensity += b.rockDensity * f;
        blended.rockScale += b.rockScale * f;
        blended.grassCover += b.grassCover * f;
        blended.flowerCover += b.flowerCover * f;
        blended.fogMul += b.fogMul * f;
        blended.snowMul += b.snowMul * f;
        for (let k = 0; k < 4; k++) blended.weather[k] += b.weather[k] * f;
      }
      blended.dominant = best;
      return blended;
    }

    /* the hot path: climate -> blended params in one call */
    function at(x: number, z: number) {
      return blend(sample(x, z));
    }

    return { weightsAt, sample, blend, at };
  }

  return { temperatureAt, moistureAt, probe };
}

export type Climate = ReturnType<typeof createClimate>;
export type BiomeProbe = ReturnType<Climate["probe"]>;

/*
 * The GLSL half of the same idea. `vClim` is the per-vertex (temperature,
 * moisture) baked into the chunk geometry; this resolves it to a blended
 * ground palette per fragment.
 *
 * Deliberately one pass with no temporary array: GLSL ES 1.0 only guarantees
 * constant-index access to local arrays, and accumulating then dividing by
 * the sum avoids the question entirely.
 */
export const BIOME_GLSL = `
#define NB ${NB}
uniform vec3 uBClim[NB];      /* x temp, y moist, z spread */
uniform vec3 uBGrass[NB];
uniform vec3 uBGrassAlt[NB];
uniform vec3 uBRock[NB];
uniform vec3 uBDirt[NB];
uniform vec2 uBSnow[NB];      /* x amount, y altitude line */

struct BiomeMix { vec3 grass; vec3 grassAlt; vec3 rock; vec3 dirt; float snow; float snowLine; };

BiomeMix mixBiomes(vec2 clim){
  BiomeMix o;
  o.grass = vec3(0.0); o.grassAlt = vec3(0.0); o.rock = vec3(0.0); o.dirt = vec3(0.0);
  o.snow = 0.0; o.snowLine = 0.0;
  float sum = 0.0;
  for (int i = 0; i < NB; i++) {
    vec2 d = clim - uBClim[i].xy;
    float f = exp(-dot(d, d) / (uBClim[i].z * uBClim[i].z));
    sum += f;
    o.grass    += uBGrass[i]    * f;
    o.grassAlt += uBGrassAlt[i] * f;
    o.rock     += uBRock[i]     * f;
    o.dirt     += uBDirt[i]     * f;
    o.snow     += uBSnow[i].x   * f;
    o.snowLine += uBSnow[i].y   * f;
  }
  float inv = 1.0 / max(sum, 1e-5);
  o.grass *= inv; o.grassAlt *= inv; o.rock *= inv; o.dirt *= inv;
  o.snow *= inv; o.snowLine *= inv;
  return o;
}
`;
