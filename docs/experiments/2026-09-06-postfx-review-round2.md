# 後處理卷 對抗式覆審 第 2 輪（2026-09-06）— 反駁「已修好」

- 受審 commit：`ae7b77b`（`7f56084` H-2 修 ＋ `680789c` H-1／M-1／M-2／M-3 修的合併）。基準：`59f7483`（第 1 輪覆審、只審不改碼）、`5f76adc`（v0.34）。
- 覆審框架：**反駁「我已修好這個宣稱」**，逐條要「真的修好／表面修好／沒修到」三態。不採信作者的量測窗——所有運鏡結論都用本輪自己的探針**逐幀量整段**重取。
- 本輪探針與原始輸出：`docs/experiments/2026-09-06-postfx-review-round2-evidence/`（五支 `.mjs` 可直接重跑；埠 8901–8913）。
- 環境：worktree `.claude/worktrees/agent-a41ee1fe0e211cb25`（**不是**主工作樹，覆審前 `git reset --hard ae7b77b`）；GPU `ANGLE (AMD, AMD Radeon 780M Graphics, Direct3D11)`；`tools/anyCreature` 以 junction 指向主工作樹。**沒有改任何程式碼**。

---

## 結論先行（五條三態，一行一條）

| 覆審條 | 作者宣稱 | 本輪裁定 | 一句話 |
|---|---|---|---|
| **H-2** bloom.setSize 無條件 dispose 深度貼圖 | 真的修好 | **真的修好** | 同尺寸 ×3、真換尺寸、**dpr 變化**、dpr 後再同尺寸——四種情形線像素佔比全部 4.944%；同一支探針換回 `59f7483` 的 `bloom.js` 立刻紅（同尺寸 → **0**），兩個方向都驗。 |
| **H-1** clearOrbitLean 沒折回基座 → 單幀跳 2.41 | 真的修好 | **表面修好** | 六個清除入口的**當幀**確實修好（2.4075 → ≤0.000656，我獨立量到同值）；但折回段（最長 700ms）**進行中**再來一個 goto 入口，`goto` 的起點退回 `target`＝折回終點 → 單幀跳 **2.2662**（治具）／**2.3067**（真實頁面）。SKIP 出貨路徑可達（見 N-1）。 |
| **M-1** lean 被清零單幀跳 0.50 | 真的修好 | **真的修好**（字面） | `E4/E5/E6` 我獨立量到 0.000092／0.000069／0.001089。但同一層的**上升沿**沒動：`ys:fx-trait` 當幀橫跳 **0.6324**（v0.34：0），比它剛修掉的 0.50 還大，見 N-3。 |
| **M-2** lean 與 burn punch 都動 `dist`（＝排法鎖點閘門） | 真的修好 | **表面修好** | (b) lean 真的修好（lean 窗 \|Δlength\| 修前 0.28364 → 修後 **8.88e-16**，我獨立量到）；**(c) burn punch 完全沒動**——burn 窗 \|Δlength\| 修前 0.75755 → 修後 **0.75755**（逐值不變），而 A8 的量測窗 `lenStep(traitAAt, burnAt)` 正好停在 burn 之前。 |
| **M-3** reduced-motion 下多一個燒毀震鏡 | 真的修好 | **真的修好** | reduced 下 `ys:fx-burn` 位移 0、\|Δlength\| 0；同場 `ys:fx-punch` 仍動 0.50611（證明治具有餵到事件）。**但**它動到凍結檔 P-4 的措辭，使用者尚未簽字（作者已自陳，見文末）。 |

**新 finding：HIGH 1、MEDIUM 2、LOW 4**（清單在「新 finding」一節）。

`M-4`／`L-1`～`L-5` 作者未動，逐條處置判在最後一節（`L-2` 的註解那半邊其實已在 `7f56084` 順手修掉）。

---

## 逐條反駁

### H-2 → **真的修好**

作者的修法：`js/bloom.js:224` 加 `const sizeChanged = sceneRT.width !== fw || sceneRT.height !== fh;`，`:225` 把 `depthTex.image` 改寫＋`dispose()` 包進 `depthTex && sizeChanged`。

**單位問題（任務單問的）**：`sceneRT.width` 與 `fw` **是同一把尺，由構造保證**——`sceneRT` 全 repo 只有 `js/bloom.js:231` 這一個寫入點 `sceneRT.setSize(fw, fh)`，three r158 的 `RenderTarget.setSize` 就是把傳進去的值存進 `this.width`。所以 `sceneRT.width !== fw` 比的是「上一次傳進去的 framebuffer 寬」對「這一次算出來的 framebuffer 寬」，不是 CSS 像素對 framebuffer 像素。

**實測（`edge-resize-r2.mjs`，844×390 CSS／dsf 2／framebuffer 1688×780，6 尊）**：作者只驗了「同尺寸一次」與「真換尺寸」兩格，我另外加了 dpr 這一格（`renderer.setPixelRatio(1)` → `setSize` → 再切回 2）——因為 dpr 正是「CSS 尺寸沒變、framebuffer 尺寸變了」的情形，若判斷式用錯尺就會在這裡露餡。

```
                              HEAD(ae7b77b)   修復前(59f7483)
pctBefore                     4.944           4.806
pctAfterSameSizeX3            4.944           0        ← 同尺寸 setSize 連三次
pctAfterRealResize            4.944           4.806
pctAfterDprChange             4.944           4.806    ← dpr 2→1→2
pctAfterDprThenSameSize       4.944           0
errors                        []              []
```

鑑別力兩個方向都成立：修復前同尺寸 → 0（線全沒了，與 edge 關掉相同），修復後 → 4.944（與 before 逐值相同）；且探針在健康狀態下量得到 ~4.9% 的差，不是恆 0 的探針。**沒有找到殘留路徑**：`renderer.js:243-246` 的 resize handler 不重設 `setPixelRatio`，所以 `renderer.getPixelRatio()` 與 `fw` 的算法在 handler 內自洽。

---

### H-1 → **表面修好**（清除當幀修好了，折回段變成新的破口）

#### 已修好的部分（我獨立重量，逐幀量整段 240 幀，不用作者的窗）

`cam-r2.mjs` 的 A 組：定場到牌桌靜止 → `ys:duel` → 60 幀（推進已完成、orbit 轉一半）→ 派清除事件 → 逐幀量 240 幀（4 秒，遠大於折回 700ms）。

```
scene                                  f1        max       @frame   old(v0.34)  dLenMax
A1_duelEnd_during_orbit                0.000029  0.058096  26       0.152624    0.032114
A2_traitCancel_during_orbit            0.000148  0.175812  20       0           8.88e-16
A3_table_during_orbit                  0.000029  0.058096  26       0.152624    0.032114
A4_reveal_during_orbit                 0.000137  0.103791  16       0.247075    0.088182
A5_end_during_orbit                    0.000022  0.130868  42       0.170377    0.076716
A6_duel2_during_orbit                  0.000656  0.825567  20       0.819084    1.78e-15   ← max 是 v0.34 既有的 180° 擺盪
A7_traitCancel_during_orbit_AND_lean   0.000258  0.175124  15       0           1.78e-15
B1_duelEnd_during_push（t<1）          0.000002  0.004941  26       2.532570    0.0029961
B2_traitCancel_during_push             0.000135  0.191981  21       0.194466    0.037038
```

同一支探針換到 `59f7483` 的 director（`--new=/tests/tools/_tmp-prefix-camdir.js`）：

```
A1 2.407514 / A2 2.407594 / A3 2.407514 / A4 2.407237 / A5 2.407577 / A6 2.406845
A7 1.803825 / B1 2.718028 / B2 1.990526      ← 全部紅在**位移量**這個行為斷言上
```

**決定性**：同指令連跑兩次（`cam-r2-head.json` vs `cam-r2-head-run2.json`）逐鍵逐值相同。

**折回期間 `camera.position.length()` 是否恆定（鎖排法閘門）**：`A2` `A6` `A7` `F1` 的 `dLenMax` 都是 8.88e-16～1.78e-15（浮點噪聲），**恆定成立**。`A1/A3/A4/A5` 的 0.03–0.09 是後續 `goto` 換機位造成的（table 3.6／reveal 3.2／end 6.4），設計如此。修復前 `A7` 的 `dLenMax` 是 **0.2107** → 修後 1.78e-15，這一項也真的改善了。

**reduced-motion**：A1–A7 在 reduced 下與 v0.34 逐值相同（0～0.152624）。`B1` 在 reduced 下是 **2.53257**——但那與新版 normal 的 `old_max` 同值，是 v0.34 就有的 `goto(from=target)` 瞬移，**不是本卷造成**。

**duel-end 與下一個 duel 同幀**：`H1` 新 1.077288 / 舊 2.746786 → 比 v0.34 好，不是退步。

#### 沒修好的部分 → **N-1（HIGH）**

`clearOrbitLean()`（`js/camera-director.js:187-203`）把「當下實際機位」記進 `foldFrom`，`goto()`（`:166-170`）才會用它當補間起點。但兩件事湊在一起留了一個 700ms 的破口：

1. `foldFrom` 在 `update()` 結尾被無條件作廢（`:350`）——它只活**一幀**；
2. `clearOrbitLean()` 在「偏移已經歸零」時 `active=false` 早退（`:193`），**不記 `foldFrom`**，於是 `goto()` 的 `src` 退回 `target`（`:167`）——而此刻的 `target` 正是**折回的終點**。

所以：`ys:fx-trait-cancel` 開始折回 → 中間過了 ≥1 幀 → 來一個 goto 入口 → 鏡頭一次跳完剩下的折回量。

`cam-r2.mjs` C 組（折回開始後第 10 幀再派事件，逐幀量 240 幀）：

```
scene                          HEAD f1     HEAD max    修復前(59f7483) f1 / max
C4_duel_midFold                2.265545    2.265545    0.000788 / 0.991119
C6_duelEnd_midFold             2.266218    2.266218    0.000081 / 0.152624   ← 修復前這一格根本沒有跳
C1_punch_midFold               0.530913    0.530913    0.506132 / 0.506132
C2_burn_midFold                0.792802    0.792802    0.759199 / 0.759199
C3_trait_midFold               0.681349    0.681349    0.673353 / 0.673353
C5_cancel_midFold              0.049102    0.175812    0        / 0
C7_trait_then_cancel_midFold   0.583479    0.583479    0.673353 / 0.673353
```

`C6` 這一格要特別看：**修復前是 0.152624，修復後是 2.266218**。修復前 cancel 當幀就已經瞬移完畢、之後是靜止的基座，所以「10 幀後再來一個 duel-end」什麼事都沒有；修復後多出一段 700ms 的折回狀態，goto 落在裡面就把剩下的量一次跳掉。也就是說這不只是「H-1 沒修乾淨」，是**修法本身造出一個新的可跳窗**。

**真實頁面驗證（`fold-race.mjs`，不是單元治具）**：真實 `index.html?paperwar=1&fxcount=1&seed=7`、真實 director、真實 rAF，只控制 cancel 與 duel-end 之間有沒有隔一幀：

```
sameFrame（cancel 與 duel-end 同一個 task）  maxStepAtDuelEnd±4 = 0.721526   ← 這是 punch 那一層，不是折回
oneFrameApart（中間隔一個 rAF）              maxStepAtDuelEnd±4 = 2.306696   ← 折回被一次跳完
```

**出貨可達性（`skip-real.mjs`，真實頁面按真的 SKIP 鍵）**：`doSkip()`（`index.html:1744`）同步派 `ys:fx-trait-cancel`，然後 `SKIP=true` 讓 `sleep` 全塌成 0ms，`playDuel` 很快派 `ys:duel-end`（`index.html:4199`）。六次真實 SKIP 的間隔與當時的畫格週期：

```
skipat  fps    cancel@ms   gap(cancel→duel-end)  frame period  stepAtDuelEndFrame
100     48.1   360.4       2.2 ms                20.8 ms       0.042036
400     48.5   401.5       1.2 ms                20.6 ms       0.049723
900     53.8   906.4       0.8 ms                18.6 ms       0.001273
1100    53.9   1106.2      0.7 ms                18.6 ms       0.039935
1500    48.2   1506.2      0.5 ms                20.7 ms       0.054272
2000    47.5   2003.6      16.0 ms               21.1 ms       0.000726
```

六次都沒有畫格落在 gap 裡（所以六次都沒跳）。但 gap 是 0.5–16 ms、畫格週期 18.6–21.1 ms，**畫格落進 gap 的比例就是 gap/週期 ≈ 2.4%–76%（六次平均約 18%）**；偏移最大的時段（SKIP 按在 0.9–1.5 s）gap 是 0.5–0.8 ms ≈ **每次 SKIP 約 3–4%**。這是一個機率性、但確定會發生的出貨路徑瞬移，量級 2.31（＝原 H-1 的 96%）。

**為什麼 cam-unit 沒抓到**：`tests/tools/cam-unit.mjs` 的 E2（`:162`）、E6（`:182`）、S4（`:131-134`）在派 `ys:fx-trait-cancel` 之後**一律 `H.step(120)`（2.00s）才發下一個事件**——折回段最長 700ms（42 幀），120 幀正好把整個折回窗跨過去。斷言集裡沒有任何一格落在折回進行中。

**建議修法（一句，不在本輪職權內執行）**：`goto()` 的起點改成「上一幀真正寫進 `camera.position` 的那個機位」（`cur*` 已經每幀在記了），而不是 `foldFrom || target`——那也正是第 1 輪覆審 H-1 給的第二個選項；作者選了「`from=target` 的 v0.34 語意不動」，破口就出在這裡。

---

### M-1 → **真的修好**（字面），但同一層的上升沿沒動 → **N-3（MEDIUM）**

清除側我獨立量到與作者相同（`E4/E5/E6` 對應我的 A 組 lean 情境，`cam-unit` 重跑逐值相同）。

但 `js/camera-director.js:330` `const leanK = 1 - easeOutCubic(leanU);` 在 `leanU=0` 時直接等於 1——lean **沒有上升段**，`ys:fx-trait` 當幀鏡頭就滿幅偏過去：

```
D3_lean_onset   HEAD f1 = 0.632427   v0.34 = 0（沒有這一層）   修復前 = 0.673353
D1_punch_onset  HEAD f1 = 0.506132   v0.34 = 0.506110（既有）
D2_burn_onset   HEAD f1 = 0.759198   v0.34 = 0（沒有這個監聽器）
```

也就是說：這一輪花了整整一次修復把 lean 的**下降沿**從 0.50 壓到 0.0001，而同一層的**上升沿 0.6324 原封不動**，比它剛修掉的還大 25%，而且每一招各發生一次（真實頁面一場對決 4–5 次 `ys:fx-punch`／`ys:fx-trait`）。A7 只量「清除當幀」，量不到上升沿。

依第 1 輪自己的分級尺（M-1 之所以是 MEDIUM，理由是「同族既有 punch 情境 0.4160，新舊相同」），lean 上升沿 0.6324 vs punch 上升沿 0.5061 同樣落在 MEDIUM。

真實頁面佐證：`skip-real.mjs` 無 SKIP 那一趟，`ys:duel` 之後整段的最大單幀位移是 **0.816204 @1288ms**，緊跟在 `ys:fx-punch @1258.3ms` 之後（含掉幀）——0.5–0.8 這一級的單幀跳在真機上是實際發生的，不是治具數字。

---

### M-2 → **表面修好**（只修了 (b)，(c) 原封不動且被排出量測窗）

第 1 輪的 M-2 標題就寫「**lean 與 burn punch 都會動 `dist`**」，行號同時點名 `LEAN.dist`（(b)）與 `onBurn → onPunch({power:1.5})`＝`PUNCH.dist 0.6×1.5=0.9`（(c)）。作者的修復表只寫「`LEAN.dist` 改 0」，(c) 一個字沒提，卻把整條判成「真的修好」。

`cam-r2.mjs` E 組（同一支探針、同一段時間軸，HEAD 對 `59f7483`）：

```
窗                 dLenMax @HEAD     dLenMax @修復前     判讀
E1_lean_window     8.8818e-16        0.28364            (b) 真的修好，且探針有鑑別力
E2_burn_window     0.75755           0.75755            (c) 逐值不變＝完全沒動
E3_punch_window    0.50511           0.50511            既有 punch（v0.34 old 0.50611），本卷未動
```

`camStable` 的閘門是 `Math.abs(dist - lastDist) < 1e-3`（`js/duel-figures.js:467`），`dist` 就是 `camera.position.length()`。burn 一次把它動 **0.75755**＝門檻的 **758 倍**，而 `onBurn` 這個監聽器是本卷**新增**的（v0.34 的 director 沒有它，`E2` 的 v0.34 欄是 0）。

`tests/tools/cam-unit.mjs:331`：

```js
const leanLenMax = Math.max(lenStep(R.traitAAt, R.traitBAt), lenStep(R.traitBAt, R.burnAt));
```

兩段窗都在 `burnAt` **之前**收尾。A8 因此永遠量不到 (c)。這正是「量測窗被挪到看不見問題的地方」。

**實際風險有多大（誠實揭露）**：真實頁面 `ys:duel → 第一發 ys:fx-punch @909ms → ys:fx-burn @1607ms`（`skip-real-noskip.json`）。`rowsFit` 的鎖點條件是 `camStable && 該側 GLB 全就位`，而 `dist` 只在基座推進（700ms）期間會動，之後 orbit 只轉 yaw；`realign` 節流 150ms，所以鎖點多半落在 850–1000ms。**burn（1607ms）通常在鎖點之後**，鎖住之後 `rowsFit[i]` 會被重用、只有 `!plan.ok` 才重選，而 dist 變小會讓佈局更容易塞下（`halfW`／`pxWorld` 同比縮小）——所以我**沒有實地重現排法翻面**。但 (c) 這半條沒有被修、沒有被斷言、而且新增的量級（0.9）比既有 punch（0.6）大 50%，「真的修好」這個判定不成立。

**M-2 的附帶問題（任務單問的：`LEAN.dist=0` 之後 lean 還看不看得出來）**：**看得出來，功能沒有消失。** `lean-px.mjs` 在真實頁面、真實相機、844×390 CSS 視窗上量：

```
camBefore.len 4.2 → camAfter.len 4.2      dLen = 0            ← M-2 的閘門守住了
相機世界位移 camMove = 0.4829
場上 5 尊 3D 妖的螢幕位移：6.32 / 5.93 / 7.81 / 7.17 / 11.04 px（中位 7.25 px）
桌面參考點：桌心 0 px（它就是 lookAt 目標）、四角 6.52 / 7.25 / 11.32 / 18.93 px
fov 50、aspect 2.164
```

一幀之內 6–19 px 的橫向甩動（人形約佔畫面寬的 0.7–1.3%，桌角到 2.2%），在 390px 高的手機直式畫面上是明顯看得到的。yaw ±10° 這一層自己就撐得住 lean 的表現力，`dist` 那 0.3 不是必要條件。

---

### M-3 → **真的修好**

`js/camera-director.js:270-273` `onBurn` 加了 `if (prefersReduced()) return;`。`cam-r2.mjs` 在 `reducedMotion: 'reduce'` 的分頁重跑全套：

```
D2_burn_onset   reduced f1 = 0   reduced max = 0   reduced dLenMax = 0
C2_burn_midFold reduced f1 = 0   reduced max = 0   reduced dLenMax = 0
E2_burn_window  reduced f1 = 0   reduced max = 0   reduced dLenMax = 0
D1_punch_onset  reduced f1 = 0.506110（＝v0.34 同值）  ← 反面對照：治具確實有餵事件，不是「什麼都沒發生」
E3_punch_window reduced f1 = 0.506110
```

`ys:fx-punch` 這條既有路徑在 reduced 下照動，證明 0 不是「探針沒接到事件」。**修好。**

未了的是程序面：這個修法把凍結檔 `2026-09-06-acceptance-postfx.md:18` 的「`prefers-reduced-motion` 時 (a)(b) no-op、**(c) 維持現行 punch**」的解讀改掉了（作者採「現行＝v0.34＝不震」）。作者已依 `02 §2.1` 自陳並掛起等使用者裁定，程序正確；但**條文與實作目前不一致，尚未簽字**。同一份清單裡還有第二項未簽：`LEAN.dist` 從凍結檔 P-4 (b) 明寫的 **−0.3** 改成 **0**（`js/camera-director.js:69`）。

---

## 新 finding

| 級別 | 檔案:行號 | 一句話 |
|---|---|---|
| **HIGH** | `js/camera-director.js:193`（`active` 早退不記 `foldFrom`）＋`:167`（`src = foldFrom \|\| target`）＋`:350`（`foldFrom` 每幀作廢） | 折回段（最長 700ms）進行中來一個 goto 入口，補間起點退回 `target`＝折回終點，單幀跳 **2.2662**（治具）／**2.3067**（真實頁面）；SKIP 出貨路徑上 `ys:fx-trait-cancel` 與 `ys:duel-end` 相隔 0.5–16 ms，畫格落進去的比例約 **3%–76%**（六次實測平均 ~18%）。修復前同一格是 0.152624 ＝**這是修法造出來的新窗**。 |
| **MEDIUM** | `js/camera-director.js:270-273`（`onBurn`）＋`tests/tools/cam-unit.mjs:331`（A8 的窗） | M-2 的 (c) 半條沒修：burn punch 仍讓 `camera.position.length()` 單幀變動 **0.75755**（`camStable` 門檻 1e-3 的 758 倍，v0.34 為 0），而 A8 的量測窗 `lenStep(traitAAt, burnAt)` 正好停在 burn 之前。 |
| **MEDIUM** | `js/camera-director.js:330`（`leanK = 1 - easeOutCubic(leanU)`，`leanU=0` → 1）、`:332` | lean 的**上升沿**沒有 ease-in：`ys:fx-trait` 當幀鏡頭橫跳 **0.6324**（v0.34：0），是 A7 門檻 0.20 的 3.2 倍、既有 punch 上升沿 0.5061 的 1.25 倍，每一招各一次；A7 只量清除幀，不量上升沿。 |
| **LOW** | `js/camera-director.js:201-202` | 折回時間只由 **yaw 差**算（`span / CLEAR_DEG_PER_MS`），但 `startTween` 會把 dist／tilt／lookY 一起重新補間 → 基座還在大幅移動時被壓縮加速：`G1_cancel_during_long_tween` 逐幀最大 **0.359335** vs 同段基準 `G0` 的 0.170377（2.1 倍，超過 A7 的 0.20）。出貨可達性低（要 lean 在 `ys:end`／`ys:table` 的長補間中被 cancel）。 |
| **LOW** | `tests/tools/cam-unit.mjs:286-298`（A4 窗說明）vs `:314-331`（A7 案例集） | 修復報告寫「折回段沒有變成空窗：它被新的 A7 逐幀盯著」——但 A7 的 E1–E9 是**另一組序列**，S4（orbit＋lean 同時在跑）那一條的折回不在 A7 的案例集裡。我獨立量到該格 0.175124（沒有藏東西），但「被 A7 盯著」這個涵蓋宣稱不成立。 |
| **LOW** | `tests/tools/cam-unit.mjs:344`（`A3_PASS`） | 不帶 `--base` 跑時 `dyaw`＝新舊相減＝0，`A3_PASS` 恆為 false、`ALL_PASS` 恆為 false（我實測 `ALL_PASS=false`）。治具無法自證，一定要記得帶 `--base`；建議沒帶時直接報錯，而不是輸出一份會被誤讀的 FAIL。 |
| **LOW** | `js/bloom.js:282-293`（`setEdgeParams`） | 第 1 輪 L-2 的註解那半邊已在 `7f56084` 修掉（`:95` 改成 `silRel＝外輪廓相對深度跳變門檻`），但 `setEdgeParams` 仍沒有 `silRel` 的入／出口，`edge-shot --sweep` 掃不到這個【試玩必調】參數。 |

---

## M-4／L-1～L-5 的處置（作者未動，各一句）

| 條 | 處置 | 理由 |
|---|---|---|
| **M-4**（`bloomOK=false` 下邊緣線不畫、外殼照畫、mesh 翻倍） | **應修**（或補一次 `--use-gl=swiftshader` 量測後由使用者裁定） | 不只是效能：凍結檔 P-3 寫「`bloomOK=false` 路徑逐位元組不變」，這句對邊緣線成立、**對外殼不成立**（`js/renderer.js:227` 走 `renderer.render()`，外殼是場景物件照畫）。這是條文與實作不一致，跟 M-3／M-2 那兩項一樣要嘛修、要嘛簽字，不能空著。 |
| **L-1**（`OUTLINE_SKIP_MAT` 死碼，`js/creature-figures.js:262`／`:464`） | **可接受** | 第 1 輪已實測 `mixedMeshes` 全 0、`pick()` 選不到它，且 `dispose()` 全 repo 無呼叫端；無副作用。建議加一行註解說明「保留給未來混材質 GLB」即可，不必動碼。 |
| **L-2**（`uEdgeCfg` 註解過時 ＋ `setEdgeParams` 無 silRel） | 註解那半邊**已修**；`setEdgeParams` 那半邊**可接受** | 註解在 `7f56084` 一併改掉了。缺出入口只影響治具掃參數的方便性，不影響行為；升 LOW 記錄即可（已列在新 finding）。 |
| **L-3**（`js/renderer.js:165` 的 `edgeOn` getter 少 `kind === 'duel'`） | **應修（一行、零風險）** | 它是 `window.__yaoshi3d` 對外的旗標，與 `:222` 每幀真正傳給 `bloom.setEdge` 的條件不一致；第 1 輪已因此被誤導過一次（治具要改用 `bloom.edgeOn` 才對）。留著就是下一個人再踩一次。 |
| **L-4**（`js/camera-director.js:257` `leanMs = Math.max(1, Number(d.ms) \|\| LEAN.ms)`，負數夾成 1ms） | **可接受** | 失敗方式是「安靜地不做 lean」，不會壞畫面也不會壞賽局；`d.ms` 的唯一產地是 `PW_FX.TRAIT_MS`，不會是負數。 |
| **L-5**（`?edge=0` 仍掛 24-bit `DepthTexture`） | **可接受** | 第 1 輪已在 HEAD 量到逐位元組差 0，且有反面對照（edge 開著時 5.019%）。它是「量出來的等式」不是構造保證，但代價只是深度精度變好、風險方向是 z-fighting 可能不同——記錄即可，不值得為它改架構。 |

---

## 我查過、沒找到問題的地方（附查法）

| 類別 | 結論 | 查法 |
|---|---|---|
| 折回期間 `\|camera.position\|` 是否恆定（鎖排法閘門） | **恆定** | `cam-r2.mjs` A2／A6／A7／F1 的 `dLenMax` = 8.88e-16～1.78e-15；修復前 A7 是 0.2107，探針有鑑別力。 |
| reduced-motion 下六個清除入口 | **與 v0.34 逐值相同** | `cam-r2.mjs` 兩個分頁（`reducedMotion: 'reduce'` / `'no-preference'`）跑同一套；`B1` 在 reduced 下的 2.53257 與新版 normal 的 `old_max` 同值＝v0.34 既有，不是本卷造成。 |
| 連續兩個 `ys:duel` 沒有 duel-end | **好轉，非退步** | `A6` 新 0.000656（當幀）／0.825567（max，落在 v0.34 就有的 180° 擺盪，舊版 0.819084）。 |
| duel-end 與下一個 duel 同幀 | **好轉** | `H1` 新 1.077288 / 舊 2.746786。 |
| 折回段中再來 punch／burn／lean | **只疊各自的上升沿，沒有額外放大** | `C1` 0.5309（單獨 punch 0.5061）、`C2` 0.7928（單獨 burn 0.7592）、`C3` 0.6813（單獨 lean 0.6324）；差值來自折回本身那一幀的移動量。 |
| 折回段中再來一次 `ys:fx-trait-cancel` | **安全** | `C5` f1 0.049102 / max 0.175812（`active=false` 早退，折回照跑完）。 |
| H-2 在 dpr 變化下 | **安全** | 見 H-2 表；`renderer.js:243-246` 的 resize handler 不重設 pixelRatio，`fw` 的算法自洽。 |
| 作者 cam-unit 的數字能不能重現 | **能，逐值相同** | 在 `ae7b77b` 上 `node tests/tools/cam-unit.mjs <out> --port=8901 --base=<v0.34 camera-director.js>` → A1 8.882e-16、A4 殘留 0、A5 ratio 1.5、A7 0.175812（worst E2）、A8 1.776e-15、A9 0、`ALL_PASS=true`（`cam-unit-reproduce-head.json`）。 |

---

## 重跑指令（全部從 repo 根執行）

```bash
# 先建 junction（.gitignore 已含）
cmd /c mklink /J "<worktree>\tools\anyCreature" "C:\Users\shung\OneDrive\桌面\妖市\tools\anyCreature"
git show 5f76adc:js/camera-director.js > _scratch/camdir-v034.js

# 作者治具重現（要帶 --base，否則 A3 恆假）
node tests/tools/cam-unit.mjs _scratch/camunit-base.json --port=8901 --base=_scratch/camdir-v034.js

# 本輪探針（--new 在 Git Bash 下要加 MSYS_NO_PATHCONV=1，不然路徑會被改寫）
node docs/experiments/2026-09-06-postfx-review-round2-evidence/cam-r2.mjs      _scratch/r2-head.json   --port=8902
git show 59f7483:js/camera-director.js > tests/tools/_tmp-prefix-camdir.js
MSYS_NO_PATHCONV=1 node docs/experiments/2026-09-06-postfx-review-round2-evidence/cam-r2.mjs _scratch/r2-prefix.json --port=8913 --new=/tests/tools/_tmp-prefix-camdir.js
rm tests/tools/_tmp-prefix-camdir.js

node docs/experiments/2026-09-06-postfx-review-round2-evidence/edge-resize-r2.mjs _scratch/edge-r2.json --port=8904 --n=3
git show 59f7483:js/bloom.js > _scratch/bloom-prefix.js
node docs/experiments/2026-09-06-postfx-review-round2-evidence/edge-resize-r2.mjs _scratch/edge-r2-prefix.json --port=8904 --n=3 --bloom=_scratch/bloom-prefix.js

node docs/experiments/2026-09-06-postfx-review-round2-evidence/skip-real.mjs  _scratch/skip-real-900.json --port=8903 --skipat=900
node docs/experiments/2026-09-06-postfx-review-round2-evidence/fold-race.mjs  _scratch/fold-race.json     --port=8906 --at=900
node docs/experiments/2026-09-06-postfx-review-round2-evidence/lean-px.mjs    _scratch/lean-px.json       --port=8905
```
