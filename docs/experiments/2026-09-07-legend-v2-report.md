# 請神 2.0「神債暗標」實作報告（2026-09-07，v0.47）

規格＝`docs/proposals/2026-09-07-legend-v2-debt-auction.md` §二（11 條，含 2026-09-07 裁丙的供奉互動口徑）。
驗收凍結＝`docs/experiments/2026-09-07-acceptance-legend-v2.md`（G0–G11，**全程未動**）。
基準 SHA＝`b38980a`（派工時的 main＝請神 1.0）。證據落檔＝`docs/experiments/2026-09-07-legend-v2-evidence/`。

## 0. 結論表

| 閘門 | 判定 | 一句話 |
|---|---|---|
| G0 kill switch 雙向 | ✅ | 顯式 OFF 與基準 OFF 逐位元組相等（332125/332125）；預設不等；三龕 night 互異且落在 `[4,7,10]` |
| G1 優勢策略 | ✅ | `incenseMax − splitter` 從 1.0 的 **+10.72pp** 變成 **−5.62pp**（門檻 ≤+5）；`incenseNever` −1.06pp（門檻 ≥−8）；任一 ≤40% |
| G2 活性 | ❌ | 「至少一尊被請走」97.42% ✅、「三尊同一人」0 ✅，但**供奉回天 42.51%**（門檻 1–20%）❌ |
| G3 節奏 | ✅ | 中位 11 夜；三策略位移 −0.45／+0.20／−1.10pp |
| G4 消耗戰 | ✅ | 三個請神夜前三名平均投入 1.80／3.11／4.02（≤9）；落空者平均淨損 2.01（≤6） |
| G5 單元測試 | ✅ | 17 案全過；對基準 `b38980a` **15 紅**，全部紅在行為斷言 |
| G6 Playwright | ✅ | 請走／回天／落空獎勵各至少一次、0 console error、橫式與直式溢出各 0 |
| G7 版面截圖 | ✅（人眼待使用者複驗） | 北家頂端正中、三龕在法寶卡正上方、四家香火一行、盯上說明第二夜起一行 |
| G8 文件與範圍 | ✅ | GAME_DESIGN §5.9＋changelog、GUIDE §11.22、`git diff --stat` 只含應改的檔 |
| G9 持有者勝率帶 | ❌ | **74.25%**（門檻 [45%,60%]；1.0 為 76%）——**未自調，選項與估計列在 §4** |
| G10 傳說共鳴閘門 | ✅ | `resonance-gate` R2′／R3 n=10000 重跑仍綠（門檻未動）；單元測試 `facCount("zuling")=4` 對基準紅 |
| G11 部隊預覽正確性 | ✅ | 5 個袋子逐項等於 `buildArmy`＋`TRAITS`；27 件＋3 尊招式行皆非空；截圖見 §3 |

**兩條紅燈（G2 的供奉回天比例、G9 的持有者勝率帶）都沒有動門檻、也沒有動實作去遷就它們**，
診斷與可選調整列在 §4，等使用者裁定。

## 1. 做了什麼（`檔案:行號` 以 HEAD 為準）

（見 `git diff b38980a..HEAD -- index.html`；下表是導覽，不是逐行清單）

| 區塊 | 位置 | 改動 |
|---|---|---|
| CFG | `index.html` `CFG` 的請神段 | 移除 `INC_K`／`INC_PITY`；新增 `SHRINE_NIGHTS=[4,7,10]`／`INC_TITHE=1`／`TITHE_WARN=2`；`INC_AI` 改成 `{minLifeFrac:0.3, value:12}` |
| effect 來源 | `collectEffects` | items() 多收一條 `it.eff`（傳說沒有 `ab`，而 `ab` 欄被 `buildArmy` 當 3D 模型鍵用） |
| 資料表 | `LEGENDS` | 三尊各加 `eff.hooks.onFacCount +1`＝**傳說共鳴（視為 2 件）** |
| 建局 | `makeState` | `shuffle([...CFG.SHRINE_NIGHTS])` 洗尊→夜寫進 `sh.night`；`shrineStat` 換欄位；新增 `S.titheAsk` |
| 請神 | `aiIncense` | 改成追價模型：只燒「追平所需」，兩條停損（追不上／估值扣完為負） |
| 請神 | `hasLegend`／`shrineWindOrder` | 一人一尊的唯一事實來源（判準是 `sh.takenBy`）；同分的風位順時針序 |
| 請神 | `shrineReward`／`shrineClose` | 區間基準改成呼叫端傳進來的「本龕最高 h」`top`；順手記 `sh.closeH`／`sh.closeBack`（純記錄，閘門 G4 用） |
| 請神 | `resolveShrines` | 移除 `shrineRollOrder` 與整段擲骰／天井；改成「請神夜開標比大小」＋回天＋一人一尊擋封籤 |
| 供奉 | `releaseLegend`／`settleTithe` | 新增；`settleTithe(nightly)` 掛在 `resolveBattles` 的夜末段（三條迴圈共用的那一支） |
| 供奉 UI | `showTitheAsk`／`giveUpLegend`／`showBag` | 危急提示（同一尊一次）＋袋子面板常駐「送神回天」鈕 |
| 部隊預覽 | `unitRow`／`unitRowText`／`bagPreviewHTML` | 新增；市集卡與袋子面板共用，數值走 `buildArmy`、招式走 `TRAITS` |
| 版面 | `renderSeats`／`showMarket`／`showMarkUI`／CSS | 神龕列從 `#north` 搬進 `#stage`（法寶卡正上方）；四家香火一行；盯上說明第二夜起一行 |
| 版面 | CSS `#east .mark-stamp`／`#market` | 修 19px（東席盯上印放大時凸出）與 3px（最右卡的 `.pickbox`）橫向溢出；直式 `#market` 比照 `#shrines` 收起來 |
| 教學／規則頁 | `introPages`／規則頁請神段 | 加「請神」第四卡；規則頁改 2.0 口徑（機率表整段拿掉） |
| 治具 | `tests/legend.test.mjs`／`legend-gate.mjs`／`legend-drive.mjs` | 重寫成 G5／G0–G4＋G9／G6；新增 `overflow-probe.mjs`／`mkt-probe.mjs`／`layout-shot.mjs` |

## 2. 逐條證據

見 §0 表與 `docs/experiments/2026-09-07-legend-v2-evidence/` 下的原始輸出檔。

## 3. 截圖

## 4. 兩條紅燈的診斷與選項（**不自調，等使用者裁**）

## 5. 假設與待確認
