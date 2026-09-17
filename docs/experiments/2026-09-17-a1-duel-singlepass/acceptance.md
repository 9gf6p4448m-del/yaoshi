# A1 對決側兩趟繪製修補：凍結驗收（2026-09-17，第四個單一修補）

建立時基準：`e982638`（v0.57.15）。修補範圍：**對決畫面**真實量到「每 rAF 重走 `getProgram`」的 transparent＋DoubleSide `MeshBasicMaterial`——`js/creature-figures.js` `makeWaterPool()` 的水面圓盤／水緣微光／漣漪環 ×3（每隻 `ab==='buoy'` 各一套 5 顆）與 `js/duel-figures.js` `makeLegendKit()` 殘日的餘暉碟（`aura==='afterglow'`）——加 `forceSinglePass: true`。不改幾何、顏色、混合、動畫、規則、亂數、演出時長或任何門檻。

證據來源（真實頁面，新工具 `tests/tools/gl-duel-probe.mjs`＝前卷探針的三段頁面端函式抽到 `gl-probe-lib.mjs` 後搬到對決畫面；fixture＝`?paperwar=1` 第 2 場對決、隔離 ys: 事件後派合成 ys:duel（A 側殘日帶傳說旗標＋3 隻 buoy＋4 隻重型；B 側 2 隻 buoy＋6 隻），[gl-duel-probe-pre.json](gl-duel-probe-pre.json)）：對決每個 rAF 有 5 趟 render（`passesPerRaf` 5）；26 顆材質（5 隻 buoy × 5 片水面＝25，餘暉碟 1）每 rAF 各 2 次 `getParameters`（每 rAF 共 52 次、每 render 平均 10.4）、`material.version` 每次 +1、program 交替，`version` 寫入的堆疊落在 Three 0.158 `renderObject`（three.module.js:29725／29729）——與前卷牌桌同一機制。每 rAF draw 503（drawElements 95×5＋drawArrays 5.6×5）、`useProgram` 106。同幀像素 A/B 三個取樣翻轉旗標皆 0 相異像素、BackSide 對照 7.97–8.15%——水面與餘暉碟都平躺在桌面、相機俯角 23.9°（低仰角機位 tilt 仍為正 8°），正背面不會在螢幕上重疊，單趟畫出來應與兩趟相同。

一經訂定不得為了通過縮案例、降門檻或改口徑；要改依 `02 §2.1`。

| # | 條件 | 什麼實作會讓它變紅 |
|---|---|---|
| 1 | 單元測試（Node，走真實建構路徑）：① `makeCreatureFigure({ glbUrl, ab: 'buoy' })` 同步掛上的 `ground-water` 群組，5 顆材質（CircleGeometry 圓盤、RingGeometry 緣光與 3 環）皆 `transparent && side === DoubleSide` 且 `forceSinglePass === true`；② `makeLegendKit('canri', …)`（測試用匯出）的 `legend-aura` 餘暉碟材質同上；③ 對照：`makeLegendKit('dashiye')`／`('youyinggong')` 不得含 transparent＋DoubleSide 的 `MeshBasicMaterial`（沒有餘暉碟＝本卷沒動到它們）。修補前 ①② 紅在 `false !== true`、修補後綠。 | 漏掉任一片水面或餘暉碟；或改 side 而非 forceSinglePass |
| 2 | `node --test tests/*.test.mjs` 全綠，0 skip，數量＝91＋本卷新增。 | 任一契約壞 |
| 3 | 真實頁面 `gl-duel-probe.mjs`（同 fixture、120 render）：`perRaf.getParameters` 由 52 降到 0、`programChurn.materialsCalled` 由 26 降到 0；`perRaf.draws` 由 503 降到 477（剛好少 26 次）；`texSubImage2D` 每 render 2.8／0.4／0.2 不變（不動骨架）；errors=[]。 | 沒命中；或多砍了別的 draw |
| 4 | 同幀像素 A/B（真實頁面對決畫面、同一個 evaluate 內不推進時間、3 個取樣點各隔 400ms）：以出貨旗標渲染讀回像素，翻轉場景中所有 transparent＋DoubleSide 材質的 `forceSinglePass` 再渲染讀回，逐位元組比對；三個取樣相異像素皆 ≤ 0.1% 且任一通道 |Δ| ≤ 2；同旗標重渲染 0；BackSide 對照 ≥ 1%（證明比對看得見剔除）。 | 平面被剔除或混合順序改變＝大片相異 |
| 5 | 牌桌不受影響：`gl-frame-probe.mjs --pixelAB=1`（本卷把它的頁面端函式抽到 lib）仍是 getParameters 0、draw 89、4 槽翻轉 0 相異；trace-eq seeds 1–20 對 main 的 index.html 相等。不跑取景矩陣（本修補不碰 tray／props／幾何，理由記在 README）。 | lib 抽取改變了牌桌探針行為；引擎意外改變 |
| 6 | 對決效能相對值：`gl-duel-probe.mjs` 的 `rendersPerSec`（uncapped）修補前／後各 3 輪交錯記錄；`duel-perf.mjs perf --uncap=1` 修補前／後各 1 輪記錄。只記錄，不設門檻（對決側原本沒有 gate；桌機 Chromium 相對值，不等於 Safari fps）。牌桌 perf32 正式五輪原工具原口徑重測一次，門檻 0.40 不變，未達照記 RED。 | 改工具、改口徑、挑輪次 |
| 7 | 分母交代：`grep -rn DoubleSide js/` 的每一處列出「transparent 與否、在不在本輪修補、不修的理由」；本卷特別交代 2D 貼片人形（邊光／地影）與殘日基座 `paperMat`（淡出時暫時 transparent；裂芒是真的兩面重疊的三角形，改單趟會改混合順序）為什麼不修。 | 漏列 |
| 8 | 發布：1–5、7 全綠、6 已記錄後以 0.57.16 發布並核對公開 HTML／`js/creature-figures.js`／`js/duel-figures.js` 一致；RED 狀態明示。 | 未核對送達就稱已更新 |

## 執行紀錄（2026-09-17）

- 紅燈：`tests/single-pass-duel.test.mjs` 兩條各紅在行為斷言 `false !== true`（水面那條紅在 `RingGeometry（blending=2）必須 forceSinglePass=true`、餘暉碟那條紅在 `餘暉碟必須 forceSinglePass=true`），結構斷言（5 片、幾何型別、混合模式、dashiye／youyinggong 對照）先過；加旗標後 2/2 綠。
- #2 93/93、0 skip；#3 每 rAF getParameters 52→0、materialsCalled 26→0、draw 503→477、useProgram 106→55、texSubImage2D 2.8／0.4／0.2 不變、errors=[]；#4 三個取樣翻轉 0 相異（maxΔ 0）、同旗標重渲染 0、BackSide 對照 8.08–8.44%；#5 牌桌探針 getParameters 0、draw 89、4 槽 0 相異、trace-eq 相等（equal:true）；#7 21 處逐條列於 README。
- #6：交錯 2 輪完成（修補後 670.8／741.2、修補前 606.1／528.4 renders/s）；第 3 輪、duel-perf 前後各 1 輪、perf32 五輪被系統記憶體不足中止（Claude Code 自動終止背景工作，指示不自行重跑）——**#6 未完成、#8 不發布**，等使用者裁定後補跑。
- 為了讓 #1 ② 在 Node 走真實建構，`makeLegendKit` 加 `export`（一個字，附註解）；`makeCreatureFigure` 本來就匯出。條文未動。
- 版本守衛 `tests/ui-hierarchy.test.mjs` 依既有升版程序同步為 0.57.16；`CLAUDE.md` 加入口一行。
