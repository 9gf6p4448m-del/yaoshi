# 驗收凍結檔：對決陣列「MAXFIG 8→10 ＋ 名冊依拍序排」（2026-09-07，v0.43.3）

基準 SHA：`ef24d07`（v0.43.2）。起因：使用者真機試玩回報「標到的寶物沒顯示在陣列上」；調查＝3D 只擺前 `PW_FX.MAXFIG`(8) 尊、順序＝取得順序（`buildArmy` 走 bag push 順序），第 9 隻起排隊等燒毀遞補。使用者裁定**甲＋乙**：甲 MAXFIG 8→10（`FIG.maxFigures` 上限 10）；乙 名冊依拍序（`BEAT_FAC`＝祖靈→香火→陰氣，無系肉身殿後）排，組內維持取得順序。

## 範圍
- `index.html`：`PW_FX.MAXFIG` 8→10（3482 行）；`pwArmyView`（4353 行）在指派 `u.id` **之後**做穩定排序（rank＝`BEAT_FAC.indexOf(fac)`，無系＝末位；同 rank 依 `id`）。**`id` 不重排**——beats 的 actor／target 是 `pwSide` 的單位索引，DOM 晶片 `pwc-${tag}-${id}` 與 3D `figureOf(side,id)` 都靠它對位。
- 不動：引擎（`buildArmy`／`pwSide`／`paperWar`）、`duel-figures.js` 站位規劃、遞補邏輯、DOM 隻數牌算法。
- 新增：`tests/lineup-order.test.mjs`（G1）、`tests/tools/lineup-shot.mjs`（G6 截圖）。文件：GAME_DESIGN changelog、GUIDE §11.21 加點。VERSION 0.43.3。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **G1 排序鑑別力**（`tests/lineup-order.test.mjs`，可帶 `--html=<檔>`）：袋子依「陰氣件、香火件、祖靈件、無系兜底」順序放入 → `pwArmyView(p).units` 的 fac 序列為 祖靈…→香火…→陰氣…→null…；每個 unit 的 `id` 指回 `buildArmy(bag).teams` 展開後同索引的單位（body／fac／ab 逐項相同）；同 fac 內 `id` 遞增（穩定）。**對 `ef24d07` 必紅在「fac 序列」這條行為斷言**（舊版順序＝取得順序＝陰氣在前）。
- **G2 引擎等價**：`trace(1..20)` 與 `ef24d07` 逐位元組相等（`tests/tools/a1.mjs` 或等價做法；MAXFIG 與 view 排序都不在引擎路徑）。
- **G3 D3 治具（cap 10）**：`node tests/tools/duel-desync-d3.mjs` 綠——maxVisible ≤ 10、對決結束 visible＝min(HUD,10)、0 error。
- **G4 灰燼探針**：`node tests/tools/ash-freeze-probe.mjs` 綠（0 凍結、0 硬切、0 error）。
- **G5 效能（甲）**：`node tests/tools/duel-perf.mjs perf <out> --n=10 --uncap` 10v10 桌機中位 fps **≥ 60**；同時記 8v8（0.43.2 量到 97.1）做對照。**手機 fps 無法在此量，由使用者試玩定；低於可接受就退回 8**（退回是使用者裁，不在本卷自行決定）。什麼實作會讓它紅：站位規劃對 n=10 找不到塞得下的排法而每幀重搜（fps 掉）。
- **G6 版面**：`tests/tools/lineup-shot.mjs` 在 844×390 對一側 ≥10 隻的對決截圖（開場列陣後約 2.5s），我親眼看：十尊都在畫面內、不疊成一牆、隻數牌與 3D 尊數對得上；DOM 晶片列（`.pwchips`）依 祖靈→香火→陰氣 的系色分組。
- **G7 範圍**：`git diff --stat ef24d07` 只含 `index.html`、`tests/lineup-order.test.mjs`、`tests/tools/lineup-shot.mjs`、`docs/GAME_DESIGN.md`、`docs/IMPLEMENTATION_GUIDE.md`、本檔；6 套既有測試綠。

## §2.1 修訂紀錄（動手後，加嚴／必要修正，不提高通過機率）
- **G7 範圍加 `js/duel-figures.js`、`tests/tools/duel-desync-d3.mjs`**：原標準錯在假設 `FIG.maxFigures: 10` 這條保險絲代表站位規劃器支援 10 尊；實跑 G3 才知道 `search()` 的起始排數 `ceil(n/perRow)`=5 超過 `rowsMax` 4，迴圈一次不跑、回 null，主迴圈每幀 `plan.rows` 炸（page error），連帶 G4 灰燼凍結。修正＝起始排數夾在 rowsMax 內＋回 null 的真保險絲；這是甲的必要修正，不動任何門檻。
- **D3 治具讀 cap 的方式**：`window.PW_FX` 是 const、不在 window 上，D3 以前恆讀到 null、判定一律用 8 猜（0.43.1／0.43.2 時碰巧等於真值）。改讀 `window.__yaoshi.PW_FX.MAXFIG`（index.html 匯出）。這讓判定對到真 cap（10），不是放寬：G3 凍結的就是「≤10」與「=min(HUD,10)」。
