/* v0.61.1 詛咒放慢驗收（docs/experiments/2026-10-05-curse-slow/acceptance.md 條件 2–6）彙總：
 *   node tests/tools/curse-slow-compare.mjs <新版 result-slow.json> <基準 result-slow.json>
 * 兩份都由 grab-probe.mjs --modes=slow 產出（同一支治具、同一組 12 組合事件；基準用 --root=<709e313a 樹>）。
 * 條件 3 的「每 100ms 螢幕位移最大值 ≤ 基準同組 0.6 倍」在這裡判（judgeCurseSlow 只給絕對量）；量不到（null）一律紅。
 * 分母＝12 個核心組合（extra 的南塞西其餘槽另列，加嚴不計分母）。 */
import fs from 'node:fs';
const [hp, bp] = process.argv.slice(2);
const H = JSON.parse(fs.readFileSync(hp, 'utf8')).modes.slow.rows, B = JSON.parse(fs.readFileSync(bp, 'utf8')).modes.slow.rows;
const rows = [];
for (const h of H) {
  const b = B.find((x) => x.name === h.name);
  const ratio = b && b.c3.step100 && h.c3.step100 !== null ? h.c3.step100 / b.c3.step100 : null;
  const c3 = h.c3.passAbs && ratio !== null && ratio <= 0.6;
  rows.push({ name: h.name, extra: h.extra, landed: h.c2.landedMs, c2: h.c2.pass, pushMs: h.c3.pushMs, holdMs: h.c3.holdMs, step: h.c3.step100, baseStep: b ? b.c3.step100 : null, ratio: ratio === null ? null : +ratio.toFixed(2), c3,
    minY: h.c4.hands.minY, inOther: h.c4.hands.inOtherItemBox, c4: h.c4.pass, card: h.c5.card.cardMs, c5: h.c5.pass,
    ropeOut: h.c6.rope.outsideHold, ropePx: h.c6.rope.minPx, peaks: h.c6.tremble.peaks, c6: h.c6.pass,
    base: b ? { landed: b.c2.landedMs, c2: b.c2.pass, c3abs: b.c3.passAbs, holdMs: b.c3.holdMs } : null });
}
for (const r of rows) console.log(`${r.extra ? '(extra) ' : ''}${r.name}: landed ${r.landed} c2=${r.c2} | push ${r.pushMs} hold ${r.holdMs} step ${r.step}/${r.baseStep}=${r.ratio} c3=${r.c3} | minY ${r.minY} inOther ${r.inOther} c4=${r.c4} | card ${r.card} c5=${r.c5} | rope out ${r.ropeOut} px ${r.ropePx} peaks ${r.peaks} c6=${r.c6} || base landed ${r.base && r.base.landed} c2=${r.base && r.base.c2} c3abs=${r.base && r.base.c3abs}`);
const core = rows.filter((r) => !r.extra);
const sum = {}; for (const k of ['c2', 'c3', 'c4', 'c5', 'c6']) sum[k] = `${core.filter((r) => r[k]).length}/${core.length}`;
sum.baseC2Red = `${core.filter((r) => r.base && !r.base.c2).length}/${core.length}`; sum.baseC3Red = `${core.filter((r) => r.base && !r.base.c3abs).length}/${core.length}`;
console.log('SUMMARY ' + JSON.stringify(sum));
