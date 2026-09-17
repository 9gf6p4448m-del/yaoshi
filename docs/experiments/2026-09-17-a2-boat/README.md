# A2 標竿卷 第一件「拼板舟 boat」— 甲／乙兩案證據目錄（2026-09-17）

基準 worktree `C:/Users/shung/wt/yaoshi/a1-duel-draws`，起點 `1a480d7`。**未 commit、未 push。**
`assets/creatures/boat.json`／`boat.glb`／`boat.claims.json` 一個位元組沒動（`git diff --stat` 為空），`js/`、`index.html` 沒碰。

> **這份文件不做盲讀、不評哪一案比較好。** 兩案都編得出來、judge 對各自 claims 全綠，挑哪一案是使用者的品味裁定。
> 起因：現版 `boat` 在 R-A2 三輪六位盲讀被讀成「飛船／飛艇／生物頭部」判 FAIL（`docs/experiments/2026-09-04-review-boat-report.md:7`、`:230-251`）。

新增檔：`assets/creatures/boat_a.json`／`boat_a.claims.json`／`boat_a.glb`、`boat_b.json`／`boat_b.claims.json`／`boat_b.glb`。
兩份 spec 由 `specgen/build_boat_variants.mjs` 產出（claims 與 spec 同一次執行寫出，在第一次編譯之前）。

---

## ① 甲案 `boat_a`「拼板舟·划手」— 改了哪些欄位、為什麼會被讀成「船」

| 改的欄位 | 相對現版 `boat.json` 做了什麼 | 為什麼指向「船／獨木舟」 |
|---|---|---|
| `chains`／`volumes` 刪 `LFin`、`mirror` 清空 | 拿掉左右兩片飛魚鰭（現版 `fin_fly` 體積與 `LFin` 鏈） | 現版被讀成「飛船／飛艇」的判定在 `2026-09-04-review-boat-report.md:7`、`:22`；側伸的一對翼是這個誤讀最直接的形狀來源。少了翼，剩下的殼就只剩「船」這個解 |
| `chains` 新增 `rowerF`／`rowerA`＋兩個 `volumes`（材質 `lash`） | 艙內站兩名木雕人形划手，一前一後、身高與體寬不同（`joints` RowF*／RowA*） | 人形是「這是給人坐的容器」最短的證據；祖靈 §2 要求「抽象化與虛構化、不挪用禁忌實物」（`docs/design/ART_BIBLE.md:37`），所以做成木雕人偶而不是寫實人物 |
| `parts` 的 `curve`（材質 `oar`）改向 | 現版的兩支槳 `dir` 朝天（`[0.3,0.9,-0.32]`），甲案改成掛在划手肩上、`dir` 往外下（`[0.42,-0.72,0.55]`），葉面加長加扁（四段 `segments`，`sides` 4→6） | 槳插進水裡＝正在划。朝天的槳讀起來像天線／桅杆，是現版「飛行載具」聯想的第二個來源 |
| `parts` 船眼整組放大 1.5 倍＋外加 8 道放射三角（材質 `bone`） | 同心圓由外到內：白八角→黑八角→白八角→橘紅八角→`eye` 圓心；外圈再繞一圈白色三角 | 參照特徵「船眼（同心圓太陽紋）」（`2026-09-04-acceptance-creature-review.md:8`）。現版的船眼 tq 佔比只有 0.1%，等於沒有；甲案 0.3% 且直徑翻倍 |
| `parts` 舷側改成三條帶 | ① `around 56` 一排白菱片（棋盤格窄帶）② `around 92` 紅色朝上／黑色朝下三角交錯 13 片（幾何波浪三角紋）③ `around 128` 10 片疊板搭口凸條 | 參照特徵「白紅黑三色、幾何波浪／三角紋」。`colors.arcs` 只吃角度做不出橫向紋樣（`boat.json:_traps ④`），只能用小 `fin` 貼片 |
| `parts` 首尾雞羽飾（`bone`＋`trim_red`） | 船首與船尾尖端各一面扇形羽片＋一根紅羽管 | 參照特徵「首尾雞羽飾」。掛點必須正好落在尖端關節上，否則 `part_attachment` 判浮空（本卷實測 BLOCK 過一次） |
| `joints` 首尾更高翹 | `SternTip` y 0.40→0.50、`BowTip` up 0.295→0.40 | 參照特徵「首尾高翹成尖」 |
| `colors.arcs` 重排 | 艙內 `#4c463c`／舷頂橘紅／舷下黑帶／白底主面／橘紅細線／板縫／龍骨 | 白紅黑三色；艙內壓暗才讀得出「這是有洞的容器」（`2026-09-04-review-boat-report.md` ⑧-4） |
| `palette` 新增 `bead` `#3050a0` | 划手頸間的靛藍琉璃珠 | `ART_BIBLE.md:33` 祖靈次色靛藍＋`:34` 材質語言「琉璃珠」 |

祖靈剪影條文：`ART_BIBLE.md:35` 要求側視 W/H ≤ 0.7，**swarm 例外是「每隻帶一根垂直物」**——甲案靠兩名直立划手＋兩支斜插的槳達成（側視 W/H 實測 1.81，`leg_fraction` 0.098）。
`ART_BIBLE.md:38` 的「不用腐朽、裂嘴、空洞眼」：兩案都沒有破口、沒有空洞眼，眼是實心橘紅圓心。

## ② 乙案 `boat_b`「載靈的舟形神轎」— 改了哪些欄位、為什麼會被讀成「神轎／祭器」

| 改的欄位 | 做了什麼 | 為什麼指向「神轎／祭器／船形供物」 |
|---|---|---|
| `joints` 船體鏈改成縱向上升並前傾 | `SternTip`→`BowTip` 由 y 0.075 爬到 1.355（四段長度 0.228/0.361/0.441/0.320，刻意不等長避開 `proportion` BLOCK） | 船立起來就不再是載具而是「被抬著的物」；`ART_BIBLE.md:35` 祖靈剪影＝修長、垂直線條主導，側視 W/H 實測 **0.60**（目標 ≤0.7） |
| `chains` 新增根鏈 `bier`＋`attach: {hull: BierB}` | 一塊寬而薄的轎底平板（半寬 0.21、半高 0.04），船尾插進平板裡（`touch: [["bier","hull"]]`） | 平板＝轎底座。把它設成**根鏈**、船體 attach 到它，`root_containment` 才會去驗「船尾真的埋進轎底」；反過來寫會被判船尾環外露 |
| `parts` 兩根 `curve`（材質 `oar`，`mirrored`）掛在 `BierA` | 木抬桿前後貫穿轎底、兩端露出，三段 `segments` 共長 0.96 | 抬桿是「神轎」最短的證據，也是乙案的招牌條（claims `part_signature` 走跨距那一路，實測側視跨距 0.966） |
| `parts` 前後兩條橫木握把結（材質 `lash`） | `BierA`／`BierC` 各一條橫向厚板，把兩根桿綁在轎底上 | 轎槓與轎底的結構交代，不然桿子看起來像雪橇板（第一版就是這樣，抬高 0.052 加粗後才分開） |
| `parts` 六根藤編斜撐＋三圈捆紮藤圈＋靛藍琉璃珠 | `Stern`／`Mid`／`BowBase` 各一對 `curve`（`lash`）斜撐到轎底，三圈藤圈，兩對 `bead` 菱片 | `ART_BIBLE.md:34` 祖靈材質語言「手織麻、風化木、獸骨、皮革、藤編、琉璃珠」——這一案把藤編與琉璃珠推到可見尺寸（`lash` tq 佔比 16.4%） |
| `parts` 船眼與波浪紋原樣保留（`around 72`／`92`／`56`） | 立起來之後落在轎身上半的雙頰與正面 | 真實參照的特徵不因為立起來而放掉（`ART_BIBLE.md:19` 圖騰化是在特徵之上做，不是取代特徵） |
| `parts` 板縫凸條的 `udir` 改成 `[0,1,0]` | 立姿鏈上 `udir=[0,0,1]` 會讓凸條橫向外挑，第一版 hero 讀成一排白骨刺；改成順著船身長邊才躺平成板縫 | 引擎陷阱：`anchor.around` 與 `udir` 都是在**宿主斷面的座標系**裡讀的，鏈一立起來全部換方向（`SYNTAX.md` fin 段的警語；編譯器會印 `faces <方向>` 那行） |
| 舟艏尖翹改成轎頂飾件 | `glow_prow` 平板從 `BowBase` 往上推 0.155，雞羽飾掛在 `BowTip` | 尖翹仍在（參照特徵「首尾高翹成尖」），但在垂直構圖裡它的角色變成轎頂的簷飾 |

---

## ③ 機械檢查數字表

| 指標 | 現版 `boat`（對照） | 甲 `boat_a` | 乙 `boat_b` | 門檻 |
|---|---|---|---|---|
| `cli.js` exit | 0（`checks: all green`） | **0（all green）** | **0（all green）** | 0 |
| 三角形數（judge `stats.triangles`） | 5456 | **5232** | **4164** | ≤ 7093（＝5456×1.3） |
| GLB 位元組 | 897,624 | 883,860 | 691,164 | —（凍結檔預算 ≤1.5MB，兩案都過） |
| 材質數／skinnedMeshes | 9／9 | 9／9 | 9／9 | — |
| judge 對各自 claims | 13/13 | **17/17** | **16/16** | 只要求列出，不要求全過 |
| 正規化後 `min.y` | 0 | **0** | **0.0312** | ≥ 0 |
| 正規化後高度 h | 0.794 | 0.842 | 1.200（原始 1.652，被 `NORM.maxH` 縮到 1.2） | ≤ 1.2 |
| 正規化後 w／d | 1.05／1.641 | 0.708／1.594 | 0.368／0.697 | n=3 橫排欄距 1.05 |
| 側視機體中位亮度 | 107.4 | 97.6 | 98.3 | claims `style_light` ≥ 95 |
| tq 高飽和面積 | 22.1% | 34.8% | 20.9% | claims `saturation_area` 10–60% |
| 側視 W/H（silmetrics） | 2.08 | 1.81 | **0.60** | 祖靈 §2 目標 ≤0.7（swarm 例外見 ①） |
| `turn_count`（輪廓事件） | 16 | 24 | 13 | — |
| 主要 tq 佔比 | hull 56.7／fin_fly 8.9／oar 10.1 | hull 52.2／oar 15.2／lash(划手) 10.6 | hull 56.2／lash 16.4／oar(抬桿) 8.6 | claims `share_hierarchy` 6:3:1 ±15 |

`min.y`／`h` 是用 `creature-preview.html` 的 `window.__preview.bounds()` 量的——`tests/tools/duel-perf.mjs bounds` 只吃寫死的 27+3 隻正式清單，`boat_a`／`boat_b` 不在裡面，所以照它 `duel-perf.mjs:62-84` 的同一條路徑另寫了一支探針（`scratchpad/bounds-probe.mjs`，未進 repo）。量的是**正規化之後**的值，與 `duel-perf bounds` 的 `ok` 判準（`minY >= -1e-3 && h <= 1.2+1e-3`）相同，兩案都 `ok`。

---

## ④ 指令原文（可貼上重跑）

```bash
cd C:/Users/shung/wt/yaoshi/a1-duel-draws

# 1) 產 spec 與 claims（claims 與 spec 同一次寫出，在第一次編譯之前）
node docs/experiments/2026-09-17-a2-boat/specgen/build_boat_variants.mjs

# 2) 編譯
node tools/anyCreature/engine/cli.js assets/creatures/boat_a.json assets/creatures/boat_a.glb
node tools/anyCreature/engine/cli.js assets/creatures/boat_b.json assets/creatures/boat_b.glb

# 3) judge（一律不帶 --stage）
node tools/anyCreature/harness/judge.mjs assets/creatures/boat_a.glb <outDir>/j_a boat_a --spec assets/creatures/boat_a.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/boat_b.glb <outDir>/j_b boat_b --spec assets/creatures/boat_b.claims.json
node tools/anyCreature/harness/silmetrics.mjs assets/creatures/boat_a.glb <outDir>/sil_a

# 4) hero（寫出 <outDir>/hero.png，再複製成 hero-<名>.png）
node tools/anyCreature/harness/hero.mjs assets/creatures/boat.glb   <outDir>/hero_base
node tools/anyCreature/harness/hero.mjs assets/creatures/boat_a.glb <outDir>/hero_a
node tools/anyCreature/harness/hero.mjs assets/creatures/boat_b.glb <outDir>/hero_b

# 5) stage-lit 與 n=3（port 9091 起各不同）
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-boat/stage-base.png "glb=boat.glb&light=1&fx=1&rim=zuli"        idle 9091
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-boat/stage-a.png    "glb=boat_a.glb&light=1&fx=1&rim=zuli"      idle 9092
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-boat/stage-b.png    "glb=boat_b.glb&light=1&fx=1&rim=zuli"      idle 9093
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-boat/n3-base.png    "glb=boat.glb&light=1&fx=1&rim=zuli&n=3"    idle 9094
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-boat/n3-a.png       "glb=boat_a.glb&light=1&fx=1&rim=zuli&n=3"  idle 9095
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-boat/n3-b.png       "glb=boat_b.glb&light=1&fx=1&rim=zuli&n=3"  idle 9096

# 6) contact sheet
python docs/experiments/2026-09-17-a2-boat/specgen/sheet.py
```

- `glb=` 用的是**檔名形式**（預覽頁 `creature-preview.html:18`：「相對 `assets/creatures/` 的檔名，或 `/` 開頭的絕對路徑」）。改用 `glb=/assets/creatures/boat_a.glb` 結果相同，但從 Git Bash 呼叫時 MSYS 會把開頭的 `/` 改寫成 `C:/Program Files/Git/...`，GLB 變成 404（`2026-09-07-legend-art-evidence/README.md` 已記過這條）；檔名形式沒有這個問題。
- `creature-shoot` 回報的 `fps` 59.88 是無頭 chromium 的 vsync 上限，**不是效能數字**；本卷沒有量效能、沒有接進正式對決。

---

## ⑤ 圖檔清單

| 檔名 | 內容 |
|---|---|
| `sheet-v1.png` | 3 欄（現版／甲／乙）× 3 列（hero／stage-lit／n=3）的 contact sheet，每格標題與檔名 |
| `hero-base.png`／`hero-a.png`／`hero-b.png` | `hero.mjs` 的 1024² 透明底 45° 英雄視角（margin 9／9.1／7.9） |
| `stage-base.png`／`stage-a.png`／`stage-b.png` | 戲台三燈＋祖靈邊光 `rim=zuli`，`idle`，1688×780 |
| `n3-base.png`／`n3-a.png`／`n3-b.png` | 同上加 `&n=3`，三隻橫排 |
| `specgen/build_boat_variants.mjs` | 兩案 spec＋claims 的產生器 |
| `specgen/sheet.py` | contact sheet 拼圖腳本（PIL，做法沿用 2026-09-07 傳說三尊卷） |

同目錄的 `table-base.png`／`duel-base.png`／`metrics-base.json` 與 `tests/tools/a2-sheet.{mjs,py}` 是 `1a480d7` 既有的 A2 標竿治具產物（現版 boat 的桌面大小與 8v8 截圖），**不是本卷做的**，本卷沒有動它們。

---

## ⑥ 沒做到 / 留給主對話的事

1. **沒有做盲讀。** 派工明寫不要做，所以「甲會不會被讀成船、乙會不會被讀成神轎」在本卷**沒有任何證據**——上面第 ①②節寫的是設計意圖與參照對應，不是讀者反應。
2. **沒有自評哪一案好。** 這是品味題，照 `03 R6` 交給使用者挑。
3. **戲台燈光把米白打到爆白**這條老問題還在（`2026-09-04-review-boat-report.md` ⑦-4），兩案的 `stage-*.png` 一樣看得到高光糊掉細節。不准動 `js/`，記在這裡。
4. **乙案的高度 1.652 會被 `NORM.maxH` 縮到 1.2**（`js/creature-figures.js:95`），等於在桌面上整體縮小 0.72 倍；若選乙案，要不要調整轎身比例讓它在縮放後還撐得住場面，是下一步的事。
5. **兩案都沒接進正式對決、沒有量效能**，`POOL`／`FAC` 等清單一個字沒改（`js/` 沒碰）。選定之後才需要把 `boat.glb` 換掉或把新 key 接進去。

## 三情境 contact sheet（主對話補，2026-09-17）

[sheet-v2.png](sheet-v2.png)：欄＝現版／甲／乙，列＝英雄視角／stage-lit／實際桌面大小（844×390 hover，四槽同件）／滿編 8v8（A 側本件 ×3＋重型 5，凍幀）。桌面與滿編兩列由 `tests/tools/a2-sheet.mjs` 以靜態覆蓋根換 GLB 拍（產品碼未動），數字在 `metrics-{base,a,b}.json`：

| | 現版 | 甲 | 乙 |
|---|---:|---:|---:|
| 桌面 hover 主體框（px） | 173×158 | 131×150 | 75×141 |
| 桌面 render calls／tris | 59／29589 | 59／28469 | 59／23129 |
| 8v8 兩 rAF draw／tris | 594／423528 | 590／420752 | 590／407936 |
| 8v8 三隻本件框（px，寬×高） | 141×111、144×111、117×85 | 120×99、119×99、100×77 | 62×99、65×98、51×81 |
| errors | 0 | 0 | 0 |

滿編列三張的節拍不同（凍幀落在真實對決的不同拍，甲那張正逢受擊閃紅），只當構圖材料，不做逐值比較。乙的桌面框只有 75 px 寬：直立化後側視變窄，桌面上的份量要在挑定後決定要不要放大（NORM.maxH 把它縮到 0.72 倍）。

## S2 結果：甲案三輪盲讀（主對話，2026-09-17）

使用者原話挑選：**「甲a好了 還不錯」**（S0／S2 挑選紀錄，凍結 #1）。甲案成為正式 `assets/creatures/boat.*`，之後**同一方案**做了三輪（凍結 #3 上限）；每輪四位 context-free 讀者（特寫組 hero／stage／n3 兩位、桌面大小裁切兩位，各一 sonnet 一 opus，圖用中性檔名放專案外），原始回答在 `blindread-r{1,2,3}/reader-*.json`，評分在 `score-r{1,2,3}.json`。三輪對照圖 [sheet-rounds.png](sheet-rounds.png)。

| 輪 | 改動 | 概念「船」 | 特徵 ≥3/5 | 可愛／玩具 0/N | 色系①（特寫） | 桌面：系別／剪影 | 結論 |
|---|---|---|---|---|---|---|---|
| r1 | 甲案原版（白殼、划手、船眼） | 2/2 | 4/5、4/5 | **0/2 過** | 1/2 | 0/2 ／ 2/2 | 色系未過（三位讀成香火：米白殼＋硃紅＋燈光泛金） |
| r2 | 只改色：船殼大地褐、白留紋、靛藍放大 | 2/2 | 4/5、4/5 | **2/2 未過**（木製模型玩具船） | 2/2 | 2/2 ／ 2/2 | 色系過、玩具翻 |
| r3 | 去玩具感：藤盔划手、瘦長、老木、骨飾、靛藍降飽和、紅黑三角 | 4/4 | 4/5、4/5 | **3/4**（J：「不太會說可愛，但會說像玩具模型」） | 2/2 | 2/2 ／ 2/2（桌面兩位也答不可愛） | 依凍結嚴格計 **未過（玩具 1/4）**，其餘全過 |

**三輪上限已到，依凍結 #3 標「未過」，交最佳版由使用者簽字。** 最佳版＝第 3 輪（現行 `boat.*`）：除一位讀者的「像玩具模型」外全過；代價是兩位特寫讀者把划手讀成「圖騰／葫蘆狀立柱」，人形划手這一特徵在第 3 輪失去（特徵仍 4/5）。r1 白殼版可愛 0/2 但色系 1/4，不列最佳。

### 硬指標（第 3 輪＝出貨版）

| 指標 | 值 | 門檻／來源 |
|---|---:|---|
| tris | 4780 | ≤ 7093（現版 5456 ×1.3）；r1 5232、r2 5232 |
| judge | 19/19 | `boat.claims.json`（顏色條 style_light 95→35、style_dark 新增 ≤75；part 條目只增 `bead`）——只影響 judge 列表，凍結 #2 只要求列出 |
| bounds | h 1.005、minY 0、w 0.65 | `duel-perf bounds`（[bounds-a3.json](bounds-a3.json)）；h < 1.2 不被縮 |
| 取景矩陣 `--all --match=boat` | 48/48 | [framing-boat-a3.json](framing-boat-a3.json) |
| `node --test` | 96/96 | [tests-all-a3.txt](tests-all-a3.txt) |
| trace-eq seeds 1–20 | equal | [trace-eq-0.57.18.txt](trace-eq-0.57.18.txt)（只動資產與版本字串） |
| 桌面 hover render calls／tris | 59／26209 | `metrics-a3.json`（現版 59／29589） |
| 8v8 兩 rAF draw | 590 | ≤ 640（凍結 #2 每 rAF ≤320）；三隻本件框 117×107、117×107、98×84 |
| perf32 五輪 | .5722（paired 5/5、0.534–0.779）GREEN | 門檻 .40 逐輪 |
| console／page error | 0 | 所有治具 |

### 未做／排到後面

- 凍結 #5「來源／對象可讀」（swarmHalfSplash 重讀、「我方單一」語彙）排 S3，與福壽綿長一起做。
- 滿編遮擋率量法（legend-presence）未接進 `a2-sheet.mjs`，本卷只記三隻本件的螢幕框與 visible。
- 划手人形感：若使用者簽字時要求保住「人」，下一版把藤盔壓低、加手臂與槳握把（動 joints 之外的 parts 即可）。

