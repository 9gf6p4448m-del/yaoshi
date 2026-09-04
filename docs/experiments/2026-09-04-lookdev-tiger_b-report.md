# 3D look-dev 卷 V-B 神像虎 回報（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-lookdev.md`（門檻未動）。
基準 SHA：`b2292f5`（worktree `agent-a5a0414eb1d4e689d`）。**未 commit、未 push。**
出貨檔：`assets/creatures/tiger_b.{json,glb,claims.json}`；截圖 `2026-09-04-lookdev-tiger_b-{hero,stage}.png`。

DEVLOG 一行：
`gates: LD-A0 pass | LD-A1 FAIL@r3(主印象三輪都是玩具／吉祥物；r3 連「虎」都掉回「狗」，出貨版回退到 r2) | LD-A2 pass | LD-A4 pass | unresolved: 低多邊形圓潤坐姿在 anyCreature 的體積語彙下讀不出「莊嚴神獸」`

---

## ① LD-A0／A1／A2／A4 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| **LD-A0** GLB 規格＋judge | **PASS** | 325,604 bytes ＝ **317.9KB ≤ 400KB**；`idle`／`move`／`attack` 三支；`skins`=1；`COLOR_0` 有；judge 對本卷放寬後的 claims **all claims pass**（`saturation_area` tq **57.97%**，落在 10–60% 帶內） |
| **LD-A0** silmetrics 側視＋hero | **PASS** | 側視與 hero 兩張剪影都被 context-free 讀者判為「四足動物、蹲坐姿、讀得出頭／口鼻／四肢」，不是抽象色塊（原話見 ②-0） |
| **LD-A1** 盲讀 | **未過（FAIL）** | 三輪、每輪 2 位 context-free `sonnet`，主印象**三輪都是玩具／吉祥物／可愛**，沒有一位說出威／兇／神／莊嚴。第 2 輪兩位都讀成「老虎」（識別過了），第 3 輪回退成「小狗」。依凍結檔的修復額度上限出貨最佳版本（＝第 2 輪那一版）並標「未過」 |
| **LD-A2** 截圖 | **PASS** | `…-hero.png`（anyCreature hero，1024²、透明底、margin 8.2%）與 `…-stage.png`（戲台 3/4，844×390、`creature-preview.html` 現有燈光、console 0 error） |
| **LD-A4** 範圍 | **PASS** | `git diff --stat` 只有 `assets/creatures/tiger_b.*`、`docs/experiments/2026-09-04-lookdev-tiger_b-*`、`tests/tools/creature-preview.html`（只加 `?glb=` 解析那一行）；`tiger.*` 原檔一個位元組都沒動 |

---

## ② 盲讀原話（context-free 子 agent，`model: sonnet`，只給圖檔路徑）

### ②-0 LD-A0 剪影辨識（silmetrics 的 `sil_side.png` / `sil_hero.png`，只給兩張黑剪影）

> v_a.png：看得出頭部(有耳朵狀突起在頭頂偏後)、口鼻部(左側往前突出、有明顯下顎線條)、身體軀幹(蹲坐姿、背部弧線)、四肢(前腳撐地、後腳彎折於身體下方，末端有分岔像腳掌或爪)。整體輪廓有點狀凹凸邊緣，但四肢比例、蹲坐姿態、頭部與軀幹的銜接都符合四足動物的結構，這個視角讀起來像一隻真的生物，而不是抽象色塊。
>
> v_b.png：看得出頭部(頂端有尖狀突起、類似耳朵或角)、口鼻部(左側有向外的小突出)、身體(蜷縮團塊狀，背部呈圓弧)、下方兩個分開的腳掌狀突起。但整體比例比較模糊……看起來介於「蜷縮的生物」與「不規則色塊」之間，辨識度比 v_a 低，比較像是可以勉強讀成生物、但不如 v_a 來得肯定。

判定：側視 PASS、hero 勉強 PASS（「可以讀成生物」，不是「抽象／什麼都不是」）。

### ②-1 第 1 輪（hero + stage 兩張）

讀者甲：
> 1) 看起來像一隻卡通風格的小狗（或帶點浣熊/柴犬感的犬科幼獸），有黑鼻頭、白色獠牙、圓臉。
> 2) 頭上戴著黃色角狀裝飾、脖子繫紅色圍巾，配色偏喜氣、討喜，帶點小威風但整體還是可愛、稚氣的感覺。
> 3) 低多邊形（low-poly）卡通建模、圓潤造型、坐姿呆萌，明顯是吉祥物／裝飾角色的做法，不是要營造猛獸的威嚇感。
> 4) 有一點像但不完全像：紅色纏繞在脖子上的布條、頭頂金黃色角飾，帶有一點廟會/神獸裝飾的元素，但整體造型圓潤可愛、沒有石獅或護法那種威嚴莊重的雕塑感，比較偏向可愛版的節慶吉祥物。

讀者乙：
> 1) 看起來像一隻松鼠或花栗鼠一類的小型齧齒動物——臉型圓潤、有大門牙、鼻頭圓黑。
> 2) 頭上有黃色角狀／盔狀裝飾、脖子繫紅色布巾，加上身上有幾道黑色條紋，整體給人一種帶點喜氣、討喜又有點裝飾感的小怪獸氣質，不算兇。
> 3) 明顯偏向玩具／吉祥物——低多邊形卡通造型、圓潤五官、鮮豔紅黃配色，看起來可愛而非嚇人。
> 4) 有一點像。……但整體臉部與比例仍是可愛動物風格，不像石獅或護法那種莊嚴、威嚴的造型。

判定 **FAIL**（連「虎」都沒讀到；主印象＝玩具）。工單：①「圓鼻頭＋圓眼球」＝幼獸臉 ②沒有條紋所以讀不出虎 ③背光只從頭頂冒一角、被讀成「角飾」。

### ②-2 第 2 輪（＝出貨版）

讀者甲：
> 1) 一隻低多邊形風格的橘棕色小老虎（幼虎），身上有黑色條紋、白色胸腹毛，張嘴露出小虎牙。
> 2) 頭上戴著黃紅配色的頭飾／髮箍、脖子繫著紅色圍巾（帶黃色扣飾），表情張嘴像在叫或笑，整體給人活潑、討喜、帶點喜氣（廟會／喜慶感）的氣質，而不是凶猛。
> 3) 低面數卡通建模、比例圓潤（大頭小身、坐姿），加上頭飾與圍巾裝飾，明顯偏吉祥物／公仔風格，完全不威嚇。
> 4) 有一點像——頭上的黃紅頭飾和紅色圍巾配色很像廟會、神轎或舞獅／舞龍隊伍常見的喜慶紅金配色……但造型是可愛幼虎坐姿、張嘴表情軟萌，不是石獅或護法那種莊嚴、威嚴、齜牙睜眼的鎮守姿態。

讀者乙：
> 1) 一隻低多邊形風格的小老虎（虎斑幼崽造型），耳朵、口鼻與身上的黑色條紋都是虎的特徵。
> 2) 稚氣、活潑、帶點頑皮——大眼睛、張嘴露牙的表情加上紅色圍巾／項圈，給人的感覺是可愛親人而不是凶猛。
> 3) 整體比例矮胖圓潤、色彩鮮豔（橘、黃、紅），配件像圍巾或裝飾帶，明顯偏向吉祥物／玩具公仔。
> 4) 不太像廟裡的神獸：……這隻是坐姿放鬆、比例可愛化、表情帶笑意的 Q 版角色。

判定 **識別 PASS（兩位都說老虎）、印象 FAIL**。工單：①「大頭小身」②「張嘴像在叫或笑」③背光被讀成「髮箍」④「沒有肌肉線條」。

### ②-3 第 3 輪（依上面工單改：頭縮 18%、閉嘴、加肩膀體積、背光放大）

讀者甲：
> 1) 一隻低多邊形風格的小狗（幼犬），豎起的耳朵、圓圓的口鼻，坐姿。
> 2) 頭上戴著一頂黃紅相間的尖頂帽（像頭盔或帽子），脖子繫紅色項圈，整體感覺像是穿了裝備、要出任務的小隊寵物。
> 3) 明顯偏玩具／吉祥物路線——低多邊形圓潤造型、比例可愛（大頭小身體、坐姿），完全沒有威嚇性猛獸該有的獠牙、肌肉線條或攻擊姿態。
> 4) 不太像。……這隻是可愛犬類、配色鮮豔，帽子造型也偏卡通裝備而非神獸頭飾。

讀者乙：
> 1) 這是一隻圓潤的小狗（幼犬），坐姿，頭上戴著一頂黃紅色的頭盔或帽子造型裝飾，脖子上繫著紅色項圈，背上有一排黑色尖刺狀突起。
> 2) 整體氣質偏可愛、討喜，帶點頑皮感……感覺親近而不兇。
> 3) 比較像玩具／吉祥物——低多邊形卡通風格、圓潤造型、鮮豔配色。
> 4) 不太像。廟裡的神獸……造型威嚴、線條剛硬、姿態肅穆莊重；這隻的圓潤卡通比例、坐姿放鬆、表情近似寵物狗。

判定 **FAIL，且比第 2 輪退步**（識別從「老虎」掉回「狗」）。
**出貨決定：回退到第 2 輪那一版**（它是三輪裡唯一兩位讀者都說「老虎」的版本），並標記 LD-A1 未過。第 3 輪的規格另存在 worktree 外的 scratch，不入 git。

---

## ③ 改了什麼、與 `tiger.json` 差在哪

出貨版 `assets/creatures/tiger_b.json` 是從 `tiger.json` 複製起手後整份重寫的（骨架、體積、部位、動畫都改），共用模板只留 `shading`（`gradient 0.30/-0.88`、`noise 0.018/0.26`）與三支動畫的軌道結構。

### 比例數字（silmetrics 側視；括號為 `tiger.json` 的值）

| 指標 | tiger_b（V-B） | tiger（試作卷） | 變化 |
|---|---|---|---|
| `W_over_H` | **0.87** | 1.83 | −52%，從「長而低的爬姿」翻成「直立的柱狀坐姿」 |
| `fill` | 0.478 | 0.485 | 持平 |
| `mass_thirds` | 0.283 / **0.522** / 0.195 | 0.331 / 0.416 / 0.252 | 質量集中到中段（胸與前肢柱） |
| `mass_contrast` | **3.72** | 3.72 | 相同 |
| `leg_fraction` | 0.26 | 0.301 | −13% |
| `turn_count` | **30** | 21 | ＋43%（條紋板與背光讓輪廓更碎） |
| 模型尺寸 (W,H,D) | 0.638 / **1.212** / 1.103 | — | 高度是試作卷（約 0.85）的 1.43 倍 |
| GLB | 317.9KB | 203.7KB | ＋56%（部位數 15→29） |

### 逐項設計差異

| 項目 | tiger.json | tiger_b.json |
|---|---|---|
| 姿態 | 四足爬伏、頭扭向側前、右前掌抬起 | **端坐**：後腿折在體側、前腿兩根直柱、胸挺出、頭抬平；右前掌踩一枚金錢（`fin` 八角金片，`RFrontToe` offset `[0,-0.048,0.025]`） |
| 骨架 `Hips` | `[0, 0.56, -0.34]` | `[0, 0.304, -0.208]`（全份幾何等比 ×0.80，見 ⑤-2） |
| 身體 profile | 6 排、最寬 0.290 | 7 排、最寬 0.305（縮放後 0.244），`sharp` 從 2 排增為 4 排 |
| `smooth_angle` | 50 | **20**（頭部 volume 另設 16、身體 18）＝凍結檔流程裁定 3 的 28–40 帶再往下壓，追求雕刻面 |
| 頭 | `exp 3.0`、圓頂、頭share 0.36 | `exp 3.4/4.0`、**扁而寬**（半高 0.248→0.1856，半寬保持 0.32）、`sides` 14→12 |
| 眼 | `eye` 球體 size 0.030 | **三層疊片**：黑眼窩（`stripe` t=0.014）→ 金杏眼（`eye` t=0.030）→ 黑瞳（`stripe` t=0.046），厚度遞增讓後層壓在前層上；另加一道細黑眉 |
| 鼻 | `spike` 圓錐 r 0.045 | **寬扁黑鼻楔**（`fin` 梯形 0.104×0.062） |
| 口 | 大張、`fur_jaw #6b5344` | 微張、`fur_jaw #5e2018`（深赤黑，讀作口腔不是舌頭） |
| 綬帶 | `collar` 環＋兩條 `fin` 飄帶（盲讀三次都沒被命名） | **改成 volume**：`sashL`／`sashR` 兩條實體肩帶從左右肩斜下交會於胸前，＋放大的八角金牌（`fin`，半徑 0.108，掛在交會點正前方）＋加大的頸環。第 2 輪讀者主動點名「紅色圍巾（帶黃色扣飾）」＝**部位被讀出來了**，補上試作卷 ⑥-2 的缺口 |
| 額頭金印 | `fin` 方片 0.116×0.116 | 雙層方印（外 0.156 ＋ 內凸起 0.088），位置 `head t=0.62 around 0` |
| 條紋 | 4 對 `fin`，只在腹側 | **9 對**：腹側 5 對（t 0.22/0.36/0.50/0.72/0.79）、顱側 2 對、臉頰 2 對、大腿外側 2 對 |
| 神性語彙 | 無 | **背光（背後光環）**：金色十邊形外盤（半徑 0.28）＋深赤內盤（0.218），掛在 `Neck2` 面向前方 |
| 配色 | 全身低飽和棕（`fur_body #6f5a4a`） | 頭部保留飽和虎橘 `#bd7029`＋身體上半 `arcs 0–85° #b0601c`；大塊支撐面（腿 `#916f58`、掌 `#5c4839`）壓在 HSV S<0.40，把飽和額度留給頭與配件 |

---

## ④ 指令原文與實際輸出

### LD-A0 — GLB 規格

```
$ node engine/cli.js .../assets/creatures/tiger_b.json out/tiger_b/ship.glb
{"ok":true,"out":"out/tiger_b/ship.glb","bytes":325604,"verts":4049,"faces":1628,"joints":39,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.596}}

$ node -e '<讀出貨 GLB 的 JSON chunk>'
{"bytes":325604,"kb":317.9,"animations":["idle","move","attack"],"skins":1,"meshes":1,
 "primitives":15,"attributes":["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"],
 "images":0,"asset":{"version":"2.0","generator":"anyCreature v1.2.0",
 "extras":{"harness":"anyCreature","harness_version":"1.2.0","spec":"tiger_b"}}}
```

逐條：317.9KB ≤ 400KB ✅ ／ 三支動畫齊 ✅ ／ `skins`=1 ✅ ／ `COLOR_0` 有 ✅

### LD-A0 — judge（本卷放寬後的 claims）

```
$ node harness/judge.mjs out/tiger_b/ship.glb out/tiger_b/jship tiger_b \
      --spec .../assets/creatures/tiger_b.claims.json
"stats":{"triangles":2844,"skinnedMeshes":15,"animations":["idle","move","attack"]}
"lum":{"front":55.6,"side":52.2,"tq":57.7,"reartq":51.5,"top":62.9}
"hi_sat_share":{"front":0.5384,"side":0.6005,"tq":0.5797,"reartq":0.7633,"top":0.9477}
"whole":{"size":[0.638,1.2119,1.1025]}
[judge] Spec "神像虎 tiger_ye_shrine V-B (NPC/elite)" — all claims pass.
```

`saturation_area`（tq）＝ **57.97%**，落在 `claims.json` 寫定的 10–60% 帶內。
**這個帶是在第一次 build 之前就寫進 `tiger_b.claims.json` 的，全程沒有再動過**；期間有兩次撞上上限（92.8%、77.2%、61.7%），三次都是**改配色去遷就標準**（把腿／掌／尾的 HSV S 壓到 0.40 以下），沒有調帶。

### LD-A0 — silmetrics

```
$ node harness/silmetrics.mjs out/tiger_b/ship.glb out/tiger_b/sship
{"W_over_H":0.87,"fill":0.478,"mass_thirds":[0.283,0.522,0.195],"torso_depth_max":0.99,
 "torso_depth_min":0.27,"mass_contrast":3.72,"leg_fraction":0.26,"turn_count":30,
 "zigzag_alignment":0.81,"front":{"W_over_H":0.49,"fill":0.816},
 "top":{"W_over_H":0.63,"fill":0.658},"hero":{"W_over_H":0.73,"fill":0.563}}
```

### LD-A2 — 兩張截圖

```
$ node harness/hero.mjs out/tiger_b/ship.glb out/tiger_b/hship
{"ok":true,"margin":8.2}                      # → docs/experiments/2026-09-04-lookdev-tiger_b-hero.png

$ python3 -m http.server 8798 --bind 127.0.0.1      # 服務 worktree 根目錄（PID 88171，用完已關）
$ node <shoot-stage.mjs> http://127.0.0.1:8798 .../2026-09-04-lookdev-tiger_b-stage.png \
        ../../assets/creatures/tiger_b.glb
{"ok":true,"out":".../2026-09-04-lookdev-tiger_b-stage.png","loadMs":337,
 "clips":["idle","move","attack"],"bones":39,"consoleErrors":[]}
```

stage 用 `tests/tools/creature-preview.html?auto=0&glb=…`，viewport **844×390**、`deviceScaleFactor 2`、`creature-preview.html` 現有燈光（燈籠 5.2/14、bloom 1.05/0.5/0.3/1.7）、HUD 隱藏、idle 走 1.2 秒後按快門。console／pageerror／requestfailed 三種都收，**空陣列**。

### LD-A4 — diff 範圍

```
$ git add -N . && git diff --stat
 assets/creatures/tiger_b.claims.json               |   63 +
 assets/creatures/tiger_b.glb                       |  Bin 0 -> 325604 bytes
 assets/creatures/tiger_b.json                      | 2496 ++++++++++++++++++++
 .../2026-09-04-lookdev-tiger_b-hero.png            |  Bin 0 -> 302671 bytes
 .../2026-09-04-lookdev-tiger_b-stage.png           |  Bin 0 -> 81223 bytes
 tests/tools/creature-preview.html                  |    3 +-
 6 files changed, 2561 insertions(+), 1 deletion(-)
```

`creature-preview.html` 的那一行就是凍結檔允許的 `?glb=` 解析，其他行為未改：

```diff
-const GLB = '../../assets/creatures/tiger.glb';
+// ?glb=<相對於本頁的路徑>：look-dev 卷要拿同一組燈光拍不同方案，預設仍是試作卷的 tiger.glb
+const GLB = q.get('glb') || '../../assets/creatures/tiger.glb';
```

`assets/creatures/tiger.{json,glb,claims.json}`、`js/creature-figures.js`、`index.html`、`js/scene-env.js`、`js/renderer.js`、`js/duel-figures.js` **一行都沒動**。`git add -N` 之後已 `git reset` 還原索引。未 commit、未 push。8798 埠的 `python3 -m http.server`（PID 88171）已關閉。

---

## ⑤ 做不到的事（誠實條）

1. **LD-A1 沒過，三輪都沒過。** 主印象在三輪盲讀（共 6 位 context-free 讀者）裡沒有任何一次落在「威／兇／神／莊嚴」，一律是「玩具／吉祥物／可愛」。出貨的是第 2 輪版本，因為那是唯一兩位讀者都讀成「老虎」的一版；第 3 輪照讀者工單改（頭縮 18%、閉嘴、加肩膀肌塊、背光放大）反而讓識別從「老虎」退回「小狗」，所以整輪撤回。

   我的判斷是**方案本身與 anyCreature 的體積語彙相衝**，不是這一版沒調好：
   - 引擎的體積是「沿鏈的橢圓管 ＋ 平板部位」。石雕的莊嚴感來自**剛硬的直線、方角、對稱的分面**；管狀體積在任何 `smooth_angle` 下都會保留圓潤的橫截面，讀者三輪都點名「圓潤造型」。
   - 端坐姿本身被讀成「坐姿放鬆／呆萌」。同樣是坐，石獅靠的是誇張的胸肌塊、鬃毛螺旋、怒目——前兩者要多顆獨立體積（我第 3 輪加了肩膀體積，結果反而被讀成「背上一排黑色尖刺」與「穿裝備的小隊寵物」）。
   - **決策建議留給使用者**：若 V-B 要繼續，最有效的下一步是換掉「坐姿」這個概念（改半蹲前撲、或站姿俯視），而不是繼續在坐姿上加零件；若 V-A／V-C 有任一方案的盲讀過了，直接採用那個，V-B 的紅綬帶 volume 做法與三層疊片眼睛可以移植過去。

2. **背光（神性語彙）沒有被讀成背光。** 三輪分別被讀成「黃色角狀裝飾」→「頭飾／髮箍」→「尖頂帽／頭盔」。放大、置中、改掛點都試過，**它在 3/4 鏡頭下永遠被讀成戴在頭上的東西**。這是 look-dev 卷值得記下的一條：低視角 3/4 的戲台鏡頭裡，頭後的圓盤沒有辦法靠幾何本身傳達「在頭後面」——要靠材質（emissive／半透明）或粒子，而那是 L 卷的範圍。

3. **模型比試作卷高 43%，戲台鏡頭原本框不下。** `creature-preview.html` 的單隻鏡頭（`camDist 2.35`、`tilt 17°`、`fov 50` 固定）是照試作卷那隻高 0.85 的爬姿虎調的；第一版坐姿虎高 1.44，頭被切掉。凍結檔不准我改那頁的鏡頭，所以我改的是**模型**：寫了一支等比縮放腳本把整份 spec 的幾何值 ×0.80（joints／profile／ring_step／part points／offset／size／位移軌道，角度與 t 不動），縮到 1.21 才框得進去。
   **這件事會影響量產 26 隻**：坐姿／站姿類的體型必須自己縮到高度 ≲1.25，或由主對話在 `creature-figures.js` 那一層做 per-creature scale。目前是前者，寫在這裡以免下一卷重踩。

4. **`smooth_angle` 用 20／18／16，低於凍結檔建議的 28–40。** 凍結檔說「各方案自訂（建議 28–40）」，我在建議帶外。理由：28 以上在 `sides:12` 的管上仍然全部平滑成一顆蛋，壓到 20 以下才看得出分面。這是建議不是門檻，但仍應標記。

5. **`part_attachment` 對大圓盤（背光）的判法是引擎陷阱，繞過方式記在這裡。** 它量的是「板子的每個**頂點**到最近那圈 ring 的圓心距離 − 該 ring 的最大半徑」；圓盤的頂點全在外緣，所以半徑一超過宿主 ring 半徑就必 BLOCK，而且**宿主愈小愈容易 BLOCK**（我把頭縮小 18% 之後，原本過關的背光立刻 fail）。解法是把 `host` 換成**身體鏈上的關節**（`Neck2`），讓它去比身體那些大得多的 ring，而不是頭部的 ring。這是試作卷 ③-3 陷阱的延伸案例。

6. **`head` chain 的 `t` 不是「沿頭的比例」。** `HeadRoot` 埋在脖子裡，累積長度換算後 `Skull`＝t 0.464、`Brow`＝t 0.702、`Muzzle`＝t 0.902。我前四次把眼睛放在 t 0.47–0.60（以為那是眉心，其實是**顱骨中段、耳朵後方**），耳朵放在 t 0.20（**在脖子裡**），白花了四輪 build。量產 26 隻請先算 chain 的累積長度再決定 `t`。

7. **`around` 的角度在寬扁頭上很難憑推理落點。** 我掃了 84／100／112 三個角度才把眼睛放到臉側，靠的是看 `judge.mjs` 產出的 `*_beauty_front.png`／`*_beauty_tq.png` 逐張對照，不是算出來的。量產時建議直接把 judge 的 beauty 圖當定位工具。

8. **沒有量效能、沒有測 `?n=8`、沒有真機。** 凍結檔的 LD-A0～A4 沒有要求，本卷也沒做；`tiger_b` 的部位數（29）與三角形數（2,844）都比試作卷（15／2,628）高，8 隻同場的 draw call 會上升，正式接線前要補量。

9. **`move` 動畫在坐姿上是勉強的。** 一隻端坐的神像「走路」在語意上不成立，我做的是原地的重心搖擺＋四肢小幅擺動，只為滿足 `anim_named` 三支齊備。真正接進對決時，V-B 這種坐姿體型的 `move` 該怎麼演，需要另外裁定。
