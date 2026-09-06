# 後處理卷 P-4 運鏡三段 — 實作與驗收報告（2026-09-06）

基準 `db8f301`（程式碼＝`5f76adc` v0.34，db8f301 只多兩份文件）。凍結驗收：`2026-09-06-acceptance-postfx.md` P-4／P-6。
只改 `js/camera-director.js`（事件定義、index.html、其他 js 一律沒動）；另新增兩支治具。

## 結論先行

| 項 | 結論 |
|----|------|
| **(a) 軌道環繞進場** | **PASS**。`ys:duel` 後推進到 DUEL_SHOT，落點偏開 −38°（掃過兩隊的起點），再以 DUEL_SHOT 的 dist／tilt 只轉 yaw 回到 duelYaw，ORBIT_MS 1500。orbit 期間逐幀 \|Δ`camera.position.length()`\| 單元治具 **8.882e-16**、真頁面 4 場最大 **6.997e-12**（門檻 1e-3）。 |
| **(b) 招式輕推** | **PASS**。side 'B'→yaw +10°、'A'→−10°，dist −0.3，`detail.ms`(900) 內回位。真頁面 2 個種子共 **9 個 `ys:fx-trait`，9/9 方向符號正確**，8/9 量得到回位且全部回到 0（1 個因連續 punch 蓋住量測窗，無法取樣）。單元治具回位殘差 0.0024°。 |
| **(c) 燒毀 punch 加強** | **PASS**。`ys:fx-burn` 觸發 punch，力道倍率實測 **1.500000**（對 power=1 的對照組）。**不會雙重 punch**——index.html 的燒毀路徑本來就不叫 `fxPunch`（見下「burn punch 是否雙重」）。 |
| **P-6 不退步** | **PASS**。T-6 後繼條、`traitfx-drive` 27/27、lineup R-1~R-4、console 0 error 全過（R-4 有一項需要說明，見該節）。 |

**一個要使用者裁定的觀察（不影響本卷驗收）**：載入快的場，第一個招式可能落在 orbit 還在轉的期間（seed 7 duel 4 在 +923ms、seed 11 duel 2／3 亦然），此時輕推疊在 −38° 的 orbit 偏移上，方向感會被 orbit 蓋掉。目前照凍結條文的規格保留原樣；若試玩覺得怪，候選解是「第一個 `ys:fx-trait` 進來時把 orbit 加速收尾」。ORBIT_MS／±10°／−0.3／×1.5 全部【試玩必調】。

---

## 三層合成順序

寫在 `js/camera-director.js:266-273` 的註解裡，實作在 `:274-288`：

1. **基座**：`from`→`target` 的 `easeInOutCubic` 補間，給 tilt／yaw／dist／lookY（v0.34 原樣，一行沒動）
2. **orbit（進場）**：只加 **yaw** 偏移，**dist 一律不碰**
3. **lean（招式）**：加 yaw 偏移、減 dist
4. **punch（命中／燒毀）**：減 dist，再把橫向微震直接加在算好的世界座標上

yaw 的兩層偏移相加後才換算成弧度；dist 的兩層偏移相減後才夾在 0.6 以上。
**四層全歸零時逐項與 v0.34 相同**：`x + 0`、`x − 0.3*0`、`x − 0.6*0` 都不改浮點值，`easeInOutCubic(1)`／`easeOutCubic(1)` 都精確等於 1，所以兩個偏移項精確等於 0（含 −0，`x + (−0) === x`）。實測見驗收 2。

### orbit 為什麼要等推進到位才開始轉

`duel-figures.js:467` 的 `camStable = |dist − lastDist| < 1e-3`，`dist = camera.position.length()`；orbit 讓 dist 抖就會一直重選排法（事實表風險 4）。
球座標下只轉 yaw 時 `|position|` 恆等於 `dist`（`sin²+cos²` 消掉 yaw），所以 orbit 本身天生不動 dist。但**基座的推進補間**（3.2/3.6→4.2，700ms）本來就在動 dist，那是 v0.34 既有行為。若 orbit 與推進同時跑，「orbit 期間」就會含到推進的 dist 斜坡。
因此 orbit 用 `orbitHold` 等基座 `t>=1` 才開始遞增（`:262-264`），整段 orbit 的 dist 精確恆定在 `DUEL_SHOT.dist`。
**進場當下不跳格**：`onDuel` 在 `goto()` 之後把 `from.yaw -= ORBIT.yaw`（`:174`），第 0 幀的「基座＋orbit 偏移」正好等於進場前的 yaw；推進結束時落在 `duelYaw + ORBIT.yaw`，再由 orbit 轉回 `duelYaw`。`target` 沒動，所以歸零時位置與 v0.34 相同。

## side ↔ yaw 對應（已查證，非猜測）

- `duel-figures.js:342,448`：`seats=[d.a,d.b]`，`offset=[-FIG.spread, +FIG.spread]`，i=0 是 **畫面左**、i=1 是 **畫面右**；`ys:fx-burn` 的 `side:'B'`→index 1（`duel-figures.js:400-423`）。故 **'A'＝畫面左、'B'＝畫面右**。
- 相機位置 `P = (sin yaw·horiz, ·, cos yaw·horiz)`，對 yaw 微分＝`(cos yaw, 0, −sin yaw)·horiz`，正好是 `duel-figures.js:496` 的 `tmpRight`（「畫面右」向量）。**yaw 變大＝鏡頭往畫面右移**。
- 所以 **'B' → +LEAN.yaw、'A' → −LEAN.yaw** 就是「往出招側偏」。實測符號 9/9 相符（下面驗收 3）。
- 附帶觀察：`duel-figures` 每幀用 `az = atan2(cam.x, cam.z)` 重算站位，所以兩欄人形會跟著鏡頭轉，**輕推的可見效果是背景（桌面、燈籠、其他座位）的視差擺動＋dist −0.3 的推近**，不是人形在畫面上平移。這是既有架構決定的，不是本卷改壞。

## burn punch 是否雙重 — 否

`grep -n "fx-punch" index.html js/*.js` 全 repo 只有兩個派送點：
- `index.html:3168` `fxPunch()`——只在命中拍（`index.html:4077`、`4181`）叫；
- `js/trait-fx.js:339`——招式積木自己的 `api.punch()`，走 `ys:fx-trait` 那條路。

燒毀路徑 `index.html:4085-4088` 是 `fxHitstop(); fxFlash(); sfx("hurt"); Promise.all(burns.map(pwBurnOne))`，`pwBurnOne`（`4029-4038`）只派 `ys:fx-burn`，**完全不經過 `fxPunch`**。所以 director 自己在 `onBurn` 觸發 punch 不會疊成兩份。
同一拍多尊燒毀會派多個 `ys:fx-burn`：每次都把 `punchU` 重設為 0、`punchAmp` 設為同一個 1.5，結果與單次相同（不累加），行為與既有 punch 一致。

## reduced-motion

判法照抄 `js/trait-fx.js:83`（`matchMedia('(prefers-reduced-motion: reduce)')`），在 `camera-director.js:53-55`。
(a)(b) 整段 no-op（`onDuel` 不設 orbit、`onTrait` 直接 return），(c) 的 punch 維持現行行為。
**條文解讀**：凍結檔寫「(a)(b) no-op、(c) **維持現行 punch**」，我讀成「punch 這一層不因 reduced-motion 而被關掉」——v0.34 的 punch 本來就沒有 reduced-motion 閘門，所以燒毀在 reduced-motion 下照樣觸發 punch、倍率照樣 1.5。若使用者本意是「reduced-motion 時燒毀不加成（倍率回 1.0）」，改一個常數即可。實測 A6：reduced 下 (a)(b) 逐項差 **0**、burn 倍率仍 **1.500000**。

---

## 驗收逐條（指令原文＋實際輸出）

治具一律 `--use-gl=angle --use-angle=d3d11`（兩支新治具的 `chromium.launch` 都帶）。GPU 實測為 `ANGLE (AMD, AMD Radeon 780M Graphics ... D3D11)`。
基準版靜態根＝`git archive db8f301 | tar -x -C <scratchpad>/base-db8f301`（只讀，沒動主工作樹）。

### 新增治具

- **`tests/tools/cam-unit.mjs`＋`cam-unit.html`**（決定性單元治具）：同一頁面裡同時建「新版」與「基準版」兩個 director，餵**完全一樣**的事件序列與固定 dt(1/60)，逐幀比兩台相機。基準版看不懂 `ys:fx-trait`／`ys:fx-burn`，所以（新 − 舊）就是三段偏移量本身——**不必在 director 裡開後門吐內部狀態**。
- **`tests/tools/cam-drive.mjs`**（真頁面）：借 `duel-drive.mjs` 的 `drive()` 真的玩到 4 場對決，另外逐幀錄 `camera.position` 與運鏡事件時戳。

### 驗收 1 — orbit 期間 dist 恆定

```
node tests/tools/cam-unit.mjs <out> --port=8875 --base=<base>/js/camera-director.js
node tests/tools/cam-drive.mjs "http://127.0.0.1:8876/index.html?paperwar=1&fxcount=1&seed=7" <out> --duels=4 --port=8876
node tests/tools/cam-drive.mjs "http://127.0.0.1:8871/index.html?paperwar=1&fxcount=1&seed=11" <out> --duels=4 --port=8871
```

| 來源 | orbit 起點偏移 | 終點偏移 | 掃過角度 | **逐幀最大 \|Δ length\|** |
|------|---------------|---------|---------|--------------------------|
| 單元治具（固定 dt） | −37.998° | **0** | 37.998° | **8.882e-16** |
| 真頁面 seed 7，4 場 | −37.998 / −38.000 / −38.000 / −37.978 | — | — | 3.878e-7 / 1.776e-15 / 3.183e-7 / 0 |
| 真頁面 seed 11，4 場 | −37.994 / −38.000 / −37.994 / −38.000 | — | — | 8.882e-16 / 6.997e-12 / 8.882e-16 / 6.997e-12 |

門檻 1e-3，最大值 3.878e-7，**通過**。

**真頁面的窗怎麼劃（重要，不是拿被測量本身定義窗）**：`renderer.js:161` 把 `dt` 夾在 0.1s，幀率一慢，700ms 的推進補間就會拖過 700ms 牆鐘時間，用牆鐘切窗會把「還在推進」的幀算成 orbit（第一版就是這樣量到 0.0069 的假紅）。改成逐幀累加 `min(Δ牆鐘, 0.1s)`＝重建 director 自己那把尺，累到 700ms＝orbit 起點、再 1500ms＝終點。這是**純時間**的界線，與 dist／yaw 都無關；而算出來的起點偏移全部落在 −37.97~−38.00°（＝ORBIT.yaw 滿值），是這個重建正確的獨立佐證。
排除 punch／lean 正在跑的幀（凍結條文的但書）。**取樣充足度揭露**：seed 7 duel 4 只剩 2 對相鄰幀、seed 11 duel 2/4 各 4/7 對（該場 punch 密集），其餘各場 10~23 對；那幾場的數字不足以單獨支撐結論，主證據是單元治具與取樣充足的那幾場。

### 驗收 2 — 偏移歸零＝舊版

單元治具逐項比新舊兩台相機的 `position`：

- **對決結束、三層全歸零**（＝凍結條文問的情境）：逐項最大差 **0**（不是 <1e-6，是精確 0）。**通過**。
- **另行揭露（不是凍結條）**：對決**進行中**且三層都歸零的那一段，新舊差 **1.485e-4**。成因**不是偏移殘留**：v0.34 的寫入區塊條件是 `if (t < 1 || punchU < 1)`，在 `t` 剛好夾到 1 的那一幀就不再執行，相機**凍在前一幀**（離目標還差 0.0024°、dist 差 3.2e-5）；新版因為 orbit 還在跑而多寫了那一幀，反而精確落在目標上。對 `camStable` 無影響（單幀 Δdist 3.2e-5 « 1e-3），對 R-4 無影響（0.0024° 在 r≤2.2 上是 9.2e-5 « 1e-3）。

### 驗收 3 — 招式輕推方向與回位

固定 seed 各跑 4 場，逐招列出（`peak`＝事件後 200ms 內 yaw 偏離的極值，已扣掉 orbit 漂移，見下；`dip`＝dist 減量；`back`＝`ms` 後的殘量）：

| 種子/場 | side | 落在 orbit 中 | peak(度) | dist dip | back(dist/yaw) | 符號 | 回位 |
|---------|------|--------------|----------|----------|----------------|------|------|
| s7 d2 | B | 是 | +7.07 | 0.238 | —／— | ✓ | 無法取樣 |
| s7 d4 | B | 是 | +10.15 | 0.284 | 0.0001／— | ✓ | ✓ |
| s7 d4 | A | 否 | −9.454 | 0.284 | 0.0001／0.005 | ✓ | ✓ |
| s7 d4 | A | 否 | −9.542 | 0.284 | 0.0001／0.005 | ✓ | ✓ |
| s7 d4 | B | 否 | +9.395 | 0.283 | 0.0001／0.005 | ✓ | ✓ |
| s11 d2 | B | 是 | +13.02 | — | 0／— | ✓ | ✓ |
| s11 d2 | A | 否 | −9.462 | — | 0／0 | ✓ | ✓ |
| s11 d3 | B | 是 | +8.31 | 0.174 | 0／0 | ✓ | ✓ |
| s11 d4 | B | 否 | +9.454 | 0.284 | 0／0 | ✓ | ✓ |

**9/9 符號正確**（B 正、A 負），**8/9 量得到回位且全部 <0.5°／<0.02**。唯一沒量到的（s7 d2）是 `ms` 之後 400ms 內整段被連續 punch 蓋住，取不到乾淨幀——**不是回位失敗，是量不到**；同一條在單元治具上是精確的：A 側 peak −9.4522°、B 側 +9.4571°，`ms` 後殘量 0.0024°（＝上面驗收 2 揭露的那個固定殘差），dist dip 0.2836。

`peak` 用「事件前 250ms 線性擬合當基線、事後取殘差」量，因為落在 orbit 中的招式，raw 偏離會被 −38° 的 orbit 蓋掉（s7 d4 第一招 raw 是 −37.969，扣掉漂移才看得到 +10.15 的輕推）。這是扣掉已知干擾，不是換寬鬆指標——同一支算法在 orbit 已結束的招式上，`peak` 與 raw 幾乎相同（−9.454 vs −9.448）。

### 驗收 4 — SKIP 清零

```
node tests/tools/duel-drive.mjs "...&seed=7" <out> --duels=4 --port=8882 --skip
node tests/tools/cam-drive.mjs  "...&seed=7" <out> --duels=4 --port=8879 --skip
```

`duel-drive` 有 `--skip`（`duel-drive.mjs:126-131`，skipbtn 一出現就按）。真頁面 4 場全部快轉完成、**0 error**，但快轉太快（8~242ms）逐幀取樣不足以下判斷，所以主證據在單元治具：

在 orbit 進行中派 `ys:fx-trait`（偏 27.72°）再派 `ys:fx-trait-cancel`，之後 30 幀與「同一組座位、orbit 自然轉完、三層全歸零」那個獨立基準點比：
**位置殘差 0、yaw 殘差 0**（精確 0，門檻 1e-6）。**通過**。

**這條在動手當下抓到一個真 bug**：`clearOrbitLean()` 只把進度設成「已回位」的話，四層都不在跑、基座又早已 `t=1`，寫入區塊就不會執行——相機會**凍在最後那一幀的 orbit 角度上**（殘差 1.630 世界單位／27.72°）。修法是 `forceWrite` 旗標補寫一幀（`camera-director.js:118, 147-152, 274-275`）。

### 驗收 5 — T-6 後繼條

```
node tests/tools/duel-drive.mjs "http://127.0.0.1:8880/index.html?paperwar=1&fxcount=1&seed=7" <out> --duels=4 --port=8880
node tests/tools/duel-drive.mjs "http://127.0.0.1:8881/index.html?paperwar=1&fxcount=1&seed=7" <out> --duels=4 --port=8881 --root=<base>
```

| | 4 場時長(ms) | 中位數 |
|---|---|---|
| **新版** | 4826, 5893, 4467, 10754 | **5359.5** |
| 基準 db8f301 | 4843, 5921, 4451, 10751 | **5382.0** |

條件：新中位 ≤ 基準中位 ＋ ORBIT_MS(1500) ＝ 6882。實測 **5359.5**，**通過**——而且**比基準還低**：運鏡與對決時間軸完全解耦（`fx3d` 派完就返回，沒有任何 await 等鏡頭），orbit 對時長的貢獻是 0，兩組差異就是機器雜訊。
兩版的 `burn=10 / burnFig=7 / burnDom=3 / trait=5 / traitFig=5` 逐項相同 → 同種子下賽局與演出計數完全一致，時長差確實只是雜訊。

SKIP：

| | 4 場(ms) |
|---|---|
| **新版** | 35, 18, 8, 242 |
| 基準 | 39, 21, 18, 286 |

條件：每場 ≤ 基準＋100ms。逐場 35≤139、18≤121、8≤118、242≤386，**通過**（每一場都比基準快）。

### 驗收 6 — traitfx-drive 27/27 與 lineup R-1~R-4

```
node tests/tools/traitfx-drive.mjs <out> --port=8876
```
→ **`27/27 pass · 重複簽章 0`**，每列 `handled=true alive=true restored=true onTime=true clean=true focus=true err=0 prog+0`。**通過**。

lineup（`duel-perf.mjs lineup`，844×390，**治具未改一行**）：

| 8v8 | gap | A maxR / minPair / offTable | B maxR / minPair / offTable |
|---|---|---|---|
| 新版 run1 | 0.819 | 1.763 / 0.550 / 0 | 1.652 / 0.549 / 0 |
| 新版 run2 | 0.828 | 1.769 / 0.549 / 0 | 1.657 / 0.549 / 0 |
| 新版 run3 | 0.842 | 1.778 / 0.550 / 0 | 1.666 / 0.549 / 0 |
| 基準 run1 | 0.842 | 1.778 / 0.549 / 0 | 1.666 / 0.549 / 0 |
| 基準 run2 | 0.793 | 1.746 / 0.549 / 0 | 1.635 / 0.549 / 0 |
| 基準 run3 | 0.832 | 1.772 / 0.549 / 0 | 1.661 / 0.549 / 0 |

R-1 gap≥0.30、R-2 maxR≤2.20 且 offTable=0、R-3 minPair≥0.50：**六次全過**。
**忽紅忽綠先歸因再判讀**（`02 §6.2`）：`gap` 在**基準版自己**連跑三次就有 0.793~0.842 的擺動（maxR 1.746~1.778），新版三次 0.819~0.842 完全落在基準自己的擺幅內 → 波動源是治具（DOM 欄寬／GLB 載入時序影響鎖排時機），不是本次改動。佐證：把新版 run3 與基準 run1（兩者 gap 都是 0.842）逐尊比，**相機座標系的 lat／r／foot 逐項差 0.000000**。

**R-4（小編制座標差 <1e-3）— 需要說明，結論是通過**：
2v2 新版 vs 基準，**世界座標 x／z 最大差 0.626**，看起來是紅的。但逐尊檢查後，那是**整組剛性旋轉**，不是排法變了：

| | lat | r | foot | gap | minPair |
|---|---|---|---|---|---|
| 新版 2v2 | −1.349 / −0.767 / 0.767 / 1.349 | 1.387 / 0.831 / 0.831 / 1.387 | 0.694 / 0.413 / 0.713 / 0.233 | 0.408 | 0.865 |
| 基準 2v2 | −1.349 / −0.767 / 0.767 / 1.349 | 1.387 / 0.831 / 0.831 / 1.387 | 0.694 / 0.413 / 0.713 / 0.233 | 0.408 | 0.865 |
| **逐項差** | **0.000000** | **0.000000** | **0.000000** | **0** | **0** |

成因：`duel-figures` 每幀用相機方位角 `az` 重新排站位，lineup 取樣時 orbit 還在轉（治具是 `await det.ready` 後固定等 1400ms），量到的就是「同一組站位、在另一個方位角上」的世界座標。凍結檔「量測污染源」那節本來就寫了『orbit 只轉 yaw 不影響 pxWorld，但截圖要等 orbit 結束』——這正是那個情況。
**我沒有改治具去讓它變綠**（試過兩條路都會污染量測、已全部退回：拉長 `--settle` 會讓真對決先 `ys:duel-end`、站位凍住而 `az` 跟著鏡頭回牌桌，gap 直接變 −2.351；改派 `ys:fx-trait-cancel` 把 orbit 收掉則連**基準版**的數字都跟著變（基準 2v2 從 1.387/0.865/0.408 變成 1.418/0.866/0.439），是有副作用的探針）。改成用**相機座標系**（治具本來就會輸出的 `lat`／`r`／`foot`）判讀：那才是「站位有沒有變」的不變量，實測逐項差 0。

`grep -c "Math.random"`：`index.html` **0**、`js/camera-director.js` **0**。`js/` 其餘命中（`creature-figures.js` 1＝註解、`particles.js` 18＝檔頭自述的既有債、`renderer.js` 1）與基準版**逐檔同數**，本次改動一個都沒加。

### 驗收 7 — console 0 error

| 跑法 | errors |
|---|---|
| `cam-drive` seed 7 4 場 | **0**（console／pageerror／requestfailed 全 0） |
| `cam-drive` seed 11 4 場 | **0** |
| `cam-drive` seed 7 `--skip` | **0** |
| `duel-drive` 新版 4 場 | **0** |
| `duel-drive` 新版 `--skip` | **0** |
| `traitfx-drive` 27 招 | **0** |
| lineup 新版 ×4 | **0** |
| `cam-unit` 兩個 context（含 reduced） | **0** |

### 驗收 8 — 逐檔對應

```
git diff --stat db8f301..HEAD
 js/camera-director.js     | 120 ++++++++++++++++++++++-
 tests/tools/cam-drive.mjs | 150 ++++++++++++++++++++++++++++
 tests/tools/cam-unit.html |  10 ++
 tests/tools/cam-unit.mjs  | 243 ++++++++++++++++++++++++++++++++++++++++++++++
 4 files changed, 518 insertions(+), 5 deletions(-)
```

- `js/camera-director.js` — P-4 (a)(b)(c) 本體：ORBIT／LEAN／BURN_PUNCH_POWER 常數、`prefersReduced`、`onTrait`／`onTraitCancel`／`onBurn` 三個接收端、`clearOrbitLean`＋`forceWrite`、`update()` 的三層合成。
- `tests/tools/cam-unit.mjs`＋`cam-unit.html` — 驗收 1/2/3/4 與 reduced-motion 的決定性治具（凍結檔驗收 1 明寫「或新增小治具」）。
- `tests/tools/cam-drive.mjs` — 驗收 1/3/7 的真頁面治具。

**`index.html` 沒有出現在 diff 裡**，所以 P-6 的「`trace()` seeds 1..20 新舊 JSON 逐位元組相等」由建構上成立（`trace()` 只跑引擎、headless、不載 3D，而引擎檔一個位元組都沒動）——**這一條我沒有實跑**，是用 diff 論證的，據實寫明。
同理 `index.html:1672` 的 `VERSION` **沒有 bump**：本卷派工限定「只改 `js/camera-director.js`」，而事實表 G 段要求改 js 要 bump `index.html:1672`。**這件事留給合併 P-1~P-8 的人做**，不能漏。

## 鑑別力（這些綠燈換成壞版本會不會變紅）

1. **基準版對基準版**（`cam-unit --new=/base/camera-director.js`）：A1 orbit、A3 lean、A4 SKIP、A5 burn 倍率、A6 reduced **全部 FAIL**（orbit 掃過 0°、lean peak 0、burn 倍率 0.000238）；只有 A2（歸零＝舊版）通過——它本來就該通過，那是負對照。
2. **拔掉 `forceWrite` 的突變版**（把 `|| forceWrite` 從寫入條件刪掉，其餘不動）：**只有 A4 變紅**（殘差 1.630 世界單位／27.72°），A1／A2／A3／A5／A6 全部維持綠。→ A4 對「SKIP 後殘留偏移」這個具體缺陷有針對性的鑑別力，不是靠別條順便抓到。

## 沒做到／要接手的人注意

1. **`VERSION` 沒 bump**（見上，派工範圍限制）。
2. **`trace()` seeds 1..20 沒實跑**，用「index.html 未改」論證（見上）。
3. **P-5 效能沒量**（`duel-perf perf`）——那是 P-1~P-3 外殼描邊的條件，本卷 (a)(b)(c) 不新增任何 mesh／material／draw call，只改相機的四個純量。
4. **R-4 用相機座標系判讀**，理由與退回的兩種治具改法都寫在上面；若卷主認為必須用世界座標判，那要先決定 lineup 治具怎麼避開 orbit（我試過的兩條路都會污染量測）。
5. **第一招可能落在 orbit 中**（見開頭的觀察），待試玩裁定。
