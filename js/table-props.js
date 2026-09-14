// 妖市 3D 環境層 — 桌上道具（v0.56b 上桌卷**第二段**，Layer 1）
//
// 這一支負責「競標這件事在桌上留下什麼實體痕跡」：
//   ① 壽命銅錢籌碼：出價時從自己席位推出去的方孔銅錢（幾命幾枚，>8 改成一串）
//   ② 血玉令牌：盯上時重重拍在目標托盤前的那一枚刻「盯」方牌
//   ③ 十席信物：十個角色各一件常駐桌角的紙紮小物
//
// ★為什麼不放進 table-tray.js★：那支檔頭寫的職責是「今夜這 4 件拍品在桌上長什麼樣、
// 點下去是哪一格」——它是**拍品**的家。籌碼／令牌／信物是**席位**的東西（誰出了價、誰盯了、誰坐在那），
// 兩者的生命週期也不同（拍品跟著 setItems 換，道具跟著出價／盯上／開標走）。
// 分成兩檔，table-tray 只負責把本檔的 group 掛進自己的 group（對決時整組跟著收）。
//
// 圖層契約（同 table-tray 檔頭）：
//   演出層（index.html）單向推 `ys:bid`／`ys:mark`／`ys:market` 的 `seats` 欄位 →
//   renderer.js 的 listener → 本檔；**3D 層不回頭讀 S**、不耗亂數（決定性種子）、
//   也不知道什麼是「壽命」——`bid(seat, slot, amount)` 只回答幾何問題「從哪推幾枚到哪」。
//
// 幾何預算（凍結檔 U3；每一件都要 ≤300 三角形）：
//   銅錢 96／枚（12 段外緣＋方孔）、令牌 128／枚（圓角方牌＋七道陽刻）、信物 30～150／件。
//   ★籌碼與令牌走 InstancedMesh★：32 枚銅錢與 4 枚令牌各只花 **1 個 draw call**——
//   逐枚一顆 Mesh 的話光籌碼就是 32 個 call，把第一段辛苦壓下來的預算整個吃掉。
//
// 快取破除：本檔由 table-tray.js 以 `./table-props.js?v=<VERSION>` 載入（同 renderer.js 檔頭那段）。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
/* 頂點色建構器與決定性亂數收斂在 scene-env（環境幾何的家），本檔不另抄一份。 */
const { vcBuilder, seedRnd } = await import('./scene-env.js' + V);

/** 道具常數表（**全部【試玩必調】**）。橫式／直式兩套座標，直式分支的鍵一律掛在 `.P` 底下。 */
export const PROPS = {
  /* ── 壽命銅錢 ───────────────────────────────────────────────────────── */
  CHIP: {
    /* 尺寸（自評 r3 放大一輪）：0.052 的錢在牌桌機位上只有 ~12px，成圖上是一撮分不出形狀的橘點。
       0.072 之後單枚約 17px、方孔看得出來，一疊八枚也還在「一小疊錢」的尺度內（不搶拍品）。 */
    R: 0.072, // 外緣半徑
    HOLE: 0.024, // 方孔半邊長
    T: 0.011, // 錢厚
    SEG: 12, // 外緣段數（96 tris／枚的來源）
    MAX: 8, // 一席一格最多推幾枚；**超過改成一串**（STRING）
    /* 四席 × 四格 × 每格八枚：玩家選擇保住最多 128 枚的逐枚實體感。
       InstancedMesh 仍是一個 draw call；增加的是最多 12,288 三角形，不是 128 次繪製。 */
    POOL_MAX: 128,
    /* 古銅三階：錢面吃光、錢緣壓暗、方孔內壁最暗。第一版只給一個銅色，
       在暗紅布上讀成一顆顆橘點；分三階之後才看得出「這是一枚有厚度的錢」。 */
    face: 0x9c7434, edge: 0x5a4119, hole: 0x3a2a10,
    patina: 0x4f7a5e, // 綠鏽：只在少數幾枚的 instanceColor 上帶一點
    FLY_MS: 0.42, // 從席位推到托盤前要多久
    GAP: 0.038, // 同一席相鄰兩枚的間距（攤開時）
    LIFT: 0.055, // 飛行途中的最高拋物線高度
    /* 一串（>8 枚）：銅錢立起來沿著一條短弧排，讀起來就是「一串錢」。
       ★不另做幾何★——同一批 instance 換個姿態，0 新三角形、0 新 draw call。 */
    STRING: { n: 8, gap: 0.022, tilt: 0.22 },
  },
  /* ── 血玉令牌 ───────────────────────────────────────────────────────── */
  TOKEN: {
    /* 尺寸（自評 r3 放大一輪，理由同銅錢）：0.072×0.094 在成圖上是一塊看不出刻字的紅片。 */
    W: 0.098, H: 0.128, T: 0.022, // 半寬／半高／厚
    jade: 0x6d1220, jadeHi: 0x9c2434, jadeLo: 0x3c0810, // 暗紅玉三階
    carve: 0xc24a54, // 陽刻「盯」：比玉面亮，吃得到燈籠光
    SLAM_MS: 0.30, // 從席位拍下來要多久
    RISE: 0.34, // 途中先舉高多少（「重重拍」的蓄勢）
    BOUNCE: 0.055, // 落地回彈高度
    BOUNCE_MS: 0.16,
  },
  /* ── 十席信物 ───────────────────────────────────────────────────────── */
  /* SCALE 1.0 → 1.75（自評 r3）：1.0 的信物在 844×390 牌桌機位上只有 20～28px，
     成圖上讀成「桌上幾點雜物」——連是什麼形狀都看不出來（`r3-bid3d.png`）。
     1.75 之後最高的那件（白幡）約 48px，剪影看得出來，仍遠小於拍品（~98px）。 */
  RELIC: { SCALE: 1.75, Y: 0.1518 /* 桌頂 0.15 ＜ 香灰 0.1512 ＜ 符咒 0.1515 ＜ 信物 ＜ 紅布 0.152 */ },
  /* ── 四席錨點（世界 x／z；y 一律取桌頂）──────────────────────────────
   * 席序＝`DIRS`（0 南／1 北／2 西／3 東），與 `renderSeats` 寫 `#southX`／`#northSeat`／
   * `#westSeat`／`#eastSeat` 的那四格同一組編號，不另訂一套。
   * ★不是直接用 `scene-env` 的 `SEAT_POS`（半徑 2.6）★：牌桌機位俯角 35°、鏡頭在 z≈2.95，
   * 南席 z=2.6 換算下來在垂直視野之外（實測離視軸 46°＞半 FOV 25°）——擺在那裡玩家一輩子看不到。
   * 下面這組是往桌心收進來、落在掏空窗內的落點（量測見報告 §3 U5）。 */
  /* ★西／東退到「近側桌角」（z≈+0.95）而不是正側邊★（自評 r1／r2 兩輪實測）：
     r1 擺 (±2.02, −0.42)、r2 退到 (±2.42, −1.55)，`tray.hitTest` 對它們的中心**兩次都回 0／3**
     ——命中盒是依 GLB 包圍盒收緊的（半邊 ~0.42、高 0.84），從相機射出去的那條線在盒子的
     高度區間內就穿過去了。往**前**擺之後同一條線在 y=0.84／y=0 兩個高度上的 z 都落在
     盒子的 z 範圍（−0.32～0.52）之外 ⇒ 幾何上穿不到，不必去動命中盒（那會動到 T2）。
     x 的上限是**掏空窗**：側欄 168px ⇒ 3D 真的露得出來的只有 NDC x ∈ ±0.583，
     再往外就被市集卡蓋住。下面這組是量出來的落點（r3 實測見報告 §3 U5）。 */
  SEAT: {
    L: [[0, 1.22], [0, -1.92], [-1.38, 0.98], [1.36, 1.06]],
    P: [[0, 0.92], [0, -1.62], [-0.46, 0.62], [0.46, 0.62]],
  },
  /** 籌碼／令牌落在「托盤前」的 z 偏移（相對 `TRAY.Z`）。紅布半深 0.46，所以 L 的 0.52 剛好在布緣外。 */
  /* P 從 0.26 拉到 0.40（自評 p2 實測）：直式水平半視角只有 12.2°，0.26 那一版籌碼與令牌的
     包圍盒跑到 NDC ±1.06（**露在畫面外**），而且令牌中心的射線會穿到槽 2 的命中盒（hitTest 回 2）。
     往前擺之後兩件事一起解決：離相機近 ⇒ 同樣的世界寬度佔的 NDC 變小、射線也落在命中盒的 z 之外。 */
  DROP_Z: { L: 0.52, P: 0.40 },
  /** 同一格四席各自的橫向讓位（避免四家的錢疊成一坨）。 */
  SEAT_DX: [-0.075, 0.075, -0.075, 0.075],
  SEAT_DZ: [0.055, -0.055, -0.005, 0.005],
};

/* ═══ 幾何小工具（本檔內共用，別處不要抄）═══════════════════════════════ */

/** 一個盒（6 面 12 三角形），可繞 y 轉 `yaw`。頂面可另給顏色＝吃光的那一面。 */
function box(b, c, h, colSide, colTop, yaw) {
  const [x, y, z] = c, [hx, hy, hz] = h;
  const top = colTop === undefined ? colSide : colTop;
  const co = yaw ? Math.cos(yaw) : 1, si = yaw ? Math.sin(yaw) : 0;
  const p = (sx, sy, sz) => {
    const u = sx * hx, w = sz * hz;
    return [x + u * co - w * si, y + sy * hy, z + u * si + w * co];
  };
  /* ★繞法（自評 r4 抓到的真因）★：`computeVertexNormals` 對非索引幾何是**逐面依繞法**算法線的，
     第一版六個面的繞法全部是反的 ⇒ 頂面的法線指向**下方**，只吃得到 HemisphereLight 的
     **地面色**（`ENV.HEMI_GROUND = 0x8a5626`，暖褐）——所以不管頂點色給多白，成圖上一律是
     「牛皮紙箱色」（`crop-dice.png` 放大四倍看得一清二楚）。這不是亮度問題也不是色溫問題，
     是法線方向錯了。下面六行是**把每一面的頂點順序整個倒過來**的版本，法線才朝外。 */
  b.quad(p(-1, 1, 1), p(1, 1, 1), p(1, 1, -1), p(-1, 1, -1), top); // 上
  b.quad(p(-1, -1, -1), p(1, -1, -1), p(1, -1, 1), p(-1, -1, 1), colSide); // 下
  b.quad(p(1, -1, 1), p(1, 1, 1), p(-1, 1, 1), p(-1, -1, 1), colSide); // 前
  b.quad(p(-1, -1, -1), p(-1, 1, -1), p(1, 1, -1), p(1, -1, -1), colSide); // 後
  b.quad(p(-1, -1, 1), p(-1, 1, 1), p(-1, 1, -1), p(-1, -1, -1), colSide); // 左
  b.quad(p(1, -1, -1), p(1, 1, -1), p(1, 1, 1), p(1, -1, 1), colSide); // 右
}

/** 繞 y 轉一個 [x,y,z]（盒是軸對齊的，要斜擺的小物用這個轉點）。 */
function rotY(p, a, o) {
  const co = Math.cos(a), si = Math.sin(a);
  const x = p[0] - o[0], z = p[2] - o[2];
  return [o[0] + x * co - z * si, p[1], o[2] + x * si + z * co];
}

/** 一個 n 段的錐台（側面 n 個 quad ＋ 頂面 n 個三角形；底面不做——桌上的東西看不到底）。 */
function frustum(b, cx, cz, y0, y1, r0, r1, n, colSide, colTop) {
  const pt = (r, y, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r]; };
  for (let i = 0; i < n; i++) {
    b.quad(pt(r0, y0, i), pt(r0, y0, i + 1), pt(r1, y1, i + 1), pt(r1, y1, i), colSide);
    b.tri([cx, y1, cz], pt(r1, y1, i), pt(r1, y1, i + 1), colTop === undefined ? colSide : colTop);
  }
}

/* ═══ 銅錢幾何（96 tris）═══════════════════════════════════════════════ */
function chipGeometry() {
  const C = PROPS.CHIP, n = C.SEG, b = vcBuilder();
  /* 方孔邊界上「與角度 a 對應」的那一點：把單位圓投影到正方形上（取 max(|x|,|z|) 當除數）。
     這樣外緣與方孔的段數一致，中間那一圈才配得成 quad，不必另做三角化。 */
  const inner = (i) => {
    const a = (i / n) * Math.PI * 2, sx = Math.sin(a), sz = Math.cos(a);
    const m = Math.max(Math.abs(sx), Math.abs(sz)) || 1;
    return [C.HOLE * sx / m, C.HOLE * sz / m];
  };
  const outer = (i) => { const a = (i / n) * Math.PI * 2; return [C.R * Math.sin(a), C.R * Math.cos(a)]; };
  const yT = C.T / 2, yB = -C.T / 2;
  for (let i = 0; i < n; i++) {
    const o0 = outer(i), o1 = outer(i + 1), i0 = inner(i), i1 = inner(i + 1);
    const P = (p, y) => [p[0], y, p[1]];
    b.quad(P(o0, yT), P(o1, yT), P(i1, yT), P(i0, yT), C.face); // 錢面（上）
    b.quad(P(i0, yB), P(i1, yB), P(o1, yB), P(o0, yB), C.edge); // 錢背（下，壓暗）
    b.quad(P(o0, yB), P(o1, yB), P(o1, yT), P(o0, yT), C.edge); // 外緣
    b.quad(P(i0, yT), P(i1, yT), P(i1, yB), P(i0, yB), C.hole); // 方孔內壁（最暗）
  }
  /* ★一點點自發光★（做法與理由同 `table-tray.js` 的 `tray-cloth`，也同第一段把 `RIM_BASE`
     從 1.3 拉到 2.9 的那一課）：桌面只吃得到四盞燈籠的一點邊光，不自己透光的小物在成圖上
     一律讀成「幾點雜物」（實測 `r3-bid3d.png`）。emissive 是 MeshStandardMaterial 本來就有的欄位，
     0 draw call、0 新 program、0 三角形。值壓在 bloom 門檻 0.7 以下（牌桌本來就不開 bloom）。 */
  const m = b.build('chip', { roughness: 0.55, metalness: 0.55, emissive: new THREE.Color(0x2a1d08) });
  return { geo: m.geometry, mat: m.material, tris: b.count() / 3 };
}

/* ═══ 令牌幾何（圓角方牌＋陽刻「盯」）═════════════════════════════════ */
function tokenGeometry() {
  const T = PROPS.TOKEN, b = vcBuilder();
  const W = T.W, H = T.H, yT = T.T / 2, yB = -T.T / 2;
  /* 圓角外框：每個角三個點，一圈共 12 點。頂面用 fan、側面用 quad 環。 */
  const R = 0.022;
  const ring = [];
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (const [sx, sz] of corners) {
    for (let k = 0; k < 3; k++) {
      const a = Math.atan2(sz, sx) + (k - 1) * (Math.PI / 8);
      ring.push([sx * (W - R) + Math.cos(a) * R, sz * (H - R) + Math.sin(a) * R]);
    }
  }
  const P = (p, y) => [p[0], y, p[1]];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length];
    b.tri([0, yT, 0], P(a, yT), P(c, yT), T.jade, T.jadeHi, T.jadeHi); // 玉面：中央深、邊緣亮（拋過光的玉）
    b.tri([0, yB, 0], P(c, yB), P(a, yB), T.jadeLo);
    b.quad(P(a, yB), P(c, yB), P(c, yT), P(a, yT), T.jadeLo, T.jadeLo, T.jade, T.jade); // 側緣
  }
  /* 陽刻「盯」：七道凸起的短條（左「目」五道、右「丁」兩道）。
     ★不刻凹字★——凹進去在這個機位只有 2～3px，什麼都看不到；凸起才吃得到燈籠的邊光。
     每道＝頂面一個 quad ＋ 四個側面，10 三角形。 */
  const e = 0.0075; // 凸起高度
  const K = T.W / 0.072; // 刻字跟著牌面一起放大（下面那組座標是 W=0.072 那一版量的）
  const bars = [
    // 目：外框兩豎＋三橫（x 往左為負）
    [-0.036, 0.0, 0.006, 0.046], [-0.004, 0.0, 0.006, 0.046],
    [-0.020, 0.042, 0.020, 0.005], [-0.020, 0.0, 0.020, 0.005], [-0.020, -0.042, 0.020, 0.005],
    // 丁：一橫一豎
    [0.032, 0.038, 0.026, 0.006], [0.032, -0.006, 0.006, 0.038],
  ];
  for (const [cx, cz, hx, hz] of bars) box(b, [cx * K, yT + e / 2, -cz * K], [hx * K, e / 2, hz * K], T.carve, T.carve);
  const m = b.build('mark-token', { roughness: 0.38, metalness: 0.08, emissive: new THREE.Color(0x2a0610) });
  return { geo: m.geometry, mat: m.material, tris: b.count() / 3 };
}

/* ═══ 十席信物 ═════════════════════════════════════════════════════════
 * 角色鍵＝`ROLES` 的 id（index.html:1058）。語意見報告 §2 的對照表。
 * 每一件都是「桌角一件小物」的尺度（最長邊 ≤0.26、最高 ≤0.16），不搶拍品。 */
const RELIC = {
  /* 收驚婆・白米香爐：一碗白米插三炷香（收驚的米卦就是這樣插的） */
  shoujing(b) {
    frustum(b, 0, 0, 0, 0.052, 0.030, 0.055, 8, 0xcfc6b4, 0xe6e0d2); // 粗陶碗
    frustum(b, 0, 0, 0.050, 0.068, 0.050, 0.022, 6, 0xefeadc, 0xf6f2e8); // 白米堆
    for (let i = 0; i < 3; i++) {
      const a = -0.5 + i * 0.5, x = Math.sin(a) * 0.016, z = Math.cos(a) * 0.010;
      box(b, [x, 0.105, z], [0.0035, 0.045, 0.0035], 0x6b4a2c, 0x8a6038); // 香腳
      box(b, [x, 0.150, z], [0.0045, 0.006, 0.0045], 0xd8541e, 0xffa040); // 香頭火點
    }
  },
  /* 當鋪・算盤＋當票：一把小算盤斜靠著一張捲起一角的當票 */
  dangpu(b) {
    const fr = 0x4a2c14, bead = 0x2a1a10, pap = 0xd8caa4, ink = 0x241c14;
    box(b, [0, 0.012, 0], [0.090, 0.006, 0.048], fr, 0x63401e); // 框
    box(b, [0, 0.022, 0], [0.082, 0.004, 0.004], 0x2f1c0c); // 橫樑
    for (let i = 0; i < 5; i++) {
      const x = -0.064 + i * 0.032;
      box(b, [x, 0.026, -0.026], [0.009, 0.008, 0.009], bead, 0x4a3020);
      box(b, [x, 0.026, 0.024], [0.009, 0.008, 0.009], bead, 0x4a3020);
    }
    // 當票：一張斜插在算盤後面的紙，中間一道墨
    const o = [0.088, 0, -0.016];
    const q = (u, v, y) => rotY([o[0] + u * 0.052, y, o[2] + v * 0.034], -0.45, o);
    b.quad(q(-1, -1, 0.002), q(1, -1, 0.030), q(1, 1, 0.030), q(-1, 1, 0.002), pap, pap, 0xbfae88, 0xbfae88);
    b.quad(q(-0.25, -1, 0.0035), q(0.25, -1, 0.0315), q(0.25, 1, 0.0315), q(-0.25, 1, 0.0035), ink);
  },
  /* 組頭・字花明牌：一塊立著的木牌，上頭三道墨字（字花的「明牌」） */
  zutou(b) {
    box(b, [0, 0.010, 0.010], [0.055, 0.010, 0.022], 0x3a2412, 0x5a3a1e); // 牌座
    box(b, [0, 0.072, 0], [0.048, 0.052, 0.006], 0x8a6a3c, 0xb08c52); // 牌面
    for (let i = 0; i < 3; i++) box(b, [0, 0.106 - i * 0.030, -0.007], [0.016, 0.008, 0.002], 0x1a1410, 0x241c16);
  },
  /* 青面攤主・白骨骰子：兩顆骨色骰子。
     ★r4 重做★：第一版只在頂面壓**一整片**暗色 quad，在成圖上讀成「兩個牛皮紙箱」
     （`r3-bid3d.png`／`r4-bid3d.png` 兩輪都是）——骰子之所以是骰子，靠的是**點**不是面。
     改成頂面五點／三點（各一個小 quad）＋朝鏡頭那一面再補一點，骨色也從暖白改成**偏冷的骨白**
     （暖白在四盞暖燈籠下一定被推成紙箱色，這是色溫問題不是亮度問題）。 */
  qingmian(b) {
    const bone = 0xeceef2, dark = 0xa8acb6, pip = 0x140c12;
    const d = (cx, cz, r, s, pips) => {
      const c = [cx, s, cz];
      box(b, c, [s, s, s], dark, bone);
      const dot = (u, v, y, face) => {
        const q = s * 0.17; // 一點的半徑（r4：0.15 太小看不見、0.26 相鄰兩點會黏在一起）
        const P = face
          ? (du, dv) => rotY([cx + (u + du) * s, y + (v + dv) * s, cz + s * 1.002], r, c)
          : (du, dv) => rotY([cx + (u + du) * s, y, cz + (v + dv) * s], r, c);
        b.quad(P(-q / s, q / s), P(q / s, q / s), P(q / s, -q / s), P(-q / s, -q / s), pip); // 繞法同 box 的頂面（法線朝外）
      };
      for (const [u, v] of pips) dot(u, v, s * 2 + 0.0012, false); // 頂面
      dot(0, 0, s, true); // 朝鏡頭那一面補一點（側面也看得出是骰子）
    };
    d(-0.035, 0.012, 0.4, 0.030, [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]]); // 五點
    d(0.032, -0.020, -0.7, 0.026, [[-0.55, -0.55], [0, 0], [0.55, 0.55]]); // 三點
  },
  /* 紅衣婆婆・紅繡鞋：一隻翹頭的小紅繡鞋（金線一道） */
  hongyi(b) {
    const red = 0x8e1420, redHi = 0xc02434, gold = 0xbf9a3a;
    box(b, [0, 0.010, 0], [0.062, 0.010, 0.026], 0x2a0c10, 0x3a1218); // 鞋底
    box(b, [-0.012, 0.032, 0], [0.046, 0.022, 0.024], red, redHi); // 鞋身
    // 翹起來的鞋頭：一片往上折的斜面
    b.quad([0.034, 0.020, -0.024], [0.034, 0.020, 0.024], [0.070, 0.058, 0.012], [0.070, 0.058, -0.012], redHi);
    b.quad([-0.058, 0.054, -0.022], [-0.012, 0.054, -0.022], [-0.012, 0.054, 0.022], [-0.058, 0.054, 0.022], red, redHi, redHi, red); // 鞋口
    box(b, [-0.012, 0.048, 0.0245], [0.040, 0.003, 0.001], gold, gold); // 金繡線
  },
  /* 斷手書生・斷筆：一支從中間折斷的毛筆，兩截斜斜岔開，斷口留一截白茬。
     ★r4 重做★：第一版的桿只做了三個面、半徑 0.008，成圖上是一條**看不見**的細線
     （`rA-roles.png` 西席整件不可辨）。改成有厚度的實心桿（`box` 帶 yaw）、桿色提亮，
     筆毛改成明顯的黑錐——一支筆的剪影靠的是「亮桿＋黑頭」的明暗對比，不是細節。 */
  duanshou(b) {
    const shaft = 0xa98a54, shaftHi = 0xd4b578, hair = 0x171310, hairTip = 0x4a423a, snap = 0xe8dcc0, thread = 0x8e2018;
    box(b, [-0.030, 0.016, 0.004], [0.052, 0.016, 0.016], shaft, shaftHi, 0.16); // 有筆毛的那半
    box(b, [0.062, 0.014, -0.030], [0.042, 0.014, 0.014], shaft, shaftHi, -0.58); // 折開岔出去的那半
    box(b, [0.020, 0.017, 0.010], [0.006, 0.017, 0.016], snap, snap, 0.16); // 斷口的白茬
    box(b, [-0.052, 0.016, -0.004], [0.005, 0.014, 0.014], thread, thread, 0.16); // 綁在桿上的紅線
    // 筆毛：從桿口收成一支尖錐（四面）
    const tip = [-0.134, 0.014, -0.012];
    const r = 0.015, cx = -0.082, cz = -0.003;
    const c0 = [cx, 0.016 + r, cz], c1 = [cx, 0.016 - r, cz];
    const c2 = [cx, 0.016, cz + r], c3 = [cx, 0.016, cz - r];
    b.tri(c0, c2, tip, hair, hair, hairTip); b.tri(c2, c1, tip, hair, hair, hairTip);
    b.tri(c1, c3, tip, hair, hair, hairTip); b.tri(c3, c0, tip, hair, hair, hairTip);
  },
  /* 獵人・獸夾：兩片張開的弧形夾口，內緣一排尖齒 */
  hunter(b) {
    const iron = 0x4e4a46, ironHi = 0x77716a, tooth = 0x8f8880;
    frustum(b, 0, 0, 0, 0.010, 0.046, 0.042, 10, 0x33302c, 0x44403a); // 底盤
    for (const s of [1, -1]) {
      for (let i = 0; i < 5; i++) {
        const a0 = s * (0.35 + i * 0.30), a1 = s * (0.35 + (i + 1) * 0.30);
        const p = (a, r, y) => [Math.sin(a) * r, y, Math.cos(a) * r];
        b.quad(p(a0, 0.040, 0.010), p(a1, 0.040, 0.010), p(a1, 0.052, 0.046), p(a0, 0.052, 0.046), iron, iron, ironHi, ironHi);
        b.tri(p(a0, 0.052, 0.046), p(a1, 0.052, 0.046), p((a0 + a1) / 2, 0.030, 0.070), tooth); // 尖齒
      }
    }
  },
  /* 孝女白琴・白幡：一支竹竿挑著一面白幡，下緣兩條垂穗 */
  xiaonv(b) {
    const pole = 0x9a8a5e, cloth = 0xe8e6df, clothLo = 0xb9b6ad, mourn = 0x30302e;
    box(b, [0, 0.010, 0], [0.028, 0.010, 0.018], 0x3a3228, 0x4e4438); // 座
    box(b, [0, 0.088, 0], [0.005, 0.078, 0.005], pole, 0xb8a672); // 竿
    // 幡面：3×2 格，下緣略往外飄
    for (let i = 0; i < 3; i++) {
      const y0 = 0.148 - i * 0.036, y1 = y0 - 0.036;
      const f0 = i * 0.006, f1 = (i + 1) * 0.006;
      b.quad([0.006, y0, -0.030 - f0], [0.006, y0, 0.030 + f0], [0.006 + f1, y1, 0.030 + f1], [0.006 + f1, y1, -0.030 - f1],
        i ? clothLo : cloth, i ? clothLo : cloth, cloth, cloth);
    }
    box(b, [0.012, 0.100, -0.022], [0.002, 0.020, 0.002], mourn, mourn); // 兩道喪字
    box(b, [0.012, 0.100, 0.022], [0.002, 0.020, 0.002], mourn, mourn);
  },
  /* 閭山法師・法印：一顆帶鈕的方印，印面朝下、旁邊一小攤硃砂 */
  lvshan(b) {
    const wood = 0x5a2f1c, woodHi = 0x7e4526, cin = 0x8e1c1c;
    box(b, [0, 0.020, 0], [0.044, 0.020, 0.044], wood, woodHi); // 印身
    box(b, [0, 0.052, 0], [0.012, 0.014, 0.012], 0x3f2114, 0x63351c); // 印鈕
    box(b, [0, 0.070, 0], [0.022, 0.006, 0.010], 0x3f2114, 0x63351c);
    b.quad([-0.040, 0.0405, -0.040], [0.040, 0.0405, -0.040], [0.040, 0.0405, 0.040], [-0.040, 0.0405, 0.040], cin); // 沾了硃砂的印面（朝上給人看）
    frustum(b, 0.070, 0.034, 0, 0.008, 0.024, 0.018, 6, 0x6b1414, cin); // 硃砂盒
  },
  /* 普渡爐主・香爐：三足銅爐，爐裡一炷香 */
  luzhu(b) {
    const bro = 0x7a6234, broHi = 0xa98c4c, ash = 0xb9b2a4;
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3) + 0.5;
      box(b, [Math.sin(a) * 0.034, 0.011, Math.cos(a) * 0.034], [0.008, 0.011, 0.008], 0x4c3c1e, bro); // 三足
    }
    frustum(b, 0, 0, 0.020, 0.062, 0.040, 0.052, 8, bro, broHi); // 爐身
    frustum(b, 0, 0, 0.058, 0.066, 0.048, 0.040, 8, ash, 0xd0c9ba); // 香灰面
    for (const s of [-1, 1]) box(b, [s * 0.060, 0.056, 0], [0.010, 0.004, 0.008], broHi, broHi); // 雙耳
    box(b, [0.004, 0.108, -0.004], [0.0035, 0.042, 0.0035], 0x6b4a2c, 0x8a6038); // 一炷香
    box(b, [0.004, 0.152, -0.004], [0.0045, 0.006, 0.0045], 0xd8541e, 0xffa040);
  },
};
/** 角色 id → 信物名（報告與治具共用同一份；`ROLES` 沒對上的走 fallback） */
export const RELIC_NAME = {
  shoujing: '白米香爐', dangpu: '算盤＋當票', zutou: '字花明牌', qingmian: '白骨骰子',
  hongyi: '紅繡鞋', duanshou: '斷筆', hunter: '獸夾', xiaonv: '白幡',
  lvshan: '法印', luzhu: '三足香爐',
};
/** 對不上任何一個角色時的退路：一塊素木牌（不留空——空著會讓「這一席沒東西」與「壞掉」分不出來） */
function relicFallback(b) { box(b, [0, 0.012, 0], [0.042, 0.012, 0.026], 0x4a3a28, 0x6b5438); }

/**
 * 建立桌上道具層。
 * @param parent 掛進去的 Group（table-tray 的 group ⇒ 對決時整組跟著收）
 * @param opts   { onSlam(slot) 令牌落地那一刻的回呼（給托盤那一格抖一下） }
 */
export function createTableProps(parent, opts = {}) {
  const group = new THREE.Group();
  group.name = 'table-props';
  parent.add(group);
  const onSlam = opts.onSlam || null;

  // ── 籌碼池：1 顆 InstancedMesh 管四席四格、最多 128 枚 ──────────────
  const CH = PROPS.CHIP;
  const chipG = chipGeometry();
  const CHIP_N = CH.POOL_MAX;
  const chips = new THREE.InstancedMesh(chipG.geo, chipG.mat, CHIP_N);
  chips.name = 'prop-chips';
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chips.count = 0;
  chips.visible = false;
  chips.frustumCulled = false;
  /* 逐枚一點點色差（有的偏綠鏽、有的磨得亮）。instanceColor 是乘上去的，
     所以這裡放的是倍率色而不是絕對色。0 新 draw call、0 新三角形。 */
  {
    const R = seedRnd(60613);
    const c = new THREE.Color(), pat = new THREE.Color(CH.patina);
    for (let i = 0; i < CHIP_N; i++) {
      const k = 0.82 + R() * 0.34;
      c.setRGB(k, k, k);
      if (R() < 0.22) c.lerp(pat, 0.30); // 少數幾枚帶綠鏽
      chips.setColorAt(i, c);
    }
    if (chips.instanceColor) chips.instanceColor.needsUpdate = true;
  }
  group.add(chips);

  // ── 令牌池：一席一枚，1 顆 InstancedMesh ─────────────────────────────
  const TK = PROPS.TOKEN;
  const tokG = tokenGeometry();
  const tokens = new THREE.InstancedMesh(tokG.geo, tokG.mat, 4);
  tokens.name = 'prop-tokens';
  tokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tokens.count = 0;
  tokens.visible = false;
  tokens.frustumCulled = false;
  group.add(tokens);

  // ── 狀態 ────────────────────────────────────────────────────────────
  let mode = 'L'; // 'L' 橫式／'P' 直式
  let trayXS = [0, 0, 0, 0], trayY = 0.152, trayZ = 0.10, trayScale = 1;
  /** 每一枚籌碼：seat／slot／出發點／落點／飛行進度。**沒有任何賽局欄位**。 */
  const chipRec = [];
  let droppedChips = 0;
  /** 每一席的令牌：slot（−1＝沒盯）／飛行進度／回彈。 */
  const tokRec = [0, 1, 2, 3].map((seat) => ({ seat, slot: -1, t: 0, bounce: 0, done: false, hit: false }));
  /** 四席信物：{ seat, role, mesh } */
  const relics = [null, null, null, null];
  let seatRoles = [null, null, null, null];

  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const Pv = new THREE.Vector3();
  const Sv = new THREE.Vector3(1, 1, 1);
  const EU = new THREE.Euler();

  const seatXZ = (seat) => PROPS.SEAT[mode][seat] || [0, 0];
  const dropZ = () => trayZ + PROPS.DROP_Z[mode];
  /** 一枚籌碼在「攤開」姿態下的落點（第 k 枚，共 n 枚） */
  function spreadAt(seat, slot, k, n) {
    const gap = CH.GAP * (mode === 'P' ? 0.62 : 1);
    const row = Math.min(4, n), col = k % row, rowI = Math.floor(k / row);
    const w = (row - 1) * gap;
    return [
      trayXS[slot] + PROPS.SEAT_DX[seat] * (mode === 'P' ? 0.6 : 1) - w / 2 + col * gap,
      trayY + CH.T / 2 + rowI * CH.T * 1.05,
      dropZ() + PROPS.SEAT_DZ[seat] * (mode === 'P' ? 0.6 : 1) + rowI * gap * 0.5,
    ];
  }
  /** 一串（>8 枚）：銅錢立起來沿一條短弧排——同一批 instance 換姿態，0 新幾何。 */
  function stringAt(seat, slot, k) {
    const S = CH.STRING, gap = S.gap * (mode === 'P' ? 0.62 : 1);
    const x0 = trayXS[slot] + PROPS.SEAT_DX[seat] * (mode === 'P' ? 0.6 : 1) - (S.n - 1) * gap / 2;
    return [x0 + k * gap, trayY + CH.R * 0.92, dropZ() + PROPS.SEAT_DZ[seat] * (mode === 'P' ? 0.6 : 1)];
  }

  function writeChips() {
    let n = 0;
    for (const c of chipRec) {
      const t = Math.min(1, c.t);
      const e = 1 - (1 - t) * (1 - t) * (1 - t); // easeOutCubic：推出去是「滑」不是「彈」
      const px = c.from[0] + (c.to[0] - c.from[0]) * e;
      const pz = c.from[2] + (c.to[2] - c.from[2]) * e;
      const py = c.from[1] + (c.to[1] - c.from[1]) * e + Math.sin(Math.PI * t) * CH.LIFT;
      /* 一串的姿態是立著的（繞 x 轉 90°），攤開的是躺平的。飛行途中線性補到目標姿態。 */
      EU.set(c.stand ? (Math.PI / 2) * e : 0, c.yaw, c.stand ? CH.STRING.tilt * e : 0);
      Q.setFromEuler(EU);
      Pv.set(px, py, pz);
      M.compose(Pv, Q, Sv);
      chips.setMatrixAt(n, M);
      n++;
    }
    chips.count = n;
    chips.visible = n > 0;
    if (n > 0) chips.instanceMatrix.needsUpdate = true;
  }

  function writeTokens() {
    let n = 0;
    for (const r of tokRec) {
      if (r.slot < 0) continue;
      const t = Math.min(1, r.t);
      const e = t * t; // easeInQuad：落下來是**加速**的，才讀得出「重重拍」
      const from = seatXZ(r.seat);
      const to = r.to;
      const px = from[0] + (to[0] - from[0]) * e;
      const pz = from[1] + (to[2] - from[1]) * e;
      const py = trayY + TK.T / 2 + TK.RISE * Math.sin(Math.PI * t) * (1 - e * 0.4) + r.bounce;
      EU.set(0, r.yaw, 0);
      Q.setFromEuler(EU);
      Pv.set(px, py, pz);
      M.compose(Pv, Q, Sv);
      tokens.setMatrixAt(n, M);
      n++;
    }
    tokens.count = n;
    tokens.visible = n > 0;
    if (n > 0) tokens.instanceMatrix.needsUpdate = true;
  }

  function placeRelics() {
    for (let i = 0; i < 4; i++) {
      const r = relics[i]; if (!r) continue;
      const [x, z] = seatXZ(i);
      r.mesh.position.set(x, PROPS.RELIC.Y, z);
      /* 一律面向桌心（像是那一席的人自己擺出來的），並依席次微轉一點點，四件才不會排得像樣品。 */
      r.mesh.rotation.y = Math.atan2(-x, -z) + [0.18, -0.12, 0.24, -0.24][i];
      r.mesh.scale.setScalar(PROPS.RELIC.SCALE * (mode === 'P' ? 0.72 : 1));
    }
  }

  const api = {
    group,
    /** 托盤把自己的版面（槽位 x、桌面 y、托盤 z、縮放、橫直式）告訴道具層。唯一的版面入口。 */
    setLayout(m, xs, y, z, scale) {
      mode = m === 'P' ? 'P' : 'L';
      trayXS = xs.slice(); trayY = y; trayZ = z; trayScale = scale;
      // 已經在桌上的籌碼／令牌要跟著新版面走，不然轉向之後它們留在舊座標上
      for (const c of chipRec) {
        const t = c.stand ? stringAt(c.seat, c.slot, c.k) : spreadAt(c.seat, c.slot, c.k, c.n);
        c.to = t;
        if (c.t >= 1) c.from = t.slice();
      }
      for (const r of tokRec) if (r.slot >= 0) r.to = [trayXS[r.slot], trayY, dropZ()];
      placeRelics();
      writeChips(); writeTokens();
    },
    /** 四席各是哪個角色（`{id, role}` 陣列，id＝`DIRS` 的 0..3）⇒ 換上對應的信物。 */
    setSeats(list) {
      const arr = Array.isArray(list) ? list : [];
      const want = [null, null, null, null];
      for (const s of arr) { const i = s && s.id | 0; if (i >= 0 && i < 4) want[i] = (s && s.role) || null; }
      for (let i = 0; i < 4; i++) {
        if (want[i] === seatRoles[i] && relics[i]) continue;
        if (relics[i]) {
          group.remove(relics[i].mesh);
          relics[i].mesh.geometry.dispose(); relics[i].mesh.material.dispose();
          relics[i] = null;
        }
        seatRoles[i] = want[i];
        if (!want[i]) continue;
        const b = vcBuilder();
        (RELIC[want[i]] || relicFallback)(b);
        /* `DoubleSide`（自評 r4）：十件信物是手寫的小片幾何，quad 的繞法要逐個人工顧
           ——漏一個就是一片黑或一片不見。DoubleSide 之下 three 會依 `gl_FrontFacing` 自動翻法線，
           **看到哪一面就照那一面打光**，繞法寫錯不再是視覺缺陷。成本 0 draw call、0 三角形
           （同 `table-tray.js` 的 `tray-cloth`／`tray-curse` 已經在用的那條）。 */
        const mesh = b.build('relic-' + want[i], { side: THREE.DoubleSide, roughness: 0.86, metalness: 0.05, emissive: new THREE.Color(0x1f1a14) });
        mesh.userData.tris = b.count() / 3;
        group.add(mesh);
        relics[i] = { seat: i, role: want[i], mesh };
      }
      placeRelics();
    },
    /** 出價：從 seat 的席位推 `amount` 枚到 slot 的托盤前（上限 8；超過改成一串）。純演出。 */
    bid(seat, slot, amount) {
      const s = seat | 0, k = slot | 0, amt = Math.max(0, amount | 0);
      if (!(s >= 0 && s < 4) || !(k >= 0 && k < trayXS.length)) return 0;
      api.clearBids(s, k); // 同一席同一格是**覆寫**，不疊兩份
      if (amt <= 0) return 0; // 0＝收回（出價歸零、熱座交棒清場走這條）
      const stand = amt > CH.MAX;
      const n = stand ? CH.STRING.n : Math.min(CH.MAX, amt);
      const [fx, fz] = seatXZ(s);
      for (let i = 0; i < n; i++) {
        const to = stand ? stringAt(s, k, i) : spreadAt(s, k, i, n);
        chipRec.push({
          seat: s, slot: k, k: i, n, stand, amt,
          from: [fx, trayY + CH.T / 2, fz], to,
          yaw: (i * 0.7) % (Math.PI * 2), t: 0, delay: i * 0.035,
        });
      }
      // 只在超過明示的 128 枚硬上限時才裁掉最舊的；合法四席四格局面不會走到這裡。
      while (chipRec.length > CHIP_N) { chipRec.shift(); droppedChips++; }
      writeChips();
      return n;
    },
    /** 盯上：seat 的令牌重重拍在 slot 的托盤前。 */
    mark(seat, slot) {
      const s = seat | 0, k = slot | 0;
      if (!(s >= 0 && s < 4) || !(k >= 0 && k < trayXS.length)) return false;
      const r = tokRec[s];
      r.slot = k; r.t = 0; r.bounce = 0; r.done = false; r.hit = false;
      r.to = [trayXS[k] + PROPS.SEAT_DX[s] * 0.5, trayY, dropZ() - 0.055];
      r.yaw = [0.06, Math.PI + 0.06, -Math.PI / 2 + 0.1, Math.PI / 2 - 0.1][s];
      writeTokens();
      return true;
    },
    /** 開標結果：這一格得標的是 winnerSeat ⇒ 他的錢留在桌上，其餘各家的收回自己席位。 */
    settle(slot, winnerSeat) {
      const k = slot | 0, w = winnerSeat === null || winnerSeat === undefined ? -1 : winnerSeat | 0;
      for (const c of chipRec) {
        if (c.slot !== k || c.seat === w || c.back) continue;
        const [fx, fz] = seatXZ(c.seat);
        c.from = [c.to[0], c.to[1], c.to[2]];
        c.to = [fx, trayY + CH.T / 2, fz];
        c.t = 0; c.delay = 0; c.back = true; c.stand = false;
      }
      writeChips();
    },
    /** 某一席某一格的舊籌碼清掉（同一席重複出價時不疊兩份） */
    clearBids(seat, slot) {
      for (let i = chipRec.length - 1; i >= 0; i--) {
        const c = chipRec[i];
        if ((seat === undefined || c.seat === seat) && (slot === undefined || c.slot === slot)) chipRec.splice(i, 1);
      }
      writeChips();
    },
    /** 換一夜：桌上的錢與令牌全收。**不動信物**（那是常駐的）。 */
    clearRound() {
      chipRec.length = 0;
      droppedChips = 0;
      for (const r of tokRec) { r.slot = -1; r.t = 0; r.bounce = 0; }
      writeChips(); writeTokens();
    },
    /** 治具／驗收出口（只讀）：現在桌上有幾枚錢、幾枚令牌、幾件信物，各花多少三角形。 */
    stats() {
      return {
        chips: chips.count, chipTris: chipG.tris, chipsTotalTris: chips.count * chipG.tris,
        chipPool: CHIP_N, chipMax: CH.MAX, chipStringN: CH.STRING.n, dropped: droppedChips,
        bids: Object.values(chipRec.reduce((out, c) => {
          const key = c.seat + ':' + c.slot;
          const row = out[key] || (out[key] = { seat: c.seat, slot: c.slot, want: c.amt, on: 0, stand: c.stand });
          row.on++;
          return out;
        }, {})),
        tokens: tokens.count, tokenTris: tokG.tris,
        relics: relics.filter(Boolean).map((r) => ({ seat: r.seat, role: r.role, name: RELIC_NAME[r.role] || '（退路素木牌）', tris: r.mesh.userData.tris })),
        mode,
        /* 命中測試排除的證明：本層一顆都不在 `tray.hitTest` 的 proxies 裡（凍結檔 U2）。
           這個欄位回報「道具層的 mesh 名稱」，治具拿去跟 raycaster 的目標清單比對。 */
        names: group.children.map((o) => o.name),
      };
    },
    update(dt) {
      let live = false;
      for (const c of chipRec) {
        if (c.t >= 1) continue;
        if (c.delay > 0) { c.delay -= dt; live = true; continue; }
        c.t = Math.min(1, c.t + dt / CH.FLY_MS);
        live = true;
      }
      for (const r of tokRec) {
        if (r.slot < 0) continue;
        if (r.t < 1) {
          r.t = Math.min(1, r.t + dt / TK.SLAM_MS);
          live = true;
          if (r.t >= 1 && !r.hit) {
            r.hit = true;
            r.bounce = TK.BOUNCE;
            if (onSlam) onSlam(r.slot); // 落地震動：那一格的拍品抖一下（托盤那一側自己決定怎麼抖）
          }
        }
        if (r.bounce > 0) { r.bounce = Math.max(0, r.bounce - dt * TK.BOUNCE / TK.BOUNCE_MS); live = true; }
      }
      if (live) { writeChips(); writeTokens(); }
    },
    dispose() {
      group.remove(chips, tokens);
      chipG.geo.dispose(); chipG.mat.dispose();
      tokG.geo.dispose(); tokG.mat.dispose();
      chips.dispose(); tokens.dispose();
      for (let i = 0; i < 4; i++) {
        if (!relics[i]) continue;
        group.remove(relics[i].mesh);
        relics[i].mesh.geometry.dispose(); relics[i].mesh.material.dispose();
        relics[i] = null;
      }
      seatRoles = [null, null, null, null];
      if (group.parent) group.parent.remove(group);
    },
  };
  return api;
}
