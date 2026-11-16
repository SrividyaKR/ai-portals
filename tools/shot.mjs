// Frames of one world for review, in 9:16 (1080x1920), from the installed Chrome running headless. No packages needed.
// Usage: node tools/shot.mjs <worldId> <outDir> [t1,t2,...] [debugPort]
//   BASE=http://localhost:8090 (the server to load from)   SEED=7 (the tour's seed)
// Writes <outDir>/<worldId>-<tt>.png for each time (seconds after the world appears), <worldId>-sheet.jpg (all frames in one
// row, for a judge to read as one image), <worldId>-console.txt (errors and warnings), and prints per frame the mean
// brightness and the share of pixels above 0.85, the eye-comfort numbers the review asks for.
import { spawn, spawnSync } from 'node:child_process'; import path from 'node:path'; import fs from 'node:fs';
const [world, outDir, times = '0.5,1.5,3,6,9,12,15,18', port = '9334'] = process.argv.slice(2);
if (!world || !outDir) { console.error('usage: node tools/shot.mjs <worldId> <outDir> [t1,t2,...] [debugPort]'); process.exit(1); }
const BASE = (process.env.BASE || 'http://localhost:8090').replace(/\/$/, ''), SEED = process.env.SEED || '7';
fs.mkdirSync(outDir, { recursive: true });
const prof = path.join(outDir, '.chrome-' + port); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1080,1920', '--hide-scrollbars', '--mute-audio',
  '--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = async (code) => {
  try { chrome.kill(); } catch (e) {}
  for (let i = 0; i < 20; i++) { await sleep(250); try { fs.rmSync(prof, { recursive: true, force: true }); break; } catch (e) { /* Chrome still closing its profile */ } }
  process.exit(code);
};
let targets; for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch (e) {} await sleep(200); }
const page = targets && targets.find((t) => t.type === 'page'); if (!page) { console.error('Chrome did not start'); done(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const logs = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 400)); else if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) logs.push(d.params.type + ' ' + d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400)); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `${BASE}/?world=${encodeURIComponent(world)}&end=1&seed=${SEED}` });
// the world has appeared once the engine has it as the current world (the dark antechamber comes first)
let t0 = 0; for (let i = 0; i < 480; i++) { await sleep(250); if (await ev(`(() => { const e = window.__engine; const c = e && e.cur; return !!(c && c.def && c.def.id === ${JSON.stringify(world)}); })()`)) { t0 = Date.now(); break; } }
if (!t0) { console.error('the world never appeared within 120 s'); fs.writeFileSync(path.join(outDir, `${world}-console.txt`), logs.join('\n')); done(1); }
const files = [];
for (const t of times.split(',').map(Number)) {
  const wait = t0 + t * 1000 - Date.now(); if (wait > 0) await sleep(wait);
  const shot = await send('Page.captureScreenshot', { format: 'png' }); const f = path.join(outDir, `${world}-${String(t).replace('.', '_').padStart(4, '0')}.png`);
  fs.writeFileSync(f, Buffer.from(shot.result.data, 'base64')); files.push([t, f]);
}
fs.writeFileSync(path.join(outDir, `${world}-console.txt`), logs.join('\n'));
ws.close();
// brightness: mean luminance (0-1) and share of pixels above 0.85, from a downscaled grey copy
for (const [t, f] of files) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=270:480,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  const px = r.stdout; let sum = 0, hi = 0; for (const v of px) { sum += v; if (v > 217) hi++; }
  console.log(`t=${t}s mean=${(sum / px.length / 255).toFixed(3)} above0.85=${(hi / px.length).toFixed(3)}`);
}
// one sheet, all frames in a row at 270x480 each, left to right in the order of the times given (printed below)
const inputs = files.flatMap(([, f]) => ['-i', f]);
const parts = files.map((_, i) => `[${i}:v]scale=270:480[f${i}]`).join(';');
const sheet = path.join(outDir, `${world}-sheet.jpg`);
const s = spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${parts};${files.map((_, i) => `[f${i}]`).join('')}hstack=inputs=${files.length}`, '-q:v', '4', sheet]);
console.log(s.status === 0 ? `sheet ${sheet} (left to right: ${files.map(([t]) => t + 's').join(', ')})` : 'sheet failed: ' + s.stderr.toString().slice(0, 300));
console.log(`console messages: ${logs.length}${logs.length ? ' (see ' + world + '-console.txt)' : ''}`);
done(0);
