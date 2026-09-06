# 驗收凍結檔：傳說三尊 實作卷（2026-09-06 深夜）

基準 SHA：`01cde46`（v0.42，origin/main＝線上）。規格＝`docs/proposals/2026-09-06-legend3-design.md`（使用者 2026-09-06 裁定：陰氣改有應公，其餘照案）。
起始數值（提案 §四／§八，過閘門後仍屬策略數值、改預設要問）：`LEGEND_ON`、`INC_MAX 3`、`INC_K 6`、`INC_PITY 9`、階段獎勵區間以 P 定義。

## 範圍
- 引擎：`LEGENDS` 表（3 筆，與 POOL 同形＋`legend:true`）、`TRAITS` 新 2 條（`eliteBlind`／`hauntAnswer`）＋ 2 個新效果欄位（`blindFront` 在 pwBolt 段、`curseHaunt` 在 pwHaunt 段）、大士爺 `wardGuardAll` 走既有 `hpAll:2`；燒香欄位（密封、每夜一尊、0–INC_MAX、當場扣壽命）；請神結算（開標後、結算戰前：當夜香火加進 h → 本夜有燒香者依 h 高到低擲 h/(h+K)、h≥P 必成 → 第一個成功者請走、關龕 → 其餘依 h 領階段獎勵、歸零；天亮回天結清）；AI 啟發式掛 `ROLES[*].ai`（拜主系→第二系→不拜；每夜 min(INC_MAX, floor(life×aggr/12))；life<LIFE×0.3 不拜；被領先 ≥3 棄拜）；`S.history` 多「請神」紀錄。
- UI：神龕列（三格：尊名／系色／機率表／四人香火條／請走後標示）、出價面板「燒香」列、請神成功／香火散演出（3D 用佔位：既有 elite／ward／haunt 各借一隻換系色）、規則頁「🕯️ 請神」節、局末回顧「請神」列。
- 治具：`tests/tools/legend-gate.mjs`（L0–L5）、`tests/legend.test.mjs`（單元）、runMany 新策略 `incenseMax`／`incenseNever`。
- **不在本卷**：真模型（美術卷）、任何 CFG 既有數值、共鳴機制。

## 驗收條件（動手前訂，凍結；n＝10000）
- **L0 kill switch**：`LEGEND_ON=false` 時 trace(1..20) 與基準 SHA 逐位元組相等（不消耗 rng、不多寫欄位）；ON 必不等。
- **L1 優勢策略窮舉**（GAME_DESIGN 六之四）：單夜快照，四人各選燒 0/1/2/3 到自己主系那尊（256 組合），在三個狀態（h 全 0；對手一人 h=6；自己 h=8）各算收益（請到＝＋該尊在紙紮夜戰對桌上其餘三袋的邊際勝場 × PW 均傷；沒請到＝−燒的量＋階段獎勵），**三個狀態都不存在優勢策略**（沒有任何選項對所有對手組合都嚴格不劣）。「永不燒」「每夜燒滿」都要被某個對手組合打敗。
- **L2 活性**：預設 AI 桌，至少一尊被請走的局 ≥60%；三尊各自被請走的局 ≥25%。不過先調 AI 啟發式選尊規則（可自主），再不過才動 K／P（要問）。
- **L3 有感不支配**：請到者自請到那夜起的對決勝率 ÷ 同局未請到者 ＝ 1.15～1.6；持有任一尊者最終勝率 ≤55%。
- **L4 無支配策略**：splitter／greedy／hoarder／specialist／incenseMax／incenseNever 座位 0 勝率各 ≤40%。
- **L5 節奏**：預設桌中位局長 10～12 夜（基準 MODE M1 為約 10）；破則先降 INC_MAX（使用者裁定 §八-5），降到 1 仍破再問。
- **L6**：既有 5 套測試綠；`tests/legend.test.mjs` 對舊版（基準 SHA）全紅、新版全綠且紅在行為斷言（請走／關龕／階段獎勵／天井／回天）；Playwright 一整局走到「請走」與「回天」各一次 0 console error、無橫向溢出；規則頁 fresh read-back 過。
- **L7 範圍**：`git diff --stat 基準..` 逐檔對應上面範圍；不動 27 隻、不動 CFG 既有值。

什麼實作會讓各條變紅：L0—LEGEND_ON=false 仍抽 rng 或寫 S；L1—收益算成「請到永遠正」（燒滿成優勢）或「香火全退」（永不燒成優勢）；L2—AI 只拜主系而三系分布偏；L3—傳說單位 p 12 但實打無感（<1.15）或壓倒（>1.6）；L4—incenseMax 靠獨一份衝 >40%；L5—每夜多燒 3 把局縮到 8 夜；L6—測試寫成「欄位存在」而非行為。
