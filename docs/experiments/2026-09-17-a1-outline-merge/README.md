# v0.57.17 描邊外殼合併：一尊一顆殼，8v8 對決每 rAF draw 477→296、牌桌 hover 89→77

狀態：產品提交見交接（v0.57.17）；公開送達見末段。凍結驗收：[acceptance.md](acceptance.md)（含執行紀錄）。這是 A1 效能診斷的第五個單一修補。前卷交接把「對決每 rAF 5 趟 render」列為候選，本卷先量再定假設：5 趟＝場景→RT、亮部萃取、模糊 H、模糊 V、合成，是 `js/bloom.js` 自製 bloom 的最小配置，不是缺陷；真正的大頭是場景那一趟的 draw 分佈——**477 次裡 197 次是描邊外殼**（每顆本體 mesh 底下一顆），本體只有 207。A1 最終驗收仍待真機與原未過項，本卷不宣告 A1 完成。

## 怎麼找到的

`tests/tools/gl-probe-lib.mjs` 新增兩支頁面端掃描：`drawBudgetScan`（traverseVisible 逐物件依名稱／型別／頂層祖先分組，附視錐內數）與 `shellMergeScan`（逐尊列骨架數、bindMatrix 數、本地矩陣、屬性集、材質群組）。對決 8v8（同前卷 fixture，[gl-duel-probe-pre.json](gl-duel-probe-pre.json)）：

| 分類（每 rAF 場景那一趟） | draw |
|---|---:|
| `outline[skin]`（外殼） | **197** |
| `creature_*[skin]`（本體 16 尊） | 207 |
| `Mesh`（傳說配件、水面、地影等） | 40 |
| `Points`（三系環境粒子） | 23 |
| 桌面／夜空／遠景／暖身 | 10 |

16 尊逐尊：每尊 1 副骨架、1 個 bindMatrix、部件本地矩陣全單位、屬性集一律 `color+normal+position+skinIndex+skinWeight+idx`、全單材質、部件父節點一律 `creature`；buoy 10 部件只掛 8 殼（2 個 ghost_* 部件本來就不描）。牌桌 hover slot1（[gl-probe-table-pre.json](gl-probe-table-pre.json)）89 次裡 13 次是外殼（只有 hover 那尊的殼可見）。

## 修補內容

`js/creature-figures.js`：新增 `mergeOutlineGeometry(parts, isGhost)`（把同一尊所有非 ghost 部件的 geometry 併成一份，ghost 材質群組整段剔除，index 逐段位移；任一部件沒 index、缺蒙皮屬性、屬性集或型別不一致、interleaved → 回 `null`）與 `canMergeOutline`（全 SkinnedMesh、同骨架、同 bindMatrix、同父節點、本地矩陣單位）。掛殼時前提成立就建**一顆** `SkinnedMesh(mergedGeo, shell.mat)`，綁同一副骨架與 bindMatrix、掛在部件的共同父節點上；不成立退回原本逐部件外殼。合併後的 geometry 依 GLB URL 快取（`outlineGeoCache`），與 `glbCache` 同生命週期、多實例共用，不逐尊生、不逐尊釋放。描邊 shader、線寬、顏色、燒毀切口（本地座標，部件本地矩陣是單位 ⇒ 不變）、規則、亂數、演出時長皆未動。版本 0.57.17。

## 證據（依驗收條目）

| # | 條件 | 結果 |
|---|---|---|
| 1 | 單元（`tests/outline-merge.test.mjs`，合成共用骨架的 SkinnedMesh 部件） | 3/3：屬性串接與 index 位移、ghost 群組剔除／全 ghost 部件不併／不留 groups、無 index 或屬性集不同回 null。行為紅綠在 #3（修補前每尊殼數＝部件數） |
| 2 | 全套測試 | 96/96、0 skip（93＋3），[tests-all.txt](tests-all.txt)，最終程式（含 0.57.17 版本字串） |
| 3 | 真實頁面對決探針 | 16 尊 `shells`／`shellDraws` 皆 1；`outline[skin]` 197→**16**；每 rAF draw 477→**296**（剛好少 181）；getParameters 維持 0；texSubImage2D 2.8／0.4／0.2 不變；errors=[]（[gl-duel-probe-post.json](gl-duel-probe-post.json)） |
| 4 | 同幀像素 A/B（合併殼 vs 探針照退路做法臨時掛回的逐部件殼） | 對決 3 個取樣皆 **0 相異像素**（maxΔ 0；每次重掛 282 顆退路殼）；同旗標重渲染 0；兩種殼都關的對照 3.27–3.83%。牌桌 hover slot0–3 皆 0 相異（退路殼 7／13／17／8 顆）；對照 0.24–0.50%（見執行紀錄的說明）。前卷的 forceSinglePass 翻轉 A/B 也仍是 0 |
| 5 | 牌桌／釋放／矩陣／trace | hover slot1 draw 89→**77**、getParameters 0；`--disposeRounds=5` geometries 80／textures 10 六輪不變；取景矩陣 `--all --match=slot1` 399/399（[framing-slot1.json](framing-slot1.json)）；trace-eq seeds 1–20 對 `e5ed38e` 相等（[trace-eq-0.57.17.txt](trace-eq-0.57.17.txt)） |
| 6 | 效能 | 見下段 |
| 7 | 分母交代 | 見下段 |
| 8 | 發布與送達 | 見末段 |

### #6 效能（桌機 Chromium、844×390 DPR2、同機獨佔）

| 量法 | 修補後 | 修補前（基準樹 e5ed38e） | 判讀 |
|---|---:|---:|---|
| 牌桌 perf32 正式五輪（`scene-shot.mjs --perf --runs=5`） | defaultOnHover **.585**、paired 5/5（.514–.638）、calls **77**／tris 29477 | 前卷 .6058（calls 89） | **GREEN**（門檻 .40）；區間與前三卷相同，calls 少 12＝hover 那尊 13 殼→1 |
| 牌桌 perf128 正式五輪（`--coins=128 --gate128=1`） | defaultOnHover **.6069**、paired 5/5（.529–.736）、`gate128.pass=true`、calls 75 | 前卷 .6943 | **GREEN**；128 枚壓力情境本來就關 hover 描邊（`pressureOutlines`），calls 不變是預期 |
| 對決 `gl-duel-probe.mjs` renders/s，交錯 3 輪（uncapped，殘日＋5 隻 buoy） | 663.3／614.4／565.0（draw 296） | 521.1／495.9／518.6（draw 477） | 三輪皆修補後較快（+27%／+24%／+9%），只記錄不設門檻 |

原始檔：[perf32-outline-merge.json](perf32-outline-merge.json)、[perf128-outline-merge.json](perf128-outline-merge.json)、[duel-probe-rps-interleaved.json](duel-probe-rps-interleaved.json)（dp-post-1～3、dp-pre-1～3）。這些是桌機 Chromium 相對值，不等於 Safari fps。


### #7 分母交代（`grep -rn "outlines()\|'outline'" js/ tests/`）

| 位置 | 合併後語意 |
|---|---|
| `js/creature-figures.js` `outlines()` | 回傳陣列長度由部件數變 1（退路時仍是部件數）；燒毀時 `visible=false`、`reset()` 設回 true 的邏輯不變 |
| `js/table-tray.js:470` `applyOutline` | 逐顆設 visible → 只剩一顆，效果相同 |
| `js/table-tray.js:645` `items().outlines` | 可見殼數：hover 那尊由 13 變 1、其餘 0。只給治具回報用（`scene-shot.mjs:296`、`legend-drive.mjs:548`、`market-focus-check.mjs:265` 記錄欄位），沒有測試斷言它的值 |
| `tests/tools/outline-probe.mjs` | 回報 `outlines().length` 與 visible 陣列（燒毀後應全 false）——長度變 1，語意不變 |
| `tests/tools/faction-sheet.mjs:140` | 記錄欄位 |
| `js/trait-fx.js` 等 | 不引用外殼（`grep 'outline'` 只命中 creature-figures 與上列治具） |

## 工具

- `gl-probe-lib.mjs`：新增 `drawBudgetScan`／`shellMergeScan`／`shellABFrame`；`gl-duel-probe.mjs` 加 `--drawBudget=1 --shellScan=1 --shellAB=1`；`gl-frame-probe.mjs` 加 `--drawBudget=1 --shellAB=1`。

## 公開送達

（發布後補）
