// THE NIGHT IT RAINED FISH: Yoro, Honduras, where on certain stormy nights fish really do fall from the sky. A flooded cobbled street
// between low plaster houses with lit windows and tin roofs; silver fish drop out of the dark and land in the puddles, flopping and
// ringing the water. A great egret wades down the street after them, and townsfolk hold their umbrellas upside down to catch them.
// Then gravity loses interest: at 9.5 s the fish lift off the cobbles and out of the air and spiral up in a silver river, the egret
// opens its wings and goes after them, and the camera climbs with them toward a small glowing ring beside the moon.
// The street is one shader (cobbles from a jittered-cell network, puddles that mirror the storm and the warm windows).
// Progress T = seconds of flight drives the events; the clock drives the rain and the walking, so it is alive before we arrive.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';

const sm = (s) => s * s * (3 - 2 * s);
const DUR = 20, TR = 9.5;   // the rain turns upward at 9.5 s of flight
const PX = (s) => 3.0 * Math.sin(s * 6.0);
const PY = (s) => 1.35 + 9.5 * Math.pow(sm(Math.max(0, (s - 0.55) / 0.45)), 1.15);
const PZ = (s) => 34 - 150 * s;

export default {
  id: 'fish-rain-night',
  name: 'A Night Walk in the Rain',
  category: 'wilderness',
  weirdness: 0.65,
  media: ['air', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene();
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- the flight: low down the flooded street, then up with the fish ----------
    const pts = [];
    for (let k = 0; k <= 32; k++) { const s = k / 32; pts.push([PX(s), PY(s), PZ(s)]); }
    const path = makePath(pts);
    let PL = 0; { const a0 = new THREE.Vector3(), b0 = new THREE.Vector3(); path.pointAt(0, a0); for (let i = 1; i <= 400; i++) { path.pointAt(i / 400, b0); PL += a0.distanceTo(b0); a0.copy(b0); } }
    await tick();

    // ---------- sky: a storm at night; a pale moon behind it ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'night', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      zenith: '#0a1030', mid: '#1f3358', horizon: '#4a5c80', ground: '#26364e', horizonPow: 2.4,
      scatter: 0, sunIntensity: 0, sunGlow: 0, sunElevation: -12, bodies: [],
      stars: 0.15, milkyWay: 0, clouds: { coverage: 0.9, lit: '#7184b0', shade: '#161a30', silver: 0 }, clouds2: false,
    });
    scene.add(sky.object);
    const FOG = new THREE.Color('#26364e'), FOGD = 0.0075;
    scene.fog = new THREE.FogExp2(FOG, FOGD); scene.background = new THREE.Color('#1f3358');
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    await tick();

    // ---------- textures drawn here ----------
    const mkCanvas = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const wrapBlob = (g, S, x, y, r, style) => {
      g.fillStyle = style;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); }
    };
    const glowC = mkCanvas(128); { const g = glowC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,226,170,0.95)'); rg.addColorStop(0.4, 'rgba(255,190,110,0.3)'); rg.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const glowT = own(new THREE.CanvasTexture(glowC)); glowT.colorSpace = THREE.SRGBColorSpace;
    // facade: plaster, wet streaks, shuttered windows (most with a warm light), a door
    const facC = mkCanvas(256); {
      const g = facC.getContext('2d'), S = 256; g.fillStyle = '#9a96a0'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 170; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(6, 34), R() < 0.5 ? `rgba(60,60,80,${R.range(0.04, 0.12)})` : `rgba(210,206,220,${R.range(0.04, 0.1)})`);
      for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(30,34,50,${R.range(0.05, 0.14)})`; g.fillRect(R.range(0, S), 0, R.range(2, 8), R.range(60, S)); }
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const x = 24 + c * 78, y = 26 + r * 70, lit = R() < 0.65;
        g.fillStyle = lit ? '#e8b668' : '#1a1e2c'; g.fillRect(x, y, 34, 44);
        if (lit) { g.fillStyle = 'rgba(255,230,170,0.5)'; g.fillRect(x + 4, y + 4, 26, 18); }
        g.fillStyle = '#2c3a4a'; g.fillRect(x - 9, y, 8, 44); g.fillRect(x + 35, y, 8, 44); g.fillStyle = '#3a2a22'; g.fillRect(x - 3, y + 44, 40, 5);
      }
      g.fillStyle = '#3a2a22'; g.fillRect(104, 176, 50, 80); g.fillStyle = 'rgba(232,182,104,0.5)'; g.fillRect(112, 184, 34, 26);
    }
    const facT = own(new THREE.CanvasTexture(facC)); facT.wrapS = facT.wrapT = THREE.RepeatWrapping; facT.colorSpace = THREE.SRGBColorSpace; facT.anisotropy = 4;
    await tick();

    // ---------- the street: cobbles from a jittered-cell network, puddles that mirror the storm and the warm windows ----------
    const groundMat = own(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFogCol: { value: FOG.clone() }, uFogD: { value: FOGD } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime, uFogD; uniform vec3 uFogCol; varying vec3 vW;
        vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
        float vor(vec2 x, out vec2 cid){
          vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .6 - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
          md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .6 - f; vec2 dd = r - mr; if (dot(dd, dd) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(dd))); }
          cid = n + mg; return md;
        }
        vec3 skyCol(float e){ vec3 H = vec3(.45, .52, .68), M = vec3(.22, .30, .50), Z = vec3(.08, .11, .24); vec3 c = mix(H, M, smoothstep(0., .3, e)); return mix(c, Z, smoothstep(.25, .9, e)); }
        void main(){
          vec3 rd = normalize(vW - cameraPosition); float ey = max(-rd.y, 1e-3); float t = cameraPosition.y / ey; vec2 w = cameraPosition.xz + rd.xz * t;
          vec2 p = w / .24, cid; float e = vor(p, cid); float pw = max(length(fwidth(p)), 1e-6), vis = smoothstep(10., 30., 1. / pw);
          float joint = (1. - smoothstep(.04, .04 + 1.6 * pw, e)) * vis;
          vec3 stone = mix(vec3(.28, .30, .36), vec3(.52, .54, .60), h1(cid)) * mix(1., .72 + .28 * smoothstep(0., .22, e), vis) + vec3(.10, .11, .14) * smoothstep(.30, .44, e) * vis * h1(cid + 7.);
          float pud = smoothstep(.45, .62, vn(w * .35) * .7 + vn(w * .9) * .3); pud = max(pud, smoothstep(5.5, 0., abs(w.x)) * .55);   // the street itself is flooded
          float Fr = clamp(.42 + .58 * pow(1. - ey, 2.5), 0., 1.);
          vec3 refl = skyCol(clamp(ey + .004 * sin(uTime * .8 + w.x * .6 + w.y * .4), 0., 1.));
          float warm = exp(-pow((abs(w.x) - 7.2) / 1.1, 2.)) * (.55 + .45 * vn(vec2(w.y * .25, 3.)));            // the lit house fronts, mirrored
          vec3 water = mix(vec3(.09, .12, .18), refl, Fr) + vec3(.95, .62, .30) * warm * .4 * Fr;
          vec3 col = mix(stone, water, pud); col = mix(col, vec3(.06, .07, .09), joint * (1. - pud * .6));
          { float za = mod(w.y - 30. + 14.5, 29.) - 14.5, zb = mod(w.y - 15.5 + 14.5, 29.) - 14.5; float da = dot(vec2(w.x + 5.9, za), vec2(w.x + 5.9, za)), db = dot(vec2(w.x - 5.9, zb), vec2(w.x - 5.9, zb)); float pool = exp(-da / 9.) + exp(-db / 9.); col += vec3(1., .70, .36) * pool * (.16 + .30 * pud) * (.85 + .15 * sin(uTime * 1.7 + w.y)); }
          col = pow(col, vec3(2.2)); float f = 1. - exp(-pow(t * uFogD, 2.)); gl_FragColor = vec4(mix(col, uFogCol, f), 1.);
        }`,
    }));
    const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI / 2)), groundMat); ground.frustumCulled = false; scene.add(ground);

    // ---------- the houses: low plaster fronts with lit windows, tin roofs; street lamps ----------
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
    const hs = [];
    for (const side of [-1, 1]) for (let z = 46; z > -430;) { const w = R.range(6, 9.5), d = R.range(6.5, 9), h = R.range(3.6, 7.6); hs.push({ x: side * (6.6 + d / 2), z: z - w / 2, w, d, h, side, c: ['#d9d2c0', '#c8d6c9', '#d8c4a8', '#b9cbd6', '#e0d0c0'][R.int(0, 4)] }); z -= w + R.range(0.2, 1.4); }
    const hm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ map: facT, color: '#8a90a8' })), hs.length);
    const rm = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1, 1, 1)), own(new THREE.MeshBasicMaterial({ color: '#24424a' })), hs.length);
    hs.forEach((o, i) => { _q.identity(); _p.set(o.x, o.h / 2, o.z); _s.set(o.d, o.h, o.w); hm.setMatrixAt(i, _m.compose(_p, _q, _s)); hm.setColorAt(i, _c.set(o.c)); _p.set(o.x - o.side * 0.2, o.h + 0.14, o.z); _s.set(o.d + 0.8, 0.28, o.w + 0.6); rm.setMatrixAt(i, _m.compose(_p, _q, _s)); });
    hm.frustumCulled = rm.frustumCulled = false; scene.add(hm, rm);
    { const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0, 1, -0.5], D = [-0.5, 0, 0.5], E = [0.5, 0, 0.5], F = [0, 1, 0.5], tri = [[A, C, D], [C, F, D], [C, B, E], [C, E, F], [A, B, C], [D, F, E]], sh = [1.0, 1.0, 0.55, 0.55, 0.7, 0.7], pos = [], col = [];
      tri.forEach((t3, i) => { for (const v of t3) { pos.push(...v); col.push(sh[i], sh[i], sh[i]); } });
      const pg = own(new THREE.BufferGeometry()); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const roofs = new THREE.InstancedMesh(pg, own(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })), hs.length), awn = new THREE.InstancedMesh(own(new THREE.BoxGeometry(1.05, 0.05, 1)), own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), hs.length), stepM = new THREE.InstancedMesh(own(new THREE.BoxGeometry(0.7, 0.18, 1)), own(new THREE.MeshBasicMaterial({ color: '#4a4e5c' })), hs.length);
      const rc = ['#3a5a60', '#6a3c30', '#4a4a58', '#7a4634', '#34505a'], ac = ['#b8483a', '#3a9088', '#c89838', '#9a5ab8', '#3a68b8', '#c8c0b0'];
      hs.forEach((o, i) => { const rh = 1.1 + ((i * 53) % 10) * 0.12; _q.identity(); _p.set(o.x, o.h + 0.28, o.z); _s.set(o.d + 1.0, rh, o.w + 0.7); roofs.setMatrixAt(i, _m.compose(_p, _q, _s)); roofs.setColorAt(i, _c.set(rc[i % 5]));
        const fx = o.x - o.side * (o.d / 2); _q.setFromEuler(_e.set(0, 0, o.side * 0.42)); _p.set(fx - o.side * 0.45, o.h * 0.36 + 0.1, o.z); _s.set(1, 1, o.w * 0.26); awn.setMatrixAt(i, _m.compose(_p, _q, _s)); awn.setColorAt(i, _c.set(ac[i % 6]).multiplyScalar(0.5));
        _q.identity(); _p.set(fx - o.side * 0.35, 0.09, o.z); _s.set(1, 1, o.w * 0.24); stepM.setMatrixAt(i, _m.compose(_p, _q, _s)); });
      roofs.frustumCulled = awn.frustumCulled = stepM.frustumCulled = false; scene.add(roofs, awn, stepM);
      const cp2 = [], lampAt = (i) => [(i % 2 ? 1 : -1) * 5.9, 3.55, 30 - i * 14.5], cable = (a, b, sag) => { for (let k = 0; k < 12; k++) { const u0 = k / 12, u1 = (k + 1) / 12; cp2.push(lerp(a[0], b[0], u0), lerp(a[1], b[1], u0) - sag * Math.sin(u0 * Math.PI), lerp(a[2], b[2], u0), lerp(a[0], b[0], u1), lerp(a[1], b[1], u1) - sag * Math.sin(u1 * Math.PI), lerp(a[2], b[2], u1)); } };
      for (let i = 0; i < 29; i++) { cable(lampAt(i), lampAt(i + 2), 0.4); if (i < 5) cable(lampAt(i), lampAt(i + 1), 0.25); }
      const cg = own(new THREE.BufferGeometry()); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp2, 3)); const cl = new THREE.LineSegments(cg, own(new THREE.LineBasicMaterial({ color: '#0c0e16' }))); cl.frustumCulled = false; scene.add(cl); }
    const lampM = own(new THREE.MeshBasicMaterial({ color: '#15171f' })), lampG = own(new THREE.CylinderGeometry(0.05, 0.07, 3.6, 6)), glowMat = own(new THREE.SpriteMaterial({ map: glowT, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    for (let i = 0; i < 31; i++) { const x = (i % 2 ? 1 : -1) * 5.9, z = 30 - i * 14.5, pole = new THREE.Mesh(lampG, lampM); pole.position.set(x, 1.8, z); scene.add(pole); const sp = new THREE.Sprite(glowMat); sp.scale.set(3.4, 3.4, 1); sp.position.set(x, 3.7, z); scene.add(sp); }
    { const coneG = own(new THREE.ConeGeometry(1.9, 3.7, 16, 1, true).translate(0, -1.85, 0)), coneM = own(new THREE.MeshBasicMaterial({ color: '#ffcf80', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      for (let i = 0; i < 31; i++) { const c = new THREE.Mesh(coneG, coneM); c.position.set((i % 2 ? 1 : -1) * 5.9, 3.8, 30 - i * 14.5); scene.add(c); }
      const signG = own(new THREE.BoxGeometry(0.12, 0.8, 1.3)), bkt = own(new THREE.BoxGeometry(1.0, 0.08, 0.08));
      hs.forEach((o, i) => { if (i % 3) return; const sgn = o.side, x = o.x - sgn * (o.d / 2 + 0.55), cols = ['#d8503a', '#3aa8a0', '#e8b040', '#c070d8'], sm = new THREE.Mesh(signG, own(new THREE.MeshBasicMaterial({ color: cols[i % 4] }))); sm.position.set(x, 3.6, o.z); scene.add(sm); const br = new THREE.Mesh(bkt, own(new THREE.MeshBasicMaterial({ color: '#2a2a32' }))); br.position.set(x + sgn * 0.45, 4.05, o.z + 0.6); scene.add(br); const sp = new THREE.Sprite(glowMat); sp.scale.set(2.2, 2.2, 1); sp.position.set(x - sgn * 0.2, 3.6, o.z); scene.add(sp); }); }
    { // the moon, pale lilac, behind the storm
      const c = mkCanvas(256), g = c.getContext('2d'), rg = g.createRadialGradient(128, 128, 20, 128, 128, 126); rg.addColorStop(0, '#f2e6ff'); rg.addColorStop(0.85, '#c9b4e8'); rg.addColorStop(1, 'rgba(201,180,232,0)'); g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(140,120,180,${R.range(0.05, 0.14)})`; g.beginPath(); g.arc(128 + R.range(-70, 70), 128 + R.range(-70, 70), R.range(8, 28), 0, 6.2832); g.fill(); }
      const mt = own(new THREE.CanvasTexture(c)); mt.colorSpace = THREE.SRGBColorSpace;
      const moon = new THREE.Mesh(own(new THREE.PlaneGeometry(360, 360)), own(new THREE.MeshBasicMaterial({ map: mt, transparent: true, fog: false, depthWrite: false, opacity: 0.9 }))); moon.position.set(30, 170, -900); scene.add(moon);
    }
    await tick();

    // ---------- townsfolk walking home under umbrellas, each a little different ----------
    const folk = [];
    { const bodyG = own(new THREE.CapsuleGeometry(0.22, 0.8, 4, 8)), headG = own(new THREE.SphereGeometry(0.17, 8, 6)), umbG = own(new THREE.ConeGeometry(0.95, 0.5, 14, 1, true)), poleG = own(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 5)), legG = own(new THREE.CapsuleGeometry(0.07, 0.6, 3, 5));
      const cols = ['#d8503a', '#e8b040', '#3aa8a0', '#c070d8', '#4a78d8', '#e87aa0'];
      for (let i = 0; i < 16; i++) {
        const g = new THREE.Group(), side = i % 2 ? 1 : -1, x = side * R.range(4.3, 5.6), z0 = 40 - i * 11 - R.range(0, 5), dark = own(new THREE.MeshBasicMaterial({ color: ['#14161f', '#2a2030', '#1c2a34', '#34241c'][i % 4] })), up = i % 3 !== 0;
        const b = new THREE.Mesh(bodyG, dark); b.position.y = 1.1; g.add(b); const h = new THREE.Mesh(headG, own(new THREE.MeshBasicMaterial({ color: ['#e8c0a0', '#c89870', '#8a5a3c'][i % 3] }))); h.position.y = 2.05; g.add(h);
        const lg1 = new THREE.Mesh(legG, dark), lg2 = new THREE.Mesh(legG, dark); lg1.position.set(-0.1, 0.4, 0); lg2.position.set(0.1, 0.4, 0); g.add(lg1, lg2);
        const pole = new THREE.Mesh(poleG, own(new THREE.MeshBasicMaterial({ color: '#3a3a44' }))); pole.position.set(0.1, 2.3, 0); g.add(pole);
        const umb = new THREE.Mesh(umbG, own(new THREE.MeshBasicMaterial({ color: cols[i % 6], side: THREE.DoubleSide }))); umb.position.set(0.1, 2.95, 0); g.add(umb);   // an ordinary umbrella, point up
        g.position.set(x, 0, z0); scene.add(g); folk.push({ g, ph: R.range(0, 6.28), x, z0, v: (i % 2 ? 1 : -1) * R.range(0.9, 1.4), lg1, lg2, up });
      } }
    // ---------- rain: streaks falling past the lens, ripples ringing the puddles ----------
    const DN = 2200, dp = new Float32Array(DN * 6), dc = new Float32Array(DN * 6), dd = []; for (let i = 0; i < DN; i++) dd.push({ x: R.range(-18, 18), z: R.range(-40, 12), y: R.range(0, 30), l: R.range(0.7, 1.5) });
    const dg = own(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('color', new THREE.BufferAttribute(dc, 3));
    const rain = new THREE.LineSegments(dg, own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); rain.frustumCulled = false; scene.add(rain);
    const RN = 46, rings = [], ringG = own(new THREE.RingGeometry(0.85, 1.0, 24)); ringG.rotateX(-Math.PI / 2);
    for (let i = 0; i < RN; i++) { const m = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0, depthWrite: false })); m.position.set(0, 0.03, -999); scene.add(m); rings.push({ m, age: R.range(0, 1), life: R.range(0.6, 1.1), x: 0, z: 0 }); }
    const dog = new THREE.Group(), dogLegs = []; let dogHead, dogTail; { const DM = (c) => own(new THREE.MeshBasicMaterial({ color: c })), tan = DM('#b08a58'), dk = DM('#6a4c30'), add = (geo, m, x, y, z, par) => { const o = new THREE.Mesh(own(geo), m); o.position.set(x, y, z); (par || dog).add(o); return o; };
      add(new THREE.CapsuleGeometry(0.15, 0.5, 4, 10).rotateX(Math.PI / 2), tan, 0, 0.5, 0); dogHead = new THREE.Group(); dogHead.position.set(0, 0.68, 0.42); dog.add(dogHead);
      add(new THREE.SphereGeometry(0.14, 12, 9), tan, 0, 0, 0, dogHead); add(new THREE.CapsuleGeometry(0.06, 0.12, 3, 8).rotateX(Math.PI / 2), dk, 0, -0.04, 0.16, dogHead); for (const sg of [-1, 1]) add(new THREE.ConeGeometry(0.05, 0.14, 6), dk, sg * 0.09, 0.13, -0.02, dogHead);
      for (const [lx, lz] of [[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.25], [0.1, -0.25]]) { const hip = new THREE.Group(); hip.position.set(lx, 0.42, lz); dog.add(hip); add(new THREE.CapsuleGeometry(0.04, 0.32, 3, 6), lz > 0 ? tan : dk, 0, -0.2, 0, hip); dogLegs.push(hip); }
      dogTail = new THREE.Group(); dogTail.position.set(0, 0.6, -0.38); dog.add(dogTail); add(new THREE.CapsuleGeometry(0.03, 0.26, 3, 6), tan, 0, 0.14, -0.06, dogTail); dog.scale.setScalar(1.25); scene.add(dog); }
    const camAtP = (uu) => { const p = new THREE.Vector3(); path.pointAt(Math.max(0, Math.min(1, uu)), p); return [p.x, p.y, p.z]; };
    await tick();

    return {
      scene, path, duration: DUR, title: 'A Night Walk in the Rain', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 64, near: 0.3, nearThrough: 0.5, far: 2000, lookAhead: 12, sway: 0, bank: 0.03 },
      pois: [
        { at: (tm, uu) => { const c = camAtP(uu); return [c[0] - 9, 4.5, c[2] - 8]; }, from: 0.1, to: 0.24, fade: 0.3, weight: 0.8 },   // the lit windows on the left
        { at: (tm, uu) => { const c = camAtP(uu); return [c[0] + 9, 4.5, c[2] - 8]; }, from: 0.28, to: 0.42, fade: 0.3, weight: 0.8 },   // and on the right
        { at: (tm, uu) => { const c = camAtP(uu); return [c[0], 14, c[2] - 20]; }, from: 0.44, to: 0.55, fade: 0.3, weight: 0.7 },        // up into the storm
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#d8b8ff', veil: '#d8b8ff', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 0.95, bloom: { strength: 0.15, radius: 0.45, threshold: 0.9 }, grade: { saturation: 1.05, contrast: 1.05, tint: '#eef0ff', shadowTint: '#06081a', vignette: 0.25, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position;
        sky.update(dt, t, camera); ground.position.set(cp.x, 0, cp.z); groundMat.uniforms.uTime.value = t;
        // sheet lightning: two slow, soft brightenings of the storm (never a hard flash)
        const fl = 0.16 * Math.max(Math.exp(-Math.pow((T - 6.5) / 0.55, 2)), Math.exp(-Math.pow((T - 13.2) / 0.5, 2)));
        scene.fog.color.copy(FOG).multiplyScalar(1 + fl * 1.6); scene.background.set('#1f3358').multiplyScalar(1 + fl * 2.2);
        for (let i = 0; i < DN; i++) { const d = dd[i], y = ((d.y - t * 22) % 30 + 30) % 30, n = i * 6, x = cp.x + d.x, z = cp.z + d.z; dp[n] = x; dp[n + 1] = Math.max(0.05, cp.y - 2 + y); dp[n + 2] = z; dp[n + 3] = x + 0.1; dp[n + 4] = dp[n + 1] + d.l; dp[n + 5] = z; const f = 0.22 * (0.4 + 0.6 * (1 - Math.abs(y - 12) / 18)); dc[n] = f * 0.8; dc[n + 1] = f * 0.9; dc[n + 2] = f; dc[n + 3] = 0; dc[n + 4] = 0; dc[n + 5] = 0; }
        dg.attributes.position.needsUpdate = true; dg.attributes.color.needsUpdate = true;
        for (const r of rings) { r.age += dt; if (r.age > r.life) { r.age = 0; r.life = 0.6 + Math.random() * 0.5; r.x = cp.x + (Math.random() - 0.5) * 14; r.z = cp.z - 3 - Math.random() * 24; r.m.position.set(r.x, 0.03, r.z); } const k = r.age / r.life; r.m.scale.set(0.15 + 0.9 * k, 1, 0.15 + 0.9 * k); r.m.material.opacity = 0.35 * (1 - k) * (cp.y < 6 ? 1 : 0); }
        { const s0 = Math.max(0, Math.min(1, u || 0)), lead = 6.5 + 1.2 * Math.sin(T * 0.7) + 7 * smoothstep(11, 17, T), sd = Math.min(1.2, s0 + lead / 150), gait = t * 11;
          dog.position.set(PX(Math.min(1, sd)) * 0.7 + 0.5 * Math.sin(T * 1.1), 0.03 * Math.abs(Math.sin(gait)), PZ(sd)); dog.rotation.y = Math.PI + 0.25 * Math.cos(T * 1.1);
          dogLegs.forEach((h, i) => { h.rotation.x = 0.6 * Math.sin(gait + (i === 0 || i === 3 ? 0 : Math.PI)); }); dogTail.rotation.z = 0.6 * Math.sin(t * 9); dogTail.rotation.x = -0.5; dogHead.rotation.y = 1.3 * smoothstep(0.55, 1, Math.sin(T * 0.9 - 1.2)); }
        for (const f of folk) { const z = ((f.z0 + f.v * t - cp.z + 60) % 120 + 120) % 120 - 60 + cp.z; f.g.position.set(f.x, 0, z); f.g.rotation.y = f.v > 0 ? Math.PI : 0; f.g.position.y = 0.04 * Math.abs(Math.sin(t * 5 + f.ph)); f.lg1.rotation.x = 0.5 * Math.sin(t * 5 + f.ph); f.lg2.rotation.x = -0.5 * Math.sin(t * 5 + f.ph); }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
