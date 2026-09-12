# 對抗式覆審 第 2 輪：反駁「八條 findings 已修好」（3b812ac → 7661080，基準 616f7ff）

冷讀 diff ＋ 實跑。**「真實路徑」＝我實際跑過那條程式碼或逐字讀過引擎本體那一段；「推理」＝從原始碼推導。**
瀏覽器治具這次**有跑**（單案 1–3 秒，不是 5–15 分鐘）：共 8 次 `traitfx-drive`，逐條列在下面。

**結論：6 條真的修好、2 條表面修好（H2／H4）、0 條沒修到。**
另外抓到 **1 條 HIGH（報告與自己的證據檔當場矛盾，且是「修 A 壞 B」）＋ 2 條 MEDIUM ＋ 2 條 LOW 新問題**。

---

## 我跑過的指令（原文）

```
# 唯讀基線
node --check js/trait-fx.js                                      → SYNTAX OK
node tests/fxvocab.test.mjs                                      → 26 綠 ／ 0 紅
node tests/fxvocab.test.mjs --mutate=N   (N=1..28，28 條全跑)      → 每條都有紅（1 有 4 紅、22／27 各 2 紅、其餘各 1 紅）
node --input-type=module -e "import {emblemCasesFromSource,...}"  → emblem/phase/v054/v055 四份名單

# 治具（真實路徑）
node tests/tools/traitfx-drive.mjs scratchpad/_rv-run.json --only=eliteSelfCut,wardImmuneLost,swarmLastStand --tier=2 --count=2   → 3/3 pass
node tests/tools/traitfx-drive.mjs scratchpad/_rvm5.json   --only=wardImmuneLost,eliteSelfCut --tier=1                            → 2/2 pass, acts 8／16
node tests/tools/traitfx-drive.mjs scratchpad/_rvfx.json   --only=biteGamble,eliteSelfCut,wardImmuneLost,hauntLost --tier=2 --fxvocab=1 → 4/4 pass, 徽記尺寸斷言 ok 4／n/a 0／fail 0

# 反向突變（把修法換回壞掉的寫法／重現原 finding 的繞法）——一律在 gitignore 的樹副本上做，原檔全程唯讀
scratchpad/_rv*  ＝ js+tests+index.html(+assets) 的副本；git status 全程 clean
```

---

## C1（CRITICAL）「用到徽記卻 n/a」只剩 1/4 有效 — **真的修好**

**怎麼證明（真實路徑，實跑）**

| 狀態 | 結果 |
|---|---|
| 健康（HEAD） | `emblem: biteGamble eliteSelfCut hauntLost wardImmuneLost`（4 支真 trId） |
| 把 `movesMatching` 的剝後綴換回壞掉的寫法（`out.add(h[1])`） | `emblemCasesFromSource` **當場 throw**：`推導出 4 支（biteGamble_v055 eliteSelfCut_v055 hauntLost wardImmuneLost_v055），缺少必含的 biteGamble eliteSelfCut wardImmuneLost` |
| 治具 `--fxvocab=1 --tier=2` 四支 | `徽記世界尺寸斷言（--fxvocab=1）：ok 4／n/a 0／fail 0（鎖上 15 of 產出 15、稽核 update 825 次）`，4/4 pass |

**鑑別力**：反向＝紅（throw）、健康＝綠（4/4）。兩面都驗過。
`tests/tools/traitfx-drive.mjs:98`（剝後綴）／`:168`（下限只認真 trId）／`:392`（`needEmblem`）／`:497`（`sg.expected`）。

**有沒有搬淺**：沒有，方向是**加嚴**。`needEmblem`／`sg.expected` 的算式一字未動，只有輸入名單從「永不相等的後綴名」變成真 trId（有效涵蓋 1/4 → 4/4）；活性下限拿掉了 `|| list.indexOf(t + '_v055') < 0` 這個**放寬**條款。`phaseCasesFromSource` 的名單由 14 筆縮成 11 筆，但縮掉的三筆是 `*_v055`——它們**從來沒有**比對到任何 `c.trait`，所以實際約束集合一模一樣，不是縮範圍。

**新的風險（N5，LOW）**：剝後綴之後，「只住在 `V055`、MOVES 那一份還沒轉正」的招會被推導進 `phaseMoves`，於是**預設路徑**上 `inPhaseScope`／`inStanceScope` 都成立 ⇒ 假紅。方向偏嚴（不是漏），而且今天三支 V055 招的 MOVES 版本都已轉正所以不發生。但新加的 ⑱ 那條只守 `V054` 退路，**沒有對稱的 V055 條款**——`js/trait-fx/xianghuo.js:1488`／`zuling.js:959` 的 V055 區段在下一批會是同一個協調盲點的鏡像。

---

## C2（CRITICAL）`actionsOK`（acts≥2）對每支已轉正的招恆真 — **真的修好（鑑別力已實測）**

**涵蓋完整性（真實路徑，逐字讀）**：全檔**只有一個** tween 註冊點 `js/trait-fx.js:841`（`run.tweens.push`），`acts++` 在 `:838`。積木內部自己註冊 tween 的地方只有五處：`:897`（move）／`:905`（fade）／`:911`（grow）／`:1095`（fly）是**編舞直接呼叫的積木本體**（該計）、`:926` 是 flinch（`inFlinch` 擋）、`:1352`（stance 包絡）與 `:1475/:1477`（groundMark 兩條 fade）都在 `run.inBlock = true/false` 之間。**沒有漏包的第三條。**

**實測（真實路徑）**：

| | eliteSelfCut (t1) | wardImmuneLost (t1) |
|---|---|---|
| 健康（有 `inBlock`） | acts=**8** | acts=**16** |
| 把 `:838` 換回 `if (!run.inFlinch) run.acts++` | acts=**11** | acts=**19** |

兩支都**恰好差 3**＝groundMark 兩條 fade ＋ stance 包絡一條，與讀出來的三處一致（沒有第四條被漏算、也沒有把編舞的算掉）。

**決定性的鑑別力測試**——把 `wardImmuneLost` 的編舞砍到只剩 `st.groundMark` ＋ `st.phase` ＋ 一條帶 `st.stance` 的 tween（＝C2 說的「演出刪光的偷懶短版」）：

```
健康（有 inBlock）： FAIL wardImmuneLost t1/300ms acts=1  → F10 動作數 ... wardImmuneLost=1✗
反向（無 inBlock）： FAIL wardImmuneLost t1/300ms acts=4  → F10 動作數 ... wardImmuneLost=4   （actionsOK 綠）
```

反向那一跑 `actionsOK` 是綠的（它紅在 `fill=0.75`，是另一條）——**C2 描述的繞法在修前確實會過 F10，修後過不了**。這條的鑑別力是實測出來的，不是推論。

**殘留（N4，LOW）**：`run.inBlock` 是裸的 set/reset，沒有 `try/finally`。`st.fade`／`st.tween` 在 `:1475`／`:1352` 丟例外的話旗標會卡在 `true`，之後編舞自己的 tween 全不計入 ⇒ 方向偏嚴（安全），但是易碎寫法。

**一句校正**：報告寫「eliteSelfCut 10→8」。同設定下「有包絡、無 `inBlock`」是 **11**；10 是**整批修補之前**（那時還沒有包絡）的數。三個數字互相一致（8+2=10、8+3=11），但別把「−2」讀成「這道守衛排掉 2 條」。

---

## H1（HIGH）`st.groundMark` 一條身分約束都沒有 — **真的修好**

`js/trait-fx.js:1443-1459`（三條 throw）／`:1592`（`groundSame`）／`tests/tools/traitfx-drive.mjs:359`（進 `stanceOK`）。

**實測兩個反向突變（真實路徑）**：

| 突變 | 結果 |
|---|---|
| `st.groundMark(st.target[0])`（點在受招方腳下） | `FAIL ... handled=false alive=false`，`stance.onTarget=true`、`kind=null`、`ground=null` ⇒ 整支招當場中止 |
| `st.groundMark(bless[0])`＋`st.stance(bless[0])`（兩個訊號都給隊友） | `FAIL`，`groundSame=true` 但 `casterMatch=false` ⇒ stanceOK=false |
| 只把 `st.stance` 給隊友（groundMark 還在 ringer） | `FAIL`，`groundSame=false`、`casterMatch=false` |

健康態：三支招 `groundSame=true`（實跑 `--tier=2 --count=2`）。兩面都驗過。

**一個非對稱（記錄，不是漏）**：`st.stance` **不檢查** `run.stance.groundFig`。若編舞先 `st.groundMark(A)` 再 `st.stance(B)`，throw 不會響（`run.stance.fig` 當時還是 null），改由 `groundSame=false` 這個記帳判紅。兩種順序都紅，所以沒有洞；但「由建構上成立（throw）」只在其中一種呼叫順序成立，另一種靠治具。

---

## H2（HIGH）姿態與「道具落在誰身上」零綁定 — **表面修好**

**新檢查是真的、也有實測的鑑別力**：`casterMatch` 單獨隔離出來也會紅（上表第二列：`groundSame=true` 而 `casterMatch=false` ⇒ FAIL）。`js/trait-fx.js:1365-1368`（刻意不 `markCaster`）／`:1591`（`casterMatch`）。

**為什麼仍判「表面」**：`run.caster` 的定義是 `js/trait-fx.js:768`
`markCaster = (fig) => { if (!run.caster && !inTarget.has(fig)) run.caster = fig; }`
——＝**第一個被 `st.rot`／`st.move`／`st.spin`／`st.scale` 動到的非受招方**（呼叫點 `:809,:815,:821,:825,:826,:827`）。
它綁的是「骨骼動了誰」，**不是「道具落在誰身上」**。H2 原文與 P4 三輪的病因原話是「**道具落在哪一尊，那一尊就被當成施招者**」——這條路徑一格都沒被綁進來。作者在報告 §1.8「H2 殘」把這件事寫清楚並交裁，**誠實，但這條 finding 沒有關閉**。

另外它在實務上接近恆真：現有 10 支招都是在同一條 tween 裡對**同一個區域變數**（`monk`／`deer`／`ringer`）同時下 `st.rot` 與 `st.stance`，所以 `casterMatch` 由編舞寫法的慣例就成立；它只抓得到刻意交叉接錯的那種。

**修 A 壞 B 的潛在耦合（已被自己的檢查擋住，記錄）**：拿掉 `st.stance` 的 `markCaster` 之後，一支「只用 `st.stance`、完全不碰 `st.rot`/`move`/`spin`/`scale`」的招會讓 `run.caster = null`，而 `evalPhases` 的 react 段（`js/trait-fx.js:720-722`）是用 `run.caster` 把施招者自己的收勢排除掉的——caster 為 null ⇒ 沒有人被排除 ⇒ **react 那條門檻被放寬**。目前沒有這種招，而且 `casterMatch === true` 這個嚴格比較會在 caster 為 null 時判紅，所以在 `stanceOK` 的範圍內有後手。不是現行的洞，是新長出來的耦合。

---

## H3（HIGH）香火 9 支姿態永不收回、下沉把受益上抬演成下沉 — **真的修好（症狀）；但 ⑮「由建構上成立」是過度宣稱**

**真的修好的部分（真實路徑，逐字讀＋算術）**
- `apply()`（`js/trait-fx.js:648-655`）：`addScaledVector(w.sta.p, k)`、`w.sta.r.* * k`、`w.mo.s * (1 + (w.sta.s - 1) * k)`——**k=0 時位移 +0、旋轉 +0、縮放恰好 ×1.0**（問到的那條：是，真的回到 1）。
- 洩漏：`finish` 在 `:1566` 明寫 `w.staK = 1`；同尊沒有別套在演時走 `unwrap`（`:664` `wraps.delete(w.fig)`）⇒ 下一套拿到的是全新的 `w`，`staK` 初值 1。**沒有洩漏路徑。**
- `zuling.js:551-554` 手寫那行收回已刪，9 支香火招現在都由引擎收回。
- P3 t2 `eliteSelfCut` area 1.073→0.9919（門檻 0.8）、ΔE 中位 52.19→68.35（門檻 28）——仍過，門檻檔（`fx-contrast-metrics.py`）這一批沒被動過。

**問題（N2，MEDIUM）：收回的終點不是 `react[0]`，而是「第一次呼叫 `st.stance` 當下的 `run.vt` ＋ `react[0]`」**

`st.tween` 把 `start` 算成 `run.vt + delay`（`js/trait-fx.js:839`），而包絡的 `delay` 用的是 `st.beat` 的**絕對**毫秒（`:1351-1352`）。
**而 `st.stance` 依設計一定是從 tween 的 `update` 裡呼叫的**（JSDoc `:1322` 自己寫「編舞在蓄勢那條 tween 的 `update(t, e)` 裡逐幀餵」）⇒ 第一次呼叫時 `run.vt` **永遠不是 0**。
這正是作者為 `st.groundMark` 誠實記錄下來的那個限制（`:1430-1432`「只在招體同步段呼叫才對得上」），但 `st.stance` 的包絡**沒有同一條註記**，反而在報告 ⑮ 寫成「由建構上成立（編舞寫不出「不收回」）」。

**實測驗證這條算式（真實路徑，不是重建的模型）**：把 `wardImmuneLost` 的姿態 tween 改成 `delay: R0 + 60`，那一跑回報 `fill=1.326` ⇒ horizon = 1193ms，而 `vt_first(≈633) + react[0](560) = 1193`。**逐值吻合**，公式確認。

後果三條：
1. 現行 10 支的偏移＝一幀（姿態 tween 都是 `delay` 為 0、`start=0`，第一次 update 在 `vt≈16.7`）。用 `EASE.in = t³`（`js/trait-fx.js:116`）算，在**衝擊拍那一瞬間** `staK ≈ 0.31`——「下沉」還有 31% 在（−0.14×0.31 = −0.043），對受益方的 +0.05~0.07 淨值仍為正，所以**畫錯的症狀確實修掉了**，但那一幀的餘裕很薄。
2. **沒有任何斷言在量收回**：沒有一條門檻讀 `w.staK` 或 `w.sta`（`metricOf` `:675-691` 只讀 `w.over` 與 `w.mo`）。下一批哪支招把姿態的起點往後挪，收回就靜默越過衝擊拍。間接後手只有兩條，而且都不牢：`windupOK` 只管**峰值**不管收回；horizon 超預算會被 `run.rate` 壓縮（上面那一跑 `rate=2.2`），而 **tier 2 的 `rateOK` 不進 `pass`**（`traitfx-drive.mjs:415-424` 明寫）。
3. 繼承 M8（作者對 `sta` 已揭露、對 `staK` 沒提）：兩套招同時包裝同一尊時，各自註冊自己的包絡寫同一個 `w.staK`，且 A 套 `finish` 會把 `staK` 設回 1，而 B 套的包絡正在衰減中。

**處置建議**：要嘛把包絡的 `delay` 改成 `Math.max(0, B.travel[0] + TT*0.45 - run.vt)`（一行，讓終點真的落在 `react[0]`），要嘛照 M1 的作法**把 ⑮ 的宣稱降級**並在 `st.stance` 的 JSDoc 補上與 `groundMark` 同一條限制。現在是「宣稱由建構上成立、實際依賴呼叫時機且無守衛」——`02 §6.1` 第 5 條的量測位置問題。

---

## H4（HIGH）「在蓄勢段」沒有任何機械檢查 — **表面修好**

**座標系那一問：不是 bug。**（真實路徑，逐字讀）`run.vt += ms * run.rate`（`js/trait-fx.js:1630`）⇒ `vt` 的單位是**編舞時間軸的毫秒**，`rate` 只改它對牆上時間的換算；`st.beat = beatOf(run.tier, run.ms)`（`:938`）同樣是編舞毫秒。**兩者同一個座標系，`rate > 1` 不會把合格的判紅或把不合格的判綠。**

**它點名的繞法確實被擋住了（真實路徑，實跑）**：把 `st.stance` 整段搬進 react 段（`delay: R0+60`）⇒
`{"peakAt":743,"windupOK":false,"reactAt":560}` ⇒ `stanceOK=false` ⇒ `FAIL`。健康態 `peakAt=300/300/133`、`windupOK=true`。兩面都驗過。
另外 `peakAt` 初值是 `Infinity`（`:1532`）⇒ 沒擺過時 `windupOK=false`，**不是空真**。

**為什麼仍判「表面」（N3，MEDIUM）**：門檻寫的是 `peakAt <= B.react[0]`（`:1594`）＝**travel 段結束**，而宣稱（語彙檔 §A9-1）是「在**蓄勢段**」。`beatOf` 回的物件裡 `windup[1] === travel[0]`（`js/trait-fx/vocab.js:44`），嚴格的那條 `peakAt <= B.windup[1]` 就在手邊，而且**今天全部過得去**（10 支的 `peakAt` 是 300＝`B.travel[0]`，wardImmuneLost 是 133）。也就是說：更嚴、也一樣會綠的門檻可用，卻選了寬的那個——現在一支招把姿態峰值放在**整個 travel 段的任何位置**都算綠，「在蓄勢段」這件事依舊沒被量到。

LOW：`vt` 以 `dt*rate` 為步長（rate 2.2 時約 37ms）跳，峰值剛好壓在 `react[0]` 上時可能被取樣到界外 ⇒ 假紅。

---

## H5（HIGH）§A9 ③ 迭代手工名單 — **真的修好（鑑別力已實測）**

`tests/fxvocab.test.mjs:310-330`（③ 改迭代 `convertedMoves()`，`CONVERTED_MUST` 降為活性下限＋`seen` 下限）。

**重現 H5 原文描述的那條繞法**（在樹副本上）：給 `wardFirst` 加一行 `st.phase('windup')`、在 `MOVE_SPEC` 填 `stance: '前傾'`，但編舞**不**呼叫 `st.stance`／`st.groundMark`：

```
修後（③ 迭代 conv）：  FAIL ... wardFirst 沒有呼叫 st.stance ／ wardFirst 沒有呼叫 st.groundMark   → 25 綠 ／ 1 紅
反向（③ 迭代 CONVERTED_MUST）：                                                                  → 26 綠 ／ 0 紅
```

**反向＝全綠、修後＝紅。** 這是本輪八條裡鑑別力最乾淨的一條。
突變 25／28 也各自驗紅（`--mutate=25` → `wardHpFirst 沒有呼叫 st.stance`；`--mutate=28` → `沒有呼叫 st.groundMark`）。

**一個非對稱（記錄）**：`if (!MS[id]) return;`（`:320`，①在 `:288` 也有）跳過不在 `MOVE_SPEC` 的三尊三招。哪天某支尊招拿到 `st.phase(`，它會**同時**逃過 ① 與 ③；而 `traitfx-drive` 的 `inStanceScope` 不跳它 ⇒ 那邊反而假紅。兩邊方向相反。今天三尊都沒有 `st.phase(`（grep 過），不是現行的洞。

---

## H6（HIGH）`selfReact` 一鍵豁免無人守 — **真的修好（對它點名的風險）**

`tests/fxvocab.test.mjs:333-344`。實跑 `--mutate=26` → `FAIL ... 得到 "eliteSelfCut,swarmLastStand"，預期 "swarmLastStand"`（25 綠／1 紅）；健康態綠。兩面都驗過。要長出第二支，得同時改語彙檔那句宣稱**和**這條測試——是真的凍結。

**殘留**：這條守的是「不得長出第二支」，**不是**「現有這一支的豁免是真的」。H6 原文要的「獨立證據」（與 `ABILITIES` 或編舞的 target 集合比對）仍然沒有；它釘在語彙檔的一句散文上，而那句散文與程式是同一個人寫的。比修前好很多，但這一半沒關。

---

## 順手修的 MEDIUM／LOW 覆核

| # | 判定 | 怎麼證明 |
|---|---|---|
| **M1** | 真的修好 | `groundMark` 改回傳 `kind`；`grep -rn groundMark js/trait-fx/*.js` 確認 **10 個呼叫點一個都沒用回傳值** ⇒ 沒有孤兒。同時把「編舞給不出第二份」降級為誠實敘述並補了絕對 delay 的限制註記。**但同一條限制現在也適用於 `st.stance` 的包絡，那邊沒有補**（見 H3）。 |
| **M4** | 真的修好 | `blindread-sheet.mjs:214` 寫進 `spec`。兩個小缺：`fxvocab`（拍的是哪一版演出）**沒記**，而它是比 mateGap 更決定性的材料規格；`count: COUNTQ \|\| null` 記的是「有沒有覆寫」而不是每一案實際用的 `c.count`（`:125` 用 `COUNTQ \|\| c.count`）。 |
| **M5** | 真的修好，**且有獨立鑑別力** | 我重現 M5 原文那條繞法（三個 `amp` **與** `minPeak` 一起 ×0.1，修前全綠）：`25 綠 ／ 1 紅`，**只有新加的那條紅**。注意突變 27 只動一個 amp，連舊那條自我指涉的檢查都會紅——單看突變 27 證明不了新測試的獨立鑑別力，我補的這個測試才證明得了。 |
| **M9** | 真的修好 | 反向突變（給 `MOVE_SPEC.hauntLost` 加 `stance: '前傾'`）→ `FAIL ... hauntLost（yinqi.js）／hauntLost（yinqi.js）`。（美觀小疵：`_v054` 與 `_v054short` 都命中，同一支被列兩次。） |
| **L2** | 真的修好但今天是死碼 | 三型的 `move[0]` 全是 0（`vocab.js:227-229`）⇒ 數值與修前逐位相同，**只靠讀程式碼驗**；哪天這行回歸也沒有任何門檻會響。 |
| **L4** | **表面修好** | `blindread-sheet.mjs:49-56` 是 `--(mate-gap\|gap\|mategaps)=` 的**三項黑名單**，不是未知旗標檢查。`--mate_gap=2`、`--mateGapp=2`、`--mategap2=` 照樣**靜默忽略**。這正是 `02 §6.1` 第 7 條說的「按已知的入口寫，不按危險的效果寫」——本批自己在別處引用了這條。 |
| **L3** | 真的修好 | JSDoc（`js/trait-fx.js:1434-1435`）與實際參數相符。 |

---

## 新問題

### N1（HIGH）「修 A 壞 B」＋**報告與同一個 commit 裡的證據檔當場矛盾**

`git diff 3b812ac 7661080 -- docs/experiments/.../prop-size/`：

```
- swarmLastStand xianghuo 1 1.1635 emblem:tornflag prop ... 0.789 ... OVER
+ swarmLastStand xianghuo 1 1.1229 emblem:tornflag prop ... 0.818 ... OVER
- swarmLastStand xianghuo 2 1.1635 ring other ... 0.584
+ swarmLastStand xianghuo 2 1.1229 ring other ... 0.606
```

殘旗 ratio **0.789 → 0.818**（t1／t2 皆然）、腳下環 0.584 → 0.606。**根因＝H3 的修法**：`舉臂` 的 `scl: 1.04` 在量測幀已經被包絡收回 ⇒ 分母 `figH` 由 1.1635 掉到 1.1229（−3.5%），所有比值跟著上抬。

而報告兩處仍寫舊數字並宣稱沒動它：
- `docs/experiments/2026-09-13-zuling-b2-report.md:149`「只有 1 列超標＝`swarmLastStand` 的殘旗 **0.789**（批 1 就在案，**本階段未動它**）」
- 同檔 `:305`「殘旗尺寸 **0.789 > 2/3**（批 1 就在案）…本階段未動」

三件事：① 這一階段**動了它**，而且是往超標方向；② 報告與它自己在**同一個 commit 裡重新產生**的證據檔分岔，兩份事實來源；③ 它本來就是 `OVER`，所以沒有新的紅燈——正因為沒有紅燈，才需要在報告裡照實寫。（另外 `p3-t1` 的 `eliteSelfCut` area 1.1684→1.2374 也變了，那個方向是好的、也不在報告表裡。）

### N2（MEDIUM）姿態收回的終點偏移、且沒有任何斷言在量收回 — 見 H3
### N3（MEDIUM）`windupOK` 的門檻比宣稱寬一個 travel 段，而更嚴的那條今天就會綠 — 見 H4
### N4（LOW）`run.inBlock` 沒有 `try/finally`，例外會讓旗標卡在 `true`（方向偏嚴）— 見 C2
### N5（LOW）剝後綴讓「只住 V055、未轉正」的招進入 `inStanceScope`（假紅），而 ⑱ 只守 V054、沒有 V055 的鏡像條款 — 見 C1

---

## 有沒有把及格線搬淺（`02 §2.1` 逐處對照）

`git diff 3b812ac 7661080 -- js tests` 共 5 檔、+623/−92。逐處：

| 判準／範圍 | 改了什麼 | 方向 |
|---|---|---|
| `inStanceScope`（`traitfx-drive.mjs:354-356`） | **一字未動** | — |
| `stanceOK`（`:357-360`） | 多了 `casterMatch===true && windupOK===true && groundSame===true` 三個合項（嚴格 `===`，欄位不存在時判紅而非靜默綠） | **加嚴** |
| `needEmblem`（`:392`）／`sg.expected`（`:497`） | 算式未動，輸入名單由「永不相等的後綴名」變真 trId | **加嚴**（1/4→4/4） |
| `emblemCasesFromSource` 活性下限（`:168`） | 拿掉 `|| list.indexOf(t+'_v055') < 0` 這個放寬條款 | **加嚴** |
| `phaseCasesFromSource` 的 `MUST`（`:170-171`） | 未動 | — |
| `CONVERTED_MUST`（`fxvocab.test.mjs:278`） | 內容未動；角色由「迭代對象」降為「活性下限」，③ 改約束推導出的全體＋保留 `seen` 下限 | **加嚴** |
| `actionsOK` 門檻（`:298`） | `acts >= 2` **未動**，只是分子不再被積木自己的 tween 墊高 | **加嚴** |
| `fillOK`／`rateOK`／`onTime`／`phasesOK`／`reactSolo`／尺寸鎖／L3 canary | 一字未動（`fxvocab.test.mjs` 的 16 條舊測試全部保留，26 綠裡 23 條是舊的） | — |
| 測試／突變 | 23 條測試 → 26 條（只新增，沒刪）；突變表 25 → 28 條，**1–28 我逐條跑過，全部有紅**，健康態 26 綠／0 紅 | **加嚴** |
| `STANCE_VOCAB` 數值／`STANCE_GATE.minPeak` | 未動（0.26／0.22／0.20、0.12） | — |
| P3 門檻（0.8% / ΔE 28）、P7（fps 0.95／draw 1000） | 未動；`fx-contrast-metrics.py`／`duel-perf` 不在 diff 裡 | — |

**沒有一處是移動及格線。** 唯一要提的是 N1：一個**已經超標、不進 pass** 的記錄數字被這批修法推得更差，而報告沒更新它。

---

## 修 A 有沒有壞 B（互相踩到）

- **H3 × 尺寸記錄**：踩到了 → N1。
- **H2 × `evalPhases`**：拿掉 `st.stance` 的 `markCaster` 讓 `run.caster` 可能為 null，會連帶放寬 react 段的排除邏輯（`js/trait-fx.js:720-722`）。目前無此招，且 `casterMatch===true` 在 caster 為 null 時判紅 ⇒ 有後手。記錄。
- **H3 × 因果三段量測**：`metricOf`（`:675-691`）只讀 `w.over`／`w.mo`，`staK` 與 `sta` 都不進去 ⇒ `phasesOK`／`reactDelta` 一格不動。✔（我跑的三支 `phases=windup:1,travel:1,react:1`、`reactSolo=false`。）
- **H3 × 尺寸鎖／L3 canary**：`staK` 只乘 model 的 transform，徽記走 `st.icon`／`auditSizes` 另一條路；`--fxvocab=1` 四支 `ok 4／n/a 0／fail 0`、`鎖上 15 of 產出 15`。✔
- **H1 三條 throw × 現有 10 支**：10 支全部先 `st.groundMark(<caster>)` 再進姿態 tween（`xianghuo.js:228,348,505,668,832,976,1143,1258,1359`／`zuling.js:523`），三條 throw 都不會誤傷；我實跑 3 支 t2＋2 支 t1＋4 支 `--fxvocab=1` 全 pass。✔
- **M1 改回傳值 × 編舞**：10 個呼叫點都不用回傳值。✔

---

## 無法確認 / 沒驗的

1. **H3 的畫面結論**（「react 段施招者回正並跟著上抬，改前是沉下去」）——我沒有重拍 sheet／重跑 `fx-contrast`。算術上淨值為正（見 H3），但**「讀者看到的是上抬」這件事我沒有量到**。作者說重拍了三張，diff 裡那幾個 PNG 確實變了。
2. **「10 支全部 `casterMatch`／`groundSame`／`windupOK` 為 true」**——我只驗了 3 支（eliteSelfCut／wardImmuneLost／swarmLastStand，t2 `--count=2`）＋`--fxvocab=1` 的四支。其餘 7 支沿用作者的回報。
3. **P7 效能／P0 等價／P8 duel-drive** 這一批我沒重跑。
