// THE FOX-FIRE SLED: the third world after Lofoten Ascent and The Stargazer's Hut, which it follows (the Hut's portal opens
// here). The flight leaves the moon behind and slides down a faint ribbon of light into a snowy Finnish forest, then runs
// by sled along a trail between snow-laden spruces, over a frozen lake, with arctic foxes running alongside. In Finnish the
// northern lights are "revontulet", fox fires: each time a fox flicks its tail a few slow sparks drift up and join the
// aurora. The flight ends level at a lantern-lit cabin and the portal.
//
// Everything is deliberately soft: the aurora is slow and dim, there is no glow pass, the snow is a mid tone, the lake is
// a flat unlit colour, and nothing flashes or pulses. Nothing is loaded: all of it is built here.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky, makeLightRig } from '../kit/sky.js';

const SNOW = new THREE.Color('#c6d3e4'), SHADE = new THREE.Color('#8aa3c8'), ICE = new THREE.Color('#7fa8d4'), TRACK = new THREE.Color('#b9bfc6'), OCHRE = new THREE.Color('#d9a03c');
const _c = new THREE.Color(), CAP = new THREE.Color('#a8bdd6'), FOXW = new THREE.Color('#dbe6f3');
const paint = (g, fn) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { fn(g.attributes.position, i, _c); a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const solid = (g, col) => paint(g, (p, i, out) => out.copy(col));
// merge geometries into one (position, normal, colour), flattening any index
function merge(list) {
  const gs = list.map((g) => (g.index ? g.toNonIndexed() : g)); let n = 0; for (const g of gs) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { P.set(g.attributes.position.array, o * 3); Nn.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3)); return out;
}

export default {
  id: 'fox-fire-sled',
  name: 'The Fox-Fire Sled',
  category: 'wilderness',
  weirdness: 0.3,
  media: ['air', 'open', 'snow'],
  async build(ctx) {
    const N = ctx.noise, R = ctx.rng;
    const scene = new THREE.Scene();
    const detail = ctx.quality ? (ctx.quality.detail || 1) : 1;
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const updaters = [], trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- the flight: down the ribbon from the moon, then the trail through the forest to the cabin ----------
    const wp = [
      [0, 150, 300], [10, 118, 230], [-12, 86, 160], [8, 52, 95], [0, 22, 45], [0, 7, 0],
      [30, 5, -60], [-10, 4, -130], [-45, 3, -210], [-20, 3, -290], [25, 3, -360], [40, 3, -430], [34, 3, -500], [34, 3, -580],
    ];
    const path = makePath(wp);
    const duration = 52;
    const LAKE = [-52, -236, 62];     // x, z, radius: the trail crosses the frozen lake
    await tick();

    // ---------- sky: a soft night, a slow green and blue aurora, the moon ahead and to the left of the start ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'night', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      stars: 1, starDensity: 1.4, milkyWay: 0.3, milkyColor: '#4f6fae', milkyCore: '#8a8fa8', milkyAngle: 20, clouds: { coverage: 0.06 },
      aurora: 0.55, auroraColors: ['#3fd89a', '#4a8cff'], auroraSpeed: 0.2, auroraSpread: 0.7,
      zenith: '#02061a', mid: '#07203f', horizon: '#18425f',
      bodies: [{ elevation: 24, azimuth: -28, size: 1.5, phase: 0.55, phaseAngle: -30, intensity: 0.16, glow: 0, glowColor: '#cfe0ff', color: '#e8eefc' }],
      ambientColor: '#5f86c8', groundLight: '#2a4a70', ambientIntensity: 2.6,
    });
    scene.add(sky.object);
    scene.fog = new THREE.FogExp2(new THREE.Color('#10304c'), 0.0022);
    scene.background = new THREE.Color('#02061a');
    const rig = makeLightRig(sky, { intensity: 1.3, ambient: 1.3, bounce: 0.4 });
    scene.add(rig.object);
    updaters.push((dt, t, cam) => { sky.update(dt, t, cam); rig.update(dt, t, cam); });
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    await tick();

    // ---------- the ground: rolling snow, the sled trail pressed flat, a flat frozen lake ----------
    const X0 = -1000, X1 = 1000, Z0 = -1300, Z1 = 1100, SEG_X = Math.round(380 * Math.min(1, 0.6 + detail * 0.4)), SEG_Z = Math.round(SEG_X * (Z1 - Z0) / (X1 - X0));
    const ground = (x, z, near) => {
      let y = 7 + 20 * N.fbm2(x * 0.004 + 5, z * 0.004 - 2, 3) + 9 * N.fbm2(x * 0.013, z * 0.013, 2);
      y += 30 * smoothstep(160, 520, Math.abs(x));                          // low fells at the sides
      const dl = Math.hypot(x - LAKE[0], z - LAKE[1]);
      y = lerp(y, 2.2, 1 - smoothstep(LAKE[2] - 14, LAKE[2] + 18, dl));      // the lake bed lies level
      if (near.y < 14) { const w = 1 - smoothstep(5, 18, near.dist); y = lerp(y, near.y - 2.4, w); }   // the trail
      return y;
    };
    const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SEG_X, SEG_Z); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position, nv = pos.count, near = new Array(nv);
    for (let i = 0; i < nv; i++) {
      const x = pos.getX(i), z = pos.getZ(i), nr = path.nearestXZ(x, z);
      near[i] = nr; pos.setY(i, ground(x, z, nr));
      if ((i & 4095) === 0) await tick();
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal, colors = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const x = pos.getX(i), z = pos.getZ(i), slope = 1 - nrm.getY(i), dl = Math.hypot(x - LAKE[0], z - LAKE[1]);
      _c.copy(SNOW).lerp(SHADE, smoothstep(0.02, 0.18, slope) * 0.8 + 0.18 * (N.n2(x * 0.02, z * 0.02) * 0.5 + 0.5));
      if (near[i].y < 14) _c.lerp(TRACK, (1 - smoothstep(2.5, 6, near[i].dist)) * 0.6);
      if (dl < LAKE[2]) _c.lerp(ICE, 1 - smoothstep(LAKE[2] - 10, LAKE[2], dl));
      colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    scene.add(new THREE.Mesh(own(geo), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }))));
    const groundAt = (x, z) => ground(x, z, path.nearestXZ(x, z));
    await tick();

    // ---------- the forest: snow-laden spruces, kept clear of the trail and the lake ----------
    const tier = (r, h, y0) => paint(new THREE.ConeGeometry(r, h, 7), (p, i, out) => { const k = (p.getY(i) + h / 2) / h; out.set('#1d4f45').lerp(CAP, smoothstep(0.35, 1, k) * 0.9 + 0.1 * (1 - k)); }).translate(0, y0 + h / 2, 0);
    const spruce = merge([paint(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 5), (p, i, out) => out.set('#4a3524')).translate(0, 1.1, 0), tier(3.6, 5.2, 1.6), tier(2.8, 4.6, 4.2), tier(1.9, 4, 6.8)]);
    const nTrees = Math.round(1500 * detail), trees = new THREE.InstancedMesh(own(spruce), own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })), nTrees);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    let placed = 0, guard = 0;
    while (placed < nTrees && guard++ < nTrees * 12) {
      const x = R.range(-760, 760), z = R.range(-1000, 420), nr = path.nearestXZ(x, z);
      if (nr.y > 14 ? nr.dist < 4 : nr.dist < 10) continue;
      if (Math.hypot(x - LAKE[0], z - LAKE[1]) < LAKE[2] + 6) continue;
      if (z > 60 && nr.dist < 30) continue;
      const s = R.range(0.8, 1.9) * (1 + 0.5 * smoothstep(60, 300, nr.dist));
      _p.set(x, groundAt(x, z) - 0.2, z); _q.setFromAxisAngle(UP, R.range(0, 6.28)); _s.set(s, s * R.range(0.9, 1.25), s);
      trees.setMatrixAt(placed, _m.compose(_p, _q, _s)); trees.setColorAt(placed, _c.setScalar(R.range(0.8, 1.05))); placed++;
      if ((placed & 255) === 0) await tick();
    }
    trees.count = placed; scene.add(trees);

    // ---------- the ribbon: a faint band of light the first part of the flight slides down ----------
    {
      const nSeg = 40, uMax = 0.3, P = [], I = [], A = [];
      for (let k = 0; k <= nSeg; k++) {
        const u = (k / nSeg) * uMax, c = path.pointAt(u), t = path.tangentAt(u), side = new THREE.Vector3().crossVectors(t, UP).normalize(), w = 8 * (1 - 0.4 * k / nSeg);
        P.push(c.x - side.x * w, c.y - 4, c.z - side.z * w, c.x + side.x * w, c.y - 4, c.z + side.z * w);
        const a = Math.sin(Math.PI * Math.min(1, k / nSeg * 1.15)) * 0.22; A.push(a, a);
        if (k < nSeg) { const b = k * 2; I.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('alpha', new THREE.Float32BufferAttribute(A, 1)); g.setIndex(I);
      const mat = own(new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.25, 0.8, 0.6, vA); }' }));
      const ribbon = new THREE.Mesh(own(g), mat); ribbon.frustumCulled = false; ribbon.renderOrder = 3; scene.add(ribbon);
    }

    // ---------- cabins: a snug one by the trail and the last one with the portal beyond ----------
    const wallMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })), winMat = own(new THREE.MeshBasicMaterial({ color: '#c98f3a', fog: false }));
    const cabin = (x, z, rot, wall) => {
      const g = new THREE.Group(), w = 7, d = 5.4, h = 3;
      const body = solid(new THREE.BoxGeometry(w, h, d), new THREE.Color(wall)).translate(0, h / 2, 0);
      const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.5, 0); sh.lineTo(w / 2 + 0.5, 0); sh.lineTo(0, 2); sh.closePath();
      const roof = solid(new THREE.ExtrudeGeometry(sh, { depth: d + 1, bevelEnabled: false }), new THREE.Color('#a9bdd6')).translate(0, h, -d / 2 - 0.5);
      for (const gg of [body, roof]) g.add(new THREE.Mesh(own(gg), wallMat));
      const chim = new THREE.Mesh(own(solid(new THREE.BoxGeometry(0.8, 2, 0.8), new THREE.Color('#6a7c90'))), wallMat); chim.position.set(-2, h + 1.6, -0.5); g.add(chim);
      for (const wx of [-1.6, 1.8]) { const win = new THREE.Mesh(own(new THREE.PlaneGeometry(1.1, 0.9)), winMat); win.position.set(wx, 1.7, d / 2 + 0.06); g.add(win); }
      g.position.set(x, groundAt(x, z), z); g.rotation.y = rot; scene.add(g); return g;
    };
    cabin(-34, -150, 0.5, '#8a6a43');
    cabin(60, -520, -0.4, '#c48a2c');
    await tick();

    // ---------- the foxes: arctic foxes run alongside, a tail flick sends a few slow sparks up ----------
    const foxGeo = merge([
      paint(new THREE.SphereGeometry(1, 8, 6).scale(1.5, 0.62, 0.6), (p, i, o) => o.set('#cfdcec')).translate(0, 0.9, 0),
      paint(new THREE.SphereGeometry(0.5, 8, 6), (p, i, o) => o.set('#d8e3f1')).translate(1.7, 1.15, 0),
      paint(new THREE.ConeGeometry(0.28, 0.9, 6).rotateZ(-Math.PI / 2), (p, i, o) => o.set('#c3d0e2')).translate(2.35, 1.1, 0),
      paint(new THREE.ConeGeometry(0.16, 0.45, 4), (p, i, o) => o.set('#b4c2d8')).translate(1.55, 1.7, 0.22),
      paint(new THREE.ConeGeometry(0.16, 0.45, 4), (p, i, o) => o.set('#b4c2d8')).translate(1.55, 1.7, -0.22),
      paint(new THREE.SphereGeometry(0.62, 8, 6).scale(2.2, 0.55, 0.55), (p, i, o) => o.copy(p.getX(i) < -0.9 ? OCHRE : FOXW)).translate(-2.1, 1.0, 0),
      ...[[0.9, 0.3], [0.9, -0.3], [-0.9, 0.3], [-0.9, -0.3]].map(([lx, lz]) => paint(new THREE.CylinderGeometry(0.1, 0.07, 0.9, 5), (p, i, o) => o.set('#8fa3be')).translate(lx, 0.45, lz)),
    ]);
    const foxMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); own(foxGeo);
    const nFox = 6, foxes = [];
    for (let i = 0; i < nFox; i++) {
      const m = new THREE.Mesh(foxGeo, foxMat); m.scale.setScalar(0.001); m.frustumCulled = false; scene.add(m);
      foxes.push({ m, side: (i % 2 ? 1 : -1) * R.range(7, 16), du: R.range(0.012, 0.05), ph: R.range(0, 6.28), gait: R.range(5.5, 7.5), next: R.range(0.5, 2) });
    }
    // sparks: small dim motes that rise and drift, then fade out (additive and low in value: they never glare)
    const nSp = 150, spPos = new Float32Array(nSp * 3), spCol = new Float32Array(nSp * 3), sp = [];
    for (let i = 0; i < nSp; i++) sp.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, ph: 0, hue: 0 });
    const cv = document.createElement('canvas'); cv.width = cv.height = 32; { const g = cv.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); }
    const dot = own(new THREE.CanvasTexture(cv));
    const spGeo = own(new THREE.BufferGeometry()); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); spGeo.setAttribute('color', new THREE.BufferAttribute(spCol, 3));
    const points = new THREE.Points(spGeo, own(new THREE.PointsMaterial({ size: 1.1, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false })));
    points.frustumCulled = false; points.renderOrder = 5; scene.add(points);
    let spNext = 0;
    const emit = (x, y, z) => {
      const s = sp[spNext]; spNext = (spNext + 1) % nSp;
      s.life = 0; s.max = R.range(5, 8); s.x = x + R.range(-0.4, 0.4); s.y = y; s.z = z + R.range(-0.4, 0.4); s.vx = R.range(-0.5, 0.5); s.vy = R.range(2.2, 4); s.vz = R.range(-0.5, 0.5); s.ph = R.range(0, 6.28); s.hue = R.range(0, 1);
    };
    const _fp = new THREE.Vector3(), _ft = new THREE.Vector3(), _sd = new THREE.Vector3();
    const runFoxes = (dt, t, u) => {
      const show = smoothstep(0.3, 0.38, u);
      for (const f of foxes) {
        const uu = Math.min(0.99, u + f.du); path.pointAt(uu, _fp); path.tangentAt(uu, _ft); _sd.crossVectors(_ft, UP).normalize();
        const off = f.side + Math.sin(t * 0.4 + f.ph) * 2;
        const x = _fp.x + _sd.x * off, z = _fp.z + _sd.z * off, bob = Math.abs(Math.sin(t * f.gait + f.ph)) * 0.55;
        f.m.position.set(x, groundAt(x, z) + bob, z);
        f.m.rotation.y = Math.atan2(-_ft.z, _ft.x) ; f.m.rotation.z = Math.sin(t * f.gait + f.ph) * 0.07;
        f.m.scale.setScalar(Math.max(0.001, show) * 1.25);
        f.next -= dt; if (show > 0.99 && f.next < 0) { f.next = R.range(1.2, 2.8); const tx = x - Math.cos(f.m.rotation.y) * 2.6, tz = z + Math.sin(f.m.rotation.y) * 2.6; for (let k = 0; k < 3; k++) emit(tx, f.m.position.y + 1.8, tz); }
      }
      for (let i = 0; i < nSp; i++) {
        const s = sp[i]; s.life += dt;
        if (s.life >= s.max) { spPos[i * 3 + 1] = -999; spCol[i * 3] = spCol[i * 3 + 1] = spCol[i * 3 + 2] = 0; continue; }
        const k = s.life / s.max, fade = Math.sin(Math.PI * k) * 0.55;
        s.x += (s.vx + Math.sin(s.life * 0.9 + s.ph) * 0.6) * dt; s.y += s.vy * dt * (1 - 0.5 * k); s.z += (s.vz + Math.cos(s.life * 0.8 + s.ph) * 0.6) * dt;
        spPos[i * 3] = s.x; spPos[i * 3 + 1] = s.y; spPos[i * 3 + 2] = s.z;
        spCol[i * 3] = fade * (s.hue < 0.5 ? 0.85 : 0.35); spCol[i * 3 + 1] = fade * (s.hue < 0.5 ? 0.62 : 0.85); spCol[i * 3 + 2] = fade * (s.hue < 0.5 ? 0.2 : 0.6);
      }
      spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true;
    };
    runFoxes(0, 0, 0);

    const cabinEnd = new THREE.Vector3(60, 8, -520);
    return {
      scene, path, duration, title: 'The Fox-Fire Sled', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 1.2, far: 6000, lookAhead: 28, sway: 0.45, bank: 0.3 },
      pois: [
        { at: [cabinEnd.x, cabinEnd.y, cabinEnd.z], from: 0.82, to: 1, weight: 0.35 },
      ],
      portal: { shape: 'circle', radius: 7, color: '#bfe8d4', glow: 0.1, halo: false, revealDistance: 260 },
      post: { exposure: 1.0, bloom: { strength: 0, radius: 0.3, threshold: 1 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#eef3ff', shadowTint: '#020a1c', vignette: 0.3, grain: 0.03, aberration: 0 } },
      update(dt, t, camera, u) {
        for (const f of updaters) f(dt, t, camera, u);
        runFoxes(dt, t, u);
      },
      dispose() {
        if (sky.dispose) sky.dispose();
        for (const o of trash) o.dispose && o.dispose();
      },
    };
  },
};
