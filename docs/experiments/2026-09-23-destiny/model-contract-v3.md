# 六之四模型契約 v3：密封拍賣動作與觀察治具

日期：2026-09-24。狀態：**拍賣階段 partial；完整六之四仍 incomplete**。v2 保持凍結不改；v3 新增一般拍賣／押寶夜合法提交枚舉、拍賣觀察投影與拍賣階段回憶鍵。

## 凍結來源與範圍

機器契約：[model-contract-v3.json](model-contract-v3.json)。測試：[l1e-auction-action-adapter.test.mjs](../../../../tests/l1e-auction-action-adapter.test.mjs)，adapter：[l1e-auction-action-adapter.mjs](../../../../tests/tools/l1e-auction-action-adapter.mjs)。底層載入器從 `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a` 讀取凍結 `index.html`，核對 Git blob 與 SHA256，並確認工作樹產品檔吻合。測試用插樁只增加內部純函式出口與 RNG 游標；不修改產品檔。

本批 action 是每個存活席位在**拍賣輸入開始時的一次複合密封提交**。一般夜逐格列出零／正整數標額、保守／押命標、詛咒品保留或對每個存活對手毒標、有效標筆數、逐件費用及與燒香共用的預算。即使標額為零，仍保留 UI 可提交的標型及詛咒意圖／對象欄位；這些封標列不進開標，但不會被治具偷偷合併。押寶夜逐一列出法寶非空子集與同一注額，按最不利單件買路錢預留預算，保留至多得一件的原結算語意。`MAX_BIDS` 非整數時 adapter fail closed；原契約只接受目前遊戲的整數設定。

枚舉器使用 lazy generator，避免把數百萬個合法提交一次放入記憶體；它沒有粗格點，也不只列「追標／放棄」。迭代全空間仍可能很大，這是之後求解規模的限制，不是動作省略。

## 拍賣 observation

每席投影保留自己的袋中物件與密函；對手袋子只保留玩家當下可見的戰力／件數或紙紮摘要。它包含當夜市場、公開盯印與歷史、已公開的天命、香火池與傳說尊、當前／下一夜公開事件與規則，以及 UI 顯示給該席的少量明夜預告。它排除對手袋中物件、未揭密封標、隨機數狀態及未顯示的未來市場。歷史使用凍結引擎的 `replayExport` 公開投影，並移除回憶紀錄中不屬於此處玩家視野的心願與精確壽命歷程。

拍賣回憶鍵保存自己的過往拍賣 observation 與提交，只有拍賣階段範圍。它不代表整局完整回憶或伺服器隔離。

## 本批證據與限制

```powershell
node --test tests/l1e-auction-action-adapter.test.mjs
```

治具涵蓋一般標額／型態／毒標目標、買路錢、燒香預算、有效標上限、押寶夜可押子集，並把一般夜與押寶夜小型 fixture 中的每個枚舉提交送入凍結 `resolveAuction`，確認引擎可結算；押寶夜再確認每席至多得一件。隱私測試更動對手密函、袋物、心願、密封標及未顯示未來拍品，證明 viewer 0 的 observation 不變；公布密函後才改變。

這些治具尚未覆蓋真人 UI 的盯印選擇、異事密封選項、獻祭、請神得主選尊、戰鬥決策與結算；目前 observation 也沒有保存本夜異事選擇的公開結果。它不提供全遊戲 decision cursor／commit-and-advance API，也沒有把跨階段事件逐一寫進 full-recall history。它不做六之四求解、不驗證平衡、策略優勢或玩家理解。因此 `sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false` 均維持原值。
