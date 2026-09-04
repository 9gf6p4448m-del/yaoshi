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
};

const NATURAL_H = FIG.headY + FIG.headR; // 人形在 scale=1 時的世界高度（頭頂）
const RIM_COLOR = 0xf0a840; // 燈籠光暈（對齊 assets/theme.css 的 --c-lantern-glow）
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
 */
export function createDuelFigures(scene, camera, opts = {}) {
  const assetsBase = opts.assetsBase || 'assets/characters/';
  const factory = opts.makeFigure || makeLayeredFigure; // 換皮就換這個（見上面的介面說明）
  // 兩邊各一個「紙紮池」：[0]＝畫面左（ys:duel 的 a）、[1]＝畫面右（b）。
  // 依名冊長度慢慢長出來（第一次用到才 new），一場只有一尊時成本與 v0.30 相同。
  const pool = [[], []];
  // 這一場每邊的名冊：[{id, body, fac}]。ys:duel 沒帶 armies（＝PAPERWAR_ON 關）時
  // 退回「每邊一尊」，長相與 v0.30 逐項相同。
  let roster = [[], []];
  // 單位 id → { t0, custom, done }
  //   custom=true 代表這一尊的燒毀由工廠自己的 burn() 在演，本檔不插手它的透明度與位移；
  //   done=true 代表演完了，這一尊收起來不再顯示。
  const burnState = [new Map(), new Map()];
  const indexOfUnit = (i, id) => roster[i].findIndex((u) => u && u.id === id);

  function figureFor(side, j) {
    if (!pool[side][j]) {
      const f = Object.assign(factory(), { applied: '', cloth: '' });
      scene.add(f.group);
      scene.add(f.shadow);
      pool[side][j] = f;
    }
    return pool[side][j];
  }

  let active = false;
  let seats = [null, null];
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
    roster = [0, 1].map((i) => {
      const a = d.armies && d.armies[i] && Array.isArray(d.armies[i].units) ? d.armies[i].units : null;
      return (a && a.length ? a : fallback).slice(0, FIG.maxFigures);
    });
    // 這一場的兩欄還沒重畫完就用上一場的座標，第一格會看到整排站錯位置
    // （實測 scratchpad/s3-01-lineup.png：八尊有一半掉出畫面左緣）。
    // 對齊成功之前一尊都不畫，對齊了才現身。
    aligned = false;
    nextAlign = 0;
    burnState[0].clear();
    burnState[1].clear();
    pool.forEach((side) => side.forEach((f) => { f.applied = ''; f.cloth = ''; f.__op = undefined; }));
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
    const fig = j >= 0 ? pool[i][j] : null;
    const st = { t0: performance.now(), custom: false, done: false };
    burnState[i].set(d.unit, st);
    if (fig && typeof fig.burn === 'function') {
      try {
        const p = Promise.resolve(fig.burn({ ms: Number(d.ms) || FIG.burnMs, body: (roster[i][j] || {}).body }));
        st.custom = true;
        d.handled = true;
        d.done = p.then(() => { st.done = true; }, () => { st.done = true; });
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
    pool.forEach((side) => side.forEach((f) => { f.group.visible = false; f.shadow.visible = false; }));
  }

  document.addEventListener('ys:duel', onDuel);
  document.addEventListener('ys:fx-lunge', onLunge);
  document.addEventListener('ys:fx-burn', onFigBurn);
  document.addEventListener('ys:duel-end', onDuelEnd);

  const tmpRight = new THREE.Vector3();
  const tmpFwd = new THREE.Vector3(); // 「朝鏡頭」的水平向量，用來把整排排出前後深度
  const offset = [-FIG.spread, FIG.spread]; // 兩人離畫面中心的水平距離（世界單位）
  let figScale = 1; // 依視窗高度換算的人形縮放（見 FIG.pixelH）
  let pxWorld = 0.01; // 1 CSS 像素等於多少世界單位（在桌心那個深度上）
  let nextAlign = 0;
  let aligned = false; // 這一場的兩欄座標拿到了沒（拿到之前不畫，見 onDuel 的註解）

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
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist;
    const halfW = halfH * camera.aspect;
    // 1 CSS 像素在桌心那個深度上是多少世界單位 → 換算人形該多大
    pxWorld = (2 * halfH) / h;
    figScale = Math.max(0.25, Math.min(2, (FIG.pixelH * pxWorld) / NATURAL_H));
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
    if (!active) return;
    if (!aligned) { realign(); if (!aligned) return; nextAlign = now + ALIGN_MS; }
    else if (now >= nextAlign) { nextAlign = now + ALIGN_MS; realign(); }
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
      const step = FIG.rowStepPx * pxWorld * crowd;
      const side = i === 0 ? -1 : 1; // 左 −1、右 +1
      const dir = hitDir[i] || 0;
      const push = (dir === 1 ? -side * FIG.lungeIn : dir === -1 ? side * FIG.lungeBack : 0) * kick * hitPower * figScale;

      for (let j = 0; j < Math.max(n, pool[i].length); j++) {
        const u = list[j];
        if (!u) { const old = pool[i][j]; if (old) { old.group.visible = false; old.shadow.visible = false; } continue; }
        const f = figureFor(i, j);

        if (p) {
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

        // 燒掉的那一尊：內建演出＝淡出＋上飄（時長對齊 index.html 的 fxBurn）；
        // 工廠自己有 burn() 時（st.custom）本檔完全不插手，只在它演完後收起來。
        const st = burnState[i].get(u.id);
        if (st && st.done) { f.group.visible = false; f.shadow.visible = false; continue; }
        const bt = st && !st.custom ? st.t0 : null;
        const bu = bt == null ? 0 : Math.min(1, (now - bt) / FIG.burnMs);
        if (bt != null && bu >= 1) { st.done = true; f.group.visible = false; f.shadow.visible = false; continue; }
        if (st && st.custom) continue; // 這一尊的位置／透明度歸工廠的 burn() 管，本檔這一幀不碰

        const bs = (FIG.bodyScale[u.body] || 1) * crowd;
        const haunt = u.body === 'haunt';
        // 一整排以自己那一欄的中心對稱排開，前後交錯避免完全重疊
        const lane = n <= 1 ? 0 : (j - (n - 1) / 2) * step;
        const x = offset[i] + lane + push;
        const bobAmp = (haunt ? FIG.hauntBob : FIG.bobAmp) * figScale * bs;
        const bob = Math.sin(now * 0.001 * Math.PI * 2 * FIG.bobHz + j * 1.7 + i * 0.9) * bobAmp;

        f.group.scale.setScalar(figScale * bs);
        f.shadow.scale.setScalar(figScale * bs);
        f.group.position.copy(tmpRight).multiplyScalar(x);
        // 前後交錯只在「一排不只一尊」時才有意義；n===1（＝OFF 的退路）不加，
        // 位置才跟 v0.30 逐項相同。
        if (n > 1) f.group.position.addScaledVector(tmpFwd, (j % 2 ? 1 : -1) * FIG.rowDepth);
        f.group.position.y = FIG.footY + bob
          + (haunt ? FIG.hauntFloat * figScale * bs : 0)
          + bu * FIG.burnRise * figScale;
        // billboard 但刻意側身：正對鏡頭時加厚那疊完全被前層擋住，看不出厚度；
        // 轉 faceTurn 度變成 3/4 面，側邊的擠出面才露出來，同時也讀成「面向對手」。
        f.group.rotation.set(0, az + side * THREE.MathUtils.degToRad(FIG.faceTurn), 0);
        // 站姿：往對手側傾；被打中的那一方額外歪出去（樞紐在腳底，看起來才像人被打退）
        const leanDeg = -side * FIG.lean + (dir === -1 ? side * FIG.lungeSpinDeg * kick * hitPower : 0);
        f.group.rotateZ(THREE.MathUtils.degToRad(leanDeg));

        // 作祟本來就半透明；被燒的那一尊再往 0 收
        setFigureOpacity(f, (haunt ? FIG.hauntOpacity : 1) * (1 - bu));
        // 逆光在受擊瞬間爆一下，讓 bloom 抓得到；燒起來的那一尊逆光先亮再滅
        const rimBase = (FIG.rimOpacity + (dir ? 0.6 * kick : 0)) * (haunt ? FIG.hauntOpacity : 1);
        f.setRim(bt == null ? rimBase : (rimBase + 0.7 * Math.sin(bu * Math.PI)) * (1 - bu));

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
    return roster[i].map((u, j) => (pool[i][j] ? Object.assign(pool[i][j], { unit: u }) : null)).filter(Boolean);
  }
  function figureOf(s, unitId) {
    const i = sideIdx(s);
    const j = indexOfUnit(i, unitId);
    return j >= 0 && pool[i][j] ? Object.assign(pool[i][j], { unit: roster[i][j] }) : null;
  }
  return { update, figuresOf, figureOf };
}
