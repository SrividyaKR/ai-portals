// THE WATER THAT NEVER LANDS: you run down a river on top of a Venezuelan tepui and go over the lip with the water. Angel Falls is so tall
// that its water turns to mist before it reaches the ground, so you fall inside a roaring column of spray that thins to a white-out, break
// out of the cloud over the jungle, and skim the canopy while the mist rises behind you and a rainbow stands over a small glowing ring.
// T = seconds of flight (progress) drives the fall; the clock drives the foam and the drifting mist.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, ridged, pathFrom, makeTerrain, skyFor } from '../kit/mine.js';

const DUR = 20, LIP = -74, JUMP = 3.2, BOT = 112, SPD = 60;
// The engine flies a path at constant speed, so the camera is built by integrating a heading at SPD m/s: a run along the river, a
// quarter-turn over the lip into a near-vertical fall, then a pull-out into a level skim. TOP (the tepui's height) falls out of the integral.
const ANG = (T) => 1.43 * (sm(Math.min(1, Math.max(0, (T - JUMP) / 1.6))) * (1 - sm(Math.min(1, Math.max(0, (T - 9.2) / 2.3)))));
const SIM = (() => { const N = Math.round(DUR / 0.01), P = new Float32Array((N + 1) * 3); let y = 0, z = 0; for (let i = 0; i <= N; i++) { const T = i * 0.01; P[i * 3] = 0; P[i * 3 + 1] = y; P[i * 3 + 2] = z; const a = ANG(T); y -= SPD * Math.sin(a) * 0.01; z -= SPD * Math.cos(a) * 0.01; } return P; })();
const TOP = BOT + 0 - SIM[(Math.round(DUR / 0.01)) * 3 + 1] * 1;   // plateau height so the pull-out ends at BOT
const Z0 = LIP - 2 - SIM[Math.round(JUMP / 0.01) * 3 + 2];             // start z so the lip lands at the jump time
const camAt = (T) => { const f = Math.min(DUR, Math.max(0, T)) / 0.01, i = Math.floor(f), w = f - i, j = Math.min(i + 1, Math.round(DUR / 0.01)); const g = (k) => lerp(SIM[i * 3 + k], SIM[j * 3 + k], w); return [2.2 * Math.sin(T * 0.7) * (T < JUMP ? 1 : 1 + 2 * smoothstep(JUMP, JUMP + 3, T)) + 55 * Math.sin((T - 11) * 0.55) * smoothstep(11, 13.5, T), TOP + g(1), Z0 + g(2)]; };
const BUTTES = [[-420, -520, 130], [380, -760, 110], [-300, -1000, 150], [460, -1250, 120], [-560, -300, 100]];
const hLand = (x, z) => {
  let j = 60 + 55 * fbm(x * 0.006, z * 0.006, 4) + 7 * fbm(x * 0.03, z * 0.03, 3) + 9 * fbm(x * 0.13, z * 0.13, 2);
  for (const b of BUTTES) { const d = Math.hypot(x - b[0], z - b[1]); j = Math.max(j, lerp(j, 520 + 40 * fbm(x * 0.02, z * 0.02, 2), smoothstep(b[2] + 30, b[2] - 6, d))); }
  const mp = smoothstep(LIP - 5, LIP + 3, z) * (1 - smoothstep(330, 345, Math.abs(x)));
  return lerp(j, TOP - 3 + 3 * fbm(x * 0.05, z * 0.05, 3), mp);
};

export default {
  id: 'angel-falls-drop',
  name: 'The Water That Never Lands',
  category: 'wilderness',
  weirdness: 0.6,
  media: ['air', 'water'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 60); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'day', sky: { zenith: '#2a74c8', mid: '#72b0e0', horizon: '#e8f4ee', ground: '#a8c8b8', horizonPow: 2.6, clouds: { coverage: 0.5, lit: '#ffffff', shade: '#a8bccc', silver: 0 } } });
    const FOGC = new THREE.Color('#d4e8e2'), WHITE = new THREE.Color('#f2f8f6'), fogNow = new THREE.Color();
    scene.fog = new THREE.FogExp2(FOGC.clone(), 0.0011); scene.background = new THREE.Color('#72b0e0');
    await tick();
    const ochre = new THREE.Color('#b88458'), ochre2 = new THREE.Color('#8a5a3c'), moss = new THREE.Color('#34522c'), rust = new THREE.Color('#8e4a32'), stain = new THREE.Color('#3a2a26'), g1 = new THREE.Color('#14341c'), g2 = new THREE.Color('#3a7430'), g3 = new THREE.Color('#2e6a40'), foam = new THREE.Color('#eef8fa'), wat = new THREE.Color('#5aa4b0'), river = new THREE.Color('#7a6a4a'), tmp = new THREE.Color(), shc = new THREE.Color('#2a3a5a');
    const terr = makeTerrain({
      size: 1800, seg: 380, cx: 0, cz: -380, heightFn: hLand, own, sun: [-0.5, 0.7, -0.4],
      colorFn: (h, lit, slope, x, z, out) => {
        const plateau = h > TOP - 40, steep = smoothstep(0.55, 0.85, slope);
        if (plateau) { out.copy(ochre).lerp(ochre2, fbm(x * 0.07, z * 0.07, 3)); out.lerp(moss, smoothstep(0.55, 0.7, fbm(x * 0.05 + 3, z * 0.05, 4)) * 0.85); const rv = 1 - smoothstep(5, 11, Math.abs(x + 3 * Math.sin(z * 0.04))); out.lerp(wat, rv * 0.85); out.lerp(foam, rv * smoothstep(0.5, 0.72, fbm(x * 0.25, z * 0.035, 3))); }
        else { out.copy(g1).lerp(g2, fbm(x * 0.05, z * 0.05, 4)); out.lerp(g3, 0.4 * fbm(x * 0.15, z * 0.15, 2)); out.lerp(g2, 0.7 * smoothstep(0.5, 0.72, fbm(x * 0.35, z * 0.35, 2))); out.multiplyScalar(0.55 + 0.9 * fbm(x * 0.8, z * 0.8, 2)); const rr = 1 - smoothstep(0.015, 0.05, Math.abs(ridged(x * 0.004, z * 0.004, 3) - 0.62)); out.lerp(river, rr * 0.7 * (h < 200 ? 1 : 0)); }
        tmp.copy(rust).lerp(stain, 0.55 * fbm(x * 0.9, h * 0.04, 2)); tmp.multiplyScalar(0.7 + 0.5 * fbm(x * 0.5, h * 0.015, 3)); out.lerp(tmp, steep);
        out.multiplyScalar(0.3 + 1.05 * lit); out.lerp(shc, (1 - lit) * 0.18); out.multiplyScalar(0.82 + 0.3 * fbm(x * 0.14, z * 0.14, 3));
      },
    });
    { const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#dcdcdc'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const x = R.range(0, 256), y = R.range(0, 256), r = R.range(1.5, 8), v = R.range(70, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.55)})`; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(280, 280); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true; }
    scene.add(terr);
    // the falling water: a sheet of streaks sliding down the cliff face below the lip; it thins to nothing long before the jungle
    const wMat = own(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vW; varying vec2 vU; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uTime; varying vec3 vW; varying vec2 vU;
        float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
        void main(){ float y = vW.y; float n = vn(vec2(vW.x * 1.3, y * 0.03 + uTime * 2.2)), n2 = vn(vec2(vW.x * 4.0 + 7., y * 0.07 + uTime * 3.4)), n3 = vn(vec2(vW.x * 0.5, y * 0.012 + uTime * 1.2));
          float st = smoothstep(0.3, 0.85, n * 0.5 + n2 * 0.35 + n3 * 0.3); float edge = smoothstep(0., .16, vU.x) * smoothstep(1., .84, vU.x);
          float fade = 1. - smoothstep(${(TOP - 230).toFixed(1)}, ${(TOP - 340).toFixed(1)}, y); float a = st * edge * fade * 0.95;
          gl_FragColor = vec4(vec3(.88, .96, 1.) * a, a); }`,
    }));
    const sheet = new THREE.Mesh(own(new THREE.PlaneGeometry(22, TOP - 60, 1, 1)), wMat); sheet.position.set(0, (TOP + 60) / 2, LIP - 1.6); sheet.frustumCulled = false; scene.add(sheet); scene._wm = wMat;
    await tick();
    // river boulders on the tepui, drifting mist banks over the canopy, and the rainbow
    const bo = new THREE.InstancedMesh(own(new THREE.IcosahedronGeometry(1, 1)), own(new THREE.MeshBasicMaterial({ color: '#7a6048' })), 70), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
    for (let i = 0; i < 70; i++) { const z = R.range(40, LIP + 6), sd = R() < 0.5 ? -1 : 1, x = sd * R.range(6, 16) + 3 * Math.sin(z * 0.04), sc = R.range(0.5, 2.2); _p.set(x, hLand(x, z) + sc * 0.2, z); _q.setFromEuler(_e.set(R(), R(), R())); _s.set(sc * 1.3, sc * 0.8, sc); bo.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    bo.frustumCulled = false; scene.add(bo);
    const mC = mkCanvas(128); { const g = mC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,255,255,0.85)'); rg.addColorStop(0.5, 'rgba(240,250,248,0.35)'); rg.addColorStop(1, 'rgba(235,248,245,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const mT = own(new THREE.CanvasTexture(mC)); mT.colorSpace = THREE.SRGBColorSpace;
    const mistM = own(new THREE.SpriteMaterial({ map: mT, transparent: true, depthWrite: false, opacity: 0.8, fog: false })), mists = [];
    for (let i = 0; i < 110; i++) { const sp = new THREE.Sprite(mistM); const sc = R.range(60, 150); sp.scale.set(sc * 1.6, sc * 0.5, 1); { const sx = R() < 0.5 ? -1 : 1; sp.position.set(sx * R.range(60, 300), R.range(20, 70), R.range(-150, -820)); } scene.add(sp); mists.push({ sp, ph: R.range(0, 6.28), y0: sp.position.y }); }
    { const c = mkCanvas(256), g = c.getContext('2d'); const cols = ['#ff5a5a', '#ffb050', '#ffee70', '#70e08a', '#5aa8ff', '#8a70ff']; for (let y = 0; y < 256; y++) { const a = y / 255, i = Math.min(5, Math.floor(a * 6)); g.fillStyle = cols[i]; g.globalAlpha = Math.sin(a * Math.PI) * 0.9; g.fillRect(0, y, 256, 1); }
      const rt = own(new THREE.CanvasTexture(c)); rt.colorSpace = THREE.SRGBColorSpace; const rg = own(new THREE.RingGeometry(380, 440, 96, 1, 0, Math.PI)); const uv = rg.attributes.uv, pp = rg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5, (Math.hypot(pp.getX(i), pp.getY(i)) - 380) / 60);
      const rb = new THREE.Mesh(rg, own(new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }))); rb.position.set(40, BOT - 60, camAt(DUR)[2] - 900); scene.add(rb); scene._rb = rb; }
    // the spray: short white streaks that rush up past you as you fall
    const DN = 1300, dpos = new Float32Array(DN * 6), dcol = new Float32Array(DN * 6), dd = []; for (let i = 0; i < DN; i++) { const a = R.range(0, 6.2832), r = 3 + 20 * Math.sqrt(R()); dd.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: R.range(0, 140), l: R.range(0.6, 1.6) }); }
    const dg = own(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dg.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
    const spray = new THREE.LineSegments(dg, own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); spray.frustumCulled = false; scene.add(spray);
    let ph = 0, lastY = TOP, vy = 0, lastT = 0; await tick();
    return {
      scene, path, duration: DUR, title: 'The Water That Never Lands', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 68, near: 0.3, nearThrough: 0.6, far: 4000, lookAhead: 14, sway: 0, bank: 0.03 },
      pois: [
        { at: (tm, uu) => [0, camAt(Math.max(0, Math.min(1, uu)) * DUR)[1] + 6, LIP - 1], from: 0.2, to: 0.5, fade: 0.2, weight: 1.0 },
        { at: [-420, 480, -520], from: 0.62, to: 0.78, fade: 0.3, weight: 0.8 },
        { at: [380, 480, -760], from: 0.8, to: 0.94, fade: 0.3, weight: 0.8 },
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#e8fff0', veil: '#e8fff0', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.12, radius: 0.45, threshold: 0.95 }, grade: { saturation: 1.1, contrast: 1.05, tint: '#f4fff8', shadowTint: '#0c2a30', vignette: 0.2, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position; sky.update(dt, t, camera);
        if (T < lastT - 0.5) { ph = 0; } lastT = T;
        if (dt > 1e-4) { vy = lerp(vy, (cp.y - lastY) / dt, 1 - Math.exp(-dt * 8)); } lastY = cp.y; if (Math.abs(vy) > 600) vy = 0;
        // the cloud: fog thickens to a white-out as you pass through the mist layer, then clears under it
        const inMist = smoothstep(TOP - 90, TOP - 190, cp.y) * smoothstep(BOT + 40, BOT + 150, cp.y); const fd = 0.0011 + 0.0052 * inMist;
        scene.fog.density = fd; fogNow.copy(FOGC).lerp(WHITE, inMist); scene.fog.color.copy(fogNow); scene.background.copy(fogNow).lerp(tmp.set('#72b0e0'), 1 - inMist);
        // spray falls slower than you, so it streaks upward past the lens; it fades out as the cloud thins it to mist
        ph += dt * Math.max(0, -vy) * 0.6; const on = smoothstep(JUMP - 0.4, JUMP + 0.8, T) * (1 - smoothstep(8.2, 10.4, T)), len = Math.min(7, 0.4 + Math.max(0, -vy) * 0.03);
        for (let i = 0; i < DN; i++) { const d = dd[i], y = ((d.y - ph) % 140 + 140) % 140 - 70, n = i * 6; dpos[n] = cp.x + d.x; dpos[n + 1] = cp.y + y; dpos[n + 2] = cp.z + d.z; dpos[n + 3] = cp.x + d.x; dpos[n + 4] = cp.y + y + len * d.l; dpos[n + 5] = cp.z + d.z; const f = on * (0.1 + 0.28 * (1 - Math.abs(y) / 70)); dcol[n] = f * 0.8; dcol[n + 1] = f * 0.95; dcol[n + 2] = f; dcol[n + 3] = 0; dcol[n + 4] = 0; dcol[n + 5] = 0; }
        dg.attributes.position.needsUpdate = true; dg.attributes.color.needsUpdate = true;
        for (const m of mists) { m.sp.position.y = m.y0 + 5 * Math.sin(t * 0.25 + m.ph); m.sp.position.x += 0.4 * dt; }
        scene._wm.uniforms.uTime.value = t; const rb = scene._rb; rb.material.opacity = 0.32 * smoothstep(14, 18, T);
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
