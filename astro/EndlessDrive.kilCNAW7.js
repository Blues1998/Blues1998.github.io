import{j as p}from"./jsx-runtime.D_zvdyIk.js";import{r as Ga}from"./index.DiEladB3.js";import{i as U,h as Ee,j as zo,H as Po,U as Do,k as Te,V as J,f as Ha,l as Hn,m as Vn,n as qn,o as Wn,L as Qn,p as Xn,q as Yn,r as Va,s as Zn,N as Kn,t as Jn,W as $n,u as ja,v as es,S as ts,F as os,P as as,D as ns,w as ss,x as rs,c as ee,b as is,y as ls,I as Oa,z as Ro,J as Zt,K as Fo,O as Kt,Q as Ua,d as K,T as Ct,X as Tt,Y as Ba,Z as No,G as Jt,_ as it,$ as ve,a0 as cs,a1 as us,a2 as ds,B as lt,a3 as hs,a4 as ps,e as fs,g as ms,a5 as vs,a6 as gs,a7 as ws}from"./three.module.cIRRH-k1.js";import{P as qa,C as Eo,F as Wa,E as xs,R as Ms}from"./RenderPass.DlijX_XM.js";const ys={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new U(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class dt extends qa{constructor(u,G=1,M,j){super(),this.strength=G,this.radius=M,this.threshold=j,this.resolution=u!==void 0?new Ee(u.x,u.y):new Ee(256,256),this.clearColor=new U(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let w=Math.round(this.resolution.x/2),I=Math.round(this.resolution.y/2);this.renderTargetBright=new zo(w,I,{type:Po}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let V=0;V<this.nMips;V++){const we=new zo(w,I,{type:Po});we.texture.name="UnrealBloomPass.h"+V,we.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(we);const d=new zo(w,I,{type:Po});d.texture.name="UnrealBloomPass.v"+V,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),w=Math.round(w/2),I=Math.round(I/2)}const y=ys;this.highPassUniforms=Do.clone(y.uniforms),this.highPassUniforms.luminosityThreshold.value=j,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Te({uniforms:this.highPassUniforms,vertexShader:y.vertexShader,fragmentShader:y.fragmentShader}),this.separableBlurMaterials=[];const B=[6,10,14,18,22];w=Math.round(this.resolution.x/2),I=Math.round(this.resolution.y/2);for(let V=0;V<this.nMips;V++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(B[V])),this.separableBlurMaterials[V].uniforms.invSize.value=new Ee(1/w,1/I),w=Math.round(w/2),I=Math.round(I/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=G,this.compositeMaterial.uniforms.bloomRadius.value=.1;const re=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=re,this.bloomTintColors=[new J(1,1,1),new J(1,1,1),new J(1,1,1),new J(1,1,1),new J(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Do.clone(Eo.uniforms),this.blendMaterial=new Te({uniforms:this.copyUniforms,vertexShader:Eo.vertexShader,fragmentShader:Eo.fragmentShader,premultipliedAlpha:!0,blending:Ha,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new U,this._oldClearAlpha=1,this._basic=new Hn,this._fsQuad=new Wa(null)}dispose(){for(let u=0;u<this.renderTargetsHorizontal.length;u++)this.renderTargetsHorizontal[u].dispose();for(let u=0;u<this.renderTargetsVertical.length;u++)this.renderTargetsVertical[u].dispose();this.renderTargetBright.dispose();for(let u=0;u<this.separableBlurMaterials.length;u++)this.separableBlurMaterials[u].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(u,G){let M=Math.round(u/2),j=Math.round(G/2);this.renderTargetBright.setSize(M,j);for(let w=0;w<this.nMips;w++)this.renderTargetsHorizontal[w].setSize(M,j),this.renderTargetsVertical[w].setSize(M,j),this.separableBlurMaterials[w].uniforms.invSize.value=new Ee(1/M,1/j),M=Math.round(M/2),j=Math.round(j/2)}render(u,G,M,j,w){u.getClearColor(this._oldClearColor),this._oldClearAlpha=u.getClearAlpha();const I=u.autoClear;u.autoClear=!1,u.setClearColor(this.clearColor,0),w&&u.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=M.texture,u.setRenderTarget(null),u.clear(),this._fsQuad.render(u)),this.highPassUniforms.tDiffuse.value=M.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,u.setRenderTarget(this.renderTargetBright),u.clear(),this._fsQuad.render(u);let y=this.renderTargetBright;for(let B=0;B<this.nMips;B++)this._fsQuad.material=this.separableBlurMaterials[B],this.separableBlurMaterials[B].uniforms.colorTexture.value=y.texture,this.separableBlurMaterials[B].uniforms.direction.value=dt.BlurDirectionX,u.setRenderTarget(this.renderTargetsHorizontal[B]),u.clear(),this._fsQuad.render(u),this.separableBlurMaterials[B].uniforms.colorTexture.value=this.renderTargetsHorizontal[B].texture,this.separableBlurMaterials[B].uniforms.direction.value=dt.BlurDirectionY,u.setRenderTarget(this.renderTargetsVertical[B]),u.clear(),this._fsQuad.render(u),y=this.renderTargetsVertical[B];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,u.setRenderTarget(this.renderTargetsHorizontal[0]),u.clear(),this._fsQuad.render(u),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,w&&u.state.buffers.stencil.setTest(!0),this.renderToScreen?(u.setRenderTarget(null),this._fsQuad.render(u)):(u.setRenderTarget(M),this._fsQuad.render(u)),u.setClearColor(this._oldClearColor,this._oldClearAlpha),u.autoClear=I}_getSeparableBlurMaterial(u){const G=[],M=u/3;for(let j=0;j<u;j++)G.push(.39894*Math.exp(-.5*j*j/(M*M))/M);return new Te({defines:{KERNEL_RADIUS:u},uniforms:{colorTexture:{value:null},invSize:{value:new Ee(.5,.5)},direction:{value:new Ee(.5,.5)},gaussianCoefficients:{value:G}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {

					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;

					for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {

						float x = float( i );
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(u){return new Te({defines:{NUM_MIPS:u},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}}dt.BlurDirectionX=new Ee(1,0);dt.BlurDirectionY=new Ee(0,1);const $t={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class bs extends qa{constructor(){super(),this.isOutputPass=!0,this.uniforms=Do.clone($t.uniforms),this.material=new Vn({name:$t.name,uniforms:this.uniforms,vertexShader:$t.vertexShader,fragmentShader:$t.fragmentShader}),this._fsQuad=new Wa(this.material),this._outputColorSpace=null,this._toneMapping=null}render(u,G,M){this.uniforms.tDiffuse.value=M.texture,this.uniforms.toneMappingExposure.value=u.toneMappingExposure,(this._outputColorSpace!==u.outputColorSpace||this._toneMapping!==u.toneMapping)&&(this._outputColorSpace=u.outputColorSpace,this._toneMapping=u.toneMapping,this.material.defines={},qn.getTransfer(this._outputColorSpace)===Wn&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===Qn?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Xn?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Yn?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Va?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===Zn?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Kn?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===Jn&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(u.setRenderTarget(null),this._fsQuad.render(u)):(u.setRenderTarget(G),this.clear&&u.clear(u.autoClearColor,u.autoClearDepth,u.autoClearStencil),this._fsQuad.render(u))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}const Ne=Math.PI*2,ne=(E,u,G)=>E<u?u:E>G?G:E,ka=(E,u,G)=>E+(u-E)*G,ge=(E,u,G)=>{const M=ne((G-E)/(u-E),0,1);return M*M*(3-2*M)},Ia=E=>{for(;E>Math.PI;)E-=Ne;for(;E<-Math.PI;)E+=Ne;return E};function At(E){return function(){E|=0,E=E+1831565813|0;let u=Math.imul(E^E>>>15,1|E);return u=u+Math.imul(u^u>>>7,61|u)^u,((u^u>>>14)>>>0)/4294967296}}function ct(E,u,G){let M=Math.imul(E,374761393)+Math.imul(u,668265263)+G|0;return M=Math.imul(M^M>>>13,1274126177),(M^M>>>16)>>>0}function eo(E){const u=At(E),G=new Uint8Array(256);for(let y=0;y<256;y++)G[y]=y;for(let y=255;y>0;y--){const B=u()*(y+1)|0,re=G[y];G[y]=G[B],G[B]=re}const M=new Uint8Array(512);for(let y=0;y<512;y++)M[y]=G[y&255];const j=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1],w=.3660254037844386,I=.21132486540518713;return function(y,B){const re=(y+B)*w,V=Math.floor(y+re),we=Math.floor(B+re),d=(V+we)*I,le=y-V+d,De=B-we+d,ht=le>De?1:0,Ae=1-ht,se=le-ht+I,he=De-Ae+I,_e=le-1+2*I,H=De-1+2*I,Y=V&255,Ke=we&255;let Q=0,xe=.5-le*le-De*De;if(xe>0){xe*=xe;const $=(M[Y+M[Ke]]&7)*2;Q+=xe*xe*(j[$]*le+j[$+1]*De)}let pe=.5-se*se-he*he;if(pe>0){pe*=pe;const $=(M[Y+ht+M[Ke+Ae]]&7)*2;Q+=pe*pe*(j[$]*se+j[$+1]*he)}let ze=.5-_e*_e-H*H;if(ze>0){ze*=ze;const $=(M[Y+1+M[Ke+1]]&7)*2;Q+=ze*ze*(j[$]*_e+j[$+1]*H)}return 70*Q}}function ut(E,u,G,M,j=2,w=.5){let I=1,y=1,B=0,re=0;for(let V=0;V<M;V++)B+=I*E(u*y,G*y),re+=I,I*=w,y*=j;return B/re}const Qa=`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x),
             mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}
float fbm2(vec2 p){ return (vnoise(p) * .5 + vnoise(p * 2.03) * .25 + vnoise(p * 4.09) * .125) / .875; }
`,Ze=`
uniform vec3 uSunDir, uSunColor, uHemiSky, uHemiGround, uFogColor;
uniform float uFogDensity, uSnow, uWet, uTime, uHL;
uniform vec3 uHLPos, uHLDir, uCamPos;
uniform vec3 uGrass, uGrassAlt;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat;
uniform float uShadowOn;
`+Qa+`
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
`;function _s(){const E=Ga.useRef(null);return Ga.useEffect(()=>{const u=E.current;if(!u)return;let G=!1;const M=[],j=(e,t)=>{const o=window.setTimeout(()=>{G||e()},t);return M.push(o),o},w=e=>u.querySelector(e),I=new URLSearchParams(window.location.search),y=(I.get("seed")?+I.get("seed"):Math.random()*1e9)|0,B=eo(y^2654435769),re=eo(y^2246822507),V=eo(y^3266489909),we=eo(y+1013904223|0),d={started:!1,tod:.36,phase:.85,timeScale:1,seasonMode:"auto",seasonTarget:0,weatherMode:"auto",camMode:2,quality:1,muted:!1,vol:.8,auto:!0,simT:0},le=[{radius:4,fog:.00225,prCap:1.25},{radius:5,fog:.00165,prCap:1.5},{radius:6,fog:.00125,prCap:2}],De=600,ht=260,Ae=document.createElement("canvas");Ae.style.cssText="position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;",u.appendChild(Ae);const se=new $n({canvas:Ae,antialias:!0,powerPreference:"high-performance"});se.toneMapping=Va,se.toneMappingExposure=1.05,se.outputColorSpace=ja,se.shadowMap.enabled=!0,se.shadowMap.type=es;let he=1;function _e(){const e=Math.min(window.devicePixelRatio||1,le[d.quality].prCap)*he;se.setPixelRatio(e),se.setSize(window.innerWidth,window.innerHeight),Y.aspect=window.innerWidth/window.innerHeight,Y.updateProjectionMatrix(),$.setPixelRatio(e),$.setSize(window.innerWidth,window.innerHeight)}const H=new ts;H.fog=new os(13162216,.0016);const Y=new as(63,window.innerWidth/window.innerHeight,.3,7e3);Y.position.set(0,8,-20);const Ke=()=>_e();window.addEventListener("resize",Ke);const Q=new ns(16777215,3);H.add(Q),H.add(Q.target);const xe=new ss(12572400,5134917,.9);H.add(xe);const pe=60,ze=260;Q.castShadow=!0,Q.shadow.mapSize.set(2048,2048),Object.assign(Q.shadow.camera,{left:-pe,right:pe,top:pe,bottom:-pe,near:150,far:380}),Q.shadow.camera.updateProjectionMatrix();const $=new xs(se);$.renderTarget1.samples=4,$.renderTarget2.samples=4,$.addPass(new Ms(H,Y));const Xa=new dt(new Ee(window.innerWidth,window.innerHeight),.32,.5,.88);$.addPass(Xa),$.addPass(new bs);const g={uSunDir:{value:new J(0,1,0)},uSunColor:{value:new U(1,1,1)},uHemiSky:{value:new U(.5,.6,.75)},uHemiGround:{value:new U(.25,.25,.2)},uFogColor:{value:new U(.78,.84,.91)},uFogDensity:{value:.0016},uSnow:{value:0},uWet:{value:0},uTime:{value:0},uHL:{value:0},uHLPos:{value:new J},uHLDir:{value:new J(0,0,1)},uGrass:{value:new U(7647316)},uGrassAlt:{value:new U(6265417)},uCamPos:{value:new J},uShadowMap:{value:null},uShadowMat:{value:Q.shadow.matrix},uShadowOn:{value:0},uGrassGrow:{value:1},uBloom:{value:1}},Me={uSunDir:g.uSunDir,uTime:g.uTime,uZenith:{value:new U(.2,.4,.7)},uHorizon:{value:new U(.75,.83,.92)},uCloud:{value:.3},uCloudCol:{value:new U(1,1,1)},uNight:{value:0},uMoonDir:{value:new J(0,-1,0)}},Lo=new Te({uniforms:Me,side:rs,depthWrite:!1,fog:!1,vertexShader:`
    varying vec3 vDir;
    void main(){
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,fragmentShader:`
    varying vec3 vDir;
    uniform vec3 uSunDir, uZenith, uHorizon, uCloudCol, uMoonDir;
    uniform float uCloud, uNight, uTime;
    `+Qa+`
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
    }`}),pt=new ee(new is(5e3,48,24),Lo);pt.frustumCulled=!1,pt.renderOrder=-10,H.add(pt);const Z=4,oe=5.5,_t=32,D={pts:[],hash:new Map,heading:0,x:0,z:0},Go=(e,t)=>(e+32768)*65536+(t+32768);function Ya(e){return re(e*42e-5,3.7)*46+re(e*.0019,8.9)*13+re(e*.0085,1.3)*1.4}function jo(e){for(;D.pts.length*Z<e;){const t=D.pts.length,o=t*Z,i=ne(ut(B,o*85e-5,0,2)*1.7,-1,1),l=i*i*i/85;D.heading+=l*Z;const s=Math.sin(D.heading),r=Math.cos(D.heading);t>0&&(D.x+=s*Z,D.z+=r*Z);const a={x:D.x,y:Ya(o),z:D.z,dx:s,dz:r,k:Math.abs(l)};D.pts.push(a);const c=Math.floor(a.x/_t),f=Math.floor(a.z/_t),h=Go(c,f);let m=D.hash.get(h);m||(m=[],D.hash.set(h,m)),m.push(t)}}function Le(e,t){const o=Math.floor(e/_t),i=Math.floor(t/_t);let l=-1,s=1e18;for(let A=-3;A<=3;A++)for(let z=-3;z<=3;z++){const _=D.hash.get(Go(o+A,i+z));if(_)for(let k=0;k<_.length;k++){const X=D.pts[_[k]],q=X.x-e,ae=X.z-t,b=q*q+ae*ae;b<s&&(s=b,l=_[k])}}if(l<0)return null;const r=D.pts,a=r[l];let c=a.x,f=a.y,h=a.z,m=a.dx,F=a.dz,N=l*Z,L=s;for(let A=l-1;A<=l;A++){if(A<0||A+1>=r.length)continue;const z=r[A],_=r[A+1],k=_.x-z.x,X=_.z-z.z,q=ne(((e-z.x)*k+(t-z.z)*X)/(k*k+X*X),0,1),ae=z.x+k*q,b=z.z+X*q,C=ae-e,T=b-t,x=C*C+T*T;x<L&&(L=x,c=ae,h=b,f=z.y+(_.y-z.y)*q,m=z.dx+(_.dx-z.dx)*q,F=z.dz+(_.dz-z.dz)*q,N=(A+q)*Z)}return{d:Math.sqrt(L),x:c,y:f,z:h,tx:m,tz:F,idx:l,s:N}}const Oo=new Te({uniforms:g,fog:!1,vertexShader:`
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      vUv = uv; vN = normal; vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,fragmentShader:Ze+`
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
    }`}),ke=64,ft=new Map;function Za(e){const t=e*ke,o=Math.min(t+ke,D.pts.length-1);if(o<=t)return null;const i=o-t+1,l=new Float32Array(i*2*3),s=new Float32Array(i*2*3),r=new Float32Array(i*2*2),a=[];for(let h=0;h<i;h++){const m=D.pts[t+h],F=D.pts[Math.max(t+h-1,0)],L=(D.pts[Math.min(t+h+1,D.pts.length-1)].y-F.y)/Math.max(2*Z,1),A=m.dz,z=-m.dx;let _=m.dx,k=L,X=m.dz;const q=Math.hypot(_,k,X);_/=q,k/=q,X/=q;let ae=k*z-X*0,b=X*A-_*z,C=_*0-k*A;const T=Math.hypot(ae,b,C);ae/=T,b/=T,C/=T;const x=m.y+.06,R=h*6;l[R]=m.x-A*oe,l[R+1]=x,l[R+2]=m.z-z*oe,l[R+3]=m.x+A*oe,l[R+4]=x,l[R+5]=m.z+z*oe,s[R]=ae,s[R+1]=b,s[R+2]=C,s[R+3]=ae,s[R+4]=b,s[R+5]=C;const W=(t+h)*Z;if(r[h*4]=-1,r[h*4+1]=W,r[h*4+2]=1,r[h*4+3]=W,h>0){const ie=(h-1)*2;a.push(ie,ie+1,ie+2,ie+1,ie+3,ie+2)}}const c=new lt;c.setAttribute("position",new K(l,3)),c.setAttribute("normal",new K(s,3)),c.setAttribute("uv",new K(r,2)),c.setIndex(a),c.computeBoundingSphere();const f=new ee(c,Oo);return f.receiveShadow=!0,H.add(f),f}function Ka(){const e=[],t=new ve(.13,.85,.13).translate(0,.425,0),o=new ve(.145,.13,.145).translate(0,.72,0),i=(a,c)=>{const f=a.attributes.position.count,h=new Float32Array(f*3);for(let m=0;m<f;m++)h[m*3]=c.r,h[m*3+1]=c.g,h[m*3+2]=c.b;return a.setAttribute("color",new K(h,3)),a};e.push({geo:i(t,new U(.85,.86,.88)),color:new U}),e.push({geo:i(o,new U(.85,.1,.08)),color:new U});const l=new lt,s=["position","normal","color"],r={};for(const a of s)r[a]=[];for(const a of e){const c=a.geo.toNonIndexed();for(const f of s)r[f].push(...c.getAttribute(f).array)}for(const a of s)l.setAttribute(a,new K(new Float32Array(r[a]),3));return l}const Uo=Ka(),to=new ls({vertexColors:!0,emissive:2236962,emissiveIntensity:.4}),Bo={value:0};to.onBeforeCompile=e=>{e.uniforms.uPostGlow=Bo,e.fragmentShader=`uniform float uPostGlow;
`+e.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
     totalEmissiveRadiance += vColor.rgb * step(0.5, vColor.r) * step(vColor.g, 0.4) * uPostGlow;`)};const ko=220,Ie=new Oa(Uo,to,ko);Ie.frustumCulled=!1,Ie.castShadow=!0,Ie.receiveShadow=!0,H.add(Ie);const oo=new Ro;let Io=-1,Ho=-1;function Vo(e){const t=Math.max(0,Math.floor((e-500)/(ke*Z))),o=Math.floor((e+le[d.quality].radius*132+400)/(ke*Z));if(t===Io&&o===Ho)return;Io=t,Ho=o;for(const[r,a]of ft)(r<t||r>o)&&(H.remove(a),a.geometry.dispose(),ft.delete(r));for(let r=t;r<=o;r++)if(!ft.has(r)){const a=Za(r);a&&ft.set(r,a)}let i=0;const l=t*ke,s=Math.min(o*ke+ke,D.pts.length-1);for(let r=l;r<=s&&i<ko-1;r+=12){const a=D.pts[r],c=a.dz,f=-a.dx;for(const h of[-1,1])oo.makeRotationY(Math.atan2(a.dx,a.dz)),oo.setPosition(a.x+c*(oe+1.1)*h,a.y,a.z+f*(oe+1.1)*h),Ie.setMatrixAt(i++,oo)}Ie.count=i,Ie.instanceMatrix.needsUpdate=!0,la(e)}const Pe=132,He=33;function qo(e,t,o){const i=ge(24,86,o);let l=ut(V,e*.0042,t*.0042,4)*(9+48*i);l+=ut(V,e*85e-5+37.2,t*85e-5-11.8,3)*(16+95*i);const s=1-Math.abs(V(e*.0013+91.7,t*.0013+13.1));return l+=s*s*85*i*ge(.1,.7,ut(V,e*4e-4+5.1,t*4e-4+9.3,2)+.45),l+=ut(V,e*.028,t*.028,2)*(.5+1.6*i),l}function ce(e,t,o){if(o===void 0&&(o=Le(e,t)),!o)return qo(e,t,999);const i=o.d,l=qo(e,t,i);if(i>=86)return l;const s=ge(oe+.8,84,i),r=-.3*ge(oe-1.5,oe+3,i)*(1-s);return ka(o.y,l,s)+r}const Wo=new Te({uniforms:g,fog:!1,vertexShader:`
    attribute float aRoad;
    varying vec3 vN, vP; varying float vRoad;
    void main(){
      vN = normal; vP = position; vRoad = aRoad;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,fragmentShader:Ze+`
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
    }`});function ao(e){const t=[],o=[],i=[],l=[];for(const r of e){const a=r.geo.toNonIndexed();r.matrix&&a.applyMatrix4(r.matrix);const c=a.getAttribute("position").array,f=a.getAttribute("normal").array;for(let m=0;m<c.length;m++)t.push(c[m]),o.push(f[m]);const h=a.getAttribute("position").count;for(let m=0;m<h;m++)i.push(r.color.r,r.color.g,r.color.b),l.push(r.foliage)}const s=new lt;return s.setAttribute("position",new K(new Float32Array(t),3)),s.setAttribute("normal",new K(new Float32Array(o),3)),s.setAttribute("color",new K(new Float32Array(i),3)),s.setAttribute("aFoliage",new K(new Float32Array(l),1)),s}const Ge=(e,t,o,i=1)=>new Ro().makeScale(i,i,i).setPosition(e,t,o),Qo=new U(5916211),Je=new U(1,1,1),zt=ao([{geo:new Zt(.2,.32,2.2,6),matrix:Ge(0,1.1,0),color:Qo,foliage:0},{geo:new Fo(1.55,2.7,7),matrix:Ge(0,2.9,0),color:Je,foliage:1},{geo:new Fo(1.2,2.3,7),matrix:Ge(0,4.5,0),color:Je,foliage:1},{geo:new Fo(.8,1.9,7),matrix:Ge(0,6,0),color:Je,foliage:1}]),Pt=ao([{geo:new Zt(.22,.36,2.9,6),matrix:Ge(0,1.45,0),color:Qo,foliage:0},{geo:new Kt(1.5,1),matrix:Ge(0,3.8,0,1.25),color:Je,foliage:1},{geo:new Kt(1,1),matrix:Ge(1,3.1,.35),color:Je,foliage:1},{geo:new Kt(1.05,1),matrix:Ge(-.9,3.25,-.25),color:Je,foliage:1}]),no=new Kt(1,1);{const e=no.getAttribute("position");for(let t=0;t<e.count;t++){const o=.75+.5*(ct(e.getX(t)*100|0,e.getZ(t)*100|0,7)%1e3/1e3);e.setXYZ(t,e.getX(t)*o,e.getY(t)*o*.65,e.getZ(t)*o)}no.computeVertexNormals()}const Rt=ao([{geo:no,color:new U(7762024),foliage:0}]);function so(e){return new Te({uniforms:Object.assign({uLeafA:{value:new U(5214011)},uLeafB:{value:new U(6988616)},uLeafDensity:{value:1}},g,{}),fog:!1,vertexShader:`
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
      }`,fragmentShader:Ze+`
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
      }`})}const Ft=so(),mt=so(),Xo=so(),vt=new Map,gt=[],Yo=(e,t)=>e+":"+t,Nt=new Ro,Et=new ws,Dt=new J,Zo=new J;function Ja(e,t){const o=e*Pe,i=t*Pe,l=Pe/He,s=He+3,r=new Float32Array(s*s),a=new Float32Array(s*s);for(let b=0;b<s;b++)for(let C=0;C<s;C++){const T=o+(C-1)*l,x=i+(b-1)*l,R=Le(T,x);r[b*s+C]=ce(T,x,R),a[b*s+C]=R?R.d:999}const c=He+1,f=new Float32Array(c*c*3),h=new Float32Array(c*c*3),m=new Float32Array(c*c);for(let b=0;b<c;b++)for(let C=0;C<c;C++){const T=(b+1)*s+(C+1),x=(b*c+C)*3;f[x]=o+C*l,f[x+1]=r[T],f[x+2]=i+b*l;let R=r[T-1]-r[T+1];const W=2*l;let ie=r[T-s]-r[T+s];const Ye=Math.hypot(R,W,ie);h[x]=R/Ye,h[x+1]=W/Ye,h[x+2]=ie/Ye,m[b*c+C]=Math.min(a[T],99)}const F=new Uint32Array(He*He*6);let N=0;for(let b=0;b<He;b++)for(let C=0;C<He;C++){const T=b*c+C,x=T+1,R=T+c,W=R+1;F[N++]=T,F[N++]=R,F[N++]=x,F[N++]=x,F[N++]=R,F[N++]=W}const L=new lt;L.setAttribute("position",new K(f,3)),L.setAttribute("normal",new K(h,3)),L.setAttribute("aRoad",new K(m,1)),L.setIndex(new K(F,1)),L.computeBoundingSphere();const A=new ee(L,Wo);A.receiveShadow=!0,H.add(A);const z=[A],_=At(ct(e,t,y)),k=[],X=[],q=[];for(let b=0;b<72;b++){const C=o+_()*Pe,T=i+_()*Pe,x=Le(C,T);if(x&&x.d<13)continue;const R=ut(we,C*.003,T*.003,2);if(_()>ge(-.28,.55,R)*.9)continue;const W=ce(C,T,x),ie=ce(C+2.5,T),Ye=ce(C,T+2.5);if(Math.hypot(ie-W,Ye-W)/2.5>.6)continue;const St=.7+_()*.9;Et.setFromAxisAngle(Dt.set(0,1,0),_()*Ne),Nt.compose(Dt.set(C,W-.15,T),Et,Zo.set(St,St*(.9+_()*.25),St)),(we(C*6e-4+50.2,T*6e-4-30.7)>0||W>95?k:X).push(Nt.clone())}for(let b=0;b<9;b++){const C=o+_()*Pe,T=i+_()*Pe,x=Le(C,T);if(x&&x.d<9||_()>.4)continue;const R=ce(C,T,x),W=.5+_()*_()*2.4;Et.setFromAxisAngle(Dt.set(0,1,0),_()*Ne),Nt.compose(Dt.set(C,R+.1*W,T),Et,Zo.set(W,W,W)),q.push(Nt.clone())}const ae=(b,C,T)=>{if(!T.length)return;const x=new Oa(b,C,T.length);for(let R=0;R<T.length;R++)x.setMatrixAt(R,T[R]);x.instanceMatrix.needsUpdate=!0,x.computeBoundingSphere(),x.castShadow=!0,x.receiveShadow=!0,H.add(x),z.push(x)};ae(zt,Ft,k),ae(Pt,mt,X),ae(Rt,Xo,q),vt.set(Yo(e,t),{cx:e,cz:t,meshes:z})}function Ko(e,t,o){const i=le[d.quality].radius,l=Math.round(e/Pe),s=Math.round(t/Pe);for(const[a,c]of vt)if(Math.max(Math.abs(c.cx-l),Math.abs(c.cz-s))>i+1){for(const f of c.meshes){H.remove(f);const h=f;h.geometry!==zt&&h.geometry!==Pt&&h.geometry!==Rt&&h.geometry.dispose(),"dispose"in h&&typeof h.dispose=="function"&&h.dispose()}vt.delete(a)}gt.length=0;for(let a=-i;a<=i;a++)for(let c=-i;c<=i;c++){const f=l+a,h=s+c;vt.has(Yo(f,h))||gt.push([a*a+c*c,f,h])}if(!gt.length)return;gt.sort((a,c)=>a[0]-c[0]);const r=performance.now();for(const[,a,c]of gt)if(Ja(a,c),performance.now()-r>o)break}const ro=4200,Lt=320,ye=new Ua;{const e=new Float32Array([-.055,0,0,.055,0,0,-.032,.55,0,.032,.55,0,0,1,0]),t=new Float32Array([0,0,1,0,.2,.55,.8,.55,.5,1]);ye.setAttribute("position",new K(e,3)),ye.setAttribute("uv",new K(t,2)),ye.setIndex([0,1,2,2,1,3,2,3,4])}const Gt=new Float32Array(ro*3),wt=new Float32Array(ro*4),Jo=new Ct(Gt,3).setUsage(Tt),$o=new Ct(wt,4).setUsage(Tt);ye.setAttribute("aOffset",Jo),ye.setAttribute("aRand",$o),ye.instanceCount=0;const ea=new Te({uniforms:g,fog:!1,side:Ba,vertexShader:Ze+`
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
    }`,fragmentShader:Ze+`
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
    }`}),ta=new ee(ye,ea);ta.frustumCulled=!1,H.add(ta);const oa=["#ffffff","#ffd94a","#ff9ec6","#b7a6ff","#ff7a5c","#8fd0ff"].map(e=>new U(e)),aa=(()=>{const e=document.createElement("canvas");e.width=e.height=64;const t=e.getContext("2d");t.fillStyle="#ffffff";for(let i=0;i<5;i++){const l=i/5*Ne-Math.PI/2;t.beginPath(),t.arc(32+Math.cos(l)*13,32+Math.sin(l)*13,11,0,Ne),t.fill()}t.fillStyle="#ffd94a",t.beginPath(),t.arc(32,32,8,0,Ne),t.fill();const o=new No(e);return o.colorSpace=ja,o})(),fe=new Ua;{const e=[],t=[],o=[];let i=0;for(const l of[0,Math.PI/2]){const s=Math.cos(l),r=Math.sin(l);for(const[a,c]of[[-.14,0],[.14,0],[.14,.3],[-.14,.3]])e.push(a*s,c,a*r);t.push(0,0,1,0,1,1,0,1),o.push(i,i+1,i+2,i,i+2,i+3),i+=4}fe.setAttribute("position",new K(new Float32Array(e),3)),fe.setAttribute("uv",new K(new Float32Array(t),2)),fe.setIndex(o)}const jt=new Float32Array(Lt*3),io=new Float32Array(Lt*2),Ot=new Float32Array(Lt*3),na=new Ct(jt,3).setUsage(Tt),sa=new Ct(io,2).setUsage(Tt),ra=new Ct(Ot,3).setUsage(Tt);fe.setAttribute("aOffset",na),fe.setAttribute("aRand",sa),fe.setAttribute("aColor",ra),fe.instanceCount=0;const ia=new Te({uniforms:Object.assign({uMap:{value:aa}},g),fog:!1,side:Ba,vertexShader:Ze+`
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
    }`,fragmentShader:Ze+`
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
    }`}),lo=new ee(fe,ia);lo.frustumCulled=!1,H.add(lo);let $e=[],co=0,et=[],uo=0;function la(e){const t=Math.max(4,Math.floor((e-420)/Z)),o=Math.min(D.pts.length-3,Math.ceil((e+le[d.quality].radius*132+380)/Z)),i=d.quality===0?2:1,l=d.quality===2?4:d.quality===1?3:2,s=[];for(let r=t;r<o;r+=i)s.push(r);s.sort((r,a)=>Math.abs(r*Z-e)-Math.abs(a*Z-e)),$e.length=0,et.length=0;for(const r of s)for(let a=0;a<2;a++)for(let c=0;c<l&&$e.length<ro;c++)$e.push(r<<3|a<<2|c);for(let r=t+3;r<o;r+=6)for(let a=0;a<2;a++)if(!(ct(r,733+a*7,y)%1e3/1e3<.5))for(let c=0;c<4&&et.length<Lt;c++)et.push(r<<3|a<<2|c);co=0,uo=0,ye.instanceCount=0,fe.instanceCount=0}function $a(e){if(!$e.length&&!et.length)return;const t=performance.now();for(;$e.length;){const o=$e.pop(),i=(o>>2&1)*2-1,l=o>>3,s=co++,r=D.pts[l],a=At(ct(l,11+(o&7),y)),c=r.dz,f=-r.dx,h=(a()-.5)*3.6,m=i*(oe+.55+Math.pow(a(),1.6)*8.5),F=r.x+c*m+r.dx*h,N=r.z+f*m+r.dz*h,L=Le(F,N);let A=-500;if((!L||L.d>oe+.3)&&(A=ce(F,N,L||void 0)-.03),Gt[s*3]=F,Gt[s*3+1]=A,Gt[s*3+2]=N,wt[s*4]=a(),wt[s*4+1]=a(),wt[s*4+2]=a(),wt[s*4+3]=a(),ye.instanceCount=co,performance.now()-t>e)break}for(Jo.needsUpdate=!0,$o.needsUpdate=!0;et.length&&performance.now()-t<=e;){const o=et.pop(),i=o&3,l=(o>>2&1)*2-1,s=o>>3,r=uo++,a=D.pts[s],c=a.dz,f=-a.dx,h=At(ct(s,733+(o>>2&1)*7,y)),m=l*(oe+1.2+h()*7.5),F=(h()-.5)*4,N=a.x+c*m+a.dx*F,L=a.z+f*m+a.dz*F,A=At(ct(s,1553+i,y)),z=N+(A()-.5)*2.2,_=L+(A()-.5)*2.2,k=Le(z,_);let X=-500;(!k||k.d>oe+.4)&&(X=ce(z,_,k||void 0)-.02),jt[r*3]=z,jt[r*3+1]=X,jt[r*3+2]=_,io[r*2]=.7+A()*.7,io[r*2+1]=A();const q=oa[A()*oa.length|0];Ot[r*3]=q.r,Ot[r*3+1]=q.g,Ot[r*3+2]=q.b,fe.instanceCount=uo}na.needsUpdate=!0,sa.needsUpdate=!0,ra.needsUpdate=!0}const n={x:0,y:0,z:0,heading:0,speed:0,steer:0,pitch:0,roll:0,off:0,lastRoadIdx:20,s:80,yv:0,pitchV:0,rollV:0,velDir:0},xt=new Jt,te=new Jt;xt.add(te),H.add(xt);const ho=new it({color:14245675,roughness:.32,metalness:.12}),ca=new it({color:1054496,roughness:.08,metalness:.5}),Ve=new it({color:1645343,roughness:.85}),po=new it({color:12106946,roughness:.32,metalness:.85}),fo=new it({color:16774872,emissive:16773824,emissiveIntensity:.25}),mo=new it({color:8000272,emissive:16720408,emissiveIntensity:.35});function ua(e,t,o,i){const l=new vs;l.moveTo(e[0][0],e[0][1]);for(let r=1;r<e.length;r++)l.lineTo(e[r][0],e[r][1]);l.closePath();const s=new gs(l,{depth:t,bevelEnabled:!0,bevelThickness:o,bevelSize:i,bevelSegments:2,steps:1});return s.rotateY(-Math.PI/2),s.translate(t/2,0,0),s}{const e=new ee(ua([[-2.42,.3],[-2.46,.62],[-2.4,.76],[-1.55,.84],[.4,.86],[1.35,.78],[2.15,.66],[2.44,.52],[2.46,.34],[2.3,.24],[1.35,.2],[-1.75,.2],[-2.3,.24]],1.78,.06,.05),ho);te.add(e);const t=new ee(ua([[.95,.86],[.3,1.3],[-.85,1.34],[-1.75,.88]],1.62,.04,.04),ca);te.add(t);const o=new ee(new ve(1.62,.055,.05),mo);o.position.set(0,.78,-2.43),te.add(o);const i=new ee(new ve(1.3,.03,.18),Ve);i.position.set(0,.865,-2.26),te.add(i);const l=new ee(new ve(1.84,.18,.22),Ve);l.position.set(0,.26,-2.3),te.add(l);const s=new ee(new ve(1.3,.16,.08),Ve);s.position.set(0,.42,2.42),te.add(s);const r=new ee(new ve(1.86,.1,.3),Ve);r.position.set(0,.22,2.28),te.add(r);for(const a of[-1,1]){const c=new ee(new ve(.42,.075,.06),fo);c.position.set(a*.62,.68,2.38),c.rotation.y=a*.35,te.add(c);const f=new ee(new ve(.16,.08,.1),ho);f.position.set(a*.98,.98,.42),te.add(f);const h=new ee(new ve(.08,.14,2.6),Ve);h.position.set(a*.92,.24,0),te.add(h)}}const da=[];{const e=new Zt(.335,.335,.24,20);e.rotateZ(Math.PI/2);const t=new Zt(.21,.21,.245,20);t.rotateZ(Math.PI/2);const o=new ve(.026,.36,.09);for(const[i,l]of[[-1,1],[1,1],[-1,-1],[1,-1]]){const s=new Jt;s.add(new ee(e,Ve)),s.add(new ee(t,po));for(let a=0;a<5;a++){const c=new ee(o,po);c.rotation.x=a*Math.PI/5,s.add(c)}const r=new Jt;r.position.set(i*.86,.335,l*1.45),r.add(s),te.add(r),da.push({pivot:r,mesh:s,front:l>0})}}xt.traverse(e=>{e.isMesh&&(e.castShadow=!0)});const ha=[];for(const e of[-1,1]){const t=new cs(16771512,0,150,.55,.55,1);t.position.set(e*.62,.72,2.2),t.target.position.set(e*.8,-1.5,30),te.add(t),te.add(t.target),ha.push(t)}const pa=(()=>{const e=document.createElement("canvas");e.width=e.height=64;const t=e.getContext("2d"),o=t.createRadialGradient(32,32,2,32,32,30);return o.addColorStop(0,"rgba(255,245,214,1)"),o.addColorStop(.4,"rgba(255,238,180,0.35)"),o.addColorStop(1,"rgba(255,238,180,0)"),t.fillStyle=o,t.fillRect(0,0,64,64),new No(e)})(),fa=[];for(const e of[-1,1]){const t=new us({map:pa,blending:Ha,depthWrite:!1,transparent:!0,opacity:0}),o=new ds(t);o.scale.set(.9,.9,1),o.position.set(e*.62,.68,2.45),te.add(o),fa.push(o)}const me=new Set,ma=e=>{if(e.repeat)return;const t=e.key.toLowerCase();t===" "&&e.preventDefault(),me.add(t),t==="t"&&Xt(!d.auto),t==="c"&&yo((d.camMode+1)%3),t==="m"&&_n(),t==="r"&&tn(),t==="escape"&&xo(),t>="1"&&t<="4"&&bo(String(+t-1)),t==="0"&&bo("auto"),["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(t)&&d.auto&&t!==" "&&Xt(!1)},va=e=>me.delete(e.key.toLowerCase());window.addEventListener("keydown",ma),window.addEventListener("keyup",va);const ga=()=>(me.has("w")||me.has("arrowup")?1:0)-(me.has("s")||me.has("arrowdown")?1:0),en=()=>(me.has("a")||me.has("arrowleft")?1:0)-(me.has("d")||me.has("arrowright")?1:0);function tn(){const e=Le(n.x,n.z),t=e?Math.round(e.s/Z):n.lastRoadIdx,o=D.pts[ne(t,2,D.pts.length-2)];n.x=o.x,n.z=o.z,n.heading=Math.atan2(o.dx,o.dz),n.speed=Math.min(n.speed,12),n.y=o.y}const Ut=69,wa=9;function on(e){jo(n.s+2400);const t=Le(n.x,n.z);t&&(n.lastRoadIdx=t.idx,n.s=t.s);const o=t?ge(oe+.5,oe+5,t.d):1;n.off=o;const i=1-ne(g.uWet.value*.38+O.snow*.3,0,.52);let l=ga(),s=en();if(d.auto&&t){const x=16+n.speed*1.2,R=ne(Math.round(t.s/Z)+Math.round(x/Z),0,D.pts.length-2),W=D.pts[R],ie=W.dz,Ye=-W.dx,St=W.x+ie*2.5,Da=W.z+Ye*2.5,kn=Math.atan2(St-n.x,Da-n.z);s=ne(Ia(kn-n.heading)*2.4,-1,1);let Ao=0;const La=Math.round(t.s/Z);for(let _o=La;_o<Math.min(La+50,D.pts.length);_o++)Ao=Math.max(Ao,D.pts[_o].k);const In=Math.min(44,Math.sqrt(.92*9.81*(.5+.5*i)/Math.max(Ao,1e-4)));l=ne((In-n.speed)*.4,-1,1)}n.steer+=(s*.55-n.steer)*Math.min(1,e*6);const r=n.steer/(1+Math.abs(n.speed)*.045),a=1.25*(.55+.45*i),c=ne(r*n.speed/2.8,-a,a);n.heading+=c*e;let f=0;if(l>0){const x=Math.max(n.speed,0)/Ut;f+=12*l*(1-x*x)*(.8+.2*i)}else l<0&&(f+=n.speed>.5?-15*i:-6.5*(1+n.speed/wa));f-=n.speed*.11,f-=o*(2.5+Math.abs(n.speed)*.45)*Math.sign(n.speed||0),me.has(" ")&&(f-=Math.sign(n.speed)*18*i*Math.min(1,Math.abs(n.speed))),n.speed=ne(n.speed+f*e,-wa,Ut),Math.abs(n.speed)<.02&&l===0&&(n.speed=0),n.velDir===0&&(n.velDir=n.heading);const h=i*(2.2+Math.abs(n.speed)*.24);n.velDir+=Ia(n.heading-n.velDir)*Math.min(1,e*h);const m=Math.sin(n.velDir),F=Math.cos(n.velDir);n.x+=m*n.speed*e,n.z+=F*n.speed*e;const N=Math.sin(n.heading),L=Math.cos(n.heading),A=ce(n.x+N*1.45-L*.86,n.z+L*1.45+N*.86),z=ce(n.x+N*1.45+L*.86,n.z+L*1.45-N*.86),_=ce(n.x-N*1.45-L*.86,n.z-L*1.45+N*.86),k=ce(n.x-N*1.45+L*.86,n.z-L*1.45-N*.86),X=(A+z)*.5,q=(_+k)*.5,ae=t&&t.d<oe;let b=(A+z+_+k)*.25+(ae?.06:0);const C=Math.atan2(q-X,2.9),T=Math.atan2((z+k)*.5-(A+_)*.5,1.72);b+=(Math.random()-.5)*o*Math.min(Math.abs(n.speed)/18,1)*.02,n.yv+=((b-n.y)*70-n.yv*12.5)*e,n.pitchV+=((C-n.pitch)*80-n.pitchV*12)*e,n.rollV+=((T-n.roll)*80-n.rollV*12)*e,n.y+=n.yv*e,n.pitch=ne(n.pitch+n.pitchV*e,-.3,.3),n.roll=ne(n.roll+n.rollV*e,-.3,.3),Math.abs(n.y-b)>.22&&(n.y=b+Math.sign(n.y-b)*.22,n.yv=0),xt.position.set(n.x,n.y,n.z),xt.rotation.y=n.heading,te.rotation.x=n.pitch,te.rotation.z=n.roll;for(const x of da)x.mesh.rotation.x+=n.speed/.34*e,x.front&&(x.pivot.rotation.y=r*.85);g.uHLPos.value.set(n.x+N*2,n.y+.8,n.z+L*2),g.uHLDir.value.set(N,-.09,L).normalize()}const be=new J(0,30,-40),xa=new J;function an(e,t){const o=Math.sin(n.heading),i=Math.cos(n.heading);let l,s,r,a,c,f,h=4.2;if(d.camMode===0)l=n.x-o*9.2,s=n.y+3.5,r=n.z-i*9.2,a=n.x+o*12,c=n.y+1.7,f=n.z+i*12;else if(d.camMode===1)l=n.x+o*.4,s=n.y+1.3,r=n.z+i*.4,a=n.x+o*45,c=n.y+.9,f=n.z+i*45,h=30;else{const A=t*.075,z=13+4*Math.sin(t*.021);l=n.x+Math.sin(A)*z,s=n.y+4.2+2.2*Math.sin(t*.033),r=n.z+Math.cos(A)*z,a=n.x,c=n.y+1.2,f=n.z,h=2.5}const m=ce(l,r)+1.15;s<m&&(s=m);const F=1-Math.exp(-h*e);be.x+=(l-be.x)*F,be.y+=(s-be.y)*F,be.z+=(r-be.z)*F;const N=n.off*Math.min(Math.abs(n.speed)/12,1)*.06;Y.position.set(be.x+(Math.random()-.5)*N,be.y+(Math.random()-.5)*N,be.z+(Math.random()-.5)*N),xa.set(a,c,f),Y.lookAt(xa),g.uCamPos.value.copy(Y.position);const L=d.camMode===1?70:62+ne(n.speed,0,Ut)*.22;Math.abs(Y.fov-L)>.05&&(Y.fov+=(L-Y.fov)*Math.min(1,e*2),Y.updateProjectionMatrix()),pt.position.copy(Y.position)}const P=e=>new U(e),je={grass:[P(7647316),P(8366148),P(10718023),P(9146488)],grassAlt:[P(6265417),P(7115833),P(9401401),P(8093801)],leafA:[P(9684068),P(5214011),P(13664046),P(10128768)],leafB:[P(11719806),P(6988616),P(13062191),P(8878700)],conifA:[P(3503178),P(2976316),P(3105089),P(3823690)],conifB:[P(4491098),P(3897930),P(4026446),P(4612693)],leafDen:[.85,1,.8,.22],snow:[.06,0,0,1]},nn=["Spring","Summer","Autumn","Winter"],sn=["🌸","☀️","🍂","❄️"],rn=[1,.7,.15,0];function Re(e,t,o){const i=(t-.5+4)%4,l=Math.floor(i);let s=i-l;return s=s*s*(3-2*s),o?(o.lerpColors(e[l],e[(l+1)%4],s),o):ka(e[l],e[(l+1)%4],s)}const O={daylight:1,night:0,snow:0,sunElev:1},ln=new J(0,1,0),Ma=new J,Oe=new J,Bt=new J,Mt=new J;function cn(){const e=g.uSunDir.value;Ma.set(n.x,n.y,n.z),Oe.crossVectors(ln,e),Oe.lengthSq()<1e-4?Oe.set(1,0,0):Oe.normalize(),Bt.crossVectors(e,Oe).normalize(),Mt.set(n.x+e.x*ze,n.y+Math.max(e.y,.06)*ze,n.z+e.z*ze);const t=pe*2/Q.shadow.mapSize.x,o=Mt.dot(Oe),i=Mt.dot(Bt),l=Math.round(o/t)*t-o,s=Math.round(i/t)*t-i;Mt.addScaledVector(Oe,l).addScaledVector(Bt,s),Q.position.copy(Mt),Q.target.position.copy(Ma).addScaledVector(Oe,l).addScaledVector(Bt,s)}const v={cloud:.28,rain:0,fog:0,tCloud:.28,tRain:0,tFog:.04,next:25,snowMode:!1};function un(){const e=Math.floor(d.phase)%4,t=[[.4,.24,.24,.12],[.6,.26,.04,.1],[.32,.26,.24,.18],[.34,.24,.32,.1]][e];let o=Math.random(),i=0;for(let s=0;s<4;s++)if(o-=t[s],o<=0){i=s;break}const l=Math.random();i===0?(v.tCloud=.1+.18*l,v.tRain=0,v.tFog=.03):i===1?(v.tCloud=.52+.3*l,v.tRain=0,v.tFog=.1):i===2?(v.tCloud=.88,v.tRain=.45+.5*l,v.tFog=.3):(v.tCloud=.45,v.tRain=0,v.tFog=.6+.35*l),v.next=d.simT+35+Math.random()*70}function dn(e){d.weatherMode==="clear"?(v.tCloud=.12,v.tRain=0,v.tFog=.03):d.simT>v.next&&un();const t=Math.min(1,e*d.timeScale*.045);v.cloud+=(v.tCloud-v.cloud)*t,v.rain+=(v.tRain-v.rain)*t,v.fog+=(v.tFog-v.fog)*t,v.snowMode=O.snow>.45;const o=v.rain*(v.snowMode?0:1);g.uWet.value+=(o-g.uWet.value)*Math.min(1,e*.5)}const Ue=new U,yt=new U,ue=new U,hn=P(3500213),pn=P(12440295),fn=P(329744),mn=P(856866),vo=P(16748362),vn=P(16777215),gn=P(9279395),wn=P(1448484),xn=P(16767400),Mn=P(16774888);function yn(e){if(d.simT+=e*d.timeScale,d.tod=(d.tod+e*d.timeScale/De)%1,d.seasonMode==="auto")d.phase=(d.phase+e*d.timeScale/ht)%4;else{const N=(d.seasonTarget+.5-d.phase+6)%4-2;d.phase=(d.phase+ne(N,-e*.6,e*.6)+4)%4}g.uTime.value=d.simT;const t=(d.tod-.25)*Ne;g.uSunDir.value.set(Math.cos(t),Math.sin(t),.42).normalize();const o=g.uSunDir.value.y;O.sunElev=o,O.daylight=ge(-.09,.24,o),O.night=1-ge(-.16,-.015,o);const i=Math.exp(-Math.abs(o)*9)*ge(-.25,.02,o);Me.uMoonDir.value.set(-g.uSunDir.value.x,Math.max(.25,-o+.3),-.3).normalize(),Me.uNight.value=O.night;const l=1-v.cloud*.6-v.fog*.35;Ue.lerpColors(fn,hn,O.daylight),yt.lerpColors(mn,pn,O.daylight),yt.lerp(vo,i*.75*l);const s=ne(v.cloud*.45+v.fog*.55,0,.85);ue.copy(Ue),ue.lerp(yt,.55),Ue.lerp(ue,s*.6),Me.uZenith.value.copy(Ue),Me.uHorizon.value.copy(yt),Me.uCloud.value=.22+v.cloud*.62,ue.lerpColors(wn,vn,O.daylight),ue.lerp(gn,v.cloud*.7*O.daylight),ue.lerp(vo,i*.4),Me.uCloudCol.value.copy(ue),g.uFogColor.value.copy(yt).lerp(Me.uZenith.value,.25);const r=le[d.quality].fog+v.fog*.0042+v.rain*.001;g.uFogDensity.value=r,H.fog.color.copy(g.uFogColor.value),H.fog.density=r;const a=O.daylight*l,c=O.night*(1-v.cloud*.65)*.3;Ue.lerpColors(xn,Mn,ge(.02,.35,o)),Ue.lerp(vo,i*.6),g.uSunColor.value.copy(Ue).multiplyScalar(1.45*a),ue.setRGB(.62,.72,.95).multiplyScalar(c),g.uSunColor.value.add(ue),O.night>.001&&g.uSunDir.value.lerp(Me.uMoonDir.value,O.night).normalize(),g.uHemiSky.value.copy(Me.uZenith.value).multiplyScalar(.55+.45*O.daylight).addScalar(.012),g.uHemiSky.value.add(ue.setRGB(.045,.06,.1).multiplyScalar(O.night)),g.uHemiGround.value.setRGB(.16,.15,.12).multiplyScalar(O.daylight*l+.06),g.uHemiGround.value.add(ue.setRGB(.012,.016,.028).multiplyScalar(O.night)),Q.color.copy(Ue),O.night>.001&&Q.color.lerp(ue.setRGB(.62,.72,.95),O.night*.85),Q.intensity=3.1*a+c*1.5,cn();const f=ge(.04,.25,O.daylight+c*1.2);g.uShadowOn.value+=(f-g.uShadowOn.value)*Math.min(1,e*2.5),Q.castShadow=g.uShadowOn.value>.02,Q.shadow.map&&(g.uShadowMap.value=Q.shadow.map.texture),xe.color.copy(g.uHemiSky.value).multiplyScalar(1.6),xe.groundColor.copy(g.uHemiGround.value).multiplyScalar(1.6),xe.intensity=1,Re(je.grass,d.phase,g.uGrass.value),Re(je.grassAlt,d.phase,g.uGrassAlt.value),Re(je.leafA,d.phase,mt.uniforms.uLeafA.value),Re(je.leafB,d.phase,mt.uniforms.uLeafB.value),Re(je.conifA,d.phase,Ft.uniforms.uLeafA.value),Re(je.conifB,d.phase,Ft.uniforms.uLeafB.value),mt.uniforms.uLeafDensity.value=Re(je.leafDen,d.phase),O.snow=Re(je.snow,d.phase),g.uSnow.value=O.snow,g.uGrassGrow.value=1-O.snow*.78,g.uBloom.value=Re(rn,d.phase),lo.visible=g.uBloom.value>.03;const m=o<.03||v.fog>.55||v.rain>.6?1:0;g.uHL.value+=(m-g.uHL.value)*Math.min(1,e*3);for(const F of ha)F.intensity=g.uHL.value*40;for(const F of fa)F.material.opacity=g.uHL.value*.85;fo.emissiveIntensity=.25+g.uHL.value*2.4,mo.emissiveIntensity=.35+g.uHL.value*2.6,Bo.value=g.uHL.value*.85+O.night*.15}const kt=800,bn=36,Se=new Float32Array(kt*3),It=new lt,qe=new Float32Array(kt*2*3);It.setAttribute("position",new K(qe,3));const tt=new hs({color:11189200,transparent:!0,opacity:0,fog:!0}),go=new ps(It,tt);go.frustumCulled=!1,H.add(go);for(let e=0;e<kt;e++)Se[e*3]=(Math.random()-.5)*70,Se[e*3+1]=Math.random()*40,Se[e*3+2]=(Math.random()-.5)*70;const bt=1e3,Fe=new Float32Array(bt*3),Ht=new Float32Array(bt),Vt=new lt,qt=new Float32Array(bt*3);Vt.setAttribute("position",new K(qt,3));const ya=(()=>{const e=document.createElement("canvas");e.width=e.height=32;const t=e.getContext("2d"),o=t.createRadialGradient(16,16,1,16,16,15);return o.addColorStop(0,"rgba(255,255,255,1)"),o.addColorStop(.6,"rgba(255,255,255,0.5)"),o.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=o,t.fillRect(0,0,32,32),new No(e)})(),ot=new fs({size:.22,map:ya,transparent:!0,opacity:0,depthWrite:!1,fog:!0,color:16777215,sizeAttenuation:!0}),wo=new ms(Vt,ot);wo.frustumCulled=!1,H.add(wo);for(let e=0;e<bt;e++)Fe[e*3]=(Math.random()-.5)*64,Fe[e*3+1]=Math.random()*30,Fe[e*3+2]=(Math.random()-.5)*64,Ht[e]=Math.random()*Ne;function Sn(e){const t=v.rain*(v.snowMode?0:1),o=v.rain*(v.snowMode?1:0);tt.opacity+=(t*.32-tt.opacity)*Math.min(1,e*2),ot.opacity+=(o*.85-ot.opacity)*Math.min(1,e*2);const i=Y.position.x,l=Y.position.y,s=Y.position.z;if(tt.opacity>.01){for(let a=0;a<kt;a++){let c=Se[a*3+1]-bn*e,f=Se[a*3]+4*e;c<-14&&(c+=40+Math.random()*8,f=(Math.random()-.5)*70,Se[a*3+2]=(Math.random()-.5)*70),f>35&&(f-=70),Se[a*3]=f,Se[a*3+1]=c;const h=a*6;qe[h]=i+f,qe[h+1]=l+c,qe[h+2]=s+Se[a*3+2],qe[h+3]=i+f-.16,qe[h+4]=l+c+1.5,qe[h+5]=s+Se[a*3+2]}It.attributes.position.needsUpdate=!0}if(go.visible=tt.opacity>.01,ot.opacity>.01){const r=d.simT;for(let a=0;a<bt;a++){let c=Fe[a*3+1]-(1.5+Math.sin(Ht[a])*.4)*e;c<-10&&(c+=30+Math.random()*6,Fe[a*3]=(Math.random()-.5)*64,Fe[a*3+2]=(Math.random()-.5)*64),Fe[a*3+1]=c,qt[a*3]=i+Fe[a*3]+Math.sin(r*.7+Ht[a])*1.6,qt[a*3+1]=l+c,qt[a*3+2]=s+Fe[a*3+2]+Math.cos(r*.55+Ht[a]*1.7)*1.4}Vt.attributes.position.needsUpdate=!0}wo.visible=ot.opacity>.01}let S=null,de=null,We=null,Qe=null,Xe=null,Ce=null,at=null,Be=null,nt=null,ba=0,Sa=0,st=null,rt=null,Ca=0;const Wt=[9,15,22,30,39,49,59,69];function Cn(){if(S)return;try{S=new(window.AudioContext||window.webkitAudioContext)}catch{return}de=S.createGain(),de.gain.value=d.muted?0:d.vol*.9;const e=S.createDynamicsCompressor();de.connect(e),e.connect(S.destination),Ce=S.createBiquadFilter(),Ce.type="lowpass",Ce.frequency.value=260,Ce.Q.value=.6,at=S.createGain(),at.gain.value=0,We=S.createOscillator(),We.type="sawtooth",We.frequency.value=62,Qe=S.createOscillator(),Qe.type="sawtooth",Qe.frequency.value=93;const t=S.createGain();t.gain.value=.45,Xe=S.createOscillator(),Xe.type="sine",Xe.frequency.value=31;const o=S.createGain();o.gain.value=.7,We.connect(Ce),Qe.connect(t),t.connect(Ce),Xe.connect(o),o.connect(Ce),Ce.connect(at),at.connect(de),We.start(),Qe.start(),Xe.start();const i=S.sampleRate*2,l=S.createBuffer(1,i,S.sampleRate),s=l.getChannelData(0);for(let m=0;m<i;m++)s[m]=Math.random()*2-1;const r=S.createBufferSource();r.buffer=l,r.loop=!0;const a=S.createBiquadFilter();a.type="bandpass",a.frequency.value=420,a.Q.value=.35,st=S.createGain(),st.gain.value=0,r.connect(a),a.connect(st),st.connect(de),r.start();const c=S.createBufferSource();c.buffer=l,c.loop=!0,c.playbackRate.value=.86;const f=S.createBiquadFilter();f.type="highpass",f.frequency.value=2600,rt=S.createGain(),rt.gain.value=0,c.connect(f),f.connect(rt),rt.connect(de),c.start();const h=S.createBufferSource();h.buffer=l,h.loop=!0,h.playbackRate.value=.6,Be=S.createBiquadFilter(),Be.type="bandpass",Be.frequency.value=760,Be.Q.value=.9,nt=S.createGain(),nt.gain.value=0,h.connect(Be),Be.connect(nt),nt.connect(de),h.start()}function Tn(){if(!S||!de)return;const e=S.currentTime+.02,t=2+(Math.random()*4|0),o=S.createStereoPanner?S.createStereoPanner():null,i=o||de;o&&(o.pan.value=Math.random()*1.6-.8,o.connect(de));for(let l=0;l<t;l++){const s=e+l*(.12+Math.random()*.06),r=S.createOscillator(),a=S.createGain();r.type="sine";const c=2100+Math.random()*1700;r.frequency.setValueAtTime(c,s),r.frequency.exponentialRampToValueAtTime(c*(1.12+Math.random()*.3),s+.05),r.frequency.exponentialRampToValueAtTime(c*.88,s+.1),a.gain.setValueAtTime(0,s),a.gain.linearRampToValueAtTime(.035,s+.015),a.gain.exponentialRampToValueAtTime(1e-4,s+.12),r.connect(a),a.connect(i),r.start(s),r.stop(s+.14)}}function An(){if(!S||S.state!=="running"||!We||!Qe||!Xe||!Ce||!at||!Be||!nt||!st||!rt)return;const e=S.currentTime,t=Math.abs(n.speed),o=Math.max(ga(),d.auto?.4:0);let i=0;for(;i<Wt.length-1&&t>Wt[i];)i++;const l=i===0?0:Wt[i-1],s=1050+ne((t-l)/(Wt[i]-l),0,1)*5300;i!==Sa&&(ba=e,Sa=i);const r=Math.max(0,1-(e-ba)/.13),a=s/60*4;We.frequency.setTargetAtTime(a,e,.04),Qe.frequency.setTargetAtTime(a*1.5+2,e,.04),Xe.frequency.setTargetAtTime(a*.5,e,.04),Ce.frequency.setTargetAtTime(320+s*.42+o*260,e,.08);const c=t>.3||o>0,f=.35+.65*Math.abs(o);let h=c?.03+.05*(s/6350)+.045*f*Math.min(t/12,1):.03;h*=1-r*.4,at.gain.setTargetAtTime(h,e,.12);const m=o<.05&&s>3e3?.018+.014*Math.random():0;nt.gain.setTargetAtTime(.012*f*Math.min(t/10,1)+m,e,.1),Be.frequency.setTargetAtTime(500+s*.22,e,.1),st.gain.setTargetAtTime(Math.pow(t/Ut,2)*.42+v.rain*.02,e,.2),rt.gain.setTargetAtTime(v.rain*(v.snowMode?.015:.2),e,.4);const F=Math.floor(d.phase)%4;(F===0||F===1)&&O.daylight>.55&&d.simT>Ca&&(Math.random()<.65&&Tn(),Ca=d.simT+2.5+Math.random()*7)}function Ta(){de&&S&&de.gain.setTargetAtTime(d.muted?0:d.vol*.9,S.currentTime,.05)}function _n(){d.muted=!d.muted,Ta()}const zn=w(".wander-panel");function xo(){zn.classList.toggle("wander-hidden")}w(".wander-gear-btn").addEventListener("click",xo),w(".wander-close-panel").addEventListener("click",xo);function Qt(e,t,o){for(const i of e.querySelectorAll("button"))i.classList.toggle("wander-on",i.dataset[t]===String(o))}const Mo=w(".wander-auto-chip");function Xt(e,t){d.auto=e,Mo.classList.toggle("wander-off",!e),Mo.textContent=e?"AUTO-DRIVE":"AUTO-DRIVE OFF"}Mo.addEventListener("click",()=>Xt(!d.auto));const Aa=w(".wander-cam-btns");function yo(e){d.camMode=e,Qt(Aa,"c",e)}Aa.addEventListener("click",e=>{const t=e.target;t.dataset.c!==void 0&&yo(+t.dataset.c)});const _a=w(".wander-season-btns");function bo(e){e==="auto"?d.seasonMode="auto":(d.seasonMode="manual",d.seasonTarget=+e),Qt(_a,"s",e)}_a.addEventListener("click",e=>{const t=e.target;t.dataset.s!==void 0&&bo(t.dataset.s)});const za=w(".wander-wx-btns");za.addEventListener("click",e=>{const t=e.target;t.dataset.w!==void 0&&(d.weatherMode=t.dataset.w,Qt(za,"w",d.weatherMode))});const Pa=w(".wander-qual-btns");Pa.addEventListener("click",e=>{const t=e.target;t.dataset.q!==void 0&&(d.quality=+t.dataset.q,Qt(Pa,"q",d.quality),_e(),la(n.s))});const Pn=w(".wander-time-scale"),Rn=w(".wander-time-scale-val");Pn.addEventListener("input",e=>{d.timeScale=+e.target.value,Rn.textContent=d.timeScale+"×"});const Fn=w(".wander-vol"),Nn=w(".wander-vol-val");Fn.addEventListener("input",e=>{d.vol=+e.target.value,d.muted=!1,Nn.textContent=String(Math.round(d.vol*100)),Ta()});const En=w(".wander-seed-val");En.textContent=String(y),w(".wander-new-seed").addEventListener("click",()=>{window.location.search="?seed="+(Math.random()*1e9|0)});const Dn=w(".wander-speed"),Ln=w(".wander-season-chip"),Gn=w(".wander-clock-chip"),jn=w(".wander-wx-chip");let Ra=0;function On(e){if(e<Ra)return;Ra=e+.12,Dn.textContent=String(Math.round(Math.abs(n.speed)*3.6));const t=Math.floor(d.phase)%4;Ln.textContent=sn[t]+" "+nn[t];const o=d.tod*24,i=Math.floor(o),l=Math.floor((o-i)*60);Gn.textContent=String(i).padStart(2,"0")+":"+String(l).padStart(2,"0");let s="☀️";O.night>.5&&(s="🌙"),v.cloud>.5&&(s="⛅"),v.fog>.5&&(s="🌫️"),v.rain>.25&&(s=v.snowMode?"❄️":"🌧️"),jn.textContent=s}jo(3e3);{const e=D.pts[20];n.x=e.x,n.z=e.z,n.heading=Math.atan2(e.dx,e.dz),n.velDir=n.heading,n.y=e.y,n.speed=14,be.set(e.x-e.dx*20,e.y+9,e.z-e.dz*20)}Ko(n.x,n.z,400),Vo(n.s);const So=w(".wander-start"),Fa=w(".wander-cover"),Un=w(".wander-help");w(".wander-start-btn").addEventListener("click",()=>{d.started=!0,Cn(),S&&S.state==="suspended"&&S.resume(),Xt(!0),yo(0),So.style.transition="opacity .8s ease",So.style.opacity="0",j(()=>So.classList.add("wander-hidden"),850),j(()=>{Un.style.opacity="0"},14e3)}),j(()=>{Fa.style.opacity="0"},700),j(()=>Fa.classList.add("wander-hidden"),2500);let Co=0,To=0,Na=4;function Bn(e,t){if(Co+=e,To++,t<Na)return;const o=To/Math.max(Co,1e-4);Co=0,To=0,Na=t+3,o<42&&he>.55?(he=Math.max(.55,he*.88),_e()):o>57&&he<1&&(he=Math.min(1,he*1.08),_e())}_e();let Ea=performance.now(),Yt=0;return se.setAnimationLoop(e=>{const t=Math.min(.05,(e-Ea)/1e3);Ea=e,Yt+=t,on(t),Vo(n.s),Ko(n.x,n.z,5),$a(2.5),yn(t),dn(t),Sn(t),an(t,Yt),An(),On(Yt),Bn(t,Yt),$.render()}),()=>{G=!0,se.setAnimationLoop(null),window.removeEventListener("resize",Ke),window.removeEventListener("keydown",ma),window.removeEventListener("keyup",va);for(const e of M)window.clearTimeout(e);S&&S.close();for(const e of ft.values())e.geometry.dispose();for(const e of vt.values())for(const t of e.meshes){const o=t;o.geometry!==zt&&o.geometry!==Pt&&o.geometry!==Rt&&o.geometry.dispose()}Uo.dispose(),to.dispose(),zt.dispose(),Pt.dispose(),Rt.dispose(),Ft.dispose(),mt.dispose(),Xo.dispose(),Wo.dispose(),Oo.dispose(),ye.dispose(),ea.dispose(),fe.dispose(),ia.dispose(),aa.dispose(),It.dispose(),tt.dispose(),Vt.dispose(),ot.dispose(),ya.dispose(),pt.geometry.dispose(),Lo.dispose(),pa.dispose(),ho.dispose(),ca.dispose(),Ve.dispose(),po.dispose(),fo.dispose(),mo.dispose(),$.dispose(),se.dispose(),Ae.parentNode&&Ae.parentNode.removeChild(Ae)}},[]),p.jsxs("div",{ref:E,className:"wander-shell",children:[p.jsx("div",{className:"wander-vignette"}),p.jsx("div",{className:"wander-cover"}),p.jsxs("div",{className:"wander-hud",children:[p.jsx("div",{className:"wander-speed",children:"0"}),p.jsx("div",{className:"wander-speed-unit",children:"KM/H"}),p.jsx("div",{className:"wander-auto-chip",children:"AUTO-DRIVE"})]}),p.jsxs("div",{className:"wander-chips",children:[p.jsx("div",{className:"wander-chip wander-season-chip",children:"Spring"}),p.jsx("div",{className:"wander-chip wander-clock-chip",children:"08:40"}),p.jsx("div",{className:"wander-chip wander-wx-chip",children:"☀️"}),p.jsx("div",{className:"wander-chip wander-gear-btn",children:"⚙︎"})]}),p.jsxs("div",{className:"wander-help",children:[p.jsx("b",{children:"W/S"})," drive · ",p.jsx("b",{children:"A/D"})," steer · ",p.jsx("b",{children:"Space"})," brake · ",p.jsx("b",{children:"T"})," auto-drive · ",p.jsx("b",{children:"C"})," camera · ",p.jsx("b",{children:"R"})," reset · ",p.jsx("b",{children:"M"})," sound · ",p.jsx("b",{children:"Esc"})," settings"]}),p.jsxs("div",{className:"wander-panel wander-hidden",children:[p.jsxs("h2",{children:["SETTINGS ",p.jsx("button",{className:"wander-close-panel",children:"×"})]}),p.jsxs("div",{className:"wander-row",children:[p.jsx("label",{children:"Time speed"}),p.jsx("input",{className:"wander-time-scale",type:"range",min:"0",max:"8",step:"0.25",defaultValue:"1"}),p.jsx("span",{className:"wander-val wander-time-scale-val",children:"1×"})]}),p.jsxs("div",{className:"wander-row",children:[p.jsx("label",{children:"Season"}),p.jsxs("div",{className:"wander-btns wander-season-btns",children:[p.jsx("button",{"data-s":"auto",className:"wander-on",children:"Auto"}),p.jsx("button",{"data-s":"0",children:"Spring"}),p.jsx("button",{"data-s":"1",children:"Summer"}),p.jsx("button",{"data-s":"2",children:"Autumn"}),p.jsx("button",{"data-s":"3",children:"Winter"})]})]}),p.jsxs("div",{className:"wander-row",children:[p.jsx("label",{children:"Weather"}),p.jsxs("div",{className:"wander-btns wander-wx-btns",children:[p.jsx("button",{"data-w":"auto",className:"wander-on",children:"Auto"}),p.jsx("button",{"data-w":"clear",children:"Clear"})]})]}),p.jsxs("div",{className:"wander-row",children:[p.jsx("label",{children:"Camera"}),p.jsxs("div",{className:"wander-btns wander-cam-btns",children:[p.jsx("button",{"data-c":"0",className:"wander-on",children:"Chase"}),p.jsx("button",{"data-c":"1",children:"Hood"}),p.jsx("button",{"data-c":"2",children:"Cinematic"})]})]}),p.jsxs("div",{className:"wander-row",children:[p.jsx("label",{children:"Quality"}),p.jsxs("div",{className:"wander-btns wander-qual-btns",children:[p.jsx("button",{"data-q":"0",children:"Low"}),p.jsx("button",{"data-q":"1",className:"wander-on",children:"Medium"}),p.jsx("button",{"data-q":"2",children:"High"})]})]}),p.jsxs("div",{className:"wander-row",children:[p.jsx("label",{children:"Volume"}),p.jsx("input",{className:"wander-vol",type:"range",min:"0",max:"1",step:"0.05",defaultValue:"0.8"}),p.jsx("span",{className:"wander-val wander-vol-val",children:"80"})]}),p.jsxs("div",{className:"wander-row-small",children:["world seed ",p.jsx("span",{className:"wander-seed-val"})," · ",p.jsx("a",{className:"wander-new-seed",children:"new world ↻"})]})]}),p.jsx("div",{className:"wander-start",children:p.jsxs("div",{className:"wander-start-card",children:[p.jsx("h1",{children:"WANDER"}),p.jsx("p",{children:"an endless scenic drive through the seasons"}),p.jsx("button",{className:"wander-start-btn",children:"BEGIN DRIVE"}),p.jsx("div",{className:"wander-tiny",children:"procedural & infinite · sound on 🎧"})]})})]})}export{_s as default};
