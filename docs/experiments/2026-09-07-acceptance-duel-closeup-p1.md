# 驗收凍結檔：對決「近景切鏡」卷 批 1 原型（2026-09-07）

基準 SHA：`4051dd1`（v0.43.3＋治具小修）。規格＝`docs/proposals/2026-09-07-duel-closeup.md` §二（五件）。批 1 是**原型**：做完給使用者看截圖／連拍，他點頭才開批 2。VERSION 0.45（N1/N7 卷佔 0.44；合併順序由主對話處理）。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **P0 退路等價（雙向）**：`CLOSEUP_ON=false`（或 `?closeup=0`）下，`?fxcount=1&seed=N` 對 seeds 1..3 各跑一局，`FXC` 的 `burn/burnFig/trait/traitFig/beat/duels/fights[]` 與基準 `4051dd1` 逐欄相同，且不派任何 `ys:fx-focus`、DOM 不出現 `.dmgfloat`／`#beatLamps`／`.pwgauge`／`#actorCard`；`CLOSEUP_ON=true` 下 `FXC.focus>0`。引擎 `trace(1..20)` 與基準逐位元組相等（純演出卷）。什麼實作會讓它紅：HUD 元素在關閉時仍渲染；focus 事件在關閉時仍派。
- **P1 事件規則**（`?fxcount=1` 的 `FXC.fights[]` 每場記 `focus[]`：`{beat,kind,actor,target,ms}`）：每拍 focus 數 ≤ `FOCUS_PER_BEAT`；每個 focus 的觸發筆是「該拍第一筆 amount≥FOCUS_DMG 的 hit」或 burn；跑 seeds 1..6 共 ≥6 場，至少 3 場有 hit-focus、至少 2 場有 burn-focus（活性）。
- **P2 鏡頭曲線**（`tests/tools/cam-drive.mjs` 或同型治具逐幀錄 `camera.position`）：每個 focus 期間 `dist` 從 4.2 降到 ≤ `FOCUS_DIST+0.15` 並在 ms 內回到 4.2±0.05；focus 期間 dist 單調（進→停→回，不抖）；`doSkip()` 後 300ms 內回 4.2±0.05。什麼實作會讓它紅：focus 與 ORBIT 疊加造成 dist 抖動；cancel 沒接。
- **P3 退暗**：focus 期間對 `figuresOf` 兩側逐尊讀材質 opacity（`setFigureOpacity` 同一套 traverse 規則，跳過 AdditiveBlending 層）：非 actor／target 且未燒毀的尊 ≤ `FOCUS_DIM+0.05`，actor／target ≥0.95；回全景 300ms 後所有未燒毀尊回到原值（haunt＝`hauntOpacity`、其餘 1.0）±0.02；**燒毀中的尊不受退暗／復原影響**（opacity 仍沿燒毀曲線遞減）。
- **P4 跳字**：每筆 hit 類事件產生一個 `.dmgfloat`，文字＝`−amount`（killed 加 `.kill`）；同一拍 DOM 內同時存在的 `.dmgfloat` ≤ `MAX_HITS`；`DMG_MS+100` 後移除；`doSkip()` 後 0 個殘留；位置：與 target 尊投影點距離 ≤ 80px（3D 尊在場時），或落在該側隻數牌 60px 內（退路）。
- **P5 HUD**：一拍時 `#beatLamps .on` 數＝1、二拍 2、三拍 3，當前拍那顆有 `.cur`；`.pwgauge` 寬度％＝`round(存活/總×100)`，每次 `pwBurnOne` 後同步（誤差 ≤1%）；`#actorCard` 同時 ≤1 張、文字含該法寶 `n`，`ACTOR_CARD_MS+100` 後消失。
- **P6 效能**：`duel-perf.mjs perf --n=10 --uncap` 中位 fps ≥ 基準（同機同 session 對 `4051dd1` 跑）×0.9；`--n=8` 同。
- **P7 Playwright 冒煙**：`duel-drive.mjs --duels=6` 0 console error／pageerror／requestfailed；`?closeup=0` 再跑 6 場 0 error。
- **P8 截圖給使用者**：844×390 一場對決連拍 ≥8 張（全景列陣→第一次 focus 進→停格瞬間（含跳字）→回全景→burn 跟拍→拍末），另 390×844 直式 2 張（HUD 不溢出、`.pwgauge`／`#beatLamps` 可見）；用 Python PIL 拼成一張 contact sheet PNG 放 `docs/experiments/2026-09-07-closeup-p1-evidence/`。
- **P9 範圍**：`git diff --stat 4051dd1` 只含 `index.html`（pwPlayBeat 派事件、HUD DOM／CSS、跳字、PW_FX 旗標、VERSION）、`js/camera-director.js`（FOCUS 層）、`js/duel-figures.js`（focusState 退暗）、新治具、`docs/GAME_DESIGN.md` changelog 一行、`docs/IMPLEMENTATION_GUIDE.md` 新一節、本檔、證據目錄；既有 6 套測試＋`lineup-order`／`duel-desync` 綠；`ash-freeze-probe.mjs` 綠。

什麼實作會讓 P0 紅：把 HUD 直接寫進 `pwArenaHTML` 而不看旗標。什麼實作會讓 P3 紅：一次性 `setFigureOpacity` 被主迴圈每幀蓋掉、或把燒毀中的尊復原成 1。

## §2.1 修訂紀錄（2026-09-07，實作後）

凍結檔一經訂定即凍結（`~/docs/harness/02-dispatch-rules.md` §2.1）。本節是**唯一一筆**修訂，程序照該節：
先寫明原標準錯在哪、為什麼現在才知道，再取得使用者對這一條的明確同意。

- **改的是哪一條**：P8 的「另 390×844 直式 2 張（HUD 不溢出、`.pwgauge`／`#beatLamps` 可見）」。
- **原標準錯在哪**：它假設「對決在直式手機上看得到」。實際上產品在 `orientation:portrait` 會蓋一整片
  `#rotateHint`「請把手機轉橫進入妖市」（`index.html:39`／`:454`，v0.x 就有的設計），連點擊都擋掉——
  直式根本沒有對決畫面可拍，這一條在任何實作下都不可能通過（不是實作沒做到）。
- **為什麼現在才知道**：訂條件時只從「手機玩家、直式」推，沒有回頭查產品現行的直式行為；
  實跑 Playwright 拍直式那一輪被 `#rotateHint` 擋住點擊、逾時失敗，才碰到。
- **改成什麼**：直式兩張改為「把 `#rotateHint` 蓋板停用後拍」，只驗一件事——**HUD 在 390 寬的窄畫面
  會不會溢出**（`#duel` 的 `scrollHeight ≤ clientHeight`）。這兩張**不是玩家會看到的畫面**，
  檔名與 `shots-portrait.json` 的 note 都要標明。橫式那 ≥8 張不受影響，門檻一字未動。
- **同意**：2026-09-07 使用者裁**甲＝接受這個口徑**（由主對話轉述；沿革：實作方在一版報告 §3 第 1 點
  列了甲／乙／丙三個選項請裁）。乙（批 2 讓對決支援直式）留給後續卷，不在本卷範圍。
