# 對抗式覆審：招式演出卷・祖靈批階段 A（5d564d2 / 581f115 / 6fd6e3a，基準 616f7ff）

冷讀 diff，無對話史。每條標「真實路徑」＝我實際跑過或逐字讀過該檔那一段；「推理」＝從程式碼推導、未實跑瀏覽器治具。
瀏覽器類治具（traitfx-drive／fx-contrast）**沒有跑**（很慢），所有執行期斷言的判定是讀原始碼推導的。

**結論：2 個 CRITICAL、6 個 HIGH、9 個 MEDIUM、6 個 LOW。**

---

## CRITICAL

### C1 「用到徽記卻 n/a」這條防線在 4 支示範招裡只剩 1 支有效，而活性下限照樣綠
**真實路徑**（實跑 `node --input-type=module -e "import {emblemCasesFromSource} ..."`，兩份原始碼）：

```
本批   emblem: biteGamble_v055 eliteSelfCut_v055 hauntLost wardImmuneLost_v055
616f7ff emblem: biteGamble_v055 eliteSelfCut      hauntLost wardImmuneLost_v055
```

- `tests/tools/traitfx-drive.mjs:379-380`：`needEmblem = opt.emblemMoves.indexOf(c.trait) >= 0 && …`
- `tests/tools/traitfx-drive.mjs:484`：`sg.expected = sg.emblemMoves.filter((t) => results.some((r) => r.case.trait === t))`

`c.trait` 永遠是真 trId（`eliteSelfCut`），名單裡卻是 `eliteSelfCut_v055`——**永不相等**。
所以 `sizeOK` 的 `!(needEmblem && sizeState === 'n/a')` 與 summary 的「★用到徽記的招卻是 n/a」
現在只對 `hauntLost` 一支成立。

更糟的是 `emblemCasesFromSource` 的活性下限（`traitfx-drive.mjs:159`）寫的是
`MUST.filter((t) => list.indexOf(t) < 0 && list.indexOf(t + '_v055') < 0)`——**它接受 `_v055` 後綴**，
所以下限永遠綠，而實際涵蓋是 1/4。這正是那段註解自己要防的「活性下限綠了、覆蓋為零」。
本批把 eliteSelfCut 從「可比對」變成「不可比對」，涵蓋由 2/4 → 1/4。

怎麼觸發：`node tests/tools/traitfx-drive.mjs out.json --fxvocab=1 --only=eliteSelfCut`，
把 V055 裡的 `st.icon(...)` 註解掉（＝徽記完全沒生出來）⇒ `sizeState` 變 `n/a`、`needEmblem` 為 false ⇒ 仍然 PASS。

修法方向：`needEmblem`／`sg.expected` 比對前把 `_v055`／`_v054` 後綴剝掉（或 `emblemCasesFromSource` 回剝好的 trId），
兩處都要改，且活性下限要改成「剝完之後仍是真 trId」。

---

### C2 `actionsOK`（F10：非 flinch 動作 ≥2）對每一支已轉正的招恆真
**真實路徑**（逐字讀）：
- `js/trait-fx.js:1383,1385` — `st.groundMark` 內建兩條 `st.fade`
- `js/trait-fx.js:894-899` — `st.fade` → `st.tween`
- `js/trait-fx.js:830` — `if (!run.inFlinch) run.acts++`（groundMark 在招體同步呼叫，`inFlinch` 為 false）
- `tests/tools/traitfx-drive.mjs:287,398` — `actionsOK = acts >= 2`，tier 1 納入 pass

`fxvocab.test.mjs` 的 §A9 ③ 又要求每支已轉正的招必須呼叫 `st.groundMark(`。
兩條合起來：**凡在 `actionsOK` 適用範圍（tier 1、已轉正）內的招，`acts` 由建構上 ≥2**。
F10 原本要擋的是「只剩一個閃光的偷懶短版」——現在把整支招的演出刪光、只留 `st.groundMark(fig)`，
`actionsOK` 照樣綠。零鑑別力。

修法方向：`acts` 不計積木自己排的內建 tween（groundMark 的兩條 fade 加個 `run.inFlinch`-style 旗標跳過），
或把 `actionsOK` 的門檻改成「**編舞自己排的** 非 flinch tween ≥2」。

---

## HIGH

### H1 `st.groundMark` 沒有任何「這一尊必須是施招者」的約束
**真實路徑**：`js/trait-fx.js:1362-1394`。整支只檢查三件：系別有沒有語彙、是不是 `stain`、`fig` 是不是 falsy。
**沒有** `inTarget` 檢查（`st.stance` 有，:1327）、**沒有**「一招只能一個」檢查（`st.stance` 有，:1332）、
**沒有**「必須與 `run.stance.fig` 同一尊」的檢查。

- `st.groundMark(prey)` 會在**受招方**腳下點出施招者系別的光，`run.stance.ground` 照樣被設 ⇒ `stanceOK` 全綠。
- `st.foot()`（:789）只做 `fig.group.getWorldPosition`，**不走 `wrapOf`／`touch`** ⇒ 連 `run.sig.target` 都不會被碰到，事後一點痕跡都沒有。
- 連呼兩次（兩尊都點）也全綠（第二次只是把 `run.stance.ground` 設成同一個值）。

語彙檔把腳下光稱為「身分訊號的另一半」，但這一半在建構上一個約束都沒有。
（推理：throw 的兩條在 `st.stance` 上實作得很完整；缺的是同樣的兩條沒有複製到 `groundMark`。）

### H2 施招姿態與「道具落在誰身上」沒有任何綁定，治具也無從比對
**真實路徑**：`js/trait-fx.js:1325-1350`（`st.stance` 的三條約束：合法 kind／不是受招方／只有一個人）；
`js/trait-fx.js:1513-1516`（`lastSig.stance` 只送出 `kind/peak/ground/onTarget/extra/minPeak`，**沒有 fig**）。

P4 三輪的病因原話是「**道具落在哪一尊，那一尊就被當成施招者**」。本批加的訊號只保證
「有一個非受招方擺了姿態」，不保證那一尊就是拿著徽記／道具的那一尊。
在 2v2 我方兩尊同型時，把 `st.stance` 給隊友 A、道具生在隊友 B 手上，**每一條檢查都是綠的**，
而畫面上的身分訊號指向錯的人——正是這一批要修的那個病。
而且 `lastSig.stance` 不含 fig，治具連事後做「stance 的人 === 徽記 anchor 的人」這條比對都做不到。

### H3 香火 9 支的施招姿態**永遠不收回**，而且下沉型把受益上抬蓋成下沉
**真實路徑**（逐字讀 + 算術）：
- `js/trait-fx/xianghuo.js:231,351,508,671,835,979,1146,1261,1362` — 9 支各只有一處 `st.stance(x, kind, e)`，全在 windup tween 內。
- `js/trait-fx/zuling.js:553` — 祖靈範本招**有**寫 `st.stance(deer, '下沉', 1 - e)` 收回去，並在註解寫明「衝擊拍時姿態已經還原＝『他剛剛在蓄勢』，與受益方的上抬分得開」。香火 9 支沒有這一行。
- `js/trait-fx.js:640-644`（`apply`）與 `:1501`（`finish` 才歸零）——`w.sta` 只有 `st.stance` 會寫，沒有其他地方重置。

後果四條：
1. **姿態撐到收工**：windup tween 死掉那一幀的值（e=1，滿幅）一路留到 `finish()`。
2. **下沉型把受益反應演反**：`STANCE_VOCAB.下沉.move[1] = -0.14`（`vocab.js:230`），
   而受益上抬是 `st.move(f, 0, 0.05~0.07 * e, 0)`（`xianghuo.js:563,732,878,1410`）。
   `apply()` 是 `base.p + mo.p + sta.p`（同一個空間、同一個量綱），淨值 **−0.07 ∼ −0.09＝往下**。
   `wardImmuneLost` 在 `count=1`（治具 POOL 的預設）時 `bless = [ringer]`（`xianghuo.js:610`）——
   施招者自己就是受益方，於是「被托起來」在畫面上是**沉下去**。`swarmRally`／`wardRegen1` 同型。
3. **量測位置與觀眾看到的不是同一件事**（`02 §6.1` 第 5 條）：`evalPhases` 的 react 量的是 `w.mo`（`js/trait-fx.js:679,718`），
   看不到 `w.sta` ⇒ `reactDelta` 這一格在「畫面上是反的」時照樣綠。
   （`sta` 不進量測是刻意設計，註解寫在 `js/trait-fx.js:606-611`——但代價就是這一條。）
4. **收工爆位**：`finish` → `unwrap` 把 model 還原到 base，模型一幀從 ±0.13/0.14/0.17 彈回 0。
   舉臂型還多一個 `scl 1.04`、下沉型 `0.955`，同一幀一起彈。

「舉臂」那三支（eliteCleave／swarmLastStand）另有一個反效果：施招者在 react 之前就已經比隊友高 0.17，
隊友才升 0.05——讀者最可能把**施招者**讀成「被托起來的那個」。

### H4 「在蓄勢段」這件事一條機械檢查都沒有
**真實路徑**：`tests/tools/traitfx-drive.mjs:345-347` 的 `stanceOK` 只看 `kind / ground / peak / onTarget / extra`。
`run.stance.peak`（`js/trait-fx.js:1338`）是**全程峰值**，不帶時間戳。
把 `st.stance` 整段搬到 react 的 tween 裡，`stanceOK` 一樣綠。
語彙檔 §A9-1 的宣稱是「施招者在**蓄勢段**就有專屬姿態」——這個「蓄勢段」沒有被任何東西量到。
（對照：`groundMark` 的亮滅時序是由建構上成立的，見「已驗證為真」第 1 條；`stance` 沒有對應的建構。）

### H5 §A9 ③ 用的是手工名單，而同一節的註解宣稱「不是手工名單」
**真實路徑**：
- `tests/fxvocab.test.mjs:278-280` — `const CONVERTED_MUST = [...10 支...]`（手工）
- `tests/fxvocab.test.mjs:293-307` — ③「編舞真的呼叫了 st.stance／st.groundMark」**迭代 `CONVERTED_MUST`**，不是迭代 `convertedMoves()`
- `tests/fxvocab.test.mjs:200-202` — 註解原話：「★『已轉正』是從原始碼推導的，不是手工名單★——手工名單忘了加就沒有紅」

①（必填 stance）確實跑推導出來的 `conv`；③ 沒有。
所以下一批轉正的招只要：在 MOVE_SPEC 填了 `stance`＋編舞有 `st.phase(`＋編舞**沒有** `st.stance(`／`st.groundMark(`
⇒ `fxvocab.test.mjs` 全綠，只剩慢速瀏覽器治具（traitfx-drive）接得住。
而 `traitfx-drive.mjs:340-341` 的註解又寫「刪光 `st.stance` 想繞過去的由 `tests/fxvocab.test.mjs` 的原始碼掃描擋（少一支就紅）」——
兩邊互相指望，對現有 10 支成立，對第 11 支起不成立。

修法：③ 改成 `conv`（＝`convertedMoves()`），`CONVERTED_MUST` 只留作活性下限。

### H6 `selfReact` 是 §A9 ② 的一鍵豁免，沒有獨立證據也沒有突變守它
**真實路徑**：`tests/fxvocab.test.mjs:313` — `if (s.selfReact) return;`（整條跳過）。
`js/trait-fx/vocab.js:286` — `swarmLastStand: { …, selfReact: true }`。

`selfReact` 是 MOVE_SPEC 裡的一個手填布林，**不與 `ABILITIES` 比對、不與編舞的 target 集合比對**，
沒有任何東西驗證它是真的。在任何一支招上加 `selfReact: true` 就能讓「不同型」那條對它失效。
具體：在 `eliteSelfCut` 上同時加 `selfReact: true`，突變 23（`stance='舉臂'` 與 react `升` 同型）會由紅變綠。
突變表沒有一條在守這個豁免。

---

## MEDIUM

### M1 `st.groundMark` 的「衝擊拍熄」只在「編舞不去碰它」時由建構上成立
兩個缺口（真實路徑，`js/trait-fx.js:1362-1394`）：
- 它 `return mesh`，而回傳的 mesh 完全可變：編舞再排一條 `st.fade(mesh, { delay: R0, from: 0, to: 1 })`
  就把它在衝擊拍之後點回來，`run.stance.ground` 照樣是 `'ring'`。沒有任何檢查在量它在 react 段的 opacity。
  註解寫「編舞不需要再碰它」是對的；寫「編舞改不到／給不出第二份」是**過度宣稱**。
- 時間軸用的是 `st.beat` 的**絕對**值當 `delay`（`B.travel[0] + travelMs * 0.45`），而 `st.fade` 的 delay
  是相對 `run.vt`。目前 10 支都在招體同步呼叫（`run.vt = 0`）所以對得上；
  從 timer／tween 裡呼叫 `st.groundMark` 會讓整段時間軸平移，沒有守衛、沒有斷言。

### M2 `--mateGap` 對 n≥3 不只是「改間距」，會改排數與 fit
`js/duel-figures.js:1000` 的 `step0` 進了 `layout()`：`s = m<=1 ? step0 : Math.min(W/(2*need), Math.max(step0, sMin))`，
`s` 又決定 `P.ok`（:1029-1031），`P.ok` 決定 `search()` 選幾排、選哪個 fit（:1053-1058）。
所以 `--mateGap=2 --count=3` 以上會改整個排法，不是「同一邊相鄰兩尊的水平間距 ×2」。
2v2（n=2）走的是 :1118 那條（`lane = (j-(n-1)/2)*step`），旗標描述才成立。
**推理**（未實跑瀏覽器）。

### M3 `--mateGap` 放大的是靜態站位，桌緣夾限對它無效
`js/duel-figures.js:1167`：`if (side*x > lim && side*x > stat) x = side*Math.max(lim, stat)`，
其中 `stat = side*(offset[i] + lane)` **已含放大後的 lane** ⇒ 夾限只削 lunge 的 `push`，不削靜態站位。
註解自己寫「n≤2 的靜態站位本來就可能超過這條線」。`--mateGap=3` 可以把人推出 `rimMax`／出框，沒有警告、沒有回報。

### M4 材料規格沒有留下紀錄
`tests/tools/blindread-sheet.mjs:200-202` 的 `mapping-HIDDEN.json` 記 `seed / tiers / dt / shot / cell / sheet / frameAt / labelled / mapping`，
**不記** `mateGap`／`camdist`／`count`／`foe`。
下一輪盲讀無法事後證明「r4 的材料和 r1–r3 是同規格／差在哪一格」。`mateGap` 是本批新增的規格旋鈕，一起漏了。

### M5 `STANCE_VOCAB`／`STANCE_GATE` 的數值沒有與語彙檔逐列對照（ICON 有）
`tests/fxvocab.test.mjs:282-292` 只驗 `axis` 非空、`amp > 0`、`amp >= STANCE_GATE.minPeak`。
後兩條**自我指涉**：把三個 amp 與 minPeak 一起調小（例如全乘 0.1）仍然全綠。
語彙檔 §A9 的 179-189 行明寫了 0.26／0.22／0.20 與 minPeak 0.12，但沒有像
「ICON 四個欄位與文件第 5 節相同」那樣的對照測試。
（附帶：語彙檔 188 行自己就寫「編舞只要讓 `e` 走到 1 就一定過」——`minPeak` 這一格的鑑別力只剩
「擋 `strength: 0.3` 這種寫法」，已被作者聲明並接受，不另計為 finding。）

### M6 `st.pillar` 是全新的、不在任何尺寸防線涵蓋內的生成路徑
`js/trait-fx.js:1354-1386`：不進 `SIZED`／不走 `lockIconScale`／`BLOCK_MADE.add` 直接豁免 `scanStrayEmblems`，
大小完全由編舞的 `h`／`w`／`taper` 字面值決定（`zuling.js:523` 傳 `h:1.30, w:0.26`）。
`js/trait-fx.js:1356` 的註解自己宣告「柱本身不是道具，不受 §A3 的 2/3 上限約束」，
但沒有任何治具在量它（`prop-size.mjs` 量的是道具）。分母沒有數（`02 §6.1` 第 7 條）。

### M7 eliteSelfCut 的道具從「有鎖」的 `st.icon` 換成「沒鎖」的 `st.paperStamp`
`js/trait-fx/zuling.js:481-486,536`：`st.paperStamp(...)` ＋ `obsid.scale.setScalar(st.iconSize * (0.45 + 0.50*e))`。
`st.paperStamp`（`js/trait-fx.js:1142-1220`）**不呼叫 `lockIconScale`**（只有 `st.icon`:1016-1017／`st.icons`:1055 會），
而且 `BLOCK_MADE.add(mBody/mFace)`（:1165）讓它也不進 `scanStrayEmblems`。
`tests/fxvocab.test.mjs` 的 `emblemNames()`（:437-439）只認 `st.(icon|icons|mark)` ⇒ `obsid` 不在 (b)(c) 的分母裡。
目前寫法乘積裡還留著 `st.iconSize`（＝`ICON.sizeOf(kind)`，`js/trait-fx.js:954`），所以**不構成第二份來源**；
但若哪天寫成 `obsid.scale.setScalar(0.56)`，三道防線（來源掃描／執行期鎖／場景掃描）**一條都不會響**。
xianghuo 已有約 40 處同形（既存缺口，616f7ff 就有），本批把祖靈範本招也搬進這個缺口。
`fxvocab.test.mjs:560` 印的「徽記 mesh 被直接縮放 0 處」是在這個分母下算的，容易被誤讀成全域結論。

### M8 `w.sta` 的跨 run 衝突：當初不共用 `mo` 的理由在 `sta` 上原樣重現
`js/trait-fx.js:606-611` 的註解說「不共用 `mo`，因為 `mo` 是 set 不是 add，後寫的蓋先寫的」。
但 `w.sta` 也是 set；同一尊被兩套招同時包裝時（hitstop 造成的重疊，:1496 的註解明寫這種情形會發生），
B 招的 `st.stance` 會蓋掉 A 招的姿態，而 A 招的 windup tween 已經死掉、不會再寫回來。
兩邊的 `run.stance` 記帳各自獨立 ⇒ 兩套的 `stanceOK` 都綠，畫面上只有一個生效。
`finish` 的歸零（:1501）已處理，缺的是同時演出期間。

### M9 未來的協調盲點：`hauntLost` 同時被兩條排除規則蓋住
- `traitfx-drive.mjs:344`：`inStanceScope` **無條件**排掉 `v054Moves`（＝`hauntLost`），與 `vocabOn` 無關。
- `fxvocab.test.mjs:225`：`convertedMoves()` 的 `retired` 也排掉 `_v054` 的 trId。

陰氣批轉正 `hauntLost` 時，只要忘了移除 `V054` 區段，這支就**同時**逃過執行期斷言與原始碼掃描。
（祖靈這批是因為順手把 V054 刪了才沒事；那是慣例，不是機制。）
建議：`v054CasesFromSource` 加活性上限——「V054 區段裡出現的 trId 不得同時在 `MOVE_SPEC` 有 `stance`」。

---

## LOW

- **L1** `st.stance` 用 module 級共用暫存 `_v`（`js/trait-fx.js:1339`，與 `:869` 共用）。目前呼叫鏈沒有交錯，屬易碎寫法。
- **L2** `STANCE_VOCAB[*].move[0]`（側向分量）被 `st.stance` 完全忽略（`js/trait-fx.js:1348` 只用 `move[1]`／`move[2]`）。
  三型目前都是 0 所以無感，但與「★這是唯一一份幅度表★」的宣稱不完全相符——加了側向值不會生效也不會紅。
- **L3** `st.groundMark` 的 JSDoc 寫 `o = { fig 必填, r, h, peak }`（`js/trait-fx.js:1360`），但 `fig` 是第一個**位置**參數，
  且實際還吃 `w`／`taper`／`push`（`:1374-1377`）。
- **L4** `--mateGap` 大小寫敏感（`blindread-sheet.mjs:49` 用 `startsWith('--mateGap=')`），打成 `--mategap=2`
  會被**靜默忽略**（沒有未知旗標檢查），產出的是基準站位材料而操作者以為拉開了。
- **L5** `run.reduced` 時 `st.stance` 記 peak 但不寫 `w.sta`（`js/trait-fx.js:1344`）⇒ `--reduced` 那一跑的 `stanceOK` 是空真。
  與 `st.move` 的處置一致、註解也聲明了，列出僅供備查。
- **L6** `w.sta.r.set(a*f.z, 0, -a*f.x)`（`js/trait-fx.js:1346`）是「Euler 三軸直接相加」近似繞側向軸旋轉，
  `lean ≤ 0.26 rad` 下誤差可忽略，但不是真正的軸角合成（與既有 `mo.r` 同一個近似，非本批新問題）。

---

## 我實際驗過、**沒有**問題的幾條（含指令與輸出）

1. **`st.groundMark` 的亮滅時間軸真的由建構上收在衝擊拍**（真實路徑，實算）：
   `node --input-type=module -e "import {beatOf} ..."` →
   ```
   tier 1 windup[0,104] travel[104,208] react[208,277] | fadeIn end= 95.7 (<104) | fadeOut end= 208.0 = react0 208.0
   tier 2 windup[0,300] travel[300,560] react[560,760] | fadeIn end= 276.0 (<300) | fadeOut end= 560.0 = react0 560.0
   tier 3 windup[0,460] travel[460,860] react[860,1180]| fadeIn end= 423.2 (<460)| fadeOut end= 860.0 = react0 860.0
   ```
   三個 tier 都精確落在 `react[0]`。算式無誤。（可被編舞蓋掉那件事見 M1。）

2. **`stepMul` 預設 1＝正式路徑一個位元組不變**（真實路徑，grep 全 repo）：
   `js/renderer.js:113` 的 `createDuelFigures` **不傳** `stepMul`；唯一傳的是 `tests/tools/traitfx-preview.html:125`，
   且 `MATEGAP` 預設 1（`:123`）。`js/duel-figures.js:601` 的 `Number.isFinite && >0 ? : 1` 也回 1，`×1` 不改位元。
   `?mategap=0` → `parseFloat('0')||1` → 1。

3. **`st.camOff` 上升後逐字相同**（真實路徑，逐字比對）：
   `js/trait-fx.js:949` 的表達式與 616f7ff `xianghuo.js` 的 `camOff(st,k)` 本體完全相同；
   `xianghuo.js:42` 現在只是轉呼叫。9 支招的呼叫寫法一個字未動。

4. **`V055.eliteSelfCut_v055` 的「逐字取自 v0.55.6 的 MOVES.eliteSelfCut」是真的**（真實路徑，`git show 616f7ff` ＋ `diff`）：
   除函式名那一行外 `diff` 無輸出。

5. **突變 1–25 全部有紅**（真實路徑，實跑）：
   `node tests/fxvocab.test.mjs` → `23 綠 ／ 0 紅`
   `--mutate=1` → 19綠/4紅；`2,3,21,22,23,24,25` → 各 22綠/1紅；`4`–`20`（N11 十七條繞法）→ 各 22綠/1紅。
   17 條繞法的錨點 `st.iconScale(knife, 0.5 + 0.5 * e);` 隨本體搬進 `V055` 之後仍然有效
   （N11 那條測試掃整檔、不切 V055 段）。

6. **`w.sta` 的清場沒有洩漏**（真實路徑，逐字讀）：
   `finish` 同尊還有別套在演時歸零（`js/trait-fx.js:1501`）、沒有別套時 `unwrap` 把 model 的 p/r/s 還原到 base（`:651-652`）。

7. **`sta` 確實沒污染因果三段的量測**（真實路徑）：`metricOf`（`:675-686`）只讀 `w.over` 與 `w.mo`。
   宣稱成立——但代價是 H3(c)。

8. **`convertedMoves()`／`bodyOf()` 的解析沒有「靜默漏招」風險**（真實路徑，讀 + 突變實跑）：
   改縮排／改函式名／把 `st.stance(` 包進 helper，都會讓 `CONVERTED_MUST`（①的 `missing`）或
   `seen < CONVERTED_MUST.length`（③）當場紅——方向是**過嚴**而不是漏。
   `MUT25` 的錨點替換排在剝註解之後（`:212-216`），避開了「錨點被改在註解上」那個坑。
   唯一殘留的理論風險：`bodyOf` 取跨檔第一個同名 head（目前三檔無同名招）。

9. **`v054CasesFromSource`／`inPhaseScope` 這一格是加嚴不是放寬**（真實路徑，實跑推導）：
   `v054` 由 `[eliteSelfCut, hauntLost]` 縮成 `[hauntLost]` ⇒ eliteSelfCut 從此在預設路徑被 P2（phasesOK）約束。
   `phaseCasesFromSource` 的 MUST 也加了 `eliteSelfCut`。

10. **`inStanceScope` 的排除沒有讓任何現役招完全逃掉**（推理 + 實跑名單）：
    `v055 = [biteGamble, eliteSelfCut, wardImmuneLost]`，只在 `--fxvocab=1` 時排除；
    預設路徑 10 支全部在範圍內。唯一永久排除的是 `hauntLost`（尚未轉正，且 `FAC_GROUND.yinqi` 會 throw）。
    未來風險見 M9。
