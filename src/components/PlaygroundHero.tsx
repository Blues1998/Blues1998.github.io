import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";

type PlaygroundHeroProps = { heading: string; copy: string };

function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}

function eggR(phi: number) { return 1.18 * Math.sin(phi) * (1 + 0.19 * (1 - Math.cos(phi))); }
function eggY(phi: number) { return 1.85 * Math.cos(phi); }

const N      = 12;
const AZ     = 80;   // azimuthal grid steps
const EL     = 52;   // elevation grid steps
const THICK  = 0.06; // shell thickness

// Voronoi seed points in normalised [0,1]x[0,1] (azimuth_t, elevation_t)
const SEEDS: [number, number][] = [
  [0.04, 0.12], [0.22, 0.05], [0.48, 0.14], [0.70, 0.07], [0.88, 0.20],
  [0.82, 0.52], [0.92, 0.78], [0.60, 0.88], [0.32, 0.80], [0.10, 0.68],
  [0.18, 0.40], [0.52, 0.48],
];

// Sperm / fertilisation constants
const NUM_SPERMS  = 20;
const EGG_RADIUS  = 1.35;
const ENTRY_RADIUS = 0.28;

function buildPieceGeos(): { geos: THREE.BufferGeometry[]; midAngles: number[] } {
  const nearest = (az_t: number, el_t: number): number => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const da = Math.min(Math.abs(az_t - SEEDS[i][0]), 1 - Math.abs(az_t - SEEDS[i][0]));
      const de = el_t - SEEDS[i][1];
      const d  = da * da * 3.0 + de * de;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

  const V = (ai: number, ei: number, inner: boolean): [number, number, number] => {
    const theta = (ai / AZ) * Math.PI * 2;
    const phi   = (ei / EL) * Math.PI;
    const r     = inner ? Math.max(0.008, eggR(phi) - THICK) : eggR(phi);
    return [r * Math.cos(theta), eggY(phi), r * Math.sin(theta)];
  };

  const pv: number[][] = Array.from({ length: N }, () => []);
  const push = (p: number, a: [number,number,number], b: [number,number,number], c: [number,number,number]) => {
    pv[p].push(...a, ...b, ...c);
  };

  for (let ai = 0; ai < AZ; ai++) {
    for (let ei = 0; ei < EL; ei++) {
      const p = nearest((ai + 0.5) / AZ, (ei + 0.5) / EL);
      const o00 = V(ai, ei, false),     o10 = V(ai+1, ei, false);
      const o01 = V(ai, ei+1, false),   o11 = V(ai+1, ei+1, false);
      push(p, o00, o10, o11); push(p, o00, o11, o01);
      const i00 = V(ai, ei, true),      i10 = V(ai+1, ei, true);
      const i01 = V(ai, ei+1, true),    i11 = V(ai+1, ei+1, true);
      push(p, i00, i11, i10); push(p, i00, i01, i11);
    }
  }

  for (let ai = 0; ai < AZ; ai++) {
    for (let ei = 0; ei < EL; ei++) {
      const pA = nearest((ai + 0.5) / AZ, (ei + 0.5) / EL);
      const pB = nearest((ai + 1.5) / AZ, (ei + 0.5) / EL);
      const pC = nearest((ai + 0.5) / AZ, (ei + 1.5) / EL);
      if (pA !== pB) {
        const oo0 = V(ai+1, ei,   false), oi0 = V(ai+1, ei,   true);
        const oo1 = V(ai+1, ei+1, false), oi1 = V(ai+1, ei+1, true);
        push(pA, oo0, oi0, oi1); push(pA, oo0, oi1, oo1);
        push(pB, oo0, oi1, oi0); push(pB, oo0, oo1, oi1);
      }
      if (pA !== pC) {
        const oo0 = V(ai,   ei+1, false), oi0 = V(ai,   ei+1, true);
        const oo1 = V(ai+1, ei+1, false), oi1 = V(ai+1, ei+1, true);
        push(pA, oo0, oo1, oi1); push(pA, oo0, oi1, oi0);
        push(pC, oo0, oi1, oo1); push(pC, oo0, oi0, oi1);
      }
    }
  }

  const geos = pv.map(verts => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    geo.computeVertexNormals();
    return geo;
  });

  const midAngles = SEEDS.map(([az_t]) => az_t * Math.PI * 2);
  return { geos, midAngles };
}

interface Piece { mesh: THREE.Mesh; angle: number; breakAt: number; scatter: THREE.Vector3; vel: THREE.Vector3; angVel: THREE.Euler }

type SpermPhase = 'swim' | 'enter' | 'inside' | 'dead';
interface SpermData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  tailPhase: number;
  phase: SpermPhase;
  speed: number;
  opacity: number;
}

type FertPhase = 'none' | 'entering' | 'fertilized' | 'hatching' | 'chick';

interface ChickState {
  group: THREE.Group;
  body: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  velY: number;
  walkDir: 1 | -1;
  walkTime: number;
  landed: boolean;
  bounceCount: number;
  landY: number;
}

function buildChick(): ChickState {
  const group = new THREE.Group();

  const yMat  = new THREE.MeshPhysicalMaterial({ color: 0xf0d060, roughness: 0.5, metalness: 0 });
  const bMat  = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.7, metalness: 0 });
  const oMat  = new THREE.MeshPhysicalMaterial({ color: 0xff6600, roughness: 0.4, metalness: 0 });
  const wMat  = new THREE.MeshPhysicalMaterial({ color: 0xe8c840, roughness: 0.5, metalness: 0 });
  const lMat  = new THREE.MeshPhysicalMaterial({ color: 0xff9900, roughness: 0.5, metalness: 0 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), yMat);
  body.scale.set(1, 0.85, 0.9);
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), yMat);
  head.position.set(0, 0.58, 0.08);
  group.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.055, 6, 4);
  const eyeL = new THREE.Mesh(eyeGeo, bMat);
  eyeL.position.set(-0.14, 0.66, 0.29);
  const eyeR = new THREE.Mesh(eyeGeo, bMat);
  eyeR.position.set(0.14, 0.66, 0.29);
  group.add(eyeL, eyeR);

  // Beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 6), oMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.56, 0.42);
  group.add(beak);

  // Wings
  const wingGeo = new THREE.BoxGeometry(0.12, 0.28, 0.07);
  const wingL = new THREE.Mesh(wingGeo, wMat);
  wingL.position.set(-0.52, 0.05, 0);
  const wingR = new THREE.Mesh(wingGeo, wMat);
  wingR.position.set(0.52, 0.05, 0);
  group.add(wingL, wingR);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.28);
  const legL = new THREE.Mesh(legGeo, lMat);
  legL.position.set(-0.18, -0.65, 0);
  const legR = new THREE.Mesh(legGeo, lMat);
  legR.position.set(0.18, -0.65, 0);
  group.add(legL, legR);

  // Feet
  const footGeo = new THREE.BoxGeometry(0.18, 0.04, 0.13);
  const footL = new THREE.Mesh(footGeo, lMat);
  footL.position.set(-0.18, -0.82, 0.04);
  const footR = new THREE.Mesh(footGeo, lMat);
  footR.position.set(0.18, -0.82, 0.04);
  group.add(footL, footR);

  group.scale.setScalar(0); // start invisible, scaled up later

  return { group, body, legL, legR, wingL, wingR, velY: 0, walkDir: 1, walkTime: 0, landed: false, bounceCount: 0, landY: -3.0 };
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export default function PlaygroundHero({ heading, copy }: PlaygroundHeroProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const scrollRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => setReducedMotion(mq.matches); upd();
    mq.addEventListener("change", upd); return () => mq.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    if (window.location.hash === "#playground-gallery") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const shell = shellRef.current; if (!shell) return;
      const rect  = shell.getBoundingClientRect();
      const scrollRange = window.innerHeight * 2.2;
      const prog  = Math.min(Math.max(-rect.top / scrollRange, 0), 1);
      setScrollProgress(prog); scrollRef.current = prog;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  useEffect(() => {
    if (reducedMotion) { setFallbackMode(true); return; }
    let disposed = false;

    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x060e1a, 0.022);
    const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x060e1a, 1);

    const canvas = renderer.domElement;
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;display:block;pointer-events:none;";
    document.body.appendChild(canvas);
    setFallbackMode(false);

    // ── Lights ────────────────────────────────────────────────────────────────
    const ambient  = new THREE.AmbientLight(0x5566aa, 5.5);
    const keyL     = new THREE.PointLight(0xffeebb, 38, 60, 2);
    const rimL     = new THREE.PointLight(0x3366ff, 20, 55, 2);
    const yolkL    = new THREE.PointLight(0xff8800,  8,  9, 2);
    keyL.position.set(4, 5, 9);
    rimL.position.set(-5, -2, 3);
    scene.add(ambient, keyL, rimL, yolkL);

    const root = new THREE.Group();
    scene.add(root);

    // ── Yolk ──────────────────────────────────────────────────────────────────
    const yolkGeo = new THREE.SphereGeometry(0.56, 40, 40);
    const yolkMat = new THREE.MeshPhysicalMaterial({
      color: 0xff7800, emissive: 0xff4400, emissiveIntensity: 1.8,
      roughness: 0.12, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.04,
      transparent: true, opacity: 1.0,
    });
    const yolk = new THREE.Mesh(yolkGeo, yolkMat);
    root.add(yolk);

    // ── Albumen ───────────────────────────────────────────────────────────────
    const albGeo = new THREE.SphereGeometry(0.82, 32, 32);
    const albMat = new THREE.MeshPhysicalMaterial({
      color: 0xddeeff, roughness: 0.05, metalness: 0.0,
      transparent: true, opacity: 0.0, transmission: 0.75,
      clearcoat: 0.95, clearcoatRoughness: 0.04,
    });
    const albumen = new THREE.Mesh(albGeo, albMat);
    root.add(albumen);

    // ── Shell pieces (Voronoi) ────────────────────────────────────────────────
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4854a,
      emissive: 0x7a2e08, emissiveIntensity: 0.45,
      roughness: 0.44, metalness: 0.0,
      clearcoat: 0.25, clearcoatRoughness: 0.28,
    });

    const { geos: pieceGeos, midAngles } = buildPieceGeos();
    const pr  = seededRng(0xe991234);
    const pieces: Piece[] = [];

    const breaks = SEEDS.map((_, i) => i % 2 === 0
      ? 0.14 + (i / N) * 0.24
      : 0.38 + ((i - 1) / N) * 0.22,
    );

    for (let i = 0; i < N; i++) {
      const mesh = new THREE.Mesh(pieceGeos[i], shellMat);
      root.add(mesh);
      const angle = midAngles[i];
      const el_t  = SEEDS[i][1];
      pieces.push({
        mesh, angle,
        breakAt: breaks[i],
        scatter: new THREE.Vector3(
          Math.cos(angle) * (0.9 + pr() * 0.5),
          (el_t - 0.5) * 1.8 + (pr() - 0.5) * 0.6,
          Math.sin(angle) * (0.9 + pr() * 0.5),
        ).normalize(),
        vel: new THREE.Vector3(),
        angVel: new THREE.Euler(
          (pr() - 0.5) * 0.08, (pr() - 0.5) * 0.07, (pr() - 0.5) * 0.05,
        ),
      });
    }

    // ── Particles ─────────────────────────────────────────────────────────────
    const PC  = 380;
    const pPos = new Float32Array(PC * 3);
    const pSct = new Float32Array(PC * 3);
    const pVel = new Float32Array(PC * 3);
    const pcr  = seededRng(0xf00d);
    for (let i = 0; i < PC; i++) {
      const phi   = pcr() * Math.PI;
      const theta = pcr() * Math.PI * 2;
      const ro    = eggR(phi);
      pPos[i*3]   = ro * Math.cos(theta);
      pPos[i*3+1] = eggY(phi);
      pPos[i*3+2] = ro * Math.sin(theta);
      const sd = new THREE.Vector3(Math.cos(theta) + (pcr()-0.5)*0.5, (pcr()-0.3)*1.0, Math.sin(theta) + (pcr()-0.5)*0.5).normalize();
      pSct[i*3] = sd.x; pSct[i*3+1] = sd.y; pSct[i*3+2] = sd.z;
    }
    const pBase = new Float32Array(pPos);
    const pGeo  = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xffe8b0, size: 0.038, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
    root.add(new THREE.Points(pGeo, pMat));

    // ── Ambient dust ──────────────────────────────────────────────────────────
    const DC = 180;
    const dPos = new Float32Array(DC * 3);
    const dVel = new Float32Array(DC * 3);
    const dSeed = seededRng(0xabcd1234);
    for (let i = 0; i < DC; i++) {
      const base = i * 3;
      dPos[base] = (dSeed() - 0.5) * 12;
      dPos[base + 1] = (dSeed() - 0.5) * 8;
      dPos[base + 2] = (dSeed() - 0.5) * 7;
      dVel[base] = (dSeed() - 0.5) * 0.0035;
      dVel[base + 1] = 0.001 + dSeed() * 0.0025;
      dVel[base + 2] = (dSeed() - 0.5) * 0.0025;
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    const dMat = new THREE.PointsMaterial({
      color: 0xbfd9ff, size: 0.028, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const dust = new THREE.Points(dGeo, dMat);
    root.add(dust);

    // ── Micro fragments ───────────────────────────────────────────────────────
    const MC = 120;
    const mPos = new Float32Array(MC * 3);
    const mBase = new Float32Array(MC * 3);
    const mDir = new Float32Array(MC * 3);
    const mf = seededRng(0x51ced);
    for (let i = 0; i < MC; i++) {
      const base = i * 3;
      const phi = mf() * Math.PI;
      const theta = mf() * Math.PI * 2;
      const radius = eggR(phi) * (0.94 + mf() * 0.22);
      mBase[base] = radius * Math.cos(theta);
      mBase[base + 1] = eggY(phi) * (0.9 + mf() * 0.16);
      mBase[base + 2] = radius * Math.sin(theta);
      mPos[base] = mBase[base]; mPos[base + 1] = mBase[base + 1]; mPos[base + 2] = mBase[base + 2];
      const drift = new THREE.Vector3(
        Math.cos(theta) + (mf() - 0.5) * 0.4,
        (mf() - 0.2) * 1.2,
        Math.sin(theta) + (mf() - 0.5) * 0.4,
      ).normalize();
      mDir[base] = drift.x; mDir[base + 1] = drift.y; mDir[base + 2] = drift.z;
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
    const mMat = new THREE.PointsMaterial({
      color: 0xffd7aa, size: 0.02, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    root.add(new THREE.Points(mGeo, mMat));

    // ── Sperm system ──────────────────────────────────────────────────────────
    const spermRng = seededRng(0xbee1234);
    const sperms: SpermData[] = [];

    const spermHeadGeo = new THREE.SphereGeometry(1, 8, 6);
    const spermMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5e6c8, emissive: 0xd4b890, emissiveIntensity: 0.25,
      roughness: 0.45, metalness: 0, clearcoat: 0.3,
    });
    const spermMesh = new THREE.InstancedMesh(spermHeadGeo, spermMat, NUM_SPERMS);
    spermMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(spermMesh);

    const spermTails: THREE.Line[] = [];
    const spermTailMats: THREE.LineBasicMaterial[] = [];

    const XAXIS = new THREE.Vector3(1, 0, 0);
    const spermDummy = new THREE.Object3D();

    for (let i = 0; i < NUM_SPERMS; i++) {
      // Spawn far away, 5-10 s travel time at their speed
      const theta = spermRng() * Math.PI * 2;
      const phi   = Math.acos(2 * spermRng() - 1);
      const radius = 10.0 + spermRng() * 5.0;
      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) * 0.65,
        radius * Math.sin(phi) * Math.sin(theta),
      );
      const toCenter = pos.clone().negate().normalize();
      sperms.push({
        pos,
        vel: toCenter.clone().multiplyScalar(0.0008 + spermRng() * 0.0006),
        tailPhase: spermRng() * Math.PI * 2,
        phase: 'swim',
        speed: 0.0018 + spermRng() * 0.0014,
        opacity: 0.0,   // fade in as they approach
      });

      // 7-point tail line
      const tailPosArr = new Float32Array(7 * 3);
      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPosArr, 3));
      const tailMat = new THREE.LineBasicMaterial({ color: 0xf0dab0, transparent: true, opacity: 0.55 });
      const tail = new THREE.Line(tailGeo, tailMat);
      scene.add(tail);
      spermTails.push(tail);
      spermTailMats.push(tailMat);
    }

    // ── Fertilisation state ───────────────────────────────────────────────────
    let fertPhase: FertPhase = 'none';
    let fertTime  = 0;
    let frozenSp  = 0;
    let enteringId = -1;
    let chickState: ChickState | null = null;

    // ── Pointer ───────────────────────────────────────────────────────────────
    const ptr  = { x: 0, y: 0 };
    const ndc  = new THREE.Vector2();
    const ray  = new THREE.Raycaster();
    const lcur = new THREE.Vector3();
    const onPtr = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.y = -((e.clientY / window.innerHeight) * 2 - 1);
      shellRef.current?.style.setProperty("--hero-pointer-x", `${(e.clientX / window.innerWidth) * 100}%`);
      shellRef.current?.style.setProperty("--hero-pointer-y", `${(e.clientY / window.innerHeight) * 100}%`);
    };
    const onTch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        ptr.x = (t.clientX / window.innerWidth) * 2 - 1;
        ptr.y = -((t.clientY / window.innerHeight) * 2 - 1);
        shellRef.current?.style.setProperty("--hero-pointer-x", `${(t.clientX / window.innerWidth) * 100}%`);
        shellRef.current?.style.setProperty("--hero-pointer-y", `${(t.clientY / window.innerHeight) * 100}%`);
      }
    };
    window.addEventListener("pointermove", onPtr);
    window.addEventListener("touchmove",   onTch, { passive: true });

    const resize = () => { renderer.setSize(window.innerWidth, window.innerHeight, true); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); };
    requestAnimationFrame(() => { if (!disposed) resize(); });
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(() => { if (!disposed) resize(); });
    if (shellRef.current) ro.observe(shellRef.current);

    // ── Animate ───────────────────────────────────────────────────────────────
    const clock  = new THREE.Clock();
    const SCATTER = 8.0, REPEL_R = 2.2;
    let prevSp = 0;

    const animate = () => {
      if (disposed) return;
      const t  = clock.getElapsedTime();
      const sp = scrollRef.current;
      const scrollingUp = sp < prevSp;
      prevSp = sp;

      // Canvas opacity: fade based on real scroll so the user can scroll through to cards.
      // During fertilisation/hatching keep full opacity; once chick is walking let normal fade resume.
      if (fertPhase === 'fertilized' || fertPhase === 'hatching') {
        canvas.style.opacity = '1';
      } else {
        canvas.style.opacity = Math.max(0, 1 - Math.max(0, sp - 0.72) * 4.5).toFixed(3);
      }
      canvas.style.zIndex = '0';

      root.rotation.y = t * 0.13 + ptr.x * 0.18;
      root.rotation.x = ptr.y * 0.09 + Math.sin(t * 0.3) * 0.018;

      // Effective scroll for piece physics (frozen during fertilisation sequence)
      const effectiveSp = (fertPhase === 'fertilized' || fertPhase === 'hatching' || fertPhase === 'chick')
        ? frozenSp : sp;

      const crack  = smoothstep(0.05, 0.9, effectiveSp);
      const crisis = smoothstep(0.35, 0.9, effectiveSp);

      keyL.position.set(Math.sin(t * 0.34) * 5 + 2, Math.cos(t * 0.22) * 3 + 5, 9 + Math.sin(t * 0.28) * 2);
      keyL.intensity = 34 + crack * 6 + Math.sin(t * 0.6) * (6 + crack * 4);
      rimL.intensity = 15 + crack * 9 + Math.sin(t * 0.4 + 1.2) * 4;
      ambient.intensity = 4.7 + crack * 1.5;

      // Yolk: flash on fertilisation, then fade during hatching
      if (fertPhase === 'fertilized') {
        const flashFade = Math.min(1, (t - fertTime) / 0.6);
        yolkL.intensity = 180 * (1 - flashFade) + 8;
        yolkMat.emissiveIntensity = 8 + (1 - flashFade) * 12;
      } else if (fertPhase === 'hatching' || fertPhase === 'chick') {
        const hatchStart = fertTime + 0.8;
        const fadeOut = Math.min(1, (t - hatchStart) / 0.5);
        yolkMat.opacity = Math.max(0, 1 - fadeOut);
        yolkL.intensity = Math.max(0, 8 * (1 - fadeOut));
        albMat.opacity  = Math.max(0, albMat.opacity - 0.008);
      } else {
        yolkMat.emissiveIntensity = 1.8 + crack * 4.5 + Math.sin(t * 8) * crisis * 1.2;
        yolkL.intensity = 6 + crack * 22 + Math.random() * crisis * 14;
        yolkL.color.setRGB(1.0, 0.47 - crisis * 0.22, 0);
        yolk.position.set(
          Math.sin(t * 6.2) * crisis * 0.13 + (Math.random() - 0.5) * crisis * 0.07,
          Math.cos(t * 5.4) * crisis * 0.11, 0,
        );
        yolk.scale.setScalar(1 + crack * 0.12 + Math.sin(t * 9) * crisis * 0.06);

        // Albumen (only during normal break path)
        const albFade = smoothstep(0.18, 0.55, effectiveSp);
        const albDrip = smoothstep(0.50, 0.88, effectiveSp);
        albMat.opacity = albFade * 0.68;
        albumen.position.y = -albDrip * 3.6;
        albumen.scale.set(1 + albDrip * 0.8, 1 - albDrip * 0.5, 1 + albDrip * 0.8);
      }

      // Particles
      const pAct = smoothstep(0.08, 0.85, effectiveSp);
      pMat.opacity = pAct * 0.82;
      const pArr = pGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < PC; i++) {
        const s  = i * 3;
        const tx = pBase[s]   + pSct[s]   * pAct * SCATTER * (0.7 + (i % 7) * 0.06);
        const ty = pBase[s+1] + pSct[s+1] * pAct * SCATTER * (0.7 + (i % 5) * 0.07);
        const tz = pBase[s+2] + pSct[s+2] * pAct * SCATTER * (0.7 + (i % 6) * 0.06);
        pVel[s]   += (tx - pArr[s])   * 0.04; pVel[s]   *= 0.78; pArr[s]   += pVel[s];
        pVel[s+1] += (ty - pArr[s+1]) * 0.04; pVel[s+1] *= 0.78; pArr[s+1] += pVel[s+1];
        pVel[s+2] += (tz - pArr[s+2]) * 0.04; pVel[s+2] *= 0.78; pArr[s+2] += pVel[s+2];
      }
      pGeo.attributes.position.needsUpdate = true;

      // Ambient dust
      dMat.opacity = 0.18 + crack * 0.12;
      const dArr = dGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < DC; i++) {
        const base = i * 3;
        dArr[base]     += dVel[base]     + ptr.x * 0.0009;
        dArr[base + 1] += dVel[base + 1] + Math.sin(t * 0.5 + i * 0.4) * 0.0007;
        dArr[base + 2] += dVel[base + 2] + ptr.y * 0.0006;
        if (dArr[base + 1] > 4.8)  dArr[base + 1] = -4.8;
        if (dArr[base] > 6)        dArr[base] = -6;
        if (dArr[base] < -6)       dArr[base] = 6;
        if (dArr[base + 2] > 3.8)  dArr[base + 2] = -3.8;
        if (dArr[base + 2] < -3.8) dArr[base + 2] = 3.8;
      }
      dGeo.attributes.position.needsUpdate = true;

      // Micro fragments
      const fragAct = smoothstep(0.12, 0.46, effectiveSp);
      mMat.opacity = fragAct * 0.45;
      const mArr = mGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < MC; i++) {
        const base = i * 3;
        const amp = fragAct * (1.1 + (i % 6) * 0.12);
        mArr[base]     = mBase[base]     + mDir[base]     * amp + Math.sin(t * 0.7 + i) * 0.04;
        mArr[base + 1] = mBase[base + 1] + mDir[base + 1] * amp * 1.1 + Math.cos(t * 0.9 + i * 0.6) * 0.03;
        mArr[base + 2] = mBase[base + 2] + mDir[base + 2] * amp + Math.sin(t * 0.8 + i * 0.35) * 0.03;
      }
      mGeo.attributes.position.needsUpdate = true;

      // Cursor world position
      ndc.set(ptr.x, ptr.y);
      ray.setFromCamera(ndc, camera);
      const rd = ray.ray.direction;
      const ht = -camera.position.z / rd.z;
      lcur.set(camera.position.x + rd.x * ht, camera.position.y + rd.y * ht, 0);
      root.worldToLocal(lcur);

      // Shell pieces
      pieces.forEach((p, i) => {
        let broken: number;
        if (fertPhase === 'hatching' || fertPhase === 'chick') {
          // Time-driven scatter when chick hatches
          const hatchProg = Math.min(1, Math.max(0, (t - (fertTime + 0.8)) / 0.65));
          broken = smoothstep(p.breakAt * 0.45, p.breakAt * 0.45 + 0.1, hatchProg);
        } else {
          broken = smoothstep(p.breakAt, p.breakAt + 0.14, effectiveSp);
        }

        if (scrollingUp && fertPhase === 'none') p.vel.multiplyScalar(0.12);

        const tx = p.scatter.x * broken * SCATTER;
        const ty = p.scatter.y * broken * SCATTER;
        const tz = p.scatter.z * broken * SCATTER;

        p.vel.x += (tx - p.mesh.position.x) * 0.05;
        p.vel.y += (ty - p.mesh.position.y) * 0.05;
        p.vel.z += (tz - p.mesh.position.z) * 0.05;

        if (sp < 0.04) p.vel.y += Math.sin(t * 0.65 + i * 0.95) * 0.0007;

        if (broken < 0.9 && fertPhase === 'none') {
          const cx = Math.cos(p.angle) * 0.7 + p.mesh.position.x;
          const dxc = cx - lcur.x, dyc = p.mesh.position.y - lcur.y, dzc = Math.sin(p.angle) * 0.7 + p.mesh.position.z - lcur.z;
          const dist = Math.sqrt(dxc*dxc + dyc*dyc + dzc*dzc);
          if (dist < REPEL_R && dist > 0.01) {
            const str = 0.05 * (1 - dist / REPEL_R) * (1 - broken);
            p.vel.x += (dxc / dist) * str; p.vel.y += (dyc / dist) * str; p.vel.z += (dzc / dist) * str;
          }
        }

        p.vel.multiplyScalar(0.80);
        p.mesh.position.x += p.vel.x;
        p.mesh.position.y += p.vel.y;
        p.mesh.position.z += p.vel.z;
        p.mesh.rotation.x += p.angVel.x * broken;
        p.mesh.rotation.y += p.angVel.y * broken;
        p.mesh.rotation.z += p.angVel.z * broken;
        if (broken < 0.1) {
          p.mesh.rotation.x *= 0.92; p.mesh.rotation.y *= 0.92; p.mesh.rotation.z *= 0.92;
        }
      });

      // ── Sperm update ──────────────────────────────────────────────────────────
      const inFertSeq = fertPhase === 'fertilized' || fertPhase === 'hatching' || fertPhase === 'chick';

      for (let i = 0; i < NUM_SPERMS; i++) {
        const s = sperms[i];
        if (s.phase === 'inside' || s.phase === 'dead') continue;

        if (inFertSeq && s.phase === 'swim') {
          // Fade out all swimming sperms after fertilisation
          s.opacity = Math.max(0, s.opacity - 0.025);
          continue;
        }

        const dist = s.pos.length();
        const toCenter = s.pos.clone().negate().normalize();

        if (s.phase === 'swim') {
          // Perpendicular wiggle vector
          const velLen = s.vel.length();
          const velDir = velLen > 0.0001 ? s.vel.clone().normalize() : toCenter.clone();
          const refUp  = Math.abs(velDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
          const perp   = refUp.clone().cross(velDir).normalize();

          s.vel.addScaledVector(toCenter, s.speed);
          s.vel.addScaledVector(perp, Math.sin(s.tailPhase + t * 5) * 0.004);
          s.vel.multiplyScalar(0.96);

          // Fade in as sperm approaches (visible from radius ~8 inward), fade out during fast break
          const distFade = Math.max(0, Math.min(1, (8.0 - dist) / 4.0));
          const breakFade = (sp > 0.28 && fertPhase === 'none') ? 0 : 1;
          const targetOp = distFade * breakFade;
          s.opacity += (targetOp - s.opacity) * 0.03;

          if (dist < EGG_RADIUS + 0.18 && dist > 0.05) {
            // Check if a crack gap is accessible at this sperm's azimuth
            if (sp >= 0.13 && sp <= 0.32 && fertPhase === 'none') {
              const spermAzLocal = Math.atan2(s.pos.x, s.pos.z) - root.rotation.y;
              let canEnter = false;
              for (let pi = 0; pi < N; pi++) {
                const brokenFrac = smoothstep(breaks[pi], breaks[pi] + 0.14, sp);
                if (brokenFrac > 0.04) {
                  const diff = ((spermAzLocal - midAngles[pi]) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                  if (Math.abs(diff) < 0.48) { canEnter = true; break; }
                }
              }
              if (canEnter) {
                s.phase     = 'enter';
                fertPhase   = 'entering';
                enteringId  = i;
              } else {
                // Hit intact shell: sperm dies (splats and fades)
                s.phase   = 'dead';
                s.opacity = 0;
              }
            } else if (sp < 0.13) {
              // Egg fully intact, bounce back gently
              s.vel.addScaledVector(s.pos.clone().normalize(), (EGG_RADIUS + 0.2 - dist) * 0.06);
            } else {
              // Past fertilisation window, die on contact
              s.phase   = 'dead';
              s.opacity = 0;
            }
          }

          s.pos.add(s.vel);

        } else if (s.phase === 'enter') {
          // Rush straight toward centre, ignoring surface
          s.vel.lerp(toCenter.clone().multiplyScalar(s.speed * 5), 0.09);
          s.vel.multiplyScalar(0.94);
          s.pos.add(s.vel);

          if (dist < ENTRY_RADIUS) {
            s.phase = 'inside';
            if (fertPhase === 'entering') {
              fertPhase = 'fertilized';
              fertTime  = t;
              frozenSp  = sp;
            }
          }
        }

        s.tailPhase += 0.13;
      }

      // Fertilisation → hatching transition
      if (fertPhase === 'fertilized' && t - fertTime > 0.8) {
        fertPhase = 'hatching';
        chickState = buildChick();
        chickState.group.position.set(0, 0, 1.0); // slightly in front of egg
        scene.add(chickState.group);
      }

      // Hatching → chick transition
      if (fertPhase === 'hatching' && t - fertTime > 1.8) {
        fertPhase = 'chick';
      }

      // ── Sperm instance matrix update ──────────────────────────────────────────
      for (let i = 0; i < NUM_SPERMS; i++) {
        const s = sperms[i];
        const effectiveOp = (s.phase === 'inside' || s.phase === 'dead') ? 0 : s.opacity;

        if (effectiveOp < 0.001) {
          spermDummy.scale.setScalar(0);
        } else {
          const velLen = s.vel.length();
          let orient: THREE.Vector3;
          if (velLen > 0.0001) {
            orient = s.vel.clone().normalize();
          } else {
            orient = s.pos.clone().negate().normalize();
          }
          spermDummy.position.copy(s.pos);
          if (orient.dot(XAXIS) < -0.9999) {
            spermDummy.quaternion.set(0, 0, 1, 0);
          } else {
            spermDummy.quaternion.setFromUnitVectors(XAXIS, orient);
          }
          // Small head, elongated ellipsoid
          spermDummy.scale.set(0.065 * effectiveOp, 0.038 * effectiveOp, 0.038 * effectiveOp);
        }
        spermDummy.updateMatrix();
        spermMesh.setMatrixAt(i, spermDummy.matrix);
      }
      spermMesh.instanceMatrix.needsUpdate = true;

      // ── Sperm tail update ─────────────────────────────────────────────────────
      for (let i = 0; i < NUM_SPERMS; i++) {
        const s = sperms[i];
        const tail = spermTails[i];
        const tailArr = tail.geometry.attributes.position.array as Float32Array;
        const effectiveOp = (s.phase === 'inside' || s.phase === 'dead') ? 0 : s.opacity;

        spermTailMats[i].opacity = effectiveOp * 0.5;

        if (effectiveOp < 0.001) {
          // Collapse tail to a point
          for (let k = 0; k < 7; k++) {
            tailArr[k*3] = s.pos.x; tailArr[k*3+1] = s.pos.y; tailArr[k*3+2] = s.pos.z;
          }
        } else {
          const velLen = s.vel.length();
          const velDir = velLen > 0.0001 ? s.vel.clone().normalize() : s.pos.clone().negate().normalize();
          const refUp  = Math.abs(velDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
          const perp   = refUp.clone().cross(velDir).normalize();

          // Taper tail length proportionally when entering egg
          const distToCenter = s.pos.length();
          const tailLenMult  = s.phase === 'enter' ? Math.min(1, distToCenter / EGG_RADIUS) : 1;
          const SEG_LEN = 0.21 * tailLenMult;

          for (let k = 0; k < 7; k++) {
            const taper     = 1 - k / 7;
            const wiggleAmt = 0.13 * taper * effectiveOp;
            const wave      = Math.sin(s.tailPhase - k * 1.1) * wiggleAmt;
            tailArr[k*3]     = s.pos.x - velDir.x * k * SEG_LEN + perp.x * wave;
            tailArr[k*3 + 1] = s.pos.y - velDir.y * k * SEG_LEN + perp.y * wave;
            tailArr[k*3 + 2] = s.pos.z - velDir.z * k * SEG_LEN + perp.z * wave;
          }
        }
        tail.geometry.attributes.position.needsUpdate = true;
      }

      // ── Chick update ──────────────────────────────────────────────────────────
      if (chickState) {
        const chick = chickState;

        // Scale up from 0 → CHICK_SCALE over ~0.6 s after hatch begins
        const CHICK_SCALE = 0.28;
        const hatchStart = fertTime + 0.8;
        const scaleT     = Math.min(1, Math.max(0, (t - hatchStart) / 0.6));
        const scaleVal   = scaleT < 0.8 ? smoothstep(0, 0.8, scaleT) * 1.08 : 1 + (1 - scaleT) * 0.4 * 0.08;
        chick.group.scale.setScalar(Math.max(0, scaleVal) * CHICK_SCALE);

        chick.walkTime += 0.04;

        if (!chick.landed) {
          // Falling: starts when fertPhase becomes 'chick'
          if (fertPhase === 'chick') {
            chick.velY -= 0.016;
            chick.group.position.y += chick.velY;
          }
          // Wing flap during fall
          chick.wingL.rotation.z =  Math.sin(chick.walkTime * 14) * 0.8;
          chick.wingR.rotation.z = -Math.sin(chick.walkTime * 14) * 0.8;

          if (chick.group.position.y <= chick.landY) {
            chick.group.position.y = chick.landY;
            if (Math.abs(chick.velY) > 0.03 && chick.bounceCount < 2) {
              chick.velY *= -0.32;
              chick.bounceCount++;
              // Tiny camera shake
              camera.position.y += (Math.random() - 0.5) * 0.05;
            } else {
              chick.velY  = 0;
              chick.landed = true;
            }
          }
        } else {
          // Walking
          chick.legL.rotation.x =  Math.sin(chick.walkTime * 4) * 0.45;
          chick.legR.rotation.x =  Math.sin(chick.walkTime * 4 + Math.PI) * 0.45;
          chick.body.position.y =  Math.abs(Math.sin(chick.walkTime * 8)) * 0.04 - 0.02;
          chick.wingL.rotation.z =  Math.sin(chick.walkTime * 2.5) * 0.14;
          chick.wingR.rotation.z = -Math.sin(chick.walkTime * 2.5) * 0.14;

          chick.group.position.x += chick.walkDir * 0.010;

          if (chick.group.position.x > 3.2 && chick.walkDir === 1) {
            chick.walkDir = -1;
            chick.group.rotation.y = Math.PI;
          } else if (chick.group.position.x < -3.2 && chick.walkDir === -1) {
            chick.walkDir = 1;
            chick.group.rotation.y = 0;
          }

          // Nudge camera back toward centre if it drifted from bounce
          camera.position.y += (0 - camera.position.y) * 0.03;
        }
      }

      renderer.render(scene, camera);
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("pointermove", onPtr);
      window.removeEventListener("touchmove",   onTch);
      window.removeEventListener("resize",      resize);
      ro.disconnect();
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
      pieceGeos.forEach(g => g.dispose());
      pGeo.dispose(); pMat.dispose();
      dGeo.dispose(); dMat.dispose();
      mGeo.dispose(); mMat.dispose();
      yolkGeo.dispose(); yolkMat.dispose();
      albGeo.dispose(); albMat.dispose();
      shellMat.dispose();
      spermHeadGeo.dispose(); spermMat.dispose();
      spermTails.forEach(tl => tl.geometry.dispose());
      spermTailMats.forEach(m => m.dispose());
      if (chickState) {
        chickState.group.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m: THREE.Material) => m.dispose());
            else (mesh.material as THREE.Material).dispose();
          }
        });
      }
      renderer.dispose();
    };
  }, [reducedMotion]);

  return (
    <section
      ref={shellRef}
      className={`playground-hero-shell ${fallbackMode ? "is-fallback" : "is-webgl"}`}
      style={{ "--hero-progress": scrollProgress.toFixed(3) } as CSSProperties}
    >
      <div className="playground-hero-stage" aria-hidden="true">
        <div className="playground-hero-noise" />
        <div className="playground-hero-beam playground-hero-beam-a" />
        <div className="playground-hero-beam playground-hero-beam-b" />
        <div className="playground-hero-grid" />
      </div>

      <div className="playground-hero-content">
        <div className="playground-hero-copyblock">
          <h1>{heading}</h1>
          <p className="playground-hero-copy">{copy}</p>
        </div>
      </div>
      <div className="playground-hero-scrollcue" aria-hidden="true">
        <span className="playground-hero-scrollcue-line" />
        <span className="playground-hero-scrollcue-text">Scroll to crack it open.</span>
      </div>
    </section>
  );
}
