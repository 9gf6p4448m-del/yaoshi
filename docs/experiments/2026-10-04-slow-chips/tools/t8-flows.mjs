/* 條件 8：solo／熱座／?handreal=0／?hands=0 走到成交總覽，console error／pageerror 皆空。
   node t8-flows.mjs --root=<樹> [--out=x.json]（走法沿用 hand-arm-holes 的 driveUntil：逐步點主按鈕到 /看最終結果/） */
import fs from 'node:fs';
import { parseOpt, launch } from './_flow.mjs';
const opt = parseOpt(); const rows = [];
for (const [name, mode, q] of [['solo', 'solo', ''], ['hotseat', 'hotseat', ''], ['solo?handreal=0', 'solo', 'handreal=0'], ['solo?hands=0', 'solo', 'hands=0']]) {
  const L = await launch({ ...opt, q }); const { page } = L; const row = { name, reached: false };
  try {
    await page.goto(L.url, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(([m]) => window.__yaoshi.newGame(m, 7, m === 'hotseat' ? ['qingmian', 'shoujing'] : ['qingmian']), [mode]);
    let maxChips = 0;
    for (let i = 0; i < 6000; i++) {
      await page.waitForTimeout(10);
      const r = await page.evaluate(() => {
        const ho = document.getElementById('handoff'); if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { s: 0, chips: 0 }; }
        const T = window.__yaoshi3d?.tray; const chips = T ? T.props.chipCount() : 0;
        const b = document.getElementById('mainbtn'); const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
        if (b && /看最終結果/.test(txt) && !dis) return { s: 1, chips };
        if (b && !dis) { b.click(); return { s: 0, chips }; }
        const m = document.getElementById('modal');
        if (m && getComputedStyle(m).display !== 'none') { const k = document.getElementById('titheKeep'); if (k) { k.click(); return { s: 0, chips }; } const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { s: 0, chips }; } }
        const els = [...document.querySelectorAll('#stage button')]; const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled); if (sb) sb.click();
        return { s: 0, chips };
      });
      if (r.chips > maxChips) maxChips = r.chips;
      if (r.s) { row.reached = true; break; }
    }
    row.maxChips = maxChips; row.handsLoaded = await page.evaluate(() => !!window.__yaoshi3d.tray.hands.stats().loaded);
  } catch (e) { row.fatal = String(e); }
  row.errors = L.errors; row.pass = row.reached && L.errors.length === 0 && row.maxChips > 0; rows.push(row); await L.close();
}
console.log(JSON.stringify(rows)); if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(rows, null, 1));
console.log('條件8:', rows.every((r) => r.pass) ? 'PASS' : 'FAIL');
