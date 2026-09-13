// 妖市 3D 環境層 — 場景環境（攤位桌／燈光／鏡頭／夜色）
// Layer 1：純視覺，不讀寫任何遊戲引擎狀態（S / CFG / trace()）。
import * as THREE from 'three';

// v0.15 調亮：牌桌面板改半透明後，3D 要「透得出來」才有意義。原本 #3d1a0a 配 intensity 1.5
// 在半透明面板後面幾乎是全黑，實測（scratchpad b1-table.png）看不出有 3D。以下四個數字是為了
// 「隔著 60% 不透明度的面板還看得見桌沿與燈籠光」而調的，改面板透明度時要一起重看。
const TABLE_COLOR = 0x6b3418;

// 桌面要大到「填滿整個畫面背景」，不是擺在畫面中央當一個物件——中央正好被最不透明的
// #felt 面板蓋住，桌子做小的話玩家一眼都看不到（實測 scratchpad b1-table.png 兩版）。
// 半徑 3.4＋鏡頭壓到 3.6，木桌會從面板四周一路鋪到畫面邊緣，四盞燈籠在座位卡後面各打一圈光。
const TABLE_RADIUS = 3.4;
const LANTERN_HEIGHT = 1.5; // 壓低：光斑落在看得到的桌面上，不是打在空中
const LANTERN_DIST = 2.6; // 東南西北四角方位半徑，對應 characters-billboard 的座位半徑

// ─── 美術甲「夜市燈火」渲染基礎包（2026-09-07，v0.46）────────────────────────
// 凍結檔：docs/experiments/2026-09-07-acceptance-art-a.md。守則：docs/design/ART_BIBLE.md
// §「燈光與色調」。本卷所有新常數集中在 ENV／LANTERNS 這兩張表，**全部【試玩必調】**。
//
// 為什麼要有這一包：玩家 90% 時間看的是牌桌／市集，而那個畫面在 v0.45 之前
// ① 沒有任何色調映射（ACES 只手寫在 bloom 合成 shader 裡，而 bloom 只在對決開）
// ② 四盞燈籠同色溫同亮度，四面等亮、沒有明暗交界
// ③ 背景是一片純色，桌子以外什麼都沒有——「夜市」只剩一張圓桌浮在紫黑裡。
export const ENV = {
  // 5-1 渲染器：ACESFilmic 的曝光。three 的 ACES 內部會先乘 `exposure/0.6`，1.1 大約是
  // 「中間調維持原樣」的落點——ACES 的完整擬合本身有很重的趾部（linear 0.1 會被壓到 0.043），
  // 光靠 exposure 1.0 會讓整張牌桌暗一截。牌桌不足的亮度由 HemisphereLight／AmbientLight／
  // 四盞燈籠的絕對值補（見下面兩張表），不是靠再往上推 exposure——推上去對決會糊掉。【試玩必調】
  EXPOSURE: 1.1,

  // 5-4 漸層穹頂（大球 BackSide＋頂點色）。SKY_STOPS＝[t, hex]，t＝頂點 y / 半徑（-1 底、+1 頂），
  // 相鄰兩站之間用 smoothstep 補間。為什麼要五站而不是「上藍紫／地平暗紅／下近黑」三站：
  // 牌桌機位俯角 34°、垂直半 FOV 25°，畫面**最上緣**其實是水平線下 8.7°——牌桌從頭到尾看不到
  // 水平線以上。三站的話玩家 90% 時間看到的就只是「地平色→黑」那一段，夜空的藍紫永遠看不到。
  // 所以水平線那圈（t=0）放暖色廟埕燈火，它下面（t=-0.22，正是牌桌看得到的那一段）放夜紫，
  // 再下面才收到近黑；t=0 以上收回藍紫夜空（對決機位俯角 19.5°、看得到水平線上 5.5°，
  // 那裡才是夜空真正露臉的地方）。全部【試玩必調】。
  SKY_STOPS: [
    [-1.00, 0x050409], // 腳下：近黑
    [-0.55, 0x0d0a1c],
    [-0.22, 0x1e1a46], // 牌桌機位看到的那一段：夜紫
    [0.00, 0x4a2030], // 水平線：廟埕燈火把霧染成的暖紫紅
    [0.35, 0x1b1740], // 夜空：藍紫
    [1.00, 0x141031], // 天頂：更暗
  ],
  SKY_FOG: 0x1c1330, // scene.fog／scene.background：取牌桌看到的那一段（遠處要化進「那個」顏色）。
  // 這個值要**暗**：對決霧密度 0.115，霧色一亮整個對決背景就變成一片灰紫霧（實測畫面中央亮度
  // 從基準 51.3 衝到 114.1）。基準版是 #1a0a2e，這裡取同亮度但偏藍紫一點。
  DOME_RADIUS: 22, // > 遠景剪影最遠 13，< camera.far 100

  // 5-2 補光：暗部不死黑。天空色偏紫藍、地面色暖褐，與四盞燈籠的暖色形成冷暖對比。
  HEMI_SKY: 0x6b6a96,
  HEMI_GROUND: 0x8a5626,
  HEMI_INT: 1.8,
  // 環境光從 0.55 退到 0.30：補光的職責交給 HemisphereLight，AmbientLight 只留最底那層墊色。
  AMBIENT_COLOR: 0x3a2450,
  AMBIENT_INT: 0.5,

  // 5-4 遠景剪影：離桌心多遠、多高、什麼顏色。剪影是程序化幾何＋頂點色，**不載任何外部貼圖**
  // （專案鐵則）。夜市燈籠串那幾點是同一份幾何裡的暖色頂點，所以一片剪影＝1 個 draw call。
  FAR_DARK: 0x0a0710, // 剪影本體：近黑帶一點紫（純黑在夜色裡看起來像破圖）
  FAR_LAMP: 0xff8a3a, // 屋簷燈籠串
  FAR_OPACITY: 1.0, // 牌桌／市集：全不透明
  // 對決時的不透明度（使用者 2026-09-07 裁定：**保留**遠景、不要整組藏）。0.30 是覆審實測的落點——
  // 對決畫面只有地平線那一帶約 3.2% 的畫素有變動、人形所在的區域 0 變動。
  // 「不得擋人形」改由深度判準把關（min(剪影距相機) > max(人形距相機)），不是靠藏起來。【試玩必調】
  FAR_DUEL_OPACITY: 0.30,
};

// 四盞燈籠改成四種色溫與亮度（東 青白／南 橘／西 琥珀／北 暗紅）。
// 這是「明暗交界」的來源：北側刻意暗、南側（玩家）最亮。閃爍在 renderer.js，
// 那裡讀的是 light.userData.baseIntensity，不再寫死 3.4。
export const LANTERNS = {
  south: { color: 0xffa855, intensity: 7.0 }, // 玩家這一側：橘、最亮
  north: { color: 0xa8402a, intensity: 3.6 }, // 對面：暗紅，做出明暗交界
  west: { color: 0xffc070, intensity: 5.6 }, // 琥珀
  east: { color: 0xd8e8ff, intensity: 5.0 }, // 青白（供桌上的白蠟）
};

// 夜霧（v0.27）：從 THREE.Fog（線性 6→16）換成 FogExp2，遠處才會真的化進夜色而不是硬切。
// 兩段密度都【試玩必調】：牌桌那段刻意保守（跟舊線性霧在桌面範圍內視覺相近，
// 才不會讓「批 1 只做對決」變成整桌變樣）；對決那段才是真正的夜霧。
export const FOG_DENSITY = { table: 0.055, duel: 0.115 };

// 四個角色方位（南＝玩家、北、西、東），供燈籠與角色共用座標系
export const SEAT_POS = {
  south: new THREE.Vector3(0, 0, LANTERN_DIST),
  north: new THREE.Vector3(0, 0, -LANTERN_DIST),
  west: new THREE.Vector3(-LANTERN_DIST, 0, 0),
  east: new THREE.Vector3(LANTERN_DIST, 0, 0),
};

/** 漸層穹頂：大球反面貼頂點色。fog 關掉（它就是霧要融進去的那個底），depthWrite 關掉、
 *  renderOrder -1，讓它永遠畫在最底層而不參與深度競爭。 */
function createSkyDome() {
  const geo = new THREE.SphereGeometry(ENV.DOME_RADIUS, 24, 16);
  const pos = geo.attributes.position;
  const stops = ENV.SKY_STOPS.map(([t, hex]) => [t, new THREE.Color(hex)]);
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / ENV.DOME_RADIUS, -1, 1);
    let j = 0;
    while (j < stops.length - 2 && t > stops[j + 1][0]) j++;
    const k = THREE.MathUtils.smoothstep(t, stops[j][0], stops[j + 1][0]);
    c.copy(stops[j][1]).lerp(stops[j + 1][1], k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  mesh.name = 'sky-dome';
  mesh.renderOrder = -1;
  return mesh;
}

/* ── 頂點色幾何的共用工具（v0.56b 上桌卷）────────────────────────────────
 * 木紋／香灰／符咒殘卷／紅布托盤全部走「幾何＋頂點色、不貼圖」（ART_BIBLE，使用者裁 Q7 甲）。
 * 建構器與決定性亂數放這裡當**單一來源**，js/table-tray.js 直接 import，不各抄一份。 */

/** 決定性亂數（3D 層一律不用 Math.random；同一顆種子每次重現同一批幾何）。 */
export function seedRnd(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/** 把一堆帶頂點色的三角形推進同一份 BufferGeometry（一組＝一個 draw call）。
 *  不做 index：flatShading 要的就是逐面法線，computeVertexNormals 對非索引幾何正好給每面一條。 */
export function vcBuilder() {
  const P = []; const C = []; const c = new THREE.Color();
  /** col 可以是 hex 數字／CSS 字串／THREE.Color。給 Color 時直接用它的線性值——
   *  `new THREE.Color(0x6a1414)` 在 ColorManagement 之下存的就是線性值，頂點色屬性要的也是線性，
   *  中間再繞一趟 sRGB 只會多一次來回捨入。 */
  const put = (p, col) => {
    if (col && col.isColor) c.copy(col); else c.set(col);
    P.push(p[0], p[1], p[2]); C.push(c.r, c.g, c.b);
  };
  return {
    tri(a, b, d, ha, hb, hd) { put(a, ha); put(b, hb === undefined ? ha : hb); put(d, hd === undefined ? ha : hd); },
    /** 四邊形（a b d e 依序繞一圈），拆兩個三角形；顏色可逐頂點給 */
    quad(a, b, d, e, ha, hb, hd, he) {
      const A = ha, B = hb === undefined ? ha : hb, D = hd === undefined ? A : hd, E = he === undefined ? B : he;
      put(a, A); put(b, B); put(d, D);
      put(a, A); put(d, D); put(e, E);
    },
    count() { return P.length / 3; },
    build(name, matOpts) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({
        vertexColors: true, flatShading: true, roughness: 0.88, metalness: 0.02,
      }, matOpts || {})));
      mesh.name = name;
      return mesh;
    },
  };
}

/* ── 老檜木供桌桌面（v0.56b；藍圖 §6.1「木紋反光」的頂點色版）──────────────
 * 取代原本的 `CylinderGeometry(3.4,3.4,0.3,8)`：外形尺寸（半徑 3.4、高 0.3、桌頂 y=0.15）
 * **一格不動**，換的是「這塊木頭看得出是木頭」——16 個徑向扇區 × 10 圈同心環，
 * 頂點色沿半徑用一維噪聲在深紅褐／近黑／暖橘褐三色之間插值＝年輪；
 * 環與環之間壓出 ≤0.004 的淺刻痕（只往下凹，桌頂最高仍是 0.15，托盤與香灰才疊得上去）；
 * 桌緣加一圈斜面線腳，斜面吃到燈籠光就有厚度。draw call：1（**取代**原本的 1，淨增 0）。 */
/* 段數（2026-09-13 幾何預算）：**試過 12×8（368→228 tris），回退**。
   我原本以為「年輪是頂點色畫的，段數減了密度不變」——**實測是錯的**：年輪的顏色是逐「圈」取樣
   `wave(r)` 得到的，圈數就是取樣率。8 圈把 5.4 週期的年輪取樣到走樣，成圖上桌面變成一片
   沒有紋路的暗色（對照 `r4-n1.png` 與 `r5-n1.png`）。木紋是本卷的交付項，
   而那 140 個三角形對 33000 的門檻（缺口 1582）也救不回來 ⇒ 回到 16×10。 */
const WOOD = {
  seg: 16, rings: 10,
  colors: [TABLE_COLOR, 0x4a2010, 0x8a4a24], // 主色（＝v0.55 的桌面色，單一來源）／深年輪／淺年輪
  side: 0x3b1c0d, // 桌側比桌面暗
  lip: 0x7d4020, // 線腳斜面：吃光的那一圈
  groove: 0.004, // 刻痕深度（只往下）
  lipR: 0.06, lipDrop: 0.025, // 線腳往內收多少、落差多少
};
/* `?table3d=lite` 的環境降級（覆審 M-1）：lite 之前只關 hover 外殼，而**非 hover 時它與預設逐值相同**
   （68 calls／19679 tris 兩邊一樣）＝降級鈕在最常見的狀態下等於沒作用。
   現在 lite 另外把環境幾何也降一階：木紋段數 16×10 → 12×8 且**刻痕關掉**（只剩年輪顏色）、
   香灰與符咒殘卷整個不建（連那 1 個 draw call 一起省）。數字貼在報告 §8.3。 */
const WOOD_LITE = { seg: 12, rings: 8, groove: 0 };
function makeWoodTable(liteMode) {
  const b = vcBuilder();
  const R = seedRnd(20260913);
  const TOP = 0.15, BOT = -0.15;
  const SEG = liteMode ? WOOD_LITE.seg : WOOD.seg;
  const RINGS = liteMode ? WOOD_LITE.rings : WOOD.rings;
  const GROOVE = liteMode ? WOOD_LITE.groove : WOOD.groove;
  const base = new THREE.Color(WOOD.colors[0]);
  const dark = new THREE.Color(WOOD.colors[1]);
  const lite = new THREE.Color(WOOD.colors[2]);
  const inner = TABLE_RADIUS - WOOD.lipR;
  /** 年輪：沿半徑的一維噪聲，兩個不同頻率的正弦疊起來就不會規律得像同心圓靶紙。
   *  頻率從 9.3 降到 5.4（第一版年輪比十圈同心環還密，在牌桌機位下整片糊成一坨）、
   *  對比從 ×1.7／×1.25 拉到 ×2.0／×1.9，並整體提亮 8%——桌面本來就只吃到四盞燈籠的邊光，
   *  不拉開明暗差距的話「木紋」在成圖上一條都看不見（自評 r1 B）。 */
  const wave = (r) => 0.5 + 0.5 * Math.sin(r * 5.4 + Math.sin(r * 2.3) * 1.9);
  const grain = (r) => {
    const n = wave(r);
    const c = n < 0.5 ? base.clone().lerp(dark, (0.5 - n) * 2.0) : base.clone().lerp(lite, (n - 0.5) * 1.9);
    return c.multiplyScalar(1.08 * (0.93 + R() * 0.14)); // 每個頂點一點點雜訊＝木頭的斑
  };
  const gy = (r) => TOP - GROOVE * wave(r);
  const ang = (i) => (i / SEG) * Math.PI * 2;
  const rr = (k) => inner * Math.pow(k / RINGS, 0.92); // 外圈密一點，年輪才不會全部擠在中心
  const pt = (k, i) => { const r = rr(k), a = ang(i); return [Math.sin(a) * r, gy(r), Math.cos(a) * r]; };
  // 桌面：同心環 × 扇區
  for (let k = 0; k < RINGS; k++) {
    for (let i = 0; i < SEG; i++) {
      const a = pt(k, i), b2 = pt(k, i + 1), c2 = pt(k + 1, i + 1), d2 = pt(k + 1, i);
      const cIn = grain(rr(k)), cOut = grain(rr(k + 1));
      if (k === 0) b.tri(a, c2, d2, cIn, cOut, cOut); // 最內圈退化成三角形（a 與 b2 同一點）
      else b.quad(a, b2, c2, d2, cIn, cIn, cOut, cOut);
    }
  }
  // 桌緣線腳：inner→TABLE_RADIUS 的斜面，再垂直落到桌底
  for (let i = 0; i < SEG; i++) {
    const a0 = ang(i), a1 = ang(i + 1);
    const pI = (a) => [Math.sin(a) * inner, gy(inner), Math.cos(a) * inner];
    const pO = (a) => [Math.sin(a) * TABLE_RADIUS, TOP - WOOD.lipDrop, Math.cos(a) * TABLE_RADIUS];
    const pB = (a) => [Math.sin(a) * TABLE_RADIUS, BOT, Math.cos(a) * TABLE_RADIUS];
    b.quad(pI(a0), pI(a1), pO(a1), pO(a0), WOOD.lip);
    b.quad(pO(a0), pO(a1), pB(a1), pB(a0), WOOD.side);
  }
  // 桌底不做：牌桌／開標／對決／局末四個機位的相機一律在 y>1.5，永遠看不到底面（少 16 個三角形）
  const mesh = b.build('table', { roughness: 0.82, metalness: 0.04 });
  return mesh;
}

/* ── 桌角香灰與符咒殘卷（v0.56b；藍圖 §6.1）─────────────────────────────
 * 兩樣合併成**一個** mesh（同材質、都靜態、都不 update）⇒ 淨增 1 draw call，不是 2。
 * 位置是算出來的：把 (x, 0.15, z) 反投影到 844×390 牌桌機位，確認落在掏空窗
 * （螢幕 x 176..668、y 92..320）之內，而且避開紅布托盤的腳印（|x|≤1.8、|z|≤0.6）。 */
/* 第一版（香灰半徑 0.30／片長 0.05／近白 #e0dad0，符咒 0.30×0.11）盲看讀成「桌上撒了一地白色碎紙屑
   ＋一塊米色木板」（自評 r1 C／D）：在這個機位下一片 0.05 的三角形就有 12px，散開 0.3 半徑更是一大攤。
   收成「一撮」與「一小卷」：半徑 ×0.42、片長 ×0.45、亮度壓到不搶拍品，符咒也收一半並加大捲度。 */
const DECOR = {
  ashY: 0.1512, talY: 0.1515, // 桌頂 0.15 ＜ 香灰 ＜ 符咒 ＜ 紅布 0.152（疊序寫死，不靠 depth 賭）
  /* 2026-09-13 幾何預算（製作人裁定「先減非主角的」）：每撮香灰 22→14 片、符咒殘卷 3→2 張、
     每張的縱向段數 6→4，三角形 174 → 90。香灰片數少了就把每片放大一點，佔的面積不變；
     符咒留下的兩張是**畫面裡真的看得到**的那兩張（第三張 [-0.55,1.20] 在托盤正前方、
     被紅布與拍品的下緣切掉大半，實測 r4 的圖上只露出一角）。 */
  ash: [[-1.30, 1.02, 0.17], [1.42, 0.88, 0.15], [0.15, -1.18, 0.13]], // [x, z, 半徑]
  ashN: 14,
  ashColors: [0xb3aba0, 0x8e887f, 0xcbc4b8],
  tal: [[-1.55, -0.72, 0.55], [1.35, -1.02, -0.35]], // [x, z, 朝向 rad]
  talSeg: 4,
  talL: 0.17, talW: 0.055,
  paper: 0xb9a874, paperDark: 0x938552, cinnabar: 0x8e1c1c,
};
function makeTableDecor() {
  const b = vcBuilder();
  const R = seedRnd(5521);
  // ① 香灰：每撮 18 片小扁三角形疊在一起，灰白、不發光（ART_BIBLE §5「香灰＝灰白 arc 帶」的桌面版）
  for (const [cx, cz, rad] of DECOR.ash) {
    for (let i = 0; i < DECOR.ashN; i++) {
      const a = R() * Math.PI * 2;
      const d = rad * R() * R(); // R()² 而不是 √R()：往中心集中＝一「撮」，不是均勻撒一片
      const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
      const s = 0.016 + R() * 0.021; // 片數 22→14 之後每片放大 ~1.25 倍，一撮佔的面積不變
      const rot = R() * Math.PI * 2;
      const y = DECOR.ashY + (1 - d / rad) * 0.006 + R() * 0.002; // 中間堆得高一點點，邊緣薄
      const col = new THREE.Color(DECOR.ashColors[i % 3]).multiplyScalar(0.82 + R() * 0.3);
      const p = (t) => [x + Math.sin(rot + t) * s, y, z + Math.cos(rot + t) * s];
      b.tri(p(0), p(2.2), p(4.3), col);
    }
  }
  // ② 泛黃硃砂符咒殘卷：三片微捲的紙（平的一段＋往上捲起的一段），中間一道硃砂紅直帶
  for (const [cx, cz, rot] of DECOR.tal) {
    const co = Math.cos(rot), si = Math.sin(rot);
    const L = DECOR.talL, W = DECOR.talW;
    // u 沿長邊 −1..1、v 沿短邊 −1..1；u>0.45 的那一段往上捲
    const P = (u, v) => {
      const curl = u > 0.25 ? (u - 0.25) / 0.75 : 0;
      const lu = u - curl * curl * 0.42; // 捲起來會往回縮（幅度加大：小尺寸下捲不夠就只是一片平紙）
      const y = DECOR.talY + curl * curl * 0.075;
      return [cx + lu * L * co - v * W * si, y, cz + lu * L * si + v * W * co];
    };
    // 硃砂帶收窄成一道細直帶（第一版佔了三分之一寬，讀成「木板上的紅漆」）
    const strips = [[-1, -0.18, DECOR.paper], [-0.18, 0.18, DECOR.cinnabar], [0.18, 1, DECOR.paperDark]];
    const SEG = DECOR.talSeg;
    for (let k = 0; k < SEG; k++) {
      const u0 = -1 + k * (2 / SEG), u1 = -1 + (k + 1) * (2 / SEG);
      for (const [v0, v1, hex] of strips) {
        const c = new THREE.Color(hex).multiplyScalar(0.9 + R() * 0.2);
        b.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), c);
      }
    }
  }
  const mesh = b.build('table-decor', { side: THREE.DoubleSide, roughness: 0.95 });
  return mesh;
}

/** 剪影建構器：把一連串四邊形推進同一份 BufferGeometry（一片剪影＝一個 draw call）。 */
function silhouette() {
  const P = []; const C = [];
  const push = (pts, hex) => {
    const c = new THREE.Color(hex);
    // pts＝[x0,y0, x1,y1, x2,y2, x3,y3] 四邊形（順序：左下 右下 右上 左上），拆兩個三角形
    const idx = [0, 1, 2, 0, 2, 3];
    for (const i of idx) { P.push(pts[i * 2], pts[i * 2 + 1], 0); C.push(c.r, c.g, c.b); }
  };
  return {
    /** 矩形 */
    box(x, y, w, h, hex) { push([x, y, x + w, y, x + w, y + h, x, y + h], hex); },
    /** 梯形（下寬 w0、上寬 w1，中心對齊 x） */
    trap(x, y, w0, w1, h, hex) { push([x - w0 / 2, y, x + w0 / 2, y, x + w1 / 2, y + h, x - w1 / 2, y + h], hex); },
    build(name) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        // FrontSide（不是 DoubleSide）：place() 用 lookAt 把正面轉向桌心，背面永遠看不到；
        // 而 three 對 DoubleSide 的材質會畫兩趟（背面一趟、正面一趟），五片就多花 5 個 draw call。
        vertexColors: true, side: THREE.FrontSide, fog: true,
        transparent: true, opacity: ENV.FAR_OPACITY, depthWrite: false,
      }));
      mesh.name = name;
      return mesh;
    },
  };
}

/** 五片遠景剪影：廟宇屋脊／牌樓／榕樹／屋簷燈籠串／攤棚一排。
 *  擺位理由（兩個上下夾的條件）：
 *  ① **上限**：牌桌機位（俯角 34°、垂直半 FOV 25°）畫面最上緣＝水平線下 8.7°，地面上的東西要離
 *     鏡頭 < 2.065/tan(8.7°) ≈ 13.5 才進得了畫面。
 *  ② **下限**：A4 的深度判準是 min(剪影距相機) > max(人形距相機)，而對決相機在半徑 3.84 的圓上
 *     繞（四個座位都可能），最壞情況是相機正對著某一片剪影：那時距離只剩 D − 3.84。人形最遠實測
 *     5.38，所以 D 要 > 9.24 才恆過。**實測教訓**：D=8.5～9.0 那一版在六場對決裡有一場紅
 *     （minFar 5.076 < maxFig 5.379）——紅的原因不是遮擋，是相機剛好停在剪影旁邊。
 *  兩條夾出 9.6 ≤ D ≤ 13.5，本卷取 10.0～10.8，方位角同時往畫面左右外側推（±45° 是水平半 FOV，
 *  愈外側的剪影底邊在畫面上愈低、看得到的部分愈多）。 */
function createFarSilhouettes() {
  const g = new THREE.Group();
  g.name = 'far'; // 容器不叫 far-*：治具掃的是 name 以 `far-` 開頭的物件，容器同名會被多算一筆
  const D = ENV.FAR_DARK, L = ENV.FAR_LAMP;

  // ① 廟宇屋脊（燕尾脊：兩段翹起的梯形頂＋殿身）
  {
    const s = silhouette();
    s.box(-2.6, 0, 5.2, 1.9, D); // 殿身
    s.trap(0, 1.9, 6.0, 3.4, 0.9, D); // 屋頂
    s.box(-3.5, 2.5, 1.0, 0.28, D); // 左燕尾
    s.box(2.5, 2.5, 1.0, 0.28, D); // 右燕尾
    s.box(-0.18, 2.8, 0.36, 0.5, D); // 脊飾
    for (let i = 0; i < 4; i++) s.box(-2.1 + i * 1.4, 1.55, 0.18, 0.3, L); // 簷下燈籠
    g.add(place(s.build('far-temple'), 222, 10.2, 0.30));
  }
  // ② 牌樓（兩柱三樓）
  {
    const s = silhouette();
    s.box(-1.9, 0, 0.34, 3.2, D);
    s.box(1.56, 0, 0.34, 3.2, D);
    s.box(-2.3, 2.3, 4.6, 0.32, D);
    s.box(-2.3, 3.0, 4.6, 0.26, D);
    s.trap(0, 3.26, 3.0, 1.6, 0.6, D);
    s.box(-1.2, 2.0, 0.2, 0.3, L);
    s.box(1.0, 2.0, 0.2, 0.3, L);
    g.add(place(s.build('far-arch'), 150, 10.0, 0.28));
  }
  // ③ 榕樹（幹＋團塊樹冠，刻意不對稱）
  {
    const s = silhouette();
    s.box(-0.28, 0, 0.56, 1.7, D);
    s.box(-1.9, 1.5, 3.8, 1.1, D);
    s.box(-1.3, 2.5, 2.4, 0.9, D);
    s.box(-2.6, 1.7, 0.9, 0.7, D);
    s.box(1.6, 1.8, 1.1, 0.6, D);
    s.box(-0.45, 3.3, 1.2, 0.55, D);
    g.add(place(s.build('far-banyan'), 236, 10.0, 0.26));
  }
  // ④ 屋簷燈籠串（一條橫樑吊六盞，最像「夜市」的那一片）
  {
    const s = silhouette();
    s.box(-3.4, 2.0, 6.8, 0.22, D);
    s.box(-3.6, 0, 0.26, 2.2, D);
    s.box(3.34, 0, 0.26, 2.2, D);
    for (let i = 0; i < 6; i++) {
      const x = -2.9 + i * 1.16;
      s.box(x - 0.04, 1.75, 0.08, 0.25, D); // 吊繩
      s.box(x - 0.16, 1.42, 0.32, 0.34, L); // 燈籠
    }
    g.add(place(s.build('far-eaves'), 136, 10.0, 0.34));
  }
  // ⑤ 攤棚一排（高低錯落的斜頂）
  {
    const s = silhouette();
    for (let i = 0; i < 4; i++) {
      const x = -3.6 + i * 2.4;
      const h = 1.2 + (i % 2) * 0.55;
      s.box(x, 0, 2.0, h, D);
      s.trap(x + 1.0, h, 2.6, 1.2, 0.45, D);
      s.box(x + 0.85, h - 0.35, 0.3, 0.26, L);
    }
    g.add(place(s.build('far-stalls'), 205, 10.8, 0.32));
  }
  return g;
}

/** 把剪影擺到方位角 deg、距離 dist 的地面上，正面轉向桌心，並壓扁 ys 倍。
 *  為什麼要壓扁：牌桌機位是**俯視**（畫面最上緣＝水平線下 8.7°），離地愈高的東西愈往畫面外跑——
 *  實測一單位世界高度在畫面上約 0.52 NDC，而剪影底部落在 NDC 0.57～0.98，
 *  也就是**只有離地約 0.85 個世界單位的那一段看得到**。不壓扁的話玩家只會看到幾根黑柱子。
 *  壓扁同時也符合視覺：從高處俯看遠處的屋脊，本來就是縱向被壓短的。 */
function place(mesh, deg, dist, ys) {
  const a = THREE.MathUtils.degToRad(deg);
  mesh.position.set(Math.sin(a) * dist, 0, Math.cos(a) * dist);
  mesh.scale.set(1, ys, 1);
  mesh.lookAt(0, 0, 0);
  return mesh;
}

export function createSceneEnv(aspect, opts = {}) {
  const liteMode = !!opts.lite; // ?table3d=lite：環境幾何降一階（覆審 M-1）
  const scene = new THREE.Scene();
  // 背景仍設純色當退路（穹頂沒建起來時畫面不會是黑的），顏色＝地平色，跟霧同一色
  scene.background = new THREE.Color(ENV.SKY_FOG);
  scene.fog = new THREE.FogExp2(ENV.SKY_FOG, FOG_DENSITY.table); // 密度由 renderer 依場景在兩段之間補間

  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  const camDist = 3.6; // 拉近：讓桌面鋪滿背景，面板四周都是木紋與燈籠光
  const tilt = THREE.MathUtils.degToRad(35);
  camera.position.set(0, Math.sin(tilt) * camDist, Math.cos(tilt) * camDist);
  const centerPoint = new THREE.Vector3(0, 0.1, 0);
  camera.lookAt(centerPoint);

  const sky = createSkyDome();
  scene.add(sky);
  const far = createFarSilhouettes();
  scene.add(far);

  // v0.56b：純色八角柱 → 頂點色年輪＋線腳（外形尺寸一格不動，見 makeWoodTable 註解）
  const table = makeWoodTable(liteMode);
  scene.add(table);
  // 桌角香灰與符咒殘卷（兩樣合併成一個 mesh，淨增 1 draw call）
  /* lite：香灰與符咒殘卷整個不建（連那 1 個 draw call 一起省，覆審 M-1） */
  const decor = liteMode ? null : makeTableDecor();
  if (decor) scene.add(decor);

  const ambient = new THREE.AmbientLight(ENV.AMBIENT_COLOR, ENV.AMBIENT_INT);
  scene.add(ambient);
  // 補光：天空紫藍／地面暖褐。暗部不再是死黑，也給了跟燈籠暖光相對的冷色。
  const hemi = new THREE.HemisphereLight(ENV.HEMI_SKY, ENV.HEMI_GROUND, ENV.HEMI_INT);
  hemi.position.set(0, 6, 0);
  scene.add(hemi);

  const lanterns = Object.keys(SEAT_POS).map((k) => {
    const seat = SEAT_POS[k];
    const cfg = LANTERNS[k];
    const light = new THREE.PointLight(cfg.color, cfg.intensity, 10);
    light.position.set(seat.x, LANTERN_HEIGHT, seat.z);
    // 閃爍在 renderer.js 每幀重算 intensity，基準值放這裡，避免兩邊各寫一份數字
    light.userData.baseIntensity = cfg.intensity;
    scene.add(light);
    return light;
  });

  return { scene, camera, table, decor, ambient, hemi, sky, far, lanterns, centerPoint };
}

export function resizeSceneEnv(camera, aspect) {
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
