# 陰氣批階段 A — 對抗式覆審（冷讀 `ea2a38f..HEAD`）

> 覆審者沒有本卷的對話史，只讀 diff ＋ 權威文件 ＋ 實跑。任務是**找出宣稱成立但實際不成立的東西**。
> 正式碼與治具 `js/`／`tests/` **一行未動**；所有實驗走 `traitfx-drive --root=<隔離樹>` 或唯讀探針，
> 隔離樹與探針落在 gitignore 的 `scratchpad/adv*`（覆審結束已清掉）。
>
> **計分：CRITICAL 2 ／ HIGH 7 ／ MEDIUM 9 ／ LOW 5。**（另有 3 條在覆審中途被作者自己修掉，列在「已自行修正」。）

---

## ★覆審期間 HEAD 移動了，先講清楚★

覆審開始時 HEAD＝`7ab5130`（工作樹另有一處未 commit 的註解修正）。
覆審進行到一半時作者推了兩個 commit：

- `43c6c20` 看圖第 3 輪——紅帽不淡出、修一處註解與實測不符
- `daf2548` 末次閘門數字回填（P3 1.022%、acts 8、七跑 drive 全綠）

**所有下面留著的 finding 都已在新 HEAD（`daf2548`）上重跑確認過**；
中途被作者自己修掉的三條移到最後一節，不計入計分，但保留數字供交叉核對
（我第一輪量到的 `acts=8`／`P3 1.022%` 其實是 `43c6c20` 落地之後的值，
事後在 `7ab5130` 的 `yinqi.js` 上重跑得到 `acts=9`，與原 `gates.txt` 相符——那一格是我先誤判，已更正）。

---

## CRITICAL

### C1 `anchors`／`mainOK` 在這一支上零鑑別力——它的答案是 `st.stick` 的瞬移餵的，不是飛行餵的

**檔案:行號**
- 被測：`js/trait-fx/yinqi.js:277`（`st.stick(hat, lost, { at: 'top', off: to.clone().sub(top) })`，
  與 `st.phase('react')` 同一個 `done()`）
- 量測端：`js/trait-fx.js:837`（`anchorOK`）／`:842`（`sampleAnchors`，時點由引擎寫死在 `react[0]`）／
  `:2055–2058`（`casterMatch = 姿態的尊 === caster 且 anchorOK(...)`）
- 判定端：`tests/tools/traitfx-drive.mjs:362–367`（`stanceOK` 要求 `sc.casterMatch === true`，進 `verdict.pass`）

**實測（隔離樹，新 HEAD `daf2548`，正式碼未動）**：把 `js/trait-fx/yinqi.js:254` 的
`hat.position.lerpVectors(from, to, j);` 換成 `hat.position.copy(from);`
（＝`b3-mutations.mjs` 的 M10「帽子原地生成、完全不飛」），anchor 的每一格與健康態**逐字相同**：

| | 健康態 | M10（完全不飛） |
|---|---|---|
| `mainDeclared／mainShown／mainOK` | true／true／true | true／true／**true** |
| `mainD` | 0 | **0** |
| `gap`（emblem:hat／prop:hat） | 2.053／1.896 | **2.053／1.896** |
| `bad／skipped／missing` | 0／0／0 | 0／0／0 |
| `anchors.ok` | true | **true** |
| `verdict.pass` | true | **true** |

**為什麼現在的證據擋不住它**
報告 §1.4 第 1 點與 §1.5 第 2 格白紙黑字寫：「`foe` 這一格的證據**完全由 `mainOK`**
（主道具真的貼到敵方那一側，實測 `d=0`、`gap` 1.3–2.1）**承擔**」。
但 `mainOK` 的量測時點是 `react[0]`，而 `st.stick` **正好在同一拍**把帽子瞬移到受招方頭頂
——所以帽子飛不飛，`mainOK` 都是 true、`mainD` 都是 0。
報告把 M10 歸因成「`travel` 的 claim 沒有時間上限」，那只找到兩條腿裡的**一條**；
另一條（anchor）被**同一個瞬移**餵，報告沒有列，反而拿它來當 `foe` 豁免逐尊覆蓋的補償證據。
⇒ `foe` 這一格現在是「`coverOK` 恆真」＋「`mainOK` 也恆真」兩層空的疊在一起。

**而且防線是按「已知入口」寫的，不是按「效果」寫的**（`02 §6.1` 第 7 條）
§A9-5 明文「`follow` 印記不能當主道具（黏上去的東西在落點量測裡**恆真**）」，
引擎在 `js/trait-fx.js:1090` 用 throw 守它。這支招繞過去的路徑是：
先用 `st.paperStamp(..., { anchor: 'foe', main: true, ... })` 以 **land 型**登記
（`js/trait-fx/yinqi.js:186`），再用**不帶 `o.anchor`** 的 `st.stick` 把它變成 follow
——`js/trait-fx.js:1078` 的 `regAnchor` 對沒有 `o.anchor` 的呼叫**直接 return**，
引擎從頭到尾不知道這件主道具已經黏上去了。dump 出來的那一列就寫著 `"type":"land"`。

**可機械判定的建議修法**
`sampleAnchors` 判 land／follow 時改看**效果**：`run.follow.some((w) => w.mesh === a.obj)`，
而不是登記當下的 `followFig`；`anchorOK` 的 `mainScope` 分支加一條「主道具不得在 `run.follow` 裡」。
**驗收**：重跑 M10，`anchors.ok` 必須由 `true` 翻成 `false`（現況 true），健康態仍須 `true`。

---

### C2 P3 的閘門工具在 HEAD 上是**紅的（exit 1）**，報告與 `gates.txt` 只引用了下游 metrics 的 JSON

**實測（本樹，新 HEAD，正式碼未動）**

```
$ node tests/tools/fx-contrast.mjs <out> --only=hauntLost --tier=1
FAIL hauntLost        t1 凍在 156ms(第 9 幀) 切掉 1 個特效物件 handled=true size=fail(0v/0of0/u0+d0) err=0
徽記世界尺寸斷言：違規 0 次／鎖上 0 of 產出 0／稽核 update 0＋draw 0 次　★未量到★　fail：hauntLost
★★ 徽記世界尺寸有第二份來源（或鎖／稽核沒掛上去）——N11 防線判紅 ★★
exit code = 1
```
`--tier=2` 同樣 `FAIL` ／ exit 1。

**成因鏈（＝本批「`V054` 整段移除」的未宣告副作用，任務第 5 項）**
1. 本批把最後一段 `export const V054` 從 `js/trait-fx/yinqi.js` 移除
   ⇒ 三個系別檔現在**都只有 `V055`**（實測 `grep -n '^export const'`：zuling／xianghuo／yinqi 皆無 V054）。
2. `tests/tools/traitfx-drive.mjs:85` 的 `movesMatching` 用
   `src.indexOf('export const V054')` 切掉退路段——這個字串**三個檔都找不到**，
   `if (cut > 0)` 恆假 ⇒ **`V055`／`V055_SHORT` 整段被納入掃描**，`:99` 又把 `_v05[45]` 後綴剝掉。
3. `emblemCasesFromSource` 因此回 `['biteGamble','eliteSelfCut','hauntLost','wardImmuneLost']`
   ——來源是 `V055` 的 `st.icon`，**不是** `MOVES`。實測：把切點改成 `fxvocab.test.mjs` 那一條
   `/export const V05[45]/`，同一支函式回的是 `[]`。
4. `tests/tools/fx-contrast.mjs:203`：
   `usesEmblem = emblemMoves.indexOf(fxvocabQ(opt) ? c.trait + '_v055' : c.trait) >= 0`
   ⇒ **預設路徑**查的是裸 `hauntLost` ⇒ true；
   而轉正後的 `MOVES.hauntLost` 走 `st.paperStamp`、不產生平面徽記 ⇒ `iconMade === 0`
   ⇒ `sizeState = 'fail'`（`:205`）⇒ `process.exitCode = 1`（`:243`）。

**為什麼現在的證據擋不住它**
`gates.txt` 的 P3 段只貼了 `fx-contrast-metrics.py` 的兩行 JSON，
**沒有貼 `fx-contrast.mjs` 自己那一行 verdict，也沒有貼 exit code**——
而 `tests/tools/README.md:149` 正好寫著「紅在 `fx-contrast` 自己的 exit code」。
`b3-mutations.mjs` 的 `gate('drive')` 也只跑 `traitfx-drive`，**完全沒有跑 `fx-contrast`**，
所以這個紅對突變腳本同樣不可見。報告 §1.3 把 P3 記成 ✅。

**可機械判定的建議修法**
不要只改 `movesMatching` 的切點（那會讓 `emblemCasesFromSource` 的活性下限 throw，見上面第 3 點實測）。
改 `fx-contrast.mjs:203` 的身分判定：用 `v055CasesFromSource(ROOT)`（它自己 match `_v055`，
不受剝後綴影響）判「這一跑實際走的是不是徽記版」，`--fxvocab=1` 才要求 `made>0`。
**驗收**：`node tests/tools/fx-contrast.mjs <out> --only=hauntLost --tier=2 ; echo $?`
必須印 ` ok ` 且 exit 0；帶 `--fxvocab=1` 時把 `V055` 的 `st.icon` 拿掉必須仍然 exit 1。

---

## HIGH

### H1 `gates.txt` 把 **M10 突變的數字**標成「健康態」

`gates.txt:34–37`：

```
phaseDetail（t2，健康態）：
  travel ok=true moved=2.8844 need=1.2533（travelDist 3.133 × 0.40）
```

實測健康態（`7ab5130` 與新 HEAD 兩版都量過）＝**1.721**。
`2.8844` 是 **M10 突變**的數字（報告 §1.5 自己就是這樣引用的：「M10 實測 `moved 2.8844`」）。
`daf2548` 回填了 `acts` 與 P3，**沒有動這一行**。
**擋不住的理由**：`gates.txt` 是人工整理的貼上稿，沒有任何檢查比對它與 JSON 落檔。
**建議**：drive 的落檔 JSON（`results[0].sig.phaseDetail`）直接貼，或加一條 `--sigdump` 落檔並比對。

### H2 「收斂鼓弧是為了讓鏡頭偏移不再替飛行作證」被自己的治具否證——偏移的貢獻**不減反增**

實測 M12（飛行與黏著都拿掉，`travel` 的分子只剩鼓弧）：

| 版本 | `travel.moved` |
|---|---|
| `1c71bf9`（收斂前，連續弧 `sin(π·j)`） | **0.6653** |
| `a36cc31`～HEAD（收斂後，只掛中間那一跳） | **0.7404**（＝`b3-mutations.txt` 自己記的數字） |

門檻 `need = 1.2533`。收斂之後鏡頭偏移**多餵了 11% 的分子**（0.6653 → 0.7404），
因為凍幀那一跳的倍率由 `sin(π·0.64)=0.905` 變成 `1.0`。
`js/trait-fx/yinqi.js:257–258` 現在寫的是「讓鏡頭偏移**不要替飛行作證**……
收成一跳之後，第一跳與最後一跳完全沒有偏移」，報告 §1.5 也照這個講
——**第一跳與最後一跳沒有偏移是真的，但「偏移替飛行作證」這件事變嚴重了，不是變輕**。
（`43c6c20` 已經把更早那句「M10 當場轉紅」修掉，那一半見「已自行修正」。）
**建議**：把這一段的宣稱改成實測數字，或乾脆把鼓弧從 `hat.position` 移到一個**不進 `run.meshes`**
的父節點（分子歸零、畫面不變），驗收＝M12 的 `moved` 必須掉到 <0.1。

### H3 §B3／ART_BIBLE §10.1 的「不規則**暗斑**」不成立——畫出來是比桌面亮得多的青綠亮斑

**檔案:行號**：`js/trait-fx.js:1915`（`st.groundMark` 的 `stain` 分支用 `color: st.colors.line`）。

報告 §1.1 的理由只比了 `line`(0.58) vs `key`(0.88)，卻拿「`key` 在桌面 `#6b3418`(0.24) 上是**亮斑**」
當論據——**`line` 的 0.58 對 0.24 同樣是亮斑**，這段推理推不出它的結論。
實測 sRGB 相對亮度：`#6fae90` Y≈0.353（L\*≈66）、桌面 `#6b3418` Y≈0.057（L\*≈28.5），
對比約 **3.8:1，而且斑比桌面亮**。治具截圖（`traitfx-drive --shots`，t2 第 24／41 幀）上是一塊
明顯的亮青綠團塊，不是「濕、無主」的暗斑。
**擋不住的理由**：`fx-contrast` 量的是「與 A 版的差圖面積／ΔE」——亮斑的面積與 ΔE 只會**更好看**，
沒有任何閘門量「它比背景暗還是亮」。
**建議修法**：`st.stain` 的本體色改 `ink`（`#04120c`）、描邊改 `line`（暗斑＋苔綠邊），
並在 `tests/fxvocab.test.mjs` 補一條可機械判定的斷言：`FAC_GROUND` 為 `stain` 的系別，
其腳下語彙本體色的相對亮度必須**低於** `js/scene-env.js` 的 `TABLE_COLOR`。

### H4 報告 §1.6 驗收清單的三個 ✅ 與程式碼矛盾

1. **「✅ 卡頓：…整支沒有平滑補間的位移」不成立**（§B3／§10.7 陰氣禁區「平滑補間的位移」）：
   - `js/trait-fx/yinqi.js:309–313` 收勢 tween：`ease: 'linear'`、`k = 0.96 * (1 - min(1, t*1.35))`，
     逐幀連續內插 `st.move(ghost, fwd.x*0.13*k, 0, fwd.z*0.13*k)`——t2 下是一段 **185ms 的平滑位移**。
   - `js/trait-fx/yinqi.js:282`：`st.tween({ …, ease: 'out', update(t, e) { writeShards(e); } })`
     讓 4 片魂片以 easing **連續**散開（`it.p.set(cos·r·k, up·k, sin·k)`，k＝連續的 e）。
2. **「✅「那一點刺眼的紅」只落在帽子上（全招其餘只有冷屍白青、苔綠、近黑）」不成立**：
   `js/trait-fx/yinqi.js:273` `st.burst(to, { power: 0.62, n: 30, color: C.hot })`
   ——衝擊拍噴 **30 顆 `hot #ff2f3a`**。（色票用法本身合法，`FX_PAL` 註解寫 hot「只給命中」；
   不成立的是括號裡那句「全招其餘只有…」。）
3. **「✅ 道具是實體紙紮（厚度 0.22＋墨線邊＋翹曲 0.16）」只描述了帽子**：
   魂片 `js/trait-fx/yinqi.js:200` `st.paperProps(st.kind, SH, { …, depth: 0.12, warp: 0.22 })`
   ——`depth 0.12` **低於** §A4 第 1 條／§10.2 第 2 條的 0.18–0.26，
   `warp 0.22` **高於** 0.08–0.18；而且 `st.paperProps` 明文不做墨線邊
   （`js/trait-fx.js:1622–1628`），與 §B3 對丙家族「冷屍白青＋`ink` **外描邊**」的要求相反。
   **擋不住的理由**：`depth`／`warp` 的區間沒有任何機械檢查。

### H5 滿編下 4 尊紅帽只有 1 尊在演（轉正前是 4 尊錯開）

**檔案:行號**：`js/trait-fx/yinqi.js:157`（`const ghost = ghosts[0];`），
之後 `point()`／`st.move()`／`st.rim()` 全部只套在 `ghost` 上。
基準版是 `ghosts.forEach((g, i) => …)` 三條 tween、四尊以 `i * W * 0.06` 錯開
（`git show ea2a38f:js/trait-fx/yinqi.js`）。

`index.html:1996` 的 `redhat` 是 `count: 4`，`traitfx-drive` 的**預設治具棚就是 `count=4`**
（實測 URL `…&trait=hauntLost&ab=redhat&body=haunt&fac=yinqi&count=4&…`，
治具頁標題 `hauntLost redhatx4 ready · figs 8`）。截圖上另外三尊全程不動。

**擋不住的理由**：`windup` 的 bone 是 `metricOf(run, f => run.actorSet.has(f))` 對 actorSet 取 **max**，
一尊動就過；`stance.extra` 只計「被套上第二份姿態的人」，不計「沒有動作的同型同伴」。
報告 §1.4「我沒有做的事」與 §1.7「我看到還粗的地方」都沒有列這一條，
而 §1.8 又記著**真實對決的衝擊拍那一張沒抓到** ⇒ 這支招在滿編下的樣子沒有人看過。
**建議修法**：`point()`／`st.rim()` 套回 `ghosts.forEach`（錯開量沿用基準版的 `i * W * 0.06`），
`st.stance`／`st.groundMark`／道具仍只給 `ghost`。
驗收＝`traitfx-drive --only=hauntLost --tier=2 --shots=<dir>`，第 24 幀四尊皆離開 idle 姿勢。

### H6 報告 §1.5 自列的「這一支上恆真」漏了四格，而且其中一格的支數算錯

**先驗證報告自己列的那兩格——兩格都對**：
- 「§A9-2 對 `hauntLost` 恆真」——**成立**。`REACT_AXIS['轉'] = 'spin'`（`js/trait-fx/vocab.js:234`），
  `STANCE_VOCAB` 三型的 axis 是 `fore`／`up`／`down`（`:228–232`），沒有 `spin`。
- 「`foe` 那一格 `coverOK` 恆真」——**成立，而且比報告寫的更硬**：
  `js/trait-fx.js:974–987` 的 spec 分支只列了 `allies`／`ally`／`self`／`caster`／`foes`，
  **完全沒有 `foe` 分支** ⇒ 落到 `else { need = 0; coverOK = true; }`。
  實測 dump：`cover 0／coverNeed 0／coverSep 3／coverOK true`。

**但支數算錯**：報告寫「它是陰氣 9 支裡 **6 支**的狀態」。實際是 **4 支**——
恆真的條件是 react 的 axis 不落在 `{fore, up, down}` 裡，陰氣只有
`轉`(spin，1 支：`hauntLost`)＋`抖`(shake，3 支：`hauntSee`／`eliteVsSwarm`／`swarmPierce`)；
`被拖`(fore，3 支：`hauntSteal`／`hauntSwap`／`swarmFeed1`)與
`壓`(down，2 支：`hauntDread1`／`hauntFearX2`)分別撞得到 `前傾`／`下沉`，那 5 支不是恆真。

**漏掉的四格**：
1. **`anchors.ok`／`mainOK`**——見 C1（實測與健康態逐字相同）。
2. **`fillOK` 對這份範本恆真**：`yqBeat(st, 0.90)` 讓 `LAST = ms*0.90`，收勢 tween 排在 `[R0, LAST]`
   （`js/trait-fx/yinqi.js:309`）⇒ `horizon` 恆等於 `0.90*ms`、`fill` 恆等於 **0.900**（實測 `fill=0.9`）。
   門檻 0.85 ⇒ **任何照這份範本排時間軸的招都不可能紅**。
   （`43c6c20` 拿掉帽子的淡出之後仍然如此——收勢 tween 才是最後那一條。）
3. **P3 的 t1／t2 不是兩份證據，是同一張圖**：`tests/tools/fx-contrast.mjs:117` 的凍幀點是
   `(travel[0] + travel[1]) / 2` ⇒ 兩個 tier 都落在 travel 進度 **`e = 0.5`**；
   本招所有時點都由 `st.beat` 等比換算、位移又被 `JOLT`／`COIL` 量化成台階
   ⇒ 凍幀那一格的畫面在兩個 tier 上完全一致。實測：t1 與 t2 的 `px` 都是 **3364**、
   `de_median` 都是 **35.65**、`de_p90` 都是 **83.37**。報告寫「t2／t1 皆 …」讀起來像兩次獨立驗證。
4. **`sizeState` 在預設路徑恆為 `n/a`**：`tests/tools/traitfx-drive.mjs:400` 的
   `needEmblem` 綁 `!!fxvocabQ(opt)` ⇒ 不帶 `--fxvocab=1` 時 `sizeOK` 恆真；
   而 `st.paperStamp`／`st.paperProps` 本來就不在尺寸鎖裡（`tests/tools/README.md:136–146`）
   ⇒ **§A3 對這一支在執行期一格檢查都沒有**（報告只把 §A3 列成「記錄項不擋批」，
   沒有說它連執行期的尺寸鎖也不在範圍內）。

### H7 §A2「三件收在同一個衝擊拍」在 t2 下不成立——兩個重音，相距 2.2 幀

`BEAT_FRAC[2] = [0.3333, 0.6222, 0.8444]`（`js/trait-fx/vocab.js:33`）⇒ t2 的
`windup [0,300]`／`travel [300,560]`／`react [560,760]`。
`JOLT`（`js/trait-fx/yinqi.js:21`）的最後一階在 `e ≥ 0.86`：

| tier | 第三跳（＝本體到位＋帽子落點） | 衝擊拍 `react[0]` | 差 |
|---|---|---|---|
| 2 | `300 + 0.86×260 = 523.6ms` | 560ms | **36.4ms ＝ 2.18 幀** |
| 1 | `104 + 0.86×104 = 193.4ms` | 208ms | 14.6ms ＝ 0.87 幀 |

`js/trait-fx/yinqi.js:18–20` 的註解寫「最後一階落在 0.86，第三跳與衝擊拍**幾乎同幀**」
——t1 成立、**t2 不成立**。§A1 明寫「衝擊拍＝`react` 的**起點那一瞬間**，不是一整段 `react`」，
§A2 的失敗型態正是「三件先後發生＝**兩個重音**」。實際排法是：
①本體到位＋②道具落點在 523.6ms、③受招反應（`st.spin`／`st.move`）在 560ms。
魂片的淡入也排在 `T0 + TL*0.86`（`:281`）⇒ 與①②同一拍，不是與③同一拍。
（`st.stick` 在 560ms 不產生可見跳動：`to` 早在 t=0 就是「`st.top(lost)` ＋ 0.10y ＋ `camOff(0.5)`」，
黏上去的位置與帽子 523.6ms 已到的位置相同。）
**擋不住的理由**：`PHASE_GATE` 只量「三段各自有沒有動」，**沒有任何檢查量「三件在不在同一拍」**。
**建議修法**：讓「到位」那一格移進 `done()`（與 `st.burst`／`st.punch`／`st.spin` 同幀），
或補一條可機械判定的斷言：主道具抵達 `to` 的時點與 `react[0]` 的差 ≤ 1 幀。

---

## MEDIUM

### M1 `movesMatching` 的切點已成死碼，與 `fxvocab.test.mjs` 的同名推導分岔（兩邊註解都寫「同一條推導」）

`tests/tools/traitfx-drive.mjs:85` 用 `indexOf('export const V054')`；
`tests/fxvocab.test.mjs:230`／`:258` 用 `search(/export const V05[45]/)`。
本批移除最後一段 V054 之後，前者**恆為 -1**。實測後果：
把 `MOVES` 段的 4 個 `st.phase(` 全部中性化，`phaseCasesFromSource` **仍**回 19 支、仍含 `hauntLost`
（由 `hauntLost_v055` 餵），活性下限對有 V055 孿生版的那 4 支失去意義。
而 `tests/tools/traitfx-drive.mjs:350–356` 這一批**新寫**的註解宣稱
「留著是給下一卷的：再有招退回舊演出時它自動生效」——對 `v054CasesFromSource` 成立，
對 `movesMatching` **不成立**（切點只認 `V054`，而且下一卷若把 V054 放在 V055 之前，
會連 V055 一起切掉、`emblemCasesFromSource` 當場 throw）。
**建議**：兩處共用同一支工具函式，並補一條測試「兩邊推導出的集合必須相等」。

### M2 §C3 第 1 列指定的「乙 地面錯亂腳印」被換成「丙 魂片」，報告的「我沒有做的事」沒有列

§C3 第 1 列的道具欄是「甲 紅帽 … ＋ **乙 地面錯亂腳印（`st.stain`）**」，
t1 衝擊拍承載欄是「帽子扣上頭＋那隻同幀開始打轉＋**腳印踩出**」。
實作把乙整組拿掉、改成丙 魂片（`js/trait-fx/yinqi.js:196–219`），
`st.stain` 移去當施招者的腳下語彙；`MOVE_SPEC.hauntLost.prop` 仍是 `'甲'`
（`js/trait-fx/vocab.js:346`）。報告 §1.4 宣稱逐條列出「沒有做的事」，這一條不在裡面。

### M3 §A9-5 第 5 條「落點**一律**由 `st.bodySpot` 挑」「黏上去的道具在 `done()` 再挑一次」沒有照做

`to` 在 t=0 用 `st.top(lost)` 算（`js/trait-fx/yinqi.js:184–186`），
`done()` 裡也只是 `st.top(lost)` 取偏移、沒有重挑（`:275–278`）。
治具棚餘裕大（`gap` 1.29–2.08）所以沒紅，但這是對明文「一律」的**未揭露例外**。

### M4 報告 §1.3 的 anchor 表把預設那一跑標成「`--count=1`（預設治具棚）」——實際是 `count=4`

實測 URL：`…&trait=hauntLost&ab=redhat&body=haunt&fac=yinqi&count=4&ms=900&tier=2…`，
治具頁標題 `hauntLost redhatx4 ready · figs 8`。
三列的 `n=2` 是「一頂帽子＋一組魂片」，與尊數無關。標籤錯了會讓讀者以為只驗過單尊場景
——而單尊 vs 四尊正是 H5 那個問題會現形的地方。

### M5 `st.stain` 把「尺寸只有一份來源」的收斂又開了一個口，而且沒有上限

`r` 是編舞直接給的自由數（`js/trait-fx/yinqi.js:219` 的 `r: 0.46`；`st.groundMark` 預設 0.42），
不經 `ICON` 三張表、不在尺寸鎖（`SIZED`）裡、在 `BLOCK_MADE` 放行名單裡
（`js/trait-fx.js:1855`）、也不進 §A3 判定——`prop-size` 把它歸成 `floor:stain`／`other`，
量到 **1.5844 ＝ 施招者身高的 1.40 倍**。報告寫「腳下語彙，不在這條規則範圍」，
依據是 §A9-5 的「已知未涵蓋」那一句（它講的是 **anchor 登記**，不是尺寸），
§A3 本身並沒有豁免腳下語彙的尺寸。
**建議**：在 `st.stain` 加一條 `r` 的上限斷言（例如 ≤ `figBoxOf(fig)` 的水平半徑），
或把 `floor:*` 納入 `prop-size` 的判定欄而不是只印記錄。

### M6 12 條突變一條都沒打到本批真正新增的語彙宣稱

`b3-mutations.mjs` 的 M1–M12 全部落在「登記表與三個旗標」上
（`stance`／`anchor`／`main`／`groundMark`／react 的 move delta）。**沒有任何一條**打：
- `st.stain` 的「邊緣不規則、不是圓與方」——把 `js/trait-fx.js:1834` 的 `LOBE` 改成全 `1.00`
  （＝正圓，正是 §B3 的禁區），P0–P8 每一格照樣全綠；
- `COIL` 的「出招前一拍完全靜止」、`JOLT` 的三段跳、「三件同一拍」、`trail: false`；
- 而且 `gate('drive')`（`b3-mutations.mjs:26–36`）**只跑 `traitfx-drive`**，
  沒有跑 `fx-contrast`／`prop-size`／`proto-record` ⇒ C2 那個紅對這支腳本不可見。

**錨點本身查過了，沒問題**：11 條錨點字串在 `js/trait-fx/yinqi.js`／`vocab.js` 裡
**各只出現 1 次、第一次出現都不在註解裡**（逐條實測，含「這個位元組在不在註解區間」的遮罩檢查）；
還原走自取備份、配不到就整支中止——這三件都做到了。
**但**腳本只斷言 `indexOf(a) >= 0`、用 `String.replace` 只換第一處；
這個 repo 的註解慣例是逐字引用程式碼行，建議把斷言改成「出現次數必須 === 1」。

### M7 tier 1 下 react 的「六個離散角度」有一半畫不出來

`js/trait-fx/yinqi.js:295`：`const n = Math.min(5, Math.floor(t * 6))`，
t1 的 `RL = LAST − R0 = 270 − 208 = 62ms` ⇒ 每階 **10.3ms**，短於一幀（16.67ms）。
實際採樣點 t≈0.274／0.532／0.806 ⇒ n = 1／3／4
⇒ `TURN[0]=0.95`、`TURN[2]=3.15`、`TURN[5]=0` 在 t1 **從來不會被畫出來**。
§B3 的「六個離散角度、階與階之間一動都不動」在 t1 讀不出來（讀起來就是連續轉）。
作者在 `43c6c20` 已經因為同一個 `RL=62ms` 改掉帽子的淡出，但沒有回頭檢查 `TURN`／`SWAY`。
**建議**：階數由 `RL / dt` 推導（至少每階 2 幀），或 t1 走 3 階、t2 走 6 階。

### M8 P0（trace-eq）對本批恆真，而真正有鑑別力的 `--sigdump` 一次都沒跑

`tests/tools/traitfx-drive.mjs:551–556` 自己寫著：trace-eq「只抽 index.html 的第一個 `<script>`
在 node 裡跑，**完全不載入 `js/`**，所以本批 index.html 零 diff ⇒ 那條『逐位元組相等』恆真，
證明不了 `js/trait-fx*` 有沒有被動到」，並指定 `--sigdump` 才是對 `js/` 有鑑別力的等價證據。
`gates.txt` 與報告全文**沒有出現 `sigdump` 這個字**，卻把 P0 列成 ✅ 的「等價」證據。

### M9（`43c6c20` 新引入）帽子改成「不淡出、清場才消失」，而三張 sheet 都取樣不到那一格

`js/trait-fx/yinqi.js:302–308`：淡出整條拿掉，帽子維持 opacity 1 直到 `traitFx` 收工清場。
實測 `end=66` 幀（出招在第 12 幀、dt=16.67ms）⇒ 清場落在 **900ms**，
而 sheet 的第 6 格是「`react[1]` 內縮 15%」＝ t2 的 **730ms**、t1 的 **267ms**，
drive 的 `--shots` 取樣點是 `0.2／0.45／0.75 × ms`。
⇒ **沒有任何一張交付的圖取樣到帽子消失的那一格**：現在它是一個滿透明度的大紅道具在一幀內消失。
`restored` 只量「清完了沒」，量不到「怎麼消失的」。
**建議**：改成落在 `settle` 段（`[760,900]`）的淡出——那一段是 §A1 唯一可省的一段，
不吃 `react` 的 62ms；或在 sheet 多補一格取樣點在 `settle` 末。

---

## LOW

### L1 `KNOWN_GREEN` 的豁免沒有反向警報

`b3-mutations.mjs:96` 的 `KNOWN_GREEN = ['M10','M11']` 讓這兩條永遠不計 exit code。
M11 是設計上的對照組（照實列為「不該紅」），沒問題；M10 是真洞的豁免。
等引擎補上 `travel` 的 `until`（或照 C1 修 anchor）之後 M10 會轉紅，而沒有人會被通知。
**建議**：M10 改成「期望 GREEN，一旦變 RED 就印一行『這個已知洞已修，把 M10 移出 KNOWN_GREEN』」。

### L2 「出招前一拍完全靜止」的實際長度（任務第 4 項要的數字）

`COIL(e)`（`js/trait-fx/yinqi.js:26`）在 `e ≥ 0.42` 之後回傳恆為 1，蓄勢 tween 是
`{ ms: W, ease: 'linear' }`（`:226`）⇒ 靜止段 ＝ `W × 0.58`：

| tier | 蓄勢窗 W | 靜止段 | 幀數（60fps） |
|---|---|---|---|
| 1 | 104ms | **60.3ms** | **3.62 幀** |
| 2 | 300ms | 174ms | 10.4 幀 |

**這一格沒問題**——t1 也還有 3.6 幀，而且 `COIL` 的三個台階在 t1 各自都撐得過一幀
（0–21.8／21.8–43.7／43.7–104ms），與 M7 的 react 段不同。
唯一的但書：同一段期間 `st.groundMark` 的暗斑仍在淡入（亮滅寫在積木裡、編舞改不到），
所以「畫面上一動都不動」嚴格說只對施招者本體與帽子成立。

### L3 `V055_SHORT` 的註解容易誤讀

`js/trait-fx/yinqi.js:1079` 寫「短版與完整版共用同一支（徽記版原本就沒有 `hauntLost` 的專屬短版）」
——對 0.55 徽記版成立（基準版 `SHORT.hauntLost = MOVES.hauntLost`）。
但**基準版的 0.54 退路有一支真正的專屬短版** `hauntLost_v054short`（K 比例縮放，
`git show ea2a38f:js/trait-fx/yinqi.js` 的 `V054_SHORT`），隨 V054 一起刪掉了。
這句話併在「0.54 退路連同轉正一起移除」的同一段裡，讀起來像「本來就沒有短版」。

### L4 陰氣 9 支的腳下語彙現在全部同形，§C3 給 `hauntFearX2`／`hauntDread1` 的區分點要重訂

`FAC_GROUND.yinqi = 'stain'` 讓**全部 9 支**陰氣招的施招者腳下都長出同一個 `st.stain`
（形狀表 `LOBE` 寫死，只有 `o.rot` 能轉）。
而 §C3 給 `hauntFearX2` 的區分點是「腳下不規則暗斑」、`hauntDread1` 是「地面水漬」，
兩者「靠輪廓、面積與落點分」。鋪階段 B 之前要先裁這兩支怎麼分，
否則就回到語彙檔開頭寫的那個病：「19/27 共用同一圈腳下光環」。

### L5 同一支招的兩件道具共用 `st.kind`

帽子 `st.paperStamp(st.kind, …)`（`:186`）與魂片 `st.paperProps(st.kind, …)`（`:200`）都用 `'hat'`，
於是 `prop-size`／`sig` 裡出現 `emblem:hat` 與 `prop:hat` 兩列。
魂片走 `shape:'flake'` 的矩形（不是 hat 的外框頂點表），畫面上不會撞，
但尺寸來源變成 `ICON.markSizeOf('hat')`＝預設 0.30（`markByKind` 沒有 `hat` 這一格）
——下次有人為了調帽子去動 `ICON.byKind.hat` 時，要記得這兩件走的是不同張表。

---

## 逐項回答任務指定的三類

**1. 零鑑別力的檢查**——報告自列的兩格**都對**（§A9-2 恆真、`foe` 的 `coverOK` 恆真；
我在 `js/trait-fx/vocab.js:228–234` 與 `js/trait-fx.js:974–987` 上核過，並用 dump 確認 `coverNeed=0`）。
但漏了四格：`anchors.ok`／`mainOK`（C1）、`fillOK`（H6-2）、
P3 的 t1／t2 同圖（H6-3）、預設路徑的 `sizeState` 恆 `n/a`（H6-4）；
「6 支」應為「4 支」（H6）。另外本批新增的 `st.stain` 形狀宣稱**完全沒有任何檢查**（M6）。

**2. 綠燈與行為脫鉤**——除了報告已列的 M10（`travel` 的 claim 沒有 `until`），
**還有一條，而且是同一個瞬移餵的**：`anchors` 那一整格（C1，實測逐字相同）。
`fx-contrast` 的 area／ΔE 量的是「與 A 版的差圖面積」，量得到「有東西在那裡」，
量不到「那東西是暗斑還是亮斑」（H3）、也量不到 t1／t2 是不是同一張圖（H6-3）。
`prop-size` 照裁定就是記錄項。
`fxvocab.test.mjs` 量的全部是原始碼字串與登記表，它的 `CONVERTED_MUST` 10→19
是**真的加嚴**（`convertedMoves()` 推導出的 conv 全體都被約束，`CONVERTED_MUST` 只當活性下限）
——這一格查過，沒問題。

**2b. `b3-mutations.mjs`**——錨點逐條查過：**各只出現一次、都不在註解裡、還原走自取備份、
配不到就中止**，這三件沒問題；M11 是合法的對照組，不是被濫用的豁免。
問題在覆蓋面（M6：一條都沒打到本批的語彙宣稱，而且不跑 `fx-contrast`，所以 C2 對它不可見）、
`replace` 只換第一處而沒有唯一性斷言（M6）、`KNOWN_GREEN` 沒有反向警報（L1）。

**3. 語彙違規**——`st.stain` 的形狀本身**沒有**踩圓／方（`LOBE` 16 格 0.58–1.34，
三塊外框合成一個 `ShapeGeometry`，確實不規則；也沒有用 `RingGeometry`／`CircleGeometry`）；
踩到的是**顏色**，讓「暗斑」不成立（H3）。
`hauntLost` 踩到的禁區是「**平滑補間的位移**」兩處（H4-1）。
魂片的 depth／warp 超出 §A4 的區間、且沒有 `ink` 外描邊（H4-3）。
`trail: false` 照做了，沒有跨場拖線；沒有貼桌光環／方陣、沒有垂直光柱、沒有白光球、
沒有「規則形被撕掉一角」——這四條查過，沒問題。

**4. 時間軸**——三拍結構成立（引擎量到 `windup 0.1364`／`travel 1.721`／`react 0.095`，三段皆 ok）；
`COIL`／`JOLT` 的切點與 `st.beat` 的窗**有**對齊（兩者都吃 `yqBeat` 換算出的 `W`／`T0`／`TL`，
整支招沒有任何毫秒字面值——查過，沒問題）。
但 §A2「三件收在同一個衝擊拍」**在 t2 下不成立**（H7：①②在 523.6ms、③在 560ms，差 2.18 幀）。
「出招前一拍完全靜止」在 t1 剩 **60.3ms／3.62 幀**（L2，這一格沒問題）；
react 段的六階在 t1 短於一幀，一半的角度畫不出來（M7）。

**5. 未宣告的副作用**——`V054` 整段移除讓 `tests/tools/traitfx-drive.mjs` 的
`movesMatching` 切點變成死碼（M1），連帶讓 `fx-contrast` 對**四支示範招**在預設路徑上判紅
（C2，直接打到 P3 這一批的閘門）。
`v054CasesFromSource` 恆回 `[]` 這件事報告有寫，但「`movesMatching` 也跟著不切了」沒有寫
——而那才是有後果的那一半。
`CONVERTED_MUST`／`MUST` 10→19 是**加嚴**，不是改變語意（查過，沒問題）。
另外動到別支招的部分：`js/trait-fx.js` 的 `st.groundMark` 白名單改寫只新增 `stain` 分支，
`pillar`／`ring` 兩條路一格未動（查過，沒問題）。

**6. 報告與程式碼脫節**——H1（gates.txt 把 M10 的 2.8844 標成健康態，健康態是 1.721）、
H2（「鏡頭偏移不再替飛行作證」，實測 0.6653→0.7404）、H6（「6 支」應為 4 支）、
M2（§C3 的乙被換成丙，未列入「沒做的事」）、M4（`--count=1` 應為 4）。

---

## 已自行修正（覆審中途由作者的 `43c6c20`／`daf2548` 修掉，不計分，留數字供核對）

| 原 finding | 狀態 |
|---|---|
| `gates.txt`／報告的 `acts=9` 與實測不符 | **我先誤判**：在 `7ab5130` 的 `yinqi.js` 上重跑得到 `acts=9`，與原檔相符；`acts` 是 `43c6c20` 拿掉帽子淡出之後才變 8，`daf2548` 已回填。**撤回** |
| P3 `area 0.9737%` 與實測 1.022% 不符 | 同上成因（拿掉淡出讓凍幀那一格的帽子沒被淡化）；`daf2548` 已回填 1.022%，並在 `gates.txt` 記下三次量測 0.7753→0.9737→1.022。**撤回** |
| 交付樹是髒的（`M js/trait-fx/yinqi.js`，未 commit 的註解修正） | `43c6c20` 已 commit。**已解** |
| 程式碼註解宣稱「收成一跳之後 M10 當場轉紅」，與 `b3-mutations.txt` 相反 | `43c6c20` 已改成「這一改**沒有**讓突變 M10 轉紅」。**已解**（但同一段「讓鏡頭偏移不要替飛行作證」的宣稱仍不成立，見 H2） |

---

## 複核用的指令（全部唯讀，正式碼一行未動）

```
# 隔離樹（fx-contrast 沒有 --root，所以它只能在本樹跑）
mkdir -p scratchpad/advtree/js scratchpad/advtree/tests
cp index.html manifest.webmanifest scratchpad/advtree/
cp -r js/* scratchpad/advtree/js/ ; cp -r tests/tools scratchpad/advtree/tests/tools ; cp -r assets scratchpad/advtree/assets

# C1：M10 之下 anchors 逐字相同
#   把隔離樹的 yinqi.js 裡 `hat.position.lerpVectors(from, to, j);` 換成 `hat.position.copy(from);`
node tests/tools/traitfx-drive.mjs <out.json> --tier=2 --only=hauntLost --root=scratchpad/advtree
#   讀 out.json 的 results[0].verdict.anchors（mainOK/mainD/gap 與健康態逐字相同）

# C2：P3 的工具本身是紅的
node tests/tools/fx-contrast.mjs <out> --only=hauntLost --tier=2 ; echo "EXIT=$?"

# H1：健康態的 travel.moved
node tests/tools/traitfx-drive.mjs <out.json> --tier=2 --only=hauntLost   # phaseDetail travel.moved = 1.721

# H2：鼓弧的貢獻（M12＝飛行與黏著都拿掉）
git show 1c71bf9:js/trait-fx/yinqi.js > scratchpad/advtree/js/trait-fx/yinqi.js   # 套 M12 → 0.6653
#   對 HEAD 版套同樣兩條突變                                                       # 0.7404

# H5：滿編只有一尊在演
node tests/tools/traitfx-drive.mjs <out.json> --tier=2 --only=hauntLost --shots=<dir>
#   讀 <dir>/hauntLost-24.png：標題 `redhatx4`，四尊裡只有一尊離開 idle

# M1：切點死碼
#   複製 movesMatching，切點分別用 indexOf('export const V054') 與 search(/export const V05[45]/)
#   前者 emblem 回 4 支、後者回 []
```

---

## 交件當下的樹況（覆審結束時）

本檔記錄的是 **`daf2548`** 的狀態。交件當下工作樹另有**未 commit** 的改動正在進行中：

```
 M tests/tools/fx-contrast.mjs
 M tests/tools/traitfx-drive.mjs
```

內容是 **C2 的修法**（`movesMatching` 加 `section` 參數，分成 `'moves'`／`'v055'`／`'all'` 三段；
`fx-contrast` 的 `usesEmblem` 兩條路各查各的名單）。其註解另外實測補了一件本檔沒查到的事：
**`--fxvocab=1` 那一條 canary 原本也是壞的**——它查 `c.trait + '_v055'`，
而 `movesMatching` 早就把後綴剝掉了 ⇒ 那一格**恆為 false**（不是恆紅，是恆綠）。
也就是 C2 的同一個成因同時打壞了兩條路：預設路徑恆紅、`--fxvocab=1` 恆綠。
作者的註解也記著這條紅不只打到 `hauntLost`，`eliteSelfCut` 同樣中。

**這份修法要驗收的兩件（可機械判定）**
1. `node tests/tools/fx-contrast.mjs <out> --only=hauntLost --tier=2 ; echo $?` → ` ok ` 且 exit 0；
   `--only=eliteSelfCut` 同樣。
2. `--fxvocab=1` 那一條要**驗得回紅**：把 `V055` 段的 `st.icon` 拿掉，
   `fx-contrast --only=hauntLost --tier=2 --fxvocab=1` 必須 exit 1
   ——改前恆為 false ⇒ 這條突變本來不會紅；**沒驗這一條就只修了看得見的那一半**。

**C1 在這份未 commit 的改動裡沒有被碰到，仍然成立。**
