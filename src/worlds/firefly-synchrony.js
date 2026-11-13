// THE NIGHT THE FIREFLIES AGREE: in a few valleys of Tennessee (Elkmont) thousands of fireflies, each flashing alone, slowly fall into step until
// the whole forest blinks as one. You walk a dark trail through huge trees and ferns. At first every firefly flashes at its own moment, a field
// of random sparks. Then, over the walk, they lock together and a wave of light runs through the forest, lighting the trunks and ferns as it
// goes and doubling in a dark stream you wade across. At the end they pour upward in a spiral over the trail toward a small glowing ring.
// Flashes are soft and slow (under 1 Hz). The camera moves at constant speed: z = 30 - 5 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, pathFrom, skyFor } from '../kit/mine.js';

const DUR = 20, V = 5, ZS0 = -30, ZS1 = -45;
const PXF = (z) => 6.5 * Math.sin(z * 0.045) + 3 * Math.sin(z * 0.11 + 1);
const BR = (z) => smoothstep(-19, -27, z) * (1 - smoothstep(-47, -55, z));   // 1 while you are on the footbridge
const camAt = (T) => { const z = 30 - V * T; return [PXF(z) + 0.8 * Math.sin(T * 0.9) * (1 - 0.8 * BR(z)), 1.65 + 0.05 * Math.sin(T * 5.2) + 0.5 * BR(z), z]; };
const WAVE = (z) => -z * 0.011;

export default {
  id: 'firefly-synchrony',
  name: 'The Night the Fireflies Agree',
  category: 'wilderness',
  weirdness: 0.7,
  media: ['forest', 'water'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 50); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'night', stars: 0.6, sky: { zenith: '#050a1c', mid: '#0c1a34', horizon: '#1a3040', ground: '#06101a', horizonPow: 2.4, clouds: { coverage: 0.1, lit: '#2a4060', shade: '#060c18', silver: 0 } } });
    const FOGC = new THREE.Color('#06101a'); scene.fog = new THREE.FogExp2(FOGC, 0.0125); scene.background = new THREE.Color('#06101a');
    await tick();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    const glowC = mkCanvas(64); { const g = glowC.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,0.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const glowT = own(new THREE.CanvasTexture(glowC)); glowT.colorSpace = THREE.SRGBColorSpace;
    // trees: trunks, high canopy blobs, ferns; nothing within 4.5 m of the trail
    const base = new THREE.Group(), mirror = new THREE.Group(); mirror.scale.y = -1; scene.add(base, mirror);
    const both = (geo, mat, n) => { const a = new THREE.InstancedMesh(geo, mat, n), b = new THREE.InstancedMesh(geo, mat, n); b.instanceMatrix = a.instanceMatrix; a.frustumCulled = b.frustumCulled = false; base.add(a); mirror.add(b); return a; };
    const trunkMat = own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), tN = 520, trunks = both(own(new THREE.CylinderGeometry(0.7, 1.0, 30, 7).translate(0, 15, 0)), trunkMat, tN);
    const clear = (x, z, r) => Math.abs(x - PXF(z)) > r;
    for (let i = 0; i < tN; i++) { let x, z; do { z = R.range(60, -150); x = PXF(z) + (R() < 0.5 ? -1 : 1) * R.range(2, 75); } while (!clear(x, z, 5.2) || (z < ZS0 + 2 && z > ZS1 - 2)); const sc = R.range(0.5, 1.4); _p.set(x, 0, z); _q.setFromEuler(_e.set(R.range(-0.03, 0.03), R.range(0, 6.28), R.range(-0.03, 0.03))); _s.set(sc, R.range(0.8, 1.2), sc); trunks.setMatrixAt(i, _m.compose(_p, _q, _s)); trunks.setColorAt(i, _c.set(['#3a5058', '#2e4850', '#44585a', '#2a3c44'][R.int(0, 3)]).multiplyScalar(R.range(0.8, 1.1))); }
    const cN = 300, canopy = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 8, 6)), own(new THREE.MeshBasicMaterial({ color: '#0a1814' })), cN); canopy.frustumCulled = false;
    for (let i = 0; i < cN; i++) { const z = R.range(50, -150), x = PXF(z) + R.range(-38, 38), sc = R.range(7, 14); _p.set(x, R.range(20, 28), z); _q.identity(); _s.set(sc, sc * 0.4, sc); canopy.setMatrixAt(i, _m.compose(_p, _q, _s)); } base.add(canopy);
    const lc = mkCanvas(128); { const g = lc.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, 64); g.quadraticCurveTo(64, 4, 122, 64); g.quadraticCurveTo(64, 124, 6, 64); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 64); g.lineTo(122, 64); g.stroke(); }
    const lt = own(new THREE.CanvasTexture(lc)); lt.colorSpace = THREE.SRGBColorSpace; const fMat = own(new THREE.MeshBasicMaterial({ map: lt, alphaTest: 0.5, side: THREE.DoubleSide, color: '#ffffff' })), fN = 1400, ferns = new THREE.InstancedMesh(own(new THREE.PlaneGeometry(1, 1)), fMat, fN); ferns.frustumCulled = false;
    for (let i = 0; i < fN; i++) { let x, z; do { z = R.range(40, -130); x = PXF(z) + R.range(-30, 30); } while (!clear(x, z, 3.6) || (z < ZS0 + 1 && z > ZS1 - 1)); const sc = R.range(0.9, 2.6); _p.set(x, R.range(0.1, 0.7), z); _q.setFromEuler(_e.set(R.range(-1.1, -0.3), R.range(0, 6.28), R.range(-0.5, 0.5))); _s.set(sc * 1.5, sc, 1); ferns.setMatrixAt(i, _m.compose(_p, _q, _s)); ferns.setColorAt(i, _c.set(['#1a5a44', '#2a6a4a', '#14483c', '#3a7a50'][R.int(0, 3)])); } base.add(ferns);
    // the ground and the stream across the trail
    const gc = mkCanvas(256), gx = gc.getContext('2d'); gx.fillStyle = '#9a9a9a'; gx.fillRect(0, 0, 256, 256); for (let i = 0; i < 600; i++) { const v = R.range(40, 230) | 0; gx.fillStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.5)})`; gx.beginPath(); gx.arc(R.range(0, 256), R.range(0, 256), R.range(1, 8), 0, 6.28); gx.fill(); }
    const gt = own(new THREE.CanvasTexture(gc)); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(60, 60); const groundMat = own(new THREE.MeshBasicMaterial({ map: gt, color: '#ffffff' }));
    for (const [z0, z1] of [[200, ZS0], [ZS1, -300]]) { const m = new THREE.Mesh(own(new THREE.PlaneGeometry(400, z0 - z1).rotateX(-Math.PI / 2)), groundMat); m.position.set(0, 0, (z0 + z1) / 2); scene.add(m); }
    const water = new THREE.Mesh(own(new THREE.PlaneGeometry(400, ZS0 - ZS1).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#050c14', transparent: true, opacity: 0.85, depthWrite: false }))); water.position.set(0, 0.01, (ZS0 + ZS1) / 2); scene.add(water);
    // a plank footbridge with rails across the stream, so you cross it rather than walk on the water
    const woodMat = own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), BZ0 = -25.5, BZ1 = -49.5, BNP = Math.round((BZ0 - BZ1) / 0.55);
    const planks = new THREE.InstancedMesh(own(new THREE.BoxGeometry(3.3, 0.12, 0.5)), woodMat, BNP), rails = new THREE.InstancedMesh(own(new THREE.BoxGeometry(0.1, 0.1, 0.62)), woodMat, BNP * 2), posts = new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.07, 0.07, 1.15, 6)), woodMat, Math.ceil(BNP / 4) * 2 + 2), beams = new THREE.InstancedMesh(own(new THREE.BoxGeometry(0.16, 0.2, 24)), woodMat, 2);
    { let pi = 0; for (let i = 0; i < BNP; i++) { const z = BZ0 - i * 0.55, dz = 0.5, ang = Math.atan((PXF(z - dz) - PXF(z + dz)) / (2 * dz)) * -1, x = PXF(z), cx = Math.cos(ang), sx = -Math.sin(ang); _q.setFromEuler(_e.set(0, ang, 0)); _p.set(x, 0.42 + R.range(-0.012, 0.012), z); _s.set(1, 1, 1); planks.setMatrixAt(i, _m.compose(_p, _q, _s)); planks.setColorAt(i, _c.set(['#5a4030', '#4a3426', '#684a36'][i % 3]));
        for (const sd of [-1, 1]) { _p.set(x + sd * 1.55 * cx, 1.15, z + sd * 1.55 * sx); rails.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), _m.compose(_p, _q, _s)); rails.setColorAt(i * 2 + (sd > 0 ? 1 : 0), _c.set('#4a3426')); if (i % 4 === 0) { _p.set(x + sd * 1.55 * cx, 0.62, z + sd * 1.55 * sx); posts.setMatrixAt(pi, _m.compose(_p, _q, _s)); posts.setColorAt(pi++, _c.set('#3a2a1e')); } } }
      posts.count = pi; beams.count = 0; }
    for (const o of [planks, rails, posts]) { o.frustumCulled = false; scene.add(o); }
    // bioluminescent mushrooms along the trail edge, mossy fallen logs, and low drifting mist
    const mushMat = own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), MN2 = 150, mcap = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 8, 5, 0, 6.2832, 0, 1.55).scale(1, 0.55, 1)), mushMat, MN2), mstem = new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.09, 0.12, 1, 6).translate(0, 0.5, 0)), own(new THREE.MeshBasicMaterial({ color: '#8aa8a0' })), MN2), mglow = new Float32Array(MN2 * 3);
    for (let i = 0; i < MN2; i++) { let z, x; do { z = R.range(36, -100); x = PXF(z) + (R() < 0.5 ? -1 : 1) * R.range(2.4, 11); } while (z < ZS0 + 3 && z > ZS1 - 3); const h = R.range(0.2, 0.7), sc = R.range(0.12, 0.38); _p.set(x, 0, z); _q.identity(); _s.set(sc, h, sc); mstem.setMatrixAt(i, _m.compose(_p, _q, _s)); _p.set(x, h, z); _s.set(sc * 2.2, sc * 1.6, sc * 2.2); mcap.setMatrixAt(i, _m.compose(_p, _q, _s)); mcap.setColorAt(i, _c.set(['#40ffd0', '#60ff90', '#40c8ff'][R.int(0, 2)])); mglow[i * 3] = x; mglow[i * 3 + 1] = h + 0.1; mglow[i * 3 + 2] = z; }
    mcap.frustumCulled = mstem.frustumCulled = false; scene.add(mcap, mstem);
    const mgg = own(new THREE.BufferGeometry()); mgg.setAttribute('position', new THREE.BufferAttribute(mglow, 3)); const mgp = new THREE.Points(mgg, own(new THREE.PointsMaterial({ map: glowT, size: 1.3, sizeAttenuation: true, color: '#40ffc0', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); mgp.frustumCulled = false; scene.add(mgp);
    const LGN = 46, logs = new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.35, 0.42, 5, 7).rotateZ(Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#2a3a30' })), LGN);
    for (let i = 0; i < LGN; i++) { let z, x; do { z = R.range(36, -110); x = PXF(z) + (R() < 0.5 ? -1 : 1) * R.range(5, 22); } while (z < ZS0 + 3 && z > ZS1 - 3); _p.set(x, 0.3, z); _q.setFromEuler(_e.set(0, R.range(0, 3.14), R.range(-0.1, 0.1))); _s.setScalar(R.range(0.8, 1.8)); logs.setMatrixAt(i, _m.compose(_p, _q, _s)); } logs.frustumCulled = false; scene.add(logs);
    const mistM = own(new THREE.SpriteMaterial({ map: glowT, color: '#2a5a5a', transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); for (let i = 0; i < 70; i++) { const sp = new THREE.Sprite(mistM), sc = R.range(14, 34); sp.scale.set(sc * 1.8, sc * 0.35, 1); const z = R.range(40, -110); sp.position.set(PXF(z) + R.range(-26, 26), R.range(0.5, 2.2), z); scene.add(sp); }
    // the fireflies: a soft core and a faint halo each, shared by the mirror copy
    const FN = 3400, fd = [], fp = new Float32Array(FN * 3), fc = new Float32Array(FN * 3), hc = new Float32Array(FN * 3);
    for (let i = 0; i < FN; i++) { const z = R.range(45, -135), x = PXF(z) + R.range(-34, 34), y = R.range(0.3, 13); fd.push({ x, y, z, r: R.range(0.3, 1.3), sp: R.range(0.2, 0.7), ph: R.range(0, 6.28), rp: R.range(0, 1), vi: i < 800 ? i : -1 }); fp[i * 3] = x; fp[i * 3 + 1] = y; fp[i * 3 + 2] = z; }
    const fg = own(new THREE.BufferGeometry()); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    const hg = own(new THREE.BufferGeometry()); hg.setAttribute('position', fg.getAttribute('position')); hg.setAttribute('color', new THREE.BufferAttribute(hc, 3));
    const coreM = own(new THREE.PointsMaterial({ map: glowT, size: 0.42, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), haloM = own(new THREE.PointsMaterial({ map: glowT, size: 1.5, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    for (const par of [base, mirror]) { const a = new THREE.Points(fg, coreM), b = new THREE.Points(hg, haloM); a.frustumCulled = b.frustumCulled = false; par.add(a, b); }
    await tick();
    const camAtU = (u) => camAt(Math.max(0, Math.min(1, u)) * DUR);
    const baseTrunk = new THREE.Color('#ffffff');
    return {
      scene, path, duration: DUR, title: 'The Night the Fireflies Agree', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 68, near: 0.2, nearThrough: 0.4, far: 1200, lookAhead: 10, sway: 0, bank: 0.08 },
      pois: [
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0] - 9, 3.5, c[2] - 9]; }, from: 0.1, to: 0.2, fade: 0.3, weight: 0.8 },
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0] + 9, 4, c[2] - 9]; }, from: 0.24, to: 0.34, fade: 0.3, weight: 0.8 },
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0], -1.2, c[2] - 7]; }, from: 0.58, to: 0.68, fade: 0.3, weight: 0.8 },       // the stream and its doubled lights
        { at: (tm, uu) => { const c = camAtU(uu); return [c[0], 18, c[2] - 26]; }, from: 0.76, to: 0.94, fade: 0.25, weight: 0.85 },     // the spiral of light
      ],
      portal: { shape: 'circle', style: 'ring', radius: 8, color: '#e8ffc0', veil: '#e8ffc0', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.2, radius: 0.5, threshold: 0.85 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#f2fff4', shadowTint: '#020a14', vignette: 0.3, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        const lock = smoothstep(3.5, 12, T), vort = smoothstep(15, 18.5, T), RATE = 0.8;
        // the forest's brightness follows the wave of flashes as it passes the camera
        const wphase = t * RATE + WAVE(cp.z - 12), sync = Math.pow(Math.max(0, Math.sin(6.2832 * wphase)), 4), lit = 0.085 + 0.4 * lock * sync + 0.05 * lock;
        trunkMat.color.setRGB(lit * 0.9, lit * 1.0, lit * 1.0); woodMat.color.setRGB(lit * 1.3, lit * 1.2, lit * 1.1); { const k = 0.35 + 0.25 * Math.sin(t * 0.5) + 0.3 * lock * sync; mushMat.color.setRGB(0.25 * k, 1.0 * k, 0.8 * k); } fMat.color.setRGB(lit * 1.1, lit * 1.2, lit * 1.0); groundMat.color.setRGB(lit * 0.9, lit * 1.05, lit * 0.95);
        const vcx = PXF(cp.z - 26), vcz = cp.z - 26;
        for (let i = 0; i < FN; i++) {
          const d = fd[i]; let x = d.x + d.r * Math.sin(t * d.sp + d.ph), y = d.y + d.r * Math.cos(t * d.sp * 0.8 + d.ph), z = d.z + d.r * Math.sin(t * d.sp * 0.6 + d.ph * 2);
          if (d.vi >= 0 && vort > 0) { const a = (d.vi * 0.037 + t * 0.1) % 1, th = t * 2.4 + d.vi * 0.31 + a * 9, rad = 1.5 + a * 11, yy = 1 + a * 30; x = lerp(x, vcx + Math.cos(th) * rad, vort); y = lerp(y, yy, vort); z = lerp(z, vcz + Math.sin(th) * rad, vort); }
          const n = i * 3; fp[n] = x; fp[n + 1] = y; fp[n + 2] = z;
          const phi = lerp(d.rp, WAVE(d.z) + d.rp * 0.05, lock), f = Math.pow(Math.max(0, Math.sin(6.2832 * (t * RATE + phi))), 5), b = (0.16 + 0.84 * f) * (0.8 + 0.2 * lock), vb = d.vi >= 0 ? 1 + 0.8 * vort : 1;
          fc[n] = 0.85 * b * vb; fc[n + 1] = 1.0 * b * vb; fc[n + 2] = 0.35 * b * vb; hc[n] = 0.14 * (0.2 + f) * vb; hc[n + 1] = 0.2 * (0.2 + f) * vb; hc[n + 2] = 0.05 * (0.2 + f) * vb;
        }
        fg.attributes.position.needsUpdate = true; fg.attributes.color.needsUpdate = true; hg.attributes.color.needsUpdate = true;
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
