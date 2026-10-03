import { startServer, withBrowser, openPage, startSolo, advanceToBid, trayState, expectState, lfDump, arg } from './lf-lib.mjs';
const root = arg('--root'), port = Number(arg('--port', 9881)), seed = Number(arg('--seed', 3));
const srv = await startServer(root, port);
await withBrowser(async (ctx) => {
  const { page, errs } = await openPage(ctx, { url: `http://127.0.0.1:${port}/index.html`, delayRenderer: Number(arg('--delay', 0)) });
  if (arg('--pre','0')==='1') await page.waitForFunction('window.__yaoshi3d && window.__yaoshi3d.tray', null, {timeout:60000});
  const tN = await startSolo(page, seed); console.log('newGame at', Math.round(tN));
  console.log('bid reached', await advanceToBid(page));
  console.log('expect', JSON.stringify(await expectState(page)));
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(500); const s = await trayState(page); console.log(i * 0.5, JSON.stringify(s)); if (s.trayDef && s.readyCount >= s.n && i > 8) break; }
  console.log(JSON.stringify(await lfDump(page))); console.log('errs', errs);
});
srv.close();
