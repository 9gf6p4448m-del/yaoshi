# A2 標竿卷 第三件「魔神仔紅帽 redhat」— 甲／乙兩案證據目錄（2026-09-17）

基準 worktree `C:/Users/shung/wt/yaoshi/a1-duel-draws`。**未 commit、未 push。**
`assets/creatures/redhat.json`／`redhat.glb`／`redhat.claims.json` 一個位元組沒動（`git diff --stat` 為空），`js/`、`index.html` 沒碰。

> **這份文件不做盲讀、不評哪一案比較好。** 兩案都編得出來、judge 對各自 claims 12/12 全綠，挑哪一案是使用者的品味裁定。
> 起因：現版 `redhat` 技術鏈全過，但 R-A2 盲讀三輪未過（`docs/experiments/2026-09-04-review-redhat-report.md:8, 155, 207-211`）——
> 六位讀者 6/6 讀成妖怪／幽靈，但 6/6 正文出現「可愛」；具體施力點是 D 說的「**矮胖敦厚**」、C／E／F 說的細長肢體像「**昆蟲細足**」、
> C／D 說下半身是「**水晶／寶石底座**」、E／F 說是「滴落的黏液／植物根鬚」。兩案都是往「把這三個誤讀的幾何來源拆掉」推。

新增檔：`assets/creatures/redhat_a.json`／`redhat_a.claims.json`／`redhat_a.glb`、`redhat_b.json`／`redhat_b.claims.json`／`redhat_b.glb`。
兩份 spec 與 claims 由 `specgen/build_redhat_variants.mjs` 一次執行寫出（claims 寫在第一次 `judge.mjs` **之前**），基底是出貨版 `redhat.json` 的深拷貝。

**兩案都保留**：haunt 專用半透明材質名 `ghost_skirt`／`ghost_wisp`（`js/creature-figures.js:345` 靠 `/^ghost_/` 掛 opacity 0.62；兩顆 GLB 的材質清單都有這兩個名字）、
body 鏈 `Waist→Spine→Chest→NeckB→Neck2` 與 mist 鏈 `MistRoot→Mist1→Mist2→MistTip` 的骨架結構（只動座標、沒有增刪關節、沒有腿鏈）、
animations 三個 clip 名 `idle`／`move`／`attack`（三支 track 內容一字未改，乙案新增的 `LElbow2`／`RElbow2` 不在任何 track 裡）。

---

## ① 甲案 `redhat_a`「紅帽猴精」— 改了哪些欄位、為什麼讀者會說出「猴／紅帽」

| 改的欄位 | 相對現版 `redhat.json` 做了什麼 | 為什麼指向「戴紅斗笠的猴精」 |
|---|---|---|
| `joints` 的 `HatRoot`／`Hat1`／`HatTip`＋`volumes.hat` 全部重寫 | hat 鏈由 0.175 縮到 0.097、往後仰（`fwd` 轉負）；profile 的笠簷推到半徑 0.168（現版 0.108），笠簷之上的錐只剩 0.051 高 | `ref-redhat.md:20` 特徵④「頭戴紅帽」是跨多個獨立記述的識別色。現版是**高尖錐帽**，2026-09-04 六位讀者裡有四位主動寫「巫師帽／兜帽」（`review-redhat-report.md:29,37,47`）——尖帽是西方 gnome 的語彙，本身就在餵「可愛」。改成台灣的**斗笠**：笠頂高 ÷ 笠簷半徑 ＝ 0.36（第一版做 0.93，hero 圖實測仍被讀成「紅色尖兜帽／狐狸面」，本卷第二輪才改對） |
| `joints` 的 `JawRoot`／`Jaw1`／`JawTip` 前推、`volumes.jaw` 改方箱 | 吻部從 Skull 往前 0.018＋0.078＋0.050，剖面 0.040→0.058→0.050→0.030 | `ref-redhat.md:18` 特徵②「面貌狀似猿猴」。現版吻已經有了、六位 6/6 讀到「口鼻部」（`review-redhat-report.md:207`），但被讀成**狼／犬科**；猴吻的差別是**方而鈍、不是錐而尖**，所以剖面在中段先撐寬再收 |
| `joints` 的 `Waist`／`Spine`／`Chest` 上移加長、`volumes.body` 半徑由 0.142 收到 0.124 | 全身抬高 0.06、軀幹加長 0.027、最寬處收窄 13% | 讀者 D 寫「比例上頭小身體大，**呈現矮胖敦厚的體型**」（`:47`）。派工鐵則：矮小要靠「比例錯、瘦、骨感」。機械痕跡＝側視 `W_over_H` 由 **0.55 降到 0.40** |
| `parts`：7 根 4 邊 `curve` 濕毛條 → **4 片寬 `fin` 濕毛片**（`conform:false`，懸在體側四個象限） | 少而寬：每片寬 0.066、長 0.15–0.20，四片分居前右／後左／後右／前左 | C／E／F 三位把細部件讀成「**昆蟲的細足／枯枝**」（`:39,55,64`），舊報告 ⑥-4 自己記了「濕毛條＋指爪＋霧鬚加起來在遠處變成一叢細棍」。`ART_BIBLE.md:44` 陰氣的材質語言是「吸飽水的布、濕髮」——濕透的毛是**成片黏在一起**的，不是一根一根 |
| `parts`：指爪 5 根 → **3 根**（左 2 右 1），半徑 0.008→0.012–0.013 | 同上，少而寬 | 同上；而且 `ref-redhat.md:19` 的「指間有蹼」在現版是同色薄板、六位 **0/6** 讀到（舊報告 ⑥-3 記為未達成），與其再做細件不如把手做粗 |
| `parts`：9 條等粗 `ghost_wisp` 霧鬚 → **3 片寬根簾（`fin`）＋4 條粗氣根（`curve`，半徑 0.015–0.026）** | 根簾寬 0.09、垂 0.20–0.28；氣根最粗 0.026、最細 0.006，長度 0.096–0.282 全不同 | C／D 讀成「翡翠綠半透明**水晶/寶石狀的底座**」、E／F 讀成「滴落的黏液／植物根鬚」（`:39,47,55,64`）。`ART_BIBLE.md:44` 明寫陰氣的材質語言含「**榕樹氣根**」——氣根的識別特徵就是**粗細不一、長短錯落**，等粗等長的簾子只會讀成裝飾流蘇 |
| `volumes.mist.colors.arcs`：亮青綠 `#4ab488` 大孤帶 → 苔綠 `#3d6e4e` 與濕黑 `#2b332e` 五道窄帶交錯 | 去掉唯一一塊高飽和的青綠面 | 這一塊就是「水晶／寶石」誤讀的**顏色**來源（低多邊形＋大面積飽和青綠＝寶石）。`ART_BIBLE.md:41` 的陰氣主色是苔綠 `#3d6e4e`＋濕黑，亮色 `#70b080` 只是「亮」不是「主」 |
| `palette`：`hat` `#991018`→`#ad1420`、`robe`→`#3a3a33`、`pelt`→`#2f342e`、`skin_jaw`→`#6a5f50`、`ghost_wisp` `#6ec6a0`→`#6a7a6c` | 紅只留在斗笠與眼；霧鬚由螢光青綠改濕木灰綠 | `ART_BIBLE.md:41`「苔綠＋濕黑＋**一點**刺眼的紅」——刺眼的紅要是**一點**才刺眼。機械痕跡＝高飽和面積 tq 由 21.1% 降到 14.8%，而那 14.8% 幾乎全在帽上 |
| `parts`：尖耳 `fin` 放大 1.15 倍、`udir` 轉成 `[0.60,0.80,0]`（往上翹）、眼 `size` 0.026→0.024 但 `face` 0.042→0.044 往前 | 耳往上翹、眼往吻部方向前移 | `ref-redhat.md:18` 特徵②「兩耳上端尖銳、雙眼通紅」。尖耳現版只有 1/6 讀到（`:211`）；眼在現版 tq 視角只有 0.51%，本案 **1.00%**（笠簷往後仰之後臉不再被蓋住） |

## ② 乙案 `redhat_b`「錯位的紅衣小孩」— 改了哪些欄位、為什麼讀者會說出「小孩／紅帽」

| 改的欄位 | 做了什麼 | 為什麼指向「太像人、但比例錯」 |
|---|---|---|
| `joints` 的 `NeckB`／`Neck2` 由「往上」改成「幾乎只往前」（`up` 0.086/0.052 → **0.030/0.016**，`fwd` 0.030/0.018 → **0.046/0.040**） | 脖子不抬，只把頭往前送——頭低到縮進肩線裡 | `ART_BIBLE.md:45` 陰氣的剪影就是「不對稱、**比例錯誤**（手太長、**頭太低**、關節多一節）」，:46「讓玩家先覺得『好像是人』再覺得不對」。這是三條裡最便宜也最有效的一條：人形輪廓完全保留，錯的只有角度 |
| `chains.LArm`／`RArm` 由 4 個關節改 **5 個**（新增 `LElbow2`／`RElbow2`），整條長到手垂過衣襬 | 左臂 5 段 0.051/0.153/0.121/0.159/0.082；右臂 0.049/0.136/0.155/0.119/0.068（兩條長度與折點都不同＝不對稱） | 同 `:45`「**手太長、關節多一節**」。這是聖經原文逐字寫出來的手段，本案是把它做成幾何 |
| `palette`：`robe` `#333c36`→`#6a3d38`、`sleeve`→`#5e3733`、`stump_arm`→`#5e3733`、`hat`→`#c01824` | 衣是吸飽水的暗紅，帽是刺眼的正紅 | `ref-redhat.md:20` 特徵④裡劉柏君的版本是「**全身均穿著紅色衣物**」（不是只有帽）；`ART_BIBLE.md:41` 允許陰氣用「一點刺眼的紅（IP 色：紅帽、黃雨衣在此例外放寬）」。做法是**衣濕、帽不濕**：`#6a3d38` 的 HSV S＝0.472，`judge.mjs:126` 的高飽和門檻是 S≥0.50，所以大面積的衣不算「刺眼」，刺眼的那一份全留給帽 |
| `joints` 的 `HatRoot`／`Hat1`／`HatTip`＋`volumes.hat`：改小孩圓帽＋垂帽簷（半徑 0.146，`caps` 首端改 `none`） | 圓頂、帽簷往下垂罩住臉 | 尖巫師帽 → **小孩的圓帽**：現版四位讀者寫的「巫師帽」在乙案這裡被換成一頂會出現在廟口的紅童帽。帽簷同時是「臉埋在陰影裡」的光學手段 |
| `palette`：`skin_head` `#4b463d`→`#2a2723`、`skin_jaw`→`#33302a`；`parts` 尖耳縮到 0.72 倍 | 臉與吻壓暗、耳收小不搶戲，只留兩顆紅眼 | `ART_BIBLE.md:47` 陰氣「手段全開：**空洞眼**」。整張臉退到帽簷陰影裡、只剩兩點紅，比把五官做細更接近「太像人」。機械痕跡＝`focal_contrast`（帽÷臉）由 4.12× 拉到 **12.37×** |
| `volumes.mist`：寬鐘形＋5 道 `sharp` 斷面；`colors.arcs` 改泥褐 `#3b3a34`／霉綠 `#46543f` 窄帶交錯 | 霧裾改成「一層層折起來的濕布」 | `ART_BIBLE.md:44`「吸飽水的布、霉斑、泥」。光滑的鐘形在第一輪 hero 圖上讀成「蛋／豆子」（本卷實測），`sharp` 斷面是把它變回布折的唯一便宜手段；顏色同甲案，去掉「水晶」的青綠 |
| `parts` 新增 **3 片 `ghost_skirt` 拖地布幅**（`conform:false`，`vdir` 帶徑向分量往下往外張） | 一幅垂到 y≈0.09（及地）、一幅只到 y≈0.21、一幅在背後 y≈0.16——三片長度全不同 | `ART_BIBLE.md:45`「剪影**不對稱**」。這是乙案的招牌：**一側長一側短，永遠不平**。`vdir` 必須帶徑向分量，純 `[0,1,0]` 的布幅整片垂在鐘形內側、hero 圖上完全看不到（本卷第一輪實測） |
| `parts`：9 條霧鬚 → **4 條粗滴水布角**（半徑 0.012–0.018）；兩手指爪 `len ×0.82`／`r ×1.45` | 底下的細件全部加粗縮短 | 同甲案：細棍＝「昆蟲細足／蜘蛛腳」。乙案第一輪把指爪拉長收細（`×1.25`／`×0.85`），hero 圖底下立刻變成蜘蛛腳，第二輪反向改回 |

兩案都守 `ART_BIBLE.md:11`（不可愛：沒有圓臉圓眼、沒有短胖圓潤、沒有 Q 版比例——兩案的側視 `W_over_H` 都低於現版）
與 `:40-47` 的陰氣段（苔綠／濕黑＋一點刺眼紅；吸飽水的布、霉斑、濕髮、泥、榕樹氣根；剪影不對稱、比例錯誤；空洞眼、裂嘴、細長指、骨感、殘缺）。

---

## ③ 機械檢查數字表

| 指標 | 現版 `redhat`（對照） | 甲 `redhat_a` | 乙 `redhat_b` | 門檻 |
|---|---|---|---|---|
| `cli.js` exit | 0（`checks: all green`） | **0（all green）** | **0（all green）** | 0 |
| 三角形數（judge `stats.triangles`） | 3415 | **3071** | **2797** | ≤ **4439**（＝3415×1.3） |
| GLB 位元組 | 590,380 | 546,572 | 507,916 | — |
| 材質數／skinnedMeshes | 18／18 | 18／18 | 17／17 | 兩案都沒有新開材質 |
| `ghost_skirt`／`ghost_wisp` 在 GLB 材質清單 | 有／有 | **有／有** | **有／有** | 必須保留 |
| 動畫 clip | idle/move/attack | **idle/move/attack** | **idle/move/attack** | 三支同名 |
| judge 對各自 claims | 12/12 all pass | **12/12 all pass** | **12/12 all pass** | 只要求列出條數 |
| 正規化後 `min.y` | 0.0000 | **0.0490** | **0.0580** | ≥ 0（haunt 飄浮，判法同 `duel-perf bounds`） |
| 正規化後高度 h | 1.2000 | **1.0808** | **0.9720** | ≤ 1.2 |
| 正規化後 w／d | 0.440／0.639 | 0.402／0.444 | 0.446／0.517 | — |
| 原始 bbox X／Y／Z | 0.472／1.288／0.686 | 0.402／1.081／0.444 | 0.446／0.972／0.517 | — |
| `share_hierarchy`（霧裾群:帽:臉，側視） | 67.5:26.2:6.4（偏差 0.075） | **63.7:31.3:5.0（偏差 0.050）** | **72.8:25.2:2.0（偏差 0.128）** | 60:30:10 ±0.15 |
| `focal_contrast`（hat÷skin_head，側視） | 4.12× | **6.31×** | **12.37×** | ≥2× |
| `part_signature` `hat` 側視 share／span | 11.57%／0.4015 | **15.75%／0.8613** | **13.83%／0.6571** | share ≥6% **或** span ≥0.12 |
| `saturation_area` 高飽和面積 `hi_sat.tq` | 21.12% | **14.77%** | **35.04%** | 10%–70% |
| 側視中位亮度 `lum.side` | 35.0 | 34.9 | 30.0 | claims 無此條（僅記錄） |
| `eye` 佔比（front／tq） | 1.11%／0.51% | 1.05%／**1.00%** | 1.22%／0.13% | claims 只要求 `part_exists` |
| 側視 `W_over_H`（silmetrics） | 0.55 | **0.40** | **0.52** | 無門檻；越低＝越不「矮胖」 |
| `fill`／`turn_count`／`mass_contrast` | 0.269／17／16.0 | 0.451／14／13.9 | 0.474／14／14.7 | 無門檻（記錄用） |
| `leg_fraction` | null | 0.421 | 0.450 | haunt 本來應為 null，見下方「已知落差」② |

`min.y`／`h` 是用 `creature-preview.html` 的 `window.__preview.bounds()` 量的——`tests/tools/duel-perf.mjs bounds` 只吃寫死的 30 隻正式清單，
`redhat_a`／`redhat_b` 不在裡面，所以照它 `duel-perf.mjs:62-84` 的同一條路徑另寫了一支探針（`scratchpad/a2r/bounds-probe.mjs`，未進 repo），
判準與 `duel-perf bounds` 的 `ok` 相同（`minY >= -1e-3 && h <= 1.2+1e-3`），三顆都 `ok`。
兩案 `min.y > 0`＝haunt 的飄浮設計；`js/creature-figures.js:664` 的正規化是**只縮不放**（`rawH > 1.2` 才縮），
現版原始高 1.288 會被壓到 1.2，兩案原始高 1.081／0.972 不到 1.2 所以維持原尺寸——**上桌時兩案都會比現版矮**（見「已知落差」①）。

---

## ④ 指令原文（可貼上重跑）

```bash
cd C:/Users/shung/wt/yaoshi/a1-duel-draws

# 1) 產 spec 與 claims（claims 與 spec 同一次寫出，在第一次編譯之前）
node docs/experiments/2026-09-17-a2-redhat/specgen/build_redhat_variants.mjs

# 2) 編譯
PYTHONUTF8=1 node tools/anyCreature/engine/cli.js assets/creatures/redhat_a.json assets/creatures/redhat_a.glb
PYTHONUTF8=1 node tools/anyCreature/engine/cli.js assets/creatures/redhat_b.json assets/creatures/redhat_b.glb

# 3) judge（一律不帶 --stage；--stage 只會跑該階段的那幾條）
PYTHONUTF8=1 node tools/anyCreature/harness/judge.mjs assets/creatures/redhat.glb \
  docs/experiments/2026-09-17-a2-redhat/judge-base redhat   --spec assets/creatures/redhat.claims.json
PYTHONUTF8=1 node tools/anyCreature/harness/judge.mjs assets/creatures/redhat_a.glb \
  docs/experiments/2026-09-17-a2-redhat/judge-a    redhat_a --spec assets/creatures/redhat_a.claims.json
PYTHONUTF8=1 node tools/anyCreature/harness/judge.mjs assets/creatures/redhat_b.glb \
  docs/experiments/2026-09-17-a2-redhat/judge-b    redhat_b --spec assets/creatures/redhat_b.claims.json

# 4) silmetrics（stdout 最後一行就是 JSON）
PYTHONUTF8=1 node tools/anyCreature/harness/silmetrics.mjs assets/creatures/redhat_a.glb scratchpad/a2r/sil_redhat_a

# 5) hero（寫出 <outDir>/hero.png，再複製成 hero-<名>.png）
PYTHONUTF8=1 node tools/anyCreature/harness/hero.mjs assets/creatures/redhat.glb   scratchpad/a2r/hero_base
PYTHONUTF8=1 node tools/anyCreature/harness/hero.mjs assets/creatures/redhat_a.glb scratchpad/a2r/hero_a
PYTHONUTF8=1 node tools/anyCreature/harness/hero.mjs assets/creatures/redhat_b.glb scratchpad/a2r/hero_b

# 6) stage-lit 與 n=3（rim=yinqi；鍵名在 tests/tools/creature-preview.html:17）
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 node tests/tools/creature-shoot.mjs \
  docs/experiments/2026-09-17-a2-redhat/stage-base.png "glb=redhat.glb&light=1&fx=1&rim=yinqi"        idle 9141
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 node tests/tools/creature-shoot.mjs \
  docs/experiments/2026-09-17-a2-redhat/stage-a.png    "glb=redhat_a.glb&light=1&fx=1&rim=yinqi"      idle 9147
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 node tests/tools/creature-shoot.mjs \
  docs/experiments/2026-09-17-a2-redhat/stage-b.png    "glb=redhat_b.glb&light=1&fx=1&rim=yinqi"      idle 9151
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 node tests/tools/creature-shoot.mjs \
  docs/experiments/2026-09-17-a2-redhat/n3-base.png    "glb=redhat.glb&light=1&fx=1&rim=yinqi&n=3"    idle 9144
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 node tests/tools/creature-shoot.mjs \
  docs/experiments/2026-09-17-a2-redhat/n3-a.png       "glb=redhat_a.glb&light=1&fx=1&rim=yinqi&n=3"  idle 9148
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 node tests/tools/creature-shoot.mjs \
  docs/experiments/2026-09-17-a2-redhat/n3-b.png       "glb=redhat_b.glb&light=1&fx=1&rim=yinqi&n=3"  idle 9152

# 7) 正規化包圍盒（另寫的探針，走 creature-preview 的同一條路徑，port 9150）
PYTHONUTF8=1 node scratchpad/a2r/bounds-probe.mjs redhat redhat_a redhat_b

# 8) 核對原檔未動
git diff --stat -- assets/creatures/redhat.json assets/creatures/redhat.glb assets/creatures/redhat.claims.json
git status --short -- js/ index.html
```

## ⑤ 圖檔清單

| 檔 | 內容 |
|---|---|
| `hero-base.png`／`hero-a.png`／`hero-b.png` | `harness/hero.mjs` 1024² 透明背景 45° |
| `stage-base.png`／`stage-a.png`／`stage-b.png` | 戲台打光＋三系環境特效，`rim=yinqi`，`idle` |
| `n3-base.png`／`n3-a.png`／`n3-b.png` | 同上，橫排三隻（小圖辨識用） |
| `judge-base.txt`／`judge-a.txt`／`judge-b.txt` | 三份 judge 的完整 stdout（含各部位 share／lum／hi_sat 原始值） |
| `judge-base/`／`judge-a/`／`judge-b/` | judge 的 `*_metrics.json` 與四視角遮罩圖 |
| `specgen/build_redhat_variants.mjs` | 兩案 spec＋claims 產生器 |
| `duel-base.png`／`table-base.png`／`metrics-base.json` | 本目錄先前既有的現版對照（本輪未重拍） |

---

## ⑥ 已知落差（不修，列出）

1. **兩案上桌都會比現版矮。** `js/creature-figures.js:664` 的正規化只縮不放，現版原始高 1.288 被壓到 1.2，
   甲 1.081／乙 0.972 則維持原尺寸。對「約 100 公分的矮小魔神仔」（`ref-redhat.md:17`）在概念上是對的方向，
   但它是**本輪把身體拉長、把尖帽換掉之後的副作用，不是刻意調的**；要跟現版一樣高只能整份 spec 等比放大，本輪沒做。
2. **silmetrics 的 `leg_fraction` 由 null 變成 0.42／0.45。** 現版是 null（無腿＝haunt 的定義，`review-redhat-report.md:170` 記過），
   兩案變成有值——來源是**垂得很長的手臂與氣根／布幅在剪影下段形成兩條垂直柱**。這不是新增腿鏈（兩案都沒有腿鏈），
   但它代表剪影下半段的「虛化」比現版弱，之後若走盲讀要留意會不會被讀成「有腳」。
3. **甲案的 `hi_sat.tq` 由 21.1% 降到 14.8%**，離下限 10% 只剩 4.8 個百分點——紅色再往下降階就會破 `saturation_area`。
4. **乙案的 `share_hierarchy` 偏差 0.128，離上限 0.15 只剩 0.022**：拖地布幅是 `ghost_skirt` 材質、算在 primary，
   布幅再加長或再加一片就會破這一條（本輪為此把背後那一幅由垂 0.190 縮到 0.132）。
5. **`part_overlap` 的 warn 沒有清乾淨**：甲案 `fin@Chest` 90% 埋在 `fin@Spine` 裡、`curve@Mist1` 48% 埋在 `fin@Mist1` 裡；
   乙案 `paw@LHand` 54% 埋在 `fin@Mist1` 裡。三個都是「濕毛片互相疊」「氣根穿過根簾」「手垂到布幅前面」，
   在造型上是合理的互穿，`warn:` 依引擎文件是「a measure, you judge」，本輪判為可接受、沒有為了消 warn 拆造型。
6. **「蹼」仍然沒做出來。** `ref-redhat.md:19` 的第三條特徵（指間有蹼）現版就 0/6 讀到（舊報告 ⑥-3），
   甲案把爪從 5 根減到 3 根之後更不可能讀出來；這一條兩案都放棄，改用「猴吻＋尖耳＋紅眼＋紅帽」四條撐 `≥3 條命中`。
7. **沒有做盲讀、沒有評優劣、沒有量效能。** 依派工，這一輪只交兩個可挑的方案與機械數字。

## S4 結果：甲案兩輪盲讀（主對話，2026-09-17）

使用者挑甲（原話「甲a」）→ 甲案入正式 `redhat.*`；同方案兩輪（凍結 #3 上限三輪，第 2 輪過就停），每輪四位 context-free 讀者（特寫 hero／stage／n3 兩位、桌面裁切兩位，sonnet／opus 各一，中性檔名放專案外）。答卷 `blindread-r{1,2}/reader-*.json`，評分 `score-r{1,2}.json`，對照 [sheet-rounds.png](sheet-rounds.png)。

| 輪 | 改動 | 概念（妖怪／鬼／紙紮） | 猴臉 | 特徵 ≥3/5 | 可愛 0/N | 桌面：系別／剪影／可愛 |
|---|---|---|---|---|---|---|
| r1 | 甲案原版 | 特寫 1/2（狐狼武士、獸首鬼）；桌面 2/2 | 0/2 | 3/5、3/5 | 特寫 0/2；桌面 1/2（D 扭蛋公仔） | 2/2 ③／2/2／1/2 |
| r2 | 猴臉（吻短扁、眼窩、猴唇、側耳）、斗笠壓平加寬去角去旗、鱗甲→濕毛簇、去骨桿 | 特寫 2/2（貓妖、獸頭妖怪）；桌面 2/2（紙紮人偶、陰兵傀儡） | 0/2 | 3/5、3/5 | **0/4** | **2/2 ③／2/2／2/2 不會** |

**第 2 輪依凍結 #3／#4 過**：概念類別 2/2（「妖怪」與 2026-09-04 R-A2 同判法）、特徵 ≥3/5、可愛 0/N、桌面系別 2/2、桌面剪影 2/2。**已知缺口（不影響判過，如實記）**：ref 特徵 2 的「猿猴形臉」兩輪 0/4（狐狼→貓／鼠／獸）；E 把手上的氣根讀成佩刀；特寫色系 E 讀①（乾褐綠）。不加第 3 輪：前兩件的教訓是有過就停，再改容易翻別的題。

### 硬指標（第 2 輪＝出貨版）

| 指標 | 值 | 門檻／來源 |
|---|---:|---|
| tris | 2989 | ≤ 4439（現版 3415 ×1.3）；r1 3071 |
| judge | 12/12 | `redhat.claims.json`（一個位元組未動） |
| bounds | h 1.041、minY 0.049（haunt 飄浮）、ok | `duel-perf bounds`（[bounds-a2.json](bounds-a2.json)） |
| 取景矩陣 `--all --match=redhat` | 48/48 | [framing-redhat-a2.json](framing-redhat-a2.json) |
| `node --test` | 96/96 | [tests-all-a2.txt](tests-all-a2.txt) |
| trace-eq seeds 1–20 | equal | [trace-eq-0.57.20.txt](trace-eq-0.57.20.txt) |
| 桌面 hover render calls／tris | 95／（見 metrics-a2.json） | 現版 95／18544 |
| 8v8 兩 rAF draw | 見 metrics-a2.json | ≤ 640；現版 638 |
| perf32 五輪 | .554（paired 5/5、0.515–0.593）GREEN | 門檻 .40 逐輪 |
| console／page error | 0 | 所有治具 |

