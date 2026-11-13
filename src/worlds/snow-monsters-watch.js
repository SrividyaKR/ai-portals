// THE MONSTERS WATCH YOU PASS: in the Zao range of Japan, fir trees frozen in thick rime become huge hunched "snow monsters". You slide
// down a groove between them at dusk. The twist: every one of them has a face and slowly turns it to follow you as you go by, and they
// shuffle down the hill with you. Near the end two giants lean together into a gate, and the groove runs through it to a small glowing ring.
// The engine flies the path at constant speed, so the groove is laid out by distance: z = 40 - 34 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, pathFrom, makeTerrain, skyFor } from '../kit/mine.js';

const DUR = 20, V = 34, ZEND = 40 - V * DUR;
const GX = (z) => 58 * Math.sin(z * 0.0115) + 24 * Math.sin(z * 0.031 + 1);               // the line you ski: long S-curves
const GY = (z) => (z > -700 ? 380 + 0.5 * z : 30 - 0.04 * (z + 700));                       // a steep mountain, easing out into the valley
const hLand = (x, z) => { const dx = x - GX(z), flank = smoothstep(60, 420, Math.abs(dx)), far = smoothstep(-760, -1250, z); return GY(z) + flank * (60 + 320 * Math.pow(Math.abs(fbm(x * 0.004 + 3, z * 0.004, 4)), 1.2)) + far * 420 * Math.pow(Math.abs(fbm(x * 0.0025 + 8, z * 0.0025, 5)), 1.6) + 2 * fbm(x * 0.02, z * 0.02, 3) + 0.25 * Math.sin(z * 0.8 + x * 0.25) * (1 - smoothstep(0, 40, Math.abs(dx))) - 0.8 * Math.exp(-(dx * dx) / 12) + 0.18 * fbm(x * 0.5, z * 0.5, 2); };
const hSmooth = (x, z) => { let a = 0; for (let k = -6; k <= 6; k++) a += hLand(x, z + k * 3) * (1 - Math.abs(k) / 7); return a / 7.0; };   // the surface averaged over 36 m, so the camera glides instead of chattering over small bumps
const camAt = (T) => { const z = 40 - V * T, x = GX(z) + 1.2 * Math.sin(T * 0.8); return [x, hSmooth(x, z) + 1.5, z]; };

export default {
  id: 'snow-monsters-watch',
  name: 'The Monsters Watch You Pass',
  category: 'wilderness',
  weirdness: 0.8,
  media: ['snow', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 64); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'sunset', stars: 0.12, sky: { zenith: '#1a2458', mid: '#7a5a9c', horizon: '#ffb08c', ground: '#a888b0', horizonPow: 2.3, clouds: { coverage: 0.25, lit: '#ffc0b0', shade: '#5a4a88', silver: 0 } } });
    const FOGC = new THREE.Color('#9a78a8'); scene.fog = new THREE.FogExp2(FOGC, 0.0042); scene.background = new THREE.Color('#7a5a9c');
    await tick();
    const sn = new THREE.Color('#f6f4ff'), pk = new THREE.Color('#ffc4c0'), bl = new THREE.Color('#5a70c0'), tmp = new THREE.Color();
    const terr = makeTerrain({
      size: 2300, seg: 520, cx: 0, cz: -560, heightFn: hLand, own, sun: [-0.7, 0.3, -0.5],
      colorFn: (h, lit, slope, x, z, out) => { out.copy(sn); out.lerp(bl, (1 - lit) * 0.8 + 0.08); out.lerp(pk, Math.pow(lit, 1.6) * 0.7); out.multiplyScalar(0.62 + 0.55 * lit); out.multiplyScalar(0.88 + 0.22 * fbm(x * 0.3, z * 0.3, 2)); },
    });
    { const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#eeeef8'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 700; i++) { const x = R.range(0, 256), y = R.range(0, 256), r = R.range(1, 6), v = R.range(150, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},${R.range(0.15, 0.4)})`; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(160, 160); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true; }
    scene.add(terr); await tick();
    // one monster, merged from lumpy ice-coated tiers, arms, a nose, and a face; coloured by height and by the dusk sun
    const SUN = new THREE.Vector3(-0.7, 0.35, -0.5).normalize(), POS = [], COL = [];
    const addPart = (geo, sx, sy, sz, x, y, z, base) => {
      const g = geo.clone(); g.scale(sx, sy, sz); g.translate(x, y, z); const ni = g.toNonIndexed(); ni.computeVertexNormals(); const p = ni.attributes.position, n = ni.attributes.normal, c = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const hgt = p.getY(i); if (base !== 'ice') c.set(base); else { c.set('#f2f4ff').lerp(new THREE.Color('#8aa8e8'), 1 - smoothstep(0.1, 1.3, hgt)); const lit = Math.max(0, n.getX(i) * SUN.x + n.getY(i) * SUN.y + n.getZ(i) * SUN.z); c.lerp(new THREE.Color('#ffc8c0'), lit * 0.6); c.lerp(new THREE.Color('#5a6ab8'), (1 - lit) * 0.35); } POS.push(p.getX(i), p.getY(i), p.getZ(i)); COL.push(c.r, c.g, c.b); }
    };
    const sp = new THREE.SphereGeometry(1, 9, 6), cone = new THREE.ConeGeometry(1, 1.6, 9, 1);
    const tiers = [[0, 0.0, 1.0, 0.85], [0, 0.45, 0.88, 0.8], [0.04, 0.88, 0.74, 0.7], [-0.03, 1.28, 0.58, 0.56], [0.03, 1.6, 0.4, 0.42]];
    for (const [ox, y, r, h] of tiers) addPart(sp, r, h * 0.55, r * 0.95, ox, y + 0.3, 0, 'ice');
    addPart(cone, 0.3, 0.55, 0.3, 0, 2.05, 0, 'ice');
    for (const sgn of [-1, 1]) { addPart(sp, 0.42, 0.28, 0.3, sgn * 0.86, 1.05, 0.05, 'ice'); addPart(sp, 0.3, 0.22, 0.26, sgn * 1.12, 0.86, 0.1, 'ice'); addPart(sp, 0.34, 0.24, 0.3, sgn * 0.62, 1.55, 0.0, 'ice'); }
    addPart(sp, 0.12, 0.14, 0.2, 0, 1.38, 0.52, 'ice');   // nose
    for (const sgn of [-1, 1]) { addPart(sp, 0.13, 0.11, 0.08, sgn * 0.2, 1.52, 0.5, '#0c1030'); addPart(sp, 0.05, 0.05, 0.03, sgn * 0.2, 1.52, 0.56, '#ffb030'); }   // eyes: dark hollows with an amber glint
    addPart(sp, 0.22, 0.05, 0.1, 0, 1.18, 0.5, '#0c1030');   // the mouth
    const mg = own(new THREE.BufferGeometry()); mg.setAttribute('position', new THREE.Float32BufferAttribute(POS, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(COL, 3));
    const MN = 700, mon = new THREE.InstancedMesh(mg, own(new THREE.MeshBasicMaterial({ vertexColors: true })), MN); mon.frustumCulled = false;
    const M = [];
    for (let i = 0; i < MN; i++) { const z = R.range(70, -760), side = R() < 0.5 ? -1 : 1, sc = R.range(5.5, 13), d = 17 + sc * 0.9 + Math.pow(R(), 2.2) * 120; if (z < -480 && R() < 0.6) { i--; continue; } M.push({ z0: z, x0: GX(z) + side * d, sc, side, ph: R.range(0, 6.28), yaw: Math.PI, lean: R.range(0.05, 0.14) }); }
    scene.add(mon);
    // snowfall and the spray kicked up beside the sled
    const FN = 520, fp = new Float32Array(FN * 3), fd = []; for (let i = 0; i < FN; i++) fd.push({ x: R.range(-30, 30), y: R.range(0, 30), z: R.range(-50, 10), s: R.range(1.5, 4) });
    const fg = own(new THREE.BufferGeometry()); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    const dC = mkCanvas(32); { const g = dC.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 15); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,240,245,0.5)'); rg.addColorStop(1, 'rgba(255,230,240,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); }
    const dT = own(new THREE.CanvasTexture(dC)); dT.colorSpace = THREE.SRGBColorSpace;
    const flakes = new THREE.Points(fg, own(new THREE.PointsMaterial({ map: dT, size: 0.32, sizeAttenuation: true, color: '#fff4fa', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); flakes.frustumCulled = false; scene.add(flakes);
    const SPN = 260, spp = new Float32Array(SPN * 3), spc = new Float32Array(SPN * 3), sg = own(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(spp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(spc, 3));
    const spray = new THREE.Points(sg, own(new THREE.PointsMaterial({ map: dT, size: 0.4, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); spray.frustumCulled = false; scene.add(spray);
    // two ski tracks running down the groove ahead of you
    { const pts = []; for (const off of [-0.45, 0.45]) { for (let k = 0; k < 150; k++) { const z0 = 50 - k * 5, z1 = z0 - 5, x0 = GX(z0) + off, x1 = GX(z1) + off; pts.push(x0, hLand(x0, z0) + 0.08, z0, x1, hLand(x1, z1) + 0.08, z1); } }
      const tg = own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); scene.add(new THREE.LineSegments(tg, own(new THREE.LineBasicMaterial({ color: '#8a96c4', transparent: true, opacity: 0.7 })))); }
    await tick();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _d = new THREE.Vector3(), _r = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
    // real dark firs on the far flanks, for contrast with the ice-coated giants
    { const FN2 = 520, fm = new THREE.InstancedMesh(own(new THREE.ConeGeometry(1, 1, 8, 1).translate(0, 0.5, 0)), own(new THREE.MeshBasicMaterial({ color: '#2c3c5c' })), FN2), fm2 = new THREE.InstancedMesh(own(new THREE.ConeGeometry(1, 1, 8, 1).translate(0, 0.5, 0)), own(new THREE.MeshBasicMaterial({ color: '#d8e0f4' })), FN2);
      for (let i = 0; i < FN2; i++) { const z = R.range(70, -760), side = R() < 0.5 ? -1 : 1, x = GX(z) + side * R.range(150, 420), y = hLand(x, z), h = R.range(10, 26); _p.set(x, y, z); _q.identity(); _s.set(h * 0.32, h, h * 0.32); fm.setMatrixAt(i, _m.compose(_p, _q, _s)); _p.set(x, y + h * 0.55, z); _s.set(h * 0.2, h * 0.5, h * 0.2); fm2.setMatrixAt(i, _m.compose(_p, _q, _s)); }
      fm.frustumCulled = fm2.frustumCulled = false; scene.add(fm, fm2); }
    // snow glints: tiny sparks twinkling slowly in the low light along the slope
    const GN = 520, gp = new Float32Array(GN * 3), gcl = new Float32Array(GN * 3), gdd = []; for (let i = 0; i < GN; i++) gdd.push({ x: R.range(-26, 26), z: R.range(-60, 8), ph: R.range(0, 6.28), sp: R.range(0.4, 1.1) });
    const ggm = own(new THREE.BufferGeometry()); ggm.setAttribute('position', new THREE.BufferAttribute(gp, 3)); ggm.setAttribute('color', new THREE.BufferAttribute(gcl, 3));
    const glints = new THREE.Points(ggm, own(new THREE.PointsMaterial({ map: dT, size: 0.28, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); glints.frustumCulled = false; scene.add(glints);
    return {
      scene, path, duration: DUR, title: 'The Monsters Watch You Pass', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 66, near: 0.3, nearThrough: 0.6, far: 4000, lookAhead: 14, sway: 0, bank: 0.2 },
      pois: [
        { at: [0, 260, -1500], from: 0, to: 1, fade: 0.1, weight: 0.26 },
        ...[[0.12, 0.26, 1], [0.3, 0.44, -1], [0.48, 0.6, 1], [0.64, 0.76, -1]].map(([f, t2, sd]) => ({ at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); let best = null, bd = 1e9; for (const m of M) { if (m.side !== sd || m.sc < 7) continue; const dz = c[2] - m.z0; if (dz < 18 || dz > 80) continue; const d = Math.abs(dz - 45); if (d < bd) { bd = d; best = m; } } return best ? [best.x0, hLand(best.x0, best.z0) + best.sc * 1.4, best.z0] : [c[0], c[1], c[2] - 60]; }, from: f, to: t2, fade: 0.3, weight: 0.75 })),
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#c8e4ff', veil: '#c8e4ff', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.14, radius: 0.45, threshold: 0.93 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#fff0f6', shadowTint: '#141a48', vignette: 0.22, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        for (let i = 0; i < M.length; i++) {
          const m = M[i]; let x = m.x0 + 0.8 * Math.sin(t * 0.3 + m.ph), z = m.z0;
          const y = hLand(x, z) - 0.2 * m.sc * 0.2, wob = 1 + 0.025 * Math.sin(t * 1.3 + m.ph);
          const want = Math.atan2(cp.x - x, cp.z - z), k = Math.hypot(cp.x - x, cp.z - z) < 230 ? 1 : 0; m.yaw += Math.atan2(Math.sin(want - m.yaw), Math.cos(want - m.yaw)) * (1 - Math.exp(-dt * 1.4)) * k;
          _q.setFromEuler(_e.set(-m.lean + 0.03 * Math.sin(t * 0.8 + m.ph), m.yaw, 0.04 * Math.sin(t * 0.6 + m.ph), 'YXZ'));
          _p.set(x, y, z); _s.set(m.sc * wob, m.sc * wob, m.sc * wob); mon.setMatrixAt(i, _m.compose(_p, _q, _s));
        }
        mon.instanceMatrix.needsUpdate = true;
        camera.getWorldDirection(_d); _r.crossVectors(_d, UPV).normalize();
        for (let i = 0; i < FN; i++) { const f = fd[i]; const y = ((f.y - t * f.s) % 30 + 30) % 30; fp[i * 3] = cp.x + f.x + 1.5 * Math.sin(t * 0.7 + i); fp[i * 3 + 1] = cp.y - 4 + y; fp[i * 3 + 2] = cp.z + f.z; }
        fg.attributes.position.needsUpdate = true;
        for (let i = 0; i < SPN; i++) { const side = i % 2 ? 1 : -1, a = ((t * 1.7 + i * 0.173) % 1), back = a * 9, spread = 0.9 + a * 2.4; const x = cp.x + _r.x * side * spread + _d.x * (-back + 1.5), z = cp.z + _r.z * side * spread + _d.z * (-back + 1.5); spp[i * 3] = x; spp[i * 3 + 1] = hLand(x, z) + 0.3 + a * 1.8 * (0.4 + ((i * 7) % 5) / 5); spp[i * 3 + 2] = z; const f = (1 - a) * 0.3 * smoothstep(0.3, 1.0, T); spc[i * 3] = f; spc[i * 3 + 1] = f * 0.95; spc[i * 3 + 2] = f; }
        sg.attributes.position.needsUpdate = true; sg.attributes.color.needsUpdate = true;
        for (let i = 0; i < GN; i++) { const d = gdd[i], x = cp.x + d.x, z = cp.z + d.z, n = i * 3; gp[n] = x; gp[n + 1] = hLand(x, z) + 0.12; gp[n + 2] = z; const f = Math.pow(Math.max(0, Math.sin(t * d.sp + d.ph)), 10) * 0.9; gcl[n] = f; gcl[n + 1] = f * 0.95; gcl[n + 2] = f; }
        ggm.attributes.position.needsUpdate = true; ggm.attributes.color.needsUpdate = true;
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
