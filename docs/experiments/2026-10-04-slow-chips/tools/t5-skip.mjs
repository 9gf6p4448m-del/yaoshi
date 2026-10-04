/* 條件 5：開標擺錢中按跳過。node t5-skip.mjs --root=<樹> --at=300|1000（按「蓋牌開標」後幾 ms 呼叫 doSkip）[--out=x.json] */
import fs from 'node:fs';
import { parseOpt, launch, toMark, toMarket, installProbe } from './_flow.mjs';
const opt = parseOpt(); const at = Number(opt.at || 300); const L = await launch(opt); const { page } = L; let out;
try {
  await page.goto(L.url, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await toMark(page); await page.waitForFunction(() => window.__yaoshi3d.tray.items().every((i) => i.ready), null, { timeout: 60000 });
  await page.evaluate(() => window.__yaoshi3d.tray.hands.ready());
  const MAXB = await page.evaluate(() => CFG.MAX_BIDS);
  await toMarket(page, MAXB); await installProbe(page);
  await page.evaluate((ms) => {
    document.getElementById('mainbtn').addEventListener('click', () => {
      setTimeout(() => {
        const P = window.__probe; P.busyAtSkip = null;
        try { const T = window.__yaoshi3d.tray; let b = 0; for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) { const st = T.props.stackAt(s, k); if (st && st.t < 1) b++; } P.busyAtSkip = { chipStacksInFlight: b, handsBusy: T.hands.stats().state.filter((x) => x !== null).length }; } catch (e) {}
        P.skipAt = performance.now(); window.doSkip();
      }, ms);
    }, true);
  }, at);
  await page.click('#mainbtn');
  await page.waitForFunction(() => window.__probe.announceAt !== null && window.__probe.firstSettledAfterSkip !== null, null, { timeout: 8000 });
  await page.waitForTimeout(300);
  const P = await page.evaluate(() => window.__probe);
  const settleS = (P.firstSettledAfterSkip - P.skipAt) / 1000, annS = (P.announceAt - P.skipAt) / 1000;
  out = { root: opt.root, skipAtMs: at, busyAtSkip: P.busyAtSkip, settledAfterSkipS: +settleS.toFixed(3), announceAfterSkipS: +annS.toFixed(3), pass: settleS <= 0.1 && annS <= 0.5 && annS >= 0, errors: L.errors };
} finally { await L.close(); }
console.log(JSON.stringify(out)); if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
console.log('條件5:', out.pass ? 'PASS' : 'FAIL');
