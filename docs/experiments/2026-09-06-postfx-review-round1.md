# 後處理卷 對抗式覆審 第 1 輪（2026-09-06）

- 受審 commit：`8d28fc7`（v0.35）；基準 `5f76adc`（v0.34）。冷讀 `git diff 5f76adc..8d28fc7 -- js/ index.html`，覆審員無作者對話史。
- 覆審框架：找「會讓對決卡死／鏡頭殘留偏移或凍住／外殼與本體脫節／SKIP 後殘留／滿編收斂閃爍／記憶體或 program 洩漏／reduced-motion 失效／`bloomOK=false` 路徑被改／`?edge=0`／`?outline=0` 關不乾淨」的情境，不是確認沒事。
- 探針與原始輸出：`docs/experiments/2026-09-06-postfx-review-round1-evidence/`（四支 .mjs 可直接重跑，路徑已改成從該目錄執行；埠 8891–8896）。

## 結論先行

**CRITICAL 0 條、HIGH 2 條、MEDIUM 4 條、LOW 5 條。**

沒有找到會讓對決卡死的路徑。兩條 HIGH 都是「新增的層在被清掉的那一瞬間，沒有把狀態交還給它疊在上面的那一層」：

- **H-1**：`clearOrbitLean()` 把偏移歸零卻沒折回基座 → SKIP／對決在 2.2 秒內結束時，鏡頭單幀跳 **2.408** 世界單位（36.8°）；v0.34 同情境 0.00008。
- **H-2**：`bloom.setSize()` 無條件 `depthTex.dispose()` → 只要來一個「尺寸沒變的 resize 事件」，深度邊緣線**靜默消失**（線像素佔比 5.547% → 0），要等下一次真的換尺寸才回來。

作者宣稱的兩件事我重驗過都成立：`?edge=0` 與 v0.34 逐位元組相同（`silRel` 加入後仍然成立，且反面對照非 0）、`trace()` seeds 1..20 新舊 `index.html` 逐位元組相同。

---

## HIGH

### H-1（HIGH）clearOrbitLean 把偏移歸零卻沒折回基座 → 鏡頭單幀彈跳 36.8°

- **檔案:行號**：`js/camera-director.js:148-154`（`clearOrbitLean`）、`:164-177`（`onDuel`，`from.yaw -= ORBIT.yaw` 在 `:174`）、`:269-283`（寫入區塊的條件與四層合成式）。
- **觸發條件**：`ys:duel-end` 或 `ys:fx-trait-cancel` 在 **orbit 還在跑的時候**到來。orbit 的全長＝基座推進 700ms ＋ `ORBIT.ms` 1500ms ＝ 2.2 秒；`index.html:1768` 的 `sleep=ms=>setTimeout(r, SKIP?0:ms)` 讓 **按下 SKIP 之後整場對決塌成 0ms**，所以 `playDuel`（`index.html:4147` 派 `ys:duel`、`:4199` 派 `ys:duel-end`）必然落在 orbit 中段；`doSkip`（`index.html:1744`）另外還直接派 `ys:fx-trait-cancel`。兩條路都命中。
- **後果**：`clearOrbitLean()` 只把 `orbitU` 推到 1，`goto()` 又把 `from` 設成**上一個 target（不含偏移的基座）**，所以下一幀寫進去的位置少了整整 `ORBIT.yaw`。實測單幀位移 **2.407514** 世界單位（相機距離 4.2 下約 36.8°），對照 v0.34 的 0.000081；同一場景平滑補間的最大單幀位移是 0.152624，也就是**一幀就跳了 16 幀的量**。`forceWrite`（作者為了修「凍住」加的）確實避免了凍住，但它補寫的正是這個錯位的位置——把「凍住」換成了「瞬移」。
- **重現**：`node docs/experiments/2026-09-06-postfx-review-round1-evidence/cam-edge.mjs <out.json> 8893`，看 `SG_duelEnd_during_orbit` 與 `SH_traitCancel_during_orbit`（兩支 director 同頁同事件同 dt，舊版當對照；連跑兩次逐位元組相同）。

```
SG_duelEnd_during_orbit   : f1_new 2.407514  f1_old 0.000081
SH_traitCancel_during_orbit: f1_new 2.407594  f1_old 0
S0_clean_duelEnd（基準線）: f1_new 0.000081  max_new 0.152624
```

- **為什麼 `cam-unit.mjs` 沒抓到**：它的 S4（SKIP）量的是「清零之後的**殘留**」（`skipResidual` 對某個靜止參考點的偏差），清得乾不乾淨會過；它沒量「清零那一幀相對前一幀的位移」，而畫面上看得到的正是後者。`A4_skip_peak_before_deg > 5` 這個 PASS 條件甚至等於在保證「一定有一個 >5° 的落差要在一幀內消掉」。
- **建議修法（一句）**：`clearOrbitLean()` 不要直接把進度設 1，改成把當下的 `orbitOff`／`leanSign*LEAN.yaw*leanK` 與 `LEAN.dist*leanK` 折進 `from.yaw`／`from.dist` 之後再歸零（或讓 `goto()` 以「上一幀真正算出來的機位」當 `from`，而不是 `target`），偏移就會由基座補間平順吃掉。

### H-2（HIGH）bloom.setSize() 無條件 dispose 深度貼圖 → 一次「尺寸沒變的 resize」就讓邊緣線靜默消失

- **檔案:行號**：`js/bloom.js:222-227`（`setSize` 內 `if (depthTex) { …; depthTex.dispose(); }`，dispose 在 `:226` 排在 `sceneRT.setSize()` **之前**且不看尺寸有沒有變）、呼叫端 `js/renderer.js:243-246`（`window.addEventListener('resize', …)` 無條件呼叫 `bloom.setSize(window.innerWidth, window.innerHeight)`）。
- **觸發條件**：任何讓 `resize` 事件發生、但 `window.innerWidth/innerHeight` 沒變的情形（手機 180° 翻轉、軟鍵盤收合、全螢幕切回同尺寸、部分瀏覽器的 focus／devtools 事件）。此時 `renderer.setSize()` 與 `sceneRT.setSize()` 都是 no-op（three r158 的 `WebGLRenderTarget.setSize` 有 `if (this.width !== width …)` 保護），**framebuffer 不會重建**，但 `depthTex` 的 GL 物件已經被刪掉、`properties` 也被移除。
- **後果**：下一次合成 pass 綁 `tDepth` 時，three 走 `uploadTexture` 重新配一張**空的**深度貼圖（不是掛在 FBO 上的那張），shader 讀到的深度是常數 → `dEdge`／`nEdge` 全 0 → **深度邊緣線完全消失，而且沒有任何錯誤訊息**；要等下一次真的改變尺寸把 FBO 重建才恢復。附帶留下一張全解析度、沒人用的深度貼圖（1688×780 約 5MB）。
- **重現**：`node docs/experiments/2026-09-06-postfx-review-round1-evidence/edge-resize-probe.mjs <out.json> --port=8891 --n=3`。同一頁同一幀連拍，中間只插一次 `bloom.setSize(innerWidth, innerHeight)`：

```
pctBefore            5.547   （edge off / on 的線像素佔比差）
pctAfterSameSize     0       ← 同尺寸 setSize 一次，線全沒了（與 edge 關掉逐位元組相同）
pctAfterRealResize   5.547   ← 真的換尺寸再換回來就恢復
pctAfterRealResize2  5.547
```
（第二次獨立跑：5.547 → 0 → 5.547；換一場名冊跑：4.95 → 0 → 4.95。反面也成立：健康狀態下這支探針量得到 ~5% 的差，不是恆 0 的探針。）
- **建議修法（一句）**：把那三行放進「`fw`／`fh` 真的變了」的判斷裡，或直接刪掉 `depthTex.dispose()`——`sceneRT.setSize()` 內部的 `dispose()` 在尺寸真的變時已經連帶釋放 depthTexture（three r158 `deallocateRenderTarget` 會呼叫 `renderTarget.depthTexture.dispose()`）。

---

## MEDIUM

### M-1（MEDIUM）lean 在飛行中被清零 → 單幀跳 0.50 世界單位

- **檔案:行號**：同 H-1（`js/camera-director.js:148-154`）。
- **觸發條件**：`ys:fx-trait` 之後 `LEAN.ms`（＝`PW_FX.TRAIT_MS` 900ms）內來 `ys:duel-end` 或 `ys:table`。招式拍與收場拍在三拍時間軸上相隔常常 <900ms。
- **後果／證據**：`SA_leanPeak_duelEnd` f1_new **0.504283** vs f1_old 0.000091；`SE_leanPeak_table` 0.504148 vs 0.000091。同族的**既有** punch 情境 `SI_punchPeak_duelEnd_baseline` 是 0.415986（新舊相同）——所以「歸零就是瞬間歸零」這個樣式是既有的，但 (b) lean 讓它的**發生頻率**從「每次命中」變成「每一招」，量級也大了兩成。與 H-1 同一個修法一併解決。

### M-2（MEDIUM）lean 與 burn punch 都會動 `dist`，而 `dist` 正是排法鎖點的閘門

- **檔案:行號**：`js/camera-director.js:62-66`（`LEAN.dist = 0.3`）、`:216-218`（`onBurn` → `onPunch({power:1.5})`，`PUNCH.dist 0.6 × 1.5 = 0.9`）、`js/duel-figures.js:467`（`camStable = Math.abs(dist - lastDist) < 1e-3`）、`:561`（`allReady = camStable && …`）。
- **觸發條件**：三拍時間軸在基座推進（700ms）結束前就開跑——GLB 全命中快取時 `pwAwaitFigures` 幾乎立刻回，這是常態；`realign()` 的節流是 `ALIGN_MS = 150`，所以 lean（900ms）或 burn punch（420ms）在飛時會連續數次 realign 都 `camStable=false`。
- **後果**：`rowsFit[i]` 鎖不下來，`plan = search()` 每幀重算 → 排數／fit 可能在對決前段翻面，正是可讀性小卷第 3／4 輪覆審（H-2、M-2）花兩輪修掉的東西。作者對 (a) orbit 有意識地「只轉 yaw、不碰 dist」並在註解寫明，但 (b)(c) 兩層沒有套同一條紀律。
- **狀態**：**未實地重現**（需要「快取全中 ＋ 招式拍落在 700ms 內」的時序）；機制、行號與相互作用如上，屬推導。
- **建議修法（一句）**：`camStable` 改成看「基座 dist」而不是 `camera.position.length()`（導演多吐一個「無偏移機位」的 getter），或讓 (b)(c) 也只在鎖點完成後才允許動 dist。

### M-3（MEDIUM）reduced-motion 下多了一個 v0.34 沒有的鏡頭震動

- **檔案:行號**：`js/camera-director.js:75-77`（`prefersReduced`）、`:200-208`（`onTrait` 有 gate）、`:216-218`（`onBurn` **沒有** gate）、`:239`（`document.addEventListener('ys:fx-burn', onBurn)`）。
- **觸發條件**：使用者開了 `prefers-reduced-motion: reduce`，任何一次燒毀。
- **後果**：每次燒毀鏡頭推近 0.9 世界單位＋橫向微震（`PUNCH.shake 0.05 × 1.5`）。v0.34 的 director **完全沒有** `ys:fx-burn` 監聽器，所以這是本卷**新增**的動態，不是「維持現行」。凍結檔 `2026-09-06-acceptance-postfx.md` P-4 寫「`prefers-reduced-motion` 時 (a)(b) no-op、(c) 維持現行 punch」，`cam-unit.mjs` 的 `A6_PASS` 也把 `rBurnRatio === 1.5` 寫死成通過條件——凍結條文與治具都把這個新增動態當成既有行為。
- **建議修法（一句）**：要嘛把 `onBurn` 也用 `prefersReduced()` gate 起來，要嘛請使用者針對「reduced-motion 下燒毀仍震鏡」明確簽准並把凍結條文的措辭改掉（依 `02 §2.1`，動凍結條要走同意程序）。

### M-4（MEDIUM）`bloomOK=false`（軟體 GL）路徑：邊緣線確實不畫，但外殼照畫，mesh 數翻倍

- **檔案:行號**：`js/renderer.js:223-228`（`if (bloomOK && …) bloom.render() else renderer.render()`）、`js/creature-figures.js:455-476`（每顆本體 mesh 掛一顆外殼）、`:355-375`（`createOutlineWarmup` 常駐、`frustumCulled=false`）。
- **觸發條件**：SwiftShader／llvmpipe／Android WebView 軟解。
- **後果**：`bloom.render` 不被呼叫 → 深度邊緣線不畫（這一半的凍結條成立）；但 P-1 的反轉外殼是**場景物件**，`renderer.render()` 照畫。實測每尊 mesh 數翻倍：`sword` 19→38、`redhat` 18→34、`boartusk` 14→28（`shell-audit.json`）。軟體光柵正是被本卷判定「跑不動全畫面後製」的那條路，卻在這條路上多了一倍的 draw call 與一支帶 skinning 的自訂 vertex shader。凍結檔 P-3 只寫「`bloomOK=false` 路徑逐位元組不變」，這句對邊緣線成立、對外殼不成立。
- **狀態**：**未在軟體 GL 上量過**（本機只有 ANGLE/AMD D3D11）。
- **建議修法（一句）**：在 `bloomOK=false` 時把外殼一併關掉（`setOutlineCrowd` 旁邊多一個總開關），或補一次 `--use-gl=swiftshader` 的 `duel-perf` 量測再決定。

---

## LOW

- **L-1**：`OUTLINE_SKIP_MAT`（`js/creature-figures.js:262`）是**死碼**。實測 8 隻（6 隻 haunt 全含）**沒有任何 mesh 的材質陣列是 ghost 與非 ghost 混用**（`shell-audit.json`：`mixedMeshes` 全部 0，ghost 一律是單材質獨立 mesh），所以 `mats.every(isGhost)` 那條早退就整顆跳過了，`pick()` 永遠選不到它。連帶結論：任務單問的「`depthTest:false, colorWrite:false` 會不會影響深度／排序」**不成立**（材質沒被用到）；它是模組級單例、又會被 `figure.dispose()`（`:648-652`）的 traverse 釋放掉，但 `dispose()` 全 repo 沒有呼叫端（`grep -n "\.dispose()" js/duel-figures.js js/renderer.js` 無命中），所以也不會發作。建議刪掉，或加註「保留給未來混材質的 GLB」。
- **L-2**：`js/bloom.js:95` `uniform vec3 uEdgeCfg; // (maxDepth, sobelW, 未用)` 註解過時——`.z` 就是第 4 輪加入的 `EDGE.silRel`（`:142` `float inner = 1.0 - step(uEdgeCfg.z, jump);`）。`setEdgeParams()`（`:279-291`）也沒有 silRel 的入／出口，`edge-shot --sweep` 掃不到這個參數。
- **L-3**：`js/renderer.js:165` 的 `edgeOn` getter 少了 `kind === 'duel'`，標題頁／牌桌時會回報 `true`，與 `:222` 每幀真正傳給 `bloom.setEdge` 的條件不一致。治具改用 `bloom.edgeOn`（`edge-shot.mjs` 的 `edgeOnAtDuel`）才是對的，所以只是誤導性出口。
- **L-4**：`js/camera-director.js:206` `leanMs = Math.max(1, Number(d.ms) || LEAN.ms)`：`d.ms` 給負數會夾成 1ms，lean 靜默不發生（`SF_trait_negativeMs` 單幀位移 0）。不會壞，但失敗方式是「安靜地不做」。
- **L-5**：`?edge=0` 仍然會把 24-bit `DepthTexture` 掛上 `sceneRT`（`js/bloom.js:174-190`），取代預設的 16-bit depth renderbuffer——「逐位元組不變」不是由構造保證的，是量出來的（深度精度變了，理論上 z-fighting 可能不同）。我在 HEAD 重量仍是 0（見下），但這個等式跟內容／視角有關，不保證換場景還成立。

---

## 逐項回覆任務單的必查清單

### 1. camera-director 四層合成與三個清零入口
- `ys:duel-end`／`ys:fx-trait-cancel`／`ys:table`／`ys:reveal`／`ys:end` 五個入口都呼叫了 `clearOrbitLean()`，`forceWrite` 也**確實**讓「四層都不在跑、基座 `t` 已到 1」時仍補寫一幀 → **凍住 bug 真的修掉了**（`SD_reveal_during_orbit` 之後位置持續更新，無殘留）。但補寫的是錯位的位置 → 見 H-1／M-1。
- 「duel-end 與下一個 `ys:duel` 在同一幀」：`SC_duelEnd_then_duel_sameFrame` f1_new **2.747047** vs f1_old **2.747437**——新舊幾乎相同，這是 `goto()` 既有的「`from = target` 而非當前位置」造成的，**不是本卷引入**；作者把 `from.yaw -= ORBIT.yaw` 排在 `goto()` 之後的算法在這一格是對的（第 0 幀的基座＋orbit 正好抵銷）。
- 「連續兩個 `ys:duel` 沒有 duel-end」：`SB_duel_during_orbit` f1_new **2.406845** vs f1_old 0.001302 → 同 H-1 的機制。**這條在出貨路徑上不可達**（`playDuel` 每場都配一次 `ys:duel-end`，`index.html:4147/4199`），但治具（`edge-shot.mjs`、`faction-sheet.mjs`）會在真對決中途插一發合成 `ys:duel`，那條路上會踩到。
- reduced-motion 下 (a)(b) 整段 no-op（`onDuel` 不設 `orbitU`、`onTrait` 直接 return），所以 H-1 的瞬移在 reduced-motion 下不會發生；(c) 見 M-3。

### 2. `crowded` getter 與每幀 `setOutlineCrowd`／`bloom.setEdge`
- **切場瞬間不會閃**：`playDuel`（`index.html:4138-4147`）在**同一個 JS task** 內先 `ov.style.display="flex"` 再 `fx3d("ys:duel", …)`，中間沒有 rAF，所以不存在「`sceneKind()` 已經回 'duel'、但 `roster` 還是上一場」的畫格。收場側 `ov.classList.remove("on")` 後 `#duel` 還顯示 300ms，此時 `kind` 仍是 'duel'、`roster` 也還是同一場的，兩邊一致；`display="none"` 之後 `kind` 變 'table'，`crowded` 被 `kind === 'duel' &&` 短路成 false，而那時 `onDuelEnd` 已經把所有 figure 藏起來了。作者在 `duel-figures.js:716-717` 的註解（不看 `active`、看 `roster`）是對的。
- **PAPERWAR_ON 關**：`onDuel` 的 `fallback = [{id:0, body:'single'}]`（`duel-figures.js:349-353`）讓每邊 1 尊 → `crowded` 恆 false → 外殼 2.0px、邊緣線開，與設計一致。
- **第一場之前**：`roster` 初值 `[[], []]` → `max(0,0) >= 5` 為 false，無 NaN／undefined 風險。
- 實測：`edge-resize.json` 的 `crowded:false`（n=3）；`merged/edge-final-n8.json` 的 `edgeOnAtDuel:false`（n=8）。**沒有找到閃爍。**

### 3. 外殼（P-1）
- `SkeletonUtils.clone` 沒有再做一次；外殼與本體 **`skeleton` 同一個物件、`geometry` 同一個物件、`bindMatrix` 逐元素相同、`bindMode='attached'`、`matrixWorld` 逐元素差 <1e-12**——8 尊 ×（4–19 顆殼）全數成立（`outline-ghost.json`、`shell-audit.json`）。
- **dissolve／visible 同步**：8 隻全數 `shellsAllVisibleBefore=true`、`shellsAllHiddenAfterBurn=true`、`shellsVisibleAfterReset=true`（`shell-audit.json`）。`setDissolve` 同步餵 `shellU`（`creature-figures.js:501`）、`DISSOLVE_CUT` 是本體與外殼共用的同一段 GLSL（`:156-160`）。**沒有找到脫節。**
- `ghost_*` 多材質分組：見 L-1，實測沒有混材質 mesh，`OUTLINE_SKIP_MAT` 從未被掛上；ghost mesh 是整顆不掛殼。深度／排序影響因此不存在。
- **dispose 路徑**：`dispose()`（`:645-654`）只釋放材質與 `shadow.geometry`，外殼共用的 GLB geometry **沒有**被誤釋放（外殼 mesh 不擁有 geometry，`traverse` 也只碰 `o.material`）。且 `dispose()` 在 `js/duel-figures.js`／`js/renderer.js` 中**沒有任何呼叫端**，figure 走的是 `onDuel` 的池化 `reset()`。**沒有找到洩漏或誤釋放。**
- `createOutlineWarmup`：永遠在場（`renderer.js:117` `scene.add(…)`）、`frustumCulled=false`、放在 y=-30。**全 repo 沒有任何 `Raycaster`**（`grep -rn "Raycaster" js/ index.html` 無命中），所以撿不到；每幀多一個 3 頂點的 draw call。programs 實測穩定在 **23**（`?outline=0` 時 21，即外殼佔 2 支：render target 線性與直接輸出 sRGB 兩個變體），第 2、3、4、5 場都沒有增加 → 暖身有效。

### 4. bloom
- **`DepthTexture` 在 `setSize` 時是否跟著重建**：→ **H-2，有 bug。**
- **WebGL1 無擴充 → `edgeReady=false`**：`bloom.js:175` `const ok = isWebGL2 || !!gl.getExtension('WEBGL_depth_texture')`；拿不到就 `depthTex=null`、`sceneRT.depthTexture` 不設、`render()` 的 `edgeWant && depthTex` 短路成 `uEdge=0`、`edgeReady` getter 回 false。`tDepth` uniform 值為 `null` 時 three 綁 `emptyTexture`，不會炸。**路徑正確。**（本機無 WebGL1 環境，未實跑；判讀來自程式碼與 three r158 的 `setValueT1` 行為。）
- **`silRel` 加入後 `?edge=0` 逐位元組不變**：**仍然成立，已在 HEAD 重量**。`edge-shot.mjs --baseline=5f76adc --n=3` →
  `basePctD0 = 0`（`baseNumD0 = 0` 個像素：新版 `setEdge(false)` 與 v0.34 的 bloom 模組在**同一幀**逐位元組相同）、
  反面對照 `baseOnPctD0 = 5.019%`（edge 開著時**必須**不為 0，證明這支探針量得到東西）、
  `edgePctD8 = 4.91%`（落在驗收窗 [0.5%, 6%]）、`programs [23,23,24]`。輸出：`edge-baseline-n3.json`。
  **附帶揭露**：作者最終版的證據檔（`merged/edge-final-n3.json`、`merged/edge-measure-r4.json`）`basePctD0` 全是 `null`——`--baseline` 只在第 1–3 輪（`edge-measure*.json`、`edge-discriminate.json`，programs `[21,21,22]`）跑過，**`silRel` 進來之後沒有再驗一次**。這一條是我補的。

### 5. 同種子等價（`IMPLEMENTATION_GUIDE.md:547-549` 規程）

```
$ git show 5f76adc:index.html > _scratch/old.html
$ node _scratch/trace-cmp.js _scratch/old.html index.html
old bytes 310435 new bytes 310435
IDENTICAL
```

鑑別力（反向驗證，`02 §6.1` 第 1 條）：把新版複製一份、只把 `CFG.LIFE: 50` 改成 `49`，同一支腳本 →

```
old bytes 310435 new bytes 316709
DIFFERENT
first diff at 164   （"life":42 → "life":41）
```

所以「IDENTICAL」不是恆真訊號。腳本：`docs/experiments/2026-09-06-postfx-review-round1-evidence/trace-cmp.js`。

`Math.random` 計數（任務單寫「全 0」，**實情不是**，但沒有退步）：

```
$ grep -c "Math.random" index.html js/*.js
index.html:0  bloom.js:0  bridge-players.js:0  camera-director.js:0  characters-billboard.js:0
creature-figures.js:1  duel-figures.js:0  particles.js:18  renderer.js:1  scene-env.js:0  trait-fx.js:0
```

`creature-figures.js:844` 與 `renderer.js:93` 兩處都是**註解文字**（「3D 層新程式碼不用 Math.random」），`particles.js` 的 18 處是既有債（該檔檔頭 `:2`、`:135` 已載明，本卷未動該檔）。三個數字在 `5f76adc` 上逐一相同（1／1／18），**本卷沒有新增任何亂數來源**。

### 6. `index.html` 只改 VERSION／VERSION_NOTE
`git diff 5f76adc..8d28fc7 -- index.html` 只有一個 hunk、一行改動（`index.html:1672`：`VERSION="0.34"`→`"0.35"` 與 `VERSION_NOTE`）。**確認沒有別的。**

---

## 查過、沒找到的類別（附查法）

| 類別 | 結論 | 查法 |
|---|---|---|
| 對決卡死／死結 | 沒找到 | `orbitHold` 唯一解除點是 `update()` 裡的 `t >= 1`，而 `t` 每幀單調遞增且 `durMs ≥ 1`；`forceWrite` 在寫入區塊內必被清；本卷沒有新增任何 Promise／等待。四支探針共跑 20+ 場合成對決，`errors: []`。 |
| 滿編收斂開關閃爍 | 沒找到 | 見上面第 2 點：`#duel` 顯示與 `ys:duel` 派送同一個 JS task，中間插不進畫格；`roster` 只在 `onDuel` 換。 |
| 外殼與本體脫節（位置／燒毀／隱藏） | 沒找到 | `shell-audit.mjs`／`outline-ghost-probe.mjs` 逐殼比 `skeleton`／`geometry`／`bindMatrix`／`matrixWorld`／burn 後 `visible`／reset 後 `visible`，8 隻全綠。 |
| SKIP 後**殘留** | 沒找到（但有**瞬移**，見 H-1） | `cam-unit.mjs` 的 A4 殘留為 0；我的 `SH` 也確認 cancel 之後位置持續更新、不凍。 |
| 記憶體／program 洩漏 | 沒找到 | `renderer.info.programs.length` 連跑 5 場合成對決恆定 23（`?outline=0` 恆定 21）。第一場含 `ghost_*` 尊時 23→24，但 `?outline=0` 下同樣 21→22，**證明那一支是既有的 ghost 半透明本體材質變體，不是本卷造成**（`outline-ghost.json` vs `outline-ghost-off.json`）。外殼材質一尊一顆、figure 由 `duel-figures` 池化不重建；外殼 geometry 共用、無人 dispose。 |
| `?outline=0` 關不乾淨 | 沒找到 | `outline-ghost-off.json`：`shells: 0`、`outlineColor: null`、programs 21（比開啟少 2 支）、`createOutlineWarmup` 回空 Group。`renderer.js` 仍每幀呼叫 `setOutlineCrowd()`，但那只寫一個沒人讀的 uniform。 |
| `bloomOK=false` 路徑被改變 | 邊緣線：沒改（正確）；外殼：**有改**，見 M-4 | 讀 `renderer.js:223-228`＋`bloom.render` 的 `edgeWant && depthTex` 短路；外殼是場景物件，兩條路都畫。 |
| warmup 被 frustum／raycast 撿到 | 沒找到 | `grep -rn "Raycaster" js/ index.html` 無命中；`frustumCulled=false` 是刻意的（要每幀真的被畫才編得掉 program），程式碼與 programs 實測一致。 |
| 外殼 geometry 誤 dispose／材質洩漏 | 沒找到 | `dispose()` 只碰 `o.material` 與 `shadow.geometry`；且全 repo 無呼叫端。 |
| reduced-motion (a)(b) 失效 | 沒找到 | `cam-unit.mjs` A6 `rNoop === 0`；(c) 是**刻意**保留，見 M-3。 |

---

## 環境
- worktree `C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a1ecca90770e53c35`（**不是**主工作樹；主工作樹在 `8d28fc7`／main，本 worktree 建立時停在 `5f76adc`，覆審前 `git reset --hard 8d28fc7`）。
- GPU：`ANGLE (AMD, AMD Radeon 780M Graphics, Direct3D11)`；全部治具帶 `--use-gl=angle --use-angle=d3d11`；埠 8891–8896。
- `tools/anyCreature` 以 junction 指向主工作樹（`.gitignore` 已含）。
