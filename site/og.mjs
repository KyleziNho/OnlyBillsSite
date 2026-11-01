// Renders a 1200×630 share image for every article, tutorial and tool into static/og/.
// Needs Google Chrome installed. Run after adding content:  node --experimental-websocket og.mjs
// (Node 22+ doesn't need the flag.) Then run build.mjs, which uses static/og/<slug>.jpg when present.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'static/og');
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2).find((a) => !a.startsWith('--')); // optional slug
const force = process.argv.includes('--force');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const front = (src) => Object.fromEntries((src.match(/^---\n([\s\S]*?)\n---/)?.[1] || '').split('\n')
  .map((l) => l.match(/^([A-Za-z]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));

const jobs = [];
for (const dir of ['blog', 'how-to']) {
  const d = path.join(HERE, 'content', dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.md'))) {
    const fm = front(fs.readFileSync(path.join(d, f), 'utf8'));
    jobs.push({ slug: f.replace(/\.md$/, ''), title: fm.title, kicker: dir === 'how-to' ? 'Tutorial' : fm.category || 'Article', art: fm.art || 'receipts' });
  }
}
for (const [slug, title, art] of [
  ['split-bill-calculator', 'Split the bill calculator', 'claim'],
  ['overpay-calculator', 'How much does splitting equally cost you?', 'receipts'],
  ['tip-calculator', 'Tip and service charge calculator', 'paid'],
  ['service-charge-calculator', 'Service charge calculator', 'receipts'],
  ['settle-up-calculator', 'Who owes who calculator', 'payout'],
]) jobs.push({ slug: 'tool-' + slug, title, kicker: 'Free tool', art });
jobs.push({ slug: 'vs-splitwise', title: 'Same dinner, for free. No Splitwise Pro needed.', kicker: 'OnlyBills vs Splitwise', art: 'paid' });

const todo = jobs.filter((j) => (!only || j.slug === only) && (force || only || !fs.existsSync(path.join(OUT, j.slug + '.jpg'))));
if (!todo.length) { console.log('All share images exist. Use --force to redo them.'); process.exit(0); }

const page = (j) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;background:#f2f2f7;color:#000;position:relative}
.wash{position:absolute;inset:0;background:radial-gradient(900px 520px at 85% 40%,rgba(69,149,255,.28),transparent 70%),radial-gradient(700px 400px at 0% 0%,rgba(69,149,255,.12),transparent 70%)}
.card{position:absolute;left:64px;top:64px;bottom:64px;width:700px;display:flex;flex-direction:column;justify-content:center;gap:22px}
.k{font-size:26px;font-weight:600;color:#0a66d6}
h1{font-size:${j.title.length > 52 ? 54 : j.title.length > 36 ? 62 : 72}px;line-height:1.05;letter-spacing:-0.035em;font-weight:700;text-wrap:balance}
.brand{position:absolute;left:64px;bottom:56px;display:flex;align-items:center;gap:14px;font-size:26px;font-weight:600}
.brand img{width:48px;height:48px;border-radius:12px;box-shadow:0 0 0 1px rgba(0,0,0,.08)}
.brand span{color:rgba(60,60,67,.7);font-weight:500}
.art{position:absolute;right:40px;top:50%;width:400px;height:400px;transform:translateY(-50%);filter:drop-shadow(0 30px 40px rgba(30,70,140,.18))}
</style></head><body><div class="wash"></div>
<div class="card"><div class="k">${esc(j.kicker)}</div><h1>${esc(j.title)}</h1></div>
<img class="art" src="/assets/art/${esc(j.art)}.webp">
<div class="brand"><img src="/assets/img/app-icon-128.png">OnlyBills <span>· onlybills.app</span></div>
</body></html>`;

// Tiny static server over the repo root, plus /__og/<slug> pages.
const types = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u.startsWith('/__og/')) {
    const j = jobs.find((x) => x.slug === u.slice(6));
    res.writeHead(j ? 200 : 404, { 'content-type': 'text/html' }); return res.end(j ? page(j) : '');
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.on('listening', r));
const port = server.address().port;

const dbg = 9700 + Math.floor(Math.random() * 200);
const prof = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'og-chrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const done = (code) => { try { chrome.kill('SIGKILL'); } catch {} server.close(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(code); }, 300); };
setTimeout(() => { console.error('Timed out'); done(2); }, 30000 + todo.length * 4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  try { const t = (await (await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find((x) => x.type === 'page'); if (t) ws = new WebSocket(t.webSocketDebuggerUrl); } catch {}
  if (!ws) await sleep(200);
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const wait = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); wait.get(m.id)?.(m); wait.delete(m.id); });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
for (const j of todo) {
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/__og/${j.slug}` });
  await sleep(700);
  const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 86, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  fs.writeFileSync(path.join(OUT, j.slug + '.jpg'), Buffer.from(s.result.data, 'base64'));
  console.log('og', j.slug);
}
done(0);
