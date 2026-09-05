# 卷 C3 覆審第 3 輪 — `git diff 1ff3c21..77f1e97 -- js/trait-fx.js`

**CRITICAL 0／HIGH 1／MEDIUM 1／LOW 3。**

範圍：只審虛擬時間排程（`run.vt` / `horizon` / `rate`）這一段。repo 未被修改（`git status --porcelain` 空）。

---

## HIGH-1　`at()` 只替自己預留 1ms，巢狀回呼的後續工作不進 horizon → 掉幀時最後一段被硬收工砍掉

**檔案:行號**：`js/trait-fx.js:264`（`run.horizon = Math.max(run.horizon, at + 1)`）＋ `js/trait-fx.js:406-408`（rate 先算、timer 後燒）

**機制**

`rate = (horizon − vt) / remainW` 這個式子在 horizon 固定時有精確解：令 `u_k = horizon − vt_k`，則
`u_(k+1) = u_k × (1 − ms/(M − k·ms)) = u_k × (n−k−1)/(n−k)`，連乘到 `k = n−1` 時因子為 `0/1`
→ **vt 剛好在最後一幀落在 horizon 上**（`vt_k = horizon × k/n`，線性）。

也就是說 vt 是被「設計成」壓線抵達 horizon 的。而 `at()` 只把 `at+1` 推進 horizon，
**完全沒有替回呼裡即將排的 tween 保留額度**。於是只要某個 timer 就是當下的 horizon 設定者，
它就會在**收工那一幀**才燒，回呼裡 `st.tween({delay})` 以「現在的 vt」起算 → `t = 0` →
同一幀 `run.t >= run.ms` 觸發 `finish()`（:420）把 mesh 直接 dispose 掉。
那一段**一幀都沒被畫出來**，計入 `stats.cut`。

60fps 下有 54 幀可讓別的 timer 先把 horizon 撐大，vt 提早越過 `at+1`，所以躲掉了；幀變粗就躲不掉。

**實跑（真實路徑，未改 repo）**

1. 出廠設定 `ms=900`、`--count=8`、DT=1/60：`27/27 pass`，**`stats.cut` 全 0**——作者的證據成立。
   `node tests/tools/traitfx-drive.mjs .../review3-count8.json --count=8 --port=8895`
2. 把治具頁**送出的 HTTP 回應**裡的 `const DT = 1 / 60` 改寫成 `renderer.js:161` 的夾值 0.1s
   （只改回應內容，`js/trait-fx.js` 原封不動；驅動程式 `scratchpad/dt-probe.mjs`）：

   | DT | 約 fps | cut>0 的套數 |
   |----|------|------------|
   | 1/60 | 60 | 0/27 |
   | 0.0333 | 30 | 0/27 |
   | **0.05** | **20** | **3/27**（wardHpAll1, swarmRally, hauntSteal） |
   | **0.1**（renderer 的夾值） | **10** | **3/27**（swarmHalfSplash, wardRegen1, swarmFeed1） |

   兩組被砍的套數不同 → 這不是「那 3 套編舞有問題」，是**收工幀與 timer 對相位**的結構性競賽，任何一套都可能中。

3. **機制的決定性隔離**（`scratchpad/count-probe.mjs`，DT=0.1，只跑 `swarmHalfSplash`，
   它最後一個 timer 是 `zuling.js:306` 的 `st.at(lag+540)`、`lag=(count−1)×60`）：

   ```
   count=1 最後一個 at()=540 名目horizon=541 -> cut=0   實際horizon=830
   count=2 最後一個 at()=600 名目horizon=601 -> cut=0   實際horizon=830
   count=4 最後一個 at()=720 名目horizon=721 -> cut=0   實際horizon=1045
   count=5 最後一個 at()=780 名目horizon=781 -> cut=0   實際horizon=1045
   count=6 最後一個 at()=840 名目horizon=841 -> cut=1   實際horizon=1275
   count=7 最後一個 at()=900 名目horizon=901 -> cut=1   實際horizon=1276
   count=8 最後一個 at()=960 名目horizon=961 -> cut=1   實際horizon=1322
   ```

   門檻乾淨單調：**最後一個 `at()` 一落進收工幀的窗口（t 屬於 (800,900]）就必砍**。
   「名目 horizon 841 → 實際 1322」正是「回呼排完才知道還有 481ms 工作要做」。

4. 掉的是什麼：`zuling.js:307-312`——最後一艘船腳下的水花圈（ring 230ms）＋泡沫（disc 210ms）＋burst。
   spawn 完同幀就被 `finish()` dispose。

5. 另一條同樣會踩的路：`ms` 調小。`--ms=400 --count=8` → `cut=3`
   （biteGamble／wardHpFirst／wardRegen1）。`PW_FX.TRAIT_MS`（`index.html:3127`）標著【試玩必調】，調小就靜默中招。

**為什麼現有守衛擋不住**：`traitfx-drive.mjs:112` 的 verdict 與 `:118` 的 pass 都**不含 cut**（見 MEDIUM-1），
且 `traitfx-preview.html:71` 的 DT 寫死 `1/60`——27/27 綠燈對「掉幀」與「cut>0」兩件事都是零涵蓋。

**修法一句**：`at()` 改成替回呼保留額度（最簡：`run.horizon = Math.max(run.horizon, at + TAIL_RESERVE)`，
TAIL_RESERVE 取涵蓋典型回呼長度的常數如 240），或把 timer 的燒錄移到 rate 計算**之前**、
燒完後重算一次 rate 再推進 vt。

---

## MEDIUM-1　驗收治具的 verdict 不含 `stats.cut`／`fused`，這個 diff 要修的東西沒有任何機械斷言在守

**檔案:行號**：`tests/tools/traitfx-drive.mjs:112`（verdict 物件）與 `:118`（pass 運算式）——
stats 有被抓下來寫進 out.json（`:96`、`:119`），但**從頭到尾沒有進入任何判定**。

**實跑**：`--ms=400 --count=8` 那一輪主控台印出 `27/27 pass`，同一份 out.json 裡卻有 3 套 `stats.cut=1`。
也就是說「有沒有被砍掉一段」對紅綠燈完全沒有影響——第 1／2／3 輪報告都拿 `stats.cut=0` 當證據，
但那個數字沒有任何東西在守，下次回歸不會變紅。

**修法一句**：`verdict.cut = stats.cut`、`verdict.fused = stats.fused`，把 `cut === 0 && fused === 0`
併進 `verdict.pass`；順便讓 `--dt` 可從命令列帶入（治具目前寫死 1/60），把 20fps／10fps 納入回歸。

---

## LOW-1　`at(NaN)` 的爆炸半徑被這次改動放大：從「一個 timer 不燒」變成「整套凍住、燒到保險絲」

**檔案:行號**：`js/trait-fx.js:264`。`Math.max(0, NaN) === NaN` → `at = NaN` →
`run.horizon = Math.max(h, NaN) = NaN` → `:406` 的 rate 變 NaN → `:407` 的 `run.vt` 變 NaN →
所有 timer 與 tween 永遠不再前進，只剩 `:419` 的 fuse（1800ms）收場。

對照 `tween()`（`:259`）是安全的：`o.delay || 0` 與 `o.ms || run.ms` 因為 NaN 是 falsy 而被 `||` 接住。
舊版 `at()` 的 NaN 只讓那一個 timer 不燒，不會污染全域狀態。

**現況不觸發**：27 套裡 `at()` 的引數全是整數字面量與 index 算術（`lag+540`、`i*45`、`380+j*85` …），
追過沒有能產生 NaN 的路徑。這是深度防禦，不是現行 bug。

**修法一句**：`const at = run.vt + (Number.isFinite(ms) ? Math.max(0, ms) : 0);`

## LOW-2　`stats.compressed` 名稱與語意已脫節；`run.sped` 在收工幀不會被設

**檔案:行號**：`js/trait-fx.js:108`（欄位名 compressed）、`:390`（`if (run.sped) stats.compressed++`）、`:421`。

- 舊語意＝「被壓縮的段數總和」，新語意＝「被加速過的套數」，靠 `:108` 的行內註解在撐。
  追過 `js/`、`tests/`、`index.html`，**沒有任何 consumer 讀 `stats.compressed`／`sig.sped`／`sig.horizon`**
  （`traitfx-drive.mjs` 只讀 `sig.bones`／`sig.meshes`／`sig.target`），所以純粹是可讀性債，不會壞。建議改名 `spedRuns`。
- `:419-421` 是 `if / else if / else if` 串：收工那一幀走 `run.t >= run.ms` 分支，第三條不執行。
  若某套只在最後一幀 rate>1，`sig.sped` 會誤報 false。遙測失真，不影響演出。
- `run.sped` 沒在 `:355-361` 的 run 字面量裡宣告（其餘 `vt`／`horizon`／`rate` 都有），靠 `!!` 與 truthy 接住 undefined。一致性小瑕。

## LOW-3　`rate` 沒有上限，`TFX.flinchMs` 這類感知常數被等比壓縮（Q4 的判斷）

**檔案:行號**：`js/trait-fx.js:406`（無 clamp）、`js/trait-fx.js:337`（flinch 用 `TFX.flinchMs=240`）。

**一句判斷：這是正確的設計取捨，不是 bug——但缺一個上限。**

理由：等比加速保住了「醞釀／出手／收勢」的比例，這正是第 2 輪要求的；而且它嚴格優於被它取代的逐段壓縮
（第 2 輪報告記錄 `eliteVsSwarm` 的 flinch 被壓到 **40ms／2.4 幀**＝等於沒演）。
實測目前的加速幅度有限：滿編 8 尊最大 `horizon=1352`（`review3-count8.json`，1.50 倍）、
DT=0.1 時最大 1478（1.64 倍），flinch 240ms → 160／146ms，仍在看得出來的範圍。

隱患是式子沒有天花板：horizon 若被更大的編制推到 3 倍，flinch 剩 80ms、整套會變成快轉。
**修法一句**：`run.rate = Math.min(RATE_MAX, ...)`（RATE_MAX 取 1.8 左右），
超出的部分讓它照舊由 `stats.cut` 顯性記錄，而不是無聲地把整套演成快轉。

---

## 追過但沒找到的類別

- **Q1 rate 公式的邊界 — 沒找到 NaN／Infinity／負數／vt 倒退**（`at(NaN)` 那條已另列 LOW-1）。
  逐項驗算（node 直接代入 `:405-407` 的式子）：
  - `remainW = run.ms − run.t + ms`：因為 `run.t` 在 `:402` 已經加過 ms，這個值等於**本幀開始時**的剩餘牆鐘，
    與同樣取本幀開始值的 `(horizon − vt)` 同座標系，公式自洽。
  - 活著的 run 保證 `t_before < run.ms`（否則上一幀已被 `:420` 收掉並移出 runs），
    所以 `remainW` 屬於 `(0, run.ms]`，**永遠為正**。
  - 最後一幀：`ms >= remainW` → `vt += ms×(work/remainW) >= work` →
    開演時就排好的 tween 一定跑到 `t=1`（被砍的只有 HIGH-1 那種「當幀才生出來」的）。
  - 大 dt（0.1s）：實測 9 幀收工、27 套 `fused=0`、`wrapped=0`、`errors=0`。
  - hitstop `dt=0`：`ms=0` → `vt += 0`，rate 雖重算但不推進，tween 以同一個 t 再跑一次
    （全部是「由 t 算絕對值」的 update，冪等），`dead` 已濾掉所以 `done()` 不會重入。無害。
  - `remainW <= 1` 的 else 分支：需要 `t_before` 落在 (899, 900)，60fps 的 16.667ms 步長跨不進去；
    真踩到也只是沿用上一幀的 rate（初始 1），不會 NaN。
  - `horizon − vt < 0`（工作做完了）：`Math.max(1, 負數) = 1`，rate 落回 1，
    **vt 因為 rate 恆 >= 1 而永遠單調不倒退**。
  - 題目假設的「horizon 初始 0、第一幀 (0−0)/remainW = 0」：**前提不成立**——
    編舞函式在 `start()`（`:365`）裡同步跑完，`tween()` 早就把 horizon 推到全套的最遠點了，
    第一次 `update()` 看到的不是 0。真的只用 `at()`／空編舞時 horizon=0 → `max(1,0)=1`，結果仍正確。

- **Q3 reduced／cancel／throw — 沒找到被這段改動波及的地方**。`--count=8` 各跑一輪全綠：
  `--reduced` 27/27、`--cancel=15` 27/27、`--throw` 27/27（26 個重複簽章是預期的，throw 案的 sig 全空）。
  讀碼佐證：`finish()`（`:370-394`）不碰 `vt`／`horizon`／`rate`，run 直接丟棄，沒有跨 run 殘留；
  `cancelAll()`（`:395`）直接呼叫 `finish()`，**繞過 `:420` 的 cut 計數**，所以 SKIP 不會污染 `stats.cut`（正確）；
  `run.reduced` 只在 `:234`／`:240`／`:246`／`:249-252` 閘掉視覺覆寫，tween 照排、horizon 照推，
  所以 reduced 與正常路徑走同一條時序，行為一致。

- **牆鐘與 `run.t` 在 hitstop 下發散**：`:403` 的註解寫「剩餘牆鐘」，但 `run.t` 累加的是
  `renderer.js:163` 停格時會歸零的 dt，兩者在 hitstop 期間會分家；`index.html:4054` 等的則是真實的 900ms。
  **但這是既有行為（舊版的逐段壓縮同樣以 `run.t` 為準），不是本次 diff 引入的**，
  且 `fxHitstop`（`index.html:3149`）回傳 Promise 由呼叫端 await、與 `await pwSleep(TRAIT_MS)` 在同一條序列鏈上，
  我追不到兩者真的並行的路徑。列為觀察，不計入 finding。

---

## 證據檔（全在 scratchpad）

| 檔案 | 內容 |
|------|------|
| `review3-count8.json` | 出廠設定 ms=900 count=8 DT=1/60，27/27 pass、cut 全 0 |
| `review3-ms400.json` | ms=400，27/27「pass」但 cut=3（MEDIUM-1 的證據） |
| `review3-dt100.json` | DT=0.1s，cut=3（HIGH-1 主證據） |
| `review3-dt0.05.json` | DT=0.05s，cut=3（另一組套數，證明是相位競賽） |
| `review3-dt0.0333.json` | DT=1/30，cut=0（門檻在 30–20fps 之間） |
| `review3-red.json`／`review3-cancel.json`／`review3-throw.json` | Q3 三條路徑各 27/27 |
| `dt-probe.mjs` | 改寫 HTTP 回應裡 DT 的驅動程式（不動 repo） |
| `count-probe.mjs` | swarmHalfSplash 逐 count 掃描，隔離 HIGH-1 的機制 |
