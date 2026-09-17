# A1 描邊外殼合併：凍結驗收（2026-09-17，第五個單一修補）

建立時基準：`e5ed38e`（v0.57.16）。修補範圍：`js/creature-figures.js` 反轉外殼描邊（P-1）由「每顆本體 mesh 底下掛一顆外殼」改為「一尊一顆外殼 SkinnedMesh」——把該尊所有非 ghost 部件的 geometry（含 ghost 材質群組剔除）併成一份、綁同一副骨架與 bindMatrix、掛在部件的共同父節點上。合併後的 geometry 以 GLB URL 為鍵快取（與 `glbCache` 同生命週期、多個實例共用、不逐尊釋放）。任何一尊不滿足前提（部件多於一副骨架、bindMatrix 不一、本地矩陣非單位、屬性集不同、非索引幾何）就退回原本逐部件外殼。不改描邊 shader、線寬、顏色、燒毀切口、規則、亂數、演出時長或任何門檻。

證據來源（真實頁面 `tests/tools/gl-duel-probe.mjs --drawBudget=1 --shellScan=1`，`scratchpad/duel-shell-scan.json`／`duel-draw-budget.json`；牌桌 `gl-frame-probe.mjs --drawBudget=1`，`table-draw-budget.json`）：對決 8v8 場景那一趟 477 次 draw 裡 **197 次是外殼**（`name==='outline'` 的 SkinnedMesh），本體 207；16 尊逐尊掃描：每尊 1 副骨架、1 個 bindMatrix、本地矩陣全單位、屬性集一律 `color+normal+position+skinIndex+skinWeight+idx`、全單材質、部件父節點一律 `creature`；buoy 10 部件只掛 8 殼（2 個 ghost 部件本來就不描）。牌桌 hover slot1 時 89 次 draw 裡 13 次是外殼（只有 hover 那尊的殼可見，13 部件）。外殼是不透明 BackSide、depthTest＋depthWrite，殼與殼之間順序無關；合成一顆後每個像素的最終值理論上相同。

一經訂定不得為了通過縮案例、降門檻或改口徑；要改依 `02 §2.1`。

| # | 條件 | 什麼實作會讓它變紅 |
|---|---|---|
| 1 | 單元測試（Node）：匯出 `mergeOutlineGeometry(parts, isGhostMaterial)`，對合成的 SkinnedMesh 部件（共用骨架）斷言：① 兩部件併成一份 geometry，position／normal／color／skinIndex／skinWeight 的 count＝兩者相加、index count＝兩者相加且第二段有位移；② 含 ghost 材質群組的部件，該群組的三角形被剔除、其餘保留；③ 屬性集不同或非索引幾何 → 回 `null`（退回逐部件）。另外真實頁面掃描（#3）才是本修補的行為紅綠：修補前每尊外殼數＝部件數（197／16 尊），修補後每尊 1。 | 少併一個部件、ghost 群組沒剔、skinIndex 位移錯 |
| 2 | `node --test tests/*.test.mjs` 全綠，0 skip，數量＝93＋本卷新增。 | 任一契約壞 |
| 3 | 真實頁面對決探針（同前卷 fixture）：`shellScan` 16 尊 `shells` 皆 1、`shellDraws` 皆 1；`drawBudget.byName` 的 `outline[skin]` 由 197 降到 16；`perRaf.draws` 由 477 降到 296（剛好少 181）；`perRaf.getParameters` 維持 0；`texSubImage2D` 每 render 2.8／0.4／0.2 不變；errors=[]。 | 沒命中；多砍或少砍別的 draw |
| 4 | 同幀像素 A/B（真實頁面、同一個 evaluate 內不推進時間）：A＝出貨（合併殼）；B＝把合併殼設 invisible、在每顆本體 mesh 底下照原本做法臨時掛一顆同 geometry／同骨架／同 bindMatrix／同材質的殼（＝退路路徑）；逐位元組比對，相異像素 ≤ 0.1% 且任一通道 |Δ| ≤ 2；同旗標重渲染 0；對照＝兩種殼都關掉，相異 ≥ 1%（證明比對看得見描邊）。對決 3 個取樣點、牌桌 hover slot0–3 各一次。 | 併錯部件、切口或線寬變了＝描邊處相異 |
| 5 | 牌桌：`gl-frame-probe.mjs` hover slot1 的 draw 由 89 降到 77（13 殼→1）、getParameters 0；`--disposeRounds=5` 的 `renderer.info.memory.geometries`／`textures` 第 1 輪之後逐輪不再增加（合併 geometry 依 URL 快取，不逐尊生、不逐尊漏）；取景矩陣 `--match=slot1` 一塊（399 案）全過；trace-eq seeds 1–20 對 main 的 index.html 相等。 | 每尊各生一份 geometry 不釋放；取景包絡因殼結構改變而變 |
| 6 | 正式五輪 perf32／perf128 原工具原口徑重測並記錄；門檻 0.40 不變，未達照記 RED。對決側 `gl-duel-probe.mjs` renders/s 修補前／後各 3 輪交錯只記錄。 | 改工具、改口徑、挑輪次 |
| 7 | 分母交代：`grep -rn "outlines()\|'outline'" js/ tests/` 每一處列出「合併後語意是否改變」——`table-tray.js:470` 顯示切換、`:645` 的 `outlines` 計數（由部件數變成 1，只用於治具回報）、`outline-probe.mjs`、`faction-sheet.mjs`、`scene-shot.mjs:296` 的紀錄欄位——不得只改建構不交代讀者。 | 漏列 |
| 8 | 發布：1–5、7 全綠、6 已記錄後以 0.57.17 發布並核對公開 HTML／`js/creature-figures.js` 一致；RED 狀態明示。 | 未核對送達就稱已更新 |

## 執行紀錄（2026-09-17）

- 修補前基線：`gl-duel-probe-pre.json`（shellScan 16 尊 shells＝parts 數、outline 197、draw 477）、`gl-probe-table-pre.json`（outline 13、draw 89）。
- #1 `tests/outline-merge.test.mjs` 3/3（合成部件）；#2 96/96、0 skip；#3 16 尊 shells／shellDraws 皆 1、outline 197→16、每 rAF draw 477→296、getParameters 0、texSubImage2D 2.8／0.4／0.2 不變、errors=[]；#4 對決 3 取樣 legacy 相異 0（maxΔ 0，重掛 282 顆退路殼）、對照 3.27–3.83%；牌桌 4 槽 legacy 相異 0、對照 0.24–0.50%；#5 牌桌 draw 89→77、disposeRounds 6 輪 geometries 80／textures 10 不變、trace-eq equal。
- **#4 對照組門檻修正（§2.1 例外，事後回報，使用者 2026-09-17 回「按照建議」）**：凍結時寫「兩種殼都關掉的對照 ≥1%」，牌桌實測 0.24–0.50%——hover 那尊的描邊在 1688×780 畫面上本來就只佔約 0.3%，**任何實作都到不了 1%**，屬「無論對錯都不可能通過」。牌桌的對照改記 ≥0.1%（仍是主判準容差的 10 倍、實測 3 200–6 500 個相異像素，比對確實看得見描邊）。主判準「合併殼 vs 逐部件殼相異 ≤0.1%、|Δ|≤2」一字未動、實測 0；這個修正不會讓一份壞掉的實作（壞＝legacy 相異 >0.1%）變成通過。對決那邊的對照 3.3–3.8% 照原條文。
- 取景矩陣第一次跑成 known 模式（0 案）：工具的 `--match` 要配 `--all` 才展開到 399 案；重跑結果見下一行。
- #6 perf32 .585（paired 5/5、calls 77）GREEN、perf128 .6069（5/5、gate128 pass）GREEN；對決交錯 3 輪修補後 663／614／565 vs 修補前 521／496／519。矩陣 `--all --match=slot1` 399/399、failures=[]、pageErrors=[]（framing-slot1.json）。
- 版本守衛 `tests/ui-hierarchy.test.mjs` 依既有升版程序同步為 0.57.17；`CLAUDE.md` 加入口一行。
