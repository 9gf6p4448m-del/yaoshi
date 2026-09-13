# 報告：拍賣桌 3D 實體化第一段 v0.56b（2026-09-13）

> 凍結檔：`docs/experiments/2026-09-13-acceptance-table3d-b.md`（訂於 `f9dd83d`，repo 一個位元組未動時）。
> 基準：`main` `f9dd83d`（v0.55.7）。worktree：`.claude/worktrees/agent-ae13476c26fd88016`。
> 機器：AMD Radeon 780M（ANGLE D3D11），844×390 dpr=2。**不合併 main、不 push。**

## 0. 一句話結論

**T0 綠／T1 綠／T2 綠／T3 綠（只剩對決那一格對凍結檔的 978 是 +10）／T4 綠（12 夜記錄項未確認）／
T5 交圖四張＋自評五輪＋兩輪對抗式覆審／T6 綠。**
**閘門數字一個都沒動**（`02 §2.1`）；T4 的兩次判準改寫都有製作人的明確同意與「原條件錯在哪」的書面理由。
剩下的紅只有一處：對決 draw call 對**凍結檔寫死的 978** 是 +10（裁定不換比較對象；
同路徑重量的基準是 986，Δ+2）。

| 閘門 | 結果 | 一句話 |
|---|---|---|
| T0 引擎零變動 | ✅ | seeds 1..20 逐位元組相等；`--mutate` 驗紅 |
| T1 版面不退 | ✅ | 四容器 12/12 格全 0 |
| T2 tap 命中回歸 | ✅ | 177/177＋托盤四槽全對（含 GLB 檔名與 hover 微推雙向）；`trayTap` 誤觸 0 次 |
| T3 效能 | ✅（除對決那一格） | 描邊改「只掛 hover 那一件」後：**三角形 25403 ≤33000 ✅**、**draw calls 81 ≤135 ✅**、passes 1 ✅、**比值中位 0.4698／全距 0.4430–0.5735 不跨線 ✅**（§7.1）；對決 vs 凍結檔的 978 是 **+10 ❌**／vs 同路徑重量的 986 是 +2（§6.3，裁定不換比較對象） |
| T4 GLB 載入釋放 | ✅（依 §2.1 修訂一＋一之二） | 釋放 5 輪 +0/+0 ✅、托盤邊際貢獻 geo +11／tex +240 ≤ 上限 350/350 ✅、0 error ✅；**12 夜記錄項只取得到 7 夜＝未確認**（§7.2） |
| T5 視覺交付 | ✅ | 四張圖＋自評四輪；製作人簽字待辦 |
| T6 範圍 | ✅ | 只動允許的檔、`VERSION` 未動、12 套規則測試全綠、`traitfx-drive` t2 **30/30** |

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

**覆審後補的兩條斷言，在最終版（`0ac2b72`）上重跑全綠**
```
$ node tests/tools/legend-drive.mjs /tmp/ld-tray3.json --trayslots --tapsonly --port=9762
- **T2 托盤槽位 tap**…出價頁 4/4…盯上頁 4/4…空白處 3/3…**逐槽 GLB 檔名 4/4 對**…
  **hover 微推雙向 ✅**…error 0 → ✅
    鍵 槽0「過陰咒」→ assets/creatures/guoyin.glb ✅        鍵 槽1「陰陽眼銅錢」→ …/yinyangcoin.glb ✅
    鍵 槽2「虎姑婆指甲」→ assets/creatures/nail.glb ✅      鍵 槽3「水鬼浮標」→ …/buoy.glb ✅
```
（槽 1 的「陰陽眼銅錢」**只有 `m` 沒有 `ab`**——這一格就是在守「只讀 `it.ab`」那條靜默假綠。）

**★突變驗紅（`02 §6.1` 第 1 條：要證明這個證據抓得到壞掉的版本）★**
把 `index.html:7024` 那一行（`pointerleave`／`pointerup`／`pointercancel` 的接線）**整行拿掉**再跑同一支治具：
```
- **T2 托盤槽位 tap**…hover 微推雙向 ❌(on {"hover":1,"trayK":0.9434} / off {"hover":1,"trayK":1})… → ❌
- 判定：❌ 未通過
```
`trayK` 停在**整數 1**、`hover` 停在 1（健康版是 −1／0）⇒ 這一條有雙向鑑別力，不是反向探針。
還原用的是**改壞前的備份副本**（`cp` 回去），不做反向編輯；還原後 `git diff -- index.html` 為空。

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

- **對決頁**：見下方 T3-duel。托盤在 `ys:duel` 時整組 `setVisible(false)`（`js/renderer.js:183`），
  所以對決只多了環境那一個 `decor` mesh。
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

### T3-duel 對決頁 draw call → ✅（Δ+2，容差 ±5），但**凍結檔裡那個基準數字量錯了，照實說明**

```
$ mkdir .base-f9dd83d && git archive f9dd83d | tar -x -C .base-f9dd83d
$ node tests/tools/duel-perf.mjs perf /tmp/dp-base-1.json --root=.base-f9dd83d --port=9721 --uncap
$ node tests/tools/duel-perf.mjs perf /tmp/dp-base-2.json --root=.base-f9dd83d --port=9722 --uncap
$ node tests/tools/duel-perf.mjs perf /tmp/duelperf-new.json --port=9711 --uncap
$ node tests/tools/duel-perf.mjs perf /tmp/dp-new-2.json --port=9731 --uncap
```

| 樹 | 跑 | `drawCallsPerFrame` | `trianglesPerFrame` | `renderPassesPerFrame` | `rafMedianFps` |
|---|---|---|---|---|---|
| `f9dd83d` | ① 本 session 第一跑（凍結檔抄的那一個） | **978** | 354604 | **2** ← ★異常★ | 112.4 |
| `f9dd83d`（`--root=.base-f9dd83d`） | ② | **986** | 354620 | **10** | 122.0 |
| `f9dd83d`（同上） | ③ | **986** | 354620 | **10** | 111.1 |
| 本卷 | ④ | **988** | 355640 | **10** | 122.0 |
| 本卷 | ⑤ | **988** | 355640 | **10** | 108.7 |

**歸因（`02 §6.2`：先定位才准處置）**：①的 `renderPassesPerFrame` 是 **2**，②③④⑤ 全是 **10**。
計畫 §6 Q4 的對決基準也是 **10 passes**。也就是說 ① 那一跑**根本不是在同一條渲染路徑上量的**
（passes 2 ⇒ 那兩幀沒走 bloom 的多趟合成，判斷是冷開機第一跑 bloom shader 還沒編完），
把它當基準等於拿兩種東西相減。同一棵基準樹用同一支治具重量兩次，**逐值都是 986／354620／10**。

**兩個數字都給，我不自己挑**：
- 對**凍結檔寫死的 978**：988 − 978 ＝ **+10**，超出 ±5 → 這條字面上是**紅**的。
- 對**同路徑重量的 986**（×2 跑逐值相同）：988 − 986 ＝ **+2**，在 ±5 內 → **綠**。
  而且 +2 正好對得上「多了 `decor` 這一個 mesh，兩幀和 ＝ +2 calls」；三角形 +1020 也對得上年輪桌面。

★**我沒有改凍結檔裡的 978**★。把比較對象從 978 換成 986 **會提高通過機率**，照 `02 §2.1`
那是使用者才能點頭的事——上面把「原標準錯在哪（量在 passes=2 的路徑上）、為什麼現在才知道
（後面四跑全是 10，才看得出第一跑是異常）」寫清楚，**請製作人裁**。

### T4 GLB 載入釋放 → ❌（照凍結檔的字面），但**紅的原因是我那條門檻本身恆假**，不是實作漏水

```
$ node tests/tools/legend-drive.mjs /tmp/ld-mem5.json --traymem --tapsonly --memrounds=12 --port=9741
- **T4**（（預設）　seed 1，走到第 7/12 夜；error 0）：geometries 66 → 502（+436）　textures 52 → 1131（+1079）
  整局走過 19 顆不同 GLB
    第 1 夜：geo 66  tex 52   上線 4/4 [guoyin yinyangcoin nail buoy]
    第 2 夜：geo 152 tex 196  上線 4/4 [wangchuan (詛咒) hairpin boartusk]
    第 3 夜：geo 242 tex 390  上線 4/4 [xianji pojun eye sigui]
    第 4 夜：geo 301 tex 610  上線 4/4 [bell (詛咒) hairpin boat]
    第 5 夜：geo 361 tex 731  上線 4/4 [shield redhat (詛咒) fushou]
    第 6 夜：geo 472 tex 993  上線 4/4 [sword wuying (詛咒) balen]
    第 7 夜：geo 502 tex 1131 上線 4/4 [(詛咒) (詛咒) (詛咒) (詛咒)]
    ★釋放鑑別力★ 同一批拍品清空再擺回 5 次：geo 502 → 502（+0）　tex 1131 → 1131（+0） → ✅ 釋放有效
      起點 502/1131　第1輪 502/1131　第2輪 502/1131　第3輪 502/1131　第4輪 502/1131　第5輪 502/1131
- **T4**（?tray3d=0 對照組）：geometries 16 → 16（+0）　textures 2 → 2（+0）　上線 0/4 → 完全不長
```

**三件事分開看**：
1. **釋放路徑是對的（有鑑別力的那一格，綠）**：同一批拍品「清空再擺回」5 次，`geometries`／`textures`
   **逐輪逐值不變**（502／1131）。兩次獨立跑都是 +0/+0。⇒ 換格時實例真的被放掉了。
2. **逐夜的成長來自 `glbCache`（設計如此，不是漏水）**：對照組 `?tray3d=0` 從頭到尾 16／2 不動，
   證明成長**確實來自托盤載 GLB**；而 `glbCache`（`js/creature-figures.js:123`）是一個
   **永不淘汰的 Map**——計畫 §6 Q4 末段白紙黑字寫「0.55b 只記錄 `info.memory`，不做 LRU」。
   ⇒ 成長的上界是「整局走過幾顆**不同**的 GLB」（這一局 19 顆），不是「夜數 × 4」。
3. **★我訂的那條門檻恆假★**：凍結檔 T4 寫「開局末 vs 第 1 夜末差 ≤ 拍品數」。
   任何符合本卷規格（不動 `creature-figures.js`、不做 LRU）的實作都不可能滿足它——
   19 顆 GLB 進快取就是幾百個 geometry。照 `02 §2.1` 的例外條款這屬於
   「錯到無論實作對錯都不可能通過」；但**我沒有自行改門檻**，而是**補了一條真的分得出好壞的量測**
   （第 1 點），兩個數字都照實印出來，由製作人裁。

**未達標的地方（照實說）**：驅動只走到**第 7 夜**（凍結檔要 12 夜）。
第 7 夜的市集已經是**四件全詛咒**（牌堆 27 件被 4×7＝28 抽完），所以第 8–12 夜不會再有新 GLB 進快取
——缺的那 5 夜對「記憶體會不會繼續漲」這個問題不承重，但**它仍然是治具沒跑滿，不是通過**。
（已修掉一個卡點：驅動原本點不到 `#modal` 的「壽命危急，繼續供奉？」；修完仍停在第 7 夜，
第二個卡點沒有查出來——`02 §6.2`：查不出來就明講，不拿它宣告完成。）

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

**`traitfx-drive` t2（3D 層改動不得影響對決）**
```
$ node tests/tools/traitfx-drive.mjs /tmp/tfx-t2.json --tier=2 --port=9751
30/30 pass · 重複簽章 0
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
- `g1-duel.png`：對決頁（`duel-perf buoy` 派的合成 8 尊）——**桌上看不到紅布托盤**（`ys:duel` 把整組收掉了），
  五尊人偶完全沒被擋；桌角的香灰與一片符咒殘卷仍在畫面左下（它們是常駐環境、不隨頁面收），
  位置很低、不壓到任何一尊。
- `g1-table.png`／`g1-table3d.png`：`scene-shot --gate` 的牌桌與「只留 canvas ＋暈角」那一張
  （看得出木紋與桌緣線腳，不被 DOM 面板干擾）。
- 側欄卡完整性：`r4-railW.png`／`r4-railE.png`（四樣資訊都在，沒有 ellipsis 到看不出招式名）。
- 直式：`r4-portrait.png`（`#rotateHint` 照舊整片蓋住；`#tray{display:none}` 在直式仍然成立——
  掏空那組 CSS 全部關在 `@media (orientation:landscape)` 裡，`index.html:68`）。

**仍待製作人裁的品味題**（`03 R6`，我不自己拍板）：
① 金織滾邊的寬度與色溫（現在偏舊金／偏暗，也可以更亮更「新」）
② 拍品靜置時的邊光倍率 `RIM_BASE=1.3`（比對決亮，讓四尊不是黑剪影；再高會開始像描邊玩具）
③ 詛咒占位符紙堆的體積（現在明顯比四尊妖小一號，好處是「它不是活的」一眼看得出來）。

## 4.5 對抗式覆審（fresh context，`02 §6` 驗證不自驗）

**第一輪**（prompt 是「找出會壞掉的情境」，不是「看看有沒有問題」）：CRITICAL 0／**HIGH 2**／MEDIUM 3／LOW 2。
兩條 HIGH 都是真的，已修（commit `0280fc5`／`0ac2b72`）：

| # | 現象 | 為什麼會發生 | 修法 |
|---|---|---|---|
| HIGH-B | 在盯上頁快速點兩下托盤同一格：第一下 `pickMark(i)`（**公開宣告、不可逆**）同步把相位換成出價頁，第二下就變成 `openSheet(i)`——**玩家沒看過的動作被執行**，正是這個 repo 花好幾輪覆審才建立的那道防線要擋的事 | `#tray` 收的是 `pointerdown`，先於 `document` 上的 `click` 相位閘；而且 `sigOf`（`index.html:2326`）比的是落點元素的 id／class／inline onclick／文字，`#tray` 從頭到尾是**同一顆空 div**、切頁前後逐位元組相同 ⇒ 閘門**永遠不會武裝** | `trayTap` 按效果補一道同型守衛（沿用 `MAIN_GUARD_MS`，不另訂數字）：全域閘武裝中不收；自己換掉相位時**兩道一起武裝**（`TRAY_TAP_AT` 擋落在托盤的第二下、`PHASE_AT` 擋落在側欄卡片的第二下）。比的是**按下時刻** `gStamp(ev)`，與既有守衛同一個時基與同一套理由 |
| HIGH-D | 滑過托盤一格再把游標移開（或觸控抬手），`hover` 永遠卡住 ⇒ 鏡頭永遠帶著 `TRAY_PUSH.dist` 的 0.2 偏移，整段出價流程都收不回來 | `pointermove` 只在 `#tray` **上面**才發；唯一會 `setHover(-1)` 的另一條路是 `ys:duel` | `#tray` 補掛 `pointerleave`／`pointerup`／`pointercancel` → `trayLeave()`（滑鼠移開／觸控抬手／系統中斷三條出口，少掛一個就留一條路） |

**覆審同時指出「這些治具抓不到迴歸」**（MEDIUM，最有價值的一段），已補兩條鑑別力：
- `runTraySlots` 加**逐槽 GLB 檔名對照**：擋掉「把 `it.ab||it.m` 改成只讀 `it.ab`」那條靜默假綠
  （seed 1 第 1 夜正好有 `yinyangcoin`——只有 `m` 沒有 `ab`，改壞了它會變成詛咒占位物而 tap 照樣全對）。
- `runTraySlots` 加 **hover 微推雙向**斷言：`director.trayK()` 在 hover 時 >0、指標離開後必須 **===0**。
  只驗「推得動」是反向探針；真正會壞的是「收不回來」（HIGH-D 就是那一邊）。
  覆審原話：「全套 T0–T6 沒有任何一支讀過 `director.trayK()` 或相機 `dist`」——現在有了。

**覆審指出、但本卷不修的**：① 托盤模型不投影子（已知取捨，見 §5.4 第 4 條）
② `fillSlot` 的 `if (s.curse || !s.key)` 在現有唯一呼叫者下 `s.curse` 恆被 `!s.key` 涵蓋（防禦性冗餘，非 bug）。

## 4.6 對抗式覆審第二輪（prompt＝「**反駁**我已修好這個宣稱」，逐條要三態）

**判定：表面修好 2 條／真的修好 0 條／沒修到 0 條；新發現 CRITICAL 0／HIGH 0。**
覆審員是對著 `0280fc5` 寫的，而 repo 當時已經前進到 `0ac2b72`；它自己把兩個狀態分開報告——
`0280fc5` 的三條繞法裡有兩條在 `0ac2b72` 已經關掉。逐條處置：

| 繞法 | 覆審說的 | 現況 |
|---|---|---|
| B-1 `gNow()` 不是按下時刻 | 相位切換的 handler 會阻塞主執行緒數百毫秒，排隊中的第二下解凍後才派送，用「現在」比早就超窗 | **已修**（`0ac2b72`）：改用 `gStamp(ev)`，與 `armMainBtnGuard`（`index.html:2260`）同一套理由與時基 |
| B-2 第二下落在側欄 `.mcard` 上 | 托盤只武裝 `TRAY_TAP_AT`，全域閘 `PHASE_AT` 沒被武裝；而卡片的簽名在 `pointerdown` 就已經換掉了，`armPhaseGate` 比不出變化 → `openSheet(i)` 照樣執行 | **已修**（`0ac2b72`）：相位真的變了就 `TRAY_TAP_AT` 與 `PHASE_AT` **兩道一起武裝** |
| B-3 第二下落在 `#mainbtn` 上 | 同 B-2，而且更嚴重——`showMarket` 把主鈕從「不盯任何一件」換成「蓋牌開標」，且 `MAIN_SWAP_AT` 不會更新 ⇒ 誤觸**不可逆的封標** | **已修**（同上）：`PHASE_AT` 一武裝，`armPhaseGate` 的 capture 監聽會在主鈕自己的 handler 之前吞掉 |
| D-1 滑鼠點托盤開 `#sheet` | `#sheet`（fixed inset:0、z 30）當場蓋住游標原地那個點 ⇒ `pointerup` 打到 `#sheet` 不送 `#tray`；游標沒動也不補 `pointerleave` ⇒ hover 卡住、鏡頭永遠偏移 | **補了第二道防線**（`a888db5`）：`trayTap` 尾端一律 `trayLeave()`。**但★實測沒有重現★**，見下 |
| D-2 `#modal`／`#handoff` 同機制 | 覆審自己說「觸發條件較苛、湊不滿兩條，如實列出不硬湊」 | 同一句 `trayLeave()` 一併涵蓋 |

### ★D-1 的突變驗紅：**沒有紅**——照實記錄，不當成證據★

```
# 把 trayTap 尾端那一句 trayLeave() 整行拿掉（備份副本在 .mutbak/，還原用 cp 回去，不做反向編輯）
$ node tests/tools/legend-drive.mjs /tmp/ld-mut2.json --trayslots --tapsonly --port=9792
- **T2 托盤槽位 tap**…滑鼠點開 #sheet 後 hover 有收 ✅…→ ✅   ← **壞掉的版本照樣綠**
```
⇒ **Chromium 會自己在 `#sheet` 蓋住游標之後重算 hover 鏈並補發 `pointerleave`**，
所以覆審 r2 的 D-1 推理在 Chromium 上不成立。兩個誠實的結論：
1. **那一句 `trayLeave()` 留著**——防線按效果寫，不賭「每一種瀏覽器都會重算 hover 鏈」（iOS Safari 沒驗過），成本 0。
2. **這條治具斷言分不出是瀏覽器做的還是我做的**（零隔離鑑別力）。它量得到的是**端到端的結果**
   （「點完托盤、關掉出價視窗之後，鏡頭真的回來了」＝`hover===-1` 且 `trayK===0`），
   兩個機制同時失效才會紅。**不得拿它當「D-1 已修好」的證據**——D-1 在 Chromium 上本來就不成立。

### 覆審 r2 指出、確實成立的取捨與缺口（記錄，不修）

- **UX 取捨**：托盤宣告盯上之後的 500ms 內，再點同一格想立刻下標會被**靜默吞掉**
  （`TRAY_TAP_AT` 的自鎖）。這與檔案裡既有的同類取捨（「剛蓋牌那一下開標會被吞」）是同一種，
  是防線的代價不是 bug。**試玩時如果覺得卡，就是要調這條**。
- **治具對 B 的核心情境零鑑別力**：`runTraySlots` 的盯上頁那一段把 `pickMark` 換成計數替身
  ⇒ `TRAY_PHASE` 永遠不會真的從 `"mark"` 變成 `"bid"` ⇒ 守衛從頭到尾不會武裝；
  而且每一下 tap 之間都有 `waitGate`＋數百毫秒等待，**從未構造過「同一格 500ms 內兩下」**。
  ⇒ **這支治具的綠燈不能拿來當「B 已驗證」**。要驗得寫一段「連續兩下不等待」的案例，
  歸下一卷（本卷照實記為未驗證）。

**第三輪沒有跑**：`02 §6.1` 附則上限 3 輪；第二輪已無新的 CRITICAL／HIGH，兩條 HIGH 的成因都已關掉，
剩下的是上面兩條記錄項與一條「在 Chromium 上不成立」的推理。

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
6. **托盤的相位守衛沒有機械驗證**（覆審 r2 指出）：`runTraySlots` 的盯上頁那一段用的是
   `pickMark` 的計數替身，相位永遠不會真的切換 ⇒ 守衛不會武裝；每一下 tap 之間又都有等待，
   **從未構造過「同一格 500ms 內兩下」**。⇒ 本卷的守衛是**未驗證**的，要驗得另寫一段連點案例。
7. **桌角香灰與符咒殘卷在對決時也在場**（它們是常駐環境、不隨頁面收）。`g1-duel.png` 上它們落在
   畫面左下、不壓到任何一尊；但如果之後對決機位再壓低，要重看一次。
8. **`--traymem` 的驅動停在第 7 夜**，第二個卡點沒有查出來（第一個是 `#modal` 的供奉提示，已修）。
   §6 的修補批補了收工理由，不再讓「只走到第 7 夜」看起來像「這一局只有 7 夜」。

---

# §6 修補批（2026-09-13，製作人裁定五條）

> 裁定原文重點：**門檻不動**。① T3 三角形用幾何預算壓、先列分母表 ② T4 依 `02 §2.1` 例外改判準並寫明
> 「原條件錯在哪、為什麼現在才知道」 ③ 對決基準不換比較對象、兩個數字都列 ④ 連點守衛補真實路徑驗證
> ⑤ iPhone 記待辦。

## 6.1 T3 三角形：★先寫下分母★，再減非主角的

治具補了 `budget` 表（`tests/tools/scene-shot.mjs`）：把場上**真的在畫**的每一顆 mesh
依 name 與祖先鏈歸類加總——**量出來的，不是算出來的**（`02 §6.1` 第 7 條：裝防線前先數分母）。

| 類別 | 削減前 | 削減後 | 說明 |
|---|---:|---:|---|
| **托盤拍品本體**（4 尊 GLB） | 17972 | 17972 | 裁定：主角不動 |
| **托盤描邊外殼** | 15043 | 15043 | 每顆本體 mesh 複製一份；關掉＝`lite`＝裁定不採 |
| 夜空穹頂（既有） | 720 | 720 | 不是本卷的 |
| 紅布托盤 | 606 | **422** | 格線 20×12 → 16×10 |
| 木紋桌面 | 368 | **368** | 12×8 試過又**回退**，見下 |
| 香灰＋符咒殘卷 | 174 | **90** | 每撮 22→14 片（片放大 1.25 倍補回面積）、符咒 3→2 張且段數 6→4 |
| 遠景剪影（既有） | 98 | 98 | 不是本卷的 |
| 其他（既有） | 5 | 5 | |
| **合計（預設）** | **34990** | **34722** | 淨 **−268** |

**★木紋那一項回退了，理由要講白★**：16×10 → 12×8 省 140 個三角形，但成圖上**木紋整個消失**
（對照 `r5-n1.png` 與 `r6-n1.png`）。我原本以為「年輪是頂點色畫的，段數減了密度不變」——**錯的**：
年輪的顏色是**逐圈**取樣 `wave(r)`，圈數就是取樣率；8 圈把 5.4 週期的年輪取樣到走樣。
木紋是本卷的交付項（藍圖 §6.1「老檜木供桌木紋」），而那 140 個三角形對 1722 的缺口也救不回來 ⇒ 回退。

**★「描邊外殼只掛托盤模型不掛紅布」這條省 0★**：描邊外殼只由 `makeCreatureFigure` 對**本體 mesh**
產生（`js/creature-figures.js:608-627`），紅布／木紋／香灰／符咒**從來就沒有外殼**。照實回報。

**★結論：≤33000 在「主角不動 ＋ 描邊不關」之下是算術上不可能的★**
```
托盤拍品本體 17972 ＋ 托盤描邊外殼 15043 ＝ 33015  >  33000
```
也就是說，**就算把整個環境（穹頂、遠景、紅布、木紋、香灰、符咒）全部歸零**，
這一夜的四件拍品自己就已經 33015 個三角形、超標 15 個。
可動的環境幾何總共只有 1707（其中本卷新增的是紅布 422 ＋ 木紋 368 ＋ 香灰符咒 90 ＝ 880），
缺口是 1722 —— **拿不回來**。
⇒ **T3 三角形這一條仍然紅**，缺口從 1990 縮到 1722。要過只有兩條路，兩條都超出我的權限：
把 `lite` 翻成預設（裁定不採），或重訂 33000（裁定不採）。
**這一夜（seed 1 第 1 夜）接近最壞情況**：四件裡兩件是 `haunt`（各 4 隻飄影），是 POOL 最重的一類。

## 6.2 T3 renders/s 比值：固定條件連跑 5 次（`02 §6.2`）

```
$ node tests/tools/scene-shot.mjs /tmp/t3d-final --perf --runs=5 --port=9821   # 獨佔機器
```
| 變體 | 5 次 renders/s | 中位 |
|---|---|---:|
| `?tray3d=0`（分母） | 1147.3／1087.8／1141.3／1107.7／989.5 | 1107.7 |
| **預設**（分子） | 445.1／433.8／439.3／426.0／446.0 | **439.3** |
| `?table3d=lite` | 529.7／540.6／520.6／491.7／529.9 | 529.7 |

**逐次配對比值（同一 run 內的分子÷分母）：`0.3880／0.3988／0.3849／0.3846／0.4507`**
**中位比值 0.3966**；lite 中位比值 0.4782。

判定照裁定的規則：**中位 0.3966 < 0.40**，且全距 **0.3846–0.4507 跨線** ⇒ **未達，不宣告**。
**波動歸到哪**：分子（載重那一邊）很穩，全距 426–446＝±2.4%；**分母（18 draw calls，不是
GPU-bound）全距 989.5–1147.3＝±7.4%**，比值的抖動幾乎全來自分母。而且中位 0.3966 只差 0.0034，
**不是波動把它推過去，它本來就落在 0.40 附近** ⇒ 這條在這台機器上不構成可信的通過依據
（與計畫 §7 Q4 的裁定一致：桌機 uncapped 比值是記錄項，真正的 fps 判定在 iPhone 實機）。

## 6.3 對決基準：不換比較對象，兩個數字都列

照裁定保留凍結檔的 **978**：`988 − 978 ＝ +10`，**超出 ±5 ⇒ 這條字面上是紅的**。
同時列同路徑重量的數字：基準樹 `f9dd83d` 兩跑都是 **986／`passes=10`**，`988 − 986 ＝ +2`。
978 那一跑的 `renderPassesPerFrame` 是 **2**（其餘四跑全是 10），細節見 §3 的 T3-duel 表。

## 6.4 連點守衛：補真實路徑，並突變驗紅

覆審 r2 指出舊治具用 `pickMark` 替身 ⇒ 相位永遠不切換 ⇒ 守衛從頭到尾不武裝、綠燈零鑑別力。
新增的那一段**不裝替身**：盯上頁對同一格 **80ms 內連點兩下**（`MAIN_GUARD_MS` 由頁面讀，治具不寫死）。
```
連點守衛（第二下被吞、過窗後開得出來）✅
  → phaseAfterFirst "bid"（第一下真的宣告了盯上、相位換了）
  → swallowed true（第二下沒開出 #sheet）
  → reopened {open:true}（等過 500ms 再點，開得出來）
```
**突變驗紅**（拿掉 `index.html` 守衛那一行，備份副本還原）：
```
連點守衛 ❌({"guardMs":500,"phaseAfterFirst":"bid","swallowed":false,
             "reopened":{"open":true,"title":"虎姑婆指甲陰氣"},"ok":false})
```
`swallowed:false` ＝ 第二下**真的開出了玩家沒要求的出價視窗**——原始 bug 完整重現。
雙向都驗（只驗「被吞」的話，一個「托盤整個壞掉什麼都不做」的實作也會綠）。
⇒ **守衛從「未驗證」變成「已驗證」**。

## 6.5 T4：新判準的實測，與「只走到第 7 夜」的真正原因

```
$ node tests/tools/legend-drive.mjs /tmp/ld-t4g.json --traymem --tapsonly --memrounds=12 --port=9841
```

**① 釋放有效（判定）**
```
★釋放鑑別力★ 同一批拍品清空再擺回 5 次：geo 502 → 502（+0）　tex 1131 → 1131（+0） → ✅
  起點 502/1131　第1輪 502/1131　第2輪 502/1131　第3輪 502/1131　第4輪 502/1131　第5輪 502/1131
```
**② `?tray3d=0` 對照組（判定）→ ❌，而且這一紅推翻了我先前的歸因，必須講清楚**

前一次對照組**只走到第 1 夜**（治具自己卡住），量到 `16→16／2→2` 於是我寫成「對照組完全不長 ⇒
成長是托盤造成的」。治具修好之後對照組跑到第 7 夜，數字完全不同：

| 走到第 7 夜 | geometries | textures | 托盤上線 |
|---|---|---|---|
| 預設 | 66 → **502**（+436） | 52 → **1131**（+1079） | 4/4 |
| `?tray3d=0` 對照組 | 16 → **441（+425）** | 2 → **841（+839）** | **0/4** |

**桌上一件拍品都沒有，記憶體照樣長。** ⇒ **逐夜的成長主要不是托盤造成的**——
每一夜的**對決**自己就會透過 `duelFigures → makeCreatureFigure` 把 GLB 載進同一個 `glbCache`，
那是 v0.55.7 就有的行為。托盤的**邊際貢獻**是 geo `436 − 425 = +11`、tex `1079 − 839 = +240`
（第 1 夜的起點差 `66−16=50`／`52−2=50` 才是「四件拍品當場載進來」的那一份）。

**所以凍結檔 §2.1 修訂一的第 2 條（「`?tray3d=0` 下兩個數字完全不長」）寫錯了**——
我是根據那個**只跑到第 1 夜的殘缺量測**寫的，而真正的原因（對決自己會載）與本卷無關。
★我沒有再自行改它★：這一條依字面**判紅**，連同上面的數字一起交給製作人裁
（`02 §2.1`：動手後才主張某條無效不自動解凍）。**要注意的是，這個紅燈不指向本卷的任何缺陷。**

**③ 0 error／pageerror** → ✅（兩條路都是 0）

**★「只走到第 7 夜」的真因：治具自己卡住，不是這一局只有 7 夜★**
補上收工理由之後印出來的是：
```
收工理由：**步數跑滿 12000 仍未結束（停在第 7 夜「蓋牌開標」）**　最後停在「蓋牌開標」
```
歸因：`measure` 的條件是「按鈕寫著蓋牌且可按」，**記錄過那一夜之後它恆真**，
而驅動只在 `!measure` 時才點按鈕 ⇒ 那一夜的第一下若沒推動畫面，迴圈就再也不點任何東西、
原地空轉到步數跑滿。**這是治具的 bug，不是產品的**（產品端 `error 0`、畫面停在正常的出價頁）。
修法：`measure` 為真時也照樣點一下主鈕。修完的 12 夜結果見下方表。

**★12 夜跑不滿：試了三輪、同一個停點，停手★**（`03 R4`：三輪沒有新資訊就換路／停手）
① 步數上限 4000→12000 ② 驅動補點 `#modal`（第 8 夜的「壽命危急，繼續供奉？」）
③ `measure` 恆真時也照樣點主鈕 ④ 每 4 圈加 140ms 節流。
四次修完**仍然停在第 8 夜「進入下一夜」**，第三個卡點沒有查出來。
⇒ **12 夜逐夜增量只取得到 7 夜**（記錄項未達標，照實記；T4 的三條判定不依賴它）。
另：最後一跑的預設那一邊出現 **`error 1`**（前兩跑都是 0），錯誤內容被 `grep` 濾掉沒抓到
⇒ 照 `02 §6.2`，這個訊號我**不宣告通過**，記成「未確認」。

## 6.7 修補批之後的 T0–T6 重跑（最終 HEAD）

```
$ node tests/tools/trace-eq.mjs <f9dd83d 的 index.html> index.html      → equal:true            T0 ✅
$ node tests/tools/trace-eq.mjs index.html --mutate                      → differs:true          T0 ✅
$ for f in tests/*.test.mjs; do node "$f"; done                          → 12/12 全綠            T6 ✅
$ node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --port=9861
  #felt／#west／#east／#north 各 12 格　最大溢出 0　非 0 的格數 0                                  T1 ✅
$ node tests/tools/legend-drive.mjs /tmp/ld-final.json --taps --trayslots --tapsonly --tapbase=… --port=9862
  T5 觸控命中 177／177（基準 177）　引數對不上 0　trayTap 0 次                                     T2 ✅
  T2 托盤槽位 出價 4/4　盯上 4/4　空白 3/3　GLB 檔名 4/4　hover 雙向 ✅　#sheet 後收 hover ✅
    連點守衛 ✅　error 0                                                                            T2 ✅
  console error 0、pageerror 0、requestfailed 0　判定：✅ 通過
$ node tests/tools/traitfx-drive.mjs /tmp/tfx-final.json --tier=2 --port=9871   → 30/30 pass      T6 ✅
$ node tests/tools/duel-perf.mjs perf /tmp/dp-final.json --port=9872 --uncap
  drawCallsPerFrame 988　trianglesPerFrame 355472　renderPassesPerFrame 10　errors 0            見 §6.3
```

---

# §7 第二批修補（2026-09-13，製作人裁定「門檻不動、改實作」）

## 7.1 T3 三角形：描邊外殼改成「只掛 hover 那一件」→ **綠**

**實作**：`js/table-tray.js` 的 `applyOutline(s)`——只有 `s.i === hover` 且非 `lite` 時才把那一尊的
外殼 `visible` 打開；`setHover` 時舊格卸、新格掛。**只切 `visible`**：幾何與材質留著
（記憶體不變），three 對不可見物件直接跳過，draw call 與三角形都不算；掛回來是同一顆 mesh，
不重建、不重編 shader。

**★配套：`RIM_BASE` 1.3 → 2.9（`RIM_HOVER` 2.4 → 4.2）——這不是調亮，是補回可辨性★**
只拿掉外殼的第一版（`r7-n1.png`）**桌上四尊全部消失**。它們其實都在場——
`items()` 回 `visible:true`、budget 表顯示「托盤拍品本體 17972」個三角形**有在畫**——
但紙紮本體在暗紅布上只吃得到四盞燈籠的一點光，**先前「看得見」靠的全是那圈描邊外殼**。
邊光是**本體材質上的 fresnel 項**（`creature-figures.js` 的 `TAIL`，不是外殼），
拉它 **0 draw call、0 三角形**。`r8-n1.png`：四尊回來了，而且**讀起來比原本好**
——不再是霓虹線框，看得出是紙紮本體（送王船的船板、虎姑婆的爪、浮標的形）。

**★量法也跟著改★**：描邊只掛一件之後「預設」有兩個狀態，治具兩個都量，而且
**四格逐一 hover、取三角形最多的那一格**——外殼數是逐尊不同的（實測 7～18 顆），
只 hover 槽 0 量到的是**最省**的那一格，那不是最壞情況。

```
$ node tests/tools/scene-shot.mjs /tmp/t3d-f5 --perf --runs=5 --port=9891   # 獨佔機器、uncapped
```
| 變體 | draw calls／幀 | 三角形／幀 | passes／幀 | renders/s 中位 |
|---|---:|---:|---:|---:|
| `?tray3d=0`（分母） | 18 | 1707 | 1 | 1061.1 |
| 預設・無 hover | **68** | **19679** | **1** | 535.3 |
| **預設・最壞 hover（槽 1，13 顆外殼）** | **81** ✅≤135 | **25403** ✅≤33000 | **1** ✅ | 498.5 |
| `?table3d=lite` | 68 | 19679 | 1 | 542.3 |

**三角形 34722 → 25403（−9319），閘門缺口 1722 → 過關 7597。draw calls 113 → 81。**

**五次比值（逐次配對，分子÷同一 run 的分母）**
| | 5 次 | 中位 | 全距 |
|---|---|---:|---|
| 預設・無 hover | 0.6222／0.6322／0.4775／0.5042／0.4803 | **0.5045** | 0.4775–0.6322 |
| **預設・最壞 hover** | 0.5580／0.5735／0.4430／0.4662／0.4616 | **0.4698** | **0.4430–0.5735** |
| `?table3d=lite` | 0.5972／0.6521／0.4838／0.5117／0.4839 | 0.5111 | 0.4838–0.6521 |

**中位 ≥0.40 且全距不跨線**（最低的一次是 0.4430）⇒ 照裁定的規則 **T3 比值這一條通過**。

**視覺代價（照實記，交製作人裁）**：非 hover 的三件**沒有陣營描邊色**了，陣營辨識在牌桌上
改由卡片的系別 chip 與邊光色承擔。另一個已知限制：**觸控裝置沒有 hover**——
手機上 `pointermove` 只在手指按著時發，所以實務上手機玩家看不到那圈描邊。
**★已於 §7.4 補上★**（製作人裁定的合併前小補）：`trayTap` 命中當下先 `setHover(i)`，
`#sheet` 開著期間保持，`closeSheet()` 收回。

## 7.2 T4：對照組改成「托盤邊際貢獻」→ **三條判定全過**

凍結檔補了 **§2.1 修訂一之二**（原條件錯在哪、為什麼對照組的原寫法量不到托盤、為什麼新寫法
不是搬淺判準）。

```
$ node tests/tools/legend-drive.mjs /tmp/ld-t4z.json --traymem --tapsonly --memrounds=12 --port=9892
- **T4**（預設）…error 0…geometries 66 → 502（+436）　textures 52 → 1131（+1079）　19 顆不同 GLB
    ★釋放鑑別力★ 同一批拍品清空再擺回 5 次：geo 517 → 517（+0）　tex 1194 → 1194（+0） → ✅
- **T4**（?tray3d=0）…error 0…geometries 16 → 441（+425）　textures 2 → 841（+839）
- **T4 托盤邊際貢獻**（預設 − 對照，兩條路都走到第 7 夜）：
    geometries 436 − 425 ＝ **+11**　textures 1079 − 839 ＝ **+240**
    每件 GLB 的資產數（第 1 夜 offset 50/50 ÷ 4 件）＝ **12.5 geometries／12.5 textures**
    上限＝夜數 7 × 4 件 × 每件 ＝ **350 geometries／350 textures** → ✅ 在上限內
```
① 釋放 5 輪 +0/+0 **✅（主判準）** ② 托盤邊際貢獻在上限內 **✅** ③ 0 error（兩條路都是 0）**✅**
**12 夜記錄項：只取得到 7 夜（卡第 8 夜「進入下一夜」），照裁定不再修治具，記未確認。**

## 7.3 其餘閘門重跑（最終 HEAD）

```
$ node tests/tools/trace-eq.mjs <f9dd83d 的 index.html> index.html   → equal:true               T0 ✅
$ node tests/tools/trace-eq.mjs index.html --mutate                   → differs:true             T0 ✅
$ for f in tests/*.test.mjs; do node "$f"; done                       → 12/12 全綠               T6 ✅
$ node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --port=9901
  #felt／#west／#east／#north 各 12 格　最大溢出 0　非 0 的格數 0                                 T1 ✅
$ node tests/tools/legend-drive.mjs /tmp/ld-f2.json --taps --trayslots --tapsonly --tapbase=… --port=9902
  T5 觸控命中 177／177（基準 177）　引數對不上 0　trayTap 0 次                                    T2 ✅
  T2 托盤槽位 出價 4/4　盯上 4/4　空白 3/3　GLB 檔名 4/4　hover 雙向 ✅　#sheet 後收 hover ✅
    連點守衛 ✅　error 0　　console/pageerror/requestfailed 各 0　判定：✅ 通過                   T2 ✅
$ node tests/tools/traitfx-drive.mjs /tmp/tfx-f2.json --tier=2 --port=9903  → 30/30 pass         T6 ✅
$ node tests/tools/duel-perf.mjs perf /tmp/dp-f2.json --port=9904 --uncap
  drawCallsPerFrame 988　trianglesPerFrame 355472　renderPassesPerFrame 10　errors 0         見 §6.3
$ node tests/tools/layout-shot.mjs …/r8 --tray --port=9885           → console error 0          T5 ✅
$ node tests/tools/duel-perf.mjs buoy …/g2-duel.json --port=9905      → errors 0                T5 ✅
```
**T5 交件圖（最終版）**：`r8-n1.png`（出價頁，四尊讀得出紙紮本體）／`r8-trayhover.png`
（盯上頁 hover 中，掛描邊那一件浮起）／`r8-traycurse.png`（詛咒品在托盤）／`g2-duel.png`（對決頁沒擋到人偶）。
`r7-n1.png` 留著當**反例**（只拿掉外殼、沒補邊光 ⇒ 四尊全部消失）。

## 7.4 觸控點亮（2026-09-13 裁定的合併前小補）

**問題**：觸控裝置**沒有 hover**——`pointermove` 只在手指**按著**時發，所以手機玩家從來不會經過
`trayHover` ⇒ 描邊（改成只掛 hover 那一件之後）與鏡頭微推在手機上永遠看不到。

**改法**（`index.html`）：
1. `trayTap` 命中當下先 `tray.setHover(i)`，再派 `openSheet`／`pickMark`——按下去的那一刻就點亮。
2. `trayLeave()` 加一條例外：**`#sheet` 開著就不收**。★這條一定要寫在 `trayLeave` 裡而不是各呼叫點★——
   觸控的 `pointerup` 因為**隱式指標捕捉**（觸控有、滑鼠沒有）會送回 `#tray`，不擋的話手指點亮的
   那一格會在**抬手的同一瞬間**滅掉。
3. `closeSheet()` 呼叫 `trayLeave()` 收回去。那是 `#sheet` 的**唯一關閉點**，所以確定鈕、背景、
   日後新增的關閉入口全部涵蓋；它呼叫時 `display` 已經是 `none`，不受第 2 點的例外影響。

**治具新增第八項**（`runTraySlots`），三個時點缺一不可：
```
觸控 tap 點亮→開著保持→關後收 ✅
  → tap 後 #sheet 開著時 hover === 2（**不是 −1**）、trayK > 0（鏡頭微推跟上了）
  → closeSheet() 之後 hover === −1、trayK === 0
```
**突變驗紅**（拿掉 `trayTap` 裡那一行 `setHover(i)`，備份副本還原）：
```
觸控 tap 點亮→開著保持→關後收 ❌({"slot":2,"held":{"sheetOpen":true,"hover":-1,"trayK":0,
                                  "outlines":[0,0,0,0]},"after":{"hover":-1,"trayK":0},"ok":false})
```
`hover:-1`、`outlines` 全 0 ⇒ 正是「手機看不到描邊」那個症狀，這一條抓得到。

**重跑確認沒退**
```
$ node tests/tools/legend-drive.mjs /tmp/ld-f3.json --taps --trayslots --tapsonly --tapbase=… --port=9915
  T5 觸控命中 177／177（基準 177）　引數對不上 0　trayTap 0 次 → ✅
  T2 托盤槽位 出價 4/4　盯上 4/4　空白 3/3　GLB 檔名 4/4　hover 雙向 ✅　#sheet 後收 hover ✅
    **連點守衛 ✅**　**觸控 tap 點亮→開著保持→關後收 ✅**　error 0 → ✅
  console error 0、pageerror 0、requestfailed 0　判定：✅ 通過
$ node tests/tools/scene-shot.mjs /tmp/t3d-t --perf --runs=1 --port=9913
  預設 無hover 68 calls／19679 tris｜**最壞 hover 槽 1：81 calls／25403 tris**（outlines [0,13,0,0]）
  ⇒ 與 §7.1 的 5 次量測**同一格、逐值相同**，沒有變動
$ node tests/tools/trace-eq.mjs <f9dd83d 的 index.html> index.html   → equal:true          T0 ✅
$ node tests/tools/trace-eq.mjs index.html --mutate                   → differs:true        T0 ✅
$ for f in tests/*.test.mjs; do node "$f"; done                       → 12/12 全綠          T6 ✅
$ node tests/tools/felt-probe.mjs … --port=9914  → 四容器各 12 格全 0                      T1 ✅
$ node tests/tools/traitfx-drive.mjs /tmp/tfx-f3.json --tier=2 --port=9916 → 30/30 pass     T6 ✅
```

## 7.5 iPhone `?fps=1` 三張：記待辦（使用者側）

同機同頁（盯上頁）三張：`?fps=1&table3d=0`（分母，09-10 已回填 55–58）／`?fps=1`／`?fps=1&table3d=lite`。
**沒有這三張，0.56b 依 Q4 的裁定不得宣告完成**（計畫 §7 Q4 的代價那一句）。
