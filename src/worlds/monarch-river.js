// THE RIVER OF WINGS: every winter in the oyamel fir forests of Michoacan, Mexico, millions of monarch butterflies arrive and cover the trees
// so thickly that the trunks glow orange. You fly low through the forest at first light, with golden shafts of sun coming down through the
// canopy and rivers of monarchs pouring through the air around you, thousands of real-shaped, flapping wings with veins and white-spotted
// borders. The camera weaves between the giant trunks, looks up at the butterfly-coated boughs, down along the streams, then climbs out
// through the canopy into the sunrise where the orange rivers run on over the mountains toward a small glowing ring.
// The camera moves at constant speed: z = 30 - 9 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, ridged, pathFrom, makeTerrain, skyFor } from '../kit/mine.js';

const DUR = 20, V = 9, LZ = 300;
const TX = (z) => 9 * Math.sin(z * 0.04) + 4 * Math.sin(z * 0.1 + 1);
const hLand = (x, z) => { const d = Math.abs(x - TX(z)); return 3 * fbm(x * 0.03, z * 0.03, 3) + 0.4 * fbm(x * 0.3, z * 0.3, 2) + smoothstep(26, 140, d) * (30 + 60 * fbm(x * 0.012, z * 0.012, 3)) + 240 * smoothstep(-260, -520, z) * Math.pow(ridged(x * 0.003 + 2, z * 0.003, 5), 1.4); };
const camAt = (T) => { const z = 30 - V * T, rise = sm(Math.min(1, Math.max(0, (T - 13.5) / 6.5))); const x = TX(z) + 3.2 * Math.sin(T * 0.6) + 1.2 * Math.sin(T * 1.5); return [x, 3 * fbm(x * 0.03, z * 0.03, 3) + 0.4 + 2.5 + 0.3 * Math.sin(T * 1.1) + 46 * rise, z]; };
// butterflies drinking on the damp ground in patches beside the trail; each patch bursts into the air as you reach it
const PATCH = Array.from({ length: 13 }, (_, k) => { const z = 6 - k * 11.5, side = k % 2 ? 1 : -1, x = TX(z) + side * (3.4 + (k * 37 % 10) * 0.22); return { x, z }; });
const STREAMS = Array.from({ length: 8 }, (_, k) => ({ L: (k - 3.5) * 1.7, h: 2.2 + (k % 4) * 2.4, ph: k * 1.7, climb: k % 3 === 0 }));
const sx = (k, z) => { const S = STREAMS[k]; return TX(z) + S.L + 4.5 * Math.sin(z * 0.06 + S.ph); };
const sy = (k, z, t) => { const S = STREAMS[k]; return S.h + 2.3 * Math.sin(z * 0.05 + S.ph * 2) + (S.climb ? 44 * smoothstep(-70, -170, z) : 0) + 0.3 * Math.sin(t + k); };

export default {
  id: 'monarch-river',
  name: 'The River of Wings',
  category: 'wilderness',
  weirdness: 0.7,
  media: ['forest', 'air'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 70); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'dawn', sky: { zenith: '#4a78b8', mid: '#a8b8c0', horizon: '#ffd8a0', ground: '#b8a078', horizonPow: 2.3, clouds: { coverage: 0.3, lit: '#fff0d0', shade: '#b8a898', silver: 0 } } });
    const FOGC = new THREE.Color('#e0c08a'); scene.fog = new THREE.FogExp2(FOGC, 0.0105); scene.background = new THREE.Color('#e8c890');
    await tick();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color(), ZA = new THREE.Vector3(0, 0, 1), YA = new THREE.Vector3(0, 1, 0);
    // forest floor: leaf litter, moss, dappled gold where the sun comes through
    const lt1 = new THREE.Color('#5a4630'), lt2 = new THREE.Color('#7a5a34'), mos = new THREE.Color('#3a5030'), gold = new THREE.Color('#f0c870');
    const terr = makeTerrain({ size: 1000, seg: 340, cx: 0, cz: -200, heightFn: hLand, own, sun: [-0.3, 0.8, 0.3], colorFn: (h, lit, slope, x, z, out) => { out.copy(lt1).lerp(lt2, fbm(x * 0.12, z * 0.12, 3)); out.lerp(mos, 0.6 * smoothstep(0.5, 0.72, fbm(x * 0.05 + 3, z * 0.05, 3))); out.lerp(gold, 0.55 * smoothstep(0.58, 0.72, fbm(x * 0.09 + 7, z * 0.09 + 2, 2))); out.multiplyScalar(0.7 + 0.6 * lit); out.multiplyScalar((0.8 + 0.4 * fbm(x * 0.6, z * 0.6, 2)) * 1.9); } });
    { const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1000; i++) { const x = R.range(0, 256), y = R.range(0, 256), r = R.range(1, 6), v = R.range(60, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.5)})`; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(180, 180); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true; }
    scene.add(terr); await tick();
    // ---- oyamel firs: barked trunks plus whorls of painted fir-branch cards, so the trees have real needled boughs ----
    const bkC = mkCanvas(256); { const g = bkC.getContext('2d'); g.fillStyle = '#4a3a30'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 160; i++) { const x = R.range(0, 256), w = R.range(2, 9), v = R.range(20, 90) | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 12},${R.range(0.25, 0.7)})`; g.fillRect(x, 0, w, 256); }
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${R.range(120, 170) | 0},${R.range(100, 140) | 0},${R.range(80, 110) | 0},0.35)`; g.fillRect(R.range(0, 256), R.range(0, 256), R.range(1, 3), R.range(10, 50)); }
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,100,50,${R.range(0.15, 0.4)})`; g.beginPath(); g.ellipse(R.range(0, 256), R.range(0, 256), R.range(6, 22), R.range(4, 14), 0, 0, 6.28); g.fill(); } }
    const bkT = own(new THREE.CanvasTexture(bkC)); bkT.wrapS = bkT.wrapT = THREE.RepeatWrapping; bkT.repeat.set(2, 6); bkT.colorSpace = THREE.SRGBColorSpace; bkT.anisotropy = 8;
    const frC = mkCanvas(256); frC.height = 128; { const g = frC.getContext('2d'); g.clearRect(0, 0, 256, 128); const cols = ['#173a22', '#1f4a2c', '#2a5e38', '#3a7444', '#4a8a50'];
      g.strokeStyle = '#3a2a1e'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 64); g.lineTo(250, 64); g.stroke();
      for (let i = 0; i < 360; i++) { const x = R.range(2, 246), side = R() < 0.5 ? -1 : 1, len = R.range(14, 46) * (1 - x / 330), ang = side * R.range(0.5, 1.25), y = 64; g.strokeStyle = cols[R.int(0, 4)]; g.lineWidth = R.range(1.2, 2.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(ang) * len * 0.55 + 6, y + side * Math.cos(ang) * len); g.stroke(); } }
    const frT = own(new THREE.CanvasTexture(frC)); frT.colorSpace = THREE.SRGBColorSpace; frT.anisotropy = 4;
    const TN = 380, trunks = new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.5, 0.95, 38, 10, 4).translate(0, 19, 0)), own(new THREE.MeshBasicMaterial({ map: bkT, color: '#ffffff' })), TN); trunks.frustumCulled = false;
    const WH = 15, PER = 7, cards = new THREE.InstancedMesh(own(new THREE.PlaneGeometry(3.6, 1.9).translate(1.8, 0, 0).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: frT, alphaTest: 0.5, side: THREE.DoubleSide })), TN * WH * PER); cards.frustumCulled = false; const TL = []; let cn = 0;
    for (let i = 0; i < TN; i++) { let x, z; do { z = R.range(60, -230); x = TX(z) + (R() < 0.5 ? -1 : 1) * R.range(8, 80); } while (Math.abs(x - TX(z)) < 8); const sc = R.range(0.8, 1.35), y = hLand(x, z), rot = R.range(0, 6.28); TL.push([x, y, z, sc]);
      _p.set(x, y, z); _q.setFromEuler(_e.set(R.range(-0.02, 0.02), rot, R.range(-0.02, 0.02))); _s.set(sc, sc * R.range(0.92, 1.12), sc); trunks.setMatrixAt(i, _m.compose(_p, _q, _s)); trunks.setColorAt(i, _c.set('#ffffff').multiplyScalar(R.range(0.8, 1.1)));
      for (let w = 0; w < WH; w++) { const hh = (9 + w * 1.95) * sc, lenK = (1.35 - w / WH * 0.95) * sc; for (let k = 0; k < PER; k++) { const a = (k / PER) * 6.2832 + w * 0.7 + R.range(-0.25, 0.25), droop = 0.28 + 0.4 * (w / WH) + R.range(-0.08, 0.1); _p.set(x, y + hh + R.range(-0.3, 0.3), z); _q.setFromEuler(_e.set(0, a, -droop)); _s.set(lenK, lenK, lenK * R.range(0.8, 1.2)); cards.setMatrixAt(cn, _m.compose(_p, _q, _s)); cards.setColorAt(cn++, _c.set('#ffffff').multiplyScalar(R.range(0.65, 1.1) * (0.8 + 0.2 * w / WH))); } } }
    cards.count = cn; scene.add(trunks, cards);
    // the butterflies resting on the trees: trunks and boughs furred with orange, each a tiny closed-wing monarch
    { const per = 260, CN = TN * per, cp = new Float32Array(CN * 3), cc = new Float32Array(CN * 3); let n = 0; for (let i = 0; i < TN; i++) { const [x, y, z, sc] = TL[i]; for (let k = 0; k < per; k++) { const h = R.range(1.5, 34) * sc, a = R.range(0, 6.28), r = (k < 170 ? R.range(0.52, 1.0) * (1 + (34 - h) * 0.014) : R.range(1.6, Math.max(1.7, 7 - h * 0.15))) * sc; cp[n * 3] = x + Math.cos(a) * r; cp[n * 3 + 1] = y + h; cp[n * 3 + 2] = z + Math.sin(a) * r; _c.set(['#ff7a14', '#ff9a30', '#f06a10', '#ffb04a', '#e85c0c'][R.int(0, 4)]).multiplyScalar(R.range(0.75, 1.1)); cc[n * 3] = _c.r; cc[n * 3 + 1] = _c.g; cc[n * 3 + 2] = _c.b; n++; } }
      const cg = own(new THREE.BufferGeometry()); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      const rc = mkCanvas(64), rg = rc.getContext('2d'); rg.clearRect(0, 0, 64, 64); rg.fillStyle = '#141008'; rg.beginPath(); rg.moveTo(32, 6); rg.bezierCurveTo(62, 6, 62, 40, 32, 60); rg.bezierCurveTo(2, 40, 2, 6, 32, 6); rg.fill(); rg.fillStyle = '#fff'; rg.beginPath(); rg.moveTo(32, 12); rg.bezierCurveTo(54, 12, 54, 38, 32, 52); rg.bezierCurveTo(10, 38, 10, 12, 32, 12); rg.fill(); rg.strokeStyle = '#141008'; rg.lineWidth = 2; rg.beginPath(); rg.moveTo(32, 8); rg.lineTo(32, 58); rg.moveTo(32, 30); rg.lineTo(14, 18); rg.moveTo(32, 30); rg.lineTo(50, 18); rg.moveTo(32, 40); rg.lineTo(16, 38); rg.moveTo(32, 40); rg.lineTo(48, 38); rg.stroke();
      const rt = own(new THREE.CanvasTexture(rc)); rt.colorSpace = THREE.SRGBColorSpace;
      const clusters = new THREE.Points(cg, own(new THREE.PointsMaterial({ map: rt, size: 0.46, sizeAttenuation: true, vertexColors: true, alphaTest: 0.4, depthWrite: true }))); clusters.frustumCulled = false; scene.add(clusters); }
    await tick();
    // ---- the floor: painted leaf litter, ferns, mossy stones, mushrooms and wildflowers ----
    const llC = mkCanvas(512), lg = llC.getContext('2d'); lg.fillStyle = '#5a4430'; lg.fillRect(0, 0, 512, 512); const LC = ['#8a6a3a', '#a88048', '#b8924e', '#7a5a34', '#98803e', '#8a7a3e', '#a8703a'];
    for (let i = 0; i < 1500; i++) { const x = R.range(0, 512), y = R.range(0, 512), a = R.range(0, 6.28), L = R.range(5, 13); lg.save(); lg.translate(x, y); lg.rotate(a); lg.fillStyle = LC[R.int(0, 6)]; lg.beginPath(); lg.ellipse(0, 0, L, L * 0.4, 0, 0, 6.28); lg.fill(); lg.strokeStyle = 'rgba(30,18,8,0.5)'; lg.lineWidth = 1; lg.beginPath(); lg.moveTo(-L, 0); lg.lineTo(L, 0); lg.stroke(); lg.restore(); }
    for (let i = 0; i < 260; i++) { lg.strokeStyle = `rgba(${R.range(40, 80) | 0},${R.range(26, 50) | 0},14,0.8)`; lg.lineWidth = R.range(1, 2.4); const x = R.range(0, 512), y = R.range(0, 512), a = R.range(0, 6.28), L = R.range(14, 40); lg.beginPath(); lg.moveTo(x, y); lg.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); lg.stroke(); }
    for (let i = 0; i < 120; i++) { lg.fillStyle = `rgba(74,110,52,${R.range(0.2, 0.5)})`; lg.beginPath(); lg.arc(R.range(0, 512), R.range(0, 512), R.range(5, 20), 0, 6.28); lg.fill(); }
    const llT = own(new THREE.CanvasTexture(llC)); llT.wrapS = llT.wrapT = THREE.RepeatWrapping; llT.repeat.set(260, 260); llT.colorSpace = THREE.SRGBColorSpace; llT.anisotropy = 8; terr.material.map = llT; terr.material.needsUpdate = true;
    const fnN = 900, ferns = new THREE.InstancedMesh(cards.geometry, cards.material, fnN); ferns.frustumCulled = false;
    for (let i = 0; i < fnN; i++) { const z = R.range(40, -210), x = TX(z) + R.range(-40, 40); if (Math.abs(x - TX(z)) < 2.2) { i--; continue; } const sc = R.range(0.35, 0.9); for (let k = 0; k < 1; k++) { _p.set(x, hLand(x, z) + 0.1, z); _q.setFromEuler(_e.set(0, R.range(0, 6.28), -R.range(0.4, 0.8))); _s.set(sc, sc, sc); ferns.setMatrixAt(i, _m.compose(_p, _q, _s)); ferns.setColorAt(i, _c.set('#ffffff').multiplyScalar(R.range(0.8, 1.2))); } } scene.add(ferns);
    const stN = 90, stones = new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1, 1)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), stN); stones.frustumCulled = false;
    for (let i = 0; i < stN; i++) { const z = R.range(40, -210), x = TX(z) + (R() < 0.5 ? -1 : 1) * R.range(3, 40), sc = R.range(0.4, 1.8); _p.set(x, hLand(x, z) + sc * 0.2, z); _q.setFromEuler(_e.set(R(), R(), R())); _s.set(sc * 1.3, sc * 0.7, sc); stones.setMatrixAt(i, _m.compose(_p, _q, _s)); stones.setColorAt(i, _c.set(['#6a7a5a', '#58684a', '#7a7a6a'][R.int(0, 2)]).multiplyScalar(R.range(0.8, 1.1))); } scene.add(stones);
    const msN = 70, mCap = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 8, 5, 0, 6.2832, 0, 1.55).scale(1, 0.55, 1)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), msN), mStem = new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.07, 0.09, 1, 6).translate(0, 0.5, 0)), own(new THREE.MeshBasicMaterial({ color: '#e8dcc8' })), msN); mCap.frustumCulled = mStem.frustumCulled = false;
    for (let i = 0; i < msN; i++) { const z = R.range(30, -190), x = TX(z) + (R() < 0.5 ? -1 : 1) * R.range(2.5, 22), h = R.range(0.1, 0.3), sc = R.range(0.07, 0.2); _p.set(x, hLand(x, z), z); _q.identity(); _s.set(sc, h, sc); mStem.setMatrixAt(i, _m.compose(_p, _q, _s)); _p.set(x, hLand(x, z) + h, z); _s.set(sc * 2.2, sc * 1.4, sc * 2.2); mCap.setMatrixAt(i, _m.compose(_p, _q, _s)); mCap.setColorAt(i, _c.set(['#c8342a', '#d8a040', '#e8e0d0'][R.int(0, 2)])); } scene.add(mCap, mStem);
    const flN = 420, fp2 = new Float32Array(flN * 3), fc2 = new Float32Array(flN * 3); for (let i = 0; i < flN; i++) { const z = R.range(34, -200), x = TX(z) + (R() < 0.5 ? -1 : 1) * R.range(3.5, 30); fp2[i * 3] = x; fp2[i * 3 + 1] = hLand(x, z) + 0.25; fp2[i * 3 + 2] = z; _c.set(['#fff6e0', '#ffe070', '#e8c8ff', '#ffffff'][R.int(0, 3)]); fc2[i * 3] = _c.r; fc2[i * 3 + 1] = _c.g; fc2[i * 3 + 2] = _c.b; }
    const fgm = own(new THREE.BufferGeometry()); fgm.setAttribute('position', new THREE.BufferAttribute(fp2, 3)); fgm.setAttribute('color', new THREE.BufferAttribute(fc2, 3)); const flC = mkCanvas(32); { const g = flC.getContext('2d'); g.clearRect(0, 0, 32, 32); g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(16 + 8 * Math.cos(k * 1.2566), 16 + 8 * Math.sin(k * 1.2566), 6.5, 4, k * 1.2566, 0, 6.28); g.fill(); } g.fillStyle = '#e0a020'; g.beginPath(); g.arc(16, 16, 3.5, 0, 6.28); g.fill(); } const flT = own(new THREE.CanvasTexture(flC)); flT.colorSpace = THREE.SRGBColorSpace;
    const flw = new THREE.Points(fgm, own(new THREE.PointsMaterial({ map: flT, size: 0.3, sizeAttenuation: true, vertexColors: true, alphaTest: 0.5 }))); flw.frustumCulled = false; scene.add(flw);
    // a few high canopy tufts and soft ground mist
    const cN = 0, cano = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 8, 6)), own(new THREE.MeshBasicMaterial({ color: '#2a5030' })), cN); cano.frustumCulled = false;
    for (let i = 0; i < cN; i++) { const z = R.range(60, -240), x = TX(z) + R.range(-70, 70); if (Math.abs(x - TX(z)) < 9) { i--; continue; } const sc = R.range(8, 14); _p.set(x, hLand(x, z) + R.range(36, 46), z); _q.identity(); _s.set(sc, sc * 0.3, sc); cano.setMatrixAt(i, _m.compose(_p, _q, _s)); } scene.add(cano);
    // shafts of morning sun slanting down through the canopy, with a bright pool of light where each lands
    const shC = mkCanvas(64); { shC.height = 256; const g = shC.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,236,170,0.95)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 64, 256); }
    const shT = own(new THREE.CanvasTexture(shC)); shT.colorSpace = THREE.SRGBColorSpace; const shafts = [], poolG = mkCanvas(64); { const g = poolG.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,230,150,0.9)'); rg.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); } const poolT = own(new THREE.CanvasTexture(poolG)); poolT.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 26; i++) { const z = R.range(34, -200), x = TX(z) + R.range(-24, 24), m = new THREE.Mesh(own(new THREE.PlaneGeometry(R.range(4, 10), 52)), own(new THREE.MeshBasicMaterial({ map: shT, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }))); m.position.set(x, 22, z); m.rotation.set(0, R.range(0, 3.14), 0.3); scene.add(m); const pl = new THREE.Mesh(own(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: poolT, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); pl.position.set(x + 9, hLand(x + 9, z) + 0.06, z); scene.add(pl); shafts.push({ m, pl, ph: R.range(0, 6.28) }); }
    // the butterflies: a monarch wing painted on a canvas (orange, black veins and border, white spots), two wings per butterfly, flapping
    const wc = mkCanvas(256); wc.height = 256; wc.getContext('2d').scale(2, 2); { const g = wc.getContext('2d'); g.clearRect(0, 0, 128, 128);
      const wing = (path, fill) => { g.beginPath(); path(); g.closePath(); g.fillStyle = fill; g.fill(); };
      wing(() => { g.moveTo(2, 64); g.bezierCurveTo(10, 8, 90, 0, 124, 40); g.bezierCurveTo(118, 70, 70, 78, 2, 64); }, '#141008');      // forewing outline in black
      wing(() => { g.moveTo(4, 62); g.bezierCurveTo(14, 16, 88, 8, 118, 40); g.bezierCurveTo(112, 66, 70, 72, 4, 62); }, '#f27c18');
      wing(() => { g.moveTo(2, 66); g.bezierCurveTo(30, 70, 90, 76, 100, 100); g.bezierCurveTo(80, 124, 20, 122, 2, 80); }, '#141008');   // hindwing
      wing(() => { g.moveTo(4, 68); g.bezierCurveTo(30, 74, 86, 80, 94, 100); g.bezierCurveTo(76, 118, 22, 116, 4, 78); }, '#f68a1e');
      g.strokeStyle = '#141008'; g.lineWidth = 2.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(6, 64); g.lineTo(30 + i * 15, 24 + i * 3 + (i > 3 ? 6 : 0)); g.stroke(); g.beginPath(); g.moveTo(6, 70); g.lineTo(26 + i * 12, 100 + i * 2); g.stroke(); }
      g.fillStyle = '#fff6e8'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(30 + i * 10, 14 + Math.abs(i - 4) * 4.5 + 6, 2.3, 0, 6.28); g.fill(); } for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(16 + i * 14, 108 - Math.abs(i - 2.5) * 3.5, 2.2, 0, 6.28); g.fill(); } }
    const wT = own(new THREE.CanvasTexture(wc)); wT.colorSpace = THREE.SRGBColorSpace; wT.anisotropy = 4;
    const wG = own(new THREE.PlaneGeometry(1, 0.78).translate(0.5, 0, 0).rotateX(-Math.PI / 2)), wM = own(new THREE.MeshBasicMaterial({ map: wT, alphaTest: 0.45, side: THREE.DoubleSide }));
    const NB = 7440, NG = 6400, wl = new THREE.InstancedMesh(wG, wM, NB), wr = new THREE.InstancedMesh(wG, wM, NB), bodies = new THREE.InstancedMesh(own(new THREE.CapsuleGeometry(0.035, 0.34, 2, 5).rotateX(Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#16100a' })), NB); wl.frustumCulled = wr.frustumCulled = bodies.frustumCulled = false; const bf = [];
    for (let i = 0; i < NB; i++) { const amb = i >= 4600 && i < NG, k = R.int(0, STREAMS.length - 1), gp = i >= NG ? PATCH[(i - NG) % PATCH.length] : null, ga = R.range(0, 6.28), gr = 2.6 * Math.sqrt(R()); bf.push({ gp, gx: gp ? gp.x + Math.cos(ga) * gr : 0, gz: gp ? gp.z + Math.sin(ga) * gr * 1.5 : 0, del: R.range(0, 0.55), gyaw: R.range(0, 6.28), k, amb, z0: R.range(0, LZ), v: amb ? R.range(0.5, 2.2) : R.range(4.5, 8.5), u: R.range(-1, 1) * (amb ? 30 : 3.2), w: R.range(-1, 1) * (amb ? 7 : 2.6), y: amb ? R.range(1, 16) : 0, ph: R.range(0, 6.28), fr: R.range(7, 11), sc: R.range(0.3, 0.5) }); _c.set(i % 11 === 0 ? '#ffe070' : i % 17 === 0 ? '#fff4e0' : '#ffffff').multiplyScalar(R.range(0.85, 1.08)); wl.setColorAt(i, _c); wr.setColorAt(i, _c); }
    scene.add(wl, wr, bodies);
    // golden dust drifting in the light
    const DN = 700, dp = new Float32Array(DN * 3), dcl = new Float32Array(DN * 3), dd = []; for (let i = 0; i < DN; i++) dd.push({ x: R.range(-14, 14), y: R.range(0.5, 14), z: R.range(-40, 10), ph: R.range(0, 6.28) });
    const dgm = own(new THREE.BufferGeometry()); dgm.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dgm.setAttribute('color', new THREE.BufferAttribute(dcl, 3));
    const glC = mkCanvas(32); { const g = glC.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 15); rg.addColorStop(0, 'rgba(255,240,190,1)'); rg.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); } const glT = own(new THREE.CanvasTexture(glC)); glT.colorSpace = THREE.SRGBColorSpace;
    const motes = new THREE.Points(dgm, own(new THREE.PointsMaterial({ map: glT, size: 0.22, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); motes.frustumCulled = false; scene.add(motes);
    await tick();
    const camAtU = (u) => camAt(Math.max(0, Math.min(1, u)) * DUR);
    return {
      scene, path, duration: DUR, title: 'The River of Wings', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 68, near: 0.2, nearThrough: 0.4, far: 1600, lookAhead: 12, sway: 0, bank: 0.12 },
      pois: [
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0] - 11, c[1] + 15, c[2] - 16]; }, from: 0.1, to: 0.22, fade: 0.3, weight: 0.85 },        // up a butterfly-furred trunk, left
        { at: (tm, uu) => { const c = camAtU(uu); return [sx(2, c[2] - 14), sy(2, c[2] - 14, 0) - 1, c[2] - 14]; }, from: 0.28, to: 0.4, fade: 0.3, weight: 0.8 }, // along a stream
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0] + 12, c[1] + 16, c[2] - 14]; }, from: 0.44, to: 0.54, fade: 0.3, weight: 0.85 },       // and a trunk on the right
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0] - 4, c[1] + 22, c[2] - 12]; }, from: 0.58, to: 0.68, fade: 0.3, weight: 0.7 },          // up the sun shafts into the canopy
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0], c[1] - 10, c[2] - 30]; }, from: 0.78, to: 0.92, fade: 0.3, weight: 0.5 },              // down over the orange-coated canopy
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#ffd890', veil: '#ffd890', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.18, radius: 0.5, threshold: 0.9 }, grade: { saturation: 1.12, contrast: 1.06, tint: '#fff0dc', shadowTint: '#1a1408', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        const above = smoothstep(14, 20, T); scene.fog.density = 0.0105 - 0.0055 * above;
        for (let i = 0; i < NB; i++) {
          const b = bf[i]; const z = 40 - (((40 - b.z0 + b.v * t) % LZ) + LZ) % LZ; let x, y;
          if (b.gp) {   // resting on the ground with wings slowly fanning, then lifting off in a spiral as the camera arrives
            const a = Math.max(0, Math.min(1, (16 - (cp.z - b.gp.z)) / 9 - b.del)), e = a * a * (3 - 2 * a), ang = b.ph + e * 5, gy = 3 * fbm(b.gx * 0.03, b.gz * 0.03, 3) + 0.4 * fbm(b.gx * 0.3, b.gz * 0.3, 2);
            const gx2 = b.gx + Math.cos(ang) * 3.2 * e, gz2 = b.gz + Math.sin(ang) * 3.2 * e - 5 * e, gy2 = gy + 0.07 + e * (3 + 9 * b.del * 1.8) + 0.3 * e * Math.sin(t * 1.3 + b.ph);
            const d2 = Math.hypot(gx2 - cp.x, gy2 - cp.y, gz2 - cp.z), sc2 = b.sc * smoothstep(1.1, 2.6, d2) + 1e-4, fl2 = e > 0.02 ? 0.32 + 0.62 * Math.sin(t * b.fr + b.ph) : 1.05 + 0.4 * Math.sin(t * 0.8 + b.ph), yw = b.gyaw + e * 4;
            _q.setFromAxisAngle(YA, yw); _p.set(gx2, gy2, gz2);
            _q2.setFromAxisAngle(ZA, fl2); _q2.premultiply(_q); _s.set(sc2, sc2, sc2); wr.setMatrixAt(i, _m.compose(_p, _q2, _s)); _s.set(sc2 * 2.2, sc2 * 2.2, sc2 * 2.2); bodies.setMatrixAt(i, _m.compose(_p, _q, _s));
            _q2.setFromAxisAngle(ZA, -fl2); _q2.premultiply(_q); _s.set(-sc2, sc2, sc2); wl.setMatrixAt(i, _m.compose(_p, _q2, _s)); continue;
          }
          if (b.amb) { x = TX(z) + b.u; y = b.y + 1.2 * Math.sin(t * 0.7 + b.ph) + (z < -90 ? 18 * smoothstep(-90, -170, z) * above : 0); } else { x = sx(b.k, z) + b.u + 0.8 * Math.sin(t * 0.9 + b.ph); y = sy(b.k, z, t) + b.w + 0.4 * Math.sin(t * 1.3 + b.ph); }
          const dx = x - cp.x, dy = y - cp.y, dz = z - cp.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz), vis = smoothstep(1.1, 2.6, d), fl = 0.32 + 0.62 * Math.sin(t * b.fr + b.ph), yaw = Math.PI + 0.25 * Math.sin(t * 0.4 + b.ph), sc = b.sc * vis + 1e-4;
          _q.setFromAxisAngle(YA, yaw);
          _q2.setFromAxisAngle(ZA, fl); _q2.premultiply(_q); _p.set(x, y, z); _s.set(sc, sc, sc); wr.setMatrixAt(i, _m.compose(_p, _q2, _s)); _q.setFromAxisAngle(YA, yaw); _s.set(sc * 2.2, sc * 2.2, sc * 2.2); bodies.setMatrixAt(i, _m.compose(_p, _q, _s)); _s.set(sc, sc, sc);
          _q2.setFromAxisAngle(ZA, -fl); _q2.premultiply(_q); _s.set(-sc, sc, sc); wl.setMatrixAt(i, _m.compose(_p, _q2, _s));
        }
        wl.instanceMatrix.needsUpdate = wr.instanceMatrix.needsUpdate = bodies.instanceMatrix.needsUpdate = true;
        for (const s of shafts) { const dd2 = Math.hypot(s.m.position.x - cp.x, s.m.position.z - cp.z), near = smoothstep(9, 26, dd2), k = (0.26 + 0.1 * Math.sin(t * 0.35 + s.ph)) * near; s.m.material.opacity = k; s.pl.material.opacity = 0.14 + 0.06 * Math.sin(t * 0.35 + s.ph); }
        for (let i = 0; i < DN; i++) { const d = dd[i], n = i * 3; dp[n] = cp.x + d.x + 0.6 * Math.sin(t * 0.3 + d.ph); dp[n + 1] = d.y + 0.5 * Math.sin(t * 0.4 + d.ph * 2); dp[n + 2] = cp.z + d.z; const f = 0.3 + 0.25 * Math.sin(t * 0.9 + d.ph * 3); dcl[n] = f; dcl[n + 1] = f * 0.9; dcl[n + 2] = f * 0.55; }
        dgm.attributes.position.needsUpdate = true; dgm.attributes.color.needsUpdate = true;
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
