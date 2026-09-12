// 魔神仔紅帽剪影的參數搜尋（2026-09-12 批 1 前置回修小卷）。
//   node docs/experiments/2026-09-12-emblem-fix-evidence/hat-search.mjs <repo 根>
//
// 硬約束同 seal-search：(a) hat~wave／banner5／boat 都要低於改前（0.4247／0.4864／0.5539）；
// (b) 不得出現新的 ≥0.80 配對；(c) 形狀語意＝「高錐帽頂＋往下垂的帽簷」，帽簷兩端必須比中央低
//     （兩端翹起就是 boat／wave 的語彙，六位讀者就是這樣讀錯的）。
// 參數：cw＝帽冠下緣半寬、bw＝帽簷外緣半寬、by＝帽簷與帽冠交界高、bt＝帽簷尖端下垂到的高度。
// 原檔唯讀，只在記憶體裡組頂點。
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const simUrl = 'file:///' + path.join(root, 'tests/tools/emblem-sim.mjs').replace(/\\/g, '/');
const { loadEmblems, facOfKinds, computePairs } = await import(simUrl);
const { EMBLEM, KINDS } = await loadEmblems(root);
const FAC = facOfKinds(root);

/** 高錐帽：尖頂 → 帽箍一階 → 帽冠下緣 → 往下垂的帽簷（外緣比中央低） */
function hat({ cw, bw, by, bt }) {
  const half = [[0, 1], [cw * 0.33, 0.46], [cw * 0.55, -0.02], [cw * 0.67, -0.2], [cw * 0.92, -0.22], [cw, by],
    [bw * 0.88, by - 0.14], [bw, bt + 0.12], [bw * 0.95, bt], [bw * 0.63, bt + 0.08], [bw * 0.28, bt + 0.24], [0, bt + 0.28]];
  const out = [];
  half.forEach(([x, y]) => out.push(+x.toFixed(3), +y.toFixed(3)));
  for (let i = half.length - 2; i >= 1; i--) out.push(+(-half[i][0]).toFixed(3), +half[i][1].toFixed(3));
  return out;
}

const BEFORE = { wave: 0.4247, banner5: 0.4864, boat: 0.5539 };
const rows = [];
for (const cw of [0.34, 0.38, 0.42, 0.46, 0.50]) {
  for (const bw of [0.68, 0.74, 0.80, 0.86]) {
    for (const by of [-0.38, -0.44, -0.50]) {
      for (const bt of [-0.74, -0.82]) {
        if (bw <= cw + 0.16) continue; // 帽簷要真的外伸
        const E = Object.assign({}, EMBLEM); E.hat = hat({ cw, bw, by, bt });
        const pairs = computePairs(E, KINDS, FAC);
        const mine = pairs.filter((p) => p.a === 'hat' || p.b === 'hat');
        const nm = (b) => mine.find((p) => p.a === b || p.b === b).iou;
        const top = mine[0];
        rows.push({ cw, bw, by, bt, max: top.iou, maxWith: top.a === 'hat' ? top.b : top.a, wave: nm('wave'), banner5: nm('banner5'), boat: nm('boat'), verts: hat({ cw, bw, by, bt }).length / 2 });
      }
    }
  }
}
const ok = rows.filter((r) => r.wave < BEFORE.wave && r.banner5 < BEFORE.banner5 && r.boat < BEFORE.boat && r.max < 0.80);
ok.sort((a, b) => (a.boat - b.boat));
console.log(`候選 ${rows.length} 組，三個指名對都低於改前且最像的鄰居 <0.80 的有 ${ok.length} 組（依 boat 由小到大）`);
ok.slice(0, 20).forEach((r) => console.log(`  cw=${r.cw} bw=${r.bw} by=${r.by} bt=${r.bt}  頂點 ${r.verts}  max=${r.max.toFixed(4)}(${r.maxWith})  boat=${r.boat.toFixed(4)} wave=${r.wave.toFixed(4)} banner5=${r.banner5.toFixed(4)}`));
