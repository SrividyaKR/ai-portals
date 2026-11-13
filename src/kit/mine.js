// Shared helpers for the extra worlds (terrain with baked light, a flapping bird, small utilities). Keeps each world file short.
import * as THREE from 'three';
import { makePath } from './core.js';

export const sm = (s) => s * s * (3 - 2 * s);
export const mkCanvas = (S) => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };

// deterministic value noise + fbm (independent of ctx.noise so heights can be queried anywhere)
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1); return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy; }
export function fbm(x, y, oct = 5, lac = 2.03, gain = 0.5) { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= gain; f *= lac; } return s / n; }
export function ridged(x, y, oct = 5) { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(vnoise(x * f + i * 5.7, y * f + i * 3.3) * 2 - 1); s += a * v * v; n += a; a *= 0.5; f *= 2.05; } return s / n; }

// a path from a function s -> [x,y,z], plus its numeric length
export function pathFrom(fn, n = 36) {
  const pts = []; for (let k = 0; k <= n; k++) pts.push(fn(k / n));
  const path = makePath(pts); let PL = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(); path.pointAt(0, a);
  for (let i = 1; i <= 400; i++) { path.pointAt(i / 400, b); PL += a.distanceTo(b); a.copy(b); }
  return { path, PL };
}

// terrain mesh: heights from heightFn(x,z); colour from colorFn(height, lit 0..1, slope 0..1, x, z, out THREE.Color); light baked from sunDir
export function makeTerrain({ size, seg, cx = 0, cz = 0, heightFn, colorFn, sun = [0.5, 0.6, 0.3], own }) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
  const p = g.attributes.position, n = p.count, H = new Float32Array(n);
  for (let i = 0; i < n; i++) { const y = heightFn(p.getX(i), p.getZ(i)); H[i] = y; p.setY(i, y); }
  const col = new Float32Array(n * 3), c = new THREE.Color(), sl = new THREE.Vector3(...sun).normalize(), e = size / seg;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), hx = heightFn(x + e, z) - heightFn(x - e, z), hz = heightFn(x, z + e) - heightFn(x, z - e);
    const nx = -hx, ny = 2 * e, nz = -hz, l = Math.hypot(nx, ny, nz), lit = Math.max(0, (nx * sl.x + ny * sl.y + nz * sl.z) / l), slope = 1 - ny / l;
    colorFn(H[i], lit, slope, x, z, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true })); m.frustumCulled = false;
  if (own) { own(g); own(m.material); }
  return m;
}

// a wing-flapping bird. Parts are simple but shaped: tapered body, S-neck, head and beak, tail wedge, and wings of an inner panel plus
// a swept outer panel with fanned primary feathers. pose({flap, glide, neckStretch, t}) moves it. Faces -Z when its rotation is 0? No: faces +Z.
export function makeBird({ body = '#3a3a44', belly = '#c06a3a', wing = '#4a4c58', feather = '#2a2a34', head = '#e8dccb', beakC = '#3a3a3a', scale = 1, own = (o) => o, span = 1.0, lit = false, beard = true }) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const M = (c) => own(new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const add = (geo, c, sx, sy, sz, x, y, z, par) => { const m = new THREE.Mesh(own(geo), M(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); (par || g).add(m); return m; };
  add(new THREE.SphereGeometry(1, 12, 9), body, 0.22, 0.2, 0.55, 0, 0, 0);
  add(new THREE.SphereGeometry(1, 10, 8), belly, 0.2, 0.12, 0.48, 0, -0.1, 0.02);
  const neck = add(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 8).rotateX(Math.PI / 2), head, 1, 1, 1, 0, 0.05, 0.6);
  const hd = add(new THREE.SphereGeometry(1, 10, 8), head, 0.11, 0.1, 0.15, 0, 0.08, 0.9);
  add(new THREE.BoxGeometry(0.16, 0.03, 0.05), '#1a1a1a', 1, 1, 1, 0, 0.1, 0.98);   // black eye band
  add(new THREE.ConeGeometry(0.045, 0.2, 6).rotateX(Math.PI / 2), beakC, 1, 1, 1, 0, 0.06, 1.1);
  if (beard) add(new THREE.ConeGeometry(0.02, 0.18, 5), '#222', 1, 1, 1, 0, -0.05, 1.02);   // the beard
  const tail = new THREE.Mesh(own(new THREE.BufferGeometry()), M(feather)); tail.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.4, -0.34, 0, -1.25, 0.34, 0, -1.25, 0, 0, -0.4, -0.2, 0, -1.4, 0.2, 0, -1.4], 3)); g.add(tail);
  const wings = [];
  const panel = (pts) => { const ge = own(new THREE.BufferGeometry()); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return ge; };
  const S = span;
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.16, 0.12, 0.25); g.add(sh);
    const inner = new THREE.Mesh(panel([0, 0, 0.2, 0, 0, -0.5, 1.1 * S, 0, -0.55, 0, 0, 0.2, 1.1 * S, 0, -0.55, 1.1 * S, 0, 0.0]), M(wing)); inner.scale.x = sx; sh.add(inner);
    const wr = new THREE.Group(); wr.position.set(sx * 1.1 * S, 0, -0.2); sh.add(wr);
    const outer = new THREE.Mesh(panel([0, 0, 0.2, 0, 0, -0.35, 0.9 * S, 0, -0.8, 0, 0, 0.2, 0.9 * S, 0, -0.8, 1.0 * S, 0, -0.25]), M(wing)); outer.scale.x = sx; wr.add(outer);
    const prim = [];
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(panel([0, 0, 0, 0.06, 0, -0.1, 0.6 * S, 0, -0.18 - i * 0.05, 0, 0, 0, 0.6 * S, 0, -0.18 - i * 0.05, 0.5 * S, 0, 0.08]), M(i % 2 ? feather : wing)); f.position.set(sx * (0.85 * S), 0, -0.1 - i * 0.07); f.scale.x = sx; f.rotation.y = sx * (0.1 + i * 0.07); wr.add(f); prim.push(f); }
    wings.push({ sh, wr, sx, prim });
  }
  g.scale.setScalar(scale);
  return {
    g, neck, hd,
    pose({ flap = 0, glide = 0, t = 0, dive = 0 }) {   // flap: wingbeat phase in radians; glide 0..1 holds wings out flat and still; dive 0..1 tucks them
      const open = 1 - dive * 0.8;
      for (const w of wings) {
        const a = glide >= 1 ? 0.05 * Math.sin(t * 1.2) : Math.sin(flap) * 0.7 * (1 - glide) + 0.08 * Math.sin(t * 1.3 + w.sx);
        w.sh.rotation.z = w.sx * (0.16 + a) - dive * w.sx * 1.2; w.wr.rotation.z = w.sx * (-0.22 + Math.sin(flap - 0.9) * 0.55 * (1 - glide) - dive * 0.9);
        w.sh.scale.set(open, 1, 1); for (let i = 0; i < w.prim.length; i++) w.prim[i].rotation.z = w.sx * (0.12 + 0.07 * i) * Math.sin(flap * 0.5 + i * 0.3 + 1) * (1 - glide);
      }
      tail.rotation.x = 0.05 * Math.sin(t * 2);
    },
  };
}

// standard sky config helper (same recipe the other worlds use) so each world only lists its colours
import { makeSky } from './sky.js';
export async function skyFor(ctx, scene, cfg) {
  const sky = makeSky({ rng: ctx.rng.fork('sky'), preset: cfg.preset || 'day', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer, scatter: 0, sunIntensity: 0, sunGlow: 0, sunElevation: -10, bodies: [], stars: cfg.stars || 0, milkyWay: 0, clouds2: false, ...cfg.sky });
  scene.add(sky.object);
  if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
  return sky;
}
