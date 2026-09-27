// v0.59.1 開卡停靠卷，凍結 docs/experiments/2026-09-27-acceptance-card-dock-font.md #1/#2/#8。
// 全模式矩陣：V1–V5 × solo/hot/nw1/nw2/nw3，出價／盯上兩態，每一夜逐籤展開。
// 用法：node tests/tools/card-dock-probe.mjs [--vps V1,V2,V3,V4,V5] [--modes solo,hot,nw1,nw2,nw3] [--seed 3] [--out <dir>] [--port N]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-27-card-dock-font')));
const SEED = Number(arg('--seed', 3));
const PORT = Number(arg('--port', 9664));
const VPS = arg('--vps', 'V1,V2,V3,V4,V5').split(',');
const MODES = arg('--modes', 'solo,hot,nw1,nw2,nw3').split(',');
fs.mkdirSync(OUT, { recursive: true });

const VP = {
  V1: { w: 852, h: 393, safe: [0, 59, 21, 59] },
  V2: { w: 932, h: 430, safe: [0, 59, 21, 59] },
  V3: { w: 844, h: 390, safe: [0, 47, 21, 47] },
  V4: { w: 667, h: 375, safe: [0, 0, 0, 0] },
  V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] },
};

const PAGE_LIB = String.raw`
window.__tf = {
  screen(){
    const $ = (id) => document.getElementById(id);
    const on = (id) => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none'; };
    if (on('review')) return 'review';
    if (on('duel')) return 'duel';
    if (on('sheet')) return 'bag';
    if (on('modal')) return 'modal';
    if (on('handoff')) return 'handoff';
    const nw = $('nwScr'); if (nw && nw.classList.contains('on')) return 'nw-' + nw.dataset.view;
    const sel = $('selectScr'); if (sel && sel.classList.contains('on')) return 'select';
    if (on('titleScr')) return 'title';
    if (!on('table')) return 'none';
    const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
    if (/不盯任何一件/.test(t)) return 'mark';
    if (/^蓋牌/.test(t) && !dis) return 'bid';
    if (/下一件拍品|查看成交總覽/.test(t)) return 'reveal';
    if (/請神/.test(t)) return dis ? 'shrine-run' : 'shrine';
    if (/^開戰/.test(t) && !dis) return 'reveal-result';
    if (/進入下一夜|看最終結果/.test(t) && !dis) return 'night-end';
    if (/前往拍賣/.test(t) && !dis) return 'event-result';
    if (/再入妖市|回章節選單/.test(t)) return 'end';
    if (/^蓋牌/.test(t) && dis) return 'reveal';
    return 'busy:' + t.slice(0, 8);
  },
};
`;

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const scr = (page) => page.evaluate(() => window.__tf.screen());
const DRIVE_STEP = `(() => {
  const ho = document.getElementById('handoff');
  if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && /看最終結果/.test(txt) && !dis) return 2;
  if (b && !dis) { b.click(); return 0; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return 0; }
  }
  return 1;
})()`;

async function newCtx(vp, query = '') {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  await ctx.addInitScript(PAGE_LIB);
  await ctx.addInitScript((safe) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.id = '__safe';
      s.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`;
      document.head.appendChild(s);
    });
  }, vp.safe);
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__tf', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  return { ctx, page };
}
const pickFirstRole = async (page) => {
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(80);
};
async function driveToFirst(page, targetSet, cap = 4000) {
  for (let i = 0; i < cap; i++) {
    await page.waitForTimeout(8);
    const cls = await scr(page);
    if (targetSet.has(cls)) return cls;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return null;
  }
  return null;
}

/* 逐夜跑到 bid/mark 後在那一格量測 #1/#2/#8：安全區、四個錨點矩形、逐籤開卡的卡矩形／3D 投影框重疊、
   關閉鈕命中區、卡內容 vs mcardHTML() 參考版、以及 8×8 像素噪音底線 vs 開卡後像素差（#8 亮一下）。 */
async function testDockAtScreen(page, vp, vname, mode, round, results) {
  await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 10000 }).catch(() => { results.notes.push(`${mode}|${vname} round${round} __yaoshi3d.tray 逾時未就緒`); });
  const safePx = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const n = (v) => parseFloat(v) || 0;
    return { top: n(cs.getPropertyValue('--safe-top')), right: n(cs.getPropertyValue('--safe-right')), bottom: n(cs.getPropertyValue('--safe-bottom')), left: n(cs.getPropertyValue('--safe-left')) };
  });
  const anchorRects = await page.evaluate(() => {
    const R = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 || r.height > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
    return { north: R('#north'), westSeat: R('#westSeat'), eastSeat: R('#eastSeat'), south: R('#south'), helpBtn: R('#helpBtn'), railTabsW: R('#railW .railTabs'), railTabsE: R('#railE .railTabs') };
  });
  /* 3D 拍品模型要全部到位才量（否則投影框／姿態全是 null，#1 會因「沒有可比的框」而靜默通過）。 */
  const ready = await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n; }, null, { timeout: 90000 }).then(() => true).catch(() => false);   /* 90s：同機另有 session 跑瀏覽器時 GLB 載入實測超過 30s（量不到一律判紅，放寬等待不會讓壞實作過） */
  if (!ready) results.notes.push(`${mode}|${vname} round${round} 3D 拍品 90s 內未全部就緒`);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
  if (!tabs.length) { results.notes.push(`${mode}|${vname} round${round} 沒有窄籤可點（市集空）`); return; }
  const allSlots = await page.evaluate(() => window.__yaoshi3d.tray.items().filter((it) => it.visible).map((it) => it.slot));
  const clipOf = (bbox) => { if (!bbox) return null; const x = Math.max(0, Math.floor(bbox.left)), y = Math.max(0, Math.floor(bbox.top)); const w = Math.max(1, Math.ceil(bbox.right) - x), h = Math.max(1, Math.ceil(bbox.bottom) - y); return { x, y, width: Math.min(w, vp.w - x), height: Math.min(h, vp.h - y) }; };
  const shotAll = async () => { const out = {}; for (const i of allSlots) { const bb = await page.evaluate((i) => window.__yaoshi3d.tray.bboxScreen(i), i); const c = clipOf(bb); if (c && c.width > 0 && c.height > 0) out[i] = await page.screenshot({ clip: c }); } return out; };
  const noise0 = await shotAll(); await page.waitForTimeout(250); const noise1 = await shotAll();
  const noiseDiff = {}; for (const i of allSlots) if (noise0[i] && noise1[i]) noiseDiff[i] = !noise0[i].equals(noise1[i]);
  for (const t of tabs) {
    const before = await page.evaluate(([r, s]) => ({ hover: window.__yaoshi3d.tray.hover(), bbox: window.__yaoshi3d.tray.bboxScreen(Number(s)), outlines: window.__yaoshi3d.tray.items()[Number(s)].outlines, pose: window.__yaoshi3d.tray.pose(Number(s)) }), [t.rail, t.slot]);
    const headBefore = await page.evaluate(() => { const e = document.getElementById('feltHead'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; });
    const beforeShots = await shotAll();
    await page.evaluate(([r, s]) => document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]').click(), [t.rail, t.slot]);
    await page.waitForTimeout(500);
    const afterShots = await shotAll();
    const pixelDiff = {}; for (const i of allSlots) if (beforeShots[i] && afterShots[i]) pixelDiff[i] = !beforeShots[i].equals(afterShots[i]);
    const after = await page.evaluate(([r, s]) => {
      const card = document.querySelector('#' + r + ' .railPages');
      const cr = card ? card.getBoundingClientRect() : null;
      const close = card ? card.querySelector('.railCardClose') : null;
      const cbtn = close ? close.getBoundingClientRect() : null;
      const bbox = window.__yaoshi3d.tray.bboxScreen(Number(s));
      const hover = window.__yaoshi3d.tray.hover();
      const outlines = window.__yaoshi3d.tray.items()[Number(s)].outlines;
      const glow = window.__yaoshi3d.tray.items()[Number(s)].glow;
      const pose = window.__yaoshi3d.tray.pose(Number(s));
      const otherBoxes = {}; for (const it of window.__yaoshi3d.tray.items()) if (it.visible && it.slot !== Number(s)) otherBoxes[it.slot] = window.__yaoshi3d.tray.bboxScreen(it.slot);
      const otherOutlines = {}; for (const it of window.__yaoshi3d.tray.items()) if (it.slot !== Number(s)) otherOutlines[it.slot] = it.outlines + (it.glow > 1 ? 1 : 0);
      let refTxt = null, refErr = null;
      /* 盯上等階段 myBids 可能還沒為這一格建好（詛咒品曾因此丟例外、參考文字變 null 而沒被比對）：
         暫補遊戲自己在開市時用的預設出價物件，算完即移除，不改遊戲狀態。 */
      const si = Number(s), tmpBid = myBids[si] === undefined;
      if (tmpBid) myBids[si] = { amt: 0, type: 'cons', intent: 'keep', target: null };
      try { const tmp = document.createElement('div'); tmp.innerHTML = (TRAY_PHASE === 'mark' ? markCardHTML : mcardHTML)(S.market[si], si);   /* 與 fillRails 當階段用的同一支卡片函式：盯上階段是 markCardHTML（刻意不顯示 AI 盯了誰） */ refTxt = (tmp.textContent || '').replace(/\s+/g, ''); } catch (e) { refErr = e.message; }
      finally { if (tmpBid) delete myBids[si]; }
      const cardMcard = card ? card.querySelector('.railSelected') : null;
      const liveTxt = cardMcard ? (cardMcard.textContent || '').replace(/\s+/g, '') : '';
      return { cardRect: cr ? { left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom } : null, closeBtnRect: cbtn ? { w: cbtn.width, h: cbtn.height } : null, bbox, otherBoxes, otherOutlines, hover, outlines, glow, pose, refTxt, refErr, liveTxt, textMatch: refTxt == null ? null : refTxt === liveTxt };
    }, [t.rail, t.slot]);
    if (process.env.CD_SHOT === mode && t === tabs[0]) fs.writeFileSync(path.join(OUT, `shot-${mode}-${vname}-r${round}.png`), await page.screenshot());
    if (vname === 'V1' && mode === 'solo' && round === 0 && t === tabs[0]) {
      fs.writeFileSync(path.join(OUT, 'contact-bid-open-head-V1.png'), await page.screenshot());
    }
    // #8 二次裁定：「整段開卡期間」不只驗開卡那一刻，多等一段（另外 800ms）再量一次姿態，
    // 確認真的是「只亮不動」而不是恰好在取樣瞬間經過基準姿態。
    await page.waitForTimeout(800);
    const poseHold = await page.evaluate(([r, s]) => window.__yaoshi3d.tray.pose(Number(s)), [t.rail, t.slot]);
    await page.evaluate(([r, s]) => document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]').click(), [t.rail, t.slot]);
    await page.waitForTimeout(200);
    const afterClose = await page.evaluate(([r, s]) => ({ hover: window.__yaoshi3d.tray.hover(), outlines: window.__yaoshi3d.tray.items()[Number(s)].outlines, cardGone: !document.querySelector('#' + r + '.open'), glow: window.__yaoshi3d.tray.items()[Number(s)].glow, head: (() => { const e = document.getElementById('feltHead'); if (!e) return null; const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; })() }), [t.rail, t.slot]);
    results.rows.push({ mode, vp: vname, vpW: vp.w, vpH: vp.h, headBefore, round, rail: t.rail, slot: t.slot, before, after, poseHold, afterClose, anchorRects, safePx, pixelDiff, noiseDiff, allSlots });
  }
}

async function runRegular(mode, vname, vp, results) {
  const { ctx, page } = await newCtx(vp);
  try {
    await page.evaluate((m) => startEntry(m), mode === 'hot' ? 'hotseat' : 'solo');
    await pickFirstRole(page);
    if (mode === 'hot') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pickFirstRole(page); }
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, mode === 'hot' ? 'hotseat' : 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    for (let round = 0; round < 2; round++) {
      const cls = await driveToFirst(page, new Set(['bid', 'mark']));
      if (!cls) { results.notes.push(`${mode}|${vname} round${round} 沒進到 bid/mark（局提早結束）`); break; }
      await testDockAtScreen(page, vp, vname, mode, round, results);
    }
  } catch (e) { results.notes.push(`${mode}|${vname} 例外：${e.message}`); }
  finally { await ctx.close().catch(() => {}); }
}

async function runNw(ch, vname, vp, results) {
  // ?nwall=1：章節開放預設「第一章恆開、通過前一章才開下一章」（凍結 #6），治具沒有真的破關過，
  // 不加這個查詢參數 nw2/nw3 一律鎖住點不到（同 visual-polish-probe.mjs 的 runNw 用法）。
  // 進場流程照 visual-polish-probe.mjs runNw 的既有走法：點章節卡的按鈕進「intro」畫面 → 點 #nwGo
  // →（跟常規局一樣）選角 → newGame(...,{chapter}) —— 不是點 .nwCard 本身就會開局。
  const { ctx, page } = await newCtx(vp, '?nwall=1');
  try {
    await page.evaluate(() => startEntry('nightwalk'));
    await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'menu');
    await page.waitForTimeout(150);
    const ok = await page.evaluate((c) => { const b = document.querySelector(`#nwScr .nwCard[data-ch="${c}"] .nwBtns button`); if (b) { b.click(); return true; } return false; }, ch);
    if (!ok) { results.notes.push(`nw${ch}|${vname} 章節鎖住或找不到，跳過`); return; }
    await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'intro', null, { timeout: 15000 });
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('nwGo').click());
    await pickFirstRole(page);
    await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', sd, SEL.picks, { chapter: SEL.chapter }); }, SEED);
    await page.waitForFunction((c) => window.__yaoshi.S && window.__yaoshi.S.chapter === c, ch);
    for (let round = 0; round < 2; round++) {
      const cls = await driveToFirst(page, new Set(['bid', 'mark']));
      if (!cls) { results.notes.push(`nw${ch}|${vname} round${round} 沒進到 bid/mark（章節提早結束或無市集）`); break; }
      await testDockAtScreen(page, vp, vname, 'nw' + ch, round, results);
    }
  } catch (e) { results.notes.push(`nw${ch}|${vname} 例外：${e.message}`); }
  finally { await ctx.close().catch(() => {}); }
}

const results = { rows: [], notes: [] };
for (const mode of MODES) {
  for (const vname of VPS) {
    const vp = VP[vname];
    const before = results.rows.length;
    if (mode === 'solo' || mode === 'hot') await runRegular(mode, vname, vp, results);
    else { const ch = Number(mode.replace('nw', '')); await runNw(ch, vname, vp, results); }
    console.error('[card-dock]', mode, vname, 'rows+=', results.rows.length - before);
  }
}

await browser.close();
srv.kill();
fs.writeFileSync(path.join(OUT, 'card-dock-raw.json'), JSON.stringify(results, null, 1));
console.log('寫入', path.join(OUT, 'card-dock-raw.json'), '總格數', results.rows.length, 'notes', results.notes.length);
