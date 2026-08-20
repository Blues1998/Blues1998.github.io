import * as THREE from "three";
import { REFERENCE_STEP, easeFactor } from "./timing";

// Small reusable camera-easing abstraction: something wants the camera to
// look at a point from a given distance, this eases toward it every frame
// (or snaps instantly, for reduced motion). The camera sits `distance`
// units in front of the look-at point's own world z (not a fixed world z),
// so as callers hand it look-at points at different depths - e.g. the
// homepage's scroll-driven journey sweeping across the six cosmos objects -
// the camera physically dollies through the scene rather than only
// swivelling to face each one from a constant world position.
export interface CameraRig {
  // `yaw`/`pitch` are radians of orbit *around* the look-at point, and both
  // default to zero - which reproduces the original straight-down-the-z-axis
  // shot exactly, so every caller that doesn't care about orbit is unaffected.
  setTarget(lookAt: THREE.Vector3, distance: number, yaw?: number, pitch?: number): void;
  snapToTarget(): void;
  // `ease` stays expressed per 60Hz frame - the units every caller already
  // thinks in - and is reshaped here for the frame that actually happened,
  // so the approach takes the same wall-clock time on any display.
  update(ease?: number, dt?: number): void;
}

export function createCameraRig(camera: THREE.PerspectiveCamera, defaultEase = 0.06): CameraRig {
  const currentLookAt = new THREE.Vector3();
  camera.getWorldDirection(currentLookAt);
  currentLookAt.multiplyScalar(camera.position.z).add(camera.position);

  const targetLookAt = currentLookAt.clone();
  let currentZ = camera.position.z;
  let targetZ = camera.position.z;
  // Orbit, held separately from the look-at point because the two answer
  // different questions: the look-at says what is being framed and where in
  // frame it sits, the orbit says what angle it is being seen from. Folding
  // the second into the first is what a plain dolly does, and it is exactly
  // the thing that makes a scroll-driven approach read as a zoom rather than
  // as travel - the object grows, but you never get round it.
  let currentYaw = 0;
  let targetYaw = 0;
  let currentPitch = 0;
  let targetPitch = 0;

  function apply() {
    // Spherical offset from the look-at point. At yaw = pitch = 0 the two
    // cosines are 1 and the two sines are 0, so this collapses to
    // (x, y, z + distance) - the original behaviour, to the bit.
    const cp = Math.cos(currentPitch);
    // Tracks the target laterally as well as in depth, so callers can frame
    // an object off-centre (or pan for parallax) purely by offsetting the
    // look-at point, without the rig fighting them by snapping back to x=0.
    camera.position.set(
      currentLookAt.x + Math.sin(currentYaw) * cp * currentZ,
      currentLookAt.y + Math.sin(currentPitch) * currentZ,
      currentLookAt.z + Math.cos(currentYaw) * cp * currentZ,
    );
    camera.lookAt(currentLookAt);
  }

  return {
    setTarget(lookAt, distance, yaw = 0, pitch = 0) {
      targetLookAt.copy(lookAt);
      targetZ = distance;
      targetYaw = yaw;
      targetPitch = pitch;
    },
    snapToTarget() {
      currentLookAt.copy(targetLookAt);
      currentZ = targetZ;
      currentYaw = targetYaw;
      currentPitch = targetPitch;
      apply();
    },
    update(ease = defaultEase, dt = REFERENCE_STEP) {
      const k = easeFactor(ease, dt);
      currentLookAt.lerp(targetLookAt, k);
      currentZ += (targetZ - currentZ) * k;
      // Eased on the same factor as the rest of the shot. Orbit that settles
      // on a different schedule from distance reads as two separate moves
      // rather than one camera.
      currentYaw += (targetYaw - currentYaw) * k;
      currentPitch += (targetPitch - currentPitch) * k;
      apply();
    },
  };
}
