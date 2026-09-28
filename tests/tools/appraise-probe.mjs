// v0.59.2 法寶鑑賞頁驗收，凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md #1–#4。
// 縮減矩陣（不是凍結檔要求的 V1–V5×solo/hot/nw1-3 全席）：V1/solo、V3/hot 各一夜，逐籤（西／東籤各一）。
// 用法：node tests/tools/appraise-probe.mjs [--out <dir>] [--port N] [--base <index.html 路徑，判基準用>]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { decodePNG, avgBrightness } from './png-lite.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-28-appraise-panels')));
const PORT = Number(arg('--port', 9721));
const SEED = Number(arg('--seed', 3));
const BASE_MODE = process.argv.includes('--base'); // true＝跑在基準（86e4676）上，判紅
fs.mkdirSync(OUT, { recursive: true });

const VP = { V1: { w: 852, h: 393, safe: [0, 59, 21, 59] }, V3: { w: 844, h: 390, safe: [0, 47, 21, 47] } };
const CASES = [{ vp: 'V1', mode: 'solo' }, { vp: 'V3', mode: 'hot' }];

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

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
const scr = (page) => page.evaluate(() => {
  const $ = (id) => document.getElementById(id);
  const on = (id) => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none'; };
  if (!on('table')) return 'none';
  const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (/不盯任何一件/.test(t)) return 'mark';
  if (/^蓋牌/.test(t) && !dis) return 'bid';
  return 'busy';
});
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
async function newCtx(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  await ctx.addInitScript((safe) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style'); s.id = '__safe';
      s.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`;
      document.head.appendChild(s);
    });
  }, vp.safe);
  const page = await ctx.newPage();
  page.__errs = []; page.on('pageerror', (e) => page.__errs.push('pageerror ' + e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 30000 });
  await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 90000 }).catch(() => {});
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  return { ctx, page };
}
const pickFirstRole = async (page) => {
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(80);
};

const results = { cases: [], notes: [] };

async function runCase(vname, mode) {
  const vp = VP[vname];
  const { ctx, page } = await newCtx(vp);
  const row = { vp: vname, mode, checks: {} };
  try {
    await page.evaluate((m) => startEntry(m), mode === 'hot' ? 'hotseat' : 'solo');
    await pickFirstRole(page);
    if (mode === 'hot') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pickFirstRole(page); }
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, mode === 'hot' ? 'hotseat' : 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    const cls = await driveToFirst(page, new Set(['bid', 'mark']));
    if (!cls) { results.notes.push(`${vname}|${mode} 沒進到 bid/mark（局提早結束）`); return; }
    const ready = await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n; }, null, { timeout: 90000 }).then(() => true).catch(() => false);
    if (!ready) { results.notes.push(`${vname}|${mode} 3D 拍品 90s 未就緒，量不到（判紅）`); row.notready = true; results.cases.push(row); return; }
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
    if (!tabs.length) { results.notes.push(`${vname}|${mode} 沒有窄籤（市集空），量不到（判紅）`); row.notready = true; results.cases.push(row); return; }
    // 選一個西籤、一個東籤各測一次（沒有兩側各一籤時只測拿得到的那個）
    const west = tabs.find((t) => t.rail === 'railW'); const east = tabs.find((t) => t.rail === 'railE');
    const picks = [west, east].filter(Boolean);
    row.picks = [];
    for (const pick of picks) {
      const pr = { rail: pick.rail, slot: pick.slot };
      // ── 進場前參考幀（暗糊 #1(b) 的參考）／鏡頭快照（#3 返回比對的基準，必須是「點籤之前」，
      //    不是鑑賞中途——原本這裡的比較基準抓錯，見 docs/experiments/2026-09-28-appraise-panels 的修正記錄） ──
      const refShot = await page.screenshot();
      const beforeEnter = await page.evaluate(() => ({ cam: [window.__yaoshi3d.camera.position.x, window.__yaoshi3d.camera.position.y, window.__yaoshi3d.camera.position.z], offset: window.__yaoshi3d.camera.view && window.__yaoshi3d.camera.view.enabled, feltHead: (() => { const e = document.getElementById('feltHead'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() }));
      // ── 點籤 ──
      if (!BASE_MODE) {
        await page.evaluate(([r, s]) => railTabClick(r, s), [pick.rail, pick.slot]);
      } else {
        // 86e4676 沒有 railTabClick／appraiseSupported，走舊版 selectRailPage
        await page.evaluate(([r, s]) => selectRailPage(r, s), [pick.rail, pick.slot]);
      }
      await page.waitForTimeout(450); // #1 要求 0.45 秒內進穩定態
      // ── #1(a) 投影框高度／安全區／與側欄零重疊 ──
      const bb = await page.evaluate((s) => window.__yaoshi3d.tray.bboxScreen(Number(s)), pick.slot);
      const panelRect = await page.evaluate((r) => { const pg = document.querySelector('#' + r + ' .railPages'); if (!pg) return null; const q = pg.getBoundingClientRect(); return getComputedStyle(pg).display === 'none' ? null : { left: q.left, top: q.top, right: q.right, bottom: q.bottom }; }, pick.rail);
      const safePx = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); const n = (v) => parseFloat(v) || 0; return { top: n(cs.getPropertyValue('--safe-top')), right: n(cs.getPropertyValue('--safe-right')), bottom: n(cs.getPropertyValue('--safe-bottom')), left: n(cs.getPropertyValue('--safe-left')) }; });
      const H = vp.h, W = vp.w;
      pr.bboxHeightFrac = bb ? (bb.bottom - bb.top) / H : null;
      pr.bboxInSafe = bb ? (bb.left >= safePx.left - 0.5 && bb.top >= safePx.top - 0.5 && bb.right <= W - safePx.right + 0.5 && bb.bottom <= H - safePx.bottom + 0.5) : null;
      const ov = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      pr.bboxPanelOverlap = (bb && panelRect) ? ov(bb, panelRect) : (bb && !panelRect ? 'panel-not-found' : null);
      pr.panelSide = panelRect ? ((panelRect.left + panelRect.right) / 2 < W / 2 ? 'left' : 'right') : null;
      // ── #2「側欄外的可見文字矩形不得與側欄相交」：沿用 card-dock-probe.mjs 同一支 cut 判定法
      // （純幾何相交，不論遮住的元素是否半透明——側欄背景 var(--c-ink-bg2) 只有 94% 不透明，
      //   底下牌桌列的字會隱約透出，但這條規則本來就沒有「透明可以放過」的例外，量到相交就算違規）。
      const cut = await page.evaluate((r) => {
        const pg = document.querySelector('#' + r + ' .railPages');
        if (!pg || getComputedStyle(pg).display === 'none') return [];
        const cr = pg.getBoundingClientRect();
        const out = [];
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) {
          const el = n.parentElement;
          if (!el || !/\S/.test(n.textContent) || pg.contains(el)) continue;
          const st = getComputedStyle(el);
          if (st.visibility !== 'visible' || st.display === 'none' || Number(st.opacity) === 0) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) {
            if (q.width < 0.5 || q.height < 0.5) continue;
            if (Math.min(q.right, cr.right) - Math.max(q.left, cr.left) > 0.5 && Math.min(q.bottom, cr.bottom) - Math.max(q.top, cr.top) > 0.5) { out.push(n.textContent.trim().slice(0, 20)); break; }
          }
        }
        return out;
      }, pick.rail);
      pr.cut = cut;
      pr.expectPanelSide = pick.rail === 'railW' ? 'left' : 'right';
      // ── #1(b) 暗糊：非焦點區域亮度 vs 參考幀（排除焦點 bbox 與側欄矩形） ──
      const afterShot = await page.screenshot();
      const refImg = decodePNG(refShot), afterImg = decodePNG(afterShot);
      const exclude = [bb ? { left: bb.left - 8, top: bb.top - 8, right: bb.right + 8, bottom: bb.bottom + 8 } : null, panelRect].filter(Boolean);
      const full = { left: 0, top: 0, right: W, bottom: H };
      const refB = avgBrightness(refImg, full, exclude);
      const afterB = avgBrightness(afterImg, full, exclude);
      pr.refBrightness = refB; pr.afterBrightness = afterB;
      pr.dimRatio = (refB && afterB != null) ? afterB / refB : null;
      // ── #1(c)/(d) 自轉與浮動：Playwright IPC 往返（evaluate 的 round-trip）在系統負載高時可加到
      // 數百 ms 的額外延遲，會讓「waitForTimeout(1000) 後量到的變化量」系統性偏離真正的 1.0 秒窗——
      // 這是量測工具的誤差，不是被測物的行為（本機同時跑著其他 session 的背景工作，§6.2）。
      // 改法：連同 performance.now() 一起在同一次 evaluate 取樣，算「弧度／秒」的瞬時速率，
      // 拿速率去跟 2π/6 rad/s 比較——對量測窗口的實際長度不敏感，比對的仍是同一個門檻的物理量。
      const sample = (s) => page.evaluate((si) => ({ pose: window.__yaoshi3d.tray.pose(Number(si)), t: performance.now() }), s);
      const t0 = await sample(pick.slot);
      const others0 = await page.evaluate((s) => window.__yaoshi3d.tray.items().filter((it) => it.visible && it.slot !== Number(s)).map((it) => ({ slot: it.slot, pose: window.__yaoshi3d.tray.pose(it.slot) })), pick.slot);
      await page.waitForTimeout(1000);
      const t1 = await sample(pick.slot);
      const others1 = await page.evaluate((s) => window.__yaoshi3d.tray.items().filter((it) => it.visible && it.slot !== Number(s)).map((it) => ({ slot: it.slot, pose: window.__yaoshi3d.tray.pose(it.slot) })), pick.slot);
      let yMin = t1.pose ? t1.pose.y : null, yMax = t1.pose ? t1.pose.y : null;
      for (let i = 0; i < 8; i++) { await page.waitForTimeout(125); const p = await page.evaluate((s) => window.__yaoshi3d.tray.pose(Number(s)), pick.slot); if (p) { yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y); } }
      const rawDelta = (t0.pose && t1.pose) ? Math.abs(((t1.pose.rotY - t0.pose.rotY + Math.PI * 3) % (Math.PI * 2)) - Math.PI) : null; // 取最短角差
      const elapsedS = (t1.t - t0.t) / 1000;
      pr.rotYChange1s = rawDelta; // 原始量測窗內的變化量（供對照，窗口不保證恰好 1.000s）
      pr.rotElapsedS = elapsedS;
      pr.rotRateRadS = (rawDelta != null && elapsedS > 0) ? rawDelta / elapsedS : null; // 實際弧度/秒，跟窗口長度無關
      pr.posYBobRange2s = (yMin != null && yMax != null) ? (yMax - yMin) : null;
      pr.othersRotChange1s = others0.map((o, i) => { const o1 = others1.find((x) => x.slot === o.slot); return (o.pose && o1 && o1.pose) ? Math.abs(o1.pose.rotY - o.pose.rotY) : null; });
      // ── #2 內容等價：panel textContent 與 mcardHTML/markCardHTML 參考版比對（沿用 card-dock 判定器同一種手法） ──
      const contentCheck = await page.evaluate(([r, s]) => {
        const si = Number(s);
        const card = document.querySelector('#' + r + ' .railPages .railSelected');
        const liveTxt = card ? (card.textContent || '').replace(/\s+/g, '') : '';
        const tmpBid = typeof myBids !== 'undefined' && myBids[si] === undefined;
        if (tmpBid) myBids[si] = { amt: 0, type: 'cons', intent: 'keep', target: null };
        let refTxt = null, refErr = null;
        try { const tmp = document.createElement('div'); tmp.innerHTML = (typeof TRAY_PHASE !== 'undefined' && TRAY_PHASE === 'mark' ? markCardHTML : mcardHTML)(S.market[si], si); refTxt = (tmp.textContent || '').replace(/\s+/g, ''); } catch (e) { refErr = e.message; }
        finally { if (tmpBid) delete myBids[si]; }
        return { liveTxt, refTxt, refErr, match: refTxt == null ? null : refTxt === liveTxt, hasCard: !!card };
      }, [pick.rail, pick.slot]);
      pr.content = contentCheck;
      // ── 返回 #3：點空白處。比對基準是「點籤之前」（beforeEnter），不是鑑賞中途——
      //    #3 原文「過渡結束後…與進場前逐值相同」，進場前＝還沒點籤那一刻。 ──
      if (!BASE_MODE) {
        await page.evaluate(() => { const cv = document.getElementById('appraiseDim'); if (cv) cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, bubbles: true })); });
        await page.evaluate(() => { const cv = document.getElementById('appraiseDim'); if (cv) cv.dispatchEvent(new PointerEvent('pointerup', { clientX: 5, clientY: 5, bubbles: true })); });
      } else {
        await page.evaluate(([r]) => closeRailCard(r), [pick.rail]);
      }
      await page.waitForTimeout(500);
      const afterReturn = await page.evaluate(() => ({ cam: [window.__yaoshi3d.camera.position.x, window.__yaoshi3d.camera.position.y, window.__yaoshi3d.camera.position.z], offset: window.__yaoshi3d.camera.view && window.__yaoshi3d.camera.view.enabled, feltHead: (() => { const e = document.getElementById('feltHead'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() }));
      pr.beforeEnter = beforeEnter; pr.afterReturn = afterReturn;
      // camera.view 在整個分頁生命週期第一次 setViewOffset 之前是 null、之後 clearViewOffset 是
      // {enabled:false}——語意上都是「沒有 view offset」，比較時正規化成布林再比，不然第一次鑑賞
      // 就會把這個 null→false 的無害差異算成假陽性。cam 位置與 feltHead 矩形仍要求逐值相同。
      pr.returnCamMatch = JSON.stringify(beforeEnter.cam) === JSON.stringify(afterReturn.cam)
        && !!beforeEnter.offset === !!afterReturn.offset
        && JSON.stringify(beforeEnter.feltHead) === JSON.stringify(afterReturn.feltHead);
      pr.stillOpen = await page.evaluate((r) => document.getElementById(r).classList.contains('open'), pick.rail);
      row.picks.push(pr);
    }
  } catch (e) { results.notes.push(`${vname}|${mode} 例外：${e.message}\n${e.stack}`); }
  finally { results.cases.push(row); await ctx.close().catch(() => {}); }
}

for (const c of CASES) await runCase(c.vp, c.mode);
await browser.close();
srv.kill();
const outFile = path.join(OUT, (BASE_MODE ? 'base-' : 'head-') + 'appraise-raw.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log('寫入', outFile, 'cases', results.cases.length, 'notes', results.notes.length);
