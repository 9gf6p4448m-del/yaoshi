import { chromium, withServer, openPage, ev, step, CURSE12 } from './grab-probe.mjs';
await withServer(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const { page } = await openPage(browser, 'V3', '');
  const out = [];
  for (const sc of CURSE12.filter((x) => !x.extra)) {
    await page.evaluate(([s]) => window.__gp.reset(s, true, 'wedding'), [sc.slot]);
    await ev(page, 'ys:bid', { seat: sc.seat, slot: sc.slot, amount: 6 }); await step(page, 50);
    await ev(page, 'ys:reveal-slot', { slot: sc.slot, ms: 812 }); await step(page, 49);
    const ms = await page.evaluate((sc) => { const t0 = performance.now(); document.dispatchEvent(new CustomEvent('ys:reveal-result', { detail: { winner: sc.seat, slot: sc.slot, transferTarget: sc.target, destroy: false, grabMs: 1260, curseMs: 2000, skip: false } })); return performance.now() - t0; }, sc);
    out.push(sc.name + ':' + ms.toFixed(1)); await step(page, 200);
  }
  console.log('reveal-result dispatch ms (含開演抬升規劃)', out.join(' '));
  await browser.close();
});
