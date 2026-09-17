# v0.57.16 對決側兩趟繪製修補：水面與餘暉碟改單趟，8v8 每 rAF getParameters 52→0、draw 503→477

狀態：產品提交見交接（v0.57.16）；公開送達見末段。凍結驗收：[acceptance.md](acceptance.md)（含執行紀錄）。這是 A1 效能診斷的第四個單一修補，接前卷（[program-churn](../2026-09-17-a1-program-churn/README.md)）分母交代裡「對決專用、同一機制、未修」的 4 處候選——交接明訂「先在對決畫面做同幀像素 A/B，再加旗標，不得憑牌桌的結果直接套」。對決側原本沒有效能 gate，本卷只記錄相對值；牌桌 perf32 重測一次確認不受影響。A1 最終驗收仍待真機與原未過項，本卷不宣告 A1 完成。

## 怎麼量的

前卷探針 `gl-frame-probe.mjs` 的三段頁面端函式（WebGL 呼叫計數、program churn 掃描、同幀像素 A/B）抽到 [`tests/tools/gl-probe-lib.mjs`](../../../tests/tools/gl-probe-lib.mjs)，新工具 [`tests/tools/gl-duel-probe.mjs`](../../../tests/tools/gl-duel-probe.mjs) 用 `duel-drive.mjs` 的 `drive()` 把真實頁面（`?paperwar=1&fxcount=1`）玩到第 2 場對決，照 `duel-perf.mjs` 的作法隔離 ys: 事件後派一顆合成 `ys:duel`（A 側殘日帶傳說旗標＋3 隻 buoy＋4 隻重型；B 側 2 隻 buoy＋6 隻），等 `detail.ready`＋600ms 再量 120 次 render。對決畫面每個 rAF 有 **5 趟 render**（`info.render.frame` 每趟 +1），所以探針新增 `rafTicks`／`passesPerRaf`／`perRaf` 換算；「每 render」的分母沿用牌桌口徑。抽取後牌桌探針重跑，數字與前卷一致（getParameters 0、draw 89、4 槽像素 0 差、BackSide 對照 2.09–2.14%），見 [gl-probe-table.json](gl-probe-table.json)。

結果（[gl-duel-probe-pre.json](gl-duel-probe-pre.json)，修補前）：

| 每 rAF | v0.57.15（修補前） | 本卷 v0.57.16 |
|---|---:|---:|
| `getParameters` 呼叫 | 52（26 顆材質 × 2） | **0** |
| draw call（drawElements＋drawArrays） | 503 | **477**（剛好少 26） |
| `useProgram` | 106 | 55 |
| `renderer.info.programs.length` | 56 | 54 |
| `texSubImage2D`（每 render 16×16／8×8／4×4） | 2.8／0.4／0.2 | 2.8／0.4／0.2（不變） |

26 顆全是 `MeshBasicMaterial`：25 顆是 5 隻 buoy 各一套水面（`js/creature-figures.js` `makeWaterPool()`：圓盤 Normal、緣光 Additive、漣漪環 ×3 Additive）、1 顆是殘日的餘暉碟（`js/duel-figures.js` `makeLegendKit()` `aura==='afterglow'`）。每顆每 rAF 2 次、`material.version` 每次 +1、program 交替，`version` 寫入的堆疊落在 Three 0.158 `renderObject`（three.module.js:29725／29729）——與牌桌同一機制：`transparent && side === DoubleSide && !forceSinglePass` 分 BackSide／FrontSide 兩趟、每趟 `needsUpdate = true`。水面與餘暉碟都平躺桌面（`rotation.x = -π/2`），相機俯角 23.9°、傳說進場的低角度機位 tilt 仍是正 8°，沒有從側面或下方看的機位，BackSide 那趟畫不出東西。

## 修補內容

`makeWaterPool()` 的 `flat()` 工廠與餘暉碟材質各加 `forceSinglePass: true`（Three 官方旗標）。DoubleSide 保留：只是不再拆成兩趟，剔除仍是關的。不改幾何、顏色、混合、動畫、規則、亂數、演出時長或任何門檻。另外 `makeLegendKit` 加 `export`（只給 Node 測試建構餘暉碟；產品端仍只由 `update()` 內部呼叫）。版本 0.57.16。

## 證據（依驗收條目）

| # | 條件 | 結果 |
|---|---|---|
| 1 | 單元 RED→GREEN（`tests/single-pass-duel.test.mjs`，經 `three-node-resolver.mjs` 在 Node **真的建構** `makeCreatureFigure({ab:'buoy'})` 的水面與 `makeLegendKit('canri')` 的餘暉碟；GLB 用永遠 pending 的 fetch 擋住，只驗同步建構出來的東西） | 修補前兩條都紅在行為斷言 `false !== true`（`RingGeometry（blending=2）必須 forceSinglePass=true`；`餘暉碟必須 forceSinglePass=true`），結構斷言（5 片、幾何型別、混合模式）先過；修補後 2/2。對照：dashiye／youyinggong 的配件沒有 transparent＋DoubleSide 的 MeshBasicMaterial |
| 2 | 全套測試 | 93/93、0 skip（91＋2），[tests-all.txt](tests-all.txt)，最終程式（含 0.57.16 版本字串） |
| 3 | 真實頁面對決探針 | 每 rAF getParameters 52→0、materialsCalled 26→0、draw 503→477、texSubImage2D 2.8／0.4／0.2 不變、errors=[]（[gl-duel-probe-post.json](gl-duel-probe-post.json)） |
| 4 | 同幀像素 A/B（對決畫面 3 個取樣） | 翻轉旗標：三個取樣皆 **0 相異像素**（maxΔ 0）；同旗標重渲染 0；BackSide 對照 8.08–8.44%（修補前 7.97–8.15%）；1688×780、非零像素 1316640。修補前後互為鏡像，結果相同 |
| 5 | 牌桌不受影響＋trace-eq | 牌桌探針 getParameters 0、draw 89、4 槽翻轉 0 相異（[gl-probe-table.json](gl-probe-table.json)）；trace-eq seeds 1–20 對 `e982638` 的 index.html 相等（[trace-eq-0.57.16.txt](trace-eq-0.57.16.txt)）。不跑取景矩陣：本修補不碰 tray／props／任何幾何 |
| 6 | 效能相對值 | 見下段 |
| 7 | 分母交代 | 見下段 |
| 8 | 發布與送達 | 見末段 |

### #6 效能相對值（桌機 Chromium、844×390 DPR2、uncapped、同機獨佔、交錯）

| 輪 | 修補後 renders/s | 修補前 renders/s（`--root` 指 e982638 基準樹） |
|---|---:|---:|
| 1 | 670.8 | 606.1 |
| 2 | 741.2 | 528.4 |

（[duel-probe-rps-interleaved.json](duel-probe-rps-interleaved.json)，逐輪原始檔 dp-post-1／2、dp-pre-1／2）。兩輪修補後皆高於修補前，計數欄位兩邊穩定（修補前每 rAF getParameters 52／draw 503、修補後 0／477）。**只記錄不設門檻**，且**未跑完凍結的量**：原訂 3 輪交錯、`duel-perf.mjs perf --uncap=1` 前後各 1 輪、牌桌 perf32 五輪——第 3 輪起被 Claude Code 因系統記憶體不足中止（2026-09-17，本機當時只剩約 2 GB 可用），依指示不自行重跑。#6 的其餘項目**未完成**，因此 #8 的發布前提不成立，本卷尚未發布（見末段）。

### #7 分母交代（`grep -rn DoubleSide js/` 共 21 處，含本卷新加的 4 行註解）

| 位置 | transparent | 本輪 | 理由 |
|---|---|---|---|
| `creature-figures.js:896` 水面 `flat()`（圓盤／緣光／3 環） | 是 | **已修** | 真實對決量到（每隻 buoy 5 顆） |
| `duel-figures.js:519` 餘暉碟 | 是 | **已修** | 真實對決量到 |
| `duel-figures.js:176` `flatMat`（2D 貼片人形：邊光 :244–245 與地影 :285 帶 transparent） | 是 | 未修 | 正式對決走不到：`js/renderer.js:130` 只在單位缺 `ab` 時退回 `makeLayeredFigure()`，而 `duel-drive.mjs` 的 `abOnAllUnits` 斷言正式路徑的單位一律有 `ab`。本卷探針在 8v8 對決裡沒量到任何 flatMat 材質重走 getProgram（materialsCalled 26 全是水面與餘暉碟）。要修得先在真實頁面派缺 `ab` 的合成對決做像素 A/B，不憑本卷結果套 |
| `duel-figures.js:481` 殘日基座 `paperMat`（MeshStandardMaterial） | 否；淡出時暫時是（`setFigureOpacity` q<1 把非加色材質設 transparent） | 未修 | 常態不透明、不走兩趟（本卷 26 顆裡沒有它）。裂芒是**真的兩面重疊**的單面三角形（註解「俯角下要兩面都畫」），淡出那幾幀改單趟會改變混合順序，不是「BackSide 畫不出東西」的情況——不適用本修法 |
| `table-props.js:403`、`table-tray.js:407／412`、`trait-fx.js:187／198` | 是 | 前卷已修 | v0.57.15 |
| `scene-env.js:295`、`table-props.js:625`、`table-tray.js:175／299` | 否（MeshStandard 不透明） | 不適用 | 不透明材質不走兩趟 |
| `creature-figures.js:891／893`、`duel-figures.js:516`、`scene-env.js:318–319`、`table-props.js:621–622`、`trait-fx.js:1533` | 註解 | 不適用 | |

## 工具

- `node tests/tools/gl-duel-probe.mjs --out=<json> [--frames=120] [--pixelAB=1] [--port=8897] [--root=<靜態根>]`：對決畫面版探針（fixture 寫在檔頭與 `FIXTURE` 常數）。`--root` 指到基準樹就量修補前。
- `tests/tools/gl-probe-lib.mjs`：三段頁面端函式（`glProbeInit`／`scanFrames`／`pixelABFrame`），牌桌與對決共用；`scanFrames` 新增 `rafTicks`／`passesPerRaf`／`perRaf`。
- `tests/tools/gl-frame-probe.mjs`：改為 import lib，行為不變（見上）。

## 公開送達

**尚未發布。** #6 的 duel-perf 前後各 1 輪與牌桌 perf32 五輪被系統記憶體不足中止、未重跑；依凍結驗收 #8，#6 記錄完整前不發布。程式、測試、探針與本報告已提交在 `a1/framing-dedupe` 分支，待補跑 #6 後再快轉合入 main 推送並核對送達。
