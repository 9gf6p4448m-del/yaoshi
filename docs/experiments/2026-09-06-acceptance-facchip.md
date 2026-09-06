# 驗收凍結：隊列系色小圖示小卷（2026-09-06，v0.37）

> 動手前凍結（02 §2.1）。基準 SHA：`10d231c`（v0.36）。範圍：只改 `index.html`（CSS＋`pwArenaHTML`）＋文件；引擎不動。
> 動機：後處理卷 P-2 四輪紅、使用者簽字「陣營辨識改走 UI」；現行 `.pwchip` 顏色＝三系淺色卻按體型套（index.html:257-260），陰氣小紙人顯示祖靈棕＝誤導。

## 驗收條件（訂定當下各附「什麼實作會讓它紅」）
- **A1 顏色歸陣營**：每個 `.pwchip` 帶 `fac-<zuling|xianghuo|yinqi|none>` class，computed `background-color`（實心體型）或 `border-color`（空心體型）等於該 unit 的 `fac` 對應 `--*-light` 值；`id="pwc-<tag>-<id>"` 不變（fxBurn 靠它）。紅：任一片顏色與 `views[].units[i].fac` 不符、或 chip 數≠units 數。量法：Playwright 844×390 開 `?paperwar=1` 對決，逐片讀 computed style 與 `pwArmyView` 對照，至少 3 場（seed 固定，含一場任一側 ≥3 隊）。
- **A2 分隊徽章**：每個有 units 的隊（同一件法寶）前一枚 `.pwfac` 系字徽（祖／香／陰；`fac:null` 兜底顯示「肉」），數量＝有 units 的 teams 數。紅：徽數≠teams 數、或徽字與 `t.fac` 不符。
- **A3 體型仍可分**：色改陣營後體型靠形狀：swarm 實心 8×12／elite 實心 13×17＋金邊／ward 空心（邊框系色）8×14／haunt 實心 opacity .6＋虛線邊。紅：四種體型任兩種 computed 尺寸、border-style、opacity 全同。
- **A4 引擎等價**：`trace(1..20)` 對 `10d231c` 逐位元組相等；`grep -c "Math.random" index.html`＝0。紅：任一不相等。
- **A5 版面**：844×390 下 `#dL`/`#dR` 無橫向溢出（`scrollWidth<=clientWidth`）、`.pwchips` 高度在最壞案例（單側 ≥16 片）≤ 現行 3 行；duel-drive 預設路徑 3 場 0 console error。
- **A6 盲讀（本卷的本質驗收）**：8v8 或更多的對決截圖（只截 HUD 兩欄，不含 3D），兩位 context-free sonnet 讀者、問法逐字：「左欄隊列中，哪些小方塊屬於祖靈／香火／陰氣？各列編號（由左到右由上到下編號）。」每系召回、精確皆 ≥2/3（定義同 postfx P-2），兩位取低，三系全過。紅：任一系任一讀者 <2/3。**問法直接指向顏色與徽字是設計如此（UI 的目的就是被讀出），不是降標。**
- **A7 送達**：VERSION 0.37＋VERSION_NOTE；`git log origin/main -1`＝新 SHA；線上 curl `VERSION="0.37"`。

## 使用者待簽（三題，見對話）
- 09-06 使用者裁定（AskUserQuestion 三題）：①甲（牌改陣營色＋每隊一枚系字徽）②形狀＋尺寸 ③不加圖例、規則頁補一句。全「照建議」。

## 實測結果（2026-09-06，同機；證據 `facchip-evidence/`）
- **A4 ✅** `trace(1..20)` 對 `10d231c` 逐位元組相等（340463 bytes 兩邊同）；`grep -c Math.random`＝0。CSS 二次修改（filter）後重跑仍相等。
- **A1 ✅／A2 ✅** `facchip-probe.mjs --duels=12 --seed=7`：12 場真對局、每片 computed 色對照「治具自己從 `S.players[].bag` 推的期望序列」全對、id 不變、片數＝隻數；徽數＝隊數、徽字＝系名首字、徽後緊接該隊第一片（`probe-summary.json`）。真對局最大隊列 17 vs 13（第 10 場）、單側最多 19 片 8 隊（第 11 場，`real-duel11-B.png`）。
- **A3 ✅** 四體型 computed 簽名相異：swarm 8×12 實心／elite 13×17／ward 8×14 底透明（邊框系色）／haunt 8×12 虛線邊＋`filter:opacity(0.6)`。**第一輪發現**：haunt 的 `opacity:.6` computed＝1——`pwRise` 的 WAAPI `fill:both` 把 opacity 釘住，CSS opacity 永遠被蓋（舊 `.burnt{opacity:.1}` 同樣被蓋、燒掉的片只剩灰階）；改走 `filter:opacity()`，`.burnt` 一併改 `filter:grayscale(1) opacity(.15)`。
- **A5 ✅** 12 場 `#dL/#dR` 無橫向溢出、`#duel` 390/390 無捲動；最壞合成單側 20 片 5 隊＝2 行、高 27px；真對局 19 片 8 徽＝2 行、高 34px（≤3 行）。第一輪探針把徽章（align-self:center）的 y 混進行數把一行數成兩行（報 4 行），已改只數 chip。`duel-drive` 預設路徑 3 場 0 error（`duel-drive-3.json`）；同 seed=11 對照 `10d231c` 基準：`burn 4／burnFig 2／burnDom 2` 兩邊相同（隨機 seed 那次 burnFig 0 是 seed 差異，非退化）。
- **A6**：合成名冊（同 P-2 faction-sheet 做法，真對局袋子湊不到 8v8）A＝弓1／盾2／舟3／劍1／五營旗3／紅帽4＝14 片 6 隊、B＝令旗2／虎爺1／祖靈眼2／雷女1／髮簪4／指甲1／飼鬼甕2＝13 片 7 隊；`facchip-sheet.mjs` 換 arena 後**等 1.4s 進場動畫跑完**再 hitstop（第一版沒等，標籤與凍住的欄位錯位）。編號疊在每片上方（細化：讀者不必自己數），問法「每個編號的小方塊分別屬於哪個陣營」，不給顏色提示。結果見下。
- **A6 ✅** 兩位 context-free sonnet 讀者（只給兩張圖與題目、不給顏色提示）：A 圖答 祖靈{1–6}／香火{7–10}／陰氣{11–14}、B 圖答 香火{1–3}／祖靈{4–6}／陰氣{7–13}，兩位完全相同、與 `sheet-key.json` 逐片相符 → 三系召回 1.0／精確 1.0（門檻 2/3）。讀者自述依據：「小方塊前方最近的祖／香／陰圓形標記」＋「換行後依延續的底色歸類」——徽章與系色兩條線索都被讀到，且加總對得上「14 隻／13 隻」。
- **A7**：見 commit／push 紀錄（下）。

## 附帶發現（不在本卷範圍，記在這裡）
- 規則頁「⚔ 結算戰」前半仍是舊的「比戰力扣血」口徑，紙紮夜戰預設開後未改（文件債）。
- `.pwbody` 體型組成字串在四體型＋詛咒時比欄寬（190px）寬，置中溢出兩側（v0.36 既有，未動）。
