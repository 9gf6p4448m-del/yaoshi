// 席位之手 CPU 診斷（不是 gate）：動作進行中（不凍結）每幀 director.frames() 的耗時；四席同時推／拍／收，各 60 幀×4 格×3 輪。
// 跑法：node tests/tools/hands-live-cost.mjs；對照舊版：YAOSHI_MOTION_PATH=<舊 hand-motion.js> node tests/tools/hands-live-cost.mjs
import { THREE, M, loadProps, handRigSource, LAYOUTS } from '../hand-fixture.mjs';
const { createTableProps } = await loadProps();
const { src } = await handRigSource();
const rig = M.buildRig(src);
const props = createTableProps(new THREE.Group(), { handPaths: true });
props.setLayout(...LAYOUTS.L);
props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
const d = M.createHandDirector(props, rig);
const times = [];
const run = (n) => { for (let i = 0; i < n; i++) { props.update(1 / 60); d.update(1 / 60); const c0 = globalThis.__cnt||0, u0=globalThis.__curl||0, s0=globalThis.__scan||0; const t0 = performance.now(); d.frames(); const dtm = performance.now() - t0; times.push(dtm); } };
for (let rep = 0; rep < 3; rep++) for (let slot = 0; slot < 4; slot++) {
  props.clearRound(); d.clear();
  for (let s = 0; s < 4; s++) { props.bid(s, (slot + s) % 4, 6); d.bid(s, (slot + s) % 4, 6); } run(60);
  for (let s = 0; s < 4; s++) { props.mark(s, (slot + s) % 4); d.mark(s, (slot + s) % 4); } run(60);
  props.reveal(slot, (slot + 1) % 4); d.reveal(slot, (slot + 1) % 4); run(60);
}
const s = times.slice().sort((a, b) => a - b);
console.log(JSON.stringify({ frames: times.length, meanMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(3), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(3), maxMs: +s[s.length - 1].toFixed(3) }));
