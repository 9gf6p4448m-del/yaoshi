# 硬化批 3C — `wuying` 五營旗（金瞳＋白粉底）與 `hairpin` 林投姐髮簪（長臂＋髮綹分縷）（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4 ＋末段全部修訂，含 19:10 的 `faceted` 規則與 19:30 的預算制）。
美術權威：`docs/design/ART_BIBLE.md` §0.5／§1（香火）／§3（陰氣）／§5。缺項來源：`docs/experiments/2026-09-04-creature-gaps.md` 的 `wuying`、`hairpin` 兩列。
真實參照：`2026-09-04-ref-wuying.md`（本卷 Read 親眼重看 `ref/wuying/06-penghu-zhizharen.jpg`、`07-nantianfu-wuying.jpg`）、`2026-09-04-ref-hairpin.md`（本卷**沒有重看**圖檔，沿用該檔文字判讀，據實記在 ⑦-6）。
基準：worktree `agent-afde0dbf92772a9bc`。**未 commit、未 push。**
出貨檔：`assets/creatures/{wuying,hairpin}.{json,glb}`；`*.claims.json` **一個位元組都沒動**。

---

## ① 結論先行

| 項目 | wuying | hairpin |
|---|---|---|
| **H1** judge | ✅ `all claims pass` | ✅ `all claims pass` |
| **H1** GLB | 565,556 B ＝ **552.3 KB**（≤1.5MB） | 834,732 B ＝ **815.2 KB**（≤1.5MB） |
| **H1** 三角形 | **3,054**（≤8,000） | **5,124**（≤8,000） |
| **H1** 三支 clip | `idle`／`move`／`attack` ✅ | 同 ✅ |
| **H1** faceted 四項 | `build:"rigid"` ✅／6 個 volume **全 `faceted:true`** ✅／最小 `exp` **4.6** ≥4.5 ✅／`smooth_angle` **全檔 26** ∈24–30 ✅ | 同左：`rigid` ✅／6 個 volume 全 `faceted:true` ✅／最小 `exp` **4.8** ✅／`smooth_angle` **26** ✅ |
| **H1** n=3 一排同款 | ✅ 重拍成功、`errors: []` | 不適用（haunt） |
| **H2** 盲讀 | 2 輪 ×2 位 context-free `sonnet`，遮名、四題逐字同 harden2A §② | 3 輪 ×2 位，同上 |
| **H3 / H4** | **全部達標**（金瞳 2/2、白底 2/2、主印象 2/2） | **主印象 2/2 ✅、髮簪 2/2 ✅；長臂 0/6 ✗、下半身讀成髮 0/6 ✗ → 3 輪用盡，交最佳版並標「未達」** |
| **H5** diff 範圍 | ✅ 只有兩隻的 `.json`／`.glb`＋本卷 7 張截圖＋gaps 兩列＋本報告 | 同 |

**wuying 完成（5/5）。hairpin 兩個子項未達**——歸因與否證過程在 ⑥／⑦。

---

## ② 盲讀原話（context-free `sonnet` 子 agent，只給 hero＋stage-lit 兩張，路徑遮成 `qP/rP/qQ/rQ/sQ-imgA|B.png`，不含 wuying／hairpin／五營／髮簪／女鬼 等字樣；兩位讀者的圖片順序對調）

問法兩種交錯（與 harden2A 報告 §② **逐字相同**，沒有加提示）：
- 問法甲：「1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？」
- 問法乙：「(a) 這是什麼？一句話 (b) 逐條列部位 (c) 氣質偏『威嚴／兇／不祥』還是『可愛／討喜』？ (d) 猜它的來歷」

### wuying — 兩輪四位

**第 1 輪**（模型 w7：眼窩＋金瞳細長板同位疊層、白帶擴大、helm 抬高 0.018、**朱紅小嘴用 `sash` 材質**）— **不過**

- 讀者 A（問法甲）：(1)「像是拿著旗幟／儀仗槍的**士兵或儀仗隊角色**，介於人形武將與**丑角／小丑**之間的造型」；(2)「臉部：**白色臉龐**配戴一個對稱的面具或彩繪——**眼睛部位是黃色菱形塊**，**右臉頰有一顆紅色圓點，帶點小丑妝感**」「頭頂：戴著一頂尖錐形的深灰帶金色漸層盔帽」「帽子左側：插著一根橘黃色、像羽毛／火焰狀的裝飾物」「桿頂端有黃色尖角與紅色三角旗（旗子下緣垂有幾條黃色流蘇）」；(3)「帶點**詼諧與戲劇感**的儀仗／護衛角色氣質……莊重中帶點滑稽」；(4)「**比較偏向玩具感、可愛／逗趣風格**」。
- 讀者 B（問法乙）：(a)「頭戴尖頂鬥笠(附橘色羽狀裝飾)、**面戴白底黑紋詭異面具**的低多邊形風格武裝人形角色」；(b)「**白底面具**，黑色鏤空眼窩、**黃色細長眼形裝飾**，臉頰兩點紅色圓斑」；(c)「氣質偏『**威嚴／不祥**』……完全不走可愛討喜路線」；(d)「東亞（台灣/日本）廟會陣頭或戰場儀仗中的『**執旗官/掌旗武將**』……八家將、鍾馗類神將」。

→ 白底 2/2、金瞳 1/2、主印象 2/2；但**讀者 A 第 4 題答「偏向玩具感、可愛」**，歸因＝白臉＋亮眼＋**紅色圓點嘴**＝小丑妝（A 自己講出「小丑妝感」）。改動見 ⑤。

**第 2 輪**（出貨版 w8：**嘴由 `sash` 朱紅改 `brow_ink` 近黑、加寬壓扁成抿嘴**；金瞳再收薄一階）— **2/2 全過**

- 讀者 C（問法甲）：(1)「一名戴著尖頂盔、拿著旗形長矛/儀仗杖的**武人／士兵**，帶點日本武士或**儀仗兵**的造型」；(2)「臉部：**白色面具**，**眼睛部位是細長的黃色與黑色條紋切口**，鼻樑處帶一點綠色/藍綠色調」「金黑相間的尖錐形頭盔（斗笠狀），頂端有橘色像羽毛/火焰的裝飾物立起」「桿頂裝有紅色三角旗，旗子下緣垂著幾條黃色流蘇/穗子」「紅色鎧甲/戰袍為主色」；(3)「莊嚴、肅穆又略顯神秘的**儀式感**，像是**廟會陣頭、古代儀仗兵或某種鎮守神將**」；(4)「**偏向威嚇/肅穆一路，不是可愛玩具感**……不怒自威的壓迫氣場」。
- 讀者 D（問法乙）：(a)「頭戴金色三角尖帽、手持紅旗長杆的低多邊形風格**戰士／儀仗兵**造型角色」；(b)「**白/銀色鏡面質感臉部，眼睛是狹長的黃色發光縫**，臉頰有黑色紋路裝飾」「金色錐形尖帽，帽緣黑色，頭頂插著一根橘色火焰狀羽飾」「一面紅色三角旗，旗面垂著三個黃色流蘇/穗子」；(c)「氣質偏『**威嚴／不祥**』——鏡面臉孔沒有五官表情、**發光縫隙眼神冷峻**……不屬於可愛討喜的類型」；(d)「東方色彩的『**儀仗武將**』或『**祭祀衛兵**』」。

### hairpin — 三輪六位

**第 1 輪**（h5：長臂向前外伸、髮綹一暗一亮交錯到 Veil1／Veil2、上段髮綹加長 1.20×、`ghost_hair`→#1a1f1e、`ghost_wisp`→#1f4a3a、髮／髮簾 arcs 加密）

- 讀者 A（甲）：(1)「類似**幽靈／女妖**／木乃伊型的人形怪物，穿著**破爛長裙**、頭上覆蓋黑色**頭巾**或髮罩」；(2)「右側腰際：有一隻蒼白纖細、像**枯枝或昆蟲肢體的附肢**從身體側邊伸出」「下半身：整條**裙擺**化為多條深綠與黑色交錯的破碎布條／尖刺狀垂墜物……**沒有明顯的腿或腳**」「胸腹前方有一個灰白色板狀物，中央嵌著一顆紅色發光的點……像是持著某種**儀式法器或武器**」；(3)「**陰森、詭譎**」；(4)「**會威嚇人**的類型」。
- 讀者 B（乙）：(a)「一株帶著發光眼睛、身披**深綠垂葉/髮絲斗篷**的立姿妖異人形生物」；(b)「下半身：大量深綠與黑色交錯、**如稻草／髮絲／根鬚般垂下**的細長條狀物，形成**裙擺或觸手狀下身**」；(c)「明顯偏『**威嚴／兇／不祥**』」；(d)「**稻草人系**或草木精怪」。
→ **主印象掉到 1/2**（B 讀成稻草人／草木精怪），髮簪 0/2，下半身 0/2。

**第 2 輪＝出貨版**（h6：`ghost_wisp` 再壓暗到 #1b4238、髮簾窄帶 #245448、上段髮綹回到 1.05×（把壽衣讓回來）、**頭簪加寬扁葉狀簪頭＋紅珠放大 1.45×**）

- 讀者 C（甲）：(1)「像是身披黑袍、拖著長長破碎裙擺（或觸手狀布條）的**幽魂／亡靈巫者**，圖2的浮空與腳下光點特效更強化『**懸浮的鬼**』這個印象」；(2)「慘白、消瘦、略拉長變形的臉」「一對發亮的淡青白色眼珠，深陷眼窩」「頭側／後腦：一根細長淺色尖刺或**髮簪狀物**突出」「身體左側：垂著一段細長、彎曲的淺色物體（像**枯枝或第二隻手臂/尾巴**）」「下半身：從腰部以下裂成大量細長尖銳的黑綠色**布條／裙擺**」；(3)「陰森、破敗、**詭譎**……巫者／亡靈祭司般的儀式感」；(4)「明顯是會讓人心生警戒、**威嚇型**的角色」。
- 讀者 D（乙）：(a)「一尊全身覆蓋乾枯藤蔓／稻草般垂條、頭戴黑色方形冠帽的木乃伊化人形**幽靈**或稻草人怪」；(b)「頭冠：黑色方塊狀帽子，後方伸出一根細長白色觸角／**髮簪狀物**」「雙臂：**左側有一隻細瘦、彎曲下垂的手臂（枯枝狀）；右側手臂舉在胸前**，握著像白色羽扇／骨扇的物件，扇心嵌一顆紅色寶石」「下半身：沒有清晰的腿，取而代之的是大量深綠至黑色的細長垂條（像**稻草／藤蔓／破布**）」；(c)「明顯偏『**威嚴／不祥**』……完全不可愛討喜」；(d)「**稻草人／紙紮人偶**系幽靈」。
→ **主印象 2/2 ✅、髮簪 2/2 ✅**；長臂 0/2、下半身 0/2。

**第 3 輪**（h10：髮簾核心擴寬到 0.104、`ghost_wisp` 先 desaturate 再改 #1d3f3a、袖子提亮 #8d8f85、頭頂方冠拆成兩綹長髮綹、髮綹縮短再還原）— **整體更差，已回退**

- 讀者 E（甲）：(1)「**幽魂系角色**，下半身呈飄浮的破碎裙擺／煙霧狀……介於『亡靈』與『妖怪』之間」；(2)「頭頂：黑色尖角或頭飾突出，右側伸出一根細長的**白色觸角／髮絲狀物**」「下半身：一大片深色、參差不齊的**破碎布條／觸鬚狀裙擺**」；(4)「明顯偏向**會威嚇**你」。
- 讀者 F（乙）：(a)「一具身披破碎黑袍、懸浮於半空的骷髏臉**幽靈**／死靈法師系怪物」；(b)「右側**伸出**一隻灰白骨爪手，握著一根細長武器（似矛或杖）；左側肩後另有一隻**小型**骨爪」「髮／頭飾……後方有一根細長**天線狀**突起」「下半身：斗篷下擺化成一叢參差不齊的黑色尖刺/破布條，懸空飄浮」；(c)「明顯偏『**威嚴／兇／不祥**』」；(d)「『**黑無常**』或『勾魂使者』一類的鬼差」。
→ 主印象 2/2、下半身 0/2、長臂 0/2，**髮簪由 2/2 退回 0/2**（兩位都讀成觸角／天線／矛杖）。**因此出貨版採第 2 輪（h6），不是第 3 輪。**

**風格牆指標**（凍結檔 17:30 修訂的記錄項）：wuying 四位裡 3 位、hairpin 六位裡 2 位在正文順帶把圓潤感歸因於低多邊形渲染；**主印象出現「可愛」的只有 wuying 第 1 輪的讀者 A（已由第 2 輪修掉）**。

---

## ③ H1–H5 逐條表（門檻／出貨值／檔案:行號）

| 條 | 門檻 | wuying 出貨值 | hairpin 出貨值 | 依據 |
|---|---|---|---|---|
| H1 judge | M-A0～M-A4 全綠 | `all claims pass` | `all claims pass` | `harness/judge.mjs`，指令與輸出見 ④ |
| H1 GLB | ≤1.5 MB | **552.3 KB** | **815.2 KB** | 讀 GLB 的 JSON chunk |
| H1 三角形 | ≤8,000 | **3,054** | **5,124** | judge `stats.triangles` |
| H1 clip | idle/move/attack | 三支齊 | 三支齊 | GLB `animations` |
| H1 faceted① | `build:"rigid"` | `rigid` | `rigid` | `wuying.json:66`／`hairpin.json:47` 附近（`"build": "rigid"`） |
| H1 faceted② | 所有主要 volume `faceted:true` | **6/6**（body, skirt, head, helm, LArm, LLeg） | **6/6**（body, veil, hair, head, LArm, RArm） | 逐 volume 列印，見 ④ |
| H1 faceted③ | 所有 profile `exp ≥4.5` | 最小 **4.6**（head t=0 與 t=1、helm t=1、LArm／LLeg 尾段） | 最小 **4.8** | 同上 |
| H1 faceted④ | `smooth_angle` 24–30 | **26**（全域＋每個 volume 各寫一次） | **26** | 同上 |
| H1 ring_step | 可細一階（非硬條件） | body 0.026／skirt 0.016／head 0.011／helm 0.011／LArm 0.036／LLeg 0.042（**未動**） | body 0.017／veil 0.015／hair 0.015／head 0.011／LArm 0.038／RArm 0.030（**未動**） | 預算還有餘裕但兩隻都沒有粗化或細化的需要，維持量產值 |
| H1 n=3 | 一排同款仍能載 | ✅ `errors: []`、`loadMs 196`、寬 **0.383** ≤1.2、preview `n>1` 每隻縮 0.62／欄距 1.05 → 相鄰淨距 **0.8125** | — | `2026-09-04-harden3C-wuying-n3.png` |
| H2 | 每隻兩位 context-free `sonnet`、遮名、四題逐字 | 2 輪 ×2 位 | 3 輪 ×2 位 | ② 全文 |
| H3-a | 「金瞳／發光的眼／金色眼」≥1/2 且不再讀成色塊 | **2/2**（C「細長的黃色與黑色條紋切口」／D「狹長的黃色發光縫」） | — | ② |
| H3-b | 「白臉／粉白／白底」≥1/2 | **2/2**（C「白色面具」／D「白/銀色鏡面質感臉部」） | — | ② |
| H3-c | 主印象武將／兵／儀仗 2/2 不退步 | **2/2**（C「武人／士兵……儀仗兵」／D「戰士／儀仗兵」；(d) 兩位分別答「廟會陣頭／鎮守神將」與「儀仗武將／祭祀衛兵」） | — | ② |
| H4-a | 「一長一短的手臂／長臂伸出」≥1/2 | — | **0/6 ✗**（最接近的是 r3 讀者 F「右側**伸出**一隻灰白骨爪手……左側肩後另有一隻**小型**骨爪」，仍未說一長一短） | ② |
| H4-b | 下半身讀成「髮／長髮」≥1/2（裙 ≤1/2） | — | **0/6 ✗**（六位分別讀成裙擺／布條／稻草／藤蔓／根鬚／觸鬚；裙 4/6） | ② |
| H4-c | 主印象女鬼／幽靈 2/2 不退步 | — | **2/2 ✅**（出貨輪 C「幽魂／亡靈巫者……懸浮的鬼」／D「人形幽靈或稻草人怪」） | ② |
| H4-d | 髮簪仍被讀出 | — | **2/2 ✅**（C「髮簪狀物」／D「髮簪狀物」） | ② |
| H5 | 出貨檔只有兩隻的 `.json`／`.glb`；claims 不動 | ✅ | ✅ | `git diff --stat`，見 ④ |

---

## ④ 指令原文與實際輸出

`<AC>` ＝ `tools/anyCreature`（`.gitignore` 第 3 行，worktree 內用 `New-Item -ItemType Junction` 借主樹，全程沒進過 diff）。

### 編譯（出貨版）

```
$ node tools/anyCreature/engine/cli.js assets/creatures/wuying.json  tools/anyCreature/out/h3c/w_check.glb
{"ok":true,"bytes":565556,"verts":7814,"faces":1669,"joints":32,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.444}}

$ node tools/anyCreature/engine/cli.js assets/creatures/hairpin.json tools/anyCreature/out/h3c/h_check.glb
{"ok":true,"bytes":834732,"verts":12103,"faces":2799,"joints":26,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.555}}

$ cmp tools/anyCreature/out/h3c/h_ship.glb tools/anyCreature/out/h3c/h6.glb
（無輸出＝逐位元組相同）
```

**最後一條是本卷最重要的一筆證據**：hairpin 出貨的 `hairpin.json` 是**逐條反轉第 3 輪的改動**回到第 2 輪，重編出來的 GLB 與**第 2 輪兩位盲讀者實際看到的那一份 `h6.glb` 逐位元組相同**（反轉時發現 3 條髮綹的長度因為 ×0.85 再 ÷0.85 的三位小數捨入而漂了 0.001，已逐條校回，`cmp` 才通過）。寫 `_traps_3C` 註記之後再編一次也 `cmp` 相同（`_` 開頭欄位編譯器不讀）。

### judge（對**未改動**的 claims）

```
$ node tools/anyCreature/harness/judge.mjs assets/creatures/wuying.glb  ... wuying  --spec assets/creatures/wuying.claims.json
[judge] Spec "五營旗 wuying_zhibing (xianghuo/swarm)" — all claims pass.
  stats  triangles 3054   lum side 42.4   hi_sat tq 0.3716
  skin_face front 0.03983  side 0.05455   eye front 0.00452   brow_ink front 0.02274
  helm side share 0.05332 span 0.4855     flag_cloth side 0.05243
  tq hierarchy 46.3 : 29.5 : 24.2   whole size [0.383, 1.161, 0.404]

$ node tools/anyCreature/harness/judge.mjs assets/creatures/hairpin.glb ... hairpin --spec assets/creatures/hairpin.claims.json
[judge] Spec "林投姐髮簪 hairpin_lintoujie_faszan (yinqi/haunt)" — all claims pass.
  stats  triangles 5124   lum side 26.8   hi_sat side 0.2351
  ghost_hair side 0.21764 span 0.5848     skin_face side 0.02326
  pin side 0.03330 span 0.8218            sleeve side 0.09287
  side hierarchy 72.6 : 21.6 : 5.8   whole size [0.558, 1.054, 0.611]
```

逐條核對有門檻的：
- wuying `part_exists` helm／skin_face／flag_cloth／glow_helm／eye 五個材質名都在 ✅；`part_signature helm@side` share 5.33%（<6%）**但** span **0.4855** ≥0.12，該條是 OR 故過 ✅（與量產版同一路）；`part_visible skin_face@front` **3.983%** ≥2.5% ✅（量產版 3.271% → 本卷 **升**）；`part_visible flag_cloth@side` **5.243%** ≥2% ✅；`focal_contrast armor_body:glow_helm@front` 34.9% : 0.63% ＝ **55×** ≥3 ✅；`share_hierarchy@tq` **46.3:29.5:24.2**（目標 60:30:10、容差 ±15pp，最大偏離 **14.2pp**）✅；`style_dark@side` **42.4** ≤90 ✅；`saturation_area@tq` **37.16%** ∈[10%,60%] ✅；`tri_budget` **3054** ∈[1500,8000] ✅；`rig_skinned`／`anim_named` ✅。
- hairpin `part_exists` ghost_hair／ghost_wisp／hair／eye／glow_pin／pin 六個 ✅；`part_signature ghost_hair@side` share **21.76%** ≥6% ✅；`part_visible skin_face@side` **2.33%** ≥1.5% ✅；`part_visible pin@side` **3.33%** ≥1.5% ✅（量產版 2.64% → **升**）；`focal_contrast ghost_hair:skin_face@side` 21.76 ÷ 2.33 ＝ **9.4×** ≥2 ✅；`share_hierarchy@side` **72.6:21.6:5.8**（最大偏離 **12.6pp**）✅；`style_dark@side` **26.8** ≤90 ✅；`saturation_area@tq` **22.14%** ✅；`tri_budget` **5124** ✅。

### faceted 四項的逐 volume 出貨值

```
=== wuying   build=rigid  全域 smooth_angle=26
  body  faceted=True sa=26 sides=14 ring_step=0.026 exp=[4.8,5.0,5.2,5.2,4.8,4.8]
  skirt faceted=True sa=26 sides=8  ring_step=0.016 exp=[4.8,5.0,5.2,5.0,4.8]
  head  faceted=True sa=26 sides=28 ring_step=0.011 exp=[4.6,4.8,5.0,4.8,4.6]
  helm  faceted=True sa=26 sides=8  ring_step=0.011 exp=[4.8,5.0,5.2,4.8,4.6]
  LArm  faceted=True sa=26 sides=8  ring_step=0.036 exp=[4.8,4.8,4.6,4.6]
  LLeg  faceted=True sa=26 sides=8  ring_step=0.042 exp=[4.8,4.8,4.6,4.6,4.6]
  → 全 faceted True｜min exp 4.6｜smooth_angle 只有一個值 {26}

=== hairpin  build=rigid  全域 smooth_angle=26
  body faceted=True sa=26 sides=12 ring_step=0.017 exp=[4.8,4.8,5.0,4.8,4.8]
  veil faceted=True sa=26 sides=16 ring_step=0.015 exp=[4.8×5]
  hair faceted=True sa=26 sides=16 ring_step=0.015 exp=[4.8,4.8,5.0,4.8,4.8,4.8]
  head faceted=True sa=26 sides=10 ring_step=0.011 exp=[4.8,4.8,5.0,4.8,4.8]
  LArm faceted=True sa=26 sides=7  ring_step=0.038 exp=[4.8×4]
  RArm faceted=True sa=26 sides=7  ring_step=0.030 exp=[4.8×4]
  → 全 faceted True｜min exp 4.8｜smooth_angle 只有一個值 {26}
```
**誠實條**：這四項在量產版就已經全部成立（兩隻都是 19:10 修訂之後做的），本卷是**核對並列出貨值**，不是本卷新做到的。`ring_step` 派工說「可細一階」——本卷兩隻都**沒有**細化（造型沒有被取樣不足卡住，細化只會多吃預算），維持量產值。

### silmetrics（出貨版）

```
$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/wuying.glb ...
{"W_over_H":0.34,"fill":0.385,"mass_thirds":[0.065,0.433,0.502],"leg_fraction":null,
 "turn_count":19,"front":{"W_over_H":0.32},"top":{"W_over_H":0.93},"hero":{"W_over_H":0.34}}

$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/hairpin.glb ...
{"W_over_H":0.60,"fill":0.375,"mass_thirds":[0.022,0.341,0.637],"leg_fraction":0.573,
 "turn_count":30,"front":{"W_over_H":0.55},"top":{"W_over_H":0.90},"hero":{"W_over_H":0.35}}
```
`leg_fraction` 兩隻都不是有效值（wuying 旗桿貫穿側視剪影回 `null`；hairpin 沒有腿、及地髮綹被當腿量成 0.573——量產卷 ⑥-4 已記，不是任何一條 claim）。

### 截圖

```
$ node tools/anyCreature/harness/hero.mjs  <出貨 glb> ...   → wuying {"ok":true,"margin":8.5}／hairpin {"ok":true,"margin":9.1}
$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-harden3C-wuying-n3.png \
      "glb=wuying.glb&light=1&fx=1&rim=xianghu&n=3" idle 8827
{"fps":59.88,"calls":68,"loadMs":196,"particles":132,"errors":[]}
$ node tests/tools/creature-shoot.mjs ... "glb=wuying.glb&light=1&fx=1&rim=xianghu"  idle 8827 → errors: []
$ node tests/tools/creature-shoot.mjs ... "glb=hairpin.glb&light=1&fx=1&rim=yinqi"   idle 8827 → errors: []
```
四次 `errors` 都是空陣列。`fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。
stage-lit 是 `creature-shoot.mjs` 原始輸出 1688×780 **只做一次純裁切**（wuying 500×780、hairpin 550×780，裁掉兩側空地），沒有縮放、沒有調色；hero 是 `hero.mjs` 的原圖未動。**這幾張就是盲讀者實際看到的那一版。**

### diff 範圍（H5）

```
$ git diff --stat
 assets/creatures/hairpin.glb                            | Bin 829708 -> 834732 bytes
 assets/creatures/hairpin.json                           | 111 +++++++++---------
 assets/creatures/wuying.glb                             | Bin 563296 -> 565556 bytes
 assets/creatures/wuying.json                            |  32 ++---
 docs/experiments/2026-09-04-harden3C-hairpin-front.png     | Bin 0 -> 40811 bytes
 docs/experiments/2026-09-04-harden3C-hairpin-hero.png      | Bin 0 -> 203710 bytes
 docs/experiments/2026-09-04-harden3C-hairpin-stage-lit.png | Bin 0 -> 75308 bytes
 docs/experiments/2026-09-04-harden3C-wuying-front.png      | Bin 0 -> 34692 bytes
 docs/experiments/2026-09-04-harden3C-wuying-hero.png       | Bin 0 -> 185013 bytes
 docs/experiments/2026-09-04-harden3C-wuying-n3.png         | Bin 0 -> 76299 bytes
 docs/experiments/2026-09-04-harden3C-wuying-stage-lit.png  | Bin 0 -> 70119 bytes
```
（上表是寫本報告與更新 gaps 之前跑的；之後再加 `creature-gaps.md` 的兩列與本報告。）
**`assets/creatures/wuying.claims.json` 與 `hairpin.claims.json` 一個位元組都沒動**（不在 `git status` 的變更清單裡），`index.html`／`js/*`／`tests/tools/*`／其他生物／anyCreature 引擎／`ART_BIBLE.md`／凍結檔也全部沒動。臨時腳本（`_tmp_inspect.py`／`_tmp_crop.py`／`_tmp_bbox.py`／`_tmp_nums.py`）已刪。**不 commit、不 push。**

---

## ⑤ 每輪改動（檔案:行號＝`assets/creatures/<ab>.json`）

### wuying

| 輪 | 改了什麼 | 為什麼 / 結果 |
|---|---|---|
| r1（w1） | `brow`（brow_ink）由「眼睛上方的眉條」改成**與金瞳同一個 t／同一個 around 的眼窩板**（0.085×0.045，外高內低的斜長六邊形）；`eye` 改細長板疊在窩上、`thickness` 0.008→0.012（比窩的 0.006 厚 → 一定在前）；兩者由 t 0.44／0.56 併到 **t 0.50**；`skin_face` #e6dccb→#ece9de；`HelmRoot` up −0.036→−0.026（露出額頭、減 AO） | 量產版金瞳是一塊**在黑眉下方**的黃斑，讀者只讀到「色塊」。前視渲染立刻出現兩顆「黑窩＋金縫」的眼睛 |
| r2（w2） | 臉的 `colors.arcs` 由 `0–92 暗／100–120 綠／160–180 朱紅` 改成 `0–90 暗／90–103 綠`（**朱紅中線帶整條拿掉**）；`skin_face`→#f4f1e6；`HelmRoot`→−0.018；新增 `mouth_line`（`sash` 朱紅小嘴）；眼窩與金瞳外端再挑高 | 朱紅帶因頂點色插值實際暈到 sym 154（±25°），吃掉半張臉，白底根本沒面積。拿掉之後正面是一整片白 |
| r3～r4（w3／w4） | 綠帶由 90–103 收成 **88–92**（只命中 sym=90 那一圈頂點，退到頭側）；眼窩／金瞳 `around` 試 163（**兩顆窩在鼻樑合體成一條黑帶，否證**）→ 回到 **152** | 3/4 hero 視角下遠側臉整片綠；`around` 太靠正面會合體（新陷阱②） |
| r5～r7（w5／w7） | `skin_face` 試 #d5cfbe（lum 206）想壓 bloom → **與 240 一樣糊，否證**，最後定 **#e2ded1**（lum 222，中性、去暖奶油）；`brow_ink` #1a1a1c→**#0d0d0f**；`glow_helm` #ff7a1e→#ec6a14（縮小盔纓光暈對臉的溢出）；眼窩加大一階 | 戲台 bloom 救不回來的是亮部，只有近黑不 bloom（新陷阱④） |
| **r8＝出貨版（w8）** | `mouth_line` 材質 **`sash`→`brow_ink`**、形狀由圓點改成 0.080 寬 × 0.016 高的**下彎抿嘴**；金瞳再收薄一階 | r1 盲讀讀者 A 把「白臉＋亮眼＋紅點」讀成**小丑妝**、第 4 題答「偏向玩具感、可愛」。改近黑抿嘴之後 r2 兩位都答「威嚇／威嚴不祥」 |

`palette` 動了 4 個材質：`skin_face` #e6dccb→#e2ded1、`brow_ink` #1a1a1c→#0d0d0f、`eye` #ffd24a→#ffe066、`glow_helm` #ff7a1e→#ec6a14。**沒有新增任何材質名**——眼窩與嘴都掛在既有的 `brow_ink` 上，正是為了不去動 `claims.json` 的 `share_hierarchy` 分組（tertiary 只剩 0.8pp 餘裕）。

### hairpin

| 輪 | 改了什麼 | 為什麼 / 結果 |
|---|---|---|
| r1（h5） | 左臂鏈 0.271→0.320、側向伸出 0.138→0.324、右臂縮成 0.157→0.134（臂長比 **1.72×→2.39×**）；`ghost_hair` #3a4340→#1a1f1e、`ghost_wisp` #2d6650→#1f4a3a；Veil1／Veil2 的 10 條髮綹由**全苔綠**改成一暗一亮交錯（5 條改 `ghost_hair`）；髮／髮簾兩個 volume 的 `colors.arcs` **由 4 條有效帶加密成 9 條逐格交錯**（原本寫在 >180 的四條是死碼，見量產卷 ⑧-1）；上段 `hair` 髮綹 ×1.20 跨過腰線 | 量產版腰上腰下是兩種顏色兩種粗細，讀者讀出「腰帶把上下切開」。但這一版 `share_hierarchy@side` 一度撞到 **75:19:6**（primary 偏離 15.0pp）被 judge BLOCK，改法見新陷阱① |
| **r2＝出貨版（h6）** | `ghost_wisp` 再壓暗到 **#1b4238**、髮簾窄帶 #35705a→**#245448**；上段髮綹由 ×1.20 回到 **×1.05**（把壽衣袍身讓回來）；**頭簪加一片寬扁葉狀簪頭 fin ＋ `glow_pin` 紅珠放大 1.45×**（0.022/r0.011 → 0.030/r0.016） | r1 讀者 B 讀成「深綠垂葉／稻草人」——**主印象掉到 1/2**。壓暗＋把袍讓回來之後 r2 兩位都回到「幽魂／幽靈」，簪頭一加**兩位都寫出「髮簪狀物」** |
| r3（h7～h10，**已回退**） | 髮簾核心斷面 0.076→0.140 擴成連續錐裙、`caps` 第二格 dome→none、髮綹縮短 0.85×、`ghost_wisp` 先 desaturate 成 #39433d（**`saturation_area` 掉到 6.8% < 10% 直接 BLOCK**）再改 #1d3f3a、袖子提亮 #575a54→#8d8f85、頭頂方冠拆成兩綹長髮綹 | 想照 `wethair.jpg` 做「連續布狀簾幕」。結果錐裙吞掉髮綹、剪影變成平滑鐘形＝**更像裙子**；盲讀下半身仍 0/2，**且髮簪從 2/2 掉回 0/2**。逐條反轉回 r2，`cmp` 確認與 h6 逐位元組相同 |

---

## ⑥ 新引擎陷阱（已同步寫進兩隻 spec 的 `_traps_3C` 欄位）

1. **★ `fin` 帶 `anchor` 時預設 `conform:true`，板子的法線會被吸到宿主表面。** wuying 的金瞳／眉板實測被轉 **42°**（compiler 印 `fin 'eye': the host surface rotated this plate 42° off the direction the spec asked for`），所以板面不是朝正面而是朝斜側——這就是量產版「金瞳被讀成色塊」的機制，是 harden2A ⑥-4「平板讀不讀得出來看法線朝哪不看面積多大」的續集。**修法不是加大面積，是把亮件放進一片更大的近黑窩裡做兩層明度對比**：`brow_ink` 由「眉」改成「眼窩」（0.085×0.045），金瞳細長板疊在它上面，`thickness` 0.012 > 窩的 0.006 所以一定在前。四位讀者裡有兩位直接寫出「黑色鏤空眼窩／狹長的黃色發光縫」。
2. **★ 一對 `mirrored` 的 fin，`around` 太靠正面會在鼻樑處合體成一條橫帶。** 實測 `around:160`（離正面 20°）時兩個眼窩相接，hero 上只看得到一條黑帶；`around:152` 才留得住鼻樑的白間隙。判準：`宿主半徑 × sin(180−around)` 要大於板子內側 `|u|` 再加一點餘裕。代價是 hero（相機 `(1,0.5,1)`＝偏航 45°）只看得到**一顆**眼睛；戲台鏡頭（`creature-preview.html:103`，偏航 `atan(0.75/2.25)`＝**18.4°**）兩顆都在，兩張圖合起來才夠。
3. **★ `colors.arcs` 的色帶會因頂點色插值外溢約一整格。** head `sides:28`（每格 12.86°）時 `from 160 to 180` 的朱紅實際從 sym 154 就開始暈，正面看等於 ±25°、吃掉半張臉。**要做「一條窄中線」用 arcs 做不到**，本檔改成拿掉中線帶、另用實體 fin 做嘴。反過來用：想讓一條帶「只出現在頭側」，把它壓到只命中一個頂點（本檔綠帶 `88→92` 只命中 sym=90 那一圈）。
4. **★ 戲台 bloom 會把 lum ≳200 的臉整片燒白，壓亮度救不回來。** 臉 #f4f1e6（lum 240）與 #d5cfbe（lum 206）在 `light=1&fx=1` 下**一樣糊**（兩張裁切圖肉眼比對幾乎沒差）。真正有效的是**把五官做成大塊近黑**（眼窩 #0d0d0f）——黑不 bloom。這條補上 hairpin ⑥-3「淺色也有上限、落點約 lum 160」的另一半：**在 160 以上，再壓亮度的邊際效益是零，該做的是加深對比件。**
5. **★（美術）臉上的紅色小色塊會讓白臉直接讀成小丑妝。** 第一版用 `sash` 朱紅做嘴，r1 讀者 A 原話「右臉頰有一顆**紅色圓點**，帶點**小丑妝感**」，第 4 題就答「偏向玩具感、可愛／逗趣」。改成近黑的橫向抿嘴之後兩位都變成「威嚴／不祥」。**白底＋亮眼＋紅點＝小丑；白底＋亮眼＋黑嘴＝臉譜。**
6. **★ `share_hierarchy` 的 `view` 決定「往哪個方向做動作要付代價」。** hairpin 的 view 是 `side`，把長臂往**側向（±X）**拉會讓袖子在側視的投影變小 → secondary 掉、primary 相對抬高，一次就撞破 ±15pp（實測 **75:19:6** 被 BLOCK）。要靠手臂補 secondary，手臂必須往 **+Z（側視量得到的方向）**伸。出貨版的長臂是「側向 0.324、前向 0.176」的折衷。
7. **★ 「暗但高飽和」的綠一旦成為下半身主色，讀者一律讀成植物。** 六位讀者分別給出垂葉／稻草／藤蔓／根鬚／觸鬚／布條，**沒有一位讀成髮**。但把它整條 desaturate（#39433d，S 0.16）會讓 `saturation_area` 從 23% 掉到 **6.8% < 10% 直接 BLOCK**——飽和度必須先找到別的載體才動得了這條。這是量產卷 ⑥-2「`saturation_area` 量的是 S 不是 V」那條的反面：**S 夠高不代表讀者讀得對，它只保證機器放行。**
8. **★（否證）「把分離的圓桿換成連續髮簾」這條路走不通。** 把 `veil` 體積的斷面由 `0.076→0.086→0.076→0.05→0.02` 擴成 `0.078→0.112→0.140→0.142→0.116`、`caps` 第二格 dome→none 之後，錐裙把 12 條髮綹整個吞掉，剪影變成一個**平滑的鐘形**——比原本更像裙子。`wethair.jpg` 的「連續簾幕＋只有末端散開」在「橢圓管＋薄板」的語彙下做不出來，中間值（0.104）也只是把鐘形變小。已回退。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **★ hairpin「兩臂一長一短」三輪六位仍 0/6，H4-a 未達。** 模型上是真的做了（左臂鏈 0.320／右臂 0.134 ＝ **2.39×**，左臂側向伸出 0.324 完全在袍外，正視圖 `2026-09-04-harden3C-hairpin-front.png` 一眼就看得出來），三輪裡也有三位讀者主動描述了不對稱（「一隻附肢從身體側邊伸出」「左側細瘦彎曲的手臂（枯枝狀）；右側手臂舉在胸前」「右側**伸出**一隻骨爪手……左側肩後另有一隻**小型**骨爪」），但**沒有一位用「長／短」這組詞**。**我的歸因**：盲讀給的是 hero（偏航 45°）＋stage-lit（偏航 18°）兩張，這兩個角度都讓伸出去的那隻手臂朝向鏡頭而被前縮；不對稱在**正視**最明顯，而正視不在盲讀圖組裡。**兩條路請主對話裁定**：(甲) 把 `-front.png` 加進 haunt 的盲讀圖組（**等於放寬 M-A1／H2 的圖組，屬凍結條件變更，要走 `02 §2.1`**）；(乙) 把短臂做成**真正的殘缺**（只剩到肘、袖口空垂、沒有手），代價是動到量產版沒有的造型語彙。本卷兩條都沒做。
2. **★ hairpin「下半身讀成髮」三輪六位 0/6，H4-b 未達，而且比量產版的 3/6 更差。** 已做的：髮綹一暗一亮交錯延伸到最下兩節、上段髮綹跨過腰線消掉接縫、兩個 volume 的 arcs 加密成逐格交錯、苔綠壓到 #1b4238。**已否證的兩條**：連續錐裙（⑥-8）、把髮綹整條 desaturate（⑥-7 會 BLOCK）。**我的判斷是這條撞到與 tiger_c 白毛邊同一面牆**——低多邊形沒有髮絲、沒有輪廓線，「一根根圓桿」在剪影上與「布條／草／根」無法區分，`colors.arcs` 只能做軸向分帶、做不出髮絲。**建議主對話比照 tiger_c 做引擎限制簽字，或整條轉進 three.js 後處理卷（描邊／法線貼花）**；我不自行決定。
3. **★ hairpin 出貨的是第 2 輪不是第 3 輪。** 第 3 輪在下半身與長臂上都沒有進展，卻把「髮簪」從 2/2 打回 0/2（兩位改讀成觸角／天線／矛杖），所以依派工「未達就停手交最佳版」交第 2 輪。反轉的機械證據是 ④ 的 `cmp` 逐位元組相同。**第 3 輪的兩張圖沒有進出貨目錄**（出貨截圖是第 2 輪那一版）。
4. **wuying 的「紙紮／折紙感」仍然 0 位讀出**（本卷四位加上量產卷六位＝ 0/10）。這是全批共同的低多邊形風格牆（tiger_c ⑤／redhat ⑧／shield ⑦-1／flag ⑧ 同一條），量產卷已建議比照 tiger_c 做引擎限制簽字，**本卷沒有再動它**，也沒有列入本批的驗收條件。
5. **wuying 的 `share_hierarchy@tq` 只剩 0.8pp 餘裕**（24.2% vs 容差上限 25%）。眼窩與嘴都是刻意掛在既有的 `brow_ink`／改掛近黑而不是新開材質，就是為了不去動 claims 的 tertiary 分組。**下一個人要在這隻身上加任何新的小零件，都得同時縮掉另一個 tertiary 件**，否則直接爆。
6. **參照圖只重看了兩張。** ART_BIBLE §0.5 要求親眼看圖，本卷 Read 了 `ref/wuying/06-penghu-zhizharen.jpg`（紙紮兵的白粉底臉）與 `07-nantianfu-wuying.jpg`（五方面色的五顆頭，金瞳與濃黑挑眉的直接依據）；**`ref/hairpin/` 的六張本卷一張都沒有重看**，沿用 `2026-09-04-ref-hairpin.md` 的文字判讀。
7. **`part_overlap` 的 warn 兩隻都還在**（wuying 的旗面／火舌／流蘇互框；hairpin 的髮綹互框、簪頭與手互框）。我逐張看 hero／front／beauty 渲染圖核對過沒有實際穿模，但**這是肉眼證據不是機器證據**。
8. **沒有做 ART_BIBLE §6 的剪影三秒測試**（每兩批一次的批次閘門，要多隻拼圖），**沒有量效能、沒有接進正式對決**。`creature-shoot` 回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限。
9. **hairpin 沒有重新拍「下半身虛化」的 ghost 圖**（M-A2 是量產卷的閘門、不在本批 H1–H5 裡）。機械面沒有退步的依據：`ghost_hair`／`ghost_wisp` 兩個 `ghost_` 材質仍在 GLB materials 裡（`js/creature-figures.js` 的半透明分支照吃），最低點離地間隙與量產版相同（髮綹長度回到 ×1.05、全高 1.054 未變），三輪六位讀者裡有四位主動寫出「懸浮／沒有腿／飄浮」。
10. **wuying 的側視 W/H 0.34、hairpin 0.60**，兩隻都沒達 ART_BIBLE §1 香火 ≥0.9 的目標值（wuying 適用）。那是記錄項不是單隻閘門（凍結檔明文），本卷沒有動。

---

## ⑧ DEVLOG 一行

`harden3C: wuying H1 全綠(552.3KB/3054tri/三動畫/faceted 四項 rigid+6volume全開+minExp4.6+sa26/n=3 errors[])、H3 兩輪四位 **全部達標**（金瞳 2/2「狹長的黃色發光縫」「細長的黃色與黑色條紋切口」、白底 2/2「白色面具」「白/銀色鏡面質感臉部」、主印象 2/2 武人／士兵／儀仗兵／戰士，(d) 兩位分別猜廟會陣頭鎮守神將與儀仗武將）→ gaps 劃掉、記 5/5 | hairpin H1 全綠(815.2KB/5124tri)、H4 主印象幽靈 2/2 ✅＋髮簪 2/2 ✅（頭簪加寬扁葉狀簪頭＋紅珠 1.45×），**長臂 0/6 ✗、下半身讀成髮 0/6 ✗ → 3 輪用盡交最佳版（第 2 輪），標未達** | claims 兩隻都零改動；hairpin 出貨 GLB 與第 2 輪盲讀那一份 `cmp` 逐位元組相同 | 新引擎陷阱 8 條（conform 把 fin 法線轉 42°／mirrored fin around≥160 會合體／arcs 插值外溢一整格／bloom 在 lum>160 壓亮度無效要改加近黑對比件／臉上紅點＝小丑妝／share_hierarchy 的 view 決定手臂該往哪伸／暗高飽和綠一律被讀成植物且不能直接 desaturate 否則 saturation_area BLOCK／連續髮簾錐裙已否證），已寫進兩隻 spec 的 `_traps_3C` | unresolved: hairpin 下半身＝髮（建議比照 tiger_c 引擎限制簽字或轉後處理卷）、hairpin 長臂（建議把 front 加進 haunt 盲讀圖組＝改凍結條件，或把短臂做成真殘缺）、wuying 紙紮感 0/10、wuying tertiary 只剩 0.8pp 餘裕`
