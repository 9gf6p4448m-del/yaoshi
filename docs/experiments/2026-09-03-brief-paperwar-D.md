# 派工：《紙紮夜戰》卷 D
repo `C:/Users/shung/OneDrive/桌面/妖市`，你在隔離 worktree，基準＝main 最新 commit（v0.29，卷 A 引擎已併入、PAPERWAR_ON 預設 false）。
先讀：同目錄 `acceptance-paperwar-D.md`（凍結）→ `docs/experiments/2026-09-03-paperwar-A-report.md`（上一卷的結果與數值）→
`docs/experiments/2026-09-03-acceptance-paperwar-A.md`（27 件體型與招式的起始建議）→ `index.html` 的 `paperWar`／`TRAITS`／`buildArmy`／
`aiBids`／`resolveBattles`／`phaseFor` → `tests/tools/paperwar-gate.mjs`。
做法要點：D1 的估值可以先寫「解析近似」（例如以 unit 的 count×atk×hp 與對手袋子的體型組成算克制係數），再用 duelBags 抽驗近似與實測勝率的相關性 ≥0.6；
每件法寶的招寫進 TRAITS 一張表，不要散落；beats 記錄不得改變任何判定（用 D-A0 與「ON 下 D 前後勝率矩陣相同」證明加欄位無副作用——
先跑一次 D 前的 duelBags 矩陣存檔，再加 beats，比對相同）。
VERSION 0.29→0.30（開關仍關）。報告寫到 `C:/Users/shung/AppData/Local/Temp/claude/C--Users-shung/894c8158-a137-4bf7-8693-9f68d372cdd7/scratchpad/report-paperwar-D.md`
（若你的規則不准寫 .md 就寫 `.txt`，路徑同、副檔名換），內容：D-A0～D-A10 各過不過→改了哪些檔:行號→指令原文＋輸出→27 件招式表→做不到的事。
回覆只給路徑＋三行結論。全程繁體中文。不 commit 不 push。伺服器用 8792 埠、按 PID 關。
