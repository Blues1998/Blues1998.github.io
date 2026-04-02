import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ─── Noise ────────────────────────────────────────────────────────────────────

function hash(n: number): number {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const v00 = hash(ix     + iy * 57.0);
  const v10 = hash(ix + 1 + iy * 57.0);
  const v01 = hash(ix     + (iy + 1) * 57.0);
  const v11 = hash(ix + 1 + (iy + 1) * 57.0);
  return (1 - uy) * ((1 - ux) * v00 + ux * v10)
             + uy * ((1 - ux) * v01 + ux * v11);
}

function fbm(x: number, z: number): number {
  return smoothNoise(x * 0.5,  z * 0.5 ) * 0.50
       + smoothNoise(x,         z       ) * 0.25
       + smoothNoise(x * 2.0,  z * 2.0 ) * 0.125
       + smoothNoise(x * 4.0,  z * 4.0 ) * 0.0625;
}

function terrainHeight(x: number, z: number): number {
  return fbm(x / 180, z / 180) * 4 + fbm(x / 40, z / 40) * 1.5;
}

// ─── Road waypoint generation ─────────────────────────────────────────────────

interface Waypoint { x: number; y: number; z: number; heading: number }

function generateWaypoints(startX: number, startZ: number, startHeading: number, count: number): Waypoint[] {
  const pts: Waypoint[] = [];
  let x = startX, z = startZ, heading = startHeading;
  const STEP = 8;
  const TURNS = [-0.12, -0.05, 0, 0.05, 0.12];

  for (let i = 0; i < count; i++) {
    let bestScore = Infinity, bestTurn = 0;
    const h0 = terrainHeight(x, z);

    for (const turn of TURNS) {
      const nh = heading + turn;
      const nx = x + Math.cos(nh) * STEP;
      const nz = z + Math.sin(nh) * STEP;
      const h1 = terrainHeight(nx, nz);
      const score = Math.abs(h1 - h0) * 4 + Math.abs(turn);
      if (score < bestScore) { bestScore = score; bestTurn = turn; }
    }

    heading += bestTurn;
    x += Math.cos(heading) * STEP;
    z += Math.sin(heading) * STEP;
    pts.push({ x, y: terrainHeight(x, z) + 0.18, z, heading });
  }
  return pts;
}

// ─── Road mesh builders ───────────────────────────────────────────────────────

const ROAD_WIDTH = 9.0;
const ROAD_SAMPLES = 1800;
const ROAD_WINDOW_SAMPLES = 420;
const ROAD_WINDOW_BEHIND_T = 0.015;
const ROAD_WINDOW_AHEAD_T = 0.08;

interface RoadSampleSet {
  points: THREE.Vector3[];
  tangents: THREE.Vector3[];
}

function sampleRoadWindow(
  spline: THREE.CatmullRomCurve3,
  centerT: number,
  behindT = ROAD_WINDOW_BEHIND_T,
  aheadT = ROAD_WINDOW_AHEAD_T,
  samples = ROAD_WINDOW_SAMPLES,
): RoadSampleSet {
  const startT = Math.max(0, centerT - behindT);
  const endT = Math.min(0.999, centerT + aheadT);
  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = THREE.MathUtils.lerp(startT, endT, i / samples);
    points.push(spline.getPoint(t));
    tangents.push(spline.getTangent(t).normalize());
  }

  return { points, tangents };
}

function buildRoadGeometry(points: THREE.Vector3[], tangents: THREE.Vector3[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const samples = Math.max(points.length - 1, 1);
  let distanceAlong = 0;

  for (let i = 0; i <= samples; i++) {
    const pt = points[i];
    const tan = tangents[i] ?? tangents[tangents.length - 1];
    const right = new THREE.Vector3().crossVectors(tan, up).normalize();
    const half = ROAD_WIDTH / 2;
    if (i > 0) distanceAlong += pt.distanceTo(points[i - 1]);
    positions.push(
      pt.x - right.x * half, pt.y, pt.z - right.z * half,
      pt.x + right.x * half, pt.y, pt.z + right.z * half,
    );
    uvs.push(0, distanceAlong, 1, distanceAlong);
    if (i < samples) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildMarkingsGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const DASH_LEN = 6, GAP_LEN = 8, MARK_W = 0.18;
  let vIdx = 0, drawing = true, segDist = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], curr = points[i];
    segDist += prev.distanceTo(curr);
    const limit = drawing ? DASH_LEN : GAP_LEN;
    if (segDist >= limit) { segDist = 0; drawing = !drawing; }
    if (!drawing) continue;

    const ox = curr.x, oy = curr.y + 0.025, oz = curr.z;
    const dx = curr.x - prev.x, dz = curr.z - prev.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const rx = -dz / len * MARK_W, rz = dx / len * MARK_W;
    positions.push(ox - rx, oy, oz - rz, ox + rx, oy, oz + rz);
    if (vIdx >= 2) indices.push(vIdx - 2, vIdx - 1, vIdx, vIdx - 1, vIdx + 1, vIdx);
    vIdx += 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

// White edge lines along both sides of road
function buildEdgeLinesGeometry(points: THREE.Vector3[], tangents: THREE.Vector3[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const LINE_W = 0.2;
  const EDGE = ROAD_WIDTH / 2 - 0.3;
  const samples = Math.max(points.length - 1, 1);

  for (let i = 0; i <= samples; i++) {
    const pt = points[i];
    const tan = tangents[i] ?? tangents[tangents.length - 1];
    const r = new THREE.Vector3().crossVectors(tan, up).normalize();
    const oy = pt.y + 0.04;

    // Left edge: 2 verts  (inner, outer)
    positions.push(
      pt.x - r.x * (EDGE - LINE_W), oy, pt.z - r.z * (EDGE - LINE_W),
      pt.x - r.x * (EDGE + LINE_W), oy, pt.z - r.z * (EDGE + LINE_W),
    );
    // Right edge: 2 verts
    positions.push(
      pt.x + r.x * (EDGE - LINE_W), oy, pt.z + r.z * (EDGE - LINE_W),
      pt.x + r.x * (EDGE + LINE_W), oy, pt.z + r.z * (EDGE + LINE_W),
    );

    if (i < samples) {
      const b = i * 4;
      // Left quad
      indices.push(b, b+1, b+4, b+1, b+5, b+4);
      // Right quad
      indices.push(b+2, b+3, b+6, b+3, b+7, b+6);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

// ─── Terrain tile ─────────────────────────────────────────────────────────────

const TILE_SIZE = 256;
const TILE_SEGS = 36;

function buildTileGeometry(originX: number, originZ: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE, TILE_SEGS, TILE_SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];

  // Brighter, unlit-ready colors (used with MeshBasicMaterial — no light multiplication)
  const baseColor  = new THREE.Color(0xb09060); // warm sandy lowland
  const grassColor = new THREE.Color(0x8a9955); // olive grass
  const rockColor  = new THREE.Color(0xa89070); // warm stone

  for (let i = 0; i < pos.count; i++) {
    const wx = pos.getX(i) + originX;
    const wz = pos.getZ(i) + originZ;
    const h = terrainHeight(wx, wz);
    pos.setY(i, h);
    const t = THREE.MathUtils.clamp(h / 4, 0, 1);
    const col = new THREE.Color().lerpColors(baseColor, h > 3 ? rockColor : grassColor, t);
    colors.push(col.r, col.g, col.b);
  }

  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// ─── Vegetation geometry ──────────────────────────────────────────────────────

function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const g of parts) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const idx = g.index;
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        const vi = idx.getX(i);
        positions.push(p.getX(vi), p.getY(vi), p.getZ(vi));
        normals.push(n.getX(vi), n.getY(vi), n.getZ(vi));
      }
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal",   new THREE.Float32BufferAttribute(normals, 3));
  return out;
}

function buildPineGeometry(): THREE.BufferGeometry {
  const cone = new THREE.ConeGeometry(1.2, 4.5, 5);
  cone.translate(0, 3.8, 0);
  const trunk = new THREE.CylinderGeometry(0.22, 0.28, 1.6, 5);
  trunk.translate(0, 0.8, 0);
  return mergeGeometries([cone, trunk]);
}

function buildBushGeometry(): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1.6, 5, 4);
  sphere.translate(0, 2.3, 0);
  const trunk = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 5);
  trunk.translate(0, 0.5, 0);
  return mergeGeometries([sphere, trunk]);
}


// ─── Sky shader ───────────────────────────────────────────────────────────────

const SKY_VERT = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
varying vec3 vWorldPos;
uniform vec3 topColor;
uniform vec3 horizonColor;
uniform vec3 bottomColor;
uniform vec3 cloudColor;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  float t = clamp(vWorldPos.y / 1600.0, -1.0, 1.0);
  vec3 col = t > 0.0
    ? mix(horizonColor, topColor, pow(t, 0.55))
    : mix(bottomColor, horizonColor, pow(-t * 0.6, 0.4));

  vec3 nPos = normalize(vWorldPos);
  vec2 cloudUv = nPos.xz * 3.2 + vec2(time * 0.003, -time * 0.0015);
  float cloudBase = fbm(cloudUv);
  float cloudDetail = fbm(cloudUv * 2.4 + vec2(17.3, 9.1));
  float cloudMask = smoothstep(0.5, 0.78, cloudBase * 0.75 + cloudDetail * 0.35);
  float cloudBand = smoothstep(-0.08, 0.22, nPos.y) * (1.0 - smoothstep(0.38, 0.72, nPos.y));
  float cloudAlpha = cloudMask * cloudBand * 0.78;
  col = mix(col, cloudColor, cloudAlpha);

  // Soft daylight sun disk + halo
  vec3 sunDir = normalize(vec3(-0.45, 0.38, -0.8));
  float sd = dot(nPos, sunDir);
  float sunDisk = pow(max(sd, 0.0), 420.0);
  float sunGlow = pow(max(sd, 0.0), 9.0) * 0.28;
  col += vec3(1.0, 0.97, 0.9) * sunDisk + vec3(1.0, 0.94, 0.84) * sunGlow;
  gl_FragColor = vec4(col, 1.0);
}`;

// ─── Main component ───────────────────────────────────────────────────────────

export default function EndlessDrive() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [speed, setSpeed] = useState(0);
  const modeRef = useRef<"auto" | "manual">("auto");
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const textureLoader = new THREE.TextureLoader();

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color(0xc6d8ea), 90, 520);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(64, mount.clientWidth / mount.clientHeight, 0.5, 1200);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xe6f1ff, 0.75));
    scene.add(new THREE.HemisphereLight(0xc8e0ff, 0xb5a07f, 1.7));
    const sun = new THREE.DirectionalLight(0xfff4dd, 2.1);
    sun.position.set(-180, 150, -260);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9ec3ff, 0.65);
    fill.position.set(220, 90, 240);
    scene.add(fill);

    // ── Sky ──
    // A coarse sky sphere produces visible faceted wedges that stay locked to
    // the camera because the dome follows the camera every frame.
    const skyGeo = new THREE.SphereGeometry(1200, 96, 48);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        topColor:     { value: new THREE.Color(0x4e87d9) },
        horizonColor: { value: new THREE.Color(0xbddcff) },
        bottomColor:  { value: new THREE.Color(0xeaf4ff) },
        cloudColor:   { value: new THREE.Color(0xf7fbff) },
        time:         { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // ── Textures ──
    function loadTiledTexture(path: string, repeatX: number, repeatY: number, isColor = false) {
      const texture = textureLoader.load(path);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (isColor) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const roadColorMap = loadTiledTexture(
      "/textures/ambientcg/asphalt015/Asphalt015_1K-JPG_Color.jpg",
      1.2,
      0.085,
      true,
    );
    const roadNormalMap = loadTiledTexture(
      "/textures/ambientcg/asphalt015/Asphalt015_1K-JPG_NormalGL.jpg",
      1.2,
      0.085,
    );
    const roadRoughnessMap = loadTiledTexture(
      "/textures/ambientcg/asphalt015/Asphalt015_1K-JPG_Roughness.jpg",
      1.2,
      0.085,
    );

    const groundColorMap = loadTiledTexture(
      "/textures/ambientcg/ground102/Ground102_1K-JPG_Color.jpg",
      6,
      6,
      true,
    );
    const groundNormalMap = loadTiledTexture(
      "/textures/ambientcg/ground102/Ground102_1K-JPG_NormalGL.jpg",
      6,
      6,
    );
    const groundRoughnessMap = loadTiledTexture(
      "/textures/ambientcg/ground102/Ground102_1K-JPG_Roughness.jpg",
      6,
      6,
    );

    // ── Road ──
    let waypoints = generateWaypoints(0, 0, Math.PI / 8, 5000);
    let spline = new THREE.CatmullRomCurve3(
      waypoints.map(w => new THREE.Vector3(w.x, w.y, w.z)),
      false, "catmullrom", 0.5,
    );

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xf2dcc0,
      map: roadColorMap,
      normalMap: roadNormalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: roadRoughnessMap,
      roughness: 0.96,
      metalness: 0.02,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const initialRoadSamples = sampleRoadWindow(spline, 0.01);
    const roadMesh = new THREE.Mesh(
      buildRoadGeometry(initialRoadSamples.points, initialRoadSamples.tangents),
      roadMat,
    );
    scene.add(roadMesh);

    const markMat = new THREE.MeshBasicMaterial({ color: 0x7a6030 });
    const markMesh = new THREE.Mesh(buildMarkingsGeometry(initialRoadSamples.points), markMat);
    scene.add(markMesh);

    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xe0dac8 });
    const edgeMesh = new THREE.Mesh(
      buildEdgeLinesGeometry(initialRoadSamples.points, initialRoadSamples.tangents),
      edgeMat,
    );
    scene.add(edgeMesh);

    let lastRoadWindowT = -1;
    function refreshRoadWindow(centerT: number) {
      if (lastRoadWindowT >= 0 && Math.abs(centerT - lastRoadWindowT) < 0.0035) return;
      lastRoadWindowT = centerT;
      const samples = sampleRoadWindow(spline, centerT);
      const nextRoadGeo = buildRoadGeometry(samples.points, samples.tangents);
      const nextMarkGeo = buildMarkingsGeometry(samples.points);
      const nextEdgeGeo = buildEdgeLinesGeometry(samples.points, samples.tangents);
      roadMesh.geometry.dispose();
      markMesh.geometry.dispose();
      edgeMesh.geometry.dispose();
      roadMesh.geometry = nextRoadGeo;
      markMesh.geometry = nextMarkGeo;
      edgeMesh.geometry = nextEdgeGeo;
    }

    // ── Terrain ──
    // MeshBasicMaterial (unlit) prevents terrain faces from going black when the
    // sun is behind the camera — vertex colors are the final color, no light angle.
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xf0dcc2,
      map: groundColorMap,
      normalMap: groundNormalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: groundRoughnessMap,
      roughness: 1,
      metalness: 0,
      vertexColors: true,
    });
    const tiles = new Map<string, THREE.Mesh>();

    function tileKey(cx: number, cz: number) { return `${cx},${cz}`; }

    function ensureTile(cx: number, cz: number) {
      const key = tileKey(cx, cz);
      if (tiles.has(key)) return;
      const ox = cx * TILE_SIZE, oz = cz * TILE_SIZE;
      const geo = buildTileGeometry(ox + TILE_SIZE / 2, oz + TILE_SIZE / 2);
      const mesh = new THREE.Mesh(geo, terrainMat);
      mesh.position.set(ox + TILE_SIZE / 2, 0, oz + TILE_SIZE / 2);
      scene.add(mesh);
      tiles.set(key, mesh);
    }

    // ── Vegetation ──
    const MAX_PINES  = 1800;
    const MAX_BUSHES = 700;
    const pineGeo  = buildPineGeometry();
    const bushGeo  = buildBushGeometry();
    const pineMat  = new THREE.MeshLambertMaterial({ color: 0x1e3010 });
    const bushMat  = new THREE.MeshLambertMaterial({ color: 0x253818 });
    const pineMesh  = new THREE.InstancedMesh(pineGeo, pineMat, MAX_PINES);
    const bushMesh  = new THREE.InstancedMesh(bushGeo, bushMat, MAX_BUSHES);
    pineMesh.count = 0;
    bushMesh.count = 0;
    scene.add(pineMesh);
    scene.add(bushMesh);

    const pineSlots = new Set<number>(Array.from({ length: MAX_PINES  }, (_, i) => i));
    const bushSlots = new Set<number>(Array.from({ length: MAX_BUSHES }, (_, i) => i));
    const tilePineSlots = new Map<string, number[]>();
    const tileBushSlots = new Map<string, number[]>();
    const treeWorldPos: Array<[number, number]> = [];
    const tileTrees = new Map<string, Array<[number, number]>>();
    const dummy = new THREE.Object3D();

    function spawnVegetationForTile(cx: number, cz: number) {
      const key = tileKey(cx, cz);
      if (tilePineSlots.has(key)) return;
      const pSlots: number[] = [];
      const bSlots: number[] = [];
      const tilePos: Array<[number, number]> = [];
      const ox = cx * TILE_SIZE, oz = cz * TILE_SIZE;

      // Pines — clearance 50m so 6m trees never wall up the view at camera height
      for (let t = 0; t < 20; t++) {
        const r  = hash(cx * 17 + cz * 43 + t * 97);
        const r2 = hash(cx * 53 + cz * 29 + t * 61);
        const r3 = hash(cx * 71 + cz * 13 + t * 41);
        const r4 = hash(cx * 37 + cz * 89 + t * 23);
        const wx = ox + r  * TILE_SIZE;
        const wz = oz + r2 * TILE_SIZE;

        let tooClose = false;
        for (let wi = 0; wi < waypoints.length; wi += 8) {
          const wp = waypoints[wi];
          const ddx = wp.x - wx, ddz = wp.z - wz;
          if (ddx * ddx + ddz * ddz < 50 * 50) { tooClose = true; break; }
        }
        if (tooClose) continue;

        const slot = [...pineSlots][0];
        if (slot === undefined) break;
        pineSlots.delete(slot);
        pSlots.push(slot);

        dummy.position.set(wx, terrainHeight(wx, wz), wz);
        dummy.rotation.y = r4 * Math.PI * 2;
        dummy.scale.setScalar(0.7 + r3 * 0.7); // max 1.4× → ~8m max height
        dummy.updateMatrix();
        pineMesh.setMatrixAt(slot, dummy.matrix);
        pineMesh.count = Math.max(pineMesh.count, slot + 1);
        tilePos.push([wx, wz]);
      }

      // Bushes (lower terrain only, fewer per tile)
      for (let t = 0; t < 15; t++) {
        const r  = hash(cx * 23 + cz * 71 + t * 83);
        const r2 = hash(cx * 67 + cz * 37 + t * 53);
        const r3 = hash(cx * 43 + cz * 19 + t * 31);
        const r4 = hash(cx * 11 + cz * 97 + t * 67);
        const wx = ox + r  * TILE_SIZE;
        const wz = oz + r2 * TILE_SIZE;
        const wy = terrainHeight(wx, wz);
        if (wy > 3) continue;

        let tooClose = false;
        for (let wi = 0; wi < waypoints.length; wi += 8) {
          const wp = waypoints[wi];
          const ddx = wp.x - wx, ddz = wp.z - wz;
          if (ddx * ddx + ddz * ddz < 50 * 50) { tooClose = true; break; }
        }
        if (tooClose) continue;

        const slot = [...bushSlots][0];
        if (slot === undefined) break;
        bushSlots.delete(slot);
        bSlots.push(slot);

        dummy.position.set(wx, wy, wz);
        dummy.rotation.y = r4 * Math.PI * 2;
        dummy.scale.setScalar(0.6 + r3 * 0.9);
        dummy.updateMatrix();
        bushMesh.setMatrixAt(slot, dummy.matrix);
        bushMesh.count = Math.max(bushMesh.count, slot + 1);
        tilePos.push([wx, wz]);
      }

      tilePineSlots.set(key, pSlots);
      tileBushSlots.set(key, bSlots);
      tileTrees.set(key, tilePos);
      for (const p of tilePos) treeWorldPos.push(p);
      pineMesh.instanceMatrix.needsUpdate = true;
      bushMesh.instanceMatrix.needsUpdate = true;
    }

    function removeVegetationForTile(cx: number, cz: number) {
      const key = tileKey(cx, cz);
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);

      const ps = tilePineSlots.get(key);
      if (ps) {
        for (const s of ps) { pineMesh.setMatrixAt(s, zero); pineSlots.add(s); }
        tilePineSlots.delete(key);
        pineMesh.instanceMatrix.needsUpdate = true;
      }

      const bs = tileBushSlots.get(key);
      if (bs) {
        for (const s of bs) { bushMesh.setMatrixAt(s, zero); bushSlots.add(s); }
        tileBushSlots.delete(key);
        bushMesh.instanceMatrix.needsUpdate = true;
      }

      const tp = tileTrees.get(key);
      if (tp) {
        for (const e of tp) {
          const i = treeWorldPos.indexOf(e);
          if (i !== -1) treeWorldPos.splice(i, 1);
        }
        tileTrees.delete(key);
      }
    }

    function updateWorld(wx: number, wz: number) {
      const cx = Math.floor(wx / TILE_SIZE);
      const cz = Math.floor(wz / TILE_SIZE);
      const R = 3;
      const needed = new Set<string>();

      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const key = tileKey(cx + dx, cz + dz);
          needed.add(key);
          ensureTile(cx + dx, cz + dz);
          spawnVegetationForTile(cx + dx, cz + dz);
        }
      }

      for (const [key, mesh] of [...tiles]) {
        if (!needed.has(key)) {
          mesh.geometry.dispose();
          scene.remove(mesh);
          tiles.delete(key);
          const [kx, kz] = key.split(",").map(Number);
          removeVegetationForTile(kx, kz);
        }
      }
    }

    // ── Car ──
    const car = new THREE.Group();
    scene.add(car);

    const loader = new GLTFLoader();
    const carVisual = new THREE.Group();
    car.add(carVisual);

    loader.load("/models/honda_city_rs.glb", (gltf) => {
      const model = gltf.scene;
      const bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      const center = bbox.getCenter(new THREE.Vector3());
      const desiredLength = 4.55;
      const scale = size.z > 0 ? desiredLength / size.z : 1;

      model.scale.setScalar(scale);

      const fittedBox = new THREE.Box3().setFromObject(model);
      const fittedSize = fittedBox.getSize(new THREE.Vector3());
      const fittedCenter = fittedBox.getCenter(new THREE.Vector3());

      // Center the model on the driving rig and sit the tires close to ground level.
      model.position.set(-fittedCenter.x, -fittedBox.min.y + 0.02, -fittedCenter.z);
      model.rotation.y = Math.PI;

      model.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        const material = mesh.material;
        const materials = Array.isArray(material) ? material : [material];
        for (const mat of materials) {
          if (!(mat instanceof THREE.MeshStandardMaterial) && !(mat instanceof THREE.MeshPhysicalMaterial)) {
            continue;
          }
          mat.envMapIntensity = 0.8;
          if (mat.name.toLowerCase().includes("glass")) {
            mat.roughness = 0.08;
            mat.metalness = 0;
          }
        }
      });

      // Give the sedan a slightly lower, planted stance for the chase camera.
      carVisual.position.y = -0.22;
      carVisual.rotation.y = Math.PI;
      carVisual.add(model);
    });

    // ── Car state (heading-based physics) ──
    const startPt   = spline.getPoint(0.01);
    const startNext = spline.getPoint(0.013);
    const startTan  = new THREE.Vector3().subVectors(startNext, startPt).normalize();

    let carX = startPt.x;
    let carZ = startPt.z;
    let carY = startPt.y;
    let carHeading  = Math.atan2(startTan.z, startTan.x);
    let carSpeed    = 22;
    let steerAngle  = 0;
    let roadProgressT = 0.01;  // independent spline T for road extension
    const splineLength = spline.getLength();

    // Camera: init at proper position
    const initOffset = startTan.clone().multiplyScalar(-6.0).add(new THREE.Vector3(0, 2.2, 0));
    const camPos  = startPt.clone().add(initOffset);
    const camLook = new THREE.Vector3(
      startPt.x + startTan.x * 14,
      startPt.y + 0.8,
      startPt.z + startTan.z * 14,
    );
    const camTarget  = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    let camRoll = 0;
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    // ── Controls ──
    const onKey = (e: KeyboardEvent) => {
      if (e.type === "keydown") {
        keys.current.add(e.key);
        if (modeRef.current === "auto" && e.key !== "Escape") {
          setMode("manual");
          modeRef.current = "manual";
        }
        if (e.key === "Escape") {
          setMode("auto");
          modeRef.current = "auto";
          steerAngle = 0;
        }
      } else {
        keys.current.delete(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    // Initial world load
    updateWorld(carX, carZ);
    refreshRoadWindow(roadProgressT);

    // ── Animation loop ──
    let lastTime = performance.now();
    let animId = 0;

    function animate(now: number) {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const k = keys.current;
      const isManual = modeRef.current === "manual";
      const accel = k.has("w") || k.has("W") || k.has("ArrowUp");
      const brake = k.has("s") || k.has("S") || k.has("ArrowDown");
      const left  = k.has("a") || k.has("A") || k.has("ArrowLeft");
      const right = k.has("d") || k.has("D") || k.has("ArrowRight");

      // ── Road detection (for friction) ──
      const roadPt = spline.getPoint(Math.min(roadProgressT, 0.999));
      const offRoadDist2 = (carX - roadPt.x) ** 2 + (carZ - roadPt.z) ** 2;
      const isOnRoad = offRoadDist2 < (ROAD_WIDTH / 2 + 0.5) ** 2;

      // ── Speed ──
      if (isManual) {
        if (accel)      carSpeed = Math.min(carSpeed + 10 * dt, 40);
        else if (brake) carSpeed = Math.max(carSpeed - 14 * dt, 0);
        else {
          const targetSpeed = isOnRoad ? 18 : 10;
          const dragRate    = isOnRoad ? 1.5 : 4.0;
          carSpeed += (targetSpeed - carSpeed) * dt * dragRate;
        }
        if (!isOnRoad) carSpeed = Math.min(carSpeed, 22);
      } else {
        carSpeed += (22 - carSpeed) * dt * 0.8;
      }

      // ── Steering ──
      const MAX_STEER = 0.55;
      const STEER_RATE = 2.6;

      if (isManual) {
        // Real heading control — A/D change the car's actual direction
        if (left)  steerAngle = Math.max(steerAngle - STEER_RATE * dt, -MAX_STEER);
        if (right) steerAngle = Math.min(steerAngle + STEER_RATE * dt,  MAX_STEER);
        if (!left && !right) steerAngle *= Math.pow(0.04, dt); // fast return to center

        // Turn rate scales with speed (slower = tighter turns)
        carHeading += steerAngle * (carSpeed / 14) * dt;
      } else {
        // Auto-drive: steer toward next spline waypoint
        roadProgressT += (carSpeed * dt) / splineLength;
        if (roadProgressT > 0.98) roadProgressT = 0.02;

        const target = spline.getPoint(Math.min(roadProgressT + 0.0025, 1.0));
        const targetAngle = Math.atan2(target.z - carZ, target.x - carX);
        const rawDiff = targetAngle - carHeading;
        // Normalize angle to [-PI, PI]
        const angleDiff = ((rawDiff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        carHeading += angleDiff * Math.min(dt * 4.5, 1.0);
        steerAngle = angleDiff * 0.25; // subtle visual steer
      }

      // Also advance roadProgressT in manual mode (keep road extending ahead)
      if (isManual) {
        roadProgressT += (carSpeed * dt) / splineLength;
        if (roadProgressT > 0.98) roadProgressT = 0.02;
      }

      // ── Move car ──
      carX += Math.cos(carHeading) * carSpeed * dt;
      carZ += Math.sin(carHeading) * carSpeed * dt;
      carY  = terrainHeight(carX, carZ) + 0.28;

      // ── Tree collision ──
      const TREE_R = 1.6;
      for (const [tx, tz] of treeWorldPos) {
        const dx = carX - tx, dz = carZ - tz;
        const d2 = dx * dx + dz * dz;
        if (d2 < TREE_R * TREE_R && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const push = (TREE_R - d) / d;
          carX += dx * push * 0.5;
          carZ += dz * push * 0.5;
          carSpeed *= Math.pow(0.6, dt * 60);
        }
      }

      // ── Car transform ──
      const tangent = new THREE.Vector3(Math.cos(carHeading), 0, Math.sin(carHeading));
      car.position.set(carX, carY, carZ);
      car.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      car.rotateX(-0.025);

      // ── Camera ──
      camTarget.set(
        carX - tangent.x * 6.0,
        carY + 2.2,
        carZ - tangent.z * 6.0,
      );
      lookTarget.set(
        carX + tangent.x * 14,
        carY + 0.8,
        carZ + tangent.z * 14,
      );
      camPos.lerp(camTarget, dt * 6.0);
      camLook.lerp(lookTarget, dt * 7.0);
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      // Camera roll with steering
      camRoll += (-steerAngle * 0.14 - camRoll) * dt * 4;
      camera.rotateZ(camRoll);

      // ── World update ──
      updateWorld(carX, carZ);
      refreshRoadWindow(roadProgressT);

      skyMat.uniforms.time.value = now * 0.001;
      sky.position.copy(camera.position);

      setSpeed(Math.round(carSpeed * 3.6));
      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(animate);

    // ── Resize ──
    const obs = new ResizeObserver(() => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    obs.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      obs.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      roadColorMap.dispose();
      roadNormalMap.dispose();
      roadRoughnessMap.dispose();
      groundColorMap.dispose();
      groundNormalMap.dispose();
      groundRoughnessMap.dispose();
      pineGeo.dispose(); bushGeo.dispose();
      roadMesh.geometry.dispose();
      markMesh.geometry.dispose();
      edgeMesh.geometry.dispose();
      for (const mesh of tiles.values()) mesh.geometry.dispose();
    };
  }, []);

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* HUD */}
      <div style={{
        position: "absolute", bottom: "2rem", right: "2rem",
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        gap: "0.6rem", pointerEvents: "none", userSelect: "none",
      }}>
        <div style={{
          padding: "0.3rem 0.9rem",
          border: "1px solid rgba(255,160,60,0.22)", borderRadius: "999px",
          background: "rgba(7,10,18,0.6)", backdropFilter: "blur(8px)",
          color: "rgba(255,180,80,0.9)", fontSize: "0.8rem",
          fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          {speed} km/h
        </div>
        <div style={{
          padding: "0.28rem 0.82rem",
          border: "1px solid rgba(113,164,255,0.18)", borderRadius: "999px",
          background: "rgba(7,10,18,0.6)", backdropFilter: "blur(8px)",
          color: mode === "manual" ? "rgba(160,210,255,0.9)" : "rgba(180,180,200,0.6)",
          fontSize: "0.74rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {mode === "auto" ? "auto · press any key" : "manual · esc to release"}
        </div>
      </div>

      {mode === "manual" && (
        <div style={{
          position: "absolute", bottom: "2rem", left: "2rem",
          display: "flex", gap: "0.4rem", pointerEvents: "none",
        }}>
          {[["W", "accel"], ["S", "brake"], ["A/D", "steer"]].map(([k, label]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
              <div style={{
                padding: "0.2rem 0.55rem",
                border: "1px solid rgba(160,200,255,0.22)", borderRadius: "6px",
                background: "rgba(7,10,18,0.7)", color: "rgba(180,210,255,0.8)",
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em",
              }}>{k}</div>
              <div style={{ color: "rgba(180,200,230,0.45)", fontSize: "0.62rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
