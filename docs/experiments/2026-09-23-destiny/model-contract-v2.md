# 六之四模型契約 v2：六鏈與天命 adapter fixtures

日期：2026-09-24。狀態：**契約與第一批引擎 fixtures 已建立；六之四仍 incomplete**。v1 契約與其歷史結果保留不動；本文件補上當前六鏈／天命範圍的版本化來源釘選與局部可執行證據。

## 凍結來源與範圍

機器可讀契約：[model-contract-v2.json](model-contract-v2.json)。fixture 測試：[l1e-destiny-adapter-fixtures.test.mjs](../../../../tests/l1e-destiny-adapter-fixtures.test.mjs)，adapter：[l1e-destiny-adapter-fixtures.mjs](../../../../tests/tools/l1e-destiny-adapter-fixtures.mjs)。產品來源固定為 commit `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a` 的 `index.html`，Git blob `8ba772b9d960eff8b9c42eac77040433f809c57d`、SHA256 `8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d`。測試會從 Git 取來源位元組、重算兩種雜湊，並確認工作樹的 `index.html` 與此來源相同；adapter 載入時另記錄來源、adapter、fixture 與插樁後來源雜湊。它不拿近似版本當等價產品。

模型範圍包含普通六鏈 `water`、`eyes`、`twinTiger`、`bloodOath`、`godKing`、`eternalFlame`，並保留 `ordinary/original/candidate × AI 追件 off/on` 六臂、四席各抽一封、有放回且允許撞籤的天命規則。六臂是未來模型範圍，不表示這批 fixtures 已覆蓋每個臂的玩法效果。

## 本批實際驗證

目前新 fixture **7/7 通過**；與天命鏈、資訊投影、v1 契約盤點回歸合跑 **61/61 通過**。adapter 行覆蓋 94.77%、分支覆蓋 65.38%、函式覆蓋 100%。覆蓋率只反映這個測試工具的執行情形，不能當成完整模型覆蓋率。

執行命令：

```powershell
node --test tests/l1e-destiny-adapter-fixtures.test.mjs
```

fixtures 驗證以下邊界：

1. **產品來源**：commit、Git blob、SHA256 與工作樹產品檔吻合。
2. **私有天命 chance 支持集**：引擎實際處理 0–251 全部可接受 byte；六鏈各有 42 個前像；252–255 都重抽。以相同引擎列出所有 `6^4 = 1296` 個四席抽籤 tuple，包括重複鏈。
3. **局部 snapshot／restore**：在 `makeState` 完成、第一次直接呼叫 `resolveAuction` 前拍下引擎狀態；圖複製保留物件別名，恢復玩法與 UI RNG closure 游標，重播結果、完整狀態 checkpoint 與下一個玩法 RNG 值都相同。
4. **密封標單投影**：兩種不同且會改變得標者的真人標單，在揭露前產生相同公開 replay；逐件呼叫 `publishDestinyReveal` 後，該件結果才可見。
5. **逐席天命投影**：改動其他席位尚未公開的命函，不會改變 viewer 0 自己可見的投影或公開 replay；只在覺醒結果發布後，對手命函才出現在投影中。

這些證據是底層 adapter fixture，不是六條普通鏈／十二種真效果的平衡結果，也不驗證策略優勢或玩家理解。抽籤枚舉只涵蓋四封私函，不涵蓋角色選擇、牌堆洗牌、事件、平標、戰鬥或其他 RNG 節點。snapshot 只證明第一次直接拍賣的引擎內狀態；它沒有保存 `playPolicyGame` 的區域變數，也未證明可從任意決策點跨夜分支。

密封標單 fixture 只驗公開 replay 在原揭露邊界前不洩露兩種封標結果。引擎沒有通用的全席位合法動作 iterator 或 observation-history API；同機 JavaScript 的內部 `S` 仍可讀，故不能稱伺服器級保密。逐席 projection 亦不等於資訊集合已建模，尚未證明同觀測歷史可合法合併或對手隱藏資訊不會影響所有選擇。

## 仍未完成

- 根節點所有合法初始化及其精確相關機率。
- 所有席位的逐相位合法行動、sealed commitment transition、異事／盯牌／燒香／請神等人類選擇。
- 全遊戲 chance 支持與精確權重、任意相位及 runner-local 跨夜 snapshot／restore、已證明等價的 canonicalization。
- 六鏈與原案／候選真效果的全跨夜資訊集合、完整 contingent policy enumeration、原始 terminal/payoff 與 `freeLunch` 淨收益對映、求解結果及獨立覆審。
- 普通版 H9 仍有雙虎／血祭 fail、千眼 incomplete；真版焦點四鏈 fail、兩鏈 incomplete。這些原門檻未修改。

因此契約保留 `sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false`。不能用 1296 個抽籤 tuple、一次首拍 snapshot/replay、量測萬局或固定 AI profile 宣稱六之四通過。下一項按續作計畫是所有席位合法動作與 observation adapter，並逐個 fixture 對照這份凍結引擎。
