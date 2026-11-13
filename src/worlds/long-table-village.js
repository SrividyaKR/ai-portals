// THE TABLE THAT RUNS THROUGH THE VILLAGE: a hill village at night where every lane is one long gingham table and everyone is at dinner.
// You glide down the middle of it between the diners; the courses change as you go (antipasti, pasta, dolce) while a huge bowl of pasta
// is passed overhead from hand to hand just ahead of you. At the end the diners raise their glasses, a single strand of spaghetti is
// pulled out of the bowl up into the dark, and you rise after it over the roofs toward the moon and a small glowing ring.
// The camera moves at constant speed, so the street is laid out by distance: z = 20 - 6.5 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, pathFrom, skyFor } from '../kit/mine.js';

const DUR = 20, V = 6.5, CY = 1.28;
const camAt = (T) => [0.15 * Math.sin(T * 0.6), CY + 15 * sm(Math.min(1, Math.max(0, (T - 15.3) / 4.7))), 20 - V * T];
const ZEND = 20 - V * DUR;

export default {
  id: 'long-table-village',
  name: 'The Table That Runs Through the Village',
  category: 'wilderness',
  weirdness: 0.7,
  media: ['city', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 40); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'night', stars: 0.5, sky: { zenith: '#0a0c26', mid: '#241c4a', horizon: '#6a4a6a', ground: '#2a2038', horizonPow: 2.4, clouds: { coverage: 0.25, lit: '#6a5a90', shade: '#14102a', silver: 0 } } });
    const FOGC = new THREE.Color('#2a2038'); scene.fog = new THREE.FogExp2(FOGC, 0.0105); scene.background = new THREE.Color('#241c4a');
    await tick();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    const wrapBlob = (g, S, x, y, r, style) => { g.fillStyle = style; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } };
    const glowC = mkCanvas(128); { const g = glowC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,236,180,1)'); rg.addColorStop(0.35, 'rgba(255,190,100,0.35)'); rg.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const glowT = own(new THREE.CanvasTexture(glowC)); glowT.colorSpace = THREE.SRGBColorSpace;
    // facade: warm plaster, green shutters, lit windows, flower boxes, an arched door
    const facC = mkCanvas(256); { const g = facC.getContext('2d'), S = 256; g.fillStyle = '#d6a878'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 160; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(6, 30), R() < 0.5 ? `rgba(120,70,40,${R.range(0.05, 0.14)})` : `rgba(255,230,190,${R.range(0.05, 0.12)})`);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const x = 22 + c * 78, y = 24 + r * 76, lit = R() < 0.7; g.fillStyle = lit ? '#ffcf80' : '#2a2030'; g.fillRect(x, y, 36, 48); if (lit) { g.fillStyle = 'rgba(255,240,200,0.55)'; g.fillRect(x + 4, y + 4, 28, 20); } g.fillStyle = '#3a6a48'; g.fillRect(x - 11, y, 10, 48); g.fillRect(x + 37, y, 10, 48); g.fillStyle = '#c0483a'; g.fillRect(x - 2, y + 48, 40, 7); g.fillStyle = '#4a9a4a'; for (let k = 0; k < 5; k++) g.fillRect(x + k * 8, y + 42, 6, 8); }
      g.fillStyle = '#4a2c20'; g.beginPath(); g.moveTo(100, 256); g.lineTo(100, 186); g.arc(128, 186, 28, Math.PI, 0); g.lineTo(156, 256); g.fill(); }
    const facT = own(new THREE.CanvasTexture(facC)); facT.wrapS = facT.wrapT = THREE.RepeatWrapping; facT.colorSpace = THREE.SRGBColorSpace; facT.anisotropy = 4;
    // cobbles
    const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2)), own(new THREE.ShaderMaterial({
      uniforms: { uFogCol: { value: FOGC.clone() }, uFogD: { value: 0.0105 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uFogD; uniform vec3 uFogCol; varying vec3 vW;
        vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vor(vec2 x, out vec2 cid){ vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .6 - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
          md = 8.; for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .6 - f; vec2 dd = r - mr; if (dot(dd, dd) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(dd))); }
          cid = n + mg; return md; }
        void main(){ vec3 rd = normalize(vW - cameraPosition); float ey = max(-rd.y, 1e-3); float t = cameraPosition.y / ey; vec2 w = cameraPosition.xz + rd.xz * t;
          vec2 p = w / .45, cid; float e = vor(p, cid); float pw = max(length(fwidth(p)), 1e-6), vis = smoothstep(10., 30., 1. / pw); float joint = (1. - smoothstep(.04, .04 + 1.6 * pw, e)) * vis;
          vec3 stone = mix(vec3(.34, .27, .24), vec3(.62, .5, .42), .5 + .5 * h1(cid)); float warm = exp(-t * .06);
          vec3 col = mix(stone, vec3(.1, .07, .07), joint) * (.45 + .9 * exp(-abs(w.x) * .18)); col = pow(col, vec3(2.2)); float f = 1. - exp(-pow(t * uFogD, 2.)); gl_FragColor = vec4(mix(col, uFogCol, f), 1.); }`,
    }))); ground.frustumCulled = false; scene.add(ground);
    // houses either side, tall and close, with terracotta roofs
    const hs = []; for (const side of [-1, 1]) for (let z = 80; z > ZEND - 140;) { const w = R.range(6, 10), d = R.range(7, 10), h = R.range(7, 12); hs.push({ x: side * (5.8 + d / 2), z: z - w / 2, w, d, h, side, c: ['#d8d0c0', '#c8d4c0', '#d8c4a8', '#b8c4d4', '#d8c0b8'][R.int(0, 4)] }); z -= w + R.range(0.1, 0.8); }
    const hm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ map: facT, color: '#9a8aa0' })), hs.length), rm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ color: '#6a3a30' })), hs.length);
    hs.forEach((o, i) => { _q.identity(); _p.set(o.x, o.h / 2, o.z); _s.set(o.d, o.h, o.w); hm.setMatrixAt(i, _m.compose(_p, _q, _s)); hm.setColorAt(i, _c.set(o.c)); _p.set(o.x - o.side * 0.3, o.h + 0.2, o.z); _s.set(o.d + 1.2, 0.4, o.w + 0.8); rm.setMatrixAt(i, _m.compose(_p, _q, _s)); });
    hm.frustumCulled = rm.frustumCulled = false; scene.add(hm, rm);
    // the table: a gingham cloth the whole length of the street
    const tc = mkCanvas(128); { const g = tc.getContext('2d'); g.fillStyle = '#f4ecdc'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(196,60,50,0.55)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 16, 128); g.fillRect(0, i * 32, 128, 16); } }
    const tt = own(new THREE.CanvasTexture(tc)); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(4, 160); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 8;
    const cloth = new THREE.Mesh(own(new THREE.BoxGeometry(2.1, 0.08, 220)), own(new THREE.MeshBasicMaterial({ map: tt, color: '#a89c9c' }))); cloth.position.set(0, 0.76, ZEND - 40 + 110); scene.add(cloth);
    const skirt = new THREE.Mesh(own(new THREE.BoxGeometry(2.14, 0.7, 220)), own(new THREE.MeshBasicMaterial({ map: tt, color: '#b8a8a8' }))); skirt.position.set(0, 0.4, ZEND - 40 + 110); scene.add(skirt);
    // seats and diners
    const SP = 1.12, seats = []; for (let z = 18; z > ZEND + 6; z -= SP) for (const sgn of [-1, 1]) seats.push({ z: z + R.range(-0.08, 0.08), sgn, sh: R.int(0, 7), sk: R.int(0, 4), hr: R.int(0, 4), ph: R.range(0, 6.28), toast: R.range(0, 0.6) });
    const SH = ['#c4483a', '#2f5a8a', '#e0c050', '#4a8a5a', '#8a4a7a', '#e8e0d0', '#d8844a', '#3a3a4a'], SK = ['#f0c8a0', '#d8a070', '#b07850', '#8a5a3c', '#f4d4b8'], HR = ['#1a1410', '#4a3020', '#8a8078', '#2a1a10', '#c09050'];
    const N = seats.length, torso = new THREE.InstancedMesh(own(new THREE.CapsuleGeometry(0.24, 0.42, 4, 8)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), N), head = new THREE.InstancedMesh(own(new THREE.SphereGeometry(0.15, 10, 8)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), N), hair = new THREE.InstancedMesh(own(new THREE.SphereGeometry(0.16, 10, 6, 0, 6.2832, 0, 1.7)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), N), arms = new THREE.InstancedMesh(own(new THREE.CapsuleGeometry(0.065, 0.46, 3, 6)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), N * 2);
    seats.forEach((o, i) => { torso.setColorAt(i, _c.set(SH[o.sh]).multiplyScalar(0.8)); head.setColorAt(i, _c.set(SK[o.sk]).multiplyScalar(0.85)); hair.setColorAt(i, _c.set(HR[o.hr])); arms.setColorAt(i * 2, _c.set(SH[o.sh]).multiplyScalar(0.8)); arms.setColorAt(i * 2 + 1, _c.set(SH[o.sh]).multiplyScalar(0.8)); });
    for (const o of [torso, head, hair, arms]) { o.frustumCulled = false; scene.add(o); }
    // dishes by course
    const items = { plate: [], bread: [], olive: [], cheese: [], bowl: [], pasta: [], cake: [], cream: [], glass: [], bottle: [] };
    seats.forEach((o, i) => { const x = o.sgn * 0.62, z = o.z; items.plate.push([x, 0.81, z, 1]); const zone = z > -20 ? 0 : z > -62 ? 1 : z > -118 ? 2 : 3;
      if (zone === 0) { items.bread.push([x + o.sgn * 0.2, 0.86, z - 0.2, 1]); if (i % 2) items.olive.push([x - o.sgn * 0.1, 0.85, z + 0.25, 1]); else items.cheese.push([x, 0.86, z, 1]); }
      if (zone === 1) { items.bowl.push([x, 0.83, z, 1]); items.pasta.push([x, 0.9, z, 1]); }
      if (zone === 2) { items.cake.push([x, 0.85, z, 1]); items.cream.push([x, 0.9, z, 1]); }
      items.glass.push([o.sgn * 0.88, 0.88, z + 0.25, 1]); if (i % 5 === 0) items.bottle.push([o.sgn * 0.5, 0.9, z + 0.4, 1]); });
    const mk = (geo, col, list) => { if (!list.length) return null; const m = new THREE.InstancedMesh(own(geo), own(new THREE.MeshBasicMaterial({ color: col })), list.length); list.forEach((a, i) => { _q.identity(); _p.set(a[0], a[1], a[2]); _s.set(1, 1, 1); m.setMatrixAt(i, _m.compose(_p, _q, _s)); }); m.frustumCulled = false; scene.add(m); return m; };
    mk(new THREE.CylinderGeometry(0.2, 0.17, 0.025, 14), '#f4f0e8', items.plate); mk(new THREE.SphereGeometry(0.1, 8, 6).scale(1.5, 0.7, 0.8), '#b86a30', items.bread); mk(new THREE.SphereGeometry(0.07, 7, 5), '#4a5a28', items.olive); mk(new THREE.BoxGeometry(0.14, 0.05, 0.1), '#f0cc58', items.cheese);
    mk(new THREE.SphereGeometry(0.15, 10, 6, 0, 6.2832, 1.57, 1.57), '#f4f0e8', items.bowl); mk(new THREE.SphereGeometry(0.12, 9, 6).scale(1, 0.6, 1), '#f0c850', items.pasta); mk(new THREE.CylinderGeometry(0.1, 0.11, 0.07, 12), '#6a3a28', items.cake); mk(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 12).translate(0, 0.045, 0), '#fff4e8', items.cream);
    mk(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 8), '#e8dcd0', items.glass); mk(new THREE.CylinderGeometry(0.045, 0.05, 0.26, 8), '#2c5a38', items.bottle);
    // festoon bulbs on wires over the street, candle glows on the table
    const bulbs = []; const bm = own(new THREE.SpriteMaterial({ map: glowT, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); const wp = [];
    for (let z = 24; z > ZEND - 60; z -= 7) { for (let k = 0; k <= 12; k++) { const a = k / 12, x = lerp(-6.2, 6.2, a), y = 6.6 - 1.2 * Math.sin(a * Math.PI); if (k > 0) wp.push(pxp, pyp, pzp, x, y, z); var pxp = x, pyp = y, pzp = z; if (k % 2 === 1) { const sp = new THREE.Sprite(bm); sp.scale.set(0.9, 0.9, 1); sp.position.set(x, y - 0.12, z); scene.add(sp); bulbs.push(sp); } } pxp = -6.2; }
    const wg = own(new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); scene.add(new THREE.LineSegments(wg, own(new THREE.LineBasicMaterial({ color: '#2a2024' }))));
    for (let z = 16; z > ZEND; z -= 4.4) { const sp = new THREE.Sprite(bm); sp.scale.set(0.7, 0.7, 1); sp.position.set(0, 0.95, z); scene.add(sp); bulbs.push(sp); }
    { const c = mkCanvas(256), g = c.getContext('2d'), rg = g.createRadialGradient(128, 128, 20, 128, 128, 126); rg.addColorStop(0, '#fff2d8'); rg.addColorStop(0.88, '#f0d8b0'); rg.addColorStop(1, 'rgba(240,216,176,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(170,140,110,${R.range(0.05, 0.13)})`; g.beginPath(); g.arc(128 + R.range(-70, 70), 128 + R.range(-70, 70), R.range(8, 26), 0, 6.2832); g.fill(); }
      const mt = own(new THREE.CanvasTexture(c)); mt.colorSpace = THREE.SRGBColorSpace; const moon = new THREE.Mesh(own(new THREE.PlaneGeometry(220, 220)), own(new THREE.MeshBasicMaterial({ map: mt, transparent: true, fog: false, depthWrite: false, opacity: 0.95 }))); moon.position.set(-30, 70, ZEND - 380); scene.add(moon); }
    // the hero bowl of pasta, its steam, and the strand that is pulled up into the night
    const bowl = new THREE.Group(); { const mat = own(new THREE.MeshBasicMaterial({ color: '#c8683a' })); const b = new THREE.Mesh(own(new THREE.SphereGeometry(0.62, 16, 10, 0, 6.2832, 1.4, 1.74)), mat); bowl.add(b); const pm = new THREE.Mesh(own(new THREE.SphereGeometry(0.55, 14, 8).scale(1, 0.62, 1)), own(new THREE.MeshBasicMaterial({ color: '#f4c850' }))); pm.position.y = 0.04; bowl.add(pm); const sa = new THREE.Mesh(own(new THREE.SphereGeometry(0.3, 10, 6).scale(1, 0.5, 1)), own(new THREE.MeshBasicMaterial({ color: '#c8302a' }))); sa.position.y = 0.3; bowl.add(sa); scene.add(bowl); }
    const SN = 80, stp = new Float32Array(SN * 3), stc = new Float32Array(SN * 3), sg = own(new THREE.BufferGeometry()); sg.setAttribute('position', new THREE.BufferAttribute(stp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(stc, 3));
    const steam = new THREE.Points(sg, own(new THREE.PointsMaterial({ map: glowT, size: 0.55, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); steam.frustumCulled = false; scene.add(steam);
    const BN = 90, strand = new THREE.InstancedMesh(own(new THREE.SphereGeometry(0.07, 6, 4).scale(1, 1, 1.9)), own(new THREE.MeshBasicMaterial({ color: '#ffd860' })), BN); strand.frustumCulled = false; strand.visible = false; scene.add(strand);
    await tick();
    const arm = (sx, sy, sz, dir, k) => { _p.set(sx + dir.x * 0.23, sy + dir.y * 0.23, sz + dir.z * 0.23); _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); _s.set(1, 1, 1); return _m.compose(_p, _q, _s); };
    const dR = new THREE.Vector3(), dU = new THREE.Vector3(), dM = new THREE.Vector3(), bowlP = new THREE.Vector3();
    return {
      scene, path, duration: DUR, title: 'The Table That Runs Through the Village', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 66, near: 0.2, nearThrough: 0.4, far: 1500, lookAhead: 8, sway: 0, bank: 0.02 },
      pois: [],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#f4e8c8', veil: '#f4e8c8', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.16, radius: 0.45, threshold: 0.9 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#fff0e0', shadowTint: '#180c30', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        const toast = smoothstep(12.8, 14.2, T);
        // the bowl rides just ahead of the camera, a little above it, and climbs with it at the end
        bowlP.set(0.15 * Math.sin(t * 1.3), cp.y + 0.62 + 0.1 * Math.sin(t * 2.1) + 0.5 * toast, cp.z - 9.5 - 2.2 * toast); bowl.position.copy(bowlP); bowl.rotation.y = t * 0.6; bowl.rotation.z = 0.05 * Math.sin(t * 1.5);
        for (let i = 0; i < N; i++) {
          const o = seats[i], x = o.sgn * 1.55, sway = 0.025 * Math.sin(t * 1.2 + o.ph);
          _q.identity(); _p.set(x + sway, 1.02, o.z); _s.set(1, 1, 1); torso.setMatrixAt(i, _m.compose(_p, _q, _s));
          const turn = 0.5 * Math.sin(t * 0.5 + o.ph) + 0.4 * o.sgn * 0; _e.set(0.08 * Math.sin(t * 0.9 + o.ph), turn, 0); _q.setFromEuler(_e); _p.set(x + sway, 1.58 + 0.01 * Math.sin(t * 3 + o.ph), o.z); head.setMatrixAt(i, _m.compose(_p, _q, _s)); hair.setMatrixAt(i, _m.compose(_p, _q, _s));
          const dz = o.z - bowlP.z, near = smoothstep(2.6, 0.4, Math.abs(dz)), up = Math.max(near * (1 - toast), toast * (0.7 + 0.3 * Math.sin(t * 4 + o.ph)) * (o.toast > 0.3 ? 1 : 0.6));
          for (let s = 0; s < 2; s++) { const side = s ? 1 : -1, sx = x - o.sgn * 0.12 + side * 0 + (s ? 0.18 : -0.18) * 0 + (s ? 0.2 : -0.2) * 0, sy = 1.32, sz = o.z + (s ? 0.2 : -0.2); dR.set(-o.sgn * 0.55, -0.48, 0.0 + side * 0.15).normalize(); dU.set(-o.sgn * 0.3, 0.8, (bowlP.z - o.z) * 0.12).normalize(); dM.copy(dR).lerp(dU, up).normalize(); arms.setMatrixAt(i * 2 + s, arm(sx - o.sgn * 0.14, sy, sz, dM)); }
        }
        for (const o of [torso, head, hair, arms]) o.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < SN; i++) { const a = ((t * 0.5 + i * 0.137) % 1); stp[i * 3] = bowlP.x + 0.25 * Math.sin(a * 9 + i) ; stp[i * 3 + 1] = bowlP.y + 0.35 + a * 1.4; stp[i * 3 + 2] = bowlP.z + 0.25 * Math.cos(a * 7 + i); const f = (1 - a) * 0.4; stc[i * 3] = f; stc[i * 3 + 1] = f * 0.96; stc[i * 3 + 2] = f * 0.92; }
        sg.attributes.position.needsUpdate = true; sg.attributes.color.needsUpdate = true;
        // the strand: a golden thread that leaves the bowl, spirals, and climbs toward the moon
        const L = smoothstep(13.6, 16.2, T); strand.visible = L > 0.01;
        if (strand.visible) for (let i = 0; i < BN; i++) { const a = i / (BN - 1) * L, h = a * 36, ang = a * 20 - t * 1.5, rad = 0.35 + a * 0.5; _p.set(bowlP.x + Math.cos(ang) * rad * a * 2.5, bowlP.y + 0.3 + h, bowlP.z - a * 20 + Math.sin(ang) * rad * 0.5); _e.set(1.0, ang, 0); _q.setFromEuler(_e); _s.setScalar(1); strand.setMatrixAt(i, _m.compose(_p, _q, _s)); }
        strand.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < bulbs.length; i += 1) { const b = bulbs[i]; const k = 0.82 + 0.18 * Math.sin(t * 2.3 + i * 1.7); b.material === bm; b.scale.setScalar((b.position.y > 3 ? 0.9 : 0.7) * k); }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
