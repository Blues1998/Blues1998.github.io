import * as THREE from "three";
import { lerp } from "./math";

/*
 * The seasonal palette.
 *
 * Every entry is a 4-array keyed at the season *centres* (phase .5, 1.5, 2.5,
 * 3.5), not at the boundaries. `seasonMix` handles the half-step offset, so a
 * phase of exactly 1.5 gives pure summer and 2.0 gives the midpoint between
 * summer and autumn. That is why nothing here ever snaps: the world is always
 * somewhere between two seasons.
 */

const C = (h: number) => new THREE.Color(h);

export const PAL = {
  grass: [C(0x74b054), C(0x7fa844), C(0xa38b47), C(0x8b9078)],
  grassAlt: [C(0x5f9a49), C(0x6c9439), C(0x8f7439), C(0x7b8069)],
  leafA: [C(0x93c464), C(0x4f8f3b), C(0xd07f2e), C(0x9a8d80)],
  leafB: [C(0xb2d47e), C(0x6aa348), C(0xc7502f), C(0x877a6c)],
  conifA: [C(0x35744a), C(0x2d6a3c), C(0x2f6141), C(0x3a584a)],
  conifB: [C(0x44875a), C(0x3b7a4a), C(0x3d704e), C(0x466255)],
  /* deciduous canopy density: winter keeps 22%, which reads as bare branches
     rather than as a missing tree */
  leafDen: [0.85, 1.0, 0.8, 0.22],
  snow: [0.06, 0, 0, 1],
};

export const SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
export const SEASON_EMOJI = ["🌸", "☀️", "🍂", "❄️"];
export const FLOWER_SEASON = [1.0, 0.7, 0.15, 0];

export function seasonMix(arr: THREE.Color[], phase: number, out: THREE.Color): THREE.Color;
export function seasonMix(arr: number[], phase: number): number;
export function seasonMix(arr: (THREE.Color | number)[], phase: number, out?: THREE.Color) {
  const t = (phase - 0.5 + 4) % 4;
  const i = Math.floor(t);
  let f = t - i;
  f = f * f * (3 - 2 * f); // smoothstep, so seasons ease rather than ramp
  if (out) {
    out.lerpColors(arr[i] as THREE.Color, arr[(i + 1) % 4] as THREE.Color, f);
    return out;
  }
  return lerp(arr[i] as number, arr[(i + 1) % 4] as number, f);
}
