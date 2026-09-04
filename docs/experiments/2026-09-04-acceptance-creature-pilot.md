# 驗收條件凍結 — 《紙紮夜戰》3D 試作卷：虎爺印一隻走完 anyCreature 全流程＋接進戲台（2026-09-04）
基準 SHA：見 commit。使用者裁定（2026-09-04）：對決改**真 3D 模型互打**（推翻紙紮戲台），Fable 5.1 為主要決策者，不怕重、要大作感精緻順暢，
指名參考 `tools/anyCreature`（已 clone、setup 通過、範例狼 0.35 秒出 GLB 含 idle/move）。
主對話裁定：模型來源＝anyCreature JSON→GLB 蒙皮模型；風格＝低多邊形頂點色＋三系邊光 fresnel＋現有 bloom；動作＝anyCreature 骨架動畫（idle／move／attack）＋受擊與燒毀走程序化。
本卷只做**一隻**（虎爺印，香火系精英）打通全鏈，量產 26 隻與招式動畫另開卷。一經訂定即凍結。

## 範圍
P-1 **模型**：照 anyCreature 五階段卡片（訪談略過、以本檔設計簡報代替）產 `assets/creatures/tiger.json`＋`assets/creatures/tiger.glb`。
      設計簡報：台灣廟宇神桌下的虎爺——矮壯短腿的橘虎、黑色粗條紋、額頭「王」字或金色神印、脖子紅綬帶＋金錢牌、張口露牙、蹲踞待撲。氣質：兇但神聖。
      LOW／MID／HIGH 三階段的 RECOGNISED／PUNCHIER 盲讀閘門**必須真的 spawn context-free 子 agent**，貼子 agent 原話。
P-2 **人形工廠** `js/creature-figures.js`：`makeCreatureFigure({glbUrl, faction})` 回傳批 1 換皮介面 `{group, shadow, setPortrait, setCloth, setRim, ready}` 外加
      `parts`（骨骼名→Bone 映射）、`play(name, opts)`（AnimationMixer 播 clip）、`burn()`（回 Promise：dissolve 掃過＋燈籠色燒邊＋灰燼粒子，結束後 group 不可見）。
      材質：頂點色＋三系邊光 fresnel（`setCloth(hex)` 換邊光色；三系色用 `assets/theme.css` 的 `--c-*-light`）；不得靠外部貼圖。
P-3 **預覽頁** `tests/tools/creature-preview.html`：獨立頁、同一份 importmap、掛 `scene-env.js` 燈籠霧氣＋`bloom.js`；載 tiger.glb 播 idle→attack→burn 循環；`?n=8` 擺 8 隻播 idle。
P-4 不動 `index.html`、不動既有 `js/*.js`（新檔可）；`tools/anyCreature/` 不入 git；不 commit 不 push。

## 驗收（貼指令原文＋輸出；Playwright 844×390）
CP-A0 GLB 規格：≤400KB；`animations` 含 `idle`、`move`、`attack` 三支（名稱貼出）；`skins`=1；`COLOR_0` 存在；anyCreature `harness/judge.mjs` 機械檢查全綠（貼輸出）。
CP-A1 盲讀：三道閘門各貼 context-free 子 agent 原話；最終 HIGH 截圖再問一個新 context-free 子 agent「這是什麼、什麼氣質」，答案須含「虎／老虎」且含兇／威／神任一字。
CP-A2 戲台載入：預覽頁 console 0 error；三時點截圖 `docs/experiments/2026-09-04-creature-pilot-{idle,attack,burn}.png`；burn 結束後 `group.visible===false`。
CP-A3 效能：`?n=8` 桌機 rAF 中位數 ≥50fps（量測位置寫明）；`renderer.info.render.calls` 貼出；GLB 載入時間貼出。
CP-A4 邊光：`setCloth` 換三系色後截圖三張並排 `…-creature-pilot-rim.png`，肉眼可分辨三色。
CP-A5 `git diff --stat` 只含 `assets/creatures/`、`js/creature-figures.js`、`tests/tools/creature-preview.html`、`docs/experiments/2026-09-04-creature-pilot-*`。

## 不得做
不改 index.html／既有 js；不改 anyCreature 引擎原始碼（工具問題記錄後繞過）；不 commit 不 push。
