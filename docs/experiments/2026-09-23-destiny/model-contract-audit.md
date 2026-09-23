# 六之四模型契約盤點器結果

日期：2026-09-24。狀態：**盤點器可執行；完整模型與發布閘仍 `incomplete`**。這是計畫 X 的第一個工具交付，不是 solver、adapter、可行性證明或 `sixOfFour=pass`。

## 可重現命令與來源

```powershell
node tests/tools/l1e-model-contract-audit.mjs
node --experimental-test-coverage --test tests/l1e-model-contract-audit.test.mjs
```

盤點器以 `model-contract.json` 的 `sourceCommit` 讀取凍結版 `index.html`，記錄 Git blob 與 SHA256，再將舊三鏈範圍和現行 [天命臂設定](arms.json) 對照。來源為 `cb64f4ef1cc7c128d28d3f928e832624e4889596`，`index.html` blob `f18a2ffc9770115db8cd60fefbb45726176b9874`，SHA256 `13b0bf220588f8bbca6f2c7352f0e9125894cb8c271225f79f347019880af5b9`。契約 SHA256 `944ebc92c3ba93b2ae6bf2b00b2c71bb6d70762f2499a4a3a179ed7e76ad7c09`。

測試 **13/13 通過**；Node 覆蓋率為行 100%、分支 88.59%、函式 100%。目前遊戲 `index.html` SHA256 仍為 `1d39ccf230c6d635d392b232c1e9badf1960f21e09ab47093c5334d1f4cb27dc`。工具明列 `contract-inventory-only`、沒有執行 adapter fixtures，也沒有驗證 solver 證據；任何契約自填 `pass` 都會被拒絕。`auditStatus=valid` 只表示格式、來源引用與盤點聲稱一致；結果中的 `sixOfFour=incomplete`、`releaseEligible=false` 才是模型關口狀態。

## 實際缺口

- 契約有 10 個盤點項目：0 個完整、1 個部分完成、9 個缺少 adapter；terminal/payoff 雖有可重用的終局程式，原 `freeLunch` 跨夜淨收益仍未映射。
- 凍結契約只列 `water`、`twinTiger`、`eyes`。現行六鏈正式臂另有 `bloodOath`、`godKing`、`eternalFlame`，且六種 `ordinary/original/candidate × AI on/off` 天命臂均不在舊契約範圍。
- 25 個來源符號引用都能在凍結來源找到，2 個文件引用均存在；其中 5 個行號提示已偏移。符號存在不證明 action set、chance 權重、資訊集合、snapshot/restore 或引擎轉移正確。
- 盤點器目前沒有任何 adapter 測試證據可登錄，也沒有窮舉策略或等價狀態縮減證明；它只把契約明列的缺口做機器可檢查和 fail-closed 報告。

## 下一步

保留舊契約與歷史結果。新增一份版本化的擴展契約，分別固定普通六鏈、私有有放回天命抽籤、原案／候選效果、資訊集合及發布要聲稱的產品來源；逐項設計可和真引擎比對的 adapter fixture。優先從**同一局面 snapshot/restore、隨機 chance 支持集、密封標單與逐席觀測投影**這些基礎能力開始，因為其餘完整策略枚舉依賴它們。每個新 adapter 必須提供可執行 fixture 和來源雜湊，未證明完整前維持 `incomplete`；任何抽樣或固定 AI 對局都不能代替完整跨夜模型。
