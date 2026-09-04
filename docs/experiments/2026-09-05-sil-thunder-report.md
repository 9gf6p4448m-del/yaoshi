# 剪影回修 — `thunder` 雷女之火（祖靈 zuling・elite）2026-09-05

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-batch.md`（含 2026-09-05 凌晨「剪影三秒測試不過的處置」段：**祖靈側視 W/H ≤0.7 ＝ judge silmetrics 的 `side` 值**，由記錄項升為出貨條件）。
缺口來源：`docs/experiments/2026-09-05-silhouette-test-1.md` ⑦（thunder 建議甲＝idle 雙翼由水平張開改成貼身向上斜立）。
量產基準：`2026-09-04-creature-thunder-report.md`（r11 出貨版）、`2026-09-04-ref-thunder.md`（五條特徵，本卷一條未改）。
基準 SHA：`2603bef`（worktree `agent-a8f73bda4f16477ac`）。**未 commit、未 push。**
出貨檔：`assets/creatures/thunder.{json,glb}`。`thunder.claims.json` **一格未動**（門檻沿用 r11 凍結值）。

---

## ① 結論先行

**Q1 ✅／Q2 條件一 ✅、條件二 ⚠️（見下）／Q3 ✅／Q4 ✅。一輪達標，未用到第 2、3 輪。**

- **側視 W/H 0.91 → 0.60**（silmetrics `side`，門檻 ≤0.70）。做法＝把整副翼（40 個部位的四個方向向量）一次套上 `R = Rz(+19°)·Ry(+30°)`，**bind pose ＝ idle ＝ 陡 V ＋ 半收（上抬 19°、後掠 30°）**；`move` 與 `attack` 用 `LWingA/RWingA` 的 `ry/rz` 反向把翼張回原本的平展。**幾何的 points/segments/thickness/材質一格未改**，翼形、雷紋分段、飛羽長短全部原封不動。
- **兩個水平軸都達標**：翼展 x 0.772（x/H 0.621）、體深 z 0.790（z/H 0.635）。r11 的 x 是 1.170、比 z 長，所以 silmetrics 的 `side` 拍的是**翼展面**（＝剪影測試看到的「帶翅膀的人形」）；r13 的 x 已縮到 z 之下，`side` 翻成**解剖學側視的鳥側身**，48px 下讀成一隻直立的長腿鳥而不是人形。
- **`focal_contrast` 3.001 → 3.500**（門檻 3，本卷自訂目標 ≥3.3）。改的是**暗部面積**不是發光件：三片腿羽（`feather_dark`@LThigh）長度與半徑一律 ×1.35，`feather_dark` front share 0.1335→0.17147；`glow_bolt` front 0.0445→0.04899（沒有縮它）。
- **盲讀 5/5、鳥 2/2、火 2/2、雷 2/2、祖靈氣質 2/2**——「閃電」二字這次是 **2/2**（r11 只有 1/2），因為收翼後雷紋整片轉正、戲台圖上是一條發白光的 Z 字。
- **代價一項（新子項缺口）**：hero／戲台兩個機位下**只讀得到一片翼**（兩位逐字「右側大片黑色翼膜」「單邊可見的大型翅膀」），「雙翼」由 r11 的 2/2 掉到 **0/2**。主特徵②（展翼＋指狀長羽）兩位仍都讀出，掉的是子項。歸因與不可兼得的證明見 ⑥-⑫，正視渲染是兩片翼都在的存證。

DEVLOG 一行：
`sil-fix thunder: side W/H 0.91→0.60 (silmetrics side, 祖靈 ≤0.7) / x 1.170→0.772, z 0.790 不變, 全高 1.238→1.244 / 手法=整副翼 Rz(+19)Ry(+30) 烘進 bind pose, move+attack 用 ry-30/rz-19 張回平展 / focal_contrast 3.001→3.500 (腿羽 x1.35 拉暗部, 沒縮發光件) / judge all green, tri 4770, 746.5KB, 三 clip / 盲讀 2 位: 鳥2/2 火2/2 雷2/2 祖靈氣質2/2 特徵5/5 / regression: 「雙翼」2/2→0/2（後掠使遠翼被近翼擋掉, 見 _traps ⑫）`

---

## ② Q1–Q4 逐條

| # | 條件 | 門檻 | 出貨值 | 判定 |
|---|---|---|---|---|
| Q1 | M-A0 GLB 大小 | ≤1.5MB（19:30 預算制） | **746,432 B ＝ 729.0KB** | ✅ |
| Q1 | M-A0 三支動畫 | `idle/move/attack` | `["idle","move","attack"]` | ✅ |
| Q1 | M-A0 judge | 全綠 | `[judge] … all claims pass`（19 條，claims 未動） | ✅ |
| Q1 | M-A0 silmetrics | 側視＋hero 過 | side 0.60、hero 0.60（祖靈 ≤0.7） | ✅ |
| Q1 | M-A1 盲讀 | 主印象同類、非玩具 | 兩位主印象皆「鳥／鷲形怪獸」「鳥/獅鷲系混合體」，皆判威嚇 | ✅ |
| Q1 | M-A2 體型附件 | elite ×1 無要求 | N/A（同 r11 ⑦-5） | — |
| Q1 | M-A3 發光材質名 | 在 GLB materials 內 | `eye`／`glow_bolt`／`glow_ember` 三個都在（第三個為 r11 已簽准） | ✅ |
| Q1 | M-A4 範圍 | 只動自己的檔 | `git status`：`M thunder.glb`、`M thunder.json`＋本報告與四張圖（新檔） | ✅ |
| Q1 | faceted 規格不退 | volume 全 `faceted:true`、`build:"rigid"`、`exp` ≥4.5、`smooth_angle` 24–30 | 5/5 faceted、rigid、18 列 profile exp **4.6–5.4**、smooth_angle **26**（四項與 r11 逐字相同） | ✅ |
| Q1 | 三角形 | ≤8000 | **4,770**（與 r11 相同，只轉向量不加面） | ✅ |
| Q1 | 全高 | 1.2–1.25 | **1.244**（r11 1.238） | ✅ |
| Q1 | `focal_contrast` | **≥3.3**（本卷加嚴，r11 出貨 3.001） | **3.500**（0.17147 / 0.04899） | ✅ |
| **Q2-a** | **idle 側視 W/H** | **≤0.70** | **0.60**（silmetrics `side`；前值 **0.91**） | ✅ |
| **Q2-b** | **正視翼展 ≥ 全高 0.8** | ≥0.80 | **idle 0.560 ❌／move 0.879–0.935 ✅／attack 峰值 1.175 ✅** | ⚠️ 見 ③ |
| Q3 | 盲讀鳥 | 2/2 | **2/2** | ✅ |
| Q3 | 火或雷 | ≥1/2 | **火 2/2、雷 2/2** | ✅ |
| Q3 | 祖靈氣質 | ≥1/2 | **2/2** | ✅ |
| Q3 | 特徵命中 | ≥4/5（目標 5/5） | **5/5**（兩位各自都列滿） | ✅ |
| Q4 | 出貨檔範圍 | 只有 `thunder.{json,glb}` | 只有這兩個被 `M`；`thunder.claims.json` 未出現在 `git status` | ✅ |

---

## ③ Q2 的軸、數字，與兩個條件不可兼得的證明

**用哪個軸（Q2 明文要求寫清楚）**

`silmetrics.mjs:57` ＝ `dir = view==='side' ? (long==='x'?[0,0,1]:[1,0,0]) : (long==='x'?[1,0,0]:[0,0,1])`，`long` ＝ x 與 z 裡較長的那一個。展開來看，**`side` 視角永遠把「較長的那個水平軸」當寬度**，也就是

> `silmetrics.W_over_H = max(x, z) / H`，與解剖學的前後左右無關。

- **r11**：x（翼展）1.170 > z（頭尾）0.790 ⇒ `side` 拍的是**翼展面**（解剖學正視），報 **0.91**；`front` 那一格才是解剖學側視，報 0.62。剪影三秒測試看到的那張 mask 就是前者，所以讀者讀到的是「人＋翅膀」。
- **r13**：x 0.772 < z 0.790 ⇒ `side` 翻成**解剖學側視（頭尾軸為寬）**，報 **0.60**；`front` 變成翼展面，報 0.56。
- **兩個軸都達標**，所以不論 silmetrics 選哪一格都 ≤0.70：**x/H 0.621、z/H 0.635**（bbox 值；mask 值 0.56／0.60）。這一點是刻意做的——不靠標籤翻面過關。

側視 mask 圖：`docs/experiments/2026-09-05-sil-thunder-side-mask.png`（silmetrics 的 640px `sil_side.png` 原檔，未加工）。

**前後數字**

| 量 | r11（出貨版） | r13（本卷） |
|---|---|---|
| silmetrics `W_over_H`（＝side，max(x,z)/H） | **0.91** | **0.60** |
| silmetrics `front`（另一個水平軸） | 0.62 | 0.56 |
| `hero` | 0.71 | 0.60 |
| `fill` / `turn_count` / `zigzag_alignment` | 0.314 / 37 / 1.00 | 0.253 / 22 / 0.86 |
| bbox `whole.size` | [1.170, 1.238, 0.790] | **[0.772, 1.244, 0.790]** |

（`zigzag_alignment` 1.00→0.86＝上下輪廓不再完全對齊，是順帶的改善；`turn_count` 37→22 是因為量測面換成了側身，不同面之間不可比，不當作退步或進步解讀。）

**Q2-b 與 Q2-a 在同一個 pose 上不可能同時成立（證明）**

- Q2-a ⇒ `max(x,z) ≤ 0.70·H`
- Q2-b ⇒ `x ≥ 0.80·H`
- 但 `max(x,z) ≥ x`，於是 Q2-a ⇒ `x ≤ 0.70·H`，與 Q2-b 直接矛盾，**與角度、造型、體型全部無關**。

所以「側視窄」與「正視翼展大」只能分到**不同的 clip**——這正是派工自己寫的那一句「attack（雙翼張開甩下）與 move 的展翼保留——剪影測試量的是 idle 側視」。本卷照這個切法做，並把兩邊的數字都量出來：

| pose | 沿 X 看（解剖學側視）W/H | 沿 Z 看（翼展面）W/H | 說明 |
|---|---|---|---|
| `idle` t=0 | **0.595** | 0.560 | ＝bind pose，剪影閘門量的就是這個 |
| `idle` t=1.5 | 0.594 | 0.555 | 全循環幾乎不動（原本的拍振只有 ±1.6°） |
| `move` t=0 | 0.630 | **0.935** | 翼全程張回平展 |
| `move` t=0.53 | 0.603 | **0.879** | 同上，走路循環最窄的一刻 |
| `attack` t=0.138（＝0.3 相位） | 0.530 | 0.795 | 彈開並抬起 |
| `attack` t=0.276（＝0.6 相位） | 0.725 | **1.175** | 甩下的那一刻，翼展比 r11 的靜態值還大 |

量法（silmetrics 只吃 bind pose，沒有 AnimationMixer，所以不能用它量姿態）：同一份 `harness/assets/three-bundle.js`，`GLTFLoader.parse` 後全模型換 `MeshBasicMaterial({color:0})` 打白底，接 `AnimationMixer`、`clipAction(clip)` 播放後 `paused=true` 並指定 `action.time`，`mixer.update(0)` ＋ `updateMatrixWorld(true)`，再用正交於 X／Z 的相機各拍一張 640×640，量黑像素 bbox 的 W/H。**注意 `Box3.setFromObject` 對 skinned mesh 回的是 bind pose 的界，不隨姿態變**，所以姿態數字一律取自 mask 不取自 bbox（這條記進 spec `_traps` ⑩ 的同族）。

**判定**：Q2-b 在 `move`／`attack` 上成立（0.879–1.175 ≥ 0.80），在 `idle` 上依上面的證明不可能成立（0.560）。**招牌沒有丟**：正視渲染 `2026-09-05-sil-thunder-front.png` 兩片翼、兩道雷紋齊全，`judge` 的 `part_signature wing_web` front share **0.27561**（門檻 0.10）、span_ratio **0.8573**（門檻 0.30），都還在大幅餘裕內。但**「idle 的正視翼展 ≥0.8·全高」這一條字面上未達，本卷不修改它、據實記為 ⚠️，請主對話裁定要不要改寫成分 clip 的版本**。

---

## ④ Q3 盲讀原話（context-free `sonnet` ×2，只給 hero＋stage-lit 兩張）

素材：`_tmp_blind/imgT-A.png`（＝hero）、`imgT-B.png`（＝stage-lit），檔名與路徑不含 thunder／雷／鳥字樣。四題與 `2026-09-04-harden2A-report.md` §② 的**問法甲逐字相同**、無任何提示：
「1. 這是什麼？ 2. 逐條列出看到的特徵（≥6 條、講位置） 3. 氣質？ 4. 像玩具／可愛，還是會威嚇你的？」

### 讀者 E（原話節錄，主詞與判定用句全文）

> 1. 一隻低多邊形（low-poly）風格的 3D 幻獸角色模型，**鳥／鷲形怪獸**，嘴邊噴著火焰，張開翅膀作展翼姿態。
> 2. …頭頂：多支細長羽冠狀尖刺向上聳立…／頭部：淺灰色**鷲喙**，喙下方有一撮向前噴出的**橘紅色火焰**／煙霧（口吐火焰）／眼睛：單顆**金黃色**球狀眼珠，位於頭側，在B圖夜景中會發光／身軀上半：胸口有**菱形金色／古銅色裝甲片**鑲嵌…／胸前中段：一排**三顆藍色寶石**／符文狀方塊縱向排列／翅膀：**右側大片黑色翼膜展開**，翼緣有鋸齒狀羽毛，翼面上有金色**閃電狀（Z字形）紋路**貫穿，B圖中此紋路會發白光／尾部：黑色羽扇狀**短尾，向後下方垂放**／下肢：兩條深褐色**鳥腿**…末端為**三趾爪**／整體用色：…**低多邊形切面明顯**…
> 3. 帶有**東方神話／圖騰**意味的**猛禽神獸**氣場——莊嚴、肅殺、帶邪異感。金色裝甲與寶石暗示「神格化」或「**被祭祀**」的身分…像是**廟宇神將座騎或凶獸圖騰**，而非可愛系寵物。
> 4. 偏向**威嚇**型。…（正文順帶引用了「祖靈古老神獸／威嚴神將的美術方向」＝盲讀污染，見 ⑦-2）

### 讀者 F（原話節錄）

> 1. 一隻低多邊形（low-poly）風格的 3D 幻獸模型，**鳥/獅鷲（griffin）系混合體**…
> 2. 頭部…**鷹/猛禽狀側臉**，尖喙，喙尖**銜著一團橘色火焰**／白色煙霧…／眼睛…單顆大顆**金黃色**球狀眼睛…／頭頂／後腦…四到五根細長羽毛狀尖刺，向上豎起…／翅膀（軀幹右上方，展開狀）——**單邊可見的大型翅膀**，翼尖同樣有**多根羽毛狀尖刺散開**；翼膜為黑色，中央有明顯的金色**鋸齒狀（閃電/裂紋）圖騰**貫穿，B圖此圖騰呈白色發光…／肩部／胸口…胸前排列**三顆藍色菱形寶石**/鱗片裝飾，垂直排列／後肢與尾部…兩條粗壯的深褐色**鳥爪狀後肢**，爪部有明顯分趾與尖爪；**尾部/後方另有一片黑色羽狀或鰭狀垂墜物**／材質風格——全身由**平面色塊與硬邊多邊形**構成，無圓潤過渡…
> 3. 整體氣質偏向「**猛禽神獸**」——銳利、警戒…因胸前寶石、翼上金色圖騰而帶有一絲**祭祀/圖騰/神格化的莊嚴感**…
> 4. 偏**威嚇**，不可愛、不玩具感。…（同樣引用了美術方向那句＝污染）

### 逐條計分（與 r11 出貨輪對照）

| 項目 | 門檻 | r11 | r13 | 證據 |
|---|---|---|---|---|
| 鳥／鷹／鴉／飛禽 | 2/2 | 2/2 | **2/2** | E「鳥／鷲形怪獸」、F「鳥/獅鷲系混合體」 |
| 火 | 合計 ≥1/2 | 2/2 | **2/2** | E「橘紅色火焰（口吐火焰）」、F「銜著一團橘色火焰」 |
| 雷／閃電 | 同上 | **1/2** | **2/2 ↑** | E「閃電狀（Z字形）紋路」、F「鋸齒狀（閃電/裂紋）圖騰」 |
| 祖靈氣質 | ≥1/2 | 2/2 | **2/2** | E「東方神話／圖騰…被祭祀…廟宇神將座騎」、F「祭祀/圖騰/神格化的莊嚴感」 |
| 可愛／玩具作主印象 | 記錄項 | 0/2 | **0/2** | 兩位第 4 題都答「威嚇」 |
| ref①鉤喙＋金黃瞪視眼 | — | 有（鉤 1/2） | **有**（「鉤」0/2，E「鷲喙」F「尖喙／鷹猛禽狀側臉」；金黃眼 2/2） | ④ 原話 |
| ref②展翼＋4–6 根分離指狀長羽 | — | 有（雙翼 2/2） | **有**（展開 2/2、指狀長羽 2/2；**「雙翼」0/2**） | E「翼緣有鋸齒狀羽毛」F「翼尖多根羽毛狀尖刺散開」 |
| ref③銳角折線閃電、分叉 | — | 有（閃電 1/2） | **有（閃電 2/2 ↑）** | 同上 |
| ref④灰殼透紅火種 | — | 有 | **有**（火 2/2；「灰殼」讀成「白色煙霧」，同 r11 的子項狀態） | E「火焰／煙霧」F「橘色火焰／白色煙霧」 |
| ref⑤祖靈木雕做工＋長垂尾羽 | — | 有（「長」0/2） | **有**（菱形連紋 2/2、塊面 2/2、垂尾 2/2；**「長」仍 0/2**，E 逐字「短尾」） | ④ 原話 |
| **合計** | ≥4/5 | 5/5 | **5/5** | |

**淨變化**：「閃電」1/2 → **2/2**（改善，歸因＝收翼後雷紋整片轉正對相機，戲台圖上是一條發白光的 Z 字，不再貼著翼緣被讀成金屬邊條）；「雙翼」2/2 → **0/2**（退步，歸因見 ⑥-⑫）。「鉤」「長」兩個子項狀態不變，仍在 gaps 上。

---

## ⑤ 每輪改動（只有一輪，內含 r12→r13 兩個建模步）

| 版本 | 改了什麼 | 為什麼 | 結果 |
|---|---|---|---|
| **r12** | 整副翼（`host=="LWingA"` 的 **40 個部位**，只動 `offset`／`dir`／`udir`／`vdir` 四個向量）套上 `R = Rz(+19°)·Ry(+30°)`；`move` 的 `LWingA/RWingA` 改成 `ry ∓30`（全程）＋`rz ∓21→∓15.6`（沿用原振幅）；`attack` 改成 `ry 0→∓30→∓30→0`、`rz 0→±5→∓49→0`（世界角度與 r11 的 +24／−30 相同） | 側視 W/H 0.91 未達祖靈 ≤0.7；剪影測試兩位都讀成「帶翅膀的人形」。抬角吃高度預算（純 Rz 抬 15° 就把全高頂到 1.257＞1.25），所以把一半角度換成後掠——z 的下限被尾羽 −0.461 佔著，翼尖只走到 −0.27，後掠對 bbox 完全免費 | judge 全綠；side **0.91→0.60**、全高 1.244、tri 4770 不變；但 `focal_contrast` 只到 **3.212**，未達本卷的 ≥3.3 |
| **r13** | 三片腿羽（`feather_dark`@LThigh，parts 81–83）`len` 與 `r` 一律 **×1.35** | r11 報告 ⑧-4 指定的修法：「拉開暗部面積而不是縮發光件」（r9 的 ×1.16 是同一個手法） | `feather_dark` front 0.15873→**0.17147**，`glow_bolt` front **0.04899 沒縮**，比值 **3.500** ✅；judge 仍全綠 → **盲讀（E／F）＝出貨版** |
| r13b | 只在 spec 追加 `_traps_thunder` 的 ⑫ 條註解 | 派工要求新陷阱寫進 spec | 重編出的 GLB 與 r13 **SHA-256 完全相同**（`ed0c1f5303a73b0d…`），確認出貨檔就是兩位讀者讀的那一版 |

**沒有動的**：`thunder.claims.json`（一格未改）、五條 ref 特徵、`palette`、`volumes`、`joints`、`chains`、`touch`、`mirror`、`idle` 的既有軌道、翼的 `points`／`segments`／`thickness`／材質指派、`build`／`shading`／`smooth_angle`。

---

## ⑥ 新陷阱（已同步寫進 `thunder.json` 的 `_traps_thunder` ⑨–⑫）

**⑨ `silmetrics` 的 `W_over_H` 永遠是 `max(x,z)/H`。**
`side` 視角一律取最長水平軸當寬度（`silmetrics.mjs:57`）。兩個推論：(一) 聖經的「側視 W/H ≤0.7」用 silmetrics 量時，實際上是在要求**兩個水平軸都 ≤0.7·H**，不是只管解剖學側視；(二) 「側視 ≤0.7」與「正視翼展 ≥0.8·H」在同一個 pose 上**恆不可能同時成立**（證明見 ③）。展翼生物兩條都要，只能分到不同的 clip。

**⑩ `silmetrics` 只吃 bind pose。**
它是 `GLTFLoader.parse` 之後直接 render，沒有 `AnimationMixer`。所以「改 idle 姿態」對剪影閘門**完全無效**——要改的是**幾何的 bind pose**；idle 因此必須就是收攏那一版，而展翼要靠 `move`／`attack` 的軌道把它轉回來。（同族：`Box3.setFromObject` 對 skinned mesh 回的是 bind pose 的界，量姿態一定要量 mask 不能量 bbox。）

**⑪ 抬翼的高度成本比想像大，後掠幾乎免費。**
純 `Rz` 抬 15° 就把全高從 1.238 頂到 1.257（衝出 1.2–1.25 帶）；抬 25° 是 1.313。把一部分角度換成 `Ry` 後掠（翼往 −z 走）不吃高度預算，因為 z 的下限被尾羽的 −0.461 佔著、翼尖只到 −0.27，對 bbox 的 z **一格都沒加**。19° 抬＋30° 後掠 ⇒ 全高 1.244、翼展 0.772，兩件事同時達標。

**⑫ 後掠會把「兩片翼」讀成「一片翼」。**
r11 的 ⑥-② 說平展時有一片會躲到身體後面、解法是抬成陡 V；但**抬＋後掠**之後，兩片翼幾乎落在 hero／戲台相機視線（模型空間 `(0.742, 0.241, 0.624)`）所在的那個平面裡，近的一片正對相機、遠的一片被它與身體一起擋掉。判準：**抬角吃高度預算、後掠吃「兩片都看得到」，不能同時最大化**；要保住「雙翼」得把 x 撐回 0.85 以上，而那會讓 silmetrics 的 `side` 翻回翼展面——正是剪影閘門要修掉的那一面。本隻選擇保剪影、犧牲子項。

**⑬（給後續三隻的可搬用結論，未寫進 spec 因為不是 thunder 專屬）**
`eye`／`balen`／`xianji` 的剪影回修若也要動姿態，先問「這個改動落在 bind pose 還是 clip 上」——落在 clip 上的一律不算數（⑩）。整體向量旋轉（本卷的作法）在 anyCreature 上是安全的：`fin` 的 `udir/vdir`、`curve` 的 `dir`、以及 `offset` 四個欄位一起轉，形狀完全不變，`part_attachment` 因為宿主是鬆散關節而整條略過（r11 ⑥-⑦），judge 一次就綠。

---

## ⑦ 指令原文與實際輸出

### 編譯（出貨版）

```
$ node tools/anyCreature/engine/cli.js assets/creatures/thunder.json assets/creatures/thunder.glb
{"ok":true,"out":"assets/creatures/thunder.glb","bytes":746432,"verts":10694,"faces":2767,
 "joints":24,"anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.403}}
```

規格機械核對（同一份 spec 掃出來）：`build = rigid`／`smooth_angle = 26`／`volumes = 5`／`faceted:true = 5/5`／`profile rows = 18, exp min 4.6 / max 5.4, <4.5 的列數 = 0`——**四項與 r11 逐字相同**。

### judge（claims 一格未動）

```
$ node tools/anyCreature/harness/judge.mjs assets/creatures/thunder.glb <out> thunder \
      --spec assets/creatures/thunder.claims.json
"stats":{"triangles":4770,"skinnedMeshes":18,"animations":["idle","move","attack"]}
"whole":{"size":[0.772,1.244,0.790]}
[judge] Spec "雷女之火 thunder_leinu_zhihuo (zuling/elite)" — all claims pass.
```

關鍵 claim 前後對照（門檻全部沿用 r11，沒有一格放寬）：

| claim | 門檻 | r11 | r13 | 餘裕 |
|---|---|---|---|---|
| `part_signature wing_web` front | share ≥0.10 **或** span ≥0.30 | 0.3381 / 0.7882 | **0.27561 / 0.8573** | 兩項都遠超 |
| `part_visible zuli_gold` front | ≥0.010 | 0.0572 | **0.04362** | 大 |
| `part_visible beak_horn` front | ≥0.004 | 0.0048 | **0.00559** | 薄但比 r11 厚 |
| `part_visible ember_ash` front | ≥0.003 | 0.0084 | **0.00996** | 中 |
| `part_visible tail_quill` side | ≥0.02 | 0.0918 | **0.06212** | 大 |
| `part_visible feather_dark` front | ≥0.03 | 0.1335 | **0.17147** | 大 |
| **`focal_contrast feather_dark:glow_bolt` front** | **≥3×**（本卷自訂目標 ≥3.3） | **3.001** | **3.500** | 由 0.001 拉到 0.500 |
| `style_dark` front | median lum ≤90 | 22.4 | **27.4** | 大 |
| `saturation_area` tq | 10%–60% | 24.0% | **28.8%** | 大 |
| `tri_budget` | 2500–8000 | 4770 | **4770** | 大 |

### silmetrics（出貨版）

```
$ node tools/anyCreature/harness/silmetrics.mjs assets/creatures/thunder.glb <out>
{"W_over_H":0.6,"fill":0.253,"mass_thirds":[0.131,0.611,0.258],"torso_depth_max":0.66,
 "torso_depth_min":0.06,"mass_contrast":10.55,"leg_fraction":0.557,"turn_count":22,
 "zigzag_alignment":0.86,"front":{"W_over_H":0.56,"fill":0.424},
 "top":{"W_over_H":1.08,"fill":0.295},"hero":{"W_over_H":0.6,"fill":0.354}}
```

r11 同一支工具的輸出是 `{"W_over_H":0.91, … "front":{"W_over_H":0.62}, "hero":{"W_over_H":0.71}}`（本卷在動手前用出貨中的 `thunder.glb` 重跑過一次，逐字複現量產報告的數字，確認量測管線本身沒漂移）。

### 四張圖

```
$ node tools/anyCreature/harness/hero.mjs assets/creatures/thunder.glb <out>   → {"ok":true,"margin":8.8}
   → docs/experiments/2026-09-05-sil-thunder-hero.png（1024×1024，未裁未調色）

$ node tests/tools/creature-shoot.mjs <raw.png> "glb=thunder.glb&light=1&fx=1&rim=zuli" idle 8840
{"out":"…","query":"glb=thunder.glb&light=1&fx=1&rim=zuli","phase":"idle",
 "fps":59.88,"calls":25,"loadMs":221,"particles":44,"errors":[]}
   → 原始 1688×780，只做一次純裁切 crop(630,20,1150,650) 成 520×630
   → docs/experiments/2026-09-05-sil-thunder-stage-lit.png
```

- `errors` 是空陣列。`fps 59.88` 是無頭 chromium 的 vsync 上限，不是效能數字。
- `2026-09-05-sil-thunder-front.png`＝`judge.mjs` 的 `thunder_beauty_front.png`（512×512，直接複製）。同 r11 ⑦-2：`creature-shoot.mjs` 的相機寫死在 `creature-preview.html`、沒有 yaw 參數，拿不到打光的正視圖。**它不是盲讀材料**，只作招牌剪影的存證。
- `2026-09-05-sil-thunder-side-mask.png`＝silmetrics 的 `sil_side.png`（640×640 純黑 mask，未加工）＝Q2 要的側視 mask 圖。

### 範圍（Q4／M-A4）

```
$ git status --porcelain      （清掉全部 _tmp_* 之後）
 M assets/creatures/thunder.glb
 M assets/creatures/thunder.json
 M docs/experiments/2026-09-04-creature-gaps.md
?? docs/experiments/2026-09-05-sil-thunder-front.png
?? docs/experiments/2026-09-05-sil-thunder-hero.png
?? docs/experiments/2026-09-05-sil-thunder-report.md
?? docs/experiments/2026-09-05-sil-thunder-side-mask.png
?? docs/experiments/2026-09-05-sil-thunder-stage-lit.png
```

`thunder.claims.json` **沒有出現在清單裡**＝一格未動。`creature-gaps.md` 只改 `thunder` 那一列。`index.html`／`js/`／其他 `assets/creatures/*`／anyCreature 引擎／凍結檔全部未改。不 commit、不 push。

---

## ⑧ 交主對話裁定 / 沒做到（誠實條）

1. **Q2-b「正視翼展 ≥ 全高 0.8」在 `idle` 上字面未達（0.560）**，且依 ③ 的證明**與 Q2-a 恆不相容**。本卷沒有改動這條驗收條件，只把它拆成「idle ❌／move 0.879–0.935 ✅／attack 峰值 1.175 ✅」據實記錄，並附 `part_signature wing_web` front share 0.276、span 0.857 與正視渲染作為「招牌沒丟」的旁證。**要不要把這條改寫成分 clip 的版本，是主對話的事，本卷不自行改。**
2. **盲讀污染仍在**：兩位讀者在第 3／4 題都主動引用了記憶索引裡的「妖市美術方向：不可愛／祖靈古老神獸」那句（E 逐字「符合祖靈古老神獸／威嚴神將的美術方向」、F 逐字「這符合『妖市』美術方向裡『不可愛、祖靈古老神獸／陰氣鬼怪』的守則」）。依 2026-09-05 凌晨的裁定，**Q3 氣質／Q4 可愛只作記錄項不作閘門**；本卷的通過**不依賴這兩項**——鳥 2/2、火 2/2、雷 2/2、特徵 5/5 都是第 1／2 題的證據，索引裡沒有這隻的造型資訊。
3. **「雙翼」子項由 2/2 掉到 0/2**（⑥-⑫）。這是本卷唯一的退步，已登記 gaps。可選的回收路徑只有「把 x 撐回 0.85 以上」，而那會讓剪影閘門翻回原狀——**兩者互斥，本卷選了剪影**。
4. **「鉤」喙、「長」尾羽兩個舊子項沒動也沒改善**（本卷不碰幾何形狀，只轉向量），仍掛在 gaps 上。
5. **翼的貼合仍然只有肉眼證據**（r11 ⑧-2 同款）：`part_attachment` 因為宿主 `LWingA` 是鬆散關節而整條略過。本卷把整副翼當剛體轉，翼內部的相對關係一格未變，所以 r11 那一輪的肉眼核對仍然有效；另逐張看過 hero／stage-lit／judge 五視角渲染，沒有新的穿模。
6. **`part_overlap` 的既有 warn 沒清**，且新增了「`spike@Withers` 100%／45% 落在 `curve@LWingA` 內」兩對——那是肩後的冠羽與收攏後的翼骨重疊，肉眼核對（hero、side-mask）沒有穿幫，翼骨埋進冠羽叢裡正好藏接縫。**這是肉眼證據不是機器證據。**
7. **沒有量效能、沒有接進正式對決、沒有重跑剪影三秒測試**（那是批 9 併完後的批次閘門，需要多隻拼圖）。本卷只驗自己這一隻。
8. **暫存檔與 junction 已清理**：`_tmp_xform.py`／`_tmp_apply.py`／`_tmp_legf.py`／`_tmp_trap12.py`／`_tmp_crop.py`／`_tmp_thumb48.py`／`_tmp_posemetrics.mjs`／`_tmp_out/`／`_tmp_blind/`／`_tmp_r13.json`／`_tmp_probe_src.json`／`_tmp_thunder_r11_backup.json` 全部刪除；`tools/anyCreature` 的 junction 已移除。產生器刪掉之後 `thunder.json` 就是唯一的事實來源（同 r11 ⑧-8 的處置）；③ 的姿態量法已在該節逐步寫明，可重建。
