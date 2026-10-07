// v0.62.4 手來回彈跳回歸測試（凍結驗收：D:\yaoshi-scratch\fixflip-out\acceptance-fixflip-v0624.md，含 2026-10-07 slam 修訂）。
// 走真實鏈路：tests/hand-fixture.mjs 的 createTableProps＋createTableHands（內部即 hand-motion.js 的 createHandDirector，
// 真的批 1／寫實手碰撞取樣、真的信物與伸入界線解算），不重抄、不 mock 解算。固定 dt=1/60，決定性。
// 量的是 Palm 骨的世界座標：同一動作段內二階差 >0.10 世界單位＝單幀來回彈跳事件；單幀最大步以固定相機投影成 CSS px（844×390，
// 相機矩陣取自瀏覽器實測 money 劇本第 0 幀，wobble-out 治具）。
// 對照：YAOSHI_MOTION_PATH 指向 6394c055 的 hand-motion.js 時，push 與 slam 的斷言必須紅（基準 push 19 事件／131.9 px、slam 13／86.4 px）。
import assert from 'node:assert/strict';
import test from 'node:test';
import { THREE, loadProps, loadHands, LAYOUTS } from './hand-fixture.mjs';

const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands();
const DT = 1 / 60;

const cam = new THREE.PerspectiveCamera(); cam.matrixAutoUpdate = false;
cam.matrixWorld.fromArray([1, 0, 0, 0, 0, 0.8321922008214605, -0.5544872774842845, 0, 0, 0.5544872774842845, 0.8321922008214605, 0, 0, 2.064875170863766, 2.9489473594403703, 1]);
cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
cam.projectionMatrix.fromArray([0.9909451409937535, 0, 0, 0, 0, 2.1445069205095586, 0, 0, 0, 0, -1.002002002002002, -1, 0, 0, -0.20020020020020018, 0]);
cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
const pv = new THREE.Vector3();
const px = (p) => { pv.set(p[0], p[1], p[2]).project(cam); return [(pv.x + 1) / 2 * 844, (1 - pv.y) / 2 * 390]; };

/* 劇本：勝方 A 擺 6、敗方 B 擺 4、A 拍令牌、開標 A 勝（A hold／B rake）。四個方位各一次。 */
const SCN = {
  money: [0, 1, 1], moneyE: [3, 2, 2], moneyW: [2, 0, 0], moneyN: [1, 3, 3], // [勝方, 敗方, 格]
};
async function run([win, lose, slot]) {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true });
  props.setLayout(...LAYOUTS.L);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props); await hands.ready(); parent.updateMatrixWorld(true);
  const frames = []; let f = 0;
  const step = (n) => { for (let i = 0; i < n; i++) {
    props.update(DT); hands.update(DT); parent.updateMatrixWorld(true);
    const st = hands.stats().state, out = {};
    for (const h of hands.group.children) {
      if (!h.visible) continue;
      const seat = +h.name.split('-')[1]; let mesh = null; h.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      mesh.skeleton.update();
      const palm = mesh.skeleton.bones.find((b) => b.name === 'Palm').getWorldPosition(new THREE.Vector3()).toArray();
      out[seat] = { palm, act: st[seat] ? st[seat].kind : '?' };
    }
    frames.push({ f: f++, hands: out });
  } };
  props.bid(win, slot, 6); hands.bid(win, slot, 6); step(80);
  props.bid(lose, slot, 4); hands.bid(lose, slot, 4); step(80);
  props.mark(win, slot); hands.mark(win, slot); step(120);
  step(49);
  props.reveal(slot, win); hands.reveal(slot, win); step(200);
  hands.dispose();
  return frames;
}
/** 每席每段連續同一動作：事件數（Palm 二階差 >0.10）、單幀最大步（px）、可見幀數、路徑長（世界）。 */
function segments(frames) {
  const out = [];
  for (let s = 0; s < 4; s++) {
    let seg = [];
    const flush = () => { if (seg.length) out.push({ seat: s, act: seg[0].act, f0: seg[0].f, rows: seg }); seg = []; };
    for (const x of frames) {
      const h = x.hands[s];
      if (!h) { flush(); continue; }
      const last = seg[seg.length - 1];
      if (last && (x.f !== last.f + 1 || h.act !== last.act)) flush();
      seg.push({ f: x.f, act: h.act, p: h.palm, s: px(h.palm) });
    }
    flush();
  }
  for (const g of out) {
    const P = g.rows.map((r) => r.p), S = g.rows.map((r) => r.s);
    g.events = 0; g.stepPx = 0; g.path = 0;
    for (let i = 1; i < P.length; i++) { g.stepPx = Math.max(g.stepPx, Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1])); g.path += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); }
    for (let i = 1; i + 1 < P.length; i++) if (Math.hypot(P[i + 1][0] - 2 * P[i][0] + P[i - 1][0], P[i + 1][1] - 2 * P[i][1] + P[i - 1][1], P[i + 1][2] - 2 * P[i][2] + P[i - 1][2]) > 0.10) g.events++;
  }
  return out;
}
const all = [];
for (const [name, sc] of Object.entries(SCN)) for (const g of segments(await run(sc))) all.push(Object.assign(g, { scn: name }));
const sum = (act) => { const sel = all.filter((g) => g.act === act); return { events: sel.reduce((a, g) => a + g.events, 0), stepPx: Math.max(0, ...sel.map((g) => g.stepPx)), n: sel.length, detail: sel.filter((g) => g.events).map((g) => `${g.scn}/席${g.seat}@f${g.f0}:${g.events}`).join(' ') }; };

test('擺錢推（push）：四劇本二階差>0.10 的單幀彈跳 ≤4 次、單幀最大步 ≤30 px（基準 19 次／131.9 px）', () => {
  const r = sum('push');
  assert.ok(r.n >= 8, `四劇本八隻推的手都量到（實際 ${r.n} 段）`);
  assert.ok(r.events <= 4, `push 彈跳事件 ${r.events} 次 > 4（${r.detail}）`);
  assert.ok(r.stepPx <= 30, `push 單幀最大步 ${r.stepPx.toFixed(1)} px > 30`);
});

test('拍令牌（slam）：彈跳 ≤6 次、單幀最大步 ≤86.4 px（基準 13 次／86.4 px；2026-10-07 使用者簽准由 ≤3 改 ≤6）', () => {
  const r = sum('slam');
  assert.ok(r.n >= 4, `四劇本四次拍令牌都量到（實際 ${r.n} 段）`);
  assert.ok(r.events <= 6, `slam 彈跳事件 ${r.events} 次 > 6（${r.detail}）`);
  assert.ok(r.stepPx <= 86.4, `slam 單幀最大步 ${r.stepPx.toFixed(1)} px > 86.4`);
});

test('不退化護欄：勝方停一拍（hold）彈跳 ≤20、敗方扒錢（rake）≤27（＝基準；本版不宣稱修好，已知問題見 VERSION_NOTE 之外的紀錄）', () => {
  const h = sum('hold'), k = sum('rake');
  assert.ok(h.n >= 4 && k.n >= 4, `hold／rake 都量到（${h.n}／${k.n} 段）`);
  assert.ok(h.events <= 20, `hold 彈跳 ${h.events} 次 > 20（${h.detail}）`);
  assert.ok(k.events <= 27, `rake 彈跳 ${k.events} 次 > 27（${k.detail}）`);
});

test('正常平滑對照：北席停一拍與拍令牌（沒有信物、伸入界線擋路）零彈跳、單幀最大步 ≤5 px，且手真的上場、有在動', () => {
  for (const act of ['hold', 'slam']) {
    const g = all.find((x) => x.scn === 'moneyN' && x.seat === 1 && x.act === act);
    assert.ok(g && g.rows.length >= 20, `moneyN 席1 ${act} 有可見幀（${g ? g.rows.length : 0}）`);
    assert.ok(g.path > 0.05, `moneyN 席1 ${act} 手有移動（路徑 ${g.path.toFixed(3)} 世界單位）`);
    assert.equal(g.events, 0, `moneyN 席1 ${act} 零彈跳`);
    assert.ok(g.stepPx <= 5, `moneyN 席1 ${act} 單幀最大步 ${g.stepPx.toFixed(1)} px ≤5`);
  }
});
