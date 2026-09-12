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
| ⑤ | 光語彙**蓄勢就亮、衝擊拍熄** | 亮滅時間軸寫在 `st.groundMark` 裡：`windup` 淡入、收尾點＝`B.travel[0] + travelMs`＝`react[0]` | **由建構上成立**（編舞給不出第二份，`02 §6.1` 第 7 條「首選收斂」） |
| ⑥ | 受益／受招反應與姿態**不同型** | `STANCE_VOCAB[stance].axis !== REACT_AXIS[react]` | `tests/fxvocab.test.mjs:281` |
| ⑦ | 已轉正的招**必須登記** `stance`，取值在白名單內 | 「已轉正」＝原始碼真的呼叫過 `st.phase(` 且無 `V054` 退路（**從原始碼推導，不是手工名單**） | `tests/fxvocab.test.mjs:267` |
| ⑧ | 登記了就**真的要演** | 函式體必須出現 `st.stance(` 與 `st.groundMark(` | `tests/fxvocab.test.mjs:293` |
| ⑨ | 三張表自身完整（沒有 `undefined` 讓⑥恆綠） | 三系 `reacts` 每一個字都要在 `REACT_AXIS` 裡；每一型 `amp ≥ minPeak` | `tests/fxvocab.test.mjs:254` |
| ⑩ | 拖線只准打擊類、方向只准「施招者→目標」 | 增益招 `st.trail(..., trail: false)` | **目前沒有機械檢查**（照實列，見 §1.7） |
| ⑪ | 治具棚 2v2 同伴間距 ≥1 個身位 | `blindread-sheet --mateGap=<1–3>`（不帶＝1＝不變） | **材料規格，不是判準**（P4 三題與真值一格不動） |

`stanceOK` 的**適用範圍**與 `phasesOK` 同一條，另排掉兩態：還留著 `V054` 退路的招（`hauntLost`——
陰氣批還沒開，住在 MOVES 的是批 0 徽記版）、以及 `--fxvocab=1` 跑 `V055` 的四支。
**這不是放寬**：那兩態跑的演出比本語彙早，同一支招轉正之後 `V054` 退路會被移除、預設路徑跑的是有姿態的那一份。

### 1.2 新積木與落點

| 積木 | 落點 | 要點 |
|---|---|---|
| `st.stance(fig, kind, e, o)` | `js/trait-fx.js:1323` | 幅度唯一來源＝`STANCE_VOCAB`，編舞只能給 0..1 的 `e` 與 `strength`；走**獨立加成通道** `w.sta`（`:612`），`apply()` 疊在 `w.mo` 之上 |
| `st.pillar(pos, h, o)` | `js/trait-fx.js:1355` | 祖靈腳下垂直光柱。**紙紮語法**：上窄下寬的細長片 `ExtrudeGeometry` ＋露出一圈 `ink` 當墨線邊，**不用加色材質當主體**；朝向凍在 spawn 當下、**只轉 yaw**（柱要站直）；`fxKind='floor:pillar'` |
| `st.groundMark(fig, o)` | `js/trait-fx.js:1397` | 照 `FAC_GROUND` 分派；亮滅由建構上成立；柱另外往鏡頭推 0.34（貼腳底會被本體整根遮掉） |
| `st.camOff(k)` | `js/trait-fx.js:949` | 從 `xianghuo.js` 的 `camOff(st,k)` **上升到 st**（三系要用同一件事，留在系別檔就會被複製成第二份——`camDir` 覆審 r1 HIGH-1 的同一個病）。`xianghuo.js:42` 現在只是轉呼叫，那 9 支招的寫法一個字未動 |

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

**批 0 徽記版原地保留**：`zuling.js:958` `export const V055`（`eliteSelfCut_v055`，本體逐字取自 v0.55.6 的
MOVES，只改函式名那一行）＋`:1037` `V055_SHORT`。**0.54 退路（`V054`／`V054_SHORT`）連同轉正一起移除**
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
| **P0 等價** | `node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html`（`git show 616f7ff:index.html`） | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}` ✅ |
| **P1 登記表** | `node tests/fxvocab.test.mjs` | **23 綠／0 紅**（新增四條：§A9 ①⑥⑦⑧⑨）✅ |
| **P2 phase gate** | `traitfx-drive --tier=1／2／3` | **27/27**／**30/30**／**3/3**，`phasesOK` 全 true ✅ |
| **P3 對比** | `fx-contrast` ＋ `fx-contrast-metrics.py`（10 支 × t1／t2；844×390@2x、bloom 0.7、seed 7） | t2 **10/10**、t1 **10/10** ✅ |
| **P4 盲讀** | — | **不在本階段**（裁定：香火＋祖靈一起重跑新的三輪） |
| **P5 短版合身** | `traitfx-drive --tier=1` | 27/27，`eliteSelfCut` `rate=1`／`fill=0.9`／`msOK=true` ✅ |
| **P6 短版下限** | 同上的 `actionsOK` | `eliteSelfCut` acts=**10**（≥2）✅ |
| **P7 效能** | `duel-perf perf --seed=7`（本樹 vs 基準 `616f7ff` 的 `git archive` 樹） | fps **59.9 : 59.9 ＝ 1.00**（≥0.95）；draw call **986 : 986**（≤1000）；visible 16=16 ✅ |
| **P8 零錯＋規則測試** | `duel-drive --seed=7`／`--seed=3` 各 4 場 ＋ 12 套規則測試 | errors **0／0**（`ver v0.55.6`）；12 套 **8／5／7／9／14／23／32／8／16／28／32／36 全綠** ✅ |

補充實跑：

```
node tests/tools/traitfx-drive.mjs … --tier=1 --fxvocab=1   → 27/27
node tests/tools/traitfx-drive.mjs … --tier=2 --fxvocab=1   → 30/30
node tests/tools/traitfx-drive.mjs … --tier=2 --count=2     → 30/30，soloReact=[]
```

`eliteSelfCut` 在 `--count=2` 下 `phases=windup:1,travel:1,react:1`（**不再是 solo**）、
`stance={"kind":"下沉","peak":0.2,"ground":"pillar","onTarget":false,"extra":0,"minPeak":0.12}`。

**P3 逐支（t2，門檻 area ≥0.8%／ΔE 中位 ≥28）**——`…-b2-evidence/p3-t2/metrics.txt`：

| 招 | area% | ΔE 中位 | 招 | area% | ΔE 中位 |
|---|---|---|---|---|---|
| `eliteSelfCut` | **1.073** | 52.19 | `biteGamble` | 1.0208 | 109.35 |
| `wardAtkAll1` | 1.9686 | 88.61 | `wardHpFirst` | 1.2486 | 77.86 |
| `eliteCleave` | 0.8768 | 65.04 | `wardRegen1` | 1.5406 | 84.45 |
| `wardAbsorb4` | 1.8647 | 82.53 | `swarmLastStand` | 0.9968 | 83.54 |
| `wardImmuneLost` | 0.97 | 85.79 | `swarmRally` | 2.5933 | 74.79 |

香火 9 支的數字與批 1 階段 B **逐支相同**（`wardImmuneLost` 0.97／85.79 等）⇒
加 `st.stance`／`st.groundMark` 沒有動到 L3 的量測基礎（`st.ring`／`floor:pillar` 都不在 `fxVis` 的切換名單裡）。

**draw call（A6，≤ idle+25）**：`proto-record --trait=eliteSelfCut --tier=2 --step=2`
⇒ `idleCalls:150`、`peakCalls:161`（**+11**）、`peakTris:48994`、`programs:21`、`errors:0`。

**§A3 尺寸記錄（Q5，記錄項不擋批）**——`…-b2-evidence/prop-size/prop-size-t{1,2}.tsv`：

| 招 | figH | 件 | 單件峰值 | ratio | 判 |
|---|---|---|---|---|---|
| `eliteSelfCut` | 2.2372 | `emblem:knife`（黑曜石刃） | 1.1281 | **0.504** | ≤2/3 ✅ |
| `eliteSelfCut` | 2.2372 | `prop:knife`（紙血條，單件） | 0.255 | 0.114 | ✅ |
| `eliteSelfCut` | 2.2372 | `floor:pillar`（光柱） | 1.30 | 0.581 | 腳下語彙，不在這條規則範圍 |

t2 全表 18 列裡只有 1 列超標＝`swarmLastStand` 的殘旗 **0.789**（批 1 就在案，本階段未動它）。

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

### 1.7 視覺交付與自評

| 檔 | 內容 |
|---|---|
| `2026-09-13-zuling-b2-evidence/eliteSelfCut/sheet-t1.png` | 6 幀連拍，t1＝300ms（844×390@2x，每格 780×360，帶 `--label`） |
| `…/eliteSelfCut/sheet-t2.png` | 6 幀連拍，t2＝900ms |
| `…/eliteSelfCut/sheet-t2-closeup.png` | t2 近景（`--camdist=2.4`） |
| `…/eliteSelfCut/real-seed3-eliteSelfCut.png` | ★**真實對決**裡獻祭刀的衝擊拍（seed 3、20 場、`--traitshot`）★ |
| `…/eliteSelfCut/rec-t2/eliteSelfCut-base-t2-record.json` | `proto-record` 的 draw call／三角形記錄（逐幀 PNG 已刪，畫面看 sheet 那三張） |
| `…/mategap/gap-1.0.png`、`…/gap-1.9.png` | `--mateGap` 的雙向對照（§1.6 第 4 點） |
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
7. `swarmLastStand` 的殘旗尺寸 **0.789 > 2/3**（批 1 就在案）與 `st.paperProps`／`st.paperStamp`
   仍不在尺寸鎖裡（README 的「已知未涵蓋」）——兩件都沿用批 1 的狀態，本階段未動。

### 1.9 範圍（`git diff --stat 616f7ff..`，逐檔對應）

| 檔 | 行 | 對應哪條需求 |
|---|---|---|
| `js/trait-fx/vocab.js` | +53 −13 | 派工 1：`STANCE_VOCAB`／`REACT_AXIS`／`STANCE_GATE`／`FAC_GROUND` 四張表＋`MOVE_SPEC` 的 `stance`／`selfReact` |
| `js/trait-fx.js` | +137 −5 | 派工 1／2：`st.stance`（＋`w.sta` 通道與 `apply()`）、`st.pillar`、`st.groundMark`、`st.camOff`、`lastSig.stance` |
| `js/trait-fx/zuling.js` | +211 −127 | 派工 3：新 `eliteSelfCut` ＋ `zlBeat`；批 0 徽記版搬進 `V055`／`V055_SHORT`；`V054` 退路移除 |
| `js/trait-fx/xianghuo.js` | +33 −2 | 派工 4：9 支各加 `st.groundMark`＋`st.stance`（18 行）；`camOff` 改成轉呼叫 |
| `js/duel-figures.js` | +9 −2 | 派工 1 最後一條：`createDuelFigures` 的 `opts.stepMul`（**預設 1＝正式頁一個位元組不變**） |
| `tests/fxvocab.test.mjs` | +122 −1 | 派工 1：P1 四條新檢查＋突變 23／24／25 |
| `tests/tools/traitfx-drive.mjs` | +42 −3 | 派工 1：`stanceOK` 進總判定、`v055CasesFromSource`、`phaseCasesFromSource` 的 MUST 加 `eliteSelfCut` |
| `tests/tools/blindread-sheet.mjs` | +8 −1 | 派工 1 最後一條：`--mateGap` 轉送 |
| `tests/tools/traitfx-preview.html` | +5 | 同上：`?mategap=` 接到 `stepMul` |
| `docs/design/2026-09-12-fx-vocab-draft.md` | +新 §A9 | 派工 1：語彙草案 |
| `docs/design/ART_BIBLE.md` | §10.3 +一小段 | 派工 1 |
| `docs/experiments/2026-09-13-zuling-b2-*` | 新增 | 本報告＋交付物 |

**`index.html` 一行未動**（P0 `bytesOld == bytesNew == 357285`、`equal:true`）。
**門檻／seed／視口／`PHASE_GATE`／`TRAIT_MS_BY_TIER`／P4 真值表一格未動。**
唯一新增的門檻是 `STANCE_GATE.minPeak = 0.12`，它**不取代任何既有判準**（windup 仍走 `PHASE_GATE`），
而是本階段新增的那件事自己的下限。

### 1.10 下一步

1. 製作人看 `sheet-t1／t2／t2-closeup／real-seed3` 四張 → 簽字（§1.8 的 1／2／5 三題要裁）。
2. 簽字後鋪祖靈其餘 8 支（`eliteOpenShot`／`wardHpFront2`／`eliteArmor`／`wardFirst`／`boltGamble`／
   `swarmHalfSplash`／`swarmThorn`／`wardHpAll1`），每支 P0–P3／P5–P8 ＋ sheet。
3. 18 支（香火 9 ＋ 祖靈 9）一起交 **P4 新的三輪**，材料帶 `--mateGap=1.9`。
