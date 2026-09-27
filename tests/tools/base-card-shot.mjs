// #6 對照用：對基準 5dfa1b1 開一張拍品卡，存 V1 全頁截圖（示範使用者截圖回報的「卡蓋住法寶」原況）。
// 用法：node tests/tools/base-card-shot.mjs <sha> <out.png>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const [SHA, OUTFILE] = process.argv.slice(2);
const PORT = 9690;

const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const cache = new Map();
function fromBase(p) {
  const rel = p.replace(/^\//, '');
  if (cache.has(rel)) return cache.get(rel);
  let buf = null;
  try { buf = execFileSync('git', ['show', `${SHA}:${rel}`], { cwd: ROOT, maxBuffer: 1024 * 1024 * 50 }); } catch (e) { buf = null; }
  cache.set(rel, buf);
  return buf;
}

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => {
  const u = new URL(route.request().url()); const raw = decodeURIComponent(u.pathname), p = raw === '/' ? '/index.html' : raw;
  const buf = fromBase(p);
  if (buf) return route.fulfill({ status: 200, body: buf, contentType: CT[path.extname(p)] || 'application/octet-stream' });
  return route.continue();
});
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.__yaoshi === 'object', null, { timeout: 30000 });
await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
await page.evaluate(() => startEntry('solo'));
await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
await page.waitForTimeout(80);
await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [3, 'solo']);
await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
// 驅動到 bid
for (let i = 0; i < 3000; i++) {
  await page.waitForTimeout(8);
  const b = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return b ? { t: b.textContent, dis: b.disabled } : null; });
  if (b && /^蓋牌/.test(b.t) && !b.dis) break;
  await page.evaluate(() => { const b = document.getElementById('mainbtn'); if (b && !b.disabled) { b.click(); return; } const m = document.getElementById('modal'); if (m && getComputedStyle(m).display !== 'none') { const k = document.getElementById('titheKeep'); if (k) k.click(); } });
}
await page.waitForTimeout(300);
const tab = await page.evaluate(() => { const b = document.querySelector('.railTabs button'); if (!b) return null; return { rail: b.closest('.rail').id, slot: b.dataset.slot }; });
if (tab) {
  await page.evaluate(([r, s]) => document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]').click(), [tab.rail, tab.slot]);
  await page.waitForTimeout(500);
}
fs.writeFileSync(OUTFILE, await page.screenshot());
console.log('寫入', OUTFILE, 'tab=', JSON.stringify(tab));
await browser.close();
srv.kill();
