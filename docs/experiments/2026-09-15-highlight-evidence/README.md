# 三種高光自然命中證據

日期：2026-09-15。桌面 Chromium、1280 × 590、DPR 1；這是自動重播證據，不是 P4 真機驗收。

## 可重現命令

```powershell
node tests/tools/highlight-capture.mjs --scan
node tests/tools/highlight-capture.mjs --seed=114 --port=8974
node tests/tools/highlight-capture.mjs --seed=5276 --port=8975
```

策略固定為既有 `scriptedBids`（最高 p 拍品、保守標至多 5）、盯該出價槽、不燒香、異事選擇走既有 AI 啟發式；經 `newGame`、`pickMark`、`submitHumanBids` 與按鈕點擊完整走開標、夜戰、局末。使用遊戲本身的跳過按鈕縮短演出。沒有直接呼叫 `playCut`、更改轉場門檻、捏造 history 或注入死亡結果。合法策略輸入透過頁面既有變數填入，並非全程滑鼠手動操作。

模擬篩選只在暫存 fixture 對齊「異事 AI 三家先封籤、真人最後」的 UI 輸入次序，避免原 headless 座位 0 先執行所造成 RNG 差異。產品規則沒有改寫；暫存檔有 PID 並於 finally 清理。掃至 seed 5276 找到三種；`seed-scan.json` 保存候選。

## 有效證據

| 轉場 | 種子／夜 | 真實觸發依據 | 命中與移除 |
|---|---|---|---|
| 誅心・得手 | 114／5 | 真人盯中、得標且符合既有低價／獨標條件 | [命中](seed-114-bluff-hit.png) · [移除](seed-114-bluff-removed.png) |
| 因果・斃命 | 114／7 | 北家押命 5 得「魔神仔的芭樂」，毒標東家；東家同夜死亡 | [命中](seed-114-borrowed-blade-hit.png) · [移除](seed-114-borrowed-blade-removed.png) |
| 命懸一線・破曉 | 5276／9 | 北家第 8 夜壽命 4，局末壽命 13、存活第 1；東家壽命 12 第 2 | [命中](seed-5276-death-edge-hit.png) · [移除](seed-5276-death-edge-removed.png) |

兩場均完整結束，console/page errors 0。JSON 保存所有步驟、真實 history、最終生命，以及截圖前 stamp 的 class/title/opacity/visibility/rect 與 stamp/overlay 的 computed 背景、字級、顏色、filter；截圖後也要求同類 overlay 仍存在。命中後等待自然移除才截第二張。`node --check tests/tools/highlight-capture.mjs` 通過。

**命中畫面以呈現層凍幀取樣**：只在自然建立的 stamp 上暫停 WAAPI，從原動畫 0～1250ms 每 10ms 取樣，找到第一個全不透明原始格（這版為 110ms），沒有改 keyframes/opacity/觸發條件/遊戲狀態。原始 1280ms remove timer 保持不動；凍幀持續時間不可當成原動畫時長或節奏驗收。之前固定等待 350ms／450ms 的候選其實因全段 easing 已進入淡出，不能用那些照片作穩定命中品質判斷。

最終兩場實際 HTTP response SHA256 同為 `b2825d0f8eb8070dba87ab115293635a838d6ecc7dcf5d38995466c3bb8616cc`。三張命中 stamp opacity 均 1、字級 28px、背景 `rgb(25,10,16)`。逐張讀圖：三張印章標題／副標可讀，穩定格沒有底字穿透，且均自然移除。DOM mounted→removed 分別 1288.5ms／1283.2ms／1283.4ms；主責保留最終視覺品質裁定。這份證據不宣告完整原動畫節奏通過。

## 保留的非驗收跑次

- seed 1：先取得誅心的初始跑次；最後驗收以含截圖可見性欄位的 seed 114 為準。
- seed 5、1134：原 headless 次序篩出的候選，真人重播沒有命中借刀／低血冠軍；保留失敗軌跡。
- seed 2547：四家全滅卻出現「命懸一線」和「你活到了天亮」；它是自然出現的邊界缺陷證據，**不算低血量存活冠軍通過**。主責後續已在 death-edge 條件加入 winner.alive；產品修正與測試由主對話紀錄。
