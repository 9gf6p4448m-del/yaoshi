# 3D 量產卷批 2 — `sword` 王爺劍（xianghuo／elite）回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4 門檻未動）＋末段兩次美術修訂（main `978673f`「妖怪有妖怪的樣子、可愛不得出現」、main `7bee35c`「祖靈與香火保持神性威嚴，只有陰氣走妖怪風」）。
簡報：`docs/experiments/2026-09-04-creature-briefs.md` 的 `sword` 列與主對話裁定第 1 條。
基準 SHA：`86d101a`（worktree `agent-a94dc0144bf0c0928`）。**未 commit、未 push。**
出貨檔：`assets/creatures/sword.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-creature-sword-{hero,stage-lit}.png`。

**走的是備案，不是原案。** 詳見 ③。

---

## ① M-A0～M-A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| M-A0 | **PASS** | 296.7 KB ≤ 400 KB；`idle`／`move`／`attack` 三支；`skins`=1；0 貼圖；judge 對 `sword.claims.json` **all claims pass**；tri 2874 ∈ [1500,5000]；silmetrics 側視 thumb24 與 hero 都輸出成功 |
| M-A1 | **PASS（第 1 輪）** | 兩位 context-free `sonnet` 讀者都讀成「重甲／盔甲角色＋背後巨劍」，氣質分別是「神秘、莊嚴、威嚴」與「陰森、莊嚴、神秘威嚴」，兩位都主動判為「會威嚇人的東西，不是可愛公仔」 |
| M-A2 | **N/A（elite）** | 凍結檔的 M-A2 只對 swarm（`?n=3` 橫排）／haunt（下半身虛化）／ward（正面寬≥側面寬）有附加證據要求，elite 無。elite 的「單尊、佔滿高度、招牌部位大」以數字兌現：全高 1.154、劍全長 **0.654**（height_ratio **0.567**）、招牌部位側視 share 12.02% |
| M-A3 | **PASS** | 簡報指定的兩個發光材質名 **`eye`**、**`glow_blade`** 原樣出現在 GLB materials 清單（見 ④） |
| M-A4 | **PASS** | `git diff --stat` 只有本隻的 3 個 asset ＋ 2 張截圖（本報告寫完後為 6 個檔），既有檔案 0 行改動 |

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給 hero 與 stage-lit 兩張圖）

問法對兩位不同（避免同一句話誘導同一種答案），三題都是「這是什麼／氣質／像玩具還是威嚇」。

### 讀者 A

> 1. 一個穿著深色重甲、頭上有像火焰／王冠般尖刺裝飾、背後插著一把橘色巨劍的低多邊形風格 3D 角色模型（背面視角）。
> 2. 神秘、莊嚴、帶點威嚴感。
> 3. 比較像「會威嚇人的東西」——全身深色厚重盔甲、尖銳的頭飾造型、背後扛著一把比頭還高的發光巨劍，加上第二張圖那種昏暗紅色地面配深藍夜空的舞台打光，整體營造出的是壓迫感與戰鬥氣勢，而不是可愛討喜的公仔感。

### 讀者 B

> 1. 一隻黑色低多邊形風格的類人怪物角色，頭頂有金色火焰狀裝飾，背後扛著一把橘色巨劍，圖B是同一模型放進遊戲場景中打光展示。
> 2. 陰森、莊嚴、帶點神秘威嚴。
> 3. 比較偏向會威嚇人的東西——黑色調的重甲身形、獸爪狀的手腳、背後高聳過頭的巨型利刃，加上圖B暗紅打光與火焰般的頭飾營造出壓迫感，整體走的是「魔王／頭目」的兇猛路線，而不是可愛討喜的公仔造型。

**逐條對照 M-A1 與 09-04 的兩次修訂**：
- 「這是什麼」與簡報概念同類：兩位都說出**重甲／盔甲**與**巨劍**（凍結檔口徑「讀到武將／神將／甲冑／持劍者／劍算對」）✅
- 主印象須含「威／莊嚴／神／鎮」任一：A =「莊嚴、威嚴」、B =「莊嚴、神秘威嚴」✅
- 「可愛／玩偶／公仔」不得出現在主印象：兩位都只在**否定句**裡用到「公仔」（「不是可愛討喜的公仔」）✅
- 主印象不得為機器人：兩位都沒有提到機器人／機械 ✅

**一個要講清楚的偏差**：讀者 A 把 hero 圖判成「背面視角」，讀者 B 把它讀成「類人怪物」而不是「神將」。也就是說「無頭甲冑」這件事**兩位都沒有明講**——A 讀成「有頭、頭上戴火焰王冠」，B 讀成「頭頂有金色火焰狀裝飾」。造型意圖（頸口封死、火焰代頭）在 48px 級的判讀裡被讀成「戴著火焰頭飾的頭」。這不影響 M-A1 的任何一條，但主對話若在意「無頭」這個概念本身要被讀出來，那一項沒有達成。

---

## ③ 走備案的理由與過程（原案已建到可判讀的版本才換）

**原案**（簡報第 11 條規定的人形：粗短肢、寬肩、重心壓低）**確實做了，做到 r10、judge all claims pass**：矮壯甲冑武將、寬簷戰盔、前突獸吻帶獠牙、背脊長劍。中途量到的形是 `W_over_H` 0.45／`fill` 0.483／`turn_count` 15。

換備案的觸發點不是盲讀，是**兩則新的美術指示**（收到時原案已建成，尚未送盲讀）：
1. main `978673f`：「妖怪有妖怪的樣子，可愛不得出現」，並**明列禁止「短胖圓潤剪影、Q 版比例、玩偶式對稱站姿」**。原案的規格本身（粗短肢＋寬肩＋重心壓低）就是短胖圓潤，兩者直接衝突；同一則也寫「王爺部將建議直接走『無頭甲冑＋火焰代頭』或『面具無眼』，人形的臉最容易掉進可愛區」。
2. main `7bee35c`：香火＝廟宇神將的**神性威嚴**（金、朱紅、火、甲冑），不用殘缺／腐爛／空洞眼／裂嘴；並明說「無頭甲冑＋火焰代頭仍是好備案（那是神性不是鬼氣）」。

備案本身由簡報的**主對話裁定第 1 條預先授權**（「`sword` 改成純劍化的無頭甲冑」）。所以這是「照新指示換設計」，不是「盲讀沒過才換」——差別寫在這裡以免日後誤讀成第 1 輪失敗。

出貨版依第 2 則又做了一輪神性化調整（v2→v3）：骨白獠牙 `fang` → 神將金飾 `gold_trim`（`#e0a838`）、外露肋條薄板 → 甲片金線（同 `gold_trim`）、細長鬼爪縮短 35% 變成帶尖甲指、頸段收直讓站姿更挺。**沒有用**空洞眼、裂嘴、殘缺、腐爛任何一項。

美術守則「每隻至少三項手段」本隻用了六項：①比例——無頭，頸甲＋火只佔全高 20%（遠離玩偶頭身比）②尖——領口金刺、裙擺尖釘、甲指、劍尖全部尖端外露 ③眼——沒有臉，只有陰火中的發光點（`eye` 材質）④不對稱——左肩甲比右肩甲大 1.7 倍、領刺左二右一、火舌五條長短不一 ⑥甲指 ⑧色——中性近黑底＋劍脊一條高飽和香火橘＋神將金。`smooth_angle` 全檔落在 **24–30**（全域 26，各體積 24–26），符合修訂後的統一值。

---

## ④ 指令原文與實際輸出

以下 `<AC>` = `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`，`<WT>` = 本 worktree 根目錄。指令都帶 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。

### M-A0 — 引擎編譯（出貨版 v3）

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/sword.json out/sword/v3.glb
info: shading: body-Y ramp top 0.3 / bottom -0.88, grain 0.0249 (1.8% of the 1.38 diagonal) — applied to all 43 meshes
warn: part_overlap: 'curve@SkirtHem' sits 54% inside 'paw@LToe' — check for interpenetration
{"ok":true,"out":"out/sword/v3.glb","bytes":303836,"verts":3601,"faces":1616,
 "joints":34,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.448}}
```

（唯一剩下的 `warn` 是右前方那根裙擺尖釘與靴子重疊 54%，是 warn 不是 BLOCK；視覺上尖釘壓在小腿外側，我判斷可接受，記在 ⑥-2。）

### M-A0／M-A3 — 出貨 GLB 本身的規格與 materials 清單

```
$ python _tmp_glbinfo.py assets/creatures/sword.glb      # 直接讀 GLB 的 JSON chunk，跑完已刪
{"file": "assets/creatures/sword.glb", "bytes": 303836, "kb": 296.7,
 "animations": ["idle", "move", "attack"], "skins": 1, "meshes": 1, "primitives": 14,
 "materials": ["armor_body","armor_skirt","skin_head","blade","hilt","armor_arm","armor_leg",
               "eye","gold_trim","pauldron","stripe","glow_blade","hand","boot"],
 "images": 0, "textures": 0,
 "attributes": ["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"],
 "generator": "anyCreature v1.2.0",
 "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "sword"}}
```

逐條核對：296.7 KB ≤ 400 KB ✅／三支動畫齊 ✅／`skins`=1 ✅／0 張貼圖（顏色全在 `COLOR_0`）✅。
**M-A3**：簡報 `sword` 列指定的發光部位 **`eye`** 與 **`glow_blade`** 都原樣在清單裡 ✅。**沒有多開第三個發光材質**——火焰代頭用的就是 `eye` 這個材質（頸口五條火舌＋火中發光點），所以簡報的「發光部位」欄沒有被偏離。

### M-A0 — judge（對動手前就寫定的 claims）

```
$ node <AC>/harness/judge.mjs <WT>/assets/creatures/sword.glb out/sword/judge_ship sword \
      --spec <WT>/assets/creatures/sword.claims.json
stats  {"triangles": 2874, "skinnedMeshes": 14, "animations": ["idle","move","attack"]}
lum    {"front": 32.3, "side": 29.2, "tq": 34.1, "reartq": 27.1, "top": 46.4}
hi_sat {"front": 0.0691, "side": 0.1847, "tq": 0.1527, "reartq": 0.1884, "top": 0.1826}
armor_body   side 16.53  tq 22.43  span_ratio 0.6978
armor_skirt  side 14.11  tq 13.46  span_ratio 0.7027
blade        side 12.02  tq  6.36  span_ratio 0.5150
glow_blade   side  3.01  tq  4.18  span_ratio 0.1324
skin_head    side  4.17  tq  4.54  span_ratio 0.3305
pauldron     side 10.53  tq  8.01  span_ratio 0.6413
gold_trim    side  3.77  tq  1.83  span_ratio 0.5154
eye          side  5.25  tq  5.27  span_ratio 0.3101
[judge] Spec "王爺劍 wangye_zhanwen_sword (xianghuo/elite)" — all claims pass.
```

逐條核對：
`tri_budget` 2874 ∈ [1500,5000] ✅／`rig_skinned`（14 skinned meshes）✅／`anim_named` 三支 ✅／
`saturation_area`（tq）**15.27%** ∈ [10%,60%] ✅（與 `tiger_c` 同一條帶，一處都沒放寬）／
`part_signature` `blade` 側視 share 12.02% ≥ 6% ✅／
`focal_contrast` 12.02 ÷ 4.17 = **2.89×** ≥ 2 ✅／
`share_hierarchy` 側視 甲身＋戰裙(16.53+14.11=30.64) : 劍＋劍脊(12.02+3.01=15.03) : 臉(4.17) → **61:30:8**（目標 60:30:10，最大偏差 0.02）✅／
`part_exists` × 3（`blade`／`eye`／`glow_blade`）✅。

`sword.claims.json` 是**動手建模之前**寫好的（基底＝`tiger_c.claims.json`），全程只改 `sword.json` 去遷就它，門檻一處未動；相對 `tiger_c` 唯一的差別是多一條 `part_exists`（釘住 `blade`）＝加嚴。

### M-A0 — silmetrics（出貨檔，側視＋hero）

```
$ node <AC>/harness/silmetrics.mjs out/sword/v3.glb out/sword/sil_ship
{"W_over_H":0.5,"fill":0.476,"mass_thirds":[0.413,0.449,0.138],
 "torso_depth_max":0.94,"torso_depth_min":0.06,"mass_contrast":14.84,
 "leg_fraction":0.231,"turn_count":23,"zigzag_alignment":0.73,
 "front":{"W_over_H":0.46,"fill":0.56},"top":{"W_over_H":0.76,"fill":0.59},
 "hero":{"W_over_H":0.47,"fill":0.547}}
```

側視 `sil_side.png`／`thumb24.png`／`sil_hero.png` 都輸出成功。對 `example/wolf.json` 的錨點（W/H 1.41／fill 0.39／leg_fraction 0.35）：
**W/H 0.50（−65%，從「長而低的四足」翻成「瘦高的直立甲冑」，往反方向離開錨點）、`leg_fraction` 0.231（−34%，戰裙吃掉大腿只剩小腿與靴）、`mass_contrast` 14.84（肩台與腳踝的落差，wolf 級距的三倍以上）、`turn_count` 23（`tiger_c` 是 30、`redhat` 只有 6——領刺／甲片／裙釘／護手把輪廓事件撐起來了）**。

### M-A0／M-A1 — hero render 與戲台截圖

```
$ node <AC>/harness/hero.mjs out/sword/v3.glb out/sword/hero_v3
{"ok":true,"margin":8.3}

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-sword-stage-lit.png \
       "glb=sword.glb&light=1&fx=1&rim=xianghu" idle 8804
{"out":"docs/experiments/2026-09-04-creature-sword-stage-lit.png",
 "query":"glb=sword.glb&light=1&fx=1&rim=xianghu","phase":"idle",
 "fps":59.88023952095833,"calls":22,"loadMs":205,"particles":44,"errors":[]}
```

- `errors: []`——`console.error`／`pageerror` 兩種來源都收，空陣列 ✅。
- 埠號用派工指定的 **8804**；`creature-shoot.mjs` 自己起 `python -m http.server` 並在 `finally` 裡 `srv.kill()`，收工時已關。
- `?glb=` 只吃檔名不補副檔名，寫 `glb=sword.glb`（沿用 redhat 報告的提醒）。
- stage-lit 是 `creature-shoot.mjs` 的原始輸出 1688×780，**只做了一次純裁切**到 480×780（把兩側空地裁掉讓主體佔滿畫面），沒有縮放、沒有調色。
- `tools/anyCreature` 在 `.gitignore` 裡、worktree 沒有這個目錄，所以用 `mklink /J` 建了一個指向主工作樹的目錄 junction，截完圖後 `rmdir` 刪掉（已確認主工作樹的 `node_modules/playwright` 完好）。該路徑被 gitignore，junction 從頭到尾沒有進過 diff。
- `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**，別拿來當佐證（M-A0～A4 沒有要求效能）。

### M-A4 — diff 範圍

```
$ git add -N . && git diff --stat
 assets/creatures/sword.claims.json                 |  75 +++++
 assets/creatures/sword.glb                         | Bin 0 -> 303836 bytes
 assets/creatures/sword.json                        | 315 +++++++++++++++++++++
 .../experiments/2026-09-04-creature-sword-hero.png | Bin 0 -> 197390 bytes
 .../2026-09-04-creature-sword-stage-lit.png        | Bin 0 -> 75845 bytes
 5 files changed, 390 insertions(+)
$ git status --short
 A assets/creatures/sword.claims.json
 A assets/creatures/sword.glb
 A assets/creatures/sword.json
 A docs/experiments/2026-09-04-creature-sword-hero.png
 A docs/experiments/2026-09-04-creature-sword-stage-lit.png
```

（上表是寫本報告之前跑的，本報告本身是第 6 個新檔。）`index.html`、`js/*.js`、`tests/tools/*`、`assets/creatures/tiger*.{json,glb,claims.json}`、`docs/experiments/` 的既有檔案**一個位元組都沒動** ✅。臨時檔（`_tmp_glbinfo.py`、原案 spec 備份、`tools/` junction）都已刪除，不在 diff 裡。未 commit、未 push。

---

## ⑤ 改了哪些檔（檔案:行號）

全部是新檔，既有檔案一行未動。

| 檔案 | 行數 | 內容 |
|---|---|---|
| `assets/creatures/sword.json` | 1–315 | anyCreature 規格。設計註記 `2–14`、`palette` `16–31`、`joints` `36–69`（body／skirt／gorget／blade／hilt／LArm／LLeg 七條鏈）、chains・attach・mirror・touch `71–83`、`volumes` `85–177`、`parts` `179–261`（火舌 `182–196`、領刺 `198–206`、左右不等肩甲 `208–217`、胸甲與甲片金線 `219–239`、護手 `241–246`、劍脊發光 `248–250`、甲指 `252–260`、裙釘＋靴）、三支動畫 `263–314` |
| `assets/creatures/sword.claims.json` | 1–75 | judge.mjs 的機械檢查清單。基底＝`tiger_c.claims.json`，只換材質名＋多一條 `part_exists`（`blade`），門檻逐字相同 |
| `assets/creatures/sword.glb` | — | 303,836 bytes，引擎輸出（v3） |
| `docs/experiments/2026-09-04-creature-sword-hero.png` | — | anyCreature `harness/hero.mjs`，1024²，margin 8.3% |
| `docs/experiments/2026-09-04-creature-sword-stage-lit.png` | — | 戲台 3/4（`tests/tools/creature-shoot.mjs`，`light=1&fx=1&rim=xianghu`），裁切至 480×780 |
| `docs/experiments/2026-09-04-creature-sword-report.md` | — | 本檔 |

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現三條）

1. **★ 直立鏈的 `around` 角度框架與 `SYNTAX.md` 註解不一致，實測是：0°=−x（左側）、90°=−z（背）、180°=+x（右側）、270°=+z（正面）。**
   `SYNTAX.md` 對垂直鏈寫的是「0=inner, 90=FRONT, 180=OUTER, 270=back」——照那組寫，r1 的肩甲跑到背後、胸甲跑到側面（compiler 的 `info: fin ... faces back / faces side` 行把真相印出來了）。`colors.arcs` 吃**同一個**框架，所以劍脊那條橘色帶要寫成 `0-54` 與 `126-180`（＝劍的兩個大面），寫 `0`（以為是脊）會落在側邊。**做法：先隨便給一個角度編譯一次，讀 `info: fin ... faces XXX (world normal ...)` 那行再回頭改**，不要從註解推。
2. **★ 一件長物要「上下兩端都出身體」，必須拆成兩條鏈，兩條的根都埋在宿主體積裡。**
   `root_containment` 檢查的是鏈**根環**有沒有被宿主包住；把整把劍寫成一條鏈、根放在劍柄末端（在身體外面）必 BLOCK。本檔拆成 `blade`（往上）＋`hilt`（往下），兩個根都放在 `y≈0.46-0.51`、`z≈-0.10` 的軀幹內部，剪影上仍是一條連續直線。同一條規則也擋掉了 r1 的腿（`BLOCK: root_containment: chain "LLeg" root ring is 40% outside its host "body"`），解法是把 `LLegRoot` 往上抬進骨盆（`up: +0.012`）、往內收（`side` 0.092→0.076），並把 body 的 `t=0` 半徑加寬。
3. **`saturation_area` 的下限（10%）對「中性深底＋一條窄色帶」的設計是真的會擋。** 本隻只有劍脊有高飽和，第一版量到 **4.6%** 被 BLOCK；把橘帶從 `0-36/144-180` 拓到 `0-54/126-180` 只推到 9.2%，再把劍身斷面加寬（半深 0.057→0.066）才過 10%。**有效的順序是「先把招牌部位做大，再談配色」**——動 arc 角度的邊際效益很低（且會被面的角度格吸附，見試作卷 ③-4）。最終 15.27%。
4. `attack` 的「橫掃」單獨做不會過 `attack_reach`（純側向掃不算承諾往前）。本檔把 `BladeRoot` 的 `ry` 橫掃與 `rx` 前壓、`Hips` 的 `tz` 前撲一起做才過；`Spine` 的 `rx/ry` 一開始給到 11/12 度會 `anim_integrity` 撕皮（`"attack" @0.6 folds mesh — 1 flipped tris, worst in "body"`），降到 7/8 度並把 body 的 `ring_step` 從 0.024 拉到 0.032 才綠。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **「無頭」這個概念沒有被讀出來。** 兩位盲讀者都把頸口的火焰讀成「頭上的火焰頭飾／王冠」，也就是他們預設那底下有頭。M-A1 的每一條都過，但如果主對話要的是「讀者說得出這是無頭的」，那沒有達成。要補的話最直接的是把頸甲收得更矮、火焰底部往下沉進領口，讓「空的領口」在剪影上有一段可見；本卷沒做，因為那會讓火與肩甲擠在一起、剪影變糊。
2. **一根裙擺尖釘與靴子重疊 54%（`warn: part_overlap`）。** 已把三根釘子都往外挪、縮短過一次（v1→v2），右前那根仍有重疊。它在 hero 上看起來是「尖釘壓在小腿外側」，不是穿模破面，判斷可接受；要清乾淨就得再往外挪，但那會讓釘子離開裙緣、看起來像浮在空中。
3. **`type:"eye"` 那對發光點在成圖上幾乎看不見。** 它被五條火舌包住，只在 hero 的領口正面露出一小塊金色。`eye` 材質在 judge 量到側視 5.25% 是**火舌**貢獻的，不是那對眼點。設計上這是「火裡有兩點眼」，實際讀起來是「一叢火」。
4. **原案（人形武將）沒有送盲讀就被換掉。** 換的理由是新美術守則直接禁止了原案的規格（短胖圓潤），不是盲讀失敗——所以本卷的「第 1 輪」指的是備案的第 1 輪。若主對話認為原案該補一次盲讀作為對照，那份 spec 已經不在 diff 裡（為了 M-A4 只留自己的檔），要重跑得從本報告 ③ 的描述重建。
5. **沒有量效能、沒有接進正式對決。** M-A0～A4 沒有要求就沒做；`creature-shoot` 順手回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。
6. **朱紅沒有用上。** 09-04 第二則修訂給香火的色語彙是「金、朱紅、火」，本隻用了金（`gold_trim`）與火（劍脊橘＋頭火），朱紅沒有加——理由是簡報明寫「系別色帶只落在該欄指名的那一處（劍脊）」，再加一塊朱紅會多出第二個色區，且會吃掉 `saturation_area` 的預算。若主對話要朱紅，最省的落點是戰裙的 `colors.arcs` 加一條窄帶。

---

## ⑧ DEVLOG 一行

`gates: M-A0/A1/A3/A4 pass, M-A2 n/a(elite) | M-A1 pass@r1 (2/2 讀成重甲＋巨劍, 氣質「莊嚴/威嚴」「陰森/神秘威嚴」, 2/2 判為威嚇不是公仔) | restarts: 原案人形→備案無頭甲冑（新美術守則禁短胖圓潤，非盲讀失敗）、v2→v3 神性化（骨白→神將金、鬼爪→甲指） | unresolved: 「無頭」概念未被讀出；一根裙釘與靴重疊 54%；朱紅未用`
