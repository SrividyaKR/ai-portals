// THE INFINITY ROOM: you walk a narrow glass walkway through a hall whose walls, floor and ceiling are all mirrors. Hundreds of glowing
// orbs hang on threads in every colour, and every one of them goes on for ever in all directions, so you are inside a lattice of light with no
// edges. The colours roll slowly down the hall like weather. The camera weaves between the orbs and looks up, down and out at the endless
// copies; at the far end a huge faceted mirror ball turns beside a small glowing ring.
// The mirrors are done by drawing repeated reflected copies of the hall (each wall, the floor and the ceiling), so every one is real geometry.
// The camera moves at constant speed: z = 30 - 6 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, pathFrom } from '../kit/mine.js';

const DUR = 20, V = 6, W = 5, H = 8, KX = 3, KY = 2;
const camAt = (T) => [1.1 * Math.sin(T * 0.55) + 0.3 * Math.sin(T * 1.3), 1.7 + 2.6 * smoothstep(13, 20, T) + 0.1 * Math.sin(T * 6), 30 - V * T];

export default {
  id: 'infinity-mirror-room',
  name: 'The Infinity Room',
  category: 'wilderness',
  weirdness: 0.85,
  media: ['open', 'air'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 50); await tick();
    scene.background = new THREE.Color('#05030c'); scene.fog = new THREE.FogExp2(new THREE.Color('#080414'), 0.0105);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    const glowC = mkCanvas(64); { const g = glowC.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const glowT = own(new THREE.CanvasTexture(glowC)); glowT.colorSpace = THREE.SRGBColorSpace;
    // ---- the content of one hall: orbs on threads, gilt pilasters, a mirror ball. Everything below is shared by all the reflected copies ----
    const mcC = mkCanvas(128); { const g = mcC.getContext('2d'); g.fillStyle = '#b0b0b0'; g.fillRect(0, 0, 128, 128); const rg = g.createRadialGradient(64, 64, 20, 64, 64, 64); rg.addColorStop(0, '#c8c8c8'); rg.addColorStop(0.72, '#6a6a6a'); rg.addColorStop(0.9, '#8a8a8a'); rg.addColorStop(1, '#f0f0f0'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); const hl = g.createRadialGradient(46, 40, 1, 46, 40, 26); hl.addColorStop(0, 'rgba(255,255,255,1)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(0, 0, 128, 128); }
    const mcT = own(new THREE.CanvasTexture(mcC)); mcT.colorSpace = THREE.SRGBColorSpace;
    const ON = 340, orbG = own(new THREE.SphereGeometry(1, 20, 14)), orbs = new THREE.InstancedMesh(orbG, own(new THREE.MeshMatcapMaterial({ color: '#ffffff', matcap: mcT })), ON), od = [];
    const thr = []; for (let i = 0; i < ON; i++) { let x, y, z; do { x = R.range(-4.4, 4.4); y = R.range(0.9, 7.1); z = R.range(40, -190); } while (Math.abs(x - camAt((30 - z) / V)[0]) < 2.3 && y < 5.6); const r = R.range(0.18, 0.46); od.push({ x, y, z, r, h: R.range(0, 1), ph: R.range(0, 6.28) }); _p.set(x, y, z); _q.identity(); _s.setScalar(r); orbs.setMatrixAt(i, _m.compose(_p, _q, _s)); thr.push(x, y, z, x, H, z); }
    orbs.frustumCulled = false; for (let i = 0; i < ON; i++) orbs.setColorAt(i, _c.set('#ffffff'));
    const gP = new Float32Array(ON * 3), gC = new Float32Array(ON * 3); od.forEach((d, i) => { gP[i * 3] = d.x; gP[i * 3 + 1] = d.y; gP[i * 3 + 2] = d.z; });
    const gg = own(new THREE.BufferGeometry()); gg.setAttribute('position', new THREE.BufferAttribute(gP, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gC, 3));
    const gmat = own(new THREE.PointsMaterial({ map: glowT, size: 2.3, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const tg = own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.Float32BufferAttribute(thr, 3)); const tmat = own(new THREE.LineBasicMaterial({ color: '#4a3a5a', transparent: true, opacity: 0.6 }));
    const PN = 16, pil = new THREE.InstancedMesh(own(new THREE.BoxGeometry(0.14, H, 0.25)), own(new THREE.MeshBasicMaterial({ color: '#c8a050' })), PN * 2);
    for (let i = 0; i < PN; i++) for (const sx of [-1, 1]) { _p.set(sx * W, H / 2, 38 - i * 16); _q.identity(); _s.set(1, 1, 1); pil.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), _m.compose(_p, _q, _s)); } pil.frustumCulled = false;
    const strip = (y, sx) => { const m = new THREE.Mesh(own(new THREE.BoxGeometry(0.07, 0.07, 260)), own(new THREE.MeshBasicMaterial({ color: '#c8a050' }))); m.position.set(sx * W, y, -80); return m; };
    const SN = 1600, spp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { spp[i * 3] = R.range(-4.8, 4.8); spp[i * 3 + 1] = R.range(0.2, 7.8); spp[i * 3 + 2] = R.range(40, -190); }
    const stc = new Float32Array(SN * 3), stph = Array.from({ length: SN }, () => [R.range(0, 6.28), R.range(0.25, 0.8)]); const starG = own(new THREE.BufferGeometry()); starG.setAttribute('position', new THREE.BufferAttribute(spp, 3)); starG.setAttribute('color', new THREE.BufferAttribute(stc, 3)); const starM = own(new THREE.PointsMaterial({ color: '#ffffff', map: glowT, vertexColors: true, size: 0.2, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    const base = new THREE.Group(); base.add(new THREE.Points(starG, starM), orbs, new THREE.Points(gg, gmat), new THREE.LineSegments(tg, tmat), pil, strip(0.08, -1), strip(0.08, 1), strip(H - 0.08, -1), strip(H - 0.08, 1));
    // the big faceted mirror ball at the far end
    const ballG = own(new THREE.IcosahedronGeometry(3.4, 2)), bc = new Float32Array(ballG.attributes.position.count * 3); { const c = new THREE.Color(); for (let f = 0; f < bc.length / 9; f++) { c.setHSL(R.range(0, 1), 0.15, R.range(0.35, 0.95)); for (let v = 0; v < 3; v++) { bc[f * 9 + v * 3] = c.r; bc[f * 9 + v * 3 + 1] = c.g; bc[f * 9 + v * 3 + 2] = c.b; } } }
    ballG.setAttribute('color', new THREE.BufferAttribute(bc, 3)); const ball = new THREE.Mesh(ballG, own(new THREE.MeshBasicMaterial({ vertexColors: true }))); ball.position.set(0, 4, -150); base.add(ball);
    // ---- the lattice of reflected copies: image k across the side mirrors is (-1)^k x + 2kW, image j across floor and ceiling is (-1)^j y + 2jH ----
    const cells = [];
    for (let k = -KX; k <= KX; k++) for (let j = -KY; j <= KY; j++) {
      const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.makeScale((k & 1) ? -1 : 1, (j & 1) ? -1 : 1, 1); g.matrix.setPosition(2 * k * W, 2 * j * H, 0);
      const parts = [new THREE.InstancedMesh(orbG, orbs.material, ON), new THREE.Points(gg, gmat), new THREE.LineSegments(tg, tmat), new THREE.InstancedMesh(pil.geometry, pil.material, PN * 2), new THREE.Points(starG, starM)];
      parts[0].instanceMatrix = orbs.instanceMatrix; parts[0].instanceColor = orbs.instanceColor; parts[3].instanceMatrix = pil.instanceMatrix;
      for (const m of parts) { m.frustumCulled = false; g.add(m); } for (const m of base.children.slice(4)) g.add(m.clone());
      const b2 = ball.clone(); b2.frustumCulled = false; g.add(b2); g.matrixWorldNeedsUpdate = true; cells.push({ g, k, j, ball: b2, parts }); scene.add(g);
    }
    scene.add(base); base.children.forEach((m) => { m.frustumCulled = false; });
    // tinted glass at each mirror plane so every reflection is a little dimmer than the last
    for (let k = -KX; k < KX; k++) { const x = (2 * k + 1) * W; if (Math.abs(x) > 30) continue; const gl = new THREE.Mesh(own(new THREE.PlaneGeometry(260, H * 5)), own(new THREE.MeshBasicMaterial({ color: '#0a0614', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }))); gl.rotation.y = Math.PI / 2; gl.position.set(x, H / 2, -80); scene.add(gl); }
    // a real floor: dark glass with a fine light grid, and a bright walkway with chevrons showing which way to go
    const fc = mkCanvas(256), fx = fc.getContext('2d'); fx.fillStyle = '#10081c'; fx.fillRect(0, 0, 256, 256); fx.strokeStyle = 'rgba(200,170,255,0.55)'; fx.lineWidth = 3; fx.strokeRect(0, 0, 256, 256); fx.strokeStyle = 'rgba(200,170,255,0.2)'; fx.lineWidth = 2; fx.beginPath(); fx.moveTo(128, 0); fx.lineTo(128, 256); fx.moveTo(0, 128); fx.lineTo(256, 128); fx.stroke();
    const fT = own(new THREE.CanvasTexture(fc)); fT.wrapS = fT.wrapT = THREE.RepeatWrapping; fT.repeat.set(2 * W * 7 / 2.5, 330 / 2.5); fT.colorSpace = THREE.SRGBColorSpace; fT.anisotropy = 8;
    const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(2 * W * 7, 330).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: fT, transparent: true, opacity: 0.62, depthWrite: false }))); floor.position.set(0, 0.002, -80); scene.add(floor);
    const wc = mkCanvas(128), wx = wc.getContext('2d'); wx.fillStyle = '#6a58a8'; wx.fillRect(0, 0, 128, 128); wx.strokeStyle = '#f2e8ff'; wx.lineWidth = 12; wx.lineJoin = 'round'; wx.beginPath(); wx.moveTo(22, 100); wx.lineTo(64, 40); wx.lineTo(106, 100); wx.stroke(); wx.fillStyle = '#f2e8ff'; wx.fillRect(0, 0, 8, 128); wx.fillRect(120, 0, 8, 128);
    const wT = own(new THREE.CanvasTexture(wc)); wT.wrapS = wT.wrapT = THREE.RepeatWrapping; wT.repeat.set(1, 330 / 3); wT.colorSpace = THREE.SRGBColorSpace; wT.anisotropy = 8;
    const walk = new THREE.Mesh(own(new THREE.PlaneGeometry(3.0, 330).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ map: wT, transparent: true, opacity: 0.85, depthWrite: false }))); walk.position.set(0, 0.012, -80); scene.add(walk);
    await tick();
    const hsl = new THREE.Color();
    return {
      scene, path, duration: DUR, title: 'The Infinity Room', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 72, near: 0.2, nearThrough: 0.4, far: 600, lookAhead: 8, sway: 0, bank: 0.06 },
      pois: [
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0] - 14, 4.5, c[2] - 6]; }, from: 0.12, to: 0.24, fade: 0.3, weight: 0.8 },   // out through the left mirror
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0], -9, c[2] - 10]; }, from: 0.28, to: 0.4, fade: 0.3, weight: 0.8 },        // down into the floor's reflection
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0] + 12, 12, c[2] - 8]; }, from: 0.44, to: 0.56, fade: 0.3, weight: 0.8 }, // up and right
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0] - 6, 3.5, c[2] - 20]; }, from: 0.6, to: 0.72, fade: 0.3, weight: 0.6 },
      ],
      portal: { shape: 'circle', style: 'ring', radius: 7, color: '#d8c8ff', veil: '#d8c8ff', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.16, radius: 0.5, threshold: 0.9 }, grade: { saturation: 1.1, contrast: 1.05, tint: '#f8f0ff', shadowTint: '#0c0620', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        // colours roll slowly down the hall like weather, and every orb breathes gently (well under 1 Hz)
        for (let i = 0; i < ON; i++) { const d = od[i], hue = ((d.z * 0.006 + t * 0.045 + d.h * 0.25) % 1 + 1) % 1, pulse = 0.65 + 0.35 * Math.sin(t * 0.6 + d.ph); hsl.setHSL(hue, 0.75, 0.55); orbs.setColorAt(i, _c.copy(hsl).multiplyScalar(1.1 + 0.9 * pulse)); gC[i * 3] = hsl.r * pulse * 0.42; gC[i * 3 + 1] = hsl.g * pulse * 0.42; gC[i * 3 + 2] = hsl.b * pulse * 0.42; }
        const ta = tg.attributes.position.array;
        for (let i = 0; i < ON; i++) { const d = od[i], k = 0.5 + 1.3 * (H - d.y) / H, x = d.x + 0.11 * k * Math.sin(t * 0.5 + d.ph), z = d.z + 0.09 * k * Math.sin(t * 0.37 + d.ph * 1.7); _p.set(x, d.y, z); _q.identity(); _s.setScalar(d.r); orbs.setMatrixAt(i, _m.compose(_p, _q, _s)); gP[i * 3] = x; gP[i * 3 + 2] = z; ta[i * 6] = x; ta[i * 6 + 2] = z; }
        orbs.instanceMatrix.needsUpdate = true; gg.attributes.position.needsUpdate = true; tg.attributes.position.needsUpdate = true;
        for (let i = 0; i < SN; i++) { const f = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * stph[i][1] + stph[i][0]), 3); stc[i * 3] = 0.85 * f; stc[i * 3 + 1] = 0.8 * f; stc[i * 3 + 2] = f; } starG.attributes.color.needsUpdate = true;
        orbs.instanceColor.needsUpdate = true; gg.attributes.color.needsUpdate = true;
        ball.rotation.y = t * 0.25; for (const c of cells) c.ball.rotation.y = t * 0.25;
      },
      dispose() { for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
