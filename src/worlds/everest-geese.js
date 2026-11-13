// GEESE OVER EVEREST (rebuilt): bar-headed geese really do cross the Himalaya. You fly with a flock down a winding valley at dawn with the
// giants all round you: Nuptse on one side, then Everest itself towering ahead with a plume of snow streaming off its summit, Lhotse beside
// it, a sea of cloud in the valleys, prayer flags on a pass. The camera swerves through the valley and looks up at the peaks. The geese's
// frozen breath hangs in glittering ribbons. The sun comes up over the shoulder of the world and turns everything from violet to gold.
// Camera: the flight is laid out by distance (constant engine speed): z = 40 - 37 T. Gaze steered by pois.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, ridged, pathFrom, makeTerrain, makeBird, skyFor } from '../kit/mine.js';

const DUR = 20, V = 37;
const CX = (z) => 70 * Math.sin(z * 0.0048) + 28 * Math.sin(z * 0.012 + 1);
const PEAKS = [{ n: 'Everest', x: 400, z: -600, h: 1560, r: 330 }, { n: 'Lhotse', x: 190, z: -740, h: 1290, r: 250 }, { n: 'Nuptse', x: -340, z: -430, h: 1120, r: 260 }, { n: 'Pumori', x: -430, z: -820, h: 1000, r: 230 }];
const hLand = (x, z) => {
  const v = smoothstep(70, 460, Math.abs(x - CX(z)));
  let h = 110 + 30 * fbm(x * 0.01, z * 0.01, 3) + v * (240 + 900 * Math.pow(ridged(x * 0.0014 + 9, z * 0.0014, 7), 1.35));
  for (const m of PEAKS) { const d = Math.hypot(x - m.x, z - m.z) / m.r; if (d < 1) h += m.h * Math.pow(1 - d, 1.55) * (0.82 + 0.38 * ridged(x * 0.006, z * 0.006, 5)); }
  return h;
};
const camAt = (T) => {
  const z = 40 - V * T, x = CX(z) + 38 * Math.sin(T * 0.62) + 14 * Math.sin(T * 1.4);
  const base = 250 + 120 * smoothstep(7, 11, T) * (1 - smoothstep(13, 17, T)) + 40 * smoothstep(14, 20, T);
  return [x, Math.max(base, hLand(x, z) + 55), z];
};
const ES = [PEAKS[0].x, PEAKS[0].h + 120, PEAKS[0].z];

export default {
  id: 'everest-geese',
  name: 'Geese Over Everest',
  category: 'wilderness',
  weirdness: 0.5,
  media: ['air', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path, PL } = pathFrom((s) => camAt(s * DUR), 70); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'dawn', stars: 0.2, sky: { zenith: '#3a4aa0', mid: '#8a7ac4', horizon: '#f6b4a0', ground: '#9a8aa8', horizonPow: 2.3, clouds: { coverage: 0.25, lit: '#ffc8b0', shade: '#6a5a98', silver: 0 } } });
    const FOGV = new THREE.Color('#a090c4'), FOGG = new THREE.Color('#f2c8a4'), fogNow = new THREE.Color();
    scene.fog = new THREE.FogExp2(FOGV.clone(), 0.00085); scene.background = new THREE.Color('#8a7ac4');
    await tick();
    const sn = new THREE.Color('#fbf7ff'), rk = new THREE.Color('#3e3a52'), rk2 = new THREE.Color('#6a5a64'), pk = new THREE.Color('#ffc6a0'), gl = new THREE.Color('#a8c8f0'), bl = new THREE.Color('#5a68b8'), tmp = new THREE.Color();
    const terr = makeTerrain({
      size: 2100, seg: 420, cx: 0, cz: -480, heightFn: hLand, own, sun: [-0.5, 0.22, 0.8],
      colorFn: (h, lit, slope, x, z, out) => {
        const rockiness = smoothstep(0.62, 0.93, slope + 0.14 * (fbm(x * 0.03, z * 0.03, 3) - 0.5)) * (1 - 0.65 * smoothstep(450, 950, h)); out.copy(sn);
        tmp.copy(rk).lerp(rk2, fbm(x * 0.02, h * 0.01, 2)); out.lerp(tmp, rockiness); out.lerp(gl, 0.4 * smoothstep(0.06, 0.2, 0.4 - slope) * (1 - smoothstep(180, 420, h)) * fbm(x * 0.01, z * 0.01, 2));
        out.lerp(tmp.set('#7a7a60'), (1 - smoothstep(150, 260, h)) * 0.6);   // the dry valley floor
        out.lerp(bl, (1 - lit) * 0.5); out.lerp(pk, Math.pow(lit, 1.6) * 0.28); out.multiplyScalar(0.7 + 0.55 * lit); out.multiplyScalar(0.82 + 0.3 * fbm(x * 0.12, z * 0.12, 3));
      },
    });
    { const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#e4e4ee'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const x = R.range(0, 256), y = R.range(0, 256), r = R.range(1, 7), v = R.range(90, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.5)})`; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(260, 260); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true; }
    scene.add(terr); await tick();
    // soft sunrise glow behind the ridge ahead-left
    const gC = mkCanvas(128); { const g = gC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,238,200,0.95)'); rg.addColorStop(0.3, 'rgba(255,200,140,0.4)'); rg.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const gT = own(new THREE.CanvasTexture(gC)); gT.colorSpace = THREE.SRGBColorSpace;
    const sunG = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: gT, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.0 }))); sunG.scale.set(1100, 1100, 1); sunG.position.set(-420, 330, -1500); sunG.renderOrder = 5; scene.add(sunG);
    // a sea of cloud lying in the valleys, and wisps round the shoulders of the peaks
    const mM = own(new THREE.SpriteMaterial({ map: gT, color: '#ffd8d0', transparent: true, depthWrite: false, opacity: 0.55, fog: true })), mists = [];
    for (let i = 0; i < 150; i++) { const sp = new THREE.Sprite(mM), sc = R.range(120, 330), z = R.range(120, -1100), x = CX(z) + R.range(-380, 380); if (Math.abs(x - CX(z)) < 70) { i--; continue; } sp.scale.set(sc * 1.7, sc * 0.45, 1); sp.position.set(x, R.range(140, 215), z); scene.add(sp); mists.push({ sp, ph: R.range(0, 6.28), y0: sp.position.y }); }
    // the plume of snow streaming off Everest's summit
    const SN = 420, snp = new Float32Array(SN * 3), snc = new Float32Array(SN * 3), snd = []; for (let i = 0; i < SN; i++) snd.push({ s: R.range(0, 1), off: R.range(-14, 14), up: R.range(-8, 12), sp: R.range(0.03, 0.07) });
    const sg = own(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(snp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(snc, 3));
    const dC = mkCanvas(64); { const g = dC.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,240,235,0.45)'); rg.addColorStop(1, 'rgba(255,230,220,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const dT = own(new THREE.CanvasTexture(dC)); dT.colorSpace = THREE.SRGBColorSpace;
    const plume = new THREE.Points(sg, own(new THREE.PointsMaterial({ map: dT, size: 38, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); plume.frustumCulled = false; scene.add(plume);
    // prayer flags on a rope strung across the pass, beside the flight line
    { const cols = ['#2a6ad8', '#f4f4f4', '#d83a3a', '#2ab85a', '#f0d03a'], n = 70, pg = [], a0 = new THREE.Vector3(), z0 = -250; const rz = z0, rx0 = CX(rz) - 120, rx1 = CX(rz) + 20, ry0 = hLand(rx0, rz) + 40, ry1 = hLand(rx1, rz) + 40;
      for (let i = 0; i < n; i++) { const a = i / (n - 1), x = lerp(rx0, rx1, a), y = lerp(ry0, ry1, a) - 9 * Math.sin(a * Math.PI) + 14, m = new THREE.Mesh(own(new THREE.PlaneGeometry(5, 3.6)), own(new THREE.MeshBasicMaterial({ color: cols[i % 5], side: THREE.DoubleSide }))); m.position.set(x, y - 2, rz); m.rotation.y = 0.4; m.userData.ph = R.range(0, 6.28); scene.add(m); pg.push(m); }
      scene._flags = pg; }
    // the flock and its breath
    const GN = 7, geese = [], OFF = [[0, 0, 0], [-3.6, 2.8, 0.4], [3.6, 2.8, -0.3], [-7.2, 5.6, 0.9], [7.2, 5.6, 0.2], [-10.8, 8.4, 1.3], [10.8, 8.4, 0.6]];
    for (let i = 0; i < GN; i++) { const b = makeBird({ body: '#8c8478', belly: '#d8d0c4', head: '#f4f0e8', wing: '#a49c90', feather: '#4a463e', beakC: '#e8a030', scale: 1.9, own, span: 0.9, beard: false }); scene.add(b.g); geese.push({ b, ph: R.range(0, 6.28), pos: new THREE.Vector3(), prev: new THREE.Vector3(), vel: new THREE.Vector3(0, 0, -1), had: false }); }
    const HN = 70, PER = 60, hist = geese.map(() => new Float32Array(HN * 3)), rp = new Float32Array(GN * PER * 3), rc = new Float32Array(GN * PER * 3);
    const rg2 = own(new THREE.BufferGeometry()); rg2.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg2.setAttribute('color', new THREE.BufferAttribute(rc, 3));
    const cC = mkCanvas(64); { const g = cC.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 30); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.2, 'rgba(210,240,255,0.7)'); rg.addColorStop(1, 'rgba(180,220,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const cT = own(new THREE.CanvasTexture(cC)); cT.colorSpace = THREE.SRGBColorSpace;
    const crystals = new THREE.Points(rg2, own(new THREE.PointsMaterial({ map: cT, size: 0.3, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); crystals.frustumCulled = false; scene.add(crystals);
    let acc = 0, lastT = 0; await tick();
    const _a = new THREE.Vector3(), _t = new THREE.Vector3(), _r = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), _w = new THREE.Vector3();
    const U = (u) => Math.max(0, Math.min(1, u));
    const toward = (m, u, el) => { const c = camAt(U(u) * DUR), dx = m.x - c[0], dz = m.z - c[2], d = Math.hypot(dx, dz); return [c[0] + dx, c[1] + Math.min(d * el, (m.h + 100) - c[1] + 0), c[2] + dz]; };
    return {
      scene, path, duration: DUR, title: 'Geese Over Everest', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 66, near: 0.3, nearThrough: 0.6, far: 5000, lookAhead: 20, sway: 0, bank: 0.12 },
      pois: [
        { at: (tm, u) => toward(PEAKS[2], u, 0.5), from: 0.06, to: 0.24, fade: 0.35, weight: 0.85 },     // Nuptse, off to the left
        { at: (tm, u) => toward(PEAKS[0], u, 0.62), from: 0.3, to: 0.58, fade: 0.3, weight: 0.95 },     // Everest and its plume
        { at: (tm, u) => toward(PEAKS[1], u, 0.5), from: 0.6, to: 0.76, fade: 0.3, weight: 0.85 },      // Lhotse
        { at: (tm, u) => { const c = camAt(U(u) * DUR); return [c[0] - 160, c[1] - 90, c[2] - 150]; }, from: 0.78, to: 0.92, fade: 0.3, weight: 0.7 },   // the cloud sea
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#ffe0b8', veil: '#ffe0b8', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.15, radius: 0.45, threshold: 0.92 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#fff0f0', shadowTint: '#201a50', vignette: 0.2, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR); sky.update(dt, t, camera);
        const e = smoothstep(7, 14, T); fogNow.copy(FOGV).lerp(FOGG, e); scene.fog.color.copy(fogNow); scene.background.copy(fogNow); sunG.material.opacity = 0.5 * smoothstep(5, 12, T);
        // the geese fly the path ahead of you, whatever way you are looking
        const pu = Math.max(0, Math.min(0.995, (u || 0) + 15 / PL)); path.pointAt(pu, _a); path.tangentAt(pu, _t); _t.y *= 0.5; _t.normalize(); _r.crossVectors(_t, UPV).normalize();
        for (let i = 0; i < GN; i++) {
          const g = geese[i], o = OFF[i]; g.pos.copy(_a).addScaledVector(_r, o[0] + 0.7 * Math.sin(t * 0.7 + g.ph)).addScaledVector(_t, -o[1]); g.pos.y += 5.5 + o[2] + 0.6 * Math.sin(t * 1.3 + g.ph);
          if (g.had && dt > 1e-4) { _w.copy(g.pos).sub(g.prev).divideScalar(dt); if (_w.length() < 300) g.vel.lerp(_w, 1 - Math.exp(-dt * 6)); } g.prev.copy(g.pos); g.had = true;
          const b = g.b; b.g.position.copy(g.pos); b.g.rotation.y = Math.atan2(g.vel.x, g.vel.z); b.g.rotation.x = Math.atan2(-g.vel.y, Math.hypot(g.vel.x, g.vel.z) + 1e-4) * 0.8; b.g.rotation.z = 0.2 * Math.sin(t * 0.6 + g.ph) + 0.4 * (g.vel.x * 0) ;
          b.pose({ flap: t * 6.2 + g.ph, glide: 0, dive: 0, t });
        }
        if (T < lastT - 0.5) acc = 0; lastT = T;
        acc += dt; while (acc > 1 / 30) { acc -= 1 / 30; for (let i = 0; i < GN; i++) { const h = hist[i]; h.copyWithin(3, 0, (HN - 1) * 3); h[0] = geese[i].pos.x; h[1] = geese[i].pos.y - 1.0; h[2] = geese[i].pos.z; } }
        for (let i = 0; i < GN; i++) { const h = hist[i]; for (let k = 0; k < PER; k++) { const a = k / PER, idx = Math.min(HN - 1, k) * 3, ang = a * 14 + i + t * 1.4, rad = 0.3 + 1.8 * a, n = (i * PER + k) * 3; rp[n] = h[idx] + Math.cos(ang) * rad; rp[n + 1] = h[idx + 1] + Math.sin(ang) * rad * 0.6; rp[n + 2] = h[idx + 2]; const f = (1 - a) * (0.55 + 0.35 * Math.sin(t * 2.2 + k * 1.7 + i * 3)); rc[n] = (0.8 + 0.2 * e) * f; rc[n + 1] = (0.92 - 0.12 * e) * f; rc[n + 2] = (1.0 - 0.35 * e) * f; } }
        rg2.attributes.position.needsUpdate = true; rg2.attributes.color.needsUpdate = true;
        for (let i = 0; i < SN; i++) { const d = snd[i], ph = (t * d.sp + d.s) % 1, n = i * 3; snp[n] = ES[0] - 40 + ph * 520 + d.off; snp[n + 1] = ES[1] - 100 + d.up - ph * 60 + 18 * Math.sin(ph * 9 + i); snp[n + 2] = ES[2] + d.off * 1.8; const f = Math.sin(ph * Math.PI) * 0.3; snc[n] = f; snc[n + 1] = f * 0.95; snc[n + 2] = f * 0.95; }
        sg.attributes.position.needsUpdate = true; sg.attributes.color.needsUpdate = true;
        for (const m of mists) m.sp.position.y = m.y0 + 4 * Math.sin(t * 0.2 + m.ph);
        for (const f of scene._flags) f.rotation.y = 0.4 + 0.5 * Math.sin(t * 3 + f.userData.ph);
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
