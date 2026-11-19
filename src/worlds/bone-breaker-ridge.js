// THE BONE BREAKER: the Ordesa canyon in the Spanish Pyrenees, a late-autumn afternoon. You fly behind a lammergeier (bearded vulture)
// as it tips off the north rim, flares onto a grass ledge strewn with bones, takes a long leg bone, rides the updraft up the sunlit
// wall and drops the bone onto a pale limestone slab. It stoops after it; the bone bursts into white dust and marrow-gold glints, and
// the rising dust carries you over the col at the canyon head, where the ring stands on the grass with Monte Perdido behind.
// (Real behaviour: lammergeiers live on marrow and break bones by dropping them on rock.)
// Axes: the canyon runs along -Z (s = -z, distance up-canyon), n = x - cx(s) across it (the sunlit north wall is on the left, n < 0).
// Floor y ~ 0, rims ~400-480. Beats (T = u * 18): 0-2 off the rim | 2-6 the ossuary ledge | 6-10 the climb | 10-14 release and stoop |
// 13.9 burst | 15 the bird lands | 16-18 the lift to the ring on the col.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePath, makeNoise } from '../kit/core.js';
import * as T from '../kit/terrain.js';
import * as F from '../kit/fauna.js';
import * as flora from '../kit/flora.js';
import * as fx from '../kit/fx.js';
import * as Water from '../kit/water.js';
import { makeSky } from '../kit/sky.js';

const DUR = 18, D2R = Math.PI / 180;
const sat = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const bump = (x, a, b, c, d) => sstep(a, b, x) * (1 - sstep(c, d, x));
const smax = (a, b, k) => { const h = sat(0.5 + 0.5 * (a - b) / k); return mix(b, a, h) + k * h * (1 - h); };
// smooth keyframes [[T, v], ...]
const keyed = (K, x) => { if (x <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (x <= K[i][0]) return mix(K[i - 1][1], K[i][1], sstep(K[i - 1][0], K[i][0], x)); return K[K.length - 1][1]; };

// ---------- the canyon, as a pure height function ----------
const NZ = makeNoise(90731);
const cx = (s) => 14 * Math.sin(s * 0.0045);
const RIML = (s) => 397 + 83 * sstep(110, 310, s) + 2 * NZ.n2(s * 0.01, 4.2);           // the north (left, sunlit) rim climbs toward the head
const RIMR = (s) => 392 + 22 * Math.sin(s * 0.007 + 1) + 5 * NZ.n2(s * 0.012, 8.1);
// wall profiles across: t = 0 at the floor's edge, 1 at 225 m in; [t, height] (-1 = the rim). Cliff bands and fajas (grass benches)
const TL = [[0, 0], [0.13, 108], [0.27, 121], [0.4, 230], [0.51, 241], [0.62, 334], [0.73, 346], [0.89, -1]];
const TR = [[0, 0], [0.15, 140], [0.3, 152], [0.5, 290], [0.62, 300], [0.86, -1]];
const prof = (t, K, rim) => {
  if (t <= 0) return 0;
  const last = K[K.length - 1];
  if (t >= last[0]) return rim + Math.max(0, t - last[0] - 0.25) * 30;
  let k = 0; while (t > K[k + 1][0]) k++;
  const a = K[k], b = K[k + 1], ya = a[1] < 0 ? rim : a[1], yb = b[1] < 0 ? rim : b[1], u = (t - a[0]) / (b[0] - a[0]);
  const steep = (yb - ya) / ((b[0] - a[0]) * 225) > 1.2;
  return ya + (yb - ya) * (steep ? sstep(0.05, 0.95, u) : u);
};
// the head of the canyon along s: headwall steps (the Cola de Caballo pours off the top one), the col shelf, the rise to the massif
const HP = [[200, 9], [236, 148], [256, 158], [280, 290], [300, 301], [334, 382], [350, 386], [500, 396], [680, 470], [1000, 690], [1400, 820]];
const headAt = (s) => { if (s <= HP[0][0]) return HP[0][1]; let k = 0; while (k < HP.length - 2 && s > HP[k + 1][0]) k++;
  const a = HP[k], b = HP[k + 1], u = sat((s - a[0]) / (b[0] - a[0])), steep = (b[1] - a[1]) / (b[0] - a[0]) > 1.2; return a[1] + (b[1] - a[1]) * (steep ? sstep(0.05, 0.95, u) : u); };
const riverN = (s) => 26 * Math.sin(s * 0.011) + 10 * Math.sin(s * 0.031 + 2);

// ---------- the flight, in (s, n, y): off the north rim, down past the ledge, up the sunlit wall, the stoop, the lift to the col ----------
const SNY = [[-58, -356, 406], [-40, -334, 405.5], [-18, -312, 402.5], [12, -284, 386], [48, -260, 368], [88, -246, 356], [128, -244, 352], [168, -252, 358],
  [206, -265, 374], [244, -274, 395], [280, -279, 413], [312, -277, 420], [338, -268, 408], [362, -258, 389], [386, -252, 370], [410, -246, 364],
  [432, -232, 368], [450, -212, 376], [463, -190, 389], [472, -165, 395]];
const W = (s, n, y) => new THREE.Vector3(cx(s) + n, y, -s);
// heights are keyed to the beat times (the eye's height at T), so the path is built twice: once to learn when each point is reached
const YT = [[0, 406], [1.0, 405.5], [1.6, 402], [2.6, 388], [4.4, 344], [5.4, 350], [7.6, 386], [9.8, 420], [10.8, 412], [13.9, 365], [14.8, 363], [16.4, 385], [17.4, 394], [18, 395]];
const SK = 0.82, path = (() => { let pts = SNY.map(([s, n, y]) => W(-58 + (s + 58) * SK, n, y));
  for (let pass = 0; pass < 3; pass++) { let d = 0; const ds = [0]; for (let i = 1; i < pts.length; i++) { d += pts[i].distanceTo(pts[i - 1]); ds.push(d); }
    pts = pts.map((q, i) => q.clone().setY(keyed(YT, (ds[i] / d) * DUR))); }
  return makePath(pts); })();
const _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
const camAtT = (Tt, out) => path.posAtDist(sat(Tt / DUR) * path.length, out);
const leftOf = (Tt, out) => { path.tangentAtDist(sat(Tt / DUR) * path.length, _pb); const h = Math.hypot(_pb.x, _pb.z) || 1; return out.set(_pb.z / h, 0, -_pb.x / h); };   // (unit vector to the left of the heading)
const fwdOf = (Tt, out) => { path.tangentAtDist(sat(Tt / DUR) * path.length, out); out.y = 0; return out.normalize(); };
// the ossuary ledge (22 m left of the line at T 4.4), the anvil slab (ahead-left at T 13.9, its top 20 m under the eye), the col (the end)
const LL = leftOf(4.4, new THREE.Vector3()).clone();
const L = (() => { const c = camAtT(4.4, new THREE.Vector3()); return c.addScaledVector(LL, 22).setY(340); })();
const S = (() => { const c = camAtT(13.9, new THREE.Vector3()), l = leftOf(13.9, new THREE.Vector3()), f = fwdOf(13.9, new THREE.Vector3()); return c.addScaledVector(f, 45).addScaledVector(l, 17).setY(345); })();
const E = path.end.clone(), COLY = E.y - 9;
const segD = (x, z, a, b) => { const ex = b.x - a.x, ez = b.z - a.z, t = sat(((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez)); return [Math.hypot(x - a.x - ex * t, z - a.z - ez * t), t]; };

const H = (x, z) => {
  const s = -z, n = x - cx(s);
  // the floor: beech litter and meadows, a little rising up-canyon, the river's bed cut in it
  let h = 1 + Math.max(0, s + 400) * 0.01 + 1.6 * NZ.n2(x * 0.03, z * 0.03) - 3.2 * (1 - sstep(4, 11, Math.abs(n - riverN(s))));
  // the headwall and col shelf (the left side belongs to the north wall until the shelf)
  const hd = headAt(s + 9 * NZ.n2(n * 0.015, 9.7)) + 6 * NZ.n2(x * 0.02, z * 0.02) * sstep(350, 420, s) + (140 * Math.max(0, NZ.n2(x * 0.004, z * 0.004)) + 90 * (1 - Math.abs(NZ.n2(x * 0.011, z * 0.011))) + 30 * (1 - Math.abs(NZ.n2(x * 0.04, z * 0.04)))) * sstep(500, 900, s);
  h = Math.max(h, hd * Math.max(sstep(-235, -195, n), sstep(355, 400, s)));
  // gullies and buttresses: the walls recede in the gullies and stand out on the buttresses, more so toward the rims
  const gl = 15 * NZ.n2(s * 0.013, 1.7) + 6 * NZ.n2(s * 0.05, 5.3), gr = 14 * NZ.n2(s * 0.012, 6.1) + 6 * NZ.n2(s * 0.047, 2.2);
  const dl = -n - 125, dr = n - 125, tl0 = sat(dl / 225), tr0 = sat(dr / 225);
  if (dl > -20) { const t = (dl - gl * (0.35 + 0.65 * tl0)) / 225; h = smax(h, prof(t, TL, RIML(s)) + 2.5 * NZ.n2(x * 0.06, z * 0.06) + (t > 1 ? 16 * NZ.n2(x * 0.006, z * 0.006) * sstep(1, 1.6, t) : 0), 5); }
  if (dr > -20) { const t = (dr - gr * (0.35 + 0.65 * tr0)) / 225; h = smax(h, prof(t, TR, RIMR(s)) + 2.5 * NZ.n2(x * 0.06, z * 0.06) + (t > 1 ? 18 * NZ.n2(x * 0.006 + 3, z * 0.006) * sstep(1, 1.6, t) : 0), 5); }
  // the ledge scoop, the slab's bench, the grass ramp from the slab up to the col, the col
  const dL = Math.hypot(x - L.x, z - L.z); h = mix(L.y - 0.2 + 0.25 * NZ.n2(x * 0.5, z * 0.5), h, sstep(7, 19, dL));
  { // the shelf's front edge: in front of the ledge the ground falls away, so it reads as a shelf on the wall above a drop
    const ox = x - L.x, oz = z - L.z, o = ox * LL.x + oz * LL.z, al = Math.abs(ox * LL.z - oz * LL.x);
    if (al < 40 && o < -6) h = mix(h, Math.min(h, L.y - 1.5 - (-o - 6) * 2.6 + 2 * NZ.n2(x * 0.1, z * 0.1)), (1 - sstep(22, 40, al)) * sstep(-6, -9, o)); }
  const dS = Math.hypot(x - S.x, z - S.z); h = mix(S.y - 1.7, h, sstep(10, 28, dS));
  const [dr2, tr2] = segD(x, z, S, E); if (dr2 < 70) h = mix(S.y - 1.7 + (COLY - S.y + 1.7) * sstep(0.62, 1, tr2) + 1.2 * NZ.n2(x * 0.05, z * 0.05), h, sstep(22, 62, dr2) * (tr2 < 0.02 ? 1 : 1));
  const dE = Math.hypot(x - E.x, z - E.z); h = mix(COLY + 0.4 * NZ.n2(x * 0.08, z * 0.08), h, sstep(9, 42, dE));
  return h;
};

export default {
  id: 'bone-breaker-ridge',
  name: 'The Bone Breaker',
  category: 'wilderness',
  weirdness: 0.55,
  media: ['air', 'open'],
  async build(ctx) {
    const rng = ctx.rng, noise = ctx.noise, detail = ctx.quality?.detail ?? 1;
    const scene = new THREE.Scene(), disposables = [], own = (o) => { disposables.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const _c = new THREE.Color();

    // ---------- sky, light, air: late afternoon, the sun low from the right and never in the picture ----------
    const SUN_AZ = 96, SUN_EL = 26;
    const sunDir = new THREE.Vector3(Math.sin(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R), Math.sin(SUN_EL * D2R), -Math.cos(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R)).normalize();
    const sky = makeSky({ rng: rng.fork('sky'), preset: 'day', zenith: '#3d6fb8', mid: '#86aedc', horizon: '#f0c8a0', ground: '#b8a890', horizonPow: 2.4, midPow: 1.3,
      sunElevation: SUN_EL, sunAzimuth: SUN_AZ, scatterColor: '#ffd8a8', scatter: 0.35,
      clouds: { coverage: 0.3, softness: 0.55, scale: 0.36, opacity: 0.85, detail: 0.6, silver: 0.4, lit: '#fff0dc', shade: '#9fb2cf' }, clouds2: false });
    scene.add(sky.object);
    await tick();
    const FOG = new THREE.Color('#c9cfdc'); scene.fog = new THREE.FogExp2(FOG, 0.00042); scene.background = new THREE.Color('#86aedc');
    const HEMI_SKY = '#c4d6f2', HEMI_GND = '#8a7656', HEMI_I = 2.1, SUN_C = '#ffd8a8', SUN_I = 3.1;
    const hemi = new THREE.HemisphereLight(HEMI_SKY, HEMI_GND, HEMI_I); scene.add(hemi);
    const sun = new THREE.DirectionalLight(SUN_C, SUN_I); sun.position.copy(sunDir).multiplyScalar(900); scene.add(sun); scene.add(sun.target);
    // the same light for my own shaders (sky fill and sun, divided by PI as three.js does for its lights)
    const PI = Math.PI, cHS = new THREE.Color(HEMI_SKY), cHG = new THREE.Color(HEMI_GND), cSun = new THREE.Color(SUN_C);
    const LU = {
      uSky: { value: new THREE.Vector3(cHS.r, cHS.g, cHS.b).multiplyScalar(HEMI_I / PI) }, uGround: { value: new THREE.Vector3(cHG.r, cHG.g, cHG.b).multiplyScalar(HEMI_I / PI) },
      uLampDir: { value: sunDir.clone() }, uLamp: { value: new THREE.Vector3(cSun.r, cSun.g, cSun.b).multiplyScalar(SUN_I / PI) }, uTime: { value: 0 },
    };
    await tick();

    // ---------- the land: tiered limestone walls with fajas, buttresses and gullies; the beech floor; the headwall and the col ----------
    const terrain = await T.makeTerrainAsync({
      rng: rng.fork('land'), noise, path, height: H, bounds: [-1150, -1320, 1000, 520], biome: 'alpine', heightRange: [0, 620],
      palette: { ramp: [[0, '#8a6a3e'], [0.08, '#7f8a48'], [0.5, '#7f8f4a'], [0.66, '#8a9a52'], [0.76, '#a09a72'], [0.9, '#b8aa90'], [1, '#c8bcaa']], rock: '#c9a27a', rockB: '#b07a5a', strataAccent: '#e2c6a0', rockSlope: [0.52, 0.74], strata: 0.75, strataScale: 9,
        snow: null, patch: '#a89a6a', patchAmount: 0.2, tufts: 0.5, pebbles: 0.3, cracks: 0.25, ripples: 0, clouds: 0, sparkle: 0 },
      corridor: { clearance: 6, width: 8, slope: 3.0, maxSlope: 3.0, rough: 0.08, smooth: 5 }, ao: 0.35, cell: 3, near: 42, maxTriangles: 82000, skirt: 60,
      focus: [[L.x, L.z, 2], [S.x, S.z, 2], [E.x, E.z, 2.5]],
    }, ctx.yield);
    scene.add(terrain.object);
    const groundAt = (x, z) => terrain.surfaceAt(x, z);
    await tick();

    // ---------- far skyline: Monte Perdido, Cilindro and the Tres Sorores behind the head, banded and snow-topped; hazy rings beyond ----------
    const RC0 = [-60, -420];
    let rangeMat;
    {
      const N = 520, pos = [], av = [], idx = [];
      const nz = makeNoise(4471);
      [[1500, 620, 980, 0.28], [2300, 700, 1120, 0.52], [3200, 760, 1250, 0.76]].forEach(([R, h0, h1, haze], k) => { const base = pos.length / 3;
        for (let i = 0; i <= N; i++) { const th = (i / N) * Math.PI * 2, cxr = Math.cos(th), sz = Math.sin(th);
          const rid = 0.6 * (1 - Math.abs(nz.n2(cxr * 5.5 + k * 7.1, sz * 5.5 - k * 3.3))) + 0.4 * (1 - Math.abs(nz.n2(cxr * 13 + k, sz * 13 + 2))), big = 0.5 + 0.5 * nz.n2(cxr * 1.6 + 20 + k, sz * 1.6);
          // the three summits stand in the nearest ring, straight up the canyon (th = -PI/2 points to -Z)
          const dth = Math.atan2(Math.sin(th + Math.PI / 2), Math.cos(th + Math.PI / 2));
          const peaks = k === 0 ? Math.max(1130 * Math.max(0, 1 - Math.abs(dth - 0.02) / 0.13), 1060 * Math.max(0, 1 - Math.abs(dth + 0.19) / 0.1), 1000 * Math.max(0, 1 - Math.abs(dth - 0.24) / 0.12), 960 * Math.max(0, 1 - Math.abs(dth - 0.38) / 0.07)) : 0;
          const top = Math.max(mix(h0, h1, sat(0.1 + 0.9 * rid * (0.4 + 0.6 * big))), Math.pow(peaks / 1130, 0.7) * 1130 * (0.95 + 0.05 * rid));
          for (const v of [0, 1]) { pos.push(RC0[0] + cxr * R, v ? top : -600, RC0[1] + sz * R); av.push(top, haze, (i / N) * R * 0.0105, k); }
          if (i < N) { const q = base + i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); } } });
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aV', new THREE.Float32BufferAttribute(av, 4)); g.setIndex(idx);
      const lin = (h) => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };
      rangeMat = own(new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uSky: LU.uSky, uSun: LU.uLamp, uSunDir: LU.uLampDir, uTime: LU.uTime,
          uHaze: { value: lin('#d6d4dc') }, uDeep: { value: lin('#a8b4cc') }, uBandA: { value: lin('#e2c6a0') }, uBandB: { value: lin('#b07a5a') }, uShade: { value: lin('#5d6a8a') } },
        vertexShader: /* glsl */`attribute vec4 aV; varying vec3 vW; varying vec4 vA;
          void main(){ vA = aV; vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: /* glsl */`uniform vec3 uSky, uSun, uSunDir, uHaze, uDeep, uBandA, uBandB, uShade; uniform float uTime; varying vec3 vW; varying vec4 vA;
          float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
            return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
          float fb(vec3 p){ return .5 * vn(p) + .25 * vn(p * 2.03) + .125 * vn(p * 4.1) + .125 * vn(p * 8.3); }
          void main(){ float s = vA.z, k = vA.w;
            float cr = vA.x - 70. * abs(2. * vn(vec3(s * 9., k * 9., 1.)) - 1.) - 30. * abs(2. * vn(vec3(s * 27., k * 5., 2.)) - 1.) - 12. * vn(vec3(s * 80., 0., 3.));
            if (vW.y > cr) discard;
            float r = clamp((vW.y + 100.) / max(cr + 100., 1.), 0., 1.);
            float n = fb(vec3(s * 6. + vW.y * .004, vW.y * .011, k * 9.));
            // limestone in bands (ochre, pink, buff), snow on the tops and the ledges between bands
            float band = fb(vec3(s * .8, vW.y * .045, k * 2.)), cl = smoothstep(.3, .7, band);
            vec3 rock = mix(uBandB, uBandA, cl) * (.75 + .4 * n);
            float ledge = smoothstep(.62, .8, fract(vW.y * .021 + n * .4));
            float snow = clamp(smoothstep(.47, .7, r + (n - .5) * .5) + ledge * smoothstep(.32, .55, r) * .85, 0., 1.);
            vec3 alb = mix(rock, vec3(.92, .93, .97), snow);
            float face = .5 + .5 * sin(s * 40. + n * 6.);                                             // facets toward and away from the sun
            float lit = mix(.35, 1., smoothstep(.3, .7, face + (n - .5) * .5));
            vec3 col = alb * (uSky * (.95 + .2 * n) + uSun * .7 * lit) + uShade * (1. - lit) * .06;
            float hz = clamp(vA.y + (1. - vA.y) * .55 * (1. - r) * (1. - r), 0., 1.);
            col = mix(col, uHaze, hz * (1. - .35 * snow * lit));
            float low = 1. - smoothstep(-100., 320., vW.y);
            col = mix(col, mix(uDeep, uHaze, .6), low * .7);
            gl_FragColor = vec4(pow(col, vec3(1.)), 1.); }` }));
      const ranges = new THREE.Mesh(g, rangeMat); ranges.frustumCulled = false; scene.add(ranges);
    }
    await tick();

    // ---------- rock: the broken lip, the overhang over the ledge, the anvil slab and its scree apron, boulders on the benches ----------
    const rrng = rng.fork('rock');
    const rockMat = own(T.makeRockMaterial({ terrain, top: '#8a9a52', topAmount: 0.45, topSlope: [0.62, 0.86], contact: [0.5, 0, 0], strata: 0.45 }));
    const RC = { color: '#d2bc98', colorB: '#a07a58' };
    const parts = [];
    const mR = new THREE.Matrix4(), qR = new THREE.Quaternion(), eR = new THREE.Euler(), pR = new THREE.Vector3(), sR = new THREE.Vector3(1, 1, 1);
    // a crag: one tall faceted block with two smaller ones leaning on its foot (h above ground, r radius)
    const addCrag = (x, z, h, r, o = {}) => {
      const gy = o.base ?? groundAt(x, z), sy = (h + 3.5) / (2 * r), det = o.detail ?? 2;
      const g = T.rockGeometry({ rng: rrng, kind: 'rock', radius: r, detail: det, squash: o.squash || [1, sy, o.flat ? 1 : 0.86], taper: o.taper ?? (o.flat ? 0.12 : 0.55), cuts: o.flat ? 7 : 10, roughness: 0.3, lumps: 0.3, ...(o.col || RC) });
      qR.setFromEuler(eR.set(o.lean ?? rrng.range(-0.08, 0.08), o.yaw ?? rrng.range(0, 6.28), o.roll ?? rrng.range(-0.05, 0.05))); mR.compose(pR.set(x, gy + h * 0.5 - 1.75, z), qR, sR); parts.push({ g, m: mR.clone() });
      for (let k = 0, nn = o.solo ? 0 : 2; k < nn; k++) { const an = rrng.range(0, 6.28), rr = r * rrng.range(0.4, 0.6), d = r * rrng.range(0.75, 1.05), bx = x + Math.cos(an) * d, bz = z + Math.sin(an) * d;
        if (path.distanceTo(bx, groundAt(bx, bz) + rr, bz) < rr * 1.6 + 14) continue;
        const gb = T.rockGeometry({ rng: rrng, kind: 'rock', radius: rr, detail: 1, squash: [1, rrng.range(1.1, 1.8), 0.9], taper: 0.4, cuts: 8, roughness: 0.3, ...RC });
        qR.setFromEuler(eR.set(rrng.range(-0.3, 0.3), rrng.range(0, 6.28), rrng.range(-0.3, 0.3))); mR.compose(pR.set(bx, groundAt(bx, bz) + rr * 0.4, bz), qR, sR); parts.push({ g: gb, m: mR.clone() }); }
    };
    // the lip of the north rim: broken blocks along the edge, leaning out over the drop (never within 15 m of the line)
    for (let s = -240 + rrng.range(0, 10); s < 330; s += rrng.range(15, 26)) {
      const n = -125 - 0.89 * 225 - (15 * NZ.n2(s * 0.013, 1.7) + 6 * NZ.n2(s * 0.05, 5.3)) * 0.9 - rrng.range(-2, 5), x = cx(s) + n, z = -s, gy = groundAt(x, z), r = rrng.range(3.5, 7.5);
      if (path.distanceTo(x, gy + r, z) < 15 + r) continue;
      addCrag(x, z, rrng.range(5, 13), r, { lean: rrng.range(-0.1, 0.1), roll: -rrng.range(0.06, 0.2), base: gy - 3 });
      if (parts.length % 6 === 5) await tick(); }
    // the right rim, sparser, for the skyline across
    for (let s = -200 + rrng.range(0, 30); s < 520; s += rrng.range(30, 55)) {
      const n = 125 + 0.86 * 225 + (14 * NZ.n2(s * 0.012, 6.1) + 6 * NZ.n2(s * 0.047, 2.2)) * 0.9 + rrng.range(-2, 6), x = cx(s) + n, z = -s;
      addCrag(x, z, rrng.range(8, 18), rrng.range(5, 9), { base: groundAt(x, z) - 3, roll: rrng.range(0.05, 0.2) });
      if (parts.length % 6 === 5) await tick(); }
    // jointed buttresses: tall prisms of rock standing out of each cliff band where the wall bulges between gullies (the gully noise
    // is the same one the height field uses, so they stand on the spurs); none within 25 m of the line
    const BANDS_L = [[0, 0.13, 0, 108], [0.27, 0.4, 121, 230], [0.51, 0.62, 241, 334], [0.73, 0.89, 346, -1]], BANDS_R = [[0, 0.15, 0, 140], [0.3, 0.5, 152, 290], [0.62, 0.86, 300, -1]];
    let nButt = 0;
    for (const [side, BANDS, rimF, gF] of [[-1, BANDS_L, RIML, (q) => 15 * NZ.n2(q * 0.013, 1.7) + 6 * NZ.n2(q * 0.05, 5.3)], [1, BANDS_R, RIMR, (q) => 14 * NZ.n2(q * 0.012, 6.1) + 6 * NZ.n2(q * 0.047, 2.2)]]) {
      for (let s = -320 + rrng.range(0, 20); s < 420; s += rrng.range(26, 44)) {
        const gv = gF(s); if (gv > -2) continue;                                                     // a spur: the wall stands out here
        const b = BANDS[rrng.int(0, BANDS.length - 1)], y1 = b[3] < 0 ? rimF(s) : b[3], tm = mix(b[0], b[1], 0.42), hgt = y1 - b[2];
        const n = side * (125 + 225 * tm - gv * (0.35 + 0.65 * tm) * 0.9), x = cx(s) + n, z = -s, r = Math.min(13, Math.max(6, hgt * 0.11)) * rrng.range(0.8, 1.15);
        if (path.distanceTo(x, b[2] + hgt * 0.5, z) < 25 + r) continue;
        const g = T.rockGeometry({ rng: rrng, kind: 'rock', radius: r, detail: 1, squash: [0.8, (hgt + 6) / (2 * r), 1.1], taper: 0.18, cuts: 9, roughness: 0.35, lumps: 0.2, ...RC });
        qR.setFromEuler(eR.set(rrng.range(-0.03, 0.03), Math.atan2(side, 0) + rrng.range(-0.3, 0.3), rrng.range(-0.03, 0.03))); mR.compose(pR.set(x, b[2] + hgt * 0.5 - 1, z), qR, sR); parts.push({ g, m: mR.clone() });
        if ((++nButt & 7) === 7) await tick(); } }
    // the overhang over the ledge: a flat roof of rock jutting from the wall behind the bones, and the fallen blocks at its ends
    { const l = leftOf(4.4, new THREE.Vector3()), f = fwdOf(4.4, new THREE.Vector3()), bx = L.x + l.x * 9, bz = L.z + l.z * 9;
      addCrag(bx + l.x * 3, bz + l.z * 3, 7, 7, { flat: true, solo: true, base: L.y + 12, squash: [1.2, 0.4, 0.7], yaw: Math.atan2(f.x, f.z), lean: 0, roll: 0.25 });
      addCrag(bx + l.x * 6, bz + l.z * 6, 14, 6, { solo: true, base: L.y - 1, taper: 0.3 });
      for (const sd of [-1, 1]) { const x = L.x + f.x * sd * 9 + l.x * 4, z = L.z + f.z * sd * 9 + l.z * 4; addCrag(x, z, rrng.range(2.5, 4), rrng.range(1.6, 2.4), { solo: true, base: L.y - 0.8 }); } }
    await tick();
    { const half = parts.length >> 1; scene.add(new THREE.Mesh(own(T.mergeRocks(parts.slice(0, half))), rockMat)); await tick(); scene.add(new THREE.Mesh(own(T.mergeRocks(parts.slice(half))), rockMat)); }
    for (const p of parts) p.g.dispose();
    await tick();
    // the anvil slab: 14 x 9 m of pale limestone, 2.2 m thick, tilted 12 degrees toward the sun, jointed and pitted
    const SLAB_TILT = -12 * D2R, slabYaw = Math.atan2(fwdOf(13.9, new THREE.Vector3()).x, fwdOf(13.9, new THREE.Vector3()).z);
    {
      const g = new THREE.BoxGeometry(14, 3.2, 9, 28, 3, 18), a = g.attributes.position, col = [];
      for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i), edge = Math.max(Math.abs(x) / 7, Math.abs(z) / 4.5);
        const n = NZ.n2(x * 0.35 + 3, z * 0.35), j = Math.abs(NZ.n2(x * 0.16 + 9, z * 0.5)) < 0.05 ? 1 : 0;     // joints (grikes) across the top
        const top = y > 0 ? 1 : 0, dy = top ? 0.12 * n - 0.18 * j - 0.6 * sstep(0.82, 1, edge) * (0.6 + 0.4 * n) : 0.3 * n;
        a.setXYZ(i, x * (1 + 0.06 * NZ.n2(z * 0.3, y)), y + dy, z * (1 + 0.08 * NZ.n2(x * 0.2, 4 + y)));
        _c.set('#d8cdb8').lerp(new THREE.Color('#b8a888'), sat(0.5 - n * 0.6) * 0.6).lerp(new THREE.Color('#7a7466'), j * 0.7).lerp(new THREE.Color('#7a8296'), top ? 0 : 0.6); col.push(_c.r, _c.g, _c.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); own(g);
      const m = own(new THREE.MeshLambertMaterial({ vertexColors: true }));
      const slab = new THREE.Mesh(g, m); slab.position.set(S.x, S.y - 1.6, S.z); slab.rotation.set(0, slabYaw, SLAB_TILT, 'YXZ'); scene.add(slab);
    }
    // the scree apron below it: an instanced spill of pale stones down the bench
    {
      const g = own(T.rockGeometry({ rng: rrng, kind: 'boulder', detail: 1, color: '#cdbfa6', colorB: '#9a8a70' })), N = 140, im = new THREE.InstancedMesh(g, rockMat, N), l = leftOf(13.9, new THREE.Vector3());
      for (let i = 0; i < N; i++) { const a = rrng.range(-1.3, 1.3), d = 8 + 26 * Math.pow(rrng(), 0.8), x = S.x - l.x * d * Math.cos(a) + l.z * d * Math.sin(a) * 0.7, z = S.z - l.z * d * Math.cos(a) - l.x * d * Math.sin(a) * 0.7, sc = rrng.range(0.25, 1.1) * (1.2 - d / 40);
        qR.setFromEuler(eR.set(rrng.range(0, 3), rrng.range(0, 6.3), rrng.range(0, 3))); mR.compose(pR.set(x, groundAt(x, z) + sc * 0.2, z), qR, sR.set(sc, sc * 0.6, sc)); im.setMatrixAt(i, mR); }
      sR.set(1, 1, 1); scene.add(im);
    }
    await tick();
    // talus: fans of fallen blocks at the foot of each cliff band, thickest under the gullies
    {
      const g = own(T.rockGeometry({ rng: rrng, kind: 'boulder', detail: 1, ...RC })), N = Math.round(900 * (0.6 + 0.4 * detail)), im = new THREE.InstancedMesh(g, rockMat, N); let k = 0;
      for (let i = 0; i < N * 3 && k < N; i++) {
        const side = rrng() < 0.6 ? -1 : 1, B = side < 0 ? [0.0, 0.27, 0.51, 0.73] : [0.0, 0.3, 0.62], t0 = B[rrng.int(0, B.length - 1)], s = rrng.range(-500, 420);
        const n = side * (125 + 225 * (t0 - (t0 === 0 ? 0.02 + 0.08 * rrng() : -0.01 - 0.05 * rrng()))) + rrng.range(-4, 4), x = cx(s) + n, z = -s, y = H(x, z);
        if (y > 300 && path.distanceTo(x, y, z) < 20) continue;
        const sc = rrng.range(0.6, 3.2) * (t0 === 0 ? 1.4 : 1);
        qR.setFromEuler(eR.set(rrng.range(0, 3), rrng.range(0, 6.3), rrng.range(0, 3))); mR.compose(pR.set(x, y + sc * 0.15, z), qR, sR.set(sc, sc * 0.7, sc)); im.setMatrixAt(k++, mR);
        if ((i & 255) === 255) await tick(); }
      im.count = k; sR.set(1, 1, 1); scene.add(im);
    }
    // boulders on the benches and the floor
    const spots = T.scatter({ rng: rrng, terrain, path, count: Math.round(160 * (0.6 + 0.4 * detail)), band: [20, 420], clearance: 16, scale: [0.8, 4], slope: [0.45, 1] });
    const bGeo = own(T.rockGeometry({ rng: rrng, kind: 'boulder', detail: 2, ...RC })), bLod = own(T.rockGeometry({ rng: rrng, kind: 'boulder', detail: 1, ...RC }));
    const boulders = T.makeInstances(bGeo, rockMat, spots, { lod: bLod, path, lodRatio: 30 }); scene.add(boulders.object);
    await tick();

    // ---------- bones: lit, ivory to weathered, with lichen; femurs with knuckled ends, rib arcs, vertebrae, izard skulls with hooked horns ----------
    const brng = rng.fork('bones'), IVORY = new THREE.Color('#e8dcc0'), OLD = new THREE.Color('#b8a888'), LICH = [new THREE.Color('#c9a040'), new THREE.Color('#8a9a60'), new THREE.Color('#d8c060')];
    // a tube along a centreline (points), radius per point; coloured from ivory to weathered with lichen flecks
    const tubeGeo = (pts, radii, sides, age) => { const P = [], C = [], I = [], up = new THREE.Vector3(0, 1, 0), tg = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i < pts.length; i++) { tg.subVectors(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize(); b.crossVectors(tg, Math.abs(tg.y) > 0.9 ? _pa.set(1, 0, 0) : up).normalize(); nn.crossVectors(b, tg);
        for (let j = 0; j <= sides; j++) { const an = j / sides * Math.PI * 2, r = radii[i] * (1 + 0.08 * Math.sin(an * 3 + i));
          p.copy(pts[i]).addScaledVector(b, Math.cos(an) * r).addScaledVector(nn, Math.sin(an) * r); P.push(p.x, p.y, p.z);
          _c.copy(IVORY).lerp(OLD, sat(age + 0.25 * brng.range(-1, 1))); if (brng() < 0.07 * age) _c.lerp(LICH[brng.int(0, 2)], 0.7); C.push(_c.r, _c.g, _c.b); } }
      for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < sides; j++) { const q = i * (sides + 1) + j; I.push(q, q + sides + 1, q + 1, q + 1, q + sides + 1, q + sides + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); return g; };
    const ball = (x, y, z, r, age) => { const g = new THREE.SphereGeometry(r, 9, 7); g.deleteAttribute('uv'); g.translate(x, y, z); const C = []; for (let i = 0; i < g.attributes.position.count; i++) { _c.copy(IVORY).lerp(OLD, sat(age + 0.2 * brng.range(-1, 1))); C.push(_c.r, _c.g, _c.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); return g; };
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    // a long bone along z: a shaft that swells to its heads, a gentle bow, and two knuckled condyles at each end
    const femurGeo = (len, age) => { const pts = [], rad = [], NS = 14, bow = 0.025 * len;
      for (let i = 0; i <= NS; i++) { const t = i / NS; pts.push(V3(bow * Math.sin(Math.PI * t), 0, (t - 0.5) * len)); rad.push(len * (0.024 + 0.05 * (Math.pow(1 - sstep(0, 0.2, t), 2) + Math.pow(sstep(0.8, 1, t), 2))) * (i === 0 || i === NS ? 0.4 : 1)); }
      const gs = [tubeGeo(pts, rad, 9, age)];
      for (const e of [-1, 1]) for (const sd of [-1, 1]) gs.push(ball(sd * len * 0.035, -0.01 * len, e * len * 0.47, len * 0.045, age));
      const g = mergeGeometries(gs); gs.forEach((q) => q.dispose()); return g; };
    const ribGeo = (len, age) => { const pts = [], rad = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = t * 2.2; pts.push(V3(Math.sin(a) * len * 0.45, 0.02 * Math.sin(t * 9), (1 - Math.cos(a)) * len * 0.3)); rad.push(len * 0.018 * (1 - 0.5 * t)); } return tubeGeo(pts, rad, 5, age); };
    const vertGeo = (r, age) => { const gs = [tubeGeo([V3(0, 0, -r * 0.6), V3(0, 0, 0), V3(0, 0, r * 0.6)], [r * 0.9, r, r * 0.9], 8, age)];
      for (const [dx, dy] of [[0, 1], [1, -0.3], [-1, -0.3]]) gs.push(tubeGeo([V3(0, 0, 0), V3(dx * r * 1.2, dy * r * 1.2 + 0.3 * r, 0), V3(dx * r * 2, dy * r * 2 + 0.5 * r, -r * 0.3)], [r * 0.35, r * 0.25, r * 0.08], 4, age));
      const g = mergeGeometries(gs); gs.forEach((q) => q.dispose()); return g; };
    // an izard skull: a long narrow cranium, the eye sockets, and two black horns rising and hooking sharply back
    const skullGeo = (age) => { const gs = [tubeGeo([V3(0, 0, -0.16), V3(0, 0.02, -0.08), V3(0, 0.035, 0.02), V3(0, 0.03, 0.08), V3(0, 0.01, 0.11)], [0.018, 0.035, 0.055, 0.05, 0.02], 9, age)];
      for (const sd of [-1, 1]) { const hp = [], hr = []; for (let i = 0; i <= 7; i++) { const t = i / 7; hp.push(V3(sd * (0.025 + 0.015 * t), 0.06 + 0.16 * Math.sin(t * 1.9), 0.04 + 0.05 * t - 0.11 * Math.pow(sstep(0.55, 1, t), 1) )); hr.push(0.013 * (1 - 0.8 * t)); }
        const h = tubeGeo(hp, hr, 6, 0); const cc = h.attributes.color; for (let i = 0; i < cc.count; i++) cc.setXYZ(i, 0.08, 0.07, 0.06); gs.push(h);
        const eye = ball(sd * 0.042, 0.03, 0.0, 0.016, 0); const ec = eye.attributes.color; for (let i = 0; i < ec.count; i++) ec.setXYZ(i, 0.2, 0.17, 0.13); gs.push(eye); }
      const g = mergeGeometries(gs); gs.forEach((q) => q.dispose()); return g; };
    const boneMat = own(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const placeBones = (list, cxp, cyp, czp, R0, groundY, sk = 1) => { const out = [];
      for (const [g, k] of list) { for (let i = 0; i < k; i++) { const a = brng.range(0, 6.28), r = R0 * Math.sqrt(brng()), x = cxp + Math.cos(a) * r, z = czp + Math.sin(a) * r, gc = g.clone();
        gc.applyMatrix4(mR.compose(pR.set(x, (groundY ? groundY(x, z) : cyp) + 0.03, z), qR.setFromEuler(eR.set(brng.range(-0.15, 0.15), brng.range(0, 6.28), brng.range(-0.2, 0.2))), sR.set(1, 1, 1).multiplyScalar(brng.range(0.9, 1.35) * sk))); out.push(gc); } }
      sR.set(1, 1, 1); const m = mergeGeometries(out); out.forEach((q) => q.dispose()); return m; };
    { // the ossuary: some 60 pieces under the overhang, and the old splinters on the slab
      const kinds = [[femurGeo(0.8, 0.3), 5], [femurGeo(0.55, 0.6), 6], [femurGeo(0.35, 0.8), 6], [ribGeo(0.6, 0.4), 12], [ribGeo(0.45, 0.7), 10], [vertGeo(0.05, 0.5), 12], [skullGeo(0.3), 3], [skullGeo(0.6), 1]];
      await tick();
      const g = own(placeBones(kinds, L.x, L.y, L.z, 6.5, groundAt, 1.5)); scene.add(new THREE.Mesh(g, boneMat));
      const spl = [[femurGeo(0.22, 0.4), 40], [femurGeo(0.14, 0.7), 50], [ribGeo(0.25, 0.6), 30]];
      const gs = own(placeBones(spl, S.x, 0, S.z, 4.2, (x, z) => { const lx = (x - S.x) * Math.cos(slabYaw) - (z - S.z) * Math.sin(slabYaw); return S.y + 0.02 + lx * Math.sin(SLAB_TILT); }));
      scene.add(new THREE.Mesh(gs, boneMat));
      for (const [k] of kinds) k.dispose(); for (const [k] of spl) k.dispose();
    }
    // the hero: the 1.2 m leg bone the bird takes (on the ledge, then in its talons, then tumbling)
    const heroG = own(femurGeo(1.2, 0.15)), hero = new THREE.Mesh(heroG, boneMat); scene.add(hero);
    await tick();

    // ---------- vegetation: autumn beech and fir on the floor, mountain pines on the fajas and the rim ----------
    const vrng = rng.fork('veg');
    const wind = flora.makeWind({ direction: [0.6, -0.8], strength: 1.1 }), leafMat = own(flora.windMaterial({ wind }));
    const BEECH = [{ leaf: '#c98a3a', leafLight: '#e8b860', leafDark: '#6a3a18' }, { leaf: '#a5522a', leafLight: '#d07a3a', leafDark: '#4a1e10' }, { leaf: '#d9a440', leafLight: '#f0cc6a', leafDark: '#7a5418' }];
    const floorV = [];
    for (let k = 0; k < 3; k++) { floorV.push(flora.oakGeometry({ rng: vrng, height: 17 + k * 3, detail: 0, ...BEECH[k], bark: '#8a8070', barkDark: '#4a4238' })); await tick(); }
    floorV.push(flora.coniferGeometry({ rng: vrng, height: 24, detail: 0, snow: 0, leaf: '#2f4a35', leafLight: '#4a6a48', leafDark: '#142218', bark: '#4a3c30', barkDark: '#241c18' }));
    await tick();
    const pineV = [flora.pineGeometry({ rng: vrng, height: 13, detail: 1, leaf: '#2c4a30', leafLight: '#5a7a44', leafDark: '#10201a' }), flora.pineGeometry({ rng: vrng, height: 16, detail: 1, leaf: '#33523a', leafLight: '#62824a', leafDark: '#14261c' })];
    const pineF = [flora.pineGeometry({ rng: vrng, height: 14, detail: 0, leaf: '#2c4a30', leafLight: '#5a7a44', leafDark: '#10201a' })];
    await tick();
    const slopeAt = (x, z) => { const h0 = H(x, z); return Math.hypot(H(x + 3, z) - h0, H(x, z + 3) - h0) / 3; };
    const floorPts = [], pinePts = [];
    for (let i = 0, nT = Math.round(2200 * detail); i < nT; i++) {
      const s = vrng.range(-900, 240), n = vrng.range(-150, 150), x = cx(s) + n, z = -s;
      if (Math.abs(n - riverN(s)) < 12) continue; const y = H(x, z); if (y > 60 || slopeAt(x, z) > 0.55) continue;
      const v = vrng() < 0.18 ? 3 : vrng.int(0, 2); floorPts.push({ x, y, z, s: vrng.range(0.75, 1.3), rot: vrng.range(0, 6.28), v });
      if ((i & 255) === 255) await tick(); }
    // pines on the fajas: pick a bench across the wall, then a place on it; bare where steep, nothing within 20 m of the line
    const BENCH = [[0.15, 0.25], [0.41, 0.5], [0.63, 0.72], [0.9, 1.3]];
    for (let i = 0, nP = Math.round(520 * detail); i < nP; i++) {
      const side = vrng() < 0.6 ? -1 : 1, b = BENCH[vrng.int(0, 3)], t = vrng.range(b[0], b[1]), s = vrng.range(-500, 620), n = side * (125 + 225 * t), x = cx(s) + n, z = -s, y = H(x, z);
      if (slopeAt(x, z) > 0.6 || y < 80) continue;
      if (y > 300 && path.distanceTo(x, y + 6, z) < 24) continue;
      if (Math.hypot(x - L.x, z - L.z) < 18 || Math.hypot(x - S.x, z - S.z) < 30 || Math.hypot(x - E.x, z - E.z) < 40) continue;
      pinePts.push({ x, y, z, s: vrng.range(0.6, 1.2), rot: vrng.range(0, 6.28), v: vrng.int(0, 1) });
      if ((i & 63) === 63) await tick(); }
    const forest = flora.makeScatter({ rng: vrng, variants: floorV, points: floorPts, material: leafMat, chunks: 4, cullDistance: 2600, tilt: 0.04, tint: 0.2, hue: 0.05 });
    scene.add(forest.object); await tick();
    const pines = flora.makeScatter({ rng: vrng, variants: pineV, farVariants: pineF, farDistance: 140, points: pinePts, material: leafMat, chunks: 4, cullDistance: 2600, tilt: 0.06 });
    scene.add(pines.object); await tick();

    // autumn shrubs on the fajas and the rim (rowan and whitebeam gone red and gold, box dark green), and the rim's tussocks at the start
    const shrubV = [flora.bushGeometry({ rng: vrng, size: 1.8, detail: 1, leaf: '#a8402a', leafLight: '#e07a3a', leafDark: '#4a1a10' }), flora.bushGeometry({ rng: vrng, size: 1.5, detail: 1, leaf: '#c89a3a', leafLight: '#ecc860', leafDark: '#5a4018' }),
      flora.bushGeometry({ rng: vrng, size: 1.3, detail: 1, leaf: '#3a5230', leafLight: '#6a8a4a', leafDark: '#18281a' })];
    const shrubPts = [];
    for (let i = 0, nS = Math.round(900 * detail); i < nS; i++) {
      const side = vrng() < 0.65 ? -1 : 1, b = BENCH[vrng.int(0, 3)], t = vrng.range(b[0], b[1]), s = vrng.range(-300, 460), n = side * (125 + 225 * t), x = cx(s) + n, z = -s, y = H(x, z);
      if (slopeAt(x, z) > 0.7 || y < 80) continue;
      if (y > 300 && path.distanceTo(x, y + 1, z) < 12) continue;
      if (Math.hypot(x - S.x, z - S.z) < 14 || Math.hypot(x - L.x, z - L.z) < 8) continue;
      shrubPts.push({ x, y, z, s: vrng.range(0.7, 1.5), rot: vrng.range(0, 6.28), v: vrng.int(0, 2) });
      if ((i & 127) === 127) await tick(); }
    const shrubs = flora.makeScatter({ rng: vrng, variants: shrubV, points: shrubPts, material: leafMat, chunks: 3, cullDistance: 1600, tilt: 0.1, tint: 0.2 });
    scene.add(shrubs.object); await tick();
    const tuftV = [flora.grassTuftGeometry({ rng: vrng, cards: 5, width: 0.9, height: 0.7, root: '#6a6a3a', tip: '#c8b878' }), flora.grassTuftGeometry({ rng: vrng, cards: 4, width: 0.7, height: 0.5, root: '#5a6a34', tip: '#a8b060' })];
    const tuftPts = [];
    for (let i = 0; i < 700; i++) { const d0 = vrng.range(-10, 90), a = vrng.range(-1, 1), p0 = path.posAtDist(Math.max(0, d0), new THREE.Vector3()), x = p0.x + a * vrng.range(6, 40) + (d0 < 0 ? d0 * 0.6 : 0), z = p0.z + vrng.range(-12, 12) - (d0 < 0 ? d0 * 0.8 : 0), y = H(x, z);
      if (y < 390 || slopeAt(x, z) > 0.5) continue; tuftPts.push({ x, y, z, s: vrng.range(0.7, 1.6), rot: vrng.range(0, 6.28), v: vrng.int(0, 1) }); }
    const tufts = flora.makeScatter({ rng: vrng, variants: tuftV, points: tuftPts, wind, chunks: 1, cullDistance: 400, tilt: 0.15, tint: 0.25 });
    scene.add(tufts.object); await tick();

    // ---------- waters: the Arazas on the floor, thread falls off the south rim, the Cola de Caballo under the col ----------
    const LT = Water.waterLight(sky);
    const rpts = []; for (let s = -1000; s < 205; s += 12) { const x = cx(s) + riverN(s); rpts.push([x, H(x, -s) + 0.9, -s]); }
    const river = Water.makeRiver({ rng: rng.fork('river'), light: LT, points: rpts, width: 9, speed: 3.2, foam: 0.5, bankFoam: 0.6, ripple: 1, opacity: 0.88, deep: '#2f6a70', shallow: '#8fc4c0', wetColor: '#3a3428', segments: 420, across: 6 });
    scene.add(river.object);
    await tick();
    const falls = [];
    for (const [s, sideN, hgt] of [[70, 1, 150], [190, 1, 132], [-120, 1, 160]]) {   // off the south rim's lip down to its middle faja
      const n = sideN * (125 + 0.86 * 225 - 4), x = cx(s) + n, top = H(x, -s) - 0.5;
      const w = Water.makeWaterfall({ rng: rng.fork('fall' + s), light: LT, top: [x, top, -s], height: hgt, width: 3, layers: 3, dir: [-sideN, 0, 0], launch: 1.6, tint: river.uniforms?.uDeep?.value, mistCount: Math.round(50 * detail), poolSize: 0.8 });
      scene.add(w.object); falls.push(w); await tick(); }
    { // the horsetail: off the col's lip, right of the ring, fanning down the headwall step
      const s = 342, n = -60, x = cx(s) + n, top = H(x, -s) - 0.3;
      const w = Water.makeWaterfall({ rng: rng.fork('cola'), light: LT, top: [x, top, -s], height: 78, width: 7, layers: 4, dir: [0, 0, 1], launch: 1.2, tint: river.uniforms?.uDeep?.value, mistCount: Math.round(120 * detail), rainbow: 0.25, poolSize: 1.2 });
      scene.add(w.object); falls.push(w); }
    await tick();

    // ---------- mist and haze: sheets pooled on the floor and in the gullies, a few soft drifting wisps ----------
    const fog = fx.makeGroundFog({ layers: 4, size: 1500, y: 6, height: 70, heightAt: H, mode: 'pool', segments: 56, center: [0, 0, -200], color: '#e4e2e6', opacity: 0.32, coverage: 0.55, scale: 0.004, sunDir, sunColor: '#ffd8a8', scatter: 0.35, wind: [0.6, -1.2], near: [40, 160] });
    scene.add(fog.object);
    const mistC = document.createElement('canvas'); mistC.width = mistC.height = 128;
    { const g = mistC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const mistT = own(new THREE.CanvasTexture(mistC)); mistT.colorSpace = THREE.SRGBColorSpace;
    const mistM = own(new THREE.SpriteMaterial({ map: mistT, color: '#f6f0ea', transparent: true, opacity: 0.12, depthWrite: false })), mists = [];
    for (let i = 0; i < 26; i++) { const sp = new THREE.Sprite(mistM), s = vrng.range(-500, 420), n = vrng.range(-110, 110), x = cx(s) + n, w = vrng.range(90, 200);
      sp.scale.set(w, w * vrng.range(0.16, 0.26), 1); sp.position.set(x, H(x, -s) + vrng.range(25, 90), -s); scene.add(sp); mists.push({ sp, x, v: vrng.range(1, 3) * (i % 2 ? 1 : -1) }); }
    await tick();

    // cumulus building over the peaks at the canyon head, lit warm on the sun side and blue-grey beneath
    const cumulus = fx.makeCloudPuffs({ rng: rng.fork('cumulus'), clouds: [[-260, 1500, -1900, 1.3], [180, 1460, -2050, 1.1], [520, 1560, -1700, 0.9], [-700, 1420, -1500, 0.8], [900, 1380, -1300, 0.7], [-120, 1650, -2500, 1.5]].map(([x, y, z, sc]) => ({ position: [x, y, z], scale: sc })),
      size: [90, 170], puffs: 18, color: '#fff0dc', shadowColor: '#9fb2cf', opacity: 0.9, drift: [3, 0, 0.5], spread: [1.6, 0.55, 1.1], near: [0.12, 0.5] });
    scene.add(cumulus.object); await tick();

    // ---------- the lammergeier (bird space: origin between the shoulders, -Z ahead, +Y up), the golden eagle's feather-card build:
    // a lofted body in a coat of drawn feathers, rows of feather cards, a fingered hand that shuts like a fan, the sky-fill light.
    // Long narrow pointed wings with five short fingers, the long wedge tail, slate above with pale shafts, the rust-cream head and
    // breast, the black mask and bristly beard, a red eye ring.
    const eagle = new THREE.Group(); scene.add(eagle);
    const EG = 1.75;
    const EAGLE_LIGHT = /* glsl */`
      vec3 eagleLight(vec3 N, vec3 V, vec3 uSky, vec3 uGround, vec3 uLampDir, vec3 uLamp){
        vec3 L = mix(uGround * 1.3, uSky, N.y * .5 + .5) * 1.8 + uLamp * max(dot(N, uLampDir), 0.) * .7;
        L = mix(L, vec3(dot(L, vec3(.3, .5, .2))), .35);
        return L + vec3(.95, .6, .34) * (.3 + .55 * pow(1. - abs(dot(N, V)), 2.)); }`;
    const uTrem = { value: 1 };
    const mkFeatherMat = () => own(new THREE.ShaderMaterial({
      fog: false, side: THREE.DoubleSide, uniforms: { ...LU, uTrem, uDim: { value: EG }, uClose: { value: 0 } },
      vertexShader: /* glsl */`attribute vec3 color; attribute vec4 aF; attribute float aTh; uniform float uTime, uTrem, uClose; varying vec3 vN, vW, vC; varying vec4 vF;
        void main(){ vec3 p = position, n = normal; float k = aF.y * aF.y;
          float a = aTh * uClose, c = cos(a), s = sin(a);
          p = vec3(p.x * c + p.z * s, p.y - abs(aTh) * uClose * .035, -p.x * s + p.z * c); n = vec3(n.x * c + n.z * s, n.y, -n.x * s + n.z * c);
          p += n * (sin(uTime * 13. + aF.x * 9.) * .009 * uTrem + sin(uTime * 2.1 + aF.x * 3.) * .03) * k * (aF.w < -.5 ? .25 : 1.);
          vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * n); vC = color; vF = aF;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */`uniform vec3 uSky, uGround, uLampDir, uLamp; uniform float uDim; varying vec3 vN, vW, vC; varying vec4 vF;
        ${EAGLE_LIGHT}
        void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); if (dot(N, V) < 0.) N = -N;
          float x = abs(vF.z), t = vF.y, hk = step(vF.w, -.5), bw = max(vF.w, 0.);
          float shaft = (1. - smoothstep(.02, .1, x)) * smoothstep(.0, .1, t) * (1. - .6 * t);                 // the pale shaft: a lammergeier's slate is streaked with them
          float vane = (1. - .38 * x * x) * mix(.82, 1., step(0., vF.z));
          float bars = 1. - bw * .3 * smoothstep(.25, .75, sin(t * 30. + vF.x * 2.3) * .5 + .5) * smoothstep(.1, .3, t) * (1. - smoothstep(.7, .9, t));
          float barb = .93 + .07 * sin(t * 90. + x * 26.);
          vec3 col = vC * vane * bars * barb * mix(1., 1.25, smoothstep(.75, 1., x) * (1. - bw));
          col += vec3(.62, .62, .64) * shaft * .3;
          vec3 hc = vC * mix(.74, 1.08, smoothstep(.05, .7, x)) * mix(.8, 1.08, smoothstep(.15, .95, t)) * (.92 + .16 * fract(vF.x * .618));
          col = mix(col, hc, hk);
          float rim = pow(1. - max(dot(N, V), 0.), 3.);
          gl_FragColor = vec4((col * eagleLight(N, V, uSky, uGround, uLampDir, uLamp) + uSky * (.05 + .1 * bw) * rim) * uDim, 1.); }`,
    }));
    const eagleMat = mkFeatherMat(), handMat = mkFeatherMat();
    const mkCoatMat = () => own(new THREE.ShaderMaterial({
      fog: false, side: THREE.DoubleSide, uniforms: { ...LU, uDim: { value: EG } },
      vertexShader: /* glsl */`attribute vec3 color; attribute vec3 aUV; attribute vec3 aT; varying vec3 vN, vW, vC, vT; varying vec3 vUV;
        void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vT = mat3(modelMatrix) * aT; vC = color; vUV = aUV;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */`uniform vec3 uSky, uGround, uLampDir, uLamp; uniform float uDim; varying vec3 vN, vW, vC, vT; varying vec3 vUV;
        ${EAGLE_LIGHT}
        float h2(vec2 p){ p = fract(p * vec2(.1031, .1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.y); }
        void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW); if (dot(N, V) < 0.) N = -N;
          vec2 g = vUV.xy * vec2(26., 15.); float row = floor(g.y); g.x += .5 * mod(row, 2.);
          float f = fract(g.y), x = abs(fract(g.x) - .5) * 2., tip = 1. - .62 * x * x, on = step(f, tip);
          float hsh = h2(vec2(floor(g.x) + 7. * (1. - on), row + (1. - on)));
          float fringe = smoothstep(tip - .42, tip - .1, f), line = smoothstep(tip - .08, tip, f);
          float shaft = (1. - smoothstep(.03, .12, x)) * (.2 + .8 * f);
          float lum = mix(.55, (.66 + .46 * fringe) * (1. - .5 * line) + .32 * shaft, on) * (.84 + .32 * hsh);
          N = normalize(N + normalize(vT + vec3(1e-5)) * (.5 - f) * .55 * on * vUV.z);
          vec3 col = vC * mix(1., lum, vUV.z);
          float rim = pow(1. - max(dot(N, V), 0.), 3.);
          gl_FragColor = vec4((col * eagleLight(N, V, uSky, uGround, uLampDir, uLamp) + uSky * .05 * rim) * uDim, 1.); }`,
    }));
    const coatMat = mkCoatMat(), armMat = mkCoatMat();
    const FT = [0, 0.13, 0.28, 0.44, 0.58, 0.71, 0.82, 0.91, 0.965, 1];
    const featherGeo = () => { const P = [], C = [], Fa = [], Th = [], I = [], col = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3(), p = new THREE.Vector3();
      return { P, C, Fa, I,
        add(base, dir, side, len, wid, cols, id, notch = 0, camber = 0.06, bars = 0, mir = 1, th = 0) {
          const k0 = P.length / 3, NS = FT.length - 1, lan = notch < 0; a.copy(dir).normalize(); b.copy(side).addScaledVector(a, -side.dot(a)).normalize(); n.crossVectors(b, a).normalize().multiplyScalar(mir);
          for (let i = 0; i <= NS; i++) { const t = FT[i], w = lan ? wid * (0.55 + 0.45 * sstep(0, 0.3, t)) * (1 - 0.8 * sstep(0.45, 1, t))
            : wid * (0.45 + 0.55 * sstep(0, 0.18, t)) * (1 - notch * sstep(0.36, 0.56, t)) * (1 - 0.96 * Math.pow(sstep(0.7, 1, t), 1.7));
            for (let j = -1; j <= 1; j++) { p.copy(base).addScaledVector(a, t * len).addScaledVector(b, j * w * 0.5 * (lan ? 1 : j < 0 ? 0.55 : 1.45)).addScaledVector(n, camber * len * t * t - (j === 0 ? 0 : lan ? 0.004 : 0.012));
              col.set(cols[0]).lerp(_c.set(cols[1]), sstep(0, 0.45, t)).lerp(_c.set(cols[2]), sstep(0.5, 1, t));
              P.push(p.x, p.y, p.z); C.push(col.r, col.g, col.b); Fa.push(id, t, j, bars); Th.push(th); } }
          for (let i = 0; i < NS; i++) for (let j = 0; j < 2; j++) { const q = k0 + i * 3 + j; I.push(q, q + 1, q + 3, q + 1, q + 4, q + 3); } },
        build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aF', new THREE.Float32BufferAttribute(Fa, 4)); g.setAttribute('aTh', new THREE.Float32BufferAttribute(Th, 1)); g.setIndex(I); g.computeVertexNormals(); return own(g); } }; };
    // a lofted surface through rings [z, yc, rx, ry, colour on top, colour at the sides, x centre, colour underneath]
    const loftGeo = (rings, sides, arc, flag = 1, sq = 1, pat = 1) => { const P = [], C = [], UV = [], Tn = [], I = [], col = new THREE.Color(); let along = 0;
      for (let i = 0; i < rings.length; i++) { const r = rings[i], q = rings[Math.max(0, i - 1)], nx = rings[Math.min(rings.length - 1, i + 1)]; if (i) along += Math.hypot(r[0] - q[0], r[1] - q[1]);
        const tz = nx[0] - q[0], ty = nx[1] - q[1], tl = Math.hypot(tz, ty) || 1;
        for (let j = 0; j <= sides; j++) { const an = (j / sides * 2 - 1) * arc, s0 = Math.sin(an), c0 = Math.cos(an), s = Math.sign(s0) * Math.pow(Math.abs(s0), sq), c = Math.sign(c0) * Math.pow(Math.abs(c0), sq), k = 0.9 + 0.1 * c0;
          P.push((r[6] || 0) + s * r[2], r[1] + c * r[3], r[0]); Tn.push(0, ty / tl, tz / tl);
          col.set(r[4]); if (r[5]) col.lerp(_c.set(r[5]), sstep(0.3, 0.85, Math.abs(s0))); if (r[7]) col.lerp(_c.set(r[7]), sstep(-0.15, -0.65, c0));
          C.push(col.r * k, col.g * k, col.b * k); UV.push(an * (r[2] + r[3]) * 0.5 * pat, along * pat, flag); } }
      for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) { const q = i * (sides + 1) + j; I.push(q, q + 1, q + sides + 1, q + 1, q + sides + 2, q + sides + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aUV', new THREE.Float32BufferAttribute(UV, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(Tn, 3)); g.setIndex(I); g.computeVertexNormals(); return own(g); };
    const erng = rng.fork('eagle'), UPV = V3(0, 1, 0);
    const PRIM = ['#3c3f48', '#2c2e36', '#16171c'], COV = ['#4a4e58', '#3e414a', '#2c2e35'], SEC = ['#3c3f47', '#31343b', '#1d1e23'], SCAP = ['#41444d', '#383b43', '#4e525c'];
    const CREAM = ['#d8a670', '#e8c498', '#f0dcbc'], RUST = ['#a8582a', '#c4682e', '#d88a4e'];
    const eMesh = (g, m, parent = eagle) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.renderOrder = 5; parent.add(o); return o; };
    // the upper wing from shoulder to wrist as one surface: long and narrow, slate coverts with pale shafts
    const wingGeo = (sx) => { const P = [], C = [], UV = [], Tn = [], I = [], col = new THREE.Color(), NSp = 10, vs = [-0.05, 0, 0.07, 0.16, 0.3, 0.48, 0.7, 0.92], NC = vs.length;
      for (let i = 0; i <= NSp; i++) { const t = i / NSp, z = 0.14 - 1.17 * t, chord = mix(0.74, 0.5, t) * (1 - 0.45 * sstep(0.86, 1, t));
        for (let j = 0; j < NC; j++) { const v = vs[j], vv = Math.max(0, v), y = v < 0 ? -0.07 : 0.07 * Math.sin(Math.PI * Math.pow(vv, 0.45)) - 0.05 * vv - 0.02;
          P.push(sx * (-0.11 + chord * vv + (v < 0 ? 0.03 : 0)), y, z); Tn.push(sx, 0, 0);
          col.set('#50545e').lerp(_c.set('#454953'), sstep(0.13, 0.3, vv)).lerp(_c.set('#383b43'), sstep(0.34, 0.5, vv)).lerp(_c.set('#2c2e35'), sstep(0.62, 0.8, vv));
          C.push(col.r, col.g, col.b); UV.push(t * 0.6, vv * chord * 0.42, v < 0 ? 0 : 1); } }
      for (let i = 0; i < NSp; i++) for (let j = 0; j < NC - 1; j++) { const q = i * NC + j; I.push(q, q + 1, q + NC, q + 1, q + NC + 1, q + NC); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('aUV', new THREE.Float32BufferAttribute(UV, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(Tn, 3)); g.setIndex(I); g.computeVertexNormals(); return own(g); };
    // the hand: ten primaries in a narrow fan, the outer ones longest so the wing ends in a point; only five short fingers
    const hands = [], arms = [];
    const PL = [1.5, 1.62, 1.6, 1.52, 1.42, 1.3, 1.17, 1.06, 0.97, 0.9], PTH = [0.12, 0.22, 0.33, 0.45, 0.58, 0.72, 0.86, 1.0, 1.14, 1.28];
    for (const sx of [1, -1]) {
      const G = featherGeo(), TH0 = 0.1;
      for (let i = 0; i < 10; i++) { const th = PTH[i], tw = 0.15 + 0.05 * i;
        G.add(V3(sx * 0.03 * i, -0.008 * i, 0.035 * i), V3(sx * Math.sin(th), 0.05 + 0.012 * i, -Math.cos(th)), V3(sx * Math.cos(th), -tw, Math.sin(th)), PL[i], 0.2, PRIM, sx * 7 + i, i < 5 ? 0.24 : 0.06, 0.07, 0, sx, sx * (th - TH0)); }
      for (let r = 0; r < 2; r++) for (let i = 0; i < 11; i++) { const th = 0.02 + i * 0.12 + 0.05 * r;
        G.add(V3(sx * (0.03 * i - 0.06), 0.025 + 0.02 * r, 0.03 * i - 0.03 + 0.03 * r), V3(sx * Math.sin(th), 0.03 + 0.02 * r, -Math.cos(th)), V3(sx * Math.cos(th), -0.2, Math.sin(th)), (r ? 0.3 : 0.56) + erng.range(-0.04, 0.04), r ? 0.15 : 0.19, r ? SCAP : COV, sx * 20 + r * 12 + i, 0, 0.06, 0, sx, sx * (th - TH0)); }
      hands.push(eMesh(G.build(), handMat));
      await tick();
      const arm = new THREE.Group(); eagle.add(arm); arms.push(arm);
      eMesh(loftGeo([[0.06, -0.03, 0.12, 0.075, '#3a3d45'], [-0.25, -0.02, 0.11, 0.068, '#41444d'], [-0.6, -0.008, 0.095, 0.058, '#464a53'], [-0.9, 0, 0.082, 0.052, '#4a4e58'], [-1.0, -0.004, 0.072, 0.048, '#4a4e58'], [-1.05, -0.012, 0.046, 0.034, '#454953'], [-1.068, -0.02, 0.008, 0.006, '#3e414a']], 12, Math.PI, 0.85), armMat, arm);
      eMesh(wingGeo(sx), armMat, arm);
      const A = featherGeo();   // secondaries: one overlapping row out to a scalloped trailing edge
      for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, chord = mix(0.74, 0.5, t); A.add(V3(sx * (-0.11 + chord * 0.5), -0.012, 0.12 - 1.1 * t), V3(sx * 0.985, -0.06, 0.1), V3(0, 0.06, 1), chord * 0.56, 0.18, SEC, sx * 90 + i, 0, 0.03, 0, sx); }
      eMesh(A.build(), handMat, arm);
      await tick();
    }
    // the body: slate back, the neck and breast rust (the bird paints itself in iron-red mud), cream toward the head
    const BODY = [[-0.92, 0.03, 0.05, 0.05, '#e0b07a', null, 0, '#e0b07a'], [-0.85, 0.032, 0.072, 0.07, '#d89a5e', null, 0, '#e0a870'], [-0.74, 0.03, 0.095, 0.09, '#c98a50', null, 0, '#d88a4e'],
      [-0.6, 0.025, 0.13, 0.115, '#8a6a52', '#c4682e', 0, '#c4682e'], [-0.44, 0.02, 0.18, 0.135, '#4a4c54', '#b8602a', 0, '#c4682e'], [-0.26, 0.012, 0.23, 0.15, '#3e4149', '#b05a28', 0, '#c4682e'],
      [-0.04, 0, 0.25, 0.16, '#3a3d45', '#a8582a', 0, '#bf6630'], [0.2, -0.008, 0.23, 0.15, '#363940', '#9a5028', 0, '#b06030'], [0.45, -0.015, 0.19, 0.125, '#33363d', null, 0, '#8a5a3a'],
      [0.7, -0.02, 0.13, 0.09, '#2f3238', null, 0, '#4a4040'], [0.92, -0.025, 0.085, 0.055, '#2c2e34', null, 0, '#33343a'], [1.0, -0.03, 0.04, 0.02, '#2c2e34', null, 0, '#2c2e34']];
    eMesh(loftGeo(BODY, 20, Math.PI, 0.8), coatMat);
    await tick();
    const ringAt = (z) => { let k = 0; while (k < BODY.length - 2 && z > BODY[k + 1][0]) k++; const a = BODY[k], b = BODY[k + 1], t = sat((z - a[0]) / (b[0] - a[0])); return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)]; };
    const rowOn = (G, ring, z, n, arc, len, wid, cols, id, lancet, lift, bars, sq = 1) => { const [yc, rx, ry] = ring(z), [yc2, rx2, ry2] = ring(z + 0.1);
      for (let i = 0; i < n; i++) { const an = ((i + 0.5 + erng.range(-0.18, 0.18)) / n - 0.5) * 2 * arc, s = Math.sign(Math.sin(an)) * Math.pow(Math.abs(Math.sin(an)), sq), c = Math.sign(Math.cos(an)) * Math.pow(Math.abs(Math.cos(an)), sq);
        G.add(V3(s * rx * 1.02, yc + c * ry * 1.02, z + erng.range(-0.012, 0.012)), V3(s * (rx2 - rx) * 10, (yc2 - yc) * 10 + c * (ry2 - ry) * 10 + lift, 1), V3(c, -s, 0), len * erng.range(0.88, 1.12), wid, typeof cols === 'function' ? cols(Math.abs(an) / arc) : cols, id + i, lancet ? -1 : 0, lancet ? 0.012 : 0.04, bars); } };
    { const Bc = featherGeo();
      // the neck: lancet feathers, cream at the nape, rust toward the shoulders
      [[-0.88, 9, 0.1, 0.03, CREAM], [-0.81, 10, 0.12, 0.036, CREAM], [-0.73, 11, 0.14, 0.044, RUST], [-0.65, 12, 0.16, 0.054, RUST], [-0.56, 13, 0.17, 0.062, RUST]].forEach(([z, n, len, wid, cols], r) => rowOn(Bc, ringAt, z, n, 1.35 + 0.05 * r, len, wid, cols, 300 + r * 20, true, 0.02, -1));
      await tick();
      [-0.42, -0.26, -0.08, 0.12].forEach((z, r) => rowOn(Bc, ringAt, z, 11 + Math.min(2, r), 1.25, 0.24, 0.13, SCAP, 500 + r * 14, false, -0.02, 0));   // mantle and scapulars: slate, pale-shafted
      [0.32, 0.5, 0.68].forEach((z, r) => rowOn(Bc, ringAt, z, 9 - r, 1.2, 0.25, 0.12, SEC, 560 + r * 14, false, -0.02, 0));
      await tick();
      eMesh(Bc.build(), eagleMat); }
    // the tail: the long wedge, twelve slate feathers, the middle pair longest (uClose < 0 spreads it, > 0 shuts it); it rolls to steer
    const tailMat = mkFeatherMat(), tailPivot = new THREE.Group(); tailPivot.position.set(0, -0.035, 0.86); eagle.add(tailPivot);
    { const Tg = featherGeo(), TAIL = ['#3a3d45', '#2e3037', '#1e1f24'];
      for (let i = 0; i < 12; i++) { const ph = ((i + 0.5) / 12 - 0.5) * 0.62, sg = ph < 0 ? -1 : 1;
        Tg.add(V3(Math.sin(ph) * 0.07, -0.01 * Math.abs(i - 5.5), 0.02 * Math.cos(ph)), V3(Math.sin(ph), -0.02, Math.cos(ph)), V3(sg * Math.cos(ph), -0.1, -sg * Math.sin(ph)), 1.48 - 1.65 * Math.abs(ph), 0.17, TAIL, 600 + i, 0, 0.03, 0, -sg, -ph); }
      eMesh(Tg.build(), tailMat, tailPivot); }
    await tick();
    // the head: small, cream, the black mask from the bill through the eye, the bristly beard under the chin, the red eye ring
    const headPivot = new THREE.Group(); headPivot.position.set(0, 0.05, -0.9); headPivot.scale.setScalar(1.35); eagle.add(headPivot);
    { const SK = [[-0.18, -0.03, 0.026, 0.024, '#e8d6b4', '#1a1a1c', 0, '#e8d6b4'], [-0.155, -0.016, 0.045, 0.035, '#efd9b8', '#1c1c1e', 0, '#e8d0a8'], [-0.12, -0.004, 0.058, 0.044, '#efd9b8', '#262322', 0, '#ecd4ae'],
        [-0.07, 0.003, 0.062, 0.05, '#efd9b8', '#e8d0a8', 0, '#efd9b8'], [-0.02, 0.002, 0.062, 0.052, '#e8c89c', '#e8c49a', 0, '#e8c49a'], [0.025, -0.006, 0.06, 0.052, '#e0b080', '#d89a5e', 0, '#d89a5e'], [0.07, -0.02, 0.064, 0.055, '#d89a5e', '#c98a50', 0, '#d89a5e']];
      eMesh(loftGeo(SK, 18, Math.PI, 0.45, 0.8, 1.6), coatMat, headPivot);
      eMesh(loftGeo([[-0.17, -0.03, 0.023, 0.021, '#5a5a60'], [-0.21, -0.031, 0.021, 0.019, '#6a6a70'], [-0.24, -0.035, 0.017, 0.017, '#4a4a50'], [-0.265, -0.045, 0.011, 0.012, '#2a2a2e'], [-0.278, -0.062, 0.006, 0.008, '#1a1a1c'], [-0.274, -0.078, 0.001, 0.001, '#1a1a1c']], 9, Math.PI, 0), coatMat, headPivot);
      for (const sx of [-1, 1]) eMesh(loftGeo([[-0.14, 0.006, 0.011, 0.011, '#d0301c', null, sx * 0.05], [-0.128, 0.008, 0.013, 0.013, '#c8281c', null, sx * 0.054], [-0.116, 0.006, 0.01, 0.01, '#a02018', null, sx * 0.05]], 10, Math.PI, 0), coatMat, headPivot);
      const Hc = featherGeo(), BEARD = ['#1a1816', '#121110', '#0a0a09'];
      for (let i = 0; i < 9; i++) { const sx = (i - 4) * 0.006; Hc.add(V3(sx, -0.05, -0.2 + 0.006 * Math.abs(i - 4)), V3(sx * 3, -1, -0.45), V3(1, 0, 0), 0.075 + erng.range(-0.012, 0.012), 0.012, BEARD, 900 + i, -1, 0.01, -1); }
      eMesh(Hc.build(), eagleMat, headPivot); }
    // the legs: rust-feathered trousers to grey feet and black talons; tucked back in flight, thrown down to carry and to land
    const legs = [];
    for (const sx of [-1, 1]) { const lg = new THREE.Group(); lg.position.set(sx * 0.1, -0.12, 0.08); eagle.add(lg); legs.push(lg);
      eMesh(loftGeo([[0, 0, 0.07, 0.075, '#c4682e'], [0.14, 0, 0.065, 0.065, '#b8602a'], [0.26, 0, 0.04, 0.04, '#9a5028'], [0.32, 0, 0.026, 0.026, '#7a7a80'], [0.42, 0, 0.022, 0.022, '#6a6a70'], [0.44, 0, 0.04, 0.012, '#3a3a3e'], [0.5, 0.01, 0.002, 0.002, '#101010']], 8, Math.PI, 0.6), coatMat, lg); }
    await tick();
    const S_E = 1.2; eagle.scale.setScalar(S_E);
    const BIRD_HALF = 2.6 * S_E;

    // ---------- the gaze: one poi steers the eye the whole way (keyed elevation; the ledge, the falling bone, the slab, the ring) ----------
    const EL = [[0, -13], [1.0, -15], [1.7, -22], [2.4, -21], [4.6, -15], [6, -8], [9.6, -5], [10.2, -12], [12.5, -38], [13.9, -30], [15.6, -6], [17, -8], [18, -4]];
    const GW = 0.85, LA = 36;
    const gC = new THREE.Vector3(), gA = new THREE.Vector3(), gT = new THREE.Vector3(), gOut = new THREE.Vector3(), gDir = new THREE.Vector3();
    const P0 = new THREE.Vector3(), boneP = new THREE.Vector3(), SL = new THREE.Vector3(S.x, S.y + 3, S.z);
    // the falling bone: released at P0 (T 9.8), lands on the slab at T 13.9; it keeps the bird's way and falls 83 m
    const REL = 9.8, HIT = 13.9;
    const KET = (() => { const c = camAtT(7.5, new THREE.Vector3()), l = leftOf(7.5, new THREE.Vector3()); return new THREE.Vector3(c.x - l.x * 175, c.y + 60, c.z - l.z * 175 - 40); })();   // the griffon kettle
    const boneAt = (Tt, out) => { const k = sat((Tt - REL) / (HIT - REL)), kh = k * (1.12 - 0.12 * k); return out.set(mix(P0.x, S.x, kh), P0.y + (S.y + 0.15 - P0.y) * k * k, mix(P0.z, S.z, kh)); };
    const gazeDir = (Tt, out) => {
      const d = sat(Tt / DUR) * path.length; path.posAtDist(d, gC); path.posAtDist(Math.min(path.length + LA, d + LA), gA); gA.sub(gC);
      const az = Math.atan2(gA.x, -gA.z), el = keyed(EL, Tt) * D2R;
      out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      const toward = (p, w) => { if (w <= 0) return; gT.copy(p).sub(gC).normalize(); out.lerp(gT, w).normalize(); };
      toward(_pa.set(L.x, L.y + 1.5, L.z), 0.8 * bump(Tt, 1.8, 2.6, 3.9, 4.7));
      if (Tt > 9.6 && Tt < 14.2) toward(boneAt(Math.max(REL, Tt), _pb), 0.9 * bump(Tt, 9.75, 10.25, 13.75, 14.05));
      toward(KET, 0.4 * bump(Tt, 6.8, 7.4, 8.4, 9));
      toward(SL, 0.85 * bump(Tt, 13.8, 14.1, 14.8, 15.2));
      toward(E, 0.9 * sstep(15.0, 16.0, Tt));
      const e2 = Math.max(-45 * D2R, Math.min(8 * D2R, Math.asin(Math.max(-1, Math.min(1, out.y))))), hl = Math.hypot(out.x, out.z) || 1;
      return out.set(out.x / hl * Math.cos(e2), Math.sin(e2), out.z / hl * Math.cos(e2)); };
    const gazeAt = (time, u) => { const Tt = (u || 0) * DUR; gazeDir(Tt, gOut);
      // the engine blends this poi with the look-ahead along the path; aim past the wanted direction by just enough to land on it
      gA.normalize(); const c = gOut.dot(gA), lam = (1 - GW) * c + Math.sqrt(Math.max(0, (1 - GW) * (1 - GW) * (c * c - 1) + GW * GW));
      return gOut.multiplyScalar(lam).addScaledVector(gA, -(1 - GW)).normalize().multiplyScalar(600).add(gC); };

    // ---------- the bird's flight: along the gaze ray 12-16 m ahead in the follow phases; on the ledge and the slab, in the world ----------
    const fP = new THREE.Vector3(), fR = new THREE.Vector3(), fU = new THREE.Vector3(), aP = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3();
    const qF = new THREE.Quaternion(), qA = new THREE.Quaternion(), qT = new THREE.Quaternion(), mL = new THREE.Matrix4(), ZERO = new THREE.Vector3(), eE = new THREE.Euler();
    const FRAC = [[0, -0.32], [1.2, -0.2], [4.8, -0.1], [6, 0.02], [9.6, 0.12], [10.4, 0.1], [13.6, 0.16], [14.2, 0.1]];
    const LAT = [[0, 0.1], [2, -0.15], [6, -0.2], [8, 0.05], [9.6, -0.1], [12, 0.1], [14, 0]];
    let birdD = 15, tanH = 0.35;
    const TANV = Math.tan(32 * D2R);
    const birdFollow = (Tt, out) => { gazeDir(Tt, gDir); fR.crossVectors(gDir, UPV).normalize(); fU.crossVectors(fR, gDir).normalize();
      return out.copy(gC).addScaledVector(gDir, birdD).addScaledVector(fR, keyed(LAT, Tt) * tanH * birdD).addScaledVector(fU, keyed(FRAC, Tt) * TANV * birdD); };
    const ledgeSpot = (Tt, out) => { const hop = 0.28 * (bump(Tt, 2.75, 2.85, 2.9, 3.0) + bump(Tt, 3.02, 3.12, 3.17, 3.27)), f = fwdOf(4.4, tA); return out.set(L.x + f.x * (0.6 + 0.5 * sstep(2.75, 3.3, Tt)), L.y + 0.8 + hop, L.z + f.z * (0.6 + 0.5 * sstep(2.75, 3.3, Tt))); };
    const slabSpot = (out) => { const f = fwdOf(13.9, tA), l = leftOf(13.9, tB); return out.set(S.x + f.x * 3.2 + l.x * 1.2, S.y + 0.6, S.z + f.z * 3.2 + l.z * 1.2); };
    const qLook = (dir, out) => { mL.lookAt(ZERO, dir, UPV); return out.setFromRotationMatrix(mL); };   // the bird's -Z along dir
    // where the bird is at T (with the flight weights), used for its pose and for the release point
    const birdPos = (Tt, out) => { birdFollow(Tt, out); const wL = bump(Tt, 1.45, 2.45, 3.65, 4.9), wS = sstep(14.0, 15.05, Tt);
      if (wL > 0) out.lerp(ledgeSpot(Tt, aP), sstep(0, 1, wL)); if (wS > 0) out.lerp(slabSpot(aP), wS); return out; };
    const wristV = new THREE.Vector3(), shV = new THREE.Vector3(), wOpen = new THREE.Vector3(), wShut = new THREE.Vector3(), qRoll = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1), NEGZ = new THREE.Vector3(0, 0, -1), eO = new THREE.Vector3();
    const talon = new THREE.Vector3();
    const poseBird = (time, Tt, camera) => {
      const pe = camera.projectionMatrix.elements; tanH = 1 / pe[0];
      birdD = Math.max(11, Math.min(20, BIRD_HALF / (0.36 * tanH)));
      const wL = bump(Tt, 1.45, 2.45, 3.65, 4.9), wS = sstep(14.0, 15.05, Tt), fly = 1 - Math.max(wL, wS);
      birdPos(Tt, eagle.position);
      // heading: along the path ahead of the bird; in the stoop, at the bone; banking into the turns
      const d = sat(Tt / DUR) * path.length; path.tangentAtDist(d + birdD, tA); path.tangentAtDist(d + birdD + 25, tB);
      const turn = Math.max(-0.4, Math.min(0.4, (tA.z * tB.x - tA.x * tB.z) * 3));
      if (Tt > REL && Tt < HIT + 0.3) { boneAt(Math.min(HIT, Tt + 0.3), aP); boneAt(Math.min(HIT, Tt + 0.3) - 0.3, tB); tB.subVectors(aP, tB).normalize(); tA.lerp(tB, 0.7 * bump(Tt, REL, 10.4, 13.4, 14.1)).normalize(); }
      if (Tt > 1.1 && Tt < 2.5) { tB.copy(ledgeSpot(2.5, aP)).sub(eagle.position).normalize(); tA.lerp(tB, 0.6 * bump(Tt, 1.1, 1.6, 2.2, 2.5)).normalize(); }
      const relRoll = 0.55 * bump(Tt, 9.8, 10.0, 10.5, 11.3) - 0.45 * bump(Tt, 1.1, 1.5, 1.9, 2.3) + turn * 1.6 + 0.05 * Math.sin(time * 0.53);
      qLook(tA, qF).multiply(qT.setFromEuler(eE.set(0.06 * Math.sin(time * 0.4), 0, relRoll, 'YXZ')));
      // standing: level, facing on along the line, nose a little up
      fwdOf(Tt < 9 ? 4.4 : 13.9, tB); qLook(tB, qA).multiply(qT.setFromEuler(eE.set(0.12 + 0.25 * bump(time % 1.7, 0.2, 0.35, 0.5, 0.7) * sstep(15.4, 15.8, Tt), 0, 0)));
      eagle.quaternion.copy(qA).slerp(qF, fly);
      // the wings: flat with drooped hands in the soar; deep slow beats (0.6 Hz) on the take-off and the laden climb; half-folded in the stoop;
      // a flare to land (wings up, tail fanned, legs thrown forward); shut on the ground
      const landed = bump(Tt, 2.55, 2.75, 3.5, 3.7) + sstep(15.1, 15.4, Tt), fold = Math.max(0.55 * bump(Tt, 10.0, 10.6, 13.3, 13.95), landed);
      const flare = bump(Tt, 2.0, 2.3, 2.5, 2.75) + bump(Tt, 14.45, 14.85, 15.05, 15.3) + 0.5 * bump(Tt, 3.55, 3.7, 3.8, 4.0);
      const beat = (1 - fold) * (bump(Tt, 3.55, 3.75, 4.5, 5.0) + 0.5 * bump(Tt, 5.0, 5.6, 8.9, 9.6)), st = Math.sin(time * 2 * PI * 0.6), lag = Math.sin(time * 2 * PI * 0.6 - 0.9);
      uTrem.value = 1 + 2 * fold * (1 - landed) + 1.5 * flare;
      const hf = sstep(0, 0.6, fold);
      handMat.uniforms.uClose.value = 0.86 * hf - 0.14 * flare;
      tailMat.uniforms.uClose.value = 0.45 * fold - 0.7 * flare - 0.15 * Math.abs(turn) * 3;
      tailPivot.rotation.set(-0.05 + 0.25 * flare + 0.1 * landed, 0, -turn * 1.8 + 0.12 * Math.sin(time * 0.7) * fly);   // the rudder: the tail twists to steer
      hands.forEach((hand, k) => { const sx = k ? -1 : 1, arm = arms[k];
        wOpen.set(sx * (1.32 + 0.04 * flare), 0.04 + 0.32 * beat * st + 0.22 * flare, -0.45 - 0.14 * flare); wShut.set(sx * 0.48, 0.06, -0.36);
        wristV.lerpVectors(wOpen, wShut, fold); hand.position.copy(wristV);
        hand.rotation.set(0.14 * beat * lag + 0.2 * flare - 0.05 * hf, -sx * mix(1.32 - 0.18 * flare, 2.98, hf), sx * (-0.12 * (1 - fold) * (1 - flare) + 0.16 * beat * lag + 0.14 * flare), 'YXZ');   // (hands droop in the soar)
        shV.set(sx * 0.24, 0.02, -0.3); arm.position.copy(shV); arm.quaternion.setFromUnitVectors(NEGZ, eO.copy(wristV).sub(shV).normalize()).multiply(qRoll.setFromAxisAngle(ZAX, -sx * 0.2 * fold));
        arm.scale.set(mix(1, 0.7, fold), 1, shV.distanceTo(wristV)); });
      // legs: down to carry (the bone lengthwise under the body) and to stand; forward in the flare
      const carry = sstep(3.25, 3.4, Tt) * (1 - sstep(9.8, 10.0, Tt)), down = Math.max(carry, landed, flare);
      for (const lg of legs) lg.rotation.set(mix(0.2, PI / 2, down) + 0.6 * flare, 0, 0);
      // the head looks: to the ledge, down at the bone in the fall, at the burst; pecks on the ground
      const peck = landed * (0.35 + 0.3 * Math.sin(time * 5.5)) * (bump(Tt, 2.9, 3.0, 3.3, 3.45) + sstep(15.4, 15.7, Tt));
      const hy = -0.45 * bump(Tt, 1.0, 1.4, 2.0, 2.4) + 0.3 * bump(Tt, 6.5, 7.2, 8.0, 8.8) + 0.1 * Math.sin(time * 0.31);
      headPivot.rotation.set(0.35 * bump(Tt, 9.9, 10.3, 13.4, 13.9) + peck, hy - turn * 1.2, turn * 0.5, 'YXZ');
      eagle.updateMatrixWorld(true);
    };
    // the release point: where the talons are at T 9.8 (deterministic: the same flight, evaluated once per frame shape)
    const releaseAt = () => { birdPos(REL, P0); P0.y -= 0.45; };

    // ---------- life: griffons kettling over the south wall, choughs on the lift, the ravens at the ledge, izards, far vultures, sheep ----------
    const fauna = F.makeFauna(scene, { light: { sunDir, sunColor: SUN_C, sunIntensity: SUN_I * 0.6, sky: HEMI_SKY, skyIntensity: HEMI_I * 0.5, ground: HEMI_GND, groundIntensity: HEMI_I * 0.5 } });
    const frng = rng.fork('fauna');
    { const c = camAtT(7.5, new THREE.Vector3()), l = leftOf(7.5, new THREE.Vector3());
      fauna.add(F.makeFlock({ rng: frng, species: 'eagles', count: 12, center: [c.x - l.x * 175, c.y + 60, c.z - l.z * 175 - 40], radius: 55, height: 30, spread: [30, 18, 30], speed: 9, size: 4.4, glide: 1, amp: 0.1,
        body: '#9a7a58', belly: '#b8946a', wingC: '#8a6c4c', tip: '#2a2420', head: '#e8dcc0', tailC: '#3a3028', rim: 0.5 })); }
    await tick();
    const CH = { species: 'crows', body: '#0d0d12', belly: '#0d0d12', wingC: '#09090c', tip: '#050507', beak: '#f0bd28', legC: '#d8452a', head: '#0d0d12', tailC: '#08080b', size: 1.55, rim: 0.6 };
    fauna.add(F.makeFlock({ rng: frng, ...CH, count: 10, spread: [8, 4, 14], along: { path, side: -25, up: 3, lead: 24, from: 0.3, to: 0.56, drift: 5 } }));
    await tick();
    { const c = camAtT(8, new THREE.Vector3()), l = leftOf(8, new THREE.Vector3());
      fauna.add(F.makeFlock({ rng: frng, ...CH, count: 12, center: [c.x + l.x * 40, c.y + 10, c.z + l.z * 40 - 50], radius: 24, height: 10, spread: [16, 8, 16], wander: [5, 3, 5, 0.5], speed: 9 })); }
    await tick();
    fauna.add(F.makeFlock({ rng: frng, ...CH, beak: '#141414', legC: '#141414', count: 2, size: 3.0, center: [L.x, L.y + 5, L.z], radius: 9, height: 3, spread: [3, 1, 3], wander: [2, 1, 2, 0.4], speed: 7 }));   // the ravens, put off the bones
    await tick();
    fauna.add(F.makeFlock({ rng: frng, species: 'eagles', count: 3, center: [cx(560) - 60, 640, -560], radius: 110, height: 40, spread: [60, 30, 60], speed: 10, size: 4.6, glide: 1, amp: 0.1,
      body: '#3c3a40', belly: '#c4682e', wingC: '#40434f', tip: '#23242c', head: '#efd9b8', tailC: '#2c2e34', rim: 0.5 }));   // other lammergeiers, far over the head
    await tick();
    { const c = E.clone(), l = leftOf(17, new THREE.Vector3());
      fauna.add(F.makeHerd({ rng: frng, species: 'antelope', count: 8, coat: '#a8784a', accent: '#2a2018', center: [c.x - l.x * 85, 0, c.z - l.z * 85 + 20], radius: 26, mode: 'migrate', gait: 'run', heightAt: groundAt, size: 1.0 })); }
    await tick();
    // sheep: tiny, grazing the floor meadows
    const SHP = 34, sheepG = own(mergeGeometries([new THREE.SphereGeometry(0.5, 8, 6).scale(1.3, 0.85, 0.85), new THREE.SphereGeometry(0.2, 6, 5).translate(0.68, 0.12, 0)].map((g) => { g.deleteAttribute('uv'); return g; })));
    const sheep = new THREE.InstancedMesh(sheepG, own(new THREE.MeshLambertMaterial({ color: '#ece6da' })), SHP), shd = [];
    for (let i = 0; i < SHP; i++) { const s = frng.range(-400, 200), n = riverN(s) + frng.range(18, 60) * (frng() < 0.5 ? -1 : 1); shd.push({ x: cx(s) + n, z: -s, dir: frng.range(0, 6.28), ph: frng.range(0, 6.28), v: frng.range(0.5, 1.5), sc: frng.range(0.9, 1.15) }); }
    sheep.frustumCulled = false; scene.add(sheep);
    await tick();

    // ---------- particles: the burst (bone dust, marrow glints, lit shards that bounce once, a short flash), the falling bone's
    // dust trail, thermal motes along the sunlit wall ----------
    const prng = rng.fork('burst');
    const pxU = { value: 900 }, tauU = { value: -1 }, timeU = LU.uTime;
    const mkBurst = (count, opts) => { const pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), inf = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) { const th = prng.range(0, 6.2832), up = Math.pow(prng(), opts.upPow), sp = prng.range(opts.sp[0], opts.sp[1]) * (prng() < 0.12 ? 1.6 : 1), hz = Math.sqrt(1 - up * up);
        vel[i * 3] = Math.cos(th) * hz * sp; vel[i * 3 + 1] = up * sp * opts.upK; vel[i * 3 + 2] = Math.sin(th) * hz * sp;
        inf[i * 4] = prng.range(opts.size[0], opts.size[1]); inf[i * 4 + 1] = prng.range(0, opts.delay); inf[i * 4 + 2] = prng.range(0, 6.28); inf[i * 4 + 3] = prng.range(0.7, 1.3); }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3)); g.setAttribute('aInf', new THREE.BufferAttribute(inf, 4));
      const m = own(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
        uniforms: { uTau: tauU, uPx: pxU, uTime: timeU, uO: { value: new THREE.Vector3(S.x, S.y + 0.3, S.z) }, uCol: { value: new THREE.Color(opts.color) }, uSky: LU.uSky, uSun: LU.uLamp, uGlint: { value: opts.add ? 1 : 0 } },
        vertexShader: /* glsl */`attribute vec3 aVel; attribute vec4 aInf; uniform float uTau, uPx, uTime, uGlint; uniform vec3 uO; varying float vA; varying float vTw;
          void main(){ float t = uTau - aInf.y; if (t < 0.) { gl_Position = vec4(2., 2., 2., 1.); vA = 0.; return; }
            float k = mix(1.3, .7, uGlint), dr = (1. - exp(-t * k)) / k;
            float buoy = mix(2.2 * t + .38 * t * t, 3. * t + .5 * t * t, uGlint) * aInf.w;                     // the plume rises: a thermal of dust
            vec3 p = uO + aVel * dr + vec3(.9 * sin(t * .7 + aInf.z) * t, buoy, .6 * cos(t * .5 + aInf.z) * t);
            vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
            float sz = aInf.x * (1. + mix(.9, .1, uGlint) * t);
            gl_PointSize = clamp(sz * uPx / max(-mv.z, .1), 1., 48.);
            vA = smoothstep(0., .08, t) * (1. - smoothstep(mix(4.5, 3.5, uGlint), mix(8., 7., uGlint), t));
            vTw = uGlint > .5 ? .55 + .45 * sin(uTime * 2. * 3.14159 * (1.2 + .8 * fract(aInf.z)) + aInf.z * 7.) : 1.; }`,
        fragmentShader: /* glsl */`uniform vec3 uCol, uSky, uSun; uniform float uGlint; varying float vA; varying float vTw;
          void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r = dot(q, q); if (r > 1.) discard;
            float a = uGlint > .5 ? exp(-r * 4.) : (1. - r) * (1. - r);
            vec3 c = uGlint > .5 ? uCol * 1.3 * vTw : uCol * (uSky * 1.25 + uSun * .5 * (1. - .4 * q.y));
            gl_FragColor = vec4(c, a * vA * (uGlint > .5 ? .9 * vTw : .45)); }` }));
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.visible = false; scene.add(pts); return pts; };
    const dust = mkBurst(600, { sp: [2, 11], upPow: 0.6, upK: 0.8, size: [0.15, 0.4], delay: 0.25, color: '#f4ecdc', add: false });
    const glints = mkBurst(150, { sp: [2, 9], upPow: 0.4, upK: 1.0, size: [0.04, 0.1], delay: 0.4, color: '#ffd890', add: true });
    glints.renderOrder = 3;
    // shards: lit, instanced, they fly out and bounce once on the slab
    const SHN = 44, shG = own(new THREE.TetrahedronGeometry(0.11)), shards = new THREE.InstancedMesh(shG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), SHN), shv = [];
    for (let i = 0; i < SHN; i++) { const th = prng.range(0, 6.28), sp = prng.range(2, 7); shv.push({ vx: Math.cos(th) * sp, vy: prng.range(3, 8), vz: Math.sin(th) * sp, sc: prng.range(0.5, 1.6), spin: prng.range(3, 9) }); }
    shards.frustumCulled = false; shards.visible = false; scene.add(shards);
    for (let i = 0; i < SHN; i++) shards.setColorAt(i, _c.set('#efe6d2').lerp(OLD, prng() * 0.4));
    const flash = new THREE.Mesh(own(new THREE.SphereGeometry(1, 16, 12)), own(new THREE.MeshBasicMaterial({ color: '#fff0c8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    flash.visible = false; scene.add(flash);
    // the bone's dust trail
    const TN = 70, tpos = new Float32Array(TN * 3), tcol = new Float32Array(TN * 3), tg = own(new THREE.BufferGeometry());
    tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    const trail = new THREE.Points(tg, own(new THREE.PointsMaterial({ map: mistT, size: 0.4, opacity: 0.25, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
    trail.frustumCulled = false; scene.add(trail);
    // thermal motes: sparse gold in the updraft along the sunlit wall during the climb
    const mc = camAtT(7.5, new THREE.Vector3()), ml = leftOf(7.5, new THREE.Vector3());
    const motes = fx.makeParticles({ rng: prng, preset: 'dust', count: 300, follow: false, center: [mc.x + ml.x * 45, mc.y + 10, mc.z + ml.z * 45 - 30], box: [25, 90, 190], near: [3, 8], velocity: [0, 1.4, 0], velocityRandom: [0.3, 0.5, 0.3],
      size: [0.04, 0.09], colors: ['#ffe2a0', '#ffd890', '#fff0c8'], intensity: 0.8, opacity: 0.7, additive: 1, twinkle: 0.5 });
    scene.add(motes.object); motes.setOpacity(0);
    await tick();

    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v2 = new THREE.Vector2();
    let relAspect = -1;
    return {
      scene, path, duration: DUR, title: 'The Bone Breaker', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 64, near: 0.3, nearThrough: 0.5, far: 6000, lookAhead: LA, sway: 0.3, bank: 0.5 },
      pois: [{ at: gazeAt, from: 0.0, to: 1.0, weight: GW, fade: 0.02 }],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#f2d6a2', veil: '#f2d6a2', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.3, radius: 0.5, threshold: 0.95 }, grade: { saturation: 1.06, contrast: 1.02, tint: '#fff6ea', shadowTint: '#2a3a60', vignette: 0.15, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const Tt = Math.max(0, (u || 0) * DUR);
        LU.uTime.value = t;
        sky.update(dt, t, camera); terrain.update(dt, t); boulders.update?.(dt, t);
        forest.update(dt, t, camera); pines.update(dt, t, camera); shrubs.update(dt, t, camera); tufts.update(dt, t, camera); cumulus.update(dt, t, camera); river.update(dt, t, camera); for (const w of falls) w.update(dt, t, camera); fog.update(dt, t, camera);
        fauna.update(dt, t, camera, u);
        if (ctx.renderer) { ctx.renderer.getDrawingBufferSize(_v2); pxU.value = _v2.y / (2 * Math.tan(camera.fov * D2R / 2)); }
        // the bird (its release point follows the frame's shape)
        if (camera.aspect !== relAspect) { relAspect = camera.aspect; const pe = camera.projectionMatrix.elements; tanH = 1 / pe[0]; birdD = Math.max(11, Math.min(20, BIRD_HALF / (0.36 * tanH))); releaseAt(); }
        poseBird(t, Tt, camera);
        // the hero bone: on the ledge, then in the talons, then tumbling
        if (Tt < 3.3) { const f = fwdOf(4.4, tA); hero.position.set(L.x + f.x * 1.6, L.y + 0.12, L.z + f.z * 1.6); hero.rotation.set(0.05, Math.atan2(f.x, f.z) + 0.7, 0.1); }
        else if (Tt < REL) { eagle.localToWorld(talon.set(0, -0.62, 0.1)); hero.position.copy(talon); hero.quaternion.copy(eagle.quaternion); }
        else if (Tt < HIT) { boneAt(Tt, boneP); hero.position.copy(boneP); const tau = Tt - REL; hero.rotation.set(tau * 5.5, tau * 2.1 + 0.3, tau * 3.3); }
        hero.visible = Tt < HIT;
        // the trail behind the falling bone
        const on = Tt > REL && Tt < HIT + 0.25;
        for (let i = 0; i < TN; i++) { const tt = Math.max(REL, Tt - i * 0.05); boneAt(Math.min(HIT, tt), boneP); const n = i * 3, f = (on && Tt - i * 0.05 >= REL ? 1 : 0) * Math.pow(1 - i / TN, 1.5) * 0.4 * sstep(2, 8, i) * (1 - sstep(HIT, HIT + 0.25, Tt));
          tpos[n] = boneP.x; tpos[n + 1] = boneP.y; tpos[n + 2] = boneP.z; tcol[n] = f; tcol[n + 1] = f * 0.95; tcol[n + 2] = f * 0.86; }
        tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true; trail.visible = on;
        // the burst
        const tau = Tt - HIT, burst = tau >= 0 && Tt > 1;
        tauU.value = tau; dust.visible = glints.visible = shards.visible = burst;
        if (burst) {
          for (let i = 0; i < SHN; i++) { const v = shv[i], t1 = 2 * v.vy / 9.8, v1 = 0.3 * v.vy, t2 = 2 * v1 / 9.8, tc = Math.min(tau, t1 + t2);
            let y; if (tau < t1) y = v.vy * tau - 4.9 * tau * tau; else { const q = Math.min(tau - t1, t2); y = v1 * q - 4.9 * q * q; }
            const hx = 1 - Math.exp(-tc * 1.2);
            _p.set(S.x + v.vx * hx / 1.2, S.y + 0.15 + Math.max(0, y), S.z + v.vz * hx / 1.2); _q.setFromEuler(_e.set(tc * v.spin, tc * v.spin * 0.7, i)); _s.set(v.sc, v.sc * 2.4, v.sc);
            shards.setMatrixAt(i, _m.compose(_p, _q, _s)); }
          shards.instanceMatrix.needsUpdate = true;
        }
        const fl = burst ? (1 - sstep(0.05, 0.3, tau)) : 0; flash.visible = fl > 0.001; flash.position.set(S.x, S.y + 1.2, S.z); flash.scale.setScalar(1 + 5 * sstep(0, 0.15, tau)); flash.material.opacity = 0.75 * fl;
        motes.update(dt, t); motes.setOpacity(0.7 * bump(Tt, 4.6, 5.6, 9.6, 10.6));
        // sheep amble
        for (let i = 0; i < SHP; i++) { const d = shd[i], m = 4 * Math.sin(t * 0.05 * d.v + d.ph), x = d.x + Math.cos(d.dir) * m, z = d.z + Math.sin(d.dir) * m, yaw = -d.dir + (Math.cos(t * 0.05 * d.v + d.ph) < 0 ? Math.PI : 0);
          _q.setFromEuler(_e.set(0, yaw, 0)); _p.set(x, H(x, z) + 0.45 * d.sc, z); _s.setScalar(d.sc); sheep.setMatrixAt(i, _m.compose(_p, _q, _s)); }
        sheep.instanceMatrix.needsUpdate = true;
        for (const mi of mists) mi.sp.position.x = mi.x + mi.v * t;
      },
      dispose() { if (sky.dispose) sky.dispose(); terrain.dispose?.(); forest.dispose?.(); pines.dispose?.(); shrubs.dispose?.(); tufts.dispose?.(); cumulus.dispose?.(); river.dispose?.(); for (const w of falls) w.dispose?.(); fog.dispose?.(); fauna.dispose?.(); motes.dispose?.(); boulders.dispose?.();
        for (const o of disposables) o.dispose && o.dispose(); },
    };
  },
};
