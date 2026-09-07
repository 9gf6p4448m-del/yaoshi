# 驗收凍結檔：傳說三尊美術卷（2026-09-07；使用者問「傳說長怎樣」）

基準 SHA：`578b2de`（v0.48）。三尊（`canri` 殘日／`dashiye` 大士爺紙尊／`youyinggong` 有應公）目前借用 `bow`／`wangchuan`／`redhat` 模型（`index.html` `LEGENDS.m`）。本卷給它們專屬 GLB＋招式登記。流程照 27 隻量產（`docs/experiments/2026-09-04-acceptance-creature-batch.md`）與 `docs/design/ART_BIBLE.md`。**分兩段：第一段做到三方案截圖就停下來回報，使用者挑定後才做第二段。**

## 設計依據（不得偏離）
- 提案 `docs/proposals/2026-09-06-legend3-design.md` §二：殘日＝被射中右眼、失去厲光墜成月亮的太陽（圓盤＋裂芒＋獨眼剪影，27 隻沒有「天體」）；大士爺紙尊＝紙紮鬼王（青面獠牙吐舌、頭頂觀音，以紙紮工藝為主體）；有應公＝路旁小祠無主枯骨（紅布、香爐、無名牌位，沒有臉）。
- 文化提醒：殘日不用任何族群聖物實體、只用神話事件；大士爺不是宗教神像；有應公全部虛構化。ART_BIBLE §0.5 不可愛、真實參照鐵則；§1 香火硃紅鎏金儀仗剪影／§2 祖靈大地褐靛藍修長／§3 陰氣苔綠濕黑錯位。
- 體型：殘日 elite×1、大士爺 ward×1（正面寬 ≥ 側面）、有應公 haunt×2（下半身虛化）。

## 第一段：三方案（做完停）
- **V0 簡報＋參照**：`creature-briefs.md` 補三列；每尊 2～3 張真實照片存 `tools/anyCreature/out/ref/<id>/`（來源＋授權寫明），親眼看過抽 3～5 條「一眼特徵」寫成 `docs/experiments/2026-09-07-ref-<id>.md`（格式照 `2026-09-04-ref-sword.md`）。殘日的參照用「日蝕／殘月／裂開的太陽圖像」與神話插畫，不用族群圖騰實物。
- **V1 三方案**：每尊 3 個 JSON spec（`out/<id>/r1a|r1b|r1c.glb`）、各拍 hero＋stage-lit 兩張（`creature-shoot.mjs`），拼一張 contact sheet（3 尊 × 3 方案 × 2 圖）放 `docs/experiments/2026-09-07-legend-art-evidence/sheet-v1.png`，每格標方案一句話（差異在哪：剪影／材質／發光部位）。judge 全綠、GLB ≤1.5MB／≤8000 三角。**做到這裡停下來回報**，等使用者挑（可混搭）。

## 第二段：量產＋盲讀＋接線（使用者挑定後）
- **V2 盲讀（M-A1）**：兩位 context-free 讀者看 hero＋stage-lit，答「這是什麼」＋列特徵；概念類別兩人都對、特徵命中 ≥3/5、主印象不得「可愛／玩具」；最多 3 輪，未過交最佳版標「未過」由使用者簽字。
- **V3 模型驗收（M-A0／A2／A3）**：三 clip（idle/move/attack）、judge 綠、silmetrics 過；大士爺正面寬 ≥ 側面、有應公 haunt 虛化截圖、殘日發光部位（裂芒）材質名存在。
- **V4 接線**：`assets/creatures/{canri,dashiye,youyinggong}.{json,glb,claims.json}`；`LEGENDS.m` 改指新鍵（三處）；`tests/tools/duel-perf.mjs` ALL／HEAVY／FAC 與 `faction-sheet.mjs` FAC 登記；`duel-perf bounds` 三尊高 ≤1.2、min.y ≥0；`duel-drive` 用 `?legend=1`（或預設開）跑到三尊上場的對決 ≥1 場、0 error；lookdev 三尊在戲台燈下 hero 圖；出手卡顯示三尊名（v0.45 已帶 `n`）。
- **V5 招式登記**：`eliteBlind`／`wardGuardAll`／`hauntAnswer` 登記進 `js/trait-fx/{zuling,xianghuo,yinqi}.js`（用既有編舞函式組合：殘日＝閃光＋對面前鋒後退；大士爺＝全隊上抬護罩；有應公＝對面詛咒品處噴祟），`traitfx-drive.mjs` 三招 handled／restored 綠。請神登場演出不在本卷。
- **V6 效能**：`duel-perf perf --n=8` HEAVY 含三尊，中位 fps ≥ 基準 ×0.9；三 GLB 各 ≤1.5MB。
- **V7 文件與範圍**：ART_BIBLE 加「傳說三尊」小節（三尊的造型守則一句話各一）；GAME_DESIGN changelog；GUIDE 一節；`git diff --stat` 只含 assets 三尊、`index.html` LEGENDS.m 與 VERSION、trait-fx 三檔、兩支治具登記、docs、證據目錄。VERSION bump。
- 引擎零改動：`trace(1..20)` 與基準逐位元組相等（`m` 只影響 3D）。

什麼實作會讓 V2 假綠：盲讀者被告知名稱或提案文字。什麼實作會讓 V4 紅：忘了登記 duel-perf／faction-sheet 導致三尊不在任何治具視野內。
