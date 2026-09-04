# 《紙紮夜戰》3D 試作卷回報 — 虎爺印一隻走完 anyCreature 全流程並接進戲台（2026-09-04）

凍結檔：`docs/experiments/2026-09-04-acceptance-creature-pilot.md`（門檻未動，逐條對照見下）。
基準 SHA：`d5da9be`（worktree `agent-a6cf0c54a879f5e52`）。**未 commit、未 push。**

DEVLOG 一行（卡片 00 的結案格式）：
`gates: ID fail@r3(front/top) PUNCH pass@r3 | restarts: LOW 正視／頂視改姿勢（扭頭＋抬前掌）、MID 綬帶三讀皆未命名 | unresolved: 正視與頂視的盲讀讀不出生物；綬帶部位盲讀讀不出綬帶`

---

## ① CP-A0～A5 一覽

| 條目 | 判定 | 一句話 |
|---|---|---|
| CP-A0 GLB 規格 | **PASS** | 203.7KB ≤ 400KB；`idle`／`move`／`attack` 三支；`skins`=1；`COLOR_0` 有；judge.mjs `all claims pass` |
| CP-A1 三道盲讀 | **部分 PASS** | Gate 2 PUNCHIER 通過；Gate 1 RECOGNISED 側視／hero 過、正視／頂視三輪都判為抽象色塊；MID 臉部通過（子 agent 主動說「tiger」）、綬帶三次都沒被命名。最終 HIGH 盲讀含「老虎」與「凶／威」→ **CP-A1 指定的字面條件成立** |
| CP-A2 戲台載入 | **PASS** | console 0 error（無頭與有頭兩種 GL 各跑一次都是 0）；三張截圖已出；`allInvisible: true` |
| CP-A3 效能 | **PASS** | 真 GPU（AMD Radeon 780M / D3D11）`?n=8` rAF 中位數 **133.3 fps**、`renderer.info.render.calls` **133**、GLB 載入 **196–233 ms** |
| CP-A4 邊光 | **PASS** | 三系色並排一眼可分（金／橘紅／綠） |
| CP-A5 diff 範圍 | **PASS** | 只有 `assets/creatures/`、`js/creature-figures.js`、`tests/tools/creature-preview.html`、`docs/experiments/2026-09-04-creature-pilot-*`；**既有檔案一行都沒動** |

**不算通過的地方（誠實條）**：Gate 1 的正視與頂視在三輪之後仍被判為抽象色塊，依卡片 00 鐵律 3 的收尾條款「ship your best version 並寫一行誠實的 DEVLOG」處理，不是通過。綬帶的部位盲讀同樣未過。詳見 ⑥。

---

## ② 三道盲讀原話（context-free 子 agent，`model: sonnet`，只給圖檔路徑與卡片的問法）

### Gate 1 RECOGNISED — 第 1 輪（r1）

> 1) thumb24.png — Sharp/menacing, low and lean, mid-stride: a compact predatory silhouette that reads fast/agile rather than heavy.
>
> 2) thumb48_front.png — A dark blob shape with a rounded top and a split at the bottom (like two legs/haunches). No head, ears, eyes, limbs, or face are distinguishable. Reads as an abstract shape, not a recognizable creature.
>
> 3) thumb48_side.png — A four-legged animal silhouette in profile: visible head with what could be an open mouth/snout pointing down-left, back/spine curve, a tail sweeping up at the back, and four legs. This one does read as a real creature (tiger/predator-like stance).
>
> 4) thumb48_top.png — A narrow vertical elongated blob, wider at top, tapering with a small notch at the bottom. No distinguishable parts (no legs, head, or tail visible). Reads as an abstract shape.
>
> 5) thumb48_hero.png — A dark rounded mass with pointed protrusions at the upper right (could be ears or spikes) and thin trailing marks at the lower left (could be legs). Parts are only vaguely suggested. This reads mostly as an abstract shape — recognizable as "creature-like" only weakly, not clearly a tiger.

判定：FAIL（正視／頂視／hero 三張抽象）。修復輪 1：加大耳朵、加腮鬃、頭壓到肩線以下、四肢外張、尾巴改往側邊甩。

### Gate 1 RECOGNISED — 修復輪 1（r2）

> 1) A low, lunging silhouette with a raised haunch and forward-jutting head — reads as fast/agile, mid-motion.
>
> 2) A blocky black silhouette with two rounded ear-like bumps at top, a wide flat torso, and two leg-like stub shapes at the bottom split by a light gap. It does not read as a real creature front-on — it reads as an abstract blob shape, no face or limbs are distinguishable.
>
> 3) A silhouette with a pointed snout/head on the left, a hunched raised back, a long tail curving down-right, and legs beneath. This one does read as a real creature — recognizable as a four-legged animal (cat/tiger-like) in profile, mid-stride.
>
> 4) A silhouette with a small pointed head/ear shape at top and two small wing-or-ear flaps to either side, tapering into a long curved tail-like body below. This does not read as a recognizable creature from above — it reads as an abstract elongated blob/tail shape.
>
> 5) A silhouette with a pointed ear/ridge at top-left, a low-slung head with a small snout on the left, a long body, and legs at bottom right. This reads as a real creature — a four-legged animal in profile-ish/three-quarter pose, similar to the side view.

判定：hero 修好了，正視／頂視仍 FAIL。**同一症狀連兩輪失敗＝鐵律 3**，第 3 輪不再調零件，改**站姿**（見 ⑥「概念重啟」）。

### Gate 1 RECOGNISED — 修復輪 2／概念重啟（r3，本卷出貨版）

> 1) 低矮拉長、四肢粗短貼地的黑色剪影——感覺是重心低、穩重帶點蓄勢的爬行/潛伏感，不算靈巧敏捷,也稱不上鋒利凶悍,更不是飄浮感。
>
> 2) 一團不規則的黑色斑塊,兩側有尖角狀突起,中間下方兩個垂下的短柱狀物。看不出頭、身體、腿的清楚分界，讀起來像抽象斑塊，不像一隻可辨認的生物正面。
>
> 3) 側面剪影可以看出明確的輪廓：左側有頭部（帶尖耳）、中段隆起的身軀、下方四條腿、右側有一條上揚的尾巴（尖端有一撮毛狀突起）。這張讀起來確實像一隻四足動物（貓科/虎的側面姿態）。
>
> 4) 頂視角是一個上寬下窄、末端彎曲的長條黑塊，上方兩側有尖角狀突起（類似耳朵位置）。整體比較像抽象的水滴/勾狀剪影，看不出明確的四肢或身體分節，不太讀作具體生物。
>
> 5) 类似側視角但角度略斜（英雄視角）：可辨認出頭部（有一根像鬍鬚或耳朵的細長突起）、身軀、及下方幾條腿狀的突出物，尾部不明顯。整體介於「看得出是動物」與「抽象斑塊」之間，比正面(2)和頂視(4)清楚，但不如側視(3)乾淨俐落。

判定：修復額度用盡（2 輪）＋概念重啟也用掉，依鐵律 3 收尾條款出貨最佳版本並誠實記錄。

### Gate 2 PUNCHIER（r2 舊 vs r3 新，identity view = 側視 thumb24）

> B — the lower ear/head angle and forward-thrust legs give it a more aggressive, coiled-to-pounce stance than A's flatter, more static pose.

判定：**PASS**（reader 選了新的一輪）。LOW 的骨架與主體積鎖定。

### MID 白名單部位盲讀 — 臉（一定要驗）

> These are silhouette images of a tiger's head/face — the four QA thumbnails (front, side, top, hero angles) show a black silhouette of a tiger head with visible ear shapes.

判定：**PASS**（不但點名了部位，還主動說出 tiger）。

### MID 白名單部位盲讀 — 綬帶＋錢牌（order 點名的部位）

三次都沒過，原話依序：

第 1 次（檔名未遮蔽，讀者自己承認看了路徑，這次作廢重驗）：
> These are just black silhouette shapes at 48px thumbnail resolution — solid black blobs with no discernible internal detail (front is a teardrop/paw-like shape, side is an elongated oval, top is a narrow vertical oval, hero is a ring/donut shape). Given the file path context (`tiger/qa_collar`), this is a collar.

第 2 次（檔名遮成 v1–v4，加了綬帶飄帶與加長的錢牌）：
> These are four silhouette/shape studies, alternating between an elongated blob (v1, v3) and a ring/circle outline (v2, v4). What they depict is a tiger's **eye**.

第 3 次（依卡片 02「這個部位單獨看沒有意義時，連宿主 chain 一起留」，把軀幹留著）：
> These are tiger silhouettes shown from different angles — the shape is a tiger.

判定：**FAIL**（三次都沒說出綬帶／項圈／掛牌；第 3 次讀到的是宿主而不是部位）。修復額度用盡，依鐵律 3 出貨並記錄。

### CP-A1 指定的最終 HIGH 盲讀（新的 context-free 子 agent，只給 beauty render）

> 1) 一隻低多邊形風格的3D老虎幼崽模型，橘褐色皮毛帶深色條紋，頭頂有黃色菱形斑記，脖子繫著紅色布條，露出白色獠牙，姿態像是趴伏往前爬行。
>
> 2) 帶點笨拙可愛又有點凶的氣質——虎紋和獠牙給出野性感，但低多邊形的圓潤造型與紅布條裝飾又讓牠顯得像玩具或吉祥物，稚氣、逗趣多過威嚇。

對照 CP-A1 的條件：含「老虎」✅、含「凶」與「威」✅ → **字面條件成立**。
但要講清楚：讀者的整體印象是「像玩具或吉祥物，稚氣逗趣多過威嚇」，設計簡報要的「兇但神聖」**沒有達成**。這是本卷最該補的一件事（建議見 ⑤）。

---

## ③ 改了哪些檔（檔案:行號）

全部是新檔，既有檔案一行未動。

| 檔案 | 行數 | 內容 |
|---|---|---|
| `assets/creatures/tiger.json` | 1–275 | 虎爺印的 anyCreature 規格。骨架 `joints:26–79`、chain／attach／mirror `82–95`、體積 `97–160`、部位（耳 `164`、眼 `170`、鼻 `173`、上下獠牙 `177/181`、額頭金印 `185`、錢牌 `190`、綬帶飄帶 `195`、四道黑條紋 `200–219`、腳掌 `221–223`）、三支動畫 `226–274` |
| `assets/creatures/tiger.claims.json` | 1–63 | judge.mjs 的機械檢查清單（npc preset 改寫），量產 26 隻整份沿用 |
| `assets/creatures/tiger.glb` | — | 208,540 bytes，引擎輸出 |
| `js/creature-figures.js` | 1–297 | 人形工廠。邊光／dissolve 的 GLSL 注入 `60–121`、`makeCreatureFigure` `129–290`、`play()` `224–239`、`burn()` `246–258`、`update()` `260–283`、`FACTION_RIM` `293–297` |
| `tests/tools/creature-preview.html` | 1–202 | 預覽頁。量測掛勾 `136–155`、自動循環 `157–191` |
| `docs/experiments/2026-09-04-creature-pilot-{idle,attack,burn,n8,rim}.png` | — | CP-A2／A3／A4 的證據截圖 |
| `docs/experiments/2026-09-04-creature-pilot-shoot.json` | 1–21 | Playwright 量測的原始輸出 |

**踩到並繞過的引擎陷阱（量產 26 隻會再遇到，先記下來）**

1. `buildPaw`（`engine/core/compile.js:435`）的預設 offset 是 `[0, H*0.45 - host[1], L*0.18]`——第二項把腳掌的**絕對** y 吸到地面。抬起來的前掌一定要自己寫 `offset`，否則 `part_attachment` 直接 BLOCK（實測 0.163 clear）。
2. `fin` 只要帶 `anchor`，`offset` 就被丟掉（`compile.js` 的 `if (p.anchor) o = sp.p`）。要把板子往宿主裡埋，只能把 `points` 的內緣寫成負的 u。
3. `part_attachment` 量的是「板子頂點到最近那圈 ring 的圓心距離 − 該 ring 的最大半徑」。板子在切平面上愈長，端點離最近的 ring 圓心愈遠 → 明明貼著也會被判成浮空。解法是把長軸放在曲率小的方向，或把內緣埋進宿主。
4. `colors.arcs` 的 `from`/`to` 會**吸附到面的角度格**（body `sides:16`＝每面 22.5°）。`52→84` 與 `56→78` 產出的 GLB **位元組完全相同**——想微調高飽和面積，動 arc 角度沒有用，要換整段的顏色或換部位。
5. 鏈段長度比不能接近 1:1，`proportion` 會 BLOCK（實測 0.94/0.95 擋、0.889 放行）。排骨架時每一段都要刻意做長短差。
6. `anim_integrity` 對彎折很敏感：腿的 `ring_step` 要放大（本檔用 0.095），旋轉幅度要壓（move 的肘／膝從 30° 降到 19°）才過得了。
7. 平板部位的 `points` 必須是**嚴格凸多邊形**。第一版腮鬃寫成鋸齒（有反曲點），bind pose 直接 8 個翻面三角形。

---

## ④ 指令原文與實際輸出

### CP-A0 — GLB 規格

```
$ node engine/cli.js .../assets/creatures/tiger.json out/tiger/r6.glb
{"ok":true,"out":"out/tiger/r6.glb","bytes":208540,"verts":2133,"faces":1472,"joints":36,
 "anims":["idle","move","attack"],"checks":"all green","uv":"off","ao":{"meanOcc":0.468}}

$ python3 glbinfo.py assets/creatures/tiger.glb          # 出貨檔本身
{"file":"assets/creatures/tiger.glb","bytes":208540,"kb":203.7,
 "animations":["idle","move","attack"],"skins":1,"joints":36,"meshes":1,"primitives":15,
 "attributes":["COLOR_0","JOINTS_0","NORMAL","POSITION","WEIGHTS_0"],"hasCOLOR_0":true,
 "triangles":2628,"images":0,"textures":0,
 "asset":{"version":"2.0","generator":"anyCreature v1.2.0",
          "extras":{"harness":"anyCreature","harness_version":"1.2.0","spec":"tiger"}}}

$ node harness/judge.mjs .../assets/creatures/tiger.glb out/tiger/judge_ship tiger \
      --spec .../assets/creatures/tiger.claims.json
"stats":{"triangles":2628,"skinnedMeshes":15,"animations":["idle","move","attack"]}
"lum":{"front":63,"side":48.2,"tq":62,"reartq":45.2,"top":69.5}
"hi_sat_share":{"front":0.259,"side":0.2582,"tq":0.2926,"reartq":0.271,"top":0.5453}
[judge] Spec "虎爺印 tiger_ye_seal (NPC/elite)" — all claims pass.
```

逐條核對：203.7KB ≤ 400KB ✅ ／ 三支動畫名稱如上 ✅ ／ `skins`=1 ✅ ／ `COLOR_0` 存在 ✅ ／ judge 全綠 ✅。
（`saturation_area` 這條擋了三次才過：91.3% → 35.0% → 34.0% → **29.3%**。每一次都是改配色去遷就標準，沒有動過 10–34% 這個帶。）

### 出貨版的剪影量測（`harness/silmetrics.mjs`）

```
$ node harness/silmetrics.mjs out/tiger/r6.glb out/tiger/r6
{"W_over_H":1.83,"fill":0.485,"mass_thirds":[0.331,0.416,0.252],"torso_depth_max":0.9,
 "torso_depth_min":0.24,"mass_contrast":3.72,"leg_fraction":0.301,"turn_count":21,
 "zigzag_alignment":0.9,"front":{"W_over_H":1.08,"fill":0.537},
 "top":{"W_over_H":0.57,"fill":0.483},"hero":{"W_over_H":1.54,"fill":0.49}}
```

對照 `example/wolf.json` 的錨點（`W_over_H` 1.41／`fill` 0.39／`leg_fraction` 0.35）：
誇張向量走到 **W/H 1.83（＋30%）、fill 0.485（＋24%，更矮壯）、leg_fraction 0.301（−14%，腿更短）**——有離開錨點，不是收斂回去。

### CP-A2 — 戲台載入（Playwright 844×390）

```
$ python3 -m http.server 8796 --bind 127.0.0.1      # 服務 worktree 根目錄
$ node out/tiger/shoot.mjs http://127.0.0.1:8796 .../docs/experiments
{
 "load": { "loadMs": 196, "clips": ["idle","move","attack"], "bones": 36 },
 "burn": { "allInvisible": true },
 "consoleErrorsA2": [],
 "n8":  { "fpsMedian": 30, "drawCalls": 133, "loadMs": 233 },
 "consoleErrorsA3": []
}
```

- console 0 error ✅（`console` 的 error、`pageerror`、`requestfailed` 三種都收，兩個分頁都是空陣列）
- 三時點截圖 ✅ `2026-09-04-creature-pilot-{idle,attack,burn}.png`
- `burn()` 結束後 `group.visible === false` ✅（`allInvisible: true`）
- 上面那個 `"fpsMedian": 30` 是**無頭軟體 GL 且暖機不足**的數字，正式的效能數字看 CP-A3

**這裡踩到一個會讓證據作廢的坑**：`page.evaluate(() => window.__preview.setPhase('burn', …))` 會把回傳的 Promise 一併 await，於是「按快門」實際落在整段燒完之後，前兩版的 burn 截圖是**空桌子**（`calls 5`＝只剩桌面）。改成 `() => { …; }` 讓它回 undefined 之後才拍到掃到一半的那一格。截圖時另外把 dissolve 放慢到 3.2 秒、在 1.25 秒（約 39%）按快門。

### CP-A3 — 效能（量測位置寫明）

量測位置：**頁面自己的 rAF 迴圈**（`tests/tools/creature-preview.html:165-190`），每幀記一次 `now` 差值，取最近 240 筆的中位數；`drawCalls` 是把 `renderer.info.autoReset` 關掉、每幀開頭手動 `reset()` 之後讀到的**整幀**數字（含 bloom 的四趟）。同一頁在兩種 GL 後端各跑一次：

```
$ node out/tiger/perf.mjs http://127.0.0.1:8796
[
 { "label":"headless (default GL)", "n":8,
   "gl":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
   "fpsMedian":59.9, "drawCalls":133, "samples":171, "p90ms":33.4, "minMs":16.6, "errors":[] },
 { "label":"headless (default GL)", "n":1, …, "fpsMedian":59.9, "drawCalls":21, "errors":[] },
 { "label":"headed (host GPU)", "n":8,
   "gl":"ANGLE (AMD, AMD Radeon 780M Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)",
   "fpsMedian":133.3, "drawCalls":133, "samples":240, "p90ms":8.1, "minMs":7, "errors":[] },
 { "label":"headed (host GPU)", "n":1, …, "fpsMedian":128.2, "drawCalls":21, "errors":[] }
]
```

`?n=8` 在**真 GPU** 上中位數 **133.3 fps ≥ 50** ✅，draw call **133**（8 隻 × 15 個 primitive ＋ 桌子 ＋ bloom 四趟 ＋ 陰影）。
無頭那組跑的是 SwiftShader 純軟體光柵化，**不是桌機的量測位置**，59.9 fps 只當「軟體 GL 也還撐得住」的旁證，不拿來當 CP-A3 的判準。
GLB 載入時間：**196–233 ms**（同機 localhost、冷啟動、含解析與建骨架）。

### CP-A4 — 三系邊光

`2026-09-04-creature-pilot-rim.png`：同一隻虎爺分別套 `setCloth(0xd4a870/0xf08060/0x70b080)` 後並排。
金（祖靈）／橘紅（香火）／綠（陰氣）在燈籠夜色下肉眼可分，綠那張連腹側與後腿都染成綠邊，最明顯。

### CP-A5 — diff 範圍

```
$ git add -N . && git diff --stat
 assets/creatures/tiger.claims.json                 |  63 +++++
 assets/creatures/tiger.glb                         | Bin 0 -> 208540 bytes
 assets/creatures/tiger.json                        | 275 +++++++++++++++++++
 .../2026-09-04-creature-pilot-attack.png           | Bin 0 -> 62630 bytes
 .../experiments/2026-09-04-creature-pilot-burn.png | Bin 0 -> 86522 bytes
 .../experiments/2026-09-04-creature-pilot-idle.png | Bin 0 -> 46664 bytes
 docs/experiments/2026-09-04-creature-pilot-n8.png  | Bin 0 -> 68214 bytes
 docs/experiments/2026-09-04-creature-pilot-rim.png | Bin 0 -> 103047 bytes
 .../2026-09-04-creature-pilot-shoot.json           |  21 ++
 js/creature-figures.js                             | 297 +++++++++++++++++++++
 tests/tools/creature-preview.html                  | 202 ++++++++++++++
 11 files changed, 858 insertions(+)
```

全部落在凍結檔允許的四個路徑內，**沒有任何既有檔案被修改**（`index.html`、`js/*.js` 一行未動）；`git add -N` 之後已 `git reset` 還原索引。`tools/anyCreature/` 不在本 worktree 內，不會進 git。

---

## ⑤ 量產 26 隻的建議

### 每隻的預估 agent 時間

本隻（含摸索工具、踩七個引擎陷阱、寫工廠與預覽頁）耗掉一個完整 session。**扣掉一次性成本**之後，照這條已經打通的鏈跑第 2～26 隻：

| 階段 | 內容 | 預估 |
|---|---|---|
| 骨架與體積（LOW 第一版） | 從 `tiger.json` 複製、改比例與部位 | 8–12 分 |
| 引擎除錯 | BLOCK 迴圈（`proportion`／`anim_integrity`／`part_attachment`），本隻跑了 6 次才綠 | 10–15 分 |
| Gate 1／Gate 2 盲讀 | 3 個子 agent，每個約 10–25 秒，加上修復輪 | 15–25 分 |
| MID 部位盲讀 | 2 個子 agent | 5–8 分 |
| HIGH 配色 | 撞 `saturation_area` 上下限，機械調到綠 | 10–15 分 |
| 出貨檢查 | judge ＋ silmetrics ＋ 預覽頁截圖 | 5 分 |

**單隻約 55–80 分鐘**（sonnet 可勝任，深推理的只有「怎麼讓正視／頂視讀得出來」那一段）。
26 隻若一批 4 隻用 Workflow 平行（`isolation: 'worktree'`，每隻各寫各的 `assets/creatures/<name>.json`，主對話合併），牆鐘約 **7 批 × 約 1.2 小時 ≒ 8–9 小時**。

**能砍掉一半時間的三件事**：
1. 把上面 ③ 那七個引擎陷阱寫成一張**派工附件**，agent 不必再自己撞一遍（本隻有近一半時間花在這裡）。
2. **正視／頂視不再設為閘門**。理由見 ⑥：四足獸的正／頂視盲讀本來就會誤判（anyCreature README 的 honesty 段自己也承認），而戲台的鏡頭永遠是 3/4 側前方（`camera` 在 `tilt 17°`、`rotation.y = -0.55`），正視與頂視玩家一輩子看不到。改成只把**側視與 hero** 設為必過。
3. **共用模板**：`tiger.claims.json` 整份沿用，只改兩個欄位（見下）。

### JSON 規格哪些欄位是共用模板

**整段照抄、逐隻不動**（約佔全檔 35%）：

- `shading`：`{gradient:{top:0.30,bottom:-0.88}, noise:{size:0.018,amount:0.26}}` — 全 26 隻同一組，戲台的顆粒感才一致
- `smooth_angle: 50`
- 四足類的 `chains` / `attach` / `mirror` 骨架拓樸（`body` / `head` / `jaw` / `collar` / `tail` / `LFront` / `RFront` / `LBack`）
- `animations` 三支的**軌道結構與時間軸**（`idle` 2.4s、`move` 0.85s 帶 `mirror_phase 0.5`、`attack` 0.75s 且把位移放在 chain 的**根關節**`Rump` 上——放中段會 `anim_integrity` 撕皮）
- `ring_step` 的安全值：腿 0.095、身體 0.06、頭 0.085
- 低飽和的大塊底色族：`fur_body #6f5a4a` / `fur_leg #5f4c3e` / `fur_paw #463a30`（保證 `saturation_area` 有餘裕）
- 三系配件色：香火 `sash #c02c2c`、`coin/seal #e8c860`；祖靈與陰氣照 `assets/theme.css` 的 `--c-zuli/--c-yinqi` 換

**逐隻要改的欄位**（約 65%）：

- `joints` 的數值（比例＝這隻的個性；建議每隻先在 `_exaggeration_vs_anchor` 寫死「我要把哪 1–2 個數字推離錨點多遠」）
- `volumes[].profile`（體型）與 `colors.arcs`（花紋帶）
- `parts`：招牌部位那一兩件（本隻＝張開的大顎＋腮鬃）
- `palette` 裡的**主飽和色**一個（花在招牌部位上）
- `tiger.claims.json` 只換兩處：`part_exists` / `part_signature` 的 `part` 值，與 `share_hierarchy` 的三層 material 名

### 執行層的建議

- `js/creature-figures.js` 已經對 26 隻做好準備：`glbCache` 讓同一隻的多實例只抓一次 GLB，`customProgramCacheKey` 固定成同一支 program（不然 26 隻 × 15 顆材質＝上百次 shader 編譯，手機第一次進對決會卡住）。
- 接進正式對決只要一行：
  `createDuelFigures(scene, camera, { makeFigure: () => makeCreatureFigure({ glbUrl, rimColor }) })`——`js/duel-figures.js` 一行都不用動（批 1 的五件介面全部相容，`setPortrait` 保留成 no-op）。
- 但要記得：`duel-figures.js` 目前**不會**每幀呼叫 `update(dt)`，也不會呼叫 `play()`／`burn()`。正式接線那一卷要在 `createDuelFigures` 的迴圈裡加這三個呼叫（本卷不動既有檔，所以沒加）。

---

## ⑥ 做不到的事（誠實條）

1. **正視與頂視的盲讀，三輪都沒讀成生物。**
   前兩輪的修法都是「把頭上的零件做大」（耳朵、腮鬃），第三輪依鐵律 3 換了**概念**——改站姿：頭扭向側前方、右前肢脫離 `mirror` 改成抬起前伸的獨立 chain、尾巴改在水平面上甩開。正視因此從「圓頂色塊」變成「有耳丘、有伸出去的前肢、腿間有縫」，讀者也確實描述出這些零件，但仍然判為抽象。
   我的判斷是**這條閘門對四足獸本身就會誤判**：anyCreature 自己的 README「Honesty about limits」承認隔離盲讀會在特定形狀上失手，而卡片也說「兩者衝突時信整體讀」。整體（側視／hero）與最終 beauty 盲讀都讀成老虎。**但這是我的判斷，不是通過**——要不要把正／頂視移出閘門，是使用者的決定（建議見 ⑤-2）。

2. **綬帶＋錢牌的部位盲讀，三次都沒被命名**（ring → tiger's eye → tiger）。第三次依卡片允許把宿主留著，結果讀者讀的是宿主。修復額度用盡。實際模型上綬帶與金牌是看得見的（見 hero render 與 idle 截圖），但「單獨拿出來能不能被認出」這條沒過。

3. **「兇但神聖」的氣質沒做到。** 最終盲讀說「像玩具或吉祥物，稚氣、逗趣多過威嚇」。三個可查的原因：① 低多邊形＋圓潤的 `smooth_angle 50` 讓所有轉折都軟；② `saturation_area` 上限逼我把大塊色壓成低飽和棕，橘虎的氣勢跟著掉；③ 沒有任何「神性」的視覺語彙（只有一塊金印，沒有火焰、香煙、光暈、蓮座）。想補的話最有效的順序是：**先加神性配件（背後的火焰／香爐煙／頸後光環），再把顎與爪改成低 `smooth_angle` 的硬面**——這兩件都在 MID 的編輯詞彙內，不必動骨架。

4. **黑色粗條紋不是繞身的橫紋。** `colors.arcs` 只能沿**軸向**分帶（0°=脊、180°=腹），做不出虎的橫紋。改用四對薄板 `fin`（`stripe` 材質）貼在側腹當條紋——遠看有效（beauty render 與 idle 截圖都讀得到），近看是貼上去的板子，會跟著蒙皮走但不會隨體表起伏。要真橫紋只有兩條路：`keep_uv:true` 之後外部烘一張貼圖（違反本卷「不靠外部貼圖」），或改引擎（本卷禁止）。

5. **額頭的「王」字沒做，做的是金色神印。** 設計簡報寫的是「王字**或**金色神印」，取了後者：`fin` 平板做得出方形金印，但四根細筆畫在 48px 與對決鏡頭下都糊成一塊，不划算。

6. **`thumb48` 是我自己補的，不是 harness 產的。** `harness/silmetrics.mjs:115-146` 只輸出 `thumb24`（從側視 mask 裁 bbox、置中補方、最近鄰 ×10），卡片 01／02 卻要求給讀者看 `thumb48`。依「工具問題記錄後繞過、不改引擎原始碼」的規定，我在 scratchpad 寫了一支同構的 `mkthumb48.py`（同樣裁 bbox、置中補方、降到 48px 再 ×5 放大）。**這意味著三道盲讀看的圖不是 harness 的原生產物**，雖然作法與 thumb24 同構，仍應視為一個偏差。

7. **`prefers-reduced-motion` 只擋掉自動循環，沒有擋骨架動畫本身。** 判斷是：`idle` 是這個生物的「內容」不是裝飾，關掉它畫面上就是一尊僵住的雕像；反覆的 attack→burn→reset 才是裝飾，所以只關那個。這是我的取捨，沒有問過使用者。

8. **沒有在真手機上量過。** CP-A3 只要求桌機，這裡也只做到桌機（AMD Radeon 780M / D3D11 與 SwiftShader 兩種）。8 隻 133 個 draw call、2628 tri/隻、材質共用同一支 program，手機**應該**沒問題——但這是推論不是量測，正式接線前要在真機上補一次。

---

## ⑦ `git diff --stat`

見上面 ④ 的 CP-A5 段（`git add -N .` → `git diff --stat` → `git reset`）。摘要：11 個新檔、858 行新增、既有檔案 0 行改動、未 commit、未 push。
