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

### 1.1 新積木 `st.stain(pos, o)`（`js/trait-fx.js:1826`）

| 要求（語彙檔 §A8／§B3／ART_BIBLE §10.1） | 做法 |
|---|---|
| **邊緣不規則** | 半徑輪廓寫死成一張 16 格的表（`LOBE`，0.58–1.34 的倍率）。1.34／1.26／1.12 那三處是往外拖的那幾道（「末端下垂」在平面上的樣子）、0.58／0.61／0.63 是凹口。規整圓的倍率表是「全部 1.00」，這張表刻意不是 |
| **不是圓與方** | 不用 `RingGeometry`／`CircleGeometry`（`ring`／`disc` 已由 `DEPRECATED` 限縮給香火的「陣」）。主斑＋兩塊偏心小斑三塊外框合成**一個** `ShapeGeometry`（吃 shape 陣列）⇒ 不論幾塊都只多一個 draw call |
| **`ink` 外描邊** | 同一張表往內縮一個定寬（`w` 0.052）再合成第二個 `ShapeGeometry`；露出來的那一圈就是描邊。描邊在下、本體在上（`MAT_SOLID` 的 `depthWrite:false`，靠加入順序決定先後） |
| **貼桌** | `rotation.x = -π/2`、`y = TFX.tableY + 0.005`；`rotation.z` 給編舞轉方向（Euler XYZ ⇒ 先轉 z 再躺平） |
| **是「暗」斑（覆審 H3 改）** | 本體 `ink #04120c`（sRGB 相對亮度 Y≈**0.0077**）、描邊 `line` 苔綠。★第一版本體用 `line` 是錯的★：理由只比了「`line` < `key` < bloom 門檻」，但 `#6fae90` 的 Y≈**0.353**對桌面 `#6b3418` 的 Y≈**0.057** 是**比桌面亮 3.8 倍的亮斑**——那不是語彙要的暗斑。現在有機械斷言釘住（`tests/fxvocab.test.mjs`：`stain` 系別的本體色相對亮度必須低於 `scene-env.js` 的 `TABLE_COLOR`），突變 M14 驗紅。兩層都遠低於 `BLOOM.threshold` 0.7 |
| **材質模板常駐預熱** | 兩層都走 `MAT_SOLID.clone()`，與現有三支模板共用 program。實測 `prog+0`（六跑逐套），`fx-contrast` 的 `mat_programs` 仍是 `templates 3／measured 3／distinct 2` |
| **接進身分可辨** | `st.groundMark`（`:1876`）的分派表新增 `stain` 分支（`:1911`）：暗斑是**平的**，本體遮不掉它的前半（柱要立起來才需要挪 0.34），所以往鏡頭只挪 `push` 0.14–0.18。亮滅仍由積木自己排：`windup` 淡入、`travel` 末（＝`react[0]`＝衝擊拍）歸零，**不回傳 mesh**（覆審 M1 那一條照舊） |

**`st.groundMark` 原本那條「`stain` 還沒有積木就 throw」換成白名單**：
`FAC_GROUND` 之後再加新語彙、卻沒有對應積木時仍然當場 throw（不給靜默退路）。

### 1.2 範本招：魔神仔紅帽 `hauntLost`（`js/trait-fx/yinqi.js:153`）

| 三件 | 做法 |
|---|---|
| **本體動作＝探** | `HatRoot`／`Hat1`／`HatTip` 帽尖後仰（`COIL` 兩跳到底）→ **完全靜止一拍** → 猛前點（`JOLT` 三個離散位移，**第三階寫在 tween 的 `done()` 裡＝落在衝擊拍當幀**），`JawRoot`／`Jaw1`／`JawTip` 張口、`Mist*` 霧裾滯後外散。骨骼幅度沿用 0.54，時間軸整支重排到 §A1 的三拍窗上。★四尊一起演★（`redhat` 是 `count: 4`）：`point()`／`st.rim()` 走 `ghosts.forEach`，同伴幅度乘 0.82；**姿態與腳下光只給施招者**（多一份就 throw）|
| **道具＝甲 人身遺物** | **紅帽**（`st.paperStamp`，面板 `hot #ff2f3a`＝§B3「那一點刺眼的紅」，`ink` 近黑本體露出來的那一圈就是外描邊）從施招者**頭上飄起**（§10.2 第 6 條：GLB 上那頂常駐的帽子不算新增元素），**卡頓跳到受招方頭上戴住**（`st.stick` at `top`）；＋丙 鬼火與魂片：衝擊拍從被迷那尊**胸口**散出的 4 片魂片（`st.paperProps`，冷屍白青，1 個 draw call，`depth 0.18`／`warp 0.16` ＝ §A4 第 1／3 條的區間內；散開也是三階、不用 easing）|
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

