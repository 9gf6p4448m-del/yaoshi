# 卷 C3 招式 27 套（TRAIT_FX）——驗收凍結檔（2026-09-05）

## 使用者裁定（2026-09-05，四題一輪）
- 招式事件時長 **TRAIT_MS＝900ms**（固定，不與通用交鋒攤分 EV_BUDGET；可加受招方反應停頓）。
- **27 套全手寫**：每套各自獨立編舞，不走「原語×參數」模板；補間器、骨骼覆寫簿記、清場保險絲、受招輕反應這類基礎設施可共用（我的解讀，寫明於此）。
- **不動鏡頭**：只用既有 fxPunch 小力道；camera-director 不碰。
- **受招方輕反應**：model 小幅退縮＋邊光閃一下，不新增被擊動畫。

基準 SHA：`41b7cf1`（main＝origin，v0.32 接線卷）。動手前狀態：`TRAIT_FX={}`（index.html:3889），27 個 trId 全走 fallback（flash＋impact）。

## 事實（自己查的，不問）
- 27 個 GLB（assets/creatures/*.glb）全部有 idle／move／attack 三支 clip；`move` 尚未被任何路徑播過。
- figure API（creature-figures.js:316-395）：parts（骨骼名→Bone）、play(name,{loop,fade,timeScale,clamp})、bounds()、setRim(倍率)、update(dt)、current()。
- duel-figures 每幀覆寫 group.position／rotation／scale 與 setRim（duel-figures.js:548-580）→ 招式演出不能動 group，要動 model（group.children[0]）與骨骼；rim 要用包裝倍率。
- 時間軸：pwPlayBeat（index.html:4020-4061）對 trait 事件只 `await pwSleep(evMs)`，evMs＝1050ms÷事件數夾在 45–260ms。pwTraitFx 是同步呼叫、不 await 回傳值。
- 3D 側可用：scene／impact.burst(pos,color,{power,scale,seed})／SPARK_COLOR[fac]／hitstop 事件；index 側積木：fxFlash／fxImpact(pos,fac,pw)／fxPunch／fxHitstop。
- SKIP：fx 積木各自檢查 SKIP；pwTraitFx 目前不檢查 → 快轉時仍會叫掛鉤。

## 驗收條件（凍結；改動走 02 §2.1）
- **T-1 齊備**：`Object.keys(TRAIT_FX)` 與 `Object.keys(TRAITS)` 集合相等（27/27），治具機械比對。
- **T-2 活性＋歸零**（逐套，治具頁對 27 套各跑一次，3D 就位）：①掛鉤回報 handled=true；②演出期間至少一幀有「任一骨骼／model 的 quaternion 或 position 與純 mixer 基準差 >1e-3」**或**「impact.burst／自訂 mesh 新增 ≥1」（兩者擇一即活性成立，記錄哪一種）；③結束後（≤ TRAIT_MS×2）所有被動過的骨骼／model 偏移歸零（|Δ|<1e-3）、自訂 mesh 全部從 scene 移除、rim 倍率回 1 → 不污染下一拍的 idle／attack。
- **T-3 兩兩不同（全手寫）**：①27 個編舞函式本體（去空白）兩兩不同；②治具記錄每套「動到的骨骼名集合 ∪ 生成的 mesh 種類集合 ∪ 是否動到目標側」簽章，27 套兩兩不相等。「單調與否」的品味判斷不在本卷驗收，留給真機試玩（截圖接觸表供使用者預覽）。
- **T-4 退化路徑**：①`--no3d`（renderer.js 擋掉）→ 27 套全部退回 fallback，FXC.trait 計數與 v0.32 逐場相同、無 pageerror；②單顆 GLB 擋掉（該尊 ready()=false）→ 該套退 fallback、其餘照演；③掛鉤內 throw（治具注入）→ 退 fallback、對決不卡（該拍在 TRAIT_MS×2 內結束）。
- **T-5 真玩不退步**：duel-drive 4 場（`?paperwar=1&fxcount=1`）：FXC.traitFig（新計數：走 3D 掛鉤的次數）>0、pageerror=0、requestfailed=0；rAF 中位 ≥ 接線卷基準 151fps 的 90%（同機同設定，先跑一次 41b7cf1 基準對照）；對決中 `renderer.info.programs.length` 在第一場之後不再增加（自訂材質要在第一場前預熱）。
- **T-6 時長**：一場對決總時長（ys:duel→ys:duel-end）中位 ≤ v0.32 基準 ＋ (TRAIT_MS − 260ms)×該場 trait 事件數 ＋ 150ms 誤差；SKIP 快轉時 ≤ v0.32 SKIP 基準 ＋ 100ms（招式不得拖慢快轉）。
- **T-7 SKIP 即停**：doSkip 當下若有招式在演，≤1 幀內自訂 mesh 移除、骨骼偏移歸零（治具在演出中途觸發 SKIP 量）。
- **T-8 reduced-motion**：`prefers-reduced-motion: reduce` 下骨骼位移／model 位移全免、只留光與粒子（art-integration-guide §6 第 5 條同精神）；治具用 emulateMedia 驗 27 套 model/骨骼 Δ 全 0。
- **T-9 送達**：VERSION→0.33、VERSION_NOTE 改 C3；push 後 `git log origin/main -1` 貼出；使用者以首頁版本字串核對。
- **T-10 對抗覆審**：fresh opus 冷讀 diff，prompt「找出會讓對決卡死、下一拍動作被污染、或 SKIP 後殘留的情境」；CRITICAL/HIGH 全修或使用者簽准；最多 3 輪。

不在本卷：鏡頭運鏡（後處理卷）、新 sfx、改引擎判定或任何 CFG 數值、傳說 3 隻、描邊／貼花。
