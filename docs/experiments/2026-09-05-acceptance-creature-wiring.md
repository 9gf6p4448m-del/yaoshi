# 驗收條件凍結 — 《紙紮夜戰》接線卷：27 隻真 3D 妖接進正式對決（2026-09-05）
基準 SHA：`add71c4`（main，27/27 模型齊）。使用者 09-05 裁定順序：接線卷 → C3 招式 → 真機試玩 → 後處理卷 → 第 4 卷。
主對話（Fable 5.1）裁定本卷範圍與判準；一經訂定即凍結（`02 §2.1`），要改只能走使用者明確同意。

## 事實依據（動手前量到的）
- `js/duel-figures.js` 的工廠介面：`{group, shadow, setPortrait, setCloth, setRim, ready}` ＋可選 `parts / burn`；工廠呼叫 `factory()` **無參數**、池位 `pool[side][j]` 不分種類；`ys:duel` 的 `armies[i].units[j]` 只帶 `{id, body, fac}`，**沒有 `ab`**（哪隻妖）。
- `js/creature-figures.js` 的 `makeCreatureFigure({glbUrl, faction})` 已有 `play / burn / update / bounds / setFactionFx / reset`；`ghost_*` 半透明、`glow_*` 自發光皆在工廠內成立。
- 27 隻 GLB 尺寸（`scratchpad/glb-bounds.mjs` 讀 accessor min/max）：高 1.0–1.33（tiger_c 1.00、boat 0.79、flag 1.10、hairpin 1.05 起浮 0.12）；深 ≤1.92（tiger 舊檔）、1.81（tiger_c）；`min.y` −0.09（nail）～+0.12（hairpin）。三角 2.2k–7.9k、檔 282KB–1.36MB；全部含 idle/move/attack。
- `POOL` 的 `ab:"tiger"` 對應正式模型 **`tiger_c.glb`**（量產模板；`tiger.glb`／`tiger_a`／`tiger_b` 為試作與 look-dev 遺留）。空袋「肉身」單位無 `ab`（`buildArmy` 退路 team `fac:null`）。
- 模型正面朝 **+Z**（pilot 報告 §⑥：`rotation.y=-0.55` 為 3/4 側前方）。對決相機 `DUEL_SHOT dist 4.2 / tilt 24 / lookY 0.35`，yaw 隨座位。
- 部署＝GitHub Pages 直接吃 `origin/main`（無 gh-pages 分支）；使用者靠首頁 `VERSION` 那行判斷有沒有推上線。

## 範圍（W-1～W-8）
W-1 **名冊帶 `ab`**：`buildArmy` 的 team 加 `ab`（純資料欄位，unit 列不動）；`pwArmyView` 與 `duelDetail.armies[].units[]` 帶 `ab`（無法寶＝`null`）。
W-2 **工廠帶單位**：`createDuelFigures` 的 `factory(unit)` 收 `{id, body, fac, ab}`；池改成「按 `figureKey(unit)`（預設 `ab`）分池、每場重新配位」，同 ab 多實例共用 `glbCache`。無 `ab` 的單位退回批 1 `makeLayeredFigure`（肉身＝玩家本人頭像，語意正確）。
W-3 **每幀接線**：對決中每尊 3D 妖 `update(dt)`（含燒毀中的那一尊）；進場 `play('idle')`；`ys:fx-lunge` 勝方 `play('attack')`、`lungeMs` 後回 idle；`burn()` 走既有 `ys:fx-burn` 自訂路徑；下一場前 `reset()`。
W-4 **bbox 正規化**（`creature-figures.js` 載入時）：高 >1.2 者縮到 1.2（**只縮不放**，tiger_c 矮胖是體型不是錯）；`min.y<0` 者抬到 0（不改 >0 的飄浮設計）。dissolve 的 `uBurnY` 仍用原始本地座標。
W-5 **朝向與體型**：3D 妖面向對手（左 `az+π/2−turn`、右 `az−π/2+turn`，turn≈35° 讓臉朝鏡頭）；`bodyScale` 沿用；haunt 不再套 `setFigureOpacity`（半透明由 `ghost_*` 材質負責）、`hauntFloat` 對 3D 降半；3D 邊光倍率 `setRim(1+1.6·kick)`。
W-6 **戲台燈**：`renderer.js` 掛 `createFigureLightRig({scale:1.7})` 於桌心、只在對決可見、每幀 `rotation.y=az` 跟相機轉；每尊 3D 妖 `attachFactionFx(fac)`。
W-7 **載入條**：`ys:duel` 派送後 3D 端把本場所有 GLB 的 `Promise.all` 放回 `detail.ready`、進度以 `ys:duel-loading {loaded,total}` 事件回報；`playDuel` 有 `ready` 就 `await`（上限 `PW_FX.LOAD_MAX_MS=12000`，逾時照演、妖晚到晚現身），`#duelLoad` 條只在 >150ms 未完成時出現；3D 未載入時整段是空操作。
W-8 **buoy 腳下水面 VFX**（使用者 09-05 裁定甲）：`creature-figures.js` 內建 `CREATURE_GROUND={buoy:'water'}` → 半透明水面圓盤＋2–3 圈擴散漣漪（≤3 draw call），掛 `figure.group` 腳下、隨 `update(dt)` 推進、burn 時一起淡出。其他隻不掛。
另：`VERSION` → `0.32`＋`VERSION_NOTE` 改為接線卷；C3 招式、後處理、傳說 3 隻**不在本卷**。

## 驗收（貼指令原文＋輸出；Playwright 844×390、本機 http.server）
W-A0 **真實路徑**：`node tests/tools/duel-drive.mjs "http://127.0.0.1:<port>/index.html?paperwar=1&fxcount=1" <out.json> --duels=4` 自動打到 ≥4 場對決：console／pageerror／requestfailed **0**；`__ysFxCount.burnFig ≥ 1`；**每場**攔到的 `ys:duel` `armies[*].units[*]` 都有 `ab` 欄位（值 ∈ POOL 的 ab 或 null），且 `burnFig+burnDom === burn`。
W-A1 **鑑別力（W-A0 的反面）**：同一支驅動腳本在 `git worktree add --detach <path> add71c4` 的基準上跑，`burnFig === 0` 且 units 無 `ab`（證明訊號來自本卷改動）。
W-A2 **正規化**：治具 `tests/tools/creature-preview.html` 逐隻（27 隻）載完後 `bounds()`：`max.y−min.y ≤ 1.2+1e-3` 且 `min.y ≥ −1e-3`；貼 27 列數字。
W-A3 **每幀／播放**：真實路徑對決中 `figuresOf('A')`／`('B')` 的 3D 妖 `animTime()` 兩次取樣（相隔 ≥300ms）嚴格遞增；`ys:fx-lunge` 後 ≤50ms 勝方 `current()==='attack'`、`lungeMs+100ms` 後回 `'idle'`。
W-A4 **燒毀**：真實路徑上每個 `ys:fx-burn` 的 `detail.handled===true`（3D 妖）→ 其 `done` resolve 後該尊 `group.visible===false`；燒毀計數與 C1 口徑一致（`burn===burnFig+burnDom`）。
W-A5 **載入條**：首次對決 `ys:duel-loading` 事件序列 `total>0`、最後一筆 `loaded===total`；`#duelBeat` 首次非空的時間戳 ≥ `detail.ready` resolve 的時間戳（三拍在載完後才開始）；第二場同組 ab 時 `loaded===total` 於首個事件即成立（快取命中）。逾時分支用 `LOAD_MAX_MS=1` 實測：對決照常完成、0 error。
W-A6 **退化**：`?paperwar=0`（OFF）→ `figuresOf('A')[0].skin!=='creature'`、對決完成、0 error；`route.abort('js/renderer.js')`（3D 不載）→ 對決 DOM 版完成、`burnDom ≥ 1`、0 error。
W-A7 **效能**：合成 `ys:duel`（真實頁面、真實模組）8v8、選最重 8 隻（fushou／ashcharm／wangchuan／boartusk／balen／shanshen／yinyangcoin／boat）：桌機 rAF 中位數 **≥50fps**（量測位置＝`renderer.js` 的 `frame()` 間隔，寫明 GPU 名）；`renderer.info.render.calls` 貼出；本場 GLB 總量 ≤10MB。真機 iPhone fps 為使用者側記錄項（≥50 目標、<40 才砍）。
W-A8 **buoy 水面**：`figureOf` 取 buoy 時 `groundFx()==='water'`、其他 26 隻 `null`；截圖 `docs/experiments/2026-09-05-wiring-buoy-water.png` 由 **1 位 context-free 讀者**盲讀「這隻腳下是什麼」須含「水／水面／漣漪／池」任一（補讀浮標特徵為記錄項，不設門檻——凍結檔 09-05 段的補讀另排）。
W-A9 **截圖三張**（記錄項，主對話親眼看）：`2026-09-05-wiring-duel-{lineup,attack,burn}.png`（真實對決三時點）。
W-A10 **範圍**：`git diff --stat add71c4..` 只含 `index.html`、`js/duel-figures.js`、`js/creature-figures.js`、`js/renderer.js`、`tests/tools/duel-drive.mjs`、`tests/tools/duel-perf.mjs`、`tests/tools/creature-preview.html`（若需加量測掛勾）、`docs/experiments/2026-09-05-*`、`docs/experiments/2026-09-04-creature-gaps.md`（只改 buoy 列狀態）。既有 `tests/*.test.mjs` 與 `paperwar-gate-D.mjs --only=D-A0,D-A1`（`--old=<git show add71c4:index.html>`）全綠。
W-A11 **送達**：`VERSION="0.32"`；push 後 `git log origin/main -1` 與線上 `curl https://9gf6p4448m-del.github.io/yaoshi/index.html | grep 'VERSION="'` 貼出（Pages 有 10 分鐘快取，逾時就貼 push 時戳）。

## 不得做
不改策略／引擎判定（`resolveBattles`／`simulate`／trait 效果）；不動 27 隻 `assets/creatures/*`；不改 `anyCreature`；不寫 localStorage；不 `Math.random`（3D 層規矩）。
