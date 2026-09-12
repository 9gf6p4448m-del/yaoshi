# 驗收凍結檔 — 傳說三尊「請神存在感」卷（2026-09-13）

> **基準 commit**：`48d821f`（main，v0.55.3）。本檔在動手前落檔，門檻一經寫下即凍結（`02 §2.1`）。
> 要改任何一條：先寫明「原標準錯在哪、為什麼現在才知道」，再取得使用者針對該條的明確同意。
> 派工書原文＝主對話 2026-09-13 的任務書（甲 1–4／乙 5–7）。

## 0. 問題與裁定（不是本檔要驗的，寫下來當動機）

製作人回饋：請神下來的三尊（殘日 `canri`／大士爺紙尊 `dashiye`／有應公 `youyinggong`）
在夜戰場上跟一般妖怪相比不明顯、甚至被前排擋住。事實（改前）：

| 事實 | 出處 |
|---|---|
| 體型倍率與一般妖共用（`elite 1.15`／`ward 0.86`／`haunt 0.82`），沒有傳說格 | `js/duel-figures.js:64` |
| 排陣只認「小前大後」（`order` 依 `bodyScale` 升冪），殘日是 elite 反而排到後排 | `js/duel-figures.js:709-711` |
| 矮模型不放大（`NORM` 只縮不放）：`dashiye` 0.944／`youyinggong` 0.802 世界單位 | `js/creature-figures.js:94,577`；`docs/experiments/2026-09-07-legend-art-evidence/v4-bounds-legend.json` |
| `haunt` 不落影（`f.shadow.visible = !haunt`），有應公腳下沒有影子 | `js/duel-figures.js:900` |
| 沒有常駐光效、沒有名牌 | grep 全檔無 |

裁定＝甲（站位／基座／尺寸）＋乙（常駐訊號）。

## 1. 動手前就定死的實作決定（事後不得當成「調參」改掉方向）

1. **傳說列**：`n >= 3` 時，第 1 排（`rowOf === 1`，＝前排後面那一排）**整排只放傳說**，
   其餘尊照原本「小前大後」規則填滿其他排。同方兩尊以上時並排（該排 `m = 傳說數`）。
   傳說列**不套 `brickShift`**（那會把它推離中軸）。`rows < 2`（`n === 3` 的一排制）時退回原排法。
2. **尺寸**：`FIG.bodyScale` 新增一格 `legend: 1.35`；判定鍵改成 `u.lg ? 'legend' : u.body`
   （`footBase()` 與主迴圈的 `bs` 同一個 helper，不得各寫一套）。
3. **原生放大**：`js/creature-figures.js` 的 `NORM` 只縮不放那條，只對傳說開一個
   `opts.normUp`（`norm = NORM.maxH / rawH`，上放到 1.2）。**只有 `makeFigure` 在 `u.lg` 時才傳**。
4. **基座高度起點 0.30 世界單位**（`FIG.legendLift`）。派工書明文「實測後定」⇒
   允許在 **0.25–0.45** 區間內依 G1 實測調整並記錄改前／改後數字；
   **G1／G2 的門檻本身（<=10%、頭部 0%、不出框）一格不動**。
5. **有應公**：傳說一律實體——`hauntOpacity` 不套、`shadow.visible` 開、`hauntFloat` 不套
   （站在骨堆基座上，不再離地飄）。
6. **名牌**：3D sprite（不是 DOM），掛在頭頂、billboard、Canvas 貼圖。
   ★明文偏離派工書「尊名兩字」★：`LEGENDS` 新增 `sn` 欄位＝**殘日／大士爺／有應公**（2–3 字）。
   理由：「大士」「有應」在中文裡是不完整詞，砍成兩字會直接傷 G3 的辨識；「兩字」讀成尺寸指引。
   **這一條要使用者簽字**；未簽字前 G3 的結果照實標「用的是 2–3 字版」。
7. **常駐光效**（各尊 draw call <= +3，材質走 `MeshBasicMaterial` + `NormalBlending` +
   `toneMapped:false`（＝`trait-fx.js:160 MAT_SOLID` 的同一組語法），顏色線性值一律 **< 0.70**
   ＝ `js/renderer.js:34 BLOOM.threshold`，不越 bloom 門檻）：
   殘日＝腳下餘暉盤（暗紅→土金、緩慢呼吸）／大士爺＝身後香火柱（細長、頂端微光）／
   有應公＝繞身鬼火群（InstancedMesh 3–5 顆冷屍白青）。
8. **請神進場機位**：`camera-director` 新增 `ys:legend-enter` 事件 → 沿用 `CINEMA`
   （`dist 2.9`／`tilt 8`／1400ms）。**一場只放一次**（該尊首次進場的那一夜），之後不再切。

## 2. 閘門（門檻凍結）

### G0 等價（賽局零位移）
`node tests/tools/trace-eq.mjs <48d821f 的 index.html> index.html` → `equal: true`（seeds 1..20 逐位元組）。
另跑 `--beats` 模式（拍序列）與 `--mutate`（證明這支抓得到差異）。
**什麼實作會讓它紅**：把 `lg` 旗標加進 `buildArmy` 的 teams、或動到任何進 `trace()` 的欄位。

### G1 遮擋量測（主閘門）
新治具 `tests/tools/legend-presence.mjs`。

- **場景**：滿編 8v8，其中一側含 1 尊傳說（三尊各跑一場，`--legend=canri|dashiye|youyinggong`），
  種子固定 `seed=7`，視口 **844×390、deviceScaleFactor 2**（＝1688×780 實際像素）。
- **量法（逐尊渲染 mask 相減）**：
  1. 把目標傳說整棵子樹（含描邊外殼）的材質換成一顆平塗標記色
     `MeshBasicMaterial(0x990099, toneMapped:false, fog:false)`（線性 0.6 < bloom 0.70，不會溢光），原材質留著待還原。
  2. **pass A**：只有這一尊可見（其餘尊 `group.visible=false`）→ 截圖，
     取「與標記色距離 <= TOL」的像素集合 = `full`（未被遮擋時的完整剪影）。
  3. **pass B**：全部可見（這一尊仍是標記色）→ 截圖，同法取得 `vis`。
  4. `occl = 1 − |vis| / |full|`。`TOL`＝每通道 ±24/255（凍結）。
- **頭部**：`full` 的螢幕包圍盒上緣起算 **25%** 高度那一條帶內，同法算 `occlHead`。
- **取樣**：每尊 **>=3 幀**（對決開場站定後，間隔 400ms 各取一組 A/B）。
- **判定（凍結）**：改後**每尊、每一幀** `occl <= 0.10` 且 `occlHead == 0`（`|vis∩head| == |full∩head|`）。
- **改前基準**：同一支治具、同一組參數對 `48d821f` 的 worktree 跑一次，數字並排落檔。
- **突變驗紅（改後做）**：① `FIG.legendLift = 0` ② `FIG.bodyScale.legend = 1.15`
  → `occl` 必須回到改前基準的量級（明顯大於 0.10）。兩個突變都用**改壞前的備份副本還原**，不做反向 sed。
- **活性**：`full` 像素數必須 > 3000（1688×780 上），否則這一幀「量到的是空的」，判 `n/a` 並另印警告；
  一尊三幀全 `n/a` ＝ 這一格紅（不得當成通過）。

### G2 出框
同一批截圖，390px 高視口下三尊 `full` 剪影的**最高點 y 必須 >= 1 實際像素**（不觸及第 0 列），
且最低點 <= 779。記錄每尊 `topY`／`bottomY`。（`creaturePx` 切頭問題，`js/duel-figures.js:73` 註解。）

### G3 讀者（本卷只產材料，盲讀由主對話派）
`blindread-sheet.mjs` 同規格產「滿編含三尊」六幀 sheet ＋ `mapping-HIDDEN.json`。
判定＝六讀者（三對）看圖答「哪一尊是請神來的、哪一尊」，**三對多數對**。
本卷的交付只到「材料路徑」。

### G4 效能
`node tests/tools/duel-perf.mjs perf <out> --n=8`（含三尊的最重 8 隻）：
`rendersPerSec` 新／基準 **>= 0.95**，`drawCallsPerFrame` **<= 1000**。基準用 `--root=<48d821f worktree>`。

### G5 零錯
- `duel-drive` 四場（`seed=7`，另三場各含一尊傳說）0 console error／pageerror／requestfailed。
- `legend-drive`（請神流程）0 error。
- `node --test tests/*.test.mjs` 12 套全綠。
- `traitfx-drive` 27/27 ＋ 三尊 3/3（大招不退）。

### G6 範圍
`git diff --stat <48d821f>..` 只准出現：
`js/duel-figures.js`、`js/creature-figures.js`、`js/scene-env.js`、`js/camera-director.js`、
`js/trait-fx.js`、`index.html`（名牌／LEGENDS 加欄位；**`VERSION` 不動**）、`tests/tools/*`、`docs/*`。
`assets/` 若新增 GLB 要列出檔名與大小。逐檔一句「對應哪條需求」。

### 視覺交付
三尊各一張「滿編對決」844×390 截圖（改前／改後並排）＋一段請神進場 GIF；`threejs-visual-loop` 自評兩輪。

## 3. 什麼實作會讓每一條紅（動手前先答得出來）

| 閘門 | 會讓它紅的實作 |
|---|---|
| G0 | 把 `lg` 加進引擎 `buildArmy` 的 teams（或任何 `trace()` 讀得到的欄位） |
| G1 | 基座高度不夠／傳說仍參與體型排序被排到後排／標記色被 bloom 溢出而算進 `vis` |
| G2 | `creaturePx` 沒跟著 `legendScale` 一起吃 → 1.35×1.2 世界單位在 390px 視口切頭 |
| G4 | 光效用 `Points` 逐顆更新或每尊各一份材質 → draw call 爆 |
| G5 | sprite 貼圖每幀重建 → GC 尖峰與 console 警告 |
| G6 | 順手重構 `duel-figures` 的排陣主迴圈 |
