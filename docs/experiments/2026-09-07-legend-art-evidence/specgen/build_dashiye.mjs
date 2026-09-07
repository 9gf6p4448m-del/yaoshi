// 大士爺紙尊 dashiye（香火／ward）三方案 spec 產生器
// r1a 高瘦紙紮鬼王頭頂小觀音 ／ r1b 方正紙紮牌樓體 ／ r1c 吐舌大頭
// 依 docs/experiments/2026-09-07-ref-dashiye.md 五條特徵。
// ward 硬條件：正面寬 ≥ 側面寬 —— 直立主鏈下 profile 的 a 是 Z（前後厚）、b 是 X（左右寬）
//（wangchuan _traps ⑧ 的另一面），所以「紙是扁的」與 ward 條件同向：a 小、b 大。
import fs from 'node:fs';
import path from 'node:path';
const OUT = 'tools/anyCreature/out/dashiye';
fs.mkdirSync(OUT, { recursive: true });
const D2R = Math.PI / 180;

const polyN = (n, r, phase = 0) => Array.from({ length: n }, (_, i) => {
  const a = phase + (2 * Math.PI * i) / n;
  return [+(r * Math.cos(a)).toFixed(5), +(r * Math.sin(a)).toFixed(5)];
});

const palette = () => ({
  paper_ink: { color: '#332f2a', rough: 0.96 },   // 紙紮本體（中性暗，S=0.14）
  paper_red: { color: '#a8282c', rough: 0.9 },    // 硃紅（香火主色，只落在一條帶上）
  paper_gold: { color: '#c8912e', rough: 0.55 },  // 鎏金／剪刀鋸齒滾邊
  paper_ash: { color: '#b4ada0', rough: 0.94 },   // 香灰白（中性）
  face_teal: { color: '#3f605b', rough: 0.88 },   // 青面（去飽和到 S=0.34：頭是支撐質量不是招牌色）
  tongue: { color: '#b0333f', rough: 0.7 },       // 垂到胸腹的長舌
  fang: { color: '#e0d6bb', rough: 0.5 },
  shrine_box: { color: '#b4ada0', rough: 0.9 },   // 頭頂小龕（香灰白紙）
  mirror_plate: { color: '#2b3a38', rough: 0.6 }, // 胸腹獸面護心鏡
  eye: { color: '#ffd066', rough: 0.1 },
  glow_censer: { color: '#ff8f2e', rough: 0.25 },
});

const shading = () => ({ gradient: { top: 0.28, bottom: -0.84 }, noise: { size: 0.016, amount: 0.24 } });

// ---- 三方案參數 ----------------------------------------------------------
const CFG = {
  r1a: { // 高瘦鬼王
    note: '甲：高瘦的紙紮鬼王——窄長身、火焰形鋸齒背光張在頭兩側、頭頂立一座小龕，長舌垂到胸口。',
    bodyW: [0.150, 0.128, 0.118, 0.146, 0.158, 0.120], bodyD: [0.062, 0.052, 0.046, 0.052, 0.058, 0.046],
    headR: 0.086, headW: 0.100, tongueLen: 1.0, shrine: 'pagoda', flame: 1.0, hemY: 0.13,
    armSpan: 0.20, roof: false, pillars: false,
  },
  r1b: { // 方正牌樓體
    note: '乙：整尊是一座紙紮牌樓——方正寬扁的身、三層外挑的簷、兩根紅柱當腿，臉嵌在牌樓正中的門洞裡。',
    bodyW: [0.235, 0.222, 0.238, 0.252, 0.246, 0.196], bodyD: [0.058, 0.052, 0.050, 0.054, 0.056, 0.050],
    headR: 0.072, headW: 0.086, tongueLen: 0.8, shrine: 'gate', flame: 0.55, hemY: 0.11,
    armSpan: 0.26, roof: true, pillars: true,
  },
  r1c: { // 吐舌大頭
    note: '丙：頭佔掉近一半全高的大頭紙尊——青臉、舌一路垂到膝，兩支外捲的金角把輪廓拉到身寬兩倍。',
    bodyW: [0.132, 0.112, 0.104, 0.126, 0.140, 0.104], bodyD: [0.056, 0.048, 0.044, 0.048, 0.052, 0.042],
    headR: 0.132, headW: 0.156, tongueLen: 1.9, shrine: 'small', flame: 0.8, hemY: 0.12,
    armSpan: 0.17, roof: false, pillars: false,
  },
};

function build(key) {
  const c = CFG[key];
  const H = c.headR;

  const joints = {
    Foot: [0, 0.055, 0],
    Hips: { from: 'Foot', up: 0.145 },
    Waist: { from: 'Hips', up: 0.112 },
    Chest: { from: 'Waist', up: 0.152 },
    Shoulder: { from: 'Chest', up: 0.090 },
    Neck: { from: 'Shoulder', up: 0.062 },
    HeadRoot: { from: 'Neck', up: 0.014 },
    Skull: { from: 'HeadRoot', up: H * 0.80 },
    Brow: { from: 'Skull', up: H * 0.56 },
    Crown: { from: 'Brow', up: H * 0.40 },
    JawRoot: { from: 'Skull', up: -H * 0.22, fwd: H * 0.30 },
    Jaw1: { from: 'JawRoot', up: -H * 0.16, fwd: H * 0.52 },
    JawTip: { from: 'Jaw1', up: -H * 0.06, fwd: H * 0.34 },
    TongueRoot: { from: 'Jaw1', up: -0.002, fwd: 0.002 },   // 埋在下顎裡（root_containment）
    Tong1: { from: 'TongueRoot', up: -0.095 * c.tongueLen, fwd: 0.030 },
    Tong2: { from: 'Tong1', up: -0.118 * c.tongueLen, fwd: 0.010 },
    Tong3: { from: 'Tong2', up: -0.078 * c.tongueLen, fwd: -0.014 },
    ShrineRoot: { from: 'Brow', up: H * 0.16 },   // 埋在 Brow→Crown 之間的頭裡，不放在收細的 Crown 上
    Shr1: { from: 'ShrineRoot', up: 0.056 },
    Shr2: { from: 'Shr1', up: 0.042 },
    Shr3: { from: 'Shr2', up: 0.030 },
    Eave: [0, 0.686 + 1.52 * H, 0],   // 鬆散關節：小龕的簷（外挑板咬不到箱體，掛 chain 關節必 BLOCK）
    ...(c.roof ? { Roof: [0, 0.82, 0] } : {}),   // 鬆散關節：寬簷掛在頭頂之上（原本 0.60 落在頸高，與肩飄帶互穿）
  };
  const chains = {
    body: ['Foot', 'Hips', 'Waist', 'Chest', 'Shoulder', 'Neck'],
    head: ['HeadRoot', 'Skull', 'Brow', 'Crown'],
    jaw: ['JawRoot', 'Jaw1', 'JawTip'],
    tongue: ['TongueRoot', 'Tong1', 'Tong2', 'Tong3'],
    shrine: ['ShrineRoot', 'Shr1', 'Shr2', 'Shr3'],
  };
  const attach = { head: 'Neck', jaw: 'Skull', tongue: 'Jaw1', shrine: 'Crown', Eave: 'Crown', ...(c.roof ? { Roof: 'Neck' } : {}) };
  const touch = [['body', 'head'], ['head', 'jaw'], ['jaw', 'tongue'], ['head', 'shrine']];

  const W = c.bodyW, Dp = c.bodyD;
  const volumes = [
    { chain: 'body', material: 'paper_ink', sides: 12, faceted: true, smooth_angle: 26,
      caps: ['dome', 'none'], ring_step: 0.012,
      // a=Z（前後厚，小）／b=X（左右寬，大）→ 正面寬 ≥ 側面寬，同時就是「紙是扁的」
      profile: [
        [0, Dp[0], W[0], { exp: 5.0 }],
        [0.20, Dp[1], W[1], { exp: 5.0, sharp: true }],
        [0.42, Dp[2], W[2], { exp: 5.0 }],
        [0.63, Dp[3], W[3], { exp: 5.0, sharp: true }],
        [0.83, Dp[4], W[4], { exp: 5.0, sharp: true }],
        [1, Dp[5], W[5], { exp: 5.0 }],
      ],
      colors: { arcs: [
        { from: 258, to: 282, color: '#a8282c' },   // 正面一條硃紅帶（一色定調，收窄到 24°）
        { from: 70, to: 110, color: '#4e4740' },
        { from: 160, to: 200, color: '#4a443c' },
      ] } },
    { chain: 'head', material: 'face_teal', sides: 11, faceted: true, smooth_angle: 26,
      caps: ['none', 'dome'], ring_step: 0.010,
      profile: [
        [0, H * 0.42, H * 0.52, { exp: 4.8 }],
        [0.24, H * 0.62, c.headW, { exp: 4.8, sharp: true }],
        [0.58, H * 0.60, c.headW * 0.96, { exp: 4.8 }],
        [0.82, H * 0.44, c.headW * 0.72, { exp: 4.8, sharp: true }],
        [1, H * 0.24, c.headW * 0.40, { exp: 4.8 }],
      ],
      colors: { arcs: [{ from: 260, to: 280, color: '#c8912e' }, { from: 165, to: 195, color: '#33504c' }] } },
    { chain: 'jaw', material: 'face_teal', sides: 9, faceted: true, smooth_angle: 26,
      caps: ['none', 'dome'], ring_step: 0.009,
      profile: [
        [0, H * 0.34, H * 0.50, { exp: 4.8 }],
        [0.48, H * 0.32, H * 0.46, { exp: 4.8, sharp: true }],
        [1, H * 0.18, H * 0.26, { exp: 4.8 }],
      ] },
    // ★ 特徵 2：一條扁平的長舌（a=Z 很薄、b=X 較寬 → 是一片垂下來的東西，不是舌尖）
    { chain: 'tongue', material: 'tongue', sides: 8, faceted: true, smooth_angle: 24,
      caps: ['none', 'dome'], ring_step: 0.010,
      profile: [
        // 根環半徑跟著頭尺寸縮放，否則小頭方案（r1b H=0.072）的舌根撐破下顎（root_containment）
        [0, H * 0.15, H * 0.32, { exp: 5.0 }],
        [0.26, 0.016, 0.044, { exp: 5.0, sharp: true }],
        [0.68, 0.014, 0.038, { exp: 5.0 }],
        [1, 0.008, 0.018, { exp: 5.0 }],
      ] },
    // ★ 特徵 3：頭頂正中的小龕
    { chain: 'shrine', material: 'shrine_box', sides: 8, faceted: true, smooth_angle: 22,
      caps: ['none', 'dome'], ring_step: 0.009,
      // 回修 1：原本是「越往上越細」的錐體 → 三張 hero 一致讀成灰色尖帽。改成方箱：
      // 側壁近乎等寬（b 幾乎不變）到 t=0.80 才收，箱頂另外掛一片外挑的簷（見 parts）。
      profile: (() => { const k = c.shrine === 'gate' ? 1.32 : c.shrine === 'small' ? 0.74 : 1.0;
        const a = 0.040 * k, b = 0.056 * k;
        return [[0, a * 0.45, b * 0.45, { exp: 5.4 }], [0.24, a, b, { exp: 5.4, sharp: true }],
                [0.80, a * 0.97, b * 0.97, { exp: 5.4, sharp: true }], [1, a * 0.34, b * 0.34, { exp: 5.4 }]]; })(),
      colors: { arcs: [{ from: 258, to: 282, color: '#c8912e' }] } },
  ];

  const parts = [];
  // ★ 特徵 4：沿袍緣一路排下去的剪刀鋸齒滾邊（紙的證據＝實體剪邊，不做表面質感）
  for (let i = 0; i < 11; i++) {
    const th = (-100 + i * 20) * D2R;                    // 繞正面半圈
    const rx = W[0] * 0.98 * Math.cos(th), rz = Dp[0] * 0.98 * Math.sin(th);
    parts.push({ type: 'fin', host: 'Foot', material: 'paper_gold', thickness: 0.010, smooth_angle: 18,
      udir: [Math.cos(th), 0, Math.sin(th)], vdir: [0, 1, 0],
      offset: [rx * 0.55, c.hemY, rz * 0.55],
      points: [[-0.02, -0.028], [0.055, -0.006], [0.055, 0.006], [-0.02, 0.028]] });
  }
  // 腰上第二排鋸齒（金／紅交錯，平塗色塊硬邊相鄰）
  for (let i = 0; i < 7; i++) {
    const th = (-72 + i * 24) * D2R;
    parts.push({ type: 'fin', host: 'Waist', material: i % 2 ? 'paper_red' : 'paper_gold',
      thickness: 0.009, smooth_angle: 18,
      udir: [Math.cos(th), 0, Math.sin(th)], vdir: [0, 1, 0],
      offset: [W[2] * 0.5 * Math.cos(th), 0.01, Dp[2] * 0.5 * Math.sin(th)],
      points: [[-0.015, -0.022], [0.046, -0.005], [0.046, 0.005], [-0.015, 0.022]] });
  }
  // ★ 特徵 5：胸腹正中的獸面護心鏡（暗底＋金框＋白牙）
  parts.push({ type: 'fin', host: 'Chest', material: 'paper_gold', thickness: 0.016, smooth_angle: 24,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.052 - W[3] * 0.10, -0.030, Dp[3] * 0.86], points: polyN(12, 0.058) });
  parts.push({ type: 'fin', host: 'Chest', material: 'mirror_plate', thickness: 0.022, smooth_angle: 24,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.052 - W[3] * 0.10, -0.030, Dp[3] * 0.90], points: polyN(11, 0.044) });
  parts.push({ type: 'fin', host: 'Chest', material: 'fang', thickness: 0.024, smooth_angle: 20,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [-0.052 - W[3] * 0.10, -0.048, Dp[3] * 0.92],
    points: [[-0.030, -0.006], [-0.014, -0.014], [0.014, -0.014], [0.030, -0.006], [0.020, 0.010], [-0.020, 0.010]] });
  // 普渡的香爐火（招式演出的落點；材質名 glow_censer 給 three.js 接 emissive）
  parts.push({ type: 'fin', host: 'Waist', material: 'glow_censer', thickness: 0.026, smooth_angle: 22,
    udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0.056 + W[2] * 0.12, -0.030, Dp[2] * 1.02], points: polyN(7, 0.032) });

  // ★ 特徵 1：頭部總成——火焰形鋸齒背光，把輪廓撐到身寬兩倍
  const flameN = 9;
  for (let i = 0; i < flameN; i++) {
    const th = (18 + i * 18) * D2R;                        // 由右往左繞過頭頂
    const L = (0.085 + 0.075 * Math.sin(Math.PI * i / (flameN - 1))) * c.flame + H * 0.5;
    parts.push({ type: 'fin', host: 'Brow', material: i % 2 ? 'paper_red' : 'paper_gold',
      thickness: 0.012, smooth_angle: 18,
      udir: [Math.cos(th), Math.sin(th), 0], vdir: [-Math.sin(th), Math.cos(th), 0],
      offset: [0, -H * 0.15, -0.006],
      points: [[H * 0.5, -0.036], [H * 0.5 + L, -0.007], [H * 0.5 + L, 0.007], [H * 0.5, 0.036]] });
  }
  // 回修 1：小龕的方頂——一片外挑的簷（兩端翹起）＋兩支尖立飾＋正面一個近黑的龕口，
  // 讓它讀成「一座小龕」而不是「一頂帽子」（ref 特徵 3）。
  {
    const k = c.shrine === 'gate' ? 1.32 : c.shrine === 'small' ? 0.74 : 1.0;
    // part_attachment 量的是「所有頂點到鏈心的最小距離 − 該環最大半徑」。一整片四角外挑的簷，
    // 每個頂點都在箱體的角半徑之外 → 必浮空。改成四片各自從箱體「裡面」(u=-0.03) 往外挑的簷板，
    // 內側頂點埋在箱體內，機械上就咬得住（同 wangchuan _traps ⑨ 的預測法）。
    const eave = (dy, out, w, mat, th) => {
      for (const a of [0, 90, 180, 270]) {
        const r = a * D2R;
        parts.push({ type: 'fin', host: 'Eave', material: mat, thickness: th, smooth_angle: 18,
          udir: [Math.cos(r), 0, Math.sin(r)], vdir: [-Math.sin(r), 0, Math.cos(r)], offset: [0, dy, 0],
          points: [[-0.046 * k, -w], [out, -w * 0.58], [out, w * 0.58], [-0.046 * k, w]] });
      }
    };
    eave(0.010, 0.086 * k, 0.070 * k, 'paper_gold', 0.014);
    eave(0.034, 0.058 * k, 0.050 * k, 'paper_red', 0.012);
    parts.push({ type: 'spike', host: 'Shr3', material: 'paper_gold', sides: 4, mirrored: true,
      offset: [0.036 * k, -0.006, 0], dir: [0.18, 1, 0], segments: [{ len: 0.042 * k, r: 0.007 }] });
    parts.push({ type: 'fin', host: 'Shr1', material: 'paper_ink', thickness: 0.020, smooth_angle: 20,
      udir: [1, 0, 0], vdir: [0, 1, 0], offset: [0, 0.004, 0.052 * k],
      points: [[-0.020 * k, -0.026 * k], [0.020 * k, -0.026 * k], [0.020 * k, 0.026 * k], [-0.020 * k, 0.026 * k]] });
  }
  // 兩支向上外捲的金角（ref 特徵 1 的另一半）
  parts.push({ type: 'curve', host: 'Skull', material: 'paper_gold', sides: 6, smooth_angle: 22, mirrored: true,
    offset: [c.headW * 0.72, H * 0.22, -0.004], dir: [0.72, 0.62, -0.31],
    segments: [{ len: 0.055 + H * 0.3, r: 0.020 }, { len: 0.048 + H * 0.25, r: 0.014, rise: 30 },
               { len: 0.038, r: 0.007, rise: 40, taper: true }] });
  // 兩條甩出去的飄帶（寬扁，長寬比 ≤2 —— bow _traps_3B ③）
  parts.push({ type: 'fin', host: 'Shoulder', material: 'paper_red', thickness: 0.010, smooth_angle: 20, mirrored: true,
    udir: [0.94, 0.34, 0], vdir: [-0.34, 0.94, 0], offset: [W[4] * 0.5, 0.01, -0.01],
    points: [[0, -0.058], [c.armSpan * 0.62, -0.050], [c.armSpan, -0.012], [c.armSpan, 0.030], [c.armSpan * 0.55, 0.056], [0, 0.052]] });
  // 眼（不帶 anchor，走 host+face/spread/height —— redhat 的 type:eye 註記）
  parts.push({ type: 'eye', host: 'Brow', material: 'eye', size: 0.020 + H * 0.06,
    face: c.headR * 0.62, spread: c.headW * 0.46, height: -H * 0.10 });
  // 獠牙
  parts.push({ type: 'spike', host: 'Jaw1', material: 'fang', sides: 5, mirrored: true,
    offset: [H * 0.26, H * 0.10, H * 0.10], dir: [0.22, 0.94, 0.26],
    segments: [{ len: 0.028 + H * 0.16, r: 0.011 }] });

  if (c.roof) {   // 乙：三層外挑的簷
    [[0.020, 1.00], [0.062, 0.84], [0.100, 0.66]].forEach(([dy, k], i) => {
      const halfW = W[5] * (1.35 - 0.16 * i), halfD = Dp[5] * 2.0;
      parts.push({ type: 'fin', host: 'Roof', material: i === 1 ? 'paper_red' : 'paper_ink',
        thickness: 0.018, smooth_angle: 20, udir: [1, 0, 0], vdir: [0, 0, 1], offset: [0, dy, 0],
        points: [[-halfW * k, -halfD], [-halfW * k * 0.82, -halfD * 1.35], [halfW * k * 0.82, -halfD * 1.35],
                 [halfW * k, -halfD], [halfW * k, halfD], [-halfW * k, halfD]] });
      parts.push({ type: 'fin', host: 'Roof', material: 'paper_gold', thickness: 0.012, smooth_angle: 18, mirrored: true,
        udir: [0.88, 0.48, 0], vdir: [-0.48, 0.88, 0], offset: [halfW * k * 0.98, dy, 0],
        points: [[0, -0.012], [0.055, -0.004], [0.052, 0.020], [0, 0.016]] });
    });
  }
  if (c.pillars) {  // 乙：兩根紅柱當腿
    parts.push({ type: 'curve', host: 'Foot', material: 'paper_red', sides: 6, smooth_angle: 22, mirrored: true,
      offset: [W[0] * 0.62, 0.02, 0], dir: [0.08, -1, 0],
      segments: [{ len: 0.048, r: 0.030 }, { len: 0.036, r: 0.026 }] });
  }
  // 丙的大頭要一副寬肩托著，不然頭會像插在竿子上
  if (key === 'r1c') {
    parts.push({ type: 'fin', host: 'Shoulder', material: 'paper_ash', thickness: 0.020, smooth_angle: 22,
      udir: [1, 0, 0], vdir: [0, 0, 1], offset: [0, 0.012, 0],
      points: [[-0.150, -0.040], [-0.110, -0.062], [0.110, -0.062], [0.150, -0.040], [0.150, 0.040], [-0.150, 0.040]] });
  }

  const animations = {
    idle: { duration: 2.7, loop: true,
      _note: 'ART_BIBLE §1：香火＝緩慢、有拍子，像抬轎。對稱擺；舌與飄帶滯後半拍。',
      tracks: {
        Waist: { rz: [[0, -1.4], [0.5, 1.4], [1, -1.4]] },
        Chest: { rz: [[0, 1.2], [0.5, -1.2], [1, 1.2]] },
        HeadRoot: { rz: [[0, 1.8], [0.5, -1.8], [1, 1.8]], rx: [[0, 1], [0.5, -1], [1, 1]] },
        TongueRoot: { rx: [[0, 4], [0.55, -5], [1, 4]] },
        Tong1: { rx: [[0, -5], [0.62, 6], [1, -5]] },
        Tong2: { rx: [[0, 5], [0.7, -6], [1, 5]] },
        ShrineRoot: { rz: [[0, -1.2], [0.5, 1.2], [1, -1.2]] },
      } },
    move: { duration: 1.5, loop: true,
      _note: '抬轎的拍子：位移放在根鏈根關節 Foot 的 ty；上身左右擺，舌與飄帶慢半拍。',
      tracks: {
        Foot: { ty: [[0, 0], [0.25, 0.020], [0.5, 0], [0.75, 0.018], [1, 0]], tz: [[0, 0], [0.5, 0.026], [1, 0]] },
        Hips: { rz: [[0, -3.5], [0.5, 3.5], [1, -3.5]] },
        Chest: { rz: [[0, 3], [0.5, -3], [1, 3]] },
        HeadRoot: { rz: [[0, -4], [0.52, 4], [1, -4]] },
        TongueRoot: { rx: [[0, 8], [0.5, -9], [1, 8]] },
        Tong1: { rx: [[0, -10], [0.56, 11], [1, -10]] },
        Tong2: { rx: [[0, 9], [0.64, -10], [1, 9]] },
      } },
    attack: { duration: 0.95, loop: false,
      _note: '招式「普渡」：香火＝先蓄後落。前 0.3 整尊下沉蓄力，再把紙軀往上抬、雙臂飄帶盪起、舌甩向前。',
      tracks: {
        Foot: { ty: [[0, 0], [0.30, -0.045], [0.58, 0.075], [1, 0]], tz: [[0, 0], [0.30, -0.030], [0.60, 0.185], [1, 0]] },
        Hips: { rx: [[0, 0], [0.30, 8], [0.60, -13], [1, 0]] },
        Chest: { rx: [[0, 0], [0.30, 7], [0.60, -11], [1, 0]] },
        Shoulder: { rx: [[0, 0], [0.30, 6], [0.60, -9], [1, 0]] },
        HeadRoot: { rx: [[0, 0], [0.30, 9], [0.62, -14], [1, 0]] },
        JawRoot: { rx: [[0, 0], [0.34, -6], [0.58, 22], [0.8, 4], [1, 0]] },
        TongueRoot: { rx: [[0, 0], [0.30, -12], [0.58, 34], [1, 0]] },
        Tong1: { rx: [[0, 0], [0.34, -10], [0.62, 30], [1, 0]] },
        Tong2: { rx: [[0, 0], [0.38, -8], [0.66, 26], [1, 0]] },
        ShrineRoot: { rx: [[0, 0], [0.30, 6], [0.62, -10], [1, 0]] },
      } },
  };

  return {
    name: `大士爺紙尊 dashiye (xianghuo/ward) ${key}`,
    _variant: c.note,
    _brief: '大士爺紙尊：竹骨紙糊的鬼王，青臉垂長舌、頭頂一座小紙龕。ward×1，正面寬 ≥ 側面寬。系別色帶＝香火橘:鋸齒滾邊；發光部位 eye,glow_censer。',
    _ref: 'docs/experiments/2026-09-07-ref-dashiye.md（5 條一眼特徵）',
    _ward_recipe: '直立主鏈下 profile 的 a＝Z（前後厚）、b＝X（左右寬）。紙紮本來就扁，所以 a 取 0.044–0.062、b 取 0.104–0.252 → 正面寬是側面寬的 2.3–4.5 倍，ward 硬條件與「紙的證據」同一件事。',
    _paper_language: '「紙」不做表面質感（wuying 紙紮感 0/8 同族風格牆）。三件幾何訊號：① 袍緣與腰各一排實體剪刀鋸齒 fin ② 扁 ③ 平塗色塊硬邊相鄰（faceted＋arcs 窄帶，不做漸層）。鋸齒一律用與底色明度差大的金／紅，不用黑齒（wangchuan _traps ⑩：暗底上的黑鋸齒被讀成火焰或羽毛）。',
    _glow_materials: 'eye／glow_censer —— 簡報指定的兩個，原樣出現在 GLB materials。護心鏡刻意叫 mirror_plate 而不是 eye_plate，避開 js/creature-figures.js:51 的 /^eye(_|$)/。',
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
  name: `大士爺紙尊 dashiye ${key} (xianghuo/ward)`,
  _role: 'judge.mjs 的機械檢查清單。識別視角＝正視（front）——ward 正面寬 ≥ 側面寬，紙紮的臉與滾邊都在正面。基底＝wangchuan/flag claims；saturation 帶沿用凍結檔的 10%–60%；tri 上限 8000。',
  _frozen_at: '動手編譯之前寫定（與 spec 同一支產生器、同一次執行）。',
  claims: [
    { type: 'part_exists', part: 'paper_ink', stage: 'MID', label: '紙紮軀體必須存在' },
    { type: 'part_exists', part: 'paper_gold', stage: 'MID', label: '系別色帶＝剪刀鋸齒滾邊必須存在' },
    { type: 'part_exists', part: 'tongue', stage: 'MID', label: '★ 特徵 2：垂到胸腹的長舌必須存在' },
    { type: 'part_exists', part: 'shrine_box', stage: 'MID', label: '★ 特徵 3：頭頂小龕必須存在' },
    { type: 'part_exists', part: 'mirror_plate', stage: 'MID', label: '★ 特徵 5：胸腹獸面護心鏡必須存在' },
    { type: 'part_exists', part: 'eye', stage: 'MID', label: '發光眼必須存在，材質名必須正是 eye' },
    { type: 'part_exists', part: 'glow_censer', stage: 'MID', label: '普渡香爐火必須存在，材質名必須正是 glow_censer' },
    { type: 'part_signature', part: 'paper_ink', view: 'front', min_share: 0.20, or_min_span: 0.20, stage: 'MID', label: '招牌質量（紙軀）在識別視角要撐得起面積或跨距' },
    { type: 'part_visible', part: 'tongue', view: 'front', min_share: 0.008, stage: 'MID', label: '★ 特徵 2 的機械化：長舌在正視必須量得到——看不見舌就只是一尊神像' },
    { type: 'part_visible', part: 'shrine_box', view: 'front', min_share: 0.006, stage: 'MID', label: '★ 特徵 3 的機械化：頭頂小龕必須量得到' },
    { type: 'part_visible', part: 'paper_gold', view: 'front', min_share: 0.020, stage: 'MID', label: '★ 特徵 4 的機械化：剪刀鋸齒滾邊必須量得到（紙的唯一幾何證據）' },
    { type: 'focal_contrast', a: 'paper_ink', b: 'eye', min_ratio: 3, view: 'front', stage: 'MID', label: '兩個焦點（紙軀／發光眼）不得等重相爭' },
    { type: 'style_dark', view: 'front', max_median_lum: 110, stage: 'MID', label: '深底＋一條高飽和帶（香火比祖靈亮一階，上限放到 110）' },
    { type: 'rig_skinned', stage: 'HIGH', label: '必須是蒙皮模型' },
    { type: 'anim_named', names: ['idle', 'move', 'attack'], stage: 'HIGH', label: '三支動畫齊備' },
    { type: 'saturation_area', view: 'tq', min: 0.10, max: 0.60, stage: 'HIGH', label: '高飽和面積落在 10%–60%' },
    { type: 'tri_budget', min: 1200, max: 8000, stage: 'LOW', label: '三角形預算（09-04 19:30 預算制上限 8000）' },
  ],
});
for (const key of Object.keys(CFG))
  fs.writeFileSync(path.join(OUT, key + '.claims.json'), JSON.stringify(claims(key), null, 1));
console.log('claims written');
