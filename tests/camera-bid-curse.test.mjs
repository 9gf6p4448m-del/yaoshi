// 運鏡乙（v0.65.1）：中咒鏡頭＋喊價鏡頭的決定性單元測試。
// 驗收：docs/experiments/2026-10-08-camera-bid-curse/acceptance.md §1–§4、§6（時序／旗標／不變量／reduced-motion）。
//
// 量法：把 js/camera-director.js 放進 vm（同 tests/tier1-push.test.mjs），固定 dt＝1/60、合成時鐘，
// 對同一份「腳本事件序列」逐幀記 camera.position／quaternion／fov。**不讀導演內部狀態**——
// 推近量一律從相機姿態量（p(t)＝1 − |position − 錨點| / 事件前距離），所以放到 v0.65.0（5c91bdc7）樹上跑時，
// 紅的是行為斷言（「事件到了相機有沒有動」），不是缺函式的例外（驗收 §8）。
// 基準導演（v0.65.0）由 `git show 5c91bdc7:js/camera-director.js` 取得，只在 §2 軌跡等價那幾條用。
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../tools/anyCreature/package.json', import.meta.url));
const THREE = require('three');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE_SHA = '5c91bdc7';
const strip = (src) => src.replace("import * as THREE from 'three';", '').replace('export function', 'function');
const DIRECTOR_RAW = fs.readFileSync(new URL('../js/camera-director.js', import.meta.url), 'utf8');
const NEW_SRC = strip(DIRECTOR_RAW);
const INDEX = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let BASE_SRC_CACHE = null;
const baseSrc = () => (BASE_SRC_CACHE ??= strip(execFileSync('git', ['show', `${BASE_SHA}:js/camera-director.js`], { cwd: ROOT, encoding: 'utf8' })));

const DT = 1 / 60, MS = 1000 / 60;
const DEG = Math.PI / 180;
const FOV = 50;
// 世界座標的席位（scene-env.js SEAT_POS：0 南 +Z、1 北 −Z、2 西 −X、3 東 +X，半徑 LANTERN_DIST 2.6）
const SEAT = [[0, 0, 2.6], [0, 0, -2.6], [-2.6, 0, 0], [2.6, 0, 0]];
const ANCHOR_TABLE = [0, 0, 0];
const ANCHOR_SLOT1 = [-0.45, 0, 0.55]; // camera-director onRevealSlot 的 anchorX[1]／anchorZ（reveal-table.test 釘住）
const FOCUS_FLOOR = 1.4;
const CURSE_MS = 2000; // index.html CFG.CURSE_MS（grab-motion.test 釘住）；這裡只當事件 detail 餵進去

/** 跑一支導演：回傳逐幀姿態。script＝[['fire', name, detail] | ['step', n] | ['mark', key]] */
function run(src, script, { reduced = false } = {}) {
  let now = 1000;
  const listeners = new Map();
  const env = {
    THREE, performance: { now: () => now },
    window: { matchMedia: () => ({ matches: reduced }) },
    document: { addEventListener: (n, f) => { if (!listeners.has(n)) listeners.set(n, []); listeners.get(n).push(f); } },
  };
  vm.createContext(env);
  vm.runInContext(src, env);
  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 100);
  // scene-env.js 的牌桌初始機位（dist 3.6、tilt 35°、看 (0,0.1,0)）＝導演的 SHOTS.table
  const tilt = 35 * DEG;
  camera.position.set(0, Math.sin(tilt) * 3.6, Math.cos(tilt) * 3.6);
  camera.lookAt(0, 0.1, 0);
  const director = env.createCameraDirector(camera, [{}, {}, {}, {}]);
  const frames = [];
  const marks = {};
  const rec = () => frames.push({ t: now, p: camera.position.toArray(), q: camera.quaternion.toArray(), fov: camera.fov });
  rec();
  for (const op of script) {
    if (op[0] === 'fire') for (const f of listeners.get(op[1]) || []) f({ detail: op[2] });
    else if (op[0] === 'step') for (let i = 0; i < op[1]; i++) { now += MS; director.update(DT, now); rec(); }
    else if (op[0] === 'mark') marks[op[1]] = frames.length - 1; // 這一格＝目前最後一幀（事件前那一幀）
  }
  return { frames, marks };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const diffFrame = (a, b) => Math.max(...a.p.map((x, i) => Math.abs(x - b.p[i])), ...a.q.map((x, i) => Math.abs(x - b.q[i])), Math.abs(a.fov - b.fov));
const maxDiff = (A, B, from = 0, to = Math.min(A.length, B.length)) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, diffFrame(A[i], B[i])); return m; };
const fwd = (f) => new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(...f.q));
/** 相機視線與「相機→某席」的夾角（度） */
/** 視線在桌面（y＝TABLE_Y）上的落點：「鏡頭看著桌上哪裡」。席位方向判定用它——相機很貼近時 3D 夾角會被視差帶偏（受咒者在相機背後的南家）。 */
const TABLE_Y = 0.1;
const lookPt = (f) => { const d = fwd(f), k = (TABLE_Y - f.p[1]) / d.y; return [f.p[0] + d.x * k, TABLE_Y, f.p[2] + d.z * k]; };
/** 視線落點從 a 幀移到 b 幀，往哪一席移最多：回傳 {best, dots, shift}（dots＝位移在四席水平方向上的投影） */
function towards(a, b) {
  const v = sub(lookPt(b), lookPt(a));
  const dots = SEAT.map((s) => (v[0] * s[0] + v[2] * s[2]) / 2.6);
  return { best: dots.indexOf(Math.max(...dots)), dots, shift: Math.hypot(v[0], v[2]) };
}
/** 推近是純徑向（只縮 dist）：事件前那一幀之後，每一幀相對事件前的位移都落在同一條直線上（與錨點的精確值無關），
 *  而那條線指向錨點（名目錨點誤差內）。yaw／tilt／平移任何一個被動到，位移就會離開這條線。 */
function assertRadial(frames, from, anchor, what) {
  const p0 = frames[from].p;
  let ref = null, refL = 0;
  for (let i = from + 1; i < frames.length; i++) { const d = sub(frames[i].p, p0), l = len(d); if (l > refL) { refL = l; ref = d; } }
  assert.ok(refL > 1e-3, `${what}：要有位移才量得到徑向`);
  const u = ref.map((x) => x / refL);
  for (let i = from + 1; i < frames.length; i++) {
    const d = sub(frames[i].p, p0);
    const c = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    assert.ok(len(c) <= 1e-9, `${what}：第 ${i} 幀離開徑向直線 ${len(c)}（yaw／tilt／平移被動到）`);
    assert.equal(frames[i].fov, FOV, `${what}：fov 恆 50`);
  }
  const toA = sub(anchor, p0), la = len(toA);
  const cosA = (u[0] * toA[0] + u[1] * toA[1] + u[2] * toA[2]) / la;
  assert.ok(Math.abs(Math.abs(cosA) - 1) < 1e-6, `${what}：位移方向沒有指向錨點（cos ${cosA}）`);
}
/** 推近比例：1 − |position − 錨點| / d0 */
const pushOf = (frames, anchor, d0) => frames.map((f) => 1 - len(sub(f.p, anchor)) / d0);

const SETTLE = [['step', 30]];
const AT_SLOT1 = [['fire', 'ys:reveal-slot', { slot: 1, ms: 650 }], ['step', 60]];
const curseDetail = (extra = {}) => ({ winner: 2, slot: 1, transferTarget: 3, destroy: false, grabMs: 1260, curseMs: CURSE_MS, skip: false, ...extra });
const countdown = (seat, from, to, stepMs = 100) => {
  const out = [];
  for (let r = from; r >= to; r -= stepMs) out.push(['fire', 'ys:bid-clock', { seat, remainMs: r }], ['step', Math.round(stepMs / MS)]);
  return out;
};

// ───────────────────────── §6.2 喊價鏡頭 ─────────────────────────
test('§6.2 出價微推喊價者：有觸發、朝喊價者、純徑向推近（|position|＝dist）、fov 恆 50、回位 ≤1e-9', () => {
  const script = [...SETTLE, ['mark', 'pre'], ['fire', 'ys:bid', { seat: 2, slot: 1, amount: 5 }], ['step', 150]];
  const { frames, marks } = run(NEW_SRC, script);
  const pre = frames[marks.pre];
  const d0 = len(sub(pre.p, ANCHOR_TABLE));
  const p = pushOf(frames, ANCHOR_TABLE, d0);
  const pk = Math.max(...p.slice(marks.pre));
  const pkAt = p.indexOf(pk, marks.pre);
  assert.ok(pk > 1e-3, `出價後相機要推近（最大推近比例 ${pk}）`);
  const tw = towards(pre, frames[pkAt]);
  assert.equal(tw.best, 2, `視線落點要往喊價者（西家）移（四席投影 ${tw.dots.map((x) => x.toFixed(4))}）`);
  assert.ok(tw.shift > 0.01, '視線落點移動量太小');
  assertRadial(frames, marks.pre, ANCHOR_TABLE, '出價');
  const u0 = sub(pre.p, ANCHOR_TABLE).map((x) => x / d0);
  for (let i = marks.pre; i < frames.length; i++) {
    const v = sub(frames[i].p, ANCHOR_TABLE), l = len(v);
    assert.ok(Math.max(...v.map((x, k) => Math.abs(x / l - u0[k]))) <= 1e-9, `第 ${i} 幀推近不是純徑向（yaw／tilt 被動到或另開了位移）`);
    assert.equal(frames[i].fov, FOV, 'fov 恆 50');
  }
  assert.ok(diffFrame(frames.at(-1), pre) <= 1e-9, `回位後要回到事件前姿態（差 ${diffFrame(frames.at(-1), pre)}）`);
  assert.ok(p.at(-1) === 0 || Math.abs(p.at(-1)) <= 1e-12);
});

test('§6.2 最後 3 秒隨倒數收緊：>3 秒只有微推、最後 3 秒單調不減、最後一刻最大、歸零後回位、缺 remainMs 即 throw', () => {
  const script = [...SETTLE, ['mark', 'pre'], ['fire', 'ys:bid', { seat: 1, slot: 0, amount: 3 }], ['step', 12],
    ['mark', 'clock0'], ...countdown(1, 5000, 3100), ['mark', 'last3'], ...countdown(1, 3000, 100), ['mark', 'zero'],
    ['fire', 'ys:bid-clock', { seat: 1, remainMs: 0 }], ['step', 120]];
  const { frames, marks } = run(NEW_SRC, script);
  const pre = frames[marks.pre];
  const d0 = len(sub(pre.p, ANCHOR_TABLE));
  const p = pushOf(frames, ANCHOR_TABLE, d0);
  const plateau = p.slice(marks.clock0 + 1, marks.last3 + 1);
  const finalP = p[marks.zero];
  assert.ok(finalP > Math.max(...plateau) + 1e-4, `最後 3 秒必須收緊（倒數末 ${finalP} vs 平台 ${Math.max(...plateau)}）`);
  assert.ok(Math.max(...plateau) > 1e-3, '剩 >3 秒時仍要有微推');
  assert.ok(Math.max(...plateau) - Math.min(...plateau) <= 1e-12, '剩 >3 秒時 K 只含微推常數（不得提前收緊）');
  for (let i = marks.last3 + 1; i <= marks.zero; i++) assert.ok(p[i] >= p[i - 1] - 1e-12, `最後 3 秒第 ${i} 幀 K 反向（${p[i - 1]}→${p[i]}）`);
  const lastSecond = p.slice(marks.zero - 60, marks.zero + 1);
  assert.equal(Math.max(...lastSecond), Math.max(...p), '最後一秒 K 最大');
  const kmax = Math.max(...p);
  for (let i = marks.pre + 1; i < frames.length; i++) assert.ok(Math.abs(p[i] - p[i - 1]) / kmax <= 0.15, `第 ${i} 幀 |ΔK|>0.15`);
  assert.ok(diffFrame(frames.at(-1), pre) <= 1e-9, `倒數歸零後要回位（差 ${diffFrame(frames.at(-1), pre)}）`);
  assert.throws(() => run(NEW_SRC, [...SETTLE, ['fire', 'ys:bid-clock', { seat: 1 }], ['step', 2]]), /remainMs/, 'ys:bid-clock 缺 remainMs 要 throw');
});

test('§6.2 喊價者切換時從當前 K 接續：相鄰幀 |ΔK| ≤ 0.15、視線不瞬移、改看新喊價者', () => {
  const full = run(NEW_SRC, [...SETTLE, ['mark', 'pre'], ...countdown(1, 3000, 100), ['mark', 'z'], ['step', 1]]);
  const d0 = len(sub(full.frames[full.marks.pre].p, ANCHOR_TABLE));
  const kmax = Math.max(...pushOf(full.frames, ANCHOR_TABLE, d0)); // K＝1 時的推近比例（倒數最後一刻）
  const script = [...SETTLE, ['mark', 'pre'], ['fire', 'ys:bid', { seat: 1, slot: 0, amount: 4 }], ['step', 30], ['mark', 'sw'],
    ['fire', 'ys:bid', { seat: 3, slot: 2, amount: 6 }], ['step', 40], ['mark', 'after'], ['step', 120]];
  const { frames, marks } = run(NEW_SRC, script);
  const K = pushOf(frames, ANCHOR_TABLE, d0).map((x) => x / kmax);
  assert.ok(K[marks.sw] > 0.1, `切換前要已在推（K=${K[marks.sw]}）`);
  assert.equal(towards(frames[marks.sw], frames[marks.after]).best, 3, '切換後視線落點往新喊價者（東家）移');
  for (let i = marks.pre + 1; i < frames.length; i++) {
    assert.ok(Math.abs(K[i] - K[i - 1]) <= 0.15, `第 ${i} 幀 |ΔK|=${Math.abs(K[i] - K[i - 1])} > 0.15`);
    assert.ok(fwd(frames[i]).angleTo(fwd(frames[i - 1])) / DEG <= 1.5, `第 ${i} 幀視線單幀轉 >1.5°（瞬移）`);
  }
  assert.ok(K[marks.sw + 1] >= K[marks.sw] - 1e-12, '切換當幀不得掉回 0（從當前 K 接續）');
  assert.ok(diffFrame(frames.at(-1), frames[marks.pre]) <= 1e-9, '最後回位');
});

// ───────────────────────── §6.1 中咒鏡頭 ─────────────────────────
test('§6.1 中咒：朝受咒者推近、到位 ∈[0.6,1.0]s、推近段不減／回位段不增、純徑向、回位 ≤1e-9', () => {
  const script = [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ['fire', 'ys:reveal-result', curseDetail()], ['step', 200]];
  const { frames, marks } = run(NEW_SRC, script);
  const pre = frames[marks.pre];
  const d0 = len(sub(pre.p, ANCHOR_SLOT1));
  assert.ok(Math.abs(d0 - 1.65) < 1e-3, `前置：逐槽微距 dist 1.65（量到 ${d0}）`);
  const p = pushOf(frames, ANCHOR_SLOT1, d0);
  const pk = Math.max(...p);
  assert.ok(pk > 1e-3, `中咒後相機要推近（最大推近比例 ${pk}）`);
  const peakAt = p.findIndex((x, i) => i > marks.pre && x >= pk - 1e-12);
  const peakMs = frames[peakAt].t - frames[marks.pre].t;
  assert.ok(peakMs >= 600 && peakMs <= 1000, `到位時間 ${peakMs}ms 不在 [600,1000]`);
  for (let i = marks.pre + 1; i <= peakAt; i++) assert.ok(p[i] >= p[i - 1] - 1e-12, `推近段第 ${i} 幀 K 減少`);
  const holdEnd = p.findIndex((x, i) => i > peakAt && x < pk - 1e-12);
  assert.ok(holdEnd > peakAt, '要有回位段');
  for (let i = holdEnd; i < frames.length; i++) assert.ok(p[i] <= p[i - 1] + 1e-12, `回位段第 ${i} 幀 K 增加`);
  const tw = towards(pre, frames[peakAt]);
  assert.equal(tw.best, 3, `視線落點要往受咒者（東家，transferTarget）移，不是得標施放者（西家）（四席投影 ${tw.dots.map((x) => x.toFixed(4))}）`);
  assert.ok(tw.dots[2] < 0, '視線落點不得往施放者（西家）那側移');
  assert.ok(len(sub(frames[peakAt].p, ANCHOR_SLOT1)) >= FOCUS_FLOOR, '不得低於 FOCUS_FLOOR');
  assertRadial(frames, marks.pre, ANCHOR_SLOT1, '中咒');
  assert.ok(diffFrame(frames.at(-1), pre) <= 1e-9, `結束後回到事件前姿態（差 ${diffFrame(frames.at(-1), pre)}）`);
});

test('§6.1 中咒：四個受咒席都朝對的那一席；非毒標／跳過／curseMs=0 不動；缺 curseMs 即 throw', () => {
  const base = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ['step', 60]]);
  for (const victim of [0, 1, 2, 3]) {
    const winner = (victim + 1) % 4;
    const { frames, marks } = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ['fire', 'ys:reveal-result', curseDetail({ winner, transferTarget: victim })], ['step', 60]]);
    assert.ok(maxDiff(frames, base.frames) > 1e-3, `受咒席 ${victim}：要有推近`);
    const tw = towards(frames[marks.pre], frames.at(-1));
    assert.equal(tw.best, victim, `受咒席 ${victim}（施放者 ${winner}）：視線落點要往它移（四席投影 ${tw.dots.map((x) => x.toFixed(4))}）`);
    assert.ok(tw.shift > 0.01, `受咒席 ${victim}：視線落點移動量太小`);
  }
  for (const [why, d] of [['一般得標', { transferTarget: null }], ['銷毀', { transferTarget: null, destroy: true }], ['跳過中', { skip: true }], ['?grab=0（curseMs 0）', { curseMs: 0 }]]) {
    const { frames } = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ['fire', 'ys:reveal-result', curseDetail(d)], ['step', 60]]);
    assert.equal(maxDiff(frames, base.frames), 0, `${why}：鏡頭不得動`);
  }
  assert.throws(() => run(NEW_SRC, [...SETTLE, ['fire', 'ys:reveal-result', curseDetail({ curseMs: undefined })], ['step', 2]]), /curseMs/, '缺 curseMs 要 throw');
});

test('§6.1／§6.2 取消／結束事件收得掉新鏡頭（ys:duel-end／ys:table／ys:end／ys:fx-trait-cancel）', () => {
  for (const ev of ['ys:duel-end', 'ys:table', 'ys:end', 'ys:fx-trait-cancel']) {
    for (const [name, trig] of [['中咒', [['fire', 'ys:reveal-result', curseDetail()], ['step', 60]]],
      ['喊價倒數', [['fire', 'ys:bid', { seat: 2, slot: 1, amount: 5 }], ['step', 6], ...countdown(2, 1500, 600)]]]) {
      const trigSteps = trig.filter((o) => o[0] === 'step').reduce((s, o) => s + o[1], 0);
      const main = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ...trig, ['mark', 'cancel'], ['fire', ev, {}], ['step', 90]]);
      const twin = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['step', trigSteps], ['fire', ev, {}], ['step', 90]]);
      const c = main.marks.cancel;
      assert.ok(diffFrame(main.frames[c], twin.frames[c]) > 1e-3, `${name}×${ev}：取消前新鏡頭要在作用中`);
      assert.ok(diffFrame(main.frames.at(-1), twin.frames.at(-1)) <= 1e-9, `${name}×${ev}：1.5 秒後仍卡在推近（差 ${diffFrame(main.frames.at(-1), twin.frames.at(-1))}）`);
    }
  }
});

// ───────────────────────── §6.3 疊加 ─────────────────────────
test('§6.3 中咒發生在喊價鏡頭進行中：推近取最大不相加、不低於 FOCUS_FLOOR、仍是純徑向', () => {
  const bidPart = [['fire', 'ys:bid', { seat: 1, slot: 1, amount: 5 }], ['step', 6], ...countdown(1, 600, 600), ['step', 30]];
  const hold = [];
  for (let i = 0; i < 24; i++) hold.push(['fire', 'ys:bid-clock', { seat: 1, remainMs: 300 }], ['step', 6]);
  const both = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ...bidPart, ['fire', 'ys:reveal-result', curseDetail()], ...hold]);
  const bidOnly = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ...bidPart, ...hold]);
  const curseOnly = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['mark', 'pre'], ['step', 42], ['fire', 'ys:reveal-result', curseDetail()], ...hold.filter((o) => o[0] === 'step')]);
  const d0 = len(sub(both.frames[both.marks.pre].p, ANCHOR_SLOT1));
  const pb = pushOf(both.frames, ANCHOR_SLOT1, d0);
  const p1 = pushOf(bidOnly.frames, ANCHOR_SLOT1, d0);
  const p2 = pushOf(curseOnly.frames, ANCHOR_SLOT1, d0);
  assert.ok(Math.max(...p1) > 1e-3 && Math.max(...p2) > 1e-3, '兩支單獨鏡頭都要有推近');
  assert.ok(Math.max(...pb) > Math.max(...p1) + 1e-4, '疊上中咒之後要比單獨喊價更近（中咒較大那一層生效）');
  assert.ok(Math.max(...pb) <= Math.max(Math.max(...p1), Math.max(...p2)) + 1e-9, `取最大不相加：疊加 ${Math.max(...pb)} > max(${Math.max(...p1)}, ${Math.max(...p2)})`);
  for (const f of both.frames.slice(both.marks.pre)) {
    const l = len(sub(f.p, ANCHOR_SLOT1));
    assert.ok(l >= FOCUS_FLOOR - 1e-3, `dist ${l} 低於 FOCUS_FLOOR`);
  }
  assertRadial(both.frames, both.marks.pre, ANCHOR_SLOT1, '疊加');
});

// ───────────────────────── §2b 旗標／§4 reduced-motion ─────────────────────────
const FLAG_CASES = [
  ['喊價（ys:bid）', (cam) => [['fire', 'ys:bid', { seat: 2, slot: 1, amount: 5, ...cam }], ['step', 90]]],
  ['倒數（ys:bid-clock）', (cam) => [...countdown(2, 2000, 200).map((o) => (o[0] === 'fire' ? ['fire', o[1], { ...o[2], ...cam }] : o)), ['step', 60]]],
  ['中咒（ys:reveal-result）', (cam) => [['fire', 'ys:reveal-result', curseDetail(cam)], ['step', 180]]],
];
test('§2b 旗標：detail.cam=false 時全程不動（三個接收端）；省略欄位＝開；true＝開', () => {
  for (const [name, mk] of FLAG_CASES) {
    const steps = mk({}).filter((o) => o[0] === 'step').reduce((s, o) => s + o[1], 0);
    const twin = run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['step', steps]]).frames;
    assert.ok(maxDiff(run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ...mk({})]).frames, twin) > 1e-3, `${name}：省略 cam 欄位＝開`);
    assert.ok(maxDiff(run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ...mk({ cam: true })]).frames, twin) > 1e-3, `${name}：cam:true＝開`);
    assert.equal(maxDiff(run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ...mk({ cam: false })]).frames, twin), 0, `${name}：cam:false 全程 K＝0`);
  }
});

for (const [name, mk] of FLAG_CASES) {
  test(`§4 reduced-motion（${name} 接收端）：reduce＝不動、no-preference＝會動（雙向）`, () => {
    const steps = mk({}).filter((o) => o[0] === 'step').reduce((s, o) => s + o[1], 0);
    const twin = (reduced) => run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ['step', steps]], { reduced }).frames;
    assert.ok(maxDiff(run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ...mk({})], { reduced: false }).frames, twin(false)) > 1e-3, `${name}：no-preference 要會動`);
    assert.equal(maxDiff(run(NEW_SRC, [...SETTLE, ...AT_SLOT1, ...mk({})], { reduced: true }).frames, twin(true)), 0, `${name}：reduce 時與無事件基線逐幀相同`);
  });
}

// ───────────────────────── §2a／§2c 軌跡等價（8 格矩陣）─────────────────────────
/** 一局的鏡頭事件腳本：detail 依 index.html 的派發規則由三個旗標導出
 *  （pwTraitFx：tier＝fxtier?tier:2、cinema＝closeup、shortPush＝tier1&&closeup；fx-focus 只在 closeup；cam＝pwCam()）。 */
function gameScript({ cam, closeup, fxtier }) {
  const c = { cam };
  const tier = (t) => (fxtier ? t : 2);
  const trait = (side, t) => ({ side, ms: { 1: 300, 2: 900, 3: 1400 }[tier(t)], tier: tier(t), cinema: closeup, shortPush: tier(t) === 1 && closeup, power: 1 });
  const s = [...SETTLE, ['mark', 'bid0']];
  for (const seat of [0, 1, 2, 3]) s.push(['fire', 'ys:bid', { seat, slot: seat % 3, amount: 2 + seat, ...c }], ['step', 20]);
  s.push(['fire', 'ys:bid', { seat: 0, slot: 1, amount: 0, ...c }], ['step', 5]); // amount 0 收回
  for (let r = 4000; r >= 0; r -= 100) s.push(['fire', 'ys:bid-clock', { seat: 0, remainMs: r, ...c }], ['step', 6]);
  s.push(['step', 60], ['mark', 'reveal0']);
  s.push(['fire', 'ys:reveal', { winner: 2 }], ['step', 40]);
  s.push(['fire', 'ys:reveal-slot', { slot: 0, ms: 650 }], ['step', 50]);
  s.push(['fire', 'ys:reveal-result', { winner: 2, slot: 0, transferTarget: null, destroy: false, grabMs: 1260, curseMs: CURSE_MS, skip: false, ...c }], ['step', 80]);
  s.push(['fire', 'ys:reveal-slot', { slot: 1, ms: 650 }], ['step', 50]);
  s.push(['fire', 'ys:reveal-result', { ...curseDetail(), ...c }], ['step', 200]);
  s.push(['fire', 'ys:reveal-card', { winner: 2 }], ['step', 80], ['mark', 'duel0']);
  s.push(['fire', 'ys:duel', { a: 0, b: 3 }], ['step', 160]);
  s.push(['fire', 'ys:fx-trait', trait('A', 1)], ['step', 30]);
  s.push(['fire', 'ys:fx-trait', trait('B', 2)], ['step', 70]);
  if (closeup) s.push(['fire', 'ys:fx-focus', { side: 'A', actor: 0, foeSide: 'B', target: 0, ms: 650 }], ['step', 50]);
  s.push(['fire', 'ys:fx-trait', trait('A', 3)], ['step', 100]);
  s.push(['fire', 'ys:fx-punch', { power: 1 }], ['step', 30]);
  s.push(['fire', 'ys:fx-burn', { side: 'B', unit: 0 }], ['step', 40]);
  s.push(['fire', 'ys:fx-trait-cancel', {}], ['step', 10]);
  s.push(['fire', 'ys:duel-end', {}], ['step', 90], ['mark', 'tail0']);
  // 喊價鏡頭進行中直接收場（ys:end）
  s.push(['fire', 'ys:bid', { seat: 3, slot: 2, amount: 4, ...c }], ['step', 10]);
  for (let r = 2000; r >= 1000; r -= 100) s.push(['fire', 'ys:bid-clock', { seat: 3, remainMs: r, ...c }], ['step', 6]);
  s.push(['fire', 'ys:end', {}], ['step', 120]);
  return s;
}

test('§2a／§2c ?cam=0 × closeup × fxtier（8 格）：cam=0 與 v0.65.0 逐幀等價 ≤1e-9；預設時新鏡頭照常觸發、且不影響其他時段', () => {
  const B = baseSrc();
  for (const closeup of [false, true]) for (const fxtier of [false, true]) {
    const tag = `closeup=${+closeup} fxtier=${+fxtier}`;
    const on = run(NEW_SRC, gameScript({ cam: true, closeup, fxtier }));
    const base = run(B, gameScript({ cam: true, closeup, fxtier }));
    const off = run(NEW_SRC, gameScript({ cam: false, closeup, fxtier }));
    const baseOff = run(B, gameScript({ cam: false, closeup, fxtier }));
    // 預設（cam 開）：喊價段與中咒段要觸發（不得被 closeup／fxtier 誤關）
    assert.ok(maxDiff(on.frames, base.frames, on.marks.bid0, on.marks.reveal0) > 1e-3, `${tag}：預設時喊價鏡頭要觸發`);
    assert.ok(maxDiff(on.frames, base.frames, on.marks.reveal0, on.marks.duel0) > 1e-3, `${tag}：預設時中咒鏡頭要觸發`);
    // 不得誤開：對決段（喊價／中咒都已回位）與 v0.65.0 逐幀相同
    const duelD = maxDiff(on.frames, base.frames, on.marks.duel0, on.marks.tail0 + 1);
    assert.ok(duelD <= 1e-9, `${tag}：對決段不得受新鏡頭影響（差 ${duelD}）`);
    assert.ok(maxDiff(on.frames, base.frames, on.marks.tail0 + 1) > 1e-3, `${tag}：收場前那一段喊價要觸發`);
    assert.ok(diffFrame(on.frames.at(-1), base.frames.at(-1)) <= 1e-9, `${tag}：ys:end 之後回到與 v0.65.0 相同的局末機位`);
    // cam=0：整段與 v0.65.0 逐幀等價（position／quaternion／fov）
    const d = maxDiff(off.frames, baseOff.frames);
    assert.ok(d <= 1e-9, `${tag} cam=0：與 v0.65.0 軌跡差 ${d} > 1e-9`);
    for (const f of [...on.frames, ...off.frames]) assert.equal(f.fov, FOV);
  }
});

// ───────────────────────── index.html：?cam 解析與事件發送端 ─────────────────────────
const flagBlock = INDEX.slice(INDEX.indexOf('/* ?closeup=0 關掉整卷近景切鏡'), INDEX.indexOf('/* ?fxvocab=1 打開'));
const pwFxLiteral = INDEX.slice(INDEX.indexOf('const PW_FX={'), INDEX.indexOf('\n};', INDEX.indexOf('const PW_FX={')) + 3);
function pageFlags(search) {
  const ctx = { location: { search }, URLSearchParams };
  vm.createContext(ctx);
  vm.runInContext(pwFxLiteral.replace('const PW_FX=', 'var PW_FX=') + '\n' + flagBlock, ctx);
  return ctx.PW_FX;
}
const fnSrc = (head, end) => { const a = INDEX.indexOf(head); assert.ok(a >= 0, '找不到 ' + head); return INDEX.slice(a, INDEX.indexOf(end, a)); };

test('§2 index.html：?cam 由頁面解析，與 ?closeup／?fxtier 互不牽動；pushBid3d／revealGlow 經 detail.cam 帶給鏡頭', () => {
  const cases = [['', true], ['?cam=0', false], ['?cam=1', true], ['?closeup=0', true], ['?fxtier=0', true],
    ['?closeup=0&fxtier=0', true], ['?cam=0&closeup=0', false], ['?cam=0&fxtier=0', false], ['?cam=0&closeup=0&fxtier=0', false], ['?cam=x', true]];
  for (const [q, want] of cases) {
    const F = pageFlags(q);
    assert.equal(F.CAM_ON, want, `${q || '(無參數)'} → CAM_ON 應為 ${want}`);
    assert.equal(F.CLOSEUP_ON, !/closeup=0/.test(q), `${q}：closeup 不受 cam 影響`);
    assert.equal(F.TIER_ON, !/fxtier=0/.test(q), `${q}：fxtier 不受 cam 影響`);
  }
  // 發送端：真的跑 index.html 的 pushBid3d／revealGlow（vm），看派出去的 detail
  for (const [q, want] of [['', true], ['?cam=0', false], ['?closeup=0&fxtier=0', true]]) {
    const sent = [];
    const ctx = { location: { search: q }, URLSearchParams, TABLE3D: true, fx3d: (n, d) => sent.push([n, d]),
      SKIP: false, CFG: { GRAB_ON: true, GRAB_MS: 1260, CURSE_MS: CURSE_MS }, document: { getElementById: () => null }, $: () => null };
    vm.createContext(ctx);
    const pwCamSrc = INDEX.includes('function pwCam(') ? fnSrc('function pwCam(', '\n') : '';
    vm.runInContext(pwFxLiteral.replace('const PW_FX=', 'var PW_FX=') + '\n' + flagBlock + '\n' + pwCamSrc + '\n'
      + fnSrc('function pushBid3d(', '\n') + '\n' + fnSrc('function revealGlow(r){', '/* 盯上落印'), ctx);
    const it = { curse: true };
    ctx.S = { market: [{}, it] };
    ctx.pushBid3d(2, 1, 5);
    ctx.revealGlow({ winner: { p: { id: 2 }, intent: 'poison', target: 3 }, it, entries: [], poisonBlocked: false });
    const bid = sent.find((x) => x[0] === 'ys:bid'), res = sent.find((x) => x[0] === 'ys:reveal-result');
    assert.equal(bid[1].cam, want, `${q || '(無參數)'}：ys:bid.detail.cam`);
    assert.equal(res[1].cam, want, `${q || '(無參數)'}：ys:reveal-result.detail.cam`);
    assert.equal(res[1].transferTarget, 3, '前置：毒標受害席有帶到');
  }
});

// ───────────────────────── §1／§2／§3 原始碼守門（absence guards）─────────────────────────
/** 只留程式碼：去掉註解與字串字面值（錯誤訊息裡提到 PW_FX／CFG 是在說明時長來源，不是讀取） */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
test('§1／§2 camera-director.js 不抽亂數、不讀 PW_FX／CFG／location（去註解後 grep）', () => {
  const c = code(DIRECTOR_RAW);
  assert.doesNotMatch(c, /S\.rng|rngUi|Math\.random/, '鏡頭程式不得碰 S.rng／S.rngUi／Math.random');
  assert.doesNotMatch(c, /PW_FX|\bCFG\b|location\.search|location\b/, '旗標只能經事件 detail 帶入');
  assert.doesNotMatch(c, /\.fov\s*=|updateProjectionMatrix/, '鏡頭不得改 fov（推近只走 dist）');
});

test('§1／§3 對 5c91bdc7 的差異：index.html 新增行不抽亂數；不改 fov、逐槽微距 dist 1.65／tilt 22', () => {
  const diff = execFileSync('git', ['diff', BASE_SHA, '--', 'index.html', 'js/camera-director.js', 'js/scene-env.js'], { cwd: ROOT, encoding: 'utf8' });
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const removed = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  for (const l of added) assert.doesNotMatch(code(l.slice(1)), /S\.rng|rngUi|Math\.random/, '新增行抽了亂數：' + l);
  for (const l of [...added, ...removed]) {
    assert.doesNotMatch(l, /PerspectiveCamera\(|\bfov\b\s*[:=]/, '不得改 fov：' + l);
    assert.doesNotMatch(l, /dist:\s*1\.65|tilt:\s*22\b/, '不得改逐槽微距常數：' + l);
  }
  assert.match(fs.readFileSync(new URL('../js/scene-env.js', import.meta.url), 'utf8'), /new THREE\.PerspectiveCamera\(50,/, 'fov 維持 50');
});
