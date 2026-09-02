import * as THREE from "three";
import { MAX_SPEED } from "./config";
import { clamp } from "./math";
import type { Terrain } from "./terrain";
import type { CarState, WanderState } from "./types";

/*
 * Camera modes: chase, hood, cinematic.
 *
 * All three produce a target position and a look-at point, then the same
 * exponential smoothing runs them into the actual camera. The per-mode
 * `stiff` value is the whole difference in feel: hood is nearly rigid so the
 * car doesn't swim, cinematic is loose so it drifts.
 *
 * `1 - exp(-stiff * dt)` rather than a fixed per-frame fraction, so the
 * smoothing is the same at 60 and 144 Hz.
 */
export function createCameraRig(
  camera: THREE.PerspectiveCamera,
  car: CarState,
  tilt: THREE.Group,
  terrain: Terrain,
  state: WanderState,
  skyMesh: THREE.Mesh
) {
  const camPos = new THREE.Vector3(0, 30, -40);
  const camLook = new THREE.Vector3();

  /* 1. Cockpit camera anchors rigidly attached to car chassis tilt frame */
  const cockpitEyeAnchor = new THREE.Object3D();
  // Driver eye position in Ferrari 458 cabin:
  // x = 0.346 (aligned with steering column)
  // y = 0.99 (natural eye level with wide, clear view over dashboard onto road)
  // z = 0.68 (safely in front of seat backrest/headrest and behind steering wheel)
  cockpitEyeAnchor.position.set(0.346, 0.99, 0.68);
  tilt.add(cockpitEyeAnchor);

  const cockpitLookAnchor = new THREE.Object3D();
  // Aimed slightly down along car longitudinal axis so the road ahead is always
  // prominently framed in the center/lower viewport at any slope or inclination
  cockpitLookAnchor.position.set(0.346, 0.82, 35.0);
  tilt.add(cockpitLookAnchor);

  /* 2. Hood / Bumper camera anchors attached to car chassis tilt frame */
  const hoodEyeAnchor = new THREE.Object3D();
  hoodEyeAnchor.position.set(0, 0.72, 2.30);
  tilt.add(hoodEyeAnchor);

  const hoodLookAnchor = new THREE.Object3D();
  hoodLookAnchor.position.set(0, 0.65, 35.0);
  tilt.add(hoodLookAnchor);

  function placeAtSpawn(x: number, y: number, z: number, dx: number, dz: number) {
    camPos.set(x - dx * 20, y + 9, z - dz * 20);
  }

  const tempEye = new THREE.Vector3();
  const tempLook = new THREE.Vector3();

  function update(dt: number, t: number, U: { uCamPos: { value: THREE.Vector3 } }) {
    if (state.camMode === 2) {
      /* Cockpit Mode: Chassis-anchored in Ferrari cabin with smooth head compliance */
      tilt.updateWorldMatrix(true, false);
      cockpitEyeAnchor.getWorldPosition(tempEye);
      cockpitLookAnchor.getWorldPosition(tempLook);

      // Smooth driver head inertia:
      // Lateral G-force compliance: head subtly leans into cornering
      const rx = Math.cos(car.heading);
      const rz = -Math.sin(car.heading);
      const steerSway = clamp(car.steer * 0.02, -0.025, 0.025);
      tempEye.x += rx * steerSway;
      tempEye.z += rz * steerSway;

      // Dynamic glance into corner apex
      const lookApex = car.steer * 3.0;
      tempLook.x += rx * lookApex;
      tempLook.z += rz * lookApex;

      // Locked to chassis: NEVER falls behind seat at 175 km/h, NEVER pushes into windshield on slopes
      camPos.copy(tempEye);
      if (camLook.lengthSq() < 1) {
        camLook.copy(tempLook);
      } else {
        camLook.x = tempLook.x;
        camLook.z = tempLook.z;
        camLook.y += (tempLook.y - camLook.y) * Math.min(1, dt * 25);
      }

      camera.position.copy(camPos);
      camera.lookAt(camLook);
    } else if (state.camMode === 1) {
      /* Hood / Bumper Mode: Mounted on front nose with clean view down the road */
      tilt.updateWorldMatrix(true, false);
      hoodEyeAnchor.getWorldPosition(tempEye);
      hoodLookAnchor.getWorldPosition(tempLook);

      const rx = Math.cos(car.heading);
      const rz = -Math.sin(car.heading);
      const lookApex = car.steer * 2.5;
      tempLook.x += rx * lookApex;
      tempLook.z += rz * lookApex;

      camPos.copy(tempEye);
      camLook.copy(tempLook);

      camera.position.copy(camPos);
      camera.lookAt(camLook);
    } else if (state.camMode === 0) {
      /* Chase Mode: Exterior third-person camera with smooth follow lag */
      const fx = Math.sin(car.heading),
        fz = Math.cos(car.heading);
      const tx = car.x - fx * 9.2;
      let ty = car.y + 3.5;
      const tz = car.z - fz * 9.2;
      const lx = car.x + fx * 12;
      const ly = car.y + 1.7;
      const lz = car.z + fz * 12;
      const stiff = 4.2;

      const gy = terrain.sampleGround(tx, tz) + 1.15;
      if (ty < gy) ty = gy;
      const k = 1 - Math.exp(-stiff * dt);
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (ty - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;

      camera.position.copy(camPos);
      camLook.set(lx, ly, lz);
      camera.lookAt(camLook);
    } else {
      /* Cinematic Mode: Slow orbiting external view */
      const ang = t * 0.075;
      const r = 13 + 4 * Math.sin(t * 0.021);
      const tx = car.x + Math.sin(ang) * r;
      let ty = car.y + 4.2 + 2.2 * Math.sin(t * 0.033);
      const tz = car.z + Math.cos(ang) * r;
      const lx = car.x;
      const ly = car.y + 1.2;
      const lz = car.z;
      const stiff = 2.5;

      const gy = terrain.sampleGround(tx, tz) + 1.15;
      if (ty < gy) ty = gy;
      const k = 1 - Math.exp(-stiff * dt);
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (ty - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;

      camera.position.copy(camPos);
      camLook.set(lx, ly, lz);
      camera.lookAt(camLook);
    }

    U.uCamPos.value.copy(camera.position);

    /* Wide-angle FOV in cockpit mode for a spacious, panoramic cabin view */
    const targetFov =
      state.camMode === 1
        ? 74
        : state.camMode === 2
        ? 80 + clamp(car.speed, 0, MAX_SPEED) * 0.08
        : 60 + clamp(car.speed, 0, MAX_SPEED) * 0.18;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    }
    /* the sky sphere rides the camera so its 5 km radius never clips */
    skyMesh.position.copy(camera.position);
  }

  return { camPos, update, placeAtSpawn };
}

export type CameraRig = ReturnType<typeof createCameraRig>;
