# 驗收條件凍結 — 3D look-dev 卷：虎爺印三方案＋戲台燈光（2026-09-04）
基準 SHA：`8acf054`（試作卷已併入：`assets/creatures/tiger.*`、`js/creature-figures.js`、`tests/tools/creature-preview.html`）。
試作結論：技術鏈全綠，但盲讀說「像玩具吉祥物」，戲台截圖形體太暗。主對話（使用者授權的決策者）裁定：

## 流程裁定（主對話，不是玩法）
1. anyCreature 的**正視／頂視**盲讀移出必過閘門（戲台鏡頭永遠是 3/4 側前方）；必過＝側視 thumb、hero、**戲台 3/4 視角**三張。
2. anyCreature 的 `saturation_area` 帶由預設 10–34% 放寬為 **10–60%**（寫進各方案的 `claims.json`；理由：戲台是深色底＋bloom，招牌色要飽和才有氣勢）。
3. `smooth_angle` 不再固定 50，各方案自訂（建議 28–40，轉折要硬才有雕像感）。
4. 品質印象閘門新增：盲讀主印象**不得是**玩具／吉祥物／可愛／稚氣；須是威／兇／神／莊嚴任一。

## 範圍（四個 agent 平行、各寫各的檔）
V-A **猛虎**：肌肉肩、低蹲蓄勢、大頭張口、條紋密集粗黑（fin 板法可）、眼金。氣質＝兇。
V-B **神像虎**：廟宇石雕虎爺比例（圓壯但正襟）、額頭金印、紅綬帶＋金錢牌、雙眼金、姿態端坐或半蹲。氣質＝神聖莊嚴。
V-C **妖火虎**：兇＋神：身上陰火紋（高飽和橘紅帶）、眼與口內發光（材質命名 `eye`／`mouth_glow` 供 three.js 端做 emissive）、尾尖火。氣質＝威嚇又神。
      三方案各寫 `assets/creatures/tiger_{a,b,c}.{json,glb,claims.json}`，不動 `tiger.*` 原檔。
L **燈光與神性特效**（只改 `js/creature-figures.js` 與 `tests/tools/creature-preview.html`）：
      key（暖、上前左）／fill（冷、對側弱）／rim（燈籠色、後上）三燈組成 `createFigureLightRig()`，可掛進任何 scene；材質：頂點色可讀、rim fresnel 加強；
      支援材質名 `eye`／`mouth_glow`／`glow_*` → emissive（bloom 會吃）；三系環境特效鉤子：香火＝香煙／火星上飄、祖靈＝金粉、陰氣＝冷色鬼火（用 particles.js 既有系統或新增輕量粒子，每隻 ≤60 顆）。
      不動 `js/scene-env.js`／`js/renderer.js`／`index.html`（牌桌 J7 基準不受影響）。

## 驗收
LD-A0 每方案：GLB ≤400KB；`idle/move/attack`；judge 在**本檔放寬後的 claims** 全綠；silmetrics 側視＋hero 過。
LD-A1 每方案盲讀（context-free 子 agent ×2，只給 hero 與戲台 3/4 兩張）：問「這是什麼動物？氣質？像玩具還是威嚇？像不像廟裡的神獸？」；兩位都須說虎，主印象不得為玩具／吉祥物／可愛，須含威／兇／神／莊嚴任一。原話貼出。
LD-A2 每方案截圖：`docs/experiments/2026-09-04-lookdev-tiger_{a,b,c}-hero.png` 與 `…-stage.png`（戲台 3/4，用 `tests/tools/creature-preview.html?glb=…` 現有燈光即可，L 卷的新燈光由主對話合併後統一重拍）。
LD-A3 L 卷：同一相機同一 `tiger.glb` 前後對照 `…-lookdev-light-before.png`／`-after.png`；人形遮罩區平均亮度前後數字貼出（after 須 ≥ before×1.5 且不過曝：≤ 0.85）；三系特效各一張截圖；`?n=8` rAF 中位數仍 ≥50fps、粒子總數貼出。
LD-A4 範圍：各 agent 的 `git diff --stat` 只含自己被允許的路徑。

## 不得做
不改 anyCreature 引擎；不動 index.html／scene-env.js／renderer.js／duel-figures.js；不 commit 不 push。
