// 診斷（不是 gate）：node 端 hands.update 每幀耗時，比較 批 3 開／關（同四席角色、同事件序列，perf-b3 的事件）。
import { THREE, loadProps, loadHands, LAYOUTS } from '../../../../tests/hand-fixture.mjs';
const roles = ['xiaonv', 'lvshan', 'luzhu', 'zutou'];
const { createTableProps } = await loadProps();
const H = { on: (await loadHands({ b3: true })).createTableHands, off: (await loadHands({ b3: false })).createTableHands };
async function run(which) {
  const parent = new THREE.Group(); const props = createTableProps(parent, { handPaths: true, onSlam() {} });
  props.setLayout(...LAYOUTS.L); const seats = roles.map((role, id) => ({ id, role })); props.setSeats(seats);
  const hands = H[which](parent, props); hands.setSeats(seats); await hands.ready(); parent.updateMatrixWorld(true);
  const ts = [], DT = 1 / 60; const st = (n) => { for (let i = 0; i < n; i++) { props.update(DT); const t0 = performance.now(); hands.update(DT); const t = performance.now() - t0; if (hands.stats().visible.length) ts.push(t); parent.updateMatrixWorld(true); } };
  for (let k = 0; k < 4; k++) { for (let s = 0; s < 4; s++) { props.bid(s, (s + k) % 4, 3 + s); hands.bid(s, (s + k) % 4, 3 + s); } st(60); for (let s = 0; s < 4; s++) { props.mark(s, (s + k) % 4); hands.mark(s, (s + k) % 4); } st(70); props.reveal(k, k); hands.reveal(k, k); st(150); }
  ts.sort((a, b) => a - b); return { n: ts.length, mean: +(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(3), p50: +ts[ts.length >> 1].toFixed(3), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(3) };
}
for (let r = 0; r < 3; r++) for (const w of ['off', 'on']) console.log(w, JSON.stringify(await run(w)));
