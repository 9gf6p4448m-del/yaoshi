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
