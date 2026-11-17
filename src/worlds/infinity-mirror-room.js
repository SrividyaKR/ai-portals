// THE INFINITY ROOM
// One barn swallow has flown into an infinity mirror room, and the mirrors turn it into a flock of thousands.
// The room: a black hall 10 m wide and 10 m tall whose two long walls and ceiling are mirror panels, a floor of shallow
// black water, a narrow walkway of black lacquer slabs, and about five hundred small glass orbs hanging on threads.
// Every surface that is a mirror is done as real geometry: the hall's whole content (orbs, threads, slabs, seams, the
// hoop at the far end and the bird itself) lives in `base`, and 44 reflected copies of it (cells k, j) stand around
// the real hall, each with its own mirrored matrix that shares the base's instance matrices. Distance is counted in
// reflections, never fog: every copy is dimmer and cooler by |k| + |j|, and each cell is tilted by a fraction of a
// degree (seeded) so the copies drift a little out of line, as real mirror rooms do.
//
// Flight (DUR 18 s, constant speed, z = 30 - 6 T; staged on T = u * DUR, the wingbeat and the orbs' breathing on t):
//   0-2    the hook: low over the water (eye 1.3 m), the swallow 7 m ahead banking left; at T 1 a single soft wave of
//          brightness runs away from us down the orbs at 25 m/s; the side mirrors show the bird as a flock.
//   2.5-7  the drink: at T 2.8 the swallow touches the water 9 m ahead; rings spread, and every mirror copy of the
//          water spreads its own (the ring shader folds x across the walls); the gaze dips to the rings, then turns
//          out through the left mirror at the flock of copies (T 5-6.5).
//   7-12   the climb: the swallow rises into the orbs between the threads, the camera rises 1.3 -> 2.6 and pitches
//          after it; the colour weather turns from blue-green to pink-ochre.
//   12-16  the landing: the swallow lands on top of an orb 4 m right of the path, 3.6 m up; the orb swings on its
//          thread (a damped pendulum) and so does every copy; the gaze rests on the bird, then lets it go.
//   16-18  the exit: it drops off, swoops past on the right and flies through the ring of orbs at the far end, its
//          copies following it into theirs.
// Corridor (a narrow room; the lead's ruling): a clear tube of 2.6 m round the camera path for orbs and threads,
// 3.5 m for any orb hanging lower than 3 m; the bird keeps 3 m and more; walls at x = +-5.
// Portal: radius 4.5 centred 4.5 m over the water (the hall is 10 m wide and tall, so a larger ring would cut into the
// mirror walls); the path ends level and straight on its centre.
import * as THREE from 'three';
import { smoothstep, clamp } from '../kit/core.js';
import { mkCanvas, pathFrom } from '../kit/mine.js';
import * as fx from '../kit/fx.js';

// ---------------------------------------------------------------------------------------------------------------------
// The hall and the route
// ---------------------------------------------------------------------------------------------------------------------
const DUR = 20.5, V = 6, Z0 = 30;   // round 2: the route runs 15 m further so the ring stays small until the last seconds
const W = 5, H = 10;                  // half width of the hall (mirror walls at x = +-W), height (mirror ceiling at y = H)
const KX = 4, KY = 2;                 // reflected copies across the walls and across floor/ceiling
const PR = 3, PZ = Z0 - V * DUR;      // the portal: radius, centre height = radius; it stands at the path's end
const HOOP_R = PR + 0.24;             // the hoop of orbs round the portal
const Z_NEAR = 66, Z_FAR = -205;      // the hall's orbs run from behind the start to well past the ring
const TAU = Math.PI * 2;

// The palette (sRGB hex; THREE.Color makes them linear)
const PAL = { blue: '#4a7cff', teal: '#3fcf9a', ochre: '#d9a441', pink: '#f08aa8', bg: '#120a26' };

// camera: an S-curve on the walkway; low to 6.5 s, up to 2.6 by 11 s, then up to the ring's centre for the last stretch
const camX = (T) => (1.0 * Math.sin(0.42 * T) + 0.35 * Math.sin(1.1 * T)) * (1 - smoothstep(15.4, 17.1, T));
const camY = (T) => 1.3 + 1.3 * smoothstep(6.5, 11, T) + (PR - 2.6) * smoothstep(15.0, 17.1, T);
const camAt = (T) => [camX(T), camY(T), Z0 - V * T];

// ---------------------------------------------------------------------------------------------------------------------
// The swallow's route: keys [T, x, y, z] (and an optional velocity), joined by cubic Hermite pieces. The tangent at a key
// is the neighbours' difference unless given; the perch keys have zero velocity, so the bird slows to land and the two
// perch keys hold it still between them.
// ---------------------------------------------------------------------------------------------------------------------
const PERCH = { x: 3.0, z: -66, r: 0.3, y0: 3.0, T0: 12.5, T1: 15.3 };   // nearer the path (3.3 m), still outside the 2.6 m tube   // the orb it lands on (y0: the orb's centre)
const PERCH_Y = PERCH.y0 + PERCH.r + 0.012;
const BK = [
  [0.0, 1.6, 0.9, 25.8],                         // the hook: 4.5 m ahead, crossing right to left over its reflection
  [1.0, -1.5, 0.75, 20.0],
  [2.0, -0.4, 0.5, 13.8],
  [2.8, 0.5, 0.07, 4.2, [0.9, 0.0, -6.6]],      // the drink: skimming level, beak to the water
  [3.6, 0.6, 0.8, -1.5],
  [5.0, -2.2, 1.6, -5.0],                        // close on our left: its copies line up across the left mirrors
  [6.5, -2.5, 1.9, -13.8],
  [7.6, -1.8, 2.6, -24.0],
  [9.0, -2.4, 5.3, -34.5],
  [10.5, -0.6, 7.0, -42.0],
  [11.6, 2.3, 5.4, -54.5],
  [PERCH.T0, PERCH.x, PERCH_Y, PERCH.z, [0, 0, 0]],
  [PERCH.T1, PERCH.x, PERCH_Y, PERCH.z, [0, 0, 0]],
  [16.4, 3.0, 4.0, -70.5],
  [17.0, 2.0, 4.6, -77.0],
  [18.2, 0.9, 3.9, -89.0],
  [19.3, 0.5, 3.35, PZ],                         // through the ring, a little right of and above its centre
  [19.7, 0.4, 3.3, PZ - 4.5],
];
const _bt0 = [0, 0, 0], _bt1 = [0, 0, 0];
function keyTangent(i, out) {
  const k = BK[i];
  if (k[4]) { out[0] = k[4][0]; out[1] = k[4][1]; out[2] = k[4][2]; return out; }
  const a = BK[Math.max(0, i - 1)], b = BK[Math.min(BK.length - 1, i + 1)], dt = b[0] - a[0];
  for (let c = 0; c < 3; c++) out[c] = (b[c + 1] - a[c + 1]) / dt;
  return out;
}
function birdAt(T, out) {
  T = clamp(T, BK[0][0], BK[BK.length - 1][0]);
  let i = 0; while (i < BK.length - 2 && T > BK[i + 1][0]) i++;
  const a = BK[i], b = BK[i + 1], dt = b[0] - a[0], s = (T - a[0]) / dt, s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  keyTangent(i, _bt0); keyTangent(i + 1, _bt1);
  return out.set(
    h00 * a[1] + h10 * dt * _bt0[0] + h01 * b[1] + h11 * dt * _bt1[0],
    h00 * a[2] + h10 * dt * _bt0[1] + h01 * b[2] + h11 * dt * _bt1[1],
    h00 * a[3] + h10 * dt * _bt0[2] + h01 * b[3] + h11 * dt * _bt1[2]);
}
// how much the wings beat (0 glide .. 1 full burst), by staged time: swallows beat in bursts and glide between
function flapAmount(T) {
  if (T >= PERCH.T0 - 0.05 && T <= PERCH.T1) return 0;
  const bursts = [[0.0, 0.9], [2.25, 2.7], [3.0, 3.9], [5.2, 6.0], [7.0, 8.4], [8.9, 10.3], [10.8, 11.5], [12.0, 12.45], [PERCH.T1, 17.8]];
  let f = 0.18;   // even a glide keeps a little flicker of the tips
  for (const [a, b] of bursts) f = Math.max(f, smoothstep(a - 0.15, a + 0.1, T) * (1 - smoothstep(b - 0.1, b + 0.15, T)));
  return f;
}

// orbs' breathing etc. only ever use slow rates; the hook's brightness wave is one pulse, not a flicker
const WAVE_SPEED = 25, WAVE_T = 1.0, WAVE_W = 3.5;

export default {
  id: 'infinity-mirror-room',
  name: 'The Infinity Room',
  category: 'wilderness',
  weirdness: 0.85,
  media: ['open', 'air'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 72); await tick();
    scene.background = new THREE.Color(PAL.bg);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
    const C = { blue: new THREE.Color(PAL.blue), teal: new THREE.Color(PAL.teal), ochre: new THREE.Color(PAL.ochre), pink: new THREE.Color(PAL.pink) };

    // ---- matcaps (no lights in the room: every surface takes its shading from one of these) ----
    const matcap = (draw) => { const c = mkCanvas(128), g = c.getContext('2d'); draw(g); const t = own(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const radial = (g, stops, cx = 64, cy = 64, r = 64) => { const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r); for (const [o, c] of stops) rg.addColorStop(o, c); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); };
    // a glowing glass orb: the core is the light, the rim falls off, with a thin glint at the very edge
    const orbMC = matcap((g) => { radial(g, [[0, '#d8d8d8'], [0.5, '#b4b4b4'], [0.78, '#7a7a7a'], [0.92, '#4c4c4c'], [0.97, '#6e6e6e'], [1, '#3a3a3a']]); radial(g, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']], 48, 42, 30); });   // a glass sphere: a highlight up and left, the edge falling dark
    // the swallow: a mid body tone with a cool rim, so the dark back still outlines itself against the orbs
    const birdMC = matcap((g) => {
      radial(g, [[0, '#9a9aa8'], [0.55, '#8c8c9c'], [0.8, '#aeb0c4'], [0.93, '#e4e4f4'], [1, '#b8b8d0']]);   // a bright rim: the bird outlines itself
      // the rim takes the room's colours: teal from one side, dusk pink from the other, ochre from above
      for (const [cx, cy, col] of [[4, 70, '63,207,154'], [124, 66, '240,138,168'], [64, 2, '217,164,65'], [64, 126, '74,124,255']]) { const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 46); rg.addColorStop(0, `rgba(${col},0.8)`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
      const hl = g.createRadialGradient(46, 38, 0, 46, 38, 22); hl.addColorStop(0, 'rgba(255,255,255,0.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fillRect(0, 0, 128, 128);
    });
    // black lacquer: nearly black with one soft band of light along the top and a dim rim
    const lacquerMC = matcap((g) => {
      radial(g, [[0, '#1a1822'], [0.7, '#24222e'], [0.9, '#3a3648'], [1, '#22202c']]);
      // a soft broad sheen over the upper half (where a slab's top samples), uneven so no two slabs read alike
      const band = g.createLinearGradient(0, 4, 0, 70); band.addColorStop(0, 'rgba(200,195,230,0.05)'); band.addColorStop(0.45, 'rgba(200,195,230,0.32)'); band.addColorStop(1, 'rgba(200,195,230,0)'); g.fillStyle = band; g.fillRect(0, 0, 128, 128);
    });
    const metalMC = matcap((g) => radial(g, [[0, '#4a4650'], [0.5, '#6a6474'], [0.8, '#2a2630'], [0.95, '#9a90a8'], [1, '#3a3640']], 54, 50, 80));

    // ---- per-reflection looks: each copy is dimmer and cooler by n = |k| + |j| ----
    const DIM = 0.58;
    const levelTint = (n) => new THREE.Color(Math.pow(DIM * 0.9, n), Math.pow(DIM * 0.95, n), Math.pow(DIM, n));
    const levelCache = new Map();
    const atLevel = (key, mat, n, make) => {
      const id = key + ':' + n; if (levelCache.has(id)) return levelCache.get(id);
      const m = n === 0 ? mat : own(make ? make(n) : (() => { const c = mat.clone(); if (c.color) c.color.multiply(levelTint(n)); if (c.opacity !== undefined && c.transparent) c.opacity *= Math.pow(0.75, n); return c; })());
      levelCache.set(id, m); return m;
    };
    // transparent draw order: what lies beyond the floor's water (or beyond the water seen in the ceiling) first, then the
    // water planes, then everything on our side of them, then the mist
    const orderOf = (j) => (j === -1 || j === -2 || j === 2 ? 1 : 3);

    // =================================================================================================================
    // THE SWALLOW (in `base`; every cell holds a clone whose transforms are copied from it each frame)
    // =================================================================================================================
    const BLUE_BACK = [0.035, 0.06, 0.24], BELLY = [1.55, 1.42, 1.2], RUST = [1.45, 0.42, 0.12], DARK = [0.05, 0.05, 0.07];   // blue-black back, pale belly, rust throat
    const paint = (geo, fn) => { const p = geo.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const c = fn(p.getX(i), p.getY(i), p.getZ(i)); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; } geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo; };
    // body: an ellipsoid along +z (forward), slimmer behind; blue back, buff belly, rust throat and forehead
    const bodyG = own(new THREE.SphereGeometry(1, 18, 12));
    {
      const p = bodyG.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = z < 0 ? 1 + 0.55 * z : 1 - 0.18 * z * z;
        p.setXYZ(i, x * 0.04 * k, y * 0.036 * k + (z > 0.45 ? 0.008 * (z - 0.45) / 0.55 : 0), z * 0.118);
        let c = y > -0.3 ? BLUE_BACK : BELLY;   // the pale belly is the underside only
        if (z > 0.55 && y < 0.3 && y > -0.75) c = RUST;            // the throat
        if (z > 0.86 && y > 0.25) c = RUST;                         // the forehead
        if (y > 0.5 && z > -0.3 && z < 0.5) c = [0.06, 0.12, 0.48];  // the steel-blue gloss along the back
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      bodyG.setAttribute('color', new THREE.BufferAttribute(col, 3)); bodyG.computeVertexNormals();
    }
    const beakG = own(paint(new THREE.ConeGeometry(0.009, 0.024, 6).rotateX(Math.PI / 2).translate(0, 0.006, 0.125), () => DARK));
    const shapeGeo = (pts, col) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); return paint(new THREE.ShapeGeometry(s).rotateX(Math.PI / 2), col); };
    // the forked tail: two long outer streamers with a deep notch between them
    const tailG = own(shapeGeo([[-0.024, -0.075], [-0.09, -0.47], [-0.074, -0.465], [-0.02, -0.2], [0, -0.13], [0.02, -0.2], [0.074, -0.465], [0.09, -0.47], [0.024, -0.075]],   // long streamers, deeply split
      (x, y, z) => (z < -0.3 ? [0.03, 0.05, 0.2] : BLUE_BACK)));
    // the wings: a short arm and a long swept hand (sickle-shaped, pointed), right wing along +x; the left is its mirror
    const wingCol = (x, y, z) => (x * x > 0.02 ? [0.03, 0.05, 0.2] : BLUE_BACK);
    const armG = own(shapeGeo([[0, 0.032], [0.122, 0.028], [0.124, -0.046], [0, -0.052]], wingCol));
    const handG = own(shapeGeo([[0, 0.028], [0.08, 0.02], [0.17, -0.055], [0.238, -0.15], [0.15, -0.088], [0.06, -0.062], [0, -0.046]], (x) => (x > 0.15 ? [0.025, 0.035, 0.14] : [0.04, 0.07, 0.26])));
    const armGL = own(armG.clone().scale(-1, 1, 1)), handGL = own(handG.clone().scale(-1, 1, 1));
    const birdMat = own(new THREE.MeshMatcapMaterial({ matcap: birdMC, vertexColors: true, side: THREE.DoubleSide }));
    const BIRD_S = 2.4;   // about 1.8 m across the wings: a swallow made readable at 9:16 among the orbs
    const bird = new THREE.Group(); bird.name = 'swallow';
    const body = new THREE.Mesh(bodyG, birdMat), beak = new THREE.Mesh(beakG, birdMat), tail = new THREE.Mesh(tailG, birdMat);
    body.position.set(0, 0, 0); tail.position.set(0, 0.004, 0);
    const wing = (side) => {
      const sh = new THREE.Group(); sh.position.set(side * 0.026, 0.016, 0.022);
      const arm = new THREE.Mesh(side > 0 ? armG : armGL, birdMat); sh.add(arm);
      const wr = new THREE.Group(); wr.position.set(side * 0.12, 0, 0); sh.add(wr);
      wr.add(new THREE.Mesh(side > 0 ? handG : handGL, birdMat));
      return { sh, wr };
    };
    const wR = wing(1), wL = wing(-1);
    const birdBody = new THREE.Group(); birdBody.add(body, beak, tail, wR.sh, wL.sh); birdBody.scale.setScalar(BIRD_S);
    bird.add(birdBody);
    bird.traverse((o) => { o.frustumCulled = false; });
    // the nodes whose transforms move, in traversal order (clones keep the same order)
    const birdNodes = []; bird.traverse((o) => birdNodes.push(o));

    // =================================================================================================================
    // THE ORBS: hanging orbs placed by rule (corridor, bird's route, portal gap, spacing), the perch orb, and the hoop
    // =================================================================================================================
    const birdSamples = []; for (let T = 0; T <= 19.7; T += 0.04) birdSamples.push(birdAt(T, new THREE.Vector3()));
    const od = [];
    const clearOf = (x, y, z, r) => {
      if (Math.abs(x) > W - r - 0.14 || y - r < 0.7 || y + r > H - 1.6) return false;
      // the camera's tube: an orb above the eye is cleared by its height as well; one at eye height or under it by its
      // thread, which runs up past the eye, so only the horizontal distance counts
      const need = y < 3 ? 3.5 : 2.6;
      for (const dT of [-0.4, 0, 0.4]) {
        const Tc = clamp((Z0 - z) / V + dT, 0, DUR), cx = camX(Tc), cy = camY(Tc), dx = Math.abs(x - cx), bottom = y - r;
        const d = bottom > cy ? Math.hypot(dx, bottom - cy) : dx - r;
        if (d < need) return false;
      }
      // the gap round the ring at the far end (the ring reads against dark)
      if (Math.abs(z - PZ) < 7 && Math.hypot(x, y - PR) < HOOP_R + 1.3) return false;
      // the bird's route: never through an orb or its thread, and sparse near it
      for (const s of birdSamples) {
        const hd = Math.hypot(x - s.x, z - s.z);
        if (hd < r + 0.6 && s.y > y - r - 0.5) return false;
        if (Math.hypot(hd, s.y - y) < r + 1.1) return false;
      }
      // the perch orb's own room (it swings)
      if (Math.hypot(x - PERCH.x, z - PERCH.z) < 1.6 + r) return false;
      // a clear sight line from the camera to the perch for T 12-15.3, so no orb hides the landing
      for (let Tq = 12; Tq <= 15.3; Tq += 0.25) {
        const ax = camX(Tq), ay = camY(Tq), az = Z0 - V * Tq, bx = PERCH.x - ax, by = PERCH.y0 + 0.4 - ay, bz = PERCH.z - az, L2 = bx * bx + by * by + bz * bz;
        const f = clamp(((x - ax) * bx + (y - ay) * by + (z - az) * bz) / L2, 0, 1), ex = ax + bx * f - x, ey = ay + by * f - y, ez = az + bz * f - z;
        if (Math.sqrt(ex * ex + ey * ey + ez * ez) < 0.8 + r) return false;
      }
      for (const o of od) { const dx = o.x - x, dy = o.y - y, dz = o.z - z; if (dx * dx + dy * dy + dz * dz < (o.r + r + 0.14) ** 2) return false; }
      return true;
    };
    const skewR = () => 0.08 + 0.37 * Math.pow(R(), 2.3);   // mostly small, a few large
    const randY = () => 1.1 + (H - 3.0) * Math.pow(R(), 0.8);
    const addOrb = (x, y, z, r) => od.push({ x, y, z, r, slot: R() < 0.5 ? 0 : 1, h: R(), ph: R() * TAU, br: R.range(0.1, 0.2), sw: R.range(0.6, 1.4), far: 1 - 0.65 * smoothstep(-120, Z_FAR, z) });
    const ON_HANG = 520;
    for (let tries = 0; od.length < ON_HANG && tries < 9000; tries++) {
      const x = R.range(-W + 0.3, W - 0.3), z = R.range(Z_NEAR, Z_FAR), y = randY(), r = skewR();
      if (!clearOf(x, y, z, r)) continue;
      addOrb(x, y, z, r);
      if (R() < 0.3) {   // a loose cluster of 3 to 7 at mixed heights
        const n = 2 + Math.floor(R() * 5);
        for (let c = 0, made = 0; c < n * 4 && made < n && od.length < ON_HANG; c++) {
          const cx = x + R.range(-0.9, 0.9), cz = z + R.range(-0.9, 0.9), cy = y + R.range(-1.3, 1.3), cr = 0.07 + 0.2 * Math.pow(R(), 2);
          if (clearOf(cx, cy, cz, cr)) { addOrb(cx, cy, cz, cr); made++; }
        }
      }
      if ((tries & 511) === 0) await tick();
    }
    const NH = od.length;      // hanging orbs (each with a thread)
    // the perch orb: a larger orb of dusk pink, hanging 4 m right of the path
    const PERCH_I = od.length; od.push({ x: PERCH.x, y: PERCH.y0, z: PERCH.z, r: PERCH.r, slot: 0, h: 0.7, ph: 1.3, br: 0.14, sw: 0, far: 1, perch: true });
    const NT = od.length;      // orbs with threads
    // the hoop at the far end: small orbs strung round the portal, the same orbs as the room
    const HOOP_N = 64;
    for (let i = 0; i < HOOP_N; i++) {
      const a = (i / HOOP_N) * TAU + R.range(-0.01, 0.01), rr = 0.1 + 0.07 * (i % 3 === 0 ? 1 : R() * 0.5);
      od.push({ x: Math.cos(a) * HOOP_R, y: PR + Math.sin(a) * HOOP_R, z: PZ, r: rr, slot: i % 2, h: (i / HOOP_N), ph: a, br: 0.12, sw: 0, far: 1, hoop: true, a });
    }
    const ON = od.length;
    await tick();

    // orb cores (matcap glass, the light is in the core) and a soft halo shell (additive, at 1.9x the radius, sharing the
    // cores' instance matrices and colours). Coarser spheres for the copies further off.
    const orbGeo = [own(new THREE.SphereGeometry(1, 16, 11)), own(new THREE.SphereGeometry(1, 11, 8)), own(new THREE.SphereGeometry(1, 8, 6))];
    const geoFor = (n) => orbGeo[Math.min(2, n)];
    const haloGeo = own(new THREE.SphereGeometry(1, 10, 7));
    const orbMat = own(new THREE.MeshMatcapMaterial({ matcap: orbMC, color: '#ffffff' }));
    const orbs = new THREE.InstancedMesh(orbGeo[0], orbMat, ON);
    for (let i = 0; i < ON; i++) { orbs.setColorAt(i, _c.setRGB(1, 1, 1)); }
    orbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); orbs.instanceColor.setUsage(THREE.DynamicDrawUsage);
    const HALO_VERT = /* glsl */`
      uniform float uScale; varying vec3 vCol; varying float vF;
      void main(){
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position * uScale, 1.0);
        vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vF = abs(dot(n, normalize(-mv.xyz))) * smoothstep(3.0, 8.0, -mv.z);   // no broad soft blobs from orbs passing close
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #else
          vCol = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * mv;
      }`;
    const HALO_FRAG = /* glsl */`
      uniform float uK; uniform vec3 uTint; varying vec3 vCol; varying float vF;
      void main(){ float a = pow(vF, 3.0); gl_FragColor = vec4(vCol * uTint * uK * a, 1.0); }`;
    const makeHaloMat = (n) => new THREE.ShaderMaterial({ uniforms: { uScale: { value: 1.9 }, uK: { value: 0.28 }, uTint: { value: levelTint(n) } }, vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const haloMat = own(makeHaloMat(0));
    const halos = new THREE.InstancedMesh(haloGeo, haloMat, ON);
    halos.instanceMatrix = orbs.instanceMatrix; halos.instanceColor = orbs.instanceColor;

    // threads: from each orb's top to the ceiling
    const thrPos = new Float32Array(NT * 6);
    const thrG = own(new THREE.BufferGeometry()); thrG.setAttribute('position', new THREE.BufferAttribute(thrPos, 3));
    thrG.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const thrMat = own(new THREE.LineBasicMaterial({ color: '#6a6084', transparent: true, opacity: 0.35, depthWrite: false }));
    const threads = new THREE.LineSegments(thrG, thrMat);

    // the hoop itself: one thin dark ring that the orbs are strung on, standing in the water
    const hoopG = own(new THREE.TorusGeometry(HOOP_R, 0.032, 6, 160));
    const hoopMat = own(new THREE.MeshMatcapMaterial({ matcap: metalMC, color: '#c8bcd8' }));
    const hoop = new THREE.Mesh(hoopG, hoopMat); hoop.position.set(0, PR, PZ);

    // =================================================================================================================
    // THE WALKWAY: matte black lacquer slabs 0.9 x 1.6 m with 4 cm gaps, following the camera's S, 4 cm over the water,
    // each turned and lifted a little; thin rims along their long edges catch the orbs' colours
    // =================================================================================================================
    const SLAB_L = 1.6, SLAB_GAP = 0.04, SLAB_W = 0.9, SLAB_T = 0.05;
    const slabG = own(new THREE.BoxGeometry(SLAB_W, SLAB_T, SLAB_L));
    const POOLS = 24, poolP = [], poolC = []; for (let i = 0; i < POOLS; i++) { poolP.push(new THREE.Vector4(0, -999, 5, 0)); poolC.push(new THREE.Color(0, 0, 0)); }
    const SLAB_VERT = /* glsl */`varying vec3 vL, vW, vN, vTint;
      void main(){ vec4 l = instanceMatrix * vec4(position, 1.0); vL = l.xyz; vec4 w = modelMatrix * l; vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        #ifdef USE_INSTANCING_COLOR
          vTint = instanceColor;
        #else
          vTint = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * viewMatrix * w; }`;
    const SLAB_FRAG = /* glsl */`uniform vec4 uPool[24]; uniform vec3 uPoolC[24]; uniform vec3 uDim; uniform float uTime; varying vec3 vL, vW, vN, vTint;
      void main(){
        vec3 V = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
        vec3 pool = vec3(0.0);
        for (int i = 0; i < 24; i++) { vec4 q = uPool[i]; vec2 dd = vL.xz - q.xy; float R = 0.45 + 0.2 * q.z; pool += uPoolC[i] * q.w * exp(-dot(dd, dd) / (R * R)); }
        // a slow uneven sheen across each slab, so no two read alike
        float sh = 0.5 + 0.5 * sin(vL.z * 1.3 + vL.x * 2.7 + uTime * 0.2);
        vec3 col = vTint * (0.02 + 0.035 * fr + 0.03 * sh) + pool * 3.0;   // the light is the orbs' pooled light, not a glowing strip
        gl_FragColor = vec4(col * uDim, 0.58);
      }`;
    const slabU = { uPool: { value: poolP }, uPoolC: { value: poolC }, uTime: { value: 0 } };
    const makeSlabMat = (n) => new THREE.ShaderMaterial({ uniforms: { ...slabU, uDim: { value: levelTint(n) } }, vertexShader: SLAB_VERT, fragmentShader: SLAB_FRAG, transparent: true, depthWrite: true });
    const slabMat = own(makeSlabMat(0));   // glossy lacquer: the water's reflection shows through, with the light of the orbs pooled on it   // glossy lacquer: the water's reflection shows through, tinted by the orbs near it
    const rimG = own(new THREE.BoxGeometry(0.014, 0.014, SLAB_L - 0.06));
    const rimMat = own(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const slabs = [];
    for (let z = Z0 + 6; z > PZ - 0.5; z -= SLAB_L + SLAB_GAP) {
      const T = (Z0 - z) / V, x = camX(clamp(T, 0, DUR)), xa = camX(clamp(T + 0.1, 0, DUR));
      const yaw = Math.atan2(-(xa - x), V * 0.1) + R.range(-1.5, 1.5) * Math.PI / 180;
      slabs.push({ x, z, yaw, lift: R.range(-0.01, 0.01), roll: R.range(-0.4, 0.4) * Math.PI / 180, slot: R() < 0.5 ? 0 : 1 });
    }
    const SN = slabs.length;
    const slabIM = new THREE.InstancedMesh(slabG, slabMat, SN); slabIM.renderOrder = 3; for (let i = 0; i < SN; i++) slabIM.setColorAt(i, _c.setRGB(1, 1, 1));
    const rimIM = new THREE.InstancedMesh(rimG, rimMat, SN * 2); rimIM.visible = false;   // off: the slabs carry the colour
    {
      const e = new THREE.Euler(), off = new THREE.Vector3();
      slabs.forEach((s, i) => {
        e.set(0, s.yaw, s.roll); _q.setFromEuler(e);
        _p.set(s.x, 0.04 + SLAB_T / 2 + s.lift, s.z); slabIM.setMatrixAt(i, _m.compose(_p, _q, _s.set(1, 1, 1)));
        for (const side of [-1, 1]) {
          // a glint of an orb's colour along part of the edge only (a short stretch, or none), never one long line
          const len = R() < 0.35 ? 0.001 : R.range(0.15, 0.6), at = R.range(-0.5, 0.5) * (1 - len) * (SLAB_L - 0.06);
          off.set(side * (SLAB_W / 2 - 0.004), SLAB_T / 2 + 0.002, at).applyQuaternion(_q);
          rimIM.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), _m.compose(_p.set(s.x, 0.04 + SLAB_T / 2 + s.lift, s.z).add(off), _q, _s.set(1, 1, len)));
          const k = R.range(0.1, 0.24), col = side > 0 ? (s.slot ? C.teal : C.blue) : (s.slot ? C.ochre : C.pink);
          rimIM.setColorAt(i * 2 + (side > 0 ? 1 : 0), _c.copy(col).multiplyScalar(k));
        }
      });
      rimIM.instanceColor.needsUpdate = true;
    }
    await tick();

    // =================================================================================================================
    // MIRROR SEAMS: thin dark seams between panels of uneven width (1.1 to 1.7 m) on both walls, and across the ceiling
    // =================================================================================================================
    const seamZ = []; for (let z = Z_NEAR + 2; z > Z_FAR - 4; z -= R.range(1.1, 1.7)) seamZ.push(z);
    const seamG = own(new THREE.BoxGeometry(1, 1, 1));
    const seamMat = own(new THREE.MeshBasicMaterial({ color: '#0c0b14' }));
    const SEAMS = seamZ.length * 3 + 4;
    const seams = new THREE.InstancedMesh(seamG, seamMat, SEAMS);
    {
      let i = 0;
      for (const z of seamZ) {
        for (const sx of [-1, 1]) { _p.set(sx * (W - 0.01), H / 2, z); _q.identity(); seams.setMatrixAt(i++, _m.compose(_p, _q, _s.set(0.02, H, 0.022))); }
        _p.set(0, H - 0.01, z); _q.identity(); seams.setMatrixAt(i++, _m.compose(_p, _q, _s.set(2 * W, 0.02, 0.022)));
      }
      // the long seams where the walls meet the ceiling and the water
      seams.count = i;
    }

    // =================================================================================================================
    // THE BASE HALL, and the lattice of reflected copies.
    // Across the walls (at x = +-W) image k is x' = (-1)^k x + 2kW. Across water and ceiling (y = 0 and y = H) image j
    // is y' = (-1)^j (y - H/2) + jH + H/2: j = -1 is the water's reflection (y' = -y), j = 1 the ceiling's (2H - y).
    // =================================================================================================================
    const base = new THREE.Group(); base.name = 'hall';
    base.add(orbs, halos, threads, slabIM, rimIM, seams, hoop, bird);
    halos.renderOrder = 3; threads.renderOrder = 3;
    base.traverse((o) => { o.frustumCulled = false; });
    scene.add(base);
    const cells = [];
    const pivot = new THREE.Vector3(), jit = new THREE.Matrix4(), tmpM = new THREE.Matrix4(), e = new THREE.Euler();
    for (let k = -KX; k <= KX; k++) for (let j = -KY; j <= KY; j++) {
      if (k === 0 && j === 0) continue;
      const n = Math.abs(k) + Math.abs(j), sx = (k & 1) ? -1 : 1, sy = (j & 1) ? -1 : 1;
      const g = new THREE.Group(); g.matrixAutoUpdate = false;
      g.matrix.makeScale(sx, sy, 1); g.matrix.setPosition(2 * k * W, H / 2 + j * H - sy * H / 2, 0);
      // a real mirror room is never quite true: each copy is turned by a fraction of a degree about its own middle
      // (the water is level, so its reflection is not)
      if (!(k === 0 && j === -1)) {
        pivot.set(2 * k * W, H / 2 + j * H, -40);
        e.set(R.range(-0.2, 0.2) * Math.PI / 180, R.range(-0.25, 0.25) * Math.PI / 180, 0);
        jit.makeTranslation(pivot.x, pivot.y, pivot.z).multiply(tmpM.makeRotationFromEuler(e)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
        g.matrix.premultiply(jit);
      }
      const ro = orderOf(j);
      const nl = j === -1 ? Math.abs(k) + 0.25 : j === 1 ? Math.abs(k) + 0.5 : n;   // the ceiling mirror nearly as bright: it shows the lit floor overhead   // the water is a near-perfect mirror: its row of copies is barely dimmed
      const water = k === 0 && j === -1, cn = water ? ON : NT;   // the hoop is not copied by the mirrors (only its reflection in the water)
      const cOrbs = new THREE.InstancedMesh(geoFor(n), atLevel('orb', orbMat, nl), ON); cOrbs.instanceMatrix = orbs.instanceMatrix; cOrbs.instanceColor = orbs.instanceColor; cOrbs.count = cn;
      const cHalo = new THREE.InstancedMesh(haloGeo, atLevel('halo', haloMat, nl, makeHaloMat), ON); cHalo.instanceMatrix = orbs.instanceMatrix; cHalo.instanceColor = orbs.instanceColor; cHalo.count = cn; cHalo.renderOrder = ro;
      const cThr = new THREE.LineSegments(thrG, atLevel('thr', thrMat, nl)); cThr.renderOrder = ro;
      const cSlab = new THREE.InstancedMesh(slabG, atLevel('slab', slabMat, n, makeSlabMat), SN); cSlab.instanceMatrix = slabIM.instanceMatrix; cSlab.instanceColor = slabIM.instanceColor; cSlab.renderOrder = ro;
      const cRim = new THREE.InstancedMesh(rimG, atLevel('rim', rimMat, nl), SN * 2); cRim.instanceMatrix = rimIM.instanceMatrix; cRim.instanceColor = rimIM.instanceColor; cRim.visible = false;
      const cSeam = new THREE.InstancedMesh(seamG, atLevel('seam', seamMat, n), SEAMS); cSeam.instanceMatrix = seams.instanceMatrix; cSeam.count = seams.count;
      const cHoop = new THREE.Mesh(hoopG, atLevel('hoop', hoopMat, n)); cHoop.position.copy(hoop.position);
      const cBird = bird.clone(true); const bm = atLevel('bird', birdMat, n, (m) => { const c = birdMat.clone(); c.color.setScalar(Math.pow(0.8, m)); return c; });   // the bird's copies fade slowly: the flock cBird.traverse((o) => { if (o.isMesh) o.material = bm; });
      const nodes = []; cBird.traverse((o) => nodes.push(o));
      for (const o of [cOrbs, cHalo, cThr, cRim, cBird]) g.add(o);
      if (j !== -1) g.add(cSlab);       // under the water the slabs are left out, so the glossy slabs show the orbs' reflection
      if (n <= 1 && j >= 0) g.add(cSeam);   // seams only in the nearest copies: the mirrors show orbs repeating, not their frames
      if (water) g.add(cHoop);
      g.traverse((o) => { o.frustumCulled = false; });
      g.matrixWorldNeedsUpdate = true;
      scene.add(g); cells.push({ g, k, j, n, nodes });
      if (cells.length % 8 === 0) await tick();
    }

    // =================================================================================================================
    // THE WATER: a dark sheet over the floor's reflection (cell j = -1), more opaque looking down, thinner at a grazing
    // look so the reflected orbs show; ripple rings from the bird's dip. x is folded across the mirror walls in the
    // shader, so every reflected copy of the water carries its own copy of each ring. The same sheet stands at y = 2H
    // (the floor seen in the ceiling) and y = -2H.
    // =================================================================================================================
    const ringU = []; for (let i = 0; i < 6; i++) ringU.push(new THREE.Vector4(0, 0, -99, 0));
        const waterU = { uPool: { value: poolP }, uPoolC: { value: poolC }, uT: { value: 0 }, uTime: { value: 0 }, uRings: { value: ringU }, uCrest: { value: new THREE.Color() }, uBase: { value: new THREE.Color('#05040c') } };
    const WATER_VERT = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
    const WATER_FRAG = /* glsl */`
      uniform float uT, uTime, uJ, uY; uniform vec4 uRings[6]; uniform vec4 uPool[${24}]; uniform vec3 uPoolC[${24}]; uniform vec3 uCrest, uBase; varying vec3 vW;
      const float W = ${W.toFixed(1)};
      float foldX(float x){ float y = mod(x + W, 4.0 * W); return W - abs(y - 2.0 * W); }
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        float cosT = abs(V.y);
        float k = floor((vW.x + W) / (2.0 * W) + 0.0);   // which copy across the walls this stretch of water is
        float n = abs(k) + uJ, dim = pow(${DIM.toFixed(3)}, n);
        vec2 p = vec2(foldX(vW.x), vW.z);
        // ripple rings: a travelling crest train behind each front
        float h = 0.0, sl = 0.0;
        for (int i = 0; i < 6; i++) {
          vec4 r = uRings[i]; float age = uT - r.z; if (age <= 0.0 || r.w <= 0.0) continue;
          float d = length(p - r.xy), s = d - 1.6 * age;
          float env = exp(-s * s * 0.9) * r.w * exp(-age * 0.32) * smoothstep(0.0, 0.25, age) * smoothstep(-0.2, 0.6, d);
          float ph = s * 20.0; h += env * sin(ph); sl += env * pow(max(sin(ph), 0.0), 8.0);   // two or three thin crests
        }
        // a slow breath over the whole surface, so the reflection never sits dead still
        float amb = 0.5 + 0.5 * sin(vW.x * 2.1 + uTime * 0.55) * sin(vW.z * 1.7 - uTime * 0.4);
        float a = mix(0.1, 0.35, pow(cosT, 0.7));       // looking down: dark water; at a grazing look: the reflection
        a = clamp(a - 0.12 * amb * (1.0 - cosT) + 0.22 * h, 0.0, 0.92);   // the reflection shivers in rings: the sheet thickens and thins with the ripple
        vec3 col = uBase + uCrest * sl * 0.15 / max(a, 0.1) + uCrest * 0.025 * amb;
        // light pooling on the water under the nearest orbs (x folded, so every mirrored floor has its pools too)
        vec3 pool = vec3(0.0);
        for (int i = 0; i < ${24}; i++) { vec4 q = uPool[i]; vec2 dd = p - q.xy; float R = 0.3 + 0.14 * q.z; pool += uPoolC[i] * q.w * exp(-dot(dd, dd) / (R * R)) * (0.8 + 0.4 * amb); }
        float pl = dot(pool, vec3(0.3, 0.5, 0.2));
        gl_FragColor = vec4((col + pool / max(a + 0.25 * pl, 0.05)) * dim, clamp(a + 0.25 * pl, 0.0, 0.95));
      }`;
    const waterPlane = (y, J, flip) => {
      const m = own(new THREE.ShaderMaterial({ uniforms: { ...waterU, uJ: { value: J }, uY: { value: y } }, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      const span = (2 * KX + 1) * 2 * W;
      const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(span, Z_NEAR - Z_FAR + 40).rotateX(-Math.PI / 2)), m);
      mesh.position.set(0, y, (Z_NEAR + Z_FAR) / 2); mesh.renderOrder = 2; mesh.frustumCulled = false; if (flip) mesh.scale.y = -1;
      scene.add(mesh); return mesh;
    };
    waterPlane(0, 0); waterPlane(2 * H, 0.5); waterPlane(-2 * H, 2);
    // the dip's rings (x, z, start T, strength); one faint old ring is already spreading when we arrive
    const DIP = new THREE.Vector3(); birdAt(2.8, DIP);
    const RINGS = [[-1.6, 19.5, -1.2, 0.45], [DIP.x, DIP.z, 2.8, 1.0], [DIP.x + 0.05, DIP.z - 0.12, 3.02, 0.6], [DIP.x + 0.1, DIP.z - 0.3, 3.3, 0.35], [DIP.x + 0.35, DIP.z - 2.2, 3.12, 0.4], [DIP.x - 0.2, DIP.z + 1.1, 2.62, 0.22]];
    RINGS.forEach((r, i) => ringU[i].set(r[0], r[1], r[2], r[3]));

    // =================================================================================================================
    // LOW MIST: a few faint drifting sheets a hand or two over the water, to soften the water line and the far end
    // =================================================================================================================
    const mistC = mkCanvas(256);
    {
      const g = mistC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 140; i++) {
        const x = R() * 256, y = R() * 256, r = 18 + R() * 46, a = 0.05 + R() * 0.1;
        for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
          const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r);
        }
      }
    }
    const mistT = own(new THREE.CanvasTexture(mistC)); mistT.wrapS = mistT.wrapT = THREE.RepeatWrapping;
    const mists = [];
    // a faint coloured haze high under the ceiling (about 4%), so the top of the frame is never dead black
    for (const [y, op] of [[H - 0.6, 0.05], [H - 2.2, 0.035]]) {
      const t = own(mistT.clone()); t.needsUpdate = true; t.repeat.set(1.2, 10); t.offset.set(R(), R());
      const m = own(new THREE.MeshBasicMaterial({ color: '#8070c0', alphaMap: t, transparent: true, opacity: op * 8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.color.multiplyScalar(0.25);
      const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(2 * W, Z_NEAR - Z_FAR).rotateX(-Math.PI / 2)), m);
      mesh.position.set(0, y, (Z_NEAR + Z_FAR) / 2); mesh.renderOrder = 4; mesh.frustumCulled = false; scene.add(mesh);
      mists.push({ m, base: m.color.clone(), t, vx: R.range(-0.003, 0.003), vz: -0.003 });
    }
    [[0.32, '#8a86c0', 0.06], [0.52, '#7a90b8', 0.05], [0.78, '#a088b0', 0.04]].forEach(([y, col, op], i) => {
      const t = own(mistT.clone()); t.needsUpdate = true; t.repeat.set(1.5, 14); t.offset.set(R(), R());
      const m = own(new THREE.MeshBasicMaterial({ color: col, alphaMap: t, transparent: true, opacity: op * 8, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.color.multiplyScalar(0.2);
      const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(2 * W, Z_NEAR - Z_FAR).rotateX(-Math.PI / 2)), m);
      mesh.position.set(0, y, (Z_NEAR + Z_FAR) / 2); mesh.renderOrder = 4; mesh.frustumCulled = false; scene.add(mesh);
      mists.push({ m, base: m.color.clone(), t, vx: R.range(-0.004, 0.004), vz: 0.004 + i * 0.002 });
    });

    // =================================================================================================================
    // MOTES: tiny dust in the palette's colours, drifting in the light round the camera (slow, no twinkle)
    // =================================================================================================================
    const time = { value: 0 };
    const motes = fx.makeParticles({ rng: R.fork('motes'), preset: 'dust', time, count: 900, box: [10, 7, 30], colors: [PAL.blue, PAL.teal, PAL.pink], size: [0.012, 0.032], intensity: 0.8, opacity: 0.55, twinkle: 0, velocity: [0.05, 0.02, 0.03], turbulence: [0.15, 0.1, 0.12] });
    scene.add(motes.object);
    await tick();

    // =================================================================================================================
    // the frame's state
    // =================================================================================================================
    const bp = new THREE.Vector3(), bq = new THREE.Vector3(), bm2 = new THREE.Vector3(), fw = new THREE.Vector3(), up = new THREE.Vector3(), rt = new THREE.Vector3(), acc = new THREE.Vector3();
    const qFly = new THREE.Quaternion(), qPerch = new THREE.Quaternion(), basis = new THREE.Matrix4(), Y = new THREE.Vector3(0, 1, 0);
    const swingDir = new THREE.Vector3(PERCH.x - 2.3, 0, PERCH.z + 54.5).normalize();
    const PEND_L = H - PERCH.y0;
    const perchSwing = (T) => {
      let th = 0;
      if (T > PERCH.T0) { const s = T - PERCH.T0; th += 0.12 * Math.exp(-s / 2.6) * Math.sin(TAU * 0.3 * s); }
      if (T > PERCH.T1) { const s = T - PERCH.T1; th -= 0.08 * Math.exp(-s / 2.6) * Math.sin(TAU * 0.3 * s); }
      return th;
    };
    const perchPos = (T, out) => { const th = perchSwing(T); return out.set(PERCH.x + swingDir.x * PEND_L * Math.sin(th), H - PEND_L * Math.cos(th), PERCH.z + swingDir.z * PEND_L * Math.sin(th)); };
    {
      // perched: facing a little left of straight down the hall, head up a touch
      fw.set(-0.35, 0.12, -1).normalize(); rt.crossVectors(Y, fw).normalize(); up.crossVectors(fw, rt);
      qPerch.setFromRotationMatrix(basis.makeBasis(rt, up, fw));
    }
    const orbPos = new THREE.Vector3(), WHITE = new THREE.Color(1, 1, 1);
    const weatherOf = (T, z, t) => clamp(smoothstep(7, 12, T) + 0.22 * Math.sin(z * 0.045 - t * 0.3), 0, 1);

    const pose = (T, t) => {
      // ---- the swallow ----
      birdAt(T, bp);
      const perched = T >= PERCH.T0 && T <= PERCH.T1;
      if (perched || (T > PERCH.T0 - 0.4 && T < PERCH.T1 + 0.3)) {
        perchPos(T, orbPos);
        const blend = smoothstep(PERCH.T0 - 0.4, PERCH.T0, T) * (1 - smoothstep(PERCH.T1, PERCH.T1 + 0.3, T));
        bp.x += (orbPos.x - PERCH.x) * blend; bp.y += (orbPos.y + PERCH.r + 0.012 - PERCH_Y) * blend; bp.z += (orbPos.z - PERCH.z) * blend;
      }
      // heading from the route ahead; bank from the sideways pull of the turn (the lift leans into it)
      birdAt(T + 0.06, bq); birdAt(Math.max(0, T - 0.06), bm2);
      fw.subVectors(bq, birdAt(T, acc)).normalize();
      if (!isFinite(fw.x) || fw.lengthSq() < 0.5) fw.set(0, 0, -1);
      acc.copy(bq).add(bm2).addScaledVector(birdAt(T, rt), -2).multiplyScalar(1 / (0.06 * 0.06));
      if (T < 0.07) acc.set(0, 0, 0);
      acc.addScaledVector(fw, -acc.dot(fw));
      if (acc.length() > 11) acc.setLength(11);
      up.copy(Y).multiplyScalar(9.8).add(acc).normalize();
      rt.crossVectors(up, fw).normalize(); up.crossVectors(fw, rt);
      qFly.setFromRotationMatrix(basis.makeBasis(rt, up, fw));
      const pw = smoothstep(PERCH.T0 - 0.35, PERCH.T0, T) * (1 - smoothstep(PERCH.T1, PERCH.T1 + 0.25, T));
      bird.quaternion.copy(qFly).slerp(qPerch, pw);
      bird.position.copy(bp);
      bird.visible = bp.z > PZ - 0.6;
      // ---- the wings: bursts of about 8 Hz, glides between; folded along the back when perched ----
      const fa = flapAmount(T), beat = Math.sin(TAU * 8.2 * t), fold = pw;
      const flap = (0.08 + fa * 0.95 * beat) * (1 - fold), flex = (fa * 0.45 * Math.sin(TAU * 8.2 * t - 0.9)) * (1 - fold);
      for (const [w, s] of [[wR, 1], [wL, -1]]) {
        w.sh.rotation.set(-0.05 * fold, s * (0.18 + 1.25 * fold), s * (flap - 0.35 * fold), 'YXZ');
        w.wr.rotation.set(0, s * (0.05 + 0.5 * fold), s * flex, 'YXZ');
      }
      tail.rotation.set(0.12 * (1 - fa) * (1 - fold) - 0.1 * fold, 0, 0);
      birdBody.rotation.x = -0.05 * fold;   // perched, the body sits a little nose-up
      bird.updateMatrix();
      for (const c of cells) {
        for (let i = 0; i < birdNodes.length; i++) { const a = birdNodes[i], b = c.nodes[i]; b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); }
        c.nodes[0].visible = bird.visible;
      }

      // ---- the orbs: a slow drift on their threads, breathing, the colour weather, the hook's single wave ----
      const wave = T > WAVE_T && T < 8 ? WAVE_SPEED * (T - WAVE_T) : -999;
      for (let i = 0; i < ON; i++) {
        const d = od[i];
        let x = d.x, y = d.y, z = d.z;
        if (d.perch) { perchPos(T, orbPos); x = orbPos.x; y = orbPos.y; z = orbPos.z; }
        else if (!d.hoop) { const kk = 0.4 + 1.2 * (H - d.y) / H; x += 0.05 * kk * d.sw * Math.sin(t * 0.42 + d.ph); z += 0.04 * kk * d.sw * Math.sin(t * 0.31 + d.ph * 1.7); }
        _p.set(x, y, z); _q.identity(); _s.setScalar(d.r); orbs.setMatrixAt(i, _m.compose(_p, _q, _s));
        if (i < NT) { const o = i * 6; thrPos[o] = x; thrPos[o + 1] = y + d.r; thrPos[o + 2] = z; thrPos[o + 3] = d.perch ? PERCH.x : x; thrPos[o + 4] = H; thrPos[o + 5] = d.perch ? PERCH.z : z; }
        const w = clamp(weatherOf(T, z, t) + (d.h - 0.5) * 0.35, 0, 1);
        const cool = d.slot ? C.teal : C.blue, warm = d.slot ? C.ochre : C.pink;
        _c.copy(cool).lerp(warm, w);
        if (d.hoop) _c.lerp(C.pink, 0.45);
        const breath = 0.5 + 0.5 * Math.sin(TAU * d.br * t + d.ph);
        let k = (1.9 + 0.35 * breath) * d.far;
        if (wave > -100) { const s = (Z0 - z) - wave; k *= 1 + 0.75 * Math.exp(-(s * s) / (2 * WAVE_W * WAVE_W)) * (1 - smoothstep(4, 8, T)); }
        if (d.hoop) k *= 0.9 + 0.25 * Math.sin(d.a * 3 - t * 0.6);
        // the landing: a sphere of light spreads out from the perch orb through the room (and every copy) at 9 m/s
        if (T > PERCH.T0 && T < 16.5) { const dd = Math.hypot(x - PERCH.x, y - PERCH.y0, z - PERCH.z), s = dd - 9 * (T - PERCH.T0); k *= 1 + 1.5 * Math.exp(-(s * s) / 3) * (1 - smoothstep(14.8, 16.5, T)); }
        // as the swallow nears the ring, a warm wave comes back up the hall from it, toward us, at 22 m/s
        if (T > 16.4) { const s = (z - PZ) - 22 * (T - 16.4); const e = Math.exp(-(s * s) / 18); k *= 1 + 0.8 * e; _c.lerp(C.ochre, 0.6 * e); }
        if (d.perch && T > PERCH.T0) k *= 1 + 0.6 * Math.exp(-(T - PERCH.T0) * 1.2);
        orbs.setColorAt(i, _c.multiplyScalar(k));
      }
      orbs.instanceMatrix.needsUpdate = true; orbs.instanceColor.needsUpdate = true; thrG.attributes.position.needsUpdate = true;

      // ---- water, mist, motes ----
      waterU.uT.value = T; waterU.uTime.value = t;
      // the pools: the brightest nearby orbs, by size over height
      {
        const cz = Z0 - V * T, cand = [];
        for (let i = 0; i < ON; i++) { const d = od[i]; if (d.z < cz - 45 || d.z > cz + 6 || d.y > 5) continue; cand.push([d.r / (0.6 + d.y * 0.35), i]); }
        cand.sort((a, b) => b[0] - a[0]);
        for (let q = 0; q < POOLS; q++) {
          if (q >= cand.length) { poolP[q].w = 0; continue; }
          const i = cand[q][1], d = od[i]; orbs.getMatrixAt(i, _m); _p.setFromMatrixPosition(_m);
          poolP[q].set(_p.x, _p.z, _p.y, Math.min(0.1, cand[q][0] * 0.3)); orbs.getColorAt(i, poolC[q]);
        }
      }
      const wC = _c.copy(C.teal).lerp(C.pink, smoothstep(7, 12, T));
      birdMat.color.setRGB(1, 1, 1).lerp(wC, 0.35).multiplyScalar(1.15); slabU.uTime.value = t;
      wC.multiplyScalar(0.2); for (const m of mists) m.m.color.copy(m.base).lerp(wC, 0.5);   // the mist catches the room's colour (scaled as the mist is)
      for (let i = 0; i < SN; i++) { const sw = weatherOf(T, slabs[i].z, t); slabIM.setColorAt(i, _c.copy(slabs[i].slot ? C.teal : C.blue).lerp(slabs[i].slot ? C.ochre : C.pink, sw).lerp(WHITE, 0.45).multiplyScalar(0.8)); }
      slabIM.instanceColor.needsUpdate = true;
      waterU.uCrest.value.copy(C.teal).lerp(C.pink, smoothstep(7, 12, T)).multiplyScalar(0.9);
    };

    pose(0, 0);
    await tick();

    // a look at the swallow (its position at the look's moment), or at one of its mirror images
    const birdLook = (img = 0) => (tm, uu) => { const T = clamp(uu, 0, 1) * DUR, v = birdAt(T, new THREE.Vector3()); if (T >= PERCH.T0 - 0.4 && T <= PERCH.T1 + 0.3) { perchPos(T, orbPos); v.y = orbPos.y + PERCH.r; v.x = orbPos.x; v.z = orbPos.z; } return img ? [-2 * W - v.x, v.y, v.z] : [v.x, v.y, v.z]; };
    const U = (T) => T / DUR;
    // out through the left mirror: about 74 deg of yaw toward x = -16 at the bird's depth (sideways, never backward), where
    // its copies across the left mirrors (x -7.6, -22, -28, -42) stand side by side, each a reflection smaller and dimmer
    const sideLook = (tm, uu) => { const T = clamp(uu, 0, 1) * DUR, c = camAt(T), v = birdAt(T, new THREE.Vector3()); return [c[0] - 16, v.y + 0.3, Math.min(v.z, c[2] - 3)]; };
    // the climb: toward the bird's bearing, pitched 22 deg up at first and 40 deg by T 9.2
    const climbLook = (tm, uu) => { const T = clamp(uu, 0, 1) * DUR, c = camAt(T), v = birdAt(T, new THREE.Vector3()); const dx = v.x - c[0], dz = v.z - c[2], dh = Math.max(4, Math.hypot(dx, dz)); const pitch = (12 + 10 * smoothstep(7.3, 9.2, T)) * Math.PI / 180; return [c[0] + dx, c[1] + dh * Math.tan(pitch), c[2] + dz]; };
    return {
      scene, path, duration: DUR, title: 'The Infinity Room', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 70, near: 0.15, nearThrough: 0.4, far: 700, lookAhead: 8, sway: 0.4, bank: 0.05 },
      pois: [
        { at: birdLook(), from: U(0), to: U(2.4), fade: 0.25, weight: 0.85 },                              // the swallow ahead
        { at: [DIP.x, 0, DIP.z - 0.4], from: U(2.6), to: U(4.6), fade: 0.3, weight: 0.7 },                // the rings of the drink
        { at: sideLook, from: U(4.5), to: U(7.0), fade: 0.35, weight: 1 },                                 // a real turn out through the left mirror: the bird's copies side by side
        { at: climbLook, from: U(7.3), to: U(11.4), fade: 0.25, weight: 1 },                               // the climb: the gaze tips up 22-40 deg, the ceiling copies stack as a column
        { at: birdLook(), from: U(12.2), to: U(15.3), fade: 0.2, weight: 1 },                         // the perched bird
        { at: birdLook(), from: U(15.2), to: U(19.4), fade: 0.15, weight: 0.85 },                         // it swoops past on the right
      ],
      portal: { shape: 'circle', style: 'ring', radius: PR, color: '#f0b6c8', veil: '#f0b6c8', glow: 0.55, halo: false, revealDistance: 700 },
      post: { exposure: 1.35, bloom: { strength: 0.3, radius: 0.5, threshold: 0.95 }, grade: { saturation: 1.05, contrast: 1.05, tint: '#fbf7ff', shadowTint: '#06040f', vignette: 0.3, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = clamp(u ?? 0, 0, 1) * DUR;
        pose(T, t);
        for (const m of mists) { m.t.offset.x += m.vx * dt; m.t.offset.y += m.vz * dt; }
        time.value = t; motes.update(dt, t);
      },
      dispose() { for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
