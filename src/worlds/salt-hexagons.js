// THE SALT HEXAGONS: Salar de Uyuni, Bolivia, in the blue hour before dawn at about -10 C. You skate at knee height behind a giant
// cloaked skater, 3.5 m tall, across the salt crust and its thin mirror pools: the only giant on a flat with no scale, so it is the
// ruler for the whole place. You pass the cactus island of Incahuasi on the right and the Colchani salt mounds on the left, with
// vicunas trotting under banded Tunupa; the skater jumps a pressure ridge and its landing sends a lagoon of James's flamingos up.
// Then the camera rises for a few seconds with the flock, and the crust's cracked cells, nested at ten and a hundred times their
// size, read as town-sized hexagons with the skater a speck on them; the skater stops in a spray, pushes twice and leaps into the
// first sun of the day, which is the portal, half-risen out of the flat with its twin in the water.
// The ground is one shader: the ray from the eye to the plane y = 0 is cut by four nested jittered-cell (Voronoi) networks with
// wavy, raised, sometimes doubled or broken ridges, anti-aliased by pixel footprint; wet film shows the sky by Fresnel. Everything
// that stands on the flat is drawn a second time upside down by a mirror material whose depth is that of the water it is seen in,
// so its reflection is hidden by what stands in front and fades on dry crust. Nothing is loaded. 9:16 is the target shape.
import * as THREE from 'three';
import { makePath } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';
import * as F from '../kit/fauna.js';
import * as fx from '../kit/fx.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- the flight, by time (T = u * DUR)
const DUR = 20, VEL = 15, EYE = 0.9;
const R0 = 13.3, R1 = 16.6, S0 = 16.6, S1 = 19.3, LIFT = 27, END_Y = 9;   // knee height to 13.3 s, a short rise to 28 m, then settle onto the sun
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ss = (a, b, x) => sm((x - a) / (b - a));
const yOf = (T) => EYE + 0.025 * Math.sin((T * Math.PI) / 0.75) * (1 - ss(R0 - 0.6, R0, T)) + LIFT * ss(R0, R1, T) - (LIFT + EYE - END_Y) * ss(S0, S1, T);
// the line over the ground, by horizontal metres: a left carve (the hook), a right bend, then a long straight at the sun
const thOf = (h) => -0.42 * Math.sin((2 * Math.PI * (h - 20)) / 140) * (1 - ss(140, 200, h));
// display colour (what the shaders treat as display values and raise to 2.2)
const D = (hex) => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const fract = (x) => x - Math.floor(x);
// the shader's hash, in JS (no sine: it gives the same answer on the GPU), so glints can sit on the shader's ridges
const h2js = (x, y) => { let a = fract(x * 0.1031), b = fract(y * 0.103), c = fract(x * 0.0973); const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d; return [fract((a + b) * c), fract((a + c) * b)]; };

// ---------------------------------------------------------------- shared GLSL
const G_HASH = /* glsl */`
  vec2 h2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
  float h1(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
  float fbm3(vec2 p){ return .55 * vn(p) + .3 * vn(p * 2.13 + 7.1) + .15 * vn(p * 4.37 - 3.3); }
`;
// the water film: low noise blobs 20-200 m across over about a third of the flat, and the pools the story needs
const G_WET = /* glsl */`
  uniform vec4 uPool[6];
  float filmN(vec2 w){ return fbm3(w / 95. + vec2(3.7, -1.3)); }
  float filmAt(vec2 w){
    float f = smoothstep(.57, .63, filmN(w));
    for (int i = 0; i < 6; i++) { vec4 P = uPool[i]; float d = length((w - P.xy) / P.zw); f = max(f, 1. - smoothstep(.72, 1., d)); }
    return f;
  }
`;
// the unlit paint every built thing wears: sky fill from above, a dawn rim from the sun's side, a darker core; MIRROR draws it upside
// down at the depth of the water it is seen in, faded by the wetness there
const PAINT_V = /* glsl */`
  attribute vec3 aC; attribute float aFlex;
  uniform vec4 uFlut;
  varying vec3 vW, vN, vC; varying vec3 vP0;
  void main(){
    vec3 p = position;
    if (aFlex > 0.) { float a = atan(p.x, p.z); vec2 o = normalize(p.xz + 1e-5); p.xz += o * aFlex * uFlut.y * sin(uFlut.x + a * 3.) + aFlex * uFlut.zw; }
    mat4 M = modelMatrix;
    #ifdef USE_INSTANCING
    M = M * instanceMatrix;
    #endif
    vec4 w = M * vec4(p, 1.);
    vN = normalize(mat3(M) * normal); vC = aC; vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
    vP0 = w.xyz;
    #ifdef MIRROR
    { // the point of the water this mirrored point is seen in: its depth is the water's, a hair nearer
      float wy = min(w.y, -1e-3), k = cameraPosition.y / max(cameraPosition.y - wy, 1e-3);
      vec3 P0 = cameraPosition + (w.xyz - cameraPosition) * k; vP0 = P0;
      vec4 c0 = projectionMatrix * viewMatrix * vec4(cameraPosition + (P0 - cameraPosition) * .996, 1.);
      gl_Position.z = c0.z / c0.w * gl_Position.w;
    }
    #endif
  }`;
const PAINT_F = /* glsl */`
  uniform vec3 uSunDir, uSky, uRim, uFogCol, uTint; uniform float uFogD, uLit, uRimK, uSpark, uOpacity, uTime;
  varying vec3 vW, vN, vC; varying vec3 vP0;
  ${G_HASH}
  ${G_WET}
  void main(){
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vW);
    vec3 c = vC * uTint;
    float sun = max(dot(N, uSunDir), 0.), fres = pow(1. - abs(dot(N, V)), 3.);
    vec3 lit = c * (uSky * (.6 + .4 * N.y) + uRim * sun * .45);
    lit += uRim * fres * (.3 + .7 * sun) * uRimK;
    lit *= .8 + .2 * fres;
    if (uSpark > 0.) { vec3 q = floor(vW * 22.); float g = step(.982, h1(q.xz + q.y * 7.13)) * (.5 + .5 * sin(uTime * 1.1 + h1(q.zx) * 40.)); lit += vec3(.95, .9, .95) * g * uSpark * (.3 + sun); }
    vec3 col = mix(c, lit, uLit);
    col = pow(max(col, 0.), vec3(2.2));
    float d = length(vW - cameraPosition), f = 1. - exp(-pow(d * uFogD, 2.));
    col = mix(col, uFogCol, f);
    float a = uOpacity;
    #ifdef MIRROR
    float ey = max(-normalize(vW - cameraPosition).y, 0.), Fr = clamp(.42 + .58 * pow(1. - ey, 2.2), 0., 1.);
    a *= mix(.25, .85, filmAt(vP0.xz)) * Fr;
    #endif
    gl_FragColor = vec4(col, a);
  }`;
// points: spray, breath, splashes, glints. size in metres, colour as display rgb + alpha
const PTS_V = /* glsl */`
  attribute float aSize; attribute vec4 aCol; uniform float uPx; varying vec4 vCol;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
    float px = aSize * uPx / max(-mv.z, .05); gl_PointSize = clamp(px, 1.5, 220.);
    vCol = vec4(pow(aCol.rgb, vec3(2.2)), aCol.a * clamp(px / 1.5, .15, 1.));
    if (aCol.a <= .001) gl_Position = vec4(2., 2., 2., 1.);
  }`;
const PTS_F = /* glsl */`
  varying vec4 vCol;
  void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r = dot(q, q); if (r > 1.) discard; float a = exp(-r * 3.5) * (1. - r) * vCol.a; gl_FragColor = vec4(vCol.rgb, a); }`;

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

    // ---------- the route, built by time at constant speed so that T = u * DUR holds: horizontal metres h(T), the ground line by h ----------
    const NT = 2000, hT = new Float32Array(NT + 1), gx = [], gz = [], gth = [];
    { let h = 0, x = 0, z = 0;
      for (let i = 0; i <= NT; i++) {
        const T = (i / NT) * DUR; hT[i] = h;
        if (Math.floor(h * 2) >= gx.length) { gx.push(x); gz.push(z); gth.push(thOf(h)); }
        const dy = (yOf(T + 0.004) - yOf(T - 0.004)) / 0.008, dh = Math.sqrt(Math.max(1, VEL * VEL - dy * dy)) * (DUR / NT), th = thOf(h);
        x += Math.sin(th) * dh; z -= Math.cos(th) * dh; h += dh;
      }
      for (let k = 0; k < 400; k++) { const th = thOf(gx.length / 2); gx.push(gx[gx.length - 1] + Math.sin(th) * 0.5); gz.push(gz[gz.length - 1] - Math.cos(th) * 0.5); gth.push(th); }   // the line runs on past the sun
    }
    const hEnd = hT[NT];
    const hcOf = (T) => { const f = Math.min(NT, Math.max(0, (T / DUR) * NT)), i = Math.min(NT - 1, Math.floor(f)); return hT[i] + (hT[i + 1] - hT[i]) * (f - i); };
    const ground = (h, out = { x: 0, z: 0, th: 0 }) => { const f = Math.min(gx.length - 1.001, Math.max(0, h * 2)), i = Math.floor(f), k = f - i; out.x = gx[i] + (gx[i + 1] - gx[i]) * k; out.z = gz[i] + (gz[i + 1] - gz[i]) * k; out.th = gth[i] + (gth[i + 1] - gth[i]) * k; return out; };
    const pts = [];
    for (let k = 0; k <= 80; k++) { const T = (k / 80) * DUR, g = ground(hcOf(T)); pts.push([g.x, yOf(T), g.z]); }
    const path = makePath(pts);
    const G0 = ground(0), GE = ground(hEnd);
    const SUN = new THREE.Vector3(GE.x, END_Y, GE.z);                       // the portal's centre: the half-risen sun
    const sunAz = Math.atan2(SUN.x - G0.x, -(SUN.z - G0.z));
    const SUNDIR = new THREE.Vector3(Math.sin(sunAz), 0.1, -Math.cos(sunAz)).normalize();
    // left/right of the line at h: right is (cos th, sin th)
    const side = (h, off, along = 0) => { const g = ground(h + along); return [g.x + Math.cos(g.th) * off, g.z + Math.sin(g.th) * off]; };

    // the skater's own place along the line: 7.2 m ahead while skating; during the rise it sprints out ahead (so it stays below us,
    // the ruler on the cells), stops hard in a spray, pushes twice and leaps, and is through the ring just before we are
    const K = [[R0, hcOf(R0) + 7.2, VEL], [16.5, hcOf(16.5) + 22.5, 13], [17.35, 0, 1.4], [18.8, hEnd - 7.6, 11.5]];
    K[2][1] = K[3][1] - ((K[2][2] + K[3][2]) / 2) * (K[3][0] - K[2][0]) - 0.6;
    const T_TAKE = 18.8, V_LEAP = 11.5;
    const hSkOf = (T) => {
      if (T <= R0) return hcOf(T) + 7.2;
      if (T >= T_TAKE) return K[3][1] + V_LEAP * (T - T_TAKE);
      let i = 0; while (i < K.length - 2 && T > K[i + 1][0]) i++;
      const [t0, p0, v0] = K[i], [t1, p1, v1] = K[i + 1], d = t1 - t0, s = (T - t0) / d, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * d * v0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * d * v1;
    };
    const H_LAND = hSkOf(11.9), H_RIDGE = hSkOf(11.45);
    await tick();

    // ---------- shared uniforms (display colours; the fog colour is linear) ----------
    const FOG = new THREE.Color('#c39ca6'), FOGD = 0.00021;
    const U = {
      uTime: { value: 0 }, uFogCol: { value: FOG.clone() }, uFogD: { value: FOGD }, uSunDir: { value: SUNDIR.clone() },
      uSky: { value: V3(D('#b4c0ea')) }, uRim: { value: V3(D('#f0b090')) },
      uPool: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(1e6, 1e6, 1, 1)) },
    };
    const pools = U.uPool.value;
    { const a = side(16, 0); pools[0].set(a[0], a[1], 48, 52); }                                    // the hook's water: stars underfoot
    { const a = side(H_LAND + 128, 55); pools[1].set(a[0], a[1], 70, 115); }                               // the flamingos' lagoon, and the landing
    { const a = side(hEnd - 30, 0); pools[2].set(a[0], a[1], 70, 95); }                              // the glitter column to the sun
    { const a = side(hEnd + 470, 0); pools[3].set(a[0], a[1], 330, 170); }                           // the Andean flamingos' far lagoon
    { const a = side(hcOf(8.6) + 8, -30); pools[4].set(a[0], a[1], 22, 50); }                        // puddles among the salt mounds
    const paint = (o = {}) => own(new THREE.ShaderMaterial({
      uniforms: { ...U, uTint: { value: V3(o.tint || [1, 1, 1]) }, uLit: { value: o.lit ?? 1 }, uRimK: { value: o.rim ?? 0.5 }, uSpark: { value: o.spark ?? 0 }, uOpacity: { value: o.opacity ?? 1 }, uFlut: o.flut || { value: new THREE.Vector4() } },
      defines: o.mirror ? { MIRROR: 1 } : {}, vertexShader: PAINT_V, fragmentShader: PAINT_F, side: THREE.DoubleSide,
      transparent: !!o.mirror, depthWrite: !o.mirror,
    }));
    // a geometry ready for paint: a display colour per vertex (constant or by place) and how far it flutters (the cloak's hem)
    const prep = (g, col, flex = 0) => {
      const P = g.attributes.position, n = P.count, C = new Float32Array(n * 3), Fx = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), c = typeof col === 'function' ? col(x, y, z) : col; C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; Fx[i] = typeof flex === 'function' ? flex(x, y, z) : flex; }
      g.setAttribute('aC', new THREE.BufferAttribute(C, 3)); g.setAttribute('aFlex', new THREE.BufferAttribute(Fx, 1));
      if (g.attributes.uv) g.deleteAttribute('uv');
      return own(g);
    };
    const merge = (list) => own(mergeGeometries(list));
    // a thing and its reflection: the reflection is the same geometry under a group flipped about the water
    const mirrorGroup = own(new THREE.Group()); mirrorGroup.scale.y = -1; scene.add(mirrorGroup);
    const twin = (mesh, mirMat, parentMirror = mirrorGroup) => {
      const m = mesh.isInstancedMesh ? new THREE.InstancedMesh(mesh.geometry, mirMat, mesh.count) : new THREE.Mesh(mesh.geometry, mirMat);
      if (mesh.isInstancedMesh) { m.instanceMatrix.array.set(mesh.instanceMatrix.array); m.instanceMatrix.needsUpdate = true; }
      m.position.copy(mesh.position); m.rotation.copy(mesh.rotation); m.scale.copy(mesh.scale); m.renderOrder = 2; m.frustumCulled = false;
      parentMirror.add(m); return m;
    };

    // ---------- sky: blue hour, the dawn band growing along the horizon from the sun's bearing ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'blueHour', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      zenith: '#16275e', mid: '#3a5596', horizon: '#d89a88', ground: '#c79a96', horizonPow: 2.4,
      scatterColor: '#f0b090', scatter: 0.55, scatterPow: 6, scatterFall: 5, sunAzimuth: (sunAz * 180) / Math.PI, sunElevation: -4, sunIntensity: 0, sunGlow: 0, bodies: [],
      stars: 0.8, milkyWay: 0.25, clouds: false, clouds2: { coverage: 0.3, stretch: 1, opacity: 0.42, scale: 0.6, lit: '#eaa8b4', shade: '#6070a8' },
    });
    scene.add(sky.object);
    scene.fog = new THREE.FogExp2(FOG, FOGD);
    scene.background = new THREE.Color('#3a5596');
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    // the dawn over the sky: a band whose width and warmth grow with T, and the pink Belt of Venus a little above the horizon
    const dawnMat = own(new THREE.ShaderMaterial({
      uniforms: { uDawn: { value: 0 }, uSd: { value: new THREE.Vector2(SUNDIR.x, SUNDIR.z).normalize() } },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
      fragmentShader: `uniform float uDawn; uniform vec2 uSd; varying vec3 vD;
        void main(){ vec3 d = normalize(vD); float e = d.y; if (e < -.02) discard;
          float a = dot(normalize(d.xz + 1e-5), uSd), band = exp(-max(e, 0.) * mix(16., 9., uDawn)) * pow(.5 + .5 * a, mix(7., 2.4, uDawn));
          vec3 c = vec3(.94, .62, .48) * band * (.16 + .2 * uDawn) + vec3(.55, .25, .38) * exp(-pow((e - .13) / .06, 2.)) * (.04 + .06 * uDawn);
          gl_FragColor = vec4(pow(c, vec3(2.2)) * 1.6, 0.); }`,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, fog: false,
    }));
    const dawn = new THREE.Mesh(own(new THREE.SphereGeometry(1000, 48, 24)), dawnMat); dawn.frustumCulled = false; dawn.renderOrder = -5; scene.add(dawn);
    await tick();

    // ---------- the ground: crust and mirror in one shader ----------
    const WAKE = 8, wake = [...Array(WAKE)].map(() => new THREE.Vector4(0, 0, -99, 0)); let wakeI = 0;
    const addWake = (x, z, a) => { wake[wakeI].set(x, z, U.uTime.value, a); wakeI = (wakeI + 1) % WAKE; };
    const groundMat = own(new THREE.ShaderMaterial({
      uniforms: { ...U, uSun: { value: SUN.clone() }, uSunR: { value: 9 }, uWake: { value: wake }, uDawn: { value: 0 }, uSd: { value: new THREE.Vector2(SUNDIR.x, SUNDIR.z).normalize() } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uFogD, uSunR, uDawn; uniform vec3 uFogCol, uSun; uniform vec2 uSd; uniform vec4 uWake[${WAKE}]; varying vec3 vW;
        ${G_HASH}
        ${G_WET}
        // jittered cells (jitter .85, so no cell looks hexagonal): distance to the nearest edge, this cell, the one across that edge, and
        // the edge's direction (from this cell toward the other)
        float vor(vec2 x, out vec2 cid, out vec2 nid, out vec2 nr){
          vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.); float md = 8.;
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .85 - f; float d = dot(r, r); if (d < md) { md = d; mr = r; mg = g; } }
          md = 8.; vec2 bg = mg + vec2(1., 0.); nr = vec2(1., 0.);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = mg + vec2(float(i), float(j)); vec2 r = g + .5 + (h2(n + g) - .5) * .85 - f; vec2 dd = r - mr;
            if (dot(dd, dd) > 1e-5) { vec2 nd = normalize(dd); float e = dot(.5 * (mr + r), nd); if (e < md) { md = e; bg = g; nr = nd; } } }
          cid = n + mg; nid = n + bg; return md;
        }
        float vor1(vec2 x){ vec2 a, b, c; return vor(x, a, b, c); }
        vec3 skyC(vec3 d){
          float e = d.y; vec3 H = vec3(.847, .604, .533), M = vec3(.227, .333, .588), Z = vec3(.086, .153, .369);
          vec3 c = mix(H, M, smoothstep(0., .24, e)); c = mix(c, Z, smoothstep(.22, .85, e));
          float a = dot(normalize(d.xz + 1e-5), uSd), band = exp(-max(e, 0.) * mix(16., 9., uDawn)) * pow(.5 + .5 * a, mix(7., 2.4, uDawn));
          c = mix(c, vec3(.94, .69, .565), band * (.4 + .35 * uDawn));
          c += vec3(.14, .05, .09) * exp(-pow((e - .13) / .06, 2.)) * (.3 + .5 * uDawn);
          return c;
        }
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          float ey = max(-rd.y, 1e-4), t = cameraPosition.y / ey;
          vec2 w = cameraPosition.xz + rd.xz * t;
          float pwm = max(length(fwidth(w)), 1e-5);
          vec2 sd = normalize(uSun.xz - w), rdh = normalize(rd.xz + 1e-5);
          float fn = filmN(w), film = filmAt(w), margin = smoothstep(.5, .57, fn) * (1. - film);
          // the skater's wake: rings from each stroke, breaking the mirrored stars into short streaks
          float wv = 0.; vec2 wg = vec2(0.);
          for (int i = 0; i < ${WAKE}; i++) { vec4 Kw = uWake[i]; float age = uTime - Kw.z; if (age < 0. || age > 3.5 || Kw.w <= 0.) continue;
            vec2 dv = w - Kw.xy; float r = length(dv), front = .3 + age * 1.9, env = exp(-age * 1.1) * smoothstep(front + .5, front, r) * smoothstep(front - 2.4, front - .4, r) * Kw.w, ph = (r - front) * 7.;
            wv += sin(ph) * env; wg += cos(ph) * env * dv / max(r, .01); }
          float wres = 1. - smoothstep(.02, .09, pwm); wv *= film * wres; wg *= film * wres;
          // the salt network at four sizes (2.2 m, 19 m, 165 m, 1.4 km): each fades in once its cells span ~10 px, so nothing crawls
          float ridge = 0., face = 0., shore = 0., wetCell = 0., big = .5, S = 2.2;
          for (int k = 0; k < 4; k++) {
            float fk = float(k);
            vec2 p = w / S + vec2(17.3, -9.1) * fk; p += .08 * vec2(sin(p.y * 4.3 + fk), sin(p.x * 3.7 + 2. * fk));
            vec2 cid, nid, nr; float e = vor(p, cid, nid, nr);
            float pw = max(length(fwidth(p)), 1e-6), vis = smoothstep(10., 34., 1. / pw);
            float eh = h1(cid + nid + 17.);                                                   // one number per edge (the same from both sides)
            float cap = k == 0 ? .09 : k == 1 ? .3 : k == 2 ? .7 : 1.6;                       // the big networks' ridges stay narrow: pressure lines, not roads
            float rw = max(min(.021 * mix(.5, 2., vn(p * 1.7 + 3. * fk)), cap / S), 1.1 * pw);   // ridge width varies 0.5-2x along its length
            float prof = eh > .7 ? 1. - smoothstep(rw * .42, rw * .42 + 1.3 * pw, abs(e - rw * 1.15))   // doubled: two lips with a groove
                                 : 1. - smoothstep(rw, rw + 1.4 * pw, e);
            prof *= (1. - step(eh, .15) * smoothstep(.4, .6, vn(p * 2.3 + 11.))) * vis * (k == 0 ? 1. : k == 1 ? .8 : mix(.28, .85, smoothstep(4., 20., cameraPosition.y)));   // about 15% are broken
            if (prof > ridge) face = dot(-nr, sd);                                            // the raised lip's side toward the sun
            ridge = max(ridge, prof);
            shore = max(shore, (1. - smoothstep(rw, rw + .14, e)) * vis);
            if (k == 1) wetCell = step(.64, h1(cid + 3.)) * vis;
            if (k == 2) { big = mix(.5, h1(cid + 5.), vis); wetCell = max(wetCell, step(.74, h1(cid + 9.)) * vis); }
            S *= 8.65;
          }
          // fine dendritic crystal in the cells (4 and 13 cm), pits and frost, only where the eye can resolve them
          float c1 = vor1(w / .045), c2 = vor1(w / .13 + 5.), pw1 = pwm / .045, pw2 = pwm / .13;
          float cry = (1. - smoothstep(.05, .05 + 2. * pw1, c1)) * (1. - smoothstep(.12, .45, pw1)) * .6 + (1. - smoothstep(.04, .04 + 2. * pw2, c2)) * (1. - smoothstep(.12, .45, pw2)) * .5;
          float pit = smoothstep(.72, .9, vn(w * 3.1)) * (1. - smoothstep(.05, .3, pwm * 3.1));
          float grain = (h1(floor(w / .15)) - .5) * .05 * (1. - smoothstep(.03, .12, pwm / .15));
          vec3 dry = vec3(.36, .41, .50) * mix(.9, 1.08, big) + grain + vec3(.05, .05, .06) * cry;
          dry *= 1. - .08 * pit;
          dry += vec3(.10, .07, .08) * pow(max(dot(rdh, sd), 0.), 6.) * (1. - smoothstep(.05, .4, ey)) * .7;   // frost sheen toward the dawn
          dry = mix(dry, vec3(.25, .30, .41), margin * .75);                                                    // damp margins round the film
          // the mirror: sky by Fresnel over a dark bed, stars, pink cirrus, the sun's twin and its glitter
          float ey2 = clamp(ey + wv * .035 + .003 * sin(uTime * .7 + w.x * .5 + w.y * .37), .0005, 1.);
          vec3 rr = normalize(vec3(rd.x + wg.x * .045, ey2, rd.z + wg.y * .045));
          float Fr = clamp(.42 + .58 * pow(1. - ey2, 2.2), 0., 1.);
          vec3 mirror = mix(vec3(.118, .165, .25), skyC(rr), Fr);
          vec2 sp = rr.xz / (rr.y + .25) * 55.; vec2 sc = floor(sp), sf = fract(sp) - .5, jit = (h2(sc + 7.) - .5) * .6;
          float star = step(.972, h1(sc)) * (1. - smoothstep(.035, .035 + .1 + length(fwidth(sp)), length(sf - jit))) * (.7 + .3 * sin(uTime * 1.1 + h1(sc + 3.) * 6.28));
          mirror += vec3(.80, .85, 1.) * star * .55 * Fr * smoothstep(.12, .45, ey2) * (1. - .6 * uDawn);
          { vec2 cp = rr.xz / (rr.y + .3) * vec2(2.4, 5.5) + vec2(uTime * .012, 0.);
            float cl = smoothstep(.55, .85, vn(cp) * .6 + vn(cp * 2.3) * .3 + vn(cp * 5.) * .1) * (1. - smoothstep(.1, .6, ey2)) * smoothstep(.03, .12, ey2);
            mirror = mix(mirror, vec3(.88, .62, .68), cl * .3 * Fr); }
          { // the half-risen sun's lower half: the portal ring seen in the water
            vec3 dv = vec3(uSun.x, -uSun.y, uSun.z) - cameraPosition; float dist = length(dv), ang = acos(clamp(dot(rd, dv / dist), -1., 1.)), aR = asin(clamp(uSunR / dist, 0., .99));
            float rw2 = aR * .06 + .0016 + abs(wv) * .012;
            float ri = exp(-pow((ang - aR) / rw2, 2.)) + .16 * (1. - smoothstep(aR * .85, aR, ang)) + .22 * exp(-max(ang - aR, 0.) / (aR * .5 + .003));
            mirror += vec3(.94, .69, .565) * ri * .75 * Fr; }
          float glit = pow(max(dot(sd, rdh), 0.), 900.) * (.6 + .4 * sin(uTime * .9 + w.x * .05 + w.y * .04)) * Fr * smoothstep(0., .02, ey) * (1. - smoothstep(.12, .5, ey));
          mirror += vec3(.90, .58, .44) * glit * (.55 + .4 * uDawn);
          float wet = max(film, wetCell * .9);
          vec3 col = mix(dry, mirror, wet);
          col = mix(col, vec3(.30, .36, .48), shore * .3 * wetCell * (1. - film));
          vec3 rSh = vec3(.353, .392, .478), rMid = vec3(.486, .529, .612), rPk = vec3(.60, .51, .56);
          vec3 rc = face > 0. ? mix(rMid, rPk, face * (.35 + .4 * uDawn)) : mix(rMid, rSh, -face);
          col = mix(col, rc, ridge * mix(1., .3, film));
          { // salt crystals catching the low light in the mid-field (the near glints are particles on the same ridges)
            vec2 gc = floor(w * 9.); float gk = step(.987, h1(gc + 3.)) * (.5 + .5 * sin(uTime * 1.1 + h1(gc) * 40.)) * ridge * (1. - smoothstep(.02, .09, pwm * 9.)) * smoothstep(15., 30., t);
            col += vec3(.9, .85, .8) * gk * .5; }
          col = pow(max(col, 0.), vec3(2.2));
          float f = 1. - exp(-pow(t * uFogD, 2.));
          gl_FragColor = vec4(mix(col, uFogCol, f), 1.);
        }`,
    }));
    const groundMesh = new THREE.Mesh(own(new THREE.PlaneGeometry(60000, 60000, 1, 1).rotateX(-Math.PI / 2)), groundMat);
    groundMesh.frustumCulled = false; groundMesh.renderOrder = -1; scene.add(groundMesh);
    await tick();

    // ---------- the far skyline: a soft ring at 1.7 km, the ridge at 3 km, and Tunupa with its bands; all doubled in the water ----------
    const sky0 = paint({ lit: 0 }), skyM = paint({ lit: 0, mirror: true });
    const farGroup = new THREE.Group(), farMirror = new THREE.Group(); farMirror.scale.y = -1; scene.add(farGroup); mirrorGroup.parent.add(farMirror);
    const ringGeo = (RR, hf, top, bot, seed) => {
      const P = [], idx = [], N = 220, rows = 4;
      for (let i = 0; i <= N; i++) { const a = -Math.PI + (i / N) * 2 * Math.PI, h = Math.max(0, hf(a)) * RR;
        for (let r = 0; r <= rows; r++) { const f = r / rows; P.push(Math.sin(a) * RR, -25 + (h + 25) * f + (r === rows ? 0 : 0), -Math.cos(a) * RR); }
        if (i) for (let r = 0; r < rows; r++) { const q = (i - 1) * (rows + 1) + r, q2 = q + rows + 1; idx.push(q, q2, q + 1, q + 1, q2, q2 + 1); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
      return prep(g, (x, y) => { const f = Math.min(1, Math.max(0, (y + 25) / (RR * 0.06))); return [bot[0] + (top[0] - bot[0]) * f, bot[1] + (top[1] - bot[1]) * f, bot[2] + (top[2] - bot[2]) * f]; });
    };
    const near1 = (a) => 0.008 + 0.006 * Math.sin(a * 5 + 2) + 0.005 * Math.sin(a * 13 + 0.5) + 0.004 * Math.sin(a * 29 + 1.3);
    const far1 = (a) => 0.03 + 0.024 * Math.sin(a * 7 + 1) + 0.018 * Math.sin(a * 17 + 2) + 0.008 * Math.sin(a * 41 + 0.7);
    const farMeshes = [
      new THREE.Mesh(ringGeo(3000, far1, D('#5b4b86'), D('#c49ca8'), 1), sky0),
      new THREE.Mesh(ringGeo(1700, near1, D('#7a6290'), D('#c8a0aa'), 2), sky0),
    ];
    // Tunupa: a broad cone with a collapsed summit, banded ochre, rust and violet, 3 km off on the left of the mounds
    const tunAz = sunAz - 0.62, TR = 2900;
    {
      const P = [], idx = [], NA = 56, NR = 22, bands = [D('#8a5a48'), D('#6a4a78'), D('#9a6a40'), D('#7a4a52'), D('#6a4a78')];
      for (let r = 0; r <= NR; r++) for (let i = 0; i <= NA; i++) {
        const f = r / NR, a = (i / NA) * Math.PI * 2, rad = 520 * (1 - f) + 70 * f, crater = f > 0.86 ? (f - 0.86) * 260 : 0;
        const n = 1 + 0.08 * Math.sin(a * 5 + f * 9) + 0.05 * Math.sin(a * 11 - f * 4);
        P.push(Math.cos(a) * rad * n, Math.pow(f, 0.8) * 250 - crater * (0.6 + 0.4 * Math.sin(a * 2)) - 10, Math.sin(a) * rad * n);
        if (r && i) { const q = (r - 1) * (NA + 1) + i - 1, q2 = q + NA + 1; idx.push(q, q2, q + 1, q + 1, q2, q2 + 1); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
      const tg = prep(g, (x, y) => { const b = bands[Math.min(4, Math.max(0, Math.floor((y + 10 + 9 * Math.sin(x * 0.02)) / 52)))], hz = Math.max(0, 1 - y / 260) * 0.45, H = D('#c49ca8'); return [b[0] + (H[0] - b[0]) * hz, b[1] + (H[1] - b[1]) * hz, b[2] + (H[2] - b[2]) * hz]; });
      const tm = new THREE.Mesh(tg, paint({ lit: 0.55, rim: 0.15 })); tm.position.set(Math.sin(tunAz) * TR, 0, -Math.cos(tunAz) * TR); farMeshes.push(tm);
    }
    for (const m of farMeshes) { m.frustumCulled = false; farGroup.add(m); const mm = twin(m, m.material === sky0 ? skyM : paint({ lit: 0.55, rim: 0.15, mirror: true }), farMirror); mm.frustumCulled = false; }
    const haze = fx.makeGroundFog({ size: 3400, height: 6, layers: 4, color: '#cfa6b0', opacity: 0.3, coverage: 0.62, near: [380, 650], scale: 0.004, wind: [0.6, 0.2], sunDir: [SUNDIR.x, 0.1, SUNDIR.z], scatter: 0.4 });
    scene.add(haze.object);
    await tick();

    // ---------- Isla Incahuasi: a low hump of coral rock on the right, crowned with columnar cacti, doubled in the water ----------
    const ISL = (() => { const a = side(hcOf(4.6) + 900, 430); const g = ground(hcOf(4.6)); return { x: a[0], z: a[1], th: g.th }; })();
    const islH = (lx, lz) => { const e = 1 - (lx / 300) ** 2 - (lz / 150) ** 2; if (e <= 0) return -2; const n = Math.sin(lx * 0.031 + 1.3) * Math.sin(lz * 0.047) * 0.5 + Math.sin(lx * 0.11 + lz * 0.07) * 0.18 + Math.sin(lx * 0.37 - lz * 0.29) * 0.06; return 36 * Math.pow(e, 0.55) * (0.78 + 0.35 * n) - 2; };
    const isl = new THREE.Group(); isl.position.set(ISL.x, 0, ISL.z); isl.rotation.y = Math.PI / 2 - ISL.th; scene.add(isl);
    const islM = new THREE.Group(); islM.position.copy(isl.position); islM.rotation.copy(isl.rotation); mirrorGroup.add(islM);
    {
      const g = new THREE.PlaneGeometry(620, 320, 70, 36).rotateX(-Math.PI / 2), P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); P.setY(i, islH(x, z) + (Math.sin(x * 1.3) * Math.sin(z * 1.7)) * 0.6); }
      g.computeVertexNormals();
      const ig = prep(g, (x, y) => { const f = Math.min(1, Math.max(0, y / 36)); return [0.30 + 0.06 * f, 0.26 + 0.04 * f, 0.36 + 0.03 * f]; });
      const im = new THREE.Mesh(ig, paint({ lit: 0.8, rim: 0.35 })); isl.add(im); twin(im, paint({ lit: 0.8, rim: 0.35, mirror: true }), islM);
      // the cacti (Echinopsis atacamensis): fluted columns with 0-3 upturned arms, three shapes, instanced at silhouette detail
      const cr = R.fork('cacti'), cac = [];
      for (let v = 0; v < 3; v++) {
        const parts = [new THREE.CylinderGeometry(0.05, 0.062, 1, 8, 3).translate(0, 0.5, 0)];
        for (let a = 0; a < v + (v === 2 ? 1 : 0); a++) {
          const az = cr.range(0, 6.28), y0 = cr.range(0.3, 0.55), out = cr.range(0.1, 0.16), up = cr.range(0.18, 0.3);
          parts.push(new THREE.CylinderGeometry(0.035, 0.04, out, 6).rotateZ(Math.PI / 2).translate(out / 2 + 0.04, y0, 0).rotateY(az));
          parts.push(new THREE.CylinderGeometry(0.032, 0.038, up, 6).translate(out + 0.04, y0 + up / 2, 0).rotateY(az));
        }
        cac.push(prep(mergeGeometries(parts.map((p) => { p.deleteAttribute('uv'); return p; })), D('#2c3a3e')));
      }
      const per = [0, 0, 0], mats = [[], [], []];
      for (let i = 0; i < 110; i++) {
        let lx, lz, y; let tries = 0; do { lx = cr.range(-250, 250); lz = cr.range(-120, 120); y = islH(lx, lz); tries++; } while (y < 6 && tries < 30);
        const v = cr() < 0.35 ? 0 : cr() < 0.6 ? 1 : 2, H = cr.range(4, 10), m = new THREE.Matrix4().compose(new THREE.Vector3(lx, y - 0.5, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, cr.range(0, 6.28), cr.range(-0.05, 0.05))), new THREE.Vector3(H, H, H));
        mats[v].push(m); per[v]++;
      }
      const cm = paint({ lit: 0.7, rim: 0.4 }), cmm = paint({ lit: 0.7, rim: 0.4, mirror: true });
      for (let v = 0; v < 3; v++) { const im2 = new THREE.InstancedMesh(cac[v], cm, per[v]); mats[v].forEach((m, i) => im2.setMatrixAt(i, m)); im2.frustumCulled = false; isl.add(im2); twin(im2, cmm, islM); }
    }
    await tick();

    // ---------- the Colchani salt harvest: lumpy cones in uneven rows on the left, some half dug, each doubled in its puddle ----------
    {
      const mr = R.fork('mounds'), geos = [];
      for (let v = 0; v < 4; v++) {
        const prof = [[1, 0], [0.97, 0.07], [0.8, 0.3], [0.56, 0.58], [0.3, 0.84], [0.1, 0.98], [0, 1.02]], N = 18, P = [], idx = [], ph = mr.range(0, 6);
        for (let r = 0; r < prof.length; r++) for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2, [rr, yy] = prof[r], n = 1 + 0.09 * Math.sin(a * 3 + ph + yy * 4) + 0.05 * Math.sin(a * 7 - yy * 6), slump = 0.1 * yy * (1 - yy);
          let x = Math.cos(a) * rr * n + slump, z = Math.sin(a) * rr * n;
          if (v === 3 && x > 0.15) x = 0.15 + (x - 0.15) * 0.15;                         // half dug: a spade facet down one side
          P.push(x, yy * (v === 3 ? 0.9 : 1), z);
          if (r && i) { const q = (r - 1) * (N + 1) + i - 1, q2 = q + N + 1; idx.push(q, q2, q + 1, q + 1, q2, q2 + 1); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
        geos.push(prep(g, (x, y) => [0.86 + 0.05 * y, 0.86 + 0.04 * y, 0.92 + 0.03 * y]));
      }
      const lists = [[], [], [], []], hA = hcOf(6.6), hB = hcOf(10.6), rows = [19, 24.5, 30, 36.5, 44];
      for (let r = 0; r < rows.length; r++) {
        let h = hA + mr.range(0, 6);
        while (h < hB) {
          const off = -(rows[r] + mr.range(-1.2, 1.2)), [x, z] = side(h, off), v = mr() < 0.12 ? 3 : Math.floor(mr() * 3);
          const bs = mr.range(0.7, 1.1), hs = mr.range(0.7, 1.3);
          lists[v].push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, mr.range(0, 6.28), 0)), new THREE.Vector3(bs, hs, bs)));
          h += mr.range(2.6, 5.5) * (r > 2 ? 1.3 : 1);
        }
      }
      const mm = paint({ lit: 1, rim: 0.6, spark: 0.9 }), mmm = paint({ lit: 1, rim: 0.6, spark: 0.5, mirror: true });
      for (let v = 0; v < 4; v++) { if (!lists[v].length) continue; const im = new THREE.InstancedMesh(geos[v], mm, lists[v].length); lists[v].forEach((m, i) => im.setMatrixAt(i, m)); im.frustumCulled = false; scene.add(im); twin(im, mmm); }
    }
    // the pressure ridge the skater jumps: 0.4 m high and irregular, across the line
    {
      const P = [], idx = [], N = 90, rg = R.fork('ridge');
      const g0 = ground(H_RIDGE), cx = Math.cos(g0.th), cz = Math.sin(g0.th), fx0 = Math.sin(g0.th), fz0 = -Math.cos(g0.th);
      const prof = [[-0.9, -0.02], [-0.45, 0.6], [-0.15, 0.95], [0.12, 1], [0.4, 0.55], [0.85, -0.02]];
      const ph = [rg.range(0, 6), rg.range(0, 6)];
      for (let i = 0; i <= N; i++) {
        const s = (i / N - 0.5) * 70, hgt = 0.4 * (0.6 + 0.25 * Math.sin(s * 0.31 + ph[0]) + 0.15 * Math.sin(s * 0.93 + ph[1])) * (1 - Math.pow(Math.abs(s) / 35, 4)), wob = 0.6 * Math.sin(s * 0.12 + ph[1]) + 0.25 * Math.sin(s * 0.41);
        for (const [a, b] of prof) { const along = a * (0.7 + 0.3 * Math.sin(s * 0.5)) + wob; P.push(g0.x + cx * s + fx0 * along, b * hgt, g0.z + cz * s + fz0 * along); }
        if (i) for (let r = 0; r < prof.length - 1; r++) { const q = (i - 1) * prof.length + r, q2 = q + prof.length; idx.push(q, q2, q + 1, q + 1, q2, q2 + 1); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
      const rgm = new THREE.Mesh(prep(g, D('#7f889e')), paint({ lit: 1, rim: 0.6, spark: 1 })); scene.add(rgm); twin(rgm, paint({ lit: 1, rim: 0.6, mirror: true }));
    }
    await tick();

    // ---------- the shore strip and its vicunas, at the foot of Tunupa ----------
    const light = { sunDir: [SUNDIR.x, 0.25, SUNDIR.z], sunColor: '#ffb48c', sunIntensity: 0.9, sky: '#93a6d8', skyIntensity: 1.35, ground: '#5c6684', groundIntensity: 0.7 };
    {
      const P = [], C = [], idx = [], hA = hcOf(3), hB = hcOf(14.5), N = 60, offs = [-140, -160, -215, -265], buff = D('#a08c78'), crust = D('#5c6680');
      for (let i = 0; i <= N; i++) { const h = hA + ((hB - hA) * i) / N; offs.forEach((o, r) => { const [x, z] = side(h, o + 8 * Math.sin(i * 0.7 + r)); P.push(x, 0.15, z); const f = r === 1 || r === 2 ? 1 : 0; C.push(...(f ? buff : crust)); });
        if (i) for (let r = 0; r < 3; r++) { const q = (i - 1) * 4 + r, q2 = q + 4; idx.push(q, q2, q + 1, q + 1, q2, q2 + 1); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
      const Cs = C; const sg = prep(g, (() => { let k = 0; return () => { const c = [Cs[k], Cs[k + 1], Cs[k + 2]]; k += 3; return c; }; })());
      const sh = new THREE.Mesh(sg, paint({ lit: 0.6, rim: 0.2 })); sh.renderOrder = 1; scene.add(sh);
      // ichu grass tufts
      const tg = prep(new THREE.ConeGeometry(0.35, 0.6, 5).translate(0, 0.3, 0), D('#9a8458')), tr = R.fork('ichu'), tl = [];
      for (let i = 0; i < 220; i++) { const h = tr.range(hA, hB), [x, z] = side(h, -tr.range(165, 255)), s = tr.range(0.6, 1.4); tl.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s * tr.range(0.7, 1.3), s))); }
      const ti = new THREE.InstancedMesh(tg, paint({ lit: 0.8, rim: 0.4 }), tl.length); tl.forEach((m, i) => ti.setMatrixAt(i, m)); ti.frustumCulled = false; scene.add(ti);
      const vic = { ...F.HERD_PRESETS.antelope, h: 0.95, horns: 0, neckLen: 0.62, neckAng: 72, neck: [0.1, 0.065], ears: 0.12, tail: 0.12, pattern: 'none', coat: '#b07a4a', belly: '#efe6d6', legs: '#a87448', sock: '#c9ad88', accent: '#f4ecdc', speed: 1, varieties: 0 };
      const route = []; for (let i = 0; i <= 24; i++) { const h = hcOf(4) + ((hcOf(16) - hcOf(4)) * i) / 24, [x, z] = side(h, -205 + 6 * Math.sin(i * 0.8)); route.push([x, 0, z]); }
      const herd = F.makeHerd({ rng: R.fork('vicuna'), preset: vic, count: 8, size: 1.35, mode: 'migrate', gait: 'run', speed: 0.85, route, closed: false, spread: [4, 30], light, blobShadow: true, shadowOpacity: 0.3 });
      scene.add(herd.object); fauna.push({ update: (dt, t) => herd.update(dt, t) });
    }
    await tick();

    // ---------- flamingos ----------
    const fr = R.fork('flamingos');
    // James's (deeper pink, smaller): standing in the lagoon 30-90 m right of the landing, until the landing sends them up
    const jamesPos = [];
    while (jamesPos.length < 150) { const off = 30 + 60 * Math.pow(fr(), 0.8), along = fr.range(60, 200), [x, z] = side(H_LAND + along, off); jamesPos.push([x, 0, z]); }
    const james = F.makeWaders({ rng: fr.fork('j'), species: 'flamingo', positions: jamesPos, count: jamesPos.length, size: 1.0, level: 0, facing: Math.PI * 0.5, scatterYaw: 1.2, peckRate: 0.5, active: 0.55, light, blobShadow: false,
      body: '#e07a92', belly: '#ea95a8', wing: '#d0607e', neckC: '#e88aa0', cap: '#e88aa0', legC: '#d86a84' });
    scene.add(james.object); fauna.push(james);
    // each bird's own place in the instance table, so they can leave one by one (nearest the landing first)
    const jAttr = (() => { for (const k in james.geometry.attributes) { const a = james.geometry.attributes[k]; if (a.isInstancedBufferAttribute && a.itemSize === 4 && Math.abs(a.array[0] - jamesPos[0][0]) < 1e-3 && Math.abs(a.array[2] - jamesPos[0][2]) < 1e-3) return a; } return null; })();
    const LANDXZ = side(H_LAND, 0), jGone = new Uint8Array(jamesPos.length), jWhen = jamesPos.map((p) => 11.95 + Math.hypot(p[0] - LANDXZ[0], p[2] - LANDXZ[1]) * 0.012 + fr() * 0.35);
    // the flock they become: running low across the film, lifting, then banking across the dawn band in front of us
    const JC = side(H_LAND + 125, 58), g1 = ground(H_LAND + 125), fwd1 = [Math.sin(g1.th), -Math.cos(g1.th)], rt1 = [Math.cos(g1.th), Math.sin(g1.th)];
    const fl = (f, r, y) => [JC[0] + fwd1[0] * f + rt1[0] * r, y, JC[1] + fwd1[1] * f + rt1[1] * r];
    const liftRoute = [fl(-10, 0, 1.1), fl(25, 2, 1.4), fl(60, 0, 5), fl(110, -10, 15), fl(180, -35, 28), fl(270, -85, 42), fl(380, -170, 55), fl(520, -290, 66)];
    const lift = F.makeFlock({ rng: fr.fork('lift'), species: 'flamingos', count: 150, form: 'loose', spread: [40, 1.0, 34], size: 1.15, speed: 12, route: liftRoute, closed: false, start: 0, wander: [1.4, 0.5, 1.4, 0.6], light,
      body: '#e8889c', belly: '#f0a4b4', wingC: '#d8607c', head: '#eea0b0', neckC: '#eea0b0', legC: '#d86a84' });
    lift.object.visible = false; scene.add(lift.object);
    // the Andean flamingos (paler, larger): a pink band 350-600 m out beyond the sun, grounded
    const andPos = []; while (andPos.length < 340) { const along = fr.range(320, 600), off = (fr() < 0.5 ? -1 : 1) * fr.range(25, 280), [x, z] = side(hEnd + along - 270, off); andPos.push([x, 0, z]); }
    const andean = F.makeWaders({ rng: fr.fork('a'), species: 'flamingo', positions: andPos, count: andPos.length, size: 1.3 * 1.3, level: 0, facing: Math.PI * 0.4, scatterYaw: 1, peckRate: 0.4, active: 0.4, light, blobShadow: false,
      body: '#f0b4bc', belly: '#f6c8cc', wing: '#ec9caa', neckC: '#f2bcc4', cap: '#f2bcc4' });
    scene.add(andean.object); fauna.push(andean);
    // a far skein already in flight on the horizon in the opening seconds
    const sk0 = side(260, -260), sk1 = side(330, 320);
    const skein = F.makeFlock({ rng: fr.fork('s'), species: 'flamingos', count: 24, form: 'line', size: 1.8, speed: 13, route: [[sk0[0], 34, sk0[1]], [(sk0[0] + sk1[0]) / 2, 40, (sk0[1] + sk1[1]) / 2], [sk1[0], 44, sk1[1]]], closed: false, start: 0.12, light });
    scene.add(skein.object);
    await tick();

    // ---------- the skater ----------
    // model units, facing +z, 2.5 tall (x1.4 in the world: 3.5 m). One build for the skater, one with the mirror paint for its ghost.
    const SC = 1.4, flut = { value: new THREE.Vector4() };
    const CLOAK_T = D('#1d2543'), CLOAK_B = D('#2e3a6e'), OCHRE = D('#d4963f'), SLEEVE = D('#232c52');
    const lathe = (prof, N, col, flex, skip) => {
      const P = [], idx = [];
      for (let r = 0; r < prof.length; r++) for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, [rr, y] = prof[r], fold = 1 + 0.07 * Math.sin(6 * a + 0.8 + y) * ss(1.8, 0.95, y); P.push(Math.sin(a) * rr * fold, y, Math.cos(a) * rr * fold); }
      for (let r = 1; r < prof.length; r++) for (let i = 1; i <= N; i++) { const a = ((i - 0.5) / N) * Math.PI * 2, y = (prof[r][1] + prof[r - 1][1]) / 2; if (skip && skip(a, y)) continue; const q = (r - 1) * (N + 1) + i - 1, q2 = q + N + 1; idx.push(q, q2, q + 1, q + 1, q2, q2 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals(); return prep(g, col, flex);
    };
    const cloakGeo = lathe([[0.1, 2.02], [0.2, 1.97], [0.29, 1.86], [0.31, 1.66], [0.32, 1.42], [0.36, 1.2], [0.42, 1.0], [0.48, 0.86], [0.53, 0.74]], 28,
      (x, y) => { const f = ss(1.9, 0.75, y); return [CLOAK_T[0] + (CLOAK_B[0] - CLOAK_T[0]) * f, CLOAK_T[1] + (CLOAK_B[1] - CLOAK_T[1]) * f, CLOAK_T[2] + (CLOAK_B[2] - CLOAK_T[2]) * f]; },
      (x, y) => ss(1.35, 0.74, y), (a, y) => y < 1.12 && Math.abs(a - Math.PI) < 0.13);   // the slit at the back
    const hoodGeo = (() => { const g = new THREE.SphereGeometry(0.24, 16, 12), P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i), z = P.getZ(i); if (y > 0.08) { const k = y - 0.08; z -= k * 0.9; y += k * 0.7; x *= 1 - k * 1.2; } if (z > 0.1 && Math.abs(y) < 0.16) z = 0.1 + (z - 0.1) * 0.3; P.setXYZ(i, x, y, z); }
      g.computeVertexNormals(); return prep(g.translate(0, 2.18, -0.02), CLOAK_T); })();
    const faceGeo = prep(new THREE.SphereGeometry(0.15, 12, 8).scale(1, 1.15, 0.4).translate(0, 2.15, 0.11), D('#07080f'));
    const bandGeo = prep(new THREE.TorusGeometry(0.215, 0.026, 6, 22).rotateX(Math.PI / 2).translate(0, 2.29, -0.05), OCHRE);
    const collarGeo = prep(new THREE.TorusGeometry(0.15, 0.055, 6, 18).rotateX(Math.PI / 2).translate(0, 1.98, 0), OCHRE);
    const thighGeo = prep(new THREE.CylinderGeometry(0.085, 0.075, 0.46, 8).translate(0, -0.23, 0), CLOAK_T);
    const shinGeo = merge([prep(new THREE.CylinderGeometry(0.07, 0.058, 0.44, 8).translate(0, -0.22, 0), D('#181d36')),
      prep(new THREE.SphereGeometry(0.08, 10, 6).scale(0.95, 0.8, 1.9).translate(0, -0.47, 0.04), D('#11152a')),
      prep(new THREE.BoxGeometry(0.014, 0.05, 0.46).translate(0, -0.55, 0.04), D('#c8d0e2')), prep(new THREE.BoxGeometry(0.03, 0.04, 0.3).translate(0, -0.52, 0.04), D('#4a5068'))]);
    const upperGeo = prep(new THREE.CylinderGeometry(0.066, 0.058, 0.42, 8).translate(0, -0.21, 0), SLEEVE);
    const foreGeo = merge([prep(new THREE.CylinderGeometry(0.056, 0.048, 0.4, 8).translate(0, -0.2, 0), SLEEVE), prep(new THREE.SphereGeometry(0.068, 10, 8).scale(0.9, 1.15, 1).translate(0, -0.44, 0.01), D('#7a3e36'))]);
    // the scarf: two tapered tails of 16 segments and a fringe of tassels, rebuilt each frame in model space (shared by skater and ghost)
    const SEG = 16, scarfPos = new Float32Array((2 * (SEG + 1) * 2 + 6 * 4) * 3), scarfIdx = [];
    for (let t2 = 0; t2 < 2; t2++) for (let j = 0; j < SEG; j++) { const a = t2 * (SEG + 1) * 2 + j * 2; scarfIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const FR0 = 2 * (SEG + 1) * 2; for (let q = 0; q < 6; q++) { const a = FR0 + q * 4; scarfIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const scarfGeo = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(scarfPos, 3)); const n = scarfPos.length / 3, N = new Float32Array(n * 3); for (let i = 0; i < n; i++) N[i * 3 + 1] = 1; g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setIndex(scarfIdx); return prep(g, (x, y, z) => OCHRE); })();
    const makeSkater = (mirror) => {
      const mat = paint({ lit: 1, rim: mirror ? 0.4 : 0.75, flut, mirror });
      const mesh = (g, parent) => { const m = new THREE.Mesh(g, mat); m.frustumCulled = false; if (mirror) m.renderOrder = 2; parent.add(m); return m; };
      const g = new THREE.Group(), lean = new THREE.Group(); g.add(lean);
      const cloak = mesh(cloakGeo, lean); mesh(hoodGeo, lean); mesh(faceGeo, lean); mesh(bandGeo, lean); mesh(collarGeo, lean);
      const scarf = mesh(scarfGeo, lean);
      const limb = (x, y, a, b) => { const p = new THREE.Group(); p.position.set(x, y, 0); lean.add(p); mesh(a, p); const j = new THREE.Group(); j.position.y = -0.42 - (a === thighGeo ? 0.04 : 0); p.add(j); mesh(b, j); return [p, j]; };
      const [hipL, kneeL] = limb(0.13, 0.98, thighGeo, shinGeo), [hipR, kneeR] = limb(-0.13, 0.98, thighGeo, shinGeo);
      const [shL, elL] = limb(0.27, 1.86, upperGeo, foreGeo), [shR, elR] = limb(-0.27, 1.86, upperGeo, foreGeo);
      return { g, lean, cloak, scarf, hipL, kneeL, hipR, kneeR, shL, elL, shR, elR };
    };
    const skater = makeSkater(false), ghost = makeSkater(true);
    scene.add(skater.g); mirrorGroup.add(ghost.g);
    // the pose: alternating push strokes (0.75 s each), the weight over the gliding leg, the pushing leg out to the side and back,
    // arms counter-swinging; crouch for the jump and the stop; the cloak's hem a beat late; the scarf streaming
    const pose = (S, P) => {
      S.lean.rotation.set(P.pitch, 0, P.roll); S.lean.position.set(P.shift, -P.crouch * 0.28, 0);
      S.hipL.rotation.set(P.hxL, 0, P.hzL); S.kneeL.rotation.x = P.kL; S.hipR.rotation.set(P.hxR, 0, P.hzR); S.kneeR.rotation.x = P.kR;
      S.shL.rotation.set(P.axL, 0, 0.32 + P.armOut); S.elL.rotation.x = -0.35 - P.armBend; S.shR.rotation.set(P.axR, 0, -0.32 - P.armOut); S.elR.rotation.x = -0.35 - P.armBend;
      S.cloak.scale.set(P.flare, 1, P.flare);
    };
    const scarfAt = (T, t, air, whip, turn) => {
      for (let t2 = 0; t2 < 2; t2++) {
        const sx = t2 ? 0.07 : -0.07, len = t2 ? 0.86 : 0.74, ph = t2 * 1.7;
        for (let j = 0; j <= SEG; j++) {
          const k = j / SEG, w = (0.16 - 0.1 * k) / 2, flap = Math.sin(t * 7.5 - j * 0.62 + ph) * 0.07 * k + Math.sin(t * 13 - j * 1.1 + ph) * 0.025 * k;
          const x = sx + Math.sin(t * 4.1 - j * 0.45 + ph) * 0.09 * k + whip * 0.7 * k * k + turn * 0.45 * k * k + (t2 ? 1 : -1) * air * 0.22 * k;
          const y = 1.95 - 0.1 * k - 0.4 * k * k * (1 - air) + flap + air * 0.45 * k, z = -0.2 - len * k * (0.78 + 0.08 * Math.cos(t * 3 + j)) * (1 - 0.25 * (1 - air));
          const tw = Math.sin(t * 5 - j * 0.5 + ph) * 0.9 * k, cx = Math.cos(tw) * w, cy = Math.sin(tw) * w, o = (t2 * (SEG + 1) * 2 + j * 2) * 3;
          scarfPos[o] = x - cx; scarfPos[o + 1] = y - cy; scarfPos[o + 2] = z; scarfPos[o + 3] = x + cx; scarfPos[o + 4] = y + cy; scarfPos[o + 5] = z;
          if (j === SEG) for (let q = 0; q < 3; q++) { // the fringe: three tassels on each end
            const f = (q - 1) * 0.6, bx = x + cx * f, by = y + cy * f, o2 = (FR0 + (t2 * 3 + q) * 4) * 3, sw = Math.sin(t * 11 + q * 2 + ph) * 0.03;
            scarfPos.set([bx - 0.008, by, z, bx + 0.008, by, z, bx - 0.006 + sw, by - 0.02, z - 0.09, bx + 0.006 + sw, by - 0.02, z - 0.09], o2);
          }
        }
      }
      scarfGeo.attributes.position.needsUpdate = true;
    };

    // ---------- particles: spray, breath, splashes, ridge glints ----------
    const uPx = { value: 960 };
    const makePts = (N, additive, order = 4) => {
      const pos = new Float32Array(N * 3), size = new Float32Array(N), col = new Float32Array(N * 4), g = own(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 4));
      const m = own(new THREE.ShaderMaterial({ uniforms: { uPx }, vertexShader: PTS_V, fragmentShader: PTS_F, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
      const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = order; scene.add(p);
      return { N, pos, size, col, vel: new Float32Array(N * 3), age: new Float32Array(N).fill(99), life: new Float32Array(N).fill(1), next: 0,
        flush() { g.attributes.position.needsUpdate = true; g.attributes.aSize.needsUpdate = true; g.attributes.aCol.needsUpdate = true; } };
    };
    const spray = makePts(260, true), breath = makePts(10, false, 5), splash = makePts(420, true);
    const emit = (S, x, y, z, vx, vy, vz, life, sz) => { const i = S.next; S.next = (S.next + 1) % S.N; S.pos.set([x, y, z], i * 3); S.vel.set([vx, vy, vz], i * 3); S.age[i] = 0; S.life[i] = life; S.size[i] = sz; };
    const stepPts = (S, dt, g, drag, rgb, amax, grow = 0) => {
      for (let i = 0; i < S.N; i++) {
        S.age[i] += dt; const a = S.age[i] / S.life[i];
        if (a >= 1) { S.col[i * 4 + 3] = 0; continue; }
        S.vel[i * 3 + 1] -= g * dt; for (let k = 0; k < 3; k++) { S.vel[i * 3 + k] *= 1 - drag * dt; S.pos[i * 3 + k] += S.vel[i * 3 + k] * dt; }
        if (S.pos[i * 3 + 1] < 0.02) { S.pos[i * 3 + 1] = 0.02; S.vel[i * 3 + 1] *= -0.2; }
        S.size[i] += grow * dt;
        S.col.set([rgb[0], rgb[1], rgb[2], amax * (1 - a) * Math.min(1, a * 8)], i * 4);
      }
      S.flush();
    };
    // glints on the near ridges (2-25 m): one to each metre tile of a 28 m window ahead of us, set on the shader's own edge
    const GW = 28, glint = makePts(GW * GW, true, 3), gTile = new Int32Array(GW * GW * 2).fill(-99999), gPh = new Float32Array(GW * GW);
    const edgePoint = (wx, wz) => {   // the nearest point of the 2.2 m network's edge to (wx, wz), as the shader draws it
      const S = 2.2; let px = wx / S, pz = wz / S; const qx = px, qz = pz; px += 0.08 * Math.sin(qz * 4.3); pz += 0.08 * Math.sin(qx * 3.7);
      const nx = Math.floor(px), nz = Math.floor(pz), fx = px - nx, fz = pz - nz; let md = 8, mrx = 0, mrz = 0, mgx = 0, mgz = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const o = h2js(nx + i, nz + j), rx = i + 0.5 + (o[0] - 0.5) * 0.85 - fx, rz = j + 0.5 + (o[1] - 0.5) * 0.85 - fz, d = rx * rx + rz * rz; if (d < md) { md = d; mrx = rx; mrz = rz; mgx = i; mgz = j; } }
      md = 8; let ex = 1, ez = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const gx2 = mgx + i, gz2 = mgz + j, o = h2js(nx + gx2, nz + gz2), rx = gx2 + 0.5 + (o[0] - 0.5) * 0.85 - fx, rz = gz2 + 0.5 + (o[1] - 0.5) * 0.85 - fz, dx = rx - mrx, dz = rz - mrz, l = Math.hypot(dx, dz); if (l < 1e-4) continue; const e = (0.5 * (mrx + rx) * dx + 0.5 * (mrz + rz) * dz) / l; if (e < md) { md = e; ex = dx / l; ez = dz / l; } }
      return [(px + ex * md - 0.08 * Math.sin(qz * 4.3)) * S, (pz + ez * md - 0.08 * Math.sin(qx * 3.7)) * S];
    };

    // ---------- the trail: two blade grooves 0.18 m apart, dark with a pale lip, fading over 80 m ----------
    const TN = 150, trailPts = [], tPos = new Float32Array(TN * 2 * 2 * 3), tAttr = new Float32Array(TN * 2 * 2 * 3), tIdx = [];
    for (let gq = 0; gq < 2; gq++) for (let i = 0; i < TN - 1; i++) { const a = (gq * TN + i) * 2; tIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const tg = own(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tg.setAttribute('aT', new THREE.BufferAttribute(tAttr, 3)); tg.setIndex(tIdx);
    const trail = new THREE.Mesh(tg, own(new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 aT; varying vec3 vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `varying vec3 vT; void main(){ float u = abs(vT.x), a = (1. - smoothstep(10., 80., vT.y)) * vT.z; vec3 c = mix(vec3(.16, .2, .3), vec3(.62, .66, .76), smoothstep(.35, .8, u)); a *= (1. - smoothstep(.8, 1., u)) * mix(.5, .28, smoothstep(.35, .8, u)); gl_FragColor = vec4(pow(c, vec3(2.2)), a); }`,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide,
    })));
    trail.frustumCulled = false; trail.renderOrder = 1; scene.add(trail);
    await tick();

    // ---------- state ----------
    const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _v2 = new THREE.Vector2(), gS = { x: 0, z: 0, th: 0 };
    let smh = null, prevHead = 0, turnS = 0, lastStroke = -1, lastBreath = 0.4, landed = false, stopped = false, prevT = 0, skX = 0, skZ = 0, skY = 0, skVis = true;
    const P = { pitch: 0.18, roll: 0, shift: 0, crouch: 0, hxL: 0, hzL: 0, kL: 0, hxR: 0, hzR: 0, kR: 0, axL: 0, axR: 0, armOut: 0, armBend: 0, flare: 1 };
    const skaterAt = (T) => {   // where the skater stands (on the ground), its heading, and its height above it
      const h = hSkOf(T), g = ground(h, gS), latK = 1 - ss(14.5, 16.8, T), lat = 2.6 * Math.sin(T * 0.9) * latK;
      const x = g.x + Math.cos(g.th) * lat, z = g.z + Math.sin(g.th) * lat;
      return { h, x, z, head: Math.PI - g.th + 0.22 * Math.cos(T * 0.9) * latK };
    };
    const camAt = (u, out) => path.posAtDist(Math.min(1, Math.max(0, u)) * path.length, out);

    return {
      scene, path, duration: DUR, title: 'The Salt Hexagons', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 62, near: 0.3, nearThrough: 0.4, far: 70000, lookAhead: 14, sway: 0.25, bank: 0.05 },
      pois: [
        { at: [ISL.x, 25, ISL.z], from: 0.14, to: 0.31, fade: 0.35, weight: 0.3 },                                        // Incahuasi, right
        { at: (time, u) => { const a = side(hcOf(u * DUR) + 55, -48); return [a[0], 3, a[1]]; }, from: 0.37, to: 0.51, fade: 0.35, weight: 0.35 },   // mounds, vicunas, Tunupa, left
        { at: (time, u) => lift.positionAt(Math.max(0, u * DUR - 11.95), undefined, _q), from: 0.585, to: 0.67, fade: 0.3, weight: 0.45 },        // the flock, up and right
        // the skater, held in the middle of the frame while we skate (its sway still swings it across), and followed up in its leap
        { at: (time, u) => { const s = skaterAt(u * DUR); return [s.x, 1.5 + skY * 0.8, s.z]; }, from: 0.0, to: 0.66, fade: 0.08, weight: 0.4 },
        // the rise: the gaze is held down onto the flat ahead (the skater in the lower frame, the horizon glow across the top), never up
        { at: (time, u) => {
          const T = u * DUR, c = camAt(u, _p), s = skaterAt(T), dx = s.x - c.x, dz = s.z - c.z, gap = Math.max(4, Math.hypot(dx, dz)), y = c.y;
          const pd = Math.max(0.03, Math.min(0.45, 0.62 * Math.atan2(y, gap))), fx2 = dx / gap, fz2 = dz / gap;
          return [c.x + fx2 * 100 * Math.cos(pd), c.y - 100 * Math.sin(pd), c.z + fz2 * 100 * Math.cos(pd)];
        }, from: 0.65, to: 1.0, fade: 0.12, weight: 0.92 },
      ],
      // the first sun of the day, half-risen out of the salar; the water gives it its lower half
      portal: { shape: 'circle', style: 'ring', radius: 9, color: '#f0b090', veil: '#f0b090', glow: 0.75, halo: true, revealDistance: 700 },
      post: { exposure: 1.0, bloom: { strength: 0.3, radius: 0.5, threshold: 0.95 }, grade: { saturation: 1.08, contrast: 1.04, tint: '#f4f1ff', shadowTint: '#0a1030', vignette: 0.18, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = Math.max(0, (u || 0) * DUR), dT = Math.max(0, Math.min(0.1, T - prevT)); prevT = T;
        const cp = camera.position, dawnK = ss(0, 18, T);
        sky.update(dt, t, camera);
        if (sky.uniforms && sky.uniforms.uMilky) sky.uniforms.uMilky.value = 0.25 * (1 - ss(4, 10, T));
        U.uTime.value = t; groundMat.uniforms.uDawn.value = dawnK; dawnMat.uniforms.uDawn.value = dawnK;
        groundMesh.position.set(cp.x, 0, cp.z); dawn.position.copy(cp);
        farGroup.position.set(cp.x, 0, cp.z); farMirror.position.set(cp.x, 0, cp.z);
        haze.update(dt, t);
        if (ctx.renderer) { const H = ctx.renderer.getDrawingBufferSize ? ctx.renderer.getDrawingBufferSize(_v2).y : 1920; uPx.value = camera.projectionMatrix.elements[5] * H * 0.5; }
        for (const f of fauna) f.update(dt, t, camera, u);
        skein.update(dt, t); skein.object.visible = T < 8.5;
        // the lagoon empties, nearest the landing first, and the flock runs and lifts
        if (jAttr) { let ch = false; for (let i = 0; i < jamesPos.length; i++) { const g = T > jWhen[i] ? 1 : 0; if (g !== jGone[i]) { jGone[i] = g; jAttr.array[i * 4 + 1] = g ? -50 : 0; ch = true; } } if (ch) jAttr.needsUpdate = true; }
        else james.object.visible = T < 11.95;
        const tl = Math.max(0, T - 11.95); lift.object.visible = T > 11.95; lift.update(dt, tl, camera);
        if (T > 11.95 && T < 13.4) for (let k = 0; k < 6; k++) {   // the patter of feet on the film as they run
          const s = Math.min(48, tl * 12) - Math.random() * 20, q = lift.route.pointAt(Math.max(0, s), _q);
          const x = q.x + (Math.random() - 0.5) * 36, z = q.z + (Math.random() - 0.5) * 36;
          emit(splash, x, 0.05, z, (Math.random() - 0.5) * 0.6, 1 + Math.random() * 1.6, (Math.random() - 0.5) * 0.6, 0.45 + Math.random() * 0.3, 0.22 + Math.random() * 0.15);
        }

        // ---- the skater ----
        const s = skaterAt(T);
        let yy = 0, spin = 0, crouch = 0.08, flare = 1, air = 0, stopTurn = 0;
        { const a = (T - 11.0) / 0.9; if (T > 10.6 && T < 11.0) crouch = 0.08 + 0.55 * ss(10.6, 11.0, T); if (a > 0 && a < 1) { yy = 4 * a * (1 - a) * 1.6 * SC; spin = sm(a) * Math.PI * 2; flare = 1 + 0.55 * Math.sin(a * Math.PI); air = Math.sin(a * Math.PI); crouch = 0.3 * Math.sin(a * Math.PI); } if (a >= 1 && a < 1.5) crouch = 0.5 * (1 - (a - 1) / 0.5); }
        { const a = (T - 16.85) / 0.75; if (a > 0 && a < 1.25) { stopTurn = Math.sin(Math.min(1, a) * Math.PI * 0.5) * 1.35 * (1 - ss(0.9, 1.25, a)); crouch = Math.max(crouch, 0.42 * Math.sin(Math.min(1, a) * Math.PI)); } }   // the hockey stop
        { const a = (T - T_TAKE) / 0.85; if (T > T_TAKE - 0.35 && a < 0) crouch = Math.max(crouch, 0.55 * ss(T_TAKE - 0.35, T_TAKE, T)); if (a > 0) { yy = 4 * a * (1 - a) * 3.4 * SC; flare = 1 + 0.4 * Math.sin(Math.min(1, a) * Math.PI); air = Math.min(1, Math.sin(Math.min(1, a) * Math.PI) * 1.5); crouch = 0.15; } }
        skVis = s.h < hEnd - 0.4;
        // eased heading, and how hard it is turning (for the lean and the crossover)
        const headT = s.head + stopTurn;
        if (smh === null) { smh = headT; prevHead = headT; }
        { const k = 1 - Math.exp(-dt * 12); let dh = headT - smh; dh = ((dh + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; smh += dh * k; }
        const hr = dT > 1e-4 ? (smh - prevHead) / dT : 0; prevHead = smh; turnS += (hr - turnS) * Math.min(1, dt * 4);
        const turnK = T < 1.25 ? 0.9 * (1 - ss(0.9, 1.25, T)) + 0.4 * Math.min(1, Math.max(-1, turnS * 2.2)) : Math.min(1, Math.max(-1, turnS * 2.2));   // the hook: already hard in a left carve
        skX = s.x; skZ = s.z; skY = yy;
        skater.g.position.set(s.x, yy, s.z); skater.g.rotation.y = smh + spin; skater.g.scale.setScalar(SC);
        ghost.g.position.set(s.x, yy, s.z); ghost.g.rotation.y = smh + spin; ghost.g.scale.setScalar(SC);
        skater.g.visible = ghost.g.visible = skVis;
        // strokes: off in the air, in the stop and while crouching to leap; quicker and harder at the end
        const stroking = air < 0.05 && !(T > 16.85 && T < 17.7) && !(T > 10.6 && T < 12.2) && !(T > T_TAKE - 0.35);
        const cyc = ((T + 0.2) % 1.5) / 1.5, sw = Math.sin(cyc * Math.PI * 2), pL = stroking ? Math.max(0, sw) : 0, pR = stroking ? Math.max(0, -sw) : 0, cross = Math.min(1, Math.abs(turnK) * 1.4);
        P.roll = -0.36 * turnK + (stroking ? 0.07 * sw : 0) - 0.5 * Math.sin(stopTurn) * (T > 16.8 && T < 17.8 ? 1 : 0); P.shift = (stroking ? -0.1 * sw : 0); P.pitch = 0.2 + crouch * 0.5 + air * 0.1;
        P.crouch = crouch; P.flare = flare;
        P.hxL = 0.38 * pL - 0.22 * (1 - pL) - crouch * 0.6 - air * 0.4; P.hzL = (0.12 + 0.4 * pL) * (1 - cross * 0.9 * pL) - cross * 0.25 * pL; P.kL = 0.06 + 0.55 * (1 - pL) * 0.7 + crouch * 1.2 + air * 0.8;
        P.hxR = 0.38 * pR - 0.22 * (1 - pR) - crouch * 0.6 - air * 0.2; P.hzR = -(0.12 + 0.4 * pR) * (1 - cross * 0.9 * pR) + cross * 0.25 * pR; P.kR = 0.06 + 0.55 * (1 - pR) * 0.7 + crouch * 1.2 + air * 0.5;
        P.axL = -0.65 * pR + 0.4 * pL - air * 0.9; P.axR = -0.65 * pL + 0.4 * pR - air * 0.9; P.armOut = 0.25 * cross + air * 0.6 + crouch * 0.3; P.armBend = 0.25 * crouch + 0.2 * air;
        pose(skater, P); pose(ghost, P);
        flut.value.set(t * 9.4 - 1.2 + cyc * 6.28, 0.035 + 0.05 * Math.abs(turnK) + 0.08 * air, 0.07 * Math.sin(cyc * 6.28 - 1.0) - 0.12 * turnK, -0.05 - 0.06 * air);
        const whip = T > 0.85 && T < 1.75 ? Math.sin(((T - 0.85) / 0.9) * Math.PI) : 0;
        scarfAt(T, t, air, whip, -turnK * 0.6);
        // the wake: two rings from each push, and a ring of three at the landing
        const fwx = Math.sin(smh), fwz = Math.cos(smh), rtx = Math.cos(smh), rtz = -Math.sin(smh);
        const stroke = Math.floor((T + 0.2) / 0.75);
        if (stroking && stroke !== lastStroke && skVis) { lastStroke = stroke; const sd2 = stroke % 2 ? 1 : -1; addWake(s.x + rtx * 0.25 * sd2 - fwx * 0.6, s.z + rtz * 0.25 * sd2 - fwz * 0.6, 1); addWake(s.x - rtx * 0.25 * sd2 - fwx * 1.4, s.z - rtz * 0.25 * sd2 - fwz * 1.4, 0.6); }
        if (!landed && T > 11.9 && T < 12.4) { landed = true; for (let k = 0; k < 3; k++) addWake(s.x + (k - 1) * 0.8, s.z + (k - 1) * 0.5, 1.4);
          for (let k = 0; k < 120; k++) { const a = Math.random() * 6.28, v = 1.5 + Math.random() * 4.5; emit(spray, s.x + Math.cos(a) * 0.5, 0.1, s.z + Math.sin(a) * 0.5, Math.cos(a) * v, 1.5 + Math.random() * 3.5, Math.sin(a) * v, 0.8 + Math.random() * 0.6, 0.06 + Math.random() * 0.08); } }
        // spray: from the blades, a fan thrown outward in the carve, heavy in the stop
        if (skVis && yy < 0.05) {
          const stopK = T > 16.85 && T < 17.5 ? 1 : 0, n = Math.round((2 + 6 * Math.abs(turnK) + 4 * (pL + pR) + 26 * stopK) * Math.min(2, dt * 60));
          for (let k = 0; k < n; k++) {
            const out = stopK ? 1 : -Math.sign(turnK || 1), v = 0.6 + Math.random() * (1.6 + 3 * Math.abs(turnK) + 4 * stopK);
            const pfx = Math.sin(s.head), pfz = Math.cos(s.head), side2 = (0.4 + Math.abs(turnK)) * (1 - stopK);
            const vx = -fwx * (1.2 + Math.random()) * (1 - stopK) + rtx * out * v * side2 + pfx * v * stopK + (Math.random() - 0.5) * (0.6 + 3 * stopK);
            const vz = -fwz * (1.2 + Math.random()) * (1 - stopK) + rtz * out * v * side2 + pfz * v * stopK + (Math.random() - 0.5) * (0.6 + 3 * stopK);
            emit(spray, s.x + (Math.random() - 0.5) * 0.5, 0.08, s.z + (Math.random() - 0.5) * 0.5, vx, 0.6 + Math.random() * (1.4 + 2.5 * stopK), vz, 0.5 + Math.random() * 0.7, 0.03 + Math.random() * 0.05 + 0.05 * stopK);
          }
        }
        stepPts(spray, dt, 4.5, 1.2, [0.98, 0.78, 0.66], 0.55);
        stepPts(splash, dt, 5, 1.5, [0.95, 0.84, 0.86], 0.5);
        // breath: a puff every 1.5 s in front of the hood, left hanging in the cold air as the skater goes on
        if (skVis && t - lastBreath > 1.5) { lastBreath = t; const lx = 0, ly = 2.12 * SC + yy, lz = 0.36 * SC; emit(breath, s.x + fwx * lz + rtx * lx, ly, s.z + fwz * lz, fwx * 1.2, 0.15, fwz * 1.2, 1.6, 0.18); }
        stepPts(breath, dt, -0.05, 2.2, [0.86, 0.9, 1.0], 0.24, 0.5);
        // the grooves: a point every 0.6 m while on the ice, a break while airborne
        { const lp = trailPts[trailPts.length - 1], onIce = yy < 0.03 && skVis;
          if (!lp || Math.hypot(lp[0] - s.x, lp[1] - s.z) > 0.6) { trailPts.push([s.x, s.z, onIce ? 1 : 0]); if (trailPts.length > TN) trailPts.shift(); }
          let acc = 0; const n = trailPts.length;
          for (let i = 0; i < TN; i++) {
            const ii = Math.max(0, n - 1 - i), a = trailPts[ii] || [s.x, s.z, 0], b = trailPts[Math.max(0, ii - 1)] || a; if (i && trailPts[ii + 1]) acc += Math.hypot(trailPts[ii + 1][0] - a[0], trailPts[ii + 1][1] - a[1]);
            let dx = a[0] - b[0], dz = a[1] - b[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
            for (let gq = 0; gq < 2; gq++) { const off = (gq ? 0.09 : -0.09), cx = a[0] - dz * off, cz = a[1] + dx * off, o = ((gq * TN + i) * 2) * 3;
              tPos.set([cx - dz * 0.045, 0.012, cz + dx * 0.045, cx + dz * 0.045, 0.012, cz - dx * 0.045], o); tAttr.set([-1, acc, a[2] && ii < n - 1 ? a[2] : 0, 1, acc, a[2] && ii < n - 1 ? a[2] : 0], o); }
          }
          tg.attributes.position.needsUpdate = true; tg.attributes.aT.needsUpdate = true; }
        // the ridge glints: refill the tiles of the window that moved under us
        { const fdx = cp.x - skX, fdz = cp.z - skZ, l = Math.hypot(fdx, fdz) || 1, cx0 = Math.floor(cp.x - (fdx / l) * 13 - GW / 2), cz0 = Math.floor(cp.z - (fdz / l) * 13 - GW / 2), lowK = 1 - ss(3, 9, cp.y);
          for (let i = 0; i < GW * GW; i++) {
            const ix = i % GW, iz = (i / GW) | 0, X = cx0 + ((((ix - cx0) % GW) + GW) % GW), Z = cz0 + ((((iz - cz0) % GW) + GW) % GW);
            if (gTile[i * 2] !== X || gTile[i * 2 + 1] !== Z) {
              gTile[i * 2] = X; gTile[i * 2 + 1] = Z; const hh = h2js(X * 1.37 + 0.5, Z * 1.91 + 0.5), e = edgePoint(X + hh[0], Z + hh[1]);
              glint.pos.set([e[0], 0.035, e[1]], i * 3); glint.size[i] = 0.015 + 0.015 * hh[1]; gPh[i] = hh[0] * 40;
            }
            const d = Math.hypot(glint.pos[i * 3] - cp.x, glint.pos[i * 3 + 2] - cp.z), tw = 0.5 + 0.5 * Math.sin(t * (2.2 + (gPh[i] % 5)) + gPh[i]);
            glint.col.set([1, 0.92, 0.9, tw * tw * 0.85 * ss(1.5, 3, d) * (1 - ss(18, 25, d)) * lowK], i * 4);
          }
          glint.flush(); }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
