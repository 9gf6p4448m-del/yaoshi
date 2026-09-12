# 招式演出卷・香火系批 1 — 階段 A（範本招簽字前）

> 卷：`docs/proposals/2026-09-12-plan-fx-performance.md`（§4 流程、§5 閘門 P0–P8、§7.2 裁定）
> 語彙：`docs/design/ART_BIBLE.md` §10.2／10.3／10.7（權威）＋ `docs/design/2026-09-12-fx-vocab-draft.md`（定稿，完整理由）
> 基準：main `f8f7c98`（v0.55.2）。worktree `.claude/worktrees/agent-af4b6dd83859a028a`，**未合併、未 push**。
> 本階段只做到「**範本招簽字前**」：三件前置 ＋ 虎爺印 E 轉正 ＋ P0–P8（P4 盲讀不在本階段）。
> 其餘 8 支香火招**一行都還沒動**——計畫 §4 要求範本招單獨走完閘門、製作人看 sheet 簽字，才准鋪。

---

## 1. 階段 A

### 1.1 三件前置（計畫 §7.2「批 1 動手前要先做完的三件」）

| # | 計畫原文 | 狀態 | 落點 |
|---|---|---|---|
| ① | `st.paperStamp`／`st.solid`／`st.stick` 轉正進 `js/trait-fx.js` ＋常駐預熱（`programsGrew` 維持 0） | **基準上已完成**，本階段只驗證＋抽共用零件 | `js/trait-fx.js:485`（`solid`）、`:715`（`paperStamp`）、`:794`（`stick`）；預熱 `:222` `warmSolid` |
| ② | `vocab.js` 建 `MOVE_SPEC` 登記表＋補 P1 機械檢查 | **完成** | `js/trait-fx/vocab.js:139` `FAC_VOCAB`／`:176` `MOVE_SPEC`（27 列）；`tests/fxvocab.test.mjs:130-196` 三條 |
| ③ | Q5 的道具尺寸記錄治具 | **完成** | `tests/tools/prop-size.mjs`、掛勾 `tests/tools/traitfx-preview.html:252` `propSizes()` |

另外補了語彙檔 §A8 列為「要新寫」的 `st.paperProps`（群體紙紮道具）——它不在那三件裡，
但香火批的範本招（E 的九片金箔）就是靠它，不補就得在 27 支裡各手刻一次。
`st.pillar`（祖靈）／`st.stain`（陰氣）照計畫留給那兩批。

#### ① 轉正的驗證（不是宣稱）

三支積木在基準 `f8f7c98` 的 `js/trait-fx.js` 裡就有（原型 worktree 已併回 main），
所以本階段要驗的是「**它們在正式演出路徑上跑得動、而且沒有多編 shader**」：

```
node tests/tools/traitfx-drive.mjs scratchpad/b1-t1.json --only=biteGamble --tier=1 --port=8861
PASS biteGamble tiger t1/300ms msOK=true rate=1 fill=0.9 acts=17 handled=true alive=true
     restored=true onTime=true clean=true focus=true end=29 maxD=2.2953 err=0 prog+0
     sig=28b/burst+emblem:seal+mark:seal+prop:seal+ring/T
```

`prog+0` ＝ `programsGrew` 0（三支材質模板固定、全部預熱）。

本階段對這三支動的唯一一件事是**抽出共用零件**（`js/trait-fx.js:141` `paperPts`／`:144` `paperBow`／
`:150` `paperShape`），因為 `st.paperProps` 要用同一條翹曲曲線與同一份頂點表；
`st.paperStamp` 的行為一個字沒改（同一條公式、同一組預設值）。

#### ② `MOVE_SPEC` 與 P1 的三條機械檢查

schema 照 §7.2 Q9：`MOVE_SPEC[trId] = { prop, act, react }` 三個字串欄，
取值必須落在該系白名單（`FAC_VOCAB`＝ART_BIBLE §10.7 那張表的程式版）。

```
node tests/fxvocab.test.mjs                 → 18 綠 0 紅（基準是 15 綠，新增三條）
node tests/fxvocab.test.mjs --mutate=5      → 17 綠 1 紅
   FAIL MOVE_SPEC 三欄都非空，且取值落在該系白名單內（P1 ①②）
        — biteGamble.act="探" 不在 xianghuo 的動詞庫（撲／拍／震／降／掃）
node tests/fxvocab.test.mjs --mutate=6      → 17 綠 1 紅
   FAIL MOVE_SPEC 覆蓋 27 支招、不含三尊（P1 ③）— 少了 wardRegen1
```

突變 5／6 是新加的鑑別力案例（香火招填陰氣動詞／少填一支招）。
健康狀態下 18 綠＝反面也驗過（`02 §6.1` 第 1 條要的兩個方向）。

`trId → 系別`**不另抄一份**：`doc4Rows()`（`tests/fxvocab.test.mjs:140`）直接讀
`docs/experiments/2026-09-11-fx-vocab.md` 第 4 節那張表，三尊靠招名欄的「（傳說）」字樣認出來。

**★交製作人覆核：§C 散文動詞往 §B 白名單正規化的八處★**
§C（27 支逐招表）有八支招的「本體動作／反應」用了 §B 動詞庫與反應家族裡沒有的字。
本表一律**往白名單收**（不是把新詞加進白名單——加詞會讓白名單逐卷變寬，這條檢查一年後只剩形式）：

| 招 | §C 原字 | `MOVE_SPEC` | 理由 |
|---|---|---|---|
| `eliteArmor` | 繞 | `張` | §C 自己標「＝張的蛇形變體」 |
| `boltGamble` | 撐 | `張` | §C 自己標「＝張」 |
| `hauntSee` | 搖 | `滯` | §C 自己標「＝滯的變體」 |
| `eliteCleave` | 劈 | `掃` | 香火「掃」的定義原文就是「旗面／**劍弧橫過整排**」 |
| `swarmThorn` | 刨 | `沉` | 低頭刨地＋拱背＝「屈膝沉身、背岩隆起」那一類 |
| `swarmLastStand` | 扎 | `拍` | 「扎」是**祖靈**的動詞；倒矛過頂往下插＝香火「拍」的砸落 |
| `eliteVsSwarm` | 退 | `抖` | 陰氣的反應家族沒有「退」，取最接近的「骨骼高頻小幅」 |
| `swarmFeed1` | 升 | `被拖` | 陰氣家族沒有「升」；§C 同一列另寫「被吸那隻**被拖**向甕口」 |

前六列我認為是純正規化，後兩列（`eliteVsSwarm`／`swarmFeed1`）是**我替陰氣挑了一個家族內的近似值**，
如果製作人認為該擴充陰氣的反應家族（加「退」「升」），那是改 ART_BIBLE §10.7，要另簽。

#### ③ 道具尺寸記錄治具（Q5：只記錄、不擋批）

```
node tests/tools/prop-size.mjs docs/experiments/2026-09-13-xianghuo-b1-evidence/propsize \
     --only=biteGamble --tier=2 --port=8873          （t1 同，--tier=1 --port=8874）
```

| tier | figH（出招方虎） | kind | type | unit 峰值 | ratio | unit 中位 | ratio50 |
|---|---|---|---|---|---|---|---|
| t2 | 1.7667 | `emblem:seal` 大印 | prop | **1.1936** | **0.676 OVER** | 0.9557 | 0.541 |
| t2 | 1.7667 | `mark:seal` 印文 | prop | 1.0961 | 0.620 OVER | 0.4883 | 0.276 |
| t2 | 1.7667 | `prop:seal` 金箔（單件） | prop | 0.1450 | 0.082 | 0.1450 | 0.082 |
| t2 | 1.7667 | `ring` 貼桌陣 | other | 1.4400 | 0.815 | 0.7200 | 0.408 |
| t1 | 1.7572 | 大印／印文／金箔 | | 1.176／0.9433／0.145 | 0.669／0.537／0.083 | | |

**★這推翻了語彙檔 §A3 裡「大印落地峰值 `iconSize*1.02 ≈ 0.63` 世界單位」那句★**：
0.63 是 **scale 參數**，不是世界尺寸。`EMBLEM.seal` 的頂點表是 ±1 的單位方，
所以實際包圍盒是它的**兩倍**（1.19）。對上「≤ 施招本體高的 1/2」＝0.88，大印超標 36%。

- 依 Q5 裁定，**這一批不因此擋下**（門檻還沒有分布可訂）。
- 但 §A3 的 read-back 消歧第 1 條說得清楚：記錄項 ≠ 規則失效。**這一項我交裁**，
  三個處置方向：甲 縮小大印（會弱掉「落地重音」）／乙 改 `ICON.byKind.seal`（動的是尺寸的
  單一來源，27 支裡只有這一支用 seal，影響面小，但那是批 0 的凍結表，要走 `02 §2.1`）／
  丙 維持現況、把 §A3 的上限改寫成「以 `ICON` 表的 scale 值計」（＝承認規則本來就是這樣量的）。
  我沒有自己選——這是「規則本身該怎麼量」的裁定，不是實作細節。
- `ring`（貼桌陣）標 `type=other` 不進 OVER 統計。
  **為什麼它超標是我自己決定排除、而大印超標要交裁**（同一張表、同一條線，處置層級不同，先講清楚）：

  規則原文（`2026-09-12-fx-vocab-draft.md` §A3 第一句，逐字）：
  > **單件道具的世界尺寸 ≤ 施招本體高的 1/2**（`2026-09-12-plan-fx-performance.md` §3 禁區第 2 條）。

  主詞是「**單件道具**」。`ring` 不是道具，是**腳下語彙**——§B2 香火那一列的「腳下語彙」欄逐字是
  > **貼桌方陣／光環**（`st.ring`／`st.disc`，全 27 支裡**只有本系能用**）

  ★這裡要誠實標一件事★：**§B2 並沒有明文寫「腳下語彙不受尺寸上限約束」**。
  「貼桌陣本來就該比本體寬」是**我的判斷**，不是文件裡的既定豁免——
  理由是它的作用就是在腳下鋪開一圈，拿「≤ 本體高 1/2」去比它，
  每一支有腳下語彙的招都會恆紅，那條欄位就失去意義（恆假的判準＝沒有判準，`02 §6.1` 第 6 條）。
  大印不同：它**就是**規則主詞指的那件東西，所以它超標必須交裁，我不能自己判它沒事。
  **如果製作人不同意我這個分類**，處置有兩條：把腳下語彙也納入這條規則（那要另訂上限、另簽），
  或在 §B2／§A3 補一句明文豁免。兩條都是改規則，不是改實作。

### 1.2 虎爺印 E 轉正：分派怎麼做的

| 表 | 誰覆蓋誰 | 內容 |
|---|---|---|
| `MOVES`／`SHORT` | — | 27 支的**正式**演出。`biteGamble` 現在住這裡（`js/trait-fx/xianghuo.js:493`；`SHORT:1020` 指同一支函式） |
| `V054`／`V054_SHORT` | `VOCAB_ON=false` 時覆蓋 | 「先退回 0.54」的退路，**剩三支**（`eliteSelfCut`／`wardImmuneLost`／`hauntLost`）。虎爺印那兩支已移除 |
| `V055`／`V055_SHORT` | `VOCAB_ON=true`（`?fxvocab=1`）時覆蓋 | 0.55 徽記剪影版（`xianghuo.js:1232`／`:1318`），留給治具與 L3 canary |

- 登記點：`js/trait-fx.js:33`（`loadMoves` 多讀兩張表）、`:58`（後綴正則 `_v05[45](short)?`）、
  `:66-69`（兩張覆蓋表的開關）、`:71/:76`（合併順序）。**分派仍然只做一次**，函式本體裡沒有任何開關判斷。
- 與任務書給的寫法的差別（寫明，因為我採了另一種）：任務書寫「`V054`／`V054_SHORT` 的
  `biteGamble_v054*` 兩支移除」——照做了；但「E 搬成 `MOVES.biteGamble`」與「`?fxvocab=1` 仍走
  0.55 徽記版」在原結構下**互斥**（兩者都只有 `MOVES` 這一個落點）。
  所以我把 0.55 徽記版原地改名搬進新的 `V055` 表（只改函式名那一行），
  正式演出住進 `MOVES`。這樣：**預設路徑＝正式演出**（批 1 之後 8 支轉正照樣往 `MOVES` 放）、
  `?fxvocab=1` ＝徽記版對照組、`?proto=tigerA–E` 原型保留不動（`js/trait-fx.js:82-88`）。
  0.54 版本永久可取：`git show 6a839de:js/trait-fx/xianghuo.js`。
- 三條路徑都實測跑過：預設（P8 的 27/27）、`?fxvocab=1`（P8 的 27/27，`biteGamble` 的
  `sig` 帶 `trail`、`acts=9` ⇒ 確實跑的是徽記版）、`?proto=tigerE`：
  ```
  node tests/tools/traitfx-drive.mjs scratchpad/proto-e.json --only=biteGamble --tier=1 --proto=tigerE --port=8905
  PASS t1/300ms … maxD=2.2953 err=0 prog+0 sig=28b/burst+emblem:seal+foil+mark:seal+ring/T
  ```
  原型的簽章帶 `foil`（手刻的 InstancedMesh）、正式版帶 `prop:seal`（積木），
  其餘逐值相同——原型沒被轉正弄壞，而且這是「轉正沒改到任何一格動作」的第三份證據。

**演出內容與 E 定稿逐值相同**，只有金箔那一段換成積木：
`st.paperProps(st.kind, 9, { color: C.key, opacity: 0, k: 0.725, depth: 0.16, warp: 0.14 })`
（`k` 0.725 × `ICON.markSizeOf('seal')` 0.20 ＝ 0.145 ＝ E 那片金箔的高，實測見 §1.1③ 的 `prop:seal` 列）。
虎的動作零件（`tgCast`／`tgCrouch`／`tgLunge`／`tgSnapJaw`／`tgRecover`／`tgPreyHit`）
自 `js/trait-fx/proto/tiger.js` 搬進 `xianghuo.js:18-93` 的模組層——只有這一支招用得到 34 根虎骨，
不上升到 `st`（那一層放 27 支共用的積木）。

**`st.paperProps` 的一個規格例外（交覆核）**：單件小道具**不做面板墨線邊**（§A4 第 2 條）。
墨線邊要「ink 本體＋縮 0.74 的 key 面板」兩片，而 `InstancedMesh` 一個材質只畫得出一種顏色
⇒ 兩片就是 2 個 draw call、幾何量加倍，違反這支積木存在的理由（§A6 預算）。
厚度與翹曲兩條照做，所以它仍是「實體」而不是平面 billboard。E 定稿那九片金箔本來就是單色薄片。

### 1.3 P0–P8 逐條

| 閘門 | 判準 | 結果 |
|---|---|---|
| **P0** 等價 | `trace-eq` 對 `f8f7c98` 逐位元組相等 | **綠**（`equal:true`；`index.html` 本卷一行未改） |
| **P1** 登記表 | 三欄非空／白名單內／27 支全覆蓋 | **綠**（18 綠 0 紅，突變 5／6 各判紅） |
| **P2** phase gate | t1 ≥2 段、t2 =3 段 | **綠**（兩個 tier 都是 `windup,travel,react`） |
| **P3** 對比 | 面積 ≥0.8%、ΔE 中位 ≥28 | **綠**（t2 1.0208%／109.35；t1 1.0630%／107.83） |
| **P4** 盲讀 | — | **不在本階段**（範本簽字後、8 支鋪完才跑） |
| **P5** 短版合身 | `fill ≥0.85` | **綠**（t1 0.9、t2 0.9） |
| **P6** 短版品質 | `rate ≤1.0`、`acts ≥2` | **綠**（rate 1、acts 17） |
| **P7** 效能 | fps 比值 ≥0.95、draw call ≤1000 | **綠**（59.9/59.9＝1.00；933 ≤1000） |
| **P8** 零錯＋規則測試 | 兩路徑 0 error、27/27 handled、12 套測試 | **綠**（見下） |

#### P0

```
git show f8f7c98:index.html > scratchpad/base-index.html
node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html
{"old":"scratchpad/base-index.html","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}

node tests/tools/trace-eq.mjs index.html --mutate        ← 鑑別力
{"mutation":"CFG.ROUNDS 12 -> 11","differs":true,"verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}
```

`git diff --stat f8f7c98..HEAD -- index.html` 是**空的**：本卷沒有動 `index.html`
（含 `VERSION`／`VERSION_NOTE`——版號等製作人簽字、8 支鋪完再上，現在上版號等於宣告已完工）。

#### P2／P5／P6（同一支治具）

```
node tests/tools/traitfx-drive.mjs scratchpad/b1-t1.json --only=biteGamble --tier=1 --port=8861
PASS t1/300ms msOK=true rate=1 fill=0.9 acts=17 handled=true alive=true restored=true onTime=true
     clean=true focus=true end=29 maxD=2.2953 err=0 prog+0 sig=28b/…/T
node tests/tools/traitfx-drive.mjs scratchpad/b1-t2.json --only=biteGamble --tier=2 --port=8862
PASS t2/900ms msOK=true rate=1 fill=0.9 acts=17 … end=66 maxD=2.3239 err=0 prog+0（同一組簽章）
```

`verdict` 全欄：`rateOK/fillOK/actionsOK/msOK/within/onTime/clean/restored/reducedOK` 皆 true、
`horizon` 270（t1）／810（t2）、`phases` 兩個 tier 都是 `["windup","travel","react"]`。

**與 E 原型的逐值比對**（`2026-09-12-tiger-proto-report.md` §8.3）：
t1 `maxD=2.2953`／`end=29`／`fill=0.9`／`acts=17`／`sig=28b` — **逐值相同**。
簽章唯一的差別是金箔的 `fxKind` 從手刻的 `foil` 變成積木的 `prop:seal`。
這是「轉正沒有改到任何一格動作」最硬的一條證據（骨骼／model 的 maxD 是逐幀矩陣差的最大值）。

#### P3（量測位置照抄）

```
node tests/tools/fx-contrast.mjs docs/experiments/2026-09-13-xianghuo-b1-evidence/contrast-t2 \
     --only=biteGamble --tier=2 --seed=7 --port=8845
python tests/tools/fx-contrast-metrics.py docs/experiments/2026-09-13-xianghuo-b1-evidence/contrast-t2
{"trait":"biteGamble","tier":2,"at_ms":430,"hidden":2,"dead":false,"ok":true,
 "area_pct":1.0208,"px":3360,"total":329160,"de_median":109.35,"de_p90":122.67}
{"gate":{"area_pct_min":0.8,"de_median_min":28.0,"luma_eps":6.0},"nobloom":false,"pass":1,"failed":[],
 "view":{"width":844,"height":390,"deviceScaleFactor":2},"seed":7,
 "product_bloom":{"strength":1.05,"threshold":0.7,"knee":0.3,"radius":1.7,"scale":0.5}}
```

t1 同（`--tier=1 --port=8846`）：`at_ms:156`、`area_pct:1.0630`、`de_median:107.83`、`pass:1`。

**量測位置**（`02 §6.1` 第 5 條）：視口 **844×390@2x**、產品 bloom 五鍵逐一對齊（threshold **0.7**）、
**seed 7**、真實牌桌場景（`js/scene-env.js` 的 `TABLE_COLOR`＋夜紫天）＋對決機位。
**凍幀時點是治具寫死的 `BEAT[tier].travel` 中點**（t2 430ms／t1 156ms），不是衝擊拍——
任務書寫的是「量道具在衝擊拍」，但那個時點是 `fx-contrast.mjs` 的凍結規格（L3 沿用），
**改它就是改量測位置**，所以我照治具原樣跑，在這裡標明差異。
被切掉的是 2 個物件（大印 `emblem:seal` ＋印文 `mark:seal`）＝`hidden:2`、`dead:false`（活性證據）。
金箔 `prop:seal` **不在** `fxVis` 的正則（`^(emblem:|trail$|mark:)`）裡，
所以 P3 的量測對象與 E 原型完全相同——這是刻意的：把群體道具也算進去會讓面積變大＝把及格線搬淺。

#### P7（對基準 worktree）

```
git worktree add --detach scratchpad/base-f8f7c98 f8f7c98
node tests/tools/duel-perf.mjs perf scratchpad/perf-new.json  --port=8881 --seed=7
node tests/tools/duel-perf.mjs perf scratchpad/perf-base.json --port=8882 --seed=7 --root=scratchpad/base-f8f7c98
```

| | rafMedianFps | rendersPerSec | drawCallsPerFrame | trianglesPerFrame | visible |
|---|---|---|---|---|---|
| 本樹 | **59.9** | 288.2 | **933** | 344,888 | 15 |
| 基準 `f8f7c98` | 59.9 | 283.3 | 964 | 353,174 | 16 |

fps 比值 **1.000 ≥0.95** ✓；draw call **933 ≤1000** ✓（GPU：AMD Radeon 780M／D3D11）。
★誠實標註★：兩跑的 `visible` 是 15 vs 16（同 seed 但場上尊數不同），
所以 933 vs 964 的差是**尊數差**不是本卷省下來的——兩個絕對值都在門檻內，比值那一條看的是 fps。

**招式自己的 draw call**（§A6「每招峰值 ≤ idle+25」）：

```
node tests/tools/proto-record.mjs scratchpad/rec-t1 --tier=1 --trait=biteGamble --fps=12 --port=8875
{"tier":1,"frames":22,"idleCalls":151,"idleTris":50664,"peakCalls":168,"peakCallsAtFrame":13,
 "peakTris":51296,"programs":21,"errors":0}
node tests/tools/proto-record.mjs scratchpad/rec-t2 --tier=2 --trait=biteGamble --fps=20 --port=8876
{"tier":2,"frames":58,"idleCalls":151,"peakCalls":168,"peakCallsAtFrame":34,"peakTris":51296,"programs":21,"errors":0}
```

峰值 **168（idle 151，+17）**＝與 E 原型**同值**（E 報告 §8.4）。
三角形 51,296 vs E 的 51,116（+180）＝ `st.paperProps` 的擠出側壁（九片 × 厚度），符合預期。
`programs 19→21` 是 `InstancedMesh` 的 shader 變體當場編——**既有狀況**（`js/trait-fx.js:206-216`
那段註解記了實測與試修的代價 +4 program／+2 draw call），本卷不夾帶產品層變更。

#### P8

```
node tests/tools/traitfx-drive.mjs scratchpad/all-t1.json --tier=1 --port=8891   → 27/27 pass 重複簽章 0
node tests/tools/traitfx-drive.mjs scratchpad/all-t2.json --tier=2 --port=8892   → 30/30 pass 重複簽章 0
node tests/tools/traitfx-drive.mjs scratchpad/all-t3.json --tier=3 --port=8893   → 3/3 pass
node tests/tools/traitfx-drive.mjs scratchpad/all-t1-vocab.json --tier=1 --fxvocab=1 --port=8894 → 27/27 pass
node tests/tools/traitfx-drive.mjs scratchpad/all-t2-vocab.json --tier=2 --fxvocab=1 --port=8895 → 30/30 pass
```

`?fxvocab=1` 那條路徑的 `biteGamble` 跑的是徽記版（`sig=…+trail`、`acts=9`），
與預設路徑（`sig=…+prop:seal`、`acts=17`）明顯不同 ⇒ **分派確實分岔到兩支不同的函式**。

```
node tests/tools/duel-drive.mjs "…/index.html?paperwar=1&fxcount=1&seed=7" scratchpad/duel-new.json   --duels=4 --port=8896
  → {"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":6,"trait":4,"traitFig":4,"ver":"v0.55.2"}
node tests/tools/duel-drive.mjs "…?paperwar=1&fxcount=1&seed=7&fxtier=0" scratchpad/duel-tier0.json --duels=4 --port=8897
  → {"duels":4,"errors":0,…}
```

12 套規則測試（全綠）：

| 測試 | 結果 | | 測試 | 結果 |
|---|---|---|---|---|
| `aistake` | 8 過 | | `legend` | 32 過 |
| `conscap` | 5 過 | | `lineup-order` | 8 綠 |
| `duel-desync` | 7 綠 | | `nightrules` | 16 綠 |
| `emblem-collision` | 9 綠 | | `review` | 28 過 |
| `fxtier` | 14 綠 | | `roles-balance` | 32 過 |
| `fxvocab` | **18 綠**（原 15） | | `wish16` | 36 過 |

### 1.4 視覺交付

| 檔 | 內容 |
|---|---|
| `2026-09-13-xianghuo-b1-evidence/biteGamble/sheet-t1.png` | 6 幀連拍，t1＝300ms（手機視口 844×390@2x，每格 780×360） |
| `…/biteGamble/sheet-t2.png` | 6 幀連拍，t2＝900ms |
| `…/biteGamble/t1-12fps.gif` | t1 慢動作（5× 慢） |
| `…/biteGamble/t2-20fps.gif` | t2 慢動作（3× 慢） |
| `…/biteGamble/zoom-travel-t2.png` | §1.5 自評看的那一張：travel 中（大印落下中、金箔在虎身上），2× 放大 |
| `…/biteGamble/zoom-impact-t2.png` | §1.5 自評看的那一張：衝擊拍（大印轉正＋印文燒紅＋獵物被壓），2× 放大 |
| `…/duel/real-seed3-biteGamble.png` | ★**真實對決**裡虎爺印的衝擊拍（844×390@2x）★ |
| `…/contrast-t1/`、`…/contrast-t2/` | P3 的 A／B 凍幀與 `shots.json` |
| `…/propsize/prop-size-t{1,2}.{tsv,json}` | Q5 尺寸記錄表 |

sheet 與 GIF 的產法：
```
node tests/tools/blindread-sheet.mjs scratchpad/sheets --only=biteGamble --tiers=1,2 --port=8847 --label
（`--label` 只給製作人看，會壓招名與 tier；產給 P4 讀者的材料一律不帶這個旗標）
```

真實對決那張：`duel-drive.mjs` 新增 `--traitshot=<trId>`（`tests/tools/duel-drive.mjs:145-157`）——
招只演 300／900ms 而治具主迴圈是 250ms 輪詢，直接截會錯過，所以照 L3 那條路**凍幀**
（到衝擊拍時派 `ys:hitstop` 停 4 秒，截完立刻解凍，對決照跑）。
`seed=7` 的一整局 14 場 55 次招式裡**沒有人買到虎爺印**，換到 `seed=3` 第 20 場才抓到：
```
node scratchpad/find-bite.mjs 2 3 5 13 21
seed 2: duels=14 moves={…12 支…} shot=- errors=0
seed 3: duels=20 moves={…biteGamble:3…} shot=…/duel/real-seed3-biteGamble.png errors=2
```

**★那個 `errors=2` 是什麼、算不算 P8 紅★**（不解釋就成了藏在交付物底下的訊號）：
P8 的「兩路徑 0 error」量的是 §1.3 P8 那兩跑（`seed=7`／`seed=7&fxtier=0`，各 4 場，**errors 0**）。
上面這一跑是**找鏡頭**用的探索跑，不是閘門。為了分辨那 2 個錯誤是「產品的」還是「我這支
`--traitshot` 凍幀治具的」，我對同一個 seed 跑了一次**不帶** `--traitshot` 的對照：

```
node tests/tools/duel-drive.mjs "…?paperwar=1&fxcount=1&seed=3" scratchpad/duel-seed3.json --duels=20 --port=8902
{"duels":20,"errors":0,"burn":103,"trait":91,"traitFig":90,"ver":"v0.55.2"}   ← 同 seed、同場數、同樣出了 3 次虎爺印
```

再跑一次**帶** `--traitshot`、同 seed、同場數：

```
node tests/tools/duel-drive.mjs "…?paperwar=1&fxcount=1&seed=3" scratchpad/duel-seed3-shot.json \
     --duels=20 --port=8903 --traitshot=biteGamble --shots=scratchpad/ts
errors: 0    shot: scratchpad/ts-biteGamble.png    duels: 20
```

**所以那 2 個錯誤重現不了**：帶／不帶 `--traitshot` 各跑一次同條件，兩次都是 0 error。
出現那 2 個錯誤的是 `scratchpad/find-bite.mjs`（我為了換 seed 找鏡頭寫的一次性腳本，
**同一個 browser 連續跑兩個 seed**，前一個 seed 的 page 剛關掉）——而那支腳本**沒有把錯誤原文落檔**，
只印了數量。這是我的疏漏，現在補不回來。

按 `02 §6.2`，這個訊號我只固定條件跑了 2 次、沒有跑滿 5 次歸因，所以**它目前不可信**，
我不拿它宣告任何事：**P8 的判定用的是 §1.3 P8 那兩跑**（`seed=7` 與 `seed=7&fxtier=0`，各 4 場，
各自 0 error，`traitfx-drive` 三個 tier 全套 27/27、30/30、3/3 handled）。
那張交付截圖是**畫面**，不是閘門證據；同條件重跑（上面那一跑）在同一場、同一招上截到同一格，
兩張圖看起來一樣（`scratchpad/ts-biteGamble.png`）。

### 1.5 `threejs-visual-loop` 自評（兩輪）

第零步（治具盤點）：本專案三樣齊全，沒有另建——截圖 `blindread-sheet.mjs`／`proto-record.mjs`／
`duel-drive.mjs --shots`／`fx-contrast.mjs`；除錯鉤子 `window.__tfx`（`traitfx-preview.html`）；
fps／draw call `duel-perf.mjs`＋`__tfx.renderMeasured()`。本階段只加了兩個唯讀掛勾（`propSizes()`、`--traitshot`）。

#### 第 1 輪

**看圖**：`sheet-t1.png`／`sheet-t2.png` 六格，＋`scratchpad/zoom-g3.png`（travel 中，2× 放大）
與 `scratchpad/zoom-g5.png`（衝擊拍，2× 放大）。

**發現**
1. **金箔的「紙」讀得出來**：2× 放大下九片金箔是**邊緣清楚的小方片**（有厚度側邊與翹曲），
   不是光點——`st.paperProps` 的擠出＋翹曲有效果，比 E 那版無厚度的 `PlaneGeometry` 好。
2. **大印在落下過程仍讀成「金色括號」**：暗印面（`C.ink`）在夜紫天前沒有邊界，只剩鎏金印身。
   ＝E 報告 §8.6 第 1 輪記過的同一件事。
3. **金箔在 travel 中段仍貼在虎身上**：`ease:'in'` 讓前 45% 只走 9% 路程，
   六格連拍的第 3 格看起來像「虎背上的裝飾」而不是「飛過去的金箔流」。這是 E 的曲線設定。
4. 衝擊拍那一格（第 5 格）三件同時到位：大印轉正、印文在獵物胸前燒成硃紅、獵物被壓矮。
5. 印文那枚是**橫的扁牌**（`EMBLEM.seal` 是 1.56×0.75 的扁框），「虎」字被壓扁——E 既有。

**這一輪我沒有改任何視覺**，理由寫在下面。

#### 第 2 輪

**看什麼**：既然第 1 輪的三個粗點（2／3／5）全都是 **E 定稿本身**的性質，
而 E 是製作人 2026-09-12 親簽的定稿、§8.5 的三個處置選項還在待裁清單上，
改它就不是「轉正」而是「未經簽准動已定稿的演出」。所以第 2 輪改驗**轉正有沒有引入偏差**：

| 證據 | E 原型（`2026-09-12-tiger-proto-report.md` §8.3／§8.4） | 本卷轉正後 | 判定 |
|---|---|---|---|
| t1 `maxD`（逐幀骨骼／model 矩陣差最大值） | 2.2953 | 2.2953 | 相同 |
| t1 `end`／`fill`／`acts`／`rate` | 29／0.9／17／1 | 29／0.9／17／1 | 相同 |
| 招式峰值 draw call | 168（idle 151） | 168（idle 151） | 相同 |
| 峰值三角形 | 51,116 | 51,296 | +180＝擠出側壁，預期內 |
| 簽章 | `burst+emblem:seal+foil+mark:seal+ring` | `burst+emblem:seal+mark:seal+prop:seal+ring` | 只有金箔的 kind 改名 |

**結論**：轉正忠實重現 E，唯一的視覺差異是金箔多了厚度與翹曲（往 §A4 的規格走）。
第 1 輪列的粗點原封記在 §1.6，交製作人在簽字時一併看。

### 1.5b 對抗式覆審（fresh context 冷讀 diff）

派了一個沒有本卷對話史的審查員冷讀 `git diff f8f7c98..HEAD -- js/ tests/`，
題目是「**找出這個改動會弄壞什麼**」（不是「看看有沒有問題」），指名五個面向：
弄壞其他 26 支招／分派有洞／新積木的資源與正確性／靜默降級／`--traitshot` 污染量測。

結果 **0 CRITICAL、0 HIGH**；MEDIUM 1、LOW 1，兩件都在下面處置：

| 級 | finding | 處置 |
|---|---|---|
| **MEDIUM** | 尺寸防線的掃描對 `st.paperProps` 的**間接層**有盲點：它回傳的是包裝物 `{obj, items, write, size}`，編舞寫的是 `foil.obj.scale.setScalar(…)`，舊正則會把名字抓成 `obj`（不在名單裡）⇒ 靜默放行。目前沒有人這樣寫，但這正是那條防線這一輪剛加嚴要擋的效果換個形狀 | **已修**（`tests/fxvocab.test.mjs:338`：正則加 `(?:\.obj)?`）＋**加回歸案例** `--mutate=7`（在編舞裡塞 `foil.obj.scale.setScalar(0.56)`） |
| LOW | `st.paperProps` 的 `items` 改完要手動叫 `write()`，忘了只會讓道具卡住不動、不會報錯 | **不修，記錄**：JSDoc 已明寫；目前唯一呼叫方每次改完都有叫。要做成自動就得逐幀 diff 或改成 proxy，成本高於收益 |

修完的驗證（雙向，`02 §6.1` 第 1 條）：

```
node tests/fxvocab.test.mjs            → 18 綠 0 紅（分母：4 個編舞檔、92 處 scale 呼叫，11 處落在道具 mesh 上）
node tests/fxvocab.test.mjs --mutate=7 → 17 綠 1 紅
   FAIL 徽記 mesh 的尺寸不得有第二份來源 — xianghuo.js:485 foil.scale.setScalar(0.56）
node tests/fxvocab.test.mjs --mutate=4 → 17 綠 1 紅（原有的繞法回歸案例沒被弄壞）
```

審查員另外逐項確認（我照抄它查了什麼，不是它的結論本身）：
`byTrId` 的 `_v05[45](short)?$` 對 30 個 trId 沒有誤傷、`V054_FULL`／`V055_FULL` 由 `VOCAB_ON` 三元互斥不會同時命中、
`loadMoves` 的載入失敗退路已同步補 `v055` 空表、`finish()` 對 `InstancedMesh` 有 `dispose()`、
`--traitshot` 的凍幀走的是既有 `ys:hitstop` 路徑（`js/renderer.js:150-197`，`lastT` 每幀更新、解凍不會跳一大步）
且整段包在 `if (opts.traitshot)` 裡，不帶旗標時完全不執行。

### 1.6 我看到還粗的地方

1. **大印的世界尺寸超過「本體高 1/2」36%**（§1.1③）——規則怎麼量、要不要改，交裁（三個方向見上）。
2. **大印在落下過程只讀得出「金色括號」**：暗印面在夜空前沒有邊界。E §8.5 的三個選項（甲放大／
   乙改配色／丙改頂點表）都還沒裁。
3. **金箔在 travel 前段幾乎不動**（`ease:'in'`），六格連拍上讀不出「一串飛過去」。
   要改得動 E 的曲線，交裁。
4. **滿編場面下這一招被淹沒**：`real-seed3-biteGamble.png` 是 19 隻 vs 16 隻的那一場，
   畫面上讀得到的是字幕「虎爺印：虎爺反咬」與那枚紅印文，大印與金箔幾乎看不出來。
   ＝E 報告 §5b「滿編 8v8 時只有一尊在動」的延伸，**這是本階段最該注意的一條**：
   閘門全部量在**單尊對單尊**的治具棚裡，而玩家看到的是滿編。
5. **`st.paperProps` 沒有墨線邊**（§1.2 的規格例外），交覆核。
6. **P4 盲讀一次都還沒跑**——本階段所有「讀得出／讀不出」的判斷都是我的目視，不是讀者實測。
7. `programs 19→21`（`InstancedMesh` 當場編 shader）＝既有狀況，本卷沒修。

### 1.7 範圍（`git diff --stat f8f7c98..HEAD`）

| 檔 | 對應哪條需求 |
|---|---|
| `js/trait-fx/vocab.js` | 前置②：`FAC_VOCAB` 白名單＋`MOVE_SPEC` 27 列（§7.2 Q9 的 schema） |
| `tests/fxvocab.test.mjs` | 前置②的 P1 三條機械檢查＋突變 5／6；尺寸防線掃描加嚴到五個入口 |
| `js/trait-fx.js` | `st.paperProps` 新積木＋紙紮共用零件抽出＋`V055` 分派（E 轉正的登記點） |
| `js/trait-fx/xianghuo.js` | E 轉正：`MOVES.biteGamble` 換人、虎的動作零件搬進來、0.55 徽記版改名進 `V055`、0.54 兩支移除 |
| `tests/tools/prop-size.mjs`、`tests/tools/traitfx-preview.html` | 前置③：Q5 尺寸記錄治具與它的唯讀掛勾 |
| `tests/tools/duel-drive.mjs` | `--traitshot`：在真實對決裡截下指定招的衝擊拍（視覺交付第 5 項） |
| `docs/experiments/2026-09-13-xianghuo-b1-evidence/**` | 交付物：sheet／GIF／真實對決凍幀／P3 的 A-B 幀／尺寸表 |
| `docs/experiments/2026-09-13-xianghuo-b1-report.md` | 本報告 |

`index.html` 的 diff 為**空**（含 `VERSION`）。其餘 8 支香火招、祖靈 9 支、陰氣 9 支一行未動。

**判準沒有被動過的對照**（`03 R2` 第 2 項要的是 diff，不是「我心裡想過了」）：

```
git diff --stat f8f7c98..HEAD -- docs/experiments/2026-09-11-acceptance-fx-legibility.md \
  tests/tools/fx-contrast.mjs tests/tools/fx-contrast-metrics.py tests/tools/traitfx-drive.mjs \
  tests/tools/fx-consts.mjs tests/tools/blindread-sheet.mjs tests/tools/duel-perf.mjs \
  tests/tools/trace-eq.mjs tests/tools/proto-record.mjs
（空輸出＝凍結檔與九支閘門治具一行未動）

git diff f8f7c98..HEAD -- js/trait-fx/vocab.js | grep -E "PHASE_GATE|BEAT_FRAC|travelFrac|windupMs|reactMs|ICON =|byKind|markByKind"
（空輸出＝門檻、節拍比例、尺寸表都沒動；vocab.js 的 diff 只有新增的 FAC_VOCAB／MOVE_SPEC 兩塊）
```

`tests/fxvocab.test.mjs` 有改，但**只往嚴的方向**：新增 P1 三條、新增突變 5／6、
尺寸防線的掃描入口從三支擴到五支（`paperStamp`／`paperProps` 補進去）。
沒有放寬任何既有斷言——原本 15 條一條沒動，現在 18 條全綠。

`tests/tools/duel-drive.mjs` 有改，但加的是 `--traitshot`（**只在帶這個旗標時**才注入凍幀）；
P8 那兩跑沒有帶它，走的是與基準完全相同的路徑。

---

## 2. 下一步（要製作人先做的事）

1. **看 §1.4 的 sheet 與 GIF，簽字或退回**——計畫 §4 流程：範本招簽字後才准鋪其餘 8 支。
   ★**下面第 2 點是簽字前的但書，請先看完再簽**★（那兩件事會改變「簽字代表什麼」）。
2. **先讀 §1.6 第 4 條再簽**（不是裁定項，是簽字前該知道的事）：
   **這一卷所有閘門都量在「單尊對單尊」的治具棚裡，而玩家看到的是滿編。**
   `…/duel/real-seed3-biteGamble.png` 那張真實對決（19 隻 vs 16 隻）上，讀得到的只有字幕與那枚紅印文，
   大印與金箔幾乎看不出來。P0–P8 全綠**不等於**「玩家看得懂這一招」——那一題要等 P4 盲讀，
   而 P4 的材料也是治具棚的 6 幀連拍，一樣不含滿編。如果製作人要的是「滿編下也讀得出」，
   那是本卷閘門目前**量不到**的東西，要另外開一條（例如滿編盲讀），現在講比 8 支鋪完再講便宜。

   **同一類的第二件（§1.6 第 6 條，簽字前一樣要知道）**：
   **§1.5 那兩輪「看圖」是我自己的目視，不是讀者實測。** 製作人看 §1.4 的 sheet／GIF
   也是同一件事——**看得懂 ≠ 陌生讀者看得懂**：您與我都知道這一招是「虎爺蓋印」，
   知道了就再也沒辦法用不知道的眼睛看它。那一題只有 P4 盲讀（fresh、無上下文的讀者、
   三題問「在做什麼／打到誰／哪一系」）答得了，而 P4 本階段**一次都沒跑**。
   所以這次簽的是「**這個方向可以往下鋪**」，不是「這一招已經可辨」。
3. 要裁的清單（五項，逐項都附了選項與代價）：
   | # | 題目 | 在哪 |
   |---|---|---|
   | 甲 | 大印的世界尺寸超過「本體高 1/2」36%——規則要量 scale 還是量包圍盒；三個處置方向 | §1.1③、§1.6 第 1 條 |
   | 乙 | 大印落下過程只讀得出「金色括號」（暗印面在夜空前沒邊界）——E §8.5 的甲／乙／丙三選項仍待裁 | §1.6 第 2 條 |
   | 丙 | 金箔在 travel 前段幾乎不動（`ease:'in'`），讀不出「一串飛過去」——要改得動 E 已簽的曲線 | §1.6 第 3 條 |
   | 丁 | `st.paperProps` 不做面板墨線邊（§A4 第 2 條的例外） | §1.2 末、§1.6 第 5 條 |
   | 戊 | 語彙檔 §C 八處動詞正規化裡的**後兩列**（`eliteVsSwarm`「退」→`抖`、`swarmFeed1`「升」→`被拖`）——要不要改成擴充陰氣的反應家族 | §1.1② |
   | 己 | `ring`（貼桌陣）不算進尺寸表的 OVER 欄，是**我的分類判斷**，§B2 沒有明文豁免——要不要把腳下語彙也納入尺寸上限 | §1.1③ |
   | 庚 | `programs 19→21`（`InstancedMesh` 的 shader 變體在玩家第一次看到那一招時**當場編**）＝既有狀況，本卷沒修。試修過的代價是常駐 +4 支 program／+2 draw call（`js/trait-fx.js:206-216`）。**鋪完 9 支之後群體道具變多，這件事只會更常發生**——要不要在階段 B 一起處理 | §1.6 第 7 條 |
4. 簽字之後的階段 B：鋪香火其餘 8 支 → 全 9 支再走一次 P0–P8 ＋ **P4 盲讀**（本階段沒跑）。

---

## 3. 簽字與裁定（2026-09-12 晚）＋ 併回 main（v0.55.3）

> ★§1／§2 是**簽字前**的紀錄，一字不改地留著★（改掉就看不出當時交上去的是什麼）。這一節是簽字之後的事。

### 3.1 製作人的裁定

| # | 題目（§2 的編號） | 裁定 |
|---|---|---|
| 甲 | 大印尺寸超過上限 | **上限由「≤ 本體高 1/2」放寬成「≤ 2/3」**，量法定為**世界包圍盒**；仍是**記錄項不擋批**。大印 0.676 仍略高於 0.667，記錄在案 |
| — | §2 第 2 點的滿編問題 | **tier 1 只是氛圍**，法寶身分靠 **tier 2／3 近景與印文**承擔；**P4 盲讀材料改兩種：1v1 治具棚 ＋ tier 2 近景**。另「tier 1 主角拍短暫推鏡」記待辦，批 1 鋪完真機看整場再裁 |
| 乙／丙／丁／戊／己／庚 | 其餘六項 | 未裁，留到階段 B 一起看（已記在計畫 §7.3） |

裁定落點：`ART_BIBLE.md` §10.2 第 4 條、`2026-09-12-fx-vocab-draft.md` §A3、
`plan-fx-performance.md` §3／§7.2 Q5／§7.3、`tests/tools/prop-size.mjs`（`LIMIT` 0.5→2/3）、
`tests/tools/traitfx-preview.html:249` 的掛勾註解。
**`LIMIT` 只決定表上標不標 `OVER`、不決定 exit code**（那支治具永遠 exit 0），
所以改它不是移動及格線——沒有任何一份實作會因為這一行從紅變綠。

### 3.2 併回 main（`09153d0` v0.55.3 ＋ `48d821f`）

main 這段期間上了 **N11／N12 徽記尺寸防線最終版**（執行期鎖＋`onAfterRender` 稽核＋場景掃描、
`st.iconScale` 成為徽記縮放的唯一入口、`fxvocab` 的繞法回歸案例擴到 `--mutate=4..20`）。
`git merge main` 四處衝突，解法與理由：

| 衝突 | 解法 |
|---|---|
| `js/trait-fx/xianghuo.js`（`biteGamble` 本體） | 取**我的 E 正式版**；main 對這支招的兩處 `st.iconScale`（`seal`／`stamp`）**跟著 0.55 徽記版一起搬進 `V055`**——不搬就等於 `?fxvocab=1` 那條路繞過了尺寸鎖。`wardImmuneLost` 的那一處由 git 自動合併 |
| `tests/fxvocab.test.mjs`（四塊） | **一律取 main**：它的 `emblemNames` 有別名不動點、`SIZE_MEMBERS` 七個成員、分母註解完整，是我那版的超集。我這一輪加的「5 入口擴充」與 `(?:\.obj)?` **撤回**（理由見下） |
| `docs/proposals/…-plan-fx-performance.md` | 兩段都留（main 的簽字裁定列 ＋ 我的 §7.3），並把 §7.3 改寫成「簽字後」的狀態 |

**★為什麼撤回原始碼掃描的 5 入口擴充（這是我上一輪加嚴、現在自己拿掉的東西）★**
main 的 N11 把徽記縮放收斂成唯一入口 `st.iconScale(mesh, k)`，而它**只吃 `SIZED` 裡的物件**
（`st.icon`／`st.icons`／`st.mark` 產的）。`st.paperStamp`／`st.paperProps` 不在尺寸鎖裡
（main 自己把它列在 `tests/tools/README.md` 的「已知未涵蓋」，`BLOCK_MADE` 只讓場景掃描放行它們）。
所以正式版 E 的大印／印文只能寫 `big.scale.setScalar(st.iconSize * …)`——
**把這兩支加進 `emblemNames()` 會讓這些合法寫法整批判紅，而它們沒有合法的替代寫法可走**。
README 那一條已改寫，明講這是**有意識留著的缺口**與補法（在積木的工廠裡呼叫 `lockIconScale(...)`，
那要先讓 `st.iconScale` 支援 Group 與 InstancedMesh）。
我補的是**場景掃描的放行**：`st.paperProps` 的 InstancedMesh 加進 `BLOCK_MADE`
（`js/trait-fx.js` 的 `paperProps` 末段），與 `paperStamp` 的三片同一類處置——**掃描一行都沒關掉**。

P1 的兩個突變號碼與 main 的 `4..20` 撞號，改成 **`--mutate=21／22`**。

---

## 4. 階段 B：其餘 8 支香火招（2026-09-13）

基準＝main `98ab851`（v0.55.4，階段 A 已合併上線）。**未合併、未 push**。

### 4.1 逐支表

| # | 招（法寶） | 動作 | 道具 | 反應 | 衝擊拍 | P2 phases | P3 t2 area／ΔE | draw call（idle→峰值） | Q5 尺寸（ratio） |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `wardImmuneLost` 千里眼銅鈴 | 震 | 丁 銅鈴＋乙 同心方框鈴波 | 升（同伴托起＋蓋鈴印） | 鈴抵達同伴頭上＝方框推到最遠＝同幀托起 | 三段 | **1.2577%／28.76** | 194→207（+13） | 鈴 0.654／鈴印 0.654 |
| 2 | `eliteCleave` 王爺劍 | 掃 | 丁 斬擊弧 | 退（整排 stagger） | 劍到底＝弧掃過整排＝第一隻同幀後退 | 三段 | 0.8768%／65.04 | 157→164（+7） | 弧 0.615 |
| 3 | `wardAtkAll1` 媽祖令旗 | 掃 | 乙 金紅大旗（脫離旗桿） | 升（側踏＋蓋旗印） | 旗展到滿＝掃過整排＝同幀側踏 | 三段 | 1.0858%／84.45 | 198→212（+14） | 旗 0.664／旗印 0.633 |
| 4 | `wardAbsorb4` 送王船 | 降 | 乙 四面金箔帆（同心方框） | 升（托起＋蓋船印） | 帆立到位＝船前滑到底＝傷害化灰 | 三段 | 1.1888%／63.72 | 198→213（+15） | 帆 0.623／主帆 0.656／船印 0.633 |
| 5 | `swarmRally` 五營旗 | 拍 | 乙 五面小旗＋貼桌方陣 | 升（三尊托起） | 頓足落地＝五旗插定＝方陣漲開 | 三段 | 3.028%／66.15 | 233→**256（+23）** | 旗 0.666 |
| 6 | `wardHpFirst` 香灰符 | 降 | 丙 金灰顆粒流＋乙 金色方符 | 升（前鋒托起＋蓋符） | 傾倒到位＝灰抵達＝符落定 | 三段 | 0.9682%／76.34 | 178→185（+7） | 符 0.651／灰 0.121 |
| 7 | `wardRegen1` 福壽綿長 | 降 | 丁 燈焰（脫離燈罩） | 升（最傷那隻托起＋蓋燈印） | 燈焰抵達＝同幀亮邊上抬 | 三段 | 1.4461%／92.89 | 178→188（+10） | 燈焰 0.617／燈印 0.597 |
| 8 | `swarmLastStand` 破軍旗 | 拍 | 乙 缺角殘旗 | 升（**在自身**：邊光爆＋前傾撐住） | 矛插到底＝殘旗展開＝自身邊光爆 | 三段 | 1.1341%／85.79 | 153→159（+6） | 殘旗 **0.917 OVER** |

（t1 的 P3 與 t2 同量級，逐支數字在各自的 commit message 與 `…-b1-evidence/<trId>/contrast-t1/`。
所有 8 支的 `traitfx-drive` t1／t2 都是 **PASS `fill=0.9 rate=1 err=0 prog+0`**。）

### 4.2 三個共通的坑（每一支都踩過，記在這裡免得下一批重踩）

1. **`st.toward()` 是 group 空間、`st.dir` 才是世界空間**。把 `toward` 的結果加到世界座標上，
   道具會飛到畫面**另一側**（送王船實測：帆飛到離敵方最遠的那一邊）。
2. **`travel` 那一段要真的飛一段**：`evalPhases` 量的是 `mesh.position` 的位移，門檻是
   `travelDist × 0.40`（實測多在 1.25 左右）。「原地脹大」「只在本方隊伍裡挪一點」都不算——
   送王船、五營旗、破軍旗三支的第一版都因此漏掉整段 travel，落點改成「陣前／往前挑起」才過。
3. **群體道具（`prop:`）不進 L3 的量測對象**（`fxVis` 只切 `emblem:`／`mark:`／`trail`）。
   一支招如果道具**全部**走 `st.paperProps`，L3 會量到 `hidden:0`／`dead:true`／`area 0.0%`。
   解法是讓「主件」走 `st.paperStamp`（送王船的主帆、五營旗的五面旗都是這樣改的）。

### 4.3 §A3 尺寸上限與 L3 面積在**矮的那幾尊**上會互斥

`figH`（施招本體高）逐尊差很多：`pojun` 1.0019 ／ `wuying` 1.0577 ／ `flag` 1.4201 ／
`bell`・`wangchuan`・`ashcharm`・`fushou` 1.54 ／ `sword` 1.9203。
上限是 `figH × 2/3`，所以矮的那幾尊道具只能做得很小，而 L3 要求 **≥0.8% 的畫面面積**。

- **五營旗**（figH 1.06）靠「五面旗」湊面積過關（單面 0.666 合規）。
- **破軍旗**（figH 1.00）只有**一件**道具，湊不了：縮到 2/3 時 area 只有 0.4457%。
  先推近鏡頭、再放大到 ratio **0.917** 才過 1.1341% ⇒ **超過 2/3，依 Q5「記錄項不擋批」記在案，交裁**。
- 另一招常用的手段是**把道具落點往鏡頭推**（`TOWARD_CAM`）：世界尺寸不動、畫面像素變多。
  媽祖令旗、送王船、五營旗、破軍旗都用了。**但推過頭會出畫面**——破軍旗實測推到 2.4 倍時
  旗跑到畫面上緣外，面積反而從 0.4457% 掉到 0.3637%。

### 4.4 一處與 §C2 散文不同的配色（交製作人覆核）

**破軍旗的殘旗**：§C2 寫「高飽和硃紅」，但硃紅 `#ff5a3c` 對暗紅褐桌面 `#6b3418` 色相太近——
整面硃紅時 L3 實測 **ΔE 中位 25.22 < 門檻 28**（面積 1.38% 是夠的）。
改成**鎏金面＋硃紅墨線邊**之後 ΔE 85.79。紅仍在（邊上），而且這才是 §B2 香火材質
「暗面 `ink`、亮邊鎏金」那條的寫法。**要不要改回整面硃紅（那就得另想辦法拉 ΔE），交裁。**

### 4.5 批末驗收（全部實跑）

| 項目 | 結果 |
|---|---|
| `traitfx-drive --tier=1` ／ `--tier=1 --fxvocab=1` | **27/27** ／ **27/27**（重複簽章 0） |
| `--tier=2` ／ `--tier=2 --fxvocab=1` ／ `--tier=3` | **30/30** ／ **30/30** ／ **3/3** |
| `duel-drive --seed=3` 4 場 ／ `--seed=7` 4 場 | **errors 0** ／ **errors 0**（`ver v0.55.4`） |
| 12 套規則測試 | 8／5／7／9／14／**19**／32／8／16／28／32／36 **全綠** |
| `trace-eq` 對 `98ab851` | `equal:true`（bytes 357285 一致，`index.html` 一行未改） |
| `duel-perf` 對基準 `98ab851`（seed 7、visible 15=15） | fps **59.9:59.9＝1.00** ≥0.95；draw call **934 vs 932** ≤1000 |

**`duel-drive` 的徽記稽核在兩個 seed 上都是「未量到」**（`n/a`）——與階段 A 同一個結構性原因
（預設路徑下沒有招走 `st.icon` 系列了，8 支轉正之後更是如此），這是 main 記在 README 的 **N-6**。
要量執行期那道防線請帶 `--fxvocab=1`（階段 A §3.3 有一跑：違規 0／鎖上 132 of 132）。

### 4.6 P4 盲讀材料（兩種，照製作人裁定）

| 材料 | 路徑 | 內容 |
|---|---|---|
| A 1v1 治具棚 | `…-b1-evidence/p4-material-A-booth/` | 9 支 × t1＋t2 ＝ **18 張**＋`mapping-HIDDEN.json` |
| B tier 2 近景 | `…-b1-evidence/p4-material-B-closeup/` | 9 支 × t2 ＝ **9 張**＋`mapping-HIDDEN.json`（`camdist 2.4`） |

兩份都**不帶 `--label`**（是給讀者的材料）；B 的每一張另外複製一份到各支目錄當 `closeup-t2.png`。
為了產 B，`traitfx-preview.html` 新增 `?camdist=`（夾 1.2–6，預設 4.2）、`blindread-sheet.mjs` 新增
`--camdist` 轉送——**不帶參數＝原本的對決機位一個位元組不變**，L3 與材料 A 都不帶它。

★**讀者由主對話派，我沒有跑 P4**★：材料產好了，及格線（三對讀者、每格 Q1–Q3 全對、
三對中 ≥2 對）與判定照計畫 §5 的 P4，不在本階段。

### 4.7 還粗的地方（階段 B）

1. **破軍旗的尺寸超標**（ratio 0.917 vs 2/3）與**殘旗配色**（§4.4）——兩項都交裁。
2. **五營旗的 draw call +23**，是 8 支裡最貼近 `idle + 25` 的一支；滿編時若再加東西會破。
3. **「掃過整排」在治具棚讀不出來**：媽祖令旗與王爺劍的整排只有 2–3 尊，旗／弧掃過去的距離很短。
   這一條要等滿編或 P4 材料 B 才看得出來。
4. `st.paperProps` 仍**不在尺寸鎖裡**（與 `st.paperStamp` 同屬 README 的「已知未涵蓋」）——
   8 支轉正之後 `duel-drive` 的預設路徑一個徽記都量不到（§4.5 的 N-6），這個缺口比階段 A 時更大。
5. 每一支的視覺自評都只跑了**一輪**（銅鈴兩輪）。
6. **批末整批看了一輪**（`…-b1-evidence/batch-contact-t2.png`：8 支的 travel 中格並排）：
   八件道具的形狀確實各異（鈴／劍弧／大旗／方框帆／五面小旗／方符／火舌／缺角旗）、色票統一在鎏金＋硃紅，
   「一眼看出是香火系、而且八支互不相同」這一層是成立的。兩個還粗的：
   ① **送王船的「同心方框」在對決機位下讀成「兩塊金板」**——四面帆有兩面正對鏡頭、兩面側面幾乎看不見；
   ② **王爺劍與媽祖令旗的拖尾白線仍然明顯**（1px MAT_LINE），雖然已經降到 0.28–0.30 的透明度。

### 3.3 合併後重跑（全部實跑）

| 項目 | 指令 | 結果 |
|---|---|---|
| `fxvocab` | `node tests/fxvocab.test.mjs` | **19 綠 0 紅**（main 的 16 案 ＋ 我的 P1 三案） |
| P1 鑑別力 | `--mutate=21` ／ `--mutate=22` | 各 **18 綠 1 紅** |
| N11 鑑別力抽樣 | `--mutate=4` ／ `12` ／ `17` ／ `20` | 各 **18 綠 1 紅**（合併沒弄壞 main 的繞法回歸） |
| `fxtier` | `node tests/fxtier.test.mjs` | **14 綠 0 紅** |
| 12 套規則測試 | aistake 8／conscap 5／duel-desync 7／emblem-collision 9／fxtier 14／fxvocab 19／legend 32／lineup-order 8／nightrules 16／review 28／roles-balance 32／wish16 36 | **全綠** |
| P0 `trace-eq` | `node tests/tools/trace-eq.mjs scratchpad/base-09153d0.html index.html` | `{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}` |
| `traitfx-drive` t1 預設路徑 | `--tier=1 --port=8911` | **27/27 pass**，重複簽章 0 |
| `traitfx-drive` t1 徽記路徑 | `--tier=1 --fxvocab=1 --port=8912` | **27/27 pass** |
| `traitfx-drive` t2 範本招 | `--only=biteGamble --tier=2 --port=8913` | **PASS** `fill=0.9 rate=1 acts=17 maxD=2.3239 err=0 prog+0 size=n/a(0v/0of0/u0+d0)`（`maxD` 與合併前逐值相同＝動作沒被合併改到） |
| `duel-drive` seed 3 | `--duels=4 --port=8914` | `{"duels":4,"errors":0,"ver":"v0.55.3"}` |
| L3 四支（徽記路徑） | `fx-contrast.mjs --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost --fxvocab=1 --port=8845` ＋ `fx-contrast-metrics.py` | **與 N11 的 `r7-l3-current-metrics.txt` 逐位元組相同**（`diff` 空輸出）；四支 `pass 4`、違規 0、鎖上 15/15、稽核 `u390+d15` |

**★兩件要照實講的★**

1. **`duel-drive --seed=3`（預設路徑）的徽記稽核「未量到」**：治具自己印
   `★這一跑沒演到用徽記的招＝未量到，不得當成通過★`。
   原因是結構性的——預設路徑下會進 `SIZED` 的只有走 `st.icon`／`st.icons`／`st.mark` 的招，
   而那四支示範招在預設路徑被 `V054`（三支）與 E 正式版（虎爺印）覆蓋掉了。
   這是 main 已記在 README 的 **N-6**（`duel-drive` 對正式路徑的 kind 覆蓋率不足），不是本次合併造成的。
   **補跑一條把它量到**（帶 `fxvocab=1`，治具在這個模式下「沒量到就判紅」）：

   ```
   node tests/tools/duel-drive.mjs "<url>&seed=3&fxvocab=1" scratchpad/m-duel3-vocab.json --duels=20 --port=8916
   {"duels":20,"errors":0,"ver":"v0.55.3"}
   徽記世界尺寸斷言：ok　違規 0／鎖上 132 of 產出 132／稽核 update 4556＋draw 4424／tween 安靜死掉 0
   世界寬度 {"knife":[0.24,0.448],"knife:part":[0.28,0.488],"seal":[0.285058,1.06392],"seal:part":[0.356323,1.14972]}
   ```

   `seal` 出現在世界寬度表裡 ⇒ **搬進 `V055` 的 0.55 徽記版虎爺印仍在尺寸鎖的涵蓋內**
   （那兩處 `st.iconScale` 跟著搬對了；若漏搬，這一跑會是「違規 > 0」）。

2. **E 正式版在 `traitfx-drive` 上是 `size=n/a(0v/0of0/u0+d0)`**：它不走 `st.icon` 系列，
   所以一個物件都沒進 `SIZED`。這與 §3.2 講的「紙紮道具不在尺寸鎖裡」是同一件事的兩面——
   **不是防線壞了，是它本來就沒涵蓋這一支**，涵蓋範圍與補法寫在 `tests/tools/README.md` 的已知未涵蓋。

### 3.4 一處合併時發現、必須改的東西（記在這裡免得下一個人改回去）

E 正式版裡那枚印文的變數名從 `seal` 改成 **`imprint`**。
`tests/fxvocab.test.mjs` 的尺寸掃描是**純文字、不分作用域**的：同一個檔案裡只要有任何一處
`const seal = st.icon(…)`（檔尾的 `V055.biteGamble_v055` 正好有），`seal` 這個名字全檔都會被當成徽記，
於是 E 版裡合法的 `imprint.scale.setScalar(st.markSize * …)` 會被判成「尺寸的第二份來源」。
**實測**：叫 `seal` 時那條規則判紅 2 處（`xianghuo.js` 的兩處 `seal.scale`），改名後 19 綠 0 紅。
理由已寫在該變數宣告上方的註解裡。

### 3.5 合併後的範圍

`index.html` 相對 `09153d0` 的 diff 為**空**（版號仍是 main 的 v0.55.3；本卷沒有動它）。
凍結檔與九支閘門治具（`fx-contrast.mjs`／`fx-contrast-metrics.py`／`traitfx-drive.mjs`／
`fx-consts.mjs`／`blindread-sheet.mjs`／`duel-perf.mjs`／`trace-eq.mjs`／`proto-record.mjs`／
`2026-09-11-acceptance-fx-legibility.md`）相對 `09153d0` 一行未動；
`tests/tools/duel-drive.mjs` 只多 `--traitshot`（不帶旗標時完全不執行）。

## 5. P4 盲讀（第 1 輪，主對話派六位 context-free opus 讀者，2026-09-13）：❌ 未過（8/9 支）
材料 A（治具棚 t1+t2，18 張）＋B（t2 近景，9 張）三對各自混洗；判準先落檔（`p4-blindread/score.mjs`，commit `f5d985c`）；結果 `p4-blindread/score.txt`。只有破軍旗過（自己／自己）；千里眼銅鈴 A 兩格過、B 紅。

**逐題拆解（各 /18）**：系別 Q3 全部 18/18。失敗集中兩類：
1. **量測缺陷（材料裡只有 1–2 尊）**：Q2「我方單一／我方多個／自己」與「敵方單一／敵方多個」在治具棚裡無法區分——媽祖令旗（效果 18/18、對象 0/18 皆答「自己」）、香灰符、福壽綿長（同型）、王爺劍（效果 18/18、對象 18 張答「敵方單一」但真值「敵方多個」——場上只有一個敵人）。這四支的紅不是演出問題。
2. **演出真的讀錯（三支）**：
   - **虎爺印**（範本）：效果 3/18，讀成「詛咒削弱」11、「偷取」4——蓋在獵物身上的硃紅印文被讀成詛咒符牌，咬擊本身沒被讀成打擊。
   - **五營旗**：效果 0/18、對象 0/18，18 張全讀成「打擊／敵方多個」——旗陣與粒子落在敵方半場。
   - **送王船**：效果 7/18（11 張讀「打擊」）、對象 0/18——金箔帆／箭頭飛向敵方。
Q4 法寶名 0/162（只記錄；讀者寫「令旗」「金鐘罩」等通稱，不與 ABILITIES 全名逐字相等）。

處置交裁（主對話）：演出三支回修；材料改成至少 2v2（讓 Q2 可判）再跑第 2 輪（三輪上限）。

## 6. P4 盲讀第 2 輪（2v2 材料，六位新讀者）：❌ 未過（8/9），失敗收斂為兩個結構問題
評分 `p4-blindread-r2/score.txt`（判準同第 1 輪）。五營旗過；送王船效果 18/18、虎爺印對象 15/18、系別九支 18/18。
剩餘失敗：① **增益招效果畫在施招者自己身上**（令旗 0/18、香灰符 0/18、福壽 0/18、送王船 2/18 全答「自己」，2v2 下同伴零反應）；② **跨場白色拖線被讀成「偷取」**（銅鈴 7/18、破軍旗 7/18、香灰符 3/18）；③ 王爺劍「敵方多個」8/18（第二個敵人沒被明顯掃到）；④ 虎爺印效果 6/18（印記語意＝詛咒／偷取），交製作人裁（甲拿掉獵物印文／乙接受詛咒為替代正解＝移動及格線／丙不動）。第 3 輪為上限。
