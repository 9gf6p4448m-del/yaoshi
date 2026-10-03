// 驗收條件 1／2／3／4 的執行器（條件文字見 acceptance.md，凍結後不改）。
// node lf-cond.mjs <c1|c2a|c2b|c3a|c3c|c4a|c4b|c4c|c4d|c4e> --root <樹> [--port N] [--out file.json]
import fs from 'node:fs';
import { startServer, withBrowser, openPage, startSolo, advanceToBid, trayState, expectState, lfDump, median, arg } from './lf-lib.mjs';
const cond = process.argv[2], root = arg('--root'), port = Number(arg('--port', 9881)), OUT = arg('--out', null);
const SEED = 9, BASE_URL = `http://127.0.0.1:${port}/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = await startServer(root, port);
const result = { cond, root, pass: null, detail: {} };
const waitPageTime = (page, t) => page.waitForFunction((x) => performance.now() >= x, t, { timeout: 120000, polling: 20 });

/* 共用：開頁→（可選等 renderer 就緒）→solo→到出價頁→（可選人類下一標）。回傳 {page, ...}。 */
async function setup(ctx, o = {}) {
  const P = await openPage(ctx, { url: BASE_URL + (o.query || ''), net: o.net, cpu: o.cpu, delayRenderer: o.delay || 0, hangRenderer: o.hang || null });
  if (o.preReady) await P.page.waitForFunction('window.__yaoshi3d && window.__yaoshi3d.tray', null, { timeout: 120000 });
  await startSolo(P.page, SEED);
  P.bidReached = await advanceToBid(P.page);
  if (o.bid) { await P.page.evaluate(() => { openSheet(0); bump(1); bump(1); closeSheet(); }); P.myBids = await expectState(P.page); }
  return P;
}
const lfNow = (page) => lfDump(page);
async function readyThenSample(P, afterMs) {
  await P.page.waitForFunction('window.__lf.trayDefAt !== null', null, { timeout: 120000, polling: 20 });
  const L = await lfNow(P.page);
  const out = { trayDefAt: L.trayDefAt, marketAt: L.marketAt, samples: {} };
  for (const d of afterMs) { await waitPageTime(P.page, L.trayDefAt + d); out.samples[d] = { st: await trayState(P.page), exp: await expectState(P.page) }; }
  return out;
}

try {
  if (cond === 'c1') {
    await withBrowser(async (ctx) => {
      const P = await setup(ctx, { delay: 5000 });
      const r = await readyThenSample(P, [1500, 4000]);
      const s15 = r.samples[1500], s40 = r.samples[4000];
      const okState = (s) => s.st.trayDef && s.st.n === 4 && s.st.keys.every((k) => k !== null) && JSON.stringify(s.st.keys) === JSON.stringify(s.exp.marketKeys);
      Object.assign(result.detail, { bidReachedBeforeRenderer: P.bidReached && r.marketAt < r.trayDefAt, marketAt: r.marketAt, trayDefAt: r.trayDefAt, at1500: s15.st.keys, at4000: s40.st.keys, expected: s15.exp.marketKeys, errs: P.errs });
      result.pass = result.detail.bidReachedBeforeRenderer && okState(s15);
      result.detail.at4000ok = okState(s40);
    });
  } else if (cond === 'c2a' || cond === 'c2b') {
    await withBrowser(async (ctx) => {
      const P = await setup(ctx, cond === 'c2a' ? { preReady: true, bid: arg('--bid', '0') === '1' } : { delay: 5000, bid: true });
      if (cond === 'c2a') { await P.page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n; }, null, { timeout: 60000 }); await sleep(2500); result.detail.st = await trayState(P.page); result.detail.exp = await expectState(P.page); result.detail.errs = P.errs; result.pass = null; }
      else {
        const r = await readyThenSample(P, [1500]); const st = r.samples[1500].st;
        const row = (st.bids || []).find((b) => b.seat === P.myBids.active && b.slot === 0);
        Object.assign(result.detail, { bidReachedBeforeRenderer: r.marketAt < r.trayDefAt, myBids: P.myBids.myBids, active: P.myBids.active, bids: st.bids, chips: st.chips, tokens: st.tokens, errs: P.errs });
        result.pass = !!row && row.want === 2 && row.on === 2;
      }
    });
  } else if (cond === 'c3a' || cond === 'c3c') {
    // c3a：一局冷快取（無節流）每個 modulepreload href 恰被請求 1 次；c3c：Fast4G 冷快取「renderer 就緒」秒數
    const runs = Number(arg('--runs', cond === 'c3c' ? 3 : 1)), nums = [];
    for (let i = 0; i < runs; i++) {
      await withBrowser(async (ctx) => {
        const P = await openPage(ctx, { url: BASE_URL, net: cond === 'c3c' ? 'fast4g' : 'none' });
        if (cond === 'c3a') { await P.page.waitForFunction('window.__yaoshi3d && window.__yaoshi3d.tray', null, { timeout: 120000 }); await startSolo(P.page, SEED); await advanceToBid(P.page); await P.page.waitForFunction(() => window.__yaoshi3d.tray.readyCount() >= window.__yaoshi.S.market.length, null, { timeout: 60000 }); await sleep(1500); }
        else await P.page.waitForFunction('window.__lf.trayDefAt !== null', null, { timeout: 180000, polling: 50 });
        const L = await lfNow(P.page); nums.push(Math.round(L.trayDefAt) / 1000);
        if (cond === 'c3a') {
          const links = await P.page.evaluate(() => [...document.querySelectorAll('link[rel=modulepreload]')].map((l) => l.href));
          const count = {}; P.reqs.forEach((r) => { count[r.url] = (count[r.url] || 0) + 1; });
          const perLink = links.map((h) => [h.replace(BASE_URL.replace('index.html', ''), ''), count[h] || 0]);
          const rend = P.reqs.filter((r) => /\/js\/renderer\.js/.test(r.url)).map((r) => r.url);
          const sufLinks = links.filter((h) => /\/js\/renderer\.js/.test(h)).map((h) => h.split('?')[1]);
          const nonPre = [...new Set(P.reqs.map((r) => r.url))].filter((u) => /\/js\/|unpkg/.test(u) && !links.includes(u));
          Object.assign(result.detail, { nLinks: links.length, perLink, rendererRequests: rend, rendererLinkSuffix: sufLinks, notPreloadedJsRequests: nonPre, errs: P.errs });
          result.pass = links.length > 0 && perLink.every(([, c]) => c === 1) && rend.length === 1 && sufLinks.length === 1 && rend[0].endsWith('?' + sufLinks[0]);
        }
      });
    }
    if (cond === 'c3c') { result.detail.rendererReadySeconds = nums; result.detail.median = median(nums); }
  } else if (cond === 'c4a') {
    await withBrowser(async (ctx) => {
      const P = await setup(ctx, { delay: 5000 });
      await P.page.waitForFunction('window.__lf.allReadyAt !== null', null, { timeout: 120000, polling: 50 }); await sleep(800);
      const L = await lfNow(P.page); const add = L.ov.find((e) => e.ev === 'add'), rm = L.ov.find((e) => e.ev === 'rm');
      const t0 = L.marketAt;
      Object.assign(result.detail, { t0, addAfterT0: add && add.t - t0, text: add && add.text, presentAt1s: !!add && add.t <= t0 + 1000 && (!rm || rm.t > t0 + 1000), rmAfterReady: rm && rm.t - L.allReadyAt, allReadyAt: L.allReadyAt, trayDefAt: L.trayDefAt, ov: L.ov, errs: P.errs, bidBeforeRenderer: t0 < L.trayDefAt });
      result.pass = !!add && !!rm && add.t - t0 >= 300 && result.detail.presentAt1s && /請神入座/.test(add.text) && rm.t - L.allReadyAt <= 500 && rm.t >= L.allReadyAt - 1 && result.detail.bidBeforeRenderer;
    });
  } else if (cond === 'c4b') {
    await withBrowser(async (ctx) => {
      const P = await setup(ctx, { hang: arg('--hang', 'hang') });
      const L0 = await lfNow(P.page); const t0 = L0.marketAt; await waitPageTime(P.page, t0 + 5000);
      const mid = await P.page.evaluate(() => { const o = document.getElementById('trayLoad'), b = document.getElementById('mainbtn'); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { present: !!o, pe: o && getComputedStyle(o).pointerEvents, hitMain: !!e && (e === b || b.contains(e)), text0: b.textContent }; });
      await P.page.evaluate(() => document.getElementById('mainbtn').click()); // DOM click：Playwright 滑鼠點擊在基準 f8c32942 同樣不觸發 #mainbtn（已實測），故改用治具慣用的 .click()；「不被遮住」由上面 elementFromPoint＋pointer-events 證明
      await sleep(600);
      mid.leftBidPage = await P.page.evaluate(() => BIDS_OPEN === false && !!S.humanBids[ACTIVE]); // 封標已被收下（submitHumanBids 把 BIDS_OPEN 關掉並寫入 humanBids）
      await P.page.waitForFunction('window.__lf.ov.some(e=>e.ev==="rm")', null, { timeout: 30000, polling: 50 }); await sleep(1000);
      const L = await lfNow(P.page); const add = L.ov.find((e) => e.ev === 'add'), rm = L.ov.find((e) => e.ev === 'rm');
      Object.assign(result.detail, { t0, addAfterT0: add && add.t - t0, rmAfterT0: rm && rm.t - t0, mid, trayDefAt: L.trayDefAt, errs: P.errs.concat(L.errs) });
      result.pass = !!add && !!rm && rm.t - t0 >= 11000 && rm.t - t0 <= 13000 && mid.present && mid.pe === 'none' && mid.hitMain && !mid.clickErr && mid.leftBidPage && P.errs.length === 0 && L.errs.length === 0 && L.trayDefAt === null;
    });
  } else if (cond === 'c4c') {
    await withBrowser(async (ctx) => {
      const P = await setup(ctx, { preReady: true });
      await sleep(3000); const L = await lfNow(P.page);
      Object.assign(result.detail, { ov: L.ov, marketAt: L.marketAt, allReadyAt: L.allReadyAt, readyAfterT0: L.allReadyAt - L.marketAt, errs: P.errs });
      result.pass = L.ov.filter((e) => e.ev === 'add').length === 0;
    });
  } else if (cond === 'c4d') {
    const res = {};
    for (const q of ['?table3d=0', '?tray3d=0']) {
      await withBrowser(async (ctx) => {
        const P = await setup(ctx, { delay: 5000, query: q });
        await sleep(8000); const L = await lfNow(P.page);
        res[q] = { bidReached: P.bidReached, adds: L.ov.filter((e) => e.ev === 'add').length, marketAt: L.marketAt, trayDefAt: L.trayDefAt, errs: P.errs };
      });
    }
    result.detail = res; result.pass = Object.values(res).every((r) => r.bidReached && r.adds === 0);
  } else if (cond === 'c4e') {
    const res = {};
    for (const [name, w, h, safe] of [['844x390', 844, 390, [0, 47, 21, 47]], ['852x393', 852, 393, [0, 59, 21, 59]]]) {
      await withBrowser(async (ctx) => {
        const P = await setup(ctx, { delay: 5000 });
        await P.page.waitForFunction('document.getElementById("trayLoad")', null, { timeout: 20000, polling: 30 }); await sleep(300);
        res[name] = await P.page.evaluate(([vw, vh, sf]) => {
          const el = document.getElementById('trayLoad'), r = el.getBoundingClientRect();
          const inside = r.left >= sf[3] && r.right <= vw - sf[1] && r.top >= sf[0] && r.bottom <= vh - sf[2];
          const kids = [el, ...el.querySelectorAll('*')].map((k) => ({ tag: k.tagName, cls: k.className, sw: k.scrollWidth, cw: k.clientWidth, sh: k.scrollHeight, ch: k.clientHeight, ok: k.scrollWidth <= k.clientWidth && k.scrollHeight <= k.clientHeight }));
          return { rect: [r.left, r.top, r.right, r.bottom].map((x) => Math.round(x * 10) / 10), safeRect: [sf[3], sf[0], vw - sf[1], vh - sf[2]], inside, text: el.textContent, kids, noTrunc: kids.every((k) => k.ok), pe: getComputedStyle(el).pointerEvents };
        }, [w, h, safe]);
        res[name].errs = P.errs;
      }, { width: w, height: h, safe });
    }
    result.detail = res; result.pass = Object.values(res).every((r) => r.inside && r.noTrunc && r.errs.length === 0);
  } else throw new Error('unknown cond ' + cond);
} catch (e) { result.error = String(e.stack || e); }
srv.close();
const txt = JSON.stringify(result, null, 1);
if (OUT) fs.writeFileSync(OUT, txt);
console.log(txt);
process.exit(0);
