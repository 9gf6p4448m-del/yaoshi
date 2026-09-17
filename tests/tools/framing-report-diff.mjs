/* 取景矩陣報告逐案比對（2026-09-17）：把兩組 table-framing-check 報告（可各由多個 --match 分塊組成）
 * 依 viewport＋fixture 對齊，逐案深度比對全部欄位（bounds／retreat／shift／終點幾何／rects／renderer 快照）。
 * 純成本改動的預期是差異數＝0。跑法：
 *   node tests/tools/framing-report-diff.mjs --pre=a.json[,b.json,...] --post=c.json[,d.json,...]
 * exit 0＝案例集相同且全部逐案相等；否則列出前 20 個差異並 exit 1。 */
import fs from 'node:fs';
const list = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) || '').split(',').filter(Boolean);
const load = files => {
  const map = new Map();
  for (const f of files) for (const r of JSON.parse(fs.readFileSync(f, 'utf8')).results) {
    const id = `${r.viewport}|${r.fixture}`;
    if (map.has(id)) throw new Error(`duplicate case ${id} in ${f}`);
    map.set(id, r);
  }
  return map;
};
const pre = load(list('pre')), post = load(list('post'));
const diffs = [], numeric = [];
const walk = (a, b, p) => {
  if (a === b) return;
  if (typeof a === 'number' && typeof b === 'number') numeric.push({ path: p, delta: Math.abs(a - b) });
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') { diffs.push(`${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); return; }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) walk(a[k], b[k], `${p}.${k}`);
};
for (const id of new Set([...pre.keys(), ...post.keys()])) {
  if (!pre.has(id)) { diffs.push(`${id}: only in post`); continue; }
  if (!post.has(id)) { diffs.push(`${id}: only in pre`); continue; }
  walk(pre.get(id), post.get(id), id);
}
// 數值差異分佈：矩陣工具的動畫相位跟牆鐘走，同版重跑也會有微小差異；把 pre/pre 與 pre/post 的分佈並列才有判讀依據。
const deltas = numeric.map(n => n.delta).sort((a, b) => a - b);
const pct = q => deltas.length ? deltas[Math.min(deltas.length - 1, Math.floor(q * deltas.length))] : 0;
const worst = numeric.sort((a, b) => b.delta - a.delta).slice(0, 5);
const nonNumeric = diffs.filter(d => !numeric.some(n => d.startsWith(n.path + ':')));
const out = { preCases: pre.size, postCases: post.size, prePassed: [...pre.values()].filter(r => r.pass).length,
  postPassed: [...post.values()].filter(r => r.pass).length, differences: diffs.length,
  numeric: { count: deltas.length, maxAbs: deltas.at(-1) ?? 0, p50: pct(.5), p90: pct(.9), p99: pct(.99),
    over0_5px: deltas.filter(d => d > .5).length, over1px: deltas.filter(d => d > 1).length, worst },
  nonNumericDifferences: nonNumeric.length, nonNumericSample: nonNumeric.slice(0, 10), sample: diffs.slice(0, 10) };
console.log(JSON.stringify(out, null, 2));
process.exitCode = diffs.length || pre.size !== post.size ? 1 : 0;
