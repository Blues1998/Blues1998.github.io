import * as THREE from "three";
import { RAIN_N, RAIN_VEL, SNOW_N } from "./config";
import { TAU } from "./math";
import type { WanderState, WeatherState } from "./types";

/*
 * Rain and snow.
 *
 * Both are a fixed particle box that rides the camera rather than a world
 * simulation: particles are stored as offsets from the camera, recycled when
 * they fall out the bottom, and never exist anywhere the camera isn't. At
 * 70 m across, that is indistinguishable from real weather and costs two
 * fixed buffers.
 *
 * Rain is LineSegments (a streak reads as speed; a point does not), snow is
 * Points with a soft sprite and a lateral drift.
 */
export function createPrecipitation(state: WanderState, wx: WeatherState, camera: THREE.Camera, scene: THREE.Scene) {
  const rainPos = new Float32Array(RAIN_N * 3);
  const rainGeo = new THREE.BufferGeometry();
  const rainArr = new Float32Array(RAIN_N * 2 * 3);
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainArr, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0, fog: true });
  const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
  rainMesh.frustumCulled = false;
  scene.add(rainMesh);
  for (let i = 0; i < RAIN_N; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 70;
    rainPos[i * 3 + 1] = Math.random() * 40;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }

  const snowPos = new Float32Array(SNOW_N * 3);
  const snowSeed = new Float32Array(SNOW_N);
  const snowGeo = new THREE.BufferGeometry();
  const snowArr = new Float32Array(SNOW_N * 3);
  snowGeo.setAttribute("position", new THREE.BufferAttribute(snowArr, 3));
  const snowTex = (() => {
    const cnv = document.createElement("canvas");
    cnv.width = cnv.height = 32;
    const ctx = cnv.getContext("2d")!;
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 15);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.6, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(cnv);
  })();
  const snowMat = new THREE.PointsMaterial({
    size: 0.22,
    map: snowTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
    color: 0xffffff,
    sizeAttenuation: true,
  });
  const snowMesh = new THREE.Points(snowGeo, snowMat);
  snowMesh.frustumCulled = false;
  scene.add(snowMesh);
  for (let i = 0; i < SNOW_N; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 64;
    snowPos[i * 3 + 1] = Math.random() * 30;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 64;
    snowSeed[i] = Math.random() * TAU;
  }

  function update(dt: number) {
    const rI = wx.rain * (wx.snowMode ? 0 : 1);
    const sI = wx.rain * (wx.snowMode ? 1 : 0);
    rainMat.opacity += (rI * 0.32 - rainMat.opacity) * Math.min(1, dt * 2);
    snowMat.opacity += (sI * 0.85 - snowMat.opacity) * Math.min(1, dt * 2);
    const cx = camera.position.x,
      cy = camera.position.y,
      cz = camera.position.z;
    /* skip the whole integration when invisible: dry weather is the common
       case and this is 1800 particles of work */
    if (rainMat.opacity > 0.01) {
      const wind = 4;
      for (let i = 0; i < RAIN_N; i++) {
        let y = rainPos[i * 3 + 1] - RAIN_VEL * dt;
        let x = rainPos[i * 3] + wind * dt;
        if (y < -14) {
          y += 40 + Math.random() * 8;
          x = (Math.random() - 0.5) * 70;
          rainPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
        }
        if (x > 35) x -= 70;
        rainPos[i * 3] = x;
        rainPos[i * 3 + 1] = y;
        const o = i * 6;
        rainArr[o] = cx + x;
        rainArr[o + 1] = cy + y;
        rainArr[o + 2] = cz + rainPos[i * 3 + 2];
        rainArr[o + 3] = cx + x - 0.16;
        rainArr[o + 4] = cy + y + 1.5;
        rainArr[o + 5] = cz + rainPos[i * 3 + 2];
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    rainMesh.visible = rainMat.opacity > 0.01;
    if (snowMat.opacity > 0.01) {
      const t = state.simT;
      for (let i = 0; i < SNOW_N; i++) {
        let y = snowPos[i * 3 + 1] - (1.5 + Math.sin(snowSeed[i]) * 0.4) * dt;
        if (y < -10) {
          y += 30 + Math.random() * 6;
          snowPos[i * 3] = (Math.random() - 0.5) * 64;
          snowPos[i * 3 + 2] = (Math.random() - 0.5) * 64;
        }
        snowPos[i * 3 + 1] = y;
        /* two out-of-phase sinusoids per flake: enough to look like it is
           being carried rather than dropped */
        snowArr[i * 3] = cx + snowPos[i * 3] + Math.sin(t * 0.7 + snowSeed[i]) * 1.6;
        snowArr[i * 3 + 1] = cy + y;
        snowArr[i * 3 + 2] = cz + snowPos[i * 3 + 2] + Math.cos(t * 0.55 + snowSeed[i] * 1.7) * 1.4;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    snowMesh.visible = snowMat.opacity > 0.01;
  }

  return {
    update,
    dispose() {
      rainGeo.dispose();
      rainMat.dispose();
      snowGeo.dispose();
      snowMat.dispose();
      snowTex.dispose();
    },
  };
}

export type Precipitation = ReturnType<typeof createPrecipitation>;
