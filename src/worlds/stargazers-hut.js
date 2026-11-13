// THE STARGAZER'S HUT: night on a summit in the Lofoten islands. A low stone hut with a turf roof and one lit window,
// a brass telescope on its tripod aimed up at the Milky Way, a lantern on a post, and the camera circling them under a
// crowded sky while shooting stars cross it. Blue, green and ochre again: the same colours as Lofoten Ascent, which
// this world follows (its portal opens here), seen by starlight and a thin moon. The flight leaves the summit level,
// out over the sea, to the portal. Nothing is loaded: the hut, the telescope, the meteors and the mountains are built here.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky, makeLightRig } from '../kit/sky.js';

const BLUE = new THREE.Color('#2a6fb0'), DEEP = new THREE.Color('#0f3566'), GREEN = new THREE.Color('#3f9560'), MOSS = new THREE.Color('#6fa04c'), OCHRE = new THREE.Color('#d9a03c');
const _c = new THREE.Color();
function strata(y, wob, out) {
  const t = ((y / 46 + wob) % 3 + 3) % 3;
  if (t < 1) return out.copy(BLUE).lerp(GREEN, smoothstep(0.35, 0.65, t));
  if (t < 2) return out.copy(GREEN).lerp(OCHRE, smoothstep(1.35, 1.65, t));
  return out.copy(OCHRE).lerp(BLUE, smoothstep(2.35, 2.65, t));
}
const paint = (g, col) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };

const SUMMIT = 84;    // the hut's floor

export default {
  id: 'stargazers-hut',
  name: "The Stargazer's Hut",
  category: 'wilderness',
  weirdness: 0.25,
  media: ['air', 'open', 'water'],
  async build(ctx) {
    const N = ctx.noise, R = ctx.rng;
    const scene = new THREE.Scene();
    const detail = ctx.quality ? (ctx.quality.detail || 1) : 1;
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const updaters = [], trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- the flight: up the south face, once round the hut, then level out over the sea ----------
    const RAD = 26, H = SUMMIT + 8;
    const pts = [[0, SUMMIT - 10, 150], [-2, H - 4, 92], [-1, H, 50]];
    for (let k = 0; k <= 9; k++) { const th = (k / 9) * 1.5 * Math.PI; pts.push([Math.sin(th) * RAD, H + 1 + 3.5 * (k / 9), Math.cos(th) * RAD]); }
    pts.push([-RAD, H + 4.5, 70], [-RAD, H + 6, 140], [-RAD, H + 8, 220]);
    const path = makePath(pts);
    const duration = 46;
    await tick();

    // ---------- sky: a crowded night, a thin moon low in the west ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'night', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      stars: 1, starDensity: 1.5, milkyWay: 0.35, milkyColor: '#4f6fae', milkyCore: '#8a8fa8', milkyAngle: 35, clouds: { coverage: 0.08 }, zenith: '#02061a', mid: '#06193a', horizon: '#173a63',
      bodies: [{ elevation: 16, azimuth: -62, size: 0.5, phase: 0.2, phaseAngle: -35, intensity: 0.12, glow: 0, glowColor: '#cfe0ff', color: '#f4f7ff' }],
      ambientColor: '#4d78c0', groundLight: '#233a60', ambientIntensity: 2.6,
    });
    scene.add(sky.object);
    scene.fog = new THREE.FogExp2(new THREE.Color('#0d2a4a'), 0.0007);
    scene.background = new THREE.Color('#02061a');
    const rig = makeLightRig(sky, { intensity: 1.4, ambient: 1.3, bounce: 0.4 });
    scene.add(rig.object);
    updaters.push((dt, t, cam) => { sky.update(dt, t, cam); rig.update(dt, t, cam); });
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    await tick();

    // ---------- the mountain: a summit with a level shelf for the hut, falling to the sea, peaks standing back ----------
    const X0 = -1100, X1 = 1100, Z0 = -800, Z1 = 700, SEG_X = Math.round(260 * Math.min(1, 0.6 + detail * 0.4)), SEG_Z = Math.round(SEG_X * (Z1 - Z0) / (X1 - X0));
    const natural = (x, z) => {
      const r = Math.hypot(x, z), wob = N.fbm2(x * 0.006, z * 0.006, 3);
      const summit = SUMMIT - Math.max(0, r - 20) * (0.5 + 0.18 * wob) - 7 * Math.max(0, wob) * smoothstep(20, 90, r);
      const far = smoothstep(240, 520, r);
      const mass = smoothstep(0.5, 0.78, N.fbm2(x * 0.0017 + 11, z * 0.0017 - 4, 2) * 0.5 + 0.5);
      const peak = (Math.pow(N.ridged2(x * 0.0026 + 3.1, z * 0.0026 - 1.7, 3), 1.6) * 330 - 40) * mass * far;
      let y = Math.max(summit, peak, -30);
      if (r < 30) y = lerp(y, SUMMIT, 1 - smoothstep(20, 30, r));              // the shelf the hut stands on
      return y;
    };
    const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, SEG_X, SEG_Z); geo.rotateX(-Math.PI / 2); geo.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
    const pos = geo.attributes.position, nv = pos.count, colors = new Float32Array(nv * 3), wobs = new Float32Array(nv);
    for (let i = 0; i < nv; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, natural(x, z));
      wobs[i] = 0.55 * N.fbm2(x * 0.006, z * 0.006, 2) + 0.12 * N.n2(x * 0.03, z * 0.03);
      if ((i & 4095) === 0) await tick();
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let i = 0; i < nv; i++) {
      const y = pos.getY(i), slope = 1 - nrm.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (y < 7) { _c.copy(OCHRE).lerp(MOSS, smoothstep(-4, 4, y)); if (y < 0) _c.lerp(DEEP, smoothstep(0, -10, y)); }
      else { strata(y, wobs[i], _c); if (slope < 0.14 && y < 200) _c.lerp(MOSS, 0.4); _c.multiplyScalar(1 - smoothstep(0.3, 0.9, slope) * 0.2); }
      if (r < 16) _c.lerp(MOSS, 0.55 * (1 - smoothstep(8, 16, r)));
      colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    scene.add(new THREE.Mesh(own(geo), own(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }))));
    const sea = new THREE.Mesh(own(new THREE.PlaneGeometry(6000, 5000).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#0a2a52' })));
    sea.position.y = 0.5; scene.add(sea);
    await tick();

    // ---------- the hut: stone walls, a turf roof, an ochre door, one lit window ----------
    const hut = new THREE.Group(); hut.position.set(0, SUMMIT, 0); hut.rotation.y = 0.5; hut.scale.setScalar(1.7); scene.add(hut);
    const stoneMat = own(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    const W = 8, D = 5.6, HT = 3.2;
    const walls = paint(new THREE.BoxGeometry(W, HT, D), new THREE.Color('#7f93a8')); walls.translate(0, HT / 2, 0);
    const sh = new THREE.Shape(); sh.moveTo(-W / 2 - 0.5, 0); sh.lineTo(W / 2 + 0.5, 0); sh.lineTo(0, 2.1); sh.closePath();
    const roof = paint(new THREE.ExtrudeGeometry(sh, { depth: D + 1, bevelEnabled: false }), new THREE.Color('#4f8a4a')); roof.translate(0, HT, -D / 2 - 0.5);
    for (const g of [walls, roof]) hut.add(new THREE.Mesh(own(g), stoneMat));
    const door = new THREE.Mesh(own(new THREE.BoxGeometry(1.3, 2.2, 0.2)), own(new THREE.MeshStandardMaterial({ color: '#c48a2c', roughness: 0.9 })));
    door.position.set(-1.8, 1.1, D / 2 + 0.05); hut.add(door);
    const glowMat = own(new THREE.MeshBasicMaterial({ color: '#c98f3a', fog: false }));
    const win = new THREE.Mesh(own(new THREE.PlaneGeometry(1.5, 1.1)), glowMat); win.position.set(1.7, 1.9, D / 2 + 0.07); hut.add(win);
    const chim = new THREE.Mesh(own(new THREE.BoxGeometry(0.9, 2, 0.9)), stoneMat); paint(chim.geometry, new THREE.Color('#6a7c90')); chim.position.set(-2.6, HT + 1.7, -0.6); hut.add(chim);
    const lamp = new THREE.PointLight('#ffb54f', 30, 50, 1.8); lamp.position.set(1.7, 2, D / 2 + 3); hut.add(lamp);
    // a lantern on a post by the door
    const post = new THREE.Mesh(own(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 6)), own(new THREE.MeshStandardMaterial({ color: '#5a4430', roughness: 1 })));
    post.position.set(4.6, 1.3, D / 2 + 1.4); hut.add(post);
    const lantern = new THREE.Mesh(own(new THREE.SphereGeometry(0.34, 8, 6)), glowMat); lantern.position.set(4.6, 2.8, D / 2 + 1.4); hut.add(lantern);

    // ---------- the telescope: brass tube on a tripod, aimed up at the Milky Way ----------
    const scope = new THREE.Group(); scope.position.set(-13, SUMMIT, 11); scope.scale.setScalar(1.7); scene.add(scope);
    const brass = own(new THREE.MeshStandardMaterial({ color: '#d39a35', roughness: 0.35, metalness: 0.7, emissive: '#3a2608', emissiveIntensity: 0.4 }));
    const wood = own(new THREE.MeshStandardMaterial({ color: '#6b4d30', roughness: 0.9 }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3, leg = new THREE.Mesh(own(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 5)), wood);
      leg.position.set(Math.cos(a) * 0.7, 1.55, Math.sin(a) * 0.7); leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); scope.add(leg);
    }
    const tube = new THREE.Group(); tube.position.set(0, 3.2, 0); tube.rotation.y = 0.4; scope.add(tube);
    const pitch = new THREE.Group(); pitch.rotation.z = -0.7; tube.add(pitch);                 // tilted up toward the Milky Way
    const barrel = new THREE.Mesh(own(new THREE.CylinderGeometry(0.28, 0.34, 4.4, 14)), brass); barrel.position.y = 2.2; pitch.add(barrel);
    const ring = new THREE.Mesh(own(new THREE.TorusGeometry(0.3, 0.05, 6, 14)), own(new THREE.MeshStandardMaterial({ color: '#3d78c0', roughness: 0.3, metalness: 0.5 }))); ring.position.y = 4.4; ring.rotation.x = Math.PI / 2; pitch.add(ring);
    await tick();

    // ---------- rocks and tufts of ochre grass round the summit ----------
    const rockGeo = own(new THREE.IcosahedronGeometry(1, 0)), rockMat = own(new THREE.MeshStandardMaterial({ color: '#7b8fa6', roughness: 1, flatShading: true }));
    const nRock = 34, rocks = new THREE.InstancedMesh(rockGeo, rockMat, nRock), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _eu = new THREE.Euler();
    for (let i = 0; i < nRock; i++) {
      const a = R.range(0, 6.28), rr = R.range(14, 40), x = Math.cos(a) * rr, z = Math.sin(a) * rr, s = R.range(0.5, 2.1);
      _p.set(x, natural(x, z) + s * 0.25, z); _q.setFromEuler(_eu.set(R.range(0, 3), R.range(0, 3), R.range(0, 3))); _s.set(s * 1.3, s * 0.8, s);
      rocks.setMatrixAt(i, _m.compose(_p, _q, _s)); rocks.setColorAt(i, _c.set(i % 4 === 0 ? '#c9953a' : '#8aa0b8'));
    }
    scene.add(rocks);

    // ---------- shooting stars: a thin streak crosses the sky now and then ----------
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 16; { const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(0.8, 'rgba(255,240,205,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 5, 256, 6); }
    const streakTex = own(new THREE.CanvasTexture(cv)); streakTex.colorSpace = THREE.SRGBColorSpace;
    const streakMat = own(new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    const streakGeo = own(new THREE.PlaneGeometry(1, 0.06));
    const meteors = [];
    for (let i = 0; i < 0; i++) {
      const az = R.range(0, 6.28), el = R.range(0.35, 1.2), D0 = 1400, start = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).multiplyScalar(D0);
      const dir = new THREE.Vector3(R.range(-1, 1), R.range(-0.7, -0.15), R.range(-1, 1)).normalize();
      const mesh = new THREE.Mesh(streakGeo, streakMat); mesh.visible = false; mesh.renderOrder = 1002; scene.add(mesh);
      meteors.push({ mesh, start, dir, t0: 6 + i * 10 + R.range(0, 3), dur: R.range(2, 3), len: R.range(120, 240), travel: R.range(500, 800) });
    }
    const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _bm = new THREE.Matrix4();
    const flyMeteors = (t, cam) => {
      for (const m of meteors) {
        const k = (t - m.t0) / m.dur;
        if (k < 0 || k > 1) { m.mesh.visible = false; continue; }
        _p.copy(m.start).addScaledVector(m.dir, k * m.travel).add(cam.position);
        _z.copy(cam.position).sub(_p).normalize(); _x.copy(m.dir).addScaledVector(_z, -m.dir.dot(_z)).normalize(); _y.crossVectors(_z, _x);
        _bm.makeBasis(_x, _y, _z); m.mesh.quaternion.setFromRotationMatrix(_bm); m.mesh.position.copy(_p);
        m.mesh.scale.set(m.len * Math.sin(Math.PI * Math.min(1, k * 1.05)), 1, 1);
        m.mesh.visible = true;
      }
    };

    return {
      scene, path, duration, title: "The Stargazer's Hut", ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 1.2, far: 6000, lookAhead: 26, sway: 0.4, bank: 0.25 },
      pois: [
        { at: [0, SUMMIT + 10, 0], from: 0.04, to: 0.8, weight: 0.8, fade: 0.25 },
        { at: [-120, SUMMIT + 210, -160], from: 0.82, to: 1, weight: 0.4 },
      ],
      portal: { shape: 'circle', radius: 7, color: '#bcd2ff', glow: 0.1, halo: false, revealDistance: 260 },
      post: { exposure: 1.0, bloom: { strength: 0, radius: 0.3, threshold: 1 }, grade: { saturation: 1.15, contrast: 1.08, tint: '#eef3ff', shadowTint: '#020a1c', vignette: 0.32, grain: 0.03, aberration: 0 } },
      update(dt, t, camera, u) {
        for (const f of updaters) f(dt, t, camera, u);
        flyMeteors(t, camera);
      },
      dispose() {
        if (sky.dispose) sky.dispose();
        for (const o of trash) o.dispose && o.dispose();
      },
    };
  },
};
