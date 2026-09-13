# 招式演出卷・陰氣系批 3 — 階段 A（新積木 `st.stain` ＋範本招魔神仔紅帽）

> 讀者：製作人與接手的 agent。
> 計畫＝`docs/proposals/2026-09-12-plan-fx-performance.md`（§3–§5 手段與閘門、§7 全部裁定、
> §7.3／§7.4 前兩批的狀態）。語彙＝`docs/design/2026-09-12-fx-vocab-draft.md`
> （§A 通則含 §A9 身分可辨與 §A9-5 落點 anchor、§B3 陰氣、§C3 第 1 列）＋`docs/design/ART_BIBLE.md`
> §3／§10.2／§10.3／§10.7。前兩批＝`2026-09-13-xianghuo-b1-report.md`／`2026-09-13-zuling-b2-report.md`。
>
> **worktree `C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a7cde5f94bae38220`
> （分支 `worktree-agent-a7cde5f94bae38220`），基準＝main `ea2a38f`（v0.55.8，祖靈批階段 B）。
> 未合併、未 push。`index.html` 一行未動、版號未上。**

---

## 1. 階段 A

### 1.0 一句話

陰氣批的兩件前置一次做完：**新積木 `st.stain`**（三個新積木的最後一個，語彙檔 §A8）
＋**範本招魔神仔紅帽 `hauntLost` 轉正**（Q1 指定的陰氣範本，現況全系最差的一支）。
`hauntLost` 轉正之後，三個系別檔裡**再也沒有任何 `V054` 退路**——四支示範招全部走正式演出。
P0–P8 除 P4（盲讀，照裁定要等陰氣 9 支鋪完與香火＋祖靈一起重跑）之外全綠。

### 1.1 新積木 `st.stain(pos, o)`（`js/trait-fx.js:1826`）

| 要求（語彙檔 §A8／§B3／ART_BIBLE §10.1） | 做法 |
|---|---|
| **邊緣不規則** | 半徑輪廓寫死成一張 16 格的表（`LOBE`，0.58–1.34 的倍率）。1.34／1.26／1.12 那三處是往外拖的那幾道（「末端下垂」在平面上的樣子）、0.58／0.61／0.63 是凹口。規整圓的倍率表是「全部 1.00」，這張表刻意不是 |
| **不是圓與方** | 不用 `RingGeometry`／`CircleGeometry`（`ring`／`disc` 已由 `DEPRECATED` 限縮給香火的「陣」）。主斑＋兩塊偏心小斑三塊外框合成**一個** `ShapeGeometry`（吃 shape 陣列）⇒ 不論幾塊都只多一個 draw call |
| **`ink` 外描邊** | 同一張表往內縮一個定寬（`w` 0.052）再合成第二個 `ShapeGeometry`；露出來的那一圈就是描邊。描邊在下、本體在上（`MAT_SOLID` 的 `depthWrite:false`，靠加入順序決定先後） |
| **貼桌** | `rotation.x = -π/2`、`y = TFX.tableY + 0.005`；`rotation.z` 給編舞轉方向（Euler XYZ ⇒ 先轉 z 再躺平） |
| **不越 bloom** | 本體預設色取 `line`（苔綠 `#6fae90`，相對亮度 **0.58**）而不是 `key`（冷屍白青 `#bdf0dc`，**0.88**）。`BLOOM.threshold` 是 0.7 ⇒ `key` 越得過去、`line` 越不過去。語彙要的是「暗**斑**」，而 `key` 在桌面 `#6b3418`（0.24）上是亮斑 |
| **材質模板常駐預熱** | 兩層都走 `MAT_SOLID.clone()`，與現有三支模板共用 program。實測 `prog+0`（六跑逐套），`fx-contrast` 的 `mat_programs` 仍是 `templates 3／measured 3／distinct 2` |
| **接進身分可辨** | `st.groundMark`（`:1876`）的分派表新增 `stain` 分支（`:1911`）：暗斑是**平的**，本體遮不掉它的前半（柱要立起來才需要挪 0.34），所以往鏡頭只挪 `push` 0.14–0.18。亮滅仍由積木自己排：`windup` 淡入、`travel` 末（＝`react[0]`＝衝擊拍）歸零，**不回傳 mesh**（覆審 M1 那一條照舊） |

**`st.groundMark` 原本那條「`stain` 還沒有積木就 throw」換成白名單**：
`FAC_GROUND` 之後再加新語彙、卻沒有對應積木時仍然當場 throw（不給靜默退路）。

### 1.2 範本招：魔神仔紅帽 `hauntLost`（`js/trait-fx/yinqi.js:153`）

| 三件 | 做法 |
|---|---|
| **本體動作＝探** | `HatRoot`／`Hat1`／`HatTip` 帽尖後仰（`COIL` 兩跳到底）→ **完全靜止一拍** → 猛前點（`JOLT` 三個離散位移），`JawRoot`／`Jaw1`／`JawTip` 張口、`Mist*` 霧裾滯後外散。骨骼幅度沿用 0.54，時間軸整支重排到 §A1 的三拍窗上 |
| **道具＝甲 人身遺物** | **紅帽**（`st.paperStamp`，面板 `hot #ff2f3a`＝§B3「那一點刺眼的紅」，`ink` 近黑本體露出來的那一圈就是外描邊）從施招者**頭上飄起**（§10.2 第 6 條：GLB 上那頂常駐的帽子不算新增元素），**卡頓跳到受招方頭上戴住**（`st.stick` at `top`）；＋丙 鬼火與魂片：衝擊拍從被迷那尊**胸口**散出的 4 片魂片（`st.paperProps`，冷屍白青，1 個 draw call） |
| **受招方反應＝轉** | `st.spin` 原地打轉，**六個離散角度**（`TURN` 表），階與階之間一動都不動；＋迷途晃（`SWAY` 表）——只有 spin 不算反應，`PHASE_GATE.react` 量的是 `move`／`scale` delta。兩張表都以 0 收尾，收勢不另排一段 |
| **身分可辨** | 施招姿態＝**前傾**（fore）≠ react「轉」（spin）；腳下＝**不規則暗斑**（`st.groundMark` → `st.stain`，`r 0.46`／`peak 0.70`／`push 0.18`），蓄勢亮、衝擊拍熄 |
| **拖線** | **無**（`trail: false`）——§A9-3 的拖尾只給打擊類，而本招是詛咒削弱。「中間看不到飛行物」那個病由帽子**本身**的位移修，不是再拉一條白線（那是 27 支裡最泛濫的語彙） |

**三個共用零件**（`yinqi.js:10`／`:21`／`:26`，各系一支小零件，比照 `zlBeat`／`xhBeat`）：

- `yqBeat(st, frac)`：三拍窗換算，`LAST = st.ms × 0.90`（§A5 建議值，0.88→0.90，多出來的 2% 給衝擊拍）。
- `JOLT(e)`：**卡頓三段跳**。切點刻意不是均分（0.34／0.86）——均分成 1/3 的話道具在 travel 的
  2/3 就到位了，§A2「三件收在同一個衝擊拍」就散掉。
- `COIL(e)`：**蓄勢的卡頓＋出招前一拍完全靜止**。`e ≥ 0.42` 之後回傳值不再變 ⇒ tween 還在跑、
  畫面上一動都不動。★不另排一段空 tween★：靜止那一拍是本系的辨識元素，寫在同一條進度函式裡，
  編舞就給不出兩份時間軸（同 `st.groundMark` 亮滅由積木自己排那一條）。

**落點 anchor＝`foe`（`js/trait-fx/vocab.js:346`）**。依據：`ABILITIES.hauntLost` 是
「三拍：**對面 1 隊**不出手（對精英無效）」（`index.html:2055`，`lost:true`）⇒
**效果＝詛咒削弱、對象＝敵方單一**（一「隊」＝一張卡的部隊；P4 治具棚與近景材料裡每一隊 `count=1`，
所以畫面上就是一尊）。所以帽子只有**一頂**、只戴到**一尊**頭上，而且挑的是 `st.spotRoom` 最大的
那一尊（落在兩尊中間就是 §A9-5 的 `attr` 判紅的那種「分不出是誰的」）；`lost:true` 的
「對精英無效」也照演——編舞先把 `body === 'elite'` 的排掉。
**本階段一格真值表都沒有動**（P4 照裁定要等陰氣 9 支鋪完），上面這一段是**提案**，交製作人在陰氣批
P4 真值表時裁；`alt` 建議收「敵方多個」（滿編對決裡一隊是 2–4 尊，讀者會數尊數）。

**0.55 徽記版原地保留**：`yinqi.js:955` `export const V055`（`hauntLost_v055`，本體逐字取自
v0.55.8 的 `MOVES.hauntLost`，只改函式名那一行）＋`:1070` `V055_SHORT`。
**0.54 退路（`V054`／`V054_SHORT`）連同轉正一起移除**（同前兩批的作法）。
★這一步讓三個系別檔的 `V054` 全部消失★：`V054_FULL`／`V054_SHORT` 現在恆為空物件，
`traitfx-drive` 的 `v054CasesFromSource` 恆回 `[]`。機制留著給下一卷，三處相關註解已同步更正
（`js/trait-fx.js:61`、`tests/fxvocab.test.mjs:234`／`:256`、`tests/tools/traitfx-drive.mjs:352`）。

### 1.3 P0–P8 逐條（全部實跑，指令原文與原始 stdout 在 `…-b3-evidence/gates.txt`）

| 閘門 | 指令 | 結果 |
|---|---|---|
| **P0 等價** | `node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html`（`git show ea2a38f:index.html`） | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}` ✅ |
| **P1 登記表** | `node tests/fxvocab.test.mjs` | **28 綠／0 紅**（`MOVE_SPEC.hauntLost` 補 `stance`／`anchor` 兩欄之後，§A9 ①⑥⑦⑧與裁定①那幾條都把它納進來了）✅ |
| **P2 phase gate** | `traitfx-drive --tier=1／2／3`、`--fxvocab=1` t1／t2、`--count=2`／`--count=3` | **27/27**／**30/30**／**3/3**／**27/27**／**30/30**／**30/30**／**30/30**，`phasesOK` 全 true ✅ |
| **P3 對比** | `fx-contrast --only=hauntLost --tier=2／1` ＋ `fx-contrast-metrics.py`（844×390@2x、bloom 0.7、seed 7） | t2／t1 皆 **area 0.9737%**（門檻 0.8）／**ΔE 中位 35.66**（門檻 28）✅ ——**第一次量是 0.7753% 紅**，修法見 §1.6 |
| **P4 盲讀** | — | **不在本階段**（裁定：陰氣 9 支鋪完再與香火＋祖靈一起重跑新的三輪） |
| **P5 短版合身** | `traitfx-drive --tier=1` | 27/27，`hauntLost` `rate=1`／`fill=0.9`／`msOK=true` ✅ |
| **P6 短版下限** | 同上的 `actionsOK` | `hauntLost` acts=**9**（≥2）✅ |
| **P7 效能** | `duel-perf perf --seed=7`（本樹 ／ 基準樹 `ea2a38f` 的 `git archive` 樹） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16=16；errors 0 ✅ |
| **P8 零錯＋規則測試** | `duel-drive --seed=7`／`--seed=3` 各 4 場 ＋ 12 套規則測試 | errors **0／0**（`ver v0.55.8`）；12 套 **8／5／7／9／14／28／32／8／16／28／32／36 全綠** ✅ |
| **A6 draw call** | `proto-record --trait=hauntLost --tier=2 --step=6` | `idleCalls 256` → `peakCalls 267` ＝ **+11**（預算 ≤ idle+25）；`peakTris 65,384`、`programs 22`、`errors 0` ✅ |

**anchor 逐支**（`--tier=2`，`spec=foe`）：

| 跑法 | n | land | bad | skip | miss | mainOK | mainD | cover | gap |
|---|---|---|---|---|---|---|---|---|---|
| `--count=1`（預設治具棚） | 2 | 2 | 0 | 0 | 0 | true | 0 | 0/0 | 2.053／1.915 |
| `--count=2` | 2 | 2 | 0 | 0 | 0 | true | 0 | 0/0 | 2.077／1.913 |
| `--count=3` | 2 | 2 | 0 | 0 | 0 | true | 0 | 0/0 | 1.460／1.287 |

`gap` 是「到敵方那一側的最短距離 vs 到我方那一側」的餘裕（門檻 `ANCHOR_MARGIN` 0.18）。
`cover 0/0` 是 `foe` 這一格**照設計不要求逐尊覆蓋**（§A9-5 的已知未涵蓋，見 §1.4 第 1 點）。

**`stanceOK` 明細**（`--tier=2`）：
`{"kind":"前傾","peak":0.26,"ground":"stain","onTarget":false,"extra":0,"minPeak":0.12,
"casterMatch":true,"groundSame":true,"peakAt":133,"windupOK":true,"lateStart":false,
"windupEnd":300,"windupSlack":16.7,"reactAt":560}`；tier 1 的 `peakAt` 是 50（對 `reactAt` 208）。

**§A3 尺寸記錄（Q5，記錄項不擋批）**——`…-b3-evidence/prop-size/`：

| tier | figH | 件 | 峰值 | ratio | 中位 | ratio50 | 判 |
|---|---|---|---|---|---|---|---|
| 2 | 1.1315 | `emblem:hat`（紅帽） | 0.8811 | **0.779** | 0.8054 | 0.712 | **OVER**（參考線 0.667） |
| 2 | 1.1315 | `prop:hat`（魂片，單件） | 0.300 | 0.265 | — | — | ✅ |
| 2 | 1.1315 | `floor:stain`（腳下暗斑） | 1.5844 | 1.400 | — | — | 腳下語彙，不在這條規則範圍 |
| 1 | 1.1312 | `emblem:hat` | 0.8811 | 0.779 | 0.8278 | 0.732 | **OVER** |

★這一列超標的**結構性理由**（交製作人裁，§1.7 第 1 題）★：`redhat` 是全 27 支裡**最矮的施招者**
（`figH` **1.13**，對照獻祭刀的 `xianji` 2.24、破軍旗的 `pojun` 1.12–1.16）。
「≤ 施招本體高 2/3」這條線假設道具的尺度掛在**身高**上，而一頂**戴在頭上**的帽子，尺度掛的是**頭**。
本階段已經把倍率從 0.95 收到 0.88（ratio 0.841 → 0.779）——再收下去 P3 的 area 就掉回門檻以下
（那是**凍結的**門檻，不能動）。兩條線在這一支上互相拉扯，照實記錄、不自行放寬任何一邊。

### 1.4 我沒有做的事（照實列）

1. **`sampleAnchors`／anchor 判定一行未動**（派工書指名：另一個分支在修）。`tests/tools/README.md`
   檔尾登記的 **R-1**（follow 印記分支不做在場檢查）與 **R-2**（`foe` 整格豁免逐尊覆蓋）兩條
   「排入陰氣批」的待辦**本階段沒有處理**。★R-2 正好打在這一支身上★：`hauntLost` 的 spec 是 `foe`，
   所以它的 `cover` 恆為 `0/0`、`coverOK` 恆真——這一格的證據完全由 `mainOK`（主道具真的貼到敵方那一側，
   實測 `d=0`、`gap` 1.3–2.1）承擔。
2. **真值表、`PHASE_GATE`、`TRAIT_MS_BY_TIER`、seed、視口、門檻一格未動**；`index.html` 零 diff
   （P0 逐位元組相等）；其他 8 支陰氣招一行未動。
3. **P4 盲讀沒跑**（裁定：陰氣 9 支鋪完再與香火＋祖靈一起重跑新的三輪）。

### 1.5 鑑別力（`02 §6.1`）

腳本＝`…-b3-evidence/b3-mutations.mjs`、輸出＝`b3-mutations.txt`。**12 條，驗紅 10 條**；
每一條都是「健康態綠 → 改壞 → 紅 → 用**改壞前的自取備份**還原 → 再綠」，三個狀態都實跑，
而且**字串配不到就整支中止**（祖靈批踩過的坑：`String.replace` 靜默沒配到，整批變成「全綠」的儀式）。

| # | 改壞什麼 | 閘門 | 結果 |
|---|---|---|---|
| M1 | `MOVE_SPEC.hauntLost` 拿掉 `stance` | P1 | ✅ 紅 |
| M2 | 拿掉 `anchor` | P1 | ✅ 紅 |
| M3 | 編舞拿掉 `st.groundMark` | P1 | ✅ 紅 |
| M4 | 編舞拿掉 `st.stance` | P1 | ✅ 紅 |
| M5 | 主道具不標 `main: true` | `traitfx-drive` | ✅ 紅（`mainDeclared=false`） |
| M6 | `anchor` 改宣告 `caster`（帽子戴到對手頭上卻說落在自己身上） | drive | ✅ 紅 |
| M7 | 衝擊拍把主道具 `st.alpha(hat, 0)` 藏起來 | drive | ✅ 紅（在場五條的第 4 條） |
| M8 | 腳下語彙點到**受招方**腳下 | drive | ✅ 紅（`st.groundMark` 當場 throw） |
| M9 | 受招方只 `spin` 不 `move` | drive | ✅ 紅（`react` 量的是 `move`／`scale`） |
| **M10** | **帽子原地生成、完全不飛** | drive | ❌ **沒有紅**（歸因見下） |
| M11 | 只拿掉衝擊拍那一行黏著（飛行還在） | drive | ❌ 照設計本來就不該紅（對照組） |
| M12 | M10 ＋ M11 一起上 | drive | ✅ 紅（`travel moved 0.7404 < need 1.2533`） |

★**M10 的歸因（隔離實驗，不是推論）**★：
`st.phase('travel')` 的 claim **沒有時間上限**——`js/trait-fx.js` 的 `phase()` 對 `windup`／`react`
都設了 `c.until`，只有 `travel` 留 `Infinity`。於是衝擊拍那一刻 `st.stick` 把帽子**瞬移**到受招方
頭上的那一段，回頭補上了 `travel` 的分子：M10 實測 `moved 2.8844`（門檻 1.2533），
拿掉黏著之後只剩 **0.7404**（＝鏡頭鼓弧那一段）⇒ 紅。
**這是引擎層的性質、19 支已轉正的招共用**（`zlDeliver`／`xhDeliver` 的每一枚印記都走同一條），
本階段**不動它**（派工書指名不碰 anchor／引擎判定）。要修的方向有兩個，交製作人裁（§1.7 第 3 題）：
① 給 `travel` 的 claim 一個 `until`（＝`react[0]`）② `st.stick` 的首次瞬移不計進 `travel` 的分子。
**在修好之前，「帽子真的飛過去」這件事的證據是 sheet 那六格**（第 1／3／5 格三個不同位置），
不是 `phasesOK` 的那一格——照實寫在這裡，不當它是綠的。

本階段**同時收斂了一件**（不是為了讓突變變紅，是為了讓鏡頭偏移不再替飛行作證）：
飛行途中的鏡頭鼓弧由 `sin(π·j)` 的**連續弧**改成**只掛在中間那一跳**（`n === 1`）。
第一跳與最後一跳完全沒有偏移；L3 的凍幀點就是中間那一跳，**P3 的面積一個像素都沒少**
（改前 0.9737%／改後 0.9737%）。順帶它也更合 §B3——連續的弧本來就是「平滑補間」，陰氣的禁區。

**另外兩格照實列的「這一支上恆真」**（`02 §6.1` 第 6 條）：

1. **§A9-2「施招姿態與反應不得同型」對 `hauntLost` 恆真**：`REACT_AXIS['轉'] = 'spin'`，
   而 `STANCE_VOCAB` 三型的 `axis` 是 `fore`／`up`／`down`——**沒有任何一型是 `spin`** ⇒
   這一支不論填哪一型都通過。陰氣另外兩個反應 `抖`（shake）也一樣；只有 `被拖`（fore）與
   `壓`（down）會真的撞到。**這不是本階段打開的洞**（表是祖靈批訂的），但它是陰氣 9 支裡
   6 支的狀態，鋪階段 B 之前應該知道。
2. **`foe` 那一格不要求逐尊覆蓋**（§A9-5 的已知未涵蓋，`tests/tools/README.md` 的 R-2）：
   `cover` 恆為 `0/0`。這一格的證據由 `mainOK` 承擔（實測 `d=0`、`gap` 1.29–2.08）。

### 1.6 視覺自評（`threejs-visual-loop`，每一輪都是「拍 → 用 Read 打開圖看 → 改」）

- **第 1 輪**（魂片 `k 0.62` 生在頭頂、暗斑 `peak 0.92`、帽子 `R0+0.6RL` 起淡出）看出三件：
  ① **魂片整片蓋住紅帽**——sheet 第 6 格（react 末）看不到「戴著帽子」，而「戴住」正是這一招的身分；
  ② 單片 0.62 在 780×360 上只有幾個像素寬，讀起來是盲讀抱怨過的「**白色細點**」，不是紙片；
  ③ 暗斑 `peak 0.92` 太亮，像一灘新漆不像水漬。
- **第 2 輪**：魂片改從**胸口**散出、單片放大到 1.0／`ratio 0.66`／4 片；暗斑 `peak 0.70`；
  帽子的淡出改 `R0+0.84RL` 起（活過 react 末那一格）。六格逐格讀得出：
  暗斑亮起＋帽子從他頭上浮出 → 帽尖後仰、靜止 → 帽子卡頓跳到半空（往鏡頭鼓一下） →
  跳到對手頭上 → 衝擊拍：戴上＋火星＋魂片散出＋暗斑熄 → 對手打轉、帽子還戴著。
- **第 3 輪**（P3 那一次）：道具倍率 0.95→0.88、鼓弧收成一跳之後重拍三張，讀法不變。

**驗收清單對照**
- ✅ 出招瞬間有**新增元素**（GLB 上那頂常駐的帽子不算——另外飄一頂出來，§10.2 第 6 條）
- ✅ 道具是實體紙紮（厚度 0.22＋墨線邊＋翹曲 0.16），不是平面 billboard
- ✅ 「那一點刺眼的紅」**只落在帽子上**（全招其餘只有冷屍白青、苔綠、近黑）
- ✅ 三件收在同一個 `react[0]`（帽子扣上頭＝魂片散出＝那一尊同幀開始打轉）
- ✅ 沒有任何跨場拖線；沒有白光球、沒有貼桌圓環、沒有垂直光柱（三系禁區各自守住）
- ✅ 卡頓：`COIL` 兩跳＋靜止一拍、`JOLT` 三跳、受招方六個離散角度——整支沒有平滑補間的位移
- ❌ **施招者在 2v2 治具棚裡被同伴擋住**：`--mate=auto` 給陰氣 `haunt` 配的同伴是
  `nail:elite`（虎姑婆指甲），體型大很多又站在前面，`redhat` 只露出一小角。
  施招者的訊號因此只剩「腳下暗斑」與「帽子從那個方向浮起來」兩件，**本體的「探」看不到**。
  這是**材料規格**造成的（`MATE_BY_FAC.yinqi.haunt = 'nail:elite'`，祖靈批第 2 輪 P4 訂的），
  不是編舞改得掉的——交製作人裁（§1.7 第 2 題）。
- ❌ **滿編真實對決那一張沒抓到**：見 §1.8 交付物那一列。

**效能**：桌機 `duel-perf` fps 59.9、draw call 986（visible 16）；招式峰值 **+11** draw call。
**手機真機 fps 待試玩**（這是桌機數字）。

### 1.7 我看到還粗的地方 / 交製作人裁

1. **紅帽的 §A3 ratio 0.779 超過 2/3 的參考線**（記錄項不擋批）。結構成因：`redhat` 的
   `figH` 只有 **1.13**，是全 27 支裡最矮的施招者之一，而一頂**戴在頭上**的帽子，尺度掛的是頭不是身高。
   再往下收，P3 的 area（**凍結**門檻 0.8%）就過不了。➡️ **建議**：接受並記錄，
   同時把 §A3 那一條的量法改成「≤ 施招本體高 2/3 **或** ≤ 受招方頭部尺度的合理倍數」——
   要改是改語彙檔，本階段不自行動。
2. **2v2 材料裡陰氣的同伴是 `nail:elite`（虎姑婆指甲）**，體型比 `redhat` 大得多、站在前面，
   把施招者整個擋住。➡️ **建議**：陰氣批的 P4 材料把 `MATE_BY_FAC.yinqi.haunt` 換成體型相近的
   同系模型（例如 `raincoat:haunt` 以外的 `chair`／`buoy` 那一類），**或**把 `--mateGap` 再拉大。
   這是材料規格，P4 的三題與真值一格不動。
3. **`travel` 的 claim 沒有時間上限**（§1.5 的 M10）。➡️ **建議**：給 `travel` 一個
   `c.until = react[0]`，或讓 `st.stick` 的首次瞬移不計進分子。**這會動到 19 支已轉正的招**，
   所以不塞進本階段——請裁要不要另開一個小卷。
4. **陰氣的 `轉`／`抖` 兩個反應讓「不同型」那條檢查恆真**（§1.5）。➡️ **建議**：
   在 `STANCE_VOCAB` 裡補一型 `axis: 'spin'` 的施招姿態（例如「擰身」），這條才有咬合；
   或明文寫「`spin`／`shake` 這兩軸不參與不同型檢查」，讓它由條文而不是由巧合成立。
5. **`hauntLost` 的 P4 真值提案**（§1.2）：效果＝**詛咒削弱**、對象＝**敵方單一**、
   `alt` 收「敵方多個」。本階段**一格真值表都沒有動**，請在陰氣批 P4 真值表時一起裁。

### 1.8 交付物

| 檔 | 內容 |
|---|---|
| `…-b3-evidence/hauntLost/sheet-t1.png` | 6 幀連拍，t1＝300ms（844×390@2x、每格 780×360、2v2、`--mateGap=1.9 --mate=auto`） |
| `…/hauntLost/sheet-t2.png` | 6 幀連拍，t2＝900ms（同上） |
| `…/hauntLost/sheet-t2-closeup.png` | t2 近景（`--camdist=2.4`） |
| `…/hauntLost/real-seed*-{lineup,attack,burn}.png` | **真實對決**的三張（列陣／攻擊／燒毀） |
| `…/p3-t1/`、`…/p3-t2/` | P3 的 A／B 凍幀、`shots.json`、`metrics.txt` |
| `…/prop-size/` | Q5 尺寸記錄表（t1／t2 的 tsv＋json） |
| `…/rec-t2/` | `proto-record` 的 draw call／三角形記錄 |
| `…/b3-mutations.mjs`、`…/b3-mutations.txt` | 12 條突變的腳本與逐條驗紅輸出 |
| `…/gates.txt` | P0／P2／P3／P7／P8／A6 的**指令原文與原始 stdout** |

★**真實對決的「衝擊拍」那一張沒抓到**★：`duel-drive --traitshot=hauntLost` 在 seed
**3／5／11／2**（每次 20–25 場）都沒有截到——`redhat` 有進陣（seed 3 的 20 場裡出現 16 次），
但那幾場沒有派出 `ys:fx-trait trId=hauntLost` 的事件。交付的是同一批跑出來的列陣／攻擊／燒毀三張。
**照實記：這一格沒有做到**，不是「差不多」。

### 1.9 範圍（`git diff --stat ea2a38f..`，逐檔對應）

| 檔 | 改了什麼 | 對應哪條需求 |
|---|---|---|
| `js/trait-fx.js` | 新增 `st.stain`（`:1826`）＋`st.groundMark` 的 `stain` 分派與白名單 throw（`:1876`／`:1911`）；檔頭 `V054` 那段註解更正 | 派工 1（新積木） |
| `js/trait-fx/yinqi.js` | 共用零件 `yqBeat`／`JOLT`／`COIL`（`:10`／`:21`／`:26`）；`hauntLost` 轉正（`:153`）；0.55 徽記版搬 `V055`／`V055_SHORT`（`:955`／`:1070`）；`V054` 兩段移除 | 派工 2（範本招） |
| `js/trait-fx/vocab.js` | `MOVE_SPEC.hauntLost` 補 `stance`／`anchor`（`:346`）；`FAC_GROUND` 註解更正（`:245`） | 派工 2（P1 機械檢查） |
| `tests/fxvocab.test.mjs` | `CONVERTED_MUST` 活性下限 10→**19** 支；兩處 `V054` 註解更正 | 治具（加嚴，不是放寬） |
| `tests/tools/traitfx-drive.mjs` | `phaseCasesFromSource` 的 `MUST` 10→**19** 支；一處 `V054` 註解更正 | 同上 |
| `docs/experiments/2026-09-13-yinqi-b3-*` | 報告、證據、突變腳本 | 派工 4 |

**`index.html` 零 diff**（P0 逐位元組相等）；門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／
真值表／其他 8 支陰氣招／`sampleAnchors` 與 anchor 判定**一行未動**。

### 1.10 下一步

1. 製作人看 `sheet-t1／t2／t2-closeup` 三張 → 簽字（§1.7 的 1／2／4／5 四題要裁）。
2. 簽字後開**階段 B**：鋪陰氣其餘 8 支（`hauntSteal`／`hauntSee`／`hauntDread1`／`hauntSwap`／
   `eliteVsSwarm`／`swarmPierce`／`hauntFearX2`／`swarmFeed1`），照語彙檔 §C3 與 §B3，
   每支 P0–P3／P5–P8 ＋ sheet；`eliteVsSwarm` 是**盲讀標竿、動作與節拍一格不動**（§C3 明寫）。
3. 27 支全部鋪完之後統一交 P4（香火 9 ＋ 祖靈 9 ＋ 陰氣 9 的新三輪）。
