/* 條件 3 判定：node t3-check.mjs <base.json> <new.json>（兩份都由 t3-hand.mjs 產生） */
import fs from 'node:fs';
const [B, N] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const PACE = 0.70 / 0.42, LO = PACE * 0.85, HI = PACE * 1.15, STEP = 1 / 120;
const inR = (x) => x >= LO && x <= HI;
const ratios = (key, field) => B.a[key].map((b, i) => N.a[key][i][field] / b[field]);
const rep = {};
for (const [key, field] of [['single', 'handTotal'], ['double', 'handTotal'], ['single', 'pushEnd'], ['double', 'pushEnd']]) {
  const r = ratios(key, field); const self = B.a[key].map(() => 1);
  rep[`a_${key}_${field}`] = { 新對基準比值: r.map((x) => +x.toFixed(3)), 全落區間: r.every(inR), 基準對自己_必紅: self.every(inR) };
}
const a_pass = Object.values(rep).every((x) => x.全落區間 && !x.基準對自己_必紅);
const dB = B.b.filter((x) => x.ratio !== null).map((x) => x.ratio), dN = N.b.filter((x) => x.ratio !== null).map((x) => x.ratio); // 修訂記錄 2：改比「差值÷該格飛行時長」
const nullB = B.b.length - dB.length, nullN = N.b.length - dN.length;
const lo = Math.min(...dB) - 0.10, hi = Math.max(...dB) + 0.10;
const outside = N.b.filter((x) => x.ratio !== null && (x.ratio < lo - 1e-9 || x.ratio > hi + 1e-9));
const b_pass = dB.length >= 12 && dN.length >= 12 && nullN <= nullB && outside.length === 0;
const cmpC = B.c.map((b, i) => ({ seat: b.seat, role: b.role, base: b.handTotal, new: N.c[i].handTotal, diff: +(N.c[i].handTotal - b.handTotal).toFixed(4) }));
const c_pass = cmpC.every((x) => Math.abs(x.diff) <= STEP + 1e-9);
/* 補充（不入判定）：時間尺度歸一化——差值除以該格錢柱飛行時長，若手錢相位關係沒變，歸一化後新舊應一致 */
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log(JSON.stringify({ 條件3a: { 區間: [+LO.toFixed(3), +HI.toFixed(3)], ...rep, pass: a_pass } }, null, 1));
console.log(JSON.stringify({ 條件3b: { 基準有效樣本: dB.length, 基準null: nullB, 新版有效樣本: dN.length, 新版null: nullN, 基準min: Math.min(...dB), 基準max: Math.max(...dB), 允許區間: [+lo.toFixed(4), +hi.toFixed(4)], 新版min: Math.min(...dN), 新版max: Math.max(...dN), 區間外筆數: outside.length, 區間外: outside.map((x) => `${x.seat}/${x.pair}/${x.slot}:${x.ratio}`), pass: b_pass, 補充_平均差值: { 基準: +mean(dB).toFixed(4), 新版: +mean(dN).toFixed(4), 比值: +(mean(dN) / mean(dB)).toFixed(3) } } }, null, 1));
/* 補強檢查（不取代上面的 null 子條款）：歸一化到位口徑 */
const r2B = B.b.filter((x) => x.ratio2 != null).map((x) => x.ratio2), r2N = N.b.filter((x) => x.ratio2 != null).map((x) => x.ratio2);
const lo2 = Math.min(...r2B) - 0.10, hi2 = Math.max(...r2B) + 0.10, out2 = r2N.filter((x) => x < lo2 - 1e-9 || x > hi2 + 1e-9);
const nul2B = B.b.length - r2B.length, nul2N = N.b.length - r2N.length;
const p2 = r2B.length >= 12 && r2N.length >= 12 && nul2N <= nul2B && out2.length === 0;
console.log(JSON.stringify({ 條件3b_補強_歸一化到位: { 基準有效: r2B.length, 基準null: nul2B, 新版有效: r2N.length, 新版null: nul2N, 基準min: Math.min(...r2B), 基準max: Math.max(...r2B), 允許區間: [+lo2.toFixed(4), +hi2.toFixed(4)], 新版min: Math.min(...r2N), 新版max: Math.max(...r2N), 區間外筆數: out2.length, pass: p2 } }, null, 1));
console.log(JSON.stringify({ 條件3c: { rows: cmpC, pass: c_pass } }));
console.log('條件3a:', a_pass ? 'PASS' : 'FAIL', '| 3b:', b_pass ? 'PASS' : 'FAIL', '| 3c:', c_pass ? 'PASS' : 'FAIL', '| 3b補強:', p2 ? 'PASS' : 'FAIL');
