// 其餘畫面只換皮（凍結 docs/experiments/2026-09-26-acceptance-visual-polish-p2.md #8）的決定性對照治具
// 為什麼另寫一支：visual-polish-probe 是 UI 驅動整局，同一版連跑兩次在第 3 夜前後就會分岔（本卷實測，基準自己也一樣），
// 回顧／局末的內容（歷史、名次、壽命）隨之不同，容器高度自然不同——那不是換皮造成的差。
// 這裡讓基準與改後看「同一份內容」：
//   選角（solo 第一張角色卡點下去）、夜行錄選單、第 1 章引言卡：本來就是固定內容；
//   局末、本局回顧：用引擎的 simulate(seed)（headless 同一條結算，trace-eq 的同一支）把整局跑完，再叫 endGame()／showReview() 畫出來；
//   夜戰：沿用 visual-polish-probe 的格（版面不隨內容變）。
// 每個畫面取「根＋直接子元素」矩形（與 visual-polish-probe 的 __p2.rects 同一個定義），V1，基準與改後逐鍵比最大差。
// 用法：node tests/tools/skin-rects-probe.mjs [--base 14ac1f2] [--seed 3] [--out <json>] [--shots <dir>] [--port 9671]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', '14ac1f2'), SEED = Number(arg('--seed', 3)), OUT = arg('--out', null), SHOTS = arg('--shots', null), PORT = Number(arg('--port', 9671));
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.m4a': 'audio/mp4' };
const cache = new Map();
const fromBase = (p) => { if (!cache.has(p)) { let b = null; try { b = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} cache.set(p, b); } return cache.get(p); };
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const RECTS = (roots) => {
  const R = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((v) => +v.toFixed(1)); };
  const vis = (e) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const o = {};
  for (const s of roots) {
    const r = document.querySelector(s); if (!r || !vis(r)) continue;
    o[s] = R(r); const seen = {};
    for (const c of r.children) {
      if (!vis(c)) continue; const q = c.getBoundingClientRect(); if (q.width < 1 || q.height < 1) continue;
      const k = c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (typeof c.className === 'string' && c.className.trim() ? '.' + c.className.trim().split(/\s+/).sort().join('.') : '');
      seen[k] = (seen[k] || 0) + 1; o[s + ' > ' + k + ':' + seen[k]] = R(c);
    }
  }
  return o;
};
async function run(useBase) {
  const tag = useBase ? 'base' : 'head';
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} document.addEventListener('DOMContentLoaded', () => { const e = document.createElement('style'); e.textContent = ':root{--safe-top:0px!important;--safe-right:59px!important;--safe-bottom:21px!important;--safe-left:59px!important}'; document.head.appendChild(e); }); });
  if (useBase) await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => { const u = new URL(route.request().url()); const p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname); const b = fromBase(p); return b ? route.fulfill({ status: 200, body: b, contentType: CT[path.extname(p)] || 'application/octet-stream' }) : route.continue(); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${tag}-${n}-V1.png`) }); };
  /* 量之前等字型：Google Fonts 的中文字型按用到的字分片下載，新畫面用到新字時會先用後備字排一次版、字檔到了再重排 */
  const settle = async () => { for (let i = 0; i < 3; i++) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400); } };
  const res = {};
  const load = async (q = '') => { await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`); await page.waitForFunction('typeof window.__yaoshi==="object"'); await page.waitForTimeout(1500); await page.evaluate(() => document.fonts.ready); };
  await load();
  await page.evaluate(() => startEntry('solo')); await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on')); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click()); await page.waitForTimeout(300);
  await settle(); res.select = await page.evaluate(RECTS, ['#selectScr']); await shot('select');
  await load('?nwall=1');
  await page.evaluate(() => startEntry('nightwalk')); await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'menu'); await page.waitForTimeout(300);
  await settle(); res['nw-menu'] = await page.evaluate(RECTS, ['#nwScr']); await shot('nw-menu');
  await page.evaluate(() => document.querySelector('#nwScr .nwCard[data-ch="1"] .nwBtns button').click()); await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'intro'); await page.waitForTimeout(300);
  await settle(); res['nw-intro'] = await page.evaluate(RECTS, ['#nwScr']); await shot('nw-intro');
  await load();
  await page.evaluate(async () => { try { await preloadArt(); } catch (e) {} });   /* 與正式流程相同：開局前頭像 SVG 已抓齊（否則頭像退回 emoji） */
  await page.evaluate((sd) => { CFG.T = 1; window.__yaoshi.simulate(sd); document.getElementById('titleScr').style.display = 'none'; document.getElementById('table').classList.add('on'); endGame(); }, SEED);
  await page.waitForTimeout(1500);
  await settle(); res.end = await page.evaluate(RECTS, ['#stage > .stageCard', '#south', '#felt', '#north']); await shot('end');
  res.endText = await page.evaluate(() => document.querySelector('#stage > .stageCard').innerText.replace(/\s+/g, ' ').slice(0, 160));
  await page.evaluate(() => showReview()); await page.waitForTimeout(800); await settle();
  res.review = await page.evaluate(RECTS, ['#review', '#reviewbox']); await shot('review');
  res.reviewText = await page.evaluate(() => document.getElementById('reviewbox').innerText.replace(/\s+/g, ' ').length);
  await ctx.close();
  return { res, errs };
}
let base, head;
try { base = await run(true); head = await run(false); } finally { await browser.close(); srv.kill(); }
const cmp = {};
for (const scr of ['select', 'nw-menu', 'nw-intro', 'end', 'review']) {
  const b = base.res[scr], h = head.res[scr], rows = []; let max = 0;
  for (const [k, br] of Object.entries(b)) { const hr = h[k]; if (!hr) { rows.push({ k, only: 'base' }); continue; } const d = Math.max(...br.map((x, i) => Math.abs(x - hr[i]))); max = Math.max(max, d); if (d > 2) rows.push({ k, d: +d.toFixed(1), base: br, head: hr }); }
  for (const k of Object.keys(h)) if (!b[k]) rows.push({ k, only: 'head' });
  cmp[scr] = { keys: Object.keys(b).length, maxDelta: +max.toFixed(1), over2: rows };
}
const out = { base: BASE, seed: SEED, sameContent: { end: base.res.endText === head.res.endText.replace(/\s+/g, ' '), reviewTextLen: [base.res.reviewText, head.res.reviewText] }, cmp, errs: { base: base.errs, head: head.errs }, raw: { base: base.res, head: head.res } };
if (OUT) fs.writeFileSync(path.resolve(OUT), JSON.stringify(out, null, 1), 'utf8');
const { raw, ...brief } = out;
console.log(JSON.stringify(brief, null, 1));
