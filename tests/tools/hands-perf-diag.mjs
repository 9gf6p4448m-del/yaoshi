/* 席位之手 效能診斷（不是正式 gate）：正式 perf32／perf128（scene-shot.mjs）在量測時手早已收回（穩態不可見），
   量不到「四隻手同時在場」的成本。這支在同一頁、同一桌面狀態下交錯 5 輪量 renders/s：
   四隻手凍在推的姿勢（可見）vs 收掉（不可見），回報比值。本機 Chromium 相對值，不是 Safari fps。
   跑法：node tests/tools/hands-perf-diag.mjs [--runs=5] [--port=8979] */
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)=(.*)$/); if (m) opt[m[1]] = m[2]; }
const RUNS = Number(opt.runs || 5), PORT = Number(opt.port || 8979);
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await page.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click());
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  const out = await page.evaluate(async (RUNS) => {
    const Y = window.__yaoshi3d, H = Y.tray.hands; await Y.tray.loaded(); await H.ready();
    const ev = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
    const rate = async () => { const f0 = Y.renderer.info.render.frame, t0 = performance.now(); await new Promise((r) => setTimeout(r, 1500)); return (Y.renderer.info.render.frame - f0) / ((performance.now() - t0) / 1000); };
    const on = [], off = [], calls = {};
    for (let r = 0; r < RUNS; r++) {
      Y.tray.props.clearRound(); H.clear(); H.setFrozen(false);
      for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) ev('ys:bid', { seat: s, slot: k, amount: a });
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); H.setFrozen(true);
      await new Promise((res) => setTimeout(res, 700));
      calls.on = Y.renderer.info.render.calls; const vis = H.stats().visible.length;
      on.push(await rate());
      H.finish(); await new Promise((res) => setTimeout(res, 300)); calls.off = Y.renderer.info.render.calls;
      off.push(await rate());
      if (vis !== 4) throw new Error('手沒有四隻在場：' + vis);
    }
    H.setFrozen(false);
    return { on, off, calls };
  }, RUNS);
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  console.log(JSON.stringify({ mode: 'hands-perf-diag', runs: RUNS, rendersPerSec: { handsVisible: out.on.map((x) => +x.toFixed(1)), handsHidden: out.off.map((x) => +x.toFixed(1)) },
    medianRatioVisibleOverHidden: +(med(out.on) / med(out.off)).toFixed(4), paired: out.on.map((x, i) => +(x / out.off[i]).toFixed(4)), lastFrameCalls: out.calls }, null, 1));
} finally { await browser?.close(); server.kill(); }
