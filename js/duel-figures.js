// 妖市 3D 環境層 — 對決立體站姿（Layer 4，2026-09-03 v0.27）
//
// 職責：對決場景把兩名交手者從「平貼的 SVG 頭像」換成站在桌上的立體人形。
// 作法＝docs/art-integration-guide.md §5.2 允許的「程序化簡單人形 ＋ billboard 加厚」：
//   ・頭＝既有的角色 SVG 圓形頭像（同一份三態貼圖，跟牌桌那條共用 bridge-players 的快取）
//   ・身體＝程序化的廟口版畫剪影（肩到下擺的袍子，粗黑描邊、平面色塊、無漸層）
//   ・厚度＝整個人形往鏡頭反方向疊四層，愈後面愈暗，側面看就是擠出來的一塊
//   ・逆光＝最後面一層燈籠色加色副本，命中瞬間爆一下，後製 bloom 會抓到它
// 袍子顏色直接從該角色 SVG 的 `--cloth` 變數讀出來，不另外維護一張色表（防分岔）。
//
// 邊界（與 bridge-players.js 同一組）：
// - 只讀 window.__yaoshi 的唯讀欄位（S.players / lifeState），不寫回任何賽局欄位
// - 不碰 S.rng 與 S.rngUi，不耗任何亂數
// - 只認演出層發出的 CustomEvent（ys:duel / ys:duel-hit / ys:duel-end），不自己去查遊戲階段
// - 牌桌上仍然不畫人（那裡有 DOM 頭像，見 bridge-players 的 SHOW_SEAT_FIGURES）
import * as THREE from 'three';

// 快取破除接力（v0.31 卷 C1）：本檔被 renderer.js 用 './duel-figures.js?v=<VERSION>' 載進來，
// 所以 import.meta.url 自帶那個查詢字串；把它原樣接到下一層，bridge-players.js 才會跟
// renderer.js 那條走同一個網址、共用同一份貼圖快取（理由見 renderer.js 檔頭）。
const V = new URL(import.meta.url).search;
const { getTexture, loadSvgText } = await import('./bridge-players.js' + V);

// 全部【試玩必調】。長度單位是世界單位；人形以「腳底」為原點，桌面頂在 y=0.15。
// 對決 DOM 的兩欄（名字／戰力）：3D 人形要站在自己那一欄的正上方，
// 不然名字在畫面邊緣、人在中間，讀起來是兩組不同的東西。
const COLUMN_DOM_ID = ['dL', 'dR'];
const ALIGN_MS = 150; // getBoundingClientRect 會觸發 layout，節流（同 bridge-players 的作法）

const FIG = {
  spread: 1.06, // 對不到 DOM 欄位時的退路（世界單位）
  // 人形高度用「CSS 像素」定，不用世界單位：相機 fov 與距離固定時，固定的世界高度
  // 在 390px 高的手機上剛好，到 828px 高的桌機就變成兩個巨人把名字擋掉
  // （實測 scratchpad duel-1268-2-hitstop.png 第一版）。改成跟 .fav 的佔位框同高，
  // 人形與 DOM 名字／戰力就在任何視窗大小下都是同一個比例。
  pixelH: 176,
  headR: 0.4, // 頭像半徑
  bodyH: 1.08, // 袍子高度（腳底到肩線）
  headY: 1.36, // 頭心高度
  footY: 0.15, // 踩在桌面上
  faceTurn: 26, // 側身角度：不是正對鏡頭而是斜對，加厚那疊才看得見（＝有厚度的關鍵）
  layers: [1.0, 0.42, 0.22, 0.1], // 加厚四層的明度；第一層是本色
  layerGap: 0.055, // 每層往鏡頭反方向退多少
  rimOpacity: 0.26, // 逆光基準亮度。太亮會變成貼在身上的一條硬金邊，不是光暈
  rimScale: 1.11, // 大一圈才看得出是「一圈光」而不是描邊
  rimPivotY: 0.85, // 逆光放大的樞紐高度：放在人形中段，上下才對稱（放腳底會整個往上長）
  lean: 6, // 站姿：往對手方向側傾幾度
  bobAmp: 0.02,
  bobHz: 0.5,
  lungeIn: 0.22, // 命中時勝方往中央撞多遠
  lungeBack: 0.32, // 敗方被打退多遠
  lungeSpinDeg: 15, // 敗方被打歪幾度
  lungeMs: 520,
  // ── 《紙紮夜戰》列陣（v0.31 卷 C1）：一邊不再只有一尊，而是一整隊紙紮 ──
  maxFigures: 10, // 每邊最多擺幾尊（index.html 的 PW_FX.MAXFIG 只送 8 進來，這裡是保險絲）
  // 退場寬限（v0.43.2）：被遞補收掉／換場收回的尊，還要被 update(dt) 推進這麼久，讓它掛在 scene 上的灰燼
  // 自然燒完（creature-figures 的 ash 壽命最長 BURST.life 1.05×1.4≈1.47s）——不然灰燼會凍在半空（使用者真機回報）
  ashGraceMs: 2000,
  rowStepPx: 50, // 同一邊相鄰兩尊的水平間距（CSS 像素，跟 pixelH 同一個尺度）
  // 30 時八尊擠成一面牆、三尊也互相蓋住臉（實測 scratchpad/pw-03-beat1-mid.png、
  // slow1-01-lineup.png 兩版），拉到 50：三尊剛好各自看得見臉，八尊靠 crowdShrink 收回畫面內
  rowDepth: 0.1, // 前後交錯的深度（世界單位），免得整排完全重疊看不出隻數
  // 體型差：群體＝多而小、精英＝一尊大、作祟＝半透明飄浮、護法＝略小的紙人
  bodyScale: { swarm: 0.6, elite: 1.15, ward: 0.86, haunt: 0.82 },
  crowdShrink: 0.05, // 每多一尊整排再縮多少（下限 crowdMin），免得八尊擠成一團
  crowdMin: 0.62,
  hauntFloat: 0.3, // 作祟離地飄多高（世界單位×scale）
  hauntOpacity: 0.5, // 作祟的半透明度
  hauntBob: 0.06, // 作祟上下飄的幅度（比站著的人明顯）
  burnMs: 420, // 被燒掉那一尊淡出＋上飄的時間（對齊 index.html 的 PW_FX.BURN_MS）
  burnRise: 0.5,
  // ── 真 3D 妖（接線卷，2026-09-05；工廠 skin==='creature' 時才用）──
  creaturePx: 150, // 3D 妖「1.2 世界單位高」在畫面上佔幾個 CSS 像素（190 時精英×1.15 在 390px 高的畫面被切頭，實測 scratchpad/buoy.png）（同 pixelH 的道理；紙紮是 176px/1.76 單位）
  creatureH: 1.2, // 工廠正規化後的最大高度（creature-figures.js 的 NORM.maxH）
  faceTurn3d: 35, // 3D 妖面向對手，再往鏡頭轉幾度（0＝純側面看不到臉；90＝正對鏡頭看不出對峙）
  rowStepPx3d: 58, // 3D 妖比紙紮寬（四足的長軸沿著排開的方向），相鄰兩尊的間距放大一點
  rowDepth3d: 0.32, // 前後交錯的深度也放大：同排的四足獸長軸會互相穿插，交錯開才讀得出隻數
  hauntFloat3d: 0.5, // haunt 的 3D 模型自己已有飄浮設計（無腿鏈＋霧裾），再加的離地量只給一半
  rimHit3d: 1.6, // 受擊瞬間 3D 邊光倍率多爆多少（setRim 對 3D 皮是倍率，不是不透明度）
  // ── 傷害可讀性批 2-a（2026-09-07，v0.49）：被打的那一尊閃紅 ──
  // 不新建材質、不重編 shader：3D 皮走既有的 uRimColor／uRimStrength（往紅色 lerp ＋亮度倍率），
  // 貼片走既有的逆光層（rimMats 的 color／opacity）。全部【試玩必調】。
  hitFlashMs: 120, // 事件沒帶 ms 時的預設長度（index.html 的 PW_FX.HIT_FLASH_MS 會帶）
  hitFlashRise: 20, // 前 20ms 衝到滿
  hitFlashHold: 0.6, // 滿幅撐到 ms 的六成才開始收——不撐的話「命中後 40ms」那一格只剩六成，看起來像沒閃
  hitFlashRim: 2.6, // 閃紅期間邊光倍率再乘多少（k=1 時 ×3.6）
  hitFlashTint: 1.0, // 傳給工廠 setHitTint 的強度上限（工廠自己決定怎麼染）
  hitFlashPaper: 0.85, // 貼片人形本體往紅乘多少（k=1 時）——只染逆光層的話正面幾乎看不出來（三版覆審實測 +3.3）
  // ── 演出可讀性小卷（2026-09-05 晚）：n≥3 的列陣分排、整排夾在「桌緣以內、中線以外」──
  // 實測 8v8 一排排到 r 2.5 踩桌緣剪影、兩側在中央交錯 1.57 個單位把 VS 蓋掉（凍結檔 R-1/R-2 基準表）。
  // 排法：n=3 一排三尊；n≥4 每排兩尊（4→2 排、5–6→3 排、7–8→4 排）。欄位中心只有 0.9～1.1 個單位、腳印半徑
  // 0.16～0.66 差很多，所以整排不釘在欄位中心，而是在「中線＋centerGap ～ rimMax」這段可用區間裡擺，
  // 用該排最內、最外那兩尊各自的腳印當邊界；排寬塞不下才縮 step。
  perRow: 2,
  centerGap: 0.22, // 最內那尊的腳印外緣離中線至少這麼多（兩側合計 0.44 ≥ R-1 的 0.30）
  rimMax: 2.15, // 最外那尊的腳印外緣離桌心不得超過（桌面 3.4、八邊形內切 3.14；R-2 上限 2.20）
  rowGap3d: 0.75, // 前後排的間距（世界單位；≥ R-3 的 0.50）。俯角 24° 下深度差＝畫面高度差，拉開後排的頭才露得出來（使用者 09-05 晚追加）
  rowSpanMax: 2.0, // 前後排總深度上限：排數多時排距自動縮（rowSpanMax/(rows−1)），免得後排深到桌緣半徑外
  rowsMax: 4, // 排數上限：2.0/(4−1)=0.667 ≥ rowMinStep，排距才守得住 R-3（覆審第 2 輪 H-2：排數一路加到 n 時 8 精英變 0.286 的一路縱隊）
  fitSteps: [1, 0.9, 0.8, 0.7, 0.6, 0.5], // 排數到上限仍塞不下 → 整側等比縮小（腳印跟著縮），逐級試
  rowMinStep: 0.55, // 同一排相鄰兩尊的最小中心距（塞得下才保證；step0 在 n=8 只有約 0.36）
  brickShift: 0.5, // 奇數排往外錯半格（×step），前後排的頭才不會疊在同一條線上
};

const NATURAL_H = FIG.headY + FIG.headR; // 人形在 scale=1 時的世界高度（頭頂）
const RIM_COLOR = 0xf0a840; // 燈籠光暈（對齊 assets/theme.css 的 --c-lantern-glow）
const HIT_RED = 0xff2a14; // 批 2-a：被打的那一尊閃的紅（暖紅，不是純紅——純紅在 ACES 下會糊成一團）
const RIM_C = new THREE.Color(RIM_COLOR);
const HIT_C = new THREE.Color(HIT_RED);
const INK = 0x1a0a0a; // 版畫粗描邊（對齊角色 SVG 的 --c-ink）
const CLOTH_FALLBACK = 0x7a3020;
const SHADOW_COLOR = 0x05030c;

const clothCache = new Map(); // roleId → 袍子色（從該角色 SVG 的 --cloth 讀出來）

function api() {
  return typeof window !== 'undefined' ? window.__yaoshi : null;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** 近景切鏡的回位段用（與 camera-director 的同一條曲線，兩邊各自算）。 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 袍子剪影：垂袖外張、肩線微圓、下擺展開。座標系＝腳底 y=0、頸窩 y≈1（再乘 scale）。
 * 沒有袖子的話整個人像不倒翁（實測 scratchpad duel-v6-charge.png），垂袖是讓它讀成
 * 「穿袍子的人」的關鍵那幾個點。
 */
function bodyShape(scale = 1) {
  const s = new THREE.Shape();
  const w = (x) => x * scale;
  const h = (y) => y * scale;
  s.moveTo(w(-0.5), h(0.0));
  s.lineTo(w(-0.53), h(0.44)); // 垂袖最寬處
  s.quadraticCurveTo(w(-0.52), h(0.66), w(-0.43), h(0.74)); // 袖口外緣
  s.lineTo(w(-0.28), h(0.79)); // 收進腋下
  s.lineTo(w(-0.23), h(0.9)); // 肩線
  s.quadraticCurveTo(w(-0.19), h(0.99), w(-0.11), h(1.0)); // 頸窩
  s.lineTo(w(0.11), h(1.0));
  s.quadraticCurveTo(w(0.19), h(0.99), w(0.23), h(0.9));
  s.lineTo(w(0.28), h(0.79));
  s.lineTo(w(0.43), h(0.74));
  s.quadraticCurveTo(w(0.52), h(0.66), w(0.53), h(0.44));
  s.lineTo(w(0.5), h(0.0));
  s.quadraticCurveTo(w(0.0), h(-0.05), w(-0.5), h(0.0));
  return s;
}

function flatMat(colorHex, extra) {
  return new THREE.MeshBasicMaterial(
    Object.assign({ color: colorHex, side: THREE.DoubleSide, fog: false, toneMapped: false }, extra || {})
  );
}

/* ── 人形工廠的介面（換皮用）────────────────────────────────────────────────
 * createDuelFigures 只透過下面這五個成員操作人形，不碰它內部是怎麼疊出來的：
 *   { group, shadow, setPortrait(tex), setCloth(hex), setRim(opacity) }
 * 想換成別種呈現（例如之後的真 3D 模型），寫一個新的工廠回傳同樣這五個成員，
 * 再用 createDuelFigures(scene, camera, { makeFigure: 你的工廠 }) 傳進來即可，
 * 本檔其餘程式碼一行都不用動。**上面那五個必要成員在卷 C1 沒有增減。**
 *
 * ── 接線卷（2026-09-05）：工廠改成 makeFigure(unit) 收單位 {id, body, fac, ab} ──────
 *   同一尊人形不再綁死在池位 j 上，而是按 opts.figureKey(unit)（預設＝unit.ab）分池、
 *   每場重新配位：這一場左邊第 3 尊是虎爺、下一場是王船，各自從自己那一池拿閒置的，
 *   沒有才 new。批 1 的貼片工廠不收參數、key 一律 ''，行為與 C1 逐項相同。
 *   工廠回傳物件若帶 skin==='creature'，本檔就不套頭像／袍子色／整尊透明度（3D 妖自己長著臉、
 *   半透明由材質負責），並改用下面這些可選成員：
 *     update(dt)     每幀呼叫（mixer／燒毀／特效）——燒毀中的那一尊也要呼叫，dissolve 靠它走
 *     play(name,o)   'idle' 進場、'attack' 出招（ys:fx-lunge 的勝方）、撞完回 'idle'
 *     reset()        下一場開始前把燒毀狀態收回來
 *     loaded()       Promise：GLB 載完。本場所有尊的 Promise.all 放回 ys:duel 的 detail.ready，
 *                    進度用 ys:duel-loading {loaded,total} 事件回報（index.html 的載入條）
 *
 * ── 給真 3D 模型的兩個「可選」成員（卷 C1 預留，2026-09-04 使用者裁定）──────────
 *   parts?: { body, armL, armR, head, ... }   子群組表。骨架動畫（揮手、踏步、被打退）
 *       要動的是這幾個子群組，不是整個 group。鍵名由工廠自己定，本檔一律不假設有哪幾個，
 *       只把整張表原樣交給招式演出（TRAIT_FX 的 ctx.actorFigs[i].parts）。
 *   burn?: (opts) => Promise   這一尊自己的燒毀／倒地演出，opts.ms 是希望的長度。
 *       有這個成員時，ys:fx-burn 就交給它演（本檔不再自己做淡出上飄），
 *       並把它回傳的 Promise 交回 index.html 的時間軸去 await；沒有才退回 DOM 版 fxBurn。
 *       演完本檔會自動把這一尊收起來（group.visible=false）。
 * ──────────────────────────────────────────────────────────────────────
 *
 * 卷 C1 的貼片版：體型差（群體小／精英大／作祟半透明）不是靠介面成員做的，
 * 是呼叫端用通用的 THREE 手法套在 group 上——縮放與位移動 group.scale／position，
 * 半透明走 setFigureOpacity() 的 traverse（跳過 AdditiveBlending 那層＝逆光，它歸 setRim 管）。
 * 所以只要你的工廠回傳的是一個正常的 THREE.Group，這三種體型自動成立。
 * ────────────────────────────────────────────────────────────────────────── */

/** 整尊的不透明度（作祟的半透明、被燒掉那一尊的淡出）。逆光層由 setRim 管，這裡跳過。 */
function setFigureOpacity(fig, op) {
  const q = Math.round(op * 50) / 50; // 量化，免得每幀都重跑 traverse
  if (fig.__op === q) return;
  fig.__op = q;
  fig.group.traverse((o) => {
    const m = o.material;
    if (!m || m.blending === THREE.AdditiveBlending) return;
    if (m.__baseOp === undefined) { m.__baseOp = m.opacity === undefined ? 1 : m.opacity; m.__baseTrans = !!m.transparent; }
    m.opacity = m.__baseOp * q;
    m.transparent = m.__baseTrans || q < 1;
  });
  const sm = fig.shadow && fig.shadow.material;
  if (sm) {
    if (sm.__baseOp === undefined) sm.__baseOp = sm.opacity === undefined ? 1 : sm.opacity;
    sm.opacity = sm.__baseOp * q;
  }
}

/** 預設工廠：四層加厚人形 ＋ 逆光 ＋ 地面陰影，全部掛在同一個 group 上（原點＝腳底）。 */
export function makeLayeredFigure() {
  let hasPortrait = false;
  let hitTintK = 0; // 批 2-a：逆光層染紅的強度（0＝燈籠色）
  const group = new THREE.Group();
  const bodyGeo = new THREE.ShapeGeometry(bodyShape(FIG.bodyH));
  const outlineGeo = new THREE.ShapeGeometry(bodyShape(FIG.bodyH * 1.055));
  const headGeo = new THREE.PlaneGeometry(FIG.headR * 2, FIG.headR * 2);

  // 逆光：整個人形的燈籠色加色副本，放在最後面、比本體大一圈
  const rimMats = [flatMat(RIM_COLOR, { transparent: true, opacity: FIG.rimOpacity, blending: THREE.AdditiveBlending, depthWrite: false }),
                   flatMat(RIM_COLOR, { transparent: true, opacity: FIG.rimOpacity, blending: THREE.AdditiveBlending, depthWrite: false, alphaTest: 0.5 })];
  const rim = new THREE.Group();
  rim.position.z = -FIG.layerGap * FIG.layers.length - 0.02;
  rim.position.y = FIG.rimPivotY * (1 - FIG.rimScale); // 讓放大以 rimPivotY 為中心
  rim.scale.setScalar(FIG.rimScale);
  const rimBody = new THREE.Mesh(bodyGeo, rimMats[0]);
  const rimHead = new THREE.Mesh(headGeo, rimMats[1]);
  rimHead.position.y = FIG.headY;
  rim.add(rimBody, rimHead);
  group.add(rim);

  // 加厚四層：不透明＋alphaTest，靠深度排序自然分前後，不必自己管 renderOrder
  const bodyMats = [];
  const headMats = [];
  const layerGroups = [];
  FIG.layers.forEach((tint, i) => {
    const g = new THREE.Group();
    layerGroups.push(g);
    g.position.z = -i * FIG.layerGap;
    if (i === 0) {
      // 只有最前面那層要粗黑描邊——後面幾層本來就是暗的，再描邊只會糊成一團
      const ol = new THREE.Mesh(outlineGeo, flatMat(INK));
      ol.position.z = -0.004;
      g.add(ol);
    }
    const bm = flatMat(CLOTH_FALLBACK);
    bm.color.multiplyScalar(tint);
    const hm = flatMat(0xffffff, { alphaTest: 0.5 });
    hm.color.setScalar(tint);
    bodyMats.push({ mat: bm, tint });
    headMats.push({ mat: hm, tint });
    const body = new THREE.Mesh(bodyGeo, bm);
    const head = new THREE.Mesh(headGeo, hm);
    head.position.y = FIG.headY;
    g.add(body, head);
    group.add(g);
  });

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(FIG.bodyH * 0.42, 22),
    flatMat(SHADOW_COLOR, { transparent: true, opacity: 0.6, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;

  group.visible = false;
  shadow.visible = false;
  return {
    group,
    shadow,
    /** 【可選成員】子群組表。貼片版只有這三塊（沒有手腳可動）；真 3D 模型的工廠
     *  在這裡放 {body,armL,armR,head,...}，招式演出就有東西可以擺。 */
    parts: { rim, front: layerGroups[0], layers: layerGroups },
    /* 【可選成員】burn()：貼片版刻意不提供——沒有這個成員時 createDuelFigures 會走
       自己的淡出上飄、index.html 則退回 DOM 版 fxBurn。真 3D 模型的工廠補上即可。 */
    /** 換頭像貼圖（三態各一張，由呼叫端決定何時換） */
    setPortrait(tex) {
      headMats.forEach((h) => { h.mat.map = tex; h.mat.needsUpdate = true; });
      rimMats[1].map = tex;
      rimMats[1].needsUpdate = true;
      hasPortrait = true;
    },
    /** 換袍子色（各層自動套自己的明度） */
    setCloth(hex) { bodyMats.forEach((b) => { b.mat.color.setHex(hex).multiplyScalar(b.tint); }); },
    /** 逆光亮度（受擊瞬間爆一下，bloom 才抓得到） */
    setRim(op) { rimMats.forEach((m) => { m.opacity = op; }); },
    /** 【批 2-a】被打那一瞬間染紅（k 0→1）。用的是既有材質的 color，不新建材質、不動 blending。
     *  三版覆審實測：只染逆光層的話，貼片人形的剪影紅偏量只有 +3.3（3D 妖是 +77）——
     *  逆光層在本體後面、只露出一圈光暈，正面幾乎看不出來。所以本體那四層也一起往紅乘
     *  （跟 3D 皮動 albedo 是同一招）：k 回到 0 時每一層都寫回自己那一層的原色。 */
    setHitTint(k) {
      const q = Math.max(0, Math.min(1, k || 0));
      if (hitTintK === q) return;
      // 由 0 進入閃紅的那一下，先把當下的顏色記起來（setCloth 換過袍子色也吃得到）
      if (hitTintK === 0 && q > 0) bodyMats.forEach((b) => { b.base = b.mat.color.clone(); });
      hitTintK = q;
      rimMats.forEach((m) => { m.color.copy(RIM_C).lerp(HIT_C, q); });
      bodyMats.forEach((b) => { if (!b.base) return; b.mat.color.copy(b.base); if (q > 0) b.mat.color.lerp(HIT_C, q * FIG.hitFlashPaper); });
    },
    /** 素材還沒到就別冒出一團色塊 */
    ready() { return hasPortrait; },
  };
}

/** 從角色 SVG 原始碼摳出 `--cloth:#xxxxxx`（廟口版畫的袍子色）。讀不到回退預設。 */
async function clothOf(roleId, assetsBase) {
  if (clothCache.has(roleId)) return clothCache.get(roleId);
  const raw = await loadSvgText(roleId, assetsBase);
  const m = raw && raw.match(/--cloth:\s*(#[0-9a-fA-F]{3,6})/);
  const hex = m ? parseInt(m[1].slice(1).padEnd(6, m[1].slice(1)), 16) : CLOTH_FALLBACK;
  clothCache.set(roleId, hex);
  return hex;
}

/**
 * @param scene 要掛上去的場景
 * @param camera 用來算「畫面左右」的相機（每幀取方位角，punch 的微震會自然帶出視差）
 * @param opts.makeFigure  人形工廠 makeFigure(unit)（見上面的介面說明）
 * @param opts.figureKey   unit → 池的鍵；同鍵的尊可以互相重用（預設 unit.ab，沒有＝''）
 */
export function createDuelFigures(scene, camera, opts = {}) {
  const assetsBase = opts.assetsBase || 'assets/characters/';
  const factory = opts.makeFigure || makeLayeredFigure; // 換皮就換這個（見上面的介面說明）
  const keyOf = opts.figureKey || ((u) => (u && u.ab ? String(u.ab) : ''));
  // 兩邊各一個「紙紮池」：[0]＝畫面左（ys:duel 的 a）、[1]＝畫面右（b）。
  // 池按 keyOf(unit) 分：{ key → [figure...] }；figure.__busy＝本場已配位。
  // 依名冊慢慢長出來（第一次用到才 new），一場只有一尊時成本與 v0.30 相同。
  const pool = [Object.create(null), Object.create(null)];
  const slots = [[], []]; // 本場 j → figure（onDuel 時配位）
  // 這一場每邊「目前擺上場」的名冊：[{id, body, fac, ab}]，長度 ≤ 場上同時最多幾尊（見 onDuel 的 cap）。
  // ys:duel 沒帶 armies（＝PAPERWAR_ON 關）時退回「每邊一尊」，長相與 v0.30 逐項相同。
  let roster = [[], []];
  // 遞補上場（演出小卷，2026-09-07）：這一場名冊裡「排隊中還沒建模」的存活單位（按名冊順序）。
  // index.html 不再把 armies 截斷到 MAXFIG 才送出來，本檔才有機會在某尊燒毀演完後，
  // 從這裡挑下一個換上同一格位——不然場上同時擺著的尊數超過 MAXFIG 一步都跑不動（三排/四排的站位規劃只認 MAXFIG）。
  let queue = [[], []];
  // 退場寬限清單（v0.43.2）：[{ f, until }]。resetFigure 收回的尊進來，主迴圈每幀對「未被重新占用」的尊繼續 update(dt)，
  // 到期即移除。不在 onDuel 清空——跨場的殘餘灰燼也要燒完。
  const retired = [];
  // 單位 id → { t0, custom, done }
  //   custom=true 代表這一尊的燒毀由工廠自己的 burn() 在演，本檔不插手它的透明度與位移；
  //   done=true 代表演完了，這一尊收起來不再顯示。
  const burnState = [new Map(), new Map()];
  // 演出可讀性小卷：每側這一場的排數／等比縮小（離散選擇），onDuel 歸零、第一幀決定後沿用——鏡頭 punch 會改 pxWorld，
  // 逐幀重選會在撞擊那幾幀翻面，活著的尊跳排、被燒凍住的尊留在原地（實測 6v6 minPair 0.152 就是這樣來的）
  const rowsFit = [null, null];
  const indexOfUnit = (i, id) => roster[i].findIndex((u) => u && u.id === id);

  function eachFigure(cb) {
    pool.forEach((side, i) => { for (const key in side) side[key].forEach((f) => cb(f, i)); });
  }

  /** 把一尊收回閒置池：標未占用、清掉頭像/袍子/animation 快取、燒毀狀態走它自己的 reset()（3D 妖的 dissolve
   *  要這樣才會復原），並藏起來。onDuel 收回上一場全部尊、reinforce() 收回被遞補掉的那一尊都走這裡（防分岔）。 */
  function resetFigure(f) {
    restoreDim(f); // 被近景切鏡退暗的尊要先寫回原值，材質才不會帶著 0.35 進下一場（池是重用的）
    f.__busy = false; f.applied = ''; f.cloth = ''; f.__op = undefined; f.__anim = null; f.unit = null;
    if (f.__hitK) { try { f.setHitTint(0); } catch (err) { /* 一尊壞了不擋整場 */ } f.__hitK = 0; }
    if (typeof f.reset === 'function') { try { f.reset(); } catch (err) { /* 一尊壞了不擋整場 */ } }
    f.group.visible = false;
    f.shadow.visible = false;
    // 灰燼掛在 scene、只靠這尊自己的 update 推進：收回後再推 ashGraceMs，讓它自己燒完並隱藏（凍結檔 F1／F6）
    if (typeof f.update === 'function' && !retired.some((r) => r.f === f)) retired.push({ f, until: performance.now() + FIG.ashGraceMs });
  }

  /** 釋出某一格位目前占用的尊（若有），並把該格位清空，讓下一次 figureFor(side,j) 重新配位。 */
  function releaseSlot(side, j) {
    const f = slots[side][j];
    if (f) resetFigure(f);
    slots[side][j] = null;
  }

  /** 遞補上場（演出小卷，2026-09-07）：某一格位那一尊燒毀演完，且該側名冊裡還有排隊中的存活單位時，
   *  把下一個換上同一格位——figureFor 照 keyOf(unit) 重新分池／視需要 new，跟其餘尊走同一條建模路徑
   *  （材質／貼花／系色一致；GLB 沒載到走既有退路）。查無排隊單位（隊伍已經全數現身過）就什麼都不做，
   *  這一格位從此空著；場上「可見未燒尊數」因此自然收斂到 min(該側目前存活數, cap)。 */
  function reinforce(side, j) {
    const q = queue[side];
    if (!q || !q.length) return;
    releaseSlot(side, j);
    roster[side][j] = q.shift();
  }

  function figureFor(side, j) {
    if (slots[side][j]) return slots[side][j];
    const u = roster[side][j];
    const key = keyOf(u);
    const arr = pool[side][key] || (pool[side][key] = []);
    let f = arr.find((x) => !x.__busy);
    if (!f) {
      f = Object.assign(factory(u), { applied: '', cloth: '' });
      scene.add(f.group);
      scene.add(f.shadow);
      arr.push(f);
    }
    f.__busy = true;
    f.unit = u;
    slots[side][j] = f;
    return f;
  }

  // ── 近景切鏡的退暗（v0.45 批 1，規格 docs/proposals/2026-09-07-duel-closeup.md §二.2）──
  // 「每幀依狀態算」而不是收到事件就 setFigureOpacity 一次：主迴圈每幀都會對每一尊寫一次
  // opacity（`(haunt?0.5:1)*(1-bu)`），一次性設值下一幀就被蓋掉（凍結檔 P3 那句「什麼實作會讓它紅」）。
  // 包絡與 camera-director 的 FOCUS 同一組時間（進 160／回 220），兩邊各自算、不互相依賴。
  const FOCUS = { inMs: 160, outMs: 220, dim: 0.35, shrink: 0.92 };
  let focusOn = false;
  let focusAt = 0;
  let focusMs = 0;
  let focusK0 = 0;
  let focusK = 0;
  // 正在回位（endFocusEv 叫的），不得再經過進場的上升段——與 camera-director 的 focusFall 同一支旗標。
  // 少了它，ys:fx-trait-cancel（按跳過）進來的前 160ms 會走上升曲線：退暗不但沒收，還往更暗走，
  // 撐滿 160ms 再單幀跳一下才開始收，整段變 380ms（實測 cancel+300ms 只回到 0.80，凍結檔 P3 紅）。
  let focusFall = false;
  let focusRef = null; // { a:[側index, unitId], b:[側index, unitId] }：這兩尊不退暗

  function onFocusEv(e) {
    const d = (e && e.detail) || {};
    focusK0 = focusK; // 同一拍第二次 focus 直接接續（與導演同一條規則）
    focusAt = performance.now();
    focusMs = Math.max(1, Number(d.ms) || 650);
    focusRef = {
      a: d.actor == null ? null : [sideIdx(d.side), d.actor],
      b: d.target == null ? null : [sideIdx(d.foeSide), d.target],
    };
    if (d.dim !== undefined) FOCUS.dim = Number(d.dim);
    if (d.shrink !== undefined) FOCUS.shrink = Number(d.shrink);
    focusFall = false;
    focusOn = true;
  }

  /** 立刻進回位段（ys:fx-trait-cancel／ys:duel-end）：不硬歸零，讓退暗跟著鏡頭一起收。 */
  function endFocusEv() {
    if (!focusOn) return;
    focusK0 = focusK;
    focusAt = performance.now();
    focusFall = true; // 直接進回位段（見 focusFall 的註解）
  }

  function focusEnvelope(now) {
    if (!focusOn) return 0;
    const e = Math.max(0, now - focusAt);
    const done = () => { focusOn = false; focusFall = false; focusRef = null; return 0; };
    if (focusFall) {
      const u = e / FOCUS.outMs;
      return u >= 1 ? done() : focusK0 * (1 - easeInOutCubic(u));
    }
    if (e < FOCUS.inMs) return focusK0 + (1 - focusK0) * (1 - Math.pow(1 - e / FOCUS.inMs, 3));
    if (e <= focusMs) return 1;
    const u = (e - Math.max(focusMs, FOCUS.inMs)) / FOCUS.outMs;
    return u >= 1 ? done() : 1 - easeInOutCubic(u);
  }

  /** 這一尊是不是本次切鏡的主角（出手者或目標）。查不到＝一律當成配角（退暗），不拋錯。 */
  function focusKeeps(i, unitId) {
    if (!focusRef) return false;
    const hit = (p) => !!p && p[0] === i && p[1] === unitId;
    return hit(focusRef.a) || hit(focusRef.b);
  }

  let active = false;
  let seats = [null, null];
  // ── 批 2-a：被打的那一尊閃紅（每一筆交鋒各自一條曲線，與整場的 lunge 無關）──
  // 一樣是「每幀依狀態算」：邊光倍率每幀都被主迴圈寫一次，一次性設值下一幀就被蓋掉。
  const hitFlash = [new Map(), new Map()]; // 側 index → unit id → { t0, ms }
  function onHitEv(e) {
    const d = (e && e.detail) || {};
    if (typeof d.unit !== 'number') return;
    hitFlash[sideIdx(d.side)].set(d.unit, { t0: performance.now(), ms: Math.max(1, Number(d.ms) || FIG.hitFlashMs) });
  }
  function clearHitFlash() {
    for (const m of hitFlash) m.clear();
    eachFigure((f) => { if (f.__hitK) { try { f.setHitTint(0); } catch (err) { /* 一尊壞了不擋整場 */ } f.__hitK = 0; } });
  }
  /** 這一尊此刻的閃紅強度（0～1）。前 hitFlashRise 毫秒衝到滿，其餘線性收；到期自己從表裡拿掉。 */
  function hitFlashK(i, unitId, now) {
    const st = hitFlash[i].get(unitId);
    if (!st) return 0;
    const e = now - st.t0;
    if (e < 0) return 0;
    if (e >= st.ms) { hitFlash[i].delete(unitId); return 0; }
    const rise = Math.min(FIG.hitFlashRise, st.ms * 0.3);
    const hold = Math.max(rise, st.ms * FIG.hitFlashHold);
    if (e < rise) return e / rise;
    if (e <= hold) return 1;
    return Math.max(0, 1 - (e - hold) / (st.ms - hold));
  }

  let hitAt = 0; // 命中時刻（performance.now），0＝沒有進行中的受擊
  let hitPower = 1; // 這一次撞擊的力道倍率
  let hitDir = [0, 0]; // 每人的位移方向：+1 往前撞、−1 被打退、0 沒事

  function onDuel(e) {
    const d = (e && e.detail) || {};
    if (typeof d.a !== 'number' || typeof d.b !== 'number') return;
    seats = [d.a, d.b];
    hitAt = 0;
    hitDir = [0, 0];
    active = true;
    // ys:duel 沒帶 armies＝PAPERWAR_ON 關：退回「每邊一尊」。
    // body 刻意用 bodyScale 裡沒有的鍵，倍率才會是 ×1、跟 v0.30 逐項相同
    // （寫 'elite' 會變成 ×1.15，OFF 的人形就無聲地變大一圈了）。
    const fallback = [{ id: 0, body: 'single' }];
    // 場上同時最多幾尊：index.html 這一場帶了 maxFig 就用它（正式頁＝PW_FX.MAXFIG），
    // 沒帶（例如治具手動發 ys:duel）就退回 FIG.maxFigures 這條保險絲，跟 v0.30 逐項相同。
    const cap = Math.max(1, Math.min(FIG.maxFigures, Number(d.maxFig) || FIG.maxFigures));
    const full = [0, 1].map((i) => {
      const a = d.armies && d.armies[i] && Array.isArray(d.armies[i].units) ? d.armies[i].units : null;
      return (a && a.length ? a : fallback);
    });
    roster = full.map((list) => list.slice(0, cap));
    queue = full.map((list) => list.slice(cap)); // 排隊中尚未建模的單位；有尊燒毀演完就從這裡遞補一個上來
    // 這一場的兩欄還沒重畫完就用上一場的座標，第一格會看到整排站錯位置
    // （實測 scratchpad/s3-01-lineup.png：八尊有一半掉出畫面左緣）。
    // 對齊成功之前一尊都不畫，對齊了才現身。
    aligned = false;
    nextAlign = 0;
    burnState[0].clear();
    burnState[1].clear();
    rowsFit[0] = null; rowsFit[1] = null;
    // 回收上一場：全部標閒置、收起、燒毀狀態歸零（3D 妖的 dissolve 要 reset 才會復原）
    eachFigure((f) => resetFigure(f));
    slots[0].length = 0;
    slots[1].length = 0;
    // 立刻配位：GLB 從現在開始載（不等第一幀），載入條對的就是這一批。
    // 已經載好的（重用池裡的尊）同步算完成，快取命中時首個進度事件就是 loaded===total。
    let total = 0;
    let done = 0;
    const pending = [];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < roster[i].length; j++) {
        const f = figureFor(i, j);
        if (typeof f.loaded !== 'function') continue; // 貼片工廠沒有載入這回事
        total++;
        if (f.ready()) { done++; f.__settled = true; continue; }
        f.__settled = false;
        pending.push(f.loaded().then(() => { f.__settled = true; }, () => { f.__settled = true; })); // 成功或 404 都算「載入結束」（排法鎖點用）
      }
    }
    const emit = () => {
      d.loadLoaded = done;
      try { document.dispatchEvent(new CustomEvent('ys:duel-loading', { detail: { loaded: done, total } })); } catch (err) { /* headless */ }
    };
    d.loadTotal = total;
    d.ready = Promise.all(pending.map((p) => Promise.resolve(p).then(() => { done++; emit(); }, () => { done++; emit(); }))).then(() => true);
    emit();
  }

  /** 【積木接收端】ys:fx-burn：某一側的第幾隻被燒掉了。
   *  工廠有 burn() 就交給它演（真 3D 模型的倒地／燒毀），把 Promise 放回 detail.done、
   *  detail.handled 設 true，呼叫端（index.html 的時間軸）就知道不必再叫 DOM 版 fxBurn；
   *  沒有 burn() 時走本檔內建的淡出＋上飄，detail.handled 維持 false。
   *  事件是同步派送的，所以呼叫端 dispatch 完立刻讀 detail 就拿得到結果。 */
  function onFigBurn(e) {
    const d = (e && e.detail) || {};
    const i = d.side === 'B' ? 1 : 0;
    if (typeof d.unit !== 'number' || burnState[i].has(d.unit)) return;
    const j = indexOfUnit(i, d.unit);
    const fig = j >= 0 ? slots[i][j] : null;
    const st = { t0: performance.now(), custom: false, done: false };
    burnState[i].set(d.unit, st);
    // GLB 還沒到（載入逾時照演、404）就不能交給工廠：它的 Promise 靠每幀 update 推進，
    // 而 ready() 之前本檔不呼叫 update，交過去就永遠不 resolve、時間軸卡死（接線卷審查 C-2）。
    // 退回內建淡出＋DOM 版 fxBurn，跟貼片一樣演。
    if (fig && typeof fig.burn === 'function' && (typeof fig.ready !== 'function' || fig.ready())) {
      try {
        const p = Promise.resolve(fig.burn({ ms: Number(d.ms) || FIG.burnMs, body: (roster[i][j] || {}).body, seed: d.unit + 1 + i * 100 }));
        st.custom = true;
        d.handled = true;
        // 遞補上場：這一尊自己的 burn() 演完（resolve／reject 都算演完）才真的算燒完，
        // 這時才把排隊中的下一個單位換上同一格位——j 在這裡已經固定，不受這之後其他尊燒毀影響。
        d.done = p.then(() => { st.done = true; reinforce(i, j); }, () => { st.done = true; reinforce(i, j); });
      } catch (err) {
        st.custom = false; // 工廠的 burn() 炸了就退回內建演出，不讓一支動畫弄壞整場
        d.handled = false;
        d.done = null;
      }
    }
  }

  /** 【積木接收端】ys:fx-lunge：勝方往中央撞、敗方往外退。跟「對決」解耦，
   *  三拍制時一拍叫一次；power 是力道倍率。 */
  function onLunge(e) {
    const d = (e && e.detail) || {};
    if (!active) return;
    hitAt = performance.now();
    hitPower = Math.max(0.3, Math.min(2, Number(d.power) || 1));
    hitDir = seats.map((s) => (s === d.l ? -1 : s === d.w ? 1 : 0));
  }

  function onDuelEnd() {
    active = false;
    hitAt = 0;
    // 退暗要在這裡清乾淨：active=false 之後主迴圈不再跑，被退暗的尊會帶著壓低的 opacity
    // 進入下一場（池是重用的）。restoreDim 把它們寫回原值，focusK 一併歸零。
    focusOn = false; focusFall = false; focusRef = null; focusK = 0; focusK0 = 0;
    clearHitFlash(); // 批 2-a：閃紅不得跨場殘留（池是重用的）
    eachFigure((f) => { restoreDim(f); f.group.visible = false; f.shadow.visible = false; });
  }

  /** 把被退暗的那一尊寫回原值（燒毀中的尊不在此列——它們的 opacity 歸燒毀曲線管）。 */
  function restoreDim(f) {
    if (!f.__focusDim) return;
    f.__focusDim = false;
    try { setFigureOpacity(f, 1); } catch (err) { /* 一尊壞了不擋整場 */ }
  }

  document.addEventListener('ys:duel', onDuel);
  document.addEventListener('ys:fx-focus', onFocusEv);
  document.addEventListener('ys:fx-trait-cancel', endFocusEv);
  document.addEventListener('ys:fx-focus-end', endFocusEv); // 招式進來時提前收切鏡（審查 MEDIUM-3）
  document.addEventListener('ys:fx-hit', onHitEv); // 批 2-a：被打的那一尊閃紅
  document.addEventListener('ys:fx-trait-cancel', clearHitFlash); // 跳過／中斷：閃紅一次清乾淨（R5）
  document.addEventListener('ys:fx-lunge', onLunge);
  document.addEventListener('ys:fx-burn', onFigBurn);
  document.addEventListener('ys:duel-end', onDuelEnd);

  const tmpRight = new THREE.Vector3();
  const tmpFwd = new THREE.Vector3(); // 「朝鏡頭」的水平向量，用來把整排排出前後深度
  const offset = [-FIG.spread, FIG.spread]; // 兩人離畫面中心的水平距離（世界單位）
  let figScale = 1; // 依視窗高度換算的人形縮放（見 FIG.pixelH）
  let figScale3d = 1; // 3D 妖的縮放（見 FIG.creaturePx）
  let pxWorld = 0.01; // 1 CSS 像素等於多少世界單位（在桌心那個深度上）
  let nextAlign = 0;
  let camStable = false; // 相機距離兩幀之間沒變（realign 時更新）
  let aligned = false; // 這一場的兩欄座標拿到了沒（拿到之前不畫，見 onDuel 的註解）
  let lastDist = 0; // 上一幀相機距離：進場鏡頭 3.6→4.2 推移中不鎖排法（第 4 輪覆審 M-2）

  /**
   * 把兩個人形對到 DOM 那兩欄的水平中心：把欄位中心的 NDC.x 換算成
   * 「在桌心那個深度上」的世界水平距離。相機推近（punch）時這個換算會自己跟著變，
   * 所以人形仍然黏在自己那一欄上，不會跟名字錯開。
   */
  function realign() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;
    const dist = camera.position.length() || 4.2;
    camStable = Math.abs(dist - lastDist) < 1e-3; lastDist = dist;
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
    const halfW = halfH * camera.aspect;
    // 1 CSS 像素在桌心那個深度上是多少世界單位 → 換算人形該多大
    pxWorld = (2 * halfH) / h;
    figScale = Math.max(0.25, Math.min(2, (FIG.pixelH * pxWorld) / NATURAL_H));
    figScale3d = Math.max(0.25, Math.min(2, (FIG.creaturePx * pxWorld) / FIG.creatureH));
    let ok = 0;
    COLUMN_DOM_ID.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      offset[i] = ((r.left + r.width / 2) / w * 2 - 1) * halfW;
      ok++;
    });
    if (ok === COLUMN_DOM_ID.length) aligned = true;
  }

  function update(dt, now) {
    // 退場寬限（v0.43.2）：放在 active 檢查之前——對決結束後 active=false，殘餘灰燼仍要推進到燒完
    for (let k = retired.length - 1; k >= 0; k--) {
      const r = retired[k];
      if (now > r.until) { retired.splice(k, 1); continue; }
      if (!r.f.__busy) { try { r.f.update(dt); } catch (err) { retired.splice(k, 1); } } // 被重新占用的尊由下面主迴圈推，不重複
    }
    if (!active) return;
    focusK = focusEnvelope(now);
    // 近景切鏡期間**凍結 realign**（v0.45）：realign 會依 camera.position.length() 把人形等比縮回
    // 「固定 CSS 像素高」，鏡頭 4.2→2.6 推近的放大量剛好被它抵銷掉，畫面上一點都不會變近。
    // 凍住之後 dist 縮 1.6 倍就是真的放大 1.6 倍；而且切鏡起訖點的 dist 都是 4.2，
    // 凍結時記下的那組值在回全景時仍然正確，收尾不會跳一下。
    // 附帶效果：dist 抖動期間 camStable 也不會被寫壞（排法鎖點見 rowsFit 的註解）。
    if (!aligned) { realign(); if (!aligned) return; nextAlign = now + ALIGN_MS; }
    else if (now >= nextAlign && focusK <= 0) { nextAlign = now + ALIGN_MS; realign(); }
    const Y = api();
    const players = Y && Y.S && Y.S.players ? Y.S.players : null;

    // 「畫面右」＝相機方位角推出來的水平向量。用方位角而不是相機矩陣，
    // 是為了讓 punch 的微震帶出一點視差、卻不會讓兩個人跟著鏡頭整組橫移。
    const az = Math.atan2(camera.position.x, camera.position.z);
    tmpRight.set(Math.cos(az), 0, -Math.sin(az));
    tmpFwd.set(Math.sin(az), 0, Math.cos(az)); // 由桌心指向鏡頭

    const hitU = hitAt ? Math.min(1, (now - hitAt) / FIG.lungeMs) : 1;
    const kick = hitAt ? 1 - easeOutCubic(hitU) : 0;
    if (hitAt && hitU >= 1) hitAt = 0;

    for (let i = 0; i < 2; i++) {
      const seat = seats[i];
      const p = players && seat != null ? players[seat] : null;
      const list = roster[i];
      const n = list.length;
      // 一整排的整體縮小：八尊還用一尊的大小會擠成一團、互相蓋住臉
      const crowd = n <= 2 ? 1 : Math.max(FIG.crowdMin, 1 - FIG.crowdShrink * (n - 2));
      const side = i === 0 ? -1 : 1; // 左 −1、右 +1
      const dir = hitDir[i] || 0;
      // 演出可讀性小卷：n≥3 分排＋夾寬；n≤2 完全走原路徑（位置與 v0.33 逐項相同，凍結檔 R-4）
      let plan = null;
      if (n >= 3) {
        const any3d = list.some((_, jj) => slots[i][jj] && slots[i][jj].skin === 'creature');
        const is3dRow = any3d;
        // 腳印半徑從幾何與已知縮放算（影子幾何半徑 × 這尊的 sc × bodyScale × 這一側的 crowd×fit），不讀上一幀的 shadow.scale：
        // 上一幀值在池子新建時是 1、又含上一輪的 fit，會讓首幀選錯排數（覆審第 2 輪 H-2 ③）與循環依賴
        const footBase = (jj) => { const g = slots[i][jj]; const u0 = list[jj]; if (!g) return 0.3; const rad = g.shadow.geometry.parameters ? g.shadow.geometry.parameters.radius : 0.42; const sc0 = g.skin === 'creature' ? figScale3d : figScale; return rad * sc0 * (FIG.bodyScale[u0.body] || 1); };
        const lo = FIG.centerGap, hi = FIG.rimMax, want = Math.abs(offset[i]);
        // 站位順序：小的前排、大的後排（依 bodyScale：群體 0.6 → 作祟 0.82 → 護法 0.86 → 精英 1.15），同體型保留名冊順序。
        // 只動站位不動名冊 j／unit id（beats 的 actor/target 與 DOM 隻數牌都靠 id），所以這裡是一個排列 order[slot]=j。
        const order = list.map((_, jj) => jj).sort((a, b) => ((FIG.bodyScale[list[a].body] || 1) - (FIG.bodyScale[list[b].body] || 1)) || (a - b));
        // 排數自適應（覆審 H-2）：從 n=3 一排／其餘每排 perRow 起算，哪一排塞不進 rowMinStep 就多一排重排，直到每排都 ≥ rowMinStep 或一排一尊。
        // 三件精英（腳印各 0.6）同排時 W 只剩 0.73、s 會被壓到 0.34；極端視窗 W=0 兩尊會重疊——多一排就解。
        const layout = (rows, fit) => {
          const crowdEff = crowd * fit;
          const step0 = (any3d ? FIG.rowStepPx3d : FIG.rowStepPx) * pxWorld * crowdEff;
          const footOf = (jj) => footBase(jj) * crowdEff;
          const sizes = [];
          { const base = Math.floor(n / rows), extra = n % rows; for (let r = 0; r < rows; r++) sizes.push(base + (r < extra ? 1 : 0)); }
          const gap = rows > 1 ? Math.min(FIG.rowGap3d, FIG.rowSpanMax / (rows - 1)) : 0;
          const P = { rows, sizes, gap, fit, crowd: crowdEff, steps: [], centers: [], rowOf: new Array(n), idxOf: new Array(n), ok: true };
          let slot = 0;
          for (let r = 0; r < rows; r++) {
            const m = sizes[r];
            const fIn = footOf(order[slot]), fOut = footOf(order[slot + m - 1]); // k=0 最內、k=m−1 最外
            const need = (m - 1) / 2;
            // 這一排的橫向上限＝該深度下的徑向上限（後排深 1.1 時橫向只剩 1.83），規劃時就吃進去，撞擊夾限才不會在靜態咬到人
            const depthR = rows > 1 ? ((rows - 1) / 2 - r) * gap : (is3dRow ? FIG.rowDepth3d : FIG.rowDepth);
            // 最外那尊中心的橫向上限：腳印外緣要在半徑 rimMax 的圓內 → sqrt((rimMax−fOut)²−depth²)，與下面撞擊夾限同一條式子
            const hiOut = Math.sqrt(Math.max(0, (hi - fOut) * (hi - fOut) - depthR * depthR));
            const W = Math.max(0, hiOut - lo - fIn); // 這一排兩端腳印中心能拉開的最大距離
            const s = m <= 1 ? step0 : Math.min(W / (2 * need), Math.max(step0, FIG.rowMinStep));
            if (m > 1 && s < FIG.rowMinStep) P.ok = false;
            if (lo + fIn + need * s > hiOut - need * s) P.ok = false; // 連一尊都塞不進可用區間（會壓到中線或桌緣）
            let c = Math.max(lo + fIn + need * s, Math.min(want, hiOut - need * s)); // 盡量貼欄位中心，不夠就往外滑
            if (lo + fIn + need * s > hiOut - need * s) c = (lo + fIn + hiOut) / 2;
            if (r % 2) c += Math.min(s * FIG.brickShift / 2, Math.max(0, hiOut - (c + need * s))); // 奇數排往外錯半格（塞得下才錯）
            P.steps.push(s); P.centers.push(c);
            for (let k = 0; k < m; k++) { const j0 = order[slot + k]; P.rowOf[j0] = r; P.idxOf[j0] = k; }
            slot += m;
          }
          return P;
        };
        // 先加排（到 rowsMax），再整側等比縮小（fitSteps），第一個 ok 的就用；都不行就取最後一個（最小 fit、最多排）。
        // 離散選擇一場只做一次（rowsFit），之後每幀只重算連續量（排中心、step 跟鏡頭距離微調）
        // 鎖點只在該側所有 GLB 就位後（第 3 輪覆審 H-2：第一幀影子幾何還是預設 0.42，用它選的排法整場鎖死 → 8 虎爺 0.146）
        // 就位＝GLB 載完（真腳印已換上）或載入已結束（404／逾時：這尊不會現身，用預設腳印鎖住也無妨）；再加相機距離穩定
        // （進場鏡頭 3.6→4.2 推移期間 pxWorld 偏大，鎖到偏小的腳印會在 300ms 後跳一次排）——第 4 輪覆審 M-1／M-2
        const allReady = camStable && list.every((_, jj) => { const g = slots[i][jj]; return !!g && (typeof g.ready !== 'function' || g.ready() || g.__settled === true); });
        const search = () => {
          let best = null;
          // 起始排數夾在 rowsMax 內（v0.43.3：MAXFIG 10 時 ceil(10/2)=5 > rowsMax 4，迴圈一次都不跑、best 留 null，
          // 主迴圈讀 plan.rows 每幀炸掉——所謂 maxFigures 10 的保險絲以前從沒被這裡支援過）
          const rowsCap = Math.min(FIG.rowsMax, n);
          const rows0 = Math.min(n === 3 ? 1 : Math.ceil(n / FIG.perRow), rowsCap);
          outer: for (const fit of FIG.fitSteps) {
            for (let rows = rows0; rows <= rowsCap; rows++) { best = layout(rows, fit); if (best.ok) break outer; }
          }
          // 真保險絲：無論如何回一個排法（最多排、最小 fit），寧可擠也不能回 null
          if (!best) best = layout(rowsCap, FIG.fitSteps[FIG.fitSteps.length - 1]);
          return best;
        };
        if (rowsFit[i] && rowsFit[i].n === n) {
          plan = layout(rowsFit[i].rows, rowsFit[i].fit);
          // 鎖住的排法塞不下了（欄位或鏡頭距離變了）：重選一次，找得到塞得下的才換，找不到就守住原排法不翻面
          if (!plan.ok) { const alt = search(); if (alt.ok) { plan = alt; rowsFit[i] = { n, rows: alt.rows, fit: alt.fit }; } }
        } else {
          plan = search();
          if (allReady) rowsFit[i] = { n, rows: plan.rows, fit: plan.fit };
        }
      }

      for (let j = 0; j < n; j++) {
        const u = list[j];
        const f = figureFor(i, j);
        const is3d = f.skin === 'creature';

        if (p && !is3d) {
          // 頭像：角色或氣色變了才換（三態快取與牌桌那條共用，見 bridge-players.getTexture）
          const state = Y.lifeState ? Y.lifeState(p) : 'state-healthy';
          const key = `${p.roleId}:${state}`;
          if (f.applied !== key) {
            f.applied = key;
            getTexture(p.roleId, state, assetsBase).then((tex) => {
              if (tex && f.applied === key) f.setPortrait(tex);
            });
          }
          // 袍子色：從該角色的 SVG 讀 --cloth，一角色抓一次
          if (f.cloth !== p.roleId) {
            f.cloth = p.roleId;
            clothOf(p.roleId, assetsBase).then((hex) => {
              if (f.cloth === p.roleId) f.setCloth(hex);
            });
          }
        }
        if (!f.ready()) continue;
        // 每幀推進（接線卷）：mixer／燒毀／灰燼／特效。放在燒毀判斷之前——
        // 燒毀中的那一尊 dissolve 就是靠這一行在走，跳過它就會停在半燒的狀態。
        if (typeof f.update === 'function') f.update(dt);

        // 燒掉的那一尊：內建演出＝淡出＋上飄（時長對齊 index.html 的 fxBurn）；
        // 工廠自己有 burn() 時（st.custom）本檔完全不插手，只在它演完後收起來。
        const st = burnState[i].get(u.id);
        if (st && st.done) { f.group.visible = false; f.shadow.visible = false; continue; }
        const bt = st && !st.custom ? st.t0 : null;
        const bu = bt == null ? 0 : Math.min(1, (now - bt) / FIG.burnMs);
        if (bt != null && bu >= 1) { st.done = true; f.group.visible = false; f.shadow.visible = false; reinforce(i, j); continue; }
        if (st && st.custom) continue; // 這一尊的位置／透明度歸工廠的 burn() 管，本檔這一幀不碰

        // 骨架動畫（3D 皮）：進場先站 idle；勝方在 lunge 那一下播 attack，撞完回 idle。
        // 招式專屬的動作歸 C3 卷的 TRAIT_FX，這裡只做通用交鋒。
        if (is3d && typeof f.play === 'function') {
          if (!f.__anim) { f.__anim = 'idle'; f.__hitAt = 0; f.play('idle', { fade: 0 }); }
          // 每一次 lunge（hitAt 換新值）都重播 attack：一拍內連擊五次要揮五次，不是揮一次定格（審查 M-1）
          else if (dir === 1 && hitAt && f.__hitAt !== hitAt) { f.__anim = 'attack'; f.__hitAt = hitAt; f.play('attack', { fade: 0.08 }); }
          else if (!hitAt && f.__anim === 'attack') { f.__anim = 'idle'; f.play('idle', { fade: 0.2 }); }
        }

        const sc = is3d ? figScale3d : figScale;
        const step = (is3d ? FIG.rowStepPx3d : FIG.rowStepPx) * pxWorld * crowd;
        const push = (dir === 1 ? -side * FIG.lungeIn : dir === -1 ? side * FIG.lungeBack : 0) * kick * hitPower * sc;
        const bs = (FIG.bodyScale[u.body] || 1) * (plan ? plan.crowd : crowd); // n≥3 時 crowd 含這一側的 fit（塞不下才 <1）
        const haunt = u.body === 'haunt';
        // 近景切鏡：非主角的尊退暗＋縮一點；**燒毀中的尊（bt!=null）完全不受影響**——
        // 它的 opacity 沿燒毀曲線走，退暗會把化灰演成一半就變淡、復原又會讓它突然變回實心（凍結檔 P3）。
        // 批 2-a：被打的那一尊閃紅。燒毀中的尊（bt!=null）不閃——它的亮滅歸燒毀曲線管（凍結檔 R2）。
        const hk = bt == null ? hitFlashK(i, u.id, now) : 0;
        if (hk > 0 || f.__hitK) {
          if (typeof f.setHitTint === 'function') { try { f.setHitTint(hk * FIG.hitFlashTint); } catch (err) { /* 一尊壞了不擋整場 */ } }
          f.__hitK = hk;
        }
        const hrim = 1 + FIG.hitFlashRim * hk; // 邊光倍率（與 lunge 那一爆相乘，不互相取代）
        const focusOff = focusK > 0 && bt == null && !focusKeeps(i, u.id);
        const fdim = focusOff ? 1 - (1 - FOCUS.dim) * focusK : 1;
        const fshr = focusOff ? 1 - (1 - FOCUS.shrink) * focusK : 1;
        // 一整排以自己那一欄的中心對稱排開，前後交錯避免完全重疊
        let lane, depth;
        if (plan) {
          const r = plan.rowOf[j], k = plan.idxOf[j], m = plan.sizes[r], st = plan.steps[r];
          // 側向座標＝side×(排中心＋由內往外第 k 尊的偏移)，不再加 offset[i]（排中心已含欄位中心的意圖）
          lane = side * (plan.centers[r] + (k - (m - 1) / 2) * st) - offset[i];
          // 一排時前後交錯用排內位置 k 的奇偶（不是名冊 j：體型排序後相鄰兩尊可能同 j 奇偶而站同一深度，實測 3v3 距離只剩 0.478）
          depth = plan.rows === 1 ? (k % 2 ? 1 : -1) * (is3d ? FIG.rowDepth3d : FIG.rowDepth) : ((plan.rows - 1) / 2 - r) * plan.gap; // 第 0 排最靠鏡頭
        } else {
          lane = n <= 1 ? 0 : (j - (n - 1) / 2) * step;
          depth = n > 1 ? (j % 2 ? 1 : -1) * (is3d ? FIG.rowDepth3d : FIG.rowDepth) : 0;
        }
        let x = offset[i] + lane + push;
        // 撞擊位移不得把人推出桌緣（覆審 H-3：8v8 敗方 power 2.0 時最外那尊 r 到 2.43、腳印外緣 2.94；2v2 也到 2.09）。
        // 所有 n 都夾（第 2 輪 H-3 (a)）：靜態時 n≤2 的站位離上限很遠、夾不到，R-4 的靜態相等仍成立；只在被推出去那幾幀生效。
        // 夾的是徑向距離（含這一排的深度）：橫向上限＝sqrt((rimMax−foot)²−depth²)，與規劃用的是同一條式子
        // 只削「推出去的部分」：永不把人拉到靜態站位以內（n≤2 的靜態站位本來就可能超過這條線，R-4 要它逐項不變）
        { const foot = (f.shadow.geometry.parameters ? f.shadow.geometry.parameters.radius : 0.42) * sc * bs; const rr = Math.max(0, FIG.rimMax - foot); const lim = Math.sqrt(Math.max(0, rr * rr - depth * depth)); const stat = side * (offset[i] + lane); if (side * x > lim && side * x > stat) x = side * Math.max(lim, stat); }
        const grounded = is3d && typeof f.groundFx === 'function' && !!f.groundFx();
        // 有腳下環境（水面）的不上下漂：水面跟著漂會沉到桌面下（實測 groupY 0.112～0.192，桌頂 0.15）
        const bobAmp = grounded ? 0 : (haunt ? FIG.hauntBob : FIG.bobAmp) * sc * bs;
        const bob = Math.sin(now * 0.001 * Math.PI * 2 * FIG.bobHz + j * 1.7 + i * 0.9) * bobAmp;

        f.group.scale.setScalar(sc * bs * fshr);
        f.shadow.scale.setScalar(sc * bs * fshr);
        f.group.position.copy(tmpRight).multiplyScalar(x);
        // 前後交錯只在「一排不只一尊」時才有意義；n===1（＝OFF 的退路）不加，
        // 位置才跟 v0.30 逐項相同。
        if (depth) f.group.position.addScaledVector(tmpFwd, depth);
        // 3D 妖有腳下環境（buoy 的水面）時不再離地飄：水面掛在 group 底下，飄起來就是一灘懸空的水（審查 H-2）；
        // 浮標本身的 min.y 0.04 已經讓它浮在水面上
        // 內建燒毀的上飄：有水面的不飄（水會離桌，覆審 H-2 殘留）；3D 皮的單位是 sc 不是紙紮的 figScale
        f.group.position.y = FIG.footY + bob
          + (haunt && !grounded ? FIG.hauntFloat * (is3d ? FIG.hauntFloat3d : 1) * sc * bs : 0)
          + (grounded ? 0 : bu * FIG.burnRise * sc);
        if (is3d) {
          // 3D 妖面向對手（模型正面＝+Z）：左邊的朝畫面右、右邊的朝畫面左，再往鏡頭轉 faceTurn3d 度
          // 讓臉看得見。被打中的那一方以腳底為樞紐歪出去；不加紙紮那個 lean（四足獸側傾像翻倒）。
          const turn = THREE.MathUtils.degToRad(FIG.faceTurn3d);
          f.group.rotation.set(0, az - side * (Math.PI / 2 - turn), 0);
          if (dir === -1) f.group.rotateZ(THREE.MathUtils.degToRad(side * FIG.lungeSpinDeg * kick * hitPower));
          // 邊光在受擊瞬間爆一下（對 3D 皮 setRim 是倍率）；燒毀的亮滅由工廠的 burn() 自己演
          f.setRim((1 + (dir ? FIG.rimHit3d * kick : 0)) * hrim);
          // GLB 在燒毀開始後才到（st.custom=false 的 3D 皮）：走內建淡出，別讓它全不透明冒出來再消失（覆審 C-2 殘留）
          if (bt != null) setFigureOpacity(f, 1 - bu);
          // 近景切鏡的退暗：3D 皮平常不寫 opacity，所以只在「要退暗」與「退暗過、要收回來」兩種時候寫
          else if (fdim < 1 || f.__focusDim) { setFigureOpacity(f, fdim); f.__focusDim = fdim < 1; }
        } else {
          // billboard 但刻意側身：正對鏡頭時加厚那疊完全被前層擋住，看不出厚度；
          // 轉 faceTurn 度變成 3/4 面，側邊的擠出面才露出來，同時也讀成「面向對手」。
          f.group.rotation.set(0, az + side * THREE.MathUtils.degToRad(FIG.faceTurn), 0);
          // 站姿：往對手側傾；被打中的那一方額外歪出去（樞紐在腳底，看起來才像人被打退）
          const leanDeg = -side * FIG.lean + (dir === -1 ? side * FIG.lungeSpinDeg * kick * hitPower : 0);
          f.group.rotateZ(THREE.MathUtils.degToRad(leanDeg));

          // 作祟本來就半透明；被燒的那一尊再往 0 收；近景切鏡時配角再乘退暗係數（燒毀中的 fdim 恆為 1）
          setFigureOpacity(f, (haunt ? FIG.hauntOpacity : 1) * (1 - bu) * fdim);
          f.__focusDim = fdim < 1;
          // 逆光在受擊瞬間爆一下，讓 bloom 抓得到；燒起來的那一尊逆光先亮再滅
          const rimBase = (FIG.rimOpacity + (dir ? 0.6 * kick : 0)) * (haunt ? FIG.hauntOpacity : 1);
          f.setRim(bt == null ? Math.min(1, rimBase * hrim) : (rimBase + 0.7 * Math.sin(bu * Math.PI)) * (1 - bu));
        }

        f.shadow.position.set(f.group.position.x, 0.152, f.group.position.z);
        f.shadow.visible = !haunt; // 飄浮的影子不落地

        if (!f.group.visible) { f.group.visible = true; }
      }
    }
  }

  /* 給招式演出用的查表（卷 C1 預留給真 3D 模型）：TRAIT_FX 的掛鉤拿到的不只是 DOM 元素，
     還要拿得到 figure 物件本身（才動得了 parts 裡的骨架）。side 收 'A'/'B' 或 0/1。
     出口掛在 window.__yaoshi3d.duelFigures（renderer.js），3D 沒載入時 index.html 那邊查到 null。 */
  const sideIdx = (s) => (s === 'B' || s === 1 ? 1 : 0);
  function figuresOf(s) {
    const i = sideIdx(s);
    return roster[i].map((u, j) => (slots[i][j] ? Object.assign(slots[i][j], { unit: u }) : null)).filter(Boolean);
  }
  function figureOf(s, unitId) {
    const i = sideIdx(s);
    const j = indexOfUnit(i, unitId);
    return j >= 0 && slots[i][j] ? Object.assign(slots[i][j], { unit: roster[i][j] }) : null;
  }
  // 後處理卷「滿編自動收斂」：任一側 ≥ CROWD_N 尊＝擠堆場面，renderer 據此關邊緣偵測、外殼變細
  // （使用者 09-06 裁定：8v8 滿編描邊＋碎線讓畫面顯髒；1v1～3v3 全開）。【試玩必調】
  const CROWD_N = 5;
  return { update, figuresOf, figureOf,
    // 不看 active：對決收掉那一幀 active 先變 false、#duel 還在畫面上，若在這裡翻回 false，
    // 8v8 的最後幾幀邊緣線會閃開一下。roster 到下一場 onDuel 才換，拿它判就穩。
    get crowded() { return Math.max(roster[0].length, roster[1].length) >= CROWD_N; } };
}
