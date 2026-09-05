# 3D 量產卷批 10 — `pojun` 破軍旗（xianghuo／swarm）回報（2026-09-05）

**結論先行：P1 機械全綠、P4 特徵命中 5/5（目標達成）、P5 出貨檔齊備；P3 主印象逐項達標（人形 2/2、旗 2/2、貫穿 1/2、香火氣質 2/2），唯一誠實條是兩位讀者的主印象用了「邪靈使者」「不祥」——沒有任何一位逐字出現「詭異」或「陰森」，但這兩詞落在鄰接語族，記為風格牆指標請主對話裁定。三輪用滿，出貨版＝r16。**

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`；驗收條件＝派工當下的 P1–P5，**全程未動一格**（逐條對照見 ⑦-5）。
美術權威：`docs/design/ART_BIBLE.md` 香火段＋§0.5。真實參照：`docs/experiments/2026-09-04-ref-pojun.md`（五條特徵在寫 JSON 之前定稿，此後未改）。
worktree `agent-a7a07891c40d95815`。**未 commit、未 push。**

DEVLOG 一行：
`gates: P1/P2/P3/P4/P5 全 PASS | P4 特徵 5/5（①貫穿 1/2、②破旗 2/2、③黑面金瞳 2/2、④武將甲 2/2、⑤金冠 2/2）| P3 人形 2/2、旗 2/2、貫穿 1/2、香火氣質 2/2；主詞無「詭異／陰森」逐字，但 r3 兩位用了「邪靈使者／不祥」 | 696.2KB/3860tri/judge all pass/全高 1.234/含配件寬(x) 0.455/側視 W/H 1.20 | restarts: 槍尖掛 curve 被 part_attachment 擋→改 spear 鏈；布條掛法沿桿鋪；r1「扛在肩上的長矛」0/2→r2 手臂放下＋金箍＋碎甲仍 0/2→r3 **把桿軸從「往後上」翻成「近水平略往前上」**才讀出「穿過背部」 | unresolved: 貫穿只 1/2（另一位讀成「權杖」）、近黑底色讓氣質偏向亡靈語族`

---

## ① P1 機械條件一覽

| 條目 | 門檻 | 出貨值 | 判定 | 出處 |
|---|---|---|---|---|
| M-A0 judge | claims 全綠 | `all claims pass` | **PASS** | ④ |
| GLB 大小 | ≤1.5 MB | **712,888 bytes ＝ 696.2 KB** | **PASS** | ④ |
| 三角形 | ≤8000（claims 帶 1500–8000） | **3,860** | **PASS** | ④ |
| 三支 clip | idle/move/attack | `["idle","move","attack"]`、skins=1、COLOR_0 有、0 貼圖 | **PASS** | ④ |
| faceted 規格 | `build:"rigid"`＋主要 volume 全 `faceted:true`＋exp ≥4.5＋smooth 24–30 | **8 個 volume 全部 `faceted:true`**、exp 4.6–5.2、`smooth_angle` 全檔 26 | **PASS** | `assets/creatures/pojun.json:volumes` |
| 全高 | 1.2–1.25 | **1.234** | **PASS** | ④ silmetrics/judge whole |
| 含配件寬 | ≤1.2 | **x ＝ 0.455**（縮 0.62 後 0.282，欄距 1.05 → 相鄰淨距 **0.768**） | **PASS** | ④ |
| `?n=3` 一排三隻 | 可載、不穿幫 | 截圖已出、console 0 error | **PASS** | ④＋`-n3.png` |
| 香火 W/H | side ≥0.9 | **1.20** | **PASS**（不需簽字申請） | ④ silmetrics |
| M-A3 發光材質名 | 簡報指定的兩個 | GLB materials 逐字含 **`eye`**、**`glow_tatter`**，沒有多開第三個 | **PASS** | ④ |
| M-A4 diff 範圍 | 只含自己的檔 | `git status --porcelain` 只有 9 個新檔、**零個 modified／deleted** | **PASS** | ⑧ |

---

## ② P2／P3 盲讀原話全文（context-free `sonnet` 子 agent，只給 hero＋stage-lit 兩張、遮名、四題逐字）

檔名遮成 `imgF-*` / `imgS-*`，路徑不含 pojun／破軍／旗／spear／banner 字樣，prompt 明寫「不要從檔名或路徑推論任何事」。四題**逐字照 `2026-09-04-harden2A-report.md` §②**（甲／乙交錯，與 ashcharm／balen 兩卷同一份）：
- 甲：「1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？」
- 乙：「(a) 這是什麼？一句話 (b) 逐條列部位 (c) 氣質偏『威嚴／兇／不祥』還是『可愛／討喜』？ (d) 猜它的來歷」

### 第 1 輪（r10：桿軸往後上、雙手扣在桿上→已改、碎甲近黑）

> **A（甲）** 1.「一個低多邊形（low-poly）風格的**雙足人形**角色 3D 模型，**背後扛著一支長柄旗幟／矛狀武器**。」
> 2.（節錄）「頭部：黑色頭盔／頭部造型，頂端有一圈**金黃色尖角狀裝飾（類似角或冠）**，呈放射狀分布」「面部：眼睛部位是**細長的黃色發光線條**」「肩背部：穿著**暗紅色多邊形硬殼狀護甲**，肩部兩側各有一片深紅色尖角狀突起裝飾」「腰部：護甲下緣接一圈深灰／黑色的**短裙狀下擺**」「右手（畫面左下方）：**手持一支黑色短柄物件**，柄兩端各有金黃色菱形/矛頭狀零件」「左肩後方：**扛著一支長柄旗桿**，桿身為深褐色，頂端有金色矛尖裝飾」「旗桿上懸掛**多片三角形旗幟**，顏色由紅色與橙黃色交錯排列，呈**鋸齒狀懸垂**、層層疊疊」
> 3.「帶有東方**儀仗／旗手**意味的**莊嚴肅穆**感…整體偏向神秘、**肅殺**、帶點宗教或**祭典儀式感**」
> 4.「偏向後者…**肅殺、警戒、帶壓迫感**…而非可愛討喜的玩具感」
> **主要印象：一個扛著紅黃旗幟、黑甲金冠的低多邊形肅殺旗手角色，氣質莊嚴帶威嚇感。**
>
> **B（乙）** (a)「一個**黑色人形/類人生物**,身穿**紅黑戰甲**,**背後扛著一支插滿紅橙色旗幟的長桿**。」
> (b)「頭部:黑色臉孔,**細長彎月狀的黃色發光眼睛**…頭頂有數片**黃色尖角狀裝飾,像王冠**」「軀幹:紅黑配色的方正**戰甲/鎧甲**,肩部有黑色尖角突出裝飾」「手臂/手持物:**一手持一支黑柄、金黃色矛頭的短矛**」「背後:**扛著一根長桿**,桿上插滿約7-8面紅色與橙色三角旗,呈階梯狀排列,像**戰旗/令旗陣**」
> (c)「偏『威嚴／兇／不祥』…**軍陣威儀**…完全不討喜可愛」
> (d)「像是東方神話/民俗題材中的『**令旗武將**』或『陰兵/鬼將』…」
> **主要印象：黑面尖角、身披紅黑戰甲、背扛旗陣的陰森戰將。**

**判定：貫穿 0/2（兩位都讀成「扛在肩上／手持短矛」）。** 人形 2/2、旗 2/2、香火氣質 2/2（儀仗／莊嚴肅穆／祭典／軍陣威儀）。

### 第 2 輪（r13：手臂改垂放握拳、兩枚金箍、碎甲提亮到 #6f6459、金腹甲移出傷口區）

> **C（甲）** 1.「一個低多邊形風格的**人形角色** 3D 模型，**肩上扛著一支長柄旗幟／長槍狀物件**。」
> 2.（節錄）「頭部：**金色／黃色頭盔，頂端有數個尖角狀突起，形似頭冠**」「臉部：**全黑臉面**，眼睛是**一對細長彎月形黃色發光眼**」「軀幹：**紅黑配色的甲胄**，胸前有六邊形／盾牌狀護甲板，邊緣有**金色裝飾條**」「肩部：右肩裝有**尖角狀護肩**，深紅色」「手臂：黑色長袖，手肘與手腕處各有**一圈金色護環**」「**右肩扛著一根深色長桿**，桿頂端有金色圓球狀裝飾」「長桿上垂掛**多片三角形旗幟**（紅色與橘色相間）」
> 3.「**陰森、肅殺、帶儀式感**——像是率領隊伍的**旗官或亡靈武將**」
> 4.「偏向會威嚇…不是可愛路線」
> **主要印象：陰森肅殺的旗官／武將型低多邊形角色，帶儀式感與壓迫感。**
>
> **D（乙）** (a)「一個全身漆黑、**頭戴金色尖角冠**、身披**紅黑鎧甲**、**手持插滿三角旗幟長桿**的低多邊形風格**人形角色**。」
> (b)「頭部：金色尖角/尖刺狀頭冠，臉部純黑，眼睛是一對發光的**黃白色細長縫**」「軀幹／胸甲：紅色為主…正面有尖角裝飾片」「腰部：黑色下擺**裙甲**」「手臂：黑色細長手臂，戴**金色臂環**」「手持物：一根長桿（矛/旗杆），頂端有**金色矛頭**，桿身**垂掛多片三角形旗幟**」
> (c)「明顯偏『威嚴／兇／不祥』…**儀仗武將**或鬼怪戰士的壓迫感」
> (d)「『**戰旗武將／鬼將／儀仗守衛**』…東方**神將**／陰間武士」
> **主要印象：威嚴不祥的黑甲掌旗武將。**

**判定：貫穿 0/2（累計 0/4）。** 金箍反被 C／D 讀成「手肘手腕的金色護環／臂環」——**輔助裝置在錯的軸向上無效**。

### 第 3 輪（r16＝出貨版：★桿軸翻成近水平略往前上、全檔等比放大 ×1.16、全高改由頭冠決定）

> **E（甲）** 1.「一個**雙足人形**的暗色系角色／怪物，穿著**紅黑護甲**、**戴金色冠飾**，右臂側平舉、背後垂掛長條飾物」
> 2.（全文）「頭部：**黑色臉部**，五官呈幾何切面，無明顯鼻嘴，只有**一對細長發光的黃綠色眼睛**」「頭頂：**一圈鋸齒狀金色尖角冠飾，像皇冠或頭盔的裝飾**，前後左右都有突起尖角」「軀幹：**紅色胸甲**為主色，**胸口偏左有一叢深灰色不規則尖刺／碎片狀突起，像破損的甲片**」「胸甲下方：兩片黃色細長尖牙／獠牙狀裝飾垂掛在腹部前方」「肩部：右肩有**黑色長條物從肩膀往外平伸，末端是金色尖錐狀物，像一根權杖或角**」「背部：一組**深紅／橘紅相間的三角旗狀**或翼狀薄片，成排從背後展開」「腰部：黑灰色寬**腰帶／裙甲**，正面中央有一塊紅色橢圓形飾板」「下半身：兩條細長黑色腿部」「整體配色：**黑、暗紅、金黃**三色為主」
> 3.「**陰森、肅殺、帶儀式感**——像披甲的亡靈武士或帶著獠牙面具的邪神使者」
> 4.「**會威嚇你的**——尖角、獠牙、發光細眼與破碎甲片的組合營造出攻擊性與壓迫感，完全不是可愛或玩具風格」
> **主要印象：披甲獠牙的黑暗武士／邪靈使者，威嚇感強烈。**
>
> **G（乙）** (a)「一個披著**暗色戰甲**、**頭戴金色尖角冠冕**的**人形黑暗戰士**角色。」
> (b)「頭部：黑色頭顱，戴**金色鋸齒狀尖角頭冠**，眼部是**兩道發黃光的細長眼睛**」「軀幹：**紅黑配色胸甲**，**胸口有破損／崩裂質感的深灰岩狀碎塊突出**，肩部有**紅色尖角護肩**」「腰帶：胸甲下緣一條**紅色帶狀腰封**」「右臂：向側平伸，手部呈金色尖錐狀」「背部：**一根黑色橫桿狀物穿過背部，末端垂掛數片橘紅色三角旗幟／布條**」「下半身：黑色簡化雙腿」
> (c)「明顯偏『**威嚴**／兇／不祥』…完全沒有可愛討喜的元素」
> (d)「金冠暗示身份尊貴（王者或首領），**胸口碎裂**塊與**背後旗幡**…可能是某種『**魔將**』或『石甲死神』類型的頭目角色」
> **主要印象：威嚴不祥的暗黑魔王／頭目戰士。**

**判定：PASS。** G 逐字寫出「**一根黑色橫桿狀物穿過背部**」＝貫穿 **1/2**（門檻 ≥1/2）。人形／武將 2/2、旗 2/2、香火氣質 2/2（E「儀式感」、G「威嚴」）。

**風格牆指標（凍結檔 17:30 要求每隻貼出提及人數）**：六位讀者中 **3/6**（r1-A、r1-B、r2-C）把「低多邊形」明確當成風格描述詞；**沒有一位**在主印象裡出現「玩具／可愛」（r1-A「而非可愛討喜的玩具感」、r1-B「完全不討喜可愛」、r2-C「不是可愛路線」、r2-D「完全沒有可愛討喜」、r3-E「完全不是可愛或玩具風格」、r3-G「完全沒有可愛討喜的元素」＝6/6 主動否定可愛）。Q4 依凍結檔 2026-09-05 凌晨的裁定只作記錄項。

---

## ③ P3／P4 逐條對照

### P3 主印象

| 條件 | 門檻 | r3 實得 | 判定 |
|---|---|---|---|
| 「武將／士兵／戰士／人形」 | 2/2 | E「雙足人形…黑暗武士」／G「人形黑暗戰士」 | **PASS 2/2** |
| 「旗／旗桿／布條」 | ≥1/2 | E「三角旗狀…薄片」／G「三角旗幟／布條」 | **PASS 2/2** |
| 描述到「貫穿／插在身上」 | ≥1/2 | G「一根黑色橫桿狀物**穿過背部**」 | **PASS 1/2** |
| 香火氣質（威嚴／悍／祭典／神將） | ≥1/2 | E「帶**儀式感**」／G「明顯偏『**威嚴**』」 | **PASS 2/2** |
| 主詞不含詭異陰森 | — | **逐字檢查：兩位主印象都沒有出現「詭異」或「陰森」**（E＝「披甲獠牙的黑暗武士／邪靈使者」、G＝「威嚴不祥的暗黑魔王／頭目戰士」） | **PASS（附誠實條，見 ⑦-1）** |
| 可愛 | 記錄項不閘 | 6/6 主動否定可愛 | 記錄 |

### P4 特徵命中（定義：一條特徵「命中」＝兩位讀者中 ≥1 位主動說出，凍結檔 2026-09-05 主對話定）

| # | ref 特徵 | r3 命中 | 讀者原話 |
|---|---|---|---|
| ① | **斜貫穿胸口的長旗桿** | **✅ 1/2** | G「一根黑色**橫桿狀物穿過背部**，末端垂掛數片橘紅色三角旗幟」（E 讀成「從肩膀往外平伸…像一根權杖或角」＝看到桿與金尖端但沒讀成貫穿） |
| ② | **桿後端垂下的破爛旗** | **✅ 2/2** | E「一組深紅／橘紅相間的**三角旗狀**或翼狀薄片，成排從背後展開，類似**披風碎片**」／G「末端**垂掛數片橘紅色三角旗幟／布條**」 |
| ③ | **黑面神將的臉**（近黑臉／金瞳／濃眉窩／方鬚） | **✅ 2/2** | E「**黑色臉部**…只有**一對細長發光的黃綠色眼睛**」／G「**黑色頭顱**…眼部是**兩道發黃光的細長眼睛**」（「鬚」兩位皆未點名，見 ⑥） |
| ④ | **廟宇武將甲** | **✅ 2/2** | E「**紅色胸甲**為主色…**破損的甲片**…黑灰色寬**腰帶／裙甲**」／G「**紅黑配色胸甲**…**紅色尖角護肩**…一條**紅色帶狀腰封**」 |
| ⑤ | **鎏金束髮冠** | **✅ 2/2** | E「一圈**鋸齒狀金色尖角冠飾，像皇冠或頭盔的裝飾**」／G「**金色鋸齒狀尖角頭冠**」 |

**P4 ＝ 5/5**（目標達成，非下限 3/5 的佔位）。

---

## ④ 指令原文與實際輸出

```
$ node tools/anyCreature/engine/cli.js assets/creatures/pojun.json tools/anyCreature/out/pojun/r17.glb
{"ok":true,"out":"tools/anyCreature/out/pojun/r17.glb","bytes":712888,"verts":10052,"faces":2111,
 "joints":37,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.472}}

$ cmp tools/anyCreature/out/pojun/r16.glb tools/anyCreature/out/pojun/r17.glb
（無輸出＝逐位元組相同；r16→r17 只改了 JSON 的 `_` 註記欄位，幾何一格未動）

$ cmp tools/anyCreature/out/pojun/r16.glb assets/creatures/pojun.glb
IDENTICAL

$ python _tmp_glbinfo.py assets/creatures/pojun.glb     # 直接讀 GLB 的 JSON chunk，跑完已刪
{"file": "assets/creatures/pojun.glb", "bytes": 712888, "kb": 696.2,
 "animations": ["idle","move","attack"], "skins": 1, "joints": 37, "meshes": 1, "primitives": 17,
 "materials": ["armor_body","armor_skirt","skin_face","gold_trim","pole_wood","armor_arm","armor_leg",
               "brow_ink","eye","beard","pauldron","sash","armor_break","flag_cloth","glow_tatter",
               "hand","boot"],
 "attributes": ["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"], "images": 0, "textures": 0,
 "asset": {"version":"2.0","generator":"anyCreature v1.2.0",
           "extras":{"harness":"anyCreature","harness_version":"1.2.0","spec":"pojun"}}}

$ node tools/anyCreature/harness/judge.mjs assets/creatures/pojun.glb \
       tools/anyCreature/out/pojun/judge_ship pojun --spec assets/creatures/pojun.claims.json
[judge] Spec "破軍旗 pojun_canbing (xianghuo/swarm)" — all claims pass.

$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/pojun.glb tools/anyCreature/out/pojun/sil_ship
{"W_over_H":1.2,"fill":0.259,"mass_thirds":[0.085,0.597,0.318],"torso_depth_max":0.98,
 "torso_depth_min":0.05,"mass_contrast":20.85,"leg_fraction":null,"turn_count":25,
 "zigzag_alignment":1,"front":{"W_over_H":0.36,"fill":0.62},"top":{"W_over_H":0.33,"fill":0.478},
 "hero":{"W_over_H":0.96,"fill":0.363}}

$ node tools/anyCreature/harness/hero.mjs assets/creatures/pojun.glb tools/anyCreature/out/pojun/hero16.png
{"ok":true,"margin":8.6}

$ node tests/tools/creature-shoot.mjs <stage-lit> "glb=pojun.glb&light=1&fx=1&rim=xianghu" idle 8846
{"out":"...","query":"glb=pojun.glb&light=1&fx=1&rim=xianghu","phase":"idle","fps":59.88,"calls":25,
 "loadMs":214,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs <n3> "glb=pojun.glb&light=1&fx=1&rim=xianghu&n=3" idle 8846
{"out":"...","query":"glb=pojun.glb&light=1&fx=1&rim=xianghu&n=3","phase":"idle","fps":59.88,"calls":65,
 "loadMs":208,"particles":132,"errors":[]}
```

兩次 `creature-shoot` 的 `errors` 都是空陣列（console 0 error）。`fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**，別拿來當佐證。

judge 的關鍵數字（門檻＝claims 檔原值，全程未改）：

| claim | 門檻 | 出貨值 |
|---|---|---|
| `part_exists` ×5 | pole_wood／flag_cloth／glow_tatter／eye／gold_trim | 五個材質名都在 materials 裡 ✅ |
| `part_signature` `pole_wood`@side | share ≥5% **或** span ≥0.55 | share **7.45%** ✅ **且** span **0.687** ✅（兩路都過） |
| `part_visible` `pole_wood`@front | ≥1% | **1.76%** ✅ |
| `part_visible` `flag_cloth`@side | ≥2% | **23.31%** ✅ |
| `part_visible` `skin_face`@front | ≥2.5% | **3.96%** ✅ |
| `focal_contrast` armor_body : glow_tatter@front | ≥3× | armor_body 33.04%、glow_tatter **0%**（餘燼板在正視全部側對鏡頭）→ 比值無限大 ✅ |
| `share_hierarchy`@tq（目標 60:30:10、容差 ±15pp） | — | **54.7 : 20.7 : 24.6**（最大偏離 14.6pp）✅ |
| `style_dark`@side | ≤90 | **42.6** ✅ |
| `saturation_area`@tq | 10%–60% | **51.5%** ✅ |
| `tri_budget` | 1500–8000 | **3,860** ✅ |
| `rig_skinned` / `anim_named` | — | skins=1、17 個 skinned primitive、三支動畫齊 ✅ |

**swarm 不穿幫的數字**：模型 x 寬 **0.455**，`creature-preview.html:112-117` 在 `n>1` 時每隻縮 **0.62**、欄距 **1.05** → 佔寬 **0.282**，相鄰淨距 **0.768**；z 幅寬 1.486 不影響橫排（列距 1.35 在 z，n=3 全在同一列）。

---

## ⑤ 改了哪些檔（`檔案:行號`）

全部是新檔，既有檔案一行未動。

| 檔案 | 大小／行 | 內容 |
|---|---|---|
| `assets/creatures/pojun.json` | 1–617 | anyCreature 規格。設計註記 `2–15`（`_variant`／`_brief`／`_ref_features`／`_swarm_recipe`／`_proportion_note`／`_wh_note`／`_pierce_construction`／`_flag_construction`／`_arc_frame_note`／`_hardening_note`／`_glow_materials`／`_traps`／`_devices`）、`palette`、`joints`（body／skirt／head／crown／**pole**／**spear**／LArm／LLeg 八條鏈）、`chains`・`attach`・`mirror`・`touch`、`volumes`（**8 個全部 `faceted:true`**）、`parts`（金瞳／眼窩／抿嘴／方鬚／額前金牌／冠翼 ×4／大肩甲 ×2／腹甲片 ×2／腰封／前破口碎甲 ×6／後破口碎甲 ×4／胸口破布 ×2／胸口餘燼 ×2／槍尖／前金箍／後金箍／尾套／破布條 ×10／餘燼 ×4／拳 ×4／紙靴 ×2）、三支動畫 |
| `assets/creatures/pojun.claims.json` | 1–144 | judge.mjs 機械檢查清單，**動手建模、看到任何數字之前寫定**；門檻全程一格未動 |
| `assets/creatures/pojun.glb` | 712,888 bytes | 引擎輸出（r16＝r17，`cmp` 逐位元組相同） |
| `docs/experiments/2026-09-04-ref-pojun.md` | 1–34 | 真實參照文件（3 張 Commons 圖、每張一句、五條一眼特徵） |
| `docs/experiments/2026-09-04-creature-pojun-hero.png` | 1024² | `harness/hero.mjs`，margin 8.6% |
| `docs/experiments/2026-09-04-creature-pojun-stage-lit.png` | 720×780 | 戲台 3/4（`creature-shoot.mjs`，`light=1&fx=1&rim=xianghu`），原始 1688×780 **只做一次純裁切**，沒有縮放、沒有調色 |
| `docs/experiments/2026-09-04-creature-pojun-front.png` | 512² | judge 的 `pojun_beauty_front.png`（正視，用來核對桿子從胸口穿出的位置） |
| `docs/experiments/2026-09-04-creature-pojun-n3.png` | 1120×608 | `?n=3` 橫排，同樣只裁切 |

---

## ⑥ 每輪改動（三輪）

| 輪 | 版本 | 改了什麼 | 盲讀結果 |
|---|---|---|---|
| — | r1–r9（建模期，未盲讀） | 槍尖原本是掛在 `PoleRoot` 上加 offset 的 curve → 被 `part_attachment` 擋（0.392 clear）→ 改成獨立的 `spear` chain；布條原本 `udir` 垂直、`vdir` 往後外張 → 五條全被 `part_attachment` 擋（0.32–0.64 clear）→ 改成「`vdir` 沿著桿子鋪、`u=0` 那排點落在桿身上」；細長布條 bind pose 生翻面三角 → 加寬（見 ⑨-⑩） | — |
| 1 | r10 | 桿軸「往後上」（u=(0,0.673,−0.739)），前端斜插到腹前；雙手扣在桿上→實拍發現手臂擋住穿出點，改成垂放握拳；碎甲近黑 | **貫穿 0/2**（「背後扛著長柄旗幟」「一手持短矛」）；人形 2/2、旗 2/2、香火氣質 2/2 |
| 2 | r13 | 加兩枚等距 `gold_trim` 金箍（把前後兩截綁成同一根）、碎甲提亮 #2f2c28→**#6f6459**、臉提亮 #34312c→**#45403a**、金腹甲從傷口區（t 0.32/0.44）移到 t 0.50/0.61、加後破口碎甲、桿身加粗（r 0.023→0.029） | **貫穿 0/2**（累計 0/4）；**金箍反被兩位讀成「手肘手腕的金色護環／臂環」** |
| 3 | **r16（出貨）** | ★**把桿軸從「往後上」翻成「近水平略往前上」**（u=(0,0.28,0.960)）：前端從胸甲穿出成一支往前伸的鎏金槍尖、後端從背心穿出往下斜到地面掛破旗；為了讓全高不再依賴桿子，**全檔等比放大 ×1.16**，全高改由頭冠決定（1.234）；破旗改掛 `PoleMid`、框架改沿後段桿子鋪 | **貫穿 1/2**（G「一根黑色橫桿狀物**穿過背部**」）；**特徵 5/5**；人形 2/2、旗 2/2、香火氣質 2/2 |

**這一卷最貴的一課**：三輪四位讀者證明，「桿子有沒有穿過身體」不是靠**裝飾**（金箍、碎甲、破布、餘燼全部加過，0/4）讀出來的，是靠**軸的方向**。往上走的桿子在 2D 投影裡必然貼著肩線經過，而「桿子貼著肩線」的先驗就是**扛**；把軸壓成近水平、讓兩端各自落在軀幹輪廓的前後兩側、且不經過肩／頭的輪廓線，同一批讀者立刻讀出「穿過」。已寫進 spec 的 `_pierce_construction` (2)。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **★ 氣質的主詞落在鄰接語族。** P3 的字面條件是「主詞不含**詭異陰森**」——r3 兩位主印象逐字檢查都**沒有**這兩個詞（E＝「披甲獠牙的黑暗武士／邪靈使者」、G＝「威嚴不祥的暗黑魔王／頭目戰士」），依字面 PASS；但「邪靈使者」「不祥」顯然與 ART_BIBLE 香火段的「威嚴、神聖、鎮煞」有距離。**歸因**：base 色是中性近黑（`style_dark` 側視 42.6，遠低於門檻 90），高飽和只落在硃紅與鎏金；六位讀者裡有四位把「全黑臉＋發光細眼」直接連到亡靈／鬼將語族。r2-D 與 r3-G 都同時說了「威嚴」與「不祥」，代表兩種讀法在同一張圖上並存。**要更偏香火，可走的路有二**：(甲) 把 `armor_body` 與 `skin_face` 整體提亮一階（風險：`style_dark` 與凍結檔的「深底」守則）；(乙) 把硃紅面積再擴大、讓紅取代黑當主詞（風險：`saturation_area` 已經 51.5%，上限 60%）。**我沒有自行改**，因為這會動到已經 PASS 的兩條（style_dark、saturation_area）且屬美術方向裁定——請主對話決定要不要開回修。
2. **貫穿只有 1/2。** 門檻是 ≥1/2 已達，但離「2/2」還有一位：E 把前端讀成「從肩膀往外平伸…像一根權杖或角」。歸因＝hero 的 3/4 機位下，往前伸的槍尖與右肩在投影上重疊。**建議**：剪影三秒測試批次補讀時加一張正視圖（`-front.png` 已產出，正視下桿子在胸口正中、兩端對稱外露），但**加圖等於放寬 P2，屬凍結條件變更，要走 `02 §2.1`**——我不自行決定。
3. **「破爛／殘破」這個形容沒有被逐字讀出。** 兩位讀出「三角旗狀薄片／布條」「披風碎片」「破損的甲片」「破損／崩裂質感」，但沒有人說「破爛的旗」。這是同一堵低多邊形風格牆（tiger_c 白毛邊、wuying 紙紮感同族）——布的「撕裂」在無貼圖下只能用「多條分離的板」表達，讀者會歸給「多面旗」而不是「一面被撕開的旗」。留後處理卷。
4. **方鬚（特徵③的子項）0/2 未被點名。** `beard` front share 1.04%，近黑鬚貼在近黑臉上，兩位都寫「無明顯鼻嘴」。同 ⑦-1 的明度問題，建議與氣質回修一起處理（鬚改成灰白或加一條下頷亮邊）。
5. **移動過的門檻：一個都沒有。** `pojun.claims.json` 在動手建模、看到任何 judge 數字之前寫定（見該檔 `_role`）。過程中 `share_hierarchy` 擋了兩次、`part_visible skin_face@front` 擋了一次，**三次全部靠改實作過關**（放大破旗面積、縮小金箍與槍尖、縮小碎甲、把桿軸壓低讓它不再擋住臉），沒有動過 bucket 分組、容差或任何一個數字。另：草擬 claims 時一度把 `skin_face@front` 寫成 0.02（低於 wuying 的 0.025），**在動手建模之前**察覺那是無理由放寬並當場改回 **0.025**，此後未動。
6. **`part_overlap` 有一批 warn 沒清乾淨**：`eye` 100% 落在 `eye_socket` 的包圍盒裡（刻意的兩層明度對比）、餘燼板落在布條的包圍盒裡（刻意的疊層）。逐張渲染圖核對過沒有實際穿模，但這是**肉眼證據不是機器證據**。
7. **沒有量效能、沒有接進正式對決。** P1–P5 沒有要求就沒做；`?n=8` 的 fps 與真機量測留給接線卷。
8. **ART_BIBLE §6 的「剪影三秒測試」本卷沒做**——那是每兩批一次的批次閘門，留給主對話在合併批 10 之後執行。本檔的 `thumb24.png` 已產在 `tools/anyCreature/out/pojun/sil_ship/`。
9. **`silmetrics` 的 `leg_fraction` 回 `null`。** 貫穿的桿子橫切整個側視剪影，量腿的演算法找不到腿。腿的實際佔比用骨架座標算：髖 0.580／全高 1.234 ＝ **47.0%**。

---

## ⑧ M-A4 範圍

```
$ git status --porcelain
?? assets/creatures/pojun.claims.json
?? assets/creatures/pojun.glb
?? assets/creatures/pojun.json
?? docs/experiments/2026-09-04-creature-pojun-front.png
?? docs/experiments/2026-09-04-creature-pojun-hero.png
?? docs/experiments/2026-09-04-creature-pojun-n3.png
?? docs/experiments/2026-09-04-creature-pojun-stage-lit.png
?? docs/experiments/2026-09-04-ref-pojun.md
（本報告與 gaps.md 的一列是最後兩項）
```

零個 modified／deleted：`index.html`、`js/`、`tests/tools/`、既有 `assets/creatures/*`、anyCreature 引擎**一個位元組都沒動**。
過程中在 worktree 內用 `New-Item -ItemType Junction` 建了一個指向主樹 `tools/anyCreature` 的目錄 junction（`creature-shoot.mjs` 要 `require` 那裡的 playwright，而 `tools/anyCreature/` 在 `.gitignore`），參照圖與所有中間版本都落在 `tools/anyCreature/out/`；因為該路徑被 gitignore，**junction 從頭到尾沒有進過 diff**，收工時已移除。三支一次性腳本（`_tmp_convex.py`／`_tmp_glbinfo.py`／`_tmp_shaft.py`／`_tmp_tune.py`／`_tmp_fix4.py`／`_tmp_notes.py`）用完全部已刪。

---

## ⑨ 這一隻踩到、下一隻會再遇到的引擎事實（新發現五條，同步寫進 spec `_traps` ⑩ 與 `_pierce_construction`／`_flag_construction`）

1. **★ 細長的 `fin` 即使是嚴格凸多邊形也會在 bind pose 生 1 片翻面三角。** `mesh_integrity` 與 `anim_integrity`（全部 15 個取樣點）會同時紅，訊息指名該 fin。機制：`foldCount`（`checks.js:76-92`）拿每個面的法線去對「頂點法線和」；薄板的正反兩層法線互相抵消，只剩側牆（rim）的法線在投票，銳角尖端那一片 rim 的方向就會反過來。**判準是世界座標下的長寬比，不是 `(u,v)` 上的**——`udir` 與 `vdir` 不必正交（本檔一度夾角 53°），(u,v) 上看起來 2.2:1 的三角形在世界座標可能是 5:1。實測門檻：世界長寬比 ≳5:1 紅、≲4:1 安全。**加厚完全沒有用**（thickness 0.009→0.022 實測 flipped 數一片不變），要改的是長寬比。
2. **★ 「掛件貼不貼得住宿主」量的是 chain volume 的表面，`curve` 不算宿主表面。** 想在一根 `curve` 的遠端再接一件別的材質（例：木桿末端接金槍尖），把 curve 改寫成一條**有 volume 的 chain**，槍尖再掛在那條鏈的末端關節上；直接用 offset 把第二根 curve 推到遠處會被 `part_attachment` 擋（本檔實測 0.392 clear vs 容差 0.018）。
3. **★ 沿著一根桿子鋪的 `fin`，`v` 的起點必須 ≤「宿主關節到該鏈末端的實際長度」。** 本檔一度把某條布條寫成 `v0=0.37`，而 `PoleMid→PoleTop` 只有 0.317，那條的最近點就掉出桿子外 0.046 被 `part_attachment` 擋。
4. **★ `root_containment` 只查 chain 的 `t=0` 那一列環**（`checks.js:244-261`），而且是拿「離宿主最近的那個環心」比。一條掛在另一條 chain 上的子鏈（本檔 `spear` 掛 `pole`），它的 t=0 半徑要 < 宿主該處半徑 ×0.98。
5. **★ Wikimedia Commons 直連 `upload.wikimedia.org` 時，只有 API `iiurlwidth` 回傳的原生尺寸取得到。** 自行把網址裡的 `960px-` 改成 `900px-` 會回 **HTTP 400 的錯誤 HTML 頁**（`curl` 仍然存成 2010 bytes 的 .jpg，看起來像下載成功）。做參照圖時要先用 API 拿 `thumburl`、照抄那個寬度，並檢查檔案大小。
