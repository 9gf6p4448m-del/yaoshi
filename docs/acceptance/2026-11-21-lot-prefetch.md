# 驗收條件：拍品模型提前下載（2026-11-21，動手前凍結）

**要解決的事**：製作人 iPhone（iOS 18.7／Safari 26.6.3）上，進出價頁後牌桌四件法寶要等十幾到幾十秒才出現，「請神入座」12 秒逾時先收掉，看到的是空桌。
- 診斷頁 `docs/diag/lots.html` 兩次實測：第 1 次按診斷時（開頁 23 秒）三件還在載（ready=false、visible=false），遮罩 30.1 秒逾時收掉；第 2 次四件都到齊且畫得出來（像素差 63–407），遮罩 7.6→18.6 秒。模型檔下載與重建都正常（200、glTF、重建 7–20ms）。
- 慢在網路：單件經 GitHub gzip 約 100–180KB，iPhone 抓要 2.3–10 秒（約 13–70KB/s）；桌機 0.3–0.7 秒。
- 現行程式要到出價頁 `pushMarket3d()`（`index.html:3844`）才開始下載當夜拍品；但第 1 夜拍品在開局（`index.html:4342`）就抽好，「明夜」拍品 `S.nextMarket` 也在當夜就抽好（`index.html:4342／8955／9740／10045`）。

**作法**：拍品一抽出來（開局的今夜＋明夜、每夜換夜時的明夜）就在背景下載模型檔進既有的 `glbCache`（`js/creature-figures.js:124`），出價頁直接用快取。純下載時機，不改規則、數值、畫面、亂數。網址 `?prefetch=0` 關閉＝回到現行行為（對照用）。

## 量測工具
- `tmp/prefetch-loop/run.mjs`（不進 git）：`assets/creatures/*.glb` 走一條共用頻寬的假線路（FIFO，`RATE` 位元組／秒），其他資源照常；照真人流程：首頁→單人入市→選青面攤主→按「入市」→停 `TUT_DWELL` 秒（看教學）→翻到第 1 夜拍品上桌→停 `N1_DWELL` 秒（看拍品、出價）→點到第 2 夜拍品上桌→等到第 2 夜拍品全到（最多 90 秒）。
- 標準設定：`RATE=153600`（原始 150KB/s ≈ gzip 後 32KB/s，落在 iPhone 實測 13–70KB/s 內）、`TUT_DWELL=6`、`N1_DWELL=45`（真人一夜含出價、盯上、開標、夜戰，遠超過 45 秒；45 秒讓兩夜各 4 件最大檔 ≈8.8MB 在 150KB/s 下也來得及，避免抽到大檔就誤判）。
- 指標：`n1Lead`＝第 1 夜第一件拍品模型開始下載 − 按下「入市」；`n1Wait`／`n2Wait`＝該夜 `ys:market` 推上桌 → 非詛咒品全部 ready 且 visible；`order`＝第 1 夜拍品全部比第 2 夜（不重複的）拍品先開始下載；`dup`＝同一模型檔被抓超過一次的清單。

## 條件（全部要過；基準＝main 9086b7da 實測）
1. **第 2 夜不用等**：標準設定連跑 5 次，每次 `n2Wait` ≤ 1000ms。
   基準（標準設定）：2 次，8049ms、15500ms（紅）。另 N1_DWELL=30 的試跑 1 次 19586ms。
2. **第 1 夜提早開始**：同 5 次，每次 `n1Lead` ≤ 1000ms。
   基準：2 次，6841ms、6889ms（紅；＝看教學的時間，到出價頁才開始抓）。
3. **預載不拖慢當夜**：同 5 次，每次 `order` 為 true（`order` 為 null＝兩夜拍品完全重複，不算失敗也不算通過，要另補一次）。
   基準：有效 1 次 true（現行是到第 2 夜才抓，必然 true；這條是守住預載的排序）。
4. **不重複下載**：同 5 次，每次 `dup` 為空。基準：2 次皆空。
5. **對照開關有效**：`Q=prefetch=0` 跑 1 次，`n1Lead` ≥ 5000ms 且 `n2Wait` ≥ 5000ms（等於現行行為）。
6. **引擎逐位元組相同**：`node tests/tools/trace-eq.mjs <main 的 index.html> <分支的 index.html>` 回報相等；`--mutate` 回報 `differs:true` 且 verdict ✅（只驗工具抓得到差異）。
7. **沒有回歸**：全套 `node --test tests/*.test.mjs` 的失敗集合 ⊆ main 在桌機的已知失敗 {nightwalk #1、relic-micro（若紅，單獨跑 5/5 綠才算）、wishchip H／J／K（手部 shader 同步編譯，另由分支 perf/hand-shader-warm 修）}。
8. **回歸測試落在真實觸發鏈**：新增 `tests/lot-prefetch.test.mjs`，在真頁面、慢線路下走真人流程到第 2 夜，斷言第 2 夜拍品推上桌後 1000ms 內全部 ready 且 visible；這支測試在 main 的程式上要紅、在本分支要綠（各跑 1 次）。
9. **範圍**：`git diff --stat main..分支` 只動 `index.html`（只限發出預載事件的幾處與事件日誌）、`js/renderer.js`、`js/creature-figures.js`、`tests/lot-prefetch.test.mjs`、本檔。版號不在本分支遞增（照 perf/hand-shader-warm 先例，合併上線時一次改齊）。
10. 所有量測 pageerror = 0；`?tray3d=0`、`?table3d=0` 開頁進第 1 夜出價頁 pageerror = 0。

## 凍結前的工具更正（未凍結時發現，原文不刪）
- `order` 第一版用 `<拍品鍵>.glb` 找下載紀錄，白虎的檔名是 `tiger_c.glb`（`js/creature-figures.js:97` 的 `CREATURE_GLB`），基準第 1 次因此誤判成 false。改成直接用托盤回報的 `glb` 檔名比對，重量一次（基準第 2 次）為 true。

## 執行中的修訂（製作人 2026-11-21 同意，原文不刪）
- **條件 7 已知失敗集合加入 movecam**，比照 relic-micro：「全套若紅，單獨跑 5/5 綠才算」。
  - 原標準錯在：已知集合是從本機前兩三次全套整理的，漏了 movecam 的 r4-L2 版面 gate（兩次分開開頁的 `#duelResult`／`#duelSub` 位置要逐值相等）。這個 gate 本來就會差 0.5px，DECISIONS 2026-10-11 已記「movecam 版面gate 0.5px波動｜記為既有忽紅忽綠」，當時 origin/main 首跑就紅。
  - 為什麼現在才知道：本分支第一次全套（650 項：646 過、3 紅、1 跳過）它紅在 0.5px（`res.top` 293.09 對 293.59）；凍結時沒查到 DECISIONS 那一列。
  - 歸因證據：單獨跑分支 5/5 綠、main 5/5 綠；和 7 支 file:// 瀏覽器測試 8 路並行，分支 5/5 綠、main 5/5 綠。兩邊紅的次數相同，本分支沒有讓它更常紅；來源屬環境時序／量測，訊號本身不可信，不拿它當證據。
  - 同意紀錄：對話中問「movecam 要不要比照 relic-micro」，選項 A＝負載對照兩邊紅的次數相當就加入；製作人回「照建議」。

## Codex yaoshi-v0.66.1-r1 之後的修正與重驗（2026-11-22，原文不刪）
- 修正（commit d3852d35）：F1 預載世代號、F3 卡住 20 秒沒資料就放手並以 `?retry=N` 重抓、F4 回歸測試起點改在 `ys:market` 派出當下記；範圍因此多動 `tests/lot-prefetch.test.mjs`（計時更嚴，不放寬任何門檻）。
- 量測工具 `tmp/prefetch-loop/run.mjs` 同步改成同樣的嚴格計時後重量（條件 1–5，新版）：`n1Lead` 215–256ms、`n2Wait` 198–229ms（先前量到的 0ms 是輪詢補記造成，Codex F4 指出）、`order` 5/5 true、`dup` 5/5 空、pageerror 0；`?prefetch=0` 6851／9782ms。
- 邊界探針 `tmp/prefetch-loop/f1f3.mjs`：F1 新版舊局明夜 0 請求（f2ff1ad7 有 2 件）；F3 新版明夜 20.1 秒開始、卡住那件以 `?retry=1` 重抓並載到（f2ff1ad7 明夜 40 秒內不開始、只 1 次請求）。
- **已知限制（不在 F3 範圍，修正前就是這樣）**：模型請求完全卡住時，當夜托盤那一格仍空著——托盤接的是卡住的那份下載，出價頁不一定再推一次拍品。下一夜或之後的正式載入會重抓。

## Codex yaoshi-v0.66.1-r2 之後的修正（2026-11-22，原文不刪）
- r2 F1（HIGH，＝上一節的「已知限制」）：Codex 判為明確 bug——重抓成功、模型已在快取，接著卡住請求的那一格仍空著。改法（commit 563ba1af）：`loadGlb` 自己 fetch＋逐塊讀＋`GLTFLoader.parseAsync`，連續 20 秒沒資料就中止舊請求、以 `?retry=N` 重抓（最多 3 次），托盤／夜戰／預載共用同一個 promise。**上一節的已知限制因此撤銷。**
- 探針 `tmp/prefetch-loop/f1f3.mjs`：F3 新版——明夜 20.1 秒開始、舊請求 `net::ERR_ABORTED`、`?retry=1` 重抓、卡住那一格進出價頁 4.1 秒後出現；f2ff1ad7 60 秒內不出現。f404（新舊版同）：404 只請求 1 次不重試、那一格空著、其餘照常。F1 新版仍過。
- r2 F2（MEDIUM）重抓前中止舊請求；r2 F4（MEDIUM）測試改 `performance.now()`、有效區間 0–1000ms；r2 F3（MEDIUM）版本說明加註桌機實測——無擴充功能裝置首次出手耗時未量，連同 r1 F5 的 superficially_fixed 一起留階段末交製作人簽。
