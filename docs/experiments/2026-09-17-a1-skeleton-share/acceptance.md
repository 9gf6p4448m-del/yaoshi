# A1 骨架共用修補：凍結驗收（2026-09-17，第二個單一修補）

建立時基準：`fb18698`（v0.57.13）。修補範圍：`js/creature-figures.js` 在 `SkeletonUtils.clone` 之後，讓同一尊裡「bone 物件陣列與 boneInverses 完全相同」的 SkinnedMesh 共用同一副 `Skeleton`（新 helper `js/skeleton-share.js`，無外部依賴）。骨頭集合不同的網格照舊各自持有。不改模型、動畫、材質、規則、亂數、演出時長或任何門檻。

證據來源（真實頁面，`tests/tools/gl-frame-probe.mjs`，`gl-probe-slot1.json`）：hover slot1、32 枚時每幀 51 次 `texSubImage2D`（50 張 16×16 RGBA float ＋ 1 張 4×4）＝51 副骨架各自 `skeleton.update()` 並上傳骨骼貼圖，外加 204 次 `texParameteri`／`pixelStorei`；掃描 64 顆可見蒙皮網格共 51 副 Skeleton，但只有 5 組不同的骨頭集合（26／31／27／33 根各一尊＋1 根暖身）。`creature-figures.js:831` 註解已記載 clone 逐 mesh 重建骨架。此成本在預設、lite、128 三變體都存在，是 32 枚 gate 的共同底成本。

一經訂定不得為了通過縮案例、降門檻或改口徑；要改依 `02 §2.1`。

| # | 條件 | 什麼實作會讓它變紅 |
|---|---|---|
| 1 | 單元測試（Node，真實 `yinyangcoin.glb` 經 tools 的 `SkeletonUtils.clone`）：共用後可見 SkinnedMesh 的 distinct Skeleton 數＝distinct 骨頭集合數（該模型應為 1，clone 後原為 13）；播放動畫到固定時間後，每顆網格取樣頂點的蒙皮世界位置（`getVertexPosition`）與共用前逐位元組相等；負例：兩個獨立 clone 實例之間不得共用（各自骨架數不減、動起來不互相拉扯）。修補前紅（骨架數 13≠1）、修補後綠。 | 沒共用；或跨實例誤共用；或位置改變 |
| 2 | `node --test tests/*.test.mjs` 全綠，0 skip，數量＝87＋本卷新增。 | 任一契約壞 |
| 3 | 真實頁面 `gl-frame-probe.mjs`（同 fixture、slot1、32 枚）：`texSubImage2D`／幀 由 51 降至 ≤5，`distinctSkeletons` 由 51 降至 5，errors=[]；`renderer.info.memory.textures` 在 120 幀內不增長。 | 上傳次數沒降＝沒命中 |
| 4 | 1599 取景矩陣（`--match=slot0..3` 四塊）全過，failures=[]、pageErrors=[]；與 v0.57.13 的 `framing-post-slot*.json` 逐案差異分佈不超過同版重跑（p99 同量級、無 >1 px 的系統性偏移）。 | 幾何或生命週期改變 |
| 5 | trace-eq seeds 1–20 對 main 的 index.html 相等。 | 引擎差異 |
| 6 | 正式五輪 perf32／perf128 原工具原口徑重測並記錄；門檻 0.40 不變，未達照記 RED。 | 改工具、改口徑、挑輪次 |
| 7 | dispose 不漏：既有 C-1 回歸路徑（托盤清空再擺回）之 `renderer.info.memory.textures` 不逐輪增加——以 gl-probe 的 memory before/after 與 `moon-dispose`／既有測試為準；共用後被丟棄的多餘 Skeleton 不得留下 boneTexture。 | 貼圖每輪增加 |
| 8 | 發布：1–5、7 全綠、6 已記錄後以 0.57.14 發布並核對公開 HTML／`js/creature-figures.js`／`js/skeleton-share.js` 一致；RED 狀態明示。 | 未核對送達就稱已更新 |

## 執行紀錄（2026-09-17）

- 紅燈：`tests/skeleton-share.test.mjs` 在 helper 不存在時以 identity 退回，行為斷言 `13 !== 1` 紅、負例綠；加入 `js/skeleton-share.js` 並接進 `creature-figures.js` 後 2/2 綠。
- #2 89/89；#3 上傳 51→5、骨架 51→5、textures 56→10；#5 相等；#6 perf32 .4270（5/5）、perf128 .4660（5/5）皆 GREEN；#7 五輪 textures 固定 10。逐項證據見 [README](README.md)。
- **#4 修正（`02 §2.1` 例外，事後回報）**：「逐案差異分佈不超過同版重跑」在跨版本比較上無論實作對錯都不可能成立——桌機視口 launch／terminal 絕對值依賴矩陣跑序狀態，v0.57.13 前後（取景鏈已證逐位元組相同）就有 43 案 >1 px；本版同版重跑 0 案 >1 px、受影響案例單獨跑兩版相等（差 ≤0.02 px）、Node 逐位元組相等。#4 改以「1599 全過＋同版重跑穩定＋單案隔離相等＋Node 逐位元組相等」判綠。這個修正不會讓改壞姿勢的實作通過：改壞姿勢會在單案隔離與 Node 比對上直接露出。工具的跑序依賴列為後續待修。
- 版本守衛 `tests/ui-hierarchy.test.mjs` 依既有升版程序同步為 0.57.14。
