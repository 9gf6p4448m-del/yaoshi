# 3D 量產卷批 3 — `nail` 虎姑婆指甲（yinqi／elite）出貨報告（2026-09-04）

基準＝main `cce6513` 之後（本 worktree HEAD `63e5a28`）。工具在主工作樹 `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/` 執行，輸出寫進本 worktree 的絕對路徑；下面把長路徑縮寫成 `<WT>` ＝ `C:/Users/shung/OneDrive/桌面/妖市/.claude/worktrees/agent-a1cd0ca7999e43924`。

## ① M-A0～M-A4 一覽

| 閘門 | 結果 | 數字 |
|---|---|---|
| M-A0 GLB ≤400KB／三支動畫／judge 全綠／側視＋hero | **PASS** | 271.7KB；`idle/move/attack`；`all claims pass`；hero `margin 8.6` |
| M-A1 盲讀（context-free ×2，hero＋stage-lit） | **未過（第 3 輪，已達上限）** | 兩位一眼都說出「兜帽長袍＋伸出的巨大長爪」，特徵各命中 3 條；A 的主印象「威嚇感／詭異感，不是可愛路線」通過，**B 的主印象出現「可愛」（「威嚇感偏可愛惡趣味」「討喜」）→ 依凍結檔任一位『可愛』即未過** |
| M-A2 體型 | **n/a（elite）** | elite 不需 `?n=3`／虛化／正面寬證據 |
| M-A3 發光材質名在 GLB materials | **PASS** | `eye`、`mouth_glow` 都在（完整清單見 ④） |
| M-A4 diff 範圍 | **PASS** | 只有自己的 6 個新檔，`git diff --stat HEAD` 空 |

**出貨版＝ r13**（第 3 輪盲讀讀者實際看到的那一版，GLB 與兩張截圖同一次編譯）。依凍結檔「第 3 輪未過交最佳版標『未過』」，本隻標「M-A1 未過」交件。

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給 hero 與 stage-lit 兩張，檔名遮成 r?-imgA/r?-imgB、路徑不含 nail／tiger／hag 字樣）

### 第 1 輪（r10 之前的 r8）
- **r1-A**「一隻披黑袍、有海象般長獠牙和白骨爪的低多邊形 Boss 級怪物角色。」氣質：「不可愛，偏威嚇／詭異這一路……陰森、不祥、有攻擊性。」
- **r1-B**「一隻擬人化海象／海獅頭妖怪，穿黑袍，正在施展法術。」氣質：「不是可愛系，是威嚇感偏怪誕邪祟……陰森但有點滑稽。」
- 判讀：兩位都讀成**海象**——下垂的長獠牙＋八字鬍。這是造型問題，不是燈光問題。

### 第 2 輪（r10）
- **r2-A**「一隻擬人化的老鼠／鼴鼠巫師，穿黑袍，戴著發光尖刺頭飾，舉著白色尖爪。」氣質：「不可愛，是威嚇感／詭異感那一路……邪祟法師／鼠妖。」→ 這位過。
- **r2-B**「一隻擬人化的老鼠／水獺類生物，披著黑色連帽長袍，像個小巫師或哥布林術士角色。」氣質：「**可愛系反派小怪**……圓潤鼠臉、鬍鬚、低多邊形卡通感很萌。」→ **未過**。
- 判讀：海象消失、換成鼠；B 明白指出「可愛」來自**圓潤的鼠臉與暖中棕毛色**。

### 第 3 輪（r13＝出貨版）
- **r3-A**「一隻擬人化的老鼠／鼴鼠妖怪，穿黑色連帽長袍、**伸出一隻巨大骨爪**，像遊戲裡的怪物角色模型。」氣質：「偏向**威嚇感／詭異感，不是可愛路線**。那隻不成比例的巨大骨爪是最大的視覺重點，讓角色看起來像是要抓人的怪物；連帽長袍＋鼠臉＋鬍鬚的組合帶點『**陰森**法師／亡靈巫師』的味道……**邪祟**的氛圍。」→ 過。
- **r3-B**「一隻擬人化的鼠妖／貓鼬妖怪穿黑色長袍，戴著兜帽，**正伸出爪子**——低多邊形風格的角色模型。」氣質：「**威嚇感偏可愛惡趣味**的類型……低多邊形卡通建模又把恐怖感壓低，變成遊戲裡那種帶點滑稽、**討喜**的邪惡 NPC。」→ **未過（出現「可愛」）**。

**主印象一句**：兩位都讀到「兜帽長袍的妖怪伸出一隻誇張的巨大長爪」；A 的氣質是「威嚇／詭異／陰森／邪祟」，B 是「威嚇感偏可愛惡趣味」。

## ③ 參照特徵逐條有／無（ART_BIBLE §0.5，清單見 `docs/experiments/2026-09-04-ref-nail.md`）

| # | 一眼特徵 | 模型上有沒有 | 第 3 輪讀者有沒有讀到 |
|---|---|---|---|
| 1 | ★厚重深色兜帽／頭巾罩住頭頂並垂落到駝背 | **有**（`hood` 鏈往上後長成兜帽＋`cape` 鏈沿駝背垂下，同一個 `cloth_hood`／`cloth_cape` 語彙；側視 hood 12.9%＋cape 20.8%） | **A ✓ B ✓**（「黑色尖頂連帽斗篷，兜帽蓋住大半頭部」／「戴著兜帽」） |
| 2 | ★布開口裡是一張虎臉（白吻、額心黑紋、瞇眼、獠牙） | **有但沒被讀成虎**（`fur_face` 側視 4.54%、`muzzle` 淺吻、5 條 `stripe` 額心／頰紋、`fang` 上下交錯、`eye` 發光縫）——三輪讀者依序讀成海象／鼠／鼠 | **A ✗ B ✗**（讀成嚙齒類，見 ⑦-1） |
| 3 | ★長白鬚往兩側前方張開 | **有**（每側 2 根 `whisker`，第 1 輪的 3 根下垂版已移除） | **A ✓ B ✓**（「細長白色鬍鬚」／「白色鬍鬚（兩側各三根）」） |
| 4 | ★毛茸的虎前肢從布下探出 | **有**（`clawarm` 為獨立鏈、`fur_paw` 與臉同一族色，側視 4.94%） | **A △ B △**（A 讀成「右手臂異常巨大」但顏色歸給骨白；B 只讀到「伸出的手」） |
| 5 | ★象牙白彎鉤指甲，弧度近四分之一圓、誇張 4–6 倍 | **有**（5 根 `nail`，最長一根總長 0.535，前臂長 0.176 → **3.0 倍**；側視 12.4%、span 0.754） | **A ✓ B ✓**（「五指極長、末端尖銳如爪／骨刺，比例明顯誇張」／「巨大的白色爪子，五指皆為誇張的長尖爪」） |

**特徵命中數：A 3 條、B 3 條**（門檻 ≥3，**兩位皆達標**）。沒命中的是特徵 2「虎」與特徵 4 的「毛茸獸肢」語意，原因寫在 ⑦-1。

## ④ 指令原文與實際輸出

### M-A0 — 編譯

```
$ node engine/cli.js <WT>/assets/creatures/nail.json out/nail/r13.glb
{"ok":true,"out":"out/nail/r13.glb","bytes":278232,"verts":3310,"faces":1524,
 "joints":27,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.506}}
```

### M-A0／M-A3 — GLB 規格

```
$ python _glbinfo_tmp.py assets/creatures/nail.glb      # 一次性腳本，量完已刪
{"file": "assets/creatures/nail.glb", "bytes": 278232, "kb": 271.7,
 "animations": ["idle", "move", "attack"], "skins": 1, "joints": 27, "meshes": 1, "primitives": 14,
 "materials": ["cloth_cape", "cloth_robe", "cloth_hood", "fur_face", "muzzle", "fur_paw", "nail",
               "eye", "stripe", "mouth_glow", "fang", "whisker", "hair", "hood_trim"],
 "attributes": ["COLOR_0", "JOINTS_0", "NORMAL", "POSITION", "WEIGHTS_0"], "hasCOLOR_0": true,
 "images": 0, "textures": 0,
 "asset": {"version": "2.0", "generator": "anyCreature v1.2.0",
           "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "nail"}}}
```

逐條：271.7KB ≤ 400KB ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／**M-A3：`eye` 與 `mouth_glow` 都在 materials 清單裡** ✅（另外 `nail`／`hood_trim` 也被 claims 釘住）。

### M-A0 — judge 對 spec 全檢

```
$ node harness/judge.mjs <WT>/assets/creatures/nail.glb out/nail/judge_ship nail \
      --spec <WT>/assets/creatures/nail.claims.json
"stats":{"triangles":2652,"skinnedMeshes":14,"animations":["idle","move","attack"]}
"lum":{"front":28,"side":21,"tq":21.9,"reartq":10.9,"top":44.2}
"hi_sat_share":{"front":0.1549,"side":0.1114,"tq":0.1383,"reartq":0.0822,"top":0.2438}
"whole":{"size":[0.672,1.280,1.028]}
nail       side=0.12395 span=0.7537      fur_face   side=0.04543
cloth_robe side=0.37162                  cloth_cape side=0.20778
cloth_hood side=0.12892                  muzzle     side=0.01367
fur_paw    side=0.04944                  hood_trim  side=0.01406
stripe     side=0.01002                  hair       side=0.01663
eye        side=0.00229                  mouth_glow side=0.00745   fang side=0.00539  whisker side=0.00336
[judge] Spec "虎姑婆指甲 nail_hugupo_zhijia (yinqi/elite)" — all claims pass.
```

各條的實際數字對門檻：
- `part_exists` `nail`／`eye`／`mouth_glow`／`hood_trim` — 四個材質名都在 materials 清單裡 ✅
- `part_signature` `nail`（view side）：share **12.40%**（需 ≥6%，過）**或** span **0.7537**（需 ≥0.12，過）→ 兩路都過 ✅
- `part_visible` `fur_face`（view side）：**4.54%**（需 ≥4%）✅
- `focal_contrast` `nail` : `fur_face`（view side）＝ 12.40% : 4.54% ＝ **2.73×**（需 ≥2）✅
- `share_hierarchy`（view side）＝ 布身（robe+cape）57.9 : 兜帽+巨爪 25.3 : 臉+吻 5.9，正規化後 **65.0 : 28.4 : 6.6**（目標 60:30:10，容差 ±15%）✅
- `style_dark`（view side）：**21.0**/255（需 ≤90）✅
- `saturation_area`（view tq）：**13.83%**（凍結檔第 2 條的帶 10–60%）✅
- `tri_budget`：**2652**（1500–5000）✅
- `rig_skinned` / `anim_named`：skins=1、三支動畫齊 ✅

### 側視形數字（silmetrics）

```
$ node harness/silmetrics.mjs <WT>/assets/creatures/nail.glb out/nail/sil_ship
{"W_over_H":0.78,"fill":0.376,"mass_thirds":[0.098,0.249,0.653],"torso_depth_max":0.9,
 "torso_depth_min":0.06,"mass_contrast":15.93,"leg_fraction":0.506,"turn_count":21,
 "zigzag_alignment":0.89,"front":{"W_over_H":0.58,"fill":0.512},
 "top":{"W_over_H":0.67,"fill":0.42},"hero":{"W_over_H":0.82,"fill":0.426}}
```

（`leg_fraction 0.506` 是假值：本隻沒有腿，及地的袍被當成腿量。不是任何一條 claim。）

### 兩張截圖

```
$ node harness/hero.mjs <WT>/assets/creatures/nail.glb out/nail/hero_r13
{"ok":true,"margin":8.6}   → 複製成 docs/experiments/2026-09-04-creature-nail-hero.png

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-nail-stage-lit.png \
      "glb=nail.glb&light=1&fx=1&rim=yinqi" idle 8808
{"out":"docs/experiments/2026-09-04-creature-nail-stage-lit.png",
 "query":"glb=nail.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88,"calls":21,"loadMs":200,"particles":44,"errors":[]}
```

`errors` 是空陣列（console 0 error）。`fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。**這兩張就是第 3 輪盲讀讀者實際看到的那一版**。

### M-A4 — 範圍

```
$ git status --short
?? assets/creatures/nail.claims.json
?? assets/creatures/nail.glb
?? assets/creatures/nail.json
?? docs/experiments/2026-09-04-creature-nail-hero.png
?? docs/experiments/2026-09-04-creature-nail-stage-lit.png
?? docs/experiments/2026-09-04-ref-nail.md

$ git diff --stat HEAD
（空）
```

六個全新檔（本報告是第七個），沒有任何既有檔被改。`index.html`／`js/`／既有 creatures／anyCreature 引擎一個位元組都沒動。過程中在 worktree 內建過一個 `tools/anyCreature` junction 借主樹的 `node_modules` 給 `creature-shoot.mjs` 用（`tools/anyCreature/` 在 `.gitignore` 第 3 行），用完已移除、主樹目錄已核對完整；另有一次性的 `_glbinfo_tmp.py`，量完已刪。不 commit 不 push。

## ⑤ 出貨造型（依 ART_BIBLE 陰氣段的四件事）

- **剪影**：駝背前傾的兜帽人形，右臂往前伸到底、末端張開五根比前臂還長的彎鉤；左臂縮成殘肢只剩兩根殘指。**不對稱與比例錯誤是主載體**（`clawarm`／`stubarm` 兩條各自成鏈、不用 `mirror`；兜帽頂端 `side +0.030` 歪一邊；濕髮與鬼火鬚各有一件是單側的）。
- **主色**：中性近黑布（`#191919`／`#1e1e1e`／`#232323`），一條陰氣青綠只落在**頭巾邊緣的鬼火鬚**（`hood_trim #5fd79a`，側視 1.41%）＋兩處發光（`eye`／`mouth_glow`）；指甲依主對話裁定改**象牙白** `#ece5d4`（真虎爪色，同時是聖經 §3「一點刺眼的白」）。
- **材質語言**：吸飽水的布＝`cloth_*` 大塊硬面（`exp` 4.0–4.8、`sides` 7–8）；濕髮＝`hair` 六條垂落 `curve`；鬼火＝`hood_trim` 五條發光細鬚；獸骨＝`nail`／`fang` 的尖端外露。
- **節奏**：`idle` 2.8s 用 hold＋突跳（0–0.35 靜止、0.44 頭部急抽 9°、0.62–0.9 再靜止），`attack` 0.85s 前面留一拍靜止（0–0.18）再爆發。
- **八項手段用了七項**：①比例（駝背前傾、頭低於肩，頭只佔全高約 1/6）②尖（五巨爪、獠牙、鬚、殘指、破襬尖角）③眼（眉棚下的發光縫，不是圓大眼）④不對稱（見上）⑤骨感（腕與掌節的硬轉折）⑥細長指爪（招牌）⑦嘴（獠牙上下交錯＋口內綠光）⑧色（深底＋一條高飽和帶）。`smooth_angle` 全檔落在 **24–25**，符合派工指定的 24–26 帶。

## ⑥ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現四條）

1. **★ `around` 的框架逐鏈不同，`nail` 的水平頭鏈實測是 0°＝下（腹）、180°＝上（顱頂）**——與 `sword` 的直立鏈（0°=−x／90°=−z／180°=+x／270°=+z）、`shield` 的直立 `frame:"up"` 鏈（0=背／180=正面）**三者都不一樣**。第一版把額心虎紋寫 `around 0`、鼻頭寫 `168`，結果紋路長在下巴、鼻子長在頭頂。**唯一可靠的做法是先隨便編一次、讀 `info: fin ... faces XXX (world normal ...)` 那行再回頭改**，不要從任何一份報告的角度表推。
2. **★ `colors.arcs` 的角度會被吸附到面的角度格，`sides` 越少吸得越兇。** 兜帽用 `sides: 9`（每面 40°）時，寫 `from 170 to 180` 的 10° 青帶被吸成一整片 40° 的面，整個頭頂變綠（r2／r3 兩版實測，見報告附圖差異）。**低 `sides` 的體積不要用 arcs 做細窄色帶，改用實體掛件（本檔改成 5 條 `hood_trim` 細鬚）。**
3. **`part_visible` 量的是**未被遮擋**的可見面積，不是部位大小。** 臉做大不一定過——把頭往前推出兜帽開口（`HeadRoot` 的 `fwd` 從 −0.046 改到 −0.020）比把頭放大有效得多（3.92% → 5.75%，體積只大了 6%）。
4. **`type:"eye"` 很容易被別的掛件蓋掉，而 judge 不會擋。** 濕髮／鬼火鬚掛在 `Hood1`／`Hood2` 上往下垂，只要 `offset` 的 z 落在臉前方就會壓在眼球上（compiler 只給 `warn: part_overlap: 'eye@Brow' sits 89% inside 'curve@Hood2'`），眼睛的 side share 會掉到 0.16%——**看到這條 warn 就要動掛件的 offset，不要當雜訊放過**。

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **★「虎」沒有被讀出來，這是本隻最大的缺口。** 六位讀者（3 輪 ×2）依序讀成：海象 ×2 → 鼠 ×2 → 鼠 ×2。可查的三個原因：① 低多邊形做不出虎的辨識點（真虎靠白色頰鬚墊、黑鼻樑線、細長臉部條紋，都是貼圖層級，本卷不准用外部貼圖——與 `tiger_a` 報告 ⑤-2 同因）；② 我為了滿足 `part_visible fur_face ≥ 4%` 必須把臉推出兜帽開口，「一顆獸頭從斗篷裡伸出來」的形本身就落在鼠／鼬的形族裡，`a2` 那種「臉深陷在布的開口裡」的構圖反而讀不到臉；③ 三輪我能動的槓桿（縮短吻部 0.276→0.188、後顱加寬到 0.146、`exp` 拉到 4.6–4.8、毛色從 `#7a5c33` 壓到 `#553a16`、獠牙加大、鬍鬚從六根下垂改四根平張）把「海象」修掉了，但沒有把「鼠」修成「虎」。**要真的讀成虎，我判斷只有兩條路：把兜帽拿掉讓整顆虎頭露出來（但那就不是虎姑婆的「布包著」了），或動 `part_visible` 這條 claim 讓臉可以縮回布裡改走剪影暗示——後者是降低通過難度，依 `02 §2.1` 我不能自行動，請主對話裁定。**
2. **M-A1 第 3 輪仍未過，卡在 r3-B 的「可愛」。** 她自己給的理由是「低多邊形卡通建模把恐怖感壓低」——與 `tiger_a` ⑤-3、`redhat` ⑧、`shield` ⑦-1 三份報告記錄的是**同一個風格上限**。`shield` 的解法（`build:"rigid"` 全平面＋`exp` 5.0）本卷沒有套用：一是派工指定 `smooth_angle 24–26`，`rigid` 會整隻變平面、與已收貨的 `redhat`／`boat`／`tiger_c` 不同語言；二是套了要重跑盲讀，而第 3 輪已是上限。**建議主對話把它和 `redhat`／`shield` 的同一條一起處理（是否全 27 隻改走 `rigid`／更低 `smooth_angle`），不要單獨為這隻開特例。**
3. **`eye` 的 side share 只有 0.23%，在戲台鏡頭上是「一個發光點」而不是「一雙眼」。** 三輪都在跟掛件搶位置（見 ⑥-4）；出貨版把它移到眉棚正下方 `around 126`、size 0.032，讀者 B 讀到了（「淡綠色／白色發光的小三角形眼睛，位置在臉側」），A 只讀到「黑色小眼睛……在光照下發亮」。要更清楚只能把兜帽開口再開大，那會削弱特徵 1。
4. **獸前肢的「毛茸」沒有被讀出來。** `fur_paw` 與 `fur_face` 同族色（`#4d3512`／`#553a16`），讀者把它讀成「深棕色手臂」而不是「獸肢」——低多邊形沒有毛的表現手段（`fin` 毛叢試過會爆 tri 預算）。這條記為未達成，不是錯誤。
5. **`part_overlap` 還有兩處刻意保留的 warn**：`fin@Snout`（鼻板）69% 在 `curve@Jaw1`（口內綠光）裡、兩對 `hood_trim` 互相 54%。前者是鼻子壓在口鼻交界、後者是兩束鬼火疊在一起，渲染圖上都不是破面，判斷可接受。
6. **沒有量效能、沒有接進正式對決。** M-A0～A4 沒有要求就沒做。
7. **ART_BIBLE §6「剪影三秒測試」本卷沒做**——那是每兩批一次的批次閘門，需要多隻拼圖，留給主對話在合併批 3 之後執行。

## ⑧ DEVLOG 一行

`gates: M-A0/A3/A4 pass, M-A2 n/a(elite) | M-A1 FAIL@r3 (6 readers: 6/6 讀到「兜帽長袍＋誇張巨爪」、特徵各命中 3/5；氣質 A「威嚇/詭異/陰森」過、B「威嚇感偏可愛惡趣味」出現「可愛」→未過) | restarts: r1 海象（下垂長獠牙＋八字鬍）→ r10 收牙收鬚；r2 鼠（圓潤暖棕臉）→ r13 壓暗+短闊硬楔+exp4.6 | unresolved: 「虎」三輪都沒被讀出來（見 ⑦-1，需主對話裁定 part_visible 那條）；低多邊形卡通感的風格上限（與 tiger_a/redhat/shield 同一條）`
