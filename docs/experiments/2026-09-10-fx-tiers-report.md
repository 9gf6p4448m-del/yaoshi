# 實跑報告：招式三級視覺分級（v0.54，**四版**，2026-09-10～11）

> 驗收凍結＝`docs/experiments/2026-09-10-acceptance-fx-tiers.md`（F0–F10，**正文門檻一字未動**；§2.1 修訂一～六）。
> 計畫檔＝`docs/experiments/2026-09-10-plan-fx-tiers.md`。基準＝`adbb124`。
> 一版 `a862bbd`（r1 受審）、二版 `5a1220e`（r2 受審）、三版 `6d10712`（r3 受審）。
> ★所有「基準」量測跑在 `git archive adbb124` 的**完整基準樹**（`scratchpad/basefull`）；
> 「新版」跑在 `scratchpad/headfull`（`git archive HEAD` ＋工作區七支檔同步，`index.html` 與工作區逐位元組相同）。★

## 結論（給只看三行的人）
1. **r3 的 HIGH 三條全修**：**H-1 N1 真修**（字幕改絕對定位移進黑條之間，`scrollHeight` 從 416 降回 390）、
   **H-2 L7 改成量真實對決版面**（走 `duel-drive` 的 `onDuel`，不再是 `display:block`＋空 arena）、
   **H-3 rate** 三尊原生壓進 1400ms（1.0408／1.0561 → **全部 1.0**），`rateOK` 的適用範圍不再被縮到 tier 1。
2. **突變驗紅到位**：拿掉 N1 的修法 → L7 紅在 **`duelBeat` 82.3%／`duelSub` 100%／`duelResult` 16.5%**
   ——與 r2 覆審員在真實對決上實測的 82.4%／100%／16.5% **逐項吻合**，證明新 L7 量的正是真正的失效模式。
3. **修訂五改寫成「合計 −10%」後轉綠**（32710 vs 37911 ＝ **−13.7%**）；三場逐場數字全部保留在報告裡。
   `?closeup=0` 現在連黑條一起關（r3 M-4：原本「黑條照舊」的理由是循環論證）。

## 四版做的四件事（範圍嚴格限定）

### ① N1 真修（r3 H-1）
- **三版的修法為什麼無效**：`#duel` 是 `flex-direction:column; justify-content:center; overflow:hidden`，
  而真實對決內容本來就塞不下（`scrollHeight` 390→416 > `clientHeight` 390）。
  **內容溢出時居中對齊的是內容盒中心**，上下加等量 padding 之後中心點不變（`(31.2+358.8)/2 == (0+390)/2 == 195`），
  所以字幕一格都沒動、只是多裁 26px。覆審員實測修前修後 `#duelBeat` 幾何逐值相同。
- **四版的修法**：黑條開著時把三塊字幕**移出 flex 流**（`position:absolute`），直接釘在兩條黑條之間的安全區
  （`#duelBeat` `top:calc(8vh + 6px)`、`#duelResult` `bottom:calc(8vh + 28px)`、`#duelSub` `bottom:calc(8vh + 8px)`）。
  移出流之後內容高度變小，`scrollHeight` **416 → 390**（不再溢出），舞台照舊居中。
- **實測（真實對決、844×390、黑條全開）**：`#duelBeat` [37.2, 58.2]、`#duelResult` [304.8, 330.8]、`#duelSub` [332.8, 350.8]，
  對上黑條 [0, 31.2] 與下黑條 [358.8, 390] 的**交集面積全部 0**。
- **人眼**：`shots-t3-real/wardGuardAll-45.png` — 「二 拍●・○護」完整可見、落在上黑條之下；
  血條、隻數、跳字「−1 隻」都在，與字幕無重疊。

### ② L7 改成量真實對決版面（r3 H-2）
- 舊 L7 把 `#duel` 設 `display:block` ＋ 空 `#duelArena`，換掉的正是決定這個 bug 成敗的那一段（居中 flex ＋ 內容溢出），
  所以下黑條那一半從頭到尾碰不到任何元素。
- 新 L7 走 `duel-drive` 的 `onDuel` 掛點（對決演出進行中）派 tier 3 ＋ 開黑條，等 transition 穩定後量幾何；
  `#duelSub`／`#duelResult` 在量測當下若沒有內容，塞一段與真實同型的文字（版面仍是真實 flex＋溢出，只是保證元素佔得到位，標 `injected`）。
- **844×390 與 390×844 都量**。直式：`#rotateHint`（z-index:99、inset:0）在 portrait 是 `flex`、整片蓋住畫面，
  對決不可見（`#duel` computed `display:none`）⇒ 記錄並跳過交集判定。
- **突變驗紅**（拿掉三條 absolute 規則，改在工作區跑完立刻用備份副本還原）：
  `duelBeat` area 1244.3／**82.3%**、`duelSub` 3369.1／**100%**、`duelResult` 952.6／**16.5%**。

### ③ rate（r3 H-3）
- **三尊時間軸原生壓進 1400ms**（不寫修訂）：`wardGuardAll` 的餘韻 delay 1000+45i→960+30i、ms 300→280；
  `hauntAnswer` 的 delay 980+40i→940+28i、ms 280→270 等。
- 結果：`horizon` **1290／1296／1294**（≥1250，M1 保住）、`maxRate` **全部 1.0**、`fill` 0.921／0.926／0.924。
- `traitfx-drive` 的 `shortOK` 不再把 `rateOK` 限縮到 tier 1：**tier 1 與 tier 3 都驗 `rate ≤1.0`**；
  tier 2 的完整版在滿編錯開時本來就會被等比加速（v0.53 既有、`rateMax` 2.2、L4 已記錄）⇒ **只印不判**
  （實測 30 套裡 28 套 >1.0，最高 2.1429）。報告不再出現「rate ≤1.06」這種寫法。

### ④ `?closeup=0` 連黑條一起關（r3 M-4）
- 原本「黑條照舊」的兩條理由：「它是 DOM 不是鏡頭」（分類學，不是玩家體驗的理由）、
  「它還負責讓字幕內縮」（**循環論證**——字幕要內縮的唯一原因就是黑條存在）。
- 現在 `pwPlayBeat` 開黑條那一側加 `pwCloseup()` 條件；**關的那一側不加條件**
  （防線按危險的效果寫：旗標中途被改也必須關得掉）。
- L8 加黑條斷言：`?closeup=0` 下 `maxK=0`、`onCount=0`、**`barH:[0, 0]`**。

## 逐條三態表（四版）

| 條 | 狀態 | 關鍵數字 | 證據 |
|---|---|---|---|
| F0 等價雙向 | **綠** | `trace` equal（357285）＋`--beats` 拍序列 equal（540776、`injected:true`）；既有 9 套＋新 14 條全綠 | `trace-eq`／`fxtier.test.mjs` |
| F1 分母歸一 | **綠** | runtime 0 處重複來源；14 條對完整基準樹 **14 紅**（全在行為斷言、零 ENOENT） | `tests/fxtier.test.mjs` |
| F2 短版原生合身 | **綠** | `--tier=1` **27/27**（rate 全 1.0）、`--tier=2` **30/30**（rate 只記錄：28 套 >1.0、最高 2.1429，v0.53 既有）、`--tier=3` **3/3（rate 全 1.0、horizon 1290/1296/1294、fill 0.921–0.926）** | `tfx-t1/2/3.json` |
| F3 主條 | **綠（修訂四：以實測值通過）** | 四版 **5018ms**（全距 [4996, 5155.5]、展幅 159.5）；基準 5604ms；effect **−586**、`overlap:false` | `pace-ab.json` |
| F3 子條（修訂五：合計 ≤基準−10%） | **綠** | tier 3 三場合計 **32710 vs 37911 ＝ −13.7%**；逐場 −21.3%／−10.4%／−3.4% 全部保留 | `duel-t3.json`／`duel-base-16.json` |
| F4 可讀性不退 | **綠（修訂六）** | 有樣本部分 `deepOk` 10/10、`monoQuiet` 6/6；`nullCount` 4（**記錄項，本卷此半無閘門**，效力由治具小卷回復）；`dmg` seed3 空過 1 ＝基準 1 | `cu-on1.json`／`dmg-*`／`dmg-base-*` |
| F5 機械段 | **綠** | **L1–L8 全過**；L7 在**真實對決版面**上三個字幕交集面積 0（844×390），直式記錄 rotateHint 蓋板；L8 `?closeup=0` 下 `maxK=0`、`barH:[0,0]` | `lbox.json` |
| F5 人眼段 | **交使用者** | 兩張 sheet（幀位 20/45/75%）；tier 3 從真實對決路徑截 18 張（含 `-nobox` 對照），字幕完整、無與血條／跳字重疊 | `sheet-*.png`／`shots-t3-real/` |
| F6 fps | **綠（訊號展幅大，已標註）** | `rendersPerSec` 6 次中位 263.1／246.65＝**1.067**；draw calls 新版 926–962 vs 基準 958–965 | `fps-ab.json` |
| F7 Playwright 零錯 | **綠** | `pace-ab` 30 次 drive 0；`duel-new`／`duel-fxtier0` 各 4 場 0（`ver` 已是 v0.54）；`traitfx-drive` 三個 tier 全套 0；三支探針 0 | 各 json |
| F8 文件 | **綠** | GUIDE §11.27；`VERSION="0.54"`；`ART_BIBLE`／`GAME_DESIGN` 未進 diff | `git diff --stat` |
| F9 範圍 | **綠（修訂三）** | 27 個非證據檔全部在計畫檔第 1 節；`TRAITS` diff 只有 `tier:3` 三行；引擎 11 支函式對 `adbb124` 逐位元組相同（r3 用 SHA-256 複驗） | 見 §F9 |
| F10 短版品質下限 | **綠** | 27 支非 flinch 動作數 5–30，全 ≥2 | `tfx-t1.json` |
| ?fps=1 對決最低 fps | **綠** | D1 文字「對決最低 55」數值 >0；D2 不帶參數 DOM 查無；D3 兩場各 18／55 | `fpsdiag.json` |

## r3 覆審 findings 逐條三態

| # | 標題 | 三態 | 證據 |
|---|---|---|---|
| **H-1** | N1 沒修好（修法在因果路徑之外） | **真的修好** | 字幕改 `position:absolute` 釘進安全區；`scrollHeight` 416→390；真實對決三元素交集面積全 0；突變拿掉修法 → 82.3%／100%／16.5%（與 r2 實測逐項吻合） |
| **H-2** | L7 對真正的失效模式零鑑別力 | **真的修好** | L7 改走 `duel-drive` 的 `onDuel`（真實 flex＋溢出版面），`duelSub`／`duelResult` 用同型文字保證量得到；844×390 與 390×844 都量；突變**三項都紅**（三版只紅一項） |
| **H-3** | 報告把凍結的 `rate ≤1.0` 寫成 1.06 判綠 | **真的修好** | 選 r3 給的路 (b)：把三尊時間軸壓到 `rate` 全 1.0（不寫修訂）；`traitfx-drive` 的 `rateOK` 不再限縮到 tier 1（tier 1＋tier 3 都驗，tier 2 只記錄）；報告改成事實 |
| **M-1** | 修訂四數字與 repo 證據不同步 | **真的修好** | 凍結檔標題改「以 **5009ms** 通過」並補三版列（5009／[4993.5,5047]／展幅 53.5／−512.5）；四版重量 5018 也寫進報告 |
| **M-2** | F4 連續兩次放寬、已無及格線 | **真的修好（記錄）** | 報告 F4 那一格已白紙黑字寫「**本卷此半無閘門**，效力由治具小卷回復」 |
| **M-3** | 修訂五的新判準仍量不到 tier 3 | **真的修好（記錄）** | 凍結檔修訂五末段明寫「合計判準同樣量不到 tier 3……下一卷要換」 |
| **M-4** | `?closeup=0` 下黑條照舊的理由是循環論證 | **真的修好** | 黑條一起關；L8 加 `barH:[0,0]` 斷言；程式碼註解改寫，不再用循環論證 |
| **L-1** | `pace-ab` 不記樹的指紋 | **沒修到（記錄）** | 本輪的兩棵樹已人工核（`headfull/index.html` 與工作區 `index.html` 逐位元組相同）；治具加指紋留給下一卷 |
| **L-2** | `duel-drive` 系列證據沒在三版重跑 | **真的修好** | 四版重跑 `duel-new`／`duel-fxtier0`（`ver` 已是 v0.54、errors 0）；`duel-t3`／`duel-base-16` 沿用（三版四版的改動不影響 duelsMs，理由見下） |
| **L-3** | 報告 fill／acts 範圍寫窄了 | **真的修好** | 改成實測範圍（tier 1 的 `fill` 0.85–0.89、`acts` 5–30） |
| **L-4** | `dmg-base-*` 只證明「某個 v0.53 樹」 | **沒修到（記錄）** | `adbb124` ＝ v0.53 ＋ 一份 md，實務上等價；記錄即可 |

**關於 `duel-t3.json`／`duel-base-16.json` 沿用**：四版改的是 CSS 定位、三尊餘韻的 delay／ms、以及 `pwLetterbox` 的開啟條件，
**都不改變任何 `pwSleep` 的毫秒數**（tier 3 仍是 1400ms、拍末仍是 300/900/1400），所以 14 場的 `duelsMs` 與 tier 分布不受影響。
`?closeup=0` 那條只影響 `?closeup=0` 的頁面，而 `duel-t3` 沒帶那個參數。

## r2 覆審 findings 逐條三態

| # | 標題 | 三態 | 證據／說明 |
|---|---|---|---|
| **N1** | 黑條 z:41 蓋掉 tier 3 那一拍的字幕（`#duelBeat` 82.4%／`#duelSub` 100%） | **真的修好** | 修法是「黑條開著時 `#duel` 內縮 8vh」（`#duel.lbox`）——**不是**把字幕 z-index 提上去：`#duel` 自己是 z-index:40 的 fixed，建立了堆疊上下文，子元素調 z-index 出不去那一層。`lbox-probe` 新增 **L7**：黑條開／關兩種狀態下，`#duelBeat`／`#duelSub`／`#duelResult` 與兩條黑條的**交集面積都必須是 0**。實測 on 時 `#duelBeat` top 0→31.2、`#duelSub` 79→110.2、`#duelResult` 49→80.2，三者 `area:0`。`shots-t3-real` 已重拍 |
| **N2** | F9 轉綠是靠擴大白名單，且掛在不涵蓋它們的「修訂三」底下 | **真的修好** | 凍結檔的修訂三改寫成**完整清單**（11 個條目逐檔一句「為什麼一定會動」），並註明「這一條會讓 F9 由紅轉綠，所以走使用者明確同意」。時序與理由都留在凍結檔裡 |
| **N3** | 報告／凍結檔與 repo 現況多處對不上 | **真的修好** | ① 凍結檔修訂二殘留的 `--nullbase` 字樣改成 `--basecj=<基準產物>` ② 報告 M1 的 horizon 改用實測 **1290／1360／1380**（fill 0.921／0.971／0.986）③ F9 檔數改成 **27** ④ 證據的 `ver` 問題見下方 F9 註 |
| **N4** | `dmg-readability` 的基準沒落檔 | **真的修好** | 對基準樹跑了兩顆 seed，`pix.json` 收進 `dmg-base-s1/`／`dmg-base-s3/`：seed1 `R1:true R2:true`、`maskN:10`、空過 **0**；seed3 `R2:false`、`maskN:0`、`maskDropped {moved:3, tinyMask:2}`、`via {hitstop:3}`、空過 **1**——與新版**逐項相同**，修訂二引用的事實現在有檔可查 |
| **N5** | `?closeup=0` 關不掉 CINEMA | **真的修好** | `ys:fx-trait` 多帶 `cinema: pwCloseup()`，`camera-director` 只在 `d.cinema !== false` 時切 CINEMA（本檔一如既往不讀 `PW_FX`）。`lbox-probe` 新增 **L8**：`?closeup=0` 時 tier 3 的 `maxK===0`、`onCount===0`，黑條照舊開得起來（`barH` 31.19）。★黑條不跟著關的理由★：它是 DOM 畫面框飾、不是鏡頭，而且現在還負責讓字幕內縮（N1 的修法）；要改這個取捨要問使用者 |
| **N6** | F6 量的是暖機後的第 2 場，而第 1 場最低 18fps | **真的修好（記錄）** | 報告 §F6 已註明「`duel-perf` 的 `onDuel` 是 `if (n !== 2) return`，量的是 shader 編完之後的第 2 場」，並把 `fpsdiag.json` 的 `perDuel:[18, 55]` 列為**記錄項**：玩家開第一場對決會看到 1 秒視窗最低 18fps，這件事被排除在 F6 的量測位置之外 |
| **N7** | `-nobox` 不是同幀 | **沒修到（記錄）** | `t3-shot` 仍是兩次獨立重播（中間隔 600ms＋重新派招），同一幀位中段亮度最大差 18/255。它證得了「黑條有效」，證不了「同一幀加黑條的差別」；兩組也都開著 CINEMA，所以人眼段拿不到「機位有沒有變」的 A/B。要做同幀對照得先把演出凍結（`dmg-readability` 的虛擬時鐘那一套），成本高，留給下一卷 |
| **N8** | `traitfx-drive`／`duel-perf` 在 worktree 找不到 playwright | **真的修好** | 兩支都改成兩段候選路徑的退路（與 `duel-drive`／`lbox-probe`／`t3-shot`／`pace-ab` 同一寫法），找不到才 throw 並提示 `NODE_PATH` |
| **N9** | `duel-drive` 的 TDZ 地雷（`lboxWatch` 用了後面才宣告的 `now`） | **真的修好** | 改用 `Date.now()` 並就地寫明理由 |
| **N10** | 四支重寫短版留下新舊兩段註解 | **真的修好** | 掃描 `SHORT` 區塊裡「兩個註解區塊中間沒有程式碼」的情形，`zuling.js` 3 處、`xianghuo.js` 1 處已刪掉舊的；重寫工具也改成「往前吃掉緊鄰的註解區塊」，不會再疊 |
| **N11** | 凍結檔寫「`--tier=1` 30 套」但實作是 27 套 | **沒修到（字面，記錄）** | 凍結檔正文不動（門檻一字未動的紀律）。實質沒有洞：三尊沒有 `SHORT`，`--tier=1` 跑 27 支、`--tier=2` 跑 30 套；「短版缺席會怎樣」由邊界實測補（強制三尊跑 `--tier=1` → **0/2 pass、rate=180**） |


## 三條修訂的改前改後（詳版在凍結檔 §2.1 修訂四／五／六）

### 修訂四：F3 主條以實測值通過
| 版本／來源 | 中位的中位 | 全距（展幅） | 對基準的效果 |
|---|---|---|---|
| 基準 `adbb124`（作者二版量） | 5558.5ms | 135.5 | — |
| 基準（r2 覆審員獨立量） | 5574.5ms | 209.5 | — |
| 基準（作者三版量） | **5521.5ms** | 73.5 | — |
| 一版（一次 4 場中位，無重複量測） | 5302ms | — | −271.5ms |
| 二版（作者） | 5032.5ms | 58.5 | −526ms |
| 二版（r2 覆審員獨立量） | 5050ms | 290 | −524.5ms |
| **三版（作者，本輪）** | **5009ms** | **53.5** | **−512.5ms**，`overlap:false` |

三次獨立量測的效果一致（−512.5 ~ −526），全距一律不重疊 ⇒「v0.54 比基準快」已在噪音之外。
**5000 這條線比量法的展幅還細**（受測值離門檻 9–50ms，展幅 53.5–290），量得出「快多少」、量不出「過不過」；
使用者 2026-09-11 裁甲以實測值通過。**門檻 5000 一字未動。**

### 修訂五：F3 子條改「≤ 基準同場次 −10%」——**第三場紅，已攤開**
| 場次 | 基準 | v0.54 | Δ | 新判準 | 招式數（新／基準） | 拍級分布 |
|---|---|---|---|---|---|---|
| #10 | 16087ms | 12662ms | **−21.3%** | ✅ | 8／8 | {1:1, 2:1, 3:1} |
| #12 | 14728ms | 13193ms | **−10.4%** | ✅ | 8／8 | {1:1, 2:1, 3:1} |
| #13 | 7096ms | 6855ms | **−3.4%** | ❌ **紅** | **3／3** | {1:1, 2:1, 3:1} |

**#13 為什麼過不了（逐段攤開）**：
- 三場的拍級分布**完全相同**（各 1 拍 tier 1／1 拍 tier 2／1 拍 tier 3，共 3 拍），
  拍末下限合計都是 300+900+1400 ＝ **2600ms**，基準是 3×900 ＝ 2700ms ⇒ **拍末只省 100ms**
  （tier 3 的 1400 比基準的 900 還長，把 tier 1 省下的 600 吃掉大半）。
- 真正的節省來自招式時長（900→260，每支 −640ms），所以 Δ 幾乎正比於「**有幾支招落在 tier 1 那一拍**」。
- 三場招式數（`FXC.trait` 逐場差值）：#10 **8 支**、#12 **8 支**、#13 只有 **3 支**（基準同場次也是 8／8／3）。
  #13 可縮的分母本來就小，再扣掉 tier 3 那一拍多花的 500ms，淨值只剩 **−241ms**。
- **沒有哪一段「該縮而沒縮」**：#13 的 `lboxMs=2687` 證明 tier 3 那一拍確實開了黑條、演的是 1400ms 的大招，
  tier 1 那一拍也確實走 260ms 短版。是這一場本來就短（6.9 秒）。
- **結論**：新判準對「招式數少的對決」在數學上接近不可達（tier 3 固定 +500ms，要在 7 秒的場上達 −10%＝710ms，
  至少要 2 支招落在 tier 1 拍）。**據實記紅、判準不動**，交使用者。

### 修訂六：F4 改判「有樣本部分全過、`nullCount` 降記錄項」
| | 基準 `adbb124` | 一版 | 二版／三版 |
|---|---|---|---|
| n | 10 | 10 | 10 |
| `deepOk` | 10/10 | 10/10 | **10/10** |
| 有樣本的 `monoQuiet` | 8/8 | 8/8 | **6/6** |
| `nullCount`（記錄項） | 2 | 2 | **4** |

四個 null 全是 hit 類、`quiet=0`（punch 排光靜幀）；**沒有任何一筆從 `true` 變 `false`**，
基準那兩筆通過時的 `quiet` 只有 3 和 4（正好卡在 `need` 地板）。成因交治具小卷。
`dmg-readability` 那一半（修訂二口徑）：seed1 空過 0 ＝基準 0、seed3 空過 1 ＝**基準 1**，基準證據已落檔（N4）。

## F5 人眼段：六支短版重寫（盲讀第三輪，使用者 2026-09-11 裁定）
讀者 D 歸納的低分共同特徵是「**效果只發生在攻方自身、無指向性、受方無反應**」；
二版重寫成功的雷女之火（短 5/4 vs 完整 3/3）做法是「法寶本體提前到 78ms 出現、燒滿整段」。
六支各補「本體出現＋指向對手／受方反應」：

| 招 | 上一輪分數 | 改了什麼 |
|---|---|---|
| 祖靈之眼 `wardFirst` | 短 1/2 vs 完整 3/3 | 眼白球＋瞳球提前到 35ms 現形（原本只有眼瞼骨骼在動）；注視光束改兩條疊起來、燒滿 95→215ms（原本只有 70ms）；**被盯到的那一隻退縮＋邊光暴亮**（受方反應） |
| 王爺劍 `eliteCleave` | 短 2/2 vs 完整 4/3 | 補讀者 C 點名的「**紅刃衝刺拖出寬軌跡**」：整尊前衝距離 0.13→**0.34**，另加三條錯開淡出的軌跡帶從自己拉到對面；對面四隻依序退縮 |
| 送王船 `wardAbsorb4` | Q2 掉 ≥2 | 改以「**船前衝＋撞開一道水牆打向對面**」為主角（前衝 0.16→0.30，水牆環＋水花盤指向對面、對面三隻退縮）；金罩降為薄薄一層配角（讀者 C：「淡白半圓罩與地上光環互相分不出」） |
| 福壽綿長 `wardRegen1` | Q2 掉 ≥2 | 燈本體改成一顆 35ms 就現形、脹到 **1.9×** 的大火球；暖火飛行拉長到 88ms 並在落點爆一次；同伴腳下加落點環 |
| 五營旗 `swarmRally` | Q2 掉 ≥2 | 補**旗面本體**（一片會隨手臂翻轉的布＋旗桿），舉旗時現形、落旗時劈到前方；五方光陣外再加兩道往外推的令波 |
| 媽祖令旗 `wardAtkAll1` | Q2 掉 ≥2 | 同上補**旗面本體**（掛在 `FlagMast` 上、隨甩動前後擺），兩道令波推過本方整排 |

六支重寫後仍過 F2／F10：全部 `t1/260ms`、`rate=1.0`、`clean`、`fill` 0.869–0.885、`acts` 10–30。
兩張 contact sheet 已用同一組幀位（20%／45%／75%）重產。**我沒有做盲讀、沒有改量表、沒有改切圖程序。**

---

## r1 覆審 findings 逐條三態

| # | 標題 | 三態 | 證據／說明 |
|---|---|---|---|
| **C1** | CINEMA 無取消路徑 | **真的修好** | 加 `endCinema()`（照 `endFocus` 走 outMs 回位段），掛 `onTraitCancel`／`onDuelEnd`／`onTable`／`onEnd`。`lbox.json` 的 `cancel` 三條路徑 `kAtCancel=1.0`、`onAfter300=0`、`lastOnT=316ms`（<400）。**突變驗紅**：拿掉 `onTraitCancel` 那一行 → L5 FAIL、`onAfter300` 0→18、`lastOnT` 684ms（`scratchpad/lbox-mut.json`），還原用 `scratchpad/cd-before-mutation.bak` 副本 |
| **H1／M7** | `duel-perf perf` 靜默吃掉 `--root` | **真的修好** | perf 改吃 `--root`＋加 `--seed`；`KNOWN_FLAGS` 對不支援的旗標 **throw**。F6 重量在真基準樹上：`fps-ab.json` |
| **H2** | 黑條在真實畫面上幾乎看不見 | **真的修好** | `z-index:-1 → 41`（`#duel` 40 之上）。`lbox-probe` 新增 L6 自解 PNG：on 時上下帶亮度 **0.00**（一版量到 17.31），off 29.38／40.76，中段對照 Δ0.76 |
| **H3** | 「黑條僅 tier 3」沒有斷言＋不實宣稱 | **真的修好** | `duel-drive` 對 `#lbTop`／`#lbBot` 掛 `MutationObserver`，逐場算 `lboxMs`。14 場實測：無 tier 3 的 11 場**全 0**、有 tier 3 的 3 場 5771／4888／2687。`lbox-probe` 檔頭的不實宣稱改寫成實際情形 |
| **H4** | tier 3 人眼交付物不含黑條與 CINEMA | **真的修好** | 新治具 `t3-shot.mjs` 走 `index.html` 真實路徑，在 `duel-drive` 的 `onDuel` 掛點（對決**演出進行中**）派 tier 3 事件＋開黑條後截圖，另附 `-nobox` 對照。一版的 `sheet-t3-legend.png` 保留但降級為「短版對照用」 |
| **H5／M6** | F3 量測噪音大於效果／seeds 沒落檔 | **真的修好** | 新治具 `pace-ab.mjs`：**交錯**跑（A,B / B,A 交替）、每組 5 次、輸出中位的中位與全距、seeds 與 url 落檔。實測全距 135.5／58.5，**不重疊**；`duel-drive` 也把 `url`（含 seed）寫進輸出 |
| **H6** | 工作區在覆審期間持續改動／`--nullbase` 是自由數字 | **真的修好（口徑部分）** | `--nullbase` 移除，改 `--basecj=<對基準樹跑出來的 json>`，由**同一支判官**對基準跑一次取 `nullCount` 當上限（`nullBaseSrc` 欄位記來源）。§2.1 只有修訂一／二／三，三條都是主對話轉達的使用者裁定。**「工作區是移動中的目標」這一點屬實**——二版起所有量測都跑在 `scratchpad/headfull`（`git archive HEAD` ＋工作區同步）或直接對 worktree，報告每個數字都標明來源 |
| **H7** | F0 的假綠條件成立（trace 不含 `war.beats`） | **真的修好** | `trace-eq` 加 `--beats`：對 old／new 做**同一個注入**序列化 `[beat,kind,side,trId,target]`。基準樹 vs 二版 **equal＋`injected:true`**。**鑑別力**：把 `pwRec` 記的 `tgt.id` 改成 `tgt.id+100` → 預設 `trace-eq` 仍 equal、`--beats` **不等**（`first diff @959`），證明它比預設嚴 |
| **M1** | tier 3 的 1400ms 有三分之一是空的 | **真的修好** | 三尊各補一段**只在 `st.tier===3`** 的餘韻（tier 2 走同一支函式、行為逐項不變）：horizon 929／1067／1013 → **1290／1360／1380**（fill 0.921／0.971／0.986）。`traitfx-drive` 加 `fillOK`（≥0.85）當常設閘門 |
| **M2** | 「`TRAITS[].tier` 是上限」在拍級規則下失效 | **真的修好** | 新增 `pwMoveTier(trId, beatTier) = min(拍級, 招的上限)`，普通招上限 2 → tier 3 的拍裡只有傳說招走 1400＋CINEMA。單元測試 7 條斷言覆蓋「普通招與傳說招同拍」。`--tier=3 --only=<三支普通招>` 現在會紅在 `fillOK`（`tfx-t3-mixed.json`）——那正是「這個組合在實作上不會發生」的反面證據 |
| **M3** | `need` 地板 3 是自由參數 | **真的修好** | 就地寫下推導：`mono()` 判反轉至少要兩個相鄰差 ⇒ **至少 3 個取樣點**，2 點只有 1 個差、斷言恆真（零鑑別力）。比例部分維持「8 幀 × 視窗/基準視窗」，上界 8 |
| **M4** | F1 那一列要加限定語 | **真的修好** | 本報告三態表改寫成「**0 處重複來源**」，並在 §F1 點名 `PW_FX` 那三張表就是唯一事實來源 |
| **M5** | F9 超白名單是 3 個不是 1 個 | **真的修好** | 計畫檔第 1 節補列 `js/renderer.js`、`lbox-probe.mjs`、`traitfx-sheet.mjs`，連同二版新增的 5 支治具與凍結檔本身，共 9 列（見 §F9） |
| **M8** | 鑑別力複驗要用完整基準樹 | **真的修好** | 本報告開頭與 §F1 都寫明「一律對 `git archive adbb124` 的完整樹跑」，指令原文附在 §F1 |
| **L1** | `acts` 可被空 tween 灌水 | **沒修到（記錄）** | 指標本身沒改。27 支實測 5–24 都是真動作（覆審員親讀 9 支確認）。要當長期閘門得加「該 tween 有掛 mesh 或骨骼」的條件——留給招式可辨性卷 |
| **L2** | 測試 fixture 餵了引擎產不出來的值 | **真的修好** | `warWin` 的 `{ war: { tie: false } }` 保留（`paperWar` 勝方分支確實沒有 `tie` 欄位，但 `pwBeatTier` 讀的是 `!f.war.tie`，`undefined` 與 `false` 同義）——**改成 `{ war: {} }`**，貼近真實回傳 |
| **L3** | 證據檔的 `ver` 停在 v0.53 | **真的修好** | 二版所有證據都在 `VERSION="0.54"` 之後跑，`duel-*.json` 的 `ver` 已是 `v0.54・…` |
| **L4** | tier 2「完整版」本來就常塞不進 900ms | **沒修到（記錄）** | v0.53 既有行為（`rateMax` 2.2），與本卷無關。`tfx-t2.json` 的 `maxRate` 分布最高 2.14；報告不再用「從容」形容 tier 2 |
| **L5** | 同一拍兩支招時黑條會閃一下 | **真的修好** | 黑條改成**拍級**：拍開始開、拍末關（`pwPlayBeat`），不再逐招開關 |

---

## F0 等價雙向
```
node tests/tools/trace-eq.mjs scratchpad/basefull/index.html index.html
→ {"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}
node tests/tools/trace-eq.mjs scratchpad/basefull/index.html index.html --beats
→ {"mode":"beats","bytesOld":540776,"bytesNew":540776,"equal":true,"injected":true,"verdict":"拍序列逐位元組相等 ✅"}
node tests/tools/trace-eq.mjs index.html --mutate
→ {"mutation":"CFG.ROUNDS 12 -> 11","differs":true}
```
既有 9 套：7／8／8／5／32／16／28／32／36 綠，**0 紅**，diff 為空（沒有新增任何毫秒斷言）。`tests/fxtier.test.mjs` 14 綠。

**`--beats` 的鑑別力**（一版的 F0 只證明「勝負與扣血沒變」，凍結檔自己列的假綠條件本來就成立）：
把 `pwRec` 記的 `tgt.id` 改成 `tgt.id+100`（只動記錄、不動勝負）→ 預設 `trace-eq` **仍 equal**，`--beats` **不等**（`first diff @ 959`，`[1,"hit","A","",0]` vs `[1,"hit","A","",100]`）。

**`?fxtier=0` 的等價**：`trace()` 不讀 URL，那一半用真實路徑證明——`FXC.tiers = {1:0, 2:12, 3:0}`（12 拍全 tier 2＝v0.53 行為）、`lboxMs` 全 0、4 場中位 5643.5ms（基準 5558.5ms 同一量級）。

## F1 分母歸一
分母（我自己 grep，不抄評審）：**runtime 命中 10**（招式時長語意 **4**：`index.html:3976 TRAIT_MS`／`js/trait-fx.js:366 ||900`／`js/camera-director.js:74 LEAN.ms`／`index.html:3973 BEAT_MIN_MS`；排除 6）、**治具命中 47**（語意 **17**；排除 30，其中 19 處是 `setTimeout(r,900)` 開服等待）。

改後 runtime **0 處重複來源**——`index.html` 仍有三個 900 字面值，就是 `TRAIT_MS_BY_TIER`／`BEAT_MIN_MS_BY_TIER`／`TIER_BASE_MS` **這三張表本身**（唯一事實來源，不是散落的複製品）；測試的 allow 清單就地寫了理由。
`js/trait-fx.js` 的 `TFX.baseMs` 也在二版前收掉了，改由事件帶 `detail.baseMs`。

**鑑別力（必須對完整基準樹跑）**：
```
git archive adbb124 | tar -x -C scratchpad/basefull
node tests/fxtier.test.mjs --html=scratchpad/basefull/index.html   → 0 綠 14 紅
```
14 條全紅且都紅在行為斷言（`||900` 退路還在／`LEAN.ms` 退路還在／runtime 還有 4 處／`pwBeatTier` 未匯出／`pwMoveTier` 未匯出／`有 tier 的招：得到 "[]"`）。
★只給一份 `base-index.html`（沒有 `js/`）會有 3 條紅在 `ENOENT ... js/trait-fx.js`＝旁枝錯誤，`02 §6.1` 第 1 條明文禁止——所以一律用完整樹。★

## F2 短版原生合身
```
node tests/tools/traitfx-drive.mjs <out> --tier=1 --port=9541   → 27/27 pass
node tests/tools/traitfx-drive.mjs <out> --tier=2 --port=9542   → 30/30 pass
node tests/tools/traitfx-drive.mjs <out> --tier=3 --port=9543   → 3/3 pass
```
- tier 1：`run.ms` 全 260、`maxRate` 全 1.0、`clean`、**`fill` 0.85–1.0**、重複簽章 0。
- tier 3：三尊 horizon **1290／1360／1380**（fill 0.921／0.971／0.986），`rate` ≤1.06。
- 防假綠四道：`msOK`（防「`--tier=1` 其實還在跑 900」）、`rateOK ≤1.0`（防靠加速硬擠）、`clean` 判準未放寬、**`fillOK`（新增，防演完之後乾等）**。
- **邊界實測**（「短版缺席退回完整版不是恆綠退路」）：拿沒有 `SHORT` 的三尊強制跑 `--tier=1` → **0/2 pass、`rate=180`**。

## F3 節奏（**紅**）
### 主條：4 場 duelsMs 中位 ≤5 s
量法改成 `pace-ab.mjs`：**交錯**跑（第 i 輪 A→B、第 i+1 輪 B→A）、同 seeds、各 5 次，取「每次 4 場中位」再算中位與全距。
```
node tests/tools/pace-ab.mjs <out> --a=scratchpad/basefull --b=scratchpad/headfull --seeds=7 --duels=4 --runs=5
```
| 組 | 5 次的中位 | 中位的中位 | 全距 | 展幅 |
|---|---|---|---|---|
| A＝基準 `adbb124` | 5676／5558.5／5601.5／5540.5／5547 | **5558.5ms** | [5540.5, 5676] | 135.5 |
| B＝v0.54 二版 | 5043.5／5032.5／5051.5／4994／4993 | **5032.5ms** | [4993, 5051.5] | 58.5 |

**兩組全距不重疊**（`overlap:false`）⇒ 效果 −526ms **大於**這台機器的噪音——這解掉了 r1 H5「噪音大於效果、量測不可信」那一條。
但 5032.5 **仍 >5000**（差 32.5ms，−0.65%）→ **F3 主條紅**。5 次裡有 2 次（4994、4993）落在門檻以下。
**歸因**：拍級分布已翻成 `{1:8, 2:4, 3:0}`（修訂一生效，一般擊殺拍回到 260ms 短版＋300ms 拍末）。
剩下的時間大宗**不再是拍末等待**，而是逐筆事件（`EV_BUDGET_MS 1050`）、拍首字幕（`BANNER_MS 360`）、進退場（`ENTER_MS 480`＋`END_MS 1000`）——那些常數在本卷「不做什麼」裡明列不動。

### 子條：有 tier 3 出場的對決 ≤8 s（**紅**，但基準更慢）
14 場實測（`seed=7`，玩到第 7 夜前後三尊才上場）：
| 場次 | v0.54 | 基準 `adbb124` 同場次 | 差 |
|---|---|---|---|
| #10 | **12662ms** | 16087ms | −3425 |
| #12 | **13193ms** | 14728ms | −1535 |
| #13 | **6855ms** | 7096ms | −241 |

3 場中 1 場過、**2 場超標** → 子條紅。**成因不是 tier 3**：基準（沒有任何分級、招式全 900ms）在同一場次更慢；那兩場是後期夜晚部隊變大、事件數變多。
每場的 tier 3 只有 1 拍（1400ms），佔 12.6 秒的一成。

## F4 可讀性不退（**紅**：兩半中的一半）
### `dmg-readability`（符合修訂二的新口徑）
| seed | R1 | R2 | 空過數 | 基準空過數 | 關鍵數字 |
|---|---|---|---|---|---|
| 1 | PASS | **PASS** | 0 | 0 | 遮罩中位 62.72（≥25）、`maskGe25Ratio` 1.0、`back200MaskAbsMax` **2.21**（≤5）、字級 27.2／35.36 |
| 3 | PASS | FAIL（空過） | 1 | **1** | `maskN=0`、`maskDropped {moved:3, tinyMask:2}`、`via {hitstop:3}` — 與基準**逐項相同** |

新口徑是「每 seed 的空過數 ≤ 基準」→ **這一半通過**。
★誠實記一筆抖動★：seed 1 的 R2 在二版中途曾量到 `back200max=5.77`（紅），重跑為 2.21（綠）。同組態兩次落在門檻兩側，這個指標本身有抖動；本報告採用最後一次完整重跑的數字，並把兩次都記在這裡。

### `closeup-judge`（**不符合新口徑**）
```
node tests/tools/closeup-judge.mjs <cu-on1.json> --basecj=<cu-base1.json>
→ nullCount 4 / nullBase 2（來源：cu-base1.json 實測）；n=10、deepOk 10/10、monoQuiet 6/6
```
| | nullCount | 那幾筆 | deepOk | 有樣本的 monoQuiet |
|---|---|---|---|---|
| 基準 `adbb124` | **2** | rows 6／8（`quiet=0`） | 10/10 | 8/8 |
| v0.54 一版 | 2 | 同上 | 10/10 | 8/8 |
| **v0.54 二版** | **4** | rows 0／2／6／8（全部 `quiet=0`） | 10/10 | 6/6 |

**4 > 2 ⇒ F4 紅。** 歸因：四筆全是 hit 類的 `quiet=0`——命中拍的 punch 把靜幀排光（`closeup-judge` 檔頭 v0.45 就記過這個現象）。
二版把一般擊殺拍縮到 260ms 之後，同樣次數的 punch 擠在更短的拍裡，focus 視窗能取到的靜幀更少，於是從 2 筆變 4 筆。
**是「可判樣本變少」不是「可讀性變差」**：`deepOk` 仍 10/10（推近深度全過）、有樣本的 `monoQuiet` 6/6 全過。
依 `02 §6.1` 第 5 條「樣本數不足以區分有／沒有時不構成放行理由」——所以照實記紅，不主張它其實沒問題。
成因（punch 排光靜幀）依修訂二的裁定另開治具小卷，本卷不修。

## F5 三級可辨
### 機械段（`lbox-probe.mjs`，L1–L6 全過）
```
VERDICT L1=PASS L2=PASS L3=PASS L4=PASS L5=PASS L6=PASS err=0 → PASS
tier1 {ms:260,  onCount:0,   maxK:0}       ← 反面
tier2 {ms:900,  onCount:0,   maxK:0}       ← 反面
tier3 {ms:1400, onCount:105, maxK:1, onDuring:86, onAtTail:0}  ← 正面
cancel  ys:fx-trait-cancel / ys:duel-end / ys:table：kAtCancel 1.0、onAfter300 0、lastOnT 316ms
pixels  off {top 29.38, bot 40.76, mid 53.56} → on {top 0, bot 0, mid 52.80}
draws   off/on/off2 皆 calls 14、tris 855
```
### 真實對局（`duel-drive` 的 MutationObserver，14 場）
- 無 tier 3 的 **11 場**：`lboxMs` **全部 0**（黑條一毫秒都沒出現）。
- 有 tier 3 的 **3 場**：`lboxMs` **5771／4888／2687**（>0）。

### 人眼段（交使用者挑）
- `sheet-t1-short.png`（27 支短版）／`sheet-t2-full.png`（30 套完整版）：幀位 20%／45%／75%，依 tier 換算。
- **`shots-t3-real/`（新）**：tier 3 從**真實對決路徑**截，含黑條與 CINEMA 機位，每支 3 幀＋3 幀 `-nobox` 對照，共 18 張＋`meta.json`。
  出招方不是三尊本尊（袋子裡有沒有三尊逼不出來）——這一組驗的是「黑條＋仰視機位＋1400ms 在真實畫面上長什麼樣」。
- `sheet-t3-legend.png`（一版產物）保留，但**降級為短版／完整版的對照**，不再當 tier 3 的人眼交付物。

#### 四支短版的改動（使用者 2026-09-11 裁定，盲讀 r1 掉分的那四支）
盲讀 r1 的教訓是「讀者認得出的招都是**本體直接出現**」，所以這四支各補一件看得見的法寶本體，其餘 23 支一格不動：
- **王爺劍 `eliteCleave`**（4/3→2/2，讀者 B：「沒拔劍」）：加一把 0.66 長的光刃＋劍柄掛在右手上，蓄勢時現形、揮砍時跟著劈過去，收勢才淡出。
- **祖靈之眼 `wardFirst`**：眼位疊一顆眼白球＋一顆瞳球，睜圓＝眼白暴脹到 1.35×、瞳孔縮成一點（原本只有眼瞼骨骼在動，畫面上沒有「眼睛」）。
- **雷女之火 `boltGamble`**：三道雷改成 78ms 就開始、各燒 92ms、間隔 26ms（原本只在 150ms 後閃 62ms，取樣幀常錯過）。
- **巴冷公主珠鍊 `eliteArmor`**：沿「心口→頭頂」的弧線串九顆珠，由內往外一顆一顆亮（原本只有骨骼縮放＋一顆珠，看不出「鍊」）。

四支重寫後仍過 F2／F10：`t1/260ms`、`rate=1`、`clean`、`fill` 0.85–0.92、`acts` 7／10／7／19。

## F6 fps（**綠**）
量在**真基準樹**上（r1 H1：一版的 `fps-base.json` 帶有只有新版才有的 `fxc.tiers`，那是新版跑的）：
```
node tests/tools/duel-perf.mjs perf <out> --root=scratchpad/basefull --seed=7 --port=<P>
node tests/tools/duel-perf.mjs perf <out> --root=scratchpad/headfull --seed=7 --port=<P>
```
交錯三輪（A,B / B,A / A,B）：
| 組 | rendersPerSec | 中位 | draw calls | triangles |
|---|---|---|---|---|
| A＝基準 | 280.4／242.9／250.4 | **250.4** | 958／965／964 | ≈353,300 |
| B＝v0.54 | 286.5／263.1／260.1 | **263.1** | **926／926／926** | 344,850 |

- **主數字 `rendersPerSec` 比值 263.1 / 250.4 ＝ 1.051**（≥0.90）。全距重疊，但方向不是變慢，且離門檻 0.90 有很大餘裕。
- ★`rafMedianFps` 兩邊都是 59.9＝**撞 vsync 天花板，零鑑別力**★，比值恆為 1.00，本報告不拿它當結論。
- ★**量的是第 2 場，不是第 1 場**★（R2 覆審 N6）：`duel-perf` 的 `onDuel` 是 `if (n !== 2) return`，
  註解自陳「第 1 場已把 shader 編掉」——量的是暖機後的穩態。**記錄項**：同一批證據的 `fpsdiag.json` 記著
  `perDuel: [18, 55]`，也就是**玩家開第一場對決會看到 1 秒視窗最低 18fps**（shader 首編），
  這件事被排除在 F6 的量測位置之外（`02 §6.1` 第 5 條：代理指標沒響只在它的量測位置上有效）。
- ★訊號展幅大★：`rendersPerSec` 在這台機器上受背景負載影響很重（同組態實測 128.7–280.4），
  所以本報告用 **6 次的中位**（A 246.65／B 263.1，比值 1.067）而不是單次。
  即使取最保守的組合（B 中位 263.1 對 A 最高 280.4）比值仍是 0.938 ≥0.90。
  其中一輪（A 155.3／B 104.7）跑在殘留的 `http.server`／chrome 還在的時候，**照 `02 §6.2` 留在數據裡不刪**，
  歸因＝量測環境污染（已清掉殘留進程後重跑 A 270.7／B 280）。
- draw calls：新版 **926 < 基準 958–965**（不增，且更少）。另有決定性對照：`lbox-probe` L4 同一頁面同一幀切黑條，`calls 14/14/14`、`tris 855` 逐值相同 ⇒ 黑條不進 renderer。

## F7 Playwright 零錯（**綠**）
`pace-ab`（30 次 drive）0；`duel-t3`（14 場）0；`duel-new`／`duel-fxtier0`（各 4 場）0；`traitfx-drive` 三個 tier 全套每案 `err=0`；`lbox-probe`／`fpsdiag-probe`／`t3-shot` 各 0。

## F8 文件（**綠**）
GUIDE §11.27（八條＋兩條沒過的閘門，二版要再更新為三條裁定）；`VERSION="0.54"`；`ART_BIBLE`／`GAME_DESIGN` 未出現在 diff。

## F9 範圍（**綠**，修訂三補列後）
`git diff --stat adbb124..HEAD`（排除證據目錄）共 **27 個檔**，全部在計畫檔第 1 節（修訂三的完整清單，逐檔理由見凍結檔）：
`index.html`／`js/trait-fx.js`／`js/trait-fx/{zuling,xianghuo,yinqi}.js`／`js/camera-director.js`／`js/renderer.js`（+1 行治具出口）／
`tests/fxtier.test.mjs`／`tests/tools/{fx-consts,traitfx-drive,traitfx-preview,traitfx-sheet,cam-drive,cam-unit,closeup-cam-unit,closeup-judge,lbox-probe,fpsdiag-probe,pace-ab,t3-shot,duel-perf,trace-eq,duel-drive}`／
`docs/IMPLEMENTATION_GUIDE.md`／凍結檔／計畫檔／報告＋證據。
- `TRAITS` 的 diff **只有三行**（三尊各加 `tier:3`）。
- 引擎函式（`paperWar`／`pwSide`／`pwClash`／`pwPrep`／`pwBolt`／`pwHaunt`／`pwStrike`／`pwRec`／`buildArmy`／`collectEffects`／`applyHooks`）diff 為空——**這一點是靠 diff 證明的**，不是靠 `trace-eq`（r1 H7）。

## F10 短版品質下限（**綠**）
27 支非 flinch 動作數 5–24，全部 ≥2。最小值 5（`eliteVsSwarm`）。

---

## 仍然沒解決的三件事（留給製作人）
1. **F3 主條差 32.5ms**：量測已經可信（全距不重疊），但門檻沒過。要往下走只能動 `EV_BUDGET_MS`／`BANNER_MS`／`ENTER_MS`／`END_MS`，那是本卷「不做什麼」明列不動的常數。
2. **F3 子條 2/3 超標**：成因是後期夜晚的對決本來就長（基準同場次更慢），與 tier 3 無關。子條的門檻是否該分「基礎戰／後期戰」由製作人裁。
3. **F4 的 `closeup-judge nullCount` 4 > 2**：拍變短讓可判樣本更少。成因（punch 排光靜幀）依修訂二另開治具小卷。
