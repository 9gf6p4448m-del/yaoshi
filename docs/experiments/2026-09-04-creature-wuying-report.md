# 3D 量產卷批 5 — `wuying` 五營旗（xianghuo／swarm ×3）回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（門檻全程未動，逐條對照見 ①）。
美術權威：`docs/design/ART_BIBLE.md`（香火段＋§0.5 真實參照鐵則）。真實參照：`docs/experiments/2026-09-04-ref-wuying.md`。
基準 SHA：`da8b050`（worktree `agent-af50d4dbb4603edda`）。**未 commit、未 push。**

DEVLOG 一行：
`gates: M-A0/A1/A2/A3/A4 全 PASS | M-A1 pass@r3 2/2（r3 兩位主印象＝「戴頭盔拿旗的士兵／衛兵」與「武將／旗槍武士」，2/2 讀出「頭盔」、2/2 讀出「臉譜／面具」、2/2 讀出「三角旗＋金流蘇＋桿頂寶頂」、2/2 讀出「鎧甲＋肩甲＋甲裙」；氣質「莊重／肅殺／儀式感很重／儀仗兵」）；真實參照特徵 4/5，缺 ⑤（M-A1 的兩張圖是單隻，結構上量不到；機械證據見 M-A2） | 風格牆指標 6/6 位把圓潤／玩具感歸因低多邊形渲染 | 550.1KB/3026tri/judge all pass/寬 0.383（≤1.2）/hierarchy 46.8:29.9:23.2 | restarts: 錐帽被讀成巫師帽→改鳳翅戰盔、金球眼被讀成可愛大眼→改細長薄板金瞳、背插雙旗→改雙手持直立令旗、矮胖 Q 版→全高 1.049→1.161 | unresolved: 「紙紮／折紙」0/6 沒讀出、「金瞳」0/6 讀成色塊、特徵⑤ 盲讀量不到、香火側視 W/H 0.34<0.9`

---

## ① M-A0～M-A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| M-A0 GLB 規格 | **PASS** | 563,296 bytes＝**550.1 KB** ≤ 1.5MB（19:30 預算制）；`idle`／`move`／`attack` 三支；`skins`=1；`COLOR_0` 有；0 貼圖；`judge.mjs` **all claims pass**；silmetrics 側視＋hero 已出 |
| M-A1 盲讀 | **PASS @ r3（2/2）** | 兩位 context-free `sonnet` 只拿 hero＋stage-lit。r3-E：「戴著尖頂**頭盔**、拿著紅色小旗長矛的**士兵/衛兵**」；r3-F：「**武將**（或說小兵／衛兵）——拿著**旗槍**的武士／士兵」。與簡報概念（五營紙兵）同類 ✓；主印象無一位是玩具／可愛 ✓；氣質含「莊重／肅殺／儀式感很重／儀仗兵／祭祀衛士」✓ |
| M-A2 體型（swarm） | **PASS** | `?n=3` 橫排截圖已出且不穿幫：模型寬 **0.383** × preview 縮放 0.62 = **0.2375**，欄距 1.05 → 相鄰淨距 **0.8125**（>0 即不相交）。含配件寬 0.383 ≤ **1.2** ✓ |
| M-A3 發光材質 | **PASS** | GLB `materials` 逐字含 **`eye`** 與 **`glow_helm`**（簡報 `wuying` 列指定的兩個），沒有多開第三個 |
| M-A4 diff 範圍 | **PASS** | `git status --porcelain` 只有 **8 個新檔**（本報告是第 8 個），**零個 modified／deleted**；`index.html`／`js/`／既有 creatures／anyCreature 引擎一個位元組都沒動 |

**不算通過的地方（誠實條）**：真實參照五條特徵在 r3 只命中 **4/5**（詳見 ⑥）；第 5 條在 M-A1 的兩張單隻圖上結構性地量不到，不是「讀者沒讀出」而是「這個測法看不到」。三輪額度已用完。

---

## ② 三輪盲讀原話（context-free 子 agent，`model: sonnet`，只給兩張圖與四題）

### 第 1 輪（r1，出貨版＝r8：錐形高盔＋肩後一對背旗＋金球眼＋全高 1.049）

> **A**：「一個戴著尖頂帽的小小兵/衛兵角色模型——第一眼是『小兵』。」…「高聳的尖錐形帽子（**類似巫師帽或斗笠尖帽**）」…「背後插著一支像小旗子的東西，旗桿頂端是金色尖頭…看起來像是背在背上的**令旗或武將背旗**」…（Q4）「整體比較偏向**玩具／公仔**感…圓潤的比例（頭大身小、四肢短胖）」
>
> **B**：「**巫師**——一個戴著尖頂帽、有著發光眼睛的低多邊形小型人形角色，感覺像遊戲裡的 NPC 小術士。」…「眼睛是兩顆會發光的黃色／白色圓球…像燈泡」…（Q3）「可愛中帶點怪誕」（Q4）「比較偏向玩具／公仔…**發光大眼睛、圓臉**走可愛路線」

**判定：FAIL。** B 的主印象「巫師」與簡報概念不同類。三個歸因：(a) 高錐形盔＋寬帽簷＝巫師帽/斗笠；(b) `type:"eye"` 的金球被讀成「發光大眼睛」→可愛；(c) 兩位都寫「矮胖／頭大身小」。
**依簡報主對話裁定第 1 條的預授權，本輪本可直接換備案「旗幟本體長腳」——我沒有換**，理由寫在 ⑦-1。

### 第 2 輪（r2，出貨版＝r10：鳳翅盔＋雙手持直立令旗＋細長薄板金瞳＋全高 1.049）

> **C**：「**士兵（衛兵）**。第一眼看到的是一個手持長槍旗幟、戴著尖頂笠帽、穿著紅色胸甲的低多邊形風格士兵／衛兵角色。」…「帽子側邊有一塊黑色三角形裝飾（不確定是**護耳**還是裝飾片）」…「桿頂端插著一支**紅色三角形旗子**，旗子下緣垂掛著數條**黃色的流蘇／布條**，桿頭本身還有一個黃色尖狀裝飾物」…（Q3）「介於**莊嚴儀仗**與詼諧偶戲之間」（Q4）「比較偏向玩具／公仔…比例矮胖」
>
> **D**：「一個穿盔甲、拿旗子的**小兵／士兵**造型的低多邊形 3D 角色模型。」…「戴著一頂寬邊尖頂**斗笠**」…「紅色三角旗（旗子邊緣有像穗子一樣垂下的黃色鋸齒/流蘇），旗桿最頂端還有一個黃色尖狀裝飾物」…（Q3）「拿著旗幟、穿鎧甲、戴戰笠的裝扮又透出一股『**儀仗兵/小兵**』的正經感…民俗/廟會的氣氛」（Q4）「比較偏向玩具／公仔。理由是**比例矮胖可愛（大頭短身）**」

**判定：概念過了（2/2 讀成士兵），但兩位仍點名「矮胖／Q 版／大頭短身」，且盔仍被一位讀成斗笠。** 依 17:30 修訂口徑「可愛看主印象」，這一輪其實已可收貨；我用掉第 3 輪去修比例，因為凍結檔 18:40 的裁定是「完成＝5/5」，而比例是同時壓著特徵①與氣質的那一件。

### 第 3 輪（r3，本卷出貨版＝r12/r13）

> **E**：「一個戴著**尖頂頭盔**、拿著紅色小旗長矛的低多邊形風格**士兵/衛兵**角色。」
> …「尖錐狀的深色（近黑帶金屬光澤）**頭盔**，頂端有一撮橘黃色像羽毛或火焰狀的裝飾…頭盔側邊延伸出類似**護耳**或垂片的黑色部件」
> …「臉部顏色分區明顯——左半是**墨綠色**、右半是**暗紅色**…另外還有一小塊黃色三角形色塊…比較像一張抽象化、**圖騰化的面具**」
> …「上身穿著暗紅色的**鎧甲或戰袍**…肩膀處有橘紅色的圓形**肩甲**…腰部以下是深灰／黑色的**盔甲裙**」
> …「旗竿頂端立著一面**紅色三角形/燕尾形的小旗**，旗子邊緣垂著幾條像**流蘇**的黃色細條…旗竿最頂端有一個黃色尖狀物」
> （Q3）「**莊重中帶點肅殺、儀式感很重**——像是某種帶著圖騰面具的**儀仗兵、祭祀衛士或旗手**…『肅穆的守衛/儀式角色』那種氣質」
> （Q4）「比較偏向公仔／玩具那一端，**但帶有一點威嚴感**，不是純粹的威嚇物…低多邊形建模風格本身就偏可愛/簡化」
>
> **F**：「**武將**（或說「小兵／衛兵」）——一個拿著**旗槍**的低多邊形 3D 武士／士兵造型角色。」
> …「戴著一頂尖錐形**頭盔**…頭盔側邊有黑色**護耳／護頰片**。頭盔頂端插著一撮橘黃色的火焰狀或羽毛狀裝飾」
> …「臉部造型很特殊，像是一張**面具或臉譜**，紅、黑、綠、黃／金色色塊拼接組成…整體給人一種**戲曲臉譜**或鬼面的印象」
> …「上身是紅色為主的**鎧甲／戰袍**…肩膀處有橘紅色的圓形**肩甲**，腰部以下是深灰／深咖啡色的**甲裙**」
> …「桿子頂端插著一面**三角形的紅色旗幟**，旗幟底部有幾條垂下的黃色**流蘇**或滴狀裝飾。旗桿頂端本身還有一個黃色的槍尖／裝飾物」
> （Q3）「臉譜式的紅黑臉部塗裝、尖頭盔與火焰羽飾又添了一點鬼怪、戲劇（像**布袋戲／地方陣頭**小兵）的氣息…『奇幻遊戲裡的小兵/**儀仗兵**』」
> （Q4）「整體比較偏向玩具／公仔感…**低多邊形造型**、圓潤矮胖的身形比例」

**判定：PASS。** 兩位主印象都是士兵／衛兵／武將／旗手（與「五營紙兵」同類），**沒有一位的主印象是玩具或可愛**（依凍結檔 17:30 修訂的口徑：可愛看主印象，正文順帶提及記錄為風格牆指標）；氣質兩位都含「儀仗」，E 另含「莊重／肅殺／儀式感」。

**風格牆指標（凍結檔 17:30 要求每隻貼出提及人數）**：三輪 **6 位讀者 6/6** 在 Q4 把「圓潤／玩具感」明確歸因於**低多邊形渲染本身**（r1-B「低多邊形卡通建模」、r2-C「低多邊形的圓潤造型」、r2-D「造型簡化圓潤」、r3-E「低多邊形建模風格本身就偏可愛/簡化」、r3-F「低多邊形造型」、r1-A「低多邊形、圓潤的比例」）。與 tiger_a／shield／redhat／nail／flag 同一堵牆。

---

## ③ 改了哪些檔（`檔案:行號`）

全部是新檔，既有檔案一行未動。

| 檔案 | 行／大小 | 內容 |
|---|---|---|
| `assets/creatures/wuying.json` | 1–308 | 五營旗的 anyCreature 規格。設計註記 `2–14`（`_brief`／`_ref_features`／`_swarm_recipe`／`_proportion_note`／`_hardening_note`／`_arc_frame_note`／`_around_note`／`_flag_construction`／`_glow_materials`／`_traps`／`_devices`）、palette `15–39`、骨架 `40–72`、chain/attach/mirror/touch `73–85`、體積 `86–158`（body／skirt／head／helm／LArm／LLeg，**6 個全部 `faceted:true`**）、部位 `160–252`（金瞳 `161`、黑眉 `167`、鳳翅 `173`、火焰額飾 `179`、盔纓 ×2 `185/188`、肩甲 `192`、腹甲片 ×2 `199/204`、腰封 `210`、旗桿 `216`、葫蘆寶頂 `220`、旗面 `224`、旗火舌 `228`、流蘇 ×3 `233/236/239`、手指 ×2 `243/246`、紙靴 `250`）、三支動畫 `254–307` |
| `assets/creatures/wuying.claims.json` | 1–137 | judge.mjs 的機械檢查清單，**動手建模、看到任何數字之前寫定**；門檻全程一格未動 |
| `assets/creatures/wuying.glb` | 563,296 bytes | 引擎輸出（r13＝r12，`cmp` 逐位元組相同） |
| `docs/experiments/2026-09-04-ref-wuying.md` | 1–41 | 真實參照文件（7 張 Commons 圖、每張一句、五條一眼特徵、側視可見打星） |
| `docs/experiments/2026-09-04-creature-wuying-hero.png` | 1024² | `harness/hero.mjs`，margin 8.5% |
| `docs/experiments/2026-09-04-creature-wuying-stage-lit.png` | 500×780 | 戲台 3/4（`tests/tools/creature-shoot.mjs`，`light=1&fx=1&rim=xianghu`），原始輸出 1688×780 **只做一次純裁切**，沒有縮放、沒有調色 |
| `docs/experiments/2026-09-04-creature-wuying-n3.png` | 880×460 | `?n=3` 橫排（同上加 `&n=3`），同樣只裁切 |

---

## ④ 指令原文與實際輸出

`<AC>` ＝ worktree 內指向主樹的 `tools/anyCreature` junction，`<WT>` ＝ 本 worktree 根目錄。

### M-A0 — 引擎編譯（出貨版 r13）

```
$ node tools/anyCreature/engine/cli.js assets/creatures/wuying.json tools/anyCreature/out/wuying/r13.glb
{"ok":true,"out":"tools/anyCreature/out/wuying/r13.glb","bytes":563296,"verts":7782,"faces":1649,
 "joints":32,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.461}}

$ cmp tools/anyCreature/out/wuying/r12.glb tools/anyCreature/out/wuying/r13.glb
（無輸出＝逐位元組相同；r12→r13 只改了 JSON 的 `_` 註記欄位，幾何一格未動）
```

### M-A0／M-A3 — 出貨 GLB 本身

```
$ python _tmp_glbinfo.py assets/creatures/wuying.glb   # 直接讀 GLB 的 JSON chunk，跑完已刪
{"file":"assets/creatures/wuying.glb","bytes":563296,"kb":550.1,
 "animations":["idle","move","attack"],"skins":1,"joints":32,"meshes":1,"primitives":18,
 "materials":["armor_body","armor_skirt","skin_face","helm","armor_arm","armor_leg","eye",
              "brow_ink","helm_ear","gold_trim","glow_helm","pauldron","sash","pole_wood",
              "flag_cloth","tassel","hand","boot"],
 "attributes":["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"],"images":0,"textures":0,
 "asset":{"version":"2.0","generator":"anyCreature v1.2.0",
          "extras":{"harness":"anyCreature","harness_version":"1.2.0","spec":"wuying"}}}
```

逐條：**550.1 KB ≤ 1.5 MB** ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／0 貼圖 ✅／
**M-A3**：簡報 `wuying` 列指定的 **`eye`**、**`glow_helm`** 原樣在 materials 裡 ✅（`helm`／`helm_ear` 刻意不用 `glow_` 前綴，免得被 `js/creature-figures.js:51` 的 `/^glow_/` 吃進 emissive）。

### M-A0 — judge 對 claims 全檢（claims 動手建模前就寫定，門檻全程一格未動）

```
$ node tools/anyCreature/harness/judge.mjs tools/anyCreature/out/wuying/r13.glb \
      tools/anyCreature/out/wuying/judge_r13 wuying --spec assets/creatures/wuying.claims.json
"stats":{"triangles":3026,"skinnedMeshes":18,"animations":["idle","move","attack"]}
"lum":{"front":41.2,"side":41.9,"tq":43.5,"reartq":31.3,"top":55.7}
"hi_sat_share":{"front":0.4861,"side":0.2293,"tq":0.3958,"reartq":0.0930,"top":0.3810}
"whole":{"size":[0.383,1.161,0.404]}
armor_body front=0.35146 side=0.33008    armor_skirt tq=0.13902
helm       front=0.05354 side=0.05393 span=0.4855
skin_face  front=0.03271 side=0.04633    flag_cloth side=0.05310
glow_helm  front=0.00630              eye front=0.00884
[judge] Spec "五營旗 wuying_zhibing (xianghuo/swarm)" — all claims pass.
```

各條的實際數字對門檻（門檻＝claims 檔原值，全程未改）：

- `part_exists` ×5：`helm`／`skin_face`／`flag_cloth`／`glow_helm`／`eye` 五個材質名都在 materials 清單裡 ✅
- `part_signature` `helm`（view side）：share **5.393%**（需 ≥6%，**這一路沒過**）**但** span **0.4855**（需 ≥0.12，**這一路過**）→ 該條是 share **OR** span，通過 ✅（與 shield 當初同型）
- `part_visible` `skin_face`（view front）：**3.271%**（需 ≥2.5%）✅
- `part_visible` `flag_cloth`（view side）：**5.310%**（需 ≥2%）✅ ←本檔相對 flag 卷**加嚴**新增的那一條（特徵③「側視可見」的機械化）
- `focal_contrast` `armor_body` : `glow_helm`（view front）＝ 35.15% : 0.63% ＝ **55.8×**（需 ≥3）✅
- `share_hierarchy`（view tq）＝ **46.8 : 29.9 : 23.2**（目標 60:30:10，容差 ±15pp，最大偏離 **13.2pp**）✅
- `style_dark`（view side）：**41.9**/255（需 ≤90）✅
- `saturation_area`（view tq）：**39.58%**（凍結檔的帶 10–60%）✅
- `tri_budget`：**3026**（1500–8000，19:30 預算制）✅
- `rig_skinned` / `anim_named`：skins=1、18 個 skinned mesh、三支動畫齊 ✅

### M-A2 — swarm 橫排與寬度

```
$ node tools/anyCreature/harness/silmetrics.mjs tools/anyCreature/out/wuying/r13.glb .../sil_r13
{"W_over_H":0.34,"fill":0.38,"mass_thirds":[0.065,0.432,0.503],"torso_depth_max":0.90,
 "torso_depth_min":0.08,"mass_contrast":11.69,"leg_fraction":null,"turn_count":19,
 "zigzag_alignment":0.75,"front":{"W_over_H":0.32,"fill":0.487},
 "top":{"W_over_H":0.93,"fill":0.501},"hero":{"W_over_H":0.34,"fill":0.567}}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-wuying-n3.png \
      "glb=wuying.glb&light=1&fx=1&rim=xianghu&n=3" idle 8825
{"out":"...n3.png","query":"glb=wuying.glb&light=1&fx=1&rim=xianghu&n=3","phase":"idle",
 "fps":59.88,"calls":68,"loadMs":209,"particles":132,"errors":[]}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-wuying-stage-lit.png \
      "glb=wuying.glb&light=1&fx=1&rim=xianghu" idle 8824
{"out":"...stage-lit.png",...,"fps":59.88,"calls":26,"loadMs":223,"particles":44,"errors":[]}
```

兩次 `errors` 都是空陣列（console 0 error）。**不穿幫的數字**：模型寬 **0.383**，`creature-preview.html` 在 `n>1` 時每隻縮 **0.62**、欄距 **1.05** → 佔寬 **0.2375**，相鄰淨距 **0.8125**；截圖上三隻各自獨立、影子不重疊。
`creature-shoot` 回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**，別拿來當佐證。

### M-A4 — 範圍

```
$ git status --porcelain
?? assets/creatures/wuying.claims.json
?? assets/creatures/wuying.glb
?? assets/creatures/wuying.json
?? docs/experiments/2026-09-04-creature-wuying-hero.png
?? docs/experiments/2026-09-04-creature-wuying-n3.png
?? docs/experiments/2026-09-04-creature-wuying-stage-lit.png
?? docs/experiments/2026-09-04-ref-wuying.md
（本報告是第 8 個新檔）

$ git diff --stat da8b050 -- .
（無輸出——沒有任何**已追蹤**檔案被修改或刪除）
```

`index.html`、`js/creature-figures.js`、`js/duel-figures.js`、`tests/tools/creature-preview.html`、`tests/tools/creature-shoot.mjs`、既有 `assets/creatures/*` **一個位元組都沒動** ✅。
過程中在 worktree 內用 `mklink /J` 建了一個指向主樹 `tools/anyCreature` 的目錄 junction（`creature-shoot.mjs` 要 `require` 那裡的 playwright，而 `tools/anyCreature/` 在 `.gitignore` 第 3 行），參照圖也存在 `tools/anyCreature/out/ref/wuying/`；因為該路徑被 gitignore，**這個 junction 從頭到尾沒有進過 diff**。另有三支一次性腳本（`_tmp_ii.py`／`_tmp_dl.py`／`_tmp_search.py`／`_tmp_glbinfo.py`／`_tmp_notes.py`／`_tmp_meta.py`），用完全部已刪（`git status` 可證）。

---

## ⑤ swarm 可複用寫法（沿用與偏離 boat 報告 ⑤ 的地方）

1. **寬度是 swarm 唯一的硬條件**：`creature-preview.html` `n>1` 每隻縮 0.62、欄距 1.05，含配件總寬 ≤1.2 即安全。直立人形離這條線很遠（本檔 0.383），**真正吃緊的是高度與比例**，不是寬度。
2. **boat 的「主鏈水平臥、側視 W/H ≥1.8、高壓在 0.85 以下」是船的規格，直立人形不要照抄**。本檔前兩輪照「矮小」做到全高 1.049，四位讀者一致回「矮胖／Q 版／大頭短身」；第 3 輪把全高拉到 1.161（寬度完全不動，只拉長腿與軀幹各段），肩寬/全高從 0.33 降到 0.30，第 3 輪兩位就不再用「頭大身短」形容。**凍結檔 18:00 的「不可愛」守則優先於體型語彙的「矮小」**——這是本卷最貴的一課。
3. **`move` 要寫 `mirror_phase: 0.5`，`idle` 不要寫**。boat 的「swarm 一律不寫 mirror_phase」是對沒有腿的船說的；直立紙兵兩腿同拍會變成雙腳跳。三隻之間的同拍來自「同一支 clip、同時起算」，與 `mirror_phase` 無關，「一群同款」的讀法不受影響。
4. **色帶**：高飽和系別色只用 `colors.arcs` 的縱向分帶（角度吸附到 `360/sides` 的格）＋實體 `fin` 色條當主要載體。本檔軀幹正面 110–180 一整片硃紅、背面 0–66 中性暗，兩側留基底色——**第 1 輪寫成 156–180 的窄帶時，兩位讀者都把它讀成「左右不對稱配色／陰陽對半」**，把帶拉寬包住整個正面就沒有人再提。

---

## ⑥ 真實參照五條特徵的逐條有／無（目標 5/5，實得 4/5）

| # | 特徵（`ref-wuying.md` §三） | r3 命中 | 讀者原話 |
|---|---|---|---|
| ① | **尖角戰盔**（等腰尖盔、底邊壓眉線、護耳外翻、盔纓） | **✅ 2/2** | E「尖錐狀的深色**頭盔**…側邊延伸出類似**護耳**或垂片的黑色部件…頂端有一撮橘黃色像羽毛或火焰狀的裝飾」／F「尖錐形**頭盔**…側邊有黑色**護耳／護頰片**…頂端插著一撮橘黃色的火焰狀或羽毛狀裝飾」 |
| ② | **五方顏色的臉**（白粉底＋朱紅中央＋青綠頰＋濃黑眉＋金瞳） | **✅ 2/2（部分）** | E「顏色分區明顯——左半**墨綠**、右半**暗紅**…一小塊黃色三角形色塊…**圖騰化的面具**」／F「像一張**面具或臉譜**，紅、黑、綠、黃／金色色塊拼接…**戲曲臉譜**」。**沒讀出的是「金瞳」與「白粉底」**——兩位都說「看不出五官」 |
| ③ | **三角令旗＋金流蘇**（鋸齒火焰邊、金流蘇、葫蘆寶頂） | **✅ 2/2（全中）** | E「**紅色三角形/燕尾形的小旗**，旗子邊緣垂著幾條像**流蘇**的黃色細條…旗竿最頂端有一個**黃色尖狀物**」／F「**三角形的紅色旗幟**，底部有幾條垂下的**黃色流蘇**…旗桿頂端本身還有一個**黃色的槍尖／裝飾物**」 |
| ④ | **折紙硬板的甲衣**（肩甲、腹甲片、腰封、硬折戰裙） | **✅ 2/2（部分）** | E「暗紅色的**鎧甲或戰袍**…橘紅色的圓形**肩甲**…**盔甲裙**…胸前黃色符文」／F「紅色為主的**鎧甲／戰袍**…橘紅色圓形**肩甲**…**甲裙**」。**沒讀出的是「紙／折板」**——兩位都用「低多邊形圓潤」描述 |
| ⑤ | **一排同款並肩的矮兵** | **✖ 量不到** | M-A1 的兩張圖（hero＋stage-lit）都是**單隻**，這條在該測法下結構性地讀不到，不是讀者沒讀出。機械證據見 M-A2：`?n=3` 三隻等距不穿幫、左右嚴格鏡射（`mirror: ["LArm","LLeg"]`＋所有非鏡射件都寫在中線上，旗面是唯一單側件） |

### 缺項一節（供主對話排硬化批／回修批）

| 缺項 | 現況 | 建議處置 |
|---|---|---|
| **特徵⑤「一排同款並肩」在 M-A1 量不到** | 三輪六位讀者都只看到一隻 | 主對話裁定二選一：(甲) 承認 M-A2 的 `?n=3` 機械證據即算兌現、把這條劃掉；(乙) 硬化批把 `-n3.png` 加進盲讀圖組（**注意：加圖等於放寬 M-A1，屬凍結條件變更，要走 `02 §2.1`**）。我不自行決定。 |
| **特徵②的「金瞳」0/6 沒讀出** | `eye` 薄板 front share 0.884%，兩位讀者說「看不出五官／中央一道黑色橫條」；黑眉 `brow_ink` 把金瞳壓成一條暗色 | 硬化批：金瞳加大 1.4×、往下移出眉影（`anchor.t` 0.44→0.40）、`brow_ink` 縮短並上移；或把 `eye` 改回 `type:"eye"` 但直徑砍半（第 1 輪的球眼被讀成「可愛大眼」，這條要一起量） |
| **特徵②的「白粉底」沒被點名** | 白帶只有 `sym 122–158` 兩欄，被硃紅與青綠夾掉 | 硬化批：白帶擴到 `sym 118–162`、朱紅收到 `168–180` |
| **特徵④的「紙紮／折紙」0/6 沒讀出** | 六位讀者一律把硬折面讀成「低多邊形風格」 | **這是全批共同的風格牆**（tiger_a ⑤-3／redhat ⑧／shield ⑦-1／flag ⑧ 同一條），不是本隻的造型問題。要真的讀成「紙」需要描邊／法線貼花，屬 three.js 後處理卷。建議主對話比照 tiger_c 白毛邊那條做**引擎限制簽字** |
| **香火側視 W/H 0.34（ART_BIBLE §1 目標 ≥0.9）** | 直立人形＋垂直旗桿，與「不可愛＝拉長比例」直接衝突 | 記錄項，不改（flag 的 0.61 也是同一個衝突）。若主對話要 ≥0.9，只能走「加寬垂墜物」——但那會把剛修好的矮胖問題帶回來 |
| **`helm` 的 `part_signature` 只過 span 那一路**（side share 5.39% < 6%） | 招牌件在側視被鳳翅與旗桿分掉面積 | 記錄。span 0.4855 遠超 0.12，判定成立；硬化批若要兩路全過，把盔錐再拉高 15% 即可，但要重新量比例是否又回到「巫師帽」 |

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **★ 第 1 輪盲讀讀成「巫師」，我沒有依預授權換備案。** 簡報主對話裁定第 1 條寫「量產時第 1 輪盲讀若讀成**機器人／玩偶**，預先授權直接換備案（`wuying`＝旗幟本體長腳），不必回報等待」。第 1 輪讀者 A 讀成「小兵／衛兵」（概念正確）、讀者 B 讀成「巫師」，**兩位都沒有讀成機器人或玩偶**，而且兩位都已經讀出「鎧甲／護肩／武將背旗」——也就是**人形本身沒有失敗，失敗的是盔型**。所以我判定預授權的觸發條件（「讀成機器人／玩偶」）並未成立，改為修盔型＋比例。這是我的判斷，**若主對話認為「巫師」也該觸發換備案，這一輪等於我逾越了預授權的字面**，請裁定；備案版（旗幟本體長腳）我沒有做，要做需要另一輪。
2. **旗面／火舌／寶頂／三條流蘇沒有機械貼合證據。** 它們掛在鬆散關節 `FlagTop` 上，`checks.js:306` 對 `hostChain=null` 的部位**整條略過** `part_attachment`（flag 報告 ⑥-1）。旗桿本身 host 在 `Hips`（在 body 鏈裡）所以**有**被檢查、根環到 Hips 環心 0.128 < 該環最大半徑 0.146。這五件只有肉眼證據（hero／front／side 三張渲染圖逐張看過沒有穿模）。
3. **`part_overlap` 有一批 warn 沒清乾淨**：`pennant_flame` 有 67% 落在 `pennant` 的包圍盒裡（那是刻意的疊層，用來做出鋸齒火焰邊——凸多邊形做不出鋸齒，見 `_traps` ③），`pennant` 也被旗桿的包圍盒框住。逐張渲染圖核對過沒有實際穿模，但這是**肉眼證據不是機器證據**。
4. **剪影不撞車（B-A2）新增了一個未經審過的元素。** 簡報給 `wuying` 的招牌剪影是 A 群（頭頂／頭側）的「尖角戰盔」，本檔照做；但**雙手持的直立旗桿是簡報上沒有的新元素**，它在側視是一條從腹前直上、頂端帶三角旗的細桿。與 B 群的 `sword`（背脊直桿＋橫向護手、上下兩端都出身體）、`flag`（背插斜三角、四足獸身）、`wangchuan`（垂直桅＋方形帆）、以及**尚未量產的 `pojun`（穿胸旗桿＋尾端破布）**都有形狀差，但 `pojun` 同為香火 swarm 又同樣帶旗，**兩者的分辨請主對話在做 `pojun` 時一併定**（建議 `pojun` 走「斜貫穿胸口＋破爛布條」，與本檔的「直立完整旗＋金流蘇」對比）。
5. **移動過的門檻：一個都沒有。** `wuying.claims.json` 在動手建模、看到任何 judge 數字之前就寫定（見該檔 `_role`），此後**沒有任何一格被改過**。`share_hierarchy` 一共擋了我五次（32:27:41 → 44:29:27 → 49:26:25 → 52:23:25 → 47:25:28），五次全部靠**改實作**過關（放大軀幹與戰裙、縮小裝飾件、把頭縮小讓盔多蓋一點、把過長的旗桿變細），沒有動過 bucket 分組或容差。中途曾把手指材質從 `hand` 併進 `armor_arm`（等於把 1.9pp 從 tertiary 搬到 secondary），**察覺那是在搬及格線之後當場還原**，出貨版的 `hand` 仍是獨立材質。
6. **沒有量效能、沒有接進正式對決。** M-A0～A4 沒有要求就沒做；`?n=8` 的 fps 與真機量測留給接線卷。
7. **ART_BIBLE §6 的「剪影三秒測試」本卷沒做**——那是每兩批一次的批次閘門、需要多隻拼圖才跑得起來，留給主對話在合併批 5 之後執行。
8. **`silmetrics` 的 `leg_fraction` 回 `null`。** 旗桿貫穿整個側視剪影，量腿的演算法找不到腿。腿的實際佔比用骨架座標算：髖 0.470／全高 1.161 ＝ **40.5%**，裙襬以下露出的小腿 0.322 ＝ **27.7%**。

---

## ⑧ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現四條）

1. **★ `colors.arcs` 的 `from`／`to` 只在 0–180 有效，寫超過 180 的帶是死碼。**
   `compile.js:218-223`：`fromTop = (450 − aDeg) % 360`，接著 `sym = fromTop > 180 ? 360 − fromTop : fromTop`——**`sym` 恆在 0..180**，所以 `redhat.json` 裡那三條 `from 216 to 324` 的帶從來沒有命中過任何頂點（它們是死碼，不是「背面的帶」）。`arcs` 是**左右鏡射的半圓**：同一個 `sym` 值同時著色左右兩個對稱位置，所以正面中央的色帶必然是對稱的縱帶，**做不出左右不同色的臉**。
2. **★ `anchor.around` 與 `colors.arcs` 的框架差 90°。**
   同一條 `frame:"up"` 直立鏈上：`arcs` 的 `sym` 是 **0＝背（−Z）／90＝兩側／180＝正面（+Z）**，但 `anchor.around` 實測是 **0＝背（−Z）／90＝+X 側／180＝正面（+Z）／270＝−X 側**。我第一版照 `sword` 報告的角度表把臉部件寫 `around 270`，compiler 直接印 `faces side (world normal -1.00,0.00,0.00)`——眉毛長在左臉頰上。**唯一可靠的做法仍是先隨便編一次、讀 `info: fin ... faces XXX` 那行再回頭改**，不要從任何一份報告的角度表推（nail 報告 ⑥-1 已經講過一次，這是第二次栽在同一件事上）。
3. **★ `root_containment` 兩次擋在同一個錯誤上：把 chain 的 `t=0` 那一列寫成「外張後的寬度」。**
   `helm` 鏈第一列寫成盔沿寬度 0.104 → 根環整圈露在頭外面（`100% outside`）；`skirt` 鏈第一列寫成裙擺寬度 0.120 → 根環 40% 露在軀幹外面。兩條的修法一樣：**`t=0` 那一列要縮成塞得進宿主的細環**（helm 0.044、skirt 0.093），外張留給 `t=0.16~0.22` 那一列。這條對所有「戴在宿主外面的殼」（帽、盔、裙、披風）都適用。
4. **★ 想做「握著一支長桿」不必用鬆散關節，把 `curve` 的 host 放在 chain 裡、根部埋進軀幹就有機械檢查。**
   `part_attachment` 取的是**所有頂點裡離最近環心距離減該環最大半徑的最小值**，所以一根 0.75 長的旗桿只要**根端**埋在軀幹裡就會過，頂端伸到頭頂之上完全不影響（本檔根環到 `Hips` 環心 0.128 vs 該環最大半徑 0.146）。boat 報告 ⑥-4 的「部位不能離開宿主」講的是**整件都在遠處**的情形（獨立的槳葉），不是「一端遠一端近」的長件——兩者要分清楚，否則會像我一開始那樣，白白把所有長件都推去鬆散關節、放棄機械檢查。
