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
// Hand-tuned for organic, reference-like crack layout
const SEEDS: [number, number][] = [
  [0.04, 0.12], [0.22, 0.05], [0.48, 0.14], [0.70, 0.07], [0.88, 0.20],
  [0.82, 0.52], [0.92, 0.78], [0.60, 0.88], [0.32, 0.80], [0.10, 0.68],
  [0.18, 0.40], [0.52, 0.48],
];

function buildPieceGeos(): { geos: THREE.BufferGeometry[]; midAngles: number[] } {
  // nearest Voronoi seed (toroidal in azimuth, linear in elevation)
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

  // Vertex helper: returns [x, y, z] on outer (inner=false) or inner surface
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

      // Outer quad (CCW from outside)
      const o00 = V(ai, ei, false),     o10 = V(ai+1, ei, false);
      const o01 = V(ai, ei+1, false),   o11 = V(ai+1, ei+1, false);
      push(p, o00, o10, o11); push(p, o00, o11, o01);

      // Inner quad (reversed winding — faces inward)
      const i00 = V(ai, ei, true),      i10 = V(ai+1, ei, true);
      const i01 = V(ai, ei+1, true),    i11 = V(ai+1, ei+1, true);
      push(p, i00, i11, i10); push(p, i00, i01, i11);
    }
  }

  // Edge caps: walk every adjacent pair (ai, ei) vs (ai+1, ei), add a wall if they differ
  for (let ai = 0; ai < AZ; ai++) {
    for (let ei = 0; ei < EL; ei++) {
      const pA = nearest((ai + 0.5) / AZ, (ei + 0.5) / EL);
      const pB = nearest((ai + 1.5) / AZ, (ei + 0.5) / EL); // neighbour in azimuth
      const pC = nearest((ai + 0.5) / AZ, (ei + 1.5) / EL); // neighbour in elevation

      if (pA !== pB) {
        // Vertical cap between ai and ai+1
        const oo0 = V(ai+1, ei,   false), oi0 = V(ai+1, ei,   true);
        const oo1 = V(ai+1, ei+1, false), oi1 = V(ai+1, ei+1, true);
        push(pA, oo0, oi0, oi1); push(pA, oo0, oi1, oo1);
        push(pB, oo0, oi1, oi0); push(pB, oo0, oo1, oi1);
      }
      if (pA !== pC) {
        // Horizontal cap between ei and ei+1
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
      // Use 2.2× viewport heights of scroll travel so pieces have room to fully escape
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
    const ambient  = new THREE.AmbientLight(0x5566aa, 5.5);   // brighter fill
    const keyL     = new THREE.PointLight(0xffeebb, 38, 60, 2); // warm key, stronger
    const rimL     = new THREE.PointLight(0x3366ff, 20, 55, 2); // vivid blue rim
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
      color: 0xd4854a,           // vivid warm terracotta-brown
      emissive: 0x7a2e08, emissiveIntensity: 0.45,
      roughness: 0.44, metalness: 0.0,
      clearcoat: 0.25, clearcoatRoughness: 0.28,
    });

    const { geos: pieceGeos, midAngles } = buildPieceGeos();
    const pr  = seededRng(0xe991234);
    const pieces: Piece[] = [];

    // Staggered break thresholds so pieces pop off in two waves
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
      color: 0xbfd9ff,
      size: 0.028,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dust = new THREE.Points(dGeo, dMat);
    root.add(dust);

    // ── Micro fragments ──────────────────────────────────────────────────────
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
      mPos[base] = mBase[base];
      mPos[base + 1] = mBase[base + 1];
      mPos[base + 2] = mBase[base + 2];
      const drift = new THREE.Vector3(
        Math.cos(theta) + (mf() - 0.5) * 0.4,
        (mf() - 0.2) * 1.2,
        Math.sin(theta) + (mf() - 0.5) * 0.4,
      ).normalize();
      mDir[base] = drift.x;
      mDir[base + 1] = drift.y;
      mDir[base + 2] = drift.z;
    }
    const mGeo = new THREE.BufferGeometry();
    mGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
    const mMat = new THREE.PointsMaterial({
      color: 0xffd7aa,
      size: 0.02,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    root.add(new THREE.Points(mGeo, mMat));

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
    const onTch = (e: TouchEvent)   => {
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

      // Fade only starts after most pieces have scattered (sp > 0.75), stays near-full opacity until then
      canvas.style.opacity = Math.max(0, 1 - Math.max(0, sp - 0.72) * 4.5).toFixed(3);

      root.rotation.y = t * 0.13 + ptr.x * 0.18;
      root.rotation.x = ptr.y * 0.09 + Math.sin(t * 0.3) * 0.018;

      const crack   = smoothstep(0.05, 0.9, sp);
      const crisis  = smoothstep(0.35, 0.9, sp);

      keyL.position.set(Math.sin(t * 0.34) * 5 + 2, Math.cos(t * 0.22) * 3 + 5, 9 + Math.sin(t * 0.28) * 2);
      keyL.intensity = 34 + crack * 6 + Math.sin(t * 0.6) * (6 + crack * 4);
      rimL.intensity = 15 + crack * 9 + Math.sin(t * 0.4 + 1.2) * 4;
      ambient.intensity = 4.7 + crack * 1.5;

      // Yolk
      yolkMat.emissiveIntensity = 1.8 + crack * 4.5 + Math.sin(t * 8) * crisis * 1.2;
      yolkL.intensity = 6 + crack * 22 + Math.random() * crisis * 14;
      yolkL.color.setRGB(1.0, 0.47 - crisis * 0.22, 0);
      yolk.position.set(
        Math.sin(t * 6.2) * crisis * 0.13 + (Math.random() - 0.5) * crisis * 0.07,
        Math.cos(t * 5.4) * crisis * 0.11, 0,
      );
      yolk.scale.setScalar(1 + crack * 0.12 + Math.sin(t * 9) * crisis * 0.06);

      // Albumen
      const albFade = smoothstep(0.18, 0.55, sp);
      const albDrip = smoothstep(0.50, 0.88, sp);
      albMat.opacity = albFade * 0.68;
      albumen.position.y = -albDrip * 3.6;
      albumen.scale.set(1 + albDrip * 0.8, 1 - albDrip * 0.5, 1 + albDrip * 0.8);

      // Particles
      const pAct = smoothstep(0.08, 0.85, sp);
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
        dArr[base] += dVel[base] + ptr.x * 0.0009;
        dArr[base + 1] += dVel[base + 1] + Math.sin(t * 0.5 + i * 0.4) * 0.0007;
        dArr[base + 2] += dVel[base + 2] + ptr.y * 0.0006;

        if (dArr[base + 1] > 4.8) dArr[base + 1] = -4.8;
        if (dArr[base] > 6) dArr[base] = -6;
        if (dArr[base] < -6) dArr[base] = 6;
        if (dArr[base + 2] > 3.8) dArr[base + 2] = -3.8;
        if (dArr[base + 2] < -3.8) dArr[base + 2] = 3.8;
      }
      dGeo.attributes.position.needsUpdate = true;

      // Micro fragments
      const fragAct = smoothstep(0.12, 0.46, sp);
      mMat.opacity = fragAct * 0.45;
      const mArr = mGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < MC; i++) {
        const base = i * 3;
        const amp = fragAct * (1.1 + (i % 6) * 0.12);
        mArr[base] = mBase[base] + mDir[base] * amp + Math.sin(t * 0.7 + i) * 0.04;
        mArr[base + 1] = mBase[base + 1] + mDir[base + 1] * amp * 1.1 + Math.cos(t * 0.9 + i * 0.6) * 0.03;
        mArr[base + 2] = mBase[base + 2] + mDir[base + 2] * amp + Math.sin(t * 0.8 + i * 0.35) * 0.03;
      }
      mGeo.attributes.position.needsUpdate = true;

      // Cursor world position in root local space
      ndc.set(ptr.x, ptr.y);
      ray.setFromCamera(ndc, camera);
      const rd = ray.ray.direction;
      const ht = -camera.position.z / rd.z;
      lcur.set(camera.position.x + rd.x * ht, camera.position.y + rd.y * ht, 0);
      root.worldToLocal(lcur);

      pieces.forEach((p, i) => {
        const broken = smoothstep(p.breakAt, p.breakAt + 0.14, sp);

        // When scrolling back up, kill velocity immediately so pieces don't overshoot inward
        if (scrollingUp) p.vel.multiplyScalar(0.12);

        const tx = p.scatter.x * broken * SCATTER;
        const ty = p.scatter.y * broken * SCATTER;
        const tz = p.scatter.z * broken * SCATTER;

        p.vel.x += (tx - p.mesh.position.x) * 0.05;
        p.vel.y += (ty - p.mesh.position.y) * 0.05;
        p.vel.z += (tz - p.mesh.position.z) * 0.05;

        if (sp < 0.04) p.vel.y += Math.sin(t * 0.65 + i * 0.95) * 0.0007;

        // Pointer repel when assembled
        if (broken < 0.9) {
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
