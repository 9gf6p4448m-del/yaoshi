// v0.66.0 整合層驗收（凍結檔 docs/experiments/2026-10-12-release-066/acceptance.md 條②，含整合修訂 2）。
// 六條分支各自驗過自己的元件；這裡量「合在一起之後」新元件彼此、以及與 3D 拍品／座位卡／主鈕有沒有疊在一起。
// 一次只開一個瀏覽器。三尺寸 844×390、667×375、932×430；每尺寸同一流程跑兩次——先 origin/main（基準，git 物件直出），再受測版：
//   夜 1 盯上頁 → 真實 pickMark(1) → 夜 1 出價頁（等心願標籤自動展開浮層自己收回後量收合態；以 openSheet→改金額→closeSheet
//   在每一格下標，產生 .tabbid；盯上的格產生 .tabmark）→ 開鑑賞頁量卷軸鈕 .asc-act
//   → 以既有治具 DRIVE_STEP（appraise-c-lib）真實流程逐夜推進到夜 7 出價頁（斷言 S.round===7 且 nightRule 為押寶夜）量收合的 .stakebar。
// 判準（整合修訂 2）：
//   (v) 新元件存在（缺任一＝紅）。
//   (iv) 新元件外框兩兩交集 0；任一新元件與座位卡、主鈕交集 0；#h1hint 與 3D 拍品外框（tray.bboxScreen）交集 0。
//   (i) 夜 1 盯上／出價頁：心願標籤（收合）與 3D 拍品外框交集 ≤ origin/main 同場景舊心願條的交集（基準當場重量；舊心願條須存在）；
//       收合押寶面板同理對舊押寶面板（展開態）——兩者同場景都在時才比。
//   (ii) 夜 7 押寶夜的拍品交集只記錄（同 seed 兩次跑拍品不同）。(iii) 窄籤本體與出價／盯上標記對拍品只記錄（已知限制）。
//   卷軸鈕所在的鑑賞頁本就把拍品推近，對它只量座位卡與主鈕。
// 環境：YAOSHI_RENDER_ROOT（受測版改成別棵樹，例如對舊版跑同一份）、I066_BASE_REF（基準 git ref，預設 db281fa9）、
//       YAOSHI_SHOT_DIR（有設就存截圖）、YAOSHI_PW_ROOT、I066_VPS（預設 A,B,C）、I066_OUT（量測 JSON 輸出目錄）。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DRIVE_STEP, scr, driveToFirst, waitTrayReady, waitSettled } from './tools/appraise-c-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const BASE_REF = process.env.I066_BASE_REF || 'db281fa9';
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

/* 靜態伺服器：mode 'fs' 讀 SRV_ROOT 工作樹；mode 'git' 讀 BASE_REF 的 git 物件（不在版控的檔退回工作樹）。 */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
function serve(mode) {
  const cache = new Map();
  const read = (rel) => {
    if (mode === 'git') {
      if (cache.has(rel)) return cache.get(rel);
      try { const b = execFileSync('git', ['-C', ROOT, 'cat-file', 'blob', `${BASE_REF}:${rel}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); cache.set(rel, b); return b; } catch (e) { /* 不在版控 */ }
    }
    const f = path.join(SRV_ROOT, rel); return fs.existsSync(f) && fs.statSync(f).isFile() ? fs.readFileSync(f) : null;
  };
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    if (rel.includes('..')) { res.writeHead(403); res.end(); return; }
    const b = read(rel);
    if (!b) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : b);
  });
  return new Promise((ok) => srv.listen(PORT, '127.0.0.1', () => ok(srv)));
}

/* 頁內量測：sels＝要量的元件（名稱→選擇器）；回傳可見者外框、3D 拍品外框、座位卡、主鈕 */
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
/** (iv)：兩兩交集＋對座位卡／主鈕；lotKinds＝仍須對拍品為 0 的元件種類 */
function overlaps(m, lotKinds) {
  const hits = [];
  for (let i = 0; i < m.els.length; i++) for (let j = i + 1; j < m.els.length; j++) {
    const a = inter(m.els[i].rect, m.els[j].rect); if (a > 0) hits.push(`${m.els[i].name}×${m.els[j].name}=${a.toFixed(2)}`);
  }
  for (const e of m.els) for (const f of [...(lotKinds.includes(e.kind) ? m.lots : []), ...m.fixed]) {
    const a = inter(e.rect, f.rect); if (a > 0) hits.push(`${e.name}×${f.name}=${a.toFixed(2)}`);
  }
  return hits;
}
/** 某種元件（全部同種件）對全部拍品的交集面積總和；該種元件不存在回 null */
const lotArea = (m, kind) => { const es = m.els.filter((e) => e.kind === kind); if (!es.length) return null; return es.reduce((s, e) => s + m.lots.reduce((t, l) => t + inter(e.rect, l.rect), 0), 0); };
const kinds = (m) => new Set(m.els.map((e) => e.kind));

async function withGame(mode, size, fn) {
  const { chromium } = loadPlaywright();
  const srv = await serve(mode);
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
    return await fn(page, errs, seed);
  } finally { await browser.close(); await new Promise((ok) => srv.close(ok)); }
}

/** 同一流程：夜1 盯上 → pickMark(1) → 夜1 出價（每格下標）→ 鑑賞 → 推進到夜 7 押寶夜出價頁。各場景以 sels 量測。 */
async function flow(page, sels, shot) {
  const out = {};
  const c1 = await driveToFirst(page, new Set(['mark', 'bid']), 6000);
  assert.equal(c1, 'mark', '夜 1 沒先到盯上頁：' + c1);
  await waitTrayReady(page); await waitSettled(page); await page.waitForTimeout(1200);
  out.mark = await page.evaluate(MEAS, sels);
  if (shot) await page.screenshot({ path: path.join(SHOT_DIR, 'A-n1-mark.png') });
  await page.evaluate(() => pickMark(1));
  await page.waitForTimeout(500);
  for (let i = 0; i < 300 && (await scr(page)) !== 'bid'; i++) await page.waitForTimeout(20);
  assert.equal(await scr(page), 'bid', '盯上後沒到出價頁');
  out.autoOpened = await page.evaluate(() => !!document.querySelector('.wishchip.open'));
  await page.waitForFunction(() => !document.querySelector('.wishchip.open'), null, { timeout: 7000 }).catch(() => {});
  const nLots = await page.evaluate(() => S.market.length);
  for (let i = 0; i < nLots; i++) { await page.evaluate((k) => { openSheet(k); myBids[k].amt = 1; closeSheet(); }, i); await page.waitForTimeout(150); }
  await waitSettled(page); await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.wishchip.open'), null, { timeout: 7000 }).catch(() => {});
  out.nLots = nLots;
  out.bid = await page.evaluate(MEAS, sels);
  if (shot) await page.screenshot({ path: path.join(SHOT_DIR, 'A-n1-bid.png') });
  const t = await page.evaluate(() => { const b = document.querySelector('.railTabs button'); return b ? { rail: b.closest('.rail').id, slot: Number(b.dataset.slot) } : null; });
  await page.evaluate(([r, s]) => railTabClick(r, s), [t.rail, t.slot]);
  await page.waitForTimeout(2600);
  out.appr = await page.evaluate(MEAS, sels);
  await page.evaluate(() => closeAppraise()); await page.waitForTimeout(600);
  let reached = false;
  for (let i = 0; i < 40000; i++) {
    const rd = await page.evaluate(() => window.__yaoshi.S.round);
    const c = await scr(page);
    if (rd === 7 && c === 'bid') { reached = true; break; }
    if (rd > 7) break;
    if ((await page.evaluate(DRIVE_STEP)) === 2) break;
    await page.waitForTimeout(8);
  }
  assert.ok(reached, '沒推進到夜 7 出價頁');
  await waitTrayReady(page); await waitSettled(page); await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.wishchip.open'), null, { timeout: 7000 }).catch(() => {});
  out.yabao = await page.evaluate(MEAS, sels);
  if (shot) await page.screenshot({ path: path.join(SHOT_DIR, 'A-n7-yabao-bid.png') });
  return out;
}

const NEW1 = { h1hint: '#h1hint', wishchip: '#feltHead .wishchip', tabbid: '.railTabs .tabbid', tabmark: '.railTabs .tabmark', stakebar: '.stakebar.collapsed', scrollbtn: '.asc .asc-act', tab: '.railTabs button' };
const OLD1 = { wishbar: '#feltHead .wishbar', stakebar: '.stakebar', tab: '.railTabs button' };
const DUT_KINDS = ['h1hint', 'wishchip', 'tabbid', 'tabmark', 'stakebar', 'scrollbtn']; /* (iv) 兩兩／座位卡／主鈕要量的新元件（窄籤本體 tab 只記錄） */
const onlyNew = (m) => ({ ...m, els: m.els.filter((e) => DUT_KINDS.includes(e.kind)) });

for (const key of VPS) {
  const size = ALL[key];
  test(`I066 ${size.join('×')}：夜1 盯上／出價／鑑賞、夜7 押寶夜——新元件存在、彼此與座位卡／主鈕交集 0、拍品交集不大於 origin/main 舊元件`, { timeout: 1200000 }, async () => {
    /* 基準：origin/main 同流程、同量法 */
    const base = await withGame('git', size, async (page, errs, seed) => ({ seed, ...(await flow(page, OLD1, false)) }));
    const rec = await withGame('fs', size, async (page, errs, seed) => ({ seed, errs, ...(await flow(page, NEW1, !!SHOT_DIR && key === 'A')) }));
    const area = (m, k) => { const v = lotArea(m, k); return v == null ? null : +v.toFixed(2); };
    const cmp = {};
    for (const sc of ['mark', 'bid', 'yabao']) cmp[sc] = {
      old_wishbar: area(base[sc], 'wishbar'), new_wishchip: area(rec[sc], 'wishchip'),
      old_stakebar: area(base[sc], 'stakebar'), new_stakebar: area(rec[sc], 'stakebar'),
      old_tab: area(base[sc], 'tab'), new_tab: area(rec[sc], 'tab'), new_tabbid: area(rec[sc], 'tabbid'), new_tabmark: area(rec[sc], 'tabmark'),
      lotsSame: JSON.stringify(base[sc].lots) === JSON.stringify(rec[sc].lots) };
    const hits = { mark: overlaps(onlyNew(rec.mark), ['h1hint']), bid: overlaps(onlyNew(rec.bid), ['h1hint']), appr: overlaps(onlyNew(rec.appr), []), yabao: overlaps(onlyNew(rec.yabao), ['h1hint']) };
    const dump = { key, seedBase: base.seed, seed: rec.seed, cmp, hits, base, rec };
    if (OUT_DIR) fs.writeFileSync(path.join(OUT_DIR, `integration-066-${key}.json`), JSON.stringify(dump, null, 1));
    console.log(`I066 記錄 ${key}`, JSON.stringify(cmp));
    /* (v) 存在 */
    const kM = kinds(rec.mark), kB = kinds(rec.bid);
    assert.ok(kM.has('h1hint'), '夜 1 盯上頁沒有可見的 #h1hint（元件缺失）');
    assert.ok(kM.has('wishchip'), '夜 1 盯上頁沒有可見的心願標籤 .wishchip（元件缺失）');
    assert.equal(rec.mark.round, 1);
    assert.ok(kB.has('h1hint'), '夜 1 出價頁沒有可見的 #h1hint（元件缺失）');
    assert.ok(kB.has('wishchip'), '夜 1 出價頁沒有可見的心願標籤（元件缺失）');
    assert.equal(rec.bid.open, false, '心願浮層 7 秒內沒有自己收回');
    assert.equal(rec.bid.els.filter((e) => e.kind === 'tabbid').length, rec.nLots, `出價標記數 ≠ 拍品數 ${rec.nLots}（元件缺失）`);
    assert.equal(rec.bid.els.filter((e) => e.kind === 'tabmark').length, 1, '盯上標記不是 1 個（元件缺失）');
    assert.ok(kinds(rec.appr).has('scrollbtn'), '鑑賞頁沒有卷軸鈕 .asc-act（元件缺失）');
    assert.equal(rec.yabao.round, 7); assert.equal(rec.yabao.rule, 'yabao', '夜 7 不是押寶夜：' + rec.yabao.rule);
    assert.ok(kinds(rec.yabao).has('stakebar'), '押寶夜沒有收合的 .stakebar（元件缺失）');
    assert.ok(!kinds(rec.yabao).has('h1hint'), '夜 7 仍顯示 #h1hint');
    /* (i) 夜 1：不大於 origin/main 同場景舊元件 */
    assert.equal(base.seed, rec.seed, '基準與受測版選到的種子不同（前提不成立）');
    for (const sc of ['mark', 'bid']) {
      const c = cmp[sc];
      assert.ok(c.old_wishbar != null, `基準 ${sc}：origin/main 沒有可見的舊心願條（前提不成立）`);
      assert.ok(c.new_wishchip <= c.old_wishbar + 0.01, `(i) ${key} 夜1 ${sc}：心願標籤×拍品 ${c.new_wishchip} > 舊心願條 ${c.old_wishbar}`);
      if (c.new_stakebar != null && c.old_stakebar != null) assert.ok(c.new_stakebar <= c.old_stakebar + 0.01, `(i) ${key} 夜1 ${sc}：押寶面板×拍品 ${c.new_stakebar} > 舊 ${c.old_stakebar}`);
    }
    /* (iv) 兩兩／座位卡／主鈕／#h1hint×拍品 */
    assert.deepEqual(hits.mark, [], '夜 1 盯上頁交集：' + hits.mark.join('；'));
    assert.deepEqual(hits.bid, [], '夜 1 出價頁交集：' + hits.bid.join('；'));
    assert.deepEqual(hits.appr, [], '鑑賞頁交集：' + hits.appr.join('；'));
    assert.deepEqual(hits.yabao, [], '押寶夜出價頁交集：' + hits.yabao.join('；'));
    assert.deepEqual(rec.errs, [], 'pageerror：' + rec.errs.join('；'));
  });
}
