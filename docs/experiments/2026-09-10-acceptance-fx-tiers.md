# 驗收凍結：招式三級視覺分級（ROADMAP_V2 Top 2 第一步，2026-09-10，目標版號 v0.54）

> 基準＝`main` `4b7dadd`（v0.53）。依據 `docs/proposals/2026-09-10-roadmap-v2-review.md` §1（技術可行性）、§15（純演出卷驗法）。使用者 2026-09-10 裁定 **D4 丙**：不走通用短招，**27 支專屬招各自寫一條 Tier 1 短版時間軸（260ms）**，完整版留 Tier 2，三尊大招 Tier 3 走新機位＋黑邊。使用者原話：「想做遊戲大作、不想做出垃圾遊戲、野心大一點、看 Fable 5.1 極限」——模糊處一律往「更有大作感、個性不丟」取捨，不往「省事」取捨。本檔訂下後即凍結（`02 §2.1`），要改只有「原標準錯在哪、為什麼現在才知道」＋使用者逐條同意一條路。

## 範圍
- **純演出卷**：對決引擎（`playDuelWar`／`war.beats`）、`TRAITS` 規則欄位、AI、拍賣、請神、共鳴一格不動；`TRAITS[]` 只**新增** `tier` 欄位。
- **分母先歸一（`02 §6.1` 第 7 條）**：評審數出 20 處 `900`（runtime 4：`index.html:3976` `PW_FX.TRAIT_MS`、`js/trait-fx.js:366` `Number(det.ms)||900`、`js/camera-director.js:74` `LEAN.ms` 與 `:18` table shot；治具 16：`traitfx-drive.mjs:54,111-114`、`cam-drive.mjs:62,90`、`cam-unit.mjs` ×12、`closeup-cam-unit.mjs:78`、`closeup-judge.mjs:116`）。動手前 agent 自己再 grep 一次寫下分母 N（不得憑評審數字），runtime 收成 **`PW_FX.TRAIT_MS_BY_TIER` 單一來源**，治具改讀共用 `tests/tools/fx-consts.mjs`（其值再對頁面常數斷言）。事件一律帶 `detail.ms`，`trait-fx.js` 與 `camera-director.js` 的 `||900` 退路**刪掉，沒帶就 throw**。
- **三級定義（拍級，不是招級）**：`pwBeatTier(beat, war)`＝ `LEGENDS` 三招 → 3；該拍**擊殺**（目標 hp→0）或該場對決的**決定性最後一拍** → 2；其餘 → 1。`TRAITS[].tier` 是該招的**上限**（預設 1 的招也能因擊殺升 2；`LEGENDS` 三招 3）。數字表 `PW_FX.TRAIT_MS_BY_TIER={1:260, 2:900, 3:1400}`。
- **Tier 1 短版**：27 支（`js/trait-fx/{zuling,xianghuo,yinqi}.js` 各 9）每支新增一條 260ms 時間軸（同檔同函式加 `det.tier===1` 分支或 `short` 變體，介面由 agent 在計畫檔第 2 節寫死），**必須保留該招的辨識元素**（eliteBlind 的餘暉、hauntAnswer 的回應等；辨識元素清單 agent 從現有 27 支註解／視覺各抄一句進計畫檔，短版對照表交人眼）。短版**原生塞進 260ms**：`rate` 不得 >1.0（不靠縮放硬擠），`flinchMs`／`atReserve`／`endMargin` 三常數改成**隨 `det.ms/900` 等比**（`trait-fx.js` 一處改）。
- **Tier 2**：現有完整版原樣（900ms）。**Tier 3**：三尊現有三招函式＋`camera-director.js` 新 `CINEMA` 機位（低角度仰視、dist 拉近）＋兩條 DOM 黑條 letterbox（與 `#vignette` 同層、不進 shader）＋1400ms；只在 tier 3 出現。
- **拍末等待**：走 3D 舞台時等 `TRAIT_MS_BY_TIER[tier]`（取代單一 `TRAIT_MS`）；`BEAT_MIN_MS` 900→依 tier（tier 1 ≈ `EV_MAX_MS` 預算內並行，取 260～300；確切值 agent 計畫檔寫死）。`closeup-judge.mjs:116` 分析視窗改**讀拍長**，「靜幀 ≥8 幀不足回 null」那條要先改成依拍長換算幀數，否則 tier 1 會靜默 null（恆綠）。
- **kill switch**：`?fxtier=0` → 所有拍走 tier 2（＝v0.53 行為：900、無 CINEMA、無黑條）；預設開。
- **不動**：`ART_BIBLE`、`GAME_DESIGN`（純演出）、GLB 資產、`bloom.js`、對決引擎、所有規則測試的斷言。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **F0 等價雙向**：`trace-eq` 對基準 `4b7dadd` `trace(1..20)` 逐位元組相等（預設與 `?fxtier=0` 都相等，純演出）；**突變驗紅**：把任一規則常數改壞（改壞前先備份副本，用副本還原）→ 不相等。`tests/duel-desync.test.mjs`／`lineup-order.test.mjs` 與其餘 9 套全綠、零毫秒斷言新增。
- **F1 分母歸一**：agent 動手前寫下 N（grep 指令原文＋清單）；改後 runtime（`index.html`、`js/`）語意為招式時長的 `900` 字面值＝**0 處**（`font-weight:900`、開服 `setTimeout(r,900)` 不算，清單要列出排除的每一處）；治具 16 處全改讀 `fx-consts.mjs`；單元測試：`fx-consts.mjs` 與頁面 `PW_FX.TRAIT_MS_BY_TIER` 不一致→紅；事件缺 `detail.ms` → throw（測試對基準紅在行為斷言）。
- **F2 27 短版原生合身**：`traitfx-drive --tier=1` 30 套（27＋三尊 tier 3）`onTime` 全過**且 `clean`（`cut===0 && fused===0`）全過、`rate ≤1.0`**（短版不得靠加速擠進去）；`--tier=2` 27 套與基準同結果（回歸）；`--tier=3` 三尊 1400ms clean、CINEMA 觸發、黑條 DOM 存在。治具讀 `fx-consts.mjs` 不得寫死。什麼實作會讓它假綠：短版只是把完整版 `rate` 拉到 3.46×（`rate` 上限 1.0 擋）；把 `clean` 判準放寬。
- **F3 節奏**：`duel-drive` 4 場（seeds 固定）`duelsMs` 中位 **≤5 s**（8v8 基礎戰），有 tier 3 出場的對決 ≤8 s；基準 `4b7dadd` 同 seeds 數字一併印出（預期 5–10 s）。
- **F4 可讀性不退**：`dmg-readability` seeds 1/3 R1（字級 ≥1.6×）／R2（方案 A：中位 ≥+25 且 ≥25 比例 ≥70%＋Δ200 單向 ≤+5）**維持綠**，門檻一字不動；`closeup-judge` P 系列在 tier 1 拍**不得回 null**（治具讀拍長；null 數印出、必須 0）。
- **F5 三級可辨（人眼＋機械）**：機械——黑條僅 tier 3 期間 `visible`（tier 1／2 期間 0 次，Playwright 斷言）；CINEMA 僅 tier 3。人眼——844×390 contact sheet：①27 支短版中段幀各一格（與完整版中段幀並排、標招名與辨識元素）②tier 2 擊殺拍 3 格 ③tier 3 三尊大招各 3 幀（含黑條）。**交使用者挑**：使用者點名「看不出是哪一招」的短版回頭改，最多兩輪。
- **F6 fps**：桌機 `?fps=1` 對決期間 fps 比值（新／基準，同 seeds）**≥0.90**、draw calls 不增（黑條是 DOM）；iPhone `?fps=1` 由使用者回填（記錄項，不擋合併）。
- **F7 Playwright 零錯**：`duel-drive` 4 場＋`traitfx-drive` 全套 0 console error／pageerror／requestfailed；`?fxtier=0` 4 場同樣 0 error。
- **F8 文件**：`IMPLEMENTATION_GUIDE.md` 新 §11.27（三級定義、`TRAIT_MS_BY_TIER` 單一來源、`fx-consts.mjs`、「`||900` 退路已刪、事件必帶 ms」、`?fxtier=0`）；`VERSION="0.54"`＋`VERSION_NOTE` 首段寫本卷；`ART_BIBLE`／`GAME_DESIGN` diff 為空。
- **F9 範圍**：`git diff --stat 4b7dadd..` 只含計畫檔第 1 節列出的檔；`TRAITS` 的 diff 只有 `tier` 欄位；引擎函式 diff 為空（以 diff 證明）。
- **F10 短版品質下限（機械）**：每支短版時間軸至少含 2 個以上非 flinch 的 tween／fly／fade／grow（防「只剩一個閃光」的偷懶短版）；由 `traitfx-drive --tier=1` 統計並印表。

什麼實作會讓 F2 假綠：`--tier=1` 其實還在跑 900 的完整版（治具要斷言 `run.ms===260`）。什麼實作會讓 F3 假綠：把拍與拍之間的等待砍到 0 讓人看不清（F4 R1/R2 與 F5 人眼擋）。什麼實作會讓 F0 假綠：trace 沒把 `war.beats` 的 kind/side/trId 全部序列化（trace-eq 現有欄位不得縮）。

## §2.1 修訂紀錄

### 修訂一（三級定義變更，**不是門檻變更**）——使用者 2026-09-10 裁甲
**變了什麼**：`pwBeatTier` 的 tier 2 條件從「該拍有擊殺（目標 hp→0）**或**該場決定性最後一拍」
收窄成「①該場決定性最後一拍 ②這一拍燒掉了傳說三尊之一」兩種；**一般的擊殺拍改走 tier 1**
（260ms 短版＋300ms 拍末下限）。tier 3 的條件（該拍有 `TRAITS[].tier===3` 的招）不變。
**F3 的門檻 5 秒一字沒動**，動的是三級定義本身。

**為什麼**（一版實測的歸因）：一版 4 場 12 拍的分布是 `FXC.tiers = {1:4, 2:8, 3:0}`——
8v8 基礎戰三分之二的拍都有紙紮被燒，於是「該拍有擊殺→tier 2」把拍末下限大多留在 900ms，
招式本身一局又只出現 4 次（`FXC.trait=4`，900→260 總共只省 2560ms）。
F3 中位因此只從基準的 5573.5ms 降到 5302ms，離門檻 5000 還差 302ms。
收窄之後 `tiers` 翻轉成 `{1:8, 2:4, 3:0}`，一般擊殺拍回到短版。

**改前改後（`duel-drive` 4 場，seed=7，同一組 seeds）**：

| 版本 | 4 場 duelsMs | 中位 | `FXC.tiers` |
|---|---|---|---|
| 基準 `adbb124`（v0.53） | `[5222, 5925, 4697, 8634]` | 5573.5ms | —（沒有分級） |
| 一版（擊殺拍即 tier 2） | `[4642, 5889, 4715, 8716]` | 5302.0ms | `{1:4, 2:8, 3:0}` |
| **二版（本修訂）** | `[4916, 5355, 4756, 7590]` | **5135.5ms** | `{1:8, 2:4, 3:0}` |

比基準快 438ms（−7.9%），比一版再快 166.5ms。**仍未達 ≤5000 的門檻**（差 135.5ms），F3 續紅——
剩下的時間大宗已經不是拍末下限，而是逐筆事件（`EV_BUDGET_MS 1050`）、拍首字幕（`BANNER_MS 360`）、
進退場（`ENTER_MS 480`＋`END_MS 1000`），那些常數在本卷的「不做什麼」裡明列不動。

**誰同意**：使用者 2026-09-10 裁甲（主對話轉達）。本修訂只改「哪些拍算重要」，不放寬任何數字門檻。

### 修訂二（F4 口徑修訂）——使用者 2026-09-10 明確同意
**原標準錯在哪**：F4 寫「`closeup-judge` P 系列在 tier 1 拍**不得回 null**（null 數印出、必須 0）」，
但基準 `adbb124`（v0.53、沒有任何 tier 分級）跑同一組 seeds **本來就有 2 筆 null**
（`rows 6/8`，`quiet=0`）；`dmg-readability` seed 3 的 R2 在基準上同樣是空過（`maskN=0`、
`maskDropped {moved:3, tinyMask:2}` 逐項相同）。
成因是**命中拍每 45–260ms 一次 punch 把靜幀排光**（`closeup-judge` 檔頭 v0.45 就記過），
與 tier、與分析視窗長度都無關。也就是說「必須 0」這條**無論實作對錯都不可能通過**＝恆假，
不是驗收條件（`02 §2.1` 例外條的判準：這個修正不會讓一份壞掉的實作變成通過）。

**為什麼現在才知道**：v0.53 的 `closeup-judge` 把 `monoQuietOk===null` 當「不算過」但也不計數，
`PASS` 只看有樣本的那幾筆（`mq.every(...)`）——null 被靜默吞掉。
本卷第一次把它升成明確紅並印出 `nullCount`，才把既有缺陷照出來。

**新口徑**：
- `closeup-judge`：**`nullCount` ≤ 基準同 seeds 的 `nullCount`（＝2）**，且非 null 樣本的 `deepOk`／`monoQuiet` 全過。
  治具新增 `--nullbase=<n>`，那個數字必須是基準實跑出來的（跑法寫在治具檔頭）。
- `dmg-readability`：**每個 seed 的空過數 ≤ 基準**（seed 3 ＝1，seed 1 ＝0），有樣本的 seed 其 R1／R2 維持綠。

**改前改後**：

| 量 | 基準 `adbb124` | 一版 | 二版 |
|---|---|---|---|
| `closeup-judge` nullCount | 2（rows 6/8，`quiet=0`） | 2（同兩筆） | 2（同兩筆） |
| 非 null 樣本 `monoQuiet` | 8/8 | 8/8 | 8/8 |
| `deepOk` | 10/10 | 10/10 | 10/10 |
| `dmg-readability` seed 1 | R1 PASS／R2 PASS | R1 PASS／R2 PASS | R1 PASS／R2 PASS |
| `dmg-readability` seed 3 | R1 PASS／R2 空過（`maskN=0`） | 同左 | 同左 |

**成因不在本卷修**：punch 排光靜幀是量測治具的問題（要嘛改量測位置、要嘛在 punch 期間另找對照幀），
另開治具小卷處理。本卷只把口徑改成「不比基準差」，不碰 `dmg-readability` 的 R1／R2 門檻一個字。

### 修訂三（計畫檔第 1 節補列）——`02 §2.1` 的「細化」，不提高通過機率
`js/renderer.js`（+1 行，把既有的 `director` 掛上 `window.__yaoshi3d` 供 F5 探針讀 `cinemaOn()`）
一版沒寫進計畫檔第 1 節的檔案清單，F9 因此判紅；連同使用者追加的 `?fps=1`「上一場對決最低 fps」
欄位（`index.html` 的 `FPS_DIAG` 段）一起補列，理由寫在計畫檔第 1 節的備註欄。
**這一條不放寬任何驗收**：F9 的判準仍是「diff 只含計畫檔列出的檔」，補列的是**實際需要且已經做完**的檔，
不是把不該動的檔放進來。
