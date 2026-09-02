import {
  CELL,
  DS,
  ROAD_BLEND_DIST,
  ROAD_BRANCH_SEP,
  ROAD_HARD_GRADE,
  ROAD_HEADING_FREQ,
  ROAD_LOOKAHEAD,
  ROAD_MAX_GRADE,
  ROAD_MAX_HEADING,
  ROAD_PROFILE_RADII,
  ROAD_PROFILE_TAPS,
  ROAD_SOFT_CORRIDOR,
} from "./config";
import type { HeightField } from "./heightField";
import { clamp, fbm, smoothstep, TAU } from "./math";
import type { NoiseFields, RoadPt, RoadQuery } from "./types";

/*
 * The road centreline: an ever-growing 1D list of samples, generated forward
 * only and never rewritten. Everything else in the world is positioned
 * relative to it, so this is the first thing built and the last thing that
 * may change behaviour.
 *
 * Points are indexed into a spatial hash on creation, because `queryRoad` is
 * called for every terrain vertex, every grass blade and every scatter
 * candidate. A linear scan over the centreline would dominate the frame.
 *
 * Generation is two-stage. `raw` holds the plan view - where the road goes and
 * what height the land there wants to be - and runs ahead of `pts`, which is
 * what the rest of the world sees. A point is only promoted into `pts` once
 * ROAD_LOOKAHEAD samples exist beyond it, because its elevation depends on
 * where the road is going next. Nothing outside this file sees `raw`, so the
 * promise that `pts` is append-only and never rewritten still holds.
 */

interface RawPt {
  x: number;
  z: number;
  dx: number;
  dz: number;
  k: number;
  target: number; // the height the land here wants the road to be
}

export function createRoad(noise: NoiseFields, heightField: HeightField) {
  const pts: RoadPt[] = [];
  const raw: RawPt[] = [];
  const hash = new Map<number, number[]>();
  let heading = 0,
    x = 0,
    z = 0;
  let lastY = 0;
  /* Indices appended since the last drain. Terrain chunks are built once and
     cached, so a chunk built before the road reached it would keep the bare
     landscape under tarmac forever; whoever owns the chunks drains this to
     know what to rebuild. */
  let newFrom = 0;

  const cellKey = (cx: number, cz: number) => (cx + 32768) * 65536 + (cz + 32768);

  /*
   * The height the road wants to be: the landscape averaged over a disc
   * roughly the width of the corridor the road occupies.
   *
   * Averaging is what makes this work. A raw terrain sample would put the
   * road on every bump and in every gully; averaging over ~90 m removes
   * everything narrower than the road's own earthworks while keeping the
   * long climbs. Sampling at the corridor's own radius also means the mean
   * is the height at which cut and fill roughly balance, which is how a real
   * alignment is chosen.
   *
   * Elevation used to be `noise(s)` - a function of arc length alone, with no
   * idea where in the world it was. That is what put the road 50 m above the
   * ground it was crossing and left the terrain to resolve the difference
   * over 78 m of blend, i.e. as a cliff.
   */
  function profileHeight(px: number, pz: number) {
    let sum = heightField.landform(px, pz);
    let n = 1;
    for (const radius of ROAD_PROFILE_RADII)
      for (let k = 0; k < ROAD_PROFILE_TAPS; k++) {
        /* offset each ring so the taps do not line up into spokes, which
           would alias against ridges running the same way */
        const a = ((k + 0.5 * radius) / ROAD_PROFILE_TAPS) * TAU;
        sum += heightField.landform(px + Math.cos(a) * radius, pz + Math.sin(a) * radius);
        n++;
      }
    return sum / n;
  }

  /* Plan view only: where the road goes, and what the land there is doing. */
  function growRaw(n: number) {
    while (raw.length < n) {
      const i = raw.length;
      const s = i * DS;
      /*
       * The heading *is* the noise, rather than the integral of it.
       *
       * It used to be the integral: curvature came from the noise and the
       * heading accumulated. That is an unbounded random walk, and with this
       * noise a badly behaved one - over one correlation length it can turn
       * the road through several complete circles, which is why the route
       * spiralled back over its own path. No restoring force fixes that; the
       * pull needed to contain a walk that wants to turn 14 radians per
       * kilometre would flatten every corner it has.
       *
       * Driving the heading directly makes it bounded by construction, so the
       * route cannot cross itself (see ROAD_MAX_HEADING) while the corners
       * stay exactly where the noise put them. Cubing still biases toward
       * straights, so corners read as events rather than a constant weave.
       */
      const n = clamp(fbm(noise.road, s * ROAD_HEADING_FREQ, 0, 2) * 1.7, -1, 1);
      const want = ROAD_MAX_HEADING * n * n * n;
      /* Rate limit sets the ~85 m minimum radius. Safe against the bound: a
         limiter tracking a target inside [-MAX, MAX] from inside it can never
         leave, so it constrains the corner without weakening the guarantee. */
      const turn = clamp(want - heading, -DS / 85, DS / 85);
      heading += turn;
      const dx = Math.sin(heading),
        dz = Math.cos(heading);
      if (i > 0) {
        x += dx * DS;
        z += dz * DS;
      }
      raw.push({ x, z, dx, dz, k: Math.abs(turn) / DS, target: profileHeight(x, z) });
    }
  }

  /*
   * Promote raw samples into finished points, choosing an elevation for each.
   *
   * Three constraints, applied in this order because each is allowed to
   * override the one before it:
   *
   *   1. Anticipation. Over the next ROAD_LOOKAHEAD samples, the road cannot
   *      already be higher than `target + grade * distance` (or it could never
   *      get down to it) nor lower than `target - grade * distance` (or it
   *      could never get up). Clamping the desired height into that envelope
   *      is what makes the road start climbing before the hill rather than
   *      after it.
   *   2. Gradient. Move toward that desired height at no more than
   *      ROAD_MAX_GRADE, so the result is still drivable.
   *   3. Catch-up. Once the road is further than ROAD_SOFT_CORRIDOR from the
   *      land, the grade limit relaxes toward ROAD_HARD_GRADE, but only in
   *      whichever direction closes the gap. That makes the deviation
   *      self-limiting without ever letting the road stray steeply, and
   *      without the step change a hard clamp on the height produces.
   */
  function finaliseTo(n: number) {
    const step = ROAD_MAX_GRADE * DS;
    while (pts.length < n && pts.length + ROAD_LOOKAHEAD < raw.length) {
      const i = pts.length;
      const r = raw[i];

      let floor = -Infinity,
        ceil = Infinity;
      for (let k = 1; k <= ROAD_LOOKAHEAD; k++) {
        const reach = step * k;
        const t = raw[i + k].target;
        if (t - reach > floor) floor = t - reach;
        if (t + reach < ceil) ceil = t + reach;
      }
      /* Ground steeper than the grade allows makes these cross. Splitting the
         difference spreads the shortfall over both sides of the climb instead
         of dumping all of it at one end. */
      if (floor > ceil) {
        const mid = (floor + ceil) * 0.5;
        floor = ceil = mid;
      }

      const desired = clamp(r.target, floor, ceil);
      /* the extra allowance applies only toward the land, never away from it */
      const dev = lastY - r.target;
      const urgency = clamp((Math.abs(dev) - ROAD_SOFT_CORRIDOR) / ROAD_SOFT_CORRIDOR, 0, 1);
      const hurry = (ROAD_MAX_GRADE + (ROAD_HARD_GRADE - ROAD_MAX_GRADE) * urgency) * DS;
      const up = dev < 0 ? hurry : step;
      const down = dev > 0 ? hurry : step;
      const y = i === 0 ? desired : lastY + clamp(desired - lastY, -down, up);
      lastY = y;

      const pt: RoadPt = { x: r.x, y, z: r.z, dx: r.dx, dz: r.dz, k: r.k };
      pts.push(pt);
      const cx = Math.floor(pt.x / CELL),
        cz = Math.floor(pt.z / CELL);
      const key = cellKey(cx, cz);
      let arr = hash.get(key);
      if (!arr) {
        arr = [];
        hash.set(key, arr);
      }
      arr.push(i);
    }
  }

  function extendTo(sMax: number) {
    const need = Math.ceil(sMax / DS) + 1;
    growRaw(need + ROAD_LOOKAHEAD + 1);
    finaliseTo(need);
  }

  /* Points finished since the last call, for cache invalidation upstream. */
  function drainNew() {
    const from = newFrom;
    newFrom = pts.length;
    return { from, to: pts.length };
  }

  /* Turn a centreline index into a proper nearest-point result, projecting
     onto the two segments that meet there. Sample-only distance would quantise
     to DS and make the road edge visibly scalloped. */
  function refine(best: number, qx: number, qz: number, bd: number): RoadQuery {
    const p = pts[best];
    let px = p.x,
      py = p.y,
      pz = p.z,
      tx = p.dx,
      tz = p.dz,
      sB = best * DS,
      bestD2 = bd;
    for (let i = best - 1; i <= best; i++) {
      if (i < 0 || i + 1 >= pts.length) continue;
      const a = pts[i],
        b = pts[i + 1];
      const abx = b.x - a.x,
        abz = b.z - a.z;
      const t = clamp(((qx - a.x) * abx + (qz - a.z) * abz) / (abx * abx + abz * abz), 0, 1);
      const cxp = a.x + abx * t,
        czp = a.z + abz * t;
      const ddx = cxp - qx,
        ddz = czp - qz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < bestD2) {
        bestD2 = d2;
        px = cxp;
        pz = czp;
        py = a.y + (b.y - a.y) * t;
        tx = a.dx + (b.dx - a.dx) * t;
        tz = a.dz + (b.dz - a.dz) * t;
        sB = (i + t) * DS;
      }
    }
    return { d: Math.sqrt(bestD2), x: px, y: py, z: pz, tx, tz, idx: best, s: sB, alt: null };
  }

  /*
   * Nearest point on the centreline within ~150 m (3 cells of CELL), or null.
   *
   * `alt` is the nearest point on a *different* branch of the route - a
   * switchback leg, or the far side of a loop - when one is also in range.
   * The road passes within blend distance of itself a few thousand times over
   * 20 km, up to 176 m apart in height, and shaping the ground from the
   * nearest branch alone put a hard crease along the line equidistant from
   * the two. That crease measured 150 m over a single 4 m cell: the walls
   * flanking the road. Terrain uses both branches so the ground between them
   * is a ramp; everything else (car physics, scatter clearance, verge grass)
   * wants the nearest branch only and ignores it.
   */
  function query(qx: number, qz: number): RoadQuery | null {
    const cx = Math.floor(qx / CELL),
      cz = Math.floor(qz / CELL);
    const reach = ROAD_BLEND_DIST * ROAD_BLEND_DIST;
    let best = -1,
      bd = 1e18,
      loI = Infinity,
      hiI = -Infinity;
    for (let ix = -3; ix <= 3; ix++)
      for (let iz = -3; iz <= 3; iz++) {
        const arr = hash.get(cellKey(cx + ix, cz + iz));
        if (!arr) continue;
        for (let a = 0; a < arr.length; a++) {
          const ai = arr[a];
          const p = pts[ai];
          const ddx = p.x - qx,
            ddz = p.z - qz;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < bd) {
            bd = d2;
            best = ai;
          }
          /* index span of the points close enough to matter, which is the
             gate for the second pass below */
          if (d2 < reach) {
            if (ai < loI) loI = ai;
            if (ai > hiI) hiI = ai;
          }
        }
      }
    if (best < 0) return null;
    const q = refine(best, qx, qz, bd);
    /* Beyond the blend radius the ground is the bare landscape and no branch
       has any say in it, so there is nothing for a second one to change. */
    if (bd >= reach) return q;
    /* Second pass only where the points in range actually span more than one
       stretch of road. Exact rather than conservative: if nothing within the
       blend radius is more than ROAD_BRANCH_SEP from `best` in arc length,
       there is no second branch for the pass to find. That keeps the common
       query - the overwhelming majority - a single scan. */
    if (hiI - loI > ROAD_BRANCH_SEP) {
      let alt = -1,
        ad = ROAD_BLEND_DIST * ROAD_BLEND_DIST;
      for (let ix = -3; ix <= 3; ix++)
        for (let iz = -3; iz <= 3; iz++) {
          const arr = hash.get(cellKey(cx + ix, cz + iz));
          if (!arr) continue;
          for (let a = 0; a < arr.length; a++) {
            const ai = arr[a];
            if (Math.abs(ai - best) <= ROAD_BRANCH_SEP) continue;
            const p = pts[ai];
            const ddx = p.x - qx,
              ddz = p.z - qz;
            const d2 = ddx * ddx + ddz * ddz;
            if (d2 < ad) {
              ad = d2;
              alt = ai;
            }
          }
        }
      if (alt >= 0) q.alt = refine(alt, qx, qz, ad);
    }
    return q;
  }

  return { pts, extendTo, query, drainNew };
}

export type Road = ReturnType<typeof createRoad>;
