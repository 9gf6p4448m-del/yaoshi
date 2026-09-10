# 實作計畫：招式三級視覺分級（v0.54，2026-09-10）

> 權威規格＝`docs/experiments/2026-09-10-acceptance-fx-tiers.md`（凍結，F0–F10）。
> 背景＝`docs/proposals/2026-09-10-roadmap-v2-review.md` §1。基準＝`adbb124`（＝`4b7dadd` v0.53 ＋ 凍結檔；程式碼與 `4b7dadd` 逐位元組相同，凍結檔只加了一份 md）。
> 本檔是「動手前寫死介面」的計畫檔（模板 9）。介面一經寫死即凍結，要改走 `02 §2.1`。

## 1. 檔案清單（F9 白名單：`git diff --stat adbb124..` 只能出現這些）

| 檔案 | 改什麼 |
|---|---|
| `index.html` | `PW_FX.TRAIT_MS`→`TRAIT_MS_BY_TIER`、`BEAT_MIN_MS`→`BEAT_MIN_MS_BY_TIER`、`pwBeatTier`、`pwTraitFx` 帶 tier、`pwPlayBeat` 拍末等待依 tier、`?fxtier=0`、黑條 DOM＋CSS、`TRAITS` 三尊加 `tier:3`、`VERSION`／`VERSION_NOTE` |
| `js/trait-fx.js` | `TRAIT_MOVES_SHORT` 載入、`det.tier` 分支、`||900` 退路刪除改 throw、三常數等比、`st.tier` |
| `js/trait-fx/zuling.js` | `export const SHORT`：9 支短版 |
| `js/trait-fx/xianghuo.js` | `export const SHORT`：9 支短版 |
| `js/trait-fx/yinqi.js` | `export const SHORT`：9 支短版 |
| `js/camera-director.js` | `CINEMA` 機位（tier 3）、`LEAN.ms` 退路刪除改 throw、`table` shot 的 900 加註（語意非招式時長） |
| `js/renderer.js` | **（凍結檔 §2.1 修訂三補列）** +1 行：把既有的 `director` 掛上 `window.__yaoshi3d`。理由：F5 的 Playwright 探針要讀 `director.cinemaOn()` 才驗得了「CINEMA 只在 tier 3」，沒有它那一條就只能靠人眼 |
| `index.html`（`FPS_DIAG` 段） | **（凍結檔 §2.1 修訂三補列，使用者追加）** `?fps=1` 診斷行加「上一場對決最低 fps」＝對決期間 1 秒視窗的最低值，起訖用現有的 `ys:duel`／`ys:duel-end` 掛點；只在 `FPS_ON` 下掛載（不帶參數時連事件監聽都不註冊，零成本） |
| `tests/tools/fx-consts.mjs` | **新檔**：治具共用常數單一來源 |
| `tests/tools/traitfx-drive.mjs` | `--tier=` 介面、`run.ms` 斷言、F10 動作統計、讀 `fx-consts.mjs` |
| `tests/tools/traitfx-preview.html` | `?tier=`、`__tfx.runMs()`／`actions()`／`maxRate()` |
| `tests/tools/cam-drive.mjs`、`cam-unit.mjs`、`closeup-cam-unit.mjs`、`closeup-judge.mjs` | 改讀 `fx-consts.mjs`；`closeup-judge` 分析視窗改讀拍長 |
| `tests/fxtier.test.mjs` | **新檔**：單元測試（常數一致、缺 ms throw、tier 判定） |
| `docs/IMPLEMENTATION_GUIDE.md` | 新 §11.27 |
| `docs/experiments/2026-09-10-plan-fx-tiers.md` | 本檔 |
| `docs/experiments/2026-09-10-fx-tiers-report.md`、`docs/experiments/2026-09-10-fx-tiers-evidence/` | 報告與證據 |
| `docs/experiments/2026-09-10-acceptance-fx-tiers.md` | **（修訂三補列）** 凍結檔的 §2.1 修訂紀錄（修訂一／二／三三條使用者裁定） |
| `tests/tools/lbox-probe.mjs` | **（修訂三補列，新檔）** F5 機械段：黑條與 CINEMA「只在 tier 3」＋L4 draw call 對照＋L5 取消路徑＋L6 像素亮度 |
| `tests/tools/traitfx-sheet.mjs` | **（修訂三補列）** contact sheet 的幀號改成掃目錄取最小三張（幀位依 tier 換算後不再是固定的 8/22/36） |
| `tests/tools/fpsdiag-probe.mjs` | **（修訂三補列，新檔）** `?fps=1` 的「對決最低 fps」欄位斷言（D1 文字＋數值、D2 零成本、D3 每場重算） |
| `tests/tools/pace-ab.mjs` | **（修訂三補列，新檔）** F3 的 A/B 量測驅動器：交錯跑、每組 N 次、輸出中位的中位與全距、seeds 落檔 |
| `tests/tools/t3-shot.mjs` | **（修訂三補列，新檔）** F5 人眼段的 tier 3 交付物改從**真實對決路徑**截（含黑條與 CINEMA），附 `-nobox` 對照 |
| `tests/tools/duel-perf.mjs` | **（修訂三補列）** perf 模式改吃 `--root`＋加 `--seed`；不支援的旗標一律 throw |
| `tests/tools/trace-eq.mjs` | **（修訂三補列）** 新增 `--beats` 模式（對兩邊做同一個注入，序列化 `war.beats`） |
| `tests/tools/duel-drive.mjs` | **（修訂三補列）** 黑條的 MutationObserver、逐場 tier 快照與 `lboxMs`、輸出 `url`（含 seed） |

**不動**（動了就是 F9 紅）：`docs/ART_BIBLE.md`、`docs/GAME_DESIGN.md`、`assets/`、`js/bloom.js`、`js/duel-figures.js`、`js/particles.js`（`js/renderer.js` 見上表補列那一行：**只允許那 +1 行的治具出口**，渲染路徑一格不動）、引擎函式（`paperWar`／`pwSide`／`pwClash`／`pwPrep`／`pwBolt`／`pwHaunt`／`pwStrike`／`pwRec`／`buildArmy`／`collectEffects`／`applyHooks`）、`TRAITS` 的規則欄位、AI、拍賣、請神、共鳴、既有 9 套 `tests/*.test.mjs` 的斷言。

## 2. 介面（寫死；此節即凍結）

### 2.1 資料與常數
```js
// index.html PW_FX（唯一事實來源；別處不得再寫死招式毫秒）
TRAIT_MS_BY_TIER:{1:260, 2:900, 3:1400},    // 招式時長
BEAT_MIN_MS_BY_TIER:{1:300, 2:900, 3:1400}, // 拍末下限（tier 1 取 300：EV_MAX_MS 260 之上留 40ms 餘裕）
TIER_BASE_MS:900,                           // 三常數等比的基準（＝v0.53 的 TRAIT_MS）
TIER_ON:true,                               // ?fxtier=0 → false
```
- `PW_FX.TRAIT_MS`／`PW_FX.BEAT_MIN_MS` **刪除**，不留別名（留了就是第二份事實來源）。
- `TRAITS[].tier`：只有三尊三招新增 `tier:3`（`eliteBlind`／`wardGuardAll`／`hauntAnswer`）。其餘 27 支不寫（讀作 1）。**這是 `TRAITS` 唯一允許的 diff。**

### 2.2 `pwBeatTier(list, beat, f)`（拍級，index.html）
```js
function pwBeatTier(list, beat, f){
  if(!PW_FX.TIER_ON) return 2;                                    // kill switch：全部走 v0.53 行為
  if(list.some(b=>b.kind==="trait" && ((TRAITS[b.trId]||{}).tier|0)>=3)) return 3;
  if(list.some(b=>b.kind==="burn")) return 2;                     // 該拍擊殺（burn 是 killed 的唯一事件源）
  if(beat===3 && f.war && !f.war.tie) return 2;                   // 該場決定性最後一拍
  return 1;
}
```
- **凍結檔寫的簽名是 `pwBeatTier(beat, war)`；實際 `pwBeatTier(list, beat, f)`**——判定要讀「該拍的事件」，`beat`＋`war` 兩參數取不到 `list`（`war.beats` 是全場三拍混在一起的）。介面細化，不動任何門檻。
- **`TRAITS[].tier` 的「上限」語意**：凍結檔括號同時寫「預設 1 的招也能因擊殺升 2」，字面互斥。取自洽解＝`tier:3` 的招把該拍**鎖在 3**，其餘由拍決定（1 或 2）；一支 tier 1 的招不會單獨升 3——「上限」在這裡生效。
- 不另設 `pwFxTier`：拍級＝招級（凍結檔「三級定義（拍級，不是招級）」）。

### 2.3 短版分支介面
- 三個系別檔各自 `export default {...}`（完整版，**一行不動**）＋ **`export const SHORT = {...}`**（9 支短版，鍵名＝trId）。
- `js/trait-fx.js`：`loadMoves` 同時取 `m.SHORT`，組出 `export const TRAIT_MOVES_SHORT`。
- `start(det)`：`const fn = (det.tier===1 && TRAIT_MOVES_SHORT[det.trId]) || TRAIT_MOVES[det.trId];`
  短版缺席時退回完整版——**不是恆綠退路**：完整版塞進 260ms 會 `cut>0`，F2 的 `clean` 立刻紅。
- `st.tier = run.tier`（編舞可讀，短版不必自己判斷）。

### 2.4 `||900` 退路刪除（沒帶 ms 就 throw）
- `js/trait-fx.js:366` `Number(det.ms)||900` → `if(!Number.isFinite(det.ms)||det.ms<=0) throw new Error('ys:fx-trait 缺 detail.ms')`。
- `js/camera-director.js:74` `LEAN.ms=900` → 常數刪除；`onTrait` 改成同樣 throw。
- `js/camera-director.js:18` `table:{...ms:900}` **保留數值**：語意是「牌桌機位過場時間」而非招式時長 → 列入 F1 排除清單，就地加註解點明。

### 2.5 三常數等比（`js/trait-fx.js` 一處改）
`run.k = run.ms / TIER_BASE_MS(900)`；`flinch` 預設用 `TFX.flinchMs*run.k`、`st.at` 用 `TFX.atReserve*run.k`、`update()` 的 margin 用 `TFX.endMargin*run.k`。**`TFX.rateMax` 不動（2.2）**；短版另有 `rate≤1.0` 的機械斷言擋「靠加速硬擠」。

### 2.6 Tier 3：CINEMA ＋ 黑條
```js
// js/camera-director.js
const CINEMA = { dist: 2.9, tilt: 8, lookY: 0.45, inMs: 220, outMs: 320 }; // 低角度仰視、拉近
```
- 觸發：`onTrait` 讀 `d.tier===3` → `cinemaOn=true`，`d.ms` 後走 `outMs` 回位。只動 dist／tilt／lookY，**yaw 一律不碰**（同 FOCUS 的紀律，不與 orbit／lean 搶同一個量）。
- 對外：`director.cinemaOn()`（Playwright 斷言用）。
- 黑條 DOM：`index.html` 加 `<div id="lbTop" class="lbar"></div><div id="lbBot" class="lbar"></div>`，與 `#vignette` 同層（`position:fixed;z-index:-1;pointer-events:none`，不進 shader、不加 draw call）。**id 寫死 `lbTop`／`lbBot`**；`.lbar.on{height:8vh}`、平常 `height:0`（CSS transition 220ms）。由 `pwTraitFx` 在 tier 3 開、招式結束關；`doSkip`／`ys:duel-end` 一律關。

### 2.7 `tests/tools/fx-consts.mjs`（治具唯一事實來源）
```js
export const TRAIT_MS_BY_TIER    = { 1: 260, 2: 900, 3: 1400 };
export const BEAT_MIN_MS_BY_TIER = { 1: 300, 2: 900, 3: 1400 };
export const TIER_BASE_MS = 900;
export const LETTERBOX_IDS = ['lbTop', 'lbBot'];
export const CINEMA = { dist: 2.9, tilt: 8 };
export function msOf(tier){ /* 取不到就 throw，不給預設值 */ }
export function assertPageConsts(pageConsts){ /* 與頁面 PW_FX 逐鍵比對，不一致 throw */ }
```
治具**不得**再出現招式時長的字面毫秒數。

### 2.8 kill switch
`?fxtier=0` → `PW_FX.TIER_ON=false` → `pwBeatTier` 恆回 2 → 招式 900、拍末 900、無 CINEMA、無黑條＝v0.53 行為。解析位置與寫法同 `?closeup`。

### 2.9 治具介面
- `traitfx-drive.mjs`：`--tier=1|2|3`（預設 2）。ms 由 `fx-consts.msOf(tier)` 取，**移除 `--ms=`**。
  - `msOK`：頁面實際 `run.ms === msOf(tier)`（防「`--tier=1` 其實還在跑 900」）。
  - `rateOK`：`stats.maxRate <= 1.0`（tier 1 專用；短版不得靠加速擠進去）。
  - `actionsOK`（F10）：該套時間軸註冊的 tween／fly／fade／grow 中**非 flinch** 的條數 `>=2`，逐招印表。
  - `--tier=1` 的 case 集合＝27 支（三尊排除，它們恆 3）；`--tier=3`＝三尊。
- `traitfx-preview.html`：`?tier=`（取代 `?ms=`），加 `__tfx.runMs()`／`__tfx.actions()`／`__tfx.maxRate()`。

### 2.10 `closeup-judge.mjs` 分析視窗
`:116` 的 `fo.t + fo.ms + 900` → `fo.t + fo.ms + BEAT_MIN_MS_BY_TIER[tier]`；`:129-130` 的「靜幀 ≥8 幀不足回 null」改成**依拍長換算幀數**，輸出加印 `nullCount`——**F4 要求 nullCount===0**，靜默 null 不得當通過。

## 3. 不做什麼
- **不改**引擎、`TRAITS` 規則欄位、AI、拍賣、請神、共鳴、`ART_BIBLE`、`GAME_DESIGN`、GLB。
- **不改**完整版 27＋3 支編舞的任何一行（tier 2／3 走的就是它們；F2 `--tier=2` 回歸靠這條）。
- **不寫**通用短招（使用者裁 D4 丙已否決）。
- **不動** `TFX.rateMax`、`EV_*`／`FOCUS_*`／`DMG_*` 等既有時間軸常數。
- **不調** F0–F10 任何門檻、seeds、`clean` 判準（`02 §2.1`）。
- **不做** iPhone fps（F5／F6 手機段由使用者回填）。
- **不合併**到 main、**不推** origin、**不在 worktree 外寫檔**。

## 4. 端到端驗證指令原文（全部從 worktree 根目錄跑）
```bash
# 基準檔（trace-eq 要兩份 index.html）
git show adbb124:index.html > scratchpad/base-index.html

# F0 等價（雙向）＋突變驗紅
node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html
node tests/tools/trace-eq.mjs index.html --mutate          # 預期 exit 1
node tests/duel-desync.test.mjs
node tests/lineup-order.test.mjs
node tests/aistake.test.mjs ; node tests/conscap.test.mjs ; node tests/legend.test.mjs
node tests/nightrules.test.mjs ; node tests/review.test.mjs ; node tests/roles-balance.test.mjs ; node tests/wish16.test.mjs
node tests/fxtier.test.mjs

# F1 分母
grep -rn "900" index.html js/
grep -rn "900" tests/ --include=*.mjs --include=*.html --include=*.py

# F2 短版（27／27／3）
node tests/tools/traitfx-drive.mjs docs/experiments/2026-09-10-fx-tiers-evidence/tfx-t1.json --tier=1 --port=9541
node tests/tools/traitfx-drive.mjs docs/experiments/2026-09-10-fx-tiers-evidence/tfx-t2.json --tier=2 --port=9542
node tests/tools/traitfx-drive.mjs docs/experiments/2026-09-10-fx-tiers-evidence/tfx-t3.json --tier=3 --port=9543

# F3 節奏（新／基準同 seeds）
node tests/tools/duel-drive.mjs docs/experiments/2026-09-10-fx-tiers-evidence/duel-new.json --port=9544
node tests/tools/duel-drive.mjs docs/experiments/2026-09-10-fx-tiers-evidence/duel-base.json --root=<基準靜態根> --port=9548

# F4 可讀性（門檻一字不動）
node tests/tools/dmg-readability.mjs dom docs/experiments/2026-09-10-fx-tiers-evidence/dmg-s1.json --seed=1 --port=9545
node tests/tools/dmg-readability.mjs dom docs/experiments/2026-09-10-fx-tiers-evidence/dmg-s3.json --seed=3 --port=9549
node tests/tools/closeup-judge.mjs docs/experiments/2026-09-10-fx-tiers-evidence/cj.json --port=9546

# F5 機械段（黑條僅 tier 3、CINEMA 僅 tier 3）＋ contact sheet
# F7 零錯：由 F2／F3 的 errors 欄位
# F6 fps
node tests/tools/duel-perf.mjs docs/experiments/2026-09-10-fx-tiers-evidence/fps-new.json --port=9547
```
（治具實際旗標若與上表不符，以治具原始碼為準，並在報告記錄實際指令原文。）

## 5. 27 招辨識元素表（短版必須保住的那一件事；抄自各招現有註解）

### 祖靈系（`js/trait-fx/zuling.js`）
| trId | 招名 | 辨識元素（短版必留） |
|---|---|---|
| `eliteOpenShot` | 射日 | 弓弦上凝出的小太陽 → 直射對面最壯那隻 |
| `wardHpFront2` | 鱗紋護體 | 蛇身鱗紋一節一節亮上去 ＋ 半圓護罩罩下 |
| `wardHpAll1` | 山神庇佑 | 背上山岩隆起 ＋ 腳下地紋圓盤擴散 |
| `wardFirst` | 祖靈先手 | 眼睛猛地睜圓、一道注視射向對面 |
| `boltGamble` | 天雷 | 胸前火種升空 ＋ 兩道天雷從高處劈下 |
| `swarmHalfSplash` | 飛魚躍 | 舟身躍離水面 ＋ 落水漣漪環 |
| `swarmThorn` | 獠牙反擊 | 低頭挑牙、牙尖射出獠光 |
| `eliteSelfCut` | 割祭 | 邊光「先暗」再暴亮 ＋ 胸口血火星 |
| `eliteArmor` | 琉璃護心 | 珠鍊一顆一顆亮 ＋ 心口琉璃珠護心罩 |

### 香火系（`js/trait-fx/xianghuo.js`）
| trId | 招名 | 辨識元素（短版必留） |
|---|---|---|
| `eliteCleave` | 斬瘟 | 高舉的劍猛甩 ＋ 一片劍光橫掃過對面整排 |
| `wardAtkAll1` | 令旗改陣 | 旗桿由後猛甩到前 ＋ 兩道令波推過本方整排 |
| `wardAbsorb4` | 送王船 | 船身前滑擋在陣前 ＋ 金罩漲開 |
| `wardImmuneLost` | 千里眼 | 舉鈴搖三下 ＋ 鈴波往外擴 |
| `swarmRally` | 五方調兵 | 旗臂下劈 ＋ 腳下五方光陣（中央盤＋五點營火＋五連線） |
| `biteGamble` | 虎爺反咬 | 伏身張口 → 撲出去 ＋ 兩道咬痕光 |
| `wardHpFirst` | 香灰符 | 掌心一撮金灰拋物線飄到本方最前一隻頭頂 |
| `wardRegen1` | 福壽綿長 | 一縷暖火離燈 ＋ 沒入同伴時的光柱 |
| `swarmLastStand` | 殘旗插心 | 矛尖倒轉插進自己胸口 ＋ 腳下紅光暴亮 |

### 陰氣系（`js/trait-fx/yinqi.js`）
| trId | 招名 | 辨識元素（短版必留） |
|---|---|---|
| `hauntSteal` | 偷命 | 抖動的陰綢牽住對面 ＋ 命火順綢子被吸走 |
| `hauntLost` | 迷途 | 帽尖前指 ＋ 對面小兵頭上鬼火繞圈、原地打轉 |
| `hauntSee` | 看穿 | 椅頭一抬 ＋ 細線指到對面每一隻 |
| `hauntDread1` | 恐懼 | 兜帽抬起 ＋ 暗陰氣圈從對面腳下掃出、對面縮小 |
| `hauntSwap` | 抓交替 | 繩子甩出勾住對面 ＋ 本方自己沉下去的漣漪 |
| `eliteVsSwarm` | 咬手指 | 長爪從高處掃下 ＋ 對面小兵依序噴火星 |
| `swarmPierce` | 陰陽眼 | 銅錢貼上眼位旋亮 ＋ 直線穿透過對面身後 |
| `hauntFearX2` | 恐懼加倍 | 虛影從本尊分離抬起 ＋ 兩圈暗環一前一後推出 |
| `swarmFeed1` | 餓鬼進食 | 甕口張開 ＋ 灰火帶弧線被吸進甕、甕身脹一下 |

### Tier 3 三尊（不寫短版，恆 1400ms＋CINEMA＋黑條）
`eliteBlind`（殘日・餘暉灼目）／`wardGuardAll`（大士爺・普渡）／`hauntAnswer`（有應公・有求必應）。

## 6. F1 分母（動手前自己 grep，不抄評審的 20）
指令原文與清單見 `docs/experiments/2026-09-10-fx-tiers-report.md` §F1；本檔只記結論：
**runtime N=10（招式時長語意 4、排除 6）、治具 N=47（招式時長語意 17、排除 30）**，合計命中 57、需收斂 21。
