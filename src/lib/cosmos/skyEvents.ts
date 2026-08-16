import * as THREE from "three";
import { easeFactor } from "./timing";

// Things that *happen*.
//
// Every other animation in this scene is a loop with no beginning: the
// starfield breathes, the planets orbit, the pulsar beats. Loops make a
// scene move, but they don't make it feel like anywhere - stop scrolling
// and you are looking at a screensaver that will never do anything you
// have not already seen. These are the exceptions, on their own timeline
// and deliberately sparse:
//
//   - Meteors, every 7-17 seconds, which you will catch most of.
//   - A supernova, every few minutes, which you will mostly miss. That is
//     the point of it. Something you only see if you happen to be looking
//     is worth more than something you see every time.
//
// Both live on the sky rather than on any one waypoint, so they play on
// every page - inner pages get them behind the text, where the scene is
// otherwise completely still.
//
// Like transitDust, the whole field is camera-attached and scaled by the
// current standoff, because the camera's parking distance spans about
// 1000x across the journey and a fixed-size sky would be invisible at one
// end and swallow the frame at the other.
export interface SkyEvents {
  object: THREE.Object3D;
  update(dt: number, standoff: number, cameraPos: THREE.Vector3): void;
  dispose(): void;
}

const METEORS = 5;
// Seconds between meteors, sampled uniformly. Under about 6 they stop
// reading as events and start reading as weather.
const METEOR_GAP: [number, number] = [7, 17];
const METEOR_LIFE: [number, number] = [0.75, 1.5];
// Normalized units - multiplied by the live standoff, same as the dust.
const SKY_RADIUS = 7;

// Long enough that finding one is luck rather than a schedule you could
// learn, short enough that someone reading a page for a while has a fair
// chance of catching one.
const NOVA_GAP: [number, number] = [110, 240];
const NOVA_RISE = 1.8;
const NOVA_FADE = 16;

function range([lo, hi]: [number, number]): number {
  return lo + Math.random() * (hi - lo);
}

function makeSoftTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.5)");
  g.addColorStop(0.55, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

interface Meteor {
  t: number;
  life: number;
  wait: number;
  head: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  speed: number;
}

export function createSkyEvents(accent: THREE.Color, reduceMotion: boolean): SkyEvents {
  const group = new THREE.Group();
  // Rebuilt around the camera every frame, so three's own bounding-sphere
  // cull would be working from stale bounds.
  group.frustumCulled = false;

  // ---- Meteors: one LineSegments for all of them ----
  // RGBA vertex colours rather than a flat material opacity, so each
  // meteor carries its own brightness and its own head-to-tail ramp
  // without needing a material - or a draw call - per meteor.
  //
  // Three segments each rather than one. A single segment interpolates its
  // colour linearly from head to tail, and a linear ramp on a black sky
  // reads as a uniform scratch - which is exactly what the first version
  // looked like. Chaining three lets the brightness fall off on a curve:
  // a hot head and a tail that is mostly gone by its own midpoint.
  const SEG = 3;
  const STOPS = [1, 0.4, 0.11, 0];
  const positions = new Float32Array(METEORS * SEG * 6);
  const colors = new Float32Array(METEORS * SEG * 8);
  const meteorGeo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 4);
  meteorGeo.setAttribute("position", posAttr);
  meteorGeo.setAttribute("color", colAttr);

  const meteorMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const meteorLines = new THREE.LineSegments(meteorGeo, meteorMat);
  meteorLines.frustumCulled = false;
  group.add(meteorLines);

  const meteors: Meteor[] = [];
  for (let i = 0; i < METEORS; i++) {
    meteors.push({
      t: 0,
      life: 1,
      // Staggered, so the first few seconds after load aren't either empty
      // or a shower.
      wait: Math.random() * METEOR_GAP[1],
      head: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      length: 1,
      speed: 1,
    });
  }

  function launch(m: Meteor) {
    m.t = 0;
    m.life = range(METEOR_LIFE);
    // Somewhere on the sky in front of the camera. Biased upward: a meteor
    // that enters low and crosses the object you are looking at reads as a
    // glitch rather than as sky.
    const a = Math.random() * Math.PI * 2;
    const h = 0.15 + Math.random() * 0.85;
    m.head.set(Math.cos(a) * SKY_RADIUS * 0.9, h * SKY_RADIUS * 0.55, -SKY_RADIUS * (0.5 + Math.random() * 0.6));
    // Mostly lateral and downward, never straight at the viewer - a meteor
    // coming head-on has no streak at all, it's just a dot that brightens.
    m.dir
      .set((Math.random() * 2 - 1) * 1.2 - Math.sign(m.head.x) * 0.9, -0.5 - Math.random() * 0.7, (Math.random() * 2 - 1) * 0.35)
      .normalize();
    m.length = 0.45 + Math.random() * 0.85;
    m.speed = (2.2 + Math.random() * 2.6) * SKY_RADIUS * 0.35;
  }

  const headColor = new THREE.Color(0xffffff);
  const tailColor = new THREE.Color(0xffffff).lerp(accent, 0.55);
  const tailPoint = new THREE.Vector3();

  // ---- Supernova ----
  const novaTex = makeSoftTexture();
  const novaMat = new THREE.SpriteMaterial({
    map: novaTex,
    color: new THREE.Color(0xffffff).lerp(accent, 0.18),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nova = new THREE.Sprite(novaMat);
  nova.visible = false;
  group.add(nova);

  let novaWait = range(NOVA_GAP);
  let novaT = -1; // negative means dormant

  function placeNova() {
    // Within the forward cone rather than anywhere on the hemisphere. The
    // rarity that makes this worth having is *temporal*; spreading it over
    // a sphere as well would mean most of the few that ever fire went off
    // behind the viewer, which is rarity nobody gets anything out of.
    const a = Math.random() * Math.PI * 2;
    const r = 0.12 + Math.random() * 0.42;
    nova.position.set(Math.cos(a) * r * SKY_RADIUS, Math.sin(a) * r * SKY_RADIUS * 0.7, -SKY_RADIUS);
  }

  let opacity = 0;

  return {
    object: group,

    update(dt, standoff, cameraPos) {
      if (reduceMotion || standoff <= 0) return;

      group.position.copy(cameraPos);
      group.scale.setScalar(standoff);

      // ---- meteors ----
      let anyLive = false;
      for (let i = 0; i < METEORS; i++) {
        const m = meteors[i];
        if (m.wait > 0) {
          m.wait -= dt;
          if (m.wait <= 0) launch(m);
        }

        let alpha = 0;
        if (m.wait <= 0) {
          m.t += dt;
          if (m.t >= m.life) {
            m.wait = range(METEOR_GAP);
            m.t = 0;
          } else {
            const p = m.t / m.life;
            // Quick to brighten, slower to die - the shape of the real
            // thing, and it keeps the streak from blinking out mid-flight.
            alpha = Math.min(1, p * 6) * Math.pow(1 - p, 1.6);
            m.head.addScaledVector(m.dir, m.speed * dt);
            anyLive = true;
          }
        }

        // Head white, tail leaning to the accent and gone - which is what
        // gives a line a direction to read.
        for (let s = 0; s < SEG; s++) {
          const base = (i * SEG + s) * 6;
          const cbase = (i * SEG + s) * 8;
          for (const [end, stop] of [[0, s], [1, s + 1]] as const) {
            tailPoint.copy(m.head).addScaledVector(m.dir, (-m.length * stop) / SEG);
            positions[base + end * 3] = tailPoint.x;
            positions[base + end * 3 + 1] = tailPoint.y;
            positions[base + end * 3 + 2] = tailPoint.z;

            const level = STOPS[stop] * alpha;
            const tint = stop === 0 ? headColor : tailColor;
            colors[cbase + end * 4] = tint.r * level;
            colors[cbase + end * 4 + 1] = tint.g * level;
            colors[cbase + end * 4 + 2] = tint.b * level;
            colors[cbase + end * 4 + 3] = level;
          }
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      // Eases rather than switching, so the geometry stops being submitted
      // shortly after the last streak dies instead of popping out.
      opacity += ((anyLive ? 1 : 0) - opacity) * easeFactor(0.2, dt);
      meteorMat.opacity = opacity;
      meteorLines.visible = opacity > 0.002;

      // ---- supernova ----
      if (novaT < 0) {
        novaWait -= dt;
        if (novaWait <= 0) {
          novaT = 0;
          placeNova();
          nova.visible = true;
        }
      } else {
        novaT += dt;
        const total = NOVA_RISE + NOVA_FADE;
        if (novaT >= total) {
          novaT = -1;
          novaWait = range(NOVA_GAP);
          nova.visible = false;
          novaMat.opacity = 0;
        } else {
          // Rises fast to a hard peak and then falls off on a long curve -
          // a light curve, roughly, and the reason it reads as a star that
          // died rather than a lamp on a dimmer.
          const level =
            novaT < NOVA_RISE
              ? Math.pow(novaT / NOVA_RISE, 0.55)
              : Math.pow(1 - (novaT - NOVA_RISE) / NOVA_FADE, 2.2);
          novaMat.opacity = level * 0.8;
          // Small. A supernova is a star that got brighter, not a nebula -
          // if it reads as an object with a size, it stops being a star.
          nova.scale.setScalar(SKY_RADIUS * (0.02 + level * 0.05));
        }
      }
    },

    dispose() {
      meteorGeo.dispose();
      meteorMat.dispose();
      novaMat.dispose();
      novaTex.dispose();
    },
  };
}
