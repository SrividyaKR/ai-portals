// THE NIGHT THE FIREFLIES AGREE (firefly-synchrony): a June night at Elkmont in the Great Smoky Mountains. You come down out of
// the hemlock crowns onto the wet boardwalk along Jakes Creek, past the fieldstone chimneys of the abandoned Elkmont cabins,
// while thousands of synchronous fireflies (Photinus carolinus), each flashing alone, fall into step.
// The beats follow the real behaviour of the insect: the males' random sparks pull together, the whole valley goes dark at
// once, and then bursts of six slow flashes roll as a wave down the slope from the ridge on the right, lighting trunks, ferns
// and planks as they pass. In the next dark gap the females in the ferns answer with single warmer flashes and a few males
// spiral down and land beside them, while a barred owl glides across the creek and lands on a dead snag. In the last burst
// the whole valley is in step and the swarm lifts off the creek and the ferns into a slow spiral column around a small ring
// standing in the creek opening, under blue ridges in the Smokies' mist. Blue ghost fireflies (Phausis reticulata) glow
// steadily, knee high, along the boardwalk the whole way.
// Engine notes: all scripted events run on flight progress (T below is the wall time at which the flight reaches u, computed
// from the engine's own speed rules, including the slow hold before the portal of the last world of a tour); idle motion
// runs on the clock t. Flashes are eased (sin^4), under 1.5 Hz. The creek is a real mirror: the reflected world is a
// copy of the scene flipped about the water line, seen only through the channel, where the ground is cut away.
import * as THREE from 'three';
import { makePath, clamp, lerp, smoothstep as ss } from '../kit/core.js';
import { mkCanvas, fbm, skyFor, makeBird } from '../kit/mine.js';
import * as F from '../kit/fauna.js';
import * as fx from '../kit/fx.js';

const DUR = 22, TAU = Math.PI * 2, PI = Math.PI;
const LH = 236;            // the route, in metres along the ground, from the first frame to the ring
const WL = -0.3;           // the creek's water line
const DECK = 0.42;         // the boardwalk's deck height
const BW0 = -12, BW1 = LH - 7; // the boardwalk runs from behind the start to the creek mouth
// heading (radians, 0 = -z, positive turns right): left past the chimney, right over the creek, then down the creek line
const HEAD = (s) => -0.3 * (1 - ss(0, 14, s)) - 0.34 * ss(12, 30, s) + 0.34 * ss(34, 50, s) + 0.5 * ss(52, 74, s) - 0.24 * ss(82, 102, s) + 0.3 * ss(188, 214, s);
// eye height: 9 m under the crowns, eased down to 1.7 m by 2.2 s, a faint step bob on the boards, then rising with the swarm to the ring's centre
const EYE = (s) => 1.7 + 7.3 * (1 - ss(0, 15, s)) + 1.3 * ss(LH - 40, LH, s) + 0.035 * Math.sin(s * 1.55) * ss(14, 20, s) * (1 - ss(92, 100, s));
// the creek's offset from the route (right positive): along the left bank, under the bridge at about 63 m, along the right, then under the route
const OFF = (s) => (s >= LH ? 0 : lerp(-14, 11, ss(44, 80, s)) * (1 - ss(95, 115, s)));
const CW = (s) => 3.4 + 0.7 * Math.sin(s * 0.05 + 1) + 3.2 * ss(LH - 30, LH + 140, s);   // half width; it opens out toward the gap
const PACE = (u) => 1 + 1.25 * ss(0.4, 0.5, u);                                            // a walk, then the lift with the swarm
const pulseN = (q, n) => { if (q < 0 || q > n) return 0; const s = Math.sin(PI * (q - Math.floor(q))); return s * s * s * s; };

// One schedule for the whole valley, shared by the fireflies and by the light they throw on the forest. d is the distance
// along the wave from its origin on the ridge to the right: the first burst rolls at 80 m/s, the later ones at 160 m/s.
const FLASH_GLSL = /* glsl */`
uniform float uT; uniform vec2 uWO, uWD;
float pulseN(float q, float n){ if (q < 0. || q > n) return 0.; float s = sin(3.14159265 * fract(q)); s *= s; return s * s; }
float maleSync(vec3 p){
  float d = dot(p.xz - uWO, uWD);
  float b = pulseN((uT - 6.5 - d / 80.) / .68, 6.);
  b = max(b, pulseN((uT - 13.2 - d / 160.) / .72, 7.));
  float e = uT - 20.5 - d / 160.; if (e > 0.) b = max(b, pulseN(mod(e, 7.) / .72, 6.));
  return b;
}
uniform sampler2D uLM; uniform vec4 uLMB; uniform float uFieldLvl, uFemLvl;
float burstEnv(vec3 p){
  float d = dot(p.xz - uWO, uWD), e = uT - 6.5 - d / 80.;
  float b = smoothstep(0., .5, e) * (1. - smoothstep(4.08, 4.7, e));
  e = uT - 13.2 - d / 160.; b = max(b, smoothstep(0., .5, e) * (1. - smoothstep(5.04, 5.7, e)));
  e = uT - 20.5 - d / 160.; if (e > 0.) { float c = mod(e, 7.); b = max(b, smoothstep(0., .5, c) * (1. - smoothstep(4.32, 4.9, c))); }
  return b;
}
// the local light of the fireflies around p: their density (a blurred map of the field) times how much they are shining now
float fieldGlow(vec3 p){ vec2 m = texture2D(uLM, clamp((p.xz - uLMB.xy) * uLMB.zw, 0., 1.)).rg; return m.x * (uFieldLvl + .9 * burstEnv(p) + .5 * maleSync(p)) + 1.6 * m.y * uFemLvl; }`;

const FLY_VERT = /* glsl */`
attribute vec3 aP, aQ; attribute vec4 aR;
uniform float uTime, uPx, uFogK, uLock, uRand, uGap, uDim, uStreak, uSize;
uniform vec3 uCol, uFly, uFem;
varying vec2 vQ; varying vec3 vC;
${FLASH_GLSL}
float femB(float k){ float l = uT - uGap - .45 - k * 1.1; return (l > 0. && l < .9) ? pow(sin(3.14159 * l / .9), 2.) : 0.; }
void main(){
  float kind = aR.w; vec3 p = aP;
  if (kind < .5 || kind > 3.5) p += vec3(sin(uTime * .43 + aR.x * 40.), .55 * sin(uTime * .61 + aR.z * 60.), cos(uTime * .37 + aR.x * 50.)) * (.25 + .8 * aR.z);
  // alone: each at its own moment, the phases drawn together (uLock) before the first shared dark
  float rnd = pow(max(sin(3.14159 * fract(uTime * .5 + mix(aR.x, aR.x * .15, uLock))), 0.), 6.);
  float m = mix(maleSync(aP), rnd, uRand), b = m, colA = 1.;
  if (kind > .5 && kind < 1.5) b = max(b, .3);                     // resting on the rails and boards, still glowing softly
  if (kind > 1.5 && kind < 2.5) b = femB(aR.z);                      // a female in the ferns: one warm answer in each dark gap
  else if (kind > 2.5 && kind < 3.5) {                                // a male that spirals down and lands beside her
    float kL = smoothstep(0., 1., clamp((uT - 11.9 - aR.z * .6) / 1.8, 0., 1.)), r = (1. - kL) * 2.;
    p = mix(aP, aQ, kL) + vec3(cos(uTime * 2.3 + aR.x * 6.28) * r, 0., sin(uTime * 2.3 + aR.x * 6.28) * r);
    float desc = pow(abs(sin(uTime * 2.1 + aR.x * 6.3)), 8.) * .55;
    b = kL <= 0. ? m : mix(desc, .25 + .75 * femB(aR.z + .15), smoothstep(.9, 1., kL));
  } else if (kind > 3.5) {                                            // the swarm that lifts into the column
    float k = smoothstep(0., 1., clamp((uT - 13.8 - aR.z * 1.1) / 1.9, 0., 1.));
    if (k > 0.) {
      float arm = step(.62, fract(aR.x * 3.7)), a = fract(aR.x * 7.13 + uTime * .028), th = a * 11. + uTime * .45 + arm * 2.6 + (aR.z - .5) * 2.6 + .45 * sin(uTime * .7 + aR.x * 31.), rad = 4. + 9. * a * (1. - .45 * a) + 2.6 * sin(aR.x * 57. + uTime * .3) * (.4 + a) + 1.4 * sin(aR.z * 40.);
      p = mix(p, uCol + vec3(cos(th) * rad, a * 46., sin(th) * rad), k);
      colA = mix(1., smoothstep(0., .05, a) * (1. - smoothstep(.82, 1., a)), k);
      b = max(b, .5 * k);
    }
  }
  b = max(b, .03);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float dist = length(mv.xyz), want = uSize * (.7 + .6 * aR.y) * (kind > 3.5 ? 1.25 : kind > 1.5 ? 1.7 : 1.), sz = max(want, dist * uPx * 1.6);   // never under ~3 pixels, never a big disc
  float nf = (kind < .5 || kind > 3.5) ? smoothstep(2., 6., dist) : kind < 1.5 ? smoothstep(1.2, 3.4, dist) : smoothstep(1.6, 4.2, dist);
  mv.xy += position.xy * sz * vec2(1., uStreak);
  vQ = position.xy;
  vC = ((kind > 1.5 && kind < 2.5) ? uFem : uFly) * b * (.45 + .55 * aR.y) * (want * want) / (sz * sz) * nf * exp(-uFogK * uFogK * dist * dist) * colA * uDim;
  gl_Position = projectionMatrix * mv;
}`;
const FLY_FRAG = /* glsl */`
varying vec2 vQ; varying vec3 vC;
void main(){ float r2 = dot(vQ, vQ); if (r2 > 1.) discard; float a = exp(-r2 * 18.) + .12 * exp(-r2 * 3.5) * (1. - r2); gl_FragColor = vec4(vC * a * 6.5, 1.); }`;

const WATER_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vWP;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const WATER_FRAG = /* glsl */`
varying vec2 vUv; varying vec3 vWP;
uniform float uTime, uAmb, uWaveK, uFogK, uR1, uR2, uGlowK; uniform vec3 uWater, uFoam, uFogCol, uCam;
${FLASH_GLSL}
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main(){
  float l = vUv.x, s = vUv.y, edge = smoothstep(.72, 1., abs(l));
  float n = vn(vec2(l * 3.1, mod(s, 64.) * .8 - uTime * .45)) + .5 * vn(vec2(l * 7., mod(s, 64.) * 2.1 - uTime * .9));
  float sm = mod(s, 64.), rip = .3 * pow(abs(sin(sm * 3.1 + l * 2. + n * 5.2 - uTime * 1.1)), 4.) * smoothstep(.2, .9, n);                 // slow ripples across the flow break the reflections into streaks
  float riff = exp(-pow((s - uR1) / 3.5, 2.)) + exp(-pow((s - uR2) / 4.5, 2.));
  float sl = mod(s, 64.), foam = .45 * riff * smoothstep(.3, 1., vn(vec2(l * 2.6, sl * .7 - uTime * 1.2)) * .75 + .35 * vn(vec2(l * 5.5, sl * 1.6 - uTime * 1.9))) * (1. - edge);
  float wl = maleSync(vWP);
  vec3 col = vec3(.5, .8, .28) * fieldGlow(vWP) * uGlowK * .35 * (.6 + rip) + uWater * (.8 + .7 * rip) * (1. + 2.4 * uWaveK * wl) + uFoam * foam * (uAmb * 2.2 + uWaveK * 1.6 * wl);
  float a = clamp(mix(.34, .75, edge) + .15 * rip + .5 * foam, 0., .95);
  float d = length(vWP - uCam), f = 1. - exp(-uFogK * uFogK * d * d);
  gl_FragColor = vec4(mix(col, uFogCol, f), mix(a, 1., f));
}`;

export default {
  id: 'firefly-synchrony',
  name: 'The Night the Fireflies Agree',
  category: 'wilderness',
  weirdness: 0.7,
  media: ['forest', 'water'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    const C = (h) => new THREE.Color(h);

    // ---------------- the route, laid out by distance ----------------
    const S0 = -80, S1 = LH + 520, DS = 0.5, NR = Math.round((S1 - S0) / DS);
    const RX = new Float32Array(NR + 1), RZ = new Float32Array(NR + 1), RHd = new Float32Array(NR + 1);
    { let x = 0, z = -S0; for (let i = 0; i <= NR; i++) { const s = S0 + i * DS, h = HEAD(s); RX[i] = x; RZ[i] = z; RHd[i] = h; const hm = HEAD(s + DS / 2); x += Math.sin(hm) * DS; z -= Math.cos(hm) * DS; } }
    const at = (s) => { const f = clamp((s - S0) / DS, 0, NR - 1e-4), i = Math.floor(f), k = f - i; return { x: RX[i] + (RX[i + 1] - RX[i]) * k, z: RZ[i] + (RZ[i + 1] - RZ[i]) * k, h: RHd[i] + (RHd[i + 1] - RHd[i]) * k }; };
    // a point s metres along the route, lat metres to its right
    const along = (s, lat, out = [0, 0]) => { const a = at(s); out[0] = a.x + Math.cos(a.h) * lat; out[1] = a.z + Math.sin(a.h) * lat; return out; };
    const camPts = []; for (let s = 0; s <= LH + 1e-6; s += 2) { const a = at(s); camPts.push([a.x, EYE(s), a.z]); }
    const path = makePath(camPts); const PL = path.length;
    const END = at(LH), DIRE = [Math.sin(END.h), -Math.cos(END.h)], PORTAL = new THREE.Vector3(END.x, 3, END.z);
    const COL = new THREE.Vector3(END.x + DIRE[0] * 2, 0.2, END.z + DIRE[1] * 2);   // the column's axis, just behind the ring, so it wraps it

    // ---------------- wall time at each point of the flight (the engine's own speed rule, with its slow hold at the last portal) ----------------
    const paceN = (() => { const N = 64, p = []; let inv = 0; for (let i = 0; i <= N; i++) p.push(clamp(PACE(i / N), 0.35, 2.5)); for (let i = 0; i < N; i++) inv += 2 / (p[i] + p[i + 1]); const k = inv / N;
      return (u) => { const x = clamp(u, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return (p[i] + (p[i + 1] - p[i]) * (x - i)) * k; }; })();
    const TU = [0], TT = [0];
    { let d = 0, v = (PL / DUR) * paceN(0), t = 0; const dt = 1 / 120;
      while (t < 120 && d < PL - 1.02) { const tg = (PL / DUR) * paceN(d / PL); v += (tg - v) * (1 - Math.exp(-dt * 1.4)); d += v * dt; t += dt; if (t - TT[TT.length - 1] > 0.05) { TU.push(d / PL); TT.push(t); } } }
    const Tof = (u) => { if (u <= 0) return 0; let lo = 0, hi = TU.length - 1; if (u >= TU[hi]) return TT[hi]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TU[m] <= u) lo = m; else hi = m; } return TT[lo] + (TT[hi] - TT[lo]) * (u - TU[lo]) / Math.max(1e-9, TU[hi] - TU[lo]); };
    const uOf = (T) => { let lo = 0, hi = TT.length - 1; if (T >= TT[hi]) return TU[hi]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TT[m] <= T) lo = m; else hi = m; } return TU[lo] + (TU[hi] - TU[lo]) * (T - TT[lo]) / Math.max(1e-9, TT[hi] - TT[lo]); };
    const sOfT = (T) => uOf(T) * PL;   // close enough to the ground distance (the climb adds under a metre)

    // ---------------- the creek's line, and a distance field to the route and to the creek ----------------
    const CS = [], CX = [], CZ = []; for (let s = S0; s <= S1; s += 2) { const p = along(s, OFF(s)); CS.push(s); CX.push(p[0]); CZ.push(p[1]); }
    const PS = [], PX = [], PZ = []; for (let s = -20; s <= LH + 40; s += 2) { const a = at(s); PS.push(s); PX.push(a.x); PZ.push(a.z); }
    const segDist = (X, Z, S, x, z) => {   // nearest distance to a polyline and the route distance there
      let best = 1e18, bs = 0;
      for (let i = 0; i < X.length - 1; i++) { const ax = X[i], az = Z[i], dx = X[i + 1] - ax, dz = Z[i + 1] - az, L2 = dx * dx + dz * dz; let k = ((x - ax) * dx + (z - az) * dz) / L2; k = k < 0 ? 0 : k > 1 ? 1 : k; const ex = ax + dx * k - x, ez = az + dz * k - z, d = ex * ex + ez * ez; if (d < best) { best = d; bs = S[i] + (S[i + 1] - S[i]) * k; } }
      return [Math.sqrt(best), bs];
    };
    let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; for (let i = 0; i < CX.length; i++) { bx0 = Math.min(bx0, CX[i]); bx1 = Math.max(bx1, CX[i]); bz0 = Math.min(bz0, CZ[i]); bz1 = Math.max(bz1, CZ[i]); }
    bx0 -= 230; bx1 += 230; bz0 -= 120; bz1 += 150;
    const GC = 3, GNX = Math.ceil((bx1 - bx0) / GC) + 1, GNZ = Math.ceil((bz1 - bz0) / GC) + 1;
    const gDP = new Float32Array(GNX * GNZ), gSP = new Float32Array(GNX * GNZ), gDC = new Float32Array(GNX * GNZ), gSC = new Float32Array(GNX * GNZ);
    for (let j = 0; j < GNZ; j++) {
      for (let i = 0; i < GNX; i++) { const x = bx0 + i * GC, z = bz0 + j * GC, k = j * GNX + i; const a = segDist(PX, PZ, PS, x, z), b = segDist(CX, CZ, CS, x, z); gDP[k] = a[0]; gSP[k] = a[1]; gDC[k] = b[0]; gSC[k] = b[1]; }
      if ((j & 15) === 15) await tick();
    }
    const Q = { dP: 0, sP: 0, dC: 0, sC: 0 };
    const gq = (x, z) => {
      const fx_ = clamp((x - bx0) / GC, 0, GNX - 1.001), fz = clamp((z - bz0) / GC, 0, GNZ - 1.001), i = Math.floor(fx_), j = Math.floor(fz), a = fx_ - i, b = fz - j;
      const k00 = j * GNX + i, k10 = k00 + 1, k01 = k00 + GNX, k11 = k01 + 1, w00 = (1 - a) * (1 - b), w10 = a * (1 - b), w01 = (1 - a) * b, w11 = a * b;
      Q.dP = gDP[k00] * w00 + gDP[k10] * w10 + gDP[k01] * w01 + gDP[k11] * w11; Q.dC = gDC[k00] * w00 + gDC[k10] * w10 + gDC[k01] * w01 + gDC[k11] * w11;
      const pick = w00 >= w10 && w00 >= w01 && w00 >= w11 ? k00 : w10 >= w01 && w10 >= w11 ? k10 : w01 >= w11 ? k01 : k11;
      Q.sP = gSP[pick]; Q.sC = gSC[pick]; return Q;
    };
    // ground height: a gentle forest floor, a flat strip under the boardwalk, the creek channel cut below the water line, valley walls
    const H = (x, z) => {
      const q = gq(x, z);
      let h = 1.3 * (fbm(x * 0.018, z * 0.018, 4) - 0.5) + 0.4 * (fbm(x * 0.09 + 7, z * 0.09, 3) - 0.5);
      h += 0.05 * Math.pow(Math.max(0, q.dC - 30), 1.3);
      h = lerp(h * 0.15 - 0.03, h, ss(2.5, 11, q.dP));
      const cw = CW(q.sC); return lerp(-1.25, h, ss(cw - 0.8, cw + 2.4, q.dC));
    };
    await tick();

    // ---------------- sky, fog ----------------
    const sky = await skyFor(ctx, scene, { preset: 'night', stars: 0.35, sky: { zenith: '#0a1832', mid: '#1a3252', horizon: '#36587c', milkyWay: 0.22, ground: '#06101a', horizonPow: 2.2, clouds: { coverage: 0.08, lit: '#24384e', shade: '#060c18', silver: 0 } } });
    const FOGC = C('#1c3452'); scene.fog = new THREE.FogExp2(FOGC, 0.0125); scene.background = C('#06101a');
    await tick();

    // ---------------- shared uniforms: the wave of light through the whole scene ----------------
    const s60 = at(60), WD = new THREE.Vector2(-Math.cos(s60.h), -Math.sin(s60.h)), WO = new THREE.Vector2(s60.x + Math.cos(s60.h) * 55, s60.z + Math.sin(s60.h) * 55);
    const FU = { uT: { value: 0 }, uWO: { value: WO }, uWD: { value: WD }, uAmb: { value: 0.34 }, uWaveK: { value: 0.3 }, uWL: { value: WL }, uLM: { value: null }, uLMB: { value: new THREE.Vector4() }, uFieldLvl: { value: 0.45 }, uFemLvl: { value: 0 }, uGlowK: { value: 0.8 } };
    const maleSyncJS = (x, z, T) => { const d = (x - WO.x) * WD.x + (z - WO.y) * WD.y; let b = pulseN((T - 6.5 - d / 80) / 0.68, 6); b = Math.max(b, pulseN((T - 13.2 - d / 160) / 0.72, 7)); const e = T - 20.5 - d / 160; if (e > 0) b = Math.max(b, pulseN((e % 7) / 0.72, 6)); return b; };
    // MeshBasicMaterial lit by the night (uAmb) and by the passing wave of flashes; optionally cut away under the water line
    const litMat = (opts, lightK = 1, cut = false, atlas = false, deck = false) => {
      const m = new THREE.MeshBasicMaterial(opts);
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, FU); sh.uniforms.uLK = { value: lightK };
        if (atlas) sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          #if defined(USE_INSTANCING) && defined(USE_MAP)
          { float hq = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453); vMapUv.y = (.03 + .94 * clamp(vMapUv.y, 0., 1.) + floor(hq * 4.)) * .25; if (fract(hq * 7.31) > .5) vMapUv.x = 1. - vMapUv.x; }
          #endif`);
        sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vec4 wq = vec4(transformed, 1.);
          #ifdef USE_INSTANCING
          wq = instanceMatrix * wq;
          #endif
          vWP = (modelMatrix * wq).xyz;`);
        sh.fragmentShader = 'varying vec3 vWP; uniform float uLK, uAmb, uWaveK, uWL, uGlowK;\nfloat dh21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\nfloat dvn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(dh21(i), dh21(i + vec2(1, 0)), f.x), mix(dh21(i + vec2(0, 1)), dh21(i + vec2(1, 1)), f.x), f.y); }\n' + FLASH_GLSL + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          ${cut ? 'if (vWP.y < uWL) discard;' : ''}
          diffuseColor.rgb *= uLK * (uAmb + uWaveK * (.5 * burstEnv(vWP) + .5 * sqrt(maleSync(vWP))) * vec3(.86, 1., .58) + uGlowK * fieldGlow(vWP) * vec3(.78, 1., .42));
          ${deck ? '{ float pn = dvn(vWP.xz * 1.2 + vec2(uT * .11, uT * .07)) * .6 + dvn(vWP.xz * .5 - uT * .05) * .4; diffuseColor.rgb *= .85 + .8 * smoothstep(.35, .85, pn); diffuseColor.rgb += vec3(.025, .06, .02) * smoothstep(.55, .95, dvn(vec2(dot(vWP.xz, vec2(.8, .6)) * .5, dot(vWP.xz, vec2(-.6, .8)) * 4.))) * (.5 + fieldGlow(vWP)); }' : ''}`);
      };
      m.customProgramCacheKey = () => 'ffsync-lit' + (cut ? '-cut' : '') + (atlas ? '-atlas' : '') + (deck ? '-deck' : '');
      return own(m);
    };
    const tex = (cv, rx = 1, ry = 1) => { const t = own(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t; };
    const base = new THREE.Group(), mirror = new THREE.Group(); mirror.scale.y = -1; mirror.position.y = 2 * WL; scene.add(base, mirror);
    // an instanced mesh, optionally drawn again in the mirror with the same instances
    const inst = (geo, mat, n, mirrored = false) => {
      const a = new THREE.InstancedMesh(geo, mat, n); a.frustumCulled = false; base.add(a);
      if (mirrored) { const b = new THREE.InstancedMesh(geo, mat, n); b.instanceMatrix = a.instanceMatrix; b.frustumCulled = false; a.userData.twin = b; mirror.add(b); }
      return a;
    };
    const finish = (a, n) => { a.count = n; a.instanceMatrix.needsUpdate = true; if (a.instanceColor) a.instanceColor.needsUpdate = true; const b = a.userData.twin; if (b) { b.count = n; b.instanceColor = a.instanceColor; } };
    const put = (a, i, x, y, z, rx, ry, rz, sx, sy, sz, col) => { _p.set(x, y, z); _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')); _s.set(sx, sy, sz); a.setMatrixAt(i, _m.compose(_p, _q, _s)); if (col) a.setColorAt(i, col); };
    const hn3 = (x, y, z) => Math.sin(x * 1.7 + y * 2.3) * Math.sin(y * 1.9 + z * 1.3) * Math.sin(z * 2.1 + x * 1.1);
    // a rounded lump (boulder, hummock, crown, shrub) with soft noise and colour from its up-facing side
    const lump = (detail, amp, top, side) => {
      const g = new THREE.IcosahedronGeometry(1, detail), P = g.attributes.position, cl = new Float32Array(P.count * 3), ct = C(top), cs = C(side), cc = new THREE.Color();
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = 1 + amp * hn3(x * 2.1, y * 2.1, z * 2.1) + amp * 0.5 * hn3(x * 5.3 + 3, y * 5.3, z * 5.3); P.setXYZ(i, x * k, y * k, z * k); cc.copy(cs).lerp(ct, ss(-0.1, 0.6, y)); cl.set([cc.r, cc.g, cc.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.computeVertexNormals(); return own(g);
    };

    // ---------------- textures ----------------
    // forest floor: leaf litter of tulip poplar and hemlock, moss
    const groundC = mkCanvas(512); { const g = groundC.getContext('2d'); g.fillStyle = '#3e3628'; g.fillRect(0, 0, 512, 512);
      const leafCols = ['#6a5232', '#7a6238', '#5a4a30', '#8a6e3c', '#4a3e2c', '#6e5a3a', '#76683e'];
      for (let i = 0; i < 1900; i++) { const x = R.range(0, 512), y = R.range(0, 512), a = R.range(0, TAU), L = R.range(5, 14); for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { if (x + ox < -20 || x + ox > 532 || y + oy < -20 || y + oy > 532) continue; g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.fillStyle = leafCols[i % leafCols.length]; g.globalAlpha = R.range(0.6, 1); g.beginPath(); g.ellipse(0, 0, L, L * R.range(0.4, 0.7), 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,16,10,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke(); g.restore(); } }
      g.globalAlpha = 1; for (let i = 0; i < 700; i++) { g.strokeStyle = `rgba(${R.int(30, 60)},${R.int(28, 46)},${R.int(18, 30)},0.8)`; g.lineWidth = R.range(0.8, 1.6); const x = R.range(0, 512), y = R.range(0, 512), a = R.range(0, TAU), L = R.range(5, 12); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
      for (let i = 0; i < 70; i++) { const x = R.range(30, 482), y = R.range(30, 482), r = R.range(12, 40); const rg = g.createRadialGradient(x, y, 1, x, y, r); rg.addColorStop(0, 'rgba(70,110,50,0.75)'); rg.addColorStop(1, 'rgba(60,96,44,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
      for (let i = 0; i < 160; i++) { g.strokeStyle = 'rgba(30,22,14,0.8)'; g.lineWidth = R.range(1.5, 3); const x = R.range(0, 512), y = R.range(0, 512), a = R.range(0, TAU), L = R.range(14, 40); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * L * 0.5, y + Math.sin(a + 0.4) * L * 0.5, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } }
    const groundT = tex(groundC);
    // weathered planks: grain, knots, nail pairs over the stringers, a wet sheen down the middle, moss and lichen creeping in from the edges
    // weathered planks, four different boards in one atlas (each plank picks one): grain, a rare soft knot, nail pairs over the
    // stringers, a wet sheen down the middle, moss and lichen creeping in irregularly from the ends and edges
    const plankC = mkCanvas(512); { const g = plankC.getContext('2d');
      for (let row = 0; row < 4; row++) { const y0 = row * 128; g.save(); g.beginPath(); g.rect(0, y0, 512, 128); g.clip(); g.fillStyle = ['#9a9080', '#948a7a', '#a09484', '#8e8676'][row]; g.fillRect(0, y0, 512, 128);
        for (let i = 0; i < 150; i++) { const y = y0 + R.range(0, 128), v = R.int(95, 170); g.strokeStyle = `rgba(${v},${v - 8},${v - 20},${R.range(0.2, 0.5)})`; g.lineWidth = R.range(0.5, 2); g.beginPath(); g.moveTo(0, y); const ph = R.range(0, 9), amp = R.range(0.3, 2.5); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x * 0.015 + ph) * amp); g.stroke(); }
        for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,36,30,${R.range(0.2, 0.45)})`; g.lineWidth = R.range(0.5, 1.1); const y = y0 + R.range(4, 124), x = R.range(0, 480); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R.range(20, 140), y + R.range(-1.5, 1.5)); g.stroke(); }
        if (row % 2 === 0) { const x = R.range(120, 400), y = y0 + R.range(35, 95), r = R.range(4, 7); g.fillStyle = 'rgba(70,56,40,0.55)'; g.beginPath(); g.ellipse(x, y, r * 2.4, r, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(70,56,40,0.25)'; g.lineWidth = 1; for (let k = 1; k < 3; k++) { g.beginPath(); g.ellipse(x, y, r * 2.4 + k * 7, r + k * 2.2, 0, 0, TAU); g.stroke(); } }
        for (const u of [0.158, 0.842]) for (const v of [0.3, 0.7]) { const nx = u * 512 + R.range(-3, 3), ny = y0 + v * 128 + R.range(-4, 4); g.fillStyle = 'rgba(105,68,40,0.35)'; g.beginPath(); g.ellipse(nx + 3, ny + 2, 7, 3, 0.2, 0, TAU); g.fill(); g.fillStyle = 'rgba(28,24,20,0.85)'; g.beginPath(); g.arc(nx, ny, 2.2, 0, TAU); g.fill(); }
        const wet = g.createLinearGradient(0, 0, 512, 0); wet.addColorStop(0.25, 'rgba(190,205,215,0)'); wet.addColorStop(0.5, 'rgba(190,208,218,0.2)'); wet.addColorStop(0.75, 'rgba(190,205,215,0)'); g.fillStyle = wet; g.fillRect(0, y0, 512, 128);
        for (let i = 0; i < 55; i++) { const end = R() < 0.5, x = end ? R.range(0, 50) * (R() < 0.5 ? 1 : 0) + (R() < 0.5 ? 0 : 462) : R.range(0, 512), y = end ? y0 + R.range(0, 128) : y0 + (R() < 0.5 ? R.range(0, 10) : R.range(118, 128)); const r = R.range(2, 7) * (end ? 1.2 : 0.8);
          g.fillStyle = R() < 0.7 ? `rgba(${R.int(55, 85)},${R.int(90, 120)},${R.int(45, 65)},${R.range(0.25, 0.6)})` : `rgba(165,175,145,${R.range(0.25, 0.5)})`; g.beginPath(); g.ellipse(x, y, r * R.range(0.8, 1.8), r, R.range(0, 3), 0, TAU); g.fill(); }
        g.restore(); } }
    const plankT = tex(plankC);
    // posts and rails: vertical grain with lichen rosettes
    const postC = mkCanvas(128); { const g = postC.getContext('2d'); g.fillStyle = '#8a8070'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 70; i++) { const x = R.range(0, 128), v = R.int(80, 150); g.strokeStyle = `rgba(${v},${v - 6},${v - 18},0.5)`; g.lineWidth = R.range(0.6, 2); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + R.range(-3, 3), 128); g.stroke(); }
      for (let i = 0; i < 26; i++) { const x = R.range(0, 128), y = R.range(0, 128), r = R.range(3, 9); g.fillStyle = `rgba(${R.int(150, 190)},${R.int(175, 200)},${R.int(130, 160)},${R.range(0.45, 0.8)})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,140,100,0.5)'; g.beginPath(); g.arc(x, y, r * 0.5, 0, TAU); g.fill(); } }
    const postT = tex(postC);
    const railC = mkCanvas(128); { const g = railC.getContext('2d'); g.fillStyle = '#8a8070'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 80; i++) { const y = R.range(0, 128), v = R.int(80, 150); g.strokeStyle = `rgba(${v},${v - 6},${v - 18},0.5)`; g.lineWidth = R.range(0.6, 2.2); g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + R.range(-1, 1)); g.stroke(); } }
    const railMat = litMat({ map: tex(railC), color: '#b0a690' }, 0.95);
    // bark: deep furrows (tulip poplar) that the hemlocks take on darker and redder through their instance colour; moss comes from the geometry
    const barkC = document.createElement('canvas'); barkC.width = 256; barkC.height = 512; { const g = barkC.getContext('2d'); g.fillStyle = '#8c8c86'; g.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 46; i++) { let x = R.range(0, 256); g.strokeStyle = `rgba(${R.int(25, 50)},${R.int(25, 45)},${R.int(22, 40)},${R.range(0.55, 0.9)})`; g.lineWidth = R.range(2, 6); g.beginPath(); g.moveTo(x, -10); for (let y = 0; y <= 520; y += 26) { x += R.range(-5, 5); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 160; i++) { const v = R.int(150, 200); g.fillStyle = `rgba(${v},${v},${v - 6},${R.range(0.18, 0.4)})`; g.fillRect(R.range(0, 256), R.range(0, 512), R.range(2, 5), R.range(14, 60)); }
      for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${R.int(150, 180)},${R.int(180, 205)},${R.int(140, 160)},${R.range(0.2, 0.45)})`; g.beginPath(); g.ellipse(R.range(0, 256), R.range(0, 512), R.range(5, 16), R.range(4, 10), 0, 0, TAU); g.fill(); } }
    const barkT = tex(barkC);
    // fieldstone: grey with lichen
    const stoneC = mkCanvas(128); { const g = stoneC.getContext('2d'); g.fillStyle = '#7a766e'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 400; i++) { const v = R.int(70, 160); g.fillStyle = `rgba(${v},${v - 4},${v - 10},0.35)`; g.fillRect(R.range(0, 128), R.range(0, 128), R.range(1, 4), R.range(1, 4)); }
      for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${R.int(140, 180)},${R.int(165, 195)},${R.int(120, 150)},${R.range(0.3, 0.6)})`; g.beginPath(); g.arc(R.range(0, 128), R.range(0, 128), R.range(3, 10), 0, TAU); g.fill(); } }
    const stoneT = tex(stoneC);
    // a tulip poplar leaf (truncated tip, four lobes) for the leaves on the boards
    const leafC = mkCanvas(128); { const g = leafC.getContext('2d'); g.translate(64, 70); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 50); g.bezierCurveTo(-30, 40, -52, 18, -48, -10); g.lineTo(-30, -14); g.bezierCurveTo(-36, -30, -30, -44, -16, -50); g.lineTo(-6, -40); g.lineTo(6, -40); g.lineTo(16, -50); g.bezierCurveTo(30, -44, 36, -30, 30, -14); g.lineTo(48, -10); g.bezierCurveTo(52, 18, 30, 40, 0, 50); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 58); g.lineTo(0, -38); g.moveTo(0, 10); g.lineTo(-34, -8); g.moveTo(0, 10); g.lineTo(34, -8); g.moveTo(0, -12); g.lineTo(-18, -38); g.moveTo(0, -12); g.lineTo(18, -38); g.stroke(); }
    const leafT = tex(leafC);
    // hemlock bough: flat sprays of short needles
    const boughC = document.createElement('canvas'); boughC.width = 256; boughC.height = 128; { const g = boughC.getContext('2d');
      const spray = (x0, y0, a, Ls, w) => { const ex = x0 + Math.cos(a) * Ls, ey = y0 + Math.sin(a) * Ls, nx = -Math.sin(a), ny = Math.cos(a);
        g.fillStyle = `rgb(${R.int(38, 52)},${R.int(62, 78)},${R.int(48, 58)})`; g.beginPath(); g.moveTo(x0 + nx * w * 0.5, y0 + ny * w * 0.5); g.quadraticCurveTo(x0 + Math.cos(a) * Ls * 0.5 + nx * w, y0 + Math.sin(a) * Ls * 0.5 + ny * w, ex, ey); g.quadraticCurveTo(x0 + Math.cos(a) * Ls * 0.5 - nx * w, y0 + Math.sin(a) * Ls * 0.5 - ny * w, x0 - nx * w * 0.5, y0 - ny * w * 0.5); g.fill();
        for (let k = 0; k < Ls; k += 2) { const x = x0 + Math.cos(a) * k, y = y0 + Math.sin(a) * k, n = w * 1.15 * (1 - k / Ls * 0.6); g.strokeStyle = `rgba(${R.int(60, 92)},${R.int(100, 130)},${R.int(72, 92)},0.9)`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + 1.3) * n, y + Math.sin(a + 1.3) * n); g.moveTo(x, y); g.lineTo(x + Math.cos(a - 1.3) * n, y + Math.sin(a - 1.3) * n); g.stroke(); } };
      spray(2, 64, 0, 250, 16); for (let i = 0; i < 18; i++) { const x = 14 + i * 12.5, side = i % 2 ? 1 : -1; spray(x, 64 + side * 3, side * R.range(0.45, 0.85), R.range(34, 62) * (1 - i / 24), 11); } }
    const boughT = tex(boughC); boughT.wrapS = boughT.wrapT = THREE.ClampToEdgeWrapping;
    // roof boards of the collapsed porch
    const roofC = mkCanvas(128); { const g = roofC.getContext('2d'); g.fillStyle = '#4a4238'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 10) { g.fillStyle = `rgba(${R.int(40, 90)},${R.int(36, 80)},${R.int(30, 64)},0.9)`; g.fillRect(0, y, 128, 9); g.fillStyle = 'rgba(10,8,6,0.7)'; g.fillRect(0, y + 9, 128, 1); for (let x = R.range(0, 20); x < 128; x += R.range(12, 30)) g.fillRect(x, y, 1, 9); } for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(70,110,60,${R.range(0.3, 0.7)})`; g.beginPath(); g.arc(R.range(0, 128), R.range(0, 128), R.range(3, 10), 0, TAU); g.fill(); } }
    const roofT = tex(roofC, 2, 2);
    const soft = mkCanvas(64); { const g = soft.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const softT = tex(soft);
    await tick();

    // ---------------- materials ----------------
    const groundMat = litMat({ map: groundT, vertexColors: true }, 1.9, true);
    const plankMat = litMat({ map: plankT, color: '#ffffff' }, 0.8, false, true, true), postMat = litMat({ map: postT, color: '#b0a690' }, 0.95);
    const barkMat = litMat({ map: barkT, vertexColors: true }, 2.6), stoneMat = litMat({ map: stoneT, color: '#ffffff' }, 1.8);
    const fernMat = litMat({ vertexColors: true, side: THREE.DoubleSide }, 2.4), lumpMat = litMat({ vertexColors: true }, 2.0), mossMat = litMat({ vertexColors: true }, 0.9);
    const leafMat = litMat({ map: leafT, alphaTest: 0.5, side: THREE.DoubleSide }, 1.3), boughMat = litMat({ map: boughT, alphaTest: 0.35, side: THREE.DoubleSide, color: '#ffffff' }, 1.9);
    const roofMat = litMat({ map: roofT, side: THREE.DoubleSide, color: '#ffffff' }, 1.1), darkMat = litMat({ color: '#1a1612' }, 1);

    // ---------------- 1. the ground ----------------
    {
      const W = bx1 - bx0, D = bz1 - bz0, nx = Math.round(W / 2.6), nz = Math.round(D / 2.6);
      const g = own(new THREE.PlaneGeometry(W, D, nx, nz).rotateX(-PI / 2)); g.translate((bx0 + bx1) / 2, 0, (bz0 + bz1) / 2);
      const P = g.attributes.position, UV = g.attributes.uv, cl = new Float32Array(P.count * 3), mud = C('#4a4030'), moss = C('#6a8a5a'), wh = C('#ffffff'), cc = new THREE.Color();
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), z = P.getZ(i), y = H(x, z); P.setY(i, y); UV.setXY(i, x / 3.2, z / 3.2);
        const q = gq(x, z), cw = CW(q.sC); cc.copy(mud).lerp(wh, ss(cw - 0.2, cw + 3.5, q.dC)); cc.lerp(moss, 0.35 * ss(0.2, 0.8, fbm(x * 0.05, z * 0.05, 3)) * ss(cw + 1, cw + 6, q.dC)); cc.multiplyScalar(0.85 + 0.3 * fbm(x * 0.2, z * 0.2, 2));
        cl.set([cc.r, cc.g, cc.b], i * 3);
        if ((i & 4095) === 4095) await tick();
      }
      g.setAttribute('color', new THREE.BufferAttribute(cl, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; base.add(m);
    }
    await tick();

    // ---------------- 2. the boardwalk, the whole length ----------------
    let plankN = 0; const planksList = []; for (let s = BW0; s < BW1;) { const w = R.range(0.22, 0.34), gap = R.range(0.014, 0.028); planksList.push([s + w / 2, w]); s += w + gap; }
    const planks = inst(own(new THREE.BoxGeometry(1, 1, 1)), plankMat, planksList.length + 80);
    const plankTints = ['#ffffff', '#f4efe6', '#fff6e8', '#e8e6e0', '#f8f0dc', '#ece4d4'];
    for (const [s, w] of planksList) { const a = at(s); put(planks, plankN++, a.x, DECK + R.range(-0.008, 0.008), a.z, R.range(-0.006, 0.006), -a.h + R.range(-0.012, 0.012), R.range(-0.01, 0.01), 1.92 + R.range(-0.04, 0.04), 0.06, w, _c.set(plankTints[R.int(0, 5)]).multiplyScalar(R.range(0.82, 1.1))); }
    // posts, two rails each side, stringers and sleepers below, X bracing where it crosses the creek
    const posts = inst(own(new THREE.BoxGeometry(1, 1, 1)), postMat, 420), rails = inst(own(new THREE.BoxGeometry(1, 1, 1)), railMat, 820), under = inst(own(new THREE.BoxGeometry(1, 1, 1)), railMat, 1100);
    let postN = 0, railN = 0, underN = 0; const railTops = [];
    const postS = []; for (let s = BW0 + 0.3; s < BW1 - 0.2; s += 2.4 + R.range(-0.08, 0.08)) postS.push(s); postS.push(BW1 - 0.15);
    const beam = (mesh, ax, ay, az, bx, by, bz, w, h, col) => { const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); _p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); _q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx / L, dy / L, dz / L)); _s.set(w, h, L); mesh.setMatrixAt(mesh.userData.n, _m.compose(_p, _q, _s)); mesh.setColorAt(mesh.userData.n, col || _c.set('#ffffff')); mesh.userData.n++; };
    rails.userData.n = 0; under.userData.n = 0;
    const PB = [0, 0];
    for (let k = 0; k < postS.length; k++) {
      const s = postS[k], a = at(s), q = gq(a.x, a.z), overWater = q.dC < CW(q.sC) + 1.5;
      for (const sd of [-1, 1]) {
        along(s, sd * 0.98, PB); const gy = overWater ? -1.2 : Math.min(H(PB[0], PB[1]), DECK - 0.1), top = DECK + 0.9;
        put(posts, postN++, PB[0], (gy + top) / 2, PB[1], R.range(-0.015, 0.015), -a.h + R.range(-0.08, 0.08), R.range(-0.015, 0.015), 0.11, top - gy, 0.11, _c.set('#ffffff').multiplyScalar(R.range(0.75, 1.05)));
        if (k + 1 < postS.length) { const B = along(postS[k + 1], sd * 0.98, [0, 0]); for (const [yy, th] of [[DECK + 0.86, 0.075], [DECK + 0.46, 0.055]]) beam(rails, PB[0], yy, PB[1], B[0], yy + R.range(-0.01, 0.01), B[1], th * 1.2, th, _c.set('#ffffff').multiplyScalar(R.range(0.8, 1.05))); railTops.push([PB[0], PB[1], B[0], B[1]]); }
      }
      // sleeper under the post pair, and stringers to the next pair
      const L1 = along(s, -0.98, [0, 0]), R1 = along(s, 0.98, [0, 0]); beam(under, L1[0], DECK - 0.26, L1[1], R1[0], DECK - 0.26, R1[1], 0.14, 0.12, _c.set('#8a8070'));
      if (k + 1 < postS.length) for (const sd of [-0.62, 0.62]) { const A = along(s, sd, [0, 0]), B = along(postS[k + 1], sd, [0, 0]); beam(under, A[0], DECK - 0.12, A[1], B[0], DECK - 0.12, B[1], 0.09, 0.16, _c.set('#7e7464')); }
      if (overWater) { beam(under, L1[0], DECK - 0.3, L1[1], R1[0], -1.1, R1[1], 0.08, 0.08, _c.set('#6e6656')); beam(under, R1[0], DECK - 0.3, R1[1], L1[0], -1.1, L1[1], 0.08, 0.08, _c.set('#6e6656')); }
    }
    finish(planks, plankN); finish(posts, postN); finish(rails, rails.userData.n); finish(under, under.userData.n);
    // leaves and hemlock needles on the boards
    {
      const NL = 300, leaves = inst(own(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2)), leafMat, NL), lc = ['#7a6038', '#6a5232', '#86683a', '#5a4a30', '#74603a', '#604a2a'];
      for (let i = 0; i < NL; i++) { const s = R.range(BW0, BW1), lat = R.range(-0.88, 0.88) * (R() < 0.6 ? 1 : 0.6), p = along(s, lat), sc = R.range(0.05, 0.1); put(leaves, i, p[0], DECK + 0.034 + R.range(0, 0.004), p[1], R.range(-0.12, 0.12), R.range(0, TAU), R.range(-0.12, 0.12), sc, 1, sc * R.range(0.9, 1.15), _c.set(lc[R.int(0, 5)]).multiplyScalar(R.range(0.7, 1.1))); }
      finish(leaves, NL);
      const NN = 320, needles = inst(own(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2)), litMat({ color: '#ffffff' }, 1.1), NN);
      for (let i = 0; i < NN; i++) { const s = R.range(BW0, BW1), p = along(s, R.range(-0.92, 0.92)); put(needles, i, p[0], DECK + 0.033, p[1], 0, R.range(0, TAU), 0, 0.006, 1, R.range(0.018, 0.034), _c.set(R() < 0.5 ? '#5a4a30' : '#3a4a32')); }
      finish(needles, NN);
    }
    await tick();

    // ---------------- 3. the understorey: ferns (real fronds), moss hummocks, mossy logs with shelf fungi and faint foxfire ----------------
    const frondInto = (Pp, Cc, rng, ox, oz, yaw, len, lift, droop, cb, ct, nPair) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), pt = (f, u, side) => [ox + sy * f + cy * side, u, oz - cy * f + sy * side];   // f along the frond, side across it
      const rach = (t) => [len * 0.92 * t, len * (lift * t - droop * t * t)];
      for (let i = 1; i <= nPair; i++) {
        const t = i / (nPair + 1), [f, u] = rach(t), [f2, u2] = rach(Math.min(1, t + 0.05)), Lf = len * 0.2 * Math.pow(Math.sin(PI * Math.min(1, t * 1.12)), 0.8) * (1 - 0.3 * t), w = Lf * 0.24;
        const slope = Math.atan2(u2 - u, f2 - f), fd = Math.cos(slope), ud = Math.sin(slope);
        for (const side of [-1, 1]) {
          const v0 = pt(f, u, 0), v1 = pt(f + fd * w, u + ud * w + 0.01, side * Lf * 0.5), v2 = pt(f + fd * Lf * 0.3, u - Lf * 0.22, side * Lf), v3 = pt(f - fd * w * 0.3, u - ud * w * 0.3, side * Lf * 0.5);
          Pp.push(...v0, ...v1, ...v2, ...v0, ...v2, ...v3);
          const k = 0.75 + 0.5 * rng(), cA = cb.clone().lerp(ct, t * 0.7).multiplyScalar(k), cB = cb.clone().lerp(ct, Math.min(1, t * 0.7 + 0.35)).multiplyScalar(k);
          Cc.push(cA.r, cA.g, cA.b, cB.r, cB.g, cB.b, cB.r, cB.g, cB.b, cA.r, cA.g, cA.b, cB.r, cB.g, cB.b, cB.r, cB.g, cB.b);
        }
      }
      for (let i = 0; i < 8; i++) { const t0 = i / 8, t1 = (i + 1) / 8, [fa, ua] = rach(t0), [fb, ub] = rach(t1), r = 0.008 * (1 - t0 * 0.6) * len; const a0 = pt(fa, ua, -r), a1 = pt(fa, ua, r), b0 = pt(fb, ub, -r), b1 = pt(fb, ub, r); Pp.push(...a0, ...a1, ...b1, ...a0, ...b1, ...b0); for (let k = 0; k < 6; k++) Cc.push(cb.r * 0.7, cb.g * 0.7, cb.b * 0.7); }
    };
    const clumpGeo = (rng, n, kind) => {
      const Pp = [], Cc = [], cb = C(kind === 1 ? '#1e4a2e' : '#183c2c'), ct = C(kind === 2 ? '#4a8a4a' : '#3a7a52');
      for (let i = 0; i < n; i++) { const yaw = (i / n) * TAU + rng.range(-0.3, 0.3); frondInto(Pp, Cc, rng, Math.sin(yaw) * 0.06, -Math.cos(yaw) * 0.06, yaw, rng.range(0.75, 1.15), rng.range(0.75, 1.1), rng.range(0.55, 0.95), cb, ct, kind === 2 ? 13 : 16); }
      if (kind === 2) for (let k = 0; k < 2; k++) { const ox = rng.range(-0.08, 0.08), oz = rng.range(-0.08, 0.08), hh = rng.range(0.55, 0.75); for (let j = 0; j < 9; j++) { const y = hh * (0.45 + 0.55 * j / 9), r = 0.035 * (1 - j / 12); const pts = [[ox - r, y, oz], [ox + r, y, oz], [ox, y + 0.06, oz], [ox, y, oz - r], [ox, y, oz + r], [ox, y + 0.06, oz]]; for (const v of pts) Pp.push(...v); for (let q = 0; q < 6; q++) Cc.push(0.36, 0.2, 0.09); } }   // cinnamon fern's fertile spikes
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); return own(g);
    };
    const fernGeos = [clumpGeo(R.fork('f0'), 7, 0), clumpGeo(R.fork('f1'), 9, 1), clumpGeo(R.fork('f2'), 6, 2)];
    const okFloor = (x, z, minP, minC = 0.6) => { const q = gq(x, z); return q.dP >= minP && q.dC >= CW(q.sC) + minC; };
    const fernMeshes = fernGeos.map((g) => inst(g, fernMat, 200)), fernN = [0, 0, 0], fernTint = ['#ffffff', '#e8ffe8', '#d8f0d0', '#f0f8e0'];
    const fernAt = (x, z, sc) => { const v = R.int(0, 2); if (fernN[v] >= 200) return; put(fernMeshes[v], fernN[v]++, x, H(x, z) - 0.03, z, R.range(-0.08, 0.08), R.range(0, TAU), R.range(-0.08, 0.08), sc, sc * R.range(0.85, 1.15), sc, _c.set(fernTint[R.int(0, 3)]).multiplyScalar(R.range(0.75, 1.1))); };
    for (let i = 0, tries = 0; i < 330 && tries < 4000; tries++) { const s = R.range(-14, LH + 20), lat = R.sign() * (1.35 + Math.pow(R(), 1.3) * 12.5), p = along(s, lat); if (!okFloor(p[0], p[1], 1.3)) continue; fernAt(p[0], p[1], R.range(0.75, 1.35)); i++; }
    for (let i = 0, tries = 0; i < 260 && tries < 4000; tries++) { const s = R.range(-20, LH + 140), lat = R.sign() * R.range(14, 45), p = along(s, lat); if (!okFloor(p[0], p[1], 13)) continue; fernAt(p[0], p[1], R.range(0.9, 1.5)); i++; }
    fernMeshes.forEach((m, i) => finish(m, fernN[i]));
    // moss hummocks
    { const N = 120, hum = inst(lump(2, 0.34, '#22381c', '#1a241a'), mossMat, N); let n = 0;
      for (let tries = 0; n < N && tries < 3000; tries++) { const s = R.range(-14, LH + 60), lat = R.sign() * R.range(2.4, 22), p = along(s, lat); if (!okFloor(p[0], p[1], 2.4, 1)) continue; const r = R.range(0.35, 1.0); put(hum, n++, p[0], H(p[0], p[1]) - r * 0.25, p[1], 0, R.range(0, TAU), 0, r * R.range(1, 1.6), r * R.range(0.32, 0.5), r * R.range(1, 1.4), _c.set('#ffffff').multiplyScalar(R.range(0.75, 1.15))); }
      finish(hum, n); }
    // fallen logs (moss on top), shelf fungi on their flanks, foxfire on four of them
    const logSpots = [];
    { const g = own(new THREE.CylinderGeometry(1, 1, 1, 12, 6).rotateZ(PI / 2)), P = g.attributes.position, N = g.attributes.normal, cl = new Float32Array(P.count * 3), mossC = C('#5a8a48'), wh = C('#ffffff'), cc = new THREE.Color();
      for (let i = 0; i < P.count; i++) { const k = 1 + 0.06 * hn3(P.getX(i) * 9, P.getY(i) * 3, P.getZ(i) * 3); P.setY(i, P.getY(i) * k); P.setZ(i, P.getZ(i) * k); cc.copy(wh).lerp(mossC, ss(0.15, 0.7, N.getY(i))); cl.set([cc.r, cc.g, cc.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      const NLG = 16, logs = inst(g, barkMat, NLG), fungi = inst(own(new THREE.CircleGeometry(1, 10, 0, PI).rotateX(-PI / 2)), litMat({ color: '#c8b48e', side: THREE.DoubleSide }, 1.2), NLG * 7);
      let n = 0, fn = 0;
      for (let tries = 0; n < NLG && tries < 2000; tries++) {
        const s = R.range(-10, LH + 40), lat = R.sign() * R.range(8, 32), p = along(s, lat); if (!okFloor(p[0], p[1], 8, 1.5)) continue;
        const len = R.range(4, 9), r = R.range(0.28, 0.5), yaw = R.range(0, TAU), y = H(p[0], p[1]) + r * 0.65;
        const e1 = [p[0] + Math.cos(yaw) * len / 2, p[1] - Math.sin(yaw) * len / 2], e2 = [p[0] - Math.cos(yaw) * len / 2, p[1] + Math.sin(yaw) * len / 2]; if (!okFloor(e1[0], e1[1], 7, 1) || !okFloor(e2[0], e2[1], 7, 1)) continue;
        put(logs, n, p[0], y, p[1], 0, yaw, R.range(-0.04, 0.04), len, r, r, _c.set(R() < 0.5 ? '#6a6052' : '#5a5046').multiplyScalar(R.range(0.8, 1.1)));
        logSpots.push([p[0], y, p[1], yaw, len, r]); n++;
        for (let k = 0; k < R.int(3, 7); k++) { const t = R.range(-0.4, 0.4) * len, side = R.sign(), ax = Math.cos(yaw), az = -Math.sin(yaw), nx = -az * side, nz = ax * side, fy = y + R.range(-0.1, 0.25) * r, sc = R.range(0.08, 0.2);
          put(fungi, fn++, p[0] + ax * t + nx * r * 0.95, fy, p[1] + az * t + nz * r * 0.95, R.range(-0.1, 0.1), Math.atan2(nx, nz) + PI / 2 + PI / 2, 0, sc, sc, sc * 0.8, _c.set('#ffffff').multiplyScalar(R.range(0.6, 1))); }
      }
      finish(logs, n); finish(fungi, fn);
    }
    // foxfire: a faint cold green on the rotting ends of four logs
    const foxfire = new THREE.InstancedMesh(own(new THREE.PlaneGeometry(1, 1)), own(new THREE.MeshBasicMaterial({ map: softT, color: '#3a8a6a', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })), 48); foxfire.frustumCulled = false; foxfire.renderOrder = 3;
    { let n = 0; for (let k = 0; k < Math.min(4, logSpots.length); k++) { const [x, y, z, yaw, len, r] = logSpots[k * 3 % logSpots.length]; for (let j = 0; j < 12; j++) { const t = R.range(-0.5, 0.5) * len, a = R.range(-1.2, 1.2), ax = Math.cos(yaw), az = -Math.sin(yaw); put(foxfire, n++, x + ax * t - az * Math.sin(a) * r, y + Math.cos(a) * r * 0.9, z + az * t + ax * Math.sin(a) * r, -PI / 2 + R.range(-0.4, 0.4), R.range(0, TAU), 0, R.range(0.25, 0.6), R.range(0.12, 0.3), 1); } } foxfire.count = n; base.add(foxfire); }
    await tick();

    // ---------------- 4. trunks (tulip poplar, eastern hemlock), hemlock boughs, crowns, rhododendron thickets ----------------
    const trunkGeo = (() => {
      const seg = 11, rows = [0, 0.008, 0.02, 0.04, 0.07, 0.12, 0.2, 0.32, 0.48, 0.66, 0.84, 1], P = [], UV = [], CL = [], I = [], moss = C('#4a7a42');
      for (let j = 0; j < rows.length; j++) { const y = rows[j]; for (let i = 0; i <= seg; i++) { const a = (i / seg) * TAU, fl = 1 + 0.9 * Math.exp(-y * 55) * (1 + 0.45 * Math.sin(a * 5 + 1.3)), r = fl * (1 - 0.38 * y) * (1 + 0.04 * Math.sin(a * 7 + y * 20)), x = Math.cos(a) * r, z = Math.sin(a) * r; P.push(x, y, z); UV.push((i / seg) * 2, y * 7); const mk = ss(0.1, 0.8, Math.cos(a)) * (1 - ss(0.02, 0.3, y)) * 0.8; const c = C('#ffffff').lerp(moss, mk); CL.push(c.r, c.g, c.b); } }
      for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3)); g.setIndex(I); g.computeVertexNormals(); return own(g);
    })();
    const NT = 700, trunks = inst(trunkGeo, barkMat, NT, true); let tn = 0; const hemlocks = [], blockers = [], tops = [];
    const SNAG = along(128, -14), CHIM = along(46, -22), CHIM2 = along(14, -66), PORCH = along(72, 47);
    blockers.push([CHIM[0], CHIM[1], 5], [CHIM2[0], CHIM2[1], 5], [PORCH[0], PORCH[1], 7], [SNAG[0], SNAG[1], 3]);
    const freeOf = (x, z) => blockers.every(([bx, bz, r]) => Math.hypot(x - bx, z - bz) > r);
    const addTrunk = (x, z, far) => {
      const hem = R() < 0.45, r = far ? R.range(0.5, 1.2) : hem ? R.range(0.45, 1.3) : R.range(0.5, 1.15), Ht = R.range(30, 42), y = H(x, z) - 0.2;
      const col = hem ? _c.set('#5a4a40').multiplyScalar(R.range(0.6, 0.9)) : _c.set('#7a7a72').multiplyScalar(R.range(0.75, 1.0));
      put(trunks, tn++, x, y, z, R.range(-0.07, 0.07), R.range(0, TAU), R.range(-0.07, 0.07), r, Ht, r, col);
      if (hem && !far) hemlocks.push([x, y, z, r]);
      tops.push([x, y, z, Ht, hem, far, r]);
    };
    for (let tries = 0; tn < 290 && tries < 12000; tries++) { const s = R.range(-30, LH + 60), lat = R.sign() * R.range(16, 72), p = along(s, lat); const q = gq(p[0], p[1]); if (q.dP < 16 || q.dC < CW(q.sC) + 2 || !freeOf(p[0], p[1])) continue; addTrunk(p[0], p[1], false); }
    // the creek gap's last trunks, lining the opening toward the ring
    for (let tries = 0; tn < 350 && tries < 4000; tries++) { const s = R.range(LH - 20, LH + 120), lat = R.sign() * R.range(16, 40), p = along(s, lat); const q = gq(p[0], p[1]); if (q.dP < 16 || q.dC < CW(q.sC) + 8) continue; addTrunk(p[0], p[1], false); }
    for (let tries = 0; tn < NT && tries < 8000; tries++) { const s = R.range(-60, LH + 380), lat = R.sign() * R.range(70, 230), p = along(s, lat); const q = gq(p[0], p[1]); if (q.dP < 60 || q.dC < 30) continue; addTrunk(p[0], p[1], true); }
    finish(trunks, tn);
    // the canopy: many small irregular sprays on every near tree from 6 m up (hemlocks drooping in tiers, poplars higher and
    // flatter), so the crowns are broken lace against the sky and catch the fireflies' light; far trees keep small rough lumps
    { const g = own(new THREE.PlaneGeometry(1, 1, 6, 1)); g.translate(0.5, 0, 0); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setXYZ(i, x, -0.35 * x * x, P.getY(i) * (0.35 + 0.65 * x)); }
      const NBo = 24000, boughs = inst(g, boughMat, NBo, true); let n = 0;
      for (const [x, y, z, Ht, hem, far, r] of tops) { if (far) continue; const q = gq(x, z), open = q.sP > 90 ? 1 - ss(20, 34 + 0.12 * (q.sP - 90), q.dC) : 0;   // the creek opening near the end stays open to the stars
        if (hem) { for (let hh = 6 + R.range(0, 1.5); hh < 0.9 * Ht && n < NBo - 9; hh += R.range(1.1, 1.7)) { const f = (hh - 6) / (0.9 * Ht - 6); if (f > 0.5 && R() < open) continue;   // a dense drooping cone, tier by tier
            const nt = R.int(6, 9), a0 = R.range(0, TAU); for (let j = 0; j < nt; j++) { const a = a0 + j * TAU / nt + R.range(-0.3, 0.3), L = R.range(2.6, 4.4) * (1.2 - 0.9 * f) * R.range(0.85, 1.1);
              put(boughs, n++, x + Math.cos(a) * r * 0.7, y + hh + R.range(-0.3, 0.3), z - Math.sin(a) * r * 0.7, 0, a, R.range(-0.3, -0.05), L, L * 0.8, L * R.range(0.55, 0.85), _c.set('#a8c0a4').multiplyScalar(R.range(0.28, 0.5))); } } }
        else for (let c = 0, nc = R.int(3, 5); c < nc; c++) { const cr = R.range(0.68, 0.96) * Ht, ca = R.range(0, TAU), cd = R.range(1, 4); if (R() < open) continue;   // poplars: a few dense foliage clusters in the top third
          for (let k = 0, m = R.int(9, 13); k < m && n < NBo; k++) {
          const a = R.range(0, TAU), L = R.range(1.4, 2.8); put(boughs, n++, x + Math.cos(ca) * cd + R.range(-1.2, 1.2), y + cr + R.range(-1.4, 1.4), z - Math.sin(ca) * cd + R.range(-1.2, 1.2), R.range(-0.9, 0.9), a, R.range(-0.9, 0.9), L, L * 0.5, L * R.range(0.5, 0.85), _c.set('#d8f0c8').multiplyScalar(R.range(0.55, 0.95))); } } }
      finish(boughs, n); }
    { const NCr = 2600, crowns = inst(lump(1, 0.7, '#0c1e14', '#1e3a28'), lumpMat, NCr, true); let n = 0;
      for (const [x, y, z, Ht, hem, far] of tops) { const q = gq(x, z), open = !far && q.sP > 90 ? 1 - ss(20, 34 + 0.12 * (q.sP - 90), q.dC) : 0; if (R() < open) continue;
        for (let j = 0, m = far ? 5 : 0; j < m && n < NCr; j++) { const hh = (far ? R.range(0.55, 0.95) : hem ? R.range(0.88, 0.97) : R.range(0.8, 0.97)) * Ht, sc = far ? R.range(1.4, 3.2) : hem ? R.range(1.4, 2.2) : R.range(2.6, 4.2);
          put(crowns, n++, x + R.range(-3.5, 3.5), y + hh, z + R.range(-3.5, 3.5), R.range(-0.4, 0.4), R.range(0, TAU), R.range(-0.4, 0.4), sc, sc * R.range(0.5, 0.8), sc * R.range(0.7, 1.2), _c.set('#ffffff').multiplyScalar(R.range(0.55, 1.1))); } }
      finish(crowns, n); }
    // rhododendron thickets along the banks, all at least 15 m off the route
    { const NRh = 260, rh = inst(lump(1, 0.25, '#2a4a30', '#14261a'), lumpMat, NRh, true); let n = 0;
      for (let tries = 0; n < NRh && tries < 6000; tries++) { const s = R.range(-20, LH + 120), lat = R.sign() * R.range(15.5, 40), p = along(s, lat); const q = gq(p[0], p[1]); if (q.dP < 15.5 || q.dC < CW(q.sC) + 1 || !freeOf(p[0], p[1])) continue;
        for (let k = 0; k < 4 && n < NRh; k++) { const x = p[0] + R.range(-2.2, 2.2), z = p[1] + R.range(-2.2, 2.2); if (gq(x, z).dP < 15) continue; const sc = R.range(0.9, 1.7); put(rh, n++, x, H(x, z) + sc * 0.5, z, 0, R.range(0, TAU), 0, sc * R.range(1, 1.5), sc * R.range(0.7, 1.1), sc * R.range(1, 1.4), _c.set('#ffffff').multiplyScalar(R.range(0.7, 1.15))); } }
      finish(rh, n); }
    await tick();

    // ---------------- 5. Elkmont ruins: two fieldstone chimneys and a collapsed porch; the owl's snag ----------------
    const stones = inst(own(new THREE.BoxGeometry(1, 1, 1)), stoneMat, 1500, true); let stN = 0;
    const stoneTint = ['#ffffff', '#e8e4dc', '#d8d2c4', '#c8ccc0', '#f0e8d8', '#b8b8ae'];
    const chimney = (cx, cz, yaw, height, ragged) => {
      const y0 = H(cx, cz) - 0.15, cy = Math.cos(yaw), sy = Math.sin(yaw), w2 = (lx, lz) => [cx + cy * lx + sy * lz, cz - sy * lx + cy * lz];
      let y = 0, course = 0;
      while (y < height) {
        const hgt = R.range(0.17, 0.27), hw = y < 2.4 ? 0.95 : lerp(0.95, 0.52, ss(2.4, 3.6, y)), hd = y < 2.4 ? 0.62 : lerp(0.62, 0.4, ss(2.4, 3.6, y));
        const sides = [[-hw, hd, hw, hd], [hw, hd, hw, -hd], [hw, -hd, -hw, -hd], [-hw, -hd, -hw, hd]];
        for (const [ax, az, bx, bz] of sides) {
          const L = Math.hypot(bx - ax, bz - az); let t = course % 2 ? -R.range(0.1, 0.25) : 0;
          while (t < L) { const len = Math.min(R.range(0.28, 0.6), L - t + 0.15), mid = (t + len / 2) / L; t += len;
            const lx = ax + (bx - ax) * mid, lz = az + (bz - az) * mid;
            if (lz > hd - 0.01 && Math.abs(lx) < 0.55 && y < 1.15 && Math.abs(az - bz) < 0.01) continue;           // the firebox opening, facing the route
            if (R() < 0.035 + (ragged ? 0.55 * ss(height * 0.6, height, y) : 0)) continue;                     // missing stones
            const [wx, wz] = w2(lx * 1.02, lz * 1.02), ang = Math.atan2(bz - az, bx - ax);
            if (stN < 1500) put(stones, stN++, wx, y0 + y + hgt / 2, wz, R.range(-0.04, 0.04), yaw - ang + R.range(-0.06, 0.06), R.range(-0.05, 0.05), len - 0.02, hgt - 0.015, R.range(0.26, 0.4), _c.set(stoneTint[R.int(0, 5)]).multiplyScalar(R.range(0.7, 1.05)));
          }
        }
        y += hgt; course++;
      }
      // lintel over the firebox, hearth slab, a dark back, fallen stones
      { const [wx, wz] = w2(0, 0.66); put(stones, stN++, wx, y0 + 1.22, wz, 0, yaw, 0, 1.35, 0.16, 0.34, _c.set('#c8c0b0')); }
      { const [wx, wz] = w2(0, 1.2); put(stones, stN++, wx, y0 + 0.08, wz, 0, yaw + 0.04, 0, 1.9, 0.14, 0.9, _c.set('#a8a296')); }
      for (let k = 0; k < 14; k++) { const [wx, wz] = w2(R.range(-2.5, 2.5), R.range(-2, 2.6)); const sc = R.range(0.2, 0.45); put(stones, stN++, wx, H(wx, wz) + sc * 0.25, wz, R.range(-0.5, 0.5), R.range(0, TAU), R.range(-0.5, 0.5), sc * 1.3, sc * 0.7, sc, _c.set(stoneTint[R.int(0, 5)]).multiplyScalar(0.8)); }
      const back = new THREE.Mesh(own(new THREE.BoxGeometry(1.05, 1.1, 0.9)), darkMat); const [bx, bz] = w2(0, 0); back.position.set(bx, y0 + 0.55, bz); back.rotation.y = yaw; base.add(back);
      return y0;
    };
    const towardRoute = (x, z, s) => { const a = at(s); return Math.atan2(a.x - x, a.z - z); };
    const chimY = chimney(CHIM[0], CHIM[1], towardRoute(CHIM[0], CHIM[1], 40), 6.6, false);
    chimney(CHIM2[0], CHIM2[1], towardRoute(CHIM2[0], CHIM2[1], 10) + 0.3, 5.4, true);
    finish(stones, stN);
    // the collapsed porch: a stone footing, a floor with boards gone, two leaning posts, the roof sagging down to the ground at one corner
    {
      const yaw = towardRoute(PORCH[0], PORCH[1], 70), cy = Math.cos(yaw), sy = Math.sin(yaw), y0 = H(PORCH[0], PORCH[1]), w2 = (lx, lz) => [PORCH[0] + cy * lx + sy * lz, PORCH[1] - sy * lx + cy * lz];
      const floor = inst(own(new THREE.BoxGeometry(1, 1, 1)), plankMat, 40); let n = 0;
      for (let k = 0; k < 22; k++) { if (R() < 0.25) continue; const lz = -1.6 + k * 0.16, [x, z] = w2(R.range(-0.1, 0.1), lz); put(floor, n++, x, y0 + 0.55 + R.range(-0.04, 0.04), z, R.range(-0.04, 0.04), yaw, R.range(-0.08, 0.08) + (k > 16 ? -0.25 : 0), 5.2 * R.range(0.7, 1), 0.05, 0.14, _c.set('#8a8070').multiplyScalar(R.range(0.6, 0.95))); }
      finish(floor, n);
      const pst = inst(own(new THREE.BoxGeometry(1, 1, 1)), postMat, 6); let pn = 0;
      for (const [lx, lean] of [[-2.5, 0], [-0.8, 0.05], [0.9, 0.28], [2.5, 0.5]]) { const [x, z] = w2(lx, 1.6); put(pst, pn++, x, y0 + 1.25, z, lean * 0.6, yaw, lean, 0.14, 2.5, 0.14, _c.set('#6a6050')); }
      finish(pst, pn);
      const rg = own(new THREE.PlaneGeometry(6, 3.6, 12, 8)), P = rg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), sag = 0.5 * Math.cos(x / 6 * PI) * Math.cos(y / 3.6 * PI), drop = 1.9 * ss(-0.5, 3, x) * ss(-1.8, 1.8, y); P.setZ(i, -sag - drop); }
      const roof = new THREE.Mesh(rg, roofMat); roof.position.set(PORCH[0], y0 + 2.6, PORCH[1]); roof.rotation.set(-PI / 2 + 0.25, yaw, 0, 'YXZ'); base.add(roof);
      for (let k = 0; k < 10; k++) { const [x, z] = w2(R.range(-3, 3), R.range(-2.2, -1.6)); const sc = R.range(0.25, 0.45); put(stones, stN++, x, y0 + 0.15, z, 0, yaw + R.range(-0.1, 0.1), 0, sc * 1.4, 0.3, sc, _c.set('#c0b8a8').multiplyScalar(0.8)); }
      finish(stones, stN);
    }
    // the dead snag: a pale broken trunk with two stubs; the owl lands on its top
    const SNAGTOP = new THREE.Vector3(SNAG[0], H(SNAG[0], SNAG[1]) + 7.3, SNAG[1]);
    { const snagMat = litMat({ map: barkT, vertexColors: true, color: '#c8c4b8' }, 1.25), t = new THREE.Mesh(trunkGeo, snagMat); t.position.set(SNAG[0], H(SNAG[0], SNAG[1]) - 0.2, SNAG[1]); t.scale.set(0.34, 7.5, 0.34); t.rotation.set(0.03, 0.4, -0.04); base.add(t);
      const sg = own(new THREE.CylinderGeometry(0.05, 0.11, 1, 6).translate(0, 0.5, 0)); for (const [hh, a, L, tilt] of [[4.6, 0.8, 1.6, 1.0], [5.9, 3.6, 1.1, 0.8], [2.8, 2.2, 0.9, 1.2]]) { const b = new THREE.Mesh(sg, snagMat); b.position.set(SNAG[0], H(SNAG[0], SNAG[1]) + hh, SNAG[1]); b.rotation.set(0, a, tilt, 'YXZ'); b.scale.set(1, L, 1); base.add(b); } }
    await tick();

    // ---------------- 3b. Jakes Creek: rounded mossy boulders, the water with ripples and two riffles ----------------
    { const N = 80, bo = inst(lump(2, 0.34, '#1e3018', '#2a2924'), mossMat, N, true); let n = 0;
      for (let tries = 0; n < N && tries < 3000; tries++) { const s = n % 2 ? R.range(LH - 100, LH + 70) : R.range(-40, LH + 200), cw = CW(s), lat = OFF(s) + R.range(-cw, cw) * 0.95, p = along(s, lat); const q = gq(p[0], p[1]); if (q.dP < 4.2) continue; const sc = R.range(0.35, q.dP < 8 ? 0.7 : 1.3); put(bo, n++, p[0], WL - sc * 0.35 + R.range(0, 0.15), p[1], R.range(-0.2, 0.2), R.range(0, TAU), R.range(-0.2, 0.2), sc * R.range(1, 1.5), sc * R.range(0.6, 0.85), sc * R.range(1, 1.4), _c.set('#ffffff').multiplyScalar(R.range(0.75, 1.1))); }
      finish(bo, n); }
    const waterU = { uLM: FU.uLM, uLMB: FU.uLMB, uFieldLvl: FU.uFieldLvl, uFemLvl: FU.uFemLvl, uGlowK: FU.uGlowK, uTime: { value: 0 }, uAmb: FU.uAmb, uWaveK: FU.uWaveK, uT: FU.uT, uWO: FU.uWO, uWD: FU.uWD, uFogK: { value: 0.0125 }, uR1: { value: LH - 45 }, uR2: { value: LH + 15 }, uWater: { value: C('#1c3450') }, uFoam: { value: C('#7a8c88') }, uFogCol: { value: FOGC }, uCam: { value: new THREE.Vector3() } };
    {
      const Pp = [], UVs = [], I = []; let row = 0;
      for (let i = 0; i < CX.length; i++) {
        const s = CS[i], i2 = Math.min(CX.length - 1, i + 1), i1 = Math.max(0, i - 1), tx = CX[i2] - CX[i1], tz = CZ[i2] - CZ[i1], tl = Math.hypot(tx, tz), nx = -tz / tl, nz = tx / tl, hw = CW(s) + 1.6;
        for (const sd of [-1, 1]) { Pp.push(CX[i] + nx * hw * sd, WL, CZ[i] + nz * hw * sd); UVs.push(sd, s); }
        if (row > 0) { const a = (row - 1) * 2, b = row * 2; I.push(a, b, a + 1, a + 1, b, b + 1); } row++;
      }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2)); g.setIndex(I);
      const w = new THREE.Mesh(g, own(new THREE.ShaderMaterial({ uniforms: waterU, precision: 'highp', vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
      w.frustumCulled = false; w.renderOrder = 5; scene.add(w);
    }
    await tick();

    // ---------------- 6. far layers: ridges in blue mist in the creek gap, mist banks, ground fog ----------------
    {
      const ridgeMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
      const mk = (dist, h0, amp, wide, top, foot, seed) => {
        const cx = END.x + DIRE[0] * dist, cz = END.z + DIRE[1] * dist, rx = -DIRE[1], rz = DIRE[0], Pp = [], Cc = [], I = [], N = 160, ct = C(top), cf = C(foot);
        for (let i = 0; i <= N; i++) { const X = (i / N - 0.5) * 1600, y = h0 + amp * (1 - Math.exp(-(X * X) / (wide * wide))) + 26 * (fbm(X * 0.004 + seed, seed, 4) - 0.5) + 9 * (fbm(X * 0.02 + seed, seed * 2, 3) - 0.5);
          Pp.push(cx + rx * X, y, cz + rz * X, cx + rx * X, -30, cz + rz * X); Cc.push(ct.r, ct.g, ct.b, cf.r, cf.g, cf.b); if (i > 0) { const a = (i - 1) * 2, b = i * 2; I.push(a, a + 1, b, b, a + 1, b + 1); } }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3)); g.setIndex(I);
        for (const par of [base, mirror]) { const m = new THREE.Mesh(g, ridgeMat); m.frustumCulled = false; par.add(m); }
      };
      mk(560, 58, 110, 260, '#1a2d44', '#2a4258', 3.1);
      mk(450, 34, 90, 200, '#14243a', '#24405a', 7.7);
      mk(360, 16, 70, 140, '#0e1b2c', '#1e3650', 12.3);
    }
    // the sky as the creek sees it: an upper dome and faint stars drawn only in the mirror, so they lie under the water line
    {
      const g = own(new THREE.SphereGeometry(900, 40, 14, 0, TAU, 0, PI / 2)), P = g.attributes.position, cl = new Float32Array(P.count * 3), cz = C('#0e1c36'), ch = C('#3a5a7a'), cc = new THREE.Color();
      for (let i = 0; i < P.count; i++) { cc.copy(ch).lerp(cz, Math.pow(clamp(P.getY(i) / 900, 0, 1), 0.4)); cl.set([cc.r, cc.g, cc.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      const dome = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }))); dome.renderOrder = -10; dome.frustumCulled = false; mirror.add(dome);
      const sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = R.range(0, TAU), e = Math.asin(R.range(0.05, 1)); sp.set([Math.cos(a) * Math.cos(e) * 880, Math.sin(e) * 880, Math.sin(a) * Math.cos(e) * 880], i * 3); }
      const sg = own(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      const stars = new THREE.Points(sg, own(new THREE.PointsMaterial({ color: '#b8c8f0', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.22, fog: false, depthWrite: false }))); stars.renderOrder = -9; stars.frustumCulled = false; mirror.add(stars);
    }
    const ftime = { value: 0 }, fset = fx.fxGroup(); scene.add(fset.object);
    {
      const sunDir = new THREE.Vector3(0.2, 0.35, -0.9).normalize(), mid = along(LH * 0.6, 0);
      fset.add(fx.makeGroundFog({ rng: R.fork('gfog'), time: ftime, layers: 7, size: 900, center: [mid[0], 0, mid[1]], y: WL, height: 5, color: '#2a4a6a', opacity: 0.16, coverage: 0.6, scale: 0.02, near: [10, 50], wind: [0.4, -0.2], sunDir, sunColor: '#4a6a8a', scatter: 0.3 }));
      const banks = []; for (let i = 0; i < 26; i++) { const s = R.range(LH - 10, LH + 330), p = along(s, R.range(-120, 120)); banks.push([p[0], R.range(6, 22), p[1]]); }
      for (let i = 0; i < 18; i++) { const s = R.range(20, LH + 60), p = along(s, R.sign() * R.range(30, 90)); banks.push([p[0], R.range(3, 9), p[1]]); }
      fset.add(fx.makeMist({ rng: R.fork('banks'), time: ftime, positions: banks, size: [34, 70], color: '#4a6a8a', opacity: 0.16, drift: [0.3, 0, -0.15] }));
      const pool = []; for (let i = 0; i < 40; i++) { const s = R.range(-20, LH + 200); const p = along(s, OFF(s) + R.range(-3, 3)); if (gq(p[0], p[1]).dP < (s > 100 ? 7 : 14)) continue; pool.push([p[0], R.range(0.4, 1.2), p[1]]); }
      if (pool.length) fset.add(fx.makeMist({ rng: R.fork('pool'), time: ftime, positions: pool, size: [12, 24], color: '#3a5a7a', opacity: 0.12, drift: [0.4, 0, -0.2] }));
    }
    await tick();

    // ---------------- 7. fireflies ----------------
    const FN = 17000, aP = new Float32Array(FN * 3), aQ = new Float32Array(FN * 3), aR = new Float32Array(FN * 4); let fn = 0;
    const fly = (x, y, z, kind, qx = x, qy = y, qz = z) => { if (fn >= FN) return; aP.set([x, y, z], fn * 3); aQ.set([qx, qy, qz], fn * 3); aR.set([R(), R(), R(), kind], fn * 4); fn++; };
    const clearOfCam = (x, y, z, d) => { const q = gq(x, z); if (q.dP > d + 3) return true; const s = clamp(q.sP, 0, LH); return q.dP > d || Math.abs(y - EYE(s)) > d; };
    // (a) the valley field: understorey, trunk height, over the creek (doubled in it), deep valley layers, the far valley beyond the ring
    for (let i = 0, tries = 0; i < 5600 && tries < 50000; tries++) {
      const pick = R(); let s, lat, y;
      if (pick < 0.42) { s = R.range(-20, LH + 20); lat = R.sign() * R.range(6, 30); y = R.range(0.5, 5); }
      else if (pick < 0.75) { s = R.range(-20, LH + 20); lat = R.sign() * R.range(8, 45); y = R.range(4, 20); }
      else if (pick < 0.87) { s = R.range(-40, LH + 60); lat = OFF(s) + R.range(-1, 1) * (CW(s) + 3); y = R.range(0.4, 4.2); }
      else if (pick < 0.95) { s = R.range(-20, LH + 60); lat = R.sign() * R.range(30, 80); y = R.range(0.5, 10); }
      else { s = R.range(LH + 10, LH + 160); lat = R.range(-50, 50); y = R.range(0.5, 9); }
      const p = along(s, lat), gy = Math.max(WL, H(p[0], p[1])), yy = gy + y; if (!clearOfCam(p[0], yy, p[1], 3.2)) continue; fly(p[0], yy, p[1], 0); i++;
    }
    for (let i = 0, tries = 0; i < 1100 && tries < 12000; tries++) { const s = R.range(5, 80), lat = -R.range(4, 48), p = along(s, lat), yy = Math.max(WL, H(p[0], p[1])) + R.range(0.3, 6); if (!clearOfCam(p[0], yy, p[1], 3.2)) continue; fly(p[0], yy, p[1], 0); i++; }   // the valley below the opening swoop
    for (let i = 0, tries = 0; i < 1500 && tries < 15000; tries++) { const s = R.range(-5, LH - 8), p = along(s, R.sign() * R.range(2.6, 10)), yy = Math.max(WL, H(p[0], p[1])) + R.range(1, 4); if (!clearOfCam(p[0], yy, p[1], 2.4)) continue; fly(p[0], yy, p[1], 0); i++; }   // close by the walk, at mid height
    for (let i = 0, tries = 0; i < 1300 && tries < 13000; tries++) { const s = R.range(45, 120), p = along(s, R.range(12, 60)), yy = Math.max(WL, H(p[0], p[1])) + R.range(1, 12); if (!clearOfCam(p[0], yy, p[1], 3)) continue; fly(p[0], yy, p[1], 0); i++; }   // the deep field across the creek that the wave rolls through
    for (let i = 0, tries = 0; i < 800 && tries < 8000; tries++) { const s = R.range(70, 140), p = along(s, R.sign() * R.range(4, 12)), yy = Math.max(WL, H(p[0], p[1])) + R.range(2, 6); if (!clearOfCam(p[0], yy, p[1], 2.4)) continue; fly(p[0], yy, p[1], 0); i++; }   // drifting at eye height and above through the answer
    { const yaw = towardRoute(CHIM[0], CHIM[1], 40), cy = Math.cos(yaw), sy = Math.sin(yaw); for (let i = 0; i < 26; i++) { const lx = R.range(-0.4, 0.4), lz = R.range(0.1, 0.55); fly(CHIM[0] + cy * lx + sy * lz, chimY + R.range(0.15, 1.0), CHIM[1] - sy * lx + cy * lz, 0); } }   // in the cold hearth
    // (b) on the rails and post tops
    for (let i = 0; i < 150; i++) { const r = railTops[R.int(0, railTops.length - 1)], k = R(); fly(lerp(r[0], r[2], k), DECK + 0.9 + 0.035, lerp(r[1], r[3], k), 1); }
    for (let i = 0; i < 260; i++) { const s = R.range(BW0 + 4, BW1), p = along(s, R.range(-0.85, 0.85)); fly(p[0], DECK + 0.04 + (R() < 0.6 ? 0 : R.range(0.1, 0.5)), p[1], 1); }   // settled on the boards and drifting just above them
    for (let i = 0, tries = 0; i < 600 && tries < 6000; tries++) { const s = R.range(96, LH - 5), p = along(s, R.sign() * R.range(3, 10)), yy = Math.max(WL, H(p[0], p[1])) + R.range(1.5, 5); if (!clearOfCam(p[0], yy, p[1], 2.4)) continue; fly(p[0], yy, p[1], 0); i++; }   // the last burst close by on both sides
    // (d) the females in the ferns at the boardwalk edge, and the males that come down to them
    const FEM = along(104, -5.5), femSpot = new THREE.Vector3(FEM[0], H(FEM[0], FEM[1]) + 0.35, FEM[1]); const fems = [];
    for (let i = 0; i < 46; i++) { const s = R.range(99, 110), lat = -R.range(3.2, 8.5), p = along(s, lat); const y = Math.max(0, H(p[0], p[1])) + R.range(0.15, 0.6); fems.push([p[0], y, p[1]]); fly(p[0], y, p[1], 2); }
    for (let i = 0; i < 40; i++) { const s = R.range(-5, LH - 10), lat = R.sign() * R.range(3, 12), p = along(s, lat); if (!okFloor(p[0], p[1], 3)) continue; fly(p[0], Math.max(0, H(p[0], p[1])) + R.range(0.15, 0.6), p[1], 2); }
    for (let i = 0; i < 9; i++) { const f = fems[i * 4 % fems.length]; fly(f[0] + R.range(-2.5, 2.5), f[1] + R.range(3, 5), f[2] + R.range(-2.5, 2.5), 3, f[0] + R.range(-0.25, 0.25), f[1] + 0.02, f[2] + R.range(-0.25, 0.25)); }
    // the swarm that will rise: low over the creek and the ferns ahead
    for (let i = 0, tries = 0; i < 3600 && tries < 40000; tries++) { const s = R.range(LH - 80, LH + 30), lat = R.range(-24, 24), p = along(s, lat), gy = Math.max(WL, H(p[0], p[1])), y = gy + R.range(0.2, 2.6); if (!clearOfCam(p[0], y, p[1], 3.5)) continue; fly(p[0], y, p[1], 4); i++; }
    const flyGeo = own(new THREE.InstancedBufferGeometry()); flyGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); flyGeo.setIndex([0, 1, 2, 0, 2, 3]);
    flyGeo.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3)); flyGeo.setAttribute('aQ', new THREE.InstancedBufferAttribute(aQ, 3)); flyGeo.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4)); flyGeo.instanceCount = fn;
    // the light map: where the fireflies are, blurred over ~10 m, so their light pools on trunks, ferns, planks and water
    { const W = 256, Dh = Math.max(64, Math.round(256 * (bz1 - bz0) / (bx1 - bx0))), A = new Float32Array(W * Dh), B = new Float32Array(W * Dh), G = new Float32Array(W * Dh), sx = W / (bx1 - bx0), sz = Dh / (bz1 - bz0);
      for (let i = 0; i < fn; i++) { const k = aR[i * 4 + 3], fem = k > 1.5 && k < 3.5, qi = fem && k > 2.5 ? aQ : aP; const ix = Math.floor((qi[i * 3] - bx0) * sx), iz = Math.floor((qi[i * 3 + 2] - bz0) * sz); if (ix < 0 || iz < 0 || ix >= W || iz >= Dh) continue; if (fem) G[iz * W + ix] += 1; else A[iz * W + ix] += 1 / (1 + 0.04 * Math.max(0, aP[i * 3 + 1])); }
      for (let z = 0; z < Dh; z++) for (let x = 0; x < W; x++) { let t = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) t += G[clamp(z + dz, 0, Dh - 1) * W + clamp(x + dx, 0, W - 1)]; B[z * W + x] = t; } G.set(B);
      { let gm = 0; for (let i = 0; i < W * Dh; i++) gm = Math.max(gm, G[i]); for (let i = 0; i < W * Dh; i++) G[i] = Math.min(1, G[i] / Math.max(1e-6, gm * 0.6)); }
      for (let pass = 0; pass < 3; pass++) { for (let z = 0; z < Dh; z++) for (let x = 0; x < W; x++) { let t = 0; for (let d = -2; d <= 2; d++) t += A[z * W + clamp(x + d, 0, W - 1)]; B[z * W + x] = t / 5; } for (let z = 0; z < Dh; z++) for (let x = 0; x < W; x++) { let t = 0; for (let d = -2; d <= 2; d++) t += B[clamp(z + d, 0, Dh - 1) * W + x]; A[z * W + x] = t / 5; } }
      const sorted = Array.from(A).filter((v) => v > 0).sort((a, b) => a - b), top = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 1, px = new Uint8Array(W * Dh * 4);
      for (let i = 0; i < W * Dh; i++) { const v = Math.min(1, Math.sqrt(A[i] / top)); px[i * 4] = px[i * 4 + 2] = Math.round(v * 255); px[i * 4 + 1] = Math.round(G[i] * 255); px[i * 4 + 3] = 255; }
      const t = own(new THREE.DataTexture(px, W, Dh, THREE.RGBAFormat)); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
      FU.uLM.value = t; FU.uLMB.value.set(bx0, bz0, 1 / (bx1 - bx0), 1 / (bz1 - bz0)); }
    const FLYU = { uLM: FU.uLM, uLMB: FU.uLMB, uFieldLvl: FU.uFieldLvl, uFemLvl: FU.uFemLvl, uTime: { value: 0 }, uPx: { value: 0.0007 }, uFogK: { value: 0.0072 }, uLock: { value: 0 }, uRand: { value: 1 }, uGap: { value: -10 }, uSize: { value: 0.2 }, uCol: { value: COL }, uFly: { value: C('#d2ff76') }, uFem: { value: C('#ffc860').multiplyScalar(2.8) }, uT: FU.uT, uWO: FU.uWO, uWD: FU.uWD };
    const flyMat = (dim, streak) => own(new THREE.ShaderMaterial({ uniforms: { ...FLYU, uDim: { value: dim }, uStreak: { value: streak } }, vertexShader: FLY_VERT, fragmentShader: FLY_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    { const a = new THREE.Mesh(flyGeo, flyMat(1, 1)), b = new THREE.Mesh(flyGeo, flyMat(0.8, 2.4)); a.frustumCulled = b.frustumCulled = false; a.renderOrder = 6; b.renderOrder = 4; base.add(a); mirror.add(b); }
    // near fireflies by the boardwalk, small and faded close in; they flash with the wave where the camera is
    const nearPos = []; for (let i = 0; i < 280; i++) { const s = R.range(-5, LH - 5), lat = R.sign() * R.range(1.8, 9), p = along(s, lat); nearPos.push([p[0], Math.max(0, H(p[0], p[1])) + R.range(0.5, 3.2), p[1]]); }
    const nearFlies = F.makeFireflies({ rng: R.fork('near'), positions: nearPos, count: nearPos.length, color: '#d8ff7a', color2: '#d2ff76', size: 0.13, blink: 0.45, sharpness: 0.8, nearFade: [3, 9], roam: [0.8, 0.4, 0.25, 0.02] });
    const NC = nearFlies.uniforms.uCore.value, NH = nearFlies.uniforms.uHalo.value; nearFlies.object.frustumCulled = false; scene.add(nearFlies.object);
    // (c) blue ghosts: a steady low blue glow drifting knee high along the boardwalk edge, never in step
    const ghostPos = []; for (let i = 0; i < 120; i++) { const s = R.range(-8, LH - 20), lat = R.sign() * R.range(1.6, 6), p = along(s, lat); if (!okFloor(p[0], p[1], 1.5)) continue; ghostPos.push([p[0], Math.max(0, H(p[0], p[1])) + R.range(0.2, 0.8), p[1]]); }
    const ghosts = F.makeFireflies({ rng: R.fork('ghost'), positions: ghostPos, count: ghostPos.length, color: '#7ab8ff', color2: '#8ac4ff', size: 0.07, blink: 0.12, sharpness: 0, floor: 0.6, sync: 0, mix: 0, nearFade: [2, 6], roam: [1.1, 0.15, 0.12, 0] });
    ghosts.object.frustumCulled = false; scene.add(ghosts.object);
    await tick();

    // ---------------- 8. the barred owl ----------------
    const owl = makeBird({ body: '#8a8a6c', belly: '#c8e0a8', wing: '#7a7c60', feather: '#5a5c46', head: '#9a987c', beakC: '#d0c080', scale: 0.85, own, span: 1.0, beard: false });
    { const kids = owl.g.children, eye = kids[4], beak = kids[5], tail = kids[6], head = new THREE.Group(); head.position.set(0, 0.12, 0.5); owl.g.add(head);
      owl.neck.scale.set(1.2, 1.2, 0.2); owl.neck.position.set(0, 0.05, 0.42);
      for (const [o, x, y, z] of [[owl.hd, 0, 0, 0.05], [eye, 0, 0.03, 0.2], [beak, 0, -0.02, 0.22]]) { owl.g.remove(o); head.add(o); o.position.set(x, y, z); }
      owl.hd.scale.set(0.2, 0.19, 0.17); eye.scale.set(1.3, 1.6, 1); beak.scale.set(0.6, 0.6, 0.4); tail.scale.set(1, 1, 0.55); owl.head = head; }
    owl.g.visible = false; scene.add(owl.g);
    const OW0 = new THREE.Vector3(), OW1 = new THREE.Vector3();
    { const a = along(108, 7), b = along(112, -3); OW0.set(a[0], 4.5, a[1]); OW1.set(b[0], 3.2, b[1]); }
    const OW2 = SNAGTOP.clone().add(new THREE.Vector3(0, 0.12, 0));
    const bez = (k, out) => { const a = (1 - k) * (1 - k), b = 2 * k * (1 - k), c = k * k; return out.set(OW0.x * a + OW1.x * b + OW2.x * c, OW0.y * a + OW1.y * b + OW2.y * c, OW0.z * a + OW1.z * b + OW2.z * c); };
    const oP = new THREE.Vector3(), oN = new THREE.Vector3();
    await tick();

    const camAtU = (u) => path.pointAt(clamp(u, 0, 1), new THREE.Vector3());
    const gapStart = (T, d) => { const g = [6.0, 6.5 + d / 80 + 6 * 0.68, 13.2 + d / 160 + 7 * 0.72]; for (let k = 0; k < 40; k++) g.push(20.5 + d / 160 + 4.32 + 7 * k); let last = -10; for (const v of g) if (v <= T) last = v; return last; };
    let Tlive = 0;
    return {
      scene, path, duration: DUR, title: 'The Night the Fireflies Agree', ride: 'none', style: 'none', companion: 'none',
      pace: PACE,
      camera: { fov: 68, near: 0.2, nearThrough: 0.4, far: 1600, lookAhead: 12, sway: 0, bank: 0.06 },
      pois: [
        { at: (() => { const p = along(34, -20); return [p[0], -1, p[1]]; })(), from: 0, to: uOf(2.6), fade: 0.3, weight: 0.85, steady: true },   // out and down over the creek and the valley of sparks
        { at: [CHIM[0], chimY + 1.6, CHIM[1]], from: uOf(3.3), to: uOf(7.3), fade: 0.25, weight: 0.85, steady: true },                                  // the lone chimney, fireflies in its hearth                                  // the lone chimney, fireflies in its hearth
        { at: (tm, uu) => { const s2 = uu * PL + 26, p = along(s2, 36); return [p[0], 5, p[1]]; }, from: uOf(7.1), to: uOf(11.1), fade: 0.3, weight: 0.75 },   // the wave arriving from the ridge
        { at: (tm, uu) => { const k = ss(0.40, 0.43, uu), o = owl.g.visible ? owl.g.position : OW2; return [lerp(femSpot.x, o.x, k), lerp(femSpot.y - 1.2, o.y - 0.3, k), lerp(femSpot.z, o.z, k)]; }, from: 0.355, to: 0.5, fade: 0.25, weight: 0.85 },   // the answer in the ferns, then the owl landing
        { at: (tm, uu) => { const c = camAtU(uu), hd = Math.hypot(COL.x - c.x, COL.z - c.z); return [COL.x, c.y + hd * Math.tan(35 * PI / 180), COL.z]; }, from: 0.53, to: 0.7, fade: 0.3, weight: 0.9, steady: true },                                               // up the column
      ],
      portal: { shape: 'circle', style: 'ring', radius: 3, color: '#b8e890', veil: '#3a6a48', glow: 0.3, halo: true, revealDistance: 700, drawWithin: 140, drawIn: 14 },
      post: { exposure: 1.0, bloom: { strength: 0.3, radius: 0.5, threshold: 0.95 }, grade: { saturation: 1.08, contrast: 1.06, tint: '#f2fff4', shadowTint: '#020a14', vignette: 0.3, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const Tu = Math.max(0, Tof(u || 0) - 0.7); if ((u || 0) < 0.02 || Tu > Tlive) Tlive = Tu; else if (u > 0.8) Tlive += dt;   // in the tour's last hold the valley keeps flashing
        const T = Tlive, cp = camera.position; sky.update(dt, t, camera);
        FU.uT.value = T; FLYU.uTime.value = t; FLYU.uLock.value = ss(3.5, 6.0, T); FLYU.uRand.value = 1 - ss(5.9, 6.3, T); FU.uFieldLvl.value = 0.3 + 0.25 * FLYU.uRand.value; { const gs = gapStart(T, (cp.x - WO.x) * WD.x + (cp.z - WO.y) * WD.y), l = T - gs - 0.45; FU.uFemLvl.value = gs > 0 ? ss(0, 0.4, l) * (1 - ss(1.6, 2.6, l)) : 0; }
        const dCam = (cp.x - WO.x) * WD.x + (cp.z - WO.y) * WD.y; FLYU.uGap.value = gapStart(T, dCam);
        FLYU.uPx.value = 2 / ((camera.projectionMatrix.elements[5] || 1.5) * 1920);
        waterU.uTime.value = t; waterU.uCam.value.copy(cp); ftime.value = t; fset.update(dt, t, camera);
        // the near fireflies: their own rhythm while alone, then the wave's pulses where the camera stands
        const sync = maleSyncJS(cp.x, cp.z, T), rnd = FLYU.uRand.value, g = Math.max(0.3, rnd + (1 - rnd) * sync);
        nearFlies.uniforms.uBlink.value.w = 0.04 + (1 - rnd) * 0.96; nearFlies.uniforms.uCore.value = NC * g; nearFlies.uniforms.uHalo.value = NH * g;
        nearFlies.update(dt, t); ghosts.update(dt, t);
        foxfire.material.opacity = 0.26 + 0.06 * Math.sin(t * 0.7);
        // the owl: in from the right over the creek, two wingbeats, a long glide, a flare, and the landing on the snag; then it sits and turns its head
        const so = (T - 12.0) / 1.9;
        owl.g.visible = T > 11.95;
        if (owl.g.visible) {
          if (so < 1) {
            const k = ss(0, 1, so) * 0.85 + so * 0.15; bez(clamp(k, 0, 1), oP); bez(clamp(k + 0.02, 0, 1), oN); owl.g.position.copy(oP);
            const yaw = Math.atan2(oN.x - oP.x, oN.z - oP.z), flare = ss(0.8, 1, so);
            owl.g.rotation.set(-0.08 - flare * 0.7, yaw, 0.25 * Math.sin(so * PI) * (1 - flare));
            const flap = so < 0.32 ? (so / 0.32) * TAU * 2 : 0, glide = so < 0.32 ? 0 : so < 0.8 ? 1 : 0.4;
            owl.pose({ flap: flap + (so > 0.8 ? (so - 0.8) * 16 : 0), glide, t });
            owl.head.rotation.set(flare * 0.6, 0, 0);
          } else {
            owl.g.position.copy(OW2); const yaw = Math.atan2(cp.x - OW2.x, cp.z - OW2.z) + 0.5;
            owl.g.rotation.set(-1.05, yaw, 0); owl.pose({ dive: 1, glide: 1, t });
            owl.head.rotation.set(1.0, 0.75 * Math.sin(t * 0.33) - 0.3, 0);
          }
        }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); nearFlies.geometry && nearFlies.geometry.dispose(); nearFlies.material && nearFlies.material.dispose(); ghosts.geometry && ghosts.geometry.dispose(); ghosts.material && ghosts.material.dispose(); },
    };
  },
};
