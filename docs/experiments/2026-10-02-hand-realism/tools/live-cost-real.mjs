/* 條件 6 補充診斷（不是 gate、不是驗收量法）：動作中（不凍結）每幀 hands.update() 的 CPU 耗時——走真的 table-hands
   （v0.59.7 每席用自己的碰撞取樣骨架），四席三角色＋青面同時推／拍，各 60 幀×4 格×3 輪。量測位置＝本機 node，不代表 iPhone。
   跑法：node docs/experiments/2026-10-02-hand-realism/tools/live-cost-real.mjs <樹根>（用該樹自己的 tests/hand-fixture.mjs 與 js/） */
import { pathToFileURL } from 'node:url';
const root = process.argv[2] || process.cwd();
const F = await import(pathToFileURL(root + '/tests/hand-fixture.mjs').href);
const { THREE } = F; const DT = 1 / 60;
const { createTableHands } = await F.loadHands(); const { createTableProps } = await F.loadProps();
const parent = new THREE.Group(); const props = createTableProps(parent, { handPaths: true }); props.setLayout(...F.LAYOUTS.L);
const roles = ['shoujing', 'dangpu', 'hunter', 'qingmian'].map((role, id) => ({ id, role }));
props.setSeats(roles); const hands = createTableHands(parent, props); hands.setSeats(roles); await hands.ready();
const times = [];
for (let round = 0; round < 3; round++) for (let k = 0; k < 4; k++) {
  props.clearRound(); hands.clear();
  for (let s = 0; s < 4; s++) { props.bid(s, (k + s) % 4, 6); hands.bid(s, (k + s) % 4, 6); }
  for (let i = 0; i < 60; i++) { props.update(DT); const t0 = performance.now(); hands.update(DT); times.push(performance.now() - t0); }
  for (let s = 0; s < 4; s++) { props.mark(s, (k + s) % 4); hands.mark(s, (k + s) % 4); }
  for (let i = 0; i < 60; i++) { props.update(DT); const t0 = performance.now(); hands.update(DT); times.push(performance.now() - t0); }
}
times.sort((a, b) => a - b);
const mean = times.reduce((a, b) => a + b, 0) / times.length;
console.log(JSON.stringify({ root, frames: times.length, meanMs: +mean.toFixed(3), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(3), maxMs: +times[times.length - 1].toFixed(3) }));
