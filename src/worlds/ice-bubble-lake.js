// UNDER THE ICE: Abraham Lake, Alberta, on a bright January noon. We swim 3 to 6 m under clear black ice through a grove of
// frozen methane-bubble columns that hang from the ice like upside-down trees. A koi still stained with the Fez dyes leads the
// way; where it touches, a wave of its colours runs through the columns ahead. The lake is a drowned valley: spruce stumps
// stand in the silt and methane seeps feed the columns from below. It ends in the pool of daylight under an ice-fishing hole.
// Progress T = u * duration drives every event; the clock t only makes things shiver, drift and ripple.
import * as THREE from 'three';
import { makePath, lerp, smoothstep, clamp } from '../kit/core.js';
import * as fx from '../kit/fx.js';
import * as F from '../kit/fauna.js';
import { FLORA_CAUSTIC_GLSL } from '../kit/flora.js';

const DUR = 18.5;
const PAL = ['#ff7a5a', '#ffc04a', '#6adf9a', '#4aa8ff', '#c07aff', '#ff8ac0'];
// the swim: an S of two and a half swings, 165 m long, sinking over the drowned forest and rising for the window
const PX = (s) => 6 * Math.sin(s * Math.PI * 2.5);
const PZ = (s) => 40 - 160 * s;
const PYK = [[0, -2.6], [0.12, -2.8], [0.27, -3.4], [0.38, -5.2], [0.45, -5.5], [0.62, -5.4], [0.7, -4.1], [0.78, -3.5], [0.88, -3.6], [1, -4.6]];
const PY = (s) => { for (let i = 1; i < PYK.length; i++) if (s <= PYK[i][0]) return lerp(PYK[i - 1][1], PYK[i][1], smoothstep(PYK[i - 1][0], PYK[i][0], s)); return PYK[PYK.length - 1][1]; };
const bell = (x, a, b, c, d) => smoothstep(a, b, x) * (1 - smoothstep(c, d, x));
const lin = (hex) => new THREE.Color(hex);   // THREE.Color converts the sRGB hex to linear (the pow(col, 2.2) the engine asks for)

// ------------------------------------------------------------------ shared GLSL: water tint and fog, noise, sun windows, caustics
const COMMON = /* glsl */`
uniform vec3 uUp, uMid, uLow, uSunDir, uSunCol; uniform float uFogD, uTime, uT; uniform vec4 uWin[5]; uniform vec4 uHole;
vec3 waterTint(float vy){ return vy < 0. ? mix(uMid, uLow, smoothstep(0., -.55, vy)) : mix(uMid, uUp, smoothstep(0., .5, vy)); }
float fogK(vec3 w){ float L = length(w - cameraPosition)*uFogD; return 1. - exp(-L*L); }
vec3 wfog(vec3 col, vec3 w){ vec3 d = w - cameraPosition; return mix(col, waterTint(d.y/max(length(d), 1e-3)), fogK(w)); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ return vn(p)*.5 + vn(p*2.03 + 1.7)*.3 + vn(p*4.1 + 3.1)*.2; }
float winMask(vec2 p){
  float m = 0., e = vn(p*.13) - .5;
  for (int i = 0; i < 5; i++){ float d = length(p - uWin[i].xy) + e*uWin[i].z*.45; m = max(m, uWin[i].w*(1. - smoothstep(uWin[i].z*.5, uWin[i].z, d))); }
  return m;
}
// how much sun reaches a point under the ice: follow the light back up to the ice and read the windows there
float sunAt(vec3 w){ vec2 q = w.xz - uSunDir.xz*(w.y/uSunDir.y); float hd = length(q - uHole.xy); return max(winMask(q), uHole.w*(1. - smoothstep(uHole.z, uHole.z*3., hd))); }
${FLORA_CAUSTIC_GLSL}
`;

// ------------------------------------------------------------------ lake bed, stumps, trunks, cobbles: one self-lit material
const BED_VERT = /* glsl */`
attribute vec3 aTint;
varying vec3 vW, vN, vObj, vTint;
void main(){
  vec4 p = vec4(position, 1.); vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix*p; n = mat3(instanceMatrix)*n;
  #endif
  vec4 w = modelMatrix*p; vW = w.xyz; vN = normalize(mat3(modelMatrix)*n); vObj = position;
  #ifdef TINT
    vTint = aTint;
  #else
    vTint = vec3(1.);
  #endif
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const BED_FRAG = /* glsl */`
uniform vec3 uSilt, uAlgae, uBark; uniform float uGain; uniform vec4 uVent[12];
varying vec3 vW, vN, vObj, vTint;
${COMMON}
void main(){
  vec3 N = normalize(vN); float dist = length(vW - cameraPosition), fine = 1. - smoothstep(14., 45., dist), depth = -vW.y;
  vec3 alb;
#if KIND == 0
  // silt: mottled ochre-grey, old ripples across the current, green algae in patches, pocked rings round the seeps
  float m = vn(vW.xz*.31)*.5 + vn(vW.xz*1.27 + 4.)*.3 + vn(vW.xz*4.3 + 9.)*.2*fine;
  alb = uSilt*(.7 + .55*m);
  float a = smoothstep(.5, .78, vn(vW.xz*.085 + 3.)*.7 + vn(vW.xz*.55)*.3);
  alb = mix(alb, uAlgae*(.75 + .5*m), a*.35);
  float rp = sin(dot(vW.xz, vec2(.83, .52))*2.6 + vn(vW.xz*.35)*5.)*.5 + .5;
  alb *= 1. - .14*rp*fine;
  alb *= .9 + .2*smoothstep(-11.5, -7.5, vW.y);                    // the old channel is darker than the banks
  for (int i = 0; i < 12; i++){
    float d = length(vW.xz - uVent[i].xy)/max(uVent[i].z, .01);
    float ring = exp(-pow((d - .7)/.25, 2.)), pit = 1. - smoothstep(0., .45, d);
    vec2 c = floor(vW.xz*7.); float pock = step(.72, h21(c))*smoothstep(.35, .1, length(fract(vW.xz*7.) - .5))*smoothstep(1.4, .5, d);
    alb *= 1. - uVent[i].w*(.25*ring + .55*pit + .45*pock);
    alb = mix(alb, uSilt*1.25, uVent[i].w*ring*.3);
  }
#elif KIND == 1
  // drowned spruce: grey bark split in long furrows, the broken top paler, furred with green algae on whatever faces up
  float ang = atan(vObj.z, vObj.x);
  float furrow = smoothstep(.25, .65, vn(vec2(ang*4.5, vObj.y*.9)));
  float grain = vn(vec2(ang*11., vObj.y*5.));
  alb = uBark*(.6 + .35*grain)*(.65 + .45*furrow);
  float fur = clamp(smoothstep(-.2, .8, N.y) + (vn(vW.xz*2.1 + vW.y*1.7) - .5)*.7, 0., 1.);
  alb = mix(alb, uAlgae*(.6 + .6*vn(vW.xz*6. + vW.y)), fur*.65);
  alb *= vTint;
#else
  // river cobbles: pale stone, some green with algae on the top
  alb = vTint*(.78 + .35*vn(vW.xz*7. + vW.y*5.));
  alb = mix(alb, uAlgae, smoothstep(.55, .95, N.y)*.35*smoothstep(.4, .7, vn(vW.xz*3.)));
#endif
  // light scattered in the water from everywhere (never black), plus the sun through the windows with its caustic web
  vec3 amb = mix(uLow*.9, uUp*.62, N.y*.5 + .5)*vec3(1.5, 1., .85);
  float sun = .5 + .5*sunAt(vW);
  float cau = floraCaustic(vW.xz*.3 + vW.y*.06, uTime*.42);
  float ndl = max(dot(N, -uSunDir), 0.);
  vec3 L = amb + uSunCol*sun*ndl*(.12 + 1.9*cau*(.35 + .65*fine))*exp(-depth*.03);
  vec3 col = alb*L*uGain;
  col.r *= exp(-depth*.03);                                       // red is the first colour the water takes
  gl_FragColor = vec4(wfog(col, vW), 1.);
}`;

// ------------------------------------------------------------------ the ice overhead
const ICE_VERT = /* glsl */`
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const ICE_FRAG = /* glsl */`
uniform vec3 uIce, uWinC, uBlack, uCrack;
varying vec3 vW;
${COMMON}
vec2 h22(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p)*43758.5453); }
vec3 vor(vec2 x){                               // nearest distance, distance to the nearest edge, cell id
  vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){ vec2 g = vec2(float(i), float(j)), r = g + h22(n + g) - f; float d = dot(r, r); if (d < md){ md = d; mr = r; mg = g; } }
  float ed = 8.;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++){ vec2 g = mg + vec2(float(i), float(j)), r = g + h22(n + g) - f; if (dot(mr - r, mr - r) > 1e-5) ed = min(ed, dot(.5*(mr + r), normalize(r - mr))); }
  return vec3(sqrt(md), ed, h22(n + mg).x);
}
void main(){
  vec2 p = vW.xz; float dist = length(vW - cameraPosition), nearK = 1. - smoothstep(12., 60., dist);
  vec2 wq = vec2(fbm(p*.035), fbm(p*.035 + 7.3));
  vec2 q = p/6.5 + 2.3*wq + .25*vec2(vn(p*.4), vn(p*.4 + 5.));
  vec3 v = vor(q);                                                  // the plates
  float w1 = .005 + fwidth(v.y)*1.;
  float crack = (1. - smoothstep(0., w1, v.y))*smoothstep(.45, .7, vn(p*.07 + 3.))*(1. - .7*smoothstep(30., 120., dist));
  float seam = exp(-v.y*14.)*.5;                                    // the plate edges catch more light
  vec3 v2 = vor(q*3.3 + 11.);                                       // crazing inside the plates
  float craze = (1. - smoothstep(0., .018 + fwidth(v2.y)*1.2, v2.y))*nearK*smoothstep(.4, .7, vn(p*.3 + 5.));
  // the long pressure cracks: wandering lines across many plates, thin
  float s1 = (p.x*.62 + p.y*.78)/48. + 1.1*fbm(p*.022 + 2.) + .15*vn(p*.2), fz = abs(fract(s1) - .5);
  float ridge = (1. - smoothstep(0., .002 + fwidth(s1)*1.2, fz))*smoothstep(.4, .6, vn(p*.03 + 8.));
  float snow = smoothstep(.38, .72, fbm(p*.016 + 1.)*.75 + vn(p*.09)*.25);
  float win = winMask(p);
  vec3 base = uIce*(.55 + .26*v.z + .12*seam)*(.88 + .24*vn(p*.45));
  base = mix(base, vec3(dot(base, vec3(.3, .5, .2)))*vec3(.9, .96, 1.)*.7, snow*.75);     // snow lies on top: milky and dim
  // black ice: dark blue-green, with the sun burning through it in soft moving patches
  float sunny = .45 + .55*smoothstep(.25, .85, fbm(p*.11 + vec2(uTime*.02, -uTime*.013)));
  vec3 blk = mix(uBlack, uWinC*.86, sunny*(.55 + .45*smoothstep(.5, 1., win)));
  vec3 col = mix(base, blk, win);
  col = mix(col, uCrack*.7, clamp(crack*.4 + ridge*.35 + craze*.12, 0., 1.)*(1. - .4*win));
  // air specks frozen in the ice, only near
  vec2 c = floor(p*2.6); vec2 o = h22(c + 3.) - .5;
  float speck = step(.82, h21(c))*smoothstep(.09, .02, length(fract(p*2.6) - .5 - o*.6))*(1. - smoothstep(6., 22., dist));
  col += uCrack*speck*.35;
  // the ice-fishing hole: daylight itself, and the ice round it lit
  float hd = length(p - uHole.xy);
  col += uWinC*.35*uHole.w*exp(-max(hd - uHole.z, 0.)*.45);
  col = mix(col, uWinC*.95, uHole.w*(1. - smoothstep(uHole.z*.85, uHole.z, hd)));
  col = min(col, vec3(.72));
  gl_FragColor = vec4(wfog(col, vW), 1.);
}`;

// ------------------------------------------------------------------ bubble discs: translucent silver, bright rim, thin dark rim line
const DISC_VERT = /* glsl */`
attribute vec4 aI; attribute vec3 aHue;               // aI = time the colour wave reaches the column, place down the column (0 top), column id, seed
uniform vec2 uTouch; uniform float uTime;
varying vec3 vW, vN, vHue; varying vec4 vI; varying float vLY;
void main(){
  vec4 w = modelMatrix*instanceMatrix*vec4(position, 1.);
  float sh = (aI.z == uTouch.x ? 1. : 0.)*uTouch.y*smoothstep(.5, .85, aI.y);           // the lower discs of the touched column shiver
  w.x += sh*.09*sin(uTime*13. + aI.y*17.); w.z += sh*.07*cos(uTime*11. + aI.y*23.);
  vW = w.xyz; vN = normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal); vHue = aHue; vI = aI; vLY = position.y/.35;
  gl_Position = projectionMatrix*viewMatrix*w;
}`;
const DISC_FRAG = /* glsl */`
uniform vec3 uSilver, uIceB;
varying vec3 vW, vN, vHue; varying vec4 vI; varying float vLY;
${COMMON}
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  float ndv = abs(dot(N, V)), fres = pow(1. - ndv, 2.2);
  float top = smoothstep(.15, .9, N.y), under = 1. - smoothstep(0., .06, vLY);
  float sun = .35 + .65*sunAt(vW);
  vec3 col = uIceB*(.42 + .12*fract(vI.w*7.)) + uSilver*(.16 + fres*1.6*.75) + uSilver*top*.5*sun;
  col += uSilver*under*.12*sun;
  float a = mix(.55, .95, fres);
  // the dye: it tints the disc and lights it softly from inside, and a crest runs down the column from the ice
  float dt = uT - vI.x - vI.y*.6;
  float lit = smoothstep(0., .8, dt), crest = exp(-pow((dt - .2)/.2, 2.));
  float lum = dot(col, vec3(.3, .5, .2));
  col = mix(col, vHue*(lum*.9 + .05), .6*lit);
  col += vHue*(.4*lit*(.55 + .45*fres) + .5*crest)*sun;
  a = max(a, .62*lit);
  float rimLine = 1. - smoothstep(.03, .13, ndv);
  col *= 1. - .7*rimLine; a = max(a, rimLine*.9);
  col = min(col, vec3(1.1));
  float fk = fogK(vW);
  vec3 d = vW - cameraPosition;
  gl_FragColor = vec4(mix(col, waterTint(d.y/length(d)), fk), a*(1. - .65*fk));
}`;

// ------------------------------------------------------------------ frost rosettes where each column meets the ice
const ROSE_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vW; varying float vS;
void main(){ vUv = position.xz; vec4 w = modelMatrix*instanceMatrix*vec4(position, 1.); vW = w.xyz; vS = instanceMatrix[3].x*.37 + instanceMatrix[3].z*.71; gl_Position = projectionMatrix*viewMatrix*w; }`;
const ROSE_FRAG = /* glsl */`
uniform vec3 uFrost; varying vec2 vUv; varying vec3 vW; varying float vS;
${COMMON}
void main(){
  float d = length(vUv), an = atan(vUv.y, vUv.x);
  float arms = pow(abs(sin(an*3.5 + vS)), 6.)*(1. - d) + pow(abs(sin(an*6. + vS*2.)), 12.)*(1. - d)*.6;
  float a = (smoothstep(1., .2, d + (vn(vUv*4. + vS) - .5)*.4)*.35 + arms*.5)*(1. - smoothstep(.9, 1., d));
  a *= 1. - fogK(vW);
  if (a < .01) discard;
  gl_FragColor = vec4(uFrost, a*.7);
}`;

// ------------------------------------------------------------------ bubbles: methane strings and the touched column's release
// After the kelp cathedral's plume: a bubble's age is (clock - birth); a soft disc with a ring and the sun in it, never
// narrower than 1.6 pixels (far off it fades instead of sparkling), gone when it reaches its ceiling.
const BUB_VERT = /* glsl */`
attribute vec4 aP, aR, aQ;              // aP birth position + birth clock; aR drift x, drift z, size, seed; aQ ceiling, rise speed, period
uniform float uClock, uPx;
varying vec2 vUv; varying float vA, vSeed; varying vec3 vW;
uniform float uTime;
void main(){
  float age = uClock - aP.w; if (aQ.z > 0.) age = mod(age, aQ.z);
  float life = max((aQ.x - aP.y)/aQ.y, .1), k = clamp(age/life, 0., 1.), on = step(0., age)*step(age, life);
  vec3 p = vec3(aP.x + aR.x*k + sin(uTime*2.3 + aR.w*40.)*.05*k, aP.y + age*aQ.y, aP.z + aR.y*k + cos(uTime*2.1 + aR.w*30.)*.05*k);
  float sz = aR.z*(.8 + .5*k);
  vec4 mv = viewMatrix*vec4(p, 1.);
  float grow = max(1., 1.6*max(-mv.z, .1)/max(sz*uPx, 1e-3));
  mv.xy += position.xy*sz*grow;
  vW = p; vUv = position.xy; vSeed = aR.w;
  vA = on*smoothstep(0., .06, k)*(1. - smoothstep(.92, 1., k))*smoothstep(.8, 3., -mv.z)/grow;
  gl_Position = on > .5 ? projectionMatrix*mv : vec4(2., 2., 2., 1.);
}`;
const BUB_FRAG = /* glsl */`
uniform vec3 uBub; varying vec2 vUv; varying float vA, vSeed; varying vec3 vW;
${COMMON}
void main(){
  float d = length(vUv); if (d > 1.) discard;
  float soft = 1. - smoothstep(0., 1., d); soft *= soft;
  float ring = smoothstep(.5, .8, d)*(1. - smoothstep(.82, 1., d));
  vec2 g = vUv - vec2(-.3, .38); float glint = exp(-dot(g, g)*14.);
  float sun = .45 + .55*sunAt(vW);
  vec3 col = uBub*(.7 + .3*fract(vSeed*5.3))*sun + uSunCol*glint*.7*sun;
  gl_FragColor = vec4(wfog(col, vW), vA*clamp(soft*.3 + ring*.75 + glint*.6, 0., 1.)*(1. - fogK(vW)*.6));
}`;

// ------------------------------------------------------------------ dye puffs: ink in water, billowing
const PUFF_VERT = /* glsl */`
attribute vec4 aPos, aCol; attribute float aSeed;
varying vec2 vUv; varying vec4 vCol; varying float vSeed, vF; varying vec3 vW;
void main(){
  vec4 mv = viewMatrix*vec4(aPos.xyz, 1.);
  float r = aPos.w; mv.xy += position.xy*r;
  vUv = position.xy; vCol = aCol; vSeed = aSeed; vW = aPos.xyz;
  vF = smoothstep(.6 + r*.3, 2.5 + r, -mv.z);                    // the lens passes through the ink without a flat smear
  gl_Position = aCol.a > .002 ? projectionMatrix*mv : vec4(2., 2., 2., 1.);
}`;
const PUFF_FRAG = /* glsl */`
varying vec2 vUv; varying vec4 vCol; varying float vSeed, vF; varying vec3 vW;
${COMMON}
void main(){
  float d = length(vUv);
  float n = vn(vUv*2.2 + vSeed*13. + uTime*.08)*.6 + vn(vUv*5. - vSeed*7.)*.4;
  float a = smoothstep(1., .15, d + (n - .5)*.75);
  float lit = (.62 + .45*(vUv.y*.5 + .5))*(.7 + .5*sunAt(vW));    // lit from the ice above
  vec3 col = vCol.rgb*lit*(.85 + .3*n);
  float fk = fogK(vW);
  gl_FragColor = vec4(wfog(col, vW), a*vCol.a*vF*(1. - fk*.7));
}`;

// ------------------------------------------------------------------ the koi: kohaku white and orange, an indigo saddle and a pink cheek from the vats
const KOI_VERT = /* glsl */`
uniform float uPhase, uAmp, uBend;
varying vec3 vObj, vN, vW, vCol;
void main(){
  vec3 p = position; float zn = p.z/.6, w = .5 - zn;               // 0 at the nose, 1 at the tail
  float a = uAmp*(.012 + .09*w*w);
  p.x += a*sin(uPhase*6.2832 - w*4.2) + uBend*w*w*.12;
  vObj = position; vCol = color;
  vec4 wp = modelMatrix*vec4(p, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
const KOI_FRAG = /* glsl */`
uniform vec3 uWhite, uOrange, uIndigo, uPink; uniform vec3 uDye;
varying vec3 vObj, vN, vW, vCol;
${COMMON}
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  float zn = vObj.z/.6, fin = step(.5, vCol.g);
  float pat = vn(vObj.zx*vec2(14., 22.) + vec2(3., 1.))*.7 + vn(vObj.zy*40.)*.3;
  float back = smoothstep(-.04, .03, vObj.y);
  vec3 alb = mix(uWhite, uOrange, smoothstep(.3, .38, pat)*smoothstep(-.07, .0, vObj.y)*(1. - smoothstep(.36, .46, zn)));
  alb = mix(alb, uOrange, smoothstep(.4, .48, zn)*.85*back);                              // the red cap
  float saddle = bell2(zn);
  alb = mix(alb, uIndigo, saddle);
  alb = mix(alb, uPink, smoothstep(.22, .34, zn)*(1. - smoothstep(.4, .47, zn))*smoothstep(.0, .05, abs(vObj.x))*(1. - back*.6)*.7);
  alb = mix(alb, mix(uWhite, uOrange, .35), fin*.85);
  float up = N.y*.5 + .5, fres = pow(1. - abs(dot(N, V)), 2.);
  float sun = .4 + .6*sunAt(vW);
  float cau = floraCaustic(vW.xz*.9, uTime*.5);
  vec3 L = mix(uLow*1.6 + uSunCol*.08, uUp*.9 + uSunCol*.75*sun, up) + uSunCol*smoothstep(.4, 1., N.y)*cau*.35*sun + uUp*fres*.5;
  vec3 col = alb*L;
  gl_FragColor = vec4(wfog(col, vW), 1.);
}`;
const KOI_BELL = /* glsl */`
float bell2(float zn){ return smoothstep(-.2, -.1, zn)*(1. - smoothstep(.1, .2, zn))*smoothstep(.0, .04, vObj.y)*smoothstep(.35, .55, vn(vObj.zx*vec2(18., 30.) + 7.))*.75; }
`;
// long trailing fins: pectorals that scull and spread in the glides, a soft tail of streamers that lag behind the body wave
const FIN_VERT = /* glsl */`
attribute vec4 aF;                       // kind (0 pectoral, 1 streamer), along 0..1, side, across -1..1
uniform float uPhase, uAmp, uSpread, uBend, uTime;
varying float vAlong, vAcross; varying vec3 vW;
void main(){
  vec3 p = position; float s = aF.y;
  if (aF.x < .5){
    float sp = uSpread + .12*sin(uTime*3.1 + aF.z);               // sculling
    float ang = sp*s;
    p.x = position.x + aF.z*s*.26*cos(ang*.5);
    p.y = position.y - s*.09 - s*s*.05*(1. - uSpread);
    p.z = position.z - s*.22*(1.15 - uSpread*.6) + s*s*.04*sin(uTime*4. + aF.z*2.);
  } else {
    float w = 1. + s*.9;                                          // past the tail
    p.x += uAmp*(.012 + .09*w*w)*sin(uPhase*6.2832 - w*4.2 - s*2.2) + uBend*w*w*.12 + .02*s*s*sin(uTime*3. + aF.w*4.);
    p.y += .015*s*sin(uTime*2.2 + aF.w*5.);
  }
  vAlong = s; vAcross = aF.w;
  vec4 wp = modelMatrix*vec4(p, 1.); vW = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}`;
const FIN_FRAG = /* glsl */`
uniform vec3 uWhite, uOrange;
varying float vAlong, vAcross; varying vec3 vW;
${COMMON}
void main(){
  float veins = .8 + .2*sin(vAcross*28.);
  vec3 col = mix(uWhite, uOrange, .3 + .3*vAlong)*(uUp*2.3 + uSunCol*.35)*veins;
  float a = .62*(1. - vAlong*.55)*(1. - smoothstep(.75, 1., abs(vAcross)));
  gl_FragColor = vec4(wfog(col, vW), a);
}`;

// ------------------------------------------------------------------ backdrop dome, the daylight shaft, the mercury puddle
const DOME_VERT = /* glsl */`varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*viewMatrix*vec4(position + cameraPosition, 1.); }`;
const DOME_FRAG = /* glsl */`varying vec3 vD; ${COMMON} void main(){ gl_FragColor = vec4(waterTint(vD.y/length(vD)), 1.); }`;
const SHAFT_VERT = /* glsl */`
varying vec3 vW, vN; varying float vY;
void main(){ vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vY = uv.y; gl_Position = projectionMatrix*viewMatrix*w; }`;
const SHAFT_FRAG = /* glsl */`
uniform float uK; varying vec3 vW, vN; varying float vY;
${COMMON}
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float edge = pow(abs(dot(normalize(vN), V)), 1.6);              // soft across the shaft
  float n = .7 + .3*vn(vec2(atan(vW.z - uHole.y, vW.x - uHole.x)*3., vW.y*.4 - uTime*.15));
  float I = edge*n*smoothstep(0., .35, vY)*uK;
  gl_FragColor = vec4(uSunCol*I*.16*(1. - fogK(vW)*.5), 0.);
}`;
const PUD_VERT = /* glsl */`varying vec2 vUv; varying vec3 vW; void main(){ vUv = position.xz; vec4 w = modelMatrix*vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const PUD_FRAG = /* glsl */`
uniform vec3 uSilver; uniform float uK; varying vec2 vUv; varying vec3 vW;
${COMMON}
void main(){
  float d = length(vUv) + (vn(vUv*3. + uTime*.6) - .5)*.25;
  if (d > 1.) discard;
  float rip = .5 + .5*sin(d*16. - uTime*5.5 + vn(vUv*5.)*3.);
  vec3 col = uSilver*(.55 + .35*rip + .4*smoothstep(.75, .95, d));
  col *= 1. - .6*smoothstep(.93, 1., d);
  gl_FragColor = vec4(wfog(col, vW), uK*.92);
}`;

function quadInst(n) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.instanceCount = n; return g;
}
// a drowned spruce stump: flared, with splayed roots and a broken, splintered top (base at y 0, height 1, radius 1)
function stumpGeometry(R) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 14, 9, false), p = g.attributes.position, ph = R.range(0, 6.28), roots = R.int(4, 6);
  const jag = Array.from({ length: 14 }, () => R.range(0, 0.45));
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i) + 0.5, z = p.getZ(i);
    const ang = Math.atan2(z, x), rr = Math.hypot(x, z), seg = ((Math.round((ang + Math.PI) / (2 * Math.PI) * 14) % 14) + 14) % 14;
    const flare = 1 + 1.3 * Math.pow(1 - smoothstep(0, 0.32, y), 2) * (0.35 + 0.65 * Math.pow(Math.max(0, Math.cos(ang * roots + ph)), 3));
    const taper = 1 - 0.18 * y, bark = 1 + 0.06 * Math.sin(ang * 9 + y * 7) * Math.sin(ang * 3 + 1);
    const k = flare * taper * bark;
    if (y > 0.99) y = 1 - jag[seg] * (rr > 0.5 ? 1 : 0.4);         // the splintered top
    else if (y > 0.85) y = Math.min(y, 1 - jag[seg] * 0.8 + (y - 0.85));
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals(); return g;
}
function trunkGeometry() {
  const g = new THREE.CylinderGeometry(0.78, 1, 1, 10, 12, false), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + 0.07 * Math.sin(y * 19 + a * 3) + 0.12 * Math.max(0, Math.sin(y * 7.3 + 1)) * Math.max(0, Math.cos(a * 2 + y * 3));
    p.setXYZ(i, x * k, y, z * k);
  }
  g.rotateX(Math.PI / 2); g.computeVertexNormals(); return g;   // lies along z, length 1
}

export default {
  id: 'ice-bubble-lake',
  name: 'Under the Ice',
  category: 'wilderness',
  weirdness: 0.6,
  media: ['water'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene();
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const trash = [], own = (o) => { trash.push(o); return o; };
    const updaters = [];

    // ---------- the path, built by distance, and a lookup of the lane by z ----------
    const pts = [];
    for (let k = 0; k <= 60; k++) { const s = k / 60; pts.push([PX(s), PY(s), PZ(s)]); }
    const path = makePath(pts), PL = path.length;
    const LN = 600, lx = new Float32Array(LN + 1), ly = new Float32Array(LN + 1), lz = new Float32Array(LN + 1);
    { const v = new THREE.Vector3(); for (let i = 0; i <= LN; i++) { path.pointAt(i / LN, v); lx[i] = v.x; ly[i] = v.y; lz[i] = v.z; } }
    const lane = (z) => {   // lane x, y and progress u at a given z (z falls along the path)
      if (z >= lz[0]) return [lx[0], ly[0], -(z - lz[0]) / PL];
      if (z <= lz[LN]) return [lx[LN], ly[LN], 1 + (lz[LN] - z) / PL];
      let i = clamp(Math.floor((lz[0] - z) / (lz[0] - lz[LN]) * LN), 0, LN - 1);
      while (i > 0 && lz[i] < z) i--; while (i < LN - 1 && lz[i + 1] > z) i++;
      const f = (lz[i] - z) / Math.max(lz[i] - lz[i + 1], 1e-6);
      return [lerp(lx[i], lx[i + 1], f), lerp(ly[i], ly[i + 1], f), (i + f) / LN];
    };
    const bedH = (x, z) => {
      const px = lane(z)[0], cc = px + 3 * Math.sin(z * 0.045 + 1);                  // the old river channel meanders under the path
      const forest = smoothstep(-8, -22, z) * (1 - smoothstep(-70, -86, z));
      const chan = lerp(-11.4, -8.9, forest), bank = lerp(-7.6, -7.0, forest);
      let h = chan + (bank - chan) * smoothstep(3.5, 20, Math.abs(x - cc));
      h += 0.35 * Math.sin(x * 0.21 + z * 0.13) * Math.sin(z * 0.17 - x * 0.07) + 0.18 * Math.sin(x * 0.6 + 1.3) * Math.cos(z * 0.5);
      h = lerp(h, -0.3, Math.pow(smoothstep(-46, -88, x), 1.4));                    // the shore: the lake narrows on the left
      h = lerp(h, -4.5, smoothstep(60, 115, x) * 0.7);
      return Math.min(h, -0.3);
    };

    // ---------- light: the shared uniforms ----------
    const SUN = new THREE.Vector3(0.42, -1, 0.12).normalize();
    const WIN = [[3, 21, 10, 1], [-15, -12, 10, 0.8], [17, -46, 9, 0.8], [2, -90, 21, 1], [-26, -60, 8, 0.6]];
    const endP = path.end.clone();
    const U = {
      uUp: { value: lin('#3c86a8') }, uMid: { value: lin('#2a6a8c') }, uLow: { value: lin('#1a4a66') }, uSunDir: { value: SUN }, uSunCol: { value: lin('#fff4dc') },
      uFogD: { value: 0.017 }, uTime: { value: 0 }, uT: { value: 0 },
      uWin: { value: WIN.map((w) => new THREE.Vector4(...w)) }, uHole: { value: new THREE.Vector4(endP.x, endP.z - 1.5, 1.1, 1) },
    };
    scene.fog = new THREE.FogExp2(new THREE.Color('#2a6a8c'), 0.017);
    scene.background = new THREE.Color('#2a6a8c');
    { const m = own(new THREE.ShaderMaterial({ uniforms: U, vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false }));
      const d = new THREE.Mesh(own(new THREE.SphereGeometry(600, 32, 16)), m); d.renderOrder = -10; d.frustumCulled = false; scene.add(d); }
    await tick();

    // ---------- 1. the lake bed: silt, caustics, the old channel and the shore ----------
    const vents = [];   // filled below; the bed shader reads them
    const ventU = { value: Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, 1, 0)) };
    const bedMat = (kind, extra = {}) => own(new THREE.ShaderMaterial({ vertexShader: BED_VERT, fragmentShader: BED_FRAG, defines: { KIND: kind, ...(extra.tint ? { TINT: 1 } : {}) },
      uniforms: { ...U, uSilt: { value: lin('#8a7a58') }, uAlgae: { value: lin('#5f7a48') }, uBark: { value: lin('#7a766a') }, uGain: { value: extra.gain ?? 1.0 }, uVent: ventU } }));
    {
      const g = own(new THREE.PlaneGeometry(220, 260, 110, 130)); g.rotateX(-Math.PI / 2); g.translate(5, 0, -55);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, bedH(p.getX(i), p.getZ(i)));
      g.computeVertexNormals();
      const bed = new THREE.Mesh(g, bedMat(0)); bed.frustumCulled = false; scene.add(bed);
    }
    await tick();

    // ---------- 4. the bubble columns (laid out first: the seeps and stumps keep clear of them) ----------
    const cols = [], cell = 2.2, grid = new Map();
    const key = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
    const near = (x, z, d) => { const r = Math.ceil(d / cell), cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { const L = grid.get((cx + i) + ',' + (cz + j)); if (L) for (const c of L) if (Math.hypot(c.x - x, c.z - z) < Math.max(d, c.md)) return true; } return false; };
    const addCol = (x, z, opt = {}) => {
      const ln = lane(z), lat = x - ln[0], c = { x, z, lat, u: ln[2], hue: opt.hue ?? R.int(0, 5), md: opt.md ?? 2.2, id: cols.length, opt };
      cols.push(c); const k = key(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c); return c;
    };
    // the koi's base track (no acts): ahead of us, weaving, in bursts and glides
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
    const BP = 2.3, BPB = 0.4;
    const burstOf = (T) => { const c = (T + 0.25) / BP, p = c - Math.floor(c); return p < BPB ? smoothstep(0, BPB, p) : 1 - smoothstep(BPB, 1, p); };
    const leadOf = (T) => lerp(4.4, 5.0, smoothstep(0, 2.2, T)) + 1.0 * burstOf(T) - 0.5 + 15 * Math.pow(Math.max(0, T - 16.4), 2);
    const koiBase = (T, out) => {
      const kd = T / DUR * PL + leadOf(T);
      path.posAtDist(kd + 0.5, _a); path.posAtDist(kd - 0.5, _b);
      const tx = _a.x - _b.x, tz = _a.z - _b.z, tl = Math.hypot(tx, tz) || 1, rx = -tz / tl, rz = tx / tl;   // right of the path
      path.posAtDist(kd, out);
      const lat = 1.3 * Math.sin(T * 1.1 + 0.5) + 0.4 * Math.sin(T * 2.3);
      out.x += rx * lat; out.z += rz * lat; out.y += -0.25 + 0.45 * Math.sin(T * 0.8 + 1) + 0.2 * Math.sin(T * 1.9);
      out.rx = rx; out.rz = rz; return out;
    };
    // the touched column: right of the line where the koi will be at T 4.6, its lower discs at the koi's height
    const touchK = koiBase(4.6, new THREE.Vector3());
    const touchP = (() => { const ln = new THREE.Vector3(); path.posAtDist(4.6 / DUR * PL + leadOf(4.6), ln); return new THREE.Vector3(ln.x + touchK.rx * 7.6, touchK.y, ln.z + touchK.rz * 7.6); })();
    const touched = addCol(touchP.x, touchP.z, { md: 3.2, n: 14, bottom: touchK.y - 1.6, r0: 1.3, hue: 3 });
    const touchKoi = new THREE.Vector3(touchP.x - touchK.rx * 1.75, touchK.y + 0.2, touchP.z - touchK.rz * 1.75);
    // the stump the koi mouths at T 9.5: left, on the bank, with a seep and its column beside it
    const stumpK = koiBase(9.5, new THREE.Vector3());
    const stumpP = (() => { const ln = new THREE.Vector3(); path.posAtDist(9.5 / DUR * PL + leadOf(9.5), ln); const x = ln.x - stumpK.rx * 9.4, z = ln.z - stumpK.rz * 9.4; return new THREE.Vector3(x, bedH(x, z), z); })();
    const stumpKoi = new THREE.Vector3(stumpP.x + stumpK.rx * 1.25, stumpP.y + 0.45, stumpP.z + stumpK.rz * 1.25);
    const ventSt = { x: stumpP.x - stumpK.rz * 2.2 - stumpK.rx * 0.6, z: stumpP.z + stumpK.rx * 2.2 - stumpK.rz * 0.6 };
    const stCol = addCol(ventSt.x, ventSt.z, { md: 2.4, bottom: -4.2 });
    // the grove: Poisson spacing, denser away from the line, never within 7 m of it
    for (let tries = 0; tries < 20000 && cols.length < 460; tries++) {
      const z = R.range(64, -170), ln = lane(z), x = R() < 0.82 ? ln[0] + (R() < 0.5 ? -1 : 1) * R.range(7, 38) : R.range(-54, 98), a = Math.abs(x - ln[0]);
      if (a < 7.1 || bedH(x, z) > -4) continue;
      if (R() > 0.55 + 0.45 * smoothstep(7, 14, a)) continue;
      if (a > 55 && R() < 0.45) continue;
      const md = (a < 25 ? 2.2 + R() * 0.6 : 2.4 + (a - 25) * 0.07 + R() * 1.4);
      if (near(x, z, md)) continue;
      addCol(x, z, { md });
    }
    // the methane seeps: under columns in the drowned forest stretch (and one by the stump)
    vents.push({ x: ventSt.x, z: ventSt.z, col: stCol });
    { const cand = cols.filter((c) => c.z < -14 && c.z > -80 && Math.abs(c.lat) > 7 && Math.abs(c.lat) < 14 && c !== stCol && c !== touched);
      for (let i = 0; i < 40 && vents.length < 11 && cand.length; i++) { const c = cand.splice(R.int(0, cand.length - 1), 1)[0]; if (vents.every((v) => Math.hypot(v.x - c.x, v.z - c.z) > 7)) vents.push({ x: c.x + R.range(-0.3, 0.3), z: c.z + R.range(-0.3, 0.3), col: c }); } }
    vents.forEach((v, i) => { v.y = bedH(v.x, v.z); v.col.seep = v; ventU.value[i].set(v.x, v.z, R.range(0.8, 1.2), 1); });

    // the colour wave: each column's time; the koi touches the column at 4.6 and the wave runs ahead faster than we swim
    const RATE = 0.1;
    for (const c of cols) {
      let tL = 1e4;
      if (c.u >= touched.u - 0.012) tL = 4.6 + Math.max(0, c.u - touched.u - 0.05) / RATE + Math.abs(c.lat) * 0.03 + R.range(0, 0.3);
      if (c.z < -70 && c.z > -118 && Math.abs(c.lat) < 45) tL = Math.min(tL, 12.4 + R.range(0, 0.9) + Math.abs(c.lat) * 0.012);   // the window: the grove ahead lights at once
      c.tL = c === touched ? 4.65 : tL;
    }
    { const early = cols.filter((c) => c.z < 36 && c.z > 14).sort((a, b) => Math.abs(a.lat) - Math.abs(b.lat)).slice(0, 2);   // the dye cloud's edge touches two at T 1.1
      early.forEach((c, i) => { c.tL = 1.1 + i * 0.3; c.hue = i ? 5 : 1; }); }

    // build the discs
    const discs = [];
    const stack = (c, ox, oz, n, r0, bottom, far) => {
      const sp0 = R.range(0.25, 0.6), lean = [R.range(-0.4, 0.4), R.range(-0.4, 0.4)], wf = R.range(0.3, 0.9), wp = R.range(0, 6.28), te = R.range(0.6, 1.7);
      let y = -0.18 - R.range(0, 0.1); const bed = bedH(c.x, c.z);
      for (let j = 0; j < n; j++) {
        if (j > 0) y -= sp0 * R.range(0.8, 1.3);
        const f = n > 1 ? j / (n - 1) : 0;
        if (y < Math.max(bed + 1.3, bottom)) break;
        if (j > 1 && R() < 0.1) continue;                         // a missing disc
        const r = clamp(r0 * (1 - 0.62 * Math.pow(f, te)) * R.range(0.82, 1.15), 0.3, 1.4) * (far ? 1.1 : 1);
        const wx = lean[0] * f + 0.22 * Math.sin(f * 6 * wf + wp), wz = lean[1] * f + 0.22 * Math.cos(f * 5 * wf + wp);
        discs.push({ x: c.x + ox + wx, y, z: c.z + oz + wz, r, th: R.range(0.55, 0.88), f, c, hue: R() < 0.25 ? (c.hue + 1) % 6 : c.hue, tx: R.range(-0.08, 0.08), tz: R.range(-0.08, 0.08), s: R() });
      }
      return y;
    };
    for (const c of cols) {
      const a = Math.abs(c.lat), far = a > 40, stub = !c.opt.n && R() < 0.15;
      let n = c.opt.n ?? (stub ? R.int(3, 5) : R.int(6, 25)); if (far) n = Math.min(n, R.int(5, 11));
      const r0 = c.opt.r0 ?? R.range(0.7, 1.4);
      let bottom = c.opt.bottom ?? -20;
      if (c.seep) bottom = Math.max(bottom, c.seep.y + 2.2);
      if (a < 11) bottom = Math.max(bottom, -5.2);                 // nothing hangs low right beside the lane
      if (c.seep && !c.opt.n) n = Math.max(n, 16);
      c.tip = stack(c, 0, 0, n, r0, bottom, far);
      if (R() < 0.12 && !c.opt.n) { const an = R.range(0, 6.28), d = R.range(0.55, 0.95); stack(c, Math.cos(an) * d, Math.sin(an) * d, Math.round(n * R.range(0.4, 0.8)), r0 * 0.8, bottom, far); }   // two stacks fused
    }
    discs.sort((a, b) => a.z - b.z);            // far first along the swim: the translucent discs paint back to front
    const DN = discs.length;
    {
      const prof = [[0.001, 0], [0.78, 0], [0.95, 0.025], [1, 0.08], [0.94, 0.17], [0.74, 0.26], [0.42, 0.33], [0.001, 0.35]].map(([x, y]) => new THREE.Vector2(x, y));
      const dg = own(new THREE.LatheGeometry(prof, 15));
      const aI = new Float32Array(DN * 4), aH = new Float32Array(DN * 3), pc = PAL.map(lin);
      const mat = own(new THREE.ShaderMaterial({ vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, transparent: true, depthWrite: false,
        uniforms: { ...U, uSilver: { value: lin('#dfe9ec') }, uIceB: { value: lin('#6f9fb4') }, uTouch: { value: new THREE.Vector2(touched.id, 0) } } }));
      const im = new THREE.InstancedMesh(dg, mat, DN), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
      discs.forEach((d, i) => {
        p.set(d.x, d.y, d.z); q.setFromEuler(e.set(d.tx, d.s * 6.28, d.tz)); s.set(d.r, d.r * d.th, d.r); im.setMatrixAt(i, m.compose(p, q, s));
        aI[i * 4] = d.c.tL; aI[i * 4 + 1] = d.f; aI[i * 4 + 2] = d.c.id; aI[i * 4 + 3] = d.s;
        const h = pc[d.hue]; aH[i * 3] = h.r; aH[i * 3 + 1] = h.g; aH[i * 3 + 2] = h.b;
      });
      dg.setAttribute('aI', new THREE.InstancedBufferAttribute(aI, 4)); dg.setAttribute('aHue', new THREE.InstancedBufferAttribute(aH, 3));
      im.frustumCulled = false; im.renderOrder = 4; scene.add(im);
      updaters.push((T) => { mat.uniforms.uTouch.value.y = smoothstep(4.45, 4.7, T) * (1 - smoothstep(5.2, 6.6, T)); });
      // frost rosettes at the roots
      const rg = own(new THREE.CircleGeometry(1, 20)); rg.rotateX(Math.PI / 2);
      const rm = own(new THREE.ShaderMaterial({ vertexShader: ROSE_VERT, fragmentShader: ROSE_FRAG, transparent: true, depthWrite: false, uniforms: { ...U, uFrost: { value: lin('#e8f6f4') } } }));
      const ri = new THREE.InstancedMesh(rg, rm, cols.length);
      cols.forEach((c, i) => { p.set(c.x, -0.03, c.z); q.setFromEuler(e.set(0, R.range(0, 6.28), 0)); const k = R.range(1.4, 2.6); s.set(k, 1, k * R.range(0.8, 1.2)); ri.setMatrixAt(i, m.compose(p, q, s)); });
      ri.frustumCulled = false; ri.renderOrder = 2; scene.add(ri);
    }
    await tick();

    // ---------- 5. the ice ceiling ----------
    {
      const g = own(new THREE.PlaneGeometry(700, 700)); g.rotateX(Math.PI / 2); g.translate(0, 0, -50);
      const m = own(new THREE.ShaderMaterial({ vertexShader: ICE_VERT, fragmentShader: ICE_FRAG, side: THREE.DoubleSide,
        uniforms: { ...U, uIce: { value: lin('#7fb6c8') }, uWinC: { value: lin('#bfe6e0') }, uBlack: { value: lin('#1d4a52') }, uCrack: { value: lin('#e8f6f4') } } }));
      const ice = new THREE.Mesh(g, m); ice.frustumCulled = false; scene.add(ice);
    }
    await tick();

    // ---------- 2. the drowned forest: spruce stumps and fallen trunks, all well off the line ----------
    {
      const woodM = bedMat(1, { tint: true, gain: 1.3 });
      const sgs = [own(stumpGeometry(R)), own(stumpGeometry(R))];
      const items = [[], []];
      items[0].push({ x: stumpP.x, z: stumpP.z, h: 1.5, r: 0.6, rot: R.range(0, 6.28) });       // the koi's stump
      for (let tries = 0; tries < 900 && items[0].length + items[1].length < 36; tries++) {
        const forest = R() < 0.72, z = forest ? R.range(-12, -82) : R.range(60, -160), x = forest && R() < 0.65 ? lane(z)[0] + (R() < 0.5 ? -1 : 1) * R.range(6, 12) : R.range(-48, 80), a = Math.abs(x - lane(z)[0]);
        if (a < 6 || (!forest && a < 9.5) || bedH(x, z) > -5.5 || near(x, z, 1.4)) continue;
        if ([...items[0], ...items[1]].some((s) => Math.hypot(s.x - x, s.z - z) < 4)) continue;
        items[R() < 0.5 ? 0 : 1].push({ x, z, h: R.range(0.6, 1.8), r: R.range(0.3, 0.7), rot: R.range(0, 6.28) });
      }
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
      items.forEach((list, k) => {
        const im = new THREE.InstancedMesh(sgs[k], woodM, list.length), tint = new Float32Array(list.length * 3);
        list.forEach((it, i) => { p.set(it.x, bedH(it.x, it.z) - 0.12, it.z); q.setFromEuler(e.set(R.range(-0.08, 0.08), it.rot, R.range(-0.08, 0.08))); s.set(it.r, it.h, it.r * R.range(0.85, 1.15)); im.setMatrixAt(i, m.compose(p, q, s));
          const g = R.range(0.85, 1.15); tint[i * 3] = g; tint[i * 3 + 1] = g * R.range(0.95, 1.05); tint[i * 3 + 2] = g * R.range(0.9, 1); });
        sgs[k].setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3)); im.frustumCulled = false; scene.add(im);
      });
      // fallen trunks lying in the silt at every angle, one end often resting up on a bank
      const tg = own(trunkGeometry()), NT = R.int(6, 9), ti = new THREE.InstancedMesh(tg, woodM, NT), tt = new Float32Array(NT * 3);
      for (let i = 0; i < NT; i++) {
        let x, z, a, tries = 0; do { z = i < 5 ? R.range(-14, -84) : R.range(40, -150); x = R.range(-44, 70); a = Math.abs(x - lane(z)[0]); tries++; } while (((i < 2 ? (a < 6 || a > 12) : a < 16) || bedH(x, z) > -5.5) && tries < 60);
        const len = R.range(6, 14), r = R.range(0.22, 0.42), yaw = R.range(0, 6.28), pitch = R.range(-0.18, 0.12);
        p.set(x, bedH(x, z) + r * 0.6, z); q.setFromEuler(e.set(pitch, yaw, R.range(-0.2, 0.2))); s.set(r, r, len); ti.setMatrixAt(i, m.compose(p, q, s));
        tt[i * 3] = tt[i * 3 + 1] = tt[i * 3 + 2] = R.range(0.8, 1.05);
      }
      tg.setAttribute('aTint', new THREE.InstancedBufferAttribute(tt, 3)); ti.frustumCulled = false; scene.add(ti);
      // river cobbles along the old channel and round the stumps
      const cg = own(new THREE.IcosahedronGeometry(1, 1)), NC = 360, ci = new THREE.InstancedMesh(cg, bedMat(2, { tint: true, gain: 1.25 }), NC), ct = new Float32Array(NC * 3);
      const pale = lin('#9a9890'), green = lin('#6f8a58'), tmp = new THREE.Color();
      for (let i = 0; i < NC; i++) {
        let x, z;
        if (R() < 0.75) { z = R.range(60, -150); const px = lane(z)[0], cc = px + 3 * Math.sin(z * 0.045 + 1); x = cc + R.range(-7, 7) * R(); }
        else { const st = items[0][R.int(0, items[0].length - 1)] || stumpP; x = st.x + R.range(-3, 3); z = st.z + R.range(-3, 3); }
        const r = 0.1 + 0.4 * Math.pow(R(), 2.2);
        p.set(x, bedH(x, z) + r * 0.15, z); q.setFromEuler(e.set(R.range(-0.3, 0.3), R.range(0, 6.28), R.range(-0.3, 0.3))); s.set(r, r * R.range(0.45, 0.7), r * R.range(0.75, 1)); ci.setMatrixAt(i, m.compose(p, q, s));
        tmp.copy(pale).lerp(green, R() < 0.35 ? R.range(0.4, 0.9) : R.range(0, 0.2)).multiplyScalar(R.range(0.8, 1.15)); ct[i * 3] = tmp.r; ct[i * 3 + 1] = tmp.g; ct[i * 3 + 2] = tmp.b;
      }
      cg.setAttribute('aTint', new THREE.InstancedBufferAttribute(ct, 3)); ci.frustumCulled = false; scene.add(ci);
    }
    await tick();

    // ---------- 3. bubbles: the seep strings (clock), the release from the touched column (T) ----------
    const bubMat = (clock) => own(new THREE.ShaderMaterial({ vertexShader: BUB_VERT, fragmentShader: BUB_FRAG, transparent: true, depthWrite: false,
      uniforms: { ...U, uClock: clock, uPx: { value: 1600 }, uBub: { value: lin('#e6f4f6') } } }));
    const mkBubbles = (list, clock) => {
      const n = list.length, g = quadInst(n), P = new Float32Array(n * 4), Rr = new Float32Array(n * 4), Q = new Float32Array(n * 4);
      list.forEach((b, i) => { P.set(b.p, i * 4); Rr.set(b.r, i * 4); Q.set(b.q, i * 4); });
      g.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute('aR', new THREE.InstancedBufferAttribute(Rr, 4)); g.setAttribute('aQ', new THREE.InstancedBufferAttribute(Q, 4));
      own(g); const mesh = new THREE.Mesh(g, bubMat(clock)); mesh.frustumCulled = false; mesh.renderOrder = 6; scene.add(mesh); return mesh;
    };
    const clockT = { value: 0 }, clockU = { value: 0 };
    {
      const list = [];
      for (const v of vents) {
        const top = v.col.tip - 0.1, speed = R.range(0.9, 1.3), life = (top - v.y) / speed, period = life + R.range(0.4, 1.6), n = R.int(18, 28);
        for (let i = 0; i < n; i++) {   // they leave in little puffs, not evenly
          const puff = Math.floor(i / 4), b = (puff * 0.55 + (i % 4) * 0.09 + R.range(0, 0.05)) % period;
          list.push({ p: [v.x + R.range(-0.12, 0.12), v.y + 0.1, v.z + R.range(-0.12, 0.12), b], r: [R.range(-0.15, 0.15), R.range(-0.15, 0.15), R.range(0.03, 0.07), R()], q: [top, speed, period, 0] });
        }
      }
      mkBubbles(list, clockT);
    }
    // the touched column lets go: a free string slips out by its lowest discs and rises to pool under the ice
    const relX = touchP.x - touchK.rx * 1.3, relZ = touchP.z - touchK.rz * 1.3;
    {
      const list = [];
      for (let i = 0; i < 46; i++) {
        const b = 4.75 + i * 0.035 + R.range(0, 0.06) + (i > 30 ? 0.4 : 0);
        list.push({ p: [relX + R.range(-0.15, 0.15), touchK.y - 0.8 + R.range(-0.2, 0.2), relZ + R.range(-0.15, 0.15), b], r: [R.range(-0.25, 0.25), R.range(-0.25, 0.25), R.range(0.04, 0.11), R()], q: [-0.12, R.range(1.2, 1.7), 0, 0] });
      }
      mkBubbles(list, clockU);
    }
    // the mercury puddle under the ice where they collect
    const pud = (() => {
      const g = own(new THREE.CircleGeometry(1, 40)); g.rotateX(Math.PI / 2);
      const m = own(new THREE.ShaderMaterial({ vertexShader: PUD_VERT, fragmentShader: PUD_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...U, uSilver: { value: lin('#dfe8ea') }, uK: { value: 0 } } }));
      const mesh = new THREE.Mesh(g, m); mesh.position.set(relX, -0.06, relZ); mesh.scale.set(0.01, 1, 0.01); mesh.renderOrder = 3; scene.add(mesh);
      return { mesh, m };
    })();
    updaters.push((T, t) => { const k = smoothstep(6.4, 8.6, T); pud.mesh.scale.set(0.01 + 1.5 * k * (1 + 0.04 * Math.sin(t * 5)), 1, 0.01 + 1.1 * k * (1 + 0.04 * Math.cos(t * 4.3))); pud.m.uniforms.uK.value = smoothstep(6.3, 7, T); });
    await tick();

    // ---------- 6. light in the water: slanting shafts under the windows, the daylight column under the hole ----------
    const rays = [];
    WIN.forEach((w, i) => {
      if (i === 0) return;   // the window over the start is seen from below; its light lives in the caustics and the cloud
      rays.push(fx.makeGodRays({ rng: R, count: i === 3 ? 16 : 9, radius: w[2] * 0.7, direction: [SUN.x, SUN.y, SUN.z], position: [w[0], -0.2, w[1]], length: 13, width: [1.2, 3.6],
        color: '#cfeee6', intensity: i === 3 ? 0.17 : 0.13, near: [3, 9], falloff: 1.1, speed: 0.6, fogAmount: 0.5 }));
    });
    for (const r of rays) scene.add(r.object);
    {
      const g = own(new THREE.CylinderGeometry(1.2, 3.4, 10.5, 28, 1, true)); g.translate(0, -5.25, 0);
      const m = own(new THREE.ShaderMaterial({ vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG, uniforms: { ...U, uK: { value: 1 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
      const shaft = new THREE.Mesh(g, m); shaft.position.set(U.uHole.value.x, 0, U.uHole.value.y); shaft.renderOrder = 7; scene.add(shaft);
      // the tip-up's line hangs down the shaft, an orange lure at its end: people up there on the ice
      const lm = own(new THREE.MeshBasicMaterial({ color: '#ff8a3a', fog: true }));
      const line = new THREE.Mesh(own(new THREE.CylinderGeometry(0.008, 0.008, 3.6, 4)), own(new THREE.MeshBasicMaterial({ color: '#e8d8c0', fog: true })));
      line.position.set(U.uHole.value.x + 0.5, -1.8, U.uHole.value.y + 0.2); scene.add(line);
      const lure = new THREE.Mesh(own(new THREE.SphereGeometry(0.06, 10, 8)), lm); lure.scale.set(1, 1.6, 1); lure.position.set(line.position.x, -3.6, line.position.z); scene.add(lure);
      updaters.push((T, t) => { lure.position.x = line.position.x + 0.03 * Math.sin(t * 0.9); lure.rotation.z = 0.2 * Math.sin(t * 1.3); });
    }
    await tick();

    // ---------- 7. the koi ----------
    const KS = 1.85;
    const koi = new THREE.Group(); scene.add(koi);
    const KU = { uPhase: { value: 0 }, uAmp: { value: 1 }, uBend: { value: 0 }, uSpread: { value: 0.6 } };
    const koiCols = { uWhite: { value: lin('#f6efe4') }, uOrange: { value: lin('#ff7a3a') }, uIndigo: { value: lin('#33357a') }, uPink: { value: lin('#ff8aa4') }, uDye: { value: new THREE.Color() } };
    {
      const g = own(F.fishGeometry(F.FISH_PRESETS.koi, 'high'));
      const m = own(new THREE.ShaderMaterial({ vertexShader: KOI_VERT, fragmentShader: KOI_FRAG.replace('${COMMON}', '').replace('void main(){', KOI_BELL + 'void main(){'), vertexColors: true, side: THREE.DoubleSide, uniforms: { ...U, ...KU, ...koiCols } }));
      const body = new THREE.Mesh(g, m); body.scale.setScalar(KS); body.frustumCulled = false; koi.add(body);
      // long fins as strips: two pectorals and four tail streamers
      const P = [], A = [], I = [];
      const strip = (kind, root, side, across, len, w0, w1, dir, segs = 10) => {
        const base = P.length / 3;
        for (let k = 0; k <= segs; k++) {
          const s = k / segs, w = lerp(w0, w1, s);
          for (const c of [-1, 1]) {
            if (kind === 0) P.push(root[0], root[1] + c * w * 0.5, root[2] + c * w * 0.3);
            else P.push(root[0], root[1] + dir[1] * s * len + c * w * 0.5, root[2] - s * len);
            A.push(kind, s, side, kind === 0 ? c : across + c * 0.25);
          }
          if (k < segs) { const a = base + k * 2; I.push(a, a + 1, a + 3, a, a + 3, a + 2); }
        }
      };
      for (const sd of [-1, 1]) strip(0, [sd * 0.05, -0.04, 0.12], sd, 0, 0.26, 0.07, 0.03, null);
      for (let i = 0; i < 4; i++) { const ay = lerp(-0.4, 0.45, i / 3); strip(1, [0, ay * 0.06, -0.27], 0, lerp(-0.9, 0.9, i / 3), 0.28 + 0.06 * (1 - Math.abs(ay)), 0.07, 0.02, [0, ay * 0.55, -1]); }
      const fg = own(new THREE.BufferGeometry()); fg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); fg.setAttribute('aF', new THREE.Float32BufferAttribute(A, 4)); fg.setIndex(I);
      const fm = own(new THREE.ShaderMaterial({ vertexShader: FIN_VERT, fragmentShader: FIN_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { ...U, ...KU, ...koiCols } }));
      const fins = new THREE.Mesh(fg, fm); fins.scale.setScalar(KS); fins.frustumCulled = false; fins.renderOrder = 5; koi.add(fins);
      // eyes
      const em = own(new THREE.MeshBasicMaterial({ color: '#0c0c12' })), eg = own(new THREE.SphereGeometry(0.012, 8, 6));
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(eg, em); e.position.set(sx * 0.052, 0.018, 0.22); body.add(e); }
    }
    // where the koi is at any T: its base track pulled to the column (4.6), down to the stump (9.5), up under the ice (13-15.5)
    const koiAt = (T, out) => {
      koiBase(T, out);
      const wN = bell(T, 3.7, 4.55, 4.85, 5.7);
      out.lerp(touchKoi, wN * 0.92);
      const wS = bell(T, 7.9, 9.2, 9.85, 11.2);
      _c.copy(stumpKoi); _c.y += 0.12 * Math.sin(T * 9) * bell(T, 9.2, 9.4, 9.8, 10);
      out.lerp(_c, wS * 0.9);
      const wI = bell(T, 12.2, 13.3, 15.3, 16.3);
      const spin = (1 - smoothstep(12.2, 13.5, T)) * wI;
      out.x += Math.sin((T - 12.2) * 5) * 1.3 * spin; out.z += Math.cos((T - 12.2) * 5) * 0.8 * spin;
      out.y = lerp(out.y, -0.5, wI);
      return out;
    };
    const kP = new THREE.Vector3(), kQ = new THREE.Vector3(), kR = new THREE.Vector3(), koiNow = new THREE.Vector3(), fwd = new THREE.Vector3();
    const mB = new THREE.Matrix4(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), qRoll = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1);
    const tailAt = (T, out) => { koiAt(T + 0.03, _a); koiAt(T - 0.03, _b); fwd.subVectors(_a, _b).normalize(); return koiAt(T, out).addScaledVector(fwd, -0.62); };
    koiAt(0, koiNow);
    // which column's colour the koi carries: the last one it came near
    const HUE = [];
    { let h = 1; const v = new THREE.Vector3();
      for (let k = 0; k <= 76; k++) { const T = k * 0.25; koiAt(T, v);
        if (T >= 4.5 && T < 5) h = touched.hue;
        else for (const c of cols) if (c.tL < 1e3 && Math.abs(c.z - v.z) < 4 && Math.hypot(c.x - v.x, c.z - v.z) < 8.2) { h = c.hue; break; }
        HUE.push(h); } }
    const hueAt = (T) => HUE[clamp(Math.floor(T / 0.25), 0, HUE.length - 1)];

    // ---------- the dye: the Fez cloud at the start, the ribbon from the tail, the silt puff at the stump ----------
    const NRIB = 84, DTE = 0.055, NCL = 36, NSI = 16, NPUFF = NRIB + NCL + NSI;
    const pg = quadInst(NPUFF), aPos = new Float32Array(NPUFF * 4), aCol = new Float32Array(NPUFF * 4), aSeed = new Float32Array(NPUFF);
    for (let i = 0; i < NPUFF; i++) aSeed[i] = R() * 10;
    const posA = new THREE.InstancedBufferAttribute(aPos, 4), colA = new THREE.InstancedBufferAttribute(aCol, 4);
    posA.setUsage(THREE.DynamicDrawUsage); colA.setUsage(THREE.DynamicDrawUsage);
    pg.setAttribute('aPos', posA); pg.setAttribute('aCol', colA); pg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1)); own(pg);
    const puffs = new THREE.Mesh(pg, own(new THREE.ShaderMaterial({ vertexShader: PUFF_VERT, fragmentShader: PUFF_FRAG, transparent: true, depthWrite: false, uniforms: U })));
    puffs.frustumCulled = false; puffs.renderOrder = 8; scene.add(puffs);
    const palC = PAL.map((h) => lin(h));
    const cloud = [];
    { const fez = ['#c8902a', '#d86a7a', '#3c3c8e', '#e0a040', '#c05a78'].map(lin), s0 = new THREE.Vector3(); path.pointAt(0, s0);
      for (let i = 0; i < NCL; i++) {
        const d = R.range(10, 30), lat = (R() < 0.5 ? -1 : 1) * R.range(2.5, 6.5);
        path.posAtDist(d, _a);
        cloud.push({ x: _a.x + lat, y: R.range(-1.2, -4.8), z: _a.z + R.range(-1, 1), r: R.range(1, 3), c: fez[i % fez.length], a: R.range(0.28, 0.46), dx: R.range(-0.5, 0.5), dy: R.range(-0.15, 0.25), dz: R.range(-0.6, 0.3), ph: R() });
      } }
    const silt = Array.from({ length: NSI }, () => ({ dx: R.range(-1, 1), dz: R.range(-1, 1), b: R.range(0, 0.4), r: R.range(0.3, 0.9), up: R.range(0.4, 1.1) }));
    const siltC = lin('#a08a5a');
    const updatePuffs = (T) => {
      let n = 0;
      const put = (x, y, z, r, c, a) => { aPos[n * 4] = x; aPos[n * 4 + 1] = y; aPos[n * 4 + 2] = z; aPos[n * 4 + 3] = r; aCol[n * 4] = c.r; aCol[n * 4 + 1] = c.g; aCol[n * 4 + 2] = c.b; aCol[n * 4 + 3] = a; n++; };
      // the ribbon: billowing puffs born at the tail, each expanding and slowing as ink does
      const te0 = Math.floor(T / DTE) * DTE;
      for (let i = 0; i < NRIB; i++) {
        const te = te0 - i * DTE, age = T - te;
        if (te < 0.05 || te > 17.1) { put(0, 0, 0, 0, palC[0], 0); continue; }
        tailAt(te, _c);
        const sd = aSeed[NCL + i] || i * 0.37, spread = 0.45 * (1 - Math.exp(-age * 0.8));
        const x = _c.x + Math.sin(sd * 7.1) * spread, z = _c.z + Math.cos(sd * 5.3) * spread, y = Math.min(_c.y + 0.07 * age + Math.sin(sd * 3.3) * spread * 0.5, -0.22);
        const r = 0.4 + 1.2 * (1 - Math.exp(-age * 1.1));
        const a = 0.6 * Math.pow(Math.max(0, 1 - age / (NRIB * DTE)), 1.25) * smoothstep(0, 0.12, age);
        put(x, y, z, r, palC[hueAt(te)], a);
      }
      // the Fez cloud: it unrolls and spreads, then thins
      for (const c of cloud) {
        const k = 1 - Math.exp(-(T + 0.6 + c.ph) * 0.55);
        put(c.x + c.dx * T, c.y + c.dy * T, c.z + c.dz * T, c.r * (0.55 + 0.6 * k), c.c, c.a * (1 - smoothstep(3.5, 7, T)));
      }
      // the silt the koi mouths up at the stump: it blooms and settles
      for (const s of silt) {
        const age = T - 9.45 - s.b, on = age > 0 ? 1 : 0, k = 1 - Math.exp(-Math.max(age, 0) * 1.2);
        put(stumpKoi.x + 0.3 + s.dx * k * 1.4, stumpP.y + 0.15 + s.up * k - Math.max(0, age - 1.2) * 0.12, stumpKoi.z + s.dz * k * 1.4, s.r * (0.4 + 1.1 * k), siltC, on * 0.42 * (1 - smoothstep(2.5, 6, age)));
      }
      posA.needsUpdate = true; colA.needsUpdate = true;
    };
    await tick();

    // ---------- 8. the whitefish school: 25 m right, it turns in unison at T 10.5 ----------
    const ft = 10.5, fsp = 4.2, k1 = new THREE.Vector3(); path.pointAt(10.5 / DUR + 22 / PL, k1);
    const route = [[k1.x + 25, -4.6, k1.z + ft * fsp], [k1.x + 25, -4.8, k1.z + ft * fsp * 0.5], [k1.x + 25, -5, k1.z], [k1.x + 30, -4.6, k1.z - 4], [k1.x + 40, -4.2, k1.z - 9], [k1.x + 60, -4, k1.z - 16]];
    const school = F.makeFishSchool({ rng: R, species: 'mackerel', count: 76, top: '#5f6a44', belly: '#e4ebe8', fin: '#8a9080', route, closed: false, start: 0, speed: fsp, size: 1.0, spread: [5, 2.2, 9] });
    scene.add(school.object);
    await tick();

    // ---------- 9. water particles: marine snow, rising bubbles, silt motes in the shafts ----------
    const parts = [
      fx.makeParticles({ rng: R, count: 240, box: [24, 14, 30], velocity: [0.03, -0.11, 0.02], velocityRandom: [0.05, 0.04, 0.05], turbulence: [0.12, 0.05, 0.12], size: [0.04, 0.08], colors: ['#cfc6b4', '#b8b0a0', '#e0dccf'], intensity: 0.9, opacity: 0.7, additive: 0.3, near: [0.6, 2.5], twinkle: 0 }),
      fx.makeParticles({ rng: R, count: 40, box: [20, 10, 26], velocity: [0, 0.65, 0], velocityRandom: [0.05, 0.25, 0.05], turbulence: [0.15, 0.05, 0.15], size: [0.015, 0.035], colors: ['#eef8ff'], intensity: 1.1, opacity: 0.8, additive: 0.7, near: [0.5, 2] }),
      fx.makeParticles({ rng: R, count: 220, box: [30, 12, 34], velocity: [0.02, -0.02, 0.01], velocityRandom: [0.04, 0.03, 0.04], turbulence: [0.2, 0.1, 0.2], size: [0.012, 0.028], colors: ['#eadcb0', '#f4ead0'], intensity: 1.0, opacity: 0.6, additive: 0.8, near: [0.5, 2], twinkle: 0.2 }),
    ];
    for (const p of parts) scene.add(p.object);
    await tick();

    // the touched column, the stump and the koi: what the camera turns to
    const poiTouch = new THREE.Vector3(touchP.x, touchK.y + 0.6, touchP.z), poiStump = new THREE.Vector3(stumpP.x + stumpK.rx * 0.6, stumpP.y + 0.9, stumpP.z + stumpK.rz * 0.6);

    return {
      scene, path, duration: DUR, title: 'Under the Ice', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 0.3, nearThrough: 0.5, far: 800, lookAhead: 14, sway: 0.25, bank: 0.04 },
      pois: [
        { at: poiTouch, from: 4 / DUR, to: 6 / DUR, weight: 0.5, fade: 0.4 },
        { at: poiStump, from: 8.5 / DUR, to: 10.5 / DUR, weight: 0.6, fade: 0.4 },
        { at: koiNow, from: 13 / DUR, to: 15 / DUR, weight: 0.5, fade: 0.4 },
      ],
      portal: { shape: 'circle', style: 'ring', radius: 4.5, color: '#bfe6e0', veil: '#7fb6c8', glow: 0.4, halo: false, revealDistance: 70, drawWithin: PL * 0.2, drawIn: 8 },
      post: { exposure: 1.05, bloom: { strength: 0.3, radius: 0.5, threshold: 0.95 }, grade: { saturation: 1.05, contrast: 1.04, tint: '#f6f8f8', shadowTint: '#06202e', vignette: 0.18, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR);
        U.uTime.value = t; U.uT.value = T; clockT.value = t; clockU.value = T;
        for (const f of updaters) f(T, t);
        // the koi: position, heading, bank into turns, belly-up under the ice
        koiAt(T, kP); koiAt(T + 0.05, kQ); koiAt(T - 0.05, kR);
        koiNow.copy(kP);
        fwd.subVectors(kQ, kR); if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, -1); fwd.normalize();
        xA.crossVectors(UP, fwd).normalize(); yA.crossVectors(fwd, xA);
        mB.makeBasis(xA, yA, fwd); koi.quaternion.setFromRotationMatrix(mB);
        const h1 = Math.atan2(kQ.x - kP.x, kQ.z - kP.z), h0 = Math.atan2(kP.x - kR.x, kP.z - kR.z);
        let dh = h1 - h0; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
        const turn = clamp(dh / 0.05, -3, 3);
        const belly = Math.PI * smoothstep(12.9, 13.6, T) * (1 - smoothstep(15.0, 15.7, T));
        qRoll.setFromAxisAngle(ZA, clamp(-turn * 0.22, -0.44, 0.44) + belly); koi.quaternion.multiply(qRoll);
        koi.position.copy(kP);
        const gone = 1 - smoothstep(17.15, 17.45, T); koi.scale.setScalar(Math.max(gone, 0.001)); koi.visible = gone > 0.01;
        // burst and glide: hard tail beats in the burst, a slow sweep with the fins spread in the glide
        const c = (T + 0.25) / BP, fl = Math.floor(c), fr = c - fl, bt = (fl * BPB + Math.min(fr, BPB)) * BP, inB = fr < BPB ? 1 : 0;
        const ph = 1.2 * T + 2.0 * bt + 0.4 * t * (u > 0 ? 0 : 1);
        KU.uPhase.value = ph; KU.uAmp.value = lerp(KU.uAmp.value, inB ? 1.0 : 0.35, Math.min(1, dt * 8)); KU.uSpread.value = lerp(KU.uSpread.value, inB ? 0.35 : 1.05, Math.min(1, dt * 5));
        KU.uBend.value = lerp(KU.uBend.value, clamp(turn * 0.4, -1, 1), Math.min(1, dt * 6));
        updatePuffs(T);
        for (const r of rays) r.update(dt, t, camera);
        for (const p of parts) p.update(dt, t, camera);
        school.update(dt, T, camera, u);
      },
      dispose() { for (const o of trash) o.dispose && o.dispose(); for (const r of rays) r.material && r.material.dispose(); },
    };
  },
};
