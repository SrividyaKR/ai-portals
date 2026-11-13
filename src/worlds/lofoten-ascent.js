// LOFOTEN ASCENT: a dawn climb up the stone steps behind a Lofoten fishing village, in blue, green and ochre.
// The strata of the mountains are painted in repeating bands of those three colours; gulls and sea eagles wheel up the
// ridge with the hiker, the sea and the islands lie open on both sides, and the sun comes up over the saddle ahead.
// The flight ends level on the saddle, at the portal.
//
// Layout: the village stands on the water at z ~ +250, the camera climbs toward -Z. One terrain mesh whose heights are
// pressed flat along the trail so that the camera never meets rock. Nothing is loaded: all of it is built here.
import * as THREE from 'three';
import { makePath, clamp, lerp, smoothstep } from '../kit/core.js';
import { makeSky, makeLightRig } from '../kit/sky.js';

const BLUE = new THREE.Color('#1f5f9e'), DEEP = new THREE.Color('#0d2f5c'), GREEN = new THREE.Color('#3f8f58'), MOSS = new THREE.Color('#7fae52'), OCHRE = new THREE.Color('#d39a35'), RUST = new THREE.Color('#b9662a');

// the colour of rock at height y: blue, green and ochre bands that repeat up the mountain
const _c = new THREE.Color();
function strata(y, wob, out) {
  const t = ((y / 46 + wob) % 3 + 3) % 3;
  if (t < 1) return out.copy(BLUE).lerp(GREEN, smoothstep(0.35, 0.65, t));
  if (t < 2) return out.copy(GREEN).lerp(OCHRE, smoothstep(1.35, 1.65, t));
  return out.copy(OCHRE).lerp(BLUE, smoothstep(2.35, 2.65, t));
}

// a gabled boathouse: a body and a roof in one geometry, painted with vertex colours
function cabinGeometry(w, h, d, wall, roof) {
  const body = new THREE.BoxGeometry(w, h, d); body.translate(0, h / 2, 0);
  const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.4, 0); sh.lineTo(w / 2 + 0.4, 0); sh.lineTo(0, h * 0.62); sh.closePath();
  const gable = new THREE.ExtrudeGeometry(sh, { depth: d + 0.8, bevelEnabled: false }); gable.translate(0, h, -d / 2 - 0.4);
  const paint = (g, col) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  paint(body, wall); paint(gable, roof);
  return [body, gable];
}

export default {
  id: 'lofoten-ascent',
  name: 'Lofoten Ascent',
  category: 'wilderness',
  weirdness: 0.3,
  media: ['air', 'open', 'water'],
  async build(ctx) {
    const N = ctx.noise, R = ctx.rng;
    const scene = new THREE.Scene();
    const detail = ctx.quality ? (ctx.quality.detail || 1) : 1;
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const updaters = [], trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- the climb: village quay, then switchbacks up the ridge, then a level run to the portal ----------
    const wp = [
      [0, 5.2, 262], [10, 7, 232], [-26, 14, 196], [30, 30, 150], [-34, 56, 96], [28, 88, 40], [-24, 122, -22],
      [26, 154, -88], [-18, 182, -160], [14, 204, -236], [0, 214, -310], [0, 215, -390],
    ];
    const path = makePath(wp.map((p) => [p[0], p[1] + 3.2, p[2]]));
    const duration = 48;
    await tick();

    // ---------- sky: dawn, the sun low and dead ahead over the saddle ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'dawn', quality: 0.7, bake: !!ctx.renderer, renderer: ctx.renderer,
      sunElevation: 6.5, sunAzimuth: -6, sunSize: 1.0, sunIntensity: 1.6, sunGlow: 0.08, sunGlowTight: 0.05, sunColor: '#ffc457', zenith: '#173f86', mid: '#4f7fc0', horizon: '#f5c27a',
      scatterColor: '#ffb347', lightColor: '#ffcf8a', ambientColor: '#6f9fe0', groundLight: '#3c6e58', ambientIntensity: 2.6,
    });
    scene.add(sky.object);
    const fogColor = new THREE.Color('#a9c8d6');
    scene.fog = new THREE.FogExp2(fogColor, 0.00055);
    scene.background = new THREE.Color('#173f86');
    const rig = makeLightRig(sky, { intensity: 1.5, ambient: 1.4, bounce: 0.5 });
    scene.add(rig.object);
    updaters.push((dt, t, cam) => { sky.update(dt, t, cam); rig.update(dt, t, cam); });
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    await tick();

    // ---------- the mountain: ridged rock that rises inland, pressed flat along the trail ----------
    const X0 = -1150, X1 = 1150, Z0 = -950, Z1 = 600, SEG_X = Math.round(300 * Math.min(1, 0.6 + detail * 0.4)), SEG_Z = Math.round(SEG_X * (Z1 - Z0) / (X1 - X0));
    // the trail runs along a spine that falls away to the sea on both sides, so the whole view is open; the high
    // peaks stand back from it, rising straight out of the water the way Lofoten's do
    const natural = (x, z, d, pathY) => {
      const spine = pathY - 3 - Math.min(d, 260) * (0.55 + 0.25 * N.n2(x * 0.01, z * 0.01));   // the ridge and its sloping shoulders
      const far = smoothstep(120, 380, d);                                                       // peaks keep clear of the trail
      const r = N.ridged2(x * 0.0026 + 3.1, z * 0.0026 - 1.7, 3);
      const mass = smoothstep(0.52, 0.8, N.fbm2(x * 0.0017 + 11, z * 0.0017 - 4, 2) * 0.5 + 0.5);   // where mountains stand and where the water is
      const peak = (Math.pow(r, 1.6) * 380 - 40) * mass * far;
      return Math.max(spine, peak, -30);
    };
    const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SEG_X, SEG_Z); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position, nv = pos.count, colors = new Float32Array(nv * 3), wobs = new Float32Array(nv);
    for (let i = 0; i < nv; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const near = path.nearestXZ(x, z);
      let y = natural(x, z, near.dist, near.y);
      if (near.dist < 7) y = lerp(y, near.y - 3, 1 - smoothstep(3, 7, near.dist));   // the trail itself, level under the steps
      pos.setY(i, y);
      wobs[i] = 0.55 * N.fbm2(x * 0.006, z * 0.006, 2) + 0.12 * N.n2(x * 0.03, z * 0.03);
      if ((i & 4095) === 0) await tick();
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let i = 0; i < nv; i++) {
      const y = pos.getY(i), slope = 1 - nrm.getY(i);
      if (y < 7) { _c.copy(OCHRE).lerp(MOSS, smoothstep(-4, 4, y)); if (y < 0) _c.lerp(DEEP, smoothstep(0, -10, y)); }
      else { strata(y, wobs[i], _c); if (slope < 0.12 && y < 190) _c.lerp(MOSS, 0.35); _c.multiplyScalar(1 - smoothstep(0.3, 0.9, slope) * 0.22); }
      colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const ground = new THREE.Mesh(own(geo), own(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 })));
    scene.add(ground);
    await tick();

    // ---------- the sea: deep blue, a little glossy, level at zero ----------
    const seaMat = own(new THREE.MeshBasicMaterial({ color: '#1d5f98' }));
    const sea = new THREE.Mesh(own(new THREE.PlaneGeometry(6000, 5000).rotateX(-Math.PI / 2)), seaMat);
    sea.position.set(0, 0.5, 0); scene.add(sea);

    // ---------- the village: painted boathouses on stilts over the water ----------
    const WALLS = ['#c98a2e', '#b4552b', '#2f6fb0', '#3f8f58', '#d8a244', '#a34a2a'].map((c) => new THREE.Color(c)), ROOFS = ['#173a63', '#255b3c', '#6d3519'].map((c) => new THREE.Color(c));
    const cabinMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    const stiltGeo = own(new THREE.CylinderGeometry(0.28, 0.34, 9, 6)), stiltMat = own(new THREE.MeshStandardMaterial({ color: '#4a3524', roughness: 1 }));
    const village = new THREE.Group(); scene.add(village);
    for (let i = 0; i < 17; i++) {
      const ring = i % 2, x = -96 + i * 12 + R.range(-3, 3), z = 262 + R.range(-4, 22) + ring * 18 + Math.abs(i - 8) * 0.9;
      const w = R.range(5, 8), h = R.range(3, 4.4), d = R.range(5, 7.5);
      const parts = cabinGeometry(w, h, d, WALLS[(R() * WALLS.length) | 0], ROOFS[(R() * ROOFS.length) | 0]);
      const g = new THREE.Group();
      for (const pg of parts) g.add(new THREE.Mesh(own(pg), cabinMat));
      g.position.set(x, 2.4, z); g.rotation.y = R.range(-0.12, 0.12) + (x > 10 ? -0.2 : x < -10 ? 0.2 : 0);
      village.add(g);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const s = new THREE.Mesh(stiltGeo, stiltMat); s.position.set(x + sx * (w / 2 - 0.5), -2.1, z + sz * (d / 2 - 0.5)); village.add(s); }
    }
    // the quay and its drying racks (A-frames hung with cod)
    const quay = new THREE.Mesh(own(new THREE.BoxGeometry(34, 1.4, 22)), own(new THREE.MeshStandardMaterial({ color: '#6b5a44', roughness: 1 })));
    quay.position.set(0, 1.7, 262); scene.add(quay);
    const rackMat = own(new THREE.MeshStandardMaterial({ color: '#8a6a43', roughness: 1 })), rackGeo = own(new THREE.BoxGeometry(0.35, 7, 0.35));
    for (let i = 0; i < 7; i++) {
      const x = -13 + i * 4.4, g = new THREE.Group();
      for (const s of [-1, 1]) { const leg = new THREE.Mesh(rackGeo, rackMat); leg.position.set(0, 3.2, 0); leg.rotation.z = s * 0.42; g.add(leg); }
      g.position.set(x, 2.4, 252 + (i % 2) * 3); scene.add(g);
    }
    await tick();

    // ---------- the steps: flat stones up the trail, the climb itself ----------
    const nSteps = 300, stepGeo = own(new THREE.BoxGeometry(2.6, 0.5, 1.3)), stepMat = own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
    const steps = new THREE.InstancedMesh(stepGeo, stepMat, nSteps);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), UP = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < nSteps; i++) {
      const u = 0.005 + (i / nSteps) * 0.99; path.pointAt(u, _p); path.tangentAt(u, _t);
      _q.setFromAxisAngle(UP, Math.atan2(-_t.x, -_t.z) + R.range(-0.08, 0.08)); _p.y -= 3.1; _p.x += R.range(-0.5, 0.5);
      _m.compose(_p, _q, _s); steps.setMatrixAt(i, _m);
      steps.setColorAt(i, _c.set(i % 5 === 0 ? '#e0a43c' : '#9fb4cc').offsetHSL(0, 0, R.range(-0.05, 0.05)));
    }
    scene.add(steps);

    // ---------- the seabirds: gulls and a few sea eagles gliding up the mountain with the hiker ----------
    const nBirds = Math.round(70 * detail);
    const bodyGeo = own(new THREE.SphereGeometry(1, 8, 6)); bodyGeo.scale(1.5, 0.45, 0.45);
    const headGeo = own(new THREE.SphereGeometry(0.42, 6, 5)); headGeo.translate(1.45, 0.08, 0);
    const wingL = own(new THREE.BoxGeometry(0.8, 0.05, 2.3)); wingL.translate(0, 0, 1.15);
    const wingR = own(new THREE.BoxGeometry(0.8, 0.05, 2.3)); wingR.translate(0, 0, -1.15);
    const birdMat = own(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, emissive: '#403c30', emissiveIntensity: 0.2 }));
    const bodyM = new THREE.InstancedMesh(bodyGeo, birdMat, nBirds), headM = new THREE.InstancedMesh(headGeo, birdMat, nBirds);
    const wlM = new THREE.InstancedMesh(wingL, birdMat, nBirds), wrM = new THREE.InstancedMesh(wingR, birdMat, nBirds);
    const BCOL = ['#f6f3ea', '#ece8d8', '#f6f3ea', '#c9a36a', '#a9bdd2'].map((c) => new THREE.Color(c)), birds = [];
    for (let i = 0; i < nBirds; i++) {
      const f = { u: R(), speed: R.range(0.012, 0.022), r: R.range(34, 95), ph: R.range(0, 6.28), sp: R.range(0.25, 0.7), sz: R.range(0.8, 1.4), lift: R.range(-6, 26), flap: R.range(5, 9), fph: R.range(0, 6.28) };
      birds.push(f); const c = BCOL[(R() * BCOL.length) | 0]; for (const m of [bodyM, headM, wlM, wrM]) m.setColorAt(i, c);
    }
    scene.add(bodyM, headM, wlM, wrM);
    const _fp = new THREE.Vector3(), _ft = new THREE.Vector3(), _side = new THREE.Vector3(), _fq = new THREE.Quaternion(), _fs = new THREE.Vector3(), _fm = new THREE.Matrix4(), _wm = new THREE.Matrix4(), _wq = new THREE.Quaternion(), _tmp = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), ZERO = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
    const flyBirds = (t) => {
      for (let i = 0; i < nBirds; i++) {
        const f = birds[i], u = (f.u + t * f.speed) % 1;
        path.pointAt(Math.min(0.995, u), _fp); path.tangentAt(Math.min(0.995, u), _ft);
        _side.crossVectors(_ft, UP).normalize();
        const a = f.ph + t * f.sp;                                         // each wheels in a slow spiral about the trail
        _fp.addScaledVector(_side, Math.cos(a) * f.r).y += Math.sin(a) * f.r * 0.3 + f.lift + 10;
        _tmp.copy(_ft).addScaledVector(_side, -Math.sin(a) * 0.5).normalize();
        _fq.setFromUnitVectors(AX, _tmp);
        _fs.setScalar(f.sz); _fm.compose(_fp, _fq, _fs);
        bodyM.setMatrixAt(i, _fm); headM.setMatrixAt(i, _fm);
        const flap = Math.sin(t * f.flap + f.fph) * 0.55 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 0.5 + f.fph * 2)));   // bursts of flapping between glides
        _wq.setFromAxisAngle(AX, flap); _wm.compose(ZERO, _wq, ONE); _wm.premultiply(_fm); wlM.setMatrixAt(i, _wm);
        _wq.setFromAxisAngle(AX, -flap); _wm.compose(ZERO, _wq, ONE); _wm.premultiply(_fm); wrM.setMatrixAt(i, _wm);
      }
      for (const m of [bodyM, headM, wlM, wrM]) m.instanceMatrix.needsUpdate = true;
    };
    flyBirds(0);
    await tick();

    const portalPoint = path.end;
    return {
      scene, path, duration, title: 'Lofoten Ascent', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 64, near: 1.2, far: 6000, lookAhead: 30, sway: 0.5, bank: 0.35 },
      pois: [
        { at: [-420, 10, 380], from: 0.02, to: 0.2, weight: 0.55, fade: 0.3 },
        { at: [420, 120, -60], from: 0.24, to: 0.46, weight: 0.5, fade: 0.3 },
        { at: [-380, 210, -300], from: 0.5, to: 0.72, weight: 0.5, fade: 0.3 },
        { at: [0, 230, -700], from: 0.78, to: 1, weight: 0.45 },
      ],
      portal: { shape: 'circle', radius: 7, color: '#f3c25a', glow: 0.1, halo: false, revealDistance: 260 },
      post: {
        exposure: 1.0, bloom: { strength: 0, radius: 0.3, threshold: 1 },
        grade: { saturation: 1.18, contrast: 1.07, tint: '#fff2de', shadowTint: '#0a2a4c', vignette: 0.3, grain: 0.03, aberration: 0 },
      },
      update(dt, t, camera, u) {
        for (const f of updaters) f(dt, t, camera, u);
        flyBirds(t);
      },
      dispose() {
        if (sky.dispose) sky.dispose();
        for (const o of trash) o.dispose && o.dispose();
      },
    };
  },
};
