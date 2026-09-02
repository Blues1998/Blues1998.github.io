/*
 * Shared GLSL. Every custom material in the scene (terrain, road, vegetation,
 * grass, flowers) prefixes GLSL_COMMON so they all resolve lighting, shadow
 * and fog identically. If they didn't, a tree and the ground it stands on
 * would disagree about where the sun is.
 */

export const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x),
             mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}
float fbm2(vec2 p){ return (vnoise(p) * .5 + vnoise(p * 2.03) * .25 + vnoise(p * 4.09) * .125) / .875; }
`;

export const GLSL_COMMON =
  `
uniform vec3 uSunDir, uSunColor, uHemiSky, uHemiGround, uFogColor;
uniform float uFogDensity, uSnow, uSnowNear, uWet, uTime, uHL;
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
