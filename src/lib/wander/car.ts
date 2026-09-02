import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { createCockpit } from "./cockpit";
import { DS, GEAR_TOPS, MAX_REV, MAX_SPEED, ROAD_HALF } from "./config";
import { clamp, smoothstep, wrapAngle } from "./math";
import type { Road } from "./road";
import type { Terrain } from "./terrain";
import type { CarState, EnvState, Uniforms, WanderState, WeatherState } from "./types";
import { createWindshield } from "./windshield";

/*
 * The car: its model, its physics, and the autopilot that drives it.
 *
 * The physics are deliberately arcade. There is no tyre model and no weight
 * transfer; grip is a single scalar that rain and snow reduce, and sliding is
 * faked by letting the direction of travel lag the heading. It reads right at
 * speed, which is all this needs to do.
 */

export function createCar(road: Road, terrain: Terrain, U: Uniforms, state: WanderState, scene: THREE.Scene) {
  const car: CarState = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    speed: 0,
    steer: 0,
    pitch: 0,
    roll: 0,
    off: 0,
    lastRoadIdx: 20,
    s: 80,
    yv: 0,
    pitchV: 0,
    rollV: 0,
    velDir: 0,
  };

  const group = new THREE.Group();
  /* Body tilt is a child of the position group so pitch and roll can be
     applied without disturbing the yaw the wheels steer against. */
  const tilt = new THREE.Group();
  group.add(tilt);
  scene.add(group);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd95f2b, roughness: 0.32, metalness: 0.12 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x101720, roughness: 0.08, metalness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x191b1f, roughness: 0.85 });
  const alloyMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.32, metalness: 0.85 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.25 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x7a1310, emissive: 0xff2218, emissiveIntensity: 0.35 });

  /* Sport-luxury fastback sedan: hull and glasshouse are extruded side
     profiles, which gets a believable silhouette from a dozen 2D points and
     no modelling tool. */
  function profileGeo(pts: [number, number][], width: number, bevT: number, bevS: number) {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: width, bevelEnabled: true, bevelThickness: bevT, bevelSize: bevS, bevelSegments: 2, steps: 1 });
    g.rotateY(-Math.PI / 2); // profile x -> car +Z (forward), extrusion -> car X
    g.translate(width / 2, 0, 0);
    return g;
  }

  const ownedGeo: THREE.BufferGeometry[] = [];
  const proceduralGroup = new THREE.Group();
  tilt.add(proceduralGroup);

  let extGlassMesh!: THREE.Mesh;
  let hullMesh!: THREE.Mesh;
  {
    const hullGeo = profileGeo(
      [
        [-2.42, 0.3],
        [-2.46, 0.62],
        [-2.4, 0.76],
        [-1.55, 0.84],
        [0.4, 0.86],
        [1.35, 0.78],
        [2.15, 0.66],
        [2.44, 0.52],
        [2.46, 0.34],
        [2.3, 0.24],
        [1.35, 0.2],
        [-1.75, 0.2],
        [-2.3, 0.24],
      ],
      1.78,
      0.06,
      0.05,
    );
    ownedGeo.push(hullGeo);
    hullMesh = new THREE.Mesh(hullGeo, bodyMat);
    proceduralGroup.add(hullMesh);

    const glassGeo = profileGeo(
      [
        [0.95, 0.86],
        [0.3, 1.3],
        [-0.85, 1.34],
        [-1.75, 0.88],
      ],
      1.62,
      0.04,
      0.04,
    );
    ownedGeo.push(glassGeo);
    extGlassMesh = new THREE.Mesh(glassGeo, glassMat);
    proceduralGroup.add(extGlassMesh);

    const box = (w: number, h: number, d: number) => {
      const g = new THREE.BoxGeometry(w, h, d);
      ownedGeo.push(g);
      return g;
    };
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      proceduralGroup.add(mesh);
      return mesh;
    };
    add(box(1.62, 0.055, 0.05), tailMat, 0, 0.78, -2.43); // light bar
    add(box(1.3, 0.03, 0.18), darkMat, 0, 0.865, -2.26); // spoiler
    add(box(1.84, 0.18, 0.22), darkMat, 0, 0.26, -2.3); // diffuser
    add(box(1.3, 0.16, 0.08), darkMat, 0, 0.42, 2.42); // grille
    add(box(1.86, 0.1, 0.3), darkMat, 0, 0.22, 2.28); // splitter
    const hlGeo = box(0.42, 0.075, 0.06);
    const mirrorGeo = box(0.16, 0.08, 0.1);
    const skirtGeo = box(0.08, 0.14, 2.6);
    for (const sx of [-1, 1]) {
      add(hlGeo, headMat, sx * 0.62, 0.68, 2.38, sx * 0.35);
      add(mirrorGeo, bodyMat, sx * 0.98, 0.98, 0.42);
      add(skirtGeo, darkMat, sx * 0.92, 0.24, 0);
    }
  }

  const wheels: { pivot: THREE.Group; mesh: THREE.Group; front: boolean }[] = [];
  {
    const tireG = new THREE.CylinderGeometry(0.335, 0.335, 0.24, 20);
    tireG.rotateZ(Math.PI / 2);
    const rimG = new THREE.CylinderGeometry(0.21, 0.21, 0.245, 20);
    rimG.rotateZ(Math.PI / 2);
    const spokeG = new THREE.BoxGeometry(0.026, 0.36, 0.09);
    ownedGeo.push(tireG, rimG, spokeG);
    for (const [sx, sz] of [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(tireG, darkMat));
      w.add(new THREE.Mesh(rimG, alloyMat));
      for (let k = 0; k < 5; k++) {
        const sp = new THREE.Mesh(spokeG, alloyMat);
        sp.rotation.x = (k * Math.PI) / 5;
        w.add(sp);
      }
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.86, 0.335, sz * 1.45);
      pivot.add(w);
      proceduralGroup.add(pivot);
      wheels.push({ pivot, mesh: w, front: sz > 0 });
    }
  }

  /* ---- 3D Sports Car Asset (Ferrari 458 Italia) ---- */
  const sportsCarGroup = new THREE.Group();
  tilt.add(sportsCarGroup);

  let sportsCarLoaded = false;
  let carBodyMesh: THREE.Mesh | null = null;
  let carGlassMesh: THREE.Mesh | null = null;
  let carSteeringWheel: THREE.Object3D | null = null;
  let carWheelFL: THREE.Object3D | null = null;
  let carWheelFR: THREE.Object3D | null = null;
  let carWheelRL: THREE.Object3D | null = null;
  let carWheelRR: THREE.Object3D | null = null;

  const baseWheelQuatFL = new THREE.Quaternion();
  const baseWheelQuatFR = new THREE.Quaternion();
  const baseWheelQuatRL = new THREE.Quaternion();
  const baseWheelQuatRR = new THREE.Quaternion();
  const baseSteeringQuat = new THREE.Quaternion();
  let sportsWheelSpin = 0;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    "/models/sports_car.glb",
    (gltf) => {
      const model = gltf.scene;

      // Rotate 180 deg around Y so headlights face +Z forward
      model.rotation.y = Math.PI;
      // Standard scale
      model.scale.set(1, 1, 1);
      // Align ground clearance and wheelbase
      model.position.set(0, -0.015, 0.46);

      // Deep Italian Rosso Corsa clearcoat paint
      const sportsBodyMat = new THREE.MeshPhysicalMaterial({
        color: 0xdb2418,
        metalness: 0.88,
        roughness: 0.28,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
      });

      const sportsGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0x11161d,
        metalness: 0.2,
        roughness: 0.05,
        transmission: 0.88,
        transparent: true,
        opacity: 0.8,
      });

      carBodyMesh = model.getObjectByName("body") as THREE.Mesh;
      if (carBodyMesh) carBodyMesh.material = sportsBodyMat;

      carGlassMesh = model.getObjectByName("glass") as THREE.Mesh;
      if (carGlassMesh) carGlassMesh.material = sportsGlassMat;

      carWheelFL = model.getObjectByName("wheel_fl");
      if (carWheelFL) baseWheelQuatFL.copy(carWheelFL.quaternion);

      carWheelFR = model.getObjectByName("wheel_fr");
      if (carWheelFR) baseWheelQuatFR.copy(carWheelFR.quaternion);

      carWheelRL = model.getObjectByName("wheel_rl");
      if (carWheelRL) baseWheelQuatRL.copy(carWheelRL.quaternion);

      carWheelRR = model.getObjectByName("wheel_rr");
      if (carWheelRR) baseWheelQuatRR.copy(carWheelRR.quaternion);

      carSteeringWheel = model.getObjectByName("steering_wheel");
      if (carSteeringWheel) baseSteeringQuat.copy(carSteeringWheel.quaternion);

      model.traverse((o: THREE.Object3D) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      sportsCarGroup.add(model);
      sportsCarLoaded = true;
      proceduralGroup.visible = false;
      cockpit.setSportsCarMode(true);
      console.log("FERRARI MODEL LOADED AND ATTACHED SUCCESSFULLY!");
    },
    undefined,
    (err) => console.error("FERRARI LOAD ERROR:", err)
  );

  group.traverse((o: THREE.Object3D) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });

  /* Headlight spotlights light the built-in materials (posts, the car
     itself); the custom shaders read U.uHL* instead, because a real light
     would mean recompiling every procedural material with a light loop. */
  const hlSpots: THREE.SpotLight[] = [];
  for (const sx of [-1, 1]) {
    const sp = new THREE.SpotLight(0xffe9b8, 0, 150, 0.55, 0.55, 1.0);
    sp.position.set(sx * 0.62, 0.72, 2.2);
    sp.target.position.set(sx * 0.8, -1.5, 30);
    tilt.add(sp);
    tilt.add(sp.target);
    hlSpots.push(sp);
  }

  const glowTex = (() => {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = 64;
    const ctx = cnv.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(255,245,214,1)");
    g.addColorStop(0.4, "rgba(255,238,180,0.35)");
    g.addColorStop(1, "rgba(255,238,180,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cnv);
  })();
  const glowSprites: THREE.Sprite[] = [];
  for (const sx of [-1, 1]) {
    const sm = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
    const sp = new THREE.Sprite(sm);
    sp.scale.set(0.9, 0.9, 1);
    sp.position.set(sx * 0.62, 0.68, 2.45);
    tilt.add(sp);
    glowSprites.push(sp);
  }

  const cockpit = createCockpit(tilt, bodyMat);
  const windshield = createWindshield(tilt, state);

  /* Snap back onto the centreline, keeping whatever speed is survivable. */
  function reset() {
    const rq = road.query(car.x, car.z);
    const idx = rq ? Math.round(rq.s / DS) : car.lastRoadIdx;
    const p = road.pts[clamp(idx, 2, road.pts.length - 2)];
    car.x = p.x;
    car.z = p.z;
    car.heading = Math.atan2(p.dx, p.dz);
    car.speed = Math.min(car.speed, 12);
    car.y = p.y;
  }

  /* Place the car at the start of the road, before the first frame. */
  function spawn() {
    const p = road.pts[20];
    car.x = p.x;
    car.z = p.z;
    car.heading = Math.atan2(p.dx, p.dz);
    car.velDir = car.heading;
    car.y = p.y;
    car.speed = 14;
    return p;
  }

  function update(dt: number, env: EnvState, wx: WeatherState, wallT: number, throttleIn: number, steerIn: number, braking: boolean) {
    road.extendTo(car.s + 2400);
    const q = road.query(car.x, car.z);
    if (q) {
      car.lastRoadIdx = q.idx;
      car.s = q.s;
    }
    const off = q ? smoothstep(ROAD_HALF + 0.5, ROAD_HALF + 5, q.d) : 1;
    car.off = off;

    /* surface grip: rain and snow cover both loosen the car */
    const grip = 1 - clamp(U.uWet.value * 0.38 + env.snow * 0.3, 0, 0.52);

    let th = throttleIn;
    let stIn = steerIn;

    /* Autopilot: pure pursuit toward a point on the spline that recedes with
       speed, offset to the right so it tracks a lane rather than the centre
       line. Corner speed comes from the worst curvature in the next 200 m. */
    if (state.auto && q) {
      const look = 16 + car.speed * 1.2;
      const tIdx = clamp(Math.round(q.s / DS) + Math.round(look / DS), 0, road.pts.length - 2);
      const tp = road.pts[tIdx];
      const rx = tp.dz,
        rz = -tp.dx;
      const tx = tp.x + rx * 2.5,
        tz = tp.z + rz * 2.5;
      const desired = Math.atan2(tx - car.x, tz - car.z);
      stIn = clamp(wrapAngle(desired - car.heading) * 2.4, -1, 1);
      let maxK = 0;
      const i0 = Math.round(q.s / DS);
      for (let i = i0; i < Math.min(i0 + 50, road.pts.length); i++) maxK = Math.max(maxK, road.pts[i].k);
      const vT = Math.min(44, Math.sqrt((0.92 * 9.81 * (0.5 + 0.5 * grip)) / Math.max(maxK, 1e-4)));
      th = clamp((vT - car.speed) * 0.4, -1, 1);
    }

    car.steer += (stIn * 0.55 - car.steer) * Math.min(1, dt * 6);
    /* steering authority falls off with speed, so the car is twitchy in a car
       park and stable at 200 km/h without a separate speed-sensitive rack */
    const effSteer = car.steer / (1 + Math.abs(car.speed) * 0.045);
    const yawMax = 1.25 * (0.55 + 0.45 * grip);
    const yawRate = clamp((effSteer * car.speed) / 2.8, -yawMax, yawMax);
    car.heading += yawRate * dt;

    let a = 0;
    if (th > 0) {
      /* quadratic falloff toward MAX_SPEED stands in for aero drag */
      const sf = Math.max(car.speed, 0) / MAX_SPEED;
      a += 12 * th * (1 - sf * sf) * (0.8 + 0.2 * grip);
    } else if (th < 0) a += car.speed > 0.5 ? -15 * grip : -6.5 * (1 + car.speed / MAX_REV);
    a -= car.speed * 0.11;
    a -= off * (2.5 + Math.abs(car.speed) * 0.45) * Math.sign(car.speed || 0);
    if (braking) a -= Math.sign(car.speed) * 18 * grip * Math.min(1, Math.abs(car.speed));
    car.speed = clamp(car.speed + a * dt, -MAX_REV, MAX_SPEED);
    if (Math.abs(car.speed) < 0.02 && th === 0) car.speed = 0;

    /* direction of travel lags the heading when grip is low -> gentle slides */
    if (car.velDir === 0) car.velDir = car.heading;
    const follow = grip * (2.2 + Math.abs(car.speed) * 0.24);
    car.velDir += wrapAngle(car.heading - car.velDir) * Math.min(1, dt * follow);
    const mvx = Math.sin(car.velDir),
      mvz = Math.cos(car.velDir);
    car.x += mvx * car.speed * dt;
    car.z += mvz * car.speed * dt;

    const fx = Math.sin(car.heading),
      fz = Math.cos(car.heading);

    /* Ride height from the four wheel contact patches, body stays planted.
       driveHeight, not sampleGround: the ground under the carriageway is the
       bed the tarmac is laid into and sits ROADBED_DROP below the surface the
       wheels are on. It also carries the tarmac's own 6 mm-scale offset, and
       tapers across the road edge, so a wheel half off the shoulder no longer
       steps between two surfaces the way a boolean on-road test made it. */
    const gFL = terrain.driveHeight(car.x + fx * 1.45 - fz * 0.86, car.z + fz * 1.45 + fx * 0.86);
    const gFR = terrain.driveHeight(car.x + fx * 1.45 + fz * 0.86, car.z + fz * 1.45 - fx * 0.86);
    const gRL = terrain.driveHeight(car.x - fx * 1.45 - fz * 0.86, car.z - fz * 1.45 + fx * 0.86);
    const gRR = terrain.driveHeight(car.x - fx * 1.45 + fz * 0.86, car.z - fz * 1.45 - fx * 0.86);
    const gF2 = (gFL + gFR) * 0.5,
      gR2 = (gRL + gRR) * 0.5;
    let targetY = (gFL + gFR + gRL + gRR) * 0.25;
    const tPitch = Math.atan2(gR2 - gF2, 2.9);
    const tRoll = Math.atan2((gFR + gRR) * 0.5 - (gFL + gRL) * 0.5, 1.72);
    targetY += (Math.random() - 0.5) * off * Math.min(Math.abs(car.speed) / 18, 1) * 0.02;

    /* near-critically-damped springs: composed over crests, no float */
    car.yv += ((targetY - car.y) * 70 - car.yv * 12.5) * dt;
    car.pitchV += ((tPitch - car.pitch) * 80 - car.pitchV * 12) * dt;
    car.rollV += ((tRoll - car.roll) * 80 - car.rollV * 12) * dt;
    car.y += car.yv * dt;
    car.pitch = clamp(car.pitch + car.pitchV * dt, -0.3, 0.3);
    car.roll = clamp(car.roll + car.rollV * dt, -0.3, 0.3);
    /* hard clamp catches the case the spring can't: a step in the heightfield
       big enough that the body would visibly sink through it */
    if (Math.abs(car.y - targetY) > 0.22) {
      car.y = targetY + Math.sign(car.y - targetY) * 0.22;
      car.yv = 0;
    }

    group.position.set(car.x, car.y, car.z);
    group.rotation.y = car.heading;
    tilt.rotation.x = car.pitch;
    tilt.rotation.z = car.roll;

    if (sportsCarLoaded) {
      proceduralGroup.visible = false;
      sportsWheelSpin += (car.speed * dt) / 0.35;

      const qSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), sportsWheelSpin);
      const qSteer = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), effSteer * 0.85);

      if (carWheelFL) {
        carWheelFL.quaternion.copy(baseWheelQuatFL).multiply(qSteer).multiply(qSpin);
      }
      if (carWheelFR) {
        carWheelFR.quaternion.copy(baseWheelQuatFR).multiply(qSteer).multiply(qSpin);
      }
      if (carWheelRL) {
        carWheelRL.quaternion.copy(baseWheelQuatRL).multiply(qSpin);
      }
      if (carWheelRR) {
        carWheelRR.quaternion.copy(baseWheelQuatRR).multiply(qSpin);
      }

      if (carSteeringWheel) {
        const qSteerWheel = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -effSteer * 2.2);
        carSteeringWheel.quaternion.copy(baseSteeringQuat).multiply(qSteerWheel);
      }

      if (carGlassMesh) {
        carGlassMesh.visible = state.camMode !== 2;
      }
    } else {
      proceduralGroup.visible = true;
      for (const w of wheels) {
        w.mesh.rotation.x += (car.speed / 0.34) * dt;
        if (w.front) w.pivot.rotation.y = effSteer * 0.85;
      }
      extGlassMesh.visible = state.camMode !== 2;
      hullMesh.visible = state.camMode !== 2;
    }

    /* headlight uniforms follow the car */
    U.uHLPos.value.set(car.x + fx * 2.0, car.y + 0.8, car.z + fz * 2.0);
    U.uHLDir.value.set(fx, -0.09, fz).normalize();

    // RPM & Gear calculation for cockpit cluster
    const sp = Math.abs(car.speed);
    let gear = 0;
    while (gear < GEAR_TOPS.length - 1 && sp > GEAR_TOPS[gear]) gear++;
    const lo = gear === 0 ? 0 : GEAR_TOPS[gear - 1];
    const rpm = 1050 + clamp((sp - lo) / (GEAR_TOPS[gear] - lo), 0, 1) * 5300;

    cockpit.update(car, rpm, gear, env, state, wallT);
    windshield.update(dt, wallT, car.speed, wx, env);
  }

  return {
    car,
    group,
    tilt,
    cockpit,
    windshield,
    hlSpots,
    glowSprites,
    headMat,
    tailMat,
    spawn,
    reset,
    update,
    dispose() {
      cockpit.dispose();
      windshield.dispose();
      dracoLoader.dispose();
      for (const g of ownedGeo) g.dispose();
      glowTex.dispose();
      bodyMat.dispose();
      glassMat.dispose();
      darkMat.dispose();
      alloyMat.dispose();
      headMat.dispose();
      tailMat.dispose();
      for (const s of glowSprites) (s.material as THREE.SpriteMaterial).dispose();
    },
  };
}

export type Car = ReturnType<typeof createCar>;
