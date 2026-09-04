# 3D 量產卷批 4 — `raincoat` 黃色小雨衣（雨夜跟在你後面的小雨衣，帽兜裡沒臉｜陰氣 haunt）

出貨版 **r12**。基準 main `c14a800`。**未 commit、未 push。**
凍結檔 `docs/experiments/2026-09-04-acceptance-creature-batch.md`（含 17:30 可愛口徑修訂、18:00 特徵目標 5/5、19:10 faceted＋600KB、19:30 預算制 ≤1.5MB／≤8000 tri）。真實參照 `docs/experiments/2026-09-04-ref-raincoat.md`。

---

## ① M-A0～M-A4 一覽

| 閘門 | 結果 | 實測數字 |
|---|---|---|
| **M-A0** GLB ≤1.5MB／三支動畫／judge 全綠／silmetrics | **PASS** | **674.8 KB**（691,004 bytes）／`idle,move,attack`／`[judge] all claims pass`／silmetrics 無 BLOCK |
| **M-A1** 盲讀 context-free ×2 | **PASS @ 第 3 輪（2/2）**，⚠ 見下方誠實條 ⑦-1 | 6 位讀者共 3 輪。r3 兩位 Q1 都讀出「黃色連帽雨衣／鐘型黃色兜帽」＋「幽靈」；主印象含詭異／靈異／幽靈 2/2；特徵命中 **4/5 與 4~5/5**（門檻 ≥3，目標 5） |
| **M-A2** haunt 下半身虛化 | **PASS** | `…-ghost.png`：腰以下無腿無足、半透明垂裾收成尖底、與地面投影分離＝懸空；judge 量到 `ghost_skirt`＋`ghost_drip` 側視合計 **27.0%** |
| **M-A3** 發光材質名在 GLB materials | **PASS** | GLB materials＝`["coat","hood","ghost_skirt","void","glow_hood","ghost_drip"]`，簡報指定的 **`glow_hood`** 原樣在列（簡報只指定這一個，本檔沒有多開） |
| **M-A4** diff 只含自己的檔 | **PASS** | `git diff --stat c14a800` **空**（沒有動到任何已追蹤檔）；`git status --porcelain` 只有 7 個新檔，全部是 `raincoat.*` 與 `2026-09-04-*raincoat*` |

**19:30 預算制**：674.8 KB ≤ 1.5MB ✅／**3,634 三角形** ≤ 8,000 ✅（claims 的 `tri_budget` 上限已依修訂由 5000 改 8000）。
**硬化規則**：`build:"rigid"` ✅／**五個 volume 全部 `faceted:true`** ✅／斷面 `exp` 全檔 4.6–5.2（最低 4.6 ≥4.5）✅／spec 層 `smooth_angle` 26（24–30）✅。

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給兩張圖，路徑遮成 `img-A`／`img-B`，不含 raincoat／雨衣／yellow 字樣）

固定四題：「1. 這是什麼？ 2. 請把看到的特徵逐條列出來，至少六條，講位置 3. 氣質？ 4. 像玩具／可愛，還是像會威嚇你的？」
判定依 17:30 修訂：**「可愛」看主印象（第一句／主詞）**，正文順帶提及記為「風格牆」。haunt 口徑：主印象須含詭異／不祥／陰森／幽靈任一。

### 第 1 輪（r8：帽兜 5 道暖暗摺帶、近水平帽簷）— **未過（0/2）**
- **讀者 A**：Q1「穿著黃綠條紋斗篷、戴著**棒球帽**、下半身呈尖錐狀的低多邊形卡通**小妖精／幽靈**造型」／Q3「**可愛俏皮**中帶點靈異神秘感」／Q4「**偏玩具／可愛路線，不具威嚇感**」→ **FAIL**（Q3 主詞＝可愛俏皮）
- **讀者 B**：Q1「矮胖、沒有腳、身穿條紋斗篷＋**鴨舌帽**……低多邊形幽靈型小妖怪／**吉祥物**角色」／Q3「神秘的小妖精／野地精靈」／Q4「**整體比較偏向可愛／玩具感**……走的是吉祥物路線」→ **FAIL**
→ 歸因（兩人一致）：① **平伸的帽簷板＝帽舌**，2/2 直接讀成棒球帽／鴨舌帽 ② **黃綠條紋**（摺帶太顯眼，讀成條紋斗篷不是雨衣）③ 配色**明亮活潑**。

### 第 2 輪（r11：帽簷下傾 25°、帽兜摺帶砍掉、摺帶改貼近本色的暖暗黃、整體壓暗、下襬加四片破口）— **概念過、氣質未過（0/2 於 Q4）**
- **讀者 C**：Q1「穿**黃色連帽雨衣**（或斗篷）的低多邊形 3D 角色，下半身收成沒有明確雙腳的深綠色尖錐體，正**懸浮**」／Q3「神秘、安靜、帶點童話／妖怪繪本感——像穿著雨衣的**小地縛靈**……**孤寂、遊蕩的鬼魅氣息**」／Q4「整體**偏向玩具／可愛路線**」
- **讀者 D**：Q1「穿**黃色連帽雨衣**的低多邊形 3D 角色……像是漂浮在地面上、只露出半截身軀的**幽靈**」／Q3「帶點神秘、**詭譎**又有點滑稽的『**幽靈**工人／小鬼怪』氣質」／Q4「整體造型……**偏向玩具／可愛**，但那條黑縫的臉、尖錐狀的下半身……『可愛外皮包著一點點詭異』」
→ **雨衣讀出 2/2**，但 2/2 把帽兜下的黑縫讀成「**面罩／安全帽的觀察窗**」——那是「裡面有人」，正好與文獻要的「裡面沒有任何東西」相反。

### 第 3 輪（r12：帽簷改左右不等的下垂軟緣、開口改破洞形、帽兜歪一邊、左袖拉長到下襬以下、加一道從開口往胸前漏下來的黑痕、再壓暗一階）— **PASS（2/2）**
- **讀者 E**：Q1「低多邊形風格的 3D 角色模型，像是穿著**黃色連帽雨衣**、下半身化為一道尖錐（**沒有腳、呈飄浮狀**）的小型**妖怪／幽靈**角色」／Q2 逐條：「帽簷像鴨舌帽一樣**往前凸出**」「帽簷下方有一條黑色橫向細縫……**看不到具體五官**」「身體軀幹……表面有**直向的明暗色帶（像布料皺褶或雨衣材質反光）**」「**鮮黃雨衣配色**……帽子與肩膀部位有**強烈的金色高光／輪廓光**」「從腰部以下……**沒有腿或腳**」／Q3「帶點神秘感的小妖怪／精靈氣質……**看不見的眼睛**（黑色細縫面罩）和飄浮尖錐下擺又添了一絲**詭異**、不食人間煙火的**靈體**感……B 圖的暗夜打光與飄散光點進一步把它往『**幽靈/靈異**』氣氛推」／Q4「比較偏玩具、可愛路線——**低多邊形圓潤造型**、鮮黃雨衣配色、**沒有牙齒尖角**等攻擊性特徵」
  → **PASS**：Q1 第一句＝雨衣＋**幽靈**；Q3 含**詭異／靈體／幽靈**。〔風格牆 ✔，明文歸因低多邊形〕
- **讀者 F**：Q1「頭戴大型**鐘型／斗篷式黃色兜帽**，身體收成一根深綠色尖錐、**沒有腿**，像是漂浮在半空中的**幽靈**或精靈類生物」／Q2 逐條：「一頂巨大的黃色**鐘型**兜帽／帽子……帽緣**往前突出**成一個帽簷」「**沒有瞳孔、五官極簡**」「從腰部以下直接收窄成一根深綠色的尖錐狀『裙擺』……**沒有可見的腿或腳**，錐尖處還有**分叉的細長尖角**」「帽子偏金黃、**飽和度高**……讓黃色部位產生**強烈高光與反光**」／Q3「安靜、帶點神祕感的『小妖怪／使者』氣質——像廟會**紙紮偶或雨衣小僧**的變形……B 圖的暗夜燈光又添了一點**靈異／鬼火**氛圍」／Q4「整體偏玩具／可愛：頭大身小、**圓潤鐘型輪廓**、鮮豔黃色、**低多邊形卡通感**，沒有獠牙尖角」
  → **PASS**：Q1 第一句＝鐘型兜帽＋**幽靈**；Q3 含**靈異／鬼火**，並主動說出「**雨衣**小僧」。〔風格牆 ✔〕

**逐條對照 M-A1**
- 「這是什麼」與簡報概念同類（雨衣／帽兜人形／鬼／幽靈）：r2 2/2、r3 **2/2** ✅；六位裡 **4 位**明確說出「雨衣」（C、D、E，F 在 Q3 說「雨衣小僧」）
- 主印象須含「詭異／不祥／陰森／幽靈」任一：**2/2** ✅（E＝幽靈／詭異／靈體；F＝幽靈／靈異／鬼火）
- 「可愛」不得是主印象：兩位 Q1 第一句與 Q3 主詞都不是可愛 ✅（⚠ Q4 兩位都答「偏玩具／可愛」，見 ⑦-1）
- **風格牆指標：六位裡 6 位**全部把「圓潤／卡通感／可愛」歸因到**低多邊形渲染本身**，與 `tiger_a`／`shield`／`redhat`／`nail`／`flag` 共 26 位讀者同一條，不是本隻造型的問題。

**真實參照特徵命中數**（`2026-09-04-ref-raincoat.md` §三 五條清單，門檻 ≥3、目標 5）

| 讀者 | ①鐘形無頸 | ②前伸硬帽簷 | ③帽兜裡空無一物 | ④高飽和鉻黃＋硬邊反光 | ⑤縱向垂摺→下襬長短不一的濕邊 | 命中 |
|---|---|---|---|---|---|---|
| **E（r3）** | ▲「尖頂連帽造型」「斗篷狀身軀」（沒明說無頸） | ✅「帽簷……往前凸出」 | ✅「看不到具體五官」「看不見的眼睛」 | ✅「鮮黃」「強烈的金色高光／輪廓光」 | ✅ 縱向摺（「直向的明暗色帶，像布料皺褶」）／▲ 下襬濕邊沒讀出 | **4/5** |
| **F（r3）** | ✅「大型**鐘型**／斗篷式兜帽」「圓潤鐘型輪廓」 | ✅「帽緣往前突出成一個帽簷」 | ✅「沒有瞳孔、五官極簡」 | ✅「偏金黃、**飽和度高**」「強烈高光與反光」 | ▲「錐尖處還有分叉的細長尖角」（讀到分叉但沒讀成濕爛的下襬） | **4/5** |

出貨輪兩位都 **4/5**（門檻 ≥3 ✅，目標 5 未達）。缺項見 ⑦-2。

---

## ③ 出貨造型（依 ART_BIBLE 陰氣段的四件事）

| 聖經要求 | 這隻怎麼做 |
|---|---|
| **主色：苔綠＋濕黑＋一點刺眼的紅或白（IP 色例外放寬）** | IP 黃是主體（`coat #c8900e`／`hood #dda412`，S 0.93／0.92）；苔綠與濕黑退到**腰以下**（`ghost_skirt #66807b`、`ghost_drip #5f7a72`、arcs `#35473f`）與**衣摺**（coat/hood 的 198–216 那道 `#3f6353`）；刺眼的一點＝`glow_hood #62f0a8` 冷鬼火青，只有一顆、偏一側 |
| **剪影：不對稱、比例錯誤；haunt 下半身虛化** | 不對稱五處：左袖垂到下襬**以下**（落差 0.356）／右袖萎縮成短管（0.214）＝1.66×；帽兜整體歪 `side +0.016`；帽簷左右不等長；六片濕垂條長短角度全異；那顆光偏 x+0.024。比例錯誤：帽兜高度佔全高 **0.221**（≤1/4，凍結檔手段①），底下卻是 0.53 寬的鐘。下半身＝`ghost_*` 半透明尖錐，尖底停在 y≈0.034 不落地 |
| **材質：吸飽水的布、霉斑、濕髮、泥、榕樹氣根** | 濕布＝`build:"rigid"`＋五個 volume `faceted:true`＋斷面 `exp` 4.6–5.2（塗層布的硬邊高光，ref §二 coat3）；濕髮／氣根＝六片 `ghost_drip` 濕垂 `fin`＋兩條細 `curve` 水線（ART_BIBLE §5「濕布＝下垂 fin 條、`ghost_*` 半透明在末端」逐字照做）；霉斑＝`shading.noise` 0.026＋腰以下的深綠不規則 arcs |
| **節奏：卡頓、不連續、拍子錯開；attack 前有一拍靜止** | `idle` **3.2s**：雨衣與帽兜走 hold＋突跳的關鍵影格（`Waist.ty` 0.30 停→0.34 跳 0.026→0.60 停），垂裾走連續正弦漂移，兩種拍子錯開；`attack` **1.15s**：0→0.06 帽兜猛地別開 −54°、0.06→**0.30 完全靜止一拍**、0.30→0.74 帽兜**慢慢轉回來**正對你（＋6° 過衝）同時整件往前逼近 `Waist.tz +0.235` |
| **關鍵：讓玩家先覺得「好像是人」再覺得不對** | 六位讀者全部先讀成「穿雨衣／戴兜帽的人形角色」，再讀到「看不到五官／沒有腳／飄浮」——這條在盲讀原話裡有直接證據 |

**真實參照五條特徵逐條有／無**（清單見 `2026-09-04-ref-raincoat.md` §三）

| # | 特徵 | 模型上做了什麼 | 有／無 |
|---|---|---|---|
| 1 | ★ 鐘形無頸輪廓 | `coat` 主鏈垂直、profile 由下襬 0.266 **單調**收到肩 0.138（1.93 倍），全程沒有任何一段收窄成頸或腰；`hood` 根環 0.108 埋進肩裡（該高度 coat r 0.167，比值 0.647） | **有**（F 直接說「鐘型」；E ▲） |
| 2 | ★ 前伸硬帽簷 | `hood` 材質的 `fin`（`conform:false`）從 t=0.34 往前下方伸 0.096、左右**不等長**（−0.126／+0.096） | **有**（E、F 都點名） |
| 3 | ★ 帽兜裡空無一物 | `void #121212` 的破洞形 `fin` 掛在帽簷正下方；**沒有 `type:eye`、沒有 `mouth_glow`、沒有下顎鏈**；只有一顆 `glow_hood` 小珠偏在一側；另有一道從開口往胸前漏下來的黑痕 | **有**（E、F 都寫「看不到五官／沒有瞳孔」） |
| 4 | ★ 高飽和鉻黃＋硬邊反光 | `coat`／`hood` S 0.93／0.92；`faceted:true` 讓光只能在面與面之間硬跳；`saturation_area`(tq) **51.9%** 落在 10–70% 帶內 | **有**（F 直接說「飽和度高」「強烈高光與反光」） |
| 5 | ★ 縱向垂摺→下襬長短不一的濕邊 | 縱向垂摺＝coat 六道／hood 三道 18° `colors.arcs`（同色系暖暗黃 `#8c7f5c`＋一道陰氣青）；下襬＝四片 `coat` 色破口 `fin`（長 0.066–0.142）＋六片 `ghost_drip` 濕垂 `fin`（長 0.092–0.188，全部貼錐面往內傾 21.8°） | **縱向垂摺有**（E 讀成「直向的明暗色帶，像布料皺褶」）／**下襬濕邊 2/2 沒讀成濕爛**（⑦-2） |

---

## ④ 指令原文與實際輸出

`<AC>` ＝ `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`，`<WT>` ＝ 本 worktree 根目錄。python 指令都帶 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。

### M-A0 — 引擎編譯（出貨版 r12）

```
$ node <AC>/engine/cli.js assets/creatures/raincoat.json <AC>/out/raincoat/r12.glb
{"ok":true,"out":".../out/raincoat/r12.glb","bytes":691004,"verts":10204,"faces":1935,
 "joints":17,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.322}}
```

（其餘輸出是 `info: fin ... faces ...` 的方位回報與兩條 `WARN profile slope`；沒有 `warn: part_overlap`、沒有 BLOCK。）

### M-A0／M-A3 — 出貨 GLB 本身

```
$ python _tmp_glbinfo.py assets/creatures/raincoat.glb   # 直接讀 GLB 的 JSON chunk，跑完已刪
{"file": "assets/creatures/raincoat.glb", "bytes": 691004, "kb": 674.8,
 "animations": ["idle", "move", "attack"], "skins": 1, "joints": 17, "meshes": 1, "primitives": 6,
 "materials": ["coat", "hood", "ghost_skirt", "void", "glow_hood", "ghost_drip"],
 "attributes": ["COLOR_0", "JOINTS_0", "NORMAL", "POSITION", "WEIGHTS_0"], "images": 0, "textures": 0,
 "asset": {"version": "2.0", "generator": "anyCreature v1.2.0",
           "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "raincoat"}}}
```

逐條：**674.8 KB ≤ 1.5 MB** ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／0 貼圖 ✅／
**M-A3**：簡報 `raincoat` 列指定的 **`glow_hood`** 原樣在 materials 裡 ✅（簡報只指定這一個發光部位，本檔沒有多開；`void` 是**不發光**的近黑，命名刻意不用 `glow_` 前綴，免得被 `js/creature-figures.js:51` 的 `/^glow_/` 吃進 emissive）。

### M-A0 — judge 對 spec 全檢（claims 在動手建模之前就寫定）

```
$ node <AC>/harness/judge.mjs <AC>/out/raincoat/r12.glb <AC>/out/raincoat/judge_r12 raincoat \
      --spec assets/creatures/raincoat.claims.json
"stats":{"triangles":3634,"skinnedMeshes":6,"animations":["idle","move","attack"]}
"names":["coat","hood","ghost_skirt","void","glow_hood","ghost_drip"]
"lum":{"front":86.1,"side":82.2,"tq":87.0,"reartq":72.1,"top":104.4}
"hi_sat_share":{"front":0.5064,"side":0.4755,"tq":0.5189,"reartq":0.6091,"top":0.7281}
coat  side=0.59819  hood side=0.11253 span=0.5994  ghost_skirt side=0.22799
void  side=0.01835 front=0.04259     glow_hood front=0.00247   ghost_drip side=0.04202
[judge] Spec "黃色小雨衣 raincoat_huangyi (yinqi/haunt)" — all claims pass.
```

各條的實際數字對門檻（門檻全程一格未動；唯一改過的是 `tri_budget` 上限，見 ⑦-4）：
- `part_exists` `hood`／`coat`／`glow_hood`／`void`／`ghost_skirt`／`ghost_drip` — 六個材質名都在 materials 清單裡 ✅
- `part_signature` `hood`（view side）：share **11.25%**（需 ≥6%）**且** span **0.5994**（需 ≥0.12）→ 兩路都過 ✅
- `part_visible` `glow_hood`（view front）：**0.247%**（需 ≥0.15%）✅ ←本檔相對 redhat **加嚴**的那一條（防 nail ⑥-4）
- `focal_contrast` `hood` : `void`（view side）＝ 11.25% : 1.84% ＝ **6.13×**（需 ≥2）✅
- `share_hierarchy`（view side）＝ (coat+hood) 71.1% : (ghost_skirt+ghost_drip) 27.0% : (void+glow_hood) 1.9%
  → 目標 60:30:10、容差 ±15pp，最大偏離 **11.1pp**（tertiary）✅
- `saturation_area`（view tq）：**51.9%**（IP 色裁定的帶 10–70%）✅，餘裕 18.1pp
- `tri_budget`：**3634**（1500–8000）✅
- `rig_skinned` / `anim_named`：skins=1、6 個 skinned mesh、三支動畫齊 ✅

### M-A2 — haunt 下半身虛化

```
$ node <AC>/harness/silmetrics.mjs <AC>/out/raincoat/r12.glb <AC>/out/raincoat/sil_r12
{"W_over_H":0.53,"fill":0.572,"mass_thirds":[0.237,0.531,0.233],"torso_depth_max":1,
 "torso_depth_min":0.37,"mass_contrast":2.73,"leg_fraction":0.078,"turn_count":14,
 "zigzag_alignment":1,"front":{"W_over_H":0.55,"fill":0.593},"top":{"W_over_H":1.01,"fill":0.808},
 "hero":{"W_over_H":0.65,"fill":0.577}}
```

**M-A2 的證據怎麼看 `…-ghost.png`**：腰以下沒有任何腿或足；`ghost_skirt` 從下襬底下張開再收成尖底，底端停在 **y≈0.034**；戲台地面的投影與本體之間有明顯空隙＝懸空；六片 `ghost_drip` 濕垂條沿垂裾外緣往下、長短不一。機械面另有兩個數字佐證：`judge` 的 `ghost_skirt`＋`ghost_drip` **側視合計 27.0%**＝整隻的下三分之一全部是 `ghost_` 材質；六位讀者裡 **6/6** 主動寫出「沒有腿／沒有腳／飄浮／懸浮」。
⚠ 但 `leg_fraction` 量到 **0.078 而不是 `null`**（redhat 報告 ⑦-A 說 haunt 應為 `null`）——見誠實條 ⑦-3。

### M-A0 — hero render 與戲台截圖

```
$ node <AC>/harness/hero.mjs <AC>/out/raincoat/r12.glb <AC>/out/raincoat/hero_r12
{"ok":true,"margin":8.4}

$ node tests/tools/creature-shoot.mjs <AC>/out/raincoat/stage_r12.png \
       "glb=raincoat.glb&light=1&fx=1&rim=yinqi" idle 8816
{"out":".../stage_r12.png","query":"glb=raincoat.glb&light=1&fx=1&rim=yinqi","phase":"idle",
 "fps":59.88023952095874,"calls":13,"loadMs":240,"particles":44,"errors":[]}
```

- `errors: []`——`console.error`／`pageerror` 兩種來源都收，空陣列 ✅
- `?glb=` 只吃檔名不補副檔名，要寫 `glb=raincoat.glb`（redhat 報告已記，本卷實測再確認一次：寫 `glb=raincoat` 會 404）
- **hero 是 `harness/hero.mjs` 的原始輸出**（1024×1024，白底），一個位元組沒改
- **stage-lit** 是 `creature-shoot.mjs` 原始輸出 1688×780 **裁切 (700,40)-(1060,560) 後以 LANCZOS 放大 2×** 到 720×1040（讓主體佔滿畫面給盲讀者看），沒有調色
- **`…-ghost.png`** 是同一張的下半身裁切 (760,330)-(1010,560) 後以 **NEAREST 放大 4×** 到 1000×920，沒有調色
- 埠號 **8816**（派工指定）；`creature-shoot.mjs` 自己起 `python -m http.server` 並在 `finally` 裡 `srv.kill()`
- `tools/anyCreature` 在 `.gitignore` 第 3 行、worktree 沒有這個目錄，用 `mklink /J` 建 junction 借主樹的 `node_modules`，**截完已刪**（`(Get-Item …).Delete()`，並已核對主樹 `node_modules/playwright` 完好＝`True`）

### M-A4 — diff 範圍

```
$ git diff --stat c14a800
(空)

$ git status --porcelain
?? assets/creatures/raincoat.claims.json
?? assets/creatures/raincoat.glb
?? assets/creatures/raincoat.json
?? docs/experiments/2026-09-04-creature-raincoat-ghost.png
?? docs/experiments/2026-09-04-creature-raincoat-hero.png
?? docs/experiments/2026-09-04-creature-raincoat-stage-lit.png
?? docs/experiments/2026-09-04-ref-raincoat.md
```

`index.html`／`js/`／`tests/tools/`／既有 creatures／anyCreature 引擎**一個位元組都沒動** ✅（`git diff --stat` 是空的）。本報告是第 8 個新檔。過程中用過四支一次性的 `_tmp_*.py`（下載參照 metadata、跑變體、批次改 spec、讀 GLB header），全部已刪。不 commit 不 push。

---

## ⑤ 改了哪些檔（檔案:行號）

全部是新檔，既有檔案一行未動。

| 檔案 | 行數 | 內容 |
|---|---|---|
| `assets/creatures/raincoat.json` | 1–275 | 規格。設計筆記 `2–18`、palette `20–27`、shading `30`、骨架 `33–55`（coat 4 節／skirt 4 節／hood 3 節／兩支各自成鏈的袖子）、chains/attach/touch `57–65`、volumes `67–147`（coat／hood／skirt／LSleeve／RSleeve，全部 `faceted:true`）、parts `149–219`（帽簷／帽兜開口的黑／那點光／胸前黑痕／兩個袖口黑箍／四片下襬破口／六片濕垂條／兩條水線）、三支動畫 `221–274` |
| `assets/creatures/raincoat.claims.json` | 1–101 | judge 的機械檢查清單（**建模前寫定**，基底＝`redhat.claims.json`）。四類改動與理由寫在 `_role` |
| `assets/creatures/raincoat.glb` | — | 691,004 bytes，引擎輸出 |
| `docs/experiments/2026-09-04-ref-raincoat.md` | 1–63 | 真實參照（四張影像＋玉山小飛俠文獻）、五條一眼特徵清單、參照→幾何翻譯表、刻意不照抄的四處 |
| `docs/experiments/2026-09-04-creature-raincoat-{hero,stage-lit,ghost}.png` | — | M-A0／M-A1／M-A2 的證據截圖 |
| 參照圖 `tools/anyCreature/out/ref/raincoat/coat{1,2,3,4}.jpg` | — | 四張 Commons 照片（gitignore 內，不進 diff） |

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現四條）

1. **★ `caps:"ngon"` 端蓋在 bind pose 就會生翻面三角形，而錯誤訊息完全指向動畫。**
   r1–r2 一路吃 `BLOCK: mesh_integrity: bind pose has 9 flipped tris` ＋ 15 條 `anim_integrity ... worst in "coat"`，訊息叫我「降低旋轉幅度／加大 ring_step」——**那三個建議都沒用**，因為問題不在動畫。我用四個變體對照（拿掉肩篷／拿掉袖子／端蓋改 `dome`／取消 `faceted`）才定位：**只有把 `caps:["ngon","dome"]` 換成 `["dome","dome"]` 那一版是全綠的**，其餘三版都還是 9 個翻面。`ngon` 是對著 `exp 4.8` 的超橢圓環做扇形三角化，20 邊裡有 9 個會翻。**對策：需要「平的開口」時用 `caps:"none"`**（本檔的下襬就是 none，靠內側的 `ghost_skirt` 把洞填住，從戲台的俯角看不進去），不要用 `ngon`。
2. **★ `colors.arcs` 的實際覆蓋比寫的寬得多，而且對 `saturation_area` 的影響完全不是單調的。** 本卷編了**九個**帶配置逐個量（`sides:20`＝每面 18°，帶一律寫成 18 的倍數）：

   | 18° 暗帶道數／位置 | `hi_sat_share` tq |
   |---|---|
   | 0 道（全黃） | 0.781 |
   | 4 道 0/72/90/180（其中兩道相鄰） | 0.711 |
   | 5 道 0/72/144/216/288 | 0.588 |
   | 6 道 0/54/108/162/216/270 | 0.524 |
   | 6 道 36/90/144/198/252/306 | **0.524** |
   | 7 道 0/54/…/324 | 0.474 |
   | 7 道 0/54/…/324（另一組色） | 0.676 |
   | 5 道 36/108/180/252/324（位移 36°） | 0.693 |
   | 10 道每 36° | 0.154 |

   同樣是「幾道 18° 的帶」，換位置就從 0.474 跳到 0.693。**相鄰的兩道帶還會互相吃掉**（72–90 緊接 90–108 時只剩一道生效）。**唯一可靠的做法是逐個配置編出來量**，不要從覆蓋角度推、也不要假設「加一道就更暗一點」。
3. **★ 帶顏色的暗帶會被讀成「條紋」，同色系的暗帶才會被讀成「摺陰」。** 第 1 輪盲讀 2/2 把近黑＋苔綠的暗帶讀成「**黃綠條紋斗篷**」，直接毀掉「雨衣」的辨識。把帶色從 `#2a302c`／`#33604c` 換成**貼近本色的暖暗黃 `#8c7f5c`** 之後，第 2 輪 2/2 就讀成「黃色連帽雨衣」。**選摺帶顏色的判準是「它和本色是同一件衣服的明暗，還是另一種顏色」**，不是「夠不夠暗」。附帶陷阱：`#8c7940` 看起來很像低飽和，實測 HSV S = **0.543 ≥ 0.5**，照樣吃滿飽和預算——挑摺帶色一定要先算 `(max−min)/max`。
4. **★ 平伸的板子＝帽舌；對稱的橫縫＝面罩。** 本卷兩輪盲讀共四位讀者，把近水平的 `fin` 帽簷讀成「**棒球帽／鴨舌帽／消防員安全帽**」（4/4），把帽簷底下等寬的黑板讀成「**面罩上的觀察窗**」（2/2）——後者是致命的，因為觀察窗代表「裡面有人」，正好和這隻要的「裡面什麼都沒有」相反。**對策：簷要往下傾 ≥25° 且左右不等長，開口的黑要做成左右不等的破洞形**；r3 改完之後兩位就都寫「看不到具體五官／沒有瞳孔」。這條對後面的 `chair`／`buoy`／`guoyin` 同樣適用——任何「兜帽／罩子底下的空」都會撞到這個讀法。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **M-A1 的「可愛」判定是邊界案，我用 17:30 的口徑判 PASS，但把原話全貼出來給主對話覆核。**
   第 3 輪兩位的 **Q1 第一句**與 **Q3 氣質主詞**都不是「可愛」（E＝「妖怪／幽靈角色」、F＝「幽靈或精靈類生物」），且兩位 Q3 都含詭異／靈異／幽靈——依 17:30 修訂「『可愛』看主印象（第一句／主詞）」這是 PASS。
   **但兩位對 Q4「像玩具／可愛，還是像會威嚇你的？」都直接答「偏玩具／可愛」**，而 Q4 是直接問的、不是順帶提及。如果主對話認為 Q4 的答案也算主印象，那本隻是**第 3 輪未過、以最佳版出貨**（凍結檔：「最多 3 輪，第 3 輪未過交最佳版標『未過』」）。兩位都把可愛明文歸因於「低多邊形圓潤造型」「沒有獠牙尖角」＝風格牆，六位讀者 6/6 都這樣寫。**這一條我不自己裁，交主對話。**
2. **真實參照特徵 ⑤ 的「下襬長短不一的濕邊」2/2 沒讀成濕爛的下襬。** 四片 `coat` 色破口＋六片 `ghost_drip` 濕垂條都做了、silmetrics 的 `turn_count` 也從 9 升到 14，但 F 只讀到「錐尖處有分叉的細長尖角」、E 完全沒提。要真的讀成「濕爛」，最直接的是把破口拉長到蓋住垂裾上半段並讓左右長度差到 2 倍以上，代價是會吃掉 `ghost_skirt` 的 side share（`share_hierarchy` 的 tertiary 已經偏離 11.1pp，餘裕不大）。本卷沒動，**登記為缺項**。特徵 ① 鐘形無頸只有 F 明確讀出（E ▲），一併登記。
3. **`leg_fraction` 量到 0.078 而不是 `null`。** redhat 報告 ⑦-A 說「haunt 做對了就會是 `null`（silmetrics 找不到腿）」，本隻是 0.078。我的判斷是**垂裾尖底那一段被當成單腿量到了**（本隻的垂裾是實心的錐體、底端有 0.036 的收尾環，redhat 的霧裾底端只有 0.012 且外圍有四叢霧鬚打散輪廓）。這是**量測差異不是造型缺陷**——六位讀者 6/6 都寫「沒有腿／沒有腳」，`ghost_*` 側視合計 27.0%。但 redhat 那條「最便宜的機械證據」在本隻不成立，M-A2 我改用截圖＋讀者原話＋材質 share 三項佐證。**這條是「沒達成」不是「達成了」。**
4. **`claims.json` 的 `tri_budget` 上限由 5000 改成 8000。** 依凍結檔 **19:30 修訂**（`main 15a3a37`：「每隻 ≤1.5MB、三角形 ≤8,000，claims tri_budget 上限可改 8000」）——這是凍結檔自己放寬的，不是我在動及格線。其餘門檻（`part_signature` 0.06/0.12、`focal_contrast` 2、`share_hierarchy` 0.15、`saturation_area` 10–70%）與 redhat 逐字相同，全程一格未動；`part_visible glow_hood ≥0.15%` 是本檔**加嚴**新增的。
5. **ART_BIBLE §6 的「剪影三秒測試」本卷沒做**——那是每兩批一次的批次閘門、需要多隻拼圖才跑得起來，留給主對話在合併批 4 之後執行。
6. **沒有量效能、沒有接進正式對決。** M-A0～A4 沒有要求就沒做；`creature-shoot` 順手回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。
7. **`?n=4` 橫排沒拍。** M-A2 只對 swarm 要求橫排截圖，`raincoat` 在 POOL 裡是 **haunt 隻數 4**，實戰會有四隻同場（`hauntDread1`），值得在接線卷補一張。
8. **兩條 `WARN profile slope` 沒清乾淨**（`hood` t=1.00 斜率 1.37、`skirt` t=0.03 斜率 1.08）。編譯器說「這種形狀一彎就會翻面」，但 `mesh_integrity`／`anim_integrity` 三支動畫五個取樣點全綠，所以我留著沒改——那兩處分別是帽兜的圓罩收尾與垂裾藏在雨衣裡的那一段，改斜率會動到剪影。**這是 warn 不是 BLOCK，但也是「知道了沒處理」。**
9. **半透明是不是真的好看，本卷驗不到。** `js/creature-figures.js` 的 `/^ghost_/` 分支（opacity 0.62）在 `creature-preview.html` 有生效（`…-ghost.png` 看得到穿透），但正式戲台的疊圖順序、與 `attachFactionFx` 粒子的前後關係要接線卷才知道。

## ⑧ DEVLOG 一行

`gates: M-A0/A1/A2/A3/A4 全 PASS | M-A1 pass@r3 2/2（2/2 讀成「黃色連帽雨衣／鐘型兜帽」＋「幽靈」、主印象含詭異/靈異/幽靈 2/2、真實參照特徵各 4/5）；⚠ 兩位 Q4 仍答「偏玩具/可愛」並明文歸因低多邊形＝風格牆 6/6，可愛口徑邊界案交主對話覆核 | 674.8KB/3634tri/judge all pass/saturation 51.9%(帶10-70)/ghost_* 側視 27.0%/turn_count 14 | 19:10+19:30 模板規則已套：build:rigid＋五個 volume 全 faceted、exp 4.6-5.2、smooth_angle 26、tri_budget 上限改 8000 | restarts: ngon 端蓋=9 個 bind-pose 翻面(4 變體對照才定位)→改 caps:none；黑金頭盔(帽兜太大+7 道近黑帶+袖子埋在鐘裡)→縮帽兜/放寬下襬/袖子甩出輪廓外/gradient −0.88→−0.50；濕垂條直垂被讀成六隻腳→貼錐面內傾 21.8°；黃綠暗帶被讀成條紋斗篷→改同色系暖暗黃；平伸帽簷被 4/4 讀成鴨舌帽、等寬黑板被 2/2 讀成面罩觀察窗→簷下傾 25° 左右不等長、開口改破洞形 | unresolved: 下襬濕邊 2/2 沒讀成濕爛、鐘形無頸只有 1/2 明確讀出、leg_fraction 0.078 不是 null、兩條 profile slope WARN 未清、剪影三秒測試待批次`
