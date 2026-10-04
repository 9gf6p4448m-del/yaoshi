import { parseOpt, launch, toMark, toMarket, installProbe } from './_flow.mjs';
const opt = parseOpt(); const L = await launch(opt); const { page } = L;
try {
  await page.goto(L.url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await toMark(page); await page.waitForFunction(() => window.__yaoshi3d.tray.items().every((i) => i.ready), null, { timeout: 60000 });
  await page.evaluate(() => window.__yaoshi3d.tray.hands.ready());
  await toMarket(page, 2); await installProbe(page);
  await page.evaluate(() => { const T = window.__yaoshi3d.tray, P = window.__probe; P.calls = []; const ob = T.props.bid; T.props.bid = function (s, k, a) { P.calls.push([+(performance.now() - P.t0).toFixed(0), 'props.bid', s, k, a]); return ob.apply(this, arguments); }; });
  await page.click('#mainbtn');
  await page.waitForFunction(() => window.__probe.announceAt !== null, null, { timeout: 15000 });
  console.log(JSON.stringify(await page.evaluate(() => window.__probe.calls)));
} finally { await L.close(); }
