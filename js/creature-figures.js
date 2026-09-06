// 妖市 3D 環境層 — 紙紮夜戰 3D 生物人形工廠（Layer 4 換皮版，2026-09-04）
//
// 職責：把 anyCreature 產出的蒙皮 GLB（assets/creatures/*.glb）包成
// duel-figures.js:92-124 所定義的「換皮介面」，讓對決場景可以直接
//   createDuelFigures(scene, camera, { makeFigure: () => makeCreatureFigure({ glbUrl, faction }) })
// 換掉原本的四層剪影人形，一行都不用改 duel-figures.js。
//
// 介面（批 1 五件 ＋ 本卷加的四件）：
//   group / shadow / setPortrait(tex) / setCloth(hex) / setRim(opacity) / ready()   ← 批 1 既有
//   parts        骨骼名 → THREE.Bone（給演出層抓頭、抓嘴、掛特效）
//   play(name, opts)   播 GLB 內建的 clip（idle / move / attack）
//   burn()       回 Promise：dissolve 掃過＋燈籠色燒邊＋灰燼粒子，結束後 group 不可見
//   update(dt)   每幀呼叫一次（mixer／燒毀／灰燼／環境特效都靠它推進）
//   bounds()     模型的本地包圍盒（GLB 載完才有；特效與掛件要靠它決定尺寸）
//   setFactionFx(faction, opts)  三系環境特效（見 attachFactionFx）
//
// 本檔另外導出兩件「戲台 look-dev」的東西（2026-09-04 look-dev 卷）：
//   createFigureLightRig(opts)   key／fill／rim 三燈組，掛進任何 scene 都成立
//   attachFactionFx(figure, f)   香火／祖靈／陰氣三系的環境粒子
//
// 邊界：本檔不讀寫任何遊戲狀態（S / CFG / trace()），不耗任何亂數（灰燼走 particles.js
// 自帶的決定性 LCG，種子由呼叫端給；環境特效走本檔自己的同款 LCG）。
// 材質一律頂點色，不載任何外部貼圖。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
// 快取破除接力（接線卷）：本檔由 renderer.js 用 './creature-figures.js?v=<VERSION>' 載進來，
// 相對 import 要接同一個查詢字串，particles.js 才不會被載成兩份（理由見 renderer.js 檔頭）。
// 預覽頁直接 import 本檔（沒帶 ?v）時 V 是空字串，行為不變。
const V = new URL(import.meta.url).search;
const { createImpactBurst, SPARK_COLOR } = await import('./particles.js' + V);

// 全部【試玩必調】。
// look-dev 卷把邊光從「全身一圈細鑲邊」改成「偏向背光那一側的寬邊」：
// 試作截圖（2026-09-04-creature-pilot-idle.png）裡整隻虎被燈籠橘染成一團，
// 輪廓和背景的夜紫接在一起讀不出形體，細鑲邊補不回來，要靠寬邊＋方向性才切得開。
const RIM = {
  power: 2.6, // fresnel 指數：越大邊光越細（3.4 → 2.6：邊要有厚度才切得開輪廓）
  strength: 1.05, // 基準亮度（setRim 會再乘一個倍率上去；0.62 → 1.05）
  // 正面也留一點點系色染色，不然轉正時邊光整個消失。這一項是**整隻身上到處都加**的常數，
  // 所以它跟 strength 是相乘的：strength 從 0.62 拉到 1.05 之後 ambient 還留 0.03，
  // 等於全身平白多一層 0.032 的系色——陰氣系的側身、四肢就整片泛青（fx-yinqi 那批）。
  // 壓到 0.012 之後全身的常數染色反而比舊版（0.62×0.025＝0.0155）還低，邊光卻更強。
  ambient: 0.012,
  // 邊光的來向，單位是**相機空間**（相機看向 −Z、+Y 朝上、+X 朝畫面右）。
  // 用相機空間是刻意的：戲台鏡頭固定，這樣不必逐幀把世界方向轉進 view space，
  // 也就不需要在 update() 裡多一份矩陣運算 × 26 隻。預設對齊 FIGURE_LIGHT.rim 的擺位（右上後）。
  dir: [0.40, 0.60, -0.69],
  wrap: 0.15, // 背光側以外還留幾成邊光：0＝只有背光那側有、1＝退回舊的全身鑲邊
};
// 材質名 → 自發光。眼／口內／glow_* 交給 bloom（threshold 0.5，見 js/bloom.js）去吃。
// 自發光的顏色**取自頂點色**：anyCreature 的 GLB 每顆材質 baseColorFactor 都是白的，
// 金瞳／火口的顏色全在 COLOR_0 裡，直接拿 material.color 當 emissive 會得到一顆白燈泡。
const GLOW = {
  test: /^eye(_|$)|^mouth_glow(_|$)|^glow_/i,
  intensity: 2.8, // × 頂點色的線性值；要衝過 bloom 的 threshold 0.5 才會發光
  rim: 0.0, // 發光材質不再疊邊光，不然亮部糊成一團看不出瞳孔
};
const GHOST = {
  test: /^ghost_/i,
  opacity: 0.62, // 霧裾／水草／髮瀑：看得到後面的戲台但仍有形【試玩必調】
};
const BURN = {
  ms: 1100, // dissolve 從 0 掃到 1 的時間
  edge: 0.13, // 燒邊寬度（在雜訊值域上量）
  glow: 3.4, // 燒邊發光倍率（要衝過 bloom 的 threshold 0.5 才會發光）
  color: 0xf0a840, // 燈籠光暈（對齊 assets/theme.css 的 --c-lantern-glow）
  noiseScale: 7.0, // 雜訊頻率（相對模型本地座標）
  heightBias: 0.42, // 由下往上燒的權重：0＝純亂數、1＝純由下往上
  ashAt: [0.10, 0.30, 0.52, 0.74], // 灰燼在燒到這幾個進度時各噴一批
  ashPerPuff: 34,
};
const SHADOW_COLOR = 0x05030c;
const RIM_FALLBACK = 0xf0a840;

/* ── 接線卷（2026-09-05）：載入時的體型正規化、ab→GLB 映射、各隻專屬的腳下環境 ──────
 * 戲台相機沒有正規化（shield 回修 3 曾被切頭），所以在工廠這一層把「太高」的壓回來。
 * 只縮不放：tiger_c 只有 1.0 高是矮胖的虎，不是做錯；boat 0.79 是臥式的船。
 * min.y<0 的抬到 0（nail −0.09 會陷進桌面）；min.y>0 的不動——那是 haunt 的飄浮設計。 */
const NORM = { maxH: 1.2 };
/** POOL 的 ab → assets/creatures 檔名（沒列的同名）。tiger.glb／tiger_a／tiger_b 是試作與 look-dev 遺留，正式用量產模板 tiger_c。 */
export const CREATURE_GLB = { tiger: 'tiger_c' };
export function creatureGlbUrl(ab, base = 'assets/creatures/') {
  return base + (CREATURE_GLB[ab] || ab) + '.glb';
}
/** 各隻專屬的腳下環境。buoy：浮標之所以認得出來是因為它泡在水裡（gaps.md buoy 列，使用者 09-05 裁定甲）。 */
const CREATURE_GROUND = { buoy: 'water' };
// 水面【試玩必調】：一片暗青的圓盤＋一圈微光邊＋三圈往外擴的漣漪。全部掛在 figure.group 腳下，
// 所以妖縮放、燒毀（setFade）都自動跟著。半徑相對模型包圍盒的腳印（fit）。
const WATER = {
  // 第一版（暗青 0x14323c、半徑 1.15×腳印）盲讀成「腳邊一圈光暈／陰影圈」：跟暗紅桌面同一個明度、
  // 又只比陰影大一點，讀不出是水。要讀成水得靠三件事：**比桌面亮而且偏藍**（水在夜裡反光）、
  // **明顯大過影子**（一灘，不是一圈）、**漣漪粗而亮**（動的同心圓是水的簽名）。
  color: 0x1e5a78, // 夜水：藍青、比桌面亮
  opacity: 0.78,
  edgeColor: 0x8fd6ff, // 水緣反光：淺藍白（bloom 會抓一點）
  edgeOpacity: 0.5,
  radius: 2.1, // × 腳印半徑：一灘水，明顯大過影子
  rings: 3,
  period: 2.0, // 一圈漣漪從中心擴到邊要幾秒
  ringOpacity: 0.9,
  ringWidth: 0.11, // 環寬（相對水面半徑）
  bob: 0.012, // 水面隨波微微起伏的幅度（相對高度）
};

// 同一份 GLB 只抓一次：26 隻分頭載入時，同一隻的多個實例共用一份 gltf，
// 再用 SkeletonUtils.clone 各自複製骨架（clone 會連 skeleton 一起重建，
// 直接 object3D.clone() 會讓兩個實例共用同一副骨頭、動起來互相拉扯）。
const glbCache = new Map();
let loader = null;

function loadGlb(url) {
  if (!glbCache.has(url)) {
    if (!loader) loader = new GLTFLoader();
    const p = loader.loadAsync(url);
    // 失敗的不留在快取：網路抖一次不該讓這隻整個 session 都載不到（覆審 LOW）
    p.catch(() => { if (glbCache.get(url) === p) glbCache.delete(url); });
    glbCache.set(url, p);
  }
  return glbCache.get(url);
}

/* ── 邊光 ＋ dissolve 的 shader 注入 ─────────────────────────────────────────
 * 不換材質、不寫第二支 pass：直接在 MeshStandardMaterial 的既有 shader 尾巴
 * 疊一段 fresnel emissive 與一段 dissolve discard。這樣 GLB 烘進 COLOR_0 的
 * per-vertex AO 與頂點色全部原封不動保留，燈光也還是場景那四盞燈籠。
 * ────────────────────────────────────────────────────────────────────────── */
// 雜訊（dissolve 用）：本體與外殼描邊共用同一組函式，燒毀才會逐像素在同一個位置破。
const NOISE_GLSL = `
float hashR(vec3 p){
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noiseR(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hashR(i + vec3(0,0,0)), hashR(i + vec3(1,0,0)), f.x),
                 mix(hashR(i + vec3(0,1,0)), hashR(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hashR(i + vec3(0,0,1)), hashR(i + vec3(1,0,1)), f.x),
                 mix(hashR(i + vec3(0,1,1)), hashR(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

const PARS = `
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;
uniform vec3 uRimDir;
uniform float uDissolve;
uniform vec3 uBurnColor;
uniform vec2 uBurnY;
varying vec3 vLocalPosR;
` + NOISE_GLSL;

// 燒毀的切口：本體與外殼描邊共用這一段（同一條門檻、同一組雜訊），外殼才不會比本體早燒完或晚燒完。
const DISSOLVE_CUT = `
  float _h = clamp((vLocalPosR.y - uBurnY.x) / max(uBurnY.y - uBurnY.x, 1e-4), 0.0, 1.0);
  float _n = mix(noiseR(vLocalPosR * ${BURN.noiseScale.toFixed(1)}), _h, ${BURN.heightBias.toFixed(2)});
  if (uDissolve > 0.0 && _n < uDissolve) discard;`;

const TAIL = `
{` + DISSOLVE_CUT + `
  vec3 _N = normalize(normal);
  float _rim = pow(1.0 - clamp(dot(_N, normalize(vViewPosition)), 0.0, 1.0), uRimPower);
  // 方向性：只有「面向 rim 燈那一側」的邊吃滿，其餘按 wrap 打折。
  // 舊版是無方向的全身鑲邊，正面也一樣亮，看起來像鍍了一層塑膠殼而不是背後有光。
  float _face = clamp(dot(_N, uRimDir) * 0.5 + 0.5, 0.0, 1.0);
  _rim *= mix(${RIM.wrap.toFixed(2)}, 1.0, _face);
  gl_FragColor.rgb += uRimColor * (_rim + ${RIM.ambient.toFixed(2)}) * uRimStrength;
  if (uDissolve > 0.0) {
    float _e = smoothstep(uDissolve, uDissolve + ${BURN.edge.toFixed(2)}, _n);
    gl_FragColor.rgb = mix(uBurnColor * ${BURN.glow.toFixed(1)}, gl_FragColor.rgb, _e);
  }
}`;

// 自發光取頂點色：`emissive` uniform 上傳的是 material.emissive × emissiveIntensity，
// 這裡再乘一次 COLOR_0，金瞳才是金的而不是白的。非發光材質 emissive 是黑的，乘什麼都還是黑，
// 所以這段對所有材質注入同一份程式碼是安全的（也才保得住下面那把固定的 program cache key）。
// USE_COLOR / USE_COLOR_ALPHA 兩個分支都要寫：三個造型方案的 GLB 不保證 COLOR_0 都是 vec3。
const EMISSIVE_TAIL = `
#if defined( USE_COLOR_ALPHA )
  totalEmissiveRadiance *= vColor.rgb;
#elif defined( USE_COLOR )
  totalEmissiveRadiance *= vColor;
#endif`;

/** 把一顆 MeshStandardMaterial 改造成「頂點色＋邊光＋可燒毀（＋眼／口內自發光）」。回傳它的 uniform 控制點。 */
function dressMaterial(mat, burnY) {
  const glow = GLOW.test.test(mat.name || '');
  const u = {
    uRimColor: { value: new THREE.Color(RIM_FALLBACK) },
    uRimPower: { value: RIM.power },
    uRimStrength: { value: glow ? GLOW.rim : RIM.strength },
    uRimDir: { value: new THREE.Vector3(...RIM.dir).normalize() },
    uDissolve: { value: 0 },
    uBurnColor: { value: new THREE.Color(BURN.color) },
    uBurnY: { value: new THREE.Vector2(burnY[0], burnY[1]) },
  };
  u.glow = glow; // 給 setRim 用：發光材質不跟著整體邊光倍率走
  if (glow) {
    mat.emissive = new THREE.Color(1, 1, 1);
    mat.emissiveIntensity = GLOW.intensity;
  }
  // haunt 體型的下半身：材質名 ghost_* → 半透明（接線卷前置，2026-09-04；量產凍結檔體型語彙）
  if (GHOST.test.test(mat.name || '')) {
    mat.transparent = true;
    mat.depthWrite = false;
    mat.opacity = GHOST.opacity;
    u.ghost = true;
  }
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocalPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalPosR = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + PARS)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + EMISSIVE_TAIL)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>' + TAIL);
  };
  // 注入的 GLSL 對所有實例都一樣，程式可以共用；uniform 是逐材質上傳的，所以
  // 每隻的邊光色與 dissolve 進度互不干擾。快取鍵要固定，不然 three 會為每顆材質
  // 各編一支一模一樣的 program（26 隻 × 十幾顆材質＝上百次編譯，手機會卡）。
  mat.customProgramCacheKey = () => 'yaoshi-creature-rim-burn';
  mat.needsUpdate = true;
  return u;
}

/* ── 反轉外殼描邊（後處理卷 P-1，2026-09-06）─────────────────────────────────
 * 為什麼要它：剪影三次實測（docs/experiments/2026-09-05-silhouette-test-*.md）證明「剪影」與
 * 「主色」都分不出三系，ART_BIBLE.md:75 把陣營辨識的責任交給本卷；使用者裁定描邊色＝系色常駐。
 *
 * 做法：每一顆本體 mesh 底下再掛一顆 back-face、沿法線外擴的同款 mesh。三件事是刻意的：
 *   ① 不再 SkeletonUtils.clone：外殼直接 reuse 本體的 geometry／skeleton／bindMatrix。
 *      再 clone 一次會生出第二副不同步的骨架（事實表風險 2），而且 trait-fx.js:129 的 model
 *      偵測會抓錯節點。外殼掛成「本體 mesh 的子節點」，matrixWorld 逐幀等於本體——SkinnedMesh
 *      預設的 attached bindMode 每幀拿 matrixWorld 重算 bindMatrixInverse，掛成子節點才不會脫節。
 *   ② 線寬用 CSS 像素定：在 clip space 沿「投影後的法線」推 uOutlinePx 個像素，乘 w 抵銷
 *      透視除法 → 同一尊在 dist 3.6 與 4.2 的描邊一樣粗（驗收 P-1 的量法），不是越近越粗。
 *   ③ 另一把 program cache key：本體那把是 'yaoshi-creature-rim-burn'（事實表風險 3），
 *      共用會讓 three 拿本體的 program 去畫外殼。
 * ────────────────────────────────────────────────────────────────────────── */
// 全部【試玩必調】。
const OUTLINE = {
  px: 2.0, // 螢幕線寬（CSS 像素）：1v1～3v3 用；P-2 四輪（2.0／2.6／3.2）證明加粗換不到陣營辨識，使用者裁定回細線
  crowdPx: 1.4, // 滿編（任一側 ≥5 尊，duel-figures.crowded）時的線寬：擠堆場面粗線會糊成一團【試玩必調】
  satMul: 1.6, // 系色飽和度倍率（在 sRGB 的 HSL 上算）
  lum: 0.36, // 描邊明度（絕對值）：第 3 輪 0.5 超過 bloom threshold 0.5，三系全被打成同一種黃光暈；壓到門檻下才留得住色相
  // 色相偏移（HSL 的 h，0–1）：FACTION_RIM 祖靈 #d4a870 與香火 #f08060 色相只差 20°，第 1 輪四位讀者沒有一位把它們當兩個色。
  // 祖靈往金黃、香火往深紅、陰氣往青綠拉開；只在描邊這一處偏，FACTION_RIM 本體不動。
  hueShift: { zuling: +0.045, xianghuo: -0.035, yinqi: +0.06 },
};
/** ?outline=0 關掉描邊（P-2 對照組）。正式頁沒帶這個參數＝開（解析方式對齊 index.html:3146 的 ?fxcount）。 */
const OUTLINE_ON = (() => {
  try { return new URLSearchParams((typeof location === 'undefined' ? '' : location.search) || '').get('outline') !== '0'; } catch (e) { return true; }
})();
// 線寬換算要知道畫布多大（CSS 像素）。兩個 uniform 全場共用同一個物件：寫一次，所有外殼同步。
const OUTLINE_PX = { value: OUTLINE.px };
/** 滿編收斂：renderer 每幀依 duelFigures.crowded 呼叫；全場外殼共用同一顆 uniform，寫一次全部生效。 */
export function setOutlineCrowd(on) { OUTLINE_PX.value = on ? OUTLINE.crowdPx : OUTLINE.px; }
// 多材質 mesh 裡 ghost_* 那幾組的外殼材質：什麼都不寫（不寫色、不寫深度），等於那幾組沒有外殼。
const OUTLINE_SKIP_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });
const OUTLINE_RES = { value: new THREE.Vector2(1, 1) };
function syncOutlineRes() {
  if (typeof window === 'undefined') return;
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  if (OUTLINE_RES.value.x !== w || OUTLINE_RES.value.y !== h) OUTLINE_RES.value.set(w, h);
}
syncOutlineRes();

// FACTION_RIM 的鍵（zuli/xianghu/yinqi）對上 canonFaction 的輸出（zuling/xianghuo/yinqi）。
// 只是索引轉換，不是第 7 份系色複製品——描邊色一律由 FACTION_RIM 算出來。
const RIM_KEY = { zuling: 'zuli', xianghuo: 'xianghu', yinqi: 'yinqi' };
const _oc = new THREE.Color();
const _ohsl = { h: 0, s: 0, l: 0 };
/**
 * 三系 → 描邊色：取既有的 FACTION_RIM，色相不動，飽和度 ×satMul、明度壓到 lum。
 * 為什麼不能直接用 FACTION_RIM 原色：香火的 #f08060 跟燈籠光暈 #f0a840 幾乎同色
 * （下面 RIM_FACTION_MIX 那段就是在處理同一件事），整隻被燈籠照橘之後描邊也是橘的＝沒有邊。
 * 壓暗＋拉飽和之後三系都比燈籠暗、彼此的色相差才讀得出來。
 * @param fallbackHex 沒給 faction（或認不得）時的來源色，預設燈籠色
 */
export function outlineColorOf(faction, fallbackHex) {
  const key = RIM_KEY[canonFaction(faction)];
  const src = key ? FACTION_RIM[key] : (fallbackHex === undefined ? RIM_FALLBACK : fallbackHex);
  _oc.setHex(src);
  _oc.getHSL(_ohsl, THREE.SRGBColorSpace);
  const shift = (key && OUTLINE.hueShift[canonFaction(faction)]) || 0;
  const h = (_ohsl.h + shift + 1) % 1;
  return _oc.setHSL(h, Math.min(1, _ohsl.s * OUTLINE.satMul), OUTLINE.lum, THREE.SRGBColorSpace).getHex(THREE.SRGBColorSpace);
}

const OUTLINE_PARS = `
uniform vec3 uOutlineColor;
uniform float uDissolve;
uniform vec2 uBurnY;
varying vec3 vLocalPosR;
` + NOISE_GLSL;

// 取代 <begin_vertex>：留下本體局部座標給 dissolve，並取出這一格的法線。
// meshbasic 的法線區塊只在 USE_SKINNING／USE_ENVMAP 時才展開（three r158 meshbasic_vert），
// 沒展開時 objectNormal 不存在，要退回 attribute。蒙皮的那條拿到的已經是骨架變形後的法線。
const OUTLINE_BEGIN = `#include <begin_vertex>
  vLocalPosR = position;
  #if defined( USE_SKINNING ) || defined( USE_ENVMAP )
    vec3 _shellNormal = objectNormal;
  #else
    vec3 _shellNormal = vec3( normal );
  #endif`;

// 取代 <project_vertex>：先照原樣算出 clip 座標，再沿投影後的法線推固定的螢幕像素。
// ×2/解析度＝把 CSS 像素換成 NDC；×w 抵銷後面的透視除法 → 線寬不隨距離縮放。
// 法線正對鏡頭時投影後的 xy 約等於 0（沒有可推的方向），推 0；normalize(0) 是 NaN，一定要擋。
const OUTLINE_PROJECT = `vec4 mvPosition = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
  #endif
  mvPosition = modelViewMatrix * mvPosition;
  vec4 _oClip = projectionMatrix * mvPosition;
  vec3 _oN = normalize( normalMatrix * _shellNormal );
  vec2 _oC = ( projectionMatrix * vec4( _oN, 0.0 ) ).xy;
  vec2 _oDir = dot( _oC, _oC ) > 1e-12 ? normalize( _oC ) : vec2( 0.0 );
  _oClip.xy += _oDir * ( uOutlinePx * 2.0 / max( uOutlineRes, vec2( 1.0 ) ) ) * _oClip.w;
  gl_Position = _oClip;`;

/**
 * 一顆外殼描邊材質（一尊共用一顆）。回傳 { mat, u }，u.uDissolve 由本體的 setDissolve 同步餵。
 * 用 MeshBasicMaterial＋onBeforeCompile 而不是 ShaderMaterial：蒙皮、霧、色彩空間（對決走
 * bloom 的 render target 是 linear、直接輸出是 sRGB）全部交給 three 的標準管線處理，
 * 才跟本體同一套；自己寫 ShaderMaterial 要把這三件事重抄一遍。
 */
function makeOutlineMaterial(colorHex, burnY) {
  const u = {
    uOutlineColor: { value: new THREE.Color(colorHex) },
    uOutlinePx: OUTLINE_PX,
    uOutlineRes: OUTLINE_RES,
    uDissolve: { value: 0 },
    uBurnY: { value: new THREE.Vector2(burnY[0], burnY[1]) },
  };
  const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOutlinePx;\nuniform vec2 uOutlineRes;\nvarying vec3 vLocalPosR;')
      .replace('#include <begin_vertex>', OUTLINE_BEGIN)
      .replace('#include <project_vertex>', OUTLINE_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>' + OUTLINE_PARS)
      // 燒毀：跟本體同一條切口（DISSOLVE_CUT），外殼才會跟身體一起破，不會剩一層殼
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n{' + DISSOLVE_CUT + '\n}')
      // 描邊色蓋在 diffuseColor 上（不是直接寫 gl_FragColor）：後面的霧、色彩空間照標準管線走
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = uOutlineColor;');
  };
  mat.customProgramCacheKey = () => 'yaoshi-creature-outline';
  mat.needsUpdate = true;
  return { mat, u };
}

/**
 * 描邊 shader 的暖身物件（renderer.js 掛進 scene，要排在燈組進場「之後」——
 * three 的 program cache key 含燈數，燈還沒進來時編的那支到對決會再編一次）。
 * 對決走 bloom 的 render target（linear 色彩空間）跟直接輸出是兩支 program，renderer.compile()
 * 只編得到後者，所以照 trait-fx.js:104-114 的做法：常駐、關掉 frustumCulled、藏在桌面底下，
 * 每一幀（兩條路都算）真的被畫，第一場對決之前兩種變體就都編好了。
 * ?outline=0 時回一個空 Group（不編也不畫）。
 */
export function createOutlineWarmup() {
  const g = new THREE.Group();
  g.name = 'outline-warmup';
  g.position.y = -30; // 桌面底下、鏡頭永遠看不到
  if (!OUTLINE_ON) return g;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.001, 0, 0, 0, 0.001, 0]), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(12), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), 4));
  const bone = new THREE.Bone();
  const mesh = new THREE.SkinnedMesh(geo, makeOutlineMaterial(RIM_FALLBACK, [0, 1]).mat);
  mesh.add(bone);
  mesh.bind(new THREE.Skeleton([bone]), new THREE.Matrix4());
  mesh.frustumCulled = false;
  g.add(mesh);
  return g;
}

/**
 * @param opts.glbUrl   anyCreature 產出的蒙皮 GLB 路徑
 * @param opts.faction  三系（'zuli' | 'xianghu' | 'yinqi'），只用來決定邊光預設色；
 *                      呼叫端隨時可以用 setCloth(hex) 覆蓋
 * @param opts.rimColor 直接指定邊光色（優先於 faction）
 */
export function makeCreatureFigure(opts = {}) {
  const group = new THREE.Group();
  const uniforms = []; // 這隻身上所有材質的 uniform 控制點
  const shells = []; // 反轉外殼描邊的 mesh（每顆本體 mesh 一顆；?outline=0 時是空的）
  let shellU = null; // 外殼材質的 uniform 控制點（整尊共用一顆材質）
  const parts = Object.create(null); // 骨骼名 → THREE.Bone
  const clips = Object.create(null); // clip 名 → THREE.AnimationClip

  let mixer = null;
  let model = null;
  let loaded = false;
  let rimScale = 1;
  const rimColor = new THREE.Color(opts.rimColor === undefined ? RIM_FALLBACK : opts.rimColor);

  let burning = null; // { t, dur, resolve, puff }
  let ash = null;
  let bbox = null; // 模型本地包圍盒（GLB 載完才有；已含正規化）
  let fx = null; // 三系環境特效（attachFactionFx 掛上來的）
  let ground = null; // 腳下環境（水面等；setGroundFx 掛上來的）
  let current = null; // 目前在播的 clip 名（play() 記錄；量測與招式演出用）
  const ab = opts.ab === undefined ? null : opts.ab;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 22),
    new THREE.MeshBasicMaterial({ color: SHADOW_COLOR, transparent: true, opacity: 0.6, depthWrite: false, fog: false, toneMapped: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  group.visible = false;
  shadow.visible = false;

  const readyPromise = loadGlb(opts.glbUrl).then((gltf) => {
    model = cloneSkinned(gltf.scene);
    // 正規化前的原始包圍盒：dissolve 的 uBurnY 用的是 mesh 本地座標（shader 裡的 position），
    // 不受這裡的 model.scale／position 影響，所以要留原始值給它。
    const raw = new THREE.Box3().setFromObject(model);
    const burnY = [raw.min.y, raw.max.y];
    const rawH = raw.max.y - raw.min.y;
    const norm = rawH > NORM.maxH ? NORM.maxH / rawH : 1;
    model.scale.setScalar(norm);
    if (raw.min.y < 0) model.position.y = -raw.min.y * norm;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    bbox = box;

    const bodyMeshes = []; // 先蒐集再掛外殼：邊 traverse 邊加子節點會把新加的外殼也走一遍
    model.traverse((o) => {
      if (o.isBone) parts[o.name] = o;
      if (!o.isMesh) return;
      bodyMeshes.push(o);
      // SkeletonUtils.clone 沿用同一份材質；不各自複製的話 setCloth 會把 26 隻一起染色
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const dressed = mats.map((m) => {
        const c = m.clone();
        uniforms.push(dressMaterial(c, burnY));
        return c;
      });
      o.material = Array.isArray(o.material) ? dressed : dressed[0];
      o.frustumCulled = false; // 蒙皮變形後 bounding sphere 不準，撲擊時會整隻被剔掉
    });

    // 反轉外殼描邊（P-1）：整尊共用一顆材質（一支 program、一份 uniform），
    // 每顆本體 mesh 底下掛一顆同 geometry／同 skeleton／同 bindMatrix 的殼。
    if (OUTLINE_ON) {
      const shell = makeOutlineMaterial(outlineColorOf(opts.faction, opts.rimColor), burnY);
      shellU = shell.u;
      bodyMeshes.forEach((o) => {
        // ghost_*（haunt 下半身半透明、depthWrite=false）不描邊：不透明外殼會整片蓋住半透明本體，
        // P-7 兩位讀者把它讀成「故障／掃描線特效」。多材質 mesh 只把 ghost 那幾組換成不畫的材質。
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const isGhost = (m) => GHOST.test.test((m && m.name) || '');
        if (mats.every(isGhost)) return;
        const pick = (m) => (isGhost(m) ? OUTLINE_SKIP_MAT : shell.mat);
        const mat = Array.isArray(o.material) ? o.material.map(pick) : pick(o.material);
        const sh = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, mat) : new THREE.Mesh(o.geometry, mat);
        if (o.isSkinnedMesh) { sh.bindMode = o.bindMode; sh.bind(o.skeleton, o.bindMatrix); }
        sh.name = 'outline';
        sh.frustumCulled = false; // 同本體：蒙皮變形後 bounding sphere 不準
        o.add(sh); // 子節點＝matrixWorld 逐幀等於本體（見 makeOutlineMaterial 上面那段的 ①）
        shells.push(sh);
      });
    }

    group.add(model);
    mixer = new THREE.AnimationMixer(model);
    (gltf.animations || []).forEach((c) => { clips[c.name] = c; });

    const foot = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.38;
    shadow.geometry.dispose();
    shadow.geometry = new THREE.CircleGeometry(foot, 22);

    uniforms.forEach((u) => { u.uRimColor.value.copy(rimColor); });
    if (ground) ground.fit(box);
    loaded = true;
    return true;
  });
  // GLB 404／網路失敗：readyPromise 會 reject。等它的人（duel-figures 的 loaded()）各自接 handler，
  // 這裡再掛一條空的，免得沒人等的時候變成 unhandledrejection（頁面 console error）。
  readyPromise.catch(() => {});

  function setRimUniforms() {
    uniforms.forEach((u) => {
      u.uRimColor.value.copy(rimColor);
      u.uRimStrength.value = (u.glow ? GLOW.rim : RIM.strength) * rimScale;
    });
  }

  function setDissolve(v) {
    uniforms.forEach((u) => { u.uDissolve.value = v; });
    if (shellU) shellU.uDissolve.value = v; // 外殼跟本體同一個燒毀進度（P-1：燒完一起消）
  }

  const api = {
    group,
    shadow,
    parts,
    /** 換皮辨識：duel-figures 靠這個決定不套頭像／袍子色／整尊透明度（接線卷） */
    skin: 'creature',
    ab,
    /** 批 1 介面相容：3D 生物自己長著臉，不吃頭像貼圖。留著讓換皮呼叫端不必分支。 */
    setPortrait() {},
    /** 換邊光色（三系色；沿用批 1 的名字，換皮呼叫端一行都不用改） */
    setCloth(hex) { rimColor.setHex(hex); setRimUniforms(); },
    /** 邊光亮度倍率（受擊瞬間爆一下，bloom 才抓得到） */
    setRim(op) { rimScale = op === undefined ? 1 : op; setRimUniforms(); },
    /** GLB 還沒到就別冒出一團色塊 */
    ready() { return loaded; },
    /** 等 GLB 載完（預覽頁／演出層要排時序時用） */
    loaded() { return readyPromise; },
    /** 有哪些 clip 可播 */
    clipNames() { return Object.keys(clips); },
    /** 模型的本地包圍盒（GLB 沒載完是 null；已含正規化）；特效與掛件靠它決定尺寸，不寫死 1 公尺 */
    bounds() { return bbox; },
    /** mixer 累計時間（秒）。量測用：對決中兩次取樣嚴格遞增＝每幀真的有 update 到。 */
    animTime() { return mixer ? mixer.time : 0; },
    /** 目前在播的 clip 名（play() 記錄；還沒播過是 null） */
    current() { return current; },
    /** 腳下環境的種類（'water'）或 null */
    groundFx() { return ground ? ground.kind : null; },
    /** 反轉外殼描邊的 mesh 清單（GLB 沒載完／?outline=0 時是空陣列）。驗收 P-1 的量測掛鉤。 */
    outlines() { return shells.slice(); },
    /** 這尊的描邊色（hex；?outline=0 時 null）。驗收與截圖判讀用。 */
    outlineColor() { return shellU ? shellU.uOutlineColor.value.getHex(THREE.SRGBColorSpace) : null; },
    /**
     * 掛腳下環境（目前只有 'water'）。傳 null／'none' 拆掉。回傳控制點（沒掛成功回 null）。
     * 由 makeCreatureFigure 依 CREATURE_GROUND 自動掛，呼叫端一般不必自己叫。
     */
    setGroundFx(kind) {
      if (ground) { group.remove(ground.group); ground.dispose(); ground = null; }
      if (!kind || kind === 'none') return null;
      ground = kind === 'water' ? makeWaterPool() : null;
      if (!ground) return null;
      group.add(ground.group);
      if (bbox) ground.fit(bbox);
      return ground;
    },
    /**
     * 掛上三系環境特效（見檔尾 attachFactionFx）。同一隻重掛會先拆掉舊的。
     * 傳 null／'none' 就是拆掉。回傳特效控制點（沒掛成功回 null）。
     */
    setFactionFx(faction, o = {}) {
      if (fx) { group.remove(fx.points); fx.dispose(); fx = null; }
      if (!faction || faction === 'none') return null;
      fx = makeFactionAura(faction, o);
      if (!fx) return null;
      group.add(fx.points);
      // GLB 還沒到就先用預設高度，載完再按真實包圍盒重新框一次
      if (bbox) fx.fit(bbox); else readyPromise.then(() => { if (fx && bbox) fx.fit(bbox); }, () => { /* GLB 404：這隻不會現身，特效也不必框 */ });
      return fx;
    },
    /**
     * 播一支 GLB 內建的骨架動畫。
     * @param name 'idle' | 'move' | 'attack'
     * @param opts {loop 覆寫 clip 的循環, fade 交叉淡入秒數, timeScale 速率, clamp 播完停在最後一格}
     */
    play(name, o = {}) {
      if (!mixer || !clips[name]) return null;
      const act = mixer.clipAction(clips[name]);
      current = name;
      const loop = o.loop === undefined ? name !== 'attack' : o.loop;
      act.reset();
      act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      act.clampWhenFinished = o.clamp === undefined ? !loop : o.clamp;
      act.timeScale = o.timeScale === undefined ? 1 : o.timeScale;
      const fade = o.fade === undefined ? 0.25 : o.fade;
      mixer._actions.forEach((a) => { if (a !== act && a.isRunning()) a.fadeOut(fade); });
      if (fade > 0) act.fadeIn(fade);
      act.play();
      return act;
    },
    /**
     * 燒毀：dissolve 閾值 0→1 掃過整隻，燒邊發燈籠色的光，同時噴三批灰燼。
     * 結束後 group.visible === false。回 Promise，呼叫端可以 await 再進下一拍。
     * @param o {ms 燒多久, seed 灰燼的決定性種子, scale 灰燼尺寸倍率}
     */
    burn(o = {}) {
      if (burning) return burning.promise;
      const dur = (o.ms === undefined ? BURN.ms : o.ms) / 1000;
      if (!ash) ash = createImpactBurst(BURN.ashPerPuff * BURN.ashAt.length);
      const host = group.parent;
      if (host && ash.points.parent !== host) host.add(ash.points);
      let resolve;
      const promise = new Promise((r) => { resolve = r; });
      burning = { t: 0, dur, resolve, puff: 0, seed: o.seed === undefined ? 1 : o.seed, scale: o.scale === undefined ? 1 : o.scale, promise };
      return promise;
    },
    /** 每幀呼叫：推進 mixer、燒毀進度與灰燼。dt 單位是秒。 */
    update(dt) {
      syncOutlineRes(); // 視窗大小變了描邊要跟著換算（只在真的變了才寫 uniform）
      if (mixer) mixer.update(dt);
      if (ash) ash.update(dt);
      if (fx) fx.update(dt);
      if (ground) ground.update(dt);
      if (!burning) return;
      burning.t += dt;
      const p = Math.min(1, burning.t / burning.dur);
      setDissolve(p);
      if (fx) fx.setFade(1 - p); // 身體燒到哪，身上的香火／金粉／鬼火就淡到哪
      if (ground) ground.setFade(1 - p);
      while (burning.puff < BURN.ashAt.length && p >= BURN.ashAt[burning.puff]) {
        const origin = group.getWorldPosition(new THREE.Vector3());
        const box = model ? new THREE.Box3().setFromObject(model) : null;
        origin.y += box ? (box.min.y + (box.max.y - box.min.y) * BURN.ashAt[burning.puff]) : 0.5;
        ash.burst(origin, BURN.color, {
          n: BURN.ashPerPuff, power: 0.55, scale: burning.scale,
          seed: burning.seed * 977 + burning.puff,
        });
        burning.puff++;
      }
      if (p >= 1) {
        group.visible = false;
        shadow.visible = false;
        // 外殼自己也關掉：group.visible=false 已經讓它畫不出來，但驗收要能逐尊讀到
        // shell.visible===false（祖先隱藏不會改子節點自己的旗標）
        shells.forEach((s) => { s.visible = false; });
        const done = burning.resolve;
        burning = null;
        done();
      }
    },
    /** 換下一場之前把燒毀狀態收回來（dissolve 歸零、重新可見） */
    reset() {
      // 上一場沒演完的燒毀（GLB 晚到、分頁在背景）：把它的 Promise 結掉，等它的人才走得下去（審查 H-1）
      if (burning) { const done = burning.resolve; burning = null; try { done(); } catch (err) { /* 呼叫端的問題不擋本檔 */ } }
      burning = null;
      setDissolve(0);
      if (fx) fx.setFade(1);
      if (ground) ground.setFade(1);
      shells.forEach((s) => { s.visible = true; });
      group.visible = true;
      shadow.visible = true;
    },
    /** 釋放這一隻獨佔的材質與幾何（GLB 本身由 glbCache 共用，不在這裡釋放） */
    dispose() {
      if (fx) { group.remove(fx.points); fx.dispose(); fx = null; }
      if (ground) { group.remove(ground.group); ground.dispose(); ground = null; }
      group.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      });
      shadow.geometry.dispose();
      shadow.material.dispose();
    },
  };
  const groundKind = opts.groundFx === undefined ? (ab ? CREATURE_GROUND[ab] : null) : opts.groundFx;
  if (groundKind) api.setGroundFx(groundKind);
  return api;
}

/* ── 腳下環境：水面（接線卷，2026-09-05）────────────────────────────────────
 * 三種 mesh：水面圓盤（Normal）、水緣微光（Additive）、漣漪環 ×3（Additive）。
 * 座標是 figure.group 的本地座標：腳底 y=0，圓盤貼在 y=0.004（高於 duel-figures 的地面陰影 0.002）。 */
function makeWaterPool() {
  const g = new THREE.Group();
  g.name = 'ground-water';
  const flat = (color, opacity, additive) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, fog: false, toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
  });
  const discMat = flat(WATER.color, WATER.opacity, false);
  const edgeMat = flat(WATER.edgeColor, WATER.edgeOpacity, true);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), discMat);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.0, 40), edgeMat);
  const rings = [];
  for (let i = 0; i < WATER.rings; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(1 - WATER.ringWidth, 1, 40), flat(WATER.edgeColor, WATER.ringOpacity, true));
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.006;
    rings.push(r);
    g.add(r);
  }
  disc.rotation.x = -Math.PI / 2;
  edge.rotation.x = -Math.PI / 2;
  disc.position.y = 0.004;
  edge.position.y = 0.005;
  g.add(disc, edge);

  let R = 0.5; // 水面半徑（fit 後依腳印改寫）
  let fade = 1;
  let elapsed = 0;

  function update(dt) {
    elapsed += dt;
    disc.position.y = 0.004 + (0.5 + 0.5 * Math.sin(elapsed * 1.7)) * WATER.bob * R; // 只往上起伏，不會沉到桌面下
    rings.forEach((r, i) => {
      const t = ((elapsed / WATER.period) + i / WATER.rings) % 1; // 三圈錯開 1/3 週期
      r.scale.setScalar(R * (0.18 + 0.97 * t));
      r.material.opacity = WATER.ringOpacity * (1 - t) * (1 - t) * fade;
    });
    discMat.opacity = WATER.opacity * fade;
    edgeMat.opacity = WATER.edgeOpacity * fade;
  }
  return {
    group: g, kind: 'water', update,
    fit(b) {
      R = Math.max(0.25, Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * 0.5 * WATER.radius);
      disc.scale.setScalar(R);
      edge.scale.setScalar(R);
    },
    setFade(v) { fade = Math.max(0, Math.min(1, v)); },
    dispose() {
      disc.geometry.dispose(); edge.geometry.dispose(); discMat.dispose(); edgeMat.dispose();
      rings.forEach((r) => { r.geometry.dispose(); r.material.dispose(); });
    },
  };
}

/** 三系 → 邊光色。數值對齊 assets/theme.css 的 --c-*-light（同 particles.js 的 SPARK_COLOR）。 */
export const FACTION_RIM = {
  zuli: 0xd4a870,
  xianghu: 0xf08060,
  yinqi: 0x70b080,
};

// 三系的名字在專案裡有兩套拼法（FACTION_RIM 用 zuli/xianghu、particles.js 的 SPARK_COLOR
// 用 zuling/xianghuo）。這張表把兩套都收進來，呼叫端寫哪個都行，不用記是哪一套。
const FACTION_ALIAS = {
  zuli: 'zuling', zuling: 'zuling', 祖靈: 'zuling',
  xianghu: 'xianghuo', xianghuo: 'xianghuo', 香火: 'xianghuo',
  yinqi: 'yinqi', 陰氣: 'yinqi',
};
function canonFaction(f) { return FACTION_ALIAS[String(f || '').toLowerCase()] || FACTION_ALIAS[f] || null; }

/* ══════════════════════════════════════════════════════════════════════════
 * 戲台燈光（look-dev 卷，2026-09-04）
 *
 * 為什麼要另外一組燈：js/scene-env.js 的四盞燈籠是**牌桌**的燈——四個方位平均包住整張桌，
 * 高度 1.5、距離 2.6，打在戲台中央那隻妖身上是四面等亮的橘光。等亮＝沒有明暗交界＝
 * 讀不出體積；再加上燈籠色 #f0a840 飽和度很高，毛色、條紋、綬帶全被染成同一個橘，
 * 這就是試作截圖「一團深棕色」的成因（不是「不夠亮」，是「只有一種光」）。
 *
 * 三燈組的分工：
 *   key  上前左、偏中性的暖白。負責形體：中性色才還得了毛色與條紋的本來面目。
 *   fill 對側、冷藍、弱。負責暗部：暗面不再是純黑，而且冷暖對比一出來立體感就回來了。
 *   rim  後上、燈籠色。負責輪廓：把頭背與尾的邊緣從夜紫背景切開。
 *
 * 為什麼是 SpotLight（三盞都是），而不是平行光或點光源——這是量出來的，不是挑好看的：
 *   DirectionalLight：沒有距離衰減，整張桌連同背景一起提亮，夜市的暗直接沒了。
 *   PointLight：實測過（.claude/lookdev 那一輪），妖的遮罩區平均亮度 0.142 → 0.249，
 *     但**背景**同時 0.069 → 0.153，妖／背景的對比反而從 2.07 掉到 1.63——
 *     等於把整個戲台一起調亮，形體還是浮不出來。光源全向就一定會這樣。
 *   SpotLight：有錐角，光只落在瞄準的那一圈。桌子（半徑 3.4）大部分留在錐外＝還是暗的，
 *     妖吃滿光。「戲台燈」本來就是這個東西。
 * 每盞的 target 都是 rig 底下的一個空物件，所以整組 rig 移到哪、瞄準點就跟到哪。
 * ══════════════════════════════════════════════════════════════════════════ */

// 全部【試玩必調】。pos／aim 是相對於 rig 掛載點的座標（見 createFigureLightRig 的 opts.scale）。
// angle 是錐的半角（弧度）：key 收得比較緊（塑形），fill 放寬（補暗部不該有形狀），
// rim 中等（只要切到頭背與尾的邊）。penumbra 都給得很高，錐緣才不會在桌面上切出一圈硬邊。
export const FIGURE_LIGHT = {
  key: { color: 0xffeacc, intensity: 34.0, pos: [-2.10, 2.05, 1.85], aim: [0.10, 0.42, -0.05], distance: 7.0, angle: 0.32, penumbra: 0.70, decay: 1.4 },
  fill: { color: 0x5f86e0, intensity: 7.5, pos: [1.55, 0.95, -0.25], aim: [0, 0.42, 0], distance: 4.5, angle: 0.85, penumbra: 0.9, decay: 1.4 },
  rim: { color: 0xf0a840, intensity: 10.0, pos: [0.50, 1.62, -1.45], aim: [0, 0.62, 0], distance: 4.2, angle: 0.52, penumbra: 0.65, decay: 1.4 },
};
// 系色只染 rim，而且是**混進燈籠色**而不是整盞換掉：驗收條件寫的是「rim（燈籠色、後上）」，
// 整盞換成系色會讓香火系的 rim（#f08060）跟被燈籠照橘的身體同色，輪廓反而更看不出來。
// 比例壓到 0.35 也是量出來的：0.55 時陰氣系的整條側身與尾巴都被染成青綠（fx-yinqi 那批），
// 剛救回來的毛色與條紋又不見了——rim 是切輪廓的，不該當第三盞主燈用。
const RIM_FACTION_MIX = 0.35;

/**
 * 戲台三燈組。回傳一個 THREE.Group，掛進任何 scene 都成立（`scene.add(rig)`），
 * 不依賴任何特定的 GLB／模型尺寸——需要配合體型時給 opts.scale 就好。
 *
 * @param opts.faction   三系（兩套拼法都吃）：只換 rim 的顏色，key／fill 不動
 *                       （key 是中性暖白、fill 是冷藍，那是為了還原毛色，換系色會又回到單色染）
 * @param opts.rimColor  直接指定 rim 顏色（優先於 faction）
 * @param opts.scale     位置與作用距離一起乘上去。1＝一隻約 1 單位高的妖站在掛載點上；
 *                       n 隻排開時給 1.4–1.8，光圈才罩得住整排
 * @param opts.intensity 三盞一起乘的亮度倍率（1＝上表的預設值）
 * @param opts.castShadow key 投影。預設關：多一張 1024² 的 shadow map ＝ 每幀多一趟 render，
 *                       26 隻同場時不划算；要開的話呼叫端也得自己把 renderer.shadowMap.enabled
 *                       打開，並把妖的 mesh 設成 castShadow／桌面設成 receiveShadow。
 * @returns THREE.Group，另掛 key/fill/rim 三盞燈與 setIntensity/setRimColor/dispose
 */
export function createFigureLightRig(opts = {}) {
  const s = opts.scale === undefined ? 1 : opts.scale;
  const gain = opts.intensity === undefined ? 1 : opts.intensity;
  const rig = new THREE.Group();
  rig.name = 'figure-light-rig';

  const make = (cfg) => {
    const l = new THREE.SpotLight(cfg.color, cfg.intensity * gain, cfg.distance * s, cfg.angle, cfg.penumbra, cfg.decay);
    l.position.set(cfg.pos[0] * s, cfg.pos[1] * s, cfg.pos[2] * s);
    // target 一定要進場景圖，不然它的世界矩陣不會更新，燈會一直瞄著世界原點
    l.target.position.set(cfg.aim[0] * s, cfg.aim[1] * s, cfg.aim[2] * s);
    rig.add(l, l.target);
    return l;
  };
  const key = make(FIGURE_LIGHT.key);
  const fill = make(FIGURE_LIGHT.fill);
  const rim = make(FIGURE_LIGHT.rim);

  const applyFaction = (f) => {
    const c = canonFaction(f);
    rim.color.setHex(FIGURE_LIGHT.rim.color);
    if (c) rim.color.lerp(new THREE.Color(SPARK_COLOR[c]), RIM_FACTION_MIX);
  };
  if (opts.rimColor !== undefined) rim.color.setHex(opts.rimColor); else applyFaction(opts.faction);

  if (opts.castShadow) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.002;
    key.shadow.camera.near = 0.2;
    key.shadow.camera.far = FIGURE_LIGHT.key.distance * s;
  }

  rig.key = key;
  rig.fill = fill;
  rig.rim = rim;
  /** 整組亮度倍率（進場亮一點、退場收暗都靠它） */
  rig.setIntensity = (m) => {
    key.intensity = FIGURE_LIGHT.key.intensity * m;
    fill.intensity = FIGURE_LIGHT.fill.intensity * m;
    rim.intensity = FIGURE_LIGHT.rim.intensity * m;
  };
  /** 換 rim 的系色（key／fill 刻意不跟著換，見上面的註解） */
  rig.setRimColor = (hex) => { rim.color.setHex(hex); };
  rig.setFaction = applyFaction;
  rig.dispose = () => { [key, fill, rim].forEach((l) => { if (l.shadow && l.shadow.map) l.shadow.map.dispose(); }); };
  return rig;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 三系環境特效（每隻 ≤ FX_MAX 顆）
 *
 * 為什麼不直接用 particles.js 的三支：createIncenseSmoke 的起點寫死在桌面四個角、
 * createEmbers 寫死在四盞燈籠的位置，兩支都是「場景級」的裝飾，跟著妖走不了；
 * createImpactBurst 是一次性噴發，沒有循環。這裡要的是「掛在這一隻身上、跟著它移動、
 * 循環播放」的氛圍粒子，所以在本檔另寫一支輕量的 Points（顏色沿用 SPARK_COLOR 那張表）。
 * 亂數走本檔的決定性 LCG（同 particles.js 的規矩：3D 層新程式碼不用 Math.random）。
 * ══════════════════════════════════════════════════════════════════════════ */

const FX_MAX = 60; // 驗收上限：每隻 ≤60 顆
const FX_DEFAULT_COUNT = 44;

/* 每一系是一到兩「層」，一層＝一個 THREE.Points。
 * 為什麼香火要兩層：煙要大、柔、不發光（NormalBlending），火星要小、亮、加光（Additive）。
 * PointsMaterial 的 size 與 blending 都是整組共用的，一層做不到兩種，只好分兩個 Points
 * （多一個 draw call）。反過來說，另外兩系只要一種質感，就只用一層。
 * 各欄位：frac＝占這隻總粒子數的比例；gain＝顏色的線性倍率（>1 是要衝過 bloom 的
 * threshold 0.5 才會發光）；radius／rise／sway 都是**相對這隻的體型**，fit() 會乘上包圍盒。 */
const FACTION_FX = {
  // 香火：香煙裊裊往上，夾幾點往上飄的火星
  xianghuo: { layers: [
    { role: 'smoke', frac: 0.45, color: 0xb9a8c8, gain: 0.45, size: 0.20, opacity: 0.30, additive: false,
      radius: 0.34, base: 0.02, rise: [0.22, 0.40], life: [1.5, 2.4], sway: 0.10, swayHz: 0.55, spin: 0 },
    { role: 'spark', frac: 0.55, color: SPARK_COLOR.xianghuo, gain: 2.2, size: 0.034, opacity: 0.95, additive: true,
      radius: 0.42, base: 0.0, rise: [0.38, 0.65], life: [0.9, 1.6], sway: 0.07, swayHz: 1.2, spin: 0 },
  ] },
  // 祖靈：金粉。慢、繞著身體轉、幾乎不上升——飄而不是燒
  zuling: { layers: [
    { role: 'dust', frac: 1, color: SPARK_COLOR.zuling, gain: 1.8, size: 0.030, opacity: 0.9, additive: true,
      radius: 0.55, base: 0.28, rise: [0.04, 0.16], life: [2.6, 4.2], sway: 0.12, swayHz: 0.40, spin: 0.30 },
  ] },
  // 陰氣：冷色鬼火。壽命短、忽明忽暗、貼著地往上舔
  yinqi: { layers: [
    { role: 'wisp', frac: 1, color: SPARK_COLOR.yinqi, gain: 2.3, size: 0.048, opacity: 0.85, additive: true,
      radius: 0.44, base: 0.0, rise: [0.16, 0.34], life: [1.0, 1.7], sway: 0.11, swayHz: 1.5, spin: 0.10, flicker: 3.0 },
  ] },
};

// 柔邊圓點。particles.js 的 getSoftDot 沒有導出，而本卷只准動兩個檔（驗收 LD-A4），
// 不能為了共用去改 particles.js；這裡自己生一張，本檔所有妖的所有特效共用這一張。
let fxDot = null;
function getFxDot() {
  if (fxDot) return fxDot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  fxDot = new THREE.CanvasTexture(c);
  fxDot.colorSpace = THREE.SRGBColorSpace;
  return fxDot;
}

function fxLcg(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/** 內部：一層粒子（一個 THREE.Points）。座標是**模型本地座標**（掛在 figure.group 底下）。 */
function makeAuraLayer(cfg, count, rnd) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const ang = new Float32Array(count); // 生成時的方位角
  const rad = new Float32Array(count); // 生成時離中軸的半徑
  const y0 = new Float32Array(count); // 生成時的高度
  const rise = new Float32Array(count);
  const sway = new Float32Array(count);
  const phase = new Float32Array(count);
  const age = new Float32Array(count);
  const life = new Float32Array(count);
  const tint = new THREE.Color(cfg.color).multiplyScalar(cfg.gain);

  // 這一隻的尺寸：預設當成 1 單位高、腳在 y=0；fit() 會用真實包圍盒改寫
  let box = { y0: 0, h: 1.0, r: 0.4 };
  let fade = 1;
  let elapsed = 0;

  function respawn(i, initial) {
    const lf = cfg.life[0] + rnd() * (cfg.life[1] - cfg.life[0]);
    life[i] = lf;
    age[i] = initial ? rnd() * lf : 0; // 首幀就散開，不然開場一整團同時冒出來
    ang[i] = rnd() * Math.PI * 2;
    rad[i] = (0.35 + rnd() * 0.65) * cfg.radius * box.r * 2.0;
    y0[i] = box.y0 + cfg.base * box.h + (initial ? rnd() * box.h * 0.5 : 0);
    rise[i] = (cfg.rise[0] + rnd() * (cfg.rise[1] - cfg.rise[0])) * box.h;
    sway[i] = cfg.sway * (0.5 + rnd()) * box.r;
    phase[i] = rnd() * Math.PI * 2;
  }
  for (let i = 0; i < count; i++) respawn(i, true);

  const geo = new THREE.BufferGeometry();
  const pa = new THREE.BufferAttribute(pos, 3); pa.setUsage(THREE.DynamicDrawUsage);
  const ca = new THREE.BufferAttribute(col, 3); ca.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pa);
  geo.setAttribute('color', ca);

  const mat = new THREE.PointsMaterial({
    size: cfg.size, map: getFxDot(), alphaTest: 0.01, vertexColors: true,
    transparent: true, opacity: cfg.opacity, depthWrite: false,
    blending: cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    // 這些粒子貼在妖身上（半徑不到一個身位），夜霧對它們的作用只會讓系色變灰；
    // 深度感由妖自己的材質負責（那些是吃霧的），所以這一層關掉霧。
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; // 蒙皮的妖已經關了視錐剔除，特效跟著它走同一套

  function update(dt) {
    elapsed += dt;
    for (let i = 0; i < count; i++) {
      age[i] += dt;
      const t = age[i] / life[i];
      if (t >= 1) { respawn(i, false); continue; }
      const i3 = i * 3;
      // 位置一律由「生成點 ＋ 位移」算出來，**不是**每幀往上加。
      // 第一版寫成 pos += sin(...)*dt 的累加式，sin 的正負沒有互相抵銷，
      // 結果粒子一路飄出畫面（.claude/lookdev/shots/fx-yinqi.png 那批的滿天泡泡）。
      const a = ang[i] + elapsed * cfg.spin;
      const sx = Math.sin(elapsed * cfg.swayHz * 6.2832 + phase[i]) * sway[i] * t;
      const sz = Math.cos(elapsed * cfg.swayHz * 5.0 + phase[i]) * sway[i] * t;
      pos[i3] = Math.cos(a) * rad[i] + sx;
      pos[i3 + 1] = y0[i] + rise[i] * age[i];
      pos[i3 + 2] = Math.sin(a) * rad[i] + sz;
      // 進場淡入、退場淡出：頭尾各 18% 的生命期，才不會憑空出現／憑空消失
      let al = Math.min(1, t / 0.18) * Math.min(1, (1 - t) / 0.18);
      if (cfg.flicker) al *= 0.55 + 0.45 * Math.sin(elapsed * cfg.flicker + phase[i] * 3.0);
      al *= fade;
      col[i3] = tint.r * al;
      col[i3 + 1] = tint.g * al;
      col[i3 + 2] = tint.b * al;
    }
    pa.needsUpdate = true;
    ca.needsUpdate = true;
  }

  return {
    points, count, update,
    fit(b) {
      box = { y0: b.min.y, h: Math.max(0.05, b.max.y - b.min.y), r: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * 0.5 };
      mat.size = cfg.size * Math.max(0.4, box.h);
      for (let i = 0; i < count; i++) respawn(i, true);
    },
    setFade(v) { fade = v; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

/** 內部：一隻妖身上的整組環境特效（一到兩層，見 FACTION_FX）。 */
function makeFactionAura(faction, o = {}) {
  const key = canonFaction(faction);
  const cfg = FACTION_FX[key];
  if (!cfg) return null;
  const total = Math.max(1, Math.min(FX_MAX, o.count === undefined ? FX_DEFAULT_COUNT : o.count));
  const rnd = fxLcg(o.seed === undefined ? 12345 : o.seed);

  const group = new THREE.Group();
  group.name = `faction-fx-${key}`;
  const layers = [];
  let used = 0;
  cfg.layers.forEach((lc, i) => {
    // 最後一層把餘數收掉，四捨五入才不會少個一兩顆（也不會超過 FX_MAX）
    const n = i === cfg.layers.length - 1 ? total - used : Math.round(total * lc.frac);
    used += n;
    if (n <= 0) return;
    const layer = makeAuraLayer(lc, n, rnd);
    layers.push(layer);
    group.add(layer.points);
  });

  return {
    points: group, count: used, faction: key,
    layerCount: layers.length,
    /** 按這一隻的真實包圍盒重新框住噴發範圍（GLB 載完由 setFactionFx 呼叫） */
    fit(b) { layers.forEach((l) => l.fit(b)); },
    /** 0–1 整體淡出（燒毀時跟著身體一起淡） */
    setFade(v) { const c = Math.max(0, Math.min(1, v)); layers.forEach((l) => l.setFade(c)); },
    setVisible(v) { group.visible = !!v; },
    update(dt) { layers.forEach((l) => l.update(dt)); },
    dispose() { layers.forEach((l) => l.dispose()); },
  };
}

/**
 * 把三系環境特效掛到一隻妖身上：香火＝香煙與火星上飄、祖靈＝金粉、陰氣＝冷色鬼火。
 * 粒子掛在 figure.group 底下，所以妖走到哪特效跟到哪、妖 burn 掉特效自然消失。
 * 由 figure.update(dt) 推進，呼叫端不必另外記得餵它。
 *
 * @param figure   makeCreatureFigure() 的回傳值
 * @param faction  'xianghuo'|'zuling'|'yinqi'（也吃 xianghu／zuli 與中文），null＝拆掉
 * @param opts     {count ≤60（預設 44）, seed 決定性種子}
 * @returns {points, count, faction, setFade, setVisible, dispose} 或 null
 */
export function attachFactionFx(figure, faction, opts = {}) {
  if (!figure || typeof figure.setFactionFx !== 'function') return null;
  return figure.setFactionFx(faction, opts);
}
