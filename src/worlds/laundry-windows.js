// THE LAUNDRY WINDOWS: a narrow Naples alley at golden hour, strung with washing. You walk up it, and every sheet you pass through is a
// window onto a world you have already been to (the red forest, the salt flats, the dye vats, the ice, the fish rain), painted on the cloth
// and glowing as the sun comes through it. You rise past the clothes lines to the rooftops, with Vesuvius smoking in the haze, and pass
// through the last sheet, the one with the glowing ring on it.
// The camera moves at constant speed, so the alley is laid out by distance: z = 14 - 5 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, pathFrom, skyFor } from '../kit/mine.js';

const DUR = 20, V = 5, WALL = 2.9;
const camY = (T) => 1.6 + 14.2 * sm(Math.min(1, Math.max(0, (T - 8) / 9.2)));
const camAt = (T) => [0.35 * Math.sin(T * 0.7), camY(T), 14 - V * T];
const ZEND = 14 - V * DUR;
const SHEETS = [2.4, 5.1, 7.8, 10.5, 13.4, 16.6];

const paint = (g, W, H, k) => {
  const lin = (c0, c1, y0 = 0, y1 = H) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, c0); q.addColorStop(1, c1); g.fillStyle = q; };
  if (k === 0) { lin('#6a3a78', '#f4a8c0'); g.fillRect(0, 0, W, H); g.fillStyle = '#ffd0e0'; g.beginPath(); g.arc(W * 0.55, H * 0.3, W * 0.2, 0, 6.28); g.fill(); g.fillStyle = '#3a1a2e'; for (let i = 0; i < 7; i++) { const x = 20 + i * 38; g.fillRect(x, H * 0.2, 9 + (i % 3) * 4, H); } g.fillStyle = '#c04058'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(R0(W), 10 + R0(H * 0.3), 14 + R0(26), 0, 6.28); g.fill(); } }
  if (k === 1) { lin('#6aa8e8', '#f6d8c8', 0, H * 0.5); g.fillRect(0, 0, W, H * 0.5); g.save(); g.translate(0, H); g.scale(1, -1); g.globalAlpha = 0.85; g.fillRect(0, 0, W, H * 0.5); g.restore(); g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 40; i++) g.fillRect(R0(W), H * 0.52 + R0(H * 0.45), 8 + R0(30), 2); g.fillStyle = '#2a2430'; g.fillRect(W * 0.5, H * 0.43, 4, 20); g.beginPath(); g.arc(W * 0.5 + 2, H * 0.41, 4, 0, 6.28); g.fill(); }
  if (k === 2) { lin('#4a78ac', '#f4c898'); g.fillRect(0, 0, W, H); const cols = ['#c0482a', '#2a6ab0', '#e8b838', '#4a8a5a', '#8a4a7a']; for (let i = 0; i < 9; i++) { g.fillStyle = '#3a2a22'; const x = 30 + (i % 3) * 78, y = H * 0.45 + Math.floor(i / 3) * 70; g.beginPath(); g.arc(x, y, 34, 0, 6.28); g.fill(); g.fillStyle = cols[i % 5]; g.beginPath(); g.arc(x, y, 28, 0, 6.28); g.fill(); } g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(40 + i * 50, 60 + (i % 2) * 30, 8, 3, 0.3, 0, 6.28); g.fill(); } }
  if (k === 3) { lin('#0b2e55', '#2a8ab0'); g.fillRect(0, 0, W, H); g.fillStyle = '#d8eaf0'; g.fillRect(0, 0, W, 34); const pc = ['#ff9ac0', '#9affc0', '#ffee80', '#8ac8ff']; for (let c = 0; c < 6; c++) for (let j = 0; j < 9; j++) { g.fillStyle = pc[(c + j) % 4]; g.beginPath(); g.ellipse(30 + c * 42, 52 + j * 26, 16 - j * 0.5, 5, 0, 0, 6.28); g.fill(); } g.fillStyle = '#ff7a3a'; g.beginPath(); g.ellipse(W * 0.6, H * 0.7, 26, 9, 0.2, 0, 6.28); g.fill(); }
  if (k === 4) { lin('#1f2a58', '#6a5a90'); g.fillRect(0, 0, W, H); g.fillStyle = '#e8d8ff'; g.beginPath(); g.arc(W * 0.5, H * 0.28, W * 0.18, 0, 6.28); g.fill(); g.strokeStyle = 'rgba(210,225,255,0.8)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = R0(W), y = R0(H * 0.7); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 22); g.stroke(); } g.fillStyle = '#14102a'; g.fillRect(0, H * 0.8, W, H); g.fillStyle = '#ffcf80'; for (let i = 0; i < 6; i++) g.fillRect(10 + i * 44, H * 0.82, 14, 18); }
  if (k === 5) { const rg = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.8); rg.addColorStop(0, '#fff8e0'); rg.addColorStop(1, '#e0a060'); g.fillStyle = rg; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 12; g.beginPath(); g.arc(W / 2, H / 2, W * 0.28, 0, 6.28); g.stroke(); g.strokeStyle = 'rgba(255,230,170,0.7)'; g.lineWidth = 28; g.stroke(); }
};
let R0 = (n) => Math.random() * n;

export default {
  id: 'laundry-windows',
  name: 'The Laundry Windows',
  category: 'wilderness',
  weirdness: 0.65,
  media: ['city', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; }; R0 = (n) => R() * n;
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 48); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'goldenHour', sky: { zenith: '#3a6ab8', mid: '#9ab8d8', horizon: '#ffd8a8', ground: '#d8b090', horizonPow: 2.4, clouds: { coverage: 0.25, lit: '#fff0d8', shade: '#c8a8a0', silver: 0 } } });
    const FOGC = new THREE.Color('#e8c0a0'); scene.fog = new THREE.FogExp2(FOGC, 0.0075); scene.background = new THREE.Color('#9ab8d8');
    await tick();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    const wrapBlob = (g, S, x, y, r, style) => { g.fillStyle = style; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } };
    const facC = mkCanvas(256); { const g = facC.getContext('2d'), S = 256; g.fillStyle = '#e4cfae'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 160; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(6, 30), R() < 0.5 ? `rgba(150,100,70,${R.range(0.05, 0.14)})` : `rgba(255,245,220,${R.range(0.06, 0.14)})`);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const x = 36 + c * 112, y = 16 + r * 80; g.fillStyle = '#34281e'; g.fillRect(x, y, 44, 58); g.fillStyle = '#4a8a68'; g.fillRect(x - 12, y, 12, 58); g.fillRect(x + 44, y, 12, 58); g.fillStyle = 'rgba(255,220,160,0.5)'; g.fillRect(x + 4, y + 4, 36, 18); g.fillStyle = '#2a2a2a'; g.fillRect(x - 10, y + 58, 64, 5); }
      const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(255,230,190,0)'); gr.addColorStop(1, 'rgba(60,30,40,0.45)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
    const facT = own(new THREE.CanvasTexture(facC)); facT.wrapS = facT.wrapT = THREE.RepeatWrapping; facT.colorSpace = THREE.SRGBColorSpace; facT.anisotropy = 4;
    const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2)), own(new THREE.ShaderMaterial({
      uniforms: { uFogCol: { value: FOGC.clone() }, uFogD: { value: 0.0075 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uFogD; uniform vec3 uFogCol; varying vec3 vW;
        vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vor(vec2 x, out vec2 cid){ vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .6 - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
          md = 8.; for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .6 - f; vec2 dd = r - mr; if (dot(dd, dd) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(dd))); }
          cid = n + mg; return md; }
        void main(){ vec3 rd = normalize(vW - cameraPosition); float ey = max(-rd.y, 1e-3); float t = cameraPosition.y / ey; vec2 w = cameraPosition.xz + rd.xz * t;
          vec2 p = w / .4, cid; float e = vor(p, cid); float pw = max(length(fwidth(p)), 1e-6), vis = smoothstep(10., 30., 1. / pw); float joint = (1. - smoothstep(.04, .04 + 1.6 * pw, e)) * vis;
          vec3 stone = mix(vec3(.5, .44, .42), vec3(.78, .68, .6), .5 + .5 * h1(cid)); vec3 col = mix(stone, vec3(.18, .14, .14), joint) * (.5 + .7 * exp(-abs(w.x) * .12)); col = pow(col, vec3(2.2)); float f = 1. - exp(-pow(t * uFogD, 2.)); gl_FragColor = vec4(mix(col, uFogCol, f), 1.); }`,
    }))); ground.frustumCulled = false; scene.add(ground);
    // buildings along the alley, and a town of rooftops beyond them to rise over
    const hs = []; for (const side of [-1, 1]) for (let z = 50; z > ZEND - 90;) { const w = R.range(5, 8.5), d = R.range(6, 9), h = R.range(10.5, 13.5); hs.push({ x: side * (WALL + d / 2), z: z - w / 2, w, d, h, side, c: ['#f0dcc0', '#e8c8b8', '#d8d4b8', '#e8d0c8', '#cfd8c0', '#f0d8a8'][R.int(0, 5)] }); z -= w + R.range(0, 0.4); }
    for (let i = 0; i < 160; i++) { const side = R() < 0.5 ? -1 : 1, d = R.range(6, 10), x = side * (WALL + 9 + R.range(0, 120)), h = R.range(9, 15), z = R.range(60, ZEND - 300); hs.push({ x, z, w: R.range(7, 12), d, h, side, c: ['#f0dcc0', '#e8c8b8', '#d8d4b8', '#e8d0c8', '#cfd8c0'][R.int(0, 4)] }); }
    const hm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ map: facT, color: '#ffffff' })), hs.length), rm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ color: '#b8603a' })), hs.length);
    hs.forEach((o, i) => { _q.identity(); _p.set(o.x, o.h / 2, o.z); _s.set(o.d, o.h, o.w); hm.setMatrixAt(i, _m.compose(_p, _q, _s)); hm.setColorAt(i, _c.set(o.c)); _p.set(o.x - o.side * 0.2, o.h + 0.2, o.z); _s.set(o.d + 0.8, 0.5, o.w + 0.6); rm.setMatrixAt(i, _m.compose(_p, _q, _s)); });
    hm.frustumCulled = rm.frustumCulled = false; scene.add(hm, rm);
    // Vesuvius in the haze
    { const vg = own(new THREE.ConeGeometry(520, 330, 7, 1, true)); const v = new THREE.Mesh(vg, own(new THREE.MeshBasicMaterial({ color: '#8a78a8' }))); v.position.set(300, 150, ZEND - 1100); scene.add(v); const gC = mkCanvas(64); const g = gC.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,230,210,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); const gT = own(new THREE.CanvasTexture(gC)); gT.colorSpace = THREE.SRGBColorSpace; const pm = own(new THREE.SpriteMaterial({ map: gT, transparent: true, depthWrite: false, opacity: 0.55 })); for (let i = 0; i < 14; i++) { const sp = new THREE.Sprite(pm); const sc = 90 + i * 24; sp.scale.set(sc, sc * 0.8, 1); sp.position.set(300 + i * 26, 330 + i * 40, ZEND - 1100); scene.add(sp); } }
    // washing lines across the alley with clothes on them
    const CN = 520, cl = new THREE.InstancedMesh(own(new THREE.PlaneGeometry(0.55, 0.7)), own(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })), CN), lines = []; let ci = 0; const lp = [];
    const CC = ['#f4f0e8', '#d8483a', '#2a6ab0', '#e8c038', '#4a9a5a', '#e888a8', '#f4f0e8', '#8a5aa8'];
    for (let z = 22; z > ZEND - 20; z -= 3.4) { const y = R.range(4.6, 11.5), n = R.int(3, 6); lp.push(-WALL, y + 0.1, z, WALL, y + 0.1, z); for (let k = 0; k < n && ci < CN; k++) { const x = lerp(-WALL + 0.5, WALL - 0.5, (k + 0.5) / n); lines.push({ x, y: y - 0.3, z, ph: R.range(0, 6.28), i: ci }); cl.setColorAt(ci, _c.set(CC[R.int(0, 7)])); ci++; } }
    cl.count = ci; cl.frustumCulled = false; scene.add(cl);
    const lg = own(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); scene.add(new THREE.LineSegments(lg, own(new THREE.LineBasicMaterial({ color: '#4a3a32' }))));
    // the sheets: each one a window onto a world already visited
    const sheets = SHEETS.map((Tk, k) => {
      const c = mkCanvas(256); c.height = 384; paint(c.getContext('2d'), 256, 384, k); const tex = own(new THREE.CanvasTexture(c)); tex.colorSpace = THREE.SRGBColorSpace;
      const cy = camY(Tk) + 0.5, H = 7.4, Wd = WALL * 2 - 0.1;
      const mat = own(new THREE.ShaderMaterial({ side: THREE.DoubleSide, transparent: false, uniforms: { uTex: { value: tex }, uTime: { value: 0 }, uBil: { value: 0 }, uK: { value: k } },
        vertexShader: 'varying vec2 vU; varying float vF; uniform float uTime, uBil; void main(){ vU = uv; vec3 p = position; float edge = 1. - pow(abs(uv.x * 2. - 1.), 2.); float w = sin(uv.y * 5. + uTime * 1.6 + uv.x * 4.) * .16 + sin(uv.x * 9. - uTime * 2.1) * .05; p.z += w * (.3 + .7 * (1. - uv.y)) + uBil * edge * 1.1; vF = w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
        fragmentShader: 'uniform sampler2D uTex; uniform float uBil; varying vec2 vU; varying float vF; void main(){ vec3 c = texture2D(uTex, vU).rgb; float fold = .88 + 1.2 * vF; float glow = 1.15 + .35 * uBil; float edge = smoothstep(0., .05, vU.x) * smoothstep(1., .95, vU.x); c = c * fold * glow * (.75 + .25 * edge) + vec3(.06, .04, .02); gl_FragColor = vec4(c, 1.); }' }));
      { const z = 14 - V * Tk, ty = cy + H / 2, rg = own(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.Float32BufferAttribute([-WALL, ty + 1.3, z, -Wd / 2, ty, z, Wd / 2, ty, z, WALL, ty + 1.3, z, -Wd / 2, ty, z, Wd / 2, ty, z], 3)); scene.add(new THREE.LineSegments(rg, own(new THREE.LineBasicMaterial({ color: '#4a3a32' })))); }
      const m = new THREE.Mesh(own(new THREE.PlaneGeometry(Wd, H, 24, 36)), mat); m.position.set(0, cy, 14 - V * Tk); m.frustumCulled = false; scene.add(m); return { m, mat, Tk };
    });
    await tick();
    return {
      scene, path, duration: DUR, title: 'The Laundry Windows', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 68, near: 0.2, nearThrough: 0.4, far: 3000, lookAhead: 8, sway: 0, bank: 0.03 },
      pois: [],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#fff0c8', veil: '#fff0c8', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.14, radius: 0.45, threshold: 0.94 }, grade: { saturation: 1.1, contrast: 1.05, tint: '#fff2e0', shadowTint: '#3a2a50', vignette: 0.2, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        for (const s of sheets) { s.mat.uniforms.uTime.value = t; const dz = cp.z - s.m.position.z; s.mat.uniforms.uBil.value = smoothstep(9, 0.5, Math.abs(dz)) * (dz > 0 ? 1 : 0.4); }
        for (const l of lines) { _e.set(0, 0, 0.12 * Math.sin(t * 1.4 + l.ph)); _q.setFromEuler(_e); _p.set(l.x, l.y, l.z); _s.set(1, 1, 1); cl.setMatrixAt(l.i, _m.compose(_p, _q, _s)); }
        cl.instanceMatrix.needsUpdate = true;
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
