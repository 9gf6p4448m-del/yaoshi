// 回修三枚剪影的「指名配對」相似度報表（2026-09-12 批 1 前置回修小卷）。
//   node docs/experiments/2026-09-12-emblem-fix-evidence/pairs.mjs <repo 根目錄>
//
// 為什麼要這一支：驗收 5 要求「新 knife 對 blade、新 seal 對 tornflag／chair、
// 新 hat 對 wave／banner5／boat 的相似度改前改後並排，且改後每一對都低於改前」。
// 它**不另算一份相似度**——直接呼叫 tests/tools/emblem-sim.mjs 的 allPairs()（同一份度量、
// 同一份頂點表），只負責把指名的六對挑出來印，避免人工從 435 對裡挑錯行。
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const simUrl = 'file:///' + path.join(root, 'tests/tools/emblem-sim.mjs').replace(/\\/g, '/');
const { allPairs } = await import(simUrl);
const { pairs } = await allPairs(root);
const get = (a, b) => pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a));
const TARGET = [['knife', 'blade'], ['seal', 'tornflag'], ['seal', 'chair'], ['hat', 'wave'], ['hat', 'banner5'], ['hat', 'boat']];

console.log(`【樹】${root}`);
console.log('【六對指名】pair\tIoU\t名次（435 對中，愈後面愈不像）');
for (const [a, b] of TARGET) { const p = get(a, b); console.log(`  ${a}~${b}\t${p.iou.toFixed(4)}\t第 ${pairs.indexOf(p) + 1} 名`); }
for (const k of ['knife', 'seal', 'hat']) {
  const near = pairs.filter((p) => p.a === k || p.b === k).slice(0, 5);
  console.log(`【${k} 最像的 5 個】 ` + near.map((p) => `${p.a === k ? p.b : p.a}=${p.iou.toFixed(4)}`).join(' '));
}
const over = pairs.filter((p) => p.iou >= 0.80);
console.log(`【≥0.80 共 ${over.length} 對】`);
over.forEach((p) => console.log(`  ${p.iou.toFixed(4)} ${p.a.padEnd(9)} ${p.b.padEnd(9)} ${p.sameFac ? '同系' : '跨系'}`));
