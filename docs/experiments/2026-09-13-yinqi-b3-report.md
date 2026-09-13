# 招式演出卷・陰氣系批 3 — 階段 A（新積木 `st.stain` ＋範本招魔神仔紅帽）

> 讀者：製作人與接手的 agent。
> 計畫＝`docs/proposals/2026-09-12-plan-fx-performance.md`（§3–§5 手段與閘門、§7 全部裁定、
> §7.3／§7.4 前兩批的狀態）。語彙＝`docs/design/2026-09-12-fx-vocab-draft.md`
> （§A 通則含 §A9 身分可辨與 §A9-5 落點 anchor、§B3 陰氣、§C3 第 1 列）＋`docs/design/ART_BIBLE.md`
> §3／§10.2／§10.3／§10.7。前兩批＝`2026-09-13-xianghuo-b1-report.md`／`2026-09-13-zuling-b2-report.md`。
>
> **worktree `C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a7cde5f94bae38220`
> （分支 `worktree-agent-a7cde5f94bae38220`），起始基準＝main `ea2a38f`（v0.55.8，祖靈批階段 B）。
> **2026-09-13 已把 main 併進來並全套重驗——見 §3**（併入的是 main 當下的頂 `0d34fa5`，
> 其中 `8a242b0` 是 v0.55.9 祖靈批收尾那一筆，`0d34fa5` 是它上面的進度表文件）。
> 未合併、未 push。`index.html` 一行未動、版號未上。**
>
> **對抗式覆審已跑並修補完畢**（fresh `opus` 冷讀 diff，清單＝`…-b3-evidence/adv-review.md`，
> 2 CRITICAL／7 HIGH／9 MEDIUM／5 LOW）。修補與逐條三態見 **§2**；
> §1 的數字**全部是修補後在最終 SHA 上重跑的**。

---

## 1. 階段 A

### 1.0 一句話

陰氣批的兩件前置一次做完：**新積木 `st.stain`**（三個新積木的最後一個，語彙檔 §A8）
＋**範本招魔神仔紅帽 `hauntLost` 轉正**（Q1 指定的陰氣範本，現況全系最差的一支）。
`hauntLost` 轉正之後，三個系別檔裡**再也沒有任何 `V054` 退路**——四支示範招全部走正式演出。
P0–P8 除 P4（盲讀，照裁定要等陰氣 9 支鋪完與香火＋祖靈一起重跑）之外全綠。

### 1.1 新積木 `st.stain(pos, o)`（`js/trait-fx.js:1830`）

| 要求（語彙檔 §A8／§B3／ART_BIBLE §10.1） | 做法 |
|---|---|
| **邊緣不規則** | 半徑輪廓寫死成一張 16 格的表（`LOBE`，0.58–1.34 的倍率）。1.34／1.26／1.12 那三處是往外拖的那幾道（「末端下垂」在平面上的樣子）、0.58／0.61／0.63 是凹口。規整圓的倍率表是「全部 1.00」，這張表刻意不是 |
| **不是圓與方** | 不用 `RingGeometry`／`CircleGeometry`（`ring`／`disc` 已由 `DEPRECATED` 限縮給香火的「陣」）。主斑＋兩塊偏心小斑三塊外框合成**一個** `ShapeGeometry`（吃 shape 陣列）⇒ 不論幾塊都只多一個 draw call |
| **`ink` 外描邊** | 同一張表往內縮一個定寬（`w` 0.052）再合成第二個 `ShapeGeometry`；露出來的那一圈就是描邊。描邊在下、本體在上（`MAT_SOLID` 的 `depthWrite:false`，靠加入順序決定先後） |
| **貼桌** | `rotation.x = -π/2`、`y = TFX.tableY + 0.005`；`rotation.z` 給編舞轉方向（Euler XYZ ⇒ 先轉 z 再躺平） |
| **是「暗」斑（覆審 H3 改）** | 本體 `ink #04120c`（sRGB 相對亮度 Y≈**0.0077**）、描邊 `line` 苔綠。★第一版本體用 `line` 是錯的★：理由只比了「`line` < `key` < bloom 門檻」，但 `#6fae90` 的 Y≈**0.353**對桌面 `#6b3418` 的 Y≈**0.057** 是**比桌面亮 3.8 倍的亮斑**——那不是語彙要的暗斑。現在有機械斷言釘住（`tests/fxvocab.test.mjs`：`stain` 系別的本體色相對亮度必須低於 `scene-env.js` 的 `TABLE_COLOR`），突變 M14 驗紅。兩層都遠低於 `BLOOM.threshold` 0.7 |
| **材質模板常駐預熱** | 兩層都走 `MAT_SOLID.clone()`，與現有三支模板共用 program。實測 `prog+0`（六跑逐套），`fx-contrast` 的 `mat_programs` 仍是 `templates 3／measured 3／distinct 2` |
| **接進身分可辨** | `st.groundMark`（`:1880`）的分派表新增 `stain` 分支（`:1915`）：暗斑是**平的**，本體遮不掉它的前半（柱要立起來才需要挪 0.34），所以往鏡頭只挪 `push` 0.14–0.18。亮滅仍由積木自己排：`windup` 淡入、`travel` 末（＝`react[0]`＝衝擊拍）歸零，**不回傳 mesh**（覆審 M1 那一條照舊） |

**`st.groundMark` 原本那條「`stain` 還沒有積木就 throw」換成白名單**：
`FAC_GROUND` 之後再加新語彙、卻沒有對應積木時仍然當場 throw（不給靜默退路）。

### 1.2 範本招：魔神仔紅帽 `hauntLost`（`js/trait-fx/yinqi.js:156`）

| 三件 | 做法 |
|---|---|
| **本體動作＝探** | `HatRoot`／`Hat1`／`HatTip` 帽尖後仰（`COIL` 兩跳到底）→ **完全靜止一拍** → 猛前點（`JOLT` 三個離散位移，**第三階寫在 tween 的 `done()` 裡＝落在衝擊拍當幀**），`JawRoot`／`Jaw1`／`JawTip` 張口、`Mist*` 霧裾滯後外散。骨骼幅度沿用 0.54，時間軸整支重排到 §A1 的三拍窗上。★四尊一起演★（`redhat` 是 `count: 4`）：`point()`／`st.rim()` 走 `ghosts.forEach`，同伴幅度乘 0.82；**姿態與腳下光只給施招者**（多一份就 throw）|
| **道具＝甲 人身遺物** | **紅帽**（`st.paperStamp`，面板 `hot #ff2f3a`＝§B3「那一點刺眼的紅」，`ink` 近黑本體露出來的那一圈就是外描邊）從施招者**頭上飄起**（§10.2 第 6 條：GLB 上那頂常駐的帽子不算新增元素），**卡頓跳到受招方頭上戴住**（`st.stick` at `top`）；＋丙 鬼火與魂片：衝擊拍從被迷那尊**胸口**散出的 4 片魂片（`st.paperProps`，冷屍白青，1 個 draw call，`depth 0.18`／`warp 0.16` ＝ §A4 第 1／3 條的區間內；散開也是三階、不用 easing）|
| **受招方反應＝轉** | `st.spin` 原地打轉，**六個離散角度**（`TURN` 表），階與階之間一動都不動；＋迷途晃（`SWAY` 表）——只有 spin 不算反應，`PHASE_GATE.react` 量的是 `move`／`scale` delta。兩張表都以 0 收尾，收勢不另排一段 |
| **身分可辨** | 施招姿態＝**前傾**（fore）≠ react「轉」（spin）；腳下＝**不規則暗斑**（`st.groundMark` → `st.stain`，`r 0.46`／`peak 0.70`／`push 0.18`），蓄勢亮、衝擊拍熄 |
| **拖線** | **無**（`trail: false`）——§A9-3 的拖尾只給打擊類，而本招是詛咒削弱。「中間看不到飛行物」那個病由帽子**本身**的位移修，不是再拉一條白線（那是 27 支裡最泛濫的語彙） |

**三個共用零件**（`yinqi.js:10`／`:24`／`:29`，各系一支小零件，比照 `zlBeat`／`xhBeat`）：

- `yqBeat(st, frac)`：三拍窗換算，`LAST = st.ms × 0.90`（§A5 建議值，0.88→0.90，多出來的 2% 給衝擊拍）。
- `JOLT`：**卡頓三段跳的位置表** `[0.30, 0.64, 1]`。飛行段只走前兩階，**第三階（到位）由 tween 的
  `done()` 給**——`done()` 在 `react[0]` 當幀跑，所以四件收在同一拍（覆審 H8；切在 travel 的 0.86 時，
  t2 下距衝擊拍 36.4ms＝2.18 幀，那就是 §A2 說的「兩個重音」）。
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

**0.55 徽記版原地保留**：`yinqi.js:1008` `export const V055`（`hauntLost_v055`，本體逐字取自
v0.55.8 的 `MOVES.hauntLost`，只改函式名那一行）＋`:1123` `V055_SHORT`。
**0.54 退路（`V054`／`V054_SHORT`）連同轉正一起移除**（同前兩批的作法）。
★這一步讓三個系別檔的 `V054` 全部消失★：`V054_FULL`／`V054_SHORT` 現在恆為空物件，
`traitfx-drive` 的 `v054CasesFromSource` 恆回 `[]`。機制留著給下一卷，三處相關註解已同步更正
（`js/trait-fx.js` 的三張表疊法那一段、`tests/fxvocab.test.mjs` 的 `convertedMoves`／`bodyOf`、
`tests/tools/traitfx-drive.mjs` 的 `inStanceScope`）。

### 1.3 P0–P8 逐條（全部實跑，指令原文與原始 stdout 在 `…-b3-evidence/gates.txt`）

| 閘門 | 指令 | 結果 |
|---|---|---|
| **P0 等價** | `node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html`（`git show ea2a38f:index.html`） | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}` ✅ |
| **P1 登記表** | `node tests/fxvocab.test.mjs` | **28 綠／0 紅**（`MOVE_SPEC.hauntLost` 補 `stance`／`anchor` 兩欄之後，§A9 ①⑥⑦⑧與裁定①那幾條都把它納進來了）✅ |
| **P2 phase gate** | `traitfx-drive --tier=1／2／3`、`--fxvocab=1` t1／t2、`--count=2`／`--count=3` | **27/27**／**30/30**／**3/3**／**27/27**／**30/30**／**30/30**／**30/30**，`phasesOK` 全 true ✅ |
| **P3 對比** | `fx-contrast --only=hauntLost --tier=2／1` ＋ `fx-contrast-metrics.py`（844×390@2x、bloom 0.7、seed 7） | **`fx-contrast` 自己 ` ok ` ／ exit 0**（★覆審 C2 修好之後才成立，見 §2.1★）；t2／t1 皆 **area 1.022%**（門檻 0.8）／**ΔE 中位 35.65**（門檻 28）✅。這一格跑過三次：**0.7753%（紅）→ 0.9737% → 1.022%**，沒有動門檻、動的都是實作 |
| **P4 盲讀** | — | **不在本階段**（裁定：陰氣 9 支鋪完再與香火＋祖靈一起重跑新的三輪） |
| **P5 短版合身** | `traitfx-drive --tier=1` | 27/27，`hauntLost` `rate=1`／`fill=0.9`／`msOK=true` ✅ |
| **P6 短版下限** | 同上的 `actionsOK` | `hauntLost` acts=**8**（≥2）✅ |
| **P7 效能** | `duel-perf perf --seed=7`（本樹 ／ 基準樹 `ea2a38f` 的 `git archive` 樹） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16=16；errors 0 ✅ |
| **P8 零錯＋規則測試** | `duel-drive --seed=7`／`--seed=3` 各 4 場 ＋ 12 套規則測試 | errors **0／0**（`ver v0.55.8`）；12 套 **8／5／7／9／14／28／32／8／16／28／32／36 全綠** ✅ |
| **A6 draw call** | `proto-record --trait=hauntLost --tier=2 --step=6` | `idleCalls 256` → `peakCalls 267` ＝ **+11**（預算 ≤ idle+25）；`peakTris 65,384`、`programs 22`、`errors 0` ✅ |

**anchor 逐支**（`--tier=2`，`spec=foe`）：

| 跑法 | n | land | bad | skip | miss | mainOK | mainD | cover | gap |
|---|---|---|---|---|---|---|---|---|---|
| 不帶 `--count`（＝`redhat` 的 `count: 4`，**不是 1**；覆審 M4 更正） | 2 | 2 | 0 | 0 | 0 | true | 0 | 0/0 | 2.088／1.966 |
| `--count=2` | 2 | 2 | 0 | 0 | 0 | true | 0 | 0/0 | 2.077／1.913 |
| `--count=3` | 2 | 2 | 0 | 0 | 0 | true | 0 | 0/0 | 1.460／1.287 |

`gap` 是「到敵方那一側的最短距離 vs 到我方那一側」的餘裕（門檻 `ANCHOR_MARGIN` 0.18）。
`cover 0/0` 是 `foe` 這一格**照設計不要求逐尊覆蓋**（§A9-5 的已知未涵蓋，見 §1.4 第 1 點）。
★這一格的鑑別力是**修補之後**才有的★：覆審 C1 實測「把飛行整段拿掉」時上面每一欄與健康態
**逐字相同**——因為黏著 `st.stick` 與量測時點同一幀。修法與驗收見 §2.1。

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

腳本＝`…-b3-evidence/b3-mutations.mjs`、輸出＝`b3-mutations.txt`。**14 條，驗紅 12 條**；
每一條都是「健康態綠 → 改壞 → 紅 → 用**改壞前的自取備份**還原 → 再綠」，三個狀態都實跑，
而且**字串配不到就整支中止**（祖靈批踩過的坑：`String.replace` 靜默沒配到，整批變成「全綠」的儀式）。

| # | 改壞什麼 | 閘門 | 結果 |
|---|---|---|---|
| M1 | `MOVE_SPEC.hauntLost` 拿掉 `stance` | P1 | ✅ 紅 |
| M2 | 拿掉 `anchor` | P1 | ✅ 紅 |
| M3 | 編舞拿掉 `st.groundMark` | P1 | ✅ 紅 |
| M4 | 編舞拿掉 `st.stance` | P1 | ✅ 紅 |
| M5 | 主道具不標 `main: true` | `traitfx-drive` | ✅ 紅（`mainDeclared=false`） |
| M6 | `anchor` 改宣告 `caster` | drive | ✅ 紅 |
| M7 | 衝擊拍把主道具 `st.alpha(hat, 0)` 藏起來 | drive | ✅ 紅（在場五條的第 4 條） |
| M8 | 腳下語彙點到**受招方**腳下 | drive | ✅ 紅（`st.groundMark` 當場 throw） |
| M9 | 受招方只 `spin` 不 `move` | drive | ✅ 紅（`react` 量的是 `move`／`scale`） |
| **M10** | **帽子原地生成、也不在衝擊拍到位（飛行整段沒了）** | drive | ✅ **紅**（★修補之前是綠的，見 §2.1★） |
| M11 | 只拿掉衝擊拍之後那一行黏著（飛行還在） | drive | ⚪ 綠＝**對照組**，照設計本來就不該紅 |
| **M13** | 帽子只飛到 `JOLT[1]=0.64` 就停（不在衝擊拍到位） | drive | ⚪ **綠＝照實留著的未驗紅**，見下 |
| M14 | 腳下暗斑的本體色改成比桌面亮的 `key` | P1 | ✅ 紅（§2.1 新加的那條斷言） |
| M12 | M10＋M11：飛行、到位、黏著全部拿掉 | drive | ✅ 紅（`travel moved 0.7404 < need 1.2533`） |

★**M13 照實留著的理由（量出來的，不是推的）**★：`mainD = 0.102`，而 `ANCHOR_MARGIN` 是 **0.18**
——治具棚這個站位下，帽子飛到 64% 就已經**貼到敵方的水平佔地**（那一尊的框很大）。
⇒ anchor 這一格分得出「**有沒有到敵方那一側**」（M10 驗紅），分不出「**有沒有完全到位**」。

**另外三格照實列的「這一支上恆真」**（`02 §6.1` 第 6 條；★覆審 H6 把我原本列的兩格補成四格、
並抓到我把支數算錯★）：

1. **§A9-2「施招姿態與反應不得同型」對 `hauntLost` 恆真**：`REACT_AXIS['轉'] = 'spin'`，
   而 `STANCE_VOCAB` 三型的 `axis` 是 `fore`／`up`／`down`——沒有任何一型是 `spin`。
   ★支數更正：陰氣 9 支裡是 **4 支**不是 6 支★——恆真的條件是 react 的軸不落在 `{fore, up, down}`
   裡，也就是 `轉`（spin，1 支）＋`抖`（shake，3 支）；`被拖`（fore，3 支）與 `壓`（down，2 支）
   分別撞得到 `前傾`／`下沉`，那 5 支不是恆真。
2. **`foe` 那一格 `coverOK` 恆真**，而且比我原本寫的更硬：`js/trait-fx.js` 的 spec 分支
   **完全沒有 `foe` 這一支**，落到 `else { need = 0; coverOK = true; }`。
3. **`fillOK` 對這份範本恆真**：`yqBeat(st, 0.90)` 讓收勢排在 `[R0, LAST]` ⇒ `horizon` 恆等於
   `0.90 × ms`、`fill` 恆等於 0.900（門檻 0.85）。任何照這份範本排時間軸的招都不可能紅。
4. **P3 的 t1／t2 不是兩份證據，是同一張圖**：凍幀點是 `(travel[0]+travel[1])/2` ⇒ 兩個 tier 都落在
   travel 進度 `e = 0.5`，而本招所有時點都由 `st.beat` 等比換算、位移又被 `JOLT`／`COIL` 量化成台階
   ⇒ 兩個 tier 的 `px`（3364）／`de_median`（35.65）／`de_p90`（83.37）**逐位相同**。
5. **`sizeState` 在預設路徑恆為 `n/a`**：`needEmblem` 綁 `--fxvocab=1`，而 `st.paperStamp`／
   `st.paperProps` 本來就不在尺寸鎖裡（`tests/tools/README.md` 的「已知未涵蓋」）
   ⇒ §A3 對這一支在**執行期**一格檢查都沒有，只有 `prop-size` 的記錄表。

**`travel` 那一格的殘留（引擎層，本階段不碰）**：`st.phase('travel')` 的 claim **沒有時間上限**
（`js/trait-fx.js` 的 `phase()`：`windup`／`react` 都設 `c.until`，只有 `travel` 留 `Infinity`）
⇒ 衝擊拍之後才發生的位移仍會回頭補上它的分子。這是 19 支已轉正的招共用的性質
（`zlDeliver`／`xhDeliver` 的每一枚印記都走同一條），交裁見 §1.7 第 3 題。

### 1.6 視覺自評（`threejs-visual-loop`，每一輪都是「拍 → 用 Read 打開圖看 → 改」）

- **第 1 輪**（魂片 `k 0.62` 生在頭頂、暗斑 `peak 0.92`、帽子 `R0+0.6RL` 起淡出）看出三件：
  ① **魂片整片蓋住紅帽**——sheet 第 6 格（react 末）看不到「戴著帽子」，而「戴住」正是這一招的身分；
  ② 單片 0.62 在 780×360 上只有幾個像素寬，讀起來是盲讀抱怨過的「**白色細點**」，不是紙片；
  ③ 暗斑 `peak 0.92` 太亮，像一灘新漆不像水漬。
- **第 2 輪**：魂片改從**胸口**散出、單片放大到 1.0／`ratio 0.66`／4 片；暗斑 `peak 0.70`；
  帽子的淡出改 `R0+0.84RL` 起（活過 react 末那一格）。六格逐格讀得出：
  暗斑亮起＋帽子從他頭上浮出 → 帽尖後仰、靜止 → 帽子卡頓跳到半空（往鏡頭鼓一下） →
  跳到對手頭上 → 衝擊拍：戴上＋火星＋魂片散出＋暗斑熄 → 對手打轉、帽子還戴著。
- **第 3 輪**：道具倍率 0.95→0.88、鼓弧收成一跳（P3 那一次）；**再看 t1 的第 6 格，帽子不見了**——
  `R0+0.84RL／0.16RL` 的淡出在 t2 沒事（第 6 格取樣 730ms、淡出 770ms 才開始），
  但 **t1 的 `RL` 只有 62ms**（淡出 260→270ms、取樣 267ms）⇒ 那一格只剩 0.29。
  改法：**帽子整條淡出拿掉**，戴到清場為止（清場本來就會移除 mesh，`restored` 量的就是這件事，
  horizon 仍收在 `LAST`）。三張 sheet 重拍，t1 第 6 格現在讀得到頭上那頂帽子；
  `acts` 由 9 變 8（門檻 ≥2）、P3 由 0.9737% 變 **1.022%**。

**驗收清單對照**
- ✅ 出招瞬間有**新增元素**（GLB 上那頂常駐的帽子不算——另外飄一頂出來，§10.2 第 6 條）
- ✅ 帽子是實體紙紮（厚度 0.22＋墨線邊＋翹曲 0.16），不是平面 billboard。
  ★魂片沒有墨線邊★——那是 `st.paperProps` 明文的規格例外（InstancedMesh 一個材質只畫得出一種顏色），
  厚度與翹曲已收回 §A4 的區間。§B3 對丙家族「冷屍白青＋`ink` 外描邊」在這一件上**沒有做到**，
  照實記（覆審 H4-3）。
- ✅ 「那一點刺眼的紅」**只落在道具上**——全招只有帽子一件用 `hot`。
  ★更正★：命中火星 `st.burst(..., color: C.hot)` 也是 `hot`（30 顆），所以「全招其餘只有冷屍白青、
  苔綠、近黑」那句是錯的；`FX_PAL` 註解本來就寫 `hot`「只給命中」，用法合法，錯的是我那句宣稱（覆審 H4-2）。
- ✅ 四件收在同一個 `react[0]`（本體到位＝帽子扣上頭＝魂片散出＝那一尊同幀開始打轉）
  ——★這是覆審 H7 之後才成立的★：第三階原本切在 `0.86 × TL`，t2 下距衝擊拍 2.18 幀＝兩個重音。
- ✅ 沒有任何跨場拖線；沒有白光球、沒有貼桌圓環、沒有垂直光柱（三系禁區各自守住）
- ✅ 卡頓：`COIL` 兩跳＋靜止一拍、`JOLT` 三階、魂片三階、受招方六個離散角度、收勢三階
  ——整支沒有平滑補間的位移。★這也是覆審 H4-1 之後才成立的★：收勢與魂片原本是 `ease` 連續內插。
- ⚠️ **滿編下四尊都在演了**（覆審 H5）：轉正的第一版只動 `ghosts[0]`，預設治具棚（`count=4`）
  另外三尊全程不動——而基準版是四尊錯開。已改回 `ghosts.forEach`。
  ★沒有任何閘門量得到這件事★：`windup` 的 bone 對 actorSet 取 max，一尊動就過。
- ❌ **施招者在 2v2 治具棚裡被同伴擋住**：`--mate=auto` 給陰氣 `haunt` 配的同伴是
  `nail:elite`（虎姑婆指甲），體型大很多又站在前面，`redhat` 只露出一小角。
  施招者的訊號因此只剩「腳下暗斑」與「帽子從那個方向浮起來」兩件，**本體的「探」看不到**。
  這是**材料規格**造成的（`MATE_BY_FAC.yinqi.haunt = 'nail:elite'`，祖靈批第 2 輪 P4 訂的），
  不是編舞改得掉的——交製作人裁（§1.7 第 2 題）。
- ❌ **滿編真實對決那一張沒抓到**：見 §1.8 交付物那一列。

**效能**：桌機 `duel-perf` fps 59.9、draw call 986（visible 16）；招式峰值 **+11** draw call。
**手機真機 fps 待試玩**（這是桌機數字）——★這一格**本階段沒有做**，也沒有排程★：
真機只有使用者量得到，照前兩批的作法留給試玩那一步。

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
| `tests/fxvocab.test.mjs` | `CONVERTED_MUST` 活性下限 10→**19** 支；新增「暗斑必須比桌面暗」那條斷言（覆審 H4）；兩處 `V054` 註解更正 | 治具（**加嚴**，不是放寬） |
| `tests/tools/traitfx-drive.mjs` | `phaseCasesFromSource` 的 `MUST` 10→**19** 支；`movesMatching` 加 `section` 參數＋新增 `movesEmblemCasesFromSource`（覆審 C2）；一處 `V054` 註解更正 | 治具（**修一條既有的恆紅／恆假**，見 §2.1 C2） |
| `tests/tools/fx-contrast.mjs` | `usesEmblem` 兩條路各查各的那一份（覆審 C2） | 同上 |
| `docs/experiments/2026-09-13-yinqi-b3-*` | 報告、證據、突變腳本 | 派工 4 |

**`index.html` 零 diff**（P0 逐位元組相等）；門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／
`ANCHOR_MARGIN`／真值表／其他 8 支陰氣招／`sampleAnchors` 與 anchor 判定**一行未動**。
★兩支治具有改（`traitfx-drive`／`fx-contrast`）★：那是覆審 C2——P3 的工具在 HEAD 上 exit 1，
而且那個紅是**既有缺陷**（前兩批的 `eliteSelfCut`／`biteGamble` 也紅），修法是「兩條路各查各的名單」，
**沒有動任何門檻**；`--fxvocab=1` 的 canary 反而從恆假修回有效。逐條見 §2.1。

### 1.10 下一步

1. 製作人看 `sheet-t1／t2／t2-closeup` 三張 → 簽字（§1.7 的五題＋§2.2 的九列要裁）。
2. 簽字後開**階段 B**：鋪陰氣其餘 8 支（`hauntSteal`／`hauntSee`／`hauntDread1`／`hauntSwap`／
   `eliteVsSwarm`／`swarmPierce`／`hauntFearX2`／`swarmFeed1`），照語彙檔 §C3 與 §B3，
   每支 P0–P3／P5–P8 ＋ sheet；`eliteVsSwarm` 是**盲讀標竿、動作與節拍一格不動**（§C3 明寫）。
3. 27 支全部鋪完之後統一交 P4（香火 9 ＋ 祖靈 9 ＋ 陰氣 9 的新三輪）。

---

## 2. 對抗式覆審與修補（`02 §6`／§3 的分級處置）

### 2.0 一句話

fresh `opus` 冷讀 `ea2a38f..HEAD` 的 diff＋權威文件，實跑重現每一條：
**CRITICAL 2／HIGH 7／MEDIUM 9／LOW 5**（清單＝`…-b3-evidence/adv-review.md`，覆審員自己落的檔）。
**兩條 CRITICAL 與五條 HIGH 已修並各自附驗收**；其餘照實記在 §2.2。
它抓到的型態與前兩批一致：**綠燈與待驗的行為脫鉤**——閘門是綠的，但量到的不是它宣稱量到的東西。

### 2.1 CRITICAL／HIGH 的逐條處置

| # | finding | 三態 | 修法與驗收 |
|---|---|---|---|
| **C1** | `anchors`／`mainOK` 零鑑別力：把飛行整段拿掉（M10），anchor 的每一格與健康態**逐字相同**（`mainOK:true`／`mainD:0`／`gap 2.053`／`verdict.pass:true`）。成因是 `st.stick` 的瞬移與 `sampleAnchors` 的時點（`react[0]`）**同一幀**；而報告 §1.4／§1.5 正好拿 `mainOK` 當 `foe` 豁免逐尊覆蓋的補償證據 | **真的修好** | 兩件：①「到位」那一階從飛行段搬進 `st.trail` 的 `done()`（`hat.position.copy(to)`，`yinqi.js`）——落點由**道具自己的位移**給；②黏著**延後**到衝擊拍之後（12ms 的短 tween）。**驗收**：突變 **M10 由綠翻紅**（`b3-mutations.txt`），健康態仍綠。★引擎側那條更根本的洞仍在★：`regAnchor` 對沒有 `o.anchor` 的 `st.stick` 直接 return，引擎不知道一件 land 型主道具後來被黏上去了——那要改 `sampleAnchors`，**依派工書不碰**（另一個分支在修），記在 §2.2 |
| **C2** | **P3 的閘門工具在 HEAD 上 exit 1**：`fx-contrast` 印 `FAIL … size=fail`＋「N11 防線判紅」。成因是三個系別檔都沒有 `V054` 之後，`movesMatching` 的 `indexOf('export const V054')` 切點成死碼 ⇒ `V055` 整段被當成正式演出 ⇒ 轉正後的招恆為 `usesEmblem=true`、`made===0` 判 fail。`gates.txt` 只貼了下游 metrics 的 JSON，沒貼工具自己的 verdict 與 exit code | **真的修好** | `movesMatching` 加 `section` 參數（`'moves'`／`'v055'`／`'all'`），新增 `movesEmblemCasesFromSource`；`fx-contrast` 兩條路各查各的那一份。**驗收**：`fx-contrast --only=hauntLost --tier=1／2` 印 ` ok `、**exit 0**；`--fxvocab=1` 那條路從 `0v/0of0` 修成 **`0v/5of5/u130+d5`**（★它本來是**恆假**的：查的是 `c.trait + '_v055'`，而名單裡的後綴早就被剝掉了 ⇒ canary 那一格失效★）。★這個紅是**既有缺陷**、不是本批打開的★：前兩批的 `eliteSelfCut`／`biteGamble` 在修之前一樣 exit 1，現在一起回綠 |
| **H1** | `gates.txt` 把 M10 的 `moved=2.8844` 標成「健康態」；`acts=9` 是舊版抓的 | **真的修好** | `gates.txt` 全表在最終 SHA 上重跑；健康態 `travel.moved` 是 **1.721**（`need 1.2533`），`acts=8` |
| **H2** | 「鼓弧收成一跳之後 P3 的面積一個像素都沒少」不成立（0.9737 → 1.022，+159 px） | **真的修好** | 報告與 `gates.txt` 改成「這一格跑過三次：0.7753（紅）→ 0.9737 → 1.022」 |
| **H3** | 「收斂鼓弧是為了讓鏡頭偏移不再替飛行作證」被自己的治具否證：M12 實測 0.6653 → **0.7404**，貢獻不減反增；而已 commit 的程式碼註解還寫著「M10 當場轉紅」 | **真的修好** | 註解重寫成實測數字；飛行的證據改由 C1 那兩件承擔（現在 M10 真的會紅）。鼓弧留著的理由只剩一個：**P3 的螢幕面積**，照實寫在碼上 |
| **H4** | §B3「不規則**暗斑**」不成立——`line #6fae90`（Y≈0.353）對桌面（Y≈0.057）是**亮斑** | **真的修好** | 本體改 `ink`、描邊改 `line`；新增機械斷言（`stain` 系別的本體色相對亮度必須低於 `TABLE_COLOR`，**而且分派那一行必須用 `st.colors.ink`**）；突變 **M14** 驗紅 |
| **H5** | 驗收清單三個 ✅ 與碼矛盾（平滑補間、刺眼的紅、魂片規格） | **真的修好**（兩件改碼、一件改宣稱） | 收勢與魂片改卡頓三階；魂片 `depth 0.12→0.18`／`warp 0.22→0.16`；「刺眼的紅只落在帽子上」那句照實更正（命中火星也是 `hot`）。**魂片沒有墨線邊那一項是照實記，不是修掉** |
| **H6** | 滿編 4 尊紅帽只有 1 尊在演（基準版是四尊錯開） | **真的修好** | `point()`／`st.rim()` 套回 `ghosts.forEach`（同伴幅度 ×0.82）；姿態／腳下光／道具仍只給施招者 |
| **H7** | 報告自列的「恆真」漏了四格、支數 6 應為 4 | **真的修好** | §1.5 重寫，四格補齊、支數更正 |
| **H8** | §A2「三件收在同一衝擊拍」在 t2 不成立（第三階 523.6ms vs `react[0]` 560ms ＝ 2.18 幀） | **真的修好** | 第三階搬進 `done()` ⇒ 本體到位／帽子落點／魂片散出／受招反應四件都在 `react[0]` 當幀 |

**修補途中自己踩到、也自己修掉的兩件**（照實記，不然下一批會再踩）：

1. **`JOLT` 改成陣列時漏改定義**：把用法改成 `JOLT[n]`、定義卻還是 `(e) => …` 的函式
   ⇒ `JOLT[0]`／`JOLT[1]` 是 `undefined`，飛行段與本體動作整段吃到 `NaN`。
   ★閘門沒有抓到★（`traitfx-drive` 仍 `PASS`）——抓到它的是**看圖**：sheet 上帽子變成一團近黑的塊。
2. **`st.at(12, …)` 把 tier 1 的 `rateOK` 打紅**：`st.at` 會把 `TFX.atReserve × run.k` 也算進
   `horizon`（實測 282 > `LAST` 270 ⇒ `maxRate 1.12`）。改用 12ms 的空 tween，`27/27` 回綠。

### 2.2 覆審指出、但本階段**沒有修**的（照實列，交製作人裁）

| # | 內容 | 為什麼不修 |
|---|---|---|
| C1 殘 | `regAnchor` 對沒有 `o.anchor` 的 `st.stick` 直接 return ⇒ 引擎無法得知一件 land 型主道具後來被黏上去；`sampleAnchors` 的 land／follow 判定該改看**效果**（`run.follow.some(w => w.mesh === a.obj)`） | **派工書指名不碰 `sampleAnchors` 與 anchor 判定**（另一個分支在修）。本階段改的是編舞側，讓這一支的證據先站得住 |
| M13 | 帽子只飛到 64% 仍 `mainOK`（`mainD 0.102` ≤ `ANCHOR_MARGIN 0.18`） | 站位造成的，不是實作造成的；要收就得動 `ANCHOR_MARGIN`（凍結值） |
| M1 | `movesMatching` 與 `fxvocab.test.mjs` 的同名推導已分岔（一邊 `indexOf('V054')`、一邊 `/V05[45]/`） | 本階段只把 `fx-contrast` 那條路修對；**兩份推導的合併**會動到 `emblemCasesFromSource` 的活性下限，範圍超出本階段 |
| M2 | §C3 第 1 列指定的道具是「乙 地面錯亂腳印」，本實作換成「丙 魂片」 | ★這是**有意的設計取捨**，之前漏列★：腳下語彙（§A9-1）是**施招者**的身分訊號，在**受招方**腳下再畫一組不規則暗斑會讓那個訊號指向兩個人。交製作人裁要不要改回 §C3 的寫法 |
| M5 | `st.stain` 的 `r` 沒有上限，實測 `floor:stain` 世界包圍盒 1.5844＝施招者身高的 1.40 倍 | 腳下語彙不在 §A3「單件**道具** ≤ 本體高 2/3」的範圍（同 `st.ring`／`st.pillar`，`prop-size` 歸 `type=other`）。要不要另訂一條腳下語彙的上限，交裁 |
| M7 | t1 下 react 的六階各 10.3ms＜一幀 ⇒ 一半角度畫不出來 | 這是 tier 1 的先天寬度（`RL` 只有 62ms）。要收就得改階數或 `LAST`，兩者都會動到已簽的節拍規格 |
| M8 | P0（`trace-eq`）對本批恆真（`index.html` 一行未動），真正有鑑別力的 `--sigdump` 一次都沒跑 | P0 的定義就是「引擎零 diff」；`--sigdump` 是**另一支招沒被動到**的等價證據，本階段 27 支裡只動了 1 支且 drive 的 `重複簽章 0` 已覆蓋。照實記 |
| M9 | 「帽子不淡出」讓它在收工那一幀消失，三張 sheet 都取樣不到 | 是刻意的（§1.6 第 3 輪）：t1 的 `RL` 只有 62ms，任何落在 `RL` 裡的淡出都會吃掉 sheet 第 6 格 |
| M6 | 突變沒有一條跑 `fx-contrast` | 本輪已加 M14（走 P1）與 M10／M13（走 drive 的 anchor）；`fx-contrast` 那條路的鑑別力目前靠 L3 canary（`README` 的既有程序），沒有併進這支腳本 |


---

## 3. 合併 main（v0.55.9）後重驗（2026-09-13）

### 3.0 一句話

祖靈批收尾合進 main 之後（`8a242b0` v0.55.9：anchor 主道具／在場五條／逐尊覆蓋／`foe` 綁受擊者、
**衝擊拍後不得回流**斷言、`st.stageVec` 舞台座標唯一出口＋世界軸掃描、`--camyaw` 六座位、
`fx-cli.mjs`／`fx-mate.mjs`），把 main 併進本 worktree。
**兩邊都活**：我的 `st.stain`／`hauntLost` 轉正／`V054` 移除／「暗斑比桌面暗」那條斷言／活性下限 19
全部保留；main 的 anchor／回流／`stageVec` 全部保留。`hauntLost` 依新語彙改了三處，**全套重驗全綠**。

### 3.1 合併本身

- `git merge main`：只有 **`tests/tools/README.md` 一個衝突**（兩邊各自往「已知未涵蓋」加了一段）。
  解法是**兩段都留**——我的 R-3／R-4／R-5 與 main 的 r6 N1／N2 講的是不同的洞。
- `js/trait-fx.js`／`tests/fxvocab.test.mjs`／`tests/tools/traitfx-drive.mjs` 自動合併乾淨；
  `js/trait-fx/yinqi.js` 只有我這邊動過。
- `index.html` 對 main **一行未動**（版號仍是 main 的 v0.55.9；本階段不上版號）。

### 3.2 `hauntLost` 依 v0.55.9 的新語彙改了三處

| # | 改了什麼 | 為什麼（哪一條新斷言） |
|---|---|---|
| 1 | 魂片的逐實例位移改走 **`st.stageVec`**，而且 **z 分量夾在 ≥0** | ① `tests/fxvocab.test.mjs` 的**世界軸掃描**：三系檔裡不得再有逐實例位移直接寫世界 xyz（`it.p` 是容器局部座標、容器不旋轉 ⇒ 局部就是世界，而舞台是相機相對的）。② **回流斷言**：本招 `anchor: 'foe'` ⇒ 打擊類，衝擊拍之後任何道具往我方走就判紅。`x` 走 `st.sideDir`（與對決軸正交、投影恆為 0），`z` 只准往敵方散 |
| 2 | 落點加 **`st.bodySpot`**（衝擊拍那一幀再夾一次），挑目標的 `st.spotRoom` 改在**帽子要落的高度**上量 | `foe` 這一格在 v0.55.9 變成 `attMain && hurtHit`：主道具的落點要**決定性地**歸屬到一尊，而且那一尊要真的有受擊反應。不夾的話治具棚四尊敵方擠在一起，`attr()` 歸屬不出來（實測合併後第一跑 `attMain=false`／`cover 0/1`） |
| 3 | **飛行段瞄「頭頂中心」（`aim`）、落點才用夾過的 `to`** | 兩者的量測位置不同：anchor 凍在**衝擊拍**（要決定性落點）、L3 凍在 **travel 中點**（要螢幕面積）。第一版兩段共用夾過的點，整條飛行路徑跟著偏，**P3 由 1.022% 掉到 0.7109%**（門檻 0.8）。★沒有動門檻，動的是「哪一段用哪一個點」★ |

**踩到的一個小坑照實記**：世界軸掃描是**逐行字串比對**，我在註解裡寫出了那個方法名的字面值
⇒ 掃描判紅在**註解**上（`yinqi.js:218`）。這正是 repo 裡踩過兩次的同一個坑（`traitfx-drive` 覆審 r1
MEDIUM-1、`zuling.js` 的 V055 註解）。改法是把註解改寫成不含那個字面值，並在原地標明理由。

### 3.3 重驗（全部實跑，最終 SHA）

| 閘門 | 指令 | 結果 |
|---|---|---|
| P0 trace-eq **對 main** | `git show main:index.html > …` ＋ `trace-eq` | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}` ✅；`git diff main -- index.html` 空 |
| P1 `fxvocab.test.mjs` | `node tests/fxvocab.test.mjs` | **30 綠 0 紅**（我的「暗斑比桌面暗」＋main 的世界軸掃描都在裡面）✅ |
| P2／P5／P6 drive 全套 | 七跑 | `--tier=1` **27/27**、`--tier=2` **30/30**、`--tier=3` **3/3**、`--fxvocab=1` t1 **27/27**／t2 **30/30**、`--count=2` **30/30**、`--count=3` **30/30** ✅ |
| **回流斷言 六座位** | `drive --tier=2 --count=2 --camyaw=<90／315／45／225／135／0> --only=<打擊類 6 支>` | 六個座位 **6/6 pass**、**紅 0／最深 0**；每一跑「有軌跡可量 **3 支**」（祖靈批時是 2 支⇒本招的魂片真的進了分母，不是空真）✅ |
| P3 對比 | `fx-contrast --only=hauntLost --tier=2／1` ＋ metrics | 工具自己 ` ok `／**exit 0**；t2 t1 皆 **area 1.022%**（門檻 0.8）／**ΔE 中位 35.65**（門檻 28）✅ |
| A6 draw call | `proto-record --trait=hauntLost --tier=2 --step=6` | `idleCalls 256` → `peakCalls 267`＝**+11**（≤ idle+25）；`programs 22`、`errors 0` ✅ |
| §A3 尺寸 | `prop-size --tier=2／1` | `emblem:hat` 峰值 0.8811／ratio **0.779**（OVER，記錄項不擋批，成因見 §1.3）；`prop:hat` 0.300／0.265 ✅；`floor:stain` 1.5844（腳下語彙不在這條規則範圍） |
| P7 效能 | `duel-perf perf --seed=7`（本樹 ／ main 的 `git archive` 樹） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16:16；errors 0 ✅ |
| P8 12 套規則測試 | 逐套 | **30／8／5／7／9／14／32／8／16／28／32／36 全綠** ✅ |
| 鑑別力 | `b3-mutations.mjs` | **16 條，驗紅 15**（`exit 0`）✅ |

**`hauntLost` 的 anchor 明細（`--tier=2`）**：
`ok true`／`mainOK true`／**`attMain true`**／**`hurtHit true`**／`hurtN 1`／`cover 1/1`／`coverOK true`／
`gap 1.749｜2.098`（門檻 `ANCHOR_MARGIN` 0.18）。
**`flow`**：`{"scope":true,"n":2,"worst":0,"absMax":0.116,"kind":"prop:hat","at":700,"ok":true,"eps":0.01}`
——`absMax 0.116` 代表這條斷言**真的被行使到**（`worst=0` 不是「根本沒動」的空真）。

### 3.4 突變表的變化（16 條，驗紅 15）

| # | 變化 | 說明 |
|---|---|---|
| **M13** | **綠 → 紅** | 「帽子只飛到 64% 就停」。合併前 `mainD 0.102 ≤ 0.18` 所以是綠的（照實記在上一版 §1.5）；合併後落點由 `st.bodySpot` 夾進那一尊自己的佔地、`foe` 又加了 `attMain && hurtHit` ⇒ 停在半路就歸屬不出來 |
| **M15**（新） | 紅 ✅ | 魂片的 z 分量拿掉夾限 ⇒ 一半實例往我方散 ⇒ **回流斷言**判紅。這是 v0.55.9 那條新斷言在本招上的鑑別力 |
| **M16**（新） | 紅 ✅ | 帽子照樣戴在 A、**受擊位移搬到 B** ⇒ `hurtHit` 假。這是「`foe` 綁受擊者」那條的鑑別力。★第一版的 M16 設計壞了★：它把挑目標的排序反過來，但反應跟著換到同一尊 ⇒ 兩件事仍綁在一起、當然不紅。那不是防線的缺口，是突變沒打在待驗的行為上，已重寫 |
| M11 | 仍綠（對照組） | 只拿掉黏著、飛行還在——照設計本來就不該紅，留著才分得出 M10／M13 的紅是哪一段造成的 |

### 3.5 §2.2「沒有修」那幾列的現況

- **C1 殘（`regAnchor` 按入口不按效果）**：main 沒有動這一條，`tests/tools/README.md` 的 **R-3** 仍然成立。
  本階段一樣不碰（派工書指名）。
- **M13**：v0.55.9 之後**已經不成立**（見 §3.4），從待裁清單移除。
- **R-4（`travel` 的 claim 沒有時間上限）**：main 沒有動，仍然成立。
- 其餘（§C3 的「乙 地面錯亂腳印」換成「丙 魂片」、`st.stain` 的 `r` 沒有上限、t1 的 react 六階
  各 10.3ms、真實對決的衝擊拍沒抓到）**一律未變**，仍在 §2.2 等裁。

---

## 4. 階段 B（其餘 8 支陰氣招，2026-09-13）

### 4.0 一句話

陰氣其餘 8 支全部轉正，**陰氣 9 支鋪完＝三系 27 支鋪完**。四件共用零件收斂
（`yqFly` 飛行三階／`yqDeliver` 逐尊送達／`yqLaunch` 起點的畫面上界／`yqRoomy` 挑目標），
範本招 `hauntLost` 的飛行段也一起收進 `yqFly`（`--sigdump` 與 `verdict` 逐欄相同）。
批末 `--mate=auto --mategap=1.9` 與 `--camyaw` 掃出兩個「兩份判準」的坑，都收斂成一支函式
（`figSep`／`st.sep`）。P0–P3／P5–P8 全綠；P4 照裁定不在本階段（材料與真值表已交付）。

### 4.1 逐支表（8 支）

節拍窗全部由 `st.beat` 換算，衝擊拍＝`react[0]`＝**t1 208ms／t2 560ms**（`BEAT_FRAC` 未動）。
`draw call`＝`proto-record --tier=2` 的 `peakCalls − idleCalls`（預算 ≤ idle+25）；
`anchor` 欄是 `--tier=2 --count=2` 那一跑的實測；`ratio` 是 §A3 的世界包圍盒 ÷ 施招本體高（參考線 2/3）。

| 招 | 本體動作（stance） | 道具（家族） | anchor（實測） | 反應 | draw call | P3 t2 area／ΔE | §A3 ratio |
|---|---|---|---|---|---|---|---|
| `hauntSteal` 林投姐髮簪 | **垂**：髮瀑揚起兩階→靜止一拍→面紗垂落、雙臂前伸（舉臂 up） | 甲 **銀簪**（`paperStamp`）＋丙 **命火** ×3（`paperProps`，z≥0） | `foe`／`mainOK` true・`cover 1/1`・`hurtHit` true | **被拖** 四階離散 | **+11** | 1.0153%／36.33 | 0.647／0.245 |
| `hauntSee` 椅仔姑竹椅 | **滯**：前後搖兩階→靜止一拍→椅頭突然抬起（舉臂 up） | 甲 **憑空多出的竹椅**＋逐尊**椅印**（`yqDeliver`） | `allies`／`cover 2/2` 滿・`mainOK` true | **抖** 四階離散 | **+17** | 1.6175%／34.27 | 0.589 |
| `hauntDread1` 黃色小雨衣 | **滯**：兜帽抬起兩階→靜止一拍→**閃現**靠近半步（舉臂 up） | 乙 **雨滴**（主滴＋兩滴＋六顆小雨滴）＋敵方腳下**水漬** | `foes`／`cover 3/2`・`mainOK` true | **壓** 四階離散 | **+23** | 4.5139%／68.51 | 0.653／0.203 |
| `hauntSwap` 水鬼浮標 | **甩**：繩後盪兩階→靜止一拍→猛甩（舉臂 up） | 乙 **帶結的粗濕繩浮標**＋本方沉沒那尊的**水柱** ×3 | `foe`／`mainOK` true・`cover 1/1`・`hurtHit` true | **被拖**＋本方同幀下沉 | **+11** | 1.1028%／41.21 | 0.64／0.174 |
| `eliteVsSwarm` 虎姑婆指甲 | **探**：長爪高舉→撲下（**形狀照標竿原樣**；舉臂 up） | 甲 **爪片**（取代爪尖光球）＋兩道**爪痕** | `foes`／`cover 3/2`・`mainOK` true | **抖** 四階離散、逐隻錯開 | **+17** | 5.8759%／42.23 | 0.48 |
| `swarmPierce` 陰陽眼銅錢 | **探**：銅錢貼眼皮兩階→靜止一拍→上身前探（前傾 fore） | 甲 **銅錢**（穿透不停留）＋**方孔印**＋殘影拖尾 | `foe`／`mainOK` true・`cover 1/1`・`hurtHit` true | **抖** 四階離散 | **+14** | 0.9412%／42.17 | 0.654／0.664 |
| `hauntFearX2` 過陰咒 | **滯**：本尊俯身兩階→靜止一拍→虛影分離（前傾 fore） | 丙 **虛影片**：一片留在本尊虛影（`caster`）＋撕下來壓到對面（`foes`） | `foes`／`cover 3/2`・`mainOK` true | **壓** 四階離散 | **+21** | 4.5124%／42.22 | 0.647／0.644 |
| `swarmFeed1` 飼鬼甕 | **吸**：甕口張開兩階→靜止一拍→張到最大（下沉 down） | 丙 **主甕**＋三個**甕複本**（從對面被吸入）＋**飽食魂片** | `allies`／`cover 2/2` 滿・`mainOK` true | **被拖**＋本方全體升 | **+15** | 1.3838%／40.87 | 0.662／0.497 |

**逐支還粗的地方**：

| 招 | 還粗 |
|---|---|
| `hauntSteal` | 銀簪在 780×360 上讀起來像一支**棒槌**——`pin` 的剪影是「簪首＋長身」，簪首那一顆被 bloom 吹亮之後比簪身顯眼。已把它順著飛行方向躺平（`roll: -2.0`）改善，形狀本身是凍結的頂點表 |
| `hauntSee` | `chair` 的側面剪影在這個尺寸下讀起來像一個「ㄈ」；已把翻滾關掉（`roll: 0`）讓它保持家具的朝向 |
| `hauntDread1` | 六顆小雨滴在中距離疊成一疊方片，讀不出「雨」；主滴的水滴形才是可讀的那一件 |
| `hauntSwap` | 「兩邊同時有反應」很弱：本方沉沒只有 0.19 世界單位、水柱三片也小，區分點目前主要靠繩本身 |
| `eliteVsSwarm` | 白色彎爪保住了（盲讀標竿的辨識元素），但爪片與爪痕同形，三件在畫面上讀成「一排爪」而不是「一爪＋兩痕」 |
| `swarmPierce` | 銅錢在 `figH 0.935` 的施招者身上為了守 §A3 收到 0.53 倍，P3 只剩 0.94%（門檻 0.8），餘裕最小的一支 |
| `hauntFearX2` | 本尊那一片虛影片與 `guoyin` 模型自己的虛影同色系（§10.6 的模型層互撞，演出層只拉得開位置） |
| `swarmFeed1` | 甕口張到 1.35 倍之後甕身在畫面上非常大，兩格之間的對比強到像氣球 |

### 4.2 四件共用零件（`02 §6.1` 第 7 條的收斂）

| 零件 | 它讓哪一種複製品由建構上消失 |
|---|---|
| `yqFly(st, mesh, from, aim, to, B, o)` | 「三階卡頓＋鼓弧＋第三階由 `done()` 給」——範本招寫過一次，8 支照抄就是 9 份。這一段同時承載 §A1 的衝擊拍、§A9-5 的落點、P3 的螢幕面積三件事，改一份漏八份的代價最大 |
| `yqDeliver(st, from, figs, B, o)` | 「每一尊受益／受招者各收到一件飛過來的實體道具」（＝§A9-5 的逐尊覆蓋）。同 `zlDeliver`／`xhDeliver` 那件事，差別只有節奏：飛行走 `yqFly` 的三階、淡入一格到位、`trail` 一律關 |
| `yqLaunch(st, base, backs, up, half)` | 「起點往 `-st.dir` 退多遠」——退得越遠 `travel` 的分子越大，但退出畫面之後蓄勢那兩格就看不到道具從哪裡來。兩件事共用一個旋鈕，所以拿 `st.inView`（＝在場第 5 條）當上界 |
| `yqRoomy(st, list, y)` | 「挑身上還放得下一件分得出來的道具的那一尊」（同 `zuling.js` 的 `roomyPrey`），與判定端的 `sepOf` 是同一支掃描 |

★`hauntLost` 的飛行段一併改走 `yqFly`★：收斂前後 `traitfx-drive --only=hauntLost --sigdump`
**逐位元組相同**、`verdict` 逐欄相同。不收的話 `yinqi.js` 裡會有兩份同一段時間軸，
而它正是這一卷最常改的那一段。

### 4.3 批末抓到的兩個「兩份判準」（都已收斂）

兩個都是 `--mate=auto --mategap=1.9`（P4 材料站位）與 `--camyaw` 六座位掃出來的，
逐支跑（治具預設站位）**看不到**——這正是「換一個站位就換一個答案」那一類。

1. **`sepOf` 只有判定端有、編舞端沒有** → `js/trait-fx.js` 抽出模組層 `figSep`，
   並開 `st.sep(fig, y)` 給編舞。病因：§A9-5 的逐尊覆蓋只要求 `sep` 的那幾尊，
   但**每一件道具**都要過 `dWant + ANCHOR_MARGIN <= dOther`——送一件給分不出來的那一尊，
   `coverOK` 綠、`bad` 卻紅（實測 `hauntSee` 在那個站位下施招者的佔地被同伴整個蓋住、
   離敵方前排只有 **0.146**）。編舞要能先問這個問題，而問的必須是**判定端同一個判準**；
   在編舞裡抄一份 `0.18` 就是第二份來源，那正是祖靈批覆審 r3 R-2 那個坑換一個形狀。
2. **`yqDeliver` 的落點掃描與判定端不同步**（三處）：
   ① 掃描高度原本用胸口、`sepOf` 用佔地垂直中心 → 改成同一個高度；
   ② 「分不出來就不送」的判斷原本排在 `t=0` → 改排在 `pre()`（＝衝擊拍當幀）。
   **`t=0` 篩會誤殺**：姿態會變、佔地跟著變，實測 `swarmFeed1` 的同伴在衝擊拍才分得出來，
   篩在 `t=0` 讓 `cover` 掉到 1/2 判紅。藏起來之後引擎的「在場五條」判它不在場、**留帳跳過**
   （副件不判紅），而 `coverNeed` 本來就不含那一尊——兩邊對得上。
   ③ `yqDeliver` 一律排在**本體 tween 之後**：tween 依註冊順序跑，衝擊拍那一幀本體的 `done()`
   會把姿態寫到底、佔地跟著變，排在前面就會掃到上一個姿態的佔地。

### 4.4 §C3 與後來的通則直接牴觸的四處（照實記，交製作人裁）

§C3（2026-09-12）比 §A9-3／§A9-6（2026-09-13 覆審 r4）早，四處逐招指定的演出與後來的通則相反。
**四處一律照通則實作、不動任何凍結的斷言**，逐條寫明失去了什麼。

| # | §C3 逐招指定 | 後來的通則 | 本階段怎麼做 | 失去了什麼 |
|---|---|---|---|---|
| 1 | `hauntSteal`「銀簪帶著一顆命火**飛回**」 | §A9-6：打擊類衝擊拍之後不得有道具往我方走（理由正是「東西從對面回來＝偷取」的讀法） | 簪戳中留在胸口；命火**脫離目標**（§C3 自己那一列的「t1 衝擊拍承載」原文就是這樣寫的）往上與往敵方那一側飄；「偷到了」由目標**被拖**半步承擔（受招方的位移不在回流斷言的分母裡） | §C3 的區分點「唯一去而復返的道具」 |
| 2 | `hauntSee`「抖動細絲指向每一隻」 | §A9-3：`st.trail`／`MAT_LINE` 只給打擊類（增益招拉線被 P4 讀成偷取） | 因果改由**椅子自己飛過去坐到同伴身上**承擔（那也是 §A9-3 對增益招指定的動作） | 「細絲指向」這個連線訊號 |
| 3 | `hauntFearX2` 道具**全部落在施招者自己身上**（虛影片貼在 `V*`） | §A9-5 的病因：讀者照道具落點答對象題 | 一片留在本尊的虛影上（`anchor: 'caster'`＝法寶身分），其餘**撕下來壓到對面每一尊**（`anchor: 'foes'`） | 沒有失去；是補上（真值對象是敵方多個，全部留在自己身上對象題只能答「自己」） |
| 4 | `swarmFeed1`「道具**往施招方**飛」（唯一一支） | §A9-3：增益道具不從敵方出發 | **保留吞食的方向**（它是 §C3 明寫的區分點），另在衝擊拍把飽食魂片送到本方每一尊身上 | 沒有失去；「誰受益」由落點承擔、「從哪裡吃來的」由方向承擔 |

另有兩處是**逐招條文與系通則**的牴觸，同樣照實記：

- `eliteVsSwarm`（盲讀標竿）：§C3 寫「**動作與節拍一格不動**」，而 §B3 禁「平滑補間的位移」。
  本支取**逐招那一列 specific**：本體動作照標竿原樣（`ease: 'out'`／`'strike'`／`'inout'`），
  **只有道具**走三階卡頓。三處非動不可的改動（絕對毫秒→`st.beat`、爪尖光球→爪片、
  `st.flinch`（退）→四階「抖」）逐條寫在該支的檔頭。
- `swarmPierce`：`MOVE_SPEC.anchor = 'foe'` 與 `ABILITIES`（「**本隊**攻擊無視吸收」＝我方增益）
  字面不一致。窄版（`allies`）會讓法寶身分（銅錢穿過對面）**無論實作對錯都做不出來**，
  所以取 §C3 招意欄的「打／穿透」。真值表那一格已標 `alt`，交製作人裁。

### 4.5 批末驗收（全部實跑，指令原文與原始 stdout 在 `…-b3-evidence/gates-b.txt`）

| 閘門 | 指令 | 結果 |
|---|---|---|
| **P0 等價** | `trace-eq scratchpad/base-index.html index.html`（基準＝`982172d`） | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}`；`git diff 982172d -- index.html` **空** ✅ |
| **P1 登記表** | `node tests/fxvocab.test.mjs` | **30 綠／0 紅**（`CONVERTED_MUST` 活性下限由 19 長到 **27**）✅ |
| **P2／P5／P6** | `traitfx-drive` 八跑 | `--tier=1` **27/27**／`--tier=2` **30/30**／`--tier=3` **3/3**／`--fxvocab=1` t1 **27/27**・t2 **30/30**／`--count=2` **30/30**／`--count=3` **30/30**；P4 材料站位 **29/30**（唯一那一支是**既有**的，見 §4.7 第 2 題）✅ |
| **回流（§A9-6）** | `drive --tier=2 --count=2 --camyaw=<90／315／45／225／135／0>` | 六個真實座位**全部「紅 0、最深 0」**；打擊類由 6 支長到 **12 支**、有軌跡可量由 3 支長到 **7 支**（＝這條斷言真的被行使到，不是空真）✅ |
| **P3 對比** | `fx-contrast --only=<trId> --tier=2／1` ＋ `fx-contrast-metrics.py` | 8 支 t2／t1 **全部 ok**、工具自己 exit 0；數字見 §4.1（最小 0.9354%，門檻 0.8）✅ |
| **P7 效能** | `duel-perf perf --seed=7`（本樹／基準 `982172d` 的 `git archive` 樹） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16:16；errors 0 ✅ |
| **P8 零錯** | `duel-drive --seed=7／3` 各 4 場 | errors **0／0**（`ver v0.55.10`）✅ |
| **P8 規則測試** | 12 套逐套 | **8／5／7／9／14／30／32／8／16／28／32／36 全綠** ✅ |
| **L3 尺寸防線** | `duel-drive …&fxvocab=1&seed=7 --duels=12` | `ok`：違規 0／**鎖上 11 of 產出 11**／稽核 update 570＋draw 559／`tweenErrors` 0 ✅ |
| **§A3 尺寸** | `prop-size --tier=2／1`（全 27 支） | 道具 **3／52 列**超過參考線，**三列全部是既有的**（`swarmHalfSplash` 1.047／`swarmLastStand` 0.818／`hauntLost` 0.779）；**本階段 8 支全部在 2/3 之內** ✅ |
| **鑑別力** | `bB-mutations.mjs` | **15 條，驗紅 14**（B6 是照實留著的已知未驗紅，見 §4.6）✅ exit 0 |

### 4.6 鑑別力（`02 §6.1` 第 1 條）——`bB-mutations.txt`

每一條都跑**健康態 → 改壞 → 還原**三次（反面也驗）：健康綠＋突變紅＋還原綠才算數；
字串配不到就**整支中止**（不留靜默綠燈），還原一律用改壞前的自取備份。

- 8 支**逐支各有至少一條**打在它自己的實作上（B1–B12）：不標 `main`、命火往我方飄（回流）、
  竹椅宣告落在敵方、拿掉 `st.stance`／`st.groundMark`、衝擊拍把主道具藏起來、飛行整段拿掉、
  銅錢往我方穿、虛影片宣告落在自己、主甕不夾進甕口、`MOVE_SPEC` 拿掉 `anchor`。
- 兩件**新收斂本身**也各有一條（B13／B14）：`st.sep` 改成恆真、`yqDeliver` 不再藏起
  「分不出來那一尊」的道具——兩條都**只在 `--mate=auto --mategap=1.9` 那個站位下才紅**，
  ⇒ 那個站位是這兩道防線唯一量得到的地方，逐支跑看不到。
- ★**B6 照實留著、未驗紅**★：把 `hauntDread1` 受招方的等比縮整條拿掉，`drive` 仍是綠的。
  病因不是這一支的實作，是 `evalPhases` 的 react 段量的是「除了**施招者**以外每一個 wrap」
  （`js/trait-fx.js` 的 `evalPhases`：`sawOther` 為真時只排掉 `run.caster` 一個人），
  而本招四尊雨衣**同伴**的閃現位移與收勢也在分母裡。
  ⇒ **多尊同型單位的招，react 這一格對「受招方有沒有反應」沒有鑑別力**。交裁（§4.7 第 1 題）。
  B6b 是同一支招真的有鑑別力的那一條（主滴宣告落在我方 ⇒ 紅）。

### 4.7 我看到還粗的地方 / 交製作人裁

1. **`evalPhases` 的 react 段對多尊同型單位沒有鑑別力**（B6 實測）：受招方的反應整條拿掉，
   同伴的位移照樣把那一格餵綠。修法方向是「react 只量 `run.targetSet`（或 anchor 解出的那一側）」，
   但**會動到 27 支已轉正的招**，要單獨開一輪跑完整回歸——與 `tests/tools/README.md` 的 R-4 同一類。
2. **兩支既有的紅（不是本階段造成的）**：`swarmHalfSplash`（祖靈）在 P4 材料站位與
   yaw 45／135／225／315 下 `mainOK false`（`mainD 0.232`）、`swarmRally`（香火）在
   yaw 135／225／315 下判紅。**在基準 `982172d` 的 `git archive` 樹上跑同一組參數同樣紅**
   （`gates-b.txt` 最後一段）。它們會影響 P4 材料裡那兩格的畫面，建議下一輪一起修。
3. **`swarmPierce` 的真值與 `ABILITIES` 字面不一致**（§4.4 末段）：真值表已標 `alt`，待裁。
4. **§C3 四處牴觸的取捨**（§4.4 的表）：四處都照後來的通則做了，**失去的東西逐條列在表上**，
   其中第 1 條（`hauntSteal` 的「去而復返」）是唯一真的丟掉一個區分點的。
5. **2v2 材料裡施招者被同伴擋住**（階段 A §1.7 第 2 題的同一條，範圍變大）：`--mate=auto` 給陰氣
   `haunt` 配的同伴是 `nail:elite`（虎姑婆指甲），體型大很多又站在前面，
   `hairpin`／`chair`／`raincoat`／`buoy`／`guoyin` 五支的施招者在 sheet 上只露出一小角。
   這是**材料規格**造成的，不是編舞改得掉的。
6. **`hauntDread1` 的敵方腳下水漬用的是 `st.stain` 直呼**（不是 `st.groundMark`）：
   §C3 指定它，而且與施招者那一片在時間上完全不重疊（一個蓄勢亮、衝擊拍熄；一個衝擊拍才鋪開）。
   但**沒有任何機械檢查在管「第二片暗斑不會被讀成第二個施招者」**，靠的是人眼與這一段條文。
7. **`st.stain` 的 `r` 仍然沒有上限**（階段 A §2.2 的同一列）：`hauntDread1` 的敵方水漬 `r 0.78`
   量出來 1.83 倍施招本體高——腳下語彙不在 §A3 的範圍，但也沒有第二條線在管。
8. **手機真機 fps 待試玩**（桌機 `duel-perf` 59.9／986 draw call）——這一格本階段沒有做，
   照前兩批的作法留給試玩那一步。

### 4.8 交付物

| 檔 | 內容 |
|---|---|
| `…-b3-evidence/<trId>/sheet-t1.png`／`sheet-t2.png`／`sheet-t2-closeup.png` | 8 支各三張 6 幀連拍（844×390@2x、每格 780×360、2v2 `--mate=auto --mateGap=1.9`；近景 `--camdist=2.4`） |
| `…-b3-evidence/<trId>/p3-t1`／`p3-t2` | 逐支 P3 的 A／B 凍幀與 `shots.json` |
| `…-b3-evidence/<trId>/propsize` | 逐支 §A3 尺寸記錄 |
| `…-b3-evidence/propsize-all/` | **全 27 支**的尺寸記錄（t1／t2 的 tsv＋json） |
| `…-b3-evidence/gates-b.txt` | 批末閘門的**指令原文與原始 stdout**（含在基準樹上重跑那兩支既有紅燈） |
| `…-b3-evidence/bB-mutations.mjs`／`bB-mutations.txt` | 15 條突變的腳本與逐條驗紅輸出 |
| `…-b3-evidence/p4-truth-yinqi.json` | **陰氣 9 支的 P4 真值表（★讀者不得看★）** |
| `…-b3-evidence/p4-material-A-booth-x3/`（54 張） | 三系 27 支 × t1＋t2，2v2 治具棚 |
| `…-b3-evidence/p4-material-B-closeup-x3/`（27 張） | 三系 27 支 × t2 近景（`--camdist=2.4`） |
| `…-b3-evidence/p4-mapping-HIDDEN.json` | 兩種材料的匿名編號 → `trId`／`tier`／`material`／`faction`（★讀者不得看★；系別由 `index.html` 的 POOL 推導，不是手抄） |

### 4.9 範圍（`git diff --stat 982172d..`，逐檔對應）

| 檔 | 改了什麼 | 對應哪條需求 |
|---|---|---|
| `js/trait-fx/yinqi.js` | 共用零件 `yqFly`／`yqDeliver`／`yqLaunch`／`yqRoomy`／`COILN`；8 支轉正；`SHORT` 八列改指向 `MOVES`；`hauntLost` 的飛行段改走 `yqFly`（sigdump 逐位元組相同） | 派工「每支 P0–P8」 |
| `js/trait-fx/vocab.js` | `MOVE_SPEC` 八列補 `stance`／`anchor` | P1 機械檢查 |
| `tests/fxvocab.test.mjs` | `CONVERTED_MUST` 活性下限 19→**27**（**加嚴**） | 治具 |
| `js/trait-fx.js` | `sepOf` 抽成模組層 `figSep`、新增唯讀的 `st.sep`（**兩份判準收成一支**，不動任何門檻） | §4.3 第 1 點 |
| `tests/tools/README.md` | 「已知未涵蓋」加一列（react 段對多尊同型單位沒有鑑別力） | §4.7 第 1 題 |
| `docs/experiments/2026-09-13-yinqi-b3-*` | 報告、證據、突變腳本、P4 真值表與材料 | 派工「報告 §4」 |

**`index.html` 零 diff**（P0 逐位元組相等）；門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／
`ANCHOR_MARGIN`／`BEAT_FRAC`／真值表判準／香火 9 支／祖靈 9 支／`sampleAnchors` 的判準**一行未動**。
`js/trait-fx.js` 的改動只有兩處：把已經存在的 `sepOf` 抽成模組層 `figSep`＋開一個唯讀的 `st.sep`。
★這一句要說得準★：抽出來的版本**不是逐字**——`boxOf(f)`（`sampleAnchors` 開頭算好的快取框）
換成 `figBoxOf(f)`（當場重算，同一幀、同一份幾何，值相同）、`boxes.length <= 1`
換成 `run.actorSet.size + run.targetSet.size <= 1`（兩者只在「有 figure 沒有 `.group`」時才會不同，
而那種 figure 在舊版 `boxOf` 回 undefined ⇒ `return false`，新版 `!f.group` ⇒ 也是 `return false`）。
**門檻（`ANCHOR_MARGIN`）與三個條件（`inView`／`clear`／掃描高度）一格未動**；
突變 B13（把 `figSep` 改成恆真）在 `--mate` 站位判紅、其餘站位仍綠，證明它是活的。

### 4.10 下一步

1. 製作人看 8 支的 `sheet-t1／t2／t2-closeup` 與 §4.7 的八題 → 簽字。
2. 簽字後跑 **P4 新三輪**（香火 9 ＋ 祖靈 9 ＋ 陰氣 9 ＝ 27 支）：材料與真值表都已交付。
3. §4.7 第 1 題（react 段的鑑別力）與第 2 題（兩支既有的紅）建議各自開一輪，
   兩者都會動到已轉正的 27 支，不塞進 P4 那一輪。
4. **本分支尚未跑對抗式覆審**（`02 §6.1` 附則）：這一份是「修補後送審」的材料，第 1 輪覆審由主對話派。
