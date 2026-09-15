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

const V = new URL(import.meta.url).search;
const { makeCreatureFigure, creatureGlbUrl, FACTION_RIM } = await import('./creature-figures.js' + V);
/* 頂點色幾何的建構器與決定性亂數收斂在 scene-env（環境幾何的家），本檔不另抄一份。 */
const { vcBuilder, seedRnd: rnd } = await import('./scene-env.js' + V);
/* 桌上道具（v0.56b 第二段）：籌碼／令牌／信物。掛進本檔的 group ⇒ 對決時整組跟著收。 */
const { createTableProps } = await import('./table-props.js' + V);

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
  HOVER_MS: 0.16,
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

/* ── 詛咒品占位：一疊綑起來的舊符紙 ────────────────────────────────────
 * 計畫 §6 Q3：3–4 片小方 fin ＋ 紅細 curve 綑綁，墨黑＋血褐＋泛黃紙色頂點色。1 draw call。 */
function makeCursePile(seed) {
  const b = vcBuilder();
  const R = rnd(seed);
  const C0 = TRAY.CURSE;
  const P = C0.paper;
  const W = C0.w, H = C0.h;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const y = C0.thick + i * C0.gap;
    const rot = (R() - 0.5) * 1.15; // 參差：每張的轉角拉大，一疊才不像一塊方磚
    const tilt = (R() - 0.5) * 0.30;
    const cx = (R() - 0.5) * 0.07, cz = (R() - 0.5) * 0.07;
    const co = Math.cos(rot), si = Math.sin(rot);
    const pt = (u, v) => [cx + u * W * co - v * H * si, y + tilt * u, cz + u * W * si + v * H * co];
    const face = P[i % P.length];
    // 紙面：泛黃紙上兩條細墨帶（符文的簡寫；第一版一條粗帶讀成紙箱的膠帶）
    b.quad(pt(-1, -1), pt(1, -1), pt(1, -0.30), pt(-1, -0.30), face);
    b.quad(pt(-1, -0.30), pt(1, -0.30), pt(1, -0.20), pt(-1, -0.20), C0.ink);
    b.quad(pt(-1, -0.20), pt(1, -0.20), pt(1, 0.16), pt(-1, 0.16), face);
    b.quad(pt(-1, 0.16), pt(1, 0.16), pt(1, 0.26), pt(-1, 0.26), C0.ink);
    b.quad(pt(-1, 0.26), pt(1, 0.26), pt(1, 1), pt(-1, 1), face);
    // 厚度：紙的側邊一條窄 fin，讓一疊看得出是「疊」的
    const drop = (p) => [p[0], p[1] - C0.thick, p[2]];
    b.quad(pt(-1, 1), pt(1, 1), drop(pt(1, 1)), drop(pt(-1, 1)), P[2], P[2], C0.ink, C0.ink);
  }
  // 綑綁的血褐紅細線：橫過整疊的一條窄帶，兩端垂下
  const yTop = C0.thick + (n - 1) * C0.gap + 0.008;
  const hx = W * 1.25, hz = 0.022;
  b.quad([-hx, yTop, -hz], [hx, yTop, -hz], [hx, yTop, hz], [-hx, yTop, hz], C0.cord);
  b.quad([-hx, yTop, -hz], [-hx, yTop, hz], [-hx - 0.018, 0.0, hz], [-hx - 0.018, 0.0, -hz], C0.cord);
  b.quad([hx, yTop, hz], [hx, yTop, -hz], [hx + 0.018, 0.0, -hz], [hx + 0.018, 0.0, hz], C0.cord);
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
  group.add(mesh, fire);
  const fc = new THREE.Color(C.fire); // 每幀 new 一顆 Color 是白花的配置成本，提到迴圈外
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
        col.array[i * 3] = fc.r * alpha[i]; col.array[i * 3 + 1] = fc.g * alpha[i]; col.array[i * 3 + 2] = fc.b * alpha[i];
      }
      a.needsUpdate = true; col.needsUpdate = true;
    },
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
    i, key: null, curse: false, fac: null, moon: false,
    fig: null, pile: null, hoverK: 0, spin: 0, ready: false, rimK: -1, played: false,
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
  const runeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
  const runes = new THREE.InstancedMesh(runeGeo, runeMat, N);
  runes.name = 'tray-cinnabar-runes'; runes.frustumCulled = false;
  group.add(runes);
  const moonGeo = new THREE.RingGeometry(0.17, 0.195, 16);
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xe8bd55, transparent: true, opacity: 0.70, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const moonMarks = new THREE.InstancedMesh(moonGeo, moonMat, N);
  moonMarks.name = 'tray-moon-benefit';
  moonMarks.count = 0;
  moonMarks.visible = false;
  group.add(moonMarks);
  const moonV = new THREE.Vector3(), moonQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), moonS = new THREE.Vector3(), moonM = new THREE.Matrix4();
  const runePulse = [0, 0, 0, 0];
  function refreshMoonMarks() {
    let n = 0;
    for (const s of slots) {
      const k = L.mode === 'P' ? 0.62 : 1;
      const pulse = 1 + runePulse[s.i] * 0.15;
      moonV.set(slotX(s.i), TRAY.Y + 0.008, L.Z);
      moonS.set(k * pulse, k * pulse, k);
      moonM.compose(moonV, moonQ, moonS);
      runes.setMatrixAt(s.i, moonM);
      /* 滿 128 枚時卡面「今夜受惠」與整座硃砂法陣仍保留；只收掉額外一筆加色內環，
         避免它在透明錢堆壓力情境與接觸陰影競爭填色。 */
      if (!s.moon || pressureOutlines) continue;
      moonV.set(slotX(s.i), TRAY.Y + 0.011, L.Z); moonS.set(k * pulse, k * pulse, k); moonM.compose(moonV, moonQ, moonS);
      moonMarks.setMatrixAt(n++, moonM);
    }
    runes.count = N; runes.visible = N > 0; runes.instanceMatrix.needsUpdate = true;
    moonMarks.count = n;
    moonMarks.visible = n > 0;
    if (n) moonMarks.instanceMatrix.needsUpdate = true;
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
    else if (s.curse && Number.isInteger(effect.transferTarget)) playCurseTransfer(slot, effect.transferTarget);
    else if (winner >= 0) playAward(slot, winner);
  } });
  relayout(); // 第一次進場也走同一條路（命中盒的初值在這裡才寫進去，不在建構子裡各寫一份）

  let hover = -1;
  let visible = true;
  let pending = Promise.resolve();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();

  /** 這一格的描邊外殼該不該畫：`?table3d=lite` 一律不畫；否則只有 hover 的那一格畫。
   *  ★關法是 `visible=false`★——幾何與材質留著（記憶體不變），three 對不可見的物件直接跳過，
   *  draw call 與三角形就都不算；掛回來是同一顆 mesh，不重建、不重編 shader。 */
  function applyOutline(s) {
    if (!s.fig) return;
    const on = outlineOn && !pressureOutlines && s.i === hover;
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
    s.key = null; s.curse = false; s.fac = null; s.moon = false; s.ready = false; s.hoverK = 0; s.spin = 0;
    s.rimK = -1; s.played = false; s.jolt = 0; s.award = null; s.burn = undefined; s.curseAward = null; s.bb = null;
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

  function fillSlot(s, it) {
    s.key = it.key || null;
    s.curse = !!it.curse;
    s.fac = it.fac || null;
    s.moon = !!it.moon;
    s.spin = TRAY.YAW[s.i] || 0;
    if (s.curse || !s.key) {
      const p = makeCursePile(1301 + s.i * 37);
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

  /* 得標不改拍賣資料：暫時移動現有的 3D 展示模型，落到席位後隱藏，下一夜 setItems 會照既有生命週期換貨。 */
  function playAward(slot, winner) {
    const s = slots[slot]; if (!s || !s.fig || !s.fig.group.visible) return;
    s.award = { t: 0, from: { x: s.fig.group.position.x, y: s.fig.group.position.y, z: s.fig.group.position.z }, winner };
  }
  /* 詛咒品不飛入任何人的袋：符紙堆以黑紫色陰火縮成灰燼，仍完全停留在渲染層。 */
  function playCurseBurn(slot) {
    const s = slots[slot]; if (!s || !s.pile) return;
    s.burn = 0.001;
  }
  function playCurseTransfer(slot, target) {
    const s = slots[slot]; if (!s || !s.pile) return;
    s.curseAward = { t: 0, from: { x: s.pile.group.position.x, y: s.pile.group.position.y, z: s.pile.group.position.z }, target };
  }

  const api = {
    group,
    /** 桌上道具層（籌碼／令牌／信物）。治具與 renderer 的 listener 走這個出口。 */
    props,
    /** 現在是橫式還是直式版面（'L'／'P'；治具驗直式分支用） */
    mode() { return L.mode; },
    /** 這四格現在的槽位 x（直式是縮小版；治具不另抄一份常數表） */
    slotXs() { return L.XS.slice(); },
    /** 今夜的 4 件。list = [{key, curse, fac, moon}]；moon 是演出層算好的本夜受惠標記。 */
    setItems(list) {
      const arr = Array.isArray(list) ? list : [];
      const jobs = [];
      for (let i = 0; i < N; i++) {
        const it = arr[i];
        const s = slots[i];
        if (!it) { if (s.key !== null || s.pile) clearSlot(s); continue; }
        const key = it.key || null;
        const curse = !!it.curse;
        const node = s.fig ? s.fig.group : (s.pile ? s.pile.group : null);
        if (s.key === key && s.curse === curse && node && node.visible && !s.award && !s.burn && !s.curseAward) { s.moon = !!it.moon; continue; } // 同一件才可重用
        clearSlot(s);
        jobs.push(fillSlot(s, { key, curse, fac: it.fac, moon: it.moon }));
      }
      refreshMoonMarks();
      pending = Promise.all(jobs);
      return pending;
    },
    /** 這一批 setItems 的 GLB 都到位了（治具排時序用） */
    loaded() { return pending; },
    /** 幾格已經有東西站在上面（治具／驗收用） */
    readyCount() { return slots.filter((s) => s.ready && (s.fig || s.pile)).length; },
    /** 每一格現在掛的是什麼（T2 逐槽比對用；只讀，不給改） */
    items() {
      return slots.map((s) => ({
        slot: s.i, key: s.key, curse: s.curse, fac: s.fac, moon: s.moon, ready: s.ready,
        glb: s.fig ? creatureGlbUrl(s.key) : null,
        visible: s.fig ? s.fig.group.visible : !!s.pile,
        outlines: s.fig ? s.fig.outlines().filter((sh) => sh.visible).length : 0,
      }));
    },
    /** NDC（x,y ∈ [-1,1]）→ 槽位 index，未命中回 −1。純幾何，不讀遊戲狀態。 */
    hitTest(u, v) {
      if (!visible) return -1;
      ndc.set(u, v);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(proxies, false);
      return hits.length ? proxies.indexOf(hits[0].object) : -1;
    },
    /** −1 ＝ 無 */
    setHover(i) {
      const k = (i >= 0 && i < N) ? i : -1;
      if (k === hover) return;
      const prev = hover;
      hover = k;
      // 描邊只跟著 hover 走：舊的那一格卸下、新的那一格掛上（兩格都只是切 visible）
      if (prev >= 0) applyOutline(slots[prev]);
      if (k >= 0) applyOutline(slots[k]);
      /* 被看的那一格才醒過來播 idle：整桌四尊都跑 mixer 是純粹浪費（牌桌是玩家 80% 的時間），
         hover 才播既省又是「它注意到你在看」的演出。播過就留著，不另寫停播路徑。 */
      if (k >= 0 && slots[k].fig && !slots[k].played && slots[k].ready) {
        slots[k].played = !!slots[k].fig.play('idle', { fade: 0.25 });
      }
      if (director && director.setTrayPush) director.setTrayPush(k >= 0);
    },
    hover() { return hover; },
    /** 螢幕座標（px，相對視窗左上）。canvas 是 fixed 0,0 滿版，所以視窗座標＝canvas 座標。 */
    slotScreen(i) {
      if (!(i >= 0 && i < N)) return null;
      tmp.copy(proxies[i].position).project(camera);
      return {
        x: (tmp.x * 0.5 + 0.5) * (window.innerWidth || 844),
        y: (1 - (tmp.y * 0.5 + 0.5)) * (window.innerHeight || 390),
      };
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
      props.update(dt);
      let runeDirty = false;
      for (let i = 0; i < N; i++) if (runePulse[i] > 0) { runePulse[i] = Math.max(0, runePulse[i] - dt / 0.72); runeDirty = true; }
      if (runeDirty) refreshMoonMarks();
      for (const s of slots) {
        const want = (s.i === hover) ? 1 : 0;
        if (s.hoverK !== want) {
          const step = dt / TRAY.HOVER_MS;
          s.hoverK = want > s.hoverK ? Math.min(1, s.hoverK + step) : Math.max(0, s.hoverK - step);
        }
        const ease = s.hoverK * s.hoverK * (3 - 2 * s.hoverK);
        if (s.i === hover) s.spin += TRAY.HOVER_SPIN * dt;
        else if (s.hoverK > 0) {
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
        const y = TRAY.Y + TRAY.HOVER_LIFT * ease + shake;
        if (s.award && s.fig) {
          const a = s.award; a.t = Math.min(1, a.t + dt / 0.86);
          const e = a.t * a.t * (3 - 2 * a.t), dst = props.seatPosition(a.winner);
          s.fig.group.position.x = a.from.x + (dst.x - a.from.x) * e;
          s.fig.group.position.z = a.from.z + (dst.z - a.from.z) * e;
          s.fig.group.position.y = a.from.y + Math.sin(Math.PI * a.t) * 0.46 + (dst.y - a.from.y) * e;
          s.fig.setRim(TRAY.RIM_HOVER + 1.2 * (1 - a.t));
          s.fig.update(dt);
        } else if (s.curseAward && s.pile) {
          const a = s.curseAward; a.t = Math.min(1, a.t + dt / 0.72);
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
          if (q !== s.rimK) { s.rimK = q; s.fig.setRim(TRAY.RIM_BASE + (TRAY.RIM_HOVER - TRAY.RIM_BASE) * q); }
          s.fig.update(dt);
        } else if (s.pile) {
          s.pile.group.position.y = y;
          s.pile.group.rotation.y = s.spin;
          s.pile.update(dt);
        }
        // Frame the final pose before lifecycle removal, including the exact
        // terminal pose. The renderer supplies only screen geometry, never S.
        const node = s.fig ? s.fig.group : s.pile?.group;
        if (node?.visible && opts.frameSubject) opts.frameSubject(s.i, node, s.i === hover);
        if (s.award?.t >= 1) { s.fig.group.visible = false; s.award = null; }
        if (s.curseAward?.t >= 1) { s.pile.group.visible = false; s.curseAward = null; }
        if (s.burn >= 1) { s.pile.group.visible = false; s.burn = undefined; }
      }
    },
    dispose() {
      slots.forEach(clearSlot);
      props.dispose();
      group.remove(moonMarks);
      group.remove(runes);
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
