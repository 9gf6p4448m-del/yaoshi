// 條件 7：擺盪活性／收斂／不穿桌（fixed dt=1/60，node 真實鏈路：真 GLB、真 table-props／table-hands／hand-b3、three 蒙皮）。
// 量法獨立於產品的 state()：尖端＝該垂掛物尖端標記頂點，含擺盪＝mesh.getVertexPosition（吃目前 position）；
// 剛性＝同一頂點的「建構後靜止位置」（ready 後、第一次 update 前抓的副本）經 applyBoneTransform——也就是不擺盪、純跟骨的位置。
// 情境：S3 全套（推→拍令牌→揭盅收），只量 a、c。S1 南、北席推錢 FREEZE 步後凍結手且不再更新錢柱（手停、擺盪照跑）再跑 150 步；S2 推錢→自然收手全程（只量 a、c）。
// node c7-swing.mjs [--roles=xiaonv,luzhu,lvshan,zutou] [--freeze=24] [--out=<json>]
import fs from 'node:fs';
import { THREE, loadProps, loadHands, LAYOUTS } from '../../../../tests/hand-fixture.mjs';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROLES = String(opt.roles || 'xiaonv,luzhu,lvshan,zutou').split(','), FREEZE = Number(opt.freeze || 24), DT = 1 / 60;
const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands({ b3: !opt.nob3 });
async function rig(layout) {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true, onSlam() {} });
  props.setLayout(...LAYOUTS[layout]); const seats = ROLES.map((role, id) => ({ id, role }));
  props.setSeats(seats); const hands = createTableHands(parent, props); hands.setSeats(seats);
  await hands.ready(); parent.updateMatrixWorld(true);
  return { parent, props, hands };
}
function trackers(r) {
  const out = [];
  r.hands.group.children.forEach((holder, seat) => holder.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    for (const p of o.geometry.userData.b1parts || []) if (p.tipVert !== undefined) {
      const P = o.geometry.attributes.position;
      out.push({ seat, name: p.name, mesh: o, holder, tip: p.tipVert, knotRest: new THREE.Vector3(...p.knot), tipRest: new THREE.Vector3(P.getX(p.tipVert), P.getY(p.tipVert), P.getZ(p.tipVert)), knotLocal: p.knot, rows: [] });
    }
  }));
  return out;
}
function sample(r, T, phase, frame) {
  const floor = r.parent.localToWorld(new THREE.Vector3(0, r.props.tableY(), 0)).y;
  for (const t of T) {
    if (!t.holder.visible) { t.rows.push({ frame, phase, vis: false }); continue; }
    const m = t.mesh; m.skeleton.update();
    const sw = new THREE.Vector3(); m.getVertexPosition(t.tip, sw); sw.applyMatrix4(m.matrixWorld);
    const rg = t.tipRest.clone(); m.applyBoneTransform(t.tip, rg); rg.applyMatrix4(m.matrixWorld);
    const kn = t.knotRest.clone(); m.applyBoneTransform(t.tip, kn); kn.applyMatrix4(m.matrixWorld); // 結點跟同一根骨（垂掛物整段綁同一骨）
    t.rows.push({ frame, phase, vis: true, off: sw.distanceTo(rg), len: kn.distanceTo(rg), tipY: sw.y, floor });
    if (opt.trace && t.seat === Number(opt.tseat || 0)) (globalThis.__tr ||= []).push([phase, frame, +(sw.distanceTo(rg) / kn.distanceTo(rg)).toFixed(3), +rg.x.toFixed(4), +rg.y.toFixed(4), +rg.z.toFixed(4)]);
  }
}
const ev = (r, n, d) => { if (n === 'bid') { r.props.bid(...d); r.hands.bid(...d); } };
const step = (r) => { r.props.update(DT); r.hands.update(DT); r.parent.updateMatrixWorld(true); };
const res = {};
for (const layout of ['L', 'P']) {
  /* S1：推錢→凍結 */
  let r = await rig(layout), T = trackers(r);
  ev(r, 'bid', [0, 1, 8]); ev(r, 'bid', [1, 2, 8]);
  for (let f = 0; f < FREEZE; f++) { step(r); sample(r, T, 'move', f); }
  r.hands.setFrozen(true);
  for (let f = 0; f < 150; f++) { r.hands.update(DT); r.parent.updateMatrixWorld(true); sample(r, T, 'stop', FREEZE + f); } // 停：手的時間軸凍結、錢柱也不再更新（手真的不動），擺盪照跑
  for (const t of T) {
    const mv = t.rows.filter((x) => x.vis && x.phase === 'move'), sp = t.rows.filter((x) => x.vis && x.phase === 'stop');
    const peak = Math.max(...mv.map((x) => x.off), ...sp.slice(0, 1).map((x) => x.off)), len = mv.length ? mv[mv.length - 1].len : NaN;
    const after = sp.slice(90); // 停後 1.5 秒（90 步）起
    const mean = after.reduce((a, x) => a + x.off, 0) / after.length, sd = Math.sqrt(after.reduce((a, x) => a + (x.off - mean) ** 2, 0) / after.length);
    const settle = sp.findIndex((x, i) => sp.slice(i).every((y) => y.off < 0.1 * peak));
    const minClear = Math.min(...t.rows.filter((x) => x.vis).map((x) => (x.tipY - x.floor) / x.len));
    res[`${layout}/S1/s${t.seat}/${t.name}`] = { len: +len.toFixed(5), peak: +peak.toFixed(5), peakOverLen: +(peak / len).toFixed(4), a_pass: peak > 0 && peak >= 0.05 * len,
      maxAfter15s: +Math.max(...after.map((x) => x.off)).toFixed(6), after15OverPeak: +(Math.max(...after.map((x) => x.off)) / peak).toFixed(5), settleFrames: settle, staticSdOverPeak: +(sd / peak).toFixed(6),
      b_pass: Math.max(...after.map((x) => x.off)) < 0.1 * peak && sd < 0.02 * peak, minTipClearOverLen: +minClear.toFixed(4), c_pass: minClear >= -0.05, visMove: mv.length, visStop: sp.length };
  }
  r.hands.dispose(); r.props.dispose();
  /* S2：推錢→自然收手（全程） */
  r = await rig(layout); T = trackers(r);
  ev(r, 'bid', [0, 1, 8]); ev(r, 'bid', [1, 2, 8]);
  for (let f = 0; f < 240; f++) { step(r); sample(r, T, 'move', f); }
  for (const t of T) {
    const v = t.rows.filter((x) => x.vis); if (!v.length) { res[`${layout}/S2/s${t.seat}/${t.name}`] = { vis: 0 }; continue; }
    const peak = Math.max(...v.map((x) => x.off)), len = v[0].len, minClear = Math.min(...v.map((x) => (x.tipY - x.floor) / x.len));
    res[`${layout}/S2/s${t.seat}/${t.name}`] = { vis: v.length, peakOverLen: +(peak / len).toFixed(4), a_pass: peak >= 0.05 * len, minTipClearOverLen: +minClear.toFixed(4), c_pass: minClear >= -0.05 };
  }
  r.hands.dispose(); r.props.dispose();
  /* S3：全套動作（推→拍令牌→揭盅後敗方扒錢／勝方停一拍收手），只量 a、c（拍、扒的手最低） */
  r = await rig(layout); T = trackers(r);
  ev(r, 'bid', [0, 1, 8]); ev(r, 'bid', [1, 1, 5]);
  for (let f = 0; f < 240; f++) { step(r); sample(r, T, 'bid', f); }
  r.props.mark(0, 2); r.hands.mark(0, 2); r.props.mark(1, 3); r.hands.mark(1, 3);
  for (let f = 0; f < 240; f++) { step(r); sample(r, T, 'mark', 240 + f); }
  r.props.reveal(1, 1); r.hands.reveal(1, 1);
  for (let f = 0; f < 300; f++) { step(r); sample(r, T, 'reveal', 480 + f); }
  for (const t of T) {
    const v = t.rows.filter((x) => x.vis); if (!v.length) { res[`${layout}/S3/s${t.seat}/${t.name}`] = { vis: 0 }; continue; }
    const by = (ph) => { const w = v.filter((x) => x.phase === ph); return w.length ? { vis: w.length, peakOverLen: +(Math.max(...w.map((x) => x.off)) / w[0].len).toFixed(4), minTipClearOverLen: +Math.min(...w.map((x) => (x.tipY - x.floor) / x.len)).toFixed(4) } : null; };
    const minClear = Math.min(...v.map((x) => (x.tipY - x.floor) / x.len));
    res[`${layout}/S3/s${t.seat}/${t.name}`] = { vis: v.length, bid: by('bid'), mark: by('mark'), reveal: by('reveal'), minTipClearOverLen: +minClear.toFixed(4), c_pass: minClear >= -0.05 };
  }
  r.hands.dispose(); r.props.dispose();
}
if (opt.trace) res.__trace = globalThis.__tr; const s = JSON.stringify(res, null, 1); if (opt.out) fs.writeFileSync(opt.out, s); console.log(s);
