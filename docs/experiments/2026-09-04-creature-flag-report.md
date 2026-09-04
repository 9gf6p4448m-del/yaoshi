# 3D 量產卷批 3 — `flag` 媽祖令旗（xianghuo／ward）回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（M-A0～M-A4 **一格未動**；`saturation_area` 用該檔指定的 10–60% 帶），**含 2026-09-04 17:30 修訂**（main `faabfc0`：「可愛」判定看主印象＋`build:"rigid"`／`exp ≥4.5`／`smooth_angle` 24–30 的模板規則）。
美術權威：`docs/design/ART_BIBLE.md`（明文優先於凍結檔的美術守則）＋ **§0.5 真實參照鐵則**。
真實參照：`docs/experiments/2026-09-04-ref-flag.md`（三張 Wikimedia 照片，主 agent 用 Read 逐張親眼看過）。
簡報列：`docs/experiments/2026-09-04-creature-briefs.md` 的 `flag` 列。
基準：worktree `agent-ab6c4aea0bfe416ec`，起點 main `63e5a28`。**未 commit、未 push。**
出貨檔：`assets/creatures/flag.{json,glb,claims.json}`；截圖 `docs/experiments/2026-09-04-creature-flag-{hero,stage-lit,front}.png`。

---

## ① M-A0～M-A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| M-A0 GLB 規格 | **PASS** | 396.7 KB ≤ 400 KB；`idle`／`move`／`attack` 三支；`skins`=1、`COLOR_0` 有、0 貼圖；`judge.mjs --spec` **all claims pass**；silmetrics 正面（識別視角）W/H 0.88、側視 0.61；hero margin 8.4% 無裁切 |
| M-A1 盲讀 ×2 | **PASS（第 3 輪 2/2，依 17:30 修訂口徑）** | 三輪 6 位讀者 **6/6 讀成「獅／石獅／獅型野獸／守護獸」＋6/6 讀出「背後插著三角旗（火焰邊）」**；第 3 輪兩位主印象分別是「威嚴多於邪惡」「野性威嚴」（香火要的「威」命中），**兩位的第一句與氣質主詞都沒有「可愛」**，真實參照特徵各命中 5/6。**風格牆指標：6 位裡 5 位**在正文順帶把「圓潤／Q 版」歸因到低多邊形渲染（原話與逐人標記在 ②） |
| M-A2 體型（ward） | **PASS** | 正面寬 **0.960** ≥ 側面寬 **0.677**（＝**1.42×**）；等高剪影另一組：正面 W/H **0.88** vs 側視 W/H **0.61**（＝**1.44×**）。證據圖 `-front.png` 與 `sil_side/sil_front` |
| M-A3 發光材質名 | **PASS** | GLB materials 18 個，簡報指定的 **`eye`** 與 **`glow_flag`** 原樣在列（清單見 ④） |
| M-A4 範圍 | **PASS** | `git status --short` 只有自己的 8 個新檔；`git diff --stat HEAD` 空的（既有檔案一個位元組沒動） |

**17:30 修訂的模板規則逐條落地**

| 規則 | 本檔狀態 |
|---|---|
| `build: "rigid"` | ✅ 一開始就是（`flag.json:32`，石獅＝石雕構造物，引擎為 constructs 開的旗標） |
| 斷面 `exp ≥ 4.5` | ✅ 收到修訂後補齊：原本頭／顎／尾的**端蓋列**還有 4.4／4.0 五列，已全部提到 4.6；現在全檔 `exp` 只有 4.6／4.8／5.0／5.4 四個值（body 4.6–5.4、head 4.6–5.0、jaw 4.6、tail 4.6–4.8、leg 4.6–5.0） |
| `smooth_angle` 24–30 | ✅ spec 層 26；**各 volume 另加 `faceted: true`**（＝smooth_angle 0，比 24 更硬，不是更軟）。與 shield 硬化版同一寫法 |

**這次硬化對「讀者看到的那一版」的影響**：`exp 4.4/4.0 → 4.6` 只動到頭／顎／尾三個體積的**端蓋環**（半徑 0.030–0.108 的收尾列）。硬化前後 `bytes` 同為 **406,200**、`triangles` 同為 **2816**、silmetrics **每一項數字逐字相同**（`W_over_H 0.88 / fill 0.531 / mass_thirds 0.408,0.506,0.086 / turn_count 35 / front W_over_H 0.61`），judge 仍 all claims pass；`cmp` 顯示 GLB 位元組有差（char 7851 起），肉眼比對 hero 兩版無可辨差異。**出貨的三張截圖已用硬化版重拍**，所以截圖與 GLB 同一次編譯；盲讀讀者看到的是硬化前那一版，兩版的差異已用上面這組數字量化。

**不算通過的地方（誠實條）**
1. ART_BIBLE §1 香火的「**側視 W/H 目標 ≥ 0.9**」**沒有達成**（實測 0.61）。理由與取捨寫在 ③ 末。這是聖經的記錄項不是單隻閘門（凍結檔末段明文），但要講明。
2. 真實參照特徵 **② 垂片大耳** 做了但 **6/6 讀者都沒讀出來**（被 17 顆鬈鬃夾住），見 ⑦-2。
3. 真實參照特徵 **④ 胸前綵球** 機器量到的 share 在五個視角全部是 **0.000**，四位讀者一致讀成「胸口暗紅標記／傷痕」，沒有人讀成綵球，見 ⑦-3。
4. 硬化版**沒有再送盲讀**（依 17:30 修訂：「盲讀併入剪影三秒測試批次補讀」）。

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給 hero＋stage-lit 兩張，路徑不含 flag／lion／獅 字樣，檔名遮成 `img-A`／`img-B`）

問法三題固定：「1. 這是什麼？ 2. 請把看到的特徵逐條列出來（至少六條，講位置） 3. 氣質？ 4. 像玩具／可愛，還是像會威嚇你的？」
判定依 17:30 修訂：**「可愛」看主印象（第一句／主詞）**；正文順帶提及只記為「風格牆」。

### 第 1 輪（灰石獅＋鬈鬃 11 顆＋圓腳掌）— **未過（1/2）**
- **讀者 A**：Q1「一隻蹲坐姿的**黑色小獅子造型怪獸**，背後插著一面**三角形的紅色（帶橘色鋸齒火焰邊）小旗**」／Q3 氣質「**Q萌**中帶點兇……整體偏**可愛**玩具風」／Q4「**偏玩具／可愛向**……低多邊形圓潤造型、頭大身小的Q版比例、鬃毛做成一顆顆**圓球狀**」
  → **FAIL**：「可愛／Q萌」出現在**氣質主詞**，不是順帶提及。〔風格牆 ✔〕
- **讀者 B**：Q1「蹲坐著的黑色低多邊形**獅子妖怪**，背後插著一面帶尖刺的**紅色三角旗**」／Q3「兇猛中帶點蹲踞待發的**野性威壓感**，像是廟會陣頭或東方妖怪傳說裡的**守護獸/凶獸**，帶著儀式性、圖騰感」／Q4「比較像**會威嚇**你的東西」→ **PASS**〔風格牆 ✗（唯一沒提的一位）〕

→ 歸因：腳掌是半球、鬈鬃是圓球、頭大身圓。改法：扁掌＋外露石爪、鬈鬃末端拉尖挑出、頭壓低前伸並把頭高比推出玩偶區（`height_ratio` 0.276 → 0.249）。

### 第 2 輪（加石爪、尖鬃、低頭蹲踞）— **未過（1/2）**
- **讀者 C**：Q1「低多邊形風格的黑色/深棕色**小獅子造型怪獸**，背後扛著一面**火焰紋樣的紅黃三角旗幟**」／Q3「**小惡獸／幼龍守衛**……原始、野性……圖騰／領地標記的**儀式感**」／Q4「造型與比例**偏向玩具／可愛**——低多邊形圓潤塊面、蹲坐的**矮胖身形**、頭大身圓」
  → **FAIL**：氣質主詞是「小惡獸／幼龍守衛」，**不含**香火要的「威／莊嚴／神／古老」任一。〔風格牆 ✔〕
- **讀者 D**：Q1「蹲坐著的**黑色巨獅**（或獅犬型怪獸），背後扛著一面帶尖刺的紅色旗幟」／Q3「沉穩中帶著**壓迫感**……蟄伏的猛獸或帶著圖騰／軍旗的**部族守護獸**」／Q4「更偏向**會威嚇**你的東西……走『**威嚴的守護獸**』路線；雖然低多邊形建模風格本身帶點**可愛**的量感」→ **PASS**〔風格牆 ✔（順帶提及，主詞是「威嚴的守護獸」）〕

→ 歸因：四位一致指向「**黑**塊＋圓潤＋矮胖」。改法：① 端坐（主鏈拉高、胸挺腰收、前肢改直柱）② 石材從近黑提亮成**風化灰石**（黑塊讀成絨毛玩偶，灰石才讀成石雕）③ 真的把嘴張開（前兩輪 `maw` 在五個視角的 share 都是 0）。

### 第 3 輪（端坐＋灰石＋張口露齒）— **PASS（2/2）**
- **讀者 E**：Q1「一隻蹲踞的**黑色巨獅／獅型野獸**，背後插著一面**火焰造型的紅色三角旗**」／Q3 氣質「沉重、壓迫、帶原始蠻荒感……『卡通化的獸王』氣場：**威嚴**多於邪惡，像是守關的頭目怪或**圖騰化的猛獸**……B 圖……更具戲劇性、**儀式感**的『魔王登場』氛圍」／Q4「兩者都有，但**威嚇感佔上風**……低多邊形的圓潤塊面、卡通比例確實帶點**可愛**的玩具感；但張嘴露牙咆哮、蹲踞攻擊姿態……」
  → **PASS**：第一句＝獅／三角旗，氣質主詞＝**威嚴**；「可愛」出現在 Q4 的讓步子句、且明文歸因於「低多邊形的圓潤塊面」＝風格牆，依 17:30 修訂不否決。〔風格牆 ✔〕
- **讀者 F**：Q1「一隻蹲坐的低多邊形**獅子/野獸怪物**，背後扛著一面**火焰造型的旗幟**」／Q3「沉穩、原始、帶點粗獷的**野性威嚴**；場景打光則……神秘、危險……像是遊戲裡的**守護獸或首領角色**」／Q4「比較偏向**會威嚇**你的東西……**而非討喜可愛的玩具公仔感**（雖然低多邊形造型本身線條圓潤、略帶Q版比例，削弱了一些壓迫感）」
  → **PASS**：氣質主詞＝**野性威嚴**；「可愛」只在**否定句**（同 `sword` 報告 ② 的口徑）。〔風格牆 ✔（提的是「圓潤／Q版」）〕

**逐條對照 M-A1**
- 「這是什麼」與簡報概念同類（獅／石獅／守護獸）：**6/6 全中**，六位讀者無一例外 ✅
- 主印象須含「威／莊嚴／神／古老」任一：第 3 輪 E =「**威嚴**多於邪惡」、F =「野性**威嚴**」✅（第 1 輪 B「威壓感」、第 2 輪 D「威嚴的守護獸」也中）
- 「可愛」不得是主印象：第 3 輪兩位的第一句與氣質主詞都沒有 ✅
- **風格牆指標（本檔要求貼出的數字）：6 位裡 5 位**（A／C／D／E／F）把「圓潤／Q 版／可愛」歸因到低多邊形渲染本身；只有 B 沒提。這與 `tiger_a`／`shield`／`redhat`／`nail` 共 20 位讀者的歸因同一條，不是本隻造型的問題。

**真實參照特徵命中數（`2026-09-04-ref-flag.md` §三 的六條清單，門檻 ≥3）**

| 讀者 | ①螺旋鬈鬃 | ②垂片／後掠耳 | ③闊嘴獠牙＋翻鼻＋厚眉眼 | ④紅綢綵球 | ⑤蹲坐方塊體 | ⑥細長三角旗＋長桿＋長邊流蘇火 | 命中 |
|---|---|---|---|---|---|---|---|
| A（r1） | ✅「一圈捲曲蓬鬆的鬃毛」 | — | ✅「露出白色尖牙」「眼神銳利」 | ✕（讀成嘴角血色） | ✅「蹲坐姿態，重心低矮敦實」 | ✅「旗桿＋紅底＋鋸齒橘黃火焰邊＋頂端黃尖角」 | **4** |
| B（r1） | ✅ | — | ✅「大張，上下兩顆白牙」「憤怒上吊眼」 | ▲「胸前紅色標記」 | ✅「蹲踞低矮」 | ✅ | **5** |
| C（r2） | ✅「岩石般粗糙分割的鬃毛」 | — | ✅「咆哮」「白色尖牙」「發光眼」 | ▲「胸口暗紅色紋路」 | ✅「蹲坐，重心低矮穩固」 | ✅ | **5** |
| D（r2） | ✅ | — | ✅「兩顆白色尖牙」「細長三角發黃橙光的眼」 | ▲「胸口下方一抹紅色」 | ✅「敦實厚重、重心低矮」 | ✅「深褐旗桿＋金色尖矛＋暗紅三角旗＋橙黃鋸齒」 | **5** |
| **E（r3）** | ✅「一圈渾圓塊狀的鬃毛」 | — | ✅「張大的嘴露出上下排尖牙，嘴內暗紅」 | ▲「胸口下方暗紅色標記」 | ✅「軀幹渾圓厚實、蹲坐、重心壓低」 | ✅「深色旗桿＋暗紅三角旗＋鋸齒橙黃火焰突起＋黃尖角」 | **5** |
| **F（r3）** | ✅「塊狀捲曲的鬃毛」 | — | ✅「嘴巴大張，上下獠牙，口腔暗紅」 | ▲「胸口下方一道暗紅色紋路」 | ✅「蹲伏準備狀、粗壯爪撐地」 | ✅「三角旗＋金黃鋸齒火焰紋＋旗桿＋黃尖端」 | **5** |

出貨輪兩位都命中 **5/6**（門檻 ≥3）✅。唯一 6/6 都沒讀出來的是 **②垂片大耳**（⑦-2）；**④** 都只讀成「胸口暗紅標記」，沒讀成綵球（⑦-3）。

---

## ③ 出貨造型（依 ART_BIBLE 香火段的四件事）

| 聖經要求 | 這隻怎麼做 |
|---|---|
| **主色：硃紅＋鎏金＋香灰白（中性）** | 旗面硃紅 `flag_cloth #a82f18`（＝簡報指定的「香火橘：旗面」色帶落點）、火 `glow_flag #ff7c1e`；鎏金**只集中在令旗這一件配件**（`gold_trim #dfa93a`＝旗的下緣繡邊＋桿頂槍尖，聖經 §5「金箔集中在一件配件」）；香灰白走**中性風化灰石**（`stone_* #45~#5c`，全部 HSV S<0.16）＋顱頂一條不發光的灰白 arc 帶（§5「香灰＝一層灰白 arc 帶」） |
| **剪影：寬、正、儀仗感；靠垂墜物製造輪廓** | ward 的「寬」＝矮寬的方形石座量體＋往兩側撐開的前肢石柱；輪廓事件由**背插令旗**（垂墜物）＋17 顆鬈鬃＋六條火舌撐起，`turn_count` **35**（tiger_c 30、shield 32、redhat 6） |
| **材質：上漆木雕／剪黏碎瓷／交趾陶／金箔／絹旗／積年香灰** | 絹旗＝`flag_cloth` 大 `fin`；上漆木＝`pole_wood` 旗桿；金箔＝`gold_trim`；香灰＝顱頂灰白 arc＋石身色階；石雕塊面＝`build:"rigid"`＋各 volume `faceted:true`＋斷面 `exp` **4.6–5.4** |
| **節奏：緩慢有拍子，idle 2.4–3.0s 對稱擺、attack 先蓄後落** | `idle` **2.8s**（旗 `rz` ±2.8°、尾滯後、`Root ty` 0.008）；`attack` **0.62s**，0→0.26 蓄（後仰、旗繞背）→0.55 落（`Root tz +0.300`、`FlagMast ry −44°` **橫揮**＋`rx +20°` 前壓，純側掃過不了 `attack_reach`，必須配前壓與前撲）→回位 |

**真實參照六條特徵逐條有／無**（清單見 `2026-09-04-ref-flag.md` §三）

| # | 特徵 | 模型上做了什麼 | 有／無 |
|---|---|---|---|
| 1 | ★ 螺旋鬈鬃 | 17 顆 `mane_curl` `curve`（3 段、`coil` 45–78°＋末段 `rise` 挑尖），排在顱頂／顱側／頰／顎線／頸背／肩背；side 視角 share **14.05%** | **有**（6/6 讀者都點名） |
| 2 | ★ 後掠／垂片大耳 | 一對 `ear_plate` `fin`，`conform:false`，從顱側往後下方掛；side share 4.2%、front 0.5% | **做了但沒讀出來**（被鬃鬈蓋住，⑦-2） |
| 3 | 闊嘴露獠牙＋寬扁翻鼻＋厚眉脊壓著的眼 | 下顎鏈下沉到與上顎脫開（`maw #43120f` 暗赤口腔露出 front **1.23%**）、上下 `fang` 各一對、`nose_stone` 寬扁鼻楔＋鼻樑脊、一對往鼻樑壓下去的眉脊板、`eye` 金瞳 size 0.042 嵌在眉脊下 | **有**（6/6 讀者都點名獠牙與眼） |
| 4 | 胸前紅綢＋綵球 | 一對 `sash` 斜帶從肩繞到胸前、`sash_knot` 綵球結 | **做了，但讀成「胸口暗紅標記」**（⑦-3） |
| 5 | ★ 蹲坐的方形塊體＋方形石座 | 主鏈垂直站立、底部 t=0–0.12 外擴成方座（half-width 0.310、`exp 5.4`）、腰收胸挺（0.256→0.280）、`build:"rigid"` 全平面 | **有**（6/6 讀者都讀出蹲坐／重心低） |
| 6 | ★ 細長斜三角旗＋長桿超出旗尖＋長邊流蘇火 | `flag_cloth` 三角 `fin`（頂點 A 埋在背裡、B 尖 y=0.956 高過頭頂 0.79、C 是飄出去的旗尾）＋`pole_wood` 直桿一路超出旗尖＋桿頂 `gold_trim` 槍尖＋六條 `glow_flag` 沿斜長邊往外上捲 | **有**（6/6 讀者都讀出三角旗＋火焰邊＋旗桿黃尖端） |

**香火四件事怎麼落地（一句話版）**：**剪影**＝矮寬石座＋兩根前肢石柱撐出正面寬，輪廓靠「背插的單片斜三角令旗」這件垂墜物切出去；**單一主色**＝硃紅只落在旗面（＋火與繡邊各一小塊），石身全中性；**關鍵材質**＝絹旗（大 `fin`）／上漆木桿／金箔（僅令旗一件）／積年香灰（顱頂灰白帶）；**動態節奏**＝idle 2.8s 對稱緩擺，attack 0.62s 先蓄 0.26 再落。

**比例數字（silmetrics，括號為 `shield`／`tiger_c`）**

> ⚠ silmetrics 的 `side`／`front` 是**依最長水平軸**命名，不是依模型朝向。這隻 X(0.960) > Z(0.677)，所以它印的頂層 `W_over_H` 其實是**模型正面**、`front` 那組是**模型側面**。下表已換算成模型朝向。（judge 的 `front`／`side` 則是真的模型朝向，兩支工具口徑不同，別混用。）

| 指標 | flag（出貨） | shield | tiger_c |
|---|---|---|---|
| 模型尺寸 (W,H,D) | **0.960 / 1.105 / 0.677** | 0.904 / 1.130 / 0.582 | — |
| 正面剪影 W/H | **0.88** | 0.77 | — |
| 側面剪影 W/H | **0.61**（香火目標 ≥0.9，**未達**） | 0.46 | — |
| `fill`（正面） | 0.531 | 0.676 | 0.454 |
| `mass_thirds` | 0.408 / 0.506 / 0.086 | 0.293 / 0.428 / 0.279 | 0.371 / 0.397 / 0.232 |
| `turn_count` | **35** | 32 | 30 |
| 頭高佔全高 `height_ratio` | **0.249**（守則手段①要求 ≤0.25 或 ≥0.5，離開玩偶區） | — | — |
| GLB | **396.7 KB** | 210.6 KB | 287.8 KB |
| 三角形 | **2816** | 2000 | 2628 |

**側視 W/H 0.61 vs 聖經目標 0.9 的取捨**：要把側視 W/H 推到 0.9，只有兩條路——把全高壓到 ~0.75（旗尖就進不了「高過頭頂」的招牌剪影，簡報 B 群靠這一條跟 `ashcharm` 分開），或把前後深度加到 ~1.0（正面寬就得跟著 ≥1.0 才守得住 M-A2 的 ward 硬條件，而 `creature-preview.html` 的單隻鏡頭是照高度 ≲1.25 調的，框不下）。**M-A2 是閘門、聖經這條是記錄項**，所以我保 M-A2（1.42×）並把這條記成未達。要改需要主對話裁定。

---

## ④ 指令原文與實際輸出

`<AC>` ＝ `C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature`，`<WT>` ＝ 本 worktree 根目錄。python 指令都帶 `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`。

### M-A0 — 引擎編譯（出貨版＝17:30 硬化後的 r10）

```
$ node <AC>/engine/cli.js <WT>/assets/creatures/flag.json <AC>/out/flag/r10.glb
{"ok":true,"out":"out/flag/r10.glb","bytes":406200,"verts":5401,"faces":1595,
 "joints":24,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.563}}
```

硬化前（r9，＝第 3 輪讀者看到的那一版）：`bytes 406200 / verts 5401 / faces 1595 / meanOcc 0.563` —— **逐字相同**。

```
$ cmp <AC>/out/flag/r9.glb <AC>/out/flag/r10.glb
out/flag/r9.glb out/flag/r10.glb differ: char 7851, line 1
```

（剩下的編譯輸出都是 `info:` 與 `warn: part_overlap`；`part_overlap` 主要來自旗面 `fin` 的包圍盒很大，把鬃鬈與桿都「框」了進去——實際幾何以肉眼在 hero／front／side 渲染圖上核對過沒有穿模，見 ⑦-5。）

### M-A0／M-A3 — 出貨 GLB 本身

```
$ python _tmp.py   # 直接讀 GLB 的 JSON chunk，跑完已刪
{"file": "assets/creatures/flag.glb", "bytes": 406200, "kb": 396.7,
 "animations": ["idle", "move", "attack"], "skins": 1, "joints": 24, "meshes": 1, "primitives": 18,
 "materials": ["stone_body","stone_head","stone_jaw","tail_stone","stone_leg","mane_curl","ear_plate",
               "nose_stone","eye","maw","fang","sash","sash_knot","pole_wood","gold_trim",
               "flag_cloth","glow_flag","paw_stone"],
 "attributes": ["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"], "images": 0, "textures": 0,
 "asset": {"version": "2.0", "generator": "anyCreature v1.2.0",
           "extras": {"harness": "anyCreature", "harness_version": "1.2.0", "spec": "flag"}}}
```

逐條：**396.7 KB ≤ 400 KB** ✅／三支動畫 ✅／`skins`=1 ✅／`COLOR_0` ✅／0 貼圖 ✅／
**M-A3**：簡報 `flag` 列指定的 **`eye`**、**`glow_flag`** 原樣在 materials 裡 ✅（沒有多開第三個發光材質；`maw` 是不發光的暗赤口腔，命名刻意不用 `glow_` 前綴，免得被 `js/creature-figures.js:51` 的 `/^glow_/` 吃進 emissive）。

### M-A0 — judge 對 spec 全檢（claims 動手建模前就寫定，門檻全程一格未動）

```
$ node <AC>/harness/judge.mjs <AC>/out/flag/r10.glb <AC>/out/flag/judge_r10 flag \
      --spec <WT>/assets/creatures/flag.claims.json
"stats":{"triangles":2816,"skinnedMeshes":18,"animations":["idle","move","attack"]}
"lum":{"front":40.2,"side":38.1,"tq":41.1,"reartq":32.9,"top":49.3}
"hi_sat_share":{"front":0.1685,"side":0.1009,"tq":0.1714,"reartq":0.0946,"top":0.2034}
"whole":{"size":[0.960,1.105,0.677]}
stone_body front=0.13710   stone_head front=0.11349 side=0.08107
mane_curl  front=0.14509 side=0.14053   flag_cloth front=0.07077 span=0.5034
glow_flag  front=0.03275 side=0.04710   eye front=0.00913   maw front=0.01231
fang       front=0.02415              sash_knot front=0.00000
[judge] Spec "媽祖令旗 flag_mazu_lingqi (xianghuo/ward)" — all claims pass.
```

各條的實際數字對門檻：
- `part_exists` `flag_cloth`／`glow_flag`／`eye` — 三個材質名都在 materials 清單裡 ✅
- `part_signature` `flag_cloth`（view front）：share **7.077%**（需 ≥7%，**這一路過**）**且** span **0.5034**（需 ≥0.15，**這一路也過**）→ 兩路都過 ✅（shield 當初只過了 span 那一路）
- `part_visible` `stone_head`（view front）：**11.35%**（需 ≥4%）✅
- `part_visible` `mane_curl`（view side）：**14.05%**（需 ≥2%）✅ ←本檔相對 shield **加嚴**的那一條（真實參照特徵 1 的機械化）
- `focal_contrast` `stone_body` : `glow_flag`（view front）＝ 13.71% : 3.28% ＝ **4.19×**（需 ≥3）✅
- `share_hierarchy`（view front）＝ **64.5 : 31.0 : 4.5**（目標 60:30:10，容差 ±15pp，最大偏離 **5.5pp**）✅
- `style_dark`（view front，識別視角）：**40.2**/255（需 ≤90）✅
- `saturation_area`（view tq）：**17.14%**（凍結檔的帶 10–60%）✅
- `tri_budget`：**2816**（1500–5000）✅
- `rig_skinned` / `anim_named`：skins=1、18 個 skinned mesh、三支動畫齊 ✅

### M-A2 — ward 正面寬 ≥ 側面寬

```
$ node <AC>/harness/silmetrics.mjs <AC>/out/flag/r10.glb <AC>/out/flag/sil_r10
{"W_over_H":0.88,"fill":0.531,"mass_thirds":[0.408,0.506,0.086],"torso_depth_max":0.96,
 "torso_depth_min":0.11,"mass_contrast":9.06,"leg_fraction":0.077,"turn_count":35,
 "zigzag_alignment":0.81,"front":{"W_over_H":0.61,"fill":0.559},
 "top":{"W_over_H":0.73,"fill":0.538},"hero":{"W_over_H":0.76,"fill":0.512}}
```

兩組獨立數字：
1. **模型 bbox**：X（正面寬）**0.960** vs Z（側面寬）**0.677** → **1.42×**。
2. **等高剪影**：silmetrics 兩個正交視角用同一組相機距離與 FOV、模型高度相同，`W_over_H` 直接可比——模型正面 **0.88** vs 模型側面 **0.61** → **1.44×**。

證據圖：`docs/experiments/2026-09-04-creature-flag-front.png`（judge 的模型正面實彩渲染，看得到方座＋兩根前肢石柱＋鬃圈＋背後斜插的旗）；`<AC>/out/flag/sil_r10/sil_side.png`（正面剪影）與 `sil_front.png`（側面剪影）。

### 三張截圖（全部用出貨版 r10 重拍）

```
$ node <AC>/harness/hero.mjs <AC>/out/flag/r10.glb <AC>/out/flag/hero_r10
{"ok":true,"margin":8.4}        →  複製成 docs/experiments/2026-09-04-creature-flag-hero.png

$ node tests/tools/creature-shoot.mjs docs/experiments/2026-09-04-creature-flag-stage-lit.png \
      "glb=flag.glb&light=1&fx=1&rim=xianghu" idle 8805
{"out":"docs/experiments/2026-09-04-creature-flag-stage-lit.png",
 "query":"glb=flag.glb&light=1&fx=1&rim=xianghu","phase":"idle",
 "fps":59.88,"calls":26,"loadMs":230,"particles":44,"errors":[]}

judge 的 flag_beauty_front.png  →  複製成 docs/experiments/2026-09-04-creature-flag-front.png
```

- `errors` 是空陣列（`console.error`／`pageerror` 兩種來源都收）。
- `fps 59.88` 是無頭 chromium 的 vsync 上限，**不是效能數字**。
- stage-lit 是 `creature-shoot.mjs` 的原始輸出 1688×780，**只做了一次純裁切**到 520×780（把兩側空地裁掉），沒有縮放、沒有調色。
- `?glb=` 只吃檔名不補副檔名，寫 `glb=flag.glb`（沿用 redhat／sword 報告的提醒）。
- `tools/anyCreature` 在 `.gitignore` 裡、worktree 沒有這個目錄，所以用 `New-Item -ItemType Junction` 借主樹的 `node_modules` 給 `creature-shoot.mjs` 用，截完圖後 `(Get-Item ...).Delete()` 移除（已核對主樹 `node_modules/playwright` 完好）。

### M-A4 — 範圍

```
$ git status --short
?? assets/creatures/flag.claims.json
?? assets/creatures/flag.glb
?? assets/creatures/flag.json
?? docs/experiments/2026-09-04-creature-flag-front.png
?? docs/experiments/2026-09-04-creature-flag-hero.png
?? docs/experiments/2026-09-04-creature-flag-report.md
?? docs/experiments/2026-09-04-creature-flag-stage-lit.png
?? docs/experiments/2026-09-04-ref-flag.md

$ git diff --stat HEAD
（空）
```

八個全新檔，`index.html`／`js/`／既有 creatures／anyCreature 引擎**一個位元組都沒動**。臨時檔（`_patch_tmp.py`、`_crop_tmp.py`、`_blind/`、`tools/anyCreature` junction）都已刪除，不在 diff 裡。**未 commit、未 push。**
（真實參照照片下載在 `<AC>/out/ref/flag/`，那是 gitignore 的輸出目錄，不進 diff；來源與授權記在 `2026-09-04-ref-flag.md`。）

---

## ⑤ 改了哪些檔（檔案:行號）

全部是新檔，既有檔案一行未動。

| 檔案 | 行數 | 內容 |
|---|---|---|
| `assets/creatures/flag.json` | 1–255 | anyCreature 規格。設計註記 `2–9`、`palette` `11–30`、`joints` `36–63`（body／head／jaw／tail／LFront 五條鏈＋鬆散關節 `FlagMast`）、chains・attach・mirror・touch `65–74`、`volumes` `76–130`、`parts` `132–220`（鬈鬃 ×17、耳板、眉脊、鼻樑脊、頰墊、發光眼、口腔、獠牙、紅綢與綵球、旗桿與槍尖、**旗面三角 fin**、金繡邊、火舌 ×6、掌與石爪）、三支動畫 `222–254` |
| `assets/creatures/flag.claims.json` | 1–110 | judge.mjs 的機械檢查清單。基底＝`tiger_c.claims.json`／結構沿用 `shield.claims.json`；相對基底只有「換量測視角」與「加嚴」兩類改動，**動手建模前寫定、全程一格未動** |
| `assets/creatures/flag.glb` | — | 406,200 bytes，引擎輸出（r10＝17:30 硬化版） |
| `docs/experiments/2026-09-04-ref-flag.md` | 1–58 | 真實參照文件（三張照片來源／授權／一句描述／六條一眼特徵清單／翻譯成幾何的對照表／刻意不照抄之處） |
| `docs/experiments/2026-09-04-creature-flag-hero.png` | — | anyCreature `harness/hero.mjs`，1024²，margin 8.4% |
| `docs/experiments/2026-09-04-creature-flag-stage-lit.png` | — | 戲台 3/4（`creature-shoot.mjs`，`light=1&fx=1&rim=xianghu`），裁切至 520×780 |
| `docs/experiments/2026-09-04-creature-flag-front.png` | — | judge 的模型**正面**實彩渲染（ward 的識別視角） |
| `docs/experiments/2026-09-04-creature-flag-report.md` | — | 本檔 |

---

## ⑥ 這一隻踩到、下一隻會再遇到的引擎事實（附件之外的新發現四條）

1. **★ 部位掛在「鬆散關節」上，`part_attachment` 會被整條略過。**
   `compile.js:569` 算 `hostChain` 的方式是「`anchor.chain`，否則找**包含 host joint 的 chain**」；鬆散關節（`joints` 裡有、任何 `chains` 都沒有、靠 `attach` 掛住的那種，`skeleton.js:59` 的第 4 類）不屬於任何 chain → `hostChain` 是 `null` → `checks.js:306` 的 `if (!m.part || !m.hostChain) continue;` 直接跳過。
   **好處**：這是把「令旗要能獨立動、獅子不動」做出來的唯一乾淨路徑（旗、桿、六條火舌全部 skin 到 `FlagMast` 一根骨頭，`attack` 只轉那一根）。
   **代價**：這些部位的貼合**完全沒有機器在守**——比 shield 報告 ⑥-3 的「綠燈不代表貼合」更徹底，是**根本沒被檢查**。對策：把鬆散關節本身放進宿主體積深處（本檔 `FlagMast [0.030,0.435,-0.078]`，該高度 body half-width 0.28、half-depth 0.198），並把旗面三角形的 A 角、旗桿根部都寫成埋在體內的座標；剩下的只能靠肉眼看 hero／front 圖。**下一隻若也用鬆散關節，報告要明寫這一條沒有機械證據。**
2. **★ 「嘴張開」不是把下顎鏈往下移就會有，要算上下兩個體積的表面高度差。**
   本檔前兩版 `maw`（暗赤口腔）在 judge 的**五個視角 share 全部是 0.000**——因為下顎體積的頂緣（`JawRoot.y + jaw.rh`）一直高過頭部體積的底緣（`head.y − head.rh`），兩塊實體整段互相包住，口腔被夾在裡面完全看不見。要有可見的裂口，必須讓**下顎頂緣在吻部那一段低於頭部底緣**：本檔把 `Jaw1` 的 `up` 從 −0.030 一路壓到 **−0.135**，裂口才出現（`maw` front share 0 → **1.23%**，第 3 輪兩位讀者都主動寫出「嘴內是暗紅色」）。**`part share == 0` 是最便宜的「這東西根本沒被看見」探針，比看圖可靠**——本檔的 `sash_knot` 至今仍是 0（⑦-3）。
3. **★ 近黑石材會被讀成「黑色絨毛」，不是「石雕」。**
   前兩輪四位讀者一律說「**黑色**」小獅／巨獅，並直接連到「玩具／可愛」。把 `stone_*` 從 `#34322e`（lum≈50）提亮到 `#56524b`（lum≈80）之後，judge 的 front 中位亮度只從 33.3 升到 **40.2**（離 `style_dark` 的 90 還很遠，因為 AO meanOcc 0.56 與 `shading.gradient.bottom −0.88` 把下半身壓回去了），但第 3 輪兩位讀者的用詞就變成「岩石」「粗糙厚重」「圖騰化的猛獸」。**「深底」不等於「近黑」**——`style_dark ≤90` 這條門檻留的空間比大家用掉的多很多，香火／祖靈的石材類生物值得往 lum 70–85 走。**這條建議寫進硬化批的附件。**
4. **`type:"eye"` 不帶 `anchor` 時的 `face`／`spread`／`height` 三參數比 `anchor` 好用得多。**
   用 `anchor:{t,around}` 時眼睛沿著頭部超橢圓表面跑，`around` 差 4° 就從眉下滑到耳前（本檔試過 56/60/64 三個角度都不對）；改成 `{"host":"Brow","face":0.050,"spread":0.125,"height":0.045}` 是**在宿主關節的局部座標直接下座標**（`compile.js:280` 的 else 分支：`c = host + fwd*face + side*±spread + up*height`），改頭部比例時只要跟著改一個數。代價是眼睛不再自動貼合表面，要自己確認它有露出來（本檔 `eye` front share 0.91%）。

---

## ⑦ 沒做到／留給主對話裁定的事（誠實條）

1. **硬化版沒有再送盲讀。** 依 17:30 修訂「盲讀併入剪影三秒測試批次補讀」，且硬化前後的 `bytes`／`triangles`／silmetrics 全部逐字相同、hero 肉眼無可辨差異（量化在 ①）。這是「**沒做**」不是「做了通過」。
2. **耳朵 6/6 讀者都沒讀出來。** `ear_plate` 在側視有 4.2% 但在正面只有 0.5%——它被 17 顆鬈鬃夾在中間，輪廓上完全溶進鬃圈。真實參照特徵 ② 等於沒有兌現。要補最直接的是把耳板往外挪並加大 50%、同時把顱側那對鬈鬃往後移，但那會削弱特徵 ①（鬃圈是 6/6 命中的那一條），本卷沒有動，交主對話定優先序。
3. **胸前綵球（真實參照特徵 ④）機器量到 0、肉眼讀成「傷痕」。** `sash_knot` 被下顎與兩根前肢石柱夾住，judge 五個視角 share 全 0；四位讀者一致把那抹暗紅讀成「胸口的傷疤／標記」。這在氣質上不算壞（暗紅胸標其實加強了兇相），但**它不是我設計的東西**——要真的讀成綵球，得把它往前下方挪出下顎的遮擋、並放大到 1.5 倍，代價是會吃掉 `saturation_area` 預算並可能壓低 `stone_body` 的 front share（`focal_contrast` 已經只有 4.19×，餘裕不大）。本卷沒動。
4. **ART_BIBLE 香火的「側視 W/H ≥0.9」未達（0.61）**，取捨理由寫在 ③ 末。這條與 M-A2 的 ward 硬條件、與「旗尖高過頭頂」的招牌剪影**三者互相拉扯**，需要主對話定哪個優先。
5. **`part_overlap` 有一批 warn 沒有清乾淨。** 主要來自旗面 `fin` 的包圍盒很大，把鬃鬈、旗桿、火舌都「框」了進去（引擎是用包圍盒判 % 的）。我逐張看 hero／front／side 渲染圖核對過沒有實際穿模，但這是**肉眼證據不是機器證據**。
6. **ART_BIBLE §6 的「剪影三秒測試」本卷沒做**——那是每兩批一次的批次閘門、需要多隻拼圖才跑得起來，留給主對話在合併批 3 之後執行（硬化版的盲讀也併在那裡）。
7. **沒有量效能、沒有接進正式對決。** M-A0～A4 沒有要求就沒做；`creature-shoot` 順手回報的 `fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。
8. **`?n=3` 橫排沒拍。** M-A2 只對 swarm 要求橫排截圖、ward 要的是正面寬數字（已附），所以沒拍——但 `flag` 在 POOL 裡是**隻數 2**，實戰會有兩隻同場，值得在接線卷補一張。

## ⑧ DEVLOG 一行

`gates: M-A0/A1/A2/A3/A4 全 PASS | M-A1 pass@r3 2/2（6/6 讀成獅/石獅/守護獸、6/6 讀出背插三角火焰旗、r3 主印象「威嚴多於邪惡」「野性威嚴」、真實參照特徵各命中 5/6）；風格牆指標 5/6 位把圓潤歸因低多邊形渲染 | 396.7KB/2816tri/judge all pass/ward 1.42×/turn_count 35 | 17:30 模板規則已套：build:rigid 原有、exp 全檔提到 ≥4.6、smooth_angle 26＋volume faceted（硬化前後 bytes/tri/silmetrics 逐字相同，截圖已用硬化版重拍） | restarts: 白香灰帶被讀成面罩→拿掉、大眉脊被讀成機器人面罩→拆成怒眉+鼻樑脊+頰墊、火舌像蠟燭→改貼邊捲曲、近黑→風化灰石(lum 50→80)、嘴一直是閉的(maw share 0)→下顎壓到 −0.135 | unresolved: 耳朵 6/6 沒讀出來、綵球 share 恆 0 被讀成傷痕、香火側視 W/H 0.61<0.9、硬化版未補盲讀`
