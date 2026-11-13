// UNDER THE ICE: Lake Abraham in Alberta, in winter. Methane rising from the lake bed freezes into the ice as stacks of silver pancakes;
// here they hang from the underside of the ice like a forest of inverted bubble-trees, and we swim among them. Straight after the
// Fez portal, a koi still stained with the dyes of the vats swims ahead of us, trailing a ribbon of colour, and as it passes a slow
// wave of its colours runs through the bubble columns ahead of us, lighting them one after another. The flight ends at a small
// glowing ring in the dark water. Nothing is loaded. Progress T = seconds of flight drives the events; the clock drives the swimming.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';

const DUR = 19;
const PX = (s) => 3.4 * Math.sin(s * 5.2);
const PY = (s) => -3.2 + 0.7 * Math.sin(s * 3.1);
const PZ = (s) => 44 - 160 * s;
const PAL = ['#ff7a5a', '#ffc04a', '#6adf9a', '#4aa8ff', '#c07aff', '#ff8ac0'];

export default {
  id: 'ice-bubble-lake',
  name: 'Under the Ice',
  category: 'wilderness',
  weirdness: 0.6,
  media: ['water'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene();
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- the swim: a low, gentle S under the ice, between the columns ----------
    const pts = [];
    for (let k = 0; k <= 34; k++) { const s = k / 34; pts.push([PX(s), PY(s), PZ(s)]); }
    const path = makePath(pts);
    let PL = 0; { const a0 = new THREE.Vector3(), b0 = new THREE.Vector3(); path.pointAt(0, a0); for (let i = 1; i <= 400; i++) { path.pointAt(i / 400, b0); PL += a0.distanceTo(b0); a0.copy(b0); } }
    scene.fog = new THREE.FogExp2(new THREE.Color('#0b2e55'), 0.02);
    scene.background = new THREE.Color('#0b2e55');
    await tick();

    // ---------- textures drawn here ----------
    const mkCanvas = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const wrapBlob = (g, S, x, y, r, style) => {
      g.fillStyle = style;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); }
    };
    const iceC = mkCanvas(256); {   // the underside of the ice: milky, mottled, cracked, with tiny trapped air
      const g = iceC.getContext('2d'), S = 256; g.fillStyle = '#4d90ad'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 150; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(8, 40), R() < 0.5 ? `rgba(159,216,234,${R.range(0.04, 0.1)})` : `rgba(47,106,136,${R.range(0.05, 0.12)})`);
      g.lineCap = 'round';
      for (let i = 0; i < 34; i++) { let x = R.range(0, S), y = R.range(0, S); g.strokeStyle = `rgba(235,250,255,${R.range(0.22, 0.55)})`; g.lineWidth = R.range(0.8, 2.2); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += R.range(-30, 30); y += R.range(-30, 30); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,255,255,${R.range(0.08, 0.3)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.5, 1.5); }
    }
    const iceT = own(new THREE.CanvasTexture(iceC)); iceT.wrapS = iceT.wrapT = THREE.RepeatWrapping; iceT.repeat.set(40, 40); iceT.colorSpace = THREE.SRGBColorSpace; iceT.anisotropy = 4;
    const glowC = mkCanvas(128); { const g = glowC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(210,245,255,0.95)'); rg.addColorStop(0.4, 'rgba(160,225,255,0.35)'); rg.addColorStop(1, 'rgba(140,210,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const glowT = own(new THREE.CanvasTexture(glowC)); glowT.colorSpace = THREE.SRGBColorSpace;

    // ---------- the ice overhead, with soft glowing patches where the light comes through ----------
    {
      const cg = own(new THREE.PlaneGeometry(700, 700)); cg.rotateX(Math.PI / 2);
      scene.add(new THREE.Mesh(cg, own(new THREE.MeshBasicMaterial({ map: iceT, color: '#c8d8e0' }))));
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(own(new THREE.CircleGeometry(R.range(5, 10), 28).rotateX(Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: true })));
        m.position.set(R.range(-50, 50), -0.05, R.range(40, -130)); scene.add(m);
      }
    }
    await tick();

    {   // the lake bed far below: dark teal silt and boulders, mostly lost in the water, so the lower half is never a flat void
      const fc = mkCanvas(256), g = fc.getContext('2d'), S = 256; g.fillStyle = '#12506a'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 200; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(6, 34), R() < 0.5 ? `rgba(8,40,60,${R.range(0.08, 0.2)})` : `rgba(70,140,160,${R.range(0.05, 0.12)})`);
      const ft = own(new THREE.CanvasTexture(fc)); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(30, 30); ft.colorSpace = THREE.SRGBColorSpace;
      const fg = own(new THREE.PlaneGeometry(700, 700)); fg.rotateX(-Math.PI / 2); const fm = new THREE.Mesh(fg, own(new THREE.MeshBasicMaterial({ map: ft, color: '#9cc0d0' }))); fm.position.set(0, -17, -40); scene.add(fm);
      const bg = own(new THREE.IcosahedronGeometry(1, 1)), bm = new THREE.InstancedMesh(bg, own(new THREE.MeshBasicMaterial({ color: '#1a5a74' })), 90), mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), pp = new THREE.Vector3(), ss = new THREE.Vector3();
      for (let i = 0; i < 90; i++) { const sc = R.range(1.5, 5); pp.set(R.range(-40, 40), -17 + sc * 0.3, R.range(60, -140)); qq.setFromEuler(new THREE.Euler(R.range(0, 3), R.range(0, 3), R.range(0, 3))); ss.set(sc * 1.3, sc * 0.7, sc); bm.setMatrixAt(i, mm.compose(pp, qq, ss)); }
      bm.frustumCulled = false; scene.add(bm);
    }
    // ---------- the bubble columns: stacks of silver pancakes hanging from the ice ----------
    const discs = [];
    for (let i = 0; i < 330; i++) {
      let x, z; do { x = R.range(-34, 34); z = R.range(62, -140); } while (Math.abs(x - PX((44 - z) / 160)) < 2.4);
      const n = R.int(9, 26), sp = R.range(0.34, 0.58), r0 = R.range(0.6, 1.3), aU = path.nearestXZ(x, z).u, hue0 = R.int(0, 5);
      for (let j = 0; j < n; j++) discs.push({ x: x + R.range(-0.06, 0.06), y: -0.3 - j * sp, z: z + R.range(-0.06, 0.06), r: r0 * (1 - 0.5 * j / n) * R.range(0.85, 1.12), aU, hue: (hue0 + j) % 6, k: R.range(0.85, 1.05) });
    }
    const DN = discs.length;
    const bubbles = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 12, 6)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), DN);
    const baseC = new Float32Array(DN * 3), palC = PAL.map((h) => new THREE.Color(h)), aU = new Float32Array(DN);
    { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
      discs.forEach((d, i) => {
        p.set(d.x, d.y, d.z); s.set(d.r, d.r * 0.15, d.r); bubbles.setMatrixAt(i, m.compose(p, q, s));
        c.set('#9cc4d8').multiplyScalar(d.k); baseC[i * 3] = c.r; baseC[i * 3 + 1] = c.g; baseC[i * 3 + 2] = c.b; bubbles.setColorAt(i, c); aU[i] = d.aU;
      }); }
    bubbles.frustumCulled = false; scene.add(bubbles);
    await tick();

    // ---------- the koi: eleven soft segments that follow one another, fins, a forked tail, and a ribbon of dye behind ----------
    const KN = 12, KS = 1.05;
    const KW = [0.30, 0.38, 0.40, 0.38, 0.34, 0.29, 0.24, 0.20, 0.16, 0.13, 0.10, 0.08], KC = ['#ff7a3a', '#ff7a3a', '#f7efe4', '#f7efe4', '#ff7a3a', '#ff6a30', '#ff7a3a', '#f7efe4', '#ff7a3a', '#ff8a50', '#ff9a60', '#ffaa70'];
    const segG = own(new THREE.SphereGeometry(1, 12, 9)), segs = [];
    for (let k = 0; k < KN; k++) {
      const g = new THREE.Group(); g.rotation.order = 'YXZ';
      const m = new THREE.Mesh(segG, own(new THREE.MeshBasicMaterial({ color: KC[k] }))); m.scale.set(KW[k] * KS, KW[k] * 0.85 * KS, 0.5 * KS); g.add(m); scene.add(g); segs.push(g);
    }
    const finM = own(new THREE.MeshBasicMaterial({ color: '#ff9a5a', transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false }));
    const triG = (pts) => { const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g; };
    const pecG = triG([0, 0, 0, 0.15, -0.55, 0, 0.45, -0.25, 0]), tailG = triG([0, 0, 0, -0.5, -1.0, 0, 0, -0.55, 0, 0, 0, 0, 0.5, -1.0, 0, 0, -0.55, 0]);
    const mkFin = (geo, sc, x, y, z, rz, mirror, parent) => { const m = new THREE.Mesh(geo, finM); m.scale.set(mirror ? -sc : sc, sc, sc); m.position.set(x, y, z); m.rotation.set(Math.PI / 2, 0, rz); parent.add(m); return m; };
    const pecL = mkFin(pecG, KS, -0.34 * KS, -0.1 * KS, 0.12, 0.7, true, segs[2]), pecR = mkFin(pecG, KS, 0.34 * KS, -0.1 * KS, 0.12, -0.7, false, segs[2]);
    const tailA = mkFin(tailG, KS * 1.3, 0, 0, -0.18 * KS, 0.0, false, segs[KN - 1]), tailB = mkFin(tailG, KS * 1.3, 0, 0, -0.18 * KS, 0.0, false, segs[KN - 1]);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(own(new THREE.SphereGeometry(0.07 * KS, 8, 6)), own(new THREE.MeshBasicMaterial({ color: '#0a0a10' }))); e.position.set(sx * 0.3 * KS, 0.08 * KS, 0.18 * KS); segs[0].add(e); }
    const _kp = new THREE.Vector3();
    const koiPos = (T, tc, out) => {   // swims ahead of the camera, weaving; the body lags behind the head (T and tc shifted per segment)
      path.pointAt(Math.min(0.99, Math.max(0, T / DUR) + (9 + 0.9 * Math.sin(tc * 0.7)) / PL), _kp);
      return out.set(_kp.x + 1.6 * Math.sin(tc * 0.9) + 0.5 * Math.sin(tc * 2.3), -3.0 + 1.1 * Math.sin(tc * 0.6) + 0.35 * Math.sin(tc * 1.7), _kp.z);
    };
    const kpos = Array.from({ length: KN + 1 }, () => new THREE.Vector3());
    const TN = 150, tpos = new Float32Array(TN * 3), tcol = new Float32Array(TN * 3), trail = [];
    const tg = own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    const ribbon = new THREE.Points(tg, own(new THREE.PointsMaterial({ map: glowT, size: 1.3, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }))); ribbon.frustumCulled = false; scene.add(ribbon);
    let lastTrail = -1; const _tc = new THREE.Color();

    // ---------- marine snow: slow specks and tiny rising bubbles around us ----------
    const SN = 320, sb = [], sp = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) sb.push([R.range(0, 30), R.range(0, 16), R.range(0, 40), R.range(0, 6.28)]);
    const sg = own(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, own(new THREE.PointsMaterial({ map: glowT, size: 0.28, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#cfeaff' }))); snow.frustumCulled = false; scene.add(snow);
    await tick();

    return {
      scene, path, duration: DUR, title: 'Under the Ice', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 0.3, nearThrough: 0.5, far: 800, lookAhead: 14, sway: 0, bank: 0.03 },
      pois: [],
      portal: { shape: 'circle', style: 'ring', radius: 4, color: '#9be6ff', veil: '#9be6ff', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 0.95, bloom: { strength: 0.15, radius: 0.45, threshold: 0.9 }, grade: { saturation: 1.06, contrast: 1.04, tint: '#eaf6ff', shadowTint: '#04122a', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position;
        // the koi
        for (let k = 0; k <= KN; k++) koiPos(T - k * 0.026, t - k * 0.085, kpos[k]);
        koiPos(T + 0.05, t + 0.05, _kp);
        for (let k = 0; k < KN; k++) {
          const g = segs[k], a = k === 0 ? _kp : kpos[k - 1], b = kpos[k], dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
          g.position.copy(b); g.rotation.y = Math.atan2(dx, dz); g.rotation.x = -Math.atan2(dy, Math.hypot(dx, dz));
        }
        tailA.rotation.z = 0.5 + 0.35 * Math.sin(t * 7); tailB.rotation.z = -0.5 - 0.35 * Math.sin(t * 7); pecL.rotation.z = 0.7 + 0.25 * Math.sin(t * 5); pecR.rotation.z = -0.7 - 0.25 * Math.sin(t * 5);
        // the ribbon of dye the koi leaves
        if (t - lastTrail > 0.05) { trail.push({ x: kpos[2].x, y: kpos[2].y, z: kpos[2].z, t }); if (trail.length > TN) trail.shift(); lastTrail = t; }
        for (let i = 0; i < TN; i++) {
          const q = trail[i]; if (!q) { tcol[i * 3] = tcol[i * 3 + 1] = tcol[i * 3 + 2] = 0; continue; }
          const age = t - q.t, f = Math.pow(Math.max(0, 1 - age / 4.5), 1.3); _tc.setHSL(((q.t * 0.16) % 1 + 1) % 1, 0.9, 0.58);
          tpos[i * 3] = q.x + 0.18 * Math.sin(age * 1.4 + i); tpos[i * 3 + 1] = q.y + 0.1 * age; tpos[i * 3 + 2] = q.z + 0.18 * Math.cos(age * 1.1 + i * 1.3);
          tcol[i * 3] = _tc.r * f * 0.85; tcol[i * 3 + 1] = _tc.g * f * 0.85; tcol[i * 3 + 2] = _tc.b * f * 0.85;
        }
        tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true;
        // THE EVENT: a wave of the koi's colours runs ahead of us through the columns, lighting them one after another
        const front = T / DUR + 0.03 + 0.06 * Math.max(0, T - 3.2), k2 = smoothstep(3.0, 4.0, T), ic = bubbles.instanceColor.array;
        for (let i = 0; i < DN; i++) {
          const d = front - aU[i], lit = (d <= 0 ? 0 : Math.min(1, d / 0.05)) * k2, crest = Math.exp(-Math.pow(d / 0.025, 2)) * 0.3 * k2, pc = palC[discs[i].hue];
          ic[i * 3] = Math.min(1, (baseC[i * 3] + (pc.r - baseC[i * 3]) * lit * 0.8) * (1 + crest)); ic[i * 3 + 1] = Math.min(1, (baseC[i * 3 + 1] + (pc.g - baseC[i * 3 + 1]) * lit * 0.8) * (1 + crest)); ic[i * 3 + 2] = Math.min(1, (baseC[i * 3 + 2] + (pc.b - baseC[i * 3 + 2]) * lit * 0.8) * (1 + crest));
        }
        bubbles.instanceColor.needsUpdate = true;
        // marine snow, wrapped round the camera
        for (let i = 0; i < SN; i++) { const b = sb[i];
          sp[i * 3] = cp.x + ((((b[0] + 1.4 * Math.sin(t * 0.2 + b[3]) - cp.x) % 30) + 45) % 30) - 15;
          sp[i * 3 + 1] = -((((b[1] - 0.15 * t * (1 + b[3] * 0.1)) % 16) + 16) % 16) - 0.4;
          sp[i * 3 + 2] = cp.z + ((((b[2] + 1.2 * Math.cos(t * 0.17 + b[3]) - cp.z) % 40) + 60) % 40) - 28; }
        sg.attributes.position.needsUpdate = true;
      },
      dispose() { for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
