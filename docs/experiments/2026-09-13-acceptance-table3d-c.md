# 驗收凍結：拍賣桌 3D 實體化**第二段** v0.56b（2026-09-13）

> 卷別：ROADMAP_V2 §6.2「競標操作實體化手感」＋§2.3 第 5 點（角色桌面實體信物）——
> 第一段（桌心紅布托盤、Raycaster、木紋香灰）已於 `0771e04` 上線，本卷做**第二段**：
> 壽命銅錢籌碼／血玉令牌／十席信物／直式托盤縮小版。
> 規格權威：`docs/proposals/2026-09-10-plan-table3d.md`（§2 介面、§3 不做、§4 閘門）；
> 前段凍結與報告：`docs/experiments/2026-09-13-acceptance-table3d-b.md`、`2026-09-13-table3d-b-report.md`。
> 美術守則：`docs/design/ART_BIBLE.md`（無貼圖、紙紮語法）。
> **基準＝本 worktree 的 `0771e04`（main 最新，v0.56b 含上桌卷第一段）**，本檔訂於該 SHA、repo 一個位元組未動時
> （`git status --porcelain` 只有本檔尚未建立）。
> 訂下即凍結（`02 §2.1`）。要改只有「原標準錯在哪、為什麼現在才知道」＋製作人針對那一條的明確同意一條路。
> **沒帶基準的一律不算通過。**

## 範圍（做什麼；製作人 09-13 拷問八題全「照建議」）

1. **壽命銅錢籌碼**：方孔銅錢（程序化幾何＋頂點色，**≤300 三角形／枚**）。玩家送出出價時，
   從**自己席位**推出 N 枚（幾命推幾枚，**上限 8 枚，超過改成一串**）到桌心對應托盤前；
   開標後依結果收回或留在桌上。**純演出**：不讀寫賽局欄位、不耗玩法亂數，
   由 `fx3d("ys:bid",{slot,amount,seat})` 派發；AI 出價在開標時一次推出。
2. **血玉令牌**：盯上時一枚刻「盯」的血玉令牌（程序化：圓角方牌＋陽刻字，暗紅玉色）
   從自己席位重重拍在目標托盤前，**落地震動＋木撞擊音**（`sfx` 現有合成器加一聲，走既有 sfx 路徑），
   留到開標；`fx3d("ys:mark",{slot,seat})`。
3. **十席信物**：十角色各一件常駐席角紙紮小物（收驚婆白米香爐／當鋪算盤＋當票／組頭字花明牌／
   青面白骨骰子／紅衣婆婆紅繡鞋／斷手書生斷筆／獵人獸夾／孝女白琴白幡／閭山法師法印／普渡爐主香爐
   ——名稱以 `ROLES` 為準，語意自定但要寫進報告）；程序化幾何＋頂點色，**每件 ≤300 三角形**；
   依 `renderSeats` 的四席位置擺在桌角。
4. **直式**：托盤縮小版（槽距與縮放走 `TRAY` 常數的**直式分支**），籌碼／令牌／信物同樣可見；
   `?tray3d=0` 全關。

不做：改事件模型；拖曳／捏合；開陰影；動引擎；動策略數值（硬規則 3）；改 `#sheet`／`#modal`／`#duel` 疊層；
修 ART_BIBLE；`VERSION` 不動。

---

## 閘門 U0–U6（動手前訂定，數字不得動）

### U0 引擎零變動
```
node tests/tools/trace-eq.mjs <0771e04 的 index.html> index.html   → equal:true、exit 0
node tests/tools/trace-eq.mjs index.html --mutate                   → differs:true、exit 0
```
另：**新派發點 grep `S.rng`／賽局欄位寫入為零**（`ys:bid`／`ys:mark`／`seats` 三處派發碼逐行貼進報告）。
*假綠*：只比 seed 1；跳過 `--mutate` 那半邊。

### U1 版面
```
node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north …
```
`#felt`／`#west`／`#east`／`#north` 四容器**橫直式溢出 0**。
另：**直式 tap 回歸（現有 `legend-drive --taps` 直式模式）N/N**。

### U2 tap 回歸
- 橫式逐一 tap **177／177**（基準 `0771e04` 實測 clickableCount＝177）。
- 第一段托盤**八項不退**（出價 4/4・盯上 4/4・空白 3/3・GLB 檔名 4/4・hover 雙向・`#sheet` 後收 hover・
  連點守衛・觸控點亮）。
- **籌碼／令牌不攔截任何點擊**（`pointer-events` 或 hitTest 排除）。
- **連點守衛不退**。

### U3 效能（每幀值；`scene-shot --gate --perf` 牌桌機位，844×390 dpr=2、uncapped）
**最壞情境＝4 托盤 hover ＋ 8 枚籌碼×4 席 ＋ 4 令牌 ＋ 10 信物中在場 4 件**：
- `draw calls` ≤ **135**、`triangles` ≤ **33000**、render `passes/frame` ＝ **1**
- `renders/s` 比值（最壞情境 ÷ `?tray3d=0`）**5 次中位 ≥ 0.40 且全距不跨線**
- 對決頁 draw call 對基準**同路徑** Δ ≤ **+5**

### U4 記憶體
籌碼／令牌**每夜生成釋放 5 輪 +0／+0**（`renderer.info.memory.geometries` 與 `textures` 逐輪逐值不變）。

### U5 視覺交付
出價推籌碼 **GIF**、盯上拍令牌 **GIF**、四席信物截圖（**橫直式各一**）、詛咒品托盤前令牌；
`threejs-visual-loop` **兩輪**（截圖存檔後用 Read 實際打開看，逐條對畫質清單）。

### U6 範圍
`git diff --stat <0771e04>..` 只准：
`js/table-tray.js`、**新檔 `js/table-props.js`**（籌碼／令牌／信物幾何）、
`index.html`（派發、CSS、直式常數；**`VERSION` 不動**）、`js/scene-env.js`、`js/renderer.js`、
`js/camera-director.js`、**`assets/audio/sfx.js` 的合成器那一段**、`tests/tools/*`（治具）、`docs/*`（文件）。
`js/trait-fx*`／`js/duel-figures.js`／`js/creature-figures.js`／引擎（`index.html` 的規則碼）**零 diff**。
另：**12 套規則測試全綠**；`traitfx-drive` t2 **30/30 不退**。

---

## §2.1 修訂紀錄

（尚無。任何修訂一律先寫「原標準錯在哪、為什麼現在才知道」，再取得製作人針對那一條的明確同意。）
