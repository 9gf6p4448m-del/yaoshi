// 妖市 3D 環境層 — 席位之手「批 1 身分變體」（v0.61.0；驗收 docs/experiments/2026-10-05-hands-b1/acceptance.md）。
// 四個角色各有自己的手：青面攤主（qingmian）、紅衣婆婆（hongyi）、斷手書生（duanshou，V4 斜切口＋梯形橫針）、大家樂組頭（zutou）。
// 寫實手開著時（HAND.REAL_ON／?handreal≠0）預設啟用；網址 ?handb1=0（或 HAND.B1_ON=false）＝這四個角色退回預設手、整套回 v0.60.1 的手。
// 做法與 v0.59.7 寫實三角色同一套：同一顆 GLB → Loop 細分＋依角色重塑（hand-realism.js）→ 這裡把配件接在**重塑後**的手上
// （戒指、指甲、縫線才貼得住變粗／變細後的手指）。仍是一隻手一個 SkinnedMesh、一份共用材質、一個 draw call；
// 配件只在 setSeats 時建一次，每幀不重建（含紅衣婆婆的髮辮：預建的管，跟著骨走）。不縮放手（HAND.USER_SCALE 不動）。
// 皮膚＝程式生成，無貼圖、無 UV（使用者裁定）。色規則：主色只落在袖口一處；其餘靠形狀與頂點色／程式圖樣的小塊。
// 啟用時所有席（含一般手與既有三角色）共用本檔的材質：同一支 shader、uniform 陣列 4→8；既有四種手的分支與參數不變
// （新加的分支只在新四種手的參數 >0 時才走）。純演出：不讀寫賽局、不耗 Math.random（雜湊用 sin）。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const { ROLE_PARTS, dressColors } = await import('./hand-motion.js' + V);
const HR = await import('./hand-realism.js' + V);
const { accBuilder, boneWorld, crossSection } = ROLE_PARTS;

export const B1_KEYS = ['qingmian', 'hongyi', 'duanshou', 'zutou'];
/** 角色 id → 批 1 變體鍵（不是這四個＝null）。 */
export function keyOf(role) { return typeof role === 'string' && B1_KEYS.includes(role) ? role : null; }

/** 皮膚參數（欄位同 hand-realism.js REAL；另加 ext＝[墨漬, 手背數字, 斑點轉青黑, 斑點變細（頻率倍率−1）]、
 *  ext2＝[縫痕 z, 色差強度, 模式（2＝V4 斜切口：手灰白／前臂偏青暗）, 0]）。全部【試玩必調】。 */
export const B1_REAL = {
  /* 青面攤主：青灰、帶深色斑、指節略腫；長厚泛黃指甲是幾何（CLAW） */
  qingmian: { RADIAL: 1.02, KNUCKLE: 1.16, PALM_Y: 0.96,
    skin: [0.115, 0.160, 0.105], warm: [0.130, 0.160, 0.100], nail: [0.34, 0.31, 0.17], rough: 0.74,
    age: [0.75, 0.55, 0.55, 0.7], marks: [0.0, 0.0, 0.0, 1.0], sss: [0.05, 0.09, 0.05], ext: [0, 0, 1, 0.8] },
  /* 紅衣婆婆：乾枯蒼白近灰、指細節腫、手背薄；靜脈重；黑紅長指甲是幾何 */
  hongyi: { RADIAL: 0.84, KNUCKLE: 1.24, PALM_Y: 0.86,
    skin: [0.215, 0.215, 0.205], warm: [0.235, 0.200, 0.200], nail: [0.085, 0.006, 0.010], rough: 0.86,
    age: [1.0, 0.25, 1.0, 1.0], marks: [0.0, 0.0, 0.0, 1.0], sss: [0.09, 0.07, 0.08], ext: [0, 0, 0, 0] },
  /* 斷手書生：修長（變細，不改骨長）、蒼白偏冷；指尖墨漬（程式圖樣） */
  duanshou: { RADIAL: 0.80, KNUCKLE: 1.04, PALM_Y: 0.90,
    skin: [0.285, 0.280, 0.290], warm: [0.290, 0.230, 0.240], nail: [0.40, 0.36, 0.37], rough: 0.55,
    age: [0.25, 0.0, 0.55, 0.2], marks: [0.0, 0.0, 0.0, 0.4], sss: [0.12, 0.10, 0.12], ext: [1, 0, 0, 0], ext2: [0.20, 1, 2, 0] }, // V4：縫痕中心 z 0.20、斜切（與 B1_ACC.STITCH 同一條）
  /* 大家樂組頭：粗短厚實、曬紅；指節繭；手背潦草原子筆數字（程式圖樣） */
  zutou: { RADIAL: 1.22, KNUCKLE: 1.10, PALM_Y: 1.10,
    skin: [0.320, 0.165, 0.090], warm: [0.420, 0.150, 0.080], nail: [0.45, 0.34, 0.26], rough: 0.70,
    age: [0.5, 0.25, 0.25, 0.5], marks: [0.4, 0.0, 0.0, 0.0], sss: [0.25, 0.07, 0.04], ext: [0, 1, 0, 0] },
};

/** 袖口（一處色）：CUFF＝腕部袖口主色、CLOTH＝其後袖布；BAND＝套在袖口外的環（同 ROLE_HAND.CUFF_BAND 的欄位）。 */
export const B1_CUFF = {
  qingmian: { CUFF: [0.010, 0.040, 0.046], CLOTH: [0.008, 0.020, 0.022], HEM: [0.005, 0.024, 0.028], CAP: [0.004, 0.012, 0.014],
    BAND: { Z: -0.25, LIFT: 0.01, W: 0.16, R: 0.05, PAD: 0.055, FLARE: 0.03, FLARE_Z: -0.43, FLARE_W: 0.03 } }, // 暗青油布
  hongyi: { CUFF: [0.200, 0.008, 0.012], CLOTH: [0.100, 0.005, 0.008], HEM: [0.120, 0.004, 0.008], CAP: [0.050, 0.002, 0.004],
    BAND: { Z: -0.25, LIFT: 0.01, W: 0.16, R: 0.05, PAD: 0.055, FLARE: 0.04, FLARE_Z: -0.43, FLARE_W: 0.03 } }, // 暗紅毛料＋毛邊
  duanshou: { CUFF: [0.115, 0.145, 0.165], CLOTH: [0.065, 0.085, 0.100], HEM: [0.085, 0.110, 0.128], CAP: [0.040, 0.050, 0.058],
    BAND: { Z: -0.25, LIFT: 0.0, W: 0.17, R: 0.05, PAD: 0.07, FLARE: 0.035, FLARE_Z: -0.43, FLARE_W: 0.03 } }, // 洗白青灰
  zutou: { CUFF: [0.30, 0.27, 0.17], CLOTH: [0.20, 0.18, 0.12], HEM: [0.30, 0.27, 0.17], CAP: [0.14, 0.12, 0.08],
    BAND: { Z: -0.22, LIFT: 0.0, W: 0.12, R: 0.075, PAD: 0.07, FLARE: 0.10, FLARE_Z: -0.38, FLARE_W: 0.07 } }, // 花襯衫半捲
};

/** 配件尺寸（dm＝10cm；依真人比例，不為了看得見而放大——10-02 標準「配件同標準不縮放」）。 */
export const B1_ACC = {
  /* 長指甲：甲床從遠節 45% 起，伸出指尖 L、往下彎 CURL 弧度；W 半寬（相對指半徑）、H 半厚 */
  CLAW: { qingmian: { L: 0.17, W: 0.62, H: 0.020, CURL: 0.45, C0: [0.30, 0.27, 0.15], C1: [0.07, 0.06, 0.035], RINGS_ON: 4, RINGS_OUT: 5, SIDES: 6 },
          hongyi: { L: 0.19, W: 0.50, H: 0.014, CURL: 1.25, C0: [0.090, 0.006, 0.010], C1: [0.020, 0.002, 0.004], RINGS_ON: 4, RINGS_OUT: 5, SIDES: 6 } },
  /* 青面：腕上銅錢串（方孔錢 OS16 外圓，同當鋪錢的圓度做法；直徑約 1.5cm）＋穿錢的暗色繩 */
  COINS: { Z: 0.10, N: 8, FROM: -25, TO: 205, R: 0.075, HOLE: 0.020, T: 0.012, LAYER: 0.007, TILT: 0.26,
    COLORS: [[0.36, 0.16, 0.07], [0.20, 0.14, 0.07], [0.30, 0.13, 0.06]], CORD: 0.008, CORD_C: [0.06, 0.02, 0.012] },
  /* 紅衣婆婆：黑髮辮（直徑≈2R，南席 ≥3px／北席 ≥2px）繞腕 TURNS 圈；一綹黑髮從袖口垂過手背（寬 W0→W1、厚 T） */
  BRAID: { R: 0.036, SIDES: 5, SEGS: 48, TURNS: 1.4, TH0: 0.4, Z0: -0.03, Z1: 0.13, SIT: 0.75, COLOR: [0.020, 0.017, 0.016] },
  LOCK: { Z0: -0.12, Z1: 0.50, TH: 1.45, DRIFT: 0.30, W0: 0.055, W1: 0.020, T: 0.010, LIFT: 0.010, SEGS: 18, COLOR: [0.022, 0.019, 0.018], COLOR2: [0.05, 0.045, 0.042] },
  FRAY: { N: 18, L: 0.05, W: 0.008 },
  /* 斷手書生 V4（使用者 10-05 選定）：斜切口（z 隨方位角正弦變化 OBL、帶鋸齒不規則 JAG；垂直手臂的一圈會被讀成手環）＋
     垂直切口的短橫針（梯形／鐵軌狀，經典縫合記號），縫痕帶三列（兩緣泛紅、中間暗褐）；暗褐黑（亮紅在遊戲視角會被讀成收驚婆紅繩）。 */
  STITCH: { Z: 0.20, OBL: 0.09, PHI: 0.5, JAG: 0.012, SEGS: 40, N: 15, ARC0: -30, ARC: 300, LEN: 0.085, R: 0.012, LIFT: 0.012, C: [0.025, 0.018, 0.014],
    BAND: [[-0.022, -0.002, [0.20, 0.07, 0.06]], [0, 0.006, [0.09, 0.02, 0.016]], [0.022, -0.002, [0.20, 0.07, 0.06]]] },
  /* 組頭：無名指＋小指粗金戒（採參考圖位置）、舊錶（鋼帶＋錶殼＋香檳色錶面＋兩根針） */
  RING: { FINGERS: [2, 3], T: 0.40, R: 0.020, W: 0.040, SEG: 20, TS: 6, COLOR: [0.78, 0.52, 0.11] },
  WATCH: { Z: -0.02, BAND_R: 0.014, BAND_W: 0.05, BAND_C: [0.42, 0.42, 0.44], CASE_R: 0.14, CASE_H: 0.035, CASE_C: [0.43, 0.43, 0.45], FACE_R: 0.118, FACE_C: [0.42, 0.37, 0.24], SEG: 24 },
};

/* 手背數字（組頭）：單位格子裡的潦草筆畫（y 朝指尖、x 朝畫面右＝網格 −x），烘成 shader 常數。 */
const GLYPH = {
  3: [[0.1, 0.9], [0.8, 0.97], [0.86, 0.74], [0.45, 0.55], [0.92, 0.34], [0.84, 0.08], [0.1, 0.04]],
  8: [[0.5, 0.54], [0.16, 0.76], [0.5, 0.98], [0.86, 0.76], [0.5, 0.54], [0.1, 0.28], [0.5, 0.02], [0.9, 0.3], [0.5, 0.54]],
  5: [[0.86, 0.96], [0.2, 0.94], [0.14, 0.55], [0.7, 0.62], [0.92, 0.3], [0.6, 0.03], [0.1, 0.1]],
  7: [[0.08, 0.95], [0.9, 0.95], [0.34, 0.04]],
};
/* 版面（網格座標換成 q＝(−x, z)，單位 dm）：上行「38」、下行「35 7」；每字高 H、寬 W，略斜 */
const DIGIT_LAYOUT = { H: 0.11, W: 0.075, LINES: [{ y: 0.50, x: -0.16, s: '38' }, { y: 0.34, x: -0.20, s: '357' }], SLANT: 0.18, GAP: 0.095 };
function digitSegments() {
  const out = [];
  for (const L of DIGIT_LAYOUT.LINES) {
    [...L.s].forEach((ch, i) => {
      const g = GLYPH[ch], x0 = L.x + i * DIGIT_LAYOUT.GAP, y0 = L.y + (i % 2 ? 0.012 : -0.008);
      const P = g.map(([u, v]) => [x0 + u * DIGIT_LAYOUT.W + v * DIGIT_LAYOUT.H * DIGIT_LAYOUT.SLANT, y0 + v * DIGIT_LAYOUT.H]);
      for (let k = 0; k + 1 < P.length; k++) out.push([P[k][0], P[k][1], P[k + 1][0], P[k + 1][1]]);
    });
  }
  return out;
}
const DSEG = digitSegments();
export const DIGIT_BOX = (() => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const s of DSEG) { x0 = Math.min(x0, s[0], s[2]); x1 = Math.max(x1, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); y1 = Math.max(y1, s[1], s[3]); } return { x0, x1, y0, y1 }; })();

/* ═══ 小工具 ═══ */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const cat = (A, B, T) => { const o = new T(A.length + B.length); o.set(A); o.set(B, A.length); return o; };
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb'];

/** 原手頂點（細分＋重塑後、前 nBase 個）各屬哪根手指的哪一段（同 reshape 的最近段；-1＝掌／腕）。 */
function fingerOf(P, nBase, J) {
  const segs = [];
  for (let f = 0; f < 5; f++) {
    const ch = [0, 1, 2, 3].map((k) => J[f * 4 + k]), ext = add(ch[3], mul(sub(ch[3], ch[2]), 0.6));
    segs.push([ch[0], ch[1], f, 0], [ch[1], ch[2], f, 1], [ch[2], ch[3], f, 2], [ch[3], ext, f, 3]);
  }
  const F = new Int8Array(nBase).fill(-1), S = new Float32Array(nBase);
  for (let v = 0; v < nBase; v++) {
    const p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
    let best = 1e9, bs = null, bt = 0;
    for (const s of segs) {
      const ab = sub(s[1], s[0]), t = Math.max(0, Math.min(1, dot(sub(p, s[0]), ab) / dot(ab, ab))), q = add(s[0], mul(ab, t)), dd = dot(sub(p, q), sub(p, q));
      if (dd < best) { best = dd; bs = s; bt = t; }
    }
    if (Math.sqrt(best) < 0.18 && (bs[3] > 0 || bt > 0.35)) { F[v] = bs[2]; S[v] = bs[3] + bt; }
  }
  return { F, S };
}
/** 某點 q 沿 dir 方向的皮膚表面距離（取 q 附近 slab 內、與 dir 夾角 < spread 的頂點，投影最遠者）；pick＝頂點篩選。 */
function surfAt(P, nBase, q, axis, dir, spread, slab, pick) {
  let r = 0;
  for (let v = 0; v < nBase; v++) {
    if (pick && !pick(v)) continue;
    const d = [P[v * 3] - q[0], P[v * 3 + 1] - q[1], P[v * 3 + 2] - q[2]], a = dot(d, axis);
    if (Math.abs(a) > slab) continue;
    const pr = sub(d, mul(axis, a)), l = Math.hypot(pr[0], pr[1], pr[2]); if (l < 1e-6) continue;
    const c = dot(pr, dir) / l; if (c < Math.cos(spread)) continue;
    r = Math.max(r, l * c);
  }
  return r;
}

/* ═══ 配件 ═══ */
/** 長指甲（一根）：甲板貼在遠節背側，伸出指尖後往下彎、收尖。橢圓截面（上拱下平），頂點色由甲根色漸到甲尖色。 */
function claw(acc, P, nBase, J, fo, f, C) {
  const a = J[f * 4 + 2], b = J[f * 4 + 3], d = norm(sub(b, a)), segLen = Math.hypot(...sub(b, a));
  let up = f === 4 ? norm([0.55, 0.83, 0]) : [0, 1, 0]; up = norm(sub(up, mul(d, dot(up, d)))); const side = norm(cross(d, up));
  const mine = (v) => fo.F[v] === f && fo.S[v] >= 2;
  let tipS = segLen; for (let v = 0; v < nBase; v++) if (mine(v)) tipS = Math.max(tipS, dot(sub([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], a), d));
  /* 手指半徑（側向，給甲寬） */
  const rSide = Math.max(0.03, surfAt(P, nBase, add(a, mul(d, segLen * 0.6)), d, side, 0.5, 0.03, mine), surfAt(P, nBase, add(a, mul(d, segLen * 0.6)), d, mul(side, -1), 0.5, 0.03, mine));
  const ctr = [], wid = [], hei = [], col = [], tan = [];
  const s0 = segLen * 0.45, s1 = tipS - 0.02;
  let last = null;
  for (let i = 0; i < C.RINGS_ON; i++) {
    const s = s0 + (s1 - s0) * (i / (C.RINGS_ON - 1)), q = add(a, mul(d, s));
    const r = surfAt(P, nBase, q, d, up, 0.45, 0.025, mine) || (last ? last.r : 0.05);
    const p = add(q, mul(up, r + C.H * 0.25)); last = { r, p };
    ctr.push(p); wid.push(rSide * C.W * (0.85 + 0.15 * i / (C.RINGS_ON - 1))); hei.push(C.H); col.push(C.C0); tan.push(d);
  }
  /* 伸出指尖：方向由 d 往 −up 彎，長 L，寬厚收尖 */
  let p = last.p;
  for (let k = 1; k <= C.RINGS_OUT; k++) {
    const u = k / C.RINGS_OUT, ang = C.CURL * u, dir = norm(add(mul(d, Math.cos(ang)), mul(up, -Math.sin(ang))));
    p = add(p, mul(dir, C.L / C.RINGS_OUT)); ctr.push(p); tan.push(dir);
    const taper = 1 - Math.pow(u, 1.6) * 0.92;
    wid.push(rSide * C.W * taper); hei.push(C.H * (1 + 0.6 * u) * (1 - 0.85 * Math.pow(u, 2.2))); col.push(lerp3(C.C0, C.C1, Math.pow(u, 0.8)));
  }
  const rows = [];
  for (let i = 0; i < ctr.length; i++) {
    const t = tan[i], upi = norm(sub(up, mul(t, dot(up, t)))), sd = norm(cross(t, upi)), row = [];
    for (let j = 0; j < C.SIDES; j++) {
      const th = (j / C.SIDES) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), hk = sn < 0 ? 0.45 : 1;
      row.push(acc.vert(add(ctr[i], add(mul(sd, wid[i] * cs), mul(upi, hei[i] * sn * hk))), add(mul(sd, cs / wid[i]), mul(upi, sn / (hei[i] * hk))), col[i]));
    }
    rows.push(row);
  }
  for (let i = 0; i + 1 < rows.length; i++) for (let j = 0; j < C.SIDES; j++) { const j2 = (j + 1) % C.SIDES; acc.I.push(rows[i][j], rows[i + 1][j], rows[i][j2], rows[i][j2], rows[i + 1][j], rows[i + 1][j2]); }
  const capAt = (row, i, s) => { const n = mul(tan[i], s), ids = row.map((v) => acc.vert([acc.P[v * 3], acc.P[v * 3 + 1], acc.P[v * 3 + 2]], n, col[i])); for (let j = 1; j + 1 < ids.length; j++) acc.I.push(ids[0], ids[j], ids[j + 1]); };
  capAt(rows[0], 0, -1); capAt(rows[rows.length - 1], rows.length - 1, 1);
}

/** 腕部某 z 圈、方位角 th 方向的皮膚半徑（±spread 弧度內頂點的最遠投影；同收驚婆紅繩的貼腕做法）。 */
function wristSurf(P, nBase, w0, z, th, spread = 0.3) {
  const c2 = crossSection(P.subarray(0, nBase * 3), [w0[0], w0[1], z], [0, 0, 1], [1, 0, 0], [0, 1, 0], 0.03); if (!c2) return null;
  const cx = w0[0] + c2.cx, cy = w0[1] + c2.cy; let r = 0;
  for (let v = 0; v < nBase; v++) {
    if (Math.abs(P[v * 3 + 2] - z) > 0.035) continue;
    const dx = P[v * 3] - cx, dy = P[v * 3 + 1] - cy; let da = Math.atan2(dy, dx) - th; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) < spread) r = Math.max(r, Math.hypot(dx, dy) * Math.cos(da));
  }
  if (!r) r = Math.hypot(c2.ra * Math.cos(th), c2.rb * Math.sin(th));
  return { cx, cy, r };
}

/** 一個角色的配件（接在重塑後的手上）；回 parts（各辨識物的頂點範圍，量尺寸／圓度用）。 */
function buildAcc(rig, d, key) {
  const P = d.P, nBase = d.nBase, J = HR.jointTable(rig).J, fo = fingerOf(P, nBase, J), w0 = boneWorld(rig, 'Wrist');
  const acc = accBuilder(), parts = [], CF = B1_CUFF[key], CB = CF.BAND;
  const mark = (name, fn, extra = {}) => { const a = acc.P.length / 3; fn(); parts.push({ name, from: a, to: acc.P.length / 3, ...extra }); };
  const zax = [0, 0, 1], xax = [1, 0, 0], up = [0, 1, 0];
  const Pb = P.subarray(0, nBase * 3);
  /* 袖口環＋外翻＋封口（同三角色做法；截面取重塑後的前臂） */
  const cs = crossSection(Pb, [w0[0], w0[1], CB.Z], zax, xax, up, 0.05);
  const cc = [w0[0] + cs.cx, w0[1] + cs.cy + CB.LIFT, CB.Z];
  const band = (z, w, r, pad, color, ts = 4) => acc.ring([cc[0], cc[1], z], zax, xax, up, cs.ra + pad, cs.rb + pad * 0.4, r, w, color, 16, ts);
  mark('袖口', () => {
    if (key === 'zutou') { acc.setClass(6); band(CB.Z, CB.W, CB.R, CB.PAD, CF.CUFF, 8); band(CB.FLARE_Z, CB.FLARE_W, 0.05, CB.FLARE, CF.CUFF, 6); acc.setClass(0); }
    else { band(CB.Z, CB.W, CB.R, CB.PAD, CF.CUFF); band(CB.FLARE_Z, CB.FLARE_W, CB.R, CB.PAD + CB.FLARE, CF.HEM); }
    const pad = key === 'zutou' ? CB.FLARE : CB.PAD + CB.FLARE;
    acc.disc([cc[0], cc[1], CB.FLARE_Z], xax, up, cs.ra + pad, cs.rb + pad * 0.4, [0, 0, -1], CF.CAP, 32);
    if (key === 'hongyi') { // 毛邊：袖口前緣一圈往手的方向垂下的線頭
      const F = B1_ACC.FRAY, ra = cs.ra + CB.PAD + CB.R * 0.7, rb = cs.rb + (CB.PAD + CB.R * 0.7) * 0.4;
      for (let k = 0; k < F.N; k++) {
        const th = (-40 + (260 * (k + 0.5 * hash(k, 2, 3))) / F.N) * Math.PI / 180, n = norm([Math.cos(th) / ra, Math.sin(th) / rb, 0]);
        const p = [cc[0] + ra * Math.cos(th), cc[1] + rb * Math.sin(th), CB.Z + CB.W * 0.8];
        acc.spike(p, norm(add(add(mul(n, 0.25), [0, -0.55, 0]), [0, 0, 0.8])), F.L * (0.6 + 0.8 * hash(k, 5, 1)), F.W, k % 3 ? CF.CUFF : CF.HEM);
      }
    }
  });

  if (key === 'qingmian' || key === 'hongyi') { // 長指甲
    acc.setClass(5);
    mark('長指甲', () => { for (let f = 0; f < 5; f++) claw(acc, P, nBase, J, fo, f, B1_ACC.CLAW[key]); });
    acc.setClass(0);
  }
  if (key === 'qingmian') { // 銅錢串
    const C = B1_ACC.COINS, sec = crossSection(Pb, [w0[0], w0[1], C.Z], zax, xax, up, 0.03), c0 = [w0[0] + sec.cx, w0[1] + sec.cy, C.Z];
    const cord = [];
    acc.setClass(4);
    for (let i = 0; i < C.N; i++) {
      const deg = C.FROM + (C.TO - C.FROM) * (i / (C.N - 1)), th = deg * Math.PI / 180, sf = wristSurf(P, nBase, w0, C.Z, th, 0.35);
      const n = [Math.cos(th), Math.sin(th), 0], tl = (i % 2 ? 1 : -1) * C.TILT * (0.7 + 0.6 * hash(i, 4, 4));
      const nn = norm(add(n, [0, 0, Math.sin(tl)])), u = norm(sub(zax, mul(nn, dot(zax, nn)))), vv = cross(nn, u);
      const base = [sf.cx + n[0] * sf.r, sf.cy + n[1] * sf.r, C.Z];
      const ctr = add(base, mul(nn, C.T / 2 + 0.004 + (i % 2) * C.LAYER));
      mark('銅錢' + (i + 1), () => acc.coin(ctr, nn, u, vv, C.R * (0.96 + 0.08 * hash(i, 1, 9)), C.HOLE, C.T, C.COLORS[i % C.COLORS.length]), { coin: true, normal: nn });
      cord.push(add(base, mul(n, 0.004)));
    }
    acc.setClass(0);
    mark('穿錢繩', () => acc.tube(cord, C.CORD, C.CORD_C, 3, 0));
  }
  if (key === 'hongyi') { // 一股黑髮辮繞腕＋一綹黑髮從袖口垂過手背（全為建構時預建幾何；無紅線手繩）
    const Bd = B1_ACC.BRAID, Lk = B1_ACC.LOCK;
    mark('黑髮辮', () => {
      const pts = [];
      for (let i = 0; i <= Bd.SEGS; i++) {
        const u = i / Bd.SEGS, th = Bd.TH0 + u * Bd.TURNS * Math.PI * 2, z = Bd.Z0 + (Bd.Z1 - Bd.Z0) * u, sf = wristSurf(P, nBase, w0, z, th, 0.3); if (!sf) continue;
        const off = Bd.R * Bd.SIT + 0.006 * Math.sin(u * 23.0);
        pts.push([sf.cx + Math.cos(th) * (sf.r + off), sf.cy + Math.sin(th) * (sf.r + off), z]);
      }
      acc.tube(pts, (i) => Bd.R * (0.82 + 0.18 * Math.abs(Math.cos(i * Math.PI / 2))), Bd.COLOR, Bd.SIDES, 2); // 粗細一節一節（辮子的股），材質畫捻股
    });
    mark('垂過手背的一綹黑髮', () => {
      const rows = [];
      for (let i = 0; i <= Lk.SEGS; i++) {
        const u = i / Lk.SEGS, z = Lk.Z0 + (Lk.Z1 - Lk.Z0) * u, th = Lk.TH + Lk.DRIFT * Math.sin(u * Math.PI * 1.3), sf = wristSurf(P, nBase, w0, z, th, 0.22); if (!sf) continue;
        const n = [Math.cos(th), Math.sin(th), 0], side = [-Math.sin(th), Math.cos(th), 0], w = Lk.W0 + (Lk.W1 - Lk.W0) * u, h = sf.r + Lk.LIFT + (u < 0.25 ? 0.03 * (1 - u / 0.25) : 0);
        const c = [sf.cx + n[0] * h, sf.cy + n[1] * h, z];
        rows.push({ c, n, side, w });
      }
      const top = rows.map((r) => [acc.vert(add(r.c, mul(r.side, -r.w)), r.n, Lk.COLOR), acc.vert(add(r.c, mul(r.side, r.w)), r.n, Lk.COLOR2)]);
      const bot = rows.map((r) => { const q = add(r.c, mul(r.n, -Lk.T)), nn = mul(r.n, -1); return [acc.vert(add(q, mul(r.side, -r.w)), nn, Lk.COLOR), acc.vert(add(q, mul(r.side, r.w)), nn, Lk.COLOR)]; });
      for (let i = 0; i + 1 < rows.length; i++) { acc.I.push(top[i][0], top[i + 1][0], top[i][1], top[i][1], top[i + 1][0], top[i + 1][1], bot[i][0], bot[i][1], bot[i + 1][0], bot[i][1], bot[i + 1][1], bot[i + 1][0]); }
    });
  }
  if (key === 'duanshou') { // V4「斷了接回」：斜切口的縫痕帶（中間暗褐、兩緣泛紅）＋垂直切口的短橫針；前臂側皮膚偏青暗（色差在 shader，見 ext2）
    const S = B1_ACC.STITCH, wrap = (th) => Math.atan2(Math.sin(th), Math.cos(th));
    /* 切口 z（方位角 th）：斜切正弦＋每 1/6 弧度一階的鋸齒（sin 雜湊，決定性）；shader 的色差分界用同一條式子 */
    const zAt = (th) => S.Z + S.OBL * Math.sin(wrap(th) - S.PHI) + S.JAG * (2 * (((Math.sin(Math.floor(wrap(th) * 6) * 91.7) * 437.5) % 1 + 1) % 1) - 1);
    mark('縫痕帶', () => {
      const rows = S.BAND.map(([dz, lift, col]) => { const r = []; for (let i = 0; i < S.SEGS; i++) { const th = (i / S.SEGS) * Math.PI * 2, z = zAt(th) + dz, sf = wristSurf(P, nBase, w0, z, th, 0.22), n = [Math.cos(th), Math.sin(th), 0]; r.push(acc.vert([sf.cx + n[0] * (sf.r + lift), sf.cy + n[1] * (sf.r + lift), z], add(n, [0, 0, -Math.sign(dz) * 0.6]), col)); } return r; });
      for (let k = 0; k + 1 < rows.length; k++) for (let i = 0; i < S.SEGS; i++) { const i2 = (i + 1) % S.SEGS; acc.I.push(rows[k][i], rows[k + 1][i], rows[k][i2], rows[k][i2], rows[k + 1][i], rows[k + 1][i2]); }
    });
    mark('針腳', () => { // 每針：沿手臂方向跨過切口的短橫針（4 點、微拱起的管）
      const step = (S.ARC / S.N) * Math.PI / 180;
      for (let m = 0; m < S.N; m++) {
        const t2 = (S.ARC0 * Math.PI) / 180 + m * step + step * 0.5, pts = [];
        for (let k = 0; k <= 3; k++) {
          const u = k / 3, z = S.Z + S.OBL * Math.sin(t2 - S.PHI) + (u - 0.5) * S.LEN, sf = wristSurf(P, nBase, w0, z, t2, 0.22);
          const lift = -0.002 + S.LIFT * Math.sin(u * Math.PI);
          pts.push([sf.cx + Math.cos(t2) * (sf.r + lift), sf.cy + Math.sin(t2) * (sf.r + lift), z]);
        }
        acc.tube(pts, S.R * (0.9 + 0.2 * hash(m, 3, 3)), S.C, 4, 2);
      }
    });
    const ink = []; for (let v = 0; v < nBase; v++) if ((fo.F[v] === 0 || fo.F[v] === 1 || fo.F[v] === 4) && fo.S[v] >= 2.45) ink.push(v);
    parts.push({ name: '指尖墨漬（區域上界）', base: ink });
  }
  if (key === 'zutou') { // 金戒×2、舊錶、手背數字
    const R = B1_ACC.RING;
    acc.setClass(4);
    for (const f of R.FINGERS) {
      const A = J[f * 4], B = J[f * 4 + 1], dd = norm(sub(B, A)), q = add(A, mul(sub(B, A), R.T));
      const u = norm(cross(dd, [0, 1, 0])), w = cross(u, dd);
      const mine = (v) => fo.F[v] === f && fo.S[v] < 2;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      for (let v = 0; v < nBase; v++) { if (!mine(v)) continue; const pv = sub([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], q); if (Math.abs(dot(pv, dd)) > 0.03) continue; const x = dot(pv, u), y = dot(pv, w); a0 = Math.min(a0, x); a1 = Math.max(a1, x); b0 = Math.min(b0, y); b1 = Math.max(b1, y); }
      const c = add(q, add(mul(u, (a0 + a1) / 2), mul(w, (b0 + b1) / 2))), ra = (a1 - a0) / 2 + R.R * 0.55, rb = (b1 - b0) / 2 + R.R * 0.55;
      mark(f === 2 ? '金戒（無名指）' : '金戒（小指）', () => acc.ring(c, dd, u, w, ra, rb, R.R, R.W, R.COLOR, R.SEG, R.TS), { round: true, normal: dd });
    }
    const Wt = B1_ACC.WATCH, sec = crossSection(Pb, [w0[0], w0[1], Wt.Z], zax, xax, up, 0.03), wc = [w0[0] + sec.cx, w0[1] + sec.cy, Wt.Z];
    mark('錶帶', () => acc.ring(wc, zax, xax, up, sec.ra + Wt.BAND_R * 0.8, sec.rb + Wt.BAND_R * 0.8, Wt.BAND_R, Wt.BAND_W, Wt.BAND_C, Wt.SEG, 4));
    const top = [wc[0], wc[1] + sec.rb + Wt.BAND_R * 1.6, Wt.Z], n = [0, 1, 0];
    mark('錶殼', () => { // 圓柱錶殼（側面＋頂面；色 CASE_C 與錶帶分開，量圓度時才挑得出單一錶殼）
      const side = [], topR = [], SEG = Wt.SEG;
      for (let i = 0; i < SEG; i++) { const th = (i / SEG) * Math.PI * 2, o = [Math.cos(th) * Wt.CASE_R, 0, Math.sin(th) * Wt.CASE_R], nn = [Math.cos(th), 0, Math.sin(th)];
        side.push([acc.vert(add(top, add(o, [0, -Wt.CASE_H / 2, 0])), nn, Wt.CASE_C), acc.vert(add(top, add(o, [0, Wt.CASE_H / 2, 0])), nn, Wt.CASE_C)]);
        topR.push(acc.vert(add(top, add(o, [0, Wt.CASE_H / 2, 0])), n, Wt.CASE_C)); }
      for (let i = 0; i < SEG; i++) { const i2 = (i + 1) % SEG; acc.I.push(side[i][0], side[i][1], side[i2][0], side[i2][0], side[i][1], side[i2][1]); }
      for (let i = 1; i + 1 < SEG; i++) acc.I.push(topR[0], topR[i], topR[i + 1]);
    }, { round: true, normal: n });
    acc.setClass(0);
    mark('錶面', () => {
      acc.disc(add(top, [0, Wt.CASE_H / 2 + 0.002, 0]), xax, zax, Wt.FACE_R, Wt.FACE_R, n, Wt.FACE_C, Wt.SEG);
      acc.box(add(top, [0.02, Wt.CASE_H / 2 + 0.005, 0.03]), [0.008, 0.002, 0.05], [0.02, 0.02, 0.02]); // 長針
      acc.box(add(top, [-0.025, Wt.CASE_H / 2 + 0.005, 0.01]), [0.03, 0.002, 0.008], [0.02, 0.02, 0.02]); // 短針
    }, { round: true, normal: n });
    const dg = []; const B = DIGIT_BOX, pal = boneWorld(rig, 'Palm');
    for (let v = 0; v < nBase; v++) { const qx = -P[v * 3], qz = P[v * 3 + 2]; if (fo.F[v] < 0 && qx >= B.x0 && qx <= B.x1 && qz >= B.y0 && qz <= B.y1 && P[v * 3 + 1] > pal[1]) dg.push(v); }
    parts.push({ name: '手背數字（區域上界）', base: dg });
  }
  /* 繞序統一（同 buildRoleGeometry）：面法線與頂點法線同向；之後 realGeometry 會 computeVertexNormals */
  for (let t = 0; t < acc.I.length; t += 3) {
    const [ia, ib, ic] = [acc.I[t], acc.I[t + 1], acc.I[t + 2]], pa = [acc.P[ia * 3], acc.P[ia * 3 + 1], acc.P[ia * 3 + 2]];
    const f = cross(sub([acc.P[ib * 3], acc.P[ib * 3 + 1], acc.P[ib * 3 + 2]], pa), sub([acc.P[ic * 3], acc.P[ic * 3 + 1], acc.P[ic * 3 + 2]], pa));
    if (f[0] * acc.N[ia * 3] + f[1] * acc.N[ia * 3 + 1] + f[2] * acc.N[ia * 3 + 2] < 0) { acc.I[t + 1] = ic; acc.I[t + 2] = ib; }
  }
  return { acc, parts };
}

/** 這種手的陣列版來源幾何（GLB 原幾何＋該角色袖口色）。 */
export function srcFor(baseSrc, key) {
  const CF = B1_CUFF[key];
  return { position: baseSrc.position, color: dressColors(baseSrc.position, baseSrc.color, baseSrc.colorSize, { CUFF: CF.CUFF, CLOTH: CF.CLOTH }), colorSize: 4, skinIndex: baseSrc.skinIndex, skinWeight: baseSrc.skinWeight, index: baseSrc.index };
}
/** realGeometry 的 ext：這種手的參數＋重塑後接配件。 */
export function extFor(rig, key) {
  return {
    real: { def: B1_REAL[key], kind: HR.KINDS.length + B1_KEYS.indexOf(key) },
    accessorize(d) {
      const { acc, parts } = buildAcc(rig, d, key), nOld = d.P.length / 3, ne = acc.P.length / 3;
      d.P = cat(d.P, acc.P, Float32Array); d.C = cat(d.C, acc.C, Float32Array); d.A = cat(d.A, acc.A, Float32Array);
      const si = new Uint16Array(ne * 4), sw = new Float32Array(ne * 4); for (let e = 0; e < ne; e++) sw[e * 4] = 1; // 權重由 realGeometry 依「最近的手部頂點」覆寫
      d.SI = cat(d.SI, si, Uint16Array); d.SW = cat(d.SW, sw, Float32Array);
      d.index = cat(d.index, Uint32Array.from(acc.I, (i) => i + nOld), Uint32Array);
      d.parts = parts.map((p) => (p.base ? { name: p.name, base: p.base } : { ...p, from: p.from + nOld, to: p.to + nOld }));
    },
  };
}

/* ═══ 材質（8 種手；同一支 program）═══ */
export const KINDS8 = [...HR.KINDS, ...B1_KEYS];
const kd = (i) => (i === 0 ? HR.REAL.DEFAULT : i < HR.KINDS.length ? HR.REAL.ROLES[HR.KINDS[i]] : B1_REAL[B1_KEYS[i - HR.KINDS.length]]);
const glf = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(+x.toFixed(4)));
const PICK = (t, name) => `${t} ${name}(${t} a[8], int k){ return k == 1 ? a[1] : k == 2 ? a[2] : k == 3 ? a[3] : k == 4 ? a[4] : k == 5 ? a[5] : k == 6 ? a[6] : k == 7 ? a[7] : a[0]; }`;
function swap(src, from, to) { if (!src.includes(from)) throw new Error('hand-b1: shader 片段找不到 ' + from.slice(0, 40)); return src.replace(from, to); }
export function shaderParts() { // skin-proto：export 給 hand-skin-proto.js 重用（行為不變）
  let pars = HR.FRAG_PARS.replace(/uniform (vec3|vec4|float) (\w+)\[4\]/g, 'uniform $1 $2[8]');
  pars = pars.replace(/vec3 hrPick3\(vec3 a\[4\][^\n]*/, PICK('vec3', 'hrPick3')).replace(/vec4 hrPick4\(vec4 a\[4\][^\n]*/, PICK('vec4', 'hrPick4')).replace(/float hrPick1\(float a\[4\][^\n]*/, PICK('float', 'hrPick1'));
  if (/\w+ a\[4\],|\w+A\[4\];/.test(pars)) throw new Error('hand-b1: 還有 [4] 宣告沒換');
  pars += `uniform vec4 uExtA[8]; uniform vec4 uExt2A[8];
float hrSegD(vec2 p, vec2 a, vec2 b){ vec2 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
const vec4 HR_DSEG[${DSEG.length}] = vec4[${DSEG.length}](${DSEG.map((s) => `vec4(${s.map(glf).join(', ')})`).join(', ')});
float hrDigits(vec3 p){ vec2 q = vec2(-p.x, p.z); float d = 1e9; for (int i = 0; i < ${DSEG.length}; i++) d = min(d, hrSegD(q, HR_DSEG[i].xy, HR_DSEG[i].zw));
  return 1.0 - smoothstep(0.0045, 0.0085, d + 0.004 * (hrNoise(vec3(q * 70.0, 1.0)) - 0.5)); }
`;
  let color = swap(HR.FRAG_COLOR, 'float uRough = hrPick1(uRoughA, hk);', 'float uRough = hrPick1(uRoughA, hk); vec4 uExt = hrPick4(uExtA, hk); vec4 uExt2 = hrPick4(uExt2A, hk);');
  color = swap(color, 'hrFbm(p * 9.0 + 3.1)', 'hrFbm(p * 9.0 * (1.0 + uExt.w) + 3.1)');
  color = swap(color, 'vec3(0.30, 0.17, 0.08) * (0.8 + 0.4 * hrNoise(p * 20.0))', 'mix(vec3(0.30, 0.17, 0.08), vec3(0.030, 0.045, 0.032), uExt.z) * (0.8 + 0.4 * hrNoise(p * 20.0))');
  color = swap(color, '    diffuseColor.rgb = mix(diffuseColor.rgb, c, hrK);', `    if (uExt2.y > 0.0) { /* 書生 V4：縫痕以下（前臂側）皮膚偏青暗、手側灰白，沿斜切口分界＝斷了接回（切口式子與 hand-b1 STITCH 同一條） */
      float th = atan(p.y - 0.28, p.x - 0.07), zc = uExt2.x + 0.09 * sin(th - 0.5) + 0.012 * (2.0 * fract(sin(floor(th * 6.0) * 91.7) * 437.5) - 1.0);
      float below = 1.0 - smoothstep(zc - 0.012, zc + 0.012, p.z);
      c = mix(mix(c, vec3(dot(c, vec3(0.30, 0.55, 0.15))) * vec3(1.03, 1.03, 1.06), 0.55), c * vec3(0.42, 0.50, 0.62), below * uExt2.y); }
    if (uExt.x > 0.0) { /* 書生：指尖墨漬（食指、中指、拇指重，其餘輕）——程式圖樣，無貼圖 */
      float fw = (bf == 0 || bf == 1 || bf == 4) ? 1.0 : 0.25;
      float blot = smoothstep(0.25, 0.45, hrNoise(p * 12.0 + float(bf) * 5.3) + 0.55 * smoothstep(2.35, 2.75, bs));
      float ink = uExt.x * fw * smoothstep(1.90, 2.30, bs) * step(bd, 0.15) * blot;
      c = mix(c, vec3(0.010, 0.010, 0.016), ink * 0.94); }
    if (uExt.y > 0.0 && dors > 0.25 && onFinger < 0.5) { /* 組頭：手背潦草原子筆數字 */
      c = mix(c, vec3(0.030, 0.040, 0.130), hrDigits(p) * uExt.y * smoothstep(0.25, 0.5, dors) * (0.55 + 0.25 * hrNoise(p * 30.0))); }
    diffuseColor.rgb = mix(diffuseColor.rgb, c, hrK);`);
  /* 配件：原三類（繩、木、金屬）＋ 5 角質（指甲）＋ 6 花布 */
  let acc = swap(HR.FRAG_ACC, '    } else {\n      /* 金屬', '    } else if (cls < 4.5) {\n      /* 金屬');
  acc = swap(acc, '      hrMetal = 1.0; hrRough = 0.30 + 0.25 * wear; hrH = (pit - 0.5) * 0.00025;\n    }', `      hrMetal = 1.0; hrRough = 0.30 + 0.25 * wear; hrH = (pit - 0.5) * 0.00025;
    } else if (cls < 5.5) {
      /* 角質（長指甲）——縱向細紋、半光澤、甲根到甲尖的頂點色漸層 */
      float ridge = hrNoise(vec3(p.x * 260.0, p.y * 260.0, p.z * 18.0));
      c *= 0.86 + 0.22 * ridge + 0.10 * (hrNoise(p * 40.0) - 0.5);
      hrRough = 0.34 + 0.2 * ridge; hrH = ridge * 0.0004;
    } else {
      /* 花布（組頭襯衫）——奶油底＋紅／黃／青綠／藍的大朵花（低頻雜訊分區），只落在袖口 */
      float f1 = hrNoise(p * 14.0 + 1.7), f2 = hrNoise(p * 7.0 + 7.3), f3 = hrNoise(p * 26.0), lf = hrNoise(p * 18.0 + 4.1);
      vec3 base = vec3(0.30, 0.27, 0.17);
      vec3 petal = f2 < 0.33 ? vec3(0.42, 0.05, 0.06) : f2 < 0.55 ? vec3(0.55, 0.38, 0.05) : f2 < 0.78 ? vec3(0.05, 0.20, 0.12) : vec3(0.06, 0.10, 0.30);
      float bloom = smoothstep(0.46, 0.54, f1) * (0.75 + 0.25 * f3);
      vec3 leaf = vec3(0.06, 0.13, 0.05);
      c = mix(mix(base, leaf, smoothstep(0.55, 0.62, lf) * (1.0 - bloom)), petal, bloom) * (0.85 + 0.15 * f3);
      hrRough = 0.8; hrH = f3 * 0.0003;
    }`);
  return { pars, color, acc };
}
export function makeMaterial(base, joints) {
  const m = base.clone();
  m.name = 'hand-real-b1';
  const arr = (f) => KINDS8.map((_, i) => f(kd(i)));
  const u = {
    uJ: { value: joints.J.map((p) => new THREE.Vector3(...p)) }, uWr: { value: new THREE.Vector3(...joints.wrist) },
    uSkinA: { value: arr((d) => new THREE.Color(...d.skin)) }, uWarmA: { value: arr((d) => new THREE.Color(...d.warm)) }, uNailA: { value: arr((d) => new THREE.Color(...d.nail)) },
    uAgeA: { value: arr((d) => new THREE.Vector4(...d.age)) }, uMarksA: { value: arr((d) => new THREE.Vector4(...d.marks)) }, uSSSA: { value: arr((d) => new THREE.Color(...d.sss)) },
    uRoughA: { value: arr((d) => d.rough) }, uScar: { value: new THREE.Vector4(0.16, 0.28, -0.12, 0.66) },
    uExtA: { value: arr((d) => new THREE.Vector4(...(d.ext || [0, 0, 0, 0]))) }, uExt2A: { value: arr((d) => new THREE.Vector4(...(d.ext2 || [0, 0, 0, 0]))) },
  };
  const S = shaderParts();
  m.userData.realU = u;
  m.customProgramCacheKey = () => 'hand-real-b1';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSkin; attribute vec3 aAcc; varying vec3 vRP; varying vec3 vRN; varying float vSkin; varying vec3 vAcc;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRP = position; vRN = normal; vSkin = aSkin; vAcc = aAcc;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + S.pars)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + S.color + S.acc)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, hrRough, max(hrK, hrA));')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, hrMetal);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (hrK > 0.0 || hrA > 0.0) normal = hrBump(-vViewPosition, normal, hrH * max(hrK, hrA));')
      .replace('#include <opaque_fragment>', 'outgoingLight += hrK * hrSSS * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.5) * 0.25;\n#include <opaque_fragment>');
  };
  return m;
}
