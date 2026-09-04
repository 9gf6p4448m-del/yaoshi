# 3D 量產卷批 2 — `shield` 百步蛇紋盾（zuling／ward）回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4 一格未動；`saturation_area` 用該檔指定的 10–60% 帶）。
美術權威：`docs/design/ART_BIBLE.md`（`ff0c8e0`，明文優先於凍結檔的美術守則）——出貨版是照它重做的。
簡報列：`docs/experiments/2026-09-04-creature-briefs.md` 第 16 行 `shield`。
基準：worktree `agent-a01b01226d7ab645f`，起點 `86d101a`。**未 commit、未 push。**
出貨檔：`assets/creatures/shield.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-creature-shield-{hero,stage-lit,front}.png`。

**做的過程中美術方向被改了三次**（① 妖怪化守則 ② 祖靈／香火改走神性威嚴 ③ ART_BIBLE 落地），三次都是加嚴或換文法，**沒有任何一次是我放寬門檻**；每次都從當時的狀態往新標準套，最後整份造型依 ART_BIBLE 祖靈段重做。M-A1 的 3 輪額度在 ① 之後的造型上用盡且未過，ART_BIBLE 版另做了 1 輪**額度外**的參考盲讀，也未過——詳見 ②。

---

## ① M-A0～M-A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| M-A0 GLB 規格 | **PASS** | 210.6KB ≤ 400KB；`idle`／`move`／`attack` 三支；`skins`=1、`COLOR_0` 有、0 貼圖；`judge.mjs --spec` **all claims pass**；silmetrics 正面（識別視角）W/H 0.77、側視 0.46＝一片薄牆，hero margin 8.1% 無裁切 |
| M-A1 盲讀 ×2 | **未過（3 輪額度用盡，另加 1 輪額度外參考輪，共 8 位讀者）** | 8 位裡 7 位主印象落在「威嚇／危險／莊嚴／遠古守護者」，但**四輪各有一位寫出「可愛」**（笨拙的可愛感／奇幻寵物的可愛感／圓潤討喜像玩具公仔）。依 2026-09-04 使用者指示「可愛不得出現在任何一位讀者的主印象」判未過。原話全列在 ② |
| M-A2 體型（ward） | **PASS** | 正面寬 **0.904** ≥ 側面寬 **0.582**（＝**1.55×**）；等高剪影另一組數字：正面 W/H **0.77** vs 側視 W/H **0.46** ＝ **1.67×**。ART_BIBLE 要求的「側視 W/H ≤ 0.7」也達成（0.46）。證據圖 `-front.png` 與 `sil_side/sil_front` |
| M-A3 發光材質名 | **PASS** | GLB materials＝`plate_body, scale_head, tail_coil, scale_leg, bone, wood_post, glow_scale, eye, pupil, scale_plate, fang, paw_claw`；簡報指定的 `eye`／`glow_scale` 原樣在列（顏色依 ART_BIBLE 從金改成靛藍） |
| M-A4 範圍 | **PASS** | `git status --short` 只有自己的 7 個新檔；`git diff --stat HEAD` 空的（既有檔案一個位元組沒動） |

**不算通過的地方（誠實條）**：
1. **M-A1 四輪都沒過**。出貨的 GLB 就是第 4 輪兩位讀者實際看到的那一版，**沒有在盲讀之後再改一版當作通過**。四輪 8 位讀者指向同一個根因（見 ② 末），修法我列在 ⑦-1，需要主對話裁定要不要開回修。
2. `part_signature` 的 `min_share` 那一路**沒過**（`glow_scale` 正面佔比 6.63% < 7%），是靠同一條 claim 本來就寫好的 `or_min_span` 那一路過的（span 0.373 ≥ 0.15）。門檻沒動，但這件事要講明。
3. `saturation_area` 落在 **44.3%**（帶 10–60%），偏上緣。原因是 ART_BIBLE 的祖靈主色是大地褐（`#8b6040`，HSV S 0.54，本身就算「高飽和」），不是中性色；我已把支撐面（骨柱、木柱、蛇身）全部降飽和度到 S<0.4 才壓到這個數字。若主對話認為 ward 該更接近 30%，只能再減窄藤編褐帶。

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給 hero＋stage-lit 兩張，檔名遮成 r?-A/r?-B、路徑不含 shield／snake 字樣）

問法固定三題：「1. 這是什麼？ 2. 它的氣質是什麼？ 3. 它像玩具／可愛的東西，還是像會威嚇你的東西？」

### 第 1 輪（高板身＋小蛇頭＋放射狀骨刺）— **未過（1/2）**

**讀者 A**：「長獠牙、龜殼/貝殼狀背甲的**裝甲海象怪獸**」／「厚重、堅硬、帶點機械感的防禦型野獸」／「偏向會威嚇你……不過**造型圓潤卡通化**」
**讀者 B**：「背著滿是尖刺**盾牌狀甲殼**的甲蟲／穿山甲類生物」／「沉重堅硬的鎧甲感，有點**神秘威嚴**，像遊戲裡的**守護型怪物**」／「偏向會威嚇你的東西……不太有可愛感」

→ B 過；A 讀成海象並點名圓潤。**FAIL**。歸因：頭太小、板身太高太厚＝背甲；兩根下垂長牙＝海象牙。

### 第 2 輪（加長 S 頸、扁平楔形蛇頭、短牙、扁腳掌）— **未過（0/2）**

**讀者 C**：「帶尖刺甲殼的生物，像穿了盔甲的**爬蟲／龜類怪獸**」／「兇悍、粗獷的野性感……神祕、危險」／「比較像會威嚇你的東西……不算可愛」
**讀者 D**：「**甲蟲／穿山甲**類的生物，有帶尖刺的巨大甲殼和探出來的小頭」／「機械感又帶點礦石感……『裝甲兵器』的冷硬感」／「偏會威嚇……但體型和小頭又帶點**笨拙的可愛感**」

→ **FAIL**（D 出現「可愛」）。同症狀連兩輪 → 觸發概念重啟。

### 第 3 輪／概念重啟（低寬板身＋頭頸佔全高 43.9%＋平行外指刺牆＋頂角骨角）— **未過（1/2）**

**讀者 E**：「像蠍尾龜或帶尖刺甲殼的**爬行怪獸**，長脖子加獠牙頭部」／「暗黑奇幻……華麗又**危險**……**詭異**氛圍」／「更偏向會**威嚇**你的」
**讀者 F**：「類似烏龜／蠑螈的長頸生物，背上是有稜有角、鑲著發光菱形寶石的硬殼」／「神秘、**遠古守護者**的氣質」／「偏威嚇一點——但**圓潤的頭部造型**和發光寶石又帶點奇幻寵物的**可愛**感」

→ E 過；F 的「這是什麼」與「氣質」命中最深（遠古守護者），但 Q3 出現「可愛」。**FAIL，凍結檔的 3 輪額度用盡。**

### 第 4 輪（ART_BIBLE 落地後整份重做；**額度外，僅作為新方向的參考數據，不主張它讓 M-A1 通過**）— **未過（0/2）**

**讀者 G**：「黑頸、龜殼/木盾狀身軀的怪獸，殼上鑲著藍色寶石與尖牙裝飾，像遊戲裡的**頭目級生物**」／「神秘、儀式感，偏陰暗奇幻……更顯**莊嚴**詭譎」／「偏向會威嚇——尖牙環繞脖子很有壓迫感，但**圓潤的殼身和大眼睛**又帶點**可愛**」
**讀者 H**：「帶**盾牌狀軀幹**與尖刺、蛇頸恐龍頭的奇幻怪物」／「帶點**威嚴**又有點笨拙——防禦性強、像穿著鎧甲的**守衛**，但體態**圓滾滾**又有幾分滑稽」／「外形**圓潤討喜像玩具公仔**，但滿身尖刺獠牙又帶著要嚇阻你的氣勢」

→ **FAIL**。但「這是什麼」與「氣質」兩題在這一輪明顯進步：兩位都讀到**盾／守衛／莊嚴／威嚴**（凍結檔要的「盾／守護獸」與祖靈口徑要的「威／莊嚴」都命中了），卡的只剩 Q3 的「圓潤」。

**四輪 8 位讀者的共同根因（這是最重要的一段）**：沒有一位說「不夠兇」，全部指向**體積塊面太圓潤**——「造型圓潤卡通化」「圓潤的頭部造型」「圓潤的殼身」「體態圓滾滾」「像玩具公仔」。這與猛虎 look-dev 報告 ⑤-3 記的是同一條系統性上限。在不動引擎與渲染的前提下我把能推的都推了（`smooth_angle` 24＝守則允許的最硬端、斷面 `exp` 3.2–3.4、頭頸佔全高 47.6%、支撐面全降飽和），**剩下的是「超橢圓斷面在低多邊形下本來就沒有硬角」**。修法見 ⑦-1。

---

## ③ 出貨造型（依 ART_BIBLE 祖靈段的四件事）

| 聖經要求 | 這隻怎麼做 |
|---|---|
| **剪影：修長、垂直線條主導**；ward 的正面寬用「多根垂直圖騰柱排成一面牆」 | 台座只有 0.415 高，寬度靠**六根高低不一的垂直柱**（內側骨柱高 0.494、中間木柱 0.340、外側骨柱 0.418，各鏡射一對）＋兩條垂直骨襯條；柱子與蛇頸把輪廓拉成一排直線。全模型 W/H **0.77**（正面）、側視 **0.46**（聖經要求 ≤0.7） |
| **主色：大地褐＋靛藍次色＋極少量赤紅** | 台座底色中性炭黑 `#2a2825`，藤編褐帶 `#8b6040` 只落在正面兩條縱帶；靛藍走發光材質（`glow_scale #3050a0` 的三片菱鱗＋三對琉璃珠、`eye #4668c0` ＋黑豎瞳、蛇背一條 `#3050a0` 織紋線）；赤紅 `#8c2b22` 只有正面正中一條窄線（sym 173–180） |
| **材質：風化木／獸骨／藤編／琉璃珠** | 風化木＝`wood_post` 中柱；獸骨＝`bone` 骨柱、襯條、吻端上勾；藤編＝`colors.arcs` 在 `sym` 上排規律窄帶交替（`sides:20`＝每格 18°，做出來就是**垂直條紋**）；琉璃珠＝六顆 `glow_scale` 小球節點 |
| **節奏：靜時如樹、動時瞬發** | `idle` 3.0s、所有軌道 **≤2.5°**（tiger_c 是 3–9°，符合「≤香火一半」）；`attack` **0.46s**（聖經要求 0.4–0.5s） |

其餘沿用凍結檔的模板語彙：硬轉折（spec `smooth_angle` 26、各 volume 24，落在守則的 24–30）、深色底（正面中位亮度 41.2/255）、`eye`／`glow_scale` 兩個發光材質、招牌部位掛正面。

| 部位 | 做法 |
|---|---|
| 台座（編織台） | 垂直 `body` 鏈（Root→Coil1→Coil2→Coil3→Crown），`frame:"up"`、`sides:20`、`ring_step 0.045`、斷面 `exp 2.8–3.2`、`caps:["ngon","ngon"]`。高 0.415、寬 0.892 |
| 圖騰柱牆 | 六根 `curve` 掛在 `Coil3`（x 偏移 0.118／0.252／0.372，都小於該處 half-width 0.44 所以 `part_attachment` 過），高度 0.494／0.340／0.418 錯開 |
| **中軸靛藍菱鱗（招牌）** | 三片 `glow_scale` 菱形 `fin`（host+offset＋`conform:false`），彼此留 0.02–0.05 的縫（相連時 bloom 會糊成一根發光柱，第一版實測） |
| 琉璃珠 | 三對 `glow_scale` 短 `curve` 小球，貼在台座正面 x=±0.168 的縱線上 |
| 骨襯條 | 一對垂直 `bone` 桶形 `fin`（`udir:[0,1,0]`），在 x=±0.286，長 0.352 |
| **百步蛇頭頸** | `head` 鏈 7 節，從台座頂後方以 S 形立起；`Skull` 斷面 `exp 3.4`、寬 0.156 高 0.064＝窄楔形；`SnoutTip` 一支 `bone` `curve` 向上勾＝上翹吻端。頭頸佔全高 **47.6%** |
| **豎瞳** | `eye`（靛藍球，size 0.032）＋同一個 anchor 的 `pupil` 薄片，靠 `thickness 0.066` 讓片子**穿出**眼球，形成黑色縱縫 |
| 腿腳／尾 | 一對 `mirror` 短粗腿＋扁 `paw`（0.200×0.235×0.070）；單條非對稱蛇尾往後外側掃出，全程轉折 ≤36° |
| 招式「鱗紋護體」 | `attack` 0.46s：`Root` `tz` 0→−0.09→**+0.34**＋`rx` −13°（整面台座前推立起），四節頸與 Skull 依序 `rx` +12~16°（蛇頭俯衝），`attack_reach` 由 reach 這條過 |

### 比例數字（silmetrics；括號為模板 `tiger_c`）

> ⚠ silmetrics 的 `side`／`front` 是**依最長水平軸**命名，不是依模型朝向。這隻 X(0.904) > Z(0.582)，所以它印的 `side` 其實是**模型正面**、`front` 是**模型側面**。下表已換算成模型朝向。

| 指標 | shield（出貨） | tiger_c |
|---|---|---|
| 模型尺寸 (W,H,D) | **0.904 / 1.130 / 0.582** | — |
| 正面剪影 W/H | **0.77** | — |
| 側面剪影 W/H | **0.46**（聖經祖靈要求 ≤0.7） | — |
| `fill`（正面） | 0.676 | 0.454 |
| `mass_thirds`（正面） | 0.293 / 0.428 / 0.279 | 0.371 / 0.397 / 0.232 |
| `turn_count` | **32** | 30 |
| `leg_fraction` | 0.120 | — |
| 頭頸高度佔比 | **0.476** | — |
| GLB | 210.6KB | 287.8KB |
| 三角形 | 2000 | 2628 |

---

## ④ 指令原文與實際輸出

（工具在主工作樹 `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/` 執行，輸出寫進本 worktree 的絕對路徑；下面把長路徑縮寫成 `<WT>`＝`C:/Users/shung/OneDrive/桌面/妖市/.claude/worktrees/agent-a01b01226d7ab645f`）

### M-A0 — 編譯與 GLB 規格

```
$ node engine/cli.js <WT>/assets/creatures/shield.json <WT>/assets/creatures/shield.glb
{"ok":true,"out":".../shield.glb","bytes":215612,"verts":2459,"faces":1136,
 "joints":22,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.378}}

$ python _glbinfo_tmp.py assets/creatures/shield.glb      # 一次性腳本，量完已刪
{"file": "assets/creatures/shield.glb", "bytes": 215612, "kb": 210.6,
 "animations": ["idle", "move", "attack"], "skins": 1, "joints": 22, "meshes": 1, "primitives": 12,
 "materials": ["plate_body", "scale_head", "tail_coil", "scale_leg", "bone", "wood_post",
               "glow_scale", "eye", "pupil", "scale_plate", "fang", "paw_claw"],
 "attributes": ["COLOR_0", "JOINTS_0", "NORMAL", "POSITION", "WEIGHTS_0"], "hasCOLOR_0": true,
 "images": 0, "textures": 0,
 "asset": {"version": "2.0", "generator": "anyCreature v1.2.0",
           "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "shield"}}}
```

逐條：210.6KB ≤ 400KB ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／`eye`、`glow_scale` 在 materials 裡（M-A3）✅。

### M-A0 — judge 對 spec 全檢

```
$ node harness/judge.mjs <WT>/assets/creatures/shield.glb out/shield/judge_ship shield \
      --spec <WT>/assets/creatures/shield.claims.json
"stats":{"triangles":2000,"skinnedMeshes":12,"animations":["idle","move","attack"]}
"lum":{"front":41.2,"side":28.1,"tq":44.9,"reartq":19,"top":48}
"hi_sat_share":{"front":0.5315,"side":0.1349,"tq":0.4434,"reartq":0.05,"top":0.3346}
"whole":{"size":[0.904,1.13,0.582]}
plate_body front=0.46211 span=0.8756   scale_head front=0.11711 hr=0.4760
bone       front=0.20022 span=0.8635   wood_post  front=0.04297
glow_scale front=0.06627 span=0.3729   scale_plate front=0.00167
scale_leg  front=0.03782  paw_claw front=0.04736  eye front=0.00383  pupil front=0.00339
tail_coil  front=0.01291  fang front=0.00433
[judge] Spec "百步蛇紋盾 shield_baibushe_dun (zuling/ward)" — all claims pass.
```

各條的實際數字對門檻：
- `part_exists` plate_body／glow_scale／eye — 三個材質名都在 materials 清單裡 ✅
- `part_signature` glow_scale（view front）：share **6.63%**（需 ≥7%，**這一路沒過**）**或** span **0.3729**（需 ≥0.15，**這一路過**）→ 整條 PASS
- `part_visible` scale_head（view front）：**11.71%**（需 ≥4%）✅
- `focal_contrast` plate_body : glow_scale（view front）＝ 46.21% : 6.63% ＝ **6.97×**（需 ≥3）✅
- `share_hierarchy`（view front）＝ **56.4 : 35.0 : 8.6**（目標 60:30:10，容差 ±15%，最大偏離 5.0%）✅
- `style_dark`（view front，最亮的識別視角）：**41.2**/255（需 ≤90）✅
- `saturation_area`（view tq）：**44.3%**（凍結檔的帶 10–60%）✅
- `tri_budget`：**2000**（1500–5000）✅
- `rig_skinned` / `anim_named`：skins=1、三支動畫齊 ✅

### M-A2 — ward 正面寬 ≥ 側面寬

```
$ node harness/silmetrics.mjs <WT>/assets/creatures/shield.glb out/shield/sil_ship
{"W_over_H":0.77,"fill":0.676,"mass_thirds":[0.293,0.428,0.279],"torso_depth_max":0.95,
 "torso_depth_min":0.46,"mass_contrast":2.08,"leg_fraction":0.12,"turn_count":32,
 "zigzag_alignment":0.74,"front":{"W_over_H":0.46,"fill":0.454},
 "top":{"W_over_H":0.65,"fill":0.5},"hero":{"W_over_H":0.59,"fill":0.691}}
```

兩組獨立數字：
1. **模型 bbox**：X（正面寬）**0.904** vs Z（側面寬）**0.582** → **1.55×**。
2. **等高剪影**：silmetrics 兩個正交視角用同一組相機距離與 FOV、模型高度相同，所以 `W_over_H` 直接可比——模型正面 **0.77** vs 模型側面 **0.46** → **1.67×**。
   （silmetrics 的 `side`／`front` 是依最長水平軸命名：本模型長軸是 X，所以它印的 `side` ＝模型正面、`front` ＝模型側面。）

證據圖：`docs/experiments/2026-09-04-creature-shield-front.png`（judge 的模型正面實彩渲染，看得到台座＋六柱一面牆）；`out/shield/sil_ship/sil_side.png`（正面剪影）與 `sil_front.png`（側面剪影＝一片薄牆＋立起的蛇頸）。

### 三張截圖

```
$ node harness/hero.mjs <WT>/assets/creatures/shield.glb out/shield/hero_ship
{"ok":true,"margin":8.1}        →  複製成 docs/experiments/2026-09-04-creature-shield-hero.png

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-shield-stage-lit.png \
      "glb=shield.glb&light=1&fx=1&rim=zuli" idle 8803
{"out":"docs/experiments/2026-09-04-creature-shield-stage-lit.png",
 "query":"glb=shield.glb&light=1&fx=1&rim=zuli","phase":"idle",
 "fps":59.88,"calls":19,"loadMs":261,"particles":44,"errors":[]}

judge 的 shield_beauty_front.png  →  複製成 docs/experiments/2026-09-04-creature-shield-front.png
```

`errors` 是空陣列（console 0 error）。`fps` 59.88 是無頭 chromium 的 vsync 上限，不是效能數字。
**這三張就是第 4 輪盲讀讀者實際看到的那一版**（hero 與 stage-lit 兩張），出貨的 GLB 與它們同一次編譯。

### M-A4 — 範圍

```
$ git status --short
?? assets/creatures/shield.claims.json
?? assets/creatures/shield.glb
?? assets/creatures/shield.json
?? docs/experiments/2026-09-04-creature-shield-front.png
?? docs/experiments/2026-09-04-creature-shield-hero.png
?? docs/experiments/2026-09-04-creature-shield-report.md
?? docs/experiments/2026-09-04-creature-shield-stage-lit.png

$ git diff --stat HEAD
（空）
```

七個全新檔（六個出貨物件＋本報告），沒有任何既有檔被改。`index.html`／`js/`／既有 creatures／anyCreature 引擎一個位元組都沒動。
（過程中在 worktree 內建過一個 `tools/anyCreature` junction 借主樹的 `node_modules` 給 `creature-shoot.mjs` 用——`tools/anyCreature/` 在 `.gitignore` 裡，用完已移除、主樹目錄已核對完整；另有一次性的 `_glbinfo_tmp.py`，量完已刪。）

---

## ⑤ ward 可複用寫法（其餘 9 隻 ward 直接照抄）

1. **「正面寬」是建構出來的，不是擺姿勢擺出來的**：主鏈**垂直站立**＋`frame:"up"`。垂直切線下 `framesOf` 給的是 U=+X、W=−Z，所以 profile 的 half-width 直接吃 **X（正面寬）**、half-height 吃 **Z（側面厚）**——把兩欄寫成 0.45 : 0.13，正面寬 ≥ 側面寬就是恆真的。連帶三件要換算：① 垂直鏈的 `colors.arcs` `sym` 是 **0=背、180=正面**（水平鏈是 0=背脊、180=腹）；② `around` 同理，正面＝180；③ 招牌部位掛正面，識別視角是 `front` 不是 `side`，claims 的 `view` 要跟著改（本檔 `part_signature`／`share_hierarchy`／`focal_contrast`／`style_dark` 全部 `view:"front"`）。
2. **ART_BIBLE 的陣營文法在體型框內實現**：祖靈 ward 的寬度不是一整塊板，而是「**矮的台座＋一排高低不一的垂直柱**」。柱子用 `curve` 掛在台座上緣，`offset` 的 x 只要小於台座該處的 half-width，`part_attachment` 就過（本檔柱腳 x=0.118／0.252／0.372 對 half-width 0.44）。柱高一定要**錯開**才有圖騰列的節奏，等高會讀成柵欄。香火 ward 換成垂墜物、陰氣 ward 換成不對稱，做法一樣：台座負責寬度與貼合，掛件負責陣營文法。
3. **藤編／織紋＝在 `sym` 上排規律窄帶交替，做出來自動是垂直條紋**。垂直鏈的 arc 帶沿著周向走，投影到正面就是縱線，一次滿足「織紋抽象化」與「垂直線條主導」。`sides` 要開夠（本檔 20＝每格 18°）才排得下 5 條以上；`sides:12` 只有 3 格落在正面，排不出條紋。**但褐帶不能滿鋪**——大地褐 `#8b6040` 的 HSV S 是 0.54，本身就算「高飽和」，滿鋪會把 `saturation_area` 直接推到 55%＋；本檔是「兩條褐帶＋其餘中性」才壓到 44%。

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎陷阱（附件之外新發現的三條）

1. **垂直鏈的 up-frame 軸向與水平鏈相反，`arcs`／`around` 要換算**。`geometry.js:framesOf` 對近垂直切線會改用 `up=[0,0,1]` 求 U，再把 U 的符號釘向 +X，結果是 **U=+X、W=−Z**；而水平前向鏈是 U=+X、W=+Y。所以同一個 `sym 180`，在水平鏈是「腹」，在垂直鏈是「正面」。抄 `tiger_c`／`boat` 的 arc 角度到直立體型上會整組貼錯面。
2. **豎瞳可以用「帶 anchor 的 `fin` ＋ 大 `thickness`」穿出 `eye` 球**。`type:"eye"` 的球心 ＝ 表面點 − 法線×`size`×0.35，所以球體最外緣只比錨點多 0.65×`size`；把同一個 anchor 的薄片 `thickness` 開到 `size` 的兩倍（本檔 0.066 對 0.032），薄片就會從眼球中央穿出去，形成一條乾淨的縱縫。**不能改用 host+offset**——那要自己算世界座標，換一次頭部比例就得重算；用 anchor 則跟著幾何自動走。代價是 `part_overlap` 會固定 warn 50%（刻意的，可接受）。
3. **扁體型上 `part_attachment` 綠燈不代表「有貼合」**。那條檢查比的是「頂點到最近 ring **圓心**的距離 − 該 ring 的**最大**半徑」，扁板的最大半徑是它的**寬**（0.44），所以任何插在板面附近的東西幾乎都自動通過——包含**明明浮在板子外面**的東西。中途有一版四片骨條浮在盾板外仍然「全綠」，只有靠肉眼看渲染圖才抓到。要驗真的貼合，得自己算該點的超橢圓表面座標（`|x/rw|^exp + |z/rh|^exp = 1`）。

---

## ⑦ 沒做到 / 留給主對話裁定的事

1. **M-A1 未過，根因是「塊面圓潤」而不是「不夠兇」**（四輪 8 位一致，原話在 ②）。出貨版沒有在盲讀後偷改。三個可能的修法，都超出本卷額度、且會影響全 26 隻，建議一次裁定：
   ① **斷面 `exp` 拉到 4.5–6**（真正的方箱斷面，`SYNTAX.md` 標的上限是 4，沒試過更高會不會翻面）；
   ② **`build:"rigid"` 全平面**（引擎為機械／構造物開的旗標，會解除 `faceted_body` 的 BLOCK——祖靈的「風化木＋石」其實吃得下這個語言）；
   ③ 縮小 `eye`（本輪讀者 G 明說「大眼睛」帶來可愛感，本檔已是 0.032，還能再縮）。
   我沒有自行套用②，因為那是引擎層的風格切換，會讓這隻與已收貨的 `boat`／`tiger_c` 不同語言。
2. **`saturation_area` 44.3% 偏高**，原因寫在 ①-3：ART_BIBLE 的祖靈主色本身就是高飽和的大地褐。若要更接近 30%，只能再減窄藤編褐帶——但那會削弱「藤編」的可讀性，兩者衝突，請主對話定哪個優先。
3. **`part_signature` 的 share 那一路沒過**（6.63% < 7%），靠 span 過。要兩路都過就得放大中軸菱鱗，那會同時再推高 `saturation_area`，兩件要一起調。
4. **ART_BIBLE §6 的「剪影三秒測試」（每兩批一次）本卷沒做**——那是批次閘門不是單隻驗收，需要多隻拼圖才跑得起來，留給主對話在合併批 1＋批 2 之後執行。
5. **戲台燈光把深色打成暖褐**。`plate_body` 已壓到 `#2a2825`（judge 量的是未打光的烘焙頂點色，正面中位亮度 41.2/255），但 `creature-preview.html` 的三燈組＋燈籠仍把它照成暖褐；`boat` 的 stage-lit 有同樣現象。凍結檔不准動 `js/`，記在這裡讓主對話一次處理。
6. **沒有量效能、沒有接進正式對決**。M-A0～A4 沒有要求，就沒做。

## 主對話收尾（2026-09-04 15:40）
硬化輪（exp 5.0／`build:"rigid"`／eye −20%／圓腳改方鑿台座）由 agent 做到 GLB 編出（15:28）後撞 session 額度中斷。主對話自跑 `harness/judge.mjs --spec shield.claims.json` → all claims pass；`creature-shoot.mjs` 重拍 stage-lit（本檔同名截圖已覆蓋為硬化版；hero／front 仍是硬化前）。主對話看圖裁定收貨：圓腳與軟塊面已消除。**硬化版盲讀未做**，列入下一次「剪影三秒測試」批次閘門一併補讀。
