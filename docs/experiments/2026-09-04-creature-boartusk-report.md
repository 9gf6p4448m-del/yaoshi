# 3D 量產批 13 · boartusk 山豬牙飾（祖靈／swarm）試作報告

> 凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（09-05 各段優先）｜美術權威：`docs/design/ART_BIBLE.md`
> 參照凍結：`docs/experiments/2026-09-04-ref-boartusk.md`（寫 JSON 之前定稿，此後一條未改）
> 出貨：`assets/creatures/boartusk.{json,glb,claims.json}`｜截圖四張見 §⑤

## ① 結論先行

**5/5 完成，兩輪四位讀者。** 出貨版＝r6。

- **K1 機械全綠**：`cli.js` `checks: all green`；`judge.mjs` **不帶 `--stage`** 全 claims pass；GLB **1,014,692 B（0.97 MB ≤1.5 MB）**、**6,954 tri（≤8000）**、全高 **1.222（1.20–1.25）**、模型 X **0.562（≤1.2）**、`?n=3` 載入 `errors:[]` 且三隻互不穿模；三支 clip 齊備（attack＝獠牙上頂）。
- **K2 盲讀**：兩輪各兩位 context-free `sonnet`，只給 hero＋stage-lit 兩張，路徑與檔名不含 boartusk／山豬／獠牙字樣，四題與 `harden2A` §② 問法甲逐字相同、未加提示。
- **K3 主印象**：山豬／野豬 **2/2**、獠牙 **2/2**、項圈／牙串 **2/2**、祖靈氣質（圖騰／神話／守護獸）**1/2 命中**（見 §③ 的誠實註記）。
- **K4 特徵命中**：**5/5**（第 1 輪 4/5，②「野豬體型：四肢粗短」0/2；第 2 輪把腿加粗、軀幹加深後 **②變 2/2**，其餘四條不退步）。
- **K5 出貨檔**：三檔齊備，`tri_budget` 6,954 在 1500–8000 帶內。
- **新陷阱三條**（⑪ 收尾端 ngon／⑫ 外擴斜率／⑬ 傾斜子鏈的 root_containment），已逐字寫進 `boartusk.json` 的 `_traps`，見 §⑥。

## ② K1–K5 逐條表

| 條 | 要求 | 實測 | 判定 |
|---|---|---|---|
| K1-a | M-A0～M-A4 全綠，judge **不帶 `--stage`** | `[judge] Spec "山豬牙飾 boartusk (zuling/swarm)" — all claims pass.`（指令原文見 §④） | ✅ |
| K1-b | `build:"rigid"` | `"build": "rigid"` | ✅ |
| K1-c | 所有主要 volume `faceted:true` | 6 個 volume（body／neck／head／disc／LFront／LBack）全部 `faceted: true` | ✅ |
| K1-d | 斷面 exp ≥4.5 | 全檔 4.6（端點）／4.8（中段），最小 4.6 | ✅ |
| K1-e | `smooth_angle` 24–30 | 全檔 **26**（spec 頂層＋每個 volume 各寫一次） | ✅ |
| K1-f | GLB ≤1.5MB | **1,014,692 B ＝ 0.968 MB** | ✅ |
| K1-g | tri ≤8000 | **6,954** | ✅ |
| K1-h | 三 clip，attack＝獠牙上頂 | `anims: ["idle","move","attack"]`；attack 由 `Rump.tz +0.235` 前撞＋`NeckRoot/HeadRoot/Skull/Muzzle` 的 `rx` 負值連鎖上翻＝吻端與獠牙由下往上挑 | ✅ |
| K1-i | 含配件寬 ≤1.2 | 模型 X **0.562**（`whole.size[0]`）；preview `n>1` 縮 0.62 → 佔寬 0.348，欄距 1.05 → **相鄰淨距 0.702** | ✅ |
| K1-j | `?n=3` 可載 | `{"...","query":"glb=boartusk.glb&light=1&fx=1&rim=zuli&n=3","fps":59.88,"calls":53,"loadMs":190,"particles":132,"errors":[]}`；截圖三隻分離無穿模 | ✅ |
| K1-k | 全高 1.2–1.25 | **1.222**（`whole.size[1]`，由背鬃尖端決定） | ✅ |
| K1-l | 側視 W/H 記錄 | `silmetrics` **side W/H ＝ 1.07**（祖靈記錄目標 ≤0.7，**09-05 使用者裁定已撤回為記錄項不閘**）；`front` 0.50、`hero` 0.84、`fill` 0.392、`leg_fraction` **0.302** | 記錄 |
| K2 | 兩位 context-free `sonnet`，只給 hero＋stage-lit，遮名，四題逐字、不加提示 | 兩輪四位（A/B、C/D），圖片順序兩兩對調；路徑 `.tmp/blind/imgA-1,2`、`imgB-1,2`／`.tmp/blind2/imgC-1,2`、`imgD-1,2`（不含任何識別字樣）；問法逐字＝「1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？」 | ✅ |
| K3-a | 「山豬／野豬／豬」2/2 | C「野豬／山豬類」、D「山豬／野豬」（第 1 輪 A「野豬／山豬型」、B「野豬／疣豬」，累計 **4/4**） | ✅ |
| K3-b | 「獠牙」≥1/2 | **2/2**（累計 4/4） | ✅ |
| K3-c | 「項圈／牙串／骨飾」≥1/2 | **2/2**（累計 4/4） | ✅ |
| K3-d | 祖靈氣質（圖騰／神獸／古老）≥1/2 且不以陰森為主詞 | D 逐字「帶點**神話/圖騰**感——像是廟會陣頭或妖怪傳說裡的**守護獸**」＝**1/2 命中**；C 的主詞是「兇悍、原始、帶野性威嚇感」，**全句無任何陰森詞**。**誠實註記**：D 的第一個形容詞是「陰沉」（三個並列形容詞的第一個，緊接神話／圖騰／守護獸）。累計四位：祖靈語彙 **3/4**（A「神獸／儀式感」、B「圖騰化…圖騰木雕感」、D「神話/圖騰…守護獸」），陰森類詞作首詞 **2/4**（B「陰森」、D「陰沉」）。 | ✅（附註記） |
| K3-e | 可愛：記錄項不閘（09-05 凌晨裁定） | 第 2 輪：C「不精緻可愛…而非討喜的吉祥物」（否定式）、D「低多邊形的簡潔切面雖然帶**一點卡通感**，但…不是走萌系路線」＝**風格牆提及 1/2**；第 1 輪 A「low-poly 的幾何造型讓它同時帶點**卡通化**、遊戲角色式的親和感」＝1/2。**四位主印象（Q1／Q4 主詞）沒有一位是可愛／玩具**。 | 記錄 |
| K4 | ref 5 條 ≥3/5 出貨、目標 5/5 | **5/5**（逐條原話見 §③） | ✅ 目標達成 |
| K5 | `assets/creatures/boartusk.{json,glb,claims.json}`，tri_budget ≤8000 | 三檔齊備；`tri_budget` claim `min 1500 / max 8000`，實測 6,954 | ✅ |
| M-A3 | 發光材質名存在於 GLB materials | GLB materials（14）：`hide_body, hide_face, snout_disc, hide_leg, mane_gold, tusk, tusk_root, collar_ring, collar_fang, collar_bead, cord_red, eye, mouth_glow, hoof` —— **`eye` 與 `mouth_glow` 逐字存在**（`js/creature-figures.js:51` 的 `/^eye(_|$)|^mouth_glow(_|$)|^glow_/` 會掛上 emissive） | ✅ |
| M-A4 | `git diff --stat` 只含自己的檔 | `git diff --stat HEAD` **空輸出**（本卷全部是新檔，無任何既有檔被修改）；`git status --porcelain` 只有 `assets/creatures/boartusk.{json,glb,claims.json}`、`docs/experiments/2026-09-04-creature-boartusk-{hero,stage-lit,front,n3}.png`、`docs/experiments/2026-09-04-ref-boartusk.md`（＋收工前已刪的 `.tmp/`） | ✅ |

## ③ 盲讀原話全文（context-free `sonnet`，只給 hero＋stage-lit）

四題逐字（與 `2026-09-04-harden2A-report.md` §② 問法甲一字未改、未加提示）：
> 1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？

### 第 1 輪（版本 r5：腿較細、軀幹較淺）——特徵 4/5

**讀者 A**
> 1. 一隻低多邊形（low-poly）風格的**野豬／山豬**型 3D 生物模型，戴著類似項圈的**獠牙飾環**…
> 2. －頭部左側伸出**一對彎曲長獠牙**，白／米色，尖端朝上勾起（imgA-2 中獠牙邊緣有明顯白色高光/發光描邊）／－口鼻部前端有一塊獨立深紫棕色的「**鼻墊**」造型，方形帶弧角／－額頭中央、雙眼中間有一顆圓形深棕色凸起（像鼻環釘或第三眼球狀物）／－**頸部到肩膀有一圈由多片白色尖刺狀甲片組成的項圈**，環繞頸部一整圈，下緣還垂有幾片較長尖刺／－項圈內側／喉部下方可見一小段藍色與紅色的縫隙材質／－**背脊從肩部到臀部有一整排黃橙色鬃毛，呈尖刺狀豎立、前短後長排列**／－全身軀幹與四肢為深灰紫／近黑色，**四肢細長**、末端呈黑色蹄狀，共四足站立／－整體造型為低多邊形平面拼接風格，面與面交界稜角分明
> 3. 兇悍、野性中帶點**神獸／魔物感**——獠牙、尖刺項圈與鬃毛的組合給人「戰鬥用坐騎」或「野獸型敵人」的氣勢，深夜場景…更添一股邪異、**儀式感**的氛圍。
> 4. 偏向威嚇／兇猛一路，不走可愛路線…不過 low-poly 的幾何造型讓它同時帶點**卡通化**、遊戲角色式的親和感…比較像「拿來當強敵/夥伴」的風格化猛獸，而非討喜的玩具公仔。

**讀者 B**
> 1. 一隻四足獸形的低多邊形（low-poly）風格 3D 生物模型，**體態近似野豬／疣豬**，帶有明顯的巫術／圖騰化裝飾配件。
> 2. －頭部左右各有**一對細長彎曲的白色/象牙色獠牙，從嘴部兩側向上翹起**…／－**口鼻部（吻部）呈方形切面**、深咖啡色，鼻樑上有一顆圓形橙棕色凸起（像鼻環或釘飾）／－**脖頸至肩膀處環繞一整圈白色尖刺項圈**，尖刺朝外呈放射狀排列，圍成完整一圈項鍊/頸甲的樣子／－**背脊從頭頂延伸到背部中段，覆蓋一整排橙黃色鬃毛狀尖刺**，越往後排列越密、越高／－軀幹呈深灰紫／深棕色，表面為低多邊形平面拼接／－**四肢細長**、末端為深黑色蹄狀造型／－頸圈內側可隱約看到一小塊藍色與紅色的色塊／－眼部區域被吻部造型和獠牙遮擋，未見明顯眼球細節
> 3. **陰森、原始、帶儀式感**——像是被裝飾過的祭祀用野獸或**圖騰化的妖怪**，介於野蠻與神秘之間，低多邊形的粗獷塊面又添了一種樸拙的**圖騰木雕感**。
> 4. 偏向威嚇：獠牙、尖刺項圈與鬃毛的組合、深色軀體加上暗色調背景，整體讀起來是「有攻擊性的猛獸/妖獸」，而非討喜可愛的造型。

**第 1 輪判定**：①②③④⑤ 中 ②「野豬體型（四肢粗短）」**0/2**——兩位不約而同寫「**四肢細長**」，且無人提到肩峰。其餘四條 2/2。**4/5**。

### 第 2 輪（版本 r6：腿加粗、軀幹加深、蹄加大、鼻盤放大）——特徵 5/5

**讀者 C**
> 1. 一隻低多邊形（low-poly）風格的**野豬／山豬**類 3D 生物模型，四足站立，明顯偏向「怪物化／魔物」野豬造型。
> 2. －頭部（左側）：**深紫褐色寬吻部，方正塊面感，鼻頭前端有一顆凸起的褐色鼻瘤（獠豬鼻）**／－**口鼻兩側各伸出一對彎曲的白／米色長獠牙，上下交錯，尖端朝外上翹**／－額頭到眼睛上方：一撮短的深色角狀凸起（像一對小角或硬毛簇），**眼睛位置有暗色小突起**但不明顯外凸／－**頸部後方到肩胛：一整圈由白色尖刺／獠牙狀骨片組成的項圈，呈放射狀環繞脖子一圈，像刺蝟項鍊**／－**背部從肩到臀：一整排橙黃色、尖銳硬直的鬃毛／鬣刺，由短漸長向後倒伏，貫穿背脊中線，類似公豬鬃毛但更誇張**／－身軀：**厚實箱型**的深棕紫色軀幹／－**四肢：四條粗短的深灰／近黑色腿，蹄部呈方塊狀**，站姿穩重／－圖2：頭部獠牙與角部位有明顯白色描邊光暈
> 3. 兇悍、**原始**、帶野性威嚇感；不精緻可愛，走的是「魔物／妖獸」路線——渾厚笨重的軀體加上一堆尖刺獠牙，給人一種蓄勢待衝撞的壓迫感，而非溫馴家畜的感覺。
> 4. 偏向威嚇型，不是玩具可愛路線…整體給人的第一印象是「危險的野獸」而非「討喜的吉祥物」。

**讀者 D**
> 1. 一隻類似「**山豬／野豬**」造型的怪獸/野獸型 3D 模型，低多邊形（low-poly）風格的遊戲素材。
> 2. －頭部有**一對細長彎曲的白色獠牙，從口部兩側向上翹起**（左側頭部前方最明顯）／－口鼻上方有一對淡白色、發光似的長角/耳朵狀突起，頂端泛白光暈／－**脖頸至下顎一圈環繞著多根白色尖刺，呈項圈狀排列**／－**背部從肩膀延伸到臀部有一排橘黃色、火焰／鬃毛狀的尖刺，前低後高、逐漸變長**／－**軀幹呈厚實的箱型/桶狀**，深紫黑色帶淺紫灰漸層／－**四肢為粗短的黑色柱狀腿，共四足，腳掌呈方形塊狀**／－**眼睛部位以一顆橘褐色圓球代表，鑲嵌在頭側**／－頸圈內側可見一點藍色/暗紅色線條
> 3. **陰沉**、兇悍、帶點**神話/圖騰**感——像是廟會陣頭或妖怪傳說裡的**守護獸**，沉重而有壓迫感。
> 4. 偏向威嚇型：深色調、獠牙與尖刺配置、厚重箱型軀幹讓它看起來像 defensive/aggressive 的戰獸，而非可愛的吉祥物。低多邊形的簡潔切面雖然帶**一點卡通感**，但整體造型仍以「震懾」為主軸，不是走萌系路線。

### 特徵命中表（命中＝兩位中 ≥1 位主動說出，凍結檔 2026-09-05「特徵命中定義」）

| # | ref 特徵（`2026-09-04-ref-boartusk.md` §三，凍結） | 第 1 輪 | 第 2 輪 | 逐字證據（第 2 輪） |
|---|---|---|---|---|
| ① | 長楔形拱鼻頭＋平截圓盤鼻；眼小、位置高且靠後 | 2/2 | **1/2 ✅** | C「深紫褐色**寬吻部**，方正塊面感，**鼻頭前端有一顆凸起的褐色鼻瘤（獠豬鼻）**」＋「**眼睛位置有暗色小突起**但不明顯外凸」；D 另寫「**眼睛部位以一顆橘褐色圓球代表，鑲嵌在頭側**」（眼命中、鼻盤未點名） |
| ② | 野豬體型：肩峰隆起／頸粗／**四肢粗短** | **0/2 ✗**（兩位都寫「四肢細長」） | **2/2 ✅** | C「身軀：**厚實箱型**的深棕紫色軀幹」＋「**四肢：四條粗短的**深灰／近黑色腿」；D「**軀幹呈厚實的箱型/桶狀**」＋「**四肢為粗短的**黑色柱狀腿」 |
| ③ | 倒豎的背鬃脊（祖靈金落點） | 2/2 | **2/2 ✅** | C「**一整排橙黃色、尖銳硬直的鬃毛／鬣刺**，由短漸長向後倒伏，貫穿背脊中線，**類似公豬鬃毛**」；D「**一排橘黃色、火焰／鬃毛狀的尖刺，前低後高**」 |
| ④ | 外翻獠牙（象牙白、C 形勾、尖端外露、牙根帶褐） | 2/2 | **2/2 ✅** | C「口鼻兩側各伸出**一對彎曲的白／米色長獠牙，上下交錯，尖端朝外上翹**」；D「**一對細長彎曲的白色獠牙，從口部兩側向上翹起**」 |
| ⑤ | 骨牙項圈（環身＋放射彎牙＋深色珠＋紅繩） | 2/2 | **2/2 ✅** | C「**一整圈由白色尖刺／獠牙狀骨片組成的項圈，呈放射狀環繞脖子一圈**」；D「**脖頸至下顎一圈環繞著多根白色尖刺，呈項圈狀排列**」＋「頸圈內側可見一點**藍色/暗紅色**線條」（＝靛藍珠與紅繩） |

**S4 ＝ 5/5**（目標達成，非下限 3/5 的佔位）。
**殘留子項（記錄，非閘門）**：① 的「平截圓盤鼻」四位只有 C 用「鼻瘤／獠豬鼻」逐字點名，另三位寫「鼻墊／方形切面／鼻環釘」——形狀讀出來了、器官名沒讀成「鼻盤」；② 的「肩峰隆起」四位無人點名（讀者一律用「厚實箱型／桶狀」概括整個軀幹，肩高臀低的斜背線未被單獨描述）；耳被 D 讀成「長角/耳朵狀突起」（耳非 ref 清單條目，記錄）。

## ④ 指令原文與實際輸出

```
$ node .tmp/gen.js assets/creatures/boartusk.json
parts: 87  volumes: 6  bristles: 12
  body: seg=[0.2177,0.1848,0.1342] ratio=[0.849,0.726] turn=[2.5,2.8]
  neck: seg=[0.1682] ratio=[] turn=[]
  head: seg=[0.1481,0.1803,0.1154] ratio=[0.822,0.640] turn=[5.5,10.9]
  disc: seg=[0.0953] ratio=[] turn=[]
  LFront: seg=[0.1939,0.2818] ratio=[0.688] turn=[17.9]
  LBack: seg=[0.1758,0.2620] ratio=[0.671] turn=[18.9]

$ node tools/anyCreature/engine/cli.js assets/creatures/boartusk.json tools/anyCreature/out/boartusk/r6b.glb
{"ok":true,"out":"tools/anyCreature/out/boartusk/r6b.glb","bytes":1014692,"verts":14667,"faces":3848,
 "joints":26,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.481}}

$ cmp tools/anyCreature/out/boartusk/r6b.glb assets/creatures/boartusk.glb
（無輸出＝逐位元組相同；第 2 輪盲讀讀者看到的就是這一顆）

$ node tools/anyCreature/harness/judge.mjs assets/creatures/boartusk.glb \
       tools/anyCreature/out/boartusk/judgeF boartusk --spec assets/creatures/boartusk.claims.json
[judge] Spec "山豬牙飾 boartusk (zuling/swarm)" — all claims pass.
   ★ 全程沒有帶 --stage（凍結檔 2026-09-05 主對話記錄：--stage HIGH 只跑 stage=="HIGH" 那 3 條）

（judge 的 boartusk_metrics.json 摘要）
whole.size = [0.562, 1.222, 1.324]      tri = 6954   skinnedMeshes = 14   skins = 1
materials  = hide_body, hide_face, snout_disc, hide_leg, mane_gold, tusk, tusk_root,
             collar_ring, collar_fang, collar_bead, cord_red, eye, mouth_glow, hoof
lum          = {front 47.1, side 41.1, tq 42.8, reartq 33.9, top 77.1}
hi_sat_share = {front 0.0892, side 0.1712, tq 0.1508, reartq 0.2476, top 0.4955}
share(front/side/tq):
  hide_body    0.14059 / 0.46497 / 0.30884    span_ratio 0.5744
  hide_leg     0.23793 / 0.15774 / 0.21006    span_ratio 0.5722
  hide_face    0.08772 / 0.13499 / 0.17776    span_ratio 0.3815
  snout_disc   0.14190 / 0.00969 / 0.04495    span_ratio 0.1720
  mane_gold    0.05423 / 0.13361 / 0.12149    span_ratio 0.4975
  collar_fang  0.12639 / 0.02331 / 0.04364    span_ratio 0.3939
  tusk         0.10746 / 0.03581 / 0.04667    span_ratio 0.2309
  collar_ring  0.06174 / 0.01565 / 0.02335    span_ratio 0.2879
  cord_red     0.01657 / 0.00439 / 0.00204
  hoof         0.01571 / 0.01067 / 0.01225
  mouth_glow   0.00765 / 0.00033 / 0.00188
  eye          0.00106 / 0.00304 / 0.00389
  collar_bead  0.00010 / 0.00332 / 0.00174
  tusk_root    0.00096 / 0.00249 / 0.00145
share_hierarchy@tq = 48.7 : 37.8 : 13.5（目標 60:30:10，tol ±15 → offP 0.113 / offS 0.078 / offT 0.035）
focal_contrast@front(hide_body vs mouth_glow) = 18.4×（門檻 3×）

$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/boartusk.glb tools/anyCreature/out/boartusk/sil6
{"W_over_H":1.07,"fill":0.392,"mass_thirds":[0.155,0.504,0.341],"torso_depth_max":0.87,
 "torso_depth_min":0.15,"mass_contrast":5.73,"leg_fraction":0.302,"turn_count":40,
 "zigzag_alignment":0.95,"front":{"W_over_H":0.5,"fill":0.485},
 "top":{"W_over_H":0.45,"fill":0.55},"hero":{"W_over_H":0.84,"fill":0.49}}

$ node tools/anyCreature/harness/hero.mjs assets/creatures/boartusk.glb tools/anyCreature/out/boartusk/hero6
{"ok":true,"margin":8.5}

$ node tests/tools/creature-shoot.mjs <stage> "glb=boartusk.glb&light=1&fx=1&rim=zuli" idle 8857
{"out":"...","query":"glb=boartusk.glb&light=1&fx=1&rim=zuli","phase":"idle","fps":59.88,
 "calls":21,"loadMs":198,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs <n3> "glb=boartusk.glb&light=1&fx=1&rim=zuli&n=3" idle 8857
{"out":"...","query":"glb=boartusk.glb&light=1&fx=1&rim=zuli&n=3","phase":"idle","fps":59.88,
 "calls":53,"loadMs":190,"particles":132,"errors":[]}

$ git diff --stat HEAD
（空輸出）
```

兩次 `creature-shoot` 的 `errors` 都是空陣列（console 0 error）。`fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**，別拿來當佐證。

**swarm 不穿幫的數字**：模型 x 寬 **0.562**，`creature-preview.html:112,117` 在 `n>1` 時每隻縮 **0.62**、欄距 **1.05** → 佔寬 **0.348**，**相鄰淨距 0.702**；z 幅寬 1.324 不影響橫排（列距 1.35 在 z，n=3 全在同一列）。

## ⑤ 出貨截圖四張

| 檔案 | 尺寸 | 產生方式 |
|---|---|---|
| `docs/experiments/2026-09-04-creature-boartusk-hero.png` | 1024×1024 | `hero.mjs` 原圖直接複製，未裁未調色（盲讀材料之一） |
| `docs/experiments/2026-09-04-creature-boartusk-stage-lit.png` | 660×640 | `creature-shoot.mjs`（`light=1&fx=1&rim=zuli`，埠 8857）原始 1688×780 **只做一次純裁切** `crop(500,20,1160,660)`，沒有縮放、沒有調色（盲讀材料之二） |
| `docs/experiments/2026-09-04-creature-boartusk-front.png` | 512×512 | `judge.mjs` 的 beauty 正視渲染直接複製、未加工。**不是盲讀材料**（K2 只給 hero＋stage-lit），只作識別視角存證 |
| `docs/experiments/2026-09-04-creature-boartusk-n3.png` | 1688×780 | `creature-shoot.mjs` 加 `&n=3` 原圖，未裁切（M-A2 的 swarm 橫排證據） |

## ⑥ 硬化規格逐 volume 實測

`build: "rigid"`、全檔 `smooth_angle: 26`。

| volume | material | faceted | sides | exp | caps | ring_step |
|---|---|---|---|---|---|---|
| body | hide_body | ✅ | 16 | 4.6–4.8 | `["fan","ngon"]` | 0.030 |
| neck | hide_body | ✅ | 16 | 4.6–4.8 | `["none","ngon"]` | 0.024 |
| head | hide_face | ✅ | 14 | 4.6–4.8 | `["none","ngon"]` | 0.020 |
| disc | snout_disc | ✅ | 14 | 4.6 | `["none","fan"]` ★ | 0.022 |
| LFront | hide_leg | ✅ | 10 | 4.6–4.8 | `["none","ngon"]` | 0.026 |
| LBack | hide_leg | ✅ | 10 | 4.6–4.8 | `["none","ngon"]` | 0.026 |

## ⑦ 新陷阱（已逐字寫進 `boartusk.json` 的 `_traps` ⑪⑫⑬）

### ⑪ 短鏈＋外擴斷面的**收尾端 `caps:"ngon"` 固定生翻面三角**，`fan` 全綠
鼻盤（`disc`：2 關節、鏈長 0.095、exp 4.6、sides 14、半徑由 0.070 擴到 0.098）的末端 cap 用 `ngon` 時，`mesh_integrity` 固定回報 1–3 片翻面，`anim_integrity` 三支 clip 各 5 個取樣點全紅（共 16 條 BLOCK）。**六組實測**（`caps` × `ring_step`）：

| ring_step | caps `ngon` | caps `fan` |
|---|---|---|
| 0.016 | bind pose 1 flipped | all green |
| 0.026 | bind pose 1 flipped | all green |
| 0.030 | bind pose 1 flipped | all green |
| 0.038 | bind pose 1 flipped | all green |
| 0.048 | bind pose 1 flipped | all green |

判準：**exp ≥4.6 的超橢圓斷面在短鏈末端一律用 `fan` 不用 `ngon`**。這與 ashcharm ⑨「起始端 `ngon` 在大斷面固定翻面」是同一族的另一端——`ngon` 是把整圈頂點連成一個 n 邊形，超橢圓被擠到「角」上的頂點會讓那個多邊形自交。

### ⑫ 外擴斜率（Δ半徑÷鏈長）> 約 0.4 就翻面，**`ring_step` 救不回來**
同一個 `disc`，固定 `caps:["none","fan"]` 掃 4 種斷面 × 4 種 `ring_step`（十六組）：

| 斷面 (t0 半徑 → t1 半徑) | 斜率 | rs 0.016 | rs 0.020 | rs 0.026 | rs 0.033 |
|---|---|---|---|---|---|
| 0.076→0.100 | 0.36 | root_containment BLOCK（根環超出宿主，另一個問題） | 同左 | 同左 | 同左 |
| 0.080→0.100 | 0.30 | root_containment BLOCK | 同左 | 同左 | 同左 |
| **0.070→0.092** | **0.33** | **GREEN** | **GREEN** | **GREEN** | **GREEN** |
| 0.070→0.104 | 0.51 | 2 flipped | 1 flipped | 1 flipped | GREEN |

修法是**壓斜率，不是調 `ring_step`**——這與 sigui ⑩-① 的「`ring_step` 對翻面單獨無效」一致（那邊實測 0.030→0.060 一片都沒改變）。

### ⑬ `root_containment` 對**軸向傾斜**的子鏈特別嚴，紙上的 0.98× 算式抓不到餘裕
鼻盤軸相對頭軸上仰 27°（`DiscRoot`→`DiscFace` 的 dy/dz ＝ 0.041/0.086）。第一版把 `DiscRoot` 放在頭部 t=0.912 處、t=0 半徑 0.074，紙上算式是「0.074 < 宿主環最大半徑 0.0771 × 0.98 ＝ 0.0756」應該過，實際被判 **29% 外露** BLOCK。原因：`checks.js:244-261` 逐個根環頂點找「離它最近的宿主環心」再比對**那個環**的最大半徑；軸傾斜使根環各頂點落在不同的宿主環上（前緣頂點落到更細的環），所以有效門檻遠比 0.98× 嚴。修法＝把根往宿主內再埋 0.012（z 0.606→0.594）並把 t=0 收到 0.070。

### 額外實測記錄（不是新陷阱，是既有陷阱在本檔的複驗）
- **profile 兩半徑軸向**（ashcharm ⑩／yinyangcoin ⑨-1）：全檔 `frame:"up"`，依 `geometry.js:31-35`（U 的符號固定翻向世界 +X）推得第一欄是 X。**實測驗證**：`whole.size` ＝ [0.562, 1.222, 1.324]，body 最寬處 halfX 0.222×2 ＝ 0.444，對得上 X 而非 Z；水平鏈上第二欄（W 軸）就是世界 +Y（chest halfY 0.286 ×2 ＝ 0.572，配上肩峰高度得出全高）。**照筆記推之外仍編了一次讀 whole.size 才算數。**
- **`colors.arcs` 在「水平鏈＋frame:up」上的 sym 對照**：由 `compile.js:218-223` 推導 `aDeg=360k/16 → fromTop=(450−aDeg)%360 → sym`，得 **sym 0＝背頂(+Y)、90＝兩側(±X)、180＝腹底(−Y)**——與直立鏈的「0＝背、180＝正面」**不同**。sides=16 的可命中格點只有 0/22.5/45/…/180，所以金帶寫 `0–30`（吃 sym 0 與 22.5）、暗腹帶寫 `155–180`（吃 157.5 與 180）。
- **`shading.noise` 的近黑飽和陷阱**（tiger_a ⑤-6）：全檔暗色逐一算過 HSV S——`hide_body` #4a4038 S=0.243、`hide_face` #443a33 S=0.250、`hide_leg` #2e2a26 S=0.174、`hoof` #232323 S=0、腹帶 #262220 S=0.176，全部遠低於 0.5；高飽和額度只給祖靈金背鬃（#c68a35 S=0.732）＋背頂金帶（#a8762a S=0.750）＋靛藍珠（#26356e S=0.655）＋紅繩（#8e2f22 S=0.761）＋兩處暖光。實測 `hi_sat_share@tq` **0.1508**，穩在 claims 的 0.10–0.60 帶內。
- **祖靈氣質不要被拉去陰氣**（xianji ⑥-6）：`eye` `#4a2f0c`／`mouth_glow` `#472d0b`，乘 emissive ×2.8 後約 (207,131,34)／(199,126,31) ＝ **暖琥珀**，全檔不用任何冷光；靛藍次色只放在**小面積**的項圈琉璃珠（ART_BIBLE §2 原文口徑）。姿態是**吻端上抬 27°**＋肩峰為全身最高點，不做垂頭嗅地。四位讀者的祖靈語彙 3/4，無人讀成「鬼／幽靈／腐朽」。
- **swarm 三項**（boat ⑤）：模型 X 0.562 ≤1.2 ✓；`?n=3` `errors:[]` 且相鄰淨距 0.702 ✓；`idle`/`move`/`attack` **一律不寫 `mirror_phase`**——四足獸左右反相會變成小跑步、三隻並排各走各的；同拍時前腳一對、後腳一對同時離地＝奔豬的縱躍步態。
- **`curve` 用來繞曲面排一圈**（balen ㉛）：項圈環身 16 段、放射牙 14 根、靛藍珠 20 顆、紅纏繩 4 段＋紅穗 2 條，位置全部由生成腳本用橢圓參數式算出、**不經過 `around`**，一次就對稱乾淨；背鬃 12 根中線＋11 對側鬃也全是 `curve` 錐刺（不用 `fin`——自由懸掛薄板長寬比 >2 會被讀成手指／觸手，harden3B ⑤-③）。四位讀者一致讀成「尖刺／鬃毛／鬣刺」，無人讀成手指。
- **`part_attachment`（容差 0.015×modelH ＝ 0.0183）**：背鬃基座刻意埋進體表 0.030、項圈放射牙起點放在頸半徑的 **0.86×**（埋在頸內）、獠牙基座壓在吻部表面內側、尾巴起點埋在臀內——87 個 part 沒有一個被擋。
- **`mirrorName` 的 L 開頭陷阱**（bow ⑧-1）：以 L 開頭的關節只有 `LFront*`／`LBack*`（四肢，本來就要鏡射）與 `LEar`（鬆散關節，自動長出 `REar` 孿生）；軸向關節一律避開 L 開頭（用 `Rump`／`Barrel`／`Chest`／`Withers`／`NeckRoot`／`NeckMid`／`HeadRoot`／`Skull`／`Muzzle`／`Nose`／`DiscRoot`／`DiscFace`）。

## ⑧ 每輪改動

| 輪 | 改了什麼 | 為什麼 | 結果 |
|---|---|---|---|
| r1 | 初版：4 段軀幹＋短粗頸＋長楔頭＋鼻盤／12 根中線背鬃＋11 對側鬃／下獠牙 5 段 rise 累計 105°＋牙根＋上獠牙／項圈 16 環身＋14 放射牙＋20 珠＋紅繩紅穗／`type:eye` host+spread 擺位 | 依 ref 五條特徵直接建模 | `cli` 16 條 BLOCK：鼻盤 ngon cap 翻面 → 新陷阱⑪ |
| r2 | 鼻盤改 `ring_step` 0.026；軀幹加深加大、腿變細、頭加粗、獠牙放大 12%、眼改 `anchor` 貼表面、鼻盤壓暗 #4a3b36、牙根縮小壓暗 | r1 judge 兩條 BLOCK：`snout_disc` 側視 0.39%<0.6%、`share_hierarchy` 40:47:13（secondary 超標 17）。**沒有動門檻，只動實作** | judge all pass，但 offP 0.1452 只差 0.005 撞 tol |
| r3 | 腿再細一階、軀幹再加深 | 給 `share_hierarchy` 留餘裕 | offP 0.113；全高 1.213 |
| r4 | 整體降重心：軀幹下沉加深、腿縮短加粗、鼻盤壓暗、牙根縮小 | r3 戲台圖讀起來像「駝鹿踩高蹺」——軀幹小、腿細長 | 仍偏瘦長 |
| r5 | 頭改連續收窄的楔形（去掉前段等粗的「板」）、頭鏈整體後移縮短、**加一對直立耳**、眼放大到 0.029、鼻盤上仰 27° | 側視 beauty 顯示頭是方盒、脖子細、耳缺席 | 鼻盤斜率拉到 0.51 → 又翻面 → 新陷阱⑫；壓回 0.33 後全綠。**第 1 輪盲讀 4/5**（②「四肢細長」0/2） |
| **r6（出貨）** | **腿加粗約 1.6×**（root 半徑 0.058→0.072、hoof 0.026→0.038）並外移避開 `limb_clearance`；**軀幹加深**（chest halfY 0.250→0.286、鼻盤外的整條下沉）使腹線降低、腿變短（`leg_fraction` 0.353→**0.302**）；蹄加大；鼻盤放大（側視 share 0.0097） | 第 1 輪兩位一致寫「四肢細長」——ref 特徵②的字面反面。**這是實作問題不是門檻問題**，改的是腿與軀幹 | `cli` all green、judge all pass（offP 0.113）、**第 2 輪盲讀 5/5** |

**驗收條件全程未動**：`boartusk.claims.json` 在**看到任何數字之前**寫定，之後**一個位元組都沒改**（六輪都拿同一份跑）；`docs/experiments/2026-09-04-ref-boartusk.md` 的五條特徵在寫 JSON 前定稿、此後一條未增刪改。r1→r6 的每一次修正都落在**模型幾何／配色**上，沒有任何一次是調門檻、換案例集或改判準。

## ⑨ 已知殘留與待裁定

1. **側視 W/H ＝ 1.07**（祖靈記錄目標 ≤0.7）。四足長身獸的 `silmetrics.side` 量的是 max(x,z)/H，本檔 z 幅寬 1.324 > 全高 1.222，結構上不可能 ≤0.7 而仍是四足野豬。**09-05 使用者裁定已把這條撤回為記錄項**（剪影三秒測試降為監測），故不視為未達；祖靈的「垂直線條主導」由**倒豎背鬃**（swarm 例外條款「每隻帶一根垂直物」）承擔，四位讀者 4/4 讀出。
2. **「平截圓盤鼻」四位只有 1 位逐字點名器官**（C「鼻瘤／獠豬鼻」），其餘寫「鼻墊／方形切面／鼻環釘」——形狀讀到了、名稱沒讀成鼻盤。屬同族的表面/器官命名風格牆（tiger_c 白毛邊、ashcharm 香灰、yinyangcoin 錢緣凸邊）。特徵①依「≥1/2」定義已命中，**列記錄不列回修**。
3. **「肩峰隆起」四位無人單獨點名**（都用「厚實箱型／桶狀」概括整個軀幹）。機械上肩峰頂 y≈0.950 vs 臀頂 y≈0.732、落差 0.218 在案。要讀出來得把背線做成折角，但那會撞到「倒豎背鬃沿整條背脊」（鬃毛正好蓋住背線）。**建議記錄不回修**，理由同 chair 的「三腳被讀成四腳」——低多邊形下數量與局部高低差不可靠。
4. **氣質的「陰沉」首詞（讀者 D）**：K3-d 依「≥1/2 命中且不以陰森為主詞」判 PASS（C 全句無陰森詞、D 的祖靈語彙緊接其後且結論是「守護獸」），但據實記錄 D 的第一個形容詞是「陰沉」。**若主對話認為口徑要更嚴**，可排硬化批只動配色（背鬃金再提亮一階／軀幹底色往大地褐推、腹帶不動），**不要動獠牙與項圈**（現為 2/2）。
5. **卡通感提及 1/2**（D「一點卡通感」、第 1 輪 A「帶點卡通化」，兩位都自行歸因給低多邊形渲染本身，與凍結檔 17:30 修訂同向）。Q4 依 09-05 凌晨裁定只作風格牆記錄項，四位主印象無一是可愛／玩具。
