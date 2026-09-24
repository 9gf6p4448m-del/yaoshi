# 普通版 blood-L 正式驗收結果（2026-09-24）

**結論**：依 [正式驗收規則](formal-acceptance.md)，血祭 H9 `+3.57pp`（pass）、H1 `+2.57pp`（pass），**數值修正成功**；其他五鏈沒有由 pass 轉 fail。產品提交 `0592512`，14 臂各 10,000 局（種子 `10001..20000`）全部在同一 HEAD 上完成，`sampleComplete=true`；摘要 [formal-summary.json](formal-summary.json)，raw 在忽略版控的 `scratchpad/h9-boost-formal/`。

| 鏈 | H1 基線 → 本輪 | H9 基線 → 本輪 | 狀態 |
|---|---|---|---|
| 血祭 | +2.04 → +2.57 | +1.34 → **+3.57** | fail → **pass** |
| 水陸 | +4.84 → +4.84 | +8.64 → +8.93 | pass |
| 神王 | +4.60 → +4.62 | +3.64 → +3.63 | pass |
| 長明 | +0.19 → +0.39 | +6.12 → +5.64 | pass |
| 千眼 | +1.76 → +1.49 | +5.52 → +5.26 | incomplete（原口徑固定） |
| 雙虎 | +1.44 → +1.47 | +0.98 → +0.57 | fail（使用者裁定列已知診斷基線） |

基線為 [2026-09-23 最終審視](../../reviews/2026-09-23-destiny-final-review.md) 同種子數字。H9 仍是條件化描述量、非因果。

## 回歸測試（`sfx-wiring` 以外全部 `tests/*.test.mjs`）

- 改動前（`index.html` 暫換回 `0592512~1`）：383/383 通過。
- 改動後：312/383；**71 項失敗全部是** `worktree index.html differs from the product source pinned by the v2 contract`（`tests/tools/l1e-destiny-adapter-fixtures.mjs:50`），分佈在 X 模型 v2–v11 的 11 個測試檔。其他測試無新失敗。
- 另：`tests/tools/l1-destiny-h9-activity.mjs`、`l1-destiny-h9-choice-impact.mjs` 以舊字面值做替換，與新產品不相容（診斷工具，非測試）。
- 處理方式待使用者裁定。

## X 模型鎖定處理（使用者 2026-09-24 裁定）

- X 模型 v2–v11 仍從 git 讀 `d63f03e` 版 `index.html` 並核對雜湊；不再要求工作樹等於該版（`tests/tools/l1e-destiny-adapter-fixtures.mjs` 改為照實回報 `currentWorktreeMatches`，`l1e-cross-night-restore-adapter-v9.mjs` 拿掉工作樹一致條件）。模型描述的是 `d63f03e` 版產品，不是含 blood-L 的現行產品。
- 回歸：修改後 383/383 通過。鑑別：把欄位寫死回 `true` 時 `tests/l1e-destiny-adapter-fixtures.test.mjs` 1 項失敗（actual `true`），還原後 7/7。
