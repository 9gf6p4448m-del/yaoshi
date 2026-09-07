// 殘日 canri（祖靈／elite）三方案 spec 產生器
// r1a 圓盤裂芒獨眼 ／ r1b 半蝕新月帶滴落的光 ／ r1c 火球裂成兩半露出眼
// 依 docs/experiments/2026-09-07-ref-canri.md 五條特徵；引擎教訓見 assets/creatures/bow.json _traps*
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'tools/anyCreature/out/canri';
fs.mkdirSync(OUT, { recursive: true });

const D2R = Math.PI / 180;
const DISC_Y = 0.895;            // 日盤中心（loose joint）
const R = 0.285;                 // 日盤外半徑

// ---- 共用骨架 ------------------------------------------------------------
const joints = () => ({
  Root: [0, 0.09, 0],
  Hips: { from: 'Root', up: 0.150 },
  Spine: { from: 'Hips', up: 0.115, fwd: 0.010 },
  Chest: { from: 'Spine', up: 0.145, fwd: -0.006 },
  Neck: { from: 'Chest', up: 0.095, fwd: 0.008 },
  Crown: { from: 'Neck', up: 0.065 },
  Disc: [0, DISC_Y, 0],          // 鬆散關節：日盤總成掛這裡（bow _loose_joints 同法）
});

const chains = () => ({ trunk: ['Root', 'Hips', 'Spine', 'Chest', 'Neck', 'Crown'] });
const attach = () => ({ Disc: 'Crown' });

const trunkVolume = () => ({
  chain: 'trunk', material: 'bark_char', sides: 11, faceted: true, smooth_angle: 26,
  caps: ['dome', 'dome'], ring_step: 0.011,
  // 回修 1：原本是一根平滑漸細的錐子 → hero 被讀成「握把」。改成有腰、有肩的立姿：
  // 底盤外張（腳）→ 腰收細 → 胸再外張成肩（0.72 那一列的 b 拉到 0.135）→ 頸收細。
  profile: [
    // V2 回修：原本底盤 0.122 最寬、往上漸細＝不倒翁的配重底（兩位讀者的主詞就是不倒翁／陀螺）。
    // 改成上寬下窄的柱：肩最寬（0.112）、腰細、腳踝最細（0.046），重量往上壓。
    [0, 0.046, 0.056, { exp: 4.6 }],
    [0.15, 0.050, 0.062, { exp: 4.6, sharp: true }],
    [0.40, 0.046, 0.056, { exp: 4.6 }],
    [0.60, 0.052, 0.076, { exp: 4.8, sharp: true }],
    [0.78, 0.060, 0.112, { exp: 4.9, sharp: true }],
    [0.88, 0.048, 0.082, { exp: 4.9, sharp: true }],
    [1, 0.030, 0.038, { exp: 4.8 }],
  ],
  colors: { arcs: [{ from: 200, to: 260, color: '#4b463c' }, { from: 20, to: 70, color: '#3a3630' }] },
});

const palette = () => ({
  bark_char: { color: '#2b2926', rough: 0.97 },   // 焦炭軀幹（中性近黑 S=0.12，_traps ①）
  bone_ring: { color: '#a89878', rough: 0.85 },   // 頸上骨環
  sun_char: { color: '#2e2b28', rough: 0.95 },    // 熄掉的日盤（中性近黑）
  ember_ring: { color: '#7a3320', rough: 0.72 },  // V2 R3：靛藍→暗紅褐餘燼（四位讀者一致把冷藍讀成「深藍色的一半」，冷色離「日」最遠）
  eye_halo: { color: '#e8b25e', rough: 0.35 },    // 白熱眼外圈的暖暈
  ray_bone: { color: '#c8b489', rough: 0.8 },     // 裂芒（骨白）
  ray_gold: { color: '#d8a33c', rough: 0.55 },    // 裂芒（鎏金＝祖靈金色帶）
  eye: { color: '#fff2cc', rough: 0.08 },         // 白熱獨眼
  glow_ember: { color: '#c02a52', rough: 0.3 },   // 日珥：盤緣上的洋紅點
});

const shading = () => ({ gradient: { top: 0.30, bottom: -0.88 }, noise: { size: 0.018, amount: 0.26 } });

// ---- 幾何工具 ------------------------------------------------------------
const polyN = (n, r, phase = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (2 * Math.PI * i) / n;
    return [+(r * Math.cos(a)).toFixed(5), +(r * Math.sin(a)).toFixed(5)];
  });

// 徑向楔形裂芒：udir=徑向、vdir=切向；outline 為梯形（嚴格凸）
const ray = (angDeg, len, wBase, mat, r0 = 0.24, tip = 0.010) => {
  const a = angDeg * D2R;
  const u = [Math.cos(a), Math.sin(a), 0];
  const v = [-Math.sin(a), Math.cos(a), 0];
  return {
    type: 'fin', host: 'Disc', material: mat, thickness: 0.030, smooth_angle: 20,
    udir: u, vdir: v,
    points: [[r0, -wBase], [r0 + len, -tip], [r0 + len, tip], [r0, wBase]],
  };
};

// 盤緣上的洋紅日珥（小三角，凸）
const prominence = (angDeg, len = 0.055, w = 0.020) => {
  const a = angDeg * D2R;
  return {
    type: 'fin', host: 'Disc', material: 'glow_ember', thickness: 0.038, smooth_angle: 20,
    udir: [Math.cos(a), Math.sin(a), 0], vdir: [-Math.sin(a), Math.cos(a), 0],
    points: [[R - 0.045, -w], [R + len, -0.006], [R + len, 0.006], [R - 0.045, w]],
  };
};

// 掛在真實鏈關節上的零件（part_attachment 有在守的那幾片）
const trunkParts = () => ([
  { type: 'fin', host: 'Neck', material: 'bone_ring', thickness: 0.020, smooth_angle: 22,
    udir: [1, 0, 0], vdir: [0, 0.28, 0.96], points: polyN(8, 0.052) },
  { type: 'fin', host: 'Chest', material: 'bone_ring', thickness: 0.014, smooth_angle: 22,
    udir: [1, 0, 0], vdir: [0, 0.2, 0.98], offset: [0, -0.02, 0], points: polyN(7, 0.062) },
  { type: 'fin', host: 'Spine', material: 'ember_ring', thickness: 0.012, smooth_angle: 22,
    udir: [0, 1, 0], vdir: [1, 0, 0], offset: [0.038, 0, 0.030], points: polyN(6, 0.030) },
  { type: 'fin', host: 'Hips', material: 'ember_ring', thickness: 0.012, smooth_angle: 22,
    udir: [0, 1, 0], vdir: [1, 0, 0], offset: [-0.052, 0.01, 0.026], points: polyN(6, 0.026) },
  // 回修 1：兩條下垂的焦臂 —— 讓它讀成「站著的東西」而不是一根棒子
  { type: 'curve', host: 'Chest', material: 'bark_char', sides: 6, smooth_angle: 24, mirrored: true,
    offset: [0.052, 0.070, 0.006], dir: [0.62, -0.72, 0.31],
    segments: [{ len: 0.088, r: 0.030 }, { len: 0.072, r: 0.021, fall: 26 }, { len: 0.058, r: 0.011, fall: 34, taper: true }] },
  { type: 'curve', host: 'Chest', material: 'bone_ring', sides: 5, smooth_angle: 22, mirrored: true,
    offset: [0.058, 0.052, -0.020], dir: [0.55, -0.38, -0.74],
    segments: [{ len: 0.052, r: 0.016 }, { len: 0.038, r: 0.007, fall: 30, taper: true }] },
  // 回修 1：三根外張的焦根當腳，把「握把」的收尾改成抓地的基座
  { type: 'curve', host: 'Root', material: 'bark_char', sides: 5, smooth_angle: 22, mirrored: true,
    offset: [0.030, 0.030, 0.018], dir: [0.52, -0.30, 0.80],
    segments: [{ len: 0.062, r: 0.022 }, { len: 0.058, r: 0.014, fall: 40 }, { len: 0.046, r: 0.008, fall: 32, taper: true }] },
  { type: 'curve', host: 'Root', material: 'bark_char', sides: 5, smooth_angle: 22,
    offset: [0, 0.032, -0.030], dir: [0, -0.26, -0.96],
    segments: [{ len: 0.066, r: 0.024 }, { len: 0.062, r: 0.015, fall: 40 }, { len: 0.048, r: 0.009, fall: 30, taper: true }] },
]);

// ---- 動畫（祖靈：靜如樹、動時瞬發） --------------------------------------
const animations = () => ({
  idle: {
    duration: 2.8, loop: true,
    _note: 'ART_BIBLE §2：idle 近乎靜止（幅度 ≤ 香火一半）。只有日盤在極慢地轉，軀幹幾乎不動。',
    tracks: {
      Spine: { rz: [[0, -0.6], [0.5, 0.6], [1, -0.6]] },
      Neck: { rx: [[0, 0.8], [0.5, -0.8], [1, 0.8]] },
      Crown: { ry: [[0, -2.2], [0.5, 2.2], [1, -2.2]] },
      Disc: { rz: [[0, -5], [0.5, 5], [1, -5]] },
    },
  },
  move: {
    duration: 1.15, loop: true,
    _note: '位移放在根鏈的根關節 Root 的 tz/ty（放中段會撕皮）；日盤的轉速刻意與步伐錯開。',
    tracks: {
      Root: { tz: [[0, 0], [0.5, 0.032], [1, 0]], ty: [[0, 0], [0.25, 0.016], [0.5, 0], [0.75, 0.014], [1, 0]] },
      Hips: { rx: [[0, -3], [0.5, 3], [1, -3]] },
      Chest: { rx: [[0, 3], [0.5, -3], [1, 3]] },
      Neck: { rx: [[0, -2], [0.55, 2], [1, -2]] },
      Disc: { rz: [[0, 0], [1, 26]] },
    },
  },
  attack: {
    duration: 0.5, loop: false,
    _note: '招式「餘暉灼目」：0.4–0.5s 爆發（§2）。先往後收一拍，再把整顆日盤甩到對面臉上。',
    tracks: {
      Root: { tz: [[0, 0], [0.16, -0.035], [0.40, 0.175], [0.7, 0.06], [1, 0]] },
      Hips: { rx: [[0, 0], [0.16, -7], [0.40, 12], [1, 0]] },
      Chest: { rx: [[0, 0], [0.16, -9], [0.40, 16], [1, 0]] },
      Neck: { rx: [[0, 0], [0.16, -11], [0.40, 24], [1, 0]] },
      Crown: { rx: [[0, 0], [0.16, -8], [0.40, 20], [1, 0]] },
      Disc: { rz: [[0, 0], [0.16, 14], [0.44, -46], [1, 0]] },
    },
  },
});

// ---- 三方案的招牌幾何 ----------------------------------------------------
function variantA() {
  const parts = [];
  // 焦盤本體：22 邊形（凸），下緣壓進頸子 → part_attachment 有東西可咬
  parts.push({ type: 'fin', host: 'Disc', material: 'sun_char', thickness: 0.050, smooth_angle: 24,
    udir: [1, 0, 0], vdir: [0, 1, 0], points: polyN(28, R, 0.07) });
  // 靛藍餘燼內環（略厚，浮在盤面上）
  // 回修 1：原本 r0.158 的正圓靛藍盤被讀成「鏡片／錶面」。縮到 0.088 並推到右下角，
  // 讓盤面留下大片焦黑，亮暗分布回到「偏心一顆亮點」（bow _traps_4A ①）。
  // 回修 1b：縮小後的靛藍圓餅仍被讀成「第二顆眼」。改成沿盤緣的一段粗細不均的餘燼弧
  //（ref 04 環食「環的粗細明顯不均」），不再是圓的。
  {
    const n = 8, pts = [], a0d = -78, a1d = 52;
    for (let i = 0; i <= n; i++) { const a = (a0d + (a1d - a0d) * i / n) * D2R; pts.push([(R - 0.014) * Math.cos(a), (R - 0.014) * Math.sin(a)]); }
    const w = i => 0.040 + 0.034 * Math.sin(Math.PI * i / n);
    pts.push([(R - 0.014 - w(n)) * Math.cos(a1d * D2R), (R - 0.014 - w(n)) * Math.sin(a1d * D2R)]);
    pts.push([(R - 0.014 - w(0)) * Math.cos(a0d * D2R), (R - 0.014 - w(0)) * Math.sin(a0d * D2R)]);
    parts.push({ type: 'fin', host: 'Disc', material: 'ember_ring', thickness: 0.060, smooth_angle: 24,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0, 0.002], points: pts });
  }
  // ★ 偏心的白熱獨眼（bow _traps_4A ①：中心暗＝齒輪，所以亮點保留但偏心）
  // 眼窩（暗框）＋放大的白熱眼：bow _traps_R4 ④「暗框亮窩」，被命名的是窩
  parts.push({ type: 'fin', host: 'Disc', material: 'sun_char', thickness: 0.066, smooth_angle: 26,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.098, 0.104, 0.006], points: polyN(12, 0.112) });
  parts.push({ type: 'fin', host: 'Disc', material: 'eye_halo', thickness: 0.080, smooth_angle: 28,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.098, 0.104, 0.008], points: polyN(12, 0.098) });
  parts.push({ type: 'fin', host: 'Disc', material: 'eye', thickness: 0.094, smooth_angle: 30,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.098, 0.104, 0.012], points: polyN(10, 0.082) });
  // ★ V2 回修：盤緣一圈粗細不均的亮環（ref 04 環食）——暗盤外一圈亮邊是「日」的定義，
  // 沒有這一圈，暗盤加一顆亮點只會被讀成「一顆頭上的眼睛」。環用 10 段凸弧拼（fin 必須嚴格凸）。
  {
    const SEG = 10;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i * 360 / SEG), a1 = ((i + 1) * 360 / SEG);
      const w = 0.020 + 0.016 * Math.abs(Math.sin((a0 + 20) * D2R));   // 粗細不均
      const n = 4, pts = [];
      for (let k = 0; k <= n; k++) { const a = (a0 + (a1 - a0) * k / n) * D2R; pts.push([(R + 0.012) * Math.cos(a), (R + 0.012) * Math.sin(a)]); }
      pts.push([(R + 0.012 - w) * Math.cos(a1 * D2R), (R + 0.012 - w) * Math.sin(a1 * D2R)]);
      pts.push([(R + 0.012 - w) * Math.cos(a0 * D2R), (R + 0.012 - w) * Math.sin(a0 * D2R)]);
      parts.push({ type: 'fin', host: 'Disc', material: 'ray_gold', thickness: 0.056, smooth_angle: 20,
        udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0, 0.001], points: pts });
    }
  }
  // ★ 七道不等長不對稱的裂芒
  // V2 回修：芒由 7 道短粗改成 11 道長而細（0.16–0.42），才讀得成「光芒」而不是「尖刺」
  const rays = [[96, 0.42], [122, 0.19], [148, 0.31], [174, 0.16], [200, 0.36], [226, 0.20],
                [252, 0.40], [286, 0.24], [312, 0.33], [340, 0.17], [30, 0.28]];
  rays.forEach(([a, l], i) => parts.push(ray(a, l, 0.036 - 0.004 * (i % 3), i % 3 === 0 ? 'ray_gold' : 'ray_bone', 0.255, 0.007)));
  // 盤緣三點日珥
  [118, 236, 336].forEach(a => parts.push(prominence(a)));
  return { parts, note: '甲：完整焦盤＋七道不等長裂芒＋偏心白熱獨眼；靛藍餘燼內環壓在盤面上。' };
}

function variantB() {
  const parts = [];
  // ★ 半蝕新月：凹形不能用單一 fin（points 必須嚴格凸），改用 11 片沿弧的凸四邊形拼成月牙
  const N = 11, a0 = 58, a1 = 302;   // 由右下經上方繞到右上，留右側缺口
  const cx = 0.115;                  // 內圓圓心右移 → 右側被吃掉
  const rin = 0.238;
  const innerR = (th) => {           // 內圓（圓心 (cx,0)、半徑 rin）在方向 th 上的半徑
    const c = Math.cos(th) * cx;
    const d = c * c - (cx * cx - rin * rin);
    return c + Math.sqrt(Math.max(d, 1e-6));
  };
  for (let i = 0; i < N; i++) {
    const t0 = (a0 + (a1 - a0) * i / N) * D2R;
    const t1 = (a0 + (a1 - a0) * (i + 1) / N) * D2R;
    const tm = (t0 + t1) / 2;
    const u = [Math.cos(tm), Math.sin(tm), 0], v = [-Math.sin(tm), Math.cos(tm), 0];
    // 換到 (u,v) 局部座標
    const toUV = (r, th) => [r * Math.cos(th - tm), r * Math.sin(th - tm)];
    const pts = [toUV(innerR(t0), t0), toUV(R, t0), toUV(R, t1), toUV(innerR(t1), t1)];
    parts.push({ type: 'fin', host: 'Disc', material: i === 5 ? 'ray_bone' : 'sun_char',
      thickness: 0.048 + 0.006 * Math.sin(i), smooth_angle: 22, udir: u, vdir: v, points: pts });
  }
  // ★ 內緣咬爛的鋸齒（ref 特徵 3：外弧完好、內緣崩壞）
  for (let i = 0; i < 7; i++) {
    const th = (86 + i * 24) * D2R;
    const r = innerR(th);
    const u = [-Math.cos(th), -Math.sin(th), 0], v = [Math.sin(th), -Math.cos(th), 0];
    const L = 0.030 + 0.020 * ((i * 7) % 5) / 4;
    parts.push({ type: 'fin', host: 'Disc', material: 'sun_char', thickness: 0.044, smooth_angle: 18,
      udir: u, vdir: v, offset: [r * Math.cos(th), r * Math.sin(th), 0],
      points: [[-0.02, -0.024], [L, -0.004], [L, 0.004], [-0.02, 0.024]] });
  }
  // ★ 上弦角尖的白熱獨眼（月牙唯一還在燒的地方）
  // 回修 1：眼原本放在 296°（缺口側 R0.262）＝懸空。改貼在上弦角尖 293° 的月牙帶中線上。
  const eth = 293 * D2R, erad = (R + innerR(eth)) / 2;
  parts.push({ type: 'fin', host: 'Disc', material: 'sun_char', thickness: 0.060, smooth_angle: 26,
    udir: [1, 0, 0], vdir: [0, 1, 0],
    offset: [erad * Math.cos(eth), erad * Math.sin(eth), 0.004], points: polyN(11, 0.082) });
  parts.push({ type: 'fin', host: 'Disc', material: 'eye', thickness: 0.080, smooth_angle: 30,
    udir: [1, 0, 0], vdir: [0, 1, 0],
    offset: [erad * Math.cos(eth), erad * Math.sin(eth), 0.008], points: polyN(9, 0.058) });
  // ★ 從下弦角滴落的光：五顆遞減的餘燼
  // 回修 1：滴落的光改從下弦角的月牙帶中線出發（第一顆與月牙相接），逐顆往下、往內側偏。
  const dth = 66 * D2R, drad = (R + innerR(dth)) / 2;
  const bx = drad * Math.cos(dth), by = drad * Math.sin(dth);
  [0, 1, 2, 3, 4].forEach(i => parts.push({
    type: 'fin', host: 'Disc', material: i < 2 ? 'ray_gold' : 'glow_ember', thickness: 0.042 - 0.005 * i,
    smooth_angle: 24, udir: [1, 0, 0], vdir: [0, 1, 0],
    offset: [bx - 0.018 * i - 0.004 * i * i, by - 0.052 * i - 0.014 * i * i, 0.003],
    points: polyN(8, 0.042 - 0.007 * i),
  }));
  // 回修 1：原本三道芒掛在 24°/352°/326°（＝被咬掉的右側），hero 上整排懸空。
  // 改掛在完好的外弧（左側 120°～250°），r0 貼著 R−0.03 出發。
  [[124, 0.235, 'ray_gold'], [163, 0.135, 'ray_bone'], [200, 0.20, 'ray_bone'], [238, 0.10, 'ray_gold']]
    .forEach(([a, l, m]) => parts.push(ray(a, l, 0.048, m, R - 0.030)));
  return { parts, note: '乙：外弧完好、右側被咬掉的半蝕新月，內緣一排崩壞鋸齒；白熱獨眼縮到上弦角尖，光從下弦角一滴一滴掉下來。' };
}

function variantC() {
  const parts = [];
  // ★ 火球裂成兩半：半圓是凸多邊形，可以各用一片 fin
  const half = (sign, tiltDeg, dx, dy) => {
    const t = tiltDeg * D2R;
    const u = [Math.cos(t), Math.sin(t), 0], v = [-Math.sin(t), Math.cos(t), 0];
    const n = 13, pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (-90 + 180 * i / n) * D2R;
      pts.push([sign * R * Math.cos(a), R * Math.sin(a)]);
    }
    if (sign < 0) pts.reverse();
    return { type: 'fin', host: 'Disc', material: 'sun_char', thickness: 0.056, smooth_angle: 24,
      udir: u, vdir: v, offset: [dx, dy, 0], points: pts };
  };
  parts.push(half(-1, -9, -0.042, 0.022));   // 左半：往上偏、逆時針歪
  parts.push(half(1, 6, 0.048, -0.030));     // 右半：往下偏、順時針歪
  // ★ 裂縫裡的熔線與白熱獨眼
  parts.push({ type: 'fin', host: 'Disc', material: 'glow_ember', thickness: 0.030, smooth_angle: 20,
    udir: [0.1, 1, 0], vdir: [1, -0.1, 0], offset: [0.004, 0, -0.006],
    points: [[-0.245, -0.016], [-0.06, -0.030], [0.215, -0.014], [0.215, 0.014], [-0.06, 0.030], [-0.245, 0.016]] });
  parts.push({ type: 'fin', host: 'Disc', material: 'eye', thickness: 0.088, smooth_angle: 30,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0.006, 0.052, 0.010], points: polyN(11, 0.058) });
  // 靛藍餘燼：兩半各留一塊
  // 回修 1：原本兩塊 r0.07 的靛藍圓餅在 hero 上被讀成「另外兩顆眼睛」（三顆眼＝訊號互打）。
  // 改成沿兩半外緣的細長靛藍邊帶（餘燼），不再是圓的。
  [[-1, 150, 210], [1, -30, 30]].forEach(([sgn, a0d, a1d]) => {
    // 外緣走弧、內緣走直弦 → 整條仍是嚴格凸多邊形（fin 的硬限制，試作卷 ③-7）
    const n = 6, pts = [];
    for (let i = 0; i <= n; i++) { const a = (a0d + (a1d - a0d) * i / n) * D2R; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
    const aE = a1d * D2R, aS = a0d * D2R, ri = R - 0.058;
    pts.push([ri * Math.cos(aE), ri * Math.sin(aE)]);
    pts.push([ri * Math.cos(aS), ri * Math.sin(aS)]);
    parts.push({ type: 'fin', host: 'Disc', material: 'ember_ring', thickness: 0.062, smooth_angle: 22,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [sgn < 0 ? -0.042 : 0.048, sgn < 0 ? 0.022 : -0.030, 0.004], points: pts });
  });
  // ★ 只長在外緣的五道裂芒（左上兩道、右下三道）
  [[128, 0.255, 'ray_gold'], [162, 0.135, 'ray_bone'],
   [300, 0.225, 'ray_bone'], [332, 0.30, 'ray_gold'], [270, 0.115, 'ray_bone']]
    .forEach(([a, l, m]) => parts.push(ray(a, l, 0.050, m, 0.235)));
  [104, 288].forEach(a => parts.push(prominence(a, 0.05, 0.018)));
  return { parts, note: '丙：整顆火球從中線裂成兩半、上下錯開，裂縫裡露出一條熔線與一顆白熱的眼；裂芒只長在外緣。' };
}

// ---- 組裝 ----------------------------------------------------------------
const VARIANTS = { r1a: variantA, r1b: variantB, r1c: variantC };

for (const [key, fn] of Object.entries(VARIANTS)) {
  const { parts, note } = fn();
  const spec = {
    name: `殘日 canri (zuling/elite) ${key}`,
    _variant: note,
    _brief: '殘日：被射中右眼、失去厲光墜成月亮的那顆太陽。elite×1。系別色帶＝祖靈金:裂芒；發光部位 eye,glow_ember；招牌剪影＝偏心獨眼焦盤。',
    _ref: 'docs/experiments/2026-09-07-ref-canri.md（5 條一眼特徵）',
    _loose_joints: 'Disc 是鬆散關節（不屬任何 chain，attach 掛 Crown）：日盤總成離軀幹表面遠，掛 chain 關節上 part_attachment 必 BLOCK（bow _loose_joints 同法）。代價＝日盤貼合沒有機器在守，靠 Crown 上的 bone_ring／Chest／Spine／Hips 四片真掛件維持機械證據。',
    _traps_inherited: 'bow _traps_4A ①（中心暗＝齒輪、中心亮＝太陽）→ 本尊保留白熱亮點但偏心；bow _traps ①（近黑一律中性灰 S<0.15）；bow _traps_3B ③（懸掛平板長寬比 >2 讀成手指）→ 裂芒是梯形寬楔不是細長條。',
    palette: palette(),
    build: 'rigid',
    shading: shading(),
    smooth_angle: 26,
    joints: joints(),
    chains: chains(),
    attach: attach(),
    touch: [],
    volumes: [trunkVolume()],
    parts: [...trunkParts(), ...parts],
    animations: animations(),
  };
  fs.writeFileSync(path.join(OUT, key + '.json'), JSON.stringify(spec, null, 1));
  console.log('wrote', path.join(OUT, key + '.json'), 'parts=', spec.parts.length);
}

// ---- claims（每方案一份，寫在第一次編譯之前）-----------------------------
const claimsFor = (key, signature) => ({
  name: `殘日 canri ${key} (zuling/elite)`,
  _role: 'anyCreature harness/judge.mjs 的機械檢查清單。部位一律用 material 名指認。識別視角＝正視（front）——日盤是正對鏡頭的一片，側視只剩厚度。基底＝bow.claims.json；saturation 帶沿用凍結檔的 10%–60%；tri 上限 8000（09-04 19:30 預算制）。',
  _frozen_at: '動手編譯之前寫定（與 spec 同一支產生器、同一次執行）。',
  claims: [
    { type: 'part_exists', part: 'sun_char', stage: 'MID', label: '焦盤本體必須存在（招牌質量）' },
    { type: 'part_exists', part: 'eye', stage: 'MID', label: '白熱獨眼必須存在，材質名必須正是 eye（three.js 靠這個名字掛 emissive）' },
    { type: 'part_exists', part: 'ray_gold', stage: 'MID', label: '祖靈金色帶＝裂芒必須存在' },
    { type: 'part_exists', part: 'glow_ember', stage: 'MID', label: '盤緣日珥必須存在，材質名必須正是 glow_ember' },
    { type: 'part_signature', part: signature, view: 'front', min_share: 0.10, or_min_span: 0.15, stage: 'MID', label: '招牌部位在識別視角要撐得起面積或跨距其中一項' },
    { type: 'part_visible', part: 'eye', view: 'front', min_share: 0.004, stage: 'MID', label: '真實參照特徵 1 的機械化：獨眼在識別視角必須量得到——看不到那顆亮點，焦盤就只是一塊黑板' },
    { type: 'part_visible', part: 'ray_bone', view: 'front', min_share: 0.010, stage: 'MID', label: '真實參照特徵 2 的機械化：不對稱裂芒必須量得到' },
    { type: 'part_visible', part: 'bark_char', view: 'front', min_share: 0.03, stage: 'MID', label: '軀幹不得被自己頭上的日盤吞掉（elite 招牌過大的專屬風險，同 bow skull_bone）' },
    { type: 'focal_contrast', a: 'sun_char', b: 'eye', min_ratio: 3, view: 'front', stage: 'MID', label: '兩個焦點（焦盤／白熱眼）不得等重相爭' },
    { type: 'style_dark', view: 'front', max_median_lum: 95, stage: 'MID', label: '深底：熄掉的天體在識別視角也要讀得出是暗的' },
    { type: 'rig_skinned', stage: 'HIGH', label: '必須是蒙皮模型' },
    { type: 'anim_named', names: ['idle', 'move', 'attack'], stage: 'HIGH', label: '三支動畫齊備' },
    { type: 'saturation_area', view: 'tq', min: 0.10, max: 0.60, stage: 'HIGH', label: '高飽和面積落在 10%–60%（凍結檔指定的帶）' },
    { type: 'tri_budget', min: 1200, max: 8000, stage: 'LOW', label: '三角形預算（09-04 19:30 預算制上限 8000）' },
  ],
});
for (const [key, sig] of [['r1a', 'sun_char'], ['r1b', 'sun_char'], ['r1c', 'sun_char']])
  fs.writeFileSync(path.join(OUT, key + '.claims.json'), JSON.stringify(claimsFor(key, sig), null, 1));
console.log('claims written');
