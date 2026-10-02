// 席位之手 階段三：角色變體（收驚婆／當鋪／獵人）。凍結驗收：docs/experiments/2026-10-01-hands-stage3/acceptance-roles.md（V1–V7）。
// 走真實鏈路：真的 hand_r.glb、真的 table-props／table-hands／hand-motion（hand-fixture）、真的 three 蒙皮；不 mock 變體產生器。
// 突變驗紅：tests/tools/hands-mutants.mjs（對本檔跑）。
import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE, M, loadProps, loadHands, handRigSource as handRigSourceFx, LAYOUTS } from './hand-fixture.mjs';

const { createTableProps, PROPS } = await loadProps();
const { createTableHands } = await loadHands();
const DT = 1 / 60;
/** 固定種子的 Math.random（props 的籌碼抖動用它；讓「有變體 vs 無變體」的兩次跑逐幀可比）。 */
function withSeed(fn, seed = 123456789) {
  const orig = Math.random; let x = seed, calls = 0;
  Math.random = () => { calls++; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const done = (v) => { Math.random = orig; return v; };
  return Promise.resolve().then(fn).then((v) => done({ v, calls }), (e) => { done(); throw e; });
}
const ROLES3 = ['shoujing', 'dangpu', 'hunter'];
const OTHER7 = ['zutou', 'qingmian', 'hongyi', 'duanshou', 'xiaonv', 'lvshan', 'luzhu'];
const seatsOf = (roles) => roles.map((role, id) => ({ id, role }));
const DEFAULT4 = ['qingmian', 'hongyi', 'xiaonv', 'zutou'];

async function rig(layout = 'L', roles = DEFAULT4, handRoles = roles) {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true, onSlam() {} });
  props.setLayout(...LAYOUTS[layout]);
  props.setSeats(seatsOf(roles));
  const hands = createTableHands(parent, props);
  hands.setSeats(seatsOf(handRoles)); // GLB 還沒好就呼叫：要被保留、載完補上（renderer.js 的實際時序）
  await hands.ready();
  parent.updateMatrixWorld(true);
  return { parent, props, hands };
}
const ev = {
  bid: (r, s, k, a) => { r.props.bid(s, k, a); r.hands.bid(s, k, a); },
  mark: (r, s, k) => { r.props.mark(s, k); r.hands.mark(s, k); },
  step: (r) => { r.props.update(DT); r.hands.update(DT); r.parent.updateMatrixWorld(true); },
};
const meshOf = (r, seat) => { let m = null; r.hands.group.children[seat].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
const colorOf = (r, seat) => meshOf(r, seat).geometry.attributes.color.array;
let base = null;
async function baseSrc() {
  if (base) return base;
  const { src, mesh } = await handRigSourceFx();
  const g = mesh.geometry.attributes;
  base = {
    rig: M.buildRig(src), n0: g.position.count, ref: M.dressColors(g.position.array, g.color.array, g.color.itemSize),
    arr: { position: g.position.array, normal: g.normal.array, color: g.color.array, colorSize: g.color.itemSize, skinIndex: g.skinIndex.array, skinWeight: g.skinWeight.array, index: mesh.geometry.index.array },
  };
  return base;
}
/** 與預設手顏色不同的「原頂點」數（只比前 n0 個＝GLB 原有頂點）。 */
function recoloredCount(col, ref, n0) {
  let k = 0;
  for (let v = 0; v < n0; v++) if (Math.abs(col[v * 4] - ref[v * 4]) + Math.abs(col[v * 4 + 1] - ref[v * 4 + 1]) + Math.abs(col[v * 4 + 2] - ref[v * 4 + 2]) > 1e-4) k++;
  return k;
}
const hashCol = (col, n) => { let h = 0; for (let i = 0; i < n * 4; i++) h = (h * 31 + Math.round(col[i] * 4096)) | 0; return h; };
const close = (a, b, tol) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < tol;

/* ═══ V1：三個角色的手與預設手不同，且彼此不同（頂點色區域＋配件） ═══════════════════════ */
test('V1 三角色的手：專屬色區域頂點數 >0（預設手＝0）、配件頂點 >0（預設手＝0），三者兩兩不同', async () => {
  const B = await baseSrc();
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const st = r.hands.stats();
  assert.deepEqual(st.variants, ['shoujing', 'dangpu', 'hunter', null]);
  const rc = [0, 1, 2, 3].map((s) => recoloredCount(colorOf(r, s), B.ref, B.n0));
  const extra = [0, 1, 2, 3].map((s) => meshOf(r, s).geometry.attributes.position.count - B.n0);
  assert.ok(rc[0] > 0 && rc[1] > 0 && rc[2] > 0, `專屬色頂點數 ${rc}`);
  assert.equal(rc[3], 0, '預設手專屬色頂點數必須是 0');
  assert.ok(extra[0] > 0 && extra[1] > 0 && extra[2] > 0, `配件頂點 ${extra}`);
  assert.equal(extra[3], 0, '預設手沒有配件頂點');
  const h = [0, 1, 2].map((s) => hashCol(colorOf(r, s), B.n0));
  assert.equal(new Set(h).size, 3, '三者的頂點色兩兩不同');
  assert.equal(new Set(extra.slice(0, 3)).size, 3, '三者的配件兩兩不同（頂點數）');
  r.hands.dispose(); r.props.dispose();
});

test('V1 各角色的特徵色真的在手上：袖口主色、紅線、算盤珠色戒指、護腕與舊疤', async () => {
  const B = await baseSrc();
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const S = M.HAND.SLEEVE, R = M.ROLE_HAND;
  const cuffVerts = [];
  for (let v = 0; v < B.n0; v++) { const z = B.arr.position[v * 3 + 2]; if (z < S.CUFF_FROM && z >= S.CUFF_TO) cuffVerts.push(v); }
  assert.ok(cuffVerts.length > 20);
  ROLES3.forEach((role, seat) => {
    const col = colorOf(r, seat), want = R.ROLES[role].CUFF;
    assert.ok(cuffVerts.every((v) => close([col[v * 4], col[v * 4 + 1], col[v * 4 + 2]], want, 1e-4)), `${role} 袖口一圈＝該角色主色`);
    const n = meshOf(r, seat).geometry.attributes.position.count;
    const has = (c) => { let k = 0; for (let v = B.n0; v < n; v++) if (close([col[v * 4], col[v * 4 + 1], col[v * 4 + 2]], c, 1e-4)) k++; return k; };
    if (role === 'shoujing') assert.ok(has(R.THREAD.COLOR) > 0, '紅線頂點');
    if (role === 'dangpu') assert.ok(has(R.RING.COLOR) > 0 && has(R.RING.BEAD_COLOR) > 0, '戒指環與珠');
    if (role === 'hunter') assert.ok(has(R.BRACER.COLOR) > 0 && has(R.SCAR.COLOR) > 0, '護腕與疤');
  });
  const cuffs = ROLES3.map((k) => R.ROLES[k].CUFF.join()); cuffs.push(S.CUFF.join());
  assert.equal(new Set(cuffs).size, 4, '三角色袖口主色兩兩不同、也不等於預設袖色');
  r.hands.dispose(); r.props.dispose();
});

test('V1 收驚婆：老膚色與手背暗斑是頂點色——手背有一批頂點比同角色老膚色基底更暗', async () => {
  const B = await baseSrc();
  const r = await rig('L', ['shoujing', 'qingmian', 'hongyi', 'xiaonv']);
  const col = colorOf(r, 0), A = M.ROLE_HAND.AGED;
  let spots = 0, back = 0;
  for (let v = 0; v < B.n0; v++) {
    if (B.arr.position[v * 3 + 2] < M.HAND.SLEEVE.CUFF_FROM) continue;
    if (!(B.arr.normal[v * 3 + 1] > 0.3 && B.arr.position[v * 3 + 2] > 0.1)) continue;
    back++;
    const base0 = (B.ref[v * 4] + (A.TINT[0] - B.ref[v * 4]) * A.MIX) * A.DIM;
    if (col[v * 4] < base0 * 0.9) spots++;
  }
  assert.ok(back > 50 && spots > 5 && spots < back * 0.6, `手背頂點 ${back}、暗斑 ${spots}`);
  r.hands.dispose(); r.props.dispose();
});

/* ═══ V2：缺角色／未知角色／空清單＝預設手，不丟例外；其餘 7 角色不受影響 ═════════════════════ */
test('V2 未知／缺角色／空清單／亂格式 → 預設手、不丟例外；其餘 7 角色與斷手書生都拿預設手（同一份幾何物件）', async () => {
  const B = await baseSrc();
  const r = await rig('L', DEFAULT4);
  const dflt = meshOf(r, 0).geometry;
  const bad = [[], undefined, null, 'x', 7, [null], [{}], [{ id: 0 }], [{ id: 0, role: 'nope' }], [{ id: 0, role: 'toString' }], [{ id: 0, role: '__proto__' }], [{ id: 0, role: 42 }], [{ id: 9, role: 'hunter' }], [{ id: -1, role: 'hunter' }], [{ id: 1.5, role: 'hunter' }]];
  for (const list of bad) {
    assert.doesNotThrow(() => r.hands.setSeats(list), JSON.stringify(list));
    const st = r.hands.stats();
    assert.deepEqual(st.variants, [null, null, null, null], JSON.stringify(list));
    assert.equal(st.geometries, 1);
    for (let s = 0; s < 4; s++) assert.equal(meshOf(r, s).geometry, dflt, '預設手共用同一份幾何');
  }
  for (const role of OTHER7) {
    r.hands.setSeats(seatsOf([role, role, role, role]));
    for (let s = 0; s < 4; s++) assert.equal(meshOf(r, s).geometry, dflt, role + ' ＝預設手');
  }
  assert.equal(r.hands.stats().variantBuilds, 0, '沒有任何變體被建出來');
  assert.equal(recoloredCount(colorOf(r, 0), B.ref, B.n0), 0);
  assert.equal(meshOf(r, 0).geometry.index.count / 3, 1362);
  r.hands.setSeats(seatsOf(['hunter', 'qingmian', 'qingmian', 'qingmian']));
  assert.deepEqual(r.hands.stats().variants, ['hunter', null, null, null], '之後給三角色仍然正常');
  r.hands.dispose(); r.props.dispose();
});

/* ═══ V3：面數與 draw call ═══════════════════════════════════════════════════════════════ */
for (const layout of ['L', 'P']) {
  test(`V3 ${layout}：每隻手 ≤2500 面；每席仍是 1 個蒙皮 mesh、四席共用 1 份材質（draw call 增量 ≤4、配件不另開材質）`, async () => {
    const r = await rig(layout, ['shoujing', 'dangpu', 'hunter', 'qingmian']);
    const st = r.hands.stats();
    st.trisByHand.forEach((t, s) => assert.ok(t <= 2500, `席 ${s} ${t} 面`));
    assert.ok(st.trisByHand.slice(0, 3).every((t) => t > 1362), '三個變體都比預設手多出配件面');
    assert.equal(st.materials, 1, '四席共用 1 份材質');
    const materials = new Set(); let meshes = 0;
    for (let s = 0; s < 4; s++) r.hands.group.children[s].traverse((o) => { if (o.isMesh) { meshes++; materials.add(o.material); } });
    assert.equal(meshes, 4, '每席恰 1 個 mesh（配件併在同一個蒙皮 mesh 裡）');
    assert.equal(materials.size, 1);
    r.hands.setFrozen(true);
    for (let s = 0; s < 4; s++) ev.bid(r, s, s, 6);
    for (let i = 0; i < 80; i++) ev.step(r);
    let calls = 0;
    r.hands.group.children.filter((h) => h.visible).forEach((h) => h.traverse((o) => { if (o.isMesh) calls++; }));
    assert.ok(calls >= 1 && calls <= 4, `draw call 增量 ${calls}`);
    r.hands.dispose(); r.props.dispose();
  });
}

/* ═══ V4：只在 setSeats 決定，不每幀重算 ═══════════════════════════════════════════════════ */
test('V4 變體幾何只在 setSeats 建一次（以角色鍵快取），整段動作／每幀 update 都不重建、幾何物件不換', async () => {
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const geos = [0, 1, 2, 3].map((s) => meshOf(r, s).geometry);
  assert.equal(r.hands.stats().variantBuilds, 3);
  for (let s = 0; s < 4; s++) ev.bid(r, s, s, 8);
  for (let i = 0; i < 120; i++) ev.step(r);
  for (let s = 0; s < 4; s++) ev.mark(r, s, (s + 1) % 4);
  for (let i = 0; i < 200; i++) ev.step(r);
  assert.equal(r.hands.stats().variantBuilds, 3, '動作期間沒有重建');
  [0, 1, 2, 3].forEach((s) => assert.equal(meshOf(r, s).geometry, geos[s], '席 ' + s + ' 幾何物件沒換'));
  r.hands.setSeats(seatsOf(['hunter', 'hunter', 'shoujing', 'dangpu']));
  assert.equal(r.hands.stats().variantBuilds, 3, '換席不重建（鍵快取）');
  r.hands.dispose(); r.props.dispose();
});

/* ═══ 純演出：不耗亂數、不改任何動作、原頂點與蒙皮不變 ═══════════════════════════════════════ */
test('純演出：變體建構不耗亂數（props 自己的亂數不算：同 props 下有變體與無變體的 Math.random 呼叫數必須相同，建構函式本身 0 次）；原頂點位置／權重／索引與預設手逐值相同；同輸入兩次建構逐值相同', async () => {
  const B = await baseSrc();
  const scenario = (handRoles) => withSeed(async () => {
    const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian'], handRoles); // props 同一份角色，只有手不同
    for (let s = 0; s < 4; s++) ev.bid(r, s, s, 8);
    for (let i = 0; i < 100; i++) ev.step(r);
    r.hands.dispose(); r.props.dispose();
  });
  const withV = await scenario(['shoujing', 'dangpu', 'hunter', 'qingmian']), without = await scenario(DEFAULT4);
  // 三份變體幾何各 new 一個 BufferGeometry，three 自己會用 Math.random 產 uuid——先量出一份幾何的 uuid 成本，差額必須剛好是 3 份
  const uuid = (await withSeed(() => new THREE.BufferGeometry())).calls;
  assert.ok(uuid > 0);
  assert.equal(withV.calls - without.calls, 3 * uuid, `有變體 ${withV.calls} 次 vs 無變體 ${without.calls} 次（每份幾何的 three uuid 成本 ${uuid}）`);
  const pure = await withSeed(() => { for (const role of ROLES3) M.buildRoleGeometry(B.rig, B.arr, role); });
  assert.equal(pure.calls, 0, 'buildRoleGeometry 呼叫了 Math.random ' + pure.calls + ' 次');
  for (const role of ROLES3) {
    const a = M.buildRoleGeometry(B.rig, B.arr, role), b = M.buildRoleGeometry(B.rig, B.arr, role);
    assert.deepEqual([...a.position], [...b.position]);
    assert.deepEqual([...a.color], [...b.color]);
    assert.deepEqual([...a.position.subarray(0, B.n0 * 3)], [...B.arr.position], role + ' 原頂點位置');
    assert.deepEqual([...a.skinWeight.subarray(0, B.n0 * 4)], [...B.arr.skinWeight], role + ' 原頂點權重');
    assert.deepEqual([...a.index.subarray(0, B.arr.index.length)], [...B.arr.index], role + ' 原索引');
  }
});

test('純演出：同一串事件下，有變體與沒變體的手，整隻手的位置／朝向／各骨旋轉逐幀相同（動作曲線、避讓、排隊都不受變體影響）', async () => {
  const run = async (handRoles) => (await withSeed(async () => {
    const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian'], handRoles); // props 同一份角色，只有手不同
    const trace = [];
    const script = [() => ev.bid(r, 0, 1, 8), () => ev.bid(r, 1, 2, 5), () => ev.bid(r, 2, 0, 9), () => ev.bid(r, 3, 3, 4), () => ev.bid(r, 0, 2, 3), () => ev.mark(r, 1, 1), () => ev.mark(r, 2, 3)];
    for (const f of script) {
      f();
      for (let i = 0; i < 40; i++) {
        ev.step(r);
        trace.push(r.hands.group.children.map((h) => {
          const q = []; h.traverse((o) => { if (o.isBone) q.push(o.quaternion.toArray()); });
          return [h.visible, h.position.toArray(), h.rotation.y, h.rotation.x, h.scale.x, q];
        }));
      }
    }
    r.hands.dispose(); r.props.dispose();
    return trace;
  })).v;
  const a = await run(['shoujing', 'dangpu', 'hunter', 'qingmian']), b = await run(DEFAULT4); // 手：有變體 vs 預設
  assert.ok(a.some((fr) => fr.some((h) => h[0])), '手真的上場過');
  assert.deepEqual(a, b);
});

/* ═══ 配件跟著骨頭走、法線朝外 ═════════════════════════════════════════════════════════════ */
test('配件隨骨：推／拍整段動作每一幀，配件頂點與它最近的原頂點在蒙皮後的距離，不超過綁定距離（＋容差）——戴在哪段骨就跟哪段骨', async () => {
  const B = await baseSrc();
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const near = [];
  for (let s = 0; s < 3; s++) {
    const pos = meshOf(r, s).geometry.attributes.position.array, n = meshOf(r, s).geometry.attributes.position.count, list = [];
    for (let e = B.n0; e < n; e += 3) { // 每 3 顆取 1（效能）
      let best = 0, bd = Infinity;
      for (let v = 0; v < B.n0; v++) { const dx = pos[v * 3] - pos[e * 3], dy = pos[v * 3 + 1] - pos[e * 3 + 1], dz = pos[v * 3 + 2] - pos[e * 3 + 2], d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v; } }
      list.push([e, best, Math.sqrt(bd)]);
    }
    near.push(list);
  }
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  let worst = -Infinity, checked = 0, frames = 0;
  for (let k = 0; k < 6; k++) {
    if (k % 2 === 0) for (let s = 0; s < 4; s++) ev.bid(r, s, (s + k) % 4, 6); else for (let s = 0; s < 4; s++) ev.mark(r, s, (s + k) % 4);
    for (let i = 0; i < 60; i++) {
      ev.step(r);
      for (let s = 0; s < 3; s++) {
        const m = meshOf(r, s); if (!m.parent.visible) continue; m.skeleton.update(); frames++;
        for (const [e, b, d0] of near[s]) { m.getVertexPosition(e, v1); m.getVertexPosition(b, v2); worst = Math.max(worst, v1.distanceTo(v2) - d0); checked++; }
      }
    }
  }
  assert.ok(checked > 3000 && frames > 50, `取樣 ${checked}／${frames}`);
  assert.ok(worst < 0.12, `配件頂點離它的錨點最多拉開 ${worst} dm（綁定距離＋容差）`);
  r.hands.dispose(); r.props.dispose();
});

test('配件幾何：每個配件三角形的面法線與頂點法線同向（繞序朝外）；索引不越界', async () => {
  const B = await baseSrc();
  for (const role of ROLES3) {
    const g = M.buildRoleGeometry(B.rig, B.arr, role), n = g.position.length / 3;
    let bad = 0, tot = 0;
    assert.ok([...g.index].every((i) => i < n), role + ' 索引越界');
    for (let t = B.arr.index.length; t < g.index.length; t += 3) {
      const [a, b, c] = [g.index[t], g.index[t + 1], g.index[t + 2]].map((i) => [g.position[i * 3], g.position[i * 3 + 1], g.position[i * 3 + 2]]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const i0 = g.index[t], nn = [g.normal[i0 * 3], g.normal[i0 * 3 + 1], g.normal[i0 * 3 + 2]];
      tot++; if (f[0] * nn[0] + f[1] * nn[1] + f[2] * nn[2] <= 0) bad++;
    }
    assert.ok(tot > 50, role + ' 配件三角形 ' + tot);
    assert.equal(bad, 0, `${role}：${bad}/${tot} 個配件三角形繞序朝內`);
  }
});

/* ═══ 不穿錢柱與令牌（變體手的每個蒙皮頂點，含配件）══════════════════════════════════════════ */
const tmpM = new THREE.Matrix4(), lv = new THREE.Vector3(), vv = new THREE.Vector3();
function volumes(r) {
  const out = [], chips = r.props.group.getObjectByName('prop-chips'), toks = r.props.group.getObjectByName('prop-tokens');
  if (chips) for (let i = 0; i < chips.count; i++) { chips.getMatrixAt(i, tmpM); out.push({ kind: 'chip', inv: new THREE.Matrix4().copy(tmpM).invert() }); }
  if (toks) for (let i = 0; i < toks.count; i++) { toks.getMatrixAt(i, tmpM); out.push({ kind: 'token', inv: new THREE.Matrix4().copy(tmpM).invert() }); }
  return out;
}
const C = PROPS.CHIP, T = PROPS.TOKEN, EPS = 1e-6;
function inside(p, vol) {
  lv.copy(p).applyMatrix4(vol.inv);
  if (vol.kind === 'chip') return Math.hypot(lv.x, lv.z) < C.R - EPS && Math.abs(lv.y) < C.T / 2 - EPS;
  return Math.abs(lv.x) < T.W - EPS && Math.abs(lv.z) < T.H - EPS && lv.y > -T.T / 2 + EPS && lv.y < T.T / 2 + 0.028 - EPS;
}
for (const layout of ['L', 'P']) for (const seed of [123456789, 987654321, 192837465]) {
  test(`變體手 ${layout} 種子 ${seed}：推（1/8/12 枚）與拍令牌每幀，三變體手的每個蒙皮頂點（含配件）都不在任何錢或令牌體內`, () => withSeed(async () => {
    const r = await rig(layout, ['shoujing', 'dangpu', 'hunter', 'shoujing']);
    const hits = []; let frames = 0, seen = 0;
    const check = () => {
      const vols = volumes(r);
      for (const h of r.hands.group.children) {
        if (!h.visible) continue;
        let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
        mesh.skeleton.update(); const n = mesh.geometry.attributes.position.count;
        for (let i = 0; i < n; i++) {
          mesh.getVertexPosition(i, vv); vv.applyMatrix4(mesh.matrixWorld);
          for (const vol of vols) if (inside(vv, vol)) { hits.push([h.name, i, vol.kind]); break; }
        }
        seen++;
      }
    };
    const script = [];
    for (const amt of [1, 8, 12]) for (let slot = 0; slot < 4; slot++) {
      script.push((q) => { q.props.clearRound(); q.hands.clear(); for (let s = 0; s < 4; s++) ev.bid(q, s, (slot + s) % 4, amt); });
    }
    for (let slot = 0; slot < 4; slot++) script.push((q) => { q.props.clearRound(); q.hands.clear(); for (let s = 0; s < 4; s++) ev.bid(q, s, slot, 4 + s); for (let i = 0; i < 50; i++) ev.step(q); for (let s = 0; s < 4; s++) ev.mark(q, s, slot); });
    for (const f of script) { f(r); for (let i = 0; i < 70 && !hits.length; i++) { ev.step(r); frames++; check(); } if (hits.length) break; }
    assert.deepEqual(hits.slice(0, 5), []);
    assert.ok(seen > 200 && frames > 500, `取樣 ${seen}／${frames}（否則零鑑別力）`);
    assert.deepEqual(hits.slice(0, 5), []);
    r.hands.dispose(); r.props.dispose();
  }, seed));
}

/* ═══ 第二輪（盲讀 #D 未過後重做）：acceptance-roles-r2.md R1a／R1b／R2／R3 ═══════════════════ */
import fs from 'node:fs';
import { blockArea } from './tools/hands-roles-area.mjs';
const R2_BASE = JSON.parse(fs.readFileSync(new URL('../docs/experiments/2026-10-01-hands-stage3/r2/baseline-933f1de1.json', import.meta.url), 'utf8'));
const srgb255 = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255;
const colourHas = (col, n, c) => { for (let v = 0; v < n; v++) if (close([col[v * 4], col[v * 4 + 1], col[v * 4 + 2]], c, 1e-3)) return true; return false; };

test('R1a 腕部色塊面積（節點層、dm²）：收驚婆／當鋪 ≥ 基準×2、獵人 ≥ 基準×1.5；預設手＝0', async () => {
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const need = { shoujing: 2, dangpu: 2, hunter: 1.5 };
  ROLES3.forEach((role, seat) => {
    const a = blockArea(meshOf(r, seat).geometry, M.ROLE_HAND.ROLES[role].BLOCK);
    const base = R2_BASE.blockArea_dm2[role];
    assert.ok(a.area >= base * need[role], `${role} 色塊面積 ${a.area.toFixed(3)} < 基準 ${base.toFixed(3)} ×${need[role]}`);
  });
  assert.equal(blockArea(meshOf(r, 3).geometry, ROLES3.flatMap((k) => M.ROLE_HAND.ROLES[k].BLOCK)).area, 0, '預設手沒有任何角色色塊');
  r.hands.dispose(); r.props.dispose();
});

test('R1b（色彩層）三角色色塊「面積加權平均色」sRGB 兩兩歐氏距離 ≥60（實拍層的距離在 hands-roles-shots --measure 另量）', async () => {
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const mean = ROLES3.map((role, seat) => {
    const g = meshOf(r, seat).geometry, col = g.attributes.color.array, pos = g.attributes.position, idx = g.index.array, blk = M.ROLE_HAND.ROLES[role].BLOCK;
    const isB = (v) => col[v * 4 + 3] > 0.5 && blk.some((c) => close([col[v * 4], col[v * 4 + 1], col[v * 4 + 2]], c, 1e-3));
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); const s = [0, 0, 0]; let W = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const [i, j, k] = [idx[t], idx[t + 1], idx[t + 2]]; if (!(isB(i) && isB(j) && isB(k))) continue;
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, j); c.fromBufferAttribute(pos, k);
      const w = b.sub(a).cross(c.sub(a)).length() / 2; W += w;
      for (let q = 0; q < 3; q++) s[q] += w * (srgb255(col[i * 4 + q]) + srgb255(col[j * 4 + q]) + srgb255(col[k * 4 + q])) / 3;
    }
    assert.ok(W > 0, `${role} 沒有色塊`);
    return s.map((x) => x / W);
  });
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
    const d = Math.hypot(mean[i][0] - mean[j][0], mean[i][1] - mean[j][1], mean[i][2] - mean[j][2]);
    assert.ok(d >= 60, `${ROLES3[i]} vs ${ROLES3[j]} 色塊平均色距離 ${d.toFixed(1)} < 60（${mean[i].map(Math.round)} vs ${mean[j].map(Math.round)}）`);
  }
  r.hands.dispose(); r.props.dispose();
});

test('R2 識別物互斥（各角色實際頂點色）：收驚婆有紅繩＋佛珠無玉；當鋪有玉無紅繩無佛珠；獵人有疤＋黃銅扣無玉無紅繩無佛珠；預設手皆無', async () => {
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'qingmian']);
  const R = M.ROLE_HAND;
  const marks = { red: [R.THREAD.COLOR], bead: [R.BEADS.COLOR], jade: [R.RING.COLOR, R.RING.BEAD_COLOR], scar: [R.SCAR.COLOR], brass: [R.BRACER.BUCKLE] };
  const want = { shoujing: { red: 1, bead: 1, jade: 0, scar: 0, brass: 0 }, dangpu: { red: 0, bead: 0, jade: 1, scar: 0, brass: 0 },
    hunter: { red: 0, bead: 0, jade: 0, scar: 1, brass: 1 }, qingmian: { red: 0, bead: 0, jade: 0, scar: 0, brass: 0 } };
  ['shoujing', 'dangpu', 'hunter', 'qingmian'].forEach((role, seat) => {
    const g = meshOf(r, seat).geometry, col = g.attributes.color.array, n = g.attributes.position.count;
    for (const [k, cs] of Object.entries(marks)) {
      const got = cs.every((c) => colourHas(col, n, c)) ? 1 : 0, any = cs.some((c) => colourHas(col, n, c)) ? 1 : 0;
      assert.equal(want[role][k] ? got : any, want[role][k], `${role} 的「${k}」識別色：期望 ${want[role][k]}`);
    }
  });
  r.hands.dispose(); r.props.dispose();
});

test('R3 動作中（推／拍）四席皮膚頂點 alpha 全為 1、material.opacity＝1；袖尾漸隱仍在（有頂點 alpha<1）；漸隱沒吃進膚色（z ≥ CUFF_FROM）', async () => {
  const B = await baseSrc();
  const r = await rig('L', ['shoujing', 'dangpu', 'hunter', 'shoujing']);
  const S = M.HAND.SLEEVE;
  for (let s = 0; s < 4; s++) { ev.bid(r, s, 1, 8); }
  for (let f = 0; f < 40; f++) ev.step(r);
  let acting = 0;
  for (let s = 0; s < 4; s++) {
    const m = meshOf(r, s), g = m.geometry, col = g.attributes.color.array, pos = g.attributes.position;
    assert.equal(m.material.opacity, 1, `席 ${s} material.opacity`);
    let skin = 0, tailFade = 0;
    for (let v = 0; v < B.n0; v++) {
      const a = col[v * 4 + 3];
      if (pos.getZ(v) >= S.CUFF_FROM) { skin++; assert.equal(a, 1, `席 ${s} 膚色頂點 ${v} alpha=${a}`); } else if (a < 1) tailFade++;
    }
    assert.ok(skin > 300 && tailFade > 20, `席 ${s} 取樣 skin=${skin} tailFade=${tailFade}（零鑑別力防線）`);
    if (r.hands.stats().visible.includes(s)) acting++;
  }
  assert.ok(acting >= 3, `動作中可見的手 ${acting} 隻（否則沒有行使到動作）`);
  r.hands.dispose(); r.props.dispose();
});
