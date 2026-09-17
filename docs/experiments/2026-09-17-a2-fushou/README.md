# A2 標竿卷 第二件「福壽綿長 fushou」— 甲／乙兩案證據目錄（2026-09-17）

基準 worktree `C:/Users/shung/wt/yaoshi/a1-duel-draws`。**未 commit、未 push。**
`assets/creatures/fushou.json`／`fushou.glb`／`fushou.claims.json` 一個位元組沒動（`git diff --stat` 為空），`js/`、`index.html` 沒碰。

> **這份文件不做盲讀、不評哪一案比較好。** 兩案都編得出來、judge 對各自 claims 23/23 全綠，挑哪一案是使用者的品味裁定。
> 起因：現版 `fushou` 硬指標全過但沒有獨立盲讀紀錄，且 P4「招式對象」題 3/18 最差——
> 讀者說得出「有火」，說不出「這隻在對什麼做什麼」。兩案都是往「那盞燈是這隻的主詞」推。

新增檔：`assets/creatures/fushou_a.json`／`fushou_a.claims.json`／`fushou_a.glb`、`fushou_b.json`／`fushou_b.claims.json`／`fushou_b.glb`。
兩份 spec 與 claims 由 `specgen/build_fushou_variants.mjs` 一次執行寫出（claims 寫在第一次 `judge.mjs` **之前**），基底是出貨版 `fushou.json` 的深拷貝。

---

## ① 甲案 `fushou_a`「油壺龜」— 改了哪些欄位、為什麼讀者會說出「龜／長明燈」

| 改的欄位 | 相對現版 `fushou.json` 做了什麼 | 為什麼指向「一盞長明燈」 |
|---|---|---|
| `joints` 的 `Cp0`–`Cp3`（燈碗鏈） | 由 `z 0.12→0.51` 前推成 `z 0.185→0.591`、下沉 0.04；碗口法線仍維持出貨版的 `(0,0.905,0.425)` | `_traps_batch10 ⑦` 實測：碗掛在頷下 2/2 被讀成「鬍鬚」，掛到腹前才 2/2 讀成「底座上插著火焰狀物體」。本案把碗再往前推到**整個突出於身體剪影之外**，讓它不再是身上的一塊而是身前的一件器物 |
| 燈碗／碗口／油面／燈芯整組 ×1.18，火苗與火舌 ×1.30 | 碗口半寬 0.236→0.278、火苗高 0.207→0.269 | `ref-fushou.md:32` 特徵④「碗口外翻、口徑遠大於碗深」。出貨版的碗只有身寬的 30%，放在加寬後的身上像個掛飾；招牌部位要先夠大才談得上一眼特徵（`glow_lamp` 正面佔比 2.2%→6.1%） |
| 新增 `chains.niche`＋同名 volume（材質 `lamp_bowl` 硃紅） | 一面往後仰 25° 的硃紅上漆背板，根環埋在碗裡（`attach: {niche:"Cp3"}`、`touch: [["cup","niche"]]`） | 廟裡的長明燈是**放在龕裡**的（`ref-fushou.md:14` ref3 媽祖廟長明燈＝燈龕內高足油碗＋單焰）。深色龕面＋前方亮火＝`ART_BIBLE.md:22-29` 香火的硃紅底＋一點發光，也把火苗從雜色背景裡拔出來 |
| `parts` 新增鎏金龕柱（`curve`×2 鏡射）、龕頂翹角（`curve`×2 鏡射）、龕脊珠（`curve`） | 背板兩側各一根立柱、頂上兩支外挑的翹角與一顆脊珠 | 翹角＋脊珠是台灣廟簷的最短語彙（`ART_BIBLE.md:25` 材質語言「上漆木雕、剪黏碎瓷、金箔」）；金只加在既有的三處（頂剎／眉稜／燈足）旁的這一組，沿用 `_traps ⑩` 不做乳釘方陣 |
| `parts` 新增贔屭龍角（`curve` 鏡射，`tusk`）與頷鬚（`curve` 鏡射，`tusk`） | 吻上一對前伸小角、顎側一對往前下外撇的骨白鬚 | `ref-fushou.md:29` 特徵③「贔屭式方鈍龍首」——出貨版有齒有眉稜沒有角與鬚，`_traps_harden5 ⑨` 記的「骷髏／骨質臉」殘留風險就是缺這兩件 |
| `volumes` 的 `shell`／`pot` 第一個半徑 ×1.12／×1.10，`skirt` 第二段半徑 0.66→0.755 | **只加寬不加深**（`frame:"up"` 時第一個半徑就是 X 寬，`_traps_batch10 ②`） | 兩件事：① 燈碗前推吃掉的是 Z，ward 的「正面寬 ≥ 側面寬」要靠 X 補回來（實測 X 1.492 ≥ Z 1.330）② `ART_BIBLE.md:26` 香火剪影＝寬、正、儀仗感 |
| `skirt.colors.arcs` 6 楔形 → 12 楔形 | 甲緣裙邊切成 12 片緣盾 | `ref-fushou.md:23` 特徵①「甲緣一圈往外翻的裙邊」；`arcs` 在**扁平環狀** volume 上是徑向楔形（`_traps_harden5 ①`），零三角形成本 |

## ② 乙案 `fushou_b`「馱燈神龜」— 改了哪些欄位、為什麼讀者會說出「龜／光明燈龕」

| 改的欄位 | 做了什麼 | 為什麼指向「龕是主體、龜是座」 |
|---|---|---|
| 新增 `chains.shrine`＋同名 volume（材質 `lamp_bowl` 硃紅，`exp 3.4` 方塔身） | 龜背上一座三層硃紅燈龕塔（`attach:{shrine:"Sh2"}`、`touch:[["shell","shrine"]]`），塔身逐層內收、以 `sharp` 斷出層界 | 松山慈祐宮光明燈是**一整面多層小格的燈架**（`ref-fushou.md:15` ref4）。把它做成塔，龜就自動退位成基座 |
| `parts` 新增 16 片 `glow_lamp` 小方格（兩層各 8 格，`anchor` 貼在塔面上） | 每層繞塔一圈的小燈位 | 「多層小格燈位」是光明燈最短的語彙；`anchor` 會把片子貼平到塔面（`part_attachment` 一定過），懸空的平板 fin 會被擋 |
| `parts` 新增兩層鎏金翹角簷（`curve`×4 鏡射） | 每層四角往外上挑的鎏金角 | 廟簷；用 `curve` 而不是 `fin`，因為根埋得進塔身（見 `_traps_a2 ②`） |
| `joints` 的 `Cp0`–`Cp3`、`Brm*`、`FlmR` 整組搬到塔頂，`attach.cup` 由 `pot` 改 `Shr3` | 高足油碗立在龕頂，單焰從碗心長出；碗與火苗整組縮 0.70 | 龕頂的那一盞才是「長明燈」本體；縮小是因為塔頂再掛原尺寸的碗會把全高推高、香火「側視 W/H ≥0.9」立刻掉下來 |
| `joints` 的 `Pt*`／`Tl*`／`Bd*` 縱向壓 0.70、`Sh*` 整條下移 0.12、四肢外撇 | 油壺身壓矮、龜甲整個往下坐、四足外張 | 「龜身壓低成基座」。**龜甲不壓扁**——壓扁會讓 `shell_dark` 在識別視角掉到 9.0%（實測），基座感改由寬裙＋外撇四肢＋矮身給 |
| `joints` 的 `Nk*`／`Hd*` 抬高前伸（`Hd0` 由 `y0.768/z0.47` → `y0.88/z0.55`） | 頭從甲前緣仰起、伸到裙外 | 贔屭是**抬頭馱碑**的姿態；而且壓低之後裙緣也跟著降，頭不抬起來整張臉會埋進垂裙（見 `_traps_a2 ②`） |
| `skirt` 改成「往下垂的寬裙」：鏈由 `y0.80` 垂到 `y0.45`，剖面 0.36→0.78→0.64 | 緣盾裙邊變成一圈外張再垂下的大裙，遮掉油壺身大半 | `ART_BIBLE.md:26` 香火剪影「靠**垂墜物**製造輪廓」。這一案把緣盾裙邊推到那個角色上，順帶把 `shell_rim` 撐成正面的主層（33.4%） |
| `skirt.colors.arcs` 12 楔形改用去飽和香灰褐 `#6e6455` | 鎏金與香灰交錯的 12 片緣盾 | 垂裙在 tq 視角佔 33%，`saturation_area` 上限 60% 是**大面積材質的硬天花板**（`_traps_harden5 ③`）——整片鎏金實測把 tq 推到 64.1%，交錯後 47.3% |
| 移除背上的鎏金葫蘆頂剎（`Crest`） | 由燈龕塔取代 | 兩個頂剎會互搶 |

兩案都守 `ART_BIBLE.md:11`（不可愛：沒有圓臉圓眼、沒有 Q 版比例，頭佔全高 ≤25%）與 `:29`（不用殘缺、腐爛、空洞眼——眼是實心橘球＋骨白高光，沒有破口）。

---

## ③ 機械檢查數字表

| 指標 | 現版 `fushou`（對照） | 甲 `fushou_a` | 乙 `fushou_b` | 門檻 |
|---|---|---|---|---|
| `cli.js` exit | 0（`checks: all green`） | **0（all green）** | **0（all green）** | 0 |
| 三角形數（judge `stats.triangles`） | 7860 | **7654** | **7764** | ≤ 10218（＝7860×1.3）；量產凍結檔另有 ≤8000，兩案也都在內 |
| GLB 位元組 | 1,357,164 | 1,283,680 | 1,312,872 | — |
| 材質數／skinnedMeshes | 14／14 | 14／14 | 14／14 | 兩案都沒有新開材質 |
| judge 對各自 claims | 23/23 | **23/23** | **23/23** | 只要求列出條數 |
| 正規化後 `min.y` | 0.0010 | **0.0010** | **0.0008** | ≥ 0 |
| 正規化後高度 h | 1.200 | **1.200** | **1.200** | ≤ 1.2 |
| 正規化後 w／d | 1.265／1.183 | 1.447／1.290 | 1.192／0.990 | — |
| 原始 bbox X／Y／Z | 1.364／1.237／1.219 | 1.492／1.237／1.330 | 1.560／1.571／1.296 | ward：X ≥ Z（兩案都成立） |
| 側視 W/H（silmetrics） | 1.04 | **1.19** | **1.00** | 香火 §1 ≥0.9（`ART_BIBLE.md:26`）。乙案達標但**沒有比現版更寬**——燈龕塔把全高從 1.237 推到 1.571 |
| 正面中位亮度 `lum.front` | 68.5 | 72.2 | 74.4 | claims `style_dark` ≤90 |
| 高飽和面積 `hi_sat_share.tq` | 0.3631 | 0.3937 | 0.4734 | claims `saturation_area` 0.10–0.60 |
| 正面 6:3:1 階層 | 47:42:11 | **46:43:11** | **58:36:7** | 60:30:10 ±15 |
| `shell_dark` 正面佔比 | 17.8% | 18.5% | 17.9% | claims `part_visible` ≥10% |
| `glow_lamp` 正面佔比 | 5.49% | **6.07%** | 3.09% | claims `part_visible` ≥0.8% |
| `focal_contrast`（shell_dark : glow_lamp） | 3.24× | **3.05×** | 5.79× | ≥3×（甲案裕度只有 0.05，火苗再放大就會破） |
| `turn_count`（輪廓事件） | 32 | 26 | 34 | — |

`min.y`／`h` 是用 `creature-preview.html` 的 `window.__preview.bounds()` 量的——`tests/tools/duel-perf.mjs bounds` 只吃寫死的 30 隻正式清單，`fushou_a`／`fushou_b` 不在裡面，所以照它 `duel-perf.mjs:62-84` 的同一條路徑另寫了一支探針（`scratchpad/a2f/bounds-probe.mjs`，未進 repo）。判準與 `duel-perf bounds` 的 `ok` 相同（`minY >= -1e-3 && h <= 1.2+1e-3`），三顆都 `ok`。

---

## ④ 指令原文（可貼上重跑）

```bash
cd C:/Users/shung/wt/yaoshi/a1-duel-draws

# 1) 產 spec 與 claims（claims 與 spec 同一次寫出，在第一次編譯之前）
node docs/experiments/2026-09-17-a2-fushou/specgen/build_fushou_variants.mjs

# 2) 編譯
node tools/anyCreature/engine/cli.js assets/creatures/fushou_a.json assets/creatures/fushou_a.glb
node tools/anyCreature/engine/cli.js assets/creatures/fushou_b.json assets/creatures/fushou_b.glb

# 3) judge（一律不帶 --stage；--stage HIGH 只跑 3 條，見 fushou.json 的 _traps_batch10 ①）
node tools/anyCreature/harness/judge.mjs assets/creatures/fushou.glb   docs/experiments/2026-09-17-a2-fushou/judge-base fushou   --spec assets/creatures/fushou.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/fushou_a.glb docs/experiments/2026-09-17-a2-fushou/judge-a    fushou_a --spec assets/creatures/fushou_a.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/fushou_b.glb docs/experiments/2026-09-17-a2-fushou/judge-b    fushou_b --spec assets/creatures/fushou_b.claims.json
node tools/anyCreature/harness/silmetrics.mjs assets/creatures/fushou_a.glb <outDir>

# 4) hero（寫出 <outDir>/hero.png，再複製成 hero-<名>.png）
node tools/anyCreature/harness/hero.mjs assets/creatures/fushou.glb   <outDir>/hero_base
node tools/anyCreature/harness/hero.mjs assets/creatures/fushou_a.glb <outDir>/hero_a
node tools/anyCreature/harness/hero.mjs assets/creatures/fushou_b.glb <outDir>/hero_b

# 5) stage-lit 與 n=3（rim=xianghu；creature-preview.html:17 的鍵名是 xianghu 不是 xianghuo）
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-fushou/stage-base.png "glb=fushou.glb&light=1&fx=1&rim=xianghu"       idle 9131
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-fushou/stage-a.png    "glb=fushou_a.glb&light=1&fx=1&rim=xianghu"     idle 9132
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-fushou/stage-b.png    "glb=fushou_b.glb&light=1&fx=1&rim=xianghu"     idle 9133
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-fushou/n3-base.png    "glb=fushou.glb&light=1&fx=1&rim=xianghu&n=3"   idle 9134
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-fushou/n3-a.png       "glb=fushou_a.glb&light=1&fx=1&rim=xianghu&n=3" idle 9135
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-fushou/n3-b.png       "glb=fushou_b.glb&light=1&fx=1&rim=xianghu&n=3" idle 9136

# 6) 正規化包圍盒（另寫的探針，走 creature-preview 的同一條路徑）
node scratchpad/a2f/bounds-probe.mjs fushou fushou_a fushou_b
```

## ⑤ 圖檔清單

| 檔 | 內容 |
|---|---|
| `hero-base.png`／`hero-a.png`／`hero-b.png` | `harness/hero.mjs` 1024² 透明背景 45° |
| `stage-base.png`／`stage-a.png`／`stage-b.png` | 戲台打光＋三系環境特效，`rim=xianghu`，`idle` |
| `n3-base.png`／`n3-a.png`／`n3-b.png` | 同上，橫排三隻（小圖辨識用） |
| `judge-base.txt`／`judge-a.txt`／`judge-b.txt` | 三份 judge 的完整 stdout（含各部位 share／lum／hi_sat 原始值） |
| `specgen/build_fushou_variants.mjs` | 兩案 spec＋claims 產生器 |
| `duel-base.png`／`table-base.png`／`metrics-base.json` | 本目錄先前既有的現版對照（本輪未重拍） |

已知落差（不修、列出）：① 乙案側視 W/H 1.00 達標但不比現版 1.04 寬——燈龕塔把全高推高，要更寬只能再加寬垂裙或壓低塔；
② 甲案 `focal_contrast` 裕度只剩 0.05×，火苗或油面再放大會破這一條；
③ `_traps_batch10 ⑧` 記的「低多邊形做不出碗的凹面」兩案都沒解決——甲案改用燈龕框把「這是一盞燈」講出來，不是把凹面做出來。

## S3 招式「我方單一」語彙（wardRegen1）第 1 輪重讀（主對話，2026-09-17）

修法（`js/trait-fx/xianghuo.js` wardRegen1）：施招者腳下光略收（0.52／1.0→0.44／0.85，仍是 §A9 身分訊號）；受益端新增**胸口豎立紅環**（`st.ring` 改成豎立、面向鏡頭，不是腳下環——`st.groundMark` 點在受招方會 throw，§A9 第 1 條）、燈印放大 1.0→1.3、爆點 0.8/44→1.1/64、升幅 0.17→0.22。`fxvocab`／`fxtier`／全套 96 測試綠、trace 相等。

材料照 P4 第 3 輪規格重產（2v2、count=2、mateGap 1.9、敵方 bow:elite:zuling:1,raincoat:ward:yinqi:1；A-booth t1/t2＋B-closeup t2），三對讀者（sonnet＋opus）各三張，答卷在 `p4-wardRegen1/blindread/`、評分 `score.json`。**第一次產材料漏帶 2v2 參數（1v1 沒有同伴可受益），六份答卷作廢保留在 `void-1v1-blindread/`。**

| | 效果 | 對象 | 系別 | 三格多數 |
|---|---|---|---|---|
| 本輪（修法後） | 17/18 | **5/18** | 17/18 | 0/3 |
| P4 第 3 輪基線（09-13） | 15–18/18 | 3/18 | 18/18 | 未過 |

**未過。** 歸因（讀者原話）：三位「只有它在亮／效果全程留在我方單體」——把兩隻同型烏龜看成一尊；兩位「左側兩尊依序升起火焰」——施招者背上的燈焰蓄勢與受益方的火焰落點被讀成「我方多個」；胸口紅環被讀成「罩住自己」。窗格固定（windup 中點必然是施招者在亮），同型同伴重疊是材料規格（2v2 同體）。凍結 #5 對象 ≥12/18 未達，列未過交裁；修法保留（不損其他題、微幅改善）。

