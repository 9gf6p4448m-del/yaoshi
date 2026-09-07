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

## §2.1 修訂紀錄（2026-09-07，合併前）
- **D4 字面未滿足、經使用者同意接受**：分支 `1c09d92` 的探針（`tests/tools/duel-desync-d4trace.mjs`）證明 `trace(1..20)` 自 seed 5 第 3 夜起的非 trait 差異，全部源自 `pwHaunt` 的 `swap` 一處存活檢查——修前「施法方已全滅仍抓交替、燒掉對面一隻」是隱藏數值效果，修後消失，並經 `pwTrial`（同一支 `paperWar`）外溢到 AI 估值。原標準錯在哪：D4 假設四處檢查只影響字幕，沒料到 `swap` 本身帶數值效果；為什麼現在才知道：D1 用例牌配對逐場比對看不到跨夜連鎖，整局 trace 才浮現。使用者裁定**甲＝死掉一方不能再抓交替**（乙＝保留舊行為、丙＝改機制皆未採）。
- **合併條件（加嚴，不降標）**：① D1 對基準改為 `84a6432`（v0.43，含 LEGEND_ON=false 的傳說碼）重跑一次逐場等價（trait 筆數只減不增）；② 共鳴閘門 `resonance-gate.mjs` R2′／R3 n=10000 在合併後的 index.html 重跑，門檻不動（R2′ +5～+15pp 且 100% 配對 ≤ 基準×1.5；R3 座位 0 各 ≤40%）；③ 既有 6 套測試綠；④ D5 版本改 0.43.1。
