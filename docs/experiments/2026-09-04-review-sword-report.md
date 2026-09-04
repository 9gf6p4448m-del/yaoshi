# 回修檢視卷 — `sword` 王爺劍依真實神將回修（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-review.md`（R-A0～R-A3），**門檻一處未動**；
17:30 凍結檔修訂（main `faabfc0`）另加兩條：①全部模型套 `build:"rigid"`＋主要體積斷面 `exp ≥ 4.5`＋`smooth_angle` 24–30；②R-A2 的「可愛／公仔」改看**主印象**（第一句／主詞），正文順帶提及只記為「風格牆」不否決。兩條都已照套（見 ④、⑤）。
參照：`docs/experiments/2026-09-04-ref-sword.md`（圖 `tools/anyCreature/out/ref/sword/01.jpg`、`02.jpg`，**親眼 Read 過**）。
基準 SHA：`63e5a28`（worktree `agent-a48e2b816f679ce87`）。**未 commit、未 push。**
出貨檔：`assets/creatures/sword.{json,glb}`（`sword.claims.json` 一個字沒動）；截圖 `docs/experiments/2026-09-04-review-sword-{hero,stage-lit}.png`。

**結論先行：R-A0／R-A1／R-A3 過；R-A2 的 M-A0（judge 全綠、GLB 328.1 KB、三支動畫）過，但 R-A2 的盲讀 3 輪跑滿仍未過**——最好的一輪（第 3 輪）是 2 位讀者裡 1 位過（讀成「妖怪武士／魔將」、主印象「會威嚇人的東西，不是可愛討喜的玩具公仔」、特徵命中 3 條），另 1 位主印象仍落在「可愛／玩偶／公仔」。詳見 ⑤、⑦。

---

## ① R-A1 對照表：回修前的 `sword` vs 真實參照五條特徵

回修前的模型＝簡報備案「無頭甲冑＋火焰代頭」（`docs/experiments/2026-09-04-creature-sword-report.md`）。逐條有／無：

| # | ref 特徵（`2026-09-04-ref-sword.md`） | 回修前 | 回修後怎麼做的 |
|---|---|---|---|
| ① | 頭頂高聳的冠／盔，尖端外張，是剪影上半段最顯眼的一段 | **無**（頸口五條 `eye` 火舌，兩位舊盲讀者都誤讀成「頭上的火焰王冠」） | `crown` 鏈（半寬 0.048→0.126 扇形）＋6 根 `crown_gold` 冠翎（三筆 `mirrored` curve）＋一朵 `sash` 紅絨球（只掛一側，刻意不對稱） |
| ② | 深褐紅的臉 ＋ 濃黑粗眉 ＋ 長垂到胸的黑鬚 | **全無**（沒有頭，頸甲封死） | `head` 鏈（`skin_head` #8f3d30）＋`beard` 眉 fin（mirrored）＋中央垂鬚 fin＋兩綹側鬚 fin＋`skin_head` 鼻樑 curve＋兩顆 `eye` 金眼 |
| ③ | 胸前立體的龍首／獸首護心鏡（圓、居中、有眼、鑲金邊） | **無**（胸前是一片 `stripe` 深色方板） | `gold_trim` 八邊形 fin ＠body t=0.16 around 270（腹部，在鬚尖下方，同 ref 01）＋兩顆 `eye` 龍眼 curve |
| ④ | 肩後／腰側垂掛的長紅綬帶（靠旗） | **無**（垂墜物只有三根裙擺尖釘） | 兩條 `sash`（#b83a34）長垂 fin ＠around 150／30，左長右短，垂到戰裙下緣 |
| ⑤ | 層疊的金色鱗片甲；紅色只落在臉、綬帶、旗 | **無**（全身中性近黑 #45423e／#3a3734，只有劍脊一條橘、三條金線） | `armor_body` 改鎏金 #b8892f（arcs 只留正面 54–126）＋`gold_trim` 三排腹前橫板＋`pauldron` 肩甲＋`helm_gold` 護耳；四肢／戰袍壓成低飽和暖灰 |

補：ART_BIBLE §1 香火主色「硃紅＋鎏金」在回修前**兩色都幾乎不在場**，這是本卷回修的主因；回修後鎏金＝甲身與冠，硃紅＝臉、綬帶、冠飾。

---

## ② 盲讀原話（context-free `sonnet` 子 agent，每輪 2 位，只給 hero 與 stage-lit 兩張圖）

三輪共 6 位，兩種問法交錯（避免同一句話誘導同一種答案）。以下只摘關鍵句，全文在下方。

### 第 1 輪（模型狀態＝有頭但 chibi 比例：head＋crown 佔全高 32%、腿 33%）— **0/2 過**
- 讀者 A：「一隻小生物騎坐在／被扛在一個穿盔甲的大型戰士肩上或胸前的雙層組合體」；氣質「**比較偏向可愛討喜的玩具公仔路線**……比例矮胖、頭大身體短……看起來很厲害但其實很萌的吉祥物型怪物」。
- 讀者 B：「一個穿著厚重護甲、背後插著一把發光大劍的**怪物型角色**」「像動物頭骨/惡魔頭的造型」；(c) 選威嚴，但「**看起來比較像是玩具反鬥城賣的怪獸公仔**……帶點討喜的滑稽感」。
- 共同根因兩條：**Q 版頭身比**（兩位都主動點名）＋**低多邊形圓潤＝玩具感**。

### 第 2 輪（模型狀態＝比例重排：Hips 0.455→0.545、腿佔 38%、head＋crown 降到 20%；`exp` 4.0–4.5；尚未套 rigid）— **1/2 過**
- 讀者 C（過）：「像是穿著**武士／妖怪風鎧甲的戰士**或妖怪角色，背後揹著一把大型武器」；氣質「**比較偏向會給人壓迫感／帶點威嚇性的東西，而不是可愛討喜的玩具公仔**……走的是妖怪／魔王級戰士的肅殺路線」。
- 讀者 D（不過）：第一句主詞是「一個 **Q 版風格**的 3D 角色模型——像是遊戲裡的低多邊形**武將／戰士**角色」；(c) 選威嚴，但自評「**Q 版的威嚴**」「威風的可愛」。依 17:30 修訂看主印象（第一句／主詞），「Q 版」是第一句的領頭修飾語，判不過。

### 第 3 輪（模型狀態＝出貨版：套 `build:"rigid"`＋`exp` 4.5–5.0；臉加寬 0.106→0.132、眼眉往正面挪、靴收窄、上臂加長）— **1/2 過**
- 讀者 E（過）：「像是穿著厚重鎧甲、頭戴金色尖冠、背後插著一把巨大火焰色劍刃的『**妖怪武士**』或『**魔將**』類角色」；氣質「**偏向會威嚇人的東西，不是可愛討喜的玩具公仔**……走的是小型但危險的路線，不是圓潤、粉彩、大眼萌系的公仔設計」。
  特徵命中（對照 ref 五條）：①「頭頂有一圈金黃色尖角/鬃刺，**像皇冠**」②「**臉部是紅色**面罩，兩個**黑色**鏤空眼窩裡透出**黃橙色發光的眼睛**」⑤「肩膀兩側各有一片**金色**護肩」「胸前/腰腹部有**金色鎧甲片層疊**」→ **命中 3 條**（①②⑤），達 ≥3 的門檻；③護心鏡只被讀成「金色鎧甲片」、④綬帶未被點名。
- 讀者 F（不過）：第一句「一個**矮胖、大頭小身**、背後插著一把發光巨劍的低多邊形風格**武裝小怪**／角色模型」；(c) 明選「**可愛／玩偶／公仔**」，理由是「大頭小身的比例（Q 版／chibi）」。特徵命中 2 條（①⑤）。

**判定：R-A2 的盲讀未過。** 凍結檔要求「兩位都要」，三輪跑滿最好是 1/2。**沒有在盲讀之後偷改模型再回頭補讀**——每一輪的模型狀態如上，改動都在下一輪之前做完。

---

## ③ R-A2 的 M-A0：judge 全綠、GLB ≤400KB、三支動畫（指令原文與實際輸出）

`<AC>` = `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`，`<WT>` = 本 worktree 根目錄。指令都帶 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。

### 編譯（出貨版）

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/sword.json out/swordfix/r13.glb
{"ok":true,"out":"out/swordfix/r13.glb","bytes":335996,"verts":3946,"faces":1853,
 "joints":37,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.509}}
```
**零 `warn`、零 `BLOCK`。**（回修前那條 `warn: part_overlap: 'curve@SkirtHem' sits 54% inside 'paw@LToe'` 隨著裙擺尖釘拿掉一併消失。）

### 出貨 GLB 本身

```
$ python -c "<讀 GLB 的 JSON chunk>"   # 跑完已刪，不在 diff 裡
{"bytes": 335996, "kb": 328.1, "animations": ["idle", "move", "attack"], "skins": 1, "meshes": 1,
 "materials": ["armor_body","armor_skirt","skin_head","crown_gold","blade","hilt","armor_arm",
               "armor_leg","eye","beard","helm_gold","sash","gold_trim","pauldron","glow_blade","hand","boot"],
 "images": 0, "textures": 0, "generator": "anyCreature v1.2.0",
 "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "sword"}}
```
328.1 KB ≤ 400 KB ✅／三支動畫齊 ✅／`skins`=1 ✅／0 貼圖 ✅／`eye` 與 `glow_blade` 兩個發光材質名原樣還在 ✅。

### judge（對**未改一字**的 `sword.claims.json`）

```
$ node <AC>/harness/judge.mjs <WT>/assets/creatures/sword.glb out/swordfix/judge_final sword \
      --spec <WT>/assets/creatures/sword.claims.json
stats  {"triangles": 3286, "skinnedMeshes": 17, "animations": ["idle","move","attack"]}
hi_sat {"front":0.4117,"side":0.4721,"tq":0.4916,"reartq":0.4460,"top":0.6403}
whole  [0.481, 1.387, 0.616]
  armor_body   side  9.72  tq 16.10  front 21.12  span 0.7341
  armor_skirt  side 12.68  tq 10.63  front 11.80  span 0.7493
  blade        side  9.83  tq  9.13  front  3.77  span 0.5782
  glow_blade   side  2.34  tq  3.67  front  0.02  span 0.1363
  skin_head    side  3.81  tq  3.19  front  2.68  span 0.3743
  crown_gold   side  6.25  tq  7.13  front  7.13  span 0.4847
  pauldron     side 11.38  tq  8.13  front  3.23  span 0.7164
  gold_trim    side  1.59  tq  7.02  front 11.90  span 0.3210
  sash         side 10.47  tq  2.98  front  1.82  span 0.6020
  helm_gold    side  4.13  tq  2.99  front  0.83  span 0.2466
[judge] Spec "王爺劍 wangye_zhanwen_sword (xianghuo/elite)" — all claims pass.
```

逐條核對：`tri_budget` 3286 ∈ [1500,5000] ✅／`rig_skinned`（17 skinned meshes）✅／`anim_named` 三支 ✅／
`saturation_area`(tq) **49.16%** ∈ [10%,60%] ✅／`part_signature` blade 側視 9.83% ≥ 6% ✅／
`focal_contrast` blade 9.83 ÷ skin_head 3.81 = **2.58×** ≥ 2 ✅／
`share_hierarchy` 甲身＋戰裙 22.40 : 劍＋劍脊 12.17 : 臉 3.81 ✅／`part_exists` × 3 ✅。

`sword.claims.json` 全程一個位元組沒改（`git diff --stat -- assets/creatures/sword.claims.json` 空）；門檻是回修前就寫定的那份，本卷只改 `sword.json` 去遷就它。

### silmetrics

```
$ node <AC>/harness/silmetrics.mjs <WT>/assets/creatures/sword.glb out/swordfix/sil_final
{"W_over_H":0.44,"fill":0.469,"mass_thirds":[0.398,0.468,0.133],
 "torso_depth_max":0.96,"torso_depth_min":0.05,"mass_contrast":17.93,
 "leg_fraction":0.194,"turn_count":19,"zigzag_alignment":0.43,
 "front":{"W_over_H":0.37,"fill":0.629},"top":{"W_over_H":0.77,"fill":0.638},
 "hero":{"W_over_H":0.38,"fill":0.633}}
```

### 截圖

```
$ node <AC>/harness/hero.mjs out/swordfix/r13.glb out/swordfix/hero_r13
{"ok":true,"margin":8.5}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-review-sword-stage-lit.png \
       "glb=sword.glb&light=1&fx=1&rim=xianghu" idle 8810
{"out":"docs/experiments/2026-09-04-review-sword-stage-lit.png",
 "query":"glb=sword.glb&light=1&fx=1&rim=xianghu","phase":"idle",
 "fps":59.88023952095874,"calls":25,"loadMs":220,"particles":44,"errors":[]}
```
- `errors: []`（`console.error` 與 `pageerror` 兩種來源都收）✅。埠 8810。
- stage-lit 是原始輸出 1688×780 **只做一次純裁切**到 480×780（把兩側空地裁掉），沒有縮放、沒有調色。
- `tools/anyCreature` 在 `.gitignore` 內、worktree 沒有這個目錄，用 `mklink /J` 建了 junction 指向主工作樹；該路徑被 gitignore，從頭到尾沒進過 diff。
- `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。

---

## ④ 17:30 凍結檔修訂的落實

| 修訂條 | 本檔的狀態 | 證據 |
|---|---|---|
| `build:"rigid"` | 已加 | `grep -o '"build": "[a-z]*"' sword.json` → `"build": "rigid"` |
| 主要體積斷面 `exp ≥ 4.5` | 軀幹 4.6/4.8、戰裙 4.6/4.8、頭 4.5/5.0/4.6、冠 4.5/4.8/5.0、劍 4.5、上臂 4.5、腿 4.6、劍柄 4.5 | `grep -c '"exp": 4\.\|"exp": 5\.'` → 15 列，檔內已無 `exp < 4.5` 的列 |
| `smooth_angle` 24–30 | 全檔只有 24（9 處）與 26（12 處） | `grep -o '"smooth_angle": [0-9]*' \| sort \| uniq -c` → `9 …24` / `12 …26` |
| R-A2「可愛」改看主印象 | 已按此判：第 2 輪讀者 D、第 3 輪讀者 F 的**第一句主詞**就帶「Q 版／矮胖大頭小身」，所以仍判不過；不是因為正文順帶提到才扣 | 見 ② 的原話 |

修訂是在第 2 輪盲讀跑到一半時收到的，**沒有重來**：第 3 輪的模型就是套完這三條之後的版本，第 3 輪的盲讀讀的也是它。

---

## ⑤ 改了哪些檔（檔案:行號）

```
$ git add -N . && git diff --stat
 assets/creatures/sword.glb                         | Bin 303836 -> 335996 bytes
 assets/creatures/sword.json                        | 443 ++++++++++++---------
 docs/experiments/2026-09-04-ref-sword.md           |  24 ++
 docs/experiments/2026-09-04-review-sword-hero.png  | Bin 0 -> 226017 bytes
 .../2026-09-04-review-sword-stage-lit.png          | Bin 0 -> 87809 bytes
 5 files changed, 272 insertions(+), 195 deletions(-)
```
（上表是寫本報告之前跑的，本報告本身是第 6 個新檔。）

| 檔案 | 行 | 內容 |
|---|---|---|
| `assets/creatures/sword.json` | 1–370 | 設計註記 `3–14`（新增 `_rework_note`／`_proportion_note`／`_hardening_note`／改寫 `_arc_frame_note`）、`palette` `16–34`（新增 `crown_gold`／`helm_gold`／`sash`／`beard`，`armor_body` 改鎏金，四肢改低飽和暖灰）、`build:"rigid"` `36`、`joints` `40–77`（body／skirt／**head**／**crown**／blade／hilt／LArm／LLeg 八條鏈，比例重排）、chains・attach・mirror・touch `79–92`、`volumes` `94–194`、`parts` `196–315`（金眼、眉、鼻樑、中央垂鬚＋兩綹側鬚、護耳、冠翎＋紅絨球、護心鏡＋龍眼、兩條綬帶、兩片肩甲、三排腹甲、腰帶、護手、劍脊、甲指、靴）、三支動畫 `317–369` |
| `assets/creatures/sword.glb` | — | 335,996 bytes（328.1 KB），引擎輸出 |
| `docs/experiments/2026-09-04-ref-sword.md` | 1–24 | R-A0 的參照文件：兩張真圖各一句「我看到的」＋五條一眼特徵清單＋與 ART_BIBLE 的對位 |
| `docs/experiments/2026-09-04-review-sword-hero.png` | — | `harness/hero.mjs`，1024²，margin 8.5% |
| `docs/experiments/2026-09-04-review-sword-stage-lit.png` | — | 戲台 3/4（`creature-shoot.mjs`，`light=1&fx=1&rim=xianghu`），裁切至 480×780 |
| `docs/experiments/2026-09-04-review-sword-report.md` | — | 本檔 |

**R-A3 ✅**：diff 只含本隻的 assets／本卷截圖／ref 檔／報告。`js/*`、`index.html`、`tests/tools/*`、其他生物的 `assets/creatures/*`、`sword.claims.json`、`docs/experiments/` 的既有檔案**一個位元組都沒動**。臨時檔（`_tmp_parts.py`、`_tmp_front.png`、`tools/` junction）都已刪除。未 commit、未 push。

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外新發現的三條）

1. **★★ 最貴的一條：`anchor.around` 與 `colors.arcs` 吃的不是同一個框架，舊 sword 報告 ⑥-1 的敘述要訂正。**
   - `anchor.around`（fin／eye 的定位）實測 **0°=−x、90°=−z（背）、180°=+x、270°=+z（正面）**——這條舊報告是對的，而且每個 anchored part 都會印 `info: fin 'X' anchored on "Y" at around=N faces ZZZ (world normal ...)` 可以核。
   - `colors.arcs` **不是**這個框架：實測是 **0–180 左右鏡射的半圓，90°＝正面（腹）、0° 與 180°＝背面**。舊報告把兩者混為一談，於是我照抄「背面＝56–124」的結果是**把鎏金甲身的正面整片塗黑**，連改四輪都以為是燈光或 AO 的問題。
   - **`colors.arcs` 不會印任何 info 行**，唯一的查法是探針：把一條 arc 改成 `#ff00ff` 編一次，看 judge 的 `beauty_front` 與 `beauty_reartq` 哪一面變洋紅（本卷實做，檔案在 `out/swordfix/judge_probe/`）。**抄別隻的 arc 角度到新隻上之前一定要先探一次。**
2. **★ `type:"fin"` 當「帽沿／額帶」用，在 3/4 視角一律會變成一支往前伸的尖楔。**
   冠的正面橫板（`around=270`、`udir=[1,0,0]`、`vdir=[0,1,0]`、`conform:false`）試過 crown t=0.34／0.52／0.62 三個高度，三次的 hero 都被讀成鳥喙——那片板子是「立在切平面上的薄板」，正視是一條帶、3/4 就是一片翹出來的楔子。拿掉之後冠才乾淨（對照圖 `out/swordfix/hero_r11/hero.png` vs `out/swordfix/hero_probe2/hero.png`）。**要做帽沿只能用 volume 的 profile 撐，不要用 fin。**
3. **`focal_contrast`（側視面積比）可以用「換材質」而不是「縮尺寸」來過。**
   `focal_contrast a=blade b=skin_head` 量的是**側視**share，而頭的側視 share 幾乎全部來自頭的**兩側**。把兩片護耳（`helm_gold`）貼在 `around=180`／鏡射，`skin_head` 側視 share 立刻從 6.64% 掉到 2.10%（同一顆頭，只是側面換了材質），而**正視的臉一點都沒變小**。這比把頭做小好得多——把頭做小會直接撞上第 1 輪盲讀的 Q 版問題。同理，臉要加寬就只加 x（正視變大、側視不變），不要加 z。
4. （補記）**發光材質在戲台圖會被 bloom 糊成一團白。** `eye` 半徑 0.036 的一對球在 `fx=1&rim=xianghu` 下會連成一塊白斑蓋住整張臉；縮到 0.023–0.027 才恢復成兩點金光。**hero 圖看起來剛好的發光尺寸，戲台圖會大一號**，兩張都要看。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **★ R-A2 的盲讀未過，三輪跑滿（凍結檔上限）。** 最好一輪 1/2。**不過的那一位的理由三輪都是同一個：比例讀成 Q 版／大頭小身。** 我在第 2 輪已經把 `Hips` 從 0.455 抬到 0.545、腿長拉到 0.235/0.200、head＋crown 從全高 32% 壓到 20%，第 3 輪又加了 `rigid`＋`exp` 4.5–5.0，讀者 F 仍寫「矮胖、大頭小身」。我判斷剩下的距離**不在頭身比，在戰裙**：`silmetrics` 量到 `leg_fraction` **0.194**——戰裙（半寬 0.21、垂到 y 0.333）把大腿整段罩住，露在外面的腿只剩全高 22%，視覺上就是「短腿」。要再往下走只有兩條路，都超出本卷額度、且會動到 ART_BIBLE 的香火文法，**請主對話裁定**：
   ① **縮短戰裙**（垂到 y 0.45 左右，露出大腿）——代價是香火「重心低、寬正儀仗」的剪影被削弱；
   ② **接受這是低多邊形風格牆**——`tiger_a`（三輪六位）、`redhat`（三輪六位）、`shield`（四輪八位）三隻都卡在同一句「低多邊形卡通渲染＝玩具感」，本隻是第四隻；若這是全批共通的天花板，那該裁定的是渲染路線（描邊／貼圖／改風格），不是逐隻再修。
2. **ART_BIBLE §1 香火的「側視 W/H ≥ 0.9」沒達成，量到 0.44。** 這條不在 claims 也不在 R-A0～A3 裡，所以不是未過驗收，但它是聖經寫死的目標，據實記在這裡。原因是本隻是「直立人形＋縱向背劍」，側視的寬度只能靠鬚（往前）與劍（往後）撐，撐到頂也就 0.6 上下；要 0.9 得加**橫向的靠旗**（ref 01 的紅色三角旗扇形外張），但那會在側視擋住 `blade`，直接撞 `part_signature`（招牌部位側視 share ≥6%）。兩者衝突，請主對話定哪個優先。
3. **ref 特徵 ③（龍首護心鏡）與 ④（紅綬帶）沒有被任何一位讀者點名。** ③被讀成「金色鎧甲片」、④完全沒被提。護心鏡在腹部（照 ref 01 的位置，在鬚尖下方），在 hero 的 3/4 角度被手臂與甲片切掉一半；綬帶掛在背側（`around` 150/30，為了不遮側視的劍），正視只露一條紅邊。要讓這兩條讀得出來，最省的做法是把護心鏡上移到胸口正中央（會與垂鬚打架）、綬帶改掛正面（會遮住剛做好的三排腹甲）——都是拆東牆補西牆，本卷沒做。
4. **兩張圖都是偏背面的角度。** `hero.mjs` 自動選角、`creature-preview.html` 的單隻鏡頭寫死在 `camera.position.set(0.75, …, +z)`（`tests/tools/creature-preview.html:103`），六位讀者裡有三位主動說「這是背面視角」。臉、鬚、護心鏡都在正面，**盲讀吃不到正面等於白做**。凍結檔只要求 hero＋stage-lit 兩張，我就沒有多給；若主對話認為該補一張正視圖再讀，那是改凍結檔的事，我沒有自行加。
5. **沒有量效能、沒有接進正式對決、沒有跑 ART_BIBLE §6 的剪影三秒測試**（那是批次閘門，需要多隻拼圖）。
6. **`_devices` 與 `_rework_note` 裡「冠翎五根」是設計意圖時寫的數字，出貨檔實際是六根**（`sword.json:228／231／234` 三筆 `mirrored:true` 的 `crown_gold` curve＝6 根），另有 1 朵 `sash` 紅絨球只掛在一側（不對稱是刻意的）。註記沒有回頭改，以 `parts` 段為準。
