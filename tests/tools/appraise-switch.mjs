// v0.59.2 法寶鑑賞頁「#4 切換」驗收，凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md #4。
// 涵蓋：點別籤直接切換（不回牌桌態）、左右滑（真的派發 pointerdown/pointerup，不只呼叫 appraiseNudge）、
// 到頭停住不循環、焦點法寶與側欄內容逐籤對應。矩陣：V1、V5 × solo/hot（凍結原文只要求「至少」這兩檔）。
// 用法：node tests/tools/appraise-switch.mjs [--out <dir>] [--port N]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-28-appraise-panels')));
const PORT = Number(arg('--port', 9760));
const SEED = Number(arg('--seed', 3));
fs.mkdirSync(OUT, { recursive: true });

const VP = { V1: { w: 852, h: 393, safe: [0, 59, 21, 59] }, V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] } };
const VPS = arg('--vps', 'V1,V5').split(',');
const MODES = arg('--modes', 'solo,hot').split(',');
const CASES = VPS.flatMap((vp) => MODES.map((mode) => ({ vp, mode })));

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const DRIVE_STEP = `(() => {
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
const scr = (page) => page.evaluate(() => { const b = document.getElementById('mainbtn'); const t = b ? b.textContent : '', dis = b ? b.disabled : true; if (/不盯任何一件/.test(t)) return 'mark'; if (/^蓋牌/.test(t) && !dis) return 'bid'; return 'busy'; });
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
// 焦點對應快照：APPR.i／側欄內容（跟 appraise-probe 同一支參考文字產生法）／目前露出來（未壓暗）那格的槽位
async function snapshot(page) {
  return page.evaluate(() => {
    const id = APPR && APPR.on ? APPR.id : null, i = APPR ? APPR.i : null;
    if (!id || i == null) return { on: false };
    const si = Number(i);
    const card = document.querySelector('#' + id + ' .railPages .railSelected');
    const liveTxt = card ? (card.textContent || '').replace(/\s+/g, '') : '';
    const tmpBid = typeof myBids !== 'undefined' && myBids[si] === undefined;
    if (tmpBid) myBids[si] = { amt: 0, type: 'cons', intent: 'keep', target: null };
    let refTxt = null;
    try { const tmp = document.createElement('div'); tmp.innerHTML = (typeof TRAY_PHASE !== 'undefined' && TRAY_PHASE === 'mark' ? markCardHTML : mcardHTML)(S.market[si], si); refTxt = (tmp.textContent || '').replace(/\s+/g, ''); } catch (e) {}
    finally { if (tmpBid) delete myBids[si]; }
    return { on: true, id, i: si, contentMatch: refTxt != null && refTxt === liveTxt };
  });
}
async function dispatchSwipe(page, dir) {
  // dir=1（左滑＝下一件）：手指從右往左移；dir=-1（右滑＝上一件）：從左往右。真的派 pointerdown/pointerup，不呼叫 appraiseNudge。
  const vp = page.viewportSize();
  const y = vp.height / 2, x0 = vp.width / 2 + (dir === 1 ? 80 : -80), x1 = vp.width / 2 + (dir === 1 ? -80 : 80);
  await page.evaluate(([x0, y]) => { const cv = document.getElementById('appraiseDim'); if (cv) cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: x0, clientY: y, bubbles: true })); }, [x0, y]);
  await page.waitForTimeout(16);
  await page.evaluate(([x1, y]) => { const cv = document.getElementById('appraiseDim'); if (cv) cv.dispatchEvent(new PointerEvent('pointerup', { clientX: x1, clientY: y, bubbles: true })); }, [x1, y]);
  await page.waitForTimeout(350);
}

const results = { cases: [], notes: [] };
async function runCase(vname, mode) {
  const vp = VP[vname];
  const { ctx, page } = await newCtx(vp);
  const row = { vp: vname, mode, tabClick: [], swipe: [] };
  try {
    await page.evaluate((m) => startEntry(m), mode === 'hot' ? 'hotseat' : 'solo');
    await pickFirstRole(page);
    if (mode === 'hot') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pickFirstRole(page); }
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, mode === 'hot' ? 'hotseat' : 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    const cls = await driveToFirst(page, new Set(['bid', 'mark']));
    if (!cls) { results.notes.push(`${vname}|${mode} 沒進到 bid/mark`); return; }
    const ready = await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n; }, null, { timeout: 180000 }).then(() => true).catch(() => false);
    if (!ready) { results.notes.push(`${vname}|${mode} 3D 未就緒（判紅）`); row.notready = true; return; }
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
    if (tabs.length < 2) { results.notes.push(`${vname}|${mode} 籤數 <2，切換與到頭停住量不到（判紅）`); row.notready = true; return; }
    // ① 點別籤直接切換：開第一枚，再逐一點其餘每一枚，驗證每次都直接切到那件（中途沒有回到牌桌態）
    await page.evaluate(([r, s]) => railTabClick(r, s), [tabs[0].rail, tabs[0].slot]);
    await page.waitForTimeout(450);
    for (const t of tabs) {
      const beforeOn = await page.evaluate(() => !!(APPR && APPR.on));
      await page.evaluate(([r, s]) => document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]').click(), [t.rail, t.slot]);
      await page.waitForTimeout(450);
      const snap = await snapshot(page);
      row.tabClick.push({ rail: t.rail, slot: t.slot, stayedOn: beforeOn && snap.on, focusMatch: snap.on && snap.i === t.slot, contentMatch: snap.contentMatch === true });
    }
    // ② 左右滑：從目前所在位置，先一路左滑（dir=1，下一件）走到底，驗證順序＝appraiseSlots() 順序、到頭停住（多滑一次仍是同一件）
    const order = await page.evaluate(() => { try { return window.__yaoshi3d.tray.items().filter((it) => it.visible).map((it) => it.slot).sort((a, b) => a - b); } catch (e) { return []; } });
    // 回到序列第一件
    const first = order[0];
    const firstTab = tabs.find((t) => t.slot === first) || tabs[0];
    await page.evaluate(([r, s]) => railTabClick(r, s), [firstTab.rail, firstTab.slot]);
    await page.waitForTimeout(450);
    for (let k = 0; k < order.length; k++) {
      const snap = await snapshot(page);
      row.swipe.push({ dir: 'next', expectSlot: order[k], actual: snap.i, focusMatch: snap.on && snap.i === order[k], contentMatch: snap.contentMatch === true });
      await dispatchSwipe(page, 1);
    }
    // 多滑一次（超過最後一件）：應停在最後一件不循環
    const afterEnd = await snapshot(page);
    row.swipeEdgeNext = { expectSlot: order[order.length - 1], actual: afterEnd.i, stopped: afterEnd.on && afterEnd.i === order[order.length - 1] };
    // 反向滑回去，驗證每一步對應，並在頭部再測一次到頭停住
    for (let k = order.length - 1; k >= 0; k--) {
      const snap = await snapshot(page);
      row.swipe.push({ dir: 'prev', expectSlot: order[k], actual: snap.i, focusMatch: snap.on && snap.i === order[k], contentMatch: snap.contentMatch === true });
      await dispatchSwipe(page, -1);
    }
    const afterStart = await snapshot(page);
    row.swipeEdgePrev = { expectSlot: order[0], actual: afterStart.i, stopped: afterStart.on && afterStart.i === order[0] };
    // 收尾：回到牌桌態
    await page.evaluate(() => { try { closeAppraise(); } catch (e) {} });
  } catch (e) { results.notes.push(`${vname}|${mode} 例外：${e.message}\n${e.stack}`); }
  finally { results.cases.push(row); await ctx.close().catch(() => {}); }
}

for (const c of CASES) await runCase(c.vp, c.mode);
await browser.close();
srv.kill();
const outFile = path.join(OUT, 'appraise-switch-raw.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
console.log('寫入', outFile, 'cases', results.cases.length, 'notes', results.notes.length);
