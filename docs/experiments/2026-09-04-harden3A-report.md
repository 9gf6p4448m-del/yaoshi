# 硬化批 3A — `nail` 虎姑婆指甲＋`redhat` 魔神仔紅帽：規格提升＋補齊特徵缺項（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4 ＋末段全部修訂），本卷特別依 **19:10 修訂**（`build:"rigid"` 本身只是 `faceted` 的許可證；**nail 放寬「橘只在前臂」→ 臉也做虎臉**）與 **19:30 預算制**（每隻 GLB ≤1.5MB、三角形 ≤8,000、`ring_step` 可細一階）與 **18:40 裁定**（完成＝特徵 5/5）。
美術權威：`docs/design/ART_BIBLE.md` §0.5 真實參照鐵則、§3 陰氣、§5 材質→幾何。
缺項來源（單一事實來源）：`docs/experiments/2026-09-04-creature-gaps.md` 的 `nail`、`redhat` 兩列。
真實參照：`docs/experiments/2026-09-04-ref-nail.md`（本卷用 Read **親眼重看** `tools/anyCreature/out/ref/nail/a2.jpg` 王家珠《虎姑婆》封面、`b1.jpg` 真虎特寫；`a1.jpg` 只是戲台脈絡、沒重看）／`2026-09-04-ref-redhat.md`（**`out/ref/redhat/` 是空目錄**，該參照筆記自己就寫明沒有可公開授權的圖檔、五條特徵全部來自民俗文字——本隻的參照強度在源頭上就比 nail 弱一級，見 ⑦-5）。
基準：worktree `agent-ad02b1c91420eceaf`，起點 main `541196f`。**未 commit、未 push。**
出貨檔：`assets/creatures/{nail,redhat}.{json,glb}`；`*.claims.json` **兩隻都一個位元組都沒動**（機械核對見 ⑤）。
截圖：`docs/experiments/2026-09-04-harden3A-{nail,redhat}-{hero,stage-lit,front}.png`。

---

## ① 結論先行

- **`nail`：特徵 5/5（兩位讀者都列滿五條），「虎」2/2 讀出（目標達成，硬化批 1 是 1/2 且只讀到「貓科」）。** 第 1 輪就過，沒有再動。讀者 A 第一句就寫「**虎頭/虎面**……橘色虎紋臉」，讀者 B 第一句寫「橘**虎斑貓／老虎**頭生物」。既有項目沒掉：巨爪 2/2、威嚇感 2/2（A「陰森、詭譎」、B「陰森、詭譎……偏向會威嚇你」），兩位主印象都沒有「可愛」。
- **`redhat`：尖耳 2/2 讀出（目標達成，回修卷是 1/6），主印象「詭異／陰森」2/2 不退步；「不對稱」補到 1/2 且那一位講的是帽子不是手臂——未達，三輪用盡，如實標「未達」。** 出貨版＝第 3 輪。

| 項目 | nail | redhat |
|---|---|---|
| **H1** judge 全綠 | ✅ `all claims pass`（13 條，未動） | ✅ `all claims pass`（12 條，未動） |
| **H1** GLB（上限 1.5MB） | **610.9 KB**（625,564 B） | **567.7 KB**（581,276 B） |
| **H1** 三角形（上限 8,000；claims 自己的帶 1500–5000 未動） | **4,080** | **3,373** |
| **H1** 三支 clip | `idle`／`move`／`attack` ✅ | 同 ✅ |
| **H1** `build:"rigid"` | ✅ | ✅ |
| **H1** 所有主要 volume `faceted:true` | ✅ **8/8** | ✅ **7/7** |
| **H1** profile `exp ≥4.5` | ✅ 全檔唯一值 **4.8** | ✅ 只有 **4.8／5.0** 兩個值 |
| **H1** `smooth_angle` 24–30 | ✅ 全檔只有 **24／25／26** | ✅ 全檔只有 **26** |
| **H1** `ring_step` 細一階 | ✅ 8 條裡 **7 條 ×0.8**（`hood` 例外，見 ⑥-1） | ✅ 7 條裡 **5 條 ×0.8**（`hat`／`head` 例外，見 ⑥-1／⑥-2） |
| **H2** 盲讀 | 1 輪 ×2 位 | 3 輪 ×2 位＝6 位 |
| **H3／H4** 缺項 | 「虎」**2/2** ✅（目標）；額心虎紋 2/2 ✅ | 尖耳 **2/2** ✅（目標）；不對稱 **1/2 且指的是帽子** ❌ |
| **H5** claims | **未動**（`git diff` 空） | **未動**（`git diff` 空） |

---

## ② 盲讀原話（context-free `sonnet` 子 agent，`model: sonnet`，只給 hero＋stage-lit 兩張）

**遮名方式**：圖複製到 `<WT>/_qa/` 改名 `s1-imgA/B`、`s3-imgA/B`、`s4-imgA/B`（路徑與檔名不含 nail／redhat／虎／指甲／紅衣／hag 等字樣），prompt 明寫「不要開啟任何其他檔案、不要從檔名或路徑推論任何事、不要搜尋專案」。兩位讀者拿到的**圖序相反**（A/B 與 B/A），避免順序效應。讀完即刪（收尾已刪 `_qa/`）。

**固定四題（與 `2026-09-04-harden2A-report.md` §② 問法甲逐字相同，沒有加任何提示）**：

> 1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？
> 最後一行寫「主要印象：____」。

### `nail` — 第 1 輪（＝出貨版，兩位皆過，沒有再開第 2 輪）

**讀者 A**
> **1.** 一隻直立、擬人化的低多邊形（low-poly）3D生物模型——**虎頭/虎面**搭配長袍與利爪，像是遊戲裡的「妖」或「魔物」角色。
> **2.**「頭部：**橘色虎紋臉**，臉側有**黑色條紋**切面，臉型呈尖銳多邊形。」「頭頂：戴著深黑色**連帽兜帽**，帽緣有兩片橘色圓形裝飾（像扣環或**耳飾**），左右各一。」「臉部有**白色細長鬍鬚**，從嘴部兩側向外延伸（左圖朝左前方，共約4–5根）。」「嘴部/口鼻為**白色**，帶尖牙」「右臂（畫面中伸出的那隻）為**橘黑相間虎紋**，前臂有一圈圈黑色環狀骨刺/關節裝飾。」「手掌末端是**五根巨大的白色/象牙色尖爪**，長度幾乎與前臂等長」「腳部露出兩隻黑色尖狀腳掌」
> **3.**「**陰森、詭譎**、帶宗教/巫祝感……虎面獠牙又帶野獸凶猛感，整體是『**妖異神將/山魈**』那種古老陰氣的氛圍，不走可愛路線。」
> **4.**「偏**威嚇**——巨爪、獠牙、鬍鬚、深色兜帽與（B圖）發光咆哮特效都在強化攻擊性與壓迫感，低多邊形的簡潔造型**沒有削弱**這種凶悍感」
> **主要印象：一隻披黑袍、亮爪咆哮的虎面妖將，陰氣逼人而非可愛玩具。**

**讀者 B**
> **1.** 一隻擬人化、直立行走的**橘虎斑貓／老虎頭**生物，身穿類似僧袍或斗篷的深色連帽長袍，其中一隻手（前肢）已變異成巨大的白色利爪／獠牙狀肢體。
> **2.**「頭部：**橘色虎斑貓臉，臉頰兩側有黑色條紋狀花紋**」「頭頂／**耳朵**：戴著深色兜帽，兜帽邊緣露出**兩顆長橢圓形橘色耳朵**，耳內有淺綠色細長裝飾物」「嘴部兩側：**長長的白色鬍鬚（貓鬚）**，左右對稱向前伸出」「右側前肢：整條手臂呈**橘黑相間條紋**，前段有一節節黑色尖刺／甲殼狀結構」「手掌部分：變形成**五根巨大的白／米色尖爪**，形狀誇張如刀刃或骨爪」「身體／軀幹：穿著深綠至近黑色的**連帽長袍**」
> **3.**「**陰森、詭譎**、帶有東方妖怪/鬼怪傳說的氛圍……虎斑貓臉又保留幾分**野性獸態的莊嚴感**。」
> **4.**「偏向會**威嚇**你——巨大猙獰的白爪、暗色長袍與陰冷背景色調營造出壓迫感和不安感，不是可愛討喜的類型」
> **主要印象：陰森詭異、爪子誇張猙獰的妖怪貓武者。**

**逐條對照 `ref-nail.md` 五條特徵**

| ref 特徵 | 讀者 A | 讀者 B |
|---|---|---|
| ① 厚重深色兜帽罩頭並垂落駝背 | ✅「深黑色連帽兜帽」＋「寬大的黑色連身長袍」 | ✅「深色連帽長袍……衣褶呈硬直多邊形折面」 |
| ② 布開口裡是**虎臉**（白吻＋額心黑紋＋瞇眼＋獠牙） | ✅「**橘色虎紋臉**，臉側有黑色條紋切面」「口鼻為**白色**，帶尖牙」 | ✅「**橘色虎斑貓臉，臉頰兩側有黑色條紋狀花紋**」 |
| ③ 長白鬚往兩側前方張開 | ✅「白色細長鬍鬚，從嘴部兩側向外延伸」 | ✅「長長的白色鬍鬚（貓鬚），左右對稱向前伸出」 |
| ④ 毛茸的虎前肢從布下探出 | ✅「橘黑相間**虎紋**」（但把黑帶讀成「環狀骨刺/關節裝飾」） | ⚠️「橘黑相間條紋」（把黑帶讀成「**甲殼狀結構**」）——**紋讀到了、毛沒讀到** |
| ⑤ 象牙白彎鉤指甲、誇張到超過前臂 | ✅「五根巨大的白色/象牙色尖爪，長度幾乎與前臂等長」 | ✅「五根巨大的白／米色尖爪，形狀誇張如刀刃或骨爪」 |
| **命中** | **5/5** | **5/5**（④ 從嚴記為「紋到、毛未到」，見 ⑦-1） |

### `redhat` — 三輪六位

**第 1 輪（r1：耳由 curve 小角改 fin 大板＋`ear_inner` 暗窩、長臂前下探、短臂縮短）**

- **讀者 C**：「**兩側有一對大且尖的耳朵**，米白／淺灰色，外側邊緣朝外翻，形似貓耳或蝠耳，從頭部左右伸出。」「臉部中央有一道黑色橫向眼罩……其中露出一點**紅色**」「腰部以下是一塊倒錐形、下緣呈鋸齒狀往下滴落的深綠色物體」「雙手手掌處各有幾根細長米白色的爪狀突起，**一手在腰際、一手向前平舉**」；氣質「**陰森、詭異**，帶點哥德妖異感」；(4)「偏向會讓人警戒的類型……不是可愛玩具的路線」。**主要印象：陰森詭譎的妖異使魔，帶有威嚇感而非可愛感。**
- **讀者 D**：「頭部左右兩側有**一對外露的大耳朵**，呈淺灰／米白色，**尖端朝上**，形狀類似動物耳或精靈耳。」「黑色橫向遮罩，遮罩上鑲有一顆**亮紅色**的圓形眼睛（發光感）」「整體**無下半身／無腳**，身形下半部呈虛化、飄浮或液化狀」；氣質「**陰森、詭異**、帶有邪祟或妖異氣息」；(4)「偏向會讓人感到威嚇、不安，而非可愛玩具感」。**主要印象：一尊帶紅色獨眼與尖角頭飾、下半身如融化滴落的低多邊形妖異幽靈角色，氣質陰森詭譎、偏向威嚇而非可愛。**
- 判讀：**尖耳 2/2（缺項首度兩位都讀出）**、主印象 2/2 詭異／陰森。**不對稱：C 只寫「一手在腰際、一手向前平舉」（位置不同，沒說長度不同），D 完全沒提 → 0/2。**

**第 2 輪（r2：長臂改成前**上**探＝抓的姿勢，短臂再瘦一階、爪縮短 0.6×，長臂爪加長 1.35×）**

- **讀者 E**：「耳朵：頭部兩側各有一隻**大而尖的招風耳**，淡土黃色，形狀誇張。」「下半身：軀幹下方沒有正常的腿部……垂下多條細長的深綠色滴狀物」「**右手（觀者視角左側）向前伸出**，手指細長如爪」；氣質「陰森、詭譎又帶點滑稽的邪氣……介於可愛畸形與陰暗詭異之間」；(4)「兩者參半但更偏向前者：**低多邊形的圓潤造型、誇張大耳朵和滴落尾巴讓它看起來像個玩具公仔**……稱不上會嚇到人。」**主要印象：低多邊形風格的詭趣小妖怪公仔，陰森中帶點玩具感，不具威嚇力。**
- **讀者 F**：「帽緣下露出**一對米白／淺卡其色的尖長耳朵**，左右對稱地從帽子兩側伸出」「**左手臂彎曲抬起**，手掌呈淺褐色勺狀/爪狀，手指以幾根細長的米白色尖刺表示」「**右手臂垂放在身側**，同樣是深綠色材質」；氣質「**陰森、詭譎**、帶有邪氣的妖怪／鬼怪氣質」；(4)「偏向會帶來威嚇感／不安感」。**主要印象：陰森詭譎、帶獠牙紅眼的低多邊形妖怪半身像，懸浮滴落，氣質不祥而非可愛。**
- 判讀：尖耳 2/2 ✅，但 **E 的主印象頭詞落在「公仔」、第 4 題答「不具威嚇力」＝主印象退步**，不對稱仍然 0/2。**r2 判為比 r1 差，姿勢退回 r1。**

**第 3 輪（r3＝出貨版：手臂姿勢退回 r1，只保留 r2 的殘肢化＝短臂 profile ×0.74、短臂爪 ×0.6、長臂爪 ×1.35）**

- **讀者 G**：「頭部兩側有**一對尖長的耳朵**，米白／淺灰色，向外側伸出。」「臉部中央覆蓋一塊深色（近黑）眼罩／面具，上面鑲有**紅色發光眼睛**」「軀幹下緣連接一個尖底、逐漸收窄的下擺……末端垂下數條深綠色細絲/滴狀物，呈滴落感」「雙臂細長，手掌處有多根尖細的爪狀手指（像枯枝或蜘蛛腳），**一手在胸前呈持物或比劃姿勢**」；氣質「**陰森、詭譎、帶邪氣的妖怪／鬼怪感**」；(4)「偏向會威嚇人」。**主要印象：一隻懸浮著、面戴發光紅眼面具、尖耳尖牙的陰森妖怪，透著詭異的威嚇感。**
- **讀者 H**：「頭部戴著一頂紅色尖頂帽/兜帽，帽尖朝右上方彎折，**呈不對稱的多角形折面**」「頭部兩側有**一對長而尖、向外突出的耳朵**，顏色偏米白／灰白，材質與帽子和身體不同」「**一隻手掌心托著一顆深色橢圓形物體**」「腰部以下漸窄成尖錐狀，末端有多條深綠色垂墜物往下滴落」「整體使用平面色塊＋硬邊多邊形（**faceted**）建模手法」；氣質「**陰森、詭譎、帶有邪祟/妖異感**」；(4)「偏向會讓人不安/有威嚇感的類型……雖然低多邊形風格本身較卡通化、削弱了一些恐怖感，但整體設計走向仍是『小怪物/邪靈』」。**主要印象：陰森詭異的低多邊形妖怪/邪靈角色，紅黑配色搭配獠牙與滴垂軀體，帶威嚇感而非可愛感。**
- 判讀：尖耳 2/2 ✅、主印象 2/2 ✅。**不對稱：H 確實寫了「不對稱」三個字，但講的是帽子的折面，不是手臂長度；六位讀者裡沒有一位說出「一長一短／一邊殘缺」。記為未達（見 ⑦-2）。**

**風格牆指標**（凍結檔 17:30 修訂：正文順帶提到「低多邊形＝可愛／卡通」只記錄不否決）：`nail` 兩位裡 **0 位**（A 反而主動寫「低多邊形的簡潔造型沒有削弱凶悍感」）；`redhat` 六位裡 **3 位**（E 主印象落在「公仔」、F 未提、H 順帶提「較卡通化」、C/D/G 未提）。

---

## ③ 指令原文與實際輸出

`<AC>` ＝ `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`（`.gitignore` 內，worktree 沒有這個目錄，用 `New-Item -ItemType Junction` 借主樹，全程沒進過 diff，收尾已移除）；`<WT>` ＝ 本 worktree 根目錄。

### 編譯（出貨版）

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/nail.json <WT>/assets/creatures/nail.glb
{"ok":true,"bytes":625564,"verts":8756,"faces":2462,"joints":27,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.552}}

$ node <AC>/engine/cli.js <WT>/assets/creatures/redhat.json <WT>/assets/creatures/redhat.glb
{"ok":true,"bytes":581276,"verts":8170,"faces":1886,"joints":27,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.374}}
```
**零 `BLOCK`。** 兩隻都還有 `part_overlap` 的 warn（見 ⑦-4）。

### 出貨 GLB 本身（直接讀 GLB 的 JSON chunk）

```
$ python _h3a_glbinfo_tmp.py     # 一次性腳本，量完已刪
{"file":"assets/creatures/nail.glb","bytes":625564,"kb":610.9,
 "animations":["idle","move","attack"],"skins":1,"joints":27,"meshes":1,"primitives":17,
 "materials":["cloth_cape","cloth_robe","cloth_hood","fur_face","muzzle","fur_arm","fur_paw",
              "nail","eye","stripe","mouth_glow","fang","whisker","hair","hood_trim","ear","ear_in"],
 "images":0,"textures":0,"hasCOLOR_0":true,"generator":"anyCreature v1.2.0"}
{"file":"assets/creatures/redhat.glb","bytes":581276,"kb":567.7,
 "animations":["idle","move","attack"],"skins":1,"joints":27,"meshes":1,"primitives":17,
 "materials":["robe","ghost_skirt","skin_head","skin_jaw","hat","sleeve","eye","stripe","pelt",
              "mouth_glow","fang","scale","hand","claw","ghost_wisp","ear","ear_inner"],
 "images":0,"textures":0,"hasCOLOR_0":true,"generator":"anyCreature v1.2.0"}
```
**M-A3**：`eye`／`mouth_glow` 兩隻都在 materials 清單裡 ✅。**M-A2（redhat＝haunt）**：`ghost_skirt`／`ghost_wisp` 都在，六位讀者 6/6 主動描述「無腿／懸浮／滴落的下半身」（原話見 ②）。**M-A2（nail＝elite）**：不適用。

### judge（對**未修改**的 claims）

```
$ node <AC>/harness/judge.mjs <WT>/assets/creatures/nail.glb out/h3a/judge_ship_nail nail \
      --spec <WT>/assets/creatures/nail.claims.json
stats  {"triangles":4080,"skinnedMeshes":17,"animations":["idle","move","attack"]}
lum    {"front":26,"side":21,"tq":21,"reartq":10,"top":68.7}
hi_sat {"front":0.1408,"side":0.1176,"tq":0.1341,"reartq":0.0663,"top":0.2376}
  nail       side 0.11864 span 0.7537    fur_face side 0.04332   muzzle side 0.01337
  cloth_robe side 0.35620              cloth_cape side 0.20116  cloth_hood side 0.11115
  ear side 0.01745  ear_in side 0.00349  stripe side 0.04456  whisker side 0.00720
[judge] Spec "虎姑婆指甲 nail_hugupo_zhijia (yinqi/elite)" — all claims pass.

$ node <AC>/harness/judge.mjs <WT>/assets/creatures/redhat.glb out/h3a/judge_final_redhat redhat \
      --spec <WT>/assets/creatures/redhat.claims.json
stats  {"triangles":3373,"skinnedMeshes":17,"animations":["idle","move","attack"]}
hi_sat {"front":0.2525,"side":0.1296,"tq":0.2116,"reartq":0.2098,"top":0.3975}
  hat side 0.11748 span 0.4015          skin_head side 0.02855
  ghost_skirt side 0.26055  ghost_wisp side 0.04259  robe side 0.30703
  ear front 0.04090 side 0.01398   ear_inner front 0.03703
[judge] Spec "魔神仔紅帽 moshenzai_redhat (yinqi/haunt)" — all claims pass.
```

逐條核對（只列有門檻的）：
- **nail**：`part_exists` `nail`／`eye`／`mouth_glow`／`hood_trim` ✅／`part_signature nail`(side) share **11.86% ≥6%** ✅ 且 span **0.7537 ≥0.12** ✅（兩路都過）／`part_visible fur_face`(side) **4.33% ≥4%** ✅／`focal_contrast nail:fur_face`(side) **11.864÷4.332＝2.74× ≥2** ✅／`share_hierarchy`(side) 布身 55.7 : 兜帽+巨爪 22.98 : 臉+吻 5.67 ✅／`style_dark`(side) **21 ≤90** ✅／`saturation_area`(tq) **13.41% ∈[10%,60%]** ✅／`tri_budget` **4,080 ∈[1500,5000]** ✅／`rig_skinned`＋`anim_named` ✅。
- **redhat**：`part_exists` `hat`／`eye`／`mouth_glow`／`ghost_skirt`／`ghost_wisp` ✅／`part_signature hat`(side) share **11.75% ≥6%** ✅ 且 span **0.4015 ≥0.12** ✅／`focal_contrast hat:skin_head` **11.748÷2.855＝4.11× ≥2** ✅／`share_hierarchy` 霧裾群 : 帽 : 臉 ✅／`saturation_area`(tq) **21.16% ∈[10%,70%]** ✅／`tri_budget` **3,373 ∈[1500,5000]** ✅／`rig_skinned`＋`anim_named` ✅。

### silmetrics（出貨檔）

```
$ node <AC>/harness/silmetrics.mjs <WT>/assets/creatures/nail.glb out/h3a/sil_nail
{"W_over_H":0.77,"fill":0.393,"mass_thirds":[0.093,0.277,0.629],"torso_depth_max":0.9,
 "mass_contrast":14.52,"leg_fraction":0.098,"turn_count":18,"zigzag_alignment":1,
 "front":{"W_over_H":0.59,"fill":0.517},"top":{"W_over_H":0.66},"hero":{"W_over_H":0.82,"fill":0.438}}

$ node <AC>/harness/silmetrics.mjs <WT>/assets/creatures/redhat.glb out/h3a/sil_redhat_f
{"W_over_H":0.55,"fill":0.265,"mass_thirds":[0.043,0.23,0.727],"torso_depth_max":0.55,
 "mass_contrast":16,"leg_fraction":null,"turn_count":17,"zigzag_alignment":0.83,
 "front":{"W_over_H":0.39,"fill":0.357},"top":{"W_over_H":0.74},"hero":{"W_over_H":0.34,"fill":0.517}}
```
（`nail` 的 `leg_fraction 0.098` 與 `redhat` 的 `null` 都不是任何一條 claim：nail 沒有腿、量到的是及地的袍；redhat 是 haunt 無腿，`null` 正是 M-A2 要的下半身虛化的機械痕跡。）

### 截圖

```
$ node <AC>/harness/hero.mjs <WT>/assets/creatures/nail.glb   out/h3a/hero_n_s1     → {"ok":true,"margin":8.6}
$ node <AC>/harness/hero.mjs <WT>/assets/creatures/redhat.glb out/h3a/hero_final_r  → {"ok":true,"margin":8.6}

$ node tests/tools/creature-shoot.mjs <AC>/out/h3a/stage_n_s1.png \
      "glb=nail.glb&light=1&fx=1&rim=yinqi" idle 8825
{"out":"...stage_n_s1.png","query":"glb=nail.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88023952095874,"calls":24,"loadMs":190,"particles":44,"errors":[]}

$ node tests/tools/creature-shoot.mjs <AC>/out/h3a/stage_r_s3.png \
      "glb=redhat.glb&light=1&fx=1&rim=yinqi" idle 8825
{"out":"...stage_r_s3.png","query":"glb=redhat.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88023952095874,"calls":24,"loadMs":193,"particles":44,"errors":[]}
```
- 兩次 `errors` 都是空陣列（`console.error` 與 `pageerror` 兩種來源都收）。
- stage-lit 是 `creature-shoot.mjs` 原始輸出 1688×780 的**純裁切**（nail 540×540＝(460,40)–(1000,580)；redhat 330×520＝(680,25)–(1010,545)），**沒有縮放、沒有調色**。
- `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。
- `-front.png` ＝ judge 自己輸出的 `*_beauty_front.png`（同一次 judge run），不是另外打的光。

---

## ④ 改了哪些檔（`檔案:行號`）

```
$ git add -N . && git diff --stat && git reset
 assets/creatures/nail.glb                            | Bin 310804 -> 625564 bytes
 assets/creatures/nail.json                           | 4824 ++++++++++++++++++--
 assets/creatures/redhat.glb                          | Bin 298700 -> 581276 bytes
 assets/creatures/redhat.json                         | 3350 ++++++++++++--
 docs/experiments/2026-09-04-creature-gaps.md         |    4 +-
 docs/experiments/2026-09-04-harden3A-nail-front.png     | Bin 0 -> 44515 bytes
 docs/experiments/2026-09-04-harden3A-nail-hero.png      | Bin 0 -> 250507 bytes
 docs/experiments/2026-09-04-harden3A-nail-stage-lit.png | Bin 0 -> 95565 bytes
 docs/experiments/2026-09-04-harden3A-redhat-front.png     | Bin 0 -> 34156 bytes
 docs/experiments/2026-09-04-harden3A-redhat-hero.png      | Bin 0 -> 186243 bytes
 docs/experiments/2026-09-04-harden3A-redhat-stage-lit.png | Bin 0 -> 48260 bytes
 docs/experiments/2026-09-04-harden3A-report.md       |  316 ++
 12 files changed, 7759 insertions(+), 735 deletions(-)

$ git diff -- "assets/creatures/*.claims.json" | wc -l
0
```
`creature-gaps.md` 只動了 `nail`／`redhat` **自己那兩列**（`4 +-` ＝ 兩行改兩行）。
兩份 JSON 被腳本重新序列化，git 會提示 `LF will be replaced by CRLF`——這是換行風格的正規化，不是內容差異（沿用 harden2A 的同一情況）。

### `assets/creatures/nail.json`（435 → 4,468 行）

> 兩隻的 JSON 都是用腳本改寫後 `JSON.stringify(spec, null, 1)` 重新序列化的，**行數與 `git diff` 都是整檔級的**（縮排格式變了），內容逐鍵可比。下表列的是實際改到的鍵。

| 區段 | 內容 |
|---|---|
| `:11` `palette` | **`fur_face` `#553a16` → `#ad561a`**（深棕→虎橘，與 `fur_arm #a8551c` 同族＝臉與臂是同一隻動物；這是 19:10 修訂放寬「橘只在前臂」的落地）／**`muzzle` `#7d7466` → `#e6e1d5`**（灰褐→白吻）／**`whisker` `#9a9384` → `#efeade`**（灰→白鬚）／`stripe` `#121212` → `#101010`／**新增 `ear` `#b25a1c`、`ear_in` `#efe9dc`** |
| `joints.Brow` | `fwd` 0.116 → **0.138**、`up` 0.048 → **0.054**（把虎臉多推出兜帽開口，沿用 nail 報告 ⑥-3「推出來比放大有效」） |
| `volumes`（8 個） | 全部加 **`faceted:true`**；`head` profile 半徑 **×1.06**；`ring_step` 7 條 ×0.8（`hood` 維持 0.032，見 ⑥-1）；`head`／`jaw` 的 `colors.arcs` 提亮成白頰／白吻（`#6e6759`→`#ddd6c4`、`#8f8878`→`#f4f1e9`） |
| `parts` 既有 6 片臉部 `stripe` fin | **u（寬）×1.5、v（高）×0.78、thickness → 0.019**——加寬不加厚，理由見 ⑥-7 |
| `parts` 新增 | 兩頰橫紋 3 組（`mirrored`＝6 片）＋顱頂「王」字橫畫 2 片＋**虎耳 2 組**（`ear` 橘外殼＋`ear_in` 白斑，掛在**兜帽**上，見 ⑥-4）＋第三對長白鬚 |
| `parts` 白鬚 | 既有兩對 `segments.len` **×1.5** |
| `parts` 前臂黑紋 | 舊版「4 道 × 3 片小點」→ **「4 道 × 6 片環帶」**（`around` 70/110/150/190/230/270），讓黑帶真的繞一圈 |

### `assets/creatures/redhat.json`（379 → 3,052 行，同樣是重新序列化）

| 區段 | 內容 |
|---|---|
| `:15` `palette` | **`ear` `#443f36` → `#8f8878`**（舊色幾乎等於頭色 `#4b463d`，等於沒有明度對比）／**新增 `ear_inner` `#241f1a`**（暗窩） |
| `parts` 耳 | **舊版 `curve@Skull`（長 0.094、r 0.024→0.008）整組刪掉**，改成一對 **`fin` 大板**（`ear` 外框＋`ear_inner` 內襯，`conform:false`，`anchor head t0.50 around196`，**`udir`／`vdir` 都放在 XY 平面 → 法線 = +Z 正面**，見 ⑥-6） |
| `joints` LArm/RArm | 長臂前下探並加長（**0.347 → 0.437**）、短臂縮到 **0.205 → 0.136**，**比 1.69× → 3.21×** |
| `volumes.RArm` | profile 半徑 **×0.74**（短臂再瘦一階＝殘肢） |
| `parts` 爪 | `RHand` 的 2 根爪 `len ×0.6`、`RHand` 的 `paw` size ×0.76；`LHand` 的 3 根爪 `len ×1.35`（細長指爪全部集中在伸出去的那一側） |
| `volumes`（7 個） | 全部加 **`faceted:true`**；`ring_step` 5 條 ×0.8（`hat`／`head` 維持原值，見 ⑥-1／⑥-2） |

**H5 ✅**：`index.html`、`js/*`、`tests/tools/*`、其他生物的 `assets/creatures/*`、`docs/design/ART_BIBLE.md`、凍結檔、`docs/experiments/` 的其他既有檔案**一個位元組都沒動**；`nail.claims.json`／`redhat.claims.json` 也**一個位元組都沒動**。臨時檔（`_h3a_*_tmp.mjs`／`_h3a_*_base.json`／`_h3a_glbinfo_tmp.py`／`_h3a_cmp_tmp.py`／`_h3a_keep/`／`_qa/`）與 `tools` junction 收尾已全部移除。**未 commit、未 push。**

---

## ⑤ 驗收條件沒有被移動（`02 §2.1`）＋證據的鑑別力（`02 §6.1`）

**claims 零改動，機械核對**：

```
$ git diff --stat -- assets/creatures/nail.claims.json assets/creatures/redhat.claims.json
（空）
$ git diff -- assets/creatures/nail.claims.json assets/creatures/redhat.claims.json
（空）
```
凍結檔 19:10／19:30 兩條修訂本來授權我把 `nail` 的 `saturation_area` 放寬到 10–70%、把兩隻的 `tri_budget` 上限拉到 8000——**兩條我都沒有用**：實測 `nail` 的 `hi_sat_share.tq` 是 **13.41%**（原帶 10–60% 內），`tri_budget` 是 4,080／3,373（原帶 1500–5000 內），沒有需要放寬的理由。**這一卷的所有綠燈都是對「動手前就存在、一格未改」的門檻量出來的。**

**改動是真的在動、不是在改判準——把同一支 judge 跑在硬化批 1 的版本（本卷起手的 `_h3a_*_base.json` 重編）上的對照**：

| 量測（同一支 `judge.mjs`、同一份 claims） | nail 硬化批 1 | nail 出貨版 | redhat 回修版 | redhat 出貨版 |
|---|---|---|---|---|
| `stripe`（黑虎紋）front share | 2.44% | **4.15%**（×1.70） | — | — |
| `stripe` side share | 2.07% | **4.46%**（×2.15） | — | — |
| `whisker`（白鬚）front share | 1.08% | **2.45%**（×2.27） | — | — |
| `fur_face` front share | 7.57% | **8.15%** | — | — |
| `fur_face` **顏色** | `#553a16` 深棕 | **`#ad561a` 虎橘** | — | — |
| `muzzle` **顏色** | `#7d7466` 灰褐 | **`#e6e1d5` 白吻** | — | — |
| 新材質 | — | **`ear` 1.88% front／`ear_in` 0.35% front** | — | — |
| `ear` front share | — | — | **1.29%** | **4.09%（×3.17）** |
| `ear` side share | — | — | 0.93% | **1.40%** |
| 新材質 `ear_inner` front share | — | — | 不存在 | **3.70%** |
| 兩臂長度比 | — | — | 0.347 : 0.205 ＝ **1.69×** | 0.437 : 0.136 ＝ **3.21×** |
| 三角形 | 3,072 | 4,080 | 3,043 | 3,373 |
| judge | all pass | all pass | all pass | all pass |

**這組數字的鑑別力**（§6.1 第 1 條的雙向）：`ear`／`ear_in`／`ear_inner` 三條是**新材質**，在硬化前的 GLB 上量出來就是「材質不存在」——那是改名／新增，**不是行為斷言**，我不拿它當戰功。真正的行為證據有三組：① `redhat` 的 `ear` **同名材質**（回修版就叫 `ear`）front share **1.29% → 4.09%**，同一支 judge、同一個視角，這一條在舊版上量出來的就是紅（1.29% 遠低於「讀得到」的量級，而回修卷六位確實只有 1 位讀出）；② `nail` 的 `stripe`／`whisker` 也都是**同名既有材質**，share 各翻 1.7–2.3 倍；③ 盲讀本身——同一組四題、同樣兩張圖的規格，硬化批 1 的 `nail` 是「貓科 1/2」、回修卷的 `redhat` 是「尖耳 1/6」，本卷是「虎 2/2」「尖耳 2/2」。
**反向也要成立**：`nail` 第 1 次試作把臉部黑紋的 v（高）放大 1.35 倍，`fur_face` 側視 share 立刻從 4.45% 掉到 **2.71%**，`part_visible` 這一條**變紅**（原文見 ⑥-7）——同一條 claim 在「做壞」的方向上真的會紅，不是恆綠。

**單一項未達的地方我沒有改門檻去救**：`redhat` 的「不對稱」六位都沒讀出手臂長度差，我沒有把它改寫成「只要讀到帽子歪就算」——H4 那一條照原文判為未達（⑦-2）。

---

## ⑥ 這一批踩到、下一隻會再遇到的引擎事實

1. **★★ `ring_step` 變細不是免費的：折角處的環會擠在一起，直接 `mesh_integrity`／`anim_integrity` BLOCK。**
   `nail` 的 `hood` 鏈（`HoodRoot→Hood1→Hood2→HoodTop`，`side 0.03` 的折角）`ring_step` 0.032 → 0.026 之後，一次噴 **16 個 BLOCK**：
   ```
   BLOCK: mesh_integrity: bind pose has 1 flipped tris — geometry folds into itself
   BLOCK: anim_integrity: "idle" @0.0 folds mesh — 1 flipped tris, worst in "hood" (1).
     … raise "ring_step" on that volume so rings are not crowded through the bend …
   ```
   引擎的建議訊息自己就寫了 `raise "ring_step"`。**做法：規格提升時逐鏈判斷，帶折角的鏈維持原 `ring_step`**（本卷 `nail.hood`、`redhat.hat` 都這樣處理）。
2. **★ `ring_step` 一改，掛在它上面的**子鏈根環**會連帶失效——`root_containment` 是動態算的，不只是密度問題。**
   `redhat` 的 `head` 鏈 0.013 → 0.010 之後：`BLOCK: root_containment: chain "jaw" root ring is 25% outside its host "head"`。`jaw` 的根環半徑（0.058）與 `head` 在那個高度的半徑（≈0.06）本來就只差一點，環一密、取樣點一換就露出來。**本卷選擇維持 `head` 的 `ring_step`**（`faceted` 的硬邊效果與 `ring_step` 無關，代價只是環少一點）；要細化就得同時照 redhat ⑤-3 的順序重埋 `jaw` 根。
3. **★ `faceted:true` 的成本再確認：頂點翻倍、三角形不變。** `nail` 3,751 → 8,756 verts（faces 1,820 → 2,462 是 `ring_step` 細化貢獻的，不是 faceted）；`redhat` 3,549 → 8,170 verts。GLB 從 303.5KB／291.7KB 漲到 610.9KB／567.7KB（**約 ×2**）——19:30 的 1.5MB 預算下綽綽有餘，但 400KB 的舊上限**絕對塞不下**，硬化批 1 ② 那個「甲／乙／丙」裁定至此在預算面自動解掉。
4. **★ 掛在「被布包住的頭」上的耳朵一定被吞掉，要改掛布本身。**
   `nail` 試了兩個位置：`head` 鏈 `t0.22/around148` 與 `t0.34/around156`，`ear_in` 的 **five-view share 全部是 0**（judge 逐視角量）。原因是整顆頭在兜帽裡（`hood` 最寬 r 0.168 > `head` 最寬 r 0.146）。**改成掛 `Hood1`（獸耳把布頂起來）之後 `ear` 立刻量到 front 1.88%／side 1.75%**，讀者 B 直接寫「兜帽邊緣露出兩顆長橢圓形橘色耳朵」。
5. **★ `hood` 鏈（`frame:"up"`）的 `around` 世界框架實測：0=背 / 90=+X / 180=正面 / 270=−X。**
   這是第**四**種互不相同的框架（另三種：`nail` 的水平頭鏈 0=下、180=顱頂；`sword` 直立鏈 0=−x/90=−z/180=+x/270=+z；`redhat` 直立頭鏈 dir(θ)=(−cosθ,0,−sinθ)）。**唯一可靠的做法仍然是「先塞 8 片探針 fin（around 0/45/…/315）編一次、讀 `info: fin … faces … (world normal …)` 那行」**，30 秒有答案，不要從任何一份報告的角度表推。本卷就是這樣量的。
6. **★ 薄板要被讀成「器官」而不是「刀刃」，`udir` 與 `vdir` 必須都落在同一個平面上，讓法線正對辨識視角。**
   `redhat` 的耳朵改板之後連試三版：`vdir` 帶 z 分量時法線 =(0.68,−0.67,0.28)＝朝外下，hero 的 3/4 俯角看到的是板子的**邊**，讀者寫「黑色橫向眼罩／護目條」「刀刃」；把 `udir=[0.72,0.69,0]`、`vdir=[-0.69,0.72,0]` **兩個都放進 XY 平面**（法線 =(0,0,1) 正面）之後，**兩輪四位讀者全部寫出「一對尖長的耳朵」**。這條是 flag ⑥-4 的直接複驗，但多一句可操作的算法：**要法線朝 +Z，就把 udir/vdir 的 z 都設成 0。**
7. **★ 同一個 anchor、同一組 `udir/vdir` 的兩片 `fin` 是**共面**的，內襯要露出來只能靠**厚度**。**
   `nail` 的虎耳白斑 `ear_in` 第一版厚 0.018、外殼 `ear` 厚 0.02 → **`ear_in` 五視角 share 全 0**（被外殼整個包住）；改成 `ear_in` 0.024 > 外殼 0.02 才露出來（front 0.35%）。**兩層明度對比的內襯，厚度必須大於外殼，不是小於。**
8. **★ 臉上的條紋「加寬」不吃底色，「加厚」會。**
   `nail` 第一版把既有 6 片臉紋的 u 和 v 一起放大（u×1.55、v×1.35），`fur_face` 側視 share 從 4.45% 掉到 **2.71%**，`part_visible fur_face ≥4%` 直接紅；改成 **u×1.5、v×0.78**（細長黑帶壓在大片橘底上，正是真虎的紋路比例）之後回到 4.33% 並保住 `focal_contrast` 2.74×。**虎紋要的是「長」不是「粗」。**
9. **`parts` 裡的 `fin` 用 `anchor`＋`conform:true` 時，板子兩端會浮起 `u²/(2r)`。** 沿用硬化批 1 ⑥-5：`nail` 前臂半徑約 0.04，把黑帶做成「繞一圈」不能靠一片寬板（半寬 0.045 會浮起 0.025），只能**拆成 6 片 × 半寬 0.034**（浮起 0.014，被 0.013 的厚度蓋掉大半）。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **`nail` 的 ref 特徵④「毛茸的虎前肢」——紋讀到了、毛沒讀到。** 讀者 A 寫「橘黑相間**虎紋**」（虎紋成立）但把黑帶讀成「一圈圈黑色**環狀骨刺/關節裝飾**」；讀者 B 寫「橘黑相間條紋，前段有一節節黑色尖刺／**甲殼狀結構**」。這與硬化批 1 ⑦-2／⑦-4、nail 報告 ⑦-4 是**同一條**：低多邊形沒有「毛」的表現手段，`fin` 是硬邊薄板、邊緣是直線，天生像板甲。本卷把黑帶從「3 片小點」改成「6 片環帶」讓它更連續，**沒有改掉「像戴著護具」的讀法**。我把命中記為 5/5（特徵②的「虎」是缺項本體，已兩位讀出；④ 的載體「橘黑虎紋前肢」兩位也都描述到），但**「毛」這個子項照實記為引擎限制**，處置與 tiger_c 的白毛邊、wuying 的紙紮感同級：留給後處理卷（描邊／法線貼花）。
2. **★ `redhat` 的「不對稱」三輪六位都沒有讀出來，H4 那一條**未達**。** 機械面已經拉開一倍（兩臂長度比 1.69× → **3.21×**，短臂 profile 再瘦 0.74×、短臂爪縮到 0.6×、長臂爪加長 1.35×），六位讀者的描述停在「一手在腰際、一手向前平舉」（C）、「左手臂彎曲抬起／右手臂垂放在身側」（F）、「一隻手掌心托著一顆深色橢圓形物體」（H）——**他們看得到兩隻手在做不同的事，但沒有一位說出「一長一短／一邊殘缺」**。唯一寫出「不對稱」三個字的是 H，講的是**帽子**的折面。
   **我的歸因**：hero 是 3/4 俯角，短臂整條在軀幹後方被擋掉大半（judge 量到 `sleeve` 的 reartq share 從回修版的 **3.55%** 掉到出貨版的 **0.47%**，就是短臂縮進體側的機械痕跡）；stage-lit 更是接近側視，短臂完全在身後。**要讓「一長一短」被讀出來，動的是機位不是造型**——具體兩條路請主對話裁定：(甲) 盲讀規格加一張正視（`-front.png` 本卷已經產出，正視裡兩臂長度差一眼可見，但凍結檔寫的是「hero＋stage-lit 兩張」，加圖等於改驗收條件的取樣，我不能自己動）；(乙) 把短臂改成「往前橫過胸口」讓它進到 3/4 的可見區，代價是它會擋住 `scale` 圓鱗板、且 r2 已經證明**動手臂姿勢會連帶動到主印象**（見下一條）。本卷兩條都沒做。
3. **★ 盲讀訊號在 `redhat` 上是**不穩的**，這一點我沒有做到 `02 §6.2` 要求的「連跑 5 次歸因」。** 第 2 輪只把長臂從「前下探」改成「前上探」，讀者 E 的主印象就從（第 1 輪兩位的）「威嚇」滑成「詭趣小妖怪**公仔**……不具威嚇力」，而同一版的讀者 F 卻寫「氣質不祥而非可愛」。**兩位讀者的樣本量分不出「姿勢真的變差」與「讀者個體差異」**，我選了保守處置（姿勢退回第 1 輪，只保留殘肢化），但**這個歸因沒有證據，只是保守**。要真的判定，得對同一版連跑 ≥5 位——凍結檔的「每隻最多 3 輪 ×2 位」不允許，這是**驗收設計本身的取樣不足**，記在這裡給主對話。
4. **兩隻都還有 `part_overlap` 的 warn 沒清乾淨。** `nail`：`eye@Brow` 被 `curve@Hood1/2` 蓋 72%／50%（硬化前就存在，`eye` 的側視 share 0.229% → **0.330%**，沒有惡化反而好一點）、新增一條 `fin@ClawElbow` 與 `fin@ClawWrist` 互框 50%（同一道環帶的相鄰片，不是穿模）、`fin@Brow` 與髮綹互框（加寬的臉紋碰到垂髮）。`redhat`：沿用回修版的那幾條。我逐張看 hero／front／side 渲染圖核對過沒有實際破面，**但這是肉眼證據不是機器證據**。
5. **`redhat` 的參照在源頭上就比 `nail` 弱。** `tools/anyCreature/out/ref/redhat/` 是**空目錄**——`2026-09-04-ref-redhat.md` 自己寫明找不到可公開授權的圖檔，五條特徵全部來自民俗文字、未經圖像驗證。ART_BIBLE §0.5 要求「親眼看過圖」在這一隻上**做不到**，本卷只重讀了那份文字筆記。`nail` 這邊我用 Read 親眼重看了 `a2.jpg`（王家珠繪本封面：深藍灰厚布把一張**橘底黑紋、白吻、長鬚**的虎臉框在開口裡，一隻毛茸虎前肢從布下探出）與 `b1.jpg`（真虎特寫：**橘底＋細長黑帶紋、白吻、白頰、長白鬚、圓耳背黑帶白斑**），本卷的虎橘／白吻／細長黑帶／圓耳白斑四個決定都是從這兩張抽出來的。
6. **`nail` 的虎耳是**加碼**，不在 gaps 表的缺項裡。** 缺項只寫「虎」與「額心虎紋」。我判斷圓耳是低多邊形下最強的貓科辨識點才加上去（結果讀者 B 直接寫出「耳朵」），但這是**我自己擴大的範圍**，若主對話認為 ref 特徵①「布罩住頭頂」不該被耳朵頂破，這兩組 fin 拿掉即可（拿掉後 `fur_face`／`stripe`／`whisker` 的數字不變，judge 仍全綠）。
7. **沒有量效能、沒有接進正式對決、沒有做 ART_BIBLE §6 的剪影三秒測試**（那是每兩批一次的批次閘門，要多隻拼圖）。`creature-shoot` 回報的 `fps 59.88` 是 vsync 上限。
8. **`redhat` 的 ART_BIBLE §3「haunt 下半身虛化」目前只靠材質名前綴 `ghost_*`**，真正的半透明是接線卷在 three.js 端掛的；本卷的 stage-lit 裡它仍是不透明的實體錐（六位讀者都讀成「滴落／融化」而不是「霧」，與回修卷 ⑥-5 記的是同一條，本卷沒有處理）。

---

## ⑧ DEVLOG 一行

`harden3A: nail H1 全綠(610.9KB/4080tri/三動畫/faceted 8-of-8/exp 4.8/sa 24-26/ring ×0.8 七條) + H3 盲讀 2/2 讀出「虎」(A「虎頭虎面·橘色虎紋臉」、B「橘虎斑貓／老虎頭」)、特徵 5/5、巨爪與威嚇感 2/2 未掉、0/2 提可愛 → 缺項「虎」與「額心虎紋」關閉 | redhat H1 全綠(567.7KB/3373tri/faceted 7-of-7/sa 26/ring ×0.8 五條) + H4 尖耳 2/2 讀出(回修卷 1/6，ear front share 1.29%→4.09%＋新 ear_inner 3.70%)、主印象詭異/陰森 2/2 不退步；★不對稱三輪六位都沒讀出手臂長度差(機械面 1.69×→3.21×)，唯一寫「不對稱」的那位講的是帽子 → 未達，歸因=hero 3/4 與 stage-lit 都看不到短臂，需主對話裁定加正視或改短臂姿勢 | claims 兩隻零改動(git diff 空)，凍結檔授權的 saturation 10→70 與 tri 5000→8000 兩條都沒用到 | 新引擎事實：ring_step 細化會在折角處 mesh fold BLOCK／會連帶讓子鏈 root_containment 失效／被布包住的頭上掛不了耳朵要改掛布／hood(frame:up) around 框架 0=背90=+X180=正面270=−X(第四種)／薄板法線朝 +Z 就把 udir vdir 的 z 都設 0／共面雙層板的內襯厚度要大於外殼／臉紋加寬不吃底色加厚會 | unresolved: redhat 不對稱未讀出、redhat 盲讀訊號 2 位樣本分不出姿勢效應與讀者差異、nail 前肢「毛」仍讀成甲殼(引擎限制)、part_overlap warn、redhat 無公開參照圖`
