// 夜戰畫面「靜止幀」主要容器矩形（凍結 p2 #8 夜戰；主對話 2026-09-27 指定：找不隨演出時序變化的量測時點）
// 做法：PW_FX 所有 *_MS 設 1，只把 END_MS（結果行出來之後的停留）設成 10 分鐘 ⇒ 第 1 夜第一場夜戰會停在
// 「三拍演完、勝負行與燒毀行已寫上」的最後一幀；再等動畫跑完、字型載完才量。solo seed 3 第 1 夜（各版同一局）。
// 量 #duel 根＋直接子元素＋#duelArena 直接子元素（與 visual-polish-probe __p2.rects 同定義），V1（852×393，瀏海 59/21）。
// 用法：node tests/tools/duel-still-rects.mjs --ref <git ref|WORKTREE> [--runs 5] [--out <json>] [--port 9681]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const REF = arg('--ref', 'WORKTREE'), RUNS = Number(arg('--runs', 5)), OUT = arg('--out', null), PORT = Number(arg('--port', 9681));
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.m4a': 'audio/mp4' };
const cache = new Map();
const fromRef = (p) => { if (!cache.has(p)) { let b = null; try { b = execFileSync('git', ['show', `${REF}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} cache.set(p, b); } return cache.get(p); };
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const RECTS = () => {
  const R = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((v) => +v.toFixed(1)); };
  const vis = (e) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const o = {};
  for (const s of ['#duel', '#duelArena']) {
    const r = document.querySelector(s); if (!r || !vis(r)) continue; o[s] = R(r); const seen = {};
    for (const c of r.children) { if (!vis(c)) continue; const q = c.getBoundingClientRect(); if (q.width < 1 || q.height < 1) continue;
      const k = c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (typeof c.className === 'string' && c.className.trim() ? '.' + c.className.trim().split(/\s+/).filter((x) => !/^(on|shake|anim-.*)$/.test(x)).sort().join('.') : '');
      seen[k] = (seen[k] || 0) + 1; o[s + ' > ' + k + ':' + seen[k]] = R(c); }
  }
  return o;
};
const runs = [];
try {
  for (let n = 0; n < RUNS; n++) {
    const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} document.addEventListener('DOMContentLoaded', () => { const e = document.createElement('style'); e.textContent = ':root{--safe-top:0px!important;--safe-right:59px!important;--safe-bottom:21px!important;--safe-left:59px!important}'; document.head.appendChild(e); }); });
    if (REF !== 'WORKTREE') await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => { const u = new URL(route.request().url()); const p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname); const b = fromRef(p); return b ? route.fulfill({ status: 200, body: b, contentType: CT[path.extname(p)] || 'application/octet-stream' }) : route.continue(); });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { timeout: 120000 }); await page.waitForFunction('typeof window.__yaoshi==="object"');
    await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; F.END_MS = 600000; });
    await page.evaluate(() => startEntry('solo')); await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on'), null, { timeout: 60000 });
    await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click()); await page.waitForTimeout(100);
    await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
    let still = false;
    for (let i = 0; i < 20000 && !still; i++) {
      await page.waitForTimeout(10);
      still = await page.evaluate(() => { const d = document.getElementById('duel'); return getComputedStyle(d).display !== 'none' && d.classList.contains('on') && /勝|勢均力敵/.test(document.getElementById('duelResult').textContent); });
      if (still) break;
      await page.evaluate(() => { const b = document.getElementById('mainbtn'); if (b && !b.disabled) { b.click(); return; } const m = document.getElementById('modal'); if (m && getComputedStyle(m).display !== 'none') { const k = document.getElementById('titheKeep'); if (k) { k.click(); return; } const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return; } } const els = [...document.querySelectorAll('#stage button')]; const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled); if (sb) sb.click(); });
    }
    /* 靜止：動畫全跑完、字型載完（連三次） */
    for (let i = 0; i < 3; i++) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700); }
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || (a.effect && a.effect.getComputedTiming().iterations === Infinity)), null, { timeout: 30000 }).catch(() => {});
    const a = await page.evaluate(RECTS); await page.waitForTimeout(500); const b = await page.evaluate(RECTS);
    const text = await page.evaluate(() => ({ round: window.__yaoshi.S.round, res: document.getElementById('duelResult').innerText, sub: document.getElementById('duelSub').innerText, beat: document.getElementById('duelBeat').innerText }));
    runs.push({ still, rects: a, selfStable: JSON.stringify(a) === JSON.stringify(b), text, errs });
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
const out = { ref: REF, runs };
if (OUT) fs.writeFileSync(path.resolve(OUT), JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify(runs.map((r) => ({ still: r.still, selfStable: r.selfStable, text: r.text, errs: r.errs.length, keys: Object.keys(r.rects).length }))));
