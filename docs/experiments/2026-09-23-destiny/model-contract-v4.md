# 六之四模型契約 v4：妖市異事密封決策

日期：2026-09-24。狀態：**拍賣與異事動作有局部治具；六之四仍 incomplete**。v2／v3 保持不改；v4 補入八種異事的合法選擇、密封提交、開盅結果與異事後的公開 observation。

## 凍結來源

機器契約：[model-contract-v4.json](model-contract-v4.json)。測試：[l1e-event-action-adapter.test.mjs](../../../../tests/l1e-event-action-adapter.test.mjs)，adapter：[l1e-event-action-adapter.mjs](../../../../tests/tools/l1e-event-action-adapter.mjs)。載入器核對 `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`、`index.html` 的 Git blob／SHA256 與工作樹檔案；只在測試插樁中加出 event context、settle、公開狀態文字等函式，不修改產品程式。

## 決策動作與揭露

異事決策使用原引擎 `EVENTS` 定義：`pick` 按原 `opts[].v` 列值；`num` 列出 `0..cap(p)` 每個整數；送肉粽額外保留 `null`「不投標」，不與零元要價合併。每個存活席位只能密封提交一次；提交儲存在 adapter 私有 WeakMap 中，decision handle 不含 choices。全席都提交後呼叫凍結引擎的 `settleEvent`，回傳它揭露的選擇、逐席壽命差和事件 log。之後的拍賣 observation 可以附帶已公開的本夜事件結果。

異事畫面的 observation 保留當前事件描述、該席合法選項、受害目標與當下玩家可見席位摘要；不含市場牌、未來市場、對手袋中內容、密封選擇或 RNG。異事回憶鍵拒絕混入其他席位的歷史。傳入下一拍賣的公開事件結果會按白名單重建，只保留同夜事件 ID、選擇、壽命差和公開 log；多餘欄位會被丟棄，錯夜資料會被拒絕。這仍只記異事階段 own-observation／choice，不代表異事與拍賣跨階段的完整回憶鍵。

## 證據與限制

```powershell
node --test tests/l1e-event-action-adapter.test.mjs
```

測試逐一核對目前八種異事的每席合法選項；對每種異事各選一個全席 profile 送進凍結引擎，確認結算並取得公開揭露；並比較隱藏提交不同的兩個 decision context，確認玩家看到相同異事 observation。送肉粽 `null` 與 `0` 的差異、密封後不能改選、缺席位提交時 fail closed、回憶不可跨席，以及拍賣 observation 不接受揭露額外欄位或錯夜資料均有定向測試。異事測試 **4/4**；與 v2、拍賣、天命、資訊投影及契約盤點合跑 **71/71**。`node --check` 與 `git diff --check` 通過。

仍未覆蓋盯印、獻祭、請神得主挑尊及完整相位 transition；每種異事只測一組 profile，未窮舉其聯合選擇、擲骰、平手與牌堆機率。既有拍賣 observation、異事 observation、公開事件歷史尚未合成完整 full-recall tree。天命平衡與玩家體驗不由這些 engine fixtures 證明，`sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false` 維持。
