# 六之四模型契約盤點器結果

日期：2026-09-24。狀態：**盤點器可執行；完整模型與發布閘仍 `incomplete`**。這是計畫 X 的第一個工具交付，不是 solver、adapter、可行性證明或 `sixOfFour=pass`。

## 可重現命令與來源

```powershell
node tests/tools/l1e-model-contract-audit.mjs
node --experimental-test-coverage --test tests/l1e-model-contract-audit.test.mjs
```

盤點器以 `model-contract.json` 的 `sourceCommit` 讀取凍結版 `index.html`，記錄 Git blob 與 SHA256，再將舊三鏈範圍和現行 [天命臂設定](arms.json) 對照。來源為 `cb64f4ef1cc7c128d28d3f928e832624e4889596`，`index.html` blob `f18a2ffc9770115db8cd60fefbb45726176b9874`，SHA256 `13b0bf220588f8bbca6f2c7352f0e9125894cb8c271225f79f347019880af5b9`。契約 SHA256 `944ebc92c3ba93b2ae6bf2b00b2c71bb6d70762f2499a4a3a179ed7e76ad7c09`。

測試 **19/19 通過**；與正式遊戲規則整合的回歸共 **29/29 通過**。盤點器 Node 覆蓋率為行 100%、分支 87.11%、函式 96.97%。目前遊戲 `index.html` SHA256 仍為 `1d39ccf230c6d635d392b232c1e9badf1960f21e09ab47093c5334d1f4cb27dc`。工具明列 `contract-inventory-only`、沒有執行 adapter fixtures，也沒有驗證 solver 證據；任何契約自填 `pass` 都會被拒絕。`auditStatus=valid` 只表示格式、來源引用與盤點聲稱一致；結果中的 `sixOfFour=incomplete`、`releaseEligible=false` 才是模型關口狀態。

工具另外固定比對舊模型契約的排序鍵 JSON SHA256 `a2a5bbf07bc46d2330ad4a8b7a2e4296bddda5231f0b1df9227faf6e43af92c3`、六鏈／六天命臂設定的排序鍵 JSON SHA256 `d84ea77460a5d7fc3d1aabb2b5eb1118fd5316e40d90932e9114bb02d10110a4`，以及凍結版 `index.html` 的原始位元組 SHA256 與 Git blob。工具從完整契約、完整臂設定與原始碼位元組自行重算摘要；契約和 metadata 都先轉成與摘要完全相同的 JSON 快照，再由快照執行後續檢查，呼叫者提供的摘要不能替代計算。它獨立要求六個鏈 ID、六種 `ordinary/original/candidate × AI on/off` 模式及私有抽籤聲明吻合。縮小清單、改動任一凍結臂內容、重寫契約、空符號、零行號、超出來源的行號，透過 Proxy 讓雜湊與檢查讀到不同值，或透過 junction 指向 repo 外的文件，都會使稽核失敗。雜湊只證明輸入沒有偏離已凍結版本，不代表玩法已被數學求解或平衡驗證。

## 實際缺口

- 契約有 10 個盤點項目：0 個完整、1 個部分完成、9 個缺少 adapter；terminal/payoff 雖有可重用的終局程式，原 `freeLunch` 跨夜淨收益仍未映射。
- 凍結契約只列 `water`、`twinTiger`、`eyes`。現行六鏈正式臂另有 `bloodOath`、`godKing`、`eternalFlame`，且六種 `ordinary/original/candidate × AI on/off` 天命臂均不在舊契約範圍。
- 25 個來源符號引用都能在凍結來源找到，2 個文件引用均存在；其中 5 個行號提示已偏移。符號存在不證明 action set、chance 權重、資訊集合、snapshot/restore 或引擎轉移正確。
- 盤點器目前沒有任何 adapter 測試證據可登錄，也沒有窮舉策略或等價狀態縮減證明；它只把契約明列的缺口做機器可檢查和 fail-closed 報告。
- `auditStatus=valid` 僅代表兩份凍結輸入、全產品範圍和現有來源引用通過完整性檢查；它不代表六組策略、天命效果或遊戲平衡已審核通過。
- 天命 runner 實際載入目前工作目錄的 `index.html`，並記錄其 `productSha256` 和 `gitHead`；它沒有核對 `arms.json` 的 `productBaseline=2eb164d`。各臂仍能確認使用同一份程式，但正式跑數前要明確凍結被評估的產品／候選 commit，避免把可重現的結果誤稱為已核實的 baseline 結果。

## 下一步

保留舊契約與歷史結果。新增一份版本化的擴展契約，分別固定普通六鏈、私有有放回天命抽籤、原案／候選效果、資訊集合及發布要聲稱的產品來源；逐項設計可和真引擎比對的 adapter fixture。優先從**同一局面 snapshot/restore、隨機 chance 支持集、密封標單與逐席觀測投影**這些基礎能力開始，因為其餘完整策略枚舉依賴它們。每個新 adapter 必須提供可執行 fixture 和來源雜湊，未證明完整前維持 `incomplete`；任何抽樣或固定 AI 對局都不能代替完整跨夜模型。
