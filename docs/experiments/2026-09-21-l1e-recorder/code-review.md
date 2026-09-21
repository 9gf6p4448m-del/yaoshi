# L1e recorder：JS 與測試獨立覆審

覆審 `cd16098`、`b0cdbae` 的 `index.html`、`tests/chain-holdings.test.mjs`、`tests/tools/chain-holdings-evidence.mjs`。本次聚焦 opt-in 與既有呼叫相容性、記錄 scope 生命週期、snapshot 隔離、異常清理、測試與證據有效性；真實 bag 寫入接點的逐項完整性另由 Astra 覆審。

未發現可確認的產品碼問題。`options?.recordChainHoldings===true` 保持既有三參數呼叫的回傳形狀；記錄器綁定當局 `S` 與真實玩家 object identity，拒絕錄製期間再次呼叫 `playPolicyGame`，且在正常與拋錯路徑皆由 `finally` 清空。回傳時複製首次紀錄，不將資料附著於玩家、`S`、歷史或規則設定。觀測函式同步執行、不消耗 RNG；沒有新增 Promise 或非同步清理競態。

測試初版有兩個證據缺口：同夜失去用測試直接 `splice`，且 off/on 對照關閉事件、夜規、心願與請神。實作端已補真實 hunter 取得後由 ghost 移出的案例、假玩家經真實 pawn hook 的 identity 檢查，並把預設旗標全開的 off/on 與下一個 RNG 對照擴至 seeds 1..20。已提交日誌的尾隨空白亦在 `b0cdbae` 修正；`git diff --check HEAD~2 HEAD` 通過。

獨立執行最新 HEAD 的 `node --test tests/chain-holdings.test.mjs`：13/13 通過。核對已保存的證據：recorder 兩個新核心函式的 V8 非空白原始碼單位覆蓋 670/687（97.53%）；night-end-only、seat-zero-only、omit-auction-win 三個語意突變分別造成 8、4、1 項測試失敗。此覆蓋數字只代表 `observeBagMutation` 和 `chainHoldingsSnapshot`，不代表整個遊戲或全部測試覆蓋。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE**（本次 JS、scope 與測試證據範圍）。
