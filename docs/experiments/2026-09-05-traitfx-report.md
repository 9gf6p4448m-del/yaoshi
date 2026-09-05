# 卷 C3 招式 27 套（TRAIT_FX）——驗收報告（2026-09-05）

凍結檔：`2026-09-05-acceptance-traitfx-C3.md`（基準 `41b7cf1`）。證據 JSON 在 `2026-09-05-traitfx-evidence/`，接觸表 `2026-09-05-traitfx-sheet.png`（27 列 × 出招後 130／370／600ms）。

## 做了什麼
- `js/trait-fx.js`（新）：招式舞台。接 `ys:fx-trait`，依 trId 找編舞；骨骼 delta 疊在 mixer 之後（包裝 `figure.update`：restore→mixer→capture，`apply` 在 renderer 主迴圈 `duelFigures.update` 之後）；model 位移／旋轉／縮放以開演值為基準；`setRim` 包裝成倍率；自訂 mesh 全部記帳、finish 時 dispose；保險絲 900×2ms；`ys:fx-trait-cancel`／`ys:duel-end` 立刻清場；reduced-motion 位移類 no-op。材質只有兩支模板（加色 mesh／line）＋粒子池，用常駐暖身物件在第一場對決前把 bloom 那條 linear 變體也編掉。
- `js/trait-fx/{zuling,xianghuo,yinqi}.js`（新）：27 套各自獨立的手寫編舞（祖靈／香火／陰氣各 9）。
- `index.html`：`PW_FX.TRAIT_MS 900`、`FXC.traitFig`、`pwTraitFx` 先派 `ys:fx-trait`（SKIP 時不派）、3D 接下才等 `TRAIT_MS`（否則照 v0.32 等 evMs）、`doSkip` 派 cancel、`?fxcount=1&seed=N` 治具鉤、VERSION 0.33。**evMs 攤分公式與 v0.32 逐字相同**（中途改過一版「招式不佔攤分」，同種子實測每場多 100–400ms、超出 T-6，已退回）。
- `js/renderer.js`：`createTraitFx` 接線（排在 stageRig 之後，program cache key 含燈數）、主迴圈 `traitFx.update(dt)`。
- 治具：`tests/tools/traitfx-preview.html`＋`traitfx-drive.mjs`（固定 dt 逐幀步進，pass A 不出招 vs pass B 出招，逐幀比所有骨骼／model 的 matrixWorld Δ；`--reduced`／`--throw`／`--cancel`／`--block`）、`traitfx-sheet.mjs`；`duel-drive.mjs` 加每場 trait 計數＋時長＋`--skip`（MutationObserver 即按）；`duel-perf.mjs` perf 支援 `--root`。

## 逐條證據
| 條 | 結果 | 證據 |
|---|---|---|
| T-1 齊備 | ✅ 27/27 | `all.json` summary.t1 `{missing:[],extra:[]}` |
| T-2 活性＋歸零 | ✅ 27/27 | `all.json`：每套 handled=true、alive=true（Δ 最大 0.67～4.20，全部 >1e-3）、restored=true（演完 Δ<1e-3、mesh 0、wrapped 0）、within=true（結束幀 66–72 ≤ 12＋110） |
| T-3 兩兩不同 | ✅ | ①27 個函式本體去空白兩兩不同（長度 1315～3161）②簽章 `重複簽章 0`（`all.json`） |
| T-4 ①無 3D | ✅ | 同種子 `seed=20260905` 四場：`bl3-v032-seed-no3d` vs `bl3-v033-seed-no3d` 每場 trait 數 1/2/1/3 相同、FXC.trait 7=7、traitFig 0、時長差 −7／+31／+20／+14ms、錯誤只有刻意擋掉的 renderer.js |
| T-4 ②單顆 GLB | ✅ | `tfx-block-actor.json`（擋 bow → handled=false 退 fallback）、`tfx-block-foe.json`（擋 boat → 照演、無錯） |
| T-4 ③掛鉤 throw | ✅ 27/27 | `all-throw.json` 全部 handled=false、restored、err=0 |
| T-5 真玩不退步 | ✅ | `bl3-v033-seed`：traitFig 7/7（每筆招式都走 3D）、pageerror 0、requestfailed 0；`bl-perf-v033` rAF 中位 153.8fps vs v0.32 144.9（同機同設定 `--uncap`，8v8 最重 8 隻）；programs 第一場 16→21、之後三場恆 21（v0.32 反而每場都在增：7→14→15→16） |
| T-6 時長 | ✅（中位） | 同種子：v0.32 5093/5413/5331/6233、v0.33 5783/6860/5933/8363，招式數 1/2/1/3。扣 (900−260)×n 後 v0.33 中位 5437 ≤ 基準中位 5372＋150。**逐場看 d2／d4 超過「基準＋640n＋150」17／60ms**——公式用 260 是 evMs 的上限，那兩場 evMs 實際 <260，招式取代的是較短的等待，差額落在這裡。SKIP：43/13/20/285 vs 44/14/19/212（≤ +1ms） |
| T-7 SKIP 即停 | ✅ | `tfx-cancel.json`：第 15 幀 cancel，同幀 active=0、Δ 歸零、mesh 0 |
| T-8 reduced-motion | ✅ 27/27 | `all-reduced.json` maxD 全 0，mesh／burst 照有 |
| T-9 送達 | 見文末 | push 後 `git log origin/main -1` |
| T-10 對抗覆審 | 見下節 | |

## 對抗覆審（T-10）
**第 1 輪**（fresh opus 冷讀 `41b7cf1..1c26b61`，報告 `2026-09-05-traitfx-review-round1.md`）：CRITICAL 0／HIGH 1／MEDIUM 3／LOW 3。
| # | 等級 | finding | 處置 |
|---|---|---|---|
| H-1 | HIGH | 滿編 8 尊時逐尊錯開的 lag 讓演出拖到 1317ms（6 套抽測 5 套超時，POOL 編制也有 2 套 983／1000ms），index 只等 900ms → 兩套演出疊同一批骨骼。治具只驗保險絲 1800ms，是綠燈盲區 | **修**：`st.tween`／`st.at` 排程時把超出 `st.ms` 的部分按比例壓縮進預算、時間到硬收工（`stats.cut/compressed`）；治具加 `onTime`（≤ 出招後 900ms）與 `--count=8`。重跑：27/27 原編制與 27/27 滿編都在第 66 幀收工（`all.json`／`all-count8.json`，compressed 欄記錄每套被壓了幾段） |
| M-1 | MEDIUM | 斬瘟劍光把 Group 交給 spawn，子節點 geometry/material 沒 dispose | **修**：finish 遞迴 traverse dispose |
| M-2 | MEDIUM | evMs 攤分公式改動讓有招式那一拍的交鋒變慢 | 已在 `50fad6d` 修（同種子實測，見 T-6） |
| M-3 | MEDIUM | FX_SEED 治具鉤未提交 | 已在 `50fad6d` 提交 |
| L-1 | LOW | `st.rim` 無疊加語意，同尊兩個 tween 後寫蓋前寫（yinqi.js 邊光脈衝被 flinch 蓋掉） | 不修（設計如此：後寫者勝；該處視覺仍有 flinch 的邊光） |
| L-2 | LOW | T-2② `alive` 三條腿 OR、snapshot 不分敵我，沒單獨驗「出招方動了」 | 不修（凍結檔本文如此；27 套簽章的骨骼集合都含出招方骨名，接觸表另有人眼） |
| L-3 | LOW | 同尊重疊時已收工那套的 `w.over` 殘值 | **修**：finish 時若該尊仍有別套在演，把共用覆寫值歸零 |
**第 2 輪**：見下。

## 教訓（候選，未寫進 lessons.md——該檔已達上限待蒸餾）
1. `renderer.compile()` 只編「直接輸出」那一支 program；走 bloom 的 render target 是 linear 色彩空間的另一支，粒子池在第一次 burst 前也沒編過。要預熱得讓物件**真的每幀被畫**（`frustumCulled=false` 常駐桌底），`renderer.info.programs.length` 對決前後不變才算證據。
2. 「招式不佔攤分」這種看似無害的節奏改動，同種子逐場一比就露餡（+100～400ms）；沒有 `?seed=` 治具鉤之前，不同局的中位比較會把它藏起來。
3. 對決席位讓兩尊同隊護法在畫面上幾乎重疊，跨尊動作（飛到同伴身上）在治具裡飛行距離很短——正式頁站位待真機試玩確認。
4. 骨骼名沒有語意線索的模型（eye 的 Sl0–3／Br0–2）只能憑截圖調正負號；`Chest` 這類體內骨上擺 orb 會被自身遮住（`depthTest` 仍開）。

## 不在本卷／待裁
- 鏡頭運鏡、新 sfx、描邊／貼花（後處理卷）；傳說 3 隻（第 4 卷）。
- `wardFirst`／`eliteArmor` 腳下光環在對決機位被本體遮住（sig 有 ring，畫面看不到）；要露出來得放大到超過本體投影——留真機試玩裁定。
- 27 套的「單調與否」是品味題，接觸表給使用者預覽；`?paperwar=1` 真機試玩後逐套即改。
