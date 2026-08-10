import * as THREE from "three";

// Small reusable camera-easing abstraction: something wants the camera to
// look at a point from a given distance, this eases toward it every frame
// (or snaps instantly, for reduced motion). Deliberately minimal for now -
// this is the seam Phase 3's scroll-driven camera system plugs into later,
// not a full waypoint/timeline system yet.
export interface CameraRig {
  setTarget(lookAt: THREE.Vector3, distance: number): void;
  snapToTarget(): void;
  update(ease?: number): void;
}

export function createCameraRig(camera: THREE.PerspectiveCamera, defaultEase = 0.06): CameraRig {
  const currentLookAt = new THREE.Vector3();
  camera.getWorldDirection(currentLookAt);
  currentLookAt.multiplyScalar(camera.position.z).add(camera.position);

  const targetLookAt = currentLookAt.clone();
  let currentZ = camera.position.z;
  let targetZ = camera.position.z;

  function apply() {
    camera.position.z = currentZ;
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
    update(ease = defaultEase) {
      currentLookAt.lerp(targetLookAt, ease);
      currentZ += (targetZ - currentZ) * ease;
      apply();
    },
  };
}
