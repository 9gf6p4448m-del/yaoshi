# L10 取樣決定性小卷（2026-09-12）

> 起因：`docs/experiments/2026-09-12-fx-legibility-b0-fix-report.md` §7.2 把 L10 的訊號歸因為
> 「波動落在量測那一側——取樣抓到哪幾格逐跑不同」，凍結檔
> `docs/experiments/2026-09-11-acceptance-fx-legibility.md` §2.1 修訂三 ⑤ 因此把 L10 標
> 「訊號不可信、記錄不判」，並要求另開治具小卷把取樣改成決定性。
> **本卷只動治具。`index.html` 與 `js/**` 零 diff（驗收 5 有實測）。**

---

## 0　結論先行

**取樣已決定性（驗收 1 綠）。** 七條：1 🟢／2 **🔴（未達，seed 3 仍 `maskN=0`，根因見 §5）**／
3 🟢（甲乙皆綠）／4 🟢／5 🟢／6 🟢／7 🟢。
**更精確地說**：seed 1 是「決定性**且**有活性」；seed 3 是「決定性，但 R2 全欄 `null`、那份相等沒有活性」。
本卷另跑了一輪 fresh-context 對抗式覆審（`opus`，只給 diff 與證據、任務是**反駁**這個宣稱），
它抓到的 HIGH 已修並重驗（§3④），MEDIUM／LOW 的處置逐條列在 §5.5。

- **seed 1（duels=8）**：連跑 5 次 `metrics.txt` md5 全等 `5edb3d513b53217eaf1db18e7424eda8`，
  **而且有活性**（`maskN=13`、量到 46 個跳字、77 格凍幀、`swallowed=0`、帳目 `acct.ok=true`）。
- **seed 3（duels=8）**：連跑 5 次 md5 全等 `3328873cc2664863ba54e300a8cd2109`，
  **但這份相等在 R2 這條路上沒有活性**——`maskN=0`，`maskP50`／`maskGe25Ratio`／`ctrlMax`／
  `back200MaskN`／`bySkin` 全是 `null`／`{}`／0（`02 §6.1` 第 1 條的「相等性斷言要另附活性證據」
  在 seed 3 上不成立）。它有活性的部分只有 R1 那一半（量到 33 個跳字、45 格凍幀、字級簽章逐跑相同）。
- **舊法同條件 5 跑**：md5 **5 份全不同**，`R2` 在 2🟢／3🔴 之間翻——與 §7.2 的現象一致。
- **仍未解**：seed 3 的 `maskN=0` **不是取樣不決定性造成的**，它是 §5 說的結構性問題
  （刺激釘在 `ys:hitstop`，而產品用**同一個門檻**同時觸發 `pwFocus` 推鏡；實測 40/40）。
  我想得到的每一種修法都會提高通過機率 ⇒ 依 `02 §2.1` 不自行動手，列在 §7 交裁；
  **`§2.1` 的「恆假例外」我沒有去驗**（要做的符號式掃描與它為什麼不提高通過機率，寫在 §5 末與 §7 Q5）。

---

## 1　改了什麼（檔案:行號）

全部在 `tests/tools/dmg-readability.mjs`（＋`tests/tools/README.md` 的用法說明）。

| 行號 | 改動 | 為什麼 |
|---|---|---|
| `158–166` | 檔頭：兩種時鐘的說明 | `pump`（預設）／`wallclock`（`--wallclock=1`，舊法，留給鑑別力） |
| `167–181` | `const HARNESS` → `const harnessSrc = (PUMP, DT) => …`；`F.vt`／`F.ticks`／`F.hold`／`F.net`；`performance.now`／`Date.now` 改讀 `F.vt` | 虛擬時鐘的本體 |
| `182–184` | `Math.random` 換固定種子 xorshift32（僅 pump） | `js/particles.js` 的線香煙／燈籠火星共 15 處 `Math.random`，逐跑不同會讓 R1 的 8px 環帶與 R2 的遮罩像素跟著抖。**這支亂數與待驗行為無關**（只決定背景粒子初值），依 `02 §6.2` 固定種子合法；玩法流 `S.rng`／`S.rngUi` 由 URL 的 seed 決定，一格沒碰 |
| `186–192` | `Event.prototype.timeStamp` 也換成虛擬時鐘（僅 pump） | **§7.2 沒列到的第五處耦合**，見 §3 |
| `194–222` | 網路閘：`fetch`（含 `arrayBuffer/json/text/blob`）、`XMLHttpRequest.send`、`createImageBitmap`、`HTMLImageElement.src` 在飛時 `F.net>0`，虛擬時鐘停住 | GLB／貼圖回來的那一刻若逐跑落在不同 tick，後面整串取樣全錯開 |
| `224–247` | `rAF`／`setTimeout`／`setInterval`（新包）改掛虛擬時鐘 | `setInterval` 舊法沒包（風聲 sfx 在用），pump 模式下它會照牆鐘燒 |
| `248–263` | `F.fireDue()`：到期的虛擬計時器，同 tick 內新排的留到下一 tick | 避免 `setTimeout(fn,0)` 自我遞迴把一個 tick 卡死；同時到期依註冊序 |
| `265–286` | `F.animStep(dt)`＋`Element.prototype.animate` 攔截：WAAPI／CSS 動畫全部 pause，逐 tick 推 `currentTime`，推到終點改叫 `finish()` | 跳字 `.dmgfloat` 是 `el.animate()` 畫的，它的 `opacity` 就是 R1 的取樣篩選條件（`op ≥ 0.8`）、它的 `rect` 就是量對比度的框。`finish()` 而不是硬設 `currentTime`，是為了讓 `onfinish` 照樣派（量表殘影的 `gh.remove` 與跳字回收吊在上面）。**第一次看到的動畫一律歸零**，不用它被牆鐘推過的那個值 |
| `300–326` | `F.freeze`／`F.resume` 在 pump 模式改成切 `F.hold` | 世界本來就只在 tick 時前進，凍幀＝不 tick |
| `327` | `F.tick()` ＝ `vt += DT` → 到期計時器 → 動畫 → 這一幀的 rAF 回呼 | 固定步長 1000/60 ms |
| `334–348` | `F.pumpN(n)`：一批最多 n 個 tick，遇 `hold`／`net` 停下回報；**只有 hold 才走一次真實 rAF** | 直接呼叫 rAF 回呼在 render lifecycle 之外、合成器不交畫面出去（原治具 `__frzStepReal` 註解踩過）；但每批都走真實 rAF 又會多畫一幀 `dt=0`，而「批數」在網路停等時逐跑不同 ⇒ 只在要截圖時走 |
| `462` | `__frzWarp(ms)` 補 pump 分支（`F.vt += ms`） | 保住舊語意：warp 只推「下一幀拿到的時刻」，不跑計時器、不推 WAAPI |
| `555–560` | `openPage(browser, opt, extra, pump)` | dom 模式維持舊時鐘（L10 不用它） |
| `567–578` | `TICK_MS = 1000/60`（凍結）、`PUMPED`、`BATCH = 36` | `BATCH×TICK_MS ≈ 600ms`，刻意大於 `index.html` 的 `MAIN_GUARD_MS=500`（見 §3） |
| `969–1051` | `drivePumped()`：取代 `duel-drive.drive()` 的驅動迴圈 | 舊 drive 每 250ms **牆鐘**輪詢一次、看到鈕就按；新版每 `BATCH` 個**虛擬幀**檢查一次，點擊落在固定的 tick 序號上 |
| `984–998` | 開跑前等 `__yaoshi3d` 上線＋網路靜止（此時虛擬時間停在 0） | 見 §3 第 ② 條 |
| `1094–1101` | 收尾抽乾迴圈：pump 模式改成自己 tick | 牆鐘推不動任何東西 |
| `1113–1122` | `versionOk` 的比對式修正 | 舊式 `includes('v'+ver+'・')`，但 2026-09-11 起首頁在 PAPERWAR 開著時只有 `v0.55`、後面沒有「・」⇒ **每跑必響的假警報**（零鑑別力，會訓練看的人忽略它）。改成「開頭是 `v<版本>` 且後面不是數字或點」；它不在 `verdict.res` 裡，不影響任何判定 |
| `1124–1140` | 新增 `<outdir>/metrics.txt` | 判定＋全部統計量，一行一項、排序固定；驗決定性就 `md5sum` 它 |
| `287–299` | **`F.pauseAll()`**（覆審 HIGH，見 §3④） | 純 pause、時間不前進；`F.freeze()`／`__frzWarp()`／`__frzStepReal()` 前後各掃一次，堵住「凍幀期間 CSS 動畫沿牆鐘跑」 |
| `465–474` | `__frzStepReal()` 前後各掃一次 `pauseAll()` | 同上；前面擋 Node 端上一次 evaluate 建出來的動畫，後面擋這一幀回呼自己建的 |
| `255`／`266`／`277`／`288`／`296`／`314`／`470`／`1113–1116` | `F.errs` 計數 ＋ `metrics.txt` 的 `swallowed=` | 覆審 (1b)：虛擬時鐘接管 rAF／計時器後，回呼裡的例外不會變成 `pageerror` ⇒ `errors=0` 失去鑑別力，自己數起來 |
| `1131–1140` | `metrics.txt` 的 `acct.flashRuns`／`acct.sum`／`acct.ok` | 覆審 (1a)：把 `flashRuns == maskN + burnMaskN + Σ maskDropped` 的帳目印出來，對不上＝有樣本靜默消失（**不改 `judgePix`**） |
| `795–811` | 更正 `M.tryFire` 上方那段已被 §5 證偽的註解 | 「hitstop 期間鏡頭完全不動」是錯的；只改註解，程式邏輯一行沒動 |

**量法與門檻一行未動**——`git diff 417b197..HEAD -- tests/tools/dmg-readability.mjs` 裡
`MASK_TH`／`MOVE_MAX`／`BASE_FONT`／`FONT_MIN`／`BACK_MAX`／`BURN_MAX`／`CTRL_MAX`／
`>= 25`／`>= 0.70`／`judgePix`／`silhouette`／`maskDeltaOnMask`／`redness`／`ringAvg`／`contrast`
**沒有任何一行進 diff**（唯一命中的是一行新註解）。`seed`／`duels`／`maxfloat`／`maxhit`／案例集同樣未動。

---

## 2　為什麼「換時鐘」就把四處耦合一起解掉（刺激派送一行沒改）

§7.2 列的四處耦合都是**吃 `performance.now()` 或 `setTimeout` 的**：

| §7.2 列的耦合 | 在哪 | 換成虛擬時鐘之後 |
|---|---|---|
| `M.tryFire` 三道閘（`- M.duelT < 1600`、`- M.lastFloatT < 700`、`M.busy`） | `dmg-readability.mjs` `M.tryFire` | 前兩道讀的是被換掉的 `performance.now()`；`M.busy` 只由治具自己的凍幀協定決定 ⇒ 全決定性 |
| `setTimeout(tick, 220)` 輪詢 | 同上 | 虛擬計時器，固定在第幾個 tick 到期 |
| `ys:hitstop` 的派送時刻 | `index.html` `fxHitstop()` 的 `setTimeout` | 同上 |
| `M.pickTarget`「那一瞬畫面上最大的一尊」 | 同上 | 「那一瞬」＝固定的第 N 幀，畫面是 tick 序號的函數 |

所以 **`M.tryFire`／`M.pickTarget`／刺激派送那一整段一行都沒改**，改的只有它們腳下的時間軸。

---

## 3　解決過程中量到的四件「§7.2 沒寫到」的事（都有實測）

**① 第五處 wall-clock 耦合：`e.timeStamp` vs 虛擬 `performance.now`**
`index.html:2253` 的 `gNow()` ＝ `performance.now()`（被治具換成虛擬），但主鈕連點守衛
（`index.html:2262` `armMainBtnGuard`）與相位閘比的是 `gStamp(e)` ＝ **`e.timeStamp`，那是瀏覽器
寫的真實單調時鐘**。虛擬時間一旦跑在牆鐘前面，`gStamp(e) - MAIN_SWAP_AT` 變成大負數、
恆 `< MAIN_GUARD_MS(500)` ⇒ **每一下點擊都被吞掉**，治具只能一直空轉。
而「虛擬領先牆鐘多少」正是機器忙不忙決定的。
實測（修掉前，seed 1 duels=2 兩跑）：`ticks` **21310 vs 173712**（虛擬時間 357s vs 2897s），
樣本數相同但像素全不同。修法：`Event.prototype.timeStamp` 也換成虛擬時鐘（`:186–192`）。
另外把 `--batch` 定在 36（≈600ms > 500ms）——小於 `MAIN_GUARD_MS` 的話每一下點擊都會被守衛吞掉
（舊 drive 輪詢 250ms，實際生效的點擊間隔同樣是 500ms，不是 250ms）。

**② 3D 層不在 `load` 事件的等待範圍內**
`index.html:6936` 是用 `createElement` 動態塞 `<script type="module" src="js/renderer.js">`，
所以 `page.goto(…, {waitUntil:'load'})` **不等它**；三角函式庫（unpkg 的 `three@0.158.0`）與
`js/*.js` 的動態 `import()` 也不是 `fetch`／XHR，頁面端的 `net` 閘看不到。
實測探針（`scratchpad/l10/probe.mjs`，只 tick 60 次就截圖、不點任何按鈕）：

```
# 修掉前（goto 後直接 tick）
{"boot":{"y3d":false,...},"after":{"y3d":true ,"ticks":60,"prog":65}}   ← 一跑：renderer 已畫 65 幀
{"boot":{"y3d":false,...},"after":{"y3d":false,"ticks":60,"prog":null}} ← 另一跑：3D 根本還沒上線
→ md5 b2da51de… vs 0bf2eef9…；逐像素差 188820/329160（57.36%），最大差 122

# 修掉後（先等 __yaoshi3d 上線＋網路靜止，這段期間虛擬時間停在 0）
{"boot":{"y3d":true,"net":0,"ticks":0},"after":{"y3d":true,"ticks":60,"prog":65}}  ×2
→ md5 b2da51de904664da3aaab8182253538b ×2（逐位元組相同）
```

**③ `versionOk` 是個每跑必響的假警報**（見 §1 表最後一列）。修掉前 5 份舊法證據裡
`versionOk` 全是 `false`，訊息寫「這個埠多半被別的 http.server 佔著，數字全部作廢」——
而實際上版本是對的。修掉後新法 10 跑全 `true`。

**④ 第六處耦合，由 fresh-context 對抗式覆審抓到（HIGH，已修並重驗）**
pump 模式的 `F.freeze()` 原本只切 `F.hold` 就早退，**沒有**像舊法那樣先把所有動畫 pause 起來。
而 `F.animStep` 只在 tick 裡跑 ⇒ **凍幀期間一次都不跑**。
後果：「在凍住那一 tick 的 rAF 階段**之後**才被建立的 CSS 動畫」會沿 `document.timeline` 的
**真實**時間，推進整個截圖視窗（一輪要拍 4 張、每張 100–250ms 牆鐘）。
受影響的元素就在量測範圍內——`index.html:535` 的 `#duel i.hurtedge`（`inset:0` 全幅內陰影，
會蓋到剪影遮罩像素）、`:436`／`:572` 的 `.flashfx`。
**這是新法唯一一處比舊法更鬆的地方。**

修法：新增 `F.pauseAll()`（純 pause、時間不前進），在 `F.freeze()`／`__frzWarp()`／
`__frzStepReal()` 的前後各掃一次。

**修掉之後重跑 5+5 跑，`metrics.txt` 仍各自逐位元組相同**，而且**數字真的變了**
⇒ 證明這個洞不是紙上談兵：

| 指標（seed 1） | 修 HIGH 前 | 修 HIGH 後 |
|---|---|---|
| `burnMaskAbsMax`／`burnMax` | 3.89 | **3.19** |
| `maskMin`／`d40min`／`bySkin.layered.min` | 32.97 | **32.92** |
| R1 對比度 `max` | 14.92 | **14.30** |
| 判定（R1／R2main／R2sub／`maskN`／中位／`Δ200`） | 🟢／🟢／🔴／13／75.68／5.85 | **完全相同** |

seed 3 則**逐欄完全相同**（它那 8 輪取樣的窗裡沒有 DOM 疊層動畫）。
證據：`evidence/pump-before-2a-fix/` vs `evidence/pump/`。

---

## 4　驗收逐條

### 驗收 1　決定性 🟢

指令原文（seed 1／3 各 5 跑，`scratchpad/l10/run5.sh` 逐跑換埠）：

```bash
node tests/tools/dmg-readability.mjs pix scratchpad/l10/pump-s<SEED>-<i> \
     --seed=<1|3> --duels=8 --port=<埠> --maxfloat=50 --maxhit=20
md5sum scratchpad/l10/pump-s<SEED>-*/metrics.txt
```

**最終版（對抗覆審抓到的 HIGH 修掉之後，`pump2-*`）：**

```
5edb3d513b53217eaf1db18e7424eda8 *scratchpad/l10/pump2-s1-1/metrics.txt
5edb3d513b53217eaf1db18e7424eda8 *scratchpad/l10/pump2-s1-2/metrics.txt
5edb3d513b53217eaf1db18e7424eda8 *scratchpad/l10/pump2-s1-3/metrics.txt
5edb3d513b53217eaf1db18e7424eda8 *scratchpad/l10/pump2-s1-4/metrics.txt
5edb3d513b53217eaf1db18e7424eda8 *scratchpad/l10/pump2-s1-5/metrics.txt

3328873cc2664863ba54e300a8cd2109 *scratchpad/l10/pump2-s3-1/metrics.txt
3328873cc2664863ba54e300a8cd2109 *scratchpad/l10/pump2-s3-2/metrics.txt
3328873cc2664863ba54e300a8cd2109 *scratchpad/l10/pump2-s3-3/metrics.txt
3328873cc2664863ba54e300a8cd2109 *scratchpad/l10/pump2-s3-4/metrics.txt
3328873cc2664863ba54e300a8cd2109 *scratchpad/l10/pump2-s3-5/metrics.txt
```

（修 HIGH 之前的那一輪 5+5 跑同樣各自全等——`343dfcb0…`／`f6076cc8…`，
 留在 `evidence/pump-before-2a-fix/`，用途見 §3④。）

逐跑數字（5/5 逐欄相同，含 `ticks`／`froze`／`maskDropped` 的逐項計數）：

| seed | R1 | R2 | R2main | R2sub | R5pix | maskN | 中位 | ≥25 比例 | Δ200max | drop | flashRuns | burnProbes | 量到的跳字 | ticks | froze | swallowed | acct.ok |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 🟢 | 🔴 | 🟢 | 🔴 | 🔴 | 13 | 75.68 | 1 | 5.85 | moved 5／tinyMask 2 | 24 | 4 | 46 | 6103 | 77 | 0 | true |
| 3 | 🟢 | 🔴 | 🔴 | 🔴 | 🔴 | **0** | — | — | — | moved 4／tinyMask 1 | 8 | 3 | 33 | 6022 | 45 | 0 | true |

`swallowed`＝虛擬時鐘接管 rAF／計時器之後被 try/catch 吞掉的例外數（覆審 (1b)）；
`acct.ok`＝`flashRuns == maskN + burnMaskN + Σ maskDropped` 的帳目恆等式（覆審 (1a)）。
兩欄都是本輪覆審後加的，兩個 seed 各 5 跑全部 `0`／`true`。

證據：`docs/experiments/2026-09-12-l10-determinism-evidence/pump/`（10 份 `metrics.txt` ＋ `md5.txt`）。

**`metrics.txt` 的範圍是加嚴不是放寬**：任務書要的是「R1／R2 數字與 `maskN` 逐位元組相同」，
`metrics.txt` 裝的是**整份 `verdict.res` ＋整份 `verdict.summary` ＋ `ticks`／`froze`／
`maskDropped` 的逐項計數 ＋ `bad[]` 全文**——比要求的多，比對通過的門檻只會更難不會更鬆。
它的鑑別力也實測過：開發途中兩跑只差「同一幀的背景像素」（`maskMin` 32.97 vs 32.81），
`metrics.txt` 的 md5 就已經不同。

### 驗收 2　活性 🔴（**未達**，卡在哪見 §5）

- **取樣幀數**：seed 1 = **77** 格凍幀（`froze`，`shots` 亦 77）；seed 3 = **45**。兩者 >0。
- **被量到的傷害事件數**：
  - seed 1：跳字冒出 51 個、**量到 46 個**（`op ≥ 0.8` 的那幾幀）；`ys:fx-hit` 62 筆、燒毀 16 筆；
    刺激序列 24 輪 → **可判樣本 `maskN=13`**（＞0）。
  - seed 3：跳字冒出 35 個、**量到 33 個**；`ys:fx-hit` 30 筆、燒毀 13 筆；
    刺激序列 8 輪（4 個真刺激＋3 個燒毀探針＋1 個 tinyMask）→ **`maskN=0`**。
- ⇒ seed 1 過、**seed 3 未達**。

### 驗收 3　鑑別力 🟢

**（甲）舊法確實不決定性**——用**改前的原始檔案副本**跑，不是改壞現行檔：
`cp scratchpad/l10/backup/dmg-readability.mjs.orig tests/tools/_dmg-orig.mjs`
（`tests/tools/_*.mjs` 在 `.gitignore` 內），同樣參數 seed 1 duels=8 連跑 5 次：

```
f1c9f8dc9233e7bcd092e967800a2306 *scratchpad/l10/orig-s1-1/metrics.txt
cf9e8d48e5810bf8eb77e7d71636a081 *scratchpad/l10/orig-s1-2/metrics.txt
762058bc30c4a5ad47f6dfcca37edaeb *scratchpad/l10/orig-s1-3/metrics.txt
3c9e2ce888f77266f24fedb252814634 *scratchpad/l10/orig-s1-4/metrics.txt
1eb3fb3bb197892c48197c58bcb5c654 *scratchpad/l10/orig-s1-5/metrics.txt
```

**5 份全不同**，且判定本身在翻：

| 跑次 | R2 | R2main | R2sub | maskN | 中位 | Δ200max | moved | floats |
|---|---|---|---|---|---|---|---|---|
| 1 | 🔴 | 🟢 | 🔴 | 15 | 77.05 | 5.54 | 5 | 42 |
| 2 | **🟢** | 🟢 | 🟢 | 17 | 74.75 | 4.39 | 3 | 42 |
| 3 | 🔴 | 🟢 | 🔴 | 17 | 63.61 | 5.71 | 3 | 43 |
| 4 | **🟢** | 🟢 | 🟢 | 15 | 76.25 | 4.39 | 5 | 43 |
| 5 | 🔴 | 🟢 | 🔴 | 17 | 70.00 | 5.69 | 3 | 42 |

2🟢／3🔴，與 §7.2 表（本樹 seed 1：2🟢／3🔴、maskN 16–17、moved 2–4）**同一個現象、同一個量級**。

同一支舊法在 **seed 3** 也跑了 5 次（`orig-s3-*`）：**md5 5 份同樣全不同**
（`1fb30dde…`／`e6bd7844…`／`0bd9b7bd…`／`649369fb…`／`2c3e8e9a…`），
但判定是穩定的紅——`maskN=0 ×5`、`via {hitstop:4, timer:0} ×5`、`maskDropped {moved:4, tinyMask:2} ×5`、
`floats` 30–33。**這證明 seed 3 的 `maskN=0` 在舊法上就已經存在，不是本卷造成的**（§5）。

用完之後 `tests/tools/_dmg-orig.mjs` 留在 gitignore 內、不進版本；現行檔沒被動過。
**等效的第二條路已實跑確認**：現行治具加 `--wallclock=1`（seed 1 duels=8 的 5 跑證據仍以上表的原始檔為準；
這裡只驗這條路真的切得回去）——
`metrics.txt` 首行 `clock=wallclock`，seed 1 duels=2 量到 `froze=20／maskN=10／floats=4／via {hitstop:0,timer:10}`，
與本卷動手前拿原始治具跑的同一組參數（`froze=20／maskN=10／floats=4／via {hitstop:1,timer:9}`）同一量級。

**（乙）產品端突變 → L10 R1 轉紅**：把跳字 hit 字級 ×0.5
（`index.html:499` `font-size:calc(17px * var(--dmgs,1.6))` → `… * 0.5`），
同一條 pump 指令（seed 1 duels=8）：

```
VERDICT R1=FAIL R2=FAIL R2main=PASS R2sub=FAIL R5pix=FAIL
R1 字級 seq=1 hit 13.6px < 27.2px      ← 健康態是 27.2px（＝17×1.6）
R1 字級 seq=2 hit 13.6px < 27.2px
R1 字級 seq=6 hit 13.6px < 27.2px
R1 對比度 4.39 < 4.5 seq=9 …
```

還原：`cp scratchpad/l10/backup/index.html.orig index.html`（**改壞前的備份副本**，不是反向 sed）。
還原後 `md5sum index.html` ＝ `a8037c15c4b64b91c86b8f46addd2c18` ＝ 備份副本的 md5；
`git diff --stat -- index.html js/` **輸出為空**。
反面（健康態會變綠）同時成立：驗收 1 的 10 跑 `R1=true`。

### 驗收 4　與舊法同座標系 🟢

基準樹就是本樹——`git diff 417b197..HEAD -- index.html js/` 為空（驗收 5），
所以下表「舊法」欄就是**本樹上用改前檔案跑出來的**，不是隔壁 worktree。

| 指標 | 舊法（§7.2 表，本樹 seed 1，5 跑） | 舊法（本卷今天重跑，5 跑） | 新法 pump（5 跑，逐跑相同） |
|---|---|---|---|
| R1 | 🟢×5 | 🟢×5 | 🟢×5 |
| R1 字級簽章 | hit 27.2／kill 35.36／unit 17 | 同左 | **同左（逐位數相同）** |
| R2main | 🟢×5 | 🟢×5 | 🟢×5 |
| R2sub | 🟢2／🔴3 | 🟢2／🔴3 | **🔴×5（決定性）** |
| `maskN` | 16–17 | 15–17 | **13** |
| 中位 | 61.09–77.85 | 63.61–77.05 | **75.68**（落在舊區間內） |
| ≥25 比例 | 0.938–1 | 1 | **1** |
| `Δ200`（max） | 2.64–6.50 | 4.39–5.71 | **5.85** |
| `maskDropped` | moved 2–4 | moved 3–5 | moved 5／tinyMask 2 |
| 量到的跳字 | — | 42–43 | **46** |
| seed 3 `maskN` | 0×5 | 0×5 | **0×5** |
| seed 3 `via` | （未列） | `{hitstop:4, timer:0}`×5 | `{hitstop:4, timer:0}`×5 |
| seed 3 `maskDropped` | （未列） | `{moved:4, tinyMask:2}`×5 | `{moved:4, tinyMask:1}`×5 |

**差異全部來自取樣位置，不是量法**：
`judgePix`／`silhouette`／`maskDeltaOnMask`／`redness`／`ringAvg`／`contrast` 與
`MASK_TH=8`／`MOVE_MAX=4`／`BASE_FONT=17`／`FONT_MIN=1.6`／`BACK_MAX=5`／`BURN_MAX=10`／`CTRL_MAX=10`／
主門檻 `中位 ≥25 且 ≥25 比例 ≥0.70` **一行都沒進 diff**（§1 末尾的 grep 實測）。
取樣位置變了的原因有三，逐項寫明：

1. **每一幀的間隔固定 16.67ms**（舊法跟著真實幀率，忙的時候一格 30–50ms）⇒ 凍在哪一幀不同。
2. **背景粒子改固定種子**（見 §1）⇒ 同一幀的背景像素固定，但與舊法的某一次不同。
3. **點擊落在固定的 tick 序號上** ⇒ 整場對決的時間軸與舊法有整體位移。

其中 **R1 的字級簽章（主判準）逐位數不變**，證明換的是取樣位置而不是尺規。
`Δ200` 由「逐跑 2.64–6.50 亂跳」變成「固定 5.85」——它現在是一個**可複現的紅**，
不再是 §7.2 說的「不可信訊號」；要不要因此判 L10 紅，是 §7 交裁的事（本卷不動門檻）。

### 驗收 5　範圍 🟢

```
$ git diff 417b197..HEAD --stat
 tests/tools/README.md           |  33 +++++
 tests/tools/dmg-readability.mjs | 268 +++++++++++++++++++++++++++++++++++++---
 2 files changed, 286 insertions(+), 15 deletions(-)

$ git diff 417b197..HEAD --stat -- index.html js/
（空）
```

把本檔與 `docs/experiments/2026-09-12-l10-determinism-evidence/` 也 commit 進去之後的最終狀態
（`31e818d`）：

```
$ git diff 417b197..HEAD --stat | tail -4
 .../2026-09-12-l10-determinism-report.md           | 375 +++++++++++++++++++++
 tests/tools/README.md                              |  33 ++
 tests/tools/dmg-readability.mjs                    | 268 ++++++++++++++-
 29 files changed, 2002 insertions(+), 15 deletions(-)
      ← 其餘 26 個全部是 docs/experiments/2026-09-12-l10-determinism-evidence/** 的證據檔

$ git diff 417b197..HEAD --stat -- index.html js/
（空）

$ git status --short
（空）
```

commit 序：`9a03db9` 治具 → `1427ff2` README → `31e818d` 報告與證據。

### 驗收 6　規則測試全綠 🟢

```
$ node --test tests/*.test.mjs
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2250.5248
```

### 驗收 7　commit 🟢

逐步 commit、訊息繁體中文、**未合併回 main、未 push**（見 §8）。

---

## 5　seed 3 為什麼還是 `maskN=0`（驗收 2 未達的根因）

逐樣本攤開（`scratchpad/l10/pump-s3-1/pix.json`，5 跑逐值相同）：8 輪刺激裡

- 3 輪是**燒毀探針**（`burning:true`，本來就不進 `maskN`）、1 輪 `tinyMask`（`maskFrac 0.03`）、
- 剩下 **4 輪真刺激全部 `via:"hitstop"`，而且全部被 `moved` 閘擋掉**：

| run | 命中前方框 | +40ms 方框 | 位移 |
|---|---|---|---|
| 15 | `197,102,318,252` | `40,104,220,309` | ~157px |
| 21 | `512,35,640,252` | `590,16,757,299` | ~117px |
| 28 | `256,91,367,242` | `324,96,439,277` | ~72px |
| 41 | `498,116,698,252` | `634,150,952,331` | ~254px |

（`hk40` 顯示閃紅**有**發生，例如 run 15 是 `[[1],[0]]`；被擋的原因純粹是畫面在動。）

**根因（不是 seed 的運氣，是結構性的）**：治具把刺激釘在 `ys:hitstop`，理由寫在
`dmg-readability.mjs` 的註解——「hitstop 期間 renderer 的 dt 歸零、鏡頭完全不動」。
**這句話是錯的**：

- `js/renderer.js:197` 確實在 hitstop 期間把 `dt` 歸零，
- 但 `js/camera-director.js:367–369`／`:397–399`（`:495–496` 呼叫） 的 `focusEnvelope(now)`／`cinemaEnvelope(now)`
  吃的是**絕對時間** `now - focusAt`，`renderer.js:201` 又把 `now` 一起傳進 `director.update(dt, now)`
  ⇒ **hitstop 期間鏡頭的推近包絡照走**。
- 而 `index.html:4313/4336` 明寫 `FOCUS_DMG:3` ＝ `HITSTOP_DMG:3`「同一個『這一下夠重』的門檻」
  ⇒ **會觸發 hitstop 的那一下，同時也會觸發 `pwFocus` 推鏡**。

所以「釘在 hitstop 取樣」在設計上就會落進推鏡窗；seed 1 之所以還有樣本，是因為它 20 次成功刺激裡
有 13 次走的是**計時器**那條路（`via {hitstop:7, timer:13}`）；seed 3 的戰鬥密集、跳字頻繁，
`M.tryFire` 的「剛冒出跳字 700ms 內不讓計時器插隊」把 timer 那條路整個餓死
（`via {hitstop:4, timer:0}`），剩下的全落在推鏡窗裡。

**經驗掃描（不是符號式恆假證明，照實標明）**：在 seed 3 上，「釘在 hitstop 的刺激必然落進推鏡窗」
這件事的實測涵蓋是——每跑 4 筆 hitstop 刺激 × （新法 5 跑 ＋ 舊法 5 跑）＝ **40 次觀察，
位移閘門 40/40 命中、`maskN` 恆為 0、`via` 恆為 `{hitstop:4, timer:0}`**。
**但這只是經驗上的恆真，不是符號推導**（`02 §6.1` 第 6 條要的那種掃描還沒做——
要做的話是固定 seed 3、逐筆記錄 `focusOn`／`focusAt` 的窗與取樣時刻的重疊，
證明「只要釘在 hitstop，`mv40 > MOVE_MAX` 在 seed 3 上恆真」）。**做那個掃描本身不提高通過機率**，
列進 §7 Q5 當可以先做的一步。

**為什麼不自己修**：能讓 seed 3 拿到樣本的每一種做法——放寬 `MOVE_MAX`、把刺激避開推鏡窗、
放寬「700ms 不讓插隊」、加大 `maxhit`／`duels`——**都會提高通過機率**，屬 `02 §2.1`
「移動及格線」（`duels 8→20` 這一條 §7.2 N6 已經明寫過是候選的及格線移動、未採用）。
依 `03 R3` 第 6 條，列在 §7 交裁。
**⇒ 本卷對 seed 3 這一格「刻意不修，已經停手」——它不是本卷的待辦，是使用者裁完才動的下一步。**
（覆審提醒：「每一種做法都會提高通過機率」這句在 `02 §2.1` 的**例外**面前不是絕對的——
若那個掃描證明它**恆真**，`§2.1` 允許自行修正、事後回報。本卷沒做那個掃描，所以不走例外。）

---

## 5.5　對抗式覆審的處置（fresh `opus`，只給 diff 與證據、任務是「反駁這個宣稱」）

`02 §3`：CRITICAL／HIGH 必修或簽准；MEDIUM／LOW 可自行判斷「不影響正確性、記錄不修」。

| # | 覆審 finding | 嚴重度 | 處置 |
|---|---|---|---|
| 2a | pump 的 `freeze()` 不 pause 動畫 ⇒ 截圖視窗裡 CSS 動畫沿牆鐘跑 | **HIGH** | **已修**（`F.pauseAll()`）＋重驗 5+5 跑仍逐位元組相同，數字有變（§3④） |
| 1b | `errors=0` 鑑別力接近零（rAF／timer 回呼的例外不會變 pageerror） | MEDIUM | **已補**：`F.errs` 計數，`metrics.txt` 印 `swallowed=`（兩 seed 各 5 跑全 0） |
| 1a | 拿不到剪影的那幾輪在 `judgePix:1132` 靜默 `continue`、不進 `maskDropped`，`why==='noMask'` 不可達 | MEDIUM | **不改 `judgePix`**（量法不在本卷範圍，動它會毀掉驗收 4 的「量法零 diff」證據），改成**把帳目恆等式印出來**：`acct.flashRuns`／`acct.sum`／`acct.ok`。兩 seed 各 5 跑 `acct.ok=true`。**這是既有缺陷**（改前的檔案就是這樣），修它列進 §7 Q5 |
| 4-附 | `judgePix:1231` 的 `rejBurn` 恆 0、`rejOffDuel` 恆等於樣本總數（讀到不存在的欄位） | LOW | **既有缺陷、不改**（同上，量法不動）。已在此記錄，證據對得上：s1 `rejOffDuel=24`＝`flashRuns`、s3 `=8`＝`flashRuns`。列進 §7 Q5 |
| 5① | `M.tryFire` 上面那段「hitstop 期間鏡頭完全不動」的理由已被 §5 證偽 | MEDIUM | **已更正註解**（不動程式邏輯、不影響通過機率），並把實測寫進去 |
| 5② | 報告把「我沒去驗它是不是恆假」講成「沒有別的路」 | MEDIUM | **已改寫 §7**：附上實測的經驗掃描（40/40），並明說那不是符號式恆假證明 |
| 2b | net 閘蓋不到 ES module 的 `import()`（只靠 boot 等待與 Node 端批粒度的 `inflight`） | MEDIUM | **記錄不修**：三支 `loadMoves` 是 top-level await、在 `__yaoshi3d` 之前完成，被 boot 等待蓋住；GLB 走 XHR、貼圖走 `Image.src`／`createImageBitmap`，都在閘內。**實測 10 跑逐位元組相同**支持涵蓋是夠的；但這是「靠別的性質剛好蓋住」不是防線，列進 §7 Q5 |
| 2c | `Event.prototype.timeStamp` 的 getter 回「讀取當下」而非「事件建立時刻」 | MEDIUM | **記錄不修**：pump 模式下同步 `el.click()` 沒有排隊 ⇒ 兩者等價。**但這代表這支治具不能拿來驗連點守衛／相位閘**（`index.html:2277`／`:2331`），會假綠——已寫進 README 與此處 |
| 2d | Web Audio 的 `ctx.currentTime` 沒虛擬化 | LOW | **不修**：不回饋到畫面。`windStart` 的 `setInterval(7000)` 已虛擬化，所以它消耗 `S.rngUi()` 的次數是決定性的 |
| 3-附 | 被剔掉的那 2 筆 `tinyMask` 的 `maskD` 根本沒被量出來過 ⇒ 是「沒有證據」不是「有證據說沒差」 | MEDIUM | **照實記錄**：新舊法 `maskGe25Ratio` 都是 1、`flashRuns` 都是 24、帳目兩邊都平；`tinyMask` 這個類別在**舊法的 seed 3 本來就有 2 筆**，不是本卷發明的 |
| 6 | `F.animStep` 對 `playbackRate≠1`、`cancel()` 後再 `play()` 同一物件會弄錯 | LOW | **不修**：全 repo `grep playbackRate` 零命中；跳字雖走重用池但每次都是新的 Animation 物件（建立當下就被攔截歸零）。無用例 |
| 4 | 量法與門檻有沒有被偷改 | — | 覆審**實跑核對後判定沒有**（grep exit 1、零命中），案例集與前一卷 §7.2「條件固定」逐字相同 |
| 4-batch | `--batch` 沒附 `02 §2.1` 要的「改前／改後實測數字」 | LOW-MEDIUM | `BATCH` 是本卷**新增**的參數（版控裡查不到舊值 30，第一個 commit 起就是 36），不碰任何判準；理由可驗（`index.html:2251 MAIN_GUARD_MS=500`，30×16.667＝500.0000…貼著門檻）。照實記錄於此 |

---

## 6　誠實記錄：本卷**沒有**解決的事

1. **seed 3 的 `maskN=0`**（§5）。
2. **`R5pix` 10 跑全 🔴**：與 §7.2 的 20 跑一致，且它不在 L10 條文內（L10 只要 R1／R2
   ＋`closeup-judge` 的 null 數）。紅的原因新舊法相同——`skipAfter300` 為 `null`
   （+300ms 那一格量不到紅偏量），`skipFlash` 兩邊都有值（新法 seed 1 = 31.37、舊法 = 22.6–23.04）。
   seed 3 兩邊都連 `skipFlash` 都沒有。**沒有改善也沒有變差**。
3. **`closeup-judge` 的 nullCount**：本卷沒有重跑（不在範圍內）。
4. **`dom` 模式**維持舊時鐘，沒有決定性保證（L10 不讀它）。
5. **只在這一台機器上驗過**：決定性依賴同一顆 GPU／驅動下 WebGL 逐位元組可重現。
   換機器重跑 md5 可能不同（但同機 5/5 相同已足以支撐「取樣不再受機器忙閒影響」這個宣稱）。
6. **本 worktree 的基準 `417b197` 已經不是 main 的頭**：合併時要注意 main 多了 4 個 commit
   （`cd9cc6c`／`67c3d07`／`5306a8d`／`38bf02e`），其中 `38bf02e`「凍結檔修訂五」③ 把四支示範招
   **預設退回 0.54 演出**、`?fxvocab=1` 才看 0.55 徽記版（VERSION 0.55.1）。
   - **合併本身乾淨**：`git diff 417b197 main -- tests/tools/dmg-readability.mjs` 為空，
     main 沒有動過這支治具。
   - **但本報告 §4 的數字是在 `417b197` 上量的**；main 的預設演出既然換了，
     在 main 上重跑 R1／R2 會是另一組數字，不能直接拿本報告的數字去對。
     （決定性這件事不受影響——它是治具的性質，不是某一組數字。）

---

## 7　交裁（本卷不動，列給使用者決定）

> **這一節全部是「還沒做、等裁定」**。本卷**沒有**改過凍結檔
> `docs/experiments/2026-09-11-acceptance-fx-legibility.md`，也沒有改過任何門檻——
> §1 的改動清單就是本卷動過的全部檔案（`tests/tools/dmg-readability.mjs`、
> `tests/tools/README.md`、本報告與證據目錄）。下表「建議答案」欄是**提案**，不是已完成的動作。

| # | 題 | 建議答案 |
|---|---|---|
| Q1 | **seed 3 `maskN=0` 怎麼辦**：(甲) 認定「seed 3 在 duels=8 下沒有可判樣本」是既成事實，L10 條文改寫成「以有樣本的 seed 判、無樣本的 seed 記錄不判」；(乙) 同意把刺激來源從 `ys:hitstop` 改掉（例如改釘在「focus 包絡已經走完」的那一刻），這是移動及格線、要走 `02 §2.1`；(丙) 維持現狀＝seed 3 永遠 fail-closed 紅 | ➡️ **乙**，但要先把 §5 的根因寫進凍結檔當「原標準錯在哪」；理由：現在的紅**不是產品退步**，是治具把取樣點釘在產品一定會推鏡的那一刻，留著它等於長期拿一個無鑑別力的紅當判準 |
| Q2 | **seed 1 的 `Δ200 = 5.85 > 5` 現在是決定性紅**，要不要據此判 L10 紅？凍結檔自己在 `修訂 2-C` 的註解裡寫過「基準 v0.48 無閃紅功能也量到 +6.1，±5 低於量法雜訊底」 | ➡️ **先不判紅，改成量出雜訊底再訂**：在「產品沒有閃紅功能」的對照版本上跑同一支治具，量 `Δ200` 的分布當雜訊底，再決定 `BACK_MAX` 該是多少。這是**加嚴／校準**方向的工作，不是放寬，但仍動到門檻 ⇒ 要使用者同意 |
| Q3 | 凍結檔 §2.1 修訂三 ⑤ 的「訊號不可信、記錄不判」要不要解除？ | ➡️ **部分解除**：取樣已決定性，`R1` 與 `R2main` 可以開始判（10 跑全綠、逐跑相同）；`R2sub` 與 seed 3 那一格等 Q1／Q2 裁完再解 |
| Q4 | `--wallclock=1` 這條舊路要不要留？ | ➡️ **留**，它是唯一一條「同一顆二進位證明舊法不決定性」的路；README 已標明它不決定性 |
| Q5 | **對抗覆審留下的既有缺陷要不要另開一卷修**（三件都在 `judgePix`／量法那一側，本卷刻意不碰）：① `judgePix:1132` 拿不到剪影的那幾輪靜默 `continue`、`why==='noMask'` 不可達 ② `judgePix:1231` 的 `rejBurn` 恆 0／`rejOffDuel` 恆等於樣本總數 ③ 做 §5 那個符號式恆假掃描 | ➡️ **另開一卷、三件一起做**。①②是**加嚴**（把靜默消失變成 fail-closed、把兩個零鑑別力欄位拿掉），③是純量測，三件都不提高通過機率，可自行做完再回報；但它們會動到 `judgePix`，動了就不能再用「量法零 diff」這條證據 ⇒ 不該夾在本卷裡做 |

---

## 8　怎麼複現 / 證據路徑

```bash
# 決定性（本卷主閘門）——最終版的證據是 pump2-*（對抗覆審的 HIGH 修掉之後那一輪）
sh scratchpad/l10/run5.sh pump2 1 9060     # seed 1 ×5
sh scratchpad/l10/run5.sh pump2 3 9070     # seed 3 ×5
md5sum scratchpad/l10/pump2-s1-*/metrics.txt scratchpad/l10/pump2-s3-*/metrics.txt

# 鑑別力（甲）：改前的原始檔案副本
cp scratchpad/l10/backup/dmg-readability.mjs.orig tests/tools/_dmg-orig.mjs
sh scratchpad/l10/run5orig.sh 1 9000
# 等效第二條路（同一顆二進位）
node tests/tools/dmg-readability.mjs pix <outdir> --seed=1 --duels=8 --port=<埠> \
     --maxfloat=50 --maxhit=20 --wallclock=1

# 鑑別力（乙）：產品突變 canary
#   index.html:499  font-size:calc(17px * var(--dmgs,1.6))  →  … * 0.5
node tests/tools/dmg-readability.mjs pix scratchpad/l10/canary-s1 --seed=1 --duels=8 \
     --port=9021 --maxfloat=50 --maxhit=20     # → R1=FAIL
cp scratchpad/l10/backup/index.html.orig index.html          # 用備份副本還原

# 規則測試
node --test tests/*.test.mjs
```

- **落在版本控制裡的證據**：`docs/experiments/2026-09-12-l10-determinism-evidence/`
  （`pump/`：10 份 `metrics.txt`；`orig/`：舊法的 `metrics.txt`；`canary/`：突變那一跑；
  `md5.txt`：全部 md5；`probe/`：§3② 的探針輸出）。
- **不落版控的中間產物**（`scratchpad/` 在 `.gitignore` 內）：逐跑的 `pix.json`、`frames/*.png`、
  `scratchpad/l10/backup/`（改前的 `dmg-readability.mjs`／`index.html`／`duel-figures.js` 備份副本）、
  `scratchpad/l10/probe.mjs`／`pngdiff.py`／`distill.mjs`／`run5*.sh`。

**worktree**：`C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-af605d875c0e0e52d`
（基準 `417b197`）。**未合併回 main、未 push。**
