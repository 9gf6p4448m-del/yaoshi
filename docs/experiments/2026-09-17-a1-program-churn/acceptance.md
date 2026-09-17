# A1 兩趟繪製修補：凍結驗收（2026-09-17，第三個單一修補）

建立時基準：`d5025cf`（v0.57.14）。修補範圍：對真實頁面量到「每幀重走 `getProgram`」的 5 顆 transparent＋DoubleSide `MeshBasicMaterial`（`js/table-props.js` 接觸陰影、`js/table-tray.js` 硃砂符與月印、`js/trait-fx.js` MAT_GLOW／MAT_SOLID 兩支模板）加 `forceSinglePass: true`。不改幾何、顏色、混合、動畫、規則、亂數、演出時長或任何門檻。

證據來源（真實頁面，`tests/tools/gl-frame-probe.mjs` 新增 program churn 掃描，`gl-probe-churn-slot1.json`）：hover slot1、32 枚時每幀 10 次 `getParameters`，全來自這 5 顆材質、每顆 2 次、`material.version` 每次 +1、program 在兩支之間交替；攔截 `version` 寫入的堆疊落在 Three 0.158 `renderObject`（three.module.js:29725／29729）——`material.transparent && side === DoubleSide && forceSinglePass === false` 時分 BackSide／FrontSide 兩趟各 `needsUpdate = true` 各畫一次。因此這 5 顆每幀多付 5 次 getParameters／cache key、5 次 draw call 與對應 program 切換；桌面平貼 decal 的正背面不會在螢幕上重疊，單趟畫出來應與兩趟相同。

一經訂定不得為了通過縮案例、降門檻或改口徑；要改依 `02 §2.1`。

| # | 條件 | 什麼實作會讓它變紅 |
|---|---|---|
| 1 | 單元測試（Node，走既有測試建 tray／props／trait-fx 的同一條路）：凡 `transparent === true && side === DoubleSide` 的材質，`forceSinglePass === true`；至少涵蓋上述 5 顆（依名稱或模板逐一斷言，不是只數總數）。修補前紅（5 顆全 false）、修補後綠。 | 漏掉任一顆；或改 side 而非 forceSinglePass 卻讓平面被剔除 |
| 2 | `node --test tests/*.test.mjs` 全綠，0 skip，數量＝89＋本卷新增。 | 任一契約壞 |
| 3 | 真實頁面 `gl-frame-probe.mjs`（同 fixture、slot1、32 枚）：`programChurn.getParametersPerFrame` 由 10 降到 0、`materialsCalled` 由 5 降到 0；每幀 draw call（drawElements＋drawElementsInstanced＋drawArrays＋drawArraysInstanced）由 94 降到 89；errors=[]；`texSubImage2D` 維持 5／幀（不動骨架）。 | 沒命中；或多砍了別的 draw |
| 4 | 同幀像素 A/B（真實頁面、同一個 evaluate 內不推進時間，對 slot0–3 各一次）：以出貨旗標渲染一次讀回像素，翻轉這 5 顆的 `forceSinglePass` 再渲染一次讀回，兩張逐位元組比對；相異像素 ≤ 0.1% 且任一通道 |Δ| ≤ 2。 | 平面被剔除或混合順序改變＝大片相異 |
| 5 | 取景矩陣 `--match=slot1` 一塊（399 案）全過，failures=[]、pageErrors=[]（本修補不碰幾何，一塊作煙霧測試）；trace-eq seeds 1–20 對 main 的 index.html 相等。 | 幾何或引擎意外改變 |
| 6 | 正式五輪 perf32／perf128 原工具原口徑重測並記錄；門檻 0.40 不變，未達照記 RED。 | 改工具、改口徑、挑輪次 |
| 7 | 分母交代：`grep -rn DoubleSide js/` 的每一處列出「transparent 與否、在不在本輪修補、不修的理由」；不得只修量到的 5 顆而不交代其餘。 | 漏列 |
| 8 | 發布：1–5、7 全綠、6 已記錄後以 0.57.15 發布並核對公開 HTML／`js/table-props.js`／`js/table-tray.js`／`js/trait-fx.js` 一致；RED 狀態明示。 | 未核對送達就稱已更新 |

## 執行紀錄（2026-09-17）

- 紅燈：`tests/single-pass-decals.test.mjs` 兩條各紅在行為斷言 `false !== true`（tray 那條直接紅；trait-fx 那條把 `js/trait-fx.js` 的旗標暫時 `git checkout` 還原後紅，再 `git apply` 回來）；加旗標後 2/2 綠。
- #2 91/91；#3 getParameters 10→0、draw 94→89、texSubImage2D 5 不變、textures 10→10；#4 四槽翻轉 0 相異、BackSide 對照 2.09–2.14%；#5 slot1 399/399、trace-eq 相等；#6 perf32 .6585（5/5）、perf128 .6943（5/5、gate128 pass）皆 GREEN，分母偏低的說明在 README；#7 14 處逐條列於 README。逐項證據見 [README](README.md)。
- 像素 A/B 的負對照原本寫 FrontSide，實測 0 差異（桌面 decal 全是正面朝相機，剔背面本來就不改畫面）——這個對照沒有鑑別力，改用 BackSide 才看得到差異；#4 條文本身未動，只是對照組換成有鑑別力的那個。
- 版本守衛 `tests/ui-hierarchy.test.mjs` 依既有升版程序同步為 0.57.15；`CLAUDE.md` 加入口一行。
