# 3D 量產卷批 1 回報 — `redhat` 魔神仔紅帽（yinqi／haunt，26 隻的第一隻 haunt）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（門檻未動；`saturation_area` 依 `2026-09-04-creature-briefs.md`「主對話裁定」第 2 條放寬為 10–70%，理由＝紅帽是 IP 色）。
基準 SHA：`86d101a`（worktree `agent-a4fba2367609d41bd`；worktree 建立時停在 `e150ad4`，開工前先 `git checkout 86d101a` 對齊派工指定的基準）。**未 commit、未 push。**
出貨檔：`assets/creatures/redhat.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-creature-redhat-{hero,stage-lit,ghost}.png`。

一句話結論：**技術鏈（M-A0／A2／A3／A4）全綠，M-A1 盲讀三輪未過——六位讀者全部讀到「妖怪／幽靈／小妖怪」（「這是什麼」那一半 6/6 成立），但「主印象不得為玩具／可愛」只有 2/6 成立。依凍結檔收尾條款交出最佳版並標「未過」。**

---

## ① M-A0～M-A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| M-A0 GLB 規格 | **PASS** | 254.7 KB ≤ 400 KB；`idle`／`move`／`attack` 三支；`skins`=1；0 張貼圖；judge 對 `redhat.claims.json` **all claims pass**；tri 2966 ∈ [1500,5000]；silmetrics 側視 thumb24 與 hero 都輸出成功 |
| M-A1 盲讀（context-free ×2 ×3 輪） | **未過**（3 輪額度用盡） | r1「拼裝獠牙小惡魔」(過)／「可愛小妖怪吉祥物」(不過)；r2「詭異漂浮妖怪」(過)／「圓潤黏糊小妖怪」(不過)；r3「呆萌小巫師幽靈怪」(不過)／「可愛小巫師妖怪」(不過)。原話見 ② |
| M-A2 體型（haunt 下半身虛化） | **PASS** | `…-ghost.png`：腰以下沒有任何腿，霧裾收成尖底、底端 y≈0.04 懸空，戲台投影與本體分離＝飄浮；`leg_fraction` 量到 **null**（無腿）；腰以下材質全部是 `ghost_skirt`／`ghost_wisp` |
| M-A3 發光材質名 | **PASS** | GLB materials 清單含 `eye`、`mouth_glow`（也含 haunt 專用的 `ghost_skirt`、`ghost_wisp`），逐字見 ④ |
| M-A4 diff 範圍 | **PASS** | `git diff --stat` 只有 `assets/creatures/redhat.*`、三張 `docs/experiments/2026-09-04-creature-redhat-*.png` 與本報告；**既有檔案一行未動**（`index.html`／`js/*`／`tests/tools/*`／既有 creatures 都不在 diff 裡） |

**不算通過的地方（誠實條）**：M-A1 未過，詳見 ⑥-1；三輪六位讀者失敗的理由高度一致，都是「低多邊形＋圓潤＋比例可愛」——與 `2026-09-04-lookdev-tiger_a-report.md` ⑤-3 記的風格上限是同一件事。

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給 hero 與 stage-lit 兩張圖）

兩張圖在給讀者之前一律複製成中性檔名（`_tmp_v1/v2`、`_tmp_w1/w2`、`_tmp_z1/z2`），路徑不含 `redhat` 字樣，prompt 明寫「不要從檔名推論」。問法固定三題：「1. 這是什麼？ 2. 它的氣質是什麼？ 3. 比較像玩具／可愛的東西，還是比較像會威嚇人、讓人不安的東西？」，最後要一句「主要印象：____」。

### 第 1 輪（r13：帽緣 0.234 寬、霧裾 #93a49b、粗霧鬚）

**讀者 A**
> 1. 一隻疊起來的怪物／史萊姆合成獸——頭戴一頂紅色巫師尖帽，臉是黑色、有兩顆綠色眼睛（帶尖獠牙），身體是黑色機械感的軀幹，下半身坐在一個有青綠色尖刺、半透明的水晶／史萊姆底座上，整體像三段不同素材硬接在一起的組合怪。
> 2. 詭異、拼裝感很重、有點滑稽又帶點陰森……整體氣質不統一，像是「萌系」跟「小怪物」硬揉在一起，帶點廉價感或未完成感。
> 3. 兩者都沾一點，但整體更偏「讓人不安/違和」而非單純可愛……
> 主要印象：**拼裝獠牙小惡魔**

**讀者 B**
> 1. 一個 3D 角色模型：頭上戴著一頂尖錐形紅色巫師/精靈帽，臉是深黑色、有一對綠色眼睛與兩根小獠牙，身體呈黑色岩塊狀，底部像一顆長出綠色尖刺（水晶或草葉狀）的深色卵形基座，像是漂浮在半空的怪物角色。
> 2. 低多邊形卡通風格……帶點詭異可愛（cute-creepy）的調性。
> 3. 整體比較偏玩具／吉祥物路線：比例圓潤矮胖、低多邊形卡通造型、獠牙與眼睛畫得討喜而非猙獰……
> 主要印象：**可愛小妖怪吉祥物**

判定：**一過一不過**（A 過、B 不過）。兩位一致點名三件事 →修復輪 1 的施力點：① 頭／軀幹／霧裾「三段硬接」② 臉討喜 ③ 霧鬚讀成水晶／草葉。

### 第 2 輪（r15：肩台放緩、霧裾頂端接住軀幹下緣、霧色靠近袍色、霧鬚改細長、嘴裂放寬、帽緣收到 0.204）

**讀者 C**
> 1. 一隻頭戴紅色尖頂斗笠、身體是深灰岩石質地、下半身化成半透明綠色黏液/煙霧狀漂浮尾巴的類人形小怪物——有點像陶俑或土偶精怪。
> 2. 陰森又帶點滑稽的詭異感……整體偏「妖怪／幽魂」路線。
> 3. 比較偏向會讓人不安、帶威嚇感的東西——單眼發光、獠牙、黏液狀下半身漂浮在空中……不是可愛玩具的路線。
> 主要印象：**詭異漂浮妖怪**

**讀者 D**
> 1. 一隻矮胖的怪物／小妖怪造型 3D 角色：頭上戴一頂尖尖的紅色斗笠（像武士笠或小丑帽），身體是深灰黑色、帶稜角的塊狀軀幹，有一雙短短的手臂，下半身是半透明的墨綠色果凍狀／史萊姆狀底座，還垂著幾條像滴落的黏液或觸鬚。
> 2. 整體偏「Q版怪物」路線……有點呆萌、帶點滑稽的味道。
> 3. 比較偏玩具／吉祥物那一類……造型圓潤、比例可愛（大頭小身體、短手）。
> 主要印象：**圓潤黏糊小妖怪**

判定：**一過一不過**（C 過、D 不過）。D 的三個字面理由（圓潤／矮胖／短手）＋C 說帽子是「斗笠」→ 修復輪 2 的施力點：全域 `smooth_angle` 壓到 22–26、肩與霧裾收窄、帽緣收窄＋錐體加高、手臂拉長。

### 第 3 輪（r16＝出貨版）

**讀者 E**
> 1. 一隻頭戴紅色巫師帽（尖錐帽）的暗色小怪物/小妖怪，下半身像水滴或幽靈的形狀，還帶著綠色的觸鬚或藤蔓狀的東西垂在身側。
> 2. 偏低模多邊形的卡通風格，帶點詭異又帶點滑稽的混合感……
> 3. 比較偏向可愛/滑稽的類型，帶一點點小小的詭異感（幽靈狀身軀、發光眼睛），但整體造型圓潤、比例矮胖、色彩鮮明，不會讓人真的感到威嚇或不安……
> 主要印象：**呆萌小巫師幽靈怪**

**讀者 F**
> 1. 深灰／黑色的身體，頭上戴著一頂紅色尖頂巫師帽（帽緣是粉紅色），臉部有一對發亮的白綠色眼睛，下巴有兩顆小尖牙外露。身體下半部呈水滴狀，帶有半透明的綠色觸手／飄帶狀物體從身體兩側垂下，像是幽靈或魔物的下半身懸浮在空中，第二張圖還能看到牠飄浮在深色場景中、腳下有陰影和粒子特效。
> 2. 有點滑稽又帶點詭異……整體氣質偏向「Q版小妖怪」，不是寫實恐怖。
> 3. 比較偏向玩具／吉祥物一類。造型圓潤、色塊簡單、比例可愛（大頭小身體），巫師帽也帶點童趣裝扮感……
> 主要印象：**可愛小巫師妖怪**

判定：**兩位都不過**。修復額度用盡（3 輪），依凍結檔收尾條款出貨並標「未過」。

### 六位讀者的統計（給主對話裁定用）

| 判準 | 成立數 |
|---|---|
| 「這是什麼」讀成鬼／幽靈／妖怪／精怪／小怪物 | **6 / 6** |
| 主動說出「帽子」（巫師帽／尖錐帽／尖頂斗笠） | **6 / 6**（其中 4 位說「巫師帽／尖錐帽」，2 位說「斗笠」——都是第 1、2 輪的版本） |
| 主動說出「漂浮／懸浮／幽靈下半身」 | **5 / 6** |
| 主印象**不是**玩具／可愛（M-A1 的閘門） | **2 / 6**（A、C） |

**版本與盲讀分數的對應要講清楚**：r13 得 1/2、r15 得 1/2、出貨的 r16 得 **0/2**。我沒有主張 r16 在盲讀上比較好——選 r16 是因為它才是符合凍結簡報「招牌剪影＝**尖頂**紅帽（細高錐體，帽緣外翻成一圈細邊，頸肩分明）」的那一版：r13／r15 的帽子被兩位讀者讀成「斗笠／武士笠／小丑帽」，那會和 B-A2 剪影不撞車表裡「A 群」的其他帽子撞在一起。**要換回 r15，只要把 ⑤ 的「第 3 輪改了什麼」那六條逐條還原即可**，我把它們單獨列出來就是為了這個。

---

## ③ 改了什麼（檔案:行號）

全部是新檔，既有檔案一行未動。

| 檔案 | 行數 | 內容 |
|---|---|---|
| `assets/creatures/redhat.json` | 1–226 | 魔神仔紅帽的 anyCreature 規格。metadata／陷阱註記 `2–11`、palette `13–26`、shading／smooth_angle `28–29`、骨架 `31–60`（body 上行／mist 下行／head／jaw／hat／LArm 六鏈）、chains・attach・mirror・touch `62–72`、體積 `74–144`、部位 `146–184`（眼、怒眉板、口內發光楔、獠牙、手掌、四叢霧鬚）、三支動畫 `186–225` |
| `assets/creatures/redhat.claims.json` | 1–87 | judge.mjs 的機械檢查清單。基底＝`tiger_c.claims.json`，只換材質名＋依裁定把 `saturation_area` 帶改成 10–70%＋加兩條 `part_exists` 釘住 `ghost_skirt`／`ghost_wisp`（加嚴） |
| `assets/creatures/redhat.glb` | — | 260,856 bytes，引擎輸出 |
| `docs/experiments/2026-09-04-creature-redhat-hero.png` | — | anyCreature `harness/hero.mjs`，1024²，margin 8.5% |
| `docs/experiments/2026-09-04-creature-redhat-stage-lit.png` | — | 戲台 3/4（`tests/tools/creature-shoot.mjs`，`light=1&fx=1&rim=yinqi`） |
| `docs/experiments/2026-09-04-creature-redhat-ghost.png` | — | M-A2 的下半身虛化證明（stage-lit 的下半身放大裁切） |

### `redhat.claims.json` 相對 `tiger_c.claims.json` 的差異

1. `saturation_area` 上限 0.60 → **0.70**（`2026-09-04-creature-briefs.md`「主對話裁定」第 2 條明文放寬，不是我自己調的）。
2. 材質名整批換掉（`fur_body`／`fur_head`／`fur_jaw`／`glow_mane`／`glow_tail` 在本隻不存在，留著 judge 會直接報 part 不存在）：`part_signature` 與 `focal_contrast` 的招牌部位改成 `hat`，`focal_contrast` 的對手改成 `skin_head`，`share_hierarchy` 改成 霧裾（`ghost_skirt`＋`ghost_wisp`）／紅帽／臉。
3. **新增兩條** `part_exists`（`ghost_skirt`／`ghost_wisp`），機械釘住 haunt 的 `ghost_` 前綴——這是加嚴，不是放寬。
4. 其餘門檻逐字沒動：`focal_contrast.min_ratio` 2、`share_hierarchy.tolerance` 預設 0.15、`part_signature` `min_share` 0.06／`or_min_span` 0.12、`tri_budget` 1500–5000。

**claims 是在動手建模之前就寫定的**，之後每一輪都是改 `redhat.json` 去遷就它。`focal_contrast`（帽必須 ≥2× 臉）實際擋過我兩次：13.3% vs 7.2%＝1.84×、以及更早的 10.6% vs 11.1%＝0.95×；兩次都是**把頭縮小、把帽加高加寬**去過，沒有動 `min_ratio`。出貨值 `hat` 13.94% vs `skin_head` 5.88% = **2.37×**。

---

## ④ 指令原文與實際輸出

以下 `<AC>` = `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`，`<WT>` = 本 worktree 根目錄。全部指令都帶 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。

### M-A0 — 引擎編譯

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/redhat.json out/redhat/r16.glb
{"ok":true,"out":"out/redhat/r16.glb","bytes":260856,"verts":2964,"faces":1607,
 "joints":27,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.353}}
```

### M-A0／M-A3 — 出貨 GLB 本身的規格與 materials 清單

```
$ python _tmp_glbinfo.py assets/creatures/redhat.glb      # 直接讀 GLB 的 JSON chunk
{"file": "assets/creatures/redhat.glb", "bytes": 260856, "kb": 254.7,
 "animations": ["idle", "move", "attack"], "skins": 1, "meshes": 1, "primitives": 12,
 "materials": ["robe", "ghost_skirt", "skin_head", "skin_jaw", "hat", "sleeve",
               "eye", "stripe", "mouth_glow", "fang", "hand", "ghost_wisp"],
 "images": 0,
 "attributes": ["COLOR_0", "JOINTS_0", "NORMAL", "POSITION", "WEIGHTS_0"],
 "generator": "anyCreature v1.2.0",
 "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "redhat"}}
```

逐條核對：254.7 KB ≤ 400 KB ✅／三支動畫齊 ✅／`skins`=1 ✅／0 張貼圖（顏色全在 `COLOR_0`）✅。
**M-A3**：簡報指定的兩個發光材質名 **`eye`** 與 **`mouth_glow`** 都原樣出現在 materials 清單裡 ✅；haunt 專用的 **`ghost_skirt`**、**`ghost_wisp`** 也在 ✅。

### M-A0 — judge（對凍結後的 claims）

```
$ node <AC>/harness/judge.mjs <WT>/assets/creatures/redhat.glb out/redhat/judge_ship redhat \
      --spec <WT>/assets/creatures/redhat.claims.json
stats  {"triangles": 2966, "skinnedMeshes": 12, "animations": ["idle", "move", "attack"]}
lum    {"front": 45.9, "side": 40.4, "tq": 46.1, "reartq": 35.2, "top": 48.1}
hi_sat {"front": 0.3308, "side": 0.1618, "tq": 0.2275, "reartq": 0.2595, "top": 0.6207}
ghost_skirt  side 26.65  tq 24.09  span_ratio 0.7614
ghost_wisp   side 10.15  tq 10.53  span_ratio 0.8195
hat          side 13.94  tq 15.45  span_ratio 0.6056
skin_head    side  5.88  tq  3.77  span_ratio 0.313
robe         side 24.21  tq 22.99  span_ratio 0.615
[judge] Spec "魔神仔紅帽 moshenzai_redhat (yinqi/haunt)" — all claims pass.
```

逐條核對：
`tri_budget` 2966 ∈ [1500,5000] ✅／`rig_skinned`（12 skinned meshes）✅／`anim_named` 三支 ✅／
`saturation_area`（tq）**22.75%** ∈ [10%,70%] ✅（離上限還有三倍餘裕，紅帽的高飽和沒有把預算吃光）／
`part_signature` `hat` 側視 share 13.94% ≥ 6% ✅／
`focal_contrast` 13.94 ÷ 5.88 = **2.37×** ≥ 2 ✅／
`share_hierarchy` 側視 霧裾(26.65+10.15=36.80) : 帽(13.94) : 臉(5.88) → **65:25:10**（目標 60:30:10，容忍 ±15%，最大偏差 0.05）✅／
`part_exists` × 5（`hat`／`eye`／`mouth_glow`／`ghost_skirt`／`ghost_wisp`）✅。

### M-A0 — silmetrics（出貨檔，側視＋hero）

```
$ node <AC>/harness/silmetrics.mjs out/redhat/r16.glb out/redhat/sil_r16
{"W_over_H":0.51,"fill":0.423,"mass_thirds":[0.074,0.572,0.354],
 "torso_depth_max":0.95,"torso_depth_min":0.07,"mass_contrast":12.81,
 "leg_fraction":null,"turn_count":6,"zigzag_alignment":0.5,
 "front":{"W_over_H":0.43,"fill":0.48},"top":{"W_over_H":0.85,"fill":0.691},
 "hero":{"W_over_H":0.56,"fill":0.424}}
```

側視 `sil_side.png`／`thumb24.png`／`sil_hero.png` 都輸出成功。對 `example/wolf.json` 的錨點（W/H 1.41／fill 0.39／leg_fraction 0.35）：
**W/H 0.51（−64%，從「長而低的四足」翻成「瘦高的直立飄浮體」，往反方向離開錨點）、`leg_fraction` null（無腿，這是 haunt 的定義）、`mass_contrast` 12.81（wolf 級距的三倍以上——肩台與霧裾尖底的落差）**。
`turn_count` 只有 6（tiger_c 是 30），這是誠實條 ⑥-3。

### M-A0／M-A2 — hero render 與戲台截圖

```
$ node <AC>/harness/hero.mjs out/redhat/r16.glb out/redhat/hero_r16
{"ok":true,"margin":8.5}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-redhat-stage-lit.png \
       "glb=redhat.glb&light=1&fx=1&rim=yinqi" idle 8802
{"out":"docs/experiments/2026-09-04-creature-redhat-stage-lit.png",
 "query":"glb=redhat.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88023952095792,"calls":19,"loadMs":175,"particles":44,"errors":[]}
```

- `errors: []`——`console.error`／`pageerror` 兩種來源都收，空陣列 ✅。
- 埠號用派工指定的 **8802**；`creature-shoot.mjs` 自己起 `python -m http.server` 並在 `finally` 裡 `srv.kill()`，收工時已關。
- **`?glb=` 只吃檔名不補副檔名**（`creature-preview.html:69-72`），要寫 `glb=redhat.glb`；寫 `glb=redhat` 會 404，這一條給後續 25 隻。
- stage-lit 是 `creature-shoot.mjs` 的原始輸出 1688×780，**只做了一次純裁切**到 660×780（把兩側空地裁掉讓主體佔滿畫面），沒有縮放、沒有調色；`…-ghost.png` 是同一張的下半身裁切後以 NEAREST 放大 2×。

**M-A2 的證據怎麼看 `…-ghost.png`**：腰以下沒有任何腿或足；霧裾（`ghost_skirt`）從腰下方張開再收成尖底，底端停在 y≈0.04；戲台地面的投影與本體之間有明顯空隙＝懸空；四叢 `ghost_wisp` 霧鬚沿霧裾外緣往上捲。機械面另有兩個數字佐證：`silmetrics` 的 `leg_fraction` 量到 **null**（找不到腿），`judge` 的 `ghost_skirt`＋`ghost_wisp` 側視合計 **36.8%**＝整隻的下三分之一全部是 `ghost_` 材質。

### M-A4 — diff 範圍

```
$ git add -N . && git diff --stat && git reset
 assets/creatures/redhat.claims.json                |  87 ++++++++
 assets/creatures/redhat.glb                        | Bin 0 -> 260856 bytes
 assets/creatures/redhat.json                       | 226 +++++++++++++++++++++
 .../2026-09-04-creature-redhat-ghost.png           | Bin 0 -> 56897 bytes
 .../2026-09-04-creature-redhat-hero.png            | Bin 0 -> 218376 bytes
 .../2026-09-04-creature-redhat-stage-lit.png       | Bin 0 -> 83911 bytes
 6 files changed, 313 insertions(+)
```

（本報告 `.md` 是這一版之後才寫的。）暫用檔 `_tmp_probe.cjs`／`_tmp_glbinfo.py`／六張 `_tmp_*.png` 已刪。
`index.html`、`js/creature-figures.js`、`js/duel-figures.js`、`tests/tools/creature-preview.html`、`tests/tools/creature-shoot.mjs`、`assets/creatures/tiger*.{json,glb,claims.json}` **一個位元組都沒動** ✅（都不在 diff 裡）。

**一個要講清楚的操作**：`tests/tools/creature-shoot.mjs` 會 `require` `tools/anyCreature/package.json` 底下的 playwright，而 `tools/anyCreature/` 在 `.gitignore` 裡、worktree 沒有這個目錄。我用 `mklink /J` 在 worktree 建了一個指向主工作樹 `tools/anyCreature` 的目錄 junction，截完圖後把 junction 刪掉（`rm -rf tools`，已確認主工作樹的 `tools/anyCreature/node_modules` 完好）。因為該路徑被 gitignore，**這個 junction 從頭到尾沒有進過 diff**。後續 25 隻只要照做即可，不必改 `creature-shoot.mjs`。

---

## ⑤ 三輪各改了什麼（給後續 25 隻抄修復方向）

| 輪 | 讀者說的問題 | 我改了什麼 |
|---|---|---|
| r13→r15 | 「三段硬接／拼裝感」「臉討喜」「底部是長綠色尖刺的水晶底座」 | 肩台從 0.232→0.210 且降低落差、霧裾頂端加寬到接住軀幹下緣、霧色從 #93a49b 靠近袍色到 #7c8a82；眼加大＋怒眉板加大加斜＋下顎加寬（0.094→0.124）＋嘴內青弧從 0–48° 開到 0–76°；霧鬚根半徑 0.042→0.026、長度＋25%、根數 8→4 |
| r15（中途） | 自查：嘴內發光楔太大把臉蓋成一團綠 | 眼 0.054→0.040、口內楔 r 0.062→0.052 並往內縮 |
| r15→r16（第 3 輪改了什麼，**要換回 r15 就逐條還原這六條**） | 「圓潤／線條圓滑」「矮胖」「短手」「斗笠／小丑帽」 | ① 全域 `smooth_angle` 30→26、`robe` 26→22、`ghost_skirt` **58→24**、霧鬚 60→22 ② 肩 0.210→0.180、霧裾最大 0.244→0.208、霧裾底端 0.026→0.018 收成尖角 ③ 帽緣 0.204→0.172、錐體 `Hat1` 0.190→0.214／`HatTip` 0.098→0.112 ④ `LWrist` fwd 0.128→0.158、`LHand` fwd 0.066→0.080、袖子再瘦 ⑤ `ghost_skirt` #7c8a82→#727d7a、青弧 26–104°→40–96° ⑥ `body`／`ghost_skirt` 的 `sides` 14→12 |

---

## ⑥ 做不到的事（誠實條）

1. **M-A1 沒過。** 三輪六位讀者，主印象依序是：拼裝獠牙小惡魔／可愛小妖怪吉祥物 → 詭異漂浮妖怪／圓潤黏糊小妖怪 → 呆萌小巫師幽靈怪／可愛小巫師妖怪。只有 A 與 C 落在允許的一側，**兩位同時過的那一輪不存在**。
2. **失敗的理由三輪一致，指向風格本身。** 四位不過的讀者用的詞幾乎逐字重複：「低多邊形卡通造型」「造型圓潤」「比例可愛（大頭小身體）」。我把能動的槓桿都推到底了——`smooth_angle` 全域 26／`robe` 22／`ghost_skirt` 24（凍結檔給的硬轉折下限帶是 28–34，我壓得比那還低）、加了怒眉板與獠牙、拿掉所有圓潤配件、把手縮到 0.125。再往下要動的是引擎或渲染風格，超出本卷範圍。這與 `2026-09-04-lookdev-tiger_a-report.md` ⑤-3 的結論相同，**主對話要不要為 26 隻整批處理這件事，是使用者的決定，不是我能在這一隻裡解掉的**。
3. **`turn_count` 只有 6，遠低於 tiger_c 的 30。** 我在 spec 的 `_exaggeration_vs_anchor` 裡寫的目標是「靠帽緣外翻的階梯與霧裾的鬚狀 wisp 撐起 turn_count」，實際沒做到：霧鬚太細，在 24px 的 thumb 上被抽掉；帽緣的外翻只有兩個轉折。這是「輪廓不夠碎」的量化痕跡，也可能是讀者一直說「圓潤」的一部分原因。要補的話最直接的是把霧鬚加粗到 r≥0.035 再加根數——但那正是 r13 被讀成「水晶尖刺」的做法，兩邊互斥，我沒有解。
4. **`ghost_*` 只有命名到位，沒有半透明。** `grep -n "ghost\|transparent\|opacity" js/creature-figures.js` 的結果是：`GLOW.test`（`js/creature-figures.js:51`）只認 `^eye`／`^mouth_glow`／`^glow_` 三個前綴，**檔案裡沒有任何 `ghost_*` 分支**，`transparent: true` 只出現在陰影圓片（`:200`）與粒子（`:587`）。所以 `ghost_skirt`／`ghost_wisp` 目前在戲台上是不透明的，「虛化」是靠造型（無腿、尖底、懸空、霧鬚）與邊光做的，不是靠 alpha。依派工指示我沒有動 `js/creature-figures.js`——**半透明待接線卷做，做法是在 `GLOW.test` 旁邊加一條 `/^ghost_/` 的分支，設 `transparent:true` + `depthWrite:false` + opacity 0.55–0.7**。命名已到位，接線卷不需要再改任何 spec。
5. **`shading` 的 Y 值階讓「淡霧」很難做。** `gradient.bottom −0.88` 會把整隻的下半身壓到近黑，霧裾在腰以下正好吃滿這一段。我試過 `#aebfb6`／`#93a49b`／`#7c8a82`／`#727d7a` 四個亮度，最後選的是**比袍色亮但不到「一塊白布」**的那一個；再亮就會被讀成「站在一片荷葉上」（r9 實測），再暗就完全看不出下半身換了材質。這一條 haunt 六隻都會遇到，建議把 `ghost_*` 的明度定在**袍色的 1.7–1.9 倍**（本隻 `robe` #3f3e3d ≈ 63，`ghost_skirt` #727d7a ≈ 122，比值 1.9）。
6. **`attack`（迷途）只驗到 `attack_reach` 通過，沒有做動畫的視覺驗收。** 凍結檔的 M-A0～A4 沒有要求 attack 的截圖或盲讀，我就沒做；「帽沿壓低繞人」是照設計寫的（`NeckB` rx +15°／`HeadRoot` rx +18° 前俯把帽沿壓下來，`HeadRoot` ry ±12° 左右繞），引擎的 `attack_reach` 綠燈只證明它有往前交付動作，**不證明玩家會讀成「繞人」**。要驗要另外拍 attack 的連續格。
7. **沒有量效能，也沒有 `?n=3` 橫排。** haunt 不是 swarm，M-A2 沒要求；stage-lit 那一發順手記到 `drawCalls: 19`（單隻）、GLB 載入 175 ms、`fps` 59.9（無頭 SwiftShader，不是真 GPU 的數字，只當旁證）。三角形 2966，26 隻累加時要注意。
8. **判斷「像不像玩具」用的是 6 個 sonnet 讀者，不是使用者本人。** 這是凍結檔指定的驗法，它只證明「模型讀者不會說玩具」，不證明使用者會滿意。

---

## ⑦ haunt 六隻可以直接沿用的做法（`hairpin`／`chair`／`raincoat`／`buoy`／`guoyin`）

### A. 骨架與體型（照抄）

- **兩條鏈夾一個腰**：`body` 由腰往上 `Waist→Spine→Chest→NeckB→Neck2`（五節），`mist` 由腰往下 `MistRoot→Mist1→Mist2→MistTip`（四節）掛在 `Waist`，**完全沒有腿鏈**。本隻的實際座標可直接當起手值：`Waist [0,0.46,0]`、往上四段 `up` 0.140／0.096／0.062／0.044、往下四段 `up` −0.020／−0.135／−0.110／−0.120。總高 1.13–1.16，剛好進得了 `creature-preview.html` 的單隻鏡頭（`camDist 2.35`／`tilt 17°`／`lookAt y 0.52`）。
- **飄浮＝三件一起做**，缺一都讀不出來：① `mist` 的最後一列 profile 收到 ≤0.02 且底端 dome 停在 **y≈0.04**（不落地，戲台的投影就會和本體分離）② `idle`／`move` 的位移放在 **chain 根關節 `Waist` 的 `ty`**（idle 0.030、move 0.046，全身一起浮沉；放中段會 `anim_integrity` 撕皮）③ `MistRoot`／`Mist1`／`Mist2` 各給 2–9° 的 `rx`／`rz`，讓霧裾滯後於身體。
- **`leg_fraction` 量到 `null` 就是 haunt 做對了**（silmetrics 找不到腿）；這比任何截圖都好用，是 M-A2 最便宜的機械證據。
- 六隻的下半身處理照簡報刻意不同（本隻＝散成霧），但**上面這三件與 `Waist` 為根的位移是共用的**。

### B. `ghost_*` 材質（照抄）

- 腰以下**全部**用 `ghost_` 前綴：本隻是 `ghost_skirt`（霧裾本體）＋`ghost_wisp`（霧鬚）。`claims.json` 用兩條 `part_exists` 機械釘住這兩個名字，改錯名 judge 會直接擋。
- **明度定在袍色的 1.7–1.9 倍**（見 ⑥-5），這是在 `shading.gradient.bottom −0.88` 底下唯一還讀得出「換了材質」又不會變成一塊白布的帶。
- 系別青色帶落在 `ghost_*` 上：本隻是 `ghost_skirt` 的 `colors.arcs` 40–96°（`#5bf0aa`）＋整叢 `ghost_wisp`（`#7ff2bc`）。**別把青帶放在袍或帽上**——`saturation_area` 的預算要留給 IP 色。
- 半透明**還沒接**（`js/creature-figures.js:51` 的 `GLOW.test` 沒有 `ghost_*` 分支）。六隻都只要命名到位，接線卷加一條 `/^ghost_/` 就會一起生效。

### C. 引擎陷阱（新踩到的，試作卷七陷阱＋猛虎六陷阱之外）

1. **★ 最貴的一條：`compile.js:136` 的 corner bevel-skip 會把「距離路徑轉角 `r·tan(θ/2)·1.2` 以內」的環全部丟掉。** 短鏈＋大轉角＝profile 的中段整段沒被取樣。本隻的頭一度只剩 3 個環、半徑恆為 0.046 的細管，害 `jaw` 與 `hat` 的 `root_containment` 100% 失敗，而錯誤訊息完全沒提到環被丟掉——我是寫探針把 `_pts`／`_rings` 印出來才看到的。**對策：直立的 haunt 一律把 `body`／`mist`／`head`／`hat` 做成近乎直線（相鄰段夾角 < 10°），造型交給 `profile` 而不是折骨架。**
2. **`ring_step` 要小到能取樣到 profile 的每一列。** `M = max(joints.length, min(48, round(arclen/ring_step)))`；短鏈（arclen 0.18–0.35）配 tiger_c 的 0.055–0.095 只會生出 3–5 個環，profile 寫再細也沒用。本隻用的是 body 0.026／mist 0.017／head 0.016／jaw 0.014／hat 0.014／LArm 0.045。
3. **`part_attachment` 挑的是「離該頂點最近的那個環心」，不是宿主的最粗處。** 霧鬚掛在霧裾的大肚子上、根部明明埋在裡面，卻因為離**霧裾尖底那個小環**比較近而被判成浮空 0.079。對策：霧鬚的 offset 半徑抓 **≤ 該處環半徑的 0.5 倍**，寧可埋深一點（埋深了視覺上更像從霧裡長出來，本來就比較對）。
4. **`root_containment` 也吃同一個「最近環」規則。** 手臂根環往上的那幾個頂點會去比對**頸子那個細環**，於是「30% 外露」。對策：`LArmRoot` 的 `up` 要壓到肩台以下（本隻 −0.060），別放在肩台的高度。
5. **`balance` 對 haunt 特別容易踩。** 無腿的支撐多邊形＝霧裾尖底那一小圈，前傾的頭／帽／伸出去的手臂很容易把質心推出去。對策：把 `MistTip` 的 `fwd` 往前挪（本隻 +0.032），讓支撐圈跟著質心走。

### D. 招牌剪影與 `claims` 的對應（照抄結構）

- `part_signature` 的 `part` ＝簡報「招牌剪影」那一件的材質名（本隻 `hat`），`focal_contrast` 的 `a`／`b` ＝招牌件 vs 臉（本隻 `hat` vs `skin_head`，`min_ratio` 2）。**這條會逼你把招牌件做大、把臉做小，正是 B-A2 剪影不撞車要的效果**，別去動 `min_ratio`。
- `share_hierarchy` 對 haunt 建議寫成 **霧裾群（`ghost_*` 兩個一起放 primary）／招牌件（secondary）／臉（tertiary）**，本隻量到 65:25:10，離 60:30:10 只差 0.05。

---

## ⑧ DEVLOG 一行

`gates: M-A1 fail@r3(6 readers: 6/6 read it as ghost/yokai, only 2/6 not "toy") | M-A0/A2/A3/A4 pass | restarts: LOW 帽從斗笠改尖錐、MID 霧裾從荷葉盤改尖底霧尾 | unresolved: 低多邊形圓潤感讀成玩具（與 tiger_a ⑤-3 同因）；turn_count 6 偏低；ghost_* 半透明待接線卷`
