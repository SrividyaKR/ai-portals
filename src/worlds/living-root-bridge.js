// THE BRIDGE THAT GROWS: in Meghalaya, India, people grow bridges from the roots of rubber fig trees; one takes about fifteen years. You walk
// a living root bridge across a gorge in the monsoon, and here you see it happen: the handrails knot and the roots weave themselves into
// the deck a few metres ahead of your feet, as if the bridge were being made for you as you cross. It ends in the giant fig the roots
// come from, whose buttress roots arch overhead into a doorway of light and a small glowing ring.
// The camera moves at constant speed, so the bridge is laid out by distance: z = 14 - 4.4 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, pathFrom, makeTerrain, skyFor } from '../kit/mine.js';

const DUR = 20, V = 4.4, BZ0 = 22, BZ1 = -84;
const camAt = (T) => [0.18 * Math.sin(T * 0.8), 1.6 + 0.05 * Math.sin(T * 2.2), 14 - V * T];
const hLand = (x, z) => { const cx = 6 * Math.sin(z * 0.02), d = Math.abs(x - cx); let h = -38 + 82 * smoothstep(5, 60, d) + 5 * fbm(x * 0.05, z * 0.05, 3) + 2.5 * fbm(x * 0.2, z * 0.2, 2); h = lerp(h, -45 + 60 * smoothstep(8, 40, d), smoothstep(-60, -200, z) * 0.0); return h; };
const SAG = (z) => -1.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, (BZ0 - z) / (BZ0 - BZ1))));

export default {
  id: 'living-root-bridge',
  name: 'The Bridge That Grows',
  category: 'wilderness',
  weirdness: 0.75,
  media: ['forest', 'water'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 40); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'overcast', sky: { zenith: '#7a9a94', mid: '#a8c2b8', horizon: '#d8e8de', ground: '#8aa498', horizonPow: 2.2, clouds: { coverage: 0.9, lit: '#d8e8e0', shade: '#7a9890', silver: 0 } } });
    const FOGC = new THREE.Color('#a8c4b8'); scene.fog = new THREE.FogExp2(FOGC, 0.0072); scene.background = new THREE.Color('#a8c2b8');
    await tick();
    const moss = new THREE.Color('#3f6e3a'), dark = new THREE.Color('#1a3a26'), lite = new THREE.Color('#7aa850'), tmp = new THREE.Color(), SUN = new THREE.Vector3(-0.3, 0.9, -0.2).normalize();
    const terr = makeTerrain({
      size: 520, seg: 300, cx: 0, cz: -100, heightFn: hLand, own, sun: [-0.3, 0.9, -0.2],
      colorFn: (h, lit, slope, x, z, out) => { out.copy(dark).lerp(moss, fbm(x * 0.07, z * 0.07, 3)); out.lerp(lite, 0.55 * smoothstep(0.55, 0.8, fbm(x * 0.2, z * 0.2, 3))); out.multiplyScalar(0.55 + 0.6 * lit); out.multiplyScalar(0.7 + 0.5 * fbm(x * 0.6, z * 0.6, 2)); out.lerp(tmp.set('#8aa898'), smoothstep(-5, -36, h) * 0.5); },
    });
    { const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const x = R.range(0, 256), y = R.range(0, 256), r = R.range(1.5, 8), v = R.range(60, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.5)})`; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(120, 120); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true; }
    scene.add(terr);
    const river = new THREE.Mesh(own(new THREE.PlaneGeometry(1200, 1200).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#7a9c94' }))); river.position.set(0, -36.5, -100); scene.add(river); await tick();
    // leaves: broad cards on the slopes
    const lc = mkCanvas(128); { const g = lc.getContext('2d'); g.clearRect(0, 0, 128, 128); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(8, 64); g.quadraticCurveTo(64, 0, 120, 64); g.quadraticCurveTo(64, 128, 8, 64); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 64); g.lineTo(120, 64); g.stroke(); for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(10 + i * 16, 64); g.lineTo(26 + i * 16, 24); g.moveTo(10 + i * 16, 64); g.lineTo(26 + i * 16, 104); g.stroke(); } }
    const lt = own(new THREE.CanvasTexture(lc)); lt.colorSpace = THREE.SRGBColorSpace; const LN = 2600, lv = new THREE.InstancedMesh(own(new THREE.PlaneGeometry(1, 1)), own(new THREE.MeshBasicMaterial({ map: lt, alphaTest: 0.5, side: THREE.DoubleSide })), LN);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    for (let i = 0; i < LN; i++) { const z = R.range(40, -140), cx = 6 * Math.sin(z * 0.02), x = cx + (R() < 0.5 ? -1 : 1) * R.range(3, 48), y = hLand(x, z) + R.range(0, 6), sc = R.range(2.5, 7); _p.set(x, y, z); _q.setFromEuler(_e.set(R.range(-1.2, 0.5), R.range(0, 6.28), R.range(-0.6, 0.6))); _s.set(sc * 1.4, sc, 1); lv.setMatrixAt(i, _m.compose(_p, _q, _s)); lv.setColorAt(i, _c.set(['#2e6a34', '#3f8a3c', '#5aa044', '#1e4a2c', '#78a848'][R.int(0, 4)]).multiplyScalar(R.range(0.7, 1.1))); }
    lv.frustumCulled = false; scene.add(lv); await tick();
    // the roots: braided tubes along the bridge, drawn only up to a growth front that runs ahead of the camera
    const roots = []; const mkTube = (pts, rad, segs = 220) => {
      const crv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(crv, segs, rad, 7, false), p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3), c = new THREE.Color(), ct = new THREE.Color('#7a6048'), cm = new THREE.Color('#4a7040'), cg = new THREE.Color('#9a8a78');
      for (let i = 0; i < p.count; i++) { const f = fbm(p.getX(i) * 0.4, p.getZ(i) * 0.4 + p.getY(i) * 0.3, 3); c.copy(ct).lerp(cg, 0.3 * fbm(p.getX(i) * 2, p.getZ(i) * 2, 2)); c.lerp(cm, smoothstep(0.5, 0.7, f) * 0.75); const lit = 0.55 + 0.6 * Math.max(0, n.getX(i) * SUN.x + n.getY(i) * SUN.y + n.getZ(i) * SUN.z); c.multiplyScalar(lit); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); own(g); const m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ vertexColors: true }))); m.frustumCulled = false; scene.add(m); return { m, total: g.index.count, z0: pts[0].z, z1: pts[pts.length - 1].z };
    };
    const strand = (ox, oy, r, ph, amp = 0.28) => { const pts = []; for (let k = 0; k <= 48; k++) { const z = lerp(BZ0, BZ1 - 4, k / 48); pts.push(new THREE.Vector3(ox + amp * Math.sin(z * 0.55 + ph), oy + SAG(z) + amp * 0.7 * Math.cos(z * 0.47 + ph * 1.3), z)); } return mkTube(pts, r); };
    for (let i = 0; i < 9; i++) roots.push(strand(-1.55 + i * 0.39, -0.28, R.range(0.13, 0.21), R.range(0, 6.28)));
    for (const sx of [-1, 1]) for (const [oy, r] of [[0.9, 0.17], [1.45, 0.14], [1.15, 0.1]]) roots.push(strand(sx * 1.72, oy, r, R.range(0, 6.28), 0.22));
    // woven cross-roots and rail nets: capsules that grow in as the front passes
    const WN = 1100, wv = new THREE.InstancedMesh(own(new THREE.CapsuleGeometry(0.06, 1, 3, 5)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), WN), wd = [];
    for (let i = 0; i < WN; i++) { const deck = i < 760, z = lerp(BZ0, BZ1, R()), side = R() < 0.5 ? -1 : 1; const d = deck ? { z, x: R.range(-1.6, 1.6), y: -0.1 + SAG(z) + R.range(-0.08, 0.12), rx: R.range(-0.3, 0.3), ry: R.range(-0.5, 0.5), rz: Math.PI / 2 + R.range(-0.4, 0.4), L: R.range(1.2, 2.2), r: R.range(0.8, 1.6) } : { z, x: side * 1.72 + R.range(-0.1, 0.1), y: 0.4 + SAG(z) + R.range(0.1, 1.2), rx: R.range(-0.5, 0.5), ry: R.range(-0.4, 0.4), rz: R.range(-0.5, 0.5), L: R.range(0.9, 1.5), r: R.range(0.6, 1.1) }; wd.push(d); wv.setColorAt(i, _c.set(['#7a6048', '#6a5240', '#8a7258', '#4a7040', '#9a8a78'][R.int(0, 4)])); }
    wv.frustumCulled = false; scene.add(wv);
    // the fig: buttress roots arching over the end of the bridge into a doorway
    const FZ = -66; const arch = (sx, bx, h, r) => { const pts = []; for (let k = 0; k <= 12; k++) { const a = k / 12; pts.push(new THREE.Vector3(sx * (bx * (1 - a) + 0.6 * a * 0) + 0.6 * Math.sin(a * 5 + sx), -22 + (h + 22) * Math.pow(a, 0.8) + 0.4 * Math.sin(a * 7), FZ - a * 5 + 0.8 * Math.sin(a * 4 + sx * 2))); } return mkTube(pts, r * (0.6 + 0.4), 80); };
    const big = []; for (let i = 0; i < 9; i++) { const sx = i % 2 ? 1 : -1, bx = 3.2 + R.range(0, 5), pts = []; const top = 7.5 + R.range(-1, 2.5), r = R.range(0.9, 1.7); for (let k = 0; k <= 14; k++) { const a = k / 14, ease = a * a * (3 - 2 * a); pts.push(new THREE.Vector3(sx * (bx * (1 - Math.pow(a, 1.6)) * (1 - 0.1 * ease) + 0.3 * Math.sin(a * 6 + i)), -26 + (top + 26) * Math.pow(a, 0.85), FZ - 2 - 14 * a * a + R.range(-0.6, 0.6) + (i % 3) * 1.2 * (1 - a))); } big.push(mkTube(pts, r, 100)); }
    for (let i = 0; i < 6; i++) { const pts = []; const sx = i % 2 ? 1 : -1, hh = R.range(0, 8), z0 = FZ - 4 - i * 2; for (let k = 0; k <= 10; k++) { const a = k / 10; pts.push(new THREE.Vector3(sx * (7 - 6.2 * a) + R.range(-0.3, 0.3), -24 + (hh + 24) * Math.pow(a, 0.7), z0 - 10 * a)); } big.push(mkTube(pts, R.range(0.5, 1.1), 60)); }
    // glow beyond the door
    const gC = mkCanvas(128); { const g = gC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,244,200,1)'); rg.addColorStop(0.4, 'rgba(255,222,150,0.45)'); rg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const gT = own(new THREE.CanvasTexture(gC)); gT.colorSpace = THREE.SRGBColorSpace; const glow = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: gT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.0 }))); glow.scale.set(40, 40, 1); glow.position.set(0, 3.5, FZ - 40); scene.add(glow);
    // mist and rain
    const mM = own(new THREE.SpriteMaterial({ map: gT, color: '#e8f4ee', transparent: true, depthWrite: false, opacity: 0.22, fog: true }));
    for (let i = 0; i < 90; i++) { const sp = new THREE.Sprite(mM); const sc = R.range(25, 70); sp.scale.set(sc * 1.5, sc * 0.5, 1); sp.position.set(R.range(-50, 50), R.range(-30, 14), R.range(30, -150)); scene.add(sp); }
    const DN = 1500, dp = new Float32Array(DN * 6), dc = new Float32Array(DN * 6), dd = []; for (let i = 0; i < DN; i++) dd.push({ x: R.range(-16, 16), z: R.range(-26, 8), y: R.range(0, 40), l: R.range(0.6, 1.3) });
    const dg = own(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('color', new THREE.BufferAttribute(dc, 3));
    const rain = new THREE.LineSegments(dg, own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); rain.frustumCulled = false; scene.add(rain);
    await tick();
    return {
      scene, path, duration: DUR, title: 'The Bridge That Grows', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 68, near: 0.2, nearThrough: 0.4, far: 1800, lookAhead: 10, sway: 0, bank: 0.03 },
      pois: [],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#fff0c0', veil: '#fff0c0', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.12, radius: 0.45, threshold: 0.94 }, grade: { saturation: 1.1, contrast: 1.05, tint: '#f4fff4', shadowTint: '#0c2a24', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        // growth front: runs ahead of the camera; the closer the camera gets, the more finished the roots
        const front = cp.z - (4 + 10 * (1 - smoothstep(0, 2, T))) - 7 * Math.sin(t * 0.8) * 0.0; const Lb = BZ0 - BZ1 + 4;
        for (const r of roots) { const f = Math.min(1, Math.max(0, (r.z0 - front) / Lb)); r.m.geometry.setDrawRange(0, Math.floor(f * r.total / 3) * 3); }
        for (let i = 0; i < WN; i++) { const d = wd[i], k = smoothstep(front + 4, front - 1.5, d.z) * d.r; _p.set(d.x, d.y, d.z); _q.setFromEuler(_e.set(d.rx, d.ry, d.rz)); const L = d.L * k + 0.001; _s.set(k + 0.001, L, k + 0.001); wv.setMatrixAt(i, _m.compose(_p, _q, _s)); }
        wv.instanceMatrix.needsUpdate = true;
        glow.material.opacity = 0.4 * smoothstep(9, 15, T);
        for (let i = 0; i < DN; i++) { const d = dd[i], y = ((d.y - t * 16) % 40 + 40) % 40 - 12, n = i * 6; dp[n] = cp.x + d.x; dp[n + 1] = cp.y + y; dp[n + 2] = cp.z + d.z; dp[n + 3] = dp[n]; dp[n + 4] = dp[n + 1] + d.l; dp[n + 5] = dp[n + 2]; const f = 0.16 + 0.14 * (1 - Math.abs(y - 4) / 20); dc[n] = f * 0.85; dc[n + 1] = f * 0.95; dc[n + 2] = f; dc[n + 3] = 0; dc[n + 4] = 0; dc[n + 5] = 0; }
        dg.attributes.position.needsUpdate = true; dg.attributes.color.needsUpdate = true;
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
