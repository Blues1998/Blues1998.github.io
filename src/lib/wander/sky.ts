import * as THREE from "three";
import { GLSL_NOISE } from "./glsl";
import type { Uniforms } from "./types";

/*
 * The sky is a single inward-facing sphere with everything (gradient, sun
 * disc, moon, stars, clouds) done analytically in the fragment shader. No
 * cubemap, no cloud geometry.
 *
 * It does not use GLSL_COMMON: the sky is the light source, so running it
 * through doLight/doFog would be circular. Tone mapping and colour space are
 * included manually for the same reason.
 */
export function createSky(U: Uniforms, scene: THREE.Scene) {
  const uniforms = {
    uSunDir: U.uSunDir,
    uTime: U.uTime,
    uZenith: { value: new THREE.Color(0.2, 0.4, 0.7) },
    uHorizon: { value: new THREE.Color(0.75, 0.83, 0.92) },
    uCloud: { value: 0.3 },
    uCloudCol: { value: new THREE.Color(1, 1, 1) },
    uNight: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
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

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);

  return {
    mesh,
    material,
    uniforms,
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

export type Sky = ReturnType<typeof createSky>;
