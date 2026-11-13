// THE SALT HEXAGONS: a Bolivian salt flat before dawn, after rain. A film of still water lies over the crust and mirrors the whole
// sky, so the horizon dissolves; the crust shows through as a network of pale, irregular salt ridges that frame the pools. The
// flight skims low through a lagoon of pink flamingos, which lift off around the camera, then climbs, and the same network appears
// at ten, a hundred, a thousand times the size, each scale fading in as the finer one grows too small to draw (no crawling).
// It ends by settling back toward the horizon, where the portal sits half-risen out of the flat like the first sun, in the colour
// of the dawn band that the water mirrors. The ground is one shader: the ray from the camera to the plane y = 0 is cut by four
// nested jittered-cell (Voronoi) networks whose ridge lines are anti-aliased by pixel footprint; wet cells show the reflected sky
// by Fresnel, dry cells show crust. Nothing is loaded. 9:16 is the target shape.
import * as THREE from 'three';
import { makePath, lerp, smoothstep } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';
import * as F from '../kit/fauna.js';

const LAG_A = { x: 8, z: -15, a: 115, b: 160 };      // the lagoon the camera flies through
const LAG_B = { x: -120, z: -470, a: 190, b: 210 };   // a second one far ahead, a pink band that stays in view as we climb
const sm = (s) => s * s * (3 - 2 * s);
const SPLIT = 0.62, PEAK = 0.82, TOP = 90, END_Y = 9;   // low skim to 0.38, climb to the peak at 0.7, then settle to the horizon
const PX = (s) => 24 * Math.sin(s * 4.0);
const PY = (s) => (s < SPLIT ? 0.7 + 0.5 * (s / SPLIT) : s < PEAK ? 1.2 + (TOP - 1.2) * sm(Math.pow((s - SPLIT) / (PEAK - SPLIT), 1.1)) : TOP - (TOP - END_Y) * sm((s - PEAK) / (1 - PEAK)));
const PZ = (s) => 260 - 1000 * s;

export default {
  id: 'salt-hexagons',
  name: 'The Salt Hexagons',
  category: 'wilderness',
  weirdness: 0.55,
  media: ['air', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene();
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const trash = [], fauna = [];
    const own = (o) => { trash.push(o); return o; };
    const DUR = 20;

    // ---------- the flight: a low skim through the lagoon, a long even climb, then a gentle settle onto the horizon ----------
    const pts = [];
    for (let k = 0; k <= 34; k++) { const s = k / 34; pts.push([PX(s), PY(s), PZ(s)]); }
    const path = makePath(pts);
    let PL = 0; { const a0 = new THREE.Vector3(), b0 = new THREE.Vector3(); path.pointAt(0, a0); for (let i = 1; i <= 400; i++) { path.pointAt(i / 400, b0); PL += a0.distanceTo(b0); a0.copy(b0); } }
    await tick();

    // ---------- sky: pre-dawn blue hour, a rose line at the horizon, stars still out ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'blueHour', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      zenith: '#0a1640', mid: '#33508e', horizon: '#d49a88', ground: '#c79a96', horizonPow: 2.6,
      scatter: 0, sunIntensity: 0, sunGlow: 0, sunElevation: -12, bodies: [],
      stars: 0.8, milkyWay: 0.2, clouds: { coverage: 0.05, lit: '#a98aa8', shade: '#3a4c80', silver: 0 }, clouds2: false,
    });
    scene.add(sky.object);
    const FOG = new THREE.Color('#bf9aa0'), FOGD = 0.00022;
    scene.fog = new THREE.FogExp2(FOG, FOGD);
    scene.background = new THREE.Color('#33508e');
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    await tick();

    // ---------- the ground: a mirror of the sky over irregular salt crust ----------
    const groundMat = own(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFogCol: { value: FOG.clone() }, uFogD: { value: FOGD },
        uSun: { value: new THREE.Vector3(PX(1), PY(1), PZ(1)) }, uLagA: { value: new THREE.Vector4(LAG_A.x, LAG_A.z, LAG_A.a, LAG_A.b) }, uLagB: { value: new THREE.Vector4(LAG_B.x, LAG_B.z, LAG_B.a, LAG_B.b) } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime, uFogD; uniform vec3 uFogCol, uSun; uniform vec4 uLagA, uLagB; varying vec3 vW;
        vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
        float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        // jittered-cell network: distance to the nearest cell edge (in cell units) and the id of the cell
        float vor(vec2 x, out vec2 cid){
          vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .62 - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
          md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .62 - f; vec2 dd = r - mr; if (dot(dd, dd) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(dd))); }
          cid = n + mg; return md;
        }
        vec3 skyCol(float e){ vec3 H = vec3(.83, .60, .53), M = vec3(.26, .34, .62), Z = vec3(.09, .12, .33); vec3 c = mix(H, M, smoothstep(0., .22, e)); return mix(c, Z, smoothstep(.2, .85, e)); }
        float ridgeH(float a){ return .035 + .03 * sin(a * 7. + 1.) + .022 * sin(a * 17. + 2.) + .05 * exp(-pow((a - .35) * 6., 2.)); }   // the ridge's height (radians) by bearing; a volcano stands at .35
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          float ey = max(-rd.y, 1e-3);
          float t = cameraPosition.y / ey;
          vec2 w = cameraPosition.xz + rd.xz * t;
          float ridge = 0., shore = 0., wet1 = .62, wet3 = 0., S = 1.;
          for (int k = 0; k < 4; k++) {
            vec2 p = w / S; p += .07 * vec2(sin(p.y * 4.3 + float(k)), sin(p.x * 3.7 + 2. * float(k))); vec2 cid; float e = vor(p, cid);   // wavy edges: nothing is a straight line
            float pw = max(length(fwidth(p)), 1e-6), vis = smoothstep(12., 40., 1. / pw);     // a scale fades in as its cells grow past ~12 px
            float rw = clamp(3.5 * pw, .008, .05) * (1. + .28 * sin(p.x * 5.3 + p.y * 3.1));
            ridge = max(ridge, (1. - smoothstep(rw, rw + 1.6 * pw, e)) * vis);
            shore = max(shore, (1. - smoothstep(rw, rw + .16, e)) * vis);
            if (k == 1) wet1 = mix(.62, step(.36, h1(cid + 3.)), vis);                         // some cells hold water, some are dry crust
            if (k == 3) wet3 = step(.55, h1(cid + 9.)) * vis;                                   // and whole giant cells are flooded
            S *= 10.;
          }
          float lag = max(1. - smoothstep(.9, 1., length((w - uLagA.xy) / uLagA.zw)), 1. - smoothstep(.9, 1., length((w - uLagB.xy) / uLagB.zw)));
          float wet = max(max(wet1, wet3), lag);
          // the mirror: the reflected sky by Fresnel, over a dark wet bed; the surface drifts by a hair, slowly
          float ey2 = clamp(ey + .004 * sin(uTime * .7 + w.x * .5 + w.y * .37), 0., 1.);
          float Fr = clamp(.42 + .58 * pow(1. - ey2, 2.2), 0., 1.);
          vec3 bed = mix(vec3(.12, .15, .22), vec3(.08, .11, .18), lag);
          vec3 rr = normalize(vec3(rd.x, ey2, rd.z));
          vec2 sp = rr.xz / (rr.y + .25) * 55.; vec2 sc = floor(sp), sf = fract(sp) - .5, jit = (h2(sc + 7.) - .5) * .6;
          float star = step(.972, h1(sc)) * (1. - smoothstep(.035, .035 + .1 + length(fwidth(sp)), length(sf - jit))) * (.65 + .35 * sin(uTime * 1.2 + h1(sc + 3.) * 6.28));
          vec3 mirror = mix(bed, skyCol(ey2), Fr) + vec3(.80, .85, 1.) * star * .5 * Fr * smoothstep(.12, .45, ey2);
          { // what the water shows besides the sky: pink-lit cirrus, and the far mountains upside down
            vec2 cp = rr.xz / (rr.y + .3) * vec2(2.4, 5.5) + vec2(uTime * .012, 0.);
            float cl = smoothstep(.5, .85, vn(cp) * .6 + vn(cp * 2.3) * .3 + vn(cp * 5.) * .1) * (1. - smoothstep(.1, .6, ey2)) * smoothstep(.03, .12, ey2);
            mirror = mix(mirror, vec3(.86, .6, .66), cl * .38 * Fr);
            float mt = 1. - smoothstep(ridgeH(atan(rd.x, -rd.z)) - .004, ridgeH(atan(rd.x, -rd.z)) + .004, asin(clamp(ey2, 0., 1.)));
            mirror = mix(mirror, vec3(.36, .28, .50), mt * Fr * .85);
          }
          float pwm = length(fwidth(w)), grain = (h1(floor(w / .15)) - .5) * .05 * (1. - smoothstep(.03, .12, pwm / .15));
          vec3 dry = vec3(.40, .45, .53) + grain;
          // the sun's glitter on the water: a slow, soft column running toward the horizon sun
          vec2 sd = normalize(uSun.xz - cameraPosition.xz), rdh = normalize(rd.xz + 1e-5);
          float glit = pow(max(dot(sd, rdh), 0.), 1400.) * (.6 + .4 * sin(uTime * .9 + w.x * .05 + w.y * .04)) * Fr * smoothstep(0., .02, ey) * (1. - smoothstep(.12, .5, ey));
          mirror += vec3(.90, .55, .42) * glit * .95;
          vec3 col = mix(dry, mirror, wet);
          col = mix(col, vec3(.36, .42, .55), shore * .35 * wet);                                // a soft wet shoreline round every pool
          col = mix(col, vec3(.58, .61, .69) + grain, ridge * (1. - .55 * lag));                // the pale salt ridges
          { // salt crystals on the ridges catching the low light: tiny, slow glints that only exist where the eye can resolve them
            vec2 gc = floor(w * 9.); float gk = step(.987, h1(gc + 3.)) * (.5 + .5 * sin(uTime * 1.2 + h1(gc) * 40.)) * ridge * (1. - smoothstep(.02, .09, pwm * 9.));
            col += vec3(.9, .85, .8) * gk * .55;
          }
          col = pow(col, vec3(2.2));                                                            // the colours above are display values; the pipeline wants linear
          float f = 1. - exp(-pow(t * uFogD, 2.));
          gl_FragColor = vec4(mix(col, uFogCol, f), 1.);
        }`,
    }));
    const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI / 2)), groundMat);
    ground.frustumCulled = false; scene.add(ground);
    // the far ridge and its volcano: 3 km away, fading into the horizon haze (the same ridge line is reflected in the water by the shader)
    const ridgeH = (a) => 0.035 + 0.03 * Math.sin(a * 7 + 1) + 0.022 * Math.sin(a * 17 + 2) + 0.05 * Math.exp(-Math.pow((a - 0.35) * 6, 2));
    const ridgeMesh = (() => {
      const pts = [], cols = [], idx = [], top = new THREE.Color('#5a4a88'), bot = new THREE.Color('#bf9aa0'), RR = 3000;
      for (let i = 0; i <= 140; i++) { const a = -1.6 + i * (3.2 / 140), h = RR * Math.tan(ridgeH(a)); pts.push(Math.sin(a) * RR, h, -Math.cos(a) * RR, Math.sin(a) * RR, -20, -Math.cos(a) * RR); cols.push(top.r, top.g, top.b, bot.r, bot.g, bot.b); if (i) { const q = (i - 1) * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }))); m.frustumCulled = false; scene.add(m); return m;
    })();
    await tick();

    // ---------- the flamingos ----------
    const light = { sunDir: [0.1, 0.3, -0.95], sunColor: '#ffb48c', sunIntensity: 1.0, sky: '#93a6d8', skyIntensity: 1.3, ground: '#5c6684', groundIntensity: 0.7 };
    const stand = (L, n, clear) => {
      const out = [];
      while (out.length < n) {
        const a = R.range(0, 6.2832), r = Math.pow(R(), 0.7) * 0.86, x = L.x + Math.cos(a) * r * L.a, z = L.z + Math.sin(a) * r * L.b;
        if (clear && Math.abs(x - PX((260 - z) / 1000)) < 13) continue;       // leave the camera's corridor open
        out.push([x, 0, z]);
      }
      return out;
    };
    const near = stand(LAG_A, 220, true);
    const carpetA = F.makeWaders({ rng: R.fork('carpetA'), species: 'flamingo', positions: near, count: near.length, size: 3.2, level: 0, facing: Math.PI * 0.5, scatterYaw: 1.1, peckRate: 0.5, active: 0.5, blobShadow: false, light });
    scene.add(carpetA.object); fauna.push(carpetA);
    const far = stand(LAG_B, 360, true);
    const carpetB = F.makeWaders({ rng: R.fork('carpetB'), species: 'flamingo', positions: far, count: far.length, size: 11, level: 0, facing: Math.PI * 0.5, scatterYaw: 1.1, peckRate: 0.4, active: 0.4, blobShadow: false, light });
    scene.add(carpetB.object); fauna.push(carpetB);
    await tick();
    const lift = F.makeFlock({ rng: R.fork('lift'), species: 'flamingos', count: 260, size: 4, light, spread: [40, 14, 40], wander: [3, 1.5, 3, 0.8], maxSigma: 3, cross: { path, u: 0.27, lead: 40, angle: 88, side: -1, height: 8, span: 150, rise: 45, duration: DUR } });
    scene.add(lift.object); fauna.push(lift);
    await tick();

    // ---------- the skater: a giant cloaked figure gliding ahead across the mirror, drawing a pale line on the water. It grows as we
    // climb, so it is always the ruler for the scale, and at the end it skates into the sun. ----------
    const makeSkater = (ghost) => {
      const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      const M = (hex) => own(new THREE.MeshBasicMaterial(ghost ? { color: hex, transparent: true, opacity: 0.38, depthTest: false, depthWrite: false, side: THREE.DoubleSide } : { color: hex, side: THREE.DoubleSide }));
      const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(own(geo), mat); m.position.set(x, y, z); if (ghost) m.renderOrder = 10; (parent || body).add(m); return m; };
      const cloak = add(new THREE.CylinderGeometry(0.17, 0.52, 1.5, 12, 1, true), M('#1d2543'), 0, 1.3, 0);      // the cloak
      add(new THREE.ConeGeometry(0.66, 0.75, 16, 1, true), M('#2e3a6e'), 0, 0.62, 0);                          // a skirt that flares in a spin
      add(new THREE.CylinderGeometry(0.23, 0.23, 0.07, 14), M('#d4963f'), 0, 2.38, 0);                          // an ochre hat band
      add(new THREE.SphereGeometry(0.21, 10, 8), M('#262d4e'), 0, 2.2, 0.05);                       // the head
      add(new THREE.ConeGeometry(0.24, 0.5, 10), M('#1d2543'), 0, 2.45, -0.02);                      // the hood's point
      const limb = (r, h, hex, x, y) => { const pv = new THREE.Group(); pv.position.set(x, y, 0); body.add(pv); add(new THREE.CylinderGeometry(r, r * 0.8, h, 6), M(hex), 0, -h / 2, 0, pv); return pv; };
      const legL = limb(0.08, 1.1, '#1d2543', -0.14, 0.65), legR = limb(0.08, 1.1, '#1d2543', 0.14, 0.65);
      for (const lg of [legL, legR]) add(new THREE.BoxGeometry(0.05, 0.03, 0.42), M('#d4dcef'), 0, -1.12, 0.07, lg);   // skate blades
      const armL = limb(0.06, 0.95, '#1d2543', -0.3, 1.95), armR = limb(0.06, 0.95, '#1d2543', 0.3, 1.95);
      const sg = own(new THREE.BufferGeometry()), pos = new Float32Array(22 * 3), idx = [];
      for (let j = 0; j < 10; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setIndex(idx);
      const scarf = new THREE.Mesh(sg, M('#d4963f')); scarf.frustumCulled = false; if (ghost) scarf.renderOrder = 10; body.add(scarf);   // an ochre scarf
      body.rotation.x = 0.3;
      return { g, legL, legR, armL, armR, pos, sg, cloak };
    };
    const poseSkater = (S, t, flare = 1, tuck = 0) => {
      const w = Math.sin(t * 1.5); S.cloak.scale.set(flare, 1, flare);
      S.legR.rotation.x = 0.6 + 0.3 * w + tuck; S.legL.rotation.x = -0.15 - 0.15 * w + tuck * 0.8;
      S.armL.rotation.z = -0.8; S.armR.rotation.z = 0.8; S.armL.rotation.x = 0.4 * w; S.armR.rotation.x = -0.4 * w;
      const p = S.pos;
      for (let j = 0; j < 11; j++) {
        const k = j / 10, sway = Math.sin(t * 2.4 - j * 0.7) * 0.18 * k, y = 2.02 - 0.13 * j + Math.sin(t * 2.0 - j * 0.5) * 0.1 * k, z = -0.1 - j * 0.3;
        p[j * 6] = -0.11 + sway; p[j * 6 + 1] = y; p[j * 6 + 2] = z; p[j * 6 + 3] = 0.11 + sway; p[j * 6 + 4] = y; p[j * 6 + 5] = z;
      }
      S.sg.attributes.position.needsUpdate = true;
    };
    const skater = makeSkater(false), ghost = makeSkater(true);
    scene.add(skater.g, ghost.g);
    const TN = 120, tpos = new Float32Array(TN * 2 * 3), tidx = [], trailPts = [];
    for (let i = 0; i < TN - 1; i++) { const a = i * 2; tidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const tg = own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3)); tg.setIndex(tidx);
    const trail = new THREE.Mesh(tg, own(new THREE.MeshBasicMaterial({ color: '#b7c2dc', transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    trail.frustumCulled = false; trail.renderOrder = 3; scene.add(trail);
    const _p = new THREE.Vector3(), _t = new THREE.Vector3();
    let smx = null, smz = 0, smh = 0;   // the skater's eased position and heading: no snapping from frame to frame
    // spray: salt crystals thrown up behind the blades, drifting down and fading
    const SPN = 90, spp = new Float32Array(SPN * 3), spc = new Float32Array(SPN * 3), spv = [], spa = new Float32Array(SPN).fill(9);
    for (let i = 0; i < SPN; i++) spv.push(new THREE.Vector3());
    const spg = own(new THREE.BufferGeometry()); spg.setAttribute('position', new THREE.BufferAttribute(spp, 3)); spg.setAttribute('color', new THREE.BufferAttribute(spc, 3));
    const spTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), rg = g.createRadialGradient(16, 16, 1, 16, 16, 15); rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 32, 32); return own(new THREE.CanvasTexture(c)); })();
    const spray = new THREE.Points(spg, own(new THREE.PointsMaterial({ map: spTex, size: 1, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }))); spray.frustumCulled = false; scene.add(spray);

    return {
      scene, path, duration: DUR, title: 'The Salt Hexagons', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 0.3, nearThrough: 0.4, far: 70000, lookAhead: 14, sway: 0, bank: 0.05 },
      pois: [],
      // the portal sits on the horizon at the end of the flight, half-risen out of the flat, in the colour of the dawn band the water mirrors
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#f0b090', veil: '#f0b090', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.2, radius: 0.45, threshold: 0.9 }, grade: { saturation: 1.08, contrast: 1.04, tint: '#f4f1ff', shadowTint: '#0a1030', vignette: 0.2, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR);
        sky.update(dt, t, camera);
        ground.position.set(camera.position.x, 0, camera.position.z); ridgeMesh.position.set(camera.position.x, 0, camera.position.z);
        groundMat.uniforms.uTime.value = t;
        for (const f of fauna) f.update(dt, t, camera, u);
        // the skater keeps ahead of the camera, further and bigger the higher we are
        // the camera follows the skater from just behind and very low, so the blades, the spray and the reflection are what you see
        const cp = camera.position, pu = Math.max(0, u || 0), L = 7.5 + 1.0 * cp.y, uu = Math.min(0.992, pu + L / PL);
        path.pointAt(uu, _p); path.tangentAt(uu, _t);
        const sc = 1.25 + 0.075 * cp.y, sxT = _p.x + (2.6 + 0.04 * cp.y) * Math.sin(T * 0.9), szT = _p.z, headT = Math.atan2(_t.x, _t.z) + 0.22 * Math.cos(T * 0.9);
        if (smx === null) { smx = sxT; smz = szT; smh = headT; }
        { const k = 1 - Math.exp(-dt * 14); smx += (sxT - smx) * k; smz += (szT - smz) * k; let dh = headT - smh; dh = ((dh + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; smh += dh * k; }
        const sx = smx, sz = smz, head = smh;
        let yy = 0, spin = 0, flare = 1, tuck = 0;
        { const a = (T - 5.2) / 1.5; if (a > 0 && a < 1) { spin = sm(a) * Math.PI * 6; flare = 1 + 0.8 * Math.sin(a * Math.PI); } }      // a pirouette, the cloak flaring
        { const a = (T - 9.0) / 0.9; if (a > 0 && a < 1) { yy = 4 * a * (1 - a) * 1.2 * sc; tuck = 0.7 * Math.sin(a * Math.PI); } }     // a leap
        skater.g.position.set(sx, yy, sz); skater.g.rotation.y = head + spin; skater.g.scale.setScalar(sc);
        ghost.g.position.set(sx, -yy, sz); ghost.g.rotation.y = head + spin; ghost.g.scale.set(sc, -sc, sc);
        poseSkater(skater, t, flare, tuck); poseSkater(ghost, t, flare, tuck);
        const lp = trailPts[trailPts.length - 1];
        if (!lp || Math.hypot(lp[0] - sx, lp[1] - sz) > 3) { trailPts.push([sx, sz]); if (trailPts.length > TN) trailPts.shift(); }
        const wd = 0.12 + 0.012 * sc;
        for (let i = 0; i < TN; i++) {
          const a = trailPts[Math.min(i, trailPts.length - 1)] || [sx, sz], b = trailPts[Math.min(i + 1, trailPts.length - 1)] || a, c = trailPts[Math.max(Math.min(i, trailPts.length - 1) - 1, 0)] || a;
          let dx = b[0] - c[0], dz = b[1] - c[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
          tpos.set([a[0] - dz * wd, 0.08, a[1] + dx * wd, a[0] + dz * wd, 0.08, a[1] - dx * wd], i * 6);
        }
        tg.attributes.position.needsUpdate = true;
        // the spray: respawn at the blades, throw back and up, fall and fade
        spray.material.size = 0.05 * sc + 0.12;
        for (let i = 0; i < SPN; i++) {
          spa[i] += dt;
          if (spa[i] > 1.4) { spa[i] = Math.random() * 0.1; spp[i * 3] = sx + (Math.random() - 0.5) * 0.3 * sc; spp[i * 3 + 1] = 0.12; spp[i * 3 + 2] = sz + (Math.random() - 0.5) * 0.3 * sc; spv[i].set(-_t.x * 1.5 * sc + (Math.random() - 0.5) * 0.9 * sc, (0.7 + Math.random() * 1.4) * sc * 0.55, -_t.z * 1.5 * sc + (Math.random() - 0.5) * 0.9 * sc); }
          spv[i].y -= 3.2 * dt; spp[i * 3] += spv[i].x * dt; spp[i * 3 + 1] = Math.max(0.05, spp[i * 3 + 1] + spv[i].y * dt); spp[i * 3 + 2] += spv[i].z * dt;
          const f = Math.max(0, 1 - spa[i] / 1.4) * 0.5; spc[i * 3] = 0.85 * f; spc[i * 3 + 1] = 0.9 * f; spc[i * 3 + 2] = f;
        }
        spg.attributes.position.needsUpdate = true; spg.attributes.color.needsUpdate = true;
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
