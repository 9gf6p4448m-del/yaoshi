/* 條件 2b：實按「蓋牌開標」，量「開標前公告」出現時刻 vs 所有錢落定且所有手閒置的時刻。
   node t2-reveal-dom.mjs --root=<樹> [--settle=2000]（--settle＝執行期把 CFG.CHIP_SETTLE_MS 改成該值，供「還原為 2000」鑑別力驗證）[--out=x.json] */
import fs from 'node:fs';
import { parseOpt, launch, toMark, toMarket, installProbe } from './_flow.mjs';
const opt = parseOpt(); const L = await launch(opt); const { page } = L;
let out;
try {
  await page.goto(L.url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await toMark(page); await page.waitForFunction(() => window.__yaoshi3d.tray.items().every((i) => i.ready), null, { timeout: 60000 });
  await page.evaluate(() => window.__yaoshi3d.tray.hands.ready());
  const MAXB = await page.evaluate(() => CFG.MAX_BIDS);
  if (opt.settle) await page.evaluate((v) => { CFG.CHIP_SETTLE_MS = v; }, Number(opt.settle));
  await toMarket(page, MAXB); await installProbe(page);
  await page.click('#mainbtn');
  await page.waitForFunction(() => window.__probe.announceAt !== null, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  const P = await page.evaluate(() => window.__probe);
  const settle = await page.evaluate(() => CFG.CHIP_SETTLE_MS);
  const gap = (P.announceAt - P.lastBusy) / 1000;
  out = { root: opt.root, settleMs: settle, maxBids: MAXB, maxChips: P.maxChip, chipsToLastBusyS: +((P.lastBusy - P.t0) / 1000).toFixed(3), announceAtS: +((P.announceAt - P.t0) / 1000).toFixed(3), gapS: +gap.toFixed(3), announceAfterAllSettled: P.announceAt > P.lastBusy, pass: P.announceAt > P.lastBusy && gap >= 0.95, frames: P.frames, timeline: P.timeline, errors: L.errors, probeErrs: P.errs };
} finally { await L.close(); }
console.log(JSON.stringify(out)); if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
console.log('條件2b:', out.pass ? 'PASS' : 'FAIL');
