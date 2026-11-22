# 妖市 Codex 審查帳（LEDGER）

依 `~/docs/harness/14-game-workflow.md` §3：

- 啟動前先登錄 start 列（review-id、輪次 n/3、受審 commit）；結束後在同一列補上 verdict、C/H/M/L 數量、原檔 SHA-256、簽准（簽准寫 `DECISIONS.md` 的日期加主題）。
- 沒有登錄的審查結果不准引用。原始輸出放 `docs/reviews/<階段>/`；`<id>.json` 進版控並算 SHA-256，`*.stdout.log` 不進版控（第一次送審前，先把 `docs/reviews/**/*.stdout.log` 加進 `.gitignore`）。
- 「基準（流程生效前、未審）」列只能當基準，不能當 `Codex-Review: <id>` 用。

| 日期 | 類型 | review-id | 輪次 | 受審 commit | verdict | C/H/M/L | 原檔 SHA-256 | 簽准 |
|---|---|---|---|---|---|---|---|---|
| 2026-11-21 | 基準（流程生效前、未審） | — | — | `bebb8fd9`（線上 v0.66.0，Pages 2026-10-12 建置） | — | — | — | — |
| 2026-11-21 | 審查 | yaoshi-v0.66.1-r1 | 1/3 | `f2ff1ad7`（v0.66.1 候選：手 shader 預編＋拍品預載；基準 bebb8fd9） | FAIL | 0/2/4/0 | `3e1572c1e6f65b5db7b2c3a5f23baa4c8577400ec6602939457aa43b9a19e4a6` | — |
| 2026-11-22 | 審查 | yaoshi-v0.66.1-r2 | 2/3 | `001623e9`（r1 六項修正後；規則面同 d3852d35；基準 bebb8fd9） | FAIL（r1：F1/F2/F4/F6 fixed、F3/F5 superficially_fixed） | 0/1/3/0 | `0339bf471487f9663a8ceb8d4f1760487a66a278e4838b2ed731a634b3c1466a` | — |
| 2026-11-22 | 審查 | yaoshi-v0.66.1-r3 | 3/3 | `79af5f85`（r2 修正＋排隊誤判修正後；規則面同 29975875；基準 bebb8fd9） | FAIL（r2：F1/F2/F4 fixed、F3 superficially_fixed）；3 輪用完，未解 HIGH 交製作人 | 0/1/5/0 | `d49f71cccab9590081e98082772acce028430308357ec00fffece6acf47c6c60` | 2026-11-22｜v0.66.1 r3 剩餘 finding 簽准（F1 HIGH 逐條簽；F2–F6 MEDIUM 階段末整批簽；v0.66.2 修） |
| 2026-11-22 | 審查 | yaoshi-v0.66.2-r1 | 1/3 | `c45dd1b1`（v0.66.2 候選：r3 F1–F6 修正＋版號 0.66.2；規則面同 541eab03；基準 79af5f85） | FAIL | 0/2/4/0 | `db6c538a288271fed384055a62c2a922a6fc55718890d20098c81a306ab10bea` | — |
| 2026-11-22 | 審查 | yaoshi-v0.66.2-r2 | 2/3 | `53a2f6c7`（r1 六項處置後：並行重抓、排隊上限從請求發出算、解析上限、測試加嚴；規則面同 8e9eb2b5；基準 79af5f85） | FAIL（r1：F2/F3 fixed、F1/F4/F6 superficially_fixed、F5 not_fixed） | 0/1/5/0 | `48ce8dafc4cbab315748f7271690d4d122f1394a8307402b9375cabbc386a3e5` | — |
| 2026-11-22 | 審查 | yaoshi-v0.66.2-r3 | 3/3 | `668d98c3`（r2 處置後：判卡住先看本體進度再看最新請求階段、預載共用判卡住通知、測試加嚴；規則面同 a8a1c4e1＋e574e234；基準 79af5f85） | FAIL（r2：F1/F3 fixed、F2/F5 superficially_fixed、F4/F6 not_fixed）；3 輪用完，未解 HIGH 交製作人 | 0/1/6/0 | `70c05aee3b3dac7bc3b0edc3937a0c19685da6aa45972063d23a1bfbe6379ee5` | 2026-11-22｜v0.66.2 r3 剩餘 finding 簽准（F1 HIGH 逐條簽；F2–F7 MEDIUM 階段末整批簽；v0.66.3 候選） |
| 2026-11-22 | 審查 | yaoshi-v0.66.3-r1 | 1/3 | `c932d9c3`（v0.66.3 候選：v0.66.2-r3 F1／F2／F4 修正＋F3／F7 測試＋版號 0.66.3；規則面同 9ed077d3＋版號；基準 668d98c3） | FAIL | 0/1/1/0 | `304dfbb956a5efa73be19c4b3c7a3e3a9f598cdf777642dd68931e4918ba634d` | — |
| 2026-11-22 | 審查 | yaoshi-v0.66.3-r2 | 2/3 | `fed143e9`（r1 處置後：讓出連線只在 HTTP/1.x 且進行中 GLB 請求超過 6 個時、預載訂閱改單一通知＋可移除集合、測試加 R／C2；規則面同 ea8fc377；基準 668d98c3） | FAIL（r1：F2 fixed、F1 superficially_fixed） | 0/1/2/0 | `3926dc7c969de06577eae70e2379875a70aaaa263cd475af01a85dc55b885402` | — |
| 2026-11-22 | 審查 | yaoshi-v0.66.3-r3 | 3/3 | `14f13664`（r2 處置後：製作人同意撤掉 HTTP/1.1 讓出機制與條件 1，下載／重抓／判卡住退回 v0.66.2，留 F2 訂閱與 F4 遮罩重設、測試加 M／K 與 W 數共用承諾上的 then；規則面同 0848c5ce；基準 668d98c3） | PASS（r2：F1 fixed、F2 superficially_fixed、F3 not_fixed） | 0/0/4/0 | `d8028dd86867d0265ec6facc260d6a2df671fb342884332d4c94bcd370a75db9` | — |
