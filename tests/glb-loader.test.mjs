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
// 時間一律用伺服器端（Node）的時鐘量，頁內校時影響不到量測。
// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

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
async function openGame(browser, S, errs) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
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

test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗回呼核對身分、明夜等今夜下載完', { timeout: 600000 }, async (t) => {
  const { chromium } = loadPlaywright();
  const S = await startServer();
  const browser = await chromium.launch();
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
        assert.ok(tomorrow && tomorrow.t - t0 <= 50000, `明夜批次開局後 ${tomorrow ? tomorrow.t - t0 + 'ms' : '62 秒內都沒'}才開始（上限 50000ms）`);
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
        const t0 = S.now();
        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
        const ready = await untilBy(S, async () => { const s = await slotOf(page, 'bell'); return s && s.ready ? s : null; }, t0 + 60000, 250);
        const hang = await page.evaluate(() => window.__hang);
        assert.ok(hang.at !== null, '沒行使到永不回的解析');
        assert.ok(ready, '解析永不回時，60 秒內那格一直沒有收尾（待決承諾留著）');
        assert.equal(ready.visible, false, '解析沒完成，那格卻看得到');
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
        const files = S.log.map((r) => r.f);
        // 活性：慢解析開始後第 4–20 秒線路上沒有任何資料（舊寫法在第 20 秒時看到「這件 20 秒、整條線路 15 秒以上沒資料」就重抓）
        const busy = S.log.flatMap((r) => r.chunks.filter((c) => c > slowAt + 4000 && c < slowAt + 20000).map((c) => r.f + '@' + c));
        assert.deepEqual(busy, [], `慢解析期間線路沒安靜下來（慢解析從 ${Math.round(slowAt)}ms 開始），沒行使到「線路安靜」`);
        const dup = [...new Set(files.filter((f, i) => files.indexOf(f) !== i))];
        assert.deepEqual(dup, [], `解析拖著時被重抓：${dup.join(',')}（${S.log.filter((r) => dup.includes(r.f)).map((r) => r.f + r.q + '@' + r.t).join(' ')}）`);
        assert.equal(slow.n, new Set(files).size, `解析了 ${slow.n} 次，但只下載了 ${new Set(files).size} 個檔（同一檔解析不只一次）`);
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
  } finally { await browser.close(); await S.close(); }
});
