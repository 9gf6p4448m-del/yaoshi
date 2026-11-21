# 妖市 Codex 審查帳（LEDGER）

依 `~/docs/harness/14-game-workflow.md` §3：

- 啟動前先登錄 start 列（review-id、輪次 n/3、受審 commit）；結束後在同一列補上 verdict、C/H/M/L 數量、原檔 SHA-256、簽准（簽准寫 `DECISIONS.md` 的日期加主題）。
- 沒有登錄的審查結果不准引用。原始輸出放 `docs/reviews/<階段>/`；`<id>.json` 進版控並算 SHA-256，`*.stdout.log` 不進版控（第一次送審前，先把 `docs/reviews/**/*.stdout.log` 加進 `.gitignore`）。
- 「基準（流程生效前、未審）」列只能當基準，不能當 `Codex-Review: <id>` 用。

| 日期 | 類型 | review-id | 輪次 | 受審 commit | verdict | C/H/M/L | 原檔 SHA-256 | 簽准 |
|---|---|---|---|---|---|---|---|---|
| 2026-11-21 | 基準（流程生效前、未審） | — | — | `bebb8fd9`（線上 v0.66.0，Pages 2026-10-12 建置） | — | — | — | — |
| 2026-11-21 | 審查 | yaoshi-v0.66.1-r1 | 1/3 | `f2ff1ad7`（v0.66.1 候選：手 shader 預編＋拍品預載；基準 bebb8fd9） | FAIL | 0/2/4/0 | `3e1572c1e6f65b5db7b2c3a5f23baa4c8577400ec6602939457aa43b9a19e4a6` | — |
