# 對決招式字幕「法寶：undefined」修復——驗收條件凍結檔

- 日期：2026-10-10；基準：`c1a4d167`（線上 v0.65.1）；分支 `fix/duel-undefined-caption`
- 本檔在動手改 `index.html` 之前 commit；之後依 `02 §2.1` 凍結，任何讓通過機率上升的改動須先經使用者同意。
- 已知根因（診斷已完成）：
  1. `pwPrep` 長明渡幽分支 `pwFire(env,{name:"長明渡幽"},…)` 沒有 id → trait 拍無 `trId` → 字幕組字 `TRAIT_ITEM[undefined]||"法寶"`、`mv=…||b.trId` → 「法寶：undefined」。
  2. 水陸偷渡的「怒濤破浪」`pwFire(env,(st&&st.tr)||{name:"怒濤破浪"},…)`：被濺射那隊的招沒有 halfSplash 時，把該隊自己的招（如 hauntSwap）報成這次的觸發；該隊沒招時又是無 id。
- 版號不動（0.65.2 由主 session 合併時統一升）；不 push、不動 main。

| # | 條件 | 量法 | 什麼實作會讓它變紅 |
|---|------|------|--------------------|
| C1 | 新測試 (a)「長明渡幽字幕」：A、B 袋子皆 `[fushou,sigui]`，固定 seed 跑 `paperWar`；先斷言活性（log 出現「長明渡幽：」且至少一筆對應 trait 拍），再斷言每筆 trait 拍都有 trId、每筆 trait 字幕（走 index.html 匯出的真實組字函式）不含 `undefined`，且長明渡幽那筆字幕含「長明渡幽」或「全隊回血」。對 `c1a4d167` 紅在行為斷言（非例外），對修復後綠 | `node --test tests/duel-undefined-caption.test.mjs` 分別在修復前（c1a4d167 與「只抽出組字函式」的等價重構 commit）與修復後各跑一次，貼輸出 | 5298 不補 id；或字幕組字仍以 `b.trId` 當兜底／不認得連鎖招 id（字幕變「法寶：chainRegenAll」不含長明渡幽／全隊回血）；或測試在 fixture 下根本沒觸發長明渡幽（活性斷言紅） |
| C2 | 新測試 (b)「怒濤破浪標示」：B 袋子 `[boat,buoy]`、A 帶精英；每一筆 A 對 B 的 `splash` 事件，緊接其前那筆 B 側 trait 拍的 trId 必須是 `chainHalfSplash` 或本身 `halfSplash:true` 的招（飛魚躍）；且至少一筆為 `chainHalfSplash`（活性）。對 `c1a4d167` 紅在行為斷言，修復後綠 | 同 C1 | 5521 仍回傳 `st.tr`（把 hauntSwap 等報成怒濤破浪）；或改成無 id 物件；或 fixture 沒有濺射事件 |
| C3 | 真實頁面：所有玩家袋子塞 `fushou,sigui` 走 `startBattle()`，收集 `#duel`／`#duelMove` 所有文字，含 `undefined` 的條數＝0，且有長明渡幽字幕出現（活性）；`boat,buoy` 同樣跑一次 undefined＝0 | `node scratchpad/undef/browser.mjs <樹> <port> fushou,sigui`（與 `boat,buoy`） | 頁面實際走的組字路徑沒改到（例如只改了匯出函式、播放處仍用舊公式）；或另有路徑吐 undefined |
| C4 | 隨機袋子 20000 場 sweep：以匯出的真實組字函式組每筆 trait 字幕＋log＋詛咒字幕＋單位名，含 `undefined` 的＝0 | `node scratchpad/undefcap/sweep2.mjs <index.html>`，貼輸出 | 任何其他 pwFire 呼叫點仍傳無 id 物件；或組字對未知 id 仍回 undefined |
| C5 | 全套測試（排除 sfx-wiring）失敗集合與基準相同：基準＝c1a4d167 同指令跑出的失敗集合（預期只有 nightwalk #1），新增兩檔全綠 | `node --test $(ls tests/*.test.mjs | grep -v sfx-wiring)`，修復前後各跑一次，比對 `not ok` 清單 | 修法動到引擎判定（hp／亂數）或改壞其他測試 |
| C6 | `node tests/tools/trace-eq.mjs <c1a4d167 的 index.html> <修復後 index.html>` 相等（勝負與扣血逐位元組不變）。若不等不得改基準，回報主 session | 實跑貼輸出；另跑 `--mutate` 證明腳本抓得到差異 | 修法改了亂數消耗或戰鬥判定 |
| C7 | `git diff --stat c1a4d167..` 只含：本檔、新測試檔、`index.html`；index.html 每個 hunk 都能對應到根因 1／2 或組字抽函式／匯出 | 貼 diff --stat 與逐檔一句 | 順手改了無關行、動了版號 |
| C8 | fresh opus 反駁式覆審，逐條三態（真的修好／表面修好／沒修到），最多 3 輪；另掃對戰字幕與 log 其他可能吐 undefined 的路徑（含真命招式） | 覆審報告落檔、結論貼回 | 覆審判任一條「表面修好／沒修到」且未處理 |
| C9 | commit 在 `fix/duel-undefined-caption`，未 push | `git log --oneline c1a4d167..`、`git branch -r --contains HEAD` 為空 | push 了或 commit 在別的分支 |
