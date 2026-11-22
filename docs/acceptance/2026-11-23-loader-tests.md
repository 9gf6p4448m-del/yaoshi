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

## 修訂一（2026-11-23，加嚴；原文不刪）
- 起因：沒有對話史的 agent 冷讀 6cb20bcd（C0／H0／M2／L3）。F-A（MEDIUM）：只在明夜路徑掛延後的回呼，W（明夜固定空）和 W2（只看等待者數）都看不到。F-D（LOW）：拿掉「作廢批次不開明夜」的守衛也抓不到。
- 加：W2 第 2–5 世代也數共用承諾的 constructor 讀取（須 0＋正對照 1、1）；第 4 世代的明夜改成整段沒人要過的 flag，第 5 世代後 flag.glb 不得被請求。計數抽成 `watchShared`／`readShared`，W 的行為不變。
- 條件 3 追加突變：**nextthen**（`prefetchGlb` 只在明夜呼叫時 `queueMicrotask(() => p.then(…))`）W2 須紅在「第 2–5 世代對 bell 的共用下載承諾掛了 N 次回呼」；**noguard**（`renderer.js` 拿掉 `batch === prefetchBatch`）W2 須紅在「換世代後，舊批次還替自己的明夜開了新下載」。
- 修訂前 6cb20bcd 的 `W,W2`：未改的產品 3／3 綠、sync 紅在「掛了 3 次 then」（其餘突變沒跑完就停掉、改跑修訂版）。nextthen、noguard 在 6cb20bcd 上的結果**沒有量**，依冷讀推導。
- 不修：F-B（第 4 世代只看數量，抵銷情形由第 5 世代的 0 擋，已寫註解）、F-C（訂閱以外的洩漏，例如計時器沒清，不在這兩條 finding 內）。

## 執行結果（2026-11-23 00:20–00:45，受測 5c29779e、工作樹乾淨、桌機獨佔閘門；`tmp/v0664/new-summary.txt`＋`new-*.log`，不進 git）
1、4. 未改的產品 `W,W2` 連 3 次：每次 pass 3／fail 0（W、W2、父項），正對照 [1,1] 都成立。
2. micro、timer、await：W 紅在「第 2 次預載派發前到放行後，bell 的共用下載承諾被掛了 3 次回呼」；sync：W 紅在原本的「第 2–4 次預載派發當下…掛了 3 次 then」。四個突變 W2 也紅在「第 2–5 世代…掛了 N 次回呼」（sync、micro、await 2 次，timer 3 次）。
3. nonext、nosig：W2 紅在「換世代後，舊明夜批次還在 bell 的共用下載上掛著 1 個等待者」，W 綠。nextthen：W2 紅在「第 2–5 世代…掛了 1 次回呼」，W 綠。noguard：W2 紅在「flag.glb 被請求 1 次」，W 綠。修訂前的 6cb20bcd 測試跑 nextthen、noguard 都綠（`new-6cb-*.log`）＝這兩個盲點是修訂一補上的。
5. 整檔 1 次：tests 19／pass 19／fail 0（686 秒）。**更正**：條件 5 寫「原 19 項」是數錯——C 撤掉後原本是 18 項（17 情境＋父項，`base-clean.log` 的 tests 18），加 W2 是 19，判準沒變。
6. 測試檔相對 c2f8abfc 新增 84 行、刪除 0 行；`git diff --stat c2f8abfc` 只有測試、本檔、`DECISIONS.md`。
7. pageerror 的斷言在上述綠的情境內都成立。
8. 對抗式檢查兩輪（沒有對話史）：第一輪對 6cb20bcd C0／H0／M2／L3（處置見修訂一）；第二輪三態覆審對 5c29779e：F-A、F-D 都判「真的修好」，沒有新的 C／H。殘留 LOW（記錄不修）：明夜路徑只做過微任務突變、沒做計時器突變（計數不看時機）；W2 的計數從第 1 世代之後才開始。
9. 全套測試與 Codex：照條件 9 併進下一個版號，本批沒跑。
