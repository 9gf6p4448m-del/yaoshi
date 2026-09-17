/* A2 第三件 redhat — 第 2 輪「讓讀者說出猴」（2026-09-17）
 * 一次性改寫：就地修改正式 assets/creatures/redhat.json（不開變體檔）。
 * 起因：第 1 輪盲讀「不可愛 2/2、色系③ 2/2、下半身虛化」都過，**「猴」沒過**——
 * 兩位特寫讀者讀成「戴斗笠的狐狸／狼形武士」「戴紅色尖嘴面具的獸首鬼（狐狼類）」，
 * 原話點名：狐狼吻部／灰褐長吻／紅色多面體尖帽前緣戳出長角／帽側紅色旗狀物／
 * 深綠偏黑的盔甲式軀幹有片狀甲片／懷中抱著米白骨色細桿。
 *
 * 四件事（全部只動 volumes.profile、parts、palette，**不動 joints／chains／animations／ghost_* 材質名**）：
 * ① 猴臉：吻部（jaw volume）在 t 0.52 前收乾淨＝可見吻長砍到現在的 ~42%，剖面改扁圓（寬>高）；
 *    加凹陷眼窩（第二顆 type:eye，深色 socket 球包住紅眼）；嘴改寬扁猴唇（貼在吻下緣的 conform fin）；
 *    耳朵改往側面長（udir 由 [0.6,0.8,0] 轉成 [0.97,0.24,0]）。
 * ② 斗笠：笠簷 0.160→0.180、笠頂高÷簷半徑 0.279→0.238；**刪掉三片 hat 破口碎片**
 *    （那就是讀者說的「前緣戳出的長角」與「帽側紅色旗狀物」，也是「喙／面具」的來源）。
 * ③ 毛：**刪掉 10 片 scale 圓鱗板**（＝「盔甲式軀幹／片狀甲片」），4 片長毛片改成 6 叢寬短濕毛簇，
 *    pelt 由 #2f342e 壓到 #252b25（深苔綠偏黑）。
 * ④ 胸前骨色：刪掉 RHand 的 paw 與指爪，stump_arm 由骨色 #9a9079 改成 #343830（與軀幹同族）。
 *
 * 跑法：node docs/experiments/2026-09-17-a2-redhat/specgen/round2_monkeyface.mjs
 * 前提：assets/creatures/redhat.json 仍是第 1 輪出貨版（甲案），備份在 scratchpad/a2r/redhat_r1_backup.json。
 * claims 一個位元組沒動：本輪沒有刪掉任何被 claims 點名的材質（hat／eye／mouth_glow／ghost_skirt／ghost_wisp 全在）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const F = path.join(ROOT, 'assets', 'creatures', 'redhat.json');
const s = JSON.parse(fs.readFileSync(F, 'utf8'));
const vol = (c) => s.volumes.find((v) => v.chain === c);

s._round2 = 'A2 第 2 輪（2026-09-17）：第 1 輪盲讀「猴」沒過，兩位讀者讀成狐狼／獸首鬼。'
  + '本輪四件事：① 吻部收短變扁圓＋眼窩＋寬扁猴唇＋耳往側面長 ② 斗笠壓平加寬、刪掉三片破口碎片（＝被讀成喙與旗的長角）'
  + '③ 刪掉 10 片圓鱗甲片、長毛片改 6 叢寬短濕毛簇 ④ 刪掉右手骨色 paw／爪、stump_arm 改暗。'
  + 'joints／chains／animations／ghost_* 材質名一格未動。';

s._traps_r2 = '★ 不動 joints 的代價：吻長只能靠 jaw volume 的半徑收乾淨，chain 末端（t 0.62→1，約 0.049 長）'
  + '留了一段半徑 0.0008 的殘桿（直徑 1.6 mm，1024² hero 上約 1 px）。要真的把 chain 縮短必須動 Jaw1／JawTip，'
  + '那會改到骨架靜止姿勢與牌桌取景的骨骼包絡，本輪的限制不准。'
  + '★ mouth_glow 不能再用 host:Jaw1 的 spike：吻在 Jaw1（t 0.61）已經收成殘桿，'
  + 'spike 的根會離宿主表面 0.03 以上、part_attachment 直接 BLOCK。改成 anchor 到 jaw 鏈 t 0.30 的 conform fin，'
  + '貼在吻的下緣＝寬扁的猴唇，attachment 由引擎自動吸附。';

// ── ① 猴臉 ────────────────────────────────────────────────────────────────
// 吻：扁圓（寬 > 高）、t 0.12 就到最寬、t 0.42 起收、t 0.62 收乾淨
const jaw = vol('jaw');
jaw.sides = 10;
jaw.ring_step = 0.007;
jaw.profile = [[0, 0.040, 0.036, { exp: 4.8 }],
  [0.12, 0.078, 0.056, { exp: 3.2, sharp: true }],
  [0.30, 0.082, 0.058, { exp: 3.0 }],
  [0.42, 0.064, 0.046, { exp: 3.4, sharp: true }],
  [0.52, 0.026, 0.020, { exp: 3.8, sharp: true }],
  [0.62, 0.0010, 0.0010, { exp: 4.8, sharp: true }],
  [1, 0.0008, 0.0008, { exp: 4.8 }]];
// sides 10 ＝ 每面 36°，孤帶角度要吸附到 36 的倍數（_traps ⑤ 的同一條）
jaw.colors = { arcs: [{ from: 144, to: 216, color: '#2c2925' }] };

// 眼窩：第二顆 type:eye，深色大球擺在紅眼後面一點＝凹陷的窩，紅眼是窩裡的一點
s.palette.socket = { color: '#171512', rough: 0.98 };
const eye = s.parts.find((p) => p.type === 'eye');
eye.size = 0.017; eye.face = 0.050; eye.spread = 0.030; eye.height = -0.028;
s.parts.splice(s.parts.indexOf(eye), 0, {
  type: 'eye', _c: 'sunken eye socket (dark) — 紅眼坐在這顆裡面', host: 'Brow', material: 'socket',
  size: 0.027, face: 0.030, spread: 0.030, height: -0.028 });

// 眉弓：加厚往前伸，壓在眼窩上方
const brow = s.parts.find((p) => p.material === 'stripe');
brow.thickness = 0.030;
delete brow.conform;   // 改讓引擎把它壓平貼到臉上＝眉弓隆脊；conform:false 會讓它戳出剪影外變成黑角
brow.points = brow.points.map(([u, v]) => [+(u * 0.80).toFixed(4), +v.toFixed(4)]);

// 嘴：寬扁的猴唇（貼在吻下緣的 conform fin，不是往前戳的 spike）
const oldMouth = s.parts.findIndex((p) => p.material === 'mouth_glow');
s.parts[oldMouth] = { type: 'fin', _c: 'wide flat monkey lip', host: 'JawRoot', material: 'mouth_glow',
  thickness: 0.010, smooth_angle: 26, anchor: { chain: 'jaw', t: 0.40, around: 0 },   // 實測：jaw 鏈上 180 的 world normal 是 (0,+0.98,0.20)＝吻背；0 才是吻下緣
  udir: [1, 0, 0], vdir: [0, 0.20, 0.98],
  points: [[-0.034, -0.010], [0.034, -0.010], [0.028, 0.016], [-0.028, 0.016]] };

// 獠牙：吻收短了，兩根跟著移到新的吻前緣（host 改 JawRoot；Jaw1 那裡已經是殘桿）
for (const p of s.parts) {
  if (p.material !== 'fang') continue;
  p.host = 'JawRoot';
  const left = p.offset[0] > 0;
  p.offset = [left ? 0.020 : -0.018, -0.030, left ? 0.040 : 0.036];
  p.dir = [left ? 0.16 : -0.14, -1, left ? 0.20 : 0.24];
}

// 耳：往側面長（猴耳貼頭側），不要狐狼的豎耳；順帶縮 0.88
for (const p of s.parts) {
  if (p.material !== 'ear' && p.material !== 'ear_inner') continue;
  p.udir = [0.97, 0.24, 0];
  p.vdir = [-0.24, 0.97, 0];
  p.points = p.points.map(([u, v]) => [+(u * 0.88).toFixed(4), +(v * 0.88).toFixed(4)]);
}

// ── ② 斗笠：壓平加寬，刪掉三片破口碎片 ───────────────────────────────────
s.parts = s.parts.filter((p) => !(p.material === 'hat' && p.type === 'fin'));
const hat = vol('hat');
hat.profile = [[0, 0.034, 0.033, { exp: 4.6 }],
  [0.16, 0.092, 0.089, { exp: 3.8 }],
  [0.46, 0.180, 0.174, { exp: 2.8, sharp: true }],
  [0.56, 0.152, 0.147, { exp: 3.0, sharp: true }],
  [0.76, 0.098, 0.095, { exp: 4.0, sharp: true }],
  [0.92, 0.046, 0.044, { exp: 4.2, sharp: true }],
  [1, 0.008, 0.008, { exp: 4.2 }]];

// ── ③ 毛：刪甲片，長毛片 → 6 叢寬短濕毛簇 ────────────────────────────────
s.parts = s.parts.filter((p) => p.material !== 'scale');
s.parts = s.parts.filter((p) => !(p.material === 'pelt' && p.type === 'fin'));
s.palette.pelt = { color: '#252b25', rough: 0.99 };
const R = 0.072;
const clump = (host, deg, dy, pts, th) => {
  const t = deg * Math.PI / 180;
  return { type: 'fin', _c: `wet pelt clump @${host} ${deg}deg`, host, material: 'pelt', thickness: th,
    conform: false, smooth_angle: 26,
    udir: [+(-Math.sin(t)).toFixed(3), 0, +Math.cos(t).toFixed(3)], vdir: [0, 1, 0],
    offset: [+(R * Math.cos(t)).toFixed(4), dy, +(R * Math.sin(t)).toFixed(4)], points: pts };
};
s.parts.push(
  clump('Chest', 30, -0.016, [[-0.050, 0.024], [0.048, 0.020], [0.052, -0.052], [0.004, -0.104], [-0.054, -0.046]], 0.012),
  clump('Chest', 150, -0.028, [[-0.044, 0.022], [0.046, 0.026], [0.050, -0.038], [-0.002, -0.078], [-0.048, -0.034]], 0.012),
  clump('Chest', 270, -0.008, [[-0.052, 0.026], [0.050, 0.018], [0.054, -0.044], [0.002, -0.088], [-0.056, -0.040]], 0.013),
  clump('Spine', 90, 0.012, [[-0.040, 0.020], [0.042, 0.024], [0.046, -0.030], [-0.004, -0.062], [-0.044, -0.028]], 0.011),
  clump('Spine', 210, -0.004, [[-0.048, 0.024], [0.046, 0.020], [0.050, -0.048], [0.000, -0.096], [-0.052, -0.042]], 0.012),
  clump('Spine', 330, 0.020, [[-0.042, 0.022], [0.044, 0.026], [0.048, -0.034], [-0.002, -0.070], [-0.046, -0.030]], 0.011),
);

// ── ④ 胸前骨色細桿：刪掉右手的 paw 與指爪，殘臂改暗 ──────────────────────
s.parts = s.parts.filter((p) => !(p.host === 'RHand'));
s.palette.stump_arm = { color: '#343830', rough: 0.9 };
s.palette.mouth_glow = { color: '#4d1210', rough: 0.3 };
delete s.palette.scale;

fs.writeFileSync(F, JSON.stringify(s, null, 1));
console.log('patched redhat.json — parts', s.parts.length);
