import * as THREE from "three";
import { clamp } from "./math";
import type { CarState, EnvState, WanderState } from "./types";

/*
 * Cockpit interior system.
 *
 * Attached to the car's `tilt` group so every interior element naturally
 * inherits the chassis's pitch, roll, and suspension heave.
 *
 * Features:
 *   - Contoured matte leather/vinyl dashboard with instrument cowl.
 *   - Left and right A-pillars + header rail framing the road view.
 *   - Steering wheel that rotates dynamically with steering input.
 *   - Center console with air vents and radio dial.
 *   - Rearview mirror mounted to the windshield header.
 *   - High-fidelity canvas-backed instrument cluster:
 *       * Speedometer (0 - 260 km/h) with illuminated needle.
 *       * Tachometer (0 - 9000 RPM) with redline and needle.
 *       * Digital gear indicator ("D1"..."D8", "R", "N").
 *       * Backlit glow (amber luminescence) that lights up at night/dusk.
 */

export function createCockpit(tiltGroup: THREE.Group, bodyMat?: THREE.Material) {
  const cockpitGroup = new THREE.Group();
  tiltGroup.add(cockpitGroup);

  const ownedGeo: THREE.BufferGeometry[] = [];
  const ownedMat: THREE.Material[] = [];

  const box = (w: number, h: number, d: number) => {
    const g = new THREE.BoxGeometry(w, h, d);
    ownedGeo.push(g);
    return g;
  };

  const regMat = <T extends THREE.Material>(m: T): T => {
    ownedMat.push(m);
    return m;
  };

  /* Materials */
  const dashMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.82,
      metalness: 0.12,
    })
  );

  const trimMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.65,
      metalness: 0.45,
    })
  );

  const alloyMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.28,
      metalness: 0.9,
    })
  );

  const mirrorGlassMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x253342,
      roughness: 0.1,
      metalness: 0.95,
    })
  );

  const proceduralCockpitGroup = new THREE.Group();
  cockpitGroup.add(proceduralCockpitGroup);

  /* Helper to add box meshes */
  const addBox = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(box(w, h, d), mat);
    m.position.set(x, y, z);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    proceduralCockpitGroup.add(m);
    return m;
  };

  /* ---- 1. Dashboard Structure ---- */
  // Soft cabin ambient light for interior materials (remains on in all modes)
  const cabinLight = new THREE.PointLight(0xffeedd, 1.6, 3.8);
  cabinLight.position.set(-0.2, 1.1, 0.2);
  cockpitGroup.add(cabinLight);

  // Exterior front hood visible forward through windshield
  if (bodyMat) {
    addBox(1.72, 0.08, 1.35, bodyMat, 0, 0.68, 1.62, 0.16, 0, 0);
  }

  // Main dash top shelf spanning windshield base
  addBox(1.62, 0.08, 0.72, dashMat, 0, 0.82, 0.58, -0.12, 0, 0);

  // Dash front face sloping down toward driver
  addBox(1.58, 0.32, 0.12, dashMat, 0, 0.64, 0.3, 0.18, 0, 0);

  // Driver instrument cowl arched OVER the gauges at z = 0.46
  addBox(0.48, 0.06, 0.24, dashMat, -0.36, 0.95, 0.46, -0.15, 0, 0);
  addBox(0.04, 0.16, 0.22, dashMat, -0.60, 0.88, 0.46, -0.15, 0, 0);
  addBox(0.04, 0.16, 0.22, dashMat, -0.12, 0.88, 0.46, -0.15, 0, 0);

  // Passenger dash airbag tier
  addBox(0.68, 0.08, 0.32, trimMat, 0.36, 0.84, 0.44, -0.1, 0, 0);

  // Center console extending back between driver & passenger
  addBox(0.32, 0.48, 0.85, dashMat, 0, 0.42, 0.02, 0.15, 0, 0);
  addBox(0.24, 0.03, 0.75, trimMat, 0, 0.58, 0.05, 0.15, 0, 0);

  // Center AC vents
  addBox(0.22, 0.06, 0.04, trimMat, 0, 0.75, 0.33, 0.15, 0, 0);

  // Radio / climate unit with glowing accents
  const radioFaceMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x0e1116,
      emissive: 0x1a3328,
      emissiveIntensity: 0.5,
      roughness: 0.5,
    })
  );
  addBox(0.2, 0.09, 0.03, radioFaceMat, 0, 0.66, 0.31, 0.15, 0, 0);

  /* ---- 2. Windshield Pillars & Header ---- */
  // Left A-pillar
  addBox(0.07, 0.62, 0.09, dashMat, -0.78, 1.05, 0.56, -0.68, 0.18, 0.28);
  // Right A-pillar
  addBox(0.07, 0.62, 0.09, dashMat, 0.78, 1.05, 0.56, -0.68, -0.18, -0.28);
  // Roof Header rail
  addBox(1.56, 0.09, 0.14, dashMat, 0, 1.28, 0.26, 0.2, 0, 0);

  // Rearview mirror
  addBox(0.03, 0.08, 0.03, trimMat, 0, 1.22, 0.32, -0.2, 0, 0);
  addBox(0.26, 0.07, 0.04, dashMat, 0, 1.18, 0.33, -0.15, 0.08, 0);
  addBox(0.24, 0.055, 0.01, mirrorGlassMat, 0, 1.18, 0.31, -0.15, 0.08, 0);

  /* ---- 3. Steering Wheel ---- */
  const steerPivot = new THREE.Group();
  steerPivot.position.set(-0.36, 0.78, 0.24);
  steerPivot.rotation.x = -0.28;
  proceduralCockpitGroup.add(steerPivot);

  // Steering column tucked behind hub
  const colGeo = new THREE.CylinderGeometry(0.038, 0.045, 0.12, 12);
  ownedGeo.push(colGeo);
  const column = new THREE.Mesh(colGeo, dashMat);
  column.rotation.x = Math.PI / 2;
  column.position.z = -0.04;
  steerPivot.add(column);

  // Wheel rim (diameter ~33cm)
  const rimGeo = new THREE.TorusGeometry(0.165, 0.018, 10, 24);
  ownedGeo.push(rimGeo);
  const rimMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a1d21,
      roughness: 0.75,
      metalness: 0.1,
    })
  );
  const wheelRim = new THREE.Mesh(rimGeo, rimMat);
  wheelRim.position.z = 0.0;
  steerPivot.add(wheelRim);

  // Center hub & spokes
  const hubGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.022, 16);
  hubGeo.rotateX(Math.PI / 2);
  ownedGeo.push(hubGeo);
  const hub = new THREE.Mesh(hubGeo, trimMat);
  hub.position.z = 0.0;
  steerPivot.add(hub);

  const spokeG = box(0.026, 0.13, 0.01);
  for (const ang of [-Math.PI / 2, Math.PI / 5, (4 * Math.PI) / 5]) {
    const sp = new THREE.Mesh(spokeG, alloyMat);
    sp.position.set(Math.cos(ang) * 0.08, Math.sin(ang) * 0.08, 0.0);
    sp.rotation.z = ang + Math.PI / 2;
    steerPivot.add(sp);
  }

  /* ---- 4. Backlit Canvas Gauges ---- */
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gaugeTexture = new THREE.CanvasTexture(canvas);
  gaugeTexture.generateMipmaps = true;

  const gaugeMat = regMat(
    new THREE.MeshBasicMaterial({
      map: gaugeTexture,
      transparent: true,
      side: THREE.DoubleSide,
    })
  );

  const gaugePlaneGeo = new THREE.PlaneGeometry(0.46, 0.24);
  gaugePlaneGeo.rotateY(Math.PI);
  ownedGeo.push(gaugePlaneGeo);
  const gaugeMesh = new THREE.Mesh(gaugePlaneGeo, gaugeMat);
  gaugeMesh.position.set(-0.36, 0.85, 0.46);
  gaugeMesh.rotation.set(-0.16, 0, 0);
  cockpitGroup.add(gaugeMesh);

  /* Gauge Drawing Routine */
  let lastSpeed = -1;
  let lastRpm = -1;
  let lastGear = -1;
  let lastNight = -1;
  let lastRenderT = 0;

  function drawGauges(speedKmh: number, rpm: number, gearStr: string, nightFactor: number) {
    ctx.clearRect(0, 0, 512, 256);

    // Instrument cluster background
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, 512, 256);

    // Subtle backplate bevels
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, 500, 244);

    // Colors: Amber retro luminescence at dusk/night, crisp white by day
    const amberColor = nightFactor > 0.4 ? "rgba(255, 140, 30, 0.95)" : "rgba(230, 240, 255, 0.9)";
    const needleColor = nightFactor > 0.4 ? "#ff4820" : "#ff3322";
    const dimColor = "rgba(255, 255, 255, 0.25)";

    /* ── Speedometer (Left Dial) ── */
    const sx = 145,
      sy = 128,
      sr = 90;
    const speedRatio = clamp(speedKmh / 260, 0, 1);
    const sStart = Math.PI * 0.75;
    const sEnd = Math.PI * 2.25;

    // Track arc
    ctx.beginPath();
    ctx.arc(sx, sy, sr, sStart, sEnd);
    ctx.strokeStyle = dimColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Active speed arc
    ctx.beginPath();
    ctx.arc(sx, sy, sr, sStart, sStart + speedRatio * (sEnd - sStart));
    ctx.strokeStyle = amberColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Speedometer ticks and labels
    for (let k = 0; k <= 260; k += 20) {
      const a = sStart + (k / 260) * (sEnd - sStart);
      const isMajor = k % 40 === 0;
      const r1 = isMajor ? sr - 14 : sr - 8;
      const r2 = sr - 2;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
      ctx.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
      ctx.strokeStyle = isMajor ? amberColor : dimColor;
      ctx.lineWidth = isMajor ? 3 : 1.5;
      ctx.stroke();

      if (isMajor) {
        const tr = sr - 25;
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.fillStyle = amberColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(k), sx + Math.cos(a) * tr, sy + Math.sin(a) * tr);
      }
    }

    // Speed needle
    const sAngle = sStart + speedRatio * (sEnd - sStart);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(sAngle) * (sr - 10), sy + Math.sin(sAngle) * (sr - 10));
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Speed needle cap
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#1e222b";
    ctx.fill();
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center speed text
    ctx.font = "bold 26px tabular-nums, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(String(Math.round(speedKmh)), sx, sy + 38);
    ctx.font = "9px sans-serif";
    ctx.fillStyle = dimColor;
    ctx.fillText("KM/H", sx, sy + 52);

    /* ── Tachometer (Right Dial) ── */
    const tx = 367,
      ty = 128,
      tr = 90;
    const rpmRatio = clamp(rpm / 9000, 0, 1);
    const tStart = Math.PI * 0.75;
    const tEnd = Math.PI * 2.25;

    // Tachometer track
    ctx.beginPath();
    ctx.arc(tx, ty, tr, tStart, tEnd);
    ctx.strokeStyle = dimColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Redline sector arc (6500 to 9000)
    const redlineStart = tStart + (6500 / 9000) * (tEnd - tStart);
    ctx.beginPath();
    ctx.arc(tx, ty, tr, redlineStart, tEnd);
    ctx.strokeStyle = "rgba(240, 50, 40, 0.75)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Tachometer ticks
    for (let k = 0; k <= 9; k++) {
      const a = tStart + (k / 9) * (tEnd - tStart);
      const isRed = k >= 7;
      const r1 = tr - 14;
      const r2 = tr - 2;
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(a) * r1, ty + Math.sin(a) * r1);
      ctx.lineTo(tx + Math.cos(a) * r2, ty + Math.sin(a) * r2);
      ctx.strokeStyle = isRed ? "#ff3322" : amberColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      const lr = tr - 24;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillStyle = isRed ? "#ff4433" : amberColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(k), tx + Math.cos(a) * lr, ty + Math.sin(a) * lr);
    }

    // Tachometer needle
    const tAngle = tStart + rpmRatio * (tEnd - tStart);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + Math.cos(tAngle) * (tr - 10), ty + Math.sin(tAngle) * (tr - 10));
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Tach needle cap
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#1e222b";
    ctx.fill();
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center Gear / RPM indicator
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = amberColor;
    ctx.textAlign = "center";
    ctx.fillText(gearStr, tx, ty + 38);
    ctx.font = "9px sans-serif";
    ctx.fillStyle = dimColor;
    ctx.fillText("RPM x1000", tx, ty + 52);

    // Center Divider Badge
    ctx.fillStyle = amberColor;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("WANDER GT", 256, 120);

    gaugeTexture.needsUpdate = true;
  }

  function update(car: CarState, rpm: number, gear: number, env: EnvState, state: WanderState, wallT: number) {
    // Rotate steering wheel smoothly
    steerPivot.rotation.z = -car.steer * 2.3;

    // Update gauge canvas throttled (~30 fps)
    if (wallT - lastRenderT > 0.033) {
      const spdKmh = Math.abs(car.speed) * 3.6;
      const gearStr = car.speed < -0.1 ? "R" : gear === 0 && Math.abs(car.speed) < 0.2 ? "N" : `D${gear + 1}`;
      const night = env.night;

      if (
        Math.abs(spdKmh - lastSpeed) > 0.8 ||
        Math.abs(rpm - lastRpm) > 40 ||
        gear !== lastGear ||
        Math.abs(night - lastNight) > 0.05
      ) {
        lastSpeed = spdKmh;
        lastRpm = rpm;
        lastGear = gear;
        lastNight = night;
        lastRenderT = wallT;
        drawGauges(spdKmh, rpm, gearStr, night);
      }
    }

    // Dynamic emissive intensity: brighter dials when it gets dark
    const targetEmissive = 0.45 + env.night * 0.75;
    gaugeMat.emissiveIntensity = targetEmissive;
  }

  function setSportsCarMode(active: boolean) {
    proceduralCockpitGroup.visible = !active;
    if (active) {
      gaugeMesh.position.set(0.346, 0.85, 0.94);
      gaugeMesh.scale.set(0.48, 0.48, 0.48);
      gaugeMesh.rotation.set(-0.22, 0, 0);
    } else {
      gaugeMesh.position.set(-0.36, 0.85, 0.46);
      gaugeMesh.scale.set(1.0, 1.0, 1.0);
      gaugeMesh.rotation.set(-0.16, 0, 0);
    }
  }

  // Draw initial blank cluster
  drawGauges(0, 1050, "N", 0);

  return {
    group: cockpitGroup,
    steerPivot,
    setSportsCarMode,
    update,
    dispose() {
      cockpitGroup.clear();
      for (const g of ownedGeo) g.dispose();
      for (const m of ownedMat) m.dispose();
      gaugeTexture.dispose();
    },
  };
}

export type Cockpit = ReturnType<typeof createCockpit>;
