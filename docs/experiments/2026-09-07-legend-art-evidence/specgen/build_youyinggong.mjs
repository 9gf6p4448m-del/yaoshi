// 有應公 youyinggong（陰氣／haunt）三方案 spec 產生器
// r1a 小祠＋紅布＋香爐無臉 ／ r1b 紅布裹枯骨堆 ／ r1c 牌位化身
// 依 docs/experiments/2026-09-07-ref-youyinggong.md 五條特徵。
// haunt 骨架照 redhat._haunt_skeleton：body 鏈由腰往上、mist 鏈由腰往下掛 Waist、沒有腿鏈；
// 腰以下一律 ghost_* 材質（js/creature-figures.js 已接 /^ghost_/ opacity 0.62）。
import fs from 'node:fs';
import path from 'node:path';
const OUT = 'tools/anyCreature/out/youyinggong';
fs.mkdirSync(OUT, { recursive: true });
const D2R = Math.PI / 180;

const polyN = (n, r, phase = 0) => Array.from({ length: n }, (_, i) => {
  const a = phase + (2 * Math.PI * i) / n;
  return [+(r * Math.cos(a)).toFixed(5), +(r * Math.sin(a)).toFixed(5)];
});

const palette = () => ({
  stone_body: { color: '#4a4f47', rough: 0.97 },    // 髒石（苔綠帶濕黑，S=0.10 中性）
  stone_dark: { color: '#31352f', rough: 0.97 },
  moss: { color: '#3d6e4e', rough: 0.95 },          // 陰氣主色苔綠（只落在石身的苔痕帶）
  roof_tile: { color: '#8e3227', rough: 0.88 },     // 朱瓦（那一點刺眼的紅）
  red_sash: { color: '#b3242c', rough: 0.8 },       // 繫腰的紅布
  bone: { color: '#b6ad95', rough: 0.9 },           // 枯骨
  censer_iron: { color: '#26292a', rough: 0.86 },   // 黑鐵香爐
  censer_ear: { color: '#a2833a', rough: 0.6 },     // 香爐的金捲耳
  ghost_ash: { color: '#5f6b62', rough: 0.9 },      // 腰以下的香灰霧
  ghost_wisp: { color: '#70b080', rough: 0.45 },
  mouth_glow: { color: '#7a1a14', rough: 0.3 },     // 龕口深處的一點暗紅（近黑龕口＋一點餘火）
  glow_wick: { color: '#ffb34a', rough: 0.2 },      // 紅燭的燭火
});

const shading = () => ({ gradient: { top: 0.30, bottom: -0.86 }, noise: { size: 0.020, amount: 0.30 } });

const CFG = {
  r1a: {
    note: '甲：一整座路旁小祠站起來——正面一個深黑的方龕口取代臉，朱瓦頂壓在苔石身上，腰上繫紅布，供桌上一只三足金耳香爐；腰以下化成香灰霧。',
    kind: 'shrine', bodyW: [0.150, 0.168, 0.176, 0.150], bodyD: [0.104, 0.116, 0.122, 0.100],
    roof: true, niche: 'big', bones: false, tablet: false, censer: 'front', sash: 'waist',
  },
  r1b: {
    note: '乙：一堆用紅布捆起來的無主枯骨——沒有祠也沒有臉，只有一束斜插的骨、一圈勒緊的紅布與頭頂一小片殘瓦；骨堆下緣散成灰。',
    kind: 'bones', bodyW: [0.116, 0.132, 0.126, 0.092], bodyD: [0.100, 0.118, 0.112, 0.084],
    roof: 'cap', niche: 'small', bones: true, tablet: false, censer: 'side', sash: 'wrap',
  },
  r1c: {
    note: '丙：一面站起來的無名牌位——上端做成瓦頂形的碑首、碑面空白（沒有名字也沒有臉），一條紅布斜披過肩，腳下一只香爐；碑身下半化成霧。',
    kind: 'tablet', bodyW: [0.128, 0.140, 0.146, 0.126], bodyD: [0.054, 0.060, 0.062, 0.050],
    roof: 'crest', niche: 'blank', bones: false, tablet: true, censer: 'foot', sash: 'sash',
  },
};

function build(key) {
  const c = CFG[key];
  const joints = {
    Waist: [0, 0.50, 0],
    Spine: { from: 'Waist', up: 0.150, fwd: 0.006 },
    Chest: { from: 'Spine', up: 0.112, fwd: -0.004 },
    Top: { from: 'Chest', up: 0.078, fwd: 0.004 },
    MistRoot: { from: 'Waist', up: -0.024 },
    Mist1: { from: 'MistRoot', up: -0.150, fwd: 0.010 },
    Mist2: { from: 'Mist1', up: -0.126, fwd: 0.016 },
    MistTip: { from: 'Mist2', up: -0.100, fwd: 0.028 },
    // 鬆散關節：外挑的瓦簷與香爐都咬不到石身（part_attachment 必 BLOCK），同 bow _loose_joints
    Eave: [0, 0.862, 0],   // 貼在石身頂端（Top=0.840）稍微沉進去；0.755 會整個埋掉、0.945 會浮在半空
    Censer: c.censer === 'foot' ? [0, 0.335, 0.205] : c.censer === 'side' ? [0.215, 0.545, 0.135] : [0, 0.395, 0.225],
  };
  const chains = {
    body: ['Waist', 'Spine', 'Chest', 'Top'],
    mist: ['MistRoot', 'Mist1', 'Mist2', 'MistTip'],
  };
  const attach = { mist: 'Waist', Eave: 'Top', Censer: 'Spine' };
  const touch = [['body', 'mist']];

  const W = c.bodyW, Dp = c.bodyD;
  const volumes = [
    { chain: 'body', material: 'stone_body', sides: 12, faceted: true, smooth_angle: 26,
      caps: ['none', 'dome'], ring_step: 0.011,
      profile: [
        [0, Dp[0], W[0], { exp: c.kind === 'tablet' ? 5.4 : 4.9 }],
        [0.34, Dp[1], W[1], { exp: c.kind === 'tablet' ? 5.4 : 4.9, sharp: true }],
        [0.72, Dp[2], W[2], { exp: c.kind === 'tablet' ? 5.4 : 4.9, sharp: true }],
        [1, Dp[3], W[3], { exp: c.kind === 'tablet' ? 5.4 : 4.9 }],
      ],
      colors: { arcs: [
        { from: 250, to: 290, color: '#3d6e4e' },   // 正面一條苔痕（陰氣主色，一色定調）
        { from: 120, to: 155, color: '#2f342e' },
        { from: 20, to: 46, color: '#3d6e4e' },
      ] } },
    // haunt 硬條件：腰以下虛化（ghost_* 半透明，末端不落地）
    { chain: 'mist', material: 'ghost_ash', sides: 11, faceted: true, smooth_angle: 26,
      caps: ['none', 'dome'], ring_step: 0.013,
      profile: [
        [0, Dp[0] * 0.86, W[0] * 0.86, { exp: 4.8 }],
        [0.22, Dp[0] * 1.02, W[0] * 1.00, { exp: 4.8, sharp: true }],
        [0.55, Dp[0] * 0.72, W[0] * 0.70, { exp: 4.8 }],
        [0.82, Dp[0] * 0.36, W[0] * 0.34, { exp: 4.8, sharp: true }],
        [1, 0.012, 0.011, { exp: 4.8 }],
      ],
      colors: { arcs: [{ from: 40, to: 110, color: '#70b080' }, { from: 200, to: 250, color: '#4a534d' }] } },
  ];

  const parts = [];

  // ★ 特徵 1：方形黑龕口取代臉（近黑的內襯才讀成「洞」——bow _traps_3B ④）
  if (c.niche !== 'blank') {
    const s = c.niche === 'big' ? 1 : 0.62;
    parts.push({ type: 'fin', host: 'Chest', material: 'stone_dark', thickness: 0.030, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.010, Dp[2] * 0.90],
      points: [[-0.078 * s, -0.088 * s], [0.078 * s, -0.088 * s], [0.078 * s, 0.082 * s], [-0.078 * s, 0.082 * s]] });
    parts.push({ type: 'fin', host: 'Chest', material: 'stone_dark', thickness: 0.052, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.006, Dp[2] * 0.66],
      points: [[-0.060 * s, -0.076 * s], [0.060 * s, -0.076 * s], [0.060 * s, 0.066 * s], [-0.060 * s, 0.066 * s]] });
    // 龕口深處的一點暗紅餘火（材質名 mouth_glow，給 three.js 接 emissive）
    parts.push({ type: 'fin', host: 'Chest', material: 'mouth_glow', thickness: 0.018, smooth_angle: 22,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, -0.030 * s, Dp[2] * 0.52], points: polyN(7, 0.022 * s) });
    // 龕口外框（石）：上、左、右三條
    [[0, 0.098 * s, 0.088 * s, 0.016], [-0.096 * s, 0.006, 0.016, 0.100 * s], [0.096 * s, 0.006, 0.016, 0.100 * s]]
      .forEach(([dx, dy, hw, hh]) => parts.push({
        type: 'fin', host: 'Chest', material: 'stone_body', thickness: 0.034, smooth_angle: 20,
        udir: [1, 0, 0], vdir: [0, 1, 0], offset: [dx, dy, Dp[2] * 0.94],
        points: [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] }));
  } else {
    // 丙：碑面空白 —— 只有一圈淺淺的碑框，沒有字也沒有臉
    parts.push({ type: 'fin', host: 'Chest', material: 'stone_dark', thickness: 0.020, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.004, Dp[2] * 0.92],
      points: [[-0.098, -0.132], [0.098, -0.132], [0.098, 0.118], [-0.098, 0.118]] });
    parts.push({ type: 'fin', host: 'Chest', material: 'moss', thickness: 0.026, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.004, Dp[2] * 0.96],
      points: [[-0.082, -0.116], [0.082, -0.116], [0.082, 0.102], [-0.082, 0.102]] });
    parts.push({ type: 'fin', host: 'Chest', material: 'mouth_glow', thickness: 0.016, smooth_angle: 22,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, -0.058, Dp[2] * 1.00], points: polyN(6, 0.020) });
  }

  // ★ 特徵 2：朱瓦頂 —— 一排平行凸起的瓦壟＋兩端翹起的簷角（buoy ⑧：光滑的板一定被讀成斗笠）
  if (c.roof === true || c.roof === 'cap') {
    const kw = c.roof === 'cap' ? 0.66 : c.roof === 'crest' ? 0.86 : 1.0;
    // 屋面：四片外挑的薄板實測會在 foldCount 生 2 片翻面（拿掉任一片或縮小任一片都轉綠＝borderline
    // 的封口三角），改成「一片方屋面板＋七條瓦壟圓管」——瓦壟本來就是把屋頂跟斗笠分開的那件事
    //（buoy ⑧），少一層薄板反而更像瓦頂。
    parts.push({ type: 'fin', host: 'Eave', material: 'roof_tile', thickness: 0.030, smooth_angle: 18,
      udir: [1, 0, 0], vdir: [0, 0, 1], offset: [0, 0, 0],
      points: [[-0.150 * kw, -0.120 * kw], [-0.104 * kw, -0.152 * kw], [0.104 * kw, -0.152 * kw],
               [0.150 * kw, -0.120 * kw], [0.150 * kw, 0.120 * kw], [-0.150 * kw, 0.120 * kw]] });
    // ★ 瓦壟：七條平行凸稜（這是把「屋頂」跟「斗笠」分開的那件事）
    for (let i = 0; i < 7; i++) {
      const x = (-0.108 + i * 0.036) * kw;
      parts.push({ type: 'curve', host: 'Eave', material: 'roof_tile', sides: 5, smooth_angle: 20,
        offset: [x, 0.020, -0.112 * kw], dir: [0, 0.05, 1],
        segments: [{ len: 0.104 * kw, r: 0.021 * kw }, { len: 0.100 * kw, r: 0.019 * kw }] });
    }
    // 兩端翹起的簷角
    parts.push({ type: 'curve', host: 'Eave', material: 'roof_tile', sides: 5, smooth_angle: 20, mirrored: true,
      offset: [0.128 * kw, 0.006, 0.020], dir: [0.72, 0.36, 0.58],
      segments: [{ len: 0.060 * kw, r: 0.016 * kw }, { len: 0.046 * kw, r: 0.008 * kw, rise: 42, taper: true }] });
    // 正脊
    // 正脊：原本高 0.046／厚 0.034（高與厚同量級）→ 封口三角的頂點法線被側面壓過去，
    // bind pose 就判 2 片翻面。改成「高一點、薄一點」（高 0.088／厚 0.018）。
    parts.push({ type: 'fin', host: 'Eave', material: 'stone_dark', thickness: 0.018, smooth_angle: 18,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.038, 0],
      points: [[-0.134 * kw, -0.026], [-0.096 * kw, 0.062], [0.096 * kw, 0.062], [0.134 * kw, -0.026]] });
  }

  // ★ 特徵 4：繫腰的紅布 —— 窄帶橫繞一圈、正面打結、兩端垂下
  {
    // 回修 1：原本 udir 取徑向 → 每片是「從身上刺出去的板」，hero 上是一排紅刺不是一條布。
    // 改成 udir 取切向、vdir 取垂直，offset 放到表面上 → 板面貼著石身走，才讀得出是一條繞一圈的帶。
    const y = c.sash === 'sash' ? 0.070 : 0.028;
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = (-180 + i * (360 / N)) * D2R;
      const tilt = c.sash === 'sash' ? (i - N / 2) * 0.012 : 0;
      const rx = W[1] * 0.99 * Math.cos(a), rz = Dp[1] * 0.99 * Math.sin(a);
      const arc = (Math.PI * 2 / N) * Math.hypot(W[1], Dp[1]) * 0.62;
      parts.push({ type: 'fin', host: 'Spine', material: 'red_sash', thickness: 0.020, smooth_angle: 18,
        udir: [-Math.sin(a), 0, Math.cos(a)], vdir: [0, 1, 0], offset: [rx, y + tilt, rz],
        points: [[-arc, -0.024], [arc, -0.024], [arc, 0.024], [-arc, 0.024]] });
    }
    // 正面的結與兩條垂下的布尾
    parts.push({ type: 'fin', host: 'Spine', material: 'red_sash', thickness: 0.034, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, y, Dp[1] * 1.02], points: polyN(7, 0.033) });
    [[-0.030, -0.10, 8], [0.026, -0.14, -6]].forEach(([dx, dy, deg]) => {
      const t = deg * D2R;
      parts.push({ type: 'fin', host: 'Spine', material: 'red_sash', thickness: 0.014, smooth_angle: 18,
        udir: [Math.cos(t), Math.sin(t), 0], vdir: [-Math.sin(t), Math.cos(t), 0],
        offset: [dx, y + dy * 0.5, Dp[1] * 0.98],
        points: [[-0.026, -Math.abs(dy) * 0.6], [0.026, -Math.abs(dy) * 0.5], [0.030, Math.abs(dy) * 0.5], [-0.030, Math.abs(dy) * 0.5]] });
    });
  }

  // ★ 特徵 3：三足圓腹香爐＋兩支往上外翻的金捲耳（掛鬆散關節 Censer）
  parts.push({ type: 'fin', host: 'Censer', material: 'censer_iron', thickness: 0.086, smooth_angle: 24,
    udir: [1, 0, 0], vdir: [0, 1, 0], points: polyN(11, 0.082) });
  [1, -1].forEach(sx => parts.push({ type: 'curve', host: 'Censer', material: 'censer_ear', sides: 5, smooth_angle: 20,
    offset: [sx * 0.070, 0.018, 0], dir: [sx * 0.78, 0.62, 0],
    segments: [{ len: 0.040, r: 0.013 }, { len: 0.034, r: 0.009, rise: 46 }, { len: 0.026, r: 0.005, rise: 52, taper: true }] }));
  [-1, 0, 1].forEach(sx => parts.push({ type: 'curve', host: 'Censer', material: 'censer_iron', sides: 4, smooth_angle: 20,
    offset: [sx * 0.048, -0.068, sx === 0 ? -0.034 : 0.024], dir: [sx * 0.30, -1, sx === 0 ? -0.24 : 0.16],
    segments: [{ len: 0.038, r: 0.013 }, { len: 0.028, r: 0.008, taper: true }] }));
  // 爐口上的紅燭與燭火（整片灰綠濕暗裡唯一的暖點）
  parts.push({ type: 'fin', host: 'Censer', material: 'red_sash', thickness: 0.030, smooth_angle: 22,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0.034, 0.084, 0.006], points: polyN(6, 0.020) });
  parts.push({ type: 'spike', host: 'Censer', material: 'glow_wick', sides: 5,
    offset: [0.034, 0.110, 0.006], dir: [0.06, 1, 0], segments: [{ len: 0.042, r: 0.015 }] });

  // ★ 特徵 5：濕 —— 苔痕與從縫裡長出來的氣根／蕨（腰以下與石縫）
  for (let i = 0; i < 6; i++) {
    const a = (-120 + i * 44) * D2R;
    parts.push({ type: 'curve', host: 'Waist', material: 'ghost_wisp', sides: 4, smooth_angle: 22,
      offset: [W[0] * 0.62 * Math.cos(a), 0.012 + 0.01 * (i % 3), Dp[0] * 0.62 * Math.sin(a)],
      dir: [0.24 * Math.cos(a), -0.94, 0.24 * Math.sin(a)],
      segments: [{ len: 0.058 + 0.02 * (i % 3), r: 0.009 }, { len: 0.046, r: 0.004, taper: true }] });
  }
  parts.push({ type: 'fin', host: 'Waist', material: 'moss', thickness: 0.016, smooth_angle: 20, mirrored: true,
    udir: [0, 1, 0], vdir: [1, 0, 0], offset: [W[0] * 0.72, 0.040, 0.030], points: polyN(7, 0.034) });

  // 乙：斜插的枯骨束
  if (c.bones) {
    const set = [[0.74, 0.30, -0.26], [-0.66, 0.38, 0.34], [0.28, 0.24, 0.62], [-0.80, 0.16, -0.20], [0.10, 0.46, -0.60]];
    set.forEach(([dx, up, dz], i) => parts.push({
      type: 'curve', host: 'Spine', material: 'bone', sides: 5, smooth_angle: 22,
      offset: [dx * 0.10, 0.02 + 0.012 * i, dz * 0.10], dir: [dx, up, dz],
      segments: [{ len: 0.088 + 0.02 * (i % 3), r: 0.016 }, { len: 0.070, r: 0.011, rise: 12 },
                 { len: 0.052, r: 0.016, fall: 8 }] }));
    parts.push({ type: 'fin', host: 'Chest', material: 'bone', thickness: 0.040, smooth_angle: 22,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.020, 0.052, Dp[2] * 0.72], points: polyN(9, 0.044) });
  }
  // 丙：碑首（瓦頂形的圓額）與碑座
  if (c.tablet) {
    parts.push({ type: 'fin', host: 'Top', material: 'stone_body', thickness: 0.060, smooth_angle: 22,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.030, 0],
      points: [[-0.128, -0.030], [-0.090, 0.046], [0, 0.072], [0.090, 0.046], [0.128, -0.030]] });
    // 碑額：一條朱瓦色的窄帶壓在碑首下緣（roof_tile 在丙的落點；claims 的 part_exists 由這條滿足）
    parts.push({ type: 'fin', host: 'Top', material: 'roof_tile', thickness: 0.070, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, -0.012, 0],
      points: [[-0.136, -0.026], [0.136, -0.026], [0.136, 0.020], [-0.136, 0.020]] });
    parts.push({ type: 'curve', host: 'Top', material: 'roof_tile', sides: 5, smooth_angle: 20,
      offset: [0, 0.028, -0.052], dir: [0, 0.06, 1], segments: [{ len: 0.052, r: 0.016 }, { len: 0.048, r: 0.014 }] });
    parts.push({ type: 'fin', host: 'Waist', material: 'stone_dark', thickness: 0.104, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, -0.006, 0],
      points: [[-0.150, -0.036], [0.150, -0.036], [0.132, 0.030], [-0.132, 0.030]] });
  }

  const animations = {
    idle: { duration: 3.0, loop: true,
      _note: 'ART_BIBLE §3：陰氣＝hold＋突跳。石身停很久忽然跳一格，霧裾是連續的漂移——兩種拍子錯開。',
      tracks: {
        Waist: { ty: [[0, 0], [0.36, 0.003], [0.40, 0.026], [0.66, 0.022], [0.70, 0.004], [1, 0]] },
        Spine: { rx: [[0, -1], [0.40, -1], [0.44, 2.4], [0.80, 2], [0.84, -1], [1, -1]] },
        Chest: { rz: [[0, 1.4], [0.26, 1.4], [0.30, -3], [0.86, -2.6], [0.90, 1.4], [1, 1.4]] },
        MistRoot: { rz: [[0, 1.6], [0.5, -1.6], [1, 1.6]] },
        Mist1: { rz: [[0, -2.6], [0.35, 2.6], [0.7, -1.4], [1, -2.6]], ry: [[0, 3.4], [0.5, -3.4], [1, 3.4]] },
        Mist2: { rz: [[0, 2.6], [0.5, -3.4], [1, 2.6]] },
      } },
    move: { duration: 1.2, loop: true,
      _note: '飄移：位移放在根鏈根關節 Waist 的 ty/tz（放中段會 anim_integrity 撕皮）；上下半身拍子刻意不同步。',
      tracks: {
        Waist: { ty: [[0, 0], [0.22, 0.042], [0.48, 0.006], [0.72, 0.040], [1, 0]], tz: [[0, 0], [0.5, 0.030], [1, 0]] },
        Spine: { rx: [[0, 3], [0.5, -3], [1, 3]] },
        Chest: { rx: [[0, -3], [0.55, 3], [1, -3]] },
        MistRoot: { rx: [[0, -6], [0.5, 5], [1, -6]] },
        Mist1: { rx: [[0, 8], [0.4, -7], [0.8, 6], [1, 8]] },
        Mist2: { rx: [[0, -9], [0.5, 9], [1, -9]], rz: [[0, 4], [0.5, -4], [1, 4]] },
      } },
    attack: { duration: 0.9, loop: false,
      _note: '招式「有求必應」：陰氣＝attack 前有一拍靜止（0→0.20）。之後龕口整個往前壓過去、紅布甩出、霧裾慢半拍才追上。',
      tracks: {
        Waist: { tz: [[0, 0], [0.20, 0], [0.34, -0.050], [0.62, 0.235], [1, 0]],
                 ty: [[0, 0], [0.20, 0], [0.34, 0.036], [0.62, -0.018], [1, 0]] },
        Spine: { rx: [[0, 0], [0.20, 0], [0.34, -7], [0.62, 13], [1, 0]] },
        Chest: { rx: [[0, 0], [0.20, 0], [0.34, -9], [0.62, 17], [1, 0]] },
        Top: { rx: [[0, 0], [0.20, 0], [0.34, -6], [0.62, 12], [1, 0]], ry: [[0, 0], [0.38, 11], [0.72, -12], [1, 0]] },
        MistRoot: { rx: [[0, 0], [0.36, 9], [0.66, -11], [1, 0]] },
        Mist1: { rx: [[0, 0], [0.40, -8], [0.70, 10], [1, 0]] },
        Mist2: { rx: [[0, 0], [0.46, 8], [0.76, -9], [1, 0]] },
      } },
  };

  return {
    name: `有應公 youyinggong (yinqi/haunt) ${key}`,
    _variant: c.note,
    _brief: '有應公：沒有臉的路旁小祠，紅布繫腰、下半身化成香灰霧。haunt×2。系別色帶＝陰氣青:苔痕石身；發光部位 mouth_glow,glow_wick。',
    _ref: 'docs/experiments/2026-09-07-ref-youyinggong.md（5 條一眼特徵）',
    _haunt_skeleton: 'redhat._haunt_skeleton 同法：body 由腰往上（Waist→Spine→Chest→Top）、mist 由腰往下（MistRoot→Mist1→Mist2→MistTip）掛在 Waist，沒有腿鏈；腰以下全部 ghost_* 材質，mist 末端停在 y≈0.10 不落地，idle/move 的位移放在 Waist 的 ty。',
    _loose_joints: 'Eave（瓦頂）與 Censer（香爐）是鬆散關節，attach 掛在 Top／Spine：外挑的瓦簷與離身體有距離的香爐每個頂點都在石身角半徑之外，掛 chain 關節必觸發 part_attachment（同 bow _loose_joints）。代價＝這兩件的貼合沒有機器在守。',
    _traps_inherited: 'buoy ⑧（戴在頭上、寬於頭的物件一律落進帽／笠語意場）→ 屋頂靠七條平行瓦壟＋兩端翹起的簷角，不靠把板做大；bow _traps_3B ④（近黑內襯＝洞、亮內襯＝器官）→ 龕口內裡近黑，只在深處留一小點暗紅；bow _traps ①（近黑一律中性灰）。',
    palette: palette(), build: 'rigid', shading: shading(), smooth_angle: 26,
    joints, chains, attach, touch, volumes, parts, animations,
  };
}

for (const key of Object.keys(CFG)) {
  const spec = build(key);
  fs.writeFileSync(path.join(OUT, key + '.json'), JSON.stringify(spec, null, 1));
  console.log('wrote', key, 'parts=', spec.parts.length);
}

const claims = (key) => ({
  name: `有應公 youyinggong ${key} (yinqi/haunt)`,
  _role: 'judge.mjs 的機械檢查清單。識別視角＝正視（front）——龕口／碑面／紅布結都在正面。saturation 帶沿用凍結檔的 10%–60%；tri 上限 8000。',
  _frozen_at: '動手編譯之前寫定（與 spec 同一支產生器、同一次執行）。',
  claims: [
    { type: 'part_exists', part: 'stone_body', stage: 'MID', label: '苔石身必須存在' },
    { type: 'part_exists', part: 'ghost_ash', stage: 'MID', label: 'haunt 硬條件：腰以下的半透明香灰霧必須存在，材質名必須以 ghost_ 開頭' },
    { type: 'part_exists', part: 'red_sash', stage: 'MID', label: '★ 特徵 4：繫腰的紅布必須存在' },
    { type: 'part_exists', part: 'roof_tile', stage: 'MID', label: '★ 特徵 2：朱瓦必須存在' },
    { type: 'part_exists', part: 'censer_iron', stage: 'MID', label: '★ 特徵 3：香爐必須存在' },
    { type: 'part_exists', part: 'censer_ear', stage: 'MID', label: '★ 特徵 3：香爐的金捲耳必須存在（沒有耳就只是一個罐子）' },
    { type: 'part_exists', part: 'mouth_glow', stage: 'MID', label: '龕口深處的餘火必須存在，材質名必須正是 mouth_glow' },
    { type: 'part_exists', part: 'glow_wick', stage: 'MID', label: '燭火必須存在，材質名必須正是 glow_wick' },
    { type: 'part_signature', part: 'stone_body', view: 'front', min_share: 0.18, or_min_span: 0.18, stage: 'MID', label: '招牌質量（石身）在識別視角要撐得起面積或跨距' },
    { type: 'part_visible', part: 'red_sash', view: 'front', min_share: 0.015, stage: 'MID', label: '★ 特徵 4 的機械化：紅布在正視必須量得到——那是整尊唯一刺眼的紅' },
    { type: 'part_visible', part: 'ghost_ash', view: 'front', min_share: 0.06, stage: 'MID', label: 'haunt 下半身虛化必須量得到（不是一條細尾巴）' },
    { type: 'part_visible', part: 'censer_iron', view: 'front', min_share: 0.008, stage: 'MID', label: '★ 特徵 3 的機械化：香爐在正視必須量得到' },
    { type: 'focal_contrast', a: 'stone_body', b: 'glow_wick', min_ratio: 3, view: 'front', stage: 'MID', label: '兩個焦點（石身／燭火）不得等重相爭' },
    { type: 'style_dark', view: 'front', max_median_lum: 100, stage: 'MID', label: '深底：濕黑的東西在識別視角也要讀得出是暗的' },
    { type: 'rig_skinned', stage: 'HIGH', label: '必須是蒙皮模型' },
    { type: 'anim_named', names: ['idle', 'move', 'attack'], stage: 'HIGH', label: '三支動畫齊備' },
    { type: 'saturation_area', view: 'tq', min: 0.10, max: 0.60, stage: 'HIGH', label: '高飽和面積落在 10%–60%' },
    { type: 'tri_budget', min: 1200, max: 8000, stage: 'LOW', label: '三角形預算（09-04 19:30 預算制上限 8000）' },
  ],
});
for (const key of Object.keys(CFG))
  fs.writeFileSync(path.join(OUT, key + '.claims.json'), JSON.stringify(claims(key), null, 1));
console.log('claims written');
