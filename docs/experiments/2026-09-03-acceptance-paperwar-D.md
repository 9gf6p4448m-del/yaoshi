# 驗收條件凍結 — 《紙紮夜戰》卷 D：AI 學會看新制＋每件法寶有自己的招＋月相修正（2026-09-03）
基準 SHA：main 上「v0.29 引擎併入」那個 commit（`git log --oneline -1` 取得）。`PAPERWAR_ON` 目前預設 false。
使用者裁定（2026-09-03）：①A4/A5/A7 先做卷 D 再重量 ②月相 atk+1 → **hp+1** ③wish16 治具釘 `PAPERWAR_ON=false`。
使用者另一句要求：「不然只有單純紙紮人打架一樣無聊」——每件法寶要有辨識度。一經訂定即凍結。

## 範圍
D1 **AI 估值改讀體型與桌面組成**：`aiBids` 的預設估值（`onAiValue` 之前那行 `it.p+marginal+…`）在 `PAPERWAR_ON` 時改成
   「這件的 unit 對我現有隊伍的邊際戰果」：用 `duelBags`／`paperWar` 的同一套引擎，估「我加這件 vs 桌上其他三家目前的袋子」的
   勝場增量（可用小樣本 seeds、或用解析近似，但**必須讀 unit 與對手袋子**，不得只讀 it.p）。`PAPERWAR_ON=false` 時走原式（等價前提）。
   角色 `onAiValue` hook 照舊疊加。成本：runMany 10000 局仍要跑得完（≤ 現行 3 倍時間）。
D2 **每件法寶一個招**：27 件各有 `trait`（現有 TRAITS 已覆蓋作祟與部分護法）：補齊群體與精英的 signature（照凍結檔 A 表「起始建議」
   的括號：首擊／衝撞／回血／變形濺射…），護法改成 atk 1 或有主動效果（「只買護法」不得再是 0%）。**每件的招要在戰況 log 出現**
   （卷 C 要演）。詛咒品維持「詛咒纏身 atk −1」。
D3 **月相改 hp+1**（該拍該系每隊 hp+1，不再 atk+1）；月相文字同步。
D4 **逐拍時間軸**：`paperWar` 回傳加 `beats:[{beat, side, actor, target, kind, amount, killed}]`（加欄位不動判定；卷 C 用）。
D5 **wish16 治具**釘 `PAPERWAR_ON=false`（釘情境不是門檻，比照 conscap 的 CONS_CAP_DIV）。

## 驗收（n≥10000，貼指令原文＋輸出；閘門腳本 `tests/tools/paperwar-gate.mjs` 可加項目不可改既有門檻）
D-A0 kill switch：`PAPERWAR_ON=false` 時 trace(1..20) 與基準逐位元組相等；true 必不等
D-A1 三角（不計平手口徑）：群體vs精英 40–60%、群體vs作祟 ≤40%、作祟vs精英 ≤40%（各 ≥3 組同總價配對）
D-A2 價格信號單調不降（貼表）
D-A3 三策略各 ≤40%
D-A4 節奏：ON vs OFF 四席存活夜位移 ≤1、局末壽命位移 ≤3 → **重量後如實貼；未過不改門檻，寫成「待使用者裁定重基準化」**
D-A5 角色極差不大於 OFF → 同上口徑
D-A6 月相窮舉（hp+1 版、同總價建袋）：無單一買法在任一夜對所有對手 ≥50%
D-A7 AI 不崩：ON 時 AI 三席對三策略勝率合計 ≥ OFF 的 90%（**D1 做完後這條是本卷的主閘門，必須過；不過＝改 D1 實作**）
D-A8 五套測試 5/8/16/28/36 全綠（wish16 釘 OFF）；Math.random 0；844×390 `#feltHead` 月相字串、溢出不大於基準、console 0
D-A9 活性：每件法寶的 trait 在 10000 局內至少觸發 1 次（貼 27 列計數）；「只買護法」對三種單一買法勝率皆 >0%；beats 陣列每場非空且 killed 加總＝burned
D-A10 效能：`runMany` n=10000 ON 的耗時 ≤ OFF 的 3 倍（貼秒數）

## 不得做
不改 CFG 既有數值（PW_MAX/PW_MIN 除外可調但要列出）、不改 ROLES ai 參數、不改既有測試斷言（只准釘治具）、不動 js/ 演出、不開 PAPERWAR_ON 預設、不 commit 不 push。
