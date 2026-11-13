// THE CATHEDRAL THAT BLOOMS: deep under Wieliczka, Poland, a chamber of columns, chandeliers and walls carved from rock salt. You walk the
// nave over a floor of polished brine that mirrors everything. Ahead of you the salt wakes up: the carved crystal chandeliers swell and
// brighten as you approach, and salt flowers unfold on the walls in a rolling wave that runs down the nave toward a small glowing ring.
// The camera moves at constant speed, so the nave is laid out by distance: z = 20 - 7 T.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, pathFrom, skyFor } from '../kit/mine.js';

const DUR = 20, V = 7, ZEND = 20 - V * DUR, NL = 16, LZ0 = 8, LDZ = 12;
const camAt = (T) => [3.2 * Math.sin(T * 0.55), 1.75 + 0.5 * sm(Math.min(1, Math.max(0, (T - 15) / 5))), 20 - V * T];

export default {
  id: 'salt-cathedral',
  name: 'The Cathedral That Blooms',
  category: 'wilderness',
  weirdness: 0.7,
  media: ['cave', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path } = pathFrom((s) => camAt(s * DUR), 40); await tick();
    scene.background = new THREE.Color('#120c08'); scene.fog = new THREE.FogExp2(new THREE.Color('#2a1c12'), 0.011);
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
    const lampZ = []; for (let i = 0; i < NL; i++) lampZ.push(LZ0 - i * LDZ);
    // the nave shell: salt strata and pools of warm light around each chandelier
    const shellU = { uL: { value: lampZ.slice() }, uG: { value: new Array(NL).fill(0.5) }, uC: { value: Array.from({ length: NL }, (_, i) => new THREE.Color(['#ffc880', '#ff9ac0', '#9ad8ff', '#ffe8a0'][i % 4])) }, uFogCol: { value: new THREE.Color('#2a1c12') }, uFogD: { value: 0.011 } };
    const shellMat = own(new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: shellU,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uL[${NL}], uG[${NL}], uFogD; uniform vec3 uC[${NL}]; uniform vec3 uFogCol; varying vec3 vW;
        float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
        void main(){ vec2 q = vec2(vW.z * .9, atan(vW.x, vW.y - 3.) * 6.); float n = vn(q * .6) * .55 + vn(q * 1.9) * .3 + vn(q * 6.) * .15; float strata = .5 + .3 * sin(vW.y * 1.9 + vW.x * .5 + n * 7.);
          vec3 amber = vec3(.8, .6, .38), grey = vec3(.62, .58, .56), white = vec3(.92, .86, .76); vec3 base = mix(mix(amber, grey, strata), white, smoothstep(.62, .85, n)) * (.62 + .6 * n);
          vec3 li = vec3(.3); for (int i = 0; i < ${NL}; i++) { float d = vW.z - uL[i]; li += uG[i] * uC[i] * exp(-d * d / 55.); }
          vec3 col = base * (.1 + .42 * li); col = pow(col, vec3(2.2)); float t = length(vW - cameraPosition); float f = 1. - exp(-pow(t * uFogD, 2.)); gl_FragColor = vec4(mix(col, uFogCol, f), 1.); }`,
    }));
    const shellG = own(new THREE.BufferGeometry()); { const NA = 56, NZ = 2, a0 = Math.asin(-3 / 7.4), a1 = Math.PI - a0, pos = [], idx = []; for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NA; i++) { const a = lerp(a0, a1, i / NA); pos.push(Math.cos(a) * 7.4, 3 + Math.sin(a) * 7.4, lerp(ZEND - 40, 60, j / NZ)); } for (let j = 0; j < NZ; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); } shellG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); shellG.setIndex(idx); }
    const world = new THREE.Group(), mirror = new THREE.Group(); mirror.scale.y = -1; scene.add(world, mirror);
    const shell = new THREE.Mesh(shellG, shellMat); shell.frustumCulled = false; world.add(shell); const shell2 = new THREE.Mesh(shellG, shellMat); shell2.frustumCulled = false; mirror.add(shell2);
    const both = (geo, mat, n) => { const a = new THREE.InstancedMesh(geo, mat, n), b = new THREE.InstancedMesh(geo, mat, n); b.instanceMatrix = a.instanceMatrix; a.frustumCulled = b.frustumCulled = false; world.add(a); mirror.add(b); return { a, b }; };
    // columns, two rows, with capitals
    const colG = own(new THREE.CylinderGeometry(0.5, 0.62, 8.4, 14)), capG = own(new THREE.CylinderGeometry(0.95, 0.55, 0.7, 14)), saltM = own(new THREE.MeshBasicMaterial({ color: '#d8c8a8' }));
    const ncol = NL * 2 * 2, col = both(colG, saltM, ncol), cap = both(capG, saltM, ncol); let ci = 0;
    for (const sx of [-1, 1]) for (let i = 0; i < NL * 2; i++) { const z = LZ0 - 6 - i * 6; _q.identity(); _p.set(sx * 5.3, 4.2, z); _s.set(1, 1, 1); col.a.setMatrixAt(ci, _m.compose(_p, _q, _s)); _p.set(sx * 5.3, 8.5, z); cap.a.setMatrixAt(ci, _m.compose(_p, _q, _s)); ci++; }
    // vault ribs arching over the nave from column to column, so the columns hold a roof up
    const ribs = both(own(new THREE.TorusGeometry(5.3, 0.2, 6, 28, Math.PI)), saltM, NL * 2);
    for (let i = 0; i < NL * 2; i++) { _q.identity(); _p.set(0, 8.5, LZ0 - 6 - i * 6); _s.set(1, 0.36, 1); ribs.a.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    // glowing arched chapels in the side walls, each with a dark carved figure standing in it
    const chC = mkCanvas(128); chC.height = 256; { const g = chC.getContext('2d'), rg = g.createLinearGradient(0, 0, 0, 256); rg.addColorStop(0, '#ffe8b0'); rg.addColorStop(1, '#c87a38'); g.fillStyle = rg; g.beginPath(); g.moveTo(8, 256); g.lineTo(8, 100); g.arc(64, 100, 56, Math.PI, 0); g.lineTo(120, 256); g.fill(); }
    const chT = own(new THREE.CanvasTexture(chC)); chT.colorSpace = THREE.SRGBColorSpace; const chG = own(new THREE.PlaneGeometry(3.4, 6.8)), chM = own(new THREE.MeshBasicMaterial({ map: chT, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    const figG = own(new THREE.CapsuleGeometry(0.3, 1.5, 4, 8)), figM = own(new THREE.MeshBasicMaterial({ color: '#2a1a12' })), headG2 = own(new THREE.SphereGeometry(0.28, 8, 6));
    for (let i = 0; i < NL; i++) for (const sx of [-1, 1]) { const z = LZ0 - 3 - i * 12 - (sx > 0 ? 6 : 0), m = new THREE.Mesh(chG, chM); m.position.set(sx * 6.55, 3.6, z); m.rotation.y = -sx * Math.PI / 2; world.add(m); const m2 = new THREE.Mesh(chG, chM); m2.position.set(sx * 6.55, -3.6, z); m2.rotation.y = -sx * Math.PI / 2; m2.scale.y = -1; mirror.add(m2); const f = new THREE.Mesh(figG, figM); f.position.set(sx * 6.2, 1.9, z); world.add(f); const h = new THREE.Mesh(headG2, figM); h.position.set(sx * 6.2, 3.35, z); world.add(h); }
    // chandeliers: rings of salt-crystal prisms and drops that swell as you approach
    const PR = 16, RINGS = [[1.4, 6.6, 0.5], [2.4, 5.9, 0.7], [3.4, 5.2, 0.9]], CH_N = NL * (PR * 3 + 12);
    const prismG = own(new THREE.OctahedronGeometry(1, 0)); prismG.scale(0.05, 0.24, 0.05);
    const prismM = own(new THREE.MeshBasicMaterial({ color: '#ffffff' })), pm = both(prismG, prismM, CH_N);
    const chain = new THREE.InstancedMesh(own(new THREE.CylinderGeometry(0.04, 0.04, 1, 5)), own(new THREE.MeshBasicMaterial({ color: '#4a3a2a' })), NL); chain.frustumCulled = false; world.add(chain); const chain2 = new THREE.InstancedMesh(chain.geometry, chain.material, NL); chain2.instanceMatrix = chain.instanceMatrix; chain2.frustumCulled = false; mirror.add(chain2);
    const gC = mkCanvas(128); { const g = gC.getContext('2d'), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62); rg.addColorStop(0, 'rgba(255,240,200,1)'); rg.addColorStop(0.35, 'rgba(255,200,120,0.4)'); rg.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const gT = own(new THREE.CanvasTexture(gC)); gT.colorSpace = THREE.SRGBColorSpace; const gm = own(new THREE.SpriteMaterial({ map: gT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const glows = [], glows2 = []; for (let i = 0; i < NL; i++) { for (const [arr, par, sy] of [[glows, scene, 1], [glows2, scene, -1]]) { const sp = new THREE.Sprite(gm); sp.position.set(0, 6.4 * sy, lampZ[i]); par.add(sp); arr.push(sp); } }
    for (let i = 0; i < NL * (PR * 3 + 12); i++) pm.a.setColorAt(i, _c.set(['#ffe0a0', '#ffd090', '#ffc0b0', '#ffe8c0', '#ffd8a0'][R.int(0, 4)]));
    // salt flowers on the walls
    const FN = 520, fl = both(own(new THREE.ConeGeometry(0.05, 1, 5).translate(0, 0.5, 0)), own(new THREE.MeshBasicMaterial({ color: '#f4ecd8' })), FN), fd = [];
    for (let i = 0; i < FN; i++) { const z = R.range(LZ0 + 10, ZEND - 20), a = R.range(-0.2, Math.PI + 0.2), r = 7.2, x = Math.cos(a) * r, y = 3 + Math.sin(a) * r * 0.97; if (y < 0.3) { fd.push(null); continue; } const nx = -Math.cos(a), ny = -Math.sin(a); fd.push({ x, y, z, nx, ny, L: R.range(0.3, 0.95), ph: R.range(0, 6.28) }); }
    for (let i = 0; i < FN; i++) fl.a.setColorAt(i, _c.set(['#f4ecd8', '#ffe8c8', '#ffd8e0', '#e0ecff'][R.int(0, 3)]));
    // mirror floor
    const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(14, 320).rotateX(-Math.PI / 2)), own(new THREE.MeshBasicMaterial({ color: '#2c1c12', transparent: true, opacity: 0.6, depthWrite: false }))); floor.position.set(0, 0.002, ZEND + 80); scene.add(floor);
    // salt dust drifting in the light
    const DN = 420, dp = new Float32Array(DN * 3), dcl = new Float32Array(DN * 3), dd = []; for (let i = 0; i < DN; i++) dd.push({ x: R.range(-6, 6), y: R.range(0.3, 8), z: R.range(-40, 6), s: R.range(0.05, 0.25), ph: R.range(0, 6.28) });
    const dg = own(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('color', new THREE.BufferAttribute(dcl, 3));
    const dust = new THREE.Points(dg, own(new THREE.PointsMaterial({ map: gT, size: 0.28, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); dust.frustumCulled = false; scene.add(dust);
    // fireflies: drifting golden-green sparks all through the nave, twinkling slowly
    const FFN = 700, ffp = new Float32Array(FFN * 3), ffc = new Float32Array(FFN * 3), ffd = []; for (let i = 0; i < FFN; i++) ffd.push({ x: R.range(-6.5, 6.5), y: R.range(0.5, 9.5), z: R.range(0, -70), ph: R.range(0, 6.28), sp: R.range(0.2, 0.8), r: R.range(0.3, 1.2) });
    const ffg = own(new THREE.BufferGeometry()); ffg.setAttribute('position', new THREE.BufferAttribute(ffp, 3)); ffg.setAttribute('color', new THREE.BufferAttribute(ffc, 3));
    const flies = new THREE.Points(ffg, own(new THREE.PointsMaterial({ map: gT, size: 0.5, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); flies.frustumCulled = false; scene.add(flies);
    // a warm glow far down the nave, where the ring will hang
    const end = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: gT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.6 }))); end.scale.set(46, 46, 1); end.position.set(0, 3, ZEND - 40); scene.add(end);
    await tick();
    const g1 = new Array(NL).fill(0);
    return {
      scene, path, duration: DUR, title: 'The Cathedral That Blooms', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 66, near: 0.2, nearThrough: 0.4, far: 800, lookAhead: 10, sway: 0, bank: 0.02 },
      pois: [
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0] - 8, 3.4, c[2] - 9]; }, from: 0.18, to: 0.32, fade: 0.3, weight: 0.85 },    // a chapel on the left
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0] + 8, 3.4, c[2] - 9]; }, from: 0.38, to: 0.52, fade: 0.3, weight: 0.85 },    // and on the right
        { at: (tm, uu) => { const c = camAt(Math.max(0, Math.min(1, uu)) * DUR); return [c[0], 8.6, c[2] - 12]; }, from: 0.56, to: 0.7, fade: 0.3, weight: 0.8 },        // up into the vault and the chandeliers
      ],
      portal: { shape: 'circle', style: 'ring', radius: 6, color: '#ffe6b8', veil: '#ffe6b8', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.12, radius: 0.45, threshold: 0.95 }, grade: { saturation: 1.1, contrast: 1.06, tint: '#fff0dc', shadowTint: '#180c08', vignette: 0.28, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), cp = camera.position;
        let k = 0;
        for (let i = 0; i < NL; i++) {
          const lz = lampZ[i], bloom = smoothstep(lz + 34, lz + 4, cp.z) * 0 + smoothstep(cp.z - 46, cp.z - 8, lz) * (lz < cp.z + 6 ? 1 : 0) + (lz >= cp.z + 6 ? 1 : 0) * 0.0, grow = Math.max(0.35, Math.min(1.35, 0.35 + 1.0 * smoothstep(cp.z - 48, cp.z - 6, lz) * (lz < cp.z + 12 ? 1 : 0.9)));
          const gl = 0.45 + 0.9 * smoothstep(cp.z - 50, cp.z - 8, lz); shellU.uG.value[i] = gl * (lz > cp.z + 14 ? 0.6 : 1); glows[i].scale.setScalar(5 + 7 * grow); glows2[i].scale.setScalar(5 + 7 * grow); glows[i].material.opacity = 0.5 + 0.4 * grow / 1.35;
          _q.identity(); _p.set(0, 7.7, lz); _s.set(1, 1.9, 1); chain.setMatrixAt(i, _m.compose(_p, _q, _s));
          for (let r = 0; r < 3; r++) for (let j = 0; j < PR; j++) { const a = j / PR * 6.2832 + r * 0.45 + t * 0.12 * (r % 2 ? -1 : 1), rad = RINGS[r][0] * grow, y = RINGS[r][1] - 0.2 * grow; _p.set(Math.cos(a) * rad, y - 0.3 * grow * (j % 2), lz + Math.sin(a) * rad); _q.identity(); _s.set(grow, grow * (0.8 + 0.9 * (j % 2)) * (1 + 0.3 * r), grow); pm.a.setMatrixAt(k++, _m.compose(_p, _q, _s)); }
          for (let j = 0; j < 12; j++) { const a = j / 12 * 6.2832, rad = 0.25 * grow, y = 5.2 - 0.9 * grow * ((j % 3) / 2); _p.set(Math.cos(a) * rad, y, lz + Math.sin(a) * rad); _q.identity(); _s.set(grow * 0.9, grow * 1.7, grow * 0.9); pm.a.setMatrixAt(k++, _m.compose(_p, _q, _s)); }
        }
        chain.instanceMatrix.needsUpdate = true; pm.a.instanceMatrix.needsUpdate = true; if (pm.a.instanceColor) pm.a.instanceColor.needsUpdate = false;
        for (let i = 0; i < FN; i++) { const d = fd[i]; if (!d) { _s.set(0, 0, 0); fl.a.setMatrixAt(i, _m.compose(_p.set(0, -50, 0), _q.identity(), _s)); continue; } const open = smoothstep(cp.z - 40, cp.z - 10, d.z) * (d.z < cp.z + 10 ? 1 : 1), L = d.L * (0.05 + 0.95 * open) * (1 + 0.06 * Math.sin(t * 1.5 + d.ph)); _p.set(d.x, d.y, d.z); _e.set(0, 0, Math.atan2(-d.nx, d.ny) * 1 + 0); _q.setFromEuler(_e.set(0, 0, Math.atan2(-d.nx, d.ny))); _s.set(1 + open * 0.5, L, 1 + open * 0.5); fl.a.setMatrixAt(i, _m.compose(_p, _q, _s)); }
        fl.a.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < DN; i++) { const d = dd[i]; const n = i * 3; dp[n] = cp.x + d.x + 0.4 * Math.sin(t * d.s * 3 + d.ph); dp[n + 1] = d.y + 0.3 * Math.sin(t * 0.4 + d.ph); dp[n + 2] = cp.z + d.z - 10; const f = 0.28 + 0.2 * Math.sin(t * 1.6 + d.ph * 3); dcl[n] = f; dcl[n + 1] = f * 0.85; dcl[n + 2] = f * 0.6; }
        dg.attributes.position.needsUpdate = true; dg.attributes.color.needsUpdate = true;
        for (let i = 0; i < FFN; i++) { const d = ffd[i], n = i * 3, zz = cp.z + 6 + ((d.z - cp.z * 0.0) % 70 + 70) % 70 * -1; ffp[n] = d.x + d.r * Math.sin(t * d.sp + d.ph); ffp[n + 1] = d.y + d.r * Math.cos(t * d.sp * 0.8 + d.ph); ffp[n + 2] = zz + d.r * Math.sin(t * d.sp * 0.6 + d.ph * 2); const f = Math.max(0, 0.5 + 0.5 * Math.sin(t * (0.7 + d.sp) + d.ph * 5)); ffc[n] = f * 0.95; ffc[n + 1] = f; ffc[n + 2] = f * 0.45; }
        ffg.attributes.position.needsUpdate = true; ffg.attributes.color.needsUpdate = true;
        end.material.opacity = 0.55 + 0.1 * Math.sin(t * 0.8);
      },
      dispose() { for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
