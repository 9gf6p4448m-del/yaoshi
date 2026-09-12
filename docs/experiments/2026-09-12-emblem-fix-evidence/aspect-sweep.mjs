// 縱橫比掃描：把某個 kind 的頂點在 y 方向乘上係數 s，看它最像的三個 kind 掉到多少。
//   node docs/experiments/2026-09-12-emblem-fix-evidence/aspect-sweep.mjs <repo 根> <kind> [s 起,s 迄,步進]
//
// 為什麼要這一支：emblem-sim 的度量是**面積歸一後的灰階 IoU**，面積歸一保留長寬比，
// 所以「兩個實心塊像不像」幾乎完全由長寬比決定。回修虎爺印時實測到：
//   近正方形（1.9×1.64）→ 最像 crag 0.8333；壓扁（1.9×1.14）→ crag 掉到 0.68，但撞上 crown 0.90。
// 這支只在**記憶體裡**縮 y，原檔唯讀，用來找「離所有鄰居都遠」的那一段長寬比，不是拿來挑好看的數字。
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const kind = process.argv[3];
const [s0, s1, ds] = (process.argv[4] || '0.5,1.6,0.05').split(',').map(Number);
const simUrl = 'file:///' + path.join(root, 'tests/tools/emblem-sim.mjs').replace(/\\/g, '/');
const { loadEmblems, facOfKinds, computePairs } = await import(simUrl);
const { EMBLEM, KINDS } = await loadEmblems(root);
const FAC = facOfKinds(root);
const scaleY = (spec, s) => {
  const f = (a) => a.map((v, i) => (i % 2 ? +(v * s).toFixed(4) : v));
  return Array.isArray(spec) ? f(spec) : { o: f(spec.o), h: spec.h ? f(spec.h) : undefined };
};
console.log(`${kind} 的 y 縮放掃描（原檔唯讀）`);
for (let s = s0; s <= s1 + 1e-9; s += ds) {
  const E = Object.assign({}, EMBLEM);
  E[kind] = scaleY(EMBLEM[kind], s);
  const pairs = computePairs(E, KINDS, FAC);
  const near = pairs.filter((p) => p.a === kind || p.b === kind).slice(0, 3);
  const NAMED = { knife: ['blade'], seal: ['tornflag', 'chair'], hat: ['wave', 'banner5', 'boat'] }[kind] || [];
  const named = NAMED.map((b) => { const p = pairs.find((q) => (q.a === kind && q.b === b) || (q.b === kind && q.a === b)); return `${b}=${p.iou.toFixed(4)}`; });
  console.log(`  s=${s.toFixed(2)}  最像：` + near.map((p) => `${p.a === kind ? p.b : p.a}=${p.iou.toFixed(4)}`).join('  ') + (named.length ? '   ｜指名：' + named.join('  ') : ''));
}
