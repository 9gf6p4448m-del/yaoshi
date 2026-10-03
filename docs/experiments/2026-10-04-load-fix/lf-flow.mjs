// 條件 7：熱座、?handreal=0、solo 各一局，開標走到成交總覽（.resultStrip 出現），console error 與 pageerror 皆空。
// node lf-flow.mjs --root <樹> [--port N] [--out file]
import fs from 'node:fs';
import { startServer, withBrowser, openPage, arg } from './lf-lib.mjs';
import { DRIVE_STEP } from '../../../tests/tools/appraise-c-lib.mjs';
const root = arg('--root'), port = Number(arg('--port', 9882)), OUT = arg('--out', null), SEED = 3;
const srv = await startServer(root, port);
const res = {};
async function flow(name, mode, query) {
  await withBrowser(async (ctx) => {
    const P = await openPage(ctx, { url: `http://127.0.0.1:${port}/index.html${query}` });
    const page = P.page;
    await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
    await page.evaluate((m) => startEntry(m), mode);
    const pick = async () => { await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0); await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click()); await page.waitForTimeout(100); };
    await pick();
    if (mode === 'hotseat') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pick(); }
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, mode]);
    let reached = false;
    for (let i = 0; i < 6000; i++) {
      await page.waitForTimeout(10);
      if (await page.evaluate(() => !!document.querySelector('.resultStrip'))) { reached = true; break; }
      await page.evaluate(DRIVE_STEP);
    }
    const info = await page.evaluate(() => ({ round: S.round, strip: (document.querySelector('.resultStrip') || {}).textContent?.slice(0, 40), tray: !!(window.__yaoshi3d && window.__yaoshi3d.tray), handrealFlag: new URLSearchParams(location.search).get('handreal') }));
    res[name] = { reached, info, errs: P.errs, pass: reached && P.errs.length === 0 };
  });
}
await flow('solo', 'solo', '');
await flow('hotseat', 'hotseat', '');
await flow('handreal0', 'solo', '?handreal=0');
srv.close();
const txt = JSON.stringify({ pass: Object.values(res).every((r) => r.pass), res }, null, 1);
if (OUT) fs.writeFileSync(OUT, txt); console.log(txt); process.exit(0);
