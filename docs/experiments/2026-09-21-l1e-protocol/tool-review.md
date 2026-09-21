# L1e 全席終點持有者工具獨立覆審

日期：2026-09-21。結論：**APPROVE 此 1,400 筆既有 raw 的診斷工具與報告**；未留未解 HIGH／MEDIUM。這不是正式 H9、跨夜六之四或 L1 平衡驗收。

## 範圍與修正

審查 `tests/tools/l1-holder-audit.mjs`、`tests/l1-holder-audit.test.mjs`、本卷 `holder-audit/` 證據，並核對來源 `2026-09-21-l1e-measurement/pilot/raw.jsonl` 與執行前契約。程式只讀既有模擬資料；沒有重跑遊戲。審查期間發現並修正兩項：

1. `measure` 收到 `Map.values()` 迭代器，原本讀 `rows.length` 得到 `undefined`，六個臂的 `games` 在 JSON 中全被略去。現在逐筆計數；回歸測試先紅後綠，最後六個臂均為 `games=200`。原輸出保留在 `holder-audit/initial-report/`，目前摘要由同一份 raw 重生。
2. 輸出路徑原先只做字面比較，Windows junction 可繞過原 pilot 目錄保護。現在將既存祖先路徑解析為真實路徑後比較；測試涵蓋 junction 別名。輸入整份驗證完成後才建立輸出目錄。

工具拒絕非法臂、重複或不配對種子、非法勝者，以及不是四席／含非法或重複連攜 ID 的終點袋子。持有者分母是每局四席中至少一席在 runner 終點持有完整配方的局數；分子是該局勝者也在其中。零分母為 `null`；normal−zero 使用各臂自己的條件分母，報告明示差值非因果。`formalStatus` 固定為 `incomplete`。

## 獨立核對與驗證

- 原 raw 為 1,400 行，七臂各有不重複的種子 1–200；SHA256 為 `cd42d3b3ecfcd1110dcc43f4073e0ef7d74cb977876dea6b653fd311c2b38911`，與目前摘要及原 pilot 證據一致。
- 逐列另算六組「至少一位持有／勝者持有」：水陸正常 82/50、歸零 83/49；千眼正常及歸零皆 88/54；雙虎正常 87/46、歸零 87/48。六組持有席數分布、比率與 normal−zero pp 差也和摘要一致，且每組分布合計 200 局。
- 獨立執行 `node --experimental-test-coverage --test tests/l1-holder-audit.test.mjs`：8/8 通過；新增工具的 Node V8 coverage 為 line 96.32%、branch 94.74%、function 100%，不是全專案覆蓋率。座位 0 限定持有者的故障突變使兩項測試失敗。`games` 修補先見 `undefined !== 4` 再轉綠；junction 測試在舊字面守衛下到達 `invalid arm at row 1` 而非應有的阻擋訊息，還原新守衛後轉綠。最初 junction 測試僅因匯入不存在函式而紅，證據另存且沒有冒稱為行為驗證。
- `node --check` 兩個 `.mjs` 檔、`git diff --check` 均通過。此工作樹無 `package.json`、TypeScript 設定或可用 ESLint 命令，因此沒有 TypeScript／ESLint 檢查可跑。

原 raw 沒有「曾經持有」歷史；原 H9 還要求不同的預設桌。這份報告只能說明 `playPolicyGame` 停止點的全席持有情況，不能套用 H9 的正式門檻，也不能補足跨夜六之四。輸出沒有記錄工具 hash，因此本審不宣稱它含工具版本雜湊。
