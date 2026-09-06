# 驗收凍結檔：對決演出「沒兵仍出招／隻數不同步」（2026-09-07）

基準 SHA：af12d4d（v0.42.1）。起因：使用者真機回報 (a) 對方紙紮都燒光了 HUD 隻數仍 >0；(b) 對方場上 0 隻仍出現招式字幕。
調查（唯讀 agent，探針 scratchpad/duel-desync/）：(a)＝演出層每側只建 MAXFIG=8 尊，第 9 隻起無模型可燒（index.html:3177,4199；js/duel-figures.js:309,400-423），引擎存活數 24000 場 0 例不符；(b)＝引擎 pwFeed／pwPrep atkAll／rallyHp／pwHaunt lost·swap 在 pwFire 前不檢查該側是否還有存活單位（index.html:2746,2627,2616,2656），24000 場 2011 例。

## 範圍
- (a) 演出層「遞補上場」：場上同時最多 MAXFIG 尊；某尊燒掉時若該側還有未建模的存活單位，於同一格位遞補建一尊（含載入失敗退路）。不改 MAXFIG 值、不改 HUD 算法。
- (b) 引擎：上述四處在 pwFire 前加「該側尚有存活單位」檢查，沒有就不觸發（不記 trait beat、不改 hp）。**不得改任何其他判定**。
- 不在本卷：傳說三尊分支的任何內容。

## 驗收條件（動手前訂）
- D1 (b) 結果等價：對 seeds 1..2000 的預設 AI 桌（runMany 或逐場 paperWar）與調查用的例牌配對，修前／修後每一場的 winner、dmg、aliveA/B、hpA/B、burnedA/B **逐場相同**；差異只允許出現在 beats 的 kind:"trait" 筆數（修後 ≤ 修前，且至少少 1 筆——否則修了等於沒修）。任何一場結果不同＝停手回報，不得合併。
- D2 (b) 鑑別力：新增 tests/duel-desync.test.mjs——構造一側在第 2 拍前全滅的對局，斷言第 2、3 拍沒有由該側發出的 trait 事件；對 af12d4d 的舊版必紅在這條行為斷言。
- D3 (a) Playwright：用一側 ≥10 隻的袋（例：魔神仔紅帽＋林投姐髮簪＋五營旗）跑對決（duel-drive 或新治具），對決結束時該側「可見未燒的 3D 尊數」＝min(引擎存活數, MAXFIG)，HUD 隻數＝引擎存活數；0 console error；8v8 效能 duel-perf 中位 fps 不低於基準 ×0.9。
- D4 既有 5 套測試綠；trace(1..20) 與 af12d4d 的差異若存在，必須只落在 war.log／beats 的 trait 文字（用 JSON 逐欄位 diff 證明），勝負欄位相同。
- D5 VERSION 0.42.2；GAME_DESIGN changelog；GUIDE §11 一小節。
什麼實作會讓它變紅：D1—存活檢查放錯位置改到 hp 或勝負；D2—斷言寫成「事件存在」而非「該側事件不存在」；D3—遞補建模走了不同的材質／貼花路徑導致 error 或 fps 掉。
