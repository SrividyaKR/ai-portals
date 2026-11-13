// THE DYE VATS OF FEZ: we open INSIDE a great vat of dye, in marbled curtains of indigo, saffron and henna, while a swallow plunges
// in from above in the first second; we rise through the surface into a Moroccan tannery at sunrise and walk its stained stone
// lane, among stacks of hides, wooden buckets and bundles of mint, under the irregular stacked houses and minarets of a medina.
// Swallows (which really do skim low over water and dip to drink on the wing) swoop ahead of us across the vats, each dip
// sending out ripples, drops and a bloom of a contrasting colour, and at the end they climb toward the first sun, half-risen.
// Real 3D, lit low and from behind. Plaster, stone, stains and dye are drawn here. Nothing is loaded. 9:16 is the target shape.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';

const sm = (s) => s * s * (3 - 2 * s);
const HV = { x: 0, z: -37, r: 9.5, top: 0.55, surf: 0.45, bottom: -10 };    // the great pit vat the film opens inside
const KEYS = [   // x, y, z: the lane at a low eye, over the rim of the great vat, in through the surface, a lazy S through the ink (left wall, right wall) to look about, then level and straight at the portal standing on the floor
  [0.0, 1.1, 36], [0.5, 1.1, 22], [-0.4, 1.1, 8], [0.3, 1.1, -8], [0.0, 1.1, -20], [0.0, 1.95, -26.0], [0.0, 1.55, -29.0],
  [0.3, -0.3, -31.5], [-1.5, -2.0, -33.0], [-3.8, -3.4, -34.8], [-3.6, -4.8, -36.6], [-1.0, -5.8, -38.0], [1.8, -6.4, -39.2], [0.6, -6.9, -40.6], [0.2, -7.0, -42.4], [0.2, -7.0, -45.2],
];

export default {
  id: 'dye-vats-of-fez',
  name: 'The Dye Vats of Fez',
  category: 'wilderness',
  weirdness: 0.5,
  media: ['air', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene();
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const trash = [];
    const own = (o) => { trash.push(o); return o; };
    const DUR = 19;

    // ---------- the flight: down the lane, over the rim, down through the dye and up out of the far side ----------
    const path = makePath(KEYS);
    let PL = 0, tDown = 0, tUp = 0;
    { const a = new THREE.Vector3(), b = new THREE.Vector3(); path.pointAt(0, a);
      for (let i = 1; i <= 600; i++) { const u = i / 600; path.pointAt(u, b); PL += a.distanceTo(b);
        if (!tDown && b.y < HV.surf && Math.abs(b.z - HV.z) < HV.r) tDown = u * DUR;
        if (tDown && !tUp && b.y > HV.surf && u * DUR > tDown + 0.5) tUp = u * DUR;
        a.copy(b); } }
    await tick();

    // ---------- sky: sunrise ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'blueHour', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      zenith: '#4a78ac', mid: '#9db8d2', horizon: '#f4c898', ground: '#e0bc94', horizonPow: 2.2,
      scatter: 0, sunIntensity: 0, sunGlow: 0, sunElevation: -6, bodies: [],
      stars: 0, milkyWay: 0, clouds: { coverage: 0.1, lit: '#fbe0c4', shade: '#a4b6cc', silver: 0 }, clouds2: false,
    });
    scene.add(sky.object);
    const AIR = { fog: new THREE.Color('#e2c4a0'), dens: 0.0062, bg: new THREE.Color('#9db8d2') };
    const WATER = { fog: new THREE.Color('#3a68c8'), dens: 0.02, bg: new THREE.Color('#3a68c8') };
    scene.fog = new THREE.FogExp2(AIR.fog.clone(), AIR.dens);
    scene.background = AIR.bg.clone();
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    const sun = new THREE.DirectionalLight('#ffd2a0', 1.5); sun.position.set(-4, 14, -100); scene.add(sun);
    scene.add(new THREE.HemisphereLight('#b0c0d6', '#b89c78', 1.5));
    await tick();

    // ---------- textures drawn here ----------
    const mkCanvas = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const wrapBlob = (g, S, x, y, r, style) => {
      g.fillStyle = style;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue;
        g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill();
      }
    };
    const tex = (c, rx, ry) => { const t = own(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const plasterC = mkCanvas(256); {
      const g = plasterC.getContext('2d'), S = 256; g.fillStyle = '#d8cdb6'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 220; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(6, 38), R.range(0, 1) < 0.5 ? `rgba(120,100,76,${R.range(0.03, 0.1)})` : `rgba(250,244,230,${R.range(0.05, 0.14)})`);
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(70,52,38,${R.range(0.03, 0.08)})`; g.fillRect(R.range(0, S), 0, R.range(2, 9), R.range(60, S)); }
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,72,54,${R.range(0.05, 0.2)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.4, 1.4); }
    }
    const plasterT = tex(plasterC, 5, 1), rimT = tex(plasterC, 3, 3), pitT = tex(plasterC, 12, 6);
    // the lane: pale paving with joints, wear, and the real stains of the work (spilled indigo, saffron, henna, green)
    const laneC = mkCanvas(256); {
      const g = laneC.getContext('2d'), S = 256; g.fillStyle = '#b9a88c'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 160; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(3, 13), R.range(0, 1) < 0.5 ? `rgba(80,64,48,${R.range(0.02, 0.06)})` : `rgba(230,214,184,${R.range(0.03, 0.07)})`);
      const dyes = ['43,74,154', '217,160,50', '181,80,46', '63,138,100'];
      for (let i = 0; i < 44; i++) { const c = dyes[R.int(0, 3)], x = R.range(0, S), y = R.range(0, S), n = R.int(3, 7); for (let k = 0; k < n; k++) wrapBlob(g, S, x + R.range(-9, 9), y + R.range(-9, 9), R.range(2, 8), `rgba(${c},${R.range(0.07, 0.17)})`); }
      g.strokeStyle = 'rgba(60,46,34,0.4)'; g.lineWidth = 1.6;
      for (let y = 0; y < S; y += 64) { g.beginPath(); g.moveTo(0, y + R.range(-2, 2)); g.lineTo(S, y + R.range(-2, 2)); g.stroke(); }
      for (let y = 0; y < S; y += 64) for (let x = (y / 64) % 2 ? 0 : 32; x < S; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + R.range(-2, 2), y + 64); g.stroke(); }
    }
    const laneT = tex(laneC, 32, 32);   // a 520 m plane: one tile is about 16 m
    const dyeC = mkCanvas(256); {
      const g = dyeC.getContext('2d'), S = 256; g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 160; i++) { const v = R.range(0.7, 1.0), r = R.range(10, 46); wrapBlob(g, S, R.range(0, S), R.range(0, S), r, `rgba(${Math.round(v * 255)},${Math.round(v * 255)},${Math.round(v * 255)},${R.range(0.08, 0.26)})`); }
      for (let i = 0; i < 90; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(8, 30), `rgba(0,0,0,${R.range(0.04, 0.16)})`);
      const rg = g.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.5); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.34)');
      g.fillStyle = rg; g.fillRect(0, 0, S, S);
    }
    const dyeT = own(new THREE.CanvasTexture(dyeC)); dyeT.colorSpace = THREE.SRGBColorSpace;
    // the houses: mud plaster with a few small irregular windows, doors and dark wooden beams, no grid
    const facC = mkCanvas(256); {
      const g = facC.getContext('2d'), S = 256; g.drawImage(plasterC, 0, 0);
      for (let i = 0; i < 9; i++) { const x = R.range(14, 220), y = R.range(18, 220), w = R.range(10, 20), h = R.range(16, 30);
        g.fillStyle = 'rgba(38,28,22,0.9)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.5); g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill();
        if (R() < 0.5) { g.fillStyle = 'rgba(110,70,40,0.85)'; g.fillRect(x - 3, y + h, w + 6, 4); } }
      g.fillStyle = 'rgba(60,40,26,0.7)'; for (let i = 0; i < 5; i++) g.fillRect(0, R.range(20, 240), S, R.range(3, 6));
    }
    const facT = tex(facC, 1, 1);
    // the pit wall: years of dye running down plaster, in soft meandering drips and clouds of indigo, saffron, henna, green and rose
    const pitC = mkCanvas(512); {
      const g = pitC.getContext('2d'), S = 512; const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#3a62c0'); gr.addColorStop(1, '#1a2c70'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
      const tmp = mkCanvas(S), t = tmp.getContext('2d'); t.lineCap = 'round'; t.lineJoin = 'round';
      const cols = ['240,170,60', '212,92,56', '84,194,142', '130,160,240', '236,128,160'];
      for (let i = 0; i < 48; i++) {
        const c = cols[R.int(0, 4)], x0 = R.range(0, S), y0 = R.range(-20, S * 0.6), len = R.range(100, 380), w = R.range(10, 34), ph = R.range(0, 6.28), amp = R.range(6, 26), a = R.range(0.28, 0.55);
        for (const ox of [-S, 0, S]) { t.strokeStyle = `rgba(${c},${a})`; t.lineWidth = w; t.beginPath(); for (let k = 0; k <= 24; k++) { const f = k / 24, x = x0 + ox + Math.sin(f * 5 + ph) * amp, y = y0 + f * len; k ? t.lineTo(x, y) : t.moveTo(x, y); } t.stroke(); }
      }
      for (let i = 0; i < 12; i++) { const c = cols[R.int(0, 4)], x = R.range(0, S), y = R.range(0, S), r = R.range(40, 110); for (const ox of [-S, 0, S]) { const q = t.createRadialGradient(x + ox, y, 0, x + ox, y, r); q.addColorStop(0, `rgba(${c},0.22)`); q.addColorStop(1, `rgba(${c},0)`); t.fillStyle = q; t.fillRect(x + ox - r, y - r, r * 2, r * 2); } }
      g.filter = 'blur(6px)'; g.drawImage(tmp, 0, 0); g.filter = 'none';
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(20,30,70,${R.range(0.04, 0.16)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.5, 1.5); }
    }
    const pitDyeT = tex(pitC, 3, 1);
    // the surface seen from below: a bright window of light, soft caustic patches
    const ceilC = mkCanvas(256); { const g = ceilC.getContext('2d'), S = 256; const rg = g.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.72); rg.addColorStop(0, '#a8ccff'); rg.addColorStop(0.5, '#5a86d8'); rg.addColorStop(1, '#2a4a9c'); g.fillStyle = rg; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 70; i++) { const x = R.range(0, S), y = R.range(0, S), r = R.range(8, 28), q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(255,255,255,0.22)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); } }
    const ceilT = own(new THREE.CanvasTexture(ceilC)); ceilT.colorSpace = THREE.SRGBColorSpace;
    const glowC = mkCanvas(128); { const g = glowC.getContext('2d'); const rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,236,200,0.9)'); rg.addColorStop(0.35, 'rgba(255,214,160,0.35)'); rg.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const glowT = own(new THREE.CanvasTexture(glowC)); glowT.colorSpace = THREE.SRGBColorSpace;
    const softC = mkCanvas(128); { const g = softC.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,255,255,0.85)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const softT = own(new THREE.CanvasTexture(softC));
    await tick();

    // ---------- ground and lane: one plain paved plane (invisible from below, so the dive passes straight through it) ----------
    { const gg = own(new THREE.PlaneGeometry(520, 520)); gg.rotateX(-Math.PI / 2); const gm = new THREE.Mesh(gg, own(new THREE.MeshBasicMaterial({ map: laneT, color: '#c2b28e' }))); gm.position.set(0, 0, -20); scene.add(gm); }

    // ---------- the vats: instanced stone walls with thickness, shadowed inner walls, a murky surface below the rim ----------
    const PAL = ['#2f5fd0', '#f0b030', '#d4552f', '#3fbf8a', '#e0709a', '#2f5fd0', '#f0b030', '#3fbf8a', '#d4552f', '#e0709a'];
    const DYES = ['#2f5fd0', '#f0b030', '#d4552f', '#3fbf8a', '#e0709a'];   // the vats, the blooms and the birds all draw from this one palette
    const TIMES = [1.05, 1.5, 1.9, 2.3, 2.8, 3.2, 3.7, 4.2, 4.8, 5.4, 6.1, 6.8, 7.6, 8.4, 9.3, 10.3];   // a dip every half second to begin with: the hook
    const touches = TIMES.map((t, i) => ({ t, bird: i % 8, side: i % 2 ? -1 : 1, dye: DYES[i % 5], bloom: DYES[i % 5] }));
    touches.push({ t: tDown - 0.7, bird: 3, pit: true, bloom: '#2f5fd0', dye: '#2f5fd0' });   // the last swallow touches the great vat just before we jump in
    const vats = [], _a = new THREE.Vector3();
    for (const e of touches) {
      if (e.pit) { e.x = HV.x + 0.4; e.z = HV.z + 1.6; e.y = HV.surf; e.r = 2.6; continue; }
      path.pointAt(Math.min(0.98, e.t / DUR + 6.5 / PL), _a); e.x = _a.x + e.side * 3.4; e.z = _a.z; e.r = 1.7;
      vats.push({ x: e.x, z: e.z, sx: 1.7, sz: 1.7, h: 0.6, rot: R.range(0, 6.28), col: e.dye, tint: 1, touch: true });
    }
    for (const side of [-1, 1]) for (let row = 0; row < 2; row++) {
      const x0 = side * (4.1 + row * 7.2);
      for (let z = 54; z > -90; z -= 6.2) {
        if (R() < 0.05) continue;
        if (vats.some((v) => v.touch && Math.hypot(v.x - x0, v.z - z) < 5)) continue;
        if (Math.abs(z - HV.z) < HV.r + 4 && Math.abs(x0) < HV.r + 5) continue;
        vats.push({ x: x0 + R.range(-0.4, 0.4) * (row ? 1 : 0.25), z: z + R.range(-0.8, 0.8), sx: R.range(1.8, 2.7), sz: R.range(1.8, 2.7), h: R.range(0.5, 0.7), rot: R.range(0, 6.28), col: PAL[R.int(0, PAL.length - 1)], tint: R.range(0.9, 1.08) });
      }
    }
    const N = vats.length;
    const outerG = own(new THREE.CylinderGeometry(1.0, 1.1, 1, 30, 1, true)); outerG.translate(0, 0.5, 0);
    const rimG = own(new THREE.RingGeometry(0.86, 1.0, 30)); rimG.rotateX(-Math.PI / 2); rimG.translate(0, 1.0, 0);
    const innerG = own(new THREE.CylinderGeometry(0.86, 0.86, 0.55, 30, 1, true)); innerG.translate(0, 0.72, 0);
    const liqG = own(new THREE.CircleGeometry(0.86, 30)); liqG.rotateX(-Math.PI / 2); liqG.translate(0, 0.78, 0);
    const outer = new THREE.InstancedMesh(outerG, own(new THREE.MeshLambertMaterial({ map: plasterT, color: '#ffffff' })), N);
    const rim = new THREE.InstancedMesh(rimG, own(new THREE.MeshLambertMaterial({ map: rimT, color: '#ffffff', side: THREE.DoubleSide })), N);
    const inner = new THREE.InstancedMesh(innerG, own(new THREE.MeshLambertMaterial({ map: plasterT, color: '#8a7a66', side: THREE.BackSide })), N);
    const liq = new THREE.InstancedMesh(liqG, own(new THREE.MeshBasicMaterial({ map: dyeT, color: '#ffffff' })), N); liq.material.color.setScalar(1.25);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color();
    vats.forEach((v, i) => {
      _q.setFromAxisAngle(_y, v.rot); _p.set(v.x, 0, v.z); _s.set(v.sx, v.h, v.sz); _m.compose(_p, _q, _s);
      for (const im of [outer, rim, inner, liq]) im.setMatrixAt(i, _m);
      _c.setRGB(v.tint, v.tint * 0.98, v.tint * 0.94); outer.setColorAt(i, _c); rim.setColorAt(i, _c);
      liq.setColorAt(i, _c.set(v.col));
    });
    for (const im of [outer, rim, inner, liq]) { im.computeBoundingSphere(); im.frustumCulled = false; scene.add(im); }
    const hideG = own(new THREE.SphereGeometry(1, 10, 6)); const hides = [];
    vats.forEach((v, i) => { if (!v.touch && R() < 0.5) for (let k = 0; k < R.int(2, 4); k++) { const a = R.range(0, 6.28), d = R.range(0, 0.55); hides.push({ x: v.x + Math.cos(a) * d * v.sx, z: v.z + Math.sin(a) * d * v.sz, y: 0.78 * v.h + 0.02, s: R.range(0.35, 0.8) * Math.min(v.sx, v.sz), rot: R.range(0, 6.28) }); } });
    const hideM = new THREE.InstancedMesh(hideG, own(new THREE.MeshLambertMaterial({ color: '#d2b48a' })), hides.length);
    hides.forEach((h, i) => { _q.setFromAxisAngle(_y, h.rot); _p.set(h.x, h.y, h.z); _s.set(h.s, h.s * 0.07, h.s * R.range(0.7, 1)); hideM.setMatrixAt(i, _m.compose(_p, _q, _s)); hideM.setColorAt(i, _c.set(['#d2b48a', '#c49a64', '#e0d0b0', '#a87a52'][i % 4])); });
    hideM.computeBoundingSphere(); hideM.frustumCulled = false; scene.add(hideM);
    await tick();

    // ---------- the great pit vat ----------
    {
      const wallM = own(new THREE.MeshLambertMaterial({ map: plasterT, color: '#ffffff' }));
      const outerH = own(new THREE.CylinderGeometry(HV.r + 0.9, HV.r + 1.1, HV.top, 56, 1, true)); outerH.translate(HV.x, HV.top / 2, HV.z);
      const rimH = own(new THREE.RingGeometry(HV.r, HV.r + 0.9, 56)); rimH.rotateX(-Math.PI / 2); rimH.translate(HV.x, HV.top, HV.z);
      const pitH = own(new THREE.CylinderGeometry(HV.r, HV.r, HV.top - HV.bottom, 56, 1, true)); pitH.translate(HV.x, (HV.top + HV.bottom) / 2, HV.z);
      scene.add(new THREE.Mesh(outerH, wallM), new THREE.Mesh(rimH, own(new THREE.MeshLambertMaterial({ map: rimT, color: '#ffffff', side: THREE.DoubleSide }))));
      scene.add(new THREE.Mesh(pitH, own(new THREE.MeshBasicMaterial({ map: pitDyeT, color: '#ffffff', side: THREE.BackSide, name: 'pitwall' }))));
      const surfG = own(new THREE.CircleGeometry(HV.r, 56)); surfG.rotateX(-Math.PI / 2); surfG.translate(HV.x, HV.surf, HV.z);
      scene.add(new THREE.Mesh(surfG, own(new THREE.MeshBasicMaterial({ map: dyeT, color: '#4a70c0', transparent: true, opacity: 0.92 }))), new THREE.Mesh(surfG, own(new THREE.MeshBasicMaterial({ map: ceilT, color: '#ffffff', side: THREE.BackSide, transparent: true, opacity: 0.72, depthWrite: false }))));
      const botG = own(new THREE.CircleGeometry(HV.r, 40)); botG.rotateX(-Math.PI / 2); botG.translate(HV.x, HV.bottom + 0.02, HV.z);
      scene.add(new THREE.Mesh(botG, own(new THREE.MeshBasicMaterial({ color: '#1c3270' }))));
    }

    // ---------- the lane dressed with the work: stacks of hides, wooden buckets, bundles of mint ----------
    {
      const stackG = own(new THREE.BoxGeometry(1.1, 0.14, 0.8)), buckG = own(new THREE.CylinderGeometry(0.26, 0.2, 0.4, 10)), mintG = own(new THREE.ConeGeometry(0.05, 0.6, 5)); mintG.translate(0, 0.3, 0);
      const st = [], bk = [], mt = [];
      const edge = () => (R() < 0.5 ? -1 : 1) * R.range(1.5, 3.2);
      const zr = () => { let z; do { z = R.range(36, -56); } while (Math.abs(z - HV.z) < 9); return z; };
      for (let i = 0; i < 34; i++) { const z = zr(), x = edge(), n = R.int(3, 7); for (let k = 0; k < n; k++) st.push({ x: x + R.range(-0.1, 0.1), z: z + R.range(-0.1, 0.1), y: 0.07 + k * 0.14, rot: R.range(-0.4, 0.4) + (i % 3) * 0.5, sx: R.range(0.8, 1.2), sz: R.range(0.8, 1.2), c: ['#d2b48a', '#cfae80', '#c9a676', '#d8bc92'][k % 4] }); }
      for (let i = 0; i < 40; i++) bk.push({ x: edge(), z: zr(), rot: R.range(0, 6.28) });
      for (let i = 0; i < 40; i++) { const cx = edge(), cz = zr(); for (let k = 0; k < 7; k++) mt.push({ x: cx + R.range(-0.1, 0.1), z: cz + R.range(-0.1, 0.1), tx: R.range(-0.5, 0.5), tz: R.range(-0.5, 0.5), rot: R.range(0, 6.28) }); }
      const sM = new THREE.InstancedMesh(stackG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), st.length), bM = new THREE.InstancedMesh(buckG, own(new THREE.MeshLambertMaterial({ color: '#6b4a2e' })), bk.length), mM = new THREE.InstancedMesh(mintG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), mt.length);
      st.forEach((o, i) => { _q.setFromAxisAngle(_y, o.rot); _p.set(o.x, o.y, o.z); _s.set(o.sx, 1, o.sz); sM.setMatrixAt(i, _m.compose(_p, _q, _s)); sM.setColorAt(i, _c.set(o.c)); });
      bk.forEach((o, i) => { _q.setFromAxisAngle(_y, o.rot); _p.set(o.x, 0.2, o.z); _s.set(1, 1, 1); bM.setMatrixAt(i, _m.compose(_p, _q, _s)); });
      mt.forEach((o, i) => { _q.setFromEuler(new THREE.Euler(o.tx, o.rot, o.tz)); _p.set(o.x, 0.04, o.z); _s.set(1, R.range(0.8, 1.3), 1); mM.setMatrixAt(i, _m.compose(_p, _q, _s)); mM.setColorAt(i, _c.set(['#6a9a54', '#7aa85c', '#5a8a48'][i % 3])); });
      for (const im of [sM, bM, mM]) { im.computeBoundingSphere(); im.frustumCulled = false; scene.add(im); }
    }
    await tick();

    // ---------- the medina: irregular stacked houses of different heights, balconies and terraces, hides hung out to dry ----------
    const bl = [];
    for (const side of [-1, 1]) {
      for (let z = 66; z > -70;) { const w = R.range(7, 12), d = R.range(8, 11), h = R.range(7, 15); bl.push({ x: side * (16.5 + R.range(0, 5) + w / 2), z: z - d / 2, w, d, h, c: ['#c9a37a', '#bd8a62', '#d8c3a0', '#a86f4c', '#cdb48c'][R.int(0, 4)], side }); z -= d + R.range(-0.5, 1.5); }
      for (let z = 66; z > -70;) { const w = R.range(10, 16), d = R.range(10, 14), h = R.range(16, 26); bl.push({ x: side * (31 + R.range(0, 8)), z: z - d / 2, w, d, h, c: ['#c9a37a', '#bd8a62', '#d8c3a0', '#a86f4c'][R.int(0, 3)], side }); z -= d + R.range(0, 3); }
    }
    const bm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshLambertMaterial({ map: facT, color: '#ffffff' })), bl.length);
    bl.forEach((b, i) => { _q.identity(); _p.set(b.x, b.h / 2, b.z); _s.set(b.w, b.h, b.d); bm.setMatrixAt(i, _m.compose(_p, _q, _s)); bm.setColorAt(i, _c.set(b.c)); });
    bm.frustumCulled = false; scene.add(bm);
    const tiers = []; bl.forEach((b) => { if (R() < 0.75) tiers.push({ x: b.x + R.range(-1, 1), z: b.z + R.range(-1, 1), w: b.w * R.range(0.55, 0.8), d: b.d * R.range(0.55, 0.8), h: R.range(2.5, 5), y: b.h, c: b.c }); });
    const tm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshLambertMaterial({ map: facT, color: '#ffffff' })), tiers.length);
    tiers.forEach((b, i) => { _q.identity(); _p.set(b.x, b.y + b.h / 2, b.z); _s.set(b.w, b.h, b.d); tm.setMatrixAt(i, _m.compose(_p, _q, _s)); tm.setColorAt(i, _c.set(b.c)); });
    tm.frustumCulled = false; scene.add(tm);
    for (const [mx, mz, mh] of [[-26, -14, 28], [27, 16, 24]]) {
      const tw = new THREE.Mesh(own(new THREE.BoxGeometry(3.6, mh, 3.6)), own(new THREE.MeshLambertMaterial({ map: facT, color: '#d8c3a0' }))); tw.position.set(mx, mh / 2, mz); scene.add(tw);
      const cap = new THREE.Mesh(own(new THREE.ConeGeometry(2.8, 4, 4)), own(new THREE.MeshLambertMaterial({ color: '#2f7a5a' }))); cap.rotation.y = Math.PI / 4; cap.position.set(mx, mh + 2, mz); scene.add(cap);
      const ball = new THREE.Mesh(own(new THREE.SphereGeometry(0.5, 10, 8)), own(new THREE.MeshBasicMaterial({ color: '#c9a040' }))); ball.position.set(mx, mh + 4.4, mz); scene.add(ball);
    }
    const near = bl.filter((b) => Math.abs(b.x) < 28);
    const balG = own(new THREE.BoxGeometry(1.8, 0.5, 1.1)), balN = 36, bal = new THREE.InstancedMesh(balG, own(new THREE.MeshLambertMaterial({ color: '#5a3c26' })), balN);
    for (let i = 0; i < balN; i++) { const b = near[R.int(0, near.length - 1)], y = R.range(3.5, Math.max(4, b.h - 1)); _q.identity(); _p.set(b.x - b.side * (b.w / 2 + 0.4), y, b.z + R.range(-b.d / 2 + 1, b.d / 2 - 1)); _s.set(1, 1, 1); bal.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    bal.frustumCulled = false; scene.add(bal);
    const hangN = 70, hang = new THREE.InstancedMesh(own(new THREE.PlaneGeometry(1.4, 3.0)), own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), hangN);
    for (let i = 0; i < hangN; i++) {
      const b = near[R.int(0, near.length - 1)];
      _q.setFromEuler(new THREE.Euler(0, -b.side * Math.PI / 2 + R.range(-0.25, 0.25), R.range(-0.08, 0.08))); _p.set(b.x - b.side * (b.w / 2 + 0.1), R.range(3.5, Math.max(4, b.h - 1.5)), b.z + R.range(-b.d / 2 + 1, b.d / 2 - 1)); _s.set(1, R.range(0.8, 1.2), 1);
      hang.setMatrixAt(i, _m.compose(_p, _q, _s)); hang.setColorAt(i, _c.set(['#c9954c', '#a85a3a', '#d9c8a4', '#8a5a3c', '#b8863c'][R.int(0, 4)]));
    }
    hang.frustumCulled = false; scene.add(hang);
    await tick();

    { // the low sun over the far end of the lane
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), rg = g.createRadialGradient(128, 128, 4, 128, 128, 126);
      rg.addColorStop(0, 'rgba(255,244,214,1)'); rg.addColorStop(0.22, 'rgba(255,214,140,0.95)'); rg.addColorStop(0.5, 'rgba(255,170,100,0.35)'); rg.addColorStop(1, 'rgba(255,150,90,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      const st = own(new THREE.CanvasTexture(c)); st.colorSpace = THREE.SRGBColorSpace;
      const sunM = new THREE.Mesh(own(new THREE.PlaneGeometry(420, 420)), own(new THREE.MeshBasicMaterial({ map: st, transparent: true, fog: false, depthWrite: false }))); sunM.position.set(0, 75, -950); scene.add(sunM);
    }
    // ---------- the swallows: dark blue backs, cream bellies, rust throats, long forked tails; made a little large so they read ----------
    const mkSwallow = () => {
      const g = new THREE.Group(), M = (c) => own(new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
      const add = (geo, c, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(own(geo), M(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
      const body = add(new THREE.SphereGeometry(1, 12, 10), '#34477f', 0.12, 0.1, 0.4, 0, 0, 0);
      const belly = add(new THREE.SphereGeometry(1, 12, 8), '#f2e6cc', 0.1, 0.06, 0.32, 0, -0.05, 0.03);
      const head = add(new THREE.SphereGeometry(1, 10, 8), '#c4623c', 0.09, 0.085, 0.11, 0, 0.01, 0.4);
      const beakG = new THREE.ConeGeometry(0.03, 0.12, 6); beakG.rotateX(Math.PI / 2); add(beakG, '#15151c', 1, 1, 1, 0, 0, 0.54);
      // wings: an inner panel lifted, an outer panel drooping, with normals, so they curve and take the light
      const wingG = own(new THREE.BufferGeometry()); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, 0, 0, -0.26, 0.42, 0.07, -0.3, 0, 0, 0.2, 0.42, 0.07, -0.3, 0.42, 0.07, 0.1, 0.42, 0.07, 0.1, 0.42, 0.07, -0.3, 0.86, -0.03, -0.38, 0.42, 0.07, 0.1, 0.86, -0.03, -0.38, 0.66, -0.02, 0.0], 3)); wingG.computeVertexNormals();
      const wl = new THREE.Mesh(wingG, M('#3f5494')), wr = new THREE.Mesh(wingG, M('#3f5494')); wr.scale.x = -1; g.add(wl, wr);
      const tailG = own(new THREE.BufferGeometry()); tailG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.3, 0.12, 0, -0.82, 0.03, 0, -0.34, 0, 0, -0.3, -0.12, 0, -0.82, -0.03, 0, -0.34], 3)); tailG.computeVertexNormals();
      const tail = new THREE.Mesh(tailG, M('#34477f')); g.add(tail);
      g.scale.setScalar(2.6); scene.add(g);
      const parts = { body: body.material, belly: belly.material, head: head.material, wl: wl.material, wr: wr.material, tail: tail.material }, base = {};
      for (const k in parts) { base[k] = parts[k].color.clone(); parts[k].emissive.copy(base[k]).multiplyScalar(0.4); }   // never a black silhouette, even in shadow
      return { g, wl, wr, parts, base, target: {}, k: 0 };
    };
    const birds = Array.from({ length: 8 }, () => mkSwallow());
    const PARTS = [['belly', 'tail'], ['wl', 'wr'], ['head', 'body']];   // each dip dyes two more places on the bird, so by the end every swallow is multicoloured
    let lastT = 0;
    const LEADS = [6, 8, 10, 12, 14, 7, 9, 11], _cr = new THREE.Vector3(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _p3 = new THREE.Vector3();
    // each bird cruises ahead of the camera, weaving, then swoops down to touch the dye at its appointed moments
    // T is seconds of flight (it stays 0 while the world is only a preview in a portal); tc is the clock, which always runs. The weaving, flitting, bobbing and
    // fore-and-aft drift run on the clock, so the swallows are already flying about before we arrive and never wait for us to start moving; only the dips follow the flight.
    const swallowPos = (i, T, tc, out) => {
      const lead = LEADS[i] + 2.6 * Math.sin(tc * 0.9 + i * 1.3);
      path.pointAt(Math.min(0.99, Math.max(0, T / DUR) + lead / PL), _cr);
      out.set(_cr.x + (2.4 + (i % 3) * 0.7) * Math.sin(tc * 0.8 + i * 2.1) + 1.1 * Math.sin(tc * 2.6 + i * 1.7), 2.4 + 1.2 * ((i * 0.37) % 1) + 0.5 * Math.sin(tc * 1.3 + i) + 0.35 * Math.sin(tc * 3.4 + i * 2) + 6 * smoothstep(15, 18, T), _cr.z);   // they flit: quick small figure-eights on top of the cruise
      for (const e of touches) {
        if (e.bird !== i) continue;
        let w = Math.max(0, 1 - Math.abs(T - e.t) / 1.0); w = w * w * (3 - 2 * w);
        if (w > 0) { out.x = lerp(out.x, e.x, w); out.y = lerp(out.y, (e.y ?? 0.468) + 0.14, w); out.z = lerp(out.z, e.z, w); }
      }
      return out;
    };
    // splash effects: ripples, a few drops, and a bloom of a contrasting colour
    const ringG = own(new THREE.RingGeometry(0.84, 1.0, 44)); ringG.rotateX(-Math.PI / 2);
    const bloomG = own(new THREE.CircleGeometry(1, 40)); bloomG.rotateX(-Math.PI / 2);
    const geyG = own(new THREE.CylinderGeometry(0.9, 0.35, 1, 18, 1, true)), geyT = (() => { const c = mkCanvas(64), g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 64); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.35, 'rgba(255,255,255,0.55)'); lg.addColorStop(1, 'rgba(255,255,255,0.95)'); g.fillStyle = lg; g.fillRect(0, 0, 64, 64); return own(new THREE.CanvasTexture(c)); })();
    const fxs = touches.map((e) => {
      const g = new THREE.Group(); const y = (e.y ?? 0.78 * 0.6) + 0.03; g.position.set(e.x, y, e.z); g.visible = false;
      const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: '#e8f0ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); g.add(m); return m; });
      const bloom = new THREE.Mesh(bloomG, new THREE.MeshBasicMaterial({ map: softT, color: e.bloom, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); g.add(bloom);
      const gey = new THREE.Mesh(geyG, new THREE.MeshBasicMaterial({ map: geyT, color: e.bloom, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); g.add(gey);   // a column of dye thrown up by the dip
      const dg = new THREE.BufferGeometry(), dp = new Float32Array(34 * 3), dv = []; for (let i = 0; i < 34; i++) { const a = R.range(0, 6.28), s = R.range(0.5, 1.7); dv.push([Math.cos(a) * s * 0.8, R.range(2.2, 4.2), Math.sin(a) * s * 0.8]); }
      dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      const drops = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowT, size: 0.2, color: '#f2f7ff', transparent: true, opacity: 0, depthWrite: false })); drops.frustumCulled = false; g.add(drops);
      scene.add(g); return { e, g, rings, bloom, gey, drops, dv, dp };
    });

    // ---------- under the surface: ink trails, pale hides like rays, clouds of pigment, bubbles ----------
    const uw = new THREE.Group(); uw.visible = false; scene.add(uw);
    const hideRays = [];
    for (let i = 0; i < 3; i++) {
      const g = own(new THREE.PlaneGeometry(3.2, 1.9, 10, 5)), m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ color: ['#d8b88a', '#c8a070', '#e0d0b0'][i], side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false })));
      { const pa0 = g.attributes.position.array; for (let i = 0; i < pa0.length; i += 3) pa0[i + 1] *= 1 - 0.88 * Math.pow(Math.abs(pa0[i]) / 1.6, 1.5); } g.rotateX(-Math.PI / 2); m.scale.setScalar(0.55); uw.add(m); hideRays.push({ m, g, base: g.attributes.position.array.slice(), ph: R.range(0, 6.28), r: R.range(4.2, 5.6), y: R.range(-4.4, -2.4), sp: R.range(0.25, 0.4) * (i % 2 ? 1 : -1) });
    }
    const mkPoints = (n, size, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const p = new THREE.Points(g, new THREE.PointsMaterial({ map: glowT, size, vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })); p.frustumCulled = false; uw.add(p); return p; };
    const cloudN = 60, clouds = mkPoints(cloudN, 8.5, 0.62), cl = [];
    for (let i = 0; i < cloudN; i++) { const a = R.range(0, 6.28), r = R.range(0.5, HV.r - 0.8); cl.push({ a, r, y: R.range(-9, -0.5), sp: R.range(0.05, 0.14) * (i % 2 ? 1 : -1), c: new THREE.Color(['#3a58b8', '#d8903a', '#b8502e', '#3f8a64', '#3a58b8'][i % 5]) }); }
    const bubN = 90, bubbles = mkPoints(bubN, 0.22, 0.75), bub = [];
    for (let i = 0; i < bubN; i++) bub.push({ a: R.range(0, 6.28), r: R.range(0, HV.r - 0.5), y0: R.range(-10, 0), sp: R.range(0.3, 0.8) });

    return {
      scene, path, duration: DUR, title: 'The Dye Vats of Fez', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 64, near: 0.3, nearThrough: 0.5, far: 3000, lookAhead: 10, sway: 0, bank: 0.03 },
      pois: [],
      portal: { shape: 'circle', style: 'ring', radius: 3.4, color: '#ffcf8a', veil: '#ffcf8a', glow: 0.8, halo: true, revealDistance: 700 },
      post: { exposure: 0.8, bloom: { strength: 0.25, radius: 0.45, threshold: 0.9 }, grade: { saturation: 1.02, contrast: 1.05, tint: '#fff2e4', shadowTint: '#2a2038', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR);   // seconds of flight: the clock t also runs while the world is only a preview in a portal
        sky.update(dt, t, camera);
        dyeT.offset.set(t * 0.004, t * 0.003);
        const cp = camera.position, inPit = cp.y < HV.surf && Math.hypot(cp.x - HV.x, cp.z - HV.z) < HV.r;
        const E = inPit ? WATER : AIR; scene.fog.color.copy(E.fog); scene.fog.density = E.dens; scene.background.copy(E.bg); sky.object.visible = !inPit; uw.visible = inPit || (cp.y < 3 && Math.hypot(cp.x - HV.x, cp.z - HV.z) < HV.r + 6);
        // the swallows take the colour of each dye they touch, a patch at a time, and keep it
        if (T < lastT - 0.5) { for (const b of birds) { for (const k in b.parts) b.parts[k].color.copy(b.base[k]); b.parts[k].emissive.copy(b.base[k]).multiplyScalar(0.4); b.target = {}; b.k = 0; } for (const e of touches) e.done = false; }
        lastT = T;
        for (const e of touches) if (!e.done && T >= e.t) { e.done = true; const b = birds[e.bird], c = new THREE.Color(e.dye); for (const k of PARTS[b.k++ % PARTS.length]) b.target[k] = c; }
        for (const b of birds) for (const k in b.target) { b.parts[k].color.lerp(b.target[k], 1 - Math.exp(-dt * 5)); b.parts[k].emissive.copy(b.parts[k].color).multiplyScalar(0.45); }
        // the swallows: bank into their turns, climb and dive with the swoop, and flap in bursts between glides
        for (let i = 0; i < birds.length; i++) {
          const b = birds[i]; swallowPos(i, T, t, _p1); swallowPos(i, T + 0.06, t + 0.06, _p2); swallowPos(i, T + 0.3, t + 0.3, _p3);
          const vx = (_p2.x - _p1.x) / 0.06, vy = (_p2.y - _p1.y) / 0.06, vz = (_p2.z - _p1.z) / 0.06, hv = Math.hypot(vx, vz) || 1;
          const h1 = Math.atan2(vx, vz); let dh = Math.atan2(_p3.x - _p2.x, _p3.z - _p2.z) - h1; dh = ((dh + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
          b.g.position.copy(_p1); b.g.rotation.order = 'YXZ'; b.g.rotation.y = h1; b.g.rotation.x = -Math.atan2(vy, hv) * 0.8; b.g.rotation.z = Math.max(-0.7, Math.min(0.7, -dh * 1.4));
          const burst = Math.sin(t * 0.9 + i * 2.0) > -0.3 ? 1 : 0.15, ang = 0.55 * burst * Math.sin(t * 13 + i * 1.7) + 0.32;
          b.wl.rotation.z = ang; b.wr.rotation.z = -ang;
        }
        if (uw.visible) {
          for (const h of hideRays) {   // pale hides undulating slowly through the dye
            const pa = h.g.attributes.position.array, b = h.base, ang = t * h.sp + h.ph;
            for (let i = 0; i < pa.length; i += 3) pa[i + 1] = b[i + 1] + 0.32 * Math.sin(b[i] * 1.7 - t * 2.1 + h.ph);
            h.g.attributes.position.needsUpdate = true; h.m.position.set(HV.x + Math.cos(ang) * h.r, h.y + 0.3 * Math.sin(t * 0.6 + h.ph), HV.z + Math.sin(ang) * h.r); h.m.rotation.y = -ang + Math.PI / 2;
          }
          const cpA = clouds.geometry.attributes.position.array, ccA = clouds.geometry.attributes.color.array;
          cl.forEach((c, i) => { const a = c.a + t * c.sp; cpA[i * 3] = HV.x + Math.cos(a) * c.r; cpA[i * 3 + 1] = c.y + 0.5 * Math.sin(t * 0.3 + i); cpA[i * 3 + 2] = HV.z + Math.sin(a) * c.r; ccA[i * 3] = c.c.r; ccA[i * 3 + 1] = c.c.g; ccA[i * 3 + 2] = c.c.b; });
          clouds.geometry.attributes.position.needsUpdate = true; clouds.geometry.attributes.color.needsUpdate = true;
          const bpA = bubbles.geometry.attributes.position.array, bcA = bubbles.geometry.attributes.color.array;
          bub.forEach((b, i) => { const y = ((b.y0 + t * b.sp + 10) % 10.4) - 10; bpA[i * 3] = HV.x + Math.cos(b.a + t * 0.1) * b.r; bpA[i * 3 + 1] = y; bpA[i * 3 + 2] = HV.z + Math.sin(b.a + t * 0.1) * b.r; bcA[i * 3] = 0.8; bcA[i * 3 + 1] = 0.9; bcA[i * 3 + 2] = 1; });
          bubbles.geometry.attributes.position.needsUpdate = true; bubbles.geometry.attributes.color.needsUpdate = true;
        }
        // the splashes
        for (const f of fxs) {
          const tau = T - f.e.t; if (tau < 0 || tau > 12) { f.g.visible = false; continue; } f.g.visible = true;
          const maxR = (f.e.r ?? 1.7) * 0.92;
          f.rings.forEach((m, k) => { const tk = tau - 0.2 * k; if (tk <= 0 || tk > 2.4) { m.material.opacity = 0; return; } const s = Math.min(maxR, 0.12 + 0.75 * tk); m.scale.set(s, 1, s); m.material.opacity = 0.5 * (1 - tk / 2.4); });
          { const a1 = Math.min(1, tau / 0.45), rise = Math.sin(a1 * Math.PI * 0.5), fall = 1 - smoothstep(0.55, 1.2, tau), h = Math.max(0.01, 2.8 * rise * fall); f.gey.scale.set((1 + 0.7 * rise) * Math.min(1.5, maxR / 1.7 + 0.3), h, (1 + 0.7 * rise) * Math.min(1.5, maxR / 1.7 + 0.3)); f.gey.position.y = h / 2; f.gey.material.opacity = 0.65 * fall; }
          const bs = Math.min(maxR, 0.15 + 0.3 * tau); f.bloom.scale.set(bs, 1, bs); f.bloom.material.opacity = Math.max(0, Math.min(0.9, tau * 1.6)) * (1 - Math.min(1, tau / 12) * 0.7);
          if (tau < 1.0) { const dp = f.dp; f.dv.forEach((v, i) => { dp[i * 3] = v[0] * tau; dp[i * 3 + 1] = Math.max(0, v[1] * tau - 4.9 * tau * tau); dp[i * 3 + 2] = v[2] * tau; }); f.drops.geometry.attributes.position.needsUpdate = true; f.drops.material.opacity = 0.9 * (1 - tau); } else f.drops.material.opacity = 0;
        }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
