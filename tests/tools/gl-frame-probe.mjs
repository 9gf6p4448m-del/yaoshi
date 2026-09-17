/* A1 效能診斷：真實頁面每幀 WebGL 呼叫計數（2026-09-17）。
 * 用 addInitScript 把 canvas 的 WebGL context 包成 Proxy，逐幀計數每個 gl.* 方法，並記錄
 * texSubImage2D／texImage2D 的尺寸／格式／型別，另外掃描場景中「同一顆材質同時被
 * instanced／非 instanced、skinned／非 skinned、有／無 instanceColor 的物件共用」的情況——
 * Three 0.158 的 setProgram 對這種共用每幀都會重走 getProgram()（getParameters／cache key）。
 * fixture 與 scratchpad/a1-hover-cpu-profile.mjs 相同：seed 1、初夜出價頁、844×390 DPR2、32 枚、hover slot。
 * 跑法：node tests/tools/gl-frame-probe.mjs --out=<repo-relative json> [--slot=1] [--frames=120] [--port=8896] [--coins=32]
 * 這是計數證據，不是 fps 證據；GPU 端成本看不到。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { glProbeInit, scanFrames, pixelABFrame, drawBudgetScan, shellABFrame } from './gl-probe-lib.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const argv = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)=(.*)$/); if (!m) throw new Error(`expected --key=value, got ${a}`); return [m[1], m[2]]; }));
const port = Number(argv.port || 8896), slot = Number(argv.slot ?? 1), FRAMES = Number(argv.frames || 120), COINS = Number(argv.coins || 32);
const outFile = argv.out && path.resolve(ROOT, argv.out);
if (outFile && path.relative(ROOT, outFile).startsWith('..')) throw new Error('--out must stay inside the repository');
if (![32, 128].includes(COINS)) throw new Error('--coins 只接受 32 或 128');
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');

const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
let result;
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await context.addInitScript(glProbeInit);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e)}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
  try { await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d', { timeout: 20000 }); }
  catch (e) { throw new Error(`page did not expose __yaoshi3d: ${errors.join(' | ') || String(e)}`); }
  await page.evaluate(() => {
    CFG.T = 1;
    const effects = window.__yaoshi.PW_FX;
    for (const key of Object.keys(effects)) if (/_MS$/.test(key)) effects[key] = 1;
    window.__yaoshi.newGame('solo', 1, ['qingmian']);
  });
  let reached = false;
  for (let i = 0; i < 400 && !reached; i++) {
    await page.waitForTimeout(12);
    const state = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { text: b?.textContent || '', disabled: !b || b.disabled, round: window.__yaoshi.S?.round || 0 }; });
    if (/蓋牌/.test(state.text) && !state.disabled && state.round === 1) { reached = true; break; }
    if (!state.disabled) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click());
  }
  if (!reached) throw new Error('did not reach the seed-1 round-1 bid page');
  await page.evaluate(async coins => {
    const tray = window.__yaoshi3d.tray;
    await tray.loaded();
    if (coins === 128) { for (let seat = 0; seat < 4; seat++) for (let s = 0; s < 4; s++) tray.props.bid(seat, s, 8); }
    else for (let seat = 0; seat < 4; seat++) { tray.props.bid(seat, seat, 8); tray.props.mark(seat, seat); }
    await tray.loaded();
  }, COINS);
  await page.waitForTimeout(1100);
  await page.evaluate(() => { const s = window.__yaoshi3d; s.renderer.compile(s.scene, s.camera); s.renderer.render(s.scene, s.camera); });
  await page.waitForTimeout(450);
  await page.evaluate(v => window.__yaoshi3d.tray.setHover(v), slot);
  await page.waitForTimeout(600);

  result = await page.evaluate(scanFrames, FRAMES);
  if (argv.drawBudget) result.drawBudget = await page.evaluate(drawBudgetScan); // 對決卷二：場景那一趟的 draw 分佈（依物件名／型別）
  // `--disposeRounds=N`：C-1 回歸路徑——同一批拍品清空再擺回 N 輪，記錄每輪 renderer.info.memory；
  // 骨架共用後多出來的 Skeleton 若沒釋放乾淨，textures 會逐輪增加（原 C-1 實測每輪 +50）。
  const disposeRounds = Number(argv.disposeRounds || 0);
  if (disposeRounds > 0) {
    result.disposeRounds = await page.evaluate(async rounds => {
      const s = window.__yaoshi3d, tray = s.tray, info = s.renderer.info;
      const items = tray.items().map(m => ({ key: m.key, curse: m.curse, curseKind: m.curseKind, fac: m.fac, moon: m.moon }));
      const render = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const log = [{ round: 0, ...info.memory }];
      for (let r = 1; r <= rounds; r++) {
        await tray.setItems([]); await render();
        await tray.setItems(items); await tray.loaded(); await render();
        log.push({ round: r, ...info.memory, ready: tray.readyCount() });
      }
      return log;
    }, disposeRounds);
  }
  // `--pixelAB=1`：同幀像素 A/B——同一個 evaluate 內不推進時間，以出貨旗標渲染一次讀回像素，翻轉所有
  // transparent＋DoubleSide 材質的 forceSinglePass 再渲染一次讀回，逐位元組比對。附兩個對照：同旗標重渲染
  // （應 0 差異，證明比對本身決定性）與改成 BackSide（可見 decal 被剔掉，應有差異，證明比對看得見剔除／混合順序的改變）。
  if (argv.pixelAB) {
    result.pixelAB = [];
    for (const sl of [0, 1, 2, 3]) {
      await page.evaluate(v => window.__yaoshi3d.tray.setHover(v), sl);
      await page.waitForTimeout(600);
      const r = await page.evaluate(pixelABFrame);
      result.pixelAB.push({ slot: sl, ...r });
    }
  }
  // `--shellAB=1`：外殼合併的同幀像素 A/B（對決卷二），hover slot0–3 各一次
  if (argv.shellAB) {
    result.shellAB = [];
    for (const sl of [0, 1, 2, 3]) { await page.evaluate(v => window.__yaoshi3d.tray.setHover(v), sl); await page.waitForTimeout(600); result.shellAB.push({ slot: sl, ...(await page.evaluate(shellABFrame)) }); }
  }
  result = { tool: 'tests/tools/gl-frame-probe.mjs', fixture: { seed: 1, phase: 'round-1 bid', viewport: [844, 390], deviceScaleFactor: 2, coins: COINS, hoverSlot: slot, frames: FRAMES }, ...result, errors };
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
if (outFile) { fs.mkdirSync(path.dirname(outFile), { recursive: true }); fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify({ renderedFrames: result.renderedFrames, rendersPerSec: result.rendersPerSec, programs: result.programs, sharedMaterialMismatch: result.sharedMaterialMismatch,
  pixelAB: result.pixelAB, programChurn: result.programChurn && { getParametersPerFrame: result.programChurn.getParametersPerFrame, materialsCalled: result.programChurn.materialsCalled, top: result.programChurn.materials.slice(0, 12).map(m => ({ material: m.material, type: m.type, callsPerFrame: m.callsPerFrame, changed: m.changedBetweenCalls, userCount: m.userCount, users: m.users.slice(0, 4) })) },
  textureUploadsPerFrame: result.textureUploadsPerFrame, topCalls: Object.entries(result.glCallsPerFrame).slice(0, 25), errors: result.errors }, null, 1));
