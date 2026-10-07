// 席位之手 批 3 配件（v0.63.0；凍結驗收 docs/experiments/2026-10-07-hands-b3/acceptance.md 條件 3／4／6／7／11 的 node 端把關）。
// 走真實鏈路：真的 hand_r.glb、真的 table-props／table-hands／hand-motion／hand-realism／hand-b3（hand-fixture，loadHands({ b3: true })）、真的 three 蒙皮。
// 85c38c6a（v0.62.5）沒有 hand-b3.js：同一支測試在那裡會紅在「三角色各拿專屬手」（variants／部件）——行為斷言，不是載入錯誤。
import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE, M, loadProps, loadHands, handRigSource, LAYOUTS } from './hand-fixture.mjs';

const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands({ b3: true });
const DT = 1 / 60;
const B3 = ['xiaonv', 'lvshan', 'luzhu'];
const NEED = {
  xiaonv: ['麻布帶', '側結', '垂尾1', '垂尾2', '紙錢灰'],
  lvshan: ['念珠1', '念珠13', '骨扳指（拇指）', '朱紅符形'],
  luzhu: ['黃編繩1', '黃編繩2', '福袋', '玉戒（無名指）'],
};
async function rig(roles, opts = {}, layout = 'L') {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true, onSlam() {} });
  props.setLayout(...LAYOUTS[layout]);
  const seats = roles.map((role, id) => ({ id, role }));
  props.setSeats(seats);
  const hands = createTableHands(parent, props, opts);
  hands.setSeats(seats);
  await hands.ready();
  parent.updateMatrixWorld(true);
  return { parent, props, hands };
}
const meshOf = (r, seat) => { let m = null; r.hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
const step = (r) => { r.props.update(DT); r.hands.update(DT); r.parent.updateMatrixWorld(true); };

test('批 3：孝女白琴／閭山法師／普渡爐主各拿專屬手（配件全上場）、每手 ≤6,500 面、一份材質、無貼圖無 UV、不縮放', async () => {
  const r = await rig([...B3, 'zutou']);
  const st = r.hands.stats();
  assert.equal(st.b3Error ?? null, null, '批 3 模組載得到');
  assert.deepEqual(st.variants.slice(0, 3), B3, '三席各是自己的批 3 手');
  B3.forEach((role, seat) => {
    const g = meshOf(r, seat).geometry, names = (g.userData.b1parts || []).map((p) => p.name);
    for (const n of NEED[role]) assert.ok(names.includes(n), `${role} 有「${n}」（實得 ${names.join('、')}）`);
    for (const p of g.userData.b1parts) assert.ok(p.to > p.from, `${role}「${p.name}」有頂點`);
    assert.equal(g.userData.real.key, role);
    assert.ok(!g.attributes.uv, `${role} 無 UV`);
  });
  assert.ok(st.trisByHand.every((t) => t <= 6500), `每手 ≤6,500 面（${st.trisByHand}）`);
  assert.equal(st.materials, 1, '四隻手一份材質');
  const mat = meshOf(r, 0).material; for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap']) assert.ok(!mat[k], `材質無貼圖（${k}）`);
  assert.deepEqual(st.seatMul, [1, 1, 1, 1], '不縮放手');
  /* 三種手互不相同（各自的幾何） */
  assert.equal(new Set(B3.map((_, s) => meshOf(r, s).geometry)).size, 3);
  r.hands.dispose(); r.props.dispose();
});

test('批 3：孝女垂尾（結點→尾端）長 0.35–0.55 × 手掌長（Wrist→MiddleA）', async () => {
  const r = await rig(['xiaonv', 'lvshan', 'luzhu', 'zutou']);
  const { src } = await handRigSource(); const rg = M.buildRig(src);
  const bw = (n) => { let i = rg.idx[n], p = [0, 0, 0]; while (i >= 0) { p = p.map((x, k) => x + rg.rest[i][k]); i = rg.parents[i]; } return p; };
  const palm = Math.hypot(...bw('Wrist').map((x, k) => x - bw('MiddleA')[k]));
  const g = meshOf(r, 0).geometry, P = g.attributes.position;
  const tails = (g.userData.b1parts || []).filter((p) => /^垂尾/.test(p.name));
  assert.equal(tails.length, 2, '孝女有兩條垂尾');
  for (const t of tails) {
    const L = Math.hypot(P.getX(t.tipVert) - t.knot[0], P.getY(t.tipVert) - t.knot[1], P.getZ(t.tipVert) - t.knot[2]) / palm;
    assert.ok(L >= 0.35 && L <= 0.55, `${t.name} 長 ${L.toFixed(3)}×手掌長`);
  }
  r.hands.dispose(); r.props.dispose();
});

test('批 3 擺盪：推錢時垂尾／福袋真的晃（≥5% 長）、手停後 1.5 秒收斂（<10% 峰值）；每幀不重建幾何、不耗 Math.random', async () => {
  const orig = Math.random; let calls = 0; Math.random = () => { calls++; return orig(); };
  try {
    const r = await rig(['xiaonv', 'luzhu', 'lvshan', 'zutou']);
    assert.deepEqual(r.hands.stats().variants.slice(0, 2), ['xiaonv', 'luzhu'], '孝女、爐主是批 3 的手（有垂掛物）');
    calls = 0;
    const geos = [0, 1].map((s) => meshOf(r, s).geometry), arrs = geos.map((g) => g.attributes.position.array);
    const rest = arrs.map((a) => a.slice());
    const len = (s) => { const g = geos[s]; return g.userData.b3swing.map((w) => w.len * r.hands.group.children[s].getWorldScale(new THREE.Vector3()).x); };
    r.props.bid(0, 1, 8); r.hands.bid(0, 1, 8); r.props.bid(1, 2, 8); r.hands.bid(1, 2, 8);
    const peak = [[0, 0], [0]];
    for (let f = 0; f < 60; f++) {
      step(r);
      const sw = r.hands.b3Swing();
      [0, 1].forEach((s) => { if (sw[s]) sw[s].forEach((x, k) => { peak[s][k] = Math.max(peak[s][k], x.offset); }); });
    }
    [0, 1].forEach((s) => len(s).forEach((L, k) => assert.ok(peak[s][k] >= 0.05 * L, `席 ${s} 垂掛物 ${k} 擺盪峰值 ${peak[s][k].toFixed(4)} ≥ 5%×${L.toFixed(4)}`)));
    /* 擺盪真的寫進畫面幾何（不是只有內部狀態在動）：垂掛物頂點離開了靜止位置 */
    assert.ok(arrs.some((a, i) => a.some((x, k) => x !== rest[i][k])), 'position 有被擺盪改寫');
    r.hands.setFrozen(true);
    let after = [0, 0, 0];
    for (let f = 0; f < 150; f++) { r.hands.update(DT); r.parent.updateMatrixWorld(true); if (f >= 90) { const sw = r.hands.b3Swing(); [0, 1].forEach((s) => sw[s].forEach((x, k) => { after[s * 2 + k] = Math.max(after[s * 2 + k], x.offset); })); } }
    [0, 1].forEach((s) => peak[s].forEach((p, k) => assert.ok(after[s * 2 + k] < 0.1 * p, `席 ${s} 垂掛物 ${k} 停後 1.5 秒偏移 ${after[s * 2 + k]} < 10%×${p}`)));
    /* 每幀不重建：幾何與 position 陣列是同一份物件 */
    [0, 1].forEach((s) => { assert.equal(meshOf(r, s).geometry, geos[s]); assert.equal(meshOf(r, s).geometry.attributes.position.array, arrs[s]); });
    assert.equal(calls, 0, '整段事件 Math.random 0 次');
    r.hands.dispose(); r.props.dispose();
  } finally { Math.random = orig; }
});

test('批 3 開關：opts.b3=false（同 ?handb3=0）＝三角色退回 v0.62.5 的預設手、不載入批 3', async () => {
  const on = await rig([...B3, 'zutou']);
  assert.deepEqual(on.hands.stats().variants.slice(0, 3), B3, '預設（開）＝批 3 的手');
  on.hands.dispose(); on.props.dispose();
  const r = await rig([...B3, 'zutou'], { b3: false });
  const st = r.hands.stats();
  assert.equal(st.b3, false);
  B3.forEach((_, s) => assert.equal(st.realInfo[s].key, 'default', `席 ${s} 退回預設手`));
  assert.deepEqual(r.hands.b3Swing(), [null, null, null, null]);
  r.hands.dispose(); r.props.dispose();
});
