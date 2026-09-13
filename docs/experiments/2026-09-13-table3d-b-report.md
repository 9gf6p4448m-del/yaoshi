# 報告：拍賣桌 3D 實體化第一段 v0.56b（2026-09-13）

> 凍結檔：`docs/experiments/2026-09-13-acceptance-table3d-b.md`（訂於 `f9dd83d`，repo 一個位元組未動時）。
> 基準：`main` `f9dd83d`（v0.55.7）。worktree：`.claude/worktrees/agent-ae13476c26fd88016`。
> 機器：AMD Radeon 780M（ANGLE D3D11），844×390 dpr=2。**不合併 main、不 push。**

## 0. 一句話結論

**T0 綠／T1 綠／T2 綠／T3 三紅一黃（draw calls 綠、passes 綠、lite 綠；三角形 34990 > 33000 紅、
renders/s 比值貼在 0.40 上不可信）／T4 紅（記憶體確實累積，但對照組證明成長**不是**托盤造成的）／
T5 交圖四張＋自評三輪／T6 綠。**
**閘門數字一個都沒動**（`§2.1`）；紅的兩條原因與可選的處置寫在 §5，需要製作人裁。

---

## 1. 改了哪些檔（檔案:行號）

| 檔 | 做了什麼 |
|---|---|
| `js/table-tray.js`（**新**，437 行） | `createTableTray(scene,camera,opts)` → `tray.{group,setItems,hitTest,setHover,update,slotScreen,items,loaded,readyCount,setVisible,dispose}`；`TRAY` 常數表（`:29`）；紅布托盤 `makeCloth()`（`:110`）；詛咒占位符紙堆＋紫黑陰火 `makeCursePile()`（`:180`） |
| `js/scene-env.js:96-151` | `seedRnd()`／`vcBuilder()`（頂點色幾何建構器，**單一來源**，table-tray 直接 import） |
| `js/scene-env.js:153-215` | `WOOD` 表＋`makeWoodTable()`：16 扇區 × 10 同心環的年輪頂點色、刻痕、桌緣線腳；**外形尺寸（r=3.4、h=0.3、桌頂 y=0.15）一格不動** |
| `js/scene-env.js:217-267` | `DECOR` 表＋`makeTableDecor()`：桌角香灰三撮＋符咒殘卷三片，**合併成一個 mesh** |
| `js/scene-env.js:322-327` | `createSceneEnv` 改用 `makeWoodTable()`、加 `decor`；回傳值多一個 `decor` |
| `js/renderer.js:24` | `import { createTableTray, TRAY }` |
| `js/renderer.js:45-56` | `TRAY_URL`：`?tray3d=0` kill switch、`?table3d=lite` 降級鈕 |
| `js/renderer.js:171-185` | 建立 tray、聽 `ys:market`／`ys:duel`／`ys:duel-end` |
| `js/renderer.js:206` | `__yaoshi3d.tray`／`.TRAY`／`.trayFlags` 出口 |
| `js/renderer.js:236` | 每幀 `tray.update(dt)` |
| `js/camera-director.js:22-28` | `TRAY_PUSH` 常數（hover 微推） |
| `js/camera-director.js:180-181, 519-523, 531, 559-562, 613-615` | `trayK`／`trayWant` 一層偏移＋`setTrayPush()` API；**`trayK=0` 時算出來的位置逐值不變** |
| `index.html:2426-2462` | `TRAY_PHASE`、`market3dItems()`、`pushMarket3d()`、`trayHitAt()`、`trayTap()`、`trayHover()` |
| `index.html:2396-2400` | `setHollow(false)` 一併把 `TRAY_PHASE` 歸零、收 hover（生命週期單一管理點） |
| `index.html:4805` / `index.html:4900` | 盯上頁／出價頁設 `TRAY_PHASE` 並派 `ys:market` |
| `tests/tools/scene-shot.mjs:39-46, 94-215` | `--perf`：uncapped、三變體同一支瀏覽器交錯各 `--runs` 次取中位 |
| `tests/tools/legend-drive.mjs:109-217` | `--trayslots`（T2 新增段）、`--traymem`（T4） |
| `tests/tools/layout-shot.mjs:64-77, 145-158` | `--tray`：`-trayhover.png`／`-traycurse.png` 兩張人眼證據 |

`js/trait-fx*`／`js/duel-figures.js`／`js/creature-figures.js`／`index.html` 的引擎碼與 `VERSION`：**零 diff**。

## 2. `TRAY` 常數最終值（`js/table-tray.js:29`）

```js
export const TRAY = {
  Y: 0.152, Z: 0.10,
  XS: [-1.35, -0.45, 0.45, 1.35],
  SCALE: 0.70,
  OUTLINE: true,                 // ?table3d=lite 時 false
  HOVER_SPIN: 0.6,               // rad/s
  HOVER_LIFT: 0.06,
  CLOTH: { w: 3.6, d: 0.92, color: 0x6e1616, gold: 0x6f5220, emissive: 0x210606 },
  // 以下為實作時新增（不在計畫 §2.4 列名內）
  HIT: { w: 0.62, h: 0.86, d: 0.52, pad: 0.07 },
  YAW: [0.20, 0.07, -0.07, -0.20],
  RIM_BASE: 1.3, RIM_HOVER: 2.4, HOVER_MS: 0.16,
  CURSE: { paper:[0xa89058,0x7d6a3c,0x5d4d2c], ink:0x1c1712, cord:0x8a2a18, fire:0x5b3a86,
           w:0.13, h:0.18, thick:0.006, gap:0.013, n:18, size:0.03, rise:0.30, speed:0.20 },
};
```
計畫 §2.4 相對的改動（都是【試玩必調】的調值，不是改名）：`CLOTH.d` 1.2 → 0.92、`CLOTH.color`
`0x6a1414` → `0x6e1616` 並補 `gold`／`emissive`。理由見 §4 自評。
`js/scene-env.js` 側：`WOOD`（`:153`）、`DECOR`（`:220`）兩張表同樣全部【試玩必調】。

## 3. 閘門逐條（指令原文＋實際輸出）

### T0 引擎零變動 → ✅

```
$ git show f9dd83d:index.html > _scratch-base.html
$ node tests/tools/trace-eq.mjs _scratch-base.html index.html
{"old":"_scratch-base.html","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}
$ node tests/tools/trace-eq.mjs index.html --mutate
{"mode":"mutate","src":"index.html","mutation":"CFG.ROUNDS 12 -> 11","bytesSrc":357285,"bytesMutant":341041,
 "differs":true,"verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}
```
兩邊都跑（相等性斷言本身沒有證明力）：seeds 1..20 逐位元組相等，且同一支腳本對突變體確實紅。

### T1 版面不退 → ✅

```
$ node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --tag=v056b --port=9662 --json=/tmp/felt-new.json
- **#felt**：12 格　最大溢出 0　非 0 的格數 0
- **#west**：12 格　最大溢出 0　非 0 的格數 0
- **#east**：12 格　最大溢出 0　非 0 的格數 0
- **#north**：12 格　最大溢出 0　非 0 的格數 0
```
四個容器 12/12 格全 0，＝0.56a 基準同值。

### T2 tap 命中回歸 → ✅

**基準（`f9dd83d`，動手前先量，落檔 `/tmp/tapbase-f9dd83d.json`）**
```
$ node tests/tools/legend-drive.mjs /tmp/ld-base.json --taps --tapsonly --tapout=/tmp/tapbase-f9dd83d.json --port=9611
- **T5 觸控命中**…掃了 12 頁、可測元素 177 個…命中 177／177…**trayTap 被呼叫 0 次** → ✅
- console error 0、pageerror 0、requestfailed 0 → ✅
```

**新增段（本卷）**
```
$ node tests/tools/legend-drive.mjs /tmp/ld-tray.json --trayslots --tapsonly --port=9651
- **T2 托盤槽位 tap**（seed 1，座標由產品的 tray.slotScreen(i) 給；托盤上線 4/4 格）：
  出價頁 4/4 開出正確的 #sheet 標題　盯上頁 4/4 的 pickMark 引數正確　空白處 3/3 回 −1 且不觸發　error 0 → ✅
    出價 槽0 (245.5,150.9) 要「過陰咒」→ #sheet 開「過陰咒陰氣」✅
    出價 槽1 (363.2,150.9) 要「陰陽眼銅錢」→ #sheet 開「陰陽眼銅錢陰氣」✅
    出價 槽2 (480.8,150.9) 要「虎姑婆指甲」→ #sheet 開「虎姑婆指甲陰氣」✅
    出價 槽3 (598.5,150.9) 要「水鬼浮標」→ #sheet 開「水鬼浮標陰氣」✅
    盯上 槽0..3 → pickMark(0)/(1)/(2)/(3) ✅（四槽引數全對，不是只驗「有沒有被呼叫」）
    空白 (186,310)/(658,310)/(422,310) → hitTest −1、觸發 0 次 ✅
- 判定：✅ 通過
```
座標一律由產品自己的 `tray.slotScreen(i)` 給，治具不另抄投影算式 ⇒ 欄寬一改、機位一動這一段立刻紅。

### T3 效能 → **calls ✅／passes ✅／lite ✅；三角形 ❌；renders/s 比值 ⚠️（貼線不可信）**

```
$ node tests/tools/scene-shot.mjs /tmp/t3d-gate2 --perf --runs=5 --port=9671     # 第二批（獨佔機器）
$ node tests/tools/scene-shot.mjs /tmp/t3d-gate3 --perf --runs=5 --port=9691     # 第三批（獨佔機器）
```

| 變體 | draw calls／幀 | 三角形／幀 | passes／幀 | renders/s 中位（批 2／批 3） | 比值 |
|---|---|---|---|---|---|
| `?tray3d=0`（對照組） | **18** | 1975 | 1 | 1067.4／1038.0 | — |
| **預設**（描邊開） | **113** ✅≤135 | **34990** ❌>33000 | **1** ✅ | 431.8／415.1 | **0.405／0.3999** |
| `?table3d=lite` | **68** ✅明顯下降 | 19947 | 1 | 501.7／487.7 | 0.470／0.470 |

- **對決頁**：見下方 T3-duel。
- 三個變體的 `calls`／`triangles`／`passes` 在三批之間**逐值相同**（18/1975、113/34990、68/19947），
  ⇒ 這三欄是決定性的、可信。
- 模型真的在畫：`items()` 四格 `visible:true`、預設 `outlines` 8～17 顆／尊、lite 全 0
  （堵住「`group.visible` 預設 false 量到 delta=0」那條假綠）。

**★噪音歸因（`02 §6.2`：先定位才准處置）★**
第一批（`/tmp/perf5.json`）的預設變體 5 次是 `387.8／176.2／277.8／254.7／234.8`（全距 2.2 倍），
中位比值 0.269；第二、三批是 `430/441/445/421/432` 與 `446/415/417/415/415`（全距 ±4%）。
差別是**量測環境**：第一批跑的時候我同時在前景跑 `felt-probe`（另一支 Playwright ＋ 另一個 http.server），
兩個 WebGL 工作負載搶同一顆 iGPU；對照組（18 draw calls）不是 GPU-bound 所以不受影響，
只有分子被壓下去 ⇒ 比值整條塌掉。獨佔機器之後重現性良好。
**處置是「獨佔機器重量」，不是加 retry／拉長 timeout。**
即使如此，兩批乾淨的中位比值是 **0.405** 與 **0.3999**——**落在門檻 0.40 的兩側**，
所以這一條我不宣告通過，也不宣告失敗：**它在這台機器上貼著門檻、不構成可信的判定依據**。
（計畫 §7 Q4 的裁定本來就把桌機 uncapped 比值列為「記錄項、只擋災難」，真正的 fps 判定在 iPhone 實機。）

### T6 範圍 → ✅

```
$ git diff --stat f9dd83d.. -- . ':!docs'
 index.html                   |  55 +++++-
 js/camera-director.js        |  23 ++-
 js/renderer.js               |  30 ++-
 js/scene-env.js              | 172 ++++++++++++++++-
 js/table-tray.js             | 437 +++++++++++++++++++++++++++++++++++++++++++
 tests/tools/layout-shot.mjs  |  27 +++
 tests/tools/legend-drive.mjs | 106 ++++++++++-
 tests/tools/scene-shot.mjs   | 120 ++++++++++++
 8 files changed, 950 insertions(+), 20 deletions(-)
$ git diff f9dd83d.. -- index.html | grep -c 'const VERSION='
0
```
- 只動到凍結檔允許的檔；`js/trait-fx*`／`js/duel-figures.js`／`js/creature-figures.js` **不在 diff 裡**。
- `index.html` 的 9 行刪除全部是 0.55a 留下的「0.55b 才接 Raycaster」佔位註解與兩行 `if(hollow) fillRails(...)`
  （改成 `if(hollow){ fillRails(...); TRAY_PHASE=…; pushMarket3d(); }`）；**引擎碼零變動由 T0 逐位元組證明**。
- `VERSION` 未動（版本號與 VERSION_NOTE 留給合併上線那一手，照「改版必改首頁版本字串」的慣例一起改）。

**12 套規則測試**
```
$ for f in tests/*.test.mjs; do node "$f"; done
aistake OK  conscap OK  duel-desync OK  emblem-collision OK  fxtier OK  fxvocab OK
legend OK  lineup-order OK  nightrules OK  review OK  roles-balance OK  wish16 OK      → 12/12 ✅
```

## 4. 視覺自評（`threejs-visual-loop`：截圖→Read 打開看→比對→修→再截圖）

證據目錄 `docs/experiments/2026-09-13-table3d-b-evidence/`，每一輪都用 Read 實際打開圖看過，不是只看檔案存在。

| 輪 | 指令 | 看到的問題 | 這一輪改了什麼 |
|---|---|---|---|
| r1 | `layout-shot … r1 --tray --port=9631` | ① 紅布讀成「桌上一攤血」不是神案紅布 ② 木紋整片看不見 ③ 香灰讀成白色碎紙屑（太大太亮太散）④ 符咒讀成米色木板（太大、紅帶太粗）⑤ 詛咒占位讀成紙箱 ⑥ 陰火是方塊像素 ⑦ **水鬼浮標把牠的水灘帶上木桌了** | 布收窄＋加金織滾邊；年輪頻率 9.3→5.4、對比拉大、整體提亮 8%；香灰半徑 ×0.42／片長 ×0.45／往中心集中；符咒 ×0.55 並加大捲度、紅帶收窄；符紙變薄變小、墨帶改兩條；陰火縮小＋隨高度淡出（改 Additive）；托盤一律 `groundFx:'none'` |
| r2 | `… r2 --tray --port=9632` | 滾邊反客為主：整片托盤讀成一塊橘褐色板子（NZ=8 時最外圈佔 1/8 深度，而且金色比暗紅亮） | NZ 8→12（滾邊只佔 8%）、金色壓暗、布面亮度 ×0.60→×1.00、布加極低 emissive、拍品 `RIM_BASE` 1→1.3 |
| r3 | `… r3 --tray --port=9633` | 布與木紋都讀出來了；香灰縮過頭、幾乎看不見 | 香灰半徑 ×1.36、片數 18→22、片長 +30%、色階提亮 |
| r4 | `… r4 --tray --port=9644` | 交件版 | — |

**交件圖（T5）**
- `r4-n1.png`：第 1 夜出價頁——桌心紅布托盤上站著今夜四件拍品（過陰咒／陰陽眼銅錢／虎姑婆指甲／水鬼浮標），
  桌面看得出年輪與桌緣線腳，桌角三撮香灰與三片硃砂符咒殘卷。
- `r4-trayhover.png`：第 2 夜盯上頁，游標停在槽 1（白虎煞）——占位符紙堆浮起、微旋，紫黑陰火往上飄。
- `r4-traycurse.png`：第 4 夜出價頁，詛咒品（魔神仔的芭樂）在槽 1 的托盤上。
- 對決頁：見 §3 的 T3-duel 與 `duel.png`。
- 側欄卡完整性：`r4-railW.png`／`r4-railE.png`（四樣資訊都在，沒有 ellipsis 到看不出招式名）。
- 直式：`r4-portrait.png`（`#rotateHint` 照舊整片蓋住；`#tray{display:none}` 在直式仍然成立——
  掏空那組 CSS 全部關在 `@media (orientation:landscape)` 裡，`index.html:68`）。

**仍待製作人裁的品味題**（`03 R6`，我不自己拍板）：
① 金織滾邊的寬度與色溫（現在偏舊金／偏暗，也可以更亮更「新」）
② 拍品靜置時的邊光倍率 `RIM_BASE=1.3`（比對決亮，讓四尊不是黑剪影；再高會開始像描邊玩具）
③ 詛咒占位符紙堆的體積（現在明顯比四尊妖小一號，好處是「它不是活的」一眼看得出來）。

## 5. 還粗的地方（含兩條紅燈的處置選項，需要製作人裁）

### 5.1 ★T3 三角形超標 34990 > 33000（紅）★——我沒有動這個數字

- **這不是噪音**：三批量測逐值相同（34990），是決定性的。
- **原因**：凍結檔的 33000 抄自計畫 §6 Q4 在 **v0.53** 上對**另一組四件**的實測（31906）。
  本卷的閘門時點是 seed 1 第 1 夜，那一夜抽到的是 `過陰咒／陰陽眼銅錢／虎姑婆指甲／水鬼浮標`
  ——其中兩件是 `haunt`（各 4 隻飄影的模型），是 POOL 裡最重的一類。換句話說**這一格接近最壞情況**。
- **分帳**：`?tray3d=0` 是 1975 ⇒ 四尊拍品含描邊外殼吃掉 **33015**；其中描邊外殼佔
  34990 − 19947 ＝ **15043**（外殼是每顆本體 mesh 複製一份，等於把模型的三角形翻倍）。
  我自己新加的環境幾何（年輪桌面淨增約 +350、香灰＋符咒約 +200）只佔 1.6%，**砍光也救不回來**。
- **可選處置（三選一，要製作人點頭）**：
  甲 **把 `?table3d=lite` 翻成預設**（＝托盤不掛描邊）：三角形 19947、draw calls 68，兩條全綠。
    使用者 2026-09-10 對 Q3 丙的裁定已經預留了這條路（「實機不過就把 lite 翻成預設，那是收緊視覺、
    自行記錄即可」），但那句話的觸發條件是 **iPhone 實機截圖**，不是桌機三角形數——所以我不自己翻。
  乙 **維持現況、把 33000 依「最壞那一夜的實測」重訂**：這會**提高通過機率**，屬 `02 §2.1` 的移動及格線，
    必須先寫明「原標準錯在哪、為什麼現在才知道」＋使用者針對這一條的明確同意。我已寫在上面一段，
    但**同意只能由使用者給**。
  丙 **降低單尊成本**：把描邊只掛在 hover 中的那一格（其餘三格不掛）。這會動到 ART_BIBLE §6 修訂二
    「陣營辨識的責任交給描邊／邊光」那條前提，屬設計變更，不該由效能需求單方面推翻。
- **我的建議**：先照計畫走 §4⑦ 的 **iPhone 實機三張截圖**（`?fps=1&table3d=0` / `?fps=1` / `?fps=1&table3d=lite`），
  用實機結果一次決定甲還是維持。桌機這條三角形線在那之前就照實記成紅。

### 5.2 T3 的 renders/s 比值貼在門檻上（黃）

乾淨環境下兩批中位是 0.405 與 0.3999，**落在 0.40 的兩側**。我不宣告它通過。
計畫 §7 Q4 的裁定本來就把桌機 uncapped 比值列為「記錄項、只擋災難」；真正有鑑別力的 fps 判定
在 iPhone 實機 capped fps（基準 55–58，沒有貼在 60 上）。**這一段落在使用者側，本卷交不出來。**

### 5.3 T4：記憶體確實在漲，但**不是托盤造成的**（見 §3 T4 的 A/B）

- 逐夜成長的**上界**是 `glbCache`（`creature-figures.js:123`）**永不淘汰**這件事——計畫 §6 Q4 末段
  已經寫明「0.55b 只記錄 `info.memory`，不做 LRU」。也就是說，凍結檔 T4 我自己訂的
  「開局末 vs 第 1 夜末差 ≤ 拍品數」，**對任何符合本卷規格的實作都不可能成立**：
  12 夜會走過十幾顆不同的 GLB，每顆進快取就是幾十個 geometry／texture，不可能 ≤ 48。
  照 `02 §2.1` 的例外條款，這屬於「錯到無論實作對錯都不可能通過」的恆假條件；但我**沒有自行改門檻**，
  而是**補了一條真的有鑑別力的量測**（同一批拍品清空再擺回 5 次，記憶體必須零成長）並把兩個數字都照實印出來。
- 要真的壓下去得給 `glbCache` 加 LRU，那要動 `js/creature-figures.js`（本卷 T6 要它零 diff），
  **歸下一卷**；判準建議用「同時在場的 figure 數」而不是「快取顆數」。

### 5.4 其它已知、沒修的

1. **`?table3d=0`（0.56a 的版面 kill switch）下托盤不會出現**，因為那條路不派 `ys:market`；
   但 `js/table-tray.js` 仍會建 group 與紅布（1 draw call）。乾淨做法是讓 `index.html` 在
   `!TABLE3D` 時明確派一次空的 `ys:market`；現況不影響行為，只是多 1 個 draw call。
2. **直式**：`#tray` 仍是 `display:none`（掏空 CSS 全關在 landscape media query 裡），但 3D 場景裡的
   托盤與拍品**仍然在算與畫**——只是被 `#rotateHint` 整片蓋住看不到。本卷按裁定不動直式；
   要省那一份 GPU，下一卷可以在 `orientationchange` 時 `tray.setVisible(false)`。
3. **`ys:market` 在出價頁每次重畫都會派一次**（`showMarket` 有 7 個呼叫點）。`setItems` 比對 key
   相同就不重載，所以成本只有一次陣列比對；但事件本身一夜會發十幾次，之後要加 hover／音效時要記得冪等。
4. **托盤的模型不投影子**：`figure.shadow` 沒有掛進 group（省 4 個 draw call）。腳下靠紅布的暗處接地，
   在 r4 的圖上讀得過去；要更穩的接地感就得加回來，代價 +4 calls。
5. **`?table3d=lite` 的關法是把外殼 `visible=false`**，幾何與材質仍在（記憶體不變、draw call 變）。
   要連記憶體一起省得動 `creature-figures.js` 的 `OUTLINE_ON`（那是全域旗標，會連對決一起關掉）。
