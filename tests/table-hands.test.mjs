// 席位之手 階段二 2a：凍結驗收 docs/experiments/2026-10-01-acceptance-seat-hands.md 的 #B1（面數）與 #C1–#C6 的 node 部分。
// 走真實鏈路：真的 assets/creatures/hand_r.glb、真的 js/table-props.js、真的 js/table-hands.js（只把 creature-figures 的
// 瀏覽器 GLTFLoader 換成 node 版同一條管線：SkeletonUtils.clone＋真的 shareSkeletons）、真的 three 蒙皮
// （SkinnedMesh.getVertexPosition）。穿入判定用的是 props 的 InstancedMesh 實際矩陣與錢／令牌的幾何尺寸，
// **不是**手自己拿來解擺位的障礙表（那是被測邏輯的一部分，拿它驗自己是循環論證）。
// 實頁部分（draw call、HUD、hitTest、P/L 截圖、ys:mark-slam 事件）在 tests/tools/hands-probe.mjs。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { THREE, M, ROOT, loadProps, loadHands, loadHandGltf, LAYOUTS, handRigSource as handRigSourceFx } from './hand-fixture.mjs';

const { createTableProps, PROPS } = await loadProps();
const { createTableHands, fetched } = await loadHands();
const DT = 1 / 60;

async function rig(layout = 'L', opts = {}) {
  const parent = new THREE.Group();
  const slams = [];
  const props = createTableProps(parent, { handPaths: opts.handPaths !== false, onSlam: (slot) => slams.push({ slot, frame: opts.frameRef ? opts.frameRef.n : -1 }) });
  props.setLayout(...LAYOUTS[layout]);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = opts.noHands ? null : createTableHands(parent, props);
  if (hands) await hands.ready();
  parent.updateMatrixWorld(true);
  return { parent, props, hands, slams };
}
/** 與 renderer.js 的 listener 同一條路：props 先、手後。 */
const ev = {
  bid: (r, s, k, a) => { r.props.bid(s, k, a); r.hands && r.hands.bid(s, k, a); },
  mark: (r, s, k) => { r.props.mark(s, k); r.hands && r.hands.mark(s, k); },
  reveal: (r, k, w) => { r.props.reveal(k, w); r.hands && r.hands.reveal(k, w); },
  step: (r, dt = DT) => { r.props.update(dt); r.hands && r.hands.update(dt); r.parent.updateMatrixWorld(true); },
};
const holders = (r) => r.hands.group.children;
const visibleSeats = (r) => holders(r).filter((h) => h.visible).map((h) => +h.name.split('-')[1]);

/* ── 穿入判定：手的真實蒙皮頂點 vs 錢與令牌的實際實例體積 ─────────────────────── */
const tmpM = new THREE.Matrix4(), inv = new THREE.Matrix4(), v = new THREE.Vector3(), l = new THREE.Vector3();
function volumes(r) {
  const out = [];
  const chips = r.props.group.getObjectByName('prop-chips'), toks = r.props.group.getObjectByName('prop-tokens');
  for (let i = 0; i < chips.count; i++) { chips.getMatrixAt(i, tmpM); out.push({ kind: 'chip', inv: new THREE.Matrix4().copy(tmpM).invert() }); }
  for (let i = 0; i < toks.count; i++) { toks.getMatrixAt(i, tmpM); out.push({ kind: 'token', inv: new THREE.Matrix4().copy(tmpM).invert() }); }
  return out;
}
const C = PROPS.CHIP, T = PROPS.TOKEN, EPS = 1e-6;
function insideVolume(p, vol) {
  l.copy(p).applyMatrix4(vol.inv);
  if (vol.kind === 'chip') return Math.hypot(l.x, l.z) < C.R - EPS && Math.abs(l.y) < C.T / 2 - EPS;
  return Math.abs(l.x) < T.W - EPS && Math.abs(l.z) < T.H - EPS && l.y > -T.T / 2 + EPS && l.y < T.T / 2 + 0.028 - EPS;
}
/** 回傳這一幀所有可見手的穿入頂點數（含是哪一席、穿進哪一種）。 */
function penetrations(r) {
  const vols = volumes(r), hits = [];
  for (const h of holders(r)) {
    if (!h.visible) continue;
    let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; });
    mesh.skeleton.update();
    const n = mesh.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) {
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
      for (const vol of vols) if (insideVolume(v, vol)) { hits.push({ seat: h.name, kind: vol.kind, y: +v.y.toFixed(4) }); break; }
    }
  }
  return hits;
}

/* ═══ #B1 面數＋管線 ═══════════════════════════════════════════════════ */
test('#B1 每隻手 ≤2,500 三角形、單一 primitive、24 骨；四隻手共用一份材質、同一顆 GLB 只抓一次（走 cloneSkinnedGlb 管線）', async () => {
  const g = await loadHandGltf();
  const meshes = []; g.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1, '單一 primitive');
  const tris = meshes[0].geometry.index.count / 3;
  assert.ok(tris <= 2500, `每隻手 ≤2,500（實際 ${tris}）`);
  assert.equal(meshes[0].skeleton.bones.length, 24);
  const r = await rig('L');
  const st = r.hands.stats();
  assert.equal(st.hands, 4); assert.equal(st.trisPerHand, tris); assert.equal(st.materials, 1);
  assert.equal(st.skeletons, 4, '每隻手各自一副骨架（各自擺姿勢）');
  assert.ok(st.shared && typeof st.shared.skeletons === 'number', 'shareSkeletons 有被呼叫（管線證據）');
  assert.deepEqual([...new Set(fetched)], [M.HAND.GLB], '四隻手只向管線要了同一個 URL');
  assert.equal(fetched.length, 1, '同一顆 GLB 只抓一次（快取）');
  assert.ok(fs.existsSync(path.join(ROOT, M.HAND.GLB)));
  r.hands.dispose(); r.props.dispose();
});

/* ═══ #C1／#C2 指尖不穿錢柱與令牌（取樣：每幀、每個蒙皮頂點）＋兩版面 ══════════ */
async function runScenario(layout, script) {
  const r = await rig(layout);
  let worst = [], frames = 0, seen = new Set();
  for (const stepFn of script) {
    stepFn(r);
    for (let i = 0; i < 70; i++) {
      ev.step(r); frames++;
      visibleSeats(r).forEach((s) => seen.add(s));
      const hits = penetrations(r);
      if (hits.length) { worst = hits.slice(0, 5); break; }
    }
    if (worst.length) break;
  }
  r.hands.dispose(); r.props.dispose();
  return { worst, frames, seen: [...seen].sort() };
}
for (const layout of ['L', 'P']) {
  test(`#C1/#C2 ${layout}：推（四席×四格×1/8/12 枚）每幀的手部蒙皮頂點都不在任何一枚錢或令牌體內`, async () => {
    const script = [];
    for (const amt of [1, 8, 12]) for (let slot = 0; slot < 4; slot++) {
      script.push((r) => { r.props.clearRound(); r.hands.clear(); for (let s = 0; s < 4; s++) ev.mark(r, s, (slot + s) % 4); for (let i = 0; i < 40; i++) ev.step(r); });
      script.push((r) => { for (let s = 0; s < 4; s++) ev.bid(r, s, (slot + s) % 4, amt); });
      script.push((r) => { for (let s = 0; s < 4; s++) ev.bid(r, s, slot, amt); }); // 四家同一格：彼此最擠的情境
    }
    const out = await runScenario(layout, script);
    assert.deepEqual(out.seen, [0, 1, 2, 3], '四席的手都真的上場過（否則零鑑別力）');
    assert.deepEqual(out.worst, [], `穿入：${JSON.stringify(out.worst)}`);
  });
  test(`#C1/#C2 ${layout}：拍（令牌舉高→拍下→微顫→收）與收（敗方扒回、勝方停一拍）每幀不穿錢柱與令牌`, async () => {
    const script = [];
    for (let slot = 0; slot < 4; slot++) {
      script.push((r) => { r.props.clearRound(); r.hands.clear(); for (let s = 0; s < 4; s++) ev.bid(r, s, slot, 3 + s * 3); for (let i = 0; i < 60; i++) ev.step(r); });
      script.push((r) => { for (let s = 0; s < 4; s++) ev.mark(r, s, slot); });
      script.push((r) => { ev.reveal(r, slot, slot); }); // 勝方輪流換人
    }
    const out = await runScenario(layout, script);
    assert.deepEqual(out.seen, [0, 1, 2, 3]);
    assert.deepEqual(out.worst, [], `穿入：${JSON.stringify(out.worst)}`);
  });
}

test('#C1 手的地板外框蓋得住錢柱的真實幾何：每一幀 stackAt 的頂高／半徑 ≥ 該柱每枚錢實例頂點的實際最高點／最遠水平距離（含傾斜、一串立錢、得標脈衝）', async () => {
  const r = await rig('L', { noHands: true });
  const chips = r.props.group.getObjectByName('prop-chips'), pos = chips.geometry.attributes.position;
  let checked = 0;
  const check = () => {
    const recs = []; for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) { const st = r.props.stackAt(s, k); if (st) recs.push([s, k, st]); }
    for (const [s, k, st] of recs) {
      const tops = [], rs = [];
      for (let i = 0; i < chips.count; i++) {
        chips.getMatrixAt(i, tmpM);
        const c = new THREE.Vector3().setFromMatrixPosition(tmpM);
        if (Math.hypot(c.x - st.x, c.z - st.z) > st.r + 0.2) continue; // 只看附近（其他柱另算）
        const near = recs.reduce((b, x) => (Math.hypot(c.x - x[2].x, c.z - x[2].z) < Math.hypot(c.x - b[2].x, c.z - b[2].z) ? x : b));
        if (near[0] !== s || near[1] !== k) continue;
        for (let j = 0; j < pos.count; j++) { v.fromBufferAttribute(pos, j).applyMatrix4(tmpM); tops.push(v.y); rs.push(Math.hypot(v.x - st.x, v.z - st.z)); }
      }
      if (!tops.length) continue;
      checked++;
      assert.ok(st.top >= Math.max(...tops) - 1e-9, `seat${s} slot${k} 頂高 ${st.top} < 實際 ${Math.max(...tops)}`);
      assert.ok(st.r >= Math.max(...rs) - 1e-9, `seat${s} slot${k} 半徑 ${st.r} < 實際 ${Math.max(...rs)}`);
    }
  };
  for (let s = 0; s < 4; s++) r.props.bid(s, s, [1, 5, 8, 12][s]);
  for (let i = 0; i < 40; i++) { r.props.update(DT); check(); }
  r.props.reveal(0, 0); r.props.reveal(3, 1);
  for (let i = 0; i < 40; i++) { r.props.update(DT); check(); }
  assert.ok(checked > 100, `活性：真的比對過（${checked}）`);
  r.props.dispose();
});

test('#C1 收：勝方錢柱得標脈衝放大（×1.24）的那幾幀，旁邊扒錢的手也不穿入（實頁探針抓到的情境，細步進 1/400 秒）', async () => {
  for (const layout of ['L', 'P']) {
    const r = await rig(layout);
    for (let s = 0; s < 4; s++) ev.bid(r, s, 1, 2 + s * 2);
    for (let i = 0; i < 300; i++) ev.step(r, 1 / 400);
    for (let s = 0; s < 4; s++) ev.mark(r, s, 1);
    for (let i = 0; i < 400; i++) ev.step(r, 1 / 400);
    ev.reveal(r, 1, 2);
    let hits = [], live = 0;
    for (let i = 0; i < 400 && !hits.length; i++) { ev.step(r, 1 / 400); if (visibleSeats(r).length) live++; hits = penetrations(r); }
    assert.ok(live > 100, `${layout} 活性：收的動作真的有畫（${live} 幀）`);
    assert.deepEqual(hits.slice(0, 3), [], `${layout} 穿入`);
    r.hands.dispose(); r.props.dispose();
  }
});

test('#C1 收手後整隻不可見（閒置＝收在畫面外）：推／拍／收各自做完，四隻手都回到不可見', async () => {
  for (const layout of ['L', 'P']) {
    const r = await rig(layout);
    const check = (label, n = 90) => { for (let i = 0; i < n; i++) ev.step(r); assert.deepEqual(visibleSeats(r), [], `${layout} ${label} 之後仍有手可見`); };
    for (let s = 0; s < 4; s++) ev.bid(r, s, s, 6);
    assert.ok(visibleSeats(r).length === 0, '事件當下尚未 update：還沒擺（下一幀才出現）');
    /* 第三輪：起手時錢柱還壓在自家信物上，手避讓信物，錢一離開信物手才上場——所以看「推的前 0.2 秒內四隻都出現過」 */
    { const seen = new Set(); let first = -1; for (let i = 0; i < 12; i++) { ev.step(r); visibleSeats(r).forEach((x) => seen.add(x)); if (first < 0 && seen.size === 4) first = i; }
      assert.equal(seen.size, 4, `推：四隻手在前 12 幀內都上場（實際 ${[...seen]}）`); }
    check('推');
    for (let s = 0; s < 4; s++) ev.mark(r, s, (s + 1) % 4);
    /* 第二輪：拍的手在令牌落地那一幀才上場（飛行時不上場），所以等到落地後再確認四隻都出現過 */
    const seenSlam = new Set(); for (let i = 0; i < 30; i++) { ev.step(r); visibleSeats(r).forEach((x) => seenSlam.add(x)); }
    assert.equal(seenSlam.size, 4, '拍：四隻手都上場過');
    check('拍');
    ev.reveal(r, 0, 0);
    ev.step(r); assert.ok(visibleSeats(r).length >= 1);
    check('收');
    r.hands.dispose(); r.props.dispose();
  }
});

test('#C2 直式的手比橫式小（SCALE_P），兩版面都以同一組常數換算', async () => {
  const scales = {};
  for (const layout of ['L', 'P']) {
    const r = await rig(layout);
    ev.bid(r, 0, 1, 5); ev.step(r);
    scales[layout] = holders(r)[0].scale.x;
    r.hands.dispose(); r.props.dispose();
  }
  assert.equal(scales.L, M.HAND.SCALE);
  assert.ok(Math.abs(scales.P - M.HAND.SCALE * M.HAND.SCALE_P) < 1e-12);
});

/* ═══ #C3 跳過與縮時 ═══════════════════════════════════════════════════ */
const SEQ = [
  (r) => { for (let s = 0; s < 4; s++) ev.mark(r, s, s); },
  (r) => { for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) ev.bid(r, s, k, 2 + ((s + k) % 5)); },
  (r) => ev.reveal(r, 1, 2),
  (r) => ev.bid(r, 3, 3, 0),
  (r) => ev.reveal(r, 3, 0),
];
function finalTable(r) {
  const out = {};
  for (const name of ['prop-chips', 'prop-tokens']) {
    const m = r.props.group.getObjectByName(name), arr = [];
    for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, tmpM); arr.push(tmpM.elements.map((x) => +x.toFixed(9))); }
    out[name] = arr.sort((a, b) => a[12] - b[12] || a[14] - b[14] || a[13] - b[13]);
  }
  return JSON.stringify(out);
}
async function play(dtA, opts = {}) {
  const r = await rig('L', opts);
  for (const f of SEQ) { f(r); const t = 1.6 / dtA; for (let i = 0; i < t; i++) ev.step(r, dtA); }
  const out = { table: finalTable(r), visible: r.hands ? visibleSeats(r) : [], slams: r.slams.length };
  r.hands && r.hands.dispose(); r.props.dispose();
  return out;
}
test('#C3 縮時：同一事件序列以 1/120、1/60、1/20 秒步進，錢與令牌的終點逐位元相同、四隻手都已收；且與「不開手」的錢終點相同', async () => {
  const a = await play(1 / 120), b = await play(1 / 60), c = await play(1 / 20), off = await play(1 / 60, { noHands: true, handPaths: false });
  assert.equal(a.table, b.table); assert.equal(b.table, c.table);
  assert.equal(b.table, off.table, '手只改路徑不改終點（錢終點不變）');
  for (const x of [a, b, c]) { assert.deepEqual(x.visible, []); assert.equal(x.slams, 4, '四枚令牌各落地一次'); }
});
test('#C3 跳過：動作進行到一半按跳過（props.finish＋hands.finish），手立刻全收、錢與令牌直接到終點，且終點與正常播完相同', async () => {
  const normal = await play(1 / 60);
  const r = await rig('L');
  for (const f of SEQ) { f(r); for (let i = 0; i < 6; i++) ev.step(r); r.props.finish(); r.hands.finish(); r.parent.updateMatrixWorld(true);
    assert.deepEqual(visibleSeats(r), [], '跳過當下手全收');
    const st = r.hands.stats().state; assert.ok(st.every((x) => x === null), '動作狀態全清');
  }
  for (let i = 0; i < 3; i++) ev.step(r); // 跳過之後再跑幾幀也不會有手冒出來
  assert.deepEqual(visibleSeats(r), []);
  assert.equal(finalTable(r), normal.table, '跳過的終點＝正常播完的終點');
  assert.equal(r.slams.length, 4, '跳過時令牌落地仍由令牌的 update 路徑發（各一次）');
  r.hands.dispose(); r.props.dispose();
});

/* ═══ #C4 決定性 ═══════════════════════════════════════════════════════ */
function snapshot(r) {
  return holders(r).map((h) => {
    if (!h.visible) return null;
    const bones = []; h.traverse((o) => { if (o.isBone) bones.push(o.quaternion.toArray().map((x) => +x.toFixed(9))); });
    return [h.position.toArray(), [h.rotation.x, h.rotation.y], h.scale.x, bones].flat(2).map((x) => +(+x).toFixed(9));
  });
}
test('#C4 決定性：整段事件序列 Math.random 呼叫 0 次；同一事件序列跑兩次，手勢序列（每幀擺位＋骨旋轉）逐值相同', async () => {
  const runOnce = async () => {
    const r = await rig('L');
    const real = Math.random; let calls = 0;
    Math.random = () => { calls++; return real(); };
    const frames = [];
    try {
      for (const f of SEQ) { f(r); for (let i = 0; i < 50; i++) { ev.step(r); frames.push(snapshot(r)); } }
    } finally { Math.random = real; }
    r.hands.dispose(); r.props.dispose();
    return { calls, frames: JSON.stringify(frames), live: frames.filter((f) => f.some(Boolean)).length };
  };
  const a = await runOnce(), b = await runOnce();
  assert.equal(a.calls, 0, 'Math.random 計數');
  assert.ok(a.live > 30, `活性：手真的有在動（可見幀數 ${a.live}）`);
  assert.equal(a.frames, b.frames);
});

/* ═══ #C5 覆寫不疊手、熱座清場即收 ═════════════════════════════════════ */
test('#C5 同席同格重複出價＝覆寫：永遠只有一隻手、場上手的物件數不增加；amount 0（熱座清場）同一幀立即收', async () => {
  const r = await rig('L');
  const count = () => { let n = 0; r.hands.group.traverse((o) => { if (o.isSkinnedMesh) n++; }); return n; };
  const n0 = count();
  for (let k = 0; k < 5; k++) { ev.bid(r, 0, 2, 3 + k); ev.step(r); ev.step(r); }
  assert.equal(count(), n0, '沒有多長出任何一隻手');
  assert.deepEqual(visibleSeats(r), [0], '只有南席那一隻在場');
  assert.equal(r.props.stats().bids.filter((b) => b.seat === 0 && b.slot === 2).length, 1, '錢也只有一份（覆寫）');
  assert.equal(r.hands.stats().state[0].slot, 2);
  // 熱座清場：clearBids3d＝四席四格逐一 bid 0；正推著的那一席在同一個事件裡就收
  for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) ev.bid(r, s, k, 0);
  assert.equal(r.hands.stats().state[0], null, '狀態當場清掉');
  ev.step(r);
  assert.deepEqual(visibleSeats(r), [], '下一幀也不會再畫出來');
  // 推別格時收到「另一格歸零」不影響正在推的那一格
  ev.bid(r, 1, 1, 6); ev.step(r); ev.bid(r, 1, 3, 0); ev.step(r);
  assert.deepEqual(visibleSeats(r), [1]);
  // 換一夜（ys:market 新 round → props.clearRound＋hands.clear）
  r.props.clearRound(); r.hands.clear();
  assert.deepEqual(visibleSeats(r), []);
  r.hands.dispose(); r.props.dispose();
});

/* ═══ #C6 令牌落地那一幀仍由令牌發 ys:mark-slam ════════════════════════ */
test('#C6 落地事件只由令牌發：手的模組不派任何 DOM 事件；四枚令牌各一次 onSlam，且就在令牌 t 到 1 的那一幀', async () => {
  const realDoc = globalThis.document, realCE = globalThis.CustomEvent;
  const dispatched = [];
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  globalThis.document = { dispatchEvent: (e) => { dispatched.push(e.type); return true; }, addEventListener() {} };
  try {
    const frameRef = { n: 0 };
    const r = await rig('L', { frameRef });
    for (let s = 0; s < 4; s++) ev.mark(r, s, s);
    const landedAt = [];
    for (let i = 0; i < 60; i++) {
      frameRef.n = i;
      const before = [0, 1, 2, 3].map((s) => r.props.tokenAt(s).t);
      ev.step(r);
      [0, 1, 2, 3].forEach((s) => { if (before[s] < 1 && r.props.tokenAt(s).t >= 1) landedAt.push(i); });
    }
    assert.deepEqual(dispatched, [], `手的模組派了事件：${dispatched.join(',')}`);
    assert.equal(r.slams.length, 4);
    assert.deepEqual(r.slams.map((x) => x.frame).sort(), landedAt.sort(), 'onSlam 就在令牌落地那一幀');
    r.hands.dispose(); r.props.dispose();
  } finally { globalThis.document = realDoc; globalThis.CustomEvent = realCE; }
});

/* ═══ 第二輪：伸入深度（北席不越過自己那側托盤前緣、西／東不越過托盤中線）═══════════ */
test('第二輪伸入深度（L）：推／拍／收全程，看得見的手（袖口邊以前的真實蒙皮頂點）——北席 z ≤ 托盤北緣＋NORTH_IN；西席 x ≤ −MID、東席 x ≥ MID；南／西／東 z ≥ 托盤前緣−SOUTH_IN', async () => {
  const r = await rig('L');
  const tz = LAYOUTS.L[3], hd = M.HAND.TRAY.L.hd, R = M.HAND.REACH;
  const front = (p) => (tz + hd - R.SOUTH_IN) - p.z;
  const lim = { 0: front, 1: (p) => p.z - (tz - hd + R.NORTH_IN), 2: (p) => Math.max(p.x + R.MID, front(p)), 3: (p) => Math.max(-p.x + R.MID, front(p)) };
  let worst = -Infinity, where = null, live = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const check = () => {
    for (const h of holders(r)) {
      const seat = +h.name.split('-')[1]; if (!h.visible || !lim[seat]) continue;
      live[seat]++;
      let mesh; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); mesh.skeleton.update();
      const P = mesh.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) {
        if (P.getZ(i) < M.HAND.SLEEVE.CUFF_TO) continue; // 漸隱掉的袖布不算
        mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
        const d = lim[seat](v); if (d > worst) { worst = d; where = seat; }
      }
    }
  };
  for (let slot = 0; slot < 4; slot++) {
    r.props.clearRound(); r.hands.clear();
    for (let s = 0; s < 4; s++) ev.bid(r, s, slot, 6);
    for (let i = 0; i < 50; i++) { ev.step(r); check(); }
    for (let s = 0; s < 4; s++) ev.mark(r, s, slot);
    for (let i = 0; i < 50; i++) { ev.step(r); check(); }
    ev.reveal(r, slot, (slot + 1) % 4);
    for (let i = 0; i < 70; i++) { ev.step(r); check(); }
  }
  assert.ok(live[0] > 50 && live[1] > 50 && live[2] > 50 && live[3] > 50, `活性：四席的手都上場過 ${JSON.stringify(live)}`);
  assert.ok(worst <= 1e-3, `越線 ${worst}（席 ${where}）`);
  r.hands.dispose(); r.props.dispose();
});

test('第二輪拍：令牌飛行中（t<1）手不上場，落地後才伸進來；令牌落地後四隻手都出現過', async () => {
  const r = await rig('L');
  for (let s = 0; s < 4; s++) ev.mark(r, s, (s + 2) % 4);
  let flyingVisible = 0, flyingFrames = 0; const after = new Set();
  for (let i = 0; i < 60; i++) {
    ev.step(r);
    for (let s = 0; s < 4; s++) {
      const vis = holders(r)[s].visible, t = r.props.tokenAt(s).t;
      if (t < 1) { flyingFrames++; if (vis) flyingVisible++; } else if (vis) after.add(s);
    }
  }
  assert.ok(flyingFrames > 20, '活性：確實量到飛行中的幀');
  assert.equal(flyingVisible, 0, '飛行中有手在場');
  assert.equal(after.size, 4);
  r.hands.dispose(); r.props.dispose();
});

test('第三輪袖尾平滑淡出：四手共用材質為真透明（transparent、不用 alphaHash 抖色）、寫深度、alphaTest 丟掉完全隱去的袖布；頂點色帶 alpha', async () => {
  const r = await rig('L');
  const st = r.hands.stats();
  assert.deepEqual(st.fade, { transparent: true, alphaHash: false, alphaTest: 0.01, depthWrite: true });
  let mesh; r.hands.group.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  assert.equal(mesh.geometry.attributes.color.itemSize, 4, '頂點色要帶 alpha 才淡得出來');
  r.hands.dispose(); r.props.dispose();
});

/* ═══ 第三輪：信物不相交（C1 取樣擴到信物）═══════════════════════════ */
function relicHits(r) {
  const relics = r.props.group.children.filter((o) => /^relic-/.test(o.name));
  const boxes = relics.map((m) => { m.geometry.computeBoundingBox(); return { name: m.name, inv: new THREE.Matrix4().copy(m.matrixWorld).invert(), b: m.geometry.boundingBox }; });
  const hits = [];
  for (const h of holders(r)) {
    if (!h.visible) continue;
    let mesh; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); mesh.skeleton.update();
    const P = mesh.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) {
      if (P.getZ(i) < M.HAND.SLEEVE.SEEN_TO) continue; // 已隱去的袖布不算
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
      for (const bx of boxes) { l.copy(v).applyMatrix4(bx.inv); if (bx.b.containsPoint(l)) { hits.push([h.name, bx.name]); break; } }
    }
  }
  return hits;
}
for (const layout of ['L', 'P']) {
  test(`第三輪信物（${layout}）：推（起手錢柱壓在自家信物上）、拍、收（錢拖回信物旁）全程，看得見的手不進任何信物的本地包圍盒`, async () => {
    const r = await rig(layout);
    let hits = [], live = 0;
    const run = (n) => { for (let i = 0; i < n && !hits.length; i++) { ev.step(r); if (visibleSeats(r).length) live++; hits = relicHits(r); } };
    for (let slot = 0; slot < 4 && !hits.length; slot++) {
      r.props.clearRound(); r.hands.clear();
      for (let s = 0; s < 4; s++) ev.bid(r, s, (slot + s) % 4, 3 + s * 3); run(50);
      for (let s = 0; s < 4; s++) ev.mark(r, s, (slot + s) % 4); run(50);
      for (let k = 0; k < 4; k++) { ev.reveal(r, k, slot); run(70); }
    }
    assert.ok(live > 200, `活性：${live}`);
    assert.deepEqual(hits.slice(0, 3), [], '手與信物相交');
    r.hands.dispose(); r.props.dispose();
  });
}

/* ═══ 第四輪：一席一次推多格＝排隊（方案甲）═══════════════════════════ */
async function queueRun(seat, n, probe, slots) {
  const r = await rig('L');
  const ks = slots || [...Array(n).keys()];
  for (const k of ks) ev.bid(r, seat, k, 3 + k);
  const DTQ = 1 / 120, startAt = {}, arriveAt = {}; let t = 0, handEnd = null, landed = null;
  for (let i = 0; i < 600; i++) {
    ev.step(r, DTQ); t += DTQ;
    for (const k of ks) { const st = r.props.stackAt(seat, k); if (st && startAt[k] === undefined && st.t > 0) startAt[k] = t - DTQ; if (st && arriveAt[k] === undefined && st.t >= 1) arriveAt[k] = t; }
    if (probe) probe(r, t, startAt, arriveAt);
    if (landed === null && Object.keys(arriveAt).length === n) landed = t;
    if (handEnd === null && landed !== null && r.hands.stats().state[seat] === null) { handEnd = t; break; }
  }
  return { r, startAt, arriveAt, landed, handEnd };
}
test('第四輪排隊時序：一席同一幀推 4 格——各格依序起步 0／0.48／0.76／1.04 秒、落定 0.42／0.70／0.98／1.26 秒（±1.5 幀）；手動作 ≤1.6 秒結束', async () => {
  const q = await queueRun(1, 4);
  const tol = 1.5 / 120, S = [0, 0.48, 0.76, 1.04], A = [0.42, 0.70, 0.98, 1.26];
  for (let k = 0; k < 4; k++) {
    assert.ok(Math.abs(q.startAt[k] - S[k]) <= tol, `第 ${k + 1} 格起步 ${q.startAt[k]}（應 ${S[k]}）`);
    assert.ok(Math.abs(q.arriveAt[k] - A[k]) <= tol, `第 ${k + 1} 格落定 ${q.arriveAt[k]}（應 ${A[k]}）`);
  }
  assert.ok(q.handEnd !== null && q.handEnd <= 1.6, `手動作結束 ${q.handEnd} 秒`);
  q.r.hands.dispose(); q.r.props.dispose();
});
/* 南席推中間兩格（1、2）：0／3 兩格的路徑會經過西／東席信物、手要側移避讓（第三輪規則），離錢柱本來就會拉開，不拿來量。
   只量排隊的第二格（2）：推它的時候，手要在它的錢柱旁，而且比離上一格（1）的錢柱近——「第二格起重新抓位置」。
   （第一格不量：南席的手推到托盤前緣會被第二輪的伸入界線擋下、錢自己滑完，那是既定規則。） */
test('第四輪排隊：排隊的第二格推的時候，同一隻手就在那一格的錢柱旁（重新抓這一格的位置），不是留在上一格', async () => {
  let checks = 0; const bad = [];
  const q = await queueRun(0, 2, (r) => {
    const st = r.props.stackAt(0, 2), prev = r.props.stackAt(0, 1);
    if (!st || !prev || st.t < 0.2 || st.t > 0.95) return;
    const h = holders(r)[0]; if (!h.visible) return;
    let mesh; h.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); mesh.skeleton.update();
    let d = Infinity, dp = Infinity; const P = mesh.geometry.attributes.position;
    for (let i = 0; i < P.count; i += 3) { mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); d = Math.min(d, Math.hypot(v.x - st.x, v.z - st.z)); dp = Math.min(dp, Math.hypot(v.x - prev.x, v.z - prev.z)); }
    checks++; if (!(d < st.r + 0.08 && d < dp)) bad.push([+d.toFixed(3), +dp.toFixed(3)]);
  }, [1, 2]);
  let meshes = 0; q.r.hands.group.traverse((o) => { if (o.isSkinnedMesh) meshes++; });
  assert.equal(meshes, 4, '仍是四隻手（每席一隻）');
  assert.ok(checks >= 8, `活性：取樣 ${checks}`);
  assert.deepEqual(bad.slice(0, 4), [], '［離第二格, 離第一格］');
  q.r.hands.dispose(); q.r.props.dispose();
});

/* ═══ 時序對齊（純函式常數 vs table-props） ═════════════════════════════ */
test('時序：推＝籌碼飛行 0.42 秒；收＝0.22 秒延遲＋0.42 秒返回；拍跟著令牌（SLAM_MS 0.30）', () => {
  assert.equal(M.HAND.PUSH_MS, PROPS.CHIP.FLY_MS);
  assert.equal(M.HAND.RAKE.DELAY, 0.22);
  assert.equal(M.HAND.RAKE.BACK_MS, 0.42);
  assert.equal(PROPS.TOKEN.SLAM_MS, 0.30);
});

/* 第二輪（使用者 2026-10-01：手太大、黑袖口成團）：原本這裡斷言 SCALE＝0.35（第一輪主對話的裁定），
   使用者改裁「比 0.35 再降、掌寬≈錢柱直徑 2～2.5 倍」，所以換成量出來的比例判準。 */
test('第二輪縮放：橫式掌寬（GLB Palm 主骨頂點 x 跨度 × SCALE）為錢柱直徑的 2～2.5 倍，且小於第一輪的 0.35', async () => {
  const { src } = await handRigSourceFx();
  const rig = M.buildRig(src);
  let a = Infinity, b = -Infinity;
  for (let v = 0; v < rig.count; v++) if (rig.names[rig.dom[v]] === 'Palm') { a = Math.min(a, src.positions[v * 3]); b = Math.max(b, src.positions[v * 3]); }
  const ratio = (b - a) * M.HAND.SCALE / (2 * PROPS.CHIP.R);
  assert.ok(ratio >= 2 && ratio <= 2.5, `掌寬／錢柱直徑＝${ratio}`);
  assert.ok(M.HAND.SCALE < 0.35);
});

test('第二輪袖子：沒有成團黑塊——看得見（alpha≥0.5）的頂點都不是近黑；袖口以後漸隱；看得見的袖子長度 ≤ 前臂 1/5', async () => {
  const { src, mesh } = await handRigSourceFx();
  const c = mesh.geometry.attributes.color;
  const rgba = M.dressColors(src.positions, c.array, c.itemSize);
  const n = src.positions.length / 3;
  const forearm = 2.3, wristZ = 0; // 腕骨 z＝0、肘骨 z＝−2.3（GLB bind）
  let darkVisible = 0, minVisibleZ = Infinity, hiddenTail = 0, tail = 0;
  for (let v = 0; v < n; v++) {
    const z = src.positions[v * 3 + 2], r = rgba[v * 4], g = rgba[v * 4 + 1], b = rgba[v * 4 + 2], al = rgba[v * 4 + 3];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (al >= 0.5) { if (lum < 0.03) darkVisible++; minVisibleZ = Math.min(minVisibleZ, z); }
    if (z < -1.5) { tail++; if (al <= 0.01) hiddenTail++; }
  }
  assert.equal(darkVisible, 0, '看得見的近黑頂點');
  assert.ok(wristZ - minVisibleZ <= forearm / 5 + 0.25, `看得見的部分延伸到腕後 ${wristZ - minVisibleZ} dm（袖口 ≤ ${forearm / 5}，再加漸隱前半段）`);
  assert.ok(tail > 0 && hiddenTail === tail, `原本的黑袖段（z<−1.5）須全數隱去：${hiddenTail}/${tail}`);
});
