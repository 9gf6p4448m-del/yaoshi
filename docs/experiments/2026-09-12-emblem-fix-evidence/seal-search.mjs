// 虎爺印剪影的參數搜尋（2026-09-12 批 1 前置回修小卷）。
//   node docs/experiments/2026-09-12-emblem-fix-evidence/seal-search.mjs <repo 根>
//
// 為什麼要搜尋而不是手調：回修的**硬約束**有三條，手調很難同時滿足——
//   (a) 驗收 5：seal~tornflag 與 seal~chair 都要低於改前（0.3784／0.3275）；
//   (b) tests/emblem-collision.test.mjs 第 4／5 條：不得出現新的 ≥0.80 配對（同系或跨系都算）；
//   (c) 形狀語意仍要是「印」：下寬上窄的三階（印台 > 印身腰 > 鈕座 > 鈕），鈕不得再做高（原版鈕高佔一半＝被讀成旗）。
// 這支只在**記憶體裡**組頂點，原檔唯讀；印出的是每個候選的「最像的鄰居」與兩個指名對，
// 由人挑一組同時滿足 (a)(b) 且比例仍像印章的參數，不是自動挑最低分。
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const simUrl = 'file:///' + path.join(root, 'tests/tools/emblem-sim.mjs').replace(/\\/g, '/');
const { loadEmblems, facOfKinds, computePairs } = await import(simUrl);
const { EMBLEM, KINDS } = await loadEmblems(root);
const FAC = facOfKinds(root);

/** 三階印章：印台（下，最寬）→ 印身腰（中，內縮）→ 鈕座（上，外伸的一階）→ 鈕（最上，最窄） */
function seal({ bw, y0, y1, ww, y2, pw, y3, kw, y4 }) {
  return { o: [-bw, y0, bw, y0, bw, y1, ww, y1, ww, y2, pw, y2, pw, y3, kw, y3, kw, y4, -kw, y4, -kw, y3, -pw, y3, -pw, y2, -ww, y2, -ww, y1, -bw, y1] };
}

const BEFORE = { tornflag: 0.3784, chair: 0.3275 };
const rows = [];
for (const y1 of [-0.60, -0.45, -0.30, -0.15]) {
  for (const bw of [0.88, 0.95, 1.0]) {
  for (const ww of [0.40, 0.45, 0.50]) {
    for (const pw of [0.62, 0.72, 0.80]) {
      for (const kw of [0.16, 0.20, 0.26]) {
        for (const y4 of [0.72, 0.80, 0.88]) {
          const spec = seal({ bw, y0: -0.92, y1, ww, y2: 0.20, pw, y3: 0.45, kw, y4 });
          const E = Object.assign({}, EMBLEM); E.seal = spec;
          const pairs = computePairs(E, KINDS, FAC);
          const mine = pairs.filter((p) => p.a === 'seal' || p.b === 'seal');
          const nm = (b) => mine.find((p) => p.a === b || p.b === b).iou;
          const top = mine[0];
          rows.push({ y1, bw, ww, pw, kw, y4, max: top.iou, maxWith: top.a === 'seal' ? top.b : top.a, tornflag: nm('tornflag'), chair: nm('chair') });
        }
      }
    }
  }
}
}
rows.sort((a, b) => a.max - b.max);
const okRows = rows.filter((r) => r.tornflag < BEFORE.tornflag && r.chair < BEFORE.chair && r.max < 0.80);
console.log(`候選 ${rows.length} 組，同時滿足「兩個指名對都低於改前」＋「最像的鄰居 <0.80」的有 ${okRows.length} 組（依 max 由小到大列前 15）`);
okRows.slice(0, 30).forEach((r) => console.log(`  y1=${r.y1} bw=${r.bw} ww=${r.ww} pw=${r.pw} kw=${r.kw} y4=${r.y4}  max=${r.max.toFixed(4)}(${r.maxWith})  tornflag=${r.tornflag.toFixed(4)}  chair=${r.chair.toFixed(4)}`));
