# 驗收條件：載入器測試加嚴（Codex yaoshi-v0.66.3-r3 F2、F3）（2026-11-23，動手前凍結）

**要解決的事**：v0.66.3-r3 的兩條測試盲點（MEDIUM，製作人 2026-11-22 簽收、列下一版候選，DECISIONS「2026-11-22｜v0.66.3 r3 MEDIUM 簽收並上線」）。
- F2：`tests/glb-loader.test.mjs` 的 W 只在派發事件當下數共用承諾上的 `then`，延到微任務、計時器才掛的回呼，和用 `await` 掛的，都數不到。
- F3：W 沒啟動明夜批次，漏測「換世代時取消明夜批次的等待者」。
- r3 F1（同頁重開同一夜補播舊局出價）玩家碰不到、要動產品的補播日誌，本批不做；F4 維持既有設計。

**作法**：只改 `tests/glb-loader.test.mjs`，產品程式一行不動；不單獨出版、不推 main，併進下一個版號送審。GPT：略過（純技術：測試量法）。
- W：在 bell 的共用下載承諾上放自有的 `constructor` 存取器計數（`then`／`catch`／`finally`／`Promise.all`／`race`／`await` 都要讀它；Node 與 Chromium 探針 `tmp/v0664/ctor-probe.mjs` 實測 then 1、微任務後 then 1、計時器後 then 1、await 1、all 2、race 2、不碰它 0）。第 2 次派發前開始，到 45 秒放行後為止，次數須為 0；之後做正對照。
- W2（新）：今夜 chair 正常下載完 → 明夜 bell（每 10 秒 2KB、下載不完）啟動 → 換世代，共 5 個世代，量 bell 上的等待者數 1→0→1→1→0。
- 既有斷言一字不動，只加。

## 凍結前基準（2026-11-23 00:09–00:15，桌機獨佔閘門，c2f8abfc 的測試；`tmp/v0664/base-summary.txt`，不進 git）
只跑 W（`YAOSHI_GLBLOADER_ONLY=W`）；突變樹在 session scratchpad（`git archive c2f8abfc`，各改一行，`tmp/v0664/mkmut.py`）：

| 受測 | 突變 | 現行 W |
|---|---|---|
| clean | 無 | 綠 |
| sync | `prefetchGlb` 每次訂閱同步 `p.then(…)` | 紅（掛了 3 次 then） |
| micro | `queueMicrotask(() => p.then(…))` | 綠（盲點） |
| timer | `setTimeout(() => p.then(…), 300)` | 綠（盲點） |
| await | `(async () => { try { await p; } catch (e) {} })()` | 綠（盲點） |
| nonext | `js/renderer.js` 換世代不中止上一批明夜 | 綠（盲點） |
| nosig | `js/renderer.js` 明夜批次不帶中止訊號 | 綠（盲點） |

## 條件（全部要過；突變樹同上）
1. 未改的產品上，`W,W2` 連跑 3 次全綠。
2. micro、timer、await：W 紅在「bell 的共用下載承諾被掛了 N 次回呼」；sync：W 仍紅在原本的「掛了 N 次 then」。
3. nonext、nosig：W2 紅在「換世代後，舊明夜批次還在 bell 的共用下載上掛著 1 個等待者」。
4. W 的正對照（微任務後的 then、await 各數到 1 次）在條件 1 的 3 次都成立（寫成斷言）。
5. 整檔 `node --test tests/glb-loader.test.mjs` 跑 1 次全綠（原 19 項＋W2）。
6. `git diff c2f8abfc -- tests/glb-loader.test.mjs` 沒有刪除行（既有斷言不動）；`git diff --stat c2f8abfc` 只有該測試、本檔、`DECISIONS.md`、`docs/reviews/`。
7. 每個情境 pageerror＝0（既有寫法，斷言在測試內）。
8. 送一個沒有對話史的 agent 對抗式檢查（找還會漏的壞寫法、會誤紅的情況）；CRITICAL／HIGH 修完。
9. 全套測試與 Codex 審查：併進下一個版號時一起做，本批不另跑。

**分層（14 §5）**：只動測試，功能正確層＝本檔條件；其餘四層不受影響、未另驗。
