/*
 * Scalar helpers and the deterministic noise fields the whole world is built
 * from. Everything here is pure: given the same seed, the same numbers, on
 * every machine. That is what makes `?seed=` a shareable world rather than a
 * decorative query param.
 */

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const wrapAngle = (a: number) => {
  let v = a;
  while (v > Math.PI) v -= TAU;
  while (v < -Math.PI) v += TAU;
  return v;
};

/* mulberry32: small, fast, good enough for scatter decisions, and seedable
   per chunk so a chunk rebuilds identically after being evicted. */
export function mulberry32(a: number) {
  let s = a;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Integer hash over a 2D cell + salt. Used to seed per-chunk and per-sample
   RNGs without storing anything. */
export function hash2i(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export type Noise2D = (x: number, y: number) => number;

/* 2D simplex noise (Gustavson's public-domain construction) */
export function makeSimplex(seed: number): Noise2D {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
  const F2 = 0.3660254037844386,
    G2 = 0.21132486540518713;
  return function (x: number, y: number) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s),
      j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - i + t,
      y0 = y - j + t;
    const i1 = x0 > y0 ? 1 : 0,
      j1 = 1 - i1;
    const x1 = x0 - i1 + G2,
      y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2,
      y2 = y0 - 1 + 2 * G2;
    const ii = i & 255,
      jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const g = (perm[ii + perm[jj]] & 7) * 2;
      n += t0 * t0 * (G[g] * x0 + G[g + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const g = (perm[ii + i1 + perm[jj + j1]] & 7) * 2;
      n += t1 * t1 * (G[g] * x1 + G[g + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const g = (perm[ii + 1 + perm[jj + 1]] & 7) * 2;
      n += t2 * t2 * (G[g] * x2 + G[g + 1] * y2);
    }
    return 70 * n;
  };
}

export function fbm(n: Noise2D, x: number, y: number, oct: number, lac = 2, gain = 0.5) {
  let a = 1,
    f = 1,
    s = 0,
    norm = 0;
  for (let o = 0; o < oct; o++) {
    s += a * n(x * f, y * f);
    norm += a;
    a *= gain;
    f *= lac;
  }
  return s / norm;
}
