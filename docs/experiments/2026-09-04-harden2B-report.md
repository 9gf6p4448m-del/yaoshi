# 硬化批 2B — `boat` 拼板舟／`tiger_c` 虎爺印 補齊特徵缺項（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4、17:30／18:40／**19:10**／**19:30** 修訂）＋ `docs/experiments/2026-09-04-creature-gaps.md`。
鐵則：`docs/design/ART_BIBLE.md` §0.5／§1／§2／§5。
基準：worktree `agent-a1469227e02e64676`，起點 main `a6356f5`。**未 commit、未 push。**

> **結論先行：兩隻 H-A0／H-A2／H-A3 全過；H-A1 兩隻都沒到 5/5。**
> `boat` 出貨版盲讀 **4/5 與 5/5**（木板拼接的替代做法**被讀出**：六位裡三位）；
> `tiger_c` 三輪六位**一律 4/5**，白毛邊改成色帶之後**沒有任何一位讀成「滾邊／鑲邊」**（歸因見 ⑦-2）。

---

## ① H-A0 一覽（19:30 預算制：≤1.5MB／tri ≤8000）

| 項目 | boat | tiger_c |
|---|---|---|
| GLB | **897,624 B ＝ 876.6 KB** ≤1.5MB ✅ | **805,612 B ＝ 786.7 KB** ≤1.5MB ✅ |
| triangles | **5,456** ≤8000 ✅ | **4,790** ≤8000 ✅ |
| 動畫 | `idle`／`move`／`attack` ✅ | `idle`／`move`／`attack` ✅ |
| `judge --spec` | **all claims pass** ✅ | **all claims pass** ✅ |
| 19:10 硬邊規則 | `build:"rigid"`、`hull`／`LFin` 皆 `faceted:true`、`smooth_angle` 26 ✅ | `build:"rigid"`、七個 volume 全 `faceted:true`、`smooth_angle` 26 ✅ |
| `exp ≥4.5` | `LFin` 4.6；船身走**具名斷面 `canoe`**（`section.js:44` 的 `polyPoint` 分支不吃 `exp`）＝沿用回修卷 ⑦-8 的**具名斷面豁免 exp**，主對話已簽字 | 見 ⑦-4（本卷未動 body 的 `exp` 3.2，理由同上：那是 tri/bytes 與 `mesh_integrity` 的取捨，不是本卷缺項） |
| 發光材質名 | `eye`／`glow_prow` | `eye`／`mouth_glow`／`glow_tail`／`glow_mane`／**`glow_seal`（本卷新增）** |

指令原文與輸出見 ⑤。

## ② `boat` 改了什麼

| 缺項／指示 | 做法 |
|---|---|
| **木板拼接**（6/6 沒讀出；主對話簽字「引擎做不出木紋」，替代＝船板接縫細深線 arcs 3 條） | 三管齊下：① `hull` `sides` 24→**48**、`ring_step` 0.062→**0.058**（19:30 預算制放行）② **四段板條色差**（底色 #fdf9f0／#efe6d2／#e0d4b6／#d2c19d 由上而下逐條轉暖轉深）＋ **三條 7.5°（一格面寬）深接縫線** #4a423a ③ **三列實體疊板搭口凸條**（`around` 75／97／119，每列 11 段短凸條首尾相接跑滿船身，材質 `hull_body`、厚 0.013）＋ **每側 4 條橫向對接縫**（`around` 108） |
| **一位讀成飛船 → 姿態壓平貼地** | `hull` profile 的 `rv` 在 t 0.30–0.76 **拉成定值 0.205**、`Stern`／`Mid`／`BowBase` 三個關節高度拉齊（up −0.200／+0.008／−0.006），中段龍骨是一條水平線貼地，首尾仍翹（`BowTip` up +0.295）。`turn_count` 6 → **16** |
| 同上：機翼感 | 飛魚鰭由「水平外張的機翼」改**後掠下垂的窄長舷外撐架**（`LFinMid` side 0.280／up −0.030／fwd −0.130），前後弦縮小以免糊住船板接縫 |
| 同上：倒扣感 | 槳由「斜插到龍骨底下」改**立在舷內的停槳**（dir [0.30,0.90,−0.32]），槳葉高過舷唇；橫樑加寬成**座板**（1.7 倍寬、`lash` 由近黑 #1e1f20 改木色 **#7a6446**） |
| 盲讀改側視 | 本卷 `boat` 的兩張盲讀圖＝`judge` 的 **beauty side** ＋ `creature-shoot` 的 **stage-lit**（不再用 hero；hero 機位藏艙是既知問題） |

## ③ `tiger_c` 改了什麼

| 缺項／指示 | 做法 |
|---|---|
| **白毛邊被讀成白爪套**（錐叢像刺） | **5 對 `trim` 錐叢 `curve` 全部移除**；改 `colors.arcs` 色帶。`body` `sides` 16→**48**（7.5°/格）、`head` 14→**36**（10°/格）＝ nail 報告 ⑥-2「低 sides 的窄帶會被吸附成整片面」的對策。落點：**暗銅金滾邊 #6e4f10（82.5–90）→ 香灰白帶 #f6f1e6（97.5–120）→ 腹黑 #1c1a17（127.5–180）**，三段各佔滿整面、交界是硬邊；`head` 同構（90–100／110–130／140–180）讓白帶繞過頸側接上臉頰 |
| 同上（第 1、2 輪的失敗版） | r1：白帶放在 135–146，被 `shading.gradient.bottom −0.88` 乘到 0.12＝等於塗黑 → 把 gradient.bottom 改 **−0.68** 並上移；r2：加了 5 對「扇貝狀白薄片」想做蓬鬆毛邊，實測讀成**一排灰色方塊**，已撤回（見 ⑦-3） |
| 神像感（戲台端才驗得到） | 只做「掛點」：`seal` 材質**改名 `glow_seal`**（`js/creature-figures.js:51` 的 `/^glow_/` 才會掛 emissive），額心金印與胸前金牌兩個部位一起改名。**`js/` 一行未動** |
| rigid／exp ≥4.5 | `build:"rigid"` 明寫、七個 volume 全 `faceted:true`、`smooth_angle` 20→**26**（19:10 修訂的 24–30 帶） |

## ④ H-A1 盲讀原話與命中數

問法固定四題（context-free `sonnet`，每輪 2 位，只給兩張圖、路徑不含生物名）：
「1. 這是什麼？ 2. 請具體列出你看到的所有視覺特徵…… 3. 氣質／主要印象？ 4. 像玩具／可愛，還是會威嚇你、莊嚴或不祥？」

### `boat`（特徵清單＝首尾高翹／白黑紅三色／三角菱形鑲邊／船眼／木板拼接）

| 輪 | 讀者 | Q1 原話（節錄） | 首尾 | 三色 | 菱形 | 船眼 | **木板** | 命中 |
|---|---|---|---|---|---|---|---|---|
| 1 | A | 「一艘反扣過來的小船／竹筏，或某種紙紮風格的載具」 | ✅ | ✅ | ✅ | ✅ | ✗ | **4** |
| 1 | B | 「一艘倒扣的小船/獨木舟船體,配了幾根旗桿或天線」 | ✅ | ✅ | ✅ | ✅ | **✅** | **5** |
| **2（出貨版）** | **C** | 「帶著紙紮／燈籠質感的小船…像節慶用的紙紮小船／竹筏」 | ✅ | ✅ | ✅ | ✅ | ✗ | **4** |
| **2（出貨版）** | **D** | 「一艘小型、破損／傾覆的**木造**小船…擬人化風格的沉船殘骸」 | ✅ | ✅ | ✅ | ✅ | **✅** | **5** |
| 3（已撤回） | E | 「一艘倒扣的**木造**小船/竹筏，混著發光的白色碎片零件」 | ✅ | ✅ | ✗ | ✅ | **✅** | 4 |
| 3（已撤回） | F | 「一艘造型奇特的小船/獨木舟狀物體，帶著突出的桅杆或發光尖角」 | ✗ | ✅ | ✅ | ✅ | ✗ | 3 |

**木板拼接的原話（本卷的關鍵證據，回修卷是 0/6）**
- B：「主體上表面是米白/象牙色,**帶深色橫向線條(像木紋或甲板拼接縫)**」
- D：「船側有淺灰白色的**細密直線刻紋（類似木頭紋理或肋骨結構）**」＋ Q1 直接說「**木造**小船」
- E：「船體主色是米白／灰白，**帶木紋質感的橫向排列（像肋骨或甲板板條）**」
- A（半有）：「材質看起來像是**木頭/竹編**或紙紮工藝，表面有平面拼接的多邊形低模質感」——說了木頭，但把「拼接」歸給低多邊形渲染，本表判 ✗
- C：「帶著**竹編或紙紮**般的粗糙啞光質感」——材質讀成編織不是拼板，判 ✗
- F：「**表面平滑無明顯木紋**，較像塑料或骨質」——明確否定

**六位彙總**：首尾高翹 5/6、白黑紅三色 6/6、三角菱形鑲邊 5/6、船眼 6/6、**木板拼接 3/6（回修卷是 0/6）**。
**「飛船」誤讀消失**：回修卷 r3 的讀者 E 主印象是「小型飛行載具／飛船」，本卷六位**沒有任何一位**再讀成飛行器；六位全部讀成船／獨木舟／竹筏。
**風格牆指標（17:30 修訂要求貼出）**：六位中 4 位（B、C、E、F）正文提及「可愛／玩具／道具感」，其中 3 位明白歸因於低多邊形卡通渲染。

**出貨版＝第 2 輪那一版（`git diff` 中的現況）。** 出貨規則我先寫死再套：**取「兩位讀者命中總數」最高的一版**；第 1 輪 9（4+5）、第 2 輪 9（4+5）、第 3 輪 7（4+3）。第 1、2 輪並列，第 2 輪是第 1 輪的超集（多了三條深接縫色線與木色寬座板），故取第 2 輪。第 3 輪加的「交錯深色橫向對接縫＋槳由兩對減為一對」**實測沒有改善反而掉分，已整組撤回**（撤回後重建的 GLB 與第 2 輪**逐位元組相同**：897,624 B、`lum.side` 107.4，見 ⑤）。
**誠實條**：每輪只有 2 位讀者，9 vs 7 的差距落在單一讀者的判斷上，統計上不可靠——我沒有拿它宣稱「第 3 輪的改動有害」，只宣稱「它沒有證據支持」，所以退回上一個等分的版本。

### `tiger_c`（特徵清單＝蹲踞低伏／橘金布罩＋黑渦漩紋／布罩邊緣白毛邊／深色臉＋咧嘴白獠牙／頸繫紅綬帶）

| 輪 | 讀者 | Q1 原話（節錄） | 蹲踞 | 布罩 | **白毛邊** | 臉／獠牙 | 紅綬帶 | 命中 |
|---|---|---|---|---|---|---|---|---|
| 1 | A | 「背上有火焰鬃毛的黑齒虎/劍齒虎造型的遊戲怪物」 | ✅ | ✅ | ✗ | ✅ | ✅ | **4** |
| 1 | B | 「像劍齒虎/土狼的四足獸型怪物，背上有火焰狀鬃毛與尾巴」 | ✅ | ✅ | ✗ | ✅ | ✅ | **4** |
| 2 | C | 「渾身火焰特效的劍齒虎/劍齒獸造型獸類」 | ✅ | ✅ | ✗ | ✅ | ✅ | **4** |
| 2 | D | 「火焰劍齒虎／獅狀怪獸模型」 | ✅ | ✅ | ✗ | ✅ | ✅ | **4** |
| **3（出貨版）** | **E** | 「像劍齒虎／獅子的低多邊形風格奇幻猛獸，背上有火焰狀鬃毛」 | ✅ | ✅ | ✗ | ✅ | ✅ | **4** |
| **3（出貨版）** | **F** | 「低多邊形風格的火屬性劍齒虎造型異獸/怪物模型」 | ✅ | ✅ | ✗ | ✅ | ✅ | **4** |

**白毛邊被讀成什麼（六位一致，這是本卷最重要的一條負向證據）**
- A：「身體主色為黑、黃橙、乳白三色分區……**腹側偏乳白**」
- B：「背部偏橙、**腹側偏白/米色**」
- C：完全沒提身上的白帶（只提了下顎白）
- D：「**鼻口部與下顎是灰白色調**」（讀到的是下顎，不是布罩邊）
- E：「**腹部與四肢下段轉為米白色**」
- F：「腹部與四肢下段轉為米白色，**形成上深下淺的野獸配色**」＋「（深淺分界的）**邊緣是硬切面而非鑲邊滾邊**」

**六位彙總**：蹲踞低伏 6/6、橘金布罩＋黑紋 6/6、深色臉＋白獠牙 6/6、紅綬帶 6/6、**白毛邊 0/6**。
**進展（雖然沒過）**：回修卷是「四位讀成白爪／刺」＝**錯誤讀法**；本卷變成「腹側米白」＝**中性讀法**，錐叢造成的誤讀已消除。
**三輪命中總數全部是 8（4+4），沒有任何一版勝出**；出貨取最後一版（硬邊最乾淨、暗銅金滾邊與白帶各佔滿整面，見 `2026-09-04-harden2-tiger_c-side.png`）。
主印象：六位全部落在「兇猛／掠食者／威嚇」一側，沒有任何一位的**主印象**是可愛（Q4 有 3 位提到「卡通化削弱了兇猛」＝風格牆指標）。

## ⑤ 指令原文與實際輸出

```
$ node tools/anyCreature/engine/cli.js assets/creatures/boat.json assets/creatures/boat.glb
{"ok":true,"out":"assets/creatures/boat.glb","bytes":897624,"verts":13372,"faces":3222,
 "joints":11,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.483}}

$ node tools/anyCreature/harness/judge.mjs assets/creatures/boat.glb <out> boat \
       --spec assets/creatures/boat.claims.json
"triangles":5456
"lum":{"front":100.2,"side":107.4,"tq":120.9,"reartq":106,"top":76.5}
"hi_sat_share":{"front":0.1428,"side":0.1936,"tq":0.2206,"reartq":0.1984,"top":0.1949}
[judge] Spec "拼板舟 boat_pinbanzhou_ling (zuling/swarm)" — all claims pass.

$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/boat.glb <out>
{"W_over_H":2.08,"fill":0.543,"mass_thirds":[0.362,0.347,0.291],"torso_depth_max":0.75,
 "torso_depth_min":0.44,"mass_contrast":1.7,"leg_fraction":null,"turn_count":16,
 "zigzag_alignment":0.83,"front":{"W_over_H":1.08,"fill":0.271},
 "top":{"W_over_H":0.59,"fill":0.41},"hero":{"W_over_H":1.33,"fill":0.546}}

$ node tools/anyCreature/harness/hero.mjs assets/creatures/boat.glb <out>   → {"ok":true,"margin":9}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-harden2-boat-stage-lit.png \
       "glb=boat.glb&light=1&fx=1&rim=zuli" idle 8818
{"query":"glb=boat.glb&light=1&fx=1&rim=zuli","phase":"idle","fps":59.88,"calls":16,
 "loadMs":211,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-harden2-boat-n3.png \
       "glb=boat.glb&light=1&fx=1&rim=zuli&n=3" idle 8819
{"...","calls":38,"loadMs":206,"particles":132,"errors":[]}
```

逐條對門檻（boat）：`style_light` 側視中位亮度 **107.4**（需 ≥95）／`saturation_area` tq **22.1%**（帶 10–60%）／`share_hierarchy` tq **59:19:22**（目標 60:30:10，容差 15%，最大偏離 11%）／`focal_contrast` hull_body:fin_fly **8.5×**（需 ≥3）／`tri_budget` 5456（1500–8000）／`part_exists` ×5 全在 materials 列表。

```
$ node tools/anyCreature/engine/cli.js assets/creatures/tiger_c.json assets/creatures/tiger_c.glb
{"ok":true,"bytes":805612,"verts":11639,"faces":2722,"joints":34,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.497}}

$ node tools/anyCreature/harness/judge.mjs assets/creatures/tiger_c.glb <out> tiger_c \
       --spec assets/creatures/tiger_c.claims.json
"triangles":4790
"hi_sat_share":{"front":0.4134,"side":0.3442,"tq":0.4008,"reartq":0.3722,"top":0.4883}
"names":[... "glow_seal" ...]
[judge] Spec "妖火虎 tiger_ye_yaohuo (V-C, NPC/elite)" — all claims pass.

$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/tiger_c.glb <out>
{"W_over_H":1.76,"fill":0.488,"mass_thirds":[0.388,0.388,0.224],"torso_depth_max":0.78,
 "torso_depth_min":0.19,"mass_contrast":4.07,"leg_fraction":0.186,"turn_count":35,
 "zigzag_alignment":0.74,"front":{"W_over_H":0.84,"fill":0.674},
 "top":{"W_over_H":0.48,"fill":0.543},"hero":{"W_over_H":1.45,"fill":0.438}}

$ node tools/anyCreature/harness/hero.mjs assets/creatures/tiger_c.glb <out> → {"ok":true,"margin":8.6}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-harden2-tiger_c-stage-lit.png \
       "glb=tiger_c.glb&light=1&fx=1&rim=xianghu" idle 8818
{"...","fps":59.88,"calls":24,"loadMs":205,"particles":44,"errors":[]}
```

`tiger_c` 逐條：`saturation_area` tq **40.1%**（帶 10–60%）／`focal_contrast` fur_head:glow_mane 過／`share_hierarchy` 過／`part_signature` fur_jaw 側視過／`tri_budget` 4790（**1500–5000 未動**，本隻不需要放寬）。

### H-A2 — swarm `?n=3`

模型寬 **1.050** ≤ **1.2** ✅（`whole.size` x；回修卷是 1.004，本卷因鰭外伸加長而增加）；模型高 **0.794** ≤ 0.85 ✅。
`docs/experiments/2026-09-04-harden2-boat-n3.png`：三隻橫排、**相鄰兩隻的輪廓沒有相交**（`creature-shoot` `errors` 空陣列，肉眼逐隻核對過）。

## ⑥ H-A3 範圍與 claims 改動

```
$ git add -N . && git diff --stat        （暫存腳本目錄 _tmp_h2b/ 與 tools junction 都已刪除）
 assets/creatures/boat.claims.json                  |   32 +-
 assets/creatures/boat.glb                          |  Bin 226568 -> 897624 bytes
 assets/creatures/boat.json                         | 3922 ++++++++++++++++++--
 assets/creatures/tiger_c.glb                       |  Bin 393388 -> 805612 bytes
 assets/creatures/tiger_c.json                      |  240 +-
 docs/experiments/2026-09-04-creature-gaps.md       |    6 +-
 docs/experiments/2026-09-04-harden2-boat-hero.png  |  Bin 0 -> 395417 bytes
 docs/experiments/2026-09-04-harden2-boat-n3.png    |  Bin 0 -> 97496 bytes
 docs/experiments/2026-09-04-harden2-boat-side.png  |  Bin 0 -> 61158 bytes
 .../2026-09-04-harden2-boat-stage-lit.png          |  Bin 0 -> 177577 bytes
 .../2026-09-04-harden2-tiger_c-hero.png            |  Bin 0 -> 290562 bytes
 .../2026-09-04-harden2-tiger_c-side.png            |  Bin 0 -> 58450 bytes
 .../2026-09-04-harden2-tiger_c-stage-lit.png       |  Bin 0 -> 186973 bytes
 docs/experiments/2026-09-04-harden2B-report.md     |  214 ++
 14 files changed, 4009 insertions(+), 405 deletions(-)
```

`boat.json` 的 3,922 行差異裡實質改動就是 ②：其餘是 `json.dumps(indent=1)` 重排（原檔是緊湊排版）＋ 三列各 11 段疊板凸條與橫向對接縫共 37 個新 `parts` 條目逐行展開。
`creature-gaps.md` 只動了自己的三列（boat ×1、tiger_c ×2），其他生物的列一個字未改。

`js/`、`index.html`、`tests/`、`tools/anyCreature`、其他生物的 `assets/creatures/*` **一行未動**。截圖用的 `tools` junction 已刪除。**未 commit、未 push。**

### ★ claims 的唯一一處放寬（必須被看見）

`assets/creatures/boat.claims.json` 的 `tri_budget` 上限 **5000 → 8000**。
- **依據**：凍結檔 2026-09-04 **19:30 修訂**（main `15a3a37`）原文「GLB 上限改預算制——每隻 ≤1.5MB、三角形 ≤8,000（**claims tri_budget 上限可改 8000**）」。這是凍結檔本身授權的放寬，不是我為了讓實作過關而動門檻。
- **實際需要**：出貨版 5,456 tri，在舊上限 5000 之下會 BLOCK（第 5 輪實測 `✗ Triangle count 5376 is outside the budget band 1500–5000`）。
- **其餘門檻一格未動**：`style_light` ≥95、`saturation_area` 10–60%、`focal_contrast` ≥3、`share_hierarchy` 容差 0.15、五條 `part_exists` 全部原封不動。
- `tiger_c.claims.json` **一個字未動**（4,790 tri 仍在原本的 1500–5000 內）。

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **`boat` 的木板拼接是 3/6，不是 6/6。** 依 18:40 裁定「引擎做不出的項目有主對話簽字的替代做法**且替代做法被讀出**」＝可視為完成，本卷的替代做法（四段板條色差＋三列實體疊板搭口凸條＋橫向對接縫）**確實被三位讀者逐字讀成「木紋／甲板拼接縫／板條」**，回修卷是 0/6。但仍有兩位讀成「竹編／紙紮」、一位明確說「表面平滑無明顯木紋」。**這一條算不算劃掉，我不自己裁**，缺項表照實寫成「替代做法已被讀出（3/6），未全數」。
2. **`tiger_c` 的白毛邊 0/6，三輪用盡，這是本卷的失敗項。** 歸因是讀者 F 直接講出來的：**在四足獸身上，一條沿身體長軸跑的白色縱帶＝天然的反蔭蔽（countershading）毛色**，讀者一律歸給「腹側」，不會歸給「布罩的滾邊」。要讀成滾邊，白帶必須沿**布罩的輪廓**跑（含前緣、後緣與背脊上的收邊）形成一條封閉的邊，而 `colors.arcs` **只能沿軸向分帶**，做不出封閉輪廓線（與「橫紋做不出來」是同一個限制，tiger_a 報告 ⑤-5）。實體路線兩條都試過並失敗：**錐叢 `curve` → 讀成白爪／刺**（回修卷四位）、**扇貝狀薄 `fin` → 讀成一排灰色方塊**（本卷第 2 輪，已撤回）。**要真的兌現這一條，需要的是引擎支援「沿部位輪廓的鑲邊」或貼圖，超出本卷。**
3. **本卷第 2 輪的扇貝薄片是負向結果，我把它撤回了。** 5 對 `trim` 平薄片貼在布罩下緣，判斷是「平貼圓弧＝毛簇」，實際渲染出來是尺寸一致的六邊形瓦片，而且落在 `shading.gradient` 的壓暗區。**「把錐體換成平板」不會把『刺』變成『毛』——引擎沒有蓬鬆這個語彙**，這條建議寫進硬化批附件。
4. **`tiger_c` 的 body `exp` 仍是 3.2，沒有推到 ≥4.5。** 本卷不動它的理由：`exp` 的角點在 `faceted` 之下會再乘一次頂點分裂（回修卷 ⑦-3），而本卷已經為了白帶把 `sides` 從 16 拉到 48；`exp` 3.2→4.5 我沒有實測過在新 `sides` 下的 `mesh_integrity`／bytes。**這是「沒做」不是「做了通過」**，若主對話要，是一次獨立的實驗。
5. **`boat` 的「倒扣」誤讀沒有消滅。** 六位裡 A、B、E 三位仍說「倒扣」，即使已經把槳立起來、座板加寬、船底壓平。歸因同回修卷 ⑦-1：**盲讀吃的兩張圖（側視＋stage-lit）都看不進艙裡**——側視是純側面，stage-lit 的機位仰角低。這是機位問題，改模型解不掉；要解要嘛盲讀補一張俯視 3/4，要嘛戲台機位抬高，兩者都是主對話的裁定。
6. **`shading.gradient.bottom` 從 −0.88 改成 −0.68**（`tiger_c`）。這是為了讓白帶不被乘到 0.12，但它是**全身的**明度斜坡，腿與腹整體提亮了一階。`tiger_c` 是 26 隻的模板，這個值若要回收或推廣，請主對話裁定。
7. **沒有量效能、沒有接進正式對決、沒有做剪影三秒測試。** H-A0～A3 沒有要求就沒做；`creature-shoot` 順手回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。
8. **判斷用的是 12 個 context-free `sonnet` 讀者，不是使用者本人。** 這只證明「模型讀者會不會讀出這條特徵」，不證明使用者滿意。

## ⑧ 這一卷踩到、下一隻會再遇到的引擎事實（新三條）

1. **★ `colors.arcs` 的深色帶落在 `around≈90` 時，側視投影面積最大——那是側視亮度預算的主要吃分點。**
   對圓身而言，一條角度帶在側視上的投影高度 ∝ |cos θ₁ − cos θ₂|，在 θ=90° 附近最大、在 0°／180° 附近趨近 0。`boat` 第 1 次改版把三條各 7.5–11.25° 的深接縫帶放在 78–135°，`style_light` 的側視中位亮度就從 **96.5 掉到 66.8**（門檻 95）——同樣寬度的帶放在 150–180° 只會掉個位數。**要在側視上畫細線，寬度不是唯一變數，位置才是**；真的要在腰線畫線，改用**實體凸條**（本檔三列各 11 段短 fin），亮度成本近乎 0 而且多了一條真的高光。
2. **★ 具名斷面（`sections`）的 `sym` 角度不是幾何角度，是「多邊形點位」。**
   `section.js:26` 的 `polyPoint` 按索引位置取樣，`compile.js:219` 的 `sym` 又只由頂點序號算出來，兩者合起來是：`f = n·(sym/360 + 1/4)`（`n`＝多邊形點數）。`boat` 的 16 點 `canoe` → **f = sym/22.5 + 4**，所以 sym 45 剛好落在舷唇那個點、sym 90 落在最寬點。**要把色帶對準斷面上某個轉折，先算 f，不要用幾何角度猜**；`sides` 拉高只是把每條多邊形邊切得更細，f 的對應不變。
3. **★ 立在生物身上的長條配件會偷偷吃掉 `share_hierarchy` 的 tertiary 額度。**
   `boat` 的槳從「斜插到船底」改成「立在舷內」之後，`oar` 的 tq share 從 4.9% 跳到 **10.1%**（同樣的幾何、只換了方向），tertiary 直接從 21% 衝到 25.3% 破表。**改配件姿態＝改它的投影面積，等同改 share**；動任何 `conform:false` 的長條前先看一眼 tertiary 的餘裕。

## ⑨ DEVLOG 一行

`harden2B`：boat 壓平貼地＋後掠鰭＋四段板條色差／三列實體疊板搭口凸條（sides 48、ring_step 0.058、全 volume faceted）→ 六位盲讀**沒有一位再讀成飛船**、木板拼接由 0/6 升到 **3/6**、出貨版命中 4/5 與 5/5；tiger_c 拿掉白毛簇錐叢改暗銅金滾邊＋香灰白硬邊色帶（body sides 48／head 36）、`seal` 改名 `glow_seal`、全 volume faceted → 三輪六位**一律 4/5，白毛邊 0/6 未過**（歸因：縱向白帶在四足獸上一律被讀成反蔭蔽毛色，arcs 做不出封閉輪廓的鑲邊）。judge 兩隻全綠、876.6KB／786.7KB、tri 5456／4790（19:30 預算制），boat claims `tri_budget` 依 19:30 修訂授權放寬 5000→8000，其餘門檻一格未動。
