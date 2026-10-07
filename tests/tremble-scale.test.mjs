// v0.62.3：詛咒的手發抖（tremble 17／13／11 Hz）與推按時符紙堆 rz 擺動（9 Hz）頻率跟著 CURSE_MS／MS_REF（＝?grabslow 倍率 k）放慢，
// 使「一次動作內的圈數」與 k＝1 相同；振幅不動；k＝1 與 v0.62.2 逐位元相同。
// 環境變數（可省）：YAOSHI_GM_PATH＝被測 grab-motion.js（預設 js/grab-motion.js；指向舊版＝證明鑑別力，圈數斷言要紅）；
//   YAOSHI_OLD_GM_PATH＝d11d8e9c 版 grab-motion.js（有給才跑逐位元比對）。
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const load = (p) => import(pathToFileURL(path.resolve(p)).href);
const GM = await load(process.env.YAOSHI_GM_PATH || path.join(root, 'js/grab-motion.js'));
const OLD = process.env.YAOSHI_OLD_GM_PATH ? await load(process.env.YAOSHI_OLD_GM_PATH) : null;

const mk = (ms, M = GM) => M.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: { x: 0, z: 1.22 }, from: { x: 0.45, y: 0.152, z: 0.1 }, box: { x0: 0.2, x1: 0.7, y0: 0.152, y1: 0.45, z0: -0.02, z1: 0.24 }, tableY: 0.152, ms });
const crossings = (xs) => { let n = 0; for (let i = 1; i < xs.length; i++) if ((xs[i - 1] < 0) !== (xs[i] < 0) && xs[i - 1] !== 0) n++; return n; };
const cycles = (xs) => crossings(xs) / 2;

// tremble 單獨：窗 [0.9k, 3.0k] 秒（與動作同比例縮放），第 5 參數＝振幅、第 6 個＝k
function trembleCycles(k, passK) {
  const t0 = 0.92 * k, t1 = 3.0 * k, dt = 1 / 4000, xs = [];
  for (let t = t0; t < t1; t += dt) xs.push(GM.tremble(t, t0, t1, 0.008, passK ? k : undefined)[0]);
  return cycles(xs);
}
// 符紙堆 rz：用真實 makeCurseScript，量推的階段 [T.go, T.push] 內 rz 擺動圈數
function swingCycles(ms) {
  const s = mk(ms), xs = [], dt = 1 / 4000;
  for (let t = s.T.go; t < s.T.push; t += dt) xs.push(s.at(t).item.rz);
  return cycles(xs);
}

test('tremble 17 Hz：k＝1.3 時動作內圈數＝k＝1（±1 圈）；沒傳 k 的行為（＝舊版）會多 1.3 倍', () => {
  const c1 = trembleCycles(1, true), c13 = trembleCycles(1.3, true), cOld13 = trembleCycles(1.3, false);
  console.log(`tremble x 圈數：k=1 → ${c1}；k=1.3（傳 k）→ ${c13}；k=1.3（不傳 k）→ ${cOld13}`);
  assert.ok(c1 > 30, `k=1 圈數應約 36（實 ${c1}）`);
  assert.ok(Math.abs(c13 - c1) <= 1, `k=1.3 圈數 ${c13} 與 k=1 的 ${c1} 差 >1 圈`);
  assert.ok(cOld13 / c1 > 1.25 && cOld13 / c1 < 1.35, `對照組：不傳 k 的圈數比例應≈1.3（實 ${cOld13 / c1}）`);
});

test('推按時符紙堆 rz 9 Hz：CURSE_MS＝2600（k＝1.3）時推的階段內圈數＝CURSE_MS＝2000（±1 圈）', () => {
  const c1 = swingCycles(2000), c13 = swingCycles(2600);
  console.log(`rz 擺動圈數（推的階段）：k=1 → ${c1}；k=1.3 → ${c13}`);
  assert.ok(c1 >= 8, `k=1 推的階段應有數圈擺動（實 ${c1}）`);
  assert.ok(Math.abs(c13 - c1) <= 1, `k=1.3 圈數 ${c13} 與 k=1 的 ${c1} 差 >1 圈`);
});

test('振幅不動：k＝1.3 的 tremble／rz 峰值與 k＝1 同量級（不被頻率縮放改動）', () => {
  let m1 = 0, m13 = 0;
  for (let t = 0.92; t < 3; t += 1 / 2000) m1 = Math.max(m1, Math.abs(GM.tremble(t, 0.92, 3, 0.008, 1)[0]));
  for (let t = 0.92 * 1.3; t < 3.9; t += 1 / 2000) m13 = Math.max(m13, Math.abs(GM.tremble(t, 0.92 * 1.3, 3.9, 0.008, 1.3)[0]));
  assert.ok(m1 <= 0.008 && m13 <= 0.008 && m13 > 0.0075 && m1 > 0.0075, `峰值 ${m1} / ${m13}`);
});

test('k＝1 逐位元：tremble 與 rz 擺動與 v0.62.2（d11d8e9c）逐值 ===（需 YAOSHI_OLD_GM_PATH）', { skip: !OLD && '未給 YAOSHI_OLD_GM_PATH' }, () => {
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    const t = 0.9 + i * 0.00091, a = GM.tremble(t, 0.92, 3.0, 0.008), b = OLD.tremble(t, 0.92, 3.0, 0.008), c = GM.tremble(t, 0.92, 3.0, 0.008, 1);
    for (let j = 0; j < 3; j++) { assert.ok(a[j] === b[j] && c[j] === b[j], `tremble t=${t} j=${j}`); n++; }
  }
  const sn = mk(2000), so = mk(2000, OLD);
  for (let i = 0; i < 4000; i++) {
    const t = i * 0.00075, fn = sn.at(t), fo = so.at(t);
    assert.equal(JSON.stringify(fn), JSON.stringify(fo), `at(${t}) 整幀不同`); n++;
  }
  console.log(`逐位元比對 ${n} 個值／幀全等`);
});
