// v0.59.2 法寶鑑賞頁丙案（燒符揭幕＋照妖鏡）驗收治具：凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md
// #1（修訂：1.3 秒內穩定、揭幕中點空白＝跳過）、#2（題字欄＝原拍品卡）、#3（返回逐值相同，含 #11(d)）、
// #8／#11(e)（鑑賞態與燒符中每 rAF draw ≤ 牌桌態）、#11(a)(b)(c)(d)。
// 全矩陣：V1–V5 × solo/hot × 盯上／出價 × 每一枚窄籤；每一枚籤各做一次「完整揭幕→穩定→返回」與一次「揭幕中點空白跳過→返回」。
// 只存原始量測（raw JSON），判定在 appraise-c-judge.mjs——量不到的欄位留 null，判定器一律判紅。
//
// 時間：用 Playwright 假時鐘（ctx.clock）。點籤前 pauseAt，之後 runFor(ms) 一步步推進遊戲自己的 rAF 迴圈
// （產品碼照常跑，只是時間由治具給），所以「第 0.9 秒那一幀」「自轉一圈等距 12 個角度」都是確定的，
// 不受本機負載影響；CSS 動畫（題字淡入）不歸假時鐘管、照真實時間跑，量題字前另等真實時間讓它跑完。
//
// 用法：node tests/tools/appraise-c-probe.mjs [--root <要服務的 repo，預設本 repo>] [--out <dir>] [--port N]
//        [--vps V1,...] [--modes solo,hot] [--phases mark,bid] [--tag <輸出後綴>]
//   --root 指到 3cb06240（現行 0.59.2 鑑賞頁）的工作樹＝跑 #11 的判紅基準（凍結檔要求新判定器先在舊版紅在行為斷言）。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { VP, DRIVE_STEP, scr, driveToFirst, openGame, waitTrayReady, PAGE_LIB, png, meanLum, paperCover, findRing, bandDiff } from './appraise-c-lib.mjs';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', HERE));
const OUT = path.resolve(arg('--out', path.join(HERE, 'docs/experiments/2026-09-28-appraise-c')));
const PORT = Number(arg('--port', 9941));
const SEED = Number(arg('--seed', 3));
const TAG = arg('--tag', 'head');
const VPS = arg('--vps', 'V1,V2,V3,V4,V5').split(',');
const MODES = arg('--modes', 'solo,hot').split(',');
const PHASES = arg('--phases', 'mark,bid').split(',');
const SHOTS = process.argv.includes('--shots'); // 另存每枚籤的穩定態截圖（#9 用）
fs.mkdirSync(OUT, { recursive: true });

const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const BURN_STEPS = [0, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 850, 900]; // ms（點籤後），#11(a) 的 0.9 秒窗
const results = { root: ROOT, tag: TAG, cases: [], notes: [] };
const E = (page, fn, a) => page.evaluate(fn, a);

async function frameInfo(page, slot) {
  return E(page, (s) => {
    const AC = window.__AC, n = AC.node(s);
    return { fx: AC.fx(), draws: AC.draws(), bbox: n ? AC.projBox(n) : null, rendered: n ? AC.rendered(n, AC.focusMask()) : null, apprOn: typeof APPR !== 'undefined' ? !!APPR.on : null };
  }, slot);
}
async function othersRendered(page, slot) {
  return E(page, (s) => {
    const AC = window.__AC, T = window.__yaoshi3d.tray;
    return T.items().filter((it) => it.slot !== s).map((it) => { const n = AC.node(it.slot); return { slot: it.slot, has: !!n, rendered: n ? AC.rendered(n, AC.focusMask()) : null }; });
  }, slot);
}
const tabCenter = (page, rail, slot) => E(page, ([r, s]) => { const b = document.querySelector('#' + r + ' .railTabs button[data-slot="' + s + '"]'); if (!b) return null; const q = b.getBoundingClientRect(); return q.width ? { x: (q.left + q.right) / 2, y: (q.top + q.bottom) / 2 } : null; }, [rail, slot]);

/** 一次完整揭幕：點籤（真的滑鼠點）→ 0.9 秒逐幀 → 1.3 秒穩定態量測 → 旋轉／浮動／12 角度 → 點空白返回 → 逐值比對。 */
async function fullRun(page, vp, pick, pr) {
  const W = vp.w, H = vp.h;
  pr.before = await E(page, () => window.__AC.snap());
  pr.drawsTable = await E(page, async () => { const o = []; for (let i = 0; i < 12; i++) { await new Promise((r) => requestAnimationFrame(r)); o.push(window.__AC.draws()); } return o; });
  const refShot = png(await page.screenshot());
  const tc = await tabCenter(page, pick.rail, pick.slot);
  if (!tc) { pr.err = '找不到窄籤'; return; }
  const now = await E(page, () => Date.now());
  await page.clock.pauseAt(now + 250); // 留 250ms：evaluate 回來到 pauseAt 生效之間時間仍在走，太近會「倒退」報錯
  await page.mouse.click(tc.x, tc.y);
  // ── #11(a)：0.9 秒內逐幀 ──
  pr.burn = [];
  let last = 0;
  for (const ms of BURN_STEPS) {
    if (ms > last) await page.clock.runFor(ms - last); last = ms;
    const fi = await frameInfo(page, pick.slot);
    const img = png(await page.screenshot());
    const bb = fi.bbox, c = bb ? { x: (bb.left + bb.right) / 2, y: (bb.top + bb.bottom) / 2 } : null;
    const P = fi.fx && fi.fx.paper, paperRect = P && P.alpha > 0 ? { left: P.cx - P.w / 2, top: P.cy - P.h / 2, right: P.cx + P.w / 2, bottom: P.cy + P.h / 2 } : null;
    const region = paperRect || bb; // 燒符區：有符紙用符紙矩形，沒有（舊版）就用法寶框
    pr.burn.push({ ms, fxMs: fi.fx ? fi.fx.ms : null, draws: fi.draws, bbox: bb, focusRendered: fi.rendered, apprOn: fi.apprOn,
      paperApi: P ? { alpha: P.alpha, burn: P.burn, rect: paperRect } : null,
      paperCover: c ? paperCover(img, paperRect || bb, c.x, c.y) : null,
      paperRectHasCenter: !!(paperRect && c && c.x >= paperRect.left && c.x <= paperRect.right && c.y >= paperRect.top && c.y <= paperRect.bottom),
      burnLum: region ? meanLum(img, region) : null, refLum: region ? meanLum(refShot, region) : null });
  }
  // ── 1.3 秒：穩定態 ──
  await page.clock.runFor(1300 - last);
  const st = await frameInfo(page, pick.slot);
  pr.at1300 = { fx: st.fx, draws: st.draws, bbox: st.bbox, focusRendered: st.rendered, apprOn: st.apprOn };
  pr.bboxScreen = await E(page, (s) => window.__yaoshi3d.tray.bboxScreen(s), pick.slot); // 產品自己的出口（跟判定器自算的應逐值相同）
  const shot1300 = await page.screenshot();
  if (SHOTS) { fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true }); fs.writeFileSync(path.join(OUT, 'shots', `${TAG}-${pr.vp}-${pr.mode}-${pr.phase}-${pick.rail}-s${pick.slot}.png`), shot1300); }
  const img1300 = png(shot1300);
  // 題字欄：CSS 淡入動畫走真實時間（假時鐘不管），真實等它跑完再量
  await page.waitForTimeout(1200);
  pr.panel = await E(page, ([r, s]) => window.__AC.panel(r, s), [pick.rail, pick.slot]);
  pr.others = await othersRendered(page, pick.slot);
  // #1(b) 暗糊：排除焦點框（±8）與題字欄
  const bb = st.bbox, pnl = pr.panel && pr.panel.rect;
  const exclude = [bb ? { left: bb.left - 8, top: bb.top - 8, right: bb.right + 8, bottom: bb.bottom + 8 } : null, pnl].filter(Boolean);
  pr.dim = { ref: meanLum(refShot, { left: 0, top: 0, right: W, bottom: H }, exclude), after: meanLum(img1300, { left: 0, top: 0, right: W, bottom: H }, exclude) };
  // #11(b) 鏡子：像素找系色環（中心取產品回報的鏡心；舊版沒有就用法寶框中心），半徑搜到畫面高的一半
  const tok = await E(page, (s) => window.__AC.token(s), pick.slot);
  pr.token = tok;
  const M = st.fx && st.fx.mirror;
  const mc = M ? { x: M.cx, y: M.cy } : (bb ? { x: (bb.left + bb.right) / 2, y: (bb.top + bb.bottom) / 2 } : null);
  pr.ring = tok && mc ? findRing(img1300, mc.x, mc.y, tok.rgb, 10, Math.max(W, H) / 2) : null;
  pr.ringCenter = mc;
  // 八卦環：1 秒後同一圈帶的像素差＋產品回報的角度差
  const bag0 = M ? M.bagua : null;
  await page.clock.runFor(1000);
  const img2300 = png(await page.screenshot());
  const st2 = await frameInfo(page, pick.slot);
  pr.bagua = { api0: bag0, api1: st2.fx && st2.fx.mirror ? st2.fx.mirror.bagua : null,
    pixDiff: M ? bandDiff(img1300, img2300, M.cx, M.cy, M.r * M.scale * (M.face + 0.004), M.r * M.scale * (M.line[0] - 0.006)) : null };
  // #1(c)(d)：自轉 1 秒（上面這 1 秒）＋浮動 2 秒＋其餘拍品 1 秒不轉；同時 12 個等距角度（每 0.5 秒 = 30°）
  pr.spin = [];
  const poseAll = () => E(page, (s) => ({ t: performance.now(), me: window.__yaoshi3d.tray.pose(s), others: window.__yaoshi3d.tray.items().filter((it) => it.slot !== s).map((it) => ({ slot: it.slot, pose: window.__yaoshi3d.tray.pose(it.slot) })) }), pick.slot);
  const p0 = await poseAll();
  for (let k = 0; k < 12; k++) {
    await page.clock.runFor(500);
    const q = await E(page, (s) => { const AC = window.__AC, n = AC.node(s), f = AC.fx(); return { t: performance.now(), pose: window.__yaoshi3d.tray.pose(s), bbox: n ? AC.projBox(n) : null, mirror: f ? f.mirror : null, draws: AC.draws() }; }, pick.slot);
    pr.spin.push(q);
  }
  pr.pose0 = p0;
  pr.poseEnd = await poseAll();
  // ── 返回（#3／#11(d)）：真的點空白處（最上層是鑑賞輸入層、40×40 範圍內都是）──
  const bp = await E(page, () => window.__AC.blankPoint());
  pr.blank = bp;
  if (bp) await page.mouse.click(bp.x, bp.y);
  await page.clock.runFor(700);
  pr.after = await E(page, () => window.__AC.snap());
  await page.clock.resume();
  await page.waitForTimeout(200);
}
/** 揭幕中點空白（#1 修訂）：點籤 → 300ms（燒符中）點空白 → 100ms 後量；再點空白返回。 */
async function skipRun(page, vp, pick, pr) {
  const tc = await tabCenter(page, pick.rail, pick.slot);
  if (!tc) { pr.skip = { err: '找不到窄籤' }; return; }
  const now = await E(page, () => Date.now());
  await page.clock.pauseAt(now + 250);
  await page.mouse.click(tc.x, tc.y);
  await page.clock.runFor(300);
  const mid = await frameInfo(page, pick.slot);
  const bp = await E(page, () => window.__AC.blankPoint());
  const out = { blank: bp, before: { fx: mid.fx, focusRendered: mid.rendered, apprOn: mid.apprOn } };
  if (bp) await page.mouse.click(bp.x, bp.y);
  await page.clock.runFor(100);
  const fi = await frameInfo(page, pick.slot);
  const img = png(await page.screenshot());
  out.after = { fx: fi.fx, bbox: fi.bbox, focusRendered: fi.rendered, apprOn: fi.apprOn, draws: fi.draws };
  const bb = fi.bbox, c = bb ? { x: (bb.left + bb.right) / 2, y: (bb.top + bb.bottom) / 2 } : null;
  const P2 = fi.fx && fi.fx.paper, pr2 = P2 ? { left: P2.cx - P2.w / 2, top: P2.cy - P2.h / 2, right: P2.cx + P2.w / 2, bottom: P2.cy + P2.h / 2 } : bb;
  out.after.paperCover = c ? paperCover(img, pr2, c.x, c.y) : null;
  out.after.paperAlpha = P2 ? P2.alpha : null;
  const tok = await E(page, (s) => window.__AC.token(s), pick.slot);
  const M = fi.fx && fi.fx.mirror;
  out.after.ring = tok && M ? findRing(img, M.cx, M.cy, tok.rgb, M.r * 0.9, M.r * 1.02) : null;
  out.panel = await E(page, ([r, s]) => window.__AC.panel(r, s), [pick.rail, pick.slot]);
  // 收尾：再點一次空白返回
  const bp2 = await E(page, () => window.__AC.blankPoint());
  if (bp2) await page.mouse.click(bp2.x, bp2.y);
  await page.clock.runFor(700);
  out.closed = await E(page, () => (typeof APPR !== 'undefined' ? !APPR.on : null));
  await page.clock.resume();
  await page.waitForTimeout(200);
  pr.skip = out;
}

async function runCase(vname, mode) {
  const vp = VP[vname];
  const { ctx, page } = await openGame(browser, PORT, vp, mode, SEED);
  const row = { vp: vname, mode, picks: [] };
  try {
    await page.evaluate(PAGE_LIB); await page.evaluate(() => window.__AC.init());
    for (const phase of PHASES) {
      const cls = await driveToFirst(page, new Set([phase]));
      if (!cls) {
        const markOn = await page.evaluate(() => typeof CFG !== 'undefined' && !!CFG.MARK_ON).catch(() => null);
        if (phase === 'mark' && markOn === false) { results.notes.push(`${vname}|${mode}|mark CFG.MARK_ON=false（設定使然）`); continue; }
        results.notes.push(`${vname}|${mode}|${phase} 沒進到該狀態（量不到，判紅）`); row.notready = true; continue;
      }
      if (!(await waitTrayReady(page))) { results.notes.push(`${vname}|${mode}|${phase} 3D 拍品未就緒（量不到，判紅）`); row.notready = true; continue; }
      await page.waitForTimeout(400);
      const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot), name: b.textContent })));
      if (!tabs.length) { results.notes.push(`${vname}|${mode}|${phase} 沒有窄籤（量不到，判紅）`); row.notready = true; continue; }
      for (const pick of tabs) {
        const pr = { vp: vname, mode, phase, rail: pick.rail, slot: pick.slot, name: pick.name, W: vp.w, H: vp.h };
        try { await fullRun(page, vp, pick, pr); } catch (e) { pr.err = 'full ' + e.message; try { await page.clock.resume(); } catch (e2) {} }
        try { await skipRun(page, vp, pick, pr); } catch (e) { pr.skip = { err: e.message }; try { await page.clock.resume(); } catch (e2) {} }
        await page.evaluate(() => { try { closeAppraise(); } catch (e) {} });
        await page.waitForTimeout(300);
        row.picks.push(pr);
        console.log(vname, mode, phase, pick.rail, pick.slot, pr.err || '', pr.skip && pr.skip.err || '');
      }
      await page.evaluate(() => { try { closeAppraise(); } catch (e) {} });
      if (phase === 'mark') {
        for (let i = 0; i < 200; i++) { const c = await scr(page); if (c === 'bid') break; await page.evaluate(DRIVE_STEP); await page.waitForTimeout(8); }
      }
    }
    row.pageErrors = page.__errs;
  } catch (e) { results.notes.push(`${vname}|${mode} 例外：${e.message}\n${e.stack}`); }
  finally { results.cases.push(row); await ctx.close().catch(() => {}); }
}

try {
  for (const vp of VPS) for (const mode of MODES) await runCase(vp, mode);
} finally {
  await browser.close();
  srv.kill();
}
const outFile = path.join(OUT, `${TAG}-raw.json`);
fs.writeFileSync(outFile, JSON.stringify(results));
console.log('寫入', outFile, 'cases', results.cases.length, 'picks', results.cases.reduce((a, c) => a + c.picks.length, 0), 'notes', results.notes.length);
