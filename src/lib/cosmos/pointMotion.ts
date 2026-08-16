import * as THREE from "three";

// Motion for the two point clouds - the galaxy and the nebula - done in
// the vertex shader.
//
// Both are large enough that the CPU is not an option: the galaxy is 9,200
// points and the nebula more, and rewriting either position buffer every
// frame would cost more than the entire rest of the scene. Both effects
// are also pure functions of a point's own rest position and the time, so
// there is nothing to accumulate and nothing to store - which is exactly
// the shape a vertex shader wants.
//
// Neither touches the geometry's bounding volume: the galaxy's shear
// preserves each point's radius, and the nebula's drift is a fraction of a
// percent of the cloud. Frustum culling and the scene's own extent
// measurements stay correct without being told about any of this.

export interface MotionClock {
  uniform: { value: number };
  advance(dt: number): void;
}

export function createMotionClock(): MotionClock {
  const uniform = { value: 0 };
  return {
    uniform,
    advance(dt) {
      uniform.value += dt;
    },
  };
}

function patch(material: THREE.Material, clock: MotionClock, key: string, body: string) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMotionTime = clock.uniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uMotionTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${body}`);
  };
  // three caches compiled programs by a key derived from the material's
  // own parameters, which know nothing about the source edit above. Two
  // otherwise-identical PointsMaterials - and the galaxy has exactly that,
  // one for its stars and one for its haze - would otherwise share
  // whichever program compiled first.
  material.customProgramCacheKey = () => key;
}

// Differential rotation.
//
// A galaxy does not turn like a plate. Its rotation curve is close to
// flat, so the angular rate falls off with radius and the arms trail: the
// inner disc laps the outer one. Rigid rotation - which is what this was,
// and about the wrong axis at that - reads as a pinwheel ornament, because
// a pinwheel is exactly what it is.
//
// The real 1/r falls off too hard to use: it winds the arms into a smear
// within a couple of minutes (this is the classic winding problem, which
// real galaxies escape by having their arms be density waves rather than
// fixed collections of stars). Softened near the centre, it shears slowly
// enough to be felt over a visit rather than watched.
export function applyGalaxyShear(material: THREE.Material, clock: MotionClock, rate: number) {
  patch(
    material,
    clock,
    "galaxy-shear",
    `
    {
      float r = length(transformed.xz);
      // The softening constant sets how fast the arms wind up, and a page
      // can be left open for a long time: at 0.35 the inner arms lap the
      // rim about three and a half times over, which over ten minutes is
      // enough extra winding to notice. 0.6 keeps the shear visible over a
      // visit without the spiral tightening into a smear over an hour.
      float omega = ${rate.toFixed(5)} / (0.6 + r);
      float a = uMotionTime * omega;
      float s = sin(a);
      float c = cos(a);
      transformed.xz = mat2(c, -s, s, c) * transformed.xz;
    }
    `,
  );
}

// Slow internal drift, so the cloud has weather.
//
// The nebula deliberately does not rotate - it is light-years of gas, and
// anything you could see turning is wrong - which left it the one object
// in the scene that was completely motionless. This is the alternative:
// each point wanders a fraction of a percent of the cloud's width on its
// own phase, taken from its rest position, so the structure holds while
// the gas inside it moves.
export function applyNebulaDrift(material: THREE.Material, clock: MotionClock, amplitude: number) {
  const a = amplitude.toFixed(5);
  patch(
    material,
    clock,
    "nebula-drift",
    `
    {
      // Three different rates on three different axes, each phased by a
      // *different* coordinate than the one it moves. Same rate or same
      // phase everywhere and the whole cloud breathes as one object, which
      // is the thing this exists to avoid.
      transformed.x += sin(uMotionTime * 0.13 + position.y * 2.7) * ${a};
      transformed.y += sin(uMotionTime * 0.11 + position.z * 2.3) * ${a};
      transformed.z += sin(uMotionTime * 0.09 + position.x * 3.1) * ${a};
    }
    `,
  );
}
