import * as THREE from "three";

// Foreground particulate that streaks past the camera while it travels
// between waypoints, so motion is something you *see* rather than only
// infer from objects changing size. Nothing else in the scene passes the
// viewer - the six objects are all destinations, never things you fly
// through - and that absence is most of why camera motion reads as weak.
//
// Two deliberate cheats, both needed because the camera's parking distance
// spans ~1000x across the journey (about a unit from the probe, a thousand
// from the galaxy):
//
//   1. The field is camera-attached and scaled by the current standoff, so
//      "near foreground dust" stays near-foreground at every scale instead
//      of being invisibly small at one end and swallowing the frame at the
//      other.
//   2. Because it's camera-attached, it can't drift past on its own, so
//      travel is simulated by pushing each particle backwards through a
//      wrapping box using the camera's per-frame delta, normalized by that
//      same standoff.
//
// Drawn as LineSegments rather than Points so each particle stretches into
// a real motion streak; WebGL ignores linewidth, so these are always 1px,
// which is what you want for distant dust anyway.
export interface TransitDust {
  object: THREE.Object3D;
  update(cameraDeltaZ: number, standoff: number, cameraPos: THREE.Vector3): void;
  dispose(): void;
}

// Normalized half-extents; multiplied by the live standoff each frame.
const HALF_XY = 3;
const HALF_Z = 6;

function wrap(value: number, half: number): number {
  const span = half * 2;
  return ((((value + half) % span) + span) % span) - half;
}

export function createTransitDust(count: number, accent: THREE.Color): TransitDust {
  // 2 vertices per particle (streak head + tail).
  const positions = new Float32Array(count * 6);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i * 3] = (Math.random() * 2 - 1) * HALF_XY;
    seeds[i * 3 + 1] = (Math.random() * 2 - 1) * HALF_XY;
    seeds[i * 3 + 2] = (Math.random() * 2 - 1) * HALF_Z;
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute("position", positionAttr);

  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(0xffffff).lerp(accent, 0.35),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const lines = new THREE.LineSegments(geometry, material);
  // The field is rebuilt around the camera every frame, so three.js's own
  // bounding-sphere cull would be working from stale bounds.
  lines.frustumCulled = false;

  let opacity = 0;

  return {
    object: lines,
    update(cameraDeltaZ, standoff, cameraPos) {
      if (standoff <= 0) return;
      // Travel expressed in the field's own normalized units, so a given
      // scroll feels like the same amount of streaking at every scale.
      const travel = cameraDeltaZ / standoff;
      const speed = Math.abs(travel);

      // Only visible in motion: at rest this fades out entirely rather
      // than leaving static specks parked in front of the camera.
      //
      // Both ceilings are deliberately low. Normalizing by the standoff
      // means the tail of a long leg - where the standoff has collapsed
      // from ~1050 down to ~2 - divides a still-large camera delta by a
      // tiny number, so the raw figure spikes enormously right as you
      // arrive. Left uncapped that reads as a jump to lightspeed on every
      // waypoint; the brief here is foreground particulate you register at
      // the edge of vision, not a hyperspace transition.
      const targetOpacity = Math.min(0.16, speed * 3);
      opacity += (targetOpacity - opacity) * 0.15;
      material.opacity = opacity;

      // Short dashes rather than full-box smears, for the same reason.
      const streak = Math.min(1.2, Math.max(0.03, speed * 1.8)) * Math.sign(travel || 1);

      for (let i = 0; i < count; i++) {
        const x = seeds[i * 3];
        const y = seeds[i * 3 + 1];
        // Camera moving deeper (negative delta) pushes dust toward +z.
        const z = wrap(seeds[i * 3 + 2] - travel, HALF_Z);
        seeds[i * 3 + 2] = z;

        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;
        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y;
        positions[i * 6 + 5] = z + streak;
      }
      positionAttr.needsUpdate = true;

      lines.position.copy(cameraPos);
      lines.scale.setScalar(standoff);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
