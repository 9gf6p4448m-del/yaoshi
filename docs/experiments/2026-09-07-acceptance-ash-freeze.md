# 驗收凍結檔：對決燒毀灰燼凍結殘留（2026-09-07，v0.43.2）

基準 SHA：`ff227a7`（v0.43.1）。起因：使用者真機試玩 v0.43.1 回報「燒掉後的火花沒有消失，還出現在（下一場）對決畫面上，有個火花當機在上面」。

## 根因（唯讀調查＋親讀，非猜測）
- `js/creature-figures.js:717-727` `burn()` 把灰燼粒子 `ash.points` 掛在 `group.parent`（＝整個 scene），不是那尊自己的 `group`；`ash.update(dt)` 只在同檔 `update(dt)`（732 行）被那尊自己推進；`reset()`（762-773）與 `dispose()`（774-785）都不碰 `ash`。
- v0.43.1 的遞補上場（`js/duel-figures.js:339-344` `reinforce`）在 `burn()` resolve 的同一 tick `releaseSlot→resetFigure`，該尊被踢出 `slots[side][j]`，主迴圈（639 行 `f.update(dt)`）不再對它呼叫 update ⇒ 最後一批灰燼（`BURN.ashAt` 第 4 批在 p=0.74 噴、壽命最長 `BURST.life 1.05×1.4≈1.47s`）位置與顏色凍在半空，且 `ash.points.visible` 永遠不會被設回 false。
- v0.43 以前燒完的尊仍留在格位、每幀照常 `f.update(dt)`，灰燼自然燒完後 `update` 自己把 `points.visible=false`——所以這是 0.43.1 新引入的回歸。
- 為什麼同時是使用者的症狀 1：只有一側單位數 >MAXFIG(8) 才會有 queue、才會 `reinforce`——兩個回報是同一機制的兩面。

## 範圍
- `js/duel-figures.js`：`resetFigure` 收回的尊若有 `update`，登記到「退場寬限清單」，主迴圈每幀對清單內**未被重新占用**（`!f.__busy`）的尊繼續呼叫 `f.update(dt)`，直到 `FIG.ashGraceMs`（2000ms ≥ 灰燼最長壽命 1.47s）到期；清單條目過期即移除。`onDuel` 不清空清單（讓跨場的殘餘灰燼也燒完）。
- `js/creature-figures.js`：`dispose()` 補清 `ash`（從父節點移除、釋放 geometry／material、歸 null）。**`reset()` 不砍 `ash`**——砍了會讓燒完那一瞬的灰燼硬切，視覺退步。
- `index.html`：只動 VERSION 行（0.43.2）。文件：GAME_DESIGN changelog 一行、GUIDE §11.21 加一點。
- **不在本卷**：MAXFIG 數值、名冊排序（使用者症狀 1 的取捨題另裁）、`reinforce` 時機。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **F1 鑑別力探針 `tests/tools/ash-freeze-probe.mjs`**（D3 治具同一套袋子：四座位 11 隻 hp 全壓 1，跑到 3 次 `ys:duel-end`）：每 300ms 掃 scene 裡所有 `visible` 的 `THREE.Points`，取「未停在 PARK(-999) 的粒子數 >0 且位置陣列與上一筆逐值相同」為一次凍結命中，**且同一筆掃描裡至少有另一個 Points 有變動**（證明 render loop 活著，排除整頁暫停的假陽性）。判定：**任一 Points 連續凍結 ≥7 筆（2.1s，長過灰燼最長壽命）＝紅**。
  - 對基準 `ff227a7`（`--root=<detached worktree>`）**必紅**；對修後 **必綠**；兩次都要 `burn 數 > MAXFIG` 至少一場（遞補真的有動）與 0 console error／pageerror。
  - 什麼實作會讓它紅：只在 `reset()` 裡把 `ash.points.visible=false`（灰燼硬切，探針會綠但視覺退步——所以另加 F6）；寬限期 <1.47s（最後一批灰燼在寬限到期時仍活著、再度凍結）。
- **F2** 既有 6 套測試綠（`for f in tests/*.test.mjs; do node $f; done`）。
- **F3** `node tests/tools/duel-desync-d3.mjs` 綠（maxVisible≤MAXFIG、end visible=min(hud,MAXFIG)、burn>MAXFIG、0 error）。
- **F4** `duel-perf --uncap` 8v8 中位 fps ≥ 基準 ×0.9（基準＝同一台機器同一 session 對 `ff227a7` 跑）。
- **F5** `git diff --stat ff227a7` 只含：`js/duel-figures.js`、`js/creature-figures.js`、`index.html`（VERSION 一行）、`docs/GAME_DESIGN.md`、`docs/IMPLEMENTATION_GUIDE.md`、本檔、探針。
- **F6 灰燼不被硬切**：探針另記「每個 Points 從最後一次有變動到 `visible=false` 之間的最長連續變動筆數」——修後每一次燒毀後的灰燼都是「自然燒完」（連續變動 ≥2 筆再隱藏），不是在燒完那一瞬被設為不可見（連續變動 0～1 筆即隱藏）。什麼實作會讓它紅：`reset()` 砍 `ash`。
