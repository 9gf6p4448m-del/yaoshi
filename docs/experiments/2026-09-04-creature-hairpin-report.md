# `hairpin` 林投姐髮簪（陰氣／haunt）— 3D 量產卷批 5 報告（2026-09-04）

基準 SHA `da8b050`（worktree `agent-a5ca1c98233439286`）。凍結檔 `docs/experiments/2026-09-04-acceptance-creature-batch.md`＋`docs/design/ART_BIBLE.md`。**未 commit、未 push。**
出貨版＝第 12 輪編譯（`ship.glb`，與 `r12.glb` 逐位元組相同，見 ④）。

---

## ① M-A0～M-A4 一覽

| 閘門 | 結果 | 數字 |
|---|---|---|
| **M-A0** GLB ≤1.5MB／三支動畫／judge 全綠／silmetrics 側視＋hero | **PASS** | 829,708 B ＝ **810.3 KB**；`idle/move/attack`；`[judge] all claims pass`；silmetrics 側視 `W_over_H 0.60 / fill 0.373 / turn_count 30`、hero `W_over_H 0.37 / fill 0.633`、`hero.mjs margin 8.5` |
| **M-A1** 盲讀 context-free ×2（hero＋stage-lit），最多 3 輪 | **PASS @ 第 3 輪 2/2** | 六位讀者 6/6 讀成幽靈／女鬼／亡靈；第 3 輪兩位主印象「幽靈或女巫型角色」「飄浮於地面之上的骷髏面孔幽靈／亡靈巫師」；氣質 6/6 含陰森／詭譎／不祥；**主印象出現「可愛」＝0/6** |
| **M-A2** haunt 必附下半身虛化截圖 | **PASS** | `2026-09-04-creature-hairpin-ghost.png`（透得過髮綹看到地面＋本體與投影分離）；離地間隙 **0.134**＝全高 1.054 的 **12.7%**；`leg_fraction 0.478` 是假值（同 nail ⑦，及地的髮綹被當腿量，不是任何一條 claim） |
| **M-A3** 發光材質名存在於 GLB materials | **PASS** | materials＝`robe, ghost_hair, hair, skin_face, sleeve, eye, mouth, hand, pin, glow_pin, ghost_wisp` → 簡報指定的 **`eye`**、**`glow_pin`** 原樣在列 |
| **M-A4** diff 只含自己的檔 | **PASS** | `git diff --stat HEAD` 為空；`git status --short` 只有 7 個 `??` 新檔（見 ⑦） |

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給 hero 與 stage-lit 兩張，路徑遮成 `out/blind/q<N>-imgA/B.png`，不含 hairpin／hair／ghost／林投 字樣；兩位讀者的圖片順序對調）

### 第 1 輪（r9）

**讀者 A**：「一個披著破碎黑袍、拿著武器的瘦削人形怪物／**幽靈**角色模型。」特徵列出：灰白色頭、發光白／淡青眼無瞳孔、「頭頂與後腦垂下大片黑色破爛**髮絲**／布條」、黑灰斗篷、「腰部以下是黑色與墨綠色交錯的長條尖刺狀裙擺」、「右手持一把細長扁平的灰白色武器（類似**刀刃或匕首**），刀柄處有一顆紅色圓珠」、細長爪指、前傾低頭駝背。氣質「**陰森、詭譎**…東方鬼怪（日式幽靈或台灣民俗紙紮／送葬意象）…壓抑、鬼祟又帶點悲涼」。玩具／威嚇：「偏向**不祥／陰森**」（正文另提「低多邊形卡通渲染…威嚇感被可愛化削弱」）。

**讀者 B**：「一個披著黑色長袍、低頭駝背站立的低多邊形風格『**幽靈**／老巫婆』類人形怪物。」特徵：灰白米白頭、發光白橢圓空洞眼、「頭頂到背後披覆一大片深色的斗篷／**長髮**，邊緣呈鋸齒狀尖刺」、**「腰間繫著一條藍灰色的腰帶／束帶，分隔上衣與下身裙擺」**、下身墨綠與黑交錯尖刺布條、「一把類似**小刀／匕首**的細長物體，刀柄處有一小塊紅色」。氣質「**陰森、詭譎**…安靜但暗藏敵意」。「比較偏向**威嚇／不祥感**」。

→ 兩位都讀到幽靈、氣質都過。**缺口三條**：① 沒有一位讀出「沒有腳／飄浮」 ② 下半身被讀成裙擺／草葉，B 還直接點出「腰帶把上下切開」 ③ 手上的簪被兩位讀成匕首。

### 第 2 輪（r10：抬高離地間隙、髮綹改暗墨綠、腰帶區用加長的肩髮綹蓋掉、右臂縮短前移、簪桿收細）

**讀者 C**：「一個穿著破爛黑色斗篷、蒼白面容的**幽靈**／女巫型 3D 角色模型。」特徵含「黑色長條狀垂墜物從頭頂一路延伸到背後，像破布或**髮絲**」「**身體底部呈懸浮狀（不見雙腳落地）**」「蒼白灰白色臉，發光的白色／淺青色眼睛（無瞳孔，呈空洞狀）」「持有一個小物件，物件上有一抹紅色」。氣質「**陰森**、哀傷又帶點神秘的宗教／喪葬儀式感…**詭譎**、超自然、亡靈或巫術儀式」。「比較偏向**不祥感**」。

**讀者 D**：「一個披著**長黑髮**／黑袍、低多邊形風格的**幽靈**或女妖生物，**身形飄浮在空中**。」特徵含「大量細長**黑髮**／黑色布條狀物從頭頂垂落，覆蓋住整個背部與肩膀，末端尖銳如針」「**沒有明顯雙腳，下擺呈飄浮狀**」「蒼白骨感的窄臉」「一支細長、淺色的**骨狀或木製物件（像法杖、骨刀或樹枝）**」。氣質「**陰森**、飄渺、悲傷而危險並存…**詭譎**」。「偏向有**威嚇感／不祥感**」。

→ 飄浮與長髮修好了（D 主印象直接是「長黑髮…飄浮在空中」）。**剩下一條**：簪仍被讀成法杖／骨刀。

### 第 3 輪（r11／r12：**在髮髻上再插一支簪**——手持的細長物本身沒有「這是髮飾」的線索）

**讀者 E**：「一個**披頭散髮**、手持樹枝／木杖的低多邊形風格**幽靈**或女巫型角色模型。」特徵：「蒼白灰白色臉，眼窩發出淡青白色光」「大量深黑色、細長尖刺狀的**髮束向後及向下披散，長度及腰甚至更長**」「**有一根細長的白色／米色髮簪或骨簪橫插在頭側**」「上身穿著層次分明的**灰色破爛長袍**」「腳部周圍浮著發光的螢綠色光點粒子，呈現**懸浮**／能量效果」。氣質「**陰森、詭譎**…讓人後頸發涼的陰沉氣場」。「偏向有**不祥感**」。

**讀者 F**：「一個披著暗色破敗長袍、**飄浮於地面之上**的骷髏面孔**幽靈**／亡靈巫師。」特徵：「慘白骨感臉孔，眼窩深陷、發著淡青白光」「**頭側插著一到兩根細長的白色／米白色簪狀尖刺物（像簪子或骨針）**」「上半身披著深灰／黑色不規則破爛布料」「下半身…多條尖銳細長的深綠與墨黑色布條或羽毛狀垂墜物」「**整體沒有明顯的腿部，衣擺下方懸空**…暗示為漂浮狀態」。氣質「**陰森**、寂靜、帶點儀式感的哀傷…冷冽、疏離」。「比較偏向**不祥感／威嚇感**」。

→ **M-A1 通過**：兩位主印象都是「幽靈」、氣質都含陰森，兩位都讀出「簪」。

**風格牆指標（17:30 修訂的記錄項）**：六位裡 **3/6**（A、E、F）在正文順帶把「威嚇感被削弱」歸因於低多邊形卡通渲染，與 tiger_a ⑤-3／redhat ⑥-1／nail ⑦-2 是同一面牆。**沒有一位把「可愛」放進主印象。**

---

## ③ 參照特徵逐條有／無（ART_BIBLE §0.5，清單見 `docs/experiments/2026-09-04-ref-hairpin.md`）

| # | 清單特徵 | 模型上做了什麼 | 讀者讀出（六位） | 判定 |
|---|---|---|---|---|
| 1 | **垂到地的整片長髮**（連成一片、末端散開成一綹一綹的尖） | 髮體 `hair` 由腰往上長、包住背肩後腦顱頂；12 條肩髮綹（8 條掛 HairC、4 條掛 HairB）＋12 條大髮綹（腰下）＋10 條髮尾細鬚把外緣打散；縱向 16 面明暗窄帶 | **3/6**（B「斗篷／長髮」、D 主印象「長黑髮」、E「披頭散髮…髮束及腰甚至更長」；A「髮絲／布條」半數、C「像破布或髮絲」半數、F 讀成斗篷帽＋布條） | **有** |
| 2 | **下半身沒有腿、被髮蓋住並飄浮** | 沒有腿鏈；腰（y 0.620）以下全部 `ghost_*`；最低髮綹尖端 y 0.134，離地間隙＝全高 12.7%；idle/move 位移放在 `Waist.ty` | **3/6**（C「不見雙腳落地」、D「沒有明顯雙腳，下擺呈飄浮狀」、F「整體沒有明顯的腿部，衣擺下方懸空」；E 讀到「懸浮／能量效果」） | **有** |
| 3 | **小而蒼白、低垂的臉** | `skin_face` 小頭（側視 share 2.34%），頭鏈整條前傾 14°，兩顆下沉的白光點眼＋黑裂口 | **6/6**（六位全部寫出「蒼白／慘白／灰白骨感的臉」＋「發光空洞的眼」） | **有** |
| 4 | **一支長髮簪握在手上、尖端朝前** | 左手：細桿（r 0.006）＋三片葉狀簪頭＋兩顆紅珠；**外加**斜插髮髻的第二支簪（r11 新增） | **2/6**（E「髮簪或骨簪橫插在頭側」、F「簪狀尖刺物（像簪子或骨針）」；A/B 讀成匕首、D 讀成法杖／骨刀、C 只說「小物件＋一抹紅色」） | **有（靠頭插那支救回來）** |
| 5 | **濕透的素白壽衣與垂袖、兩臂一長一短** | `robe`＋`sleeve` 灰白濕布、兩片下垂袖口 fin；左臂鏈 0.271／右臂 0.157＝**1.72×** | 袍 **6/6**（六位都寫出「長袍／斗篷／袍服」）；**兩臂一長一短 0/6** | **半（袍有、不對稱沒被讀出）** |

**命中數：5/5**（五條各至少一位讀者讀出，出貨版 r12 那一輪的兩位讀者把五條都覆蓋到）。
**未達成的子項：特徵 5 的「兩臂一長一短」六位全部沒讀出**——理由與處置見 ⑥-2，已列入缺項一節。

---

## ④ 指令原文與實際輸出

`<AC>` ＝ `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`，`<WT>` ＝ 本 worktree 根目錄。python 全部帶 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。

### M-A0 — 引擎編譯（出貨版）

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/hairpin.json <AC>/out/hairpin/ship.glb
{"ok":true,"out":"out/hairpin/ship.glb","bytes":829708,"verts":12025,"faces":2778,
 "joints":26,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.559}}

$ cmp <AC>/out/hairpin/r12.glb <AC>/out/hairpin/ship.glb
（無輸出＝逐位元組相同）
```

r12 之後只改了 `hairpin.json` 的 `_note` 說明欄位（把 ghost_wisp 色值、離地 y、臂長比等寫成實測值），`cmp` 證明**幾何、頂點色、動畫一個位元組沒動**——第 3 輪兩位讀者看到的就是這一版。

### M-A0／M-A3 — 出貨 GLB 本身

```
$ python -c "讀 GLB 的 JSON chunk"   # 一次性，跑完已刪
bytes 829708 kb 810.3
materials ['robe','ghost_hair','hair','skin_face','sleeve','eye','mouth','hand','pin','glow_pin','ghost_wisp']
animations ['idle','move','attack']
skins 1 joints 26
images 0 textures 0
attrs ['COLOR_0','JOINTS_0','NORMAL','POSITION','WEIGHTS_0']
asset {'version':'2.0','generator':'anyCreature v1.2.0',
       'extras':{'harness':'anyCreature','harness_version':'1.2.0','spec':'hairpin'}}
```

逐條：**810.3 KB ≤ 1.5 MB** ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／0 貼圖 ✅／
**M-A3**：簡報 `hairpin` 列指定的 **`eye`**、**`glow_pin`** 原樣在 materials 裡 ✅（`mouth` 是不發光的黑裂口，命名刻意不帶 `glow_` 前綴，免得被 `js/creature-figures.js:51` 的 `/^glow_/` 吃進 emissive；`ghost_hair`／`ghost_wisp` 走 `/^ghost_/` 的半透明分支）。

### M-A0 — judge 對 spec 全檢（claims 在動手建模之前就寫定，門檻全程一格未動）

```
$ node <AC>/harness/judge.mjs <AC>/out/hairpin/r12.glb <AC>/out/hairpin/judge_r12 hairpin \
      --spec <WT>/assets/creatures/hairpin.claims.json
"stats":{"triangles":5090,"skinnedMeshes":11,"animations":["idle","move","attack"]}
"lum":{"front":35.4,"side":32.5,"tq":37.3,"reartq":21.5,"top":34.1}
"hi_sat_share":{"front":0.1868,"side":0.1883,"tq":0.1768,"reartq":0.1626,"top":0.0127}
"whole":{"size":[0.372,1.054,0.637]}
robe      side=0.13780   ghost_hair side=0.21387   hair       side=0.31214
skin_face side=0.02335   sleeve     side=0.08868   ghost_wisp side=0.18712
pin       side=0.02638 span=0.7748  eye side=0.00073  mouth side=0.00143  glow_pin side=0.00114
[judge] Spec "林投姐髮簪 hairpin_lintoujie_faszan (yinqi/haunt)" — all claims pass.
```

各條的實際數字對門檻：
- `part_exists` `ghost_hair`／`ghost_wisp`／`hair`／`eye`／`glow_pin`／`pin` — 六個材質名都在清單裡 ✅
- `part_signature` `ghost_hair`（view side）：share **21.39%**（需 ≥6%）**且** span **0.6560**（需 ≥0.12）→ 兩路都過 ✅
- `part_visible` `skin_face`（side）：**2.335%**（需 ≥1.5%）✅
- `part_visible` `pin`（side）：**2.638%**（需 ≥1.5%）✅
- `focal_contrast` `ghost_hair` : `skin_face`（side）＝ 21.39 : 2.335 ＝ **9.16×**（需 ≥2）✅
- `share_hierarchy`（side）＝（ghost_hair＋ghost_wisp＋hair）71.31 :（robe＋sleeve）22.65 :（skin_face＋pin＋eye）5.05，正規化 **72.0 : 22.9 : 5.1**（目標 60:30:10，容差 ±15pp，最大偏離 **12.0pp**）✅
- `style_dark`（side，識別視角）：**32.5**/255（需 ≤90）✅
- `saturation_area`（tq）：**17.68%**（凍結檔標準帶 10–60%）✅
- `tri_budget`：**5090**（1500–8000）✅
- `rig_skinned` / `anim_named`：skins=1、11 個 skinned mesh、三支動畫齊 ✅

### M-A2 — haunt 下半身虛化

```
$ node <AC>/harness/silmetrics.mjs <AC>/out/hairpin/r12.glb <AC>/out/hairpin/sil_r12
{"W_over_H":0.60,"fill":0.373,"mass_thirds":[0.023,0.329,0.648],"torso_depth_max":0.97,
 "torso_depth_min":0.01,"mass_contrast":123.75,"leg_fraction":0.478,"turn_count":30,
 "zigzag_alignment":1,"front":{"W_over_H":0.37,"fill":0.613},
 "top":{"W_over_H":0.55,"fill":0.443},"hero":{"W_over_H":0.37,"fill":0.633}}
```

`leg_fraction 0.478` 是**假值**：本隻沒有腿，及地的髮綹被當腿量（與 `nail` 報告 ⑦ 的 0.506 同型；redhat ⑦-A 說「量到 null 就是做對了」那條在**髮綹垂到接近地面**的造型上不成立，這是本卷新記的一條）。真正的機械證據改用**離地間隙**：模型 y 範圍 0.134–1.188，最低點離地 **0.134 ＝ 全高 1.054 的 12.7%**，且 `ghost_hair`／`ghost_wisp` 兩個 `ghost_` 材質吃到 `js/creature-figures.js:161` 的半透明分支（opacity 0.62）——`2026-09-04-creature-hairpin-ghost.png` 上可以直接看到**地面的橘紅色透過髮綹**，而且本體與地面投影之間有明顯空隙。

### 兩張出貨截圖

```
$ node <AC>/harness/hero.mjs <AC>/out/hairpin/r12.glb <AC>/out/hairpin/hero_r12
{"ok":true,"margin":8.5}   → 複製成 docs/experiments/2026-09-04-creature-hairpin-hero.png

$ node tests/tools/creature-shoot.mjs <AC>/out/hairpin/r12-stage.png \
      "glb=hairpin.glb&light=1&fx=1&rim=yinqi" idle 8821
{"out":"...r12-stage.png","query":"glb=hairpin.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88,"calls":18,"loadMs":211,"particles":44,"errors":[]}
```

`errors` 是空陣列（console 0 error）。`fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。
stage-lit 是 `creature-shoot.mjs` 的原始輸出 1688×780 **只做一次純裁切**到 520×780（把兩側空地裁掉），沒有縮放、沒有調色；ghost 圖是同一張的下半身裁切後放大（760×840），沒有調色。**這三張就是第 3 輪盲讀讀者實際看到的那一版。**

### M-A4 — 範圍

```
$ git status --short
?? assets/creatures/hairpin.claims.json
?? assets/creatures/hairpin.glb
?? assets/creatures/hairpin.json
?? docs/experiments/2026-09-04-creature-hairpin-ghost.png
?? docs/experiments/2026-09-04-creature-hairpin-hero.png
?? docs/experiments/2026-09-04-creature-hairpin-stage-lit.png
?? docs/experiments/2026-09-04-ref-hairpin.md

$ git diff --stat HEAD
（空）
```

七個全新檔（本報告是第八個），**沒有任何既有檔被改**。`index.html`／`js/`／`tests/`／既有 `assets/creatures/*`／anyCreature 引擎一個位元組都沒動。過程中在 worktree 內建過一個 `tools/anyCreature` junction 借主樹的 `node_modules` 給 `creature-shoot.mjs` 用（`tools/anyCreature/` 在 `.gitignore` 第 3 行），用完已移除。**不 commit、不 push。**

---

## ⑤ 出貨造型（依 ART_BIBLE 陰氣段的四件事）

- **剪影**：從頭頂一路垂到接近地面的**整片長髮**，下緣散成一綹一綹、長短不齊；上半身窄削前傾、頭低垂，腰以下完全沒有腿的暗示。側視 `W_over_H 0.60`、`turn_count 30`（與 tiger_c 的 30 同級）。與其他五隻 haunt 的分辨（簡報 D 群）：`redhat` 散成霧、`raincoat` 鐘裙、`buoy` 頭頂球＋垂繩、`chair` 三竹腳、`guoyin` 中線缺塊、**`hairpin` 是髮綹錐裙蓋滿下半身**。
- **單一主色**：苔綠只落在髮梢（`ghost_wisp` #2d6650 ＋髮簾核心三條窄青帶 #3fcf90），其餘全部中性濕黑與灰白；`glow_pin` 的紅珠是唯一的「一點刺眼」，面積 side share 0.11%。
- **關鍵材質**：濕髮（下垂條、縱向明暗窄帶）＋吸飽水的布（`exp` 4.8 硬斷面的素衣與垂袖）＋林投氣根（腰以下 12 條錐狀圓桿＋10 條細鬚）。
- **動態節奏**：`idle` 3.0s 是 hold＋突跳（身體與頭停很久忽然跳一格），髮簾則連續平滑漂移——兩種拍子刻意錯開；`attack`（偷命）前 0.18s 完全靜止，再後拉、前刺，**頭在刺出的那一刻抬起來**，是全隻唯一一次她把臉抬起來正對前方。

八項「不可愛」手段用了六項：①比例拉長（頭高只佔全高 15%、W/H 0.37–0.60）②尖（髮綹末端、指爪、簪尖全部尖端外露）③眼（兩個下沉的白光點，無瞳孔）④不對稱（左右臂 1.72×、瀏海只蓋一側、24 條髮綹長度與外張角全不同）⑥細長指爪 ⑧深底＋一條高飽和帶。

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現四條）

1. **★ 超長薄板 `fin` 會在 bind pose 就翻面，而且錯誤訊息不會告訴你是哪一片。**
   髮綹一開始寫成 0.30–0.42 長 × 0.06 寬 × 0.010 厚的 `fin`，八片裡有**七片各生 1 個翻面三角形**（`mesh_integrity: bind pose has 7 flipped tris`，只附一句 `worst in "fin@VeilRoot" (1)`）。多邊形是嚴格凸的（逐邊叉積全正）、`udir⊥vdir` 也成立、`compile.js:498` 的 CCW 正規化也沒問題——問題出在 `buildFin` 從頂點 0 拉的扇形三角化在長寬比 ~7:1 時，扇形三角與側緣 quad 的面積比失衡，`foldCount` 的頂點法線和就會翻號。
   **定位法（值得抄）**：寫一支迴圈**逐一把 part 拿掉重編**、看 `bind pose has N flipped tris` 的 N 掉不掉，48 個 part 兩分鐘就指出是哪七個。比二分搜尋 spec 快得多。
   **對策：長條狀的東西一律用 `curve` 圓桿，不要用 `fin`**（本隻改完全綠，而且更貼近參照裡的圓形支柱根）。`fin` 留給長寬比 ≤4:1 的板（鬢髮、瀏海、袖口、簪頭葉片）。
2. **★ `saturation_area` 量的是 S 不是 V——暗色一樣可以是高飽和，這條可以同時救「飽和度不足」與「顏色太跳」。**
   第 3 輪造型把 12 條大髮綹全做成暗色，髮簾核心被髮綹擋住，`hi_sat_share.tq` 掉到 **3.0%**，`saturation_area`（下限 10%）直接擋掉 build。第一版補救用 `#3fbe86`（lum 190）→ 過了門檻但被讀者讀成「草葉」。最後用 **`#2d6650`（lum 83、S 0.56）**：視覺上是很暗的墨綠、沒有一位讀者再提到草，機器上 `hi_sat_share.tq` 仍有 **17.68%**。**要補飽和面積時先試「壓暗但保持色相純度」，不要先想加亮色。**
3. **★ `skin_face` 這種淺色材質在戲台燈下會整片衝過 bloom 的 threshold，把臉燒成一團白。**
   `#c8c3b6`（lum 195）的臉在 `light=1&fx=1` 下與兩顆 `eye` 的 emissive 疊在一起，stage-lit 上整顆頭是一個白光球、五官完全看不見（第一版 stage-lit 就是這樣）。壓到 `#a29c8f`（lum 156）之後光暈縮回成頭側的一個亮點。`GLOW.intensity` 是 2.8×**頂點色**，所以**發光件與它旁邊的淺色件要一起壓**，只縮發光件沒有用。這條是 flag 報告 ⑥-3「深底不等於近黑」的反面：**淺也有上限，落點大約在 lum 160 以下。**
4. **`leg_fraction` 對「髮綹／袍垂到接近地面」的 haunt 是假值。**
   redhat 報告 ⑦-A 寫「`leg_fraction` 量到 `null` 就是 haunt 做對了」——那隻的霧裾收成尖底所以量不到腿；本隻與 `nail` 的下擺是一束及地的長條，silmetrics 一律當腿量（0.478／0.506）。**haunt 的機械證據改用「最低點的離地間隙佔全高幾 %」**（本隻 12.7%）＋ `ghost_` 材質存在，不要拿 `leg_fraction` 當閘門。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **「兩臂一長一短」六位讀者全部沒讀出（0/6）。** 模型上是真的做了（左臂鏈 0.271、右臂 0.157，1.72×，r10 還把右臂往前挪 0.032 讓它從袍裡露出來），judge 也量得到兩條獨立的 `sleeve` 鏈，但在 hero 的 3/4 角度與 stage-lit 的遠鏡頭下，右臂被袍身與胸前髮綹擋掉大半，只剩一小截。要真的被讀出來，得把右臂做成**明顯殘缺**（例如只剩到肘、袖口空垂）——那會動到 `_asymmetry` 以外的造型語彙，而且第 3 輪額度已用完。**這條記為未達成**，建議排進硬化批一併處理。
2. **「簪」是靠**第二支**簪救回來的，不是手上那支被讀懂。** 第 1、2 輪四位讀者把手上那支讀成匕首／小刀／法杖／骨刀 4/4；補上斜插髮髻的第二支之後，第 3 輪兩位才寫出「髮簪／簪子」。也就是說**手持的細長物在低多邊形下沒有「這是髮飾」的線索，線索必須來自它插在頭髮上**。這個手法對後續有手持道具的隻數（`sword`／`xianji`／`bow`）可能同樣有用：把道具的「原生位置」也做一份在身上。
3. **下半身仍有 3/6 讀者讀成「裙擺／布條／羽毛」而不是頭髮。** 已做的：髮綹改圓桿、壓暗、上下用同色系、加長肩髮綹蓋住腰部亮帶（第 1 輪讀者 B 明說「腰間繫著一條藍灰色的腰帶，分隔上衣與下身裙擺」，r10 修掉之後沒有讀者再提腰帶）。**低多邊形沒有髮絲的表現手段**，「一綹一綹」是能做到的極限；要更進一步得走 three.js 端後處理（描邊／法線貼花），與 tiger_c 白毛邊的簽字同一類限制。
4. **`part_overlap` 有一批 warn 沒有清乾淨**（`eye@Brow` 在 `fin@Brow`〔黑裂口〕的包圍盒內、`spike@LHand` 在簪頭葉片內、`curve@Veil2` 在 `curve@Veil1` 內）。引擎是用包圍盒判 %，我逐張看 hero／front／side／tq 渲染圖核對過沒有實際穿模——**這是肉眼證據不是機器證據**。
5. **ART_BIBLE §6 的「剪影三秒測試」本卷沒做**——那是每兩批一次的批次閘門、需要多隻拼圖才跑得起來，留給主對話在合併之後執行。
6. **沒有量效能、沒有接進正式對決。** M-A0～A4 沒有要求就沒做；`creature-shoot` 順手回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。
7. **`attack`（偷命）沒有做動畫的視覺驗收。** 引擎的 `attack_reach` 綠燈只證明它有往前交付動作，不證明玩家會讀成「抽簪前刺」。凍結檔 M-A0～A4 沒有要求 attack 的截圖或盲讀。
8. **參照的文化界線**：`ghost_oyuki.jpg`（圓山應舉《幽靈圖》）是日本幽靈畫，本隻**只借「長髮＋下半身消失」的構圖文法**，服裝、髮式、道具全部走台灣脈絡（素白壽衣、清代髮簪、林投氣根），不做和服與日式髮型。另：**髮簪不是《林投姐》文獻裡的元素**（文獻只有「披髮的女鬼」與自縊於林投樹），簪是妖市法寶設定，造型改照清代髮簪實物做，這一點寫在 `2026-09-04-ref-hairpin.md` 的誠實標記裡。

---

## ⑧ 缺項（登記到 `docs/experiments/2026-09-04-creature-gaps.md`）

| ab | 目前命中 | 讀者沒讀出 | 處置 |
|---|---|---|---|
| hairpin | 5/5（特徵 5 的子項未達成） | **「兩臂一長一短」0/6** | 右臂改成明顯殘缺（只剩到肘、袖口空垂），或把左臂再拉長到 2.2×；下一個硬化批補讀 |
| hairpin | — | 下半身 3/6 讀成裙擺／布條而非頭髮（低多邊形的表現上限，與 tiger_c 白毛邊同類） | 記錄；真正的解法在 three.js 後處理卷 |

---

## ⑨ DEVLOG 一行

`gates: M-A0/A1/A2/A3/A4 全 PASS | M-A1 pass@r3 2/2（六位讀者 6/6 讀成幽靈／女鬼／亡靈、氣質 6/6 含陰森／詭譎、主印象出現「可愛」0/6；參照特徵 5/5，蒼白的臉 6/6、袍 6/6、長髮 3/6、無腳飄浮 3/6、髮簪 2/6）；風格牆指標 3/6 把威嚇感削弱歸因低多邊形渲染 | 810.3KB/5090tri/judge all pass/離地間隙 12.7%/turn_count 30 | restarts: r1 髮體當披風→讀成蒼白鳥頭獸＋綠蛋；r2 髮體包住頭但光滑→讀成兜帽教徒＋黑蛋；r3 改「輪廓由髮綹給」但飽和度掉到 3% 被 saturation_area 擋；r4 髮綹一暗一亮補回；r8 臉壓暗解掉 bloom 白球；r10 抬高離地間隙＋壓暗綠＋蓋掉腰帶；r11 髮髻加插第二支簪 | unresolved: 兩臂不對稱 0/6 沒被讀出、下半身 3/6 仍讀成裙擺、長 fin 翻面的引擎限制（見 ⑥-1）`
