/* 條件 3b 補查：某席某格（單格或格對）手尖到終點的水平最近距離 vs 時間（以該格飛行時長歸一）。
   node t3-curve.mjs --root=<樹> --seat=3 --slots=2[,3] --watch=2 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)=(.*)$/); if (m) opt[m[1]] = m[2]; }
const root = path.resolve(opt.root);
const F = await import(pathToFileURL(root + '/tests/hand-fixture.mjs').href);
const { THREE, LAYOUTS, M } = F;
const { createTableProps } = await F.loadProps(); const { createTableHands } = await F.loadHands();
const DT = 1 / 120, seat = +opt.seat, slots = opt.slots.split(',').map(Number), watch = +opt.watch;
const parent = new THREE.Group(); const props = createTableProps(parent, { handPaths: true }); props.setLayout(...LAYOUTS.L);
props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
if (opt.norelic) props.relicObstacles = () => []; // 診斷：關掉信物避讓
const hands = createTableHands(parent, props); await hands.ready();
for (const k of slots) { props.bid(seat, k, 6); hands.bid(seat, k, 6); }
const v = new THREE.Vector3(); let t = 0, tStart = null, rows = [], landT = null, minAll = Infinity;
for (let i = 0; i < 600; i++) {
  props.update(DT); hands.update(DT); t += DT;
  const st = props.stackAt(seat, watch); if (!st) break;
  const hs = hands.stats().state[seat];
  if (tStart === null && st.t > 0) tStart = t - DT;
  const h = hands.group.children[seat]; let d = Infinity;
  if (h && h.visible && hs && hs.kind === 'push' && hs.slot === watch) {
    let mesh; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); parent.updateMatrixWorld(true); mesh.skeleton.update();
    const P = mesh.geometry.attributes.position;
    for (let j = 0; j < P.count; j += 3) { mesh.getVertexPosition(j, v); v.applyMatrix4(mesh.matrixWorld); d = Math.min(d, Math.hypot(v.x - st.tx, v.z - st.tz)); }
  }
  if (landT === null && st.t >= 1) landT = t;
  if (d < Infinity) { minAll = Math.min(minAll, d); rows.push({ phase: tStart === null ? null : +((t - tStart) / st.fly).toFixed(3), tAbs: +t.toFixed(3), dist: +d.toFixed(4), thr: +(st.r + M.HAND.PUSH_GAP + 0.02).toFixed(4), stackT: +st.t.toFixed(3) }); }
  if (landT !== null && t > landT + 0.4) break;
}
const every = Math.max(1, Math.floor(rows.length / 14));
console.log(JSON.stringify({ root, seat, slots, watch, fly: props.stackAt(seat, watch)?.fly, landAbs: +landT?.toFixed(3), minDistEver: +minAll.toFixed(4), thr: rows[0]?.thr, samples: rows.filter((_, i) => i % every === 0 || i === rows.length - 1) }));
