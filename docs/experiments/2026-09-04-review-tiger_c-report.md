# 回修檢視卷 — `tiger_c` 虎爺印依真實虎爺神像回修（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-review.md`（R-A0～R-A3，門檻一格未動）。
參照筆記：`docs/experiments/2026-09-04-ref-tiger.md`；圖 `tools/anyCreature/out/ref/tiger/01–03.jpg`（三張都用 Read 親眼看過，逐張所見見 ①）。
基準 SHA：`63e5a28`（worktree `agent-a3d571c0ffb8d6e41`）。**未 commit、未 push。**
出貨檔：`assets/creatures/tiger_c.{json,glb}`（覆蓋；舊版在 git 裡）；截圖 `docs/experiments/2026-09-04-review-tiger_c-{hero,stage-lit}.png`。
`assets/creatures/tiger_c.claims.json` **一個字未動**（凍結帶 10–60% 維持，未放寬）。

**一句話結論：R-A0／R-A1／R-A3 過；R-A2 未過**——盲讀六位（三輪）全部讀成虎、ref 特徵穩定命中 4/5、無人說「可愛」，但**沒有任何一位讀出「神像／廟／神獸」**，主印象仍落在「遊戲怪物／坐騎」。詳見 ④ 與 ⑥。

---

## ① R-A0 參照：三張圖我看到的

| # | 我看到的 |
|---|---|
| 01 | 紅色木欄杆神桌下，兩隻蹲踞虎爺；身披橘金布罩、上有黑色螺旋渦漩紋、布罩邊緣一圈蓬鬆白毛邊與金色滾邊；臉深黑、咧嘴露白獠牙；前方地上擺銅錢盤與捲起的紅布。 |
| 02 | 一大四小虎爺並列於黑色底座，頭戴銀色鑲珠頭冠；臉呈黑金相間、綠玻璃珠眼、白獠牙外露；頸繫紅色繡字綬帶，胸前掛金牌；身側金色虎紋帶黑紋。 |
| 03 | 紅光壁龕內單隻虎爺蹲坐紅色供台；深褐色臉，橘金布罩上黑色渦漩紋、白毛邊，姿態極低伏，旁插一支細香。 |

`ref-tiger.md` 已存在且列了 5 條特徵（本卷沿用，未改該檔）。**原假設「黑條紋」在該檔已被修正為「黑色渦漩紋」，本卷照修正後的清單做。**

## ② R-A1 對照表：回修前的 `tiger_c` 逐條有／無

| # | ref 特徵 | 回修前（炭黑底＋陰火紅帶版，`2026-09-04-lookdev-tiger_c-hero.png`） | 判定 |
|---|---|---|---|
| 1 | ★蹲踞低伏 | `Hips` y 0.545、`leg_fraction` 0.29；hero 上是**四足站立前傾的潛行姿**，腹部離地高，不是蹲踞 | **無**（僅比狼略低） |
| 2 | 橘金布罩＋黑色渦漩紋 | 底色中性炭灰 `#57534f`＋高飽和陰火橘帶；黑紋是 5 對**垂直直板**（豎條），非渦漩，且底色不是橘金 | **無** |
| 3 | ★布罩邊緣白毛邊 | 完全沒有；剪影邊緣是硬邊 | **無** |
| 4 | 深色臉＋咧嘴白獠牙 | 臉炭灰深色 ✓、大張口 ✓、四支白獠牙 ✓ | **有** |
| 5 | 頸繫紅綬帶 | look-dev 卷刻意整組拿掉（原話：pilot 盲讀把紅布條列為玩具感來源） | **無** |

**命中 1/5。回修項＝第 1、2、3、5 條全做，第 4 條保留並加強。**

## ③ 改了什麼（`assets/creatures/tiger_c.json`）

| 面向 | 回修前 | 回修後 |
|---|---|---|
| 姿態（ref①） | `Hips` y 0.545、右前掌抬起（不對稱動物姿） | **`Hips` y 0.400**、四掌全部落地、前肢摺深且左右**對稱**（`RFront` 各段改成 `LFront` 的鏡像值）；`leg_fraction` 0.29 → **0.189**、`W/H` 1.62 → **1.76** |
| 底色（ref②） | `fur_body` 中性炭灰 `#57534f` | **`fur_body` 橘金 `#d98a24`**；腿／尾／頭改深中性（`#343131`／`#302d2c`／`#2e2b2a`），飽和預算全部留給布罩與火 |
| 布罩分帶（ref②③） | arcs＝脊黑＋陰火橘帶＋腹褐 | body `colors.arcs`＝脊黑 `#1d1b1a` 0–22°／**金滾邊 `#e8c860` 106–134°**／**香灰白毛邊 `#ece4d4` 134–157°**／腹黑 `#26241f` 157–180°；中間 22–106° 露出橘金布罩本體 |
| 黑紋形狀（ref②） | 5 對垂直長方直板（讀成豎條紋） | **6 對捲雲板**：拉長的水滴形凸八邊形（長軸 0.21），一大一小成對、逐組換表面內傾角（+25°／−20°／+30°／…），讀成布上的捲曲紋樣而不是條紋 |
| 白毛邊（ref③） | 無 | **5 對 `trim` 毛簇 `curve`**（`#ece4d4`，兩段錐、朝外下），offset 落在布罩下緣（`around` ≈145 的表面點），剪影上多一圈蓬鬆；`turn_count` 30 → **38** |
| 紅綬帶（ref⑤） | 無（被拿掉） | **`sash` `#c22a1e` 5 條目**：4 對貼合頸圈板（`t` 0.88–0.90、`around` 30/78/126/166）＝繞頸紅綬帶＋1 對往後下垂的飄帶（`conform:false`）＝聖經 §1 垂墜物 |
| 神性配件 | 額心八角金印 | 額心金印保留＋**胸前八角金牌**（`seal`，`t` 0.84 `around` 170）；頭頂金帶改深銅金 `#9c7420` 讓亮金印讀得出來 |
| 塊面（去玩具感） | 全域 `smooth_angle` 30、volume 26/24 | 全域 **20**、body **22**／head 20／jaw 20／tail・legs 22；body profile 四列加 **`exp` 3.2**（方塊斷面＝上漆木雕）；`eye` 0.040 → **0.029** |
| 火語彙 | 火鬃 9 支、尾火 3 支 | **火鬃 6 支**（每組最小的那支刪掉、長度回補到原高 ≈0.94）、尾火 3 支、`eye`／`mouth_glow`／`glow_tail`／`glow_mane` 四個材質名全保留 |
| 節奏 | idle 2.4s、attack 0.75s | **idle 2.8s**（聖經 §1 香火 2.4–3.0）、**attack 0.90s** 蓄勢從 0.28 拉長到 **0.38** 再撲（先蓄後落），並加尾巴甩擺 |

回修後 ref 特徵落點：①②③④⑤ 五條全部有實體對應（見 `_ref_map` 欄）。

## ④ R-A2 驗收 — 指令原文與實際輸出

### M-A0 建模與 judge（出貨版）

```
$ node <AC>/engine/cli.js assets/creatures/tiger_c.json <out>/r14.glb
{"ok":true,"bytes":393388,"verts":5000,"faces":2088,"joints":34,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.545}}

$ node <AC>/harness/judge.mjs assets/creatures/tiger_c.glb <out>/judge_final tiger_c \
       --spec assets/creatures/tiger_c.claims.json
{"stats":{"triangles":3548,"skinnedMeshes":17,"animations":["idle","move","attack"]},
 "hi_sat_share":{"front":0.3479,"side":0.3961,"tq":0.4147,"reartq":0.4951,"top":0.7555},
 "names":["fur_body","fur_head","fur_jaw","fur_tail","fur_leg","ear","eye","stripe","nose",
          "mouth_glow","fang","seal","sash","glow_mane","glow_tail","trim","fur_paw"]}
[judge] Spec "妖火虎 tiger_ye_yaohuo (V-C, NPC/elite)" — all claims pass.
```

逐條：**384.2 KB ≤ 400 KB** ✅／三支動畫 ✅／`skins`=1、0 張貼圖 ✅／judge **all claims pass**（claims 未動）✅／`saturation_area`(tq) **41.5%** 落在凍結帶 10–60% ✅／tri 3548 ∈ [1500,5000] ✅。
四個發光材質名 `eye`／`mouth_glow`／`glow_tail`／`glow_mane` 都在 GLB materials 清單 ✅；新增 `sash`／`trim` 兩個材質名。

部位面積（`share`，側／tq）：`fur_body` .293/.205、`stripe`（黑捲雲）.080/.072、`trim`（白毛邊）.018/.011、`sash`（紅綬帶）.022/.019、`seal` .002/.010。

### silmetrics（出貨版）

```
$ node <AC>/harness/silmetrics.mjs assets/creatures/tiger_c.glb <out>/sil_r11
{"W_over_H":1.76,"fill":0.492,"mass_thirds":[0.384,0.386,0.23],"torso_depth_max":0.78,
 "torso_depth_min":0.19,"mass_contrast":4.07,"leg_fraction":0.189,"turn_count":38,
 "zigzag_alignment":0.87,"front":{"W_over_H":0.84,"fill":0.674},
 "top":{"W_over_H":0.48,"fill":0.539},"hero":{"W_over_H":1.45,"fill":0.443}}
```

對 look-dev 版（W/H 1.62／leg_fraction 0.29／turn_count 30）：**W/H +8.6%、leg_fraction −35%（蹲得低多了）、turn_count +27%（毛簇讓邊緣不再是硬邊）**——ref 第 1、3 條在機械指標上有痕跡。

### 截圖

```
$ node <AC>/harness/hero.mjs assets/creatures/tiger_c.glb <tmp>   → {"ok":true,"margin":8.5}
$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-review-tiger_c-stage-lit.png \
       "glb=tiger_c.glb&light=1&fx=1&rim=xianghu" idle 8809
{"query":"glb=tiger_c.glb&light=1&fx=1&rim=xianghu","phase":"idle",
 "fps":59.88,"calls":25,"loadMs":205,"particles":44,"errors":[]}
```

`errors: []`（console／pageerror／requestfailed 三種都收）。stage-lit 是原始 1688×780 輸出**只做一次純裁切**到 810×720（把兩側空地裁掉），沒有縮放、沒有調色。

### 盲讀（context-free `general-purpose`／`sonnet`，只給 hero 與 stage-lit，路徑與檔名不含 tiger 字樣，固定四題）

| 輪 | 版本 | 讀成什麼 | ref 特徵命中 | 主印象（原話節錄） | 判定 |
|---|---|---|---|---|---|
| 1 | 橘金布罩首版 | A：火焰豹／劍齒虎；B：火焰豹／火獅 | A 4/5、B 4/5 | A「兇猛、狂野、詭譎、危險」；**B「更偏向像玩具／吉祥物……可愛又帶點兇」** | **未過**（B 說可愛） |
| 2 | **出貨版**（塊面壓硬＋前肢對稱＋眼縮小＋火鬃減量） | C、D 都說劍齒虎 | C 4/5、D 4/5 | C「兇猛、狂野、危險、炙熱、掠食性」「不是可愛討喜的吉祥物路線」；D「兇猛、詭異、危險、狂野」「**威嚇**感與**威嚇**力……不像可愛玩具」 | **未過**（可愛條過了；「威／莊嚴／神／鎮」只有 D 一位以「威嚇」成立，C 沒有；**無人讀出神像／廟**） |
| 3 | 抬頭仰下巴＋金牌移到胸側＋毛簇放大 | E、F 都說劍齒虎 | E 4/5、F 4/5 | **E「偏向遊戲寵物／吉祥物……看起來很威風但可親近、可擁有」；F「比較像玩具化、收藏向的吉祥物角色」** | **未過且退步** |

**六位讀者一致命中的 4 條**：①蹲踞低伏（「蹲伏／低伏姿勢」）、②橘金身＋黑色不規則紋（「橘黃色軀幹」＋「不規則深黑色斑塊」）、④深色臉＋白獠牙（「臉部是深黑色，露出白色獠牙」）、⑤紅綬帶（「頸部／胸口繫著一條紅色的帶子」）。
**六位全部漏掉的 1 條**：③白毛邊——四位把它讀成「腳掌處的淺灰白色爪套／指甲」，沒有一位讀成布罩的毛邊。

**用哪一輪出貨**：第 2 輪。第 3 輪的抬頭是為了補「莊嚴」，實測反而把主印象推向「可親近的酷炫夥伴」，兩位一致退步；**第 3 輪的三項改動已全部撤回**，出貨 spec 重編出的 GLB 與第 2 輪 `r11.glb` **位元組完全相同**（SHA-256 前 16 碼皆 `90e857881d07acdd`、皆 393388 bytes），所以出貨的就是被 C／D 讀過的那一版，沒有「盲讀後偷改」。

## ⑤ R-A3 範圍

```
$ git add -N . && git diff --stat
 assets/creatures/tiger_c.glb                            | Bin 294664 -> 393388 bytes
 assets/creatures/tiger_c.json                           | 2861 ++++++++++++--
 docs/experiments/2026-09-04-review-tiger_c-hero.png     | Bin 0 -> 263081 bytes
 docs/experiments/2026-09-04-review-tiger_c-stage-lit.png| Bin 0 -> 142095 bytes
```

（本報告 `.md` 是這一份 stat 之後才寫的。）`js/`、`index.html`、`tests/`、其他生物的 `assets/creatures/*` 一行未動 ✅；`tiger_c.claims.json` 未動 ✅；`ref-tiger.md` 未動（本卷只讀不改）✅。截圖用的 `tools/anyCreature` junction 已刪除，`tools/` 目錄不存在。**未 commit、未 push。**

`tiger_c.json` 的 diff 行數大（2861 行）是**格式**造成的：中途用 `json.dumps(indent=1)` 重寫過，整檔從緊湊排版變成每個數字一行。實質改動就是 ③ 那張表；`_variant`／`_brief`／`_ref_map` 三個註解欄有更新以說明回修內容。

## ⑥ 做不到的事（誠實條）

1. **R-A2 未過，而且卡在同一個地方：沒有人讀出「神」。** 六位讀者全部把它讀成「劍齒虎造型的遊戲怪物／坐騎」，沒有一位提到神像、廟、神獸、鎮守。這跟 look-dev 卷 ⑤-1 記的是同一個結論，只是這次多了「加了布罩、綬帶、金牌之後仍然如此」的證據。我的判斷：**在這個引擎裡，「這是一尊被供奉的神像」需要的是「它被放在哪裡」而不是「它身上有什麼」**——底座／供桌／香爐／光暈／金粉。底座是唯一做得出來的（大 `fin` 當台座），但那會讓 `move` 動畫變成「拖著台座走路」，我沒有做，留給主對話裁定。
2. **第 3 輪是負向的，我把它撤回了，但這代表「抬頭＝莊嚴」這條直覺在盲讀上是錯的。** 抬頭＋仰下巴讓兩位讀者從「威嚇」改口成「可親近、可擁有」。要補莊嚴不能靠頭的角度，這條記下來給其餘 25 隻。
3. **白毛邊（ref 第 3 條）在盲讀上完全失效。** 機械上有（`trim` 側視 share 1.8%、`turn_count` +27%），但六位裡四位把它讀成「腳掌的白爪」。`curve` 錐叢在體側被讀成「刺／爪」而不是「毛」，這是形狀語彙的天花板：引擎沒有「一叢細毛」這個部位，只有圓錐鏈與凸多邊形板。第 3 輪把毛簇放大 45% 也沒改變這個誤讀（反而更像刺）。
4. **黑色渦漩紋只做到「捲曲的筆觸」，做不到螺旋。** `fin` 的 `points` 必須是嚴格凸多邊形，螺旋本質上是凹的；我用「一大一小拉長水滴、逐組換傾角」逼近，六位讀者一致讀成「不規則黑色斑塊／豹紋／燒焦痕跡」，沒有一位讀成紋樣。要真的做出渦漩得等引擎支援凹面 `fin` 或貼圖。
5. **GLB 只剩 15.8 KB 餘裕（384.2 / 400 KB）。** 塊面壓硬（`smooth_angle` 20＋`exp` 3.2）會大量分裂頂點：同一份 spec 在 `smooth_angle` 26 時是 294.7 KB，壓到 18 時直接 **432.4 KB 破表**，我是靠砍 7 個部位（火鬃 −3、毛簇 −2 對、小捲雲 −2）才壓回 400 KB 以內。**量產 26 隻要注意：「硬轉折」的成本是位元組不是三角形**（tri 只從 3530 → 3548，bytes 卻 +100 KB）。
6. **`saturation_area` 41.5%，比 look-dev 版的 31.1% 高 10 個百分點。** 因為主色從中性炭灰換成高飽和橘金，這是 ref 要求的方向，仍在凍結帶 10–60% 內，但餘裕從「將近一倍」縮到「不到一半」。要再加任何高飽和配件前先量。
7. **`mouth_glow` 的可見面積仍趨近 0**（側 0.3%／tq 0.8%）——沿用 look-dev 卷 ⑤-2 的結論，要它真的亮起來得靠 L 卷的 emissive＋bloom。
8. **只驗了 hero 與 stage-lit 兩張，沒有正視／頂視盲讀，沒有量效能、沒有接進正式對決。** stage-lit 那一發順手記到 `drawCalls 25`、`loadMs 205`、`fps 59.88`（無頭渲染，不是真 GPU 數字）。
9. **判斷用的是 6 個 sonnet 讀者，不是使用者本人。** 這是凍結檔指定的驗法，它只證明「模型讀者不會說可愛」，不證明使用者會滿意「一看就是廟裡的虎爺」。最終仍要人眼裁定。

## ⑦ 這一隻踩到、量產 26 隻會再遇到的引擎陷阱（附件七＋四＋四＋五之外，新四條）

1. **`root_containment` 對「頭鏈掛在哪一節頸椎」極度敏感，而且把根關節往宿主裡埋沒有用。** 我把 `HeadRoot` 往體內多埋 0.028，錯誤訊息**逐字相同**（`29% outside`）——那代表埋深不在因果路徑上。真正的變因是**頸段的 up 分量**：`Spine/Chest/NeckB/Neck2` 的 `up` 各動 0.01 讓體鏈末端的環方向變了，改回原值立刻放行。**改體型時，頸段的 `up` 是最後才動、動了要單獨驗的一格。**
2. **垂墜部位會偷偷變成「支撐點」而把 `balance` 打掉。** 綬帶從喉下往正下方垂 0.32，末端 y 算下來是 −0.07（穿到地板下），`balance` 於是把支撐多邊形算成「綬帶尖端那一小圈」（`z[0.35,0.52]`），質心當然掉在外面。**任何 `conform:false` 的垂墜 fin，動手前先算末端世界座標的 y**；蹲踞體型垂直空間只有 0.2 左右，綬帶要往**後下方**垂而不是正下方。
3. **`smooth_angle` 是位元組的主要成本，不是三角形。** 見 ⑥-5。`exp`（方塊斷面）的角點會再乘上去：body 16 sides × 19 rings，每個角點分裂一次就是上千個頂點。**先定 `smooth_angle` 再加部位，不要反過來**——我是加完部位才壓硬，結果得回頭砍部位。
4. **`type:"fin"` 帶 `anchor` 且用預設 `conform` 時，`udir` 只保留「在表面切平面內的旋轉」**——這正好可以拿來排紋樣：側面（`around`≈90，法線≈±X）用 `udir=[0, sinθ, cosθ]` 就是「在布面上轉 θ 度」，背脊（`around`≈25，法線≈+Y）要改成 `udir=[1,0,0]`＋`vdir=[0,sinθ,cosθ]`。抄錯這一組，同一片板子會躺平在錯的軸上。

## ⑧ DEVLOG 一行

`tiger_c` 依真實虎爺神像回修：橘金布罩＋金滾邊＋白毛邊＋黑捲雲紋＋繞頸紅綬帶＋胸前金牌＋蹲踞低伏（leg_fraction 0.29→0.19），妖火語彙全留；judge all pass、384 KB、三支動畫；**R-A2 盲讀未過（六位無人讀出神像，三輪用盡）**，其餘 R-A0／A1／A3 過。

## 主對話裁定（2026-09-04 17:45）
收貨（R-A2 依 17:30 修訂口徑：主印象「兇猛、威嚇、非吉祥物」通過；特徵 4/5）。①黑漆台座不做（move 會拖台座，神像感交給戲台香煙／金粉／金印 emissive）；②白毛邊改為純色帶（arcs 香灰白窄帶）、拿掉錐叢，列入硬化批 2 一併處理；③連同硬化批套 `build:"rigid"`＋exp ≥4.5。
