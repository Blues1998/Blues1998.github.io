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
  setTarget(lookAt: THREE.Vector3, distance: number): void;
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

  function apply() {
    // Tracks the target laterally as well as in depth, so callers can frame
    // an object off-centre (or pan for parallax) purely by offsetting the
    // look-at point, without the rig fighting them by snapping back to x=0.
    camera.position.set(currentLookAt.x, currentLookAt.y, currentLookAt.z + currentZ);
    camera.lookAt(currentLookAt);
  }

  return {
    setTarget(lookAt, distance) {
      targetLookAt.copy(lookAt);
      targetZ = distance;
    },
    snapToTarget() {
      currentLookAt.copy(targetLookAt);
      currentZ = targetZ;
      apply();
    },
    update(ease = defaultEase, dt = REFERENCE_STEP) {
      const k = easeFactor(ease, dt);
      currentLookAt.lerp(targetLookAt, k);
      currentZ += (targetZ - currentZ) * k;
      apply();
    },
  };
}
