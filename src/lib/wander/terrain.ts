import * as THREE from "three";
import { BIOME_GLSL } from "./biomes";
import { ROAD_BLEND_DIST, ROAD_HALF, ROADBED_DROP } from "./config";
import { GLSL_COMMON } from "./glsl";
import type { HeightField } from "./heightField";
import { lerp, smoothstep } from "./math";
import type { Road } from "./road";
import type { RoadQuery, SampleGround, Uniforms } from "./types";

/*
 * Ground height and the material that paints it.
 *
 * Height itself now lives in heightField.ts, because the road consults it
 * when choosing its own elevation. What is left here is the part that needs
 * to know where the road is: blending the landscape into the road bed, and
 * the material that paints the result.
 */
export function createTerrain(road: Road, heightField: HeightField, U: Uniforms) {
  const baseHeight = heightField.baseHeight;

  /* How strongly a branch of the road at distance `d` claims the ground.

     Inverse fourth power, faded out at the blend radius so a branch entering
     or leaving range does not pop. The high power is the whole point: on the
     tarmac itself the nearest branch has to win by a landslide, or a
     switchback leg 30 m away would drag the surface under the car metres off
     the road. At 3 m against 30 m this weights the near branch ten thousand
     to one; only near the line equidistant from both do the two even out, and
     there an average is exactly what the ground should do. */
  const EPS = 1e-3;
  function branchWeight(d: number) {
    const f = smoothstep(ROAD_BLEND_DIST, ROAD_BLEND_DIST * 0.8, d);
    const d2 = d * d;
    return f / (d2 * d2 + EPS);
  }

  /* The tarmac is laid into a shallow bed rather than onto the surface, so the
     ground is unambiguously below it everywhere on the carriageway and the two
     meshes cannot interpenetrate. Full depth under the paved width, back to
     the blended surface by 6 m beyond it - a 4 degree ramp, read as the road
     sitting in the land rather than on it. See ROADBED_DROP. */
  const bedDrop = (d: number) => ROADBED_DROP * (1 - smoothstep(ROAD_HALF, ROAD_HALF + 6, d));

  /* Blend from the road surface out to open terrain. Passing an already
     computed RoadQuery avoids a second spatial-hash lookup in the hot paths
     that have one to hand.

     This is a genuine cut-and-fill rather than a reconciliation of two
     unrelated surfaces: the road already sits at the local average of this
     same landscape, so what is left to blend is the difference between the
     smoothed alignment and the real ground, which is metres rather than
     hundreds of metres.

     Where the route runs back beside itself the height comes from both
     branches at once. Taking the nearest alone made the ground step from one
     branch's elevation to the other's across the line halfway between them -
     a vertical wall up to 150 m tall, running alongside the road. */
  const sampleGround: SampleGround = (x, z, rq) => {
    let q: RoadQuery | null;
    if (rq === undefined) q = road.query(x, z);
    else q = rq;
    if (!q) return baseHeight(x, z, 999);
    const d = q.d;
    const base = baseHeight(x, z, d);
    if (d >= ROAD_BLEND_DIST) return base;
    let roadY = q.y;
    if (q.alt && q.alt.d < ROAD_BLEND_DIST) {
      const w0 = branchWeight(d),
        w1 = branchWeight(q.alt.d);
      const ws = w0 + w1;
      if (ws > 0) roadY = (q.y * w0 + q.alt.y * w1) / ws;
    }
    const t = smoothstep(ROAD_HALF + 0.8, ROAD_BLEND_DIST - 6, d);
    return lerp(roadY, base, t) - bedDrop(d);
  };

  /* The height of whatever you are actually driving on: the tarmac over the
     carriageway, the ground everywhere else. The car reads this instead of
     sampleGround, which now returns the bed the road is laid into and would
     otherwise sink it. Identical to sampleGround once clear of the shoulder. */
  const driveHeight: SampleGround = (x, z, rq) => {
    let q: RoadQuery | null;
    if (rq === undefined) q = road.query(x, z);
    else q = rq;
    const g = sampleGround(x, z, q);
    if (!q || q.d >= ROAD_HALF + 6) return g;
    return g + bedDrop(q.d) + 0.06 * (1 - smoothstep(ROAD_HALF - 0.5, ROAD_HALF + 1.5, q.d));
  };

  /* Splat done from slope alone: grass on the flats, rock as the gradient
     steepens, dirt near the shoulder, snow by season and by altitude. All
     four colours now come from `mixBiomes` resolved against the climate baked
     into each vertex, so a single draw can span a boundary. `aRoad` carries
     distance-to-road per vertex so the shoulder band needs no query here. */
  const material = new THREE.ShaderMaterial({
    uniforms: U as unknown as Record<string, THREE.IUniform>,
    fog: false,
    vertexShader: `
    attribute float aRoad;
    attribute vec2 aClimate;
    varying vec3 vN, vP; varying float vRoad; varying vec2 vClim;
    void main(){
      vN = normal; vP = position; vRoad = aRoad; vClim = aClimate;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
    fragmentShader:
      GLSL_COMMON +
      BIOME_GLSL +
      `
    varying vec3 vN, vP; varying float vRoad; varying vec2 vClim;
    void main(){
      BiomeMix bm = mixBiomes(vClim);
      vec3 n = normalize(vN);
      float slope = 1.0 - n.y;
      vec2 p = vP.xz;
      float varn = fbm2(p * 0.02);
      float varn2 = vnoise(p * 0.35);
      vec3 grass = mix(bm.grass, bm.grassAlt, varn);
      grass *= 0.9 + 0.2 * varn2;
      vec3 rock = mix(bm.rock * 0.82, bm.rock * 1.3, vnoise(p * 0.06));
      rock *= 0.85 + 0.3 * varn2;
      float rockM = smoothstep(0.2, 0.42, slope + (varn - 0.5) * 0.14);
      vec3 alb = mix(grass, rock, rockM);
      float shoulderM = smoothstep(9.5, 6.4, vRoad);
      vec3 dirt = bm.dirt * (0.85 + 0.3 * varn2);
      alb = mix(alb, dirt, shoulderM * (1.0 - rockM) * 0.9);
      /* seasonal snow, scaled by how much snow this biome holds at all, then
         the permanent altitude cap whose line is itself per-biome */
      float sn = uSnow * bm.snow * smoothstep(0.38, 0.14, slope + (varn - 0.5) * 0.22);
      sn = max(sn, smoothstep(bm.snowLine, bm.snowLine + 40.0, vP.y + varn * 30.0) * smoothstep(0.5, 0.2, slope));
      alb = mix(alb, vec3(0.92, 0.94, 0.97) * (0.92 + 0.08 * varn2), clamp(sn, 0.0, 1.0));
      vec3 col = doLight(alb, n, vP, sunShadow(vP, n));
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });

  return {
    baseHeight,
    sampleGround,
    driveHeight,
    material,
    dispose() {
      material.dispose();
    },
  };
}

export type Terrain = ReturnType<typeof createTerrain>;
