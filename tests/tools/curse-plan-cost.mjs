/* v0.61.1 開演那一幀成本（acceptance 條件 18）：12 組各派一次 ys:reveal-result，量同步處理時間（含抬升規劃、路徑規劃）；
   --rounds=N 每輪開新頁，回每輪 p95 與 N 輪 p95 中位數。node tests/tools/curse-plan-cost.mjs [--root=<樹>] [--rounds=5] */
import { chromium, withServer, openPage, ev, step, CURSE12 } from './grab-probe.mjs';
const ROUNDS = Number((process.argv.find((a) => a.startsWith('--rounds=')) || '--rounds=1').split('=')[1]);
await withServer(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const p95s = [];
  for (let rd = 0; rd < ROUNDS; rd++) {
  const { page, ctx } = await openPage(browser, 'V3', '');
  const out = [], vals = [];
  for (const sc of CURSE12.filter((x) => !x.extra)) {
    await page.evaluate(([s]) => window.__gp.reset(s, true, 'wedding'), [sc.slot]);
    await ev(page, 'ys:bid', { seat: sc.seat, slot: sc.slot, amount: 6 }); await step(page, 50);
    await ev(page, 'ys:reveal-slot', { slot: sc.slot, ms: 812 }); await step(page, 49);
    const ms = await page.evaluate((sc) => { const t0 = performance.now(); document.dispatchEvent(new CustomEvent('ys:reveal-result', { detail: { winner: sc.seat, slot: sc.slot, transferTarget: sc.target, destroy: false, grabMs: 1260, curseMs: 2000, skip: false } })); return performance.now() - t0; }, sc);
    out.push(sc.name + ':' + ms.toFixed(1)); vals.push(ms); await step(page, 200);
  }
  vals.sort((a, b) => a - b); const p95 = vals[Math.min(vals.length - 1, Math.ceil(vals.length * 0.95) - 1)]; p95s.push(p95);
  console.log(`round ${rd} reveal-result dispatch ms (含開演抬升規劃)`, out.join(' '), 'p95', p95.toFixed(1));
  await ctx.close();
  }
  p95s.sort((a, b) => a - b); console.log('MEDIAN_P95', p95s[Math.floor(p95s.length / 2)].toFixed(1), 'rounds', ROUNDS);
  await browser.close();
});
