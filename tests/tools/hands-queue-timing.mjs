/* 席位之手 第四輪：一席一次推 N 格（2／3／4）的實測時序——「錢最後落定」與「手動作結束」（秒）。
   走真的 table-props＋table-hands＋hand-motion（node 版 three），1/120 秒步進。舊版對照：
   YAOSHI_PROPS_PATH=<舊 table-props.js> YAOSHI_MOTION_PATH=<舊 hand-motion.js> YAOSHI_HANDS_PATH=<舊 table-hands.js> node tests/tools/hands-queue-timing.mjs
   跑法：node tests/tools/hands-queue-timing.mjs [out.json] */
import fs from 'node:fs';
import path from 'node:path';
import { THREE, ROOT, loadProps, loadHands, LAYOUTS } from '../hand-fixture.mjs';

const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands();
const DT = 1 / 120;
const rows = [];
for (const n of [2, 3, 4]) for (const seat of [1, 2, 3]) {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true });
  props.setLayout(...LAYOUTS.L);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props); await hands.ready();
  /* 同一幀依格序出價（＝index.html:7285 開標時 r.entries.forEach(pushBid3d) 的順序） */
  for (let k = 0; k < n; k++) { props.bid(seat, k, 3 + k); hands.bid(seat, k, 3 + k); }
  let t = 0, landed = null, handEnd = null; const startAt = {}, arriveAt = {}; let visFrames = 0;
  for (let i = 0; i < 600; i++) {
    props.update(DT); hands.update(DT); t += DT;
    for (let k = 0; k < n; k++) {
      const st = props.stackAt(seat, k);
      if (st && startAt[k] === undefined && st.t > 0) startAt[k] = +(t - DT).toFixed(4);
      if (st && arriveAt[k] === undefined && st.t >= 1) arriveAt[k] = +t.toFixed(4);
    }
    if (landed === null && Object.keys(arriveAt).length === n) landed = +t.toFixed(4);
    const busy = hands.stats().state[seat] !== null;
    if (hands.group.children[seat].visible) visFrames++;
    if (handEnd === null && landed !== null && !busy) handEnd = +t.toFixed(4);
    if (landed !== null && handEnd !== null) break;
  }
  rows.push({ slots: n, seat, moneyLanded: landed, handEnd, startAt, arriveAt, visibleFrames: visFrames });
  hands.dispose(); props.dispose();
}
const summary = [2, 3, 4].map((n) => { const r = rows.filter((x) => x.slots === n); return { slots: n, moneyLandedMax: Math.max(...r.map((x) => x.moneyLanded)), handEndMax: Math.max(...r.map((x) => x.handEnd)) }; });
const out = { dt: DT, summary, rows };
if (process.argv[2]) fs.writeFileSync(path.resolve(ROOT, process.argv[2]), JSON.stringify(out, null, 1));
console.log(JSON.stringify(summary));
