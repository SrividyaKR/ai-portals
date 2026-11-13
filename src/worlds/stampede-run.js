// THE STAMPEDE FROM ABOVE: you are a bird riding the thermals over the African savanna in the golden hour while a vast herd stampedes
// beneath you. Wildebeest, zebra and gazelle pour across the plain in a river of bodies and dust. You glide high over the whole sweep of
// it past baobabs, acacias and rock kopjes, with vultures circling in the thermals around you. Then you stoop to a few metres above the
// leaders, the dust boiling up round you, and follow the herd as it funnels into a red canyon, pours along the gorge, and hurls itself
// across a river in a storm of spray. You climb out into the sunset over the plain and a small glowing ring.
// The camera moves at constant speed, so the flight is laid out by distance: z = 40 - 24 T. Herd, trees and rocks never come near the camera.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, ridged, pathFrom, makeTerrain, makeBird, skyFor } from '../kit/mine.js';

const DUR = 20, V = 24, HV = 15, ZR = -370;
const CXF = (z) => 18 * Math.sin(z * 0.013) + 10 * Math.sin(z * 0.034 + 1);
const HW = (z) => 90 - 74 * smoothstep(-130, -190, z) + 74 * smoothstep(-320, -370, z);
const hLand = (x, z) => {
  const dx = Math.abs(x - CXF(z)), hw = HW(z), wall = smoothstep(hw, hw + 18, dx) * smoothstep(-150, -200, z) * (1 - smoothstep(-320, -380, z));
  let h = 1.4 * fbm(x * 0.03, z * 0.03, 3) + 0.25 * fbm(x * 0.4, z * 0.4, 2) + wall * (26 + 40 * Math.pow(ridged(x * 0.012 + 4, z * 0.012, 4), 1.3));
  h += 9 * smoothstep(0.66, 0.78, fbm(x * 0.012 + 7, z * 0.012, 3)) * (1 - wall);                       // low rocky rises on the plain
  h += 70 * smoothstep(hw + 90, hw + 260, dx) * (0.4 + 0.6 * fbm(x * 0.005, z * 0.005, 3));            // the far escarpment
  h -= 3.2 * Math.exp(-Math.pow((z - ZR) / 17, 2)) * (1 - smoothstep(hw + 20, hw + 90, dx));          // the river bed
  return h;
};
const hSm = (x, z) => { let a = 0; for (let k = -4; k <= 4; k++) a += hLand(x, z + k * 4) * (1 - Math.abs(k) / 5); return a / 4.8; };
const KEYS = [[0, 54], [3, 42], [5.6, 17], [8, 30], [10, 44], [11.6, 19], [15, 15], [16.6, 10], [17.8, 14], [20, 58]];
const keyed = (T) => { for (let i = 1; i < KEYS.length; i++) if (T <= KEYS[i][0]) return lerp(KEYS[i - 1][1], KEYS[i][1], sm((T - KEYS[i - 1][0]) / (KEYS[i][0] - KEYS[i - 1][0]))); return KEYS[KEYS.length - 1][1]; };
const camAt = (T) => { const z = 40 - V * T, cx = CXF(z), lim = Math.max(8, HW(z) - 14), x = cx + Math.max(-lim, Math.min(lim, 17 * Math.sin(T * 0.5))); return [x, Math.max(keyed(T), hSm(x, z) + 9), z]; };

export default {
  id: 'stampede-run',
  name: 'The Stampede From Above',
  category: 'wilderness',
  weirdness: 0.55,
  media: ['open', 'air'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 100); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'goldenHour', sky: { zenith: '#3a62a8', mid: '#c0a888', horizon: '#ffc080', ground: '#c89c68', horizonPow: 2.4, clouds: { coverage: 0.4, lit: '#ffe4c0', shade: '#b89078', silver: 0 } } });
    const FOGC = new THREE.Color('#e0b078'); scene.fog = new THREE.FogExp2(FOGC, 0.0032); scene.background = new THREE.Color('#e0b684');
    await tick();
    const gr1 = new THREE.Color('#c8a456'), gr2 = new THREE.Color('#a29044'), gr3 = new THREE.Color('#e4c474'), soil = new THREE.Color('#b0703c'), grn = new THREE.Color('#5a7a34'), rk1 = new THREE.Color('#b0583a'), rk2 = new THREE.Color('#7a3a2c'), rk3 = new THREE.Color('#d08860'), tmp = new THREE.Color();
    const terr = makeTerrain({
      size: 1900, seg: 500, cx: 0, cz: -420, heightFn: hLand, own, sun: [-0.55, 0.4, 0.45],
      colorFn: (h, lit, slope, x, z, out) => {
        out.copy(gr1).lerp(gr2, fbm(x * 0.03, z * 0.03, 3)); out.lerp(gr3, 0.5 * smoothstep(0.5, 0.75, fbm(x * 0.12, z * 0.12, 2))); out.lerp(soil, 0.55 * smoothstep(0.55, 0.72, fbm(x * 0.02 + 5, z * 0.02, 3)));
        out.lerp(grn, 0.8 * (1 - smoothstep(-1, 3, h)) * smoothstep(-2, -0.5, h + 2)); out.lerp(tmp.set('#4a6a44'), Math.exp(-Math.pow((z - ZR) / 28, 2)) * 0.5);
        const wallish = smoothstep(7, 18, h) * 0.85 + smoothstep(0.22, 0.5, slope); tmp.copy(rk1).lerp(rk2, 0.5 + 0.5 * Math.sin(h * 0.5 + fbm(x * 0.1, z * 0.1, 2) * 5)); tmp.lerp(rk3, lit * 0.4); out.lerp(tmp, Math.min(1, wallish));
        out.multiplyScalar(0.55 + 0.75 * lit); out.multiplyScalar(0.8 + 0.35 * fbm(x * 0.5, z * 0.5, 2));
      },
    });
    { const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1100; i++) { const x = R.range(0, 256), y = R.range(0, 256), v = R.range(60, 255) | 0; g.strokeStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.5)})`; g.lineWidth = R.range(0.6, 1.6); g.beginPath(); g.moveTo(x, y); g.lineTo(x + R.range(-2, 2), y - R.range(3, 9)); g.stroke(); }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(300, 300); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true; }
    scene.add(terr);
    const flat = new THREE.Mesh(own(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#b89a64' }))); flat.position.y = -6; scene.add(flat);   // so the terrain's edge never shows a void
    const water = new THREE.Mesh(own(new THREE.PlaneGeometry(520, 44).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#7a9a98', transparent: true, opacity: 0.8 }))); water.position.set(CXF(ZR), -0.9, ZR); scene.add(water);
    await tick();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    // savanna furniture, all outside the herd's corridor
    const outside = (z, pad) => { const side = R() < 0.5 ? -1 : 1; return CXF(z) + side * (HW(z) * 0.82 + pad + R.range(0, 90)); };
    const aTr = own(new THREE.CylinderGeometry(0.28, 0.45, 6, 6).translate(0, 3, 0)), aCan = own(new THREE.SphereGeometry(1, 10, 6).scale(1, 0.2, 1).translate(0, 6.3, 0)), AN2 = 260, acT = new THREE.InstancedMesh(aTr, own(new THREE.MeshBasicMaterial({ color: '#4a3424' })), AN2), acC = new THREE.InstancedMesh(aCan, own(new THREE.MeshBasicMaterial({ color: '#5a7a34' })), AN2);
    for (let i = 0; i < AN2; i++) { const z = R.range(100, -520), x = outside(z, 6), sc = R.range(1.2, 2.6); _p.set(x, hLand(x, z), z); _q.setFromEuler(_e.set(0, R.range(0, 6.28), 0)); _s.set(sc, sc * R.range(0.9, 1.3), sc); acT.setMatrixAt(i, _m.compose(_p, _q, _s)); _s.set(sc * 3.2, sc * 1.3, sc * 3.2); acC.setMatrixAt(i, _m.compose(_p, _q, _s)); acC.setColorAt(i, _c.set(['#5a7a34', '#6a8a3a', '#4a6a30', '#7a8a44'][R.int(0, 3)])); }
    acT.frustumCulled = acC.frustumCulled = false; scene.add(acT, acC);
    const BAO = [], bTr = own(new THREE.CylinderGeometry(0.75, 1.15, 1, 10).translate(0, 0.5, 0)), bBr = own(new THREE.CylinderGeometry(0.16, 0.3, 1, 5).translate(0, 0.5, 0)), bm = new THREE.InstancedMesh(bTr, own(new THREE.MeshBasicMaterial({ color: '#8a7058' })), 16), bb = new THREE.InstancedMesh(bBr, own(new THREE.MeshBasicMaterial({ color: '#7a6450' })), 16 * 6), bl = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 8, 6).scale(1, 0.5, 1)), own(new THREE.MeshBasicMaterial({ color: '#6a8a3a' })), 16 * 6);
    for (let i = 0; i < 16; i++) { const z = R.range(60, -480), x = outside(z, 20), sc = R.range(5, 8.5), y = hLand(x, z); BAO.push([x, y, z, sc]); _p.set(x, y, z); _q.identity(); _s.set(sc, sc * 2.4, sc); bm.setMatrixAt(i, _m.compose(_p, _q, _s));
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + R.range(0, 1), len = sc * R.range(0.9, 1.4); _p.set(x, y + sc * 2.3, z); _q.setFromEuler(_e.set(Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05)); _s.set(sc * 0.55, len, sc * 0.55); bb.setMatrixAt(i * 6 + k, _m.compose(_p, _q, _s)); _p.set(x + Math.cos(a) * len * 0.8, y + sc * 2.3 + len * 0.55, z + Math.sin(a) * len * 0.8); _q.identity(); _s.set(sc * 0.9, sc * 0.7, sc * 0.9); bl.setMatrixAt(i * 6 + k, _m.compose(_p, _q, _s)); } }
    bm.frustumCulled = bb.frustumCulled = bl.frustumCulled = false; scene.add(bm, bb, bl);
    const KN = 22 * 8, kop = new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1, 1)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), KN); let ki = 0;
    for (let c = 0; c < 22; c++) { const z = R.range(80, -500), x0 = outside(z, 14), y0 = hLand(x0, z), s0 = R.range(4, 9); for (let k = 0; k < 8; k++) { const a = R.range(0, 6.28), d = k === 0 ? 0 : R.range(0.4, 1.3) * s0, sc = s0 * R.range(0.4, 1) * (k === 0 ? 1.2 : 1); _p.set(x0 + Math.cos(a) * d, y0 + (k === 0 ? 0 : R.range(0, 0.6)) * s0 * 0.7 + sc * 0.4, z + Math.sin(a) * d); _q.setFromEuler(_e.set(R(), R(), R())); _s.set(sc * 1.2, sc * 0.9, sc); kop.setMatrixAt(ki, _m.compose(_p, _q, _s)); kop.setColorAt(ki++, _c.set(['#8a6048', '#7a5440', '#9a7058'][k % 3])); } }
    kop.frustumCulled = false; scene.add(kop); await tick();
    // the herd: wildebeest, zebra and gazelle; body, head, and a gallop of legs, all instanced and flowing down the plain
    const AM = 1500, mb = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const mk = (geo, n) => { const m = new THREE.InstancedMesh(own(geo), mb, n); m.frustumCulled = false; scene.add(m); return m; };
    const bodyM = mk(new THREE.SphereGeometry(1, 8, 6).scale(0.5, 0.58, 1.15), AM), headM = mk(new THREE.BoxGeometry(0.34, 0.46, 0.8), AM), legF = mk(new THREE.CapsuleGeometry(0.1, 1.0, 3, 5), AM), legB = mk(new THREE.CapsuleGeometry(0.1, 1.0, 3, 5), AM);
    const herd = []; for (let i = 0; i < AM; i++) { const kind = R(), sp = kind < 0.68 ? 0 : kind < 0.88 ? 1 : 2, w = (R() + R() + R() - 1.5) / 1.5 * 0.95; herd.push({ z0: R.range(0, 620), w, sp, sc: sp === 0 ? R.range(1.3, 1.7) : sp === 1 ? R.range(1.25, 1.5) : R.range(0.85, 1.05), ph: R.range(0, 6.28), vv: R.range(0.9, 1.12) });
      const col = sp === 0 ? _c.set(['#6a5a4c', '#5a4a40', '#7a6a58', '#4a3e36'][R.int(0, 3)]) : sp === 1 ? _c.set(['#ece6dc', '#d8d0c4'][R.int(0, 1)]) : _c.set('#c89a60'); col.multiplyScalar(R.range(0.8, 1.1)); bodyM.setColorAt(i, col); headM.setColorAt(i, _c.clone().multiplyScalar(sp === 1 ? 0.35 : 0.8)); legF.setColorAt(i, _c.clone().multiplyScalar(sp === 1 ? 0.3 : 0.65)); legB.setColorAt(i, _c.clone().multiplyScalar(sp === 1 ? 0.3 : 0.65)); }
    const AP = [], ahead = (a, t, out) => { const z = 120 - ((120 - a.z0 + HV * t * a.vv) % 620 + 620) % 620, cx = CXF(z), hw = HW(z); const x = cx + a.w * hw * 0.82; out.set(x, hLand(x, z), z); return out; };
    // dust boiling up behind the herd, spray where it crosses the river, and gold motes
    const dC = mkCanvas(64); { const g = dC.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,232,186,1)'); rg.addColorStop(0.5, 'rgba(240,204,148,0.45)'); rg.addColorStop(1, 'rgba(230,190,130,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const dT = own(new THREE.CanvasTexture(dC)); dT.colorSpace = THREE.SRGBColorSpace;
    const DN = 1700, dp = new Float32Array(DN * 3), dc = new Float32Array(DN * 3), dg = own(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('color', new THREE.BufferAttribute(dc, 3));
    const dust = new THREE.Points(dg, own(new THREE.PointsMaterial({ map: dT, size: 9, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); dust.frustumCulled = false; scene.add(dust);
    const SPN = 900, sp2 = new Float32Array(SPN * 3), sc2 = new Float32Array(SPN * 3), sg = own(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(sp2, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc2, 3));
    const spray = new THREE.Points(sg, own(new THREE.PointsMaterial({ map: dT, size: 2.6, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); spray.frustumCulled = false; scene.add(spray);
    // vultures riding the thermals
    const vultures = []; for (let i = 0; i < 11; i++) { const b = makeBird({ body: '#3a3236', belly: '#8a7a6a', head: '#c8a890', wing: '#4a4046', feather: '#26222a', scale: 3.0, own, span: 1.0 }); scene.add(b.g); const k = i < 6 ? 0 : 1; vultures.push({ b, cx: k ? CXF(-250) - 40 : CXF(-90) + 55, cz: k ? -250 : -90, cy: (k ? 82 : 72) + R.range(-10, 14), r: R.range(26, 52), sp: R.range(0.18, 0.28) * (k ? -1 : 1), ph: R.range(0, 6.28) }); }
    await tick();
    const camAtU = (u) => camAt(Math.max(0, Math.min(1, u)) * DUR);
    const _a = new THREE.Vector3(), _fp = new THREE.Vector3();
    return {
      scene, path, duration: DUR, title: 'The Stampede From Above', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 68, near: 0.3, nearThrough: 0.6, far: 3000, lookAhead: 24, sway: 0, bank: 0.16 },
      pois: [
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0], 2, c[2] - 55]; }, from: 0.03, to: 0.2, fade: 0.3, weight: 0.8 },                                  // down on the herd
        { at: (tm, uu) => { const c = camAtU(uu); const b = BAO.reduce((m, o) => (Math.abs(o[2] - (c[2] - 30)) < Math.abs(m[2] - (c[2] - 30)) ? o : m), BAO[0]); return [b[0], b[1] + b[3] * 3, b[2]]; }, from: 0.22, to: 0.32, fade: 0.3, weight: 0.8 },   // a baobab
        { at: (tm, uu) => { const c = camAtU(uu); return [CXF(-90) + 55, 70, -90]; }, from: 0.36, to: 0.47, fade: 0.3, weight: 0.8 },                           // the vultures
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0], 0, c[2] - 28]; }, from: 0.52, to: 0.78, fade: 0.25, weight: 0.8 },                              // the herd pouring down the gorge and into the river
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0] + 20, 24, c[2] - 300]; }, from: 0.88, to: 0.98, fade: 0.2, weight: 0.5 },
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#ffe8b8', veil: '#ffe8b8', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.14, radius: 0.45, threshold: 0.93 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#fff2dc', shadowTint: '#3a1a14', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        for (let i = 0; i < AM; i++) {
          const a = herd[i]; ahead(a, t, _fp); AP[i] = AP[i] || [0, 0, 0]; AP[i][0] = _fp.x; AP[i][1] = _fp.y; AP[i][2] = _fp.z;
          const ph = t * 9 * a.vv + a.ph, inR = Math.abs(_fp.z - ZR) < 20 ? 1 : 0, y = _fp.y + a.sc * (0.95 + 0.14 * Math.abs(Math.sin(ph)) - 0.35 * inR), sc = a.sc, x = _fp.x, z = _fp.z, g = Math.sin(ph) * 0.8;
          _q.setFromEuler(_e.set(-0.05 * Math.sin(ph), 0, 0)); _p.set(x, y, z); _s.set(sc, sc, sc); bodyM.setMatrixAt(i, _m.compose(_p, _q, _s));
          _p.set(x, y + 0.18 * sc, z - 1.25 * sc); _q.setFromEuler(_e.set(0.45 + 0.2 * Math.sin(ph + 1), 0, 0)); headM.setMatrixAt(i, _m.compose(_p, _q, _s));
          _p.set(x, y - 0.55 * sc, z - 0.65 * sc); _q.setFromEuler(_e.set(g, 0, 0)); _s.set(sc * 2.2, sc, sc); legF.setMatrixAt(i, _m.compose(_p, _q, _s));
          _p.set(x, y - 0.55 * sc, z + 0.65 * sc); _q.setFromEuler(_e.set(-g, 0, 0)); legB.setMatrixAt(i, _m.compose(_p, _q, _s));
        }
        for (const o of [bodyM, headM, legF, legB]) o.instanceMatrix.needsUpdate = true;
        for (let k = 0; k < DN; k++) { const A = AP[(k * 7) % AM]; const age = ((t * 0.5 + k * 0.137) % 1), n = k * 3; dp[n] = A[0] + 2.5 * Math.sin(k + t); dp[n + 1] = A[1] + 0.8 + age * 7; dp[n + 2] = A[2] + 2 + age * 16; const f = Math.pow(1 - age, 1.6) * 0.16; dc[n] = f; dc[n + 1] = f * 0.86; dc[n + 2] = f * 0.6; }
        dg.attributes.position.needsUpdate = true; dg.attributes.color.needsUpdate = true;
        for (let k = 0; k < SPN; k++) { const A = AP[(k * 5 + 3) % AM], age = ((t * 1.3 + k * 0.211) % 1), n = k * 3, on = Math.abs(A[2] - ZR) < 22 ? 1 : 0, a = k * 2.399; sp2[n] = A[0] + Math.cos(a) * 3 * age; sp2[n + 1] = A[1] + 0.3 + 5 * Math.sin(age * Math.PI); sp2[n + 2] = A[2] + Math.sin(a) * 3 * age; const f = on * (1 - age) * 0.5; sc2[n] = f * 0.9; sc2[n + 1] = f; sc2[n + 2] = f; }
        sg.attributes.position.needsUpdate = true; sg.attributes.color.needsUpdate = true;
        for (const v of vultures) { const th = v.ph + t * v.sp, x = v.cx + Math.cos(th) * v.r, z = v.cz + Math.sin(th) * v.r, y = v.cy + 3 * Math.sin(t * 0.4 + v.ph); v.b.g.position.set(x, y, z); const sg2 = Math.sign(v.sp); v.b.g.rotation.set(0.03, Math.atan2(-Math.sin(th) * sg2, Math.cos(th) * sg2), -0.38 * sg2); v.b.pose({ flap: 0, glide: 1, dive: 0, t }); }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
