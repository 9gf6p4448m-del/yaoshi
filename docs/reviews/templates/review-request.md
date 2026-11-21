# 妖市 Codex 審查要求範本（14 §3）

2026-11-21 建立（製作人同意在 v0.66.1 階段開工後補寫；見 DECISIONS 2026-11-21）。fresh read-back 一輪後修正 8 處歧義。

**用法（本段與分隔線以上都不送給 Codex）**：複製本檔分隔線以下的內容到 `docs/reviews/<階段>/<review-id>.request.md`，把 `{…}` 換成實際值，其餘文字不改；送審指令與落檔照 14 §3（快照＝`git archive <受審 commit>`，含 docs）。佔位符：
- `{review-id}`：`yaoshi-<階段>-r<輪次>`，例 `yaoshi-v0.66.1-r1`。
- `{base}`：LEDGER 照 14 §3 取的基準 commit；`{head}`：受審 commit。
- `{acceptance-files}`：本階段的驗收檔路徑（快照內的相對路徑），逗號分隔。
- `{prior-findings}`：第 1 輪填「無（第 1 輪）」；第 2 輪起貼上一輪 JSON 的 `findings` 陣列原文。
- `{diff}`：`CLAUDE.md` 開頭「14 §0.2 四項定義」那條規則面 `git diff` 指令（去掉 `--name-only`）在 `{base}..{head}` 的輸出原文。

---

review-id: {review-id}

全部用繁體中文回答，輸出必須符合給你的 JSON schema。JSON 的 `review_id` 欄位填 `{review-id}`，`summary` 的第一行照抄 `review-id: {review-id}`。

## 你的角色
你是妖市（瀏覽器 3D 拍賣卡牌遊戲，靜態 HTML／JS，`index.html` 主檔、`js/` 是 3D 層）的獨立技術與規則審查者。你沒參與實作。你的任務是**找出會出錯的情境**，不是確認看起來沒事。

## 你手上有什麼、能做什麼
- 工作目錄是受審 commit `{head}` 的唯讀快照，含 `docs/`，**沒有 .git**，也沒有基準版的檔案。
- 要審的 diff（`{base}..{head}`，只含規則面路徑；規則面的定義見快照 `CLAUDE.md` 開頭第 7 行）已附在本要求末段「diff」節，**不必也無法自己重算**。若 diff 看起來被截斷，在 summary 寫明，並直接讀快照裡的檔案補完。
- 你可以讀任何檔案、跑不寫檔的唯讀指令（例如 `grep`、`node -e` 讀檔）。環境是唯讀的：不要跑瀏覽器測試、不要跑會寫暫存檔的工具（例如 `tests/tools/trace-eq.mjs`）。
- 修正前的行為只能從 diff 的刪除行與靜態推論得知；iOS Safari 的實機行為也只能靜態推論。**沒辦法實際驗證的判斷，請在 finding 的 `detail` 開頭寫「（推測）」，並在對應 coverage 的 `note` 說明。**
- 本版宣稱做了什麼、驗收條件是什麼：{acceptance-files}（在快照裡）。請拿驗收條件對照實作，條件本身有漏洞也要指出。

## 必查情境（8 項都要出現在 `coverage`，各一次；沒查的 `checked:false` 並在 `note` 寫原因）
1. engine-determinism：引擎亂數流與賽局狀態不可被呈現層改動影響；新程式有沒有在引擎路徑上耗亂數、寫賽局欄位，或在 headless 模擬（沒有 window／document）時丟例外。
2. layer-contract：3D 層（`js/`）不讀寫賽局狀態，只吃 `index.html` 用 `fx3d()` 派的事件；`window.__ys3dJournal` 補播要冪等（renderer 晚到時不漏、早到時不重播）。
3. async-loading：載入、快取、去重、競態（同一格被換掉、換夜、新局、重開局）、記憶體增長、重複下載浪費流量。
4. failure-paths：網路失敗、404、逾時、解析失敗、WebGL context lost、URL 開關（`?tray3d=0`、`?table3d=0` 等）下會不會卡死、空桌、丟未捕捉例外。
5. mobile-safari：iOS Safari／Apple GPU 的差異（沒有 requestIdleCallback、記憶體較緊、背景分頁、慢網路）；製作人只用 iPhone 試玩。
6. version-and-cache：版號、版本說明、css `?v=` 快取鑰匙、測試釘選是否一致；玩家會不會拿到舊檔。
7. tests-discriminating：新增或修改的測試在修正前的程式上會不會紅、修正後會不會綠；有沒有把斷言改鬆、跳過，或用替身蓋掉決定成敗的那段。
8. scope：diff 有沒有超出驗收檔宣稱的範圍。

## 嚴重度
- CRITICAL：規則判定錯誤、會影響勝負；存檔或紀錄毀損；遊戲卡死或無法進行；結論錯誤。
- HIGH：明確的 bug，或會導致錯誤的設計決策。
- MEDIUM：影響可信度或維護性。
- LOW：風格問題。

## 每個欄位怎麼填
- `verdict`：還有任何 CRITICAL 或 HIGH ＝ `FAIL`，否則 `PASS`。
- `counts`：必須等於 `findings` 裡各嚴重度的實際筆數。
- `findings`：每筆 `id` 本輪內唯一（F1、F2…）；`title` 一句話講是什麼問題；`detail` 講為什麼是問題（推測的開頭標「（推測）」）；`failure_scenario` 寫具體的輸入／狀態／操作順序 → 出什麼錯；`file` 是快照內的相對路徑、`line` 是**快照檔案**的行號（1 起算，整檔層級填 0）；`fix_hint` 一句建議改法。沒有具體失敗情境的疑慮，嚴重度最多 MEDIUM。
- `prior_findings`：第 1 輪給空陣列 `[]`。第 2 輪起，對上一輪的每一筆 finding（見下節）各給一筆，`status` 三選一：`fixed`（真的修好）、`superficially_fixed`（表面修好：症狀消失但根因還在，或只修了其中一條路徑）、`not_fixed`（沒修到），`note` 寫判斷依據與檔案行號。

## 上一輪的 findings
{prior-findings}

## diff
{diff}
