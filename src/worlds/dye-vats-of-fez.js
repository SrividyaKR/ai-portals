// THE DYE VATS OF FEZ: late afternoon over the Chouara tannery in Fez el-Bali. We drop from the lip of a viewing terrace into the
// honeycomb of round stone vats and ride the narrow wet ridges between them, while barn swallows skim the dye and drink on the wing.
// Each swallow takes the EXACT colour of the last vat it touched (indigo, saffron, poppy, mint, rose, henna), so the flock becomes a
// moving palette of the tannery. The camera winds left and right over the coloured vats, lifts over the pale lime vats where a
// henna bloom bleeds through a broken partition, then all eight swallows dip in a ripple into the great indigo vat and come up blue;
// we follow the last one down through the surface into marbled curtains of pigment, to the portal lying on the vat floor.
// Real 3D, lit from behind and to the left. Plaster, stone, stains and dye are drawn here. Nothing is loaded. 9:16 is the target.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePath, lerp, smoothstep, clamp } from '../kit/core.js';
import { makeSky } from '../kit/sky.js';
import * as F from '../kit/fauna.js';
import * as fx from '../kit/fx.js';

const DUR = 19;
const sm = (s) => s * s * (3 - 2 * s);
// the great indigo vat: the camera plunges through its surface at about 16.8 s and the portal lies on its floor
const HV = { x: 0, z: -33, r: 12, surf: -0.3, bottom: -10.0 };
// the flight, ~92 m at a constant ~4.9 m/s: the terrace lip, down to a 2 m eye by 2.4 s, an S over the ridges (left, then right),
// a lift to 3.5 m over the lime vats, a descent toward the great vat's rim and the plunge, then level onto the portal
const KEYS = [
  [0, 8.0, 52], [0.2, 6.0, 47.5], [0.0, 2.9, 42], [-2.6, 2.0, 37], [-6.0, 2.1, 31], [-4.6, 2.3, 25], [1.0, 2.9, 19.5], [5.2, 4.0, 13.5],
  [6.0, 5.0, 7], [3.2, 5.1, 0.5], [-0.8, 5.0, -5.5], [-1.0, 4.8, -11.5], [0, 3.6, -17], [0, 2.9, -21], [0, 1.3, -24.4], [0, -1.4, -27.6], [0, -4.2, -31.5], [0, -6.6, -36], [0, -7.9, -40], [0, -8.4, -43],
];
// one palette shared by vats, splashes and birds
const DYE = { indigo: '#2f5fd0', saffron: '#f0b030', poppy: '#d4552f', mint: '#3fbf8a', rose: '#e0709a', henna: '#c0602a', lime: '#e8e4d8', tannin: '#8a6a3a' };
const COLOURED = ['indigo', 'saffron', 'poppy', 'mint', 'rose', 'henna'];
const DYES = COLOURED.map((k) => DYE[k]);
// the dips: [T, bird, dye, side (+1 right of the line), metres ahead of the camera at T]. The hook is a dip every half second.
const TIMES = [1.0, 1.5, 2.0, 2.5, 3.0];
const DIPS = [
  [TIMES[0], 0, 'indigo', 1, 6.5], [TIMES[1], 1, 'saffron', -1, 6.5], [TIMES[2], 2, 'poppy', 1, 7], [TIMES[3], 3, 'mint', -1, 7], [TIMES[4], 4, 'rose', 1, 7.5],
  [3.9, 5, 'henna', -1, 10], [4.8, 0, 'saffron', 1, 10], [5.7, 6, 'mint', -1, 9.5], [6.6, 1, 'rose', 1, 10], [7.5, 7, 'poppy', -1, 10],
  [8.5, 2, 'mint', 1, 10], [9.5, 3, 'indigo', -1, 10], [10.4, 4, 'saffron', 1, 10], [11.5, 5, 'henna', -0.5, 7, true],
];
// the last pass: all eight dip in the great indigo vat in a ripple, one every 0.34 s; bird 5 is the last, the one we follow down
const HV_ORDER = [3, 4, 6, 7, 0, 1, 2, 5];
const SUN_DIR = new THREE.Vector3(-0.47, 0.342, 0.814).normalize();   // behind the camera and to its left, 20 degrees up

export default {
  id: 'dye-vats-of-fez',
  name: 'The Dye Vats of Fez',
  category: 'wilderness',
  weirdness: 0.5,
  media: ['air', 'open'],
  async build(ctx) {
    const R = ctx.rng, scene = new THREE.Scene();
    const tick = async () => { if (ctx.yield) await ctx.yield(); };
    const trash = [];
    const own = (o) => { trash.push(o); return o; };

    // ---------- the flight ----------
    const path = makePath(KEYS);
    const PL = path.length;
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _tg = new THREE.Vector3();
    // the line in plan, for keeping things off it: samples every metre while the camera is above the ground
    const line = [];
    for (let d = 0; d <= PL; d += 1) { path.posAtDist(d, _a); if (_a.y > HV.surf) line.push([_a.x, _a.z]); }
    const lineDist = (x, z) => { let b = Infinity; for (const p of line) { const dx = p[0] - x, dz = p[1] - z, q = dx * dx + dz * dz; if (q < b) b = q; } return Math.sqrt(b); };
    const frameAt = (T, ahead, side, out) => {   // a point ahead of the camera at time T, side metres to its right
      const d = clamp(T / DUR, 0, 1) * PL + ahead; path.posAtDist(d, out); path.tangentAtDist(d, _tg); _tg.y = 0; _tg.normalize();
      out.x += -_tg.z * side; out.z += _tg.x * side; return out;
    };
    await tick();

    // ---------- sky and light: late afternoon, the sun behind and to the left, no disc in the picture ----------
    const sky = makeSky({
      rng: R.fork('sky'), preset: 'day', quality: 0.8, bake: !!ctx.renderer, renderer: ctx.renderer,
      zenith: '#3f76c2', mid: '#8eb2da', horizon: '#f1dcbc', ground: '#e0c49c', horizonPow: 2.6,
      scatter: 0.08, sunIntensity: 0, sunGlow: 0, sunElevation: 20, sunAzimuth: 150, bodies: [],
      stars: 0, milkyWay: 0, clouds: { coverage: 0.16, lit: '#fff1dc', shade: '#a8b8cf', silver: 0.3 }, clouds2: false,
    });
    scene.add(sky.object);
    const AIR = { fog: new THREE.Color('#e4cfae'), dens: 0.0042, bg: new THREE.Color('#9dbbd8') };
    const WATER = { fog: new THREE.Color('#4a7ad8'), dens: 0.016, bg: new THREE.Color('#4a7ad8') };
    scene.fog = new THREE.FogExp2(AIR.fog.clone(), AIR.dens);
    scene.background = AIR.bg.clone();
    if (ctx.renderer && sky.prewarm) { try { await sky.prewarm(ctx.renderer, null, scene); } catch (e) { /* headless */ } }
    const sun = new THREE.DirectionalLight('#ffd6a4', 2.1); sun.position.copy(SUN_DIR).multiplyScalar(120); scene.add(sun);
    scene.add(new THREE.HemisphereLight('#9db8d8', '#c9a070', 1.35));
    await tick();

    // ---------- textures drawn here ----------
    const mkCanvas = (W, H = W) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const wrapBlob = (g, S, x, y, r, style) => {
      g.fillStyle = style;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        if (x + ox < -r || x + ox > S + r || y + oy < -r || y + oy > S + r) continue;
        g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.2832); g.fill();
      }
    };
    const tex = (c, rx = 1, ry = 1) => { const t = own(new THREE.CanvasTexture(c)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const rgb = (h) => { const c = new THREE.Color(h); return `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`; };   // (sRGB numbers for the canvas)
    const plasterC = mkCanvas(256); {
      const g = plasterC.getContext('2d'), S = 256; g.fillStyle = '#e6dccb'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 220; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(6, 38), R() < 0.5 ? `rgba(120,100,76,${R.range(0.03, 0.09)})` : `rgba(255,250,238,${R.range(0.05, 0.14)})`);
      for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(90,72,54,${R.range(0.05, 0.18)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.4, 1.4); }
    }
    // the ridges: worn wet limestone, chipped, with old dye soaked into the joints
    const stoneC = mkCanvas(256); {
      const g = stoneC.getContext('2d'), S = 256; g.fillStyle = '#d4c6ac'; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 260; i++) wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(3, 16), R() < 0.55 ? `rgba(70,58,44,${R.range(0.02, 0.05)})` : `rgba(250,240,220,${R.range(0.03, 0.07)})`);
      for (let i = 0; i < 24; i++) { const c = rgb(DYES[R.int(0, DYES.length - 1)]); wrapBlob(g, S, R.range(0, S), R.range(0, S), R.range(1, 3), `rgba(${c},${R.range(0.05, 0.12)})`); }
      g.strokeStyle = 'rgba(50,40,30,0.16)'; g.lineWidth = 0.8;
      for (let i = 0; i < 14; i++) { let x = R.range(0, S), y = R.range(0, S); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += R.range(-14, 14); y += R.range(-14, 14); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 2400; i++) { g.fillStyle = `rgba(60,48,36,${R.range(0.05, 0.2)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.3, 1.3); }
    }
    const stoneT = tex(stoneC);
    // the vat walls: four tide-line variants. Top: rim stone and a lime-white crust; then bands of older dyes, drips running down,
    // a dark wet band at the liquid line and the soaked wall below it. Drawn pale, tinted per vat toward its own dye.
    const vatT = [0, 1, 2, 3].map((k) => {
      const c = mkCanvas(256), g = c.getContext('2d'), S = 256;
      const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#e2d6c0'); gr.addColorStop(0.2, '#ece4d6'); gr.addColorStop(0.5, '#cfc2ac'); gr.addColorStop(0.62, '#8a7c68'); gr.addColorStop(1, '#5a4e40');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) wrapBlob(g, S, R.range(0, S), R.range(0, 60), R.range(3, 12), `rgba(250,248,240,${R.range(0.2, 0.55)})`);   // lime crust
      for (let i = 0; i < 5; i++) {   // old tide lines in other dyes: wavy and broken, never a full band
        const c2 = rgb(i % 3 === 0 ? DYE.tannin : DYES[R.int(0, DYES.length - 1)]), y0 = R.range(60, 145), w = R.range(2, 6), a = R.range(0.1, 0.26), ph = R.range(0, 6.28), f = R.int(1, 3), ph2 = R.range(0, 6.28);
        g.strokeStyle = `rgba(${c2},${a})`; g.lineWidth = w;
        let on = false; for (let x = 0; x <= S; x += 6) { const y = y0 + 9 * Math.sin((x / S) * 6.283 * f + ph) + 4 * Math.sin(x * 0.11 + ph2), keep = Math.sin(x * 0.05 + ph2 * 3) > -0.2;
          if (keep && !on) { g.beginPath(); g.moveTo(x, y); on = true; } else if (keep) g.lineTo(x, y); else if (on) { g.stroke(); on = false; } } if (on) g.stroke();
      }
      for (let i = 0; i < 26; i++) {   // drips
        const c2 = rgb(R() < 0.4 ? '#5a4632' : DYES[R.int(0, DYES.length - 1)]), x = R.range(0, S), y0 = R.range(30, 90), len = R.range(30, 120), w = R.range(1.5, 5);
        const lg = g.createLinearGradient(0, y0, 0, y0 + len); lg.addColorStop(0, `rgba(${c2},0.4)`); lg.addColorStop(1, `rgba(${c2},0)`);
        g.fillStyle = lg; g.fillRect(x, y0, w, len); g.beginPath(); g.arc(x + w / 2, y0 + len * 0.7, w * 0.7, 0, 6.28); g.fill();
      }
      g.fillStyle = 'rgba(30,24,20,0.45)'; g.fillRect(0, 150 + k * 4, S, 10 + k * 2);   // the wet line
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(40,32,24,${R.range(0.05, 0.18)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.3, 1.3); }
      return tex(c, 1, 1);
    });
    // marble for the dye: soft swirls of light and dark around mid grey
    const marbleC = mkCanvas(256); {
      const g = marbleC.getContext('2d'), S = 256; g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
      const tmp = mkCanvas(S), t = tmp.getContext('2d'); t.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const v = R() < 0.5 ? 255 : 0, x0 = R.range(0, S), y0 = R.range(0, S), len = R.range(40, 160), ph = R.range(0, 6.28), amp = R.range(8, 30), a0 = R.range(0, 6.28);
        for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
          t.strokeStyle = `rgba(${v},${v},${v},${R.range(0.12, 0.3)})`; t.lineWidth = R.range(4, 16); t.beginPath();
          for (let k = 0; k <= 20; k++) { const f = k / 20, x = x0 + ox + Math.cos(a0) * f * len + Math.sin(f * 5 + ph) * amp, y = y0 + oy + Math.sin(a0) * f * len + Math.cos(f * 4 + ph) * amp; k ? t.lineTo(x, y) : t.moveTo(x, y); }
          t.stroke();
        }
      }
      g.filter = 'blur(3px)'; g.drawImage(tmp, 0, 0); g.filter = 'none';
    }
    const marbleT = own(new THREE.CanvasTexture(marbleC)); marbleT.wrapS = marbleT.wrapT = THREE.RepeatWrapping;
    // tannery facades: lime-washed plaster (pale, tinted per house) with small arched windows, iron grilles, shutters,
    // arched doors on the ground floor and a base stained by years of dye. One tile is 8 m wide and 12.4 m (four storeys) tall.
    const facC = mkCanvas(512, 1024); {
      const g = facC.getContext('2d'), W = 512, H = 1024; g.drawImage(plasterC, 0, 0, W, W); g.drawImage(plasterC, 0, W, W, W);
      const sy = H / 12.4, sx = W / 8;
      const win = (x, y, w, h, grille) => {
        g.fillStyle = 'rgba(46,34,28,0.92)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.5); g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill();
        g.strokeStyle = 'rgba(214,198,170,0.9)'; g.lineWidth = 3; g.stroke();
        if (grille) { g.strokeStyle = 'rgba(20,18,18,0.85)'; g.lineWidth = 1.5; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + (w * k) / 4, y + w * 0.2); g.lineTo(x + (w * k) / 4, y + h); g.stroke(); } g.beginPath(); g.moveTo(x, y + h * 0.6); g.lineTo(x + w, y + h * 0.6); g.stroke(); }
        if (R() < 0.4) { g.fillStyle = R() < 0.5 ? 'rgba(46,96,88,0.9)' : 'rgba(110,70,40,0.9)'; g.fillRect(x - w * 0.42, y + w * 0.3, w * 0.4, h - w * 0.3); }
      };
      for (let s = 1; s < 4; s++) for (let i = 0; i < 2; i++) if (R() < 0.85) { const w = R.range(0.6, 1.0) * sx, h = R.range(1.0, 1.5) * sy, x = (i * 4 + R.range(0.6, 2.6)) * sx, y = H - (s * 3.1 + R.range(0.8, 1.2)) * sy - h; win(x, y, w, h, R() < 0.6); }
      { const w = 1.5 * sx, h = 2.4 * sy, x = R.range(1, 4.5) * sx, y = H - h; g.fillStyle = 'rgba(70,44,26,0.95)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.5); g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill();
        g.strokeStyle = 'rgba(220,200,170,0.8)'; g.lineWidth = 6; g.stroke(); g.strokeStyle = 'rgba(40,26,16,0.6)'; g.lineWidth = 2; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x + (w * k) / 5, y + w * 0.3); g.lineTo(x + (w * k) / 5, y + h); g.stroke(); } }
      const base = g.createLinearGradient(0, H - 1.6 * sy, 0, H); base.addColorStop(0, 'rgba(70,50,36,0)'); base.addColorStop(1, 'rgba(70,50,36,0.55)'); g.fillStyle = base; g.fillRect(0, H - 1.6 * sy, W, 1.6 * sy);
      for (let i = 0; i < 40; i++) { const c = rgb(DYES[R.int(0, DYES.length - 1)]), x = R.range(0, W), len = R.range(0.3, 1.4) * sy; g.fillStyle = `rgba(${c},${R.range(0.15, 0.4)})`; g.fillRect(x, H - len, R.range(3, 10), len); }
      for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(80,60,44,${R.range(0.05, 0.14)})`; g.fillRect(R.range(0, W), R.range(0, H * 0.7), R.range(3, 8), R.range(60, 300)); }   // rain streaks
    }
    const facT = tex(facC);
    // medina houses far off: small dark windows scattered on plaster, one tile 7 m square
    const medC = mkCanvas(256); {
      const g = medC.getContext('2d'), S = 256; g.drawImage(plasterC, 0, 0);
      for (let i = 0; i < 7; i++) { const x = R.range(10, 230), y = R.range(14, 220), w = R.range(9, 18), h = R.range(14, 26); g.fillStyle = 'rgba(40,30,26,0.9)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.5); g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill(); }
    }
    const medT = tex(medC);
    // green glazed tiles: barrel rows down the slope
    const tileC = mkCanvas(128); {
      const g = tileC.getContext('2d'), S = 128; g.fillStyle = '#2f7a5a'; g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 16) { const lg = g.createLinearGradient(x, 0, x + 16, 0); lg.addColorStop(0, 'rgba(10,40,30,0.55)'); lg.addColorStop(0.45, 'rgba(160,230,190,0.35)'); lg.addColorStop(1, 'rgba(10,40,30,0.55)'); g.fillStyle = lg; g.fillRect(x, 0, 16, S); }
      for (let y = 0; y < S; y += 21) { g.fillStyle = 'rgba(10,30,20,0.35)'; g.fillRect(0, y, S, 2); }
    }
    const tileT = tex(tileC);
    // minaret shaft: plain plaster below, panels of blind arches, a band of green and white zellige under the crown
    const minC = mkCanvas(128, 1024); {
      const g = minC.getContext('2d'), W = 128, H = 1024; g.drawImage(plasterC, 0, 0, W, 512); g.drawImage(plasterC, 0, 512, W, 512);
      g.fillStyle = 'rgba(80,60,40,0.18)'; g.fillRect(0, 0, W, H);
      const z0 = 40, z1 = 110; for (let y = z0; y < z1; y += 10) for (let x = 0; x < W; x += 10) { g.fillStyle = ((x + y) / 10) % 2 ? '#2f8a64' : '#f2efe4'; g.fillRect(x + 1, y + 1, 8, 8); }
      g.fillStyle = '#1e5a44'; g.fillRect(0, z0 - 4, W, 4); g.fillRect(0, z1, W, 4);
      const arch = (x, y, w, h) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.55); g.quadraticCurveTo(x, y, x + w / 2, y - w * 0.15); g.quadraticCurveTo(x + w, y, x + w, y + w * 0.55); g.lineTo(x + w, y + h); };
      g.fillStyle = 'rgba(90,70,50,0.45)'; arch(18, 150, 92, 200); g.fill(); g.strokeStyle = '#2f8a64'; g.lineWidth = 5; g.stroke();
      g.strokeStyle = 'rgba(70,52,36,0.6)'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); for (let x = 22; x < 106; x += 8) g.lineTo(x, 190 + k * 26 + (Math.floor(x / 8) % 2) * 9); g.stroke(); }
      g.fillStyle = 'rgba(40,30,24,0.85)'; arch(48, 430, 32, 60); g.fill(); arch(48, 620, 28, 48); g.fill();
      g.fillStyle = 'rgba(90,70,50,0.35)'; arch(30, 380, 68, 150); g.fill();
    }
    const minT = own(new THREE.CanvasTexture(minC)); minT.colorSpace = THREE.SRGBColorSpace;
    // the pit wall of the great vat: years of dye running down plaster in meandering drips and clouds
    const pitC = mkCanvas(512); {
      const g = pitC.getContext('2d'), S = 512; const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#4a72d0'); gr.addColorStop(1, '#2c46a0'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
      const tmp = mkCanvas(S), t = tmp.getContext('2d'); t.lineCap = 'round'; t.lineJoin = 'round';
      const cols = ['240,176,48', '212,85,47', '63,191,138', '150,180,250', '224,112,154'];
      for (let i = 0; i < 48; i++) {
        const c = cols[R.int(0, 4)], x0 = R.range(0, S), y0 = R.range(-20, S * 0.6), len = R.range(100, 380), w = R.range(10, 34), ph = R.range(0, 6.28), amp = R.range(6, 26), a = R.range(0.28, 0.55);
        for (const ox of [-S, 0, S]) { t.strokeStyle = `rgba(${c},${a})`; t.lineWidth = w; t.beginPath(); for (let k = 0; k <= 24; k++) { const f = k / 24, x = x0 + ox + Math.sin(f * 5 + ph) * amp, y = y0 + f * len; k ? t.lineTo(x, y) : t.moveTo(x, y); } t.stroke(); }
      }
      for (let i = 0; i < 12; i++) { const c = cols[R.int(0, 4)], x = R.range(0, S), y = R.range(0, S), r = R.range(40, 110); for (const ox of [-S, 0, S]) { const q = t.createRadialGradient(x + ox, y, 0, x + ox, y, r); q.addColorStop(0, `rgba(${c},0.22)`); q.addColorStop(1, `rgba(${c},0)`); t.fillStyle = q; t.fillRect(x + ox - r, y - r, r * 2, r * 2); } }
      g.filter = 'blur(6px)'; g.drawImage(tmp, 0, 0); g.filter = 'none';
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(20,30,70,${R.range(0.04, 0.14)})`; g.fillRect(R.range(0, S), R.range(0, S), 1.5, 1.5); }
    }
    const pitDyeT = tex(pitC, 3, 1), pitFloorT = tex(pitC, 2, 2), curtainT = tex(pitC, 1, 1);
    // caustics: a net of bright wavy cells, drifted over the pit walls
    const causC = mkCanvas(256); {
      const g = causC.getContext('2d'), S = 256; g.fillStyle = '#000'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(200,225,255,0.55)'; g.lineCap = 'round';
      for (let i = 0; i < 90; i++) { let x = R.range(0, S), y = R.range(0, S); g.lineWidth = R.range(1, 3.2); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += R.range(-26, 26); y += R.range(-26, 26); g.lineTo(x, y); } g.stroke(); }
      g.filter = 'blur(1.5px)'; g.drawImage(causC, 0, 0); g.filter = 'none';
    }
    const causT = tex(causC, 6, 2);
    // the surface seen from below: a bright window of sky, soft caustic patches
    const ceilC = mkCanvas(256); { const g = ceilC.getContext('2d'), S = 256; const rg = g.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S * 0.72); rg.addColorStop(0, '#5a7ed4'); rg.addColorStop(0.5, '#2e4aa8'); rg.addColorStop(1, '#1a2a70'); g.fillStyle = rg; g.fillRect(0, 0, S, S);
      g.lineCap = 'round'; for (let i = 0; i < 40; i++) { let x = R.range(0, S), y = R.range(0, S); g.strokeStyle = R() < 0.5 ? `rgba(10,16,50,${R.range(0.2, 0.45)})` : `rgba(120,150,230,${R.range(0.15, 0.3)})`; g.lineWidth = R.range(3, 12); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += R.range(-30, 30); y += R.range(-30, 30); g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 30; i++) { const x = R.range(0, S), y = R.range(0, S), r = R.range(8, 28), q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(160,190,255,0.12)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2); } }
    const ceilT = own(new THREE.CanvasTexture(ceilC)); ceilT.colorSpace = THREE.SRGBColorSpace;
    const softC = mkCanvas(128); { const g = softC.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, 'rgba(255,255,255,0.85)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.4)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }
    const softT = own(new THREE.CanvasTexture(softC));
    // the bloom a dip leaves: a soft disc broken by marbling, so it reads as dye spreading, not a spot of light
    const bloomC = mkCanvas(256); { const g = bloomC.getContext('2d'), S = 256; g.drawImage(softC, 0, 0, S, S); g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 30; i++) { const a = R.range(0, 6.28), r = R.range(20, 110); g.strokeStyle = `rgba(0,0,0,${R.range(0.2, 0.6)})`; g.lineWidth = R.range(4, 14); g.beginPath(); g.arc(S / 2 + Math.cos(a) * r * 0.3, S / 2 + Math.sin(a) * r * 0.3, r, a, a + R.range(0.8, 2.4)); g.stroke(); }
      g.globalCompositeOperation = 'source-over'; }
    const bloomT = own(new THREE.CanvasTexture(bloomC));
    const crispC = mkCanvas(64); { const g = crispC.getContext('2d'); const rg = g.createRadialGradient(32, 32, 0, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,0.85)'); rg.addColorStop(0.8, 'rgba(255,255,255,0.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const crispT = own(new THREE.CanvasTexture(crispC));
    const glowC = mkCanvas(64); { const g = glowC.getContext('2d'); const rg = g.createRadialGradient(32, 32, 1, 32, 32, 31); rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); }
    const glowT = own(new THREE.CanvasTexture(glowC));
    await tick();

    // a material whose map is laid by world position (side walls by height), so boxes of any size keep their texture to scale
    const worldUV = (mat, tw, th, inst) => {
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
          { mat4 wm = modelMatrix${inst ? ' * instanceMatrix' : ''}; vec4 wq = wm * vec4(position, 1.); vec3 wn = normalize(mat3(wm) * normal);
            vec2 q = abs(wn.y) > .7 ? wq.xz : abs(wn.x) > abs(wn.z) ? wq.zy : wq.xy; vMapUv = q / vec2(${tw.toFixed(2)}, ${th.toFixed(2)}); }`);
      };
      mat.customProgramCacheKey = () => `wuv${tw}${th}${inst ? 1 : 0}`;
      return mat;
    };

    // ---------- the honeycomb: a jittered hex packing, relaxed once, so it is never a perfect grid ----------
    const SP = 2.95, vats = [];
    for (let j = 0, z = 48.4; z > -49; j++, z -= SP * 0.866) for (let x = -19.5 + (j % 2) * SP * 0.5; x < 19.6; x += SP) vats.push({ x: x + R.range(-0.35, 0.35), z: z + R.range(-0.35, 0.35) });
    { const D = SP * 0.94; for (const a of vats) { let fx0 = 0, fz0 = 0; for (const b of vats) { if (a === b) continue; const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz); if (d < D && d > 1e-3) { fx0 += (dx / d) * (D - d) * 0.5; fz0 += (dz / d) * (D - d) * 0.5; } } a.x += fx0; a.z += fz0; } }
    const LIP = 1.13;   // a vat's lip reaches LIP x its radius
    for (const v of vats) { let dm = Infinity; for (const b of vats) if (b !== v) dm = Math.min(dm, Math.hypot(v.x - b.x, v.z - b.z)); v.r = Math.min(1.4, ((dm / 2 - 0.07) / LIP) * (R() < 0.8 ? R.range(0.9, 1.0) : R.range(0.75, 0.9))); }
    // the walkway: the ridges under the line are kept clear, and the great vat stands alone in its own ring of stone
    for (const v of vats) v.gone = v.r < 0.62 || lineDist(v.x, v.z) < v.r * LIP + 0.05 || Math.hypot(v.x - HV.x, v.z - HV.z) < HV.r + 1.4 + v.r * LIP || v.z > 48.6;
    const V = vats.filter((v) => !v.gone);
    // zones as at Chouara: pale lime vats in one corner, coloured vats in the middle, brown tannin vats at the edges
    for (const v of V) {
      const lime = v.z < 17 && v.z > -13 && v.x > -10 - 0.3 * (v.z + 13);
      const edge = Math.abs(v.x) > 14.5 || v.z > 43 || v.z < -41;
      v.kind = lime ? (R() < 0.85 ? 'lime' : R.pick(COLOURED)) : edge ? (R() < 0.8 ? 'tannin' : R.pick(COLOURED)) : (R() < 0.12 ? 'tannin' : R.pick(COLOURED));
      v.level = -R.range(0.15, 0.5); v.variant = R.int(0, 3); v.rot = R.range(0, 6.28);
    }
    // the dips: each finds the vat nearest the place a bird should touch, and that vat takes the bird's dye
    const events = [];
    for (const [t, bird, dye, side, ahead, bleed] of DIPS) {
      frameAt(t, ahead, side * 4.0, _a); let best = null, bd = Infinity;
      for (const v of V) { if (v.used || v.r < 0.85 || lineDist(v.x, v.z) < 2.2) continue; const d = Math.hypot(v.x - _a.x, v.z - _a.z); if (d < bd) { bd = d; best = v; } }
      best.used = true; best.kind = dye; best.level = -0.2;
      frameAt(t, 0, 0, _b); path.tangentAtDist((t / DUR) * PL, _tg); _tg.y = 0; _tg.normalize();
      const right = new THREE.Vector3(-_tg.z, 0, _tg.x), dir = new THREE.Vector3().addScaledVector(_tg, 0.55).addScaledVector(right, -side * 0.85).normalize();
      const e = { t, bird, hex: DYE[dye], P: new THREE.Vector3(best.x, best.level, best.z), surf: best.level, r: best.r, dir, away: right.clone().multiplyScalar(side), vat: best };
      if (bleed) {   // the vat beside it is brown tannin, across a broken partition: the henna bleeds into it
        let nb = null, nd = Infinity; for (const v of V) { if (v === best || v.used) continue; const d = Math.hypot(v.x - best.x, v.z - best.z); if (d < nd) { nd = d; nb = v; } }
        nb.used = true; nb.kind = 'tannin'; nb.level = -0.22; e.bleed = nb; best.broken = nb;
      }
      events.push(e);
    }
    HV_ORDER.forEach((bird, k) => {
      const t = 13.6 + k * 0.34; frameAt(t, 8.5 + R.range(-1, 1.5), (k % 2 ? 1 : -1) * R.range(1.2, 3.5), _a);
      const dx = _a.x - HV.x, dz = _a.z - HV.z, d = Math.hypot(dx, dz), lim = HV.r - 1.8; if (d > lim) { _a.x = HV.x + (dx / d) * lim; _a.z = HV.z + (dz / d) * lim; }
      const ang = R.range(-1, 1) + (k % 2 ? 0.6 : -0.6), dir = new THREE.Vector3(Math.sin(ang), 0, -Math.cos(ang)).normalize();
      events.push({ t, bird, hex: DYE.indigo, P: new THREE.Vector3(_a.x, HV.surf, _a.z), surf: HV.surf, r: 3.6, dir, away: new THREE.Vector3(Math.sign(ang) || 1, 0, 0), pit: true, last: k === HV_ORDER.length - 1 });
    });
    events.sort((p, q) => p.t - q.t);
    for (const e of events) e.col = new THREE.Color(e.hex);
    for (const v of V) { v.hex = DYE[v.kind]; v.col = new THREE.Color(v.hex); if (v.kind === 'lime' && R() < 0.4) v.col.set('#d2cfc6'); if (v.kind === 'tannin') v.col.offsetHSL(R.range(-0.01, 0.01), 0, R.range(-0.06, 0.05)); }
    const NV = V.length;
    // a spatial hash of the vats (and the great vat), for the ridges
    const HC = 4, hash = new Map(), hk = (i, j) => i * 1000 + j;
    for (const v of V) { const i = Math.floor(v.x / HC), j = Math.floor(v.z / HC); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const k = hk(i + a, j + b); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(v); } }
    const HVR = HV.r + 0.55;   // the great vat's hole in the ridge stone (its lip reaches HV.r + 1.15)
    const nearest = (x, z) => {   // { v, d }: d = metres from the lip of the nearest vat (negative inside its hole)
      let bv = null, bd = Infinity; const l = hash.get(hk(Math.floor(x / HC), Math.floor(z / HC)));
      if (l) for (const v of l) { const d = Math.hypot(x - v.x, z - v.z) - v.r * 1.05; if (d < bd) { bd = d; bv = v; } }
      const dh = Math.hypot(x - HV.x, z - HV.z) - HVR; if (dh < bd) { bd = dh; bv = null; }
      return { v: bv, d: bd };
    };
    await tick();

    // ---------- the vats: lathe walls with chipped, notched lips (four variants), stained in layered tide lines ----------
    const PROF = [[LIP, 0.0], [1.1, 0.1], [1.05, 0.145], [0.98, 0.12], [0.955, 0.02], [0.945, -0.3], [0.935, -0.62], [0.9, -0.95]];
    const mkVatGeo = (k) => {
      const seg = 32, np = PROF.length, pos = [], uv = [], idx = [], vv = [0];
      for (let p = 1; p < np; p++) vv.push(vv[p - 1] + Math.hypot(PROF[p][0] - PROF[p - 1][0], PROF[p][1] - PROF[p - 1][1]) * (p <= 3 ? 1.6 : 1));
      const tot = vv[np - 1], ph = [R.range(0, 6.28), R.range(0, 6.28), R.range(0, 6.28)], chips = [];
      for (let s = 0; s < seg; s++) chips.push(R() < 0.18 ? R.range(0.025, 0.06) : 0); chips.push(chips[0]);
      const na = R.range(0, 6.28), notch = k % 2 === 1 ? R.range(0.1, 0.16) : 0;
      for (let s = 0; s <= seg; s++) {
        const a = (s / seg) * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
        let da = Math.abs(((a - na + Math.PI) % 6.2832 + 6.2832) % 6.2832 - Math.PI);
        const nT = 0.018 * Math.sin(a * 3 + ph[0]) + 0.012 * Math.sin(a * 7 + ph[1]) - chips[s] - notch * Math.exp(-(da * da) / 0.05);
        const low = 0.045 * Math.max(0, Math.sin(a * 2 + ph[2]));
        for (let p = 0; p < np; p++) {
          let r = PROF[p][0], y = PROF[p][1];
          if (p >= 1 && p <= 3) { y += nT - (p === 1 ? low : 0); r += 0.018 * Math.sin(a * 5 + ph[1]); }
          pos.push(r * ca, y, r * sa); uv.push((s / seg) * 3, 1 - vv[p] / tot);
        }
      }
      for (let s = 0; s < seg; s++) for (let p = 0; p < np - 1; p++) { const a0 = s * np + p, b0 = (s + 1) * np + p; idx.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      return own(g);
    };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _c = new THREE.Color(), _e = new THREE.Euler(), WHITE = new THREE.Color(1, 1, 1);
    const instanced = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = n; m.frustumCulled = false; scene.add(m); return m; };
    const finish = (...ms) => { for (const m of ms) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
    for (let k = 0; k < 4; k++) {
      const list = V.filter((v) => v.variant === k), geo = mkVatGeo(k);
      const im = instanced(geo, own(new THREE.MeshLambertMaterial({ map: vatT[k], side: THREE.DoubleSide })), list.length);
      list.forEach((v, i) => { _q.setFromAxisAngle(_y, v.rot); im.setMatrixAt(i, _m.compose(_p.set(v.x, 0, v.z), _q, _s.set(v.r, 1, v.r))); im.setColorAt(i, _c.copy(WHITE).lerp(v.col, v.kind === 'lime' ? 0.08 : 0.32).multiplyScalar(R.range(0.92, 1.06))); });
      finish(im);
    }
    // the dye: one shader for every vat, a slow marble, a fresnel sheen of the sky, a sun glint capped at 0.8
    const liqMat = own(new THREE.ShaderMaterial({
      uniforms: { ...fx.fogUniforms(), uMarble: { value: marbleT }, uTime: { value: 0 }, uSky: { value: new THREE.Color('#bcd0e6') }, uSunDir: { value: SUN_DIR.clone() }, uSunCol: { value: new THREE.Color('#ffe6c4') } },
      vertexShader: `${fx.GLSL_FOG_PARS_VERT}
        varying vec3 vW; varying vec3 vC; varying vec2 vL;
        void main(){
          vec4 lp = vec4(position, 1.);
        #ifdef USE_INSTANCING
          vec4 w = modelMatrix * instanceMatrix * lp;
        #else
          vec4 w = modelMatrix * lp;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #else
          vC = vec3(1.);
        #endif
          vL = position.xz; vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
          ${fx.GLSL_FOG_VERT}
        }`,
      fragmentShader: `${fx.GLSL_FOG_PARS_FRAG}
        uniform sampler2D uMarble; uniform float uTime; uniform vec3 uSky, uSunDir, uSunCol; varying vec3 vW; varying vec3 vC; varying vec2 vL;
        void main(){
          vec2 q = vW.xz * .21;
          float a = texture2D(uMarble, q + vec2(uTime * .006, uTime * .004)).r;
          float b = texture2D(uMarble, q * .53 + vec2(-uTime * .004, uTime * .005) + a * .06).r;
          float m = .45 + 1.1 * (a * .6 + b * .4);
          float edge = smoothstep(.6, 1., length(vL));
          vec3 col = vC * m * (1. - .3 * edge);
          vec3 V = normalize(cameraPosition - vW);
          float fr = pow(1. - clamp(V.y, 0., 1.), 5.);
          col = mix(col, uSky, fr * .32);
          vec3 H = normalize(V + uSunDir);
          col += uSunCol * min(.8, pow(max(H.y, 0.), 260.) * (.5 + .9 * a));
          gl_FragColor = vec4(fxApplyFog(col), 1.);
        }`,
      fog: true,
    }));
    const liqG = own(new THREE.CircleGeometry(0.955, 30)); liqG.rotateX(-Math.PI / 2);
    const liq = instanced(liqG, liqMat, NV);
    V.forEach((v, i) => { _q.identity(); liq.setMatrixAt(i, _m.compose(_p.set(v.x, v.level, v.z), _q, _s.set(v.r, 1, v.r))); liq.setColorAt(i, v.col); });
    finish(liq);
    // about thirty vats hold a half-sunk pale hide
    const hideShape = (() => { const s = new THREE.Shape(), n = 22; for (let i = 0; i <= n; i++) { const a = (i / n) * 6.2832, lobe = 0.2 * Math.pow(Math.abs(Math.cos(2 * a)), 6), r = (0.42 + lobe + 0.05 * Math.sin(a * 5 + 1)) * (1 + 0.25 * Math.cos(2 * a)); const x = Math.cos(a) * r * 1.2, y = Math.sin(a) * r * 0.8; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; })();
    const flatHide = (curl) => { const g = own(new THREE.ShapeGeometry(hideShape, 2)); g.rotateX(-Math.PI / 2); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, curl * (x * x * 0.5 + z * z * 0.3) + 0.02 * Math.sin(x * 9)); } g.computeVertexNormals(); return g; };
    const HIDE_COLS = ['#efe2c4', '#e0c08a', '#d9a65a', '#f0b84a', '#cfa070', '#f4ead6', '#e8b040'];
    const sunk = V.filter((v) => !v.used && R() < 0.12).slice(0, 32);
    const sunkM = instanced(flatHide(0.12), own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), sunk.length);
    sunk.forEach((v, i) => { _e.set(R.range(-0.08, 0.08), R.range(0, 6.28), R.range(-0.08, 0.08)); _q.setFromEuler(_e); sunkM.setMatrixAt(i, _m.compose(_p.set(v.x + R.range(-0.2, 0.2) * v.r, v.level + 0.015, v.z + R.range(-0.2, 0.2) * v.r), _q, _s.setScalar(v.r * R.range(0.8, 1.05)))); sunkM.setColorAt(i, _c.set(R.pick(['#e8dcc0', '#d8c098', '#efe6d2'])).lerp(v.col, 0.25)); });
    finish(sunkM);
    await tick();

    // ---------- the ridges: one stone mass at rim height with holes where the vats sit ----------
    {
      const X0 = -25, X1 = 25, Z0 = -51, Z1 = 52, CS = 0.3, nx = Math.round((X1 - X0) / CS), nz = Math.round((Z1 - Z0) / CS);
      const pos = new Float32Array((nx + 1) * (nz + 1) * 3), colA = new Float32Array((nx + 1) * (nz + 1) * 3), uvA = new Float32Array((nx + 1) * (nz + 1) * 2), dA = new Float32Array((nx + 1) * (nz + 1));
      const base = new THREE.Color('#fbf4e8'), wet = new THREE.Color('#b8aa94'), crust = new THREE.Color('#f4f0e6'), cc = new THREE.Color();
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        let x = X0 + i * CS + (i > 0 && i < nx ? R.range(-0.06, 0.06) : 0), z = Z0 + j * CS + (j > 0 && j < nz ? R.range(-0.06, 0.06) : 0);
        let { v, d } = nearest(x, z);
        if (d > -0.16 && d < 0.13) {   // snap onto the hole's circle, so the holes are round
          const cx = v ? v.x : HV.x, cz = v ? v.z : HV.z, rr = v ? v.r * 1.05 : HVR, dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1;
          x = cx + (dx / l) * rr; z = cz + (dz / l) * rr; d = 0;
        }
        const dl = v ? d - v.r * (LIP - 1.05) : d - 0.6;   // metres from the lip's outer edge
        const n1 = Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.7 - x * 0.3), n2 = Math.sin(x * 2.3 - z * 1.9) * 0.5;
        const k = (j * (nx + 1) + i);
        pos[k * 3] = x; pos[k * 3 + 1] = 0.07 + 0.065 * smoothstep(0, 0.3, dl) + 0.01 * n2; pos[k * 3 + 2] = z; dA[k] = d;
        uvA[k * 2] = x / 1.4; uvA[k * 2 + 1] = z / 1.4;
        // wet stone, darker in the middle of each ridge; stained toward the dye of the vat beside it; lime crust by the lime vats
        const mid = smoothstep(0.05, 0.4, dl) * (1 - smoothstep(0.9, 2.2, dl)), wetN = 0.5 + 0.5 * n1;
        cc.copy(base).lerp(wet, 0.4 * mid + 0.18 * wetN * smoothstep(0.6, 2, dl)).multiplyScalar(R.range(0.95, 1.04));
        if (v && dl < 0.5) { const w = 1 - smoothstep(-0.05, 0.5, dl); if (v.kind === 'lime') cc.lerp(crust, 0.55 * w); else cc.lerp(_c.copy(v.col).multiplyScalar(0.75), 0.35 * w); }
        if (!v && d < 1.2) cc.lerp(_c.set(DYE.indigo).multiplyScalar(0.7), 0.45 * (1 - smoothstep(0.4, 1.2, d)));
        colA[k * 3] = cc.r; colA[k * 3 + 1] = cc.g; colA[k * 3 + 2] = cc.b;
      }
      const idx = [];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        for (const [p, q, r] of [[a, c, b], [b, c, d]]) {
          const cx = (pos[p * 3] + pos[q * 3] + pos[r * 3]) / 3, cz = (pos[p * 3 + 2] + pos[q * 3 + 2] + pos[r * 3 + 2]) / 3;
          if (nearest(cx, cz).d < 0) continue; idx.push(p, q, r);
        }
      }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colA, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const ridge = new THREE.Mesh(g, own(new THREE.MeshPhongMaterial({ map: stoneT, vertexColors: true, specular: '#5a5048', shininess: 38 }))); scene.add(ridge);
    }
    await tick();

    // ---------- the clutter of the work on the ridges ----------
    const ridgeSpot = (dMin, dMax, clear, tries = 40) => {   // a random place on the ridge stone, away from the line
      for (let t = 0; t < tries; t++) { const x = R.range(-22, 22), z = R.range(-48, 47); const n = nearest(x, z); if (n.d < dMin || n.d > dMax) continue; if (lineDist(x, z) < clear) continue; return { x, z, v: n.v, d: n.d }; }
      return null;
    };
    {
      // hides draped over the vat walls: bent over the lip, hanging inside, sagging, the corners curled
      const prof = [[-0.1, -0.42], [-0.085, -0.15], [-0.06, 0.06], [-0.02, 0.15], [0.05, 0.17], [0.13, 0.17], [0.24, 0.15], [0.42, 0.145]];
      const mkDrape = (w, curl) => { const nzp = 7, pos = [], idx = []; for (let s = 0; s < prof.length; s++) for (let q = 0; q <= nzp; q++) { const zq = (q / nzp - 0.5) * w, e = Math.abs(zq) / (w / 2); pos.push(prof[s][0] + (s >= 6 ? 0.06 * e * e : 0), prof[s][1] - 0.035 * Math.cos(e * 1.57) * (s < 3 ? 0 : 1) + curl * Math.pow(e, 4) * (s === 0 || s === prof.length - 1 ? 1 : 0.3), zq * (s < 2 ? 0.9 + 0.1 * Math.sin(q) : 1)); }
        for (let s = 0; s < prof.length - 1; s++) for (let q = 0; q < nzp; q++) { const a = s * (nzp + 1) + q, b = a + nzp + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
      const hideM = own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
      const drapes = [[], []];
      for (const v of V) { if (v.used && R() < 0.5) continue; if (R() > 0.36) continue; const n = R() < 0.25 ? 2 : 1; for (let k = 0; k < n; k++) { const a = R.range(0, 6.28), x = v.x + Math.cos(a) * v.r * 1.06, z = v.z + Math.sin(a) * v.r * 1.06; if (lineDist(x, z) < 1.1) continue; drapes[R.int(0, 1)].push({ x, z, a, s: v.r * R.range(0.85, 1.2), c: R.pick(HIDE_COLS) }); } }
      drapes.forEach((list, k) => { const im = instanced(mkDrape(k ? 0.85 : 0.65, k ? 0.07 : 0.03), hideM, list.length);
        list.forEach((h, i) => { _q.setFromAxisAngle(_y, -h.a); im.setMatrixAt(i, _m.compose(_p.set(h.x, 0, h.z), _q, _s.set(h.s, 1, h.s))); im.setColorAt(i, _c.set(h.c).multiplyScalar(R.range(0.85, 1.05))); }); finish(im); });
      // wooden paddles leaning on the rims
      const padG = own(mergeGeometries([new THREE.BoxGeometry(0.2, 0.5, 0.025).translate(0, 0.25, 0), new THREE.CylinderGeometry(0.022, 0.026, 1.5, 5).translate(0, 1.2, 0)]));
      const pads = []; for (let i = 0; i < 70; i++) { const s = ridgeSpot(0.0, 0.25, 1.4); if (s && s.v) pads.push(s); }
      const padM = instanced(padG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), pads.length);
      pads.forEach((s, i) => { const a = Math.atan2(s.z - s.v.z, s.x - s.v.x); _e.set(0, 0, 0); _q.setFromEuler(_e.set(R.range(-0.2, 0.2), -a + Math.PI / 2, 0.5 + R.range(-0.2, 0.25), 'YXZ')); padM.setMatrixAt(i, _m.compose(_p.set(s.v.x + Math.cos(a) * s.v.r * 0.98, -0.35, s.v.z + Math.sin(a) * s.v.r * 0.98), _q, _s.setScalar(R.range(0.85, 1.15)))); padM.setColorAt(i, _c.set(R.pick(['#7a5434', '#8a6038', '#6a4428', '#9a7048'])).lerp(s.v.col, 0.25)); });
      finish(padM);
      // buckets: wooden and plastic, single and stacked
      const buckG = own(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 10, 1, true)); buckG.translate(0, 0.17, 0);
      const bucks = []; for (let i = 0; i < 110; i++) { const s = ridgeSpot(0.12, 3, 1.3); if (!s) continue; const n = R() < 0.3 ? R.int(2, 3) : 1, plastic = R() < 0.45, c = plastic ? R.pick(['#2f6fd0', '#d84a3a', '#3aa86a', '#e8c040', '#e6e2da']) : R.pick(['#6a4a2e', '#7a5636', '#5a3c24']); for (let k = 0; k < n; k++) bucks.push({ x: s.x, z: s.z, y: 0.13 + k * 0.1, s: 1 - k * 0.03, c, rot: R.range(0, 6.28) }); }
      const buckM = instanced(buckG, own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), bucks.length);
      bucks.forEach((b, i) => { _q.setFromAxisAngle(_y, b.rot); buckM.setMatrixAt(i, _m.compose(_p.set(b.x, b.y, b.z), _q, _s.setScalar(b.s))); buckM.setColorAt(i, _c.set(b.c)); }); finish(buckM);
      // coiled hoses, stained rags, sacks of pigment
      const hoseG = own(new THREE.TorusGeometry(0.32, 0.025, 5, 22)); hoseG.rotateX(Math.PI / 2);
      const hoses = []; for (let i = 0; i < 26; i++) { const s = ridgeSpot(0.2, 3, 1.5); if (s) for (let k = 0; k < 4; k++) hoses.push({ x: s.x, z: s.z, y: 0.16 + k * 0.045, s: 1 - k * 0.12 }); }
      const hoseM = instanced(hoseG, own(new THREE.MeshLambertMaterial({ color: '#2a2a2a' })), hoses.length);
      hoses.forEach((h, i) => { _q.setFromEuler(_e.set(R.range(-0.08, 0.08), R.range(0, 6), 0)); hoseM.setMatrixAt(i, _m.compose(_p.set(h.x + R.range(-0.03, 0.03), h.y, h.z), _q, _s.setScalar(h.s))); }); finish(hoseM);
      const sackG = own(new THREE.SphereGeometry(0.3, 9, 6)); sackG.scale(1, 0.42, 0.75); sackG.translate(0, 0.1, 0);
      const sacks = []; for (let i = 0; i < 24; i++) { const s = ridgeSpot(0.3, 4, 3.5); if (s) sacks.push(s); }
      const sackM = instanced(sackG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), sacks.length);
      sacks.forEach((s, i) => { _q.setFromEuler(_e.set(0, R.range(0, 6), R.range(-0.1, 0.1))); sackM.setMatrixAt(i, _m.compose(_p.set(s.x, 0.1, s.z), _q, _s.setScalar(R.range(0.8, 1.2)))); sackM.setColorAt(i, _c.set(R.pick(['#c8b48c', '#b89a6a', '#d0bc98'])).lerp(new THREE.Color(R.pick(DYES)), 0.3)); }); finish(sackM);
      const ragG = own(new THREE.PlaneGeometry(0.5, 0.36, 3, 2)); ragG.rotateX(-Math.PI / 2); { const p = ragG.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, R.range(0, 0.035)); ragG.computeVertexNormals(); }
      const rags = []; for (let i = 0; i < 70; i++) { const s = ridgeSpot(0.05, 2, 1.0); if (s) rags.push(s); }
      const ragM = instanced(ragG, own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), rags.length);
      rags.forEach((s, i) => { _q.setFromAxisAngle(_y, R.range(0, 6.28)); ragM.setMatrixAt(i, _m.compose(_p.set(s.x, 0.15, s.z), _q, _s.setScalar(R.range(0.7, 1.3)))); ragM.setColorAt(i, _c.set(R.pick(DYES)).lerp(WHITE, 0.15)); }); finish(ragM);
      // dyed footprints along the walkway and puddles of dye on the ridges
      const decalM = own(new THREE.MeshBasicMaterial({ map: crispT, color: '#ffffff', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const footG = own(new THREE.CircleGeometry(0.5, 10)); footG.rotateX(-Math.PI / 2);
      const prints = []; for (let d = 6; d < 80; d += 0.62) { path.posAtDist(d, _a); path.tangentAtDist(d, _tg); _tg.y = 0; _tg.normalize(); const k = Math.round(d / 0.62) % 2 ? 1 : -1, wob = 0.5 * Math.sin(d * 0.21); const x = _a.x - _tg.z * (wob + k * 0.13), z = _a.z + _tg.x * (wob + k * 0.13); if (nearest(x, z).d < 0.3) continue; prints.push({ x, z, a: Math.atan2(_tg.x, _tg.z), c: d < 30 ? DYE.indigo : d < 55 ? DYE.saffron : DYE.henna }); }
      const pr = instanced(footG, decalM, 0); prints.length = 0;
      prints.forEach((f, i) => { _q.setFromAxisAngle(_y, f.a); pr.setMatrixAt(i, _m.compose(_p.set(f.x, 0.085, f.z), _q, _s.set(0.09, 1, 0.22))); pr.setColorAt(i, _c.set(f.c).multiplyScalar(0.7)); }); finish(pr);
      const puds = []; for (let i = 0; i < 140; i++) { const s = ridgeSpot(0.1, 3, 0.6); if (s) puds.push(s); }
      const pu = instanced(footG, decalM, puds.length);
      puds.forEach((s, i) => { _q.setFromAxisAngle(_y, R.range(0, 6.28)); pu.setMatrixAt(i, _m.compose(_p.set(s.x, 0.15, s.z), _q, _s.set(R.range(0.25, 0.6), 1, R.range(0.18, 0.4)))); pu.setColorAt(i, _c.copy(s.v ? s.v.col : new THREE.Color(DYE.indigo)).lerp(new THREE.Color('#bcd0e6'), 0.25)); }); finish(pu);
      // the broken partition between the henna vat and the brown vat beside it: a crack and a channel the dye runs through
      for (const v of V) if (v.broken) { const n = v.broken, dx = n.x - v.x, dz = n.z - v.z, d = Math.hypot(dx, dz);
        const ch = new THREE.Mesh(own(new THREE.PlaneGeometry(0.34, Math.max(0.4, d - (v.r + n.r) * 0.9))), own(new THREE.MeshLambertMaterial({ color: '#4a3020' }))); ch.rotation.set(-Math.PI / 2, 0, -Math.atan2(dx, dz)); ch.position.set((v.x + n.x) / 2, 0.15, (v.z + n.z) / 2); scene.add(ch); v.channel = ch; }
    }
    await tick();

    // ---------- the great indigo vat: a deep pit with a wide lip stained in layers ----------
    const uw = new THREE.Group(); uw.visible = false; scene.add(uw);
    let hvSurf;
    {
      const prof = [[HV.r + 1.15, -0.02], [HV.r + 1.08, 0.12], [HV.r + 0.9, 0.22], [HV.r + 0.3, 0.24], [HV.r + 0.08, 0.16], [HV.r, 0.02], [HV.r, -0.3]];
      const pts = prof.map(([r, y]) => new THREE.Vector2(r, y));
      const rimG = own(new THREE.LatheGeometry(pts, 96)); { const p = rimG.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); if (p.getY(i) > 0.1) p.setY(i, p.getY(i) + 0.03 * Math.sin(a * 13) + 0.02 * Math.sin(a * 29) - (Math.sin(a * 7) > 0.92 ? 0.06 : 0)); } rimG.computeVertexNormals(); }
      const rt = vatT[0].clone(); rt.repeat.set(14, 1); rt.needsUpdate = true; own(rt);
      const rim = new THREE.Mesh(rimG, own(new THREE.MeshLambertMaterial({ map: rt, color: '#c8d2f0', side: THREE.DoubleSide }))); rim.position.set(HV.x, 0, HV.z); scene.add(rim);
      const pitH = own(new THREE.CylinderGeometry(HV.r, HV.r * 0.97, -0.3 - HV.bottom, 64, 1, true)); pitH.translate(HV.x, (-0.3 + HV.bottom) / 2, HV.z);
      scene.add(new THREE.Mesh(pitH, own(new THREE.MeshBasicMaterial({ map: pitDyeT, color: '#ffffff', side: THREE.BackSide }))));
      const caus = new THREE.Mesh(pitH.clone().scale(1, 1, 1), own(new THREE.MeshBasicMaterial({ map: causT, color: '#9ec4ff', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide })));
      caus.scale.set(0.995, 1, 0.995); caus.position.set(HV.x * 0.005, 0, HV.z * 0.005); own(caus.geometry); uw.add(caus);
      const botG = own(new THREE.CircleGeometry(HV.r, 48)); botG.rotateX(-Math.PI / 2); botG.translate(HV.x, HV.bottom + 0.02, HV.z);
      scene.add(new THREE.Mesh(botG, own(new THREE.MeshBasicMaterial({ map: pitFloorT, color: '#b8c8f0' }))));
      const sG = own(new THREE.CircleGeometry(1, 72)); sG.rotateX(-Math.PI / 2);
      hvSurf = instanced(sG, liqMat, 1); hvSurf.setMatrixAt(0, _m.compose(_p.set(HV.x, HV.surf, HV.z), _q.identity(), _s.set(HV.r, 1, HV.r))); hvSurf.setColorAt(0, _c.set(DYE.indigo)); finish(hvSurf);
      const ceil = new THREE.Mesh(own(new THREE.CircleGeometry(HV.r, 56)), own(new THREE.MeshBasicMaterial({ map: ceilT, color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: 0.94, depthWrite: false })));
      ceil.rotation.x = Math.PI / 2; ceil.position.set(HV.x, HV.surf - 0.02, HV.z); uw.add(ceil);
    }
    await tick();

    // ---------- tannery terraces around the pit: 2 to 4 storeys, stepped, balconies, parapets heaped with hides ----------
    const bx = (list, x0, x1, y0, y1, z0, z1, col) => { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.deleteAttribute('uv'); const n = g.attributes.position.count, c = new Float32Array(n * 3); for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); list.push(g); };
    const WALLS = ['#c9a37a', '#d8b080', '#d6a08c', '#ece6d8', '#cfae86', '#e2c8a4'];
    const tannery = [], parts = [], balc = [], pipes = [], parHides = [], roofHides = [];
    {
      const push = (x0, x1, z0, z1, face, storeys) => tannery.push({ x0, x1, z0, z1, face, storeys, h: storeys * 3.1, col: new THREE.Color(R.pick(WALLS)).multiplyScalar(R.range(0.9, 1.04)) });
      for (const side of [-1, 1]) for (let z = 66; z > -64;) { const w = R.range(6, 11), front = 21.2 + R.range(0, 2.6), depth = R.range(9, 14); const xa = side * front, xb = side * (front + depth); push(Math.min(xa, xb), Math.max(xa, xb), z - w, z, [-side, 0], R.int(2, 4)); z -= w - R.range(0, 0.4); }
      for (let x = -26; x < 26;) { const w = R.range(6, 10), front = -(46.4 + R.range(0, 2)); push(x, x + w, front - R.range(9, 13), front, [0, 1], R.int(3, 4)); x += w - 0.2; }
      // the viewing terrace we drop from (its roof 4 m up, the parapet under the eye), and taller houses behind it
      tannery.push({ x0: -21.5, x1: 21.5, z0: 50.6, z1: 60, face: [0, -1], storeys: 1, h: 4.0, col: new THREE.Color('#d8b080'), terrace: true });
      for (let x = -26; x < 26;) { const w = R.range(6, 10); push(x, x + w, 60, 70, [0, -1], R.int(3, 4)); x += w - 0.2; }
      for (const b of tannery) {
        const { x0, x1, z0, z1, h, col, face } = b; bx(parts, x0, x1, -12, h, z0, z1, col);
        // a stepped upper storey set back from the pit
        let top = h; if (!b.terrace && b.storeys >= 3 && R() < 0.65) { const sb = R.range(1.6, 3.2), q = { x0: x0 + (face[0] > 0 ? sb : 0.3), x1: x1 - (face[0] < 0 ? sb : 0.3), z0: z0 + (face[1] > 0 ? sb : 0.3), z1: z1 - (face[1] < 0 ? sb : 0.3) }; top = h + 3.1; bx(parts, q.x0, q.x1, h, top, q.z0, q.z1, col.clone().multiplyScalar(0.97)); b.upper = { ...q, top }; }
        // parapets round the roofs
        const pc = col.clone().multiplyScalar(0.94), pt = 0.25, ph = b.terrace ? 0.85 : 0.7;
        bx(parts, x0, x1, h, h + ph, z0, z0 + pt, pc); bx(parts, x0, x1, h, h + ph, z1 - pt, z1, pc); bx(parts, x0, x0 + pt, h, h + ph, z0, z1, pc); bx(parts, x1 - pt, x1, h, h + ph, z0, z1, pc);
        if (b.upper) { const u = b.upper; bx(parts, u.x0, u.x1, top, top + 0.6, u.z0, u.z0 + pt, pc); bx(parts, u.x0, u.x1, top, top + 0.6, u.z1 - pt, u.z1, pc); }
        // the face toward the pit: balconies, a drainpipe, hides over the parapet
        const fx0 = face[0] !== 0 ? (face[0] > 0 ? x1 : x0) : null, fz0 = face[1] !== 0 ? (face[1] > 0 ? z1 : z0) : null;
        const along = (f) => (fx0 !== null ? [fx0, lerp(z0 + 1.2, z1 - 1.2, f)] : [lerp(x0 + 1.2, x1 - 1.2, f), fz0]);
        const yaw = Math.atan2(face[0], face[1]);
        if (!b.terrace) for (let s = 1; s < b.storeys; s++) if (R() < 0.55) { const [x, z] = along(R.range(0.15, 0.85)); balc.push({ x, y: s * 3.1, z, yaw, s: R.range(0.85, 1.25) }); }
        { const [x, z] = along(R() < 0.5 ? 0.02 : 0.98); pipes.push({ x: x + face[0] * 0.12, z: z + face[1] * 0.12, h }); }
        const nh = b.terrace ? 26 : R.int(2, 7); for (let k = 0; k < nh; k++) { const [x, z] = along(R()); parHides.push({ x, y: h + ph, z, yaw: yaw + R.range(-0.15, 0.15), s: R.range(0.8, 1.2), c: R.pick(HIDE_COLS) }); }
        // hides laid out to dry on the flat roofs, in rough rows
        if (!b.terrace && R() < 0.75) { const rows = R.int(1, 4), roofY = b.upper ? b.upper.top : h; const rx0 = b.upper ? b.upper.x0 : x0, rx1 = b.upper ? b.upper.x1 : x1, rz0 = b.upper ? b.upper.z0 : z0, rz1 = b.upper ? b.upper.z1 : z1;
          for (let r = 0; r < rows; r++) for (let q = 0; q < 6; q++) { if (R() < 0.25) continue; const fx1 = (q + 0.5 + R.range(-0.2, 0.2)) / 6, fz1 = (r + 0.5 + R.range(-0.2, 0.2)) / rows; roofHides.push({ x: lerp(rx0 + 0.8, rx1 - 0.8, fx1), y: roofY + 0.04, z: lerp(rz0 + 0.8, rz1 - 0.8, fz1), yaw: R.range(-0.3, 0.3) + (R() < 0.5 ? 0 : 1.57), s: R.range(0.8, 1.15), c: R.pick(HIDE_COLS) }); } }
      }
      const tg = own(mergeGeometries(parts)); for (const g of parts) g.dispose();
      scene.add(new THREE.Mesh(tg, own(worldUV(new THREE.MeshLambertMaterial({ map: facT, vertexColors: true }), 8, 12.4, false))));
      // balconies: a slab, posts, a top rail and turned balusters, in dark cedar
      const bp = [new THREE.BoxGeometry(2.4, 0.12, 1.0).translate(0, 0, 0.5), new THREE.BoxGeometry(2.5, 0.08, 0.08).translate(0, 1.0, 1.0), new THREE.BoxGeometry(0.08, 0.08, 1.0).translate(-1.2, 1.0, 0.5), new THREE.BoxGeometry(0.08, 0.08, 1.0).translate(1.2, 1.0, 0.5)];
      for (let k = 0; k <= 12; k++) bp.push(new THREE.CylinderGeometry(0.03, 0.04, 0.95, 6).translate(-1.15 + k * (2.3 / 12), 0.5, 0.98));
      for (const sx of [-1.2, 1.2]) for (let k = 0; k < 4; k++) bp.push(new THREE.CylinderGeometry(0.03, 0.04, 0.95, 6).translate(sx, 0.5, 0.15 + k * 0.25));
      for (const sx of [-0.9, 0.9]) bp.push(new THREE.BoxGeometry(0.1, 0.6, 0.1).translate(sx, -0.3, 0.12).rotateX(0));
      for (const g of bp) g.deleteAttribute('uv');
      const balG = own(mergeGeometries(bp)); for (const g of bp) g.dispose();
      const balM = instanced(balG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), balc.length);
      balc.forEach((b, i) => { _q.setFromAxisAngle(_y, b.yaw); balM.setMatrixAt(i, _m.compose(_p.set(b.x, b.y, b.z), _q, _s.set(b.s, 1, 1))); balM.setColorAt(i, _c.set(R.pick(['#5a3a24', '#6a4428', '#4a3020']))); }); finish(balM);
      // hides over the balcony rails too
      for (const b of balc) if (R() < 0.6) parHides.push({ x: b.x + Math.sin(b.yaw) * 1.0, y: b.y + 1.0, z: b.z + Math.cos(b.yaw) * 1.0, yaw: b.yaw, s: R.range(0.8, 1.1), c: R.pick(HIDE_COLS) });
      const pipeG = own(new THREE.CylinderGeometry(0.07, 0.07, 1, 6)); pipeG.translate(0, 0.5, 0);
      const pipeM = instanced(pipeG, own(new THREE.MeshLambertMaterial({ color: '#6a6660' })), pipes.length);
      pipes.forEach((p, i) => { pipeM.setMatrixAt(i, _m.compose(_p.set(p.x, 0, p.z), _q.identity(), _s.set(1, p.h, 1))); }); finish(pipeM);
      // a hide hung over a parapet or rail: down both sides, with its edges curling
      const overG = (() => { const pr = [[-0.12, -0.75], [-0.1, -0.3], [-0.05, -0.04], [0, 0.03], [0.05, -0.04], [0.09, -0.25], [0.11, -0.5]], nq = 6, pos = [], idx = [];
        for (let s = 0; s < pr.length; s++) for (let q = 0; q <= nq; q++) { const zq = (q / nq - 0.5) * 0.9, e = Math.abs(zq) / 0.45; pos.push(pr[s][0] + (s === 0 || s === pr.length - 1 ? 0.05 * e * e : 0), pr[s][1] + (s === 0 ? 0.08 * e * e : 0) + 0.04 * Math.sin(q * 1.7 + s), zq * (1 - 0.15 * (s === 0 ? 1 - e : 0))); }
        for (let s = 0; s < pr.length - 1; s++) for (let q = 0; q < nq; q++) { const a = s * (nq + 1) + q, b2 = a + nq + 1; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
        const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.rotateY(Math.PI / 2); return g; })();
      const phM = instanced(overG, own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), parHides.length);
      parHides.forEach((h, i) => { _q.setFromAxisAngle(_y, h.yaw); phM.setMatrixAt(i, _m.compose(_p.set(h.x, h.y, h.z), _q, _s.setScalar(h.s))); phM.setColorAt(i, _c.set(h.c)); }); finish(phM);
      const rhGs = [flatHide(0.05), flatHide(0.16), flatHide(-0.06)], rhM = own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
      rhGs.forEach((g, k) => { const list = roofHides.filter((_, i) => i % 3 === k), im = instanced(g, rhM, list.length); list.forEach((h, i) => { _q.setFromAxisAngle(_y, h.yaw); im.setMatrixAt(i, _m.compose(_p.set(h.x, h.y, h.z), _q, _s.set(h.s * 1.3, 1, h.s))); im.setColorAt(i, _c.set(h.c).multiplyScalar(R.range(0.88, 1.05))); }); finish(im); });
    }
    await tick();

    // ---------- the medina beyond: Fez el-Bali on two rising slopes, the hills of Fez beyond ----------
    const groundH = (x, z) => {
      const ax = Math.abs(x), inner = ax < 27 && z > -55 && z < 72;
      if (inner) return -12;
      let h = Math.max(0, ax - 30) * 0.3 + Math.max(0, -z - 70) * 0.05 + Math.max(0, z - 80) * 0.1;
      h += (3 * Math.sin(x * 0.013 + z * 0.009) + 2 * Math.sin(z * 0.021 - x * 0.007)) * smoothstep(40, 120, ax + Math.max(0, -z));
      const r = Math.hypot(x, z + 120); h += 70 * smoothstep(420, 640, r) * (0.7 + 0.3 * Math.sin(Math.atan2(x, z) * 5));
      return Math.min(h, 160);
    };
    {
      const G = own(new THREE.PlaneGeometry(1600, 1600, 200, 200)); G.rotateX(-Math.PI / 2);
      const p = G.attributes.position, c = new Float32Array(p.count * 3), dust = new THREE.Color('#cfb088'), olive = new THREE.Color('#a2a070'), far = new THREE.Color('#b4a682');
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) - 100; p.setZ(i, z); const h = groundH(x, z); p.setY(i, h); const r = Math.hypot(x, z + 120); _c.copy(dust).lerp(olive, smoothstep(380, 520, r) * (0.6 + 0.4 * Math.sin(x * 0.02))).lerp(far, smoothstep(600, 800, r)); c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
      G.setAttribute('color', new THREE.BufferAttribute(c, 3)); G.computeVertexNormals();
      scene.add(new THREE.Mesh(G, own(new THREE.MeshLambertMaterial({ vertexColors: true }))));
    }
    const houses = [];
    for (let i = 0; i < 2600 && houses.length < 560; i++) {
      const side = R() < 0.5 ? -1 : 1, x = side * (47 + Math.pow(R(), 1.3) * 340), z = R.range(-520, 140);
      const fwd = R() < 0.25; const X = fwd ? R.range(-60, 60) : x, Z = fwd ? R.range(-70, -420) : z;
      if (Math.abs(X) < 46 && Z > -66) continue;
      if (Math.hypot(X, Z + 120) > 560) continue;
      const w = R.range(6, 13), d = R.range(6, 13);
      if (houses.some((h) => Math.abs(h.x - X) < (h.w + w) * 0.45 && Math.abs(h.z - Z) < (h.d + d) * 0.45)) continue;
      const gh = groundH(X, Z), H = R.range(6, 13);
      houses.push({ x: X, z: Z, w, d, gh, H, top: gh + H - 2.5, yaw: R.range(-0.25, 0.25), col: new THREE.Color(R.pick(['#d8bc94', '#cfa77c', '#e6dccb', '#d9a890', '#c99c70', '#efe8da'])).multiplyScalar(R.range(0.84, 1.06)) });
    }
    {
      const boxG = own(new THREE.BoxGeometry(1, 1, 1)); boxG.translate(0, 0.5, 0);
      const hm = instanced(boxG, own(worldUV(new THREE.MeshLambertMaterial({ map: medT, color: '#ffffff' }), 7, 7, true)), houses.length);
      houses.forEach((h, i) => { _q.setFromAxisAngle(_y, h.yaw); hm.setMatrixAt(i, _m.compose(_p.set(h.x, h.gh - 2.5, h.z), _q, _s.set(h.w, h.H, h.d))); hm.setColorAt(i, h.col); }); finish(hm);
      // parapets, water tanks, satellite dishes, rooftop shacks, laundry and drying hides
      const ring = [new THREE.BoxGeometry(1, 1, 0.04).translate(0, 0.5, 0.48), new THREE.BoxGeometry(1, 1, 0.04).translate(0, 0.5, -0.48), new THREE.BoxGeometry(0.04, 1, 1).translate(0.48, 0.5, 0), new THREE.BoxGeometry(0.04, 1, 1).translate(-0.48, 0.5, 0)];
      const parG = own(mergeGeometries(ring)); for (const g of ring) g.dispose();
      const pm = instanced(parG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), houses.length);
      houses.forEach((h, i) => { _q.setFromAxisAngle(_y, h.yaw); pm.setMatrixAt(i, _m.compose(_p.set(h.x, h.top, h.z), _q, _s.set(h.w, R.range(0.6, 1.0), h.d))); pm.setColorAt(i, _c.copy(h.col).multiplyScalar(0.93)); }); finish(pm);
      const onRoof = (h, mx = 0.35) => { const a = R.range(-mx, mx) * h.w, b = R.range(-mx, mx) * h.d, c = Math.cos(h.yaw), s = Math.sin(h.yaw); return [h.x + a * c + b * s, h.z - a * s + b * c]; };
      const tanks = houses.filter(() => R() < 0.42), tankG = own(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 10)); tankG.translate(0, 0.65, 0);
      const tm = instanced(tankG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), tanks.length);
      tanks.forEach((h, i) => { const [x, z] = onRoof(h); tm.setMatrixAt(i, _m.compose(_p.set(x, h.top, z), _q.identity(), _s.setScalar(R.range(0.8, 1.2)))); tm.setColorAt(i, _c.set(R() < 0.6 ? '#f2f0ea' : '#3a3a3e')); }); finish(tm);
      const dishG = own(mergeGeometries([new THREE.SphereGeometry(0.6, 10, 5, 0, 6.2832, 0, 0.55).rotateX(-Math.PI / 2).scale(1, 1, 0.5).translate(0, 1.0, 0.1), new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4).rotateX(1.2).translate(0, 1.15, 0.38)]));
      const dishes = houses.filter(() => R() < 0.24).slice(0, 130);
      const dm = instanced(dishG, own(new THREE.MeshLambertMaterial({ color: '#ececea', side: THREE.DoubleSide })), dishes.length);
      dishes.forEach((h, i) => { const [x, z] = onRoof(h); _q.setFromEuler(_e.set(-0.5, -2.4 + R.range(-0.15, 0.15), 0, 'YXZ')); dm.setMatrixAt(i, _m.compose(_p.set(x, h.top, z), _q, _s.setScalar(R.range(1.0, 1.4)))); }); finish(dm);
      const shacks = houses.filter(() => R() < 0.28), shG = own(new THREE.BoxGeometry(1, 1, 1)); shG.translate(0, 0.5, 0);
      const sm2 = instanced(shG, own(worldUV(new THREE.MeshLambertMaterial({ map: medT, color: '#ffffff' }), 7, 7, true)), shacks.length);
      shacks.forEach((h, i) => { const [x, z] = onRoof(h, 0.22); _q.setFromAxisAngle(_y, h.yaw); sm2.setMatrixAt(i, _m.compose(_p.set(x, h.top, z), _q, _s.set(R.range(2.2, 3.6), R.range(2.2, 2.8), R.range(2.2, 3.6)))); sm2.setColorAt(i, _c.copy(h.col).multiplyScalar(0.96)); }); finish(sm2);
      const cloths = [], lines = [];
      for (const h of houses) { if (R() > 0.3 || Math.hypot(h.x, h.z) > 260) continue; const [x, z] = onRoof(h, 0.2), a = h.yaw + R.range(-0.3, 0.3), n = R.int(3, 6), L = n * 0.8; lines.push({ x, z, y: h.top + 1.7, a, L });
        for (let k = 0; k < n; k++) { const f = (k + 0.5) / n - 0.5; cloths.push({ x: x + Math.cos(a) * f * L, z: z - Math.sin(a) * f * L, y: h.top + 1.7, a, c: R.pick(['#f2f0ea', '#d84a3a', '#2f6fd0', '#f0b030', '#3fbf8a', '#e0709a', '#8a5aa8', '#ffffff']), s: R.range(0.6, 1.0) }); } }
      const clG = own(new THREE.PlaneGeometry(0.7, 0.9)); clG.translate(0, -0.45, 0);
      const cm = instanced(clG, own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), cloths.length);
      cloths.forEach((c, i) => { _q.setFromAxisAngle(_y, c.a); cm.setMatrixAt(i, _m.compose(_p.set(c.x, c.y, c.z), _q, _s.set(c.s, c.s * R.range(0.8, 1.3), 1))); cm.setColorAt(i, _c.set(c.c)); }); finish(cm);
      const lnG = own(new THREE.BoxGeometry(1, 0.03, 0.03));
      const lm = instanced(lnG, own(new THREE.MeshLambertMaterial({ color: '#4a4440' })), lines.length);
      lines.forEach((l, i) => { _q.setFromAxisAngle(_y, l.a); lm.setMatrixAt(i, _m.compose(_p.set(l.x, l.y, l.z), _q, _s.set(l.L, 1, 1))); }); finish(lm);
      // saffron and cream hides drying in rows on the medina roofs (the skyline look sees these)
      const mh = []; for (const h of houses) { if (R() > 0.22 || Math.hypot(h.x, h.z) > 320) continue; const rows = R.int(2, 3), cols = R.int(3, 5);
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const a = ((q + 0.5) / cols - 0.5) * h.w * 0.8, b = ((r + 0.5) / rows - 0.5) * h.d * 0.8, c = Math.cos(h.yaw), s = Math.sin(h.yaw); mh.push({ x: h.x + a * c + b * s, z: h.z - a * s + b * c, y: h.top + 0.05, yaw: h.yaw + R.range(-0.2, 0.2), c: R() < 0.5 ? '#f0b030' : R.pick(HIDE_COLS) }); } }
      const mhM = instanced(flatHide(0.08), own(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), mh.length);
      mh.forEach((h, i) => { _q.setFromAxisAngle(_y, h.yaw); mhM.setMatrixAt(i, _m.compose(_p.set(h.x, h.y, h.z), _q, _s.setScalar(R.range(1.1, 1.5)))); mhM.setColorAt(i, _c.set(h.c)); }); finish(mhM);
    }
    await tick();

    // ---------- green tile roofs of the zawiyas and mosques, and three minarets built properly ----------
    {
      const hip = (w, d, ht) => {   // a hipped roof, ridge along x, its tiles laid down the slope
        const hw = w / 2, hd = d / 2, rr = Math.max(0, hw - hd * 0.9), P = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], [-rr, ht, 0], [rr, ht, 0]];
        const faces = [[0, 4, 5, 1], [2, 5, 4, 3], [1, 5, 2], [3, 4, 0]], pos = [], uv = [];
        for (const f of faces) { const tri = f.length === 4 ? [[f[0], f[1], f[2]], [f[0], f[2], f[3]]] : [f]; for (const t of tri) for (const k of t) { const p = P[k]; pos.push(...p); const along = f.length === 4 ? p[0] : p[2]; uv.push(along / 1.2, (p[1] / ht) * 3); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
      };
      const roofs = [];
      const big = houses.filter((h) => Math.hypot(h.x, h.z) < 300).sort(() => R() - 0.5).slice(0, 8);
      for (const h of big) { h.w = Math.max(h.w, 11); const g = hip(h.w * 1.04, h.d * 1.04, R.range(2.6, 3.8)); g.rotateY(h.yaw); g.translate(h.x, h.top + 0.2, h.z); roofs.push(g); }
      for (const [x, z, w, d] of [[33, 30, 10, 8], [-34, -20, 12, 9]]) { const g = hip(w, d, 3.2); g.rotateY(Math.PI / 2); g.translate(x, 13.2, z); roofs.push(g); tannery.push({ x0: x - d / 2, x1: x + d / 2, z0: z - w / 2, z1: z + w / 2, h: 13 }); }
      const rg = own(mergeGeometries(roofs)); for (const g of roofs) g.dispose();
      scene.add(new THREE.Mesh(rg, own(new THREE.MeshLambertMaterial({ map: tileT, color: '#ffffff', side: THREE.DoubleSide }))));
      // the two zawiyas by the tannery need walls under their roofs
      const zw = []; for (const [x, z, w, d] of [[33, 30, 10, 8], [-34, -20, 12, 9]]) bx(zw, x - d / 2, x + d / 2, -12, 13.2, z - w / 2, z + w / 2, new THREE.Color('#ece4d4'));
      const zg = own(mergeGeometries(zw)); for (const g of zw) g.dispose(); scene.add(new THREE.Mesh(zg, own(worldUV(new THREE.MeshLambertMaterial({ map: facT, vertexColors: true }), 8, 12.4, false))));
      // minarets: a square shaft with its zellige band and blind arches, a crenellated crown, a lantern, a green cap and the jamour
      const shafts = [], plain = [], caps = [], gold = [];
      const minaret = (x, z, H, s) => {
        const y0 = groundH(x, z) - 3, top = y0 + H;
        const sh = new THREE.BoxGeometry(s, H, s); sh.translate(x, y0 + H / 2, z); shafts.push(sh);
        plain.push(new THREE.BoxGeometry(s + 0.5, 0.45, s + 0.5).translate(x, top + 0.22, z));
        const n = 4, mw = s / (n * 2 - 1);
        for (let side = 0; side < 4; side++) for (let k = 0; k < n; k++) { const f = -s / 2 + mw * (2 * k + 0.5), a = (side * Math.PI) / 2, ox = side % 2 ? (side === 1 ? 1 : -1) * (s / 2 + 0.05) : f, oz = side % 2 ? f : (side === 0 ? 1 : -1) * (s / 2 + 0.05);
          plain.push(new THREE.BoxGeometry(mw, 0.9, 0.35).rotateY(a).translate(x + ox, top + 0.9, z + oz), new THREE.ConeGeometry(mw * 0.55, 0.45, 4).rotateY(a + Math.PI / 4).translate(x + ox, top + 1.55, z + oz)); }
        const ls = s * 0.42, lh = H * 0.16;
        const lan = new THREE.BoxGeometry(ls, lh, ls); lan.translate(x, top + 0.45 + lh / 2, z); shafts.push(lan);
        caps.push(new THREE.ConeGeometry(ls * 0.82, ls * 0.75, 4).rotateY(Math.PI / 4).translate(x, top + 0.45 + lh + ls * 0.37, z));
        const ty = top + 0.45 + lh + ls * 0.75; gold.push(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5).translate(x, ty + 1.2, z));
        [0.55, 0.42, 0.3].forEach((r, k) => gold.push(new THREE.SphereGeometry(r, 10, 8).translate(x, ty + 0.5 + k * 0.75, z)));
      };
      minaret(58, -46, 32, 4.6); minaret(118, -100, 36, 5.2); minaret(-92, -128, 32, 4.6);
      for (const list of [shafts, plain, caps, gold]) for (const g of list) { g.deleteAttribute('uv'); }
      // the shafts keep box UVs, so each face carries the whole decorated column
      const shaftsUV = []; for (const g of shafts) { const n = g.attributes.position.count, b = new THREE.Box3().setFromBufferAttribute(g.attributes.position), uv = new Float32Array(n * 2), P = g.attributes.position, N = g.attributes.normal;
        for (let i = 0; i < n; i++) { const ax = Math.abs(N.getX(i)) > 0.5; uv[i * 2] = ax ? (P.getZ(i) - b.min.z) / (b.max.z - b.min.z) : (P.getX(i) - b.min.x) / (b.max.x - b.min.x); uv[i * 2 + 1] = (P.getY(i) - b.min.y) / (b.max.y - b.min.y); }
        g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); shaftsUV.push(g); }
      const mk = (list, mat) => { const g = own(mergeGeometries(list)); for (const x of list) x.dispose(); scene.add(new THREE.Mesh(g, own(mat))); };
      mk(shaftsUV, new THREE.MeshLambertMaterial({ map: minT, color: '#f4e8d6' }));
      mk(plain, new THREE.MeshLambertMaterial({ color: '#e8dcc6' }));
      mk(caps, new THREE.MeshLambertMaterial({ color: '#2f7a5a' }));
      mk(gold, new THREE.MeshLambertMaterial({ color: '#d8a838', emissive: '#4a3010' }));
      // the Merinid tombs: a pale ruin on the north ridge
      const ru = []; const tx = 300, tz = -470, ty = groundH(tx, tz);
      for (let k = 0; k < 7; k++) { const w = R.range(10, 24), h = R.range(8, 22), d = R.range(8, 16), ox = R.range(-50, 50), oz = R.range(-20, 20); ru.push(new THREE.BoxGeometry(w, h, d).translate(tx + ox, groundH(tx + ox, tz + oz) + h / 2 - 3, tz + oz)); }
      ru.push(new THREE.SphereGeometry(9, 12, 6, 0, 6.28, 0, 1.3).translate(tx + 10, ty + 14, tz));
      for (const g of ru) g.deleteAttribute('uv');
      mk(ru, new THREE.MeshLambertMaterial({ color: '#e8dcc4' }));
    }
    // mist banks between the near medina, the far medina and the hills: warm ochre low, blue high
    const mists = [];
    {
      const pts = (r0, r1, n, lift) => { const out = []; for (let i = 0; i < n; i++) { const a = R.range(-1.9, 1.9), r = R.range(r0, r1), x = Math.sin(a) * r, z = -Math.cos(a) * r - 40; out.push([x, groundH(x, z) + lift + R.range(0, 6), z]); } return out; };
      for (const [r0, r1, n, sz, op, lift] of [[130, 190, 26, [40, 80], 0.2, 4], [290, 380, 30, [70, 130], 0.26, 10], [480, 560, 22, [110, 180], 0.3, 20]]) {
        const m = fx.makeMist({ rng: R.fork('mist' + r0), positions: pts(r0, r1, n, lift), size: sz, color: '#e8cba4', colorTop: '#c2d2e8', shadowColor: '#c8b49a', opacity: op, sunDir: SUN_DIR.toArray(), sunColor: '#ffe2bc', flatten: 0.35 });
        scene.add(m.object); mists.push(m);
      }
    }
    await tick();

    // ---------- life: the swift flock high up, grey pigeons over the roofs, and the burst at 10.5 s ----------
    const light = { sunDir: SUN_DIR.toArray(), sunColor: '#ffd9a8', sunIntensity: 1.5, sky: '#9db8d8', skyIntensity: 1.0, ground: '#c9a070', groundIntensity: 0.85 };
    const fauna = F.makeFauna(scene, { light });
    const clearOf = (from, to) => ({ path, dist: 2, each: true, up: true, from, to, step: 2 });
    const glaze = { body: '#8a7a6c', belly: '#b4a494', wingC: '#7c6e62', tip: '#5a4e46', trail: '#8a7c70', head: '#7a6c60', tailC: '#6e6258', beak: '#222222' };
    fauna.add(await F.makeFlockAsync({ rng: R.fork('swifts'), species: 'swifts', count: 14, size: 1.6, light, center: [6, 58, -30], radius: 48, height: 6, spread: [40, 12, 40], wander: [2, 1.2, 2, 0.7], maxSigma: 3, keepClear: clearOf(0, 1), ...glaze }, ctx.yield));
    await tick();
    const slate = { body: '#8a909c', belly: '#a6aab4', wingC: '#7c828e', tip: '#3a3e48', trail: '#6a707c', head: '#6a6f7c', tailC: '#5a5e68', beak: '#d8b090' };
    fauna.add(await F.makeFlockAsync({ rng: R.fork('pigeons-burst'), species: 'crows', count: 14, size: 0.7, light, spread: [16, 6, 16], wander: [0.8, 0.5, 0.8, 0.4], maxSigma: 3, keepClear: clearOf(0, 1), ...slate, cross: { path, u: 10.5 / DUR, lead: 18, height: 8, angle: 64, side: 1, span: 80, rise: 14, duration: DUR } }, ctx.yield));
    await tick();
    for (const [x, y, z, r] of [[34, 19, -14, 12], [60, 30, -70, 18]]) { fauna.add(await F.makeFlockAsync({ rng: R.fork('pigeons' + x), species: 'crows', count: 8, size: 0.7, light, center: [x, y, z], radius: r, height: 3, spread: [12, 4, 12], wander: [0.8, 0.5, 0.8, 0.4], maxSigma: 3, keepClear: clearOf(0, 1), ...slate }, ctx.yield)); await tick(); }

    // ---------- the swallows: a cambered barn-swallow mesh, lit, its colour painted per vertex each frame ----------
    // built once with marker colours (red = back, black = belly, green = bill) so each vertex knows what part of the bird it is
    const SW = { ...F.BIRD_PRESETS.swifts, fork: 1, tail: 0.16, tailW: 0.075, body: '#ff0000', belly: '#000000', head: '#ff0000', beak: '#00ff00', wingC: '#ff0000', trail: '#ff0000', tip: '#ff0000', tailC: '#ff0000' };
    const birdBase = F.birdGeometry(SW, 'high'); own(birdBase);
    const BN = birdBase.attributes.position.count, bAnim = birdBase.attributes.aAnim, bCol = birdBase.attributes.color, bPos = birdBase.attributes.position;
    const zc = 0.24 * SW.len, nat = new Float32Array(BN * 3), tone = new Float32Array(BN), bill = new Uint8Array(BN);
    {
      const steel = new THREE.Color('#3a5aa8'), crown = new THREE.Color('#2c4890'), rust = new THREE.Color('#c4623c'), cream = new THREE.Color('#f2e6cc'), wingN = new THREE.Color('#2c4a94'), tipN = new THREE.Color('#1c2c62'), tailN = new THREE.Color('#22397a'), c = new THREE.Color();
      for (let i = 0; i < BN; i++) {
        const top = bCol.getX(i), isBill = bCol.getY(i) > 0.5 && bCol.getX(i) < 0.5, side = bAnim.getY(i), tail = bAnim.getW(i), z = bPos.getZ(i), y = bPos.getY(i);
        if (isBill) { c.set('#1a1a1e'); tone[i] = 0; bill[i] = 1; }
        else if (Math.abs(side) > 0.5) { const sp = Math.min(1, bAnim.getX(i) / SW.span); c.copy(wingN).lerp(tipN, sp); tone[i] = 0.7 - 0.12 * sp; }
        else if (tail > 0) { c.copy(tailN); tone[i] = 0.66; }
        else if (z > zc - 0.01) { const throat = top < 0.6 || y < 0.12 * SW.girth; c.copy(throat ? rust : crown); tone[i] = throat ? 0.95 : 0.74; }
        else { c.copy(steel).lerp(cream, 1 - top); tone[i] = 0.74 + 0.26 * (1 - top); }
        nat[i * 3] = c.r; nat[i * 3 + 1] = c.g; nat[i * 3 + 2] = c.b;
      }
    }
    const BIRD_SCALE = 2.2, NB = 8, WRIST = SW.span * 0.46, SX0 = 0.5 * SW.girth;
    const birds = [];
    for (let i = 0; i < NB; i++) {
      const g = birdBase.clone(); own(g); g.setAttribute('color', new THREE.BufferAttribute(nat.slice(), 3)); g.attributes.position.setUsage(THREE.DynamicDrawUsage); g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      const mat = own(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color('#3a5aa8').multiplyScalar(0.22) }));
      const mesh = new THREE.Mesh(g, mat); mesh.scale.setScalar(BIRD_SCALE); mesh.frustumCulled = false; mesh.rotation.order = 'YXZ'; scene.add(mesh);
      birds.push({ mesh, g, mat, nat: 1, dye: new THREE.Color('#3a5aa8'), target: null, ph: R.range(0, 6.28), amp: 0.4, dih: 0.1, fan: 0, lead: [6, 7.5, 5.5, 8, 6.5, 7, 7.5, 8][i], lat: [-2.6, 2.4, 3.0, -3.2, -1.6, 2, -3.4, 3.2][i], hgt: [1.6, 2.4, 3.2, 1.9, 2.8, 3.6, 2.2, 3.0][i], dips: events.filter((e) => e.bird === i) });
    }
    const basePos = bPos.array.slice(), baseNrm = birdBase.attributes.normal.array.slice();
    const _cr = new THREE.Vector3(), _d = new THREE.Vector3(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _p3 = new THREE.Vector3();
    const dipPoint = (e, tau, out) => {   // the drinking pass: a shallow descent, the bill on the dye at tau = 0, a steep pull-up and a banked turn away
      const V0 = 6.2; out.copy(e.P).addScaledVector(e.dir, V0 * tau);
      if (tau > 0) out.addScaledVector(e.away, 2.4 * tau * tau);
      out.y = e.surf + 0.1 + (tau < 0 ? 1.6 * tau * tau : 3.0 * tau * tau);
      return out;
    };
    const swallowPos = (b, i, T, tc, out) => {
      // the cruise: ahead of the camera, weaving in quick bursts, on the clock so they fly in the portal preview too
      const lead = b.lead + 1.2 * Math.sin(tc * 0.7 + i * 1.3) + 0.5 * Math.sin(tc * 1.9 + i);
      const lat = b.lat + 1.6 * Math.sin(tc * 0.8 + i * 2.1) + 0.6 * Math.sin(tc * 2.3 + i * 1.7);
      frameAt(T, lead, lat, out);
      const done = b.dips.length && T > b.dips[b.dips.length - 1].t && b.dips[b.dips.length - 1].pit;
      out.y = 0.9 + b.hgt + 0.5 * Math.sin(tc * 1.3 + i) + 0.25 * Math.sin(tc * 3.1 + i * 2) + (done ? 9 * smoothstep(0.6, 3.2, T - b.dips[b.dips.length - 1].t) : 0) + 4 * smoothstep(16.2, 18.5, T);
      for (const e of b.dips) {
        const tau = T - e.t; if (tau < -1.1 || tau > 1.0) continue;
        const w = tau < 0 ? sm(1 + tau / 1.1) : sm(1 - tau);
        dipPoint(e, tau, _d); out.lerp(_d, w);
      }
      return out;
    };

    // ---------- the splashes: rings, a crown, a column, a spreading bloom that marbles back, and lit drops ----------
    const ringG = own(new THREE.RingGeometry(0.86, 1.0, 44)); ringG.rotateX(-Math.PI / 2);
    const bloomG = own(new THREE.CircleGeometry(1, 40)); bloomG.rotateX(-Math.PI / 2);
    const crownG = (() => { const pos = [], n = 11; for (let k = 0; k < n; k++) { const a = (k / n) * 6.2832 + R.range(-0.15, 0.15), w = 0.13, h = R.range(0.26, 0.42), r1 = R.range(0.42, 0.52);
        const p0 = [Math.cos(a - w) * 0.24, 0, Math.sin(a - w) * 0.24], p1 = [Math.cos(a + w) * 0.24, 0, Math.sin(a + w) * 0.24], p2 = [Math.cos(a) * r1, h, Math.sin(a) * r1]; pos.push(...p0, ...p1, ...p2); }
      const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; })();
    const colG = own(new THREE.CylinderGeometry(0.3, 0.12, 1, 14, 1, true)); colG.translate(0, 0.5, 0);
    const colT = (() => { const c = mkCanvas(32, 64), g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 64); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.4, 'rgba(255,255,255,0.6)'); lg.addColorStop(1, 'rgba(255,255,255,0.95)'); g.fillStyle = lg; g.fillRect(0, 0, 32, 64); return own(new THREE.CanvasTexture(c)); })();
    const fxs = events.map((e) => {
      const g = new THREE.Group(); g.position.set(e.P.x, e.surf + 0.012, e.P.z); g.visible = false;
      const light = e.col.clone().lerp(WHITE, 0.3);
      const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(ringG, own(new THREE.MeshBasicMaterial({ color: light, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); g.add(m); return m; });
      const bloom = new THREE.Mesh(bloomG, own(new THREE.MeshBasicMaterial({ map: bloomT, color: e.col.clone().lerp(WHITE, 0.4), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))); g.add(bloom);
      const crown = new THREE.Mesh(crownG, own(new THREE.MeshLambertMaterial({ color: e.col, emissive: e.col.clone().multiplyScalar(0.25), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))); g.add(crown);
      const col = new THREE.Mesh(colG, own(new THREE.MeshBasicMaterial({ map: colT, color: e.col, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }))); g.add(col);
      let bleed = null;
      if (e.bleed) { const n = e.bleed, bg = new THREE.Mesh(bloomG, own(new THREE.MeshBasicMaterial({ map: bloomT, color: new THREE.Color(DYE.henna).lerp(new THREE.Color(DYE.poppy), 0.35), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
        bg.position.set(n.x, n.level + 0.014, n.z); scene.add(bg); bleed = { m: bg, r: n.r, ch: e.vat.channel }; }
      scene.add(g); return { e, g, rings, bloom, crown, col, bleed, maxR: Math.min(e.r * (e.t < 3.5 ? 1.25 : 0.92), e.pit ? 3.4 : 2), spin: R.range(-0.25, 0.25) };
    });
    // drops: small lit spheres in the dye, thrown by each dip and trailed by the freshly dyed bird
    const DROPS_PER = 12, TRAIL = 4, dropV = events.map(() => Array.from({ length: DROPS_PER }, () => { const a = R.range(0, 6.28), s = R.range(0.5, 1.6); return [Math.cos(a) * s, R.range(1.8, 3.4), Math.sin(a) * s, R.range(0.6, 1.2)]; }));
    const dropG = own(new THREE.IcosahedronGeometry(0.035, 1));
    const drops = instanced(dropG, own(new THREE.MeshLambertMaterial({ color: '#ffffff' })), events.length * (DROPS_PER + TRAIL));
    drops.setColorAt(0, WHITE); drops.count = 0;
    await tick();

    // ---------- under the surface: marbled curtains, pigment clouds, pale hides drifting, bubbles, the last swallow's shadow ----------
    const featherC = mkCanvas(64); { const g = featherC.getContext('2d'); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const ex = Math.min(x, 63 - x) / 20, ey = Math.min(y, 63 - y) / 22, v = Math.round(255 * Math.min(1, ex) * Math.min(1, ey) * Math.min(1, ex) * Math.min(1, ey)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); } }
    const featherT = own(new THREE.CanvasTexture(featherC));
    const curtains = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.2832 + R.range(-0.3, 0.3), r = R.range(6.5, 10.0), g = own(new THREE.PlaneGeometry(R.range(2.5, 4.5), 9, 10, 8));
      const m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ map: curtainT, alphaMap: featherT, color: new THREE.Color(R.pick(['#ffd890', '#ffb8a0', '#b8ffe0', '#ffc8e0', '#c8d8ff'])), transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })));
      m.position.set(HV.x + Math.cos(a) * r, (HV.surf + HV.bottom) / 2 - 0.2, HV.z + Math.sin(a) * r); m.rotation.y = -a + Math.PI / 2 + R.range(-0.4, 0.4);
      uw.add(m); curtains.push({ m, g, base: g.attributes.position.array.slice(), ph: R.range(0, 6.28) });
    }
    const hideRays = [];
    for (let i = 0; i < 3; i++) {
      const g = own(new THREE.PlaneGeometry(3.2, 1.9, 10, 5)), m = new THREE.Mesh(g, own(new THREE.MeshBasicMaterial({ color: ['#e8d0a0', '#e0b880', '#f0e4c8'][i], side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false })));
      { const pa0 = g.attributes.position.array; for (let k = 0; k < pa0.length; k += 3) pa0[k + 1] *= 1 - 0.88 * Math.pow(Math.abs(pa0[k]) / 1.6, 1.5); } g.rotateX(-Math.PI / 2); m.scale.setScalar(0.55); uw.add(m);
      hideRays.push({ m, g, base: g.attributes.position.array.slice(), ph: R.range(0, 6.28), r: R.range(5.0, 7.0), y: R.range(-5.6, -2.2), sp: R.range(0.25, 0.4) * (i % 2 ? 1 : -1) });
    }
    const mkPoints = (n, size, op, blend) => { const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const p = new THREE.Points(g, own(new THREE.PointsMaterial({ map: glowT, size, vertexColors: true, transparent: true, opacity: op, depthWrite: false, blending: blend }))); p.frustumCulled = false; uw.add(p); return p; };
    const cloudN = 50, clouds = mkPoints(cloudN, 6.0, 0.5, THREE.NormalBlending), cl = [];
    for (let i = 0; i < cloudN; i++) { const a = R.range(0, 6.28), r = R.range(3.5, HV.r - 0.8); cl.push({ a, r, y: R.range(-7.5, -0.8), sp: R.range(0.05, 0.14) * (i % 2 ? 1 : -1), c: new THREE.Color(['#4a6ad0', '#f0b030', '#d4552f', '#3fbf8a', '#e0709a'][i % 5]) }); }
    { const ca = clouds.geometry.attributes.color.array; cl.forEach((c, i) => { ca[i * 3] = c.c.r; ca[i * 3 + 1] = c.c.g; ca[i * 3 + 2] = c.c.b; }); }
    const bubN = 90, bubbles = mkPoints(bubN, 0.11, 0.8, THREE.AdditiveBlending), bub = [];
    for (let i = 0; i < bubN; i++) bub.push({ a: R.range(0, 6.28), r: R.range(0, HV.r - 0.5), y0: R.range(-8, 0), sp: R.range(0.3, 0.8) });
    { const ca = bubbles.geometry.attributes.color.array; for (let i = 0; i < bubN; i++) { ca[i * 3] = 0.75; ca[i * 3 + 1] = 0.85; ca[i * 3 + 2] = 1; } }
    const shadow = new THREE.Mesh(own(new THREE.CircleGeometry(0.6, 16)), own(new THREE.MeshBasicMaterial({ map: softT, color: '#0a1430', transparent: true, opacity: 0, depthWrite: false })));
    shadow.rotation.x = Math.PI / 2; shadow.scale.set(1.6, 0.6, 1); uw.add(shadow);
    if (ctx.renderer) { try { await fauna.prewarm(ctx.renderer); } catch (e) { /* only an optimisation */ } }

    const T_SURFACE = (() => { for (let i = 0; i <= 600; i++) { path.pointAt(i / 600, _a); if (_a.y < HV.surf) return (i / 600) * DUR; } return DUR; })();
    let lastT = 0;
    return {
      scene, path, duration: DUR, title: 'The Dye Vats of Fez', ride: 'none', style: 'none', companion: 'none',
      camera: { fov: 64, near: 0.3, nearThrough: 0.5, far: 3000, lookAhead: 10, sway: 0.4, bank: 0.35 },
      pois: [
        { at: [-24, 6.5, 19], from: 3.8 / DUR, to: 6.0 / DUR, weight: 0.55, fade: 0.35 },   // the tannery wall, its balconies and hides
        { at: [90, 45, -120], from: 8.5 / DUR, to: 11.0 / DUR, weight: 0.8, fade: 0.35 },    // the skyline of Fez el-Bali and its minarets
        { at: [30, 15, -16], from: 10.5 / DUR, to: 12.2 / DUR, weight: 0.4, fade: 0.4 },    // the pigeons' roof
        { at: [HV.x, HV.surf, HV.z - 2], from: 14.5 / DUR, to: 16.5 / DUR, weight: 0.7, fade: 0.35 },   // down onto the indigo
      ],
      portal: { shape: 'circle', style: 'ring', radius: 1.6, color: '#ffcf8a', glow: 0.3, halo: true, revealDistance: 700 },
      post: { exposure: 0.85, bloom: { strength: 0.3, radius: 0.45, threshold: 0.95 }, grade: { saturation: 1.06, contrast: 1.05, tint: '#fff4e6', shadowTint: '#3a3048', vignette: 0.2, grain: 0, aberration: 0 } },
      update(dt, t, camera, u) {
        const T = clamp((u || 0) * DUR, 0, DUR);   // seconds of flight; the clock t also runs while the world is only a preview in a portal
        sky.update(dt, t, camera);
        liqMat.uniforms.uTime.value = t;
        causT.offset.set(t * 0.012, -t * 0.02);
        for (const m of mists) m.update(dt, t);
        const cp = camera ? camera.position : _a.set(0, 8, 52);
        const inPit = cp.y < HV.surf && Math.hypot(cp.x - HV.x, cp.z - HV.z) < HV.r + 0.5;
        const E = inPit ? WATER : AIR; scene.fog.color.copy(E.fog); scene.fog.density = E.dens; scene.background.copy(E.bg); sky.object.visible = !inPit;
        uw.visible = inPit || (cp.y < 4 && Math.hypot(cp.x - HV.x, cp.z - HV.z) < HV.r + 8 && T > T_SURFACE - 2);
        fauna.update(dt, t, camera, u);
        // back to the start (a replay): every bird natural again
        if (T < lastT - 0.5) { for (const b of birds) { b.nat = 1; b.target = null; b.dye.set('#3a5aa8'); } for (const e of events) e.done = false; }
        lastT = T;
        for (const e of events) if (!e.done && T >= e.t) { e.done = true; const b = birds[e.bird]; b.target = e.col; if (b.nat > 0.999) b.dye.copy(e.col); }
        // ----- the swallows
        for (let i = 0; i < NB; i++) {
          const b = birds[i];
          swallowPos(b, i, T, t, _p1); swallowPos(b, i, T + 0.05, t + 0.05, _p2); swallowPos(b, i, T + 0.25, t + 0.25, _p3);
          const dc = _p1.distanceTo(cp); if (camera && dc < 4.5) { _d.subVectors(_p1, cp).normalize(); _p1.addScaledVector(_d, 4.5 - dc); _p2.addScaledVector(_d, 4.5 - dc); }
          const vx = (_p2.x - _p1.x) / 0.05, vy = (_p2.y - _p1.y) / 0.05, vz = (_p2.z - _p1.z) / 0.05, hv = Math.hypot(vx, vz) || 1;
          const h1 = Math.atan2(vx, vz); let dh = Math.atan2(_p3.x - _p2.x, _p3.z - _p2.z) - h1; dh = ((dh + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
          // the phase of the pass: glide in, flare, touch, three or four hard flaps up
          let tau = 99; for (const e of b.dips) if (Math.abs(T - e.t) < Math.abs(tau)) tau = T - e.t;
          const burst = Math.sin(t * 1.05 + i * 2.3) + 0.35 * Math.sin(t * 2.7 + i) > 0.15;
          let ampT = burst ? 0.62 : 0.06, dihT = burst ? 0.12 : 0.22, fanT = 0, freq = 11, pitchAdd = 0;
          if (tau > -1.1 && tau < -0.3) { ampT = 0.05; dihT = 0.18; }
          else if (tau >= -0.3 && tau < 0.06) { ampT = 0.1; dihT = 0.75; fanT = 1; pitchAdd = 0.45; }
          else if (tau >= 0.06 && tau < 0.75) { ampT = 0.8; dihT = 0.1; freq = 15; }
          const k = 1 - Math.exp(-dt * 10); b.amp += (ampT - b.amp) * k; b.dih += (dihT - b.dih) * k; b.fan += (fanT - b.fan) * k; b.ph += dt * freq;
          const m = b.mesh; m.position.copy(_p1); m.rotation.y = h1; m.rotation.x = -Math.atan2(vy, hv) * 0.8 - pitchAdd; m.rotation.z = clamp(-dh * 1.6, -0.75, 0.75);
          // wings and tail, bent on the CPU from the kit's own animation weights
          const P = b.g.attributes.position.array, N = b.g.attributes.normal.array, st = Math.sin(b.ph), a1 = b.dih + b.amp * st, a2 = a1 + 0.6 * b.amp * (Math.sin(b.ph - 1.25) - 0.35);
          const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
          for (let v = 0; v < BN; v++) {
            const side = bAnim.getY(v), j = v * 3;
            if (Math.abs(side) > 0.5) {
              const d = bAnim.getX(v), dIn = Math.min(d, WRIST), dOut = Math.max(d - WRIST, 0), sx = basePos[j] - side * d;
              P[j] = sx + side * (c1 * dIn + c2 * dOut); P[j + 1] = basePos[j + 1] + s1 * dIn + s2 * dOut; P[j + 2] = basePos[j + 2];
              const out = d > WRIST, cc = out ? c2 : c1, ss = (out ? s2 : s1) * side, nx = baseNrm[j], ny = baseNrm[j + 1];
              N[j] = nx * cc - ny * ss; N[j + 1] = nx * ss + ny * cc; N[j + 2] = baseNrm[j + 2];
            } else if (bAnim.getW(v) > 0) { const w = bAnim.getW(v); P[j] = basePos[j] * (1 + 0.9 * b.fan * w); P[j + 1] = basePos[j + 1] + 0.02 * b.fan * w; P[j + 2] = basePos[j + 2]; }
          }
          b.g.attributes.position.needsUpdate = true; b.g.attributes.normal.needsUpdate = true;
          // the colour: natural until the first dip, then the vat's exact dye (back a little darker, belly lighter, bill dark)
          if (b.target) { b.dye.lerp(b.target, 1 - Math.exp(-dt * 12)); b.nat = Math.max(0, b.nat - dt / 0.25); }
          const C = b.g.attributes.color.array, n0 = b.nat, dr = b.dye.r, dg = b.dye.g, db = b.dye.b;
          for (let v = 0; v < BN; v++) { const j = v * 3; if (bill[v]) continue; const tn = tone[v]; C[j] = nat[j] * n0 + dr * tn * (1 - n0); C[j + 1] = nat[j + 1] * n0 + dg * tn * (1 - n0); C[j + 2] = nat[j + 2] * n0 + db * tn * (1 - n0); }
          b.g.attributes.color.needsUpdate = true;
          b.mat.emissive.set('#3a5aa8').lerp(b.dye, 1 - n0).multiplyScalar(0.3);
        }
        // ----- the splashes
        let nd = 0;
        fxs.forEach((f, fi) => {
          const e = f.e, tau = T - e.t;
          if (tau < 0 || tau > 6.5) { f.g.visible = false; if (f.bleed) f.bleed.m.material.opacity = 0; return; } f.g.visible = true;
          const rl = e.t < 3.5 ? 3.4 : 2.2; f.rings.forEach((m, k) => { const tk = tau - 0.22 * k; if (tk <= 0 || tk > rl) { m.material.opacity = 0; return; } const s = Math.min(f.maxR, 0.1 + (e.pit ? 1.5 : 0.85) * tk); m.scale.set(s, 1, s); m.material.opacity = (e.t < 3.5 ? 0.85 : 0.6) * (1 - tk / rl); });
          { const s = tau < 0.3 ? 0.5 + 2.2 * (tau / 0.3) : 2.7; f.crown.scale.set(s * (e.pit ? 1.4 : 1), s * (1 - 0.5 * smoothstep(0.2, 0.32, tau)), s * (e.pit ? 1.4 : 1)); f.crown.material.opacity = 0.95 * (1 - smoothstep(e.t < 3.5 ? 0.35 : 0.18, e.t < 3.5 ? 0.55 : 0.32, tau)); }
          { const rise = Math.sin(Math.min(1, tau / 0.35) * Math.PI * 0.5), fall = 1 - smoothstep(0.45, 1.0, tau), h = Math.max(0.01, (e.pit ? 1.3 : 0.8) * rise * fall); f.col.scale.set(e.pit ? 1.4 : 1, h, e.pit ? 1.4 : 1); f.col.material.opacity = 0.55 * fall; }
          { const grow = sm(Math.min(1, tau / 1.4)), bs = 0.2 + (f.maxR * 0.95 - 0.2) * grow; f.bloom.scale.set(bs, 1, bs); f.bloom.rotation.y = f.spin * tau; f.bloom.material.opacity = 0.62 * Math.min(1, tau / 0.35) * (1 - smoothstep(1.4, 5.4, tau)); }
          if (f.bleed) { const tb = tau - 0.7, gr = sm(clamp(tb / 2.6, 0, 1)), s = 0.3 + f.bleed.r * 0.9 * gr; f.bleed.m.scale.set(s, 1, s); f.bleed.m.rotation.y = 0.2 * tb; f.bleed.m.material.opacity = tb > 0 ? 0.7 * Math.min(1, tb / 0.6) * (1 - smoothstep(4.5, 6.5, tau)) : 0;
            if (f.bleed.ch) f.bleed.ch.material.color.set('#4a3020').lerp(e.col, sm(clamp((tau - 0.2) / 0.8, 0, 1)) * 0.85); }
          if (tau < 1.2) for (let k = 0; k < DROPS_PER; k++) { const v = dropV[fi][k], tt = tau; const y = v[1] * tt - 4.9 * tt * tt; if (y < -0.02) continue;
            drops.setMatrixAt(nd, _m.compose(_p.set(e.P.x + v[0] * tt, e.surf + y, e.P.z + v[2] * tt), _q.identity(), _s.setScalar(v[3] * (e.pit ? 1.5 : 1)))); drops.setColorAt(nd, e.col); nd++; }
          for (let k = 0; k < TRAIL; k++) { const ts = 0.06 + k * 0.09, age = tau - ts; if (age < 0 || age > 0.5) continue; dipPoint(e, ts, _p); _p.y -= 4.9 * age * age; _p.addScaledVector(e.dir, 1.5 * age);
            drops.setMatrixAt(nd, _m.compose(_p, _q.identity(), _s.setScalar(1.1 - age))); drops.setColorAt(nd, e.col); nd++; }
        });
        drops.count = nd; if (nd) { drops.instanceMatrix.needsUpdate = true; drops.instanceColor.needsUpdate = true; }
        // ----- under the surface
        if (uw.visible) {
          for (const h of hideRays) {
            const pa = h.g.attributes.position.array, bb = h.base, ang = t * h.sp + h.ph;
            for (let k = 0; k < pa.length; k += 3) pa[k + 1] = bb[k + 1] + 0.32 * Math.sin(bb[k] * 1.7 - t * 2.1 + h.ph);
            h.g.attributes.position.needsUpdate = true; h.m.position.set(HV.x + Math.cos(ang) * h.r, h.y + 0.3 * Math.sin(t * 0.6 + h.ph), HV.z + Math.sin(ang) * h.r); h.m.rotation.y = -ang + Math.PI / 2;
          }
          for (const c of curtains) { const pa = c.g.attributes.position.array, bb = c.base; for (let k = 0; k < pa.length; k += 3) pa[k + 2] = 0.35 * Math.sin(bb[k] * 1.3 + bb[k + 1] * 0.4 + t * 0.7 + c.ph); c.g.attributes.position.needsUpdate = true; }
          const cpA = clouds.geometry.attributes.position.array;
          cl.forEach((c, i) => { const a = c.a + t * c.sp; cpA[i * 3] = HV.x + Math.cos(a) * c.r; cpA[i * 3 + 1] = c.y + 0.5 * Math.sin(t * 0.3 + i); cpA[i * 3 + 2] = HV.z + Math.sin(a) * c.r; });
          clouds.geometry.attributes.position.needsUpdate = true;
          const bpA = bubbles.geometry.attributes.position.array;
          bub.forEach((b, i) => { const y = ((b.y0 + t * b.sp + 8) % 8.2) - 8; bpA[i * 3] = HV.x + Math.cos(b.a + t * 0.1) * b.r; bpA[i * 3 + 1] = y; bpA[i * 3 + 2] = HV.z + Math.sin(b.a + t * 0.1) * b.r; });
          bubbles.geometry.attributes.position.needsUpdate = true;
          // the last swallow's shadow on the surface, seen from below while it is still low over the vat
          const lb = birds[HV_ORDER[HV_ORDER.length - 1]].mesh.position, over = Math.hypot(lb.x - HV.x, lb.z - HV.z) < HV.r - 0.5, hgt = lb.y - HV.surf;
          shadow.position.set(lb.x, HV.surf - 0.04, lb.z); shadow.rotation.z = -birds[HV_ORDER[HV_ORDER.length - 1]].mesh.rotation.y; shadow.material.opacity = over ? 0.45 * (1 - smoothstep(0.5, 6, hgt)) : 0;
        }
      },
      dispose() { if (sky.dispose) sky.dispose(); for (const o of trash) o.dispose && o.dispose(); },
    };
  },
};
