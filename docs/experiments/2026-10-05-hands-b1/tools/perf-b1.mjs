/* v0.61.0 條件 10：由 phase2-mock/hand-variants-b1/tools/perf-b1.mjs 複製，只加 --outdir；量法不動。 */
/* 每幀 CPU（hands.update 含擺位解算＋寫進 three；本機桌機 Chromium，不代表 iPhone；不是 gate）。由 eq-frames.mjs 複製改寫。
   A＝四席批 1 角色、B＝既有三角色＋一般手；A/B 交錯各 3 輪，同一串事件（四席推→拍→揭盅），只統計有手可見的幀。
   原檔頭：逐幀等價（示意開關 ?handb1 預設關時，與 origin/main 4691a7ce 逐幀相等的證據；不是 gate）。
   node eq-frames.mjs --root=<樹> --tag=<名> [--q=handb1=1] [--port=8996]
   844×390＋安全區 47/47/21、newGame('solo',1,['qingmian'])、手動時鐘（每步 1/60 秒）。兩段事件：
     A 四席＝批 1 四角色（青面／紅衣婆婆／斷手書生／組頭）：四席推、四席拍、揭盅；
     B 四席＝既有三角色＋一般手（收驚婆／當鋪／獵人／孝女白琴）：同一串事件。
   每 2 步截一張整頁（含 HUD）算 sha256，並記 hands.stats() 的可見席、每手面數、材質名。輸出 <tag>-frames.json。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import crypto from 'node:crypto';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root), TAG = opt.tag, PORT = Number(opt.port || 8996), W = 844, H = 390, SAFE = [0, 47, 21, 47];
const OUT = opt.outdir ? path.resolve(opt.outdir) : path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'eq'); fs.mkdirSync(OUT, { recursive: true }); // v0.61.0：加 --outdir
const { chromium } = createRequire('C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/package.json')('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser; const errs = [], frames = [];
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q ? '?' + opt.q : ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(([t, r, b, l]) => { const s = document.createElement('style'); s.textContent = `:root{--safe-top:${t}px!important;--safe-right:${r}px!important;--safe-bottom:${b}px!important;--safe-left:${l}px!important}`; document.head.appendChild(s); }, SAFE);
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    const Y = window.__yaoshi3d; await Y.tray.loaded(); await Y.tray.hands.ready();
    Y.tray.props.clearRound(); Y.tray.hands.clear();
    const native = requestAnimationFrame.bind(window); await new Promise(native);
    const queue = []; let id = 0; window.requestAnimationFrame = (cb) => { queue.push(cb); return ++id; };
    await new Promise(native);
    const clock = { now: performance.now(), step(n = 1) { for (let k = 0; k < n; k++) { const cbs = queue.splice(0); if (!cbs.length) throw new Error('rAF queue empty'); clock.now += 1000 / 60; for (const cb of cbs) cb(clock.now); } } };
    window.__eq = { clock, ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })) };
    clock.step(180);
  });
  await page.evaluate(() => { const T = window.__yaoshi3d.tray, u0 = T.hands.update; window.__ht = []; T.hands.update = function (dt) { const t0 = performance.now(); u0.call(this, dt); const v = T.hands.group.children.some((h) => h.visible); if (v) window.__ht.push(performance.now() - t0); }; });
  const res = { A: [], B: [] };
  for (let rep = 0; rep < 3; rep++) for (const [seg, roles] of [['A', ['qingmian', 'hongyi', 'duanshou', 'zutou']], ['B', ['shoujing', 'dangpu', 'hunter', 'xiaonv']]]) {
    const ts = await page.evaluate((roles) => { const T = window.__yaoshi3d.tray, E = window.__eq; T.props.clearRound(); T.hands.clear(); const seats = roles.map((role, id) => ({ id, role })); T.props.setSeats(seats); T.hands.setSeats(seats); E.clock.step(60); window.__ht = [];
      for (let k = 0; k < 4; k++) { for (let s = 0; s < 4; s++) E.ev('ys:bid', { seat: s, slot: (s + k) % 4, amount: 3 + s }); E.clock.step(60); for (let s = 0; s < 4; s++) E.ev('ys:mark', { seat: s, slot: (s + k) % 4 }); E.clock.step(70); E.ev('ys:reveal-result', { slot: k, winner: k }); E.clock.step(60); }
      return window.__ht.slice(); }, roles);
    res[seg].push(...ts);
  }
  const st = (a) => { const s = a.slice().sort((x, y) => x - y); return { n: s.length, mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(3), p95: +s[Math.floor(s.length * 0.95)].toFixed(3), max: +s[s.length - 1].toFixed(3) }; };
  const summary = { A_批1四角色: st(res.A), B_既有三角色加一般手: st(res.B) };
  fs.writeFileSync(path.join(OUT, `${TAG}-perf.json`), JSON.stringify({ root: ROOT, q: opt.q || '', where: '本機桌機 Chromium ANGLE D3D11，未節流；iPhone 未驗', errs, summary }, null, 1));
  console.log(JSON.stringify({ tag: TAG, summary, errs }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
