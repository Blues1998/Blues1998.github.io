import{j as O}from"./jsx-runtime.D_zvdyIk.js";import{r as $t}from"./index.DiEladB3.js";import{m as ne,V as ae,O as dt,n as Go,o as eo,p as rt,q as Fo,B as Qe,d as pe,r as Bo,s as po,t as Io,G as Se,u as xe,a as Oo,l as Je,c as me,T as jo,v as wt,w as ho,x as lt,y as fo,k as Ye,z as Ce,M as to,Q as De,H as Wo,J as Ho,f as mo,K as qo,N as Uo,U as Vo,X as Ft,I as go,Y as oo,Z as tt,D as ot,L as Qo,_ as Yo,e as Xo,g as Ko,i as _e,$ as Tt,a0 as Rt,a1 as Gt,a2 as Zo,a3 as Jo,a4 as $o,a5 as en,a6 as tn,a7 as vo,a8 as on,a9 as nn,aa as sn,W as an,ab as rn,S as ln,F as cn,P as un,ac as dn,ad as pn,ae as hn,af as fn,b as mn,j as _t,ag as pt}from"./three.module.D9zLR4Ut.js";import{G as gn}from"./GLTFLoader.C9SfRFbY.js";import{P as wo,C as kt,F as yo,E as vn,R as wn}from"./RenderPass.DIUKXcoY.js";import"./BufferGeometryUtils.p-N0zXVu.js";const ut=[{radius:4,fog:.00225,prCap:1.25},{radius:5,fog:.00165,prCap:1.5},{radius:6,fog:.00125,prCap:2}],yn=600,xn=260,ce=4,fe=5.5,ht=50,qe=64,no=220,Mn=[30,60,90],so=4,Pt=.18,Dt=150,ao=22,bn=.3,Sn=1.15,Cn=1/700,ro=120,An=.45,Be=150,be=132,Ue=33,io=1/6e4,lo=1/51e3,Lt=4200,ft=320,ct=69,co=9,Ie=[9,15,22,30,39,49,59,69],at=60,Nt=260,uo=2048,mt=800,Tn=36,nt=1e3,ke=Math.PI*2,se=(l,t,r)=>l<t?t:l>r?r:l,vt=(l,t,r)=>l+(t-l)*r,ye=(l,t,r)=>{const n=se((r-l)/(t-l),0,1);return n*n*(3-2*n)},Xe=l=>{let t=l;for(;t>Math.PI;)t-=ke;for(;t<-Math.PI;)t+=ke;return t};function it(l){let t=l;return function(){t|=0,t=t+1831565813|0;let r=Math.imul(t^t>>>15,1|t);return r=r+Math.imul(r^r>>>7,61|r)^r,((r^r>>>14)>>>0)/4294967296}}function Le(l,t,r){let n=Math.imul(l,374761393)+Math.imul(t,668265263)+r|0;return n=Math.imul(n^n>>>13,1274126177),(n^n>>>16)>>>0}function st(l){const t=it(l),r=new Uint8Array(256);for(let i=0;i<256;i++)r[i]=i;for(let i=255;i>0;i--){const s=t()*(i+1)|0,c=r[i];r[i]=r[s],r[s]=c}const n=new Uint8Array(512);for(let i=0;i<512;i++)n[i]=r[i&255];const u=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1],e=.3660254037844386,o=.21132486540518713;return function(i,s){const c=(i+s)*e,p=Math.floor(i+c),h=Math.floor(s+c),d=(p+h)*o,A=i-p+d,_=s-h+d,P=A>_?1:0,L=1-P,g=A-P+o,w=_-L+o,x=A-1+2*o,M=_-1+2*o,T=p&255,S=h&255;let R=0,y=.5-A*A-_*_;if(y>0){y*=y;const b=(n[T+n[S]]&7)*2;R+=y*y*(u[b]*A+u[b+1]*_)}let a=.5-g*g-w*w;if(a>0){a*=a;const b=(n[T+P+n[S+L]]&7)*2;R+=a*a*(u[b]*g+u[b+1]*w)}let z=.5-x*x-M*M;if(z>0){z*=z;const b=(n[T+1+n[S+1]]&7)*2;R+=z*z*(u[b]*x+u[b+1]*M)}return 70*R}}function Ze(l,t,r,n,u=2,e=.5){let o=1,i=1,s=0,c=0;for(let p=0;p<n;p++)s+=o*l(t*i,r*i),c+=o,o*=e,i*=u;return s/c}function Rn(l,t,r,n,u,e){let o=null,i=null,s=null,c=null,p=null,h=null,d=null,A=null,_=null,P=null,L=null,g=null,w=null,x=null,M=null,T=0,S=0,R=0,y=0;function a(){if(o)return;try{o=new(window.AudioContext||window.webkitAudioContext)}catch{return}i=o.createGain(),i.gain.value=l.muted?0:l.vol*.9;const f=o.createDynamicsCompressor();i.connect(f),f.connect(o.destination),d=o.createBiquadFilter(),d.type="lowpass",d.frequency.value=260,d.Q.value=.6,A=o.createGain(),A.gain.value=0,c=o.createOscillator(),c.type="sawtooth",c.frequency.value=62,p=o.createOscillator(),p.type="sawtooth",p.frequency.value=93;const E=o.createGain();E.gain.value=.45,h=o.createOscillator(),h.type="sine",h.frequency.value=31;const D=o.createGain();D.gain.value=.7,c.connect(d),p.connect(E),E.connect(d),h.connect(D),D.connect(d),s=o.createBiquadFilter(),s.type="lowpass",s.frequency.value=2e4,s.Q.value=.7,s.connect(i),d.connect(A),A.connect(s),c.start(),p.start(),h.start();const I=o.sampleRate*2,F=o.createBuffer(1,I,o.sampleRate),v=F.getChannelData(0);for(let C=0;C<I;C++)v[C]=Math.random()*2-1;const m=o.createBufferSource();m.buffer=F,m.loop=!0;const G=o.createBiquadFilter();G.type="bandpass",G.frequency.value=420,G.Q.value=.35,L=o.createGain(),L.gain.value=0,m.connect(G),G.connect(L),L.connect(s),m.start();const U=o.createBufferSource();U.buffer=F,U.loop=!0,U.playbackRate.value=.86;const J=o.createBiquadFilter();J.type="highpass",J.frequency.value=2600,g=o.createGain(),g.gain.value=0,U.connect(J),J.connect(g),g.connect(i),U.start();const Z=o.createBufferSource();Z.buffer=F,Z.loop=!0,Z.playbackRate.value=.6,_=o.createBiquadFilter(),_.type="bandpass",_.frequency.value=760,_.Q.value=.9,P=o.createGain(),P.gain.value=0,Z.connect(_),_.connect(P),P.connect(s),Z.start();const te=o.createBufferSource();te.buffer=F,te.loop=!0,te.playbackRate.value=1.15,x=o.createBiquadFilter(),x.type="bandpass",x.frequency.value=1650,x.Q.value=2.8,M=o.createBiquadFilter(),M.type="peaking",M.frequency.value=2850,M.Q.value=4,M.gain.value=12,w=o.createGain(),w.gain.value=0,te.connect(x),x.connect(M),M.connect(w),w.connect(s),te.start()}function z(){if(!o||!i)return;const f=o.currentTime+.02,E=2+(Math.random()*4|0),D=o.createStereoPanner?o.createStereoPanner():null,I=D||i;D&&(D.pan.value=Math.random()*1.6-.8,D.connect(i));for(let F=0;F<E;F++){const v=f+F*(.12+Math.random()*.06),m=o.createOscillator(),G=o.createGain();m.type="sine";const U=2100+Math.random()*1700;m.frequency.setValueAtTime(U,v),m.frequency.exponentialRampToValueAtTime(U*(1.12+Math.random()*.3),v+.05),m.frequency.exponentialRampToValueAtTime(U*.88,v+.1),G.gain.setValueAtTime(0,v),G.gain.linearRampToValueAtTime(.035,v+.015),G.gain.exponentialRampToValueAtTime(1e-4,v+.12),m.connect(G),G.connect(I),m.start(v),m.stop(v+.14)}}function b(){if(!o||!i||l.muted)return;const f=o.currentTime,E=o.createOscillator(),D=o.createGain(),I=1600+Math.random()*1400;E.type="sine",E.frequency.setValueAtTime(I,f),E.frequency.exponentialRampToValueAtTime(I*.35,f+.015),D.gain.setValueAtTime(.014+Math.random()*.018,f),D.gain.exponentialRampToValueAtTime(1e-4,f+.018);const F=o.createStereoPanner?o.createStereoPanner():null;F?(F.pan.value=Math.random()*1.4-.7,E.connect(D),D.connect(F),F.connect(i)):(E.connect(D),D.connect(i)),E.start(f),E.stop(f+.022)}function B(){if(!o||!i||l.muted)return;const f=o.currentTime,E=o.sampleRate*.16|0,D=o.createBuffer(1,E,o.sampleRate),I=D.getChannelData(0);for(let J=0;J<E;J++)I[J]=(Math.random()*2-1)*(1-J/E);const F=o.createBufferSource();F.buffer=D;const v=o.createBiquadFilter();v.type="bandpass",v.frequency.value=650,v.Q.value=1.8;const m=o.createGain();m.gain.setValueAtTime(.001,f),m.gain.linearRampToValueAtTime(.045,f+.035),m.gain.exponentialRampToValueAtTime(1e-4,f+.16),F.connect(v),v.connect(m),m.connect(i),F.start(f);const G=o.createOscillator(),U=o.createGain();G.type="triangle",G.frequency.setValueAtTime(52,f),G.frequency.exponentialRampToValueAtTime(28,f+.045),U.gain.setValueAtTime(.03,f),U.gain.exponentialRampToValueAtTime(1e-4,f+.045),G.connect(U),U.connect(i),G.start(f),G.stop(f+.05)}function q(){if(!o||o.state!=="running"||!c||!p||!h||!d||!A||!_||!P||!L||!g)return;const f=o.currentTime,E=Math.abs(t.speed),D=Math.max(u(),l.auto?.4:0),I=l.camMode===2;s&&s.frequency.setTargetAtTime(I?880:2e4,f,.08),e&&e()&&B(),I&&r.rain>.04&&f>y&&(b(),y=f+(.02+Math.random()*(.08/Math.max(r.rain,.1))));let F=0;for(;F<Ie.length-1&&E>Ie[F];)F++;const v=F===0?0:Ie[F-1],m=1050+se((E-v)/(Ie[F]-v),0,1)*5300;F!==S&&(T=f,S=F);const G=Math.max(0,1-(f-T)/.13),U=m/60*4;c.frequency.setTargetAtTime(U,f,.04),p.frequency.setTargetAtTime(U*1.5+2,f,.04),h.frequency.setTargetAtTime(U*.5,f,.04),d.frequency.setTargetAtTime(320+m*.42+D*260,f,.08);const J=E>.3||D>0,Z=.35+.65*Math.abs(D);let te=J?.03+.05*(m/6350)+.045*Z*Math.min(E/12,1):.03;te*=1-G*.4,A.gain.setTargetAtTime(te,f,.12);const C=D<.05&&m>3e3?.018+.014*Math.random():0;P.gain.setTargetAtTime(.012*Z*Math.min(E/10,1)+C,f,.1),_.frequency.setTargetAtTime(500+m*.22,f,.1);const N=I?.35:1,H=I?.4:1;if(L.gain.setTargetAtTime((Math.pow(E/ct,2)*.42+r.rain*.02)*N,f,.2),g.gain.setTargetAtTime(r.rain*(r.snowMode?.015:.2)*H,f,.4),w&&x){const V=t.slipVel||0,W=(1-(t.off||0)*.75)*(1-(r.snowMode?.7:0)),K=se((V-1.2)/6.5,0,1)*W,j=K*(I?.16:.26);w.gain.setTargetAtTime(j,f,.05),x.frequency.setTargetAtTime(1400+K*900+E*8,f,.05)}const ee=Math.floor(l.phase)%4;(ee===0||ee===1)&&n.daylight>.55&&l.simT>R&&(Math.random()<.65&&z(),R=l.simT+2.5+Math.random()*7)}function X(){i&&o&&i.gain.setTargetAtTime(l.muted?0:l.vol*.9,o.currentTime,.05)}function Q(){l.muted=!l.muted,X()}function k(){o&&o.state==="suspended"&&o.resume()}return{init:a,update:q,setVolume:X,toggleMute:Q,resume:k,dispose(){o&&o.close(),o=null}}}const $=l=>new ne(l),Me=[{name:"Woodland",temp:.55,moist:.78,spread:.24,amp:1,ridge:1,detail:1,terrace:0,grass:[$(7647316),$(8366148),$(10718023),$(9146488)],grassAlt:[$(6265417),$(7115833),$(9401401),$(8093801)],rock:$(6708564),dirt:$(7035975),treeDensity:1,coniferBias:.5,treeScale:1,rockDensity:1,rockScale:1,grassCover:1,flowerCover:1,fogMul:1,snowMul:1,snowLine:115,weather:[.4,.26,.22,.12]},{name:"Alpine",temp:.11,moist:.58,spread:.232,amp:1.85,ridge:2.5,detail:1.25,terrace:0,grass:[$(7315032),$(7643986),$(9276250),$(9080976)],grassAlt:[$(5999180),$(6459205),$(8025929),$(7831678)],rock:$(8093056),dirt:$(7236195),treeDensity:.55,coniferBias:1,treeScale:.85,rockDensity:2.6,rockScale:1.4,grassCover:.5,flowerCover:.55,fogMul:1.3,snowMul:1,snowLine:190,weather:[.3,.25,.28,.17]},{name:"High Desert",temp:.79,moist:.21,spread:.192,amp:1.15,ridge:1.45,detail:.55,terrace:.75,grass:[$(11244624),$(11045444),$(10255679),$(9666623)],grassAlt:[$(9402946),$(9600060),$(8809013),$(8219704)],rock:$(10246712),dirt:$(11565646),treeDensity:.06,coniferBias:.25,treeScale:.6,rockDensity:1.8,rockScale:1.2,grassCover:.18,flowerCover:.05,fogMul:.72,snowMul:.05,snowLine:260,weather:[.82,.14,.02,.02]},{name:"Badlands",temp:.63,moist:.37,spread:.2,amp:1.5,ridge:2,detail:1.7,terrace:.25,grass:[$(6183760),$(6381137),$(5920330),$(5658448)],grassAlt:[$(5065281),$(5262658),$(4736316),$(4605760)],rock:$(3354927),dirt:$(4867650),treeDensity:.02,coniferBias:.6,treeScale:.5,rockDensity:3.2,rockScale:1.3,grassCover:.08,flowerCover:0,fogMul:1.15,snowMul:.35,snowLine:190,weather:[.45,.34,.09,.12]},{name:"Salt Flats",temp:.88,moist:.01,spread:.152,amp:.1,ridge:.04,detail:.12,terrace:0,grass:[$(14276557),$(14473936),$(14013385),$(13816524)],grassAlt:[$(12894904),$(13092283),$(12631732),$(12434871)],rock:$(12104872),dirt:$(13618368),treeDensity:0,coniferBias:.5,treeScale:.5,rockDensity:.15,rockScale:.8,grassCover:.02,flowerCover:0,fogMul:.8,snowMul:0,snowLine:400,weather:[.9,.08,0,.02]}],Oe=Me.length;function _n(l,t,r){const n=Le(r,23327,11421)%2e6-1e6,u=Le(r,30691,16811)%2e6-1e6;function e(s,c){return se(l((s+n)*io,(c+u)*io)*.85+.5,0,1)}function o(s,c){return se(t((s+u)*lo+41.7,(c+n)*lo-18.3)*.85+.5,0,1)}function i(){const s=new Float32Array(Oe),c={amp:1,ridge:1,detail:1,terrace:0,treeDensity:1,coniferBias:.5,treeScale:1,rockDensity:1,rockScale:1,grassCover:1,flowerCover:1,fogMul:1,snowMul:1,weather:[0,0,0,0],dominant:0};function p(_,P){let L=0;for(let w=0;w<Oe;w++){const x=Me[w],M=_-x.temp,T=P-x.moist,S=Math.exp(-(M*M+T*T)/(x.spread*x.spread));s[w]=S,L+=S}const g=1/(L||1);for(let w=0;w<Oe;w++)s[w]*=g;return s}function h(_,P){return p(e(_,P),o(_,P))}function d(_){c.amp=0,c.ridge=0,c.detail=0,c.terrace=0,c.treeDensity=0,c.coniferBias=0,c.treeScale=0,c.rockDensity=0,c.rockScale=0,c.grassCover=0,c.flowerCover=0,c.fogMul=0,c.snowMul=0,c.weather[0]=c.weather[1]=c.weather[2]=c.weather[3]=0;let P=0,L=-1;for(let g=0;g<Oe;g++){const w=_[g];if(w>L&&(L=w,P=g),w<1e-4)continue;const x=Me[g];c.amp+=x.amp*w,c.ridge+=x.ridge*w,c.detail+=x.detail*w,c.terrace+=x.terrace*w,c.treeDensity+=x.treeDensity*w,c.coniferBias+=x.coniferBias*w,c.treeScale+=x.treeScale*w,c.rockDensity+=x.rockDensity*w,c.rockScale+=x.rockScale*w,c.grassCover+=x.grassCover*w,c.flowerCover+=x.flowerCover*w,c.fogMul+=x.fogMul*w,c.snowMul+=x.snowMul*w;for(let M=0;M<4;M++)c.weather[M]+=x.weather[M]*w}return c.dominant=P,c}function A(_,P){return d(h(_,P))}return{weightsAt:p,sample:h,blend:d,at:A}}return{temperatureAt:e,moistureAt:o,probe:i}}const kn=`
#define NB ${Oe}
uniform vec3 uBClim[NB];      /* x temp, y moist, z spread */
uniform vec3 uBGrass[NB];
uniform vec3 uBGrassAlt[NB];
uniform vec3 uBRock[NB];
uniform vec3 uBDirt[NB];
uniform vec2 uBSnow[NB];      /* x amount, y altitude line */

struct BiomeMix { vec3 grass; vec3 grassAlt; vec3 rock; vec3 dirt; float snow; float snowLine; };

BiomeMix mixBiomes(vec2 clim){
  BiomeMix o;
  o.grass = vec3(0.0); o.grassAlt = vec3(0.0); o.rock = vec3(0.0); o.dirt = vec3(0.0);
  o.snow = 0.0; o.snowLine = 0.0;
  float sum = 0.0;
  for (int i = 0; i < NB; i++) {
    vec2 d = clim - uBClim[i].xy;
    float f = exp(-dot(d, d) / (uBClim[i].z * uBClim[i].z));
    sum += f;
    o.grass    += uBGrass[i]    * f;
    o.grassAlt += uBGrassAlt[i] * f;
    o.rock     += uBRock[i]     * f;
    o.dirt     += uBDirt[i]     * f;
    o.snow     += uBSnow[i].x   * f;
    o.snowLine += uBSnow[i].y   * f;
  }
  float inv = 1.0 / max(sum, 1e-5);
  o.grass *= inv; o.grassAlt *= inv; o.rock *= inv; o.dirt *= inv;
  o.snow *= inv; o.snowLine *= inv;
  return o;
}
`;function Pn(l,t,r,n,u,e){const o=new ae(0,30,-40),i=new ae,s=new dt;s.position.set(.346,.99,.68),r.add(s);const c=new dt;c.position.set(.346,.82,35),r.add(c);const p=new dt;p.position.set(0,.72,2.3),r.add(p);const h=new dt;h.position.set(0,.65,35),r.add(h);function d(L,g,w,x,M){o.set(L-x*20,g+9,w-M*20)}const A=new ae,_=new ae;function P(L,g,w){if(u.camMode===2){r.updateWorldMatrix(!0,!1),s.getWorldPosition(A),c.getWorldPosition(_);const M=Math.cos(t.heading),T=-Math.sin(t.heading),S=se(t.steer*.02,-.025,.025);A.x+=M*S,A.z+=T*S;const R=t.steer*3;_.x+=M*R,_.z+=T*R,o.copy(A),i.lengthSq()<1?i.copy(_):(i.x=_.x,i.z=_.z,i.y+=(_.y-i.y)*Math.min(1,L*25)),l.position.copy(o),l.lookAt(i)}else if(u.camMode===1){r.updateWorldMatrix(!0,!1),p.getWorldPosition(A),h.getWorldPosition(_);const M=Math.cos(t.heading),T=-Math.sin(t.heading),S=t.steer*2.5;_.x+=M*S,_.z+=T*S,o.copy(A),i.copy(_),l.position.copy(o),l.lookAt(i)}else if(u.camMode===0){const M=Math.sin(t.heading),T=Math.cos(t.heading),S=t.x-M*9.2;let R=t.y+3.5;const y=t.z-T*9.2,a=t.x+M*12,z=t.y+1.7,b=t.z+T*12,B=n.sampleGround(S,y)+1.15;R<B&&(R=B);const q=1-Math.exp(-4.2*L);o.x+=(S-o.x)*q,o.y+=(R-o.y)*q,o.z+=(y-o.z)*q,l.position.copy(o),i.set(a,z,b),l.lookAt(i)}else{const M=g*.075,T=13+4*Math.sin(g*.021),S=t.x+Math.sin(M)*T;let R=t.y+4.2+2.2*Math.sin(g*.033);const y=t.z+Math.cos(M)*T,a=t.x,z=t.y+1.2,b=t.z,B=n.sampleGround(S,y)+1.15;R<B&&(R=B);const q=1-Math.exp(-2.5*L);o.x+=(S-o.x)*q,o.y+=(R-o.y)*q,o.z+=(y-o.z)*q,l.position.copy(o),i.set(a,z,b),l.lookAt(i)}w.uCamPos.value.copy(l.position);const x=u.camMode===1?74:u.camMode===2?80+se(t.speed,0,ct)*.08:60+se(t.speed,0,ct)*.18;Math.abs(l.fov-x)>.05&&(l.fov+=(x-l.fov)*Math.min(1,L*3),l.updateProjectionMatrix()),e.position.copy(l.position)}return{camPos:o,update:P,placeAtSpawn:d}}const zt=new WeakMap;class Dn extends Go{constructor(t){super(t),this.decoderPath="",this.decoderConfig={},this.decoderBinary=null,this.decoderPending=null,this.workerLimit=4,this.workerPool=[],this.workerNextTaskID=1,this.workerSourceURL="",this.defaultAttributeIDs={position:"POSITION",normal:"NORMAL",color:"COLOR",uv:"TEX_COORD"},this.defaultAttributeTypes={position:"Float32Array",normal:"Float32Array",color:"Float32Array",uv:"Float32Array"}}setDecoderPath(t){return this.decoderPath=t,this}setDecoderConfig(t){return this.decoderConfig=t,this}setWorkerLimit(t){return this.workerLimit=t,this}load(t,r,n,u){const e=new eo(this.manager);e.setPath(this.path),e.setResponseType("arraybuffer"),e.setRequestHeader(this.requestHeader),e.setWithCredentials(this.withCredentials),e.load(t,o=>{this.parse(o,r,u)},n,u)}parse(t,r,n=()=>{}){this.decodeDracoFile(t,r,null,null,rt,n).catch(n)}decodeDracoFile(t,r,n,u,e=Fo,o=()=>{}){const i={attributeIDs:n||this.defaultAttributeIDs,attributeTypes:u||this.defaultAttributeTypes,useUniqueIDs:!!n,vertexColorSpace:e};return this.decodeGeometry(t,i).then(r).catch(o)}decodeGeometry(t,r){const n=JSON.stringify(r);if(zt.has(t)){const s=zt.get(t);if(s.key===n)return s.promise;if(t.byteLength===0)throw new Error("THREE.DRACOLoader: Unable to re-decode a buffer with different settings. Buffer has already been transferred.")}let u;const e=this.workerNextTaskID++,o=t.byteLength,i=this._getWorker(e,o).then(s=>(u=s,new Promise((c,p)=>{u._callbacks[e]={resolve:c,reject:p},u.postMessage({type:"decode",id:e,taskConfig:r,buffer:t},[t])}))).then(s=>this._createGeometry(s.geometry));return i.catch(()=>!0).then(()=>{u&&e&&this._releaseTask(u,e)}),zt.set(t,{key:n,promise:i}),i}_createGeometry(t){const r=new Qe;t.index&&r.setIndex(new pe(t.index.array,1));for(let n=0;n<t.attributes.length;n++){const{name:u,array:e,itemSize:o,stride:i,vertexColorSpace:s}=t.attributes[n];let c;if(o===i)c=new pe(e,o);else{const p=new Bo(e,i);c=new Io(p,o,0)}u==="color"&&(this._assignVertexColorSpace(c,s),c.normalized=!(e instanceof Float32Array)),r.setAttribute(u,c)}return r}_assignVertexColorSpace(t,r){if(r!==rt)return;const n=new ne;for(let u=0,e=t.count;u<e;u++)n.fromBufferAttribute(t,u),po.colorSpaceToWorking(n,rt),t.setXYZ(u,n.r,n.g,n.b)}_loadLibrary(t,r){const n=new eo(this.manager);return n.setPath(this.decoderPath),n.setResponseType(r),n.setWithCredentials(this.withCredentials),new Promise((u,e)=>{n.load(t,u,void 0,e)})}preload(){return this._initDecoder(),this}_initDecoder(){if(this.decoderPending)return this.decoderPending;const t=typeof WebAssembly!="object"||this.decoderConfig.type==="js",r=[];return t?r.push(this._loadLibrary("draco_decoder.js","text")):(r.push(this._loadLibrary("draco_wasm_wrapper.js","text")),r.push(this._loadLibrary("draco_decoder.wasm","arraybuffer"))),this.decoderPending=Promise.all(r).then(n=>{const u=n[0];t||(this.decoderConfig.wasmBinary=n[1]);const e=Ln.toString(),o=["/* draco decoder */",u,"","/* worker */",e.substring(e.indexOf("{")+1,e.lastIndexOf("}"))].join(`
`);this.workerSourceURL=URL.createObjectURL(new Blob([o]))}),this.decoderPending}_getWorker(t,r){return this._initDecoder().then(()=>{if(this.workerPool.length<this.workerLimit){const u=new Worker(this.workerSourceURL);u._callbacks={},u._taskCosts={},u._taskLoad=0,u.postMessage({type:"init",decoderConfig:this.decoderConfig}),u.onmessage=function(e){const o=e.data;switch(o.type){case"decode":u._callbacks[o.id].resolve(o);break;case"error":u._callbacks[o.id].reject(o);break;default:console.error('THREE.DRACOLoader: Unexpected message, "'+o.type+'"')}},this.workerPool.push(u)}else this.workerPool.sort(function(u,e){return u._taskLoad>e._taskLoad?-1:1});const n=this.workerPool[this.workerPool.length-1];return n._taskCosts[t]=r,n._taskLoad+=r,n})}_releaseTask(t,r){t._taskLoad-=t._taskCosts[r],delete t._callbacks[r],delete t._taskCosts[r]}debug(){console.log("Task load: ",this.workerPool.map(t=>t._taskLoad))}dispose(){for(let t=0;t<this.workerPool.length;++t)this.workerPool[t].terminate();return this.workerPool.length=0,this.workerSourceURL!==""&&URL.revokeObjectURL(this.workerSourceURL),this}}function Ln(){let l,t;onmessage=function(o){const i=o.data;switch(i.type){case"init":l=i.decoderConfig,t=new Promise(function(p){l.onModuleLoaded=function(h){p({draco:h})},DracoDecoderModule(l)});break;case"decode":const s=i.buffer,c=i.taskConfig;t.then(p=>{const h=p.draco,d=new h.Decoder;try{const A=r(h,d,new Int8Array(s),c),_=A.attributes.map(P=>P.array.buffer);A.index&&_.push(A.index.array.buffer),self.postMessage({type:"decode",id:i.id,geometry:A},_)}catch(A){console.error(A),self.postMessage({type:"error",id:i.id,error:A.message})}finally{h.destroy(d)}});break}};function r(o,i,s,c){const p=c.attributeIDs,h=c.attributeTypes;let d,A;const _=i.GetEncodedGeometryType(s);if(_===o.TRIANGULAR_MESH)d=new o.Mesh,A=i.DecodeArrayToMesh(s,s.byteLength,d);else if(_===o.POINT_CLOUD)d=new o.PointCloud,A=i.DecodeArrayToPointCloud(s,s.byteLength,d);else throw new Error("THREE.DRACOLoader: Unexpected geometry type.");if(!A.ok()||d.ptr===0)throw new Error("THREE.DRACOLoader: Decoding failed: "+A.error_msg());const P={index:null,attributes:[]};for(const L in p){const g=self[h[L]];let w,x;if(c.useUniqueIDs)x=p[L],w=i.GetAttributeByUniqueId(d,x);else{if(x=i.GetAttributeId(d,o[p[L]]),x===-1)continue;w=i.GetAttribute(d,x)}const M=u(o,i,d,L,g,w);L==="color"&&(M.vertexColorSpace=c.vertexColorSpace),P.attributes.push(M)}return _===o.TRIANGULAR_MESH&&(P.index=n(o,i,d)),o.destroy(d),P}function n(o,i,s){const p=s.num_faces()*3,h=p*4,d=o._malloc(h);i.GetTrianglesUInt32Array(s,h,d);const A=new Uint32Array(o.HEAPF32.buffer,d,p).slice();return o._free(d),{array:A,itemSize:1}}function u(o,i,s,c,p,h){const d=s.num_points(),A=h.num_components(),_=e(o,p),P=A*p.BYTES_PER_ELEMENT,L=Math.ceil(P/4)*4,g=L/p.BYTES_PER_ELEMENT,w=d*P,x=d*L,M=o._malloc(w);i.GetAttributeDataArrayForAllPoints(s,h,_,w,M);const T=new p(o.HEAPF32.buffer,M,w/p.BYTES_PER_ELEMENT);let S;if(P===L)S=T.slice();else{S=new p(x/p.BYTES_PER_ELEMENT);let R=0;for(let y=0,a=T.length;y<a;y++){for(let z=0;z<A;z++)S[R+z]=T[y*A+z];R+=g}}return o._free(M),{name:c,count:d,itemSize:A,array:S,stride:g}}function e(o,i){switch(i){case Float32Array:return o.DT_FLOAT32;case Int8Array:return o.DT_INT8;case Int16Array:return o.DT_INT16;case Int32Array:return o.DT_INT32;case Uint8Array:return o.DT_UINT8;case Uint16Array:return o.DT_UINT16;case Uint32Array:return o.DT_UINT32}}}function Nn(l,t){const r=new Se;l.add(r);const n=[],u=[],e=(v,m,G)=>{const U=new Ye(v,m,G);return n.push(U),U},o=v=>(u.push(v),v),i=o(new xe({color:1579551,roughness:.82,metalness:.12})),s=o(new xe({color:2237996,roughness:.65,metalness:.45})),c=o(new xe({color:10265519,roughness:.28,metalness:.9})),p=o(new xe({color:2437954,roughness:.1,metalness:.95})),h=new Se;r.add(h);const d=(v,m,G,U,J,Z,te,C=0,N=0,H=0)=>{const ee=new me(e(v,m,G),U);return ee.position.set(J,Z,te),(C||N||H)&&ee.rotation.set(C,N,H),h.add(ee),ee},A=new Oo(16772829,1.6,3.8);A.position.set(-.2,1.1,.2),r.add(A),t&&d(1.72,.08,1.35,t,0,.68,1.62,.16,0,0),d(1.62,.08,.72,i,0,.82,.58,-.12,0,0),d(1.58,.32,.12,i,0,.64,.3,.18,0,0),d(.48,.06,.24,i,-.36,.95,.46,-.15,0,0),d(.04,.16,.22,i,-.6,.88,.46,-.15,0,0),d(.04,.16,.22,i,-.12,.88,.46,-.15,0,0),d(.68,.08,.32,s,.36,.84,.44,-.1,0,0),d(.32,.48,.85,i,0,.42,.02,.15,0,0),d(.24,.03,.75,s,0,.58,.05,.15,0,0),d(.22,.06,.04,s,0,.75,.33,.15,0,0);const _=o(new xe({color:921878,emissive:1717032,emissiveIntensity:.5,roughness:.5}));d(.2,.09,.03,_,0,.66,.31,.15,0,0),d(.07,.62,.09,i,-.78,1.05,.56,-.68,.18,.28),d(.07,.62,.09,i,.78,1.05,.56,-.68,-.18,-.28),d(1.56,.09,.14,i,0,1.28,.26,.2,0,0),d(.03,.08,.03,s,0,1.22,.32,-.2,0,0),d(.26,.07,.04,i,0,1.18,.33,-.15,.08,0),d(.24,.055,.01,p,0,1.18,.31,-.15,.08,0);const P=new Se;P.position.set(-.36,.78,.24),P.rotation.x=-.28,h.add(P);const L=new Je(.038,.045,.12,12);n.push(L);const g=new me(L,i);g.rotation.x=Math.PI/2,g.position.z=-.04,P.add(g);const w=new jo(.165,.018,10,24);n.push(w);const x=o(new xe({color:1711393,roughness:.75,metalness:.1})),M=new me(w,x);M.position.z=0,P.add(M);const T=new Je(.044,.044,.022,16);T.rotateX(Math.PI/2),n.push(T);const S=new me(T,s);S.position.z=0,P.add(S);const R=e(.026,.13,.01);for(const v of[-Math.PI/2,Math.PI/5,4*Math.PI/5]){const m=new me(R,c);m.position.set(Math.cos(v)*.08,Math.sin(v)*.08,0),m.rotation.z=v+Math.PI/2,P.add(m)}const y=document.createElement("canvas");y.width=512,y.height=256;const a=y.getContext("2d"),z=new wt(y);z.generateMipmaps=!0;const b=o(new ho({map:z,transparent:!0,side:lt})),B=new fo(.46,.24);B.rotateY(Math.PI),n.push(B);const q=new me(B,b);q.position.set(-.36,.85,.46),q.rotation.set(-.16,0,0),r.add(q);let X=-1,Q=-1,k=-1,f=-1,E=0;function D(v,m,G,U){a.clearRect(0,0,512,256),a.fillStyle="#0a0c10",a.fillRect(0,0,512,256),a.strokeStyle="rgba(255,255,255,0.06)",a.lineWidth=2,a.strokeRect(6,6,500,244);const J=U>.4?"rgba(255, 140, 30, 0.95)":"rgba(230, 240, 255, 0.9)",Z=U>.4?"#ff4820":"#ff3322",te="rgba(255, 255, 255, 0.25)",C=145,N=128,H=90,ee=se(v/260,0,1),V=Math.PI*.75,W=Math.PI*2.25;a.beginPath(),a.arc(C,N,H,V,W),a.strokeStyle=te,a.lineWidth=4,a.stroke(),a.beginPath(),a.arc(C,N,H,V,V+ee*(W-V)),a.strokeStyle=J,a.lineWidth=6,a.stroke();for(let de=0;de<=260;de+=20){const he=V+de/260*(W-V),Ae=de%40===0,Ne=Ae?H-14:H-8,ze=H-2;if(a.beginPath(),a.moveTo(C+Math.cos(he)*Ne,N+Math.sin(he)*Ne),a.lineTo(C+Math.cos(he)*ze,N+Math.sin(he)*ze),a.strokeStyle=Ae?J:te,a.lineWidth=Ae?3:1.5,a.stroke(),Ae){const Ee=H-25;a.font="bold 13px system-ui, sans-serif",a.fillStyle=J,a.textAlign="center",a.textBaseline="middle",a.fillText(String(de),C+Math.cos(he)*Ee,N+Math.sin(he)*Ee)}}const K=V+ee*(W-V);a.beginPath(),a.moveTo(C,N),a.lineTo(C+Math.cos(K)*(H-10),N+Math.sin(K)*(H-10)),a.strokeStyle=Z,a.lineWidth=3.5,a.stroke(),a.beginPath(),a.arc(C,N,7,0,Math.PI*2),a.fillStyle="#1e222b",a.fill(),a.strokeStyle=Z,a.lineWidth=2,a.stroke(),a.font="bold 26px tabular-nums, sans-serif",a.fillStyle="#ffffff",a.textAlign="center",a.fillText(String(Math.round(v)),C,N+38),a.font="9px sans-serif",a.fillStyle=te,a.fillText("KM/H",C,N+52);const j=367,Y=128,oe=90,we=se(m/9e3,0,1),re=Math.PI*.75,ue=Math.PI*2.25;a.beginPath(),a.arc(j,Y,oe,re,ue),a.strokeStyle=te,a.lineWidth=4,a.stroke();const le=re+6500/9e3*(ue-re);a.beginPath(),a.arc(j,Y,oe,le,ue),a.strokeStyle="rgba(240, 50, 40, 0.75)",a.lineWidth=6,a.stroke();for(let de=0;de<=9;de++){const he=re+de/9*(ue-re),Ae=de>=7,Ne=oe-14,ze=oe-2;a.beginPath(),a.moveTo(j+Math.cos(he)*Ne,Y+Math.sin(he)*Ne),a.lineTo(j+Math.cos(he)*ze,Y+Math.sin(he)*ze),a.strokeStyle=Ae?"#ff3322":J,a.lineWidth=3,a.stroke();const Ee=oe-24;a.font="bold 13px system-ui, sans-serif",a.fillStyle=Ae?"#ff4433":J,a.textAlign="center",a.textBaseline="middle",a.fillText(String(de),j+Math.cos(he)*Ee,Y+Math.sin(he)*Ee)}const ve=re+we*(ue-re);a.beginPath(),a.moveTo(j,Y),a.lineTo(j+Math.cos(ve)*(oe-10),Y+Math.sin(ve)*(oe-10)),a.strokeStyle=Z,a.lineWidth=3.5,a.stroke(),a.beginPath(),a.arc(j,Y,7,0,Math.PI*2),a.fillStyle="#1e222b",a.fill(),a.strokeStyle=Z,a.lineWidth=2,a.stroke(),a.font="bold 24px monospace",a.fillStyle=J,a.textAlign="center",a.fillText(G,j,Y+38),a.font="9px sans-serif",a.fillStyle=te,a.fillText("RPM x1000",j,Y+52),a.fillStyle=J,a.font="10px sans-serif",a.textAlign="center",a.fillText("WANDER GT",256,120),z.needsUpdate=!0}function I(v,m,G,U,J,Z){if(P.rotation.z=-v.steer*2.3,Z-E>.033){const C=Math.abs(v.speed)*3.6,N=v.speed<-.1?"R":G===0&&Math.abs(v.speed)<.2?"N":`D${G+1}`,H=U.night;(Math.abs(C-X)>.8||Math.abs(m-Q)>40||G!==k||Math.abs(H-f)>.05)&&(X=C,Q=m,k=G,f=H,E=Z,D(C,m,N,H))}const te=.45+U.night*.75;b.emissiveIntensity=te}function F(v){h.visible=!v,v?(q.position.set(.346,.85,.94),q.scale.set(.48,.48,.48),q.rotation.set(-.22,0,0)):(q.position.set(-.36,.85,.46),q.scale.set(1,1,1),q.rotation.set(-.16,0,0))}return D(0,1050,"N",0),{group:r,steerPivot:P,setSportsCarMode:F,update:I,dispose(){r.clear();for(const v of n)v.dispose();for(const v of u)v.dispose();z.dispose()}}}const zn=`
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`,En=`
uniform float uTime;
uniform float uRain;
uniform float uSpeed;
uniform float uWiperL;
uniform float uWiperR;
uniform float uWipeClear;
uniform vec3 uSunDir;
uniform float uNight;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vNormal;

// High quality 2D hash
vec2 hash22(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.xx + p.yx) * p.xy);
}

void main() {
  if (uRain < 0.01) {
    // Pristine dry glass with faint atmospheric reflection
    gl_FragColor = vec4(0.08, 0.12, 0.16, 0.04);
    return;
  }

  // 1. Wiper clearing mask
  // Left wiper arc in UV: pivot at (0.28, -0.05)
  vec2 pL = vUv - vec2(0.28, -0.05);
  float distL = length(pL);
  float angL = atan(pL.y, pL.x);
  bool inLeftWipe = distL > 0.15 && distL < 0.95 && angL > 0.25 && angL < 2.85;

  // Right wiper arc in UV: pivot at (0.72, -0.05)
  vec2 pR = vUv - vec2(0.72, -0.05);
  float distR = length(pR);
  float angR = atan(pR.y, pR.x);
  bool inRightWipe = distR > 0.15 && distR < 0.95 && angR > 0.25 && angR < 2.85;

  float wipeMask = 1.0;
  if (inLeftWipe || inRightWipe) {
    // Wiped region stays clear and slowly re-accumulates droplets
    wipeMask = clamp(uWipeClear * (0.35 + uRain * 0.9), 0.02, 1.0);
  }

  // 2. Water droplets via multi-scale hash grid
  vec2 dropUv = vUv * vec2(38.0, 22.0);
  vec2 id = floor(dropUv);
  vec2 gv = fract(dropUv) - 0.5;

  vec2 rnd = hash22(id);
  float dropRadius = 0.12 + rnd.x * 0.22;
  vec2 dropCenter = (rnd - 0.5) * 0.45;

  // Speed-based streak stretch along airflow (upwards on windshield)
  float speedStretch = clamp(uSpeed / 20.0, 0.0, 3.5);
  gv.y += (rnd.y - 0.5) * 0.1;
  float d = length(vec2(gv.x - dropCenter.x, (gv.y - dropCenter.y) / (1.0 + speedStretch * 0.7)));

  float dropAlpha = 0.0;
  vec3 dropNormal = vec3(0.0, 0.0, 1.0);

  if (d < dropRadius && rnd.y < uRain) {
    // Normal inside the rounded droplet
    vec2 dN = (gv - dropCenter) / dropRadius;
    float zN = sqrt(max(0.0, 1.0 - dot(dN, dN)));
    dropNormal = normalize(vec3(dN * 1.5, zN));

    // Droplet edge ring + center refraction
    float edge = smoothstep(dropRadius, dropRadius - 0.04, d);
    dropAlpha = edge * (0.6 + 0.4 * zN);
  }

  // 3. High-speed wind stream lines (water trails streaking up the windshield)
  float streamStrength = clamp((uSpeed - 6.0) / 25.0, 0.0, 1.0) * uRain;
  if (streamStrength > 0.05) {
    vec2 streamUv = vUv * vec2(28.0, 3.0);
    streamUv.y -= uTime * (uSpeed * 0.08);
    vec2 sId = floor(streamUv);
    vec2 sGv = fract(streamUv) - 0.5;
    vec2 sRnd = hash22(sId);
    if (sRnd.x < 0.25) {
      float sWidth = 0.04 + sRnd.y * 0.04;
      if (abs(sGv.x) < sWidth) {
        float sAlpha = smoothstep(sWidth, 0.0, abs(sGv.x)) * streamStrength * 0.4;
        dropAlpha = max(dropAlpha, sAlpha);
      }
    }
  }

  dropAlpha *= wipeMask;

  // 4. Specular glint on droplets from sun/sky/ambient
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 worldDropNormal = normalize(vNormal + vec3(dropNormal.x, dropNormal.y, 0.0) * 0.5);
  vec3 halfV = normalize(uSunDir + viewDir);
  float spec = pow(max(dot(worldDropNormal, halfV), 0.0), 32.0) * (1.0 - uNight * 0.85);

  // Night dashboard / headlight glint
  float nightGlint = uNight * pow(max(dot(worldDropNormal, vec3(0.0, -0.2, 1.0)), 0.0), 12.0) * 0.4;

  vec3 dropColor = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.95, 0.8), spec) + spec * 1.5 + nightGlint;
  float totalAlpha = clamp(dropAlpha * (0.55 + 0.45 * uRain) + 0.03, 0.0, 0.85);

  gl_FragColor = vec4(dropColor, totalAlpha);
}
`;function Gn(l,t){const r=new Se;l.add(r);const n=[],u=[],e=new fo(1.58,.78);n.push(e);const o={uTime:{value:0},uRain:{value:0},uSpeed:{value:0},uWiperL:{value:0},uWiperR:{value:0},uWipeClear:{value:1},uSunDir:{value:new ae(0,1,0)},uNight:{value:0}},i=new Ce({vertexShader:zn,fragmentShader:En,uniforms:o,transparent:!0,depthWrite:!1,side:lt});u.push(i);const s=new me(e,i);s.position.set(0,1.075,.615),s.rotation.set(-.97,0,0),r.add(s);const c=new xe({color:1118999,roughness:.8,metalness:.2});u.push(c);const p=new Ye(.016,.28,.012),h=new Ye(.012,.44,.018);n.push(p,h);const d=T=>{const S=new Se;S.position.set(T,.89,1.04),S.rotation.set(-.95,0,0);const R=new me(p,c);R.position.set(0,.14,.01),S.add(R);const y=new me(h,c);return y.position.set(0,.22,.016),S.add(y),r.add(S),S},A=d(-.25),_=d(.28);let P=0,L=0,g=0,w=!1;function x(T,S,R,y,a){const z=y.rain;o.uTime.value=S,o.uRain.value=z,o.uSpeed.value=Math.abs(R),o.uNight.value=a.night;const b=t.wiperMode??0;let B=!1,q=3.2;if(b===0?z>.04&&(B=!0,q=2.4+z*2.8):b===1?(B=!0,q=2.6):b===2&&(B=!0,q=5.2),B){P+=T*q;const Q=.5-.5*Math.cos(P);L=Q*1.42,Q>.85||Q<.15?g=0:g+=T;const k=P-T*q;Math.floor(P/Math.PI)!==Math.floor(k/Math.PI)&&(w=!0)}else L>.01&&(L=Math.max(0,L-T*2.5)),g+=T;const X=-1.54;A.rotation.z=X+L,_.rotation.z=X+L*.98,o.uWiperL.value=L,o.uWiperR.value=L,o.uWipeClear.value=g}function M(){return w?(w=!1,!0):!1}return{group:r,glassMesh:s,update:x,popWiperAudioCue:M,dispose(){r.clear();for(const T of n)T.dispose();for(const T of u)T.dispose()}}}function Fn(l,t,r,n,u){const e={x:0,y:0,z:0,heading:0,speed:0,steer:0,pitch:0,roll:0,off:0,lastRoadIdx:20,s:80,yv:0,pitchV:0,rollV:0,velDir:0,yawRate:0,slipAngle:0,slipVel:0,isDrifting:!1,handbrake:!1},o=new Se,i=new Se;o.add(i),u.add(o);const s=new xe({color:14245675,roughness:.32,metalness:.12}),c=new xe({color:1054496,roughness:.08,metalness:.5}),p=new xe({color:1645343,roughness:.85}),h=new xe({color:12106946,roughness:.32,metalness:.85}),d=new xe({color:16774872,emissive:16773824,emissiveIntensity:.25}),A=new xe({color:8000272,emissive:16720408,emissiveIntensity:.35});function _(C,N,H,ee){const V=new Uo;V.moveTo(C[0][0],C[0][1]);for(let K=1;K<C.length;K++)V.lineTo(C[K][0],C[K][1]);V.closePath();const W=new Vo(V,{depth:N,bevelEnabled:!0,bevelThickness:H,bevelSize:ee,bevelSegments:2,steps:1});return W.rotateY(-Math.PI/2),W.translate(N/2,0,0),W}const P=[],L=new Se;i.add(L);let g,w;{const C=_([[-2.42,.3],[-2.46,.62],[-2.4,.76],[-1.55,.84],[.4,.86],[1.35,.78],[2.15,.66],[2.44,.52],[2.46,.34],[2.3,.24],[1.35,.2],[-1.75,.2],[-2.3,.24]],1.78,.06,.05);P.push(C),w=new me(C,s),L.add(w);const N=_([[.95,.86],[.3,1.3],[-.85,1.34],[-1.75,.88]],1.62,.04,.04);P.push(N),g=new me(N,c),L.add(g);const H=(j,Y,oe)=>{const we=new Ye(j,Y,oe);return P.push(we),we},ee=(j,Y,oe,we,re,ue=0)=>{const le=new me(j,Y);return le.position.set(oe,we,re),le.rotation.y=ue,L.add(le),le};ee(H(1.62,.055,.05),A,0,.78,-2.43),ee(H(1.3,.03,.18),p,0,.865,-2.26),ee(H(1.84,.18,.22),p,0,.26,-2.3),ee(H(1.3,.16,.08),p,0,.42,2.42),ee(H(1.86,.1,.3),p,0,.22,2.28);const V=H(.42,.075,.06),W=H(.16,.08,.1),K=H(.08,.14,2.6);for(const j of[-1,1])ee(V,d,j*.62,.68,2.38,j*.35),ee(W,s,j*.98,.98,.42),ee(K,p,j*.92,.24,0)}const x=[];{const C=new Je(.335,.335,.24,20);C.rotateZ(Math.PI/2);const N=new Je(.21,.21,.245,20);N.rotateZ(Math.PI/2);const H=new Ye(.026,.36,.09);P.push(C,N,H);for(const[ee,V]of[[-1,1],[1,1],[-1,-1],[1,-1]]){const W=new Se;W.add(new me(C,p)),W.add(new me(N,h));for(let j=0;j<5;j++){const Y=new me(H,h);Y.rotation.x=j*Math.PI/5,W.add(Y)}const K=new Se;K.position.set(ee*.86,.335,V*1.45),K.add(W),L.add(K),x.push({pivot:K,mesh:W,front:V>0})}}const M=new Se;i.add(M);let T=!1,S=null,R=null,y=null,a=null,z=null,b=null,B=null;const q=new De,X=new De,Q=new De,k=new De,f=new De;let E=0;const D=new Dn;D.setDecoderPath("/draco/");const I=new gn;I.setDRACOLoader(D),I.load("/models/sports_car.glb",C=>{const N=C.scene;N.rotation.y=Math.PI,N.scale.set(1,1,1),N.position.set(0,-.015,.46);const H=new to({color:14361624,metalness:.88,roughness:.28,clearcoat:1,clearcoatRoughness:.03}),ee=new to({color:1119773,metalness:.2,roughness:.05,transmission:.88,transparent:!0,opacity:.8});S=N.getObjectByName("body"),S&&(S.material=H),R=N.getObjectByName("glass"),R&&(R.material=ee),a=N.getObjectByName("wheel_fl"),a&&q.copy(a.quaternion),z=N.getObjectByName("wheel_fr"),z&&X.copy(z.quaternion),b=N.getObjectByName("wheel_rl"),b&&Q.copy(b.quaternion),B=N.getObjectByName("wheel_rr"),B&&k.copy(B.quaternion),y=N.getObjectByName("steering_wheel"),y&&f.copy(y.quaternion),N.traverse(V=>{if(V.isMesh){const W=V;W.castShadow=!0,W.receiveShadow=!0}}),M.add(N),T=!0,L.visible=!1,G.setSportsCarMode(!0),console.log("FERRARI MODEL LOADED AND ATTACHED SUCCESSFULLY!")},void 0,C=>console.error("FERRARI LOAD ERROR:",C)),o.traverse(C=>{C.isMesh&&(C.castShadow=!0)});const F=[];for(const C of[-1,1]){const N=new Wo(16771512,0,150,.55,.55,1);N.position.set(C*.62,.72,2.2),N.target.position.set(C*.8,-1.5,30),i.add(N),i.add(N.target),F.push(N)}const v=(()=>{const C=document.createElement("canvas");C.width=C.height=64;const N=C.getContext("2d"),H=N.createRadialGradient(32,32,2,32,32,30);return H.addColorStop(0,"rgba(255,245,214,1)"),H.addColorStop(.4,"rgba(255,238,180,0.35)"),H.addColorStop(1,"rgba(255,238,180,0)"),N.fillStyle=H,N.fillRect(0,0,64,64),new wt(C)})(),m=[];for(const C of[-1,1]){const N=new Ho({map:v,blending:mo,depthWrite:!1,transparent:!0,opacity:0}),H=new qo(N);H.scale.set(.9,.9,1),H.position.set(C*.62,.68,2.45),i.add(H),m.push(H)}const G=Nn(i,s),U=Gn(i,n);function J(){const C=l.query(e.x,e.z),N=C?Math.round(C.s/ce):e.lastRoadIdx,H=l.pts[se(N,2,l.pts.length-2)];e.x=H.x,e.z=H.z,e.heading=Math.atan2(H.dx,H.dz),e.speed=Math.min(e.speed,12),e.y=H.y}function Z(){const C=l.pts[20];return e.x=C.x,e.z=C.z,e.heading=Math.atan2(C.dx,C.dz),e.velDir=e.heading,e.y=C.y,e.speed=14,C}function te(C,N,H,ee,V,W,K,j){l.extendTo(e.s+2400);const Y=l.query(e.x,e.z);Y&&(e.lastRoadIdx=Y.idx,e.s=Y.s);const oe=Y?ye(fe+.5,fe+5,Y.d):1;e.off=oe;const re=(1-se(r.uWet.value*.38+N.snow*.3,0,.52))*(1-oe*.42);let ue=V,le=W,ve=0;if(n.auto&&Y){const ge=16+e.speed*1.2,Ge=se(Math.round(Y.s/ce)+Math.round(ge/ce),0,l.pts.length-2),He=l.pts[Ge],Yt=He.dz,Xt=-He.dx,Kt=He.x+Yt*2.5,Zt=He.z+Xt*2.5,zo=Math.atan2(Kt-e.x,Zt-e.z);le=se(Xe(zo-e.heading)*2.4,-1,1);let Ct=0;const Jt=Math.round(Y.s/ce);for(let At=Jt;At<Math.min(Jt+50,l.pts.length);At++)Ct=Math.max(Ct,l.pts[At].k);const Eo=Math.min(44,Math.sqrt(.92*9.81*(.5+.5*re)/Math.max(Ct,1e-4)));ue=se((Eo-e.speed)*.4,-1,1)}const de=!!j||K&&Math.abs(e.speed)>3.8;e.handbrake=de,e.steer+=(le*.65-e.steer)*Math.min(1,C*7.5),e.velDir===0&&(e.velDir=e.heading);const he=Xe(e.velDir-e.heading),Ae=Math.min(1,Math.abs(he)*1.8),Ne=1+Math.max(0,Math.abs(e.speed)-8)*.022*(1-Ae*.65);ve=e.steer/Ne;const ze=Math.max(Math.abs(e.speed),1.8),Ee=e.speed*Math.sin(he),Bt=1.35,It=1.35,Mo=Math.atan2(Ee+Bt*e.yawRate,ze)-ve*.85,Ot=Math.atan2(Ee-It*e.yawRate,ze);function jt(ge,Ge){return-(1*Math.sin(1.32*Math.atan(8.5*ge-.94*(8.5*ge-Math.atan(8.5*ge)))))*Ge*9.81}let bo=re,yt=re;if(de&&(yt*=.35),ue>.4&&Math.abs(e.speed)>6){const ge=se((ue-.4)*1.2,0,.55);yt*=1-ge}const Wt=jt(Mo,bo),Ht=jt(Ot,yt);let qt=(Wt*Bt-Ht*It)/4.2;qt-=e.yawRate*(2.4+Math.abs(e.speed)*.035),e.yawRate+=qt*C,e.yawRate=se(e.yawRate,-3.2,3.2),e.heading+=e.yawRate*C,e.heading=Xe(e.heading);let je=0;if(ue>0){const ge=Math.max(e.speed,0)/ct,Ge=1-oe*.4;je+=12.5*ue*(1-ge*ge)*(.8+.2*re)*Ge}else ue<0&&(je+=e.speed>.5?-15*re:-6.5*(1+e.speed/co));je-=e.speed*.1;const So=oe*(.65+Math.abs(e.speed)*.035)*Math.sign(e.speed||0);je-=So,de?je-=Math.sign(e.speed)*9.5*re:K&&(je-=Math.sign(e.speed)*18*re*Math.min(1,Math.abs(e.speed))),e.speed=se(e.speed+je*C,-co,ct),Math.abs(e.speed)<.02&&ue===0&&!de&&(e.speed=0);const Co=(Wt+Ht)/12,Ao=(re*4.2+Math.abs(e.speed)*.15)*(de?.4:1),To=Xe(e.heading-e.velDir);e.velDir+=To*Math.min(1,C*Ao)+Co*C*.06,e.velDir=Xe(e.velDir);const Ut=Xe(e.velDir-e.heading);e.slipAngle=Ut*180/Math.PI,e.slipVel=Math.abs(e.speed)*Math.sin(Math.abs(Ut))+Math.abs(Ot)*6,e.isDrifting=Math.abs(e.slipAngle)>9&&Math.abs(e.speed)>6;const Ro=Math.sin(e.velDir),_o=Math.cos(e.velDir);e.x+=Ro*e.speed*C,e.z+=_o*e.speed*C;const Te=Math.sin(e.heading),Re=Math.cos(e.heading),xt=t.driveHeight(e.x+Te*1.45-Re*.86,e.z+Re*1.45+Te*.86),Mt=t.driveHeight(e.x+Te*1.45+Re*.86,e.z+Re*1.45-Te*.86),bt=t.driveHeight(e.x-Te*1.45-Re*.86,e.z-Re*1.45+Te*.86),St=t.driveHeight(e.x-Te*1.45+Re*.86,e.z-Re*1.45-Te*.86),ko=(xt+Mt)*.5,Po=(bt+St)*.5;let et=(xt+Mt+bt+St)*.25;const Do=Math.atan2(Po-ko,2.9),Lo=Math.atan2((Mt+St)*.5-(xt+bt)*.5,1.72);if(et+=oe*Math.sin(ee*24)*Math.min(Math.abs(e.speed)/16,1)*.02,e.yv+=((et-e.y)*70-e.yv*12.5)*C,e.pitchV+=((Do-e.pitch)*80-e.pitchV*12)*C,e.rollV+=((Lo-e.roll)*80-e.rollV*12)*C,e.y+=e.yv*C,e.pitch=se(e.pitch+e.pitchV*C,-.3,.3),e.roll=se(e.roll+e.rollV*C,-.3,.3),Math.abs(e.y-et)>.22&&(e.y=et+Math.sign(e.y-et)*.22,e.yv=0),o.position.set(e.x,e.y,e.z),o.rotation.y=e.heading,i.rotation.x=e.pitch,i.rotation.z=e.roll,T){L.visible=!1,E+=e.speed*C/.35;const ge=new De().setFromAxisAngle(new ae(1,0,0),E),Ge=new De().setFromAxisAngle(new ae(0,0,1),ve*.85);if(a&&a.quaternion.copy(q).multiply(Ge).multiply(ge),z&&z.quaternion.copy(X).multiply(Ge).multiply(ge),b&&b.quaternion.copy(Q).multiply(ge),B&&B.quaternion.copy(k).multiply(ge),y){const He=new De().setFromAxisAngle(new ae(0,0,1),-ve*2.2);y.quaternion.copy(f).multiply(He)}R&&(R.visible=n.camMode!==2)}else{L.visible=!0;for(const ge of x)ge.mesh.rotation.x+=e.speed/.34*C,ge.front&&(ge.pivot.rotation.y=ve*.85);g.visible=n.camMode!==2,w.visible=n.camMode!==2}r.uHLPos.value.set(e.x+Te*2,e.y+.8,e.z+Re*2),r.uHLDir.value.set(Te,-.09,Re).normalize();const Vt=Math.abs(e.speed);let We=0;for(;We<Ie.length-1&&Vt>Ie[We];)We++;const Qt=We===0?0:Ie[We-1],No=1050+se((Vt-Qt)/(Ie[We]-Qt),0,1)*5300;G.update(e,No,We,N,n,ee),U.update(C,ee,e.speed,H,N)}return{car:e,group:o,tilt:i,cockpit:G,windshield:U,hlSpots:F,glowSprites:m,headMat:d,tailMat:A,spawn:Z,reset:J,update:te,dispose(){G.dispose(),U.dispose(),D.dispose();for(const C of P)C.dispose();v.dispose(),s.dispose(),c.dispose(),p.dispose(),h.dispose(),d.dispose(),A.dispose();for(const C of m)C.material.dispose()}}}function Bn(l,t,r,n,u,e,o,i){const s=n.probe(),c=new Map,p=[],h=(a,z)=>a+":"+z,d=new Set,A=new Ft,_=new De,P=new ae,L=new ae,g=new ne,w=new ne;function x(a,z){const b=a*be,B=z*be,q=be/Ue,X=Ue+3,Q=new Float32Array(X*X),k=new Float32Array(X*X);for(let V=0;V<X;V++)for(let W=0;W<X;W++){const K=b+(W-1)*q,j=B+(V-1)*q,Y=t.query(K,j);Q[V*X+W]=r.sampleGround(K,j,Y),k[V*X+W]=Y?Y.d:999}const f=Ue+1,E=new Float32Array(f*f*3),D=new Float32Array(f*f*3),I=new Float32Array(f*f),F=new Float32Array(f*f*2);for(let V=0;V<f;V++)for(let W=0;W<f;W++){const K=(V+1)*X+(W+1),j=(V*f+W)*3,Y=b+W*q,oe=B+V*q;E[j]=Y,E[j+1]=Q[K],E[j+2]=oe;const we=Q[K-1]-Q[K+1],re=2*q,ue=Q[K-X]-Q[K+X],le=Math.hypot(we,re,ue);D[j]=we/le,D[j+1]=re/le,D[j+2]=ue/le,I[V*f+W]=Math.min(k[K],99),F[(V*f+W)*2]=n.temperatureAt(Y,oe),F[(V*f+W)*2+1]=n.moistureAt(Y,oe)}const v=new Uint32Array(Ue*Ue*6);let m=0;for(let V=0;V<Ue;V++)for(let W=0;W<Ue;W++){const K=V*f+W,j=K+1,Y=K+f,oe=Y+1;v[m++]=K,v[m++]=Y,v[m++]=j,v[m++]=j,v[m++]=Y,v[m++]=oe}const G=new Qe;G.setAttribute("position",new pe(E,3)),G.setAttribute("normal",new pe(D,3)),G.setAttribute("aRoad",new pe(I,1)),G.setAttribute("aClimate",new pe(F,2)),G.setIndex(new pe(v,1)),G.computeBoundingSphere();const U=new me(G,r.material);U.receiveShadow=!0,o.add(U);const J=[U],Z=it(Le(a,z,i)),te=[],C=[],N=[],H=[];for(let V=0;V<72;V++){const W=b+Z()*be,K=B+Z()*be,j=t.query(W,K);if(j&&j.d<13)continue;const Y=s.at(W,K),oe=Y.treeDensity,we=Y.coniferBias,re=Y.treeScale;if(oe<.005)continue;const ue=Ze(l.veg,W*.003,K*.003,2);if(Z()>ye(-.28,.55,ue)*.9*oe)continue;const le=r.sampleGround(W,K,j),ve=r.sampleGround(W+2.5,K),de=r.sampleGround(W,K+2.5);if(Math.hypot(ve-le,de-le)/2.5>.6)continue;const he=(.7+Z()*.9)*re;_.setFromAxisAngle(P.set(0,1,0),Z()*ke),A.compose(P.set(W,le-.15,K),_,L.set(he,he*(.9+Z()*.25),he)),(l.veg(W*6e-4+50.2,K*6e-4-30.7)>se(1-2*we,-1,1)||le>95?te:C).push(A.clone())}for(let V=0;V<9;V++){const W=b+Z()*be,K=B+Z()*be,j=t.query(W,K);if(j&&j.d<9)continue;const Y=s.sample(W,K),oe=s.blend(Y),we=oe.rockDensity,re=oe.rockScale;if(Z()>.4*we)continue;g.setRGB(0,0,0);for(let ve=0;ve<Oe;ve++){const de=Y[ve];de<1e-4||g.add(w.copy(Me[ve].rock).multiplyScalar(de))}const ue=r.sampleGround(W,K,j),le=(.5+Z()*Z()*2.4)*re;_.setFromAxisAngle(P.set(0,1,0),Z()*ke),A.compose(P.set(W,ue+.1*le,K),_,L.set(le,le,le)),N.push(A.clone()),H.push(g.clone())}const ee=(V,W,K,j)=>{if(!K.length)return;const Y=new go(V,W,K.length);for(let oe=0;oe<K.length;oe++)Y.setMatrixAt(oe,K[oe]);if(Y.instanceMatrix.needsUpdate=!0,j){for(let oe=0;oe<j.length;oe++)Y.setColorAt(oe,j[oe]);Y.instanceColor&&(Y.instanceColor.needsUpdate=!0)}Y.computeBoundingSphere(),Y.castShadow=!0,Y.receiveShadow=!0,o.add(Y),J.push(Y)};ee(u.coniferGeo,u.coniferMat,te),ee(u.decidGeo,u.decidMat,C),ee(u.rockGeo,u.rockMat,N,H),c.set(h(a,z),{cx:a,cz:z,meshes:J})}const M=a=>a===u.coniferGeo||a===u.decidGeo||a===u.rockGeo;function T(a){for(const z of a.meshes){o.remove(z);const b=z;M(b.geometry)||b.geometry.dispose(),"dispose"in b&&typeof b.dispose=="function"&&b.dispose()}}const S=Math.ceil(Be/be);function R(){const{from:a,to:z}=t.drainNew();for(let b=a;b<z;b++){const B=t.pts[b],q=Math.floor(B.x/be),X=Math.floor(B.z/be);for(let Q=-S;Q<=S;Q++)for(let k=-S;k<=S;k++){const f=h(q+Q,X+k);c.has(f)&&d.add(f)}}}function y(a,z,b){const B=ut[e.quality].radius,q=Math.round(a/be),X=Math.round(z/be);R();for(const[k,f]of c)Math.max(Math.abs(f.cx-q),Math.abs(f.cz-X))>B+1&&(T(f),c.delete(k),d.delete(k));p.length=0;for(let k=-B;k<=B;k++)for(let f=-B;f<=B;f++){const E=q+k,D=X+f,I=h(E,D);c.has(I)?d.has(I)&&p.push([k*k+f*f,E,D,1]):p.push([k*k+f*f,E,D,0])}if(!p.length)return;p.sort((k,f)=>k[0]-f[0]);const Q=performance.now();for(const[,k,f,E]of p){const D=h(k,f);if(E){const I=c.get(D);I&&T(I),c.delete(D),d.delete(D)}if(x(k,f),performance.now()-Q>b)break}}return{update:y,dispose(){for(const a of c.values())T(a);c.clear(),d.clear()}}}const ie=l=>new ne(l),Ke={grass:[ie(7647316),ie(8366148),ie(10718023),ie(9146488)],grassAlt:[ie(6265417),ie(7115833),ie(9401401),ie(8093801)],leafA:[ie(9684068),ie(5214011),ie(13664046),ie(10128768)],leafB:[ie(11719806),ie(6988616),ie(13062191),ie(8878700)],conifA:[ie(3503178),ie(2976316),ie(3105089),ie(3823690)],conifB:[ie(4491098),ie(3897930),ie(4026446),ie(4612693)],leafDen:[.85,1,.8,.22],snow:[.06,0,0,1]},In=["Spring","Summer","Autumn","Winter"],On=["🌸","☀️","🍂","❄️"],jn=[1,.7,.15,0];function Pe(l,t,r){const n=(t-.5+4)%4,u=Math.floor(n);let e=n-u;return e=e*e*(3-2*e),r?(r.lerpColors(l[u],l[(u+1)%4],e),r):vt(l[u],l[(u+1)%4],e)}function Wn(l,t,r,n,u,e,o,i,s,c,p){const h=p.probe();let d=h.at(0,0);const A=v=>new ne(v),_=new ne,P=new ne,L=new ne,g=A(3500213),w=A(12440295),x=A(329744),M=A(856866),T=A(16748362),S=A(16777215),R=A(9279395),y=A(1448484),a=A(16767400),z=A(16774888),{sunLight:b,hemiLight:B,scene:q}=e,X=new ae(0,1,0),Q=new ae,k=new ae,f=new ae,E=new ae;function D(){const v=n.uSunDir.value;Q.set(o.car.x,o.car.y,o.car.z),k.crossVectors(X,v),k.lengthSq()<1e-4?k.set(1,0,0):k.normalize(),f.crossVectors(v,k).normalize(),E.set(o.car.x+v.x*Nt,o.car.y+Math.max(v.y,.06)*Nt,o.car.z+v.z*Nt);const m=at*2/b.shadow.mapSize.x,G=E.dot(k),U=E.dot(f),J=Math.round(G/m)*m-G,Z=Math.round(U/m)*m-U;E.addScaledVector(k,J).addScaledVector(f,Z),b.position.copy(E),b.target.position.copy(Q).addScaledVector(k,J).addScaledVector(f,Z)}const I=new ne;function F(v){const m=h.sample(o.car.x,o.car.z);if(d=h.blend(m),l.simT+=v*l.timeScale,l.tod=(l.tod+v*l.timeScale/yn)%1,l.seasonMode==="auto")l.phase=(l.phase+v*l.timeScale/xn)%4;else{const Y=(l.seasonTarget+.5-l.phase+6)%4-2;l.phase=(l.phase+se(Y,-v*.6,v*.6)+4)%4}n.uTime.value=l.simT;const G=(l.tod-.25)*ke;n.uSunDir.value.set(Math.cos(G),Math.sin(G),.42).normalize();const U=n.uSunDir.value.y;t.sunElev=U,t.daylight=ye(-.09,.24,U),t.night=1-ye(-.16,-.015,U);const J=Math.exp(-Math.abs(U)*9)*ye(-.25,.02,U);u.uniforms.uMoonDir.value.set(-n.uSunDir.value.x,Math.max(.25,-U+.3),-.3).normalize(),u.uniforms.uNight.value=t.night;const Z=1-r.cloud*.6-r.fog*.35;_.lerpColors(x,g,t.daylight),P.lerpColors(M,w,t.daylight),P.lerp(T,J*.75*Z);const te=se(r.cloud*.45+r.fog*.55,0,.85);L.copy(_),L.lerp(P,.55),_.lerp(L,te*.6),u.uniforms.uZenith.value.copy(_),u.uniforms.uHorizon.value.copy(P),u.uniforms.uCloud.value=.22+r.cloud*.62,L.lerpColors(y,S,t.daylight),L.lerp(R,r.cloud*.7*t.daylight),L.lerp(T,J*.4),u.uniforms.uCloudCol.value.copy(L),n.uFogColor.value.copy(P).lerp(u.uniforms.uZenith.value,.25);const C=ut[l.quality].fog*d.fogMul+r.fog*.0042+r.rain*.001;n.uFogDensity.value=C,q.fog.color.copy(n.uFogColor.value),q.fog.density=C;const N=t.daylight*Z,H=t.night*(1-r.cloud*.65)*.3;_.lerpColors(a,z,ye(.02,.35,U)),_.lerp(T,J*.6),n.uSunColor.value.copy(_).multiplyScalar(1.45*N),L.setRGB(.62,.72,.95).multiplyScalar(H),n.uSunColor.value.add(L),t.night>.001&&n.uSunDir.value.lerp(u.uniforms.uMoonDir.value,t.night).normalize(),n.uHemiSky.value.copy(u.uniforms.uZenith.value).multiplyScalar(.55+.45*t.daylight).addScalar(.012),n.uHemiSky.value.add(L.setRGB(.045,.06,.1).multiplyScalar(t.night)),n.uHemiGround.value.setRGB(.16,.15,.12).multiplyScalar(t.daylight*Z+.06),n.uHemiGround.value.add(L.setRGB(.012,.016,.028).multiplyScalar(t.night)),b.color.copy(_),t.night>.001&&b.color.lerp(L.setRGB(.62,.72,.95),t.night*.85),b.intensity=3.1*N+H*1.5,D();const ee=ye(.04,.25,t.daylight+H*1.2);n.uShadowOn.value+=(ee-n.uShadowOn.value)*Math.min(1,v*2.5),b.castShadow=n.uShadowOn.value>.02,b.shadow.map&&(n.uShadowMap.value=b.shadow.map.texture),B.color.copy(n.uHemiSky.value).multiplyScalar(1.6),B.groundColor.copy(n.uHemiGround.value).multiplyScalar(1.6),B.intensity=1;for(let j=0;j<Oe;j++)Pe(Me[j].grass,l.phase,n.uBGrass.value[j]),Pe(Me[j].grassAlt,l.phase,n.uBGrassAlt.value[j]);n.uGrass.value.setRGB(0,0,0),n.uGrassAlt.value.setRGB(0,0,0);for(let j=0;j<Oe;j++){const Y=m[j];Y<1e-4||(n.uGrass.value.add(I.copy(n.uBGrass.value[j]).multiplyScalar(Y)),n.uGrassAlt.value.add(I.copy(n.uBGrassAlt.value[j]).multiplyScalar(Y)))}Pe(Ke.leafA,l.phase,i.decidMat.uniforms.uLeafA.value),Pe(Ke.leafB,l.phase,i.decidMat.uniforms.uLeafB.value),Pe(Ke.conifA,l.phase,i.coniferMat.uniforms.uLeafA.value),Pe(Ke.conifB,l.phase,i.coniferMat.uniforms.uLeafB.value),i.decidMat.uniforms.uLeafDensity.value=Pe(Ke.leafDen,l.phase);const V=Pe(Ke.snow,l.phase);n.uSnow.value=V,t.snow=V*d.snowMul,n.uSnowNear.value=t.snow,n.uGrassGrow.value=1-t.snow*.78,n.uBloom.value=Pe(jn,l.phase),s.flowerMesh.visible=n.uBloom.value>.03;const K=U<.03||r.fog>.55||r.rain>.6?1:0;n.uHL.value+=(K-n.uHL.value)*Math.min(1,v*3);for(const j of o.hlSpots)j.intensity=n.uHL.value*40;for(const j of o.glowSprites)j.material.opacity=n.uHL.value*.85;o.headMat.emissiveIntensity=.25+n.uHL.value*2.4,o.tailMat.emissiveIntensity=.35+n.uHL.value*2.6,c.value=n.uHL.value*.85+t.night*.15}return{update:F,getLocal:()=>d}}const xo=`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x),
             mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}
float fbm2(vec2 p){ return (vnoise(p) * .5 + vnoise(p * 2.03) * .25 + vnoise(p * 4.09) * .125) / .875; }
`,Ve=`
uniform vec3 uSunDir, uSunColor, uHemiSky, uHemiGround, uFogColor;
uniform float uFogDensity, uSnow, uSnowNear, uWet, uTime, uHL;
uniform vec3 uHLPos, uHLDir, uCamPos;
uniform vec3 uGrass, uGrassAlt;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat;
uniform float uShadowOn;
`+xo+`
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
`;function Hn(l,t,r,n,u,e,o){const i=r.probe(),s=new oo;{const k=new Float32Array([-.055,0,0,.055,0,0,-.032,.55,0,.032,.55,0,0,1,0]),f=new Float32Array([0,0,1,0,.2,.55,.8,.55,.5,1]);s.setAttribute("position",new pe(k,3)),s.setAttribute("uv",new pe(f,2)),s.setIndex([0,1,2,2,1,3,2,3,4])}const c=new Float32Array(Lt*3),p=new Float32Array(Lt*4),h=new tt(c,3).setUsage(ot),d=new tt(p,4).setUsage(ot);s.setAttribute("aOffset",h),s.setAttribute("aRand",d),s.instanceCount=0;const A=new Ce({uniforms:n,fog:!1,side:lt,vertexShader:Ve+`
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
      /* bend scales with y^2 so the base stays planted and only the tip moves */
      float lean = (aRand.w - 0.5) * 0.55 + sway;
      p.x += lean * p.y * p.y * 1.7;
      p.z += (aRand.z - 0.5) * 0.35 * p.y * p.y;
      vec3 rp = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
      vec3 wp = aOffset + rp;
      vP = wp; vT = uv.y; vR = aRand.z;
      /* shadowed per-vertex with an up normal: grass is too thin for the
         per-fragment cost to buy anything */
      vSh = sunShadow(wp, vec3(0.0, 1.0, 0.0));
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`,fragmentShader:Ve+`
    varying vec3 vP; varying float vT, vR, vSh;
    void main(){
      vec3 alb = mix(uGrass * 0.5, mix(uGrass, uGrassAlt, vR) * 1.3, vT);
      alb *= 0.9 + 0.2 * hash12(floor(vP.xz * 7.0));
      alb *= 1.0 - uWet * 0.35;
      alb = mix(alb, vec3(0.93, 0.95, 0.98), uSnowNear * 0.85);
      vec3 col = doLight(alb, vec3(0.0, 1.0, 0.0), vP, vSh);
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}),_=new me(s,A);_.frustumCulled=!1,e.add(_);const P=["#ffffff","#ffd94a","#ff9ec6","#b7a6ff","#ff7a5c","#8fd0ff"].map(k=>new ne(k)),L=(()=>{const k=document.createElement("canvas");k.width=k.height=64;const f=k.getContext("2d");f.fillStyle="#ffffff";for(let D=0;D<5;D++){const I=D/5*ke-Math.PI/2;f.beginPath(),f.arc(32+Math.cos(I)*13,32+Math.sin(I)*13,11,0,ke),f.fill()}f.fillStyle="#ffd94a",f.beginPath(),f.arc(32,32,8,0,ke),f.fill();const E=new wt(k);return E.colorSpace=rt,E})(),g=new oo;{const k=[],f=[],E=[];let D=0;for(const I of[0,Math.PI/2]){const F=Math.cos(I),v=Math.sin(I);for(const[m,G]of[[-.14,0],[.14,0],[.14,.3],[-.14,.3]])k.push(m*F,G,m*v);f.push(0,0,1,0,1,1,0,1),E.push(D,D+1,D+2,D,D+2,D+3),D+=4}g.setAttribute("position",new pe(new Float32Array(k),3)),g.setAttribute("uv",new pe(new Float32Array(f),2)),g.setIndex(E)}const w=new Float32Array(ft*3),x=new Float32Array(ft*2),M=new Float32Array(ft*3),T=new tt(w,3).setUsage(ot),S=new tt(x,2).setUsage(ot),R=new tt(M,3).setUsage(ot);g.setAttribute("aOffset",T),g.setAttribute("aRand",S),g.setAttribute("aColor",R),g.instanceCount=0;const y=new Ce({uniforms:Object.assign({uMap:{value:L}},n),fog:!1,side:lt,vertexShader:Ve+`
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
    }`,fragmentShader:Ve+`
    uniform sampler2D uMap;
    varying vec2 vUv; varying vec3 vC, vP;
    void main(){
      vec4 tex = texture2D(uMap, vUv);
      if (tex.a < 0.55) discard;
      vec3 alb = tex.rgb * vC;
      alb = mix(alb, vec3(0.93, 0.95, 0.98), uSnowNear * 0.6);
      vec3 col = doLight(alb, vec3(0.0, 1.0, 0.0), vP, 1.0);
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}),a=new me(g,y);a.frustumCulled=!1,e.add(a);const z=[],b=[];let B=0,q=0;function X(k){const f=Math.max(4,Math.floor((k-420)/ce)),E=Math.min(l.pts.length-3,Math.ceil((k+ut[u.quality].radius*132+380)/ce)),D=u.quality===0?2:1,I=u.quality===2?4:u.quality===1?3:2,F=[];for(let v=f;v<E;v+=D)F.push(v);F.sort((v,m)=>Math.abs(v*ce-k)-Math.abs(m*ce-k)),z.length=0,b.length=0;for(const v of F){const m=l.pts[v],G=i.at(m.x,m.z).grassCover,U=I*G,J=Math.floor(U)+(Le(v,97,o)%1e3/1e3<U%1?1:0);for(let Z=0;Z<2;Z++)for(let te=0;te<J&&z.length<Lt;te++)z.push(v<<3|Z<<2|te)}for(let v=f+3;v<E;v+=6){const m=l.pts[v],G=i.at(m.x,m.z).flowerCover;if(!(G<.01)){for(let U=0;U<2;U++)if(!(Le(v,733+U*7,o)%1e3/1e3<1-.5*G))for(let J=0;J<4&&b.length<ft;J++)b.push(v<<3|U<<2|J)}}B=0,q=0,s.instanceCount=0,g.instanceCount=0}function Q(k){if(!z.length&&!b.length)return;const f=performance.now();for(;z.length;){const E=z.pop(),D=(E>>2&1)*2-1,I=E>>3,F=B++,v=l.pts[I],m=it(Le(I,11+(E&7),o)),G=v.dz,U=-v.dx,J=(m()-.5)*3.6,Z=D*(fe+.55+Math.pow(m(),1.6)*8.5),te=v.x+G*Z+v.dx*J,C=v.z+U*Z+v.dz*J,N=l.query(te,C);let H=-500;if((!N||N.d>fe+.3)&&(H=t.sampleGround(te,C,N||void 0)-.03),c[F*3]=te,c[F*3+1]=H,c[F*3+2]=C,p[F*4]=m(),p[F*4+1]=m(),p[F*4+2]=m(),p[F*4+3]=m(),s.instanceCount=B,performance.now()-f>k)break}for(h.needsUpdate=!0,d.needsUpdate=!0;b.length&&performance.now()-f<=k;){const E=b.pop(),D=E&3,I=(E>>2&1)*2-1,F=E>>3,v=q++,m=l.pts[F],G=m.dz,U=-m.dx,J=it(Le(F,733+(E>>2&1)*7,o)),Z=I*(fe+1.2+J()*7.5),te=(J()-.5)*4,C=m.x+G*Z+m.dx*te,N=m.z+U*Z+m.dz*te,H=it(Le(F,1553+D,o)),ee=C+(H()-.5)*2.2,V=N+(H()-.5)*2.2,W=l.query(ee,V);let K=-500;(!W||W.d>fe+.4)&&(K=t.sampleGround(ee,V,W||void 0)-.02),w[v*3]=ee,w[v*3+1]=K,w[v*3+2]=V,x[v*2]=.7+H()*.7,x[v*2+1]=H();const j=P[H()*P.length|0];M[v*3]=j.r,M[v*3+1]=j.g,M[v*3+2]=j.b,g.instanceCount=q}T.needsUpdate=!0,S.needsUpdate=!0,R.needsUpdate=!0}return{flowerMesh:a,queueRefill:X,processJobs:Q,dispose(){s.dispose(),A.dispose(),g.dispose(),y.dispose(),L.dispose()}}}function qn(l,t){const r=t.probe(),n=26;function u(s,c){if(c<.01)return s;const p=s/n,h=Math.floor(p),d=p-h,A=(h+ye(.62,.96,d))*n;return vt(s,A,c)}function e(s,c,p,h){let d=Ze(l.terrain,s*.0042,c*.0042,4)*57*p;d+=Ze(l.terrain,s*85e-5+37.2,c*85e-5-11.8,3)*111*p;const A=1-Math.abs(l.terrain(s*.0013+91.7,c*.0013+13.1));return d+=A*A*85*h*ye(.1,.7,Ze(l.terrain,s*4e-4+5.1,c*4e-4+9.3,2)+.45),d}function o(s,c,p){const h=r.at(s,c),d=ye(24,86,p),A=e(s,c,h.amp,h.ridge)+Ze(l.terrain,s*.028,c*.028,2)*(.5+1.6*d)*h.detail;return u(A,h.terrace*d)}function i(s,c){const p=r.at(s,c);return e(s,c,p.amp,p.ridge)}return{baseHeight:o,landform:i}}const Un=["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "];function Vn(l){const t=new Set,r=u=>{if(u.repeat)return;const e=u.key.toLowerCase();e===" "&&u.preventDefault(),t.add(e),e==="t"&&l.toggleAuto(),e==="c"&&l.cycleCamera(),e==="v"&&l.toggleWipers&&l.toggleWipers(),e==="m"&&l.toggleMute(),e==="r"&&l.resetCar(),e==="escape"&&l.togglePanel(),e>="1"&&e<="4"&&l.setSeason(String(+e-1)),e==="0"&&l.setSeason("auto"),Un.includes(e)&&l.isAuto()&&e!==" "&&l.disableAuto()},n=u=>t.delete(u.key.toLowerCase());return window.addEventListener("keydown",r),window.addEventListener("keyup",n),{throttle:()=>(t.has("w")||t.has("arrowup")?1:0)-(t.has("s")||t.has("arrowdown")?1:0),steer:()=>(t.has("a")||t.has("arrowleft")?1:0)-(t.has("d")||t.has("arrowright")?1:0),braking:()=>t.has(" ")||t.has("shift"),handbrake:()=>t.has(" ")||t.has("shift"),footbrake:()=>t.has("s")||t.has("arrowdown"),dispose(){window.removeEventListener("keydown",r),window.removeEventListener("keyup",n),t.clear()}}}function Qn(l,t,r,n){const u=new Float32Array(mt*3),e=new Qe,o=new Float32Array(mt*2*3);e.setAttribute("position",new pe(o,3));const i=new Qo({color:11189200,transparent:!0,opacity:0,fog:!0}),s=new Yo(e,i);s.frustumCulled=!1,n.add(s);for(let g=0;g<mt;g++)u[g*3]=(Math.random()-.5)*70,u[g*3+1]=Math.random()*40,u[g*3+2]=(Math.random()-.5)*70;const c=new Float32Array(nt*3),p=new Float32Array(nt),h=new Qe,d=new Float32Array(nt*3);h.setAttribute("position",new pe(d,3));const A=(()=>{const g=document.createElement("canvas");g.width=g.height=32;const w=g.getContext("2d"),x=w.createRadialGradient(16,16,1,16,16,15);return x.addColorStop(0,"rgba(255,255,255,1)"),x.addColorStop(.6,"rgba(255,255,255,0.5)"),x.addColorStop(1,"rgba(255,255,255,0)"),w.fillStyle=x,w.fillRect(0,0,32,32),new wt(g)})(),_=new Xo({size:.22,map:A,transparent:!0,opacity:0,depthWrite:!1,fog:!0,color:16777215,sizeAttenuation:!0}),P=new Ko(h,_);P.frustumCulled=!1,n.add(P);for(let g=0;g<nt;g++)c[g*3]=(Math.random()-.5)*64,c[g*3+1]=Math.random()*30,c[g*3+2]=(Math.random()-.5)*64,p[g]=Math.random()*ke;function L(g){const w=t.rain*(t.snowMode?0:1),x=t.rain*(t.snowMode?1:0);i.opacity+=(w*.32-i.opacity)*Math.min(1,g*2),_.opacity+=(x*.85-_.opacity)*Math.min(1,g*2);const M=r.position.x,T=r.position.y,S=r.position.z;if(i.opacity>.01){for(let y=0;y<mt;y++){let a=u[y*3+1]-Tn*g,z=u[y*3]+4*g;a<-14&&(a+=40+Math.random()*8,z=(Math.random()-.5)*70,u[y*3+2]=(Math.random()-.5)*70),z>35&&(z-=70),u[y*3]=z,u[y*3+1]=a;const b=y*6;o[b]=M+z,o[b+1]=T+a,o[b+2]=S+u[y*3+2],o[b+3]=M+z-.16,o[b+4]=T+a+1.5,o[b+5]=S+u[y*3+2]}e.attributes.position.needsUpdate=!0}if(s.visible=i.opacity>.01,_.opacity>.01){const R=l.simT;for(let y=0;y<nt;y++){let a=c[y*3+1]-(1.5+Math.sin(p[y])*.4)*g;a<-10&&(a+=30+Math.random()*6,c[y*3]=(Math.random()-.5)*64,c[y*3+2]=(Math.random()-.5)*64),c[y*3+1]=a,d[y*3]=M+c[y*3]+Math.sin(R*.7+p[y])*1.6,d[y*3+1]=T+a,d[y*3+2]=S+c[y*3+2]+Math.cos(R*.55+p[y]*1.7)*1.4}h.attributes.position.needsUpdate=!0}P.visible=_.opacity>.01}return{update:L,dispose(){e.dispose(),i.dispose(),h.dispose(),_.dispose(),A.dispose()}}}const Yn={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new ne(0)},defaultOpacity:{value:0}},vertexShader:`

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

		}`};class $e extends wo{constructor(t,r=1,n,u){super(),this.strength=r,this.radius=n,this.threshold=u,this.resolution=t!==void 0?new _e(t.x,t.y):new _e(256,256),this.clearColor=new ne(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let e=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);this.renderTargetBright=new Tt(e,o,{type:Rt}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let p=0;p<this.nMips;p++){const h=new Tt(e,o,{type:Rt});h.texture.name="UnrealBloomPass.h"+p,h.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(h);const d=new Tt(e,o,{type:Rt});d.texture.name="UnrealBloomPass.v"+p,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),e=Math.round(e/2),o=Math.round(o/2)}const i=Yn;this.highPassUniforms=Gt.clone(i.uniforms),this.highPassUniforms.luminosityThreshold.value=u,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ce({uniforms:this.highPassUniforms,vertexShader:i.vertexShader,fragmentShader:i.fragmentShader}),this.separableBlurMaterials=[];const s=[6,10,14,18,22];e=Math.round(this.resolution.x/2),o=Math.round(this.resolution.y/2);for(let p=0;p<this.nMips;p++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[p])),this.separableBlurMaterials[p].uniforms.invSize.value=new _e(1/e,1/o),e=Math.round(e/2),o=Math.round(o/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=r,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new ae(1,1,1),new ae(1,1,1),new ae(1,1,1),new ae(1,1,1),new ae(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Gt.clone(kt.uniforms),this.blendMaterial=new Ce({uniforms:this.copyUniforms,vertexShader:kt.vertexShader,fragmentShader:kt.fragmentShader,premultipliedAlpha:!0,blending:mo,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new ne,this._oldClearAlpha=1,this._basic=new ho,this._fsQuad=new yo(null)}dispose(){for(let t=0;t<this.renderTargetsHorizontal.length;t++)this.renderTargetsHorizontal[t].dispose();for(let t=0;t<this.renderTargetsVertical.length;t++)this.renderTargetsVertical[t].dispose();this.renderTargetBright.dispose();for(let t=0;t<this.separableBlurMaterials.length;t++)this.separableBlurMaterials[t].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(t,r){let n=Math.round(t/2),u=Math.round(r/2);this.renderTargetBright.setSize(n,u);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,u),this.renderTargetsVertical[e].setSize(n,u),this.separableBlurMaterials[e].uniforms.invSize.value=new _e(1/n,1/u),n=Math.round(n/2),u=Math.round(u/2)}render(t,r,n,u,e){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();const o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),e&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=n.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let i=this.renderTargetBright;for(let s=0;s<this.nMips;s++)this._fsQuad.material=this.separableBlurMaterials[s],this.separableBlurMaterials[s].uniforms.colorTexture.value=i.texture,this.separableBlurMaterials[s].uniforms.direction.value=$e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[s]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[s].uniforms.colorTexture.value=this.renderTargetsHorizontal[s].texture,this.separableBlurMaterials[s].uniforms.direction.value=$e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[s]),t.clear(),this._fsQuad.render(t),i=this.renderTargetsVertical[s];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,e&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(n),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(t){const r=[],n=t/3;for(let u=0;u<t;u++)r.push(.39894*Math.exp(-.5*u*u/(n*n))/n);return new Ce({defines:{KERNEL_RADIUS:t},uniforms:{colorTexture:{value:null},invSize:{value:new _e(.5,.5)},direction:{value:new _e(.5,.5)},gaussianCoefficients:{value:r}},vertexShader:`

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

				}`})}_getCompositeMaterial(t){return new Ce({defines:{NUM_MIPS:t},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

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

				}`})}}$e.BlurDirectionX=new _e(1,0);$e.BlurDirectionY=new _e(0,1);const gt={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
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

		}`};class Xn extends wo{constructor(){super(),this.isOutputPass=!0,this.uniforms=Gt.clone(gt.uniforms),this.material=new Zo({name:gt.name,uniforms:this.uniforms,vertexShader:gt.vertexShader,fragmentShader:gt.fragmentShader}),this._fsQuad=new yo(this.material),this._outputColorSpace=null,this._toneMapping=null}render(t,r,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=t.toneMappingExposure,(this._outputColorSpace!==t.outputColorSpace||this._toneMapping!==t.toneMapping)&&(this._outputColorSpace=t.outputColorSpace,this._toneMapping=t.toneMapping,this.material.defines={},po.getTransfer(this._outputColorSpace)===Jo&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===$o?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===en?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===tn?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===vo?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===on?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===nn?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===sn&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this.clear&&t.clear(t.autoClearColor,t.autoClearDepth,t.autoClearStencil),this._fsQuad.render(t))}dispose(){this.material.dispose(),this._fsQuad.dispose()}}function Kn(l,t){const r=document.createElement("canvas");r.style.cssText="position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;",l.appendChild(r);const n=new an({canvas:r,antialias:!0,powerPreference:"high-performance"});n.toneMapping=vo,n.toneMappingExposure=1.05,n.outputColorSpace=rt,n.shadowMap.enabled=!0,n.shadowMap.type=rn;const u=new ln;u.fog=new cn(13162216,.0016);const e=new un(63,window.innerWidth/window.innerHeight,.06,7e3);e.position.set(0,8,-20);const o=new dn(16777215,3);u.add(o),u.add(o.target);const i=new pn(12572400,5134917,.9);u.add(i),o.castShadow=!0,o.shadow.mapSize.set(uo,uo),Object.assign(o.shadow.camera,{left:-at,right:at,top:at,bottom:-at,near:150,far:380}),o.shadow.camera.updateProjectionMatrix();const s=new vn(n);s.renderTarget1.samples=4,s.renderTarget2.samples=4,s.addPass(new wn(u,e));const c=new $e(new _e(window.innerWidth,window.innerHeight),.32,.5,.88);s.addPass(c),s.addPass(new Xn);let p=1;function h(){const d=Math.min(window.devicePixelRatio||1,ut[t.quality].prCap)*p;n.setPixelRatio(d),n.setSize(window.innerWidth,window.innerHeight),e.aspect=window.innerWidth/window.innerHeight,e.updateProjectionMatrix(),s.setPixelRatio(d),s.setSize(window.innerWidth,window.innerHeight)}return{canvas:r,renderer:n,scene:u,camera:e,composer:s,bloomPass:c,sunLight:o,hemiLight:i,applySize:h,getRenderScale:()=>p,setRenderScale:d=>{p=d,h()},dispose(){s.dispose(),n.dispose(),r.parentNode&&r.parentNode.removeChild(r)}}}function Zn(l,t){const r=[],n=[],u=new Map;let e=0,o=0,i=0,s=0,c=0;const p=(w,x)=>(w+32768)*65536+(x+32768);function h(w,x){let M=t.landform(w,x),T=1;for(const S of Mn)for(let R=0;R<so;R++){const y=(R+.5*S)/so*ke;M+=t.landform(w+Math.cos(y)*S,x+Math.sin(y)*S),T++}return M/T}function d(w){for(;n.length<w;){const x=n.length,M=x*ce,T=se(Ze(l.road,M*Cn,0,2)*1.7,-1,1),S=Sn*T*T*T,R=se(S-e,-ce/85,ce/85);e+=R;const y=Math.sin(e),a=Math.cos(e);x>0&&(o+=y*ce,i+=a*ce),n.push({x:o,z:i,dx:y,dz:a,k:Math.abs(R)/ce,target:h(o,i)})}}function A(w){const x=Pt*ce;for(;r.length<w&&r.length+Dt<n.length;){const M=r.length,T=n[M];let S=-1/0,R=1/0;for(let I=1;I<=Dt;I++){const F=x*I,v=n[M+I].target;v-F>S&&(S=v-F),v+F<R&&(R=v+F)}S>R&&(S=R=(S+R)*.5);const y=se(T.target,S,R),a=s-T.target,z=se((Math.abs(a)-ao)/ao,0,1),b=(Pt+(bn-Pt)*z)*ce,B=a<0?b:x,q=a>0?b:x,X=M===0?y:s+se(y-s,-q,B);s=X;const Q={x:T.x,y:X,z:T.z,dx:T.dx,dz:T.dz,k:T.k};r.push(Q);const k=Math.floor(Q.x/ht),f=Math.floor(Q.z/ht),E=p(k,f);let D=u.get(E);D||(D=[],u.set(E,D)),D.push(M)}}function _(w){const x=Math.ceil(w/ce)+1;d(x+Dt+1),A(x)}function P(){const w=c;return c=r.length,{from:w,to:r.length}}function L(w,x,M,T){const S=r[w];let R=S.x,y=S.y,a=S.z,z=S.dx,b=S.dz,B=w*ce,q=T;for(let X=w-1;X<=w;X++){if(X<0||X+1>=r.length)continue;const Q=r[X],k=r[X+1],f=k.x-Q.x,E=k.z-Q.z,D=se(((x-Q.x)*f+(M-Q.z)*E)/(f*f+E*E),0,1),I=Q.x+f*D,F=Q.z+E*D,v=I-x,m=F-M,G=v*v+m*m;G<q&&(q=G,R=I,a=F,y=Q.y+(k.y-Q.y)*D,z=Q.dx+(k.dx-Q.dx)*D,b=Q.dz+(k.dz-Q.dz)*D,B=(X+D)*ce)}return{d:Math.sqrt(q),x:R,y,z:a,tx:z,tz:b,idx:w,s:B,alt:null}}function g(w,x){const M=Math.floor(w/ht),T=Math.floor(x/ht),S=Be*Be;let R=-1,y=1e18,a=1/0,z=-1/0;for(let B=-3;B<=3;B++)for(let q=-3;q<=3;q++){const X=u.get(p(M+B,T+q));if(X)for(let Q=0;Q<X.length;Q++){const k=X[Q],f=r[k],E=f.x-w,D=f.z-x,I=E*E+D*D;I<y&&(y=I,R=k),I<S&&(k<a&&(a=k),k>z&&(z=k))}}if(R<0)return null;const b=L(R,w,x,y);if(y>=S)return b;if(z-a>ro){let B=-1,q=Be*Be;for(let X=-3;X<=3;X++)for(let Q=-3;Q<=3;Q++){const k=u.get(p(M+X,T+Q));if(k)for(let f=0;f<k.length;f++){const E=k[f];if(Math.abs(E-R)<=ro)continue;const D=r[E],I=D.x-w,F=D.z-x,v=I*I+F*F;v<q&&(q=v,B=E)}}B>=0&&(b.alt=L(B,w,x,q))}return b}return{pts:r,extendTo:_,query:g,drainNew:P}}function Jn(l,t,r,n,u){const e=new Ce({uniforms:t,fog:!1,side:lt,vertexShader:`
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      vUv = uv; vN = normal; vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,fragmentShader:Ve+`
    varying vec2 vUv; varying vec3 vN, vP;
    void main(){
      float u = vUv.x;
      vec3 alb = vec3(0.082, 0.085, 0.092);
      float n = vnoise(vec2(u * 42.0, vUv.y * 2.1));
      alb *= 0.88 + 0.24 * n;
      // Traveled wheel tracks are polished and slightly darker
      alb *= 1.0 - 0.16 * exp(-pow((abs(u) - 0.45) * 5.5, 2.0));
      float edge = 1.0 - smoothstep(0.018, 0.034, abs(abs(u) - 0.86));
      float dash = (1.0 - smoothstep(0.014, 0.03, abs(u))) * step(fract(vUv.y * 0.125), 0.5);
      float wear = 0.55 + 0.45 * vnoise(vec2(vUv.y * 0.9, u * 3.0));
      // Lane markings (only on the road deck, not on the side skirts)
      float onDeck = 1.0 - step(1.0, abs(u));
      alb = mix(alb, vec3(0.8, 0.8, 0.78), max(edge, dash) * 0.85 * wear * onDeck);
      alb *= 1.0 - uWet * 0.4;

      // Dark aggregate foundation for side skirts extending into the terrain bed
      float skirtM = smoothstep(1.0, 1.08, abs(u));
      alb = mix(alb, vec3(0.055, 0.058, 0.062), skirtM);

      // Winter highway: plowed, salted dark asphalt travel lanes with wet reflections;
      // packed snowbanks concentrated along shoulders and verges for clear visual separation
      if (uSnow > 0.01) {
        float shoulderSnow = smoothstep(0.78, 1.0, abs(u)) * 0.95;
        float centerSlush = (1.0 - smoothstep(0.02, 0.18, abs(u))) * 0.22 * vnoise(vec2(vUv.y * 0.8, 0.0));
        float snowFactor = uSnow * clamp(shoulderSnow + centerSlush, 0.0, 1.0);
        vec3 plowedAsphalt = alb * vec3(0.82, 0.85, 0.90);
        alb = mix(plowedAsphalt, vec3(0.92, 0.94, 0.97), snowFactor);
      }

      vec3 nn = normalize(vN);
      vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
      if (uWet > 0.01 || uSnow > 0.01) {
        vec3 V = normalize(uCamPos - vP);
        vec3 H = normalize(V + uSunDir);
        float specAmt = max(uWet * 0.5, uSnow * 0.35 * (1.0 - smoothstep(0.75, 1.0, abs(u))));
        col += uSunColor * pow(max(dot(nn, H), 0.0), 60.0) * specAmt;
      }
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}),o=new Map;function i(g){const w=g*qe,x=Math.min(w+qe,l.pts.length-1);if(x<=w)return null;const M=x-w+1,T=new Float32Array(M*4*3),S=new Float32Array(M*4*3),R=new Float32Array(M*4*2),y=[];for(let b=0;b<M;b++){const B=l.pts[w+b],q=l.pts[Math.max(w+b-1,0)],Q=(l.pts[Math.min(w+b+1,l.pts.length-1)].y-q.y)/Math.max(2*ce,1),k=B.dz,f=-B.dx;let E=B.dx,D=Q,I=B.dz;const F=Math.hypot(E,D,I);E/=F,D/=F,I/=F;let v=D*f-I*0,m=I*k-E*f,G=E*0-D*k;const U=Math.hypot(v,m,G);v/=U,m/=U,G/=U;const J=B.y+.08,Z=B.y-.85,te=fe+.45,C=b*4,N=C*3;T[N]=B.x-k*te,T[N+1]=Z,T[N+2]=B.z-f*te,S[N]=-k*.85+v*.15,S[N+1]=.2,S[N+2]=-f*.85+G*.15,T[N+3]=B.x-k*fe,T[N+4]=J,T[N+5]=B.z-f*fe,S[N+3]=v,S[N+4]=m,S[N+5]=G,T[N+6]=B.x+k*fe,T[N+7]=J,T[N+8]=B.z+f*fe,S[N+6]=v,S[N+7]=m,S[N+8]=G,T[N+9]=B.x+k*te,T[N+10]=Z,T[N+11]=B.z+f*te,S[N+9]=k*.85+v*.15,S[N+10]=.2,S[N+11]=f*.85+G*.15;const H=(w+b)*ce,ee=C*2;if(R[ee]=-1.25,R[ee+1]=H,R[ee+2]=-1,R[ee+3]=H,R[ee+4]=1,R[ee+5]=H,R[ee+6]=1.25,R[ee+7]=H,b>0){const V=(b-1)*4,W=b*4;y.push(V,W,V+1,W,W+1,V+1),y.push(V+1,W+1,V+2,V+2,W+1,W+2),y.push(V+2,W+2,V+3,W+2,W+3,V+3)}}const a=new Qe;a.setAttribute("position",new pe(T,3)),a.setAttribute("normal",new pe(S,3)),a.setAttribute("uv",new pe(R,2)),a.setIndex(y),a.computeBoundingSphere();const z=new me(a,e);return z.receiveShadow=!0,n.add(z),z}function s(){const g=new Ye(.13,.85,.13).translate(0,.425,0),w=new Ye(.145,.13,.145).translate(0,.72,0),x=(y,a)=>{const z=y.attributes.position.count,b=new Float32Array(z*3);for(let B=0;B<z;B++)b[B*3]=a.r,b[B*3+1]=a.g,b[B*3+2]=a.b;return y.setAttribute("color",new pe(b,3)),y},M=[x(g,new ne(.85,.86,.88)),x(w,new ne(.85,.1,.08))],T=new Qe,S=["position","normal","color"],R={};for(const y of S)R[y]=[];for(const y of M){const a=y.toNonIndexed();for(const z of S)R[z].push(...a.getAttribute(z).array)}for(const y of S)T.setAttribute(y,new pe(new Float32Array(R[y]),3));return T}const c=s(),p=new hn({vertexColors:!0,emissive:2236962,emissiveIntensity:.4}),h={value:0};p.onBeforeCompile=g=>{g.uniforms.uPostGlow=h,g.fragmentShader=`uniform float uPostGlow;
`+g.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
     totalEmissiveRadiance += vColor.rgb * step(0.5, vColor.r) * step(vColor.g, 0.4) * uPostGlow;`)};const d=new go(c,p,no);d.frustumCulled=!1,d.castShadow=!0,d.receiveShadow=!0,n.add(d);const A=new Ft;let _=-1,P=-1;function L(g){const w=Math.max(0,Math.floor((g-500)/(qe*ce))),x=Math.floor((g+ut[r.quality].radius*132+400)/(qe*ce));if(w===_&&x===P)return;_=w,P=x;for(const[R,y]of o)(R<w||R>x)&&(n.remove(y),y.geometry.dispose(),o.delete(R));for(let R=w;R<=x;R++)if(!o.has(R)){const y=i(R);y&&o.set(R,y)}let M=0;const T=w*qe,S=Math.min(x*qe+qe,l.pts.length-1);for(let R=T;R<=S&&M<no-1;R+=12){const y=l.pts[R],a=y.dz,z=-y.dx;for(const b of[-1,1])A.makeRotationY(Math.atan2(y.dx,y.dz)),A.setPosition(y.x+a*(fe+1.1)*b,y.y,y.z+z*(fe+1.1)*b),d.setMatrixAt(M++,A)}d.count=M,d.instanceMatrix.needsUpdate=!0,u(g)}return{material:e,postGlow:h,ensure:L,dispose(){for(const g of o.values())g.geometry.dispose();o.clear(),c.dispose(),p.dispose(),e.dispose()}}}function $n(l,t){const r={uSunDir:l.uSunDir,uTime:l.uTime,uZenith:{value:new ne(.2,.4,.7)},uHorizon:{value:new ne(.75,.83,.92)},uCloud:{value:.3},uCloudCol:{value:new ne(1,1,1)},uNight:{value:0},uMoonDir:{value:new ae(0,-1,0)}},n=new Ce({uniforms:r,side:fn,depthWrite:!1,fog:!1,vertexShader:`
    varying vec3 vDir;
    void main(){
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,fragmentShader:`
    varying vec3 vDir;
    uniform vec3 uSunDir, uZenith, uHorizon, uCloudCol, uMoonDir;
    uniform float uCloud, uNight, uTime;
    `+xo+`
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
    }`}),u=new me(new mn(5e3,48,24),n);return u.frustumCulled=!1,u.renderOrder=-10,t.add(u),{mesh:u,material:n,uniforms:r,dispose(){u.geometry.dispose(),n.dispose()}}}function es(l,t,r){const n=t.baseHeight,u=s=>An*(1-ye(fe-.5,fe+4,s)),e=(s,c,p)=>{let h;if(p===void 0?h=l.query(s,c):h=p,!h)return n(s,c,999);const d=h.d,A=n(s,c,d);if(d>=Be)return A;let _=h.y;const P=fe+1.8;if(h.alt&&h.alt.d<Be)if(d<=P)_=h.y;else if(h.alt.d<=P)_=h.alt.y;else{const g=d-P,w=h.alt.d-P,x=clamp(g/(g+w),0,1),M=ye(0,1,x);_=vt(h.y,h.alt.y,M)}const L=ye(fe+.8,Be-6,d);return vt(_,A,L)-u(d)},o=(s,c,p)=>{let h;p===void 0?h=l.query(s,c):h=p;const d=e(s,c,h);return!h||h.d>=fe+4?d:d+u(h.d)+.05*(1-ye(fe-.5,fe+1,h.d))},i=new Ce({uniforms:r,fog:!1,vertexShader:`
    attribute float aRoad;
    attribute vec2 aClimate;
    varying vec3 vN, vP; varying float vRoad; varying vec2 vClim;
    void main(){
      vN = normal; vP = position; vRoad = aRoad; vClim = aClimate;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,fragmentShader:Ve+kn+`
    varying vec3 vN, vP; varying float vRoad; varying vec2 vClim;
    void main(){
      // Cut out terrain on the road carriageway so terrain triangles can NEVER puncture
      // or break up the road into steps on hills and gradients
      if (vRoad < 5.25) discard;
      BiomeMix bm = mixBiomes(vClim);
      vec3 n = normalize(vN);
      float slope = 1.0 - n.y;
      vec2 p = vP.xz;
      float varn = fbm2(p * 0.02);
      float varn2 = vnoise(p * 0.35);
      vec3 grass = mix(bm.grass, bm.grassAlt, varn);
      grass *= 0.9 + 0.2 * varn2;
      vec3 rock = mix(bm.rock * 0.82, bm.rock * 1.3, vnoise(p * 0.06));
      rock *= 0.85 + 0.3 * varn2;
      float rockM = smoothstep(0.2, 0.42, slope + (varn - 0.5) * 0.14);
      vec3 alb = mix(grass, rock, rockM);
      float shoulderM = smoothstep(9.5, 6.4, vRoad);
      vec3 dirt = bm.dirt * (0.85 + 0.3 * varn2);
      alb = mix(alb, dirt, shoulderM * (1.0 - rockM) * 0.9);
      /* seasonal snow, scaled by how much snow this biome holds at all, then
         the permanent altitude cap whose line is itself per-biome */
      float sn = uSnow * bm.snow * smoothstep(0.38, 0.14, slope + (varn - 0.5) * 0.22);
      sn = max(sn, smoothstep(bm.snowLine, bm.snowLine + 40.0, vP.y + varn * 30.0) * smoothstep(0.5, 0.2, slope));
      alb = mix(alb, vec3(0.92, 0.94, 0.97) * (0.92 + 0.08 * varn2), clamp(sn, 0.0, 1.0));
      vec3 col = doLight(alb, n, vP, sunShadow(vP, n));
      col = doFog(col, vP);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});return{baseHeight:n,sampleGround:e,driveHeight:o,material:i,dispose(){i.dispose()}}}function ts(l,t,r,n,u,e,o,i){const s=m=>l.querySelector(m),c=s(".wander-panel");function p(){c.classList.toggle("wander-hidden")}s(".wander-gear-btn").addEventListener("click",p),s(".wander-close-panel").addEventListener("click",p);function h(m,G,U){for(const J of m.querySelectorAll("button"))J.classList.toggle("wander-on",J.dataset[G]===String(U))}const d=s(".wander-auto-chip");function A(m){t.auto=m,d.classList.toggle("wander-off",!m),d.textContent=m?"AUTO-DRIVE":"AUTO-DRIVE OFF"}d.addEventListener("click",()=>A(!t.auto));const _=s(".wander-cam-btns");function P(m){t.camMode=m,h(_,"c",m)}_.addEventListener("click",m=>{const G=m.target;G.dataset.c!==void 0&&P(+G.dataset.c)});const L=s(".wander-wiper-btns");function g(m){t.wiperMode=m,L&&h(L,"v",m)}L&&L.addEventListener("click",m=>{const G=m.target;G.dataset.v!==void 0&&g(+G.dataset.v)});const w=s(".wander-season-btns");function x(m){m==="auto"?t.seasonMode="auto":(t.seasonMode="manual",t.seasonTarget=+m),h(w,"s",m)}w.addEventListener("click",m=>{const G=m.target;G.dataset.s!==void 0&&x(G.dataset.s)});const M=s(".wander-wx-btns");M.addEventListener("click",m=>{const G=m.target;G.dataset.w!==void 0&&(t.weatherMode=G.dataset.w,h(M,"w",t.weatherMode))});const T=s(".wander-qual-btns");T.addEventListener("click",m=>{const G=m.target;G.dataset.q!==void 0&&(t.quality=+G.dataset.q,h(T,"q",t.quality),i.onQualityChange())});const S=s(".wander-time-scale"),R=s(".wander-time-scale-val");S.addEventListener("input",m=>{t.timeScale=+m.target.value,R.textContent=t.timeScale+"×"});const y=s(".wander-vol"),a=s(".wander-vol-val");y.addEventListener("input",m=>{t.vol=+m.target.value,t.muted=!1,a.textContent=String(Math.round(t.vol*100)),i.onVolumeChange()});const z=s(".wander-seed-val");z.textContent=String(e),s(".wander-new-seed").addEventListener("click",()=>{window.location.search="?seed="+(Math.random()*1e9|0)});const b=s(".wander-speed"),B=s(".wander-season-chip"),q=s(".wander-clock-chip"),X=s(".wander-wx-chip"),Q=s(".wander-biome-chip"),k=s(".wander-drift-chip");let f=0;function E(m){if(m<f)return;f=m+.12,b.textContent=String(Math.round(Math.abs(r.speed)*3.6)),k&&(r.isDrifting?(k.style.display="inline-block",k.textContent=`DRIFT ${Math.round(Math.abs(r.slipAngle||0))}°`):k.style.display="none");const G=o();Q.textContent!==G&&(Q.textContent=G);const U=Math.floor(t.phase)%4;B.textContent=On[U]+" "+In[U];const J=t.tod*24,Z=Math.floor(J),te=Math.floor((J-Z)*60);q.textContent=String(Z).padStart(2,"0")+":"+String(te).padStart(2,"0");let C="☀️";n.night>.5&&(C="🌙"),u.cloud>.5&&(C="⛅"),u.fog>.5&&(C="🌫️"),u.rain>.25&&(C=u.snowMode?"❄️":"🌧️"),X.textContent=C}const D=s(".wander-start"),I=s(".wander-cover"),F=s(".wander-help");function v(m){s(".wander-start-btn").addEventListener("click",()=>{t.started=!0,i.onStart(),A(!0),P(0),D.style.transition="opacity .8s ease",D.style.opacity="0",m(()=>D.classList.add("wander-hidden"),850),m(()=>{F.style.opacity="0"},14e3)}),m(()=>{I.style.opacity="0"},700),m(()=>I.classList.add("wander-hidden"),2500)}return{setAuto:A,setCam:P,setSeason:x,setWiper:g,togglePanel:p,updateHUD:E,wireStart:v}}function os(l){return{uSunDir:{value:new ae(0,1,0)},uSunColor:{value:new ne(1,1,1)},uHemiSky:{value:new ne(.5,.6,.75)},uHemiGround:{value:new ne(.25,.25,.2)},uFogColor:{value:new ne(.78,.84,.91)},uFogDensity:{value:.0016},uSnow:{value:0},uSnowNear:{value:0},uWet:{value:0},uTime:{value:0},uHL:{value:0},uHLPos:{value:new ae},uHLDir:{value:new ae(0,0,1)},uGrass:{value:new ne(7647316)},uGrassAlt:{value:new ne(6265417)},uCamPos:{value:new ae},uShadowMap:{value:null},uShadowMat:{value:l},uShadowOn:{value:0},uGrassGrow:{value:1},uBloom:{value:1},uBClim:{value:Me.map(t=>new ae(t.temp,t.moist,t.spread))},uBGrass:{value:Me.map(()=>new ne)},uBGrassAlt:{value:Me.map(()=>new ne)},uBRock:{value:Me.map(t=>t.rock.clone())},uBDirt:{value:Me.map(t=>t.dirt.clone())},uBSnow:{value:Me.map(t=>new _e(t.snowMul,t.snowLine))}}}function Et(l){const t=[],r=[],n=[],u=[];for(const o of l){const i=o.geo.toNonIndexed();o.matrix&&i.applyMatrix4(o.matrix);const s=i.getAttribute("position").array,c=i.getAttribute("normal").array;for(let h=0;h<s.length;h++)t.push(s[h]),r.push(c[h]);const p=i.getAttribute("position").count;for(let h=0;h<p;h++)n.push(o.color.r,o.color.g,o.color.b),u.push(o.foliage)}const e=new Qe;return e.setAttribute("position",new pe(new Float32Array(t),3)),e.setAttribute("normal",new pe(new Float32Array(r),3)),e.setAttribute("color",new pe(new Float32Array(n),3)),e.setAttribute("aFoliage",new pe(new Float32Array(u),1)),e}const Fe=(l,t,r,n=1)=>new Ft().makeScale(n,n,n).setPosition(l,t,r);function ns(l){const t=new ne(5916211),r=new ne(1,1,1),n=Et([{geo:new Je(.2,.32,2.2,6),matrix:Fe(0,1.1,0),color:t,foliage:0},{geo:new _t(1.55,2.7,7),matrix:Fe(0,2.9,0),color:r,foliage:1},{geo:new _t(1.2,2.3,7),matrix:Fe(0,4.5,0),color:r,foliage:1},{geo:new _t(.8,1.9,7),matrix:Fe(0,6,0),color:r,foliage:1}]),u=Et([{geo:new Je(.22,.36,2.9,6),matrix:Fe(0,1.45,0),color:t,foliage:0},{geo:new pt(1.5,1),matrix:Fe(0,3.8,0,1.25),color:r,foliage:1},{geo:new pt(1,1),matrix:Fe(1,3.1,.35),color:r,foliage:1},{geo:new pt(1.05,1),matrix:Fe(-.9,3.25,-.25),color:r,foliage:1}]),e=new pt(1,1);{const h=e.getAttribute("position");for(let d=0;d<h.count;d++){const A=.75+.5*(Le(h.getX(d)*100|0,h.getZ(d)*100|0,7)%1e3/1e3);h.setXYZ(d,h.getX(d)*A,h.getY(d)*A*.65,h.getZ(d)*A)}e.computeVertexNormals()}const o=Et([{geo:e,color:new ne(7762024),foliage:0}]);e.dispose();function i(h=!1){return new Ce({uniforms:Object.assign({uLeafA:{value:new ne(5214011)},uLeafB:{value:new ne(6988616)},uLeafDensity:{value:1}},l),fog:!1,vertexShader:`
      attribute vec3 color; attribute float aFoliage;
      varying vec3 vC, vN, vP, vO; varying float vF, vR;
      uniform float uTime;
      float hsh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        vR = hsh(vec2(instanceMatrix[3].x * 0.371, instanceMatrix[3].z * 0.593));
        wp.x += aFoliage * sin(uTime * 1.2 + wp.x * 0.4 + wp.z * 0.35) * 0.05 * position.y;
        vP = wp.xyz; vO = position; vF = aFoliage;
        vC = `+(h?"instanceColor":"color")+`;
        vN = normalize(mat3(instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,fragmentShader:Ve+`
      uniform vec3 uLeafA, uLeafB;
      uniform float uLeafDensity;
      varying vec3 vC, vN, vP, vO; varying float vF, vR;
      void main(){
        vec3 alb;
        if (vF > 0.5) {
          /* Autumn thinning: discard a stable hash-selected fraction of leaf
             fragments. Keyed on object-space position so the same specks
             vanish every frame instead of shimmering. */
          float h = hash12(floor(vO.xz * 13.0) + vec2(floor(vO.y * 13.0) * 3.1, vR * 37.0));
          if (h > uLeafDensity) discard;
          alb = mix(uLeafA, uLeafB, vR);
          alb *= 0.8 + 0.4 * vnoise(vO.xy * 2.6 + vR * 21.0);
        } else {
          alb = vC;
        }
        float sn = uSnowNear * smoothstep(0.05, 0.6, vN.y) * (vF > 0.5 ? 0.9 : 0.5);
        alb = mix(alb, vec3(0.92, 0.94, 0.97), sn);
        vec3 nn = normalize(vN);
        vec3 col = doLight(alb, nn, vP, sunShadow(vP, nn));
        col = doFog(col, vP);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`})}const s=i(),c=i(),p=i(!0);return{coniferGeo:n,decidGeo:u,rockGeo:o,coniferMat:s,decidMat:c,rockMat:p,dispose(){n.dispose(),u.dispose(),o.dispose(),s.dispose(),c.dispose(),p.dispose()}}}function ss(l,t,r,n,u){const e={cloud:.28,rain:0,fog:0,tCloud:.28,tRain:0,tFog:.04,next:25,snowMode:!1},o=[0,0,0,0],i=n.probe();function s(){const p=Math.floor(l.phase)%4,h=[[.4,.24,.24,.12],[.6,.26,.04,.1],[.32,.26,.24,.18],[.34,.24,.32,.1]][p],d=i.at(u.x,u.z).weather;let A=0;for(let g=0;g<4;g++)o[g]=h[g]*d[g],A+=o[g];if(A<1e-6){for(let g=0;g<4;g++)o[g]=d[g];A=d[0]+d[1]+d[2]+d[3]||1}for(let g=0;g<4;g++)o[g]/=A;let _=Math.random(),P=0;for(let g=0;g<4;g++)if(_-=o[g],_<=0){P=g;break}const L=Math.random();P===0?(e.tCloud=.1+.18*L,e.tRain=0,e.tFog=.03):P===1?(e.tCloud=.52+.3*L,e.tRain=0,e.tFog=.1):P===2?(e.tCloud=.88,e.tRain=.45+.5*L,e.tFog=.3):(e.tCloud=.45,e.tRain=0,e.tFog=.6+.35*L),e.next=l.simT+35+Math.random()*70}function c(p){l.weatherMode==="clear"?(e.tCloud=.12,e.tRain=0,e.tFog=.03):l.simT>e.next&&s();const h=Math.min(1,p*l.timeScale*.045);e.cloud+=(e.tCloud-e.cloud)*h,e.rain+=(e.tRain-e.rain)*h,e.fog+=(e.tFog-e.fog)*h,e.snowMode=t.snow>.45;const d=e.rain*(e.snowMode?0:1);r.uWet.value+=(d-r.uWet.value)*Math.min(1,p*.5)}return{wx:e,roll:s,update:c}}function as(l){let t=!1;const r=[],n=(I,F)=>{const v=window.setTimeout(()=>{t||I()},F);r.push(v)},u=new URLSearchParams(window.location.search),e=(u.get("seed")?+u.get("seed"):Math.random()*1e9)|0,o={road:st(e^2654435769),terrain:st(e^3266489909),veg:st(e+1013904223|0),temp:st(e^668265263),moist:st(e^374761393)},i={started:!1,tod:.36,phase:.85,timeScale:1,seasonMode:"auto",seasonTarget:0,weatherMode:"auto",camMode:2,quality:1,muted:!1,vol:.8,auto:!0,simT:0},s={daylight:1,night:0,snow:0,sunElev:1},c=Kn(l,i),p=os(c.sunLight.shadow.matrix),h=$n(p,c.scene),d=_n(o.temp,o.moist,e),A=qn(o,d),_=Zn(o,A),P=es(_,A,p),L=ns(p),g=Bn(o,_,P,d,L,i,c.scene,e),w=Hn(_,P,d,p,i,c.scene,e),x=Jn(_,p,i,c.scene,I=>w.queueRefill(I)),M=Fn(_,P,p,i,c.scene);window.__carObj=M;const T=Pn(c.camera,M.car,M.tilt,P,i,h.mesh),S=ss(i,s,p,d,M.car),R=Wn(i,s,S.wx,p,h,c,M,L,w,x.postGlow,d),y=Qn(i,S.wx,c.camera,c.scene);let a;const z=Rn(i,M.car,S.wx,s,()=>a.throttle(),()=>M.windshield.popWiperAudioCue()),b=ts(l,i,M.car,s,S.wx,e,()=>Me[R.getLocal().dominant].name,{onStart(){z.init(),z.resume()},onQualityChange(){c.applySize(),w.queueRefill(M.car.s)},onVolumeChange(){z.setVolume()}});a=Vn({toggleAuto:()=>b.setAuto(!i.auto),cycleCamera:()=>b.setCam((i.camMode+1)%4),toggleMute:()=>z.toggleMute(),resetCar:()=>M.reset(),togglePanel:()=>b.togglePanel(),setSeason:I=>b.setSeason(I),disableAuto:()=>b.setAuto(!1),isAuto:()=>i.auto,toggleWipers:()=>{b.setWiper(((i.wiperMode??0)+1)%4)}});const B=()=>c.applySize();window.addEventListener("resize",B),_.extendTo(3e3);const q=M.spawn();T.placeAtSpawn(q.x,q.y,q.z,q.dx,q.dz),g.update(M.car.x,M.car.z,400),x.ensure(M.car.s),b.wireStart(n);let X=0,Q=0,k=4;function f(I,F){if(X+=I,Q++,F<k)return;const v=Q/Math.max(X,1e-4);X=0,Q=0,k=F+3;const m=c.getRenderScale();v<42&&m>.55?c.setRenderScale(Math.max(.55,m*.88)):v>57&&m<1&&c.setRenderScale(Math.min(1,m*1.08))}c.applySize();let E=performance.now(),D=0;return c.renderer.setAnimationLoop(I=>{const F=Math.min(.05,(I-E)/1e3);E=I,D+=F,M.update(F,s,S.wx,D,a.throttle(),a.steer(),a.braking(),a.handbrake()),x.ensure(M.car.s),g.update(M.car.x,M.car.z,5),w.processJobs(2.5),R.update(F),S.update(F),y.update(F),T.update(F,D,p),z.update(),b.updateHUD(D),f(F,D),c.composer.render()}),()=>{t=!0,c.renderer.setAnimationLoop(null),window.removeEventListener("resize",B),a.dispose();for(const I of r)window.clearTimeout(I);z.dispose(),x.dispose(),g.dispose(),L.dispose(),P.dispose(),w.dispose(),y.dispose(),h.dispose(),M.dispose(),c.dispose()}}function ms(){const l=$t.useRef(null);return $t.useEffect(()=>{const t=l.current;if(t)return as(t)},[]),O.jsxs("div",{ref:l,className:"wander-shell",children:[O.jsx("div",{className:"wander-vignette"}),O.jsx("div",{className:"wander-cover"}),O.jsxs("div",{className:"wander-hud",children:[O.jsx("div",{className:"wander-speed",children:"0"}),O.jsx("div",{className:"wander-speed-unit",children:"KM/H"}),O.jsx("div",{className:"wander-auto-chip",children:"AUTO-DRIVE"}),O.jsx("div",{className:"wander-drift-chip",style:{display:"none"},children:"DRIFT 0°"})]}),O.jsxs("div",{className:"wander-chips",children:[O.jsx("div",{className:"wander-chip wander-biome-chip",children:"Woodland"}),O.jsx("div",{className:"wander-chip wander-season-chip",children:"Spring"}),O.jsx("div",{className:"wander-chip wander-clock-chip",children:"08:40"}),O.jsx("div",{className:"wander-chip wander-wx-chip",children:"☀️"}),O.jsx("div",{className:"wander-chip wander-gear-btn",children:"⚙︎"})]}),O.jsxs("div",{className:"wander-help",children:[O.jsx("b",{children:"W/S"})," drive/rev · ",O.jsx("b",{children:"A/D"})," steer · ",O.jsx("b",{children:"Space/Shift"})," handbrake · ",O.jsx("b",{children:"T"})," auto-drive · ",O.jsx("b",{children:"C"})," camera · ",O.jsx("b",{children:"V"})," wipers · ",O.jsx("b",{children:"R"})," reset · ",O.jsx("b",{children:"M"})," sound · ",O.jsx("b",{children:"Esc"})," settings"]}),O.jsxs("div",{className:"wander-panel wander-hidden",children:[O.jsxs("h2",{children:["SETTINGS ",O.jsx("button",{className:"wander-close-panel",children:"×"})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Time speed"}),O.jsx("input",{className:"wander-time-scale",type:"range",min:"0",max:"8",step:"0.25",defaultValue:"1"}),O.jsx("span",{className:"wander-val wander-time-scale-val",children:"1×"})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Season"}),O.jsxs("div",{className:"wander-btns wander-season-btns",children:[O.jsx("button",{"data-s":"auto",className:"wander-on",children:"Auto"}),O.jsx("button",{"data-s":"0",children:"Spring"}),O.jsx("button",{"data-s":"1",children:"Summer"}),O.jsx("button",{"data-s":"2",children:"Autumn"}),O.jsx("button",{"data-s":"3",children:"Winter"})]})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Weather"}),O.jsxs("div",{className:"wander-btns wander-wx-btns",children:[O.jsx("button",{"data-w":"auto",className:"wander-on",children:"Auto"}),O.jsx("button",{"data-w":"clear",children:"Clear"})]})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Wipers"}),O.jsxs("div",{className:"wander-btns wander-wiper-btns",children:[O.jsx("button",{"data-v":"0",className:"wander-on",children:"Auto"}),O.jsx("button",{"data-v":"1",children:"Slow"}),O.jsx("button",{"data-v":"2",children:"Fast"}),O.jsx("button",{"data-v":"3",children:"Off"})]})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Camera"}),O.jsxs("div",{className:"wander-btns wander-cam-btns",children:[O.jsx("button",{"data-c":"0",className:"wander-on",children:"Chase"}),O.jsx("button",{"data-c":"1",children:"Hood"}),O.jsx("button",{"data-c":"2",children:"Cockpit"}),O.jsx("button",{"data-c":"3",children:"Cinematic"})]})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Quality"}),O.jsxs("div",{className:"wander-btns wander-qual-btns",children:[O.jsx("button",{"data-q":"0",children:"Low"}),O.jsx("button",{"data-q":"1",className:"wander-on",children:"Medium"}),O.jsx("button",{"data-q":"2",children:"High"})]})]}),O.jsxs("div",{className:"wander-row",children:[O.jsx("label",{children:"Volume"}),O.jsx("input",{className:"wander-vol",type:"range",min:"0",max:"1",step:"0.05",defaultValue:"0.8"}),O.jsx("span",{className:"wander-val wander-vol-val",children:"80"})]}),O.jsxs("div",{className:"wander-row-small",children:["world seed ",O.jsx("span",{className:"wander-seed-val"})," · ",O.jsx("a",{className:"wander-new-seed",children:"new world ↻"})]})]}),O.jsx("div",{className:"wander-start",children:O.jsxs("div",{className:"wander-start-card",children:[O.jsx("h1",{children:"WANDER"}),O.jsx("p",{children:"an endless scenic drive through the seasons"}),O.jsx("button",{className:"wander-start-btn",children:"BEGIN DRIVE"}),O.jsx("div",{className:"wander-tiny",children:"procedural & infinite · sound on 🎧"})]})})]})}export{ms as default};
