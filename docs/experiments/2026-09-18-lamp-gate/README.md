# 材質可行性閘：福壽綿長「燈」— 改法與量測（2026-09-18）

驗收凍結在 [`../2026-09-18-acceptance-lamp-gate.md`](../2026-09-18-acceptance-lamp-gate.md)。本卷**只做一版、只動燈**，盲讀由主對話另行進行，本檔不做盲讀、不自評。
工作樹 `C:/Users/shung/wt/yaoshi/a1-duel-draws`（分支 `a1/duel-draws`）；**未 commit、未 push**。

---

## 一、結論先行

**真因不是「火苗太小」也不是「沒有光暈」，是碗根本沒有被畫出來。**

`assets/creatures/fushou.json` 的 `cup` volume 碗口 `caps` 第二格是 `"none"`，而 anyCreature 只有 `membrane` 型 part 會標 `doubleSided`（`tools/anyCreature/engine/core/compile.js:427`），其餘 volume 一律單面。於是碗的內壁整片被背面剔除：**judge 的 ID pass 用 `DoubleSide`（`harness/judge.mjs:62`），量到的 `lamp_bowl` front 8.62% 裡有 83% 在 beauty／遊戲裡一個像素都沒畫**，讀者看到的是「穿過碗看到的背景／牌桌紅布／描邊外殼的內面」。再加上 `lamp_bowl` 原色 `#d9d2c4` 與裙邊 `shell_rim` **逐字元相同**、`lamp_lip` 原色 `#d8b45c` 與 `gold_trim` **逐字元相同**，剩下畫得出來的那一點碗也跟龜身融成一塊——畫面上只剩一團橘色的油面＋火苗，這就是三輪十位讀者說的「水滴狀墜／尖角護具／供品」。

**做法**：補一片與碗口同 superellipse 斷面的封板（`socket` 暗色，當碗內壁陰影）＋一片黃銅碗內底（`lamp_lip`）＋把碗口三環由 `exp 5` 的圓角方斷面改圓＋碗沿外翻加寬；碗身改煤黑、碗沿／碗內底改亮黃銅（外深內亮）；火苗由 3 片＋1 舌改成 5 片不等高＋3 條長短不一的細舌。

**燈區像素／亮度（改前 → 改後）**

| 圖 | 燈區像素 | 燈區峰值亮度 | 燈區 >200 的像素 | 龜身峰值亮度 | 燈 > 龜身？ |
|---|---:|---:|---:|---:|---|
| hero（1024²，無自發光） | 50,064 → **57,136** | 187.3 → **210.0** | 0 → **1,449** | 255.0 → 255.0 | ❌ 否（見 §五-1） |
| stage（1688×780，遊戲光＋bloom） | 55,388 → 55,388（同框） | 238.6 → 238.6 | 10,938 → 9,462 | 239.4 → 239.4 | ❌ 否（雙方都頂到 tonemap 上限） |
| table（844×390 dpr2 實際桌面） | 11,400 → 11,400（同框） | 217.5 → **214.9** | 1,684 → 1,268 | 238.5 → 236.9 | ❌ 否 |

**另一組更有鑑別力的數字（judge front beauty，逐材質實量）**：碗在畫面上「被畫出來的像素」由 1,637（`lamp_lip`，平均亮度 26.9）＋906（`lamp_bowl`，平均亮度 **17.4**）→ 3,257（`lamp_lip`，平均亮度 **94.2**）＋3,549（`socket` 封板）＋372（`lamp_bowl`）。整隻在 front beauty 畫得出來的像素由 54,741 → **56,869（+2,128）**——這 2,128 就是原本那個洞。

---

## 二、診斷（實測，不是感覺）

### 2-1 量法

* 逐材質遮罩：judge 會輸出 `<name>_id_<view>.png`（每顆材質一個 ID 色，`DoubleSide`）與 `<name>_beauty_<view>.png`（真實單面渲染）。把兩張疊起來就能逐材質量「這顆材質有幾個像素、亮度多少、其中有幾個在 beauty 裡其實是背景」。腳本：`scratchpad/lampgate/matstats.py`、`hole.py`、`trans.py`（未進 repo）。
* hero／stage／table 三張圖：燈區用**固定框**，改前改後同一組座標（腳本 `scratchpad/lampgate/measure.py`，框寫在檔頭）：
  * hero `(190,440)-(400,745)`，龜身＝框外且 alpha>8 的全部像素
  * stage `(575,318)-(802,562)`，龜身＝`(556,60)-(1130,640)` 內、框外
  * table `(435,448)-(535,562)`（左起第一尊），龜身＝`(345,285)-(640,600)` 內、框外
  * 亮度＝`0.2126R+0.7152G+0.0722B`（sRGB 值域，未還原線性）

### 2-2 三個真因

| # | 事實 | 證據 |
|---|---|---|
| ① | **碗是一個洞。** 碗口 `caps:["flat","none"]`；且 `"flat"` 這個字串 `geometry.js:101` 的 `doCap` 根本不認得（只認 `fan`／`fanx`／`ngon`），所以碗兩端都沒封。單面渲染下看進碗口＝看穿到背景 | front：`lamp_bowl` ID 5,318 px 有 4,412（**83%**）在 beauty 是背景；`lamp_lip` 4,163 有 2,526（**61%**）。tq：64%／45% |
| ② | **碗與碗沿跟龜身撞色。** `lamp_bowl #d9d2c4` ≡ `shell_rim #d9d2c4`；`lamp_lip #d8b45c` ≡ `gold_trim #d8b45c` | `palette` 逐字元比對 |
| ③ | **碗畫得出來的那一點也幾乎全黑。** 碗掛在腹下，可見面朝下背光，只吃到 hemisphere 的地面色 | front beauty：`lamp_bowl` 平均亮度 **17.4**（RGB 25,15,10）、`lamp_lip` **26.9**（34,25,20）；同圖 `shell_rim` 是 126.4、`gold_trim` 125.8 |

而「火苗太暗／太小」**不成立**：改前 `glow_lamp` 在 stage／table 已經是全畫面最亮的一塊（峰值 238.6／217.5，已頂到 ACES＋bloom 的上限，`_traps_batch10 ⑨` 記的「燒成白黃團」就是這件事）。所以本卷**沒有**把火加亮，而是把碗補出來讓火有容器。

### 2-3 三張圖各自的失敗樣貌

* **hero**（`tools/anyCreature/harness/hero.mjs`，離線 GLB 渲染）：一塊扁平橘色菱形＋尖頂＝墜飾。碗完全看不到。
* **stage**（`tests/tools/creature-shoot.mjs`）：一整片**平的紅色板**＋奶白色錐體。紅板是**描邊外殼的內面**從碗的洞裡透出來的（外殼是 back-face、系色常駐），這正是 r2／r3 讀者說的「紅色緞帶／紅布條」。
  **這條有實測否證**：把改前那顆 GLB 用 `?outline=0` 重拍一次（[stage-before-outline0.png](stage-before-outline0.png)），紅板**整片消失**，碗的位置直接看見背後的夜空——證明紅板不是碗本身，是描邊外殼從洞裡透出來的；關掉描邊之後碗就等於不存在。指令：
  `node tests/tools/creature-shoot.mjs scratchpad/lampgate/stage-before-noout.png "glb=/docs/experiments/2026-09-18-lamp-gate/before/fushou.glb&light=1&fx=1&rim=xianghu&outline=0" idle 9309`
* **table**（`tests/tools/a2-sheet.mjs`）：奶白色錐體浮在紅桌布上，**桌布直接從碗裡穿過來**。

---

## 三、改動表（只動燈）

| 檔案:位置 | 改了什麼 | 為什麼 |
|---|---|---|
| `assets/creatures/fushou.json:48-50` `palette.lamp_bowl` | `#d9d2c4 / rough .72` → `#3d271c / rough .88` | 拆與 `shell_rim` 的撞色；外深（碗身煤黑上漆） |
| `:52-54` `palette.lamp_lip` | `#d8b45c / rough .42` → `#f0cd80 / rough .30` | 拆與 `gold_trim` 的撞色；內亮（碗沿＋碗內底＝亮黃銅），也是 hero 這種無自發光圖唯一能把燈區亮度做上去的手段 |
| `:56-58` `palette.glow_lamp` | `#d98a1e` → `#e07d12` | 同亮度、綠通道更低，ACES 之後比較不會洗成奶白 |
| `:~844/852/860` `volumes[cup].profile` 末三環 `exp` | `4.8/4.9/5` → `3.4/3.0/2.6` | `exp 5` 的圓角方斷面在特寫裡讀成托盤／匾額；碗口要圓（碗身後半維持方斷面不動） |
| `:~881-899` `volumes[brim].profile` | `0.26→0.346`（exp 5）→ `0.26→0.325`（exp 2.8→2.4） | `ref-fushou ④`「碗口外翻、口徑遠大於碗深」：碗沿外翻成一圈亮黃銅法蘭，是小尺寸下唯一讀得出「這是個容器」的線索。**根環 0.26 不能再大**——0.29 會被 `root_containment` BLOCK（實測「57% outside its host」） |
| `parts` 新增 `lamp bowl inner floor, shadowed (seals the open mouth)` | `fin`，host `Cp3`，材質 `socket`，斷面 superellipse(2.6) 半徑 0.25×0.204，厚 0.016 | 把碗口的洞補起來，同時當「碗內壁陰影」。**用 fin 不用 cap**：`caps` 改 `ngon` 或 `fan` 都會在 bind pose 產生 20 個翻面三角形、`mesh_integrity` 直接 BLOCK（兩種都實測過） |
| `parts` 新增 `lamp inner floor (brass)` | `fin`，host `Cp3`，材質 `lamp_lip`，半徑 0.178×0.145，厚 0.012，沿碗軸前移 0.012 | 碗內底的亮黃銅圓盤：正對 key 光，是 hero 圖裡燈區亮度的來源（0 → 1,449 個 >200 的像素） |
| `parts` `burning oil surface` | 圓盤 r 0.168 → superellipse(2.2) 0.118×0.096；厚 0.016→0.010；沿碗軸前移 0.022 | 原本的油面比火苗還大、又跟火苗同材質同色，兩者糊成一團才被讀成「墜」。縮成碗心一池，讓「碗沿→暗內壁→亮油池→火」四層分開 |
| `parts` `wick nub` | 加粗（r .016/.009 → .019/.010）、沿碗軸前移 0.030 | 當油面與火之間的暗隔，不讓火的根跟油池連成一塊 |
| `parts` 火苗 | 3 片 teardrop＋1 條 core → **5 片不等高不同傾角 teardrop（0.285/0.255/0.220/0.181/0.148）＋3 條長短不一的細舌** | `_traps_batch10 ⑥`：「火要讀成火需要多枝、不等高、嚴格垂直」。主軸維持垂直（傾 20° 就退回喙的讀法） |
| `:8` `_glow_materials` | 附上本卷三條實測（洞、撞色、GLB 沒有 emissive） | 下一隻不要再重走 |

**`js/` 一行沒動、`index.html` 一行沒動、`fushou.claims.json` 一個位元組沒動。**

### 3-1 diff 範圍檢查

```
$ git diff --stat
 assets/creatures/fushou.glb  | Bin 1145800 -> 1168300 bytes
 assets/creatures/fushou.json | 538 ++++++++++++++++++++++++++-------
 2 files changed, 436 insertions(+), 102 deletions(-)
```

66 個 hunk，舊檔行號全部落在下列五段（`git diff -U0` 的 hunk 標頭）：

| 舊行 | 內容 |
|---|---|
| `-8` | `_glow_materials` 註記 |
| `-49,2` / `-53,2` / `-57` | `palette.lamp_bowl` / `lamp_lip` / `glow_lamp` |
| `-844` / `-852` / `-860` | `volumes[cup].profile` 末三環的 `exp` |
| `-883` ～ `-899`（5 hunk） | `volumes[brim].profile` |
| `-3202,0` ～ `-3306,2`（20 hunk） | 碗口封板／碗內底（新增）、油面、燈芯 |
| `-3647` ～ `-3840,0`（34 hunk） | 火苗五片＋三舌 |

結構化比對（逐 key 走訪 before/after 兩份 JSON，腳本輸出如下）：改到的 top-level key 只有 `_glow_materials`、`palette`、`volumes`、`parts`；`volumes` 只有 `cup`／`brim` 兩條；`parts` 逐個以 `(_c, type, host, material)` 為鍵比對，**內容有變／新增／刪除的 12 個 part 全部 host 在 `Cp3` 或 `FlmR`**（都是燈的關節），`joints`／`chains`／`attach`／`mirror`／`touch`／`animations`／`shading`／其餘 45 個 part 內容一個位元組沒動。

---

## 四、硬指標

| 指標 | 改前 | 改後 | 門檻 | 判 |
|---|---|---|---|---|
| `cli.js` exit | 0 | **0**（`checks: all green`） | 0 | ✅ |
| judge 對 `fushou.claims.json` | 23/23 all pass | **23/23 all pass** | 列出通過數 | ✅ **claims 一個位元組沒改** |
| ↳ `focal_contrast`（shell_dark : glow_lamp，front） | 21.524% : 6.946% = **3.10×** | 21.893% : 4.520% = **4.84×** | ≥3× | ✅ 餘裕變大 |
| ↳ `share_hierarchy`（P:S:T，front，tol .15） | .4612/.4314/.1074，偏差上限 **.1388** | .4507/.4070/.1423，偏差上限 **.1493** | ≤.15 | ⚠️ 過，但餘裕由 .0112 掉到 **.0007**（見 §五-2） |
| tris | 6844 | **7072** | ≤ 8897（6844×1.3） | ✅ |
| bounds `min.y` / `h` / `w` / `d` | 0 / 1.2 / 1.46 / — | **0 / 1.2 / 1.46 / 1.29** | `min.y ≥ 0`、`h ≤ 1.2` | ✅ `allOk:true, errors:0`（[bounds-after.json](bounds-after.json)） |
| 原始 bbox X/Y/Z | 1.484 / 1.217 / 1.310 | **1.484 / 1.217 / 1.310** | ward：X ≥ Z | ✅ 完全未變 |
| `node --test tests/*.test.mjs` | — | **96/96 pass, 0 fail** | 全綠 | ✅ |
| `trace-eq` seeds 1–20 | — | **equal**（bytes 346441 = 346441） | 相等 | ✅（`index.html` 本來就沒動） |
| 8v8 兩 rAF draw calls | 626 | **626** | 不增，加光暈才允許 ≤ +8 | ✅ **+0** |
| 8v8 兩 rAF triangles | 431,968 | 436,528 | — | +1.06% |
| 桌面 hover render calls / tris | 79 / 36,529 | **79** / 37,669 | — | calls +0 |
| perf32 五輪配對 | .6394（0.57.19 紀錄） | **.8102 / .5826 / .5838 / .5571 / .5385**（中位 .5819） | 逐輪 ≥ .40 | ✅ 5/5 |
| console／page error | 0 | **0** | 0 | ✅（creature-shoot ×2、a2-sheet、duel-perf bounds 皆 `errors: []`） |

### 指令原文

```powershell
# 編譯
node tools/anyCreature/engine/cli.js assets/creatures/fushou.json assets/creatures/fushou.glb
# judge（不帶 --stage，_traps_batch10 ① 的坑）
node tools\anyCreature\harness\judge.mjs assets\creatures\fushou.glb scratchpad\judge-after fushou --spec assets\creatures\fushou.claims.json
# hero
node tools\anyCreature\harness\hero.mjs assets\creatures\fushou.glb scratchpad\hero-after
# stage／n3
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-18-lamp-gate/stage-after.png "glb=fushou.glb&light=1&fx=1&rim=xianghu" idle 9303
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-18-lamp-gate/n3-after.png  "glb=fushou.glb&light=1&fx=1&rim=xianghu&n=3" idle 9304
# 桌面 844×390 hover ＋ 8v8 ＋ metrics
node tests/tools/a2-sheet.mjs --key=fushou --name=after --out=docs/experiments/2026-09-18-lamp-gate --port=9305
# 測試／trace／bounds／perf32
node --test tests/*.test.mjs
node tests/tools/trace-eq.mjs scratchpad/index-before-lampgate.html index.html     # 副本＝git show HEAD:index.html
node tests/tools/duel-perf.mjs bounds docs/experiments/2026-09-18-lamp-gate/bounds-after.json
node tests/tools/scene-shot.mjs scratchpad/lampgate/perf32 --perf --coins=32 --runs=5 --seed=1 --port=9307
```

改法本身可重跑：[`lamp-edit.mjs`](lamp-edit.mjs)（從 `before/fushou.json` 重建 `assets/creatures/fushou.json`，輸出與現檔 md5 相同 `7486795c1d66cecb81edd3531b357213`）。

---

## 五、做不到／未解（如實標紅）

### 5-1 ❌「三張圖上燈區亮度峰值 > 龜身峰值」沒有達成（改前也沒有）

三張圖的**龜身峰值**都不在燈上，而且都在我不准動的地方：

| 圖 | 龜身峰值位置（實測 argmax） | 值 |
|---|---|---|
| hero | `(652,126)` RGB(255,255,255)，整群散在 x213–710 / y98–376 ＝香灰白裙邊 `shell_rim` 與鎏金鑲邊被 key 光打爆、**已經 clip 到 255** | 255.0 |
| stage | `(708,311)` RGB(240,240,231)，群落 x573–749 / y197–317 ＝同一圈香灰白裙邊被 rim 光打爆 | 239.4 |
| table | `(581,323)` RGB(255,243,123) ＝自發光眼 `eye` | 236.9 |

兩個結構性理由，兩個都不是調參能解的：

1. **hero／judge 這類離線圖沒有自發光**。anyCreature 的 GLB 不寫 `emissiveFactor`（`engine/core/glb.js:99-138` 的材質欄位只有 color/rough/metal/doubleSided），自發光完全是遊戲端 `js/creature-figures.js:56-57,345-348` 的 `/^glow_/` ＋ `emissive × COLOR_0`（intensity 2.8） 做的。所以派工假設的「靠自發光把燈做亮」在 hero 上**無效**，hero 的燈區亮度只能靠 albedo——而 albedo 的上限是白色，白色正是龜身峰值那個材質（`shell_rim #d9d2c4`）已經在用的。hero 龜身峰值已 clip 到 255，燈區要「>」在數學上不可能。
2. **stage／table 兩邊都頂到 tonemap 上限**。改前燈區峰值 238.6 對龜身 239.4，差 0.8；兩者都是 ACES 之後的近白，不是「燈不夠亮」，是量不出差別。

**改善的部分有量到**：hero 燈區 >200 的像素 0 → 1,449、>160 的 4,112 → 11,586、峰值 187.3 → 210.0。stage／table 的燈區平均亮度反而下降（80.9→76.2、87.3→76.9），這是**刻意的**——原本那片「亮紅平板」是描邊外殼從洞裡透出來的假亮度，補上碗之後變成一個暗碗＋一池亮油，平均值當然掉。

要真的讓這條成立，只有兩條路，兩條都超出「只動燈」：(a) 把 `shell_rim` 香灰白壓暗（動龜身，違反凍結 #1）；(b) 讓 GLB 帶 `emissiveFactor`（動 `tools/anyCreature`，是 junction 且明令別動）。

### 5-2 ⚠️ `share_hierarchy` 餘裕只剩 .0007

補洞這件事本身會把前視野裡約 1,200 px 由「龜腹／裙邊」轉給燈（`trans.py` 實測：`pot_body→socket` 520、`pot_body→lamp_lip` 274、`shell_rim→glow_lamp` 418），primary 因此從 .4612 掉到 .4507，偏差上限從 .1388 升到 .1493，門檻是 .15。**現在是靠把燈的正面投影收到剛好（封板 0.25、碗內底 0.178、碗沿 0.325、火苗 ×0.95）才壓在線內的**，下一次動這隻的任何東西都要重跑 judge，不能假設還有餘裕。若之後判定「燈本來就該是 primary」，把 `lamp_bowl` 移到 primary 可以一次拿回 .01 以上的餘裕，但那是改 claims、要另外簽。

### 5-3 ❌ 光暈 quad（派工候選手段 b）沒有做——實測會超過 draw 預算

凍結 #3 給光暈的額度是 8v8 兩 rAF draw **≤ +8**。實測：把三條火舌改掛一顆新材質（`glow_halo`）、其餘完全不動，重跑 `a2-sheet`——

| | 材質數 | 桌面 hover calls | 8v8 兩 rAF draw |
|---|---:|---:|---:|
| 出貨版（本卷） | 14 | 79 | 626 |
| ＋1 顆材質 | 15 | 83（+4） | **636（+10）** |

**多一顆材質＝多一顆 mesh／尊，8v8 十六尊就是 +10，已經超過 +8。** 走 `js/creature-figures.js` 掛 sprite 的路子每尊也是一顆新的 draw，成本相同或更高，所以「加色光暈 quad」在現行預算下做不到，不論放在 GLB 裡還是遊戲端。測試用的變體 GLB／metrics 留在 `scratchpad/lampgate/`（未進 repo）。
替代做法是現成的：遊戲端的 bloom（`js/renderer.js:36`，threshold 0.7、strength 1.05）本來就會在火苗周圍長出光暈，本卷把 `glow_lamp` 的綠通道壓低就是為了讓那圈光暈是橘的而不是奶白的。

### 5-4 未解

* 「碗的凹面」仍然做不出來（`_traps_batch10 ⑧`）。本卷的解法是**用亮度層次取代凹面**：碗沿亮黃銅 → 內壁暗 → 油池亮 → 火，不是真的做出一個凹槽。3/4 俯角下它仍然是一個盤子的讀法，只是這次盤子有邊、有內外。
* 盲讀沒做（凍結 #2 指定由主對話 4 位 context-free 讀者執行），本檔不預測結果。

---

## 六、檔案

| 檔 | 內容 |
|---|---|
| `before/fushou.json` / `fushou.glb` / `fushou.claims.json` | 改前三檔備份（＝ `HEAD` 版，v0.57.22） |
| `hero-{before,after}.png` | 1024² 離線 hero 圖（`harness/hero.mjs`） |
| `stage-{before,after}.png` | 戲台特寫（`creature-shoot.mjs`，`light=1&fx=1&rim=xianghu`） |
| `table-{before,after}.png` | 實際桌面 844×390 dpr2、hover 第 1 席（`a2-sheet.mjs`） |
| `duel-{before,after}.png` | 8v8 滿編 |
| `stage-before-outline0.png` | 改前 GLB ＋ `?outline=0`：紅板消失＝證明那是描邊外殼從洞裡透出來 |
| `n3-after.png` | 三尊並排（`&n=3`） |
| `metrics-{before,after}.json` | 桌面 calls/tris、8v8 draw/tris、errors |
| `bounds-after.json` | 30 隻 bounds 探針 |
| `perf32-after.json` | perf32 五輪配對 |
| `judge-after.txt` | judge 完整輸出（不帶 `--stage`） |
| `lamp-edit.mjs` | 本卷的改法腳本（從 `before/` 重建，可重跑） |
