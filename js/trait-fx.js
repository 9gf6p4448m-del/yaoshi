// 妖市 3D 環境層 — 《紙紮夜戰》招式演出的舞台（卷 C3，2026-09-05）
//
// 職責：index.html 的三拍時間軸對每筆 {kind:"trait"} 事件派 `ys:fx-trait`，本檔接住、
// 依 trId 找到那一套手寫編舞（js/trait-fx/{zuling,xianghuo,yinqi}.js，27 套各自獨立），
// 把「舞台」交給它演 det.ms 毫秒，演完把所有骨骼／model／邊光還原、自訂 mesh 拆掉。
// 找不到編舞、3D 妖沒就位、編舞炸掉 → det.handled 維持 false，index.html 退回通用 fallback。
//
// 與 duel-figures.js 的分工（它每幀覆寫 group 的位置／旋轉／縮放與 setRim，所以這裡一律不碰 group）：
//   骨骼      mixer 之後疊一層 delta（bone.quaternion = mixer 的值 × delta），下一幀 mixer 之前先還原
//             （包裝 figure.update：restore → mixer.update → capture；apply 在 renderer 的主迴圈裡、
//             duelFigures.update 之後）。沒被 clip 驅動的骨骼靠 restore 才不會逐幀累加。
//   model     group.children[0]（工廠正規化過的模型）：位置／旋轉／縮放都以「開演時的值」為基準加 delta，
//             group 空間的 +Z 是模型正面＝朝對手（再往鏡頭轉 35°），stage.toward(fig) 給精確方向。
//   邊光      包裝 figure.setRim：duel-figures 每幀給的值再乘 stage.rim() 設的倍率。
//   mesh      自訂幾何（陣、環、光球、閃電）全部掛在 scene 根、由本檔記帳與 dispose；
//             材質只有兩支模板（加色 mesh／加色 line），clone 出來的共用同一支 program（審查 M-3 的教訓）。
//
// 保險絲：演出最長 ms×TFX.fuseMul，到了強制清場並 resolve；SKIP（ys:fx-trait-cancel）與 ys:duel-end
// 立刻清場。prefers-reduced-motion：骨骼／model 位移全免，只留光、粒子與 mesh 的淡入淡出。
//
// 邊界：不讀寫任何遊戲狀態、不耗 S.rng（粒子與閃電的抖動用自帶 LCG，種子＝遞增計數）。
import * as THREE from 'three';

const V = new URL(import.meta.url).search;
const { createImpactBurst, SPARK_COLOR } = await import('./particles.js' + V);
// v0.55 招式可辨性卷：特效語彙與法寶徽記的【單一事實來源】。
// 這兩支是 27 支招共用的地基，**不做 catch 退路**——載不到就讓本模組整個爆，
// 給預設色票／預設形狀等於讓「每一卷重新發明一次語彙」那個分岔重新長回來（ART_BIBLE §10 開頭）。
const { FX_PAL, beatOf, ICON, PHASE_GATE, EMBLEM_OF } = await import('./trait-fx/vocab.js' + V);
const EMBLEMS = await import('./trait-fx/emblems.js' + V);
// 一個系別檔壞掉（語法錯／404）只丟那一系的招（退回 fallback），不得拖垮本模組→renderer.js→整個 3D 層
const loadMoves = (file) => import(file + V).then(
  (m) => ({ full: m.default || m.MOVES || {}, short: m.SHORT || {}, v054: m.V054 || {}, v054Short: m.V054_SHORT || {}, v055: m.V055 || {}, v055Short: m.V055_SHORT || {} }),
  () => ({ full: {}, short: {}, v054: {}, v054Short: {}, v055: {}, v055Short: {} }));
const [ZULING, XIANGHUO, YINQI] = await Promise.all([
  loadMoves('./trait-fx/zuling.js'),
  loadMoves('./trait-fx/xianghuo.js'),
  loadMoves('./trait-fx/yinqi.js'),
]);

/* ★v0.55.1 招式語彙開關（VOCAB_ON）★
   開關的【唯一來源】是 index.html 的 `PW_FX.VOCAB_ON`（預設 false）。3D 層看不到 PW_FX
   （它是 classic script 的 const），所以 index.html 把值接在 renderer.js 的模組查詢字串上
   （`js/renderer.js?v=<VERSION>&fxvocab=0|1`），而查詢字串由各模組用 import.meta.url 接力傳下來
   ——也就是本檔的 `V`。治具頁（tests/tools/traitfx-preview.html）是直接 import 本檔、`V` 是空的，
   那種情形才退到該頁自己的 `location.search`（治具用 `?fxvocab=1` 打開）。
   兩條路都取不到就是 false＝0.54 演出，與正式頁的預設一致。 */
const VOCAB_ON = (() => {
  try {
    const src = V || (typeof location !== 'undefined' ? (location.search || '') : '');
    return new URLSearchParams(src).get('fxvocab') === '1';
  } catch (e) { return false; }
})();

/** `_v054`／`_v055`（＋`short`）後綴只是為了讓同一支 trId 的兩三份演出並存在同一個檔裡
 *  （也讓 fn-hash 切成不同區塊）；登記時剝掉後綴換回 trId。
 *  **分派只在這裡做一次**，那幾支招的函式本體裡一個開關判斷都沒有。 */
const byTrId = (tbl) => Object.fromEntries(Object.keys(tbl).map((k) => [k.replace(/_v05[45](short)?$/, ''), tbl[k]]));
/* 三張表怎麼疊（2026-09-12 招式演出卷批 1 起）：
     MOVES／SHORT            27 支的**正式**演出。批 1 之後 biteGamble 住在這裡（E 轉正）。
     V054／V054_SHORT        VOCAB_ON=false 時覆蓋——0.55 徽記剪影版被製作人否掉之後「先退回 0.54」的退路，
                             剩三支示範招（eliteSelfCut／wardImmuneLost／hauntLost）；
                             轉正一支就從這裡移除一支（虎爺印已移除，0.54 版見 git show 6a839de）。
     V055／V055_SHORT        VOCAB_ON=true（?fxvocab=1）時覆蓋——徽記剪影版，留給治具與 L3 canary。
   所以預設路徑（線上）＝正式演出＋還沒轉正那幾支的 0.54 退路；`?fxvocab=1` ＝正式演出＋徽記版對照組。 */
const V054_FULL = VOCAB_ON ? {} : byTrId(Object.assign({}, ZULING.v054, XIANGHUO.v054, YINQI.v054));
const V054_SHORT = VOCAB_ON ? {} : byTrId(Object.assign({}, ZULING.v054Short, XIANGHUO.v054Short, YINQI.v054Short));
const V055_FULL = VOCAB_ON ? byTrId(Object.assign({}, ZULING.v055, XIANGHUO.v055, YINQI.v055)) : {};
const V055_SHORT = VOCAB_ON ? byTrId(Object.assign({}, ZULING.v055Short, XIANGHUO.v055Short, YINQI.v055Short)) : {};

/** trId → 編舞函式(stage)。三個系別檔各自導出自己那一系的招；鍵名＝index.html TRAITS 的 id。 */
export const TRAIT_MOVES = Object.assign(Object.create(null), ZULING.full, XIANGHUO.full, YINQI.full, V054_FULL, V055_FULL);
/** trId → tier 1 的 260ms 短版編舞（v0.54）。三個系別檔各 export const SHORT；三尊三招沒有短版（恆 tier 3）。
 *  缺席時 start() 退回完整版——那不是恆綠退路：完整版塞不進 260ms 會 stats.cut++，治具的 clean 立刻紅。 */
export const TRAIT_MOVES_SHORT = Object.assign(Object.create(null), ZULING.short, XIANGHUO.short, YINQI.short, V054_SHORT, V055_SHORT);
/** 這一次載入跑的是哪一版（治具／診斷用；遊戲一行都不讀它）。 */
export const FX_VOCAB_ON = VOCAB_ON;

/* ★虎爺印原型卷（2026-09-12）★：`?proto=tigerA|tigerB|tigerC` 把 biteGamble 換成三個候選原型之一。
   **不帶參數＝現況，一個位元組都不變**（下面的 if 整段不執行）。原型檔獨立在 js/trait-fx/proto/，
   載不到就維持現況（原型是給製作人挑的實驗品，不得有能力弄壞正式演出）。
   登記點放這裡而不是 xianghuo.js：那支檔是 27 支正式招的落點，實驗品混進去下一卷就分不出誰是正式版。 */
const FX_PROTO = (() => { try { return new URLSearchParams(location.search).get('proto') || ''; } catch (e) { return ''; } })();
if (/^tiger[ABCDE]$/.test(FX_PROTO)) {
  const P = await import('./trait-fx/proto/tiger.js' + V).then((m) => m.PROTOS, () => null);
  if (P && typeof P[FX_PROTO] === 'function') { TRAIT_MOVES.biteGamble = P[FX_PROTO]; TRAIT_MOVES_SHORT.biteGamble = P[FX_PROTO]; }
}

// 全部【試玩必調】
export const TFX = {
  fuseMul: 2, // 保險絲：演出最長 ms×fuseMul
  // ★下面三個常數（endMargin／atReserve／flinchMs）在 v0.54 起隨 run.k＝run.ms/det.baseMs 等比縮放★
  // 理由（凍結檔「Tier 1 短版」）：它們是絕對毫秒，260ms 的短版若還用 900ms 的預留額度，
  // atReserve 一個 st.at 就吃掉 62% 的預算、horizon 被推爆 → rate 被迫 >1（＝靠加速硬擠，F2 的 rateOK 紅）。
  // 基準值**不寫在這裡**：它由事件帶（detail.baseMs ＝ index.html 的 PW_FX.TIER_BASE_MS），
  // 在這裡放一份 900 就又是第二份事實來源了（F1 掃分母時會抓到）。
  endMargin: 60, // 虛擬時間要在牆鐘收工前這麼多 ms 就抵達 horizon（覆審第 3 輪 H-1：壓線抵達會讓 horizon 上的 timer 在收工幀才燒）
  atReserve: 160, // st.at 為回呼裡即將排的 tween 預留的虛擬額度（ms）
  rateMax: 2.2, // 加速倍率天花板（實測滿編 1.50×、dt 夾 0.1s 時 1.64×）
  flinchMs: 240, // 受招輕反應：退縮多久
  flinchDist: 0.14, // 退縮多遠（group 空間，×該尊的 scale 由呼叫端決定）
  flinchRim: 1.8, // 退縮時邊光倍率
  tableY: 0.152, // 桌面頂（duel-figures 的影子高度），地面陣一律貼這裡
  burstPool: 260, // 招式專用的火星池（不跟命中噴發搶）
  focusK: 0.6, // 出招側打光：戲台燈組往出招方質心移這個比例（質心約 1.15 → 位移約 0.69）
  focusLerp: 24, // 燈組位移的收斂速率（/秒）：150ms 內到 97%
};

// 強 ease（emil-design-eng：內建曲線太弱）。全部 t∈[0,1] → 值。
const out3 = (t) => 1 - Math.pow(1 - t, 3);
export const EASE = {
  linear: (t) => t,
  out: out3, // ≈ cubic-bezier(0.23,1,0.32,1)
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inout: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), // ≈ cubic-bezier(0.77,0,0.175,1)
  in: (t) => t * t * t,
  /** 回位帶一點過衝（back-out） */
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  /** 出手：前 30% 反向後拉（到 −0.18），之後 ease-out 衝到 1 */
  strike: (t) => (t < 0.3 ? -0.18 * Math.sin((t / 0.3) * Math.PI) : out3((t - 0.3) / 0.7)),
  /** 去而復返：0→1→0 的正弦半波 */
  pulse: (t) => Math.sin(Math.PI * t),
  /** 去快回慢：25% 到頂，之後 ease-out 回 0 */
  snap: (t) => (t < 0.25 ? out3(t / 0.25) : 1 - out3((t - 0.25) / 0.75)),
  /** 去慢回快：75% 到頂（醞釀），之後急收 */
  wind: (t) => (t < 0.75 ? out3(t / 0.75) : 1 - out3((t - 0.75) / 0.25)),
};

const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();

function makeLcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/* ── 紙紮道具的兩個共用零件（st.paperStamp 與 st.paperProps 都用；ART_BIBLE §10.2 的紙紮規範）── */
/** 把 emblems.js 的扁平座標陣列（x0,y0,x1,y1,…）轉成 Vector2[]。 */
function paperPts(arr) { const p = []; for (let i = 0; i < arr.length; i += 2) p.push(new THREE.Vector2(arr[i], arr[i + 1])); return p; }
/** 紙的翹曲：頂點依 x²／y 微幅推 z。**同一條曲線要套在同一件道具的每一片上**（本體、面板、字），
 *  兩片才貼得住——這也是它必須是共用函式而不是各寫一份的理由。 */
function paperBow(g, warp) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + warp * (p.getX(i) * p.getX(i) * 0.8 - 0.28 + p.getY(i) * 0.10));
  p.needsUpdate = true;
}
/** 該 kind 的外框（＋內孔）→ THREE.Shape。emblems.js 的頂點表是**唯一來源**（Q10：頂點表保留、平面用法廢掉）。 */
function paperShape(EMB, kind, who) {
  const spec = EMB[kind];
  if (!spec) throw new Error(`${who}: 沒有 kind="${kind}"（合法值見 js/trait-fx/vocab.js 的 EMBLEM_OF）`);
  const flat = Array.isArray(spec) ? spec : spec.o;
  const shape = new THREE.Shape(paperPts(flat));
  if (!Array.isArray(spec) && spec.h) shape.holes.push(new THREE.Path(paperPts(spec.h)));
  return shape;
}

function prefersReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/**
 * @param scene / camera   renderer.js 的那一組
 * @param duelFigures      createDuelFigures 的回傳（要 figuresOf(side)）
 * @param opts.renderer    有給就預熱兩支材質 program（第一場對決前編掉）
 * @param opts.rig         戲台燈組（createFigureLightRig 的 Group）：招式期間往出招方移（演出可讀性小卷 C-2）
 */
export function createTraitFx(scene, camera, duelFigures, opts = {}) {
  const burst = createImpactBurst(TFX.burstPool);
  scene.add(burst.points);
  const rig = opts.rig || null;
  const rigBase = rig ? rig.position.clone() : null;
  let rigGoal = null; // 目前想把燈組移去哪（有招在演時）

  // 材質模板：clone 出來的 program cache key 相同，27 套怎麼用都只有這兩支 shader
  const MAT_GLOW = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  const MAT_LINE = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
  /* ★v0.55 第三支模板：非加色的實心材質★（凍結檔 Q10）
     盲讀「顏色分不出、全是白的」的機制成因：加色混合的東西一旦亮度越過 bloom 門檻（js/bloom.js:175
     threshold 0.55、strength 1.15）就往白色去，**系色在畫面上根本活不下來**。徽記本體因此走 NormalBlending。
     解法是換材質與換形狀，不是調 bloom 或 EXPOSURE（ART_BIBLE §8 明寫那兩個一動整張牌桌要重驗）。
     注意：blending／opacity／color 都是 render state 與 uniform，**不進 program cacheKey**，
     所以這支的 shader program 與 MAT_GLOW 共用——材質模板是 3 支，program 數不增。
     ★這句以前是從 three 的 cacheKey 規則推出來的，不是量出來的（覆審 r1 M3）★：
     下面的 `matPrograms()` 回報三支模板**實際拿到的 program id**（renderer.properties 的 currentProgram），
     `matTemplates` 也改成數陣列長度而不是寫死 3。凍結檔 Q10 寫「program 2→3」，實測值以 matPrograms() 為準。 */
  const MAT_SOLID = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.NormalBlending, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: false, toneMapped: false });
  /** 三支材質模板的清單——`matTemplates` 與 `matPrograms()` 都數這一份，不另寫數字。 */
  const MAT_TEMPLATES = [['MAT_GLOW', MAT_GLOW], ['MAT_LINE', MAT_LINE], ['MAT_SOLID', MAT_SOLID]];
  /* ★徽記尺寸的收斂閘（覆審 r2 N1／N7）★
     危險效果＝「徽記的實際世界尺寸出現第二份來源」。`o.size` 是其中一條路，所以三支入口
     （st.icon／st.icons／st.mark）**一律拒收**：傳了就 throw，而不是靜默沿用。
     ——不寫成「忽略 o.size」是因為靜默忽略會讓編舞以為自己調到了尺寸，下一卷又長回來；
     throw 才會在 traitfx-drive／duel-drive 的 handled=false 上當場現形（L9 零錯會抓）。
     另一條路（直接對 mesh 的 scale 寫值）由下面的 lockIconScale 在**執行期**鎖死（覆審 r3 N11）。 */
  function iconSizeSrc(who, kind, o, size) {
    if (o && 'size' in o) {
      throw new Error(`${who} 不接受 o.size（徽記尺寸的唯一來源是 js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind；`
        + `要改 ${kind} 的尺寸就改那張表，編舞要放大縮小請用 st.iconScale(mesh, 相對倍率)）`);
    }
    return size;
  }
  /* ══ ★徽記世界尺寸的單一來源：鎖 ＋ 稽核（r3 N11 → ★r4 HIGH-1 修補批★）★ ══════════════
     危險的**效果**＝「徽記在**世界空間**的實際尺寸，來自 ICON 表以外的第二份來源」。

     ★r3 那一版錯在哪（覆審 r4 實測，四條繞法三道防線全綠）★
     r3 只鎖了 `Object3D.scale` 那顆 Vector3，然後宣稱「分母歸一、涵蓋自然 100%」。
     但世界尺寸不只由 `obj.scale` 決定，覆審員實測繞得過的有四條：
       A 把徽記 add 進一個縮放過的父 Group（世界寬 0.5186 → 0.0353）
       B 置換 `geometry`（→ 0.0185）
       C `matrixAutoUpdate = false` ＋ 自己寫 `obj.matrix`（→ 0.0259）
       E `Object.defineProperty` 把被鎖的 accessor 蓋掉（r3 寫了 `configurable: true`）
     其中 C 的變形 F（每幀 `matrix.compose(…, new Vector3(0.52))`）讓尺寸與 ICON 表**完全脫鉤**，
     L3 canary（`_resolve()=>0.02`）之下 `area_pct 1.0132／ok:true` ——恆綠儀式原樣復現。

     ★本批的修法：兩層★
     ① **鎖（按入口收斂，防止效果發生）**——凡是會改變世界尺寸的**屬性**一律鎖成
        accessor 或不可寫、不可再定義（`configurable: false`），寫了就記帳＋throw：
          `obj.scale` 這個屬性本身、它的 `x`／`y`／`z`、`geometry`、
          `matrixAutoUpdate`、`matrixWorldAutoUpdate`、`userData.fxIconBase`／`fxIconKind`。
        `configurable: false` 讓 E 那條（`Object.defineProperty` 蓋回去）直接 TypeError。
     ② **稽核（按效果寫，抓沒想到的第 N 條）**——`auditSizes()` 每一幀對每個登記過的物件量
        **世界尺寸**本身，和「積木自己最後一次合法寫進去的值」比對：
          `updateWorldMatrix(true, true)` → `matrixWorld.decompose()` 取世界縮放，
          再乘上**當下這顆 geometry** 的單位寬度＝世界寬度；
          期望值＝祖先鏈上每個登記物件的 `want` 連乘（未登記的祖先縮放必須是 1）。
        A（父層縮放）、B（換 geometry）、C／F（自寫 matrix）、以及任何還沒被想到的路
        都會讓「量到的世界尺寸 ≠ 積木寫進去的值」⇒ 判紅。
        InstancedMesh 另外逐 instance 解出縮放，對 `fxIcons.size × 相對倍率` 比對
        （`im.setMatrixAt()` 那條路，覆審 r4 §4.5 列為未確認的疑慮，本批一併收掉）。
        ★為什麼判定不用 `Box3.setFromObject` 的 x 跨距★：徽記是逐幀朝鏡頭的 billboard，
        旋轉中的物件其**世界 AABB** 的跨距隨朝向變（同一個尺寸能差到 √2 倍），要用它判就得
        放寬到鬆得能放行 0.93 倍的繞法——那正是要防的那種鬆。所以判定用**旋轉無關**的
        「世界縮放 × geometry 單位寬」，`Box3.setFromObject` 的對角線只當診斷欄一起記。

     ★合法的動畫★：四支示範招都有呼吸縮放。唯一入口是 `st.iconScale(mesh, k)`，
     算的是 `mesh.userData.fxIconBase × k`（ICON 的值永遠在乘積裡），
     且 `k` 必須落在 `ICON.scaleRange`——否則 `st.iconScale(m, 0.02 / base)` 就是絕對尺寸的後門。

     ★記帳為什麼必要★：run 的 tween 迴圈對 update 是 `try/catch`（一段壞了不擋整招），
     光 throw 會被吃掉、`pageerror` 也看不到。`stats.sizeViolations` 讓
     `traitfx-drive`／`duel-drive`／`fx-contrast` 三支治具都看得見（那是執行期斷言）。
     稽核那一層**只記帳不 throw**（它跑在引擎主迴圈裡，throw 會拖垮整個 3D 層）。

     ★活性★：`iconMade`（產出的徽記物件數）＝`iconLocked`（真的鎖上的數），
     且 `made > 0` 時 `sizeAudits > 0`（稽核真的跑過）。治具端逐套判三態，見 traitfx-drive。 */
  const SIZED = new WeakMap(); // obj → {kind, base, want, geom, flat, sizes}
  let scaleUnlocked = false;
  function sizeViolation(msg) {
    stats.sizeViolations++;
    if (!stats.sizeViolationMsg) stats.sizeViolationMsg = msg;
    return msg;
  }
  /** 只有這支能寫徽記的 scale（積木內部用；編舞碰不到它） */
  function setLockedScale(obj, v) {
    scaleUnlocked = true;
    try { obj.scale.setScalar(v); } finally { scaleUnlocked = false; }
    const rec = SIZED.get(obj);
    if (rec) rec.want = v;
  }
  const NOOP = function () {};
  /* ★已知屬於徽記的 geometry「內容指紋」★（r2 M1 的抓手；★r3 N-1 由 uuid 改成指紋★）
     r2 那一版收的是登記當下那顆 geometry 的 `uuid`，所以 helper 裡一個
     `new THREE.Mesh(o.geometry.clone(), …)` 就整組穿過去——clone 出來的是新 uuid、對不上，
     那顆手造徽記不在 SIZED、不上鎖、不被稽核，實測 L3 canary 由 `pass 0` 翻成 `pass 1`
     （面積 0.9728 → 7.2327，canary 下 6.3194／ok:true）＝恆綠儀式復現。
     改成按**內容**認：`geomSig`（頂點數＋座標校驗和）＋單位寬，clone 出來的兩者都一樣。
     `GEOM_COUNTS` 是便宜的前置過濾（先比頂點陣列長度，對不上就不算指紋），
     免得每次 scene.traverse 都對全場每顆 mesh 算一遍校驗和。 */
  const GEOM_SIGS = new Set();
  const GEOM_COUNTS = new Set();
  /* 積木自己造的、**不在尺寸鎖涵蓋內**但確實會用到徽記輪廓的 mesh
     （`st.paperStamp` 的三片＋`st.paperProps` 的 InstancedMesh；2026-09-13 演出卷加入後者）。
     它們不是「手造的第二顆徽記」，所以場景掃描要放行；放行名單是模組私有的 WeakSet，
     編舞碰不到它，也就加不進來。★這兩支都不在尺寸鎖裡，列在 README 的已知未涵蓋★。 */
  const BLOCK_MADE = new WeakSet();
  /** geometry 的內容指紋（頂點數＋座標校驗和）；r2 M2：只驗身分擋不住就地改內容 */
  function geomSig(geom) {
    if (!geom || !geom.attributes || !geom.attributes.position) return null;
    const a = geom.attributes.position.array;
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum = (sum * 31 + a[i]) % 1e12;
    return a.length + ':' + sum.toFixed(6);
  }
  /** 這顆 geometry 在 scale=1 時的寬度（x 跨距）——世界寬度＝世界縮放 × 這個值 */
  function unitWidthOf(geom) {
    if (!geom) return 0;
    if (!geom.boundingBox) { try { geom.computeBoundingBox(); } catch (e) { return 0; } }
    const b = geom.boundingBox;
    return b ? b.max.x - b.min.x : 0;
  }
  /** 把會改變世界尺寸的屬性全部鎖起來，並登記進稽核名單 */
  function lockIconScale(run, obj, base, kind, geom, host) {
    if (SIZED.has(obj)) return obj;
    const vec = obj.scale;
    let x = vec.x, y = vec.y, z = vec.z;
    const bad = (what, val) => {
      throw new Error(sizeViolation(`徽記 ${kind} 的 ${what} 被直接寫成 ${val}：徽記的世界尺寸只有一份來源`
        + '（js/trait-fx/vocab.js 的 ICON.byKind／flatByKind／markByKind）。'
        + '要做呼吸縮放請用 st.iconScale(mesh, 相對倍率)，要改這個 kind 的尺寸請改那張表。'));
    };
    const ax = (axis, get, set) => ({
      configurable: false, // ★r4 E：configurable:true 時 Object.defineProperty 蓋得掉這層鎖★
      enumerable: true,
      get,
      set(val) { if (!scaleUnlocked) bad('scale.' + axis, val); set(val); },
    });
    Object.defineProperties(vec, {
      x: ax('x', () => x, (v) => { x = v; }),
      y: ax('y', () => y, (v) => { y = v; }),
      z: ax('z', () => z, (v) => { z = v; }),
    });
    // 整顆 Vector3 被換掉也是一條路（`Object.defineProperty(obj,'scale',{value:new Vector3(0.02)})`）
    Object.defineProperty(obj, 'scale', { value: vec, writable: false, configurable: false, enumerable: true });
    // r4 B：置換 geometry ⇒ 同一個 scale 下世界尺寸整個換掉（accessor 而不是 writable:false，
    // 是為了讓違規**說得出自己是哪一條**：writable:false 丟的 TypeError 不帶語意）
    if (geom) {
      Object.defineProperty(obj, 'geometry', {
        configurable: false, enumerable: true,
        get() { return geom; },
        set(v) { if (v !== geom) bad('geometry', v && v.type); },
      });
    }
    // r4 C／F：關掉 matrixAutoUpdate 之後自己寫 matrix／matrixWorld
    const flag = (name) => Object.defineProperty(obj, name, {
      configurable: false, enumerable: true,
      get() { return true; },
      set(v) { if (v !== true) bad(name, v); },
    });
    flag('matrixAutoUpdate');
    if ('matrixWorldAutoUpdate' in obj) flag('matrixWorldAutoUpdate');
    /* ★r2 H1：`onBeforeRender` 與 `onAfterRender` 是「在稽核之後、送去畫之前」的最後兩個鉤子★
       three 的 renderObject 是：`onBeforeRender()` → `modelViewMatrix = camera.matrixWorldInverse × matrixWorld`
       → draw → `onAfterRender()`。所以在 `onBeforeRender` 裡改 `matrixWorld`，畫出來的是改過的、
       而 `traitFx.update` 末那一輪稽核量到的是沒改過的——覆審 r2 實測 L3 canary `ok:true`（恆綠儀式復現）。
       兩件事一起做：① 這兩個鉤子鎖成 accessor（寫了就記帳＋throw）；
       ② `onAfterRender` 的 getter 回傳**積木自己的稽核**——那是「剛剛送進 GPU 的那顆矩陣」的量測位置，
       不論是誰、在哪一個鉤子裡動了 matrixWorld，都會被這一次量到。 */
    Object.defineProperty(obj, 'onBeforeRender', {
      configurable: false, enumerable: true,
      get() { return NOOP; },
      set(v) { if (v !== NOOP) bad('onBeforeRender', v && (v.name || 'fn')); },
    });
    Object.defineProperty(obj, 'onAfterRender', {
      configurable: false, enumerable: true,
      get() { return auditAtDraw; },
      set(v) { if (v !== auditAtDraw) bad('onAfterRender', v && (v.name || 'fn')); },
    });
    // 基準與 kind 唯讀：否則「改掉 fxIconBase 再呼叫 st.iconScale」就是新的第二份來源
    Object.defineProperty(obj.userData, 'fxIconBase', { value: base, writable: false, configurable: false, enumerable: true });
    Object.defineProperty(obj.userData, 'fxIconKind', { value: kind, writable: false, configurable: false, enumerable: true });
    const rec = { obj, kind, base, want: vec.x, geom: geom || null, unitW: unitWidthOf(geom),
      instanced: !!obj.isInstancedMesh,
      /* r2 M3：`host` 是「這一片合法掛在誰底下」。只有 `st.icon` 自己造的底板／描邊子節點有 host；
         其餘徽記的父節點必須是**沒登記過的、縮放為 1** 的節點（實務上就是 scene）。
         沒有這一欄時，「把徽記 add 到另一顆徽記底下」會被當成合法連乘（實測 0.56 → 0.31357）。 */
      host: host || null,
      /* r2 M2：稽核原本只驗 geometry 的**身分**（uuid 相同），不驗**內容**。
         `geometry.scale(k,k,k)` 就地改共用剪影（emblems.js 是一個 kind 建一次、全場共用），
         身分沒變、`rec.unitW` 又是建立時的快取 ⇒ 四道防線全綠、面積 0.9728→1.0284。
         這裡把頂點數與座標校驗和凍住，稽核逐次比對。 */
      geomSig: geomSig(geom) };
    SIZED.set(obj, rec);
    if (rec.geomSig !== null) { GEOM_SIGS.add(rec.geomSig); GEOM_COUNTS.add(geom.attributes.position.array.length); }
    run.sized.push(rec);
    stats.iconLocked++;
    return obj;
  }
  const _ap = new THREE.Vector3();
  const _aq = new THREE.Quaternion();
  const _as = new THREE.Vector3();
  const _abox = new THREE.Box3();
  const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
  /** 祖先鏈上的期望世界縮放。
   *  規則（r4 A ＋ **r2 M3**）：**唯一允許的登記祖先，是這一片自己的 `host`**
   *  （`st.icon` 建的本體，底板／描邊掛在它底下）；其餘祖先一律不得是徽記、且縮放必須是 1。
   *  舊版把「任何登記過的祖先」的 want 乘進期望值 ⇒ 把徽記 add 到另一顆徽記底下時，
   *  世界縮放變成兩個表值的乘積（實測 0.56×0.56＝0.31357，三張表裡沒有這個數）而稽核照樣對得上。 */
  function expectedWorldScale(rec) {
    let k = rec.want;
    let n = rec.obj.parent;
    if (rec.host) {
      if (n !== rec.host) {
        sizeViolation(`徽記 ${rec.kind} 的子片被搬離它的本體（父節點不是建立時的 host）：`
          + '底板／描邊只能掛在自己那一片徽記底下（覆審 r2 M3）。');
        return null;
      }
      const hr = SIZED.get(n);
      k *= hr ? hr.want : 1;
      n = n.parent;
    }
    for (; n; n = n.parent) {
      if (SIZED.has(n)) {
        sizeViolation(`徽記 ${rec.kind} 掛在另一個徽記（${SIZED.get(n).kind}）底下：`
          + '世界尺寸會變成兩個表值的乘積，那個數字不在 ICON 的任何一張表裡（覆審 r2 M3）。');
        return null;
      }
      if (!near(n.scale.x, 1) || !near(n.scale.y, 1) || !near(n.scale.z, 1)) {
        sizeViolation(`徽記 ${rec.kind} 掛在一個被縮放過的父節點底下（${n.type} scale=${n.scale.x}）：`
          + '徽記的世界尺寸必須只由 ICON 表決定，不得靠父層縮放（覆審 r4 繞法 A）。');
        return null;
      }
    }
    return k;
  }
  /** ★按效果寫的那一道★：量一個登記物件的**世界尺寸**，和積木寫進去的值比對。
   *  `where` 只進診斷欄：'update'＝traitFx.update 末（frame 內），'draw'＝onAfterRender（剛送進 GPU）。 */
  function auditOne(rec, where) {
    const o = rec.obj;
    if (!o.parent) return; // 已經清場
    stats.sizeAudits++;
    if (where === 'draw') stats.auditsDraw++; else stats.auditsUpdate++;
    // ① geometry 身分（鎖住了，這裡再量一次；換了就算鎖被繞過也抓得到）
    if (rec.geom && o.geometry !== rec.geom) {
      sizeViolation(`徽記 ${rec.kind} 的 geometry 被換掉了（覆審 r4 繞法 B）：世界尺寸＝縮放 × geometry 單位寬，`
        + '換 geometry 等於換尺寸，來源必須是 emblems.js 的共用幾何。');
      return;
    }
    /* ①b **geometry 的內容**（r2 M2）：身分相同不代表形狀相同。
       `geometry.scale(k,k,k)` 就地改的是 emblems.js 那份**全場共用**的剪影，
       身分沒變、`rec.unitW` 又是建立時的快取 ⇒ 舊版四道防線全綠、面積 0.9728→1.0284。 */
    if (rec.geomSig !== null) {
      const live = unitWidthOf(o.geometry);
      if (!near(live, rec.unitW) || geomSig(o.geometry) !== rec.geomSig) {
        sizeViolation(`徽記 ${rec.kind} 的 geometry **內容**被就地改過（單位寬 ${rec.unitW.toFixed(6)} → ${live.toFixed(6)}）：`
          + 'emblems.js 的剪影是一個 kind 建一次、全場共用，改它等於改所有同 kind 徽記的尺寸（覆審 r2 M2）。');
        return;
      }
    }
    const want = expectedWorldScale(rec);
    if (want === null) return;
    o.matrixWorld.decompose(_ap, _aq, _as);
    // ② 世界縮放必須等於積木自己最後一次合法寫進去的值（含祖先鏈）
    if (!near(_as.x, want) || !near(_as.y, want) || !near(_as.z, want)) {
      sizeViolation(`徽記 ${rec.kind} 的**世界**縮放是 ${_as.x.toFixed(6)}，積木寫進去的是 ${want.toFixed(6)}`
        + `（量測位置 ${where}；差值來自 ICON 表以外的第二份來源——自寫 matrix／matrixWorld／父層縮放／`
        + '繞過鎖的寫入，覆審 r4 繞法 A／C／F、r2 H1）。');
      return;
    }
    // ③ 逐 instance（st.icons 的 InstancedMesh；im.setMatrixAt 與 o.sizes 那兩條路）
    if (rec.instanced) auditInstances(rec, want);
    /* ④ 診斷欄：世界寬度（旋轉無關）與 Box3 對角線。
       ★InstancedMesh 的物件縮放恆為 1（尺寸在實例矩陣裡）★，所以它報的是
       `fxIcons.size × 逐實例倍率的極值 × geometry 單位寬`——不然那一欄會永遠印 1×unitW。 */
    let k = _as.x;
    if (rec.instanced && o.userData.fxIcons) {
      const d = o.userData.fxIcons;
      let mx = d.scale === undefined ? 1 : d.scale;
      if (d.sizes) for (let i = 0; i < d.sizes.length; i++) mx = Math.max(mx, d.sizes[i]);
      k = _as.x * d.size * mx;
    }
    const w = k * (rec.unitW || unitWidthOf(o.geometry));
    const r = stats.sizeWorldRange[rec.kind] || (stats.sizeWorldRange[rec.kind] = [w, w]);
    if (w < r[0]) r[0] = +w.toFixed(6);
    if (w > r[1]) r[1] = +w.toFixed(6);
    if (stats.sizeAudits % 37 === 1) { // Box3 只抽樣記錄（診斷用，不進判定）
      _abox.setFromObject(o);
      stats.sizeBoxDiag[rec.kind] = +_abox.getSize(_ap).length().toFixed(6);
    }
  }
  /* ★r2 H1 的量測位置★：three 的 renderObject 順序是
       onBeforeRender() → modelViewMatrix = camera.matrixWorldInverse × matrixWorld → draw → onAfterRender()
     所以 `onAfterRender` 裡的 `this.matrixWorld` **就是剛剛送進 GPU 的那一顆**。
     任何發生在「traitFx.update 之後、draw 之前」的改動（`onBeforeRender` 鉤子、別人的鉤子、
     render 內的 updateMatrixWorld 重算）都逃不過這一次量測。
     這支**只記帳不 throw**：它跑在 renderer 的迴圈裡，throw 會拖垮整個 3D 層。 */
  function auditAtDraw() {
    const rec = SIZED.get(this);
    if (rec) auditOne(rec, 'draw');
  }
  /** update 末的那一輪（frame 內）＋ 場景掃描 */
  function auditSizes(run) {
    for (let i = 0; i < run.sized.length; i++) {
      const rec = run.sized[i];
      if (rec.obj.parent) rec.obj.updateWorldMatrix(true, true);
      auditOne(rec, 'update');
    }
    /* ★r2 M1：稽核原本只看 `SIZED` 這份登記表★——編舞自己 `new THREE.Mesh(<同一份剪影幾何>)`
       再 `st.spawn` 出來的第二顆徽記全程隱形（實測 canary 面積由 0.0595 被它抬到 0.4041）。
       這裡改成按**效果**找：場上凡是 geometry 屬於徽記幾何、卻沒登記進 `SIZED` 的 mesh，一律判紅。
       每 SCENE_SCAN_EVERY 次稽核掃一遍（scene.traverse 不便宜，而「多了一顆 mesh」不是逐幀變化的事）。 */
    run.scanTick = (run.scanTick || 0) + 1;
    if (run.scanTick % SCENE_SCAN_EVERY === 1) scanStrayEmblems();
  }
  const SCENE_SCAN_EVERY = 6;
  function scanStrayEmblems() {
    if (!GEOM_SIGS.size) return;
    scene.traverse((o) => {
      if (!o.geometry || SIZED.has(o) || BLOCK_MADE.has(o)) return;
      const pos = o.geometry.attributes && o.geometry.attributes.position;
      if (!pos || !GEOM_COUNTS.has(pos.array.length)) return; // 便宜的前置過濾：頂點數對不上就不是徽記
      if (!GEOM_SIGS.has(geomSig(o.geometry))) return;        // 按內容認（r3 N-1：uuid 被 clone 穿過去）
      sizeViolation(`場上有一顆用徽記剪影、卻沒有經過 st.icon／st.icons／st.mark 的 mesh`
        + `（${o.type}，fxKind=${(o.userData && o.userData.fxKind) || '無'}）：`
        + '它不在尺寸鎖與稽核的涵蓋裡，等於一條完全在防線外的第二份來源'
        + '（覆審 r2 M1；r3 N-1：連 geometry.clone() 出來的也算，認的是內容不是 uuid）。');
    });
  }
  function auditInstances(rec, worldK) {
    const d = rec.obj.userData.fxIcons;
    if (!d) return;
    const inRange = (v) => Number.isFinite(v) && v >= ICON.scaleRange[0] && v <= ICON.scaleRange[1];
    const mul = d.scale === undefined ? 1 : d.scale;
    if (!inRange(mul)) {
      sizeViolation(`群體徽記 ${rec.kind} 的 fxIcons.scale＝${mul} 不在合法倍率區間 `
        + `${ICON.scaleRange.join('~')}（那是相對倍率，不是絕對尺寸）。`);
      return;
    }
    /* ★r2 H2：`o.sizes` 是逐實例的相對倍率，舊版**沒有**區間檢查★
       ——`sizes: prints.map(() => 0.50 / st.iconFlatSize)` 把 ICON 的值除掉，乘積就是寫死的絕對尺寸，
       而稽核的期望值用的是同一組數字 ⇒ 自我指涉、永遠相等（實測 0.2 → 0.5，四道防線全綠）。
       與 `st.iconScale(m, 0.02/base)` 是同一個後門，開在另一扇門上。 */
    if (d.sizes) {
      for (let i = 0; i < d.sizes.length; i++) {
        const v = d.sizes[i] === undefined ? 1 : d.sizes[i];
        if (!inRange(v)) {
          sizeViolation(`群體徽記 ${rec.kind} 第 ${i} 個實例的 o.sizes＝${v} 不在合法倍率區間 `
            + `${ICON.scaleRange.join('~')}（覆審 r2 H2：把 st.iconFlatSize 除掉就是絕對尺寸的後門）。`);
          return;
        }
      }
    }
    for (let i = 0; i < d.pos.length; i++) {
      rec.obj.getMatrixAt(i, _m4);
      _m4.decompose(_ap, _aq, _as);
      const want = worldK * d.size * (rec.flat && d.sizes ? (d.sizes[i] === undefined ? 1 : d.sizes[i]) : mul);
      if (!near(_as.x, want)) {
        sizeViolation(`群體徽記 ${rec.kind} 第 ${i} 個實例的世界縮放是 ${_as.x.toFixed(6)}，`
          + `ICON 表算出來的是 ${want.toFixed(6)}（setMatrixAt 直接寫矩陣＝第二份來源）。`);
        return;
      }
    }
  }
  /** 徽記尺寸的機械診斷（治具讀這一份；js/renderer.js 已把 traitFx 掛在 window.__yaoshi3d 上） */
  function sizeGuard() {
    return { violations: stats.sizeViolations, made: stats.iconMade, locked: stats.iconLocked,
      audits: stats.sizeAudits, auditsUpdate: stats.auditsUpdate, auditsDraw: stats.auditsDraw,
      msg: stats.sizeViolationMsg,
      tweenErrors: stats.tweenErrors, tweenErrorMsg: stats.tweenErrorMsg,
      worldRange: stats.sizeWorldRange, boxDiag: stats.sizeBoxDiag, range: ICON.scaleRange.slice() };
  }
  // 徽記朝鏡頭：相機四元數再往下壓 ICON.billboardTiltDeg（正俯視時完全正對會像貼紙，壓一點才有厚度）
  const TILT_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -THREE.MathUtils.degToRad(ICON.billboardTiltDeg));
  const _bq = new THREE.Quaternion();
  const _rq = new THREE.Quaternion();
  const _m4 = new THREE.Matrix4();
  const _s3 = new THREE.Vector3();
  const ZAX = new THREE.Vector3(0, 0, 1);
  // 預熱：renderer.compile() 只編「直接輸出」那一支，對決走 bloom 的 render target（linear 色彩空間）是另一支
  // program，粒子池在第一次 burst 之前也沒編過——實測（scratchpad/progdiag2）演到一半 render 會 +1～+2。
  // 所以改成兩個暖身物件關掉 frustumCulled 常駐桌底：每一幀（含 bloom 那條路）都真的被畫，兩種變體在第一場
  // 對決之前就編好；粒子池用一顆停在 PARK 的暖身點（同材質）讓它也編掉。
  const warm = new THREE.Group();
  const warmMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), MAT_GLOW);
  const warmLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)]), MAT_LINE);
  // 粒子池的暖身：一顆停在 PARK 的點，材質 clone 自池子（同一支 program），畫不出東西但每幀都被畫
  const warmPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -999, 0]), 3)).setAttribute('color', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)), burst.points.material.clone());
  // v0.55：第三支模板照樣預熱（就算它與 MAT_GLOW 共用 program，NormalBlending 這條 state 路徑
  // 第一次畫時仍可能讓 renderer 補編 transparent 佇列；成本是常駐一個 0.01² 的 plane）
  const warmSolid = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), MAT_SOLID);
  /* ★2026-09-12 量到但**刻意不修**的一件事（原型卷不夾帶產品層變更）★
     three 對 instancing 是另一支 shader 變體（USE_INSTANCING），不是同一支 program。
     實測（tests/tools/proto-record.mjs）：**現況**的魔神仔紅帽 hauntLost（`js/trait-fx/yinqi.js:150`
     走 `st.icons` ⇒ InstancedMesh）在演出中 program 由 20 跳到 22、演完又掉回去——
     所以 traitfx-drive 的 `programsGrew`（比的是演出前後）看不到它，但玩家第一次看到那一招時
     那兩支 shader 是**當場編的**。這是既有狀況，不是虎爺印原型帶進來的。
     試修過：比照另外三支模板常駐一顆 0.01² 的 instanced 暖身物件，確實讓 idle 與峰值的 program 數
     相等（D：23→23、hauntLost：24→24，不再當場編），**代價是常駐 +4 支 program、+2 draw call**。
     那是產品層的取捨（手機上少一次編譯停頓 vs 每一幀多兩個 call），交裁，不夾在原型卷裡改。 */
  warmMesh.frustumCulled = false; warmLine.frustumCulled = false; warmPts.frustumCulled = false; warmSolid.frustumCulled = false;
  warm.add(warmMesh, warmLine, warmPts, warmSolid);
  warm.position.y = -30; // 桌面底下、鏡頭永遠看不到
  scene.add(warm);
  if (opts.renderer) { try { opts.renderer.compile(scene, camera); } catch (e) { /* 直接輸出那一支順手先編 */ } }

  /* sizeViolations／iconMade／iconLocked＝徽記尺寸鎖的執行期斷言（覆審 r3 N11）。
     治具判紅的條件：sizeViolations > 0（有人繞過 ICON 表）或 iconLocked !== iconMade（鎖沒掛上去＝防線失效）。 */
  const stats = { asked: 0, handled: 0, fallback: 0, thrown: 0, fused: 0, cut: 0 /* 收工時還有 tween/timer 沒演完 */, sped: 0 /* 被加速過的套數 */, finished: 0,
    sizeViolations: 0, sizeViolationMsg: null, iconMade: 0, iconLocked: 0,
    // r4 修補批：稽核次數（物件×幀）＝活性；世界寬度區間與 Box3 對角線＝診斷欄（不進判定）
    /* r3 N-2：稽核次數要**標量測位置**（`02 §6.1` 第 5 條：代理指標「沒響」只在它的量測位置上有效）。
       實測 traitfx-drive 的治具頁逐幀 step() 但不逐幀 render()，draw 那個位置**一次都沒觸發**，
       而彙總行只印一個「稽核 N 次」看起來像兩個位置都量過了。 */
    sizeAudits: 0, auditsUpdate: 0, auditsDraw: 0, sizeWorldRange: {}, sizeBoxDiag: {},
    // r4 MEDIUM-1：編舞在 tween／timer／done 裡丟出來的例外不再靜默消失（含被鎖屬性的 TypeError）
    tweenErrors: 0, tweenErrorMsg: null };
  const runs = new Set();
  const wraps = new Map(); // figure → wrap
  let seedCounter = 11;
  let lastSig = null;

  /* ── figure 包裝：骨骼 delta 的 restore／capture／apply，model 與邊光的基準 ── */
  function wrapFig(fig, run) {
    let w = wraps.get(fig);
    if (!w) {
      // 模型＝group 底下「含骨骼／蒙皮網格」的那個子節點：attachFactionFx 的粒子與水面
      // 在 GLB 載完之前就掛進 group 了，children[0] 不一定是模型
      const model = fig.group.children.find((o) => { let hit = false; o.traverse((c) => { if (c.isBone || c.isSkinnedMesh) hit = true; }); return hit; }) || null;
      w = {
        fig, model, runs: new Set(), rimMul: 1,
        origUpdate: fig.update, origSetRim: fig.setRim,
        pre: new Map(), // bone → {q,p,s} mixer 之後、delta 之前的值
        over: new Map(), // bone → {rot: Euler, pos: Vector3, scl: number}
        base: model ? { p: model.position.clone(), r: model.rotation.clone(), s: model.scale.clone() } : null,
        mo: { p: new THREE.Vector3(), r: new THREE.Euler(), s: 1 },
      };
      fig.update = (dt) => { restore(w); if (typeof w.origUpdate === 'function') w.origUpdate.call(fig, dt); capture(w); };
      fig.setRim = (op) => w.origSetRim.call(fig, (op === undefined ? 1 : op) * w.rimMul);
      wraps.set(fig, w);
    }
    w.runs.add(run);
    run.wraps.add(w);
    return w;
  }
  function restore(w) {
    w.pre.forEach((pre, bone) => { bone.quaternion.copy(pre.q); bone.position.copy(pre.p); bone.scale.copy(pre.s); });
  }
  function captureBone(w, bone) {
    let pre = w.pre.get(bone);
    if (!pre) { pre = { q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() }; w.pre.set(bone, pre); }
    pre.q.copy(bone.quaternion); pre.p.copy(bone.position); pre.s.copy(bone.scale);
    return pre;
  }
  function capture(w) { w.over.forEach((_, bone) => captureBone(w, bone)); }
  function apply(w) {
    w.over.forEach((o, bone) => {
      const pre = w.pre.get(bone) || captureBone(w, bone);
      _q.setFromEuler(o.rot);
      bone.quaternion.copy(pre.q).multiply(_q);
      bone.position.copy(pre.p).add(o.pos);
      if (o.scl !== 1) bone.scale.copy(pre.s).multiplyScalar(o.scl); else bone.scale.copy(pre.s);
    });
    if (w.model) {
      const m = w.model;
      m.position.copy(w.base.p).add(w.mo.p);
      m.rotation.set(w.base.r.x + w.mo.r.x, w.base.r.y + w.mo.r.y, w.base.r.z + w.mo.r.z);
      m.scale.copy(w.base.s).multiplyScalar(w.mo.s);
    }
  }
  function unwrap(w) {
    restore(w);
    if (w.model) { w.model.position.copy(w.base.p); w.model.rotation.copy(w.base.r); w.model.scale.copy(w.base.s); }
    w.fig.update = w.origUpdate;
    w.fig.setRim = w.origSetRim;
    w.rimMul = 1;
    try { w.fig.setRim(1); } catch (e) { /* 下一幀 duel-figures 會再設 */ }
    wraps.delete(w.fig);
  }
  function overOf(w, bone) {
    let o = w.over.get(bone);
    if (!o) { o = { rot: new THREE.Euler(), pos: new THREE.Vector3(), scl: 1 }; w.over.set(bone, o); }
    return o;
  }

  function centroid(figs, out) {
    out = out || new THREE.Vector3();
    out.set(0, 0, 0);
    if (!figs.length) return out;
    figs.forEach((f) => { out.add(f.group.position); });
    return out.multiplyScalar(1 / figs.length);
  }

  /* ── v0.55 因果三段的機械判定（ART_BIBLE §10.3；門檻在 vocab.js 的 PHASE_GATE，不得放寬）──
     st.phase(name) 只是打點，**記不記進 run.sig.phases 由打點當下那一段的實際條件是否成立決定**。
     這就是「防喊了就算」：編舞說它有 windup，但如果骨骼／model 一動都沒動，這一段不記。 */
  /** 取這一套演出裡符合 pred 的 figure，骨骼覆寫與 model 覆寫的最大絕對值 */
  function metricOf(run, pred) {
    let bone = 0, model = 0;
    run.wraps.forEach((w) => {
      if (!pred(w.fig)) return;
      w.over.forEach((o) => {
        bone = Math.max(bone, Math.abs(o.rot.x), Math.abs(o.rot.y), Math.abs(o.rot.z), Math.abs(o.pos.x), Math.abs(o.pos.y), Math.abs(o.pos.z));
      });
      model = Math.max(model, w.mo.p.length(), Math.abs(w.mo.s - 1));
    });
    return { bone, model };
  }
  function evalPhases(run) {
    for (const c of run.phaseClaims) {
      if (c.ok || run.vt > c.until) continue;
      if (c.name === 'windup') {
        // 出招方自己的骨骼／model 真的動了（只有 rim 變化不算——rim 不寫進 over／mo）
        const m = metricOf(run, (f) => run.actorSet.has(f));
        c.bone = Math.max(c.bone, m.bone); c.model = Math.max(c.model, m.model);
        if (c.bone >= PHASE_GATE.windupBone || c.model >= PHASE_GATE.windupModel) c.ok = true;
      } else if (c.name === 'travel') {
        // spawn 出來的東西真的跑了一段路（原地脹大的環、罩、光球位移為 0，自然不算）
        let best = 0;
        for (const m of run.meshes) {
          if (!m || !m.position) continue;
          const b = c.base.get(m);
          if (!b) { c.base.set(m, m.position.clone()); continue; }
          const d = m.position.distanceTo(b);
          if (d > best) best = d;
        }
        c.moved = Math.max(c.moved, best);
        if (c.moved >= c.need) c.ok = true;
      } else {
        /* 受招方／受益方有反應。兩個設計決定，兩個都是為了不讓這條恆真或恆假（02 §6.1 第 6 條）：
           ① 量的是「打點之後**變了多少**」，不是絕對值——否則出招方 windup 留在身上的位移會讓它恆真；
           ② 排掉 caster（他自己的收勢不算），**但場上只有他一個人時就量他自己**——
              自益招（獻祭刀在治具裡只有 1 尊）若一律排掉 caster，這條就恆假、再對的實作也過不了。 */
        let best = 0, sawOther = false;
        run.wraps.forEach((w) => { if (w.fig !== run.caster) sawOther = true; });
        run.wraps.forEach((w) => {
          if (sawOther && w.fig === run.caster) return;
          let b = c.base.get(w);
          // 打點之後才被包裝的 figure（受招方通常是在 flinch 那一刻才進 wraps）：基準是**中性姿勢**，
          // 不是「第一次看到它時的值」——那一幀 tween 已經動過一次了，會白丟掉一格的位移。
          if (!b) { b = { p: new THREE.Vector3(), s: 1 }; c.base.set(w, b); }
          best = Math.max(best, w.mo.p.distanceTo(b.p), Math.abs(w.mo.s - b.s));
        });
        c.model = Math.max(c.model, best);
        c.solo = !sawOther;
        if (c.model >= PHASE_GATE.reactDelta) c.ok = true;
      }
    }
  }
  /** 徽記朝鏡頭（可帶自轉 userData.fxRoll） */
  function faceCamera(obj) {
    obj.quaternion.copy(camera.quaternion);
    if (obj.userData.fxRoll) { _rq.setFromAxisAngle(ZAX, obj.userData.fxRoll); obj.quaternion.multiply(_rq); }
    obj.quaternion.multiply(TILT_Q);
  }
  /** InstancedMesh 的每個實例各自朝鏡頭（群體招用；N 枚徽記仍是 1 個 draw call） */
  function faceCameraInstanced(im) {
    const d = im.userData.fxIcons;
    if (!d) return;
    _bq.copy(camera.quaternion);
    if (d.roll) { _rq.setFromAxisAngle(ZAX, d.roll); _bq.multiply(_rq); }
    _bq.multiply(TILT_Q);
    for (let i = 0; i < d.pos.length; i++) { _m4.compose(d.pos[i], _bq, _s3.setScalar(d.size * (d.scale === undefined ? 1 : d.scale))); im.setMatrixAt(i, _m4); }
    im.instanceMatrix.needsUpdate = true;
  }

  /* ── 舞台：交給編舞函式的工具箱 ── */
  function makeStage(run, actor, target, det) {
    const colorObj = new THREE.Color(SPARK_COLOR[det.fac] || SPARK_COLOR.lantern);
    const cA = centroid(actor);
    const cB = target.length ? centroid(target) : cA.clone().add(new THREE.Vector3(1, 0, 0));
    const dir = cB.clone().sub(cA); dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    const inTarget = new Set(target);
    const touch = (fig) => { if (inTarget.has(fig)) run.sig.target = true; };
    const wrapOf = (fig) => { touch(fig); return wrapFig(fig, run); };
    // v0.55 因果三段用的兩個基準：出招方名單與「到目標的距離」（travel 要求位移 ≥ 這段的 40%）
    run.actorSet = new Set(actor);
    run.travelDist = Math.max(0.5, cA.distanceTo(cB));
    /** 第一個被真的動到骨骼／model 的出招方＝這一招的施術者。
     *  react 段量的是「除了他以外的人有沒有反應」——他自己的收勢不構成受招方的反應。 */
    const markCaster = (fig) => { if (!run.caster && !inTarget.has(fig)) run.caster = fig; };

    const st = {
      /** 這一招的時長（ms）、系色鍵與 hex、力道、是否 reduced-motion */
      /** 這一招的時長（ms）、tier（1／2／3）、系色鍵與 hex、力道、是否 reduced-motion。
       *  tier 給編舞用來加「只有大招才有」的段落（例：三尊在 tier 3 的餘韻，見 R1 覆審 M1）；
       *  tier 2 走同一支函式時必須逐項不變，所以那些段落一律包在 `if (st.tier === 3)` 裡。 */
      ms: run.ms, tier: run.tier, fac: det.fac, color: colorObj.getHex(), colorObj, power: det.power || 0.8, reduced: run.reduced,
      actor, target, dir, up: UP, tableY: TFX.tableY, EASE,
      /** 決定性亂數（0..1），同一場同一招每次一樣 */
      rnd: makeLcg(run.seed),
      byBody(figs, body) { return figs.filter((f) => f.unit && f.unit.body === body); },
      biggest(figs) {
        let best = null, bv = -1;
        figs.forEach((f) => { const b = f.bounds && f.bounds(); const v = b ? (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z) * f.group.scale.x ** 3 : 0; if (v > bv) { bv = v; best = f; } });
        return best;
      },
      bone(fig, name) { return fig && fig.parts ? fig.parts[name] || null : null; },
      /** 骨骼的世界座標；沒這根骨就給包圍盒中心 */
      worldOf(fig, boneName, out) {
        out = out || new THREE.Vector3();
        const b = boneName && fig.parts ? fig.parts[boneName] : null;
        if (b) return b.getWorldPosition(out);
        const bb = fig.bounds && fig.bounds();
        if (bb) bb.getCenter(out); else out.set(0, 0.6, 0);
        return fig.group.localToWorld(out);
      },
      /** 頭頂／腳底的世界座標 */
      top(fig, out) { out = out || new THREE.Vector3(); const bb = fig.bounds && fig.bounds(); out.set(0, bb ? bb.max.y : 1.2, 0); return fig.group.localToWorld(out); },
      foot(fig, out) { out = out || new THREE.Vector3(); fig.group.getWorldPosition(out); out.y = TFX.tableY; return out; },
      /** 這一尊「朝對面」的方向，group 空間、水平、單位向量（給 move() 用） */
      toward(fig, out) {
        out = out || new THREE.Vector3();
        const goal = inTarget.has(fig) ? cA : cB;
        fig.group.worldToLocal(out.copy(goal)); out.y = 0;
        if (out.lengthSq() < 1e-6) out.set(0, 0, 1);
        return out.normalize();
      },
      /* ── 覆寫（reduced 時位移類全部 no-op） ── */
      rot(fig, boneName, x, y, z) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName); markCaster(fig);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).rot.set(x || 0, y || 0, z || 0); return true;
      },
      shift(fig, boneName, x, y, z) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName); markCaster(fig);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).pos.set(x || 0, y || 0, z || 0); return true;
      },
      scaleBone(fig, boneName, k) {
        const b = st.bone(fig, boneName); if (!b) return false;
        run.sig.bones.add(boneName); markCaster(fig);
        if (run.reduced) return true;
        overOf(wrapOf(fig), b).scl = k; return true;
      },
      move(fig, x, y, z) { run.sig.bones.add('@model'); markCaster(fig); if (run.reduced) return; wrapOf(fig).mo.p.set(x || 0, y || 0, z || 0); },
      spin(fig, x, y, z) { run.sig.bones.add('@model'); markCaster(fig); if (run.reduced) return; wrapOf(fig).mo.r.set(x || 0, y || 0, z || 0); },
      scale(fig, k) { run.sig.bones.add('@model'); markCaster(fig); if (run.reduced) return; wrapOf(fig).mo.s = k; },
      rim(fig, mul) { run.sig.bones.add('@rim'); wrapOf(fig).rimMul = mul; },
      /* ── 時序 ── */
      /** tween({ms, delay, ease, update(t, e), done}) */
      /** tween({ms, delay, ease, update(t, e), done})。排程走「虛擬時間」run.vt：編舞照自己的節奏排，排到 st.ms 之外時
       *  整套均勻加速（見 update() 的 rate），醞釀／出手／收勢的比例不變——覆審第 1 輪 H-1（滿編 8 尊逐尊錯開的
       *  lag 讓演出拖到 1317ms、index 只等 900ms）與第 2 輪 M（逐段按比例壓縮＝砍掉收勢）都由這一招處理。 */
      tween(o) {
        const delay = Number.isFinite(o.delay) ? Math.max(0, o.delay) : 0, ms = Number.isFinite(o.ms) && o.ms > 0 ? o.ms : run.ms;
        // F10 的分子：時間軸註冊過的「非 flinch」補間條數（fly／fade／grow 都經過這裡）。
        // 受招退縮不算——它是每一招共用的通用反應，不構成這一招的辨識元素。
        if (!run.inFlinch) run.acts++;
        const tw = { start: run.vt + delay, ms, ease: typeof o.ease === 'function' ? o.ease : EASE[o.ease || 'out'] || EASE.out, update: o.update || (() => {}), done: o.done || null, dead: false };
        run.horizon = Math.max(run.horizon, tw.start + ms);
        run.tweens.push(tw); return tw;
      },
      at(ms, fn) { const at = run.vt + (Number.isFinite(ms) ? Math.max(0, ms) : 0); run.horizon = Math.max(run.horizon, at + TFX.atReserve * run.k); run.timers.push({ at, fn, fired: false }); },
      /* ── mesh ── */
      glow(color, opacity) { const m = MAT_GLOW.clone(); m.color.setHex(color === undefined ? st.color : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      lineMat(color, opacity) { const m = MAT_LINE.clone(); m.color.setHex(color === undefined ? st.color : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      /** 實心（非加色）材質，給「要留得住系色」的紙紮小物用（金箔片、紙錢、印文本體）。
       *  加色的東西一越過 bloom 門檻就往白色去——ART_BIBLE §10.2 第 5 條的機制成因。 */
      solid(color, opacity) { const m = MAT_SOLID.clone(); m.color.setHex(color === undefined ? st.colors.key : color); m.opacity = opacity === undefined ? 1 : opacity; return m; },
      // userData.fxKind 是 L3 對比閘門的抓手：fx-contrast 只准切徽記／拖尾／印記的 visible，其餘一切不動
      spawn(obj, kind) { const k = kind || 'mesh'; run.sig.meshes.add(k); obj.userData.fxKind = k; scene.add(obj); run.meshes.push(obj); return obj; },
      /** 貼桌面的環（RingGeometry），中心在 pos（世界座標） */
      ring(pos, radius, width, o = {}) {
        const g = new THREE.RingGeometry(Math.max(0.01, radius - (width || 0.06)), radius, 40);
        const m = new THREE.Mesh(g, st.glow(o.color, o.opacity === undefined ? 0.8 : o.opacity));
        m.rotation.x = -Math.PI / 2; m.position.set(pos.x, TFX.tableY + 0.004, pos.z);
        return st.spawn(m, 'ring');
      },
      disc(pos, radius, o = {}) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), st.glow(o.color, o.opacity === undefined ? 0.5 : o.opacity));
        m.rotation.x = -Math.PI / 2; m.position.set(pos.x, TFX.tableY + 0.003, pos.z);
        return st.spawn(m, 'disc');
      },
      orb(pos, radius, o = {}) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), st.glow(o.color, o.opacity === undefined ? 0.9 : o.opacity));
        m.position.copy(pos); return st.spawn(m, 'orb');
      },
      /** 罩：半球，開口朝下罩住 pos */
      dome(pos, radius, o = {}) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), st.glow(o.color, o.opacity === undefined ? 0.35 : o.opacity));
        m.position.copy(pos); return st.spawn(m, 'dome');
      },
      /** 閃電／鎖鏈：from→to 的折線，jag＝抖動幅度 */
      bolt(from, to, o = {}) {
        const segs = o.segs || 9, jag = o.jag === undefined ? 0.12 : o.jag, rnd = makeLcg(o.seed || run.seed + 1);
        const pts = [];
        const d = _v.copy(to).sub(from), len = d.length() || 1e-3;
        // 側向量：水平線段用 (-z,0,x)；純垂直（天雷從天劈下）會退化成零向量，改拿 X 軸當側向（祖靈 agent 實測）
        const side = _v2.set(-d.z, 0, d.x);
        if (side.lengthSq() < 1e-8) side.set(1, 0, 0); else side.normalize();
        for (let i = 0; i <= segs; i++) {
          const t = i / segs, p = new THREE.Vector3().copy(from).addScaledVector(d, t);
          if (i > 0 && i < segs) { const k = (rnd() - 0.5) * 2 * jag * len * 0.3; p.addScaledVector(side, k); p.y += (rnd() - 0.5) * jag * len * 0.25; }
          pts.push(p);
        }
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), st.lineMat(o.color, o.opacity === undefined ? 1 : o.opacity));
        return st.spawn(line, 'bolt');
      },
      /** 直線 */
      beam(from, to, o = {}) {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]), st.lineMat(o.color, o.opacity === undefined ? 1 : o.opacity));
        return st.spawn(line, 'beam');
      },
      /** 把 mesh 從 from 飛到 to（可加拋物線 arc 高度），回傳 tween */
      fly(obj, from, to, o = {}) {
        const a = from.clone(), b = to.clone(), arc = o.arc || 0;
        return st.tween({ ms: o.ms || run.ms * 0.4, delay: o.delay || 0, ease: o.ease || 'inout', done: o.done,
          update(t, e) { obj.position.lerpVectors(a, b, e); obj.position.y += arc * Math.sin(Math.PI * e); if (o.update) o.update(t, e); } });
      },
      /** 淡入淡出。徽記是「本體＋ink 底板（＋描邊）」的複合物，userData.fxParts 讓三片一起淡——
       *  只淡本體會留下一片孤零零的黑底板。沒有 fxParts 的物件行為與 v0.54 逐字相同。 */
      fade(obj, o = {}) {
        const parts = (obj.userData && obj.userData.fxParts) || [obj];
        const from = o.from === undefined ? parts[0].material.opacity : o.from, to = o.to === undefined ? 0 : o.to;
        return st.tween({ ms: o.ms || run.ms * 0.4, delay: o.delay || 0, ease: o.ease || 'out', done: o.done, update(t, e) { const v = from + (to - from) * e; for (let i = 0; i < parts.length; i++) parts[i].material.opacity = v; } });
      },
      /** 直接設透明度（複合徽記一起設） */
      alpha(obj, v) { const parts = (obj.userData && obj.userData.fxParts) || [obj]; for (let i = 0; i < parts.length; i++) parts[i].material.opacity = v; },
      grow(obj, o = {}) {
        const from = o.from === undefined ? 0.2 : o.from, to = o.to === undefined ? 1 : o.to;
        return st.tween({ ms: o.ms || run.ms * 0.5, delay: o.delay || 0, ease: o.ease || 'out', done: o.done, update(t, e) { obj.scale.setScalar(from + (to - from) * e); } });
      },
      /* ── 粒子／鏡頭 ── */
      burst(pos, o = {}) {
        run.sig.meshes.add('burst');
        burst.burst(pos, o.color === undefined ? st.color : o.color, { n: o.n || 40, power: o.power || 0.6, scale: o.scale || 1, seed: seedCounter++ });
      },
      punch(power) { try { document.dispatchEvent(new CustomEvent('ys:fx-punch', { detail: { power: power || 0.5 } })); } catch (e) { /* headless */ } },
      /** 受招輕反應（使用者裁定）：model 沿「遠離出招方」退縮＋邊光閃一下，不新增動畫 */
      flinch(figs, o = {}) {
        const k = o.strength === undefined ? 1 : o.strength, delay = o.delay || 0;
        run.inFlinch = true; // 這一段裡註冊的 tween 不計入 F10 的動作數
        figs.forEach((f, i) => {
          const w = wrapOf(f); run.sig.bones.add('@flinch');
          const away = st.toward(f).multiplyScalar(-TFX.flinchDist * k);
          st.tween({ ms: o.ms || TFX.flinchMs * run.k, delay: delay + (o.stagger || 0) * i, ease: 'snap',
            update(t, e) { if (!run.reduced) w.mo.p.copy(away).multiplyScalar(e); w.rimMul = 1 + (TFX.flinchRim - 1) * e * k; } });
        });
        run.inFlinch = false;
        if (o.burst !== false && figs.length) { const p = st.worldOf(figs[0], null); st.at(delay, () => st.burst(p, { power: 0.5 * k, n: 30 })); }
      },
      /* ══ v0.55 招式可辨性卷的積木（計畫 §2.3，名字寫死）══════════════════════════
         語彙與門檻在 js/trait-fx/vocab.js、剪影頂點表在 js/trait-fx/emblems.js，
         人類可讀版在 ART_BIBLE §10。**編舞裡不得再出現任何色碼字面值**——一律走 st.colors。 */
      /** 本系色票 {key, hot, line, ink}（key＝徽記本體、hot＝命中、line＝連線與拖尾、ink＝暗部描邊） */
      colors: FX_PAL[det.fac] || FX_PAL.zuling,
      /** 這一招的節拍窗（ms）：{windup:[a,b], travel:[a,b], react:[a,b], settle:[a,b]}，依 tier 換表 */
      beat: beatOf(run.tier, run.ms),
      /** 這一招的法寶徽記 kind（EMBLEM_OF 的雙射；編舞一律寫 st.icon(st.kind, …)，不要自己填字串） */
      kind: EMBLEM_OF[det.trId] || null,
      /** 這一招徽記本體的尺寸（世界單位）。**唯一來源＝vocab.js 的 ICON.byKind／size**——
       *  編舞要放大縮小一律乘這個值，不得再寫 `const SZ = 0.56` 那種字面值（覆審 r1 C1）。 */
      iconSize: ICON.sizeOf(EMBLEM_OF[det.trId] || null),
      /** 這一招貼桌副件（水漬／腳印／貼桌陣）的尺寸；來源同上，ICON.flatByKind。 */
      iconFlatSize: ICON.flatSizeOf(EMBLEM_OF[det.trId] || null),
      /** 這一招印記（st.mark 蓋在受招／受益方身上那枚）的尺寸；來源同上，ICON.markByKind。 */
      markSize: ICON.markSizeOf(EMBLEM_OF[det.trId] || null),
      /** ★徽記縮放的唯一合法入口（覆審 r3 N11）★
       *  `k` 是**相對倍率**，實際世界尺寸＝`ICON` 表給的基準 × k——ICON 的值永遠在乘積裡。
       *  編舞寫 `st.iconScale(knife, 0.5 + 0.5 * e)`，等價於舊寫法 `st.iconSize * (0.5 + 0.5 * e)`
       *  （基準就是 `st.iconSize`／`st.iconFlatSize`／`st.markSize` 那一組，逐位數相同）。
       *  直接寫 `mesh.scale.*` 會被 lockIconScale 當場 throw ＋ 記進 stats.sizeViolations。 */
      iconScale(mesh, k) {
        const base = mesh && mesh.userData ? mesh.userData.fxIconBase : undefined;
        if (base === undefined) {
          throw new Error('st.iconScale 只吃 st.icon／st.icons／st.mark 產出的徽記（它的尺寸基準來自 vocab.js 的 ICON 表）；'
            + '別的 mesh 請用 st.grow');
        }
        const m = k === undefined ? 1 : k;
        if (!Number.isFinite(m)) throw new Error(`st.iconScale 的倍率不是有限數：${m}`);
        /* ★倍率要有上下限（覆審 r4）★：沒有它，`st.iconScale(m, 0.02 / base)` 就是絕對尺寸的後門
           ——合法入口自己變成第二份來源。超出區間代表這個 kind 的尺寸該改，請改 ICON 的三張表。 */
        if (m < ICON.scaleRange[0] || m > ICON.scaleRange[1]) {
          throw new Error(sizeViolation(`st.iconScale 的倍率 ${m} 超出合法區間 ${ICON.scaleRange.join('~')}`
            + `（徽記 ${mesh.userData.fxIconKind}）。那不是呼吸縮放，是把絕對尺寸寫進來；`
            + '要改這個 kind 的尺寸請改 js/trait-fx/vocab.js 的 byKind／flatByKind／markByKind。'));
        }
        setLockedScale(mesh, base * m);
        return mesh;
      },
      /** 徽記：一片朝鏡頭的法寶剪影。
       *  o = { size=ICON.sizeOf(kind), color=st.colors.key, opacity=1, outline=true, rimLine=false, roll=0 }
       *  outline＝在本體後面墊一片 ink 色的實心底板（把亮色從暗紅桌／夜紫天上切出來）；
       *  ★這裡刻意用 MAT_SOLID 底板而不是 MAT_LINE 描邊★——加色的細線正是盲讀抱怨的「白虛線」，
       *  而且 1px 線在 780×360 的盲讀格上連面積都量不到。要真的 MAT_LINE 外框就開 rimLine。 */
      icon(kind, pos, o = {}) {
        const size = iconSizeSrc('st.icon', kind, o, o.role === 'mark' ? ICON.markSizeOf(kind) : ICON.sizeOf(kind));
        const op = o.opacity === undefined ? 1 : o.opacity;
        const mat = MAT_SOLID.clone();
        mat.color.setHex(o.color === undefined ? st.colors.key : o.color);
        mat.opacity = op;
        const mesh = new THREE.Mesh(EMBLEMS.geomOf(kind), mat);
        mesh.scale.setScalar(size);
        if (pos) mesh.position.copy(pos);
        mesh.userData.fxRoll = o.roll || 0;
        if (o.outline !== false) {
          const back = new THREE.Mesh(EMBLEMS.geomOf(kind), MAT_SOLID.clone());
          back.material.color.setHex(o.inkColor === undefined ? st.colors.ink : o.inkColor);
          back.material.opacity = op;
          back.scale.setScalar(1 + ICON.outlineW / Math.max(0.02, size));
          back.position.z = -0.012; // 本體之後一點點（本體是 DoubleSide 平片，靠 z 順序壓住）
          mesh.add(back);
        }
        if (o.rimLine) {
          const line = new THREE.LineLoop(EMBLEMS.outlineOf(kind), MAT_LINE.clone());
          line.material.color.setHex(st.colors.line); line.material.opacity = op;
          line.position.z = 0.012;
          mesh.add(line);
        }
        mesh.userData.fxParts = [mesh].concat(mesh.children.filter((c) => c.material)); // st.fade／st.alpha 三片一起動
        /* ★尺寸鎖（覆審 r3 N11）★：本體與底板／描邊子節點全部鎖住。
           子節點也要鎖是因為「`knife.children[0].scale.setScalar(…)`」同樣改得動畫面上的尺寸
           （底板被撐大就是 r2 §7.1 末表那個「ΔE 糊掉」的機制）——防線按效果寫，不按入口寫。 */
        stats.iconMade++;
        lockIconScale(run, mesh, size, kind, mesh.geometry);
        mesh.children.forEach((c) => { stats.iconMade++; lockIconScale(run, c, c.scale.x, kind + ':part', c.geometry, mesh); });
        st.spawn(mesh, 'emblem:' + kind);
        run.sig.emblems.add(kind);
        if (o.flat) { mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = o.roll || 0; } // 貼桌（陰氣的水漬／暗斑、香火的貼桌陣）：不朝鏡頭
        else { run.bb.push(mesh); faceCamera(mesh); }
        return mesh;
      },
      /** 同一 kind ≥3 份走這支：N 枚徽記 = 1 個 draw call（群體招的 draw call 預算靠它）。
       *  positions 是 Vector3[]（會被記住並逐幀重排朝向；要移動就改陣列裡的向量）。 */
      icons(kind, positions, o = {}) {
        const size = iconSizeSrc('st.icons', kind, o, o.flat ? ICON.flatSizeOf(kind) : ICON.sizeOf(kind));
        /* ★r2 H2：`o.sizes` 的區間檢查要在入口做（稽核是第二道）★
           它是逐實例的**相對**倍率，ICON 的值必須留在乘積裡；把 st.iconFlatSize 除掉就是
           絕對尺寸的後門（實測把貼桌徽記由 0.2 推到 0.5，舊版四道防線全綠）。 */
        if (o.sizes) {
          if (!Array.isArray(o.sizes)) throw new Error('st.icons 的 o.sizes 必須是陣列');
          for (let i = 0; i < o.sizes.length; i++) {
            const v = o.sizes[i] === undefined ? 1 : o.sizes[i];
            if (!Number.isFinite(v) || v < ICON.scaleRange[0] || v > ICON.scaleRange[1]) {
              throw new Error(sizeViolation(`st.icons 的 o.sizes[${i}]＝${v} 不在合法倍率區間 `
                + `${ICON.scaleRange.join('~')}（徽記 ${kind}）。那是逐實例的相對倍率，不是絕對尺寸；`
                + '要改這個 kind 的尺寸請改 js/trait-fx/vocab.js 的 flatByKind／byKind。'));
            }
          }
        }
        const mat = MAT_SOLID.clone();
        mat.color.setHex(o.color === undefined ? st.colors.key : o.color);
        mat.opacity = o.opacity === undefined ? 1 : o.opacity;
        const im = new THREE.InstancedMesh(EMBLEMS.geomOf(kind), mat, Math.max(1, positions.length));
        im.userData.fxIcons = { pos: positions.map((p) => p.clone()), size, roll: o.roll || 0, scale: 1, rolls: o.rolls || null,
          // r4 修補批：逐實例稽核要知道 flat 那條路乘的是哪一組相對倍率（行為不變，只是把它記下來）
          sizes: o.sizes || null };
        /* ★尺寸鎖（覆審 r3 N11）★：群體徽記的尺寸有兩個出口，兩個都要收——
           ① `im.scale`（整批一起放大，基準 1＝純相對倍率）；
           ② `userData.fxIcons.size`（逐幀重排時乘進矩陣的那個值，直接改它就是第二份來源）→ 唯讀。 */
        Object.defineProperty(im.userData.fxIcons, 'size', { value: size, enumerable: true });
        im.frustumCulled = false; // 實例中心在原點，包圍盒對不上，不關會被整批剔掉
        stats.iconMade++;
        lockIconScale(run, im, 1, kind + ':instanced', im.geometry);
        SIZED.get(im).flat = !!o.flat; // 逐實例稽核：flat 走 o.sizes 那組相對倍率，非 flat 走 d.scale
        st.spawn(im, 'emblem:' + kind);
        run.sig.emblems.add(kind);
        if (o.flat) { // 貼桌：一次把 N 個實例壓平，之後不逐幀重排（省掉整批 billboard 的成本）
          const q = _bq.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
          const d = im.userData.fxIcons;
          for (let i = 0; i < d.pos.length; i++) {
            _rq.copy(q);
            if (d.rolls) { const rr = new THREE.Quaternion().setFromAxisAngle(UP, d.rolls[i]); _rq.premultiply(rr); }
            _m4.compose(d.pos[i], _rq, _s3.setScalar(size * (o.sizes ? o.sizes[i] : 1)));
            im.setMatrixAt(i, _m4);
          }
          im.instanceMatrix.needsUpdate = true;
        } else { run.bbi.push(im); faceCameraInstanced(im); }
        return im;
      },
      /** 飛行物＋拖尾：把 obj 從 from 飛到 to，尾巴是綁在它身上的 MAT_LINE。
       *  取代現在滿場飛的裸 beam（裸白細線 9/27，讀者原話「看不清飛的是什麼東西」）。
       *  o = { ms, delay, ease, arc, spin, trail=true, segs=12, color=st.colors.line, done, update } */
      trail(obj, from, to, o = {}) {
        const a = from.clone(), b = to.clone(), arc = o.arc || 0, spin = o.spin || 0;
        const segs = Math.max(2, o.segs || 12);
        let line = null, buf = null;
        if (o.trail !== false) {
          buf = new Float32Array(segs * 3);
          for (let i = 0; i < segs; i++) { buf[i * 3] = a.x; buf[i * 3 + 1] = a.y; buf[i * 3 + 2] = a.z; }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(buf, 3));
          line = new THREE.Line(g, st.lineMat(o.color === undefined ? st.colors.line : o.color, o.opacity === undefined ? 0.85 : o.opacity));
          st.spawn(line, 'trail');
        }
        return st.tween({
          ms: o.ms || run.ms * 0.35, delay: o.delay || 0, ease: o.ease || 'out', done: o.done,
          update(t, e) {
            obj.position.lerpVectors(a, b, e);
            if (arc) obj.position.y += arc * Math.sin(Math.PI * e);
            if (spin) obj.userData.fxRoll = spin * e;
            if (buf) {
              buf.copyWithin(0, 3); // 尾巴往前推一格，最後一格寫當前位置
              buf[buf.length - 3] = obj.position.x; buf[buf.length - 2] = obj.position.y; buf[buf.length - 1] = obj.position.z;
              line.geometry.attributes.position.needsUpdate = true;
            }
            if (o.update) o.update(t, e);
          },
        });
      },
      /** 印記：在受招／受益方身上蓋一枚徽記並跟著它走（因果第三段的「證據」）。
       *  o = { color, at='chest'|'top'|'foot', off:Vector3, opacity }
       *  尺寸不在 o 裡：一律由 vocab.js 的 ICON.markSizeOf(kind) 決定（傳 o.size 會 throw）。 */
      mark(fig, kind, o = {}) {
        iconSizeSrc('st.mark', kind, o, 0); // 拒收 o.size（真正的尺寸下面由 role:'mark' 取）
        const at = o.at || 'chest';
        const off = o.off || null;
        const get = (out) => {
          if (at === 'top') st.top(fig, out);
          else if (at === 'foot') st.foot(fig, out);
          else st.worldOf(fig, 'Chest', out);
          if (off) out.add(off);
          return out;
        };
        const p = get(new THREE.Vector3());
        const mesh = st.icon(kind, p, { role: 'mark', color: o.color, opacity: o.opacity, outline: o.outline });
        // st.icon 已經 spawn＋登記 billboard 了；這裡只多打一個 mark 標記與加一條「跟著走」。
        // ★不得把 'emblem:<kind>' 從簽章刪掉★：同一招常常是「手上一枚徽記＋受招方身上一枚印記」，
        //   刪掉會讓 L1 的「tier 1／2 都要有 emblem」在這種招上假綠。
        run.sig.meshes.add('mark:' + kind);
        mesh.userData.fxKind = 'mark:' + kind;
        run.follow.push({ mesh, get, tmp: new THREE.Vector3() });
        touch(fig);
        return mesh;
      },
      /** ★紙紮印文（2026-09-12 虎爺印原型卷）★：有厚度、有墨線邊、微翹曲的一枚**實體**印，
       *  取代「平面單色 billboard 貼在紙紮 3D 上」那種剪貼畫感（製作人對 0.55 徽記剪影的判定）。
       *
       *  與 st.icon／st.mark 的三個差別：
       *    ① **不是 billboard**：朝向在 spawn 當下凍住（鏡頭方向＋固定俯仰／偏擺），之後只跟著位置走，
       *       所以轉頭看得到它的厚度側邊——逐幀正對鏡頭正是「貼紙」的成因。
       *    ② **有厚度**：`ExtrudeGeometry` 擠出 ink 色的本體，正面再疊一片縮小的 key／hot 色面板，
       *       露出來的那一圈 ink 就是墨線描邊（ART_BIBLE §10.1 徽記材質「MAT_SOLID 實心本體＋描邊」）。
       *    ③ **翹曲**：頂點依 x²／y 微幅推 z，紙不是平的。
       *  材質仍是 MAT_SOLID.clone()（NormalBlending、平塗硬邊＝ART_BIBLE §9「紙」的三件幾何訊號之一），
       *  與現有三支模板共用 program（programsGrew 維持 0）。
       *
       *  o = { role:'mark'|'stamp', color, inkColor, opacity, depth, warp, tiltDeg, yawDeg, roll,
       *        follow:figure, at:'chest'|'top'|'foot', off:Vector3 }
       *  尺寸同樣**不在 o 裡**（傳 o.size 會 throw）：role==='stamp' 走 ICON.sizeOf、否則 ICON.markSizeOf。 */
      paperStamp(kind, pos, o = {}) {
        const size = iconSizeSrc('st.paperStamp', kind, o, o.role === 'stamp' ? ICON.sizeOf(kind) : ICON.markSizeOf(kind));
        const op = o.opacity === undefined ? 1 : o.opacity;
        const shape = paperShape(EMBLEMS.EMBLEM, kind, 'st.paperStamp');
        const depth = o.depth === undefined ? 0.18 : o.depth; // 單位方座標；乘 size 後 ≈0.03–0.11 世界單位
        const warp = o.warp === undefined ? 0.14 : o.warp;
        const bow = (g) => paperBow(g, warp); // 翹曲的公式是共用零件（本體／面板／字三片要貼得住）
        const gBody = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
        gBody.translate(0, 0, -depth / 2);
        bow(gBody);
        const gFace = new THREE.ShapeGeometry(shape); // 自己建一份：EMBLEMS.geomOf 是全場共用的，不能拿來改頂點
        gFace.scale(0.74, 0.74, 1); // 縮一圈 → 露出來的 ink 本體就是描邊（第 3 輪：0.80 的邊太細，遠看沒有「墨線」）
        gFace.translate(0, 0, depth / 2 + 0.012);
        bow(gFace);
        const mBody = new THREE.Mesh(gBody, MAT_SOLID.clone());
        mBody.material.color.setHex(o.inkColor === undefined ? st.colors.ink : o.inkColor);
        mBody.material.opacity = op;
        const mFace = new THREE.Mesh(gFace, MAT_SOLID.clone());
        mFace.material.color.setHex(o.color === undefined ? st.colors.key : o.color);
        mFace.material.opacity = op;
        const grp = new THREE.Group();
        grp.add(mBody, mFace);
        // r3 N-1：場景掃描按 geometry 內容認徽記，paperStamp 自己建的那幾片要放行（它不是手造的第二顆徽記）
        BLOCK_MADE.add(mBody); BLOCK_MADE.add(mFace);
        /* o.glyph：印面上的字（ink 色）。沒有它的話，一枚 0.2–0.5 世界單位的印在 780×360 上
           只是一塊紅色色塊——「有厚度的紅色塊」和「印」之間差的就是這幾筆。
           ★2026-09-12 製作人裁定：字一律是「虎」★（原型第一版寫的是「王」，是虎額上那個字，
           但那不是虎爺**印**上會刻的東西；印上刻的是神名）。
           筆畫全部用矩形拼，N 個 shape 合成**一個** ShapeGeometry（ShapeGeometry 吃 shape 陣列），
           所以不論幾畫都只多一個 draw call。 */
        let mGlyph = null;
        if (o.glyph) {
          /* 字面**要落在縮小後的印面之內**。seal 的方印身 y∈[-0.90,-0.15]，印面又縮了 0.74
             ⇒ 實際可寫字的範圍約 y∈[-0.67,-0.11]；cy −0.40／h 0.22 剛好落在裡面。 */
          const g = o.glyph === true || typeof o.glyph === 'string' ? { cx: 0, cy: -0.40, w: 0.30, h: 0.22 } : o.glyph;
          /* 「虎」的筆畫表，座標是**字框的單位方** [-1,1]²（右手 y 朝上），由上面的 cx/cy/w/h 映到印面。
             結構＝虍（上）＋几（下）：
               ① 左上短豎 ② 長橫 ③ 左長豎（厂的撇拉直，低多邊形不做曲線）
               ④ 內上橫 ⑤ 中短豎 ⑥ 內下橫 ⑦ 右豎鉤 ⑧ 左下腳（儿左）⑨ 右下腳底
             九畫在 780×360 的格子上仍是「一個方塊字」而不是符號，這是要的效果——
             讀者要讀出的是「印上刻著字」，不是逐筆辨認。 */
          const HU = [
            [-0.56, 0.60, -0.32, 1.00], // ① 左上短豎
            [-0.90, 0.34, 0.64, 0.56], // ② 長橫
            [-0.90, -0.62, -0.66, 0.56], // ③ 左長豎
            [-0.42, 0.00, 0.64, 0.20], // ④ 內上橫
            [-0.12, 0.00, 0.10, 0.42], // ⑤ 中短豎
            [-0.42, -0.40, 0.84, -0.20], // ⑥ 內下橫
            [0.60, -0.40, 0.84, 0.20], // ⑦ 右豎鉤
            [-0.34, -1.00, -0.10, -0.40], // ⑧ 左下腳
            [0.60, -1.00, 0.84, -0.40], // ⑨ 右下腳
            [0.24, -1.00, 0.84, -0.80], // ⑨b 右下腳底（几的橫折）
          ];
          const rect = (x0, y0, x1, y1) => new THREE.Shape([new THREE.Vector2(x0, y0), new THREE.Vector2(x1, y0), new THREE.Vector2(x1, y1), new THREE.Vector2(x0, y1)]);
          const shapes = HU.map(([x0, y0, x1, y1]) => rect(g.cx + x0 * g.w, g.cy + y0 * g.h, g.cx + x1 * g.w, g.cy + y1 * g.h));
          const gg = new THREE.ShapeGeometry(shapes);
          gg.translate(0, 0, depth / 2 + 0.022);
          bow(gg);
          mGlyph = new THREE.Mesh(gg, MAT_SOLID.clone());
          mGlyph.material.color.setHex(o.glyphColor === undefined ? (o.inkColor === undefined ? st.colors.ink : o.inkColor) : o.glyphColor);
          mGlyph.material.opacity = op;
          BLOCK_MADE.add(mGlyph);
          grp.add(mGlyph);
        }
        grp.scale.setScalar(size);
        if (pos) grp.position.copy(pos);
        // 朝向凍在 spawn 當下：大致朝鏡頭，再壓一個俯仰與偏擺讓厚度側邊露出來（不逐幀重排＝不是 billboard）
        grp.quaternion.copy(camera.quaternion);
        grp.rotateX(-THREE.MathUtils.degToRad(o.tiltDeg === undefined ? 16 : o.tiltDeg));
        grp.rotateY(THREE.MathUtils.degToRad(o.yawDeg === undefined ? -24 : o.yawDeg));
        if (o.roll) grp.rotateZ(o.roll);
        grp.userData.fxParts = mGlyph ? [mBody, mFace, mGlyph] : [mBody, mFace]; // st.fade／st.alpha 三片一起
        grp.userData.fxFace = mFace; // 編舞要改面板顏色（例：印文「燒」出來）時的把手
        st.spawn(grp, (o.follow ? 'mark:' : 'emblem:') + kind);
        // 同 st.mark 的註解：印記也要留下 'emblem:<kind>'，否則「tier 1／2 都要有 emblem」在只有印記的招上假綠
        run.sig.meshes.add('emblem:' + kind);
        run.sig.emblems.add(kind);
        if (o.follow) st.stick(grp, o.follow, o);
        return grp;
      },
      /** 把一個已 spawn 的物件黏在某尊身上（之後逐幀跟著那個部位走）。
       *  飛行物**落下來就變成印記**時用它——不然「飛的那一枚」與「留下的那一枚」要各生一份，draw call 加倍。 */
      stick(mesh, fig, o = {}) {
        const at = o.at || 'chest', off = o.off || null;
        const get = (out) => {
          if (at === 'top') st.top(fig, out);
          else if (at === 'foot') st.foot(fig, out);
          else st.worldOf(fig, 'Chest', out);
          if (off) out.add(off);
          return out;
        };
        get(mesh.position);
        run.follow.push({ mesh, get, tmp: new THREE.Vector3() });
        touch(fig);
        return mesh;
      },
      /** ★群體紙紮道具（2026-09-12 招式演出卷，語彙檔 §A8 指定的新積木）★
       *  N 件同型小道具 ＝ **1 個 draw call**（A6 的預算：每招峰值 ≤ idle+25）。
       *
       *  與 st.icons 的三個差別：
       *   ① **有厚度＋翹曲**（ExtrudeGeometry ＋ paperBow，紙紮規範 §A4 第 1／3 條），
       *      不是 st.icons 那種平面 ShapeGeometry ＋ 底板。
       *   ② **群體位移掛在 InstancedMesh 物件本身**（`obj.position`），實例只帶局部散開量。
       *      ★這不是效能潔癖，是因果三段的 travel 量得到★：`evalPhases()` 量的是 `mesh.position`，
       *      而 InstancedMesh 的 position 永遠停在原點、實例位移藏在 matrix 裡（§A5 那個踩過的坑）。
       *      27 支招裡凡是「一群道具飛過去」的都照這個寫法，不再逐招手刻（E 原型手刻過一次）。
       *   ③ **不進 run.bbi**：群體小件不逐幀朝鏡頭（逐幀正對鏡頭就是「貼紙」的成因），
       *      朝向由編舞寫進 items[i].q。
       *
       *  ★單件小道具**不做**面板墨線邊（§A4 第 2 條的例外，本卷交製作人覆核）★
       *  墨線邊要「ink 本體 ＋ 縮 0.74 的 key 面板」兩片，而 InstancedMesh 一個材質只畫得出一種顏色
       *  ⇒ 兩片就是 2 個 draw call、幾何量也加倍，違反 ① 的立意。而這種小件在 844×390 上只有 10px 上下，
       *  那一圈邊本來就看不到——E 定稿的九片金箔就是單色薄片，製作人已簽。
       *  厚度與翹曲兩條照做，所以它仍是「實體」而不是平面 billboard（§3 的禁區守得住）。
       *
       *  o = { shape:'flake'|'emblem', color, opacity, depth, warp, k, ratio }
       *    shape  'flake'（預設）＝紙片矩形，給金箔／香灰／紙錢這種顆粒流（丙 香火家族）；
       *           'emblem'＝走該 kind 的外框頂點表，給旗／帆／珠／岩塊這種「看得出是什麼」的小件。
       *    k      相對倍率，單件尺寸 ＝ `ICON.markSizeOf(kind) × k`。**不是尺寸的第二份來源**：
       *           ICON 的值仍在乘積裡（同 st.icons 的 `sizes` 那一條，見 fxvocab.test.mjs 的註解）。
       *    ratio  flake 的寬高比（預設 0.72 ＝ E 的金箔 0.105/0.145）。
       *  回傳 { obj, items, write, size }：
       *    obj    InstancedMesh（已 spawn，fxKind='prop:<kind>'）——**群體位移改 obj.position**
       *    items  長度 n 的陣列：{ p:Vector3 局部位置, q:Quaternion 朝向, s:縮放倍率（0＝還沒出現）}
       *    write() 把 items 寫進 instanceMatrix（改完 items 要叫一次） */
      paperProps(kind, n, o = {}) {
        const size = iconSizeSrc('st.paperProps', kind, o, ICON.markSizeOf(kind)) * (o.k === undefined ? 1 : o.k);
        const count = Math.max(1, n | 0);
        const depth = o.depth === undefined ? 0.16 : o.depth;
        const warp = o.warp === undefined ? 0.14 : o.warp;
        let shape;
        if (o.shape === 'emblem') shape = paperShape(EMBLEMS.EMBLEM, kind, 'st.paperProps');
        else {
          const w = (o.ratio === undefined ? 0.72 : o.ratio) * 0.5;
          shape = new THREE.Shape([new THREE.Vector2(-w, -0.5), new THREE.Vector2(w, -0.5), new THREE.Vector2(w, 0.5), new THREE.Vector2(-w, 0.5)]);
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
        geo.translate(0, 0, -depth / 2);
        paperBow(geo, warp);
        const mat = MAT_SOLID.clone();
        mat.color.setHex(o.color === undefined ? st.colors.key : o.color);
        mat.opacity = o.opacity === undefined ? 1 : o.opacity;
        const im = new THREE.InstancedMesh(geo, mat, count);
        im.frustumCulled = false; // 實例中心在原點，包圍盒對不上，不關會被整批剔掉（同 st.icons）
        const items = [];
        for (let i = 0; i < count; i++) items.push({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 0 });
        const write = () => {
          for (let i = 0; i < count; i++) {
            const it = items[i];
            _m4.compose(it.p, it.q, _s3.setScalar(size * it.s));
            im.setMatrixAt(i, _m4);
          }
          im.instanceMatrix.needsUpdate = true;
        };
        write(); // 開場全部 s=0＝看不見，編舞再逐幀長出來
        /* ★場景掃描的放行（r3 N-1 的同一條）★：`shape:'emblem'` 走的是 `EMBLEM[kind]` 的外框頂點表，
           擠出之後頂點陣列與剪影那份不同（指紋照理對不上），但**這條放行不靠「照理」**——
           它與 st.paperStamp 的三片是同一類東西：積木自己造的、確實用到徽記輪廓、不是手造的第二顆徽記。
           ★它同樣**不在尺寸鎖裡**（`st.iconScale` 只吃 SIZED 的物件），與 paperStamp 一起列在
           README 的「已知未涵蓋」★——單件尺寸的唯一來源是 `ICON.markSizeOf(kind) × o.k`，
           由本函式一處算完寫進 instanceMatrix，編舞拿不到那個乘積去改。 */
        BLOCK_MADE.add(im);
        st.spawn(im, 'prop:' + kind);
        return { obj: im, items, write, size };
      },
      /** 因果三段的打點。記不記進 run.sig.phases 由**實際條件**決定（vocab.js 的 PHASE_GATE），不是喊了就算。 */
      phase(name) {
        if (name !== 'windup' && name !== 'travel' && name !== 'react') return false;
        const c = { name, at: run.vt, ok: false, bone: 0, model: 0, moved: 0, need: 0, until: Infinity, base: new Map(), solo: false };
        if (name === 'windup') c.until = run.vt + PHASE_GATE.windupMs * run.k;
        else if (name === 'react') { c.until = run.vt + PHASE_GATE.reactMs * run.k; run.wraps.forEach((w) => c.base.set(w, { p: w.mo.p.clone(), s: w.mo.s })); }
        else {
          c.need = PHASE_GATE.travelFrac * run.travelDist;
          /* ★基準一定要在打點當下抓★：打點多半發生在前一段 tween 的 done 裡，而同一幀後面還有
             飛行 tween 會把位置改掉。留給 evalPhases 惰性抓就會抓到「已經飛了半格」的位置，
             量到的位移少一格（實測千里眼因此從 1.38 掉到 0.70，硬生生低於門檻）。 */
          run.meshes.forEach((m) => { if (m && m.position) c.base.set(m, m.position.clone()); });
        }
        run.phaseClaims.push(c);
        return true;
      },
      cancelled() { return run.done; },
    };
    return st;
  }

  function start(det) {
    // v0.54：招式時長只有一個來源＝事件帶的 detail.ms（index.html 的 PW_FX.TRAIT_MS_BY_TIER）。
    // 舊版的 `Number(det.ms) || 900` 退路已刪：那是第二份事實來源，改了 index.html 這裡會靜默沿用舊值。
    if (!Number.isFinite(det.ms) || det.ms <= 0) throw new Error('ys:fx-trait 缺 detail.ms（招式時長只能由 PW_FX.TRAIT_MS_BY_TIER 帶進來）');
    if (!Number.isFinite(det.baseMs) || det.baseMs <= 0) throw new Error('ys:fx-trait 缺 detail.baseMs（等比基準只能由 PW_FX.TIER_BASE_MS 帶進來）');
    const tier = (det.tier | 0) === 1 || (det.tier | 0) === 3 ? det.tier | 0 : 2;
    const fn = (tier === 1 && TRAIT_MOVES_SHORT[det.trId]) || TRAIT_MOVES[det.trId];
    if (typeof fn !== 'function') return null;
    const live = (side) => {
      try { return (duelFigures.figuresOf(side) || []).filter((f) => f && f.skin === 'creature' && typeof f.ready === 'function' && f.ready() && f.group.visible); } catch (e) { return []; }
    };
    const actor = live(det.side), target = live(det.foeSide);
    if (!actor.length) return null;
    if (rig) { const c = centroid(actor); rigGoal = rigBase.clone(); rigGoal.x += (c.x - rigBase.x) * TFX.focusK; rigGoal.z += (c.z - rigBase.z) * TFX.focusK; }
    const run = {
      trId: det.trId, t: 0, ms: Math.max(100, Number(det.ms)), tier, done: false,
      tweens: [], timers: [], meshes: [], wraps: new Set(), seed: seedCounter++,
      vt: 0, horizon: 0, rate: 1, // 虛擬時間／目前排到的最遠點／加速倍率（1＝照編舞原節奏）
      acts: 0, inFlinch: false, // F10：非 flinch 的補間條數
      reduced: det.reduced === undefined ? prefersReduced() : !!det.reduced,
      // v0.55：徽記逐幀朝鏡頭（bb＝單枚 Mesh、bbi＝群體 InstancedMesh）、印記跟著受招方走、因果三段的打點
      phaseClaims: [], bb: [], bbi: [], follow: [], sized: [], caster: null, actorSet: null, travelDist: 1,
      sig: { trId: det.trId, bones: new Set(), meshes: new Set(), emblems: new Set(), target: false },
    };
    run.k = run.ms / Number(det.baseMs); // 三個絕對常數的等比係數（tier 1 ≈0.289、tier 2 =1、tier 3 ≈1.556）
    run.maxRate = 1; // 這一套實際用過的最高加速倍率（F2 的 rateOK：短版不得 >1.0）
    run.fuse = run.ms * TFX.fuseMul;
    run.promise = new Promise((r) => { run.resolve = r; });
    const stage = makeStage(run, actor, target, det);
    try { fn(stage); } catch (err) { stats.thrown++; finish(run); return null; }
    runs.add(run);
    return run;
  }

  function finish(run) {
    if (run.done) return;
    run.done = true;
    runs.delete(run);
    run.meshes.forEach((m) => {
      scene.remove(m);
      // 遞迴：spawn 進來的 Group（如斬瘟的劍光樞軸）子節點也要釋放（覆審 MEDIUM-1）
      // ★v0.55：徽記的 geometry 是「一個 kind 建一次、全場共用」的（emblems.js 的 Map 快取），
      //   dispose 掉它會讓下一次用到同一個 kind 的招在 GPU 上拿到空 buffer。共用的一律跳過。
      try { m.traverse((c) => { if (c.isInstancedMesh) c.dispose(); if (c.geometry && !(c.geometry.userData && c.geometry.userData.fxShared)) c.geometry.dispose(); if (c.material) c.material.dispose(); }); } catch (e) { /* 已釋放 */ }
    });
    run.meshes.length = 0;
    run.tweens.length = 0; run.timers.length = 0;
    run.bb.length = 0; run.bbi.length = 0; run.follow.length = 0; run.sized.length = 0;
    run.wraps.forEach((w) => {
      w.runs.delete(run);
      if (!w.runs.size) { unwrap(w); return; }
      // 同一尊還有別套在演（hitstop 讓 3D 時間慢於 index 的 setTimeout 時會重疊）：把本套留下的覆寫值歸零，
      // 別套的 tween 下一幀會重寫自己要的值（覆審 LOW-3）
      w.over.forEach((o) => { o.rot.set(0, 0, 0); o.pos.set(0, 0, 0); o.scl = 1; });
      w.mo.p.set(0, 0, 0); w.mo.r.set(0, 0, 0); w.mo.s = 1; w.rimMul = 1;
    });
    run.wraps.clear();
    if (run.sped) stats.sped++;
    lastSig = { trId: run.sig.trId, bones: Array.from(run.sig.bones).sort(), meshes: Array.from(run.sig.meshes).sort(), target: run.sig.target, t: Math.round(run.t), horizon: Math.round(run.horizon), sped: !!run.sped, cut: !!run.cut,
      // v0.54 機械驗收：ms／tier 防「--tier=1 其實還在跑 900」、maxRate 防「靠加速硬擠」、acts＝F10 的動作數
      ms: run.ms, tier: run.tier, maxRate: +run.maxRate.toFixed(4), acts: run.acts,
      // v0.55 L1／L2 的機械抓手：徽記 kind（雙射）與「實際成立」的因果段
      emblems: Array.from(run.sig.emblems).sort(),
      phases: run.phaseClaims.filter((c) => c.ok).map((c) => c.name).filter((n, i, a) => a.indexOf(n) === i),
      phaseDetail: run.phaseClaims.map((c) => ({ name: c.name, ok: c.ok, bone: +c.bone.toFixed(4), model: +c.model.toFixed(4), moved: +c.moved.toFixed(4), need: +c.need.toFixed(4), solo: !!c.solo })),
      travelDist: +run.travelDist.toFixed(3) };
    stats.finished++;
    if (run.resolve) run.resolve(true);
  }
  function cancelAll() { Array.from(runs).forEach(finish); if (rig) rig.position.copy(rigBase); /* SKIP：燈組立刻回位 */ }

  /* ★覆審 r4 MEDIUM-1★：這三個 catch 的用意是「一段壞了不擋整招」，**不是**「一段壞了沒人知道」。
     舊版靜默吞掉的後果實測得到：違規那一幀起整條 tween 停演（maxD 由 1.7502 掉到 1.2581），
     而 alive／restored／clean／fill／err 全綠——換一支不讀 sizeGuard 的治具就完全看不見。
     更糟的是被鎖的屬性（scale／geometry／matrixAutoUpdate 的 `configurable:false`）被
     `Object.defineProperty` 硬蓋時丟的是 **TypeError**，不經過我們的記帳線。
     現在一律記進 `stats.tweenErrors`／`tweenErrorMsg`，三支治具都把它納入總判定。
     行為不變（該段仍然只死那一條，整招照演），變的只是「看得見」。 */
  function noteThrow(run, where, e) {
    stats.tweenErrors++;
    if (!stats.tweenErrorMsg) stats.tweenErrorMsg = `[${run.trId}/${where}] ` + String((e && e.message) || e).slice(0, 400);
  }

  function update(dt) {
    burst.update(dt);
    // 出招側打光：有招在演就往 rigGoal 收斂，沒有就回 base（指數收斂，focusLerp 決定快慢）
    if (rig) rig.position.lerp(runs.size && rigGoal ? rigGoal : rigBase, Math.min(1, dt * TFX.focusLerp));
    if (!runs.size) return;
    const ms = dt * 1000;
    for (const run of Array.from(runs)) {
      run.t += ms;
      // 加速倍率＝剩餘虛擬工作量／剩餘牆鐘時間（≥1）：排程塞得下就照原節奏，塞不下就整套等比變快。
      // 每幀重算：timer 回呼晚排進來的 tween 會把 horizon 往後推，rate 跟著升
      // 目標是提前 endMargin 抵達 horizon（不壓線），倍率夾在 [1, rateMax]
      // 邊距至少 1.5 幀（10fps 時 60ms 不到一幀，horizon 上的 timer 仍會在收工幀才燒）；最後兩幀內不套天花板，寧可快也不要砍
      const margin = Math.max(TFX.endMargin * run.k, ms * 1.5);
      const remainW = run.ms - margin - run.t + ms;
      const cap = (run.ms - run.t) <= ms * 2 ? Infinity : TFX.rateMax;
      run.rate = remainW > 1 ? Math.min(cap, Math.max(1, (run.horizon - run.vt) / remainW)) : Math.min(cap, Math.max(1, run.rate));
      if (!Number.isFinite(run.rate)) run.rate = 1;
      run.vt += ms * run.rate;
      if (run.rate > run.maxRate) run.maxRate = run.rate;
      if (run.rate > 1.0001) run.sped = true;
      for (const tm of run.timers) if (!tm.fired && run.vt >= tm.at) { tm.fired = true; try { tm.fn(); } catch (e) { noteThrow(run, 'timer', e); } }
      run.timers = run.timers.filter((tm) => !tm.fired);
      for (const tw of run.tweens) {
        if (run.vt < tw.start) continue;
        const t = Math.min(1, (run.vt - tw.start) / tw.ms);
        try { tw.update(t, tw.ease(t)); } catch (e) { tw.dead = true; noteThrow(run, 'tween', e); }
        if (t >= 1) { tw.dead = true; if (tw.done) { try { tw.done(); } catch (e) { noteThrow(run, 'done', e); } } }
      }
      run.tweens = run.tweens.filter((tw) => !tw.dead);
      run.wraps.forEach(apply);
      // v0.55：徽記朝鏡頭、印記跟著受招方走、因果三段逐幀判定（順序在 apply 之後，量到的是這一幀的覆寫值）
      for (let i = 0; i < run.bb.length; i++) faceCamera(run.bb[i]);
      for (let i = 0; i < run.bbi.length; i++) faceCameraInstanced(run.bbi[i]);
      for (let i = 0; i < run.follow.length; i++) { const f = run.follow[i]; f.get(f.tmp); f.mesh.position.copy(f.tmp); }
      if (run.phaseClaims.length) evalPhases(run);
      // ★按效果寫的那一道（覆審 r4 HIGH-1）★：排在最後，量到的是這一幀真正要送去畫的世界矩陣
      if (run.sized.length) auditSizes(run);
      // 時間到就收工（排程已壓縮進預算，剩下的只會是同一幀補到 t=1 的尾巴）；fuse 留作最後保險
      if (run.t >= run.fuse) { stats.fused++; finish(run); }
      else if (run.t >= run.ms) { if (run.tweens.length || run.timers.length) { stats.cut++; run.cut = true; } finish(run); }
    }
  }

  /** 【積木接收端】ys:fx-trait：{trId, side, foeSide, fac, power, ms}。同步派送，派完立刻讀 detail。 */
  document.addEventListener('ys:fx-trait', (e) => {
    const d = (e && e.detail) || {};
    stats.asked++;
    const run = start(d);
    if (run) { d.handled = true; d.done = run.promise; stats.handled++; } else { d.handled = false; d.done = null; stats.fallback++; }
  });
  document.addEventListener('ys:fx-trait-cancel', cancelAll);
  document.addEventListener('ys:duel-end', cancelAll);

  return {
    update, cancelAll, stats,
    moves: Object.keys(TRAIT_MOVES),
    active() { return runs.size; },
    /** 最近一套演完的簽章 {trId, bones[], meshes[], target}（驗收 T-3 用；純記錄） */
    lastSig() { return lastSig; },
    /** 目前還掛著包裝的 figure 數（驗收 T-2 ③：演完應為 0） */
    wrapped() { return wraps.size; },
    /** 燈組離基準位多遠（驗收 C-2） */
    rigOffset() { return rig ? rig.position.distanceTo(rigBase) : 0; },
    /** v0.55 診斷：材質模板數（MAT_GLOW／MAT_LINE／MAT_SOLID）。★數陣列長度，不寫死數字★（覆審 r1 M3）。 */
    matTemplates: MAT_TEMPLATES.length,
    /** v0.55 診斷：三支模板**實際**佔用幾支 GPU program（凍結檔 Q10「program 2→3」的實測對照）。
     *  取的是 renderer.properties.get(mat).currentProgram.id——只有那支材質真的被畫過才有值
     *  （三支模板各有一個常駐桌底的暖身物件，所以 render 一幀之後就會有）。
     *  拿不到 renderer 或還沒畫過就回 null，**不給預設值**：null 代表「沒量到」，不是「2」。 */
    matPrograms(renderer) {
      const r = renderer || opts.renderer;
      if (!r || !r.properties) return null;
      const rows = MAT_TEMPLATES.map(([name, m]) => {
        const p = r.properties.get(m);
        return { name, program: p && p.currentProgram ? p.currentProgram.id : null };
      });
      const ids = rows.map((x) => x.program).filter((x) => x !== null);
      return { templates: MAT_TEMPLATES.length, rows, measured: ids.length, distinct: new Set(ids).size };
    },
    /** r4 修補批：徽記世界尺寸的執行期斷言（三支治具都讀這一份）。
     *  判紅條件：violations>0 ／ locked!==made ／（made>0 時）audits===0。 */
    sizeGuard,
    emblemStats() { try { return EMBLEMS.stats(); } catch (e) { return null; } },
    burstPoints: burst.points,
  };
}
