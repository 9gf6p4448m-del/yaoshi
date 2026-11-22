// 共用 GLB 載入器的回歸測試（v0.66.2；Codex yaoshi-v0.66.1-r3 F1、F2、F3、F5、F6；驗收 docs/acceptance/2026-11-22-v0.66.2-loader.md）。
// 真頁面、真 three、真載入器／托盤，模型檔走本檔自己的 Node 伺服器（分段傳輸：可以傳到一半停住、斷斷續續給資料、扣住不回）。
//   F1：一件傳到一半停住、同夜另一件每 10 秒還有資料 → 停住那件仍要在約 20 秒重抓、托盤那格要出現；明夜批次要在有限時間內開始。
//   F2：位元組收齊、解析拖 25 秒 → 不得被當成下載卡住而重抓（同一檔只能被請求一次、只解析一次）。
//   F5：一件傳到一半停住後把系統時鐘往回撥／往前撥 120 秒 → 重抓時間仍是停住後約 20 秒（不受校時影響）。
//   F3：托盤一格換貨後，舊貨才載入失敗 → 新貨那格不得被標成就緒；沒換貨時載入失敗仍標就緒（不擋整個托盤）。
//   F6：正常線路 → 今夜的模型全部下載完，明夜的才開始。
//   以下三個與 F1 的加嚴是 Codex yaoshi-v0.66.2-r1 後加的（F1／F2／F3／F4）：
//   P：每次請求都送一部分後停 22 秒再續傳（共享頻寬讓給別件）→ 不得在停頓中中止還在的下載，那格要在第一次請求後 35 秒內出現。
//   H：40 秒才回標頭、之後沒有本體 → 排隊上限從請求開始算（43–50 秒重抓），不被晚到的標頭重設。
//   X：解析永遠不回 → 45 秒後判失敗、期間不重抓本體；之後再要同一件會重新下載並出現。
//   Codex yaoshi-v0.66.2-r2 後：Q（r2 F1）原請求收過本體後停住、重抓要排隊 25 秒 → 排隊中的重抓不得被 20 秒門檻砍掉；F1 明夜下限 43 秒（r2 F3）。
//   v0.66.3（Codex yaoshi-v0.66.2-r3；驗收 docs/acceptance/2026-11-22-v0.66.3.md）：
//   C（r3 F1：HTTP/1.1 六條全被停住的原請求佔滿時重抓要送得出去）已撤：製作人 2026-11-22 同意撤掉讓出機制與條件 1（驗收檔修訂一）。C2、R、M、K 留著守
//   「不中止會恢復的原下載」，以後要再加讓出規則得先過它們。
//   W（r3 F2）：同一件一直斷續有資料時連續 4 次預載（換夜／新局）→ 舊批次的等待者要解除，只留最新一批；45 秒上限放行後也要解除。
//   N（r3 F4）：同頁開新局 →「請神入座」遮罩從新局自己的第一次市集事件起算（不被上一局的 12 秒計時收掉；上一局已結束的也要重新監看）。
//   X 加上下界、新增 Y（r3 F7）：解析逾時要在解析開始後 43–50 秒收尾；解析 40 秒後才完成的那件要上桌。
//   Codex yaoshi-v0.66.3-r1 後：R（r1 F1）原下載收過本體後停住、約第 35 秒恢復，重抓已送達但 16 秒後才回 404 → 不得中止會恢復的原下載，那格要出現；
//   C2（r1 F1）六件原請求都收過本體後停住（原 C 的布置）、頁面回報 h2 → 不讓出連線。
//   Codex yaoshi-v0.66.3-r2 後：M（r2 F1）五件原請求佔五條連線（這件收過本體後停住、約第 35 秒恢復，另四件斷續有資料），這件的重抓佔第六條、
//   16 秒後才回 404，之後別件排隊 → 不得因為「別件在排隊」中止這件會恢復的原下載，那格要出現；
//   W 加嚴（r2 F2）：第 2–4 次預載派發當下，不得有人對 bell 的共用下載承諾掛 then（catch／finally／Promise.all 也經過 then）。
//   v0.66.3-r3 後（驗收 docs/acceptance/2026-11-23-loader-tests.md）：
//   W 再加嚴（r3 F2）：第 2 次預載派發前到 45 秒放行後，整段都數 bell 共用下載承諾被讀 constructor 的次數（then／catch／finally／Promise.all／race／await
//   每次都要讀，延到微任務或計時器才掛的也數得到）；W2（r3 F3）：明夜批次啟動後換世代 → 舊明夜批次的等待者要解除、
//   明夜路徑也不得對共用承諾掛回呼、作廢的批次不得替舊明夜開新下載。
//   送 r3 前預審（fresh agent 模擬的 M′）：K 六件原請求佔滿六條連線（這件收過本體後停住、約第 35 秒恢復，另五件斷續有資料），這件的重抓只能排隊、
//   16 秒後才會回 404 → 名額不是全被停住的請求佔著（別件還在傳、遲早讓出），不得中止會恢復的原下載，那格要出現。
// 時間一律用伺服器端（Node）的時鐘量，頁內校時影響不到量測。
// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { launchGpu } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_GLBLOADER_PORT || 9795);
const RATE = 409600; // 每個回應 400KB/s（原始大小），16KB 一塊
const CHUNK = 16384;
// 只跑指定情境（除錯／突變驗證用）：YAOSHI_GLBLOADER_ONLY=F1,F6
const ONLY = (process.env.YAOSHI_GLBLOADER_ONLY || "").split(",").filter(Boolean);

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain' };

/** 模型檔的送法。normal＝照 RATE 送完；partial＝送到 frac 就停（連線不關）；trickle＝先送一塊，之後每 every 毫秒送 step 位元組；
 *  pause＝送到 frac 後停 pause 毫秒再照 RATE 送完（共享頻寬讓給別件、之後恢復）；lateheaders＝delay 毫秒後才回標頭、之後一個本體位元組都不送；
 *  hold＝不回，等 release(file, status)；nf＝直接 404。 */
const NORMAL = { kind: 'normal' };
const PARTIAL = { kind: 'partial', frac: 0.3 };
const TRICKLE = { kind: 'trickle', every: 10000, step: 2048 };
const PAUSE = { kind: 'pause', frac: 0.3, pause: 22000 };
const LATEHEADERS = { kind: 'lateheaders', delay: 40000 };
const DELAYED = { kind: 'delayed', delay: 25000 }; // 排隊 delay 毫秒才回標頭，之後照 RATE 送完
const LONGPAUSE = { kind: 'pause', frac: 0.3, pause: 34000 }; // v0.66.3 r1 F1：停 34 秒後恢復（約第 35 秒）
const LATE404 = { kind: 'late404', delay: 16000 }; // v0.66.3 r1 F1：伺服器收到請求後 16 秒才回 404（重抓已送達、標頭晚到又失敗）
const HOLD = { kind: 'hold' };
const NF = { kind: 'nf' };

function startServer() {
  const T0 = Date.now();
  const S = { now: () => Date.now() - T0, log: [], holds: new Map(), timers: new Set(), decide: () => NORMAL };
  const later = (fn, ms) => { const t = setTimeout(() => { S.timers.delete(t); fn(); }, ms); S.timers.add(t); return t; };
  const stream = (res, rec, body, plan) => {
    let o = 0;
    let stop = plan.kind === 'partial' || plan.kind === 'pause' ? Math.floor(body.length * plan.frac) : body.length;
    const send = (n) => {
      if (res.destroyed) return false;
      const c = body.subarray(o, Math.min(o + n, body.length)); o += c.length;
      res.write(c); rec.bytes = o; rec.last = S.now(); rec.chunks.push(rec.last); if (rec.first === null) rec.first = rec.last;
      if (o >= body.length) { res.end(); rec.end = S.now(); return false; }
      return true;
    };
    const tick = () => {
      if (plan.kind === 'trickle' && rec.first !== null) { if (send(plan.step)) later(tick, plan.every); return; }
      if (o >= stop) { // partial：停在這裡，連線不關；pause：停 plan.pause 毫秒後送完
        if (plan.kind === 'pause' && rec.pauseAt === null) { rec.pauseAt = S.now(); later(() => { if (res.destroyed) return; rec.resumeAt = S.now(); stop = body.length; tick(); }, plan.pause); }
        return;
      }
      if (send(Math.min(CHUNK, stop - o))) later(tick, plan.kind === 'trickle' ? plan.every : CHUNK / RATE * 1000);
    };
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    tick();
  };
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.resolve(SRV_ROOT, '.' + p);
    if (!file.startsWith(path.resolve(SRV_ROOT))) { res.writeHead(403); res.end(); return; }
    const glb = /^\/assets\/creatures\/[^/]+\.glb$/.test(p);
    if (!glb) {
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }); res.end(buf);
      });
      return;
    }
    const f = path.basename(p);
    const plan = S.decide(f, u.search) || NORMAL;
    const rec = { f, q: u.search, kind: plan.kind, t: S.now(), first: null, last: null, end: null, bytes: 0, chunks: [], aborted: null, status: 200, pauseAt: null, resumeAt: null, headersAt: null };
    S.log.push(rec);
    res.on('close', () => { if (rec.end === null) rec.aborted = S.now(); });
    let body;
    try { body = fs.readFileSync(file); } catch (e) { res.writeHead(404); res.end('not found'); rec.status = 404; rec.end = S.now(); return; }
    if (plan.kind === 'nf') { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); return; }
    if (plan.kind === 'late404') { later(() => { if (res.destroyed) return; rec.headersAt = S.now(); res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); }, plan.delay); return; }
    if (plan.kind === 'delayed') { later(() => { if (!res.destroyed) stream(res, rec, body, NORMAL); }, plan.delay); return; }
    if (plan.kind === 'lateheaders') {
      later(() => { if (res.destroyed) return; res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': body.length, 'Cache-Control': 'no-store' }); res.flushHeaders(); rec.headersAt = S.now(); }, plan.delay);
      return;
    }
    if (plan.kind === 'hold') {
      S.holds.set(f, (status) => {
        if (res.destroyed) return;
        if (status === 404) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); }
        else stream(res, rec, body, NORMAL);
      });
      return;
    }
    stream(res, rec, body, plan);
  });
  server.keepAliveTimeout = 120000;
  S.release = (f, status) => { const h = S.holds.get(f); if (h) { S.holds.delete(f); h(status); } };
  S.reset = () => { S.log.length = 0; S.holds.clear(); S.decide = () => NORMAL; };
  S.close = () => { for (const t of S.timers) clearTimeout(t); S.timers.clear(); server.closeAllConnections(); return new Promise((r) => server.close(() => r())); };
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(S)));
}

const fileOf = (k) => (k === 'tiger' ? 'tiger_c' : k) + '.glb';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms, step = 200) { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step); } }
/** 直到 fn 為真或伺服器時鐘過了 deadline（先查期限再查狀態：過了期限才第一次看到的不算，Codex yaoshi-v0.66.2-r1 F4）。 */
async function untilBy(S, fn, deadline, step = 100) { for (;;) { if (S.now() > deadline) return null; const v = await fn(); if (v && S.now() <= deadline) return v; await sleep(step); } }

/** 開一個全新 context（不共用快取）的遊戲頁，等托盤與手都載好、線路安靜 3 秒。 */
async function openGame(browser, S, errs, init) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  S.decide = () => NORMAL; // 上一個情境的送法不帶進開頁（v0.66.3 r2：M 的送法會讓手的模型斷續送、開頁等不到，後面的情境不論實作都過不了）
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d && !!window.__yaoshi3d.tray', { timeout: 60000 });
  await page.waitForFunction('!!window.__yaoshi3d.tray.hands && window.__yaoshi3d.tray.hands.loaded()', { timeout: 60000 });
  await sleep(3000);
  S.reset();
  return { ctx, page };
}
const prefetchOf = (page) => page.evaluate(() => { const J = window.__ys3dJournal; return J && J.prefetch ? J.prefetch.detail : null; });
async function toRound1(page) {
  const round = () => page.evaluate(() => { const J = window.__ys3dJournal; return J && J.market && J.market.detail ? J.market.detail.round : -1; });
  for (let i = 0; i < 2000 && (await round()) < 1; i++) {
    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); return { d: !b || !b.offsetParent || b.disabled }; })()`);
    if (!st.d) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button, button')].find(x=>x.offsetParent&&!x.disabled&&/下一頁|開始|知道了|進入|確定|不盯|繼續|跳過|下一夜|蓋牌|開標/.test(x.innerText)); if(e)e.click(); })()`);
    await sleep(60);
  }
  return round();
}
const slotOf = (page, key) => page.evaluate((k) => window.__yaoshi3d.tray.items().find((s) => s.key === k) || null, key);
/** 頁內呼叫遊戲正在用的同一份 creature-figures 模組（網址照 renderer 的版本參數組，才是同一個實例）。 */
const cf = (page, fn, ...args) => page.evaluate(async ({ fn, args }) => {
  const s = [...document.scripts].find((x) => /\/js\/renderer\.js(\?|$)/.test(x.src));
  const m = await import(new URL('creature-figures.js' + new URL(s.src).search, s.src).href);
  if (typeof m[fn] !== 'function') throw new Error('creature-figures 沒有 ' + fn);
  return m[fn](...args);
}, { fn, args });
/** 數共用下載承諾被掛了幾次回呼（v0.66.3-r3 F2）：在承諾上放自有的 constructor 存取器——then／catch／finally／Promise.all／race／await
 *  每次都要讀它，延到微任務或計時器才掛的也數得到。 */
const watchShared = (page, url) => page.evaluate(async (u) => {
  const s = [...document.scripts].find((x) => /\/js\/renderer\.js(\?|$)/.test(x.src));
  const m = await import(new URL('creature-figures.js' + new URL(s.src).search, s.src).href);
  const p = typeof m.glbShared === 'function' ? m.glbShared(u) : null;
  if (!p) return false;
  const sc = window.__subCnt = { p, n: 0, at: [] };
  Object.defineProperty(p, 'constructor', { configurable: true, get() { sc.n++; if (sc.at.length < 3) sc.at.push(String(new Error().stack).split('\n').slice(2, 5).map((x) => x.trim()).join(' < ')); return Promise; } });
  return true;
}, url);
/** 收次數、做正對照（延到微任務才掛的 then、await 各要數到 1 次），再拆掉計數。 */
const readShared = (page) => page.evaluate(async () => {
  const c = window.__subCnt; if (!c) return null;
  const turn = () => new Promise((r) => setTimeout(r, 100));
  const n = c.n, at = c.at.slice();
  queueMicrotask(() => { c.p.then(() => {}, () => {}); }); await turn();
  const ctlThen = c.n - n;
  (async () => { try { await c.p; } catch (e) {} })(); await turn();
  const ctlAwait = c.n - n - ctlThen;
  delete c.p.constructor; window.__subCnt = null;
  return { n, at, ctlThen, ctlAwait };
});
/** 點過教學／事件頁，直到頁內 window.__pm（pushMarket3d 的頁內時間）出現 since 之後的一筆；回那一筆。 */
async function toMarketSince(page, since) {
  for (let i = 0; i < 2000; i++) {
    const t = await page.evaluate((s) => (window.__pm || []).find((x) => x >= s) ?? null, since);
    if (t !== null) return t;
    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); return { d: !b || !b.offsetParent || b.disabled }; })()`);
    if (!st.d) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button, button')].find(x=>x.offsetParent&&!x.disabled&&/下一頁|開始|知道了|進入|確定|不盯|繼續|跳過|下一夜|蓋牌|開標/.test(x.innerText)); if(e)e.click(); })()`);
    await sleep(60);
  }
  return null;
}

test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗回呼核對身分、明夜等今夜下載完', { timeout: 1200000 }, async (t) => {
  const { chromium } = loadPlaywright();
  const S = await startServer();
  const browser = await launchGpu(chromium);
  const sub = (id, name, fn) => t.test(name, ONLY.length && !ONLY.includes(id) ? { skip: 'YAOSHI_GLBLOADER_ONLY' } : {}, fn);
  try {
    await sub('F1', 'F1：傳到一半停住、同夜別件斷續有資料 → 停住那件約 20 秒重抓、托盤那格出現；明夜批次 50 秒內開始', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = [];
        S.decide = (f, q) => { if (q) return NORMAL; if (!order.includes(f)) order.push(f); const i = order.indexOf(f); return i === 0 ? PARTIAL : i === 1 ? TRICKLE : NORMAL; };
        const t0 = S.now();
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        assert.ok(pf && pf.now && pf.now.length >= 2, '開局沒派今夜預載（至少要 2 件）');
        const nowFiles = pf.now.map(fileOf), nextOnly = [...new Set(pf.next.map(fileOf))].filter((f) => !nowFiles.includes(f));
        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
        const hang = await until(() => S.log.find((r) => r.kind === 'partial'), 10000);
        const trk = await until(() => S.log.find((r) => r.kind === 'trickle'), 10000);
        assert.ok(hang && trk, '情境沒布好（停住／斷續那兩件沒被請求）');
        assert.ok(nowFiles.includes(hang.f) && nowFiles.includes(trk.f), `停住（${hang.f}）／斷續（${trk.f}）不是今夜拍品（${nowFiles}）`);
        const hangKey = pf.now.find((k) => fileOf(k) === hang.f);
        const retry = await until(() => S.log.find((r) => r.f === hang.f && /retry=1/.test(r.q)), Math.max(0, t0 + 62000 - S.now()), 250);
        // 托盤那格從重抓那一刻就開始盯，期限照伺服器時鐘（過了期限才第一次看到的不算；Codex yaoshi-v0.66.2-r1 F4）
        let slot = null;
        if (retry) slot = await untilBy(S, async () => { const s = await slotOf(page, hangKey); return s && s.ready && s.visible ? s : null; }, retry.t + 10000);
        const tomorrow = await until(() => S.log.find((r) => nextOnly.includes(r.f)), Math.max(0, t0 + 62000 - S.now()), 250);
        // 活性：停住那件真的收到部分資料後才停；斷續那件在重抓前 15 秒內真的還有資料（＝線路沒有整條停）
        assert.ok(hang.bytes > 0 && hang.end === null, `停住那件沒有先收到部分資料（bytes=${hang.bytes}）`);
        assert.ok(retry, `停住那件（${hang.f}，最後一塊 ${hang.last}ms）開局後 62 秒內都沒重抓（斷續那件每 10 秒還在給資料）`);
        const trkRecent = trk.chunks.filter((c) => c <= retry.t).pop();
        assert.ok(trkRecent !== undefined && retry.t - trkRecent < 15000, `重抓當下斷續那件最近一塊在 ${retry.t - trkRecent}ms 前（要 <15000，否則沒行使到「別件還有資料」）`);
        const gap = retry.t - hang.last;
        assert.ok(gap >= 18000 && gap <= 25000, `停住後 ${gap}ms 才重抓（有效區間 18000–25000ms）`);
        assert.ok(slot, `重抓後 10 秒內托盤那格（${hangKey}）沒有就緒且看得到`);
        assert.ok(nextOnly.length > 0, '明夜沒有今夜以外的拍品，量不到明夜批次');
        // r2 F3：下限 43 秒——今夜斷續那件一直在動、沒被判卡住，放行明夜的只能是 45 秒獨立上限（任一件停滯就整批放行的回歸會在約 20 秒放行）
        assert.ok(tomorrow && tomorrow.t - t0 >= 43000 && tomorrow.t - t0 <= 50000, `明夜批次開局後 ${tomorrow ? tomorrow.t - t0 + 'ms' : '62 秒內都沒'}開始（有效區間 43000–50000ms）`);
        // 活性（Codex yaoshi-v0.66.2-r1 F4）：明夜開始時今夜那件斷續的還沒下載完＝今夜批次還沒結束，放行明夜的只能是獨立上限
        assert.ok(trk.end === null || trk.end > tomorrow.t, `明夜開始時（${tomorrow.t}ms）今夜批次已下載完（斷續那件 ${trk.end}ms 完），量不到明夜的獨立上限`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('P', 'P：每次請求都送一部分後停 22 秒再續傳（共享頻寬讓給別件）→ 不中止還在的下載，那格在第一次請求後 35 秒內出現', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = [];
        S.decide = (f) => { if (!order.includes(f)) order.push(f); const i = order.indexOf(f); return i === 0 ? PAUSE : i === 1 ? TRICKLE : NORMAL; };
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
        const trk = await until(() => S.log.find((r) => r.kind === 'trickle'), 10000);
        assert.ok(a && trk, '情境沒布好（停頓／斷續那兩件沒被請求）');
        const key = pf.now.find((k) => fileOf(k) === a.f);
        assert.ok(key, `停頓那件（${a.f}）不是今夜拍品`);
        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 35000, 200);
        // 活性：停頓那件先收到部分資料、停了 20 秒以上；停頓期間斷續那件一直有資料（線路沒整條停）
        assert.ok(a.pauseAt !== null && a.bytes > 0, `停頓那件沒有先收到部分資料就停（bytes=${a.bytes}）`);
        const during = trk.chunks.filter((c) => c > a.pauseAt && c < a.pauseAt + 22000);
        assert.ok(during.length >= 2, `停頓期間斷續那件只有 ${during.length} 塊資料，沒行使到「別件還在傳」`);
        assert.ok(a.aborted === null || (a.resumeAt !== null && a.aborted >= a.resumeAt), `第一次請求在停頓中（${a.pauseAt}→${a.pauseAt + 22000}ms）就被中止（${a.aborted}ms），已收的位元組丟掉`);
        assert.ok(slot, `第一次請求後 35 秒內那格（${key}）沒有就緒且看得到（請求：${S.log.filter((r) => r.f === a.f).map((r) => (r.q || '-') + '@' + r.t + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ')}）`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('Q', 'Q：傳到一半停住、重抓都要排隊 25 秒才有回應、別件斷續有資料 → 排隊中的重抓不被砍，那格在第一次請求後 60 秒內出現', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = [];
        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); const i = order.indexOf(f); return i === 0 ? (q ? DELAYED : PARTIAL) : i === 1 ? TRICKLE : NORMAL; };
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
        const a = await until(() => S.log.find((r) => r.kind === 'partial'), 10000);
        const trk = await until(() => S.log.find((r) => r.kind === 'trickle'), 10000);
        assert.ok(a && trk, '情境沒布好（停住／斷續那兩件沒被請求）');
        const key = pf.now.find((k) => fileOf(k) === a.f);
        assert.ok(key, `停住那件（${a.f}）不是今夜拍品`);
        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 60000, 200);
        const r1 = S.log.find((r) => r.f === a.f && /retry=1/.test(r.q));
        const hist = S.log.filter((r) => r.f === a.f).map((r) => (r.q || '-') + '@' + r.t + (r.first !== null ? '▶' + r.first : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
        // 活性：原請求先收到部分本體才停；重抓真的在排隊（25 秒才有回應）時別件一直有資料
        assert.ok(a.bytes > 0 && a.end === null, `原請求沒有先收到部分本體（bytes=${a.bytes}）`);
        assert.ok(r1, `停住那件沒有重抓（${hist}）`);
        const during = trk.chunks.filter((c) => c > r1.t && c < r1.t + 25000);
        assert.ok(during.length >= 2, `重抓排隊期間斷續那件只有 ${during.length} 塊資料，沒行使到「別件還在傳」`);
        assert.ok(r1.aborted === null || r1.first !== null, `第一次重抓還在排隊（${r1.t}→${r1.t + 25000}ms）就被中止（${r1.aborted}ms）：${hist}`);
        assert.ok(slot, `第一次請求後 60 秒內那格（${key}）沒有就緒且看得到：${hist}`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    /** C2 的布置（與已撤的 C 共用過）：每件原請求送 30% 後停住（連線不關）、重抓正常；今夜拍品＋另補幾件湊滿 6 份停住的原請求。 */
    const setupC = async (page) => {
      S.decide = (f, q) => (q ? NORMAL : PARTIAL);
      await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
      const pf = await prefetchOf(page);
      assert.ok(pf && pf.now && pf.now.length >= 2, '開局沒派今夜預載（至少要 2 件）');
      const nowFiles = [...new Set(pf.now.map(fileOf))], nextFiles = new Set(pf.next.map(fileOf));
      // 另外補幾件模型一起下載（＝仍在背景下載的模型），湊滿 6 份停住的原請求。用預載事件派：換了世代，明夜批次不會再開始，線上只剩這 6 份
      const extra = fs.readdirSync(path.join(SRV_ROOT, 'assets/creatures')).filter((f) => f.endsWith('.glb') && !/^hand/.test(f) && f !== 'tiger.glb'
        && !nowFiles.includes(f) && !nextFiles.has(f)).sort().slice(0, Math.max(0, 6 - nowFiles.length)).map((f) => f.replace(/\.glb$/, ''));
      await page.evaluate((now) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now, next: [] } })), [...pf.now, ...extra]);
      assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
      const want = [...nowFiles, ...extra.map((k) => k + '.glb')];
      // 活性：6 份原請求同時收過本體、停住、連線還開著（＝瀏覽器對這台主機的 6 條連線全被佔住）
      const full = await until(() => { const o = S.log.filter((r) => !r.q && want.includes(r.f) && r.bytes > 0 && r.end === null && r.aborted === null); return o.length >= 6 ? o : null; }, 15000);
      assert.ok(full, `沒湊滿 6 份停住的原請求（${S.log.filter((r) => !r.q).map((r) => r.f + ':' + r.bytes).join(' ')}）`);
      const first = Math.min(...full.map((r) => r.t));
      const hist = (f) => S.log.filter((r) => r.f === f).map((r) => (r.q || '-') + '@' + r.t + (r.first !== null ? '▶' + r.first : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
      const proto = await page.evaluate(() => performance.getEntriesByType('navigation')[0].nextHopProtocol);
      return { pf, want, full, first, hist, proto };
    };

    await sub('C2', 'C2：六件原請求都收過本體後停住（原 C 的布置）、頁面回報 h2 → 不讓出連線（第一次請求後 40 秒內沒有任何原請求被中止）', async () => {
      const errs = [];
      // 本機測試伺服器只有 HTTP/1.1：把頁面看到的協定改報 h2，守「不中止會恢復的原下載」（當初量的是「只有 HTTP/1.1 才讓出」那道開關，讓出機制已撤；實際 h2 傳輸未在本機量，正式站實測 h2 見 DECISIONS 2026-11-22）
      const { ctx, page } = await openGame(browser, S, errs, () => {
        Object.defineProperty(PerformanceResourceTiming.prototype, 'nextHopProtocol', { configurable: true, get() { return 'h2'; } });
      });
      try {
        const { full, first, hist, proto } = await setupC(page);
        assert.equal(proto, 'h2', `頁面看到的協定沒改成 h2（${proto}）`);
        await until(() => S.now() >= first + 40000, 60000, 250);
        const early = full.filter((r) => r.aborted !== null && r.aborted < first + 40000);
        assert.deepEqual(early.map((r) => r.f), [], `頁面回報 h2，原請求仍被中止讓出連線：${early.map((r) => r.f + '[' + hist(r.f) + ']').join(' ')}`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('R', 'R：原下載收過本體後停住、約第 35 秒恢復；重抓已送達但 16 秒後才回 404 → 不中止會恢復的原下載，那格在第一次請求後 45 秒內出現', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = [];
        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); return order.indexOf(f) === 0 ? (q ? LATE404 : LONGPAUSE) : NORMAL; };
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
        assert.ok(a, '情境沒布好（長停頓那件沒被請求）');
        const key = pf.now.find((k) => fileOf(k) === a.f);
        assert.ok(key, `長停頓那件（${a.f}）不是今夜拍品`);
        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 45000, 250);
        await until(() => S.log.some((r) => r.f === a.f && r.q && r.end !== null), Math.max(0, a.t + 45000 - S.now()), 250);
        const r1 = S.log.find((r) => r.f === a.f && /retry=1/.test(r.q));
        const hist = S.log.filter((r) => r.f === a.f).map((r) => (r.q || '-') + '@' + r.t + (r.headersAt !== null ? 'H' + r.headersAt : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
        // 活性（只看布置，不看結果）：原下載先收過本體才停；重抓真的送到伺服器，而且到伺服器預定讓原下載恢復時，重抓已等標頭超過 10 秒（＝舊規則會在這段中止原下載）
        assert.ok(a.pauseAt !== null && a.bytes > 0, `原下載沒有先收到部分本體就停（bytes=${a.bytes}）`);
        assert.ok(r1, `沒有重抓（${hist}）`);
        const resumePlan = a.pauseAt + LONGPAUSE.pause;
        assert.ok(resumePlan - r1.t > 10000 && (r1.headersAt === null || r1.headersAt > resumePlan), `預定恢復（${resumePlan}ms）時重抓（${r1.t}ms 送出、標頭 ${r1.headersAt}ms）沒有等標頭超過 10 秒，沒行使到「重抓標頭晚到」：${hist}`);
        assert.ok(a.aborted === null || a.aborted >= resumePlan, `會恢復的原下載在預定恢復（${resumePlan}ms）前就被中止（${a.aborted}ms）：${hist}`);
        assert.ok(slot, `第一次請求後 45 秒內那格（${key}）沒有就緒且看得到：${hist}`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('M', 'M：五件原請求佔五條連線（這件收過本體後停住、約第 35 秒恢復，另四件斷續有資料）、這件的重抓佔第六條且 16 秒後才回 404、之後別件排隊 → 不中止會恢復的原下載，那格在第一次請求後 45 秒內出現', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = []; let bFile = null;
        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); if (order.indexOf(f) === 0) return q ? LATE404 : LONGPAUSE; return f === bFile ? NORMAL : TRICKLE; };
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        assert.ok(pf && pf.now && pf.now.length >= 1, '開局沒派今夜預載');
        const nowFiles = [...new Set(pf.now.map(fileOf))], nextFiles = new Set(pf.next.map(fileOf));
        assert.ok(nowFiles.length <= 5, `今夜 ${nowFiles.length} 件，超過 5 件，布不出「五件原請求＋這件的重抓＝6 條」`);
        // 另外補幾件（斷續有資料、一直傳不完）湊滿 5 份原請求；再留一件 B（正常線路）之後派來排隊。用預載事件派：換了世代，明夜批次不會開始
        const pool = fs.readdirSync(path.join(SRV_ROOT, 'assets/creatures')).filter((f) => f.endsWith('.glb') && !/^hand/.test(f) && f !== 'tiger.glb'
          && !nowFiles.includes(f) && !nextFiles.has(f)).sort();
        const extra = pool.slice(0, 5 - nowFiles.length).map((f) => f.replace(/\.glb$/, ''));
        bFile = pool[5 - nowFiles.length];
        await page.evaluate((now) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now, next: [] } })), [...pf.now, ...extra]);
        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
        const proto = await page.evaluate(() => performance.getEntriesByType('navigation')[0].nextHopProtocol);
        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
        assert.ok(a, '情境沒布好（長停頓那件沒被請求）');
        const key = pf.now.find((k) => fileOf(k) === a.f);
        assert.ok(key, `長停頓那件（${a.f}）不是今夜拍品`);
        // 這件的重抓送到伺服器 2 秒後，派一件新的預載（B）：6 條連線都被佔著，B 只能排隊
        const r1 = await until(() => S.log.find((r) => r.f === a.f && /retry=1/.test(r.q)), Math.max(0, a.t + 30000 - S.now()), 100);
        await until(() => r1 && S.now() >= r1.t + 2000, 5000, 100);
        const tB = S.now();
        await page.evaluate((k) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now: [k], next: [] } })), bFile.replace(/\.glb$/, ''));
        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 45000, 250);
        await until(() => S.log.some((r) => r.f === bFile) && S.log.some((r) => r.f === a.f && r.q && r.end !== null), Math.max(0, a.t + 60000 - S.now()), 250);
        const b = S.log.find((r) => r.f === bFile);
        const hist = (f) => S.log.filter((r) => r.f === f).map((r) => (r.q || '-') + '@' + r.t + (r.headersAt !== null ? 'H' + r.headersAt : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
        const resumePlan = a.pauseAt + LONGPAUSE.pause;
        const openAt = (t) => S.log.filter((r) => r.t <= t && (r.end === null || r.end > t) && (r.aborted === null || r.aborted > t));
        // 活性（只看布置，不看結果）：HTTP/1.x；原下載先收過本體才停；重抓真的送到伺服器、佔的是第 6 條（當下另有 5 份請求開著）、
        // 預定恢復時已等標頭超過 10 秒；B 在預定恢復前 10 秒以上派出、而且真的排過隊（派出 5 秒後才到伺服器）；另四件到預定恢復時都還開著
        assert.match(proto, /^http\/1/i, `頁面不是走 HTTP/1.x（${proto}），沒行使到每主機 6 條連線上限`);
        assert.ok(a.pauseAt !== null && a.bytes > 0, `原下載沒有先收到部分本體就停（bytes=${a.bytes}）`);
        assert.ok(r1, `沒有重抓（${hist(a.f)}）`);
        const others = openAt(r1.t).filter((r) => r !== r1);
        assert.equal(others.length, 5, `重抓送到伺服器時另有 ${others.length} 份請求開著（要 5 份：重抓佔第 6 條）：${others.map((r) => r.f + (r.q || '')).join(' ')}`);
        assert.ok(resumePlan - r1.t > 10000 && (r1.headersAt === null || r1.headersAt > resumePlan), `預定恢復（${resumePlan}ms）時重抓（${r1.t}ms 送出、標頭 ${r1.headersAt}ms）沒有等標頭超過 10 秒：${hist(a.f)}`);
        assert.ok(resumePlan - tB > 10000, `B 在 ${tB}ms 才派出，離預定恢復（${resumePlan}ms）不到 10 秒`);
        assert.ok(b && b.t - tB > 5000, `B（${bFile}）派出（${tB}ms）後 ${b ? b.t - tB + 'ms 就' : '一直沒'}到伺服器，沒行使到「別件在排隊」`);
        const trk = S.log.filter((r) => r.kind === 'trickle' && !r.q);
        assert.ok(trk.length === 4 && trk.every((r) => r.aborted === null || r.aborted > resumePlan), `斷續有資料的另四件沒有一直佔著連線到預定恢復：${trk.map((r) => r.f + '[' + hist(r.f) + ']').join(' ')}`);
        // 行為
        assert.ok(a.aborted === null || a.aborted >= resumePlan, `別件排隊時，會恢復的原下載在預定恢復（${resumePlan}ms）前就被中止（${a.aborted}ms）：${hist(a.f)}`);
        assert.ok(slot, `第一次請求後 45 秒內那格（${key}）沒有就緒且看得到：${hist(a.f)}`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('K', 'K：六件原請求佔滿六條連線（這件收過本體後停住、約第 35 秒恢復，另五件斷續有資料）、這件的重抓只能排隊且 16 秒後才會回 404 → 別件還在傳，不中止會恢復的原下載，那格在第一次請求後 45 秒內出現', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = [];
        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); if (order.indexOf(f) === 0) return q ? LATE404 : LONGPAUSE; return q ? NORMAL : TRICKLE; };
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        assert.ok(pf && pf.now && pf.now.length >= 1, '開局沒派今夜預載');
        const nowFiles = [...new Set(pf.now.map(fileOf))], nextFiles = new Set(pf.next.map(fileOf));
        assert.ok(nowFiles.length <= 6, `今夜 ${nowFiles.length} 件，超過 6 件，布不出「六件原請求佔滿六條」`);
        // 另外補幾件（斷續有資料、一直傳不完）湊滿 6 份原請求。用預載事件派：換了世代，明夜批次不會開始
        const extra = fs.readdirSync(path.join(SRV_ROOT, 'assets/creatures')).filter((f) => f.endsWith('.glb') && !/^hand/.test(f) && f !== 'tiger.glb'
          && !nowFiles.includes(f) && !nextFiles.has(f)).sort().slice(0, 6 - nowFiles.length).map((f) => f.replace(/\.glb$/, ''));
        await page.evaluate((now) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now, next: [] } })), [...pf.now, ...extra]);
        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
        const proto = await page.evaluate(() => performance.getEntriesByType('navigation')[0].nextHopProtocol);
        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
        assert.ok(a, '情境沒布好（長停頓那件沒被請求）');
        const key = pf.now.find((k) => fileOf(k) === a.f);
        assert.ok(key, `長停頓那件（${a.f}）不是今夜拍品`);
        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 45000, 250);
        const resumePlan = a.pauseAt + LONGPAUSE.pause;
        await until(() => S.now() > resumePlan, Math.max(0, resumePlan - S.now() + 5000), 250);
        const hist = (f) => S.log.filter((r) => r.f === f).map((r) => (r.q || '-') + '@' + r.t + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
        const openAt = (t) => S.log.filter((r) => r.t <= t && (r.end === null || r.end > t) && (r.aborted === null || r.aborted > t));
        // 活性（只看布置，不看結果）：HTTP/1.x；原下載先收過本體才停；停住 22 秒時（已判卡住、重抓在排隊）伺服器上正好 6 份原請求開著＝六條全佔；
        // 另五件斷續有資料、到預定恢復時都還開著、預定恢復前 20 秒內都有資料（＝佔著名額的不是全都停住）。
        // 預定恢復（停住後 34 秒）晚於「判卡住（約 21 秒）＋排隊 10 秒」，r2 的讓出規則會在這段中止原下載
        assert.match(proto, /^http\/1/i, `頁面不是走 HTTP/1.x（${proto}），沒行使到每主機 6 條連線上限`);
        assert.ok(a.pauseAt !== null && a.bytes > 0, `原下載沒有先收到部分本體就停（bytes=${a.bytes}）`);
        const full = openAt(a.pauseAt + 22000);
        assert.ok(full.length === 6 && full.includes(a) && full.every((r) => !r.q), `停住 22 秒時伺服器上開著的不是 6 份原請求：${full.map((r) => r.f + (r.q || '')).join(' ')}`);
        const trk = S.log.filter((r) => r.kind === 'trickle' && !r.q);
        assert.ok(trk.length === 5 && trk.every((r) => (r.aborted === null || r.aborted > resumePlan) && r.chunks.some((c) => c > resumePlan - 20000 && c <= resumePlan)),
          `另五件沒有一直開著、在預定恢復前 20 秒內有資料：${trk.map((r) => r.f + '[' + hist(r.f) + '] ' + r.chunks.join(',')).join(' ')}`);
        // 行為
        assert.ok(a.aborted === null || a.aborted >= resumePlan, `別件還在傳時，會恢復的原下載在預定恢復（${resumePlan}ms）前就被中止（${a.aborted}ms）：${hist(a.f)}`);
        assert.ok(slot, `第一次請求後 45 秒內那格（${key}）沒有就緒且看得到：${hist(a.f)}`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('H', 'H：40 秒才回標頭、之後沒有本體、別件斷續有資料 → 仍在第一次請求後 43–50 秒重抓（排隊上限從請求開始算，不被標頭重設）', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const order = [];
        S.decide = (f, q) => { if (q) return NORMAL; if (!order.includes(f)) order.push(f); const i = order.indexOf(f); return i === 0 ? LATEHEADERS : i === 1 ? TRICKLE : NORMAL; };
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const a = await until(() => S.log.find((r) => r.kind === 'lateheaders'), 10000);
        const trk = await until(() => S.log.find((r) => r.kind === 'trickle'), 10000);
        assert.ok(a && trk, '情境沒布好（晚標頭／斷續那兩件沒被請求）');
        const retry = await untilBy(S, () => S.log.find((r) => r.f === a.f && /retry=1/.test(r.q)), a.t + 62000, 250);
        assert.ok(a.headersAt !== null, '標頭沒送出，沒行使到「晚到的標頭」');
        assert.ok(retry, `晚標頭那件（${a.f}，${a.t}ms 請求、${a.headersAt}ms 回標頭）62 秒內都沒重抓`);
        const trkRecent = trk.chunks.filter((c) => c <= retry.t).pop();
        assert.ok(trkRecent !== undefined && retry.t - trkRecent < 15000, '重抓當下斷續那件 15 秒內沒資料，沒行使到「別件還有資料」');
        const gap = retry.t - a.t;
        assert.ok(gap >= 43000 && gap <= 50000, `第一次請求後 ${gap}ms 才重抓（有效區間 43000–50000ms）`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('X', 'X：解析永遠不回 → 45 秒後判失敗、不重抓本體；之後再要同一件會重新下載並出現', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        await page.evaluate(() => {
          const sc = document.createElement('script'); sc.type = 'module';
          sc.textContent = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; const P = GLTFLoader.prototype, orig = P.parseAsync;"
            + " window.__hang = { at: null, n: 0 };"
            + " P.parseAsync = function (...a) { window.__hang.n++; if (window.__hang.at !== null) return orig.apply(this, a); window.__hang.at = performance.now(); return new Promise(() => {}); };";
          document.head.appendChild(sc);
        });
        await page.waitForFunction('!!window.__hang', { timeout: 10000 });
        const off = S.now() - (await page.evaluate(() => performance.now())); // 頁內時間 → 伺服器時間
        const t0 = S.now();
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
        let readyAt = null;
        const ready = await untilBy(S, async () => { const s = await slotOf(page, 'bell'); if (s && s.ready) { readyAt = S.now(); return s; } return null; }, t0 + 60000, 250);
        const hang = await page.evaluate(() => window.__hang);
        assert.ok(hang.at !== null, '沒行使到永不回的解析');
        assert.ok(ready, '解析永不回時，60 秒內那格一直沒有收尾（待決承諾留著）');
        assert.equal(ready.visible, false, '解析沒完成，那格卻看得到');
        // v0.66.3（Codex yaoshi-v0.66.2-r3 F7）：從解析開始算，收尾要接近 45 秒上限（過短的上限會讓 35 秒就能完成的解析被判失敗）
        const el = Math.round(readyAt - (hang.at + off));
        assert.ok(el >= 43000 && el <= 50000, `解析開始後 ${el}ms 就收尾（有效區間 43000–50000ms）`);
        assert.deepEqual(S.log.filter((r) => r.f === 'bell.glb').map((r) => r.q), [''], '解析等待期間本體被重抓');
        // 之後再要同一件：要重新下載（快取已清），這次解析正常 → 出現
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([]); window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
        const again = await until(async () => { const s = await slotOf(page, 'bell'); return s && s.ready && s.visible ? s : null; }, 10000);
        assert.equal(S.log.filter((r) => r.f === 'bell.glb').length, 2, '再要同一件時沒有重新下載（還接在舊的待決承諾上）');
        assert.ok(again, '再要同一件後 10 秒內那格沒有出現');
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('F2', 'F2：位元組收齊後解析拖 25 秒 → 不重抓、每個檔只請求一次也只解析一次', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        // 換掉遊戲正在用的同一份 GLTFLoader 模組（importmap 解析，同一個實例）：解析的第一次呼叫拖 25 秒
        await page.evaluate(() => {
          const sc = document.createElement('script'); sc.type = 'module';
          sc.textContent = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; const P = GLTFLoader.prototype, orig = P.parseAsync;"
            + " window.__slow = { at: null, done: null, n: 0 };"
            + " P.parseAsync = function (...a) { window.__slow.n++; if (window.__slow.at !== null) return orig.apply(this, a);"
            + " window.__slow.at = performance.now(); return new Promise((r) => setTimeout(r, 25000)).then(() => orig.apply(this, a)).then((g) => { window.__slow.done = performance.now(); return g; }); };";
          document.head.appendChild(sc);
        });
        await page.waitForFunction('!!window.__slow', { timeout: 10000 });
        const off = S.now() - (await page.evaluate(() => performance.now())); // 頁內時間 → 伺服器時間
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        await until(() => page.evaluate(() => window.__slow.done !== null), 45000, 500);
        await sleep(3000);
        const slow = await page.evaluate(() => window.__slow);
        assert.ok(slow.at !== null && slow.done !== null, `沒行使到慢解析（at=${slow.at} done=${slow.done}）`);
        const slowAt = slow.at + off;
        // 活性：慢解析開始後第 4–20 秒線路上沒有任何資料（舊寫法在第 20 秒時看到「這件 20 秒、整條線路 15 秒以上沒資料」就重抓）
        const busy = S.log.flatMap((r) => r.chunks.filter((c) => c > slowAt + 4000 && c < slowAt + 20000).map((c) => r.f + '@' + c));
        assert.deepEqual(busy, [], `慢解析期間線路沒安靜下來（慢解析從 ${Math.round(slowAt)}ms 開始），沒行使到「線路安靜」`);
        // 取樣點（製作人 2026-11-22 同意，見驗收檔「執行中的修訂」）：明夜批次要等慢解析結束才開始，負載重時檢查那一刻明夜還在下載。
        // 等已發出的下載都結束、解析次數追上下載完的檔數（最多 15 秒）再比；等號不放寬——重複解析只會讓次數更多。
        const completed = () => new Set(S.log.filter((r) => r.end !== null).map((r) => r.f)).size;
        const settled = await until(async () => S.log.every((r) => r.end !== null || r.aborted !== null)
          && (await page.evaluate(() => window.__slow.n)) >= completed(), 15000, 250);
        const n = await page.evaluate(() => window.__slow.n);
        const files = S.log.map((r) => r.f);
        const dup = [...new Set(files.filter((f, i) => files.indexOf(f) !== i))];
        assert.deepEqual(dup, [], `解析拖著時被重抓：${dup.join(',')}（${S.log.filter((r) => dup.includes(r.f)).map((r) => r.f + r.q + '@' + r.t).join(' ')}）`);
        assert.ok(settled, `15 秒內下載沒全部結束或解析沒追上（解析 ${n} 次、下載完 ${completed()} 個檔、未結束 ${S.log.filter((r) => r.end === null && r.aborted === null).map((r) => r.f).join(',')}）`);
        assert.equal(n, completed(), `解析了 ${n} 次，但下載完 ${completed()} 個檔（同一檔解析不只一次）`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    for (const [name, shift] of [['往回撥', -120000], ['往前撥', 120000]]) {
      await sub('F5', `F5：傳到一半停住後系統時鐘${name} 120 秒 → 仍在停住後 18–25 秒重抓`, async () => {
        const errs = [];
        const { ctx, page } = await openGame(browser, S, errs);
        try {
          let first = null;
          S.decide = (f, q) => { if (q) return NORMAL; if (first === null) first = f; return f === first ? PARTIAL : NORMAL; };
          await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
          const hang = await until(() => S.log.find((r) => r.kind === 'partial' && r.last !== null), 10000);
          assert.ok(hang, '情境沒布好（停住那件沒被請求）');
          await until(() => S.now() - hang.last >= 8000 && hang.bytes > 0, 20000, 100);
          const busy = S.log.filter((r) => r !== hang && r.end === null && r.aborted === null);
          assert.deepEqual(busy.map((r) => r.f), [], '撥時鐘當下還有別的下載在跑（要等線路安靜才撥）');
          const jumpAt = S.now();
          await page.evaluate((d) => { const real = Date.now.bind(Date); Date.now = () => real() + d; }, shift);
          const retry = await until(() => S.log.find((r) => r.f === hang.f && /retry=1/.test(r.q)), Math.max(0, hang.last + 40000 - S.now()), 100);
          assert.ok(retry, `時鐘${name}後，停住那件（最後一塊 ${hang.last}ms，${jumpAt}ms 撥鐘）40 秒內都沒重抓`);
          const gap = retry.t - hang.last;
          assert.ok(gap >= 18000 && gap <= 25000, `時鐘${name}後，停住 ${gap}ms 就重抓（有效區間 18000–25000ms）`);
          assert.deepEqual(errs, []);
        } finally { await ctx.close(); }
      });
    }

    await sub('F3', 'F3：托盤一格換貨後舊貨才載入失敗 → 新貨那格不算就緒；沒換貨時失敗仍算就緒', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        S.decide = (f) => (f === 'bell.glb' || f === 'bow.glb' ? HOLD : f === 'chair.glb' ? NF : NORMAL);
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
        assert.ok(await until(() => S.holds.has('bell.glb'), 10000, 50), 'bell 沒被請求');
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bow' }]); });
        assert.ok(await until(() => S.holds.has('bow.glb'), 10000, 50), 'bow 沒被請求');
        S.release('bell.glb', 404);
        await sleep(1500);
        const a = await page.evaluate(() => window.__yaoshi3d.tray.items()[0]);
        assert.equal(S.log.find((r) => r.f === 'bell.glb').status, 404, '舊貨沒有真的回 404（沒行使到失敗回呼）');
        assert.equal(a.key, 'bow', `第 0 格應已換成 bow（${a.key}）`);
        assert.equal(a.ready, false, '舊貨 bell 載入失敗，把已換成 bow、還在下載的那格標成就緒');
        S.release('bow.glb', 200);
        const b = await until(async () => { const s = await slotOf(page, 'bow'); return s && s.ready && s.visible ? s : null; }, 10000);
        assert.ok(b, '放行後 bow 那格 10 秒內沒有就緒且看得到');
        // 沒換貨：這格自己的貨 404 → 照舊標就緒（空著，不擋托盤）
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'chair' }]); });
        const c = await until(async () => { const s = await slotOf(page, 'chair'); return s && s.ready ? s : null; }, 5000);
        assert.ok(c && c.visible === false, `chair 404 後那格應標就緒且看不到（${JSON.stringify(c)}）`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('F6', 'F6：正常線路 → 今夜的模型全部下載完，明夜的才開始', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const pf = await prefetchOf(page);
        const nowFiles = [...new Set(pf.now.map(fileOf))], nextOnly = [...new Set(pf.next.map(fileOf))].filter((f) => !nowFiles.includes(f));
        assert.ok(nowFiles.length > 0 && nextOnly.length > 0, `今夜／明夜（不重複）至少各要 1 件（${nowFiles}｜${nextOnly}）`);
        const done = await until(() => [...nowFiles, ...nextOnly].every((f) => S.log.some((r) => r.f === f && r.end !== null)), 40000);
        assert.ok(done, '40 秒內今夜＋明夜的模型沒全部下載完');
        const todayEnd = Math.max(...nowFiles.map((f) => S.log.find((r) => r.f === f).end));
        const nextStart = Math.min(...nextOnly.map((f) => S.log.find((r) => r.f === f).t));
        assert.ok(nextStart >= todayEnd, `明夜第一件 ${nextStart}ms 就開始下載，今夜最後一件 ${todayEnd}ms 才下載完（明夜拖慢今夜）`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('Y', 'Y：解析 40 秒後才完成（接近 45 秒上限但來得及）→ 那格出現、不重抓本體', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        await page.evaluate(() => {
          const sc = document.createElement('script'); sc.type = 'module';
          sc.textContent = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; const P = GLTFLoader.prototype, orig = P.parseAsync;"
            + " window.__slow40 = { at: null, done: null, n: 0 };"
            + " P.parseAsync = function (...a) { window.__slow40.n++; if (window.__slow40.at !== null) return orig.apply(this, a);"
            + " window.__slow40.at = performance.now(); return new Promise((r) => setTimeout(r, 40000)).then(() => orig.apply(this, a)).then((g) => { window.__slow40.done = performance.now(); return g; }); };";
          document.head.appendChild(sc);
        });
        await page.waitForFunction('!!window.__slow40', { timeout: 10000 });
        const off = S.now() - (await page.evaluate(() => performance.now()));
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
        const at = await until(() => page.evaluate(() => window.__slow40.at), 10000, 100);
        assert.ok(at, '沒行使到慢解析（bell 沒進到解析）');
        const slot = await untilBy(S, async () => { const s = await slotOf(page, 'bell'); return s && s.ready ? s : null; }, at + off + 50000, 250);
        const s40 = await page.evaluate(() => window.__slow40);
        assert.ok(slot, '解析開始後 50 秒內那格一直沒有收尾');
        assert.equal(slot.visible, true, `解析 40 秒後完成，那格卻是空的（被判解析逾時）：${JSON.stringify(slot)}`);
        assert.ok(s40.done !== null && s40.done - s40.at >= 39000, `慢解析沒真的拖到 40 秒（${JSON.stringify(s40)}）`);
        assert.deepEqual(S.log.filter((r) => r.f === 'bell.glb').map((r) => r.q), [''], '解析等待期間本體被重抓');
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('W', 'W：同一件一直斷續有資料時連續 4 次預載 → 舊批次的等待者解除、只留最新一批；45 秒上限放行後也解除', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const url = 'assets/creatures/bell.glb';
        S.decide = (f) => (f === 'bell.glb' ? TRICKLE : NORMAL); // 每 10 秒 2KB：一直在動、不算卡住，也下載不完
        // 派發當下（同步執行預載處理）才計數：window.__thenCnt.on
        const fire = () => page.evaluate(() => { const c = window.__thenCnt; if (c) c.on = true; try { document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now: ['bell'], next: [] } })); } finally { if (c) c.on = false; } });
        await fire(); await sleep(1000);
        // r2 F2：第 1 次預載已建好 bell 的共用下載承諾；之後 3 次派發當下，數對它呼叫 then 的次數（catch／finally／Promise.all 都經過 then）
        const hasShared = await page.evaluate(async (u) => {
          const s = [...document.scripts].find((x) => /\/js\/renderer\.js(\?|$)/.test(x.src));
          const m = await import(new URL('creature-figures.js' + new URL(s.src).search, s.src).href);
          const p = typeof m.glbShared === 'function' ? m.glbShared(u) : null;
          const c = window.__thenCnt = { on: false, all: 0, shared: 0 };
          const orig = window.__thenOrig = Promise.prototype.then;
          Promise.prototype.then = function (...a) { if (c.on) { c.all++; if (p && this === p) c.shared++; } return orig.apply(this, a); };
          return !!p;
        }, url);
        const hasSub = await watchShared(page, url); // r3 F2：第 2 次派發前開始數，數到 45 秒放行後
        for (let i = 1; i < 4; i++) { await fire(); await sleep(1000); }
        const tc = await page.evaluate(() => { Promise.prototype.then = window.__thenOrig; const c = window.__thenCnt; window.__thenCnt = null; return c; });
        const lastAt = S.now();
        const w4 = await cf(page, 'glbWaiters', url);
        assert.equal(w4, 1, `連續 4 次預載後 bell 的共用下載上還掛著 ${w4} 個等待者（只該留最新一批的 1 個）`);
        // 活性：bell 的共用下載承諾在；計數真的開著（派發當下預載處理自己的 Promise.all／race 有經過 then）
        assert.ok(hasShared, '拿不到 bell 的共用下載承諾（治具出口 glbShared）');
        assert.ok(tc.all > 0, `第 2–4 次預載派發當下沒有任何 then 呼叫（${JSON.stringify(tc)}），計數沒行使到`);
        assert.equal(tc.shared, 0, `第 2–4 次預載派發當下對 bell 的共用下載承諾掛了 ${tc.shared} 次 then（取消後這些回呼拆不掉，會隨換夜累積）`);
        const w0 = await untilBy(S, async () => ((await cf(page, 'glbWaiters', url)) === 0 ? true : null), lastAt + 50000, 500);
        const sub = await readShared(page); // r3 F2：到這裡（含 45 秒放行）為止
        assert.ok(hasSub && sub, 'bell 的共用下載承諾沒裝上計數');
        assert.equal(sub.n, 0, `第 2 次預載派發前到放行後，bell 的共用下載承諾被掛了 ${sub.n} 次回呼（取消後拆不掉，會隨換夜累積）：${sub.at.join(' ｜ ')}`);
        assert.deepEqual([sub.ctlThen, sub.ctlAwait], [1, 1], `正對照沒數到（微任務後的 then、await 應各 1 次）：${JSON.stringify(sub)}`);
        const bells = S.log.filter((r) => r.f === 'bell.glb');
        // 活性：整段期間 bell 只有一份共用下載、一直在傳（沒下載完、沒被判卡住重抓、沒被中止）
        assert.equal(bells.length, 1, `bell 被請求 ${bells.length} 次（應只有一份共用下載）：${bells.map((r) => (r.q || '-') + '@' + r.t).join(' ')}`);
        assert.ok(bells[0].end === null && bells[0].aborted === null && bells[0].chunks.length >= 4, `bell 已下載完、被中止或沒在傳（${bells[0].chunks.length} 塊），沒行使到「一直有資料、還沒下載完」`);
        assert.ok(w0, `最新一批等滿 45 秒放行後，bell 上的等待者到 ${lastAt + 50000}ms 仍沒解除（${await cf(page, 'glbWaiters', url)} 個）`);
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('W2', 'W2：明夜批次啟動後換世代 → 舊明夜批次掛在共用下載上的等待者解除，共用下載照舊', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        const url = 'assets/creatures/bell.glb';
        S.decide = (f) => (f === 'bell.glb' ? TRICKLE : NORMAL); // bell 每 10 秒 2KB：一直在動、不算卡住，也下載不完；其餘正常
        const fire = (now, next) => page.evaluate((d) => { document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: d })); }, { now, next });
        const waiters = () => cf(page, 'glbWaiters', url);
        const started = () => until(async () => ((await waiters()) >= 1 ? true : null), 15000, 100);
        // 第 1 世代：今夜 chair 很快下載完 → 明夜 bell 啟動、一直傳不完
        await fire(['chair'], ['bell']);
        const g1 = await started();
        const chairEnd = (S.log.find((r) => r.f === 'chair.glb') || {}).end;
        const w1 = await waiters();
        const hasSub = await watchShared(page, url); // 第 2–5 世代不得再對 bell 的共用承諾掛回呼（明夜路徑也算）
        // 第 2 世代：只有今夜 shield、沒有明夜
        await fire(['shield'], []); await sleep(1000);
        const w2 = await waiters();
        // 第 3 世代：明夜又是 bell → 只掛自己的 1 個
        await fire(['chair'], ['bell']);
        const g3 = await started(); await sleep(500);
        const w3 = await waiters();
        // 第 4 世代（真的換夜：昨夜的明夜變今夜）：舊明夜解除，只剩今夜的 1 個。只看數量；「舊的沒解除、新的沒掛」這種抵銷由第 5 世代的 0 擋。
        // 明夜 flag 是整段沒人要過的模型：今夜 bell 下載不完，換世代後這批作廢，flag 不得被下載
        await fire(['bell'], ['flag']); await sleep(1000);
        const w4 = await waiters();
        // 第 5 世代：不再需要 bell
        await fire(['chair'], []); await sleep(1000);
        const w5 = await waiters();
        const sub = await readShared(page);
        const flags = S.log.filter((r) => r.f === 'flag.glb');
        const bells = S.log.filter((r) => r.f === 'bell.glb');
        // 活性（啟動）：明夜批次真的啟動過，而且是今夜 chair 下載完之後才啟動
        assert.ok(g1, '第 1 世代的明夜批次 15 秒內沒在 bell 上掛等待者，沒行使到');
        assert.equal(w1, 1, `第 1 世代的明夜批次應掛 1 個等待者（${w1}）`);
        assert.ok(chairEnd !== undefined && chairEnd !== null && bells.length > 0 && chairEnd <= bells[0].t, `今夜 chair 沒先下載完（chair 結束 ${chairEnd}、bell 開始 ${bells.length ? bells[0].t : '沒有'}）`);
        assert.equal(w2, 0, `換世代後，舊明夜批次還在 bell 的共用下載上掛著 ${w2} 個等待者`);
        assert.ok(g3, '第 3 世代的明夜批次 15 秒內沒在 bell 上掛等待者，沒行使到');
        assert.equal(w3, 1, `第 3 世代後 bell 上掛著 ${w3} 個等待者（只該有自己的 1 個）`);
        assert.equal(w4, 1, `換夜後 bell 上掛著 ${w4} 個等待者（舊明夜要解除，只該有今夜的 1 個）`);
        assert.equal(w5, 0, `不再需要 bell 之後還掛著 ${w5} 個等待者`);
        assert.ok(hasSub && sub, 'bell 的共用下載承諾沒裝上計數');
        assert.equal(sub.n, 0, `第 2–5 世代對 bell 的共用下載承諾掛了 ${sub.n} 次回呼（取消後拆不掉，會隨換夜累積）：${sub.at.join(' ｜ ')}`);
        assert.deepEqual([sub.ctlThen, sub.ctlAwait], [1, 1], `正對照沒數到（微任務後的 then、await 應各 1 次）：${JSON.stringify(sub)}`);
        assert.equal(flags.length, 0, `換世代後，舊批次還替自己的明夜開了新下載：flag.glb 被請求 ${flags.length} 次`);
        // 活性（共用下載照舊）：整段只有一份請求、沒下載完、沒被中止
        assert.equal(bells.length, 1, `bell 被請求 ${bells.length} 次（應只有一份共用下載）：${bells.map((r) => (r.q || '-') + '@' + r.t).join(' ')}`);
        assert.ok(bells[0].end === null && bells[0].aborted === null, 'bell 已下載完或被中止，沒行使到「共用下載還在進行」');
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });

    await sub('N', 'N：同頁開新局 →「請神入座」從新局自己的第一次市集事件起算；上一局遮罩已結束的新局也重新監看', async () => {
      const errs = [];
      const { ctx, page } = await openGame(browser, S, errs);
      try {
        S.decide = () => HOLD; // 模型一直不回：托盤不會就緒，遮罩只會被 12 秒上限收掉
        await page.evaluate(() => {
          window.__pm = []; const o = pushMarket3d;
          pushMarket3d = function () { window.__pm.push(performance.now()); return o.apply(this, arguments); };
          window.__tl = [];
          new MutationObserver(() => { const on = !!document.getElementById('trayLoad'), l = window.__tl; if (!l.length || l[l.length - 1].on !== on) l.push({ t: performance.now(), on }); })
            .observe(document.body, { childList: true, subtree: true });
        });
        const pnow = () => page.evaluate(() => performance.now());
        const waitUntilPage = (t) => page.waitForFunction((x) => performance.now() >= x, t, { timeout: 60000, polling: 100 });
        const tl = () => page.evaluate(() => window.__tl);
        const isOn = (L, t) => { let on = false; for (const e of L) if (e.t <= t) on = e.on; return on; };
        // 第一局
        const g1 = await pnow();
        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
        const a1 = await toMarketSince(page, g1);
        assert.ok(a1 !== null, '第一局沒走到市集');
        await waitUntilPage(a1 + 6000);
        assert.ok(isOn(await tl(), a1 + 5900), '第一局模型一直不回，遮罩卻沒出現（情境沒布好）');
        // 第二局：在第一局 12 秒上限之前開
        const g2 = await pnow();
        await page.evaluate(() => window.__yaoshi.newGame('solo', 2, ['qingmian']));
        const b1 = await toMarketSince(page, g2);
        assert.ok(b1 !== null, '第二局沒走到市集');
        assert.ok(b1 < a1 + 11000, `第二局第一次市集事件太晚（第一局起算 ${Math.round(b1 - a1)}ms），第一局的 12 秒計時沒落在第二局遮罩期間，沒行使到`);
        await waitUntilPage(b1 + 13500);
        const L2 = (await tl()).filter((e) => e.t >= b1);
        const offIn = L2.filter((e) => !e.on && e.t > b1 + 2000 && e.t < b1 + 11500);
        const off2 = L2.find((e) => !e.on && e.t >= b1 + 2000);
        const fmt = (L, base) => L.map((e) => (e.on ? '+' : '-') + Math.round(e.t - base)).join(' ');
        assert.ok(isOn(await tl(), b1 + 2000), `第二局第一次市集事件後 2 秒遮罩不在（相對第二局：${fmt(L2, b1)}）`);
        assert.deepEqual(offIn.map((e) => Math.round(e.t - b1)), [], `第二局遮罩在自己 12 秒上限前被收掉（相對第二局 ms；第一局起算 ${Math.round(b1 - a1)}ms）`);
        assert.ok(off2 && off2.t - b1 >= 11500 && off2.t - b1 <= 13000, `第二局遮罩收掉的時間不在第二局起算 11500–13000ms（${off2 ? Math.round(off2.t - b1) : '沒收'}）`);
        // 第三局：上一局遮罩已經結束 → 新局要重新監看、再出現
        await waitUntilPage(off2.t + 1000);
        const g3 = await pnow();
        await page.evaluate(() => window.__yaoshi.newGame('solo', 3, ['qingmian']));
        const c1 = await toMarketSince(page, g3);
        assert.ok(c1 !== null, '第三局沒走到市集');
        await waitUntilPage(c1 + 2500);
        const L3 = (await tl()).filter((e) => e.t >= c1);
        const on3 = L3.find((e) => e.on);
        assert.ok(on3 && on3.t - c1 >= 800 && on3.t - c1 <= 2000, `上一局遮罩已結束，第三局第一次市集事件後 0.8–2 秒遮罩沒再出現（相對第三局：${fmt(L3, c1)}）`);
        // 活性：整段模型都沒回（托盤沒就緒），遮罩只會因上限收掉
        assert.equal(await page.evaluate(() => trayReady3d()), false, '托盤已就緒，沒行使到「模型一直沒到」');
        assert.deepEqual(errs, []);
      } finally { await ctx.close(); }
    });
  } finally { await browser.close(); await S.close(); }
});
