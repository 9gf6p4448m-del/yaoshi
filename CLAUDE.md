# 妖市：Claude Code 專案入口

本檔是跨工具續接入口。使用者的最新指示優先；不要把 Codex 對話、子代理或尚未存檔的記憶當成已取得的上下文。

## 開始時只讀必要入口

1. `git status --short`、`git log -5 --oneline`，確認所在分支與既有修改。
2. [當前 A1 交接](docs/handoffs/2026-09-15-a1-premium-table.md)：已裁事項、公開版本、未過項及下一步。
3. [總藍圖](docs/MASTER_BLUEPRINT.md)：產品範圍與優先序；舊 Antigravity 內容已逐項整併，原文仍保留。
4. 要改 A1 時讀 [凍結驗收 v1.1](docs/experiments/2026-09-15-acceptance-a1-premium-table.md)，再按問題讀相關原始證據，不整批讀 experiments。

## 已裁邊界

- A 方向「廟埕暗桌・紙紮顯靈」與依 HUD 空間自動退鏡已批准，不重問；FOV、模型世界尺寸、文字及演出時長仍依契約。
- 延續 Astra 已定方向與構圖契約。Claude Code 可接實作、除錯、測試與紀錄；接手不代表重新選美術方向或推翻凍結標準。新的實質視覺／架構取捨依使用者與專案規範處理，不冒稱完成 Astra 覆審。
- v0.57.12 已依使用者批准實作六種詛咒差異化／造型及正式戰力退役，85 測試、300 詛咒幾何通過；已隨 `b3ea547` 發布並核對公開 HTML／造型檔送達；201 詛咒手機、768 卡面、36 物品與袋子名稱、夜戰同側回饋均通過。先讀 [本卷報告](docs/experiments/2026-09-15-curse-migration/README.md)。功能／幾何通過不等於 A1 最終驗收；相對效能、手機真機與原 P4／M-A1 未過項保留。
- v0.57.13（2026-09-17，`bc6359d`）：A1 效能診斷第一個單一修補——牌桌取景對描邊外殼不再重複計算骨骼包絡，畫面／規則／時長不變；87 測試、1599 取景矩陣、trace 相等。32 枚正式 gate 仍 RED（.3403）；128 枚中位 .403 過目前可執行 gate 但與本修補無關、逐輪 3/5。先讀 [本卷報告](docs/experiments/2026-09-17-a1-framing-dedupe/README.md)。
- v0.57.14（2026-09-17，`a53b99c`）：第二個單一修補——同一尊網格共用一副骨架，每幀骨骼貼圖上傳 51→5；89 測試、1599 矩陣、trace 相等。**A1 桌機相對效能 gate 首次全過**：perf32 .4270（paired 5/5）、perf128 .4660（5/5）。這是本機 Chromium 速度比，不是 Safari fps；真機仍待回報。先讀 [本卷報告](docs/experiments/2026-09-17-a1-skeleton-share/README.md) 與 [交接末段](docs/handoffs/2026-09-15-a1-premium-table.md)。
- v0.57.15（2026-09-17）：第三個單一修補——桌面 decal（接觸陰影／硃砂符／月印）與招式特效模板加 `forceSinglePass`，Three 0.158 對 transparent＋DoubleSide 每幀分兩趟畫並兩次 needsUpdate；每幀 getParameters 10→0、draw 94→89，像素逐位元組相同；91 測試、矩陣 slot1、trace 相等；perf32 .6585／perf128 .6943（配對 5/5，分母偏低要打折看）。報告 [docs/experiments/2026-09-17-a1-program-churn](docs/experiments/2026-09-17-a1-program-churn/README.md)。
- v0.57.16（2026-09-17）：第四個單一修補——對決畫面的浮標水面（圓盤／緣光／3 環）與殘日餘暉碟加 `forceSinglePass`，同一機制搬到對決側量：8v8 每 rAF getParameters 52→0、draw 503→477，三個取樣像素逐位元組相同；93 測試、牌桌探針不變、trace 相等；對決側只記錄相對值（交錯 3 輪修補後皆較快，duel-perf 的 fixture 不含此路徑、差在雜訊內）；perf32 .6058（paired 5/5）GREEN。報告 [docs/experiments/2026-09-17-a1-duel-singlepass](docs/experiments/2026-09-17-a1-duel-singlepass/README.md)。
- D2 連鎖、D3 幽靈、D5 進度等未裁，不因總藍圖收錄而直接實作。
- 持續發布授權有效：必要驗證後可正常提交、push 並核對公開送達。不要 force push；不能只有 push 成功就稱網站已更新。

## 工作樹與工具

- 不用 `git add -A`、reset 或 clean 處理既有 dirty files；具體清單見交接。避免兩個工具同時編輯同一工作樹；平行工作需各自 worktree 與明確檔案責任。
- 搜尋限當前專案來源；排除 `.claude/worktrees/`、`.codex-worktrees/`、`scratchpad/`、`node_modules/`，除非正在查指定舊證據。
- 靜態 HTML／JS 遊戲。快速檢查：`node --test tests/*.test.mjs`；純呈現改動另以同版基準跑 `tests/tools/trace-eq.mjs`。
- 瀏覽器工具使用本機、未追蹤的 `tools/anyCreature/` 依賴。2026-09-15 實測 Node 24.16.0、Python 3.14.5、Playwright 1.62.1、本機測試套件 Three 0.180.0；遊戲 importmap 實際載入 Three 0.158.0，兩者不能混稱。同機可沿用；換機需先確認依賴，Git 不包含這個目錄。不因版本不同而擅自升級遊戲。
- 效能診斷與正式 gate 分開；CPU profile 不能證明 Safari fps。正式性能量測獨占 GPU browser，不與截圖／矩陣同跑。
- 有受影響的程式改動才跑必要檢查。未改產品時不用重跑 1599 矩陣；不能反覆重測直到挑到綠燈。

Claude Code 的專案記憶機制參考：[官方文件](https://code.claude.com/docs/en/memory)。
