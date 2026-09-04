# 驗收條件凍結 — 《紙紮夜戰》卷 C1：三拍時間軸演出底座＋順手修（2026-09-04）
基準 SHA：`d5da9be`（v0.30，卷 D 已併入，`PAPERWAR_ON` 預設 false）。
使用者裁定（2026-09-04）：剪影美術＝27 張 SVG（卷 C2，先出風格樣張再量產）；招式演出＝27 套各自不同（卷 C3）；
開關＝URL 參數真機試玩後再裁定開預設；順手修①js/ 快取破除 ②ON 時開場改「隻數與體型」兩項都做。
C1 只做「底座」：三拍時間軸、通用 kind 演出、燒毀、順手修。一經訂定即凍結。

## 範圍
C1-1 **引擎補 trait 事件**：`pwFire` 觸發時另記一筆 beats `{beat, side, actor, target:null, kind:"trait", amount:0, killed:false, trId}`
      （加欄位不動判定：ON 勝率矩陣前後相同、OFF trace 逐位元組相等）。
C1-2 **`playDuel` ON 分支**（`f.war` 存在時走新時間軸；OFF 走原時間軸一字不動）：
      a. 開場：兩邊袋子依體型列陣（群體＝N 個小紙人、精英＝1 尊大紙偶、作祟＝飄浮半透明影），顯示隻數，不顯示舊戰力數字。
         人形暫用批 1 現有多層貼片工廠，但 `createDuelFigures` 要能每邊擺 1..N 個 figure（換皮工廠介面 `{group,shadow,setPortrait,setCloth,setRim,ready}` 不變，C2 接 SVG）。
      b. 三拍逐拍：拍首字幕（一拍・撞／二拍・護／三拍・祟＋該拍月相 hp+1 文字），依 `beats` 逐筆演：
         `hit/thorn/bite/bolt/openShot` → 通用 impact＋lunge＋sfx，按 kind 給不同力道與三系顏色；
         `trait` → 字幕「法寶名：招名」＋通用 flash/impact，並留 `TRAIT_FX[trId]` 掛鉤表（預設 fallback，C3 逐件填）；
         `burn` → `fxBurn` 真燒（批 1 唯一沒在真實流程跑過的積木）＋灰燼上飄。
      c. 結尾：「燒掉 x 隻 → −dmg 壽命」，扣血數字＝`f.dmg`。
C1-3 **時長**：SKIP=false 每場 4–8 秒（以 `CFG.T=650` 為基準，新常數集中一處並標【試玩必調】）；SKIP 快轉 ≤0.5 秒且仍呼叫所有 fx 計數器（可零時長）。
C1-4 **URL 參數**：`?paperwar=1` → 該次載入 `CFG.PAPERWAR_ON=true`；`?paperwar=0` 強制 false；不寫 localStorage；首頁版本字串旁標「紙紮夜戰：開／關」。
C1-5 **順手修快取破除**：`js/renderer.js` 入口與 `js/` 內部所有相對 import 都帶 `?v=VERSION`（做法自選，無 build step）。
C1-6 **ON 時開場隻數與體型**（即 C1-2a）；OFF 開場仍是舊戰力數字跳動。
C1-7 `VERSION` 0.30→0.31。

## 驗收（貼指令原文＋輸出；Playwright 一律 844×390）
C-A0 OFF 等價：`trace(1..20)` 與 `d5da9be` 逐位元組相等；OFF 一局的對決 3D 事件序（`ys:duel`／`ys:fx-*`／`ys:duel-end`）與基準錄的相同（先在 `d5da9be` 錄一份）。
C-A1 ON 加欄位不動判定：`duelBags` 勝率矩陣（用 `paperwar-gate-D.mjs` 既有 D-A1 配對即可）C1 前後逐值相同；`D-A0` 仍過。
C-A2 ON Playwright `?paperwar=1`：跑完整局（含至少一次淘汰）console 0 error；每場 `burn` 事件數＝`fxBurn` 呼叫數＝`war.burnedA+burnedB`；`trait` 事件數＝招式字幕出現數（用 `window.__ysFxCount` 之類計數器，只在測試模式掛）。
C-A3 時長：ON 連量 10 場，SKIP=false 全部落在 4–8 秒；SKIP 全部 ≤0.5 秒。
C-A4 效能：ON 對決期間 rAF 中位數 ≥50 fps（Playwright 桌機，量測位置寫明）、粒子同時存活 ≤400；對照批 1 J4 的數字不退步超過 20%。
C-A5 快取破除：貼出 `index.html` 與 `js/*.js` 中所有本地 script/import 清單，逐條帶 `?v=`；Playwright network 列表出現 `js/*.js?v=0.31`；`html.ys3d` 有掛上（3D 正常載入）。
C-A6 URL 參數：`?paperwar=1` 後 `CFG.PAPERWAR_ON===true`，不帶參數重載 → false；`localStorage` 無新增 key（前後 key 清單相同）。
C-A7 五套測試 8/5/16/28/36 全綠；`Math.random` 0；OFF 牌桌畫面截圖與基準無差（批 1 J7 口徑）。
C-A8 活性：ON 一局內 `fxBurn` ≥1 次；`trait` 字幕至少 5 種不同 `trId` 出現（貼清單）；SKIP=false 時三拍字幕各至少出現 1 次。

## 不得做
不改引擎判定（只准加 beats 記錄）、不改 CFG 既有數值（新增常數可）、不畫 27 張 SVG（C2）、不做 27 套招式動畫（C3，只留掛鉤表）、
不開 `PAPERWAR_ON` 預設、不改既有測試斷言、不 commit 不 push。
