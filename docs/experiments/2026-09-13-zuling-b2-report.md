# 招式演出卷・祖靈系批 2 — 階段 A（身分可辨語彙＋範本招獻祭刀）

> 讀者：製作人與接手的 agent。
> 計畫＝`docs/proposals/2026-09-12-plan-fx-performance.md`（§3–§5 手段與閘門、§7 全部裁定、
> 檔尾「香火批 1 P4 三輪結案（裁乙）」）。語彙＝`docs/design/2026-09-12-fx-vocab-draft.md`
> （本階段新增 **§A9**，草案待簽）＋`docs/design/ART_BIBLE.md` §10.3（補了一小段）。
> 前一批＝`docs/experiments/2026-09-13-xianghuo-b1-report.md`（§5／§6／§8 是本階段的病因來源）。
>
> **worktree `agent-a1586033aeca12e41`，基準＝main `616f7ff`（v0.55.6）。未合併、未 push。
> `index.html` 一行未動、版號未上。**

---

## 1. 階段 A

### 1.0 一句話

香火批 1 P4 三輪未過的**歸因不是逐支落點**，是「施招者／受招方身分可辨」這個系統級語彙不存在。
本階段把它一次設計成**語彙（§A9）＋三個積木＋兩層機械檢查**，拿祖靈範本招**獻祭刀**當實作證明，
再把香火 9 支只套上「施招姿態＋腳下光語彙」兩件。**P4 不在本階段**（照裁定要香火與祖靈一起重跑）。

### 1.1 身分可辨語彙（§A9）的機械訊號清單

| # | 語彙條文 | 機械訊號 | 判在哪裡 |
|---|---|---|---|
| ① | 施招者的**施招姿態**（前傾／舉臂／下沉） | `lastSig.stance.kind` 非 null 且在 `STANCE_VOCAB` | `traitfx-drive` 的 `stanceOK`（進 `verdict.pass`） |
| ② | 姿態**幅度讀得出來** | `lastSig.stance.peak ≥ STANCE_GATE.minPeak`＝**0.12** | 同上（門檻由引擎端一起送出，治具不另寫一份） |
| ③ | **只有施招者**有姿態 | `st.stance` 收到受招方（`onTarget`）或第二個人（`extra`）**當場 throw** | 由建構上成立＋`stanceOK` 留帳 |
| ④ | 腳下**系別光語彙**立起來 | `lastSig.stance.ground` 非 null（祖靈 `pillar`／香火 `ring`／陰氣 `stain` 未實作＝throw） | 同上 |
| ⑤ | 光語彙**蓄勢就亮、衝擊拍熄** | 亮滅時間軸寫在 `st.groundMark` 裡：`windup` 淡入、收尾點＝`B.travel[0] + travelMs`＝`react[0]`（覆審員實算三個 tier 都精確落在 208／560／860ms）。**回傳 kind 不回傳 mesh** ⇒ 編舞碰不到它 | **由建構上成立**（`02 §6.1` 第 7 條「首選收斂」）。**已知限制**：`delay` 用絕對毫秒，只在招體同步段呼叫才對得上（JSDoc 有記） |
| ⑥ | 受益／受招反應與姿態**不同型** | `STANCE_VOCAB[stance].axis !== REACT_AXIS[react]` | `tests/fxvocab.test.mjs:298` |
| ⑦ | 已轉正的招**必須登記** `stance`，取值在白名單內 | 「已轉正」＝原始碼真的呼叫過 `st.phase(` 且無 `V054` 退路（**從原始碼推導，不是手工名單**） | `tests/fxvocab.test.mjs:284` |
| ⑧ | 登記了就**真的要演** | 函式體必須出現 `st.stance(` 與 `st.groundMark(`（迭代**推導出的**清單，不是手工名單） | `tests/fxvocab.test.mjs:310` |
| ⑨ | 三張表自身完整（沒有 `undefined` 讓⑥恆綠） | 三系 `reacts` 每一個字都要在 `REACT_AXIS` 裡；每一型 `amp ≥ minPeak` | `tests/fxvocab.test.mjs:271` |
| ⑩ | 拖線只准打擊類、方向只准「施招者→目標」 | 增益招 `st.trail(..., trail: false)` | **目前沒有機械檢查**（照實列，見 §1.8 第 3 題） |
| ⑪ | 治具棚 2v2 同伴間距 ≥1 個身位 | `blindread-sheet --mateGap=<1–3>`（不帶＝1＝不變） | **材料規格，不是判準**（P4 三題與真值一格不動） |
| ⑫ | 擺姿態的那一尊＝引擎**獨立**認定的施招者 | `stance.casterMatch`＝`run.stance.fig === run.caster`（`st.stance` 刻意不 `markCaster`，兩條證據對帳） | `stanceOK`（覆審 H2） |
| ⑬ | 姿態的峰值出現在**蓄勢段之內** | `stance.windupOK`＝`peakAt ≤ min(react[0], windup[1] + 量到峰值那一幀的步長)` 且 `!lateStart`（覆審 r2 N3 把門檻由 `react[0]` 收緊到 `windup[1]`；容差是**取樣**造成的，不是設計放寬——windup 那條 tween 的最後一次 update 必然落在下一幀，tier 1 實測 104→117，嚴格 `≤104` 對任何正確實作都恆假） | `stanceOK`（覆審 H4／r2 N3） |
| ⑭ | 腳下光與姿態**在同一尊身上** | `stance.groundSame`；`st.groundMark` 另有三條 throw（受招方／第二尊／與姿態不同尊） | `stanceOK`（覆審 H1） |
| ⑮ | 姿態**一定會在衝擊拍收回** | `st.stance` 第一次被呼叫時由**引擎**註冊包絡 tween（`w.staK` 1→0），`delay` 扣掉當下的 `run.vt` ⇒ 收尾點**真的**是 `react[0]`（覆審 r2 N2：第一版用絕對毫秒當 delay，而 `st.stance` 依設計一定從 tween 的 update 裡呼叫、`run.vt` 永不為 0，終點被往後推了一幀） | **由建構上成立**（覆審 H3；編舞寫不出「不收回」）。**殘留**：沒有任何斷言在**量**收回（`metricOf` 只讀 `w.over`／`w.mo`），見 §1.8 |
| ⑯ | `selfReact` 這個一鍵豁免不得長出第二支 | 集合必須恰好是 `swarmLastStand`，且語彙檔要有那句宣稱 | `tests/fxvocab.test.mjs:333`（突變 26） |
| ⑰ | 幅度表與語彙檔逐格相同 | 三型 `amp`／`minPeak`／軸對照都要出現在 §A9 | `tests/fxvocab.test.mjs:346`（突變 27） |
| ⑱ | 還留著 `V054` 退路的招不得登記 `stance` | 兩條排除規則的協調盲點 | `tests/fxvocab.test.mjs:367` |

`stanceOK` 的**適用範圍**與 `phasesOK` 同一條，另排掉兩態：還留著 `V054` 退路的招（`hauntLost`——
陰氣批還沒開，住在 MOVES 的是批 0 徽記版）、以及 `--fxvocab=1` 跑 `V055` 的四支。
**這不是放寬**：那兩態跑的演出比本語彙早，同一支招轉正之後 `V054` 退路會被移除、預設路徑跑的是有姿態的那一份
（而且「忘了刪 V054 區段」這個協調盲點已由 ⑱ 那條測試擋住，覆審 M9）。

### 1.2 新積木與落點

| 積木 | 落點 | 要點 |
|---|---|---|
| `st.stance(fig, kind, e, o)` | `js/trait-fx.js:1331` | 幅度唯一來源＝`STANCE_VOCAB`，編舞只能給 0..1 的 `e` 與 `strength`；走**獨立加成通道** `w.sta`（`:612`）＋**引擎自己排的收回包絡** `w.staK`（`:619`），`apply()` 疊在 `w.mo` 之上；**不呼叫 `markCaster`**（覆審 H2） |
| `st.pillar(pos, h, o)` | `js/trait-fx.js:1387` | 祖靈腳下垂直光柱。**紙紮語法**：上窄下寬的細長片 `ExtrudeGeometry` ＋露出一圈 `ink` 當墨線邊，**不用加色材質當主體**；朝向凍在 spawn 當下、**只轉 yaw**（柱要站直）；`fxKind='floor:pillar'` |
| `st.groundMark(fig, o)` | `js/trait-fx.js:1436` | 照 `FAC_GROUND` 分派；亮滅由建構上成立；三條身分 throw（覆審 H1）；**回傳 kind 字串、不回傳 mesh**（覆審 M1：回傳它就等於留了一條「再 fade 回來」的路）；柱另外往鏡頭推 0.34（貼腳底會被本體整根遮掉） |
| `st.camOff(k)` | `js/trait-fx.js:957` | 從 `xianghuo.js` 的 `camOff(st,k)` **上升到 st**（三系要用同一件事，留在系別檔就會被複製成第二份——`camDir` 覆審 r1 HIGH-1 的同一個病）。`xianghuo.js:42` 現在只是轉呼叫，那 9 支招的寫法一個字未動 |

`STANCE_VOCAB`／`REACT_AXIS`／`STANCE_GATE`／`FAC_GROUND`＝`js/trait-fx/vocab.js:226`／`:234`／`:240`／`:245`；
`MOVE_SPEC` 第四欄 `stance`（＋破軍旗的 `selfReact`）＝同檔 `:278` 起。

**`programsGrew=0`**：`st.pillar` 走 `MAT_SOLID.clone()`，與現有三支材質模板共用 program
（`traitfx-drive` 三個 tier、六跑逐套 `prog+0`；`proto-record` 量到 `programs:21`，與基準同值）。

### 1.3 範本招：獻祭刀 `eliteSelfCut`（`js/trait-fx/zuling.js:462`）

| 三件 | 做法 |
|---|---|
| **本體動作＝割** | `NeckRoot`／`Neck1`–`Neck3`／`HeadRoot` 頸下彎＋`LFront1El`／`RFront1El`／`*1Wr` 前肢收、`Withers` 抽動；衝擊拍頭橫甩、邊光 0.3→3.3 |
| **道具＝甲 骨牙石器** | **黑曜石刃**（`st.paperStamp`，`color: C.ink` 暗刃面＋`inkColor: C.key` 靛藍刃身當墨線邊＝§A4「暗面留細節、亮邊界定身分」）＋**紙血條**（`st.paperProps` 7 片窄紙條，`C.hot` 土金，從頸口飄出＝自傷的證據） |
| **受益方反應＝升** | 本隊每尊上抬＋暖邊光；**同伴**各蓄一枚刃印（`st.paperStamp` ＋ `follow`），**施招者身上是血條不是刃印** |
| **身分可辨** | 施招姿態＝**下沉**（≠ react「升」的 up 軸）＋腳下**垂直光柱**（h 1.30／w 0.26，蓄勢亮、衝擊拍熄） |
| **拖線** | **無**（`trail: false`）——增益招不得有跨場拖線 |

刃的起訖：頸邊**後上方** → 劃過頸口 → **插在腳前的地上**（不跨中線）；飛行途中往鏡頭鼓出一道弧
（兩端 `sin=0` ⇒ 起點落點不變，同香灰符的作法）。

**批 0 徽記版原地保留**：`zuling.js:959` `export const V055`（`eliteSelfCut_v055`，本體逐字取自 v0.55.6 的
MOVES，只改函式名那一行）＋`:1038` `V055_SHORT`。**0.54 退路（`V054`／`V054_SHORT`）連同轉正一起移除**
（同虎爺印的作法；要看那一版跑 `git show 616f7ff:js/trait-fx/zuling.js`）。

### 1.4 香火 9 支只改兩件

逐支只加 `st.groundMark(<施招者>)`（打點之前）＋ windup 那條 tween 的第一行 `st.stance(<施招者>, <型>, e)`，
**其餘一行未動**（`git diff` 對 `xianghuo.js` 共 +33 −2 行，其中 18 行是這 9 對呼叫、其餘是註解與 `camOff` 轉呼叫）。

| 招 | 施招者 | 姿態（軸） | react（軸） | 落點 |
|---|---|---|---|---|
| `eliteCleave` 王爺劍 | `gen` | 舉臂（up） | 退（back） | `xianghuo.js:228`／`:231` |
| `wardAtkAll1` 媽祖令旗 | `lead` | 前傾（fore） | 升（up） | `:348`／`:351` |
| `wardAbsorb4` 送王船 | `lead` | 前傾（fore） | 升（up） | `:505`／`:508` |
| `wardImmuneLost` 千里眼銅鈴 | `ringer` | 下沉（down） | 升（up） | `:668`／`:671` |
| `swarmRally` 五營旗 | `lead` | 下沉（down） | 升（up） | `:832`／`:835` |
| `biteGamble` 虎爺印 | `cat` | 前傾（fore） | 壓（down） | `:976`／`:979` |
| `wardHpFirst` 香灰符 | `monk` | 前傾（fore） | 升（up） | `:1143`／`:1146` |
| `wardRegen1` 福壽綿長 | `lamp` | 下沉（down） | 升（up） | `:1258`／`:1261` |
| `swarmLastStand` 破軍旗 | `man` | 舉臂（up） | 升（up，`selfReact`） | `:1359`／`:1362` |

### 1.5 P0–P8 逐條（全部實跑，指令原文＋實際輸出）

| 閘門 | 指令 | 結果 |
|---|---|---|
| **P0 等價**（原始輸出見 `gates.txt`） | `node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html`（`git show 616f7ff:index.html`） | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}` ✅ |
| **P1 登記表**（原始輸出見 `…-b2-evidence/gates.txt`） | `node tests/fxvocab.test.mjs` | **26 綠／0 紅**（新增七條：§A9 ①⑥⑦⑧⑨＋selfReact 豁免守衛＋幅度表對照＋V054／stance 協調）✅ |
| **P2 phase gate** | `traitfx-drive --tier=1／2／3` | **27/27**／**30/30**／**3/3**，`phasesOK` 全 true ✅ |
| **P3 對比** | `fx-contrast` ＋ `fx-contrast-metrics.py`（10 支 × t1／t2；844×390@2x、bloom 0.7、seed 7） | t2 **10/10**、t1 **10/10** ✅ |
| **P4 盲讀** | — | **不在本階段**（裁定：香火＋祖靈一起重跑新的三輪） |
| **P5 短版合身** | `traitfx-drive --tier=1` | 27/27，`eliteSelfCut` `rate=1`／`fill=0.9`／`msOK=true` ✅ |
| **P6 短版下限** | 同上的 `actionsOK` | `eliteSelfCut` acts=**8**（≥2）✅ ——積木自己排的三條 tween 已排除（覆審 C2；**同設定下「有包絡、無 `inBlock`」是 11**，8 是修後、10 是整批修補之前還沒有包絡時的數——三個數字互相一致 8+2=10、8+3=11，別把「−2」讀成「這道守衛排掉 2 條」）|
| **P7 效能**（原始輸出見 `gates.txt`） | `duel-perf perf --seed=7`（本樹 vs 基準 `616f7ff` 的 `git archive` 樹） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16=16 ✅ |
| **P8 零錯＋規則測試**（原始輸出見 `gates.txt`） | `duel-drive --seed=7`／`--seed=3` 各 4 場 ＋ 12 套規則測試 | errors **0／0**（`ver v0.55.6`）；12 套 **8／5／7／9／14／26／32／8／16／28／32／36 全綠** ✅ |

補充實跑：

```
node tests/tools/traitfx-drive.mjs … --tier=1 --fxvocab=1   → 27/27
node tests/tools/traitfx-drive.mjs … --tier=2 --fxvocab=1   → 30/30
node tests/tools/traitfx-drive.mjs … --tier=2 --count=2     → 30/30，soloReact=[]
```

`eliteSelfCut` 在 `--count=2` 下 `phases=windup:1,travel:1,react:1`（**不再是 solo**）、
`stance={"kind":"下沉","peak":0.2,"ground":"pillar","onTarget":false,"extra":0,"minPeak":0.12,"casterMatch":true,"groundSame":true,"peakAt":300,"windupOK":true,"reactAt":560}`。
10 支的 `casterMatch`／`groundSame`／`windupOK` 全 true（`peakAt` 300、`wardImmuneLost` 133，對 `reactAt` 560）。

**P3 逐支（t2，門檻 area ≥0.8%／ΔE 中位 ≥28）**——`…-b2-evidence/p3-t2/metrics.txt`：

| 招 | area% | ΔE 中位 | 招 | area% | ΔE 中位 |
|---|---|---|---|---|---|
| `eliteSelfCut` | **0.9943** | 68.35 | `biteGamble` | 1.0208 | 109.35 |
| `wardAtkAll1` | 1.9699 | 88.71 | `wardHpFirst` | 1.2471 | 77.86 |
| `eliteCleave` | 0.8768 | 65.04 | `wardRegen1` | 1.5406 | 84.45 |
| `wardAbsorb4` | 1.8647 | 82.53 | `swarmLastStand` | 0.9968 | 83.54 |
| `wardImmuneLost` | 0.97 | 85.79 | `swarmRally` | 2.5933 | 74.79 |

香火 9 支有 7 支與批 1 階段 B **逐位相同**（`wardImmuneLost` 0.97／85.79 等）⇒
加 `st.stance`／`st.groundMark` 沒有動到 L3 的量測基礎（`st.ring`／`floor:pillar` 都不在 `fxVis` 的切換名單裡）。
另兩支（`wardAtkAll1` 1.9686→1.9699、`wardHpFirst` 1.2486→1.2471）在第四位小數上微動，
成因與 §1.8 第 7 點同一個：姿態的收回讓量測幀的本體位置差了一點；兩支離門檻都還有一倍以上的餘裕。

**draw call（A6，≤ idle+25）**（原始輸出見 `gates.txt`）：`proto-record --trait=eliteSelfCut --tier=2 --step=6`
⇒ `idleCalls:150`、`peakCalls:161`（**+11**）、`peakTris:48994`、`programs:21`、`errors:0`。

**§A3 尺寸記錄（Q5，記錄項不擋批）**——`…-b2-evidence/prop-size/prop-size-t{1,2}.tsv`：

| 招 | figH | 件 | 單件峰值 | ratio | 判 |
|---|---|---|---|---|---|
| `eliteSelfCut` | 2.2372 | `emblem:knife`（黑曜石刃） | 1.1281 | **0.504** | ≤2/3 ✅ |
| `eliteSelfCut` | 2.2372 | `prop:knife`（紙血條，單件） | 0.255 | 0.114 | ✅ |
| `eliteSelfCut` | 2.2372 | `floor:pillar`（光柱） | 1.30 | 0.581 | 腳下語彙，不在這條規則範圍 |

t2 全表 18 列裡只有 1 列超標＝`swarmLastStand` 的殘旗 **0.818**（批 1 就在案，當時是 0.789）。
> ★這一格是**本階段推上去的**，不是沿用（覆審 r2 N1，HIGH）★
> H3 的修法讓「舉臂」的 `scl: 1.04` 在量測幀已經被包絡收回 ⇒ 分母 `figH` 由 1.1635 掉到 **1.1229**（−3.5%），
> 所有比值跟著上抬：殘旗 0.789→**0.818**、腳下環 0.584→0.606（t1／t2 皆然）。
> 它本來就是 `OVER`（記錄項不擋批），所以**沒有紅燈接住**——正因為沒有紅燈，才要在報告裡照實寫。
> 第一版報告寫「0.789、本階段未動它」，而證據檔在**同一個 commit 裡**被重新產生成 0.818，
> 兩份事實來源分岔；這是覆審員抓到的，已改正。

### 1.6 鑑別力（`02 §6.1`）

1. **P1 的三條新檢查各有一條突變**（`tests/fxvocab.test.mjs --mutate=`，原檔全程唯讀）：

   | 突變 | 內容 | 實跑結果 |
   |---|---|---|
   | `23` | `MOVE_SPEC.eliteSelfCut.stance` 改成 `舉臂`（與 react「升」同型） | **RED**：「施招姿態『舉臂』與反應『升』同型（up）」 |
   | `24` | 拔掉 `MOVE_SPEC.biteGamble.stance` | **RED**：「biteGamble 沒有 stance」 |
   | `25` | 在記憶體裡把 `xianghuo.js` 的 `st.stance(monk, '前傾', e);` 刪掉 | **RED**：「wardHpFirst 沒有呼叫 st.stance」 |

   三條都**紅在行為斷言上**（不是旁枝的計數／解析錯誤）。健康態 23 綠。
   既有的 22 條突變（1–3、4–20、21–22）**全部重驗，逐條仍紅**。

2. **★踩到並修掉一個「恆綠儀式」★**：把批 0 徽記版搬到 `V055` 時，我在新註解裡寫了突變 4–20 的
   **錨點字面值**（`st.iconScale(knife, …)` 那一行原文）。掃描測試是
   `src.replace(from, …)`＝只換**第一個**相符處，於是十七條繞法全部被改在**註解裡**、再被
   `noComment` 一併剝掉 ⇒ **4–20 全部 GREEN**（實測）。改掉註解不寫出原文之後，4–20 逐條回紅。
   同一個坑 `traitfx-drive` 覆審 r1 MEDIUM-1 踩過一次；教訓已寫回 `zuling.js:940` 那段註解。

3. **`stanceOK` 的反面**：這條斷言在一支**沒有**身分語彙的招上真的會紅——
   把 `hauntLost`（陰氣批未開、批 0 徽記版）納入範圍時，`--fxvocab=1 --tier=2` 當場
   **29/30**，紅的欄位是 `stanceOK:false`、`stance={"kind":null,"ground":null}`；
   把它排出範圍後 30/30。**同一組證據在有姿態的 10 支上是綠、在沒姿態的招上是紅**。

4. **`--mateGap` 的雙向實測**（材料規格，不是判準）：
   `--count=2 --foe=xianji:elite:zuling:2` 同一組參數，
   `--mateGap` 不帶 ⇒ 我方兩尊**幾乎完全重疊、看起來像一尊**；`--mateGap=1.9` ⇒ 兩尊分得開、
   施招者由光柱指認得出。兩張圖：`…-b2-evidence/mategap/gap-1.0.png` ／ `…/gap-1.9.png`
   （指令：`blindread-sheet … --only=eliteSelfCut --tiers=2 --count=2 --foe=xianji:elite:zuling:2 [--mateGap=1.9] --label`）。

5. **`w.sta` 為什麼要獨立通道（否則會恆真）**：`evalPhases` 的 `windup`／`react` 量的是 `w.mo`。
   姿態若寫進 `w.mo`，react 那條在「施招者自己擺姿勢」時就成立 ⇒ 恆真；而且既有編舞多半已經在同一條
   tween 裡寫 `st.move`／`st.spin`（`mo` 是 set 不是 add），共用就是互相覆寫。
   實測：10 支的 `phaseDetail` 與批 1 同形，`--count=2` 的 `soloReact=[]`。

### 1.6b 驗收不自驗：文件的 fresh-context read-back（`02 §6` 的「檔案／文件」那一列）

派了一個 **fresh `sonnet`**，**只給 `§A9`＋`§A1–A5`＋`ART_BIBLE §10.3` 三個檔段、不給任何對話史與報告**，
要求它複述「這份文件要我做什麼」。結果：**主線沒有偏離**（可打勾清單、門檻與唯一來源、
三個是非題的答案都複述正確），但抓到**兩處真含糊**＋三處小疑點，已全部修掉：

| # | 它讀到的問題 | 修法 |
|---|---|---|
| A（最嚴重） | §A9 標「草案待簽」，內文卻用現在式說 `stanceOK` 已進 `verdict.pass` ⇒ 讀者分不清「已經在擋批」還是「還沒接上」 | §A9 節首與 ART_BIBLE §10.3 末各加一段：**條文待簽、機械檢查已接上並實跑過**，現在鋪招就照做 |
| B | §A9-3 寫「travel 位移由**往我方後方**＋抬高提供」，但 §C1 有增益招的受益方是**前鋒**（站在前面）⇒ 往後飛就是飛離受益方 | 改寫成「通則只有兩句：① 落點在受益方身上 ② 路徑不跨中線、不從敵方出發」；「往後」降級成香火批 1 的**實測解法**，並註明「後方」指遠離中線那一側 |
| C | 「下沉 0.20 打七折仍過」那個「七折」是哪來的？ | 刪掉，改寫成「三型 amp 0.26／0.22／0.20，`e` 走到 1 就一定過；它擋的是 `strength: 0.3` 這種等於沒擺的寫法」 |
| D | §A9-1 的「適用範圍」是否也適用 §A9-2 的 P1 檢查？ | 明寫兩邊的範圍差一格（測試沒有 `--fxvocab` 這個維度），兩邊都從原始碼推導、都有活性下限 |
| E | 「我方多個」那一類要怎麼機械判斷「真值包含施招者」？ | 明寫**目前沒有機械檢查、只有人眼**（`MOVE_SPEC` 沒有效果類別欄），要補得先裁 §1.8 第 3 題 |

read-back 也確認 **§A9 與 ART_BIBLE §10.3 沒有規則不一致**（後者是精簡版、少了消歧附註）。

### 1.6c 對抗式覆審（fresh `opus` 冷讀 diff，`02 §6`／§3 的分級處置）

派了一個 **fresh `opus`**，**只給 diff 與病因事實、不給我的結論**，prompt 是「找出會讓防線失效、
或讓閘門假綠的漏洞」，並要求逐條標「真實路徑／推理」。結果：**2 CRITICAL、6 HIGH、9 MEDIUM、6 LOW**
（完整清單在覆審員落檔的 `scratchpad/adv-review.md`，含每條的 `檔案:行號` 與觸發方式）。
**CRITICAL／HIGH 八條全部修完**，逐條的修法與重驗如下。

| # | 級 | 它抓到什麼 | 修法（落點） | 重驗 |
|---|---|---|---|---|
| **C1** | CRITICAL | `emblemCasesFromSource` 回的是 `<trId>_v055` 後綴名，而比對的另一邊是真 `c.trait` ⇒ **永不相等**，「用到徽記卻 n/a」那條防線在四支示範招裡只剩 1 支有效（本批把 eliteSelfCut 從 2/4 推到 1/4）；活性下限還**接受後綴**所以照樣綠 | 後綴在 `movesMatching` 就剝掉（`traitfx-drive.mjs`），活性下限改成只認真 trId | `--fxvocab=1 --tier=2`：`sg.expected` 由 **0 → 4**（`biteGamble eliteSelfCut hauntLost wardImmuneLost`），四支 `sizeState` 全 `ok`、`missing` 空 |
| **C2** | CRITICAL | `st.groundMark` 自己排了兩條 `st.fade` → `run.acts++`，而 §A9 ③ 又強制每支已轉正的招都要呼叫它 ⇒ **`actionsOK`（acts≥2）對每一支恆真**，「只剩一個閃光的偷懶短版」再也擋不住 | 新增 `run.inBlock`：**積木自己排的** tween 不計進 F10（`trait-fx.js`） | 10 支的 `acts` 各降 2–3（`eliteSelfCut` 10→**8**、`wardHpFirst` 13→11），全部仍 ≥2 且都來自編舞本身 |
| **H1** | HIGH | `st.groundMark` **一條約束都沒有**：可以點在受招方腳下、可以兩尊各點一次，`stanceOK` 全綠（`st.foot` 連 `wrapOf` 都不走，一點痕跡不留） | 補上與 `st.stance` 同樣的三條 throw（受招方／第二尊／與姿態不同尊），並新增 `stance.groundSame` 進 `stanceOK` | 10 支 `groundSame=true` |
| **H2** | HIGH | 姿態與「道具落在誰身上」零綁定；`lastSig.stance` 不含 fig，治具連事後比對都做不到 | `st.stance` **不再呼叫 `markCaster`**（避免循環論證），新增 `stance.casterMatch`＝「擺姿態的那一尊 === 引擎獨立認定的 `run.caster`（骨骼／model 真的被動到、且不在目標名單裡）」，進 `stanceOK` | 10 支 `casterMatch=true`。**殘留**：仍不綁「道具 anchor」（見 §1.8 第 4 題） |
| **H3** | HIGH | ★真的畫錯了★ 香火 9 支的姿態**永不收回**（只有祖靈範本招手寫了收回），windup tween 死掉後 `w.sta` 停在滿幅一路到收工；「下沉」的 −0.14 大於受益上抬的 +0.05～0.07 ⇒ **受益方（治具 count=1 時就是施招者自己）畫面上往下沉**，而 `evalPhases` 只量 `w.mo`、量不到 | 姿態的收回**做進引擎**：`st.stance` 第一次被呼叫時註冊一條包絡 tween（`w.staK` 1→0），收尾點＝`react[0]`＝衝擊拍，與腳下光熄掉同一時點；`apply()` 把 `sta` 乘上 `staK`。27 支一律相同，祖靈那行手寫收回**刪掉** | 三張 sheet 重拍：react 段施招者回正並跟著上抬（改前是沉下去）；t1/t2/t3、`--count=2`、`--fxvocab=1` 五跑全綠 |
| **H4** | HIGH | 「在**蓄勢段**」一條檢查都沒有：`stance.peak` 是全程峰值、不帶時戳，把 `st.stance` 整段搬到 react 也全綠 | 記 `stance.peakAt`（峰值出現的虛擬時刻），新增 `stance.windupOK`＝`peakAt ≤ react[0]`，進 `stanceOK`（★這是**當時**的門檻，第 2／3 輪又收緊過兩次，現值見 §1.1 ⑬★） | 10 支 `peakAt=300`（`wardImmuneLost` 133）／`reactAt=560`，`windupOK=true` |
| **H5** | HIGH | §A9 ③ 迭代的是**手工名單** `CONVERTED_MUST`，而同節註解寫「不是手工名單」；第 11 支起漏填即靜默放行，而 `traitfx-drive` 的註解又說「這條由原始碼掃描擋」——兩邊互相指望 | ③ 改成迭代 `convertedMoves()`（推導），`CONVERTED_MUST` 只當活性下限 | 突變 25／28 各自驗紅 |
| **H6** | HIGH | `selfReact` 是 ② 的**一鍵豁免**，只是手填布林、不與任何東西比對，也沒有突變守它（在 `eliteSelfCut` 加上去就能讓突變 23 由紅變綠） | 新增一條測試把它釘在語彙檔 §C 的宣稱上：`selfReact` 為真的集合必須**恰好**是 `swarmLastStand`，且語彙檔裡要真的有「全 27 支唯一沒有第三方」那句話 | **突變 26**（在 `eliteSelfCut` 加 `selfReact: true`）驗紅 |

**順手修掉的 MEDIUM／LOW**（其餘照 `02 §3` 第 4 條**記錄不修**，見 §1.8）：

- **M1**（過度宣稱）：`st.groundMark` 改成**不回傳 mesh**（回傳 kind 字串）——回傳它，編舞就能再 fade 把它點回來，
  「衝擊拍熄由建構上成立」那句話就掉回「請記得不要碰」。**分母歸一，比補檢查徹底。**
  同時在 JSDoc 明寫已知限制：`delay` 用 `st.beat` 的絕對毫秒，只在**招體同步段**呼叫才對得上。
- **M4**：`mapping-HIDDEN.json` 新增 `spec` 欄，記 `mateGap`／`camdist`／`count`／`foe`／`proto`
  ——改前這幾個規格旋鈕一個都沒記，下一輪盲讀無法事後證明材料同規格。
  實測輸出：`{"mateGap":"1.9","camdist":null,"count":2,"foe":"xianji:elite:zuling:2","proto":null}`
- **M5**：新增「`STANCE_VOCAB` 的幅度與 `STANCE_GATE` 與語彙檔 §A9 逐格相同」（照 `ICON` 那一族的作法）。
  改前只有 `amp > 0`／`amp ≥ minPeak` 兩條**自我指涉**的式子——三個 amp 與 minPeak 一起乘 0.1 仍然全綠。
  **突變 27** 驗紅。
- **M9**：新增「還留著 `V054` 退路的招不得在 `MOVE_SPEC` 登記 `stance`」——兩條排除規則都放掉「有 V054 退路」的招，
  下一批忘了刪 V054 區段的那一支會**同時**逃過執行期斷言與原始碼掃描。祖靈這批是「順手刪了才沒事」，那是慣例不是機制。
- **L2**：`STANCE_VOCAB[*].move[0]`（側向分量）改前被完全忽略——「唯一一份幅度表」裡有一欄寫了沒人讀。現在三個分量都生效。
- **L4**：`--mateGap` 打成小寫或別的拼法改前會被**靜默忽略**（產出基準站位而操作者以為拉開了）。
  現在不分大小寫都接，別的拼法當場 throw。
- **L3**：`st.groundMark` 的 JSDoc 參數表改前與實際不符（漏 `w`／`taper`／`push`、把位置參數寫進 `o`）。

**突變表擴到 28 條，健康態 26 綠、28 條逐條驗紅**（輸出落檔 `…-b2-evidence/fxvocab-mutations.txt`，覆審員也獨立跑過 1–28）：
新增 26（`selfReact` 一鍵豁免）／27（幅度表與文件分岔）／28（拿掉 `st.groundMark`）。

**覆審員實驗過、判定沒有問題的幾條**（照抄它的結論，供覆核）：`st.groundMark` 的亮滅時間軸三個 tier
都精確落在 `react[0]`（208／560／860ms）；`stepMul` 預設 1＝正式路徑一個位元組不變（`js/renderer.js:113` 不傳）；
`st.camOff` 上升後表達式逐字相同；`V055.eliteSelfCut_v055` 與 v0.55.6 的 MOVES `diff` 無輸出；
N11 十七條繞法的錨點搬進 `V055` 之後仍然全紅；`w.sta` 的清場沒有洩漏；
`convertedMoves`／`bodyOf` 的解析**沒有靜默漏招風險**（活性下限的方向是過嚴）。

### 1.6d 覆審第 2 輪：反駁「已修好」（`02 §6.1` 附則，第 2／3 輪）

又派一個 **fresh `opus`**，**只給修前／修後兩個 commit 與第 1 輪清單、不給我的結論**，
prompt 是「**反駁我已修好**」並逐條要「真的修好／表面修好／沒修到」三態。
它**實跑了** 8 次 `traitfx-drive` ＋ 33 次 `fxvocab.test.mjs`，並在 gitignore 的樹副本上做反向突變。
完整清單落檔 `…-b2-evidence/adv-review-r2.md`。

**判定：6 條真的修好（C1／C2／H1／H3／H5／H6）、2 條表面修好（H2／H4）、0 條沒修到。**
「及格線有沒有搬淺」它逐處對照了 11 個判準／範圍，結論是**沒有一處是移動及格線**
（`inStanceScope` 一字未動、`stanceOK` 多三個嚴格合項、`actionsOK` 的 `>=2` 未動只是分子不再被墊高、
活性下限拿掉了 `_v055` 那個**放寬**條款、23→26 條測試只增不刪）。

它另外抓到 **1 HIGH ＋ 2 MEDIUM ＋ 2 LOW 的新問題，全部處理完**：

| # | 級 | 它抓到什麼 | 處置 | 重驗 |
|---|---|---|---|---|
| **N1** | HIGH | ★**報告與自己在同一個 commit 裡重新產生的證據檔當場矛盾**★：H3 的修法讓「舉臂」的 `scl 1.04` 在量測幀已收回 ⇒ `figH` 1.1635→1.1229，殘旗 ratio **0.789→0.818**、腳下環 0.584→0.606，而報告兩處仍寫 0.789 並宣稱「本階段未動它」。它本來就 `OVER`、不擋批，所以**沒有紅燈接住** | 兩處改正並寫明成因（§1.5 那段引言、§1.8 第 7 點），另把「要不要順手把殘旗縮回 2/3 內」列進待裁 | `prop-size` t1／t2 重跑，報告數字與證據檔一致 |
| **N2** | MEDIUM | 姿態包絡的收回終點**不是 `react[0]`**，而是「第一次呼叫 `st.stance` 當下的 `run.vt` ＋ `react[0]`」——`st.tween` 的 `start = run.vt + delay` 而 delay 用絕對 `st.beat`，而 `st.stance` 依設計一定從 tween 的 `update` 裡呼叫（`vt` 永不為 0）。它實測驗證了這條算式（延後版 horizon 1193＝633+560，逐值吻合）。⑮「由建構上成立」是過度宣稱 | `delay` 改成 `Math.max(0, B.travel[0] + TT*0.45 - run.vt)`，終點真的落在 `react[0]` | 五跑全綠；⑮ 的措辭已修正，並把「沒有斷言在量收回」寫進殘留 |
| **N3** | MEDIUM | `windupOK` 的門檻是 `peakAt ≤ react[0]`＝**寬了一整個 travel 段**，而宣稱是「在蓄勢段」；`B.windup[1]` 就在同一個物件裡，而今天 10 支全部都過 | 收緊到 `peakAt ≤ windup[1] + 一個實際的虛擬時間步長`（★第 3 輪又改用「量到峰值那一幀」的步長並夾在 `react[0]` 以內，現值見 §1.1 ⑬ 與 §1.6e★）。★那個容差是**必要的**★：tier 1 實測 `peakAt=117` 而 `windup[1]=104`——windup 那條 tween 的最後一次 update 必然落在下一幀，嚴格 `≤104` 對**任何正確實作**都恆假（`02 §6.1` 第 6 條的不變量掃描；不加容差時 tier 1 當場 **18/27**） | tier 1 **27/27**（`slack=16.7`＝一幀）；把姿態搬到 react 段仍然紅（`peakAt=743`） |
| **N4** | LOW | `run.inBlock` 是裸的 set/reset，例外會讓旗標卡在 `true` | 包成 `try/finally` | — |
| **L4 續** | LOW | 第一版的未知旗標檢查是**三項黑名單**（`--mate_gap=`／`--mateGapp=` 照樣靜默忽略）——「按已知的入口寫，不按危險的效果寫」 | 改成**白名單**：12 個認得的旗標，其餘一律 throw | 實跑 `--mate_gap=2` → 當場 throw；`--mateGap=1.9` 照跑並記進 `spec` |
| **M4 續** | LOW | `spec` 漏記 `fxvocab`（比 `mateGap` 更決定性），`count` 記的是「有沒有覆寫」而不是每案實際尊數 | 補 `fxvocab` 與 `counts`（逐案） | 實測 `{"mateGap":"1.9","camdist":null,"countOverride":2,"counts":{"eliteSelfCut":2},"foe":"xianji:elite:zuling:2","fxvocab":false,"proto":null}` |

**它判「表面修好」的兩條**：
- **H4** 經 N3 收緊後，門檻與宣稱對齊了（它同時確認「`run.vt` 與 `beatOf` 同一個座標系、`rate>1` 不會誤判」——
  那一問不是 bug）。
- **H2 仍是表面修好**：`casterMatch` 綁的是「骨骼動了誰」，**不是「道具落在誰身上」**，
  而 P4 病因的原話正是後者。這一條**沒有關閉**，已列進 §1.8 交裁（要綁得先有「道具 anchor」這個概念）。
  照 `02 §3` 第 4 條，HIGH 不得由我逕自標成「可接受風險」——所以它是**待簽的殘留**，不是已結案。

**第 2 輪之後的全套重驗（全部實跑）**：`fxvocab` 26 綠／0 紅、28 條突變逐條驗紅；
`traitfx-drive` t1 **27/27**／t2 **30/30**／t3 **3/3**／`--count=2` **30/30**／
`--fxvocab=1` t1 **27/27**・t2 **30/30**；P3 t1／t2 各 **10/10**；`trace-eq` `equal:true`；
12 套規則測試全綠；`duel-drive` seed 7／3 errors **0／0**；`duel-perf` **59.9／986**；
draw call idle 150 → peak **161（+11）**、`programs:21`；三張 sheet、真實對決、`mateGap` 對照全部重拍。

**覆審員自己列的「沒驗」**（照抄，供覆核）：H3 的**畫面**結論它沒驗（沒重拍 sheet／`fx-contrast`）；
「10 支全 true」它只驗了 3 支＋`--fxvocab=1` 的 4 支；P0／P7／P8 它沒重跑。
——這三項由我在上面那一段重驗補上（畫面＝重拍的三張 sheet，`§1.7` 的自評有逐格描述）。

### 1.6e 覆審第 3 輪（**上限輪**，`02 §6.1` 附則）

範圍只有第 2 輪那 5 條新問題，外加「有沒有把及格線搬淺」與「修 A 壞 B」。它**實跑了** 12 次治具、
28 條突變逐條重跑，並在 gitignore 的樹副本上做反向突變。落檔 `…-b2-evidence/adv-review-r3.md`。

**判定：3 條真的修好（N1／N3／L4-M4 續）、2 條表面修好（N2／N4）、0 條沒修到。**
**「N3 是不是放寬」＝不是，是加嚴**，而且它自己做了一條決定性的突變來證明：
把姿態峰值挪到 **travel 段中段**（`delay: T0+60`）⇒ `peakAt 500`，**新門檻 316.7 判紅、舊門檻 560 會放它綠**
——同一個違規，第 1 輪的門檻放過、第 2 輪的判紅。逐 tier 的收緊幅度：
t1 **208→120.7**、t2 **560→316.7**、t3 **860→476.7**（−42%／−43%／−45%）。
它也重現了「不加容差 tier 1 會 18/27」（9 條紅全是 `peakAt 117 vs windupEnd 104`＝差一次取樣），
並推導出嚴格 `≤ windup[1]` **對任何正確實作都恆假**——容差取一個步長是消掉量化誤差所需的最小值。

**它抓到的問題，全部處理完**：

| # | 級 | 它抓到什麼 | 處置 |
|---|---|---|---|
| ★程序 | — | **覆審期間我動了被審的檔**（`cb7d99a` 的容差夾限落在它量測中途），而且只改碼沒同步報告 ⇒ **N1 那個「報告與程式分岔」的形狀同一天內復發一次** | 已在本節與 §1.1 ⑬ 同步；**教訓記在這裡**：`02 §7` 說的「覆審員量到移動中的目標」這次真的發生了，下一輪要嘛等覆審收工再動、要嘛當場通知它 |
| **N4** | LOW | r2 點名**兩處** `run.inBlock`，只包了 `st.stance` 那一處；`st.groundMark` 的兩條 fade **仍是裸的 set/reset** ——正是這一批自己反覆引用的「按已知的入口寫，不按危險的效果寫」 | **收斂**成 `inBlockOf(run)` helper（`js/trait-fx.js`），兩處都改用它 ⇒「寫得出沒有 finally 的 inBlock」由建構上消失，**分母＝1** |
| **N2** | MEDIUM | `Math.max(0, …)` 是一個**沒說明、沒守衛的第二分支**：`vt_first` 超過 t1 150.8／t2 417／t3 640 時觸發，收回終點**越過衝擊拍**（H3 症狀的弱化版）。唯一掩護是 N3 的門檻，而且是間接的 | clamp 觸發時記 `run.stance.lateStart`，**直接進 `stanceOK`** ⇒ 它自己會響，不再只靠另一條門檻間接接住 |
| **N3-5 ①** | MEDIUM | 容差取的是**整套的最大步長**，不是量到峰值那一幀的 ⇒「收工前的 rate 尖峰**回頭放寬**蓄勢段的門檻」 | 改記 `run.stance.peakDvt`＝峰值那一幀的步長，`windupOK` 用它。**用後面的事鬆前面的判準**這個結構拿掉了 |
| **L4 副作用** | LOW | `docs/proposals/2026-09-11-plan-fx-legibility.md:183` 那條落檔指令帶 `--frames=6 --cell=780x360`，白名單化之後會 throw——它查證過那兩個旗標**這支從來沒讀過**（幀位與格寬照凍結檔寫死），throw 是正確效果 | 那一行已更正成實際有效的形式，並註明原委 |
| 無法確認 ③ | — | draw call／`duel-perf`／`trace-eq`／`duel-drive` **只有報告散文，證據目錄沒有落檔** | 新增 `…-b2-evidence/gates.txt`：這幾條的**指令原文＋原始 stdout**（含基準樹的 `duel-perf` 對照，以及 `--dt=50` 在本樹與基準樹都是 0/27 的低幀率對照） |

**N3-5 ② 與 N2 的殘留**（記錄，交裁）：低幀率下 `windupOK` 會退化成 `react[0]`（`Math.min` 的另一半生效），
而 `windupSlack` 雖有輸出、沒有判準在看它；`grep staK` 在治具與測試**零命中**＝沒有任何斷言在**量**收回。
兩條都要動到治具的判準結構，本階段不自己加。

**第 3 輪之後的全套重驗（實跑）**：`fxvocab` 26 綠／0 紅、28 條突變逐條驗紅；
`traitfx-drive` t1 **27/27**／t2 **30/30**／t3 **3/3**／`--count=2` **30/30**／
`--fxvocab=1` t1 **27/27**・t2 **30/30**；其餘閘門的原始輸出見 `gates.txt`。

**三輪已達上限**（`02 §6.1` 附則）。未解的清單＝§1.8 的待裁項，其中 **H2 殘留是唯一的 HIGH**
（`casterMatch` 綁「骨骼動了誰」，不是「道具落在誰身上」），照 `02 §3` 第 4 條**不由我標成可接受風險**。

### 1.7 視覺交付與自評

| 檔 | 內容 |
|---|---|
| `2026-09-13-zuling-b2-evidence/eliteSelfCut/sheet-t1.png` | 6 幀連拍，t1＝300ms（844×390@2x，每格 780×360，帶 `--label`） |
| `…/eliteSelfCut/sheet-t2.png` | 6 幀連拍，t2＝900ms |
| `…/eliteSelfCut/sheet-t2-closeup.png` | t2 近景（`--camdist=2.4`） |
| `…/eliteSelfCut/real-seed3-eliteSelfCut.png` | ★**真實對決**裡獻祭刀的衝擊拍（seed 3、20 場、`--traitshot`）★ |
| `…/eliteSelfCut/rec-t2b/eliteSelfCut-base-t2-record.json` | `proto-record` 的 draw call／三角形記錄（逐幀 PNG 已刪，畫面看 sheet 那三張） |
| `…/mategap/gap-1.0.png`、`…/gap-1.9.png` | `--mateGap` 的雙向對照（§1.6 第 4 點） |
| `…/adv-review.md` | ★對抗式覆審員的完整清單（2 CRITICAL／6 HIGH／9 MEDIUM／6 LOW，逐條檔案:行號）★ |
| `…/adv-review-r2.md` | ★第 2 輪「反駁已修好」的三態判定（6 真的修好／2 表面修好／0 沒修到＋5 條新問題）★ |
| `…/adv-review-r3.md` | ★第 3 輪（上限輪）的三態判定（3 真的修好／2 表面修好／0 沒修到；N3 加嚴的數字與決定性突變）★ |
| `…/gates.txt` | P0 trace-eq／A6 draw call／P7 duel-perf（本樹＋基準樹）／P8 duel-drive 兩 seed／12 套規則測試／低幀率對照的**指令原文與原始 stdout** |
| `…/fxvocab-mutations.txt` | 28 條突變的逐條驗紅輸出（健康態綠） |
| `…/p3-t1/`、`…/p3-t2/` | P3 的 A／B 凍幀、`shots.json`、`metrics.txt` |
| `…/prop-size/` | Q5 尺寸記錄表（t1／t2 的 tsv＋json） |

**自評兩輪（`threejs-visual-loop`，逐輪都是「拍→用 Read 打開圖看→改」）**：

- **第 1 輪**（`h 1.15／w 0.17` 光柱、刃 `0.55`、血條 `k 0.62`）看出三件：
  ① 刃在 `A` 被**畫面上緣切掉**（前兩格只看得到一角）；
  ② 光柱細得像一根竿子，在 `sheet-t1` 幾乎看不到、而且被本體整根遮住（只剩兩腿之間一條藍縫）；
  ③ 紙血條**一格都看不到**（單件 0.186 世界單位）。
  同一輪 P3 t2 也紅：area **0.3439%**（ΔE 51.89 本來就過）。
- **第 2 輪**（現況）：刃放大到 windup 末 `iconSize × 0.95`（P3 t2 → **1.073%**）、`A` 降到 `+0.18→+0.12`、
  光柱改 `h 1.30／w 0.26` 並**往鏡頭推 0.34**、血條 `k 0.85／ratio 0.22`。
  近景那張逐格讀得出：光柱立起 → 刃在頸邊 → 刃劃過頸口 → 刃插地＋血條飄出 → 光柱熄、火星爆 → 刃淡去。

**驗收清單對照**
- ✅ 施招者一眼指認得出（光柱＋下沉姿態，兩者都在衝擊拍之前）
- ✅ 道具是實體紙紮（厚度＋墨線邊＋翹曲），不是平面 billboard
- ✅ 增益招沒有任何跨場拖線
- ✅ 三件收在同一個 `react[0]`（刃插到底＝血條炸出＝本隊亮邊上抬）
- ❌ **滿編真實對決那一張上，獻祭刀幾乎看不出來**（11v8、廣角）。這與製作人 2026-09-12 的裁定一致
  （「滿編廣角下 tier 1 只是氛圍，身分靠 tier 2／3 近景」），但那條「tier 1 主角拍短暫推鏡」的待辦
  在這一支上一樣成立。
- ❌ 刃與光柱**同為靛藍**，travel 中段兩者在畫面上疊在一起（近景第 3 格），形狀分得開但顏色不分。

**效能**：桌機 `duel-perf` fps 59.9、draw call 986（visible 16）；招式峰值 +11 draw call。
**手機真機 fps 待試玩**（這是桌機數字）。

### 1.8 我看到還粗的地方 / 交製作人裁

1. ★**獻祭刀的 P4 真值要定**★：`ABILITIES.eliteSelfCut` 是「一拍自傷 1，**全場本隊** atk+2」
   ⇒ 依同一條推導（媽祖令旗「全體 atk+1」＝我方多個）應該是 **效果＝防護增益／對象＝我方多個**。
   派工書寫的是「對象＝**自己**」。**本檔沒有動任何真值表**；演出對兩者都留了訊號
   （自傷在施招者身上、增益落在本隊每一尊）。這一格要製作人定，因為它會決定 §A9-2 的措辭（下一條）。
2. ★**§A9-2 的例外被我放寬了，要覆核**★：派工書寫「施招者自己不得有受益反應（除非真值是『自己』）」，
   我寫成「除非真值的作用對象**包含**施招者（『自己』或『我方多個』）」。理由：窄版會讓
   「我方多個」這一類招**無論實作對錯都做不出來**（施招者不准有反應、卻又是受益方之一）。
3. ★**⑩「拖線只准打擊類」目前沒有機械檢查**★：語彙寫了、10 支也照做了，但沒有任何治具在量
   「這一支是增益招卻有 `MAT_LINE`」。要補的方向是把 `MOVE_SPEC` 的效果類別（打／護／偷／咒）
   也登記進去，再掃 `run.sig.meshes` 有沒有 `trail`——**那要先有效果類別這一欄，會動到真值的邊界**，
   所以本階段不自己加，交裁。
4. **陰氣的 `st.stain` 還沒有積木**：`st.groundMark` 分派到它時**當場 throw**（不給靜默退路）。
   陰氣批第一支要先補。
5. **刃與光柱同色**（上面 §1.7 的第二個 ❌）：可選的解法是把光柱改走 `line`（`#7ea8ff` 較淡）
   或把刃面改成更暗。兩者都會動到 P3 的數字，所以等製作人看過近景再定。
6. **每一支香火招的視覺沒有重新自評**：本階段對它們只加了兩件，我只看了 P3 的數字與 `traitfx-drive`
   的判定，**沒有逐支重拍 sheet 目視**。9 支的 sheet 要等 P4 材料一起產。
7. ★`swarmLastStand` 的殘旗尺寸 **0.789 → 0.818**（仍 > 2/3）★——**是本階段推上去的**：
   H3 的姿態收回讓「舉臂」的 `scl 1.04` 在量測幀已經收回，分母 `figH` 1.1635→1.1229。
   它是記錄項、不擋批，也沒有紅燈接住 ⇒ 交製作人裁「要不要在這一批順手把殘旗縮回 2/3 內」。
   `st.paperProps`／`st.paperStamp`（＋本階段新增的 `st.pillar`）仍不在尺寸鎖裡
   （README 的「已知未涵蓋」，**分母已數出來＝三條**）——沿用批 1 的狀態，本階段未動。

**覆審抓到、照 `02 §3` 第 4 條「MEDIUM／LOW 記錄不修」的殘留**（完整敘述在
`…-b2-evidence/adv-review.md`，這裡只列它們各自留下什麼風險）：

| # | 級 | 殘留的風險 | 為什麼這一輪不修 |
|---|---|---|---|
| H2 殘 | — | 姿態現在綁住了「引擎認定的施招者」（骨骼動的那一尊），但**沒有綁「道具 anchor」**：把姿態給隊友 A、道具生在隊友 B 手上，所有檢查仍綠 | 要綁得先有「道具落在誰身上」這個概念（`st.paperStamp` 的 `follow`／`st.stick` 目前不記帳）。加它是引擎層的新資料流，超出本階段範圍 ⇒ 交裁 |
| M2 | MEDIUM | `--mateGap` 對 **n≥3** 不只是改間距：`step0` 進了 `layout()`，會改排數與 fit | P4 材料是 2v2（n=2，走的是另一條），這條在材料規格的使用情境外。旗標說明已寫「同一邊相鄰兩尊的水平間距」 |
| M3 | MEDIUM | 桌緣夾限對**放大後的靜態站位**無效（`stat` 已含放大後的 lane）⇒ `--mateGap=3` 可能把人推出桌緣、沒有警告 | 建議值 1.9 實測在框內；夾限那一行是既有設計（n≤2 的靜態站位本來就允許超線），改它會動到正式路徑 |
| M6 | MEDIUM | `st.pillar` 是**全新的、不在任何尺寸防線涵蓋內**的生成路徑（不進 `SIZED`、`BLOCK_MADE` 直接豁免場景掃描），大小由編舞的 `h`／`w` 字面值決定，也沒有治具在量它 | 與 `st.paperStamp`／`st.paperProps` 同一個已知缺口（README「已知未涵蓋」）。**分母已經數出來：三條**（paperStamp／paperProps／pillar）。要補是「把 `lockIconScale` 支援 Group 與 InstancedMesh」那一卷 |
| M7 | MEDIUM | 本階段把祖靈範本招的道具也從「有鎖」的 `st.icon` 搬進 `st.paperStamp` 這個缺口。目前寫法乘積裡還留著 `st.iconSize`（**不構成第二份來源**），但若哪天寫成 `obsid.scale.setScalar(0.56)`，三道防線一條都不會響 | 同 M6。另記：`fxvocab.test.mjs` 印的「徽記 mesh 被直接縮放 0 處」是在**只認三支入口**的分母下算的，不是全域結論 |
| M8 | MEDIUM | `w.sta` 也是 set 不是 add ⇒ 同一尊被兩套招同時包裝時（hitstop 造成的重疊），後一套的姿態會蓋掉前一套；兩套的 `stanceOK` 都綠，畫面上只有一個生效 | 「當初不共用 `mo` 的理由在 `sta` 上原樣重現」這句話是對的。收工歸零已處理，缺的是同時演出期間；要修得給 `sta` 做成 per-run 的疊加層 ⇒ 引擎層，交裁 |
| L1／L5／L6 | LOW | 共用暫存 `_v` 的易碎寫法／`--reduced` 那一跑的 `stanceOK` 是空真（與 `st.move` 一致且已聲明）／Euler 三軸相加近似繞軸旋轉（與既有 `mo.r` 同一個近似） | 三條都不影響正確性，記錄不修 |
| r3 N2 殘 | MEDIUM | **沒有任何斷言在「量」姿態的收回**（`grep staK` 在治具與測試零命中；`metricOf` 只讀 `w.over`／`w.mo`）。clamp 那條分支現在會自己響（`lateStart`），但「收回有沒有真的發生」仍只由建構保證、沒有量測 | 要量得讓治具讀 `w.staK` 的軌跡，那是治具的新判準結構；三輪已達上限，交裁 |
| r3 N3-5 ② | MEDIUM | 低幀率下 `windupOK` 會**靜默退化**成 `react[0]`（`Math.min` 的另一半生效），而 `windupSlack` 雖有輸出、**沒有判準在看它** | 同上。現行所有落檔證據都是預設幀距（slack＝一幀），退化只在 `--dt=50/100` 那種低幀率跑法才會發生，而那些跑法 `rateOK` 已紅 |
| r3 程序 | — | **覆審期間我動過被審的檔**（`cb7d99a` 落在第 3 輪量測中途），而且只改碼沒同步報告 ⇒ N1 那個形狀同一天內復發 | 已同步。**教訓**：`02 §7` 的「覆審員量到移動中的目標」這次真的發生了，下一輪要嘛等它收工再動、要嘛當場通知 |

### 1.9 範圍（`git diff --stat 616f7ff..`，逐檔對應）

| 檔 | 行 | 對應哪條需求 |
|---|---|---|
| `js/trait-fx/vocab.js` | +53 −13 | 派工 1：`STANCE_VOCAB`／`REACT_AXIS`／`STANCE_GATE`／`FAC_GROUND` 四張表＋`MOVE_SPEC` 的 `stance`／`selfReact` |
| `js/trait-fx.js` | +261 −8 | 派工 1／2：`st.stance`（＋`w.sta` 通道與 `apply()`）、`st.pillar`、`st.groundMark`、`st.camOff`、`lastSig.stance` |
| `js/trait-fx/zuling.js` | +212 −127 | 派工 3：新 `eliteSelfCut` ＋ `zlBeat`；批 0 徽記版搬進 `V055`／`V055_SHORT`；`V054` 退路移除 |
| `js/trait-fx/xianghuo.js` | +33 −2 | 派工 4：9 支各加 `st.groundMark`＋`st.stance`（18 行）；`camOff` 改成轉呼叫 |
| `js/duel-figures.js` | +9 −2 | 派工 1 最後一條：`createDuelFigures` 的 `opts.stepMul`（**預設 1＝正式頁一個位元組不變**） |
| `tests/fxvocab.test.mjs` | +199 −1 | 派工 1：P1 四條新檢查＋突變 23／24／25 |
| `tests/tools/traitfx-drive.mjs` | +57 −5 | 派工 1：`stanceOK` 進總判定、`v055CasesFromSource`、`phaseCasesFromSource` 的 MUST 加 `eliteSelfCut` |
| `tests/tools/blindread-sheet.mjs` | +37 −2 | 派工 1 最後一條：`--mateGap` 轉送 |
| `tests/tools/traitfx-preview.html` | +5 | 同上：`?mategap=` 接到 `stepMul` |
| `docs/design/2026-09-12-fx-vocab-draft.md` | +新 §A9 | 派工 1：語彙草案 |
| `docs/design/ART_BIBLE.md` | §10.3 +一小段 | 派工 1 |
| `docs/proposals/2026-09-11-plan-fx-legibility.md` | 1 行 | 覆審 r3 的 L4 副作用：那條落檔指令帶的 `--frames`／`--cell` 本支從來沒讀過，白名單化後會 throw，改成實際有效的形式 |
| `docs/experiments/2026-09-13-zuling-b2-*` | 新增 | 本報告＋交付物（含三輪覆審清單、`gates.txt`、28 條突變輸出） |

> 行數含**三輪對抗式覆審的修補**（`js/trait-fx.js` 由 +137 增到 +261、`tests/fxvocab.test.mjs` 由 +122 增到 +199），
> 逐條在 §1.6c／§1.6d／§1.6e。

**`index.html` 一行未動**（P0 `bytesOld == bytesNew == 357285`、`equal:true`）。
**門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／P4 真值表一格未動。**
唯一新增的門檻是 `STANCE_GATE.minPeak = 0.12`，它**不取代任何既有判準**（windup 仍走 `PHASE_GATE`），
而是本階段新增的那件事自己的下限。

### 1.10 下一步

1. 製作人看 `sheet-t1／t2／t2-closeup／real-seed3` 四張 → 簽字（§1.8 的 1／2／5 三題要裁）。
2. 簽字後鋪祖靈其餘 8 支（`eliteOpenShot`／`wardHpFront2`／`eliteArmor`／`wardFirst`／`boltGamble`／
   `swarmHalfSplash`／`swarmThorn`／`wardHpAll1`），每支 P0–P3／P5–P8 ＋ sheet。
3. 18 支（香火 9 ＋ 祖靈 9）一起交 **P4 新的三輪**，材料帶 `--mateGap=1.9`。

---

## 2. 階段 B（其餘 8 支祖靈招＋三件系統事，2026-09-13）

> **worktree `agent-af83de3a890909c69`，基準＝main `76fc296`（v0.55.7，階段 A）。未合併、未 push。
> `index.html` 一行未動、版號未上。門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／香火真值一格未動。**

### 2.0 一句話

8 支祖靈招全部轉正（P0–P3／P5–P8 全綠），並落地階段 A 簽字裁定的三件系統事：
**道具落點 anchor**（裁定①，`casterMatch` 改綁落點）、**祖靈 P4 真值表**（裁定②）、
**香火＋祖靈 18 支的新 P4 材料**（2v2、`--mateGap=1.9`）。
anchor 這一條**當場抓到兩個真缺陷**（見 §2.2），那正是它要抓的東西。

### 2.1 系統事①：道具落點 anchor（階段 A 簽字裁定①，H2 殘結案）

階段 A 的 `casterMatch` 只綁「**骨骼動了誰**」，不綁「**道具落在誰身上**」——把姿態給隊友 A、
道具生在隊友 B 手上，A9-1 的五條全綠（報告 §1.8 的「H2 殘」，階段 A 唯一未解的 HIGH）。

| 層 | 落點 | 內容 |
|---|---|---|
| 語彙 | `docs/design/2026-09-12-fx-vocab-draft.md` **§A9-5**（新增）＋`ART_BIBLE.md` §10.3 第 4 條 | 六個取值、三條刻意的設計決定、已知未涵蓋 |
| 白名單 | `js/trait-fx/vocab.js` 的 `ANCHOR_KIND` | `caster`／`self`／`ally`／`allies`／`foe`／`foes` |
| 登記表 | 同檔 `MOVE_SPEC` 第五欄 `anchor`（18 支已轉正的都填了） | 這一招的道具**應該**落在誰身上 |
| 積木入口 | `js/trait-fx.js` 的 `regAnchor` ＋ `paperStamp`／`paperProps`／`stick` 三處呼叫 | 逐件登記 `o.anchor`；取值不在白名單當場 throw |
| 量測 | `js/trait-fx.js` 的 `figBoxOf`／`boxDistXZ`／`nearestFig`／`sampleAnchors`，掛在 `update` 迴圈 | 在**衝擊拍**（`react[0]`）量一次，取**水平最近的那一尊** |
| 留帳 | `lastSig.anchors`（`spec`／`n`／`bad`／`skipped`／`mainHit`／`mainScope`／逐件 `rows`／`figs`） | 判紅時看得出「誰站在哪、差多少」 |
| 判定 | `traitfx-drive` 的 `stanceOK` → `casterMatch`＝「姿態的尊＝施招者」**且**「道具落點＝anchor」 | 進 `verdict.pass` |
| 原始碼側 | `tests/fxvocab.test.mjs` 新增兩條 | 已轉正必填 anchor、編舞真的交給積木；`ANCHOR_KIND` 與 §A9-5 逐格相同 |

**三個刻意的設計決定**（寫在 §A9-5 裡，免得下一卷當成漏洞）：

1. **量的時點由引擎定死在衝擊拍**，編舞沒有參數改得動——挑得動時點就等於挑得動答案。
2. **「最近」量的是世界包圍盒的水平佔地，不是 `group.position`**。
   `group.position` 是腳下那一點，而低多邊形四足獸的頭頸伸出去可以超過半個身長——
   獻祭刀的刃掛在鹿的 `Neck2` 上，用腳下那一點量會判成「落在同伴身上」
   （實測 caster 0.58 vs ally 0.29，而畫面上它明明長在鹿的脖子邊）。
3. **判準是「有沒有比別人近」，不是「破完平手之後是誰」**。治具棚在 `--mateGap=1`
   （＝P4 前三輪的站位）下同一邊兩尊的佔地本來就重疊，一件掛在脖子上的刃到兩尊的距離都是 0；
   拿破平手的結果判紅，紅的是**站位**不是實作。所以判準是「到 anchor 那一側的距離 ＝ 全場最小值（±1e-6）」。
   `amb`（幾尊並列最近）照實印出來。

**主道具的判準是「落點」不是「登記的字串」**：要求的是「真值作用對象那一側真的有一件道具落下」。
獻祭刀在治具棚只有 1 尊，`allies` 就只剩施招者本人，落在他身上的紙血條就是那一件——
窄版（要求有一件**登記**成 `allies`）會讓這支招**無論實作對錯都做不出來**（`02 §6.1` 第 6 條）。

**已知未涵蓋**：腳下語彙（`o.floor` 的貼桌陣、`st.pillar`）不登記 anchor——§A3 與本條管的都是
「單件**道具**」，腳下語彙的身分由 A9-1 的 `groundSame` 管。

#### 鑑別力（`02 §6.1` 第 1 條）——`anchor-mutations.txt`

三條突變各自驗紅，**還原一律用改壞前的備份副本**（`scratchpad/_bak-vocab.js`／`_bak-zuling.js`），不用反向 sed：

| 突變 | 改了什麼 | 結果 |
|---|---|---|
| 健康態（對照） | — | **3/3 pass** |
| A | `MOVE_SPEC.biteGamble.anchor` `foe` → `allies`（宣告落我方、實際落敵方） | **0/1 pass** ✅紅 |
| B | 射日的日盤登記成 `anchor: 'caster'`（道具明明飛去對面） | **0/1 pass** ✅紅 |
| C | 百步蛇紋盾的菱紋帶落點搬回施招者身上（`lerpVectors(A, Z)` → `(A, A)`） | **0/1 pass** ✅紅 |
| 還原後（健康態必須回綠） | — | **3/3 pass** ✅綠 |

**反面也驗了**：健康態在突變前後各跑一次都是 3/3——這不是只驗「會不會紅」的反向探針。

### 2.2 anchor 當場抓到的兩個真缺陷（都已修）

| # | 招 | 症狀（機械訊號） | 修法 |
|---|---|---|---|
| 1 | `wardHpFirst` 香灰符（**香火批 1 已上線的招**） | `ally>caster✗`：金灰流只走到前鋒的 35% 再往後退 0.55，衝擊拍那一刻**水平最近的仍然是法師自己** | 灰流的終點改成前鋒頭上那一點，原本的 `via` 降級成弧的鼓出量（`xianghuo.js` 的 `ashBow`） |
| 2 | `eliteSelfCut` 獻祭刀（階段 A 的範本招） | `--count=2` 下 `caster>ally✗`：刃插在鹿的佔地**外** 0.06、卻正好落在同伴的佔地裡——「插在自己頸邊的地上」在 2v2 裡讀成「插在同伴身上」 | 落點由 `+dir*0.40` 收成 `+0.18` |

第 1 條是 P4 第 2 輪裁定「增益招的道具落點改到受益方」**沒有修乾淨**的那一支——
這正是「只靠人眼看 sheet」與「有機械量測」的差別。

### 2.3 系統事②：祖靈 P4 真值表

`docs/experiments/2026-09-13-zuling-b2-evidence/p4-truth-zuling.json`（格式同香火 `p4-truth.json`，
effect／target／faction／alt ≤1，依 `ABILITIES` 與 `MOVE_SPEC`）。**★讀者不得看★**。
香火那一份**一格未動**。

| 招 | effect | target | alt | 依據 |
|---|---|---|---|---|
| `eliteOpenShot` 射日神弓 | 打擊 | 敵方單一 | — | 「對面最壯的一隻 −1」 |
| `wardHpFront2` 百步蛇紋盾 | 防護增益 | 我方多個 | — | 「前鋒**全體** hp+2」 |
| `eliteArmor` 巴冷公主珠鍊 | 防護增益 | 我方多個 | — | 「**本隊**每拍第一次受擊 −2」 |
| `wardFirst` 祖靈之眼 | 防護增益 | 我方多個 | target＝我方單一 | `first:true` 在 `index.html:3828` 是 `pwAny(X,"first")`＝**整隊**先結算；alt 接受把 desc 的「前鋒」讀成單一那一隻 |
| `boltGamble` 雷女之火 | 打擊 | 敵方單一 | — | 「燒掉對面 **1 隻**小兵」 |
| `swarmHalfSplash` 拼板舟 | 防護增益 | 我方多個 | — | 「**本隊**受到的濺射減半」 |
| `swarmThorn` 山豬牙飾 | 打擊 | 敵方單一 | effect＝防護增益 | 機制是我方反擊被動、畫面是對打中我們那一隻的打擊（`index.html:3626` 把傷害記在 `att` 身上）——與香火 `eliteCleave` 同一條處置 |
| `eliteSelfCut` 獻祭刀 | 防護增益 | 我方多個 | — | ★製作人階段 A 簽字裁定②★「照 ABILITIES 填」；「一拍自傷 1，**全場本隊** atk+2」 |
| `wardHpAll1` 山神庇佑 | 防護增益 | 我方多個 | — | 「**全體** hp+1（含護法、作祟）」 |

### 2.4 系統事③：P4 材料（香火 9 ＋ 祖靈 9 ＝ 18 支，新的三輪的第 1 輪）

| 材料 | 路徑 | 內容 |
|---|---|---|
| A 2v2 治具棚 | `…-b2-evidence/p4-material-A-booth-x2/` | 18 支 × t1＋t2 ＝ **36 張**＋`mapping-HIDDEN.json` |
| B 2v2 近景 | `…-b2-evidence/p4-material-B-closeup-x2/` | 18 支 × t2 ＝ **18 張**＋`mapping-HIDDEN.json`（`camdist 2.4`） |

指令原文（兩份只差 `--tiers`／`--camdist`）：

```
node tests/tools/blindread-sheet.mjs <出> --only=<18 個 trId> --tiers=1,2 \
  --count=2 --mateGap=1.9 --foe=raincoat:haunt:yinqi:1,nail:elite:yinqi:1 --port=8881
```

- 兩份都**不帶 `--label`**（是給讀者的材料）。
- `mapping-HIDDEN.json` 逐列帶 `trId`／`tier`／`material`／`faction`，頂層記 `material`／`layout`／`spec`；
  `trId` 集合與兩份真值表（香火 9 ＋ 祖靈 9）**逐一相同**（實跑核對：18/18）。
- **敵方換成兩尊陰氣**（`raincoat` ＋ `nail`）：香火批 1 第 3 輪的敵方是 `bow:elite:zuling:1`，
  而這一輪祖靈也在受測，敵方若是祖靈會把 Q3「哪一系」弄混。這是材料規格，P4 的三題與真值一格不動。
- ★**讀者由主對話派，我沒有跑 P4**★：及格線（三對讀者、每格 Q1–Q3 全對、三對中 ≥2 對）照計畫 §5。

### 2.5 階段 B 逐支表（8 支）

節拍窗全部由 `st.beat` 換算，所以**衝擊拍的時點三個 tier 各只有一個值**：
`react[0]` ＝ **t1 208ms／t2 560ms／t3 860ms**（`BEAT_FRAC`，本階段未動）。
`draw call` ＝ `proto-record --tier=2` 的 `peakCalls − idleCalls`（預算 ≤ idle+25）。
`anchor` 那一欄是 `--tier=2 --count=2` 那一跑的逐件落點（`>` 右邊＝實際落在誰身上）。

| 招 | 本體動作（stance） | 道具（家族） | anchor（實測落點） | 受招／受益反應 | 衝擊拍 | draw call | P3 t2 area／ΔE |
|---|---|---|---|---|---|---|---|
| `eliteOpenShot` 射日神弓 | **張** 弓臂外撐＋頸後仰（舉臂 up） | 丁 **金色日盤**（`sun`，`paperStamp`）＋三支箭矢厚片（`paperProps`） | `foe` ／ 3 件全 `>foe` | **退** flinch＋胸口日印 | t2 560 | **+16** | 1.3398%／71.55 |
| `wardHpFront2` 百步蛇紋盾 | **扎** 下沉紮地＋盾牆一格張開（下沉 down） | 乙 **菱紋帶**（`rhomb` ×5 `paperProps`＋帶頭一枚 `paperStamp`） | `allies` ／ 3 件全 OK | **升** 上抬＋菱紋印 | t2 560 | **+19** | 1.313%／55.8 |
| `eliteArmor` 巴冷公主珠鍊 | **張**（繞）盤繞＋昂首（前傾 fore） | 乙 **琉璃珠圈**（`bead` ×7 `paperProps`＋心口一顆 `paperStamp`） | `allies` ／ 3 件全 OK | **升** 上抬＋珠印 | t2 560 | **+15** | 1.1043%／53.92 |
| `wardFirst` 祖靈之眼 | **張** 眼瞼一格全開＋眉壓（下沉 down） | 甲 **石雕眼**（`eye`，`paperStamp`） | `allies` ／ 3 件全 OK | **升** 上抬＋眼印 | t2 560 | **+17** | 2.3141%／57.51 |
| `boltGamble` 雷女之火 | **張**（撐）雙翼一格撐開＋仰頸（舉臂 up） | 丁 **鋸齒雷片**（`bolt` ×4 `paperProps`＋主雷片 `paperStamp`） | `foe` ／ 2 件全 `>foe` | **壓** 等比縮＋flinch＋雷印 | t2 560 | **+16** | 1.2113%／35.56 |
| `swarmHalfSplash` 拼板舟 | **躍** 壓浪→猛抬首、鰭全張（下沉 down） | 丙 **三道平行浪弧**（`wave` ×3 `paperProps`＋最前一道 `paperStamp`） | `allies` ／ 3 件全 OK | **升** 上抬＋浪印 | t2 560 | **+23** | 1.3006%／58.47 |
| `swarmThorn` 山豬牙飾 | **沉**（刨）低頭刨地＋拱背、牙盤轉亮（下沉 down） | 甲 **兩根獠牙**（`tusk` ×2 `paperProps`＋主獠牙 `paperStamp`） | `foe` ／ 2 件全 `>foe` | **退** flinch＋牙痕印 | t2 560 | **+16** | 1.0831%／61.48 |
| `wardHpAll1` 山神庇佑 | **沉** 四肢屈膝＋背岩隆起加倍（下沉 down） | 甲 **岩塊繞一圈**（`crag` ×6 `paperProps`＋帶頭一塊 `paperStamp`） | `allies` ／ 3 件全 OK | **升** 上抬＋岩印 | t2 560 | **+19** | 2.0406%／55.8 |

**還粗的地方（逐支）**：

| 招 | 還粗 |
|---|---|
| `eliteOpenShot` | 三支箭矢在滿編視距下疊成一根淡藍色厚片，讀成「盤旁邊有東西」而不是「三支箭」 |
| `wardHpFront2` | 五枚菱形在 `--mateGap=1` 下大半躲在盾牆後面；兩尊護法本來就重疊，看起來像一尊 |
| `eliteArmor` | 琉璃珠與 `balen` 模型自己的藍色鱗片同色系（§10.6 的模型層互撞，演出層只拉得開形狀） |
| `wardFirst` | 石雕眼的杏仁形與 `eye` 模型本身的大眼窩是同一個形（同上）；落點偏本體左上 |
| `boltGamble` | 四片雷在中距離疊成一到兩片；ΔE 中位 35.56 是 9 支裡最低（土金對紫夜空） |
| `swarmHalfSplash` | 三道弧疊成一片，讀成「一道浪」；**尺寸 ratio 1.047 超過 §A3 的 2/3**（見 §2.7） |
| `swarmThorn` | 兩根獠牙在 travel 中段疊成一個「V」；反向彈回那一段在 t1（62ms 的 react）幾乎看不到 |
| `wardHpAll1` | 六塊岩的外框都是稜角塊，與 `wardHpFront2` 的菱形在小尺寸下剪影接近 |

**共通的一條**：祖靈的腳下光柱（`st.pillar`）與八件道具**同為靛藍**，
travel 段常常兩者在畫面上疊在一起——形狀分得開、顏色不分。這是階段 A §1.8 第 5 點的同一條，範圍變大了。

### 2.6 批末驗收（全部實跑，指令原文與原始 stdout 在 `gates-b.txt`）

| 閘門 | 結果 |
|---|---|
| **P0 等價** `trace-eq` 對基準 `76fc296` | `{"bytesOld":357285,"bytesNew":357285,"equal":true}` ✅ |
| **P1 登記表** `tests/fxvocab.test.mjs` | **28 綠／0 紅**（新增兩條：anchor 必填＋編舞真的交給積木、`ANCHOR_KIND` 與 §A9-5 逐格相同）✅ |
| **P2／P5／P6** `traitfx-drive` | `--tier=1` **27/27**／`--tier=2` **30/30**／`--tier=3` **3/3**／`--tier=1 --fxvocab=1` **27/27**／`--tier=2 --fxvocab=1` **30/30**／`--tier=2 --count=2` **30/30** ✅ |
| **P3 對比** `fx-contrast` ＋ metrics（844×390@2x、bloom 0.7、seed 7） | t2 **9/9**、t1 **9/9** ✅ |
| **P4 盲讀** | **不在本階段**（材料已產，讀者由主對話派） |
| **P7 效能** `duel-perf`（本樹 vs 基準樹 `76fc296`） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16=16 ✅ |
| **A6 draw call** `proto-record --tier=2` | 8 支 **+15～+23**（預算 idle+25）✅ |
| **P8 零錯＋規則測試** `duel-drive --seed=7`／`--seed=3` 各 4 場 ＋ 12 套 | errors **0／0**（`ver v0.55.7`）；12 套 **8／5／7／9／14／28／32／8／16／28／32／36 全綠** ✅ |

### 2.7 §A3 尺寸記錄（Q5，記錄項不擋批）

`…-b2-evidence/propsize/prop-size-t{1,2}.tsv`。t1／t2 各 41 列道具，**2 列超過 2/3**：

| 招 | 件 | figH | 峰值 | ratio | 說明 |
|---|---|---|---|---|---|
| `swarmHalfSplash` | `emblem:wave` | 0.8054 | 0.8434 | **1.047** | ★本階段推上去的，交裁★ |
| `swarmLastStand` | `emblem:tornflag` | 1.1229 | 0.9184 | 0.818 | 香火批的既有記錄項，本階段未動 |

**為什麼 `swarmHalfSplash` 會超**：拼板舟的 `figH` 只有 **0.8054**，是全 27 隻裡最矮的一尊，
§A3 的上限＝0.537 世界單位；而 L3 要求 **≥0.8% 的畫面面積**。這兩條在矮的那幾尊上互斥
（香火批 1 §4.3 已記過同一個形狀，破軍旗是那一批的案例）。走的是破軍旗同一條路：
**先推近鏡頭**（`st.camOff(2.6)`，世界尺寸不動、畫面像素變多）**再放大**。
實測兩種組合：`0.35+0.26e` ＋ camOff 5.6 → ratio 0.628 合規但**浪弧卡在畫面左邊、沒有落到舟上**；
`0.35+0.62e` ＋ camOff 2.6 → area 1.3006%、落點正確、ratio 1.047 超標。**取後者，照 Q5 記錄交裁。**

另外本階段把 `ICON.markByKind` 加了一列 **`wave: 0.24`**（拼板舟的印記，預設 0.3 量出來 ratio 0.726），
並同步 `docs/experiments/2026-09-11-fx-vocab.md` 第 5 節的表（`fxvocab.test.mjs` 逐列釘住那張表）。

### 2.8 P3 的一個結構性發現（下一批會再踩）

**`fxVis`（L3 的量測對象）不切 `prop:`／`floor:` 兩個前綴**，所以「主道具只有 `InstancedMesh` 群」
的招在 P3 上量到的面積是 **0.0%**——第 1 輪 9 支只過 2 支，其中四支
（`wardHpFront2`／`eliteArmor`／`swarmHalfSplash`／`wardHpAll1`）都是這樣紅的，
另外兩支（`boltGamble`／`swarmThorn`）只量到拖尾的 0.09%。
香火批 1 的五營旗早就踩過（「中央那一面走 `st.paperStamp`，也是 L3 唯一量得到的那一件」），
但那是寫在編舞的註解裡、沒有進任何清單。修法是逐支補一件 `st.paperStamp` 主件
（帶頭的菱形／心口琉璃珠／最前面那道浪弧／帶頭的岩塊／主雷片／主獠牙），
順帶讓「一件大道具＋一群小件」的層次讀得更清楚。
**陰氣批要注意**：凡是主道具只有 `st.paperProps` 群的招，P3 一定是 0.0%。

### 2.9 視覺自評（`threejs-visual-loop`：每支一輪＋批末一輪）

第零步（治具盤點）：本專案三樣齊全，沒有另建——截圖 `blindread-sheet.mjs`／`proto-record.mjs`、
除錯鉤子 `window.__yaoshi3d`／`traitfx-preview.html`、效能 `duel-perf.mjs`／`proto-record.mjs`。

逐支各一輪（拍→用 Read 打開圖看→改），實際改掉的東西：

| 招 | 看圖看出來的 | 改法 |
|---|---|---|
| `eliteOpenShot` | ① 日盤被畫面上緣切掉 ② 箭矢一格都看不到 ③ 壓低量忘了同步進 windup 的逐幀 `worldOf`，只有第 0 幀在對的高度 | 壓低 0.55（兩處都改）、箭 `k` 1.25→2.4 |
| `wardHpFront2` | ① 垂直升起 travel 只走 1.0875／門檻 1.2481 ② 拉高到 y+1.25 後整條帶子跑出畫面左上角 ③ 光柱整根躲在又寬又矮的盾牆後面 | 改成側向掃入（`perp` 1.70）、光柱 `push` 0.95 |
| `wardHpAll1` | 六塊岩糊成一團藍 | `k` 0.95→0.42、半徑 0.56→0.92 |
| `wardFirst` | travel 太貼線（1.2669／1.2481） | `perp` 1.75→2.05 |
| `boltGamble` | 讀得出「鋸齒雷落在那一隻頭上」 | 無（一輪過） |
| `swarmHalfSplash` | ① 三道弧糊成一大片藍、佔掉半個畫面 ② 為了 §A3 縮小＋推遠之後浪弧卡在畫面左邊沒落到舟上 | `k` 1.05→0.50；主件改 camOff 2.6＋放大（§2.7） |
| `swarmThorn` | 讀得出「兩根獠牙飛出去、扎中、彈回」 | 無（一輪過） |
| `eliteArmor` | travel 太貼線（1.2929／1.2481） | `perp` 1.95→2.35 |

**批末一輪**（`batch-contact-t2.png`：8 支的 travel 中格並排）：
八件道具的剪影確實各異（八芒日盤／菱形／珠圈／杏仁眼／鋸齒雷／浪弧／獠牙／稜角岩塊），
色票統一在靛藍＋土金，打擊三支有拖尾、增益五支沒有——「一眼看出是祖靈系、而且八支互不相同」這一層成立。
兩個還粗的：① 光柱與道具同為靛藍（§2.5 的共通條）② 菱形與岩塊在小尺寸下剪影接近。

**效能**：桌機 `duel-perf` fps 59.9、draw call 986（visible 16）；招式峰值 +15～+23 draw call。
**手機真機 fps 待試玩**（這是桌機數字）。

### 2.10 交付物

| 檔 | 內容 |
|---|---|
| `…-b2-evidence/<trId>/sheet-t1.png`／`sheet-t2.png`／`sheet-t2-closeup.png` | 8 支各三張（6 幀 2×3、每格 780×360，帶 `--label`；近景 `--camdist=2.4`） |
| `…-b2-evidence/batch-contact-t2.png` | 批末整批看的那一張（8 支 travel 中格 4×2） |
| `…-b2-evidence/p3b-t1/`、`p3b-t2/` | P3 的 A／B 凍幀、`shots.json`、`metrics.txt` |
| `…-b2-evidence/propsize/prop-size-t{1,2}.tsv`／`.json` | §A3 尺寸記錄表 |
| `…-b2-evidence/gates-b.txt` | P0／P1／P2／P3／P5–P8／A6／P7 的**指令原文與原始 stdout** |
| `…-b2-evidence/anchor-mutations.txt` | anchor 三條突變的逐條驗紅輸出（健康態前後各一次） |
| `…-b2-evidence/p4-truth-zuling.json` | ★讀者不得看★ 祖靈 9 支的 P4 真值表 |
| `…-b2-evidence/p4-material-A-booth-x2/`、`p4-material-B-closeup-x2/` | 18 支 × 36 張／18 張＋`mapping-HIDDEN.json` |

### 2.11 範圍（`git diff --stat 76fc296..`，逐檔對應）

| 檔 | 對應哪條需求 |
|---|---|
| `js/trait-fx/vocab.js` | 系統事①：`ANCHOR_KIND`＋`MOVE_SPEC` 第五欄 `anchor`（18 支）＋8 支的 `stance`；`ICON.markByKind` 加 `wave` |
| `js/trait-fx.js` | 系統事①：`regAnchor`／`sampleAnchors`／`resolveAnchor`／`figBoxOf`／`boxDistXZ`／`nearestFig`、三個積木入口收 `o.anchor`、`lastSig.anchors`、`casterMatch` 改綁 |
| `js/trait-fx/zuling.js` | 8 支轉正（MOVES 換掉、SHORT 改成同一支函式）＋獻祭刀的落點回修 |
| `js/trait-fx/xianghuo.js` | 9 支補 `anchor` 登記＋香灰符的金灰流落點回修（anchor 抓到的缺陷 1） |
| `tests/fxvocab.test.mjs` | P1 新增兩條 |
| `tests/tools/traitfx-drive.mjs` | `verdict.anchors` 留帳 |
| `docs/design/2026-09-12-fx-vocab-draft.md` | §A9-5（新增） |
| `docs/design/ART_BIBLE.md` | §10.3 第 4 條 |
| `docs/experiments/2026-09-11-fx-vocab.md` | 第 5 節 `markByKind` 加一列（與 `ICON` 逐列對照的那張表） |
| `docs/experiments/2026-09-13-zuling-b2-*` | 本節＋交付物 |

**`index.html` 一行未動**（P0 `bytesOld == bytesNew == 357285`、`equal:true`）。
**門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／香火 P4 真值一格未動。**
唯一新增的判準是 anchor 那一條，它**不取代任何既有判準**（`casterMatch` 原本那一半照舊，本條是 AND 上去的）。

### 2.12 我看到還粗的地方 / 交製作人裁

1. ★**`swarmHalfSplash` 的浪弧 ratio 1.047 > §A3 的 2/3**★（§2.7）：拼板舟是全 27 隻最矮的一尊，
   §A3 上限與 L3 面積在它身上互斥。走破軍旗同一條路，照 Q5 記錄交裁。
2. ★**`swarmThorn` 的演出與 §C 散文不同**★：§C 寫「獠牙**從目標身上反向彈回**、衝擊拍『獠牙反向飛到一半』」。
   裁定① 之後衝擊拍要量得出道具落在誰身上，而「飛到一半」在 2v2 裡量到誰完全看站位——那正是 P4 三輪的病因。
   改成「衝擊拍扎進對手（anchor `foe` 量得到），`react` 段再反向彈回插在施招者腳前」。
   §C 的區分點（唯一反向飛行＝反擊）保留在餘韻那一段。**要不要改回 §C 的原寫法，交裁。**
3. ★**光柱與道具同為靛藍**★（§2.5 共通條）：階段 A §1.8 第 5 點的同一件事，範圍從 1 支變成 9 支。
   可選解法是把光柱改走 `line`（`#7ea8ff` 較淡）或把道具面板改深。**兩者都會動到 P3 的數字，交裁。**
4. **`--mateGap=1.9` 在護法×2 上仍然重疊**：P4 材料 A 的 `wardFirst` 那一張看得到兩尊幾乎疊在一起。
   這是 `duel-figures` 的排列（階段 A 覆審 M2／M3 已記）；要真的拉開得動正式路徑的站位程式碼。
5. **`p4-material` 的敵方換成兩尊陰氣**（§2.4）：香火批 1 第 3 輪用的是祖靈的射日神弓當敵方，
   這一輪祖靈在受測所以換掉。**這是材料規格的改動，交製作人覆核。**
6. **`swarmThorn` 的反向彈回在 t1 幾乎看不到**（t1 的 `react` 只有 62ms）——與階段 A「tier 1 只是氛圍」
   的裁定一致，但「tier 1 主角拍短暫推鏡」那條待辦在這一支上一樣成立。
7. **`duel-drive` 的徽記稽核在兩個 seed 上都是 `n/a`**（README 的 N-6）：預設路徑上已經沒有招走
   `st.icon` 系列了，8 支轉正之後這個缺口比階段 A 更大。要量執行期那道防線請帶 `--fxvocab=1`。
8. ★**本階段沒有跑對抗式覆審**★（`02 §6` 的第三列）：這一批的產出是 8 支編舞＋一條新機械檢查，
   照實說明——**覆審員沒有冷讀過這份 diff**。要不要補一輪，交製作人定。

### 2.13 下一步

1. 製作人看 8 支的 `sheet-t1／t2／t2-closeup` 與 `batch-contact-t2.png` → 簽字（§2.12 的 1／2／3／5 四題要裁）。
2. **18 支一起交 P4 新的三輪**：材料 A／B 已產（`p4-material-A-booth-x2`／`p4-material-B-closeup-x2`），
   真值＝香火 `p4-truth.json` ＋ 祖靈 `p4-truth-zuling.json`，讀者由主對話派。
3. 之後才是陰氣批（範本招 `hauntLost` 魔神仔紅帽）——那一批要先補 `st.stain` 積木，
   並注意 §2.8 那條（主道具只有 `paperProps` 群 ⇒ P3 面積 0.0%）。

---

## 3. 覆審 r1 修補（2026-09-13，`scratchpad/review-zuling-b2-r1.md` 282 行）

> 覆審結論：**8 支達標、門檻零 diff、閘門全部重現——成立；`anchor` 機制不成立**
> （只有「哪一邊」的鑑別力）。以下逐條三態。

### 3.1 逐條三態

| # | 級 | 覆審說的 | 判定 | 做了什麼 |
|---|---|---|---|---|
| **H-1** | HIGH | 判準是「與 caster 平手容差」不是 §A9-5 寫的「最近那一尊必須在 anchor 集合裡」。**未突變正式碼即反例**：`--count=2` 下 `eliteSelfCut` 的 `emblem:knife` 最近尊是 `ally` 卻 `ok:true`；55 件裡 25 件 `amb>1` | **真的修好** | 判準改成 `dWant + ANCHOR_MARGIN <= dOther`（見下）；`ANCHOR_MARGIN = 0.18` 寫進 `vocab.js` 並由 `fxvocab.test.mjs` 釘在 §A9-5 上；**平手判紅**；三支招的落點逐一修（見 §3.3） |
| **H-2a** | HIGH | 衝擊拍當幀道具移出場景／不在場 → 連 `skipped` 都不記 | **真的修好** | 不在場（`!parent`／`visible===false`／群體道具一個實例都沒長出來）＝**紅**並記 `missing`；突變 D 驗紅 |
| **H-2b** | HIGH | 群體道具只量容器原點 | **真的修好** | `st.paperProps` 把 `items` 掛上 `userData.fxAnchorItems`，`anchorPoints()` 逐實例取世界座標（只取 `s > 0.02` 的），**全部實例都要過**；突變 F 驗紅 |
| **H-2c** | HIGH | `follow` 型印記 20 件恆真 | **真的修好** | `follow` 改判「**黏的那一尊**在不在 anchor 集合裡」、**不計進 `mainHit` 的分子**，並加 `landings > 0` 這條（整支只有 follow ＝零鑑別力，判紅）；突變 G 驗紅。分母表寫進 §A9-5 與 §3.2 |
| **M-1** | MEDIUM | 文件 §A9-5 表格與實作對齊 | **真的修好** | §A9-5 的機械訊號表整張改寫（在場／逐實例／follow／邊距四列）＋設計決定第 4 條；`ANCHOR_MARGIN` 與判準式兩者都由測試釘住 |
| **M-3** | MEDIUM | `eliteOpenShot` 太陽球→金色日盤是 §C 分岔 | **真的修好** | 語彙 §C1 那一列加 ★註記★＋表下**註 1**（理由與交裁）；**真值一格未動** |

### 3.2 新判準與新分母

**判準**（與 §A9-5 逐字相同）：

```
dWant + ANCHOR_MARGIN <= dOther            ANCHOR_MARGIN = 0.18（世界單位）
```

`dWant`＝道具到 anchor 解出那一群的最短水平距離、`dOther`＝到**其餘每一尊**的最短水平距離。
⇒ 最近的那一尊一定在 anchor 集合裡，**而且要贏過次近的至少一個邊距；平手判紅**。

**0.18 是量出來的不是挑的**：治具棚 `--mateGap=1` 下同一邊兩尊的水平佔地**本來就重疊**
（實測 `xianji`：施招者框 `x[-1.00,0.31] z[1.10,2.50]`、同伴框 `x[-0.34,0.95] z[0.63,1.99]`，
重疊區約 0.65×0.89）。落在重疊區裡的道具**本來就分不出是誰的**——那正是要判紅的東西。
可用的「明確落在某一尊身上」的空間＝那一尊佔地露在重疊區外的那一段，實測 0.64（x 方向）；0.18 ≈ 其 28%。

**分母**（`--tier=2 --count=2`，18 支已轉正的招，`bad 0／missing 0／skipped 0`）：

| 類 | 件數 | 怎麼判 | 進 `mainHit` 的分子？ |
|---|---|---|---|
| **實體落點** | **35** | 逐取樣點（群體道具逐實例）比 `dWant + 0.18 <= dOther` | ✅ |
| **`follow` 印記** | **20** | 只判「黏的那一尊在不在 anchor 集合裡」 | ❌（恆真，不能拿來充數） |
| 合計 | **55** | | |

（`--tier=2` 不帶 `--count` 時是 35 ＋ 19 ＝ 54——少的那一件是 `wardHpFirst` 的符，
`count=1` 沒有同伴可黏，`st.stick` 不會被呼叫。）

### 3.3 新判準抓到的三支（都已修落點）

新判準一上就紅了三支——**全是正式碼、沒有突變**，也就是覆審說的「只有哪一邊的鑑別力」的實證：

| 招 | 改前 | 改法 | 改後 |
|---|---|---|---|
| `eliteSelfCut` 獻祭刀 | `emblem:knife` gap **0.067**、`prop:knife`（血條 7 片）gap **0** ——刃與血條都停在兩尊佔地的重疊區 | 加一條 `lean`＝從同伴指向施招者的水平單位向量 ×1.05，`neck`（刃與血條的共同基準）整個往那一側推；血條的散開量 0.44→0.26 | gap **0.39** ／ **0.30** ✅ |
| `wardHpFirst` 香灰符 | `prop:talis`（灰流）hit=caster、`emblem:talis` gap **0.118** | `lean`＝從法師指向前鋒 ×0.50，`head`（灰流落點）、`land`（符的飛行落點）、**以及 `st.stick` 的 `off`** 三處都加（黏上去之後逐幀被覆寫，只改前兩處等於白調） | gap **0.249** ／ **0.502** ✅ |
| `wardRegen1` 福壽綿長 | `emblem:lamp` gap **0.061** | 同上，`dst`（燈焰落點）加 `lean ×0.50` | ✅ |

**編舞側的共通紀律**（已寫進 §A9-5 設計決定第 4 條）：
**增益道具要往受益方那一側再推一段、自傷道具要往遠離同伴那一側推一段**；
`lean` 在沒有同伴時是零向量 ⇒ **`count=1` 的站位一個位元組不變**。

### 3.4 鑑別力：七條突變全部驗紅（`anchor-mutations.txt`）

還原一律用**改壞前的備份副本**（`scratchpad/_bak-{vocab,zuling,xianghuo}.js`），不用反向 sed。

| 突變 | 對應 | 改了什麼 | 結果 |
|---|---|---|---|
| 健康態（對照） | — | — | **5/5 pass** ✅綠 |
| A | 原 | `MOVE_SPEC.biteGamble.anchor` `foe`→`allies` | **0/1** ✅紅 |
| B | 原 | 射日的日盤登記成 `anchor:'caster'` | **0/1** ✅紅 |
| C | 原 | 百步蛇紋盾的菱紋帶落點搬回施招者（`lerpVectors(A,Z)`→`(A,A)`） | **0/1** ✅紅 |
| **D** | **H-2a** | 衝擊拍把日盤從畫面上拿掉（`disc.visible = false`） | **0/1** ✅紅 |
| **E** | **H-1** | 香灰符的落點退回兩尊佔地的重疊區（`lean` 0.50→0） | **0/1** ✅紅 |
| **F** | **H-2b** | 射日的箭矢把**一支實例**散回我方（局部 `+z 3.0`） | **0/1** ✅紅 |
| **G** | **H-2c** | 祖靈之眼只留 `follow` 印記（石雕眼的 anchor 登記拿掉） | **0/1** ✅紅 |
| 還原後（健康態必須回綠） | — | — | **5/5 pass** ✅綠 |

**反面也驗了**：健康態在突變前後各跑一次都是 5/5——不是只驗「會不會紅」的反向探針。

### 3.5 修補批的驗收（全部實跑，原始 stdout 在 `gates-b-r1.txt`）

| 閘門 | 結果 |
|---|---|
| P0 `trace-eq` | `equal:true`（bytes 357285，`index.html` 一行未動）✅ |
| `traitfx-drive` 全套 | `--tier=1` **27/27**／`--tier=2` **30/30**／`--tier=3` **3/3**／`--tier=1 --fxvocab=1` **27/27**／`--tier=2 --fxvocab=1` **30/30**／`--tier=2 --count=2` **30/30** ✅ |
| anchor 分母 | 35 實體落點＋20 follow ＝ 55；`bad 0`／`missing 0`／`skipped 0` ✅ |
| P3 九支 | t2 **9/9**、t1 **9/9** ✅ |
| P7 `duel-perf` | fps **59.9**、draw call **986**、visible 16（對基準 1.00／持平）✅ |
| P8 12 套規則測試 | **8／5／7／9／14／28／32／8／16／28／32／36 全綠** ✅ |
| 門檻 diff | `PHASE_GATE`／`BEAT_FRAC`／`STANCE_GATE`／seed／視口／`TRAIT_MS_BY_TIER`／香火 `p4-truth.json` **零 diff**；新增的只有 `ANCHOR_MARGIN`（本卷自己那條判準的參數，不取代任何既有判準）|

### 3.6 三件要交代的

1. ★**P4 材料要在第 2 輪重產**★：§3.3 的落點修正**只在場上有同伴時生效**（`count=2`），
   而 P4 材料 A／B 正是 `--count=2` ⇒ **已發出的第 1 輪材料與現在的程式碼不一致**。
   照協調者的指示**不重產**（讀者已在跑）；**第 2 輪材料必須重產**，否則讀者看的是舊落點。
2. **`--count=1` 的畫面沒有變**（`lean` 是零向量），所以 §2.10 的 8 支 sheet 與
   `batch-contact-t2.png` 仍然對得上現在的程式碼；會變的是 `wardHpFirst`／`wardRegen1`／
   `eliteSelfCut` 在 **2v2** 下的落點（那正是 P4 材料）。
3. **M-2／M-4／L 級只記錄不修**（`02 §3` 第 4 條）：本輪動的是判準與三支招的落點，
   沒有動效能、沒有動門檻；覆審的 M-2／M-4／L 條目留在覆審檔裡，交製作人一起看。

---

## 4. P4 新三輪第 1 輪回修（2026-09-13）

> 第 1 輪結果 **5/18 過**（`p4-blindread-x2-r1/score.txt`，答卷 `3a42bd4`）：射日神弓、雷女之火、
> 媽祖令旗、五營旗、千里眼過。效果與系別 18 支幾乎 18/18，**紅全部集中在 Q2 對象**。
> **最重要的訊號：媽祖令旗從上輪 1/18 → 18/18** ——它的旗**掃過每一尊我方**，
> 所以「我方多個」讀得出來。本輪的回修就是把那一條推廣到其餘各支。
> **門檻與真值一格未動**（`PHASE_GATE`／`BEAT_FRAC`／`STANCE_GATE`／seed／視口／
> `TRAIT_MS_BY_TIER`／兩份 `p4-truth*.json` 零 diff）。

### 4.0 一句話

A–F 六組**全部完成**，另補一支（千里眼的逐尊覆蓋）與一件材料規格（G）；
18 支在 `--tier=2 --count=2` 下 anchor 全綠、**六支「我方多個」＋王爺劍的逐尊覆蓋 2/2**；
批末全套閘門綠；第 2 輪材料已產（36＋18 張，同伴改用不同體型的同系模型）。

### 4.1 系統件：逐尊覆蓋檢查＋`zlDeliver`／`xhDeliver`

令旗為什麼會從 1/18 跳到 18/18——**因為它的道具逐尊碰到每一尊我方**。把這件事做成機械檢查：

| 件 | 落點 | 內容 |
|---|---|---|
| 逐尊覆蓋 | `js/trait-fx.js` 的 `attr()`／`cover` | 一個取樣點**決定性地**屬於哪一尊（贏過其他每一尊至少一個 `ANCHOR_MARGIN`）；run 級彙總成 `cover`。`allies`／`foes` 要 **≥2 尊不同的**、單一目標不要求 ｜★**這一格已被覆審 r2 否證並改掉**，現行判準見 §5.2★ |
| 不訂恆假的門檻 | 同檔 `sepOf()` | 先判「站位上分不分得出來」（該尊佔地的八個取樣點裡有沒有一個離其餘每一尊 ≥ 邊距）；分不出來的不計進 `coverNeed`，`coverSep` 照實印 |
| 逐尊送到 | `zuling.js` 的 `zlDeliver`／`xianghuo.js` 的 `xhDeliver` | 每一尊我方各收到一件**從施招者那邊飛過去**的實體道具，落地才 `st.stick` |

**`zlDeliver` 的三條刻意設計**：① **不 stagger**（全部對齊衝擊拍——錯開就讀成「一個一個來」）
② **是飛過去的落點，不是原地黏上的印記**（黏上去的在 anchor 量測裡恆真、畫面上也看不到「送達」）
③ **落點往那一尊那一側再推一段**（2v2 下兩尊佔地重疊）。

**兩處把「全部 N 尊」收成「≥2 尊不同的」，理由都是恆假**（`02 §6.1` 第 6 條，兩條都有實測）：

> ★更正（覆審 r2，2026-09-13）★：**下面這段的第一條是錯的，第三條也不成立**，現行判準見 §5.2。
> 覆審員用 `--count=3` 實測：拼板舟 ×3 的中間那一艘 `cover 3/2, sep 3`——它**分得出來**，
> 「恆假」的歸因是我量錯了（當時的落點推力把道具推出了它自己的佔地，不是站位做不到）。
> 而放寬之後有六支 `sep=3` 卻只要 `need=2` ⇒ **整排都收到也叫過**（全滿編假綠）。
> 現在 `allies` 改回「**每一尊 `sep` 的我方都要被碰到**」，`--count=3` 的 18 支 30/30 全綠；
> 第二條（單一目標的 `foe` 不要求逐尊覆蓋）**維持**，理由照舊並在語彙檔 §A9-5 明寫「已知未涵蓋」。
- 拼板舟 ×3 排排站：**中間那一艘**的佔地被前後兩艘夾住，任何落點都不可能同時
  「在它身上」又「離前後各一個邊距」（實測 `cover 2/3`）。
- 虎爺印（單一目標）：敵方四尊擠成一團，把大印往獵物那一側推 0.62／0.85 兩種都還是 `cover 0/1`
  （同一支在 `--count=2` 下卻是 1/1）。所以**單一目標不要求逐尊覆蓋**——
  `bad === 0` 與 `mainHit > 0` 已經說了「決定性地落在那一側」，而 P4 對單一目標問的是「單一 vs 多個」。
- 2v2 的 P4 材料上，「≥2 尊」與「全部」是同一件事。

### 4.2 逐支表

| 組 | 招 | 第 1 輪的紅 | 改了什麼 | 落點 / anchor 結果（`--count=2`） |
|---|---|---|---|---|
| **A-1** | `wardHpFront2` 百步蛇紋盾 | 自己 11/18 | 菱紋印改 `zlDeliver` 逐尊飛過去、反應同拍、菱紋帶跨距 1.2→1.84 | 實體落點 4、bad 0、**cover 2/2** |
| **A-2** | `wardHpAll1` 山神庇佑 | 自己 6/18 | 岩印改 `zlDeliver`、反應同拍、岩圈半徑 0.92→1.35（圈得住兩尊） | 4、0、**2/2** |
| **A-3** | `swarmHalfSplash` 拼板舟 | 自己 13/18 | 浪印改 `zlDeliver`、反應同拍 | 4、0、**2/2** |
| **A-4** | `eliteArmor` 巴冷珠鍊 | 自己 9/18 | 珠印改 `zlDeliver`、反應同拍、珠圈半徑 0.58→1.05 | 4、0、**2/2** |
| **A-5** | `wardFirst` 祖靈之眼 | 自己 15/18（全批最高） | 眼印改 `zlDeliver`（`lean` 1.45：`eye` 的佔地特別大）、反應同拍 | 3、0、**2/2** |
| **A-6** | `eliteSelfCut` 獻祭刀 | 自己 8／我方單一 9 | 刃印改 `zlDeliver`，**含施招者自己**（`ABILITIES` 是「全場本隊 atk+2」）；血條仍只在施招者身上（自傷的證據） | 4、0、**2/2** |
| **A-7** | `wardAbsorb4` 送王船 | 自己 12/18 | 船印改 `xhDeliver`（本系新增同款零件）、反應同拍 | 4、0、**2/2** |
| **B-1** | `wardHpFirst` 香灰符 | 自己 10/18 | 腳下環 r 0.34→0.52／peak 0.85→1.0；受益方**落地之後**才升（0.07→0.115、邊光 2.0→2.9）；施招者全程只有蓄勢與送出 | 2、0、cover 1（單一不要求） |
| **B-2** | `wardRegen1` 福壽綿長 | 自己 13/18 | 同 B-1，另把傳遞弧改短（中繼點 `-dir 1.05`→`0.45`，仍同側不跨中線） | 1＋1、0 |
| **C** | `swarmLastStand` 破軍旗 | 我方多個 10/18 | ★先查清楚哪一段真的會碰到同伴★：旗走 `-st.dir`＝正背對敵方，**一路遠離同伴**；動它的四種組合都把 travel 或 P3 弄壞（見下）。所以旗的軌跡一個位元組不動，改的是**衝擊拍的粒子**（power 1.0/n 56 → 0.55/40）與**腳下環半徑**（0.34→0.28） | 1、0 |
| **D** | `eliteCleave` 王爺劍 | 敵方單一 17/18 | 整排 flinch 由 stagger 改**同拍**（strength 1.4→1.6）；最前兩尊**各收到一塊斬痕**（`xhDeliver`，anchor `foes`）＋落地各自炸一次硃紅火花 | 3、0、**cover 0/2 → 2/2** |
| **E** | `biteGamble` 虎爺印 | 效果 9/18（防護 4／詛咒 3／偷取 2） | 金色紙錢那一層**整層拿掉**（金色在這套語彙裡讀起來像「給東西」），命中色加量 1.4/90→1.5/110；擊退 0.34→0.52；大印落點往獵物那一側推 0.85 | 4、0 |
| **F** | `swarmThorn` 山豬牙飾 | 效果 11/18（偷取 6） | 彈開的落點由「施招者腳前」改成**對手腳邊的地上**——不再有任何回到施招方的位移；扎中仍是衝擊拍 | 2＋1、0 |
| ＋ | `wardImmuneLost` 千里眼銅鈴 | （第 1 輪**過的**） | 只補「施招者也收到一份」（`bless` 由同伴改成 `st.actor`；desc 是「**本方**免疫」）⇒ cover 1/2→**2/2**。其餘一個位元組不動——不拿一支已經讀對的招去換別的寫法 | 1＋2、0、**2/2** |

**C 的四種嘗試（全部實測，留在這裡免得下一輪再試一次）**：
`-0.55` → travel 1.0933／門檻 1.2481；`-0.55` ＋抬高 1.55 → 整支飛出畫面 area 0.0；
`-1.10` → travel 1.108；`-1.42` ＋推近鏡頭 2.8 → area 0.0088（推過頭出畫面，§4.3 記過的坑）。

### 4.3 G：第 2 輪材料（同伴改用不同體型的同系模型）

| 材料 | 路徑 | 內容 |
|---|---|---|
| A 2v2 治具棚 | `…-b2-evidence/p4-material-A-booth-x2-r2/` | 18 支 × t1＋t2 ＝ **36 張** |
| B 2v2 近景 | `…-b2-evidence/p4-material-B-closeup-x2-r2/` | 18 支 × t2 ＝ **18 張**（`camdist 2.4`） |

```
node tests/tools/blindread-sheet.mjs <出> --only=<18 個 trId> --tiers=1,2 \
  --count=2 --mateGap=1.9 --mate=auto --foe=raincoat:haunt:yinqi:1,nail:elite:yinqi:1 --port=8884
```

- **新增 `--mate=auto`**（`traitfx-preview.html` 的 `?mate=<ab>:<body>`）：我方**第 2 尊起**
  換成**同系、`body` 與施招者不同、`ab` 也不同**的模型（逐案查 `MATE_BY_FAC`；
  挑到同一個模型會當場 throw）。第 0 尊永遠是施招者。
- ★**這是材料規格，不是判準**★：不帶 `--mate` 就與第 1 輪材料一個位元組不變；
  P4 的三題與兩份真值表一格不動。
- `mapping-HIDDEN.json` 逐列帶 `trId`／`tier`／`material`／`faction`，頂層記 `material`／`layout`／`spec`
  （`spec.mate = auto`、`labelled = false`）；`trId` 集合與兩份真值表**逐一相同**（18/18 實跑核對）。

### 4.4 批末驗收（全部實跑，原始 stdout 在 `gates-b-r2.txt`）

| 閘門 | 結果 |
|---|---|
| P0 `trace-eq` | `equal:true`（bytes 357285）✅ |
| `traitfx-drive` 全套 | 27/27・30/30・3/3・27/27(fxvocab)・30/30(fxvocab)・**30/30(--count=2)** ✅ |
| anchor（18 支） | `bad 0`／`missing 0`／`skipped 0`；六支「我方多個」＋王爺劍 **cover 2/2** ✅ |
| P3 18 支 | t2 **18/18**、t1 **18/18** ✅ |
| P7 `duel-perf` | fps **59.9:59.9＝1.00**、draw call **986:986**、visible 16=16 ✅ |
| P8 `duel-drive` seed 7／3 | errors **0／0**（`ver v0.55.7`，各 4 場）✅ |
| P8 12 套規則測試 | **全綠**（fxvocab 28 綠）✅ |
| §A3 尺寸 | 道具 2／35 列超過（`swarmHalfSplash` 1.047 階段 B 就在案、`swarmLastStand` 0.818 香火批既有）|

### 4.5 還粗的地方 / 交製作人裁

1. ~~★**逐尊覆蓋是「≥2 尊不同的」不是「全部 N 尊」**★（§4.1）~~
   ★**已被覆審 r2 否證、已改回「全部 `sep` 尊」**★：那次放寬的恆假歸因是量錯的，見 §5.2。
2. ~~**`zlDeliver` 的落點推出量是逐支手調的**（0.88／1.05／1.45）~~
   ★**已收斂成 `st.bodySpot`**★（覆審 r2 N-3）：手調的推力退場，落點由引擎挑，見 §5.3。
3. **C 的旗軌跡沒有動**：分析顯示它遠離同伴，四種改法都把別的閘門弄壞。
   如果第 2 輪破軍旗仍被讀成「我方多個」，下一步應該是**改站位或改同伴模型**，不是再動旗。
4. **E 拿掉的是金色粒子，不是金箔道具**：`foil`（九片金箔）仍在——它是香火系的家族訊號。
   如果第 2 輪「偷取」還在，那就要連金箔一起檢討。
5. **本輪沒有跑對抗式覆審**（`02 §6` 第三列）：這一批動了 13 支招＋一條新機械檢查，
   照實說明——覆審員沒有冷讀過這份 diff。

---

## 5. 覆審 r2 修補（2026-09-13，`scratchpad/review-zuling-b2-r2.md`；本分支第 3 輪＝最後一輪）

**SHA**：`f859c06`（程式碼與 P1）／本節與證據檔另一個 commit。
**一句話**：四條 finding 全部落到**判準本身**，不是補一條檢查——
主道具（N-4）、在場的五條（N-1）、覆蓋要「真的貼到」（N-3）、`ally`／`allies`／`self` 的單複數（繞法 i）；
逐支手調的落點推力收斂成一個積木 `st.bodySpot`；`--count=3` 由 **22/30 → 30/30**。

### 5.1 逐條三態（真的修好／表面修好／沒修到）

| 覆審條目 | 三態 | 證據（都在最終 SHA 上重跑） |
|---|---|---|
| **N-4 HIGH**：鑑別力證據沒在交付版本上重跑；C 失效、G 只是表面修好 | **真的修好** | 九條突變（A–G＋h／i）在 `f859c06` 上重跑，**9 條全紅**、健康態前後皆綠：`anchor-mutations.txt`。C 換成一條在現碼上真的違規的（長明燈＝`ally`，落點搬回施招者）；G 換成「主道具不登記 anchor」並由 `mainDeclared` 判紅。突變腳本改成**字串配不到就整支中止**（`anchor-mutations.mjs`）——N-4 的病因就是 sed 靜默沒配到 |
| └ `landings>0` 被 `zlDeliver` 的印記墊高 | **真的修好** | `landings` 只算**非 follow 的實體落點**；`anchorOK` 另要求 `mainDeclared && mainOK`。突變 G（拿掉石雕眼的 anchor）＝ `mainDecl=false` ⇒ 紅 |
| └ `fxvocab.test.mjs:354` 只要求「至少登記一件」 | **真的修好** | P1 加兩條：每支已轉正的招要標 `main`（一件都沒有＝紅）、不得明著標兩件 `main: true`。實測：把祖靈之眼的 `main: true` 拿掉 ⇒ 27 綠 1 紅 |
| **N-1 MEDIUM**：在場只堵三個已知入口（繞法 h） | **真的修好** | 改成五條（parent／父鏈 visible／世界縮放 ≥0.05／有效 opacity ≥0.05／在鏡頭視錐裡）。突變 H（衝擊拍 `st.alpha(...,0)` ＋ `scale 0.01`）＝ `miss=1 bad=1` ⇒ 紅。分母寫進語彙檔 §A9-5，並記下**已知代價**：藏一件**副件**仍量不到，證據由主道具承擔 |
| **N-3 MEDIUM**：`cover` 沒有上限（0.555 的眼也算覆蓋） | **真的修好** | `attr()` 加上限：取樣點到那一尊的佔地要 ≤ `ANCHOR_MARGIN` 才算碰到。祖靈之眼的落點重排（三枚眼各自貼在一尊身上），`--count=2`／`--count=3` 都 `cover` 滿格 |
| **「≥2 尊」的放寬被否證** | **真的修好** | 改回「**全部 `sep` 尊**」。`--count=3` 的 18 支：`bad 0`、`missing 0`、`cover` 全部等於 `coverNeed`，整跑 **30/30**（放寬時是 22/30，六支 `sep=3` 卻只要 2）。報告 §4.1／§4.5 已就地更正 |
| **繞法 i**：`ally` 送給每一尊也不紅 | **真的修好** | `ally`＝**恰好一尊**非施招者被碰到且施招者不得被碰到；`allies`＝全部 `sep` 尊；`self`／`caster`＝只有施招者。突變 I（香灰符同時送第二尊）＝ `cover 2/1` ⇒ 紅 |
| **N-2 MEDIUM**：主道具可以完全不登記 anchor | **真的修好**（走 N-4 那一條） | `main` 的原始碼側與執行期側各一道，見上 |
| **N-5**：`--count=3` 24/30 | **真的修好** | 30/30（見 `gates-b-r3.txt`） |
| **N-6 LOW**：`scratchpad/_bak-*.js` 是舊副本 | **真的修好** | 突變腳本改成**每跑一次自取備份**（`scratchpad/_mubak-*`），不再依賴任何留在樹上的舊副本 |
| **N-7 LOW**：`fx-contrast` 自己的 N11 防線在 `biteGamble` 判紅 | **沒修到**（非本卷造成） | 既有問題，照實留著 |

### 5.2 現行的 anchor 判準（一處講完；文件端在語彙檔 §A9-5，P1 逐條釘住）

1. **在場**（五條）：`obj.parent` 在／父鏈沒有 `visible === false`／世界縮放 ≥ `0.05`／
   有效 opacity ≥ `0.05`／至少一個取樣點在鏡頭視錐裡；群體道具另要有實例 `s > 0.02`。
   **主道具**不在場＝紅；其餘道具不在場＝留帳跳過（有些副件本來就排在 react 段才出現）。
2. **落在哪一側**：每個取樣點都要 `dWant + ANCHOR_MARGIN <= dOther`，平手判紅。
3. **主道具**（每支恰好一件 `main: true`）：在場＋是實體落點＋過第 2 條＋**真的貼到**真值那一側
   （到那一群佔地 ≤ `ANCHOR_MARGIN`）。`landings` 只算非 follow 的實體落點。
4. **逐尊覆蓋**：`attr(點)` 要同時「≤ `ANCHOR_MARGIN` 貼到那一尊」與「贏過其他每一尊一個邊距」；
   `allies`＝全部 `sep` 尊、`ally`＝恰好一尊非施招者且施招者沒被碰到、`self`／`caster`＝只有施招者、
   `foes`＝至少兩尊不同的敵方。`sepOf` 先擋掉「站位上根本分不出來」的情形。
5. **`foe`（敵方單一）不要求逐尊覆蓋**——治具棚四尊敵方擠成一團，這一格的證據由主道具承擔。
   ★這是目前唯一一格已知未涵蓋，語彙檔 §A9-5 與本節都寫明★。

### 5.3 落點收斂：`st.bodySpot`（一個積木取代逐支手調的 `lean`）

`st.bodySpot(fig, p)`＝把落點挪到那一尊**自己的佔地裡、離場上其他每一尊最遠、而且在畫面上**的一點。
三個「與判定端同一支」：框 `figBoxOf`、距離 `boxDistXZ`、在不在畫面上 `st.inView`（＝在場第 5 條）。

- **為什麼不是推固定一段**：推太少清不開重疊的同伴、推太多會離開受益方自己的佔地
  （實測 0.258–0.555 > `ANCHOR_MARGIN`）＝判定端與畫面上都變成「桌上浮著一件東西」。
  一個旋鈕做不到兩件事——這就是 r1 那批 `lean` 0.88／1.05／1.45／0.50 每加一支就要重調的原因。
- **時機**：編舞排在 t=0，那時每一尊的框是「手還沒舉起來」的樣子；判定量在 `react[0]`。
  會黏上去的道具一律在 `st.trail` 的 `done()`（＝衝擊拍那一幀、排在 `sampleAnchors` 之前）**重挑一次**。
- **兩段式計分**：餘裕量化成 0.01 一階（上限 1.00），同一階再比「朝不朝鏡頭」。
  只比餘裕的話，1v1 時最空的角永遠背對鏡頭，道具躲到紙紮本體後面——實測 `eliteArmor` 的 P3
  由 area 1.67／ΔE 39.5 掉到 1.27／25.1（這一條是**本輪自己踩到、自己修的**，不是覆審抓的）。
- **`st.spotRoom(fig)`**：同一支掃描回傳「這一尊還有多少自己的空間」，給編舞挑目標用。
  王爺劍改挑「各自還有空間」的兩尊——挑「彼此離最遠」會挑到被夾在中間、身上根本沒有
  一塊地方離其他敵方 ≥ 邊距的那一尊（3v3 實測 `cover 1/2`）。

### 5.4 逐支落點修補（`--count=3` 從 22/30 走到 30/30 的那 8 支）

| 招 | 3v3 下的紅 | 改了什麼 |
|---|---|---|
| 巴冷公主珠鍊 `eliteArmor` | 主道具（心口那顆）停在佔地外 0.225 | 衝擊拍把它收回施招者的佔地裡；**飛行段一個位元組不動**（L3 量 travel 中點） |
| 祖靈之眼 `wardFirst` | 第三尊的眼在畫面外（實測 1.07,1.03,2.41）＝量不到 | 落點加視錐條件（`st.inView`），畫面外的角不當候選 |
| 拼板舟 `swarmHalfSplash`／百步蛇紋盾 `wardHpFront2`／山神庇佑 `wardHpAll1` | `cover 2/3` | 同上（取樣網格改鋪在判定端用的那個框上，並過視錐） |
| 獻祭刀 `eliteSelfCut` | 刃落在**敵方**佔地裡（-0.73,-0.62、`att=foe`） | 手刻的「往同伴的反方向推 1.05」退場（它只看 `mates[0]`，3v3 會指到敵方）；改 `st.bodySpot` |
| 媽祖令旗 `wardAtkAll1` | 旗掃終點離最近的我方 0.184（門檻 0.18） | 終點收進 `sweepOrder` 最後那一尊自己的佔地裡 |
| 五營旗 `swarmRally` | 第三尊分不到任何一面旗（陣形是「五方」不是「逐尊」） | 補上「升」家族的**頭上旗印**（同家族的媽祖令旗與千里眼本來就有），陣形不動 |
| 香灰符 `wardHpFirst` | 一片灰到隔壁只剩 0.179 | 手刻的 0.50 推力退場，改 `st.bodySpot`；黏上去的 off 也跟著重挑 |
| 破軍旗 `swarmLastStand` | 身後 0.42 那一點落進同伴佔地（`wd 0 od 0`） | 收進施招者自己的佔地裡（真值是「自己」） |
| 千里眼銅鈴 `wardImmuneLost` | tier 1 的主道具在衝擊拍只剩 opacity 0.018 | 最後一段淡出往後挪 `0.22×RL`（一幀 16ms 吃掉 tier 1 的 26%） |

### 5.5 批末驗收（全部實跑，原始 stdout 在 `gates-b-r3.txt`）

| 閘門 | 結果 |
|---|---|
| P0 trace-eq（`76fc296` 的 index.html vs 本樹，seeds 1..20）| **逐位元組相等** |
| P1 `fxvocab.test.mjs` | 28 綠 0 紅（含本輪新增的兩條） |
| P2／P5／P6 drive | `--tier=1` 27/27、`--tier=2` 30/30、`--tier=3` 3/3、`--fxvocab=1` t1 27/27 t2 30/30、`--count=2` 30/30、**`--count=3` 30/30** |
| anchor（18 支） | `--count=2` 61 件 bad 0 miss 0／`--count=3` 71 件 bad 0 miss 0；`cover` 全部等於 `coverNeed` |
| anchor 鑑別力 | 9 條突變全紅、健康態前後皆綠（同一個 SHA） |
| P3 fx-contrast | t2 **18/18**、t1 **18/18**（指標）｜★**更正（覆審 r4 MEDIUM-2）**：同一份證據的 `shots.json` 裡 `sizeGuard.measured=false`、`failed=["eliteSelfCut","wardImmuneLost","biteGamble"]`——N11 那一格在**四支示範招上三態顛倒**，當時只摘了 metrics 的 `pass 18` 就記成全綠。詳見 §7.1 |
| P7 duel-perf（本樹／基準樹）| fps 59.9:59.9、draw call 986:986、visible 16:16、errors 0 |
| P8 duel-drive seed 7／3 | errors 0、duels 4／4 |
| P8 12 套規則測試 | 全綠 |
| §A3 尺寸 | 道具 2／36 列超過（與前一輪相同的兩件，記錄項不擋批） |

### 5.6 還粗的地方 / 交製作人裁

1. **`foe`（敵方單一）的逐尊覆蓋仍未涵蓋**（§5.2 第 5 條）：治具棚四尊敵方擠成一團，
   要求「只碰到一尊」是站位造成的紅。這一格靠主道具擔保「落在敵方那一側」。
2. **`st.bodySpot` 用的是衝擊拍**前一步**的站位**：`done()` 在 tween 迴圈裡跑，
   而同一幀的 wrap（受招方的位移）在它之後才套用，所以挑點時看到的是上一幀的框。
   實測差距在 0.1 以內，目前靠「挑最空的那一點」本身的餘裕吸收；要根治得讓 `st.stick`
   支援逐幀重算的 off，那是引擎層的改動，本輪沒做。
3. **P4 的第 2 輪材料是在 `97df9fa` 的樹上產的**（讀者已在跑，依裁示不重產）：
   本輪改了 9 支招的落點與 1 支的淡出時間，**讀者看到的畫面與現碼不完全相同**。
   第 2 輪的答卷要照這一點解讀；要對齊就得重產材料再讀一輪。
4. **首頁版本字串沒動**（`0.55.7`）：本分支自 `76fc296` 起的所有 commit 都沒有動它，
   合併時再一次寫版本註記比較不會分岔——交製作人決定。
5. **本輪仍未跑對抗式覆審**：這一份是「修補後送審」的材料（`02 §6.1` 附則），
   第 3 輪覆審由製作人派。

---

## 6. 覆審 r3 修補（R-1／R-2）＋ P4 第 3 輪回修（2026-09-13）

**基準**：本分支已合併進 main（`ea2a38f`＝v0.55.8），本節的工作是**合併後的最後一批**，
起點 `git merge main`（fast-forward，無衝突）。覆審 r3（`scratchpad/review-zuling-b2-r3.md`）
判「有條件可合併」，兩條條件（語彙檔 §A9-5 補正、首頁版本字串）與兩條 MEDIUM（R-1／R-2）都在本節收掉。
**首頁版本字串**：~~`0.55.8` → `0.55.9`~~ ★**已還原**（覆審 r4 LOW-1：版本字串由主對話在合併時 bump）★；`index.html` 現在與 main 逐位元組相同。

### 6.1 R-1／R-2／R-3／R-4 三態

| 條目 | 三態 | 證據 |
|---|---|---|
| **R-1 MEDIUM**：`cover` 的第二個入口（`follow` 印記）不做在場檢查 | **真的修好** | `js/trait-fx.js` 的 follow 分支先過 `anchorShown`（同一組五條），不在場＝`follow-gone`、留帳跳過、**不計 `cover`**。突變 **J**（千里眼鈴印 `visible = false`）＝ `cover 0/2` ⇒ 紅（覆審自己的探針在改前是 `2/2` 全綠）。★同時抓到本卷自己的一個洞★：r2 補給五營旗的三枚頭上旗印**只建物件、沒排淡入**（`opacity: 0` 一路到底），改前靠「看不見也算覆蓋」撐著 `cover 3/3`；R-1 一上線就露出 `follow-gone ×3`，已補上與同家族一致的亮滅 |
| **R-2 MEDIUM**：`foe` 整格豁免逐尊覆蓋、而被豁免那一支的餘裕只有 0.002 | **真的修好** | `foe` 改成 `need = 1`：問的是「**我打的那一尊**分不分得出來」（`sepOf(mainFig, 主道具高度)`），分得出來就要求覆蓋。`biteGamble` 由 `cover 0/1`、`mainD 0.178`（門檻 0.18，餘裕 0.002）變成 **`cover 1/1`、`mainD 0`、`od 1.87`**。突變 **K**（大印落在兩隻敵方中間）⇒ 紅 |
| **R-3 LOW**：§A9-5 的分母過期（55／35／20）、欄位名 `mainHit` 已不存在 | **真的修好** | 改成三個站位的**實測值**：`--count=2` 61（51／10／跳過 2）、`--count=3` 71（58／13／跳過 1）、P4 材料站位 61（51／10／跳過 3）；欄位名改 `mainOK`／`mainD` |
| **R-4 LOW**：證據腳本寫死 worktree 絕對路徑、只檢查「找不找得到」 | **真的修好** | `anchor-mutations.mjs` 由**本檔位置**解 repo 根（合併後照樣跑得起來），並要求每條突變的字串**恰好出現 1 次**（出現 0 次或 2 次一律整支中止）。實跑時它當場擋下一條失效的突變（C 的字串在 (d) 改完後不存在），逼我改對再跑 |
| **R-5 LOW**：`--mate=auto` 會提高 P4 通過機率，兩輪數字不可直接比 | **記錄（照辦）** | 寫在本節 §6.3 與 §6.6：第 1 輪（同體型同伴）與第 2／3 輪（`--mate=auto`）的讀者數字**不可直接比較** |
| 交裁②：`st.bodySpot` 看的是衝擊拍**前一步**的站位 | **部分修好** | `spotScan` 進場先跑一次 `run.wraps.forEach(apply)`（冪等）把**這一幀已累積**的姿態套上去再量；但 react 段那些**還沒跑到第一次 `update`** 的 tween 仍然看不到（虎爺印實測仍差 0.155）。這一輪改用「挑獵物時就避開站不開的那一隻」把它繞過去，根治要讓 `st.stick` 支援逐幀重算 off，照舊記為未做 |

### 6.2 判準這一輪動了什麼（三處，全部是**加嚴或對齊**，附前後實測）

1. **`follow` 印記要在場**（R-1）：多一條要求。`cover` 的兩個入口現在用**同一組**在場五條。
2. **`foe` 不再整格豁免**（R-2）：由 `need = 0` 變 `need = 1`（被打中的那一尊要被決定性碰到）。
3. **`sepOf` 與編舞挑落點用同一支掃描**（`run.spotScan`）：
   改前是另寫一份「框角、只比同一側、不管在不在畫面上」，與 `attr()`／`st.bodySpot` 都不同座標系，
   於是會訂出**恆假**的門檻（虎爺印的獵物：舊版說「分得出來」，而挑點實際找得到的最好只有 0.172／或在畫面外）。
   ★前後對照（`--count=2`／`--count=3`，18 支逐支）★：`allies`／`ally`／`self`／`foes` 的 `sep` 與 `need`
   **一格沒變**（2/2、3/3、1/1、2/2 照舊）；唯一變的是 `biteGamble` 的 `sep` 4 → 3。
   ⇒ 這一處不是放寬，是把「問的問題」對齊；放寬的那一格（`foe`）在第 2 點反而被加嚴。
   逐支對照落檔：`sep-before-after.txt`（36 列裡 28 列逐字相同，其餘 8 列是 `foe` 的 need 0 → 1）。

### 6.3 P4 第 3 輪回修（a）–（e）

第 2 輪（`p4-blindread-x2-r2/score.txt`，6/18 過）逐題數字是本輪的依據；
★第 1 輪與第 2／3 輪的數字不可直接比較★（第 2 輪起材料改 `--mate=auto`，覆審 r3 R-5）。

| # | 做了什麼 | 量到什麼（`--tier=2 --count=2 --mate=auto --mategap=1.9 --foe=…`＝**材料實際的站位**） |
|---|---|---|
| **(a)** 六支「我方多個」仍被讀「自己」（對象 9–13/18） | 受益反應拉到語彙幅度上限：上抬 0.085–0.13 → **0.17**（＝`STANCE_VOCAB` 裡最大的垂直量 `舉臂 move.y`）、邊光 2.4 → **3.2**，兩尊**同一拍**（`delay: R0`，本來就是）；每一尊收到的道具改成 `max(印記尺寸, 施招者主道具的峰值)`（新參數 `o.like`），**不得比施招者那一件小** | 六支的 `anchorOK` 全 1、`cover` 全滿；`--count=3` 也 30/30。尺寸由 `prop-size` 記錄：§A3 超過的仍是原本那兩件（拼板舟浪弧 1.047、破軍旗殘旗 0.818），**沒有因為放大而多一件** |
| **(b)** 媽祖令旗 18/18 → 6/18 退步歸因 | ★歸因（新增 `--mate` 到 `traitfx-drive`，用**材料的同伴設定**量）★：覆審 r2 把旗掃的終點收進「`sweepOrder` 最後那一尊」＝**施招者**，於是全場最大的那面旗在衝擊拍停在施招者身上（實測 `att=caster`），同伴只剩一枚小旗印。改成**從自己的桿上甩出去、掃過去、停在最後一尊同伴身上** | 旗的主道具 `att` 由 `caster` 變 **`ally`**（`wd 0.023`／`od 1.529`）；`cover 2/2` |
| **(c)** 虎爺印效果 7/18（偷取 7） | ~~改成只在「遠離施招者」的半平面散開~~ ★**當時沒修到**（覆審 r4 HIGH-1）：那個「畫面左右」基底在對決機位下與對決軸平行，限制形同不存在，實測仍有一片朝我方 -0.058。已在 §7 修好並補上機械斷言 | 見 §7.2 |
| **(d)** 香灰符／福壽「我方單一」（對象 8/18、7/18） | 同伴反應同樣拉到 0.17／3.2；**福壽的手刻推力（0.50）退場**改 `st.bodySpot`——用材料的同伴設定實測，固定量推不到**換了體型**的新同伴身上（燈焰 `wd 0.287` 判紅）。施招者腳下光**由積木保證在衝擊拍熄**（`st.groundMark` 的亮滅時間軸寫在引擎裡，編舞改不到），本輪不需要也不得再排第二份 | 香灰符：符與灰流全部 `att=ally`；福壽：燈焰 `wd 0` `att=ally`、`cover 1/1` |
| **(e)** 山豬牙飾（效果 16/18，其中偷取） | ~~改成往「畫面左右」彈開~~ ★**當時沒修到**（覆審 r4 HIGH-1）：同一條假的橫向基底，彈開終點**淨朝我方 -0.18**（改前 -0.30，只縮了幅度）。已在 §7 修好。`camPush`（主獠牙不再被推出畫面）那一半是真的修好 | 見 §7.2 |

### 6.4 第 3 輪材料（真值一格未動）

| 材料 | 路徑 | 內容 |
|---|---|---|
| A 2v2 治具棚 | `…-b2-evidence/p4-material-A-booth-x2-r3/` | 18 支 × t1＋t2 ＝ **36 張** |
| B 2v2 近景 | `…-b2-evidence/p4-material-B-closeup-x2-r3/` | 18 支 × t2 ＝ **18 張**（`camdist 2.4`） |

```
node tests/tools/blindread-sheet.mjs <出> --only=<18 個 trId> --tiers=1,2 \
  --count=2 --mateGap=1.9 --mate=auto --foe=raincoat:haunt:yinqi:1,nail:elite:yinqi:1 --port=8884
```

- `mapping-HIDDEN.json` 逐列帶 `trId`／`tier`／`material`／`faction`，頂層記 `material`／`layout`／`spec`
  （`spec.mate = auto`、`spec.mateGap = 1.9`、`labelled = false`）；`trId` 集合與兩份真值表**逐一相同**（18/18 實跑核對）。
- **兩份真值表零 diff**（`p4-truth-zuling.json`、香火批的 `p4-truth.json`）。
- ★材料是在**本節全部改完之後**重產的★：r3 覆審點名「材料與現碼不一致」兩度發生，這一輪把重產排在最後。
- **同伴模型對照表搬到 `tests/tools/fx-mate.mjs`**：`blindread-sheet`（產材料）與 `traitfx-drive`（量 anchor）
  共用同一份——(b) 的歸因就是靠「量測端也能站在材料的站位上」才做得出來。

### 6.5 批末驗收（全部實跑，原始 stdout 在 `gates-b-r4.txt`）

| 閘門 | 結果 |
|---|---|
| P0 trace-eq（main 的 `index.html` vs 本樹，seeds 1..20）| **逐位元組相等**（版本字串改動之後再跑一次，仍相等） |
| P1 `fxvocab.test.mjs` | 28 綠 0 紅（本輪再加一條：§A9-5 必須寫出 `follow` 印記不在場的處置） |
| P2／P5／P6 drive | t1 27/27、t2 30/30、t3 3/3、`--fxvocab=1` t1 27/27 t2 30/30、`--count=2` 30/30、`--count=3` 30/30 |
| **P4 材料站位**（新增） | `--count=2 --mate=auto --mategap=1.9 --foe=…` **30/30**（改前 28/30：媽祖令旗停在施招者、福壽推不到新同伴、山豬牙飾主道具出畫面） |
| anchor 鑑別力 | **11 條突變全紅**（A–I ＋ R-1 的 J ＋ R-2 的 K），健康態前後皆綠 |
| P3 fx-contrast | t2 **18/18**、t1 **18/18**（指標）｜★**更正（覆審 r4 MEDIUM-2）**：同一份證據的 `shots.json` 裡 `sizeGuard.measured=false`、`failed=["eliteSelfCut","wardImmuneLost","biteGamble"]`——N11 那一格在**四支示範招上三態顛倒**，當時只摘了 metrics 的 `pass 18` 就記成全綠。詳見 §7.1 |
| P7 duel-perf（本樹／基準樹 `76fc296`）| draw call 986:986、fps 59.9:59.9、visible 16:16、errors 0 |
| P8 duel-drive seed 7／3 | errors 0、duels 4／4 |
| P8 12 套規則測試 | 全綠 |
| §A3 尺寸 | 道具 **2／36** 列超過（與上一輪相同的兩件）。★中途踩到一次★：五營旗的頭上旗印放大到「不小於那面旗」時 ratio 0.942（`wuying` figH 只有 1.0645），收回 `markSize × (1.02→0.92)` 之後 0.613 |

### 6.6 還粗的地方 / 交製作人裁

1. **`st.bodySpot` 仍看不到「這一幀還沒跑過的 react tween」**（交裁② 只修一半，見 §6.1）：
   現在的處置是「挑目標時就避開站不開的那一隻」（王爺劍、虎爺印各一處），不是根治。
2. **虎爺印改撲「自己還有空間」的那一隻，不再永遠撲最壯的**：語意上仍是「撲對面其中一隻」，
   但這是為了量得到而動的**選角**，記在這裡。連帶把 L3 的面積改用飛行弧補（0.7683 → 0.9974）。
3. **第 1 輪與第 2／3 輪的讀者數字不可直接比較**（覆審 r3 R-5）：材料規格在第 2 輪換過（`--mate=auto`）。
4. **本輪仍未跑對抗式覆審**：這一份是「修補後送審」的材料（`02 §6.1` 附則），第 4 輪覆審由製作人派。
5. **P4 第 3 輪讀者還沒讀**：材料已備妥（§6.4），真值未動；讀完才知道 (a)–(e) 在人眼上有沒有效。

---

## 7. 覆審 r4 修補（2026-09-13；HIGH-1／MEDIUM-1／-2／-3／LOW-1／-2）

**基準** main `ea2a38f`（v0.55.8）。覆審 r4 判**不可合併**：(c)(e) 宣稱「碎片／彈開不朝我方」，
而它們用的「畫面左右」基底在對決機位下與「我→敵」軸**完全平行**（實測內積 -1），
那條半平面限制根本沒限制到任何東西。本節修掉這一條並補上**看得到它的機械斷言**。

### 7.1 逐條三態

| 條目 | 三態 | 證據 |
|---|---|---|
| **HIGH-1**：(c)(e) 的「畫面左右」基底＝對決軸，半平面限制形同不存在 | **真的修好** | ① 基底改成 `st.sideDir`＝`cross(st.dir, UP)`（新 API，與對決軸正交 ⇒ 在 `st.dir` 上的投影恆為 0），四個入口一起改（`xianghuo.js` 的王爺劍／媽祖令旗撐兩端、虎爺印碎片；`zuling.js` 的山豬牙飾彈開）。② **新機械斷言**（見 §7.2）在**改前**的碼上判紅：`swarmThorn -0.18（prop:tusk）`、`biteGamble -0.058（prop:seal）`，與覆審用探針量到的兩個數字**逐位數相同**；改後 27 支全綠、最深回流 **0** |
| **MEDIUM-1**：`foe` 對「印落在錯的那一尊敵人」零鑑別力 | **真的修好** | `foe` 改綁**引擎自己看出來的受擊者**：衝擊拍那一幀記下每一尊受招方的 model 位移／縮放，之後動過的進 `hurtSet`（`st.flinch` 的退、壓、抖都走受招方通道，搬道具搬不進來）。判準兩條路：主道具歸屬得出來 ⇒ 要求它歸屬到 `hurtSet` 裡那一尊（`hurtHit`）；歸屬不出來 ⇒ 至少一件道具決定性落在受擊者身上（`hurtCover`）。**突變 (m)**（大印改落到離獵物最遠的另一尊敵方）由**綠**變**紅**。★連帶抓到一支真的錯★：雷女之火在 P4 材料的敵方名單下，主道具被 `camOff` 推到**另一尊**的佔地裡（`hurtHit=false`，材料站位 29/30），落點改 `st.bodySpot(prey, …)` 之後 30/30 |
| **MEDIUM-2**：P3 證據檔 `sizeGuard.failed` 非空卻記 18/18 | **真的修好（記錄面）** | 重跑並在 §6.5、§7.3 兩處都寫明：指標 18/18，而 **N11 那一格 `measured=false`、`failed=["eliteSelfCut","wardImmuneLost","biteGamble"]`**。成因是 `fx-contrast` 判 usesEmblem 時走 `movesMatching`（會把 `_v055` 後綴剝掉）⇒ 不帶 `--fxvocab=1` 時反而查到 `biteGamble` 判 fail、帶 `--fxvocab=1` 時查不到 `biteGamble_v055` 判 n/a，**三態顛倒**。★不是本批引入、本批也沒修碼★（覆審建議留下一卷），但不再當成綠燈收掉 |
| **MEDIUM-3**：`traitfx-drive` 沒有旗標白名單，`--mateGap` 大寫 G 靜默失效 | **真的修好** | 守衛抽成共用的 `tests/tools/fx-cli.mjs`：鍵**一律正規化成小寫**（`--mateGap` 與 `--mategap` 同義）、不認得的旗標**當場 throw**。實測：`--mateGap=1.9` 現在真的套進 URL；`--mateGapp=1.9` 當場停並列出這一支認得的 18 個旗標。`blindread-sheet` 改用同一支（兩個入口一個分母） |
| **LOW-1**：VERSION 由我自己 bump | **真的修好** | 已還原；`git diff ea2a38f -- index.html` 為空 |
| **LOW-2**：`sepOf` 的 `inView` 是結構性放寬路徑 | **記錄（照辦）** | 寫進語彙檔 §A9-5 的「已知未涵蓋」第 ① 條，並註明**本批 36 列逐列比對沒有任何一列因此下降**（`sep-before-after.txt`） |
| 覆審 r4 對 R-1／(a)(b)(d) 的複驗 | — | 覆審自己重跑：11 條突變全紅、健康態前後全綠、閘門逐數字重現；自加的 (l)（follow 走 opacity 路線）也紅 |

### 7.2 新判準：打擊類招在衝擊拍之後不得回流我方（語彙檔 §A9-6）

**為什麼現有的閘門看不到**：anchor 只量衝擊拍**那一幀**、P3 凍在 travel 中點、`st.trail` 的規矩只管飛行段
——**react 之後的軌跡在這一條之前沒有任何人在看**，所以 30/30 全綠與 (c)(e) 的缺陷完全脫鉤。

- **怎麼量**：引擎在 `react[0]` 記下每一件道具的取樣點（群體道具**逐一實例**），之後逐幀算
  「相對那一幀的位移」在 `st.dir`（我→敵）上的投影，取最深的負值（`js/trait-fx.js` 的 `trackFlow`／`flowResult`）。
- **判準**：打擊類（`MOVE_SPEC.anchor` 解出敵方那一側）要求 `worst >= -0.01`；
  `traitfx-drive` 的 `flowOK` 進 `verdict.pass`，摘要行逐跑印「最深回流」。
  0.01 只是浮點／取樣抖動的容差——**實測健康態是 0（逐位數）**，(c)(e) 改前是 -0.058／-0.18，
  這個數字怎麼訂都判得出來（`02 §6.1` 第 6 條：不是靠容差過關）。
- **分母**（`02 §6.1` 第 7 條）：`run.meshes` 的每一件，扣掉腳下語彙（`floor:`）、拖尾（`trail`）、
  以及**黏在某一尊身上的印記**（`st.stick`／`follow`）。黏上去的那一類量到的是那一尊自己的受擊動作
  （實測射日的日印 -0.085＝獵物中箭時胸口往後擺），不是「有東西飛回我方」；★這一類量不到，照實記★。
- **鑑別力**：突變 **N**（山豬牙飾退回改前的基底）與 **O**（虎爺印碎片退回改前的基底）各自判紅，
  而且紅的**只有** `flow` 這一格（`anchorOK` 仍是 1）⇒ 紅的來源就是這條新斷言，不是別的判準順便擋到。

### 7.3 批末驗收（全部實跑，原始 stdout 在 `gates-b-r5.txt`）

| 閘門 | 結果 |
|---|---|
| P0 trace-eq（對 main 的 `index.html`，seeds 1..20）| **逐位元組相等**（`index.html` 本身與 main 零 diff） |
| P1 `fxvocab.test.mjs` | 28 綠 0 紅（本輪再加：語彙檔要寫出 §A9-6、`st.sideDir`、`cross(camDir, UP)` 的病因、`hurtSet`／`attMain`／`hurtCover`） |
| P2／P5／P6 drive | t1 27/27、t2 30/30、t3 3/3、`--fxvocab=1` t1 27/27 t2 30/30、`--count=2` 30/30、`--count=3` 30/30、**P4 材料站位 30/30** |
| **回流（新）** | 八條路徑**全部**「打擊類 5 支：紅 0、最深 0」 |
| anchor 鑑別力 | **15 條突變全紅**（A–K 十一條＋覆審 r4 自加的 (l)(m)＋回流斷言的 N／O），健康態前後皆綠 |
| P3 fx-contrast | 指標 t2 **18/18**、t1 **18/18**；★N11 那一格 `measured=false`、`failed=["eliteSelfCut","wardImmuneLost","biteGamble"]`（MEDIUM-2，既有問題、記為已知未涵蓋）★ |
| P7 duel-perf（本樹／基準樹 `76fc296`）| draw call 986:986、fps 59.9:59.9、visible 16:16、errors 0 |
| P8 duel-drive seed 7／3 | errors 0、duels 4／4 |
| P8 12 套規則測試 | 全綠 |
| §A3 尺寸 | 道具 2／36 列超過（與上一輪相同的兩件） |

### 7.4 還粗的地方 / 交製作人裁

1. ★**第 3 輪材料沒有重產**（製作人裁示：讀者已在跑）★：材料是在 (c)(e) **修好之前**產的，
   所以**虎爺印與山豬牙飾這兩支的第 3 輪答卷，讀的是碎片／彈開仍會朝我方的那一版**。
   覆審 r4 的建議是「修完 (c)(e) 要重產這兩支」；依裁示照記不重產，那兩支的結果請照此解讀。
2. **N11 三態顛倒**（MEDIUM-2）：碼沒修，留下一卷；本卷只把它從「綠燈」改回「已知未涵蓋」。
3. **`foe` 的退路**：主道具歸屬不出來時退到「至少一件道具落在受擊者身上」，比嚴格版鬆一格（語彙檔 §A9-5 已記）。
4. **`sepOf` 的 `inView`**（LOW-2）：本批沒有任何一列因此下降，但換機位時要重看。
5. **回流斷言量不到「黏在身上的印記」**（§7.2 的分母）：它們落在誰身上由 anchor 的 follow 分支管。
6. **本輪仍未跑對抗式覆審**：這一份是「修補後送審」的材料（`02 §6.1` 附則），第 5 輪覆審由製作人派。
