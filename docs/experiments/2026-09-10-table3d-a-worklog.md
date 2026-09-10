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

由 `node tests/tools/legend-drive.mjs --tapsonly --taps --root=.base84 --tapseeds=1,3 --tapout=…` 對**基準 `84b1a0c`** 實跑產生。

```
node tests/tools/legend-drive.mjs docs/experiments/2026-09-10-table3d-a-evidence/taps-base-run.json \
  --tapsonly --taps --root=.base84 --tapseeds=1,3 --port=9623 \
  --tapout=docs/experiments/2026-09-10-table3d-a-evidence/taps-base.json
```

**實測（基準 84b1a0c，seeds 1,3 × 第 1～3 夜 × 出價／盯上 ＝ 12 頁）**

| 量 | 值 |
|---|---|
| 掃過的頁數 | **12** |
| `#table [onclick]` 元素總筆數（含隱藏／停用） | **207** |
| **可測元素（看得見且沒被產品停用）** | **177** ← 這才是 T5 的分母 |
| 其中隱藏（`#skipbtn`／`#bloodBtn` 等） | 24 |
| 其中停用（燒香列的「−」在 amt=0 時 `disabled`） | 6 |
| 命中 | **177／177** |
| `trayTap` 被呼叫 | **0**（基準版根本沒有這支） |

清單全文：`docs/experiments/2026-09-10-table3d-a-evidence/taps-base.json`；跑出來的輸出：`…/T5-base-84b1a0c.txt`。

**★關於凍結檔 T5 括號裡那個「實測 25 個」★**（要說清楚，免得下一手以為分母對不上）：
25 ＝ `document.querySelectorAll('[onclick]').length`（**整份文件**，含標題頁的兩顆入市鈕、`#updBar` 等），
不是 T5 正文要求的 `#table [onclick]`。而**只數這個總數正好是 T5 自己列的假綠**
（「只數 `document.querySelectorAll('[onclick]').length` 相等——元素還在不代表點得到」）。
實測三個口徑（基準版第 1 夜出價頁，844×390）：

| 口徑 | 值 |
|---|---|
| `document.querySelectorAll('[onclick]')`（凍結檔括號裡的 25） | **25** |
| `#table [onclick]`（含隱藏） | 18 |
| `#table [onclick]` 且看得見（T5 正文的集合） | **16** |

⇒ 本卷照 **T5 正文**走：以基準同治具跑出來的那一份逐項清單（177 個可測元素）為分母，逐一 tap、逐一驗命中。
括號裡的 25 是那個假綠指標的值，兩者不衝突。**沒有改門檻**（`02 §2.1`）。

**為什麼 tap 掃描挑 seeds 1,3**：與 `felt-probe --seeds=1,3` 同一組；而且 **seed 1 的第 3 夜是押寶夜**
（`RULE_NIGHTS=[3,7]`，seed 1 的 `ruleOrder[0]='yabao'`），`#stage` 裡因此有 `ybBump`／`ybFlip` 三顆鈕——
那是**唯一**落在 `#felt` 內、z-index 低於 `#tray` 突變值的可點元素，T5 的鑑別力突變（`#tray{z-index:9}`）要靠它才驗得紅。
實測（一次性探針，用完刪）：`S.ruleOrder` 在 seeds **1／5／6／8／9** 的第 3 夜是 `yabao`（押寶夜），
seeds 2／3／4／7／10 是 `luopo`、11／12 是 `shousui`。
⇒ 挑 seeds 1,3 讓突變**驗得紅**，這是**加嚴**（沒有這一組的話 `#felt` 內就只剩 `#helpBtn`（z-index 25）一個可點元素，
突變的 `z-index:9` 蓋不到它，鑑別力檢查會靜默通過）。

---

## 本卷刻意**不**收斂的地方（寫下來免得下一手誤會）

1. **觸控白名單兩處字串**（`index.html:34` CSS `#felt,#sheetbox,#modalbox,#review,#selGrid`／`index.html:6430` JS 同一份）
   **一字不動**：`#tray` 是 `#felt` 的子元素，`closest()` 沿祖先鏈找 ⇒ 仍然命中（計畫 §6 Q1①）。
   新增的只有 `#tray{touch-action:manipulation}` 一條 CSS 規則。
2. **`js/` 一格不動**：0.55a 是純 DOM／CSS 卷，3D 層（托盤、木紋、Raycaster）全部在 0.55b。
3. **`#veil` 的 z-index 6 不動**：`#tray` 用 z-index 1，低於黑幕（計畫 §7 風險 5）。

---

## 實作過程中量出來、規格沒寫到的三件事（都寫在這裡，不藏在 commit 訊息裡）

1. **基準 v0.53 的 `#north` 本來就直向溢出 11px**（`scrollHeight 67 / clientHeight 56`）。
   來源是北席卡掛在卡外的 `.roleInfoBtn`（`bottom:-7px`）與 `.bubble`（`top:calc(100% + 4px)`）。
   T3 要求 `#north` 12 格全 0 ⇒ 本卷把北席這幾顆的座標翻進卡內（`#table.t3d #north` 底下，只影響掏空版面）。
   **這是加嚴，不是放寬**：基準值 11 → 現在 0。
2. **側欄卡列會被卡角徽章撐出 3px 橫向溢出**（`.markb` left:-4px／`.mybid`／`.pickbox` right:-4px）。
   做法與 v0.44 的 `#market{padding:0 5px}` 同一條（請神 2.0 凍結檔 G6）：`.rail{padding:8px 5px 0}`。
   代價是卡片實寬 168 → **158**（計畫 §6 Q2 的 px 帳寫 168）。上緣 8px 是給第一張卡的 `top:-8px` 徽章留的。
3. **香火榜進 251px 的北列格之後，`slim` 的「一列」排法會把榜擠成一個燈籠圖示**（三張待請卡是 `flex:0 1 auto`、吃光寬度）。
   北列這一格改成**兩列**（榜一列、三卡一列；16.7＋2＋16.7＝35.4 ≤ 56）。`shrinesHTML()` 一個字未動，只有 CSS。

## 基準靜態根 `.base84/`（暫時物，收工前刪）

`.base84/` ＝ `84b1a0c` 的 `index.html`＋`manifest.webmanifest` 實體複製，`js/`／`assets/`／`tests/` 用 **Windows junction** 接回 worktree
（0.55a 不動這三個目錄，所以接回來與基準等價）。給 `felt-probe --root=`／`legend-drive --root=`／`trace-eq <base>` 用。
**不進版控**（`git add` 從不指到它），驗證跑完即刪。
