// 第一階段 #6「左右拍品頁籤」對齊的分組修正重算（主對話依 02 §2.1 例外條裁定，2026-09-27）：
// 原分組把左右欄所有頁籤當同一列；直排窄籤在該分組下必紅（與實作對錯無關）。新分組：左欄第 i 枚 vs 右欄第 i 枚。
// 不重跑矩陣：用 visual-polish-probe 原始 JSON 的 p2.tabs（每枚籤的 rail／rect，0.1px）重算；其餘對齊組照原始 align 紅項。
// 用法：node tests/tools/rail-tabs-align-recalc.mjs <base.json> <head.json> [--mutate]   （--mutate：把每格右欄第 1 枚下移 5px，應變紅）
import fs from 'node:fs';
const [bf, hf] = process.argv.slice(2), MUT = process.argv.includes('--mutate');
const VPS = ['V1', 'V2', 'V3', 'V4', 'V5'];
function recalc(R, mutate) {
  const byVp = Object.fromEntries(VPS.map((v) => [v, { cells: 0, red: 0, railRed: 0, railPairs: 0 }])); const ex = [];
  for (const [k, C] of Object.entries(R.cells)) for (const [v, m] of Object.entries(C.vp)) {
    const B = byVp[v]; B.cells++;
    const other = (m.align || []).filter((x) => x.red && x.g !== 'railTabs' && !x.transient);
    const tabs = (m.p2 && m.p2.tabs && m.p2.tabs.tabs) || [];
    const W = tabs.filter((t) => t.rail === 'railW'), E = tabs.filter((t) => t.rail === 'railE').map((t) => ({ ...t, rect: t.rect.slice() }));
    if (mutate && E[0]) E[0].rect[1] += 5;
    let railRed = false;
    for (let i = 0; i < Math.min(W.length, E.length); i++) {
      B.railPairs++;
      const a = W[i].rect, b = E[i].rect, dt = Math.abs(a[1] - b[1]), db = Math.abs(a[1] + a[3] - b[1] - b[3]), dh = Math.abs(a[3] - b[3]);
      if (Math.max(dt, db, dh) > 2) { railRed = true; if (ex.length < 5) ex.push(`${k}@${v} pair${i + 1} dt${dt.toFixed(1)} db${db.toFixed(1)} dh${dh.toFixed(1)}`); }
    }
    if (railRed) B.railRed++;
    if (railRed || other.length) B.red++;
  }
  return { byVp, ex };
}
const out = {};
for (const [n, f] of [['base', bf], ['head', hf]]) out[n] = recalc(JSON.parse(fs.readFileSync(f, 'utf8')), MUT && n === 'head');
console.log(JSON.stringify({ mutate: MUT, base: out.base.byVp, head: out.head.byVp, headRedExamples: out.head.ex, baseRedExamples: out.base.ex }, null, 1));
