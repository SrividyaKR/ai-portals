// THE DRAGON BLOOD FOREST: dusk on the Dixam limestone plateau of Socotra. Thick short trunks fork upward into flat-topped
// umbrella canopies. The camera comes in high over the canopy sea, where a flock of Socotra starlings bursts out of a crown and
// leads the way down through a clearing; half of it lands on a crown and lifts again as we pass. Then we travel a long way along
// a faint mossy trail over karst pavement under the trees, past cucumber trees, bottle trees and frankincense on limestone
// outcrops. THE MOMENT: the rising pink moon wakes the forest: a soft peach wave runs ahead of the camera, lighting the tip of
// every rosette (and warming the trail and the pale stone under it) all the way to the moon. The flock drinks and skims at a
// long wadi pool that mirrors the moon, then fans up and out over open pavement toward the misted granite spires of Haggeher.
// Everything is flat matte colour with baked shading: no lights, no highlights; only the wave and the moon glow.
// Nothing is loaded: trees, plants, rocks, birds, ground and textures are built here.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';

const GAP = { x: -6, z: 200, r: 28 };   // the clearing the camera descends through
const F_Z0 = 360, F_Z1 = -330;           // forest extent along the flight (+z is where we come from)
const LIGHT = new THREE.Vector3(-0.4, 0.8, 0.3).normalize();
// the reveal: trees stand normal size at first, then grow to cathedral pillars over the middle of the flight
const RAMP = (z) => 1 + 1.5 * smoothstep(40, -170, z);
const DUR = 17;
const front = (T) => 0.38 + 0.1 * Math.max(0, T - 6.5);   // the wave leaves the camera at 6.5 s and races to the moon (in path u)

// GLSL: the wave crest and the lit share at a path position aU (the same rule as the rosette tips)
const WAVE_GLSL = /* glsl */`
  float waveCrest(float f, float u){ float d = (f - u) / 0.035; return exp(-d * d); }
  float waveLit(float f, float u){ return smoothstep(0., 0.03, f - u); }`;

export default {
  id: 'dragon-blood-forest',
  name: 'The Dragon Blood Forest',
  category: 'wilderness',
  weirdness: 0.4,
  media: ['air', 'open'],
  async build(ctx) {
    const N = ctx.noise, R = ctx.rng;
    const scene = new THREE.Scene();
    const detail = ctx.quality ? (ctx.quality.detail || 1) : 1;
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const updaters = [], trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- ground height (low, broad swells so trunks sit on it) ----------
    const gh = (x, z) => 0.6 * N.fbm2(x * 0.004 + 5, z * 0.004 - 3, 2) + 0.15 * N.n2(x * 0.02, z * 0.02);   // nearly flat, so the camera never bobs

    // ---------- the flight: high over the canopy, down the clearing, long under the ceiling, out into open dusk ----------
    const P = (x, z, up) => [x, gh(x, z) + up, z];
    const pts = [
      P(0, 300, 74), P(-3, 255, 50), P(GAP.x, 222, 28), P(GAP.x, 196, 13), P(-2, 165, 5.5),
      P(8, 100, 4.6), P(14, 30, 5), P(8, -50, 6), P(-6, -125, 8), P(-3, -165, 8.5), P(0, -195, 9), P(2, -218, 9),
    ];
    const path = makePath(pts);
    const duration = DUR;
    const PL = path.length;
    await tick();

    // ---------- sky: blue deepening to deep blue, a few early stars, no sun ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'blueHour', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      zenith: '#232a64', mid: '#7a4c88', horizon: '#cc7f9c', ground: '#cc7f9c', horizonPow: 2.4,
      scatter: 0, sunIntensity: 0, sunGlow: 0, sunElevation: -12, bodies: [],
      stars: 0.2, milkyWay: 0, clouds: { coverage: 0.1, lit: '#b0709a', shade: '#5a3a7a', silver: 0 }, clouds2: false,
    });
    scene.add(sky.object);
    const FOG = new THREE.Color('#c07c9c');
    scene.fog = new THREE.FogExp2(FOG, 0.0029);   // far rows dissolve into pink haze: that is what layers the silhouettes
    scene.background = new THREE.Color('#7a4c88');
    updaters.push((dt, t, cam) => { sky.update(dt, t, cam); });
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    await tick();

    // ---------- textures: leafy mottle for canopies ----------
    const wrapBlob = (g, S, x, y, r, style) => {
      g.fillStyle = style;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue;
        g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill();
      }
    };
    const mkCanvas = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const leafC = mkCanvas(128); {
      const g = leafC.getContext('2d'), S = 128; g.fillStyle = '#c4cec0'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 260; i++) { const v = R.range(0.86, 1.0), r = R.range(4, 14); wrapBlob(g, S, R.range(0, S), R.range(0, S), r, `rgba(${Math.round(v * 205)},${Math.round(v * 216)},${Math.round(v * 204)},0.5)`); }
    }
    const leafTex = own(new THREE.CanvasTexture(leafC)); leafTex.wrapS = leafTex.wrapT = THREE.RepeatWrapping; leafTex.colorSpace = THREE.SRGBColorSpace; leafTex.anisotropy = 4;
    // the forest layout the owner approved depends on the exact order of draws from R: the old ochre ground texture drew
    // 4 numbers for each of its 1,560 blobs here, so the same count is drawn (and the new pavement texture is made later)
    for (let i = 0; i < (160 + 1400) * 4; i++) R();
    await tick();

    // ---------- tree geometry: trunk + forked branches (wood) and the umbrella canopy (leaf) ----------
    const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const mkBuf = () => ({ p: [], c: [], u: [], i: [] });
    const RESIN = new THREE.Color('#7a2030');
    const tube = (b, pp, rr, sides, c0, c1, bk) => {
      const base = b.p.length / 3, tan = new THREE.Vector3(), ax = new THREE.Vector3(), bx = new THREE.Vector3(), nn = new THREE.Vector3(), col = new THREE.Color();
      for (let k = 0; k < pp.length; k++) {
        tan.copy(pp[Math.min(k + 1, pp.length - 1)]).sub(pp[Math.max(k - 1, 0)]).normalize();
        if (k === 0) ax.crossVectors(tan, Math.abs(tan.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0)); else ax.addScaledVector(tan, -ax.dot(tan));   // parallel transport: no twist along the tube
        ax.normalize(); bx.crossVectors(tan, ax).normalize();
        for (let j = 0; j < sides; j++) {
          const a = (j / sides) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          nn.set(0, 0, 0).addScaledVector(ax, ca).addScaledVector(bx, sa);
          b.p.push(pp[k].x + nn.x * rr[k], pp[k].y + nn.y * rr[k], pp[k].z + nn.z * rr[k]);
          const shade = 0.5 + 0.5 * (nn.dot(LIGHT) * 0.5 + 0.5), stripe = 0.9 + 0.12 * ((j & 1) ? 1 : -1), t = k / (pp.length - 1);
          col.copy(c0).lerp(c1, t).multiplyScalar(shade * stripe);
          if (bk) {   // bark: fissures, a darker foot and a lighter crown, and dragon's-blood resin running down the trunk
            col.multiplyScalar((0.8 + 0.34 * N.n2(j * 2.3 + bk * 7, k * 0.7)) * (0.72 + 0.5 * smoothstep(-1.5, 10, pp[k].y)));
            { const sk = N.n2(j * 3.7 + bk * 5, 0.3); if (sk > 0.2 && k > 0) col.lerp(RESIN, Math.min(0.5, (sk - 0.2) * 1.2) * smoothstep(0.1, 0.6, t) * (1 - smoothstep(0.75, 1, t)) * (0.6 + 0.4 * N.n2(j * 1.9, k * 0.6))); }   // narrow, irregular streaks of resin
          }
          b.c.push(col.r, col.g, col.b); b.u.push(0, 0);
        }
      }
      for (let k = 0; k < pp.length - 1; k++) for (let j = 0; j < sides; j++) {
        const a = base + k * sides + j, bb = base + k * sides + (j + 1) % sides, c = a + sides, d = bb + sides;
        b.i.push(a, c, bb, bb, c, d);
      }
      return base;
    };
    const toGeo = (b) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setAttribute('aTip', new THREE.Float32BufferAttribute(b.u.filter((_, i) => !(i & 1)), 1)); g.setIndex(b.i); return g; };

    // A real dragon blood tree: a thick bottle-shaped trunk that forks again and again into a dense upturned umbrella,
    // with a rosette of spiky needle leaves at the end of every twig.
    const HF = 8.2;
    const woodA = new THREE.Color('#3a3048'), woodB = new THREE.Color('#322a40');
    const LEAF_A = new THREE.Color('#27485a'), LEAF_B = new THREE.Color('#3b5b6a'), TIP = new THREE.Color('#c08cc4');
    const addBlade = (buf, base, dir, L, w, col, tipMix = 0.35, tipCol = TIP) => {
      const ax = v3().crossVectors(dir, v3(0.3, 1, 0.2)); if (ax.lengthSq() < 1e-5) ax.set(1, 0, 0);
      ax.normalize().multiplyScalar(w);
      const i0 = buf.p.length / 3;
      buf.p.push(base.x - ax.x, base.y - ax.y, base.z - ax.z, base.x + ax.x, base.y + ax.y, base.z + ax.z, base.x + dir.x * L, base.y + dir.y * L, base.z + dir.z * L);
      for (let j = 0; j < 3; j++) { const m = j === 2 ? tipMix : 0; buf.c.push(col.r * (1 - m) + tipCol.r * m, col.g * (1 - m) + tipCol.g * m, col.b * (1 - m) + tipCol.b * m); buf.u.push(j === 2 ? 1 : 0, 0); }
      buf.i.push(i0, i0 + 1, i0 + 2);
    };
    let curTips = null;
    const rosette = (leaf, tip, dir, r) => {
      if (curTips) curTips.push(tip.x + dir.x * 1.4, tip.y + dir.y * 1.4, tip.z + dir.z * 1.4);
      const n = 7;
      for (let k = 0; k < n; k++) {
        const az = (k / n) * 6.2832 + r.range(0, 0.6), tilt = r.range(0.4, 1.1);
        const d = v3(Math.cos(az) * Math.sin(tilt), Math.cos(tilt), Math.sin(az) * Math.sin(tilt)).addScaledVector(dir, 0.5).normalize();
        addBlade(leaf, tip, d, r.range(2.2, 3.2), 0.16, k & 1 ? LEAF_A : LEAF_B);
      }
    };
    const grow = (wood, leaf, p0, dir, len, rad, lvl, r) => {
      const d2 = dir.clone(); d2.y += 0.18; d2.normalize();                          // branches curve upward
      const p1 = p0.clone().addScaledVector(dir, len * 0.5), p2 = p1.clone().addScaledVector(d2, len * 0.5);
      tube(wood, [p0, p1, p2], [rad, rad * 0.84, rad * 0.66], lvl >= 2 ? 4 : 5, woodA, woodB);
      if (lvl >= 3) { rosette(leaf, p2, d2, r); return; }
      const nSub = lvl === 0 ? 3 : (r.range(0, 1) < 0.5 ? 3 : 2);
      for (let k = 0; k < nSub; k++) {
        const tilt = r.range(0.45, 0.72), phi = (k / nSub) * 6.2832 + r.range(-0.4, 0.4);
        const perp = v3().crossVectors(d2, v3(0, 1, 0)); if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0);
        perp.normalize().applyAxisAngle(d2, phi);
        const nd = d2.clone().applyAxisAngle(perp, tilt); nd.y += 0.2; nd.normalize();
        grow(wood, leaf, p2, nd, len * 0.72, rad * 0.62, lvl + 1, r);
      }
    };
    const makeVariant = (seed) => {
      const r = R.fork('tree' + seed), wood = mkBuf(), leaf = mkBuf(); curTips = [];
      // trunk: one smooth bottle-shaped column with a lean, flared at the foot and again where it forks; bark, resin and a darker foot
      const lx = r.range(-0.9, 0.9), lz = r.range(-0.9, 0.9);
      const kp = [v3(0, -1.5, 0), v3(lx * 0.2, 1.2, lz * 0.2), v3(lx * 0.5, 4.4, lz * 0.5), v3(lx * 0.8, HF - 0.6, lz * 0.8), v3(lx, HF + 0.4, lz), v3(lx, HF + 1.0, lz)], kr = [2.6, 1.9, 1.6, 1.9, 2.1, 1.7], tp = [], tr = [];
      for (let i = 0; i < 15; i++) { const f = (i / 14) * (kp.length - 1), a0 = Math.min(Math.floor(f), kp.length - 2), w = f - a0, e = w * w * (3 - 2 * w); tp.push(kp[a0].clone().lerp(kp[a0 + 1], e)); tr.push(lerp(kr[a0], kr[a0 + 1], e)); }
      tube(wood, tp, tr, 12, woodA, woodB, 1 + seed);   // fifteen rings, so bark and resin change smoothly up the trunk
      const nb = 5, ph = r.range(0, 6.28);
      for (let b = 0; b < nb; b++) {
        const th = ph + (b / nb) * 6.2832 + r.range(-0.25, 0.25), a = r.range(0.85, 1.1);
        grow(wood, leaf, v3(Math.cos(th) * 0.5 + lx, HF + 0.8, Math.sin(th) * 0.5 + lz), v3(Math.cos(th) * Math.sin(a), Math.cos(a), Math.sin(th) * Math.sin(a)), r.range(4.2, 5.0), 1.05, 0, r);
      }
      const tips = curTips; curTips = null;
      return { wood: toGeo(wood), leaf: toGeo(leaf), tips };
    };
    const variants = [makeVariant(0), makeVariant(1), makeVariant(2), makeVariant(3), makeVariant(4)];
    for (const v of variants) { own(v.wood); own(v.leaf); }
    await tick();

    // ---------- plant the forest on a jittered grid; clear the camera corridor and the clearing (the approved rule, unchanged) ----------
    const trees = [], _pp = new THREE.Vector3();
    const place = (x0, x1, sp, mul) => {
      for (let z = F_Z0; z > F_Z1; z -= sp) for (let x = x0; x < x1; x += sp) {
        const jx = x + R.range(-0.22, 0.22) * sp, jz = z + R.range(-0.22, 0.22) * sp, ax = Math.abs(jx), ramp = RAMP(jz);
        if (R() < 0.07) continue;                                   // a deliberate small gap of sky
        if (ax > 220 && R() > 1 - smoothstep(220, 340, ax)) continue;
        if (Math.hypot(jx - GAP.x, jz - GAP.z) < GAP.r) continue;
        if (R() > 1 / (ramp * ramp)) continue;                      // giants stand farther apart
        if (R() < smoothstep(-110, -200, jz)) continue;             // the forest thins out into open dusk at the end
        const sh = R.range(0.9, 1.22) * mul * ramp * (R() < 0.05 ? 0.55 : 1);
        let tx = jx, tz = jz;
        if (ax < 90 && jz < 170) {
          const clr = 3 + 5.2 * sh;
          const nr = path.nearestXZ(jx, jz);
          if (nr.dist < clr) { path.pointAt(nr.u, _pp); const dx = jx - _pp.x, dz = jz - _pp.z, l = Math.hypot(dx, dz) || 1; tx = _pp.x + dx / l * clr; tz = _pp.z + dz / l * clr; if (l < 0.01) tx = _pp.x + clr; }
        }
        trees.push({ x: tx, z: tz, sh, sv: R.range(0.97, 1.04), rot: R.range(0, 6.28), v: R.int(0, 4), tint: R.range(0.9, 1.08) });
      }
    };
    place(-120, 120, 24, 1);
    place(120, 340, 34, 1.32); place(-340, -120, 34, 1.32);
    await tick();

    // ================= after this line the forest is fixed; every later draw uses its own stream =================
    const RS = R.fork('deepen');
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color(), _e = new THREE.Euler();
    const _t = new THREE.Vector3();
    // a frame on the path: point, forward (xz), and the left-hand side (xz)
    const frameAt = (u) => { const p = path.pointAt(u), tg = path.tangentAt(u), l = Math.hypot(tg.x, tg.z) || 1, fx = tg.x / l, fz = tg.z / l; return { p, fx, fz, lx: fz, lz: -fx }; };
    const pathD = (x, z) => path.nearestXZ(x, z).dist;

    // ---------- the wadi pool: a long shallow pool 16 to 30 m left of the trail, mirroring the moon and the sky ----------
    const POOL = (() => {
      const f = frameAt(0.765), A = 30, B = 7;
      let cx = f.p.x + f.lx * 23, cz = f.p.z + f.lz * 23;
      const shape = (th) => 1 + 0.13 * N.n2(Math.cos(th) * 1.6 + 31, Math.sin(th) * 1.6 + 7) + 0.05 * N.n2(Math.cos(th) * 4 + 3, Math.sin(th) * 4);
      const edge = (th, k, o) => { const r = shape(th) * k; o.x = cx + (f.fx * Math.cos(th) * A + f.lx * Math.sin(th) * B) * r; o.z = cz + (f.fz * Math.cos(th) * A + f.lz * Math.sin(th) * B) * r; return o; };
      const o = { x: 0, z: 0 };
      for (let it = 0; it < 20; it++) {   // keep the near bank at least 16 m from the trail
        let mn = 1e9; for (let k = 0; k < 48; k++) { edge(k / 48 * 6.2832, 1.12, o); mn = Math.min(mn, pathD(o.x, o.z)); }
        if (mn >= 16) break; cx += f.lx * 0.6; cz += f.lz * 0.6;
      }
      const d = (x, z) => { const dx = x - cx, dz = z - cz, a = (dx * f.fx + dz * f.fz) / A, b = (dx * f.lx + dz * f.lz) / B; return Math.hypot(a, b) / shape(Math.atan2(b, a)); };
      return { cx, cz, A, B, f, shape, edge, d, u: 0.765 };
    })();
    // the trees the grid set inside the pool step back to its banks (moved, never removed: the forest stays as thick)
    const pushOut = (cx, cz, rad, test) => {
      for (const t of trees) {
        if (!test(t.x, t.z)) continue;
        const dx = t.x - cx, dz = t.z - cz, l = Math.hypot(dx, dz) || 1; let k = 0;
        let nx = t.x, nz = t.z; while (test(nx, nz) && k++ < 60) { nx = cx + dx / l * (l + k * 1.5); nz = cz + dz / l * (l + k * 1.5); }
        if (pathD(nx, nz) > 3 + 5.2 * t.sh) { t.x = nx; t.z = nz; }
      }
    };
    pushOut(POOL.cx, POOL.cz, 0, (x, z) => POOL.d(x, z) < 1.18);

    // ---------- rock outcrops: weathered limestone stacks, 20 to 60 m off; the big one carries a cucumber tree ----------
    const outcrops = [];
    {
      const big = frameAt(0.56);
      outcrops.push({ x: big.p.x - big.lx * 22, z: big.p.z - big.lz * 22, h: 6.2, r: 6.5, big: true });   // 22 m right of the trail
      let tries = 0;
      while (outcrops.length < 11 && tries++ < 400) {
        const u = RS.range(0.22, 0.97), f = frameAt(u), side = RS() < 0.5 ? -1 : 1, d = RS.range(24, 62), h = RS.range(2.6, 6.5), r = h * RS.range(0.9, 1.3);
        const x = f.p.x + f.lx * side * d, z = f.p.z + f.lz * side * d;
        if (pathD(x, z) - r < 15 || POOL.d(x, z) < 2.6 || outcrops.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 25)) continue;
        outcrops.push({ x, z, h, r });
      }
      for (const o of outcrops) pushOut(o.x, o.z, o.r, (x, z) => Math.hypot(x - o.x, z - o.z) < o.r + 3.2);
    }
    await tick();

    // ---------- the forest: instanced by chunk, hidden by distance only ----------
    const CELL = 200, groups = new Map(), chunks = [];
    for (const t of trees) { const key = Math.floor(t.x / CELL) + '|' + Math.floor(t.z / CELL) + '|' + t.v; let g = groups.get(key); if (!g) groups.set(key, g = []); g.push(t); }
    const woodMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    const leafMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    // the crowns' own material: the mild leaf glow, plus a peach rim on every blade tip the wave has reached (path u looked up by z)
    const crownMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    {
      const zu = []; for (let k = 0; k < 33; k++) { const z = 360 - k * 22.5; zu.push(z < path.end.z ? 1 : path.nearestXZ(5, z).u); }
      crownMat.onBeforeCompile = (sh) => {
        sh.uniforms.uFront = wake.uFront; sh.uniforms.uTime = wake.uTime; sh.uniforms.uZU = { value: zu }; sh.uniforms.uPeachRim = { value: new THREE.Color('#ffbd9e') };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTip; uniform float uFront, uTime; uniform float uZU[33]; varying float vTip;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            { mat4 im = mat4(1.);
              #ifdef USE_INSTANCING
                im = instanceMatrix;
              #endif
              vec4 wp = modelMatrix * im * vec4(position, 1.); float f = clamp((360. - wp.z) / 22.5, 0., 31.999); int i = int(f);
              float uu = mix(uZU[i], uZU[i + 1], fract(f)), d = uFront - uu;
              vTip = aTip * step(0.3, uu) * (smoothstep(0., 0.03, d) * (0.75 + 0.25 * sin(uTime * 1.3 + wp.x * 0.7)) + 0.8 * exp(-d * d / 0.0012)); }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uPeachRim; varying float vTip;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb += uPeachRim * 0.25 * vTip;');
      };
      crownMat.customProgramCacheKey = () => 'dbf-crown-rim';
    }
    let gi = 0;
    for (const [key, list] of groups) {
      const v = variants[+key.split('|')[2]];
      const wm = new THREE.InstancedMesh(v.wood, woodMat, list.length), lm = new THREE.InstancedMesh(v.leaf, crownMat, list.length);
      let sx = 0, sz = 0;
      list.forEach((t, i) => {
        _q.setFromAxisAngle(_y, t.rot); _p.set(t.x, gh(t.x, t.z), t.z); _s.set(t.sh, t.sv, t.sh);
        _m.compose(_p, _q, _s); wm.setMatrixAt(i, _m); lm.setMatrixAt(i, _m);
        _c.setRGB(t.tint, t.tint * 1.02, t.tint * 0.98); wm.setColorAt(i, _c); lm.setColorAt(i, _c);
        sx += t.x; sz += t.z;
      });
      wm.computeBoundingSphere(); lm.computeBoundingSphere(); wm.matrixAutoUpdate = lm.matrixAutoUpdate = false; wm.frustumCulled = lm.frustumCulled = false;   // chunks are hidden by distance only, never popped at the frame edge
      scene.add(wm, lm);
      { const cx = sx / list.length, cz = sz / list.length; let rr = 0; for (const t of list) rr = Math.max(rr, Math.hypot(t.x - cx, t.z - cz)); chunks.push({ wm, lm, cx, cz, rr: rr + 45 }); }
      if ((++gi & 3) === 0) await tick();
    }
    // a tree's rosette tips in the world, highest first (where the starlings perch)
    const tipsOf = (t) => {
      const tips = variants[t.v].tips, c = Math.cos(t.rot), sn = Math.sin(t.rot), y0 = gh(t.x, t.z), out = [];
      for (let k = 0; k < tips.length; k += 3) { const x = tips[k] * t.sh, y = tips[k + 1] * t.sv, z = tips[k + 2] * t.sh; out.push(v3(t.x + x * c + z * sn, y0 + y, t.z - x * sn + z * c)); }
      return out.sort((a, b) => b.y - a.y);
    };
    const nearestTree = (x, z, ok) => { let best = null, bd = 1e9; for (const t of trees) { const d = Math.hypot(t.x - x, t.z - z); if (d < bd && (!ok || ok(t))) { bd = d; best = t; } } return best; };

    // ---------- THE MOMENT: the moon wakes the forest. A slow wave of soft peach light runs ahead of the camera along the avenue,
    // lighting the tip of every rosette in turn, all the way to the moon; each then settles to a slow, gentle twinkle. ----------
    const wake = { uTime: { value: 0 }, uFront: { value: 0 }, uViewH: { value: 1080 } };
    const PEACH = new THREE.Color('#ffbd9e'), SHEEN = new THREE.Color('#e0a8c0');
    const extraTips = [];   // tips of the plants on the big outcrop, lit by the same wave
    const buildWake = () => {
      const P_ = [], U_ = [], S_ = [], MAXP = 14000;
      for (const t of trees) {
        if (P_.length / 3 >= MAXP) break;
        const nr = path.nearestXZ(t.x, t.z); if (nr.dist > 75 || nr.u < 0.3) continue;
        const tips = variants[t.v].tips, c = Math.cos(t.rot), sn = Math.sin(t.rot), y0 = gh(t.x, t.z);
        for (let k = 0; k < tips.length; k += 3) {
          if (RS() > 0.7) continue;
          const x = tips[k] * t.sh, y = tips[k + 1] * t.sv, z = tips[k + 2] * t.sh;
          P_.push(t.x + x * c + z * sn, y0 + y, t.z - x * sn + z * c); U_.push(nr.u); S_.push(RS());
        }
      }
      for (const p of extraTips) { P_.push(p.x, p.y, p.z); U_.push(path.nearestXZ(p.x, p.z).u); S_.push(RS()); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(U_, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S_, 1));
      const m = new THREE.ShaderMaterial({
        uniforms: wake, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `uniform float uTime, uFront, uViewH; attribute float aU, aSeed; varying float vA;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.);
            float lit = smoothstep(0., 0.03, uFront - aU);                       // the wave has reached this tree
            float crest = exp(-pow((uFront - aU) / 0.035, 2.));                  // a soft crest travelling with the front
            float tw = 0.7 + 0.3 * sin(uTime * 1.3 + aSeed * 6.2831);            // slow twinkle, about a fifth of a cycle a second
            float fogF = exp(-pow(-mv.z * 0.0029, 2.));
            vA = lit * (0.55 * tw + 0.45 * crest) * fogF * smoothstep(1., 6., -mv.z);   // gone within 6 m of the lens: never a broad halo
            gl_PointSize = clamp(3.2 * projectionMatrix[1][1] * uViewH * 0.5 * (1. + 0.7 * crest) / max(-mv.z, 1.), 2., 28.);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .74, .62), a * a * vA * 0.9); }`,
      });
      const pw = new THREE.Points(own(g), own(m)); pw.frustumCulled = false; pw.renderOrder = 5; scene.add(pw);
    };

    // a ShaderMaterial on scene fog, with the shared wave uniforms
    const fogU = (extra) => Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), { uFront: wake.uFront, uTime: wake.uTime }, extra);

    // ---------- the ground: ochre-mauve soil broken into karst pavement; textured with grit, grikes and dry patches ----------
    const GS = 4400, SEG = Math.round(260 * Math.min(1, 0.7 + detail * 0.3));
    const forestMask = (x, z) => smoothstep(F_Z0 + 20, F_Z0 - 60, z) * smoothstep(F_Z1 - 25, F_Z1 + 70, z) * (1 - smoothstep(210, 380, Math.abs(x)));
    {
      const S = 512, gC = mkCanvas(S), g = gC.getContext('2d'), r = RS.fork('groundTex');
      g.fillStyle = '#d6ccce'; g.fillRect(0, 0, S, S);
      const cols = ['#cfc2c4', '#ddd2d0', '#c6b8bc', '#e2d6d2', '#c0b0b4', '#d8c8c0'];
      for (let i = 0; i < 220; i++) wrapBlob(g, S, r.range(0, S), r.range(0, S), r.range(16, 60), cols[r.int(0, cols.length - 1)] + '44');
      for (let i = 0; i < 2600; i++) wrapBlob(g, S, r.range(0, S), r.range(0, S), r.range(0.8, 2.4), (r() < 0.6 ? '#eee4e2' : '#8a7a80') + '88');   // limestone grit and dark specks
      g.lineCap = 'round';
      for (let i = 0; i < 26; i++) {   // grikes: the dark cracks between clints
        let x = r.range(0, S), y = r.range(0, S), a = r.range(0, 6.28); g.strokeStyle = `rgba(60,44,56,${r.range(0.35, 0.6)})`; g.lineWidth = r.range(1.2, 3.2);
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { let px = x + ox, py = y + oy, pa = a; g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 9; k++) { pa += r.range(-0.6, 0.6); px += Math.cos(pa) * 14; py += Math.sin(pa) * 14; g.lineTo(px, py); } g.stroke(); }
      }
      const gt = own(new THREE.CanvasTexture(gC)); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 8; gt.repeat.set(GS / 14, GS / 14);
      const gg = new THREE.PlaneGeometry(GS, GS, SEG, SEG); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -150);
      const pos = gg.attributes.position, n = pos.count, col = new Float32Array(n * 3), c = new THREE.Color(), ochre = new THREE.Color('#7e6656'), rust = new THREE.Color('#4c4262'), pave = new THREE.Color('#9a8890');
      for (let i = 0; i < n; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, gh(x, z));
        const m = forestMask(x, z), open = 1 - smoothstep(GAP.r * 0.5, GAP.r * 1.5, Math.hypot(x - GAP.x, z - GAP.z));
        const k = (lerp(0.95, 0.85, m) + 0.2 * open * m) * (0.92 + 0.16 * (N.fbm2(x * 0.004 + 9, z * 0.004, 2) * 0.5 + 0.5));
        c.copy(ochre).lerp(rust, smoothstep(0.0, 0.6, N.fbm2(x * 0.006, z * 0.006, 2)) * 0.25);
        c.lerp(pave, 0.45 * smoothstep(-160, -260, z) + 0.12 * smoothstep(0.2, 0.7, N.fbm2(x * 0.02 + 3, z * 0.02, 2)));   // open limestone pavement past the forest
        c.multiplyScalar(k);
        col[i * 3] = c.r * 0.82; col[i * 3 + 1] = c.g * 0.95; col[i * 3 + 2] = c.b * 1.12;
      }
      gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const ground = new THREE.Mesh(own(gg), own(new THREE.MeshBasicMaterial({ vertexColors: true, map: gt })));
      scene.add(ground);
    }
    await tick();

    // ---------- THE TRAIL: a ribbon nine vertices wide, moss cushions over pale limestone grit, a soft broken edge ----------
    const U0 = 0.19;
    {
      const S = 512, tC = mkCanvas(S), g = tC.getContext('2d'), r = RS.fork('trailTex');
      g.fillStyle = '#5e5258'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 70; i++) wrapBlob(g, S, r.range(0, S), r.range(0, S), r.range(14, 44), ['#7a6a70', '#86767a', '#706268', '#7e7074'][r.int(0, 3)] + '99');   // pale limestone showing through
      for (let i = 0; i < 1300; i++) wrapBlob(g, S, r.range(0, S), r.range(0, S), r.range(0.7, 2.0), ['#a89a9c', '#b6a8aa', '#463a42', '#8a7c80'][r.int(0, 3)] + '99');   // grit
      const moss = ['#355a3c', '#264c52', '#4a6a40'];
      for (let i = 0; i < 110; i++) {   // moss cushions: clusters of small domes, lit from the upper left
        const cx = r.range(0, S), cy = r.range(0, S), base = moss[r.int(0, 2)], n = r.int(6, 18), sp = r.range(10, 30);
        for (let k = 0; k < n; k++) {
          const x = cx + r.range(-sp, sp), y = cy + r.range(-sp, sp) * 0.8, rr = r.range(2, 7);
          for (let q = 0; q < 4; q++) wrapBlob(g, S, x + r.range(-rr, rr), y + r.range(-rr, rr) * 0.7, rr * r.range(0.4, 0.9), base + '66');   // irregular, low-contrast clumps
          if (r() < 0.4) wrapBlob(g, S, x, y, rr * 0.35, '#7a8a6c44');
        }
      }
      g.lineCap = 'round';
      for (let i = 0; i < 180; i++) {   // fallen rosette needles
        const x = r.range(0, S), y = r.range(0, S), a = r.range(0, 6.28), L = r.range(8, 26);
        g.strokeStyle = ['#3b5b6a', '#5a4e58', '#7a6a5a', '#27485a', '#a07aa8'][r.int(0, 4)]; g.lineWidth = r.range(1, 2.2);
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L); g.stroke(); }
      }
      for (let i = 0; i < 14; i++) {   // dark cracks
        let x = r.range(0, S), y = r.range(0, S), a = r.range(0, 6.28); g.strokeStyle = 'rgba(40,30,40,0.55)'; g.lineWidth = r.range(1, 2);
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { let px = x + ox, py = y + oy, pa = a; g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 7; k++) { pa += r.range(-0.7, 0.7); px += Math.cos(pa) * 10; py += Math.sin(pa) * 10; g.lineTo(px, py); } g.stroke(); }
      }
      const tTex = own(new THREE.CanvasTexture(tC)); tTex.wrapS = tTex.wrapT = THREE.RepeatWrapping; tTex.colorSpace = THREE.SRGBColorSpace; tTex.anisotropy = 8;
      // a soft blotchy mask for the broken edge
      const mC = mkCanvas(128); { const g2 = mC.getContext('2d'); g2.fillStyle = '#808080'; g2.fillRect(0, 0, 128, 128); for (let i = 0; i < 160; i++) wrapBlob(g2, 128, r.range(0, 128), r.range(0, 128), r.range(4, 16), r() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'); }
      const mTex = own(new THREE.CanvasTexture(mC)); mTex.wrapS = mTex.wrapT = THREE.RepeatWrapping;

      const SEGS = 300, W = 9, TILE = 6, pos = [], uv = [], au = [], ae = [], idx = [], tg = new THREE.Vector3(), pp = new THREE.Vector3();
      let along = 0, prev = null;
      for (let k = 0; k <= SEGS; k++) {
        const u = lerp(U0, 1, k / SEGS); path.pointAt(u, pp); path.tangentAt(u, tg);
        if (prev) along += Math.hypot(pp.x - prev.x, pp.z - prev.z); prev = pp.clone();
        const nx = -tg.z, nz = tg.x, nl = Math.hypot(nx, nz) || 1, w = 0.7 * (3.9 + 1.0 * N.n2(k * 0.07, 3) + 0.4 * N.n2(k * 0.31, 9));
        const sw = 0.8 * N.n2(k * 0.05, 17);   // the trail wanders a little off the line
        for (let j = 0; j < W; j++) {
          const s = (j - (W - 1) / 2) / ((W - 1) / 2), x = pp.x + nx / nl * (s * w + sw), z = pp.z + nz / nl * (s * w + sw);
          pos.push(x, gh(x, z) + 0.07 - 0.03 * Math.abs(s), z); uv.push((s * w + sw) / TILE, along / TILE); au.push(u); ae.push(1 - Math.abs(s));
        }
        if (k < SEGS) for (let j = 0; j < W - 1; j++) { const a = k * W + j; idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1); }
      }
      const g3 = own(new THREE.BufferGeometry()); g3.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g3.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g3.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1)); g3.setAttribute('aEdge', new THREE.Float32BufferAttribute(ae, 1)); g3.setIndex(idx);
      const mat = own(new THREE.ShaderMaterial({
        uniforms: fogU({ uMap: { value: tTex }, uMask: { value: mTex }, uSheen: { value: SHEEN }, uPeach: { value: PEACH } }),
        fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        vertexShader: /* glsl */`attribute float aU, aEdge; varying vec2 vUv; varying float vU, vEdge; varying vec2 vW;
          #include <fog_pars_vertex>
          void main(){ vUv = uv; vU = aU; vEdge = aEdge; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xz;
            vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`uniform sampler2D uMap, uMask; uniform float uFront; uniform vec3 uSheen, uPeach; varying vec2 vUv; varying float vU, vEdge; varying vec2 vW;
          ${WAVE_GLSL}
          #include <fog_pars_fragment>
          void main(){
            vec3 c = texture2D(uMap, vUv).rgb;
            float m = texture2D(uMask, vW * 0.11).r + 0.5 * texture2D(uMask, vW * 0.37 + 0.3).r - 0.75;
            float a = smoothstep(0.02, 0.42, vEdge + m * 0.55);              // a broken, irregular edge: never a straight line
            c = mix(c, uSheen * 0.62, 0.15);                                  // the faint pink sheen of the dusk sky on moss and stone
            c += uPeach * (0.2 * waveCrest(uFront, vU) + 0.03 * waveLit(uFront, vU));   // the wave's crest warms the trail as it passes
            gl_FragColor = vec4(c, a * 0.92);
            #include <fog_fragment>
          }`,
      }));
      const trail = new THREE.Mesh(g3, mat); trail.frustumCulled = false; trail.renderOrder = 1; scene.add(trail);
    }
    await tick();

    // ---------- shared baked-shading geometries for small props ----------
    const bakeFaces = (geo, jitter, rnd, dark = 0.5) => {
      const g = geo.index ? geo.toNonIndexed() : geo, pos = g.attributes.position, cols = new Float32Array(pos.count * 3), a = v3(), b = v3(), c = v3(), n = v3();
      if (jitter) for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 + jitter * N.n2(x * 2.1 + y * 1.3 + 11, z * 2.1 - y * 0.7); pos.setXYZ(i, x * k, y * k, z * k); }
      for (let f = 0; f < pos.count; f += 3) {
        a.fromBufferAttribute(pos, f); b.fromBufferAttribute(pos, f + 1); c.fromBufferAttribute(pos, f + 2);
        n.copy(c).sub(a).cross(b.clone().sub(a)).normalize(); if (n.y < -0.99) n.negate();
        const k = (1 - dark) + dark * (n.dot(LIGHT) * 0.5 + 0.5) + (rnd ? rnd.range(-0.05, 0.05) : 0);
        for (let j = 0; j < 3; j++) { cols[(f + j) * 3] = k; cols[(f + j) * 3 + 1] = k; cols[(f + j) * 3 + 2] = k; }
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeBoundingSphere(); return g;
    };
    const plainMat = own(new THREE.MeshBasicMaterial({ vertexColors: true }));
    const instance = (geo, mat, list) => {
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      list.forEach((o, i) => {
        _q.setFromEuler(_e.set(o.tx || 0, o.rot || 0, o.tz || 0)); _p.set(o.x, o.y ?? gh(o.x, o.z), o.z); _s.set(o.sx ?? o.sc, o.sy ?? o.sc, o.sz ?? o.sc);
        im.setMatrixAt(i, _m.compose(_p, _q, _s)); if (o.col) im.setColorAt(i, o.col);
      });
      if (!list.length) im.count = 0;
      im.frustumCulled = false; scene.add(im); return im;
    };
    const tint = (hexes, r, lo = 0.85, hi = 1.1) => new THREE.Color(hexes[r.int(0, hexes.length - 1)]).multiplyScalar(r.range(lo, hi));
    const beside = (u, off) => { const f = frameAt(u); return { x: f.p.x - f.lx * off, z: f.p.z - f.lz * off }; };   // off > 0: right of the trail

    // ---------- on and beside the trail: pebbles, moss clumps, fallen needle leaves ----------
    {
      const r = RS.fork('trailBits'), pebG = own(bakeFaces(new THREE.IcosahedronGeometry(1, 0), 0, r, 0.55));
      const peb = [], mossL = [], ndl = [];
      for (let i = 0; i < 600; i++) {
        const u = r.range(U0 + 0.01, 0.995), off = (r() < 0.5 ? -1 : 1) * Math.pow(r(), 0.8) * 5, q = beside(u, off), s = r.range(0.05, 0.25) * (r() < 0.1 ? 1.5 : 1);
        if (POOL.d(q.x, q.z) < 1.05) continue;
        peb.push({ x: q.x, z: q.z, y: gh(q.x, q.z) + s * 0.25, sx: s * r.range(1, 1.5), sy: s * r.range(0.45, 0.8), sz: s, rot: r.range(0, 6.28), tx: r.range(-0.3, 0.3), col: tint(['#b8a8b0', '#a89aa0', '#c4b4b8', '#9a8c94', '#cbbcbc'], r, 0.75, 1.0) });
      }
      // pale gravel round the pool
      for (let i = 0; i < 320; i++) {
        const th = i < 160 ? r.range(-Math.PI, 0) : r.range(0, 6.28), q = POOL.edge(th, r.range(0.98, 1.3), {}), s = r.range(0.06, 0.2);
        peb.push({ x: q.x, z: q.z, y: gh(q.x, q.z) + s * 0.3, sx: s * 1.3, sy: s * 0.6, sz: s, rot: r.range(0, 6.28), col: tint(['#cbbcbc', '#d4c6c4', '#b8a8b0'], r, 0.8, 1.0) });
      }
      instance(pebG, plainMat, peb);
      const mossG = own(bakeFaces(new THREE.SphereGeometry(1, 8, 5, 0, 6.2832, 0, Math.PI / 2), 0.18, r, 0.6));
      for (let i = 0; i < 300; i++) {
        const u = r.range(U0 + 0.01, 0.99), off = (r() < 0.5 ? -1 : 1) * r.range(1.2, 6), q = beside(u, off), s = r.range(0.15, 0.55);
        if (POOL.d(q.x, q.z) < 1.05) continue;
        mossL.push({ x: q.x, z: q.z, y: gh(q.x, q.z) - 0.02, sx: s * r.range(1, 1.6), sy: s * r.range(0.3, 0.55), sz: s, rot: r.range(0, 6.28), col: tint(['#3e5a44', '#34504e', '#4e6448', '#465a48'], r, 0.8, 1.0) });
      }
      instance(mossG, plainMat, mossL);
      const nb = mkBuf(); addBlade(nb, v3(0, 0, 0), v3(1, 0.02, 0).normalize(), 1, 0.05, new THREE.Color('#ffffff'), 0.4, new THREE.Color('#d0a0d0'));
      const ndlG = own(toGeo(nb));
      for (let i = 0; i < 400; i++) {
        const u = r.range(U0 + 0.01, 0.99), off = (r() < 0.5 ? -1 : 1) * Math.pow(r(), 0.7) * 4.5, q = beside(u, off), L = r.range(0.35, 0.9);
        ndl.push({ x: q.x, z: q.z, y: gh(q.x, q.z) + 0.1, sc: L, rot: r.range(0, 6.28), tz: r.range(-0.08, 0.08), col: tint(['#3b5b6a', '#5a5060', '#7a6a5a', '#27485a', '#6a5a50'], r, 0.9, 1.2) });
      }
      instance(ndlG, leafMat, ndl);
    }
    await tick();

    // ---------- karst slabs: flat irregular clints with dark grikes between, pale under the dusk, warmed by the wave ----------
    {
      const r = RS.fork('slabs'), vars = [];
      for (let v = 0; v < 4; v++) {
        const g = new THREE.CylinderGeometry(1, 1.06, 0.16, r.int(18, 24), 1);
        const pos = g.attributes.position, ph = r.range(0, 6);
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), k = 0.55 + 0.35 * (N.n2(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + v * 3) * 0.5 + 0.5) + 0.12 * N.n2(Math.cos(a) * 4 + ph, Math.sin(a) * 4) + 0.07 * N.n2(Math.cos(a) * 11 + ph, Math.sin(a) * 11 + v); pos.setX(i, x * k * 1.25); pos.setZ(i, z * k * 0.85); }
        vars.push(bakeFaces(g, 0, r, 0.55)); g.dispose();
      }
      const lists = [[], [], [], []], nS = Math.round(900 * Math.min(1, 0.6 + detail * 0.4));
      let made = 0, tries = 0;
      while (made < nS && tries++ < nS * 4) {
        const late = r() < 0.32, u = late ? r.range(0.8, 1.04) : r.range(U0, 0.99), side = r() < 0.5 ? -1 : 1, s = r.range(0.6, 3.0) * (r() < 0.2 ? 0.6 : 1);
        const off = side * (3.4 + 0.55 * s + Math.pow(r(), 1.5) * (late ? 150 : 95));
        const q = beside(Math.min(u, 1), off); if (u > 1) { q.z -= (u - 1) * PL; }
        if (POOL.d(q.x, q.z) < 1.2 + s / 7 || outcrops.some((o) => Math.hypot(o.x - q.x, o.z - q.z) < o.r + s)) continue;
        const k = 0.82 + 0.2 * (1 - forestMask(q.x, q.z));
        const nr = path.nearestXZ(q.x, q.z);
        lists[made & 3].push({ x: q.x, z: q.z, y: gh(q.x, q.z) + 0.02, sx: s, sy: r.range(0.7, 1.2), sz: s * r.range(0.7, 1.3), rot: r.range(0, 6.28), tx: r.range(-0.07, 0.07), tz: r.range(-0.07, 0.07), col: new THREE.Color().lerpColors(new THREE.Color('#76666e'), new THREE.Color('#948088'), r()).multiplyScalar(k * r.range(0.85, 1.02)), u: nr.u });
        made++;
      }
      const mat = own(new THREE.ShaderMaterial({
        uniforms: fogU({ uSheen: { value: SHEEN }, uPeach: { value: PEACH } }), fog: true, vertexColors: true,
        vertexShader: /* glsl */`attribute float aU; varying vec3 vC; varying float vU, vUp;
          #include <fog_pars_vertex>
          void main(){ vec3 c = color;
            #ifdef USE_INSTANCING_COLOR
              c *= instanceColor;
            #endif
            vC = c; vU = aU; vUp = step(0.0, position.y);
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`uniform float uFront; uniform vec3 uSheen, uPeach; varying vec3 vC; varying float vU, vUp;
          ${WAVE_GLSL}
          #include <fog_pars_fragment>
          void main(){ vec3 c = mix(vC, uSheen * 0.75, 0.12 * vUp);
            c += uPeach * (0.18 * waveCrest(uFront, vU) + 0.03 * waveLit(uFront, vU)) * (0.4 + 0.6 * vUp);
            gl_FragColor = vec4(c, 1.);
            #include <fog_fragment>
          }`,
      }));
      lists.forEach((list, v) => {
        const g = own(vars[v]); g.setAttribute('aU', new THREE.InstancedBufferAttribute(new Float32Array(list.map((o) => o.u)), 1));
        instance(g, mat, list);
      });
    }
    await tick();

    // ---------- rocks (muted, earthy) and far bluffs that give the open ground something to recede to ----------
    {
      const rg = own(bakeFaces(new THREE.IcosahedronGeometry(1, 0), 0, null, 0.45));
      const rockMat = own(new THREE.MeshBasicMaterial({ vertexColors: true }));
      const r = RS.fork('rocks'), nR = Math.round(560 * Math.min(1, 0.6 + detail * 0.4)), list = [];
      const pal = ['#4a3c44', '#52424a', '#3e343e', '#4c3e46', '#564850'];
      for (let i = 0; i < nR; i++) {
        const x = r.range(-260, 260), z = r.range(F_Z1 - 200, F_Z0 - 100), s = r.range(0.4, 1.8) * (r() < 0.08 ? 2.4 : 1), d = pathD(x, z);
        if (d < 9 || (d < 15 && s * 1.4 > 1.2) || POOL.d(x, z) < 1.2) continue;
        list.push({ x, z, y: gh(x, z) + s * 0.2, sx: s * 1.3, sy: s * 0.7, sz: s, rot: r.range(0, 3), tx: r.range(0, 3), tz: r.range(0, 3), col: _c.set(pal[i % pal.length]).multiplyScalar(r.range(0.85, 1.1)).clone() });
      }
      instance(rg, rockMat, list);
      const bl = [];
      for (let i = 0; i < 16; i++) { const x = r.range(-700, 700) + (i % 2 ? 150 : -150), z = r.range(-520, -900), s = r.range(30, 70); bl.push({ x, z, y: gh(x, z) + s * 0.1, sx: s * 2.2, sy: s * r.range(0.3, 0.55), sz: s * 1.4, rot: r.range(0, 3), col: new THREE.Color('#3a3050') }); }
      instance(rg, rockMat, bl);
    }

    // ---------- limestone outcrops: stacks of 4 to 9 squashed, weathered blocks with baked shading ----------
    const ocTops = [];
    {
      const r = RS.fork('outcrops'), base = new THREE.IcosahedronGeometry(1, 1), bp = base.attributes.position;
      const pal = ['#a89098', '#9a8890', '#b0989e', '#a4949a'], col = new THREE.Color(), A = v3(), B = v3(), C = v3(), Nn = v3(), M = new THREE.Matrix4();
      const ocMat = own(new THREE.MeshBasicMaterial({ vertexColors: true }));
      for (const o of outcrops) {
        const P_ = [], C_ = [], y0 = gh(o.x, o.z) - 0.4, nb = o.big ? 9 : r.int(4, 8), parts = [];
        for (let k = 0; k < nb; k++) {   // a ring of big blocks at the foot, smaller ones stacked on top
          const top = k >= Math.ceil(nb * 0.55), a = r.range(0, 6.28), d = top ? r.range(0, o.r * 0.3) : r.range(o.r * 0.35, o.r * 0.7);
          const s = (top ? r.range(0.3, 0.42) : r.range(0.38, 0.55)) * o.r, sq = r.range(0.45, 0.7);
          const y = top ? o.h * r.range(0.45, 0.7) : s * sq * 0.5;
          parts.push({ x: Math.cos(a) * d, y, z: Math.sin(a) * d, s, sq, rot: r.range(0, 6.28), tilt: r.range(-0.15, 0.15), ph: r.range(0, 50) });
        }
        if (o.big) { parts.push({ x: 0, y: o.h * 0.72, z: 0, s: o.r * 0.42, sq: 0.42, rot: r.range(0, 6.28), tilt: 0.03, ph: 7 }); }   // a flat cap for the cucumber tree
        for (const pr of parts) {
          M.compose(_p.set(o.x + pr.x, y0 + pr.y, o.z + pr.z), _q.setFromEuler(_e.set(pr.tilt, pr.rot, pr.tilt * 0.7)), _s.set(pr.s * 1.25, pr.s * pr.sq, pr.s));
          const hex = pal[r.int(0, 3)];
          for (let f = 0; f < bp.count; f += 3) {
            const tri = [A, B, C];
            for (let j = 0; j < 3; j++) { const x = bp.getX(f + j), y = bp.getY(f + j), z = bp.getZ(f + j), w = 1 + 0.16 * N.n2(x * 1.7 + pr.ph, z * 1.7 + y * 1.3) - (y > 0.6 ? 0.25 * (y - 0.6) : 0); tri[j].set(x * w, y * w, z * w).applyMatrix4(M); }
            Nn.copy(C).sub(A).cross(_t.copy(B).sub(A)).normalize(); if (Nn.y < -0.99) Nn.negate();
            for (const q of tri) {
              const k = (0.55 + 0.45 * (Nn.dot(LIGHT) * 0.5 + 0.5)) * (0.72 + 0.28 * smoothstep(y0, y0 + o.h * 0.6, q.y)) * (0.92 + 0.12 * N.n2(q.x * 0.6, q.z * 0.6 + q.y));
              col.set(hex).multiplyScalar(k); P_.push(q.x, q.y, q.z); C_.push(col.r, col.g, col.b);
            }
          }
          ocTops.push({ x: o.x + pr.x, z: o.z + pr.z, y: y0 + pr.y + pr.s * pr.sq * 0.82, o, big: !!o.big, cap: pr === parts[parts.length - 1] && o.big });
        }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C_, 3)); g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, ocMat); mesh.frustumCulled = false; scene.add(mesh);
      }
      base.dispose();
    }
    await tick();

    // ---------- SOCOTRA PLANTS: desert roses, Adenium bottle trees, cucumber trees, frankincense, Croton mounds ----------
    const makeRose = (seed, fat) => {
      const r = R.fork('rose' + seed), wood = mkBuf(), leaf = mkBuf(), cB = new THREE.Color(fat ? '#6a5a62' : '#4e4048'), cC = new THREE.Color(fat ? '#54464e' : '#403640');
      if (fat) tube(wood, [v3(0, -0.5, 0), v3(0, 0.5, 0), v3(0, 1.5, 0), v3(0, 2.4, 0), v3(0, 3.1, 0)], [1.75, 1.55, 1.05, 0.7, 0.5], 12, cB, cC, 21 + seed);   // a fat flared foot
      else tube(wood, [v3(0, -0.5, 0), v3(0, 0.8, 0), v3(0, 2.0, 0), v3(0, 3.0, 0)], [1.5, 1.25, 0.8, 0.55], 10, cB, cC, 11 + seed);
      for (let b = 0; b < (fat ? 5 : 4); b++) {
        const th = r.range(0, 6.28) + b * 1.6, d = v3(Math.cos(th) * 0.8, 0.9, Math.sin(th) * 0.8).normalize(), p0 = v3(0, fat ? 3.1 : 3.0, 0), p1 = p0.clone().addScaledVector(d, 1.0), p2 = p1.clone().addScaledVector(d, 1.0); p2.y += 0.3;
        tube(wood, [p0, p1, p2], [0.5, 0.36, 0.26], 6, cC, cC);
        for (let f = 0; f < 7; f++) {   // a flower: five petals fanned flat, in rose and pale pink
          const c = p2.clone().add(v3(r.range(-0.6, 0.6), r.range(-0.1, 0.5), r.range(-0.6, 0.6))), col = new THREE.Color('#e07aa8').lerp(new THREE.Color('#f4c0d4'), r.range(0, 0.7)), tilt = r.range(-0.4, 0.4);
          for (let k = 0; k < 5; k++) { const a1 = (k / 5) * 6.2832, a2 = ((k + 1) / 5) * 6.2832, i0 = leaf.p.length / 3, R1 = 0.34;
            leaf.p.push(c.x, c.y, c.z, c.x + Math.cos(a1) * R1, c.y + tilt * Math.cos(a1) * 0.2, c.z + Math.sin(a1) * R1, c.x + Math.cos(a2) * R1, c.y + tilt * Math.cos(a2) * 0.2, c.z + Math.sin(a2) * R1);
            for (let j = 0; j < 3; j++) { const m = j === 0 ? 0.0 : 0.25; leaf.c.push(col.r * (1 - m) + 0.55 * m, col.g * (1 - m) + 0.22 * m, col.b * (1 - m) + 0.35 * m); leaf.u.push(0, 0); } leaf.i.push(i0, i0 + 1, i0 + 2); }
        }
      }
      return { wood: own(toGeo(wood)), leaf: own(toGeo(leaf)) };
    };
    // cucumber tree (Dendrosicyos): a swollen pale grey-green trunk, a few stubby branches, sparse tufts of rough leaves
    const makeCucumber = (seed) => {
      const r = RS.fork('cuc' + seed), wood = mkBuf(), leaf = mkBuf(), cA = new THREE.Color('#6e7866'), cB = new THREE.Color('#8a907a');
      const lean = r.range(-0.15, 0.15);
      tube(wood, [v3(0, -0.4, 0), v3(0, 0.6, 0), v3(lean * 0.5, 1.6, 0), v3(lean, 2.6, 0.1), v3(lean * 1.2, 3.3, 0.1)], [0.95, 1.2, 1.05, 0.72, 0.42], 12, cA, cB);
      const nb = r.int(4, 6), tip = new THREE.Color('#9ab070');
      for (let b = 0; b < nb; b++) {
        const th = (b / nb) * 6.28 + r.range(-0.4, 0.4), d = v3(Math.cos(th) * 0.7, r.range(0.7, 1.1), Math.sin(th) * 0.7).normalize(), p0 = v3(lean * 1.1, r.range(2.7, 3.3), 0.1), L = r.range(0.8, 1.5);
        const p1 = p0.clone().addScaledVector(d, L * 0.5), p2 = p1.clone().addScaledVector(d, L * 0.5); p2.y += 0.2;
        tube(wood, [p0, p1, p2], [0.32, 0.22, 0.14], 6, cB, cB);
        for (let k = 0; k < 8; k++) { const a = r.range(0, 6.28), t2 = r.range(0.3, 1.2), dd = v3(Math.cos(a) * Math.sin(t2), Math.cos(t2), Math.sin(a) * Math.sin(t2)); addBlade(leaf, p2, dd, r.range(0.5, 0.85), 0.2, new THREE.Color(k & 1 ? '#4e6a44' : '#62784c'), 0.3, tip); }
      }
      return { wood: own(toGeo(wood)), leaf: own(toGeo(leaf)) };
    };
    // frankincense (Boswellia): a thin twisted trunk with pale peeling papery bark, sparse small crowns
    const makeFrank = (seed) => {
      const r = RS.fork('frank' + seed), wood = mkBuf(), leaf = mkBuf(), cA = new THREE.Color('#a88a62'), cB = new THREE.Color('#c4aa7c'), paper = new THREE.Color('#e4d2a8');
      const tp = []; let x = 0, z = 0;
      for (let k = 0; k < 8; k++) { x += r.range(-0.28, 0.28); z += r.range(-0.28, 0.28); tp.push(v3(x, k * 0.62 - 0.3, z)); }
      const i0 = tube(wood, tp, tp.map((_, k) => lerp(0.34, 0.12, k / 7)), 7, cA, cB);
      for (let i = i0; i < wood.c.length / 3; i++) { const px = wood.p[i * 3], py = wood.p[i * 3 + 1], pz = wood.p[i * 3 + 2], n = N.n2(px * 3 + seed * 9, py * 2.2 + pz * 3); if (n > 0.15) { const c = _c.setRGB(wood.c[i * 3], wood.c[i * 3 + 1], wood.c[i * 3 + 2]).lerp(paper, Math.min(0.75, (n - 0.15) * 2)); wood.c[i * 3] = c.r; wood.c[i * 3 + 1] = c.g; wood.c[i * 3 + 2] = c.b; } }
      const tip = new THREE.Color('#a8b078');
      for (let b = 0; b < 4; b++) {
        const p0 = tp[r.int(4, 7)].clone(), th = r.range(0, 6.28), d = v3(Math.cos(th), r.range(0.5, 1.2), Math.sin(th)).normalize(), L = r.range(1.2, 2.2);
        const p1 = p0.clone().addScaledVector(d, L * 0.5), p2 = p1.clone().addScaledVector(d, L * 0.5); p2.y += 0.25;
        tube(wood, [p0, p1, p2], [0.1, 0.07, 0.045], 5, cB, cB);
        for (let k = 0; k < 11; k++) { const a = r.range(0, 6.28), t2 = r.range(0.4, 1.4), dd = v3(Math.cos(a) * Math.sin(t2), Math.cos(t2), Math.sin(a) * Math.sin(t2)); addBlade(leaf, p2.clone().add(v3(r.range(-0.3, 0.3), r.range(-0.1, 0.2), r.range(-0.3, 0.3))), dd, r.range(0.3, 0.55), 0.08, new THREE.Color(k & 1 ? '#56704a' : '#6a7a50'), 0.3, tip); }
      }
      return { wood: own(toGeo(wood)), leaf: own(toGeo(leaf)) };
    };
    {
      const r = RS.fork('plants');
      // desert roses (kept: 150 of them, 7.5 m and more off the trail)
      const rv = [makeRose(0), makeRose(1)], roses = [[], []];
      for (let i = 0; i < 150; i++) {
        const x = (r() < 0.5 ? -1 : 1) * r.range(7, 70), z = r.range(F_Z0 - 60, -115); if (pathD(x, z) < 7.5 || POOL.d(x, z) < 1.2) continue;
        roses[r.int(0, 1)].push({ x, z, sc: r.range(1.1, 1.9), rot: r.range(0, 6.28) });
      }
      roses.forEach((l, v) => { instance(rv[v].wood, woodMat, l); instance(rv[v].leaf, leafMat, l); });
      // Adenium bottle trees: in clusters on the outcrops and in threes on the open ground
      const av = [makeRose(7, true), makeRose(8, true)], ad = [[], []];
      const okFar = (x, z, rad) => pathD(x, z) - rad >= 15 && POOL.d(x, z) > 1.3;
      const tops = ocTops.filter((t) => !t.cap).sort((a, b) => b.y - a.y);
      const bigTops = tops.filter((t) => t.big).slice(0, 2);
      for (const t of bigTops) { ad[ad[0].length > ad[1].length ? 1 : 0].push({ x: t.x, z: t.z, y: t.y - 0.3, sc: r.range(1.05, 1.3), rot: r.range(0, 6.28) }); extraTips.push(v3(t.x, t.y + 4.5, t.z)); }
      for (const o of outcrops) { if (o.big) continue; const own2 = tops.filter((t) => t.o === o).slice(0, r.int(0, 2)); for (const t of own2) ad[r.int(0, 1)].push({ x: t.x, z: t.z, y: t.y - 0.3, sc: r.range(0.9, 1.25), rot: r.range(0, 6.28) }); }
      let tries = 0;
      while (ad[0].length + ad[1].length < 25 && tries++ < 300) {
        const f = frameAt(r.range(0.25, 0.97)), side = r() < 0.5 ? -1 : 1, d = r.range(19, 70), cx = f.p.x + f.lx * side * d, cz = f.p.z + f.lz * side * d;
        for (let k = 0; k < 3; k++) { const x = cx + r.range(-5, 5), z = cz + r.range(-5, 5); if (okFar(x, z, 3)) ad[r.int(0, 1)].push({ x, z, sc: r.range(1.2, 1.8), rot: r.range(0, 6.28) }); }
      }
      ad.forEach((l, v) => { instance(av[v].wood, woodMat, l); instance(av[v].leaf, leafMat, l); });
      // cucumber trees: one on the big outcrop's cap, the rest scattered 15 to 80 m off
      const cv = [makeCucumber(0), makeCucumber(1), makeCucumber(2)], cl = [[], [], []];
      const cap = ocTops.find((t) => t.cap);
      if (cap) { cl[0].push({ x: cap.x, z: cap.z, y: cap.y - 0.25, sc: 1.35, rot: 0.6 }); extraTips.push(v3(cap.x, cap.y + 4.2, cap.z), v3(cap.x + 1, cap.y + 4.0, cap.z - 1)); }
      tries = 0;
      while (cl[0].length + cl[1].length + cl[2].length < 12 && tries++ < 300) {
        const f = frameAt(r.range(0.22, 0.97)), side = r() < 0.5 ? -1 : 1, d = r.range(18, 80), x = f.p.x + f.lx * side * d, z = f.p.z + f.lz * side * d;
        if (!okFar(x, z, 2.5) || outcrops.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 2)) continue;
        cl[r.int(0, 2)].push({ x, z, sc: r.range(0.95, 1.4), rot: r.range(0, 6.28) });
      }
      cl.forEach((l, v) => { instance(cv[v].wood, woodMat, l); instance(cv[v].leaf, leafMat, l); });
      // frankincense: one leans over the pool's far bank, the others stand thin on the pavement
      const fv = [makeFrank(0), makeFrank(1)], fl = [[], []];
      { const q = POOL.edge(Math.PI * 0.5 + 0.15, 1.12, {}), a = Math.atan2(-POOL.f.lz, POOL.f.lx); fl[0].push({ x: q.x, z: q.z, sc: 1.25, rot: a, tx: 0, tz: 0.32 }); }
      tries = 0;
      while (fl[0].length + fl[1].length < 10 && tries++ < 300) {
        const f = frameAt(r.range(0.3, 0.98)), side = r() < 0.5 ? -1 : 1, d = r.range(17, 75), x = f.p.x + f.lx * side * d, z = f.p.z + f.lz * side * d;
        if (!okFar(x, z, 1.5)) continue;
        fl[r.int(0, 1)].push({ x, z, sc: r.range(0.9, 1.3), rot: r.range(0, 6.28), tx: r.range(-0.12, 0.12), tz: r.range(-0.12, 0.12) });
      }
      fl.forEach((l, v) => { instance(fv[v].wood, woodMat, l); instance(fv[v].leaf, leafMat, l); });
      // Croton mounds: grey-green, 0.6 to 1.4 m; the tall ones keep 15 m off the trail
      const crG = own(bakeFaces(new THREE.IcosahedronGeometry(1, 1), 0.22, r, 0.6)), cr = [];
      for (let i = 0; i < 260 && cr.length < 200; i++) {
        const f = frameAt(r.range(U0, 0.99)), side = r() < 0.5 ? -1 : 1, d = r.range(7, 90), x = f.p.x + f.lx * side * d, z = f.p.z + f.lz * side * d, h = r.range(0.6, 1.4);
        if (pathD(x, z) < (h > 1.2 ? 15 : 7) || POOL.d(x, z) < 1.3 || outcrops.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.5)) continue;
        const w = h * r.range(0.9, 1.5);
        cr.push({ x, z, y: gh(x, z) - h * 0.15, sx: w, sy: h * 0.62, sz: w * r.range(0.8, 1.1), rot: r.range(0, 6.28), col: tint(['#7a8a74', '#6c7c6a', '#8a947e', '#74846e'], r, 0.85, 1.05) });
      }
      instance(crG, plainMat, cr);
      // dry grass tufts (kept: 520)
      const sb = mkBuf(), sr = r.fork('shrub');
      for (let k = 0; k < 11; k++) { const a = sr.range(0, 6.28), t = sr.range(0.15, 0.7), d = v3(Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t)); addBlade(sb, v3(sr.range(-0.2, 0.2), 0, sr.range(-0.2, 0.2)), d, sr.range(0.8, 1.6), 0.05, k & 1 ? new THREE.Color('#566a46') : new THREE.Color('#6e7a4e')); }
      const sg = own(toGeo(sb)), tufts = [];
      for (let i = 0; i < 520; i++) { const x = r.range(-130, 130), z = r.range(F_Z0, F_Z1 + 40); if (pathD(x, z) < 1.8 || POOL.d(x, z) < 1.05) continue; const sc = r.range(1, 2.4); tufts.push({ x, z, sx: sc, sy: sc * r.range(0.8, 1.3), sz: sc, rot: r.range(0, 6.28) }); }
      instance(sg, leafMat, tufts);
      // big limestone boulders, 15 m and more off the trail
      const bg = own(bakeFaces(new THREE.IcosahedronGeometry(1, 1), 0.1, r, 0.45)), bl = [], bpal = ['#4a3c48', '#54464f', '#463c4a', '#5a4a52'];
      for (let i = 0; i < 40; i++) { let x, z, k = 0; do { x = (r() < 0.5 ? -1 : 1) * r.range(10, 90); z = r.range(F_Z0 - 40, F_Z1 + 40); } while ((pathD(x, z) < 15 + 4 || POOL.d(x, z) < 1.6) && k++ < 50); const sc = r.range(2.5, 7); bl.push({ x, z, y: gh(x, z) + sc * 0.25, sx: sc * 1.3, sy: sc * 0.75, sz: sc, rot: r.range(0, 6.28), tx: r.range(0, 0.4), tz: r.range(0, 0.4), col: new THREE.Color(bpal[i % 4]) }); }
      instance(bg, plainMat, bl);
    }
    await tick();
    buildWake();

    // ---------- the wadi pool: sky mirror, the moon's glade, slow ripples, soft ring wakes where the birds touch ----------
    const rings = Array.from({ length: 12 }, () => new THREE.Vector4(0, 0, -99, 0));
    let poolLevel = -1e9;
    {
      const AN = 72, RN = 10, pos = [], ad = [], idx = [], o = {};
      for (let i = 0; i <= RN; i++) for (let k = 0; k < AN; k++) { POOL.edge(k / AN * 6.2832, Math.max(0.001, i / RN), o); poolLevel = Math.max(poolLevel, gh(o.x, o.z)); }
      poolLevel += 0.22;
      for (let i = 0; i <= RN; i++) for (let k = 0; k < AN; k++) { POOL.edge(k / AN * 6.2832, Math.max(0.001, i / RN), o); pos.push(o.x, poolLevel, o.z); ad.push(i / RN); }
      for (let i = 0; i < RN; i++) for (let k = 0; k < AN; k++) { const a = i * AN + k, b = i * AN + (k + 1) % AN; idx.push(a, b, a + AN, b, b + AN, a + AN); }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aD', new THREE.Float32BufferAttribute(ad, 1)); g.setIndex(idx);
      const C = (h) => new THREE.Color(h);
      const mat = own(new THREE.ShaderMaterial({
        uniforms: fogU({ uZen: { value: C('#3a3a78') }, uMid: { value: C('#8a5a96') }, uHor: { value: C('#cc7f9c') }, uTree: { value: C('#2a2236') }, uDeep: { value: C('#2c2434') },
          uMoonC: { value: C('#e094b8') }, uMoonP: { value: new THREE.Vector3(10, 120, -1000) }, uPeach: { value: PEACH }, uT: { value: 0 }, uPoolU: { value: POOL.u }, uRings: { value: rings } }),
        fog: true, side: THREE.DoubleSide,
        vertexShader: /* glsl */`attribute float aD; varying vec3 vW; varying float vD;
          #include <fog_pars_vertex>
          void main(){ vD = aD; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`uniform vec3 uZen, uMid, uHor, uTree, uDeep, uMoonC, uMoonP, uPeach; uniform float uTime, uT, uFront, uPoolU; uniform vec4 uRings[12];
          varying vec3 vW; varying float vD;
          ${WAVE_GLSL}
          #include <fog_pars_fragment>
          void main(){
            vec2 p = vW.xz; float t = uTime;
            vec2 g = 0.018 * vec2(cos(p.x * 0.9 + p.y * 0.3 + t * 0.7), cos(p.y * 1.1 - t * 0.6))
                   + 0.010 * vec2(cos(p.x * 2.3 - p.y * 1.3 + t * 1.3), cos(p.y * 2.1 + p.x * 0.7 + t * 1.1));
            float ringL = 0.;
            for (int i = 0; i < 12; i++) {
              vec4 r = uRings[i]; float a = uT - r.z;
              if (a <= 0. || a > 4.) continue;
              float rad = 0.2 + a * 1.25, d = length(p - r.xy);
              float band = exp(-pow((d - rad) / 0.2, 2.)) * exp(-a * 0.8) * r.w;
              ringL += band; g += (p - r.xy) / max(d, 0.001) * band * 0.10;
            }
            vec3 n = normalize(vec3(-g.x, 1., -g.y)), v = normalize(vW - cameraPosition), rf = reflect(v, n);
            float el = max(rf.y, 0.);
            vec3 sky = mix(uHor, uMid, smoothstep(0.03, 0.4, el)); sky = mix(sky, uZen, smoothstep(0.4, 0.95, el));
            float lit = waveLit(uFront, uPoolU);
            float fringe = 1. - smoothstep(0.035, 0.11, el - 0.03 * sin(atan(rf.z, rf.x) * 37.) * sin(atan(rf.z, rf.x) * 11.));   // the treeline, upside down
            sky = mix(sky, uTree, fringe * 0.85);
            sky += uPeach * 0.16 * lit * exp(-pow((el - 0.1) / 0.025, 2.));                 // the lit rosette tips, a peach thread along the treeline
            vec3 md = normalize(uMoonP - vW); float az = acos(clamp(dot(normalize(rf.xz), normalize(md.xz)), -1., 1.));
            float glade = exp(-pow(az / 0.32, 2.)) * exp(-pow((asin(clamp(rf.y, 0., 1.)) - asin(md.y)) / 0.06, 2.));
            sky = mix(sky, uMoonC, glade * (0.55 + 0.35 * sin(p.x * 3. + p.y * 1.7 + t * 1.4)));   // the moon's glade, broken by ripples
            float fres = 0.6 + 0.4 * pow(1. - max(dot(-v, n), 0.), 3.);
            vec3 c = mix(uDeep, sky, fres);
            c += vec3(0.95, 0.82, 0.88) * ringL * 0.2;
            c = mix(c, uDeep, smoothstep(0.7, 1.0, vD) * 0.7);   // a dark, damp margin
            gl_FragColor = vec4(c, 1.);
            #include <fog_fragment>
          }`,
      }));
      const water = new THREE.Mesh(g, mat); water.frustumCulled = false; water.renderOrder = 1; scene.add(water);
      POOL.uniforms = mat.uniforms;
      // the dark damp rim: from the water's edge out onto the bank, fading
      const rp = [], rc = [], ri = [], dark = new THREE.Color('#3a2e38');
      for (let i = 0; i <= 3; i++) for (let k = 0; k < AN; k++) { const nz = N.n2(k * 0.37 + 5, i * 0.9), kk = 1 + 0.07 * i * (0.6 + 0.8 * (nz * 0.5 + 0.5)); POOL.edge(k / AN * 6.2832, kk, o); rp.push(o.x, i === 0 ? poolLevel + 0.01 : gh(o.x, o.z) + 0.05, o.z); rc.push(dark.r, dark.g, dark.b, (i === 0 ? 0.92 : i === 3 ? 0 : 0.85 - 0.35 * i) * (0.55 + 0.45 * (N.n2(k * 0.9, i + 3) * 0.5 + 0.5))); }
      for (let i = 0; i < 3; i++) for (let k = 0; k < AN; k++) { const a = i * AN + k, b = i * AN + (k + 1) % AN; ri.push(a, b, a + AN, b, b + AN, a + AN); }
      const rg = own(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 4)); rg.setIndex(ri);
      const rim = new THREE.Mesh(rg, own(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
      rim.frustumCulled = false; rim.renderOrder = 1; scene.add(rim);
    }
    await tick();

    // ---------- far RIDGES: a low violet ridge, then the granite spires of Haggeher in two misted layers ----------
    {
      const ridge = (z, h, seed, cTop, cBot, spire) => {
        const pts = [], cols = [], idx = [], top = new THREE.Color(cTop), bot = new THREE.Color(cBot), n = spire ? 220 : 80;
        for (let i = 0; i <= n; i++) {
          const x = -1700 + i * (3400 / n);
          let y = h * (0.35 + 0.65 * (N.fbm2(x * 0.0035 + seed, seed * 3.1, 3) * 0.5 + 0.5));
          if (spire) {   // jagged granite: ridged noise sharpened into needles, with fine teeth
            const rd = 1 - Math.abs(N.n2(x * 0.0065 + seed * 2, seed)), rd2 = 1 - Math.abs(N.n2(x * 0.017 + seed, seed * 5));
            y += spire * smoothstep(210, 380, Math.abs(x - 10)) * Math.pow(rd, 2.2) * (0.6 + 0.4 * (N.n2(x * 0.002, seed) * 0.5 + 0.5)) + spire * 0.1 * Math.pow(rd2, 4) * smoothstep(210, 380, Math.abs(x - 10)) + 3 * N.n2(x * 0.09, seed);
          }
          pts.push(x, y, z, x, -10, z); cols.push(top.r, top.g, top.b, bot.r, bot.g, bot.b);
          if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx);
        const m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }))); m.frustumCulled = false; scene.add(m);
      };
      ridge(-800, 150, 1.3, '#6e4f92', '#a07ab8', 0); ridge(-980, 170, 4.7, '#7d60a0', '#a886c0', 70); ridge(-1180, 220, 8.1, '#8d72ae', '#b090c8', 95);
      // mist: between each pair of ridges, and low over the plateau before them
      const mc = mkCanvas(128); { const g = mc.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,255,255,0.85)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.32)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
      const mt = own(new THREE.CanvasTexture(mc)); mt.colorSpace = THREE.SRGBColorSpace;
      const r = RS.fork('mist'), sprites = [];
      const band = (n, z0, z1, y0, y1, w0, w1, op, hex) => { const m = own(new THREE.SpriteMaterial({ map: mt, color: hex, transparent: true, opacity: op, depthWrite: false, fog: false })); for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(m), w = r.range(w0, w1); sp.scale.set(w, w * r.range(0.12, 0.2), 1); sp.position.set(r.range(-1300, 1300), r.range(y0, y1), r.range(z0, z1)); scene.add(sp); sprites.push({ sp, x0: sp.position.x, v: r.range(1, 3) * (i % 2 ? 1 : -1) }); } };
      band(10, -880, -900, 25, 80, 500, 900, 0.5, '#d6a6cc'); band(8, -955, -970, 40, 120, 500, 900, 0.38, '#dab0d0');
      band(10, -1070, -1090, 50, 150, 600, 1000, 0.45, '#dcb0d2');
      band(10, -420, -720, 6, 22, 220, 420, 0.3, '#d4a0c6');
      updaters.push((dt, t) => { for (const o of sprites) o.sp.position.x = o.x0 + o.v * t; });
      // low ground mist banks drifting under the trees (kept)
      const mists = [];
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(own(new THREE.PlaneGeometry(150, 110).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: mt, color: '#d6a0cc', transparent: true, opacity: 0.085, depthWrite: false }))); m.position.set(r.range(-70, 70), r.range(1.6, 3.4), F_Z0 - 40 - i * 110 + r.range(-30, 30)); m.renderOrder = 2; scene.add(m); mists.push({ m, ph: r.range(0, 6.28), x0: m.position.x }); }
      updaters.push((dt, t) => { for (const o of mists) o.m.position.x = o.x0 + 6 * Math.sin(t * 0.07 + o.ph); });
      // far dragon blood silhouettes on the plateau edge: flat dark umbrellas the haze turns violet
      const sh = new THREE.Shape(); sh.moveTo(-0.05, 0); sh.lineTo(-0.065, 0.42); sh.lineTo(-0.22, 0.5); sh.lineTo(-0.5, 0.56);
      for (let k = 0; k <= 18; k++) { const a = Math.PI - (k / 18) * Math.PI, bump = 1 + 0.06 * Math.sin(k * 2.7); sh.lineTo(Math.cos(a) * 0.55 * bump, 0.58 + Math.sin(a) * 0.3 * bump); }
      sh.lineTo(0.5, 0.56); sh.lineTo(0.22, 0.5); sh.lineTo(0.065, 0.42); sh.lineTo(0.05, 0); sh.closePath();
      const sg = own(new THREE.ShapeGeometry(sh)), sl = [];
      for (let i = 0; i < 90; i++) { const x = r.range(-650, 650), z = r.range(-250, -720); if (Math.abs(x - 2) < 34 + (z > -330 ? 30 : 0) && z > -460) continue; const hh = r.range(8, 15); sl.push({ x, z, y: gh(x, z) - 0.5, sx: hh * r.range(1.1, 1.5), sy: hh, sz: 1, rot: r.range(-0.2, 0.2), col: new THREE.Color('#4a3866').multiplyScalar(r.range(0.9, 1.12)) }); }
      instance(sg, own(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })), sl);
    }

    // ---------- air: a few slow motes (never near the lens), brighter in the wave's light ----------
    {
      const r = RS.fork('motes'), MN = 60, mp = [], mu = [], ms = [];
      for (let i = 0; i < MN; i++) { const u = r.range(0.25, 0.97), q = beside(u, r.range(-14, 14)); mp.push(q.x, gh(q.x, q.z) + r.range(1.2, 8), q.z); mu.push(u); ms.push(r()); }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); g.setAttribute('aU', new THREE.Float32BufferAttribute(mu, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(ms, 1));
      const m = own(new THREE.ShaderMaterial({
        uniforms: wake, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `uniform float uTime, uFront, uViewH; attribute float aU, aSeed; varying float vA;
          ${WAVE_GLSL}
          void main(){
            vec3 p = position + vec3(1.4 * sin(uTime * 0.2 + aSeed * 40.), 0.7 * sin(uTime * 0.33 + aSeed * 80.), 1.0 * cos(uTime * 0.17 + aSeed * 60.));
            vec4 mv = modelViewMatrix * vec4(p, 1.); float d = -mv.z;
            vA = smoothstep(4., 10., d) * (0.3 + 1.1 * waveCrest(uFront, aU)) * exp(-pow(d * 0.0029, 2.));
            gl_PointSize = clamp(0.14 * projectionMatrix[1][1] * uViewH * 0.5 / max(d, 1.), 1.5, 8.);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .86, .72), a * a * vA * 0.75); }`,
      }));
      const motes = new THREE.Points(g, m); motes.frustumCulled = false; motes.renderOrder = 4; scene.add(motes);
    }

    // ---------- the big pink moon, with soft markings that swirl very slowly, echoing the portal ----------
    {
      const c = mkCanvas(256), g = c.getContext('2d'), r = RS.fork('moon');
      const rg = g.createRadialGradient(128, 128, 20, 128, 128, 126); rg.addColorStop(0, '#d98ab0'); rg.addColorStop(0.85, '#c06e9a'); rg.addColorStop(1, '#a85a88'); g.fillStyle = rg; g.beginPath(); g.arc(128, 128, 126, 0, 6.2832); g.fill();
      g.save(); g.beginPath(); g.arc(128, 128, 124, 0, 6.2832); g.clip();
      for (let i = 0; i < 26; i++) { const a = r.range(0, 6.28), d = r.range(0, 100), rr = r.range(8, 34); g.fillStyle = `rgba(110,50,100,${r.range(0.05, 0.16)})`; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, rr, 0, 6.2832); g.fill(); }
      g.lineCap = 'round';
      for (let s = 0; s < 3; s++) {   // three faint spiral arms in the markings
        g.strokeStyle = `rgba(${s === 1 ? '240,170,205' : '120,56,108'},0.13)`; g.lineWidth = 9 - s * 2; g.beginPath();
        for (let k = 0; k <= 60; k++) { const f = k / 60, a = s * 2.094 + f * 4.2, d = 10 + f * 108; const x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      g.restore();
      const mt = own(new THREE.CanvasTexture(c)); mt.colorSpace = THREE.SRGBColorSpace; mt.center.set(0.5, 0.5);
      const moon = new THREE.Mesh(own(new THREE.PlaneGeometry(260, 260)), own(new THREE.MeshBasicMaterial({ map: mt, transparent: true, fog: false, depthWrite: false }))); moon.position.set(10, 120, -1000); scene.add(moon);
      updaters.push((dt, t) => { mt.rotation = -t * 0.035; });   // about 2 degrees a second
    }
    await tick();

    // ================= SOCOTRA STARLINGS: the guide flock, scripted on T =================
    const NB = 18, birds = [];
    const C0t = nearestTree(-4, 238, (t) => Math.hypot(t.x - GAP.x, t.z - GAP.z) > GAP.r + 4);
    const C1t = nearestTree(16, 160, (t) => pathD(t.x, t.z) > 12 && Math.hypot(t.x - GAP.x, t.z - GAP.z) > GAP.r + 2);
    const C0tips = tipsOf(C0t), C1tips = tipsOf(C1t);
    const C0 = C0tips.slice(0, 6).reduce((a, b) => a.add(b), v3(0, 0, 0)).multiplyScalar(1 / 6);
    const C1 = C1tips.slice(0, 6).reduce((a, b) => a.add(b), v3(0, 0, 0)).multiplyScalar(1 / 6);
    const DRINK = (() => { const o = POOL.edge(-Math.PI * 0.5 + 0.55, 0.97, {}); return v3(o.x, poolLevel + 0.02, o.z); })();
    {
      const r = RS.fork('starlings');
      for (let i = 0; i < NB; i++) {
        const a = r.range(0, 6.28);
        birds.push({
          ph: r.range(0, 6.28), ahead: r.range(12, 22), side: (i % 2 ? 1 : -1) * r.range(0.4, 2.8), up: r.range(1.4, 3.6), sc: r.range(0.9, 1.12),
          s0: C0.clone().add(v3(r.range(-2.5, 2.5), r.range(-1.5, 0.5), r.range(-2.5, 2.5))), bdir: v3(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6 - 1).normalize(), brise: r.range(6, 11),
          perch: C1tips[Math.min(C1tips.length - 1, i * 2 + r.int(0, 1))].clone().add(v3(0, 0.12, 0)), yaw: r.range(0, 6.28),
          drink: DRINK.clone().add(v3(r.range(-1.6, 1.6), 0, r.range(-1.6, 1.6))),
          sa: r.range(0.3, 0.75), sb: r.range(-0.45, 0.45), sw: r.range(0.35, 0.6) * (r() < 0.5 ? -1 : 1), sph: r.range(0, 6.28),
          dips: [r.range(11.6, 12.4), r.range(12.5, 13.1)], flapF: r.range(5.6, 6.6), pos: v3(), prev: v3(), init: false,
        });
      }
    }
    const _lp = new THREE.Vector3(), _lt = new THREE.Vector3(), _a1 = new THREE.Vector3(), _a2 = new THREE.Vector3();
    const lead = (b, T, t, out) => {
      const u = T / DUR, uu = Math.min(0.985, u + b.ahead / PL); path.pointAt(uu, _lp); path.tangentAt(uu, _lt);
      const away = smoothstep(0.8, 0.98, u), sd = b.side * (1 + 2.5 * away) + 1.2 * Math.sin(t * 0.6 + b.ph);   // each bird weaves a little, banking as it goes   // near the end the flock lifts and fans out, clear of the portal
      return out.set(_lp.x - _lt.z * sd, _lp.y + b.up + 16 * away + 0.45 * Math.sin(t * 0.9 + b.ph), _lp.z + _lt.x * sd);
    };
    const skimAt = (b, T, out) => {
      const f = POOL.f, w = (T - 11) * b.sw + b.sph, a = POOL.A * b.sa * Math.sin(w), bb = POOL.B * (b.sb + 0.2 * Math.cos(w * 1.7));
      let y = poolLevel + 0.45 + 0.15 * Math.sin(T * 2 + b.ph);
      for (const d of b.dips) y -= 0.38 * Math.exp(-Math.pow((T - d) / 0.12, 2));
      return out.set(POOL.cx + f.fx * a + f.lx * bb, y, POOL.cz + f.fz * a + f.lz * bb);
    };
    // where bird b is at flight time T (and preview time t); also how folded its wings are, and whether it is drinking
    const birdState = (b, i, T, t, out) => {
      const st = { fold: 0, dip: 0, vis: 1, take: 0 };
      if (T < 1.05) { st.vis = 0; out.copy(b.s0); return st; }
      const p = Math.max(0, T - 1.1);
      const burst = _a1.copy(b.s0).addScaledVector(b.bdir, 12 * (1 - Math.exp(-1.6 * p))); burst.y += b.brise * (1 - Math.exp(-2.6 * p));
      lead(b, T, t, out); out.lerpVectors(burst, out, smoothstep(1.25, 2.3, T));
      st.take = 1 - smoothstep(1.1, 2.0, T);
      if (i < 9) {   // half the flock lands on a crown, folds its wings and hops, then lifts as the camera passes
        const w2 = smoothstep(2.2, 3.0, T), w3 = smoothstep(4.55, 5.35, T);
        if (w2 > 0 && w3 < 1) {
          const perch = _a2.copy(b.perch); perch.y += 0.2 * Math.pow(Math.max(0, Math.sin(t * 2.3 + b.ph * 3)), 6);
          out.lerp(perch, w2 * (1 - w3));
          st.fold = smoothstep(0.85, 1, w2) * (1 - smoothstep(0, 0.12, w3)); st.take = Math.max(st.take, (w3 > 0 && w3 < 1) ? 1 : 0);
        }
      }
      const wp1 = smoothstep(10.3, 11.4, T), wp2 = smoothstep(13.25, 14.2, T);
      if (wp1 > 0 && wp2 < 1) {   // down to the wadi pool: five drink at the edge, the rest skim the water, then all rise together
        const tgt = i < 5 ? _a2.copy(b.drink) : skimAt(b, T, _a2);
        out.lerp(tgt, wp1 * (1 - wp2));
        if (i < 5) { st.fold = smoothstep(0.9, 1, wp1) * (1 - smoothstep(0, 0.1, wp2)); st.dip = st.fold * Math.pow(Math.max(0, Math.sin(t * 1.6 + b.ph)), 2); }
        if (wp2 > 0) st.take = 1;
      }
      return st;
    };
    // ring wakes on the water: one where each skimmer touches, and where the drinkers settle
    { let k = 0; const tmp = v3(); for (let i = 5; i < NB && k < 12; i++) for (const d of birds[i].dips) { if (k >= 12) break; skimAt(birds[i], d, tmp); rings[k++].set(tmp.x, tmp.z, d, 1); } }
    // the bird: a dart body, two weighted wings (the outer half carries the rufous primaries), a tail; one instanced shader
    const birdMesh = (() => {
      const P_ = [], W_ = [], K_ = [];
      const tri = (a, b, c, wa, wb, wc, k) => { P_.push(...a, ...b, ...c); W_.push(wa, wb, wc); K_.push(k, k, k); };
      { // a body with some depth (it must read side-on too): nose, tail end, and a diamond section at the shoulders
        const n = [0, 0.02, 0.44], e = [0, 0.01, -0.14], u = [0, 0.085, 0.1], d = [0, -0.075, 0.08], l = [-0.085, 0, 0.08], rr = [0.085, 0, 0.08];
        for (const [a, b] of [[u, rr], [rr, d], [d, l], [l, u]]) { tri(n, a, b, 0, 0, 0, 0); tri(e, a, b, 0, 0, 0, 0); }
      }
      for (const sx of [1, -1]) {
        tri([0.05 * sx, 0, 0.17], [0.05 * sx, 0, -0.1], [0.5 * sx, 0, 0.1], 0, 0, 0.5, 0);
        tri([0.05 * sx, 0, -0.1], [0.5 * sx, 0, -0.13], [0.5 * sx, 0, 0.1], 0, 0.5, 0.5, 0);
        tri([0.5 * sx, 0, 0.1], [0.5 * sx, 0, -0.13], [1.0 * sx, 0, -0.06], 0.5, 0.5, 1, 1);
      }
      tri([0, 0, -0.06], [0.08, 0, -0.38], [-0.08, 0, -0.38], 0, 0, 0, 0);           // tail
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); g.setAttribute('aWing', new THREE.Float32BufferAttribute(W_, 1)); g.setAttribute('aPatch', new THREE.Float32BufferAttribute(K_, 1));
      const aS = new THREE.InstancedBufferAttribute(new Float32Array(NB * 3), 3); aS.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aS', aS);
      const mat = own(new THREE.ShaderMaterial({
        uniforms: fogU({ uDark: { value: new THREE.Color('#2a2a46') }, uGloss: { value: new THREE.Color('#6a6aa0') }, uRim: { value: new THREE.Color('#f0a8a8') }, uOrange: { value: new THREE.Color('#c86a2a') } }), fog: true, side: THREE.DoubleSide,
        vertexShader: /* glsl */`attribute float aWing, aPatch; attribute vec3 aS; varying float vPatch, vG;
          #include <fog_pars_vertex>
          void main(){
            vec3 l = position; float fold = aS.y, wing = step(0.001, aWing);
            vec3 folded = vec3(l.x * 0.16, l.y + 0.03 * aWing, l.z - 0.32 * aWing);
            l = mix(l, folded, fold * wing);
            l.y += aWing * aS.x * 0.7 * (1. - fold);
            l.x *= 1. - 0.22 * aWing * abs(aS.x) * (1. - fold);
            vPatch = aPatch * aS.z; vG = 0.5 + 0.5 * aS.x * aWing;
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(l, 1.); gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`uniform vec3 uDark, uGloss, uOrange, uRim; varying float vPatch, vG;
          #include <fog_pars_fragment>
          void main(){ vec3 c = mix(uDark, uGloss, 0.3 * vG) + uRim * (0.12 + 0.2 * vG);   // a warm rim from the moon side: never flat black
            c = mix(c, uOrange * 1.3, clamp(vPatch, 0., 1.) * 0.9); gl_FragColor = vec4(c, 1.);
            #include <fog_fragment>
          }`,
      }));
      const im = new THREE.InstancedMesh(g, mat, NB); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im);
      return { im, aS };
    })();
    const _bv = new THREE.Vector3(), _bf = new THREE.Vector3(), _bm = new THREE.Matrix4(), _o0 = new THREE.Vector3(0, 0, 0), _up = new THREE.Vector3(0, 1, 0), _bq = new THREE.Quaternion(), _bs = new THREE.Vector3(), _dq = new THREE.Quaternion(), _xa = new THREE.Vector3(1, 0, 0), _za = new THREE.Vector3(0, 0, 1);
    const updateBirds = (T, t, cam) => {
      const cp = cam.position;
      for (let i = 0; i < NB; i++) {
        const b = birds[i], st = birdState(b, i, T, t, b.pos);
        birdState(b, i, T + 0.05, t + 0.05, _bv); _bv.sub(b.pos);   // where it is heading
        { const dx = b.pos.x - cp.x, dy = b.pos.y - cp.y, dz = b.pos.z - cp.z, d = Math.hypot(dx, dy, dz); if (d < 8) b.pos.set(cp.x + dx / d * 8, cp.y + dy / d * 8, cp.z + dz / d * 8); }   // never within 8 m of the lens
        const speed = _bv.length() / 0.05;
        if (st.fold > 0.5 || speed < 0.6) { _bf.set(Math.sin(b.yaw), 0, Math.cos(b.yaw)); } else { _bf.copy(_bv).normalize(); _bf.y = Math.max(-0.5, Math.min(0.5, _bf.y)); _bf.normalize(); b.yaw = Math.atan2(_bf.x, _bf.z); }
        _bm.lookAt(_bf, _o0, _up); _bq.setFromRotationMatrix(_bm);
        if (st.fold < 0.5) _bq.multiply(_dq.setFromAxisAngle(_za, -0.6 * Math.cos(t * 0.6 + b.ph) * (1 - st.fold)));
        if (st.dip > 0) _bq.multiply(_dq.setFromAxisAngle(_xa, 0.7 * st.dip));   // head down to drink
        const climbing = _bv.y / 0.05 > 1.2 || st.take > 0.2;
        const flapping = climbing || Math.sin(t * 1.5 + b.ph) > -0.25;   // bursts of quick flaps between glides
        const flap = st.fold > 0.5 ? 0 : flapping ? 0.15 + 0.85 * Math.sin(t * 6.2832 * b.flapF + b.ph) : 0.4;   // gliding: wings held in a shallow V
        b.prevFlap = flap;
        const s = 0.85 * b.sc * st.vis;
        _bs.set(s, s, s); _bm.compose(b.pos, _bq, _bs); birdMesh.im.setMatrixAt(i, _bm);
        birdMesh.aS.setXYZ(i, flap, st.fold, (1 - st.fold) * (0.6 + 0.4 * Math.max(0, -flap)));
      }
      birdMesh.im.instanceMatrix.needsUpdate = true; birdMesh.aS.needsUpdate = true;
    };

    // ---------- Egyptian vultures: white bodies, black flight feathers, wheeling slowly high against the moon and the ridges ----------
    const vultures = [];
    {
      const P_ = [], C_ = [], W = new THREE.Color('#ece4dc'), K = new THREE.Color('#1c1820'), tri = (a, b, c, ca, cb, cc) => { P_.push(...a, ...b, ...c); C_.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); };
      tri([0, 0, 0.55], [0.1, 0, -0.2], [-0.1, 0, -0.2], W, W, W);
      tri([0, 0, -0.15], [0.18, 0, -0.55], [-0.18, 0, -0.55], W, W, W);
      for (const sx of [1, -1]) {
        tri([0.08 * sx, 0, 0.2], [0.08 * sx, 0, -0.12], [0.55 * sx, 0.04, 0.16], W, W, W);
        tri([0.08 * sx, 0, -0.12], [0.55 * sx, 0.04, -0.22], [0.55 * sx, 0.04, 0.16], K, K, W);
        tri([0.55 * sx, 0.04, 0.16], [0.55 * sx, 0.04, -0.22], [1.0 * sx, 0.1, -0.02], W, K, K);
      }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C_, 3));
      const m = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      const specs = [[-60, 100, -330, 34, 0.16, 0], [40, 122, -430, 44, -0.12, 2], [-15, 138, -540, 30, 0.14, 4], [85, 92, -260, 40, -0.15, 1.3]];
      for (const [x, y, z, rad, w, ph] of specs) { const v = new THREE.Mesh(g, m); v.scale.setScalar(1.05); v.frustumCulled = false; scene.add(v); vultures.push({ v, x, y, z, rad, w, ph }); }   // 2.1 m across
    }

    // ---------- where the camera looks: the landing crown, the crowns lighting in turn, the pool and its drinking birds ----------
    const _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
    const pois = [
      { at: C1, from: 2.5 / DUR, to: 4.5 / DUR, fade: 0.3, weight: 0.62 },
      { at: (time, u) => { const f = Math.min(0.97, front(u * DUR) + 0.02), q = frameAt(f); return _pa.set(q.p.x + q.lx * 22, gh(q.p.x, q.p.z) + 17, q.p.z + q.lz * 22); }, from: 6.8 / DUR, to: 9.5 / DUR, fade: 0.3, weight: 0.4 },
      { at: _pb.set(POOL.cx + POOL.f.fx * 8, poolLevel + 0.4, POOL.cz + POOL.f.fz * 8), from: 11.2 / DUR, to: 13.5 / DUR, fade: 0.32, weight: 0.65 },
    ];

    return {
      scene, path, duration, title: 'The Dragon Blood Forest', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 1.1, nearThrough: 1.1, far: 6000, lookAhead: 40, sway: 0, bank: 0.08 },
      pois,
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#e090b8', veil: '#e090b8', glow: 0.75, halo: false, revealDistance: 700 },   // the pink moon's small eye
      post: { exposure: 1.0, bloom: { strength: 0.3, radius: 0.45, threshold: 0.95 }, grade: { saturation: 1.1, contrast: 1.05, tint: '#fff0f4', shadowTint: '#1a1030', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = (u || 0) * DUR;
        for (const f of updaters) f(dt, t, camera, u);
        wake.uTime.value = t; wake.uFront.value = front(T);
        if (ctx.renderer) wake.uViewH.value = ctx.renderer.domElement.height;
        if (POOL.uniforms) POOL.uniforms.uT.value = T;
        updateBirds(T, t, camera);
        for (const o of vultures) { const a = t * o.w + o.ph; o.v.position.set(o.x + Math.cos(a) * o.rad, o.y + 3 * Math.sin(t * 0.3 + o.ph), o.z + Math.sin(a) * o.rad); o.v.rotation.set(0, Math.atan2(-Math.sin(a) * Math.sign(o.w), Math.cos(a) * Math.sign(o.w)), 0); o.v.rotateZ(-0.3 * Math.sign(o.w)); }
        const cp = camera.position;
        for (const c of chunks) { const vis = Math.hypot(c.cx - cp.x, c.cz - cp.z) - c.rr < 820; c.wm.visible = c.lm.visible = vis; }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
