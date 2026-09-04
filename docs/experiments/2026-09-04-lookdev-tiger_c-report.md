# 3D look-dev 卷 V-C《妖火虎》回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-lookdev.md`（門檻未動；`saturation_area` 依該檔第 2 條放寬為 10–60%，`smooth_angle` 依第 3 條自訂）。
基準 SHA：`b2292f5`（worktree `agent-a6f0922e4f541fea4`）。**未 commit、未 push。**
出貨檔：`assets/creatures/tiger_c.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-lookdev-tiger_c-{hero,stage}.png`。`assets/creatures/tiger.*` 原檔一個位元組都沒動。

---

## ① LD-A0／A1／A2／A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| LD-A0 GLB 規格 | **PASS** | 287.8KB ≤ 400KB；`idle`／`move`／`attack` 三支；`skins`=1；15 個 primitive、0 張貼圖；judge 對本方案放寬後的 claims **all claims pass**；silmetrics 側視 thumb24 與 hero 都讀得出四足獸輪廓（W/H 1.62、hero W/H 1.40） |
| LD-A1 盲讀（context-free ×2） | **PASS（第 1 輪就過，第 2 輪再驗一次也過）** | 四位讀者一致：是（劍齒）虎／貓科猛獸、氣質「兇悍／兇猛／煞氣」、明確說**不是**吉祥物而是「會攻擊你的東西」。原話見 ② |
| LD-A2 截圖 | **PASS** | hero（anyCreature 1024²，margin 8.4%）＋ stage（戲台 3/4、844×390、現有燈光、console 0 error） |
| LD-A4 範圍 | **PASS** | 只有 `assets/creatures/tiger_c.*`、`docs/experiments/2026-09-04-lookdev-tiger_c-*`、以及派工明文允許的 `tests/tools/creature-preview.html` `?glb=` 參數（+7−1 行）。`git diff --stat` 見 ④ |

**不算通過的地方（誠實條）**：四位讀者**全部**在第 4 題說「神性不夠」——「兇相蓋過神性」「還沒到會讓人跪拜的莊嚴感」「比較像妖怪或魔獸」。設計簡報要的是「威嚇**又神**」，威嚇那一半做到了，神那一半沒有。詳見 ⑤。

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給兩張圖，檔名遮成 v1/v2、w1/w2，路徑不含 tiger 字樣）

問法固定四題：「1. 這是什麼動物？ 2. 它的氣質是什麼？ 3. 像玩具／吉祥物，還是像會攻擊你的東西？ 4. 像不像廟裡的神獸？」

### 第 1 輪（r13：黑底陰火＋白下顎＋怒眉，尚無放大金印）

**讀者 A**
> 1. 一隻劍齒虎（saber-tooth）造型的獸，黑色皮毛帶火焰／熔岩紋路，背脊和尾巴末端是火焰狀的鬃毛。
> 2. 兇猛、陰沉、帶點狂野和壓迫感，像是隨時要撲上來的掠食者，眼神銳利、獠牙外露，整體氣質偏兇惡而不討喜。
> 3. 比較像會攻擊你的東西——獠牙、瞪眼、低吼姿態都在強調威脅性，不是那種圓潤可愛、讓人想抱的吉祥物造型。
> 4. 有一點神獸的影子（火焰紋路、威嚴感類似瑞獸的表現手法），但整體更像遊戲裡的魔獸／怪物角色，兇相蓋過神性，不太像廟裡那種讓人跪拜祈福的神獸，反而更像要鎮壓或戰鬥用的凶獸。

**讀者 B**
> 1. 這是一隻劍齒虎樣式的怪獸，黑色體毛配紅色紋路、背上有火焰狀鬃毛尖刺，尾巴末端也是一撮火焰。
> 2. 氣質偏兇悍狂暴，帶點魔化／煉獄感，像是被詛咒或燒過的野獸，眼神銳利、獠牙外露，有壓迫感。
> 3. 比較像會攻擊你的東西——低多邊形卡通造型雖然可愛化了一些，但齜牙咧嘴、火焰鬃毛的設計走的是「凶獸」路線，不是討喜吉祥物。
> 4. 有一點廟宇神獸的影子（類似火麒麟、瑞獸的意象），但整體更像遊戲裡的敵人／召喚獸角色，神性不夠、殺氣偏重，還沒到會讓人想跪拜的莊嚴感。

→ 對照 LD-A1 三條：兩位都說虎 ✅／主印象不是玩具或吉祥物 ✅（兩位都主動否定）／含「兇」✅。**第 1 輪即通過**。

### 第 2 輪（r16＝出貨版：把額心金印放大成八角神印、金與眼色提亮，其餘不動；為了補「神」再驗一次）

**讀者 C**
> 1. 一隻黑毛帶劍齒虎獠牙的貓科猛獸，背脊和尾巴末端燒著橘紅色火焰。
> 2. 兇悍、燥熱、帶點暴走的攻擊性，很躁動不安分。
> 3. 明顯偏會攻擊你的那種，尖牙外露、通體漆黑帶紅眼神很凶，不是討喜的吉祥物路線。
> 4. 有一點廟會陣頭或地獄使者的味道（黑紅配色、火焰、獠牙），但整體造型太獸性、太兇殘，比較像妖怪或魔獸，不太像會讓人虔誠跪拜的神獸。

**讀者 D**
> 1. 一隻像劍齒虎（saber-tooth）風格的低多邊形猛獸，黑色皮毛配大獠牙。
> 2. 氣質兇悍、燥熱、帶點電玩魔王的煞氣，火焰紋路讓牠看起來像是燒紅了的獵食者。
> 3. 比較像會攻擊你的東西，獠牙外露、身上像烙印的裂紋發光，不是可愛討喜的吉祥物路線。
> 4. 有一點神獸的影子（額頭圖騰、火焰鬃毛、威嚴站姿），但整體低多邊形卡通建模感偏電玩角色，還不到廟裡供奉神獸那種莊嚴神聖感。

→ 同樣三條全過；且讀者 D 主動點名「**額頭圖騰**」是神獸線索，這正是第 2 輪加的那件東西，所以出貨版取 r16。

**對照試作卷**：pilot 的最終盲讀是「像玩具或吉祥物，稚氣、逗趣多過威嚇」。本方案四位讀者**沒有一位**用到玩具／吉祥物／可愛／稚氣，凍結檔第 4 條的品質印象閘門成立。

---

## ③ 改了什麼、與 `tiger.json` 差在哪

`tiger_c.json` 是從 `tiger.json` 複製起手的，改動集中在四件事：**姿態壓低張口、材質轉黑底陰火、加四類發光部位、轉折改硬**。

| 面向 | `tiger.json`（試作卷） | `tiger_c.json`（V-C 妖火虎） |
|---|---|---|
| `smooth_angle` | 50（全域） | **30**（全域）；body 26／head 24／jaw 24／tail 26／legs 26 逐 volume 再壓（凍結檔第 3 條的自訂空間），轉折硬＝雕像感 |
| 姿態 | `Hips` y 0.56、頭略扭 | **`Hips` y 0.545、前身壓低**（`Spine` up 0.02→0.00、`Chest` up 0.04→0.03、`Neck2` up 0.02→−0.02），前肢摺得更深（`LFrontElbow` up −0.20→−0.205、`LFrontWrist` −0.165→−0.195）＝低蹲 |
| 張口 | `JawRoot` up −0.07、`Jaw1` up −0.135 | **`JawRoot` up −0.090、`Jaw1` up −0.215**；上顎 `Muzzle` up −0.055→−0.030、`fwd` 0.160→0.080（短吻）＝口張得開、吻不再像豬 |
| 大塊底色 | 暖棕族 `#6f5a4a` / `#5f4c3e` | **中性炭灰族** `#57534f` / `#494543` / `#514c4b`。改中性是有量測依據的：暖棕色系經 `shading` 的 Y 值階（top 0.30 / bottom −0.88）壓暗後 **HSV 飽和度會自己升上去**，實測「把所有 arcs 拿掉」的探針仍有 44.3% 高飽和；換成中性灰之後同一探針掉到可控範圍，火才吃得到飽和度預算 |
| 花紋 | 條紋 `#241a18`＋橘 arcs（低飽和） | **高飽和陰火帶**：body `#f24a06` 50–104°、head `#e03a04` 0–14°、jaw `#ff5a08` 0–40°（口內）、tail `#f24a06` 0–52°；黑條紋 fin 加到 **5 對**、加粗（±0.042×±0.125） |
| 白色辨識 | 無 | **白下顎 `#c6bba6` ＋白吻下緣**（head arcs 146–180）——這是「兩位讀者都說虎」最便宜的訊號 |
| 發光部位 | 只有 `eye`（小、`size` 0.030） | **四個給 three.js 掛 emissive 的材質名**：`eye`（`size` 0.040、`#ffe27a`）、`mouth_glow`（喉嚨往前伸的發光楔形 spike）、`glow_tail`（尾尖 3 支火舌 curve）、`glow_mane`（背脊 9 支火舌 curve，`glow_*` 前綴） |
| 神性配件 | 紅綬帶＋錢牌＋方形金印 | **綬帶與錢牌整組拿掉**（pilot 盲讀原話把「紅布條裝飾」列為玩具感的來源之一），改成**額心八角金神印**（放大到 ±0.086、厚 0.020）＋**怒眉深色斜板**（`stripe`，眼上壓一道）|
| 部位總數 | 16 | 24（多 9 支火舌、少綬帶／錢牌／腮鬃） |
| 三角形 | 2628 | 3082（預算 1500–5000） |

`tiger_c.claims.json` 相對 `tiger.claims.json` 只有兩處是「不同」，其餘全是**加嚴**：
1. `saturation_area` 上限 0.34 → **0.60**（凍結檔第 2 條明文放寬，不是我自己調的）。
2. `focal_contrast` 的對手 `sash` → `glow_mane`（本方案把綬帶拿掉了，原材質不存在，judge 會直接報 part 不存在）。
3. **新增三條** `part_exists`（`mouth_glow`／`eye`／`glow_tail`），機械釘住派工要求的材質命名——這是加嚴，不是放寬。

**engine 陷阱（試作卷 ③ 那七條之外，本卷新踩到的四條）**

1. **`shading` 的 Y 值階會把暗色系的飽和度推上去**。`saturation_area` 量的是 unlit 頂點色的 HSV S≥0.50，而 `gradient.bottom −0.88` 讓暗棕 `#2c221e`（S=0.32）在下半身變成 S≈0.74。第一版「全黑底＋窄火帶」量到 90.2%，把 arcs 全部拿掉的探針仍有 44.3%。**底色要中性（R≈G≈B），火帶的飽和預算才留得下來**。
2. **arcs 的過渡帶也算飽和面積**。高飽和橘與底色之間的插值中點仍然 S>0.5，所以一條 34° 的帶實際會吃掉約 34°＋兩側各一個面的角度格。想控制面積只能控**角度寬度**，換顏色沒用。
3. **fin 的三角形頂點偏移太大會在 bind pose 就翻面**。火焰板做成「底邊 ±0.05、頂點 u 偏 0.15」這種強斜三角，`mesh_integrity` 直接 2 個翻面三角形；頂點偏移壓到 ≤0.10、厚度 ≥0.014 才過。
4. **body 鏈末端（t≈0.95）的 anchor 落在 dome cap 上會炸**。`fin` anchored 在 `t 0.95 around 0` 於 bind pose 就翻面，往回移到 t≤0.88 就好。
5. 順帶再確認一次試作卷記的第 1 條：**改了體型比例就要重算鏈段長度比**。`LFront` 的 `elbow→wrist→toe` 被 `proportion` 擋了兩次（0.93、1.00），因為 toe 是 `ground` 絕對錨定，一動 `Hips` 高度那一段長度就跟著變。

**`js/creature-figures.js` 目前不認材質名**：`grep -n "emissive\|material.name" js/creature-figures.js` 只命中一行註解（`js/creature-figures.js:57`，講的是 fresnel 邊光），沒有任何依 material 名掛 emissive 的分支。所以本卷**只把材質命名到位**（`eye`／`mouth_glow`／`glow_tail`／`glow_mane`，全部落進 GLB 的 material 名，見 ④ 的 materials 清單），**emissive 待 L 卷接**；依派工指示沒有動 `js/creature-figures.js`。

---

## ④ 指令原文與實際輸出

### LD-A0 — 建模與 judge

```
$ node <anyCreature>/engine/cli.js assets/creatures/tiger_c.json <out>/r16.glb
{"ok":true,"out":".../out/tiger_c/r16.glb","bytes":294664,"verts":3483,"faces":1734,
 "joints":34,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.448}}

$ python  # 直接讀出貨 GLB 的 JSON chunk
{"bytes": 294664, "kb": 287.8, "animations": ["idle", "move", "attack"], "skins": 1,
 "meshes": 1, "primitives": 15,
 "materials": ["fur_body","fur_head","fur_jaw","fur_tail","fur_leg","ear","eye","stripe",
               "nose","mouth_glow","fang","seal","glow_mane","glow_tail","fur_paw"],
 "images": 0, "generator": "anyCreature v1.2.0"}

$ node <anyCreature>/harness/judge.mjs assets/creatures/tiger_c.glb <out>/judge_ship tiger_c \
       --spec assets/creatures/tiger_c.claims.json
{"stats": {"triangles": 3082, "skinnedMeshes": 15, "animations": ["idle","move","attack"]},
 "lum": {"front": 51.3, "side": 38.1, "tq": 47.3, "reartq": 34.3, "top": 53.7},
 "hi_sat_share": {"front": 0.3092, "side": 0.2669, "tq": 0.3105, "reartq": 0.2757, "top": 0.378}}
[judge] Spec "妖火虎 tiger_ye_yaohuo (V-C, NPC/elite)" — all claims pass.
```

逐條核對：287.8KB ≤ 400KB ✅／三支動畫 ✅／`skins`=1 ✅／0 張貼圖（顏色全在頂點）✅／judge 全綠 ✅／
`saturation_area`（tq）**31.05%**，落在放寬後的 10–60% 帶內、還留了將近一倍的餘裕 ✅。
四個發光材質名 `eye`／`mouth_glow`／`glow_tail`／`glow_mane` 都出現在 GLB 的 materials 清單裡 ✅。

### LD-A0 — silmetrics（側視＋hero）

```
$ node <anyCreature>/harness/silmetrics.mjs assets/creatures/tiger_c.glb <out>/sil_ship
{"W_over_H":1.62,"fill":0.454,"mass_thirds":[0.371,0.397,0.232],"torso_depth_max":0.81,
 "torso_depth_min":0.17,"mass_contrast":4.68,"leg_fraction":0.29,"turn_count":30,
 "zigzag_alignment":0.83,"front":{"W_over_H":0.88,"fill":0.555},
 "top":{"W_over_H":0.54,"fill":0.481},"hero":{"W_over_H":1.4,"fill":0.431}}
```

對 `example/wolf.json` 的錨點（W/H 1.41／fill 0.39／leg_fraction 0.35）：
**W/H 1.62（＋15%）、fill 0.454（＋16%，更壯）、leg_fraction 0.29（−17%，蹲得更低）、turn_count 30**（試作卷 21 → 30，火鬃與火尾讓輪廓的轉折數多了 43%，這是「不像玩具」在剪影上的量化痕跡）。側視 thumb24 與 hero 剪影都讀得出頭／背／四肢／上揚的尾。

### LD-A2 — 戲台 3/4 截圖

```
$ python -m http.server 8799 --bind 127.0.0.1     # 服務 worktree 根目錄；收工已按 PID 155452 關閉
$ node <out>/stage.mjs http://127.0.0.1:8799 tiger_c docs/experiments/2026-09-04-lookdev-tiger_c-stage.png
{"loadMs": 183, "clips": ["idle","move","attack"], "bones": 34, "drawCalls": 21, "consoleErrors": []}
```

- 844×390、`?n=1&auto=0&glb=tiger_c`、`idle` 播 1.4 秒後按快門，用**現有燈光**（凍結檔 LD-A2 指定，L 卷的新燈光由主對話合併後統一重拍）。
- console／pageerror／requestfailed 三種都收，`consoleErrors: []`。
- 截圖裡的除錯 HUD 用 `page.addStyleTag` 在**截圖那一刻**隱藏，沒有改頁面本身。

### LD-A4 — diff 範圍

```
$ git add -N . && git diff --stat && git reset
 assets/creatures/tiger_c.claims.json               |  81 ++++++
 assets/creatures/tiger_c.glb                       | Bin 0 -> 294664 bytes
 assets/creatures/tiger_c.json                      | 307 +++++++++++++++++++++
 docs/experiments/2026-09-04-lookdev-tiger_c-hero.png  | Bin 0 -> 279213 bytes
 docs/experiments/2026-09-04-lookdev-tiger_c-stage.png | Bin 0 ->  44432 bytes
 tests/tools/creature-preview.html                  |   7 +-
```

（上面這份是刪掉暫用腳本之後的狀態；本報告 `.md` 本身是這一版之後才寫的。）
`tests/tools/creature-preview.html` 的 7 行就是派工允許的 `?glb=` 參數解析——只吃 `[A-Za-z0-9_-]` 的檔名、不合法就退回 `tiger.glb`，其餘行為（燈光、鏡頭、量測掛勾、自動循環）一行未動。
`assets/creatures/tiger.{json,glb,claims.json}` 不在 diff 裡 ✅。`js/creature-figures.js`、`index.html`、`js/scene-env.js`、`js/renderer.js`、`js/duel-figures.js` 一行未動 ✅。未 commit、未 push。

---

## ⑤ 做不到的事（誠實條）

1. **「神」那一半沒做到。** 四位盲讀者全部說神性不足（「兇相蓋過神性」「比較像妖怪或魔獸」「還不到廟裡供奉神獸那種莊嚴神聖感」）。第 2 輪加的八角金印確實被讀者 D 點名為神獸線索，但不足以翻轉主印象。我的判斷是：**神性在這個引擎裡需要「配件」而不是「造型」**——光暈／蓮座／香爐煙／雲紋這些，anyCreature 的部位語彙（fin 只能凸多邊形、curve 只能圓錐鏈、arcs 只能軸向分帶）做不出來，或做出來會像雜訊（本卷實測過肩上金甲片，兩種角度都只讀成一條金色刮痕，已撤掉）。最有效的補法在 **L 卷的環境特效**：頸後光環、香火煙、金粉——那些是粒子，不是模型。
2. **`mouth_glow` 在 judge 的可見面積趨近 0**（side 0.13%／tq 0.61%）。實際模型上從側前方看得到張口裡的橘色（見 hero），但它被上顎與獠牙擋掉大半，量出來的面積小到不能拿來當「口內發光」的證據。要它真的亮起來得靠 L 卷的 emissive＋bloom；現在只能說「材質命名到位、幾何在該在的位置」。
3. **戲台截圖仍然偏暗、偏紅。** 這是試作卷已經記過的問題（現有燈光只有燈籠點光＋霧），本卷的黑底炭灰身體在那個光下幾乎只剩火的形狀。凍結檔 LD-A2 指定用現有燈光，所以我沒有動它；`lum` 側視 38.1、tq 47.3（試作卷 48.2／62）——**本方案在現有燈光下比 tiger.json 更暗，這是設計取向（黑底陰火）帶來的代價，不是 bug，但 L 卷的三燈組上來之前，戲台上它會比另外兩個方案吃虧**。
4. **虎的橫紋一樣是貼上去的板子。** 沿用試作卷 ⑥-4 的結論：`colors.arcs` 只能軸向分帶，橫紋只能用 `fin` 薄板。本卷把它加到 5 對並加粗，遠看有效，近看仍是板子。
5. **正視／頂視沒有盲讀。** 依凍結檔第 1 條已移出必過閘門，本卷也沒有額外去驗；`silmetrics` 的 front / top 數字有附在 ④，但沒有人讀過它們。
6. **沒有量效能，也沒有上真機。** LD-A3 是 L 卷的條目，本卷只在拍 stage 時順手記到 `drawCalls: 21`（單隻）、GLB 載入 160–189ms。三角形數 3082（試作卷 2628，＋17%），26 隻量產時要注意這個數字會累加。
7. **判斷「像不像玩具」用的是 4 個 sonnet 讀者，不是使用者本人。** 這是凍結檔指定的驗法，但它只證明「模型讀者不會說玩具」，不證明使用者會滿意。最終還是要人眼挑。

---

## ⑥ 量產 26 隻時，這一隻定下來可以沿用的做法

1. **底色一律用中性灰族**（R≈G≈B），飽和度全部花在招牌色與發光部位上——理由是 ③ 的陷阱 1，不是美學偏好。
2. **發光四件套的材質名固定**：`eye`／`mouth_glow`／`glow_tail`／`glow_mane`，`claims.json` 用三條 `part_exists` 機械釘住，改錯名字 judge 會擋。
3. **火 = `curve` 的火舌叢，不是 `fin` 的板子**。實測過等距薄板（讀成劍龍背板）與圓錐火舌叢（讀成火焰），差別很大；每叢 3 支、高度刻意不等、`rise` 累加 16→22 度往後倒。
4. **「不像玩具」最便宜的三件**（照效果排序）：① 眼上壓一道深色怒眉板 ② `smooth_angle` 壓到 24–30 讓所有轉折變硬 ③ 拿掉圓潤的布料類配件（綬帶／蝴蝶結那一族）。
5. **「認得出是什麼動物」最便宜的一件**：把該物種的白色部位塗出來（虎＝白下顎與白吻下緣）。加上這塊之後盲讀才穩定說出物種名。
