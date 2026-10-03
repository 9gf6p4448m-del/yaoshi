# v0.59.8 開標先看擺錢 — 實測報告
凍結條件：[acceptance.md](acceptance.md)（d91fe144，未改）。探針：[probe.mjs](probe.mjs)。基準 7c988c95。
| # | 結果 | 證據（本資料夾） |
|---|---|---|
| 1 | 過 | new-timing.json：公告出現於 2071ms（MutationObserver）；t=389ms 時 stageLen=0、mainDis=true、chips 19（按前 2、席位 1→3）；t=2370ms 公告在 |
| 2 | 過 | new-skip.json：t=656ms 按跳過，公告 658ms 出現（延遲 2ms） |
| 3 | 過 | base-timing.json：基準公告 13ms 就在、t=439ms ann=true、cond1.pass=false（紅）；新版 cond1.pass=true |
| 4 | 過 | trace-eq.txt：equal:true（seeds 1..20，bytes 353154）；--mutate 突變驗紅 differs:true |
| 5 | 過 | node-test-new.txt：461 tests／pass 461／fail 0 |
| 6 | 過 | hotseat-def.json、hotseat-hr0.json（reachedSummary、sawAnnouncement 皆 true，errors／pageerrors 空）；timing-def.json、timing-hr0.json 亦無 error |
| 7 | 見回報 | git diff --stat |
| 8 | 過 | VERSION／RELEASE_VERSION=0.59.8；theme.css、safe-area.css ?v=0.59.8；tests/ui-hierarchy.test.mjs 斷言同步 |
實作備註：sleep 在呼叫當下才讀 SKIP，等待中按跳過不會被喚醒，故等待用 setTimeout＋PENDING（doSkip 會呼叫它）自行實作可中斷等待。
