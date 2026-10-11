// v0.66.0 整合層驗收（凍結檔 docs/experiments/2026-10-12-release-066/acceptance.md 條②）。
// 六條分支各自驗過自己的元件；這裡量「合在一起之後」新元件彼此、以及與 3D 拍品／座位卡／主鈕有沒有疊在一起。
// http.server＋Playwright Chromium 開真的 index.html，一次只開一個瀏覽器。
// 三尺寸 844×390、667×375、932×430；每尺寸一局 solo：
//   夜 1 盯上頁（#h1hint、.wishchip）→ 真實 pickMark(1) → 夜 1 出價頁（等心願標籤自動展開浮層自己收回後量收合態；
//   以 openSheet→改金額→closeSheet 在每一格下標，產生 .tabbid；盯上的格產生 .tabmark）→ 開鑑賞頁量卷軸鈕 .asc-act
//   → 以既有治具 DRIVE_STEP（appraise-c-lib）真實流程逐夜推進到夜 7 出價頁（斷言 S.round===7 且 nightRule 為押寶夜）
//   量收合的 .stakebar。
// 判準：新元件存在（缺任一＝紅）；新元件外框兩兩交集面積 0；任一新元件與 3D 拍品外框（tray.bboxScreen）、座位卡、主鈕交集 0。
//   卷軸鈕所在的鑑賞頁本就把拍品推近，對它只量座位卡與主鈕（凍結檔已註明）。
// 環境：YAOSHI_RENDER_ROOT（對舊版跑同一份）、YAOSHI_SHOT_DIR（有設就存截圖）、YAOSHI_PW_ROOT、I066_VPS（預設 A,B,C）、I066_OUT（量測 JSON 輸出目錄）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DRIVE_STEP, scr, driveToFirst, waitTrayReady, waitSettled } from './tools/appraise-c-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.I066_PORT || 9766);
const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
const OUT_DIR = process.env.I066_OUT || '';
const ALL = { A: [844, 390], B: [667, 375], C: [932, 430] };
const VPS = (process.env.I066_VPS || 'A,B,C').split(',');

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

/* 頁內量測：sels＝要量的新元件（名稱→選擇器）；回傳可見者外框、3D 拍品外框、座位卡、主鈕 */
const MEAS = (sels) => {
  const vis = (e) => { if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    for (let p = e; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return null; }
    const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return null; return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const els = [];
  for (const [name, sel] of Object.entries(sels)) {
    [...document.querySelectorAll(sel)].forEach((e, k) => { const r = vis(e); if (r) els.push({ name: name + (k ? '#' + k : ''), kind: name, rect: r, text: (e.textContent || '').trim().slice(0, 30) }); });
  }
  const lots = []; const Y3 = window.__yaoshi3d, n = window.__yaoshi.S.market.length;
  for (let i = 0; i < n; i++) { const b = Y3 && Y3.tray && Y3.tray.bboxScreen(i); if (b) lots.push({ name: 'lot' + i, rect: { l: b.left, t: b.top, r: b.right, b: b.bottom } }); }
  const fixed = [];
  for (const id of ['westSeat', 'northSeat', 'eastSeat', 'mainbtn']) { const r = vis(document.getElementById(id)); if (r) fixed.push({ name: id, rect: r }); }
  const S = window.__yaoshi.S;
  return { round: S.round, rule: S.nightRule ? S.nightRule.id : null, els, lots, fixed, open: !!document.querySelector('.wishchip.open') };
};

const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
/** 兩兩交集＋對拍品／座位卡／主鈕交集；withLots=false 時不量拍品 */
function overlaps(m, withLots = true) {
  const hits = [];
  for (let i = 0; i < m.els.length; i++) for (let j = i + 1; j < m.els.length; j++) {
    const a = inter(m.els[i].rect, m.els[j].rect); if (a > 0) hits.push(`${m.els[i].name}×${m.els[j].name}=${a.toFixed(2)}`);
  }
  for (const e of m.els) for (const f of [...(withLots ? m.lots : []), ...m.fixed]) {
    const a = inter(e.rect, f.rect); if (a > 0) hits.push(`${e.name}×${f.name}=${a.toFixed(2)}`);
  }
  return hits;
}
const kinds = (m) => new Set(m.els.map((e) => e.kind));

async function withGame(size, fn) {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  for (let i = 0; i < 75; i++) {
    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (ok) break; await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; if (F) for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
    /* 找一顆「夜 7 是押寶夜」的種子（S.ruleOrder 由種子決定；RULE_NIGHTS=[3,7]，第 2 個就是夜 7） */
    const seed = await page.evaluate(() => {
      for (let s = 1; s < 400; s++) { window.__yaoshi.newGame('solo', s, ['qingmian']); const S = window.__yaoshi.S; if (S.ruleOrder && S.ruleOrder[CFG.RULE_NIGHTS.indexOf(7)] === 'yabao') return s; }
      return null;
    });
    assert.ok(seed, '找不到夜 7 為押寶夜的種子（前提不成立）');
    await page.evaluate((s) => window.__yaoshi.newGame('solo', s, ['qingmian']), seed);
    await fn(page, errs, seed);
  } finally { await browser.close(); srv.kill(); }
}

const NEW1 = { h1hint: '#h1hint', wishchip: '#feltHead .wishchip', tabbid: '.railTabs .tabbid', tabmark: '.railTabs .tabmark', stakebar: '.stakebar.collapsed', scrollbtn: '.asc .asc-act' };
const record = {};

for (const key of VPS) {
  const size = ALL[key];
  test(`I066 ${size.join('×')}：夜1 盯上／出價／鑑賞、夜7 押寶夜——新元件存在且彼此、與拍品／座位卡／主鈕交集為 0`, { timeout: 600000 }, async () => {
    await withGame(size, async (page, errs, seed) => {
      const rec = record[key] = { seed };
      /* ── 夜 1 盯上頁 ── */
      const c1 = await driveToFirst(page, new Set(['mark', 'bid']), 6000);
      assert.equal(c1, 'mark', '夜 1 沒先到盯上頁：' + c1);
      await waitTrayReady(page); await waitSettled(page); await page.waitForTimeout(1200);
      const mMark = await page.evaluate(MEAS, NEW1);
      rec.mark = mMark;
      if (SHOT_DIR && key === 'A') await page.screenshot({ path: path.join(SHOT_DIR, 'A-n1-mark.png') });
      const kMark = kinds(mMark);
      assert.ok(kMark.has('h1hint'), '夜 1 盯上頁沒有可見的 #h1hint（元件缺失）');
      assert.ok(kMark.has('wishchip'), '夜 1 盯上頁沒有可見的心願標籤 .wishchip（元件缺失）');
      assert.equal(mMark.round, 1);
      /* ── 真實盯上 slot 1 → 夜 1 出價頁 ── */
      await page.evaluate(() => pickMark(1));
      await page.waitForTimeout(500);
      for (let i = 0; i < 300 && (await scr(page)) !== 'bid'; i++) await page.waitForTimeout(20);
      assert.equal(await scr(page), 'bid', '盯上後沒到出價頁');
      /* 自動展開浮層：等它自己收回（≤6 秒）再量收合態 */
      const autoOpened = await page.evaluate(() => !!document.querySelector('.wishchip.open'));
      rec.autoOpened = autoOpened;
      await page.waitForFunction(() => !document.querySelector('.wishchip.open'), null, { timeout: 7000 }).catch(() => {});
      /* 每一格下標（openSheet→改金額→closeSheet，真實路徑），產生 .tabbid */
      const nLots = await page.evaluate(() => S.market.length);
      for (let i = 0; i < nLots; i++) { await page.evaluate((k) => { openSheet(k); myBids[k].amt = 1; closeSheet(); }, i); await page.waitForTimeout(150); }
      await waitSettled(page); await page.waitForTimeout(1200);
      await page.waitForFunction(() => !document.querySelector('.wishchip.open'), null, { timeout: 7000 }).catch(() => {});
      const mBid = await page.evaluate(MEAS, NEW1);
      rec.bid = mBid;
      if (SHOT_DIR && key === 'A') await page.screenshot({ path: path.join(SHOT_DIR, 'A-n1-bid.png') });
      const kBid = kinds(mBid);
      assert.ok(kBid.has('h1hint'), '夜 1 出價頁沒有可見的 #h1hint（元件缺失）');
      assert.ok(kBid.has('wishchip'), '夜 1 出價頁沒有可見的心願標籤（元件缺失）');
      assert.equal(mBid.open, false, '心願浮層 7 秒內沒有自己收回');
      assert.equal(mBid.els.filter((e) => e.kind === 'tabbid').length, nLots, `出價標記數 ≠ 拍品數 ${nLots}（元件缺失）`);
      assert.equal(mBid.els.filter((e) => e.kind === 'tabmark').length, 1, '盯上標記不是 1 個（元件缺失）');
      /* ── 鑑賞頁：卷軸鈕 ── */
      const t = await page.evaluate(() => { const b = document.querySelector('.railTabs button'); return b ? { rail: b.closest('.rail').id, slot: Number(b.dataset.slot) } : null; });
      await page.evaluate(([r, s]) => railTabClick(r, s), [t.rail, t.slot]);
      await page.waitForTimeout(2600);
      const mAppr = await page.evaluate(MEAS, NEW1);
      rec.appr = mAppr;
      assert.ok(kinds(mAppr).has('scrollbtn'), '鑑賞頁沒有卷軸鈕 .asc-act（元件缺失）');
      await page.evaluate(() => closeAppraise()); await page.waitForTimeout(600);
      /* ── 以 DRIVE_STEP 真實流程推進到夜 7 出價頁 ── */
      let reached = false;
      for (let i = 0; i < 40000; i++) {
        const st = await page.evaluate(() => ({ r: window.__yaoshi.S.round }));
        const c = await scr(page);
        if (st.r === 7 && c === 'bid') { reached = true; break; }
        if (st.r > 7) break;
        const r = await page.evaluate(DRIVE_STEP);
        if (r === 2) break;
        await page.waitForTimeout(8);
      }
      assert.ok(reached, '沒推進到夜 7 出價頁');
      await waitTrayReady(page); await waitSettled(page); await page.waitForTimeout(1200);
      await page.waitForFunction(() => !document.querySelector('.wishchip.open'), null, { timeout: 7000 }).catch(() => {});
      const mYb = await page.evaluate(MEAS, NEW1);
      rec.yabao = mYb;
      if (SHOT_DIR && key === 'A') await page.screenshot({ path: path.join(SHOT_DIR, 'A-n7-yabao-bid.png') });
      assert.equal(mYb.round, 7); assert.equal(mYb.rule, 'yabao', '夜 7 不是押寶夜：' + mYb.rule);
      assert.ok(kinds(mYb).has('stakebar'), '押寶夜沒有收合的 .stakebar（元件缺失）');
      assert.ok(!kinds(mYb).has('h1hint'), '夜 7 仍顯示 #h1hint');
      /* ── 交集 ── */
      rec.hits = { mark: overlaps(mMark), bid: overlaps(mBid), appr: overlaps(mAppr, false), yabao: overlaps(mYb) };
      if (OUT_DIR) fs.writeFileSync(path.join(OUT_DIR, `integration-066-${key}.json`), JSON.stringify(rec, null, 1));
      assert.deepEqual(rec.hits.mark, [], '夜 1 盯上頁交集：' + rec.hits.mark.join('；'));
      assert.deepEqual(rec.hits.bid, [], '夜 1 出價頁交集：' + rec.hits.bid.join('；'));
      assert.deepEqual(rec.hits.appr, [], '鑑賞頁交集：' + rec.hits.appr.join('；'));
      assert.deepEqual(rec.hits.yabao, [], '押寶夜出價頁交集：' + rec.hits.yabao.join('；'));
      assert.deepEqual(errs, [], 'pageerror：' + errs.join('；'));
    });
  });
}
