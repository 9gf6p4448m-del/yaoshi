# 驗收凍結：拍賣桌 3D 實體化第一段 v0.56b（2026-09-13）

> 卷別：ROADMAP_V2 §6.2／§7 Top 1 步驟 2、3 的**第一段**——桌心紅布托盤把當夜拍品的 3D 模型擺上桌、
> Raycaster 點檢視、桌面木紋與桌角香灰符咒。籌碼／血玉令牌／席位信物是**第二段，本卷不做**。
> 規格權威：`docs/proposals/2026-09-10-plan-table3d.md`（§1 標 0.55b 的列、§2 介面、§3 不做什麼、§4 ④、§6／§7）；
> 使用者裁定：`docs/experiments/2026-09-10-acceptance-table3d.md` 檔頭（Q1 甲／Q2 甲＋丙／Q3 丙／Q4 甲／Q5–Q9）；
> 美術守則：`docs/design/ART_BIBLE.md`（無貼圖、紙紮／老廟神案質感；Q7 甲＝木紋／香灰用頂點色＋幾何）。
> **基準＝`main` `f9dd83d`（v0.55.7）**，本檔訂於該 SHA、repo 一個位元組未動時。
> 訂下即凍結（`02 §2.1`）。要改只有「原標準錯在哪、為什麼現在才知道」＋使用者針對那一條的明確同意一條路。
> **沒帶基準的一律不算通過。**

## 範圍（做什麼）

1. `js/table-tray.js`（新檔）：`createTableTray(scene, camera, opts)` → `tray.{group,setItems,hitTest,setHover,update,slotScreen}`；
   `TRAY` 常數表照計畫 §2.4 起值；紅布托盤（`CLOTH`，頂點色，布緣翹曲＝紙紮語法）；4 槽位；
   模型走 `creature-figures` 同一套 GLB 載入與釋放（`key = it.ab || it.m`）；詛咒品身上冒紫黑陰火
   （不越 bloom 門檻 0.7）；hover 浮空微旋（`HOVER_SPIN`／`HOVER_LIFT`）＋自發光邊光；
   描邊外殼可由 `?table3d=lite` 關。
2. `index.html`：`#tray` 透明命中層接 `trayTap`／`trayHover`（NDC → `tray.hitTest` → `openSheet(i)`／`pickMark(i)`）；
   `showMarket`／盯上頁進入時派 `fx3d("ys:market",{items,round})`（不耗亂數、不讀寫賽局欄位）；
   `?tray3d=0` kill switch；拍賣頁鏡頭對托盤微推、對決頁還原。
3. `js/scene-env.js`：桌面**木紋**（頂點色深淺條紋＋幾何刻痕，不貼圖）、桌角**香灰**幾撮與**符咒殘卷**兩三張。
4. `js/renderer.js`：建立 tray、每幀 `update(dt)`、`__yaoshi3d.tray` 出口。
5. 直式版面：本卷**不做**托盤（維持 0.56a 直式），`#tray` 在直式不存在意義。

不做：籌碼／血玉令牌／席位信物（第二段）；不改事件模型；不做拖曳／捏合；不開陰影；不動引擎；
不動策略數值（硬規則 3）；不改 `#sheet`／`#modal`／`#duel` 疊層；不修 ART_BIBLE；`VERSION` 不動。

---

## 閘門 T0–T6（動手前訂定，數字不得動）

### T0 引擎零變動
```
node tests/tools/trace-eq.mjs <f9dd83d 的 index.html> index.html     → equal:true、exit 0
node tests/tools/trace-eq.mjs index.html --mutate                     → differs:true、exit 0
```
*假綠*：只比 seed 1；砍 `trace()` 欄位再比；跳過 `--mutate` 那半邊（相等性斷言本身沒有證明力，`02 §6.1` 第 1 條）。

### T1 版面不退
```
node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --json=<out>
```
`#felt`／`#west`／`#east`／`#north` 四個容器各 **12 格全 0**（2 seeds × 3 夜 × 出價／盯上兩頁）。
＝0.56a 基準同值（0.56a 已把四個容器收到恆 0）。
*假綠*：對 `.rail` 或 `#tray` 加 `overflow:hidden` 把內容切掉——配套人眼在 T5 的截圖上看四張側欄卡完整。

### T2 tap 命中回歸（逐一 tap，不是數數量）
```
node tests/tools/legend-drive.mjs <out> --taps --tapsonly --tapbase=<f9dd83d 的 tapout json>
```
- 逐一 tap **177／177 命中**（N＝基準 `f9dd83d` 實測 clickableCount＝**177**，2026-09-13 量，
  `--tapout` 落檔；另有停用 6 個、隱藏 24 個不計），基準清單漏掉 0 個、沒命中 0 個，引數對不上 0 個。
- `0 console error／pageerror／requestfailed`。
- **新增（本卷）**：`#tray` 上點 4 個槽位（治具用 `tray.slotScreen(i)` 取螢幕座標點下去），
  各開對應的 `openSheet(i)`／`pickMark(i)`，且**開出來的 `#sheet` 標題就是該槽那一件法寶**
  （逐槽對照 `S.market[i]` 的名稱，不是只驗「有沒有被呼叫」）。四槽全對才算過。
- tap 落在既有可點元素（`.mcard`／`#skipbtn`／`#helpBtn`／`#south` 任何鈕）上時 `trayTap` 呼叫次數 **= 0**。
*假綠*：只數 `[onclick]` 的元素數量；四槽全部誤判成槽 0；只驗「被呼叫」不驗 sheet 標題。

### T3 效能（每幀值；`scene-shot --gate --perf` 牌桌機位，844×390 dpr=2、uncapped）
**全部換算成每幀值**（`info.autoReset=false; info.reset();` 之後等**兩次** rAF ⇒ 讀到的是兩幀的和，**除以 2**）。
- 預設（描邊開）：`draw calls` ≤ **135**、`triangles` ≤ **33000**、render `passes/frame` ＝ **1**
- `renders/s` 比值（預設 ÷ `?tray3d=0`，同一頁交錯各 5 次取中位）≥ **0.40**
- `?table3d=lite`：draw calls **明顯下降**（記數字，與預設同表對照）
- 對決頁 draw call 與基準 `f9dd83d` **持平（±5）**：基準值由 `duel-perf perf --uncap` 於 2026-09-13
  在 `f9dd83d` 量得（**基準 `drawCallsPerFrame` = 978**，`renderPassesPerFrame` = 2、`visible/total` = 16/16、
  `rafMedianFps` = 112.4；該欄位是兩幀和 ⇒ 每幀 489）。判定用 `drawCallsPerFrame`，容差 ±5。
*假綠*：量到 bloom 合成那一趟的 1 個 call（沒有 `autoReset=false; reset();`）；**忘了除以 2**；
在 `?tray3d=0` 下量預設值；把模型 `visible=false` 之後才量
（`makeCreatureFigure` 的 `group.visible` 預設 **false**，`creature-figures.js:567`）。

### T4 GLB 載入釋放（**2026-09-13 §2.1 修訂一**，見檔尾修訂紀錄）
1. **釋放有效（判定）**：同一批拍品 `setItems([])` 再 `setItems(同一批)` **連續 5 輪**，
   `renderer.info.memory.geometries` 與 `textures` **逐輪逐值不變（+0／+0）**。
2. **托盤邊際貢獻（判定；2026-09-13 §2.1 修訂一之二改寫）**：
   `（預設的 geo／tex 增量）−（?tray3d=0 的 geo／tex 增量）` ≤ **夜數 × 當夜拍品數 × 每件 GLB 的資產數**。
   「每件 GLB 的資產數」由第 1 夜兩條路的 offset 推得（`(預設第 1 夜 − 對照第 1 夜) ÷ 該夜非詛咒件數`），
   實測值寫進報告。
3. **12 夜實際增量（記錄項，不判）**：跑滿 12 夜，逐夜印出 `geometries／textures` 與該夜四格掛了什麼，
   並印出整局走過幾顆**不同**的 GLB。
4. **0 error／pageerror**（判定）。
*假綠*：只量第 1 夜；只量 `geometries` 不量 `textures`；把托盤關掉之後才量第 1 點
（第 2 點才是關掉之後要量的）；第 1 點用「空清單」餵回去（空槽會被當成詛咒占位物而長出新幾何，
量到的不是同一批拍品的釋放）。

### T5 視覺交付
橫式 844×390 截圖 **3 張**（① 出價頁 ② 盯上頁 hover 中 ③ 詛咒品在托盤）＋**對決頁一張**證明托盤沒擋到人偶；
`threejs-visual-loop` 自評**兩輪**（截圖存檔後用 Read 實際打開看，逐條對畫質清單）；製作人看圖簽字。
*假綠*：只交好看的那一張；只看檔案存在不打開看。

### T6 範圍
`git diff --stat <f9dd83d>..` 只准：
`js/table-tray.js`（新）、`index.html`（DOM／CSS／派發／tap；**`VERSION` 不動**）、`js/scene-env.js`、
`js/renderer.js`、`js/camera-director.js`（若動）、`tests/tools/*`（治具）、`docs/*`（文件）。
`js/trait-fx*`／`js/duel-figures.js`／`js/creature-figures.js`／引擎（`index.html` 的規則碼）**零 diff**。
另：**12 套規則測試全綠**；`traitfx-drive` t2 **30/30 不退**（3D 層改動不得影響對決）。

---

## §2.1 修訂紀錄

### 修訂一（2026-09-13，**製作人明確同意**）：T4 的判準改寫

**原條件錯在哪**：原文寫「`renderer.info.memory.geometries／textures` 開局末 vs 第 1 夜末
**差 ≤ 拍品數**」。這條在本卷的規格下**恆假**——`creature-figures.js:123` 的 `glbCache` 是一個
**永不淘汰**的 `Map`，而計畫 `2026-09-10-plan-table3d.md` §6 Q4 末段白紙黑字寫「0.55b 只記錄
`info.memory`，不做 LRU」。12 夜會走過十幾顆不同的 GLB，每顆進快取就是幾十個 geometry／texture，
**無論實作對錯都不可能 ≤ 48**。

**為什麼現在才知道**：訂這條的時候我只知道「快取不淘汰」這個事實，沒有把它換算成數量級；
實跑之後才看到 7 夜就是 `geo 66→502／tex 52→1131`（19 顆不同 GLB），與 48 差了一個數量級。

**判準是不是被搬淺**（`02 §2.1` 的自問「這個修正會不會讓一份壞掉的實作變成通過」）：**不會**。
新的第 1 點（同一批拍品清空再擺回 5 輪、記憶體必須逐值不變）**比原條件更能分辨好壞**——
原條件混著「新 GLB 進快取」與「舊實例沒放掉」兩件事，分不開；新條件把快取這個變因固定住
（那幾顆 GLB 已經在快取裡），量到的純粹是「換格時實例有沒有被放掉」。
實測：健康版 +0／+0（兩次獨立跑），而把 `clearSlot` 的釋放拔掉就會漲。
第 2 點（`?tray3d=0` 對照組）是 `02 §6.1` 第 1 條的反面（健康狀態下這個證據會不會變綠）。
原本那個「12 夜」不是丟掉，而是降成**記錄項**（第 3 點）。

**依據**：製作人 2026-09-13 針對這一條的明確同意（原話：「T4：『12 夜記憶體不累積』在 `glbCache`
不淘汰的設計下恆假，屬 `02 §2.1` 例外……改成『同一批拍品清空再擺回 5 次 +0/+0，且 `?tray3d=0`
對照組不長』為 T4 判準」）。**T0–T3、T5、T6 一格未動。**

### 修訂一之二（2026-09-13 同日稍晚，**製作人明確同意**）：第 2 條「對照組不長」改成「托盤邊際貢獻」

**★為什麼對照組的原寫法量不到托盤★**：我寫「`?tray3d=0` 下兩個數字完全不長」時，手上的對照組
**只走到第 1 夜**（治具自己卡住，見報告 §6.5），那一格當然是 `16→16／2→2`。治具修好、對照組
跑到第 7 夜之後，數字是 `geo 16→441（+425）／tex 2→841（+839）`——**桌上一件拍品都沒有
（上線 0/4），記憶體照樣長**。原因與本卷無關：**每一夜的對決**自己就會透過
`duelFigures → makeCreatureFigure` 把 GLB 載進同一個 `glbCache`（`js/creature-figures.js:123`），
那是 v0.55.7 就有的行為。

⇒ 「對照組完全不長」這句話**量的不是托盤**，它量的是「這個遊戲跑一局會不會載新模型」，
而答案本來就是會。要把托盤那一份分離出來，只能**相減**。

**判準是不是被搬淺**：**不會，反而更準**。原寫法在托盤完全不載任何東西時也會紅（被對決的成長蓋過），
在托盤大量漏水時也可能綠（只要對決的成長更大）——它對托盤本身**零鑑別力**。
新寫法（預設 − 對照）直接量托盤那一份，並用「每件 GLB 的資產數」給出可算的上限。
主判準（第 1 點：同一批拍品清空再擺回 5 輪、記憶體逐值不變）**一格未動**，它才是釋放路徑的守門員。

**依據**：製作人 2026-09-13 的裁定原話：「T4 對照組：你的實測推翻了原假設（對決自己載 GLB 進
`glbCache`），對照改成『托盤邊際貢獻』＝預設 − `?tray3d=0` 的 geo／tex 增量 ≤ 當夜拍品數 ×
每件資產數（寫出每件 GLB 的 geo／tex 數當上限依據）……釋放 5 輪 +0/+0 維持主判準。」
