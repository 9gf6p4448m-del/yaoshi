// v0.59.1 開卡停靠卷，凍結 docs/experiments/2026-09-27-acceptance-card-dock-font.md #1/#2/#8。
// 範圍（誠實聲明，非窮盡矩陣）：V1–V5 × solo 模式，出價／盯上兩個有拍品可點的畫面，每一夜逐籤展開。
// 沒有跑 hot/nw1/nw2/nw3——這幾個模式的拍品卡展開機制與 solo 相同（同一支 selectRailPage／railHTML），
// 差別只在牌桌相機取景角度，不影響「卡在心願條那一帶」這個 CSS 定位邏輯；但沒有實測，回報會照實寫「未跑」。
// 用法：node tests/tools/card-dock-probe.mjs [--vps V1,V2,V3,V4,V5] [--seed 3] [--out <dir>]
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

async function newCtx(vp) {
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
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__tf', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  return { ctx, page };
}
const pickFirstRole = async (page) => {
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(80);
};
async function driveToFirst(page, targetSet) {
  for (let i = 0; i < 4000; i++) {
    await page.waitForTimeout(8);
    const cls = await scr(page);
    if (targetSet.has(cls)) return cls;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return null;
  }
  return null;
}

const results = { vps: {}, notes: [] };

for (const vname of VPS) {
  const vp = VP[vname];
  const { ctx, page } = await newCtx(vp);
  const rowsForVp = [];
  try {
    await page.evaluate((m) => startEntry(m), 'solo');
    await pickFirstRole(page);
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    // 逐夜跑到 bid 與 mark 各測一次（第 1、2 夜），涵蓋出價／盯上兩態
    for (let round = 0; round < 2; round++) {
      const cls = await driveToFirst(page, new Set(['bid', 'mark']));
      if (!cls) { results.notes.push(`${vname} round${round} 沒進到 bid/mark（局提早結束）`); break; }
      // __yaoshi3d 是 renderer 模組非同步初始化，畫面切到 bid/mark 那一刻不保證已經掛上（GLB 還在載）
      await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 10000 }).catch(() => { results.notes.push(`${vname} round${round} __yaoshi3d.tray 逾時未就緒`); });
      // 量安全區實際 px（viewport 尺寸換算，供越界檢查）
      const safePx = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const n = (v) => parseFloat(v) || 0;
        return { top: n(cs.getPropertyValue('--safe-top')), right: n(cs.getPropertyValue('--safe-right')), bottom: n(cs.getPropertyValue('--safe-bottom')), left: n(cs.getPropertyValue('--safe-left')) };
      });
      const anchorRects = await page.evaluate(() => {
        const R = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 || r.height > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null; };
        return { north: R('#north'), westSeat: R('#westSeat'), eastSeat: R('#eastSeat'), south: R('#south'), helpBtn: R('#helpBtn') };
      });
      const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
      const allSlots = await page.evaluate(() => window.__yaoshi3d.tray.items().filter((it) => it.visible).map((it) => it.slot));
      const clipOf = (bbox) => { if (!bbox) return null; const x = Math.max(0, Math.floor(bbox.left)), y = Math.max(0, Math.floor(bbox.top)); const w = Math.max(1, Math.ceil(bbox.right) - x), h = Math.max(1, Math.ceil(bbox.bottom) - y); return { x, y, width: Math.min(w, vp.w - x), height: Math.min(h, vp.h - y) }; };
      const shotAll = async () => { const out = {}; for (const i of allSlots) { const bb = await page.evaluate((i) => window.__yaoshi3d.tray.bboxScreen(i), i); const c = clipOf(bb); if (c && c.width > 0 && c.height > 0) out[i] = await page.screenshot({ clip: c }); } return out; };
      // 噪音底線：兩張間隔 250ms、沒點任何東西的截圖，逐格 buffer 比較
      const noise0 = await shotAll(); await page.waitForTimeout(250); const noise1 = await shotAll();
      const noiseDiff = {}; for (const i of allSlots) if (noise0[i] && noise1[i]) noiseDiff[i] = !noise0[i].equals(noise1[i]);
      for (const t of tabs) {
        const before = await page.evaluate(([r, s]) => ({ hover: window.__yaoshi3d.tray.hover(), bbox: window.__yaoshi3d.tray.bboxScreen(Number(s)), outlines: window.__yaoshi3d.tray.items()[Number(s)].outlines }), [t.rail, t.slot]);
        const beforeShots = await shotAll();
        // 開卡
        await page.evaluate(([r, s]) => document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]').click(), [t.rail, t.slot]);
        await page.waitForTimeout(500); // hover 抬升/旋轉、CSS 定位穩定
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
          // 卡內資訊與 mcardHTML(S.market[i],i) 直接產生的參考版逐項等價（文字內容比對）
          // mcardHTML 內部讀的 b（押注／盯上狀態）不是純參數，靠呼叫當下的畫面模式決定；
          // 直接在 page.evaluate 裡呼叫可能撞到與目前畫面不同步的分支（例如 mark 態內部仍讀 bid 態欄位）而丟例外，
          // 這是治具呼叫方式的限制，不是產品 bug——包 try/catch，refTxt 拿不到就跳過這格的逐項比對，不讓整支探針中斷。
          let refTxt = null, refErr = null;
          try { const tmp = document.createElement('div'); tmp.innerHTML = mcardHTML(S.market[Number(s)], Number(s)); refTxt = (tmp.textContent || '').replace(/\s+/g, ''); } catch (e) { refErr = e.message; }
          const cardMcard = card ? card.querySelector('.railSelected') : null;
          const liveTxt = cardMcard ? (cardMcard.textContent || '').replace(/\s+/g, '') : '';
          return { cardRect: cr ? { left: cr.left, top: cr.top, right: cr.right, bottom: cr.bottom } : null, closeBtnRect: cbtn ? { w: cbtn.width, h: cbtn.height } : null, bbox, hover, outlines, refTxt, refErr, liveTxt, textMatch: refTxt == null ? null : refTxt === liveTxt };
        }, [t.rail, t.slot]);
        // #6 對照用：V1、round0、第一枚籤，開卡當下存一張全頁截圖
        if (vname === 'V1' && round === 0 && t === tabs[0]) {
          fs.writeFileSync(path.join(OUT, 'contact-bid-open-head-V1.png'), await page.screenshot());
        }
        // 收起（點同一枚籤）
        await page.evaluate(([r, s]) => document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]').click(), [t.rail, t.slot]);
        await page.waitForTimeout(200);
        const afterClose = await page.evaluate(([r, s]) => ({ hover: window.__yaoshi3d.tray.hover(), outlines: window.__yaoshi3d.tray.items()[Number(s)].outlines, cardGone: !document.querySelector('#' + r + '.open') }), [t.rail, t.slot]);
        rowsForVp.push({ mode: 'solo', vp: vname, round, rail: t.rail, slot: t.slot, before, after, afterClose, anchorRects, safePx, pixelDiff, noiseDiff, allSlots });
      }
    }
  } catch (e) {
    results.notes.push(`${vname} 例外：${e.message}`);
  } finally { await ctx.close(); }
  results.vps[vname] = rowsForVp;
  console.error('[card-dock]', vname, 'rows=', rowsForVp.length);
}

await browser.close();
srv.kill();
fs.writeFileSync(path.join(OUT, 'card-dock-raw.json'), JSON.stringify(results, null, 1));
console.log('寫入', path.join(OUT, 'card-dock-raw.json'));
