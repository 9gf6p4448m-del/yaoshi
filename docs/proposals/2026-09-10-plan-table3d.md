# 計畫：拍賣桌整片掏空 v0.55（2026-09-10）

> 依據：`docs/ROADMAP_V2.md` §6.2＋§7 Top 1（使用者 09-09 願景，權威）；使用者 09-10 裁 **D1 乙「整片掏空」**（不走評審建議的甲案桌心視窗）。
> 本檔是開卷派工書（`04` 模板 9 四段）＋凍結檔草案。**動手前第 7 節的題要先裁**。
> 全部行號對 `main` v0.53（`index.html` 6447 行）。本計畫產出時 repo 一個位元組未動。

---

## 0. 一句話結論

整片掏空**做得到，而且比評審想的便宜**——評審 §3.2 列的三道「不能拆 `#felt`」的牆，兩道是治具要跟著改、一道（`backdrop-filter`）已經在 2026-09-03 自己消失了。真正的硬牆評審沒點名：`#felt` 是**所有階段**的舞台（11 處 `$("stage").innerHTML`），掏空只能依頁面切換。
**風險全部集中在效能，而且比想像中緊**：iPhone 牌桌基準（09-10 剛回填）是 **55–58 fps／14 draw calls／855 三角形**——一個幾乎空的場景就已經掉出 60。4 尊 GLB 上桌實測是 **+119 calls／+31k 三角形**（描邊關 +69／+17k），把 draw calls 推成基準的 **9.5 倍**。所以 §7 Q3（描邊開不開）與 Q4（fps 閘門怎麼量）是這一卷真正要裁的兩題，其餘都是工。

---

## 1. 檔案清單

| 檔 | 卷 | 為什麼 |
|---|---|---|
| `index.html`（CSS `:186-300`／DOM `:571-596`／`renderSeats :3819`／`showMarket :4467`／盯上頁 `:4380`／`mcardHTML :4581`） | 0.55a | 版面主體：`#table` 欄寬、`#west`/`#east` 拆座位＋卡列、`#felt` 掏空 class、`#tray` 命中層、`.preview`／`#shrines` 搬進 `#north` 的空白 |
| `index.html`（`openSheet :4606`／新增 `trayTap()`／`ys:market` 派發點在 `beginRoundCore :4265` 之後） | 0.55b | Raycaster 的輸入端與相位分派（點托盤＝`openSheet(i)`／`pickMark(i)`）都留在演出層，3D 層只回答「哪一格」 |
| `js/table-tray.js`（**新檔**，Layer 1） | 0.55b | 托盤群組、4 槽位、GLB 載入與釋放、hover 浮空微旋、`hitTest(ndc)`。**不放進 `scene-env.js`**：那支檔頭 `:2` 明寫「純視覺、不讀寫遊戲狀態」，而托盤要吃「今夜有哪 4 件」的清單；分成兩檔才不會讓 `scene-env` 變成半個狀態容器 |
| `js/scene-env.js`（`:257-261` 桌面 mesh） | 0.55b | 木紋（頂點色＋幾何刻痕）、桌角香灰與符咒殘卷、紅布托盤底。D8 甲 |
| `js/renderer.js`（`:95` 建場、`:182` `__yaoshi3d` 出口、`:214` update 迴圈） | 0.55b | 把 `table-tray` 接上：建立、每幀 `update`、掛進 `window.__yaoshi3d.tray`、聽 `ys:market` |
| `tests/tools/felt-probe.mjs`（`MEASURE :32`） | 0.55a | 加 `--sel=#felt,#west,#east,#north`：**收斂**成一支探針量四個容器，不新寫第四支（`02 §6.1` 第 7 條） |
| `tests/tools/legend-drive.mjs`（`:61` 選擇器清單、`:362` 直向判定） | 0.55a | 橫向溢出清單加 `#railW,#railE`；新增「逐一 tap 每個可點元素」的命中回歸段 |
| `tests/tools/layout-shot.mjs`（`:61-62`）、`tests/tools/mkt-probe.mjs`（`:1`） | 0.55a | `#market` 這個 id 退役 ⇒ 改吃 `--sel`（分母見 §6 Q1） |
| `tests/tools/scene-shot.mjs`（`--gate` 已在牌桌機位讀 `renderer.info`） | 0.55b | 擴成 draw call／三角形／renders-per-sec 的 A/B 閘門（`?table3d=0` vs 預設，同一頁交錯量 5 次取中位） |
| `docs/experiments/2026-09-10-acceptance-table3d.md`（**新檔**） | 兩卷共用 | 凍結檔（草案在 §5） |
| `docs/IMPLEMENTATION_GUIDE.md` 新增 §11.27／`docs/GAME_DESIGN.md` 不動 | 0.55b 收尾 | 接手須知；規則零變動所以 GAME_DESIGN 不動 |

**明確不動**：`js/bloom.js`、`js/duel-figures.js`、`js/creature-figures.js`（只**呼叫** `makeCreatureFigure`／`creatureGlbUrl`，不改它們）、`js/camera-director.js`（機位一格不動）、任何引擎函式、`docs/design/ART_BIBLE.md`。

---

## 2. 介面（先寫死，實作不得自行改名）

### 2.1 DOM

```html
<!-- #table 的 grid 不動 areas，只動 columns -->
<div id="west">
  <div id="westSeat"></div>   <!-- renderSeats 寫這裡（原本寫 #west） -->
  <div id="railW" class="rail"></div>  <!-- showMarket／盯上頁寫這裡：槽 0、1 -->
</div>
<div id="felt">              <!-- 元素保留，id 保留，position:relative 保留 -->
  <button id="skipbtn">…</button>
  <div id="feltHead"></div>   <!-- 掏空時：浮字，pointer-events:none -->
  <button id="helpBtn">？</button>
  <div id="tray"></div>       <!-- 新增：透明命中層，只在 .hollow 時存在意義 -->
  <div id="stage"></div>
  <div id="veil"></div>
</div>
<div id="east"><div id="eastSeat"></div><div id="railE" class="rail"></div></div>
```

### 2.2 CSS（值先寫死）

```css
#table{grid-template-columns:168px 1fr 168px}          /* 原 120px 1fr 120px */
@media (orientation:portrait){ #table{grid-template-columns:120px 1fr 120px} .rail{display:none} }
#west,#east{flex-direction:column;gap:4px;align-items:stretch}  /* 原 align-items:center */
.rail{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-height:0}
.rail .mcard{height:88px}                               /* 原 133.3×98 → 168×88 */
#felt.hollow{background:none;backdrop-filter:none;-webkit-backdrop-filter:none;border-color:transparent}
#felt.hollow #feltHead{position:relative;z-index:2;pointer-events:none;text-shadow:0 1px 3px #000,0 0 8px #000}
#tray{display:none}
#felt.hollow #tray{display:block;position:absolute;left:0;right:0;top:26px;bottom:0;z-index:1;
  pointer-events:auto;touch-action:manipulation;background:transparent}
```

`--glass`／`--glass-felt`／`--glass-felt2`／`--glass-blur`（`:194-197`）**一格不動**——非掏空頁面（開標、請神、結算、教學）照舊吃它們。

### 2.3 JS 函式簽名

```js
/* index.html（演出層） */
function railHTML(idxs)            // -> string，兩張卡的 HTML；內部仍呼叫 mcardHTML(it,i)，卡片內容一字不改
function setHollow(on)             // -> void，切 #felt.hollow；showMarket／盯上頁 on，其餘 stage 頁 off
function trayTap(ev)               // -> void，#tray 的 pointerdown；算 NDC → tray.hitTest → openSheet(i) 或 pickMark(i)
function trayHover(ev)             // -> void，pointermove；tray.setHover(i)
/* 派發（演出層 → 3D 層）：不耗亂數、不讀寫賽局欄位 */
fx3d("ys:market", { items:[{key:"guoyin",curse:false},…4 筆], round:S.round })
```

```js
/* js/table-tray.js（Layer 1，純視覺） */
export function createTableTray(scene, camera, opts) // -> tray
tray.group          // THREE.Group
tray.setItems(list) // list = [{key,curse}]；key = it.ab || it.m（★不是只有 ab★，見 §6 Q3）
tray.hitTest(u, v)  // NDC → 槽位 index，未命中回 -1。純幾何，不讀遊戲狀態
tray.setHover(i)    // -1 = 無
tray.update(dt)
tray.slotScreen(i)  // -> {x,y} 螢幕座標，給治具驗「槽位落在 #tray 矩形內」
```

`window.__yaoshi3d.tray = tray`（`renderer.js:182` 的出口物件加一個鍵）。

### 2.4 常數（`js/table-tray.js` 檔頭一張表，全部【試玩必調】）

```js
export const TRAY = {
  Y: 0.152,                       // 桌面頂 0.15 之上一點
  Z: 0.10,
  XS: [-1.35, -0.45, 0.45, 1.35], // CFG.MARKET 恆為 4（index.html:622）
  SCALE: 0.70,                    // 模型高 ≤1.2（creature-figures NORM.maxH）→ 世界高 ≤0.84 → 螢幕約 98px
  OUTLINE: true,                  // ?table3d=lite 時 false（見 §7 Q3）
  HOVER_SPIN: 0.6,                // rad/s
  HOVER_LIFT: 0.06,
  CLOTH: { w: 3.6, d: 1.2, color: 0x6a1414 },
};
```

### 2.5 URL 旗標（與既有 `closeup/fps/legend/edge/outline/decal` 同一種解析法）

| 旗標 | 卷 | 預設 | 作用 |
|---|---|---|---|
| `?table3d=0` | 0.55a | 開 | **完全回到 v0.53 版面**：不加 `.hollow`、`#table` 欄寬回 120px、卡片回 `#stage` 內的 `#market`。這是 0.55a 的 kill switch，也是效能 A/B 的對照組 |
| `?tray3d=0` | 0.55b | 開 | 版面照 0.55a，但桌上不擺任何模型（`setItems` 空操作）。0.55b 的 kill switch |
| `?table3d=lite` | 0.55b | — | 托盤模型不掛描邊外殼（`TRAY.OUTLINE=false`），每幀 draw calls 從 133 降到 82 |

### 2.6 治具 CLI

```
node tests/tools/felt-probe.mjs --seeds=1,3 --sel=#felt,#west,#east,#north --json=<out>
node tests/tools/scene-shot.mjs <prefix> --gate --perf --runs=5      # 新增 --perf：?table3d=0 / 預設 交錯各 5 次
node tests/tools/legend-drive.mjs --all --seeds=… --base=<felt-probe json> --taps    # 新增 --taps
node tests/tools/trace-eq.mjs <基準 index.html> index.html
node tests/tools/trace-eq.mjs index.html --mutate
```

---

## 3. 不做什麼

1. **不改事件模型**。行內 `onclick` 一百多處、`touchmove` 白名單兩處字串（`:34`、`:6430`）一字不動。
2. **不做拖曳轉桌／捏合縮放**。只做 tap。一做拖曳，`touch-action` 就要變成第三處白名單。
3. **不開陰影**（`shadowMap.enabled` 是全域開關，`renderer.js:250-256` 的暖身幀紀律靠「對決前後 programs.length 不變」守著）。「隨夜風晃動的鬼影」延到 iPhone `?fps=1` 回填之後另議。
4. **不動任何引擎**。`trace(1..20)` 對基準逐位元組相等是 T0，不是選項。
5. **不動策略數值**（硬規則 3）：`CFG.MARKET`、`SHRINE_NIGHTS`、`INC_*` 一格不動。
6. **不改 `#sheet`／`#modal`／`#duel` 的疊層**（z 30／20／40）與 canvas 的 z −2、`pointer-events:none`。
7. **不修 ART_BIBLE**。D8 走甲案（頂點色＋幾何）；看不出差別再回頭談例外。
8. **直式（390×844）維持 v0.53 版面**，`#rotateHint` 的顯示條件與文案一字不動。
9. **不做血印令 3D 拍桌**（另開 0.55c，它要新美術資產＋新音效）。
10. **不碰 `.claude/worktrees/`**（另一個 agent 正在改招式演出）；本卷與招式演出零重疊檔案。

---

## 4. 端到端驗證步驟（指令原文＋期望輸出）

> 全部在 repo 根目錄跑。埠一律 96xx 段（避開 legend 卷的 95xx）。

```bash
# ① 引擎零變動（兩卷都要）
node tests/tools/trace-eq.mjs ../yaoshi-base-v053/index.html index.html
#   期望：{"…","equal":true}；exit 0
node tests/tools/trace-eq.mjs index.html --mutate
#   期望：{"…","differs":true,"verdict":"突變驗紅 ✅…"}；exit 0

# ② 版面：四個容器的直向溢出（0.55a）
node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --tag=new --port=9601 --json=/tmp/felt-new.json
#   期望：#felt 12 格全 0（基準有一格 54）；#west/#east 12 格全 0；#north 12 格全 0
node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --tag=base --root=../yaoshi-base-v053 --port=9602 --json=/tmp/felt-base.json
#   期望：印出基準表供 legend-drive --base= 帶入

# ③ 橫向溢出＋0 error＋逐一 tap 命中回歸（0.55a）
node tests/tools/legend-drive.mjs --all --seeds=1,2,3,4,5,6 --base=/tmp/felt-base.json --taps --port=9603
#   期望：橫向溢出 0；console error/pageerror/requestfailed 各 0；
#         --taps 段印「25/25 命中」（v0.53 基準 clickableCount=25，實測值見 §6 Q2）

# ④ 效能 A/B（0.55b）。★數字一律換算成「每幀」★：info.reset() 之後等兩次 rAF ⇒ 讀到的是兩幀的和，要除以 2
node tests/tools/scene-shot.mjs /tmp/t3d --gate --perf --runs=5 --port=9604
#   期望（AMD 780M、844×390 dpr2、uncapped、每幀值）：
#     ?table3d=0    draw calls 14，三角形 855，passes/frame 1，renders/s 中位 ≈ 650–870
#     預設          draw calls ≤ 135，三角形 ≤ 33000，passes/frame 1，比值中位 ≥ 0.40
#     ?table3d=lite draw calls ≤ 85，三角形 ≤ 19000，比值中位 ≥ 0.60

# ⑤ 對決沒被拖累（0.55b）
node tests/tools/duel-perf.mjs perf /tmp/duelperf-new.json --port=9605 --uncap
#   期望：drawCallsPerFrame ≤ 970（基準 965，該欄位同樣是兩幀和 ⇒ 每幀 482）、rafMedianFps ≥ 102（基準 113.6 × 0.9）

# ⑥ 人眼 contact sheet
node tests/tools/layout-shot.mjs /tmp/shot-055 --port=9606 --sel=.rail
#   期望：6 張 PNG（n1／mark2／preshrine／bag／rail／portrait）交使用者

# ⑦ iPhone 實機（使用者側，★這一題唯一有鑑別力的 fps 量測★）
#   同一支 iPhone（iOS 18.7 Safari，852×339 dpr 3，非 standalone），同一個時點（盯上頁）：
#     <site>/?fps=1&table3d=0  → 期望 fps 平均 55–58、calls 14、tris 855（＝ 09-10 已回填的基準）
#     <site>/?fps=1            → 期望 fps 平均 ≥ 50（＝ 55 × 0.90）
#     <site>/?fps=1&table3d=lite → 同上，若預設不過就看這個
#   規則頁截圖三張交回來（T10）
```

---

## 5. 凍結檔草案 T0–T12

> 訂下即凍結（`02 §2.1`）。要改只有「原標準錯在哪、為什麼現在才知道」＋使用者針對那一條的明確同意一條路。
> 基準＝`main` v0.53（本檔量測時的 HEAD）。**沒帶基準的一律不算通過。**

### 0.55a（版面卷）

**T0 引擎逐位元組相等（兩卷都適用）**
`trace-eq.mjs <基準> index.html` 對 seeds 1..20 `equal:true`；同一支腳本 `--mutate` 必須 `differs:true`。
*什麼實作會讓它假綠*：把 `trace()` 的輸出欄位砍掉幾個再比；只比 seed 1；跳過 `--mutate` 那半邊（相等性斷言本身沒有證明力，`02 §6.1` 第 1 條）。

**T1 kill switch 雙向**
`?table3d=0` 下，`#table` 的 `grid-template-columns` computed 值＝`120px … 120px`、`#felt` 的 `classList` 不含 `hollow`、`#tray` 的 `display` 為 `none`、`#railW`/`#railE` 的 `childElementCount` 為 0，且 `#market` 內有 4 張 `.mcard`；預設（不帶旗標）四項全反。
*假綠*：只驗「有沒有這個旗標被讀到」（讀到不等於生效）；只驗開不驗關（單向＝反向探針，`02 §6.1` 第 1 條）。

**T2 `#felt` 直向溢出恆 0（比基準加嚴）**
`felt-probe --seeds=1,3 --rounds=3 --sel=#felt`：12 格**全部**為 0。基準 v0.53 是 11 格 0＋1 格 54（seed 1 第 3 夜出價頁，實測見 §6 Q4）。
*假綠*：把 `#feltHead`／`.preview` 改成 `position:absolute` 讓它不計入 `scrollHeight`——那是把高度藏起來不是搬走。**配套斷言**：`#felt` 的 `scrollHeight` 必須 ≤ 260（掏空後只剩浮字條；若有人把整個 `#stage` 塞回去，`scrollHeight` 會超過而 `over` 仍是 0，因為它會撐開⋯所以兩個一起量）。

**T3 側欄與北列不溢出**
同一次 `felt-probe --sel=#west,#east,#north`：三個容器 12 格全部 `scrollHeight − clientHeight ＝ 0`。
*假綠*：對 `.rail` 加 `overflow:hidden` 把第二張卡切掉一半——**配套人眼**：T9 的 contact sheet 上，四張卡的名稱、戰力、系別 chip、招式行**四樣都完整可見**（不得 ellipsis 到看不出招式名）。

**T4 橫向溢出 0**
`legend-drive --all --seeds=1..6`：`#table`／`#north`／`#shrines`／`.incboard`／`.shcards`／`#felt`／`#stage`／`#south`／`#railW`／`#railE`／`.incbar`／`.preview` 每一個的 `scrollWidth − clientWidth ＝ 0`；`0 console error／pageerror／requestfailed`。
*假綠*：把新加的兩條 rail 從選擇器清單裡漏掉（清單在 `legend-drive.mjs:61`，改了要一起加）。

**T5 觸控命中回歸（逐一 tap，不是數數量）**
`legend-drive --taps`：在第 1～3 夜的出價頁與盯上頁，對**每一個** `#table [onclick]` 元素各 `page.tap()` 一次，記錄「這一 tap 有沒有讓對應的處理函式被呼叫」（在頁面端包一層計數 proxy）。基準 v0.53 同治具跑一次得到分母（實測 25 個，見 §6 Q2），新版必須**同一份清單全部命中**，且新增的 `#tray` 不得吃掉任何一個原本可點元素的事件（tap 在 `.mcard`／`#skipbtn`／`#helpBtn`／`#south` 任何鈕上時，`trayTap` 的呼叫次數必須為 0）。
*假綠*：只數 `document.querySelectorAll('[onclick]').length` 相等——元素還在不代表點得到（`#tray` 蓋在上面就會全滅）。這一條的鑑別力檢查：把 `#tray` 的 `top:26px` 故意改成 `top:0`（蓋住 `#feltHead`）與 `z-index:9`（蓋住 helpBtn），必須紅。

**T6 直式蓋板行為不變**
390×844 下：`#rotateHint` 的 computed `display` ＝ `flex`；`#table` 的 `grid-template-columns` ＝ `120px … 120px`；`.rail` 的 `display` ＝ `none`；`#table` 橫向溢出 0。對基準逐項相同。
*假綠*：只截圖看「有沒有蓋住」——蓋板底下版面爆掉仍然看不出來，所以要量 computed 值。

### 0.55b（上桌卷）

**T7 托盤內容＝今夜市集，且槽位落在掏空窗內**
`?tray3d=1` 下，第 1～3 夜各驗一次：`__yaoshi3d.tray` 的槽位數＝4；每個非詛咒槽掛著的 GLB URL ＝ `assets/creatures/<it.ab||it.m>.glb`（★對照 `S.market` 逐槽比對，不是比對數量★）；詛咒槽掛占位物不掛 GLB；`tray.slotScreen(i)` 的 4 個點**全部**落在 `#tray` 的 `getBoundingClientRect()` 之內（含 20px 內縮邊界）。
*假綠*：用 `it.ab` 當唯一鍵——POOL 27 件裡有 4 件沒有 `ab` 只有 `m`（§6 Q3），只驗 `ab` 的話那 4 件會靜默變成空槽而測試照樣綠；只驗「槽位數＝4」不驗內容。

**T8 Raycaster 命中率與相位分派**
Playwright 對 4 個槽位的 `slotScreen(i)` 各 tap 20 次（共 80 次）：出價頁 `openSheet` 被呼叫 80 次且 `i` 全對；盯上頁 `pickMark` 被呼叫 80 次且 `i` 全對；`openSheet` 在盯上頁的呼叫次數＝0（反之亦然）。另對 `#tray` 的四個角落（模型之外的空白）各 tap 10 次：`hitTest` 回 −1、`openSheet`／`pickMark` 呼叫次數＝0。
*假綠*：只驗「有沒有被呼叫」不驗 `i`（四槽全部誤判成槽 0 也會綠）；不驗空白區（把整片 `#tray` 當成槽 0 也會綠）。

**T9 效能硬門檻（deterministic，桌機端主閘門）**
`scene-shot --gate --perf --runs=5`，844×390 dpr=2、第 1 夜出價頁、uncapped。**全部換算成每幀值**（`info.reset()` 之後等兩次 rAF ⇒ 讀到的是兩幀的和，除以 2）：
- 預設（描邊開）：`calls` ≤ **135**、`triangles` ≤ **33000**、render passes/frame ＝ **1**
- `?table3d=lite`：`calls` ≤ **85**、`triangles` ≤ **19000**、passes/frame ＝ **1**
- `?table3d=0`：`calls` ＝ **14**、`triangles` ＝ **855**（＝ v0.53 基準；**桌機與 iPhone 實機逐值相同**，見 §6 Q4）
*基準值來源*：本檔 §6 Q4 的實測（每幀 14／855；4 尊 GLB 描邊開 133／31906、描邊關 82／18248）＋ `docs/experiments/2026-09-10-iphone-fps/README.md`。
*假綠*：量到 bloom 合成那一趟的 1 個 call（`info.autoReset` 預設只留最後一趟——必須 `autoReset=false; reset();` 再等兩次 rAF 才讀，`duel-perf.mjs:99-103` 是現成寫法）；**忘了除以 2**（會讓門檻鬆一倍）；在 `?tray3d=0` 下量預設值；把模型 `visible=false` 之後才量（實測踩過：`makeCreatureFigure` 的 `group.visible` 預設 **false**，`creature-figures.js:567`，忘了打開會量到 delta＝0 的假綠）。

**T10 fps：iPhone 是判定，桌機是早期警報**
- **（判定）iPhone 實機**，同一支機（iOS 18.7 Safari，852×339 dpr 3，非 standalone）、同一個時點（盯上頁）、`?fps=1`：`?table3d=0` 量到的 fps 當分母（09-10 已回填＝**55–58**），預設版的 fps ≥ 分母 × **0.90**（⇒ ≥50）。三張規則頁截圖為證。
  *為什麼這裡的 capped fps 有鑑別力*：iPhone 的牌桌基準是 55–58，**本來就沒有貼在 60 上**，托盤壓下去會直接反映在這個數字上。
- **（記錄項）桌機 uncapped 比值**：`renders/s ÷ passes-per-frame`，`?table3d=0` 與預設**同一頁交錯**各量 5 次取中位，地板 ≥ **0.40**（描邊開）／≥ **0.60**（lite），5 次全距一併印出。實測 0.437／0.666。這一條**只擋災難**，不當通過依據。
*假綠（最重要的一條）*：**拿桌機的 capped `rafMedianFps` 宣告通過**——本檔實測它在「有托盤」與「沒托盤」下**都是 59.9**（撞 vsync），零鑑別力。任何以桌機 capped fps 當通過依據的回報一律退回。
*噪音處置*：桌機同一組設定跨 run 的基準實測落在 653.8～864.6 renders/s（±30%），所以只認同頁交錯、5 次中位（`02 §6.2`：先歸因再處置——這裡歸到量測環境，處置是交錯＋中位，不是加 retry 或拉長 timeout）。

**T11 對決沒被拖累**
`duel-perf perf --uncap`：`drawCallsPerFrame` ≤ 970（基準 965）、`rafMedianFps` ≥ 102（基準 113.6 ×0.9）、`renderPassesPerFrame` ＝ 10（＝基準，證明沒動 bloom）、`renderer.info.programs.length` 在對決前後不變。
*假綠*：只跑一場（第 1 場的 shader 還沒編完，數字偏低反而「更好看」）——沿用 `duel-perf` 既有的「量第 2 場」規則。

**T12 人眼（844×390 contact sheet）**
六張圖交使用者：第 1 夜出價頁、第 2 夜盯上頁、請神夜前一夜出價頁、袋子面板、側欄卡片特寫、直式蓋板。逐項看：① 中央看得到木紋、香灰、紅布托盤與 4 尊拍品 ② 四張側欄卡的四樣資訊完整 ③ `#vignette`（`:40`，外圈 `rgba(0,0,0,.62)`）沒有把托盤壓成一團黑 ④ 掏空頁與非掏空頁（開標揭盅那一張）切換時沒有閃白或版面跳動。
*假綠*：只交「好看的那一張」——六張缺一即未過（`03 R2` 第 1 項：逐條有證據）。

---

## 6. 五個問題的答案（附行號）

### Q1 評審 §3.2 的三個「`#felt` 不能拆」的理由，整片掏空時各自怎麼重寫

**先講結論：一個都不是硬牆。兩個是治具要跟著改，一個已經過期。**
關鍵前提：整片掏空**不刪 `#felt`**。它仍是 `grid-area:felt` 的容器（`:194`）、仍 `position:relative`、仍 `overflow-y:auto`、id 不變；改的只是「它裡面裝什麼」與「它畫不畫玻璃」。

**① 觸控白名單（`index.html:34` CSS 與 `:6430` JS，兩處各抄一份字串 `#felt,#sheetbox,#modalbox,#review,#selGrid`）→ 兩處一字不動。**
`#tray` 是 `#felt` 的**子元素**，`e.target.closest("#felt,…")`（`:6430`）沿著祖先鏈找 ⇒ 仍然命中、仍然放行。
唯一要新增的是 `#tray{touch-action:manipulation}`（蓋掉 `:34` 給 `#felt` 的 `pan-y`），讓 tap 不必等捲動判定——那是**新增一條 CSS 規則**，不是改白名單。
白名單真的會變成三處的情境只有一種：做拖曳轉桌／捏合縮放（要 `touch-action:none`）。**本卷 §3 第 2 條明令不做。**

**② `felt-probe.mjs`（`MEASURE` 在 `:32-37`，寫死 `getElementById('felt')`）→ 治具要跟著改，而且是往「加嚴」改。**
掏空後 `#felt` 裡只剩 `#feltHead`（17px 浮字）＋絕對定位的 `#skipbtn`／`#helpBtn`／`#tray`／`#veil` ⇒ `scrollHeight − clientHeight` 恆為 0。這支探針**不退休**，語意從「有沒有擠爆」變成「有沒有人偷偷把東西塞回中央」，門檻從「≤基準同格＋52px」收緊成「恆 0」（T2）——**加嚴，自行記錄即可**（`02 §2.1`）。
真正吃高度的地方搬去了 `#west`／`#east`／`#north` ⇒ 做法是**收斂而不是新寫探針**：給 `felt-probe` 加 `--sel=`，`MEASURE` 改成對每個選擇器各量一次（`02 §6.1` 第 7 條「先寫下分母、首選收斂」）。分母：`#felt` 這個字串在 repo 出現 36 處（index.html 27／legend-drive 5／felt-probe 3／scene-env 1 且是註解），其中**真正在做量測的只有 felt-probe 的 3 處與 legend-drive 的 `:362` 判定**——收斂成一支 `--sel` 之後分母歸 1。

**③ `backdrop-filter` 讓 fixed 子元素改以 `#felt` 為容器（`:196-197`）→ 這條理由已經過期，2026-09-03 就自己消失了。**
`:203-205` 的註解就是那次修的紀錄：「helpBtn 原本 position:fixed，但 `#felt` 的 backdrop-filter 會讓 fixed 子元素以 `#felt` 為容器⋯改成明確 absolute」。實查現況：`#helpBtn`（`:206`）與 `#skipbtn`（`:301`）**都已經是 `position:absolute`**；全檔 12 個 `position:fixed`（`:31,40,42,207,305,464,469,496,515,522` 等）**沒有一個是 `#felt` 的後代**——`#updBar`（`:207` CSS／`:595` DOM）是 `#table` 的**兄弟**，不是 `#felt` 的孩子。
撐住那兩顆鈕的是 `#felt` 的 `position:relative`（`:197`），那一條**留著**。所以 `#felt.hollow` 拿掉 `backdrop-filter` 對定位零影響。
**要驗它**（不能只靠推理）：T5 的鑑別力檢查已經涵蓋——把 `#helpBtn`／`#skipbtn` 的位置在掏空前後各量一次 rect，必須逐值相同。

**④ 評審沒點名、但這才是真硬牆：`#felt` 是所有階段的舞台。**
`$("stage").innerHTML=` 在 `index.html` 出現 11 處（`:4199` 教學頁、`:4311/4317` 異事、`:4344` 異事開盅、`:4390` 盯上頁、`:4478` 出價頁、`:4832`、`:4901` 請神、`:5655` 局末，另有 `:4743`／`:5558` 的 `const stage=$("stage")`）。開標揭盅、請神結算卡、夜末、局末、教學、異事全部畫在同一個 `#felt` 裡。
⇒ **掏空只能依頁面切換**：只有出價頁（`showMarket :4467`）與盯上頁（`:4380`）走 `setHollow(true)`，其餘 stage 頁 `setHollow(false)` 回到玻璃面板。否則開標揭盅會變成一張浮在 3D 木桌上的無底文字。
順帶一提這反而是加分：`SHOTS.reveal`（`camera-director.js:19`，dist 3.2 往桌心壓）發生時，桌上正好擺著今夜這 4 件拍品——鏡頭壓進去看到的是實體，不是空桌。

### Q2 844×390 橫式版面配置（實測 px）

**基準實測（v0.53，844×390 dpr=2，第 1 夜出價頁，探針落在 scratchpad/layout-probe.mjs）**

| 區塊 | 位置 | 尺寸 |
|---|---|---|
| `#table` | 0,0 | 844×390（`grid-template-rows:56px 1fr 62px`／`columns:120px 1fr 120px`／gap 4／padding 4） |
| `#north` | 4,4 | 836×56（**只放一張 320px 寬的北席卡，左右各空 258px**） |
| `#west`／`#east` | 4,64／720,64 | 各 120×256（座位卡 120×85.6，垂直置中） |
| `#felt` | 128,64 | 588×256（border 2 ⇒ clientH **252**） |
| `#feltHead` | 140,74 | 564×**17** |
| `.preview`（明夜預告） | 140,96 | 564×**27** |
| `#shrines`（香火榜 slim） | 140,161 | 564×**16.7** |
| `#market` | 140,180.7 | 564×**98**（4 張卡各 **133.3×98**，gap 7） |
| `#south` | 4,324 | 836×62（`#budget` 351.8×44、`#mainbtn` 96.4×44） |

**0.55 掏空後（欄寬 120→168px；桌心 588→492px）**

```
┌─ 844 × 390 ─────────────────────────────────────────────────────────────┐
│ #north 836×56                                                            │
│ ┌ .preview 明夜預告 246×48 ┐ ┌ 北席 seat 320×56 ┐ ┌ #shrines 香火榜 246×48 ┐│
├────────────┬─────────────────────────────────────────┬───────────────────┤
│ #west      │ #felt.hollow 492×256（透明・無玻璃・無邊）│ #east 168×256     │
│ 168×256    │ ┌ #feltHead 17px 浮字（pointer-events:none）┐                │
│ ┌seat 72 ┐ │ │ 第N/12夜・風位・月相・異事・市集規則      │ ┌seat 72 ────┐  │
│ └────────┘ │ └──────────────────────────────────────┘ │ └────────────┘  │
│ ┌mc0 168×88│  #tray（透明命中層 492×230，pointer-events:auto）│┌mc2 168×88┐│
│ │名稱 戰力系│                                          ││          ││
│ │招式行     │      ▓▓ 紅布托盤 ▓▓                       │└──────────┘│
│ └──────────┘│    🗿   🗿   🗿   🗿                       │┌mc3 168×88┐│
│ ┌mc1 168×88│    槽0  槽1  槽2  槽3                      ││          ││
│ └──────────┘  （桌面木紋・桌角香灰・符咒殘卷）           │└──────────┘│
├────────────┴─────────────────────────────────────────┴───────────────────┤
│ #south 836×62：🧑 壽命 戰力 [袋子][ⓘ][🔊][放血] │ 出價合計・🕯️燒香 │ [蓋牌開標]│
└──────────────────────────────────────────────────────────────────────────┘
```

**各區 px 帳**
- 側欄：`168 = 卡片 168`（比現在 133.3 **寬 34.7px**，字更好讀）。垂直 `256 = seat 72 + 4 + card 88 + 4 + card 88`。座位卡從 85.6 壓到 72（頭像與名字擠成一行；`.seat` 的 `padding:5px 8px`、`roleInfoBtn` 的 `bottom:-7px` 不動）。
- 北列：`.preview` 與 `#shrines` 搬進 `#north` 現有的**兩塊 258px 空白**（各給 246px＋間距）。它們原本在 `#felt` 裡吃掉 27＋16.7＝43.7px，搬走之後桌心完全乾淨，而 `#north` 的 56px 高度不變（兩者都是單列文字，`.incboard` 現在就是 `font-size:9.5px／line-height:1.55`，wide 模式兩列＝33.4px 也塞得下 48px）。
- 桌心：`492 × 256`，扣掉頂端 26px 的 `#feltHead` 浮字帶，`#tray` 命中層 `492×230`。
- 底列：`#south` **一格不動**（出價 stepper 本來就在 `#sheetbox` 彈窗裡，不在底列；`:497`）。藍圖說的「底部滑桿」現況已經是彈窗，本卷不改。
- 出價數量 `CFG.MARKET` 恆為 4（`:622`），不會有第 5 張卡。

**直式（390×844）行為怎麼變：不變。**
`@media (orientation:portrait)` 下 `#table` 欄寬回 `120px 1fr 120px`、`.rail{display:none}`（照 `#market :251` 與 `#shrines` 的既有慣例），`#felt` 不加 `.hollow`。`#rotateHint`（`:42-46`）的顯示條件與文案一字不動——直式本來就整片蓋住，玩家看不到牌桌。這樣做的理由是硬的：直式 390px 寬扣掉兩根 168px 側欄只剩 −6px，版面會直接爆掉，而 `overflow-probe` 會量到。

### Q3 3D 桌面：托盤、拍桌、Raycaster 怎麼接 `scene-env`／`SHOTS`；木紋與香灰怎麼做

**現況座標系（實測＋算出來的）**
`scene-env.js:245-250`：`PerspectiveCamera(50, aspect, 0.1, 100)`，`camDist 3.6`、`tilt 35°`、`lookAt(0,0.1,0)` ⇒ 相機在 `(0, 2.065, 2.949)`，right＝`(1,0,0)`、up＝`(0,0.832,−0.555)`。桌面 `CylinderGeometry(3.4,3.4,0.3,8)` 中心在 y=0 ⇒ **桌頂 y＝0.15**（`:257-261`）。
把掏空窗（螢幕 x 176..668、y 64..320）反投影到 y=0.15 的平面上：
- 窗**下緣** → 世界 `z≈+1.36`、`|x|≈1.40`
- 窗**中線** → 世界 `z≈+0.08`、`|x|≈2.03`
- 窗**上緣** → 世界 `z≈−3.61`、`|x|≈3.83`（**已經超出桌緣 r=3.4**，所以窗的上三分之一看到的是桌沿與遠景剪影，不是桌面）
⇒ 可用的擺盤帶是 `z ∈ [−1.5, +1.2]`、`|x| ≤ 2.0`。`TRAY.XS=[−1.35,−0.45,0.45,1.35]`、`Z=0.10`、`SCALE=0.70` 全部落在帶內（驗算：槽 3 的基座 NDC (u,v)=(0.390, −0.009)、模型頂 v=0.495，窗的上界是 0.672 ⇒ 有餘裕）。模型在螢幕上約 **98px 高**（390px 螢幕的 25%）。
**但這些數字不得寫死當唯一事實來源**：`slotScreen(i)` 每幀由 `camera.project()` 算，T7 斷言「4 個投影點落在 `#tray` 的 rect 內縮 20px 之內」——欄寬一改、機位一動，測試立刻紅。

**與 `scene-env` 的接法**
- `scene-env.js` 只改 `table` 那顆 mesh（木紋＋香灰＋符咒），**不新增任何讀遊戲狀態的東西**（它的檔頭 `:2` 明寫這條契約）。
- 托盤在新檔 `js/table-tray.js`，由 `renderer.js` 建立、加進 `scene`、每幀 `update`。
- 資料流：`beginRoundCore()`（`:4265`，`S.market` 已定）→ `fx3d("ys:market", {items})` → `renderer.js` 的 listener → `tray.setItems(list)`。**演出層單向推**，3D 層不回頭讀 `S`。`fx3d`（`:3933`）本來就是 try/catch 包起來的空操作安全的派發器，headless 不受影響（`trace-eq` 因此恆等）。
- **模型鍵是 `it.ab || it.m`**，不是只有 `ab`（見下）。

**與 `SHOTS` 的接法：一格不動。**
`SHOTS.table`（dist 3.6／tilt 35／yaw 0）＝現況機位，托盤就是照這個機位排的；`SHOTS.reveal`（dist 3.2／tilt 30／lookY 0.3）壓進桌心時托盤仍在窗內（帶更窄但 `|x|≤1.35` 安全）；`ys:duel` 時 `tray.setVisible(false)`（對決舞台是同一張桌子，拍品要收掉，否則會跟 8v8 疊在一起）。`camera-director.js` **不改一行**。

**★評審的一個事實錯誤：不是「4 件法寶沒有模型」★**
評審 §3.1 說「鍵是 `ab`，4 件無 `ab` 的法寶沒有模型」。實查：POOL 27 件裡 4 件沒有 `ab`——巴冷公主珠鍊、山豬牙飾、香灰符、陰陽眼銅錢——但它們有 `m`（`balen`／`boartusk`／`ashcharm`／`yinyangcoin`），而且 `assets/creatures/` 裡**這四顆 GLB 都在**。引擎自己就是這樣做的：`buildArmy` 用 `x.ab||x.m` 當模型鍵。
⇒ **27 件法寶全部有模型**；真正沒有模型的是 5 件詛咒品（冥婚紅包、魔神仔的芭樂、抓交替水符、縛靈鎖、白虎煞，`CURSES` 全部無 `ab` 也無 `m`）。
詛咒品的占位照 ART_BIBLE §4「詛咒＝有作者的惡意、是物不是靈」：**一疊綑起來的舊符紙**（3–4 片小方 `fin` ＋紅細 `curve` 綑綁，墨黑＋血褐＋泛黃紙色頂點色），身冒紫黑陰火（`particles.js` 的既有 ember 改色，不新寫粒子系統）。1 draw call。

**Raycaster 的輸入端在演出層，不在 3D 層**
canvas 是 `pointer-events:none`（`renderer.js:62`）且 z −2，本卷不動它。`#tray` 收 `pointerdown` → 算 NDC → `__yaoshi3d.tray.hitTest(u,v)` 回槽位 → **由 index.html 依相位分派**（出價頁 `openSheet(i)`／盯上頁 `pickMark(i)`）。3D 層只回答幾何問題，不知道什麼是「出價」——圖層契約守住。
hover：`pointermove` → `tray.setHover(i)` → 浮空 `+0.06`、繞 y 軸 `0.6 rad/s` 微旋、`setRim()` 提高自發光（`creature-figures.js:694` 既有介面，不新寫 shader）。

**木紋與香灰（D8 甲：頂點色＋幾何，不開貼圖）**
| 要素 | 做法 | draw calls |
|---|---|---|
| 老檜木深紅桌面 | `CylinderGeometry(3.4,3.4,0.3,8)` 換成**一份合併的 BufferGeometry**：16 個徑向扇區 × 10 圈同心環，頂點色沿半徑用一維噪聲在 `#6b3418`／`#4a2010`／`#8a4a24` 三色間插值＝年輪；桌緣加一圈薄 `fin` 當線腳（斜面吃到燈籠光就有厚度） | 1（**取代**現有的 1，淨增 0） |
| 桌角香灰 | 3 撮，各約 12 個扁三角形隨機散開（決定性種子，3D 層不用 `Math.random`），灰白 `#c8c0b4` 頂點色、不發光（ART_BIBLE §5「香灰＝肩頂一層灰白 arc 帶」的桌面版） | 1（三撮合併） |
| 泛黃硃砂符咒殘卷 | 3 片微捲的四邊形（一邊往上捲＝兩段 quad），頂點色泛黃紙 `#d8c88a` ＋一道硃砂紅 `#a02020` 直帶 | 1 |
| 紅布托盤 | 圓角矩形 `3.6×1.2` 於 y=0.152，深紅 `#6a1414`，四邊垂墜一圈短 `fin` 做布褶，頂點色在褶處壓暗 | 1 |
| **合計淨增** | | **+3** |

香灰與符咒是**靜態的**（不 update），托盤布也是。這 3 個 draw call 相對托盤模型的 238 是零頭。
**D8 甲的驗法**（品味題，`03 R6`）：contact sheet 上「桌面看得出是木頭而不是一塊棕色塑膠」由使用者裁；看不出差別再回頭談修訂 ART_BIBLE（那是改全案前提，不是資產卷）。

### Q4 效能：預估、量法、**現在就查出來的基準數字**

**桌機實測**：844×390 dpr=2、Chromium `--use-angle=d3d11`、AMD Radeon 780M（探針 scratchpad/table-perf.mjs、tray-cost*.mjs）。
**iPhone 實測**：`docs/experiments/2026-09-10-iphone-fps/README.md`（09-10 22:23 commit `5e7993b` 剛回填）——iOS 18.7 Safari、852×339 dpr 3、牌桌／盯上頁。
下表全部是**每幀**值（原始讀數是兩幀的和，已除以 2；換算後桌機的 14／855 與 iPhone 的 14／855 **逐值相同**，兩邊互相驗證了這個換算）。

| 場景 | draw calls | 三角形 | renders/s（uncapped，桌機） | passes/frame | capped fps |
|---|---|---|---|---|---|
| **牌桌基準 v0.53** | **14** | **855** | **864.6**（另一 run 653.8） | 1 | 桌機 59.9／**iPhone 55–58** |
| 牌桌 ＋ 4 尊 GLB 托盤（描邊開） | **133**（+119，×9.5） | **31906**（+31051） | **377.6** | 1 | 桌機 59.9（無鑑別力）／iPhone 未量 |
| 牌桌 ＋ 4 尊 GLB 托盤（`?outline=0`） | **82**（+68，×5.9） | **18248**（+17393） | **435.6**（同 run 基準 653.8） | 1 | 桌機 59.9（無鑑別力）／iPhone 未量 |
| 對決 8v8 最重 8 隻（現況已上線） | **482** | **176624** | 492.6 | 10 | 桌機 113.6／iPhone 未量（規則鈕按不到） |

**五個要點**

1. **★iPhone 的餘裕比想像中薄★**：一個 14 calls／855 tris 的**幾乎空的場景**已經只有 55–58 fps。瓶頸不在幾何量，在 852×339 **dpr 3 ＝ 2556×1017 ≈ 2.6 Mpx** 的填充率（外加 Safari 的 WebGL 呼叫成本）。托盤把 draw calls 推成 9.5 倍，是不是撐得住**只有實機能回答**——這就是 T10 把判定放在 iPhone 的理由。
2. **托盤是對決的 28%**（133 vs 482 calls）。對決現在就在 iPhone 上跑；但**牌桌是 80% 的時間**，對決是幾秒——持續耗電與發熱的帳跟峰值不是同一本。
3. **描邊外殼是唯一的大槓桿**：+119 → +68（−43%）。外殼是每顆本體 mesh 一顆（實測四尊的 `outlines()` 分別是 7／17／8／18 顆），描邊等於把模型的 draw call 翻倍。`?table3d=lite` 就是這根槓桿。
4. **桌機的 capped fps 對這一題零鑑別力**：有托盤 59.9、沒托盤 59.9，兩邊都撞 vsync。iPhone 的 capped fps 反而有鑑別力（基準 55–58 沒貼在 60 上）。
5. **噪音**：桌機同一組設定跨 run 的基準值 653.8 vs 864.6（±30%），所以只認同頁交錯、5 次中位的比值（`02 §6.2`）。

**量法（寫進治具）**
```js
info.autoReset = false; info.reset();
await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const calls = info.render.calls, tris = info.render.triangles;
info.autoReset = true;
```
（沿用 `duel-perf.mjs:99-103` 的現成寫法。`autoReset` 預設只留最後一趟 render，直接讀會量到 bloom 合成那一趟的 1 個 call。）
**兩個踩過的坑，都寫進 T9 的假綠清單**：
① `makeCreatureFigure` 回傳的 `group.visible` 預設是 **false**（`creature-figures.js:567-568`），忘了打開就會量到 delta＝0 而以為「托盤不用錢」——本檔第一次量就踩到。
② 上面那段程式碼跨了**兩次** rAF ⇒ 讀到的是兩幀的和。`duel-perf.mjs` 的 `drawCallsPerFrame` 欄位其實也是兩幀和（965 ⇒ 每幀 482）。要跟 `?fps=1` 的實機數字對得起來就必須除以 2——本檔一開始寫成 28／1710，是 iPhone 回填的 14／855 讓這個係數現形的。

**iPhone**：09-10 已回填（`5e7993b`）。**對決中的 fps 仍缺**（對決場景按不到規則鈕）——那份 README 的待辦是「診斷行加『上一場對決最低 fps』欄位，0.54 合併時順帶」。0.55b 不必等它（本卷不動對決），但 T11 要證明對決沒被拖累。

**另一個沒人量過的風險：GLB 記憶體。** `glbCache`（`creature-figures.js:127-135`）是一個 **永不淘汰** 的 `Map`。12 夜 × 4 件，最壞會把 27 顆 GLB 全部載進來——磁碟上 25MB，解壓後的 GPU 端更多。對決本來只在幾場裡碰到少數幾隻，牌桌會系統性地把整個 POOL 走過一遍。**0.55b 要加一條記錄項**：第 12 夜結束時 `renderer.info.memory.geometries／textures` 的值（本檔實測：基準 16／6，掛 4 尊後 80／61）。超過某個值再談 LRU 淘汰——本卷不做。

### Q5 分段：0.55a／0.55b 能不能各自獨立合併

**能，而且應該。** 兩卷的檔案交集只有 `index.html` 的 CSS 段，且 0.55b 不回頭改 0.55a 的版面。

| | 0.55a「掏空與版面」 | 0.55b「拍品上桌」 |
|---|---|---|
| 內容 | `#table` 欄寬、`#west`/`#east` 拆座位＋卡列、`.preview`／`#shrines` 搬進 `#north`、`#felt.hollow`、`#tray` 命中層（先只做「點空白不做事」）、直式維持舊版面、治具改版（felt-probe `--sel`、legend-drive `--taps`／rail 選擇器、layout-shot／mkt-probe 改 `--sel`） | `js/table-tray.js`、`scene-env` 木紋香灰符咒紅布、`renderer.js` 接線、GLB 載入、Raycaster→`openSheet`／`pickMark`、hover 浮空微旋自發光 |
| 桌心看到什麼 | 現在那顆八角柱桌面＋燈籠光＋線香煙（**平面，但終於看得到**） | 木紋桌面＋紅布托盤＋4 尊實體拍品 |
| kill switch | **`?table3d=0`** → 完全回到 v0.53 版面 | **`?tray3d=0`** → 版面照 0.55a、桌上空的 |
| 驗收 | T0–T6 | T0、T7–T12 |
| 合併後玩家看到的價值 | 「中央變成真的桌面、卡片在兩側」——已經是可交付的視覺升級 | 「拍品是實體」——藍圖 Top 1 的核心 |
| 大約 | 兩天 | 三到四天 |

兩個 kill switch 各管一層 ⇒ 出事時可以只關一層，不必整卷回退（`CLAUDE.md` 編碼準則 5「隨時退得回去」）。
**0.55c（不在本計畫的驗收範圍）**：血印令 3D 拍桌、桌角對手信物（收驚婆的白米香爐、當鋪的算盤、組頭的字花明牌）。它們要新美術資產與新音效，跟本卷的「疊層與效能」是兩件事。

---

## 7. 風險與需要使用者裁的題

> 每題附 ➡️ 建議答案，可以只回「都照建議」。**Q4 是移動及格線的那一題，必須單獨回答**（`02 §2.1`：對這一條的明確同意，「你看著辦」不算）。

**Q1 掏空的範圍**：甲「只有出價頁與盯上頁掏空，開標／請神／異事／夜末／局末／教學維持玻璃面板」／乙「所有頁面都掏空，stageCard 直接浮在 3D 上」。
➡️ **建議甲**。`$("stage").innerHTML` 有 11 處（§6 Q1④），乙案要重畫其中 9 頁的視覺，而且開標揭盅的黑幕 `#veil`（`:164`，`inset:0` 於 `#felt`）語意會整個變掉。甲案還有一個附帶好處：`SHOTS.reveal` 壓進桌心時，桌上正好擺著今夜的拍品。

**Q2 點 3D 拍品出價時，桌子會被自己的出價視窗蓋掉**：`#sheet`（`:496`，`position:fixed inset:0`、z 30、`rgba(0,0,0,.65)` 遮罩）一開，`bridge-players.js:106` 的 `sceneKind()` 就回 `null` ⇒ canvas 淡到 0.38、3D 木桌整片暗下去。「摸到實體」的感覺在按下去那一刻就消失。
甲「把 `'sheet'` 從 `sceneKind()` 的黑名單拿掉，3D 維持全亮」／乙「維持現狀」／丙「出價視窗改成右側抽屜（不蓋桌心、不加全螢幕遮罩）」。
➡️ **建議甲＋丙一起，放進 0.55b**。單做甲的話遮罩還是會壓暗；單做丙的話⋯其實就夠了，但甲那一行順手改成本為零。（**注意**：`sceneKind()` 也管 `#modal`／`#handoff`／`#review`／`#selectScr`，只動 `'sheet'` 一個字串。）

**Q3 ★托盤模型要不要掛描邊外殼★**：甲「掛（每幀 133 draw calls，陣營色可辨——ART_BIBLE §6 修訂二把陣營辨識的責任明確交給了描邊／邊光）」／乙「不掛（82）」／丙「掛，另給 `?table3d=lite` 讓效能不夠的人自己關」。
➡️ **建議丙**。理由與風險都要講白：iPhone 牌桌基準只有 55–58 fps，托盤把 draw calls 推成 9.5 倍（甲）或 5.9 倍（乙），**撐不撐得住只有實機能回答**。做法是先做甲、留 lite 當降級鈕，用 §4⑦ 的三張實機截圖決定預設值。若實機甲不過而 lite 過，就把 lite 翻成預設（那是**收緊**視覺、不是移動及格線，自行記錄即可）。

**Q4 ★fps 閘門怎麼量★（會動到評審雛形的數字，必須單獨簽准）**：評審 §3.3 的閘門雛形寫「fps `renders/raf` 中位 ≥0.90（V6 口徑）」，沒說在哪台機器上量。實測結果把這句話劈成兩半：
- **桌機**：capped fps 有托盤／沒托盤**都是 59.9**（撞 vsync，零鑑別力）；uncapped 比值 0.437（描邊開）／0.666（lite），**0.90 物理上做不到**。
- **iPhone**：基準 55–58 fps（沒貼在 60 上）⇒ capped fps **有**鑑別力，`≥0.90`（⇒ ≥50 fps）是一個真的門檻。
甲「iPhone capped fps 比值 ≥0.90 當**判定**（＝完整保留評審的數字，只是指定量在哪）＋桌機 deterministic 硬門檻（每幀 calls ≤135／≤85、tris ≤33k／≤19k、passes＝1）＋桌機 uncapped 比值地板 0.40／0.60 當**記錄項**」／乙「桌機 uncapped 也要 ≥0.90 ⇒ 本卷做不成，退回 D1 甲案桌心視窗」／丙「維持 ≥0.90 但量桌機 capped fps」。
➡️ **建議甲**。它沒有放寬評審那個 0.90，只是把它釘到唯一量得到的地方；被放寬的是「桌機那條」，而桌機那條本來就是輔助。**丙是明確錯的**：桌機 capped fps 在有／沒托盤下都是 59.9，那是把及格線搬到腳邊（`03 R2` 第 2 項），我已經把它寫進 T10 的假綠清單堵死。
**代價要先講**：甲的判定落在使用者側 ⇒ **0.55b 沒有實機三張截圖就不得宣告完成**（`CLAUDE.md` 回報紀律 ④ 送達證明的同一種精神）。

**Q5 側欄欄寬**：甲 168px（卡 168×88、桌心 492×256）／乙 192px（卡 192×76、桌心 444）／丙 140px（卡 140×110、桌心 548）。
➡️ **建議甲**。卡片比現況（133.3×98）寬 35px、矮 10px，四樣資訊（名稱／戰力＋系／招式行／部隊預覽）在更寬的行寬下換行更少；桌心 492 仍比現況 588 只少 16%。丙的桌心最大但卡片只剩 140 寬，比現在還窄，會把招式行擠成兩行以上。

**Q6 直式**：甲「整卷在直式維持 v0.53 版面（rails 收起、`#felt` 回玻璃、欄寬回 120px）」／乙「直式也掏空」。
➡️ **建議甲**。直式 390px 扣兩根 168px 側欄剩 −6px，版面直接爆；而 `#rotateHint` 本來就整片蓋住，玩家看不到。

**Q7 木紋／香灰／符咒的美術路線**：甲（D8 甲）「頂點色＋幾何先試一版」／乙「修訂 ART_BIBLE 開放環境物件可貼圖」。
➡️ **建議甲**。乙是改全案前提（ART_BIBLE `:8-9,78` 是 27 隻妖與三尊的共同基礎），不該由一個桌面質感的需求推翻。甲做完看 contact sheet 再議。

**Q8 分段**：甲「0.55a／0.55b 兩卷分別合併上線」／乙「一次做完再上」。
➡️ **建議甲**（§6 Q5）。

**Q9 血印令 3D 拍桌**：甲「另開 0.55c」／乙「塞進 0.55b」。
➡️ **建議甲**。它要新模型（血玉令牌）＋新音效（沉重木撞擊），而且要接 `S.marks` 的演出事件——跟本卷的「疊層與效能」是兩件不同的風險。

### 不必裁、但要知道的風險

1. **`#vignette`（`:40-41`，外圈 `rgba(0,0,0,.62)`、`z-index:-1`）夾在 canvas 與 UI 之間。** 橢圓 72%×78% 中心在 (50%,46%)，掏空窗（x 15%–85%／y 16%–82%）的四角會吃到 0.3–0.5 的黑。托盤在中心是安全的，但桌角的香灰與符咒會被壓暗。→ T12④ 人眼；必要時把 vignette 改成四邊 DOM 條。
2. **`glbCache` 永不淘汰**（§6 Q4 末段）。12 夜最壞會把 27 顆 GLB 全載進來。0.55b 只記錄 `info.memory`，不做 LRU。
3. **`#market` 這個 id 退役**。分母實查 9 處：`index.html` 5（CSS `:247`／`:251` portrait／樣板 3 處）、`layout-shot.mjs` 2（`:61-62`）、`mkt-probe.mjs` 1、`legend-drive.mjs` 1（`:61`）。做法是把後三支治具改吃 `--sel=`（收斂），不是逐支各寫一份新選擇器。
4. **`renderSeats()`（`:3819`）現在直接 `$("west").innerHTML=`**，會把卡片洗掉。所以 DOM 必須拆成 `#westSeat`／`#railW`（§2.1），`renderSeats` 只改兩行寫入目標。`renderSeats` 的呼叫點很多（出價、盯上、異事、開標⋯），少改一處就會出現「卡片突然消失」的間歇性 bug——T5 的逐一 tap 在第 1～3 夜的兩種頁面各跑一次，就是為了抓它。
5. **`#veil`（`:164`）是 `#felt` 的絕對定位子元素**。掏空頁不用它（黑幕發生在開標，那時已經切回玻璃面板），但 `#tray` 的 `z-index:1` 必須低於 `#veil` 的 6，否則黑幕蓋不住托盤命中層。

---

## 附：本計畫用到的實測探針（都在 scratchpad，唯讀 repo）

| 檔 | 量到什麼 |
|---|---|
| `table-perf.mjs` | 牌桌基準每幀 14 calls／855 tris／864.6 renders/s／passes 1／canvas opacity **1**（不是評審 §3.2.4 說的 0.38——0.38 是標題頁，`bridge-players.js:103-107` 的 `sceneKind()` 在牌桌回 `'table'`） |
| `layout-probe.mjs` | §6 Q2 那張 px 表（含 `#north` 兩塊 258px 空白、`clickableCount` 25） |
| `tray-cost3.mjs`／`tray-cost4.mjs` | 4 尊 GLB 上桌每幀 +119 calls／+31051 tris（描邊開）、+68／+17393（`?outline=0`）；`info.memory` 16→80 geometries、6→61 textures |
| `felt-base-v053.json` | felt-probe 基準表（12 格，11 格 0 ＋ seed1 第 3 夜出價 54） |
| `duelperf.json` | 對決 8v8 基準每幀 482 calls／176624 tris／113.6 capped fps |
| （repo 內，非我產出）`docs/experiments/2026-09-10-iphone-fps/README.md` | iPhone 牌桌 55–58 fps／14 calls／855 tris，commit `5e7993b` |
