# 批 0 實跑報告：招式可辨性卷 v0.55（2026-09-12）

> 工作計畫＝`docs/experiments/2026-09-12-plan-fx-legibility-b0.md`（第 3／4／5／6／8 節訂下即凍結）。
> 權威規格＝`docs/experiments/2026-09-11-acceptance-fx-legibility.md`（L0–L12）＋
> `docs/proposals/2026-09-11-plan-fx-legibility.md`（§1／§2／§6／§7／§8）。
> 基準 SHA＝`6a839de`。證據目錄＝`docs/experiments/2026-09-12-fx-legibility-b0-evidence/`。
> **本批停在這裡交使用者看**（凍結檔檔頭 Q2）；批 1／2／3 才逐系換另外 23 支。

---

## 0. 一句話

地基做好了（語彙單一來源＋六個積木＋`MAT_SOLID`＋兩支新治具），四支示範招（三系都有）
在 tier 1／2 都拿到完整的因果三段與各自的法寶徽記，機械閘門九條裡八條綠、一條黃（draw call）、
兩條記錄項未跑；**門檻一字未動**，過不去的地方改的都是實作。

## 1. 閘門三態表

| 代號 | 條件 | 狀態 | 數字 | 證據 |
|---|---|---|---|---|
| **B0-1** | `trace-eq` 對基準 `index.html` 逐位元組相等；`--beats` 也相等；`--mutate` exit 1 | 🟢 綠 | 預設 `equal:true`（兩邊各 357,285 bytes）；`--beats` `equal:true` 且 `injected:true`（540,776 bytes）；`--mutate` `differs:true`（`CFG.ROUNDS 12→11`） | 本檔 §2 指令原文；`index.html` diff 為空 |
| **B0-2** | `traitfx-drive --tier=1` 27 套 `onTime`／`clean`／`rateOK`≤1.0／`actionsOK`／`msOK`(260) 全過 | 🟢 綠 | **27/27 PASS**，重複簽章 0，`maxRate` 全場最大 **1.000**，`fill` 0.877–0.896 | `…-evidence/gates/b0-t1.json` |
| **B0-3** | `--tier=2` 30 套、`--tier=3` 三尊 全過 | 🟢 綠 | **30/30** 與 **3/3** PASS，重複簽章各 0；tier 3 `maxRate` 最大 1.000 | `gates/b0-t2.json`、`gates/b0-t3.json` |
| **B0-4** | `programsGrew` = 0（三個 tier） | 🟢 綠 | 三個 tier 共 60 套，`programsGrew≠0` 的 **0 套** | 同上三份 JSON |
| **B0-5** | `duel-drive` 4 場（seed 7）＋`?fxtier=0` 4 場：0 console error／pageerror／requestfailed | 🟢 綠 | 兩份都 `errors:0`、`ys3d:true`、`trait:4`／`traitFig:4` | `gates/b0-duel.json`、`gates/b0-duel-off.json` |
| **B0-6** | `drawCallsPerFrame` ≤1000（原始欄位）／tris 增量 ≤1%／`rendersPerSec` 比值 ≥0.90 | 🟡 黃 | **≤1000 過**（新樹最大 962）；**tris 過**（同 `visible`=15：新 344,858–345,178 vs 基準 344,850–345,170，**＋8 tris＝+0.002%**）；**fps 比值過**（同 `visible`=15：新 272.1／273.4 vs 基準 268.3／286.6，均值比 **0.983**）。**黃在這裡**：同 `visible`=15 的 draw call 新樹 {932, 926}、基準 {926, 922}，**新樹最大值比基準最大值高 6**（+0.6%），沒有落在基準全距之內。 | `gates/b0-perf*.json`（新樹 4 次、基準 3 次） |
| **B0-7** | 示範招凍幀 A/B：特效像素 ≥0.8% 且 CIE76 ΔE 中位 ≥28；`ICON.size=0.02` 突變必須紅 | 🟢 綠 | **4/4 過**：獻祭刀 1.189%／ΔE 63.35，千里眼 2.280%／109.50，虎爺印 2.417%／65.03，魔神仔 2.624%／82.02。**突變驗紅**：`ICON.size` 與四支 `SZ` 全改 0.02 → **4/4 全紅**（面積 0.0706%／0.0806%／0.0000%／0.0881%） | `contrast/metrics.json`＋8 張 A/B 凍幀 |
| **B0-8** | 九套規則測試全綠、零毫秒斷言新增；`fxtier`／`fxvocab` 綠 | 🟢 綠 | review 28/0、nightrules 16/0、duel-desync 7/0、lineup-order 8/0、legend 32/0、aistake 8/0、conscap 5/0、roles-balance 32/0、wish16 36/0、**fxtier 14 綠 0 紅**、**fxvocab 11 綠 0 紅**；`fxvocab --mutate=1/2/3` 各紅 3／1／1 條 | 本檔 §2 |
| **B0-9** | `git diff 6a839de.. -- index.html` 為空；`--stat` 只出現計畫第 4 節的檔 | 🟢 綠 | `index.html` **零 diff**；36 檔 +2218/−314，逐檔對得上第 4 節（含三處已揭露的增列） | 本檔 §5 |
| （記錄項）| L10 `dmg-readability`／`closeup-judge` | ⚪ 未跑 | `tests/tools/dmg-readability.mjs:28` 只有**一段** playwright 候選路徑，在 worktree 直接 `MODULE_NOT_FOUND`（R2 覆審 N8 補過其他幾支，這支還沒補）。**未跑就是未跑**，不宣稱不退。 | — |

**B0-6 黃燈的歸因（不是猜的）**：`MAT_SOLID` 的常駐預熱物件 `warmSolid` 是 `frustumCulled=false`，
每一幀都真的被畫 ⇒ **常駐 +1 個 draw call**；其餘落在招式演出當下的徽記本體＋ink 底板＋拖尾。
計畫附錄的預算是「平均 +3～+4、峰值 +8～+10」，實測 +6 落在預算內。
**兩組各只有 2 個同 `visible` 樣本**，全距重疊但不包含——這個子條件本身樣本不足以判定，
所以據實記黃，不自行放行也不宣稱過。批 1–3 合併前要用更多樣本重量。

## 2. 驗證指令原文與輸出

```bash
# B0-1
node tests/tools/trace-eq.mjs scratchpad/fxleg-b0-base-index.html index.html
#  {"old":"…","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}   exit 0
node tests/tools/trace-eq.mjs scratchpad/fxleg-b0-base-index.html index.html --beats
#  {"mode":"beats",…,"bytesOld":540776,"bytesNew":540776,"equal":true,"injected":true,
#   "verdict":"拍序列逐位元組相等 ✅"}                                                    exit 0
node tests/tools/trace-eq.mjs index.html --mutate
#  {"mode":"mutate",…,"mutation":"CFG.ROUNDS 12 -> 11","differs":true,
#   "verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}                                     exit 0

# B0-2 / B0-3 / B0-4（Playwright 一律單獨跑，不並發）
node tests/tools/traitfx-drive.mjs scratchpad/b0-t1.json --tier=1 --port=8881   # 27/27 pass · 重複簽章 0
node tests/tools/traitfx-drive.mjs scratchpad/b0-t2.json --tier=2 --port=8882   # 30/30 pass · 重複簽章 0
node tests/tools/traitfx-drive.mjs scratchpad/b0-t3.json --tier=3 --port=8883   #  3/3  pass · 重複簽章 0

# B0-5
node tests/tools/duel-drive.mjs "http://127.0.0.1:8891/index.html?paperwar=1&fxcount=1&seed=7" \
     scratchpad/b0-duel.json --duels=4 --port=8891
#  {"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":6,"trait":4,"traitFig":4,"ver":"v0.56a"}
node tests/tools/duel-drive.mjs "http://127.0.0.1:8892/index.html?paperwar=1&fxcount=1&seed=7&fxtier=0" \
     scratchpad/b0-duel-off.json --duels=4 --port=8892
#  {"duels":4,"errors":0,…}

# B0-6（基準那三次是把四個產品檔用 git show 6a839de 取檔後跑的，量完用 scratchpad/keep 的備份副本還原）
node tests/tools/duel-perf.mjs perf scratchpad/b0-perf.json --port=8833
#  新樹：visible 15 → draw 932 / tris 345178 / rendersPerSec 273.4
#        visible 16 → draw 962 / tris 353146 / 269.5
#        visible 14 → draw 878 / tris 333796 / 262.7
#        visible 15 → draw 926 / tris 344858 / 272.1
#  基準：visible 13 → draw 834 / tris 323162 / 288.4
#        visible 15 → draw 926 / tris 345170 / 268.3
#        visible 15 → draw 922 / tris 344850 / 286.6

# B0-7
node tests/tools/fx-contrast.mjs scratchpad/b0-contrast --port=8850 --tier=2 \
     --only=eliteSelfCut,biteGamble,wardImmuneLost,hauntLost
python tests/tools/fx-contrast-metrics.py scratchpad/b0-contrast --json=scratchpad/b0-contrast.json
#  {"trait":"eliteSelfCut",  "area_pct":1.189, "de_median":63.35, "ok":true}
#  {"trait":"wardImmuneLost","area_pct":2.2795,"de_median":109.5, "ok":true}
#  {"trait":"biteGamble",    "area_pct":2.4174,"de_median":65.03, "ok":true}
#  {"trait":"hauntLost",     "area_pct":2.6241,"de_median":82.02, "ok":true}
#  {"gate":{"area_pct_min":0.8,"de_median_min":28,"luma_eps":6},"n":4,"pass":4,"failed":[]}   exit 0
#  突變（ICON.size 與四支 SZ 全改 0.02，跑完用 scratchpad/vocab-backup.js 還原）：
#  area 0.0706 / 0.0806 / 0.0000 / 0.0881 %、pass 0、failed 四支全在                          exit 1

# B0-8
node tests/review.test.mjs        # 通過 28　失敗 0
node tests/nightrules.test.mjs    # 16 綠 ／ 0 紅
node tests/duel-desync.test.mjs   # 7 綠 ／ 0 紅
node tests/lineup-order.test.mjs  # 8 綠 ／ 0 紅
node tests/legend.test.mjs        # 32 過 / 0 失敗
node tests/aistake.test.mjs       # 通過 8　失敗 0
node tests/conscap.test.mjs       # 通過 5　失敗 0
node tests/roles-balance.test.mjs # 32 過 / 0 失敗
node tests/wish16.test.mjs        # PASS=36 FAIL=0
node tests/fxtier.test.mjs        # 14 綠 ／ 0 紅
node tests/fxvocab.test.mjs       # 11 綠 ／ 0 紅
node tests/fxvocab.test.mjs --mutate=1   # 7 綠 ／ 3 紅（雙射破了＋與文件不符＋kind 集合不符）
node tests/fxvocab.test.mjs --mutate=2   # 10 綠 ／ 1 紅（xianghuo.key 退回 0xf08060）
node tests/fxvocab.test.mjs --mutate=3   # 10 綠 ／ 1 紅（BEAT[1].travel 與文件分岔）

# B0-9
git diff 6a839de.. -- index.html    # 空
git diff --stat 6a839de HEAD        # 見 §5
```

## 3. L0 分母（本批自己數的，不引用計畫 §6）

| 共用語彙 | （檔, 函式）對 | 扣掉三尊＝27 支裡的分子 | 計畫 §6 記的舊值 |
|---|---|---|---|
| `st.ring`／`st.disc` | 22 | **19／27** | 17／27 |
| `st.dome` | 5 | **3／27** | 3／27 |
| `st.orb` | 17 | **15／27** | 14／27 |
| 裸 `st.beam` | 10 | **9／27** | 8／27 |
| 編舞裡的色碼字面值 | zuling 2 ＋ xianghuo 1 ＋ yinqi 6 | **9 處** | —— |

差異來源：計畫量的是 0.54 併入前的 `main`（只有 27 支完整版），`6a839de` 多了 0.54 的 27 支短版。
**批 0 只把四支示範招的用量歸零**（那四支現在 0 處色碼字面值、0 處退役語彙）；其餘 23 支留給批 1–3。

## 4. 四支示範招：新增了什麼本體、因果三段哪幾段

四支在 **tier 1 與 tier 2 都拿到完整三段**（`sig.phases=[windup,travel,react]`）。
下表的數字是 tier 2 的實測值（tier 1 見 `gates/b0-t1.json`）：

| 招（系） | 新增的法寶本體 | 因果三段（實測值／門檻） |
|---|---|---|
| **獻祭刀** `eliteSelfCut`（祖靈） | 一把 **`knife` 黑曜石刃徽記**在頸邊亮相——`xianji` 的 GLB 裡完全沒有刀，這是法寶第一次真的出現在畫面上 | windup 骨骼 0.107／0.08；**travel 1.285／1.248**（刀本身從後上方橫劃過頸口收到前下方，拖尾是刀的殘影）；react 0.0566／0.03（治具裡只有 1 尊 ⇒ `solo`，量鹿自己的獻祭後挺立；真實對決裡是本隊每尊蓋 `knife` 印記＋托起半寸） |
| **虎爺印** `biteGamble`（香火） | 一枚 **`seal` 硃紅方印徽記**在額前浮現——`tiger_c` 骨骼表裡沒有「印」，這是唯一能把「虎爺**印**」和「山豬**牙**」分開的元素 | windup 骨骼 0.0867／0.08；**travel 1.563／1.248**（方印隨撲擊飛到咬點，取代原本兩道分不出是什麼的 `bolt` 咬痕）；react 0.0781／0.03（獵物重退縮＋方印烙在牠身上） |
| **千里眼銅鈴** `wardImmuneLost`（香火） | 一枚放大的 **`bell` 銅鈴徽記**在鈴上長出來；三圈貼桌鈴波環整組退役 | windup 骨骼 0.416／0.08；**travel 1.373／1.248**（鈴聲「望出千里」——徽記朝對面飛出一段再折返，**把被動免疫演成看得見的動作**）；react 0.0396／0.03（同伴頭上各蓋一枚銅鈴印記＋托起半寸） |
| **魔神仔紅帽** `hauntLost`（陰氣） | 兩頂 **`hat` 紅帽徽記**（陰氣授權的「那一點刺眼的紅」）＋地面一串壓平的近黑暗斑腳印（`st.icons` 一個 draw call） | windup 骨骼 0.111／0.08；**travel 1.310／1.253**（紅帽真的飛過去扣在被迷那隻頭上——原本這一段**完全沒有飛行物**，就是失敗類型 E）；react 0.0401／0.03（被迷的原地打轉**並踉蹌位移**；只有 `spin` 不算反應，門檻量的是 `move`／`scale`） |

**短版與完整版是同一支函式**（`SHORT[trId] = MOVES[trId]`），時間軸全部由 `st.beat`＝`beatOf(tier, run.ms)` 換算。

## 5. 範圍（`git diff --stat 6a839de HEAD`）

```
 docs/design/ART_BIBLE.md                                |  82 ++++    ← 只多 §10（+82/−0）
 docs/IMPLEMENTATION_GUIDE.md                            |  89 ++++    ← 只多 §11.29（+89/−0）
 docs/experiments/2026-09-11-fx-vocab.md                 | 106 ++++    ← 新增
 docs/experiments/2026-09-12-plan-fx-legibility-b0.md    | 212 ++++    ← 新增（派工要求）
 docs/experiments/2026-09-12-fx-legibility-b0-report.md  |   —  ← 本檔
 docs/experiments/2026-09-12-fx-legibility-b0-evidence/  | 21 PNG + 5 JSON + 12 gate JSON
 js/trait-fx.js                                          | 293 ++++    ← 純新增為主
 js/trait-fx/emblems.js                                  | 127 ++++    ← 新增
 js/trait-fx/vocab.js                                    | 113 ++++    ← 新增
 js/trait-fx/xianghuo.js                                 | 296 +-      ← 只動 biteGamble／wardImmuneLost
 js/trait-fx/yinqi.js                                    | 156 +-      ← 只動 hauntLost
 js/trait-fx/zuling.js                                   | 153 +-      ← 只動 eliteSelfCut
 tests/fxvocab.test.mjs                                  | 164 ++++    ← 新增
 tests/tools/blindread-sheet.mjs                         | 182 ++++    ← 新增
 tests/tools/fx-contrast.mjs                             | 121 ++++    ← 新增
 tests/tools/fx-contrast-metrics.py                      | 107 ++++    ← 新增
 tests/tools/traitfx-preview.html                        |  10 ++      ← 加 __tfx.fxVis／bloomCfg
 index.html                                              |   0         ← 零 diff
```

**三個系別檔的 diff 逐一對得上需求**：只有那四支招的函式體、加上
`export default {` → `const MOVES = {` ＋ `export default MOVES;`（為了讓 `SHORT` 指回同一支函式）。
另外 23 支招的函式名與函式體一行未動（`git diff … | grep '^[-+]  [A-Za-z0-9]+\(st\) {'` 只列出那四支）。

**與計畫 §1 檔案清單的三處增列**（合併前要交裁，凍結檔 L11 只准出現 §1 列的檔）：
`tests/fxvocab.test.mjs`（L12 明文要求單元測試，§1 沒給落點）、
`tests/tools/traitfx-preview.html`（L3 要求「兩幀之間只有 `visible` 一個變數」，治具頁不給開關就做不到）、
本批自己的計畫／報告／證據目錄（派工要求）。

## 6. 過程中被實測推翻的三件事（門檻沒動，動的是實作）

1. **計畫 §6 建議獻祭刀用「近黑 ink 實心＋靛藍描邊」——過不了 L3**。
   在暗紅桌 `#6b3418` ＋夜紫天上實測 **CIE76 ΔE 中位只有 25.13（門檻 28）**：近黑本體放在暗背景上本來就沒有對比。
   翻成本系標準配色（`key` 靛藍本體＋`ink` 底板）後 **63.35**。「黑曜石」的身分改由剪影承擔（ART_BIBLE §7）。
2. **徽記太小，面積過不了 0.8%**。第一版 `ICON.size=0.28`：獻祭刀 0.394%、虎爺印 0.246%。
   放大到 `size 0.44`／`outlineW 0.05`／`markSize 0.30`（四支示範招另有自己的 `SZ` 0.40–0.62）後全部過。
   **門檻一字沒改**；`ICON.size=0.02` 的突變仍然 4/4 全紅，證明這條閘門有鑑別力。
3. **`MAT_SOLID` 沒有多出一支 shader program**。計畫 Q10 預期 program 2→3，
   但 `blending`／`opacity`／`color` 都是 render state 與 uniform、**不進 program cacheKey**，
   所以它與 `MAT_GLOW` 共用同一支——材質模板 3 支、program 仍 2 支，三個 tier `programsGrew` 全 0。
   代價只剩常駐預熱物件的 +1 draw call。

**另外三個自己踩出來的坑**（細節寫進 GUIDE §11.29，這裡只列名）：
`BEAT` 寫成毫秒被 0.54 的 F1 閘門抓到（改成比例表 `BEAT_FRAC`＋`beatOf`）；
`st.phase('travel')` 的基準惰性抓會少量一格（千里眼 1.38→0.70）；
**盲讀材料第一版把治具 HUD 的招名印在六格上**（等於發答案卡，已改成截圖前藏 `#hud`）。

## 7. Contact sheet（給使用者看的東西）

規格：**6 幀 2×3、每格 780×360、總圖 1560×1080**，幀位寫死在 `tests/tools/blindread-sheet.mjs` 的 `FRAME_AT`
（`BEAT[tier]` 的 windup 中點／travel 起／中／末／react 起／末），短版與完整版混洗成匿名編號。

| | 路徑 | 內容 |
|---|---|---|
| **改後** | `docs/experiments/2026-09-12-fx-legibility-b0-evidence/sheets-after/`（`a01`–`a12`.png） | 四支示範招 ＋ L4-pre「已知可辨」對照兩支（虎姑婆指甲 `eliteVsSwarm`、射日神弓 `eliteOpenShot`），各 tier 1／2 = 12 張 |
| **改前** | `…/sheets-before/`（`a01`–`a08`.png） | 同四支示範招在基準 `6a839de` 的編舞，同一組幀位，各 tier 1／2 = 8 張 |
| 對應表 | 兩份各自的 `mapping-HIDDEN.json` | **讀者不得看**；改前／改後用不同 seed（20260913／20260912），編號不對應 |
| 剪影總表 | `…/emblems.png` | 30 個 kind 的剪影拼圖（目視用，不是盲讀材料） |

**L4-pre 材料鑑別力本身還沒跑**：它要兩位 fresh、context-free opus 讀者（**讀者由主對話派，修者不得兼讀者**）。
批 0 只產材料與對照組。要重現的兩個方向是——
① 已知可辨的兩支（`eliteVsSwarm`／`eliteOpenShot`，r1 拿 A4／B4–5）在新材料上仍須 Q1 對且 Q2 ≥4；
② 已知不可辨的兩支（`eliteSelfCut`／`biteGamble`）**在 `sheets-before` 那一份上**仍須判不可辨。
兩個方向任一不重現 → 新材料無效，回頭修材料，**不得先改招式再說材料沒問題**。

## 8. 待使用者裁的四件事

1. **三系語彙方向**（凍結檔 Q7 明訂「批 0 出圖後使用者可改方向」）：
   祖靈＝靛藍＋垂直光柱／香火＝鎏金＋硃紅、腳下光環限縮本系／陰氣＝冷屍白青＋刺眼紅＋地面水漬。
   看 `sheets-after`，要改趁現在——批 1–3 會照這份鋪到另外 23 支。
2. **徽記尺寸**：`ICON.size` 從計畫的 0.28 放到 0.44（示範招 0.40–0.62）才過得了 L3 的面積門檻。
   這讓徽記明顯大於「法寶的真實比例」，是刻意的圖示化取捨——接受，還是寧可縮小、改用別的方式補面積？
3. **計畫 §1 檔案清單的三處增列**（見 §5 末）要不要正式收進凍結檔的 §2.1 修訂。
4. **B0-6 的黃燈**：draw call 同 `visible` 樣本比基準高 6（+0.6%），絕對門檻 ≤1000 過。
   要現在補樣本重量，還是留到批 1–3 合併前一次量？

### §2.1 修訂紀錄
（無——本批沒有動過任何門檻）
