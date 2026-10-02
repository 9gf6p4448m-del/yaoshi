/* 後景人影（階段三 #E）實頁探針：凍結驗收 docs/experiments/2026-10-01-acceptance-seat-hands.md 的 #B1／#E1／#E2。
   跑法：node tests/tools/silhouettes-probe.mjs [--out=<json>] [--shots=<資料夾>] [--port=8979]
   一律量真實頁面：
   - draw call：renderer.info.render.calls，人影可見 vs 人影 group 不可見（同一幀、同一場景），差值＝人影的增量。
   - 每尊三角形：api.stats().trisByFigure（幾何實際頂點數 ÷3）。
   - 窗內：把每一尊的全部頂點用真實相機投影到 CSS px，與「掏空窗」比（窗＝提案 plan-table3d §Q3：844×390 下 x 176..668、y 64..320，按比例換到其他視窗）。
   - 不蓋托盤與拍品：與 tray.bboxScreen(i)（每格拍品模型的螢幕外框）、`#tray` DOM 外框、其他可見 HUD DOM 的外框逐一比重疊。
   - 對決隱藏：mesh.onBeforeRender 計數（＝真的被渲染了幾次）：牌桌狀態 >0、派 ys:duel 後 ＝0、派 ys:duel-end 後恢復。
   - 截圖（遊戲鏡頭、牌桌狀態）：--shots 資料夾，不 commit。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = Number(opt.port || 8979);
const ROOT = opt.root ? path.resolve(opt.root) : HERE;
const SHOTS = opt.shots ? path.resolve(HERE, opt.shots) : null;
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const VPS = String(opt.vps || 'L:844x390,L:1280x720,P:390x844').split(',').map((s) => { const [lay, wh] = s.split(':'); const [w, h] = wh.split('x').map(Number); return { lay, w, h }; });

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const report = { root: ROOT, runs: {} };
let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  for (const vp of VPS) report.runs[`${vp.lay}-${vp.w}x${vp.h}`] = await run(vp);
} finally { await browser?.close(); server.kill(); }
/* ── 閘門（凍結 #B1／#E1／#E2；窗＝提案 plan-table3d §Q3 的 844×390 → x 176..668、y 64..320，按視窗比例換算；P 版面只驗在視窗內） ── */
const WIN = { x0: 176 / 844, x1: 668 / 844, y0: 64 / 390, y1: 320 / 390 };
const hit = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
report.gates = {};
for (const [k, r] of Object.entries(report.runs)) {
  const L = k.startsWith('L-'), { W, H } = r.vp || { W: 1, H: 1 };
  const win = L ? { left: WIN.x0 * W, right: WIN.x1 * W, top: WIN.y0 * H, bottom: WIN.y1 * H } : { left: 0, right: W, top: 0, bottom: H };
  const inWin = (f) => f.left >= win.left && f.right <= win.right && f.top >= win.top && f.bottom <= win.bottom;
  const huds = (r.hud || []).filter((h) => h.hasBg || h.bgImg).filter((h) => !(h.left <= 0 && h.top <= 0 && h.right >= W && h.bottom >= H));
  const g = {
    tris_le200_each: !!r.stats && r.stats.trisByFigure.length === 3 && r.stats.trisByFigure.every((t) => t <= 200),
    drawCall_delta_le3: !!r.drawCalls && r.drawCalls.delta >= 1 && r.drawCalls.delta <= 3,
    inWindow: !!r.figs && r.figs.every(inWin),
    notBehindCamera: !!r.figs && r.figs.every((f) => f.behind === 0),
    notOverItems: !!r.figs && !(r.slots || []).some((s) => r.figs.some((f) => hit(f, s))),
    notOverHud: !!r.figs && !huds.some((h) => r.figs.some((f) => hit(f, h))),
    hiddenInDuel_shownAtTable: !!r.duel && r.duel.renderedInTable > 0 && r.duel.renderedInDuel === 0 && r.duel.renderedAfterDuelEnd > 0,
    noPageErrors: r.errors.length === 0,
  };
  report.gates[k] = g;
}
report.pass = Object.values(report.gates).every((g) => Object.values(g).every(Boolean));
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), JSON.stringify(report, null, 1));
console.log(JSON.stringify(opt.full ? report : { gates: report.gates, pass: report.pass }, null, 1));
process.exit(report.pass ? 0 : 1);

async function run({ lay, w, h }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.query || ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  let ready = false;
  for (let i = 0; i < 400 && !ready; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) { ready = true; break; }
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click());
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  if (!ready) throw new Error(lay + '：沒走到第 1 夜盯上頁');
  if (lay === 'P') await page.addStyleTag({ content: '#rotateHint{display:none !important}' });
  await page.evaluate(async () => { const t = window.__yaoshi3d.tray; await t.loaded(); await t.hands.ready(); t.props.clearRound(); t.hands.clear(); });
  await page.waitForTimeout(600);
  const out = await page.evaluate(async () => {
    const Y = window.__yaoshi3d, T = Y.tray, S = T.silhouettes, W = window.innerWidth, H = window.innerHeight;
    const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const calls = async () => { const info = Y.renderer.info; info.autoReset = false; info.reset(); await frames(2); const c = info.render.calls / 2; info.autoReset = true; return c; };
    const res = { stats: S.stats ? S.stats() : null, mode: T.mode() };
    if (!S.mesh) return Object.assign(res, { off: true });
    /* ① draw call：同一場景、人影 group 可見／不可見 */
    const on = await calls(); S.group.visible = false; const off = await calls(); S.group.visible = true;
    res.drawCalls = { withSil: on, withoutSil: off, delta: on - off };
    /* ② 投影：每尊全部頂點 → CSS px 外框 */
    const pos = S.mesh.geometry.attributes.position, v = new Y.camera.position.constructor();
    Y.camera.updateMatrixWorld(true);
    const figs = []; let off0 = 0;
    for (const tris of res.stats.trisByFigure) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = 0;
      for (let i = off0; i < off0 + tris * 3; i++) {
        v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(S.mesh.matrixWorld).project(Y.camera);
        if (v.z > 1 || v.z < -1) behind++;
        const px = (v.x * 0.5 + 0.5) * W, py = (1 - (v.y * 0.5 + 0.5)) * H;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      off0 += tris * 3; figs.push({ left: x0, top: y0, right: x1, bottom: y1, behind });
    }
    res.figs = figs; res.vp = { W, H };
    /* ③ 其他東西的外框：拍品模型、#tray、可見 HUD DOM */
    res.slots = [0, 1, 2, 3].map((i) => T.bboxScreen(i));
    const rectOf = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
    const hud = [];
    for (const e of document.body.querySelectorAll('*')) {
      if (e.tagName === 'CANVAS' || e.closest('script,style')) continue;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      if (!/fixed|absolute|sticky/.test(cs.position)) continue;
      const r = rectOf(e); if (r.right - r.left < 24 || r.bottom - r.top < 24) continue;
      const bg = cs.backgroundColor, hasBg = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg);
      hud.push({ id: e.id || '', cls: String(e.className).slice(0, 40), tag: e.tagName, hasBg, bgImg: cs.backgroundImage !== 'none', ...r });
    }
    res.hud = hud;
    /* ④ 對決隱藏：onBeforeRender 計數（＝真的被渲染） */
    let n = 0; const prev = S.mesh.onBeforeRender; S.mesh.onBeforeRender = () => { n++; };
    n = 0; await frames(6); const tableN = n;
    document.dispatchEvent(new CustomEvent('ys:duel')); n = 0; await frames(6); const duelN = n; const duelVisible = T.visible();
    document.dispatchEvent(new CustomEvent('ys:duel-end')); n = 0; await frames(6); const backN = n;
    S.mesh.onBeforeRender = prev;
    res.duel = { renderedInTable: tableN, renderedInDuel: duelN, trayVisibleInDuel: duelVisible, renderedAfterDuelEnd: backN };
    return res;
  });
  out.errors = errors;
  if (SHOTS && !out.off) {
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, `table-${lay}-${w}x${h}.png`) });
    /* 對照：人影 group 隱藏的同一幀 */
    await page.evaluate(() => { window.__yaoshi3d.tray.silhouettes.group.visible = false; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, `table-${lay}-${w}x${h}-nosil.png`) });
    await page.evaluate(() => { window.__yaoshi3d.tray.silhouettes.group.visible = true; });
  }
  await ctx.close();
  return out;
}
