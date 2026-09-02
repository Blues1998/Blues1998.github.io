import type { Climate } from "./biomes";
import { fbm, lerp, smoothstep } from "./math";
import type { NoiseFields } from "./types";

/*
 * The bare landscape: height as a function of world position, before the road
 * has any say in it.
 *
 * This lives apart from `terrain.ts` because the road needs it. The road's
 * elevation profile is a smoothed, gradient-limited sample of this surface
 * (see road.ts), and terrain.ts then blends between the road and this. If
 * this function stayed inside terrain.ts, which depends on road.ts for its
 * queries, that would be a cycle.
 *
 * `roadD` no longer suppresses the large-scale terms, and that is the whole
 * point of this split. It used to: mountains ramped from nothing at 24 m to
 * full height at 86 m, which crushed up to 230 m of relief into a 62 m band
 * and produced 70-80 degree walls flanking the tarmac. Worse, it meant there
 * were two inconsistent surfaces - a flattened one at the road and the real
 * one beyond it - and every disagreement between them had to be resolved by
 * a cliff. There is now one landscape, and the road follows it.
 *
 * The short ramp survives only for fine detail and terracing, where it does
 * what it was meant to: keep the verge immediately beside the car calm.
 */
export function createHeightField(noise: NoiseFields, climate: Climate) {
  const bio = climate.probe();

  /* Terracing, which is what turns a slope into a mesa. Quantise the height
     to steps, but ease across the top of each step rather than cutting it, or
     the result is a staircase of vertical walls the car cannot climb and the
     normals go to garbage. */
  const TERRACE_H = 26;
  function terraceHeight(h: number, amount: number) {
    if (amount < 0.01) return h;
    const q = h / TERRACE_H;
    const fl = Math.floor(q);
    const frac = q - fl;
    const stepped = (fl + smoothstep(0.62, 0.96, frac)) * TERRACE_H;
    return lerp(h, stepped, amount);
  }

  /*
   * Every amplitude term is scaled by the local biome, so the same noise
   * makes aretes in the alpine, eroded gullies in the badlands and a dead
   * level pan in the salt flats. The landform difference between biomes is
   * these four multipliers, not four different terrain functions.
   */
  /* The landform: everything with a wavelength longer than the road's own
     earthworks. Split out because this, and not `baseHeight`, is what the road
     follows - see `landform` below. */
  function macroHeight(x: number, z: number, amp: number, ridge: number) {
    let h = fbm(noise.terrain, x * 0.0042, z * 0.0042, 4) * 57 * amp;
    h += fbm(noise.terrain, x * 0.00085 + 37.2, z * 0.00085 - 11.8, 3) * 111 * amp;
    /* ridged term: 1 - |noise| makes creases instead of blobs, gated so
       mountains only appear where the low-frequency mask allows */
    const r = 1 - Math.abs(noise.terrain(x * 0.0013 + 91.7, z * 0.0013 + 13.1));
    h += r * r * 85 * ridge * smoothstep(0.1, 0.7, fbm(noise.terrain, x * 0.0004 + 5.1, z * 0.0004 + 9.3, 2) + 0.45);
    return h;
  }

  function baseHeight(x: number, z: number, roadD: number) {
    const b = bio.at(x, z);
    /* detail and terracing only: see the note above about why the large
       terms are no longer road-aware */
    const near = smoothstep(24, 86, roadD);
    const h = macroHeight(x, z, b.amp, b.ridge) + fbm(noise.terrain, x * 0.028, z * 0.028, 2) * (0.5 + 1.6 * near) * b.detail;
    return terraceHeight(h, b.terrace * near);
  }

  /*
   * The surface the road takes its elevation from: the landform with the local
   * decoration left off.
   *
   * The road used to profile `baseHeight(x, z, 999)`, which is the far-field
   * variant - fully terraced. Terracing is a 26 m quantisation, so the road was
   * surveying a landscape of mesa steps, and any gradient allowance it was
   * given got spent falling off one. Grades reached 185%.
   *
   * Terracing is also exactly what `baseHeight` fades out near the road, so
   * profiling it meant the road was following a surface that would not exist
   * by the time the ground beside it was built. This is the same class of
   * mistake as the old arc-length elevation: two surfaces that disagree, with
   * the difference left for the blend to absorb as a cliff.
   */
  function landform(x: number, z: number) {
    const b = bio.at(x, z);
    return macroHeight(x, z, b.amp, b.ridge);
  }

  return { baseHeight, landform };
}

export type HeightField = ReturnType<typeof createHeightField>;
