# 實跑報告：招式三級視覺分級（v0.54，2026-09-10）

> 驗收凍結＝`docs/experiments/2026-09-10-acceptance-fx-tiers.md`（F0–F10，門檻一字未動）。
> 計畫檔（介面凍結）＝`docs/experiments/2026-09-10-plan-fx-tiers.md`。基準＝`adbb124`（＝`4b7dadd` v0.53 ＋ 凍結檔，程式碼相同）。
> 證據目錄＝`docs/experiments/2026-09-10-fx-tiers-evidence/`。**F5 iPhone 段與 F6 手機段依凍結檔不在本輪範圍（記錄項）。**

## 結論（給只看三行的人）
1. **F0／F1／F2／F5 機械段／F6／F7／F8／F10 全綠**，27 支短版原生塞進 260ms（`rate` 全部 1.0、`clean` 全過）、三尊 1400ms＋CINEMA＋黑條到位、kill switch 等價。
2. **三條沒過，門檻一律沒動**：**F3 節奏**中位 5302ms > 5000ms；**F4** 的 `closeup-judge nullCount=2` 與 `dmg-readability` seed 3 的 R2 空過；**F9 範圍**多了 1 個檔（`js/renderer.js` +1 行）。
3. F4 那兩條在**基準 `adbb124` 上逐項相同**（同樣 2 筆 null、同樣的 `maskDropped`），與 tier 無關；F3 是設計後果不是 bug，歸因在下面 §F3。三條都留給製作人裁。

## 逐條三態表

| 條 | 狀態 | 關鍵數字 | 證據 |
|---|---|---|---|
| F0 等價雙向 | **綠** | `trace(1..20)` equal=true（bytes 357285＝357285）；突變驗紅 differs=true；既有 9 套＋新 1 套全綠 | 見 §F0 |
| F1 分母歸一 | **綠** | 分母 runtime 10／治具 47（招式時長語意 4／17）；改後 runtime 招式時長 900 字面值 **0 處**；單元測試 12 綠、對基準 **12 紅** | `tests/fxtier.test.mjs` |
| F2 短版原生合身 | **綠** | `--tier=1` **27/27**（`rate` 全 1.0、`clean` 全過、`msOK` 全過）；`--tier=2` **30/30**；`--tier=3` **3/3** | `tfx-t1.json`／`tfx-t2.json`／`tfx-t3.json` |
| F3 節奏 | **紅** | 新版中位 **5302ms**（門檻 ≤5000）；基準同 seeds 中位 5573.5ms | `duel-new.json`／`duel-base.json` |
| F4 可讀性不退 | **紅** | seed 1 R1／R2 綠；**seed 3 R2 空過**（`maskN=0`）；`closeup-judge` **nullCount=2**（門檻 0）——兩者基準逐項相同 | `dmg-s1/`／`dmg-s3/`／`cu-on1.json`／`cu-base1.json` |
| F5 三級可辨（機械） | **綠** | tier 1／2 的 CINEMA 幀 **0**；tier 3 `maxK=1.0`、尾端收乾淨；黑條 0→31.19px→0 | `lbox.json` |
| F5 三級可辨（人眼） | **未裁** | 3 張 contact sheet 已產出，**交使用者挑**（凍結檔：點名「看不出是哪一招」的最多回頭改兩輪） | `sheet-t1-short.png`／`sheet-t2-full.png`／`sheet-t3-legend.png` |
| F6 fps | **綠** | `rafMedianFps` 59.9／59.9＝**1.00**（≥0.90）；`rendersPerSec` 中位 267／286＝**0.933**；draw call 黑條開關前後 **14／14／14**、triangles 855 逐值相同 | `fps-new.json`／`fps-base.json`／`lbox.json` |
| F7 Playwright 零錯 | **綠** | `duel-drive` 4 場 0、`?fxtier=0` 4 場 0、`traitfx-drive` 三個 tier 全套 0、`lbox-probe` 0 | 各 json 的 `errors` |
| F8 文件 | **綠** | GUIDE 新 §11.27（八條）；`VERSION="0.54"`＋`VERSION_NOTE` 首段；`ART_BIBLE`／`GAME_DESIGN` diff 為空 | `git diff --stat` |
| F9 範圍 | **紅** | 多 1 個檔：`js/renderer.js`（+1 行，把 `director` 掛上 `__yaoshi3d` 給 F5 探針）；`TRAITS` diff **只有 tier:3 三行**；引擎函式 diff 為空 | 見 §F9 |
| F10 短版品質下限 | **綠** | 27 支非 flinch 動作數 **5–24**，全部 ≥2 | `tfx-t1.json` 的 `summary.actsTable` |

---

## F0 等價雙向
```
node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html
→ {"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}
node tests/tools/trace-eq.mjs index.html --mutate
→ {"mutation":"CFG.ROUNDS 12 -> 11","differs":true,"verdict":"突變驗紅 ✅"}
```
既有 9 套：`duel-desync` 7 綠／`lineup-order` 8 綠／`aistake` 8／`conscap` 5／`legend` 32／`nightrules` 16／`review` 28／`roles-balance` 32／`wish16` 36，**全部 0 紅**，且它們的 diff 為空（沒有新增任何毫秒斷言）。
新增 `tests/fxtier.test.mjs` 12 綠。

**`?fxtier=0` 的等價**：`trace()` 是 headless 引擎路徑、不讀 URL，兩者本來就是同一份輸出，所以那一半改用真實路徑證明——
`duel-drive ?fxtier=0` 4 場的 `FXC.tiers = {1:0, 2:12, 3:0}`（12 拍全部 tier 2＝v0.53 行為），時長 `[5194,5883,4795,8880]` 中位 5538.5ms，與基準的 `[5222,5925,4697,8634]` 中位 5573.5ms 幾乎逐項相同。

## F1 分母歸一（動手前自己 grep 的 N，不是抄評審的 20）
```
grep -rn "900" index.html js/      → 命中 10 行
grep -rn "900" tests/ --include=*.mjs --include=*.html --include=*.py → 命中 47 行
```
**runtime 命中 10，其中「語意＝招式時長」4 處**（＝評審數的 runtime 4，數字對得上）：
`index.html:3976` `TRAIT_MS:900`、`js/trait-fx.js:366` `Number(det.ms)||900`、`js/camera-director.js:74` `LEAN.ms=900`、`index.html:3973` `BEAT_MIN_MS:900`（拍長語意，凍結檔要求依 tier 一併改）。
**排除的 6 處**（逐處在原始碼就地加了註解說明）：`index.html:385` `font-weight:900`（CSS 字重）、`js/camera-director.js:18` `table` shot 的 `ms:900`（**牌桌機位過場時間，不是招式時長**）、`index.html:5377`／`js/trait-fx.js:266`／`js/trait-fx/yinqi.js:306`／`js/trait-fx/zuling.js:11` 四處純註解。
★評審說的「十餘處 `setTimeout(r,900)` 開服延遲」在 runtime **不存在**（`grep` 只有上面 10 行）——那 19 處全在治具。★

**治具命中 47，其中「語意＝招式時長」17 處**：`traitfx-drive.mjs:3,54`、`traitfx-preview.html:66`（2 個字面值）、`cam-drive.mjs:62,90`、`cam-unit.mjs:109,112,133,189,194,199,253,265,282`（9 處）＋`:359,360`（2 處 `leanOf`）、`closeup-judge.mjs:116`、`closeup-cam-unit.mjs:78`（focus 停留長度，加註排除）。
**排除 30 處**：19 處 `setTimeout(r,900)`／`waitForTimeout(900)` 開服等待、`dmg-readability.mjs:3,5,411,448`（port 9001/9002 與 `timeoutMs:900000`）、`duel-drive.mjs:70,72`（1900ms 取樣）、`creature-preview.html:202`（attack clip 長度）、`creature-shoot.mjs:25`、`overflow-probe.mjs:58`（迴圈上限）、`traitfx-sheet.mjs:35`（viewport 高度）。

**收斂結果**：runtime 收成 `PW_FX.TRAIT_MS_BY_TIER`／`BEAT_MIN_MS_BY_TIER`／`TIER_BASE_MS` 三張表（同一個 `PW_FX` 區塊），`||900` 退路刪除改 throw；治具全部改讀 `tests/tools/fx-consts.mjs`，且它的 `assertPageConsts()` 每次跑都與頁面逐鍵比對。
**鑑別力**：`node tests/fxtier.test.mjs --html=<adbb124 的 index.html>` → **0 綠 12 紅**，分母那條精確列出基準的 4 處（`index.html:3973/3976`、`camera-director.js:74`、`trait-fx.js:366`），退路兩條紅在「`||900` 還在」，`TRAITS` 那條紅在「沒有 tier 欄位」——都是行為斷言。

## F2 短版原生合身
```
node tests/tools/traitfx-drive.mjs docs/.../tfx-t1.json --tier=1 --port=9541  → 27/27 pass
node tests/tools/traitfx-drive.mjs docs/.../tfx-t2.json --tier=2 --port=9542  → 30/30 pass
node tests/tools/traitfx-drive.mjs docs/.../tfx-t3.json --tier=3 --port=9543  → 3/3 pass
```
- `--tier=1` 27 支：`run.ms` 全部 260（`msOK`）、`maxRate` **全部 1.0**（`rateOK`；短版沒有一支靠加速擠進去）、`cut===0 && fused===0`（`clean`）、`onTime`、`restored`、`programsGrew=0`、重複簽章 0。
- `--tier=2` 30 套（27＋三尊）與 v0.53 同結果（完整版一行未動）。
- `--tier=3` 三尊：1400ms、`clean`、`rate` 1.0（900→1400 之後反而更從容）。
- **防假綠的兩道**：治具斷言 `run.ms===msOf(tier)`（防「`--tier=1` 其實還在跑 900」）；`rate` 上限 1.0（防「把完整版 `rate` 拉到 3.46×」）。`clean` 判準沿用 v0.53 的 `cut===0 && fused===0`，一字未放寬。

## F3 節奏（**紅**）
| | 4 場 duelsMs | 中位 |
|---|---|---|
| 新版（v0.54） | `[4642, 5889, 4715, 8716]` | **5302ms** |
| 基準（adbb124） | `[5222, 5925, 4697, 8634]` | 5573.5ms |
| `?fxtier=0` | `[5194, 5883, 4795, 8880]` | 5538.5ms |

門檻 ≤5000ms → **紅**（比基準快 271ms／−4.9%，但沒到門檻）。
**歸因（有數字）**：同一批 4 場的拍級分布是 `FXC.tiers = {1:4, 2:8, 3:0}`——12 拍裡**只有 4 拍是 tier 1**。
原因是三級定義本身：「該拍有擊殺（burn）→ tier 2」，而 8v8 基礎戰三分之二的拍都有紙紮被燒，所以拍末下限大多仍是 900ms。
另一半原因是**招式本身在一局裡只出現 4 次**（`FXC.trait=4`），900→260 總共只省 4×640＝2560ms，分散在 4 場。
換句話說：這一卷把「招式演出」變快了（27 支實測 260ms），但一場對決的時間大宗是**拍末等待**與**逐筆事件**，而拍末等待被「擊殺拍升 tier 2」這條規則擋在 900ms。
**要往下走有三條路（都要製作人裁，本輪一條都沒動）**：① 把「擊殺拍→tier 2」改成更窄的條件（例如只認「決定勝負的那一次擊殺」）② tier 2 的拍末下限從 900 下修 ③ 承認 5.3 秒可接受、改 F3 門檻。
**子條「有 tier 3 出場的對決 ≤8 s」＝未跑**：這 4 場一次都沒有三尊上場（`tiers` 的 3 是 0），沒有樣本，不能拿「沒紅」當通過。

## F4 可讀性不退（**紅**，兩處皆與 tier 無關）
### `dmg-readability`
| seed | R1 | R2 | 關鍵數字 |
|---|---|---|---|
| 1（新版） | PASS | **PASS** | 遮罩中位 **59.58**（≥25）、`maskGe25Ratio` **1.0**（≥0.7）、`back200MaskAbsMax` **1.68**（≤5）、字級 hit 27.2／kill 35.36（≥1.6×17） |
| 3（新版） | PASS | **FAIL** | `maskN=0`（可判樣本 0）＝空過，fail-closed |
| 3（基準 adbb124） | PASS | **FAIL** | `maskN=0`、`maskDropped {moved:3, tinyMask:2}`、`via {hitstop:3}` — **與新版逐項相同** |

seed 3 的 R2 在基準上就是紅的，數字逐項一致（連 `maskDropped` 的分項都一樣），**不是這一卷造成的**。

### `closeup-judge`
| | n | deepOk | monoQuiet | **nullCount** | 那兩筆 |
|---|---|---|---|---|---|
| 新版 | 10 | 10 | 8/8 | **2** | rows 6／8，`quiet=0` |
| 基準 | 10 | 10 | 8/8 | **2** | rows 6／8，`quiet=0` |

門檻是 0 → 紅。**歸因**：那兩筆的 `need` 只有 3／4（依拍長換算後已經很低），紅的原因是 `quiet=0`——
命中拍每 45–260ms 一次 punch 把整段靜幀排光（`closeup-judge` 檔頭 v0.45 就記過這個現象），**與視窗長度、與 tier 都無關**。
本卷已按凍結檔要求做了兩件事：① 分析視窗的 `+900` 改讀 `fx-consts` 的拍末下限 ② 8 幀門檻改成**依視窗長按比例換算**（tier 2 下逐項等於 v0.53）③ `nullCount` 印出來、且 `monoQuietOk===null` 從「不算過」升級成**明確紅**。
所以這條紅是「凍結檔要求的新嚴格度把既有缺陷照出來」，不是退步。

## F5 三級可辨
### 機械段（`tests/tools/lbox-probe.mjs`，正反都驗）
```
VERDICT L1=PASS L2=PASS L3=PASS L4=PASS err=0 → PASS
tier1 {ms:260,  samples:52,  onCount:0,   maxK:0}     ← 反面：CINEMA 一幀都沒有
tier2 {ms:900,  samples:88,  onCount:0,   maxK:0}     ← 反面
tier3 {ms:1400, samples:120, onCount:103, maxK:1, onDuring:84, onAtTail:0} ← 正面：真的出現，且收得乾淨
lbox  {before:[0,0] → open:[31.19,31.19] → back:[0,0]}
draws {off:{calls:14,tris:855}, on:{calls:14,tris:855}, off2:{calls:14,tris:855}}
```
### 人眼段（**交使用者挑**）
- `sheet-t1-short.png`：27 支短版各 3 格（出招後 20%／45%／75%，**依 tier 換算**——舊治具寫死第 8／22／36 幀，tier 1 只有 16 幀，後兩格會拍到空畫面）。
- `sheet-t2-full.png`：30 套完整版同樣三格，與短版並排比對用。
- `sheet-t3-legend.png`：三尊大招各 3 幀。
- 三尊大招的逐張原圖在 `shots-t3/`。**tier 1／2 的逐張原圖（171 張、14MB）沒進版控**——
  contact sheet 已經是同一批畫面，要重產就跑 `traitfx-drive --tier=1 --shots=<目錄>`（指令在報告開頭那組）。
  同理 `dmg-s1/`／`dmg-s3/` 只留 `pix.json`，逐幀 PNG（37MB）沒收進來。

## F6 fps
| | rafMedianFps | rendersPerSec（4 次） | 比值 |
|---|---|---|---|
| 新版 | 59.9 | 268.4／266.5／276.5／241.9（中位 ≈267） | — |
| 基準 | 59.9 | 283.9／288.9／244.5／289.1（中位 ≈286） | fps **1.00**、renders **0.933** |

兩項都 ≥0.90 → 綠。
**draw calls 這條改了量測位置，理由要寫下來**：`duel-perf` 的 `drawCallsPerFrame` 在**基準自己身上**就會跳——
基準三次 926／960／926，新版四次 924／964／962／960，兩組分布重疊。
波動來源是每局袋子不同 → 場上妖的種類不同 → mesh 數不同（輸入資料的自然波動，`02 §6.2` 允許但不得拿它當證據）。
所以改用**同一頁面、同一場景、同一幀只切黑條**的對照（`lbox-probe` 的 L4）：開／關／再關三次的 `renderer.info.render.calls` 都是 **14**、`triangles` 都是 **855**，逐值相同。
這是決定性的：黑條是 DOM，不進 renderer。另外 `traitfx-drive` 30/30 套的 `programsGrew=0`，沒有新 shader program。

## F7 Playwright 零錯
`duel-drive` 4 場 `errors 0`；`?fxtier=0` 4 場 `errors 0`；`traitfx-drive --tier=1/2/3` 全套每一案 `err=0`；`lbox-probe` `err=0`；`closeup-drive` P7 `errs: []`。

## F8 文件
`docs/IMPLEMENTATION_GUIDE.md` 新增 §11.27（八條＋兩條沒過的閘門）；`index.html:1985` `VERSION="0.54"`，`VERSION_NOTE` 首段寫本卷；`docs/ART_BIBLE.md`／`docs/GAME_DESIGN.md` 未出現在 `git diff --stat`（diff 為空）。

## F9 範圍（**紅**：多 1 個檔）
```
git diff --stat adbb124..HEAD（排除證據目錄）
 docs/IMPLEMENTATION_GUIDE.md                 |  59 +++++
 docs/experiments/2026-09-10-plan-fx-tiers.md | 199 +++++++++++++++++
 index.html                                   |  99 +++++++--
 js/camera-director.js                        |  70 +++++-
 js/renderer.js                               |   2 +-     ← ★計畫檔第 1 節沒列到這個檔★
 js/trait-fx.js                               |  40 +++-
 js/trait-fx/xianghuo.js                      | 290 +++++++++++++++++++++++++
 js/trait-fx/yinqi.js                         | 309 +++++++++++++++++++++++++
 js/trait-fx/zuling.js                        | 279 ++++++++++++++++++++++++
 tests/fxtier.test.mjs                        | 149 +++++++++++++
 tests/tools/cam-drive.mjs                    |  12 +-
 tests/tools/cam-unit.mjs                     |  31 +--
 tests/tools/closeup-cam-unit.mjs             |   2 +
 tests/tools/closeup-judge.mjs                |  20 +-
 tests/tools/fx-consts.mjs                    |  79 +++++++
 tests/tools/lbox-probe.mjs                   | 143 +++++++++++++
 tests/tools/traitfx-drive.mjs                |  63 +++++-
 tests/tools/traitfx-preview.html             |  10 +-
 tests/tools/traitfx-sheet.mjs                |  11 +-
 19 files changed, 1802 insertions(+), 65 deletions(-)
```
- **超出的那一個**：`js/renderer.js` 只改了一行——把已經存在的 `director` 物件掛進 `window.__yaoshi3d`，讓 F5 的 Playwright 探針讀得到 `cinemaOn()`。沒有它就驗不了「CINEMA 只在 tier 3」。**這仍然是計畫檔白名單之外的檔，照 `02 §2.1` 不自行放寬，記紅交裁。**
- `TRAITS` 的 diff **只有三行**（`eliteBlind`／`wardGuardAll`／`hauntAnswer` 各加 `tier:3`），逐字比對過。
- 引擎函式（`paperWar`／`pwSide`／`pwClash`／`pwPrep`／`pwBolt`／`pwHaunt`／`pwStrike`／`pwRec`／`buildArmy`／`collectEffects`／`applyHooks`）diff 為空；`index.html` 的其餘改動集中在 `PW_FX`、`pwBeatTier`／`pwTierMs`／`pwBeatMinMs`／`pwLetterbox` 四支新函式、`pwTraitFx`／`pwPlayBeat`／`doSkip` 的接線、黑條 DOM／CSS、測試出口、`VERSION`。
- `tests/tools/traitfx-sheet.mjs` 與 `closeup-cam-unit.mjs` 在計畫檔第 1 節有列（治具那一列）。

## F10 短版品質下限
27 支非 flinch 的 tween／fly／fade／grow 條數（門檻 ≥2）：
```
eliteOpenShot=6  wardHpFront2=7  eliteArmor=10 wardFirst=8  boltGamble=6  swarmHalfSplash=11
swarmThorn=6     eliteSelfCut=8  wardHpAll1=7  wardAtkAll1=9 eliteCleave=5 wardAbsorb4=12
wardImmuneLost=10 swarmRally=24  biteGamble=6  wardHpFirst=9 wardRegen1=8  swarmLastStand=9
hauntLost=21     hauntSteal=18   hauntSee=15   hauntDread1=17 hauntSwap=11 eliteVsSwarm=5
swarmPierce=6    hauntFearX2=17  swarmFeed1=18
```
最小值 5（`eliteCleave`／`eliteVsSwarm`），全部 ≥2。

---

## 實作期間踩到並修掉的兩件事（不在驗收條裡，但會影響下一個人）
1. **`traitfx-drive` 的 LEGENDS regex 自 2026-09-07 起一套都抓不到**：請神 2.0 在 `LEGENDS` 的 `d` 與 `unit` 之間插了一整段 `eff:{...hooks...}`，舊 regex 假設兩者相鄰，於是三尊三招**近一個月沒被機械驗收過**，而治具只印一行 `LEGENDS 反查到 0 套` 的 warn 就繼續跑。已改成不假設相鄰，且**反查不到直接 throw**（少測幾套一定要紅）。
2. **短版不能用 `ms:1` 的「觸發器 tween」**：`update` 在那一幀會被呼叫不只一次，裡面再 `st.bolt`＋`st.fade` 會逐幀重排，`horizon` 被推到 264，`rate` 變 1.0537（`boltGamble` 第一版紅在這裡）。要「某一刻才現形」的 mesh，頂層先建好、`opacity:0`，靠 `st.fade(..., {delay})` 到點才淡出。紀律已寫進 `js/trait-fx/zuling.js` 的短版區塊檔頭與 GUIDE §11.27。
