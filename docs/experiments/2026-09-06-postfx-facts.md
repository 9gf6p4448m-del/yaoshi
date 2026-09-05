# 後處理卷事實表 — 2026-09-06（基準 5f76adc，Explore agent 收集、主對話落檔）

## 五條風險
1. **深度貼圖沒開**：`js/bloom.js:76-79` 的 render target 全無 `.depthTexture`（全 repo grep `DepthTexture` 0 命中）——Sobel 要讀的深度得新建 `THREE.DepthTexture` 掛在 `sceneRT`。
2. **SkinnedMesh clone 陷阱**：`js/creature-figures.js:258` 用 `SkeletonUtils.clone` 幫每尊建獨立骨架；外殼若再 clone 一次會生第二套不同步骨架，且會讓 `js/trait-fx.js:129` 掃 `group.children` 找 `isBone`/`isSkinnedMesh` 的 model 偵測抓錯。外殼要在**同一個 model** 底下加 SkinnedMesh，reuse 該 mesh 的 `geometry`/`skeleton`/`bindMatrix`。
3. **customProgramCacheKey 釘死**：`creature-figures.js:218` 所有材質共用 `'yaoshi-creature-rim-burn'`；外殼用不同 shader 必須換另一把 key。
4. **鎖排（camStable）看的是 dist 不是 yaw**：`js/duel-figures.js:455,467,559-561,570-577`，`camStable = |dist−lastDist|<1e-3`，`dist = camera.position.length()`。球座標下只轉 yaw 的 orbit 不會打斷鎖排；orbit 若讓 dist 抖就會一直重選 → 踩 T-6／R-4。
5. **沒有 SwiftShader console-0-error 自動測試**：所有 3D 治具刻意帶 `--use-gl=angle --use-angle=d3d11`（`docs/IMPLEMENTATION_GUIDE.md:755`）；自製 bloom 在 SwiftShader 仍 link 失敗（`js/bloom.js:1-8`）。新 shader 的 0 error 驗收在真實 GPU 上跑，軟體 GL 走 `bloomOK=false` 退路。

## A. 渲染鏈
- 分流 `js/renderer.js:203-208`：`bloomOK && (!warmedUp || kind==='duel')` → `bloom.render`，否則 `renderer.render`。
- `kind` 由 `playerBridge.update(now)` 決定（`renderer.js:181`），實際判斷 `js/bridge-players.js:101-108`（`sceneKind()` 看 DOM display）。
- `bloomOK` 判定 `renderer.js:118`；`BLOOM` 參數 `renderer.js:28`。
- bloom 四支 pass `js/bloom.js:117-134`：①場景→`sceneRT`（全解析度，depthBuffer:true，`119-121`）②亮部→`rtA`（半解析度，`123-124`）③兩趟高斯 `126-131` ④合成 `133-134`。`rtOpt` 在 `76-79`。
- 色彩：render target 無 colorSpace；合成 shader 手動 linear→sRGB＋ACES（`bloom.js:10-11, 50-55`）。
- `setSize` `bloom.js:99-108`。`Layers`／`renderOrder`／MRT 全專案未用。

## B. 妖怪材質
- SkinnedMesh；`SkeletonUtils.clone` 導入 `creature-figures.js:26`，理由 `106-108`，呼叫 `258`。
- 材質 `MeshStandardMaterial`＋`onBeforeCompile`（`dressMaterial` `181-221`）；cache key `218`；`uRimStrength/uRimColor` 由 `setRimUniforms` `302-307`、`setRim` `325`、`setCloth` `323`；`uDissolve` 宣告 `189`、`setDissolve` `309-311`、shader TAIL `152-168`、`burn(o)` `392-402`、`update(dt)` `404-432`。
- `readyPromise` `257-297`：model＝clone 結果本身（無包裝節點）；`parts[o.name]` 收 bone `271-272`；bbox 正規化 `NORM.maxH=1.2`（常數 `80`）邏輯 `260-267`。
- `frustumCulled=false` mesh `282`、粒子 `747`。

## C. 陣營
- 27 隻對照＝`index.html:1586-1613` 的 `POOL`（ab 缺者用 m 當 GLB 名，`2427-2428`）：
  - 祖靈 zuling：bow shield balen[m] eye thunder boat boartusk[m] xianji shanshen
  - 香火 xianghuo：flag sword wangchuan bell wuying tiger（GLB `tiger_c`，`creature-figures.js:82`）ashcharm[m] fushou pojun
  - 陰氣 yinqi：redhat hairpin chair raincoat buoy nail yinyangcoin[m] guoyin sigui
- 系別別名 `creature-figures.js:527-534`（`FACTION_ALIAS`/`canonFaction`）。
- 系色 hex 複製品 **N=6**：源頭 `assets/theme.css:23-28`（zuli #8b6040/#d4a870、xianghu #c84040/#f08060、yinqi #3d6e4e/#70b080）；`index.html:257-260`（.pwchip 寫死）；`index.html:4278`（RV_COL fallback）；`js/particles.js:141-145`（SPARK_COLOR）；`js/creature-figures.js:521-525`（`FACTION_RIM`）；`docs/experiments/2026-09-04-paperwar-C2-samples.html:10-12`（歷史樣本）。**外殼描邊色一律取 `FACTION_RIM`，不得新增第 7 份。**
- 香火 rim 與燈籠色相撞脈絡 `creature-figures.js:566-571`（`RIM_FACTION_MIX=0.35`）。

## D. 對決席位與事件
- 座位 `seats=[d.a,d.b]`，i=0 左（−spread）、i=1 右（+spread）`duel-figures.js:342,448`；`onDuel` `339-393`。
- `ys:fx-trait` detail `{trId, side, foeSide, fac, power, ms, handled, done}` 定義 `index.html:3910` 派 `3911`；接收 `trait-fx.js:443-448`。
- `ys:fx-burn` `{side, unit, ms, handled, done}` `index.html:4032-4033`；接收 `duel-figures.js:400-423`（side 'B'→1）。
- `ys:duel` `{a,b,armies?}` `index.html:4142-4147`；接收 `duel-figures.js:339`、`camera-director.js:106-112`。
- `ys:duel-end` `index.html:4199`；`ys:fx-trait-cancel` `index.html:1744`（doSkip）。
- `fx3d(name,detail)` wrapper `index.html:3092`；派送點 `1744,3160,3163,3168,3173,3178,3212,3364,3911,4033,4147,4199,4252`。
- `PW_FX.TRAIT_MS`=900 `index.html:3135`；`PW_FX.MAXFIG`=8 `3134`；evMs 攤分 `4056-4057`。

## E. 鏡頭
- `createCameraDirector(camera,lanterns)` → `{update}` `camera-director.js:66-186`；監聯 `ys:reveal/duel/fx-punch/duel-end/end/table`（`99-147`）；`update(dt,now)` `150-183`（easeInOutCubic 補間、punch easeOutCubic）。
- `DUEL_SHOT {dist:4.2,tilt:24,lookY:0.35,ms:700}` `:23`；`SHOTS.table dist 3.6` `:18`；`PUNCH` `34-39`；`onPunch` `124-128` 只讀 power、**無方向性**。
- 位置公式 `camera-director.js:173`（球座標，length 恆＝dist）。
- 出招側聚焦先例（燈組）`trait-fx.js:48-49, 364, 410`。

## F. 治具
- `duel-perf.mjs`：`bounds`/`perf`（8v8 fps、draw calls）/`buoy`/`lineup`（`141-215`，R-1~R-4 用）；`--use-gl=angle --use-angle=d3d11`（`:28`）。
- `duel-drive.mjs "<url>" <out.json> [--duels=4] [--root=] [--port=8831] [--no3d] [--loadmax=]`：console/pageerror、每場 armies、時長、burn handled。
- `traitfx-drive.mjs <out.json> [--only=] [--reduced] [--throw] [--cancel=] [--count=] [--dt=] [--shots=] [--port=8841] [--ms=900] [--nobloom] [--block=]`。
- `r4-compare.mjs` 不在 repo（一次性）。`tests/tools/README.md` 未列 3D 治具。
- 同種子等價：`baseline-traces.json` 不可再當基準（`IMPLEMENTATION_GUIDE.md:60-66,543-546`）；規程＝`git show <舊commit>:index.html > old.html`，同一支 `trace()` 對新舊各跑 seeds 1..20 比 JSON 逐位元組（`547-549`，腳本範例 `522-529`）。
- 無 package.json scripts；一律 `node tests/tools/xxx.mjs`。

## G. 版本
- `VERSION`/`VERSION_NOTE` `index.html:1672`；入口 `index.html:4988` `js/renderer.js?v=`，其餘 js 用 `import.meta.url` 接力（`renderer.js:13-14` 等）。**改 js 只 bump `index.html:1672`。**

## H. 文件
- `ART_BIBLE.md:75`：陣營辨識由後處理卷（描邊／邊光）承擔（授權）。
- `art-integration-guide.md:322-336` §6 鐵則：只用 `S.rngUi()`、`Math.random` 必 0；動畫不讀寫 S；trace seeds 1-20 等價；844×390 不溢出；reduced-motion。
- `IMPLEMENTATION_GUIDE.md:728-759`：事件驅動積木、尺寸用 CSS 像素換算、bloomOK 閘門。
- `2026-09-05-acceptance-traitfx-C3.md:25` T-6：「一場對決總時長中位 ≤ v0.32 基準＋(TRAIT_MS−260ms)×trait 數＋150ms；SKIP ≤ 基準＋100ms」；`:29` T-10 對抗覆審 ≤3 輪。
- `2026-09-05-acceptance-duel-readability.md:15-22` R-1 gap≥0.30／R-2 r≤2.20 offTable=0／R-3 minPair≥0.50／R-4 小編制座標差<1e-3；C-1 字幕／C-2 燈組≥0.5 且 ≤150ms／C-3 traitfx-drive 全綠＋每場 ≤基準+80ms／C-4 390px 不裁字。
