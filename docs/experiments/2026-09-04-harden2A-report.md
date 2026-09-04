# 硬化批 2A — `sword` 王爺劍與 `flag` 媽祖令旗補齊特徵缺項（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4 ＋末段全部修訂），**含本日 19:10 修訂**（`build:"rigid"` 本身無作用，硬邊靠每個 volume `faceted:true`；GLB 上限 600KB）與 **19:30 修訂**（改預算制：每隻 ≤1.5MB、三角形 ≤8,000、faceted 全開、零件數不限）。
美術權威：`docs/design/ART_BIBLE.md` §0.5／§1／§5。缺項來源：`docs/experiments/2026-09-04-creature-gaps.md` 的 `sword` 與 `flag` 兩列。
真實參照：`docs/experiments/2026-09-04-ref-sword.md`（`tools/anyCreature/out/ref/sword/01.jpg`、`02.jpg`）、`2026-09-04-ref-flag.md`（`ref/flag/lion1.jpg`、`lion2.jpg`、`flag1.jpg`）——本卷把 sword 兩張與 flag 的 `lion2.jpg` 用 Read **親眼看過**（`lion1`／`flag1` 沿用量產卷的判讀，本卷沒有重看，據實記在 ⑦-6）。
基準：worktree `agent-add79c02b9bbe0ffc`，起點 main `a6356f5`。**未 commit、未 push。**
出貨檔：`assets/creatures/{sword,flag}.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-harden2-{sword,flag}-{hero,stage-lit}.png`。

---

## ① 結論先行

| 項目 | sword | flag |
|---|---|---|
| **H-A0** judge 全綠 | ✅ `all claims pass`（**加嚴後的 12 條**） | ✅ `all claims pass`（**加嚴後的 14 條**） |
| **H-A0** GLB 大小 | 643,764 B ＝ **628.7 KB**（19:30 上限 1.5MB） | 413,900 B ＝ **404.2 KB** |
| **H-A0** 三角形 | 3,708（上限 8,000） | 2,872 |
| **H-A0** 三支動畫 | `idle`／`move`／`attack` ✅ | 同 ✅ |
| **H-A2** `leg_fraction` | **0.335** ≥ 0.30 ✅（回修版 0.194） | 不適用（ward 四足） |
| **H-A1** 盲讀特徵命中 | **4/5（讀者 F）／3/5（讀者 E）** — 未滿 5/5，缺 ref②「臉＋鬚」 | **6/6（讀者 F-F）／5/6（讀者 F-E）** — 缺項「垂片大耳」首度被讀出（1/2 位） |
| 主印象（凍結檔「可愛」閘門看第一句／主詞） | 兩位都不是「可愛」：F「威嚴／不祥」、E「更偏向威嚇／中二帥氣」 | 兩位都不是「可愛」：F-F「威嚴／不祥」、F-E「更靠近威嚇」 |
| **H-A3** diff 範圍 | ✅ 只含兩隻的 `assets/creatures/*`、本卷四張截圖、`creature-gaps.md` 自己那兩列、本報告 | 同 |

**沒有滿 5/5 的是 sword 的 ref②（深褐紅臉＋濃黑粗眉＋長垂黑鬚）。** 三輪跑滿（凍結檔上限）仍未讀出，缺項與歸因寫在 ⑦-1，缺項表也照實更新。

---

## ② 盲讀原話（context-free `sonnet` 子 agent，每輪 2 位，只給 hero＋stage-lit 兩張，檔名遮成 `imgS-A/B`、`imgF-A/B`，路徑不含 sword／flag／劍／獅／旗字樣）

問法兩種交錯（避免同一句話誘導同一種答案）：
- 問法甲：「1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？」
- 問法乙：「(a) 這是什麼？一句話 (b) 逐條列部位 (c) 氣質偏『威嚴／兇／不祥』還是『可愛／討喜』？ (d) 猜它的來歷」

### sword — 三輪六位

**第 1 輪**（模型狀態：比例已改弓箭步、護心鏡三層、綬帶掛正面兩側；**臉上的眼睛還是 anchored eye**）— **0/2 讀成正面**
- 讀者 A：「兩張都是同一模型的**背面視角**」「低多邊形風格的人形／類人怪物，穿著厚重的黑金紅色調盔甲」；氣質「披著重甲的魔物／鬼怪型戰士……**炎屬性鬼將**或魔物騎士」；(4)「比較偏向**威嚇型**」。護心鏡讀成「**下背部中央有一顆會發橘光的圓形物體**」、綬帶讀成「身體側邊／腰胯一片紅色扁平的大型刀刃或盾牌狀部件」。
- 讀者 B：「從**背後角度**拍攝……重甲武士／機械感生物」；氣質「沉重、機械化的裝甲武者……偏肅殺」；(4)「比較偏向會**威嚇**你的那種」。護心鏡讀成「**一個橘紅色發光的圓形核心／眼狀物，鑲在黃色框架裡**」。
  → **兩位都判成背面**。歸因：`type:"eye"` 帶 `anchor` 時引擎用 `around × ±1` 配對（見 ⑥-1），第二顆眼睛長到後腦，正面只剩一顆；臉又暗又小，讀者把紅頭殼＋黑鬚讀成「頭盔背面的 V 字缺口」。

**第 2 輪**（改：眼睛改 `host+face/spread/height` 一對、臉提亮 #8f3d30→#a84e38、綬帶收窄外移到手臂外側）— **1/2 過**
- 讀者 C（不過）：仍寫「**背面偏側的角度**」；「**頸部／領口：黑色蝴蝶結／領結狀的黑色片狀裝飾**」；(4)「**偏向中間偏可愛一點**……頭部很小、有領結這種裝飾性的可愛元素」。→ 主詞落在「可愛」，判不過。
- 讀者 D（過）：「穿著厚重機甲/鎧甲的怪獸角色，**肩上還揹著一顆小型的騎士頭像裝飾**」；「頸部／胸前：有一個**黑色蝴蝶結狀的裝飾**」；「胸口／腹部中央：**一顆橘紅色的球狀物鑲嵌在黃色框裡**」；(c)「整體氣質偏『**威嚴／不祥**』」。
  → 兩位都把黑鬚讀成**蝴蝶結**、都覺得頭太小。歸因寫在 ⑦-1。

**第 3 輪**（出貨版。改：護耳材質由鎏金改暗 #4a4238、頭放大 1.14×、黑鬚由「上寬下尖三角」改成長條垂鬚、側鬚收窄貼近中央、甲身鎏金帶放寬到 58–122）— **2/2 主印象過，特徵最好 4/5**
- 讀者 E（3/5）：「低多邊形風格的**人形／機甲怪物**」；特徵「頭頂：一圈黃色尖角，像**皇冠**或火焰狀的頭冠」「**一對發光的黃白色眼睛**」「肩膀：兩片**金黃色的肩甲**」「胸口：中央有一顆**橘紅色發光的圓球／核心，外圍包著鋸齒狀的金黃色爪形裝飾**」「腰側／髖部：**兩片暗紅色的扁平長條狀鰭片，垂在身體兩側**」；(4)「更偏向**威嚇／中二帥氣**一邊」。
- 讀者 F（4/5）：「介於『**披甲武士**』與魔物／機甲混種之間」；特徵「頭頂：一圈黃色尖刺狀的『**冠冕**』造型，像皇冠」「臉部／眼睛：發亮的黃白色圓形光點」「肩膀：**金黃色的護肩甲片**」「胸口：中央有一個**黃色圓形／橢圓形的凸起物，中間帶一點橘紅色核心**」「腰側／身體兩側：**垂掛著兩片暗紅色的長條狀甲片或布條……從腰部一路垂到膝蓋附近**」；(c)「氣質偏向『**威嚴／不祥**』一路」；(d)「這比較像是東亞（可能是**台灣妖怪／道教神將**）題材裡的『披甲武將型妖怪』……**紅黑金配色與甲片式披掛很像廟宇神將或武將盔甲**的簡化造型」。

**逐條對照 ref 五條特徵**

| ref 特徵 | 讀者 E | 讀者 F |
|---|---|---|
| ① 高聳鳳冠／頭盔 | ✅「一圈黃色尖角，像皇冠」 | ✅「黃色尖刺狀的冠冕，像皇冠」 |
| ② 深褐紅臉＋濃黑粗眉＋長垂黑鬚 | ❌ 讀成「暗紅色圓潤的**頭殼**，兩側各有一根黑色細長的**角**」 | ❌ 讀成「臉頰兩側有黑色**角狀／尖牙狀**的突起」 |
| ③ 立體護心鏡（圓、居中、鑲金邊、有眼） | ✅「橘紅色發光的圓球／核心，外圍包著鋸齒狀的金黃色爪形裝飾」 | ✅「黃色圓形／橢圓形的凸起物，中間帶一點橘紅色核心」 |
| ④ 長紅綬帶（垂墜、輪廓延伸） | ⚠️「兩片暗紅色的扁平長條狀鰭片，垂在身體兩側」——形狀與位置都對，但讀成「鰭片／裙擺」，本報告從嚴**不計命中** | ✅「暗紅色的長條狀甲片或**布條**……從腰部一路**垂到膝蓋**附近」 |
| ⑤ 鎏金層疊甲 | ✅「兩片金黃色的肩甲」＋金框 | ✅「金黃色的護肩甲片」「甲片式披掛」 |
| **命中** | **3/5** | **4/5** |

### flag — 三輪六位

**第 1 輪**（改：耳板放大 1.6×、外移外翹；顱側與眉側兩顆鬈鬃讓開；胸腹正面補硃紅漆帶）
- 讀者 F-C：「熊／**獅**混合的猛獸，背後長著一片火焰狀的鰭／盾牌構造」；命中 ①鬈鬃 ✅、③闊嘴獠牙＋眼 ✅、④胸前紅 ✅「前腳之間的胸口部位有一塊暗紅色、帶漸層的發光斑塊」、⑤蹲坐 ✅、⑥旗 ⚠️（讀成「大型三角形的紅色鰭狀構造」，沒說旗）；**② 耳 ❌**。

**第 2 輪**（改：耳材質提亮 #6e6a60→#8c877b、耳板改上翹、外緣圓角）
- 讀者 F-D：「四足獸型怪物，像熊或**獅子**的混合體……背上插著一片火焰造型的**旗**狀鰭」；①✅ ③✅ ④✅「胸口位置有一塊暗紅色的漸層光暈」 ⑤✅ ⑥✅「一片大型**三角旗**狀的背板……底部像插在一根深棕/黑色的柱子上」；**② 耳 ❌**（完全沒提）。

**第 3 輪**（出貨版。改：**耳板法線由「朝外朝下」轉成「朝前」**、耳提亮到 #9a9488、加一片 `ear_inner` #3f3a34 深色耳廓內襯做亮框暗窩、頰下鬈鬃再讓開）
- 讀者 F-E（5/6）：「四足獸型 3D 怪物模型，整體像是黑熊／類猿猴野獸」；①✅「頭頂與後腦有一圈鬃毛狀的凸起塊面」 ③✅「嘴巴大張，露出上下兩對白色尖牙，口腔內部是暗紅色」 ④✅「胸口到腹部有一塊暗紅色的毛皮區域」 ⑤✅「姿態呈蹲坐／半伏狀」 ⑥✅「一大片三角形的紅色鰭／旗狀物……底部有一條深棕色支柱把它撐起來，像背後插著一面燃燒的旗子」；**②❌ 耳讀成「左右肩各有一塊淺灰色、六邊形／盾牌狀的骨甲或肩甲裝飾」**；(4)「更靠近**威嚇**」。
- 讀者 F-F（**6/6**）：「獸型怪物，像是黑熊或大猩猩體型的野獸，背上插著一面**燃燒的旗幟**」；①✅「一圈突起的鬃毛狀尖角，環繞頭部像**獅鬃**」 **②✅「耳朵：兩側耳朵是灰白色的盾牌狀／六角形板片，像護耳裝甲而非一般獸耳」** ③✅ ④✅「胸前：胸口有一塊深紅色的斑塊，從下巴延伸到胸腹」 ⑤✅「體態厚實蹲坐」 ⑥✅「背後插著一根深色旗桿，撐起一面暗紅色三角旗，旗子邊緣鑲著橘黃色鋸齒狀火焰／尖刺裝飾」；(c)「偏『**威嚴／不祥**』」；(d)「東亞（可能是**台灣廟會／道教**或武將文化）背景遊戲裡的『妖怪／戰獸』……**像廟會陣頭或戰旗一樣的旗幟**」。

**耳朵的實際變化**：量產版 `ear_plate` 正面 share **0.005**（flag 報告 ⑦-2 記錄）→ 出貨版 `ear` 正面 share **0.0391**（judge，7.8×），另加 `ear_inner` 0.0181。六位讀者裡首度有一位明確寫出「耳朵」。**沒有做到 2/2**，據實記在 ⑦-2。

**風格牆指標**（凍結檔 17:30 修訂：正文順帶提到「圓潤／低多邊形＝可愛」只記錄不否決）：sword 六位裡 5 位提及、flag 六位裡 4 位提及。

---

## ③ 指令原文與實際輸出

`<AC>` = `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`（`.gitignore` 內，worktree 沒有這個目錄，用 `New-Item -ItemType Junction` 借主樹，全程沒進過 diff，收尾已移除）；`<WT>` = 本 worktree 根目錄。

### 編譯（出貨版）

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/sword.json out/h2a/s18.glb
{"ok":true,"out":"out/h2a/s18.glb","bytes":643764,"verts":8938,"faces":2100,
 "joints":37,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.52}}

$ node <AC>/engine/cli.js <WT>/assets/creatures/flag.json out/h2a/f5.glb
{"ok":true,"out":"out/h2a/f5.glb","bytes":413900,"verts":5499,"faces":1635,
 "joints":24,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.56}}
```
**零 `BLOCK`。** 兩隻都還有 `warn: part_overlap`（見 ⑦-4）。

### judge（對加嚴後的 claims）

```
$ node <AC>/harness/judge.mjs out/h2a/s18.glb out/h2a/judge_final_s sword --spec <WT>/assets/creatures/sword.claims.json
stats  {"triangles":3708,"skinnedMeshes":19,"animations":["idle","move","attack"]}
names  [armor_body, armor_skirt, skin_head, crown_gold, blade, hilt, armor_arm, armor_leg, eye,
        beard, helm_gold, sash, gold_trim, glow_mirror, pauldron, glow_blade, hand, greave, boot]
hi_sat {"front":0.4728,"side":0.3337,"tq":0.5305,"reartq":0.3457,"top":0.6221}
whole  [0.4595, 1.3290, 0.5309]
  blade       side 9.520  span 0.5530      skin_head  side 4.129
  sash        front 16.328                 glow_mirror front 3.118
  armor_body  side 12.669  armor_skirt side 7.706   glow_blade side 2.030
[judge] Spec "王爺劍 wangye_zhanwen_sword (xianghuo/elite)" — all claims pass.

$ node <AC>/harness/judge.mjs out/h2a/f5.glb out/h2a/judge_final_f flag --spec <WT>/assets/creatures/flag.claims.json
stats  {"triangles":2872,"skinnedMeshes":19,"animations":["idle","move","attack"]}
names  [stone_body, stone_head, stone_jaw, tail_stone, stone_leg, mane_curl, ear, ear_inner,
        nose_stone, eye, maw, fang, sash, sash_knot, pole_wood, gold_trim, flag_cloth, glow_flag, paw_stone]
lum    {"front":40.9,...}   hi_sat {"front":0.2397,"tq":0.2003,...}
whole  [0.960, 1.105, 0.677]
  flag_cloth front 6.114 span 0.5034       stone_head front 10.646
  mane_curl  side 13.661                   ear front 3.912  ear_inner front 1.813
  stone_body front 12.880 : glow_flag front 3.236
[judge] Spec "媽祖令旗 flag_mazu_lingqi (xianghuo/ward)" — all claims pass.
```

逐條核對（只列有門檻的）：
- sword `tri_budget` 3,708 ∈ [1500,5000] ✅／`saturation_area`(tq) **53.05%** ∈ [10%,60%] ✅／`part_signature` blade 側視 span **0.5530** ≥ 0.12 ✅（share 9.52% 也 ≥6%）／`focal_contrast` blade 9.520 ÷ skin_head 4.129 = **2.31×** ≥ 2 ✅／`share_hierarchy` 甲身＋戰裙 20.375 : 劍＋劍脊 11.550 : 臉 4.129 ✅／`part_exists` blade／eye／glow_blade／**glow_mirror** ✅／`part_visible` **sash front 16.33% ≥ 5%** ✅／`rig_skinned`＋`anim_named` ✅。
- flag `tri_budget` 2,872 ✅／`saturation_area`(tq) 20.03% ✅／`part_signature` flag_cloth front span **0.5034** ≥ 0.15 ✅（**share 6.11% 這一路掉到門檻 7% 以下**，量產版是 7.08%——被新做的耳板擋掉一點，靠 span 那一路過，據實記在 ⑦-5）／`part_visible` stone_head front 10.65% ≥ 4% ✅、mane_curl side 13.66% ≥ 2% ✅、**ear front 3.91% ≥ 2%** ✅／`focal_contrast` 12.880 ÷ 3.236 = **3.98×** ≥ 3 ✅／`share_hierarchy` front 偏離在容差內 ✅／`style_dark` front 40.9 ≤ 90 ✅。
- **ward 硬條件（M-A2）**：正面寬 **0.960** ≥ 側面寬 **0.677** ＝ **1.42×**，與量產版逐字相同（本卷沒有動主體積）。

### silmetrics

```
$ node <AC>/harness/silmetrics.mjs out/h2a/s18.glb out/h2a/sil_final_s
{"W_over_H":0.4,"fill":0.496,"mass_thirds":[0.411,0.422,0.167],"torso_depth_max":0.92,
 "torso_depth_min":0.05,"mass_contrast":18.64,"leg_fraction":0.335,"turn_count":19,
 "zigzag_alignment":0.42,"front":{"W_over_H":0.36},"top":{"W_over_H":0.82},"hero":{"W_over_H":0.34}}

$ node <AC>/harness/silmetrics.mjs out/h2a/f5.glb out/h2a/sil_final_f
{"W_over_H":0.88,"fill":0.537,"mass_thirds":[0.414,0.501,0.085],"leg_fraction":0.077,
 "turn_count":33,"zigzag_alignment":0.83,"front":{"W_over_H":0.61},...}
```
**H-A2：sword `leg_fraction` = 0.335 ≥ 0.30 ✅**（回修版 0.194，同一支工具、同一組參數）。

### 截圖

```
$ node <AC>/harness/hero.mjs out/h2a/s18.glb out/h2a/hero_s18   → {"ok":true,"margin":8.3}
$ node <AC>/harness/hero.mjs out/h2a/f5.glb  out/h2a/hero_f5    → {"ok":true,"margin":8.4}

$ node tests/tools/creature-shoot.mjs <AC>/out/h2a/stage_s18.png "glb=sword.glb&light=1&fx=1&rim=xianghu" idle 8817
{"out":"...stage_s18.png","query":"glb=sword.glb&light=1&fx=1&rim=xianghu","phase":"idle",
 "fps":59.88023952095874,"calls":27,"loadMs":189,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs <AC>/out/h2a/stage_f5.png "glb=flag.glb&light=1&fx=1&rim=xianghu" idle 8817
{"out":"...stage_f5.png","query":"glb=flag.glb&light=1&fx=1&rim=xianghu","phase":"idle",
 "fps":59.88023952095874,"calls":27,"loadMs":227,"particles":44,"errors":[]}
```
- 兩次 `errors` 都是空陣列（`console.error` 與 `pageerror` 兩種來源都收）。
- stage-lit 是 `creature-shoot.mjs` 原始輸出 1688×780 **只做一次純裁切**（sword 480×780、flag 520×780，裁掉兩側空地），沒有縮放、沒有調色。
- `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。

---

## ④ 改了哪些檔（檔案:行號）

```
$ git add -N . && git diff --stat
 assets/creatures/flag.claims.json                  |   10 +-
 assets/creatures/flag.glb                          |  Bin 406200 -> 413900 bytes
 assets/creatures/flag.json                         |   38 +-
 assets/creatures/sword.claims.json                 |   16 +-
 assets/creatures/sword.glb                         |  Bin 335996 -> 643764 bytes
 assets/creatures/sword.json                        | 1022 ++++++++++++--------
 docs/experiments/2026-09-04-creature-gaps.md       |    4 +-
 docs/experiments/2026-09-04-harden2-flag-hero.png  |  Bin 0 -> 279459 bytes
 docs/experiments/2026-09-04-harden2-flag-stage-lit.png  | Bin 0 -> 91776 bytes
 docs/experiments/2026-09-04-harden2-sword-hero.png |  Bin 0 -> 201999 bytes
 docs/experiments/2026-09-04-harden2-sword-stage-lit.png | Bin 0 -> 84127 bytes
```
（上表是寫本報告之前跑的，本報告本身是第 12 個新檔。）

| 檔案 | 內容 |
|---|---|
| `assets/creatures/sword.json` | 骨架加一條 **`RLeg` 鏈**（`mirror` 只剩 `LArm`）＝左前右後弓箭步；`Hips` 抬高、大腿／小腿拉長、戰裙縮短；八個 volume 全加 `faceted:true`；`parts` 重寫護心鏡（`hilt` 暗襯盤→`gold_trim` 金框→`glow_mirror` 鏡面→`crown_gold` 龍吻＋一對 `eye` 龍眼＋一對 `crown_gold` 龍角）、兩片 `sash` 綬帶改 host+offset 掛正面兩側、四片 `greave` 脛甲、臉上的 `eye` 改 `host+face/spread/height`；`palette` 新增 `glow_mirror`／`greave`、四肢與戰裙改中性暖灰、臉提亮、護耳改暗；**全檔等比 ×0.86**（見 ⑥-3）。JSON 因為做過整檔等比縮放而被重新序列化，格式與回修版不同，內容逐鍵可比。 |
| `assets/creatures/sword.claims.json` | **只新增兩條**（`part_exists glow_mirror`、`part_visible sash front ≥5%`），既有十條零改動——機械核對見 ⑤。 |
| `assets/creatures/sword.glb` | 643,764 bytes，引擎輸出 |
| `assets/creatures/flag.json` | 耳板：材質 `ear_plate`→`ear`、放大、**法線轉朝前**、加 `ear_inner` 深色耳廓內襯；顱側／眉側／頰下三顆 `mane_curl` 讓開耳位；body 的 `colors.arcs` 157–180 改硃紅漆帶 `#c9432f`；`palette` 加 `ear_inner`、`ear` 提亮。主體積、骨架、動畫、旗、鬈鬃數量都沒動。 |
| `assets/creatures/flag.claims.json` | **只新增一條**（`part_visible ear front ≥2%`）＋材質改名註記，既有十三條零改動。 |
| `assets/creatures/flag.glb` | 413,900 bytes |
| `docs/experiments/2026-09-04-harden2-{sword,flag}-{hero,stage-lit}.png` | 四張出貨截圖 |
| `docs/experiments/2026-09-04-creature-gaps.md` | 只改 `sword` 與 `flag` **自己那兩列**的命中數／缺項／處置／狀態欄 |

**H-A3 ✅**：`index.html`、`js/*`、`tests/tools/*`、其他生物的 `assets/creatures/*`、`docs/design/ART_BIBLE.md`、凍結檔、`docs/experiments/` 的其他既有檔案**一個位元組都沒動**。臨時檔與 `tools/anyCreature` junction 已移除。未 commit、未 push。

---

## ⑤ 驗收條件沒有被移動（`02 §2.1`）

**claims 只增不減、逐條機械核對**（把兩份 claims 去掉 `label` 之後逐條比對）：

```
$ node -e "...比對 git HEAD 版與出貨版的 claims 陣列..."
sword | 舊 10 條 → 新 12 條 | 舊條目消失或被改動: []
      | 新增: part_exists glow_mirror ; part_visible sash(front,0.05)
flag  | 舊 13 條 → 新 14 條 | 舊條目消失或被改動: []
      | 新增: part_visible ear(front,0.02)
```
**`舊條目消失或被改動` 兩隻都是空陣列**——門檻、視角、群組、min/max 一格未動。

**新增條件的雙向鑑別力**（`02 §6.1` 第 1 條）：把新 claims 拿去跑**硬化前**的 GLB（`git show HEAD:assets/creatures/*.glb`／用 HEAD 的 spec 重編），三條全部變紅；跑出貨版全綠。

```
$ node <AC>/harness/judge.mjs out/h2a/old.glb ... sword --spec <出貨版 sword.claims.json>
✗ Part "glow_mirror" not measurable: no material by that name in the model
✗ Part "sash" is nearly invisible in the front view (share 1.82% < 5.00%)

$ node <AC>/harness/judge.mjs out/h2a/flag_old.glb ... flag --spec <出貨版 flag.claims.json>
✗ Part "ear" not measurable: no material by that name in the model
```
- `sash` 那條是**行為斷言**：舊版 1.82% → 新版 16.33%，紅的原因就是「綬帶在正面看不到」這件待驗行為本身。
- `glow_mirror`／`ear` 兩條紅在「材質名不存在」——`ear` 這一條有改名成分，**它不是純行為斷言**。真正的行為證據是同一支 judge 量的 share：舊版 `ear_plate` 正面 **0.5%**（量產卷報告 ⑦-2 的紀錄）→ 出貨版 `ear` 正面 **3.91%**，我在報告裡以這組數字為準，不拿改名當戰功。

**H-A2 的 `leg_fraction`**：0.194（HEAD 的 spec 重編、同一支 silmetrics）→ 0.335（出貨版）。這條門檻是派工當下訂的 ≥0.30，全程沒動過。

---

## ⑥ 這兩隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現四條）

1. **★★ `type:"eye"` 帶 `anchor` 時，引擎是用 `around × ±1` 配對，在直立鏈上等於「前後」鏡射，不是左右。**
   `compile.js:283` 的 `buildEye` 對 `sx ∈ {1,-1}` 走 `surfacePoint({...anchor, around: anchor.around * sx})`。sword 的直立頭鏈框架是 0°=−x／90°=−z（背）／180°=+x／270°=+z（正面），要左右對稱應該是 `180 − θ`；引擎給的是 `−θ`。所以 `around: 238`（正面偏右）的配對是 **122（後腦偏右）**——正面只看得到一顆眼睛，另一顆長在後腦。**第 1 輪兩位盲讀者都把整顆頭判成「頭盔的背面」，這是主因之一。**
   對策：**直立鏈上的眼睛一律不要用 `anchor`**，改用 flag 報告 ⑥-4 推薦的 `host` ＋ `face`／`spread`／`height`（`compile.js:290` 的 else 分支，在宿主關節的局部座標直接下座標，`forward` 預設 +Z）。代價是眼睛不再自動貼合表面，`face` 要自己推到體表外（本檔 head 半深 0.053、`face` 給到 0.078 才露得出來，中間試過 0.046／0.082 兩檔都還埋在眉板底下）。
2. **★ 側視剪影裡兩腳重疊時 `silmetrics` 的 `leg_fraction` 會回 `null`，不是 0。**
   `silmetrics.mjs:174-186` 的做法是「先找出 run 底部落在畫面最下 6% 的欄（＝腳），再取相鄰腳欄之間**最大的空隙**，空隙 >3px 才在空隙中點量腹底到地面」。對稱站姿的人形在側視只有**一團**腳，空隙永遠是 1，指標直接 null。**這條指標是為四足獸寫的**，人形要量得到就必須讓兩腳在側視分開——本檔的解法是拆掉腿的 `mirror`、另寫一條 `RLeg` 做成左前右後的弓箭步（順帶滿足凍結檔「禁玩偶式對稱站姿」）。**下一隻人形若也要量 `leg_fraction`，不做前後錯步就不要把它寫進驗收條件。**
   附帶：`limb_clearance` 只掃 `spec.mirror` 裡的鏈，腿一旦拆出 mirror 這條檢查就不再守腿了，貼合要自己顧。
3. **★ 模型長高之後戲台鏡頭會切頭，`creature-preview.html` 的相機是寫死的。**
   `tests/tools/creature-preview.html:100-103` 單隻時 `camDist 2.35`、`camTilt 17°`、`lookAt(0,0.52,0)`，模型放在 `TABLE_TOP 0.15`。本檔把腿拉長之後全高 1.545，crown 與劍尖直接出框。凍結檔不准改 `tests/tools/*`，所以**只能把模型等比縮小**——本檔全檔 ×0.86 到全高 1.329 才進得了鏡頭（沿用神像虎報告「坐姿要 ×0.8」的同一條）。**經驗值：站姿人形全高做到 1.30–1.35 是這組鏡頭的上限。** 等比縮放要動的欄位：`joints` 的 up/fwd/side/ground、`profile` 的兩個半徑、`ring_step`、`parts` 的 offset/size/thickness/points/segments 的 len 與 r、`shading.noise.size`、動畫的 `tx/ty/tz`；**`dir`／`udir`／`vdir`／`t`／`around`／`exp`／旋轉軌道不能碰**。
4. **★ 平板部位讀不讀得出來，看的是「法線朝哪」不是「面積多大」。**
   flag 的耳板連改三輪：放大 1.6 倍（正面 share 0.5%→3.3%）、提亮、上翹——六位讀者裡前四位還是把它併進「一圈尖刺狀的鬃毛」。真正讓一位讀者寫出「兩側耳朵」的，是第 3 輪把 `udir`／`vdir` 換成幾乎純 +X／+Y、**讓板子的法線從「朝外朝下」轉成「朝前」**，再貼一片小 0.64 倍的深色 `ear_inner` 做出「亮框＋暗窩」。**低多邊形沒有輪廓線，一片單色薄板側面看是一條線、正面看是一塊色斑，兩種都不會被讀成器官；要讓它變成器官，得同時給它 (a) 面朝識別視角的法線 (b) 兩層明度對比。** 這條也適用於 sword 的護心鏡：三層（暗襯盤／亮金框／發光鏡面）之後，六位裡四位都主動描述「圓形、鑲在金框裡、會發光」。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **★ sword 的 ref 特徵②（深褐紅臉＋濃黑粗眉＋長垂黑鬚）三輪跑滿仍未被讀出，H-A1 的 5/5 沒達成（最好 4/5）。**
   三輪各做了什麼、各得到什麼：①第 1 輪 anchored eye 把第二顆眼睛丟到後腦 → 兩位都判「背面」；②第 2 輪改成一對正面眼＋臉提亮 → 不再有人說「頭盔背面」，但兩位都把中央黑鬚讀成「**黑色蝴蝶結／領結**」，一位因此把主印象寫成「偏可愛」；③第 3 輪把鬚從「上寬下尖的三角」改成長條、側鬚收窄貼近中央、護耳由鎏金改暗、頭放大 1.14× → 蝴蝶結消失、兩位主印象都變成威嚴／威嚇，但**臉仍被讀成「頭殼／頭盔」、黑眉被讀成「角」或「尖牙」，沒有人讀出鬍鬚**。
   **我的歸因**：在 hero 的 1024px 3/4 視角下整顆頭只有約 60px 高，臉的五官要靠三塊色斑（黑眉、兩顆金眼、黑鬚）在其中撐起來；低多邊形沒有輪廓線也沒有貼圖，色斑一旦小於約 10px 就只剩「明暗塊」而不是「器官」。頭再放大會撞回第 1 輪的「Q 版大頭」（而且已經有一位第 3 輪讀者順帶寫「頭身比偏大頭」）。**要再往下走，動的是渲染或鏡頭，不是這一隻的造型**——具體兩條路請主對話裁定：(甲) 全批加描邊（outline pass），讓小色塊有邊界；(乙) 盲讀改給一張正視特寫（等於改凍結檔的截圖規格）。本卷兩條都沒做。
2. **flag 的耳朵只被 1/2 位讀出來**（另一位讀成「肩上的盾狀骨甲」）。機器面已經守住（正面 share 0.5%→3.91%，claims 新增條款釘死），但**「兩位都讀出」沒有達成**。可再試的方向：把耳廓內襯做得更深、或把耳朵移到鬃圈之外的顱前側；本卷第 3 輪已是上限，沒有再改。
3. **flag 的 `flag_cloth` 正面 share 從 7.08% 掉到 6.11%**，低於 `part_signature` 的 `min_share 0.07`，靠 `or_min_span 0.5034 ≥ 0.15` 那一路過關（該條是 OR）。原因是新做的耳板在正面擋掉一點旗面。**這是量產版原本兩路都過、現在只過一路**，據實記錄；要兩路都過就得把旗再放大或把耳往後移，會反過來壓耳朵的可讀性，本卷選了耳朵。
4. **兩隻都還有 `part_overlap` 的 warn 沒清乾淨。** sword 主要來自綬帶／甲指／護心鏡各部件的包圍盒互框（引擎是用包圍盒判 % 的）；flag 主要來自旗面 fin 的大包圍盒。我逐張看 hero／front／side 渲染圖核對過沒有實際穿模，但這是**肉眼證據不是機器證據**。
5. **sword 的 ART_BIBLE §1「側視 W/H ≥ 0.9」仍未達成（0.40）**，flag 的側視 W/H 0.61 也一樣未達（與量產版相同）。這兩條是聖經的記錄項不是單隻閘門（凍結檔明文），但要講明；sword 這一輪反而更低（回修版 0.44），因為腿拉長讓全高變大而側視寬度沒變。
6. **參照圖只重看了三張。** ART_BIBLE §0.5 要求親眼看圖，本卷 Read 了 `ref/sword/01.jpg`、`02.jpg`、`ref/flag/lion2.jpg`；`ref/flag/lion1.jpg` 與 `flag1.jpg` 沿用量產卷 `2026-09-04-ref-flag.md` 的文字判讀，**沒有重看**。
7. **硬化後的兩隻沒有跑 ART_BIBLE §6 的剪影三秒測試**（那是每兩批一次的批次閘門，要多隻拼圖），也**沒有量效能、沒有接進正式對決**。`creature-shoot` 回報的 `fps 59.88` 是 vsync 上限。
8. **flag 的 `sash_knot`（胸前綵球）五個視角 share 仍然全是 0**（量產卷 ⑦-3 的老問題），本卷沒動它——ref 特徵④改由新補的硃紅漆帶承擔，四位讀者都讀到「胸前一塊深紅」。綵球本身等於仍然不存在，缺項照舊。
9. **sword 的 `saturation_area`(tq) 53.05%，上限 60%，餘裕 7pp。** 這一輪為了塞進兩條大綬帶，已經把四肢／戰裙／護手／暗帶全部改成中性灰。**下一個人要在這隻身上加任何高飽和色塊，都得同時把別處中性化**，否則直接爆。

---

## ⑧ DEVLOG 一行

`harden2A: sword H-A0 全綠(628.7KB/3708tri/三動畫)、H-A2 leg_fraction 0.194→0.335、H-A1 盲讀 3 輪六位最好 4/5（①冠③護心鏡④綬帶⑤金甲讀到，②臉＋鬚三輪都沒讀出→歸因低多邊形小臉，建議描邊或改鏡頭，待裁）；flag H-A0 全綠(404.2KB/2872tri)、耳正面 share 0.5%→3.91%＋ear_inner 亮框暗窩、胸前補硃紅漆帶，H-A1 六位最好 6/6（耳首度被讀出，另一位讀成肩甲）| claims 只增不減經機械核對、三條新增條件對硬化前 GLB 全紅 | 新引擎事實四條：anchored eye 是前後鏡射／leg_fraction 對稱站姿回 null／戲台鏡頭上限全高約 1.33 要等比縮／平板部位靠法線朝向＋兩層明度才讀得出器官 | unresolved: sword 臉未讀出、flag 耳 1/2、flag_cloth front share 6.11% 只過 span 那一路、part_overlap warn、側視 W/H 未達聖經目標`
