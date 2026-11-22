// 拍品提前下載的回歸測試（驗收 docs/acceptance/2026-11-21-lot-prefetch.md 條件 8）。
// 起因：製作人 iPhone 慢網路下，進出價頁後牌桌法寶要等十幾到幾十秒才出現（原本到出價頁 pushMarket3d 才開始抓模型）。
// 做法：assets/creatures/*.glb 走一條共用頻寬的假線路（FIFO、RATE 位元組／秒），其餘資源照常；
// 真頁面、固定種子開局 → 翻到第 1 夜拍品上桌 → 在第 1 夜停 N1_MS（真人一夜遠比這久）→ 推進到第 2 夜拍品上桌，
// 斷言第 2 夜拍品推上桌後 1000ms 內，非詛咒品全部 ready 且 visible。
// 鑑別力：main（沒有預載）上同一支要紅——第 2 夜到出價頁才開始抓，等待＝第 2 夜模型總大小 ÷ RATE（數秒）。
// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_PREFETCH_PORT || 9791);
const RATE = 409600; // 400KB/s 原始大小：兩夜各 4 件最大檔 ≈8.8MB 也在 22 秒內抓完，第 1 夜停 20 秒＋推進時間足夠
const N1_MS = 20000;
const SEED = 1;

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

test('拍品提前下載：慢線路下第 2 夜拍品推上桌 1 秒內全部就緒且看得到', { timeout: 240000 }, async () => {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  for (let i = 0; i < 75; i++) {
    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (ok) break; await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await launchGpu(chromium);
  const errs = [];
  let linkFreeAt = 0;
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    await ctx.route(/\/assets\/creatures\/[^?]*\.glb/, async (route) => {
      const u = new URL(route.request().url());
      const body = fs.readFileSync(path.join(SRV_ROOT, decodeURIComponent(u.pathname)));
      const t = Date.now(), end = Math.max(t, linkFreeAt) + body.length / RATE * 1000;
      linkFreeAt = end;
      await new Promise((r) => setTimeout(r, end - t));
      await route.fulfill({ status: 200, contentType: 'model/gltf-binary', body });
    });
    // 頁內記錄器（Codex yaoshi-v0.66.1-r1 F4）：起點在 `ys:market` 派出的當下由 listener 記（不靠輪詢補記，
    // 輪詢被長任務拖住時起點終點會一起晚、把數秒等待算成 0）；同時記下這一批的拍品鍵。終點由 50ms 輪詢記，
    // 而且要桌上的拍品鍵已換成這一批才算——輪詢晚到只會讓等待變長（保守），不會變短。
    await ctx.addInitScript(() => {
      window.__pl = { push: {}, keys: {}, ready: {}, real: {} };
      document.addEventListener('ys:market', (e) => {
        const d = (e && e.detail) || {}, r = Number(d.round) || 0;
        if (r > 0 && !(r in window.__pl.push)) {
          window.__pl.push[r] = performance.now(); // 單調時鐘（Codex r2 F4：系統校時不影響）
          window.__pl.keys[r] = (d.items || []).map((it) => (it && !it.curse ? it.key : null)).filter(Boolean).join(','); // 只比非詛咒品，空格不算
        }
      });
      setInterval(() => {
        const Y = window.__yaoshi3d, P = window.__pl;
        for (const r of Object.keys(P.push)) {
          if (r in P.ready || !(Y && Y.tray && Y.tray.items)) continue;
          const it = Y.tray.items();
          if (it.map((s) => (s.key && !s.curse ? s.key : null)).filter(Boolean).join(',') !== P.keys[r]) continue; // 桌上還不是這一批
          const real = it.filter((s) => s.key && !s.curse);
          P.real[r] = real.length;
          if (real.length > 0 && real.every((s) => s.ready && s.visible)) P.ready[r] = performance.now();
        }
      }, 50);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 30000 });
    await page.waitForFunction('!!window.__yaoshi3d && !!window.__yaoshi3d.tray', { timeout: 60000 });
    await page.evaluate((seed) => { window.__yaoshi.newGame('solo', seed, ['qingmian']); }, SEED);
    const journalRound = () => page.evaluate(() => { const J = window.__ys3dJournal; return J && J.market && J.market.detail ? J.market.detail.round : -1; });
    const advance = async () => {
      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); return { d: !b || !b.offsetParent || b.disabled }; })()`);
      if (!st.d) await page.click('#mainbtn').catch(() => {});
      else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button, button')].find(x=>x.offsetParent&&!x.disabled&&/下一頁|開始|知道了|進入|確定|不盯|繼續|跳過|下一夜|蓋牌|開標/.test(x.innerText)); if(e)e.click(); })()`);
      await page.waitForTimeout(60);
    };
    for (let i = 0; i < 2000 && (await journalRound()) < 1; i++) await advance();
    assert.equal(await journalRound(), 1, '沒走到第 1 夜拍品上桌');
    await page.waitForTimeout(N1_MS);
    for (let i = 0; i < 4000 && (await journalRound()) < 2; i++) await advance();
    assert.equal(await journalRound(), 2, '沒走到第 2 夜拍品上桌');
    for (let i = 0; i < 300; i++) { if (await page.evaluate(() => 2 in window.__pl.ready)) break; await page.waitForTimeout(100); }
    const pl = await page.evaluate(() => window.__pl);
    // 活性：第 2 夜確實有要載模型的拍品（全是詛咒品的話這個測試什麼都沒驗到）
    assert.ok(pl.real[2] > 0, `第 2 夜沒有非詛咒拍品，測試沒行使到預載（real=${pl.real[2]}）`);
    assert.ok(2 in pl.ready, '第 2 夜拍品 30 秒內都沒到齊');
    const wait = pl.ready[2] - pl.push[2];
    assert.ok(wait >= 0 && wait <= 1000, `第 2 夜拍品推上桌後等了 ${Math.round(wait)}ms 才全部就緒（有效區間 0–1000ms）`);
    assert.deepEqual(errs, []);
  } finally { await browser.close(); srv.kill(); }
});
