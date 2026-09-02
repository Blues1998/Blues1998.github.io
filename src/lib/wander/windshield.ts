import * as THREE from "three";
import { clamp } from "./math";
import type { EnvState, WanderState, WeatherState } from "./types";

/*
 * Windshield & Functional Wipers System.
 *
 * Attached to the car's `tilt` group.
 * Features:
 *   - Angled glass pane fitted to the windshield opening.
 *   - Custom procedural GLSL rain shader:
 *       * Static water beads with specular glints that collect when stopped.
 *       * High-speed aerodynamic streaks dragging water up the glass at speed.
 *       * Wiper clearing mask: sectors cleared by wipers stay clean and
 *         gradually re-accumulate droplets based on rain rate.
 *   - Dual articulated wiper arms with smooth sinusoidal sweeping animation.
 *   - Automatic wiper activation during rain, plus manual override key (V).
 */

const WINDSHIELD_VS = `
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const WINDSHIELD_FS = `
uniform float uTime;
uniform float uRain;
uniform float uSpeed;
uniform float uWiperL;
uniform float uWiperR;
uniform float uWipeClear;
uniform vec3 uSunDir;
uniform float uNight;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

// High quality 2D hash
vec2 hash22(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.xx + p.yx) * p.xy);
}

void main() {
  if (uRain < 0.01) {
    // Pristine dry glass with faint atmospheric reflection
    gl_FragColor = vec4(0.08, 0.12, 0.16, 0.04);
    return;
  }

  // 1. Wiper clearing mask
  // Left wiper arc in UV: pivot at (0.28, -0.05)
  vec2 pL = vUv - vec2(0.28, -0.05);
  float distL = length(pL);
  float angL = atan(pL.y, pL.x);
  bool inLeftWipe = distL > 0.15 && distL < 0.95 && angL > 0.25 && angL < 2.85;

  // Right wiper arc in UV: pivot at (0.72, -0.05)
  vec2 pR = vUv - vec2(0.72, -0.05);
  float distR = length(pR);
  float angR = atan(pR.y, pR.x);
  bool inRightWipe = distR > 0.15 && distR < 0.95 && angR > 0.25 && angR < 2.85;

  float wipeMask = 1.0;
  if (inLeftWipe || inRightWipe) {
    // Wiped region stays clear and slowly re-accumulates droplets
    wipeMask = clamp(uWipeClear * (0.35 + uRain * 0.9), 0.02, 1.0);
  }

  // 2. Water droplets via multi-scale hash grid
  vec2 dropUv = vUv * vec2(38.0, 22.0);
  vec2 id = floor(dropUv);
  vec2 gv = fract(dropUv) - 0.5;

  vec2 rnd = hash22(id);
  float dropRadius = 0.12 + rnd.x * 0.22;
  vec2 dropCenter = (rnd - 0.5) * 0.45;

  // Speed-based streak stretch along airflow (upwards on windshield)
  float speedStretch = clamp(uSpeed / 20.0, 0.0, 3.5);
  gv.y += (rnd.y - 0.5) * 0.1;
  float d = length(vec2(gv.x - dropCenter.x, (gv.y - dropCenter.y) / (1.0 + speedStretch * 0.7)));

  float dropAlpha = 0.0;
  vec3 dropNormal = vec3(0.0, 0.0, 1.0);

  if (d < dropRadius && rnd.y < uRain) {
    // Normal inside the rounded droplet
    vec2 dN = (gv - dropCenter) / dropRadius;
    float zN = sqrt(max(0.0, 1.0 - dot(dN, dN)));
    dropNormal = normalize(vec3(dN * 1.5, zN));

    // Droplet edge ring + center refraction
    float edge = smoothstep(dropRadius, dropRadius - 0.04, d);
    dropAlpha = edge * (0.6 + 0.4 * zN);
  }

  // 3. High-speed wind stream lines (water trails streaking up the windshield)
  float streamStrength = clamp((uSpeed - 6.0) / 25.0, 0.0, 1.0) * uRain;
  if (streamStrength > 0.05) {
    vec2 streamUv = vUv * vec2(28.0, 3.0);
    streamUv.y -= uTime * (uSpeed * 0.08);
    vec2 sId = floor(streamUv);
    vec2 sGv = fract(streamUv) - 0.5;
    vec2 sRnd = hash22(sId);
    if (sRnd.x < 0.25) {
      float sWidth = 0.04 + sRnd.y * 0.04;
      if (abs(sGv.x) < sWidth) {
        float sAlpha = smoothstep(sWidth, 0.0, abs(sGv.x)) * streamStrength * 0.4;
        dropAlpha = max(dropAlpha, sAlpha);
      }
    }
  }

  dropAlpha *= wipeMask;

  // 4. Specular glint on droplets from sun/sky/ambient
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 worldDropNormal = normalize(vNormal + vec3(dropNormal.x, dropNormal.y, 0.0) * 0.5);
  vec3 halfV = normalize(uSunDir + viewDir);
  float spec = pow(max(dot(worldDropNormal, halfV), 0.0), 32.0) * (1.0 - uNight * 0.85);

  // Night dashboard / headlight glint
  float nightGlint = uNight * pow(max(dot(worldDropNormal, vec3(0.0, -0.2, 1.0)), 0.0), 12.0) * 0.4;

  vec3 dropColor = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.95, 0.8), spec) + spec * 1.5 + nightGlint;
  float totalAlpha = clamp(dropAlpha * (0.55 + 0.45 * uRain) + 0.03, 0.0, 0.85);

  gl_FragColor = vec4(dropColor, totalAlpha);
}
`;

export function createWindshield(tiltGroup: THREE.Group, state: WanderState) {
  const windshieldGroup = new THREE.Group();
  tiltGroup.add(windshieldGroup);

  const ownedGeo: THREE.BufferGeometry[] = [];
  const ownedMat: THREE.Material[] = [];

  /* Windshield glass geometry */
  // Positioned exactly along windshield profile slope
  const glassGeo = new THREE.PlaneGeometry(1.58, 0.78);
  ownedGeo.push(glassGeo);

  const glassUniforms = {
    uTime: { value: 0 },
    uRain: { value: 0 },
    uSpeed: { value: 0 },
    uWiperL: { value: 0 },
    uWiperR: { value: 0 },
    uWipeClear: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uNight: { value: 0 },
  };

  const glassMat = new THREE.ShaderMaterial({
    vertexShader: WINDSHIELD_VS,
    fragmentShader: WINDSHIELD_FS,
    uniforms: glassUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  ownedMat.push(glassMat);

  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  // Center of windshield aperture
  glassMesh.position.set(0, 1.075, 0.615);
  // Angle sloping back ~34 degrees
  glassMesh.rotation.set(-0.97, 0, 0);
  windshieldGroup.add(glassMesh);

  /* ---- Functional Wiper Blades ---- */
  const wiperMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.8,
    metalness: 0.2,
  });
  ownedMat.push(wiperMat);

  const armGeo = new THREE.BoxGeometry(0.016, 0.28, 0.012);
  const bladeGeo = new THREE.BoxGeometry(0.012, 0.44, 0.018);
  ownedGeo.push(armGeo, bladeGeo);

  // Left & Right wiper pivots
  const createWiper = (x: number) => {
    const pivot = new THREE.Group();
    // Tucked down against Ferrari base cowl
    pivot.position.set(x, 0.89, 1.04);
    pivot.rotation.set(-0.95, 0, 0);

    const arm = new THREE.Mesh(armGeo, wiperMat);
    arm.position.set(0, 0.14, 0.01);
    pivot.add(arm);

    const blade = new THREE.Mesh(bladeGeo, wiperMat);
    blade.position.set(0, 0.22, 0.016);
    pivot.add(blade);

    windshieldGroup.add(pivot);
    return pivot;
  };

  const wiperL = createWiper(-0.25);
  const wiperR = createWiper(0.28);

  /* Wiper Animation State */
  let wiperPhase = 0;
  let wiperAngle = 0;
  let timeSinceWipe = 0;
  let wiperAudioTrigger = false;

  function update(dt: number, wallT: number, carSpeed: number, wx: WeatherState, env: EnvState) {
    const rain = wx.rain;
    glassUniforms.uTime.value = wallT;
    glassUniforms.uRain.value = rain;
    glassUniforms.uSpeed.value = Math.abs(carSpeed);
    glassUniforms.uNight.value = env.night;

    // Determine whether wipers should run
    // wiperMode: 0: auto, 1: slow, 2: fast, 3: off
    const mode = state.wiperMode ?? 0;
    let shouldWipe = false;
    let wipeSpeed = 3.2;

    if (mode === 0) {
      // Auto: wipes when rain > 0.04
      if (rain > 0.04) {
        shouldWipe = true;
        wipeSpeed = 2.4 + rain * 2.8;
      }
    } else if (mode === 1) {
      shouldWipe = true;
      wipeSpeed = 2.6;
    } else if (mode === 2) {
      shouldWipe = true;
      wipeSpeed = 5.2;
    }

    if (shouldWipe) {
      wiperPhase += dt * wipeSpeed;
      // Smooth sinusoidal arc from 0 to ~1.45 rad (~83 deg)
      const rawOsc = 0.5 - 0.5 * Math.cos(wiperPhase);
      wiperAngle = rawOsc * 1.42;

      // When wiper crosses center or extremes, reset clear timer
      if (rawOsc > 0.85 || rawOsc < 0.15) {
        timeSinceWipe = 0;
      } else {
        timeSinceWipe += dt;
      }

      // Check audio cue near blade reversal
      const prevPhase = wiperPhase - dt * wipeSpeed;
      if (Math.floor(wiperPhase / Math.PI) !== Math.floor(prevPhase / Math.PI)) {
        wiperAudioTrigger = true;
      }
    } else {
      // Return to rest position
      if (wiperAngle > 0.01) {
        wiperAngle = Math.max(0, wiperAngle - dt * 2.5);
      }
      timeSinceWipe += dt;
    }

    // Apply rotation to wiper arms
    // Rest angle is parked along base (~ -1.54 rad horizontal)
    const parkOffset = -1.54;
    wiperL.rotation.z = parkOffset + wiperAngle;
    wiperR.rotation.z = parkOffset + wiperAngle * 0.98;

    glassUniforms.uWiperL.value = wiperAngle;
    glassUniforms.uWiperR.value = wiperAngle;
    glassUniforms.uWipeClear.value = timeSinceWipe;
  }

  function popWiperAudioCue(): boolean {
    if (wiperAudioTrigger) {
      wiperAudioTrigger = false;
      return true;
    }
    return false;
  }

  return {
    group: windshieldGroup,
    glassMesh,
    update,
    popWiperAudioCue,
    dispose() {
      windshieldGroup.clear();
      for (const g of ownedGeo) g.dispose();
      for (const m of ownedMat) m.dispose();
    },
  };
}

export type Windshield = ReturnType<typeof createWindshield>;
