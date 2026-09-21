# L1e formal：正式八臂量測工具與六之四模型契約獨立覆審

覆審提交範圍：`d9b5db9` 至 `28d9bec`。檢查 `tests/tools/l1-formal.mjs`、`tests/l1-formal.test.mjs`、`tests/tools/l1-formal-evidence.mjs`，以及 `docs/experiments/2026-09-21-l1e-formal/` 下的契約文件。

## 檢查重點與結果

1. **防混用與資料完整性驗證**：
   - 彙整函式 `aggregate` 嚴格要求八個具名 arm、固定 seeds 1..10000，拒絕重複或缺漏 seed。
   - 逐列核對座位 0 角色（H1 限制 qingmian）、勝者 ID 合法性、全四席曾持有證據（`holders` 與 `first` 事件物件）。
   - 檢查 `sourceSha256`、`toolSha256`、`dependenciesSha256`、`gitHead`、`cfg` 與 `effectiveChains` 快照，任一不符立即中斷。
   - Gzip raw 檔案驗證引入 WeakMap 追蹤，同時驗證與記錄 compressed 及 decoded 的 SHA-256。

2. **數值門檻與分項判定**：
   - H1 採用座位 0 配對勝差，範圍 [-8, +5] pp。
   - H9 採用全四席曾持有者分母，分別計算 normal 與 zero，門檻 [+3, +10] pp，且 normal 勝率 ≤ 85%。
   - 千眼原 H9 桌不消費情報，固定標記 `incomplete`（diagnostic）；六之四跨夜模型未閉合，固定標記 `incomplete`。
   - 整體狀態任何正式分項 fail 則整體 fail，否則為 incomplete；`releaseEligible` 固定為 false。

3. **安全與併發保護**：
   - 所有檔案寫入使用 `wx` 旗標（exclusive write），防止覆寫已存在之原始樣本或彙整報告。
   - CLI 參數解析嚴格區分 `--arm` 執行模式與 `--aggregate` 彙整模式，不允許混用參數。

4. **測試、覆蓋與突變**：
   - 實跑 `node --test tests/l1-formal.test.mjs`：10/10 通過。
   - 核心覆蓋率：行 96.19%、分支 81.87%、函式 95.35%。
   - 突變測試（`tests/tools/l1-formal-evidence.mjs`）：seat-zero-holder 與 invert-normal-minus-zero 兩種語意突變均被測試殺死（`killed`）。
   - 全套相關連攜與情報回歸：61/61 通過。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE**（正式八臂量測工具、六之四模型規格與測試證據符合凍結驗收契約；80,000 局正式長跑尚未執行）。
