// THE BONE BREAKER: you fly under a lammergeier over the Pyrenees. It banks down to a knoll of old bones, takes the longest one in its
// talons, climbs to the top of the sky, lets it go, and dives after it. The bone hits a scree slab and bursts into white dust and
// marrow-gold light; the dust lifts you on a thermal to a small glowing ring. (Real behaviour: bearded vultures drop bones on rock.)
// T = seconds of flight (progress) drives the events; the clock t drives wingbeats so the bird is alive before arrival.
import * as THREE from 'three';
import { smoothstep, lerp } from '../kit/core.js';
import { sm, mkCanvas, fbm, ridged, pathFrom, makeTerrain, makeBird, skyFor } from '../kit/mine.js';

const DUR = 20, REL = 8.5, HIT = 14.0;
const keyed = (T, K) => { if (T <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (T <= K[i][0]) return lerp(K[i - 1][1], K[i][1], sm((T - K[i - 1][0]) / (K[i][0] - K[i - 1][0]))); return K[K.length - 1][1]; };
const YK = [[0, 190], [1.5, 186], [3.8, 140], [5.2, 158], [REL, 280]];
const SW = (T) => sm(Math.min(1, Math.max(0, (T - 1.8) / 1.6))) * (1 - sm(Math.min(1, Math.max(0, (T - 4.0) / 1.4))));
const A = (T) => [18 * Math.sin(T * 0.5) + 9 * SW(T), keyed(T, YK), 60 - 45 * T];           // the flight before the drop
const LED = { x: A(3.8)[0] + 12, z: A(3.8)[2], y: A(3.8)[1] - 4.6 };            // the knoll of bones, beside the flight line
const RELP = (() => { const a = A(REL), b = A(REL + 0.4); return [b[0], b[1] + 3.2, b[2]]; })();
const IMP = { x: RELP[0] + 26, z: RELP[2] - 280, y: 24 };                          // the scree slab where the bone lands
const bone = (T) => { const k = Math.min(1, Math.max(0, (T - REL) / (HIT - REL))); return [lerp(RELP[0], IMP.x, k), RELP[1] + (IMP.y + 1 - RELP[1]) * (0.25 * k + 0.75 * k * k), lerp(RELP[2], IMP.z, k)]; };
const AR = A(REL);
// after the drop the camera simply keeps gliding forward and eases down in a long gentle curve, watching the bone fall (the gaze is steered by pois); no dive
const camAt = (T) => { if (T < REL) return A(T); const tau = T - REL, z = AR[2] - 45 * tau, x = lerp(AR[0], IMP.x - 16, sm(Math.min(1, tau / 6.5))), y = tau < 6 ? lerp(AR[1], 74, sm(tau / 6)) : 74 + 62 * sm((tau - 6) / 5.5); return [x, Math.max(y, hLand(x, z) + 22), z]; };
const hLand = (x, z) => {
  const v = smoothstep(30, 300, Math.abs(x - 6 * Math.sin(z * 0.004)));
  let h = 38 + 30 * fbm(x * 0.01, z * 0.01, 3) + v * (60 + 640 * Math.pow(ridged(x * 0.0017 + 3, z * 0.0017, 7), 1.5));
  const dl = Math.hypot(x - LED.x, z - LED.z), dI = Math.hypot(x - IMP.x, z - IMP.z);
  h = lerp(LED.y, h, smoothstep(11, 32, dl)); h = lerp(IMP.y, h, smoothstep(26, 60, dI)); return h;
};

export default {
  id: 'bone-breaker-ridge',
  name: 'The Bone Breaker',
  category: 'wilderness',
  weirdness: 0.55,
  media: ['air', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene(), trash = [], own = (o) => { trash.push(o); return o; };
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const { path, PL } = pathFrom((s) => camAt(s * DUR), 56); await tick();
    const sky = await skyFor(ctx, scene, { preset: 'day', sky: { zenith: '#2a62b8', mid: '#7aa6dc', horizon: '#f2dcb8', ground: '#a8a098', horizonPow: 2.6, clouds: { coverage: 0.35, lit: '#fff4e4', shade: '#9fb2cf', silver: 0 } } });
    const FOGC = new THREE.Color('#c8d6e8'); scene.fog = new THREE.FogExp2(FOGC, 0.0017); scene.background = new THREE.Color('#7aa6dc');
    await tick();
    // terrain: meadow, then strata rock, then snow; sun from the left bakes light and blue shadow
    const cA = new THREE.Color('#6f8148'), cB = new THREE.Color('#a8a06a'), cR = new THREE.Color('#8e7f74'), cR2 = new THREE.Color('#6e6258'), cS = new THREE.Color('#f4f8ff'), sh = new THREE.Color('#4f5f90'), tmp = new THREE.Color();
    const terr = makeTerrain({
      size: 1500, seg: 340, cx: 0, cz: -200, heightFn: hLand, own, sun: [-0.6, 0.5, -0.25],
      colorFn: (h, lit, slope, x, z, out) => {
        out.copy(cA).lerp(cB, smoothstep(60, 180, h + 30 * fbm(x * 0.02, z * 0.02, 2)));
        const rock = smoothstep(0.1, 0.35, slope) + smoothstep(170, 300, h); tmp.copy(cR).lerp(cR2, 0.5 + 0.5 * Math.sin(h * 0.33 + fbm(x * 0.05, z * 0.05, 2) * 6)); out.lerp(tmp, Math.min(1, rock));
        out.lerp(cS, smoothstep(330, 420, h - slope * 160)); const d = Math.hypot(x - IMP.x, z - IMP.z); out.lerp(tmp.set('#b4aca2'), 1 - smoothstep(24, 40, d));
        const n2 = 0.78 + 0.45 * fbm(x * 0.12, z * 0.12, 3); out.multiplyScalar(n2); const l = 0.28 + 1.0 * lit; out.multiplyScalar(l); out.lerp(sh, (1 - lit) * 0.3);
      },
    });
    {   // fine rock/grass blotches tiled over the whole slope, so close terrain has grain instead of smooth colour
      const c = mkCanvas(256), g = c.getContext('2d'); g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i++) { const x = R.range(0, 256), y = R.range(0, 256), r = R.range(1.5, 9), v = R.range(70, 255) | 0; g.fillStyle = `rgba(${v},${v},${v},${R.range(0.2, 0.55)})`; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill(); } }
      const tx = own(new THREE.CanvasTexture(c)); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(220, 220); tx.anisotropy = 8; terr.material.map = tx; terr.material.needsUpdate = true;
    }
    scene.add(terr); await tick();
    // the knoll of bones: ribs, long bones, skulls
    const boneM = own(new THREE.MeshBasicMaterial({ color: '#efe6d2' })), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
    const mkBoneG = () => { const g = new THREE.CylinderGeometry(0.13, 0.13, 1, 7); const k = new THREE.SphereGeometry(0.22, 7, 5); const parts = [g, k.clone().translate(0.1, 0.5, 0), k.clone().translate(-0.1, 0.5, 0), k.clone().translate(0.1, -0.5, 0), k.clone().translate(-0.1, -0.5, 0)]; const pos = []; for (const pg of parts) { const ni = pg.toNonIndexed(); pos.push(...ni.attributes.position.array); } const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.computeVertexNormals(); return out; };
    const longG = own(mkBoneG()), ribG = own(new THREE.TorusGeometry(0.9, 0.09, 6, 12, 2.6)), skG = own(new THREE.SphereGeometry(0.7, 9, 7));
    const LN = 90, RN = 46, SN = 9, lb = new THREE.InstancedMesh(longG, boneM, LN), rb = new THREE.InstancedMesh(ribG, boneM, RN), skb = new THREE.InstancedMesh(skG, own(new THREE.MeshBasicMaterial({ color: '#d8cdb4' })), SN);
    const onKnoll = (r) => { const a = R.range(0, 6.2832), d = Math.sqrt(R()) * r; return [LED.x + Math.cos(a) * d, LED.z + Math.sin(a) * d]; };
    for (let i = 0; i < LN; i++) { const [x, z] = onKnoll(15); _p.set(x, hLand(x, z) + 0.2, z); _e.set(R.range(1.2, 1.9), R.range(0, 6.28), R.range(0, 6.28)); _q.setFromEuler(_e); const L = R.range(2, 4.6); _s.set(1.4, L, 1.4); lb.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    for (let i = 0; i < RN; i++) { const [x, z] = onKnoll(14); _p.set(x, hLand(x, z) + 0.1, z); _e.set(R.range(-0.3, 0.3) + Math.PI / 2 * R.int(0, 1), R.range(0, 6.28), R.range(-0.4, 0.4)); _q.setFromEuler(_e); const sc = R.range(1.2, 2.2); _s.set(sc, sc, sc); rb.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    for (let i = 0; i < SN; i++) { const [x, z] = onKnoll(12); _p.set(x, hLand(x, z) + 0.5, z); _q.identity(); const sc = R.range(1.1, 1.8); _s.set(sc, sc * 0.9, sc * 1.2); skb.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    lb.frustumCulled = rb.frustumCulled = skb.frustumCulled = false; scene.add(lb, rb, skb);
    // boulders round the slab
    const boG = own(new THREE.IcosahedronGeometry(1, 1)), bo = new THREE.InstancedMesh(boG, own(new THREE.MeshBasicMaterial({ color: '#8c8478' })), 60);
    for (let i = 0; i < 60; i++) { const a = R.range(0, 6.28), d = R.range(5, 44), x = IMP.x + Math.cos(a) * d, z = IMP.z + Math.sin(a) * d, sc = R.range(0.6, 3.2); _p.set(x, hLand(x, z) + sc * 0.3, z); _q.setFromEuler(_e.set(R(), R(), R())); _s.set(sc * 1.4, sc * 0.8, sc); bo.setMatrixAt(i, _m.compose(_p, _q, _s)); }
    bo.frustumCulled = false; scene.add(bo); await tick();
    // the hero bone (carried, then dropped), long with knuckled ends
    const hero = new THREE.Mesh(longG, own(new THREE.MeshBasicMaterial({ color: '#fff8ea' }))); scene.add(hero);
    // a white streak of dust behind the falling bone so the eye can follow it
    const TN = 70, tpos = new Float32Array(TN * 3), tcol = new Float32Array(TN * 3), tg = own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    const dustC0 = mkCanvas(64); { const g = dustC0.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const trT = own(new THREE.CanvasTexture(dustC0)); trT.colorSpace = THREE.SRGBColorSpace;
    const trail = new THREE.Points(tg, own(new THREE.PointsMaterial({ map: trT, size: 1.7, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); trail.frustumCulled = false; scene.add(trail);
    // the vulture
    const bird = makeBird({ body: '#3c3a40', belly: '#c4682e', head: '#efd9b8', wing: '#40434f', feather: '#23242c', scale: 2.7, own, span: 1.0 }); scene.add(bird.g);
    const _cd = new THREE.Vector3(), _cr = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
    const birdAt = (T, out, cam) => {
      const bump = sm(Math.min(1, Math.max(0, (T - 2.0) / 1.4))) * (1 - sm(Math.min(1, Math.max(0, (T - 3.9) / 1.2))));
      if (T < REL) {
        cam.getWorldDirection(_cd); _cr.crossVectors(_cd, UPV).normalize();
        const k = 0.45 + 0.55 * sm(Math.min(1, Math.max(0, (T - 0.4) / 1.2)));   // eases in from a little closer
        out.copy(cam.position).addScaledVector(_cd, 13).addScaledVector(_cr, 2.2 * Math.sin(T * 0.9) * (1 - bump)).addScaledVector(UPV, 4.6 + 0.8 * Math.sin(T * 1.7 + 1));
        if (bump > 0) out.lerp(_w.set(LED.x + 0.2, LED.y + 3.1, LED.z + 0.4), bump * bump);
        return out;
      }
      const tau = T - REL;   // the vulture flies on, climbing and banking away to the left, nowhere near the camera
      return out.set(RELP[0] - 26 * sm(Math.min(1, tau / 5)), RELP[1] + 3.5 * tau, RELP[2] - 44 * tau);
    };
    // the burst: dust sprites + shards
    const dustC = mkCanvas(64); { const g = dustC.getContext('2d'), rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.45, 'rgba(255,246,228,0.5)'); rg.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const dustT = own(new THREE.CanvasTexture(dustC)); dustT.colorSpace = THREE.SRGBColorSpace;
    const DN = 700, dpos = new Float32Array(DN * 3), dcol = new Float32Array(DN * 3), dv = [];
    for (let i = 0; i < DN; i++) { const th = R.range(0, 6.2832), up = R.range(0.1, 1), sp = R.range(2, 17) * (R() < 0.15 ? 2 : 1); dv.push({ vx: Math.cos(th) * Math.sqrt(1 - up * up) * sp, vy: up * sp * 0.9 + 3, vz: Math.sin(th) * Math.sqrt(1 - up * up) * sp, gold: R() < 0.25, sz: R.range(0.6, 1.4) }); }
    const dg = own(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dg.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
    const dust = new THREE.Points(dg, own(new THREE.PointsMaterial({ map: dustT, size: 2.0, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); dust.frustumCulled = false; dust.visible = false; scene.add(dust);
    const SHN = 70, shG = own(new THREE.TetrahedronGeometry(1)), shards = new THREE.InstancedMesh(shG, boneM, SHN), shv = []; for (let i = 0; i < SHN; i++) { const th = R.range(0, 6.28); shv.push({ vx: Math.cos(th) * R.range(4, 15), vy: R.range(8, 26), vz: Math.sin(th) * R.range(4, 15), sc: R.range(0.3, 0.9), sp: R.range(2, 7) }); } shards.frustumCulled = false; shards.visible = false; scene.add(shards);
    const flash = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: dustT, color: '#ffd890', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))); flash.visible = false; scene.add(flash);
    await tick();
    const _b0 = new THREE.Vector3(), _pv = new THREE.Vector3(), _vel = new THREE.Vector3(0, 0, -1), _w = new THREE.Vector3(); let hasPv = false;
    return {
      scene, path, duration: DUR, title: 'The Bone Breaker', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 64, near: 0.3, nearThrough: 0.6, far: 3000, lookAhead: 12, sway: 0, bank: 0.04 },
      pois: [
        { at: [LED.x, LED.y + 4, LED.z], from: 0.07, to: 0.21, fade: 0.35, weight: 0.8 },                                  // the knoll of bones
        { at: (tm, uu) => { const T = Math.max(0, Math.min(1, uu)) * DUR, b = bone(Math.max(REL, T)); return [b[0], b[1], b[2]]; }, from: (REL - 0.4) / DUR, to: (HIT + 0.3) / DUR, fade: 0.06, weight: 1.0 },   // watch the bone fall
        { at: [IMP.x, IMP.y + 28, IMP.z], from: (HIT) / DUR, to: (HIT + 3.4) / DUR, fade: 0.25, weight: 0.9 },              // and the burst
      ],
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#ffe2b0', veil: '#ffe2b0', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 0.95, bloom: { strength: 0.15, radius: 0.45, threshold: 0.92 }, grade: { saturation: 1.05, contrast: 1.05, tint: '#fff6ea', shadowTint: '#142040', vignette: 0.2, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR); sky.update(dt, t, camera);
        birdAt(T, _b0, camera); if (hasPv && dt > 1e-4) { _w.copy(_b0).sub(_pv).divideScalar(dt); if (_w.length() < 400) _vel.lerp(_w, 1 - Math.exp(-dt * 6)); } _pv.copy(_b0); hasPv = true; const dx = _vel.x, dy = _vel.y, dz = _vel.z, hz = Math.hypot(dx, dz) + 1e-4;
        bird.g.position.copy(_b0); bird.g.rotation.y = Math.atan2(dx, dz); bird.g.rotation.x = Math.atan2(-dy, hz) * 0.8; bird.g.rotation.z = 0.5 * Math.sin(T * 1.3) * (T < 5 ? 1 : 0.3) - 0.5 * dx * 0.2;

        const dive = 0, glide = sm(Math.min(1, Math.max(0, (T - 1.8) / 0.5))) * (1 - sm(Math.min(1, Math.max(0, (T - 3.8) / 0.6))));
        bird.pose({ flap: t * 5.4, glide, dive, t }); bird.g.updateMatrixWorld(true);
        // the hero bone: on the knoll, then in the talons, then tumbling
        if (T < 3.35) { hero.position.set(LED.x - 1, LED.y + 1.2, LED.z + 0.5); hero.scale.set(2.2, 6, 2.2); hero.rotation.set(1.45, 0.6, 0.4); }
        else if (T < REL) { bird.g.localToWorld(_w.set(0, -0.42, 0.15)); hero.position.copy(_w); hero.scale.set(1.3, 4.6, 1.3); hero.rotation.set(Math.PI / 2, bird.g.rotation.y + 1.57, 0); }
        else if (T < HIT) { const b = bone(T); hero.position.set(b[0], b[1], b[2]); hero.scale.set(2.2, 7.5, 2.2); hero.rotation.set(T * 7, T * 3, 1); }
        hero.visible = T < HIT;
        for (let i = 0; i < TN; i++) { const tt = Math.max(REL, T - i * 0.05), b = bone(tt), n = i * 3, f = (T > REL && T < HIT + 0.2 ? 1 : 0) * Math.pow(1 - i / TN, 1.5) * 0.5 * smoothstep(3, 9, i); tpos[n] = b[0]; tpos[n + 1] = b[1]; tpos[n + 2] = b[2]; tcol[n] = f; tcol[n + 1] = f * 0.95; tcol[n + 2] = f * 0.85; }
        tg.attributes.position.needsUpdate = true; tg.attributes.color.needsUpdate = true;
        // the burst at impact
        const tau = T - HIT, on = tau >= 0 && T > 0.5;
        dust.visible = shards.visible = flash.visible = on;
        if (on) {
          const dr = 1 - Math.exp(-tau * 0.9), buoy = 5.5 * tau + 0.55 * tau * tau;
          for (let i = 0; i < DN; i++) { const v = dv[i]; dpos[i * 3] = IMP.x + v.vx * dr * 1.4 + 2 * Math.sin(tau + i); dpos[i * 3 + 1] = IMP.y + 1.5 + v.vy * dr * 1.2 + buoy; dpos[i * 3 + 2] = IMP.z + v.vz * dr * 1.4; const f = Math.max(0, 1 - tau / 6.5) * (0.22 + 0.15 * Math.sin(i)); dcol[i * 3] = (v.gold ? 1 : 0.85) * f; dcol[i * 3 + 1] = (v.gold ? 0.72 : 0.84) * f; dcol[i * 3 + 2] = (v.gold ? 0.35 : 0.8) * f; }
          dg.attributes.position.needsUpdate = true; dg.attributes.color.needsUpdate = true;
          for (let i = 0; i < SHN; i++) { const v = shv[i]; const x = IMP.x + v.vx * tau, z = IMP.z + v.vz * tau, y = Math.max(IMP.y + 0.4, IMP.y + 1 + v.vy * tau - 9.8 * 0.5 * tau * tau); _p.set(x, y, z); _q.setFromEuler(_e.set(tau * v.sp, tau * v.sp * 0.7, i)); _s.setScalar(v.sc); shards.setMatrixAt(i, _m.compose(_p, _q, _s)); }
          shards.instanceMatrix.needsUpdate = true;
          flash.position.set(IMP.x, IMP.y + 4, IMP.z); const fs = 55 * (1 - Math.exp(-tau * 6)) * (1 - smoothstep(0.2, 1.6, tau)) + 0.01; flash.scale.set(fs, fs, 1); flash.material.opacity = 0.85 * (1 - smoothstep(0.1, 1.5, tau));
        }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
