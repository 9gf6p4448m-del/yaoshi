// 妖市 3D 環境層 — 席位之手「批 3 配件」（v0.64.0；驗收 docs/experiments/2026-10-07-hands-b3/acceptance.md）。
// 三個角色各帶身分配件：孝女白琴（xiaonv：米白粗麻帶＋側結＋兩條短垂尾、指尖／手背紙錢灰）、
// 閭山法師（lvshan：黑檀念珠、拇指黃骨扳指、手背朱紅毛筆符形——是符形，不是可讀漢字）、
// 普渡爐主（luzhu：黃色雙股編繩＋垂掛米白布福袋、無名指淡青綠玉戒）。
// 寫實手＋批 1 開著時預設啟用；網址 ?handb3=0（或 opts.b3=false）＝這三個角色退回 v0.62.5 的手（不載入本檔）。
// 做法同批 1（js/hand-b1.js）：同一顆 GLB → hand-realism 重塑（預設手的形狀參數，不縮放）→ 這裡把配件接在重塑後的手上。
// 仍是一隻手一個 SkinnedMesh、一份共用材質（skin-proto／批 1 那一份，本檔不改 shader）、一個 draw call；配件只在 setSeats 時建一次。
// 皮膚＝程式生成，無貼圖、無 UV；皮膚參數（hand-skin-proto.js EXTRA_KEYS）不動，只把 aSkin 指到那三組。
// 擺盪（福袋、垂尾）：預建頂點的「靜止位置＋權重×偏移」寫回同一份 position（只上傳那一段），彈簧阻尼（跟手的加速度有慣性、停下收斂），
// 不耗 Math.random／S.rng、每幀不建幾何不配置物件（工作變數全部預配）。純演出：不讀寫賽局。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const { ROLE_PARTS, dressColors } = await import('./hand-motion.js' + V);
const HR = await import('./hand-realism.js' + V);
const { accBuilder, boneWorld, crossSection } = ROLE_PARTS;

export const B3_KEYS = ['xiaonv', 'lvshan', 'luzhu'];
/** 角色 id → 批 3 鍵（不是這三個＝null）。 */
export function keyOf(role) { return typeof role === 'string' && B3_KEYS.includes(role) ? role : null; }

/** 袖口（一處色）：CUFF／CLOTH＝dressColors 的袖口與袖布；BAND＝套在袖口外的環（同批 1 欄位）、BAND_C＝環色、CAP＝封口色。【試玩必調】 */
export const B3_CUFF = {
  xiaonv: { CUFF: [0.60, 0.585, 0.54], CLOTH: [0.50, 0.485, 0.445], BAND_C: [0.54, 0.52, 0.465], CAP: [0.085, 0.150, 0.310], TRIM: { C: [0.085, 0.150, 0.310], W: 0.013, R: 0.004 }, // 米白麻袖＋袖口一道窄丹寧藍內裡線（參考圖；第二輪第 2 次：原本整圈藍灰滾邊在遊戲取景被讀成當鋪黑袖金邊）
    BAND: { Z: -0.25, LIFT: 0.01, W: 0.10, R: 0.045, PAD: 0.055 } },
  lvshan: { CUFF: [0.020, 0.032, 0.095], CLOTH: [0.012, 0.020, 0.060], BAND_C: [0.016, 0.026, 0.080], CAP: [0.008, 0.012, 0.035], // 深藍道袍袖
    BAND: { Z: -0.25, LIFT: 0.01, W: 0.15, R: 0.05, PAD: 0.060 } },
  luzhu: { CUFF: [0.46, 0.27, 0.025], CLOTH: [0.28, 0.16, 0.015], BAND_C: [0.40, 0.235, 0.022], CAP: [0.16, 0.09, 0.01], // 芥黃袖＋反摺袖口
    BAND: { Z: -0.25, LIFT: 0.01, W: 0.16, R: 0.06, PAD: 0.070 } },
};

/** 配件尺寸（dm）與色（線性 RGB；量圓度的治具依頂點色挑配件，三件圓物各自一色）。全部【試玩必調】。 */
export const B3_ACC = {
  /* 孝女：腕上米白粗麻布帶（Z 中心、半寬 W、厚 T、離皮 LIFT）；拇指側打結（TH＝方位角，度）；兩條垂尾（長 L＝0.35–0.55×手掌長）＋尾端毛邊 */
  HEMP: { Z: 0.10, W: 0.080, T: 0.016, LIFT: 0.006, SEG: 22, C: [0.40, 0.38, 0.31], C2: [0.25, 0.235, 0.19], FRAY_N: 12, FRAY_L: 0.036, FRAY_W: 0.008 },
  KNOT: { TH: -12, R: 0.068, C: [0.37, 0.35, 0.285] },
  TAILS: [{ L: 0.35, W: 0.048, T: 0.008, DIR: [0.85, -0.38, -0.36], CURL: 0.30, SEGS: 6 }, { L: 0.31, W: 0.042, T: 0.008, DIR: [0.95, -0.30, 0.02], CURL: -0.25, SEGS: 6 }],
  TAIL_FRAY: { N: 6, L: 0.050, W: 0.008, C: [0.47, 0.44, 0.36], C2: [0.56, 0.53, 0.45] }, // 垂尾比帶亮（參考圖：淺米色布尾＋毛邊；暗桌面上才看得出）,
  ASH: { C: [0.20, 0.195, 0.19], C2: [0.26, 0.255, 0.25], BACK: 7, TIPS: [0, 1, 2, 3], R0: 0.008, R1: 0.020, LIFT: 0.0035 },
  /* 閭山：黑檀圓珠念珠（N 顆、半徑 R、從 FROM 到 TO 度，下緣貼桌不繞滿）；拇指黃骨扳指（近節 T 處）；手背朱紅毛筆符形 */
  BEADS: { Z: 0.035, N: 13, FROM: -38, TO: 218, R: 0.046, SEG: 8, RINGS: 4, SIT: 0.80, C: [0.020, 0.0155, 0.013] },
  BONE: { F: 4, T: 0.50, R: 0.022, W: 0.060, SEG: 16, TS: 4, C: [0.56, 0.43, 0.15] },
  FU: { C: [0.52, 0.030, 0.018], LIFT: 0.0045 },
  /* 爐主：黃色雙股編繩（兩股、各自 Z）＋拇指側垂掛一顆米白布福袋（繩長 HANG、袋半徑 R）；無名指玉戒 */
  CORD: { Z: [-0.005, 0.050], R: 0.0165, SIDES: 4, SEGS: 22, FROM: -42, TO: 232, SIT: 0.75, C: [0.60, 0.385, 0.035] },
  POUCH: { TH: -28, HANG: 0.055, DIR: [0.30, -0.90, -0.30], R: 0.058, K: [1.0, 1.18, 0.92], C: [0.47, 0.42, 0.33], TIE: [0.52, 0.33, 0.03], RUFF: 4 },
  JADE: { F: 2, T: 0.42, R: 0.022, W: 0.036, SEG: 16, TS: 6, C: [0.16, 0.36, 0.24] },
};

/** 孝女配件的「碰撞取樣用」尺寸＝v0.64.0 第一版（8e61d797）的值。第二輪（docs/experiments/2026-10-07-hands-b3/acceptance-round2-xiaonv.md）
 *  只調孝女的外觀；三種批 3 手共用一副碰撞取樣骨架（條件 10），若取樣跟著新尺寸變，閭山／爐主的擺位也會跟著變（R2 要求它們 0 像素差）。
 *  所以碰撞取樣固定用這組舊尺寸建孝女的配件點；畫面上的孝女用 B3_ACC 的新尺寸。新舊差：帶寬 0.10→0.16 dm、結 0.034→0.056、垂尾寬約 ×1.8、方向較往外——
 *  穿入由 tests/table-hands-b3.test.mjs 的批 3 #C1/#C2（判全部蒙皮頂點、含新配件）把關。 */
export const B3_ACC_COLLIDE_XIAONV = {
  HEMP: { Z: 0.05, W: 0.050, T: 0.010, LIFT: 0.006, SEG: 22, C: [0.50, 0.46, 0.37], C2: [0.40, 0.365, 0.29], FRAY_N: 9, FRAY_L: 0.026, FRAY_W: 0.006 },
  KNOT: { TH: -12, R: 0.034, C: [0.46, 0.42, 0.335] },
  TAILS: [{ L: 0.33, W: 0.019, T: 0.005, DIR: [0.42, -0.62, -0.66], CURL: 0.35, SEGS: 6 }, { L: 0.29, W: 0.016, T: 0.005, DIR: [0.62, -0.60, -0.42], CURL: -0.25, SEGS: 6 }],
  TAIL_FRAY: { N: 3, L: 0.022, W: 0.005, C: [0.50, 0.46, 0.37], C2: [0.40, 0.365, 0.29] },
};

/** 手背符形（閭山）：畫面座標 (s, t)＝(−x 相對手背中線, z)，單位 dm；每筆＝[點列, 起筆半寬, 收筆半寬]。
 *  形狀＝頂上三點、一道上下折的長鋸齒（雷紋）、底下一圈螺旋收尾——道符的筆勢，刻意不組成任何可讀漢字（不寫「朱砂」）。 */
export const FU_STROKES = [
  [[[-0.058, 0.602], [-0.040, 0.596]], 0.012, 0.007], // 頂點（左）
  [[[-0.008, 0.612], [0.010, 0.606]], 0.012, 0.007], // 頂點（中）
  [[[0.040, 0.600], [0.058, 0.592]], 0.012, 0.007], // 頂點（右）
  [[[0.000, 0.570], [0.036, 0.535], [-0.036, 0.488], [0.036, 0.441], [-0.036, 0.394], [0.030, 0.347], [0.000, 0.305]], 0.016, 0.010], // 雷紋長折
  [(() => { const p = []; for (let i = 0; i <= 18; i++) { const a = Math.PI / 2 + (i / 18) * Math.PI * 3.3, r = 0.046 * (1 - 0.62 * i / 18); p.push([r * Math.cos(a), 0.252 + r * Math.sin(a) - 0.046 * (1 - i / 18) * 0]); } return p; })(), 0.014, 0.006], // 底下螺旋
];

/* ═══ 小工具（同 hand-b1.js；建構時用，每幀不呼叫）═══ */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const cat = (A, B, T) => { const o = new T(A.length + B.length); o.set(A); o.set(B, A.length); return o; };
const RAD = Math.PI / 180;

/** 原手頂點各屬哪根手指的哪一段（同 hand-b1 fingerOf；-1＝掌／腕）。 */
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
/** 腕部某 z 圈、方位角 th（從 +x 往 +y）方向的皮膚半徑（同 hand-b1 wristSurf）。 */
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
/** 手背（掌／腕、非手指、背側）在 (x,z) 的表面高：半徑 rad 內頂點的最高 y。 */
function backTop(P, nBase, fo, palmY, x, z, rad = 0.035) {
  let y = -1e9;
  for (let v = 0; v < nBase; v++) {
    if (fo.F[v] >= 0 || P[v * 3 + 1] < palmY) continue;
    if (Math.abs(P[v * 3] - x) > rad || Math.abs(P[v * 3 + 2] - z) > rad) continue;
    y = Math.max(y, P[v * 3 + 1]);
  }
  return y > -1e8 ? y : (rad < 0.1 ? backTop(P, nBase, fo, palmY, x, z, rad * 1.8) : palmY + 0.1);
}

/* ═══ 配件 ═══ */
/** 貼腕的帶（沿腕截面走，不是正橢圓）：z 中心、半寬 w、厚 t、離皮 lift；th 從 from 到 to（度；全圈＝null）。四列閉合截面。 */
function surfBand(acc, P, nBase, w0, z, w, t, lift, seg, colorAt, from = null, to = null) {
  const full = from === null, n = full ? seg : seg + 1, rows = [];
  for (let i = 0; i < n; i++) {
    const th = full ? (i / seg) * Math.PI * 2 : (from + (to - from) * (i / seg)) * RAD, nr = [Math.cos(th), Math.sin(th), 0];
    const ring = [];
    for (const [dz, dr] of [[-w, lift + t], [w, lift + t], [w, lift], [-w, lift]]) {
      const sf = wristSurf(P, nBase, w0, z + dz, th, 0.3), r = sf.r + dr;
      const nn = dr > lift ? nr : mul(nr, -1);
      ring.push(acc.vert([sf.cx + nr[0] * r, sf.cy + nr[1] * r, z + dz], add(nn, [0, 0, Math.sign(dz) * 0.5]), colorAt(i, dz)));
    }
    rows.push(ring);
  }
  const m = full ? n : n - 1;
  for (let i = 0; i < m; i++) { const a = rows[i], b = rows[(i + 1) % n]; for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; acc.I.push(a[j], b[j], a[j2], a[j2], b[j], b[j2]); } }
  return rows;
}
/** 扁帶（垂尾）：從 p0 沿 dir 長 L、寬 w、厚 t，帶一點彎（curl：往側邊偏的弧度）；回 { tip, ids }。 */
function ribbon(acc, p0, dir, side, L, w, t, segs, curl, color) {
  const up = norm(cross(side, dir)), rows = [];
  let p = p0, d = dir;
  for (let i = 0; i <= segs; i++) {
    if (i) { const a = curl * (i / segs); d = norm(add(mul(dir, Math.cos(a)), mul(side, Math.sin(a)))); p = add(p, mul(d, L / segs)); }
    const sd = norm(cross(d, up)), ww = w * (1 - 0.25 * i / segs), row = [];
    for (const [s, u] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) row.push(acc.vert(add(p, add(mul(sd, s * ww), mul(up, u * t))), add(mul(sd, s * 0.4), mul(up, u)), color));
    rows.push(row);
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; acc.I.push(rows[i][j], rows[i + 1][j], rows[i][j2], rows[i][j2], rows[i + 1][j], rows[i + 1][j2]); }
  for (const [row, s] of [[rows[0], -1], [rows[segs], 1]]) { const n = mul(d, s), q = row.map((v) => acc.vert([acc.P[v * 3], acc.P[v * 3 + 1], acc.P[v * 3 + 2]], n, color)); acc.I.push(q[0], q[1], q[2], q[0], q[2], q[3]); }
  return { tip: p, dir: d, sd: norm(cross(d, up)), up };
}
/** 手指上的環（戒指／扳指）：f 指、A→B 段 t 處；量該處截面後套一圈（同 hand-b1 金戒做法）。 */
function fingerRing(acc, P, nBase, J, fo, f, seg0, C) {
  const A = J[f * 4 + seg0], B = J[f * 4 + seg0 + 1], dd = norm(sub(B, A)), q = add(A, mul(sub(B, A), C.T));
  const u = norm(cross(dd, [0, 1, 0])), w = cross(u, dd);
  const mine = (v) => fo.F[v] === f && Math.floor(fo.S[v]) === seg0;
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  for (let v = 0; v < nBase; v++) { if (!mine(v)) continue; const pv = sub([P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], q); if (Math.abs(dot(pv, dd)) > 0.03) continue; const x = dot(pv, u), y = dot(pv, w); a0 = Math.min(a0, x); a1 = Math.max(a1, x); b0 = Math.min(b0, y); b1 = Math.max(b1, y); }
  const c = add(q, add(mul(u, (a0 + a1) / 2), mul(w, (b0 + b1) / 2))), ra = (a1 - a0) / 2 + C.R * 0.55, rb = (b1 - b0) / 2 + C.R * 0.55;
  acc.ring(c, dd, u, w, ra, rb, C.R, C.W, C.C, C.SEG, C.TS);
  return { c, normal: dd };
}

/** 一個角色的配件；回 { acc, parts, swings }（swings＝垂掛物：頂點範圍、結點、尖端、長度、每頂點擺盪權重）。 */
function buildAcc(rig, d, key, collide = false) {
  const AC = collide && key === 'xiaonv' ? { ...B3_ACC, ...B3_ACC_COLLIDE_XIAONV } : B3_ACC; // 碰撞取樣用孝女舊尺寸（見 B3_ACC_COLLIDE_XIAONV）
  const P = d.P, nBase = d.nBase, J = HR.jointTable(rig).J, fo = fingerOf(P, nBase, J), w0 = boneWorld(rig, 'Wrist'), palmY = boneWorld(rig, 'Palm')[1];
  const acc = accBuilder(), parts = [], swings = [], CF = B3_CUFF[key], CB = CF.BAND;
  const mark = (name, fn, extra = {}) => { const a = acc.P.length / 3; const r = fn(); parts.push({ name, from: a, to: acc.P.length / 3, ...extra }); return r; };
  const zax = [0, 0, 1], xax = [1, 0, 0], up = [0, 1, 0];
  const Pb = P.subarray(0, nBase * 3);
  /* 袖口環＋封口（同批 1；截面取重塑後的前臂） */
  const cs = crossSection(Pb, [w0[0], w0[1], CB.Z], zax, xax, up, 0.05);
  const cc = [w0[0] + cs.cx, w0[1] + cs.cy + CB.LIFT, CB.Z];
  mark('袖口', () => {
    acc.ring(cc, zax, xax, up, cs.ra + CB.PAD, cs.rb + CB.PAD * 0.4, CB.R, CB.W, CF.BAND_C, 16, 4);
    acc.disc([cc[0], cc[1], CB.Z - CB.W], xax, up, cs.ra + CB.PAD, cs.rb + CB.PAD * 0.4, [0, 0, -1], CF.CAP, 24);
    /* 孝女：袖口前緣露出一道窄丹寧藍內裡（碰撞取樣不建，閭山／爐主共用的取樣才不會變） */
    if (CF.TRIM && !collide) acc.ring([cc[0], cc[1], CB.Z + CB.W - CF.TRIM.W], zax, xax, up, cs.ra + CB.PAD, cs.rb + CB.PAD * 0.4, CB.R + CF.TRIM.R, CF.TRIM.W, CF.TRIM.C, 16, 4);
  });
  /* 垂掛物登記：from..to 的頂點、結點 knot（權重 0）、尖端 tip（量擺盪用的頂點序）、每頂點權重 w（0＝跟骨、1＝整段偏移） */
  const swingOf = (name, from, knot, dir, len, tipIdx, wOf) => {
    const to = acc.P.length / 3, w = new Float32Array(to - from);
    for (let v = from; v < to; v++) w[v - from] = wOf([acc.P[v * 3], acc.P[v * 3 + 1], acc.P[v * 3 + 2]]);
    swings.push({ name, from, to, knot, dir, len, tip: tipIdx, w });
  };

  if (key === 'xiaonv') {
    const H = AC.HEMP, K = AC.KNOT;
    mark('麻布帶', () => {
      surfBand(acc, P, nBase, w0, H.Z, H.W, H.T, H.LIFT, H.SEG, (i, dz) => (hash(i, dz > 0 ? 1 : 2, 7) > 0.5 ? H.C : H.C2));
      /* 帶的指尖側邊緣一排毛邊（短尖錐） */
      for (let k = 0; k < H.FRAY_N; k++) {
        const th = (-30 + 230 * (k + 0.5 * hash(k, 3, 1)) / H.FRAY_N) * RAD, sf = wristSurf(P, nBase, w0, H.Z + H.W, th, 0.3), n = [Math.cos(th), Math.sin(th), 0];
        const p = [sf.cx + n[0] * (sf.r + H.LIFT + H.T * 0.6), sf.cy + n[1] * (sf.r + H.LIFT + H.T * 0.6), H.Z + H.W * 0.9];
        acc.spike(p, norm(add(mul(n, 0.3), [0, 0, 1])), H.FRAY_L * (0.6 + 0.8 * hash(k, 9, 2)), H.FRAY_W, H.C2);
      }
    });
    const th = K.TH * RAD, sf = wristSurf(P, nBase, w0, H.Z, th, 0.3), n = [Math.cos(th), Math.sin(th), 0];
    const knot = [sf.cx + n[0] * (sf.r + H.LIFT + H.T + K.R * 0.55), sf.cy + n[1] * (sf.r + H.LIFT + H.T + K.R * 0.55), H.Z];
    mark('側結', () => { acc.sphere(knot, K.R, K.C, 6, 4, [0.9, 1.15, 1.0], [0, 0, 1]); acc.sphere(add(knot, [0.012, -0.018, 0.022]), K.R * 0.72, H.C2, 6, 3, [1, 1, 1], n); });
    AC.TAILS.forEach((T, i) => {
      const from = acc.P.length / 3, dir = norm(T.DIR), side = norm(cross(dir, [0, 0, 1]).some((x) => Math.abs(x) > 1e-6) ? cross([0, 0, 1], dir) : [1, 0, 0]);
      const p0 = add(knot, mul(dir, K.R * 0.4));
      let tipIdx = -1, r = null;
      mark('垂尾' + (i + 1), () => {
        r = ribbon(acc, p0, dir, side, T.L, T.W, T.T, T.SEGS, T.CURL, AC.TAIL_FRAY.C);
        tipIdx = acc.P.length / 3; acc.vert(r.tip, r.dir, H.C2); // 尖端標記點（量擺盪／長度用；不進任何三角形）
        const F = AC.TAIL_FRAY; // 尾端毛邊
        for (let k = 0; k < F.N; k++) acc.spike(add(r.tip, mul(r.sd, (k - (F.N - 1) / 2) * T.W * 0.7)), norm(add(r.dir, mul(r.sd, (k - 1) * 0.3))), F.L * (0.7 + 0.6 * hash(i, k, 5)), F.W, F.C2);
      }, { tail: true });
      const len = Math.hypot(...sub(r.tip, knot));
      swingOf('垂尾' + (i + 1), from, knot, dir, len, tipIdx, (p) => Math.max(0, Math.min(1, dot(sub(p, knot), dir) / (len * 0.98))));
      parts[parts.length - 1].knot = knot; parts[parts.length - 1].tipVert = tipIdx;
    });
    /* 紙錢灰：手背幾小塊＋四指指尖背側（程式小塊；平面薄片貼皮，灰色） */
    const A = B3_ACC.ASH;
    mark('紙錢灰', () => {
      const flake = (c, nrm, r, k) => { const nn = norm(nrm), u = norm(cross(Math.abs(nn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], nn)), v = cross(nn, u), ids = [];
        for (let j = 0; j < 6; j++) { const a = (j / 6) * Math.PI * 2, rr = r * (0.6 + 0.6 * hash(k, j, 11)); ids.push(acc.vert(add(c, add(mul(u, Math.cos(a) * rr), mul(v, Math.sin(a) * rr))), nn, j % 2 ? A.C : A.C2)); }
        for (let j = 1; j + 1 < 6; j++) acc.I.push(ids[0], ids[j], ids[j + 1]); };
      for (let k = 0; k < A.BACK; k++) {
        const x = -0.30 + 0.52 * hash(k, 1, 3), z = 0.22 + 0.40 * hash(k, 2, 4), y = backTop(P, nBase, fo, palmY, x, z);
        flake([x, y + A.LIFT, z], [0, 1, 0], A.R0 + (A.R1 - A.R0) * hash(k, 5, 6), k);
      }
      for (const f of A.TIPS) {
        const a = J[f * 4 + 2], b = J[f * 4 + 3], q = add(a, mul(sub(b, a), 0.55));
        let best = -1, by = -1e9; for (let v = 0; v < nBase; v++) { if (fo.F[v] !== f || fo.S[v] < 2.2) continue; const dx = P[v * 3] - q[0], dz = P[v * 3 + 2] - q[2]; if (dx * dx + dz * dz > 0.03 * 0.03) continue; if (P[v * 3 + 1] > by) { by = P[v * 3 + 1]; best = v; } }
        if (best >= 0) flake([P[best * 3], P[best * 3 + 1] + A.LIFT, P[best * 3 + 2]], [0, 1, 0.15], A.R0 * 1.3 + 0.006 * hash(f, 8, 8), 20 + f);
      }
    });
  }

  if (key === 'lvshan') {
    const B = B3_ACC.BEADS;
    acc.setClass(3);
    for (let i = 0; i < B.N; i++) {
      const th = (B.FROM + (B.TO - B.FROM) * (i / (B.N - 1))) * RAD, sf = wristSurf(P, nBase, w0, B.Z, th, 0.3), n = [Math.cos(th), Math.sin(th), 0];
      const r = B.R * (0.97 + 0.06 * hash(i, 4, 2)), c = [sf.cx + n[0] * (sf.r + r * B.SIT), sf.cy + n[1] * (sf.r + r * B.SIT), B.Z];
      mark('念珠' + (i + 1), () => acc.sphere(c, r, B.C, B.SEG, B.RINGS, [1, 1, 1], n), { round: true, normal: n });
    }
    acc.setClass(5); // 角質／骨（縱紋、半光澤）
    const bone = mark('骨扳指（拇指）', () => fingerRing(acc, P, nBase, J, fo, B3_ACC.BONE.F, 1, B3_ACC.BONE), { round: true });
    parts[parts.length - 1].normal = bone.normal;
    acc.setClass(0);
    const F = B3_ACC.FU, cx = -0.06; // 手背中線（食指根 x 0.28 與小指根 −0.44 之間）
    mark('朱紅符形', () => {
      for (const [pts, w0s, w1s] of FU_STROKES) {
        const Q = pts.map(([s, t]) => [cx - s, t]), rows = [];
        for (let i = 0; i < Q.length; i++) {
          const a = Q[Math.max(0, i - 1)], b = Q[Math.min(Q.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
          const nx = -tz / tl, nz = tx / tl, u = Q.length > 1 ? i / (Q.length - 1) : 0, hw = w0s + (w1s - w0s) * u * u * (0.8 + 0.4 * hash(i, 3, 3));
          const L = [Q[i][0] + nx * hw, Q[i][1] + nz * hw], R = [Q[i][0] - nx * hw, Q[i][1] - nz * hw];
          rows.push([acc.vert([L[0], backTop(P, nBase, fo, palmY, L[0], L[1]) + F.LIFT, L[1]], up, F.C), acc.vert([R[0], backTop(P, nBase, fo, palmY, R[0], R[1]) + F.LIFT, R[1]], up, F.C)]);
        }
        for (let i = 0; i + 1 < rows.length; i++) acc.I.push(rows[i][0], rows[i + 1][0], rows[i][1], rows[i][1], rows[i + 1][0], rows[i + 1][1]);
      }
    });
  }

  if (key === 'luzhu') {
    const C = B3_ACC.CORD, Pz = B3_ACC.POUCH;
    C.Z.forEach((z, s) => mark('黃編繩' + (s + 1), () => {
      const pts = [];
      for (let i = 0; i <= C.SEGS; i++) {
        const th = (C.FROM + (C.TO - C.FROM) * (i / C.SEGS)) * RAD, zz = z + 0.006 * Math.sin(i * 1.7 + s * 2.0), sf = wristSurf(P, nBase, w0, zz, th, 0.3), n = [Math.cos(th), Math.sin(th), 0];
        pts.push([sf.cx + n[0] * (sf.r + C.R * C.SIT), sf.cy + n[1] * (sf.r + C.R * C.SIT), zz]);
      }
      acc.tube(pts, C.R, C.C, C.SIDES, 2);
    }));
    const th = Pz.TH * RAD, zk = (C.Z[0] + C.Z[1]) / 2, sf = wristSurf(P, nBase, w0, zk, th, 0.3), n = [Math.cos(th), Math.sin(th), 0];
    const knot = [sf.cx + n[0] * (sf.r + C.R * 1.6), sf.cy + n[1] * (sf.r + C.R * 1.6), zk], dir = norm(Pz.DIR);
    const from = acc.P.length / 3;
    let tipIdx = -1, bottom = null;
    mark('福袋', () => {
      const neck = add(knot, mul(dir, Pz.HANG));
      acc.tube([knot, add(knot, mul(dir, Pz.HANG * 0.5)), neck], C.R * 0.55, Pz.TIE, 4, 2); // 吊繩
      acc.ring(neck, dir, norm(cross(dir, [0, 0, 1])), norm(cross(dir, cross(dir, [0, 0, 1]))), 0.016, 0.016, 0.008, 0.008, Pz.TIE, 8, 3); // 束口
      for (let k = 0; k < Pz.RUFF; k++) { const a = (k / Pz.RUFF) * Math.PI * 2 + 0.4, o = add(mul(norm(cross(dir, [0, 0, 1])), Math.cos(a) * 0.012), mul([0, 0, 1], Math.sin(a) * 0.012)); acc.spike(add(neck, o), norm(add(mul(dir, -1), mul(o, 30))), 0.026, 0.010, Pz.C); } // 束口上方的布摺
      const body = add(neck, mul(dir, Pz.R * Pz.K[1] * 0.92));
      acc.sphere(body, Pz.R, Pz.C, 8, 5, Pz.K, mul(dir, -1));
      bottom = add(body, mul(dir, Pz.R * Pz.K[1]));
      tipIdx = acc.P.length / 3; acc.vert(bottom, dir, Pz.C); // 尖端標記點（袋底；不進三角形）
    }, { pouch: true });
    const len = Math.hypot(...sub(bottom, knot));
    swingOf('福袋', from, knot, dir, len, tipIdx, (p) => Math.max(0, Math.min(1, dot(sub(p, knot), dir) / Pz.HANG)));
    parts[parts.length - 1].knot = knot; parts[parts.length - 1].tipVert = tipIdx;
    const jade = mark('玉戒（無名指）', () => fingerRing(acc, P, nBase, J, fo, B3_ACC.JADE.F, 0, B3_ACC.JADE), { round: true });
    parts[parts.length - 1].normal = jade.normal;
  }
  /* 繞序統一（同 hand-b1）：面法線與頂點法線同向 */
  for (let t = 0; t < acc.I.length; t += 3) {
    const [ia, ib, ic] = [acc.I[t], acc.I[t + 1], acc.I[t + 2]], pa = [acc.P[ia * 3], acc.P[ia * 3 + 1], acc.P[ia * 3 + 2]];
    const f = cross(sub([acc.P[ib * 3], acc.P[ib * 3 + 1], acc.P[ib * 3 + 2]], pa), sub([acc.P[ic * 3], acc.P[ic * 3 + 1], acc.P[ic * 3 + 2]], pa));
    if (f[0] * acc.N[ia * 3] + f[1] * acc.N[ia * 3 + 1] + f[2] * acc.N[ia * 3 + 2] < 0) { acc.I[t + 1] = ic; acc.I[t + 2] = ib; }
  }
  return { acc, parts, swings };
}

/** 這種手的陣列版來源幾何（GLB 原幾何＋該角色袖口色）。 */
export function srcFor(baseSrc, key) {
  const CF = B3_CUFF[key];
  return { position: baseSrc.position, color: dressColors(baseSrc.position, baseSrc.color, baseSrc.colorSize, { CUFF: CF.CUFF, CLOTH: CF.CLOTH }), colorSize: 4, skinIndex: baseSrc.skinIndex, skinWeight: baseSrc.skinWeight, index: baseSrc.index };
}
/** realGeometry 的 ext：形狀＝預設手（REAL.DEFAULT，不縮放、不改形）；kind＝皮膚序（skin-proto 的三組：aSkin＝kind+1；沒載 skin-proto＝0 預設皮膚）。 */
export function extFor(rig, key, kind = 0, collide = false) {
  const ext = {
    real: { def: HR.REAL.DEFAULT, kind },
    swings: null,
    accessorize(d) {
      const { acc, parts, swings } = buildAcc(rig, d, key, collide), nOld = d.P.length / 3, ne = acc.P.length / 3;
      d.P = cat(d.P, acc.P, Float32Array); d.C = cat(d.C, acc.C, Float32Array); d.A = cat(d.A, acc.A, Float32Array);
      const si = new Uint16Array(ne * 4), sw = new Float32Array(ne * 4); for (let e = 0; e < ne; e++) sw[e * 4] = 1; // 權重由 realGeometry 依「最近的手部頂點」覆寫
      d.SI = cat(d.SI, si, Uint16Array); d.SW = cat(d.SW, sw, Float32Array);
      d.index = cat(d.index, Uint32Array.from(acc.I, (i) => i + nOld), Uint32Array);
      d.parts = parts.map((p) => ({ ...p, from: p.from + nOld, to: p.to + nOld, ...(p.tipVert !== undefined ? { tipVert: p.tipVert + nOld } : {}) }));
      ext.swings = swings.map((s) => ({ ...s, from: s.from + nOld, to: s.to + nOld, tip: s.tip + nOld }));
    },
  };
  return ext;
}
/** realGeometry 之後（建構時一次）：垂掛物整段改綁「結點附近皮膚的主骨」（權重 1），留一份靜止位置；回 geometry.userData.b3swing。 */
export function finalize(g, ext) {
  const SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, Pp = g.attributes.position.array, out = [];
  for (const s of ext.swings || []) {
    /* 結點附近：離結點最近的非垂掛頂點（帶／繩本身，已由 realGeometry 抄好皮膚權重）的主骨 */
    let best = -1, bd = Infinity;
    for (let v = 0; v < s.from; v++) { const dx = Pp[v * 3] - s.knot[0], dy = Pp[v * 3 + 1] - s.knot[1], dz = Pp[v * 3 + 2] - s.knot[2], dd = dx * dx + dy * dy + dz * dz; if (dd < bd) { bd = dd; best = v; } }
    let bone = SI[best * 4], bw = SW[best * 4]; for (let k = 1; k < 4; k++) if (SW[best * 4 + k] > bw) { bw = SW[best * 4 + k]; bone = SI[best * 4 + k]; }
    for (let v = s.from; v < s.to; v++) { SI[v * 4] = bone; SI[v * 4 + 1] = SI[v * 4 + 2] = SI[v * 4 + 3] = 0; SW[v * 4] = 1; SW[v * 4 + 1] = SW[v * 4 + 2] = SW[v * 4 + 3] = 0; }
    out.push({ name: s.name, from: s.from, to: s.to, bone, len: s.len, tip: s.tip, w: s.w, rest: Pp.slice(s.from * 3, s.to * 3), tipRest: [Pp[s.tip * 3], Pp[s.tip * 3 + 1], Pp[s.tip * 3 + 2]] });
  }
  g.attributes.skinIndex.needsUpdate = true; g.attributes.skinWeight.needsUpdate = true;
  g.userData.b3swing = out;
  return out;
}

/** 碰撞取樣的配件降採樣（效能，條件 10）：只取「凸出皮膚」的配件頂點（離最近原手頂點 > OFF dm；貼皮的部分由皮膚點代表），
 *  再依靜止位置落在 GRID dm 立方格、一格只留一點；垂掛物尖端標記點一律保留。【試玩必調】 */
export const COLLIDE = { GRID: 0.05, OFF: 0.03 };
/** 三種批 3 手共用的碰撞取樣來源：原手＋袖管（取第一種；三種逐值相同）＋三種手的配件（降採樣後聯集）。回 buildRig 要的 positions／skinIndex／skinWeight。 */
export function collideSource(geos) {
  const g0 = geos[0], r0 = g0.userData.real, nB = r0.nBase, a0 = r0.arm[0], a1 = r0.arm[1];
  const P = [], SI = [], SW = [];
  const push = (g, v) => { const p = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array; P.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); for (let k = 0; k < 4; k++) { SI.push(si[v * 4 + k]); SW.push(sw[v * 4 + k]); } };
  for (let v = 0; v < nB; v++) push(g0, v);
  for (let v = a0; v < a1; v++) push(g0, v);
  for (const g of geos) {
    const r = g.userData.real, p = g.attributes.position.array, cells = new Set(), keep = new Set((g.userData.b3swing || []).map((s) => s.tip)), off2 = COLLIDE.OFF * COLLIDE.OFF;
    for (let v = r.nBase; v < r.arm[0]; v++) {
      if (!keep.has(v)) {
        let bd = Infinity; for (let b = 0; b < r.nBase && bd > off2; b++) { const dx = p[b * 3] - p[v * 3], dy = p[b * 3 + 1] - p[v * 3 + 1], dz = p[b * 3 + 2] - p[v * 3 + 2], dd = dx * dx + dy * dy + dz * dz; if (dd < bd) bd = dd; }
        if (bd <= off2) continue; // 貼皮
      }
      const key = Math.floor(p[v * 3] / COLLIDE.GRID) + ',' + Math.floor(p[v * 3 + 1] / COLLIDE.GRID) + ',' + Math.floor(p[v * 3 + 2] / COLLIDE.GRID);
      if (cells.has(key) && !keep.has(v)) continue; cells.add(key); push(g, v);
    }
  }
  return { positions: new Float32Array(P), skinIndex: new Uint16Array(SI), skinWeight: new Float32Array(SW) };
}

/** 擺盪參數：彈簧角頻率 OMEGA（rad/s）、阻尼比 ZETA、慣性倍率 GAIN、偏移上限 MAX（×物件長）、單步 dt 上限 DT_MAX（超過分步）、dt 大於 DT_RESET 視同斷幀（歸零）、加速度上限 AMAX×物件長×ω²（擺位跳格只給有界的一推）。【試玩必調】 */
export const SWING = { OMEGA: 9.0, ZETA: 0.34, GAIN: 0.3, AMAX: 1.5, MAX: 0.45, DT_MAX: 1 / 45, DT_RESET: 0.25 };

/** 一隻手的擺盪執行體（setSeats 時建一次）。update(dt, mesh, floorY)：mesh 的骨世界矩陣須是這一幀的；floorY＝桌面世界 y。
 *  工作變數全部在這裡預配，update／reset 內不 new 任何物件、不建幾何。 */
export function createSwing(geo) {
  const list = geo.userData.b3swing || [];
  const pos = geo.attributes.position;
  const T = new THREE.Matrix4(), Ti = new THREE.Matrix4(), va = new THREE.Vector3(), vb = new THREE.Vector3();
  const st = list.map((s) => ({ s, o: new Float64Array(3), v: new Float64Array(3), p0: new Float64Array(3), p1: new Float64Array(3), p2: new Float64Array(3), n: 0, rigid: new Float64Array(3), tip: new Float64Array(3) }));
  let lo = Infinity, hi = -1; for (const s of list) { lo = Math.min(lo, s.from); hi = Math.max(hi, s.to); }
  function write(k, dx, dy, dz) {
    const { s } = st[k], A = pos.array;
    for (let v = s.from, i = 0; v < s.to; v++, i++) { const w = s.w[i]; A[v * 3] = s.rest[i * 3] + w * dx; A[v * 3 + 1] = s.rest[i * 3 + 1] + w * dy; A[v * 3 + 2] = s.rest[i * 3 + 2] + w * dz; }
  }
  function flush() {
    if (hi < 0) return;
    if (pos.addUpdateRange) { pos.clearUpdateRanges(); pos.addUpdateRange(lo * 3, (hi - lo) * 3); } else if (pos.updateRange) { pos.updateRange.offset = lo * 3; pos.updateRange.count = (hi - lo) * 3; }
    pos.needsUpdate = true;
  }
  const api = {
    count: list.length,
    /** 歸零（手收起／換席）：狀態清空、頂點回靜止位置。 */
    reset() { for (let k = 0; k < st.length; k++) { const e = st[k]; e.o.fill(0); e.v.fill(0); e.n = 0; write(k, 0, 0, 0); } flush(); },
    update(dt, mesh, floorY) {
      if (!st.length) return;
      if (!(dt > 0)) return;
      if (dt > SWING.DT_RESET) { api.reset(); return; }
      const bones = mesh.skeleton.bones, inv = mesh.skeleton.boneInverses;
      for (let k = 0; k < st.length; k++) {
        const e = st[k], s = e.s;
        /* 跟骨的剛性變換（attached：world＝boneWorld·boneInverse·bindMatrix·pos；否則再乘 matrixWorld·bindMatrixInverse） */
        T.multiplyMatrices(bones[s.bone].matrixWorld, inv[s.bone]).multiply(mesh.bindMatrix);
        if (mesh.bindMode !== 'attached') T.premultiply(mesh.bindMatrixInverse).premultiply(mesh.matrixWorld);
        va.set(s.tipRest[0], s.tipRest[1], s.tipRest[2]).applyMatrix4(T);
        e.rigid[0] = va.x; e.rigid[1] = va.y; e.rigid[2] = va.z;
        const len = s.len * Math.cbrt(Math.abs(T.determinant())); // 物件長（世界）
        /* 剛性尖端的加速度（前兩幀差分）；沒有兩幀歷史＝0 */
        e.p2.set(e.p1); e.p1.set(e.p0); e.p0[0] = va.x; e.p0[1] = va.y; e.p0[2] = va.z; e.n = Math.min(e.n + 1, 3);
        const steps = Math.ceil(dt / SWING.DT_MAX), h = dt / steps, w2 = SWING.OMEGA * SWING.OMEGA, c = 2 * SWING.ZETA * SWING.OMEGA, max = SWING.MAX * len;
        /* 加速度上限 AMAX×物件長×ω²：擺位解算偶爾一幀跳格（瞬移）只給有界的一推，不會把垂掛物甩到天邊 */
        let ax = 0, ay = 0, az = 0;
        if (e.n >= 3) { ax = (e.p0[0] - 2 * e.p1[0] + e.p2[0]) / (dt * dt); ay = (e.p0[1] - 2 * e.p1[1] + e.p2[1]) / (dt * dt); az = (e.p0[2] - 2 * e.p1[2] + e.p2[2]) / (dt * dt); }
        const am = Math.hypot(ax, ay, az), aMax = SWING.AMAX * len * w2, ak = am > aMax ? aMax / am : 1;
        for (let j = 0; j < 3; j++) {
          const acc = (j === 0 ? ax : j === 1 ? ay : az) * ak;
          for (let q = 0; q < steps; q++) { e.v[j] += (-w2 * e.o[j] - c * e.v[j] - SWING.GAIN * acc) * h; e.o[j] += e.v[j] * h; }
        }
        const m = Math.hypot(e.o[0], e.o[1], e.o[2]); if (m > max) { const f = max / m; for (let j = 0; j < 3; j++) { e.o[j] *= f; e.v[j] *= f; } }
        /* 不穿桌：尖端世界 y 不低於桌面 */
        if (e.rigid[1] + e.o[1] < floorY) { e.o[1] = floorY - e.rigid[1]; if (e.v[1] < 0) e.v[1] = 0; }
        e.tip[0] = e.rigid[0] + e.o[0]; e.tip[1] = e.rigid[1] + e.o[1]; e.tip[2] = e.rigid[2] + e.o[2];
        /* 世界偏移 → 靜止空間偏移（剛性變換的逆） */
        Ti.copy(T).invert();
        vb.set(e.tip[0], e.tip[1], e.tip[2]).applyMatrix4(Ti);
        write(k, vb.x - s.tipRest[0], vb.y - s.tipRest[1], vb.z - s.tipRest[2]);
      }
      flush();
    },
    /** 治具出口（只讀）：各垂掛物的名稱、尖端世界位置（含擺盪）、剛性位置、物件世界長。 */
    state() { return st.map((e) => ({ name: e.s.name, tip: [e.tip[0], e.tip[1], e.tip[2]], rigid: [e.rigid[0], e.rigid[1], e.rigid[2]], offset: Math.hypot(e.o[0], e.o[1], e.o[2]) })); },
  };
  return api;
}
