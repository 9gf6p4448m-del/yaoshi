# 對抗式覆審 第 3 輪（上限輪）：判定第 2 輪 5 條新問題的三態

冷讀，無對話史。範圍只有第 2 輪「新問題」段的 N1／N2／N3／N4／L4-M4 續五條，
外加「有沒有把及格線搬淺」與「修 A 壞 B」兩問。

**結論：3 條真的修好（N1／N3／L4-M4 續）、2 條表面修好（N2／N4）、0 條沒修到。**
**N3 是不是放寬：不是，是加嚴。**預設幀距下門檻由 `react[0]` 收到 `windup[1] + 一幀`：
t1 **208 → 120.7**、t2 **560 → 316.7**、t3 **860 → 476.7**（各收掉 42%／43%／45%）。
而且我做出一條**舊門檻會放它綠、新門檻判它紅**的突變（下面 §N3-4）——加嚴有鑑別力，不是換句話說。
唯一的放寬缺口（低幀率下容差膨脹）**作者自己在我覆審期間查出並補上了**（見 §0）。

---

## 0. ★先講一件程序問題：覆審對象在我量測期間被動過（`02 §7`）★

| 時刻 | 事件 |
|---|---|
| 01:0x | 我開工，`git status` clean、HEAD＝`994ce51` |
| **01:14:10** | `js/trait-fx.js` 被改（工作區變 dirty）——改的正是 `windupOK` 那一行 |
| 01:15:32〜01:17:37 | **我的 6 次治具量測**（全部落在改檔之後） |
| **01:20:17** | 該修改被 commit 成 `cb7d99a`「windupOK 的取樣容差夾在 react[0] 以內（自查補的）」 |

後果三條，都要記：

1. **我實際量到的是 `cb7d99a`，不是被指派的 `994ce51`。** 差異是
   `peakAt <= B.windup[1] + run.maxDvt` → `peakAt <= Math.min(B.react[0], B.windup[1] + run.maxDvt)`。
   我的數字以 `windupSlack`（＝`run.maxDvt`，兩版都照原值輸出）為準，所以**兩版的門檻我都算得出來**，
   下面逐處標明「994ce51 的門檻」與「cb7d99a 的門檻」。
2. **`cb7d99a` 又製造了一次 N1 同型的分岔**：它動了 `windupOK` 的落點，
   但 `docs/experiments/2026-09-13-zuling-b2-report.md` 一個字沒改
   ⇒ 報告 §1.6d 的 N3 列寫的修法（`peakAt ≤ windup[1] + 一個實際的虛擬時間步長`）
   與程式（多了 `Math.min(react[0], …)`）不一致；§1.6c 的 H4 列更是還寫著 `≤ react[0]`。
   方向是加嚴、沒有紅燈被牽動，所以是 **LOW**，但這正是 N1 被開 HIGH 的那個形狀，同一天內復發。
3. 覆審期間動被審的檔＝覆審員量到移動中的目標。這次運氣好（改動只收緊、且我能用 `windupSlack` 回推兩版），
   但下一次不會。

---

## N1（HIGH）報告與同 commit 證據檔分岔 — **真的修好（真實路徑，實跑重現）**

**報告已改正的三處**（`docs/experiments/2026-09-13-zuling-b2-report.md`）：
- `:151`「只有 1 列超標＝`swarmLastStand` 的殘旗 **0.818**（批 1 就在案，當時是 0.789）」
- `:153-157` 引言塊寫明成因（`figH` 1.1635→1.1229、−3.5%、`舉臂 scl 1.04` 在量測幀已被包絡收回）與
  「是本階段推上去的」「沒有紅燈接住，正因為沒有紅燈才要照實寫」
- `:354-357` §1.8 第 7 點同步改成 0.789→0.818 並列進待裁

`grep -n "0\.789|本階段未動"` 之後**沒有任何殘留的矛盾句**：
`:151/:154/:271/:354` 的 0.789 都是「當時是／→」的沿革敘述；
唯一剩下的「本階段未動」在 `:358`，指的是 `st.paperProps`／`st.paperStamp`／`st.pillar` 不在尺寸鎖裡
（另一件事，敘述正確）。

**逐項核對報告引用的數字 vs 證據檔**（✔＝逐位相同）：

| 報告處 | 數字 | 證據檔 | 判 |
|---|---|---|---|
| `:145-148` §A3 表 | eliteSelfCut figH 2.2372／emblem:knife 1.1281＝0.504／prop:knife 0.255＝0.114／floor:pillar 1.30＝0.581 | `prop-size/prop-size-t2.tsv:2-4` | ✔ |
| `:151` | 殘旗 0.818、腳下環 0.606、figH 1.1229 | 同上 `:33-34` | ✔ |
| `:151` | 「t2 全表 **18 列**裡只有 1 列超標」 | t2 共 33 列，其中 `type=prop` **18 列**、`other` 15 列；`OVER` 計數＝**1** | ✔（18＝規則適用的 prop 列） |
| `:129-133` P3 t2 十支 area／ΔE | 0.9943/68.35、1.9699/88.71、0.8768/65.04、1.8647/82.53、0.97/85.79、2.5933/74.79、1.0208/109.35、1.2471/77.86、1.5406/84.45、0.9968/83.54 | `p3-t2/metrics.txt` | ✔ **十列全對** |
| `:106` | P3 t1／t2 各 10/10 | 兩檔尾行 `"n": 10, "pass": 10, "failed": []`，門檻行 `area_pct_min 0.8／de_median_min 28.0` **未動** | ✔ |
| `:285` | fxvocab 26 綠／0 紅、28 條突變逐條驗紅 | 我獨立重跑：健康 **26 綠／0 紅**；`--mutate=1..28` **28 條全有紅**（1 是 4 紅、22／27 各 2 紅、其餘各 1 紅） | ✔ |

**獨立重跑 prop-size 驗證可重現性**（真實路徑，不是讀檔）：
`node tests/tools/prop-size.mjs scratchpad/r3-ps --only=swarmLastStand,eliteSelfCut --tier=2`
⇒ `swarmLastStand 1.1229 emblem:tornflag 0.9184 0.818 OVER`、`ring 0.68 0.606`、
`eliteSelfCut 2.2372 / 0.504 / 0.114 / 0.581`——**與證據檔逐位相同**。`errors=0`。

**兩個 LOW（記錄，不是 N1 沒修）**：
1. `p3-t2/metrics.txt` 在 `994ce51` 又被重跑過一次（eliteSelfCut area 0.9919→**0.9943**、
   wardAtkAll1 1.9686→1.9699、wardHpFirst 1.2486→1.2471），門檻行**逐字未動**、仍 10/10；
   報告表已同步成新值 ⇒ 不是分岔。成因合理（N2 改了 delay，動畫真的差一幀）。
2. `prop-size/*.tsv` 在 `994ce51` **沒有出現在 diff 裡**，而報告 `:271` 的重驗欄寫「prop-size t1／t2 重跑」。
   若真跑過，那就是確定性輸出（我上面的重跑也是逐位相同，支持這個解讀）；
   但「重跑過」這件事本身沒有落檔可證。**無法確認是否真的重跑；數字一致這件事我驗過了。**

---

## N2（MEDIUM）姿態包絡收回終點偏移 — **表面修好**

**修法本身是對的**（算術，`js/trait-fx.js:1358`）：
`off = Math.max(0, B.travel[0] + TT*0.45 - run.vt)` ⇒ `start = run.vt + off = travel[0] + 0.45·TT`，
`end = start + 0.55·TT = travel[0] + TT = react[0]`。**終點恰好落在衝擊拍**，與 `groundMark` 熄掉同一時點。
`run.vt` 被消掉，第一次呼叫在哪一幀都不影響終點。r2 點名的偏移**真的修掉了**。

**為什麼仍判「表面」：`Math.max(0, …)` 是一個沒說明、沒守衛的第二分支。**

| tier | clamp 觸發條件（`vt_first >`） | 觸發時的收回終點 |
|---|---|---|
| 1 | `104 + 0.45×104` = **150.8** | `vt_first + 57.2` > `react[0]`＝208 |
| 2 | `300 + 0.45×260` = **417** | `vt_first + 143` > 560 |
| 3 | `460 + 0.45×400` = **640** | `vt_first + 220` > 860 |

- 觸發時**不是「立刻收回」**（tween 長度不變），而是**收回終點越過衝擊拍**——
  正是 H3 要修的那個症狀的弱化版（衝擊拍當下 `staK` 還沒歸零）。
- **沒有任何斷言在量收回**：`grep staK|\.sta\b tests/tools/*.mjs tests/*.mjs` ⇒ **零命中**。
  作者已把這條寫進報告 `:40` ⑮ 的「殘留」與 §1.8（誠實），但它仍是本條沒關閉的那一半。
- **唯一的掩護是 N3 的新門檻，而且是間接的**：`peakAt > vt_first`，而新門檻（預設幀距）
  t1 120.7／t2 316.7／t3 476.7 **都小於**上表的觸發點 ⇒ clamp 一觸發 `windupOK` 必紅。
  **實測**：把 `wardImmuneLost` 的姿態 tween 改成 `delay: R0 + 60`（`vt_first≈620 > 417`，clamp 確實觸發）
  ⇒ `{"peakAt":750,"windupOK":false}`、`stanceOK=false`、**FAIL**。掩護有效。
- **但這個掩護在低幀率下會消失**（`cb7d99a` 之後）：門檻被 `Math.min(react[0], …)` 夾住，
  `maxDvt` 一大就退化成 `react[0]`——t1 的 208 **大於** clamp 觸發點 150.8、t2 的 560 大於 417
  ⇒ 存在「clamp 觸發、`windupOK` 仍綠」的組合。t1／t3 那時 `rateOK` 已紅（不可能綠著過），
  **t2 的 `rateOK` 不進 `pass`**（`traitfx-drive.mjs:411`）⇒ t2 是理論上唯一綠著漏掉的路，
  需要 `maxDvt ≥ 260`（`dt=100` 時要 `rate ≥ 2.6` > `rateMax 2.2`，只有收工前兩幀 `cap=Infinity` 那段做得到）。
  **我沒有把這條做出來**，所以它是記錄的耦合，不是已證實的洞。
- **⑮ 的措辭仍略微過頭**：報告 `:40` 寫「由建構上成立（編舞寫不出『不收回』）」。
  嚴格講編舞寫不出「不收回」，但**寫得出「收回越過衝擊拍」**（晚呼叫 `st.stance` 即可）。
  差別現在靠 `windupOK` 判紅，不是靠建構。

**建議（不修，交裁）**：clamp 觸發時直接 `noteThrow`／記進 `stats`，讓它從「靠另一條門檻間接接住」
變成「自己會響」；或在 `st.stance` 的 JSDoc 補上與 `st.groundMark:1430-1432` 同一條限制註記
（r2 對 M1 已經要過這件事）。

---

## N3（MEDIUM）`windupOK` 比宣稱寬一整個 travel 段 — **真的修好；不是放寬，是加嚴**

### N3-1 `run.maxDvt` 到底是什麼（逐字讀 `js/trait-fx.js:1645-1650`）

```
run.maxDvt = Math.max(run.maxDvt, ms * run.rate);   // ms = dt*1000（真實幀距）
run.vt    += ms * run.rate;
```
＝**整套演出用過的最大虛擬時間步長**。三件事要注意：

1. `run.rate` 夾在 `[1, TFX.rateMax=2.2]`，**但收工前兩幀 `cap = Infinity`**（`:1647`），那兩幀不受天花板。
2. `ms` 由幀距決定：治具預設 `DT_MS = 1000/60`，`--dt=<1..100>` 可覆寫；
   正式路徑 `js/renderer.js:196` 把 `dt` 夾在 **0.1s**⇒ `ms` 最大 100。
3. **`windupOK` 在 `finish()` 判定，取的是整套的 max，不是量到峰值那一幀的步長。**
   ⇒ 收工前的 rate 尖峰會**回頭**放寬蓄勢段的門檻。這是本條最可議的設計選擇（見 N3-5）。

### N3-2 逐 tier 實測容差與門檻（`windupSlack` 是引擎原值輸出，兩版通用）

`beatOf`（`js/trait-fx/vocab.js:31-45`）：t1 `windup[0,104] travel[104,208] react[208,277]`；
t2 `[0,300] [300,560] [560,760]`；t3 `[0,460] [460,860] [860,1180]`。

| 跑法 | slack（＝`maxDvt`） | 994ce51 門檻 | cb7d99a 門檻 | r1 舊門檻 `react[0]` | 方向 |
|---|---|---|---|---|---|
| t1 `dt=16.7` | 16.7 | **120.7** | 120.7 | 208 | **嚴**（−42%） |
| t2 `dt=16.7` `--count=2` | 16.7 | **316.7** | 316.7 | 560 | **嚴**（−43%） |
| t3 `dt=16.7` `--count=2` | 16.7 | **476.7** | 476.7 | 860 | **嚴**（−45%） |
| t1 `--dt=50` | 60 | 164 | 164 | 208 | 嚴 |
| **t1 `--dt=100`** | **180** | **284** | **208**（被夾） | 208 | **994ce51 寬 76ms**；cb7d99a 等於舊門檻 |
| t2 `--dt=100` `--count=2` | 108 | 408 | 408 | 560 | 嚴 |

三件事從上表讀出來：

- **預設幀距（也就是所有落檔證據的跑法）下，兩版都是大幅加嚴。**
- **`994ce51` 確實存在一個放寬區間**：`slack > react[0] − windup[1]` 時門檻反而變寬。
  t1 的臨界是 `slack > 104`（`dt·rate > 104`，`dt≥50` 就摸得到），我在 `--dt=100` **量到了** 180 → 284 > 208。
  作者在 `cb7d99a` 的 commit message 裡自己算的是 `50×2.2=110 → 214`，結論一致（我量到的是同一個現象的更大值）。
- **但那個放寬區間綠不起來**：t1 要 `slack > 104` 就得 `rate > 1.04`，而 `rateOK`（rate ≤ 1.0）**進 t1 的 `pass`**
  ⇒ 該跑法 `pass=false`（我的 `--dt=50`／`--dt=100` 兩跑都是 **0/2 pass，紅在 rateOK**）。
  t3 同理（`rateOK` 也進 t3 的 pass）。t2 要 `slack > 260`，`dt=100` 實測只到 108。
  ⇒ **`994ce51` 的放寬是潛在鬆動，不是「綠燈裡活著的放寬」**；`cb7d99a` 把它夾掉之後連潛在的都沒了。

### N3-3「不加容差 tier 1 會 18/27」——**重現成功，而且原因確認是取樣量化，不是設計違規**

在 gitignore 的樹副本（`scratchpad/tree-noslack/`，原檔全程唯讀）把門檻改成 `peakAt <= B.windup[1]`，
`node tests/tools/traitfx-drive.mjs … --root=scratchpad/tree-noslack --tier=1` ⇒ **18/27 pass**，
逐字吻合作者的說法。9 條紅全部長一樣：

```
eliteSelfCut / wardAtkAll1 / eliteCleave / wardAbsorb4 / swarmRally /
biteGamble / wardHpFirst / wardRegen1 / swarmLastStand
  peakAt=117  windupEnd=104  windupOK=false  stanceOK=false   其餘判準全綠
```

`117 − 104 = 13 < 一幀 16.7`。**這不是「離門檻還很遠」，是差一次取樣。**
可以證明它對任何正確實作都恆假（`02 §6.1` 第 6 條）：`peakAt` 是 `run.vt` 在「`t` 首次達 1」那一幀的值，
而 `run.vt` 是先加後判，所以 `peakAt − (start+ms) < dvt_peak ≤ maxDvt`。
蓄勢 tween 的 `start+ms = windup[1]` ⇒ 嚴格 `≤ windup[1]` **必紅**、`≤ windup[1] + maxDvt` **必綠**。
容差取一個步長，**剛好是消掉量化誤差所需的最小值**，不多不少：

| tier | 新門檻餘裕（9 支） | 容差佔 travel 段 |
|---|---|---|
| 1 | `120.7 − 117` = **3.7ms**（不到 1/4 幀） | 16.7/104 = 16% |
| 2 | `316.7 − 300` = 16.7ms | 16.7/260 = 6.4% |
| 3 | `476.7 − 467` = 9.7ms | 16.7/400 = 4.2% |

（`wardImmuneLost` 例外：`peakAt=50/133/200`，它的姿態 tween 只有 `W*0.42`，峰值在蓄勢段中段。）

### N3-4 ★決定性的一問：新門檻抓得到舊門檻放過的東西嗎——抓得到（實測）★

r2 只驗了「搬到 react 段仍然紅」——那條**舊門檻也會紅**，證明不了加嚴。我補了真正分辨得出來的那一條：
把 `wardImmuneLost` 的姿態 tween 挪到 **travel 段中段**（`delay: T0 + 60`，樹副本）⇒

```
peakAt 500   windupEnd 300   新門檻 316.7 → windupOK=false → stanceOK=false → FAIL
             舊門檻 react[0]=560 → 500 ≤ 560 → 舊門檻下這一支是 **綠的**
```

**同一個違規：r1 的門檻放它過，r2 的門檻判它紅。** 這就是「加嚴有鑑別力」的直接證據。

（順帶：r2 那條 react 段突變我也重跑過，仍紅——`peakAt 750 / windupOK false / FAIL`。兩面都驗過。）

### N3-5 這條剩下的兩點（記錄，MEDIUM／LOW）

1. **容差取的是「整套的最大步長」，不是「量到峰值那一幀的步長」。**
   正確的寫法是在記 `peakAt` 的同時把當下的 `ms*rate` 一起存起來。現在的寫法讓
   **收工前的 rate 尖峰回頭放寬蓄勢段的門檻**；滿編加速的 t2（`rate` 可到 2.2）多出 20ms 的鬆動（travel 段的 7.7%）。
   `cb7d99a` 的夾子限制了上界、但沒有改掉這個「用後面的事放寬前面的判準」的結構。
2. **低幀率下這條門檻會靜默退化成 r1 的寬門檻**（`Math.min` 的另一半生效），而
   `windupSlack` 雖然有輸出、**沒有任何判準在看它**。要讓退化可見，`stanceOK` 應該連
   「`windupSlack` 是否已經大到讓門檻失去意義」一起判，或至少在治具側印警語。

---

## N4（LOW）`run.inBlock` 沒有 try/finally — **表面修好（只包了兩個落點的其中一個）**

r2 原文點名的是**兩處**：`js/trait-fx.js:1352`（`st.stance` 的包絡）與 **`:1475`（`st.groundMark` 的兩條 fade）**。

| 落點 | `cb7d99a` 現況 |
|---|---|
| `st.stance` 包絡 `:1358-1362` | ✅ `try { st.tween(…) } finally { run.inBlock = false; }` |
| **`st.groundMark` 兩條 fade `:1483-1487`** | ❌ **仍是裸的 `run.inBlock = true; … ; run.inBlock = false;`** |

`grep -n inBlock js/trait-fx.js` ⇒ `838, 1349, 1358, 1362, 1480, 1483, 1487, 1533, 1535`：
`1483/1487` 中間夾的是 `st.fade(mesh, …) × 2`，沒有任何保護。
**r2 指名的第二個落點沒被處理**，所以這條是「表面修好」而不是「真的修好」。

殘留風險與原判定相同（**LOW**）：方向偏嚴（旗標卡 `true` ⇒ 編舞自己的 tween 全不計入 ⇒ `acts` 偏低 ⇒ 偏紅），
而且 `st.fade` 從編舞的 tween `update` 裡丟出來會被 `:1658` 的 try/catch 接住記進
`stats.tweenErrors` ⇒ `tweenOK` 紅，不會靜默。但這正是這一批自己反覆引用的
`02 §6.1` 第 7 條的反例：**按已知的入口寫（包了被點名的那一行），不按危險的效果寫**。

**收斂式修法（建議，一行分母歸一）**：把 set/reset 收成一個 helper
`const inBlock = (fn) => { run.inBlock = true; try { return fn(); } finally { run.inBlock = false; } };`
兩處都改用它——這樣「寫得出沒有 finally 的 inBlock」這件事由建構上消失，分母＝1。

**確認 try/finally 沒有改變計數（C2 不退化）**：t1 `acts` ＝ `eliteSelfCut 8`／`wardImmuneLost 16`／
`swarmLastStand 10`／`wardHpFirst 11`，與 r2 實測的 8／16 及報告的「10→8、13→11」逐值一致。

---

## L4 續（LOW）黑名單改白名單 ＋ M4 續（LOW）`spec` 補欄 — **兩條都真的修好**

**白名單完整性（分母數過，不是憑印象）**——`blindread-sheet.mjs` 真的讀到的旗標，逐個取用點：

| 旗標 | 取用點 | 在 `KNOWN` |
|---|---|---|
| `camdist` | `:37` `process.argv.find` | ✅ |
| `count` | `:42` | ✅ |
| `foe` | `:43` | ✅ |
| `mategap` | `:65`（`/i` 不分大小寫） | ✅ |
| `port` | `:182` `opt.port` | ✅ |
| `dt` | `:183` | ✅ |
| `seed` | `:184` | ✅ |
| `tiers` | `:185` | ✅ |
| `proto` | `:186` | ✅ |
| `only` | `:190` | ✅ |
| `label` | `:215`／`:220` | ✅ |
| `fxvocab` | `:224` 經 `fxvocabQ(opt)`（`traitfx-drive.mjs:192` 讀 `opt.fxvocab`） | ✅ |

**12 個讀到的旗標對 `KNOWN` 的 12 項，逐一對上，沒有漏。** 檔頭用法說明列的 9 個是這 12 的子集。
`label` 沒有 `=` 也過（`split('=')[0]` ⇒ `label`）；大小寫不敏感（`.toLowerCase()`）。

**實跑三件**：
```
--frames=6 --cell=780x360   → throw「不認得的旗標 --frames／--cell」
--mate_gap=2                → throw（r2 點名的黑名單漏網拼法，現在擋住）
--mateGap=1.9 --only=__nope__ --tiers=1 → 白名單放行（錯誤來自 --only 篩空，正確行為）
```

**一個要通知的副作用（記錄，不是漏）**：`docs/proposals/2026-09-11-plan-fx-legibility.md:183-184`
那條落檔的指令帶 `--frames=6 --cell=780x360`，**從今天起會當場 throw**。
查證過：這兩個旗標**本支從來沒有讀過**（幀位／格寬照凍結檔 L4 寫死在 `FRAME_AT`／`CELL`），
所以那條指令一直在靜默忽略它們——throw 是**正確**的效果，不是把既有跑法弄壞。
但那份 plan 檔的指令需要更新，否則下一個照抄的人會撞牆。

**M4 續 實跑驗證**（`node tests/tools/blindread-sheet.mjs scratchpad/r3-br --only=eliteSelfCut --tiers=2 --count=2 --mateGap=1.9 --fxvocab=1 --label`）：
```json
{"mateGap":"1.9","camdist":null,"countOverride":2,"counts":{"eliteSelfCut":2},
 "foe":null,"fxvocab":true,"proto":null}
```
`fxvocab` 真的隨 `--fxvocab=1` 變 `true`、`counts` 記的是逐案實際尊數。兩點補正都到位。

---

## 有沒有把及格線搬淺（`02 §2.1`，逐處對照 `7661080 → 994ce51 → cb7d99a`）

| 判準／範圍 | 改了什麼 | 方向 |
|---|---|---|
| `windupOK` | `≤ react[0]` → `≤ windup[1] + maxDvt` →（`cb7d99a`）`≤ min(react[0], windup[1]+maxDvt)` | **加嚴**（t1 208→120.7、t2 560→316.7、t3 860→476.7；並實測出一條舊綠新紅的突變） |
| `inStanceScope`／`stanceOK` 其餘合項 | 一字未動（`git diff 7661080 cb7d99a -- tests/tools/traitfx-drive.mjs` 只動 `spec` 那一段以外沒碰判準） | — |
| `actionsOK`／`rateOK`／`fillOK`／`onTime`／`phasesOK`／尺寸鎖／L3 canary | 未動 | — |
| P3 門檻（area 0.8%／ΔE 中位 28／luma_eps 6） | `metrics.txt` 的 `gate` 行**逐字未動**（我逐欄比過） | — |
| `STANCE_VOCAB`／`STANCE_GATE.minPeak` | 未動 | — |
| 測試數／突變數 | 26 綠（只增不刪）／28 條突變全紅（我逐條重跑） | 加嚴 |
| 案例集／執行範圍 | t1 全 27 支、t2 全 30 套都跑（我實跑 27/27 與 30/30），沒有縮範圍 | — |
| `blindread-sheet` 旗標檢查 | 三項黑名單 → 12 項白名單 | **加嚴** |
| `mapping-HIDDEN.json` 的 `spec` | 多記 `fxvocab`／`counts` | 加嚴（材料可追溯） |
| `run.inBlock` try/finally | 例外時旗標不再卡 `true` ⇒ `acts` 不再被錯誤壓低 | 理論上**放寬**（只在 throw 路徑），但那條路 `tweenOK` 已紅；健康態計數逐值不變（8/16/10/11） |

**沒有一處是在綠燈裡移動及格線。** 唯一值得寫明的是 `994ce51` 的 `windupOK` 在低幀率下
會比 r1 寬（t1 `--dt=100` 實測 284 vs 208），但那些跑法 `rateOK` 已紅、`pass=false`；
而 `cb7d99a` 把它夾成「永不寬於 r1」。

---

## 修 A 有沒有壞 B（第 1 輪八條的退化檢查）

| 第 1 輪的條 | 檢查方式 | 結果 |
|---|---|---|
| **C2**（`inBlock` 的 acts 記帳） | t1 全跑逐支 `acts`；與 r2 實測、報告數字對照 | ✔ `eliteSelfCut 8`／`wardImmuneLost 16`／`swarmLastStand 10`／`wardHpFirst 11` **逐值一致**，try/finally 沒改變健康態計數 |
| **H3**（姿態收回／`staK` 軌跡） | `delay` 改動後重跑 P3 與 prop-size | ✔ P3 t1／t2 仍 **10/10**（門檻未動）；`figH 1.1229`、殘旗 0.818 我獨立重跑**逐位相同**；eliteSelfCut t2 area 0.9919→0.9943（微升，方向是好的） |
| **H4**（`windupOK`） | 見 N3 | ✔ 加嚴，且新增了鑑別力 |
| **C1／H1／H5／H6** | 突變 1–28 逐條重跑＋健康態 | ✔ 健康 26 綠／0 紅、28 條全紅（含 23/24/25/26/27/28），無一條因 r2 的修補而變綠 |
| 整體回歸 | `--tier=1` **27/27**、`--tier=2` **30/30**、t1/t2/t3 `--count=2` 抽驗 3/3 | ✔ |
| `node --check` | `js/trait-fx.js`、`tests/tools/blindread-sheet.mjs` | ✔ |

**沒有發現任何一條第 1 輪的修法被第 2 輪的修補弄壞。**

---

## 我跑過的指令（原文）

```
node --check js/trait-fx.js ; node --check tests/tools/blindread-sheet.mjs        → OK
node tests/fxvocab.test.mjs                                                      → 26 綠 ／ 0 紅
node tests/fxvocab.test.mjs --mutate=N   (N=1..28，28 條全跑)                     → 每條都有紅
node tests/tools/traitfx-drive.mjs scratchpad/r3-t1.json --only=eliteSelfCut,wardImmuneLost,swarmLastStand --tier=1 --port=8931   → 3/3
node tests/tools/traitfx-drive.mjs scratchpad/r3-t2.json … --tier=2 --count=2 --port=8932                                        → 3/3
node tests/tools/traitfx-drive.mjs scratchpad/r3-t3.json … --tier=3 --count=2 --port=8933                                        → 3/3
node tests/tools/traitfx-drive.mjs scratchpad/r3-t1dt50.json  --only=eliteSelfCut,swarmLastStand --tier=1 --dt=50  --port=8934   → 0/2（紅在 rateOK；slack 60）
node tests/tools/traitfx-drive.mjs scratchpad/r3-t1dt100.json --only=eliteSelfCut,swarmLastStand --tier=1 --dt=100 --port=8935   → 0/2（紅在 rateOK；slack 180）
node tests/tools/traitfx-drive.mjs scratchpad/r3-t2dt100.json --only=eliteSelfCut,swarmLastStand --tier=2 --count=2 --dt=100 --port=8936 → 2/2（slack 108）
node tests/tools/traitfx-drive.mjs scratchpad/r3-head-t1.json --tier=1 --port=8952                                               → 27/27
node tests/tools/traitfx-drive.mjs scratchpad/r3-head-t2.json --tier=2 --port=8954                                               → 30/30
node tests/tools/prop-size.mjs scratchpad/r3-ps --only=swarmLastStand,eliteSelfCut --tier=2 --port=8955                          → 與證據檔逐位相同
node tests/tools/blindread-sheet.mjs scratchpad/r3-br --only=eliteSelfCut --tiers=2 --count=2 --mateGap=1.9 --fxvocab=1 --port=8953 --label → spec 兩欄都在
node tests/tools/blindread-sheet.mjs scratchpad/x --frames=6 --cell=780x360        → throw（預期）
node tests/tools/blindread-sheet.mjs scratchpad/x --mate_gap=2                     → throw（預期）

# 反向突變（一律在 gitignore 的樹副本上，原檔全程唯讀，收尾 git status clean）
scratchpad/tree-noslack/  ＝ js+tests+index.html+assets 副本，windupOK 改成 ≤ B.windup[1]（拿掉容差）
   node tests/tools/traitfx-drive.mjs … --root=scratchpad/tree-noslack --tier=1 --port=8941   → 18/27（重現作者的說法）
scratchpad/tree-react/    ＝ 同上副本，wardImmuneLost 的姿態 tween 加 delay
   delay: R0 + 60（搬到 react 段）  → peakAt 750、windupOK false、FAIL
   delay: T0 + 60（搬到 travel 段）→ peakAt 500、windupOK false、FAIL；而舊門檻 560 會放它綠 ★
```

---

## 無法確認 / 沒驗的

1. **`994ce51` 本身我沒量到**——工作區在我第一次跑治具之前（01:14:10）就已經被改成
   `cb7d99a` 的內容。兩版的門檻我都用引擎原值 `windupSlack` 回推得出，
   但「`994ce51` 那個 commit 實際跑起來長什麼樣」我沒有直接量。
2. **prop-size 是否真的在 `994ce51` 重跑過**：檔案內容與前一個 commit 逐位相同、diff 裡沒有它。
   我自己重跑得到相同數字（支持「確定性輸出」），但「作者跑過」這件事沒有落檔可證。
3. **報告 `:139-141` 的 draw call（idle 150 → peak 161／+11／programs 21）與 `:288` 的
   `duel-perf 59.9／986`、`trace-eq equal:true`、`duel-drive 0/0 errors`**——
   這幾個只有報告的散文，`…-b2-evidence/` 裡**沒有對應落檔**，我也沒重跑。
4. **H3 的畫面結論**（「react 段施招者回正並跟著上抬」）我沒目視 sheet，只驗了數值。
5. **N2 那條 t2 的理論漏法**（clamp 觸發而 `windupOK` 仍綠，需 `maxDvt ≥ 260`）我沒做出來。
6. **P4 盲讀、真機試玩**不在本輪範圍。
