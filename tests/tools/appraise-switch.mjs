// v0.59.2 法寶鑑賞頁「#4 切換」驗收，凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md #4（含修訂：
// 每次切換都重燒；時限與跳過規則同修訂後 #1）。丙案版（09-29 改寫）：
//   ① 鑑賞中真的滑鼠點另一枚籤 → 直接換到那件（每一幀都還在鑑賞態、背景一直壓暗＝中途不回牌桌），
//      0.9 秒內符紙蓋住新焦點框中心、符紙在的時候新焦點不被畫、1.3 秒時焦點與題字都換成那件（逐籤對應）。
//   ② 左右滑（真的滑鼠按下→拖→放開，不呼叫 appraiseNudge）：左滑＝下一件、右滑＝上一件，每一步同 ① 的檢查；
//      到頭再滑一次停住不循環。
//   ③ 切換後的揭幕中點空白＝跳過（0.1 秒內穩定、不返回）。
// 用 Playwright 假時鐘逐幀推進（理由見 appraise-c-probe.mjs 檔頭）。
// 矩陣：V1–V5 × solo/hot × 出價／盯上（凍結檔「未另註明者」的預設矩陣：出價與盯上狀態）。
//   盯上階段點題字欄裡的卡片會直接宣告盯上——本治具換件只點窄籤與在空白處滑動，從不點題字欄內的卡片；
//   盯上階段另比對整段前後的 S.marks，換件途中若宣告了盯上即判紅。（09-29 前只跑出價＝縮小案例集，依主對話指示補上盯上。）
// 用法：node tests/tools/appraise-switch.mjs [--root <repo>] [--out <dir>] [--port N] [--vps ...] [--modes ...] [--phases bid,mark]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { VP, driveToFirst, openGame, waitTrayReady, PAGE_LIB, png, meanLum, meanLumOutside, paperCover, findRing, pauseSoon } from './appraise-c-lib.mjs';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', HERE));
const OUT = path.resolve(arg('--out', path.join(HERE, 'docs/experiments/2026-09-28-appraise-c')));
const PORT = Number(arg('--port', 9961));
const SEED = Number(arg('--seed', 3));
const TAG = arg('--tag', 'head');
const VPS = arg('--vps', 'V1,V2,V3,V4,V5').split(',');
const MODES = arg('--modes', 'solo,hot').split(',');
const PHASES = arg('--phases', 'bid,mark').split(',');
fs.mkdirSync(OUT, { recursive: true });

const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const E = (page, fn, a) => page.evaluate(fn, a);
const STEPS = [50, 150, 300, 450, 600, 750, 900];

async function state(page) {
  return E(page, () => {
    const AC = window.__AC, on = typeof APPR !== 'undefined' && APPR.on, i = on ? APPR.i : null;
    const n = i != null ? AC.node(i) : null;
    const others = window.__yaoshi3d.tray.items().filter((it) => it.slot !== i).map((it) => { const m = AC.node(it.slot); return m ? AC.rendered(m, AC.focusMask()) : null; });
    const tabs = [...document.querySelectorAll('.railTabs button')].map((b) => { const r = b.getBoundingClientRect(); return { left: r.left - 2, top: r.top - 2, right: r.right + 2, bottom: r.bottom + 2 }; });
    return { on: !!on, id: on ? APPR.id : null, i, fx: AC.fx(), bbox: n ? AC.projBox(n) : null, rendered: n ? AC.rendered(n, AC.focusMask()) : null, others, tabs };
  });
}
/** 切換之後的揭幕：逐幀記錄，1.3 秒量焦點與題字（題字淡入走真實時間，另等）。 */
async function afterSwitch(page, expectSlot, refImg, W, H) {
  const frames = [];
  let last = 0;
  for (const ms of STEPS) {
    await page.clock.runFor(ms - last); last = ms;
    const s = await state(page), img = png(await page.screenshot());
    const bb = s.bbox, c = bb ? { x: (bb.left + bb.right) / 2, y: (bb.top + bb.bottom) / 2 } : null;
    const pnl = await E(page, (id) => { const e = id && document.querySelector('#' + id + ' .railPages'); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }, s.id);
    const P = s.fx && s.fx.paper, pr = P && P.alpha > 0 ? { left: P.cx - P.w / 2, top: P.cy - P.h / 2, right: P.cx + P.w / 2, bottom: P.cy + P.h / 2 } : null;
    /* 「中途不回牌桌」的像素量法（09-29 修正）：首版拿全畫面平均亮度比牌桌，燒符的火光本身就比牌桌亮，量到的是火光
       不是牌桌（首跑 100 格全數誤判，其餘判準全過）。改量「鏡子外圈 1.6 倍半徑以外」扣掉題字欄與窄籤的區域——
       火光到不了那裡，牌桌態那裡是桌面與廟埕；再加兩個結構量：其餘拍品一件都沒被畫、壓暗 uniform 維持全暗。 */
    const M = s.fx && s.fx.mirror;
    const ex = [pnl, pr, ...(s.tabs || [])].filter(Boolean);
    const far = M ? meanLumOutside(img, M.cx, M.cy, M.r * 1.6, ex) : null, farRef = M ? meanLumOutside(refImg, M.cx, M.cy, M.r * 1.6, ex) : null;
    frames.push({ ms, on: s.on, i: s.i, rendered: s.rendered, paperAlpha: P ? P.alpha : null, paper: c ? paperCover(img, pr || bb, c.x, c.y) : null,
      othersRendered: s.others, dimU: s.fx ? s.fx.dim : null,
      farRatio: far && farRef && far.n > 200 && farRef.mean ? far.mean / farRef.mean : null, farN: far ? far.n : 0 });
  }
  await page.clock.runFor(1300 - last);
  const s = await state(page);
  const img = png(await page.screenshot());
  const tok = s.i != null ? await E(page, (x) => window.__AC.token(x), s.i) : null;
  const M = s.fx && s.fx.mirror;
  const ring = tok && M ? findRing(img, M.cx, M.cy, tok.rgb, M.r * 0.9, M.r * 1.02) : null;
  await page.clock.resume(); await page.waitForTimeout(1100); // 題字淡入（CSS、真實時間）
  const panel = s.id ? await E(page, ([r, x]) => window.__AC.panel(r, x), [s.id, s.i]) : null;
  await pauseSoon(page);
  return { expectSlot, frames, at1300: { on: s.on, i: s.i, rendered: s.rendered, ring: ring && { frac: ring.frac, dE: ring.dE } }, panel: panel && { side: (panel.rect.left + panel.rect.right) / 2 < W / 2 ? 'left' : 'right', content: panel.content, cut: panel.cut, trunc: panel.trunc } };
}
async function swipe(page, dir) {
  const bp = await E(page, () => window.__AC.blankPoint());
  if (!bp) return false;
  const x1 = bp.x + (dir === 1 ? -90 : 90);
  await page.mouse.move(bp.x, bp.y); await page.mouse.down(); await page.mouse.move((bp.x + x1) / 2, bp.y); await page.mouse.move(x1, bp.y); await page.mouse.up();
  return true;
}
const tabCenter = (page, rail, slot) => E(page, ([r, s]) => { const b = document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]'); if (!b) return null; const q = b.getBoundingClientRect(); return q.width ? { x: (q.left + q.right) / 2, y: (q.top + q.bottom) / 2 } : null; }, [rail, slot]);

const results = { root: ROOT, cases: [], notes: [] };
async function runCase(vname, mode, phase) {
  const vp = VP[vname];
  const { ctx, page } = await openGame(browser, PORT, vp, mode, SEED);
  const row = { vp: vname, mode, phase, tabClick: [], swipe: [] };
  try {
    await page.evaluate(PAGE_LIB); await page.evaluate(() => window.__AC.init());
    const cls = await driveToFirst(page, new Set([phase]));
    if (!cls) { results.notes.push(`${vname}|${mode}|${phase} 沒進到${phase === 'mark' ? '盯上' : '出價'}階段（判紅）`); row.notready = true; return; }
    const marks = () => E(page, () => JSON.stringify((window.__yaoshi.S && window.__yaoshi.S.marks) || null));
    const markBefore = phase === 'mark' ? await marks() : null;
    if (!(await waitTrayReady(page))) { results.notes.push(`${vname}|${mode} 3D 未就緒（判紅）`); row.notready = true; return; }
    await page.waitForTimeout(400);
    const refImg = png(await page.screenshot());
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
    if (tabs.length < 2) { results.notes.push(`${vname}|${mode} 籤數 <2（判紅）`); row.notready = true; return; }
    await pauseSoon(page);
    // 先進第一枚、跳過揭幕到穩定
    let tc = await tabCenter(page, tabs[0].rail, tabs[0].slot); await page.mouse.click(tc.x, tc.y); await page.clock.runFor(1300);
    // ① 逐枚點籤（從第 2 枚起到最後，再回第 1 枚），每一枚都是「鑑賞中直接換」
    for (const t of [...tabs.slice(1), tabs[0]]) {
      tc = await tabCenter(page, t.rail, t.slot);
      const wasOn = (await state(page)).on;
      if (!tc) { row.tabClick.push({ ...t, err: '籤不在畫面上' }); continue; }
      await page.mouse.click(tc.x, tc.y);
      row.tabClick.push({ ...t, wasOn, ...(await afterSwitch(page, t.slot, refImg, vp.w, vp.h)) });
    }
    // ② 左右滑：從序列第一件開始一路左滑到底，再多滑一次；然後右滑回頭，再多滑一次
    const order = await E(page, () => window.__yaoshi3d.tray.items().filter((it) => it.visible || it.apprHide).map((it) => it.slot).sort((a, b) => a - b));
    row.order = order;
    // 目前在 tabs[0]（上面最後一步）；若 tabs[0] 不是序列第一件，先點過去
    if ((await state(page)).i !== order[0]) { const t0 = tabs.find((t) => t.slot === order[0]); tc = await tabCenter(page, t0.rail, t0.slot); await page.mouse.click(tc.x, tc.y); await page.clock.runFor(1300); }
    for (let k = 1; k < order.length; k++) { const ok = await swipe(page, 1); row.swipe.push({ dir: 'next', ok, ...(await afterSwitch(page, order[k], refImg, vp.w, vp.h)) }); }
    await swipe(page, 1); await page.clock.runFor(1300);
    row.edgeNext = { expect: order[order.length - 1], got: (await state(page)).i, on: (await state(page)).on };
    for (let k = order.length - 2; k >= 0; k--) { const ok = await swipe(page, -1); row.swipe.push({ dir: 'prev', ok, ...(await afterSwitch(page, order[k], refImg, vp.w, vp.h)) }); }
    await swipe(page, -1); await page.clock.runFor(1300);
    row.edgePrev = { expect: order[0], got: (await state(page)).i, on: (await state(page)).on };
    // ③ 切換後的揭幕中點空白＝跳過
    const t1 = tabs.find((t) => t.slot !== order[0]) || tabs[1];
    tc = await tabCenter(page, t1.rail, t1.slot); await page.mouse.click(tc.x, tc.y);
    await page.clock.runFor(300);
    const bp = await E(page, () => window.__AC.blankPoint());
    if (bp) await page.mouse.click(bp.x, bp.y);
    await page.clock.runFor(100);
    const sk = await state(page);
    row.skipAfterSwitch = { blank: bp, on: sk.on, i: sk.i, expect: t1.slot, stable: !!(sk.fx && sk.fx.stable), rendered: sk.rendered };
    await page.clock.resume();
    await page.evaluate(() => { try { closeAppraise(); } catch (e) {} });
    if (phase === 'mark') { row.markBefore = markBefore; row.markAfter = await marks(); row.clsAfter = await E(page, () => { const b = document.getElementById('mainbtn'); return b ? b.textContent.trim() : null; }); }
  } catch (e) { results.notes.push(`${vname}|${mode} 例外：${e.message}\n${e.stack}`); }
  finally { results.cases.push(row); await ctx.close().catch(() => {}); console.log(vname, mode, phase, 'done'); }
}

try { for (const phase of PHASES) for (const vp of VPS) for (const mode of MODES) await runCase(vp, mode, phase); }
finally { await browser.close(); srv.kill(); }
// ── 判定（同檔，量不到判紅）──
const fails = [];
let cells = 0;
const judgeSwitch = (key, r) => {
  cells++;
  const f = [];
  if (r.err) f.push(r.err);
  if (r.wasOn === false) f.push('切換前不在鑑賞態');
  if (!r.frames || !r.frames.length) f.push('沒有逐幀資料');
  else {
    if (r.frames.some((q) => !q.on)) f.push('中途離開鑑賞態');
    if (r.frames.some((q) => q.farRatio != null && !(q.farRatio <= 0.7))) f.push('中途鏡外畫面亮回牌桌（比 > 0.70）：' + r.frames.map((q) => q.farRatio && q.farRatio.toFixed(2)).join(','));
    if (r.frames.some((q) => !q.othersRendered || q.othersRendered.some((x) => x !== false))) f.push('中途其餘拍品被畫出（回到牌桌態）');
    if (r.frames.some((q) => !(q.dimU >= 0.99))) f.push('中途壓暗沒有維持全暗：' + r.frames.map((q) => q.dimU).join(','));
    if (!r.frames.some((q) => q.ms <= 900 && q.paper && q.paper.center && q.paper.center.yellow >= 0.25 && q.paper.center.paper >= 0.5 && q.paper.corners >= 3)) f.push('0.9 秒內沒有符紙蓋住新焦點框中心（沒重燒）');
    if (r.frames.some((q) => ((q.paperAlpha > 0) || (q.paper && q.paper.corners >= 3)) && q.rendered !== false)) f.push('符紙還在時新焦點已被畫出');
  }
  if (!r.at1300 || !r.at1300.on || r.at1300.i !== r.expectSlot) f.push(`1.3 秒時焦點 ${r.at1300 && r.at1300.i} ≠ ${r.expectSlot}`);
  else { if (r.at1300.rendered !== true) f.push('1.3 秒時焦點沒被畫'); if (!r.at1300.ring || !(r.at1300.ring.frac >= 0.5)) f.push('1.3 秒時沒有鏡子'); }
  if (!r.panel || !r.panel.content || !r.panel.content.match) f.push('題字內容不是那一件');
  if (r.panel && r.panel.cut && r.panel.cut.length) f.push('cut ' + r.panel.cut.join('|'));
  if (f.length) fails.push(`${key} ${f.join('；')}`);
};
for (const row of results.cases) {
  const k0 = `${row.vp}|${row.mode}|${row.phase}`;
  if (row.notready) { fails.push(`${k0} 量不到`); continue; }
  row.tabClick.forEach((r) => judgeSwitch(`${k0}|點籤→${r.rail}#${r.slot}`, r));
  row.swipe.forEach((r) => judgeSwitch(`${k0}|${r.dir === 'next' ? '左滑' : '右滑'}→${r.expectSlot}`, r));
  cells += 3;
  if (!row.edgeNext || !row.edgeNext.on || row.edgeNext.got !== row.edgeNext.expect) fails.push(`${k0} 左滑到底沒停住 ${JSON.stringify(row.edgeNext)}`);
  if (!row.edgePrev || !row.edgePrev.on || row.edgePrev.got !== row.edgePrev.expect) fails.push(`${k0} 右滑到頭沒停住 ${JSON.stringify(row.edgePrev)}`);
  const sk = row.skipAfterSwitch;
  if (!sk || !sk.blank || !sk.on || sk.i !== sk.expect || !sk.stable || sk.rendered !== true) fails.push(`${k0} 切換後揭幕中點空白沒有跳到穩定態 ${JSON.stringify(sk)}`);
  if (row.phase === 'mark' && (row.markBefore == null || row.markBefore !== row.markAfter)) fails.push(`${k0} 盯上狀態在換件前後不同或量不到（治具不該宣告）${row.markBefore} → ${row.markAfter}`);
}
results.verdict = { cells, fail: fails.length, pass: fails.length === 0 && !results.cases.some((c) => c.notready) && results.cases.length === VPS.length * MODES.length * PHASES.length };
results.fails = fails;
const outFile = path.join(OUT, `switch-${TAG}-raw.json`);
fs.writeFileSync(outFile, JSON.stringify(results));
console.log('寫入', outFile, JSON.stringify(results.verdict));
for (const f of fails.slice(0, 20)) console.log('  ✗', f);
