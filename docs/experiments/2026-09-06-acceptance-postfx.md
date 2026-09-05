# 後處理卷 凍結驗收（2026-09-06）— 基準 main `5f76adc`（v0.34）

使用者裁定（09-06 /handoff 一輪拷問）：範圍＝描邊＋陣營色＋運鏡（貼花另開小卷）；描邊＝**反轉外殼＋後處理邊緣偵測並用**；陣營色＝**描邊色＝系色常駐**；運鏡＝**三段最小組＋軌道環繞進場**。
純演出層：不改引擎判定、不改 CFG 數值、不改燒毀規則、不做慢動作。事實表見 `2026-09-06-postfx-facts.md`。

## 凍結條件（動手前訂，改動走 02 §2.1）

**P-1 外殼描邊**：27 隻 3D 妖每尊有一層 back-face 外擴 SkinnedMesh，與本體共用同一個 geometry／skeleton／bindMatrix（不得二次 `SkeletonUtils.clone`）；描邊色取 `creature-figures.js` 既有 `FACTION_RIM`（不得新增第 7 份系色複製品）；螢幕線寬以 CSS 像素定（預設 2.0px【試玩必調】），量法＝lineup 治具在 dist 3.6 與 4.2 兩機位截圖，同一尊外殼像素寬差 ≤30%。燒毀時外殼跟本體同步 dissolve（燒完 `visible=false` 一起消）。變紅的實作：clone 整包、線寬隨距離縮放、燒毀後殘留外殼。

**P-2 陣營盲讀**：lineup 合成 8v8（兩隊各含三系、標號 1–16 疊在畫面上，`--w 390 --h 844` 直式）截圖，**兩位 context-free 讀者**（prompt 不提系名、不提「陣營」，只說「把這些妖分成三類，列編號」），三系純度（定義沿用 `2026-09-05-silhouette-test-3-color.md:185`：落在最多那一類的隻數÷該系隻數，兩位取低）**每系 ≥ 2/3**。對照組＝同名冊、同種子、`?outline=0` 關描邊的截圖，兩位讀者純度須**低於**描邊版（否則描邊沒鑑別力）。變紅的實作：純度靠拓樸（人形／四足／器物）達成而非顏色——對照組同分即紅。

**P-3 邊緣偵測 pass**：只在 `bloomOK` 且對決場景走；讀 `sceneRT` 新掛的 `DepthTexture` 做深度（＋深度重建法線）Sobel，畫深色細線；`bloomOK=false` 路徑逐位元組不變（直接 render）。量法＝8v8 截圖上邊緣像素佔比在 [0.5%, 6%]（不空白、不噴雜訊），`?edge=0` 時佔比為 0；`traitfx-drive --nobloom` 全綠。program 數對決前後不變（暖身要「真的每幀被畫」，教訓 1）。

**P-4 運鏡（camera-director 內，其他檔不碰事件定義）**：
- (a) **軌道環繞進場**：`ys:duel` 後先以 DUEL_SHOT 的 dist／tilt 做 yaw 掃過兩隊（ORBIT_MS 預設 1500【試玩必調】），**dist 逐幀恆定**（|Δ`camera.position.length()`|<1e-3，不打斷鎖排），結束落在原 duelYaw；
- (b) **招式輕推**：監聽既有 `ys:fx-trait`（detail.side），yaw 往出招側偏 ±10°、dist −0.3（【試玩必調】），疊加層與 PUNCH 同型（偏移歸零時位置與 v0.34 逐項相同），TRAIT_MS 內回位；
- (c) **燒毀 punch 加強**：`ys:fx-burn` 觸發 punch，力道 ×1.5（【試玩必調】）；
- 全部走 `S.rngUi` 以外零亂數（本檔不碰 rng）；`ys:fx-trait-cancel`／`ys:duel-end`／SKIP 立即清零 orbit 與 lean；`prefers-reduced-motion` 時 (a)(b) no-op、(c) 維持現行 punch。
變紅的實作：orbit 期間 dist 抖動、偏移歸零後位置與舊版不同、SKIP 後殘留偏移。

**P-5 效能**（同機 AMD 780M，`duel-perf.mjs perf` 8v8）：fps ≥50（沿用既有閘門）且 ≥ v0.34 同機基準的 85%；draw calls ≤ v0.34 的 2.2 倍（外殼＝多一份 mesh）；programs 第一場後恆定。

**P-6 不退步**：
- R-1～R-4（lineup）、C-1～C-4、T-1～T-5／T-7／T-8（`traitfx-drive` 27/27）照原凍結檔逐條重跑全綠；
- **T-6 後繼條（因使用者選 orbit 而明定，非降標）**：每場時長中位 ≤ 原 T-6 上限 ＋ ORBIT_MS；SKIP ≤ 原 SKIP 基準＋100ms（orbit 不得拖慢快轉）；
- `trace()` seeds 1..20 新舊 `index.html` JSON 逐位元組相等（規程 `IMPLEMENTATION_GUIDE.md:547-549`）；`grep -c "Math.random" index.html` ＝0，js/ 亦 0；
- `duel-drive` 4 場（angle d3d11）console 0 error、0 pageerror、0 requestfailed；`--no3d` 亦 0。

**P-7 簽字項清理（描邊能解的）**：sword 小臉輪廓、redhat 橫胸短臂、tiger_c 封閉鑲邊、hairpin 髮／裙分界——P-1＋P-3 合併後各出 stage-lit 截圖，兩位 context-free 讀者固定題，命中 ≥1/2（沿用量產批規則）即從 gaps.md 劃掉；仍 0/2 者寫明原因回簽「引擎限制」，不得空白。

**P-8 對抗覆審**：fresh opus 冷讀 diff，prompt「找出會讓對決卡死、鏡頭殘留偏移、外殼與本體脫節、或 SKIP 後殘留的情境」；CRITICAL/HIGH 全修或使用者簽准；最多 3 輪。

## 不在本卷
法線貼花（木紋／毛／紙紮感）、`PAPERWAR_ON` 預設、`wardFirst`/`eliteArmor` 光環被遮、傳說 3 隻、任何 CFG／引擎數值。

## 量測污染源（凍結時一併寫下，教訓④）
lineup 量站位要避開 lunge、被燒凍住的尊、鏡頭 punch／orbit 進行中（orbit 只轉 yaw 不影響 pxWorld，但截圖要等 orbit 結束）；盲讀 agent 會繼承家目錄 memory 索引（含「祖靈古老神獸／香火威嚴神將／陰氣鬼怪」），prompt 不得提系名，讀者答案用甲乙丙分類，命名污染另記不計分。
