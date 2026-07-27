import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/*
 * "Wander" — a procedural, endless scenic drive.
 * Ported from a standalone prototype (three.js + custom GLSL) into a managed
 * React effect. The simulation (road/terrain/vegetation generation, car
 * physics, day/night + season + weather cycle, WebAudio engine synthesis) is
 * kept intact; only the integration seams changed — module imports, DOM
 * scoping, mount/cleanup — to fit this component's lifecycle.
 */

// ============================== utils ==============================
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2i(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + s) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/* 2D simplex noise (Gustavson's public-domain construction) */
function makeSimplex(seed: number) {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const G = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
  const F2 = 0.3660254037844386,
    G2 = 0.21132486540518713;
  return function (x: number, y: number) {
    const s = (x + y) * F2;
    const i = Math.floor(x + s),
      j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - i + t,
      y0 = y - j + t;
    const i1 = x0 > y0 ? 1 : 0,
      j1 = 1 - i1;
    const x1 = x0 - i1 + G2,
      y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2,
      y2 = y0 - 1 + 2 * G2;
    const ii = i & 255,
      jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const g = (perm[ii + perm[jj]] & 7) * 2;
      n += t0 * t0 * (G[g] * x0 + G[g + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const g = (perm[ii + i1 + perm[jj + j1]] & 7) * 2;
      n += t1 * t1 * (G[g] * x1 + G[g + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const g = (perm[ii + 1 + perm[jj + 1]] & 7) * 2;
      n += t2 * t2 * (G[g] * x2 + G[g + 1] * y2);
    }
    return 70 * n;
  };
}
function fbm(n: (x: number, y: number) => number, x: number, y: number, oct: number, lac = 2, gain = 0.5) {
  let a = 1,
    f = 1,
    s = 0,
    norm = 0;
  for (let o = 0; o < oct; o++) {
    s += a * n(x * f, y * f);
    norm += a;
    a *= gain;
    f *= lac;
  }
  return s / norm;
}

const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x),
             mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}
float fbm2(vec2 p){ return (vnoise(p) * .5 + vnoise(p * 2.03) * .25 + vnoise(p * 4.09) * .125) / .875; }
`;

const GLSL_COMMON =
  `
uniform vec3 uSunDir, uSunColor, uHemiSky, uHemiGround, uFogColor;
uniform float uFogDensity, uSnow, uWet, uTime, uHL;
uniform vec3 uHLPos, uHLDir, uCamPos;
uniform vec3 uGrass, uGrassAlt;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat;
uniform float uShadowOn;
` +
  GLSL_NOISE +
  `
/* matches three.js packDepthToRGBA/unpackRGBAToDepth factors exactly */
float unpackShadowDepth(vec4 v){ return dot(v, vec4(0.99609375/16777216.0, 0.99609375/65536.0, 0.99609375/256.0, 0.99609375)); }
float shadowCmp(vec2 uv, float compare){ return step(compare, unpackShadowDepth(texture2D(uShadowMap, uv))); }
float sunShadow(vec3 P, vec3 n){
  if (uShadowOn < 0.01) return 1.0;
  vec4 sc4 = uShadowMat * vec4(P + n * 0.15, 1.0);
  vec3 sc = sc4.xyz / sc4.w;
  float edge = smoothstep(0.0, 0.06, sc.x) * smoothstep(1.0, 0.94, sc.x)
             * smoothstep(0.0, 0.06, sc.y) * smoothstep(1.0, 0.94, sc.y);
  if (edge <= 0.001 || sc.z > 1.0) return 1.0;
  float compare = sc.z - (0.0004 + 0.0006 * (1.0 - max(dot(n, uSunDir), 0.0)));
  /* same bilinear PCF kernel three uses for PCFSoftShadowMap */
  const float SM = 2048.0;
  vec2 texelSize = vec2(1.0 / SM);
  float dx = texelSize.x, dy = texelSize.y;
  vec2 uv = sc.xy;
  vec2 f = fract(uv * SM + 0.5);
  uv -= f * texelSize;
  float sh = (
    shadowCmp(uv, compare) +
    shadowCmp(uv + vec2(dx, 0.0), compare) +
    shadowCmp(uv + vec2(0.0, dy), compare) +
    shadowCmp(uv + texelSize, compare) +
    mix(shadowCmp(uv + vec2(-dx, 0.0), compare), shadowCmp(uv + vec2(2.0 * dx, 0.0), compare), f.x) +
    mix(shadowCmp(uv + vec2(-dx, dy), compare), shadowCmp(uv + vec2(2.0 * dx, dy), compare), f.x) +
    mix(shadowCmp(uv + vec2(0.0, -dy), compare), shadowCmp(uv + vec2(0.0, 2.0 * dy), compare), f.y) +
    mix(shadowCmp(uv + vec2(dx, -dy), compare), shadowCmp(uv + vec2(dx, 2.0 * dy), compare), f.y) +
    mix(mix(shadowCmp(uv + vec2(-dx, -dy), compare), shadowCmp(uv + vec2(2.0 * dx, -dy), compare), f.x),
        mix(shadowCmp(uv + vec2(-dx, 2.0 * dy), compare), shadowCmp(uv + vec2(2.0 * dx, 2.0 * dy), compare), f.x), f.y)
  ) * (1.0 / 9.0);
  return mix(1.0, sh, edge * uShadowOn);
}
vec3 doLight(vec3 alb, vec3 n, vec3 P, float sh){
  float dif = max(dot(n, uSunDir), 0.0);
  vec3 col = alb * (uSunColor * dif * sh + mix(uHemiGround, uHemiSky, n.y * .5 + .5));
  if (uHL > 0.001) {
    vec3 L = P - uHLPos;
    float d = length(L);
    vec3 Ln = L / max(d, 0.001);
    float spot = smoothstep(0.70, 0.96, dot(Ln, uHLDir));
    float att = uHL * spot * 26.0 / (1.0 + 0.022 * d * d) * max(dot(n, -Ln), 0.0);
    col += alb * vec3(1.0, 0.90, 0.68) * att;
  }
  return col;
}
vec3 doFog(vec3 col, vec3 P){
  float d = distance(P, uCamPos);
  float f = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  return mix(col, uFogColor, f);
}
`;

export default function EndlessDrive() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    const timers: number[] = [];
    const setT = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!disposed) fn();
      }, ms);
      timers.push(id);
      return id;
    };
    const q = <T extends Element>(sel: string) => container.querySelector(sel) as T;

    // ============================== state ==============================
    const urlParams = new URLSearchParams(window.location.search);
    const SEED = (urlParams.get("seed") ? +urlParams.get("seed")! : Math.random() * 1e9) | 0;
    const nRoad = makeSimplex(SEED ^ 0x9e3779b9);
    const nElev = makeSimplex(SEED ^ 0x85ebca6b);
    const nTer = makeSimplex(SEED ^ 0xc2b2ae35);
    const nVeg = makeSimplex((SEED + 1013904223) | 0);

    const state = {
      started: false,
      tod: 0.36,
      phase: 0.85,
      timeScale: 1,
      seasonMode: "auto" as "auto" | "manual",
      seasonTarget: 0,
      weatherMode: "auto",
      camMode: 2,
      quality: 1,
      muted: false,
      vol: 0.8,
      auto: true,
      simT: 0,
    };
    const QUAL = [
      { radius: 4, fog: 0.00225, prCap: 1.25 },
      { radius: 5, fog: 0.00165, prCap: 1.5 },
      { radius: 6, fog: 0.00125, prCap: 2.0 },
    ];
    const DAY_LEN = 600; // seconds per full day at 1x
    const SEASON_LEN = 260; // seconds per season at 1x

    // ============================ renderer =============================
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    let renderScale = 1;
    function applySize() {
      const pr = Math.min(window.devicePixelRatio || 1, QUAL[state.quality].prCap) * renderScale;
      renderer.setPixelRatio(pr);
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      composer.setPixelRatio(pr);
      composer.setSize(window.innerWidth, window.innerHeight);
    }
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xc8d6e8, 0.0016);
    const camera = new THREE.PerspectiveCamera(63, window.innerWidth / window.innerHeight, 0.3, 7000);
    camera.position.set(0, 8, -20);
    const onResize = () => applySize();
    window.addEventListener("resize", onResize);

    /* built-in lights (for car / posts which use standard materials) */
    const sunLight = new THREE.DirectionalLight(0xffffff, 3);
    scene.add(sunLight);
    scene.add(sunLight.target);
    const hemiLight = new THREE.HemisphereLight(0xbfd6f0, 0x4e5a45, 0.9);
    scene.add(hemiLight);

    /* sun shadows: one tight cascade that follows the car */
    const SHADOW_EXT = 60,
      SHADOW_DIST = 260;
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(sunLight.shadow.camera, { left: -SHADOW_EXT, right: SHADOW_EXT, top: SHADOW_EXT, bottom: -SHADOW_EXT, near: 150, far: 380 });
    sunLight.shadow.camera.updateProjectionMatrix();

    /* post-processing chain: scene -> bloom -> tone map/sRGB output */
    const composer = new EffectComposer(renderer);
    composer.renderTarget1.samples = 4;
    composer.renderTarget2.samples = 4;
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.5, 0.88);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    // ======================= shared shader uniforms ====================
    const U = {
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color(1, 1, 1) },
      uHemiSky: { value: new THREE.Color(0.5, 0.6, 0.75) },
      uHemiGround: { value: new THREE.Color(0.25, 0.25, 0.2) },
      uFogColor: { value: new THREE.Color(0.78, 0.84, 0.91) },
      uFogDensity: { value: 0.0016 },
      uSnow: { value: 0 },
      uWet: { value: 0 },
      uTime: { value: 0 },
      uHL: { value: 0 },
      uHLPos: { value: new THREE.Vector3() },
      uHLDir: { value: new THREE.Vector3(0, 0, 1) },
      uGrass: { value: new THREE.Color(0x74b054) },
      uGrassAlt: { value: new THREE.Color(0x5f9a49) },
      uCamPos: { value: new THREE.Vector3() },
      uShadowMap: { value: null as THREE.Texture | null },
      uShadowMat: { value: sunLight.shadow.matrix },
      uShadowOn: { value: 0 },
      uGrassGrow: { value: 1 },
      uBloom: { value: 1 },
    };

    // ============================== sky =================================
    const skyUniforms = {
      uSunDir: U.uSunDir,
      uTime: U.uTime,
      uZenith: { value: new THREE.Color(0.2, 0.4, 0.7) },
      uHorizon: { value: new THREE.Color(0.75, 0.83, 0.92) },
      uCloud: { value: 0.3 },
      uCloudCol: { value: new THREE.Color(1, 1, 1) },
      uNight: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
    varying vec3 vDir;
    void main(){
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
      fragmentShader:
        `
    varying vec3 vDir;
    uniform vec3 uSunDir, uZenith, uHorizon, uCloudCol, uMoonDir;
    uniform float uCloud, uNight, uTime;
    ` +
        GLSL_NOISE +
        `
    float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    void main(){
      vec3 d = normalize(vDir);
      vec3 col = mix(uHorizon, uZenith, pow(clamp(d.y, 0.0, 1.0), 0.62));
      float sd = clamp(dot(d, uSunDir), 0.0, 1.0);
      col += vec3(1.0, 0.86, 0.62) * pow(sd, 800.0) * 9.0;
      col += vec3(1.0, 0.66, 0.4) * pow(sd, 8.0) * 0.28 * (1.0 - uNight * 0.85);
      float md = clamp(dot(d, uMoonDir), 0.0, 1.0);
      col += vec3(0.9, 0.94, 1.0) * pow(md, 2200.0) * 2.4 * uNight;
      col += vec3(0.55, 0.65, 0.9) * pow(md, 18.0) * 0.06 * uNight;
      if (uNight > 0.01 && d.y > 0.0) {
        vec3 sp = floor(d * 220.0);
        float s = hash13(sp);
        if (s > 0.9965) {
          float tw = 0.65 + 0.35 * sin(uTime * 2.7 + s * 91.0);
          col += vec3(tw) * uNight * smoothstep(0.9965, 0.9995, s) * 1.15 * smoothstep(0.0, 0.18, d.y);
        }
      }
      /* moonlit horizon lift, keeps terrain readable at night */
      col += vec3(0.055, 0.075, 0.12) * pow(1.0 - clamp(d.y, 0.0, 1.0), 5.0) * uNight;
      if (d.y > 0.015) {
        vec2 cp = d.xz / (d.y + 0.14) * 1.5 + vec2(uTime * 0.006, uTime * 0.0023);
        float n = fbm2(cp);
        float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.3, n);
        float fade = smoothstep(0.015, 0.14, d.y);
        col = mix(col, uCloudCol * (0.75 + 0.25 * n), cov * fade * 0.92);
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    });
    const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), skyMat);
    skyMesh.frustumCulled = false;
    skyMesh.renderOrder = -10;
    scene.add(skyMesh);

    // ============================== road =================================
    const DS = 4; // meters between road samples
    const ROAD_HALF = 5.5; // half-width of paved surface
    const CELL = 32; // spatial hash cell size

    type RoadPt = { x: number; y: number; z: number; dx: number; dz: number; k: number };
    const road = { pts: [] as RoadPt[], hash: new Map<number, number[]>(), heading: 0, x: 0, z: 0 };
    const cellKey = (cx: number, cz: number) => (cx + 32768) * 65536 + (cz + 32768);

    function roadElev(s: number) {
      return nElev(s * 0.00042, 3.7) * 46 + nElev(s * 0.0019, 8.9) * 13 + nElev(s * 0.0085, 1.3) * 1.4;
    }

    function extendRoadTo(sMax: number) {
      while (road.pts.length * DS < sMax) {
        const i = road.pts.length;
        const s = i * DS;
        const raw = clamp(fbm(nRoad, s * 0.00085, 0, 2) * 1.7, -1, 1);
        const k = (raw * raw * raw) / 85; // cubing biases toward straights; min radius 85 m
        road.heading += k * DS;
        const dx = Math.sin(road.heading),
          dz = Math.cos(road.heading);
        if (i > 0) {
          road.x += dx * DS;
          road.z += dz * DS;
        }
        const pt: RoadPt = { x: road.x, y: roadElev(s), z: road.z, dx, dz, k: Math.abs(k) };
        road.pts.push(pt);
        const cx = Math.floor(pt.x / CELL),
          cz = Math.floor(pt.z / CELL);
        const key = cellKey(cx, cz);
        let arr = road.hash.get(key);
        if (!arr) {
          arr = [];
          road.hash.set(key, arr);
        }
        arr.push(i);
      }
    }

    /* nearest point on road within ~96 m; returns null if none */
    function queryRoad(x: number, z: number) {
      const cx = Math.floor(x / CELL),
        cz = Math.floor(z / CELL);
      let best = -1,
        bd = 1e18;
      for (let ix = -3; ix <= 3; ix++)
        for (let iz = -3; iz <= 3; iz++) {
          const arr = road.hash.get(cellKey(cx + ix, cz + iz));
          if (!arr) continue;
          for (let a = 0; a < arr.length; a++) {
            const p = road.pts[arr[a]];
            const ddx = p.x - x,
              ddz = p.z - z;
            const d2 = ddx * ddx + ddz * ddz;
            if (d2 < bd) {
              bd = d2;
              best = arr[a];
            }
          }
        }
      if (best < 0) return null;
      const pts = road.pts;
      const p = pts[best];
      let px = p.x,
        py = p.y,
        pz = p.z,
        tx = p.dx,
        tz = p.dz,
        sB = best * DS,
        bestD2 = bd;
      for (let i = best - 1; i <= best; i++) {
        if (i < 0 || i + 1 >= pts.length) continue;
        const a = pts[i],
          b = pts[i + 1];
        const abx = b.x - a.x,
          abz = b.z - a.z;
        const t = clamp(((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz), 0, 1);
        const qx = a.x + abx * t,
          qz = a.z + abz * t;
        const ddx = qx - x,
          ddz = qz - z;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < bestD2) {
          bestD2 = d2;
          px = qx;
          pz = qz;
          py = a.y + (b.y - a.y) * t;
          tx = a.dx + (b.dx - a.dx) * t;
          tz = a.dz + (b.dz - a.dz) * t;
          sB = (i + t) * DS;
        }
      }
      return { d: Math.sqrt(bestD2), x: px, y: py, z: pz, tx, tz, idx: best, s: sB };
    }

    /* ------------------------- road surface mesh ----------------------- */
    const roadMat = new THREE.ShaderMaterial({
      uniforms: U,
      fog: false,
      vertexShader: `
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      vUv = uv; vN = normal; vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
      fragmentShader:
        GLSL_COMMON +
        `
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      float u = vUv.x;
      vec3 alb = vec3(0.082, 0.085, 0.092);
      float n = vnoise(vec2(u * 42.0, vUv.y * 2.1));
      alb *= 0.88 + 0.24 * n;
      alb *= 1.0 - 0.16 * exp(-pow((abs(u) - 0.45) * 5.5, 2.0));
      float edge = 1.0 - smoothstep(0.018, 0.034, abs(abs(u) - 0.86));
      float dash = (1.0 - smoothstep(0.014, 0.03, abs(u))) * step(fract(vUv.y * 0.125), 0.5);
      float wear = 0.55 + 0.45 * vnoise(vec2(vUv.y * 0.9, u * 3.0));
      alb = mix(alb, vec3(0.8, 0.8, 0.78), max(edge, dash) * 0.85 * wear);
      alb *= 1.0 - uWet * 0.4;
      float sn = uSnow * (smoothstep(0.5, 0.95, abs(u)) * 0.9 + 0.25 * vnoise(vec2(vUv.y * 0.5, u * 4.0)));
      alb = mix(alb, vec3(0.9, 0.92, 0.95), clamp(sn, 0.0, 1.0));
      vec3 nn = normalize(vN);
      vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
      if (uWet > 0.01) {
        vec3 V = normalize(uCamPos - vP);
        vec3 H = normalize(V + uSunDir);
        col += uSunColor * pow(max(dot(nn, H), 0.0), 60.0) * uWet * 0.5;
      }
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    });

    const PIECE = 64; // samples per road mesh piece
    const roadPieces = new Map<number, THREE.Mesh>();

    function buildRoadPiece(pi: number) {
      const i0 = pi * PIECE,
        i1 = Math.min(i0 + PIECE, road.pts.length - 1);
      if (i1 <= i0) return null;
      const count = i1 - i0 + 1;
      const pos = new Float32Array(count * 2 * 3);
      const nor = new Float32Array(count * 2 * 3);
      const uv = new Float32Array(count * 2 * 2);
      const idx: number[] = [];
      for (let i = 0; i < count; i++) {
        const p = road.pts[i0 + i];
        const prev = road.pts[Math.max(i0 + i - 1, 0)];
        const next = road.pts[Math.min(i0 + i + 1, road.pts.length - 1)];
        const slope = (next.y - prev.y) / Math.max(2 * DS, 1);
        const rx = p.dz,
          rz = -p.dx; // right perpendicular
        let fx = p.dx,
          fy = slope,
          fz = p.dz;
        const fl = Math.hypot(fx, fy, fz);
        fx /= fl;
        fy /= fl;
        fz /= fl;
        // normal = cross(forward, right)
        let nx = fy * rz - fz * 0,
          ny = fz * rx - fx * rz,
          nz = fx * 0 - fy * rx;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const y = p.y + 0.06;
        const o = i * 6;
        pos[o] = p.x - rx * ROAD_HALF;
        pos[o + 1] = y;
        pos[o + 2] = p.z - rz * ROAD_HALF;
        pos[o + 3] = p.x + rx * ROAD_HALF;
        pos[o + 4] = y;
        pos[o + 5] = p.z + rz * ROAD_HALF;
        nor[o] = nx;
        nor[o + 1] = ny;
        nor[o + 2] = nz;
        nor[o + 3] = nx;
        nor[o + 4] = ny;
        nor[o + 5] = nz;
        const s = (i0 + i) * DS;
        uv[i * 4] = -1;
        uv[i * 4 + 1] = s;
        uv[i * 4 + 2] = 1;
        uv[i * 4 + 3] = s;
        if (i > 0) {
          const a = (i - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, roadMat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }

    /* --------------------- roadside reflector posts -------------------- */
    function makePostGeometry() {
      const parts: { geo: THREE.BufferGeometry; color: THREE.Color }[] = [];
      const stem = new THREE.BoxGeometry(0.13, 0.85, 0.13).translate(0, 0.425, 0);
      const band = new THREE.BoxGeometry(0.145, 0.13, 0.145).translate(0, 0.72, 0);
      const colorize = (g: THREE.BufferGeometry, c: THREE.Color) => {
        const n = g.attributes.position.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          col[i * 3] = c.r;
          col[i * 3 + 1] = c.g;
          col[i * 3 + 2] = c.b;
        }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3));
        return g;
      };
      parts.push({ geo: colorize(stem, new THREE.Color(0.85, 0.86, 0.88)), color: new THREE.Color() });
      parts.push({ geo: colorize(band, new THREE.Color(0.85, 0.1, 0.08)), color: new THREE.Color() });
      const merged = new THREE.BufferGeometry();
      const attrs = ["position", "normal", "color"] as const;
      const data: Record<string, number[]> = {};
      for (const a of attrs) data[a] = [];
      for (const part of parts) {
        const ng = part.geo.toNonIndexed();
        for (const a of attrs) data[a].push(...(ng.getAttribute(a).array as unknown as number[]));
      }
      for (const a of attrs) merged.setAttribute(a, new THREE.BufferAttribute(new Float32Array(data[a]), 3));
      return merged;
    }
    const postGeo = makePostGeometry();
    const postMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x222222, emissiveIntensity: 0.4 });
    const postGlow = { value: 0 };
    /* reflector bands flare up in the headlights at night */
    postMat.onBeforeCompile = (sh: any) => {
      sh.uniforms.uPostGlow = postGlow;
      sh.fragmentShader =
        "uniform float uPostGlow;\n" +
        sh.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
     totalEmissiveRadiance += vColor.rgb * step(0.5, vColor.r) * step(vColor.g, 0.4) * uPostGlow;`,
        );
    };
    const POST_CAP = 220;
    const postsMesh = new THREE.InstancedMesh(postGeo, postMat, POST_CAP);
    postsMesh.frustumCulled = false;
    postsMesh.castShadow = true;
    postsMesh.receiveShadow = true;
    scene.add(postsMesh);
    const _pm = new THREE.Matrix4();

    let pieceRangeLo = -1,
      pieceRangeHi = -1;
    function ensureRoadPieces(carS: number) {
      const lo = Math.max(0, Math.floor((carS - 500) / (PIECE * DS)));
      const hi = Math.floor((carS + QUAL[state.quality].radius * 132 + 400) / (PIECE * DS));
      if (lo === pieceRangeLo && hi === pieceRangeHi) return;
      pieceRangeLo = lo;
      pieceRangeHi = hi;
      for (const [pi, mesh] of roadPieces) {
        if (pi < lo || pi > hi) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          roadPieces.delete(pi);
        }
      }
      for (let pi = lo; pi <= hi; pi++) {
        if (!roadPieces.has(pi)) {
          const m = buildRoadPiece(pi);
          if (m) roadPieces.set(pi, m);
        }
      }
      // refresh posts
      let n = 0;
      const iLo = lo * PIECE,
        iHi = Math.min(hi * PIECE + PIECE, road.pts.length - 1);
      for (let i = iLo; i <= iHi && n < POST_CAP - 1; i += 12) {
        const p = road.pts[i];
        const rx = p.dz,
          rz = -p.dx;
        for (const side of [-1, 1]) {
          _pm.makeRotationY(Math.atan2(p.dx, p.dz));
          _pm.setPosition(p.x + rx * (ROAD_HALF + 1.1) * side, p.y, p.z + rz * (ROAD_HALF + 1.1) * side);
          postsMesh.setMatrixAt(n++, _pm);
        }
      }
      postsMesh.count = n;
      postsMesh.instanceMatrix.needsUpdate = true;
      queueGrassRefill(carS);
    }
    // ============================= terrain ==============================
    const CHUNK = 132; // chunk world size
    const RES = 33; // quads per side (4 m grid)

    function terrainBaseH(x: number, z: number, roadD: number) {
      const far = smoothstep(24, 86, roadD);
      let h = fbm(nTer, x * 0.0042, z * 0.0042, 4) * (9 + 48 * far);
      h += fbm(nTer, x * 0.00085 + 37.2, z * 0.00085 - 11.8, 3) * (16 + 95 * far);
      const r = 1 - Math.abs(nTer(x * 0.0013 + 91.7, z * 0.0013 + 13.1));
      h += r * r * 85 * far * smoothstep(0.1, 0.7, fbm(nTer, x * 0.0004 + 5.1, z * 0.0004 + 9.3, 2) + 0.45);
      h += fbm(nTer, x * 0.028, z * 0.028, 2) * (0.5 + 1.6 * far);
      return h;
    }

    function sampleGround(x: number, z: number, rq?: ReturnType<typeof queryRoad> | null) {
      if (rq === undefined) rq = queryRoad(x, z);
      if (!rq) return terrainBaseH(x, z, 999);
      const d = rq.d;
      const base = terrainBaseH(x, z, d);
      if (d >= 86) return base;
      const t = smoothstep(ROAD_HALF + 0.8, 84, d);
      const shoulder = -0.3 * smoothstep(ROAD_HALF - 1.5, ROAD_HALF + 3, d) * (1 - t);
      return lerp(rq.y, base, t) + shoulder;
    }

    const terrainMat = new THREE.ShaderMaterial({
      uniforms: U,
      fog: false,
      vertexShader: `
    attribute float aRoad;
    varying vec3 vN, vP; varying float vRoad;
    void main(){
      vN = normal; vP = position; vRoad = aRoad;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
      fragmentShader:
        GLSL_COMMON +
        `
    varying vec3 vN, vP; varying float vRoad;
    void main(){
      vec3 n = normalize(vN);
      float slope = 1.0 - n.y;
      vec2 p = vP.xz;
      float varn = fbm2(p * 0.02);
      float varn2 = vnoise(p * 0.35);
      vec3 grass = mix(uGrass, uGrassAlt, varn);
      grass *= 0.9 + 0.2 * varn2;
      vec3 rock = mix(vec3(0.4, 0.365, 0.33), vec3(0.54, 0.52, 0.5), vnoise(p * 0.06));
      rock *= 0.85 + 0.3 * varn2;
      float rockM = smoothstep(0.2, 0.42, slope + (varn - 0.5) * 0.14);
      vec3 alb = mix(grass, rock, rockM);
      float shoulderM = smoothstep(9.5, 6.4, vRoad);
      vec3 dirt = vec3(0.42, 0.36, 0.28) * (0.85 + 0.3 * varn2);
      alb = mix(alb, dirt, shoulderM * (1.0 - rockM) * 0.9);
      float sn = uSnow * smoothstep(0.38, 0.14, slope + (varn - 0.5) * 0.22);
      sn = max(sn, smoothstep(115.0, 155.0, vP.y + varn * 30.0) * smoothstep(0.5, 0.2, slope));
      alb = mix(alb, vec3(0.92, 0.94, 0.97) * (0.92 + 0.08 * varn2), clamp(sn, 0.0, 1.0));
      vec3 col = doLight(alb, n, vP, sunShadow(vP, n));
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    });

    /* ------------------------ tree / rock geometry --------------------- */
    function mergeParts(parts: { geo: THREE.BufferGeometry; matrix?: THREE.Matrix4; color: THREE.Color; foliage: number }[]) {
      const posA: number[] = [],
        norA: number[] = [],
        colA: number[] = [],
        folA: number[] = [];
      for (const part of parts) {
        const g = part.geo.toNonIndexed();
        if (part.matrix) g.applyMatrix4(part.matrix);
        const p = g.getAttribute("position").array as unknown as number[],
          nn = g.getAttribute("normal").array as unknown as number[];
        for (let i = 0; i < p.length; i++) {
          posA.push(p[i]);
          norA.push(nn[i]);
        }
        const n = g.getAttribute("position").count;
        for (let i = 0; i < n; i++) {
          colA.push(part.color.r, part.color.g, part.color.b);
          folA.push(part.foliage);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posA), 3));
      g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(norA), 3));
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colA), 3));
      g.setAttribute("aFoliage", new THREE.BufferAttribute(new Float32Array(folA), 1));
      return g;
    }
    const M4 = (x: number, y: number, z: number, s = 1) => new THREE.Matrix4().makeScale(s, s, s).setPosition(x, y, z);
    const trunkCol = new THREE.Color(0x5a4633);
    const white = new THREE.Color(1, 1, 1);

    const coniferGeo = mergeParts([
      { geo: new THREE.CylinderGeometry(0.2, 0.32, 2.2, 6), matrix: M4(0, 1.1, 0), color: trunkCol, foliage: 0 },
      { geo: new THREE.ConeGeometry(1.55, 2.7, 7), matrix: M4(0, 2.9, 0), color: white, foliage: 1 },
      { geo: new THREE.ConeGeometry(1.2, 2.3, 7), matrix: M4(0, 4.5, 0), color: white, foliage: 1 },
      { geo: new THREE.ConeGeometry(0.8, 1.9, 7), matrix: M4(0, 6.0, 0), color: white, foliage: 1 },
    ]);
    const decidGeo = mergeParts([
      { geo: new THREE.CylinderGeometry(0.22, 0.36, 2.9, 6), matrix: M4(0, 1.45, 0), color: trunkCol, foliage: 0 },
      { geo: new THREE.IcosahedronGeometry(1.5, 1), matrix: M4(0, 3.8, 0, 1.25), color: white, foliage: 1 },
      { geo: new THREE.IcosahedronGeometry(1.0, 1), matrix: M4(1.0, 3.1, 0.35), color: white, foliage: 1 },
      { geo: new THREE.IcosahedronGeometry(1.05, 1), matrix: M4(-0.9, 3.25, -0.25), color: white, foliage: 1 },
    ]);
    const rockGeoBase = new THREE.IcosahedronGeometry(1, 1);
    {
      const pa = rockGeoBase.getAttribute("position");
      for (let i = 0; i < pa.count; i++) {
        const j = 0.75 + 0.5 * ((hash2i((pa.getX(i) * 100) | 0, (pa.getZ(i) * 100) | 0, 7) % 1000) / 1000);
        pa.setXYZ(i, pa.getX(i) * j, pa.getY(i) * j * 0.65, pa.getZ(i) * j);
      }
      rockGeoBase.computeVertexNormals();
    }
    const rockGeo = mergeParts([{ geo: rockGeoBase, color: new THREE.Color(0x767068), foliage: 0 }]);

    function makeVegMat(extraUniforms?: Record<string, { value: unknown }>) {
      return new THREE.ShaderMaterial({
        uniforms: Object.assign(
          {
            uLeafA: { value: new THREE.Color(0x4f8f3b) },
            uLeafB: { value: new THREE.Color(0x6aa348) },
            uLeafDensity: { value: 1 },
          },
          U,
          extraUniforms || {},
        ),
        fog: false,
        vertexShader: `
      attribute vec3 color; attribute float aFoliage;
      varying vec3 vC, vN, vP, vO; varying float vF, vR;
      uniform float uTime;
      float hsh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        vR = hsh(vec2(instanceMatrix[3].x * 0.371, instanceMatrix[3].z * 0.593));
        wp.x += aFoliage * sin(uTime * 1.2 + wp.x * 0.4 + wp.z * 0.35) * 0.05 * position.y;
        vP = wp.xyz; vO = position; vC = color; vF = aFoliage;
        vN = normalize(mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
        fragmentShader:
          GLSL_COMMON +
          `
      uniform vec3 uLeafA, uLeafB;
      uniform float uLeafDensity;
      varying vec3 vC, vN, vP, vO; varying float vF, vR;
      void main(){
        vec3 alb;
        if (vF > 0.5) {
          float h = hash12(floor(vO.xz * 13.0) + vec2(floor(vO.y * 13.0) * 3.1, vR * 37.0));
          if (h > uLeafDensity) discard;
          alb = mix(uLeafA, uLeafB, vR);
          alb *= 0.8 + 0.4 * vnoise(vO.xy * 2.6 + vR * 21.0);
        } else {
          alb = vC;
        }
        float sn = uSnow * smoothstep(0.05, 0.6, vN.y) * (vF > 0.5 ? 0.9 : 0.5);
        alb = mix(alb, vec3(0.92, 0.94, 0.97), sn);
        vec3 nn = normalize(vN);
        vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
        col = doFog(col, vP);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      });
    }
    const coniferMat = makeVegMat();
    const decidMat = makeVegMat();
    const rockMat = makeVegMat();

    /* -------------------------- chunk manager ------------------------- */
    const chunks = new Map<string, { cx: number; cz: number; meshes: THREE.Object3D[] }>();
    const chunkQueue: [number, number, number][] = [];
    const chunkKey = (cx: number, cz: number) => cx + ":" + cz;
    const _m4 = new THREE.Matrix4();
    const _q4 = new THREE.Quaternion();
    const _v3 = new THREE.Vector3();
    const _s3 = new THREE.Vector3();

    function buildChunk(cx: number, cz: number) {
      const x0 = cx * CHUNK,
        z0 = cz * CHUNK;
      const cell = CHUNK / RES;
      const G = RES + 3; // heights grid with 1-cell border
      const hts = new Float32Array(G * G);
      const rds = new Float32Array(G * G);
      for (let j = 0; j < G; j++)
        for (let i = 0; i < G; i++) {
          const x = x0 + (i - 1) * cell,
            z = z0 + (j - 1) * cell;
          const rq = queryRoad(x, z);
          hts[j * G + i] = sampleGround(x, z, rq);
          rds[j * G + i] = rq ? rq.d : 999;
        }
      const V = RES + 1;
      const pos = new Float32Array(V * V * 3);
      const nor = new Float32Array(V * V * 3);
      const aRoad = new Float32Array(V * V);
      for (let j = 0; j < V; j++)
        for (let i = 0; i < V; i++) {
          const gi = (j + 1) * G + (i + 1);
          const o = (j * V + i) * 3;
          pos[o] = x0 + i * cell;
          pos[o + 1] = hts[gi];
          pos[o + 2] = z0 + j * cell;
          let nx = hts[gi - 1] - hts[gi + 1];
          const ny = 2 * cell;
          let nz = hts[gi - G] - hts[gi + G];
          const nl = Math.hypot(nx, ny, nz);
          nor[o] = nx / nl;
          nor[o + 1] = ny / nl;
          nor[o + 2] = nz / nl;
          aRoad[j * V + i] = Math.min(rds[gi], 99);
        }
      const idx = new Uint32Array(RES * RES * 6);
      let ii = 0;
      for (let j = 0; j < RES; j++)
        for (let i = 0; i < RES; i++) {
          const a = j * V + i,
            b = a + 1,
            c = a + V,
            d = c + 1;
          idx[ii++] = a;
          idx[ii++] = c;
          idx[ii++] = b;
          idx[ii++] = b;
          idx[ii++] = c;
          idx[ii++] = d;
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      g.setAttribute("aRoad", new THREE.BufferAttribute(aRoad, 1));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, terrainMat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      const meshes: THREE.Object3D[] = [mesh];

      /* scenery */
      const rng = mulberry32(hash2i(cx, cz, SEED));
      const conM: THREE.Matrix4[] = [],
        decM: THREE.Matrix4[] = [],
        rokM: THREE.Matrix4[] = [];
      for (let t = 0; t < 72; t++) {
        const px = x0 + rng() * CHUNK,
          pz = z0 + rng() * CHUNK;
        const rq = queryRoad(px, pz);
        if (rq && rq.d < 13) continue;
        const forest = fbm(nVeg, px * 0.003, pz * 0.003, 2);
        if (rng() > smoothstep(-0.28, 0.55, forest) * 0.9) continue;
        const h = sampleGround(px, pz, rq);
        const hX = sampleGround(px + 2.5, pz);
        const hZ = sampleGround(px, pz + 2.5);
        if (Math.hypot(hX - h, hZ - h) / 2.5 > 0.6) continue;
        const sc = 0.7 + rng() * 0.9;
        _q4.setFromAxisAngle(_v3.set(0, 1, 0), rng() * TAU);
        _m4.compose(_v3.set(px, h - 0.15, pz), _q4, _s3.set(sc, sc * (0.9 + rng() * 0.25), sc));
        const conifer = nVeg(px * 0.0006 + 50.2, pz * 0.0006 - 30.7) > 0 || h > 95;
        (conifer ? conM : decM).push(_m4.clone());
      }
      for (let t = 0; t < 9; t++) {
        const px = x0 + rng() * CHUNK,
          pz = z0 + rng() * CHUNK;
        const rq = queryRoad(px, pz);
        if (rq && rq.d < 9) continue;
        if (rng() > 0.4) continue;
        const h = sampleGround(px, pz, rq);
        const sc = 0.5 + rng() * rng() * 2.4;
        _q4.setFromAxisAngle(_v3.set(0, 1, 0), rng() * TAU);
        _m4.compose(_v3.set(px, h + 0.1 * sc, pz), _q4, _s3.set(sc, sc, sc));
        rokM.push(_m4.clone());
      }
      const addInst = (geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[]) => {
        if (!mats.length) return;
        const im = new THREE.InstancedMesh(geo, mat, mats.length);
        for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]);
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = true;
        im.receiveShadow = true;
        scene.add(im);
        meshes.push(im);
      };
      addInst(coniferGeo, coniferMat, conM);
      addInst(decidGeo, decidMat, decM);
      addInst(rockGeo, rockMat, rokM);
      chunks.set(chunkKey(cx, cz), { cx, cz, meshes });
    }

    function updateChunks(px: number, pz: number, budgetMs: number) {
      const R = QUAL[state.quality].radius;
      const ccx = Math.round(px / CHUNK),
        ccz = Math.round(pz / CHUNK);
      // drop far chunks
      for (const [key, ch] of chunks) {
        if (Math.max(Math.abs(ch.cx - ccx), Math.abs(ch.cz - ccz)) > R + 1) {
          for (const m of ch.meshes) {
            scene.remove(m);
            const mesh = m as THREE.Mesh | THREE.InstancedMesh;
            if (mesh.geometry !== coniferGeo && mesh.geometry !== decidGeo && mesh.geometry !== rockGeo) mesh.geometry.dispose();
            if ("dispose" in mesh && typeof (mesh as THREE.InstancedMesh).dispose === "function") (mesh as THREE.InstancedMesh).dispose();
          }
          chunks.delete(key);
        }
      }
      // queue missing, near-first
      chunkQueue.length = 0;
      for (let dx = -R; dx <= R; dx++)
        for (let dz = -R; dz <= R; dz++) {
          const cx = ccx + dx,
            cz = ccz + dz;
          if (!chunks.has(chunkKey(cx, cz))) chunkQueue.push([dx * dx + dz * dz, cx, cz]);
        }
      if (!chunkQueue.length) return;
      chunkQueue.sort((a, b) => a[0] - b[0]);
      const t0 = performance.now();
      for (const [, cx, cz] of chunkQueue) {
        buildChunk(cx, cz);
        if (performance.now() - t0 > budgetMs) break;
      }
    }

    // ========================= grass & flowers ==========================
    const GRASS_CAP = 4200,
      FLOWER_CAP = 320;

    const grassGeo = new THREE.InstancedBufferGeometry();
    {
      const pos = new Float32Array([-0.055, 0, 0, 0.055, 0, 0, -0.032, 0.55, 0, 0.032, 0.55, 0, 0, 1.0, 0]);
      const uvA = new Float32Array([0, 0, 1, 0, 0.2, 0.55, 0.8, 0.55, 0.5, 1]);
      grassGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      grassGeo.setAttribute("uv", new THREE.BufferAttribute(uvA, 2));
      grassGeo.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
    }
    const grassOff = new Float32Array(GRASS_CAP * 3);
    const grassRnd = new Float32Array(GRASS_CAP * 4);
    const grassOffAttr = new THREE.InstancedBufferAttribute(grassOff, 3).setUsage(THREE.DynamicDrawUsage);
    const grassRndAttr = new THREE.InstancedBufferAttribute(grassRnd, 4).setUsage(THREE.DynamicDrawUsage);
    grassGeo.setAttribute("aOffset", grassOffAttr);
    grassGeo.setAttribute("aRand", grassRndAttr);
    grassGeo.instanceCount = 0;

    const grassMat = new THREE.ShaderMaterial({
      uniforms: U,
      fog: false,
      side: THREE.DoubleSide,
      vertexShader:
        GLSL_COMMON +
        `
    attribute vec3 aOffset; attribute vec4 aRand;
    uniform float uGrassGrow;
    varying vec3 vP; varying float vT, vR, vSh;
    void main(){
      float c = cos(aRand.x * 6.28318), s = sin(aRand.x * 6.28318);
      vec3 p = position;
      p.x *= 0.8 + aRand.z * 0.5;
      p.y *= (0.55 + aRand.y * 0.5) * uGrassGrow;
      float sway = sin(uTime * 1.6 + aOffset.x * 0.33 + aOffset.z * 0.27) * (0.10 + 0.08 * aRand.z)
                 + sin(uTime * 4.3 + aOffset.z * 1.7) * 0.03;
      float lean = (aRand.w - 0.5) * 0.55 + sway;
      p.x += lean * p.y * p.y * 1.7;
      p.z += (aRand.z - 0.5) * 0.35 * p.y * p.y;
      vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
      vec3 wp = aOffset + rp;
      vP = wp; vT = uv.y; vR = aRand.z;
      vSh = sunShadow(wp, vec3(0.0, 1.0, 0.0));
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,
      fragmentShader:
        GLSL_COMMON +
        `
    varying vec3 vP; varying float vT, vR, vSh;
    void main(){
      vec3 alb = mix(uGrass * 0.5, mix(uGrass, uGrassAlt, vR) * 1.3, vT);
      alb *= 0.9 + 0.2 * hash12(floor(vP.xz * 7.0));
      alb *= 1.0 - uWet * 0.35;
      alb = mix(alb, vec3(0.93, 0.95, 0.98), uSnow * 0.85);
      vec3 col = doLight(alb, vec3(0.0, 1.0, 0.0), vP, vSh);
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.frustumCulled = false;
    scene.add(grassMesh);

    /* flowers: crossed quads in clusters, scaled by a seasonal bloom factor */
    const FLOWER_COLS = ["#ffffff", "#ffd94a", "#ff9ec6", "#b7a6ff", "#ff7a5c", "#8fd0ff"].map((h) => new THREE.Color(h));
    const flowerTex = (() => {
      const cnv = document.createElement("canvas");
      cnv.width = cnv.height = 64;
      const ctx = cnv.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 11, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd94a";
      ctx.beginPath();
      ctx.arc(32, 32, 8, 0, TAU);
      ctx.fill();
      const t = new THREE.CanvasTexture(cnv);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const flowerGeo = new THREE.InstancedBufferGeometry();
    {
      const pos: number[] = [],
        uvA: number[] = [],
        idx: number[] = [];
      let vi = 0;
      for (const ang of [0, Math.PI / 2]) {
        const c = Math.cos(ang),
          s = Math.sin(ang);
        for (const [x, y] of [
          [-0.14, 0],
          [0.14, 0],
          [0.14, 0.3],
          [-0.14, 0.3],
        ])
          pos.push(x * c, y, x * s);
        uvA.push(0, 0, 1, 0, 1, 1, 0, 1);
        idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
        vi += 4;
      }
      flowerGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
      flowerGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvA), 2));
      flowerGeo.setIndex(idx);
    }
    const flowerOff = new Float32Array(FLOWER_CAP * 3);
    const flowerRnd = new Float32Array(FLOWER_CAP * 2);
    const flowerCol = new Float32Array(FLOWER_CAP * 3);
    const flowerOffAttr = new THREE.InstancedBufferAttribute(flowerOff, 3).setUsage(THREE.DynamicDrawUsage);
    const flowerRndAttr = new THREE.InstancedBufferAttribute(flowerRnd, 2).setUsage(THREE.DynamicDrawUsage);
    const flowerColAttr = new THREE.InstancedBufferAttribute(flowerCol, 3).setUsage(THREE.DynamicDrawUsage);
    flowerGeo.setAttribute("aOffset", flowerOffAttr);
    flowerGeo.setAttribute("aRand", flowerRndAttr);
    flowerGeo.setAttribute("aColor", flowerColAttr);
    flowerGeo.instanceCount = 0;

    const flowerMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uMap: { value: flowerTex } }, U),
      fog: false,
      side: THREE.DoubleSide,
      vertexShader:
        GLSL_COMMON +
        `
    attribute vec3 aOffset; attribute vec2 aRand; attribute vec3 aColor;
    uniform float uBloom;
    varying vec2 vUv; varying vec3 vC, vP;
    void main(){
      vUv = uv; vC = aColor;
      vec3 p = position * aRand.x * uBloom;
      float c = cos(aRand.y * 6.28318), s = sin(aRand.y * 6.28318);
      vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
      rp.x += sin(uTime * 1.9 + aOffset.z * 0.8) * 0.05 * p.y;
      vec3 wp = aOffset + rp;
      vP = wp;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,
      fragmentShader:
        GLSL_COMMON +
        `
    uniform sampler2D uMap;
    varying vec2 vUv; varying vec3 vC, vP;
    void main(){
      vec4 tex = texture2D(uMap, vUv);
      if (tex.a < 0.55) discard;
      vec3 alb = tex.rgb * vC;
      alb = mix(alb, vec3(0.93, 0.95, 0.98), uSnow * 0.6);
      vec3 col = doLight(alb, vec3(0.0, 1.0, 0.0), vP, 1.0);
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    });
    const flowerMesh = new THREE.Mesh(flowerGeo, flowerMat);
    flowerMesh.frustumCulled = false;
    scene.add(flowerMesh);

    /* refill queues, consumed a few ms per frame */
    let grassJobs: number[] = [],
      grassFilled = 0,
      flowerJobs: number[] = [],
      flowerFilled = 0;
    function queueGrassRefill(carS: number) {
      const iLo = Math.max(4, Math.floor((carS - 420) / DS));
      const iHi = Math.min(road.pts.length - 3, Math.ceil((carS + QUAL[state.quality].radius * 132 + 380) / DS));
      const step = state.quality === 0 ? 2 : 1;
      const perSide = state.quality === 2 ? 4 : state.quality === 1 ? 3 : 2;
      const idxs: number[] = [];
      for (let i = iLo; i < iHi; i += step) idxs.push(i);
      idxs.sort((a, b) => Math.abs(a * DS - carS) - Math.abs(b * DS - carS));
      grassJobs.length = 0;
      flowerJobs.length = 0;
      for (const i of idxs)
        for (let sd = 0; sd < 2; sd++) {
          for (let b = 0; b < perSide && grassJobs.length < GRASS_CAP; b++) grassJobs.push((i << 3) | (sd << 2) | b);
        }
      for (let i = iLo + 3; i < iHi; i += 6)
        for (let sd = 0; sd < 2; sd++) {
          if ((hash2i(i, 733 + sd * 7, SEED) % 1000) / 1000 < 0.5) continue;
          for (let c = 0; c < 4 && flowerJobs.length < FLOWER_CAP; c++) flowerJobs.push((i << 3) | (sd << 2) | c);
        }
      grassFilled = 0;
      flowerFilled = 0;
      grassGeo.instanceCount = 0;
      flowerGeo.instanceCount = 0;
    }
    function processGrassJobs(budgetMs: number) {
      if (!grassJobs.length && !flowerJobs.length) return;
      const t0 = performance.now();
      while (grassJobs.length) {
        const job = grassJobs.pop()!;
        const b = job & 3,
          side = ((job >> 2) & 1) * 2 - 1,
          i = job >> 3;
        const o = grassFilled++;
        const p = road.pts[i];
        const rng = mulberry32(hash2i(i, 11 + (job & 7), SEED));
        const rx = p.dz,
          rz = -p.dx;
        const along = (rng() - 0.5) * 3.6;
        const lat = side * (ROAD_HALF + 0.55 + Math.pow(rng(), 1.6) * 8.5);
        const px = p.x + rx * lat + p.dx * along;
        const pz = p.z + rz * lat + p.dz * along;
        const rq = queryRoad(px, pz);
        let h = -500;
        if (!rq || rq.d > ROAD_HALF + 0.3) h = sampleGround(px, pz, rq || undefined) - 0.03;
        grassOff[o * 3] = px;
        grassOff[o * 3 + 1] = h;
        grassOff[o * 3 + 2] = pz;
        grassRnd[o * 4] = rng();
        grassRnd[o * 4 + 1] = rng();
        grassRnd[o * 4 + 2] = rng();
        grassRnd[o * 4 + 3] = rng();
        grassGeo.instanceCount = grassFilled;
        if (performance.now() - t0 > budgetMs) break;
      }
      grassOffAttr.needsUpdate = true;
      grassRndAttr.needsUpdate = true;
      while (flowerJobs.length && performance.now() - t0 <= budgetMs) {
        const job = flowerJobs.pop()!;
        const cI = job & 3,
          side = ((job >> 2) & 1) * 2 - 1,
          i = job >> 3;
        const o = flowerFilled++;
        const p = road.pts[i];
        const rx = p.dz,
          rz = -p.dx;
        const crng = mulberry32(hash2i(i, 733 + ((job >> 2) & 1) * 7, SEED));
        const clat = side * (ROAD_HALF + 1.2 + crng() * 7.5);
        const calong = (crng() - 0.5) * 4;
        const cx0 = p.x + rx * clat + p.dx * calong;
        const cz0 = p.z + rz * clat + p.dz * calong;
        const jr = mulberry32(hash2i(i, 1553 + cI, SEED));
        const px = cx0 + (jr() - 0.5) * 2.2;
        const pz = cz0 + (jr() - 0.5) * 2.2;
        const rq = queryRoad(px, pz);
        let h = -500;
        if (!rq || rq.d > ROAD_HALF + 0.4) h = sampleGround(px, pz, rq || undefined) - 0.02;
        flowerOff[o * 3] = px;
        flowerOff[o * 3 + 1] = h;
        flowerOff[o * 3 + 2] = pz;
        flowerRnd[o * 2] = 0.7 + jr() * 0.7;
        flowerRnd[o * 2 + 1] = jr();
        const col = FLOWER_COLS[(jr() * FLOWER_COLS.length) | 0];
        flowerCol[o * 3] = col.r;
        flowerCol[o * 3 + 1] = col.g;
        flowerCol[o * 3 + 2] = col.b;
        flowerGeo.instanceCount = flowerFilled;
      }
      flowerOffAttr.needsUpdate = true;
      flowerRndAttr.needsUpdate = true;
      flowerColAttr.needsUpdate = true;
    }

    // =============================== car ================================
    const car = {
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

    const carGroup = new THREE.Group();
    const carTilt = new THREE.Group();
    carGroup.add(carTilt);
    scene.add(carGroup);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd95f2b, roughness: 0.32, metalness: 0.12 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x101720, roughness: 0.08, metalness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x191b1f, roughness: 0.85 });
    const alloyMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, roughness: 0.32, metalness: 0.85 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c0, emissiveIntensity: 0.25 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x7a1310, emissive: 0xff2218, emissiveIntensity: 0.35 });

    /* sport-luxury fastback sedan: hull and glasshouse are extruded side profiles */
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
    {
      const hull = new THREE.Mesh(
        profileGeo(
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
        ),
        bodyMat,
      );
      carTilt.add(hull);

      const glass = new THREE.Mesh(
        profileGeo(
          [
            [0.95, 0.86],
            [0.3, 1.3],
            [-0.85, 1.34],
            [-1.75, 0.88],
          ],
          1.62,
          0.04,
          0.04,
        ),
        glassMat,
      );
      carTilt.add(glass);

      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.055, 0.05), tailMat);
      lightBar.position.set(0, 0.78, -2.43);
      carTilt.add(lightBar);
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 0.18), darkMat);
      spoiler.position.set(0, 0.865, -2.26);
      carTilt.add(spoiler);
      const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.18, 0.22), darkMat);
      diffuser.position.set(0, 0.26, -2.3);
      carTilt.add(diffuser);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.08), darkMat);
      grille.position.set(0, 0.42, 2.42);
      carTilt.add(grille);
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.1, 0.3), darkMat);
      splitter.position.set(0, 0.22, 2.28);
      carTilt.add(splitter);
      for (const sx of [-1, 1]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.075, 0.06), headMat);
        hl.position.set(sx * 0.62, 0.68, 2.38);
        hl.rotation.y = sx * 0.35;
        carTilt.add(hl);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), bodyMat);
        mirror.position.set(sx * 0.98, 0.98, 0.42);
        carTilt.add(mirror);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 2.6), darkMat);
        skirt.position.set(sx * 0.92, 0.24, 0);
        carTilt.add(skirt);
      }
    }
    const wheels: { pivot: THREE.Group; mesh: THREE.Group; front: boolean }[] = [];
    {
      const tireG = new THREE.CylinderGeometry(0.335, 0.335, 0.24, 20);
      tireG.rotateZ(Math.PI / 2);
      const rimG = new THREE.CylinderGeometry(0.21, 0.21, 0.245, 20);
      rimG.rotateZ(Math.PI / 2);
      const spokeG = new THREE.BoxGeometry(0.026, 0.36, 0.09);
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
        carTilt.add(pivot);
        wheels.push({ pivot, mesh: w, front: sz > 0 });
      }
    }
    carGroup.traverse((o: any) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });

    /* headlight spotlights (light built-in materials; custom shaders use U.uHL*) */
    const hlSpots: THREE.SpotLight[] = [];
    for (const sx of [-1, 1]) {
      const sp = new THREE.SpotLight(0xffe9b8, 0, 150, 0.55, 0.55, 1.0);
      sp.position.set(sx * 0.62, 0.72, 2.2);
      sp.target.position.set(sx * 0.8, -1.5, 30);
      carTilt.add(sp);
      carTilt.add(sp.target);
      hlSpots.push(sp);
    }
    /* headlight glow sprites */
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
      carTilt.add(sp);
      glowSprites.push(sp);
    }

    /* ------------------------------ input ------------------------------ */
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === " ") e.preventDefault();
      keys.add(k);
      if (k === "t") setAuto(!state.auto);
      if (k === "c") setCam((state.camMode + 1) % 3);
      if (k === "m") toggleMute();
      if (k === "r") resetCar();
      if (k === "escape") togglePanel();
      if (k >= "1" && k <= "4") setSeason(String(+k - 1));
      if (k === "0") setSeason("auto");
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        if (state.auto && k !== " ") setAuto(false, true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const keyThrottle = () => (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const keySteer = () => (keys.has("a") || keys.has("arrowleft") ? 1 : 0) - (keys.has("d") || keys.has("arrowright") ? 1 : 0);

    function resetCar() {
      const rq = queryRoad(car.x, car.z);
      const idx = rq ? Math.round(rq.s / DS) : car.lastRoadIdx;
      const p = road.pts[clamp(idx, 2, road.pts.length - 2)];
      car.x = p.x;
      car.z = p.z;
      car.heading = Math.atan2(p.dx, p.dz);
      car.speed = Math.min(car.speed, 12);
      car.y = p.y;
    }

    /* --------------------------- car physics --------------------------- */
    const MAX_SPEED = 69,
      MAX_REV = 9; // 69 m/s ~ 250 km/h, factory-limited
    function updateCar(dt: number) {
      extendRoadTo(car.s + 2400);
      const q = queryRoad(car.x, car.z);
      if (q) {
        car.lastRoadIdx = q.idx;
        car.s = q.s;
      }
      const off = q ? smoothstep(ROAD_HALF + 0.5, ROAD_HALF + 5, q.d) : 1;
      car.off = off;

      /* surface grip: rain and snow cover both loosen the car */
      const grip = 1 - clamp(U.uWet.value * 0.38 + env.snow * 0.3, 0, 0.52);

      let th = keyThrottle();
      let stIn = keySteer();

      /* autopilot: pure-pursuit on the road spline */
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
      const effSteer = car.steer / (1 + Math.abs(car.speed) * 0.045);
      const yawMax = 1.25 * (0.55 + 0.45 * grip);
      const yawRate = clamp((effSteer * car.speed) / 2.8, -yawMax, yawMax);
      car.heading += yawRate * dt;

      let a = 0;
      if (th > 0) {
        const sf = Math.max(car.speed, 0) / MAX_SPEED;
        a += 12 * th * (1 - sf * sf) * (0.8 + 0.2 * grip);
      } else if (th < 0) a += car.speed > 0.5 ? -15 * grip : -6.5 * (1 + car.speed / MAX_REV);
      a -= car.speed * 0.11;
      a -= off * (2.5 + Math.abs(car.speed) * 0.45) * Math.sign(car.speed || 0);
      if (keys.has(" ")) a -= Math.sign(car.speed) * 18 * grip * Math.min(1, Math.abs(car.speed));
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

      /* ride height from the four wheel contact patches — body stays planted */
      const gFL = sampleGround(car.x + fx * 1.45 - fz * 0.86, car.z + fz * 1.45 + fx * 0.86);
      const gFR = sampleGround(car.x + fx * 1.45 + fz * 0.86, car.z + fz * 1.45 - fx * 0.86);
      const gRL = sampleGround(car.x - fx * 1.45 - fz * 0.86, car.z - fz * 1.45 + fx * 0.86);
      const gRR = sampleGround(car.x - fx * 1.45 + fz * 0.86, car.z - fz * 1.45 - fx * 0.86);
      const gF2 = (gFL + gFR) * 0.5,
        gR2 = (gRL + gRR) * 0.5;
      const onRoad = q && q.d < ROAD_HALF;
      let targetY = (gFL + gFR + gRL + gRR) * 0.25 + (onRoad ? 0.06 : 0);
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
      if (Math.abs(car.y - targetY) > 0.22) {
        car.y = targetY + Math.sign(car.y - targetY) * 0.22;
        car.yv = 0;
      }

      carGroup.position.set(car.x, car.y, car.z);
      carGroup.rotation.y = car.heading;
      carTilt.rotation.x = car.pitch;
      carTilt.rotation.z = car.roll;

      for (const w of wheels) {
        w.mesh.rotation.x += (car.speed / 0.34) * dt;
        if (w.front) w.pivot.rotation.y = effSteer * 0.85;
      }

      /* headlight uniforms follow the car */
      U.uHLPos.value.set(car.x + fx * 2.0, car.y + 0.8, car.z + fz * 2.0);
      U.uHLDir.value.set(fx, -0.09, fz).normalize();
    }

    /* ------------------------------ camera ----------------------------- */
    const camPos = new THREE.Vector3(0, 30, -40);
    const camLook = new THREE.Vector3();
    function updateCamera(dt: number, t: number) {
      const fx = Math.sin(car.heading),
        fz = Math.cos(car.heading);
      let tx: number, ty: number, tz: number, lx: number, ly: number, lz: number, stiff = 4.2;
      if (state.camMode === 0) {
        // chase
        tx = car.x - fx * 9.2;
        ty = car.y + 3.5;
        tz = car.z - fz * 9.2;
        lx = car.x + fx * 12;
        ly = car.y + 1.7;
        lz = car.z + fz * 12;
      } else if (state.camMode === 1) {
        // hood
        tx = car.x + fx * 0.4;
        ty = car.y + 1.3;
        tz = car.z + fz * 0.4;
        lx = car.x + fx * 45;
        ly = car.y + 0.9;
        lz = car.z + fz * 45;
        stiff = 30;
      } else {
        // cinematic
        const ang = t * 0.075;
        const r = 13 + 4 * Math.sin(t * 0.021);
        tx = car.x + Math.sin(ang) * r;
        ty = car.y + 4.2 + 2.2 * Math.sin(t * 0.033);
        tz = car.z + Math.cos(ang) * r;
        lx = car.x;
        ly = car.y + 1.2;
        lz = car.z;
        stiff = 2.5;
      }
      const gy = sampleGround(tx, tz) + 1.15;
      if (ty < gy) ty = gy;
      const k = 1 - Math.exp(-stiff * dt);
      camPos.x += (tx - camPos.x) * k;
      camPos.y += (ty - camPos.y) * k;
      camPos.z += (tz - camPos.z) * k;
      const shake = car.off * Math.min(Math.abs(car.speed) / 12, 1) * 0.06;
      camera.position.set(camPos.x + (Math.random() - 0.5) * shake, camPos.y + (Math.random() - 0.5) * shake, camPos.z + (Math.random() - 0.5) * shake);
      camLook.set(lx, ly, lz);
      camera.lookAt(camLook);
      U.uCamPos.value.copy(camera.position);
      const targetFov = state.camMode === 1 ? 70 : 62 + clamp(car.speed, 0, MAX_SPEED) * 0.22;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 2);
        camera.updateProjectionMatrix();
      }
      skyMesh.position.copy(camera.position);
    }
    // ============================= seasons ===============================
    const C = (h: number) => new THREE.Color(h);
    /* keyed at season centers: spring, summer, autumn, winter (phase .5/1.5/2.5/3.5) */
    const PAL = {
      grass: [C(0x74b054), C(0x7fa844), C(0xa38b47), C(0x8b9078)],
      grassAlt: [C(0x5f9a49), C(0x6c9439), C(0x8f7439), C(0x7b8069)],
      leafA: [C(0x93c464), C(0x4f8f3b), C(0xd07f2e), C(0x9a8d80)],
      leafB: [C(0xb2d47e), C(0x6aa348), C(0xc7502f), C(0x877a6c)],
      conifA: [C(0x35744a), C(0x2d6a3c), C(0x2f6141), C(0x3a584a)],
      conifB: [C(0x44875a), C(0x3b7a4a), C(0x3d704e), C(0x466255)],
      leafDen: [0.85, 1.0, 0.8, 0.22],
      snow: [0.06, 0, 0, 1],
    };
    const SEASON_NAMES = ["Spring", "Summer", "Autumn", "Winter"];
    const SEASON_EMOJI = ["🌸", "☀️", "🍂", "❄️"];
    const FLOWER_SEASON = [1.0, 0.7, 0.15, 0];
    function seasonMixLerp(arr: THREE.Color[], phase: number, out?: THREE.Color): THREE.Color;
    function seasonMixLerp(arr: number[], phase: number, out?: undefined): number;
    function seasonMixLerp(arr: (THREE.Color | number)[], phase: number, out?: THREE.Color) {
      const t = ((phase - 0.5 + 4) % 4);
      const i = Math.floor(t);
      let f = t - i;
      f = f * f * (3 - 2 * f);
      if (out) {
        out.lerpColors(arr[i] as THREE.Color, arr[(i + 1) % 4] as THREE.Color, f);
        return out;
      }
      return lerp(arr[i] as number, arr[(i + 1) % 4] as number, f);
    }
    const env = { daylight: 1, night: 0, snow: 0, sunElev: 1 };

    /* sun/shadow rig: the shadow box follows the car, snapped to the shadow-map
       texel grid (in light space) so shadow edges don't shimmer while driving */
    const UP_V = new THREE.Vector3(0, 1, 0);
    const _sv1 = new THREE.Vector3(),
      _sv2 = new THREE.Vector3(),
      _sv3 = new THREE.Vector3(),
      _sv4 = new THREE.Vector3();
    function placeSunShadow() {
      const dir = U.uSunDir.value;
      _sv1.set(car.x, car.y, car.z);
      _sv2.crossVectors(UP_V, dir);
      if (_sv2.lengthSq() < 1e-4) _sv2.set(1, 0, 0);
      else _sv2.normalize();
      _sv3.crossVectors(dir, _sv2).normalize();
      _sv4.set(car.x + dir.x * SHADOW_DIST, car.y + Math.max(dir.y, 0.06) * SHADOW_DIST, car.z + dir.z * SHADOW_DIST);
      const texel = (SHADOW_EXT * 2) / sunLight.shadow.mapSize.x;
      const rawX = _sv4.dot(_sv2),
        rawY = _sv4.dot(_sv3);
      const dx = Math.round(rawX / texel) * texel - rawX;
      const dy = Math.round(rawY / texel) * texel - rawY;
      _sv4.addScaledVector(_sv2, dx).addScaledVector(_sv3, dy);
      sunLight.position.copy(_sv4);
      sunLight.target.position.copy(_sv1).addScaledVector(_sv2, dx).addScaledVector(_sv3, dy);
    }

    // ============================= weather ===============================
    const wx = { cloud: 0.28, rain: 0, fog: 0, tCloud: 0.28, tRain: 0, tFog: 0.04, next: 25, snowMode: false };
    function rollWeather() {
      const si = Math.floor(state.phase) % 4;
      const P = [
        [0.4, 0.24, 0.24, 0.12], // spring: clear, cloudy, precip, fog
        [0.6, 0.26, 0.04, 0.1],
        [0.32, 0.26, 0.24, 0.18],
        [0.34, 0.24, 0.32, 0.1],
      ][si];
      let r = Math.random(),
        pick = 0;
      for (let i = 0; i < 4; i++) {
        r -= P[i];
        if (r <= 0) {
          pick = i;
          break;
        }
      }
      const q = Math.random();
      if (pick === 0) {
        wx.tCloud = 0.1 + 0.18 * q;
        wx.tRain = 0;
        wx.tFog = 0.03;
      } else if (pick === 1) {
        wx.tCloud = 0.52 + 0.3 * q;
        wx.tRain = 0;
        wx.tFog = 0.1;
      } else if (pick === 2) {
        wx.tCloud = 0.88;
        wx.tRain = 0.45 + 0.5 * q;
        wx.tFog = 0.3;
      } else {
        wx.tCloud = 0.45;
        wx.tRain = 0;
        wx.tFog = 0.6 + 0.35 * q;
      }
      wx.next = state.simT + 35 + Math.random() * 70;
    }
    function updateWeather(dt: number) {
      if (state.weatherMode === "clear") {
        wx.tCloud = 0.12;
        wx.tRain = 0;
        wx.tFog = 0.03;
      } else if (state.simT > wx.next) rollWeather();
      const k = Math.min(1, dt * state.timeScale * 0.045);
      wx.cloud += (wx.tCloud - wx.cloud) * k;
      wx.rain += (wx.tRain - wx.rain) * k;
      wx.fog += (wx.tFog - wx.fog) * k;
      wx.snowMode = env.snow > 0.45;
      const wet = wx.rain * (wx.snowMode ? 0 : 1);
      U.uWet.value += (wet - U.uWet.value) * Math.min(1, dt * 0.5);
    }

    // ========================= day/night + sky ===========================
    const _colA = new THREE.Color(),
      _colB = new THREE.Color(),
      _colC = new THREE.Color();
    const DAY_ZEN = C(0x3568b5),
      DAY_HOR = C(0xbdd2e7);
    const NIGHT_ZEN = C(0x050810),
      NIGHT_HOR = C(0x0d1322);
    const DUSK = C(0xff8f4a);
    const CLOUD_DAY = C(0xffffff),
      CLOUD_GRAY = C(0x8d97a3),
      CLOUD_NIGHT = C(0x161a24);
    const SUN_WARM = C(0xffd9a8),
      SUN_WHITE = C(0xfff6e8);

    function updateEnvironment(dt: number) {
      state.simT += dt * state.timeScale;
      state.tod = (state.tod + (dt * state.timeScale) / DAY_LEN) % 1;
      if (state.seasonMode === "auto") {
        state.phase = (state.phase + (dt * state.timeScale) / SEASON_LEN) % 4;
      } else {
        const target = state.seasonTarget + 0.5;
        const d = ((target - state.phase + 6) % 4) - 2;
        state.phase = (state.phase + clamp(d, -dt * 0.6, dt * 0.6) + 4) % 4;
      }
      U.uTime.value = state.simT;

      /* sun path */
      const th = (state.tod - 0.25) * TAU;
      U.uSunDir.value.set(Math.cos(th), Math.sin(th), 0.42).normalize();
      const sunY = U.uSunDir.value.y;
      env.sunElev = sunY;
      env.daylight = smoothstep(-0.09, 0.24, sunY);
      env.night = 1 - smoothstep(-0.16, -0.015, sunY);
      const duskGlow = Math.exp(-Math.abs(sunY) * 9) * smoothstep(-0.25, 0.02, sunY);
      skyUniforms.uMoonDir.value.set(-U.uSunDir.value.x, Math.max(0.25, -sunY + 0.3), -0.3).normalize();
      skyUniforms.uNight.value = env.night;

      const clearF = 1 - wx.cloud * 0.6 - wx.fog * 0.35;

      /* sky colors */
      _colA.lerpColors(NIGHT_ZEN, DAY_ZEN, env.daylight);
      _colB.lerpColors(NIGHT_HOR, DAY_HOR, env.daylight);
      _colB.lerp(DUSK, duskGlow * 0.75 * clearF);
      const grayT = clamp(wx.cloud * 0.45 + wx.fog * 0.55, 0, 0.85);
      _colC.copy(_colA);
      _colC.lerp(_colB, 0.55); // gray reference
      _colA.lerp(_colC, grayT * 0.6);
      skyUniforms.uZenith.value.copy(_colA);
      skyUniforms.uHorizon.value.copy(_colB);
      skyUniforms.uCloud.value = 0.22 + wx.cloud * 0.62;
      _colC.lerpColors(CLOUD_NIGHT, CLOUD_DAY, env.daylight);
      _colC.lerp(CLOUD_GRAY, wx.cloud * 0.7 * env.daylight);
      _colC.lerp(DUSK, duskGlow * 0.4);
      skyUniforms.uCloudCol.value.copy(_colC);

      /* fog */
      U.uFogColor.value.copy(_colB).lerp(skyUniforms.uZenith.value, 0.25);
      const fogD = QUAL[state.quality].fog + wx.fog * 0.0042 + wx.rain * 0.001;
      U.uFogDensity.value = fogD;
      (scene.fog as THREE.FogExp2).color.copy(U.uFogColor.value);
      (scene.fog as THREE.FogExp2).density = fogD;

      /* lights: sun by day, moon by night (the moon also drives the shadow rig) */
      const sunI = env.daylight * clearF;
      const moonI = env.night * (1 - wx.cloud * 0.65) * 0.3;
      _colA.lerpColors(SUN_WARM, SUN_WHITE, smoothstep(0.02, 0.35, sunY));
      _colA.lerp(DUSK, duskGlow * 0.6);
      U.uSunColor.value.copy(_colA).multiplyScalar(1.45 * sunI);
      _colC.setRGB(0.62, 0.72, 0.95).multiplyScalar(moonI);
      U.uSunColor.value.add(_colC);
      if (env.night > 0.001) U.uSunDir.value.lerp(skyUniforms.uMoonDir.value, env.night).normalize();
      U.uHemiSky.value
        .copy(skyUniforms.uZenith.value)
        .multiplyScalar(0.55 + 0.45 * env.daylight)
        .addScalar(0.012);
      U.uHemiSky.value.add(_colC.setRGB(0.045, 0.06, 0.1).multiplyScalar(env.night));
      U.uHemiGround.value.setRGB(0.16, 0.15, 0.12).multiplyScalar(env.daylight * clearF + 0.06);
      U.uHemiGround.value.add(_colC.setRGB(0.012, 0.016, 0.028).multiplyScalar(env.night));
      sunLight.color.copy(_colA);
      if (env.night > 0.001) sunLight.color.lerp(_colC.setRGB(0.62, 0.72, 0.95), env.night * 0.85);
      sunLight.intensity = 3.1 * sunI + moonI * 1.5;
      placeSunShadow();
      const dayF = smoothstep(0.04, 0.25, env.daylight + moonI * 1.2);
      U.uShadowOn.value += (dayF - U.uShadowOn.value) * Math.min(1, dt * 2.5);
      sunLight.castShadow = U.uShadowOn.value > 0.02;
      if (sunLight.shadow.map) U.uShadowMap.value = sunLight.shadow.map.texture;
      hemiLight.color.copy(U.uHemiSky.value).multiplyScalar(1.6);
      hemiLight.groundColor.copy(U.uHemiGround.value).multiplyScalar(1.6);
      hemiLight.intensity = 1.0;

      /* seasons -> shared uniforms */
      seasonMixLerp(PAL.grass, state.phase, U.uGrass.value);
      seasonMixLerp(PAL.grassAlt, state.phase, U.uGrassAlt.value);
      seasonMixLerp(PAL.leafA, state.phase, decidMat.uniforms.uLeafA.value);
      seasonMixLerp(PAL.leafB, state.phase, decidMat.uniforms.uLeafB.value);
      seasonMixLerp(PAL.conifA, state.phase, coniferMat.uniforms.uLeafA.value);
      seasonMixLerp(PAL.conifB, state.phase, coniferMat.uniforms.uLeafB.value);
      decidMat.uniforms.uLeafDensity.value = seasonMixLerp(PAL.leafDen, state.phase);
      env.snow = seasonMixLerp(PAL.snow, state.phase);
      U.uSnow.value = env.snow;
      U.uGrassGrow.value = 1 - env.snow * 0.78;
      U.uBloom.value = seasonMixLerp(FLOWER_SEASON, state.phase);
      flowerMesh.visible = U.uBloom.value > 0.03;

      /* headlights */
      const hlOn = sunY < 0.03 || wx.fog > 0.55 || wx.rain > 0.6;
      const hl = hlOn ? 1 : 0;
      U.uHL.value += (hl - U.uHL.value) * Math.min(1, dt * 3);
      for (const sp of hlSpots) sp.intensity = U.uHL.value * 40;
      for (const g of glowSprites) (g.material as THREE.SpriteMaterial).opacity = U.uHL.value * 0.85;
      headMat.emissiveIntensity = 0.25 + U.uHL.value * 2.4;
      tailMat.emissiveIntensity = 0.35 + U.uHL.value * 2.6;
      postGlow.value = U.uHL.value * 0.85 + env.night * 0.15;
    }

    // =========================== precipitation ===========================
    const RAIN_N = 800;
    const rainVel = 36;
    const rainPos = new Float32Array(RAIN_N * 3);
    const rainGeo = new THREE.BufferGeometry();
    const rainArr = new Float32Array(RAIN_N * 2 * 3);
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainArr, 3));
    const rainMatL = new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0, fog: true });
    const rainMesh = new THREE.LineSegments(rainGeo, rainMatL);
    rainMesh.frustumCulled = false;
    scene.add(rainMesh);
    for (let i = 0; i < RAIN_N; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 70;
      rainPos[i * 3 + 1] = Math.random() * 40;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }

    const SNOW_N = 1000;
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
    const snowMat = new THREE.PointsMaterial({ size: 0.22, map: snowTex, transparent: true, opacity: 0, depthWrite: false, fog: true, color: 0xffffff, sizeAttenuation: true });
    const snowMesh = new THREE.Points(snowGeo, snowMat);
    snowMesh.frustumCulled = false;
    scene.add(snowMesh);
    for (let i = 0; i < SNOW_N; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 64;
      snowPos[i * 3 + 1] = Math.random() * 30;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 64;
      snowSeed[i] = Math.random() * TAU;
    }

    function updatePrecip(dt: number) {
      const rI = wx.rain * (wx.snowMode ? 0 : 1);
      const sI = wx.rain * (wx.snowMode ? 1 : 0);
      rainMatL.opacity += (rI * 0.32 - rainMatL.opacity) * Math.min(1, dt * 2);
      snowMat.opacity += (sI * 0.85 - snowMat.opacity) * Math.min(1, dt * 2);
      const cx = camera.position.x,
        cy = camera.position.y,
        cz = camera.position.z;
      if (rainMatL.opacity > 0.01) {
        const wind = 4;
        for (let i = 0; i < RAIN_N; i++) {
          let y = rainPos[i * 3 + 1] - rainVel * dt;
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
      rainMesh.visible = rainMatL.opacity > 0.01;
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
          snowArr[i * 3] = cx + snowPos[i * 3] + Math.sin(t * 0.7 + snowSeed[i]) * 1.6;
          snowArr[i * 3 + 1] = cy + y;
          snowArr[i * 3 + 2] = cz + snowPos[i * 3 + 2] + Math.cos(t * 0.55 + snowSeed[i] * 1.7) * 1.4;
        }
        snowGeo.attributes.position.needsUpdate = true;
      }
      snowMesh.visible = snowMat.opacity > 0.01;
    }

    // =============================== audio ================================
    let AC: AudioContext | null = null,
      master: GainNode | null = null,
      engOsc: OscillatorNode | null = null,
      engOsc2: OscillatorNode | null = null,
      engSub: OscillatorNode | null = null,
      engFil: BiquadFilterNode | null = null,
      engGain: GainNode | null = null;
    let exhFil: BiquadFilterNode | null = null,
      exhGain: GainNode | null = null,
      engShiftT = 0,
      engGearPrev = 0;
    let windGain: GainNode | null = null,
      rainGain: GainNode | null = null,
      birdNext = 0;
    const GEAR_TOPS = [9, 15, 22, 30, 39, 49, 59, 69]; // m/s, 8-speed
    function initAudio() {
      if (AC) return;
      try {
        AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return;
      }
      master = AC.createGain();
      master.gain.value = state.muted ? 0 : state.vol * 0.9;
      const comp = AC.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(AC.destination);

      engFil = AC.createBiquadFilter();
      engFil.type = "lowpass";
      engFil.frequency.value = 260;
      engFil.Q.value = 0.6;
      engGain = AC.createGain();
      engGain.gain.value = 0;
      engOsc = AC.createOscillator();
      engOsc.type = "sawtooth";
      engOsc.frequency.value = 62;
      engOsc2 = AC.createOscillator();
      engOsc2.type = "sawtooth";
      engOsc2.frequency.value = 93;
      const o2G = AC.createGain();
      o2G.gain.value = 0.45;
      engSub = AC.createOscillator();
      engSub.type = "sine";
      engSub.frequency.value = 31;
      const subG = AC.createGain();
      subG.gain.value = 0.7;
      engOsc.connect(engFil);
      engOsc2.connect(o2G);
      o2G.connect(engFil);
      engSub.connect(subG);
      subG.connect(engFil);
      engFil.connect(engGain);
      engGain.connect(master);
      engOsc.start();
      engOsc2.start();
      engSub.start();

      const len = AC.sampleRate * 2;
      const buf = AC.createBuffer(1, len, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      const windSrc = AC.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      const windFil = AC.createBiquadFilter();
      windFil.type = "bandpass";
      windFil.frequency.value = 420;
      windFil.Q.value = 0.35;
      windGain = AC.createGain();
      windGain.gain.value = 0;
      windSrc.connect(windFil);
      windFil.connect(windGain);
      windGain.connect(master);
      windSrc.start();

      const rainSrc = AC.createBufferSource();
      rainSrc.buffer = buf;
      rainSrc.loop = true;
      rainSrc.playbackRate.value = 0.86;
      const rainFil = AC.createBiquadFilter();
      rainFil.type = "highpass";
      rainFil.frequency.value = 2600;
      rainGain = AC.createGain();
      rainGain.gain.value = 0;
      rainSrc.connect(rainFil);
      rainFil.connect(rainGain);
      rainGain.connect(master);
      rainSrc.start();

      const exhSrc = AC.createBufferSource();
      exhSrc.buffer = buf;
      exhSrc.loop = true;
      exhSrc.playbackRate.value = 0.6;
      exhFil = AC.createBiquadFilter();
      exhFil.type = "bandpass";
      exhFil.frequency.value = 760;
      exhFil.Q.value = 0.9;
      exhGain = AC.createGain();
      exhGain.gain.value = 0;
      exhSrc.connect(exhFil);
      exhFil.connect(exhGain);
      exhGain.connect(master);
      exhSrc.start();
    }
    function chirp() {
      if (!AC || !master) return;
      const t0 = AC.currentTime + 0.02;
      const notes = 2 + ((Math.random() * 4) | 0);
      const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
      const out = pan || master;
      if (pan) {
        pan.pan.value = Math.random() * 1.6 - 0.8;
        pan.connect(master);
      }
      for (let i = 0; i < notes; i++) {
        const t = t0 + i * (0.12 + Math.random() * 0.06);
        const o = AC.createOscillator(),
          g = AC.createGain();
        o.type = "sine";
        const f = 2100 + Math.random() * 1700;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * (1.12 + Math.random() * 0.3), t + 0.05);
        o.frequency.exponentialRampToValueAtTime(f * 0.88, t + 0.1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + 0.14);
      }
    }
    function updateAudio() {
      if (!AC || AC.state !== "running" || !engOsc || !engOsc2 || !engSub || !engFil || !engGain || !exhFil || !exhGain || !windGain || !rainGain) return;
      const t = AC.currentTime,
        sp = Math.abs(car.speed),
        th = Math.max(keyThrottle(), state.auto ? 0.4 : 0);
      /* rpm follows an 8-speed gearbox; shifts briefly dip the throttle */
      let g = 0;
      while (g < GEAR_TOPS.length - 1 && sp > GEAR_TOPS[g]) g++;
      const lo = g === 0 ? 0 : GEAR_TOPS[g - 1];
      const rpm = 1050 + clamp((sp - lo) / (GEAR_TOPS[g] - lo), 0, 1) * 5300;
      if (g !== engGearPrev) {
        engShiftT = t;
        engGearPrev = g;
      }
      const shiftDip = Math.max(0, 1 - (t - engShiftT) / 0.13);
      const fire = (rpm / 60) * 4; // V8 firing frequency
      engOsc.frequency.setTargetAtTime(fire, t, 0.04);
      engOsc2.frequency.setTargetAtTime(fire * 1.5 + 2, t, 0.04);
      engSub.frequency.setTargetAtTime(fire * 0.5, t, 0.04);
      engFil.frequency.setTargetAtTime(320 + rpm * 0.42 + th * 260, t, 0.08);
      const moving = sp > 0.3 || th > 0;
      const load = 0.35 + 0.65 * Math.abs(th);
      let eg = moving ? 0.03 + 0.05 * (rpm / 6350) + 0.045 * load * Math.min(sp / 12, 1) : 0.03;
      eg *= 1 - shiftDip * 0.4;
      engGain.gain.setTargetAtTime(eg, t, 0.12);
      const burble = th < 0.05 && rpm > 3000 ? 0.018 + 0.014 * Math.random() : 0;
      exhGain.gain.setTargetAtTime(0.012 * load * Math.min(sp / 10, 1) + burble, t, 0.1);
      exhFil.frequency.setTargetAtTime(500 + rpm * 0.22, t, 0.1);
      windGain.gain.setTargetAtTime(Math.pow(sp / MAX_SPEED, 2) * 0.42 + wx.rain * 0.02, t, 0.2);
      rainGain.gain.setTargetAtTime(wx.rain * (wx.snowMode ? 0.015 : 0.2), t, 0.4);
      const si = Math.floor(state.phase) % 4;
      if ((si === 0 || si === 1) && env.daylight > 0.55 && state.simT > birdNext) {
        if (Math.random() < 0.65) chirp();
        birdNext = state.simT + 2.5 + Math.random() * 7;
      }
    }
    function setVolume() {
      if (master && AC) master.gain.setTargetAtTime(state.muted ? 0 : state.vol * 0.9, AC.currentTime, 0.05);
    }
    function toggleMute() {
      state.muted = !state.muted;
      setVolume();
    }
    // ================================ UI ==================================
    const panelEl = q<HTMLDivElement>(".wander-panel");
    function togglePanel() {
      panelEl.classList.toggle("wander-hidden");
    }
    q<HTMLButtonElement>(".wander-gear-btn").addEventListener("click", togglePanel);
    q<HTMLButtonElement>(".wander-close-panel").addEventListener("click", togglePanel);

    function markOn(container2: Element, attr: string, val: string | number) {
      for (const b of container2.querySelectorAll("button")) b.classList.toggle("wander-on", (b as HTMLElement).dataset[attr] === String(val));
    }
    const autoChipEl = q<HTMLDivElement>(".wander-auto-chip");
    function setAuto(on: boolean, _silent?: boolean) {
      state.auto = on;
      autoChipEl.classList.toggle("wander-off", !on);
      autoChipEl.textContent = on ? "AUTO-DRIVE" : "AUTO-DRIVE OFF";
    }
    autoChipEl.addEventListener("click", () => setAuto(!state.auto));
    const camBtnsEl = q<HTMLDivElement>(".wander-cam-btns");
    function setCam(m: number) {
      state.camMode = m;
      markOn(camBtnsEl, "c", m);
    }
    camBtnsEl.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.c !== undefined) setCam(+t.dataset.c);
    });
    const seasonBtnsEl = q<HTMLDivElement>(".wander-season-btns");
    function setSeason(s: string) {
      if (s === "auto") state.seasonMode = "auto";
      else {
        state.seasonMode = "manual";
        state.seasonTarget = +s;
      }
      markOn(seasonBtnsEl, "s", s);
    }
    seasonBtnsEl.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.s !== undefined) setSeason(t.dataset.s);
    });
    const wxBtnsEl = q<HTMLDivElement>(".wander-wx-btns");
    wxBtnsEl.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.w !== undefined) {
        state.weatherMode = t.dataset.w;
        markOn(wxBtnsEl, "w", state.weatherMode);
      }
    });
    const qualBtnsEl = q<HTMLDivElement>(".wander-qual-btns");
    qualBtnsEl.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.dataset.q !== undefined) {
        state.quality = +t.dataset.q;
        markOn(qualBtnsEl, "q", state.quality);
        applySize();
        queueGrassRefill(car.s);
      }
    });
    const timeScaleEl = q<HTMLInputElement>(".wander-time-scale");
    const timeScaleValEl = q<HTMLSpanElement>(".wander-time-scale-val");
    timeScaleEl.addEventListener("input", (e) => {
      state.timeScale = +(e.target as HTMLInputElement).value;
      timeScaleValEl.textContent = state.timeScale + "×";
    });
    const volEl = q<HTMLInputElement>(".wander-vol");
    const volValEl = q<HTMLSpanElement>(".wander-vol-val");
    volEl.addEventListener("input", (e) => {
      state.vol = +(e.target as HTMLInputElement).value;
      state.muted = false;
      volValEl.textContent = String(Math.round(state.vol * 100));
      setVolume();
    });
    const seedValEl = q<HTMLSpanElement>(".wander-seed-val");
    seedValEl.textContent = String(SEED);
    q<HTMLAnchorElement>(".wander-new-seed").addEventListener("click", () => {
      window.location.search = "?seed=" + ((Math.random() * 1e9) | 0);
    });

    const speedEl = q<HTMLDivElement>(".wander-speed"),
      seasonChipEl = q<HTMLDivElement>(".wander-season-chip"),
      clockChipEl = q<HTMLDivElement>(".wander-clock-chip"),
      wxChipEl = q<HTMLDivElement>(".wander-wx-chip");
    let hudNext = 0;
    function updateHUD(t: number) {
      if (t < hudNext) return;
      hudNext = t + 0.12;
      speedEl.textContent = String(Math.round(Math.abs(car.speed) * 3.6));
      const si = Math.floor(state.phase) % 4;
      seasonChipEl.textContent = SEASON_EMOJI[si] + " " + SEASON_NAMES[si];
      const hrs = state.tod * 24;
      const h = Math.floor(hrs),
        m = Math.floor((hrs - h) * 60);
      clockChipEl.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      let icon = "☀️";
      if (env.night > 0.5) icon = "🌙";
      if (wx.cloud > 0.5) icon = "⛅";
      if (wx.fog > 0.5) icon = "🌫️";
      if (wx.rain > 0.25) icon = wx.snowMode ? "❄️" : "🌧️";
      wxChipEl.textContent = icon;
    }

    // ============================== start =================================
    extendRoadTo(3000);
    {
      const p = road.pts[20];
      car.x = p.x;
      car.z = p.z;
      car.heading = Math.atan2(p.dx, p.dz);
      car.velDir = car.heading;
      car.y = p.y;
      car.speed = 14;
      camPos.set(p.x - p.dx * 20, p.y + 9, p.z - p.dz * 20);
    }
    updateChunks(car.x, car.z, 400); // synchronous warm-up around spawn
    ensureRoadPieces(car.s);

    const startEl = q<HTMLDivElement>(".wander-start");
    const coverEl = q<HTMLDivElement>(".wander-cover");
    const helpEl = q<HTMLDivElement>(".wander-help");
    q<HTMLButtonElement>(".wander-start-btn").addEventListener("click", () => {
      state.started = true;
      initAudio();
      if (AC && (AC as AudioContext).state === "suspended") (AC as AudioContext).resume();
      setAuto(true);
      setCam(0);
      startEl.style.transition = "opacity .8s ease";
      startEl.style.opacity = "0";
      setT(() => startEl.classList.add("wander-hidden"), 850);
      setT(() => {
        helpEl.style.opacity = "0";
      }, 14000);
    });
    setT(() => {
      coverEl.style.opacity = "0";
    }, 700);
    setT(() => coverEl.classList.add("wander-hidden"), 2500);

    // ====================== adaptive resolution ===========================
    let fpsAcc = 0,
      fpsN = 0,
      fpsNext = 4;
    function adaptQuality(dt: number, t: number) {
      fpsAcc += dt;
      fpsN++;
      if (t < fpsNext) return;
      const avg = fpsN / Math.max(fpsAcc, 1e-4);
      fpsAcc = 0;
      fpsN = 0;
      fpsNext = t + 3;
      if (avg < 42 && renderScale > 0.55) {
        renderScale = Math.max(0.55, renderScale * 0.88);
        applySize();
      } else if (avg > 57 && renderScale < 1) {
        renderScale = Math.min(1, renderScale * 1.08);
        applySize();
      }
    }

    // ============================ main loop ===============================
    applySize();
    let last = performance.now();
    let wallT = 0;
    renderer.setAnimationLoop((now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      wallT += dt;

      updateCar(dt);
      ensureRoadPieces(car.s);
      updateChunks(car.x, car.z, 5);
      processGrassJobs(2.5);
      updateEnvironment(dt);
      updateWeather(dt);
      updatePrecip(dt);
      updateCamera(dt, wallT);
      updateAudio();
      updateHUD(wallT);
      adaptQuality(dt, wallT);

      composer.render();
    });

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      for (const id of timers) window.clearTimeout(id);
      if (AC) AC.close();

      for (const mesh of roadPieces.values()) mesh.geometry.dispose();
      for (const ch of chunks.values()) {
        for (const m of ch.meshes) {
          const mesh = m as THREE.Mesh | THREE.InstancedMesh;
          if (mesh.geometry !== coniferGeo && mesh.geometry !== decidGeo && mesh.geometry !== rockGeo) mesh.geometry.dispose();
        }
      }
      postGeo.dispose();
      postMat.dispose();
      coniferGeo.dispose();
      decidGeo.dispose();
      rockGeo.dispose();
      coniferMat.dispose();
      decidMat.dispose();
      rockMat.dispose();
      terrainMat.dispose();
      roadMat.dispose();
      grassGeo.dispose();
      grassMat.dispose();
      flowerGeo.dispose();
      flowerMat.dispose();
      flowerTex.dispose();
      rainGeo.dispose();
      rainMatL.dispose();
      snowGeo.dispose();
      snowMat.dispose();
      snowTex.dispose();
      skyMesh.geometry.dispose();
      skyMat.dispose();
      glowTex.dispose();
      bodyMat.dispose();
      glassMat.dispose();
      darkMat.dispose();
      alloyMat.dispose();
      headMat.dispose();
      tailMat.dispose();
      composer.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  return (
    <div ref={containerRef} className="wander-shell">
      <div className="wander-vignette" />
      <div className="wander-cover" />

      <div className="wander-hud">
        <div className="wander-speed">0</div>
        <div className="wander-speed-unit">KM/H</div>
        <div className="wander-auto-chip">AUTO-DRIVE</div>
      </div>

      <div className="wander-chips">
        <div className="wander-chip wander-season-chip">Spring</div>
        <div className="wander-chip wander-clock-chip">08:40</div>
        <div className="wander-chip wander-wx-chip">☀️</div>
        <div className="wander-chip wander-gear-btn">⚙︎</div>
      </div>

      <div className="wander-help">
        <b>W/S</b> drive · <b>A/D</b> steer · <b>Space</b> brake · <b>T</b> auto-drive · <b>C</b> camera · <b>R</b> reset · <b>M</b> sound · <b>Esc</b> settings
      </div>

      <div className="wander-panel wander-hidden">
        <h2>
          SETTINGS <button className="wander-close-panel">×</button>
        </h2>
        <div className="wander-row">
          <label>Time speed</label>
          <input className="wander-time-scale" type="range" min="0" max="8" step="0.25" defaultValue="1" />
          <span className="wander-val wander-time-scale-val">1×</span>
        </div>
        <div className="wander-row">
          <label>Season</label>
          <div className="wander-btns wander-season-btns">
            <button data-s="auto" className="wander-on">
              Auto
            </button>
            <button data-s="0">Spring</button>
            <button data-s="1">Summer</button>
            <button data-s="2">Autumn</button>
            <button data-s="3">Winter</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Weather</label>
          <div className="wander-btns wander-wx-btns">
            <button data-w="auto" className="wander-on">
              Auto
            </button>
            <button data-w="clear">Clear</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Camera</label>
          <div className="wander-btns wander-cam-btns">
            <button data-c="0" className="wander-on">
              Chase
            </button>
            <button data-c="1">Hood</button>
            <button data-c="2">Cinematic</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Quality</label>
          <div className="wander-btns wander-qual-btns">
            <button data-q="0">Low</button>
            <button data-q="1" className="wander-on">
              Medium
            </button>
            <button data-q="2">High</button>
          </div>
        </div>
        <div className="wander-row">
          <label>Volume</label>
          <input className="wander-vol" type="range" min="0" max="1" step="0.05" defaultValue="0.8" />
          <span className="wander-val wander-vol-val">80</span>
        </div>
        <div className="wander-row-small">
          world seed <span className="wander-seed-val" />
          &nbsp;·&nbsp;
          <a className="wander-new-seed">new world ↻</a>
        </div>
      </div>

      <div className="wander-start">
        <div className="wander-start-card">
          <h1>WANDER</h1>
          <p>an endless scenic drive through the seasons</p>
          <button className="wander-start-btn">BEGIN DRIVE</button>
          <div className="wander-tiny">procedural &amp; infinite · sound on 🎧</div>
        </div>
      </div>
    </div>
  );
}
