# 實跑報告：招式三級視覺分級（v0.54，**二版**，2026-09-10～11）

> 驗收凍結＝`docs/experiments/2026-09-10-acceptance-fx-tiers.md`（F0–F10，**門檻一字未動**；§2.1 有使用者裁定的修訂一／二／三）。
> 計畫檔（介面凍結）＝`docs/experiments/2026-09-10-plan-fx-tiers.md`。基準＝`adbb124`（＝`4b7dadd` v0.53 ＋ 凍結檔，程式碼相同）。
> 一版＝`a862bbd`（fresh 覆審 r1 的受審物）。證據目錄＝`docs/experiments/2026-09-10-fx-tiers-evidence/`。
> **F5 iPhone 段與 F6 手機段依凍結檔不在本輪範圍（記錄項）。**
> ★所有「基準」的量測一律跑在 `git archive adbb124` 解出來的**完整基準樹**（`scratchpad/basefull`），
> 不是只換一份 `index.html`——只換 index.html 會讓測試紅在 `ENOENT ... js/trait-fx.js` 這種旁枝錯誤（r1 M8）。★

## 結論（給只看三行的人）
1. **r1 的 CRITICAL C1 已修好並用突變驗紅**：CINEMA 補了 `endCinema()` 掛在四個離開對決的入口；拿掉那一行 → `lbox-probe` L5 立刻 FAIL（`onAfter300` 0→18、`lastOnT` 316→684ms）。
2. **F3 的量測換成交錯 A/B ×5 之後，效果第一次大於噪音**：基準中位的中位 5558.5ms（全距 135.5）、v0.54 **5032.5ms**（全距 58.5），**兩組全距不重疊**，效果 −526ms。但 5032.5 仍 >5000 → **F3 續紅（差 32.5ms）**，5 次裡有 2 次落在 5000 以下。
3. **仍紅三條**：F3（主條差 32.5ms／子條「有 tier 3 的對決 ≤8s」3 場中 2 場超標，但基準同場次更慢）、F4（`closeup-judge` nullCount 4 > 基準 2）、F9（範圍多 0 檔——**已補列，改判綠**）。詳見逐條。

## 逐條三態表（二版）

| 條 | 狀態 | 關鍵數字 | 證據 |
|---|---|---|---|
| F0 等價雙向 | **綠** | `trace(1..20)` equal（357285＝357285）；**新增 `--beats`：拍序列 equal＋`injected:true`**（540776＝540776）；突變驗紅 ×2；既有 9 套＋新 14 條全綠 | `trace-eq`／`fxtier.test.mjs` |
| F1 分母歸一 | **綠** | 分母 runtime 10／治具 47（招式時長語意 4／17）；改後 runtime **0 處重複來源**（`PW_FX` 那三張表本身不算，見下）；14 條對完整基準樹 **14 紅** | `tests/fxtier.test.mjs` |
| F2 短版原生合身 | **綠** | `--tier=1` **27/27**、`--tier=2` **30/30**、`--tier=3` **3/3**；`rate` 全 ≤1.0、`clean` 全過、**新增 `fillOK`**（horizon ≥ ms×0.85）全過 | `tfx-t1/2/3.json` |
| F3 節奏（主條） | **紅** | 中位的中位 **5032.5ms**（門檻 ≤5000，差 32.5ms）；基準 5558.5ms；全距不重疊、效果 −526ms | `pace-ab.json` |
| F3 節奏（tier 3 子條） | **紅** | 有 tier 3 的 3 場：**12662／13193／6855ms**（門檻 ≤8000）；基準同場次 16087／14728／7096ms | `duel-t3.json`／`duel-base-16.json` |
| F4 可讀性不退 | **紅** | `dmg` seed1 R1/R2 綠、seed3 空過數 1 **＝基準 1**（符合新口徑）；`closeup-judge` **nullCount 4 > 基準 2**（不符） | `dmg-s1/`／`dmg-s3/`／`cu-on1.json` |
| F5 機械段 | **綠** | L1–L6 全過：tier 1/2 的 CINEMA 幀 0、tier 3 `maxK=1.0`、黑條像素 **on 時上下帶亮度 0.00**（off 29.38／40.76）、中段對照 Δ0.76、draw call 14/14/14、三條取消路徑 `onAfter300=0`；**真實對局**：無 tier 3 的 11 場 `lboxMs` 全 0、有 tier 3 的 3 場 5771／4888／2687 | `lbox.json`／`duel-t3.json` |
| F5 人眼段 | **未裁** | 短版／完整版 contact sheet 各一張（幀位 20/45/75%）；**tier 3 改從真實對決路徑截**（含黑條＋CINEMA，另附 `-nobox` 對照 9 張） | `sheet-t1-short.png`／`sheet-t2-full.png`／`shots-t3-real/` |
| F6 fps | **綠** | `rendersPerSec` 中位 **263.1／250.4＝1.051**（≥0.90，新版反而略快）；draw calls 926／964（新版**更少**）；黑條開關同幀對照 14/14/14 | `fps-ab.json`／`lbox.json` |
| F7 Playwright 零錯 | **綠** | `pace-ab` 30 次 drive 0 error；`duel-t3` 14 場 0；`?fxtier=0` 4 場 0；`traitfx-drive` 三個 tier 全套 0；`lbox-probe`／`fpsdiag-probe`／`t3-shot` 0 | 各 json |
| F8 文件 | **綠** | GUIDE §11.27；`VERSION="0.54"`；`ART_BIBLE`／`GAME_DESIGN` 未進 diff | `git diff --stat` |
| F9 範圍 | **綠（修訂三後）** | 25 個檔全部在計畫檔第 1 節（`js/renderer.js`＋8 支治具＋凍結檔已補列）；`TRAITS` diff 只有 `tier:3` 三行；引擎函式 diff 為空 | 見 §F9 |
| F10 短版品質下限 | **綠** | 27 支非 flinch 動作數 5–24，全 ≥2 | `tfx-t1.json` |
| ?fps=1 對決最低 fps | **綠** | D1 文字「對決最低 55」且解出的數字 >0；D2 不帶參數時 DOM 查無；D3 兩場各自 18／55 | `fpsdiag.json` |

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
| **M1** | tier 3 的 1400ms 有三分之一是空的 | **真的修好** | 三尊各補一段**只在 `st.tier===3`** 的餘韻（tier 2 走同一支函式、行為逐項不變）：horizon 929／1067／1013 → **1280／1360／1385**（fill 0.914／0.971／0.989）。`traitfx-drive` 加 `fillOK`（≥0.85）當常設閘門 |
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
- tier 3：三尊 horizon **1280／1360／1385**（fill 0.914／0.971／0.989），`rate` ≤1.11。
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
- draw calls：新版 **926 < 基準 958–965**（不增，且更少）。另有決定性對照：`lbox-probe` L4 同一頁面同一幀切黑條，`calls 14/14/14`、`tris 855` 逐值相同 ⇒ 黑條不進 renderer。

## F7 Playwright 零錯（**綠**）
`pace-ab`（30 次 drive）0；`duel-t3`（14 場）0；`duel-new`／`duel-fxtier0`（各 4 場）0；`traitfx-drive` 三個 tier 全套每案 `err=0`；`lbox-probe`／`fpsdiag-probe`／`t3-shot` 各 0。

## F8 文件（**綠**）
GUIDE §11.27（八條＋兩條沒過的閘門，二版要再更新為三條裁定）；`VERSION="0.54"`；`ART_BIBLE`／`GAME_DESIGN` 未出現在 diff。

## F9 範圍（**綠**，修訂三補列後）
`git diff --stat adbb124..HEAD`（排除證據目錄）共 **25 個檔**，全部在計畫檔第 1 節：
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
