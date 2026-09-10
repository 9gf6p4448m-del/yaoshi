# 0.55a 版面卷 工作日誌（分母清單）

> 卷＝ROADMAP_V2 Top 1「拍賣桌整片掏空」的 **0.55a 版面卷**（桌面先平面）。
> 權威規格＝`docs/proposals/2026-09-10-plan-table3d.md`＋凍結檔 `docs/experiments/2026-09-10-acceptance-table3d.md`（T0–T6）。
> 基準 commit＝`84b1a0c`（＝本 worktree 建立時的 HEAD，v0.53）。
> 本檔在動手**之前**先落地（`02 §6.1` 第 7 條「裝防線前一律先寫下分母」）。

---

## 分母 N1：`renderSeats()` 與 `#west`／`#east`／`#north` 的寫入點

計畫 §7 風險 4：`renderSeats()` 直接 `$("west").innerHTML=`，DOM 拆成 `#westSeat`／`#railW` 之後，
**任何一處漏改就會出現「側欄卡片間歇性消失」**。所以先數出「誰會覆寫這三個容器」。

### N1-a：真正做覆寫的地方 — **3 處，全部在 `renderSeats()` 內**

| 檔:行 | 原文 | 0.55a 改成 |
|---|---|---|
| `index.html:3823` | `$("north").innerHTML=seatHTML(1,hl(1));` | `$("northSeat").innerHTML=…` |
| `index.html:3824` | `$("west").innerHTML=seatHTML(2,hl(2));` | `$("westSeat").innerHTML=…` |
| `index.html:3825` | `$("east").innerHTML=seatHTML(3,hl(3));` | `$("eastSeat").innerHTML=…` |

全檔（`index.html`／`js/`／`tests/`）**沒有第 4 處**寫 `#west`／`#east`／`#north` 的 `innerHTML`：
`grep -n '\$("west")\|\$("east")\|\$("north")\|getElementById("west"\|getElementById("east"\|getElementById("north"'` 只命中上面三行。
⇒ **收斂**（`02 §6.1` 第 7 條首選）：把座位卡的寫入目標收進 `#*Seat` 之後，分母歸 1（只有 `renderSeats` 一支會動座位卡），
卡列（`#railW`／`#railE`）與北列兩塊（`#northPrev`／`#northShr`）由 `setHollow()`／`showMarket()`／`showMarkUI()` 獨佔寫入，兩邊互不覆蓋。

### N1-b：`renderSeats()` 的呼叫點 — **20 處**（`function renderSeats` 那一行不算）

`index.html:4204, 4293, 4343, 4380, 4469, 4745, 4754, 4762, 4823, 4831, 4883, 4887, 4905, 5552, 5554, 5581, 5617, 5631, 5646`（19 個 `renderSeats()`／`renderSeats([...])`）＋`5552` 的 `renderSeats([f.A.id,f.B.id])` 已含在內；`grep -c` 全檔 21 行含定義行 ⇒ 呼叫點 **20**。

**這 20 處在 0.55a 一行都不必改** —— 因為 `renderSeats` 只換寫入目標、不再碰 `#west`／`#east`／`#north` 本身。
這正是「收斂而不是逐點補」的差別：若走「每個呼叫點後面補一次 `renderRails()`」的路，分母就是 20 且漏一處即出間歇性 bug。

### N1-c：`.hollow` 的切換點 — **11 處 stage 寫入**（掏空只能依頁面切換，計畫 §6 Q1④）

`$("stage").innerHTML=`／`const stage=$("stage")` 的全部位置：

| 檔:行 | 畫面 | `setHollow` |
|---|---|---|
| `index.html:4199` | 開場教學卡 | `false` |
| `index.html:4311` | 異事・密封輸入（pick） | `false` |
| `index.html:4317` | 異事・密封輸入（number） | `false` |
| `index.html:4344` | 異事・開盅 | `false` |
| `index.html:4390` | **盯上宣告頁** | **`true`** |
| `index.html:4478` | **出價頁** | **`true`** |
| `index.html:4743` | 開標（放血公告／開標前公告／逐件揭曉，同一個 `stage` 變數 3 次寫入） | `false` |
| `index.html:4832` | 本夜成交總覽 | `false` |
| `index.html:4901` | 請神結算 | `false` |
| `index.html:5558` | 夜末戰況 | `false` |
| `index.html:5655` | 局末結果 | `false` |

`setHollow(false)` 同時負責**清空** `#railW`／`#railE`／`#northPrev`／`#northShr` ⇒ 這四個容器的生命週期收斂到一支函式。

---

## 分母 N2：`#market` 這個 id 的使用點 — **live 8 處＋註解 4 處**

計畫 §7 風險 3 說 9 處；實查（`grep -rn '#market\|id="market"\|getElementById(.market.)'`，排除 `bgm("market")`）如下。

**live（改了會壞的）8 處**

| 檔:行 | 用途 | 0.55a 處置 |
|---|---|---|
| `index.html:247` | `#market{display:grid;…}` CSS | 留著（`?table3d=0` 與非掏空頁仍用） |
| `index.html:253` | `@media portrait{#market{display:none}}` | 留著 |
| `index.html:4399` | 盯上頁樣板 `<div id="market">…` | 掏空時改吐 `#railW`／`#railE`；`?table3d=0` 走原路 |
| `index.html:4488` | 出價頁樣板 `<div id="market">…` | 同上 |
| `tests/tools/layout-shot.mjs:62` | `page.$('#market')` 截市集卡特寫 | **改吃 `--sel=`**（預設 `#market`，掏空時傳 `.rail`） |
| `tests/tools/legend-drive.mjs:61` | 橫向溢出選擇器清單含 `'#market'` | **改吃 `--sel=`**（預設沿用原清單＋`#railW,#railE`） |
| `tests/tools/mkt-probe.mjs`（2 處 `getElementById('market')`） | 橫向溢出定位掃描 | **改吃 `--sel=`**（預設 `#market`） |

**註解（不影響行為）4 處**：`index.html:122`、`index.html:144`、`index.html:244`、`tests/tools/mkt-probe.mjs:2`、`tests/tools/layout-shot.mjs:61`。

⇒ 治具三支**一律改吃 `--sel=`**（收斂），不逐支複製一份新選擇器（計畫 §7 風險 3 明訂）。

---

## 分母 N3：`#table [onclick]` 觸控命中基準清單

由 `node tests/tools/legend-drive.mjs --taps` 對**基準 `84b1a0c`**（靜態根 `.base84/`）實跑產生。
清單與逐項命中結果落在 `docs/experiments/2026-09-10-table3d-a-evidence/taps-base.json`，
本檔在 step 4 跑完後回填數字。

**回填（step 4 實跑）**：見本檔末段「N3 回填」。

---

## 本卷刻意**不**收斂的地方（寫下來免得下一手誤會）

1. **觸控白名單兩處字串**（`index.html:34` CSS `#felt,#sheetbox,#modalbox,#review,#selGrid`／`index.html:6430` JS 同一份）
   **一字不動**：`#tray` 是 `#felt` 的子元素，`closest()` 沿祖先鏈找 ⇒ 仍然命中（計畫 §6 Q1①）。
   新增的只有 `#tray{touch-action:manipulation}` 一條 CSS 規則。
2. **`js/` 一格不動**：0.55a 是純 DOM／CSS 卷，3D 層（托盤、木紋、Raycaster）全部在 0.55b。
3. **`#veil` 的 z-index 6 不動**：`#tray` 用 z-index 1，低於黑幕（計畫 §7 風險 5）。

---

## 基準靜態根 `.base84/`（暫時物，收工前刪）

`.base84/` ＝ `84b1a0c` 的 `index.html`＋`manifest.webmanifest` 實體複製，`js/`／`assets/`／`tests/` 用 **Windows junction** 接回 worktree
（0.55a 不動這三個目錄，所以接回來與基準等價）。給 `felt-probe --root=`／`legend-drive --root=`／`trace-eq <base>` 用。
**不進版控**（`git add` 從不指到它），驗證跑完即刪。
