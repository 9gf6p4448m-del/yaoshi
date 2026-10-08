/* 擺錢（手推錢）四席時長／路徑實測。真 table-props + table-hands + hand-motion（node 版 three），1/240 秒步進。
   跑法：node tests/tools/throw-seat-timing.mjs [runs=3] [slot=1|all] [--json=<out>]
   slot=all：四席×四槽；另算「推錢階段手掌路徑長 ÷ 錢柱路徑長」（palmPushM／moneyPathM，REACH 放寬驗收用）。
   量：錢柱 x/z（props.stackAt）起步到 t>=1 的時間、路徑長、平均／峰值／起始速度；手 holder 世界位置路徑；手整段可見時長（含收手）。 */
import fs from 'node:fs';
import { THREE, loadProps, loadHands, LAYOUTS } from '../hand-fixture.mjs';
const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands();
const DT = 1 / 240, NAME = ['南', '北', '西', '東'];
const runs = Number(process.argv[2] || 3), slotArg = process.argv[3] || '1';
const jsonOut = process.argv.find((a) => a.startsWith('--json='))?.slice(7);
function one(seat, slot) {
  return (async () => {
    const parent = new THREE.Group();
    const props = createTableProps(parent, { handPaths: true });
    props.setLayout(...LAYOUTS.L);
    props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
    const hands = createTableHands(parent, props); await hands.ready();
    props.bid(seat, slot, 3); hands.bid(seat, slot, 3);
    let palmB = null; hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh) palmB = o.skeleton.bones.find((b) => /Palm/i.test(b.name)); });
    let pl = 0, pPush = 0, pprev = null; const pv = new THREE.Vector3();
    let t = 0, t0 = null, t1 = null, len = 0, prev = null, vmax = 0, vFirst = null, vis0 = null, vis1 = null, hl = 0, hprev = null, hPushLen = 0, first = null, last = null;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < 2400; i++) {
      props.update(DT); hands.update(DT); t += DT;
      const st = props.stackAt(seat, slot);
      const p = st ? [st.x, st.z] : null;
      if (st && t0 === null && st.t > 0) { t0 = t - DT; prev = p; first = p; }
      if (t0 !== null && t1 === null && prev) { const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]); len += d; vmax = Math.max(vmax, d / DT); if (vFirst === null && t - t0 > 0.05) vFirst = d / DT; prev = p; last = p; if (st.t >= 1) t1 = t; }
      const h = hands.group.children[seat];
      if (palmB && hands.stats().visible.includes(seat)) { h.updateMatrixWorld(true); palmB.getWorldPosition(pv); const q = [pv.x, pv.z]; if (pprev) { const d = Math.hypot(q[0] - pprev[0], q[1] - pprev[1]); pl += d; if (t1 === null) pPush += d; } pprev = q; }
      const vis = hands.stats().visible.includes(seat);
      if (vis) { if (vis0 === null) vis0 = t; vis1 = t; h.getWorldPosition(v3); const q = [v3.x, v3.z]; if (hprev) hl += Math.hypot(q[0] - hprev[0], q[1] - hprev[1]); hprev = q; }
      if (t1 !== null && !vis && vis0 !== null) break;
    }
    const r = { seat: NAME[seat], slot, ratio: +(pPush / len).toFixed(3), moneyMs: +((t1 - t0) * 1000).toFixed(1), moneyPathM: +len.toFixed(4), meanSpeed: +(len / (t1 - t0)).toFixed(4), vMax: +vmax.toFixed(3), handVisibleMs: +((vis1 - vis0) * 1000).toFixed(1), palmPushM: +pPush.toFixed(4), palmTotalM: +pl.toFixed(4), from: first.map((x) => +x.toFixed(3)), to: last.map((x) => +x.toFixed(3)) };
    hands.dispose(); props.dispose(); return r;
  })();
}
if (slotArg === 'all') {
  const rows = []; for (let slot = 0; slot < 4; slot++) for (let seat = 0; seat < 4; seat++) rows.push(await one(seat, slot));
  console.log('seat slot ratio(palmPush/moneyPath) moneyMs moneyPathM');
  for (const r of rows) console.log(r.seat, r.slot, r.ratio.toFixed(3), r.moneyMs, r.moneyPathM);
  console.log('min ratio', Math.min(...rows.map((r) => r.ratio)).toFixed(3));
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
  process.exit(0);
}
const slot = Number(slotArg);
const all = [];
for (let r = 0; r < runs; r++) { const rows = []; for (let s = 0; s < 4; s++) rows.push(await one(s, slot)); all.push(rows); }
console.log('slot=' + slot + ' dt=1/240');
console.table(all[0]);
const sig = (rows) => JSON.stringify(rows);
console.log('runs identical:', all.every((x) => sig(x) === sig(all[0])));
const m = all[0].map((x) => x.moneyMs), p = all[0].map((x) => x.moneyPathM), hv = all[0].map((x) => x.handVisibleMs);
const pct = (a, i) => { const o = a.filter((_, j) => j !== i); const mo = o.reduce((s, v) => s + v, 0) / o.length; return +(((a[i] - mo) / mo) * 100).toFixed(1); };
console.log('西 vs 其他三家平均 (%): money時長', pct(m, 2), ' 路徑長', pct(p, 2), ' 平均速度', pct(all[0].map((x) => x.meanSpeed), 2), ' 手可見時長', pct(hv, 2));
