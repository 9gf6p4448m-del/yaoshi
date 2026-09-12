# 傳說三尊「請神存在感」卷 — 實作與閘門報告（2026-09-13）

基準 `48d821f`（v0.55.3）。凍結檔＝`docs/experiments/2026-09-13-acceptance-legend-presence.md`（動手前落檔）。
證據目錄＝`docs/experiments/2026-09-13-legend-presence-evidence/`、盲讀材料＝`docs/experiments/2026-09-13-legend-blindread-material/`。
**未合併 main、未 push。**

---

## 0. 一句話

甲 1–4／乙 5–7 全數落地；G0／G1／G2／G3（材料）／G5 綠，**G4 分成兩種配置**（遊戲裡做得到的三尊配置綠、
治具灌到六尊的悲觀上界 draw call 超 6），**G6 多了 `js/renderer.js` 一行**（範圍變更，待簽字）。
另有一條**明文偏離派工書**（名牌字數 2–3 字而非兩字），也待簽字。

---

## 1. 做了什麼（逐條對派工書）

| 條目 | 落點 | 做法 |
|---|---|---|
| 甲1 傳說列站位 | `js/duel-figures.js:937-951`（`lgIdx`／`plainIdx`／`LGROW`）、`:956-969`（`useLg` 的 `sizes`／`order`） | `n≥3` 且排得出第 1 排時，**第 1 排整排只放傳說並置中**，其餘尊照原本「小前大後」填滿其他排；傳說列不套 `brickShift`（錯半格會把它推離鏡頭中軸）。排不出第二排（`n===3` 的一排制）時退回原排法，位置與改前逐項相同。 |
| 甲2 紙紮基座 | `js/duel-figures.js` `makeLegendKit()`／`boxSoup()`／`crackRays()`、主迴圈 `:1120-1131` | 殘日＝日輪台（圓盤＋**不等分不等長**的裂芒緣，ART_BIBLE §9「等分放射就是輪子」）／大士爺＝神轎座（方台＋四柱＋短欄）／有應公＝骨堆（9 個不規則盒）。頂面切齊腳底、往下佔 `FIG.legendLift`，`MeshStandardMaterial`＋`flatShading`（平塗硬邊）。 |
| 甲3 尺寸 | `js/duel-figures.js:68`（`bodyScale.legend`）、`:76`（`legendPxMax`）、`js/creature-figures.js:580`（`normUp`）、`js/renderer.js:117` | `FIG.bodyScale` 加 `legend: 1.35`（判定鍵 `u.lg ? 'legend' : u.body`，`footBase` 與主迴圈共用 `bodyScaleOf()`）；`NORM` 對傳說開放**向上**正規化到 `NORM.maxH`（dashiye 0.944→1.2、youyinggong 0.802→1.2）。★另加 `legendPxMax: 172` 這道保險絲★——見 §3。 |
| 甲4 一律實體 | `js/duel-figures.js:1079`（`const haunt = u.body === 'haunt' && !u.lg`） | 對傳說關掉 `haunt` 旗標，半透明／離地飄／不落影三件一次都不套。實測 `shadowVisible` 由 `false` → `true`。 |
| 乙5 常駐光效 | `makeLegendKit()` 的 `aura` 段 | 殘日＝腳下餘暉盤（徑向漸層、緩慢呼吸 0.44–0.72）／大士爺＝身後一炷香（香枝併進基座幾何、頂端火頭 Sprite 呼吸）／有應公＝繞身鬼火 `InstancedMesh`×4。材質全部 `MeshBasicMaterial`＋`NormalBlending`＋`toneMapped:false`（＝`trait-fx.js:160 MAT_SOLID` 同一組語法），顏色壓在 bloom 門檻 `0.7`（`js/renderer.js:34`）以下。**每尊光效 ≤2 個 draw call。** |
| 乙6 尊名牌 | `plateTex()`／`plate` Sprite、主迴圈 `:1147-1160` | Sprite（恆面向鏡頭）＋Canvas 紙籤（暖紙底＋上下系色橫帶＋粗墨邊）。文字來自 `index.html` 的 `LEGENDS.sn`（唯一事實來源）。`depthTest:false`＋`renderOrder 999`（HUD）。另加**上緣安全區夾限**，見 §3。 |
| 乙7 請神進場機位 | `index.html` `pwLegendEnter()`、`js/camera-director.js` `onLegendEnter()` | 新事件 `ys:legend-enter`，**沿用既有 CINEMA 常數與同一條包絡**（`dist 2.9`／`tilt 8`／`PW_FX.TRAIT_MS_BY_TIER[3]`＝1400ms），所以 `ys:fx-trait-cancel`／`ys:duel-end`／`ys:table`／`ys:end` 的 `endCinema()` 也一併收得掉它。同一尊只在戰場上**第一次現身**那一場切一次（`PW_LEGEND_SEEN`）。`ms` 缺了就 throw（與 `onTrait` 同一條紀律，不給 `||1400` 的第二個時長來源）。 |

**賽局零位移的作法**：`lg`／`sn` 是**純演出欄位**（同 `tier`）——不進 `buildArmy` 的 teams，只在
`pwArmyView` 用與 `nameOf` 同一條對位（`src[t.idx]` 核 `ab`）從袋子那件法寶的 `legend`／`sn` 讀出來。

---

## 2. 閘門

### G0 等價 ✅
```
node tests/tools/trace-eq.mjs old48.html index.html
{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}
node tests/tools/trace-eq.mjs old48.html index.html --beats
{"mode":"beats","bytesOld":540776,"bytesNew":540776,"equal":true,"injected":true,"verdict":"拍序列逐位元組相等 ✅"}
node tests/tools/trace-eq.mjs index.html --mutate
{"mutation":"CFG.ROUNDS 12 -> 11","differs":true,"verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}
```
`old48.html` ＝ `git show 48d821f:index.html`（量完即刪，不進版控）。

### G1 遮擋 ✅（但有一條鑑別力的實話，見下）

治具＝`tests/tools/legend-presence.mjs`（新）。滿編 8v8、`seed=7`、844×390@2x（＝1688×780 實際像素）。
改前 3 幀、改後 5 幀。**門檻：每尊每幀 `occl ≤ 0.10` 且 `occlHead == 0`。**

| 尊 | 改前 occl（逐幀） | 改後 occl（逐幀） | 改前/改後 頭部 | 剪影像素（改前→改後） | 螢幕高度 px |
|---|---|---|---|---|---|
| canri 殘日 | **0.657 / 0.650 / 0.670** | 0.0065 / 0.0066 / 0.0056 / 0.0039 / 0.0036 | 0 / 0 | 8 330 → **15 840**（+90%） | 241 → 289 |
| dashiye 大士爺 | 0 / 0 / 0 | 0.0574 / 0.0642 / 0.0553 / 0.0435 / 0.0483 | 0 / 0 | 9 047 → **22 865**（+153%） | 192 → 290 |
| youyinggong 有應公 | 0 / 0 / 0 | 0.0149 / 0.0073 / 0.0067 / 0.0159 / 0.0129 | 0 / 0 | 7 117 → **28 144**（+295%） | 154 → 285 |

★**這一格對兩尊沒有鑑別力，照實說**★：`dashiye`／`youyinggong` 在**改前就是 0%**——
它們的 `bodyScale`（0.86／0.82）小，被「小前大後」排到最前排，本來就沒人擋得到。
製作人抱怨的「被前排擋住」在量測上只對 `canri`（elite 1.15 被推到後排）成立；
對那兩尊，真正的問題是**小**，那由「剪影像素 +153%／+295%」與「螢幕高度 192→290／154→285」記錄，
**那兩個數字不是本卷的門檻**（門檻凍結在 ≤10%／頭部 0%，一格未動）。

**突變驗紅**（改壞前先備份副本，還原＝覆蓋回來，不做反向 sed）：

| 突變 | canri | dashiye | youyinggong | 判定 |
|---|---|---|---|---|
| ① `FIG.legendLift = 0` | **0.323** | **0.342** | **0.106** | 三尊全紅 ✅ 這個訊號抓得到基座沒了 |
| ② `bodyScale.legend = 1.15` | 0.044 | **0.118** | 0.032 | 只有 dashiye 紅 ⇒ **對倍率的鑑別力只落在 dashiye 上**（另兩尊靠基座高度就過得了），照實列 |

**反面**（健康態會不會綠）：`after/` 那一跑五幀全綠，就是這一條。

**活性**：`fullPx` 全部遠大於門檻 3 000（改後 15 840～28 144），`na` 幀 0。

### G2 出框 ✅
390px 高視口下三尊剪影最高點：改前 165／335／324，改後 **80／80／80**（門檻 ≥1，且最低點 ≤779：368／369／364）。
改後三尊 `topY` 一模一樣，是因為 `legendPxMax` 這道保險絲對三尊都咬到 ⇒ 三尊的畫面高度被釘成同一個值（見 §3）。

### G3 讀者 — **只產材料，判定由主對話派**
- 材料：`docs/experiments/2026-09-13-legend-blindread-material/sheet.png`（**6 幀 2×3、每格 780×360、總圖 1560×1080**，與 `blindread-sheet.mjs` 同規格）
- 題目：`.../READER-PROMPT.txt`
- 對應表（**讀者不得看**）：`.../mapping-HIDDEN.json`
- 治具：`tests/tools/legend-blindread.mjs`（新）。場面＝A 側 殘日＋大士爺、B 側 有應公×2（三尊分落兩側＝遊戲裡真的做得到的最滿配置）。
  DOM 那一層整個關掉（拍首字幕／隻數牌／結果橫幅會在六格之間變來變去，**而且出手卡會直接印法寶名＝洩答案**），讀者判的純粹是 3D。

### G4 效能 — **分兩種配置**

| 配置 | rendersPerSec（三跑中位） | 比值 | drawCallsPerFrame | visible |
|---|---|---|---|---|
| 基準 `48d821f` | **277.6**（277.6 / 286.0 / 275.0） | — | 966 | 16 |
| 改後・三尊在同一側（**遊戲裡的上界**） | **301.1**（301.1 / 301.7 / 298.9） | **1.085 ✅**（門檻 ≥0.95） | **986 ✅**（門檻 ≤1000） | 16 |
| 改後・六尊（治具灌水的悲觀上界 `--lgboth=1`） | 300.2 | 1.081 ✅ | **1006 ❌**（超 6） | 16 |

- 全桌只有三尊、一尊只在一個人袋裡，**兩側同時各有三尊在遊戲裡不可能發生**；`--lgboth=1` 是刻意灌水的上界，兩個數字都印出來，不挑對自己有利的那一個。
- ★量測本身先修過兩件事，不然這一格沒有意義★：
  1. `duel-perf` 的合成 `ys:duel` 原本**沒有隔離真實對決**，`ys:fx-burn` 會在量測期間燒掉尊，`visible` 在 13～16 之間跳；實測同一份程式碼 `visible=13` 的那一跑比 `visible=16` 快 10%。加了與 `legend-presence` 同一套 `ys:` 隔離之後兩邊都穩定在 16。
  2. 合成名冊原本**不帶 `lg`**，新版跑的其實是一般妖那條路，對本卷新增的 draw call 零鑑別力。現在三尊帶 `lg`／`sn`（基準樹讀不到這兩個欄位，所以同一份 detail 對兩邊都成立）。
- 途中修掉的一個真效能問題：名牌的上緣夾限一版用 `f.group.updateMatrixWorld()`（**會遞迴整棵骨架**），實測比值掉到 0.947；改成 `updateMatrix()`（本地、O(1)，`f.group` 是直接 `scene.add` 的，父層是身分矩陣）之後回到 1.08。

### G5 零錯 ✅
- `node --test tests/*.test.mjs` → **12 套全綠**（`tests 12 / pass 12 / fail 0`）
- `duel-drive --duels=4 seed=7` → `{"duels":4,"errors":0}`（`docs/.../duel-drive-seed7.json`）
- `traitfx-drive --tier=1` → **27/27 pass**；`--tier=3` → **3/3 pass**（三尊大招不退）
- `legend-drive --seeds=1,2,3` → **console error 0、pageerror 0、requestfailed 0 ✅**；H6 三條路徑 ✅；橫向溢出 ✅
  ★它的**總判定**印 ❌，原因只有一個：沒帶 `--base=`（那是掏空卷 `#felt` 的基準，要先跑 `felt-probe` 對基準樹量）★——
  **對基準樹 `48d821f` 跑同一條指令，結果逐項相同（也是 ❌、也是 console error 0）**，證據 `legend-drive-base.json`。
  ⇒ 這個 ❌ 是既有條件，與本卷無關；本卷的 G5 要求是「0 error」，那一項是綠的。
- 途中被擋紅一次（**擋得好**）：`traitfx-drive` 的 `casesFromIndex` 反查 `LEGENDS` 的 regex 在 `n` 與 `f` 之間不容許新欄位，加了 `sn` 之後當場「LEGENDS 反查到 0 套（預期 3）」throw。修法只放寬「`n` 與 `f` 之間可以有 `sn`」，**3 套的下限與其餘欄位一格不動**。

### G6 範圍 — ⚠️ **多一個檔，待簽字**

`git diff --stat 48d821f..` 的程式碼部分：

| 檔案 | 行 | 對應哪條需求 |
|---|---|---|
| `index.html` | +38/−3 | 甲（`lg`／`sn` 送進 3D）、乙6（`LEGENDS.sn`）、乙7（`pwLegendEnter`）。**`VERSION` 一格未動**（`git diff` 對 VERSION 命中 0 次） |
| `js/duel-figures.js` | +355 | 甲1–4＋乙5–6 的主體 |
| `js/creature-figures.js` | +10/−2 | 甲3 的「放大例外」`normUp`（凍結檔明列的允許項） |
| `js/camera-director.js` | +17 | 乙7 的 `ys:legend-enter` |
| **`js/renderer.js`** | **+3/−1（實質 1 行）** | ★**不在凍結檔 G6 的允許清單裡**★ |
| `tests/tools/*` | 新 3 支＋改 2 支 | 治具 |
| `docs/experiments/*` | 新增 | 凍結檔、證據、報告、盲讀材料 |

`assets/` **沒有新增任何檔**（基座與光效全部是程序化幾何，沒有新 GLB）。
`js/scene-env.js`、`js/trait-fx.js` **一行未動**。

★**範圍變更（待使用者簽字）**★：`js/renderer.js:117` 加了 `normUp: !!u.lg` 一個參數。
理由：`makeFigure` 這個工廠住在 `renderer.js`，`normUp` 只能從那裡傳進 `makeCreatureFigure`。
替代方案是在 `creature-figures` 開一支 `setNormUp()` 讓 `duel-figures` 在工廠回傳後同步呼叫，
靠「GLB 載入是非同步、`.then` 一定排在同步區塊之後」這個時序成立——**多 8 行、而且依賴微任務順序**，
比一行參數差。前例：`fx-tiers` 凍結檔「修訂三」也是用同一種方式把 `js/renderer.js` 的一行補進允許清單。

---

## 3. 兩件派工書沒寫、但不加就過不了的東西（都要簽字）

### (a) `FIG.legendPxMax = 172`（畫面高度保險絲）
`FIG.creaturePx = 150` 是對「精英 ×1.15」調出來的（`duel-figures.js:73` 的註解：190 時精英在 390px 高的畫面被切頭）。
傳說 ×1.35 再加基座就會超出去——實測 `legendLift=0.36` 時**有應公整顆頭被視口上緣切掉**（`topY=0`）。
這一格把「整尊＋基座」換算成 CSS 像素，超過 172 就等比壓回來；**只會把傳說壓小、永遠不會放大**（同 `creaturePx` 的性質）。
副作用是好的：滿編 8v8 下三尊都咬到這條線 ⇒ **三尊在畫面上一樣高**（`topY` 全部 80），傳說變成一個視覺上一致的「級別」。
代價：`bodyScale.legend = 1.35` 在滿編時其實被這條保險絲接手，1.35 變成「人少時才咬得到的上限」。

### (b) 傳說列「相鄰兩尊腳印不得重疊」（`sMin = fIn + fOut`）
`FIG.rowMinStep = 0.55` 是照一般妖的尺寸訂的；傳說 ×1.35 的腳印兩顆加起來就超過它
⇒ **兩尊有應公（`haunt×2`，同一排兩尊）左右交疊、互相遮住對方**。這是三尊裡唯一過不了 ≤10% 的那一格的真因：
加上這條之後 youyinggong 從 10.35% 掉到 1.7%。只對傳說列生效，其餘排的 `rowMinStep` 一格未動。

### (c) 名牌上緣安全區（`PLATE_SAFE_NDC = 0.88`）
滿編時傳說幾乎頂到視口上緣，名牌掛在頭頂上方會被切掉（實測只剩半張紙籤）。
把理想位置投影到 NDC，越過安全線就往下壓——**只往下、不往上**，畫面塞得下時位置與不夾一模一樣。
配套：名牌 `depthTest:false`＋`renderOrder 999`（被壓下來的那幾尊位置會落進自己身體裡，
開深度測試就整張被身體吃掉——實測那一版畫面上完全看不到名牌）。

### (d) ★明文偏離派工書★：名牌字數
派工書寫「尊名**兩字**」。落地用的是 `LEGENDS.sn` ＝ **殘日／大士爺／有應公**（2–3 字）。
理由：「大士」「有應」在中文裡是不完整詞，砍成兩字會直接傷 G3 的辨識；「兩字」讀成尺寸指引。
**這一條要使用者簽字**；未簽字前 G3 的盲讀結果照實標「用的是 2–3 字版」。

---

## 4. 調參軌跡（每一輪的數字都落檔，沒有藏）

`legendLift` 由派工書授權「實測後定」（凍結檔 §1 第 4 點，區間 0.25–0.45）；
`bodyScale.legend` 的 1.35 派工書寫的是「起點」。**G1／G2 的門檻（≤10%、頭部 0%、不出框）全程一格未動。**

| 證據目錄 | 設定 | canri | dashiye | youyinggong | 結論 |
|---|---|---|---|---|---|
| `before/` | 基準 48d821f | 0.670 | 0（本來就沒被擋） | 0（同左） | 改前 |
| `after-r1/` | lift .30／scale 1.35 | 0.063 | 0.106 ❌ | 0.029、`topY=0` ❌ | 有應公切頭 |
| `after-r2/` | ＋`normUp` 一併踩回 y=0 | 0.061 | 0.136 ❌ | 0.094 | G2 全過，dashiye 紅 |
| `sweep-036/` | lift .36 | 0.031 | 0.091 | 0.058、`topY=0` ❌ | 只剩有應公切頭 |
| `sweep-122-036/` | scale 1.22 | 0.056 | 0.137 ❌ | 0.101 ❌ | 變小＝更被擋，反向 |
| `sweep-135-036-inner/` | 傳說列往中軸靠 | 0.074 | 0.120 ❌ | 0.097 | 更差，撤回 |
| `sweep-brick/` | 傳說列恢復錯半格 | 0.048 | 0.130 ❌ | 0.123 ❌ | 更差，撤回 |
| `after-r3/`＋`sweep-px180*` | ＋`legendPxMax` 保險絲 | 0.025 | 0.096 | 0.104 ❌ | 逼近 |
| `sweep-lift042/` | lift .42 | 0.007 | 0.062 | 0.102 ❌ | 有應公還是差一點 |
| `sweep-nooverlap/` | ＋傳說列不互疊（§3b） | 0.006 | 0.060 | **0.017** | 全綠，真因找到 |
| `sweep-px172/`→`after/` | px 172＋名牌 HUD 化＋視覺二輪 | **0.007** | **0.064** | **0.016** | 定案 |

---

## 5. 視覺交付與 `threejs-visual-loop` 自評兩輪

- 滿編對決 844×390 截圖：改前 `before/shot-{canri,dashiye,youyinggong}.png`／改後 `after/shot-*.png`
- 請神進場：`enter/legend-enter.gif`（1400ms CINEMA 全程 17 幀）＋ `enter/legend-enter-strip.png`（橫條）
  治具 `tests/tools/legend-enter-gif.mjs`（新），派的是**與 `pwLegendEnter` 同一顆 `ys:legend-enter`**，不是另寫一套動畫。

**第一輪自評 → 修的東西**
- ❌ 名牌整張讀成灰標籤（一圈細系色邊在 844×390 上讀不出顏色）→ 改成暖紙底＋**上下系色橫帶**＋粗墨邊
- ❌ 殘日的餘暉盤在畫面上根本看不到 → 漸層中心 hot 段拉到 0.30、盤面 2.2→2.6、不透明度 0.30–0.50→0.44–0.72
- ❌ 有應公的鬼火飄到兩軍中間、像灰泡泡 → 繞身半徑 0.42–0.72→0.26–0.46、球徑 0.058→0.046
- ❌ 被夾限壓下來的名牌**完全看不到**（落進身體裡被深度測試吃掉）→ `depthTest:false`＋`renderOrder 999`

**第二輪自評（`after/shot-*.png`）**
- ✅ 三尊在滿編 8v8 裡一眼高過所有一般妖；名牌 `殘日`／`大士爺`／`有應公` 在 844×390 上讀得出來
- ✅ 殘日腳下的餘暉盤在暗紅桌面上讀成一片暖光，不是一圈光環
- ✅ 骨堆／神轎座／日輪台三種基座剪影互不相似
- ⚠️（記錄，未修）香頂的火頭與香火系的煙粒（`FACTION_FX.xianghuo` 的 `smoke`，灰紫、size 0.20）在同一區，
  小尺寸下不容易分出哪個是火頭。屬【試玩必調】，不擋合併。
- ⚠️（記錄，未修）名牌在畫面最上緣時會與 `#duelBeat`（「一拍・撞」）的字重疊一點點。
  要解得動對決版面的安全區——那是 `fx-tiers` 凍結檔修訂七明文留給「招式可辨性卷」的題目，本卷不碰。

---

## 6. 已知未涵蓋（照實列，別當它是 100%）

1. **G1 的量法排除了基座／光效／名牌**（`legend-` 前綴），只算生物本體的剪影。
   這讓判定更嚴（基座是本卷新加的大塊像素，算進去會稀釋遮擋比例），但也代表
   「基座自己有沒有被擋」沒有被量。
2. **mask pass 不走 bloom**（走 `renderer.render()`）：遮擋是幾何事實，開 bloom 會讓同一顆像素在兩個 pass
   都落在容差外。⇒ 這個量測不保證「玩家眼裡」的對比，那是 G3 盲讀的事。
3. **量測期間主迴圈是停著的**（換掉 `requestAnimationFrame`），幀與幀之間只用
   `duelFigures.update()` 推進人形、鏡頭凍住。所以量到的是「同一機位、不同動作」的三到五個樣本，
   **不含鏡頭在動的那幾幀**（punch／focus／CINEMA 進行中）。
4. **只量了 844×390@2x 一種視口**。390×844 直式與其他高度沒量（`legendPxMax` 是 CSS 像素制，
   理論上跟著縮，但沒有實測數字）。
5. **`--lgboth=1` 的 1006 draw call 超門檻 6**（見 G4）。遊戲裡做不到六尊，但如果之後加第四尊傳說、
   或 `MAXFIG` 調大，這條會先撞上。
6. **G3 只產材料**，讀者與判定由主對話派；本報告不宣稱盲讀通過。
7. 傳說列在 `n===3`（一排制）時退回原排法——那種場面本來就不會被擋，但「傳說站中央」這件事在那裡不成立。
