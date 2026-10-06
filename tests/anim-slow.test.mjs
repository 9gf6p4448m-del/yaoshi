// v0.62.1 ?handslow=k／?grabslow=k（試玩調速；預設 1＝與 v0.62.0 逐位元相同）。
// 走真實鏈路：真的 js/table-props.js、js/table-hands.js、js/hand-motion.js（hand-fixture 同 table-hands.test.mjs），
// 只改最底層的「倍率來源」globalThis.YS_ANIM_SLOW（index.html 解析網址後放在 window 上的同一個物件），時間步進照 renderer 的 dt 餵。
// 鑑別力：倍率寫成沒作用（props／手不除以 k）時，下面的 2× 時序斷言必紅。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { THREE, ROOT, loadProps, loadHands, LAYOUTS } from './hand-fixture.mjs';
import { loadGame } from './tools/load.mjs';

const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands();
const setSlow = (hand, grab = 1) => { globalThis.YS_ANIM_SLOW = { hand, grab }; };

async function rig() {
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true });
  props.setLayout(...LAYOUTS.L);
  props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props); await hands.ready();
  parent.updateMatrixWorld(true);
  return { parent, props, hands };
}
const step = (r, dt) => { r.props.update(dt); r.hands.update(dt); r.parent.updateMatrixWorld(true); };
const done = (r) => { r.hands.dispose(); r.props.dispose(); };

/** 一席同一幀推 4 格：各格落定時刻與手動作結束（真實時間，秒）。 */
async function pushRun(dt, seat = 1) {
  const r = await rig(), arrive = {}; let t = 0, landed = null, handEnd = null;
  for (let k = 0; k < 4; k++) { r.props.bid(seat, k, 3 + k); r.hands.bid(seat, k, 3 + k); }
  for (let i = 0; i < 4000; i++) {
    step(r, dt); t += dt;
    for (let k = 0; k < 4; k++) { const st = r.props.stackAt(seat, k); if (st && arrive[k] === undefined && st.t >= 1) arrive[k] = t; }
    if (landed === null && Object.keys(arrive).length === 4) landed = t;
    if (landed !== null && r.hands.stats().state[seat] === null) { handEnd = t; break; }
  }
  done(r); return { arrive: [0, 1, 2, 3].map((k) => arrive[k]), handEnd };
}
/** 盯上：手從開始到收完（真實時間）。 */
async function slamRun(dt, seat = 2) {
  const r = await rig(); let t = 0, seen = false, end = null, land = null;
  r.props.mark(seat, 1); r.hands.mark(seat, 1);
  for (let i = 0; i < 4000; i++) {
    step(r, dt); t += dt;
    const tk = r.props.tokenAt(seat); if (land === null && tk && tk.t >= 1) land = t;
    const busy = r.hands.stats().state[seat] !== null; if (busy) seen = true;
    if (seen && !busy) { end = t; break; }
  }
  done(r); return { land, end };
}
/** 開標：兩席出價、落定後揭盅，敗方扒回到手收完、錢回席位（真實時間，從揭盅那一刻起算）。 */
async function rakeRun(dt, winner = 0, loser = 3, slot = 2) {
  const r = await rig(); let t = 0, end = null, gone = null;
  for (const s of [winner, loser]) { r.props.bid(s, slot, 5); r.hands.bid(s, slot, 5); }
  for (let i = 0; i < 4000 && (r.hands.stats().state.some((x) => x) || r.props.stackAt(loser, slot).t < 1); i++) step(r, dt);
  r.props.reveal(slot, winner); r.hands.reveal(slot, winner);
  for (let i = 0; i < 4000; i++) {
    step(r, dt); t += dt;
    if (gone === null && !r.props.stackAt(loser, slot)) gone = t;
    if (end === null && r.hands.stats().state[loser] === null) end = t;
    if (end !== null && gone !== null) break;
  }
  done(r); return { end, gone };
}

const DT = 1 / 120;

test('預設（沒有倍率物件／k=1）：推錢落定仍 0.70／1.16／1.62／2.08 秒（±1.5 幀）、手 ≤2.7 秒結束', async () => {
  for (const v of [undefined, { hand: 1, grab: 1 }]) {
    globalThis.YS_ANIM_SLOW = v;
    const q = await pushRun(DT);
    [0.70, 1.16, 1.62, 2.08].forEach((a, k) => assert.ok(Math.abs(q.arrive[k] - a) <= 1.5 * DT, `第 ${k + 1} 格落定 ${q.arrive[k]}（應 ${a}）`));
    assert.ok(q.handEnd <= 2.7, `手結束 ${q.handEnd}`);
  }
});

test('handslow=2：推錢四格落定 ≈2×（誤差 ≤1 個 dt）；手結束 ≈2×（≤1 dt）', async () => {
  setSlow(1); const a = await pushRun(DT);
  setSlow(2); const b = await pushRun(DT);
  for (let k = 0; k < 4; k++) assert.ok(Math.abs(b.arrive[k] - 2 * a.arrive[k]) <= DT + 1e-9, `第 ${k + 1} 格落定 k=2 ${b.arrive[k]} vs 2×${a.arrive[k]}`);
  [0.70, 1.16, 1.62, 2.08].forEach((x, k) => assert.ok(Math.abs(b.arrive[k] - 2 * x) <= 1.5 * DT + DT, `第 ${k + 1} 格 ${b.arrive[k]} 對名目 ${2 * x}`));
  assert.ok(Math.abs(b.handEnd - 2 * a.handEnd) <= DT + 1e-9, `手結束 k=2 ${b.handEnd} vs 2×${a.handEnd}`);
});

test('handslow=2：拍令牌（令牌落地、手收完）與敗方扒錢（手收完、錢回席位）總時長 ≈2×（≤1 dt）', async () => {
  /* 參照＝k=1 用細步（1/960 秒，近連續）量出的時長：同一個 dt 下 k=1 自己就有最多約 1 dt 的離散誤差（令牌在第 36 幀剛好到 1），
     拿「2×(粗步 k=1)」當參照會把那份誤差也乘 2；k=2 本身用遊戲同級的 1/120 步，誤差仍要 ≤1 dt。 */
  setSlow(1); const s1 = await slamRun(DT / 8), r1 = await rakeRun(DT / 8);
  setSlow(2); const s2 = await slamRun(DT), r2 = await rakeRun(DT);
  assert.ok(Math.abs(s2.land - 2 * s1.land) <= DT + 1e-9, `令牌落地 ${s2.land} vs 2×${s1.land}`);
  assert.ok(Math.abs(s2.end - 2 * s1.end) <= DT + 1e-9, `拍令牌手收完 ${s2.end} vs 2×${s1.end}`);
  assert.ok(Math.abs(r2.end - 2 * r1.end) <= DT + 1e-9, `扒錢手收完 ${r2.end} vs 2×${r1.end}`);
  assert.ok(Math.abs(r2.gone - 2 * r1.gone) <= DT + 1e-9, `錢回席位 ${r2.gone} vs 2×${r1.gone}`);
  assert.ok(s1.end > 0.3 && r1.end > 0.5, `活性 ${s1.end} ${r1.end}`);
});

test('handslow=2 接觸時序不變：真實時間 2t 時的錢柱、令牌與手的擺位＝k=1 時 t 的擺位（推、拍、扒全程逐幀）', async () => {
  const trace = async (k) => {
    setSlow(k); const r = await rig(), rows = [];
    const snap = () => { const p = []; for (const s of [0, 1, 2, 3]) { const h = r.hands.group.children[s]; p.push(h.visible ? [...h.position.toArray(), h.rotation.x, h.rotation.y] : null); for (let q = 0; q < 4; q++) { const st = r.props.stackAt(s, q); p.push(st ? [st.x, st.z, st.t] : null); } const tk = r.props.tokenAt(s); p.push(tk ? [tk.t] : null); } rows.push(p); };
    const run = (n) => { for (let i = 0; i < n; i++) { step(r, DT * k); snap(); } }; // 真實 dt＝k/120 ⇒ 被放慢後的 dt 正好 1/120
    r.props.bid(1, 0, 4); r.hands.bid(1, 0, 4); r.props.bid(1, 2, 6); r.hands.bid(1, 2, 6); r.props.bid(3, 2, 3); r.hands.bid(3, 2, 3); run(260);
    r.props.mark(0, 1); r.hands.mark(0, 1); run(120);
    r.props.reveal(2, 1); r.hands.reveal(2, 1); run(160);
    done(r); return rows;
  };
  const a = await trace(1), b = await trace(2);
  let live = 0, maxd = 0;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) {
    const x = a[i][j], y = b[i][j];
    assert.equal(x === null, y === null, `第 ${i} 幀 欄 ${j}：可見／存在不一致`);
    if (x) { live++; for (let c = 0; c < x.length; c++) maxd = Math.max(maxd, Math.abs(x[c] - y[c])); }
  }
  assert.ok(live > 1000, `活性 ${live}`);
  assert.ok(maxd < 1e-6, `相對時間對齊後最大差 ${maxd}`);
});

test('handslow=2：handObstaclesAhead 的外推以「被放慢後的時間」算（真實 ahead 2a ＝ k=1 的 a），詛咒推按規劃看得到同一批錢', async () => {
  const at = async (k, ahead) => {
    setSlow(k); const r = await rig();
    for (const s of [0, 3]) { r.props.bid(s, 2, 5); r.hands.bid(s, 2, 5); }
    for (let i = 0; i < 200; i++) step(r, DT * k);
    r.props.reveal(2, 0); r.hands.reveal(2, 0); step(r, DT * k);
    const o = r.props.handObstaclesAhead(ahead); done(r); return o;
  };
  for (const a of [0.1, 0.3, 0.5]) {
    const x = await at(1, a), y = await at(2, 2 * a);
    assert.equal(x.length, y.length);
    x.forEach((o, i) => assert.ok(Math.abs(o.x - y[i].x) + Math.abs(o.z - y[i].z) < 1e-9, `ahead ${a}: ${JSON.stringify([o, y[i]])}`));
  }
  const s0 = await at(1, 0), s1 = await at(1, 0.4); assert.notDeepEqual(s0.map((o) => o.x), s1.map((o) => o.x), '活性：外推確實會動');
});

test('index.html 單一解析點 animSlowFrom：合法值照用、非法（NaN、≤0、>10、空字串）一律 1', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const fn = html.match(/^function animSlowFrom\(search\)\{.*\}$/m); // 單行函式
  assert.ok(fn, 'index.html 有 animSlowFrom');
  const animSlowFrom = new Function('URLSearchParams', fn[0] + ';return animSlowFrom;')(URLSearchParams);
  assert.deepEqual(animSlowFrom(''), { hand: 1, grab: 1 });
  assert.deepEqual(animSlowFrom('?handslow=2&grabslow=1.5'), { hand: 2, grab: 1.5 });
  assert.deepEqual(animSlowFrom('?handslow=10'), { hand: 10, grab: 1 });
  for (const bad of ['0', '-1', 'abc', '99', '10.01', '', 'NaN', 'Infinity']) assert.deepEqual(animSlowFrom('?handslow=' + bad + '&grabslow=' + bad), { hand: 1, grab: 1 }, bad);
  assert.ok(loadGame(path.join(ROOT, "index.html")), "node 載入（無 location）不丟例外");
});
