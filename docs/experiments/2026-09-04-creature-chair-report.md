# 3D 妖怪量產批 11 回報 — `chair` 椅仔姑竹椅（陰氣 yinqi・haunt）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（含 09-05 各段：特徵命中＝≥1/2、Q4 可愛降記錄項、W/H 撤回記錄項、剪影閘門降監測）。
真實參照凍結：`docs/experiments/2026-09-04-ref-chair.md`（三張 Wikimedia 實拍照已親眼 Read，五條特徵寫下後一字未改）。
派工驗收條件 C1–C5 在動手前凍結，全程一格未動；`chair.claims.json` 在建模開始之前寫定，之後只改 `chair.json` 去遷就它，**門檻與案例集全程未動**。
**未 commit、未 push。**

---

## 結論先行

**五條 ref 特徵全數命中（5/5，達目標）**，C1–C5 全過，出貨。

| 驗收 | 結果 |
|---|---|
| **C1 機械** | **PASS**。judge `all claims pass`／cli `checks: all green`；GLB **677.5 KB**（≤1.5MB）、**4,204 tri**（≤8000）、全高 **1.2220**（1.20–1.25）；`build:"rigid"`＋三個 volume 全 `faceted:true`＋exp **4.8–5.4**（≥4.5）＋`smooth_angle` **26**（24–30）；`idle`／`move`／`attack` 三支齊備，attack＝簡報招式「看穿：椅背轉正」。ward 不適用（haunt）；側視 W/H **0.41**（記錄項）。 |
| **C2 盲讀** | **PASS（程序）**。兩輪四位 context-free `sonnet`（Agent tool、`model: sonnet`），每輪 2 位、只給 hero＋stage-lit 兩張，圖放在 `tools/anyCreature/out/qa1｜qa2/imgA.png｜imgB.png`（路徑與檔名不含 chair／椅／姑／竹），四題與 harden2A §② 問法甲**逐字相同**、不加任何提示。 |
| **C3 主印象** | **PASS**。椅 **2/2**（C「木製扶手轉椅」、D「木製**扶手椅**」）／靈妖活物 **2/2**（C「鬼魅系…被操控的傀儡」、D「被封印在一張老椅子上的傀儡或**亡魂**」）／陰氣氣質 **2/2**（兩位都寫「陰森／詭異／鬼魅」，無人讀成祖靈或香火）／可愛 **0/2**（記錄項）。 |
| **C4 特徵命中** | **5/5**（門檻 ≥3/5，目標 5/5）。①竹節環 2/2 ②格柵椅背 2/2 ③圓框徽 1/2 ④前伸扶手 2/2 ⑤方座面 2/2。 |
| **C5 出貨檔** | **PASS**。`assets/creatures/chair.{json,glb,claims.json}`；`git status` 只有本隻的三個出貨檔＋三張截圖＋ref 檔（下 §⑤）。 |

DEVLOG 一行：
`gates: C1 PASS(judge all claims pass；693,728B/4,204 tri/全高 1.2220/side W/H 0.41/rigid＋volume 全 faceted＋exp 4.8-5.4＋smooth_angle 26＋idle,move,attack), C2 PASS(2 輪 4 位 context-free sonnet；四題逐字相同、遮名、只給 hero＋stage-lit), C3 PASS(椅 2/2、亡魂鬼魅 2/2、陰森 2/2、可愛 0/2), C4 5/5(竹節 2/2・格柵 2/2・圓框徽 1/2・扶手 2/2・座面 2/2), C5 PASS | restarts: r3→r4(四顆節套心算錯位置全部浮空＋寬綠背板被讀成斗篷)、r4→r6(破布被讀成第四支腳、正十字花心＝電路符號)、r7→r8(扶手 0/2 被讀成手臂＋拳頭→補鵝脖；圓盤＋暗心 0/2 被讀成齒輪／卯釘→改圓框；等長交錯半徑做不出竹節→改長直段＋短鼓節)`

---

## ① C1 機械 — 逐條表

| 條 | 門檻 | 出貨值 | 判定 | 證據 |
|---|---|---|---|---|
| M-A0 編譯 | `checks:"all green"` | `{"ok":true,…,"bytes":693728,"verts":10139,"faces":2245,"joints":12,"anims":["idle","move","attack"],"checks":"all green"}` | PASS | ④ |
| M-A0 judge | `--spec` 全綠 | `[judge] Spec "椅仔姑竹椅 chair_yiziku (yinqi/haunt)" — all claims pass.` | PASS | ④ |
| GLB 大小 | ≤1.5 MB | **693,728 B ＝ 677.5 KB** | PASS | ④ |
| 三角形 | ≤8,000 | **4,204** | PASS | ④ |
| 全高 | 1.20–1.25 | **1.2220**（`whole.size` y） | PASS | ④ |
| `build` | `"rigid"` | `"rigid"` | PASS | `assets/creatures/chair.json:70` |
| volume `faceted` | 全部 `true` | back／seat／head 三個全 `true` | PASS | `chair.json` volumes 三段 |
| 斷面 `exp` | ≥4.5 | back 5.0/5.2/5.4/5.4/5.0、seat 5.0/5.2/5.2/5.0、head 4.8/5.0/5.0/4.8 | PASS | 同上 |
| `smooth_angle` | 24–30 | **26**（spec 層） | PASS | `chair.json:81` |
| 三 clip | idle／move／attack | 三支齊；attack＝「看穿：椅背轉正」（`Chest.ry −16°→0°`＋`SeatRoot.tz +0.17`前撲） | PASS | `chair.json` animations |
| ward bbox X≥Z | ward 才適用 | **不適用**（本隻是 haunt） | n/a | 凍結檔 POOL 第 21 列 |
| 側視 W/H | 記錄項（09-05 撤回為記錄） | **side 0.41**／front 0.38／top 0.81／hero 0.48 | 記錄 | ④ silmetrics |

**M-A2 haunt 下半身虛化**：三支腿全部走 `ghost_leg`（`/^ghost_/` 半透明分支），側視 share **23.15%**、正視 21.17%；三支腿尖高度刻意不同（spec 空間 y **−0.0056／+0.0223／+0.0072**，落差 0.028）。戲台上整張椅子浮在地面之上、腳尖與陰影之間留空——證據＝`docs/experiments/2026-09-04-creature-chair-stage-lit.png`。`leg_fraction` 0.351（本隻是六隻 haunt 裡唯一有腿的，這個值有意義，不像 hairpin 那樣是假值）。

**M-A3 發光材質**：GLB `materials` 逐字＝
`['splat','bamboo','pale','node','void','eye','bamboo_lit','glow_seat','ghost_leg']`
——設計簡報 chair 列指定的 **`eye`** 與 **`glow_seat`** 都原樣在清單裡，沒有多開第三個發光材質。`skins`=1、`images`=0（零貼圖）。

**其餘 claims 的實際數字對門檻**（judge，view 見括號）：
- `part_exists` splat／bamboo／eye／glow_seat／ghost_leg／pale — 六個材質名都在清單 ✅
- `part_signature` splat（side）：share **26.22%**（需 ≥6%）**且** span **0.6506**（需 ≥0.12）→ 兩路都過 ✅
- `part_visible` eye（front）：**0.391%**（需 ≥0.15%）✅
- `part_visible` glow_seat（tq）：**2.646%**（需 ≥0.15%）✅
- `focal_contrast` splat : pale（side）＝ 26.22 : 9.22 ＝ **2.84×**（需 ≥2）✅
- `share_hierarchy`（side）＝（splat＋bamboo）61.36 :（ghost_leg＋bamboo_lit）26.45 :（pale＋void＋eye＋glow_seat＋node）12.20 → 正規化 **61.4 : 26.4 : 12.2**（目標 60:30:10、容差 ±15pp）✅
- `style_dark`（side）：**51.5**/255（需 ≤90）✅
- `saturation_area`（tq）：**24.75%**（帶 10–60%）✅
- `tri_budget`：**4,204**（1500–8000）✅
- `rig_skinned`／`anim_named`：skins=1、三支動畫齊 ✅

---

## ② 盲讀原話全文（context-free `sonnet`，只給 hero＋stage-lit 兩張）

四題逐字（harden2A §② 問法甲，兩輪一字未改）：
> 1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？

### 第 1 輪（模型 r7）

**讀者 A**
> 1. 一隻擬人化的木質/骨骸傀儡型生物，**主體是一張長腳椅子**，椅背延伸出人形上半身（頭、雙臂），像是「**椅子成精**」或「**付喪神**」類型的道具怪。
> 2.（節錄）頭部：光滑無毛的橢圓形頭顱，米白/淺灰色，臉部下半是黑色面罩，僅露出兩顆發光的青綠色眼睛／軀幹背面：一片深綠色布/皮革斗篷狀披掛，覆蓋整個椅背／胸／脊椎位置：**木條與骨架交錯構成的肋狀結構**，中央有數個**十字形／齒輪狀深色小零件**鑲嵌其中／雙臂：從椅背兩側伸出，呈**木棍狀分節手臂**，末端是**圓鈍的木製「拳頭」或握把**／**座面：椅子坐墊**呈現半透明青綠色發光材質／椅腳：**四隻**細長腳，顏色偏灰綠，木質紋理感，形似動物或人的腿
> 3. **陰森、詭譎**，帶著一種被詛咒/附身器物的**不祥**靜謐感，介於工匠傀儡與**亡靈家具妖怪**之間，安靜但不友善。
> 4. 偏向**會威嚇你的**——那雙冷光雙眼、黑面罩與陰暗打光…而非玩具般的可愛。

**讀者 B**
> 1. 一具由木頭與骨架構件拼裝、**坐在椅子上**的人形傀儡／**木偶妖怪**，胸口鑲嵌著一塊發光的綠色水晶或核心。
> 2.（節錄）頭部：光滑無表情的灰白面具狀頭顱，臉上只有一黑色橫向凹槽，內嵌兩點發光的青綠色眼睛／軀幹中央：胸腔正面呈半透明青綠色核心，外圍以**交錯的木條、榫接構件與深色圓形卯釘**固定成骨架狀支撐／雙臂：**粗短的木棍狀手臂**，末端是無指細節、呈**鈍鎬狀的深色「手」**／下半身：…直接以坐姿固定在**一張木製高背椅**上，**椅面**中央也透出同一種青綠色光斑／椅腳：**四支**細長、略帶青灰色調的木/骨質椅腳
> 3. **陰森**、儀式感濃厚，帶著一種「被封印在座椅上的傀儡神像」式的靜默威壓，安靜卻**不祥**。
> 4. **會威嚇**——無表情的面具臉、空洞發光眼…而非可愛或玩具感。

→ 第 1 輪判定：椅 2/2 ✅、靈妖 2/2 ✅、陰森不祥 2/2 ✅、可愛 0/2；**特徵嚴格判 2/5**（②格柵、⑤座面），①竹節只讀到「分節」、③圓徽讀成「齒輪／卯釘」、④扶手讀成「手臂＋拳頭」。

### 第 2 輪（出貨版 r9）

**讀者 C**
> 1. 一隻類人骨架/木偶造型的生物，坐在一張**木製扶手轉椅（辦公椅）**上——是「角色＋家具」的組合模型…
> 2.（節錄）眼睛：兩顆發光的青綠色橢圓眼珠，鑲在臉部黑色凹陷區塊中／軀幹：由深綠色布料／斗篷狀物包裹，胸前掛著一套類似木製骨架或儀器的支架結構（有**直桿與橫桿交錯**）／前胸掛飾：**兩個深色橢圓形小物件**（像鎖或儀表），固定在胸前的木架上／**椅子扶手：木頭材質，扶手末端呈圓球狀把手**／椅背與**坐墊**：椅座下方露出綠色/青色的坐墊…／椅腳：四隻椅腳為藍灰色、**竹節狀分段**的圓柱造型，像骨頭或**竹竿**拼接
> 3. **陰森、詭異**、帶儀式性與孤寂感；…氣氛偏向陰暗奇幻、**鬼魅系**。
> 4. 明顯偏向「**會威嚇你**」的類型，不是玩具或可愛路線…

**讀者 D**
> 1. 一隻擬人化的木製機關骷髏／魁儡，正坐在**一張木製扶手椅**（辦公椅型）上…
> 2.（節錄）眼睛：臉部兩個發光的青綠色橢圓光點／背部／胸口：一個**木框十字支架結構**，繃著青綠色的布料或薄膜，中央嵌著類似織布機梭子或捲軸的零件／披風／布料：肩背垂下一片深綠色布幔，從肩部延伸到座椅椅面／下半身／腿部：座椅的四隻椅腳為青灰色木紋圓柱體，**帶環狀關節分節**，像骨骼腿／座椅：一張深棕色木製**扶手椅**，**扶手粗厚呈木節狀**，**座面為深棕色木板**
> 3. **詭異**、寂靜、帶儀式感的木偶氣質——像**被封印在一張老椅子上的傀儡或亡魂**…**陰森**神秘。
> 4. 不是玩具可愛路線，是會讓人略感**威嚇**／不安的類型…**鬼魅**般的壓迫感…

**風格牆指標**（凍結檔 17:30 修訂：正文順帶提到「圓潤／低多邊形＝可愛」只記錄不否決）：四位裡 **0 位**提及可愛。

---

## ③ C4 逐條對照 ref 五條特徵（凍結檔口徑：一條命中＝兩位中 ≥1 位主動說出）

| ref 特徵（`2026-09-04-ref-chair.md` §二） | 第 2 輪讀者 C | 第 2 輪讀者 D | 命中 |
|---|---|---|---|
| ① 竹節環（圓桿隔段一圈鼓起的深色環箍） | ✅「**竹節狀分段**的圓柱造型，像骨頭或**竹竿**拼接」 | ✅「帶**環狀關節分節**」＋「扶手粗厚呈**木節狀**」 | **2/2** |
| ② 細密直條格柵的椅背面板 | ✅「有**直桿與橫桿交錯**」 | ✅「一個**木框十字支架結構**」 | **2/2** |
| ③ 椅背中線的圓形徽紋 | ✅「**兩個深色橢圓形小物件**（像鎖或儀表）」 | ❌ 讀成「織布機梭子或捲軸的零件」 | **1/2** |
| ④ 向前斜伸的粗扶手管 | ✅「**椅子扶手**：木頭材質，扶手末端呈圓球狀把手」 | ✅「一張深棕色木製**扶手椅**，**扶手**粗厚呈木節狀」 | **2/2** |
| ⑤ 方形座面平板 | ✅「椅背與**坐墊**／**椅座**」 | ✅「**座面為深棕色木板**」 | **2/2** |
| **合計** | | | **5/5** |

第 1 輪→第 2 輪的動線：**2/5 → 5/5**，三條缺口的修法逐一列在 §⑥。

---

## ④ 指令原文與實際輸出

```
$ node tools/anyCreature/engine/cli.js assets/creatures/chair.json tools/anyCreature/out/chair/r9.glb
warn: part_overlap: 'curve@PostB' sits 47% inside 'curve@Waist' — check for interpenetration
{"ok":true,"out":"tools/anyCreature/out/chair/r9.glb","bytes":693728,"verts":10139,"faces":2245,
 "joints":12,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.402}}

$ node tools/anyCreature/harness/judge.mjs assets/creatures/chair.glb \
       tools/anyCreature/out/chair/judge_ship chair --spec assets/creatures/chair.claims.json
"stats":{"triangles":4204,"skinnedMeshes":10,"animations":["idle","move","attack"]}
"lum":{"front":60.9,"side":51.5,"tq":63.6,"reartq":55.8,"top":81.5}
"hi_sat_share":{"front":0.2854,"side":0.2787,"tq":0.2475,"reartq":0.4609,"top":0.3229}
"whole":{"size":[0.500,1.2220,0.468]}
splat  side=0.26224 span=0.6506   bamboo     side=0.35133   ghost_leg side=0.23148
pale   side=0.09217              bamboo_lit side=0.03299   glow_seat tq=0.02646
void   side=0.00430              node       side=0.00902   eye       front=0.00391
[judge] Spec "椅仔姑竹椅 chair_yiziku (yinqi/haunt)" — all claims pass.

$ node tools/anyCreature/harness/silmetrics.mjs tools/anyCreature/out/chair/r9.glb tools/anyCreature/out/chair/sil_r9
{"W_over_H":0.41,"fill":0.576,"mass_thirds":[0.309,0.428,0.263],"torso_depth_max":0.94,
 "torso_depth_min":0.49,"mass_contrast":1.93,"leg_fraction":0.351,"turn_count":16,
 "zigzag_alignment":0.69,"front":{"W_over_H":0.38,"fill":0.446},"top":{"W_over_H":0.81,"fill":0.706},
 "hero":{"W_over_H":0.48,"fill":0.472}}

$ node tools/anyCreature/harness/hero.mjs tools/anyCreature/out/chair/r9.glb tools/anyCreature/out/chair/hero_r9
{"ok":true,"margin":8.3}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-chair-stage-lit-raw.png \
      "glb=chair.glb&light=1&fx=1&rim=yinqi" idle 8851
{"out":"...","query":"glb=chair.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88023952095874,"calls":16,"loadMs":192,"particles":44,"errors":[]}

# GLB materials（讀 GLB 的 JSON chunk，一次性，跑完已刪）
materials ['splat','bamboo','pale','node','void','eye','bamboo_lit','glow_seat','ghost_leg']
anims ['idle','move','attack']   skins 1   images 0
```

- `errors` 是空陣列（`console.error`／`pageerror` 兩種來源都收）。
- `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。
- **三張截圖**：`-hero.png` ＝ `hero.mjs` 的 1024×1024 原圖，直接複製、未裁未調色；`-stage-lit.png` ＝ `creature-shoot.mjs` 原始輸出 1688×780 **只做一次純裁切**到 420×720（`crop(640,10,420,720)`），沒有縮放、沒有調色；`-front.png` ＝ `judge.mjs` 的 beauty 正視渲染（512×512，同一支 harness 的燈光），直接複製、未加工，**不是盲讀材料**（C2 只給 hero＋stage-lit），只作為識別視角存證。
- **誠實註記**：第 2 輪盲讀用的就是出貨版 r9；報告收尾時只往 `chair.json` 加了 `_traps` ⑧–⑭ 等 `_` 開頭註解欄位，重編後 `cmp` 證明 **GLB 位元組完全相同**（`GLB IDENTICAL`），幾何、頂點色、動畫一個位元組沒動。
- 未解的 `warn`：`part_overlap: 'curve@PostB' sits 47% inside 'curve@Waist'` ＝右側柱與扶手在肩台處交疊，這是設計上要的（兩根竹桿榫接在同一點），不是穿模。

---

## ⑤ C5 出貨檔與範圍檢查

```
$ git status --short
?? assets/creatures/chair.claims.json
?? assets/creatures/chair.glb
?? assets/creatures/chair.json
?? docs/experiments/2026-09-04-creature-chair-front.png
?? docs/experiments/2026-09-04-creature-chair-hero.png
?? docs/experiments/2026-09-04-creature-chair-stage-lit.png
?? docs/experiments/2026-09-04-ref-chair.md
$ git diff --stat
（空）
```
另加本報告與 `2026-09-04-creature-gaps.md` 的 chair 一列（不動其他列）。一次性產生器（`_tmp_r4/r4b/r5/r6/r8/r8b/scale/notes.py`）已刪除，`.json` 是唯一事實來源；`tools/anyCreature` junction 收尾時移除。**不 commit、不 push。**

---

## ⑥ 每輪改動

| 輪 | 改了什麼 | 為什麼 |
|---|---|---|
| r1 | 首版：椅背板（splat）＋座面（bamboo）＋垂頭（pale）三個 volume；六根格柵直桿、兩根橫棖、三枚圓徽、兩支側柱、兩支扶手、四顆節套、三支 ghost 腿、座面鬼火、臉洞與兩道眼縫 | 依 ref 五條特徵與簡報凍結剪影 |
| r1→r2 | `back` 的 `caps` 由 `['flat','ngon']` 改 `['flat','flat']` | bind pose 2 片翻面＋三支動畫全紅；逐項實測（下 §⑦-⑨）證明是**收尾端**的 ngon |
| r2→r3 | `splat` 由 `#33503f` 改 `#2b5f4a` | `saturation_area` tq 只有 2.9%（需 ≥10%）；把陰氣青做成椅背本身的顏色（S 0.547 ≥0.5），暗但高飽和（hairpin 的做法） |
| r3→r4 | ①椅背窄化（半寬 0.176→0.162、頂 0.224→0.196）、座面加寬（0.184→0.212）②格柵由六直桿縮成四直桿＋三橫棖、往上長到搭腦下緣 ③四顆節套用 `tip=host+normalize(dir)·Σlen` 重算位置 ④新增搭腦（頂橫木） | r3 的 hero：寬綠板被讀成斗篷、格柵擠在中段像琴架、四顆節套全部浮在空中（心算的 tip y 差 0.06–0.10） |
| r4→r5 | `colors.arcs` 由 216–342 改 0–42／68–112 | **發現 arcs 的角度是對折到 0–180 的 sym**，r1–r4 的三條帶整整四輪一格沒生效（§⑦-⑧） |
| r5→r6 | 破布縮到座沿下的小裙邊；圓徽花心的正「＋」改成斜且不等長 | r5 的破布自成一塊板；正十字＝規則對稱符號（ashcharm ⑯） |
| r6→r7 | 全檔等比 ×1.0436 | 全高 1.1690 → 1.2210 進帶 |
| **r7 → 盲讀第 1 輪** | — | 椅 2/2、靈妖 2/2、陰森 2/2、可愛 0/2；**特徵 2/5** |
| r7→r8 | ①拿掉扶手末端的深色節套，**新增兩支從扶手前端垂到座沿的鵝脖支柱** ②三枚小圓盤＋暗十字心 → **兩枚大小懸殊（1.55×）的圓框**，框內用椅背色做內盤（＝鏤空）＋框內排**平行**竹篾 ③所有竹桿改「長直段＋1/4 長、1.40× 半徑的短鼓節」 ④拿掉兩片 ghost_cloth | 針對第 1 輪三條缺口，一條一個修法（§⑦-⑪⑫⑬⑭） |
| r8→r9 | 全檔等比 ×0.9607 | 改分段等於改桿長，全高衝到 1.2720 → 壓回 1.2220 |
| **r9 → 盲讀第 2 輪＝出貨版** | — | 椅 2/2、亡魂鬼魅 2/2、陰森 2/2、可愛 0/2；**特徵 5/5** |

---

## ⑦ 本卷實測到的新陷阱（已同步寫進 `chair.json` 的 `_traps` ⑧–⑭）

**⑧ `colors.arcs` 的 `from`/`to` 是對折到 0–180 的 `sym`，不是 0–360 方位角** ← 最貴的一條，建議加進派工必附清單
`compile.js:220-222`：`aDeg = 360k/sides` → `fromTop = (450−aDeg)%360` → `sym = fromTop>180 ? 360−fromTop : fromTop`。後果兩條：
(a) **任何寫在 180 以上的帶永遠不會命中**——本檔 r1–r4 寫的 216–252／252–306／324–342 三條陰氣青帶整整四輪一格都沒生效，`cli` 不警告、`judge` 不報錯，唯一的間接徵兆是 `hi_sat_share` 偏低（r2 tq 只有 0.0287）。
(b) `sym` 左右對稱，**同一條帶必定同時落在 +X 與 −X 兩側**，做不出單側色帶。
直立鏈（profile `a`=Z、`b`=X）的座標對照：**`sym 0` ＝ ±X 側緣、`sym 90` ＝ ±Z 正面與背面**。

**⑨ 收尾端的 `caps` 在大斷面上也會翻面，不只起始端**（ashcharm ⑨ 只記了起始端）
本檔 `back` 頂環 0.094×0.224、`exp` 5.0、`sides` 20，逐項實測（每次只換 caps、其餘不動）：

| caps | 結果 |
|---|---|
| `["flat","ngon"]` | ✗ 2 flipped（bind pose 紅，三支動畫跟著全紅，16 條 BLOCK 源自這一個） |
| `["none","ngon"]` | ✗ 2 flipped |
| `["flat","fan"]`（＝`dome`） | ✗ 2 flipped |
| `["none","fan"]` | ✗ 2 flipped |
| `["flat","flat"]` | ✓ clean（本檔採用） |
| `["flat","none"]` | ✓ clean |
| `["none","none"]` | ✓ clean |

判準是**端面半徑**不是哪一端：同一份 spec 的 `seat`（頂環 0.168×0.032）與 `head`（0.046×0.048）配 `["flat","ngon"]` 全綠。

**⑩ 改了 `curve` 的 `segments` 就要重算掛在該桿末端的鬆散關節位置**
節套的關節是用 `tip = host + normalize(dir)·Σlen` 定的，一改分段長度 `Σlen` 就變，節套不是整顆埋進桿裡（`warn: part_overlap … 100% inside`）就是飛到空中。而**鬆散關節的 `part_attachment` 是被跳過的**（`compile.js:569` 算不出 `hostChain` → `checks.js:306` `continue`，ashcharm ⑪），所以**機器不會擋，只有渲染圖看得到**——本檔 r3 四顆節套全部浮空（y 差 0.06–0.10）而 `checks: all green`。

**⑪ 兩根從「肩」往前伸的粗管＝手臂，末端的深色圓套＝拳頭**（讀者實測）
第 1 輪兩位逐字：A「從椅背兩側伸出…末端是**圓鈍的木製拳頭或握把**」、B「**粗短的木棍狀手臂**，末端是…**鈍鎬狀的深色手**」。
修法**不是**把管改細或改色，是**補一根從管子前端垂到座沿的支柱（鵝脖）**——真椅子的扶手兩端都被結構咬住，補上之後那根管不再是懸空的肢體。同時拿掉末端的深色套（那就是拳頭）。第 2 輪兩位逐字改口「**椅子扶手**」「**扶手**粗厚呈木節狀」：**0/2 → 2/2**。

**⑫ 一列大小相同的小圓盤＋暗色十字心＝齒輪／卯釘／儀表**（讀者實測）
第 1 輪 A「十字形／**齒輪狀**深色小零件」、B「深色圓形**卯釘**」——這是 harden4A ①（中心暗＝齒輪）與 shanshen ⑥（等寬小件＝鉚釘）的合流。
修法三件同時做：(a) 三枚等大 → **兩枚大小懸殊（1.55×）** (b) 實心圓盤＋暗心 → **圓框＋框內用椅背本身的顏色做內盤**（視覺上是鏤空，不是圓牌）(c) 框內排**平行**竹篾（**平行不放射**——放射狀是太陽／齒輪的定義，harden4A ①）。第 2 輪 **1/2**（C「兩個深色橢圓形小物件」），仍未到 2/2，缺口登記在 gaps。

**⑬ 等長段＋交錯半徑做不出「竹節」，只讀得出「分節」**（讀者實測）
r7 之前用「等長段（0.06–0.10）＋半徑 0.024/0.038 交錯」，第 1 輪 A 只寫「木棍狀**分節**手臂」，四位無人說出竹或節環。
竹節的律動是**長直段（0.08–0.11）之間夾一段只有 1/4 長、半徑 1.40 倍的短鼓節**，節與節之間是等徑直管：
`segments: [{len 0.098,r 0.032},{len 0.025,r 0.045},{len 0.092,r 0.031},{len 0.024,r 0.043},…]`
第 2 輪兩位逐字「**竹節狀分段**…像**竹竿**拼接」「帶**環狀關節分節**」「扶手粗厚呈**木節狀**」：**0/2 → 2/2**。

**⑭ 與腿同色系的半透明布片掛在座沿前角，會被算成多出來的那支腳**
r5/r6 的兩片 `ghost_cloth`（`#79877c`）與三支 `ghost_leg`（`#6a857c`）色差太小、位置又在腿的正上方，第 1 輪兩位都寫「四隻椅腳」。拿掉之後第 2 輪**仍有兩位寫四隻**——**低多邊形下數量本身就不可靠**；要靠數量說故事（三腳椅）不能只靠腿的數目，得另給結構訊號。缺口登記在 gaps。

**（沿用並複驗成立的既有陷阱）**：ashcharm ⑧ profile 兩半徑是 (Z,X)（本檔直立鏈照此寫、一次到位）；harden4A ⑦ 等比縮放（做了兩次，`share`／角度比值全部不變、judge 不需回頭調任何門檻）；harden3B ⑥-② `around` 非線性（本檔全部用 `curve` 的 `offset+dir` 與不帶 `anchor` 的 `fin`，整個繞開）；redhat ⑦-C-1 corner bevel-skip（鏈的相鄰夾角壓在 4–12°）；bow ⑧-1 `L` 開頭關節（鬆散關節命名為 `CapA/CapB/PostA/PostB`，避開）；harden3C ⑧ bloom 燒白（`pale` lum 145 < 160，五官全用近黑 `void`）。

---

## ⑧ 殘留缺口（登記在 `2026-09-04-creature-gaps.md`）

1. **③ 圓框徽 1/2**（門檻 ≥1/2 已過、目標 2/2 未到）：D 讀成「織布機梭子或捲軸」。歸因＝hero 與 stage-lit 兩個機位都是 3/4，圓框在畫面上被壓成橢圓、又剛好落在四根格柵桿之間，圓形的封閉性被打斷。可試方向：把兩枚圓框往外移出格柵區、或把外框加粗一階讓圓形輪廓更連續（同 shield ⑯「招牌部位不能放在前景物件會站的地方」）。
2. **格柵與圓徽的語意歸屬**：兩位讀者都讀到了**幾何**（「直桿與橫桿交錯」「木框十字支架結構」），但語意歸給「胸前的木架／儀器／織布機框」而不是「椅背」——同樣是 3/4 機位下椅背與「胸口」重疊所致（ashcharm 第 3 輪的同型問題）。C4 依凍結檔口徑計為命中（讀者主動說出該特徵的形），此子項另記。
3. **三腳讀成四腳**：兩輪四位一致。

---

## ⑨ 附：本隻的造型決策與 ART_BIBLE 對照

- **剪影**（聖經 §0 鐵則 1）：招牌剪影＝簡報凍結的「方格竹椅背立在肩後，下面三支短腳」。側視（識別視角）＝椅背＋座面＋扶手＋鵝脖＋三腳，是四位讀者一致讀出「椅」的來源。
- **一色定調**（鐵則 2）：炭黑／暗竹褐為底（`bamboo` #6b5f4a S 0.31、`node` #2b2620 S 0.26），**陰氣青只落在椅背**（`splat` #1c4335 S 0.58 ＋ `sym 68–112` 的 `#4fd49a` 高飽和帶），發光只有 `eye` 與 `glow_seat` 兩處。`hi_sat_share` tq 24.75%。
- **陰氣文法**（聖經 §3）：不對稱七處（左扶手 **0.2894**／右 **0.1662**＝**1.74×**、側柱 **0.4838**／**0.3383**＝1.43×、三腳長度 0.4334／0.4071／0.4163 與腳尖高度 −0.006／0.022／0.007 全不同、頭往前並往一側歪、兩道眼縫大小與高度不同、四根格柵桿長度全不同且最右一根刻意做短＝斷竹、兩枚圓框徽大小差 1.55×）；空洞眼＋近黑臉洞＋抿嘴（`void`）；idle 用 hold＋突跳、attack 前有一拍完全靜止。
- **不可愛**（鐵則 5／使用者 09-04 裁定）：四位讀者 **0/4** 提及可愛，兩輪主印象全是「陰森／詭異／不祥／鬼魅／亡魂」。
