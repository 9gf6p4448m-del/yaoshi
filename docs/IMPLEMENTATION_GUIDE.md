# 妖市 實作手冊 — 給接手模型看的操作手冊

> **這份文件的存在理由**：原本開發這個專案的模型額度用完了，接手的模型看不到任何對話紀錄，只能讀檔案。
> 這份手冊的唯一考核標準是：**你沒看過原始對話，照著這份文件也能正確加一個新角色／新事件／新道具，
> 並且自己驗證有沒有做壞**。如果你看完某一節還是不知道「具體要改哪一行、改完要跑什麼指令確認」，
> 代表那一節寫得不夠好——請對照 `index.html` 的真實程式碼，不要只讀這份手冊就動手。
>
> 本文所有函式名、欄位名、行號都已對照 `index.html`（撰寫時共 1298 行）逐一核對，
> 並用 Node.js 實際執行驗證過本文列出的 5 個範例的程式邏輯與輸出數字（不是憑印象寫的）。

---

## 目錄

1. [30 秒認識這個專案](#1-30-秒認識這個專案)
2. [鐵則（違反就等於做壞了）](#2-鐵則違反就等於做壞了)
3. [五張資料表的欄位定義](#3-五張資料表的欄位定義)
4. [12 個 Hook 契約速查表](#4-12-個-hook-契約速查表)
5. [逐步範例（照抄可用）](#5-逐步範例照抄可用)
6. [工具用法](#6-工具用法)
7. [改動後的強制檢查清單](#7-改動後的強制檢查清單)
8. [部署流程](#8-部署流程)
9. [待辦清單](#9-待辦清單)
10. [常見陷阱](#10-常見陷阱)

---

## 1. 30 秒認識這個專案

**這是什麼遊戲**：手機橫向單機（或雙人同機熱座）的暗標拍賣遊戲，題材是深夜妖怪市集。
4 人（你 + 最多 3 個 AI）用**壽命**當籌碼，密封競標祖靈／香火／陰氣三系法寶湊套組（共鳴），
每輪標完後依固定輪轉表打一場對決，輸家扣壽命，壽命歸零出局，活到 12 夜（`CFG.ROUNDS`）者勝。
毒標可以把詛咒品硬塞給對手，也可以出價買下銷毀自保，形成勒索博弈。

**目前做到哪**：
- 規則骨架（`docs/GAME_DESIGN.md`）已於 2026-09-01 由使用者拍板 v1.0 凍結。
- 「地基 1」（架構重構：種子化亂數 + 五張資料表 + hook 分派器）已完成並通過等價驗收，commit `7d3bfa8`。
- 「地基 2」（平衡模擬器 `runMany` + 優勢策略窮舉器 `analyzeEvent`）已完成，commit `ea3650c`。
- **`WISHES`、`EVENTS`、`NIGHTRULES` 三張表目前是空殼**（`index.html` 第 326、330、334 行，
  `const WISHES = {};` 這種形式）——結構已定義好，但**沒有任何 engine 程式碼會去抽卡/觸發它們**。
  換句話說，就算你往這幾張表裡加一筆，遊戲裡也不會真的出現，因為「每夜怎麼發心願卡」「第幾夜觸發異事」
  這段串接程式碼還沒寫（這是刻意的，見 `docs/ARCH_SPEC.md` §7 裁定 J：「沒有消費者就不寫入」）。
- `ROLES` 表已有 4 個角色（`human`／`qingmian`／`hongyi`／`duanshou`），但**沒有選角 UI**，
  座位表由 `MODES`（第 318 行）寫死決定誰坐哪一位。

**程式在哪**：**唯一**要改的檔案是 `index.html`（單檔遊戲，HTML/CSS/JS 全部內嵌，撰寫時 1298 行）。
`<script>` 標籤從第 203 行開始到第 1296 行結束，所有邏輯都在這個標籤裡。

**目前版本**：`<title>` 寫的是「妖市 v0.4」（第 6 行）。

---

## 2. 鐵則（違反就等於做壞了）

### 2.1 只改 `index.html`

不要碰 `docs/` 下任何既有檔案（`ARCH_SPEC.md`、`GAME_DESIGN.md`）的內容——它們是規格與設計依據，
你改規則骨架前要先確認使用者同意（`docs/GAME_DESIGN.md` 第 5 行寫明「改規則骨架須依 02 §2.1 程序」）。

### 2.2 `tests/baseline-traces.json` 是凍結基準，**唯讀，任何情況都不得修改或重錄**

這個檔案記錄了 20 個種子（seed 1–20）在「地基 1」重構前的完整賽局軌跡（每夜市場、每筆出價、每場對決、
每個人的壽命/袋子/戰力），用來證明「重構沒有偷偷改變遊戲行為」。它是**驗收證據**，不是可調整的設定檔。
如果你的改動導致 `trace()` 的輸出跟這個檔案對不上，**要修的是你的程式，不是這個檔案**（除非那個差異
是預期中的「你確實改了遊戲內容」——見第 7 節與第 10 節的說明，那種情況也不是去改這個檔案，而是清楚
記錄「這裡差異是預期的，因為我加了 X」）。

### 2.3 **全域禁用 `Math.random()`**，一律走 `S.rng()`（演出用 `S.rngUi()`）

```js
// index.html 第 430-441 行
function mulberry32(a){ ... }
const rnd=(a,b)=>a+Math.floor(S.rng()*(b-a+1));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(S.rng()*(i+1));...}return a;};
```

**為什麼**：整個平衡模擬器（`runMany`）、優勢策略窮舉器（`analyzeEvent` 的驗證流程）、以及基準比對
（`trace()` vs `baseline-traces.json`）全部依賴「同一個 seed 每次都跑出完全一樣的結果」。只要有一處
用了 `Math.random()`，這個賽局就不可重現，模擬器統計出來的勝率毫無意義，基準比對也永遠對不上。

**兩條隨機流分開的原因**（第 431 行的註解）：`S.rng` 是玩法流（洗牌、AI 抖動、平標決勝），
`S.rngUi` 是純演出流（挑台詞用，見 `sayFrom`，第 709 行 `arr[Math.floor(S.rngUi()*arr.length)]`）。
分開是為了讓「有沒有播動畫」不會改變賽局結果——如果台詞挑選也消耗 `S.rng()`，那麼 headless 模擬
（不播動畫）跑出來的結果會跟真人在瀏覽器裡玩（有播動畫）不一樣，模擬器就失去意義了。

**加新內容時的規則**：任何新的隨機行為（新道具要抽random效果、新異事要密封擲骰）一律用 `S.rng()`；
如果那個隨機純粹是演出用（例如挑一句新台詞），才用 `S.rngUi()`。

### 2.4 引擎函式內不得寫內容專屬的 id 字串比對

`resolveAuction`、`resolveBattles`、`power`、`facCount` 這些**引擎函式**（不是資料表裡的 hook 實作）
不准出現 `if (id === 'bow')` 這種寫法。新增內容一律是「往 `ABILITIES`／`ROLES`／`WISHES`／`EVENTS`／
`NIGHTRULES` 五張表加一筆」，這一筆自帶 `hooks`／`flags`／`traits`，由 `collectEffects`／`applyHooks`／
`hasFlag`／`traitMax` 這幾個通用分派函式去找到它、呼叫它。

注意：**資料表裡的 hook 實作本身**檢查自己的 id 是允許的、也是必要的模式——例如 `ABILITIES.bow` 的
`onBattle` hook 寫 `if(has(ctx.w,"bow")) ctx.dmg+=2;`（第 239 行），這是「這個能力在檢查『觸發它的
是不是我自己』」，跟「引擎函式寫死某個 id」是完全不同的兩件事。你會在第 5 節的每個範例裡看到這個模式。

### 2.5 同名法寶的能力**不疊加**（設計決定，不是 bug）

```js
// index.html 第 443 行
const has=(p,ab)=>p.bag.some(x=>x.ab===ab);
```

`has()` 用 `.some()`，回傳布林值，不管袋子裡有幾把射日神弓，`has(p,"bow")` 都只回傳 `true`/`false`。
這是 `docs/ARCH_SPEC.md` §7 議題 C 的明確裁定：「維持不疊加。理由：本輪是純重構不得改行為；
且疊加會讓數值爆炸」。**不要「順手修好」這個行為**——它不是遺漏，是決定。
（已知的待辦：UI 要標示「能力不疊加」給玩家看，見第 9 節待辦 1。）

---

## 3. 五張資料表的欄位定義

原始定義寫在 `index.html` 第 223–234 行的註解區塊，統一形狀：

```js
{ id, name, desc, hooks:{ ... }, flags:[...], traits:{...}, order }
```

| 欄位 | 型別 | 必填/選填 | 預設值 | 用途 |
|---|---|---|---|---|
| `id` | string | 必填 | 無 | 唯一鍵，程式用（袋中道具靠 `item.ab === id` 找回這一筆） |
| `name` | string | 必填 | 無 | 顯示名（UI 直接顯示這個字串） |
| `desc` | string | 必填 | 無 | 玩家看到的效果說明（顯示在標單/袋子裡） |
| `hooks` | object | 選填 | `{}`（省略即可） | 只寫用得到的 hook，key 是 hook 名稱、value 是 `function(ctx){...}`。見第 4 節 |
| `flags` | string[] | 選填 | 省略 | 靜態布林特性，引擎用 `hasFlag(p,'xxx')` 查。給**沒有天然 hook 掛點**的能力用 |
| `traits` | object | 選填 | 省略 | 靜態數值特性，引擎用 `traitMax(p,'key',預設值)` 取「所有生效來源裡的最大值」 |
| `order` | number | 選填 | `100` | 同一次 `applyHooks` 內，多個 effect 的生效優先序，**數字小的先跑** |

### `order`／`flags`／`traits` 三者怎麼選

**判斷順序：先問「這個能力有沒有一個自然的 hook 時機」**

1. **有明確觸發時機、且要改變某個數值或流程** → 用 `hooks`。例如「戰勝時對手 -2」是 `onBattle` 時機、
   改 `ctx.dmg`；「開標時比價要加成」是 `onBidEff` 時機、改 `ctx.eff`。**這是最常見的情況。**
2. **純粹是一個開關式的靜態特性，沒有計算邏輯、也沒有自然的觸發時機** → 用 `flags`。
   範例：椅仔姑竹椅「看穿所有對手的實際壽命」——這不是在某個時間點觸發一次的事件，是「只要持有，
   全程生效」的資訊權限。`index.html` 第 286 行：
   ```js
   chair:{id:"chair",name:"椅仔姑竹椅",desc:"看穿所有對手的實際壽命", flags:["xrayLife"]},
   ```
   引擎用 `chairSeen()`（第 446 行）→ `hasFlag(p,"xrayLife")` 去查「有沒有活著的人類持有這個 flag」，
   不需要另開一個 hook。
3. **靜態的數值上限/門檻，且多個來源可能同時提供，要取最大值** → 用 `traits`。
   範例：千里眼銅鈴「明夜預告顯示兩件拍品」——`preview` 這個數字不是某個時間點的加總計算，
   是「你能看到幾件」的門檻，且如果未來有兩個道具都給預告加成，應該取較大值而不是疊加。
   `index.html` 第 270 行：
   ```js
   bell:{id:"bell",name:"千里眼銅鈴",desc:"明夜預告顯示兩件拍品", traits:{preview:2}},
   ```
   引擎用 `traitMax(ap,"preview",1)`（第 736 行 `showMarket()` 裡）——預設值 1（沒有這張牌時看 1 件），
   有這張牌就取 `max(1,2)=2`。

**`order` 只在你確定「多個 effect 會修改同一個 ctx 欄位、且順序會影響結果」時才需要設**。
省略就是 100，跟其他省略 `order` 的 effect 一樣，按收集順序生效（穩定排序，不會亂）。
目前唯一用到 `order` 的地方是 `onBattle` 的四個能力（第 5.1 節裁定 E 的教訓，見第 10 節）：
`bow:10`、`shield:20`、`hairpin:30`、`nail:40`——因為這四個都會改 `ctx.dmg` 或推 `ctx.extra`，
順序會影響戰報訊息的排列，設 `order` 是為了讓行為可重現、不隨機。

### 五張表各自的角色

| 表 | 常數位置 | 現況 | 這次要加內容時注意什麼 |
|---|---|---|---|
| `ABILITIES` | `index.html:237` | 17 個法寶能力已實作 | 純資料，新增後**必須**被某個 `POOL`/`CURSES` 項目的 `ab` 欄位引用，否則永遠不會出現在遊戲裡（見範例 1） |
| `ROLES` | `index.html:305` | 4 個角色（1 人類 + 3 AI） | 新增後**必須**被 `MODES.seats`（`index.html:318`）排進某個模式的座位表，否則玩家永遠選不到、AI 也永遠不會用（見範例 3） |
| `WISHES` | `index.html:326` | 空殼 `{}` | 目前沒有引擎程式碼會抽卡/判定——加進去只是定義資料，不會在遊戲裡出現，見範例 4 |
| `EVENTS` | `index.html:330` | 空殼 `{}` | 同上，沒有「第幾夜觸發哪個異事」的串接程式碼，見範例 5 |
| `NIGHTRULES` | `index.html:334` | 空殼 `{}` | 同上，目前沒有任何地方會把 `S.nightRule` 設成非 `null` |

---

## 4. 12 個 Hook 契約速查表

**分派機制**（`index.html:343-371`）：`collectEffects(p, order)` 依序收集「p 的角色 → p 袋中每件
有 `ab` 的道具（依袋中順序）→ `S.nightRule` → `S.event`」，去重後依 `order` 數字排序；
`applyHooks(name, ctx, p)` 對排序後的每個 effect，若它有 `hooks[name]` 就呼叫 `hooks[name](ctx)`。
`p` 可以是單一玩家、玩家陣列（雙方 effect 合併去重）、或 `null`（只取全域的 `nightRule`／`event`）。

**寫 hook 時的鐵律**：hook 內只准碰 `ctx` 與自己這一筆資料，直接改 `ctx` 的欄位，**不回傳值**。

| # | Hook 名稱 | 觸發位置（函式:行號） | `ctx` 形狀 | effect 該改什麼 | 呼叫時 `p` 是什麼 |
|---|---|---|---|---|---|
| 1 | `onItemValue` | `power():506` | `{p, item, value}` | `ctx.value`（單件道具的戰力值，預設 `item.p`） | 該道具擁有者 `p`（單一） |
| 2 | `onFacCount` | `facCount():497` | `{p, faction, count}` | `ctx.count`（該陣營件數，用於共鳴判定） | `p`（單一） |
| 3 | `onPowerCalc` | `power():515` | `{p, itemSum, resonance, flat:0, resonanceMul:1}` | `ctx.flat` 或 `ctx.resonanceMul`；最終戰力 = `itemSum + resonance*resonanceMul + flat` | `p`（單一） |
| 4 | `onBidCap` | `consCapFor():527` | `{p, cap}`（預設 `floor(life/CFG.CONS_CAP_DIV)`） | `ctx.cap`（保守標上限） | `p`（單一） |
| 5 | `onBudget` | `budgetFor():522` | `{p, budget}`（預設 `p.life`） | `ctx.budget`（一輪出價總額上限） | `p`（單一） |
| 6 | `onBidEff` | `resolveAuction():590` | `{p, bid, item, eff}`（預設 `eff=bid.amt`） | `ctx.eff`（比價用的有效值） | 出價者 `e.p`（單一） |
| 7 | `onBidSettle` | `resolveAuction():603` | `{p, bid, item, isWinner, cost, events}` | `ctx.cost`（實付/退款金額），可 `ctx.events.push({txt})` | 出價者 `e.p`（單一） |
| 8 | `onWinItem` | `resolveAuction():621` | `{winner, item, target, events}`（`target` 僅毒標時有值） | 直接改 `winner`/`target` 的欄位（如 `.bag`、`.life`），可 push `events` | **陣列** `[winner.p, target]` |
| 9 | `onBattle` | `resolveBattles():654` | `{w, l, pw, pl, pwRaw, plRaw, extra, dmg}` | `ctx.dmg`，可 push `ctx.extra` | **陣列** `[w, l]` |
| 10 | `onNightEnd` | `resolveBattles():665` | `{p, log}` | 直接改 `p.life`，可 push `ctx.log` | `p`（單一），且 `HOOK_ORDER.onNightEnd="itemsFirst"`——**道具先於角色**跑 |
| 11 | `onMarketDraw` | `drawMarket():492` | `{market, round}` | `ctx.market`（可整個改寫拍品陣列） | `null`（只取全域 `nightRule`／`event`，與玩家無關） |
| 12 | `onReveal` | `startReveal():844` | `{reveal, viewerId, showEntries, showTypes}` | `ctx.showEntries`／`ctx.showTypes`（是否顯示出價明細/標書型態） | `S.players[viewerId]`（單一） |

> 平標決勝順序（`resolveAuction`，第 593-596 行）：`onBidEff` 算完所有出價的有效值 → 取最大值 →
> 平手時**風位優先**（`windPid(S.round)`）→ 仍平則 `S.rng()` 隨機決。

---

## 5. 逐步範例（照抄可用）

> 以下 5 個範例的程式碼片段都已用 Node.js 實際載入 `index.html` 的 `<script>` 內容執行過、
> 核對輸出數字正確，不是憑印象編的。每個範例後面的「驗證」都附**實測過的具體數字**。

### 範例 1：加一個新法寶能力（被動 + hook）

**目標**：新增一件法寶「當鋪契約書」，效果是「你的保守標上限額外 +2」（用 `onBidCap` hook）。

**Step 1** — 在 `ABILITIES`（`index.html:237` 開始的物件）裡加一筆，放在任何一個既有項目之間或最後都可以
（緊接在 `buoy` 那筆後面、`};` 之前，約第 299-300 行）：

```js
dangwu:{id:"dangwu",name:"當鋪契約書",desc:"你的保守標上限額外 +2",
  hooks:{ onBidCap(ctx){ ctx.cap+=2; } }},
```

**Step 2** — 讓這件能力真的會出現在牌局裡：在 `POOL`（`index.html:379` 開始的陣列）裡加一筆引用它，
`ab` 欄位填 `"dangwu"`（必須跟 `ABILITIES` 裡的 `id` 一致）：

```js
{n:"當鋪契約書",f:"xianghuo",p:5,ab:"dangwu",d:"寫滿密密麻麻小字的當票"},
```

**驗證**：這是純粹的數值 hook，不牽涉演出，最快的驗證方式是打開瀏覽器 console（或用 Node 載入
`index.html` 的 script，見第 6 節）直接呼叫：

```js
const {consCapFor} = window.__yaoshi;
const p = {life:40, bag:[]};
console.log(consCapFor(p));  // 實測：13（= floor(40/3)，CFG.CONS_CAP_DIV=3）
p.bag.push({n:"當鋪契約書",f:"xianghuo",p:5,ab:"dangwu",d:"test"});
console.log(consCapFor(p));  // 實測：15（13+2，證明 onBidCap hook 生效）
```

**注意**：因為你把新項目加進了 `POOL`，牌堆長度變了，`trace()` 基準比對**會**出現差異——
這是預期行為，不是你做壞了，詳見第 7 節與第 10 節的說明。

---

### 範例 2：加一個新命格道具（壽命↔戰力連動，會讀 `p.life`）

**目標**：新增命格道具「破軍旗」（`docs/GAME_DESIGN.md` 六之二已定義規格）：
「壽命每低於 20 一點，戰力 +0.6（上限 +12，即壽命 0 時封頂）」，用 `onPowerCalc` hook。

**Step 1** — 加進 `ABILITIES`：

```js
pojun:{id:"pojun",name:"破軍旗",desc:"壽命每低於 20 一點，戰力 +0.6（上限 +12）",
  hooks:{ onPowerCalc(ctx){
    ctx.flat += Math.min(12, Math.max(0, 20-ctx.p.life) * 0.6);
  } }},
```

注意這裡用 `ctx.p.life` 讀「當下這位玩家的壽命」——這正是「壽命↔戰力連動」的關鍵：`onPowerCalc` 的
`ctx.p` 就是正在計算戰力的那個玩家物件，直接讀 `ctx.p.life` 就能拿到即時壽命，不需要額外傳參數。

**Step 2** — 加進 `POOL`（命格道具是法寶池的子集，`docs/GAME_DESIGN.md` 六之二）：

```js
{n:"破軍旗",f:"xianghuo",p:2,ab:"pojun",d:"殘破的軍旗，插在心口才有力氣"},
```

**驗證**（實測數字）：

```js
const {power} = window.__yaoshi;
const p2 = {life:10, bag:[{n:"破軍旗",f:"xianghuo",p:2,ab:"pojun"}]};
console.log(power(p2));  // 實測：8 = 道具本身戰力2 + flat(min(12,(20-10)*0.6)=6)

const p4 = {life:40, bag:[{n:"破軍旗",f:"xianghuo",p:2,ab:"pojun"}]};
console.log(power(p4));  // 實測：2（壽命40 ≥20，flat加成=0，只剩道具本身戰力）
```

壽命越低、額外戰力越高，且封頂在 +12（壽命降到 0 時 `(20-0)*0.6=12`，剛好碰頂）。
`docs/GAME_DESIGN.md` 六之二要求這類係數屬於「【試玩必調】」，實作完後要用 `runMany`
分別讓搏命/守財/主動轉換三條路線各跑 20 局比較勝率（見第 6 節）。

---

### 範例 3：加一個新角色（含被動與 AI 行為模式）

**目標**：新增角色「山猴子精」，被動是「戰勝時額外回 1 壽命」（用 `onBattle` hook，且要判斷
「贏的人是不是我自己」——角色被動跟法寶能力一樣，`applyHooks` 會把雙方的 effect 都收集進來，
所以 hook 內部要自己檢查 `ctx.w.roleId` 是不是自己）。

**Step 1** — 加進 `ROLES`（`index.html:305` 開始，放在 `duanshou` 之後）：

```js
mountain:{id:"mountain",name:"山猴子精",av:"🐒",ai:{aggr:0.6,spite:0.3},
  hooks:{ onBattle(ctx){
    if(ctx.w.roleId!=="mountain") return;   // 只有贏家是自己這個角色時才生效
    ctx.w.life+=1;
    ctx.extra.push(`${ctx.w.name} 的山猴子精偷了口氣 +1`);
  } },
  lines:{win:["嘿嘿嘿～"],lose:["唧唧唧！"],poison:["拿去！"],poisoned:["吱！"],
    bwin:["哦嘿嘿～"],blose:["唧…"]}},
```

`ai:{aggr,spite}` 是 AI 出價行為的兩個參數，會被 `aiBids()`（`index.html:530`）拿去決定
「有多積極出價」（`aggr`）跟「有多常對詛咒品下毒標害人」（`spite`）——照抄現有角色的數值範圍
（`qingmian` 是 `{aggr:0.85,spite:0.25}`，`hongyi` 是 `{aggr:0.6,spite:0.6}`）就好，不用自己發明公式。

**Step 2（先不做）** — 如果要讓玩家真的能在遊戲裡遇到這個角色，需要把它排進 `MODES.seats`
（`index.html:318`）取代掉某一個現有座位。**這一步先不要做**：目前沒有選角 UI，`MODES.seats` 是
寫死的座位表，換掉一個座位等於**修改了那個模式既有的行為**（那個座位原本的 AI 個性、原本消耗
`S.rng()` 的方式都變了），這屬於「改既有行為」，要走第 7 節檢查清單的第①條完整跑基準比對，
而不是「純新增」。單純把角色定義加進 `ROLES` 表、不動 `MODES`，是安全、不影響任何現有賽局的。

**驗證**（不需要真的跑遊戲，直接手動建構 `ctx` 呼叫 hook，實測數字）：

```js
const {applyHooks, ROLES} = window.__yaoshi;
const w = {id:0, name:"測試贏家", roleId:"mountain", life:20, bag:[]};
const l = {id:1, name:"測試輸家", roleId:"qingmian", life:15, bag:[]};
const ctx = {w, l, pw:10, pl:5, pwRaw:10, plRaw:5, extra:[], dmg:3};
applyHooks("onBattle", ctx, [w, l]);
console.log(w.life);   // 實測：21（20+1，被動生效）
console.log(ctx.extra); // 實測：["測試贏家 的山猴子精偷了口氣 +1"]
console.log(ctx.dmg);   // 實測：3（不變，這個被動不影響傷害數值）
```

---

### 範例 4：加一張新心願卡

**目標**：新增心願「夜訪陰氣」——「本夜拿下任一陰氣法寶，+4 壽命」（`docs/GAME_DESIGN.md` 六之三 D
已列出這張的文字版：「拿下任一陰氣法寶」「+4」）。

**重要提醒**：`WISHES` 表目前完全沒有消費者（見第 1 節、第 3 節）。這個範例教你怎麼把設計文件的一句話
變成符合 `{id,name,desc,check(ctx){...},reward(ctx){}}` 形狀的資料，**並用手動呼叫證明邏輯正確**；
但它加進表裡之後**不會**在遊戲裡真的發生，因為「每夜怎麼發心願卡給玩家」「夜末怎麼遍歷每個人的
`p.wish` 呼叫 `check`/`reward`」這段串接程式碼還沒被規格化、也還沒寫。**不要自己發明這段串接邏輯**
——那是之後「地基 3」的工作範圍，串接方式要先確認清楚（例如：`check(ctx)` 的 `ctx` 到底該包含哪些
欄位、心願結果什麼時候公開）才能寫，本手冊沒有把它定案，你也不應該自己定案。

**Step 1** — 加進 `WISHES`（`index.html:326`，目前是 `const WISHES = {};`）：

```js
const WISHES = {
  wish_yinqi:{id:"wish_yinqi",name:"夜訪陰氣",desc:"本夜拿下任一陰氣法寶，＋4壽命",
    check(ctx){ return ctx.p.bag.some(x=>x.f==="yinqi" && !x.curse); },
    reward(ctx){ ctx.p.life+=4; }},
};
```

**驗證**（手動建構 `ctx={p}` 呼叫，實測數字）：

```js
const wish = window.__yaoshi.WISHES.wish_yinqi;
const p1 = {life:30, bag:[{n:"黃色小雨衣",f:"yinqi",p:5,ab:"raincoat"}]};
const p2 = {life:30, bag:[{n:"射日神弓",f:"zuling",p:7,ab:"bow"}]};
console.log(wish.check({p:p1}));  // 實測：true（袋中有陰氣法寶）
console.log(wish.check({p:p2}));  // 實測：false（袋中是祖靈法寶）
if(wish.check({p:p1})) wish.reward({p:p1});
console.log(p1.life);  // 實測：34（30+4）
```

---

### 範例 5：加一個新異事

**目標**：把「試膽大會」（`docs/GAME_DESIGN.md` 六之三 B，已修正為少數決版本）實作成 `EVENTS` 表項目。
**這個範例會示範完整流程，包含強制閘門**：任何新異事上線前，必須先用 `analyzeEvent()` 窮舉驗證
不存在優勢策略（`docs/GAME_DESIGN.md` 六之四），**這一步不能跳過，也不能用「感覺應該沒問題」代替**。

**Step 1（先做，不能省）** — 用 `analyzeEvent` 的 `{players, options, payoff}` 格式描述這個事件的
賽局結構，跑窮舉驗證。注意 `analyzeEvent` 吃的格式跟 `EVENTS` 表項目的格式**不一樣**——
`analyzeEvent` 是設計階段的驗證工具，`EVENTS` 表是最終要接進遊戲的資料格式，兩者是兩件事：

```js
const {analyzeEvent} = window.__yaoshi;
const spec = {
  players:4, options:["in","out"],
  payoff(choices){
    const n=choices.length, countIn=choices.filter(c=>c==="in").length, countOut=n-countIn;
    if(countIn===0||countOut===0) return choices.map(()=>-3);
    if(countIn===countOut) return choices.map(()=>-1);
    const inIsMinority=countIn<countOut;
    return choices.map(c=>c==="in"?(inIsMinority?6:-3):(inIsMinority?-3:6));
  }
};
console.log(analyzeEvent(spec).verdict);  // 實測：'PASS'（不存在優勢策略、無免費午餐）
```

（這個 payoff 邏輯其實就是 `index.html:1196` 已經寫好的 `EVENT_NEW_SHRINE` 測試治具，
可以直接呼叫 `window.__yaoshi.demoEvents.newShrine` 拿到同一份 spec，不用重寫。）

**如果 `verdict` 是 `'FAIL'`**：`dominant` 陣列會列出哪個玩家在哪個選項上有優勢策略、
`freeLunch` 會告訴你是不是「全員選同一項就穩賺」。**這種情況要重新設計規則本身，不是調數值**
——`docs/GAME_DESIGN.md` 六之四明講：「靠眼睛看／人肉試玩不算數，必須是這支窮舉程式回報
『不存在優勢策略』才算通過」。

**Step 2** — 通過閘門後，寫成 `EVENTS` 表項目的資料格式（`{id,name,desc,input,settle(ctx)}`）。
跟範例 4 一樣，**`settle(ctx)` 目前沒有任何引擎程式碼會呼叫它**（沒有「第 4/8/11 夜觸發哪個異事、
怎麼收集每人的密封選擇」這段串接），這裡只示範怎麼把驗證過的 payoff 邏輯轉成會真的改 `p.life` 的
函式，並手動驗證：

```js
const EVENTS = {
  shrine:{id:"shrine",name:"試膽大會",desc:"密封選擇「進廟」或「留下」，人少的一邊贏",
    input:"pick",
    settle(ctx){
      // ctx = { players, choices, events }；choices: {playerId: "in"|"out"}
      const ids=ctx.players.map(p=>p.id);
      const countIn=ids.filter(id=>ctx.choices[id]==="in").length;
      const countOut=ids.length-countIn;
      if(countIn===0||countOut===0){
        ctx.players.forEach(p=>p.life-=3);
        ctx.events.push({txt:"無人響應試膽，全體 -3"});
        return;
      }
      if(countIn===countOut){
        ctx.players.forEach(p=>p.life-=1);
        ctx.events.push({txt:"進廟人數平分，雙方各 -1"});
        return;
      }
      const minority = countIn<countOut ? "in" : "out";
      ctx.players.forEach(p=>{
        const win = ctx.choices[p.id]===minority;
        p.life += win?6:-3;
      });
      ctx.events.push({txt:`人少的一邊（${minority==="in"?"進廟":"留下"}）獲勝，+6／-3`});
    }},
};
```

**驗證**（實測數字，4 人中 1 人選 in、3 人選 out，少數方應該贏）：

```js
const players=[{id:0,life:40},{id:1,life:40},{id:2,life:40},{id:3,life:40}];
const ctx={players, choices:{0:"in",1:"out",2:"out",3:"out"}, events:[]};
EVENTS.shrine.settle(ctx);
console.log(players.map(p=>p.life));  // 實測：[46, 37, 37, 37]（少數方0號+6，多數方各-3）
console.log(ctx.events);              // 實測：[{txt:"人少的一邊（進廟）獲勝，+6／-3"}]
```

---

## 6. 工具用法

### 6.1 `?sim=1` 工具頁

在網址後面加 `?sim=1` 打開（例如本機 `file:///.../index.html?sim=1` 或線上網址加這個查詢字串）。
`index.html:417` 的 `SIM_MODE` 常數偵測到這個參數後，`index.html:1288` 會呼叫 `initSimTool()`
（第 1253 行）**取代**整個頁面內容，變成一個統計工具頁，不會跑正常遊戲流程、也不共用正常遊戲的 DOM。

頁面上有兩個按鈕：
- **「跑 runMany」**：輸入局數 `n`，對 `greedy`／`hoarder`／`splitter` 三個策略各跑 `n` 局，
  輸出 markdown 格式的統計表格（勝率、平均存活夜數、平均最終壽命/戰力、陣營得標次數）。
- **「跑窮舉器雙向測試」**：直接跑 `analyzeEvent(EVENT_OLD_SHRINE)` 與 `analyzeEvent(EVENT_NEW_SHRINE)`，
  用來確認窮舉器本身還正常運作（舊版必須 FAIL、新版必須 PASS）。

### 6.2 `runMany(opts)` — 平衡統計

```js
window.__yaoshi.runMany({ seeds:[1,2,...,500] })       // 或
window.__yaoshi.runMany({ n:500 })                       // 等同 seeds:[1..500]
window.__yaoshi.runMany({ n:500, policies:{0: window.__yaoshi.POLICIES.hoarder} })
```

`policies` 只覆寫非 AI 座位（solo 模式只有 id 0 是人類）的出價策略，AI 座位一律照舊走 `aiBids()`。
不給 `policies` 就用預設的 `scriptedBids`（永遠標市場上 `p` 值最高的一件，保守標，金額 `min(cap,5)`）。

回傳物件的欄位：`games`（局數）、`winRate`（每個座位的勝率陣列）、`avgSurvivalNights`、
`avgFinalLife`、`avgFinalPower`、`lifeCurve`（每夜平均壽命曲線）、`factionWinCounts`（各陣營得標次數）、
`unsoldRate`（流標率）、`poisonUsageRate`（毒標使用率）、`avgGameLength`（平均對局長度）。

`POLICIES`（`index.html:1039`）目前有三個策略函式：
- `greedy`：標市場上 p 值最高的一件（等同 `scriptedBids`）
- `hoarder`：只鎖定 p≥6 的「大貨」，其餘完全不出價，湊不到就寧可押命標也要拿
- `splitter`：對排名前 3 高的拍品各下一筆小額（1-2）保守標，分散出價

想把結果貼進文件，用 `statsToMarkdown(stats, title)` 轉成 markdown 表格字串。

### 6.3 `analyzeEvent(spec)` — 優勢策略窮舉

```js
window.__yaoshi.analyzeEvent({ players:4, options:["A","B"], payoff(choices){ return [...]; } })
```

- `players`：玩家數（整數）
- `options`：這個事件每人可選的選項陣列（字串或任何值都行，只要 `payoff` 認得）
- `payoff(choices)`：`choices` 是長度 = `players` 的陣列（每人選了哪個 option），回傳長度 = `players`
  的收益陣列。**組合數 = `options.length ** players`，超過 200 萬會直接 throw**（見 `index.html:1150`），
  選項或人數要设計得夠小。

回傳 `{dominant, freeLunch, verdict, detail}`：
- `verdict`：`'PASS'`（可以用）或 `'FAIL'`（`dominant` 非空、或 `freeLunch` 為真）
- `dominant`：陣列，每筆 `{player, option, strict}` 表示「這個玩家選這個選項，不論對手怎麼選都不劣於
  選其他選項」——存在即代表這個事件沒有兩難，等於形同虛設，**必須重新設計規則**
- `freeLunch`：布林，`true` 代表存在「全員選同一項，每個人收益都 >0」的組合——等於白撿，同樣要重設計
- `detail`：每個玩家、每個選項在各種對手組合下的完整收益表，用來人工檢查邏輯有沒有寫錯

### 6.4 `trace(seeds)` — 跟凍結基準比對

```js
window.__yaoshi.trace([1,2,3,...,20])
```

回傳 `{seeds, runs}`，`runs` 是每個種子跑一整局的完整快照（每夜市場、賽前快照、開標結果、
賽中快照、對決結果、夜末結算、賽後快照）。**這個函式本身不比對任何東西**，比對要自己做——
最可靠的方式是用 Node.js 直接載入 `index.html` 的 `<script>` 內容執行（瀏覽器 devtools 貼上
`window.__yaoshi.trace(...)` 再手動跟檔案內容比對容易出錯，Node 腳本可以做到逐位元組相等）：

```js
// 存成任意 .js 檔執行（例如 scratchpad 目錄），需要 Node.js
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const code = html.match(/<script>[\s\S]*?<\/script>/)[0]
  .replace('<script>', '').replace('</script>', '');
const stub = `
global.location = { search: '' };
global.document = { getElementById: ()=>null, addEventListener:()=>{}, title:'',
  documentElement:{style:{}}, body:{style:{},cssText:''} };
global.window = {};
`;
eval(stub + code + '\nglobal.__trace = trace;');
const result = global.__trace([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
const baseline = JSON.parse(fs.readFileSync('tests/baseline-traces.json', 'utf8'));
console.log(JSON.stringify(result) === JSON.stringify(baseline) ? '完全相等' : '有差異——需要人工比對哪裡不同');
```

這段腳本本手冊撰寫時已用 Node.js 實測跑過（用來驗證範例 1 會破壞基準、範例 3/4/5 不會），
可以直接照抄使用，不需要自己重新設計比對方式。

---

## 7. 改動後的強制檢查清單

每次改完 `index.html` 都要照這份清單勾過一遍，不能只跑一部分就宣告完成：

- [ ] **等價性判斷（先分類，再決定怎麼比對）**：
  - [ ] 若改動的是**既有行為**（改了現有 hook 的實作、改了 `CFG` 裡的數值、改了現有資料表項目的
        效果、把某個新角色排進了 `MODES.seats`）→ 用第 6.4 節的腳本重新產生 `trace(1..20)`，
        必須跟 `tests/baseline-traces.json` **逐位元組相等**，除非你能明確指出「差在哪、為什麼」
        且那個差異是你**有意識**要做的改動（不是意外）。
  - [ ] 若是**純新增**、而且新內容**沒有**被排進 `POOL`／`CURSES`／`MODES.seats`（例如：新 `ROLES`
        項目沒動 `MODES`、`WISHES`/`EVENTS`/`NIGHTRULES` 新增項目）→ 一樣跑 `trace(1..20)`，
        **必須跟基準逐位元組相等**（因為沒有任何東西進入牌局或座位表，亂數消耗序列完全沒變）。
  - [ ] 若新增內容進了 `POOL`／`CURSES`（新法寶、新命格道具、新詛咒品）→ `trace()` 基準比對
        **預期會出現差異，這是正常的**（牌堆陣列長度變了，`shuffle()` 消耗亂數的方式跟著變，
        跟你新加的能力邏輯對不對無關）。這種情況改用**單元測試**驗證：把新項目手動塞進一個假的
        玩家物件的 `bag`，呼叫 `power()`／`consCapFor()`／`budgetFor()` 等相關函式，核對數值符合
        設計文件描述（照抄第 5 節範例 1、2 的驗證方式）。
- [ ] `grep -c "Math.random" index.html` 輸出必須是 `0`
- [ ] 瀏覽器打開頁面，console **0 error**（正常遊戲頁跑一輪完整流程，`?sim=1` 頁面也要開一次確認）
- [ ] 手機 844×390（瀏覽器 devtools 裝置模擬這個尺寸）畫面沒有溢出、沒有重疊、按鈕點得到
- [ ] **若加的是新異事**（`EVENTS` 表新增項目）→ 必須先用 `analyzeEvent()` 對其 payoff 結構跑窮舉，
      `verdict` 必須是 `'PASS'` 才能繼續；`'FAIL'` 就要重新設計規則，不是調數值（第 5 節範例 5）
- [ ] `git diff` 逐檔看過一遍，確認只有 `index.html`（或本手冊）被改動，`tests/`、`docs/` 下既有檔案
      沒有被動到

---

## 8. 部署流程

這個專案**沒有建置步驟**（沒有 `npm run build`、沒有 GitHub Actions workflow），GitHub Pages
是直接從 `main` 分支的根目錄部署的（repo：`https://github.com/9gf6p4448m-del/yaoshi`，
線上網址：`https://9gf6p4448m-del.github.io/yaoshi/`）。**push 到 `main` 就是部署**，不需要額外指令。

```bash
git add index.html
git commit -m "說明這次改了什麼"
git push origin main
```

**push 成功不等於使用者看得到**——GitHub Pages 重新建置通常需要幾十秒到 2 分鐘。宣告「部署完成」前，
一定要實際驗證線上版本已經更新：

```bash
git log origin/main -1   # 先確認 push 真的到了遠端（不是本機以為 push 了）
curl -s "https://9gf6p4448m-del.github.io/yaoshi/?_=$(date +%s)" | grep -o '<title>[^<]*'
```

用查詢字串加時間戳（`?_=...`）是為了避開瀏覽器/CDN 快取，確保拿到的是最新版本。如果改動的內容
會反映在某個可辨識的字串上（例如新增的道具名稱），直接 grep 那個字串確認它出現在線上 HTML 裡，
比只看 `<title>` 更可靠。如果等了幾分鐘線上版本還是舊的，先確認 `git log origin/main` 有沒有真的
收到你的 commit，再懷疑 GitHub Pages 的建置延遲或設定問題（不要一開始就假設是快取或建置問題）。

---

## 9. 待辦清單

以下 5 項原樣帶自 `docs/ARCH_SPEC.md` §7「由此產生的待辦」，逐項註明該在做什麼內容時處理：

| # | 待辦 | 出處 | 該在什麼時候處理 |
|---|---|---|---|
| 1 | UI 標示「同名法寶能力不疊加」 | 議題 C | 任何跟牌桌 UI／道具說明顯示相關的改動時，順手在道具卡片或說明文字加上這個提示，避免玩家標第二把同名法寶卻困惑「怎麼沒有效果疊加」 |
| 2 | 送王船文案改「入手此物時」 | 議題 F | 這是獨立的純文字修正，跟其他工作無關，**現在就可以做**：`index.html:256` 目前 `desc` 寫的是「得標時，把你袋中一件詛咒品送給戰力最高的對手」，要改成「入手此物時，把你袋中一件詛咒品送給戰力最高的對手」（程式邏輯本身不用改，只有文案錯——見第 10 節說明為什麼程式對、文案錯） |
| 3 | 實作普渡爐主前，`showTypes` 預設改 `false` | 議題 G | 做普渡爐主這個角色（`docs/GAME_DESIGN.md` 六之三 A）時處理。目前 `index.html:843` 的 `onReveal` 預設 `showTypes:true`（所有人都看得到標書型態），要改成預設 `false`，再讓普渡爐主自己的 `onReveal` hook 把**自己**的 `showTypes` 打開——**不是簡單改一個常數**，因為現在 `viewerId` 固定是 `0`（南家玩家自己），要讓「只有爐主看得到」生效，需要一併想清楚這個資訊要怎麼呈現給不同玩家（尤其熱座模式下兩個真人都是「viewer」），這是這一項比表面上複雜的地方 |
| 4 | `flags`／`traits` 的用法寫進 `IMPLEMENTATION_GUIDE.md` | 議題 H | **本手冊已完成這項**，見第 3 節 |
| 5 | `wish`／`grudge`／`spec`／`sacrificed`／`pawned`／`stats` 欄位補上寫入 | 議題 J | 做對應內容時各自補上：`wish`（心願系統串接時）、`grudge`（紅衣婆婆的記仇 AI 行為時）、`spec`（斷手書生的鎖定系別時）、`sacrificed`（獻祭刀主動放血時）、`pawned`（陰間當鋪典當機制時）、`stats`（記事面板 UI 時）。這些欄位在 `mkPlayer()`（`index.html:449-460`）裡已經建好、初始值都對，純粹是「還沒有人寫入它們」，不需要改欄位定義本身 |

---

## 10. 常見陷阱

### 10.1 【最重要】加進 `POOL`／`CURSES` 的新內容一定會讓 `trace()` 基準比對出現差異

這不是這份手冊隨口一提的細節，是**整個驗證流程最容易被誤解的地方**：`makeState()`
（`index.html:462`）用 `shuffle([...POOL,...POOL].map(...))` 洗牌整副牌堆，`shuffle()` 消耗
`S.rng()` 的次數跟陣列長度直接相關。只要 `POOL`（或 `CURSES`）的陣列長度變了，**同一個 seed**
洗出來的牌序就會完全不同——即使你新加的那件道具在某一局裡根本沒被抽到市場上。這**不是** bug，
是「你加了新內容，牌局結構本來就變了」的必然結果。已用 Node.js 實測驗證：只在 `POOL` 裡插入
一件全新的測試道具，其他什麼都不改，`trace([1,2,3])` 的完整輸出跟原本的基準逐位元組**不相等**。

**正確的因應方式**（已寫進第 7 節檢查清單）：新增進 `POOL`／`CURSES` 的內容，改用「單元測試」驗證
（手動把新項目塞進假玩家的 `bag`，呼叫 `power()`／`consCapFor()` 等函式核對數值），**不要**因為
`trace()` 對不上就以為自己把舊功能弄壞了，也**不要**因此去改 `tests/baseline-traces.json`（違反鐵則 2.2）。

反過來，已用 Node.js 實測驗證：新增 `ROLES` 項目（不排進 `MODES.seats`）、新增 `WISHES`／`EVENTS`
項目，`trace([1,2,3])` 的輸出跟基準**完全相等**——因為這些表目前沒有消費者，加了也不會被任何
現有程式碼讀到。**如果你加了這類「純表格新增」卻發現 `trace()` 對不上，代表你的改動有問題
（可能不小心動到了別的地方），要去查，不能放行。**

### 10.2 送王船的文案跟程式現在不一致（程式對，文案錯）

`index.html:256` 的 `wangchuan`（送王船）能力，`desc` 寫「**得標時**，把你袋中一件詛咒品送給
戰力最高的對手」，但程式碼裡的 `onWinItem` hook（第 258-260 行）寫著：

```js
/* 現行行為＝只有「親自標下送王船並入袋」那一次才啟航（毒標塞人不算） */
if(ctx.item.ab!=="wangchuan" || ctx.target) return;
```

也就是說**只有你自己標下送王船那一次**才會觸發，不是「之後每次得標任何東西」都觸發。
`docs/ARCH_SPEC.md` §7 議題 F 已經裁定「文案錯、程式對」——如果每次得標都能送走詛咒品，
等於永久免疫詛咒，太強了。**這個文案錯誤還沒修**（見第 9 節待辦 2），如果你在處理跟送王船
相關的內容時，記得文案要改成「入手此物時」，不要反過來把程式邏輯改成配合舊文案。

### 10.3 `showTypes` 現在預設 `true`，但這會讓普渡爐主的被動沒有價值

見第 9 節待辦 3 的完整說明。這裡要強調的陷阱是：**不要在還沒實作普渡爐主之前，貿然把
`index.html:843` 的 `showTypes:true` 改成 `false`**——那會讓現在的開標演出對所有人都少顯示
「押命／保守」標記，是一個會影響現有 UI 行為的改動，要跟普渡爐主的實作綁在一起做、一起驗收，
不要單獨動這個預設值。

### 10.4 跨玩家 hook（`onWinItem`、`onBattle`）的 effect 順序要靠 `order` 欄位控制

`onWinItem` 跟 `onBattle` 的 `p` 參數是**陣列**（`[winner.p, target]` 或 `[w, l]`），`collectEffects`
會把陣列裡每個玩家的 effect **依序合併**（先第一個玩家的角色+道具，再第二個玩家的角色+道具），
如果你新加的能力跟既有能力都會修改同一個 `ctx` 欄位（例如都改 `ctx.dmg`），**執行順序會影響最終數值
或訊息排列順序**。目前 `onBattle` 的四個能力已經用 `order` 明確定序（`bow:10`／`shield:20`／
`hairpin:30`／`nail:40`，`index.html:238-297`）——這是 2026-09-01 一次真實踩坑後修的（原本靠
「收集順序」這個隱性契約，同一批對抗式覆審抓出訊息順序不可重現的問題，`docs/ARCH_SPEC.md` §7
「裁定 E 的自我更正」有完整記錄）。**如果你的新能力會跟既有 `onBattle`／`onWinItem` 能力衝突同一個
欄位，明確設一個 `order` 值，不要假設「反正只有我一個人用，不會有順序問題」**——別人之後加的能力
可能會跟你的能力同時生效。

### 10.5 `HOOK_ORDER` 目前只對 `onNightEnd` 特殊處理

`index.html:342`：`const HOOK_ORDER = { onNightEnd:"itemsFirst" };`——只有 `onNightEnd` 是「道具先於
角色」跑，其他 11 個 hook 都是預設的「角色先、道具後」（`collectEffects` 第 348 行的
`if(order==="itemsFirst"){items();role();}else{role();items();}`）。如果你新加的內容需要「道具優先於
角色」這種順序（跟 `onNightEnd` 一樣的理由），**在 `HOOK_ORDER` 這張表裡加一筆**，不要去改
`collectEffects` 的整體邏輯結構——這張表存在的目的就是讓这种例外可以用資料表達，不用碰引擎程式碼。

### 10.6 `ROLES`／`WISHES`／`EVENTS`／`NIGHTRULES` 加了資料不代表玩家看得到

跟 10.1 的道理相反但同樣重要：如果你新增了一個角色卻**沒有**排進 `MODES.seats`，或新增了心願/異事/
市集規則卻沒有任何程式碼去抽卡/觸發它，這些內容**不會**出現在實際遊戲畫面裡（第 1 節、第 3 節已說明
原因）。這不是 bug，是這幾張表目前的真實狀態——**但很容易讓人誤以為「資料加了就等於功能做完了」**。
確認一項內容真的完工，除了第 5 節範例的手動函式驗證外，還要明確告知後續接手者/使用者：
「這一項目前只有資料，還沒有串接進遊戲流程」，不要用「已完成」這種語氣描述它。

---

## 11. 補充：後加的重要事項（2026-09-02）

### 11.1 AI 決策層有自己的 5 個 hook（第 4 節的 12 個之外）

`onAiValue`／`onAiPlan`／`onAiAmount`／`onAiExtraBids`／`onAiCurse`，
全部掛在 `aiBids()` 內、只對 AI 生效。**契約在 `docs/ARCH_SPEC.md` §8，寫 AI 行為前必讀。**
三隻既有 AI（青面攤主／紅衣婆婆／斷手書生）已用這 5 個 hook 實作完成，
可直接當範例照抄（`index.html` 的 `ROLES` 表內）。

### 11.2 兩個地雷（實測踩過）

- **`pw`／`pl` 與 `pwRaw`／`plRaw` 不一樣**：`onBattle` 的 `pw`／`pl` 是含風位加成的結算戰力，
  而引擎保證 `w` 一定是 `pw > pl` 的那方——**所以用 `pw > pl` 判斷「我戰力比較高」永遠成立、
  永遠是廢條件**。要判斷「實際戰力較低卻靠風位加成獲勝」這類情境，**必須用 `pwRaw`／`plRaw`**。
- **`S.bidWinner` 是過渡全域**：`onBidSettle` 的 ctx 沒有得標者，引擎用 `S.bidWinner` 暫存
  （只在結算該件期間有值）。這是已知的 wart，見 `ARCH_SPEC.md` §9 待辦 4。

### 11.3 哪些內容「已實作」、哪些只是「規格」

`GAME_DESIGN.md` 描述的是**目標狀態**，不等於已經做好了。以 2026-09-02 為準：
- **已實作**：法寶能力 17 種、角色 5 個（human／青面攤主／紅衣婆婆／斷手書生／收驚婆／獵人，
  其中後兩者未排進 `MODES.seats`）、三隻 AI 的行為模式
- **只有規格、尚未實作**：其餘 5 個角色、8 個異事、6 件命格道具、心願牌庫、3 條市集規則
- **完整待辦清單見 `ARCH_SPEC.md` §9 末尾的總表**

動手前先查這一節，不要假設設計文件寫了就是做好了。
