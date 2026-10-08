// 妖市 3D 環境層 — 桌心紅布托盤（v0.56b 上桌卷第一段，Layer 1）
//
// 這一支負責「今夜這 4 件拍品在桌上長什麼樣、點下去是哪一格」。
// ★為什麼不放進 scene-env.js★（計畫 §1）：那支檔頭 `:2` 明寫「純視覺、不讀寫遊戲狀態」，
// 而托盤要吃「今夜有哪 4 件」的清單。分成兩檔才不會讓 scene-env 變成半個狀態容器。
//
// 圖層契約（計畫 §6 Q3）：
//   演出層（index.html）單向推 `ys:market` → renderer.js 的 listener → tray.setItems(list)；
//   3D 層**不回頭讀 S**、不耗亂數（決定性種子），也不知道什麼是「出價」——
//   `hitTest(u,v)` 只回答幾何問題「這個 NDC 落在第幾格」，由 index.html 依相位分派
//   openSheet(i)／pickMark(i)。
//
// 快取破除：本檔由 renderer.js 以 `./table-tray.js?v=<VERSION>` 載入，底下的相對 import
// 必須接力同一個查詢字串（同 renderer.js 檔頭那段），否則 creature-figures 會被載成兩份、
// glbCache 分岔。
import * as THREE from 'three';
/** v0.62.1 ?handslow=k：index.html 解析網址一次放在 window.YS_ANIM_SLOW（沒有／非正數＝1）；只讀（詛咒推按規劃看扒回的錢時，時間窗跟著放慢）。 */
const handSlow = () => { const v = globalThis.YS_ANIM_SLOW; return v && v.hand > 0 ? v.hand : 1; };

const V = new URL(import.meta.url).search;
const { makeCreatureFigure, creatureGlbUrl, FACTION_RIM } = await import('./creature-figures.js' + V);
/* 頂點色幾何的建構器與決定性亂數收斂在 scene-env（環境幾何的家），本檔不另抄一份。 */
const { vcBuilder, seedRnd: rnd } = await import('./scene-env.js' + V);
/* 桌上道具（v0.56b 第二段）：籌碼／令牌／信物。掛進本檔的 group ⇒ 對決時整組跟著收。 */
const { createTableProps } = await import('./table-props.js' + V);
/* 席位之手（階段二 2a）：四席各一隻寫實右手，與 props 並列掛進本檔的 group（對決時整組收）；不進 hitTest 的 proxies。 */
const { createTableHands } = await import('./table-hands.js' + V);
/* 法寶鑑賞頁（v0.59.2）丙案（燒符揭幕＋照妖鏡）的螢幕空間疊層：一支 shader 畫壓暗／鏡子／符紙，理由見該檔檔頭。 */
const { createAppraiseFx, APPR_FX } = await import('./appraise-fx.js' + V);
/* v0.60.0 得標「手抓回」＋詛咒「推過去按住＋紙錢繩纏腕」的時間軸（純函式，見該檔檔頭）。
   開關：index.html 的 CFG.GRAB_ON（經 ys:reveal-result 的 grabMs 帶進來；0＝舊拋物線）＋網址 `?grab=0`（本檔也認，兩道都關得掉）。 */
const GM = await import('./grab-motion.js' + V);
const GRAB_URL_OFF = new URLSearchParams((globalThis.location && globalThis.location.search) || '').get('grab') === '0';

/* POOL 的系名是 zuling/xianghuo/yinqi，FACTION_RIM 的鍵是 zuli/xianghu/yinqi（兩套拼法並存，
   與 renderer.js 的 RIM_BY_FAC 同一份對照）。 */
const RIM_BY_FAC = { zuling: FACTION_RIM.zuli, xianghuo: FACTION_RIM.xianghu, yinqi: FACTION_RIM.yinqi };

/** 托盤常數表（計畫 §2.4 的起值；**全部【試玩必調】**）。
 *  §2.4 列名的 8 個鍵一字不改；HIT／YAW／CURSE／SHADOW 是本卷實作時加的，不覆寫上面任何一個。 */
export const TRAY = {
  Y: 0.152, // 桌面頂 0.15 之上一點
  Z: 0.10,
  XS: [-1.35, -0.45, 0.45, 1.35], // CFG.MARKET 恆為 4（index.html:622）
  SCALE: 0.70, // 模型高 ≤1.2（creature-figures NORM.maxH）→ 世界高 ≤0.84 → 螢幕約 98px
  /* 描邊外殼：**只掛在 hover 的那一件**（製作人 2026-09-13 裁定的視覺取捨）。
     ★為什麼★：外殼是每顆本體 mesh 複製一份，四件全掛就是 15043 個三角形——占整張牌桌的 43%，
     而 hover 本來就是「現在看的是這一件」的高亮語意，沒在看的三件不需要陣營描邊。
     實測：四件全掛 34722 tris／113 calls；只掛 hover 那一件 ~23.4k／~79 calls。
     `?table3d=lite` 時連 hover 那一件也不掛（＝降級鈕，使用者裁 Q3 丙）。 */
  OUTLINE: true, // ?table3d=lite 時 false（使用者裁 Q3 丙）
  HOVER_SPIN: 0.6, // rad/s
  HOVER_LIFT: 0.06,
  /* 布面：第一版 d=1.2、無滾邊，盲看讀成「桌上一攤血」而不是神案紅布（自評 r1 A）。
     收窄成 0.92 並補上金織滾邊（老廟神案的紅布一定有一圈繡邊），拍品才從背景跳出來。 */
  CLOTH: { w: 3.6, d: 0.92, color: 0x6e1616, gold: 0x6f5220, emissive: 0x210606 },

  // ── 以下為實作時新增（不在 §2.4 列名內）──────────────────────────────
  /** 命中盒（世界單位）。模型載完之後依包圍盒收緊，載入前先用這組讓「還沒載完也點得到」。 */
  HIT: { w: 0.62, h: 0.86, d: 0.52, pad: 0.07 },
  /** 四格各自的基準朝向（rad）：往畫面中央微轉，像擺出來給人看的陳列，不是四尊立正。 */
  YAW: [0.20, 0.07, -0.07, -0.20],
  /** 邊光倍率（setRim 的參數；1＝對決時那一檔）。托盤上的拍品**靜置時就比對決亮很多**。
   *  ★1.3 → 2.9 是描邊改成「只掛 hover 那一件」的配套，不是調亮而已★：
   *  實測 `r7-n1.png`——把其餘三件的描邊外殼拿掉之後，桌上**四尊全部消失**。
   *  它們其實都在場（`items()` 回 `visible:true`、17972 個三角形有在畫），
   *  但紙紮本體在暗紅布上只吃得到四盞燈籠的一點邊光，先前「看得見」靠的**全是那圈描邊外殼**。
   *  邊光是**本體材質上的 fresnel 項**（`creature-figures.js` 的 `TAIL`），
   *  拉它 **0 draw call、0 三角形**——正好補回外殼讓出來的那 11k 個三角形。 */
  RIM_BASE: 2.9,
  RIM_HOVER: 4.2,
  /** v0.59.1 開卡停靠卷（凍結 #1／#8 二次裁定）：滑鼠指標停在拍品上＝原本的抬升＋自轉＋RIM_HOVER，
   *  不動；點窄籤開卡＝改用這個「只亮不動」態——比滑鼠 hover 更亮一階，但不抬升、不自轉，
   *  位置與旋轉在整段開卡期間跟關卡前逐值相同（見 setHover 的 `still` 參數）。 */
  RIM_STILL: 5.6,
  HOVER_MS: 0.16,
  /** v0.59.2 法寶鑑賞頁（凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md #1）：
   *  點窄籤推近＋自轉＋idle 上下輕浮，取代 v0.59.1 的「只亮不動」開卡停靠。節奏中等（使用者裁定）：
   *  推近 0.35 秒、自轉 6 秒一圈（法寶大小改由照妖鏡內圈決定，見 FILL）。
   *  全部【試玩必調】。 */
  APPRAISE: {
    DOLLY_MS: 350,
    SPIN_RAD_S: (Math.PI * 2) / 6,
    LIFT: 0.10,
    BOB_AMP: 0.028,
    BOB_HZ: 0.42,
    RIM: 6.4,
    /* 丙案（v0.59.2 修訂，凍結 #11）：法寶框進鏡子內圈。取景不再抓「約佔畫面高 40%」，改用「自轉包絡」——
     * 法寶繞 Y 軸轉一整圈、每個角度的投影框都要落在「鏡面半徑 × FILL」的圓內（寬體如虎爺印轉到側面也不出鏡）。 */
    FILL: 0.99,
    ENV_N: 48,       // 自轉包絡取樣角度數（7.5° 一格；取樣之間的框寬誤差 <0.5%，FILL 留 1% 蓋過）
    MIN_H: 0.37,     // 這一幀框高低於畫面高的這個比例就再推近（寬體補償，見 updateAppraiseCamera；凍結 #1(a) 門檻 35%）
    LAYER: 7,        // 焦點法寶所在圖層：第一趟（世界）不畫它，疊層之後單獨畫一趟
    HIDE_LAYER: 8,   // 其餘拍品鑑賞中移到這一層（相機從不打開）＝不畫；返回時整份遮罩原樣還原
  },
  /** 詛咒品占位：一疊綑起來的舊符紙＋紫黑陰火（ART_BIBLE §4「詛咒＝有作者的惡意、是物不是靈」） */
  /* 詛咒占位（自評 r1 E／F：第一版讀成「紙箱」、陰火是方塊像素）：
     紙張改薄、層距收窄、尺寸壓小，墨黑改成兩條細符文帶；陰火粒子縮小並隨高度淡出。 */
  CURSE: {
    paper: [0xa89058, 0x7d6a3c, 0x5d4d2c], // 泛黃紙色三階（壓暗，別跟香灰撞亮度）
    ink: 0x1c1712, // 墨黑
    cord: 0x8a2a18, // 綑綁的血褐紅細線
    fire: 0x5b3a86, // 紫黑陰火（壓在 bloom 門檻 0.7 以下，牌桌本來就不開 bloom，這裡只是別太亮）
    w: 0.13, h: 0.18, // 一張符紙的半寬／半高
    thick: 0.006, gap: 0.013, // 紙厚／層距
    n: 18, // 陰火粒子數
    size: 0.03, // 陰火粒徑
    rise: 0.30, // 一顆火苗升多高就重生
    speed: 0.20, // 上升速度（世界單位／秒）
  },

  /** ── 直式分支（v0.56b 第二段）──────────────────────────────────────
   *  直式視野只有 390 寬、相機 aspect < 1，橫式的 XS ±1.35 兩端整個掉出畫面
   *  （實測：外側兩格的 NDC x 落在 ±1.4 之外）。所以**槽距與縮放各給一組直式值**，
   *  紅布用**非均勻 scale** 收窄（不重建幾何：0 新 geometry、0 新 draw call），
   *  籌碼／令牌／信物另由 `table-props` 的 `SEAT.P` 與 `DROP_Z.P` 跟著收。
   *  `HITK`＝命中盒的等比縮放（直式 `#tray` 是 display:none、點不到，但 `slotScreen`
   *  與治具照樣要問得到那一格在螢幕哪裡，所以命中盒也得跟著縮）。 */
  /* 直式的水平視野只有半角 12.2°（fov 50 是**垂直**的，390/844 的 aspect 把水平壓到 tan25×0.462）
     ⇒ 托盤那一排在 z=0.06 的深度上，畫面邊緣只對應到世界 x=±0.75。
     外側兩格的中心因此不能超過 ±0.60（還要留模型自己的半寬）；p2 實測再收到 ±0.50，
     才連帶讓擺在槽前的籌碼（槽 x ± 0.1）也留在畫面內。這一組是量出來的，不是猜的。 */
  P: {
    XS: [-0.50, -0.167, 0.167, 0.50],
    SCALE: 0.40,
    Z: 0.06,
    CLOTH_SX: 0.42, CLOTH_SZ: 0.72,
    HITK: 0.56,
  },
  /** 舊路徑（CFG.GRAB_ON=false／`?grab=0`／手沒載到）的飛行秒數：得標拋物線 0.86、毒標轉移 0.72（v0.60.0 起由寫死改成常數，值不變）。 */
  AWARD_FLY_S: 0.86,
  CURSE_FLY_S: 0.72,
  /** v0.60.0 紙錢繩（詛咒 C，只在被按住階段出現）：管徑（世界單位；844 寬下視覺粗度須 ≥3px，驗收 #8）、繞腕半徑、圈數、直段長、紙錢張數與顏色。 */
  ROPE: { R: 0.0145, WRAP_R: 0.036, TURNS: 1.8, LEN: 0.18, PAPERS: 8, COLOR: 0xa8261a, EMISSIVE: 0x5c0c06, PAPER: 0xd8c08a },
};

/** 目前這個朝向要用哪一組版面常數。判準只問相機的長寬比（`resizeSceneEnv` 每次 resize 會更新它）。 */
function layoutOf(portrait) {
  return portrait
    ? { XS: TRAY.P.XS, SCALE: TRAY.P.SCALE, Z: TRAY.P.Z, HITK: TRAY.P.HITK, SX: TRAY.P.CLOTH_SX, SZ: TRAY.P.CLOTH_SZ, mode: 'P' }
    : { XS: TRAY.XS, SCALE: TRAY.SCALE, Z: TRAY.Z, HITK: 1, SX: 1, SZ: 1, mode: 'L' };
}

/* ── 紅布托盤：3.6×1.2 的圓角布面，布緣垂墜一圈短 fin 當布褶 ──────────────
 * 紙紮語法（ART_BIBLE）：不貼圖，靠「摺面 ＋ 摺處壓暗」的頂點色做出布的厚度。 */
function makeCloth(liteMode) {
  const { w, d, color, gold, emissive } = TRAY.CLOTH;
  const b = vcBuilder();
  const base = new THREE.Color(color);
  const goldC = new THREE.Color(gold);
  const tone = (k) => base.clone().multiplyScalar(k);
  /* NZ 從 8 拉到 12（自評 r2）：滾邊是「最外一圈格子」，NZ=8 時那一圈佔了 1/8 的深度，
     加上金色本身比暗紅亮，整片托盤在成圖上讀成一塊橘褐色板子、紅布反而看不見。
     NZ=12 之後滾邊只佔 8%，而且金色壓暗、布面提亮，明暗關係才回到「暗紅布＋一圈舊金繡邊」。
     2026-09-13 幾何預算（製作人裁定「先減非主角的」）：20×12 → 16×10，三角形 606 → 424。
     滾邊仍是最外一圈＝深度的 10%（8%→10%，肉眼分不出）；皺褶是**頂點色與 y 起伏**畫的，
     格子少了兩成起伏的取樣點變疏，但 wrinkle 的週期（sin 2.9x／4.3z）本來就遠大於一格。 */
  const NX = liteMode ? 12 : 16, NZ = liteMode ? 8 : 10;
  const R = rnd(9173);
  // 布面每一格的四個角：y 給一點皺褶起伏，頂點色在褶的低處壓暗
  const wrinkle = (x, z) => 0.0075 * Math.sin(x * 2.9 + 0.4) * Math.cos(z * 4.3) + 0.003 * Math.sin(x * 7.1 + z * 5.2);
  // 邊緣往外微微起伏（scallop）：直角矩形讀起來像塑膠板，波緣才像布
  const edgeOff = (t) => 0.035 * Math.sin(t * Math.PI * 5);
  const px = (i) => -w / 2 + (i / NX) * w;
  const pz = (k) => -d / 2 + (k / NZ) * d;
  const cornerPull = (x, z) => {
    // 圓角：四個角往內縮，讓布不是尖角
    const ax = Math.abs(x) / (w / 2), az = Math.abs(z) / (d / 2);
    const k = Math.max(0, ax + az - 1.55) * 0.55;
    return k;
  };
  const P = [];
  for (let k = 0; k <= NZ; k++) {
    const row = [];
    for (let i = 0; i <= NX; i++) {
      let x = px(i), z = pz(k);
      const pull = cornerPull(x, z);
      x *= (1 - pull); z *= (1 - pull * 0.5);
      if (k === 0 || k === NZ) z += (z < 0 ? -1 : 1) * edgeOff(i / NX);
      if (i === 0 || i === NX) x += (x < 0 ? -1 : 1) * edgeOff(k / NZ) * 0.4;
      row.push([x, TRAY.Y + wrinkle(x, z), z]);
    }
    P.push(row);
  }
  for (let k = 0; k < NZ; k++) {
    for (let i = 0; i < NX; i++) {
      const a = P[k][i], b2 = P[k][i + 1], c2 = P[k + 1][i + 1], d2 = P[k + 1][i];
      // 最外一圈格子＝金織滾邊；其餘是布面：摺的低處壓暗、高處提亮，再加一點決定性的織紋雜訊
      const rim = (k === 0 || k === NZ - 1 || i === 0 || i === NX - 1);
      const shade = (p) => (rim
        ? goldC.clone().multiplyScalar(0.72 + (p[1] - TRAY.Y) * 22 + R() * 0.20)
        : tone(1.00 + (p[1] - TRAY.Y) * 26 + R() * 0.10));
      b.quad(a, b2, c2, d2, shade(a), shade(b2), shade(c2), shade(d2));
    }
  }
  // 布緣垂墜：沿著四邊各掛一圈短 fin，下緣高低交錯＝布褶
  const ring = [];
  for (let i = 0; i <= NX; i++) ring.push(P[0][i]);
  for (let k = 1; k <= NZ; k++) ring.push(P[k][NX]);
  for (let i = NX - 1; i >= 0; i--) ring.push(P[NZ][i]);
  for (let k = NZ - 1; k >= 1; k--) ring.push(P[k][0]);
  const dark = tone(0.40), darker = tone(0.26);
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b2 = ring[i + 1];
    const ha = 0.055 + 0.035 * (i % 2 ? 1 : 0) + 0.012 * R();
    const hb = 0.055 + 0.035 * ((i + 1) % 2 ? 1 : 0) + 0.012 * R();
    b.quad(a, b2, [b2[0], b2[1] - hb, b2[2]], [a[0], a[1] - ha, a[2]], dark, dark, darker, darker);
  }
  /* 一點點自發光（不是加色 pass、不是新光源）：神案的紅布在四盞燈籠之間本來就照不太到，
     全靠反射光的話拍品腳下是一片近黑。給材質一個很暗的 emissive 讓布自己「透一點光」，
     成本 0 draw call、0 新 program（MeshStandardMaterial 本來就有 emissive）。
     值刻意壓得很低——推高會變成一塊發光板，而且托盤在對決時是收起來的，碰不到 bloom。 */
  const mesh = b.build('tray-cloth', { side: THREE.DoubleSide, roughness: 0.95, emissive: new THREE.Color(emissive) });
  return mesh;
}

/* ── 詛咒品占位：紙紮實物（同一個頂點色 mesh，0 新 draw call）──────────
 * `kind` 是 presentation-only：不帶就維持舊的符紙堆，避免舊事件資料少欄位時靜默空掉。
 * 六種都守在 0.5×0.5、0.35 高的托盤占位內，不走 GLB／骨架／新 pass。 */
function makeCursePile(seed, kind = null) {
  const b = vcBuilder();
  const R = rnd(seed);
  const C0 = TRAY.CURSE;
  const P = C0.paper;
  const W = C0.w, H = C0.h;
  const xz = (x0, z0, x1, z1, y, color) => b.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], color);
  const xy = (x0, y0, x1, y1, z, color) => b.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], color);
  const ring = (cx, cy, w, h, t, z, color) => {
    xy(cx - w, cy - h, cx + w, cy - h + t, z, color); xy(cx - w, cy + h - t, cx + w, cy + h, z, color);
    xy(cx - w, cy - h + t, cx - w + t, cy + h - t, z, color); xy(cx + w - t, cy - h + t, cx + w, cy + h - t, z, color);
  };
  const addGeneric = () => {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const y = C0.thick + i * C0.gap;
      const rot = (R() - 0.5) * 1.15, tilt = (R() - 0.5) * 0.30;
      const cx = (R() - 0.5) * 0.07, cz = (R() - 0.5) * 0.07;
      const co = Math.cos(rot), si = Math.sin(rot);
      const pt = (u, v) => [cx + u * W * co - v * H * si, y + tilt * u, cz + u * W * si + v * H * co];
      const face = P[i % P.length];
      b.quad(pt(-1, -1), pt(1, -1), pt(1, -0.30), pt(-1, -0.30), face);
      b.quad(pt(-1, -0.30), pt(1, -0.30), pt(1, -0.20), pt(-1, -0.20), C0.ink);
      b.quad(pt(-1, -0.20), pt(1, -0.20), pt(1, 0.16), pt(-1, 0.16), face);
      b.quad(pt(-1, 0.16), pt(1, 0.16), pt(1, 0.26), pt(-1, 0.26), C0.ink);
      b.quad(pt(-1, 0.26), pt(1, 0.26), pt(1, 1), pt(-1, 1), face);
    }
    const yTop = C0.thick + (n - 1) * C0.gap + 0.008, hx = W * 1.25, hz = 0.022;
    xz(-hx, -hz, hx, hz, yTop, C0.cord);
  };
  /* 冥婚紅包（A2 S6 甲案「綑屍紅包」r3，2026-09-17）——主意象：**一只薄扁亮紅的金印紅包被白布帶綑住，
     布尾垂到桌上攤成一灘，正面淌下一道血黑漬，封口越過來一束垂到底的黑髮**；底下兩只歪疊扁紅包是禮金的量感。
     ★三輪盲讀怎麼走的★（答卷：docs/experiments/2026-09-17-a2-wedding/blindread-r1｜r2）
       r1 未過（桌面 1/2、並排 3/6）：泛黃麻繩被讀成「淺褐木條 X 支架」、焦黑封口被讀成「黑色門洞」，
         整件讀成「紅色小木箱／神龕」；三位讀者更把**縛靈鎖**（ironLit 0x8d7652 也是褐色＋X 紋）當成紅包。
         → r2 改冷白寬布帶、薄扁微後仰、補金印、黑舌改黑滴。
       r2 並排 **6/6 過**（六位都靠「唯一鮮紅＋扁方像紅包袋」）——**並排這條已經解決，r3 不准再動紅／金／扁方**；
         但桌面仍 1/2：白帶被讀成「兩根筷子／扶手」（整件讀成小神椅），黑滴被讀成「墨痕」，
         opus 讀出紅包袋卻選「都不是」，原話是「偏中性儀式道具，既不明確喜慶也不到恐怖」。
       → r3 只加強死亡／喪事訊號，三件事都從「細線」升級成「有面積的量體」：
         ① 白帶從結塊往下垂一條**寬布尾**（1.5 倍橫帶寬、下襬外張），垂過底緣並在底板上攤成一灘
            ⇒ 有垂墜、有攤開＝布，筷子與扶手都不會這樣。
         ② 三條細黑滴改成**一整片上窄下寬的血黑漬**（0x2a0a0c 近黑帶紅），從金印下緣淌到底緣，
            腳下再積一灘扁黑池 ⇒ 面積夠大才從「墨痕」變成「淌出來的東西」。刻意偏左，讓縱帶與黑髮各有各的位置。
         ③ 黑髮從一條細線改成**三綹一束**，從封口上緣越過去、垂到底板、末端散開。
     兩面可讀：布帶／布尾／金印／血漬／髮束一律鋪 ±z 兩份，髮束另有一條橫跨厚度的帶子真的「越過封口」。
     決定性：全部座標寫死，不取 R()、不碰 Math.random。 */
  const addWedding = () => {
    const red = 0xc7392c, redBack = 0x9a2a25, redEdge = 0x71191a, redLit = 0xd8503a; // 正面主紅比紅布 0x6e1616 亮兩階
    const seal = 0xd0a34a, sealDim = 0x9c7733; // 金印（沿用既有的封印金）
    const cloth = 0xe6e0d2, clothDim = 0xb9b3a4; // 喪事白麻布帶：冷白／淺灰，刻意不偏褐不偏黃（褐會撞縛靈鎖）
    const blood = 0x2a0a0c, bloodDark = 0x16050a; // 血黑漬：近黑帶紅，不是純黑（純黑在暗紅布上只會讀成陰影）
    const hair = 0x120f0e, hairLit = 0x231d1b; // 髮束：兩階黑，中間那綹提亮一格才看得出是「幾綹」不是一塊
    const hw = 0.125, y0 = 0.020, y1 = 0.285, t = 0.008, lean = 0.045; // 半寬／下緣／上緣／半厚／後仰量
    const HH = y1 - y0;
    /** 立封的本地座標：u∈[-1,1] 橫向、v∈[0,1] 高度，zo＝離板面的偏移；後仰量隨 v 線性往 −z 推。 */
    const pt = (u, v, zo) => [u * hw, y0 + v * HH, zo - v * lean];
    const face = (u0, v0, u1, v1, zo, color) => b.quad(pt(u0, v0, zo), pt(u1, v0, zo), pt(u1, v1, zo), pt(u0, v1, zo), color);
    /** 正反兩面各鋪一份（托盤會自轉，單面的東西轉過去就沒了）。 */
    const both = (u0, v0, u1, v1, d, color) => { face(u0, v0, u1, v1, t + d, color); face(u0, v0, u1, v1, -t - d, color); };
    /** 任意四邊形（給布尾／血漬／髮綹這種上下不等寬的形狀），一樣正反各一份。 */
    const bothQ = (P, d, color) => { for (const zo of [t + d, -t - d]) b.quad(pt(P[0][0], P[0][1], zo), pt(P[1][0], P[1][1], zo), pt(P[2][0], P[2][1], zo), pt(P[3][0], P[3][1], zo), color); };

    // ① 底下兩只歪疊的扁紅包：躺平的 xz 面，俯視相機在任何自轉角都讀得到
    xz(-0.225, -0.105, 0.155, 0.075, 0.012, redBack);
    xy(-0.225, 0.000, 0.155, 0.012, 0.075, redEdge);
    xz(-0.150, -0.060, 0.230, 0.120, 0.026, red);
    xy(-0.150, 0.014, 0.230, 0.026, 0.120, redEdge);

    // ② 立起的薄紅封（微後仰）：前後兩面＋四條側緣
    face(-1, 0, 1, 1, t, red);
    face(-1, 0, 1, 1, -t, redBack);
    b.quad(pt(-1, 1, -t), pt(1, 1, -t), pt(1, 1, t), pt(-1, 1, t), redLit); // 封口頂緣
    b.quad(pt(-1, 0, t), pt(1, 0, t), pt(1, 0, -t), pt(-1, 0, -t), redEdge);
    b.quad(pt(-1, 0, -t), pt(-1, 1, -t), pt(-1, 1, t), pt(-1, 0, t), redEdge);
    b.quad(pt(1, 0, t), pt(1, 1, t), pt(1, 1, -t), pt(1, 0, -t), redEdge);

    // ③ 金印：正面中上一塊方印，印心壓暗一格（r2 盲讀 6/6 靠的就是這塊＋亮紅，不要動）
    both(-0.30, 0.60, 0.30, 0.86, 0.0015, seal);
    both(-0.15, 0.68, 0.15, 0.78, 0.0030, sealDim);

    // ④ 血黑漬：從金印下緣一路淌到底緣，上窄下寬，底寬約正面的 1/3；偏左，讓縱帶與髮束各有位置
    bothQ([[-0.56, 0.58], [-0.32, 0.58], [-0.12, 0.02], [-0.78, 0.02]], 0.0008, blood);
    bothQ([[-0.50, 0.54], [-0.38, 0.54], [-0.26, 0.05], [-0.60, 0.05]], 0.0016, bloodDark);
    xz(-0.118, -0.008, 0.012, 0.086, 0.029, blood); // 腳下積的一灘扁黑池（薄片，比底板小一圈）
    xz(-0.092, 0.010, -0.014, 0.064, 0.030, bloodDark);

    // ⑤ 白麻布帶——橫帶繞整圈（前後兩面＋左右兩側）
    const vb = 0.38, bv = 0.058, bz = t + 0.005;
    both(-1.10, vb - bv, 1.10, vb + bv, 0.005, cloth);
    b.quad(pt(-1.10, vb - bv, -bz), pt(-1.10, vb + bv, -bz), pt(-1.10, vb + bv, bz), pt(-1.10, vb - bv, bz), clothDim);
    b.quad(pt(1.10, vb - bv, bz), pt(1.10, vb + bv, bz), pt(1.10, vb + bv, -bz), pt(1.10, vb - bv, -bz), clothDim);

    // ⑥ 縱帶：從底緣一路包到結上方就停，上面那段留給金印
    both(-0.115, 0, 0.115, 0.55, 0.005, cloth);
    b.quad(pt(-0.115, 0, bz), pt(0.115, 0, bz), pt(0.115, 0, -bz), pt(-0.115, 0, -bz), clothDim);

    // ⑦ 交會處的結塊
    both(-0.30, vb - 0.10, 0.30, vb + 0.10, 0.009, cloth);
    both(-0.12, vb - 0.045, 0.12, vb + 0.045, 0.012, clothDim);

    // ⑧ 從結塊垂下的寬布尾：下襬外張、垂過底緣，再在底板上攤成一灘 ⇒ 讀成布而不是筷子／扶手
    bothQ([[-0.184, 0.30], [0.184, 0.30], [0.238, 0.03], [-0.238, 0.03]], 0.007, cloth);
    bothQ([[-0.052, 0.28], [0.058, 0.28], [0.092, 0.04], [-0.030, 0.04]], 0.009, clothDim); // 一道摺影
    xz(-0.052, 0.006, 0.058, 0.098, 0.031, cloth); // 攤在底板上的那一灘
    xz(-0.030, 0.030, 0.034, 0.080, 0.032, clothDim);

    // ⑨ 黑髮：三綹一束，從封口上緣**越過去**（橫跨厚度那條）再垂到底板，末端散開
    b.quad(pt(0.44, 1.035, t + 0.013), pt(0.88, 1.035, t + 0.013), pt(0.88, 1.035, -t - 0.013), pt(0.44, 1.035, -t - 0.013), hair);
    bothQ([[0.44, 1.04], [0.58, 1.04], [0.62, 0.58], [0.48, 0.56]], 0.013, hair);
    bothQ([[0.48, 0.56], [0.62, 0.58], [0.58, 0.06], [0.44, 0.08]], 0.013, hair);
    bothQ([[0.58, 1.04], [0.74, 1.04], [0.82, 0.60], [0.66, 0.58]], 0.015, hairLit);
    bothQ([[0.66, 0.58], [0.82, 0.60], [0.86, 0.04], [0.70, 0.02]], 0.015, hairLit);
    bothQ([[0.74, 1.04], [0.88, 1.04], [0.98, 0.62], [0.84, 0.60]], 0.013, hair);
    bothQ([[0.84, 0.60], [0.98, 0.62], [1.12, 0.14], [0.96, 0.12]], 0.013, hair);
  };
  const addGuava = () => {
    /* 封閉的十角果體：鼓腹、肩收、頂／底封口，不能再讀成方袋。 */
    const green = 0x798c3d, yellow = 0xb5a640, shade = 0x53632d, pale = 0x9e9b3f;
    const rings = [[0.040, 0.080], [0.095, 0.142], [0.158, 0.155], [0.213, 0.112], [0.235, 0.045]];
    const sides = 10;
    const point = (r, i, y) => {
      const a = (i / sides) * Math.PI * 2 + Math.PI / 10;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    for (let j = 0; j < rings.length - 1; j++) {
      const [y0, r0] = rings[j], [y1, r1] = rings[j + 1];
      for (let i = 0; i < sides; i++) {
        const light = Math.sin((i / sides) * Math.PI * 2 + 0.5);
        const c = light > 0.45 ? yellow : light < -0.45 ? shade : (j === 1 ? green : pale);
        b.quad(point(r0, i, y0), point(r0, (i + 1) % sides, y0), point(r1, (i + 1) % sides, y1), point(r1, i, y1), c);
      }
    }
    for (let i = 0; i < sides; i++) {
      b.tri([0, 0.040, 0], point(rings[0][1], (i + 1) % sides, 0.040), point(rings[0][1], i, 0.040), shade);
      b.tri([0, 0.238, 0], point(rings[rings.length - 1][1], i, 0.235), point(rings[rings.length - 1][1], (i + 1) % sides, 0.235), pale);
    }
    /* 短梗與從梗長出的兩片短葉；前後皆有摺面，轉向不會消失。 */
    const stem = 0x5c4824, leaf = 0x31582b;
    xz(-0.018, -0.018, 0.018, 0.018, 0.268, stem);
    b.quad([-0.018, 0.235, -0.018], [0.018, 0.235, -0.018], [0.018, 0.268, -0.018], [-0.018, 0.268, -0.018], stem);
    b.quad([-0.018, 0.235, 0.018], [-0.018, 0.268, 0.018], [0.018, 0.268, 0.018], [0.018, 0.235, 0.018], stem);
    for (const z of [-0.016, 0.016]) {
      b.quad([0, 0.258, z], [0.105, 0.272, z], [0.062, 0.294, z], [0.012, 0.272, z], leaf);
      b.quad([0, 0.258, z], [-0.088, 0.270, z], [-0.052, 0.288, z], [-0.010, 0.271, z], leaf);
    }
  };
  const addWater = () => {
    const wet = 0x295a72, wetDark = 0x163446, inkBlue = 0x101d31;
    /* 符面和藍墨都放正反兩面；托盤旋轉時仍讀得出狹長濕符與折尾。 */
    for (const z of [-0.010, 0.010]) {
      b.quad([-0.072, 0.02, z], [0.072, 0.02, z], [0.053, 0.23, z], [-0.053, 0.23, z], wet);
      b.quad([-0.053, 0.23, z], [0.053, 0.23, z], [0.12, 0.31, z], [0.015, 0.275, z], wetDark); // 折彎尾
    }
    for (const z of [-0.016, 0.016]) {
      xy(-0.048, 0.085, 0.048, 0.105, z, inkBlue); xy(-0.038, 0.145, 0.038, 0.163, z, inkBlue);
      xy(-0.017, 0.058, 0.017, 0.184, z + (z > 0 ? 0.001 : -0.001), inkBlue);
    }
  };
  const addLock = () => {
    const iron = 0x514d43, ironLit = 0x8d7652, black = 0x1a1715;
    for (const z of [-0.014, 0.014]) {
      ring(-0.115, 0.17, 0.052, 0.065, 0.018, z, iron); ring(0, 0.19, 0.052, 0.065, 0.018, z, ironLit); ring(0.115, 0.17, 0.052, 0.065, 0.018, z, iron);
      xy(-0.09, 0.025, 0.09, 0.135, z, ironLit); xy(-0.020, 0.055, 0.020, 0.095, z + (z > 0 ? 0.002 : -0.002), black); // 方鎖頭與鎖眼
      xy(-0.069, 0.135, -0.048, 0.17, z, iron); xy(0.048, 0.135, 0.069, 0.17, z, iron); // 鏈環與鎖頭相扣
    }
  };
  const addTiger = () => {
    const paper = 0xd8d0b4, stripe = 0x1c1816, ear = 0xa8866e, eye = 0xb8782f;
    /* 白虎紙煞是兩面可讀的尖耳面具：條紋、雙眼、鼻頭都浮在紙臉外。 */
    for (const z of [-0.008, 0.008]) {
      xy(-0.17, 0.04, 0.17, 0.25, z, paper);
      b.quad([-0.17, 0.225, z], [-0.070, 0.225, z], [-0.135, 0.345, z], [-0.205, 0.285, z], ear);
      b.quad([0.070, 0.225, z], [0.17, 0.225, z], [0.205, 0.285, z], [0.135, 0.345, z], ear);
    }
    for (const z of [-0.016, 0.016]) {
      xy(-0.135, 0.178, -0.040, 0.202, z, stripe); xy(0.040, 0.178, 0.135, 0.202, z, stripe);
      xy(-0.030, 0.080, 0.030, 0.225, z, stripe);
      xy(-0.112, 0.128, -0.055, 0.153, z, eye); xy(0.055, 0.128, 0.112, 0.153, z, eye);
      xy(-0.026, 0.098, 0.026, 0.123, z + (z > 0 ? 0.001 : -0.001), stripe); // 鼻頭
    }
  };
  const addBoat = () => {
    const paper = 0xa56b42, fold = 0x5d3728, salt = 0xb5ae8a;
    b.quad([-0.23, 0.05, 0], [0.23, 0.05, 0], [0.14, 0.16, 0], [-0.14, 0.16, 0], paper); // 紙舟腹
    b.quad([-0.23, 0.05, 0], [-0.14, 0.16, 0], [-0.19, 0.285, 0.022], [-0.25, 0.16, 0.022], fold); // 左翹首
    b.quad([0.14, 0.16, 0], [0.23, 0.05, 0], [0.25, 0.16, 0.022], [0.19, 0.285, 0.022], fold); // 右翹首
    xy(-0.11, 0.095, 0.11, 0.115, -0.007, salt);
  };
  if (kind === 'wedding') addWedding();
  else if (kind === 'guava') addGuava();
  else if (kind === 'water') addWater();
  else if (kind === 'lock') addLock();
  else if (kind === 'tiger') addTiger();
  else if (kind === 'boat') addBoat();
  else addGeneric();
  const mesh = b.build('tray-curse', { side: THREE.DoubleSide, roughness: 0.95 });

  // 紫黑陰火：小片粒子往上飄，飄到 rise 就重生。決定性種子，不用 Math.random。
  const C = TRAY.CURSE;
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(C.n * 3);
  const alpha = new Float32Array(C.n);
  const life = new Float32Array(C.n);
  const R2 = rnd(seed * 7919 + 13);
  for (let i = 0; i < C.n; i++) { life[i] = R2(); pos[i * 3] = (R2() - 0.5) * 0.22; pos[i * 3 + 2] = (R2() - 0.5) * 0.16; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  /* 逐顆透明度：升到頂就淡掉。PointsMaterial 沒有 per-point alpha，所以用頂點色的亮度當替代
     （NormalBlending 下把顏色往背景色推＝看起來變淡），一樣不必寫 shader。 */
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C.n * 3), 3));
  const fire = new THREE.Points(g, new THREE.PointsMaterial({
    /* AdditiveBlending：頂點色乘上 alpha 之後「往背景加得少」＝真的在淡出（NormalBlending 下只是變黑）。
       牌桌那一趟不走 bloom（js/renderer.js 只在 kind==='duel' 開），而托盤在對決時整組收起來，
       所以這一撮加色的紫火永遠碰不到 bloom 的萃取門檻。 */
    color: 0xffffff, vertexColors: true, size: C.size, sizeAttenuation: true, transparent: true, opacity: 0.9,
    depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending,
  }));
  fire.name = 'tray-curse-fire';
  fire.frustumCulled = false;

  const group = new THREE.Group();
  group.userData.curseKind = kind || 'generic'; // 截圖／治具可讀，不參與規則
  group.add(mesh, fire);
  const fc = new THREE.Color(C.fire); // 每幀 new 一顆 Color 是白花的配置成本，提到迴圈外
  /* 開卡「只亮不動」時詛咒品的強調（v0.59.1 凍結 card-dock-font #8）：牌堆沒有描邊外殼、原本的 hover 只有抬升，
     改成不動後就什麼都不剩，所以讓陰火變亮、粒子放大。1＝平常。 */
  let glow = 1;
  return {
    group,
    update(dt) {
      const a = g.attributes.position, col = g.attributes.color;
      for (let i = 0; i < C.n; i++) {
        life[i] += dt * C.speed / C.rise;
        if (life[i] > 1) life[i] -= 1;
        a.array[i * 3 + 1] = 0.05 + life[i] * C.rise;
        a.array[i * 3] += Math.sin((life[i] + i) * 6.1) * dt * 0.012;
        alpha[i] = Math.min(1, life[i] * 5) * (1 - life[i] * life[i]); // 冒出來→升高→淡掉
        const k = alpha[i] * glow;
        col.array[i * 3] = fc.r * k; col.array[i * 3 + 1] = fc.g * k; col.array[i * 3 + 2] = fc.b * k;
      }
      a.needsUpdate = true; col.needsUpdate = true;
    },
    setGlow(v) { if (v === glow) return; glow = v; fire.material.size = C.size * (v > 1 ? 1.4 : 1); },
    glow() { return glow; },
    dispose() {
      mesh.geometry.dispose(); mesh.material.dispose();
      g.dispose(); fire.material.dispose();
    },
  };
}

/**
 * 建立桌心托盤。
 * @param scene  THREE.Scene（本函式自己把 group 加進去）
 * @param camera 牌桌相機（hitTest／slotScreen 要它算投影）
 * @param opts   { outline: bool（?table3d=lite 時 false）, director: cameraDirector（hover 微推，可省） }
 */
export function createTableTray(scene, camera, opts = {}) {
  const group = new THREE.Group();
  group.name = 'table-tray';
  const outlineOn = opts.outline === undefined ? TRAY.OUTLINE : !!opts.outline;
  const liteMode = !!opts.lite; // ?table3d=lite：布面段數降一階、陰火粒子減半（覆審 M-1）
  /* 席位之手：lite（弱機退路）與 `?hands=0`（kill switch）不建；關著時 props 的錢走原本的拋物線。 */
  const handsOn = !liteMode && opts.hands !== false;
  const director = opts.director || null;

  const cloth = makeCloth(liteMode);
  group.add(cloth);
  scene.add(group);

  /** 現行版面（橫式／直式）。唯一的事實來源，全檔的槽位座標一律問它，不留第二份。 */
  let L = layoutOf((camera.aspect || 1) < 1);
  const slotX = (i) => L.XS[i];

  const N = TRAY.XS.length;
  /** 每一格的狀態。fig＝真 3D 妖（有 GLB）；pile＝詛咒占位；兩者互斥。 */
  const slots = TRAY.XS.map((x, i) => ({
    i, key: null, curse: false, curseKind: null, fac: null, moon: false, chain: false,
    fig: null, pile: null, hoverK: 0, spin: 0, ready: false, rimK: -1, rimStillWas: false, played: false,
    jolt: 0, bb: null,
  }));
  /** 命中代理盒：**刻意不加進 scene**（不畫、不佔 draw call），只給 Raycaster 用。
      世界矩陣在 update() 裡自己維護。 */
  const proxies = slots.map((s) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    m.name = 'tray-hit-' + s.i;
    m.userData.slot = s.i;
    return m;
  });
  /* 硃砂法陣：把暗紅外圈與八方暖金爻象併進同一份幾何，仍是一筆 draw call。
     這裡刻意不用八個獨立小方塊：桌上常駐四件拍品時，民俗感不該以 32 次小繪製交換。 */
  const ringBase = new THREE.RingGeometry(0.23, 0.285, 16).toNonIndexed();
  const runePos = Array.from(ringBase.attributes.position.array), runeCol = [];
  const cinnabar = new THREE.Color(0x6d1d1c), trigram = new THREE.Color(0x9d762f);
  for (let i = 0; i < runePos.length / 3; i++) runeCol.push(cinnabar.r, cinnabar.g, cinnabar.b);
  const addRuneQuad = (a, b, c, d) => {
    for (const p of [a, b, c, a, c, d]) { runePos.push(p[0], p[1], 0); runeCol.push(trigram.r, trigram.g, trigram.b); }
  };
  for (let j = 0; j < 8; j++) {
    const a = j * Math.PI / 4, rx = Math.sin(a), ry = Math.cos(a), tx = ry, ty = -rx;
    const cx = rx * 0.33, cy = ry * 0.33, halfL = 0.028, halfW = 0.007;
    addRuneQuad(
      [cx - tx * halfL - rx * halfW, cy - ty * halfL - ry * halfW],
      [cx + tx * halfL - rx * halfW, cy + ty * halfL - ry * halfW],
      [cx + tx * halfL + rx * halfW, cy + ty * halfL + ry * halfW],
      [cx - tx * halfL + rx * halfW, cy - ty * halfL + ry * halfW],
    );
  }
  const runeGeo = new THREE.BufferGeometry();
  runeGeo.setAttribute('position', new THREE.Float32BufferAttribute(runePos, 3));
  runeGeo.setAttribute('color', new THREE.Float32BufferAttribute(runeCol, 3));
  ringBase.dispose();
  const runeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true });
  const runes = new THREE.InstancedMesh(runeGeo, runeMat, N);
  runes.name = 'tray-cinnabar-runes'; runes.frustumCulled = false;
  group.add(runes);
  const moonGeo = new THREE.RingGeometry(0.17, 0.195, 16);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xe8bd55, transparent: true, opacity: 0.70, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, forceSinglePass: true });
  const moonMarks = new THREE.InstancedMesh(moonGeo, moonMat, N);
  moonMarks.name = 'tray-moon-benefit';
  moonMarks.count = 0;
  moonMarks.visible = false;
  group.add(moonMarks);
  /* 連鎖共鳴：內核硃砂靈印（半徑 0.045～0.095，居於月相外環 0.17～0.195 之內，一內一外不混淆）。
     顏色為道壇硃砂紅 0xc8261e，帶微弱心跳呼吸脈動，僅對真人玩家私有呈現。 */
  const chainGeo = new THREE.RingGeometry(0.045, 0.095, 16);
  const chainMat = new THREE.MeshBasicMaterial({ color: 0xc8261e, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, forceSinglePass: true });
  const chainMarks = new THREE.InstancedMesh(chainGeo, chainMat, N);
  chainMarks.name = 'tray-chain-resonance';
  chainMarks.count = 0;
  chainMarks.visible = false;
  group.add(chainMarks);
  const moonV = new THREE.Vector3(), moonQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), moonS = new THREE.Vector3(), moonM = new THREE.Matrix4();
  const chainV = new THREE.Vector3(), chainS = new THREE.Vector3(), chainM = new THREE.Matrix4();
  let chainAnimTime = 0;
  const runePulse = [0, 0, 0, 0];
  function refreshMoonMarks() {
    let n = 0, nChain = 0;
    const heart = Math.pow(Math.max(0, Math.sin((chainAnimTime * 2.2) % (Math.PI * 2))), 2.2);
    chainMat.opacity = 0.42 + 0.48 * heart;

    for (const s of slots) {
      const k = L.mode === 'P' ? 0.62 : 1;
      const pulse = 1 + runePulse[s.i] * 0.15;
      moonV.set(slotX(s.i), TRAY.Y + 0.008, L.Z);
      moonS.set(k * pulse, k * pulse, k);
      moonM.compose(moonV, moonQ, moonS);
      runes.setMatrixAt(s.i, moonM);
      /* 滿 128 枚時卡面「今夜受惠」與整座硃砂法陣仍保留；只收掉額外一筆加色內環，
         避免它在透明錢堆壓力情境與接觸陰影競爭填色。 */
      if (s.moon && !pressureOutlines) {
        moonV.set(slotX(s.i), TRAY.Y + 0.011, L.Z); moonS.set(k * pulse, k * pulse, k); moonM.compose(moonV, moonQ, moonS);
        moonMarks.setMatrixAt(n++, moonM);
      }
      if (s.chain && !pressureOutlines) {
        const sc = k * pulse * (1 + 0.06 * heart);
        chainV.set(slotX(s.i), TRAY.Y + 0.012, L.Z); chainS.set(sc, sc, k); chainM.compose(chainV, moonQ, chainS);
        chainMarks.setMatrixAt(nChain++, chainM);
      }
    }
    runes.count = N; runes.visible = N > 0; runes.instanceMatrix.needsUpdate = true;
    moonMarks.count = n;
    moonMarks.visible = n > 0;
    if (n) moonMarks.instanceMatrix.needsUpdate = true;
    chainMarks.count = nChain;
    chainMarks.visible = nChain > 0;
    if (nChain) chainMarks.instanceMatrix.needsUpdate = true;
  }
  function pulseRune(slot) { if (slot >= 0 && slot < N) runePulse[slot] = 1; refreshMoonMarks(); }
  /* 桌上道具層：掛在 `group` 裡面 ⇒ `setVisible(false)`（對決）一次收掉整組，不必逐支記得。
     `onSlam`＝令牌落地那一刻，把那一格的拍品往下頓一下（落地震動；純視覺，不碰任何狀態）。 */
  let pressureOutlines = false;
  const props = createTableProps(group, { onSlam: (slot) => {
    const s = slots[slot]; if (s) s.jolt = 1;
    /* 這一刻由 table-props 的 token `t >= 1` 呼叫，才是物理落地；UI 音效不得再用 timer 猜。 */
    document.dispatchEvent(new CustomEvent('ys:mark-slam', { detail: { slot } })); pulseRune(slot);
  }, onBid: (slot) => pulseRune(slot), onChange: () => syncPressureOutlines(), onSettle: (slot, winner, effect = {}) => {
    const s = slots[slot]; if (!s) return;
    pulseRune(slot);
    if (s.curse && effect.destroy) playCurseBurn(slot);
    else if (s.curse && Number.isInteger(effect.transferTarget)) playCurseTransfer(slot, effect.transferTarget, winner, effect);
    else if (winner >= 0) playAward(slot, winner, effect);
  }, handPaths: handsOn });
  /* 空物件退路：關手時 renderer 那幾行呼叫照樣成立，不必到處判斷。 */
  const hands = handsOn ? createTableHands(group, props, { itemNodes: () => [0, 1, 2, 3].map((i) => nodeOf(i)) }) /* v0.59.7：袖管避開拍品 */ : { group: null, ready: () => Promise.resolve(), setSeats() {}, bid() {}, mark() {}, reveal() {}, grab() {}, liftOf: () => 0, loaded: () => false, clear() {}, finish() {}, update() {}, setFrozen() {}, stats: () => ({ loaded: false, off: true }), dispose() {} };
  relayout(); // 第一次進場也走同一條路（命中盒的初值在這裡才寫進去，不在建構子裡各寫一份）

  let hover = -1;
  let hoverStill = false; // true＝目前 hover 是「開卡只亮不動」，不是滑鼠指標停在上面
  let visible = true;
  let pending = Promise.resolve();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();

  /* ── 法寶鑑賞頁狀態（v0.59.2）───────────────────────────────────────
   *  apprIdx＝鑑賞中的槽位（−1＝無）；apprSide＝說明欄在畫面哪一半（法寶被推到另一半）；
   *  apprT＝進入鑑賞那一刻歸零、之後每幀累加的秒數（自轉角／浮動相位的唯一輸入）；
   *  apprK＝鏡頭推近的 0..1 進度（線性，350ms 內線性到 1／回 0；回到剛好 0 時 update() 完全不碰相機，
   *  #3「返回後鏡頭逐值相同」靠的就是這一格恰好等於 0，不是漸近趨近）。 */
  let apprIdx = -1;
  let apprSide = 'right';
  let apprT = 0;
  let apprK = 0;
  let apprCloseNode = null; // 收桌鏡頭回程要跟著的那一件（apprIdx 已經 −1 之後仍需要，直到 apprK 回 0）
  function nodeOf(i) { const s = slots[i]; return s ? (s.fig ? s.fig.group : (s.pile ? s.pile.group : null)) : null; }
  /* ── 丙案「燒符揭幕＋照妖鏡」（v0.59.2 修訂，凍結 #1 修訂／#4 修訂／#11）─────────────────
   *  apprMs＝這一件從點籤（或切換）起算的毫秒數，時間軸全部問它（APPR_FX）；切換＝歸零重燒。
   *  apprLayout＝鏡子在螢幕上的位置（CSS px：mx,my＝鏡心，r＝外半徑），由 index.html 依題字欄與窄籤的
   *  實際矩形算好傳進來（3D 層不量 DOM 版面）。apprEnv＝焦點法寶的自轉包絡（世界單位，相對模型原點）。
   *  apprDim＝背景壓暗 0..1：只在「從牌桌進場」那一次淡入，切換時維持全暗（不回到牌桌態，凍結 #4）。
   *  apprMasks＝鑑賞中被改過圖層的每個物件 → 原本的 layers.mask；返回時逐一寫回（凍結 #3／#11(d)）。 */
  /* 疊層在第一次用到時才建（貼圖要 canvas 2D；headless 測試建托盤但從不進鑑賞，不該碰 DOM canvas） */
  let fxObj = null;
  const getFx = () => fxObj || (fxObj = createAppraiseFx());
  let apprMs = 0;
  let apprDim = 0;
  let apprLayout = null;
  let apprEnv = null;
  let apprShown = false;
  let apprLastD = null; // 上一幀推近距離（取景二分的起點）
  let apprGlowHex = '#c9a862';
  const apprMasks = new Map();
  const _v = new THREE.Vector3();
  function stashMask(o, mask) { if (!apprMasks.has(o)) apprMasks.set(o, o.layers.mask); o.layers.mask = mask; }
  function restoreMasks() { for (const [o, m] of apprMasks) o.layers.mask = m; apprMasks.clear(); }
  /** 每幀重套一次（新掛上的子物件——例如 GLB 晚到——預設在第 0 層，會被第一趟畫到）：焦點法寶只在 LAYER，
   *  其餘拍品只在 HIDE_LAYER，燈多開 LAYER 那一位（燈數不變 ⇒ 受光材質不重編）。遮罩原值第一次碰到時記下。 */
  function applyAppraiseLayers(lightsToo) {
    const A = TRAY.APPRAISE, focus = nodeOf(apprIdx);
    for (const s of slots) {
      const n = nodeOf(s.i); if (!n) continue;
      const m = n === focus ? (1 << A.LAYER) : (1 << A.HIDE_LAYER);
      n.traverse((o) => stashMask(o, m));
    }
    if (lightsToo) scene.traverse((o) => { if (o.isLight) stashMask(o, (apprMasks.get(o) ?? o.layers.mask) | (1 << A.LAYER)); });
  }
  /** 系別色 token（`--sys-zuling` 等，拍品窄籤上那條系色條同一組）→ '#rrggbb'。讀不到就退金線色。 */
  function sysHex(s) {
    const key = s.curse ? 'curse' : (s.fac || '');
    let v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue('--sys-' + key).trim(); } catch (e) { /* headless 無 DOM */ }
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    const m = v.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/);
    if (m) return '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('');
    return '#c9a862';
  }
  /** 自轉包絡：把模型轉到一整圈 ENV_N 個角度，各量一次 Box3.setFromObject（跟 bboxScreen／驗收同一支量法），
   *  存成「相對自轉軸原點」的世界盒。取景時逐一投影這些盒，要求每一個角度的投影框四角都在鏡子內圈裡
   *  （凍結 #11(b) 量的正是「每個角度的投影框完全落在內圈圓內」）。只在進場／換件那一刻量一次；
   *  上下輕浮只是平移，取景時用當下的原點加回去。 */
  function computeEnv(node) {
    const rot = node.rotation.y, N = TRAY.APPRAISE.ENV_N, boxes = [];
    node.getWorldPosition(_v);
    const o = _v.clone();
    for (let k = 0; k < N; k++) {
      node.rotation.y = (k / N) * Math.PI * 2; node.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(node);
      if (b.isEmpty()) continue;
      boxes.push([b.min.x - o.x, b.min.y - o.y, b.min.z - o.z, b.max.x - o.x, b.max.y - o.y, b.max.z - o.z]);
    }
    node.rotation.y = rot; node.updateMatrixWorld(true);
    return boxes.length ? boxes : null;
  }
  /** 揭幕前藏起焦點、燒完再讓它現身。只碰「進場那一刻本來就在桌上、而且沒有在飛／在燒」的那一件：
   *  揭盅中已經飛走（visible=false）或正在飛／燒的拍品，visible 由它自己的生命週期管，這裡一律不動
   *  （09-29 冷讀覆審 H2：否則已售出的法寶會在鏡子裡、甚至得標席位上重新出現）。 */
  function showFocus(on) {
    const s = slots[apprIdx]; const n = nodeOf(apprIdx);
    apprShown = on;
    if (!s || !n || s.apprNoFx) return;
    n.visible = on; s.apprHide = !on;
  }
  /** 揭幕中暫藏的那一件突然要開始自己的生命週期（得標飛走、詛咒燒掉／轉移）：先把 visible 還給它，
   *  之後不再代管（飛行本身在揭幕結束前一樣不會被畫，因為它在焦點圖層、疊層那一趟還沒開始畫法寶）。 */
  function releaseFocus(s) {
    if (!s || !s.apprHide) return;
    const n = s.fig ? s.fig.group : (s.pile ? s.pile.group : null);
    if (n) n.visible = true;
    s.apprHide = false; s.apprNoFx = true;
  }

  /** 這一格的描邊外殼該不該畫：`?table3d=lite` 一律不畫；否則只有 hover／鑑賞中的那一格畫。
   *  ★關法是 `visible=false`★——幾何與材質留著（記憶體不變），three 對不可見的物件直接跳過，
   *  draw call 與三角形就都不算；掛回來是同一顆 mesh，不重建、不重編 shader。 */
  function applyOutline(s) {
    if (!s.fig) return;
    const on = outlineOn && !pressureOutlines && (s.i === hover || s.i === apprIdx);
    s.fig.outlines().forEach((sh) => { sh.visible = on; });
  }
  /* 128 枚已是「四席同夜全格滿標」的性能壓力情境；此時 hover 留模型抬升、旋轉與 rim 光，
     但關掉逐 mesh 的外殼描邊，避免單一指標動作再多 13 次 draw call。
     錢收回後立即恢復正常描邊，普通遊玩不受影響。 */
  function syncPressureOutlines() {
    const next = !!(props.chipCount && props.chipCount() >= 128);
    if (next === pressureOutlines) return;
    pressureOutlines = next;
    slots.forEach(applyOutline);
    refreshMoonMarks();
  }

  function clearSlot(s) {
    if (s.fig) {
      const f = s.fig;
      group.remove(f.group);
      /* ★等 GLB 載完再 dispose★：`makeCreatureFigure` 是在 `readyPromise` 的 then 裡才
         clone 材質、掛外殼（creature-figures.js:585-627）。載到一半就 dispose 的話，
         那些材質是在 dispose **之後**才被建出來的 ⇒ 永遠沒人放。玩家在托盤還沒載完就換頁
         （一夜十幾次 showMarket、或直接按下一夜）就會踩到。
         group 已經先移出場景，所以這段延遲期間它不畫、不佔 draw call。 */
      f.loaded().then(() => f.dispose(), () => { /* GLB 404：本來就沒東西可放 */ });
      s.fig = null;
    }
    if (s.pile) {
      group.remove(s.pile.group);
      s.pile.dispose();
      s.pile = null;
    }
    s.key = null; s.curse = false; s.curseKind = null; s.fac = null; s.moon = false; s.chain = false; s.ready = false; s.hoverK = 0; s.spin = 0;
    endGrab(s); // v0.60.0：這一格的抓取／詛咒演出若還在跑，手先收、繩先藏
    s.rimK = -1; s.played = false; s.apprHide = false; s.apprNoFx = false; s.jolt = 0; s.award = null; s.burn = undefined; s.curseAward = null; s.bb = null;
    /* ★命中盒還原成預設★（外部覆審 L-1）：`fillSlot` 會依那一格掛的是妖還是符紙堆把代理盒收緊
       （詛咒占位物只有 0.32 高）。不還原的話，下一夜這一格換成一尊高 0.84 的妖時，
       在 GLB 載完之前命中盒還是符紙堆那個小盒——玩家點得到的範圍比看到的小一截。 */
    resetProxy(s);
  }

  /** 命中代理盒回到「還不知道這一格要放什麼」的預設大小（直式一律再乘 `HITK`） */
  function resetProxy(s) {
    const p = proxies[s.i], k = L.HITK;
    p.position.set(slotX(s.i), TRAY.Y + TRAY.HIT.h * k / 2, L.Z);
    p.scale.set((TRAY.HIT.w + TRAY.HIT.pad * 2) * k, TRAY.HIT.h * k, (TRAY.HIT.d + TRAY.HIT.pad * 2) * k);
    p.updateMatrixWorld(true);
  }
  /** 這一格現在該用多大的命中盒：`bb`＝GLB 的包圍盒（有就收緊）、`pile`＝詛咒占位（矮很多）。 */
  function fitProxy(s) {
    const p = proxies[s.i], k = L.HITK;
    if (s.pile) {
      p.position.set(slotX(s.i), TRAY.Y + 0.16 * k, L.Z);
      p.scale.set((0.5 + TRAY.HIT.pad * 2) * k, 0.32 * k, (0.42 + TRAY.HIT.pad * 2) * k);
      p.updateMatrixWorld(true);
      return;
    }
    if (!s.bb) { resetProxy(s); return; }
    const bb = s.bb;
    const w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * L.SCALE;
    const h = (bb.max.y - bb.min.y) * L.SCALE;
    p.position.set(slotX(s.i), TRAY.Y + h / 2, L.Z);
    p.scale.set(Math.max(0.3 * k, w) + TRAY.HIT.pad * 2 * k, Math.max(0.3 * k, h), Math.max(0.3 * k, w) + TRAY.HIT.pad * 2 * k);
    p.updateMatrixWorld(true);
  }
  /** 轉向（或第一次進場）之後把整組版面重鋪一次：紅布、四格、命中盒、道具層。 */
  function relayout() {
    cloth.scale.set(L.SX, 1, L.SZ);
    for (const s of slots) {
      const node = s.fig ? s.fig.group : (s.pile ? s.pile.group : null);
      /* 詛咒占位的符紙堆是照世界尺寸寫死的（`CURSE.w` 那組），不像妖是由 `SCALE` 正規化過的
         ⇒ 直式要縮的是「相對橫式的比例」，不是直接吃 `SCALE`。 */
      if (node) { node.position.x = slotX(s.i); node.position.z = L.Z; node.scale.setScalar(s.fig ? L.SCALE : L.SCALE / TRAY.SCALE); }
      fitProxy(s);
    }
    refreshMoonMarks();
    props.setLayout(L.mode, L.XS, TRAY.Y, L.Z, L.SCALE);
  }

  /** 丙案時間軸 → 疊層 uniform（每幀只寫十幾個數字；燒符的逐像素工作全在 shader）。 */
  function updateAppraiseFx(dt) {
    const A = APPR_FX, U = getFx().U;
    apprMs += dt * 1000;
    apprDim = Math.min(1, apprDim + (dt * 1000) / A.DIM_MS);
    applyAppraiseLayers(false);
    const t = apprMs, burnEnd = A.BURN0 + A.BURN_MS;
    if (!apprShown && t >= burnEnd) showFocus(true);
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const lay = apprLayout || { mx: (window.innerWidth || 844) / 2, my: (window.innerHeight || 390) / 2, r: 120 };
    U.uTime.value += dt;
    U.uDim.value = ease(apprDim);
    // 符紙：蓋在鏡心（法寶被推到的位置），高度≈鏡面直徑的 0.9，寬高比照黃表紙 0.42
    const ph = lay.r * A.FACE * 1.8, pw = ph * 0.42;
    U.uPaper.value.set(lay.mx, lay.my, pw, ph);
    U.uPaperA.value = t < burnEnd ? ease(clamp01(t / A.PAPER_IN)) : 0;
    U.uBurn.value = t < burnEnd ? clamp01((t - A.BURN0) / A.BURN_MS) : 1;
    const ft = (t - burnEnd) / A.FLASH_MS;
    U.uFlash.value = ft >= 0 && ft < 1 ? Math.pow(1 - ft, 2) : 0;
    const mk = clamp01((t - A.MIRROR0) / A.MIRROR_MS), me = ease(mk);
    U.uMirA.value = me;
    U.uMirS.value = 0.84 + 0.16 * me;
    U.uMir.value.set(lay.mx, lay.my, lay.r);
    // 八卦環：浮現時快轉收住，之後慢轉（凍結 #11(b)「1 秒內 rotation 變化 > 0」量的就是這個角）
    U.uBag.value = -U.uTime.value * A.BAGUA_SPIN - (1 - me) * 2.2;
  }
  /* 法寶鑑賞頁鏡頭（v0.59.2 丙案，凍結 #1(a)／#3／#11(b)）。推近與平移的目標是「照妖鏡的內圈」：
   *  鏡子的螢幕位置（apprLayout，index.html 依題字欄與另一側窄籤的實際矩形算好）固定不動，
   *  鏡頭沿視線推近到**自轉包絡**（一整圈 ENV_N 個角度的包圍盒，見 computeEnv）每一個的投影框四角
   *  都落在「鏡面半徑×FILL」的圓內為止，再用 setViewOffset 把這些框的聯集中心平移到鏡心（純螢幕平移，不改大小）。
   *  用包絡而不是這一幀的包圍盒：寬體法寶轉到側面時框最寬，用當下的框取景會在那幾個角度出鏡（示意乙的風險 ②）；
   *  包絡跟角度無關 ⇒ 推近距離整圈不變、法寶在鏡中原地轉，不會跟著角度忽遠忽近。
   *  每幀重算（法寶在上下輕浮，包絡跟著它的原點走）；成本約 20 次二分 × ENV_N×8 個角點投影。
   *  apprK===0 時這支函式完全不碰 camera（連 clearViewOffset 都不呼叫），是 #3「逐值相同」的保證來源。 */
  const apprV = new THREE.Vector3();
  const apprBox = new THREE.Box3();
  /** 在目前相機下，把包絡裡每一個角度的盒投影成螢幕矩形；回傳全部矩形的聯集中心，以及「以聯集中心為圓心時
   *  最遠那個矩形角」的距離（＝要塞進鏡子內圈所需的半徑）。任一角點落到相機後面就回 null（太近）。 */
  const envBuf = new Float64Array(TRAY.APPRAISE.ENV_N * 4); // 每幀重用，不配新陣列（手機 GC）
  function envFit(pv, boxes, W, H) {
    const rects = envBuf; let nr = 0;
    let uL = Infinity, uT = Infinity, uR = -Infinity, uB = -Infinity;
    for (const b of boxes) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let c = 0; c < 8; c++) {
        apprV.set(pv.x + b[c & 1 ? 3 : 0], pv.y + b[c & 2 ? 4 : 1], pv.z + b[c & 4 ? 5 : 2]).project(camera);
        if (!Number.isFinite(apprV.z) || apprV.z < -1 || apprV.z > 1) return null;
        const px = (apprV.x * 0.5 + 0.5) * W, py = (1 - (apprV.y * 0.5 + 0.5)) * H;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      rects[nr * 4] = minX; rects[nr * 4 + 1] = minY; rects[nr * 4 + 2] = maxX; rects[nr * 4 + 3] = maxY; nr++;
      if (minX < uL) uL = minX; if (minY < uT) uT = minY; if (maxX > uR) uR = maxX; if (maxY > uB) uB = maxY;
    }
    const cx = (uL + uR) / 2, cy = (uT + uB) / 2;
    let need = 0;
    for (let q = 0; q < nr; q++) { const l = rects[q * 4], t = rects[q * 4 + 1], r = rects[q * 4 + 2], b = rects[q * 4 + 3]; need = Math.max(need, Math.hypot(Math.max(cx - l, r - cx), Math.max(cy - t, b - cy))); }
    return { cx, cy, need };
  }
  function updateAppraiseCamera(dt) {
    const want = apprIdx >= 0 ? 1 : 0;
    const rate = dt / (TRAY.APPRAISE.DOLLY_MS / 1000);
    if (apprK < want) apprK = Math.min(want, apprK + rate);
    else if (apprK > want) apprK = Math.max(want, apprK - rate);
    if (apprK <= 0) { apprK = 0; apprCloseNode = null; return; }
    const node = apprIdx >= 0 ? nodeOf(apprIdx) : apprCloseNode;
    if (!node || !apprLayout) return;
    { const sl = apprIdx >= 0 ? slots[apprIdx] : null; if (sl && sl.apprNoFx && !node.visible) return; } // 揭盅中已經飛走的那一件：鏡頭不去追它
    if (!apprEnv) apprEnv = computeEnv(node);
    if (!apprEnv) return;
    const base = camera.position.clone();
    const axis = base.clone().set(0, 0, 1).applyQuaternion(camera.quaternion);
    camera.clearViewOffset();
    const W = window.innerWidth || 844, H = window.innerHeight || 390;
    const pv = node.getWorldPosition(new THREE.Vector3());
    const target = apprLayout.r * APPR_FX.FACE * TRAY.APPRAISE.FILL;
    const evalAt = (d) => { camera.position.copy(base).addScaledVector(axis, d); camera.updateMatrixWorld(true); return envFit(pv, apprEnv, W, H); };
    const fits = (q) => !!q && q.need <= target;
    // d<0＝往前推近（框變大）。先找一個夾住「剛好塞滿」的區間，再二分；取塞得下的那一側。
    // 上一幀的答案當起點（法寶只在輕浮與自轉，距離幾乎不變）：先用小步夾住，再二分——每幀約十來次包絡投影，手機 CPU 省。
    let lo, hi;
    const d0 = apprLastD ?? 0, st0 = apprLastD == null ? 0.25 : 0.02;
    if (fits(evalAt(d0))) { lo = d0; hi = d0 - st0; let g = 0, stp = st0; while (fits(evalAt(hi)) && g < 30) { lo = hi; stp *= 1.6; hi -= stp; g++; } }
    else { hi = d0; lo = d0 + st0; let g = 0, stp = st0; while (!fits(evalAt(lo)) && g < 30) { hi = lo; stp *= 1.6; lo += stp; g++; } }
    for (let k = 0; k < 10; k++) { const mid = (lo + hi) / 2; if (fits(evalAt(mid))) lo = mid; else hi = mid; }
    apprLastD = lo;
    /* 寬體補償：包絡取景是「最寬那個角度剛好塞滿鏡子」，轉到窄的角度時法寶就顯小；扁寬的（虎爺印、詛咒符紙堆）
     * 在小螢幕上會小到框高不足凍結 #1(a) 的 35%。所以這一幀的真實包圍盒高度低於 MIN_H 時，再往前推，直到
     * 高度達到 MIN_H、或這一幀的框碰到鏡子內圈為止。對準鏡心的點也從「包絡中心」漸漸移到「這一幀的框中心」
     * （權重 lam 跟著高度缺口連續變化，不會一幀跳位）——偏心的法寶才推得進去。窄的法寶不會觸發。 */
    let d = lo, qe = evalAt(lo), cx = qe ? qe.cx : 0, cy = qe ? qe.cy : 0;
    const minH = TRAY.APPRAISE.MIN_H * H;
    apprBox.setFromObject(node);
    const cur = (dd) => {
      camera.position.copy(base).addScaledVector(axis, dd); camera.updateMatrixWorld(true);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let k = 0; k < 8; k++) {
        apprV.set(k & 1 ? apprBox.max.x : apprBox.min.x, k & 2 ? apprBox.max.y : apprBox.min.y, k & 4 ? apprBox.max.z : apprBox.min.z).project(camera);
        if (!Number.isFinite(apprV.z) || apprV.z < -1 || apprV.z > 1) return null;
        const px = (apprV.x * 0.5 + 0.5) * W, py = (1 - (apprV.y * 0.5 + 0.5)) * H;
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      return { l: minX, t: minY, r: maxX, b: maxY, h: maxY - minY };
    };
    const c0 = qe && !apprBox.isEmpty() ? cur(lo) : null;
    if (c0 && c0.h < minH) {
      const lam = Math.min(1, (minH - c0.h) / (0.04 * H));
      const place = (dd) => {
        const c = cur(dd), e = c && envFit(pv, apprEnv, W, H);
        if (!c || !e) return null;
        const px = e.cx + ((c.l + c.r) / 2 - e.cx) * lam, py = e.cy + ((c.t + c.b) / 2 - e.cy) * lam;
        return { h: c.h, cx: px, cy: py, need: Math.hypot(Math.max(px - c.l, c.r - px), Math.max(py - c.t, c.b - py)) };
      };
      const ok = (dd) => { const p = place(dd); return !!(p && p.need <= target); };
      let a = lo, b = lo - 0.1, g = 0;
      if (ok(a)) {
        while (ok(b) && g < 20) { a = b; b -= 0.1 * (1 + g); g++; }
        for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; }
        // a＝這一幀的框剛好塞進內圈的最近距離；高度先到 MIN_H 就停在那裡
        const pa = place(a);
        if (pa && pa.h > minH) {
          let u = lo, v = a;
          for (let k = 0; k < 14; k++) { const m = (u + v) / 2; const c = cur(m); if (c && c.h >= minH) v = m; else u = m; }
          d = v;
        } else d = a;
        const pd = place(d);
        if (pd) { cx = pd.cx; cy = pd.cy; }
      }
    }
    camera.position.copy(base).addScaledVector(axis, d * apprK);
    camera.updateMatrixWorld(true);
    if (qe) camera.setViewOffset(W, H, (cx - apprLayout.mx) * apprK, (cy - apprLayout.my) * apprK, W, H);
    else camera.clearViewOffset();
  }

  function fillSlot(s, it) {
    s.key = it.key || null;
    s.curse = !!it.curse;
    s.curseKind = it.curseKind || null;
    s.fac = it.fac || null;
    s.moon = !!it.moon;
    s.chain = !s.curse && !!it.chain;
    s.spin = TRAY.YAW[s.i] || 0;
    if (s.curse || !s.key) {
      const p = makeCursePile(1301 + s.i * 37, s.curseKind);
      p.group.position.set(slotX(s.i), TRAY.Y, L.Z);
      p.group.scale.setScalar(L.SCALE / TRAY.SCALE);
      p.group.rotation.y = s.spin;
      group.add(p.group);
      s.pile = p;
      s.ready = true;
      // 命中盒收成占位物的大小（一疊符紙比一尊妖矮很多）
      fitProxy(s);
      return Promise.resolve();
    }
    /* groundFx:'none'：`CREATURE_GROUND` 會自動給水鬼浮標掛一灘水（那是它在**戰場**上的識別），
       但拍賣桌是老檜木供桌——實測 r1 的截圖上就是木桌中央一攤藍色水窪（自評 r1 G）。
       這是 makeCreatureFigure 既有的參數，不必動 creature-figures.js（T6 要它零 diff）。 */
    const f = makeCreatureFigure({
      glbUrl: creatureGlbUrl(s.key), ab: s.key,
      rimColor: RIM_BY_FAC[s.fac], faction: s.fac, groundFx: 'none',
    });
    s.fig = f;
    f.group.scale.setScalar(L.SCALE);
    f.group.position.set(slotX(s.i), TRAY.Y, L.Z);
    f.group.rotation.y = s.spin;
    group.add(f.group);
    const key = s.key;
    return f.loaded().then(() => {
      if (s.fig !== f || s.key !== key) return; // 這一格已經被換掉了
      // ★makeCreatureFigure 的 group.visible 預設是 false★（creature-figures.js:567）——
      // 忘了打開會量到「托盤不用錢」的假綠（凍結檔 T3 假綠清單第 4 條）。
      f.group.visible = true;
      // 描邊外殼：預設只有 hover 的那一件掛（見 TRAY.OUTLINE 的註解）；?table3d=lite 一律不掛
      applyOutline(s);
      if (f.play) f.play('idle', { fade: 0 });
      s.bb = f.bounds() || null;
      fitProxy(s);
      s.ready = true;
    }, () => { s.ready = true; /* GLB 404：這一格空著，但不擋整個托盤 */ });
  }

  /* 得標不改拍賣資料：暫時移動現有的 3D 展示模型，落到席位後隱藏，下一夜 setItems 會照既有生命週期換貨。
     v0.60.0：抓取開著（grabMs>0、沒 `?grab=0`、手已載好）時改由得標席的手抓住拿回（GM.makeAwardScript），否則照舊拋物線。 */
  function playAward(slot, winner, effect = {}) {
    releaseFocus(slots[slot]);
    const s = slots[slot]; if (!s || !s.fig || !s.fig.group.visible) return;
    s.award = { t: 0, from: { x: s.fig.group.position.x, y: s.fig.group.position.y, z: s.fig.group.position.z }, winner };
    if (grabWanted(effect)) startGrab(s, s.award, 'award', { w: winner }, effect);
  }
  /* 詛咒品不飛入任何人的袋：符紙堆以黑紫色陰火縮成灰燼，仍完全停留在渲染層。 */
  function playCurseBurn(slot) {
    releaseFocus(slots[slot]);
    const s = slots[slot]; if (!s || !s.pile) return;
    s.burn = 0.001;
  }
  function playCurseTransfer(slot, target, caster, effect = {}) {
    releaseFocus(slots[slot]);
    const s = slots[slot]; if (!s || !s.pile) return;
    s.curseAward = { t: 0, from: { x: s.pile.group.position.x, y: s.pile.group.position.y, z: s.pile.group.position.z }, target };
    /* v0.60.0 詛咒 A＋C：施放者＝毒標得標席（renderer 傳進來的 winner），受害者＝transferTarget。 */
    if (grabWanted(effect) && Number.isInteger(caster) && caster >= 0 && caster < 4 && caster !== target) startGrab(s, s.curseAward, 'curse', { c: caster, v: target }, effect);
  }

  /* ═══ v0.60.0 抓取／詛咒演出（純呈現：不讀寫賽局、不耗亂數；時間軸在 grab-motion.js）═══════════════ */
  function grabWanted(effect) { return !GRAB_URL_OFF && handsOn && Number(effect && effect.grabMs) > 0 && hands.loaded(); }
  /* 外接盒依「最後一次畫面」的姿勢重算（蒙皮件的 boundingBox 只在第一次被要時算一次，之後是舊姿勢）；每場演出開演時算一次。 */
  /** 節點看得見部分的最高點（traverseVisible；蒙皮件用這一幀的骨架重算）；量不到＝fallback。 */
  const visTop = (node, fallback) => { let top = -Infinity; const b = new THREE.Box3(); node.updateMatrixWorld(true); node.traverseVisible((m) => { if (!m.isMesh || !m.geometry) return; if (m.isSkinnedMesh) { m.skeleton.update(); m.computeBoundingBox(); b.copy(m.boundingBox); } else { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); b.copy(m.geometry.boundingBox); } if (b.isEmpty()) return; b.applyMatrix4(m.matrixWorld); top = Math.max(top, b.max.y); }); return Number.isFinite(top) ? top : fallback; };
  const boxOf = (node) => { node.updateMatrixWorld(true); node.traverse((m) => { if (m.isSkinnedMesh) { m.skeleton.update(); m.computeBoundingBox(); } }); const b = new THREE.Box3().setFromObject(node); return { x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y, z0: b.min.z, z1: b.max.z }; };
  /** 開演：算好靜止外接盒與「非被抓拍品」外接盒（抓取專用可達用）；同席還有別場在演就先把那場跳到終點（一隻手一次只做一件事）。 */
  function startGrab(s, a, kind, seats, effect) {
    const node = s.fig ? s.fig.group : s.pile.group, mine = Object.values(seats);
    for (const o of slots) { const g = o.award?.grab || o.curseAward?.grab; if (o !== s && g && g.time < g.script.end && Object.values(g.seats).some((x) => mine.includes(x))) finishGrab(o); }
    const box = boxOf(node), tableY = props.tableY(), ms = Number(kind === 'curse' ? effect.curseMs : effect.grabMs); // v0.61.1：詛咒的時長是 CURSE_MS（curseMs；沒帶＝grab-motion CURSE.MS_REF），與 GRAB_MS 脫鉤
    const others = slots.filter((o) => o !== s).map((o) => nodeOf(o.i)).filter((n) => n && n.visible).map(boxOf).map((b) => ({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, top: b.y1 }));
    const script = kind === 'award'
      ? GM.makeAwardScript({ seat: props.seatPosition(seats.w), from: a.from, box, tableY, ms, style: (seats.w === 2 && box.x0 + box.x1 > 0) || (seats.w === 3 && box.x0 + box.x1 < 0) ? 'top' : 'side' }) // 西／東抓越中線那件＝從上方扣（驗收 #5）
      : curseScript(seats, a.from, Object.assign({}, box, { y1: visTop(node, box.y1) }), tableY, ms, others); // r3：施放者掌心蓋在「看得見的」堆頂（縛靈鎖的外框含隱藏網格，比看得見的頂高 2–5cm，掌心會懸空；條件 27 第二輪判定 15）
    a.grab = { kind, seats, script, time: 0, others, top: box.y1, out: {}, landedAt: null, skipped: false, node, frame: null, proxy: null, env: grabEnvelope(box, a.from, script), pileY0: box.y0 - a.from.y };
    a.grab.retPending = kind === 'curse' && !effect.skip; // r6：收手先抬多少（retractPlan）不在開演那一幀算（條件 18），driveGrab 第 RET_PLAN_AT 秒補
    if (kind === 'curse' && !effect.skip) { a.grab.planSt = planStart(a.grab); planStep(a.grab, PLAN_FIRST); }
    if (s.fig) s.fig.setRim(TRAY.RIM_HOVER);
    grabLog.push(Object.assign({ ev: 'start', slot: s.i, kind, seats: Object.assign({}, seats), skip: !!effect.skip }, script.northPlan ? { north: script.northPlan } : null)); // r6：北席路徑規劃結果（治具讀）
    if (effect.skip) { finishGrab(s); return; } // 跳過中才開標的件（doSkip 之後的逐件結算）：直接到終態，手不上場
    driveGrab(s, a.grab, 0);
  }
  /* v0.61.1 r2（acceptance 條件 14–17）：詛咒推按不再把符紙堆／兩手抬到半空——
     受害者伸手的方向與深度另找一塊「手和落點都碰不到別件拍品」的空桌面（victimSpot），符紙堆貼桌繞過別件拍品走（GM.planPath），
     找不到空位／路＝退回 v0.61.1 的做法。
     r3（條件 25、26）：施放者手臂一律從自己席位那側來（grab-motion armYawTable；r2 的「從推的方向後方推」廢除）；符紙堆壓到桌上道具時自己小幅抬過（pileNeed），
     落點不壓到受害者席前的信物與錢柱／令牌（victimSpot）。 */
  const CURSE_AREA = { x0: -1.75, x1: 1.75, z0: -1.55, z1: 1.1 };
  function curseScript(seats, from, box, tableY, ms, others) {
    const seatC = props.seatPosition(seats.c), seatV = props.seatPosition(seats.v);
    const pileR = Math.max(Math.max(box.x1 - box.x0, box.z1 - box.z0) / 2 + GM.CURSE.ROUTE_PAD, GM.CURSE.ROUTE_MIN ?? 0); // r3：與 grab-motion 路徑同一個外擴（ROUTE_MIN），落點才不會落在路徑規劃的外擴框裡
    const vs = victimSpot(seatV, from, others, pileR, box);
    /* r6（條件 39–42）：北席施放＝手臂要越過整排拍品，偏角改用手的實際足跡規劃（grab-motion northYawPlan），走「先往前推再繞」的路 */
    const north = seats.c === 1 ? { fp: northFootprint() } : null;
    if (vs) return GM.makeCurseScript({ seatC, seatV, from, box, tableY, ms, victimIn: vs.k, vdir: vs.dir, avoid: { boxes: others, props: staticProps(), area: CURSE_AREA }, goAt: rakeClear(box), north });
    return GM.makeCurseScript({ seatC, seatV, from, box, tableY, ms, victimIn: victimReach(seatV, from, others), via: pushVia(from, box, seatV, others) });
  }
  /** r6（條件 18 效能）：足跡點（數百上千個）壓成水平 FP_CELL 格的「外緣格」——別件外框比手大得多，外框與手的水平投影有交集就一定含外緣上的點；
   *  每格取最低的 y（最保守）。北塞西開演時要掃 7 條候選路徑 × 49 取樣 × 59 個偏角，點數直接決定開演那一幀的成本。 */
  const FP_CELL = 0.03;
  function footprintOutline(raw) {
    const cells = new Map();
    for (let i = 0; i < raw.length; i += 3) { const k = Math.round(raw[i] / FP_CELL) + ',' + Math.round(raw[i + 2] / FP_CELL), c = cells.get(k); if (!c || raw[i + 1] < c[1]) cells.set(k, [raw[i], raw[i + 1], raw[i + 2]]); }
    const out = [];
    for (const [k, c] of cells) { const [a, b] = k.split(',').map(Number); if (!cells.has((a + 1) + ',' + b) || !cells.has((a - 1) + ',' + b) || !cells.has(a + ',' + (b + 1)) || !cells.has(a + ',' + (b - 1))) out.push(c[0], c[1], c[2]); }
    return new Float64Array(out);
  }
  /** r6（條件 18：開演那一幀 ≤30ms）：北席偏角規劃第一次跑時 JIT 還沒熱，開演那一幀冷啟動多 10–25ms——手載好後在空檔拿一個假場景先跑一次
   *  （純計算：不動場景、不耗亂數、不寫任何狀態，只建足跡快取）。 */
  let northWarm = false;
  function warmNorth() {
    const fp = northFootprint(); if (!fp) return;
    const boxes = [{ x0: -1.54, x1: -1.15, z0: -0.04, z1: 0.25, top: 0.99 }, { x0: -0.65, x1: -0.26, z0: 0.01, z1: 0.21, top: 0.99 }, { x0: 0.12, x1: 0.61, z0: -0.02, z1: 0.68, top: 0.99 }];
    for (const v of [{ x: -1.38, z: 0.98 }, { x: 0, z: 1.22 }]) GM.makeCurseScript({ seatC: { x: 0, z: -1.92 }, seatV: v, from: { x: 1.35, y: 0.152, z: 0.1 }, box: { x0: 1.11, x1: 1.59, y0: 0.152, y1: 0.47, z0: -0.04, z1: 0.26 }, tableY: 0.152, ms: 2000, avoid: { boxes, area: CURSE_AREA }, north: { fp } });
  }
  /** r6：北席推的姿勢的手足跡（看得見的部分、每 FP_STRIDE 點取 1，相對掌心錨點；hand-motion grabFootprint）。依席位手型與版面快取。 */
  const FP_STRIDE = 4, fpCache = new Map();
  function northFootprint() {
    if (!hands.grabFootprint) return null;
    const key = props.mode ? props.mode() : 'L'; let fp = fpCache.get(key);
    if (!fp) { const raw = hands.grabFootprint(1, ['push', null, 0], GM.CURSE.C_PITCH, FP_STRIDE); if (raw) { fp = footprintOutline(raw); fpCache.set(key, fp); } }
    return fp;
  }
  /** r6（條件 43、31）：收手的路上手要再抬多少才不碰別件——沿腳本自己的收手軌跡（retLift＝0 時）取 RET_SAMPLES 點，用抓取可達量需要量 n，
   *  該點的抬升進度 w（腳本 retW）下要 L·w ≥ n ⇒ L＝max(n／w)；別件外框外擴 PLAN_SWEEP（與規劃收手段同口徑）。交給腳本 setRetract：先抬到位再退，收手拉長到不一幀跳。 */
  const RET_LIFT_MAX = 1.0, RET_SAMPLES = 16, RET_MARGIN = 0.12, RET_PLAN_AT = 0.05, RET_SPAN_MAX = (GM.GRAB.RETRACT_LIFT + 1.0 + 0.12) * GM.CURSE.RET_PER_LIFT + 0.05; // 收手最多先抬這麼多（拍品頂約離桌 0.85）；沿收手軌跡量幾點；多抬的餘量（量的是稀疏取樣點，即時可達用全部點）
  function retractPlan(script, seats, others) {
    if (!script || !script.setRetract || !script.T) return script;
    const T = script.T;
    let L = 0;
    for (let q = 1; q <= RET_SAMPLES; q++) { const f = script.at(T.hold + (T.gone - T.hold) * q / RET_SAMPLES), h = f.hands.c; if (!h || !(h.retW > 0)) continue;
      const e = PLAN_SWEEP * q / RET_SAMPLES, bx = others.map((o) => ({ x0: o.x0 - e, x1: o.x1 + e, z0: o.z0 - e, z1: o.z1 + e, top: o.top })); // 外擴量隨收手進度漸變（同 planStep）
      const n = hands.grabLiftFor(seats.c, { pose: h.pose, anchor: 'palm', at: h.at, yaw: h.yaw, pitch: h.pitch, cons: { boxes: bx, foot: null, carry: null, seenOnly: true, stride: PLAN_STRIDE } });
      if (n > 0.005) L = Math.max(L, n / Math.max(h.retW, 0.3)); }
    L = Math.min(L, RET_LIFT_MAX);
    return script.setRetract(L > 0 ? L + RET_MARGIN : 0);
  }
  /** r3（條件 26）：落標的錢在開演後 0.22–0.64 秒被扒回席位，常從符紙堆原位底下橫過（709e313a 起都是這樣；原位不算穿模）。
   *  找最後一個「有正在扒回的錢壓在堆外框（外擴 PILE_PAD）裡」的時刻（props.handObstaclesAhead 外推；1.2 秒後還在原處的錢＝不動的，不算），
   *  施放者手蓋上後按著等到那之後才推——堆不在錢橫過時離開原位，免得一推就壓進錢柱或為了它一跳。 */
  /** r3：信物外接盒（table-props.relicBoxes；舊版沒有就退回外接圓柱）。 */
  const relicBoxes = () => (props.relicBoxes ? props.relicBoxes() : props.relicObstacles ? props.relicObstacles() : []);
  /** r3：桌上不會被扒走、高過桌面 0.05 的錢柱／令牌外框（1.2 秒後還在的）與四席信物（給路徑規劃一起繞）。 */
  function staticProps() {
    const hs = handSlow(), tY = props.tableY(), obs = (props.handObstaclesAhead ? props.handObstaclesAhead(hs === 1 ? 1.2 : 1.2 * hs) : props.handObstacles()).concat(relicBoxes()); // v0.62.1：同 rakeClear，「1.2 秒後」隨 ?handslow 放慢
    return obs.filter((o) => o.top > tY + 0.05).map((o) => (o.r !== undefined ? { x0: o.x - o.r, x1: o.x + o.r, z0: o.z - o.r, z1: o.z + o.r } : { x0: o.x - o.hx, x1: o.x + o.hx, z0: o.z - o.hz, z1: o.z + o.hz }));
  }
  function rakeClear(box) {
    if (!props.handObstaclesAhead) return 0;
    const over = (o) => o.r !== undefined && hitRect(o, box.x0, box.x1, box.z0, box.z1, PILE_PAD);
    const hs = handSlow(), still = props.handObstaclesAhead(hs === 1 ? 1.2 : 1.2 * hs).filter(over); let last = -1; // v0.62.1 ?handslow=k：扒回放慢 k 倍，看的時間窗（真實秒）跟著 ×k
    for (let i = 0; i <= 30; i++) { const t = hs === 1 ? i / 30 : i / 30 * hs; if (props.handObstaclesAhead(t).some((o) => over(o) && !still.some((e) => Math.hypot(e.x - o.x, e.z - o.z) < 0.01))) last = t; }
    return last < 0 ? 0 : last + (hs === 1 ? 0.1 : 0.1 * hs); // v0.62.1：多等的 0.1 秒也隨 ?handslow 放慢；r4：多等 0.1 秒——堆在開推前小幅抬過自己的木舌時，扒回的錢已完全離開
  }
  /** 受害者的手：從「席位→符紙堆」方向起，往「席位→桌心」那側每 5° 試（最多 90°，再試另一側 60°），每個方向深度從 VICTIM_IN 往席位收；
   *  要求手（掌心錨點往前 0.56、往後 0.40、左右 0.20，拇指那側在掌心後 0–0.25 處到 0.44，外擴 0.08＝手抖與手掌比格點寬的餘量）不落進別件拍品外框與錢柱／令牌，落點（掌心往前 KNUCKLE）離別件拍品外框 ≥ 符紙堆半寬＋ROUTE_PAD、且在桌面範圍內。 */
  const LOW_OBS = 0.16;
  function victimSpot(seat, from, others, pileR, box) {
    const tY = props.tableY(), obs = props.handObstacles().filter((o) => o.top > tY + 0.02);
    /* r3：符紙堆落在受害者手背上，堆底≈桌面＋HAND_TOP＋受害者手被抬的量（12 組實測 0.086–0.107）；會被它壓到的＝高過桌面 0.04 的錢柱／令牌，
       與頂高過「桌面＋HAND_TOP＋0.075」的信物（relicBoxes 的 top 含 +0.03 餘量，先扣回）。堆外框＝靜止外框相對原點的位移 */
    const land = obs.filter((o) => o.top > tY + 0.04).concat(relicBoxes().filter((o) => o.top - 0.03 > tY + GM.CURSE.HAND_TOP + 0.075));
    const fx0 = box.x0 - from.x, fx1 = box.x1 - from.x, fz0 = box.z0 - from.z, fz1 = box.z1 - from.z;
    let lowOK = false; // r6 第四趟：手可以壓在矮的錢柱／令牌上（可達會把手抬過去，頂 ≤ 桌面＋LOW_OBS）
    const hit = (x, z) => others.some((b) => x >= b.x0 - 0.08 && x <= b.x1 + 0.08 && z >= b.z0 - 0.08 && z <= b.z1 + 0.08)
      || obs.some((o) => !(lowOK && o.top <= tY + LOW_OBS) && (o.r !== undefined ? Math.hypot(x - o.x, z - o.z) <= o.r + 0.08 : Math.abs(x - o.x) <= o.hx + 0.08 && Math.abs(z - o.z) <= o.hz + 0.08));
    const A = CURSE_AREA, a0 = Math.atan2(from.x - seat.x, from.z - seat.z), ac = Math.atan2(0 - seat.x, 0.1 - seat.z);
    const sg = Math.sign(Math.atan2(Math.sin(ac - a0), Math.cos(ac - a0))) || 1, angs = [0];
    for (let d = 5; d <= 90; d += 5) angs.push(sg * d); for (let d = 5; d <= 60; d += 5) angs.push(-sg * d); // r3：10° → 5° 一步（東席受害者的空位夾在別件、自己的錢與信物之間，10° 一步會跳過）
    /* r3：三趟——①原深度（VICTIM_IN 往席位收）且落點不壓道具 ②伸更深（VICTIM_IN＋0.02…0.66，落點離席前信物遠一點）且不壓道具 ③原深度、不管道具（＝r2 的選法） */
    /* r3：張開的手（spread＋rake）拇指在 Palm 骨後 0.1–0.2 處往一側（下面的 s＞0 那側）伸出 0.37–0.43，另一側 ≤0.13（r3 實測）。
       r2 只量左右 ±0.2，西塞南的落點讓拇指壓進別件被抬 0.9。往前 0.56 維持（r3 試過縮到 0.4：掌心錨點在 Palm 骨後面，指尖其實到錨點前約 0.56，西塞南指尖壓進槽 1）。 */
    const NARROW = [-0.2, -0.1, 0, 0.1, 0.2], WIDE = [-0.2, -0.1, 0, 0.1, 0.2, 0.32, 0.44], FS = [-0.4, -0.25, -0.12, 0, 0.1, 0.2, 0.3, 0.4, 0.48, 0.56];
    const ks0 = [], ks1 = []; for (let k = GM.CURSE.VICTIM_IN; k > 0.12; k -= 0.02) ks0.push(k); for (let k = GM.CURSE.VICTIM_IN + 0.02; k <= 0.66 + 1e-9; k += 0.02) ks1.push(k);
    /* r6（條件 26、32：延伸組 cSW0 西席受害者，席前自己的錢柱把三趟都擋掉 → 退回舊做法、符紙堆壓進信物 76–91 幀）：
       第四趟＝受害者的手可以壓在矮的錢柱上（手被可達抬起 ≤ LOW_OBS，條件 15 手／堆抬升 ≤0.215），落點仍不壓信物與高的道具，取離原位最近的 */
    const land4 = land.filter((o) => o.seat !== undefined || o.top > tY + LOW_OBS); // 第四趟：堆壓在受害者被抬過矮錢柱的手上，堆底高過矮錢柱頂，只避信物與高的道具
    let best4 = null;
    for (const [ks, strict, low] of [[ks0, true, false], [ks1, true, false], [ks0, false, false], [ks0.concat(ks1), true, true]]) for (const da of angs) {
      lowOK = low;
      const an = a0 + da * Math.PI / 180, dx = Math.sin(an), dz = Math.cos(an);
      for (const k of ks) {
        const cx = seat.x + dx * k, cz = seat.z + dz * k, px = cx + dx * GM.CURSE.KNUCKLE, pz = cz + dz * GM.CURSE.KNUCKLE;
        if (px < A.x0 || px > A.x1 || pz < A.z0 || pz > A.z1) continue;
        if (others.some((b) => px > b.x0 - pileR && px < b.x1 + pileR && pz > b.z0 - pileR && pz < b.z1 + pileR)) continue;
        if (strict && (low ? land4 : land).some((o) => hitRect(o, px + fx0, px + fx1, pz + fz0, pz + fz1, o.seat !== undefined ? 0.02 : 0.04))) continue; // r3：落點的堆外框不壓信物／錢柱／令牌（條件 26；信物外接盒本身已含 0.02）
        let bad = false;
        for (const f of FS) { for (const s of (f >= -0.25 && f <= 0 ? WIDE : NARROW)) if (hit(cx + dx * f + dz * s, cz + dz * f - dx * s)) { bad = true; break; } if (bad) break; }
        if (bad) continue;
        if (!low) return { k, dir: [dx, dz] };
        /* 第四趟取離符紙堆原位最近的落點（推的路短＝推得慢，條件 3 螢幕位移對基準的比值；延伸組 cSW0 第一個找到的點推 0.87、比值 0.84） */
        const dd = Math.hypot(px - from.x, pz - from.z); if (!best4 || dd < best4.dd) best4 = { k, dir: [dx, dz], dd };
      }
    }
    return best4 ? { k: best4.k, dir: best4.dir } : null;
  }
  /** 受害者的手伸多深：從 CURSE.VICTIM_IN 往席位收，直到「掌心錨點往前 0.48、往後 0.12、左右 0.20」那一片
   *  不落進任何別件拍品外框、也不壓在桌上的錢柱／令牌上（外擴 0.04）——手要平放在空桌面上，不被墊高、不伸進別件腳下。 */
  function victimReach(seat, from, others) {
    const l = Math.hypot(from.x - seat.x, from.z - seat.z) || 1, dx = (from.x - seat.x) / l, dz = (from.z - seat.z) / l, tY = props.tableY();
    const obs = props.handObstacles().filter((o) => o.top > tY + 0.02);
    const hit = (x, z) => others.some((b) => x >= b.x0 - 0.04 && x <= b.x1 + 0.04 && z >= b.z0 - 0.04 && z <= b.z1 + 0.04)
      || obs.some((o) => (o.r !== undefined ? Math.hypot(x - o.x, z - o.z) <= o.r + 0.04 : Math.abs(x - o.x) <= o.hx + 0.04 && Math.abs(z - o.z) <= o.hz + 0.04));
    for (let k = GM.CURSE.VICTIM_IN; k > 0.12; k -= 0.02) {
      const cx = seat.x + dx * k, cz = seat.z + dz * k;
      let bad = false;
      for (const f of [-0.12, 0, 0.1, 0.2, 0.3, 0.4, 0.48]) for (const s of [-0.2, -0.1, 0, 0.1, 0.2]) if (hit(cx + dx * f + dz * s, cz + dz * f - dx * s)) bad = true;
      if (!bad) return k;
    }
    return 0.12;
  }
  /** 詛咒推送的折點：從原位直線推到受害者那側時，符紙堆外框會擦過別件拍品 ⇒ 先往桌前（＋z）拉到別件外框之外（再留手掌半寬）再推；不擦過＝null（直線）。 */
  function pushVia(from, box, seatV, others) {
    const hx = (box.x1 - box.x0) / 2, hz = (box.z1 - box.z0) / 2, cx = (box.x0 + box.x1) / 2 - from.x, cz = (box.z0 + box.z1) / 2 - from.z;
    const to = { x: seatV.x + (from.x - seatV.x) * 0.6, z: seatV.z + (from.z - seatV.z) * 0.6 }; // 大約的終點方向（只拿來判斷會不會擦過）
    const over = (x, z) => others.filter((b) => x + cx + hx >= b.x0 - 0.03 && x + cx - hx <= b.x1 + 0.03 && z + cz + hz >= b.z0 - 0.03 && z + cz - hz <= b.z1 + 0.03);
    let zf = -Infinity;
    for (let i = 1; i <= 12; i++) { const u = i / 12; for (const b of over(from.x + (to.x - from.x) * u, from.z + (to.z - from.z) * u)) zf = Math.max(zf, b.z1 + 0.26 + hz - cz); } // 0.26：堆外框之外再留施放者手掌的半寬（拇指側）
    return zf > -Infinity ? [from.x, Math.max(from.z, zf)] : null;
  }
  /** v0.61.1 詛咒推按的抬升規劃：開演時沿腳本每 PLAN_DT 秒問一次可達「這一格要抬多少」（不改手的狀態），
   *  交給 GM.planCurseLift 取斜率上限包絡——符紙堆與兩隻手的高度連續（不再一幀跳 0.1–0.7），且永遠不低於可達要的（不穿）。
   *  演出中桌上障礙若變高（錢被扒回途中），可達的即時值仍會蓋過規劃（minLift 只往上墊）。 */
  const PLAN_DT = 1 / 15; // 每 1/15 秒問一次
  /* v0.61.1 r2（acceptance 條件 18：揭曉那一幀 ≤30ms）：規劃分攤到開演後的前幾幀——開演那一幀只算前 PLAN_FIRST 格，
     之後每幀 PLAN_PER_FRAME 格（每幀推進 1/60 秒、規劃推進 PLAN_PER_FRAME/15 秒，永遠跑在演出前面）；還沒算到的格當「手不在場」，
     每算完一批重算一次包絡（O(n)）。按住段的受害者高度取按住段全部格的最大值——那段在開演後約 0.1 秒內就算完，遠早於落定 2.0 秒。 */
  /* r3（條件 9／28 效能，覆審 H-1）：根因＝r2 每幀算 8 格（16 次 grabLiftFor，每次掃整隻手的可見頂點 ≈0.3ms），開演後 6 幀每幀多 5ms，
     12 組×6 幀＝72 幀全落進最慢 5%，把 p95 從 2.0 推到 2.8（profile：D:/yaoshi-scratch/curse-slow3/ps-*.log）。
     改成開演那幀 PLAN_FIRST 格、之後每幀 1 格：規劃仍以 4 倍速跑在演出前面（每幀推進 1/60 秒、規劃推進 1/15 秒），每幀只多 ≤2 次 grabLiftFor，且規劃用的取樣點稀疏 3 倍。 */
  const PLAN_SWEEP = 0.12;
  const PLAN_FIRST = 3, PLAN_PER_FRAME = 1, PLAN_STRIDE = 3; // PLAN_STRIDE：規劃時手的取樣點每 3 個取 1 個（hand-motion strided；每幀擺手仍用全部點）
  /* r6：收手長度開演後才定（retractPlan），規劃表先留到最長 */
  function planStart(g) { const n = Math.ceil((g.script.T ? Math.max(g.script.end, g.script.T.hold + RET_SPAN_MAX) : g.script.end) / PLAN_DT) + 1; return { n, i: 0, L: { c: new Array(n).fill(-Infinity), v: new Array(n).fill(-Infinity), p: new Array(n).fill(-Infinity) } }; }
  function planStep(g, k) {
    const st = g.planSt; if (!st || st.i >= st.n) return;
    for (const end = Math.min(st.n, st.i + k); st.i < end; st.i++) {
      const f = g.script.at(st.i * PLAN_DT);
      /* r4（條件 31）：施放者進場（蓋上前）與收手時手走得快（一格 1/15 秒最多走 0.2），格與格之間可能掃過別件外框、即時可達一幀把手抬 0.5；
         這兩段規劃時別件外框水平外擴 PLAN_SWEEP，包絡提前把手抬好（推與按住那兩段不外擴，手要蓋在堆上，條件 30） */
      const tt = st.i * PLAN_DT, T = g.script.T, sweep = tt < T.appr ? 1 - tt / T.appr : tt >= T.hold ? Math.min(1, (tt - T.hold) / Math.max(1e-6, T.gone - T.hold)) : 0; // 外擴量在蓋上那一刻與收手開始那一刻為 0，漸變（包絡不在交界一格跳）
      for (const role of ['c', 'v']) { const h = f.hands[role]; if (!h) continue; const cons = Object.assign(curseCons(g, f, role), { stride: PLAN_STRIDE }); if (role === 'c' && sweep > 0) { const e = PLAN_SWEEP * sweep; cons.boxes = g.others.map((o) => ({ x0: o.x0 - e, x1: o.x1 + e, z0: o.z0 - e, z1: o.z1 + e, top: o.top })); } st.L[role][st.i] = hands.grabLiftFor(g.seats[role], Object.assign({}, h, { cons })); }
      if (f.holder === 'c' && st.i * PLAN_DT >= g.script.T.go) st.L.p[st.i] = pileNeed(g, f, st.i * PLAN_DT - g.time, st.i * PLAN_DT); // r4（條件 31）：開推（T.go）前堆不動、不為從原位底下扒過的錢抬（原位不算穿模）；開推前只照包絡小幅預抬
    }
    /* r6（條件 31）：受害者伸手（easeOut、一格走 0.1 以上）時，格與格之間就可能壓上席前的錢柱、即時可達一幀抬 0.046（延伸組 cSW0）——
       受害者的需要量在時間上前後各擴 V_DIL 格（提早開始抬、晚才放）、要抬時多抬 V_PAD（規劃用稀疏取樣點，即時可達用全部點；延伸組 cSW0 受害者的手縮回時擦過錢柱邊 0.033），包絡照斜率上限爬 */
    const Lv = st.L.v, Lvd = Lv.map((x, i) => { let m = x; for (let q = Math.max(0, i - V_DIL); q <= Math.min(Lv.length - 1, i + V_DIL); q++) m = Math.max(m, Lv[q]); return Number.isFinite(m) && m > 0 ? m + V_PAD : m; });
    g.plan = GM.planCurseLift(g.script, st.L.c, Lvd, PLAN_DT, undefined, undefined, st.L.p);
  }
  /** r3（條件 26）：符紙堆被推著時自己要抬多少——堆外框（外擴 PILE_PAD）壓到的桌上道具（錢柱、令牌、木籌槽、信物）最高頂＋PILE_CLR − 堆底；沒壓到＝0。
   *  只看堆本身，不看手臂（手臂從別件上方越過時手抬、堆不跟著抬）。別件拍品不在這裡：路徑已繞開（planPath）。 */
  const RT_LOOK = 6, RT_SLOPE = GM.CURSE.PILE_SLOPE, V_DIL = 2, V_PAD = 0.012; // r6：即時保險往後看幾幀、升降斜率（世界單位／秒）
  const PILE_PAD = 0.09, RELIC_PAD = 0.04, PILE_CLR = 0.015, PILE_HOP = 0.018; // PILE_PAD：推的時候堆會左右扭（ry ≤0.25 弧度，轉過的外框比靜止外框寬約 0.06），規劃格之間（1/15 秒）堆最多再走約 0.05
  /** ahead＝這一格比現在晚多少秒：落標的錢在開演後 0.22–0.64 秒被扒回席位，會從符紙堆前面橫過——取那一刻的位置（props.handObstaclesAhead 外推）。 */
  function pileNeed(g, f, ahead = 0, t = null) {
    let ft = f.foot; const bottom = f.item.y + g.pileY0; let need = 0;
    /* r4（條件 31）：規劃格（t 給了）用「前後各半格」掃過的外框聯集——格與格之間堆走 0.1 以上，只看格點會漏掉中間壓到的錢柱，即時保險就一幀跳上去 */
    if (t !== null) for (const dt of [-PLAN_DT / 2, PLAN_DT / 2]) { const q = g.script.at(Math.max(0, t + dt)); if (q.holder === 'c' && q.foot) ft = { x0: Math.min(ft.x0, q.foot.x0), x1: Math.max(ft.x1, q.foot.x1), z0: Math.min(ft.z0, q.foot.z0), z1: Math.max(ft.z1, q.foot.z1) }; }
    const obs = props.handObstaclesAhead ? props.handObstaclesAhead(Math.max(0, ahead)) : props.handObstacles();
    for (const o of obs) if (hitRect(o, ft.x0, ft.x1, ft.z0, ft.z1, PILE_PAD)) need = Math.max(need, o.top + PILE_CLR - bottom);
    for (const o of relicBoxes()) if (hitRect(o, ft.x0, ft.x1, ft.z0, ft.z1, RELIC_PAD)) need = Math.max(need, o.top + PILE_CLR - bottom); // 信物不會動、外接盒已含 0.02 餘量
    return need;
  }
  /** 桌上道具（圓柱 {x,z,r} 或軸對齊盒 {x,z,hx,hz}）與矩形 [x0,x1]×[z0,z1]（外擴 pad）是否重疊。 */
  function hitRect(o, x0, x1, z0, z1, pad) {
    if (o.r !== undefined) { const cx = Math.max(x0 - pad, Math.min(o.x, x1 + pad)), cz = Math.max(z0 - pad, Math.min(o.z, z1 + pad)); return Math.hypot(o.x - cx, o.z - cz) < o.r; }
    return o.x + o.hx > x0 - pad && o.x - o.hx < x1 + pad && o.z + o.hz > z0 - pad && o.z - o.hz < z1 + pad;
  }
  /** 抓取專用可達的限制。v0.61.1 r2 詛咒推按：不套越中線規則（那條是得標從拍品旁掃過時的規則；推按時手掌本來就蓋在堆頂）、只算看得見的部分（seenOnly）。 */
  function curseCons(g, f, role) {
    return g.kind === 'curse' ? { boxes: g.others, foot: f.foot, carry: f.holder === role ? f.carry : null, seenOnly: true } : { boxes: g.others, foot: f.foot, midTop: g.top, carry: f.holder === role ? f.carry : null };
  }
  /** 推進一場：時間 += dt，把這一刻各角色手的擺位交給 hands（腳本給 null＝收手）。 */
  function driveGrab(s, g, dt) {
    if (g.retPending && g.time >= RET_PLAN_AT) { g.retPending = false; retractPlan(g.script, g.seats, g.others); } // r6（條件 43）：規劃跑到收手段（約開演後 0.6 秒）之前補上
    if (g.planSt && dt > 0) planStep(g, PLAN_PER_FRAME);
    g.time = Math.min(g.script.end, g.time + dt);
    const f = g.script.at(g.time); g.frame = f;
    /* r3：規劃格之間（1/15 秒）或外推不準時的保險——推著走時，堆壓到「這一幀」桌上道具要抬的量（props.update 已在本幀先跑）；堆與施放者都不低於它 */
    /* 推上手背那段（riseFrom 起）堆照規劃爬到受害者手背高度；落點附近的道具由 victimSpot 避開。
       r6（條件 31）：即時保險不再一幀跳——往後看 RT_LOOK 幀（腳本位置＋道具外推），取「那一幀要抬的量 − 斜率×時間差」的最大值（提早開始抬），
       下降每幀最多 RT_SLOPE×dt（不一幀落下）。舊版只看這一幀：落標的錢從堆前橫過時堆一幀抬 0.045。 */
    let rt = 0; const ST = g.script.T;
    if (g.plan && f.holder === 'c' && g.time >= ST.go && g.time < g.script.riseFrom) {
      rt = pileNeed(g, f, 0);
      for (let q = 1; q <= RT_LOOK; q++) { const tq = g.time + q / 60; if (tq >= g.script.riseFrom) break; const fq = g.script.at(tq); if (fq.holder === 'c') rt = Math.max(rt, pileNeed(g, fq, q / 60) - RT_SLOPE * q / 60); }
    }
    g.rt = f.holder === 'c' ? Math.max(rt, (g.rt || 0) - RT_SLOPE * dt) : 0;
    for (const role in g.seats) {
      const h = f.hands[role], seat = g.seats[role];
      if (h) {
        hands.grab(seat, Object.assign({}, h, { cons: curseCons(g, f, role) }, g.plan ? { minLift: Math.max(GM.planAt(g.plan[role], g.plan.dt, g.time), f.holder === role ? g.rt : 0) } : null));
        g.out[role] = true;
      } else if (g.out[role]) { hands.grab(seat, null); g.out[role] = false; }
    }
  }
  /** hands.update 之後：法寶寫到這一刻的位置（被抓著＝跟著那隻手被可達抬起的量）、繩、取景代理；時間到就收尾。 */
  function applyGrab(s, g) {
    const f = g.frame, node = g.node;
    /* 被抓著＝跟著抓的那隻手被可達抬起的量；壓在受害者手背上（holder v）時取「壓上去那一刻」的抬升並固定——手在底下細顫，符紙堆不跟著抖。 */
    let lift = f.holder ? hands.liftOf(g.seats[f.holder]) : 0;
    if (f.holder === 'v') { if (g.vLift === undefined) g.vLift = lift; lift = g.vLift; }
    /* r6（條件 31）：蓋上前（holder 還是 null）堆也照規劃走——北席蓋上即推，開推前的預抬落在蓋上之前；舊版這段強制 0，蓋上那一幀堆一口氣抬 0.045 */
    if (g.plan) lift = f.holder || (g.kind === 'curse' && g.time < g.script.T.appr) ? Math.max(GM.planAt(g.plan.pile, g.plan.dt, g.time), f.holder === 'c' ? g.rt || 0 : 0) : 0;
    /* r4（條件 26、31）：開推前的預抬第一幀就抬到 PILE_HOP（r6：北席蓋上即推，預抬可能在蓋上前，holder 還是 null 時也算）（1.8cm，過自己的木舌 1.6cm；一幀 ≤0.03）——包絡內插的頭幾幀只抬幾 mm，堆離開原位卻還壓在木舌上 */
    if (g.plan && g.kind === 'curse' && f.holder !== 'v' && !g.hopDone && lift > 1e-4) { const pl = lift; lift = Math.max(lift, PILE_HOP); if (pl >= PILE_HOP) g.hopDone = true; }
    // v0.61.1 詛咒推按：符紙堆照規劃的連續高度走（推上手背是爬上去；按住時固定、不隨細顫抖）
    node.position.set(f.item.x, f.item.y + lift, f.item.z);
    node.rotation.set(f.item.rx, s.spin + f.item.ry, f.item.rz);
    node.visible = f.visible;
    if (f.landed && g.landedAt === null) { g.landedAt = g.time; grabLog.push({ ev: 'landed', slot: s.i, kind: g.kind, ms: Math.round(g.time * 1000) }); }
    if (g.kind === 'curse') drawRope(f.rope, f.rope ? hands.liftOf(g.seats.v) : 0); // 繩纏在腕上：跟著腕細顫
    const hr = f.holder && f.hands[f.holder];
    g.proxy = hr ? placeProxy(hr.at, lift, hr.yaw) : null;
    /* 整段路徑的外包盒也進取景（盲讀 r1：只框法寶與手時鏡頭一路跟著法寶走，抓起、拿走在畫面上幾乎不動，也看不出拿去哪一席）：
       外包盒在開演時算一次、演出期間不變 ⇒ 鏡頭退到一次看得到「原位→抬起→終點」，法寶在畫面裡移動。 */
    g.proxyDest = f.visible ? placeProxy([g.env.cx, g.env.cy, g.env.cz], 0, 0, [g.env.sx, g.env.sy, g.env.sz]) : null;
    if (g.time >= g.script.end) finishGrab(s);
  }
  /** 跳到終態（跳過、或演完）：手收、繩藏、法寶停在終點並隱藏（終態同舊版 node.visible=false），下一幀既有收尾把 award 清掉。 */
  function finishGrab(s) {
    const a = s.award?.grab ? s.award : s.curseAward?.grab ? s.curseAward : null; if (!a) return;
    const g = a.grab;
    for (const role in g.seats) if (g.out[role]) { hands.grab(g.seats[role], null); g.out[role] = false; }
    const d = g.script.dest;
    g.node.position.set(d.x, d.y, d.z); g.node.rotation.set(0, s.spin, 0); g.node.visible = false;
    if (g.kind === 'curse') drawRope(null, 0);
    if (g.proxy) { g.proxy.visible = false; g.proxy = null; }
    if (g.proxyDest) { g.proxyDest.visible = false; g.proxyDest = null; }
    if (g.time < g.script.end) { g.skipped = true; grabLog.push({ ev: 'skip', slot: s.i, kind: g.kind, ms: Math.round(g.time * 1000) }); }
    g.time = g.script.end; a.t = 1; g.fin = true;
  }
  function endGrab(s) {
    const g = s.award?.grab || s.curseAward?.grab; if (!g) return;
    for (const role in g.seats) if (g.out[role]) { hands.grab(g.seats[role], null); g.out[role] = false; }
    if (g.kind === 'curse') drawRope(null, 0);
    if (g.proxy) { g.proxy.visible = false; g.proxy = null; }
    if (g.proxyDest) { g.proxyDest.visible = false; g.proxyDest = null; }
  }
  const grabLog = [];
  /* 取景代理：被抓著那隻手的掌心＋手指範圍（不可見材質＝0 draw call），讓取景把「手＋法寶」一起框進來（驗收 #7）。
     不用手的 SkinnedMesh 本身：寫實手的手臂一路延伸到畫面外，框它鏡頭會退到底。 */
  /* 延後到第一次要用才建：three 的 uuid 會吃 Math.random，關抓取（?grab=0）時一個都不建，與 155a7e7f 的亂數流逐位相同（驗收 #11）。 */
  let proxyGeo = null, proxyMat = null;
  const proxies3 = [];
  let proxyN = 0;
  function placeProxy(at, lift, yaw, size = [0.30, 0.10, 0.34]) {
    let m = proxies3[proxyN];
    if (!m) { if (!proxyGeo) { proxyGeo = new THREE.BoxGeometry(1, 1, 1); proxyMat = new THREE.MeshBasicMaterial({ visible: false }); } m = new THREE.Mesh(proxyGeo, proxyMat); m.name = 'grab-frame-proxy'; m.frustumCulled = false; group.add(m); proxies3.push(m); }
    proxyN++;
    m.position.set(at[0], at[1] + lift, at[2]); m.rotation.set(0, yaw, 0); m.scale.set(size[0], size[1], size[2]); m.visible = true;
    return m;
  }
  /** 一場演出的取景外包盒：法寶靜止外框 ∪ 抬到最高時的外框 ∪ 落在終點時的外框（世界座標中心＋尺寸）。 */
  function grabEnvelope(box, from, script) {
    const up = script.kind === 'award' ? GM.GRAB.LIFT + GM.GRAB.ARC : 0.05, d = script.dest;
    const x0 = Math.min(box.x0, box.x0 + d.x - from.x), x1 = Math.max(box.x1, box.x1 + d.x - from.x);
    const z0 = Math.min(box.z0, box.z0 + d.z - from.z), z1 = Math.max(box.z1, box.z1 + d.z - from.z);
    const y0 = Math.min(box.y0, box.y0 + d.y - from.y), y1 = Math.max(box.y1 + up, box.y1 + d.y - from.y);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, sx: x1 - x0, sy: y1 - y0, sz: z1 - z0 };
  }
  /* 紙錢繩（詛咒 C）：管子與紙錢都是**建構一次**的固定幾何（D5：禁止每幀重建 tube），
     局部座標＝腕在原點、前臂沿 −z（符紙堆在 +z 那頭）；每幀只改 group 的位置／朝向／縮放與 drawRange（長出來）。 */
  let rope = null;
  function ropeMesh() {
    if (rope) return rope;
    const R = TRAY.ROPE, pts = [];
    /* 直段：從符紙堆（+z＝LEN）垂下到腕上方；再在腕周（垂直前臂的平面）繞 TURNS 圈、沿前臂往後 0.03 */
    for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector3(Math.sin(u * 7) * 0.006, 0.03 + Math.sin(Math.PI * u) * 0.025 * (1 - u) + (R.WRAP_R * 0.78 + 0.012 - 0.03) * u, R.LEN * (1 - u))); }
    const m = 28;
    for (let i = 1; i <= m; i++) { const a = (i / m) * R.TURNS * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a) * R.WRAP_R, Math.cos(a) * R.WRAP_R * 0.78 + 0.012, -0.03 * (i / m))); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, R.R, 6, false), new THREE.MeshStandardMaterial({ color: R.COLOR, roughness: 0.85, emissive: R.EMISSIVE }));
    tube.name = 'curse-rope'; tube.frustumCulled = false;
    const paper = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.034, 0.046), new THREE.MeshStandardMaterial({ color: R.PAPER, roughness: 0.95, side: THREE.DoubleSide, emissive: 0x1f1a10 }), R.PAPERS);
    paper.name = 'curse-rope-paper'; paper.frustumCulled = false;
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < R.PAPERS; i++) { const p = curve.getPoint((i + 0.5) / R.PAPERS * 0.42); p.y -= 0.012; E.set(0.6 + i * 1.3, i * 2.1, 0.4 * Math.sin(i * 3.7)); Q.setFromEuler(E); M.compose(p, Q, one); paper.setMatrixAt(i, M); }
    paper.instanceMatrix.needsUpdate = true;
    const g = new THREE.Group(); g.name = 'curse-rope-group'; g.add(tube); g.add(paper); g.visible = false; group.add(g);
    rope = { group: g, tube, paper, count: tube.geometry.index.count };
    return rope;
  }
  function drawRope(r, lift) {
    if (!r) { if (rope) rope.group.visible = false; return; }
    const R = ropeMesh(), dx = r.pile[0] - r.wrist[0], dz = r.pile[2] - r.wrist[2];
    R.group.position.set(r.wrist[0], r.wrist[1] + lift, r.wrist[2]);
    R.group.rotation.set(0, Math.atan2(dx, dz), 0);
    R.group.scale.setScalar(Math.max(0.6, Math.min(1.6, Math.hypot(dx, dz) / TRAY.ROPE.LEN)));
    R.tube.geometry.setDrawRange(0, Math.max(6, Math.floor(R.count * r.grow / 6) * 6));
    R.paper.count = Math.round(TRAY.ROPE.PAPERS * r.grow);
    R.group.visible = r.grow > 0;
  }

  const api = {
    group,
    /** 桌上道具層（籌碼／令牌／信物）。治具與 renderer 的 listener 走這個出口。 */
    props,
    /** 席位之手（table-hands.js）；renderer 在呼叫 props 的同一處呼叫它。 */
    hands,
    /** v0.60.0 跳過（renderer 的 ys:fx-trait-cancel）：進行中的抓取／詛咒演出直接到終態（法寶在終點、手收）。 */
    finishGrabs() { for (const s of slots) finishGrab(s); },
    /** 治具出口（只讀）：抓取／詛咒演出的開演、落定（模擬毫秒）、跳過紀錄。 */
    grabLog() { return grabLog.slice(); },
    /** 治具出口（只讀）：進行中的演出 [{slot, kind, seats, t, end, landAt, hideAt, dest}]。 */
    grabState() { return slots.map((s) => { const g = s.award?.grab || s.curseAward?.grab; return g && g.time < g.script.end ? { slot: s.i, kind: g.kind, seats: Object.assign({}, g.seats), t: g.time, end: g.script.end, landAt: g.script.landAt, hideAt: g.script.hideAt, dest: Object.assign({}, g.script.dest) } : null; }).filter(Boolean); },
    /** 現在是橫式還是直式版面（'L'／'P'；治具驗直式分支用） */
    mode() { return L.mode; },
    /** 這四格現在的槽位 x（直式是縮小版；治具不另抄一份常數表） */
    slotXs() { return L.XS.slice(); },
    /** 今夜的 4 件。list = [{key, curse, curseKind, fac, moon, chain}]；curseKind 是純呈現，moon 是本夜受惠標記，chain 是連鎖共鳴。 */
    setItems(list) {
      const arr = Array.isArray(list) ? list : [];
      const jobs = [];
      for (let i = 0; i < N; i++) {
        const it = arr[i];
        const s = slots[i];
        if (!it) { if (s.key !== null || s.pile) clearSlot(s); continue; }
        const key = it.key || null;
        const curse = !!it.curse;
        const curseKind = it.curseKind || null;
        const node = s.fig ? s.fig.group : (s.pile ? s.pile.group : null);
        if (s.key === key && s.curse === curse && s.curseKind === curseKind && node && (s.apprHide || node.visible && !s.award) && !s.award && !s.burn && !s.curseAward) { // apprHide：鑑賞揭幕中暫藏的焦點仍在桌上
          s.moon = !!it.moon;
          s.chain = !s.curse && !!it.chain;
          continue;
        } // 同一件才可重用
        clearSlot(s);
        jobs.push(fillSlot(s, { key, curse, curseKind, fac: it.fac, moon: it.moon, chain: !!it.chain }));
      }
      refreshMoonMarks();
      pending = Promise.all(jobs);
      return pending;
    },
    /** 這一批 setItems 的 GLB 都到位了（治具排時序用） */
    loaded() { return pending; },
    /** v0.65.0 光影 A+（js/light-fx.js）：當夜拍品的根節點（法寶模型／詛咒品符紙堆），只有它們投影。只讀。 */
    lotNodes() { const out = []; for (const s of slots) { const n = s.fig ? s.fig.group : (s.pile ? s.pile.group : null); if (n) out.push(n); } return out; },
    /** 幾格已經有東西站在上面（治具／驗收用） */
    readyCount() { return slots.filter((s) => s.ready && (s.fig || s.pile)).length; },
    /** 每一格現在掛的是什麼（T2 逐槽比對用；只讀，不給改） */
    items() {
      return slots.map((s) => ({
        slot: s.i, key: s.key, curse: s.curse, curseKind: s.curseKind, fac: s.fac, moon: s.moon, chain: s.chain, ready: s.ready,
        glb: s.fig ? creatureGlbUrl(s.key) : null,
        visible: s.fig ? s.fig.group.visible : !!s.pile,
        /* 丙案（v0.59.2）：apprHide＝鑑賞揭幕中被暫藏的焦點（仍在桌上，滑動換件的順序要算它）。 */
        apprHide: !!s.apprHide,
        outlines: s.fig ? s.fig.outlines().filter((sh) => sh.visible).length : 0,
        glow: s.pile ? s.pile.glow() : 1,
      }));
    },
    /** v0.59.1 開卡停靠卷，凍結 #8 二次裁定驗收用：這一格模型目前的世界 Y 與繞 Y 軸旋轉（`spin`），
     *  純讀取。用來核對「開卡只亮不動」——開卡前後這兩個值要逐位元相同。 */
    pose(i) {
      if (!(i >= 0 && i < N)) return null;
      const s = slots[i], node = s.fig ? s.fig.group : (s.pile ? s.pile.group : null);
      if (!node) return null;
      return { y: node.position.y, rotY: node.rotation.y };
    },
    /** NDC（x,y ∈ [-1,1]）→ 槽位 index，未命中回 −1。純幾何，不讀遊戲狀態。 */
    hitTest(u, v) {
      if (!visible) return -1;
      ndc.set(u, v);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(proxies, false);
      return hits.length ? proxies.indexOf(hits[0].object) : -1;
    },
    /** −1 ＝ 無。opts.still＝true 時是「開卡只亮不動」（凍結 #1／#8 二次裁定）：
     *  不抬升、不自轉、不推鏡頭，只加強 RIM 與描邊；滑鼠指標的呼叫不傳 opts，行為完全不變。 */
    setHover(i, opts) {
      const k = (i >= 0 && i < N) ? i : -1;
      const still = !!(opts && opts.still);
      if (k === hover && still === hoverStill) return;
      const prev = hover;
      hover = k;
      hoverStill = still;
      // 換成 still 態的那一格：位置／旋轉立刻歸零到基準朝向，不留一絲滑鼠 hover 殘留的抬升／自轉
      if (k >= 0 && hoverStill) {
        const s = slots[k];
        s.spin = TRAY.YAW[k] || 0;
        if (s.fig) { s.fig.group.position.y = TRAY.Y; s.fig.group.rotation.y = s.spin; }
        else if (s.pile) { s.pile.group.position.y = TRAY.Y; s.pile.group.rotation.y = s.spin; }
      }
      // 描邊只跟著 hover 走：舊的那一格卸下、新的那一格掛上（兩格都只是切 visible）
      if (prev >= 0) applyOutline(slots[prev]);
      if (k >= 0) applyOutline(slots[k]);
      /* 被看的那一格才醒過來播 idle：整桌四尊都跑 mixer 是純粹浪費（牌桌是玩家 80% 的時間），
         hover 才播既省又是「它注意到你在看」的演出。播過就留著，不另寫停播路徑。
         still 態不播——那是「滑鼠停在上面」的專屬演出，開卡只要亮，不要多一段動作。 */
      if (k >= 0 && !hoverStill && slots[k].fig && !slots[k].played && slots[k].ready) {
        slots[k].played = !!slots[k].fig.play('idle', { fade: 0.25 });
      }
      // 鏡頭微推同理只在滑鼠 hover 時做；開卡 still 態鏡頭不動（不然桌面縮放本身也會改投影框，等於變相沒解決 #1）。
      if (director && director.setTrayPush) director.setTrayPush(k >= 0 && !hoverStill);
    },
    hover() { return hover; },
    /** 法寶鑑賞頁（v0.59.2，凍結 #1–#4）。i<0 收起。side＝説明欄在畫面哪一半（'left'／'right'）——
     *  法寶本身會被鏡頭推到**另一半**。同一件重呼叫只更新 side（供之後可能的轉向切換用，目前呼叫端不會這樣用）。
     *  換件（凍結 #4：直接換、不回牌桌態）時，離開的那一格立刻歸位到基準朝向（#3 要求「過渡結束後…與進場前
     *  逐值相同」；相機那一半的「過渡」交給 updateAppraiseCamera 的 apprK 漸進，姿態這一半沒有動畫需求可以直接歸位）。 */
    setAppraise(i, side, layout) {
      const k = (i >= 0 && i < N) ? i : -1;
      if (layout && Number.isFinite(layout.mx) && Number.isFinite(layout.my) && layout.r > 0) apprLayout = { mx: layout.mx, my: layout.my, r: layout.r };
      if (k === apprIdx) { if (side) apprSide = side === 'left' ? 'left' : 'right'; return; }
      if (hover >= 0) api.setHover(-1);
      const prev = apprIdx;
      if (prev >= 0 && prev !== k) {
        const s = slots[prev];
        s.spin = TRAY.YAW[prev] || 0;
        if (s.fig) { s.fig.group.position.y = TRAY.Y; s.fig.group.rotation.y = s.spin; s.fig.setRim(TRAY.RIM_BASE); s.rimK = -1; s.rimStillWas = false; }
        else if (s.pile) { s.pile.group.position.y = TRAY.Y; s.pile.group.rotation.y = s.spin; s.pile.setGlow(1); }
        const n = nodeOf(prev); if (n && s.apprHide) { n.visible = true; s.apprHide = false; }
        s.apprNoFx = false;
      }
      /* 丙案圖層：換件＝先把所有遮罩寫回原值，再依新的焦點重套（焦點↔其餘的身分對調了） */
      restoreMasks();
      apprIdx = k;
      /* 描邊要在 apprIdx 換掉之後才重算：applyOutline 看的是「是不是 hover／鑑賞中的那一格」，先算的話離開的
         那一格還被當成鑑賞中、描邊留著（凍結 #3 返回後逐值相同，09-29 丙案治具抓到） */
      if (prev >= 0 && prev !== k) applyOutline(slots[prev]);
      if (k >= 0) {
        if (prev < 0) apprDim = 0; // 從牌桌進場才淡入；切換時背景維持全暗（凍結 #4：中途不回到牌桌態）
        apprSide = side === 'left' ? 'left' : 'right';
        apprT = 0;
        apprMs = 0;
        apprEnv = null;
        apprLastD = null;
        apprCloseNode = nodeOf(k);
        apprGlowHex = sysHex(slots[k]);
        /* sRGB 位元組原樣進 shader（見 appraise-fx.js 檔頭「色彩」）：以 linear 標記寫入＝不做色彩空間換算 */
        getFx().U.uGlow.value.setRGB(parseInt(apprGlowHex.slice(1, 3), 16) / 255, parseInt(apprGlowHex.slice(3, 5), 16) / 255, parseInt(apprGlowHex.slice(5, 7), 16) / 255, THREE.LinearSRGBColorSpace);
        { const s = slots[k], n = nodeOf(k); s.apprNoFx = !n || !n.visible || !!(s.award || s.curseAward || s.burn !== undefined); }
        showFocus(false); // 燒符結束之前焦點法寶不可見（凍結 #11(a)）
        applyAppraiseLayers(true);
        applyOutline(slots[k]);
        if (slots[k].fig && !slots[k].played && slots[k].ready) slots[k].played = !!slots[k].fig.play('idle', { fade: 0.25 });
      } else {
        apprShown = false;
      }
    },
    appraise() { return apprIdx; },
    /** 丙案：揭幕（燒符→照妖鏡浮現）是否還在進行（凍結 #1 修訂：進行中點空白＝跳過，不返回）。 */
    appraiseIntro() { return apprIdx >= 0 && apprMs < APPR_FX.STABLE; },
    /** 跳過揭幕：直接到穩定鑑賞態（鏡頭推到位、符紙燒完、鏡子全亮、法寶現身）。凍結 #1 修訂要 0.1 秒內；
     *  這裡同步改狀態，下一幀（≤1 個 rAF）畫出來。 */
    skipAppraiseIntro() {
      if (!(apprIdx >= 0) || apprMs >= APPR_FX.STABLE) return false;
      apprMs = APPR_FX.STABLE; apprDim = 1; apprK = 1;
      showFocus(true);
      return true;
    },
    /** 視窗改尺寸時 index.html 重算鏡子位置後推進來（不重燒）。 */
    setAppraiseLayout(layout) { if (layout && layout.r > 0) apprLayout = { mx: layout.mx, my: layout.my, r: layout.r }; apprEnv = null; apprLastD = null; }, // 轉向重鋪會改模型縮放：包絡重量
    /** 治具用唯讀出口：第 i 格的模型根節點（驗收自己拿 three 量包圍盒、讀 visible／layers，不經本檔換算）。 */
    node(i) { return (i >= 0 && i < N) ? nodeOf(i) : null; },
    /** 治具用唯讀出口：丙案疊層這一幀實際送進 shader 的值（鏡子幾何、符紙矩形、八卦角）＋兩個圖層編號。
     *  鏡子／符紙的螢幕位置就是 shader 的 uniform 本身——量像素的判定器拿它決定取樣位置，再用像素驗證。 */
    appraiseFx() {
      const U = getFx().U, P = U.uPaper.value, M = U.uMir.value;
      return {
        idx: apprIdx, ms: apprMs, stable: apprIdx >= 0 && apprMs >= APPR_FX.STABLE, k: apprK, shown: apprShown,
        layer: TRAY.APPRAISE.LAYER, hideLayer: TRAY.APPRAISE.HIDE_LAYER,
        dim: U.uDim.value,
        paper: { alpha: U.uPaperA.value, burn: U.uBurn.value, cx: P.x, cy: P.y, w: P.z, h: P.w },
        mirror: { alpha: U.uMirA.value, scale: U.uMirS.value, cx: M.x, cy: M.y, r: M.z, face: APPR_FX.FACE, line: [APPR_FX.LINE0, APPR_FX.LINE1], baguaOut: APPR_FX.BAGUA_OUT, glow: apprGlowHex, bagua: U.uBag.value, halo: APPR_FX.HALO_R },
        flash: U.uFlash.value,
      };
    },
    /** 開頁預先編譯疊層 shader（renderer.js init 呼叫一次）。 */
    warmAppraise(renderer) { getFx().warm(renderer); },
    /** renderer.js 在畫完世界那一趟之後呼叫：疊層（壓暗＋鏡子＋符紙）→ 清深度 → 只畫焦點法寶那一層 → 火星。
     *  ★draw 計數★：renderer.info 預設每次 render() 開頭歸零，這裡暫時關掉 autoReset，讓這幾趟累加在世界那一趟
     *  之後——`renderer.info.render.calls` 讀到的才是這一幀真正的總數（凍結 #8／#11(e) 量的就是它）。 */
    renderOverlay(renderer) {
      if (apprIdx < 0 || !visible || !apprLayout) return;
      const info = renderer.info, ar = info.autoReset, ac = renderer.autoClear;
      const mask = camera.layers.mask, bg = scene.background;
      info.autoReset = false; renderer.autoClear = false;
      try { // 中途拋錯也要把 autoClear／autoReset／相機圖層／背景還回去，不然之後每一幀都帶著殘影與錯的計數
        const fx = getFx();
        fx.U.uView.value.set(window.innerWidth || 844, window.innerHeight || 390);
        fx.U.uDpr.value = renderer.getPixelRatio();
        renderer.render(fx.scene, fx.cam);
        if (apprShown) {
          renderer.clearDepth();
          camera.layers.set(TRAY.APPRAISE.LAYER); scene.background = null;
          renderer.render(scene, camera);
        }
        const b = fx.U.uBurn.value;
        if (b > 0 && b < 1) renderer.render(fx.emberScene, fx.cam);
      } finally {
        camera.layers.mask = mask; scene.background = bg;
        renderer.autoClear = ac; info.autoReset = ar;
      }
    },
    /** 螢幕座標（px，相對視窗左上）。canvas 是 fixed 0,0 滿版，所以視窗座標＝canvas 座標。 */
    slotScreen(i) {
      if (!(i >= 0 && i < N)) return null;
      tmp.copy(proxies[i].position).project(camera);
      return {
        x: (tmp.x * 0.5 + 0.5) * (window.innerWidth || 844),
        y: (1 - (tmp.y * 0.5 + 0.5)) * (window.innerHeight || 390),
      };
    },
    /** v0.59.1 開卡停靠驗收 #1：這一格 3D 模型（fig 或 pile）的世界包圍盒，取八角點投影後的螢幕外框（CSS px）。
     *  沒有模型（空格）回 null。純幾何、只讀，不改任何狀態——治具與正式呼叫都可用。 */
    bboxScreen(i) {
      if (!(i >= 0 && i < N)) return null;
      const s = slots[i], node = s.fig ? s.fig.group : (s.pile ? s.pile.group : null);
      if (!node || !node.visible) return null;
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) return null;
      const W = window.innerWidth || 844, H = window.innerHeight || 390;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const v = new THREE.Vector3();
      for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) for (let cz = 0; cz < 2; cz++) {
        v.set(cx ? box.max.x : box.min.x, cy ? box.max.y : box.min.y, cz ? box.max.z : box.min.z).project(camera);
        const px = (v.x * 0.5 + 0.5) * W, py = (1 - (v.y * 0.5 + 0.5)) * H;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
      return { left: minX, top: minY, right: maxX, bottom: maxY };
    },
    /** 對決時整組收掉（對決舞台是同一張桌子，拍品要讓開，計畫 §6 Q3） */
    setVisible(v) {
      visible = !!v;
      group.visible = visible;
      if (!visible && hover >= 0) api.setHover(-1);
    },
    visible() { return visible; },
    update(dt) {
      if (!visible) return;
      /* 轉向偵測：`resizeSceneEnv` 在 resize 時更新 `camera.aspect`，這裡只比一個布林，
         真的翻面了才重鋪（每幀一次浮點比較，量不到的成本）。 */
      const wantP = (camera.aspect || 1) < 1;
      if (wantP !== (L.mode === 'P')) { L = layoutOf(wantP); relayout(); }
      if (!northWarm && handsOn && !GRAB_URL_OFF && hands.loaded()) { northWarm = true; (globalThis.requestIdleCallback || ((f) => setTimeout(f, 0)))(warmNorth); } // r6（條件 18）
      props.update(dt);
      for (const s of slots) { const g = s.award?.grab || s.curseAward?.grab; if (g && g.time < g.script.end) driveGrab(s, g, dt); } // v0.60.0 抓取演出：先把這一幀手的擺位交出去
      hands.update(dt); // 手在 props 之後：讀到的是這一幀已更新的錢柱與令牌位置
      proxyN = 0;
      for (const s of slots) { const g = s.award?.grab || s.curseAward?.grab; if (g && (g.time < g.script.end || (g.kind === 'curse' && !g.fin))) applyGrab(s, g); } // 手解完（含可達抬升）才放法寶；r2：詛咒演到底那一幀也套一次（收尾 finishGrab），CURSE_MS 很小、一幀就演完時符紙堆才不會留在原位
      for (let i = proxyN; i < proxies3.length; i++) proxies3[i].visible = false;
      if (apprIdx >= 0) apprT += dt;
      if (apprIdx >= 0) updateAppraiseFx(dt);
      chainAnimTime += dt;
      let runeDirty = false;
      for (let i = 0; i < N; i++) if (runePulse[i] > 0) { runePulse[i] = Math.max(0, runePulse[i] - dt / 0.72); runeDirty = true; }
      const hasChain = slots.some((s) => s.chain);
      if (hasChain || runeDirty) refreshMoonMarks();
      const subjects = [];
      for (const s of slots) {
        const want = (s.i === hover) ? 1 : 0;
        if (s.hoverK !== want) {
          const step = dt / TRAY.HOVER_MS;
          s.hoverK = want > s.hoverK ? Math.min(1, s.hoverK + step) : Math.max(0, s.hoverK - step);
        }
        const ease = s.hoverK * s.hoverK * (3 - 2 * s.hoverK);
        const still = s.i === hover && hoverStill;
        if (s.i === hover && !hoverStill) s.spin += TRAY.HOVER_SPIN * dt;
        else if (s.hoverK > 0 && !still) {
          // 放開之後轉回基準朝向（走短邊，不整圈倒帶）
          const base = TRAY.YAW[s.i] || 0;
          let d = (s.spin - base) % (Math.PI * 2);
          if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
          s.spin = base + d * Math.max(0, 1 - dt / TRAY.HOVER_MS);
        }
        /* 落地震動（第二段）：令牌拍下去的那一刻 `onSlam` 把 `jolt` 設成 1，
           這裡讓那一格的拍品往下頓一下再彈回來（衰減的阻尼振盪，0.35 秒收乾淨）。
           **只動這一格的 y**：不碰相機、不碰別格，也不寫任何狀態。 */
        let shake = 0;
        if (s.jolt > 0) {
          s.jolt = Math.max(0, s.jolt - dt / 0.35);
          shake = -Math.sin((1 - s.jolt) * Math.PI * 3.2) * 0.030 * s.jolt;
        }
        const y = TRAY.Y + (still ? 0 : TRAY.HOVER_LIFT * ease) + shake;
        /* 法寶鑑賞頁（v0.59.2，凍結 #1(c)(d)）：鑑賞中的那一件抬升＋連續自轉（6 秒一圈）＋上下輕浮，
           其餘格子完全不受影響（不是 hover、不是 apprIdx ⇒ 照舊分支，spin 不動或照 hover 衰減邏輯收斂）。
           award／curseAward／burn（飛出去、詛咒燒毀／轉移）優先於鑑賞姿態——那三件事本來就代表這一格
           的生命週期已經在收尾，鑑賞頁不可能同時挑到正在飛走的那一件（selectRailPage 只點得到還在桌上的）。 */
        if (s.i === apprIdx && !s.award && !s.curseAward && s.burn === undefined) {
          const A = TRAY.APPRAISE;
          s.spin += A.SPIN_RAD_S * dt;
          const bob = Math.sin(apprT * Math.PI * 2 * A.BOB_HZ) * A.BOB_AMP;
          const yy = TRAY.Y + A.LIFT + bob;
          if (s.fig) {
            s.fig.group.position.y = yy;
            s.fig.group.rotation.y = s.spin;
            if (s.rimK !== 1 || !s.rimStillWas) { s.rimK = 1; s.rimStillWas = true; s.fig.setRim(A.RIM); }
            s.fig.update(dt);
          } else if (s.pile) {
            s.pile.group.position.y = yy;
            s.pile.group.rotation.y = s.spin;
            s.pile.setGlow(2.8);
            s.pile.update(dt);
          }
          const node = s.fig ? s.fig.group : s.pile?.group;
          if (node?.visible && opts.frameSubjects) subjects.push({ slot: s.i, node, hovered: false, flying: false });
          continue;
        }
        if (s.award?.grab || s.curseAward?.grab) {
          /* v0.60.0 抓取／詛咒演出：位置已在 applyGrab 寫好，這裡只推動畫；取景把被抓著的手（代理盒）一起框進來。 */
          if (s.fig) s.fig.update(dt); else if (s.pile) s.pile.update(dt);
          const g = s.award?.grab || s.curseAward.grab;
          if (g.proxy && opts.frameSubjects) subjects.push({ slot: s.i, node: g.proxy, hovered: false, flying: true });
          if (g.proxyDest && opts.frameSubjects) subjects.push({ slot: s.i, node: g.proxyDest, hovered: false, flying: true });
        } else if (s.award && s.fig) {
          const a = s.award; a.t = Math.min(1, a.t + dt / TRAY.AWARD_FLY_S);
          const e = a.t * a.t * (3 - 2 * a.t), dst = props.seatPosition(a.winner);
          s.fig.group.position.x = a.from.x + (dst.x - a.from.x) * e;
          s.fig.group.position.z = a.from.z + (dst.z - a.from.z) * e;
          s.fig.group.position.y = a.from.y + Math.sin(Math.PI * a.t) * 0.46 + (dst.y - a.from.y) * e;
          s.fig.setRim(TRAY.RIM_HOVER + 1.2 * (1 - a.t));
          s.fig.update(dt);
        } else if (s.curseAward && s.pile) {
          const a = s.curseAward; a.t = Math.min(1, a.t + dt / TRAY.CURSE_FLY_S);
          const e = a.t * a.t * (3 - 2 * a.t), dst = props.seatPosition(a.target);
          s.pile.group.position.x = a.from.x + (dst.x - a.from.x) * e;
          s.pile.group.position.z = a.from.z + (dst.z - a.from.z) * e;
          s.pile.group.position.y = a.from.y + Math.sin(Math.PI * a.t) * 0.28 + (dst.y - a.from.y) * e;
        } else if (s.burn !== undefined && s.pile) {
          s.burn = Math.min(1, s.burn + dt / 0.62);
          const q = 1 - s.burn;
          s.pile.group.scale.setScalar((L.SCALE / TRAY.SCALE) * Math.max(0.04, q));
          s.pile.group.position.y = TRAY.Y + s.burn * 0.16;
        } else if (s.fig) {
          s.fig.group.position.y = y;
          s.fig.group.rotation.y = s.spin;
          // 量化到 1/20 再寫：setRim 會把整尊每一支材質的 uniform 重寫一遍，沒變就不該付這個錢
          const q = Math.round(ease * 20) / 20;
          const rimTop = still ? TRAY.RIM_STILL : TRAY.RIM_HOVER;
          if (q !== s.rimK || still !== s.rimStillWas) { s.rimK = q; s.rimStillWas = still; s.fig.setRim(TRAY.RIM_BASE + (rimTop - TRAY.RIM_BASE) * q); }
          s.fig.update(dt);
        } else if (s.pile) {
          s.pile.group.position.y = y;
          s.pile.group.rotation.y = s.spin;
          s.pile.setGlow(s.i === hover && hoverStill ? 2.4 : 1);
          s.pile.update(dt);
        }
        // Frame the final pose before lifecycle removal, including the exact
        // terminal pose. The renderer supplies only screen geometry, never S.
        const node = s.fig ? s.fig.group : s.pile?.group;
        if (node?.visible && opts.frameSubjects) subjects.push({ slot: s.i, node, hovered: s.i === hover,
          flying: !!(s.award || s.curseAward || s.burn !== undefined) });
      }
      // Skip can launch several awards in one frame. Frame their union after
      // all poses are updated, then hide terminal subjects in this same frame.
      if (subjects.length) opts.frameSubjects(subjects);
      updateAppraiseCamera(dt);
      for (const s of slots) {
        if (s.award?.t >= 1) { s.fig.group.visible = false; s.award = null; }
        if (s.curseAward?.t >= 1) { s.pile.group.visible = false; s.curseAward = null; }
        if (s.burn >= 1) { s.pile.group.visible = false; s.burn = undefined; }
      }
    },
    dispose() {
      slots.forEach(clearSlot);
      hands.dispose();
      props.dispose();
      group.remove(chainMarks);
      group.remove(moonMarks);
      group.remove(runes);
      chainMarks.dispose();
      chainGeo.dispose(); chainMat.dispose();
      moonMarks.dispose();
      moonGeo.dispose(); moonMat.dispose(); runeGeo.dispose(); runeMat.dispose(); runes.dispose();
      group.remove(cloth);
      cloth.geometry.dispose(); cloth.material.dispose();
      proxies.forEach((p) => { p.geometry.dispose(); p.material.dispose(); });
      scene.remove(group);
    },
  };
  return api;
}
