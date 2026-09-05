# 剪影回修卷 — `eye` 祖靈之眼（zuling／ward）（2026-09-05）

## ① 結論先行

**Q1 機械全綠、Q2 剪影兩條硬指標全數達成、Q4 範圍乾淨；Q3 盲讀「未達」，三輪用盡停手，交最佳版（＝第 1 輪版）。**

- **Q2 達成**：側視 48px 全黑 mask **fill 0.784 → 0.580**（門檻 ≤0.60）、**W/H 0.97 → 0.67**（門檻 ≤0.70）。實心磚已經打散：48px 方格黑格數 **1784 → 921**（同一張 48×48 含留白的方格）。
- **Q3 未達**：★③「樹根」**三輪六位 0/6**（量產回修版是 6/6，這是相對回修版的退步，不掩飾）；特徵命中 **4/5 → 3/5**（①②⑤）。主印象「眼」第 1 輪 2/2、第 2 輪 1/2、第 3 輪 0/2；「籠／骨架／支架」0/6 ✅；祖靈氣質 6/6 ✅。
- **根因（新陷阱，已寫進 spec `_traps` (28)）**：**同一組樹根幾何，讀法由「它旁邊還剩多少石面」決定**。量產回修版在 1.05 寬的石面上樹根 6/6；本卷為了把 W/H 從 0.97 壓到 0.67，石面必須收到 0.65 寬，同一組掛件立刻被讀成「蜘蛛腳／觸手／獸角／獠牙／骨片」。第 3 輪把底部掛件全換成 rock 岩基、木根集中到眉與石面，樹根仍 0/2，而且主印象的「眼」反而掉光（岩尖＋鋸齒帶搶走主詞，被讀成「箱型頭顱／獠牙面具」）。**剪影窄化與樹根可讀性在本引擎（低多邊形、無貼圖）上互斥**——要兩者兼得得等後處理卷（描邊／木紋貼花），或由主對話裁定放寬 ward 的 W/H 門檻。

- 基準：worktree `agent-a69911a9013c99085`，起點含 eye 回修版（樹根 6/6、眼 2/2、4/5＋④裂縫簽字）。**未 commit、未 push。**
- 凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（09-05 凌晨兩段）；來源報告 `docs/experiments/2026-09-05-silhouette-test-1.md` ⑦；參照 `docs/experiments/2026-09-04-ref-eye.md`（五條特徵**一字未改**）。
- 出貨檔：`assets/creatures/eye.json`、`assets/creatures/eye.glb`（md5 `7331526c7adae2806af90a49545bc4f1`）。截圖 `docs/experiments/2026-09-05-sil-eye-{hero,stage-lit,front,side-mask}.png`。
- **出貨的 GLB 就是第 1 輪兩位讀者看到的那一版**：第 2／3 輪回退後重編、再寫 `_variant`／`_traps` metadata、再重編，md5 逐位元組相同（見 ⑤）。

---

## ② Q1–Q4 逐條表

| 條 | 項目 | 門檻 | 前值（起點） | 出貨值 | 判定 | 落點 |
|---|---|---|---|---|---|---|
| Q1 | M-A0 judge | all claims pass | pass | `[judge] … all claims pass` | **PASS** | `assets/creatures/eye.claims.json`（未動） |
| Q1 | M-A0 三支動畫 | idle／move／attack | 同 | `['idle','move','attack']` | **PASS** | `eye.json:2448`（`animations`） |
| Q1 | M-A0 GLB 大小 | ≤1.5 MB | 288,412 B | **289,264 B（282.5 KB）** | **PASS** | 編譯輸出（⑤） |
| Q1 | M-A0 三角形 | ≤8000 | 2232 | **2442** | **PASS** | judge `stats.triangles` |
| Q1 | M-A2 ward bbox X ≥ Z | X ≥ Z | 1.270 / 0.757＝1.68× | **0.878 / 0.813 ＝ 1.08×** | **PASS** | judge `whole.size` |
| Q1 | M-A3 發光材質名 | `eye`／`glow_iris` 在 GLB materials | 在 | `['rock','sclera','gold_ring','eye','glow_iris','pupil','root_wood','root_ridge','bone']` | **PASS** | ⑤ |
| Q1 | faceted 規格不退 | rigid＋全 volume faceted＋exp ≥4.6＋smooth 24–30 | rigid／True／4.6／26 | **rigid／slab+brow 皆 faceted True／min exp 4.6／smooth_angle 26**（一格未動） | **PASS** | `eye.json:113`（slab）、`eye.json:190`（brow）、`eye.json:47`（build）／`eye.json:58`（smooth_angle） |
| Q1 | 全高 | 1.20–1.25 | 1.246 | **1.245** | **PASS** | judge `whole.size[1]` |
| **Q2** | **側視 mask fill** | **≤0.60** | **0.784** | **0.580**（重算 mask 0.5798） | **PASS** | silmetrics `metrics.json`（⑤） |
| **Q2** | **側視 W/H** | **≤0.70** | **0.97** | **0.67**（重算 mask 0.670） | **PASS** | 同上 |
| Q2 | （佐證）48px 黑格數 | — | 1784／2304 | **921／2304** | — | ⑤ |
| **Q3** | 盲讀 主印象「眼」 | 2/2 | 2/2 | **第1輪 2/2、第2輪 1/2、第3輪 0/2** | **出貨版 2/2 PASS**（但不穩定，見④） | ④ |
| **Q3** | 盲讀 樹根 | ≥1/2 | 6/6 | **0/2（三輪累計 0/6）** | **FAIL** | ④ |
| Q3 | 盲讀 籠／骨架／支架 | 0/2 | 0/6 | **0/2（三輪 0/6）** | **PASS** | ④ |
| Q3 | 盲讀 祖靈氣質 | ≥1/2 | 2/2 | **2/2（三輪 6/6）** | **PASS** | ④ |
| **Q3** | 特徵命中 | ≥4/5 | 4/5（①②③⑤） | **3/5（①②⑤）** | **FAIL** | ④ |
| Q4 | 出貨檔範圍 | 只有 `eye.{json,glb}` | — | `git status --short` ＝ 2 個 M ＋ 4 張新截圖 | **PASS** | ⑤ |
| Q4 | `eye.claims.json` | 不動 | — | **一個位元組未動**（不在 `git status` 裡） | **PASS** | ⑤ |

---

## ③ 每輪改動一覽

| 輪 | 改了什麼 | 剪影 | 盲讀結果 |
|---|---|---|---|
| **r1（出貨）** | 石體由寬矮牆改高窄柱（slab a 0.524→0.323、brow a 0.442→0.312，全高不變）；上緣裂成 2 根岩尖（`crown_a`／`crown_b`，rock）＋2 根往上長的樹根（`crown_a2`／`crown_c`）；下緣 1 根樹根（`leg_main`）＋2 根岩基（`leg_side`／`leg_fwd`）；眼組整體 ×0.80、裂縫 GAP 0.36→0.287 同步縮；`fissure_web` 收窄成 ±0.214（裂縫在剪影上變腰身）；石塊掛件往石體內收 | **W/H 0.67、fill 0.580** | 眼 **2/2**、祖靈氣質 2/2、籠／骨架 0/2、**樹根 0/2**（兩位都寫「蜘蛛腳／觸手／獸足」）、特徵 3/5 |
| r2 | 底部三根木質掛件改成兩根「粗根抱石」＋兩根短岩基；眉上加 3 條 `root_web` 細股；石塊掛件放大回 0.96；鬚根長度 ×0.62 貼身 | W/H 0.68、fill 0.581 | 眼 **1/2**（一位 Q1 沒提眼）、氣質 2/2、樹根 **0/2**（讀成「獸角／耳翼」）、特徵 3/5 → **未變好** |
| r3 | 底部完全不放木質掛件（全 rock 岩基）；上緣四根全改 rock；木根集中成「拱過眉＋沿前面往下跑」的兩大股＋`root_run` 側股 | W/H 0.68、fill 0.595 | 眼 **0/2**（兩位主印象是「箱型頭顱／獠牙面具」）、氣質 2/2、樹根 **0/2**（「尖刺／骨片」）、特徵 3/5 → **更差，整份回退到 r1** |

過程中 6 次 BLOCK 全部靠改幾何解決，沒有動任何門檻：`part_attachment` ×3（pupil／root_reach／rub_c 因體積縮小而懸空）、`anim_integrity` ×2（brow 鏈太短、slab 剖面收腰太深）、`mesh_integrity` ×1（`crk_*` 細長片只縮 x 翻面）、`balance` ×1（底部只有單邊觸地）。細節全部寫進 `_traps` (21)–(29)。

---

## ④ 盲讀原話（context-free `sonnet`，每輪 2 位，只給 hero＋stage-lit 兩張）

**四題三輪一字未改**（逐字同 `2026-09-04-harden2A-report.md` §② 的問法甲，也同 `2026-09-04-review-eye-report.md`）：
> 1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？

路徑遮成 `.claude/scratch/bl/r?-A.png`／`r?-B.png`（不含 eye／眼／祖靈／石／根 等字樣），兩位讀者拿到的圖片順序對調。**未加任何提示、未告知這是什麼。**

### 第 1 輪（＝出貨版）

- **讀者 A**（Q1）「一個低多邊形風格的 3D 怪物/妖怪模型，**頭部造型類似圖騰面具，帶有一顆巨大的環狀眼睛**與多條分岔的獸足/觸手」；特徵「臉部中央偏上：**巨大的同心環狀眼睛，由外到內依序是米白（象牙）圈、藍色圈、金黃色圈，中心為黑色瞳孔開口**」「眼睛下方：一排米白色**三角尖牙／鋸齒狀突起**」「軀幹下方：多條深棕色細長分岔的**觸手/獸足**，向下並向外岔開，**像蜘蛛腳**或觸鬚束」；氣質「陰森、詭異、**帶儀式感的威嚴——像一尊年代久遠的圖騰面具或石化古獸**」；(4)「明顯偏向會威嚇你的類型」。
- **讀者 B**（Q1）「一顆懸浮的『頭部型』怪物／面具狀生物模型……靠底下一叢細長肢足『站立』」；特徵「臉部正中央：一顆**巨大的同心圓『獨眼』**——由內而外為黑色瞳孔、金黃色環、寶藍色環、米白色外環」「獨眼下方：一排米白色**尖銳鋸齒/獠牙**」「底部：多條細長、帶尖端的褐色**肢足（類似蜘蛛腿或觸手）**」；氣質「偏『**圖騰／面具幽靈**』型的詭異威嚴感……**古老邪祟或鎮守神像被喚醒**的壓迫氣息」；(4)「明顯偏向威嚇」。

### 第 2 輪

- **讀者 C**（Q1）「低多邊形風格的怪物／面具狀頭部模型，整體像一顆懸浮的『**巨眼頭顱**』或圖騰面具」；「**眼睛上方有一圈咖啡色的『眉骨／上顎』構造**」「底部延伸出三、四根深灰或近黑色的**尖錐狀突起，像獸爪、獠牙或矛尖**，充當支撐腳／底座」；氣質「**遠古祭祀用的面具或封印之物**……古老神獸／鎮邪面具」。
- **讀者 D**（Q1）「低多邊形風格的 3D 建模生物／怪物頭像，設計上比較像一顆有機關的『**頭骨機關獸**』或『神獸面具』」（**主印象未含眼**）；「頭頂兩側：左右各有一對彎曲的**土黃色/棕色獸角**，向外後方彎翹，形似犀牛角或水牛角」；氣質「**廟宇深處供奉的古老凶獸面具**……介於『上古神獸』與『邪祟法器』之間」。

### 第 3 輪

- **讀者 E**（Q1）「低多邊形風格的怪物／妖怪**頭部**造型 3D 模型……像一顆懸浮的**巨大頭顱／獠牙面具**，帶著角、獠牙與下方兩支尖刺狀『腳』」（**主印象未含眼**）；「軀幹兩側與後方各伸出數根深褐色、不規則的**尖刺/骨片**」；氣質「**古老神像／夜行妖怪**……帶詛咒或封印意味」。
- **讀者 F**（Q1）「造型接近一個**會走路的箱型頭顱／面具生物**——沒有明顯身體……下面直接接**兩隻細長的腿**站立」（**主印象未含眼**）；「臉頰兩側：多片交錯堆疊的深棕色**尖刺／獠牙狀裝飾**」；氣質「**古老神像／被詛咒的守衛**」。

### 逐條對照 ref 五條特徵（出貨版＝第 1 輪）

| ref 特徵 | 讀者 A | 讀者 B | 命中 |
|---|---|---|---|
| ★① 佔據正面中央的巨大單眼 | ✅「巨大的環狀眼睛」 | ✅「巨大的同心圓『獨眼』」 | **2/2** |
| ★② 兩圈同心凸環＋中央深瞳 | ✅「米白圈、藍色圈、金黃色圈，中心為黑色瞳孔」 | ✅「黑色瞳孔、金黃色環、寶藍色環、米白色外環」 | **2/2** |
| ★③ 粗大樹根拱過眼上、兩側抓地 | ❌ 讀成「獸喙／觸手／獸足」 | ❌ 讀成「獸吻／蜘蛛腿」 | **0/2** |
| ★④ 石體被橫向裂縫裂開 | ❌（凍結檔已簽字為引擎限制） | ❌ | 0/2（簽字） |
| ★⑤ 規律三角鋸齒／菱形紋帶 | ✅「一排米白色三角尖牙／鋸齒狀突起」 | ✅「一排米白色尖銳鋸齒」 | **2/2** |
| **合計** | | | **3/5** |

**風格牆指標**：六位裡 3 位在正文順帶提到「低多邊形本身較簡潔／樸拙」，無一位把「可愛」放進主印象（依 09-05 凌晨裁定，Q4 只作記錄項）。

---

## ⑤ 指令原文與實際輸出

工具在 worktree 內執行（`tools/anyCreature` 是連到主樹的 junction，收尾已移除）。

### 編譯（出貨版）

```
$ node tools/anyCreature/engine/cli.js assets/creatures/eye.json assets/creatures/eye.glb
{"ok":true,"out":"assets/creatures/eye.glb","bytes":289264,"verts":3956,"faces":1434,
 "joints":7,"anims":["idle","move","attack"],"checks":"all green","uv":"off"}

$ md5sum assets/creatures/eye.glb
7331526c7adae2806af90a49545bc4f1 *assets/creatures/eye.glb
```

**盲讀之後沒有再改一版當作通過**：第 2／3 輪改過但都沒有變好，已整份回退；`_variant`／`_traps` 兩個 metadata 欄位是回退後才寫的，**不改幾何**——寫入 metadata 前後各重編一次，md5 都是 `7331526c…`（上面那一行是寫入後重編的結果）。

### GLB 內容（直接解 glTF chunk）

```
GLB bytes = 289264 = 282.5 KB
materials  = ['rock','sclera','gold_ring','eye','glow_iris','pupil','root_wood','root_ridge','bone']
animations = ['idle','move','attack']
skins = 1  images = 0  textures = 0
triangles = 2442
build = rigid ; smooth_angle(spec) = 26
volume slab faceted=True sides=9 ring_step=0.04  exp=[4.8,5.0,5.0,4.6]
volume brow faceted=True sides=9 ring_step=0.038 exp=[4.8,5.0,5.0,4.6]
min exp over all profile rows = 4.6 ; volumes without faceted: []
bbox = x[-0.433,0.445] y[-0.032,1.213] z[-0.297,0.516]  size=(0.878, 1.245, 0.813)
```

### judge

```
$ node tools/anyCreature/harness/judge.mjs assets/creatures/eye.glb <out> eye \
      --spec assets/creatures/eye.claims.json
whole size  = [0.878, 1.245, 0.813]      bbox X/Z = 0.878 / 0.813 = 1.08x
tri = 2442   skins/meshes 9   anims ['idle','move','attack']
lum front = 40.3 (style_dark <= 90)      sat tq = 0.4558 (band 0.10–0.60)
share_hierarchy front = 49.7 : 41.0 : 9.4   (target 60:30:10, tol ±15pp)
[judge] Spec "祖靈之眼 eye_zuling_yan (zuling/ward)" — all claims pass.
```

### silmetrics（Q2 的兩個數字）

```
# 起點（回修版）
$ node tools/anyCreature/harness/silmetrics.mjs .claude/scratch/eye.base.glb <out>
{"W_over_H":0.97,"fill":0.784,"mass_thirds":[0.309,0.405,0.285],"turn_count":19, …}

# 出貨版
$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/eye.glb <out>
{"W_over_H":0.67,"fill":0.58,"mass_thirds":[0.274,0.436,0.289],"torso_depth_max":0.82,
 "torso_depth_min":0.31,"mass_contrast":2.7,"leg_fraction":0.186,"turn_count":18,
 "zigzag_alignment":0.43,"front":{"W_over_H":0.65,"fill":0.432},
 "top":{"W_over_H":0.87,"fill":0.668},"hero":{"W_over_H":0.68,"fill":0.542}}
```

`fill`／`W_over_H` 是 silhouette 報告 ② 用的同一支工具、同一個 `view='side'` 的 640px 全黑 mask，數字口徑一致（起點 0.784／0.97 與該報告 ③ 表逐字相同）。另外把同一張 mask 依 silhouette 報告 ②-2 的作法壓成 48×48 多數決方格（覆蓋率 >35% 為黑）核算：

```
起點：bbox W=500 H=514  W/H=0.973  fill=0.7843   48px 黑格 1784 / 2304
出貨：bbox W=331 H=494  W/H=0.670  fill=0.5798   48px 黑格  921 / 2304
```

### 四張截圖

```
$ node tools/anyCreature/harness/hero.mjs assets/creatures/eye.glb <out>
{"ok":true,"margin":8.1}                 → docs/experiments/2026-09-05-sil-eye-hero.png

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-05-sil-eye-stage-lit.png \
      "glb=eye.glb&light=1&fx=1&rim=zuli" idle 8839
{"out":"docs/experiments/2026-09-05-sil-eye-stage-lit.png","fps":59.88,"calls":16,
 "loadMs":195,"particles":44,"errors":[]}

judge 的 eye_beauty_front.png     → docs/experiments/2026-09-05-sil-eye-front.png
silmetrics 的 sil_side.png        → docs/experiments/2026-09-05-sil-eye-side-mask.png
```

`errors` 是空陣列（console 0 error）；`fps` 59.88 是無頭 chromium 的 vsync 上限，不是效能數字。

### 範圍（Q4）

```
$ git status --short
 M assets/creatures/eye.glb
 M assets/creatures/eye.json
?? docs/experiments/2026-09-05-sil-eye-front.png
?? docs/experiments/2026-09-05-sil-eye-hero.png
?? docs/experiments/2026-09-05-sil-eye-side-mask.png
?? docs/experiments/2026-09-05-sil-eye-stage-lit.png
```

`assets/creatures/eye.claims.json` 不在清單裡＝一個位元組未動。本報告與 `docs/experiments/2026-09-04-creature-gaps.md` 的 eye 那一列另計（報告與追蹤表本來就要更新）。

---

## ⑥ 新陷阱（已同步寫進 `eye.json` 的 `_traps`，編號 21–29）

1. **(21) `silmetrics` 的 `side` 會靜默換視角**：它是「沿較短水平軸看過去」。X 比 Z 長時頂層 `W_over_H`／`fill` 量的是模型正面；一旦把 X 縮到比 Z 短就翻面（本卷實測 X 0.809 vs Z 0.810 時 fill 從 0.637 變 0.467）。**量剪影前先確認 X > Z**。
2. **(22) 把粗根往內收會讓 fill 變高**：fill＝填滿面積÷bbox 面積，bbox 寬由最外面那一根決定，收根同時縮小分母（實測 0.612→0.637）。正解是**讓最寬的東西落在稀疏的帶**（上緣岩尖、下緣岩基），石體本體收窄。
3. **(23) 縮石體＝縮 `rock` 的正面 share**：眼組尺寸固定，石體一窄 `share_hierarchy` 從 59:32:9 掉到 27:58:16。必須同時做兩件事——眼組等比縮小、把上下的岩尖／岩基做成 **rock 材質**。
4. **(24) 剖面 in-out-in 的容忍度只有約 12%**：slab a 由 0.340 收腰到 0.286／0.272 都會 `anim_integrity` 翻面，收到 0.300 才綠（同 `_traps` (12) 那族）。
5. **(25) `fin.points` 只縮 x 不縮 y，細長 sliver 會翻面**（`crk_*` 實測），要縮就等比縮。
6. **(26) 縮短鏈長會讓「本來就吊在鏈外的掛件」從綠變 BLOCK**：`pupil` 掛 Br0、offset y −0.18 在 brow 體外，brow 一窄一短就變 0.036 clear（tolerance 隨模型尺寸縮小）。
7. **(27) 底部只有單邊觸地會被 `balance` BLOCK**：落地的幾根要調成同一個高度、且左右跨過 x=0。
8. **(28) ★★★ 同一組樹根幾何，讀法由「它旁邊還剩多少石面」決定**——本卷的核心發現，見 ①。
9. **(29) 眼下方的三角鋸齒帶在窄石體上一律被讀成「下顎獠牙」（6/6）**：特徵算命中，但它會把整體推向「怪獸的臉」（同 `_traps` (9) 的延伸）。

---

## ⑦ 交主對話裁定

1. **Q3 未達，三輪用盡**：出貨版樹根 0/2、特徵 3/5。凍結檔規定「第 3 輪未過交最佳版標『未達』」，本卷照辦（最佳版＝第 1 輪，唯一一輪主印象「眼」2/2 的版本）。
2. **要不要在 `eye` 上放棄 W/H ≤0.7**：本卷實測顯示，ward 體型上「側視 W/H ≤0.7」與「樹根讀得出來」互斥（`_traps` (28)）。可選：
   - **(甲)** 保留本卷剪影（W/H 0.67、fill 0.580），樹根與特徵 ③ 比照 shield ②④／redhat 不對稱**簽字為引擎限制**留後處理卷——**本卷建議甲**（剪影是批次閘門、跨 7 隻；樹根是單隻特徵，且後處理卷的描邊／木紋貼花正是它需要的手段）。
   - **(乙)** 回退到量產回修版（樹根 6/6、4/5），把 `eye` 列入 silhouette 報告 ⑧-2 提的「W/H 目標依體型分段」（ward 放寬到 ≤0.85 或豁免），代價是第 2 次剪影三秒測試祖靈系少一隻達標。
   - **(丙)** 兩版都留，等後處理卷做完描邊再重測——成本最高。
3. **主印象「眼」在窄體型上不穩定**：三輪分別是 2/2、1/2、0/2，差別只在上下的岩尖與鋸齒帶多寡。若採甲案，建議把「岩尖數量」列為後續硬化批的觀察項。
