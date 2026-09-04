# 3D 量產卷批 1 — `boat` 拼板舟（zuling／swarm）回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（門檻一格未動；`saturation_area` 用該檔指定的 10–60% 帶）。
簡報列：`docs/experiments/2026-09-04-creature-briefs.md` 第 20 行 `boat`。
基準：worktree `agent-aabbf995dd65f70ba`，起點 `e150ad4`。**未 commit、未 push。**
出貨檔：`assets/creatures/boat.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-creature-boat-{hero,stage-lit,n3}.png`。

---

## ① M-A0～M-A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| M-A0 GLB 規格 | **PASS** | 154.2KB ≤ 400KB；`idle`／`move`／`attack` 三支；`skins`=1、`COLOR_0` 有、0 貼圖；`judge.mjs --spec` **all claims pass**；silmetrics 側視 W/H 2.10 一眼是船 |
| M-A1 盲讀 ×2 | **PASS（第 3 輪過；前兩輪未過，原話全列在 ②）** | 兩位 context-free 讀者都主動說「一艘小船／獨木舟」；主印象是「神秘／儀式感／亡靈船／不祥」，兩位都明說**不是**可愛玩具 |
| M-A2 體型（swarm） | **PASS** | `?n=3` 橫排截圖已出且不穿幫；模型寬 1.004 × preview 縮放 0.62 = **0.622**，欄距 1.05 → 相鄰兩隻淨距 **0.428**（>0 即不相交） |
| M-A3 發光材質名 | **PASS** | GLB materials＝`hull_body, fin_fly, bone, socket, eye, glow_prow, gold, lash`，簡報指定的 `eye`／`glow_prow` 原樣在列 |
| M-A4 範圍 | **PASS** | `git status --short` 只有自己的 7 個新檔（3 個 asset＋3 張截圖＋本報告）；`git diff --stat HEAD` 空的（既有檔案一個位元組沒動） |

**不算通過的地方（誠實條）**：M-A1 的**前兩輪都沒過**——第 1 輪兩位都讀成「小飛船／飛艇」，第 2 輪兩位都讀成「生物的頭部／鯨鯊／甲蟲」。第 3 輪是照 anyCreature 鐵律 3（同症狀連兩輪失敗＝概念重啟）改骨架比例＋拿掉舷上鋸齒＋加船槳之後才過的。詳見 ⑤。

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給兩張圖，檔名遮成 v1/v2、w1/w2、x1/x2，路徑不含 boat 字樣）

問法固定三題：「1. 這是什麼？ 2. 它的氣質是什麼？ 3. 它像玩具／可愛的東西，還是像會威嚇你的東西？」

### 第 1 輪（r10：大後掠胸鰭、封閉甲板）— **未過**

**讀者 A**
> 1. 這是一個黑金配色的低多邊形風格生物／載具——像蝠鱝(魟魚)造型的小飛船，兩側翼尖各有一根彎角，中央有燈籠般發光的黃色核心。
> 2. 氣質偏神秘、帶點異教／儀式感的科幻風，暗色調搭配金色細節，讓它顯得低調而有威嚴，像來自異世界的獵手座駕。
> 3. 介於兩者之間但更偏向會威嚇你——尖角、暗色調與詭異的發光眼睛讓它有壓迫感，不算可愛玩具，但流線的圓潤外型也不到純粹恐怖的程度。

**讀者 B**
> 1. 這是一艘小型飛船／飛艇造型的物件——黑色船身，兩側各有一根像牛角般彎起的裝飾（一金一銀），中段有排列的鰭片和一片機翼，前方還有個發光的圓形核心。
> 2. 帶點魔幻機械感，介於「精靈船」與「昆蟲/甲蟲」之間的氣質——尖角俐落、色調深沉（黑配金銀），第二張圖在暗紫夜空與紅色地面襯托下更添神秘、儀式感。
> 3. 偏向會威嚇你的那一種——尖銳的角、深色調和發光核心給人一種不好惹、帶攻擊性的感覺，不太像可愛玩具。

→ 主印象那條過（兩位都否定玩具），但「這是什麼」讀成**飛船／飛艇**，不是舟。**判定 FAIL**。歸因：兩片大後掠鰭把整體讀成機翼；封閉甲板沒有「容器」訊號。

### 第 2 輪（r14：挖空艙體＋縮小鰭＋舷上鋸齒）— **未過，且退步**

**讀者 C**
> 1. 這是一隻造型奇特的生物/怪物模型——長得像一個帶尖角、獠牙的頭部或某種鯨魚/鯊魚混合體，兩側有彎曲的角，正面有個發光的眼睛，背脊上有一排尖刺。
> 2. 氣質偏暗黑、詭異又帶點邪氣，第二張圖放在紅色地面搭配深藍夜空與發光粒子，更添一種不祥、儀式感的氛圍。
> 3. 比較像會威嚇你的東西——尖牙、尖刺、發光的眼睛和暗色調讓它顯得有攻擊性、不好惹，不是可愛討喜的類型。

**讀者 D**
> 1. 這像是一隻抽象化的生物頭部或口部特寫——黑金配色、彎角狀的兩片突出物往外翹，中間一排像牙齒／尖刺，還有一個發光的圓形眼睛，帶點機械感或甲蟲/魟魚的造型。
> 2. 氣質偏冷硬、帶點神秘與危險感——尤其圖B放在暗紅色地面配深藍天空的場景裡，發光的黃眼睛和角讓它顯得像是某種夜行獵手或魔物。
> 3. 比較像會威嚇你的東西——尖角、獠牙般的突起加上那顆發亮的眼睛，給人的第一印象是「這東西不好惹」，而不是可愛玩具的感覺。

→ **判定 FAIL**，而且比第 1 輪更遠。兩位一致把舷上鋸齒讀成「牙齒／獠牙／背刺」、把兩端上翹讀成「一對角」，整艘船於是被讀成一顆**頭**。同症狀（讀不出舟）連兩輪 → 觸發概念重啟。

### 第 3 輪／概念重啟（r16＝出貨版）— **PASS**

改的三件事：① 骨架拉長壓低成獨木舟比例、艉翹壓下去只留艏翹當招牌；② **拿掉舷上鋸齒**（第 2 輪的元凶）；③ 加兩對架在舷緣上的**船槳**。

**讀者 E**
> 1. 一艘造型奇特的小船（獨木舟/木筏)，船頭有彎曲上翹的角狀裝飾，船身兩側裝著像魚鰭/船槳的翼片。
> 2. 帶點神秘、異域的氣質——黑金配色加上發光的角狀船頭，在暗紅色場景下更顯得儀式感、有點魔幻或亡靈船的味道。
> 3. 比較偏向會讓人心生警戒的東西——尖角、暗色調與詭異發光細節，不是討喜可愛的類型，更像是某種不祥或神秘載具。

**讀者 F**
> 1. 這是一艘小船/獨木舟造型的物件——船身黑色帶金黃色紋路，船首翹起如角狀，兩側有像船槳或魚鰭的突出物，圖B則把它放在暗紅色星空場景中展示。
> 2. 氣質偏神秘、帶點奇幻/異教感——黑金配色加上發光的船首與星空背景，有種暗夜航行、儀式感的氛圍。
> 3. 比較偏向會威嚇你的東西——尖角、暗色調與詭異的發光眼睛狀裝飾（船身上那個圓形金色圖案）給人不祥、警戒的感覺，不是可愛玩具的路線。

→ 對照 M-A1 三條：兩位都說出「小船／獨木舟」✅（凍結檔寫明讀到船／舟算對）／主印象**不是**玩具或可愛 ✅（兩位都主動否定）／第 3 輪內完成 ✅。**PASS**。

---

## ③ 出貨造型與它跟模板的關係

模板沿用的是**語彙不是造型**：硬轉折（spec `smooth_angle` 30、船身 volume 22）、炭黑底（`hull_body #2d2c2a`，側視中位亮度 34.2/255）＋**一條**高飽和祖靈金色帶落在舟舷、`eye`／`glow_prow` 兩個發光材質、識別視角＝側視。

| 部位 | 做法 |
|---|---|
| 船身 | 單一 `hull` 鏈（SternTip→Stern→Mid→BowBase→BowTip），`frame:"up"`、`sides:16`、`ring_step 0.055`，全部 7 排 profile 都帶 `sharp` |
| **挖空的艙** | 具名凹面斷面 `sections.canoe`（16 點閉合多邊形），k=2/k=6 是舷唇、k=3〜k=5 潛進艙內＝真的凹下去的獨木舟剖面。艙內用 `colors.arcs 0–44 #1b1a18` 塗暗，AO 自己把深度烘出來 |
| 舟舷金帶 | `colors.arcs 44–46 #e8b73c`（只吃到舷唇那一圈頂點）＋一條實體金舷條（`fin`，material `gold`，`around:45`，長 0.6，`conform:false`）。**系別色帶就是這條** |
| 船首畫的眼 | 三層疊在 `t=0.78, around=70`：骨白八角板（`bone`，厚 0.013）→ 黑眼窩八角板（`socket`，厚 0.024）→ 金色發光球（`eye`，size 0.042）。`type:"eye"` 一筆生兩側 |
| **尖翹舟艏（招牌剪影）** | `BowTip` 上的 `curve`，先前傾再 `rise 28/32` 勾起，material `glow_prow`，側視佔比 6.5%、span 0.133 |
| 飛魚鰭 | 一對 mirror 側鏈 `LFin`（3 節），`frame:"up"` → 半寬＝弦長、半高＝厚度，做出薄刃形翼；後掠並略下垂 |
| 船槳 | 兩對 `curve`（`sides:4`，中段 r 撐大成槳面），根埋在艙內、桿跨過舷緣往外下後方伸 |
| 橫樑 | 三根 `lash` 桶形凸多邊形 `fin`，架在舷緣高度橫跨艙口 |
| 艉飾 | `SternTip` 上的矮 `bone` 樁（第 2 輪那根長的被讀成「第二支角」，砍短） |
| 招式「飛魚躍」 | `attack`：`SternTip` `tz` 0→−0.08→**+0.46**、`ty` +0.20（舟身彈起前衝），`Mid.rx` −16° 抬艏，兩鰭 `rz` ±26° 同拍拍打 |

### 比例數字（silmetrics 側視；括號為模板 `tiger_c`）

| 指標 | boat（出貨） | tiger_c |
|---|---|---|
| `W_over_H` | **2.10** | 1.62 |
| `fill` | 0.315 | 0.454 |
| `mass_thirds` | 0.313 / 0.394 / 0.293 | 0.371 / 0.397 / 0.232 |
| `turn_count` | 7 | 30 |
| 模型尺寸 (W,H,D) | **1.004 / 0.831 / 1.735** | — |
| GLB | 154.2KB | 287.8KB |
| 三角形 | 1808 | 2628 |

`turn_count` 只有 7 是這隻的誠實代價：拿掉舷上鋸齒（第 2 輪的元凶）就等於拿掉輪廓上大部分的鋸齒事件，換來的是「讀得出是舟」。swarm 的輪廓本來就要在 3 隻並排時各自乾淨，不能靠碎邊撐。

---

## ④ 指令原文與實際輸出

### M-A0 — 編譯與 GLB 規格

```
$ node engine/cli.js .../assets/creatures/boat.json .../assets/creatures/boat.glb
{"ok":true,"out":".../assets/creatures/boat.glb","bytes":157948,"verts":1793,"faces":1008,
 "joints":11,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.303}}

$ python _glbinfo_tmp.py assets/creatures/boat.glb      # 一次性腳本，量完已刪
{"file":"assets/creatures/boat.glb","bytes":157948,"kb":154.2,
 "animations":["idle","move","attack"],"skins":1,"joints":11,"meshes":1,"primitives":8,
 "materials":["hull_body","fin_fly","bone","socket","eye","glow_prow","gold","lash"],
 "attributes":["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"],"hasCOLOR_0":true,
 "images":0,"textures":0,
 "asset":{"version":"2.0","generator":"anyCreature v1.2.0",
          "extras":{"harness":"anyCreature","harness_version":"1.2.0","spec":"boat"}}}
```

逐條：154.2KB ≤ 400KB ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／`eye`、`glow_prow` 在 materials 裡（M-A3）✅。

### M-A0 — judge 對 spec 全檢

```
$ node harness/judge.mjs .../assets/creatures/boat.glb out/boat/judge_ship boat \
      --spec .../assets/creatures/boat.claims.json
"stats":{"triangles":1808,"skinnedMeshes":8,"animations":["idle","move","attack"]}
"lum":{"front":32.9,"side":34.2,"tq":38.9,"reartq":40,"top":66.6}
"hi_sat_share":{"front":0.2176,"side":0.3048,"tq":0.3027,"reartq":0.3059,"top":0.3282}
"glow_prow":{"share":{"side":0.06495,...,"tq":0.09276},"span_ratio":0.1328}
"hull_body":{"share":{"side":0.68303,"tq":0.62809}}  "fin_fly":{"share":{"tq":0.10443}}
[judge] Spec "拼板舟 boat_pinbanzhou_ling (zuling/swarm)" — all claims pass.
```

各條的實際數字對門檻：`saturation_area` tq **30.3%**（帶 10–60%）／`part_signature` glow_prow 側視佔比 **6.50%**（需 ≥6%）**或** span **0.133**（需 ≥0.12）**兩條路都過**／`focal_contrast` hull_body:fin_fly tq **6.02×**（需 ≥3）／`share_hierarchy` tq **62.8 : 19.7 : 17.5**（目標 60:30:10，容差 ±15%，最大偏離 10.3%）／`style_dark` 側視 **34.2**（需 ≤90）／`tri_budget` **1808**（1500–5000）。

### M-A0 — silmetrics

```
$ node harness/silmetrics.mjs .../assets/creatures/boat.glb out/boat/s16
{"W_over_H":2.1,"fill":0.315,"mass_thirds":[0.313,0.394,0.293],"torso_depth_max":0.46,
 "torso_depth_min":0.3,"mass_contrast":1.55,"leg_fraction":null,"turn_count":7,
 "zigzag_alignment":0.47,"front":{"W_over_H":1.05,"fill":0.221},
 "top":{"W_over_H":0.52,"fill":0.365},"hero":{"W_over_H":1.89,"fill":0.47}}
```

側視 `sil_side.png` 是一條長而低的船身＋左端一支勾起的尖艏，右端只有一顆矮樁——與簡報 D 群其餘 6 個剪影（菱鱗盾板／雷紋雙翼／外翻獠牙／垂地長髮／三腳椅背／縱向斷半身）沒有一個撞形。

### M-A2 — 三張截圖

```
$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-boat-stage-lit.png \
      "glb=boat.glb&light=1&fx=1&rim=zuli" idle 8814
{"out":"...stage-lit.png","query":"glb=boat.glb&light=1&fx=1&rim=zuli","phase":"idle",
 "fps":59.88,"calls":15,"loadMs":195,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-boat-n3.png \
      "glb=boat.glb&light=1&fx=1&rim=zuli&n=3" idle 8815
{"out":"...n3.png","query":"glb=boat.glb&light=1&fx=1&rim=zuli&n=3","phase":"idle",
 "fps":59.88,"calls":35,"loadMs":199,"particles":132,"errors":[]}

$ node harness/hero.mjs .../assets/creatures/boat.glb out/boat/ship   →  hero.png（1024²，margin 8.3%）
```

兩次 `errors` 都是空陣列（console 0 error）。**不穿幫的數字**：模型寬 **1.004**，`creature-preview.html` 在 `n>1` 時每隻縮 **0.62**、欄距 **1.05** → 佔寬 0.622、相鄰淨距 **0.428**；截圖上三隻各自獨立、影子不重疊。

### M-A4 — 範圍

```
$ git status --short
?? assets/creatures/boat.claims.json
?? assets/creatures/boat.glb
?? assets/creatures/boat.json
?? docs/experiments/2026-09-04-creature-boat-hero.png
?? docs/experiments/2026-09-04-creature-boat-n3.png
?? docs/experiments/2026-09-04-creature-boat-report.md
?? docs/experiments/2026-09-04-creature-boat-stage-lit.png

$ git diff --stat HEAD
（空）
```

七個全新檔（六個出貨物件＋本報告），沒有任何既有檔被改。`index.html`／`js/`／既有 creatures／anyCreature 引擎一個位元組都沒動。
（過程中在 worktree 內建過一個 `tools/anyCreature` junction 借主樹的 `node_modules` 給 `creature-shoot.mjs` 用——`tools/anyCreature/` 在 `.gitignore` 裡，用完已移除；另有一次性的 `_glbinfo_tmp.py`，量完已刪。）

---

## ⑤ swarm 可複用寫法（其餘 6 隻 swarm 直接照抄）

1. **骨架**：主鏈水平臥、`frame:"up"`，模型高壓在 **0.85 以下**、側視 `W_over_H ≥ 1.8`。`creature-preview.html` 的 `n>1` 版面是每隻縮 0.62、欄距 1.05，**含配件總寬務必 ≤ 1.2**（＝縮完 0.74，還留 0.3 的淨距）；本檔實測寬 1.004。左右對稱靠**一對 `mirror` 側鏈**（本檔 `LFin`），側鏈用 `frame:"up"` 時半寬＝弦長、半高＝厚度，可以直接長出薄刃形翼／鰭／槳。
2. **動畫**：swarm 的 `move`／`idle` **不要寫 `mirror_phase`**——兩側同拍才讀得出「一群同款」；交錯相位會讓 3 隻並排看起來像各走各的。`attack` 用**根關節的 `tz`** 一次推整艘（本檔 +0.46，超過 body span 的 15%＝0.26），`attack_reach` 就過，不必扭肢體。
3. **色帶**：高飽和系別色只用 **`colors.arcs` 的縱向分帶**（角度會吸附到 360/sides 的格，`sides:16` ＝ 22.5° 一格；`sym` 值就是 0、22.5、45… 這些整數，`from`/`to` 要卡在它們兩側）＋**一條實體 `fin` 色條**當主要載體；不要用 `fin` 貼片做橫紋，也不要把整片側身塗成色帶（第 1 輪的教訓：45–90 的金帶等於整面金，讀成香蕉）。

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎陷阱（附件之外新發現的四條）

1. **凹面具名斷面（`sections`）＋`caps:"dome"`＝ bind pose 必翻面**。挖空的艙體要用 `sections` 才做得出來（貼圖與塗色都沒有辦法把凹面放進剪影），但 `dome`／`ngon` 端蓋是對著環做扇形三角化，遇到凹進去的那一段一定生出**恰好 2 個翻面三角形**（每端 1 個），`mesh_integrity` 與 `anim_integrity` 會一路 BLOCK。解法：`caps: ["none","none"]`，兩端本來就收成 0.02 的針尖、又各有一個 `curve` 部位插在那裡，看不到洞。
   **另一條試過但不可行的路**：只讓中段用凹面斷面、兩端用超橢圓——`section` 在相鄰兩排之間是**吸附不是內插**（`compile.js:74`），交界處會硬跳，實測翻面從 2 個惡化到 **17 個**。
2. **矩形 `fin` 永遠過不了 `part_attachment`**。那條檢查是「取所有頂點中，離最近 ring 圓心的距離 − 該 ring 最大半徑」的**最小值**，而矩形只有 4 個角頂點、全都在最遠端。橫跨艙口的橫樑一開始怎麼調高度都被判浮空（0.021–0.036 clear，容差 0.012）。解法：把外框改成**中間帶頂點的桶形凸多邊形**（`[[-L,-w],[-0.3L,-w-0.005],[0.3L,-w-0.005],[L,-w],[L,w],[0.3L,w+0.005],[-0.3L,w+0.005],[-L,w]]`），中段那兩對頂點離軸線很近，一次就過，而且外觀幾乎不變。
3. **`fin` 不帶 `anchor` 時 `offset` 才有效**（`compile.js:464-467`：`o = host + offset`，但 `if (p.anchor) o = sp.p` 會整個覆蓋）。要把板子放在「表面上某一點以外」的地方——例如架在艙口上方而不是貼在艙壁上——只能放棄 `anchor`、改用 host＋offset 自己算世界座標。
4. **部位不能離開宿主**。想把槳葉做成獨立的 `fin` 掛在槳桿末端是行不通的：`part_attachment` 要求**每一個部位**自己都要碰到宿主 volume，槳葉離船身 0.3 以上一定 BLOCK。槳葉只能長在同一條 `curve` 上（把中段的 `r` 撐大、`sides:4` 做成菱形棱柱），這也是為什麼本檔的槳是「一根中間鼓起來的桿」而不是「桿＋葉」。

---

## ⑦ 沒做到 / 留給主對話裁定的事

1. **前兩輪盲讀是真的沒過**，不是流程瑕疵。第 3 輪才過，額度剛好用完。若主對話覺得「小船／獨木舟」還不夠貼近「拼板舟（達悟族 tatala）」，那要補的是**塗裝語彙**（tatala 的白底黑紅人形紋／同心圓太陽紋），而那些在 `colors.arcs` 只能做縱向分帶的限制下做不出來——需要另開貼圖層，超出本卷範圍。
2. **`turn_count` 只有 7**（tiger_c 是 30）。原因寫在 ③：舷上鋸齒是第 2 輪被讀成「牙齒」的元凶，拿掉之後輪廓事件就少了。這是拿「輪廓碎度」換「讀得出是舟」的取捨，主對話若要求 swarm 也要有高 `turn_count`，這兩件事在這個造型上是衝突的。
3. **`share_hierarchy` 與 `focal_contrast` 用的是 `tq` 視角不是預設的 `side`**（理由寫在 `boat.claims.json` 的 `_role`：船是一整塊主體，側視只看得到舟舷一條線，量不到胸鰭與橫樑的真實佔比）。容差維持預設 0.15、`focal_contrast` 的 `min_ratio` 反而從 2 提高到 3，另外多加了一條 `style_dark`——**沒有一處放寬**。
4. **沒有量效能、沒有接進正式對決**。M-A0～A4 沒有要求，就沒做；`creature-shoot` 順手回報的 `fps` 是無頭 chromium 的 vsync 上限（59.88），不是效能數字，別拿來當佐證。
