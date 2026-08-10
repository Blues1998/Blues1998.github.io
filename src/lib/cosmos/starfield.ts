import * as THREE from "three";
import type { StarfieldTierProfile } from "./deviceTier";

// A layered, procedural starfield: three depth shells of THREE.Points
// surrounding the scene, each with its own parallax response and a slow,
// per-layer opacity "breathe" (not per-star twinkle - a shader-driven
// per-vertex twinkle is a reasonable future upgrade, but a global pulse
// per layer already reads as alive without the added complexity here).
// Mounted directly on the scene, not the six-object anchor, so it stays
// centered around the viewer regardless of where that anchor shifts.
export interface Starfield {
  group: THREE.Group;
  update(dt: number, parallaxX: number, parallaxY: number): void;
  setAccent(color: THREE.Color): void;
}

interface LayerDef {
  count: number;
  radius: [number, number];
  size: number;
  opacity: number;
  parallaxFactor: number;
  pulseSpeed: number;
}

const LAYER_DEFS: LayerDef[] = [
  { count: 0, radius: [45, 78], size: 0.055, opacity: 0.55, parallaxFactor: 0.15, pulseSpeed: 0.14 },
  { count: 0, radius: [26, 45], size: 0.085, opacity: 0.75, parallaxFactor: 0.4, pulseSpeed: 0.22 },
  { count: 0, radius: [14, 26], size: 0.13, opacity: 0.95, parallaxFactor: 0.85, pulseSpeed: 0.3 },
];

// PointsMaterial renders a flat square per point without a sprite map - a
// small soft-edged round dot instead of a hard-edged glowing blob like the
// six-object scene's glow sprites, since stars should read as pinpoints.
function makeStarTexture(): THREE.CanvasTexture {
  const size = 32;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createStarfield(profile: StarfieldTierProfile, accent: THREE.Color, reduceMotion: boolean): Starfield {
  const group = new THREE.Group();
  const starTexture = makeStarTexture();
  const layers: { pivot: THREE.Group; mat: THREE.PointsMaterial; def: LayerDef }[] = [];

  LAYER_DEFS.forEach((base, i) => {
    const def = { ...base, count: profile.starCounts[i] };
    if (def.count <= 0) return;

    const positions = new Float32Array(def.count * 3);
    for (let p = 0; p < def.count; p++) {
      // Uniform random point on a spherical shell between radius[0] and radius[1].
      const r = def.radius[0] + Math.random() * (def.radius[1] - def.radius[0]);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[p * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[p * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[p * 3 + 2] = r * Math.cos(phi);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: starTexture,
      size: def.size,
      transparent: true,
      opacity: def.opacity,
      sizeAttenuation: true,
      depthWrite: false,
      alphaTest: 0.02,
    });

    const pivot = new THREE.Group();
    pivot.add(new THREE.Points(geo, mat));
    group.add(pivot);
    layers.push({ pivot, mat, def });
  });

  let clock = 0;

  return {
    group,
    setAccent(color) {
      // Stars stay near-white (real starlight isn't tinted), but a faint
      // accent lean on the two nearer layers keeps them from reading as a
      // system disconnected from the rest of the scene's palette.
      const tinted = new THREE.Color(0xffffff).lerp(color, 0.1);
      layers.forEach((l, i) => {
        if (i === 0) return;
        l.mat.color.copy(tinted);
      });
    },
    update(dt, parallaxX, parallaxY) {
      if (reduceMotion) return;
      clock += dt;
      layers.forEach((l) => {
        l.pivot.rotation.y = parallaxX * l.def.parallaxFactor * 0.3;
        l.pivot.rotation.x = parallaxY * l.def.parallaxFactor * 0.2;
        l.mat.opacity = l.def.opacity * (1 + Math.sin(clock * l.def.pulseSpeed) * 0.06);
      });
    },
  };
}
