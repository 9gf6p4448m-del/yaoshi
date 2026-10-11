# 驗收（凍結，2026-10-11）— 信物局部小動作（撥珠、冒煙）feat/props-micro

基準：origin/main db281fa9（v0.65.5）。純演出：不改規則、不耗 RNG、不動 index.html／引擎、不動版號（主 session 統一）、不碰 hands 相關檔與停靠泡／對白泡。
狀態：**凍結**（動手改程式前 commit）。依 02 §2.1，凍結後只能細化／加嚴；放寬須另寫「原標準錯在哪、為什麼現在才知道」並經主 session 轉達使用者同意。

設計（供條件引用，非條件本身）：撥珠＝當鋪算盤兩排珠各自成一個子 Mesh（上排 +x、下排 −x 滑動）；冒煙＝收驚婆／普渡爐主香頭上一縷薄煙子 Mesh。改動限 `js/table-props.js`、`js/relic-motion.js`。動作只在「該席信物沒有出價動作進行中」的空閒時，每 6 秒（依席位錯開）演 1.4 秒；`?fx=0` 一個子 Mesh 都不建。
量法統一走真實 `createTableProps`（`tests/hand-fixture.mjs` 的 `loadProps`，three 0.180）＋決定性步進；新測試檔 `tests/relic-micro.test.mjs`。基準版以 `git show db281fa9:js/table-props.js` 存暫存檔、經 `YAOSHI_PROPS_PATH` 載入（原檔不動）。
每條：**條件**／**量法**／**什麼實作會讓它變紅**。

## M1 `?fx=0` 完全等同基準
- 條件：`globalThis.location={search:'?fx=0'}` 時，群組內 Mesh 數、geometry 數、四席信物姿態（position／rotation／scale）在 30 秒、1/60 步進的每一步與基準逐值相等。
- 紅：fx=0 仍建子 Mesh；fx=0 仍改父信物姿態。

## M2 預設開時父信物姿態不被空閒動作碰
- 條件：預設（無參數），空閒期間（無出價）每步父 Mesh 姿態與基準逐值相等；動作只體現在子 Mesh。
- 紅：以搖晃父 Mesh 實作撥珠／冒煙。

## M3 draw call 預算
- 條件：最壞角色組 `['dangpu','shoujing','luzhu','zutou']`，30 秒每步「可見 Mesh 數 − 基準」**最大值 ≤ 4**，且**有出現 ≥1** 的步（活性，防空轉）；每個子 Mesh ≤ 24 三角形；`stats().relics[*].tris` 與基準相等。
- 紅：十顆珠各一個 Mesh；煙常駐可見；子 Mesh 數超標。

## M4 只在空閒觸發
- 條件：對某席呼叫 `bid()` 後，直到該席 `move` 走完為止，該席所有子 Mesh 不可見且珠位移為 0；動作結束後排程恢復。另驗：未呼叫 `update` 時（dt=0）不演。
- 紅：出價動作期間煙仍冒／珠仍滑。

## M5 動作確實有、且精確回位
- 條件：20 秒內撥珠兩排 |x 偏移| 最大 ≥ 0.006 且 ≤ 0.012（本地單位）；每次動作結束的步偏移**精確 0**；煙的不透明度峰值 ≥ 0.25 且動作外為 0（或不可見）。
- 紅：偏移過小看不見；結束殘留偏移；煙峰值太淡。

## M6 不增加遮擋（幾何包含證明；三個橫向尺寸以 LAYOUTS.L 與 LAYOUTS.P 兩套版面代表）
- 條件：（a）全週期子 Mesh 世界 AABB ⊆ 該席 `relicBoxes()` 的 x±hx、z±hz、y≤top；（b）兩套版面下 `relicBoxes()`／`relicObstacles()` 與基準 JSON 逐值相等（珠拆出父 Mesh 後包圍盒不得縮小）。
- 限制（誠實記載）：未做像素遮擋截圖（瀏覽器由主 session 管、不開）；本條只證明幾何包含，不證明像素。
- 紅：煙升過 top；拆珠使父包圍盒縮小。

## M7 決定性、不耗 RNG、與幀率無關
- 條件：（a）本次 diff 新增行不含 `Math.random`／`Date.now`／`performance.now`；（b）同 dt 序列跑兩次狀態日誌逐值相等；（c）1/60 與 1/30 步進在共同時刻（每 0.5 秒）子 Mesh 狀態差 ≤ 1e-9。
- 紅：用幀數計時；用隨機相位。

## M8 `?handslow=k` 跟隨
- 條件：`YS_ANIM_SLOW={hand:2}` 時，空閒週期（動作起點時刻）為 k=1 的 2 倍。
- 紅：忽略 handslow。

## M9 釋放不漏
- 條件：`setSeats` 換角色與 `dispose()` 後，所有曾建立的子 geometry／material 皆已觸發 `dispose` 事件，且群組內無殘留子 Mesh。
- 紅：只釋放父 Mesh。

## M10 常規局 trace 相等與改動範圍
- 條件：（a）`node tests/tools/trace-eq.mjs <基準 index.html> <本樹 index.html>` exit 0，且同工具 `--mutate` exit 1（鑑別力）；（b）`git diff --stat db281fa9..` 的程式檔只含 `js/table-props.js`、`js/relic-motion.js`（及新測試、本凍結檔、必要的 fixture 無須改動）。
- 紅：碰 index.html／引擎／hands 檔。

## M11 既有測試不退步
- 條件：改前在本樹跑 `node --test tests/*.test.mjs` 的失敗集合為 B；改後失敗集合 ⊆ B（已知既有紅：nightwalk #1）。新增 `relic-micro.test.mjs` 全綠。
- 紅：改後出現 B 以外的紅。

## M12 鑑別力證據（02 §6.1）
- 條件：M1–M9 對基準 db281fa9 跑 `relic-micro.test.mjs`，須紅在**行為斷言**（非 import／缺屬性例外）；另至少對下列突變體各紅一次：煙常駐可見（M3）、父 Mesh 搖晃（M2）、出價期間不隱藏（M4）、fx=0 仍建子 Mesh（M1）。突變用暫存副本（`YAOSHI_PROPS_PATH`），原檔不動。

## 範圍外（不做）
效能 fps 不量（無頭 Chromium 不代表 Safari）；相對成本以 M3 的 draw call／三角形計數代替。不 push、不 merge。

## 修訂 1（2026-10-11，追加；原文不覆寫）— M3 子 Mesh 三角形條款改為方案 A
- **被修訂的條款**：M3 中「每個子 Mesh ≤ 24 三角形」。
- **原標準錯在哪**：凍結前沒數算盤珠。基準版 5 顆珠 = 5 個 `box()`（12 tris／個）= 60 tris／排；珠子外觀不變的前提下，任何裝珠的子 Mesh 都超過 24，與「撥珠」設計互斥。
- **為什麼現在才知道**：動手讀 `js/table-props.js` 的 `box()`（:117）才數出；凍結時只憑印象寫 24。
- **同意**：使用者 2026-10-11 在主 session（妖市 [67e35b]）針對這一條明確同意改採 A（由主 session 轉達）。
- **新條款（取代原「≤24」）**：算盤分件（去珠本體 body＋前後兩排珠）三角形總和 == 同席父 Mesh 三角形（珠子只是被搬出父 Mesh，不新增幾何、外觀不變）；`stats().relics[*].tris` 逐席與基準相等；煙 ≤ 4 tris；draw call 上限 ≤ +4 不變。
- **實作細節補記（非放寬）**：算盤動作窗內父 Mesh 隱藏、分件上場（總 draw call 淨 +2）；窗外分件全部不可見，故 M4／M5 的「窗外子 Mesh 不可見」仍成立。測試遍歷改以名稱 `relic-micro-<席>-…` 找子 Mesh（斷言內容不變）。
- **鑑別力**：修訂後的 M3 對基準版（無分件）紅、對「刻意改壞珠子幾何的突變版」須紅，實跑貼輸出。
- 其餘條件一律不動。

## 修訂 2（2026-10-11，追加；加嚴，無須使用者同意，記錄備查）— 新增 M3b
- 起因：M12 突變「煙常駐可見」未被 M3 抓到（算盤分件窗外隱藏，煙常駐只讓峰值 +3，仍 ≤ +4），只靠 M4b／M8 間接抓到；M3 對煙的鑑別力弱（主 session 指出）。
- 新增 M3b：30 秒內煙在窗外必須不可見且不透明度 0；可見步數占比 ≤ 動作窗占比（1.4/6）＋2%；煙從未出現也算紅（防空轉）。
- 性質：只加嚴（讓壞實作更難過），不降低任何既有條件。鑑別力以突變「煙常駐可見」實跑，須紅在 M3b。
