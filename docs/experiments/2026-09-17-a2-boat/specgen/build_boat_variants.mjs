/* A2 標竿卷第一件「拼板舟 boat」兩案 spec 產生器（2026-09-17）
 * 甲 boat_a：保留船形，強化「舟」——船首眼放大成同心圓太陽紋、首尾高翹雞羽飾、白底紅黑三角波浪紋、兩名木雕人形划手持槳。
 * 乙 boat_b：直立化為「載靈的舟形神轎」——船體立起斜靠在平板轎底上，兩根抬桿貫穿前後，藤編支架與琉璃珠，船眼與波浪紋保留。
 * 跑法：node docs/experiments/2026-09-17-a2-boat/specgen/build_boat_variants.mjs
 * 輸出：assets/creatures/boat_a.json / boat_a.claims.json / boat_b.json / boat_b.claims.json
 * 不動 assets/creatures/boat.json、boat.glb、boat.claims.json。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const OUT = path.join(ROOT, 'assets', 'creatures');

// ── 共用：拼板舟斷面（沿用 boat.json 的 canoe，凹艙是「這是容器不是殼」的唯一線索）──────────
const CANOE = [[1, 0.1], [0.98, 0.68], [0.93, 1], [0.74, 0.05], [0, -0.55], [-0.74, 0.05], [-0.93, 1], [-0.98, 0.68],
  [-1, 0.1], [-0.94, -0.42], [-0.74, -0.76], [-0.42, -0.95], [0, -1], [0.42, -0.95], [0.74, -0.76], [0.94, -0.42]];

// 白／黑／橘紅三色（真實參照）＋ ART_BIBLE §2 祖靈的大地褐與靛藍琉璃珠
const PAL = {
  hull_body: { color: '#fdf9f0', rough: 0.88 },   // 米白船板
  bone: { color: '#fdfbf4', rough: 0.78 },        // 白色飾板／棋盤格菱片／雞羽飾
  trim_red: { color: '#b23f1c', rough: 0.78 },    // 橘紅舷條與三角紋
  socket: { color: '#2b2c30', rough: 0.60 },      // 中性近黑（_traps ①：S<0.15）
  eye: { color: '#f2601c', rough: 0.15 },         // 船眼圓心
  glow_prow: { color: '#d24f1b', rough: 0.20 },   // 舟艏尖翹（three.js 端掛 emissive）
  lash: { color: '#a28a63', rough: 0.90 },        // 風化木／藤編：划手本體、橫樑、轎底
  oar: { color: '#9c7048', rough: 0.90 },         // 大地褐：槳／抬桿（ART_BIBLE §2 主色 #8b6040 一族）
  bead: { color: '#3050a0', rough: 0.25 },        // 靛藍琉璃珠（ART_BIBLE §2 次色）
};

const SHADING = { gradient: { top: 0.12, bottom: -0.03 }, noise: { size: 0.011, amount: 0.19 } };

// 船體縱向分帶（角度吸附 360/48 = 7.5° 一格；_traps ④：帶要含住整數格）
const HULL_ARCS = [
  { from: 0, to: 37.5, color: '#4c463c' },      // 艙內：壓暗才讀得出「洞」
  { from: 37.5, to: 52.5, color: '#b23f1c' },   // 舷頂橘紅
  { from: 52.5, to: 60, color: '#26262a' },     // 舷下黑帶（棋盤格的底）
  { from: 60, to: 97.5, color: '#fdf9f0' },     // 白底主面
  { from: 97.5, to: 105, color: '#b23f1c' },    // 橘紅平行細線
  { from: 105, to: 142.5, color: '#fdf9f0' },   // 白底下半
  { from: 142.5, to: 150, color: '#3a3830' },   // 板縫深線
  { from: 150, to: 180, color: '#5a5344' },     // 龍骨
];

/** 同心圓船眼（外白→黑→白→橘紅→發光圓心），r 為最外圈半徑。 */
function boatEye(host, chain, t, around, r) {
  const oct = (rad) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    return [+(Math.cos(a) * rad).toFixed(4), +(Math.sin(a) * rad).toFixed(4)];
  });
  const A = { chain, t, around };
  const base = { type: 'fin', host, mirrored: true, anchor: A, udir: [0, 0, 1], vdir: [0, 1, 0] };
  const out = [];
  // 太陽紋放射三角（白）：8 道，繞在最外圈之外
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const p = (rad, da) => [+(Math.cos(a + da) * rad).toFixed(4), +(Math.sin(a + da) * rad).toFixed(4)];
    out.push({ ...base, material: 'bone', thickness: 0.007, points: [p(r * 0.94, -0.13), p(r * 0.94, 0.13), p(r * 1.06, 0)] });
  }
  out.push({ ...base, material: 'bone', thickness: 0.010, points: oct(r) });
  out.push({ ...base, material: 'socket', thickness: 0.016, points: oct(r * 0.80) });
  out.push({ ...base, material: 'bone', thickness: 0.022, points: oct(r * 0.59) });
  out.push({ ...base, material: 'trim_red', thickness: 0.028, points: oct(r * 0.39) });
  out.push({ type: 'eye', host, material: 'eye', size: +(r * 0.46).toFixed(4), anchor: A });
  return out;
}

/** 幾何波浪帶：紅色朝上三角與黑色朝下三角交錯一列（真實參照的幾何波浪／三角紋）。 */
function waveBand(host, chain, around, t0, step, n, s) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const up = k % 2 === 0;
    const w = s * 0.62, h = s;
    out.push({
      type: 'fin', host, material: up ? 'trim_red' : 'socket', thickness: up ? 0.014 : 0.012, mirrored: true,
      anchor: { chain, t: +(t0 + k * step).toFixed(4), around },
      udir: [0, 0, 1], vdir: [0, 1, 0],
      points: up ? [[-w, -h * 0.45], [w, -h * 0.45], [0, h * 0.62]] : [[-w, h * 0.45], [w, h * 0.45], [0, -h * 0.62]],
    });
  }
  return out;
}

/** 棋盤格窄帶：黑帶上的一排白菱片。 */
function checkerBand(host, chain, around, t0, step, n, s) {
  const out = [];
  for (let k = 0; k < n; k++) {
    out.push({
      type: 'fin', host, material: 'bone', thickness: 0.010, mirrored: true,
      anchor: { chain, t: +(t0 + k * step).toFixed(4), around },
      udir: [0, 0, 1], vdir: [0, 1, 0],
      points: [[s * 0.9, 0], [0, s * 0.62], [-s * 0.9, 0], [0, -s * 0.62]],
    });
  }
  return out;
}

/** 疊板搭口凸條（木板拼接的幾何替代做法，沿用 boat.json 的手法）。 */
function plankRidges(host, chain, around, t0, step, n, udir = [0, 0, 1], vdir = [0, 1, 0]) {
  const out = [];
  for (let k = 0; k < n; k++) {
    out.push({
      type: 'fin', host, material: 'hull_body', thickness: 0.013, mirrored: true,
      anchor: { chain, t: +(t0 + k * step).toFixed(4), around },
      udir, vdir,
      points: [[0.06, -0.011], [0.081, 0], [0.06, 0.011], [-0.06, 0.011], [-0.081, 0], [-0.06, -0.011]],
    });
  }
  return out;
}

/** 雞羽飾：首尾尖端的扇形羽片（白扇＋一根紅羽管）。off 必須落在船體尖端關節上，
 *  否則 part_attachment 會判它浮空（羽片最低點要碰得到船體表面）。 */
function featherFan(host, off, dir, scale) {
  const sgn = dir >= 0 ? 1 : -1;
  const mk = (material, thickness, pts) => ({
    type: 'fin', host, material, thickness, offset: off, udir: [0, 0, 1], vdir: [0, 1, 0],
    points: pts.map(([u, v]) => [+(u * sgn * scale).toFixed(4), +(v * scale).toFixed(4)]),
  });
  return [
    mk('bone', 0.016, [[0.00, -0.30], [0.15, -0.02], [0.19, 0.30], [0.08, 0.56], [-0.10, 0.46], [-0.14, 0.12]]),
    mk('trim_red', 0.026, [[0.01, -0.26], [0.09, -0.04], [0.06, 0.42], [-0.03, 0.30]]),
  ];
}

// ════════════════════════════════════════════════════════════════════════════
// 甲 boat_a — 拼板舟·划手
// ════════════════════════════════════════════════════════════════════════════
function buildA() {
  const joints = {
    SternTip: [0, 0.50, -0.80],
    Stern: { from: 'SternTip', up: -0.30, fwd: 0.24 },
    Mid: { from: 'Stern', up: 0.008, fwd: 0.47 },
    BowBase: { from: 'Mid', up: -0.006, fwd: 0.545 },
    BowTip: { from: 'BowBase', up: 0.40, fwd: 0.17 },
    // 划手（木雕人形）：前一名、後一名，尺寸不同（避免 50:50 節奏，也讓剪影不對稱）
    RowFHip: [0, 0.140, 0.215],
    RowFChest: { from: 'RowFHip', up: 0.250, fwd: -0.028 },
    RowFNeck: { from: 'RowFChest', up: 0.110, fwd: 0.016 },
    RowFHead: { from: 'RowFNeck', up: 0.170, fwd: 0.006 },
    RowAHip: [0, 0.140, -0.235],
    RowAChest: { from: 'RowAHip', up: 0.226, fwd: 0.024 },
    RowANeck: { from: 'RowAChest', up: 0.098, fwd: -0.014 },
    RowAHead: { from: 'RowANeck', up: 0.152, fwd: -0.006 },
  };
  const rowerProfile = [
    [0, 0.064, 0.054],
    [0.26, 0.090, 0.070, { exp: 4.6, sharp: true }],
    [0.60, 0.085, 0.066, { exp: 4.6, sharp: true }],
    [0.68, 0.038, 0.034, { sharp: true }],
    [0.80, 0.062, 0.058, { exp: 4.6, sharp: true }],
    [0.93, 0.058, 0.054, { exp: 4.6 }],
    [1, 0.018, 0.018],
  ];
  const parts = [
    // ── 船首眼（同心圓太陽紋）：比原版放大 1.5 倍 ──
    ...boatEye('BowBase', 'hull', 0.76, 72, 0.099),
    // ── 船尾小圓飾 ──
    { type: 'fin', host: 'Stern', material: 'socket', thickness: 0.009, mirrored: true, anchor: { chain: 'hull', t: 0.245, around: 96 }, udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.012, -0.056], [0.012, 0.056], [-0.012, 0.056], [-0.012, -0.056]] },
    { type: 'fin', host: 'Stern', material: 'socket', thickness: 0.009, mirrored: true, anchor: { chain: 'hull', t: 0.245, around: 96 }, udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.056, -0.012], [0.056, 0.012], [-0.056, 0.012], [-0.056, -0.012]] },
    { type: 'fin', host: 'Stern', material: 'trim_red', thickness: 0.017, mirrored: true, anchor: { chain: 'hull', t: 0.245, around: 96 }, udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.021, 0], [0.015, 0.015], [0, 0.021], [-0.015, 0.015], [-0.021, 0], [-0.015, -0.015], [0, -0.021], [0.015, -0.015]] },
    // ── 首尾高翹尖端（中線單片平板；⑧-5：圓管會被讀成角）──
    { type: 'fin', host: 'BowBase', material: 'glow_prow', thickness: 0.030, offset: [0, 0, 0.17], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[-0.122, -0.080], [0.082, -0.026], [0.110, 0.205], [0.060, 0.420], [-0.040, 0.208]] },
    { type: 'fin', host: 'BowBase', material: 'bone', thickness: 0.044, offset: [0, 0, 0.17], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[-0.058, -0.026], [0.034, 0.004], [0.056, 0.212], [0.026, 0.365], [-0.020, 0.186]] },
    { type: 'fin', host: 'Stern', material: 'trim_red', thickness: 0.028, offset: [0, 0, -0.17], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.100, -0.072], [-0.074, -0.024], [-0.096, 0.168], [-0.048, 0.320], [0.032, 0.172]] },
    { type: 'fin', host: 'Stern', material: 'bone', thickness: 0.042, offset: [0, 0, -0.17], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.054, -0.026], [-0.036, 0.004], [-0.054, 0.188], [-0.026, 0.300], [0.018, 0.156]] },
    // ── 首尾雞羽飾 ──
    ...featherFan('BowBase', [0, 0.40, 0.17], 1, 0.35),
    ...featherFan('Stern', [0, 0.30, -0.24], -1, 0.31),
    // ── 舷頂橘紅實體條（_traps ④：細色帶會被洗掉，要壓一條實體條）──
    { type: 'fin', host: 'Mid', material: 'trim_red', thickness: 0.018, conform: false, mirrored: true, anchor: { chain: 'hull', t: 0.5, around: 45 }, udir: [0, 0, 1], vdir: [0.707, 0.707, 0], points: [[-0.28, -0.017], [0.28, -0.017], [0.28, 0.017], [-0.28, 0.017]] },
    // ── 橫樑（藤編捆紮）──
    { type: 'fin', host: 'Stern', material: 'lash', thickness: 0.022, conform: false, offset: [0, 0.128, 0], udir: [1, 0, 0], vdir: [0, 0, 1], points: [[-0.125, -0.027], [-0.037, -0.034], [0.037, -0.034], [0.125, -0.027], [0.125, 0.027], [0.037, 0.034], [-0.037, 0.034], [-0.125, 0.027]] },
    { type: 'fin', host: 'BowBase', material: 'lash', thickness: 0.022, conform: false, offset: [0, 0.140, 0], udir: [1, 0, 0], vdir: [0, 0, 1], points: [[-0.140, -0.027], [-0.042, -0.034], [0.042, -0.034], [0.140, -0.027], [0.140, 0.027], [0.042, 0.034], [-0.042, 0.034], [-0.140, 0.027]] },
    // ── 舷側裝飾三帶：棋盤格窄帶／幾何波浪三角紋／疊板搭口凸條 ──
    ...checkerBand('Mid', 'hull', 56, 0.17, 0.066, 11, 0.023),
    ...waveBand('Mid', 'hull', 92, 0.165, 0.058, 13, 0.062),
    ...plankRidges('Mid', 'hull', 128, 0.18, 0.070, 10),
    // ── 划手的手臂與槳（槳斜插入水，不朝天）──
    { type: 'curve', host: 'RowFChest', material: 'oar', mirrored: true, sides: 6, offset: [0.056, 0.036, 0.004], dir: [0.50, -0.60, 0.62], segments: [{ len: 0.135, r: 0.023 }, { len: 0.095, r: 0.018 }] },
    { type: 'curve', host: 'RowAChest', material: 'oar', mirrored: true, sides: 6, offset: [0.054, 0.032, -0.004], dir: [0.52, -0.58, -0.62], segments: [{ len: 0.126, r: 0.022 }, { len: 0.088, r: 0.017 }] },
    { type: 'curve', host: 'RowFChest', material: 'oar', mirrored: true, sides: 6, offset: [0.096, -0.030, 0.032], dir: [0.42, -0.72, 0.55], segments: [{ len: 0.235, r: 0.026 }, { len: 0.075, r: 0.075 }, { len: 0.175, r: 0.068 }, { len: 0.070, r: 0.020, taper: true }] },
    { type: 'curve', host: 'RowAChest', material: 'oar', mirrored: true, sides: 6, offset: [0.094, -0.034, -0.030], dir: [0.44, -0.70, -0.56], segments: [{ len: 0.215, r: 0.024 }, { len: 0.070, r: 0.068 }, { len: 0.160, r: 0.062 }, { len: 0.065, r: 0.018, taper: true }] },
    // ── 划手頸間的靛藍琉璃珠（ART_BIBLE §2 次色）──
    { type: 'fin', host: 'RowFNeck', material: 'bead', thickness: 0.020, conform: false, mirrored: true, offset: [0.052, -0.010, 0.004], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.034, 0], [0.024, 0.024], [0, 0.034], [-0.024, 0.024], [-0.034, 0], [-0.024, -0.024], [0, -0.034], [0.024, -0.024]] },
    { type: 'fin', host: 'RowANeck', material: 'bead', thickness: 0.020, conform: false, mirrored: true, offset: [0.050, -0.010, -0.004], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.030, 0], [0.021, 0.021], [0, 0.030], [-0.021, 0.021], [-0.030, 0], [-0.021, -0.021], [0, -0.030], [0.021, -0.021]] },
  ];

  return {
    name: 'boat_a',
    _variant: 'A2 標竿卷（2026-09-17）甲案「拼板舟·划手」：保留船形、把「舟」的辨識線索推到底——① 船首眼放大 1.5 倍並加 8 道白色放射三角（同心圓太陽紋）'
      + '② 首尾更高翹並各加一面雞羽飾扇片 ③ 舷側改成三條帶：黑帶白菱棋盤格／紅黑交錯三角的幾何波浪紋／疊板搭口凸條 '
      + '④ 拿掉飛魚鰭（側伸的翼是「讀成飛船／飛艇」的主因，見 2026-09-04-review-boat-report.md:7）'
      + '⑤ 加兩名木雕人形划手（一前一後、大小不同）各持一支斜插入水的槳——人形＋槳是「這是有人在划的船」最直接的證據。',
    _brief: 'Tao (Yami) plank canoe with two carved wooden rowers. White plank hull, ochre-red gunwale rail, a black band of white diamonds under it, '
      + 'a zigzag row of red-up / black-down triangles along the flank, plank-lap ridges below. Both ends wrench upward to a point and carry a feather fan. '
      + 'On each bow cheek a big concentric boat-eye with eight radiating white triangles. Two rowers stand in the open hull, paddles biting down into the water. '
      + 'Signature = the rowers + the paddles. Identity view = side.',
    _traps: '① 近黑一律用中性灰（S<0.15）；② fin 帶 anchor 時 offset 會被丟掉，位置要寫進 points；③ 鏈段長度比 >0.923 會被 proportion BLOCK；'
      + '④ colors.arcs 只吃角度，橫向紋樣只能用小 fin 貼片；sides=48 → 7.5° 一格，帶要含住整數格。',
    palette: PAL,
    sections: { canoe: CANOE },
    ao: 0.26,
    shading: SHADING,
    build: 'rigid',
    smooth_angle: 26,
    joints,
    chains: {
      hull: ['SternTip', 'Stern', 'Mid', 'BowBase', 'BowTip'],
      rowerF: ['RowFHip', 'RowFChest', 'RowFNeck', 'RowFHead'],
      rowerA: ['RowAHip', 'RowAChest', 'RowANeck', 'RowAHead'],
    },
    attach: { rowerF: 'BowBase', rowerA: 'Stern' },
    mirror: [],
    touch: [['hull', 'rowerF'], ['hull', 'rowerA']],
    volumes: [
      {
        chain: 'hull', material: 'hull_body', frame: 'up', sides: 48, smooth_angle: 26, section: 'canoe',
        profile: [[0, 0.03, 0.062], [0.11, 0.105, 0.15, { sharp: true }], [0.3, 0.19, 0.205, { sharp: true }],
          [0.55, 0.208, 0.205, { sharp: true }], [0.76, 0.158, 0.205, { sharp: true }], [0.89, 0.078, 0.12, { sharp: true }], [1, 0.02, 0.05]],
        caps: ['none', 'none'], ring_step: 0.058, colors: { arcs: HULL_ARCS }, faceted: true,
      },
      { chain: 'rowerF', material: 'lash', frame: 'up', sides: 10, smooth_angle: 26, profile: rowerProfile, caps: ['none', 'dome'], ring_step: 0.038, faceted: true },
      { chain: 'rowerA', material: 'lash', frame: 'up', sides: 10, smooth_angle: 26, profile: rowerProfile, caps: ['none', 'dome'], ring_step: 0.038, faceted: true },
    ],
    parts,
    animations: {
      // 祖靈：idle 近乎靜止（幅度 ≤ 香火一半）
      idle: {
        duration: 2.8, loop: true,
        tracks: {
          SternTip: { ty: [[0, 0], [0.5, 0.016], [1, 0]] },
          Mid: { rx: [[0, -1.1], [0.5, 1.4], [1, -1.1]] },
          RowFChest: { rx: [[0, 1.6], [0.5, -2.2], [1, 1.6]] },
          RowAChest: { rx: [[0, -1.8], [0.5, 2.0], [1, -1.8]] },
        },
      },
      // move：划水節奏——兩名划手前後錯拍，船身跟著點頭
      move: {
        duration: 0.9, loop: true,
        tracks: {
          SternTip: { ty: [[0, 0], [0.5, 0.042], [1, 0]] },
          Mid: { rx: [[0, 2.6], [0.5, -3.4], [1, 2.6]] },
          RowFChest: { rx: [[0, 16], [0.35, -13], [0.7, 14], [1, 16]] },
          RowAChest: { rx: [[0, -12], [0.35, 15], [0.7, -11], [1, -12]] },
          RowFHip: { rx: [[0, 4], [0.5, -5], [1, 4]] },
        },
      },
      // attack：祖靈 0.4–0.5s 爆發，整艘舟往前撞
      attack: {
        duration: 0.46, loop: false,
        tracks: {
          SternTip: { ty: [[0, 0], [0.18, -0.03], [0.48, 0.17], [0.76, 0.04], [1, 0]], tz: [[0, 0], [0.18, -0.09], [0.52, 0.50], [1, 0]] },
          Mid: { rx: [[0, 0], [0.18, 7], [0.48, -15], [0.78, 3], [1, 0]] },
          RowFChest: { rx: [[0, 0], [0.18, -24], [0.46, 28], [1, 0]] },
          RowAChest: { rx: [[0, 0], [0.18, -20], [0.46, 25], [1, 0]] },
        },
      },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 乙 boat_b — 載靈的舟形神轎
// ════════════════════════════════════════════════════════════════════════════
function buildB() {
  const joints = {
    // 轎底平板（根鏈；抬桿掛在它身上，balance 的支撐足跡也靠它）
    BierA: [0, 0.088, -0.30],
    BierB: { from: 'BierA', fwd: 0.30, up: -0.004 },
    BierC: { from: 'BierB', fwd: 0.22, up: 0.004 },
    // 船體立起、微微後仰，船艏尖翹變成轎頂的飾件
    SternTip: [0, 0.075, -0.20],
    Stern: { from: 'SternTip', up: 0.215, fwd: 0.075 },
    Mid: { from: 'Stern', up: 0.345, fwd: 0.105 },
    BowBase: { from: 'Mid', up: 0.435, fwd: 0.075 },
    BowTip: { from: 'BowBase', up: 0.305, fwd: -0.095 },
  };
  const parts = [
    // ── 船眼（立起來之後在轎身上半的雙頰）──
    ...boatEye('BowBase', 'hull', 0.72, 72, 0.092),
    // ── 轎頂：船艏尖翹 ──
    { type: 'fin', host: 'BowBase', material: 'glow_prow', thickness: 0.030, offset: [0, 0.155, -0.045], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[-0.120, -0.150], [0.130, -0.075], [0.150, 0.150], [0.045, 0.470], [-0.075, 0.190]] },
    { type: 'fin', host: 'BowBase', material: 'bone', thickness: 0.044, offset: [0, 0.155, -0.045], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[-0.075, -0.100], [0.070, -0.040], [0.092, 0.140], [0.022, 0.375], [-0.046, 0.160]] },
    ...featherFan('BowBase', [0, 0.305, -0.095], 1, 0.46),
    // ── 轎尾（船尾）小圓飾 ──
    { type: 'fin', host: 'Stern', material: 'socket', thickness: 0.009, mirrored: true, anchor: { chain: 'hull', t: 0.24, around: 96 }, udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.012, -0.050], [0.012, 0.050], [-0.012, 0.050], [-0.012, -0.050]] },
    { type: 'fin', host: 'Stern', material: 'trim_red', thickness: 0.017, mirrored: true, anchor: { chain: 'hull', t: 0.24, around: 96 }, udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.021, 0], [0.015, 0.015], [0, 0.021], [-0.015, 0.015], [-0.021, 0], [-0.015, -0.015], [0, -0.021], [0.015, -0.015]] },
    // ── 舷頂橘紅實體條 ──
    { type: 'fin', host: 'Mid', material: 'trim_red', thickness: 0.018, conform: false, mirrored: true, anchor: { chain: 'hull', t: 0.5, around: 45 }, udir: [0, 1, 0], vdir: [0.707, 0, -0.707], points: [[-0.34, -0.022], [0.34, -0.022], [0.34, 0.022], [-0.34, 0.022]] },
    // ── 舷側三帶（立起來之後變成轎身的縱向織紋）──
    ...checkerBand('Mid', 'hull', 60, 0.20, 0.060, 10, 0.028),
    ...waveBand('Mid', 'hull', 92, 0.195, 0.055, 12, 0.058),
    ...plankRidges('Mid', 'hull', 128, 0.21, 0.068, 9, [0, 1, 0], [0, 0, 1]),
    // ── 抬桿：兩根長木桿貫穿前後（掛在轎底平板上）──
    { type: 'curve', host: 'BierA', material: 'oar', mirrored: true, sides: 6, offset: [0.186, 0.022, -0.24], dir: [0, 0, 1], segments: [{ len: 0.36, r: 0.032 }, { len: 0.26, r: 0.035 }, { len: 0.34, r: 0.027, taper: true }] },
    // ── 轎底前後的橫木頭（抬桿末端的握把結）──
    { type: 'fin', host: 'BierA', material: 'lash', thickness: 0.036, conform: false, offset: [0, 0.022, -0.14], udir: [1, 0, 0], vdir: [0, 0, 1], points: [[-0.212, -0.030], [-0.064, -0.040], [0.064, -0.040], [0.212, -0.030], [0.212, 0.030], [0.064, 0.040], [-0.064, 0.040], [-0.212, 0.030]] },
    { type: 'fin', host: 'BierC', material: 'lash', thickness: 0.036, conform: false, offset: [0, 0.022, 0.10], udir: [1, 0, 0], vdir: [0, 0, 1], points: [[-0.202, -0.028], [-0.062, -0.038], [0.062, -0.038], [0.202, -0.028], [0.202, 0.028], [0.062, 0.038], [-0.062, 0.038], [-0.202, 0.028]] },
    // ── 藤編支架：船身兩側斜撐下到轎底 ──
    { type: 'curve', host: 'Stern', material: 'lash', mirrored: true, sides: 5, offset: [0.045, 0.015, 0.010], dir: [0.52, -0.66, -0.54], segments: [{ len: 0.165, r: 0.024 }, { len: 0.110, r: 0.018 }] },
    { type: 'curve', host: 'BowBase', material: 'lash', mirrored: true, sides: 5, offset: [0.050, -0.035, 0.010], dir: [0.40, -0.86, -0.32], segments: [{ len: 0.285, r: 0.021 }, { len: 0.190, r: 0.016 }] },
    { type: 'curve', host: 'Mid', material: 'lash', mirrored: true, sides: 5, offset: [0.055, -0.020, 0.015], dir: [0.46, -0.78, -0.43], segments: [{ len: 0.245, r: 0.023 }, { len: 0.155, r: 0.017 }] },
    // ── 捆紮藤圈與靛藍琉璃珠 ──
    { type: 'fin', host: 'Mid', material: 'lash', thickness: 0.022, conform: false, offset: [0, -0.030, 0.012], udir: [1, 0, 0], vdir: [0, 0, 1], points: [[-0.150, -0.030], [-0.045, -0.038], [0.045, -0.038], [0.150, -0.030], [0.150, 0.030], [0.045, 0.038], [-0.045, 0.038], [-0.150, 0.030]] },
    { type: 'fin', host: 'Stern', material: 'lash', thickness: 0.022, conform: false, offset: [0, -0.020, 0.006], udir: [1, 0, 0], vdir: [0, 0, 1], points: [[-0.125, -0.027], [-0.037, -0.034], [0.037, -0.034], [0.125, -0.027], [0.125, 0.027], [0.037, 0.034], [-0.037, 0.034], [-0.125, 0.027]] },
    { type: 'fin', host: 'Mid', material: 'bead', thickness: 0.018, conform: false, mirrored: true, offset: [0.150, -0.030, 0.012], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.030, 0], [0, 0.030], [-0.030, 0], [0, -0.030]] },
    { type: 'fin', host: 'Stern', material: 'bead', thickness: 0.018, conform: false, mirrored: true, offset: [0.126, -0.020, 0.006], udir: [0, 0, 1], vdir: [0, 1, 0], points: [[0.026, 0], [0, 0.026], [-0.026, 0], [0, -0.026]] },
  ];

  return {
    name: 'boat_b',
    _variant: 'A2 標竿卷（2026-09-17）乙案「載靈的舟形神轎」：把拼板舟立起來斜靠在一面轎底平板上——① 船體鏈改成縱向上升、微微後仰，'
      + '船艏尖翹與雞羽飾變成轎頂飾件 ② 轎底是一塊寬而薄的平板（根鏈 bier），兩根木抬桿前後貫穿、末端露出握把結 '
      + '③ 船身兩側四根藤編斜撐下到轎底，加三圈捆紮藤圈與靛藍琉璃珠（ART_BIBLE:36 藤編／琉璃珠）'
      + '④ 船眼同心圓與紅黑三角波浪紋原樣保留在轎身上半 ⑤ 剪影改成垂直線條主導（ART_BIBLE:37 祖靈側視 W/H ≤ 0.7）。',
    _brief: 'A Tao plank canoe stood upright on a plank bier and carried like a palanquin: two long wooden poles run fore and aft through the bier, '
      + 'rattan struts lash the hull to it, indigo glass beads mark the bindings. The pointed prow hooks up at the top like a shrine finial with a feather fan; '
      + 'the concentric boat-eye and the red/black triangle wave band stay on the upper flanks. Feel: a vessel carrying an ancestor, not sailing. Identity view = side.',
    _traps: '① 立起來的鏈上，anchor.around 的 0/90/180 不再是「脊／側／腹」，編譯器會印出實際世界方向，照那行讀；'
      + '② 抬桿掛在轎底平板（根鏈）上才過得了 part_attachment；③ 轎底是根鏈、船體 attach 到它，root_containment 才驗得到「船尾埋進轎底」。',
    palette: PAL,
    sections: { canoe: CANOE },
    ao: 0.26,
    shading: SHADING,
    build: 'rigid',
    smooth_angle: 26,
    joints,
    chains: {
      bier: ['BierA', 'BierB', 'BierC'],
      hull: ['SternTip', 'Stern', 'Mid', 'BowBase', 'BowTip'],
    },
    attach: { hull: 'BierB' },
    mirror: [],
    touch: [['bier', 'hull']],
    volumes: [
      {
        chain: 'bier', material: 'lash', frame: 'up', sides: 8, smooth_angle: 26,
        profile: [[0, 0.155, 0.030], [0.32, 0.212, 0.042, { exp: 4.6, sharp: true }], [0.70, 0.202, 0.040, { exp: 4.6 }], [1, 0.148, 0.026]],
        caps: ['dome', 'dome'], ring_step: 0.058, faceted: true,
      },
      {
        chain: 'hull', material: 'hull_body', frame: 'up', sides: 48, smooth_angle: 26, section: 'canoe',
        profile: [[0, 0.03, 0.062], [0.11, 0.105, 0.15, { sharp: true }], [0.3, 0.19, 0.205, { sharp: true }],
          [0.55, 0.206, 0.205, { sharp: true }], [0.76, 0.158, 0.205, { sharp: true }], [0.89, 0.078, 0.12, { sharp: true }], [1, 0.02, 0.05]],
        caps: ['none', 'none'], ring_step: 0.058, colors: { arcs: HULL_ARCS }, faceted: true,
      },
    ],
    parts,
    animations: {
      idle: {
        duration: 2.8, loop: true,
        tracks: {
          BierA: { ty: [[0, 0], [0.5, 0.012], [1, 0]] },
          Stern: { rx: [[0, -0.9], [0.5, 1.2], [1, -0.9]] },
          BowBase: { rx: [[0, 0.7], [0.5, -1.0], [1, 0.7]] },
        },
      },
      // move：被抬著走的上下顛簸＋轎身左右晃
      move: {
        duration: 0.9, loop: true,
        tracks: {
          BierA: { ty: [[0, 0], [0.25, 0.048], [0.5, 0], [0.75, 0.046], [1, 0]], rz: [[0, -2.2], [0.5, 2.4], [1, -2.2]] },
          Stern: { rx: [[0, 2.4], [0.5, -3.0], [1, 2.4]] },
          BowBase: { rx: [[0, -3.2], [0.5, 4.0], [1, -3.2]] },
        },
      },
      attack: {
        duration: 0.46, loop: false,
        tracks: {
          BierA: { tz: [[0, 0], [0.18, -0.09], [0.52, 0.52], [1, 0]], ty: [[0, 0], [0.18, -0.03], [0.48, 0.14], [1, 0]] },
          Stern: { rx: [[0, 0], [0.18, 9], [0.48, -17], [0.78, 3], [1, 0]] },
          BowBase: { rx: [[0, 0], [0.18, 6], [0.48, -12], [1, 0]] },
        },
      },
    },
  };
}

// ── claims（在第一次編譯之前寫出；門檻沿用 assets/creatures/boat.claims.json，tri_budget 上限改 7093＝現版 5456×1.3）──
function claimsA() {
  return {
    name: '拼板舟 boat_a「拼板舟·划手」（zuling/swarm 候選甲）',
    _role: 'anyCreature harness/judge.mjs 的機械檢查清單。部位一律用 material 名指認。門檻沿用 assets/creatures/boat.claims.json 出貨版：'
      + 'style_light 側視中位亮度 ≥95、saturation_area tq 10%–60%、focal_contrast min_ratio 3、part_signature min_share 0.06／or_min_span 0.12 全部一格未動；'
      + '唯一改動是 tri_budget 上限 8000 → 7093（＝現版 boat 的 5456 × 1.3，A2 派工當下訂的上限，方向是加嚴）。'
      + '新增的是甲案自己的招牌條：人形划手（lash）與木槳（oar）必須存在且划手在側視看得見——這兩條是加嚴，多兩條要過。',
    claims: [
      { type: 'part_exists', part: 'hull_body', stage: 'MID', label: '船身（拼板舟的殼）必須存在' },
      { type: 'part_exists', part: 'trim_red', stage: 'MID', label: '橘紅舷條必須存在——白／黑／橘紅三色裡的橘紅要有實體載體' },
      { type: 'part_exists', part: 'eye', stage: 'MID', label: '船眼（同心圓太陽紋的橘紅圓心）必須存在，材質名必須正是 eye' },
      { type: 'part_exists', part: 'glow_prow', stage: 'MID', label: '尖翹舟艏必須存在，材質名必須正是 glow_prow（three.js 端靠這個名字掛 emissive）' },
      { type: 'part_exists', part: 'lash', stage: 'MID', label: '人形划手（與藤編橫樑同材質 lash）必須存在——甲案的招牌' },
      { type: 'part_exists', part: 'oar', stage: 'MID', label: '木槳必須存在——「有人在划」的第二個證據' },
      { type: 'part_exists', part: 'bone', stage: 'MID', label: '白色飾板（棋盤格菱片／雞羽飾／船眼外圈）必須存在' },
      { type: 'part_signature', part: 'glow_prow', view: 'side', min_share: 0.06, or_min_span: 0.12, stage: 'MID', label: '招牌部位（尖翹舟艏）在側視要撐得起面積或跨距其中一項' },
      { type: 'part_visible', part: 'lash', view: 'side', min_share: 0.03, stage: 'MID', label: '人形划手在側視至少要佔機體 3% 的像素——看不見的划手不算數' },
      { type: 'part_visible', part: 'oar', view: 'side', min_share: 0.03, stage: 'MID', label: '木槳在側視至少要佔機體 3% 的像素' },
      { type: 'focal_contrast', a: 'hull_body', b: 'lash', view: 'tq', min_ratio: 3, stage: 'MID', label: '船身必須壓過划手至少 3 倍——兩者等重就會讀成「人」而不是「舟」' },
      { type: 'share_hierarchy', primary: ['hull_body'], secondary: ['lash', 'oar'], tertiary: ['trim_red', 'bone', 'socket', 'eye', 'glow_prow', 'bead'], view: 'tq', stage: 'MID', label: '6:3:1 階層：船身／（划手＋木槳）／（橘紅舷條＋白飾板＋黑紋＋船眼＋舟艏＋琉璃珠）' },
      { type: 'style_light', view: 'side', min_median_lum: 95, stage: 'MID', label: '米白底：側視的機體中位亮度不得低於 95/255' },
      { type: 'rig_skinned', stage: 'HIGH', label: '必須是蒙皮模型' },
      { type: 'anim_named', names: ['idle', 'move', 'attack'], stage: 'HIGH', label: '三支動畫齊備' },
      { type: 'saturation_area', view: 'tq', min: 0.1, max: 0.6, stage: 'HIGH', label: '高飽和面積落在 10%-60%' },
      { type: 'tri_budget', min: 1500, max: 7093, stage: 'LOW', label: '三角形預算 ≤7093（＝現版 boat 5456 × 1.3，A2 派工當下訂的上限）' },
    ],
  };
}

function claimsB() {
  return {
    name: '拼板舟 boat_b「載靈的舟形神轎」（zuling/swarm 候選乙）',
    _role: 'anyCreature harness/judge.mjs 的機械檢查清單。門檻沿用 assets/creatures/boat.claims.json 出貨版（style_light ≥95、saturation_area 10%–60%、'
      + 'focal_contrast min_ratio 3 一格未動），tri_budget 上限 8000 → 7093（加嚴，A2 派工當下訂的上限）。'
      + '乙案自己的招牌條是抬桿（oar）與藤編／轎底（lash）必須存在，且抬桿在側視的跨距 ≥0.55——橫貫前後的桿子是「神轎」最短的證據。',
    claims: [
      { type: 'part_exists', part: 'hull_body', stage: 'MID', label: '船身（立起來的拼板舟）必須存在' },
      { type: 'part_exists', part: 'trim_red', stage: 'MID', label: '橘紅舷條必須存在' },
      { type: 'part_exists', part: 'eye', stage: 'MID', label: '船眼（同心圓太陽紋的橘紅圓心）必須存在，材質名必須正是 eye' },
      { type: 'part_exists', part: 'glow_prow', stage: 'MID', label: '尖翹舟艏（轎頂飾件）必須存在，材質名必須正是 glow_prow' },
      { type: 'part_exists', part: 'oar', stage: 'MID', label: '抬桿必須存在——乙案的招牌' },
      { type: 'part_exists', part: 'lash', stage: 'MID', label: '轎底平板與藤編支架必須存在' },
      { type: 'part_exists', part: 'bone', stage: 'MID', label: '白色飾板（棋盤格菱片／雞羽飾／船眼外圈）必須存在' },
      { type: 'part_signature', part: 'oar', view: 'side', min_share: 0.04, or_min_span: 0.55, stage: 'MID', label: '招牌部位（抬桿）在側視要撐得起面積或跨距其中一項——跨距門檻 0.55 是因為它必須橫貫整座轎' },
      { type: 'part_visible', part: 'lash', view: 'side', min_share: 0.04, stage: 'MID', label: '轎底與藤編在側視至少要佔機體 4%' },
      { type: 'focal_contrast', a: 'hull_body', b: 'oar', view: 'tq', min_ratio: 3, stage: 'MID', label: '轎身必須壓過抬桿至少 3 倍——兩者等重就會讀成「一捆木頭」' },
      { type: 'share_hierarchy', primary: ['hull_body'], secondary: ['lash', 'oar'], tertiary: ['trim_red', 'bone', 'socket', 'eye', 'glow_prow', 'bead'], view: 'tq', stage: 'MID', label: '6:3:1 階層：轎身／（轎底藤編＋抬桿）／（橘紅舷條＋白飾板＋黑紋＋船眼＋舟艏＋琉璃珠）' },
      { type: 'style_light', view: 'side', min_median_lum: 95, stage: 'MID', label: '米白底：側視的機體中位亮度不得低於 95/255' },
      { type: 'rig_skinned', stage: 'HIGH', label: '必須是蒙皮模型' },
      { type: 'anim_named', names: ['idle', 'move', 'attack'], stage: 'HIGH', label: '三支動畫齊備' },
      { type: 'saturation_area', view: 'tq', min: 0.1, max: 0.6, stage: 'HIGH', label: '高飽和面積落在 10%-60%' },
      { type: 'tri_budget', min: 1500, max: 7093, stage: 'LOW', label: '三角形預算 ≤7093（＝現版 boat 5456 × 1.3）' },
    ],
  };
}

const W = (n, o) => { fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 1)); console.log('wrote', n); };
W('boat_a.claims.json', claimsA());
W('boat_b.claims.json', claimsB());
W('boat_a.json', buildA());
W('boat_b.json', buildB());
