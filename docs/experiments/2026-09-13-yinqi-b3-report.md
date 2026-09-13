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
