// THE DRAGON BLOOD FOREST: Socotra at dusk. Thick short trunks fork upward into flat-topped umbrella canopies on a dry
// ochre plateau. The camera comes in high over the canopy sea, drops through a clearing, and travels a long way beneath
// the trees, where the umbrellas join into one low ceiling with only small gaps of sky, then rises out into open dusk.
// Everything is flat matte colour (MeshBasicMaterial with baked shading): no lights, no highlights, no glow.
// Nothing is loaded: trees, rocks, ground and textures are built here.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';

const GAP = { x: -6, z: 200, r: 28 };   // the clearing the camera descends through
const F_Z0 = 360, F_Z1 = -330;           // forest extent along the flight (+z is where we come from)
const LIGHT = new THREE.Vector3(-0.4, 0.8, 0.3).normalize();
// the reveal: trees stand normal size at first, then grow to cathedral pillars over the middle of the flight
const RAMP = (z) => 1 + 1.5 * smoothstep(40, -170, z);

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
    const duration = 17;
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

    // ---------- textures: leafy mottle for canopies, dry ochre ground ----------
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
    const groundC = mkCanvas(256); {
      const g = groundC.getContext('2d'), S = 256; g.fillStyle = '#c2a56c'; g.fillRect(0, 0, S, S);
      const cols = ['#b89c64', '#c8ac74', '#b49564', '#bca06c', '#ae9468', '#cdb582'];
      for (let i = 0; i < 160; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(14, 48), cols[R.int(0, cols.length - 1)] + '30');
      for (let i = 0; i < 1400; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(1, 2.6), cols[R.int(0, cols.length - 1)] + '40');
    }
    const groundTex = own(new THREE.CanvasTexture(groundC)); groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.colorSpace = THREE.SRGBColorSpace; groundTex.anisotropy = 8; groundTex.repeat.set(110, 110);
    await tick();

    // ---------- ground: a huge dry plateau, dimmed under the trees, lighter in the clearing and beyond the forest ----------
    const GS = 4400, SEG = Math.round(260 * Math.min(1, 0.7 + detail * 0.3));
    const gg = new THREE.PlaneGeometry(GS, GS, SEG, SEG); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -150);
    {
      const pos = gg.attributes.position, n = pos.count, col = new Float32Array(n * 3), c = new THREE.Color(), ochre = new THREE.Color('#6a5444'), rust = new THREE.Color('#40385a');
      const forestMask = (x, z) => smoothstep(F_Z0 + 20, F_Z0 - 60, z) * smoothstep(F_Z1 - 25, F_Z1 + 70, z) * (1 - smoothstep(210, 380, Math.abs(x)));
      for (let i = 0; i < n; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, gh(x, z));
        const m = forestMask(x, z), open = 1 - smoothstep(GAP.r * 0.5, GAP.r * 1.5, Math.hypot(x - GAP.x, z - GAP.z));
        const k = (lerp(0.95, 0.85, m) + 0.2 * open * m) * (0.92 + 0.16 * (N.fbm2(x * 0.004 + 9, z * 0.004, 2) * 0.5 + 0.5));
        c.copy(ochre).lerp(rust, smoothstep(0.0, 0.6, N.fbm2(x * 0.006, z * 0.006, 2)) * 0.25).multiplyScalar(k);
        col[i * 3] = c.r * 0.8; col[i * 3 + 1] = c.g * 0.95; col[i * 3 + 2] = c.b * 1.15;
      }
      gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const uv = gg.attributes.uv; for (let i = 0; i < n; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
    }
    const ground = new THREE.Mesh(own(gg), own(new THREE.MeshBasicMaterial({ vertexColors: true })));
    scene.add(ground);
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
    };
    const toGeo = (b) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setIndex(b.i); return g; };
    const bez = (p0, c, t1, n) => { const o = []; for (let k = 0; k <= n; k++) { const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t; o.push(v3(a * p0.x + b * c.x + d * t1.x, a * p0.y + b * c.y + d * t1.y, a * p0.z + b * c.z + d * t1.z)); } return o; };


    // A real dragon blood tree: a thick bottle-shaped trunk that forks again and again into a dense upturned umbrella,
    // with a rosette of spiky needle leaves at the end of every twig.
    const HF = 8.2;
    const woodA = new THREE.Color('#3a3048'), woodB = new THREE.Color('#322a40');
    const LEAF_A = new THREE.Color('#27485a'), LEAF_B = new THREE.Color('#3b5b6a'), TIP = new THREE.Color('#c08cc4');
    const addBlade = (buf, base, dir, L, w, col) => {
      const ax = v3().crossVectors(dir, v3(0.3, 1, 0.2)); if (ax.lengthSq() < 1e-5) ax.set(1, 0, 0);
      ax.normalize().multiplyScalar(w);
      const i0 = buf.p.length / 3;
      buf.p.push(base.x - ax.x, base.y - ax.y, base.z - ax.z, base.x + ax.x, base.y + ax.y, base.z + ax.z, base.x + dir.x * L, base.y + dir.y * L, base.z + dir.z * L);
      for (let j = 0; j < 3; j++) { const m = j === 2 ? 0.35 : 0; buf.c.push(col.r * (1 - m) + TIP.r * m, col.g * (1 - m) + TIP.g * m, col.b * (1 - m) + TIP.b * m); buf.u.push(0, 0); }
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

    // ---------- plant the forest on a jittered grid; clear the camera corridor and the clearing ----------
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

    const CELL = 200, groups = new Map(), chunks = [];
    for (const t of trees) { const key = Math.floor(t.x / CELL) + '|' + Math.floor(t.z / CELL) + '|' + t.v; let g = groups.get(key); if (!g) groups.set(key, g = []); g.push(t); }
    const woodMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    const leafMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
    let gi = 0;
    for (const [key, list] of groups) {
      const v = variants[+key.split('|')[2]];
      const wm = new THREE.InstancedMesh(v.wood, woodMat, list.length), lm = new THREE.InstancedMesh(v.leaf, leafMat, list.length);
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

    // ---------- THE MOMENT: the moon wakes the forest. A slow wave of soft peach light runs ahead of the camera along the avenue,
    // lighting the tip of every rosette in turn, all the way to the moon; each then settles to a slow, gentle twinkle. ----------
    const wake = { uTime: { value: 0 }, uFront: { value: 0 }, uViewH: { value: 1080 } };
    {
      const P_ = [], U_ = [], S_ = [], MAXP = 14000, _w = new THREE.Vector3();
      for (const t of trees) {
        if (P_.length / 3 >= MAXP) break;
        const nr = path.nearestXZ(t.x, t.z); if (nr.dist > 75 || nr.u < 0.3) continue;
        const tips = variants[t.v].tips, c = Math.cos(t.rot), sn = Math.sin(t.rot), y0 = gh(t.x, t.z);
        for (let k = 0; k < tips.length; k += 3) {
          if (R() > 0.7) continue;
          const x = tips[k] * t.sh, y = tips[k + 1] * t.sv, z = tips[k + 2] * t.sh;
          P_.push(t.x + x * c + z * sn, y0 + y, t.z - x * sn + z * c); U_.push(nr.u); S_.push(R());
        }
      }
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
            vA = lit * (0.55 * tw + 0.45 * crest) * fogF;
            gl_PointSize = clamp(3.2 * projectionMatrix[1][1] * uViewH * 0.5 * (1. + 0.7 * crest) / max(-mv.z, 1.), 2., 44.);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(vec3(1., .74, .62), a * a * a * vA * 0.9); }`,
      });
      const pts = new THREE.Points(own(g), own(m)); pts.frustumCulled = false; pts.renderOrder = 5; scene.add(pts);
    }

    // ---------- rocks (muted, earthy) and far bluffs that give the open ground something to recede to ----------
    {
      const rg = new THREE.IcosahedronGeometry(1, 0), pos = rg.attributes.position, cols = new Float32Array(pos.count * 3);
      for (let f = 0; f < pos.count; f += 3) {
        const a = v3(pos.getX(f), pos.getY(f), pos.getZ(f)), b = v3(pos.getX(f + 1), pos.getY(f + 1), pos.getZ(f + 1)), c = v3(pos.getX(f + 2), pos.getY(f + 2), pos.getZ(f + 2));
        const n = c.clone().sub(a).cross(b.clone().sub(a)).normalize(), k = 0.55 + 0.45 * (n.dot(LIGHT) * 0.5 + 0.5);
        for (let j = 0; j < 3; j++) { cols[(f + j) * 3] = k; cols[(f + j) * 3 + 1] = k; cols[(f + j) * 3 + 2] = k; }
      }
      rg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const rockMat = own(new THREE.MeshBasicMaterial({ vertexColors: true }));
      const nR = Math.round(560 * Math.min(1, 0.6 + detail * 0.4)), rocks = new THREE.InstancedMesh(own(rg), rockMat, nR);
      const pal = ['#4a3c44', '#52424a', '#3e343e', '#4c3e46', '#564850'];
      for (let i = 0; i < nR; i++) {
        const x = R.range(-260, 260), z = R.range(F_Z1 - 200, F_Z0 - 100), s = R.range(0.4, 1.8) * (R() < 0.08 ? 2.4 : 1);
        if (path.nearestXZ(x, z).dist < 14) { rocks.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
        _p.set(x, gh(x, z) + s * 0.2, z); _q.setFromEuler(new THREE.Euler(R.range(0, 3), R.range(0, 3), R.range(0, 3))); _s.set(s * 1.3, s * 0.7, s);
        rocks.setMatrixAt(i, _m.compose(_p, _q, _s)); rocks.setColorAt(i, _c.set(pal[i % pal.length]).multiplyScalar(R.range(0.85, 1.1)));
      }
      rocks.computeBoundingSphere(); scene.add(rocks);
      const nB = 16, bluffs = new THREE.InstancedMesh(rg, rockMat, nB);
      for (let i = 0; i < nB; i++) {
        const x = R.range(-700, 700) + (i % 2 ? 150 : -150), z = R.range(-520, -900), s = R.range(30, 70);
        _p.set(x, gh(x, z) + s * 0.1, z); _q.setFromEuler(new THREE.Euler(0, R.range(0, 3), 0)); _s.set(s * 2.2, s * R.range(0.3, 0.55), s * 1.4);
        bluffs.setMatrixAt(i, _m.compose(_p, _q, _s)); bluffs.setColorAt(i, _c.set('#3a3050'));
      }
      bluffs.computeBoundingSphere(); scene.add(bluffs);
    }

    // ---------- a faint mossy trail under the trees, with stepping-stones and standing moss pillars ----------
    {
      const U0 = 0.19, SEGS = 90, pos = [], col = [], idx = [], c1 = new THREE.Color();
      const cm = new THREE.Color('#355a3c'), ct = new THREE.Color('#264c52'), co = new THREE.Color('#5c5030'), ce = new THREE.Color('#5a4642');
      const tg = new THREE.Vector3(), pp = new THREE.Vector3();
      for (let k = 0; k <= SEGS; k++) {
        const u = lerp(U0, 1, k / SEGS); path.pointAt(u, pp); path.tangentAt(u, tg);
        const nx = -tg.z, nz = tg.x, nl = Math.hypot(nx, nz) || 1, w = 4.0 + 1.2 * N.n2(k * 0.15, 3);
        for (const side of [-1, 0, 1]) {
          const x = pp.x + nx / nl * side * w, z = pp.z + nz / nl * side * w;
          pos.push(x, gh(x, z) + 0.08, z);
          const patch = N.fbm2(k * 0.09 + 11, side * 0.7 + 4, 2) * 0.5 + 0.5;
          if (side === 0) c1.copy(cm).lerp(ct, smoothstep(0.35, 0.7, patch)).lerp(co, smoothstep(0.7, 0.95, patch) * 0.5); else c1.copy(ce).lerp(cm, 0.18);
          col.push(c1.r, c1.g, c1.b);
        }
        if (k < SEGS) { const a = k * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
      }
      const tg_ = new THREE.BufferGeometry(); tg_.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg_.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg_.setIndex(idx);
      scene.add(new THREE.Mesh(own(tg_), own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))));
      // strange details: pale moss stepping-stones in the trail, and tall rounded moss pillars standing at its edge
      const stoneG = own(new THREE.SphereGeometry(1, 14, 7)), pillarG = own(new THREE.CapsuleGeometry(0.6, 1.2, 3, 8));
      const baseMat = own(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      const nS = 40, nP = 16, stones = new THREE.InstancedMesh(stoneG, baseMat, nS), pillars = new THREE.InstancedMesh(pillarG, baseMat, nP);
      const place2 = (im, i, off, sx, sy, sz, hex, lift) => {
        const u = lerp(U0 + 0.03, 0.97, R()); path.pointAt(u, pp); path.tangentAt(u, tg);
        const nx = -tg.z, nz = tg.x, nl = Math.hypot(nx, nz) || 1, x = pp.x + nx / nl * off, z = pp.z + nz / nl * off;
        _p.set(x, gh(x, z) + lift, z); _q.setFromAxisAngle(_y, R.range(0, 6.28)); _s.set(sx, sy, sz);
        im.setMatrixAt(i, _m.compose(_p, _q, _s)); im.setColorAt(i, _c.set(hex).multiplyScalar(R.range(0.85, 1.1)));
      };
      const stonePal = ['#3f6046', '#365a52', '#486848'], pillarPal = ['#34543f', '#2a484a', '#3c5a40'];
      for (let i = 0; i < nS; i++) { const rr = R.range(0.55, 1.0); place2(stones, i, (i % 2 ? 1 : -1) * R.range(1.2, 3.0), rr, 0.16 * rr, rr, stonePal[i % 3], 0.05); }
      for (let i = 0; i < nP; i++) { const h = R.range(1.1, 3.4); place2(pillars, i, (i % 2 ? 1 : -1) * R.range(5.0, 6.8), R.range(0.5, 0.8), h * 0.85, R.range(0.8, 1.3), pillarPal[i % 3], h * 0.9); }
      stones.frustumCulled = pillars.frustumCulled = false; scene.add(stones, pillars);
    }

    // ---------- a small flock leads the way: pale ochre birds flying a little ahead of the camera ----------
    const flock = [];
    {
      const wingG = own(new THREE.BufferGeometry()); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.7, 0, 0, 0.8, 2.7, 0, 0.5, 0, 0, -0.7, 2.7, 0, 0.5, 2.7, 0, 0.1], 3));
      const bodyG = own(new THREE.SphereGeometry(0.45, 6, 4)); bodyG.scale(0.45, 0.4, 1.3);
      const wingM = own(new THREE.MeshBasicMaterial({ color: '#2c2640', side: THREE.DoubleSide })), bodyM = own(new THREE.MeshBasicMaterial({ color: '#241f38' }));
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Group(), wl = new THREE.Mesh(wingG, wingM), wr = new THREE.Mesh(wingG, wingM);
        wr.scale.x = -1; g.add(new THREE.Mesh(bodyG, bodyM), wl, wr); g.scale.setScalar(1.9); scene.add(g);
        flock.push({ g, wl, wr, ahead: 0.045 + 0.011 * i + (i % 2) * 0.01, side: (i - 2.5) * 3.2 + R.range(-0.8, 0.8), up: 1.5 + (i % 3) * 1.4 + R.range(0, 0.8), ph: R.range(0, 6.28) });
      }
    }
    const _bp = new THREE.Vector3(), _bt = new THREE.Vector3();

    // ---------- DESERT ROSES: swollen bottle trunks with a crown of pink flowers, the other face of Socotra ----------
    {
      const makeRose = (seed) => {
        const r = R.fork('rose' + seed), wood = mkBuf(), leaf = mkBuf(), cB = new THREE.Color('#4e4048'), cC = new THREE.Color('#403640');
        tube(wood, [v3(0, -0.5, 0), v3(0, 0.8, 0), v3(0, 2.0, 0), v3(0, 3.0, 0)], [1.5, 1.25, 0.8, 0.55], 10, cB, cC, 11 + seed);
        for (let b = 0; b < 4; b++) {
          const th = r.range(0, 6.28) + b * 1.6, d = v3(Math.cos(th) * 0.8, 0.9, Math.sin(th) * 0.8).normalize(), p0 = v3(0, 3.0, 0), p1 = p0.clone().addScaledVector(d, 1.0), p2 = p1.clone().addScaledVector(d, 1.0); p2.y += 0.3;
          tube(wood, [p0, p1, p2], [0.5, 0.36, 0.26], 6, cC, cC);
          for (let f = 0; f < 7; f++) {   // a flower: five petals fanned flat, in rose and pale pink
            const c = p2.clone().add(v3(r.range(-0.6, 0.6), r.range(-0.1, 0.5), r.range(-0.6, 0.6))), col = new THREE.Color('#e07aa8').lerp(new THREE.Color('#f4c0d4'), r.range(0, 0.7)), tilt = r.range(-0.4, 0.4);
            for (let k = 0; k < 5; k++) { const a1 = (k / 5) * 6.2832, a2 = ((k + 1) / 5) * 6.2832, i0 = leaf.p.length / 3, R1 = 0.34;
              leaf.p.push(c.x, c.y, c.z, c.x + Math.cos(a1) * R1, c.y + tilt * Math.cos(a1) * 0.2, c.z + Math.sin(a1) * R1, c.x + Math.cos(a2) * R1, c.y + tilt * Math.cos(a2) * 0.2, c.z + Math.sin(a2) * R1);
              for (let j = 0; j < 3; j++) { const m = j === 0 ? 0.0 : 0.25; leaf.c.push(col.r * (1 - m) + 0.55 * m, col.g * (1 - m) + 0.22 * m, col.b * (1 - m) + 0.35 * m); leaf.u.push(0, 0); } leaf.i.push(i0, i0 + 1, i0 + 2); }
          }
        }
        return { wood: toGeo(wood), leaf: toGeo(leaf) };
      };
      const rv = [makeRose(0), makeRose(1)], roses = [];
      for (const v of rv) { own(v.wood); own(v.leaf); }
      for (let i = 0; i < 150; i++) {
        const x = (R() < 0.5 ? -1 : 1) * R.range(7, 70), z = R.range(F_Z0 - 60, F_Z1 + 40); if (path.nearestXZ(x, z).dist < 7.5) continue;
        roses.push({ x, z, sc: R.range(1.1, 1.9), rot: R.range(0, 6.28), v: R.int(0, 1) });
      }
      for (let vi = 0; vi < 2; vi++) {
        const list = roses.filter((o) => o.v === vi); if (!list.length) continue;
        const wm = new THREE.InstancedMesh(rv[vi].wood, woodMat, list.length), lm = new THREE.InstancedMesh(rv[vi].leaf, leafMat, list.length);
        list.forEach((o, i) => { _q.setFromAxisAngle(_y, o.rot); _p.set(o.x, gh(o.x, o.z), o.z); _s.set(o.sc, o.sc, o.sc); _m.compose(_p, _q, _s); wm.setMatrixAt(i, _m); lm.setMatrixAt(i, _m); });
        wm.frustumCulled = lm.frustumCulled = false; scene.add(wm, lm);
      }
    }
    // ---------- DRY SHRUB TUFTS and big limestone BOULDERS ----------
    {
      const sb = mkBuf(), sr = R.fork('shrub');
      for (let k = 0; k < 11; k++) { const a = sr.range(0, 6.28), t = sr.range(0.15, 0.7), d = v3(Math.cos(a) * Math.sin(t), Math.cos(t), Math.sin(a) * Math.sin(t)); addBlade(sb, v3(sr.range(-0.2, 0.2), 0, sr.range(-0.2, 0.2)), d, sr.range(0.8, 1.6), 0.05, k & 1 ? new THREE.Color('#566a46') : new THREE.Color('#6e7a4e')); }
      const sg = own(toGeo(sb)), sN = 520, sm2 = new THREE.InstancedMesh(sg, leafMat, sN);
      for (let i = 0; i < sN; i++) { const x = R.range(-130, 130), z = R.range(F_Z0, F_Z1 + 40); if (path.nearestXZ(x, z).dist < 1.8) { sm2.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; } const sc = R.range(1, 2.4); _q.setFromAxisAngle(_y, R.range(0, 6.28)); _p.set(x, gh(x, z), z); _s.set(sc, sc * R.range(0.8, 1.3), sc); sm2.setMatrixAt(i, _m.compose(_p, _q, _s)); }
      sm2.frustumCulled = false; scene.add(sm2);
      const bg = own(new THREE.IcosahedronGeometry(1, 1)), bp = bg.attributes.position, bc = new Float32Array(bp.count * 3);
      for (let f = 0; f < bp.count; f += 3) { const a = v3(bp.getX(f), bp.getY(f), bp.getZ(f)), b = v3(bp.getX(f + 1), bp.getY(f + 1), bp.getZ(f + 1)), c = v3(bp.getX(f + 2), bp.getY(f + 2), bp.getZ(f + 2)); const n = c.clone().sub(a).cross(b.clone().sub(a)).normalize(), k = 0.55 + 0.45 * (n.dot(LIGHT) * 0.5 + 0.5) + R.range(-0.06, 0.06); for (let j = 0; j < 3; j++) { bc[(f + j) * 3] = k; bc[(f + j) * 3 + 1] = k; bc[(f + j) * 3 + 2] = k; } }
      bg.setAttribute('color', new THREE.BufferAttribute(bc, 3));
      const bN = 40, bm2 = new THREE.InstancedMesh(bg, own(new THREE.MeshBasicMaterial({ vertexColors: true })), bN), bpal = ['#4a3c48', '#54464f', '#463c4a', '#5a4a52'];
      for (let i = 0; i < bN; i++) { let x, z; do { x = (R() < 0.5 ? -1 : 1) * R.range(10, 90); z = R.range(F_Z0 - 40, F_Z1 + 40); } while (path.nearestXZ(x, z).dist < 11); const sc = R.range(2.5, 7); _q.setFromEuler(new THREE.Euler(R.range(0, 0.4), R.range(0, 6.28), R.range(0, 0.4))); _p.set(x, gh(x, z) + sc * 0.25, z); _s.set(sc * 1.3, sc * 0.75, sc); bm2.setMatrixAt(i, _m.compose(_p, _q, _s)); bm2.setColorAt(i, _c.set(bpal[i % 4])); }
      bm2.frustumCulled = false; scene.add(bm2);
    }
    // ---------- far RIDGES dissolving into the haze, and low MIST banks drifting over the ground ----------
    {
      const ridge = (z, h, seed, cTop, cBot) => {
        const pts = [], cols = [], idx = []; const top = new THREE.Color(cTop), bot = new THREE.Color(cBot);
        for (let i = 0; i <= 80; i++) { const x = -1700 + i * 42.5, y = h * (0.35 + 0.65 * (N.fbm2(x * 0.0035 + seed, seed * 3.1, 3) * 0.5 + 0.5)); pts.push(x, y, z, x, -10, z); cols.push(top.r, top.g, top.b, bot.r, bot.g, bot.b); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx);
        const m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }))); m.frustumCulled = false; scene.add(m);
      };
      ridge(-800, 150, 1.3, '#6e4f92', '#a07ab8'); ridge(-980, 190, 4.7, '#7d60a0', '#a886c0'); ridge(-1180, 240, 8.1, '#8d72ae', '#b090c8');
      const mc = document.createElement('canvas'); mc.width = mc.height = 128; { const g = mc.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
      const mt = own(new THREE.CanvasTexture(mc)), mists = [];
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(own(new THREE.PlaneGeometry(150, 110).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: mt, color: '#d6a0cc', transparent: true, opacity: 0.085, depthWrite: false }))); m.position.set(R.range(-70, 70), R.range(1.6, 3.4), F_Z0 - 40 - i * 110 + R.range(-30, 30)); m.renderOrder = 2; scene.add(m); mists.push({ m, ph: R.range(0, 6.28), x0: m.position.x }); }
      updaters.push((dt, t) => { for (const o of mists) o.m.position.x = o.x0 + 6 * Math.sin(t * 0.07 + o.ph); });
    }
    // ---------- slow glowing MOTES drifting over the trail ----------
    {
      const MN = 140, mp = new Float32Array(MN * 3), mb = [];
      for (let i = 0; i < MN; i++) mb.push({ x: R.range(-16, 16), y: R.range(0.8, 7), z: R.range(F_Z0 - 100, F_Z1 + 60), ph: R.range(0, 6.28) });
      const mg = own(new THREE.BufferGeometry()); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
      const gc = document.createElement('canvas'); gc.width = gc.height = 64; { const g = gc.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,236,200,0.9)'); rg.addColorStop(1, 'rgba(255,200,150,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
      const motes = new THREE.Points(mg, own(new THREE.PointsMaterial({ map: own(new THREE.CanvasTexture(gc)), size: 0.55, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffd8b0' }))); motes.frustumCulled = false; scene.add(motes);
      updaters.push((dt, t) => { for (let i = 0; i < MN; i++) { const b = mb[i]; mp[i * 3] = b.x + 1.4 * Math.sin(t * 0.2 + b.ph); mp[i * 3 + 1] = b.y + 0.7 * Math.sin(t * 0.33 + b.ph * 2); mp[i * 3 + 2] = b.z + 1.0 * Math.cos(t * 0.17 + b.ph); } mg.attributes.position.needsUpdate = true; motes.material.opacity = 0.5 + 0.1 * Math.sin(t * 0.5); });
    }

    { // the big pink moon in the sky, rising behind the ridges, with soft markings; the portal is only a small window in front of it
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      const rg = g.createRadialGradient(128, 128, 20, 128, 128, 126); rg.addColorStop(0, '#d98ab0'); rg.addColorStop(0.85, '#c06e9a'); rg.addColorStop(1, '#a85a88'); g.fillStyle = rg; g.beginPath(); g.arc(128, 128, 126, 0, 6.2832); g.fill();
      for (let i = 0; i < 26; i++) { const a = R.range(0, 6.28), d = R.range(0, 100), r = R.range(8, 34); g.fillStyle = `rgba(110,50,100,${R.range(0.05, 0.16)})`; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, r, 0, 6.2832); g.fill(); }
      const mt = own(new THREE.CanvasTexture(c)); mt.colorSpace = THREE.SRGBColorSpace;
      const moon = new THREE.Mesh(own(new THREE.PlaneGeometry(260, 260)), own(new THREE.MeshBasicMaterial({ map: mt, transparent: true, fog: false, depthWrite: false }))); moon.position.set(10, 120, -1000); scene.add(moon);
    }
    const pois = [];   // none: the camera only looks where it is going, so it never pitches up and down

    return {
      scene, path, duration, title: 'The Dragon Blood Forest', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 1.1, nearThrough: 1.1, far: 6000, lookAhead: 40, sway: 0, bank: 0.08 },
      pois,
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#e090b8', veil: '#e090b8', glow: 0.75, halo: true, revealDistance: 700 },   // the pink moon: a huge disc with the portal's own slow swirl, there from the start
      post: { exposure: 1.0, bloom: { strength: 0.25, radius: 0.45, threshold: 0.92 }, grade: { saturation: 1.1, contrast: 1.05, tint: '#fff0f4', shadowTint: '#1a1030', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        for (const f of updaters) f(dt, t, camera, u);
        wake.uTime.value = t; wake.uFront.value = 0.38 + 0.1 * Math.max(0, (u || 0) * 17 - 6.5);   // the wave leaves the camera at 6.5 s and races to the moon
        if (ctx.renderer) wake.uViewH.value = ctx.renderer.domElement.height;
        const cp = camera.position, nu = path.nearestXZ(cp.x, cp.z).u;
        for (const b of flock) {
          const uu = Math.min(0.985, nu + b.ahead); path.pointAt(uu, _bp); path.tangentAt(uu, _bt);
          const away = smoothstep(0.8, 0.98, nu), sd = b.side * (1 + 2.5 * away);   // near the end the flock lifts and fans out, clear of the portal
          b.g.position.set(_bp.x - _bt.z * sd, _bp.y + b.up + 16 * away + 0.4 * Math.sin(t * 0.8 + b.ph), _bp.z + _bt.x * sd);
          b.g.rotation.y = Math.atan2(_bt.x, _bt.z);
          const flap = Math.sin(t * 0.6 + b.ph) > -0.35 ? 0.55 * Math.sin(t * 8 + b.ph) : 0.12;   // bursts of slow flaps between glides
          b.wl.rotation.z = 0.32 + flap; b.wr.rotation.z = -(0.32 + flap);
        }
        for (const c of chunks) { const vis = Math.hypot(c.cx - cp.x, c.cz - cp.z) - c.rr < 820; c.wm.visible = c.lm.visible = vis; }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
