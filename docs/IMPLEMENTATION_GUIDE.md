# 妖市 實作手冊 — 給接手模型看的操作手冊

> **這份文件的存在理由**：原本開發這個專案的模型額度用完了，接手的模型看不到任何對話紀錄，只能讀檔案。
> 這份手冊的唯一考核標準是：**你沒看過原始對話，照著這份文件也能正確加一個新角色／新事件／新道具，
> 並且自己驗證有沒有做壞**。如果你看完某一節還是不知道「具體要改哪一行、改完要跑什麼指令確認」，
> 代表那一節寫得不夠好——請對照 `index.html` 的真實程式碼，不要只讀這份手冊就動手。
>
> 本文所有函式名、欄位名、行號都已對照 `index.html`（撰寫時共 1561（原始撰寫時 1298） 行）逐一核對，
> **⚠️ 行號會隨每次改動漂移**：行號於 2026-09-02 隨 v0.5 命格系統機械重算過一次，但動刀前仍請先用 `grep -n "const ABILITIES"` 這類**符號名**重新定位，不要直接照行號跳過去插入。
> 並用 Node.js 實際執行驗證過本文列出的 5 個範例的程式邏輯與輸出數字（不是憑印象寫的）。

---

## 目錄

1. [30 秒認識這個專案](#1-30-秒認識這個專案)
2. [鐵則（違反就等於做壞了）](#2-鐵則違反就等於做壞了)
3. [五張資料表的欄位定義](#3-五張資料表的欄位定義)
4. [13 個 Hook 契約速查表](#4-13-個-hook-契約速查表)
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
- **`NIGHTRULES` 是最後一張空殼表**——結構已定義但沒有任何 engine 程式碼會把 `S.nightRule`
  設成非 `null`，往裡面加一筆不會在遊戲裡出現（刻意的，見 `docs/ARCH_SPEC.md` §7 裁定 J）。
  `WISHES` 已於 v0.6 上線（§11.5）、`EVENTS` 已於 2026-09-02 上線（§11.6），兩者都有完整串接。
- `ROLES` 表已有 4 個角色（`human`／`qingmian`／`hongyi`／`duanshou`），但**沒有選角 UI**，
  座位表由 `MODES`（第 507 行）寫死決定誰坐哪一位。

**程式在哪**：**唯一**要改的檔案是 `index.html`（單檔遊戲，HTML/CSS/JS 全部內嵌，撰寫時 1561 行）。
`<script>` 標籤從第 208 行開始到第 1559 行結束，所有邏輯都在這個標籤裡。

**目前版本**：`<title>` 寫的是「妖市 v0.5」（第 6 行）。

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
// index.html 第 625-636 行
function mulberry32(a){ ... }
const rnd=(a,b)=>a+Math.floor(S.rng()*(b-a+1));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(S.rng()*(i+1));...}return a;};
```

**為什麼**：整個平衡模擬器（`runMany`）、優勢策略窮舉器（`analyzeEvent` 的驗證流程）、以及基準比對
（`trace()` vs `baseline-traces.json`）全部依賴「同一個 seed 每次都跑出完全一樣的結果」。只要有一處
用了 `Math.random()`，這個賽局就不可重現，模擬器統計出來的勝率毫無意義，基準比對也永遠對不上。

**兩條隨機流分開的原因**（第 626 行的註解）：`S.rng` 是玩法流（洗牌、AI 抖動、平標決勝），
`S.rngUi` 是純演出流（挑台詞用，見 `sayFrom`，第 950 行 `arr[Math.floor(S.rngUi()*arr.length)]`）。
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
`onBattle` hook 寫 `if(has(ctx.w,"bow")) ctx.dmg+=2;`（第 255 行），這是「這個能力在檢查『觸發它的
是不是我自己』」，跟「引擎函式寫死某個 id」是完全不同的兩件事。你會在第 5 節的每個範例裡看到這個模式。

### 2.5 同名法寶的能力**不疊加**（設計決定，不是 bug）

```js
// index.html 第 638 行
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
   全程生效」的資訊權限。`index.html` 第 302 行：
   ```js
   chair:{id:"chair",name:"椅仔姑竹椅",desc:"看穿所有對手的實際壽命", flags:["xrayLife"]},
   ```
   引擎用 `chairSeen()`（第 651 行）→ `hasFlag(p,"xrayLife")` 去查「有沒有活著的人類持有這個 flag」，
   不需要另開一個 hook。
3. **靜態的數值上限/門檻，且多個來源可能同時提供，要取最大值** → 用 `traits`。
   範例：千里眼銅鈴「明夜預告顯示兩件拍品」——`preview` 這個數字不是某個時間點的加總計算，
   是「你能看到幾件」的門檻，且如果未來有兩個道具都給預告加成，應該取較大值而不是疊加。
   `index.html` 第 286 行：
   ```js
   bell:{id:"bell",name:"千里眼銅鈴",desc:"明夜預告顯示兩件拍品", traits:{preview:2}},
   ```
   引擎用 `traitMax(ap,"preview",1)`（第 977 行 `showMarket()` 裡）——預設值 1（沒有這張牌時看 1 件），
   有這張牌就取 `max(1,2)=2`。

**`order` 只在你確定「多個 effect 會修改同一個 ctx 欄位、且順序會影響結果」時才需要設**。
省略就是 100，跟其他省略 `order` 的 effect 一樣，按收集順序生效（穩定排序，不會亂）。
目前唯一用到 `order` 的地方是 `onBattle` 的四個能力（第 5.1 節裁定 E 的教訓，見第 10 節）：
`bow:10`、`shield:20`、`hairpin:30`、`nail:40`——因為這四個都會改 `ctx.dmg` 或推 `ctx.extra`，
順序會影響戰報訊息的排列，設 `order` 是為了讓行為可重現、不隨機。

### 五張表各自的角色

| 表 | 常數位置 | 現況 | 這次要加內容時注意什麼 |
|---|---|---|---|
| `ABILITIES` | `index.html:253` | 17 個法寶能力 ＋ 6 件命格道具已實作（共 23 筆） | 純資料，新增後**必須**被某個 `POOL`/`CURSES` 項目的 `ab` 欄位引用，否則永遠不會出現在遊戲裡（見範例 1） |
| `ROLES` | `index.html:391` | 6 個角色（1 人類 + 3 AI 已排進座位；收驚婆／獵人已建但未排進 `MODES.seats`） | 新增後**必須**被 `MODES.seats`（`index.html:507`）排進某個模式的座位表，否則玩家永遠選不到、AI 也永遠不會用（見範例 3） |
| `WISHES` | `index.html:515` | 空殼 `{}` | 目前沒有引擎程式碼會抽卡/判定——加進去只是定義資料，不會在遊戲裡出現，見範例 4 |
| `EVENTS` | 用 `grep -n "const EVENTS" index.html` 定位 | **已上線 8 樁**（第二批 5 樁為裁定修版，見 GAME_DESIGN §六之三 B） | 串接已寫好：`CFG.EVENT_NIGHTS` 排程＋前夜預告＋密封輸入 UI＋`runEventPhaseHeadless()`；跨夜還款 `S.debts`／局末移除 `endStrip`／透視 `p.seeAll`，見 §11.6 |
| `NIGHTRULES` | `index.html:523` | 空殼 `{}` | 同上，目前沒有任何地方會把 `S.nightRule` 設成非 `null` |

---

## 4. 13 個 Hook 契約速查表

**分派機制**（`index.html:532-560`）：`collectEffects(p, order)` 依序收集「p 的角色 → p 袋中每件
有 `ab` 的道具（依袋中順序）→ `S.nightRule` → `S.event`」，去重後依 `order` 數字排序；
`applyHooks(name, ctx, p)` 對排序後的每個 effect，若它有 `hooks[name]` 就呼叫 `hooks[name](ctx)`。
`p` 可以是單一玩家、玩家陣列（雙方 effect 合併去重）、或 `null`（只取全域的 `nightRule`／`event`）。

**寫 hook 時的鐵律**：hook 內只准碰 `ctx` 與自己這一筆資料，直接改 `ctx` 的欄位，**不回傳值**。

| # | Hook 名稱 | 觸發位置（函式:行號） | `ctx` 形狀 | effect 該改什麼 | 呼叫時 `p` 是什麼 |
|---|---|---|---|---|---|
| 1 | `onItemValue` | `power():712` | `{p, item, value}` | `ctx.value`（單件道具的戰力值，預設 `item.p`） | 該道具擁有者 `p`（單一） |
| 2 | `onFacCount` | `facCount():703` | `{p, faction, count}` | `ctx.count`（該陣營件數，用於共鳴判定） | `p`（單一） |
| 3 | `onPowerCalc` | `power():721` | `{p, itemSum, resonance, flat:0, resonanceMul:1}` | `ctx.flat` 或 `ctx.resonanceMul`；最終戰力 = `itemSum + resonance*resonanceMul + flat` | `p`（單一） |
| 4 | `onBidCap` | `consCapFor():733` | `{p, cap}`（預設 `floor(life/CFG.CONS_CAP_DIV)`） | `ctx.cap`（保守標上限） | `p`（單一） |
| 5 | `onBudget` | `budgetFor():728` | `{p, budget}`（預設 `p.life`） | `ctx.budget`（一輪出價總額上限） | `p`（單一） |
| 6 | `onBidEff` | `resolveAuction():823` | `{p, bid, item, eff}`（預設 `eff=bid.amt`） | `ctx.eff`（比價用的有效值） | 出價者 `e.p`（單一） |
| 7 | `onBidSettle` | `resolveAuction()`（用 `grep -n "onBidSettle",c` 定位） | `{p, bid, item, isWinner, cost, events, nBids, winner}` | `ctx.cost`（實付/退款金額），可 `ctx.events.push({txt})` | 出價者 `e.p`（單一） |
| 8 | `onWinItem` | `resolveAuction():859` | `{winner, item, target, events}`（`target` 僅毒標時有值） | 直接改 `winner`/`target` 的欄位（如 `.bag`、`.life`），可 push `events` | **陣列** `[winner.p, target]` |
| 9 | `onBattle` | `resolveBattles():893` | `{w, l, pw, pl, pwRaw, plRaw, extra, dmg}` | `ctx.dmg`，可 push `ctx.extra` | **陣列** `[w, l]` |
| 10 | `onNightEnd` | `resolveBattles():904` | `{p, log}` | 直接改 `p.life`，可 push `ctx.log` | `p`（單一），且 `HOOK_ORDER.onNightEnd="itemsFirst"`——**道具先於角色**跑 |
| 11 | `onMarketDraw` | `drawMarket():698` | `{market, round}` | `ctx.market`（可整個改寫拍品陣列） | `null`（只取全域 `nightRule`／`event`，與玩家無關） |
| 12 | `onReveal` | `startReveal():1100` | `{reveal, viewerId, showEntries, showTypes}` | `ctx.showEntries`／`ctx.showTypes`（是否顯示出價明細/標書型態） | `S.players[viewerId]`（單一） |
| 13 | `onNightEndGlobal` | `resolveBattles():1823` | `{log}` | 「不屬於任何一位玩家」的夜末後效，直接改 `S` 的相關欄位，可 push `ctx.log`（例：收祟夜把流標詛咒品硬塞給本夜未出手者中壽命最高者） | `null`（只取全域 `nightRule`／`event`，跟 `onMarketDraw` 同類） |

**`onNightEndGlobal` 何時跑**：在 `resolveBattles()` 的最後、逐人 `onNightEnd`（第 10 個 hook）與
異事後效都跑完之後才跑一次（**每夜夜末一次**），**刻意不呼叫 `onWinItem`**（規格：下手者＝無，不觸發紅衣婆婆記仇、
不算 typeLeak）。目前唯一用到它的是收祟夜的強制塞袋規則（`NIGHTRULES`）。

> 平標決勝順序（`resolveAuction`，第 826-829 行）：`onBidEff` 算完所有出價的有效值 → 取最大值 →
> 平手時**風位優先**（`windPid(S.round)`）→ 仍平則 `S.rng()` 隨機決。

---

## 5. 逐步範例（照抄可用）

> 以下 5 個範例的程式碼片段都已用 Node.js 實際載入 `index.html` 的 `<script>` 內容執行過、
> 核對輸出數字正確，不是憑印象編的。每個範例後面的「驗證」都附**實測過的具體數字**。

### 範例 1：加一個新法寶能力（被動 + hook）

**目標**：新增一件法寶「當鋪契約書」，效果是「你的保守標上限額外 +2」（用 `onBidCap` hook）。

**Step 1** — 在 `ABILITIES`（`index.html:253` 開始的物件）裡加一筆，放在任何一個既有項目之間或最後都可以
（緊接在 `buoy` 那筆後面、`};` 之前，約第 352 行）：

```js
dangwu:{id:"dangwu",name:"當鋪契約書",desc:"你的保守標上限額外 +2",
  hooks:{ onBidCap(ctx){ ctx.cap+=2; } }},
```

**Step 2** — 讓這件能力真的會出現在牌局裡：在 `POOL`（`index.html:568` 開始的陣列）裡加一筆引用它，
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

**Step 1** — 加進 `ROLES`（`index.html:391` 開始，放在 `duanshou` 之後）：

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

`ai:{aggr,spite}` 是 AI 出價行為的兩個參數，會被 `aiBids()`（`index.html:740`）拿去決定
「有多積極出價」（`aggr`）跟「有多常對詛咒品下毒標害人」（`spite`）——照抄現有角色的數值範圍
（`qingmian` 是 `{aggr:0.85,spite:0.25}`，`hongyi` 是 `{aggr:0.6,spite:0.6}`）就好，不用自己發明公式。

**Step 2（先不做）** — 如果要讓玩家真的能在遊戲裡遇到這個角色，需要把它排進 `MODES.seats`
（`index.html:507`）取代掉某一個現有座位。**這一步先不要做**：目前沒有選角 UI，`MODES.seats` 是
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

**Step 1** — 加進 `WISHES`（`index.html:515`，目前是 `const WISHES = {};`）：

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

（這個 payoff 邏輯其實就是 `index.html:1459` 已經寫好的 `EVENT_NEW_SHRINE` 測試治具，
可以直接呼叫 `window.__yaoshi.demoEvents.newShrine` 拿到同一份 spec，不用重寫。）

**如果 `verdict` 是 `'FAIL'`**：`dominant` 陣列會列出哪個玩家在哪個選項上有優勢策略、
`freeLunch` 會告訴你是不是「全員選同一項就穩賺」。**這種情況要重新設計規則本身，不是調數值**
——`docs/GAME_DESIGN.md` 六之四明講：「靠眼睛看／人肉試玩不算數，必須是這支窮舉程式回報
『不存在優勢策略』才算通過」。

**Step 2** — 通過閘門後，寫成 `EVENTS` 表項目的資料格式（`{id,name,desc,input,settle(ctx)}`）。
（2026-09-02 更新：串接已上線——`settleEvent()` 會呼叫 `settle(ctx)`，排程在 `CFG.EVENT_NIGHTS`，
密封輸入由異事 UI／`fillEventChoices()` 收集，見 §11.6。本範例其餘內容仍有效：新異事照這個
資料格式往 `EVENTS` 表加一筆即可，但**閘門 Step 1 仍然一步都不能省**。）以下示範怎麼把驗證過的
payoff 邏輯轉成會真的改 `p.life` 的函式，並手動驗證：

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
`index.html:612` 的 `SIM_MODE` 常數偵測到這個參數後，`index.html:1551` 會呼叫 `initSimTool()`
（第 1516 行）**取代**整個頁面內容，變成一個統計工具頁，不會跑正常遊戲流程、也不共用正常遊戲的 DOM。

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

`POLICIES`（`index.html:1302`）目前有三個策略函式：
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
  的收益陣列。**組合數 = `options.length ** players`，超過 200 萬會直接 throw**（見 `index.html:1413`），
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

  **正式規程（2026-09-02 定案，`ARCH_SPEC.md` §9 待辦 13 已結案）**：`tests/baseline-traces.json`
  （錄於 `7d3bfa8`，AI 決策層上線後必然對不上）與 `tests/baseline-v2-ai.json`（`market` 欄位是
  物件，現行 `simulate()` 只輸出名稱字串，錄製時用的 trace 函式已不在 HEAD）**兩份基準檔目前都
  無法用現行 `trace()` 重播，只供歷史參考，不得再拿來當比對基準**。等價性驗證改用：
  1. `git show <改動前的 commit>:index.html > old.html`，取出改動前的版本；
  2. 用**同一支現行** `trace()`（第 6.4 節那段腳本，只把 `readFileSync` 的路徑分別指向 `old.html`
     與改動後的 `index.html`）各自對 `seeds 1..20` 各跑一次；
  3. 兩次輸出各自 `JSON.stringify`，逐位元組比對；
  4. **雙向檢查，不得只驗一半**：判定用的開關／新內容關閉時必須**相等**，開啟時必須**不相等**
     （只驗關閉的話，「新內容根本沒進牌局」這種缺陷會靜默通過）。

  依上述規程分類決定拿哪個版本當「改動前」比對、以及預期相等還是不等：
  - [ ] 若改動的是**既有行為**（改了現有 hook 的實作、改了 `CFG` 裡的數值、改了現有資料表項目的
        效果、把某個新角色排進了 `MODES.seats`）→ 新舊版必須**逐位元組相等**，除非你能明確指出
        「差在哪、為什麼」且那個差異是你**有意識**要做的改動（不是意外）。
  - [ ] 若是**純新增**、而且新內容**沒有**被排進 `POOL`／`CURSES`／`MODES.seats`（例如：新 `ROLES`
        項目沒動 `MODES`、`WISHES`/`EVENTS`/`NIGHTRULES` 新增項目）→ 一樣跑 `trace(1..20)`，
        **必須跟改動前版本逐位元組相等**（因為沒有任何東西進入牌局或座位表，亂數消耗序列完全沒變）。
  - [ ] 若新增內容進了 `POOL`／`CURSES`（新法寶、新命格道具、新詛咒品）→ 跟改動前版本比對
        **預期會出現差異，這是正常的**（牌堆陣列長度變了，`shuffle()` 消耗亂數的方式跟著變，
        跟你新加的能力邏輯對不對無關）。這種情況改用**單元測試**驗證：把新項目手動塞進一個假的
        玩家物件的 `bag`，呼叫 `power()`／`consCapFor()`／`budgetFor()` 等相關函式，核對數值符合
        設計文件描述（照抄第 5 節範例 1、2 的驗證方式）。
- [ ] **平衡宣稱一律 n≥10000（2026-09-02 使用者裁定）**：任何「三策略勝率位移 ≤Xpp」或「棄權 vs 出手」這類閘門判定，`runMany` 至少 n=10000。n=2000 的單點 SE≈0.85pp、兩點差的 SE≈1.2pp，同一份程式 splitter 位移在 n=2000 量到 −1.05、n=10000 量到 +0.30，**正負號都會翻**（實測見 ARCH_SPEC §9 待辦 15 結案依據）。n=2000 只能當快篩，不能當放行證據。
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

**改版必改版本字串（2026-09-02 使用者裁定）**：`index.html` 的 `const VERSION="x.y", VERSION_NOTE="..."`（`grep -n 'const VERSION'`）是單一事實來源，`<title>` 與首頁那行都由它帶出。使用者靠首頁那行判斷有沒有推上線——**任何會推上線的改版，這一行一定要一起改**，漏改＝送達證明失效。

```bash
git add index.html
git commit -m "說明這次改了什麼"
git push origin main
```

**push 成功不等於使用者看得到**——GitHub Pages 重新建置通常需要幾十秒到 2 分鐘。宣告「部署完成」前，
一定要實際驗證線上版本已經更新：

```bash
git log origin/main -1   # 先確認 push 真的到了遠端（不是本機以為 push 了）
curl -s "https://9gf6p4448m-del.github.io/yaoshi/?_=$(date +%s)" | grep -o 'VERSION="[^"]*"'   # <title> 已無版本號，看 VERSION 常數
```

用查詢字串加時間戳（`?_=...`）是為了避開瀏覽器/CDN 快取，確保拿到的是最新版本。如果改動的內容
會反映在某個可辨識的字串上（例如新增的道具名稱），直接 grep 那個字串確認它出現在線上 HTML 裡，
比只看 `<title>` 更可靠。如果等了幾分鐘線上版本還是舊的，先確認 `git log origin/main` 有沒有真的
收到你的 commit，再懷疑 GitHub Pages 的建置延遲或設定問題（不要一開始就假設是快取或建置問題）。

---

**版本探針（2026-09-03，v0.25）**：GitHub Pages 對 `index.html` 送 `Cache-Control: max-age=600`，使用者 10 分鐘內重開拿到的是本機快取，會以為沒推上線（之前都靠丟 `?v=xx` 連結解決）。`checkForUpdate()` 在開頁 1.5 秒後與每次從背景切回前景時（節流 60 秒）用 `index.html?upd=<時間戳>` 抓線上版、比對 `VERSION` 字串，較新就亮 `#updBar`，點了 `location.replace(pathname+"?v="+新版)`。**單一事實來源仍是 `VERSION` 常數，改版必改它，探針才會亮。** headless 無 fetch，全程包在 typeof／try 裡；純演出層不耗 `S.rng`。驗法：頁面載入後 `window.fetch` 換成回傳 `VERSION="9.99"` 的假函式再呼叫 `checkForUpdate(true)`，條要亮；同版不得亮。

**資產腳本的快取鑰匙（2026-09-03，v0.26）**：`sfx.js`／`bgm.js` 的 script tag 由 `document.write` 帶 `?v=VERSION` 插入。原因：版本探針把 index.html 換新後，這兩個檔仍吃各自的 10 分鐘快取，新加的音效會靜默失效（實測 `no voice babble`）。所以**改了 sfx.js／bgm.js 一定要一起 bump VERSION**，否則線上 10 分鐘內仍是舊檔。`js/renderer.js` 是 module，其內部 import 不受此參數影響——改 3D 層要等快取過期或使用者手動重整。

## 9. 待辦清單

以下 5 項原樣帶自 `docs/ARCH_SPEC.md` §7「由此產生的待辦」，逐項註明該在做什麼內容時處理：

| # | 待辦 | 出處 | 該在什麼時候處理 |
|---|---|---|---|
| 1 | UI 標示「同名法寶能力不疊加」 | 議題 C | 任何跟牌桌 UI／道具說明顯示相關的改動時，順手在道具卡片或說明文字加上這個提示，避免玩家標第二把同名法寶卻困惑「怎麼沒有效果疊加」 |
| 2 | 送王船文案改「入手此物時」 | 議題 F | 這是獨立的純文字修正，跟其他工作無關，**現在就可以做**：`index.html:272` 目前 `desc` 寫的是「得標時，把你袋中一件詛咒品送給戰力最高的對手」，要改成「入手此物時，把你袋中一件詛咒品送給戰力最高的對手」（程式邏輯本身不用改，只有文案錯——見第 10 節說明為什麼程式對、文案錯） |
| 3 | 實作普渡爐主前，`showTypes` 預設改 `false` | 議題 G | 做普渡爐主這個角色（`docs/GAME_DESIGN.md` 六之三 A）時處理。目前 `index.html:1099` 的 `onReveal` 預設 `showTypes:true`（所有人都看得到標書型態），要改成預設 `false`，再讓普渡爐主自己的 `onReveal` hook 把**自己**的 `showTypes` 打開——**不是簡單改一個常數**，因為現在 `viewerId` 固定是 `0`（南家玩家自己），要讓「只有爐主看得到」生效，需要一併想清楚這個資訊要怎麼呈現給不同玩家（尤其熱座模式下兩個真人都是「viewer」），這是這一項比表面上複雜的地方 |
| 4 | `flags`／`traits` 的用法寫進 `IMPLEMENTATION_GUIDE.md` | 議題 H | **本手冊已完成這項**，見第 3 節 |
| 5 | `wish`／`pawned`／`stats` 欄位補上寫入（`grudge`／`spec`／`sacrificed` **已完成寫入，勿重做**） | 議題 J | 做對應內容時各自補上：`wish`（心願系統串接時）、`grudge`（紅衣婆婆的記仇 AI 行為時）、`spec`（斷手書生的鎖定系別時）、`sacrificed`（獻祭刀主動放血時）、`pawned`（陰間當鋪典當機制時）、`stats`（記事面板 UI 時）。**`grudge`（紅衣婆婆記仇）、`spec`（斷手書生鎖定系別）、`sacrificed`（獻祭刀放血，唯一寫入點是 `bleed()`）都已經有人寫入了——不要再另寫一套。** 其餘欄位在 `mkPlayer()`（`index.html:654-665`）裡已經建好、初始值都對，純粹是「還沒有人寫入它們」，不需要改欄位定義本身 |

---

## 10. 常見陷阱

### 10.1 【最重要】加進 `POOL`／`CURSES` 的新內容一定會讓 `trace()` 基準比對出現差異

這不是這份手冊隨口一提的細節，是**整個驗證流程最容易被誤解的地方**：`makeState()`
（`index.html:667`）用 `shuffle([...POOL,...POOL].map(...))` 洗牌整副牌堆，`shuffle()` 消耗
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

`index.html:272` 的 `wangchuan`（送王船）能力，`desc` 寫「**得標時**，把你袋中一件詛咒品送給
戰力最高的對手」，但程式碼裡的 `onWinItem` hook（第 274-276 行）寫著：

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
`index.html:1099` 的 `showTypes:true` 改成 `false`**——那會讓現在的開標演出對所有人都少顯示
「押命／保守」標記，是一個會影響現有 UI 行為的改動，要跟普渡爐主的實作綁在一起做、一起驗收，
不要單獨動這個預設值。

### 10.4 跨玩家 hook（`onWinItem`、`onBattle`）的 effect 順序要靠 `order` 欄位控制

`onWinItem` 跟 `onBattle` 的 `p` 參數是**陣列**（`[winner.p, target]` 或 `[w, l]`），`collectEffects`
會把陣列裡每個玩家的 effect **依序合併**（先第一個玩家的角色+道具，再第二個玩家的角色+道具），
如果你新加的能力跟既有能力都會修改同一個 `ctx` 欄位（例如都改 `ctx.dmg`），**執行順序會影響最終數值
或訊息排列順序**。目前 `onBattle` 的四個能力已經用 `order` 明確定序（`bow:10`／`shield:20`／
`hairpin:30`／`nail:40`，`index.html:254-313`）——這是 2026-09-01 一次真實踩坑後修的（原本靠
「收集順序」這個隱性契約，同一批對抗式覆審抓出訊息順序不可重現的問題，`docs/ARCH_SPEC.md` §7
「裁定 E 的自我更正」有完整記錄）。**如果你的新能力會跟既有 `onBattle`／`onWinItem` 能力衝突同一個
欄位，明確設一個 `order` 值，不要假設「反正只有我一個人用，不會有順序問題」**——別人之後加的能力
可能會跟你的能力同時生效。

### 10.5 `HOOK_ORDER` 目前只對 `onNightEnd` 特殊處理

`index.html:531`：`const HOOK_ORDER = { onNightEnd:"itemsFirst" };`——只有 `onNightEnd` 是「道具先於
角色」跑，其他 11 個 hook 都是預設的「角色先、道具後」（`collectEffects` 第 537 行的
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

### 11.1 AI 決策層有自己的 5 個 hook（第 4 節的 13 個之外）

`onAiValue`／`onAiPlan`／`onAiAmount`／`onAiExtraBids`／`onAiCurse`，
全部掛在 `aiBids()` 內、只對 AI 生效。**契約在 `docs/ARCH_SPEC.md` §8，寫 AI 行為前必讀。**
三隻既有 AI（青面攤主／紅衣婆婆／斷手書生）已用這 5 個 hook 實作完成，
可直接當範例照抄（`index.html` 的 `ROLES` 表內）。

### 11.2 兩個地雷（實測踩過）

- **`pw`／`pl` 與 `pwRaw`／`plRaw` 不一樣**：`onBattle` 的 `pw`／`pl` 是含風位加成的結算戰力，
  而引擎保證 `w` 一定是 `pw > pl` 的那方——**所以用 `pw > pl` 判斷「我戰力比較高」永遠成立、
  永遠是廢條件**。要判斷「實際戰力較低卻靠風位加成獲勝」這類情境，**必須用 `pwRaw`／`plRaw`**。
- **本件得標者從 `ctx.winner` 讀**（2026-09-03 起）：`onBidSettle` 的 ctx 有 `winner` 欄位＝
  本件拍品得標者的席位 id，**流標／無人得標時是 `null`**，所以讀它一定要先判 `null`。
  現有兩個消費者：紅衣婆婆記仇（`ROLES.hongyi`）、孝女白琴抬價（`ROLES.xiaonv`）。
  （舊版走 `S` 上的過渡全域欄位，`ARCH_SPEC.md` §9 待辦 4 已結案，那個欄位已從 `makeState` 移除——
  看到舊筆記提到它的，一律以本條為準。）

### 11.3 哪些內容「已實作」、哪些只是「規格」

`GAME_DESIGN.md` 描述的是**目標狀態**，不等於已經做好了。以 2026-09-02 為準：
- **已實作**：法寶能力 17 種、**命格道具 6 件（2026-09-02 新增，見 11.4）**、角色 5 個
  （human／青面攤主／紅衣婆婆／斷手書生／收驚婆／獵人，其中後兩者未排進 `MODES.seats`）、
  三隻 AI 的行為模式
- **只有規格、尚未實作**：其餘 5 個角色、8 個異事、心願牌庫、3 條市集規則（**此行過時**：以上四項至 2026-09-02 v0.8 已全數上線，
  見 §11.5／§11.6／§11.9／§11.11；心願牌庫 24 張滿）
- **完整待辦清單見 `ARCH_SPEC.md` §9 末尾的總表**

動手前先查這一節，不要假設設計文件寫了就是做好了。

### 11.27 招式三級視覺分級（2026-09-10，v0.54）——接手前先知道這八件事

規格＝評審 `docs/proposals/2026-09-10-roadmap-v2-review.md` §1；**權威驗收凍結**＝`docs/experiments/2026-09-10-acceptance-fx-tiers.md`（F0–F10）；
介面寫死在計畫檔 `docs/experiments/2026-09-10-plan-fx-tiers.md`（含 27 招辨識元素表）；實跑報告＝`docs/experiments/2026-09-10-fx-tiers-report.md`。
純演出卷：引擎 `trace(1..20)` 與 `adbb124`（v0.53）逐位元組相等。

1. **★招式時長的唯一事實來源是 `PW_FX.TRAIT_MS_BY_TIER`（`index.html`）★**：`{1:260, 2:900, 3:1400}`，
   拍末下限另一張 `BEAT_MIN_MS_BY_TIER {1:300, 2:900, 3:1400}`，等比基準 `TIER_BASE_MS:900`。
   舊的 `PW_FX.TRAIT_MS` 與 `PW_FX.BEAT_MIN_MS` **已整組刪除，別回頭引用**。
   `js/trait-fx.js` 與 `js/camera-director.js` 的 `||900` 退路也刪了——**事件沒帶 `detail.ms`／`detail.baseMs` 就 throw**。
   會這樣做是因為 v0.53 以前同一個 900 抄在 runtime 4 處＋治具 17 處，改一處漏二十處。
   治具那一側的單一來源是 `tests/tools/fx-consts.mjs`，它的 `assertPageConsts()` 每次跑 `traitfx-drive` 都會與頁面逐鍵比對，分岔就當場 throw。

2. **tier 是「拍級」不是「招級」**：`pwBeatTier(list, beat, f, views)`（`index.html`，**四個參數**）——
   ★以下是**凍結檔 §2.1 修訂一（使用者 2026-09-10 裁甲）之後**的規則，這一節只留這一套說法★：
   - 該拍有三尊大招（`TRAITS[].tier===3`）→ **3**
   - ①該場對決的**決定性最後一拍**（第 3 拍且分得出勝負）或②這一拍**燒掉了傳說三尊之一** → **2**
   - 其餘 → **1**（**含一般的擊殺拍**）
   `views` 就是為了②才加的（要查「被燒的那一隻是不是傳說尊」，`pwIsLegendUnit` 認 `LEGENDS[].m`）。
   ★別回頭寫成「該拍有任何 burn 就升 2」★——那是一版的規則，實測 8v8 有三分之二的拍都有 burn，
   拍末大多停在 900ms、F3 幾乎沒動，修訂一就是為了這件事收窄的。
   同一拍裡每一支招吃同一個**拍級**，拍末等待也是；但**招級另有上限**（見下面「二版改了三件事」第 2 條）。
   `TRAITS[].tier` 只掛在三尊三招上（`eliteBlind`／`wardGuardAll`／`hauntAnswer`），
   **是這一卷對 `TRAITS` 的唯一改動，引擎一行不讀它**；它是該招的**上限**，
   生效的地方只有「一支普通招不會因為同拍有大招就自己升到 3」。

3. **短版是 27 支各寫一條，不是把完整版加速**（使用者 2026-09-10 裁 D4 丙）：
   `js/trait-fx/{zuling,xianghuo,yinqi}.js` 各 `export const SHORT`（9 支），`trait-fx.js` 的 `start()` 在 `det.tier===1` 時優先取它。
   為什麼不能加速：`run.rate` 的天花板是 `TFX.rateMax` 2.2×，900→260 需要 3.46×，撞上去就是 `stats.cut`（收勢被硬切）。
   短版缺席時退回完整版**不是恆綠退路**——完整版塞不進 260ms 會 `cut>0`，治具的 `clean` 立刻紅。

4. **★寫短版的三條紀律（照著走才不會 rate>1）★**（檔頭也抄了一份）：
   ① **horizon ≤ 230**。`rate = (horizon−vt)/(ms−margin−t+dt)`，`margin = max(endMargin×k, dt×1.5)`；
      實測 horizon 233 還是 1.0、238 就 1.0128，門檻落在 235 附近，留到 230 是給低幀率的餘裕。
   ② **所有補間一律在函式頂層用 `delay` 排定**。在 tween 的 `done` 回呼裡再排新補間，是在 vt≈170 那一刻才排，
      horizon 直接被推到 240+。回呼裡只放 `st.burst`／`st.punch`／直接設 `material.opacity`（那些不進排程）。
   ③ **不要用 `st.at`**：它替回呼預留 `atReserve×k`，260ms 下白丟 46ms 預算。
   還有一個踩過的坑：**`ms:1` 的「觸發器 tween」不能用**——`update` 在那一幀會被呼叫不只一次，
   裡面 `st.bolt`＋`st.fade` 會逐幀重排，horizon 被推到 264（`boltGamble` 第一版 rate 1.0537 紅）。
   要「某一刻才現形」的 mesh，就在頂層先建好、`opacity:0`，靠 `st.fade(..., {delay})` 讓它到點才淡出。

5. **三個絕對常數隨 tier 等比**：`TFX.flinchMs`／`atReserve`／`endMargin` 乘 `run.k = run.ms / det.baseMs`。
   基準值不寫在 `trait-fx.js`（寫了就是第二份事實來源），由事件帶 `detail.baseMs`＝`PW_FX.TIER_BASE_MS`。

6. **Tier 3 ＝ 完整版 ＋ `CINEMA` 機位**（1400ms）：
   `camera-director.js` 的 `CINEMA {dist:2.9, tilt:8, inMs:220, outMs:320}` 是第 ⑥ 層偏移，只動 dist／tilt，
   **yaw 一律不碰**（同 FOCUS 的紀律：yaw 上已經有 orbit 與 lean 兩層）；`cinemaK=0` 時逐值等於沒有這層。
   ★**黑條 letterbox 不在本卷**★（凍結檔 §2.1 修訂七，使用者 2026-09-11 裁甲）：
   一～五版試過 `z-index:-1`／`z-index:41`／`#duel` padding／逐元素 absolute／整塊 `transform:scale(.80)`
   五種做法，每一種都壓到不同的元素——**真因是對決版面本來就填滿到溢出（`scrollHeight 394 > clientHeight 390`），
   沒有安全區**。黑邊連同「對決版面安全區」整包留給招式可辨性卷重做。
   想再加黑邊之前先讀修訂七那張「五個版本各壓到誰」的表，別再走一次同樣的五步。
   機械防線有兩道，**但它們守得住的事比名字聽起來窄，下一卷動手前先讀清楚**（r6 HIGH-1）：
   - **L9**＝原始碼字串比對（`.lbox`／`pwLetterbox`／兩個 id 的 `'`、`"`、`#` 三種寫法各 0 處）。
     它按**名字**寫，所以**換一組 id 名字就繞得過**。
   - **L10**＝tier 3 那一拍 **`document.body` 的可見子孫** rect 與 v0.53 逐值相同（`duel-rects.mjs`）。
     它守的是「**DOM 幾何**與 v0.53 相同」，**不是**「畫面與 v0.53 相同」：
     ① **以動畫表達的位移**抓不到（讀 rect 前會定格：無限迴圈讀相位 0、有限長度讀終態——
     而「黑邊柔和進出」正是最容易寫成動畫的那一種）；② 顏色／透明度／z-index 造成的**純遮擋**抓不到。
     （掃描根本來是 `#duel`，那樣連「`#duel` 之外的蓋板」都抓不到——二版 `5a1220e` 就是那種寫法；
     r6 抓到後已改成掃 `document.body`，這一類現在紅得起來。）
   ⇒ **下一卷重做黑邊時，這兩道擋不住「用動畫做位移」與「純遮擋」，要另外建防線**（例如遮擋取樣或像素比對）。

7. **`?fxtier=0` 是退路等價開關**：`PW_FX.TIER_ON=false` → `pwBeatTier` 恆回 2 ＝ v0.53 行為
   （900、拍末 900、無 CINEMA）。實測 `tiers {1:0,2:12,3:0}`、4 場時長與基準幾乎逐項相同。
   `?closeup=0` 則只管 CINEMA 這一件事（修訂七之後黑條沒了，它不再有第二個作用）。

8. **治具**：`traitfx-drive.mjs --tier=1|2|3`（`--ms` 已移除，時長從 `fx-consts` 取），
   新判定 `msOK`（頁面實際 `run.ms` 等於該 tier，防「`--tier=1` 其實還在跑 900」）、
   `rateOK`（`maxRate ≤1.0`，tier 1 專用）、`actionsOK`（非 flinch 的補間 ≥2，F10）；
   `tests/tools/lbox-probe.mjs` 驗 CINEMA「只在 tier 3」＋黑條不存在＋tier 3 版面與 v0.53 逐值相同（正反都驗，
   量測在 `tests/tools/duel-rects.mjs`）；`tests/fxtier.test.mjs` 是 F1 的單元測試。
   ★順手修掉一個靜默漏測★：`traitfx-drive` 的 LEGENDS regex 自 2026-09-07 請神 2.0 插入 `eff:{}` 之後
   **一套都抓不到**（只印一行 warn），三尊三招近一個月沒被機械驗收過；現在反查不到直接 throw。

**★二版（2026-09-11）改了三件事，接手前一定要知道★**
1. **tier 2 的條件收窄了**（凍結檔 §2.1 修訂一，使用者裁甲）：只有「該場決定勝負的最後一拍」與
   「這一拍燒掉了傳說三尊之一」升 tier 2，**一般擊殺拍走 tier 1**。一版把所有擊殺拍都升 2，
   實測 12 拍裡 8 拍停在 900ms，F3 幾乎沒動。收窄後 `FXC.tiers` 從 `{1:4,2:8}` 翻成 `{1:8,2:4}`。
2. **招級 ≠ 拍級**（`pwMoveTier`，R1 覆審 M2）：拍級決定「這一拍多重要」，但同一拍裡的**普通招上限 2**，
   只有 `TRAITS[].tier===3` 的傳說招走 1400＋CINEMA。拍末等待仍吃**拍級**。
3. **CINEMA 一定要有取消路徑**（R1 覆審 C1，CRITICAL）：一版宣告了 `cinemaFall` 卻沒有一行把它設 true，
   「立刻回位」是死碼——跳過大招後鏡頭卡在貼地仰視 1.49 秒。現在 `endCinema()` 掛在
   `onTraitCancel`／`onDuelEnd`／`onTable`／`onEnd` 四個入口。**改這一段一定要重跑 `lbox-probe` 的 L5**。

**三尊的 tier 3 餘韻**（R1 M1）：三招各有一段包在 `if (st.tier === 3)` 裡的收勢，把 1400ms 填到
horizon **1290／1296／1294**（fill 0.921／0.926／0.924，收尾版實測；★別再抄 1280／1360／1385 那組，那是二版的，三版為了把 `rate` 壓回凍結的 ≤1.0 又壓縮過一次★）。
**tier 2 走同一支函式，那段不執行、行為逐項不變**——加新段落時務必照這個寫法。

**量測紀律（二版學到的）**：
- F3 一次 4 場的中位**分辨不出**這一卷改了什麼（覆審員實測同組態 ±550ms）。要比就用 `pace-ab.mjs`：
  交錯跑、每組 5 次、看「中位的中位」與**全距有沒有重疊**。
- F6 的 `rafMedianFps` 撞 vsync（兩邊都 59.9），**零鑑別力**；主數字用 `rendersPerSec`。
  `duel-perf perf` 以前靜默吃掉 `--root`（基準會變成新版自己），現在不支援的旗標一律 throw。
- **列舉「誰被蓋到」永遠會漏掉下一個元素**（黑條五輪的教訓）：要驗版面沒被動到，
  就對**所有可見子孫的 rect** 做相等性斷言（`duel-rects.mjs`），不要自己列一份元素清單。
  相等性斷言另附活性證據：錨點數、時點數、掃到的元素數都要 >0，兩邊一起空也會「逐值相同」。
- `trace-eq` 預設只證明「勝負與扣血沒變」；拍序列要用 `--beats`（對兩邊做同一個注入）。

**沒過字面門檻的三條（門檻未動，留給製作人裁；數字以報告現況為準）＋一條已改判準**：
① F3 主條中位 **5018ms** >5000（差 18ms，但效果 −586ms 已大於噪音、全距不重疊；使用者裁甲以實測值通過，修訂四）；
② F3 子條原文「有 tier 3 的對決 ≤8s」3 場中 2 場超標（**基準同場次更慢**，與 tier 3 無關；現行判準＝修訂五，綠）；
③ F4 的 `closeup-judge nullCount` 4 > 基準 2（拍變短讓 punch 排光更多靜幀，`deepOk` 與有樣本的 `monoQuiet` 仍全過；修訂六降記錄項）；
④ **F6 的 draw calls 那一半**：原文「不增」已依 **§2.1 修訂八**（使用者 2026-09-11 裁甲）改成
   「**同 `visible` 樣本下落在基準全距內**」＋`rendersPerSec` ≥0.90，**現在是綠的**。
   為什麼非改不可：`duel-perf perf` 在真實對決進行中另派合成場，背景的 `ys:fx-burn` 會燒掉合成場上的尊，
   `visible` 15 vs 16 ＝ 約 30 個 draw call，是被宣稱效果（±3）的**十倍**；同一份程式碼在兩個 session
   之間方向翻轉（作者 +3、覆審員 r6 −29，而兩人的基準側中位同為 957）。
   ★改這一段前先讀修訂八★；真正決定性的量法（固定演出時點取樣）留給下一卷。
詳見報告 `docs/experiments/2026-09-10-fx-tiers-report.md`。

### 11.25 傷害可讀性 批 2-a（2026-09-07～10，v0.51 上線）——接手前先知道這六件事

規格與驗收凍結＝`docs/experiments/2026-09-07-acceptance-dmg-readability.md`（R0–R8）；
報告與連拍＝`docs/experiments/2026-09-07-dmg-readability-report.md`。純演出卷：引擎 `trace(1..20)` 與 `443f802` 逐位元組相等。

1. **跳字冒在哪一側，v0.45 是錯的**：引擎 `pwRec` 記的 `side` 是**行動方**（`pwStrike` 傳 `sd.tag`），
   `target` 是**對面**那一隻；只有 `burn` 那一筆的 `side` 才是被燒的那一方。v0.45 的 `pwDmgFloat`
   寫成 `pwScreenOf(b.side, b.target)`——兩側的 unit id 都是 `0..n−1`，所以查得到的是**出手方自己的一尊**，
   傷害數字一直冒在打人那一側的頭上。批 2-a 改成 `pwFoe(b.side)`（burn 維持 `b.side`）。
   新加任何「對被打的那一尊做事」的演出，side 都要先過這一關。
2. **閃紅不新建材質、不重編 shader**：`js/duel-figures.js` 收 `ys:fx-hit {side,unit,ms}`，
   每幀依狀態算強度（跟退暗同一條紀律：一次性設值下一幀就被主迴圈蓋掉），
   再叫工廠的 `setHitTint(k)`。3D 妖那邊只動**既有**的 `uRimColor`／`uRimPower`／`uRimStrength`
   與既有材質的 `color`；貼片版只動既有的兩顆逆光材質。`renderer.info.programs.length` 對決前後不變。
3. **只加光會被 ACES 洗成粉白**：加色加到夠亮時 ACES 會把飽和紅推向白，量到的「紅偏量」反而下降
   （實測 boost 1.6→3.2 時 R−(G+B)/2 從 18.6 掉到 8.0）。所以紅是靠 **albedo 往紅乘**（把綠藍壓下去）
   撐起來的，邊光只補一點亮度。調 `HIT` 那組常數時記得往兩個方向各試一次，別只往「更亮」調。
4. **燒毀中的尊不閃**：`bt != null` 時 `hitFlashK` 一律 0（同 §11.22 第 4 點的理由：燒毀有自己的曲線）。
   `ys:fx-trait-cancel`（doSkip 派的）／`ys:duel-end`／`resetFigure` 都要把閃紅清乾淨——池是重用的。
5. **量表殘影的兩個計時器要並列排、不能串接**：串接（收起來 → 再排移除）會讓兩段的延遲累加，
   重幀時整條殘影拖過 `GAUGE_GHOST_MS+100`（凍結檔 R3 實測踩過）。
6. **治具 `tests/tools/dmg-readability.mjs` 在頁面端裝了一組虛擬時鐘**：
   `requestAnimationFrame`／`setTimeout`／`performance.now`／`Date.now` 全部被包起來，
   freeze() 之後遊戲時間完全停住、畫面停在最後畫出來的那一幀，Node 端慢慢截圖再 resume()。
   **rAF 的時戳一定要一起換成虛擬時鐘**——`renderer.js` 的 `frame(now)` 直接把它當 `performance.now` 用，
   不換的話第一次凍結之後所有包絡都會被算成「早就結束」，閃紅永遠量不到（踩過，白花兩輪）。
   量閃紅時要排掉兩種污染：燒毀會放一片全螢幕暖光（`#duel .flashfx`）、同一欄的兩尊方框會互相疊到
   （對照組要取**對面那一欄**）。

### 11.24 請神 2.0「神債暗標」（2026-09-07，v0.50 上線）——接手前先知道這九件事

規格＝提案 `docs/proposals/2026-09-07-legend-v2-debt-auction.md` §二（11 條）＋驗收凍結
`docs/experiments/2026-09-07-acceptance-legend-v2.md`（G0–G11）。實跑報告 `docs/experiments/2026-09-07-legend-v2-report.md`。

1. **★1.0 的擲骰與天井已整組移除，別回頭引用★**：`CFG.INC_K`／`CFG.INC_PITY`／`shrineRollOrder`（同 h 洗牌）
   ／規則頁的機率表全部不存在了。§11.20 那一節寫的東西**只剩「燒香上限＝壽命−1（`incCap`）」與「三條迴圈同一格」
   兩條還成立**，其餘（h/(h+K)、天井、擲序公平性 A1、天井鎖死 A6、N7 撤案）都是 1.0 的歷史，接手時不要照抄。
2. **新的常數**：`CFG.SHRINE_NIGHTS=[4,7,10]`（請神夜）／`INC_TITHE=1`（供奉）／`TITHE_WARN=2`（危急提示門檻）
   ／沿用 `INC_MAX=3`、`INC_GIFT_P=4`；`INC_AI={minLifeFrac:0.3, value:12}`（1.0 的 `div`／`giveUpLead` 已不用）。
   全部【試玩必調】，**改它們是策略數值，要先問使用者**（硬規則 3）。
3. **尊→夜每局洗牌並公開**：`makeState` 裡 `shuffle([...CFG.SHRINE_NIGHTS])` 逐龕發下去，寫進 `sh.night`。
   這是這一卷唯一新增的 `S.rng()` 消耗，`LEGEND_ON=false` 時整段不執行（G0 靠這條）。
4. **結算只在請神夜**：`resolveShrines` 的第三段改成 `if(!sh.open||sh.night!==S.round) return;`——
   **累計** h 最高者請走（不必本夜有燒香），同分走 `shrineWindOrder(round)`＝從 `windPid(round)` 起順時針。
   沒有任何**有資格**的人燒過香就回天（`sh.dawn=true`），本局不再出現、**不重開**。
   位置仍然是 `resolveAuction()` 之後、`resolveBattles()` 之前，三條迴圈同一格（沒動）。
5. **一人一尊的判準是 `sh.takenBy`，不是袋子內容**：`hasLegend(p)=S.shrines.some(sh=>sh.takenBy===p.id)`。
   踩過的坑：一版寫成 `p.bag.some(x=>x.legend)`，結果**供奉斷掉、尊回天之後那個人又能去搶第二尊**——
   n=1000 實測 23 局出現「三尊落在同一人手上」，G2 直接紅。一人一尊是**整局**的限制。
6. **供奉掛在 `resolveBattles` 的夜末段**（`settleTithe(nightly)`，排在詛咒 drain 之前）。
   `resolveBattles` 是真人 `startBattle`／`simulate`／`playPolicyGame` **共用**的那一支，所以掛在這裡＝三條迴圈自動一致；
   不要在別處再寫第二份 −1。三條分支：①付不出（付了會剩不到 1）⇒ 直接回天 ②付完會 ≤`TITHE_WARN` 且這一尊還沒判過
   （`x.titheWarn` 旗標）⇒ AI 主動放手／真人**照預設「要」先扣**並把這一筆推進 `S.titheAsk` ③其餘照付。
   **headless 沒有人讀 `S.titheAsk` ⇒ 行為就是預設「要」**（凍結檔 G5④ 明訂）。
   送神回天的唯一事實來源是 `releaseLegend(p,x,log,why,refund)`——四條路（付不出／AI 放手／袋子面板的鈕／
   危急提示選送神）都走它；`refund=true` 只給「夜末已經扣過才問」的那一條，等價於「當夜起不再扣」。
7. **階段獎勵的區間基準是「本龕最高 h」**（`shrineReward(p,h,top,fac)`）：`top` 必須在 `sh.h[win]=0` **之前**取，
   由呼叫端傳進來——`shrineClose` 不能自己重算（得標者的 h 已經歸零了）。
8. **傳說共鳴走法寶自帶的 `eff`**：`collectEffects` 的 items() 現在收兩條來源——`ABILITIES[it.ab]` 與 `it.eff`。
   為什麼不用 `ab`：`buildArmy` 把 `x.ab||x.m` 當 3D 模型鍵，給傳說配 `ab` 會把模型換掉。
   `eff` 掛在 `LEGENDS` 原型上、進袋是淺拷貝 ⇒ 同一個物件參照，`collectEffects` 的 Set 去重＝「同名法寶不疊加」。
9. **版面與部隊預覽**：神龕列 `shrinesHTML()` 已從 `#north` 搬進 `#stage`（法寶卡正上方），`#north` 回到只有北席。
   `unitRow(it)`／`unitRowText(it)`／`bagPreviewHTML(p)` 是市集卡與袋子面板**共用**的部隊預覽，
   數值一律由 `buildArmy` 展開、招式一律取 `TRAITS`，**不得另抄一份規則**。
   橫向溢出的兩個真兇（v0.44 一直量到的 19px 不是神龕列造成的）：**東席的 `.mark-stamp`**（`right:-6px`＋
   `anim-stamp-in` 放大到 2.26 倍 ⇒ 凸出 18.6px，已改 `#east .mark-stamp{left:-6px}`）與**最右那張卡的
   `.pickbox`／`.mybid`**（`right:-4px` ⇒ 3px，已由 `#market{padding:0 5px}` 吸收）。
   定位工具：`tests/tools/overflow-probe.mjs`（對 `#table`）與 `tests/tools/mkt-probe.mjs`（對 `#market`）。
### 11.23 美術甲「夜市燈火」渲染基礎包（2026-09-07，v0.46）——接手前先知道這六件事

1. **色調映射現在是全域的**：`js/renderer.js` 設 `renderer.toneMapping = ACESFilmicToneMapping`、
   `toneMappingExposure = ENV.EXPOSURE`、`outputColorSpace = SRGBColorSpace`。v0.45 之前牌桌／市集
   （玩家 90% 時間看的畫面）**完全沒有色調映射**，ACES 只手刻在 `js/bloom.js` 的合成 shader 裡、
   而 bloom 只在對決開。改動畫面亮度／材質前先讀 `docs/design/ART_BIBLE.md` §8。
2. **`js/bloom.js` 不再有任何手刻的映射**：three 只在「畫到畫布」那一趟注入 tonemapping／colorspace，
   場景畫進 `sceneRT` 那一趟拿到的是**線性未映射值**（所以亮部萃取仍在線性 HDR 上做，順序是對的）；
   合成那一趟改用 `ShaderMaterial`＋`#include <tonemapping_fragment>`／`<colorspace_fragment>`。
   **不要改回 RawShaderMaterial**——Raw 不吃 three 的注入，改回去等於牌桌與對決各走一條曲線。
   SwiftShader 上 ShaderMaterial 會連結失敗，但 `bloomOK` 在軟體 GL 上根本不呼叫 `bloom.render()`，
   那支 program 不會被編譯；`BRIGHT`／`BLUR` 兩支維持 Raw 不動。
   換 three 版本時，這一步是最該回歸的地方（chunk 名稱在 r152 從 `encodings_fragment` 改名過）。
3. **bloom 的 `threshold` 跟曝光綁在一起**：曝光一改，亮部萃取的門檻要跟著重調（v0.46 從 0.5 調到 0.9）。
   改 `ENV.EXPOSURE` 而不動 threshold，對決會整片發光。
4. **場景常數只有一個地方**：`js/scene-env.js` 的 `ENV`（曝光、穹頂色站、霧色、剪影色、暈角）與
   `LANTERNS`（四盞燈籠的色溫與亮度）。`renderer.js` 的燈籠閃爍讀 `light.userData.baseIntensity`，
   **不要再把 3.4 寫死回去**。
5. **遠景剪影對決時要收掉**：`far-*` 那五片離地 8.5～9，在對決機位（俯角 19.5°）落在 NDC y 0.28～0.53，
   正好是兩隊人形的高度；`renderer.js` 用 `stageOn` 反向淡出它們。要讓它們在對決留著，得先解決遮擋。
6. **`?fps=1`**：規則頁音訊診斷區旁多一行 fps 中位／draw calls／三角形／機型，只在帶參數時存在。
   量手機 fps 就靠它——請使用者開 `?fps=1`、打開規則頁截圖回報。
7. **對決機位不只一種了**（v0.45 近景切鏡併入後）：`?closeup=0` 是全景、預設會在交鋒時推近。
   A4 的深度判準在**兩種機位都要過**——推近時相機更靠近桌心，`min(剪影距相機)` 反而變大，
   所以真正的最壞情況仍是全景那組（dist 4.2、相機半徑 3.84）。改剪影距離前兩種機位都要重量。

### 11.22 對決「近景切鏡」批 1 原型（2026-09-07，v0.45）——接手前先知道這五件事

規格＝`docs/proposals/2026-09-07-duel-closeup.md` §二；驗收凍結＝`docs/experiments/2026-09-07-acceptance-duel-closeup-p1.md`（P0–P9）；
報告與連拍＝`docs/experiments/2026-09-07-closeup-p1-report.md`。純演出卷：引擎（`paperWar`／`pwRec`／`buildArmy`／`S.rng`）一行未動。

1. **一個新事件串起三個檔**：`index.html` 的 `pwPlayBeat` 在「該拍第一筆 `amount ≥ PW_FX.FOCUS_DMG` 的 hit」與
   「該拍第一隻 burn」派 `ys:fx-focus {kind,side,actor,foeSide,target,ms,dim,shrink}`（一拍最多 `FOCUS_PER_BEAT` 次）。
   接收端各自獨立：`camera-director.js` 的 FOCUS 層推近鏡頭、`duel-figures.js` 的 `focusState` 每幀算退暗。
   兩邊**各算各的包絡**（進 160ms／回 220ms 同一組數字），不互相依賴——3D 沒載入時 DOM 那半邊照樣成立。
2. **推近之所以看得到，是因為 focus 期間凍結了 `realign()`**：`realign` 會依 `camera.position.length()`
   把人形等比縮回「固定 CSS 像素高」，鏡頭 4.2→2.6 的放大量剛好被它抵銷，只 dolly 的話畫面**一點都不會變**。
   凍結的起訖點 dist 都是 4.2，所以回全景時凍住的那組值仍然正確，收尾不跳。
   附帶好處：dist 抖動期間不會去動 `camStable`（排法鎖點見 `rowsFit`）。
3. **focus 不記進 `cur*`（與 punch 同一條紀律）**：`cur*` 是補間起點。把 focus 算進去的話，切鏡進行中收到
   `ys:fx-trait-cancel`／`ys:duel-end` 時 `clearOrbitLean` 會拿 2.6 當起點，基座得自己再爬 700ms 回 4.2
   （實測 cancel 後 300ms 只回到 3.08）。分開之後 cancel 只是讓 `focusK` 在 220ms 內歸零，位置照樣連續。
   同理 `endFocus()` 走的是獨立的回位段旗標 `focusFall`，不得再經過進場段（經過的話前 160ms 維持滿幅、回位變 380ms）。
4. **退暗一定要每幀算，不能收到事件設一次**：主迴圈每幀都對每一尊寫 `setFigureOpacity((haunt?0.5:1)*(1-bu)*fdim)`，
   一次性設值下一幀就被蓋掉。**燒毀中的尊（`bt != null` 或工廠自己的 `burn()` 在演）完全不參與退暗與復原**——
   它的 opacity 歸燒毀曲線管，退暗會讓化灰演到一半變淡、復原會讓它突然變回實心。
   池是重用的，所以 `resetFigure`／`onDuelEnd` 要 `restoreDim()` 把退暗寫回去，否則下一場開場就有半透明的尊。
5. **治具**：`closeup-drive.mjs`（真實路徑錄相機逐幀／退暗抽樣／跳字 DOM／HUD；`--cancel`、`--skipfocus` 兩個中斷探針）
   → `closeup-judge.mjs`（照凍結檔判 P0–P7）→ `closeup-shots.mjs`＋`closeup-sheet.py`（連拍與 contact sheet）、
   `closeup-trace.mjs`（P0 的引擎逐位元組比對）。**截圖有 250–450ms 的延遲**（輪詢＋`page.screenshot`），
   要拍「切鏡當下」得把 mark 的延遲往前挪，否則整批會拍到切鏡結束後的全景（實測踩過）。

### 11.23 角色平衡卷（2026-09-07，一版 v0.46 未上線／**二版 v0.47**）——接手前先知道這六件事

規格＝驗收凍結檔 `docs/experiments/2026-09-07-acceptance-role-balance.md`（B0–B7），
依據＝量法卷報告 `docs/experiments/2026-09-07-role-measure-report.md`，本卷報告
`docs/experiments/2026-09-07-role-balance-report.md`。

0. **`power()` 不是只剩顯示——別再照抄那句註解**（四版覆審 H3）。`PAPERWAR_ON` 之後它確實不決定對決勝負，
   但它還餵：毒標／收祟的「戰力最高的對手」挑選、獵人 AI 的追分估值、獵人被動的 `pwRaw/plRaw` 判準、
   `finalPower` 統計與 UI。所以**把帳面戰力推高是有代價的**（更常被鎖定當毒標目標）——
   斷手書生的被動因此刻意只走對決路徑（`ctx.fac===undefined` 時直接 return）。
1. **`onPowerCalc` 現在有兩條呼叫路徑，寫這個 hook 之前先問「我在哪一條」**：
   `power()`（`index.html:2155`，PAPERWAR_ON 之後只剩 UI 行情與毒標鎖定用）給的 ctx **沒有 `fac`**；
   `pwResLv()`（`index.html:2746`，紙紮夜戰真正吃的共鳴）是**逐系呼叫**、ctx **有 `fac`**。
   要影響勝負就得寫 `ctx.resonanceMul`（`ctx.flat` 只有 `power()` 讀）；要「只有達標那一系吃到」
   就得判 `ctx.fac`。斷手書生的被動是這條的範例。
2. **紙紮夜戰的詛咒懲罰不走 `power()`**：`pwMod` 的 `m -= sd.curses`（`index.html:2916` 附近）數的是
   `buildArmy` 回傳的**件數**。所以「詛咒品戰力視為 0」這種寫在 `onItemValue` 的被動對對決毫無作用。
   閭山法師的免疫改走 `traits.curseWard`＋`pwSide` 查一次（`sd.curseWard`）＋`pwMod` 判分支。
   **`traits` 在本專案原本 10 個角色一個都沒用**，這是第一個。
3. **`pwTrial`／`duelBags` 的人造玩家沒有 `roleId`**，所以角色的 `traits`／`hooks` 在 AI 估值那條路
   **一律不生效**——閭山自己估詛咒品的價時仍然當作會被扣、斷手估價時也拿不到自己的共鳴 ×1.5。
   這是既有邊界（命格條件也一樣），不是本卷的 bug，但改角色被動時要記得「AI 估的和實際打的不是同一套」。
   要修就得把 `roleId` 傳進 `pwTrial`，那會改變**所有**角色的 AI 估值、破壞 B4 的等價基準——留給角色 B 卷。
   **連帶**：純顯示層也要對齊——`pwCompText` 對帶 `traits.curseWard` 的角色改印「詛咒已淨化 N」
   （覆審 M6），否則玩家看到「詛咒纏身 N」會以為自己正在被扣。
4. **`ROLES.ai` 的三個數字比大多數被動更值錢**（量法卷 §2.4：只留 `ai` 就有 12pp 跨距）。本卷四隻的
   `ai` 是治具掃出來的（`role-measure.mjs --ai=<角色>:<aggr>/<spite>/<markReact>`），**不是手填**；
   要改先跑掃描——但**只掃 `aggr`／`spite`**（見第 5 點）。
   **`aggr` 不是只影響出價**：`incAiOf()` 也讀它決定**請神的燒香量**（取不到才退回 0.6），
   所以掃 `aggr` 掃到的是「出價風格＋燒香積極度」的合成值。`spite` 只走出價（毒標）。
5. **二版（使用者裁定）改了四件，接手前對得上號**：斷手書生的被動門檻 4→3→2 件（**三版依實測撤回 4＝原值**：
   其餘完全相同、只換門檻各 n=10000 ⇒ 15.57／15.70／15.60%，差 ≤0.13pp、SE ±0.36 ⇒ **門檻對這隻無效**，
   而門檻 2＝`CFG.SET_MIN` 會取消專精識別度）、`ai.aggr` **釘回 1.0**
   （保住 2026-09-03「紀律上限真的咬得到」那條修正，一版掃描把它選成 0.6，對照組實測反而 −2.80pp）；
   陰間當鋪的典當保命 **1 → `CFG.PAWN_KEEP`＝8**（`index.html` CFG 區，desc 與三條掛點的 log 都讀它，
   **不得各寫一份**）——**四版覆審 H2 丙**再改成「壽命 8 以上保 8；不足 8 至少保 1」，
   **三處掛點（實付／受傷／夜末）共用 `pawnFloor(p)`**：舊寫法 `cost=max(0, life−保命值)` 在
   `life<保命值` 時恆為 0，**當鋪低血時出價免費、對決免傷**；保命值是 1 的年代這個窗口不可達，
   改成 8 才露出來。夜末那條路的 `p.life` 已 ≤0 ⇒ floor 恆為 1，**不留「從 ≤0 免費回到 8」的特例**。
   閭山法師 `life0d` **−2→0**。掃描格點放寬成 `aggr` 5 × `spite` 3 並
   **把各角色原值列為候選**。**`markReact` 退出掃描、維持各角色的原設計值**（使用者修正）——
   它是角色性格的公開資訊，§5.8 的讀人層要靠三型混桌才有價值；一版把它交給勝率掃描，四隻全被選成
   `avoid`、全桌從怯場 3／搶標 4／無視 3 變成 6／3／1，那一層就沒了。**要動 `markReact` 前先想清楚
   它不是平衡旋鈕。** 凍結檔的 §2.1 修訂紀錄（九條）在
   `docs/experiments/2026-09-07-acceptance-role-balance.md` 末段。
   **本卷以 B1 7/10 進帶的狀態上線（v0.47）**；剩下紅衣婆婆 16.26／斷手書生 15.57／收驚婆 34.20
   移交「**角色平衡 B**」小卷，候選處方在報告 §7（紅衣把 `grudge` 帳本接到玩家側、斷手改
   `onAiValue`／`onAiPlan`、收驚婆三條路、量法改四座位平均）。
6. **量法固定用 `(b)`**（座位 0 吃自己的 `ROLES.ai`，治具 `tests/tools/role-measure.mjs`）。
   換回 `policyAiLike` 會讓角色個性完全量不到（量法卷 §0.2 已證 `policyAiLike` 把 `p.ai` 覆寫成
   寫死的 `{aggr:0.7,spite:0.15}`）。本卷閘門治具：`role-balance-b4.mjs`（引擎等價）、
   `role-balance-b3.mjs`（局長中位＋三策略位移）。
7. **角色平衡 B 小卷（2026-09-07，v0.50）——「AI 個性 hook 也會自傷」與「只餵 AI 的帳本」兩個族**
   （凍結檔 `docs/experiments/2026-09-07-acceptance-role-balance-b.md`、報告
   `docs/experiments/2026-09-07-role-balance-b-report.md`）。上一卷停手時剩三隻帶外，本卷只動兩隻：
   - **`onAi*` 是雙面刃，寫「偏好」時別順手寫「厭惡」**：斷手書生的 `onAiValue` 原式是
     `ctx.val*=鎖定系?1.6:0.7`——`1.6` 是專精識別度，但那個 **`0.7` 把市場上其餘七成的貨一律低估三成**，
     它連該搶的都搶不到。改成**只對「能湊成套的那一件」×1.6**（袋中鎖定系恰好 3 件時）、其餘照原估值。
     判準怎麼認：一個 `onAiValue` 若對**大多數**拍品都改值，它就不是「個性」而是「全域折扣」，
     要先問「這個折扣換到什麼」。量法卷量到這一包 AI hook 值 −7.42pp，而門檻／被動怎麼調都無效（§5 的 A/B）。
   - **`onAi*` 真人玩家永遠吃不到（GUIDE §11.1）**，所以「帳本型」被動很容易變成只餵 AI 的死重：
     紅衣婆婆的 `grudge` 三支寫入 hook（`onBidSettle`／`onBattle`／`onNightEnd`）玩家照跑，但唯二的
     **讀取端**（`onAiCurse`／`onAiValue`）都在 `aiBids()` 裡 ⇒ 玩家的記仇只進不出。修法是把讀取端
     搬到**兩側共用的掛點**：`onBidEff`（`resolveAuction` 對每張標書都跑）。
     **搬的時候語意會變，要講清楚**：`onAiValue` 改的是 AI 心中的估值（會真的多付壽命），
     `onBidEff` 改的是比價（`eff`，實付不變）——後者對持有者更划算，所以「數值不變」不等於「強度不變」，
     搬完一定要重量。本卷 (b) n=10000 實測紅衣因此 +7pp 上下，比報告 §7 估的 +2～+4pp 大。
   - **要找同族的下一個**：`grep onAi` 看哪些角色的關鍵效果只掛在 `onAi*` 上；
     青面攤主的 `onAiValue`（跟標）在座位 0 更是**死碼**（量法卷 §3 M2：n=2000 呼叫 317,474 次、生效 0 次）。

### 11.21 對決演出「沒兵仍出招／隻數不同步」修復（2026-09-07，分支 v0.42.2 → 併入 main 為 v0.43.1）——接手前先知道這三件事

規格＝驗收凍結檔 `docs/experiments/2026-09-07-acceptance-duel-desync.md`（D1–D5）。使用者真機回報兩個症狀：
①對方紙紮全燒光但 HUD 隻數仍 >0　②對方 0 隻仍出招式字幕。兩者是不同層的同一族 bug，別混著改。

1. **遞補上場怎麼運作（演出層，`js/duel-figures.js`）**：`index.html:4199` 起不再把 `duelDetail.armies` 截斷到
   `PW_FX.MAXFIG`（8）才送出去——DOM 那半邊（`pwArenaHTML`／`pwBurnOne`）本來就認全名冊，只有 3D 半邊以前只認
   前 8 隻，第 9 隻起沒有模型可燒，這正是症狀①的根因。改法：`duel-figures.js` 的 `onDuel` 把名冊拆成
   `roster[i]`（目前擺上場、長度 ≤ `cap`）＋`queue[i]`（排隊中還沒建模的存活單位，按名冊順序）；`cap` 讀
   `duelDetail.maxFig`（正式頁＝`PW_FX.MAXFIG`），沒帶就退回 `FIG.maxFigures`（10，舊保險絲）。某一格位那尊
   燒毀演完（`update()` 內建淡出算完 `bu>=1`，或工廠自己的 `burn()` Promise resolve／reject）就呼叫
   `reinforce(side,j)`：`queue[side]` 有排隊單位就 `releaseSlot` 收掉舊尊、把新單位塞進 `roster[side][j]`，
   下一幀 `figureFor` 會照 `keyOf(unit)` 重新配位建模（材質／貼花／系色跟其餘尊同一條路徑，GLB 沒到走既有退路）；
   `queue` 空了就什麼都不做，那個格位從此空著。場上同時看得到的尊數因此恆等於 `min(該側目前存活數, cap)`。
2. **存活檢查 helper（引擎層，`index.html`）**：`pwHasAlive(sd)=sd.units.some(u=>u.alive)`（緊接在 `pwAliveN`
   後面），四處在 `pwFire` 前補上它，沒有就整段跳過（不記 trait beat、不改 hp）：`pwFeed`（飼鬼甕）、
   `pwPrep` 的 `atkAll`（媽祖令旗）與 `rallyHp`（五營旗）、`pwHaunt` 的 `lost`（迷途）／`swap`（抓交替）。
   後兩者（`lost`／`swap`）在修之前不只是「多印一行字幕」——`hauntSwap` 的效果是不看施法方死活、直接燒掉對面
   一隻小兵，修好之後這個「死人抓交替」的隱藏數值效果也一併消失了（見下一點的附帶發現）。
3. **`trace(1..20)` 差異只落在 trait 文字，這句話有例外**：D1 對 seeds 1..2000 的例牌配對（24000 場）逐場
   `winner/dmg/aliveA·B/hpA·B/burnedA·B` 全相同、只有 trait 筆數少了（`tests/tools/duel-desync-d1.mjs`）；但
   完整一局的 `trace()` 從 seed 5 的第 3 夜起會出現非 trait 文字的數值差異（`tests/tools/duel-desync-d1c.mjs`
   可重現），根因是 AI 出價用的 `pwTrial()` 呼叫的是同一支（已修好的）`paperWar`，牠評估到「這件法寶對我這桌
   有沒有用」時偶爾也會踩進本卷修的那四個桶子，估值因而改變、連鎖影響後續夜的購買與配對——這是同一支引擎修
   對就會外溢到 AI 估值的自然結果，不是本卷順手改了別的判定。接手後續卷如果又要動 `paperWar` 內任何判定，
   记得 `pwTrial` 是同一支函式，AI 出價行為會跟著變，不要只拿單一場 `paperWar` 的輸出去驗證「引擎沒變」。
4. **遞補收尊要走「退場寬限」，不能收了就不管（v0.43.2，使用者真機回報灰燼凍在半空）**：`creature-figures.js` 的燒毀灰燼 `ash.points` 掛在 `group.parent`（scene），只靠那尊自己的 `update(dt)` 推進，`reset()` 刻意不砍它（砍了灰燼會在燒完那一瞬硬切）。所以 `resetFigure` 會把收回的尊登記到 `retired`（`{f, until}`），`update(dt, now)` 開頭（在 `active` 檢查之前，對決結束後也要推）對未被重新占用（`!f.__busy`）的尊繼續 `f.update(dt)` 到 `FIG.ashGraceMs`（2000ms ≥ `BURST.life 1.05×1.4≈1.47s`）到期。之後若有人把別的「掛在 scene 上、靠 figure 推進」的特效加進 creature，也走這一條，不要另開清單。驗證用 `tests/tools/ash-freeze-probe.mjs`（對 ff227a7 必紅）。
5. **名冊順序是「顯示序」，單位 `id` 才是「對位鍵」（v0.43.3）**：`pwArmyView` 先照 `buildArmy` 展開順序指派 `u.id`（＝`pwSide` 的單位索引，beats 的 actor／target 就是它），**再**依 `BEAT_FAC` 拍序穩定排序。所以任何拿 beats 去查名冊的地方都要用 `find(x=>x.id===…)`，**不得**用 `units[b.actor]` 索引（`pwEvFac` 曾經這樣寫，已改）；DOM 晶片 `pwc-${tag}-${id}`、3D `figureOf(side,id)`／`indexOfUnit` 本來就走 id。3D 只擺前 `PW_FX.MAXFIG`（現 10）尊，排序後看得到的就是先出手的那幾拍。測試出口 `pwArmyView`／`BEAT_FAC` 在 `window.__yaoshi`。

### 11.20 傳說三尊「請神」實作卷（2026-09-06 深夜～09-07，v0.43）——接手前先知道這幾件事

1. **機制全在 `index.html`，★v0.44 起預設開★、`?legend=0` 才關**（沿革：v0.43 依 2026-09-07 使用者裁定的合併策略先以預設關併進 main、L0 已證等價；同日第二次裁定，隨 N1 擲序小卷把預設打開＝v0.44。改這個預設是策略數值，要再問，硬規則 3）：`CFG.LEGEND_ON`（kill switch，OFF 時 `makeState` 連 `S.shrines`／`S.incense`／`S.shrineStat` 都不建，引擎各處用 `!S.shrines` 跳過，**顯式** `LEGEND_ON=false` 的 trace 與 **`ff227a7`** 的 OFF 路徑逐位元組相等；v0.43 卷寫的 `ca14065` 已過期，拿它跑 L0 會得到 332125 vs 325288 的**假 ❌**）＋`INC_MAX 3`／**`INC_K 10`／`INC_PITY 12`**（2026-09-07 使用者裁定甲，原提案 6／9）／`INC_GIFT_P 4`／`INC_AI{minLifeFrac,div,giveUpLead}`。**跑閘門與測試一律顯式 `CFG.LEGEND_ON=true`，不得依賴預設**。規則頁的公開機率表由 `INC_PITY`／`INC_K` 現算（不寫死數字）；階段獎勵三段以 P 定義，P=12 時是 h＜4／4–7／8–11。資料表＝`LEGENDS`（3 筆，與 POOL 同形＋`legend:true`，**不進 `S.deck`**；`m` 欄是 3D 佔位模型鍵，各借一隻既有體型的模型，系色由 `f` 帶）。新 TRAITS：`eliteBlind`（`blindFront`，在 `pwBolt` 段，一拍開打前對面前鋒 atk −2，降下去的 atk 三拍都算）、`hauntAnswer`（`curseHaunt`，在 `pwHaunt` 段，對面每有一件詛咒品多燒 1 隻）、`wardGuardAll`（沿用既有 `hpAll:2`，零新欄位）。
2. **結算的位置只有一個：`resolveShrines()` 插在 `resolveAuction()` 之後、`resolveBattles()` 之前**，三條迴圈（真人 `startShrine`／`simulate`／`playPolicyGame`）都在同一格。亂數只有兩處會走 `S.rng()`：h/(h+K) 那一擲、階段獎勵第三段抽小法寶；AI 的選尊與燒香量（`aiIncense`）是純算式、零亂數。**加任何東西進這一段之前先想清楚它會不會動到亂數序**——動了三條迴圈就對不上。
3. **回天結清 `settleShrinesEnd()` 會就地覆寫 `S.history.life` 的最後一筆**，不另 push 一列。原因：`tests/review.test.mjs` 有兩案在守「`life.length === nights.length+1`」與「末筆快照＝局末各人壽命」，直接 push 會兩案齊紅。`playPolicyGame` 的 `lifeByRound` 末筆與 `simulate` 最後一夜的 `post` 也一起同步——三者是同一個「天亮」時刻。
4. **閘門治具 `tests/tools/legend-gate.mjs`（L0／L1″／L2／L3′／L4／L5＋v0.44 加的 A1 擲序公平性／A6 天井鎖死歸零）＋單元 `tests/legend.test.mjs`（v0.44 二版起 **20 案**）＋Playwright `tests/tools/legend-drive.mjs`（v0.44 起**不帶 `--legend` 就完全不帶 query、走預設開**）**。跑法：`git show <基準 SHA>:index.html > old-l.html`（v0.43 卷是 `ca14065`，v0.44 卷是 `ff227a7`）後 `node tests/tools/legend-gate.mjs 10000`（約 50 分鐘，長極是 L4 的 12 趟 runMany）。**L1／L3 已依凍結檔 §2.1 的三份修訂紀錄改寫成 L1″／L3′**（L3′② 2026-09-07 又換過一次口徑：舊的「持有者最終勝率 ≤55%」是**恆真斷言**——分子算局、分母算人次，理論上限只有 ~52%；現行是「**勝者持有任一尊的局比例 ≤80%**」——2026-09-07 第二輪覆審做種子敏感度，發現 `atk99/hp99/count5` 突變在五個互斥的 2000 種子區塊上是 84.64~86.54%，**門檻 85 落在它的抖動帶裡面**（五塊有兩塊照樣綠）⇒ 加嚴到 80，治具的壞掉對照也改成「五個互斥區塊每一塊都要越過門檻」才算鑑別力成立）：L1″＝contend（四人擠同一龕）＋**四家共用同一個 V**、三狀態改成相對天井（①h 全 0 ②對手一人 h=⌊P/2⌋ ③自己 h=P−1）、只判「燒 0」與「燒 INC_MAX」不得弱優勢、中間注額列記錄不判。**V 的算法是 L1′→L1″ 的唯一差別**：改成「原四個異質袋子互打（每袋對其餘三袋、**不含鏡像**）算各席邊際價值，取中位數（第 2、3 名平均）」＝25.98，四家共用；L3′＝①三尊各自「同一袋 ± 這一尊」對三系代表袋 `duelBags` n=1000 的平均位移 ≥+10pp ②**勝者持有任一尊的局比例 ≤80%**（舊的相對帶與舊的「持有者人次勝率」都只印記錄項）。數字與診斷全文在 `docs/experiments/2026-09-06-legend3-impl-report.md` 與 `docs/experiments/2026-09-06-legend3-evidence/`。
5. **三件事不要做**：① 不要把舊 L3 的「請到者 vs 未請到者相對帶」當門檻——消融證明三尊零戰力時相對帶已 1.49，那是選樣混淆（拿得到傳說的人本來就有餘裕、也活得久），已依 §2.1 改寫成 L3′。② 不要在使用者再次裁定前改 `INC_MAX`／`INC_K`／`INC_PITY`（策略數值，硬規則 3；K10／P12 是 2026-09-07 的裁定值）。③ **不要拿 `duelBags` 的鏡像對局當精細刻度**——L1′ 的「四家同一袋」讓它退化：任何一袋自己打自己都是「基準 41.45%（決勝全靠風位）→ 加傳說 100%、均傷釘在 `PW_MAX` 8」，所以 V 恆等於 32.79、**選哪一袋都一樣、也對 K/P 完全沒有反應**。這正是它在 2026-09-07 被改成 L1″ 的原因（凍結檔 §2.1 修訂紀錄二、報告 §0.45）。
6. **同香火者的擲骰順序＝`S.rng()` 洗牌**（使用者 2026-09-07 裁定乙，v0.44；取代同日先裁的「從本夜風位家起順時針」，`shrineOrderKey` 已整支移除、不留死碼）：`shrineRollOrder(sh, rollers)` 先依 `h` 降冪穩定排序，再對每個同 `h` 並列組跑 Fisher–Yates（`S.rng()`）。**三條紀律**：① 並列組人數 1 時**一次都不擲**（消耗了亂數，三條迴圈的序就跟著漂）② 不得用 `sort` 的隨機比較子（比較子不是全序，V8 的 TimSort 會給偏倚分布）③ 只走 `S.rng`，不碰瀏覽器內建亂數也不走 `S.rngUi`（A2 有一條 grep 在守「引擎 `<script>` 段內建亂數出現次數＝0」）。**這一支只寫一次、三條迴圈共用**（排序只存在 `resolveShrines` 裡）。為什麼要換掉風位序：v0.43 實測 3000 局 1643 組並列，座位 0 拿 1.183 倍、座位 1 只有 0.770 倍（χ²=37.53, df=3）——**輪轉不等於公平**，因為並列組不一定四家到齊，風位的相位跟「誰在並列組裡」相關。公平性由閘門 A1 從 `resolveShrines` 回傳的 `out.rolls` **順序**重建並列組與首擲者（`simulate(seed).nights[].shrine.rolls`，**新舊版都有這個回傳**，所以同一條 A1 可以直接拿基準 SHA 跑、紅在比值本身）——一版曾經在引擎裡加 `tieFirst`／`tieExp` 計數器，被對抗式覆審 HIGH-2 指出「舊版沒有那些欄位 ⇒ A1 紅在屬性缺失、不是紅在不公平」，**二版已把計數器移除**；另外 **m=2 的並列組對『隨機比較子洗牌』這種壞法是無感的**（V8 在 m=2 恰好無偏，而真實牌局 97% 以上是 m=2），所以 A1 另有「只數 m≥3」分項（樣本不足 300 組就不判），真正的守衛是 `tests/legend.test.mjs` 的「N1 洗牌無偏：m=4、20000 次、比值 ∈[0.95,1.05]」那一案（突變成 `sort(()=>S.rng()-0.5)` 會紅在 1.4498）；`legend-gate.mjs` 的 L1″ 單夜快照則把洗牌展開成「對所有與 `h` 降冪相容的排列取等權平均」（組內 ≤4 人 ⇒ 至多 24 種，全列舉）。
7. **燒香上限＝當前壽命 −1**（使用者 2026-09-07 裁定甲，覆審 H4）：`incCap(p)` 是**唯一的事實來源**——`resolveShrines` 收燒香、`aiIncense`、`policyIncenseMax`、出價 UI 的 `incBump`／`incbarHTML` 全部呼叫它，不得各自再寫一份 −1。沒有這條的時候會出現「請到神的人當場燒到 0 出局、那一尊被鎖在死人袋裡永遠退場，同一夜沒請到的人反而被階段獎勵回血救活」。夾限之後 `resolveShrines`／`settleShrinesEnd` 裡的死亡掃描**現行恆不觸發**（留著是防禦性，註解有寫）。
8. **「不燒香被支配」是已知性質、不立門檻**（使用者裁定甲，覆審 H3）：`incenseNever` 比同出價法的 `splitter` 低幾 pp 只在 L4 表上列**記錄項**——燒香是這一卷的核心動作，不燒香被支配就跟「整夜不出價」被支配一樣，不是缺陷。
9. **L1″ 唯一還紅的是狀態①，而且 v0.44 之後是「四家一起紅」**（`node tests/tools/legend-gate.mjs 10000 --only=L1`）。根因是「**單夜快照裡總得有人第一個擲**」：h 全 0、四家對稱時大家都只押得到 h=3，排第一的那家收益恆＝`3/(3+INC_K)×V − 3`，對手怎麼選都影響不到 ⇒ 依定義是弱優勢。沿革與數字：v0.43（風位序，裁定甲）燒滿被打敗數是 **南0／北3／西0／東9**——只有輪不到先擲的那兩家綠，「綠」本身就是風位不公平的副產品；v0.44（洗牌，裁定乙）改成 **南0／北0／西0／東0**，四家逐格相同（收益矩陣四列一模一樣）——這正是 N1 生效的證據：座位差異被洗掉了，剩下的是模型本身的結構問題。**單夜快照量不到「洗牌讓長期期望均等」**，所以狀態①照樣紅（凍結檔 2026-09-07 的 A7 明訂 L1″ 只報不判，狀態①的多夜模型另議）——要讓它綠得再動機制（例如同 h 一起擲），不是調 K/P。治具的 `--kp=K,P` 可以只在記憶體裡換 K/P 做鑑別力對照——**它不寫檔、也不是判定依據**。（見第 6、13 點）。★治具的單夜模型自 v0.44 起把洗牌展開成「對所有與 h 降冪相容的排列取等權平均」（數學上等價於 Fisher–Yates；N7 撤案後不含任何資格聯集，見第 13 點）★

10. **請神結算的三個順序地雷（對抗式覆審抓出來的，改這一段之前先讀）**：① **死亡掃描不得插在擲骰之前**——香火是「當場扣、不退」，錢付了就該擲（插在前面會讓天井被剝奪、尊落到第二名）；全檔死亡掃描一律在結算的最後一行。**注意：第 7 點的 `incCap` 夾限之後，「燒到 0」這個情境已經不可達，所以這一條沒有回歸測試在守**（原本守它的第 14 案已改寫成守夾限本身，見報告 §5.2）——動這一段的人要自己小心，綠燈罩不到它。② `settleShrinesEnd` 覆寫 `S.history.life` 末筆之前要先確認「末筆真的是本輪的收尾快照」——異事夜殺到剩一人那條路沒有 `recordNightEnd`，末筆停在前一夜（**第 15 案在守**）。③ `aiIncense` 掃「有沒有人領先」時要濾掉已出局者：死人的香火要等關龕才歸零，算進去會讓活著的 AI 全體棄拜、整座龕鎖到天亮（**L2 活性在守**）。
11. **封籤的燒香會被引擎夾掉，而且必須看得見**（覆審 N2）：燒香是在**開標前**封的，`resolveShrines` 在**開標後**才用當下的壽命夾一次——標得太兇就會「封 3 實燒 2」。引擎順序**不要改**（改了三條迴圈的亂數序就對不上），但夾到時一定要留痕：`resolveShrines` 回傳的 `out.clip`、`S.shrineStat.{sealed,clip,clipZero}`、`S.shrineClipMsgs`（接進夜末戰況 log）、請神結算卡與局末回顧各一處。第 17 案在守（含「壽命夠時不得留下 clip 事件」的反面）。
12. **兩個已知的規格缺口（實作時自行裁的，要回頭確認）**：① 提案 §4.2 說「h≥P 天井必請、不會落到階段獎勵那一列」，但**獨一份**表示四人同時到天井時只有一人拿得到——落敗那幾位的 h≥P，本實作讓他們領最高那一段（退 ⌈h/2⌉＋小法寶）。② 提案 §4.2 的「從 POOL 該系 p≤4 的抽，走既有牌庫」，本實作解讀成「以 POOL 該系為抽取母體、發一份新的複本」，**不從 `S.deck` 抽走**——後者會讓神龕獎勵改變後續市集的牌堆組成，耦合過大。
13. **N7「天井者免燒香也具擲骰資格」是**提出後撤案**的（使用者 2026-09-07 裁丙）——別再提一次**：當時的理由是「第 7 點的燒香上限＝壽命−1 會讓壽命剩 1 的人到了天井卻永遠請不走（天井鎖死）」。**那個狀態不可達**：`h` 只有「本夜燒香」一條增加路徑，而 `h` 一到 `CFG.INC_PITY` 那一夜就**必請並當夜關龕**，所以「還開著的龕上有人 `h≥P`」不會發生；壽命剩 1 的人 `incCap=0`，本來也累積不到天井。一版照 impl-report 的未解清單直接實作了它（`rollers` 取聯集＋`aiIncense` 跳過＋三處 UI 文字），被冷讀對抗式覆審用**不變量掃描**（`02 §6.1` 第 6 條）＋1000 局探針打掉，二版整段拔除。留下來的只有一條**不變量守衛**：`settleShrinesEnd` 累計 `S.shrineStat.dawnPity`（回天結清時 `h≥P` 的人次），閘門 A6 判它＝0——**它在改動前就成立，不是任何新規則的證據**，守的是「日後有人動 `h` 的增減路徑或天井判定」。教訓：`02 §6.1` 第 6 條的不變量掃描要在**動手前 30 秒**做，這一卷是動手後才由覆審補做的。

### 11.19 共鳴接入紙紮夜戰候選＋傳說三尊設計提案（設計卷，2026-09-06 深夜，v0.41）——接手前先知道這五件事

1. **共鳴候選全在 `index.html`，預設關**：`CFG.PW_RES_MODE` 0＝關（線上行為＝v0.40）、1＝同系列陣 hp、2＝共鳴拍 atk、3＝共鳴增員；`?res=N` 可切。`pwResLv(p,fac)`（facCount → onPowerCalc 的 resonanceMul → lv≤PW_RES_CAP）在 `pwSide` 算成 `sd.res`，M1／M2 在 `pwPrep` 月相段之後套、M3 在 `pwSide` 增員；`PW_RES_STAT` 純計數（只計 `resolveBattles` 帶 `real:true` 的場）。
2. **閘門治具 `tests/tools/resonance-gate.mjs`**（R0–R4；R5 用既有 5 套測試＋duel-drive）：`git show 31504b0:index.html > old.html` 後 `node tests/tools/resonance-gate.mjs 10000`，約 40 分鐘（20 趟 runMany）。結果與診斷在 `docs/experiments/2026-09-06-resonance-evidence/`。
3. **R2 紅是量法問題**：duelBags 決定性、勝率離散階；不得改門檻（§2.1），改寫已列為提案裁定題。**建議 M1、淘汰 M3**（成套即必勝）、M2 對陰氣無效（haunt atk 0）——理由與數字在 `docs/proposals/2026-09-06-resonance-paperwar.md`。
4. **傳說三尊設計提案 `docs/proposals/2026-09-06-legend3-design.md`**（未實作）：三龕常駐、燒壽命當香火、h/(h+K) 機率公開、天井 P 必請、獨一份搶請、階段獎勵；三尊＝殘日（祖靈）／大士爺紙尊（香火）／守娘（陰氣）。fresh read-back 一輪、5 處二義已修。實作前要過 GAME_DESIGN 六之四優勢策略窮舉閘門（L1）。
5. **兩件事不要做**：不要在使用者裁定前把 PW_RES_MODE 預設改掉（策略數值，硬規則 3）；不要拿 R2 的 4 組對照當結論（顆粒度不夠）。
6. **v0.42（使用者裁定後）**：預設 `PW_RES_MODE=1`（M1），`?res=0` 關；R2 依 §2.1 程序改寫成 R2′（全 248 配對、平均位移 +5～+15pp、100% 配對 ≤ 基準×1.5），實跑 M1 ✅／M2 ❌／M3 ❌（`resonance-evidence/gate2-R2prime-10000.md`）。規則頁「風位與共鳴」ON 分支已改口徑（該系那一拍每隊每隻 hp +(件數−1)，上限 PW_RES_CAP）。**共鳴進了紙紮夜戰，之後任何動 unit hp／SET_MIN 的卷都要重跑 resonance-gate**。傳說三尊陰氣改「有應公」（使用者裁定），實作卷凍結檔 `docs/experiments/2026-09-06-acceptance-legend3-impl.md`。

### 11.18 法線貼花小卷（技術驗證，2026-09-06 深夜，v0.39）——接手前先知道這五件事

1. **機制＝程序式裂紋貼花，全在 `js/creature-figures.js`**：`DECALS` 表（鍵＝`opts.ab` 或 GLB 檔名；`mat` 正則挑材質；`lines` 每條 `[y0, xa, xb, zmin, 傾角]`，rest-pose 本地座標＝GLB 未正規化的 `position`）→ `decalFor()` → `dressMaterial(mat, burnY, decal)` 多送 8 顆 uniform（`uCrackN/uCrack[4]/uCrackAng/uCrackW/uCrackJag/uCrackFreq/uCrackDark/uCrackTilt`）→ GLSL 注入兩處：`<color_fragment>` 後壓暗 albedo（`CRACK_FRAG`）、`<normal_fragment_maps>` 後把下唇法線沿本地 +y 傾斜（`CRACK_NORMAL`，vertex 多一個 varying `vUpV`）。不加幾何、不加 pass、不加貼圖；無表項的生物 `uCrackN=0`，program cache key 改為 `'yaoshi-creature-rim-burn-decal'`（全場仍一支 program）。`?decal=0` 全關。
2. **目前只有 `eye`**（gaps.md ④ 石體橫向裂縫）：主縫（下崖左）＋斜向分岔＋上崖右一條。盲讀第 1 輪失敗的教訓：**核心暗線＋上唇暗＋下唇亮＝三條平行帶→被讀成「抓痕／風化紋」**；改成單暗線＋細下唇高光＋分岔後第 2 輪 2/2 讀成「裂縫／裂痕」。要鋪到別隻（tiger_c 白毛邊等）另開卷，先在 `DECALS` 加表項、拍 `creature-shoot` 對照、再盲讀。
3. **驗法（凍結檔 `docs/experiments/2026-09-06-acceptance-decal.md`）**：像素差用 `creature-shoot.mjs` 的 `reset` 相位＋預覽頁新參數 `?freeze=1`（idle timeScale 0，否則 tiger_c 呼吸讓同參數兩張差 2019 px）；`fx=0`。突變式＝dark 1／tilt 0／假斜面 0 三項歸零→像素差必須回 0。盲讀圖照舊 idle＋fx=1。
4. **效能**：`duel-perf.mjs perf --uncap` 8v8 新版 vs `--root=<基準 worktree>` 各 3 次取中位（本卷 100.0 vs 99.0 fps）；軟體 GL 用新選項 `--gl=swiftshader`（M-4 待量在此卷第一次量到，數字見凍結檔）。**量測不得與其他 Playwright 治具並跑**。
5. 兩件事不要做：不要把 `DECALS` 的座標寫成正規化後的值（shader 拿的是 GLB 原座標，同 `uBurnY`）；不要為了「更明顯」把上唇也壓暗（第 1 輪已否證）。
6. **鋪開卷（v0.40）後的欄位**：`mode`（0 暗線／1 亮色鑲邊混到 `color`／2 髮絲高光：繞本地 y 的角度切 `freq` 條）、`axis`（'x' 預設或 'z'＝線沿哪個本地軸；'z' 時 lines 的 a..b 是 z 範圍、cut 是 x 下限）、`lip [上,下]`、`tilt [上,下]`、`on:false`＝預設不畫（`?decal=all` 才開）。tiger_c 白毛鑲邊與 hairpin 髮絲兩輪盲讀 0/4，**回簽貼花不解**（gaps.md 回填），表項留著給真機試玩看；eye 路徑在重構後逐像素不變（`fin_eye.png` vs `r2_fz_eye_1.png` 0 px）。教訓：貼花能補「本來沒有的線」，補不了「既有色帶的語意」與「剪影語意」；context-free 讀者對 @2x ≤8 px 的亮線幾乎不感知。

### 11.17 系色小圖示小卷（2026-09-06，v0.37）——接手前先知道這四件事

1. **隻數牌顏色＝陣營，不是體型**：`.pwchip` 的底色由 `fac-zuling/xianghuo/yinqi` class 帶的 `--pwf` 決定（`fac-none`＝肉身兜底灰）；v0.36 以前 `.pwchip.swarm/elite/haunt` 各自寫死三系淺色＝按體型套色，別改回去。體型靠形狀：小紙人實心 8×12、大紙偶 13×17＋金邊、護法空心（只有邊框系色）、飄影 `filter:opacity(.6)`＋虛線邊。**半透明一律走 filter 不走 opacity**：`pwRise` 的 WAAPI `fill:both` 把 opacity 釘在 1，CSS opacity 永遠被蓋（探針實測 haunt computed opacity＝1；舊 `.burnt{opacity:.1}` 同樣被蓋、燒掉的片只剩灰階，本卷一併改成 `filter:grayscale(1) opacity(.15)`）。全部【試玩必調】。
2. **每隊一枚 `.pwfac` 系字徽**：`pwArmyView` 的 unit 多帶 `t`（隊序＝同一件法寶），`pwArenaHTML` 在隊序變化處插徽；徽是 `#pwch-*` 的直接子元素，所以 `pwLineUp` 的逐片 stagger 會連徽一起升起（設計如此），`pwBurnOne` 只認 `pwc-<tag>-<id>` 不受影響。送 3D 的 `armies` 是逐欄位挑的（index.html `duelDetail.armies`），`t` 不會帶出去。
3. **驗法**：`node tests/tools/facchip-probe.mjs <outdir> --duels=12 --seed=7`——真對局 12 場，每場拿 `S.players[].bag` 獨立推期望序列對 computed style（A1 顏色／A2 徽章／A3 形狀簽名／A5 溢出），並截兩欄含編號的圖給盲讀（A6）。引擎等價照 §7 的 trace 規程對前一版 SHA。
4. **規則頁「⚔ 結算戰」只在 `CFG.PAPERWAR_ON` 時多一句圖例文字**（對決畫面本身不加圖例，使用者裁定）。（v0.38 已清）該節前半原本仍是舊的「比戰力扣血」口徑，2026-09-06 深夜改成 `CFG.PAPERWAR_ON` 三元分支：ON＝紙紮夜戰口徑（召軍／三拍／勝負序／`PW_MIN`–`PW_MAX` 扣血），OFF＝舊文案一字不動；純 UI，trace 對 382f1c2 逐位元組相等。

### 11.16 對決大作化 批 1（2026-09-03，v0.27）——接手前先知道這七件事

規格＝派工「對決場景大作化 批 1」五件（hitstop／撞擊粒子／鏡頭 punch／bloom＋夜霧／立體站姿）。
3D 層的紀律仍以 `docs/art-integration-guide.md` §5.2、§6 為準，這裡只放接手最容易踩的。

1. **演出效果是「積木」，不是對決專用的一段時間軸**（使用者 2026-09-03 追加要求）：
   `index.html` 的 `fxHitstop(ms)`／`fxPunch(力道)`／`fxImpact(pos,系別,力道)`／`fxLunge(勝,敗,力道)`／
   `fxFlash(id)`／`fxBurn(元素,{ms,fac,pos})` 各自獨立、可重複呼叫、參數化。`playDuel` 只是**第一個**
   組裝它們的地方（`grep -n "await fxHitstop"`）。下一卷《紙紮夜戰》要改三拍制，就是在每一拍
   各叫一次這幾個積木，**不要回頭把效果焊進 playDuel 的時間軸**。數值集中在 `FX` 這張表，全部【試玩必調】。
2. **積木與 3D 之間只靠事件**：`ys:hitstop{ms}`（renderer 把該段 dt 歸零）／`ys:fx-punch{power}`（camera-director）／
   `ys:fx-impact{pos,fac,power}`（particles 的噴發池）／`ys:fx-lunge{w,l,power}`（duel-figures）。
   事件名刻意不含「duel」，因為它們跟對決無關。發事件的仍然只有既有那四支演出函式。
3. **hitstop 不是 busy-wait**：`fxHitstop` 加 `body.hitstop`（CSS `animation-play-state:paused`）＋發事件，
   用 `setTimeout` 排程。SKIP 快轉時整組略過（實測：SKIP 下 hitstop 區間數＝0、punch／噴發／lunge 事件都不發）。
4. **人形是可換皮的**：`js/duel-figures.js` 只透過 `{group, shadow, setPortrait, setCloth, setRim, ready}`
   這組介面操作人形。要換成別種呈現（紙紮多層剪影貼片）就寫一個新工廠回傳同樣這幾個成員，
   用 `createDuelFigures(scene, camera, { makeFigure: 你的工廠 })` 傳進來，其餘程式碼一行不動。
   袍子色是從角色 SVG 的 `--cloth` 讀出來的，**不要另建一張色表**。
5. **尺寸一律用 CSS 像素換算，不要用世界單位**：`FIG.pixelH`（人形）與 renderer 的 `fxScale()`（火花）
   都把「畫面高度」換算成世界單位。寫死世界單位的話，390px 高的手機剛好、828px 高的桌機會變成
   兩個巨人把名字擋掉（實測 `scratchpad/duel-1268-2-hitstop.png` 第一版）。人形的水平位置也是
   對齊 DOM 的 `#dL`／`#dR` 欄位中心算出來的，改對決版面時它會自己跟上。
6. **bloom 是自製的，不是 UnrealBloomPass**（`js/bloom.js`）：addons 那支在 SwiftShader 上兩支 program
   直接連結失敗、console 冒兩個 `THREE.WebGLProgram: Shader Error`（自製版換成 RawShaderMaterial 之後
   仍在軟體 GL 上失敗，那是「把場景畫進 render target」這條路的問題，不是 shader 寫法）。
   所以 `renderer.js` 有一道 `bloomOK` 閘門：GPU 名稱像軟體光柵（SwiftShader／llvmpipe）就整個不開 bloom，
   退回直接 render。**驗收「console 0 error」要在真實 GPU 上跑**（headless Playwright 預設是 SwiftShader）。
   bloom 只在對決場景開，牌桌與標題頁走原本的直接 render——這是「手機效能」與「牌桌畫面不變」兩條的作法。
7. **霧改成 `FogExp2`，密度分兩段**（`scene-env.js` 的 `FOG_DENSITY`，renderer 每幀往目標補間）：
   牌桌 0.055 刻意保守、對決 0.115 才是夜霧。線香煙在對決會壓到 22%（對決機位貼著桌面，
   煙會從鏡頭前飄過去糊住兩張臉）。**牌桌那一段的數字動了就要重看 J7 的牌桌對照。**

### 11.15 盯上信譽（2026-09-03，v0.21）——接手前先知道這幾件事

規格＝`docs/GAME_DESIGN.md` §5.8 規則 3（虛張稅拿掉）與規則 7（信譽），狀態欄位＝`ARCH_SPEC.md` §4 的 `S.cred`。

1. **虛張稅沒了，`CFG.MARK_TAX` 預設 0**（使用者裁定，不是順手改的）。虛張的代價改由信譽承擔。
   `MARK_TAX` 那段程式碼**留著沒刪**（`if(CFG.MARK_ON&&S.marks&&CFG.MARK_TAX>0)`），設回 1 就恢復舊行為——
   Y1 kill switch 就是靠這個回到 `3137e42` 的。**UI 的稅字樣三處都改成條件顯示**（規則頁流程、規則頁盯上宣告那節、
   `showMarkUI` 的說明列），`MARK_TAX=0` 時整句消失；日後把稅改回非 0，文案會自己長回來，不必再改。
2. **三層分得很開，別混在一起改**：
   - 記錄層 `recordCred()`（`grep -n "^function recordCred"`）：夜末在**原虛張稅的同一時點**（`resolveBattles`，
     心願判定之前）給每個有宣告的人記一筆 `min(1, 對那件的出價 ÷ max(1,|it.p|))`，沒出價＝0，只留最近 `CFG.MARK_CRED_WIN` 筆。
   - 計算層 `credOf(p)`：平均；**沒有任何紀錄回 1.0**（不是 0）。想讀信譽一律走它，不要自己去平均 `S.cred`。
   - 反應層（`aiBids` 的盯上反應段）：怯場 `val -= Σcred × MARK_SCARE`／搶標 `val += MARK_CONTEST × (Σcred ÷ 人數)`。
   **記錄層與計算層零亂數、不改任何結算值**——這是 `MARK_CRED_ON=false` 能跟舊版逐位元組相等的唯一原因，
   要在這兩支裡加東西，先確認新加的也是「讀現成的值」（同 §11.13 第 2 點的規矩）。
3. **`MARK_CRED_ON=false` 為什麼會退化成原本的算式**：反應層的 `sum` 在關閉時直接取 `k`（盯它的人數），
   於是 `k*MARK_SCARE` 與 `MARK_CONTEST*(k/k)` 逐項等於改動前那兩行。**動這一段前先想清楚這個恆等式還成不成立**，
   它是 kill switch 的全部依據；改壞了 Y1 會紅，但你會先浪費半小時找不到原因。
4. **本夜記的分，下一夜才生效**：AI 讀信譽是在 `aiBids`（出價階段），記分在夜末——同一夜內不會出現
   「我今晚老實出價、今晚就被當可信」。要改成即時生效得把 `recordCred` 往前搬，那會改變 trace，不是加三行的事。
5. **金額從哪來**：`S.wishNight.bidAmt[pid][i]`（`resolveAuction` 裡與 `bidItems` 同一行旁邊寫入，同一口徑——
   都是 `CFG.MAX_BIDS` 裁切**之後**留下的有效標）。押寶夜一注多押時同一注的金額會出現在每一件上，與 `bidItems` 一致。
6. **改記分公式要先過反漏洞探針**：驗收凍結條件是「盯最低價只出 1」的養信譽打法，局末平均信譽要比
   「盯最高價出 `min(cap,5)`」低 **≥0.3**（現況 0.2906 vs 0.7658，差 0.4751，n=2000）。
   把公式換成「有出價就 1」這種計數器，同一支探針差距會歸零——**這條門檻擋的就是那種退化**。
7. **UI 三個入口**：角色卡 ⓘ（`showRoleInfo`，掛在 `roleDescHTML` 之外——那支只吃 `roleId`，選角畫面也用它，
   而信譽是「這一席這個人」的紀錄不是角色屬性）／盯上宣告畫面（`showMarkUI` 的 `.credin` 那段，
   刻意併進既有 `.preview` 框而不另開一列，理由同 §11.10 第 2 點的高度預算）／規則頁「🤝 盯上信譽」一節。
   三處共用 `credTxt(p)`／`credRowHTML(p)`，不要各自寫一份格式。
   ★**未量測**：`.credin` 是新增的文字，844×390 的 `#felt` 溢出量沒有在瀏覽器實測過（本卷的 Y8 由另一條線做）。　**→ 2026-09-03 主對話已量：844×390 四夜型 #felt 溢出 0px（＝基準）、2000×922 亦 0px、console 0 error；v0.23 起信譽只留一行（近 N 次；怎麼算看 ？），長解釋只在規則頁。**
   規則夜＋長角色名時最可能擠到——要縮的話動 `showMarkUI` 那句 `.credin` 的文案，不要動框架。★

**v0.24 追加（2026-09-03 晚）**：
- **盯上頁的對手提示放底列 `#budget`，不放牌桌**：`markHintHTML(ap)` 印每隻活著 AI 的「頭像＋反應詞＋對你目前效果 %（＝你的信譽×100）」與一句依桌面組成的提示。放進 `#felt` 的預告框實測會在規則夜溢出 11–28px（收祟夜的規則說明本來就把框吃滿），底列在盯上階段是空的、出價階段被 `updateBudget` 整個覆蓋，零版面成本。**牌桌 #felt 在 844×390 已無高度預算，再加東西要先量。**
- **G2′ 改成反事實量尺**（`tests/tools/mark-gate.mjs` 的 `runFair`）：mtop 與 mnone 出價完全相同、同種子，只差有沒有盯主標；掛 `onBidSettle` 純讀主標那件上「別人」的出價數，比值 ≤0.9（怯場桌）／≥1.1（搶標桌）。舊的「被盯 vs 未盯」量法混入「那件本來就最搶手」，已保留為沿革。G2′ 仍是活性檢查，放行看 G1′。

**v0.26 妖語嘟囔聲（2026-09-03，使用者裁定甲：要語音但不要真人聲）**：`sfx.js` 新增 `babble` 樂器（每音節＝帶下滑的短音＋倍頻＋一小撮帶通噪音當子音；音節起伏由 rnd 種的 LCG 決定）；`index.html` 的 `VOICE_PROFILES` 給十個角色各一組 `{f,type,rate,breath}`，`sayFrom()` 冒對話框時呼叫 `babble(p,txt)`（音節數＝台詞字數÷2，2~9；SKIP／音效關／人類席不播；用 `S.rngUi`）。驗法：`YS_SFX.render('babble',{sec:2,rnd,n,f,type,rate,breath})` 離線渲染量 RMS>0（實測 0.02~0.026、峰 0.23），包 `YS_SFX.play` 計數確認 AI 說話才叫。兩次渲染有 3e-8 的浮點差，是節點加總順序，不是亂數。音色全【試玩必調】，在 `VOICE_PROFILES` 一行改一個角色。

### 11.14 v0.11 美術與音效層（2026-09-03）——接手前先知道這六件事

完整規格與掛點在 `docs/art-integration-guide.md`（§2 頭像、§5 動畫、§8 音效），這裡只放接手時最容易踩的。

1. **美術層是純呈現，等價驗證只驗「相等」**：四個階段（主題與頭像／三段動畫／音效／配色橋接）每一階段都對前一 commit 跑 `trace(1..20)` 逐位元組相等（`13b685f`→`236441d`→`5212f40`→v0.11）。之後任何動美術層的改動照這條：**必須相等**，不相等＝演出漏進了賽局。
2. **`index.html` 的 `:root` 舊變數名（`--bg`／`--gold`／`--yinqi`…）現在全部指向 `assets/theme.css` 的 `--c-*` token**，舊十六進位值留在 `:root` 註解裡備查。**`--yinqi` 從紫改成暗綠，紫讓給 `--curse`**——所有寫死的紫色（`.wishbar` 的 `#7a5ea8`）現在是「心願」語意，不是陰氣。`?sim=1` 工具頁自帶樣式，沒動。
3. **頭像**：`CHAR_SVG` 表接 `ROLES` id↔檔名（`hunter→lieren`、`xiaonv→xiaonu`、`lvshan→lushan`、`zutou→zuhe`、`luzhu→pud`，加角色時必填），`preloadArt()` 在 `startEntry()` 的手勢裡 fetch，抓不到退回 emoji `p.av`。`lifeState(p)` 與 `faceOf`／`faceLbl` **同一組門檻**（r>2/3 紅潤／r>1/3 蒼白／其餘垂危），改門檻要三處一起。`tests/tools/load.mjs` 的 stub 沒有 `fetch` 的 DOM 環境，所以任何新演出程式碼**不得在載入期碰 DOM 或 fetch**。
4. **動畫都是加減 class**（keyframes 在 `theme.css`）：開標 `veil()`＋`.anim-lantern-reveal`＋`revealGlow(r)`；對決 `#duel.on` 淡入淡出＋`.anim-clash-*`（`.charge-*` 已移除）；盯上 `markStampHTML(id)` 記在 UI 端 `STAMPED`，**不進 `S`**。`renderSeats()` 重畫座位卡會自然清掉演出 class，`#south` 不重建所以在 `renderSeats` 裡手動清。
5. **音效 `assets/audio/sfx.js`**（純 Web Audio 合成，`<script>` 在主 script 之後——`load.mjs` 只抓第一個 `<script>`）：一律經 `sfx(name,{rnd:S.rngUi()})` 包裝，**`SKIP` 快轉不播、靜音不播，永遠不傳玩法流那支亂數**。引擎函式（`resolveAuction`／`resolveBattles`／`simulate`）裡零呼叫，驗法：`awk` 掃那三個函式區段 `sfx(` 命中數＝0。手機第一聲要靠使用者手勢解鎖（`initSfx()` 在 `startEntry`），**用 `element.click()` 從 script 觸發不算手勢**，AudioContext 會停在 suspended——瀏覽器自動化驗音效要用真實點擊。
6. **量版面的方法**：844×390，`#south` 最緊情境＝放血鈕出現＋預算文字＋「蓋牌開標」，實測 `scrollWidth−clientWidth=0`、主鈕右緣 827。`#felt` 內部本來就有 2px 捲動差（v0.10 就有，A/B 對照過），不是美術層造成的。西／東座位卡因 SVG 頭像由 84→94px，側欄有餘裕。

### 11.13 v0.10 局末回顧（2026-09-02）——接手前先知道這五件事

1. **資料在 `S.history`，不在 `S.wishNight`**：`S.wishNight`／`S.markStat`／`S.ruleStat` 每夜在 `resolveAuction` 開頭整包重置，跨夜資料只有 `S.history={life:[[...]],nights:[...]}`。
   `life[0]` 是入市時各人壽命，之後每夜 `recordNightEnd` 推一筆（索引 k＝第 k 夜結束）；`nights[k]` 由 `recordAuction`（`resolveAuction` 末尾）建立、`recordNightEnd`（`resolveBattles` 末尾）補 `fights／bye／wishes／deaths` 並標 `closed`。
   欄位形狀直接看 `recordAuction`／`recordNightEnd` 本體（`grep -n "^function recordAuction"`），不另抄一份以免分岔。
2. **純記錄、零亂數**：兩個 record 函式只讀既有物件，不呼叫 `S.rng()`、不改任何結算值。等價驗證＝`trace(1..20)` 與改前 commit 逐位元組相等（反面：在 record 段塞一次 `S.rng()` 必不相等）。
   **加新記錄欄位照這條規矩**：讀現成的值、不算新東西、不耗亂數；驗證重跑 `tests/review.test.mjs` 與等價比對。
3. **`finalizeHistory()` 只在局末呼叫**（`endGame` 與 `showReview` 開頭）：異事夜殺到剩一人時該夜沒有拍賣／對決，最後一段壽命變動沒被 `recordNightEnd` 拍到，它比對末筆快照與現值、不同才補一筆；冪等。
   `playPolicyGame`／`simulate` 不呼叫它（它們的 `lifeByRound` 語意未動）。
4. **UI 是 `showReview()`／`closeReview()`**，容器 `#review`（fixed 全螢幕、自己捲動，body 仍 overflow hidden）；曲線是手刻 inline SVG（`viewBox 360×150`，寬度隨容器），專案裡沒有其他 SVG／canvas。
   顏色 `RV_COL` 依座位（南金／北祖靈綠／西陰氣紫／東紅），真人線較粗；出局者曲線停在歸零那夜並打 ✕。改版面只動這兩個函式與 `.rv*` CSS，不碰 record 層。
5. **測試**（v0.10 上線時實跑結果：28 綠、對 c2d9362 全紅、Playwright 11 夜 0 error——見 GAME_DESIGN changelog；本條寫的是「該驗什麼」，不是驗證報告）：`node tests/review.test.mjs`（走真實 `playPolicyGame`，驗 `history` 不變量、與 `lifeByRound` 逐值相同、`reviewSummary` 加總、活性計數；對沒有 history 的舊版全紅）。
   畫面驗收用 Playwright 844×390：`newGame('solo',7)`＋自動點主按鈕打到局末，比對 polyline 點數＝各人存活快照數、`.rvItem`＝`nights[*].auction` 加總、`.rvWish`＝`nights[*].wishes` 加總、`scrollWidth` 不超過視窗。
   **`file:` 協定在 Playwright MCP 被擋**——用 `python -m http.server` 起本機伺服器再開。

### 11.12 v0.9 節奏包＋盯上宣告（2026-09-02）——接手前先知道這六件事

1. **節奏包三個值**：`CFG.LIFE=50`／`AI_THROTTLE=0.30`／`NIGHT_REGEN=5`，全設回 40／0.45／0 ＋ `MARK_ON=false` ＝ v0.8.1 行為（等價驗證就是這樣做的）。
   角色起始壽命是 `roleLife0(R)=CFG.LIFE+life0d`，**建玩家時才算**——實驗腳本覆寫 `CFG.LIFE` 會一起平移（一度寫成 `life0:CFG.LIFE-6` 在定義時算死，實驗數據錯了一輪，勿重蹈）。
2. **盯上宣告的資料流**：夜初 `drawMarks()`（AI 依座位序 `aiMark` 耗 rng，`MARK_ON=false` 零消耗）→ 真人 UI `showMarkUI`／headless `policyMarks(policies)`（策略物件的 `mark(p)`，沒有＝不盯）→ `S.marks={pid:索引|null}` → `aiBids` 估值段依 `p.ai.markReact`（avoid／contest／ignore）調 `vc.val` → 夜末 `resolveBattles` 虛張稅（讀 `S.wishNight.bidItems`）。
3. **角色反應型是公開資訊**：`ROLES[*].ai.markReact`，角色卡 `roleDescHTML` 自動帶出；加角色必填。角色要改釘法用 hook `onAiMark`（ctx `{p,cands,mark}`）。
4. **閘門腳本** `tests/tools/mark-gate.mjs`（G1 無支配解＋換桌翻盤／G2 活性／G3 稅有牙／G4 等價），n≥10000；改 `MARK_*` 任一數值都要重跑。
5. **統計**：`playPolicyGame` 回傳 `markStat`（tax／markedItems／markedBids／unmarkedItems／unmarkedBids），`runMany` 未聚合（要就自己迭代）。
6. **天明回血**在 `resolveBattles` 心願判定之後、貸款攤還之前，只給 `alive && life>0` 者——壽命剛好歸零的人不靠回血救（只有心願能救回），與既有語意一致。

### 11.11 心願牌庫滿 24 張（2026-09-02 v0.8）——接手前先知道這五件事

1. **`WISHES` 現在 24 張**（原 8 ＋第二批 16，`grep -n "第二批 16 張" index.html`）。第二批的獎勵在 `CFG.WISH_REWARD2`、
   門檻在 `CFG.WISH_T2`、AI 估值加成在 `CFG.WISH_AI2`，與首批的 `WISH_REWARD`／`WISH_T`／`WISH_AI_*` 分開放，全數【試玩必調】。
2. **`desc` 可以是函式** `desc(p)`：鎖定對手類（隔岸觀火／禍水東引）要把對手名寫進牌面。`wishBarHTML` 已處理兩種型態；
   其他要顯示 desc 的地方（目前沒有）記得比照 `typeof w.desc==="function"`。
3. **`target(p)` 選填欄位**：`drawWishes` 抽到有 `target` 的牌時，當下呼叫一次寫進 `p.wish.target`（決定性、不耗亂數）。
   `check`／`hooks` 讀 `ctx.p.wish.target`，不要自己重算（夜中壽命變動會讓「壽命最高者」換人）。
4. **`S.wishNight` 多了 9 個純記錄欄位**（`bidCount`／`bigWin`／`cheapWin`／`yamingWon`／`soloWin`／`crowdWin`／`destroyed`／
   `poisonTargets`／`dmgDealt`），寫入點都在 `resolveAuction` 得標分支與 `resolveBattles` 對決段、註解「心願統計」。
   它們只被 `check` 讀，不改結算——`WISH_ON=false` 與舊版逐位元組相等就是靠這一點。
5. **等價驗證用兩把尺**（`tests/tools/a1-wish16.mjs`）：`WISH_ON=false` 相等（統計欄位沒漏亂數）＋執行期 `delete` 新 16 鍵後相等
   （原 8 張行為未動）；`WISH_ON=true` 必不相等（新牌真的進了牌局）。加第三批牌照抄這支腳本。
   平衡量測 `tests/tools/wish16-balance.mjs`（達成率、座位 0 條件勝率、三策略位移，閘門 n≥10000）。

### 11.10 v0.7.1 殘留處置（2026-09-02 傍晚）——接手前先知道這四件事

1. **保守標上限改在伺服端夾**（ARCH_SPEC 待辦 20 結案）：`resolveAuction` 收標時以**結算當下**的壽命重算 `consCapFor`，超上限的保守標一律以押命標結算（含押寶夜一注）。UI 的按鍵夾只是提示。這條**必然改變 trace**（AI 獻祭刀放血會讓別人已定案的保守標超上限），等價驗證改用鑑別式：trace 有差的 seed ⇔ 該局有「落標的保守標被夾」（`tests/conscap.test.mjs`）。
2. **放血鈕在底部列** `#south`（袋子／ⓘ 旁），不再是牌桌上一整列；規則夜說明併進「明夜預告」框。`#felt` 高度預算仍是零餘裕——**再加任何一列牌桌內元件前先量四組溢出**（一般／落魄／收祟／押寶＋持獻祭刀，844×390）。
3. **押寶夜 AI 有真決策了**：`onAiStake`（`grep -n "onAiStake"`）把 AI／策略原本的多筆出價壓成一注時，X＝**會進開標的前 `CFG.MAX_BIDS` 筆**金額總和（`MAX_BIDS=0` 全取），受型態上限夾、型態取原本最大那筆、勾選集不變（使用者裁定 D1′；「各筆全加總」版 n=10000 三規則全開 splitter −1.75 超標、且高估 AI 預算，已棄）。真人不經過它。
4. **平衡數字的樣本數**：本批所有 ≤1.5pp 判定都用 n=10000（§7 新規），n=2000 的位移在本批實測兩處正負號翻掉。ARCH_SPEC 待辦 15（收祟夜棄權略優 +0.79pp）使用者裁定不改規則、結案。

### 11.9 今夜市集規則已上線（2026-09-02）——接手前先知道這五件事

**四層架構的最後一張空殼表填完了**：第 3 節說「`NIGHTRULES` 是空殼、加了不會出現在遊戲裡」的描述已過時。

1. **三條規則進了 `NIGHTRULES`**（`grep -n "const NIGHTRULES" index.html`）：**落魄夜**（落標一律全額扣除）／
   **收祟夜**（市集全詛咒品＋禁買下銷毀＋夜末流標的硬塞給「**本夜沒出手的人**裡壽命最高者」）／**押寶夜**（一人一注 X ＋勾選要壓哪幾件，
   最多得一件、費用只收一次、詛咒品不開標）。排程＝`CFG.RULE_NIGHTS=[3,7]` 開局洗牌抽 2/3
   （刻意避開異事夜 4／8／11 與第 1 夜、末夜，所以「夜市耳語」那一欄同一夜不會撞）。
   **收祟夜的塞袋對象是「本夜未出手者中壽命最高者」（口徑 4′）**，全員都出手才落回全場壽命最高者——
   「未出手」＝本夜沒有任何標進入開標——**直接用引擎既有的 `S.bidAny`**（`resolveAuction` 已維護的
   「本夜有實際出過價、且沒被作廢／裁掉的人」），不另立第二份判準：綁「毒標」的話，日後收祟夜若混進非詛咒品，
   掏錢買了法寶的人會被誤判成袖手旁觀而收下全部流標詛咒品。候選另要求 `q.life>0`——
   出局旗在這個 hook 之後才蓋，不排除的話「本夜已被打到 0 命」的人仍算活著、會被選中而讓懲罰落空。
   總開關 `CFG.RULE_ON`，false 時零 rng 消耗、`trace(1..20)` 與 `5c8604d` 逐位元組相等（雙向驗過：true 必不相等）。
   `CFG.RULE_FORCE`（預設 `null`）＝測試／模擬專用，指定該局規則夜全出這一條；**它只覆蓋洗牌的結果、不省略洗牌**，
   所以「指定規則」與「隨機規則」的亂數流一模一樣。
2. **引擎只認 flag，不認得規則 id**（鐵則 2.4）。三個開關寫在規則的 `flags` 裡，由 `resolveAuction` 一處攔截：
   `noDestroy`（買下銷毀**改成毒標**：對象＝`strongestFoe(pid)`＝戰力最高的存活對手，**沒有對手可塞才作廢**；
   人類 UI 在 `openSheet` 做同一件事，兩邊共用 `strongestFoe`——**這條禁令對人和對 AI 必須同語意**，
   舊版對 AI 是「整筆作廢」，那是 2026-09-02 覆審抓到的 HIGH-2）／`noCurseAuction`（詛咒品整件不開標）／
   `singleStake`（一注多押：最多得一件、落標費與買路錢各只收一次）。
   **`aiBids()` 與 `POLICIES` 的策略碼一個字都沒動**——AI／策略照常吐多筆出價，
   引擎用 `toSingleStake(row)` 壓成「X＝原本最大那筆的金額、勾選＝所有原本出過價的法寶、型態＝金額最大那筆的型態」。
   要改押寶夜的 AI 行為，改的是 `toSingleStake`，不是 `aiBids`。
3. **新增了兩個引擎掛點，動它們前先讀這裡**：
   - `drawMarketFor(r)`＝「抽第 r 夜的市集」。市集是**前一夜**就抽好的（`S.nextMarket`），所以 `onMarketDraw`
     必須看**目標夜**的規則、不是當下的 `S.nightRule`——`drawMarketFor` 用「暫時掛上目標夜規則→抽→還原」做到這件事。
     `drawMarket()` 現在收一個 `forRound` 參數，三條迴圈的 `S.nextMarket=drawMarketFor(S.round+1)` 都要一起改。
   - `onNightEndGlobal`＝第 13 個 hook，在 `resolveBattles` 的最後、逐人 `onNightEnd` 與異事後效之後跑一次，
     `p=null`（只取 `nightRule`／`event`），`ctx={log}`。用於「不屬於任何一位玩家」的夜末後效——
     收祟夜的強制塞袋就在這裡，且**刻意不呼叫 `onWinItem`**（規格：下手者＝無，不觸發紅衣婆婆記仇）。
4. **可理解性層的四個掛點都是資料驅動的**（改文案不用碰引擎）：規則物件的 `bar()`＝牌桌上那條短說明、
   `desc()`＝規則頁（`openHelp`）的完整規格、`hint`＝耳語預告與規則頁的一句話、`loseLabel`／`sheetLose()`＝
   開標實付註記與標單上的落標說明（落魄夜靠這兩個把「落標退還 75%」改成「落標全額扣除」）、
   `report(stat)`＝夜末戰況那一行。`S.ruleStat={extra,forced,multi,abstain,fallback}` 是本夜的規則活性計數
   （`abstain`＝塞給沒出手者的次數、`fallback`＝全員都出手而落回全場壽命最高者的次數），
   `resolveAuction` 開頭重置，`runMany` 會把它聚合進統計輸出（`ruleFired`／`ruleStat`）。
   **落魄夜的 `extra` 只記「本規則自己加上去的那一段」**，之後跑的保命 hook 若再壓低，那一行的數字會略為高估——
   它是說明文字，不參與任何結算。
5. **平衡（A5）已達標，但有一件事要知道**：`n=2000` 對照（座位 0 為腳本策略），RULE_ON true−false 的勝率位移
   splitter **−1.05pp**／greedy **+0.10pp**／hoarder **+0.05pp**，全數落在凍結的 ≤1.5pp 內。
   這個數字是**修訂後**的——2026-09-02 首版曾是 +3.10／+3.75pp，根因是收祟夜的口徑 4
   （「塞給當前壽命最高者」）讓「不出手」零成本、對真人構成支配解，經使用者裁定改成
   **口徑 4′**（塞給「本夜未出手者中壽命最高者」，全員出手才落回壽命最高者）才收斂。
   **殘留**：治具實驗（`scratchpad/nr/a5-fixture.mjs`）顯示 4′ 之後「純棄權」對「1 點毒標」仍略佔優
   （splitter 17.60 vs 16.30、greedy 兩者同為 14.35），咬得到但咬得不夠深。
   診斷數字（`nr/a5-diag.mjs`，800 局收祟夜）：棄權者出手率 0%、被強制塞袋率 **56.6%**、該夜支出 476；
   下 1 點毒標者出手率 95.8%、被塞率 32.8%、支出 2757——**懲罰確實有咬到，只是還不足以蓋過省下來的支出**。
   要動的是規則的懲罰強度或策略碼，**不是 CFG 數值**；未經使用者裁定不要調。
   測試檔：`node tests/nightrules.test.mjs [index.html 路徑]`（16 條，對 `5c8604d` 舊版跑會紅 15 條、
   對覆審修前副本跑會紅 4 條，全紅在行為斷言）。

6. **對抗覆審（2026-09-02）修掉的六條，改它們之前先讀這裡**：
   - **心願池要跟著規則收斂**：押寶夜的「最多得一件」「一注只算一次落標」「詛咒品不開標」讓
     `wish_multi`／`wish_yaming`／`wish_poison` 的達成條件**結構恆假**，三張的 `canDraw` 已改用
     `hasFlag(null,"singleStake")`／`hasFlag(null,"noCurseAuction")` 擋掉（**用 flag、不寫規則 id**）。
     **以後每加一條規則，都要回頭掃一次 `WISHES` 有沒有被它變成恆假的牌**——覆審實測修前有 37.0%
     的人類心願一抽到就是死牌，修後 0.0%。
   - **禁令對人和對 AI 必須同語意**：收祟夜的「買下銷毀」對人類 UI 是「自動改成毒標」、
     對 AI 曾是「整筆作廢」。現在引擎統一轉毒標，對象由 `strongestFoe(pid)` 決定，與 `aiBids` 既有選法同一份。
     **加新禁令時先問「人類那條路是怎麼處理的」。**
     **量測要在正式 `CFG.MAX_BIDS=2` 下做**（2026-09-02 第二輪覆審 N3 的教訓：第一次是把上限關掉量的，
     量到「作廢 0 筆」，正式設定下並不成立）。正式設定、800 局、四家全 AI 的實際數字：
     `aiBids` 生 6008 筆詛咒標 → **修前進開標 3049 筆（消失 49.3%）、修後 4403 筆（消失 26.7%）**。
     修後消失的 1605 筆**全部**歸因於 `MAX_BIDS` 名額裁切（逐人比對「依金額排名取前 2」，不符人次 0；
     修前不符人次 883＝那些才是被 `noDestroy` 作廢的）。原因：`aiBids` 的詛咒品攻防段刻意不受每人筆數上限
     （原註解「詛咒品攻防獨立出價，不跟法寶搶前二名額」），收祟夜四件全詛咒時一隻 AI 可生 4 筆，
     而引擎的裁切在「轉毒標」之後才跑——修前那些 `keep` 標先被拿掉、不佔名額，修後會參與排名。
     副作用（已量）：原生毒標的存活率 86.4% → 82.6%，轉出來的毒標會擠掉金額較低的原生毒標，
     這是「所有標公平競爭」的合理後果。探針：`scratchpad/nr/probe7b.mjs`。
   - `S.unsoldCurses` 用完就清（`onNightEndGlobal` 末尾＋`resolveBattles` 各一道），
     防的是「跑了夜末卻沒先跑拍賣」把同一批再塞一次；現行三條迴圈到不了，但防線按危險效果寫。
   - `checkRuleSchedule()`：`RULE_NIGHTS` 撞 `EVENT_NIGHTS`、或長度超過規則條數時 `console.warn`
     （正式值 `[3,7]` 零輸出，同一則只講一次不洗版）。規則頁顯示的夜次改從 `S.ruleOrder` 實際生效的算出。
   - 熱座交棒的清除面已從 `.wishbar` 擴到 `#stage .wishbar,#stage .stakebar,#stage .mybid,#stage .pickbox`
     （押寶夜的封注金額比心願更敏感：心願是理由，X 是底牌）。
   - 收祟夜換市集時被換下的牌**各自回自己的牌堆底**（`(x.curse?S.cdeck:S.deck).unshift(x)`），不再漏一張。

7. **兩件「知道但沒修」的事**（改押寶夜或角色平衡前先看）：
   - **押寶夜把落標型被動壓成每夜最多 1 次**：`onBidSettle` 只在該人的結算件跑一次，所以孝女白琴
     「押命標落標讓得標者 −1，每夜至多 3 次」在押寶夜上界變成 1 次，紅衣婆婆的「被搶標記仇」同理。
     判定為「一注＝一筆標」的設計結果，已寫進押寶夜的 `desc()` 讓玩家看得到（`ARCH_SPEC §9` 待辦 19）。
   - **收祟夜的「敗軍之志」是難度斷崖、不是死牌**：市集全詛咒時 AI 出價低、型態恆為保守標，
     `yamingLost≥2` 實測 1200 夜 0 人次；但真人仍可下兩筆押命型毒標達成，所以**刻意不發 canDraw**。

### 11.8 AI 三人組玩家被動已補實作（2026-09-02，試玩回饋）

青面攤主（對手上一夜得標陣營的拍品比價 eff+2，`onBidEff` 讀 `S.lastWon`）、紅衣婆婆
（被毒標塞中時下手者 −2，併入既有記仇 `onWinItem`）、斷手書生（同系 ≥4 件該系共鳴額外 +4，
`onPowerCalc` flat）——三者原本只有 AI 行為、玩家被動是白板，規格照 GAME_DESIGN §六之三A 表。
單元測試 8 條（含負向）對 7491dce 舊版恰紅在三條行為斷言、新版全綠。
分組勝率 n=2000：27.1→27.9／29.0→30.1／25.9→27.0（%）。
同批：**選角畫面過濾「AI 時…」句**——AI 行為是開發者資訊，玩家不顯示（`renderSelect` 的
seg filter）；desc 慣例仍是「X流（起始N）。被動：…。AI 時…」，AI 句照寫、只是選角不渲染。

### 11.7 可理解性層已上線（2026-09-02 全遊戲審視批次）——純呈現，不動機制

一次「新玩家每一步知不知道發生了什麼」的全遊戲審視後加入（13 條落差清單見 memory 分卷）：
開場三卡引導（localStorage `yaoshi_intro_v1`，只彈一次）、牌桌右上 `#helpBtn` 規則頁
（`openHelp()`，內文數字全從 CFG／EVENTS 帶入，改數值不用改文案）、對決畫面戰力標示＋
傷害公式行（能力調整時顯示「公式 X、實際 Y」）、夜末戰況補對決結果行與「你的壽命 A→B」
總帳行（`NLIFE0` 夜初快照，純 UI）、solo 心願未達成具名（熱座維持匿名）、開標實付註明
（僅自己的行，不洩他人標書型態）、異事 hint 欄（耳語預告與規則頁共用）、厲鬼被鎖定者
紅字警示、放貸欠款顯示（底部列＋座位卡，開盅本來就公開）。
**本批只動 nightly 字串與 UI**：等價驗證＝兩版 trace 把 nightly 清空後逐位元組相等
（完整 trace 必不相等——心願具名與耳語 hint 生效的活性證據）。
`beginRound` 拆成 `beginRound`（引導閘）＋`beginRoundCore`（原流程）。

**追加（2026-09-02 試玩回饋）：座位卡「ⓘ」角色資訊小卡**——選角畫面看得到角色被動、進遊戲後看不到，
牌桌上點任一座位卡（自己或三席 AI）的 ⓘ 鈕都能重看頭像／角色名／流派徽章／起始壽命／被動說明，
文案分句與「AI 時…」句過濾邏輯抽成共用函式 `roleDescHTML(roleId)`（`index.html`），選角畫面與座位小卡
都呼叫它，不得各自複製一份。座位原本整張卡點擊即開 `showBag()`（袋子），ⓘ 鈕另外掛
`event.stopPropagation()`，兩者不衝突。純 UI，不消耗 `S.rng`，等價驗證＝新舊版 `trace(1..20)` 在
**完整預設 CFG 下**逐位元組相等（未動任何 nightly 字串）。

### 11.6 異事系統已上線（2026-09-02）——接手前先知道這五件事

1. **八樁異事進了 `EVENTS` 表**（2026-09-02 第二批補齊）：瘟王過境／試膽大會／厲鬼索命／
   送肉粽（修A）／觀落陰（修B）／陰間放貸（修C）／大風吹（修D 風向圈）／博杯（修E 廟口擲杯）。
   第二批五樁原版閘門全 FAIL、經使用者裁定改版後全 PASS——**改任何一樁前先讀
   GAME_DESIGN §六之三 B 的兩段事故記錄**。排程＝`CFG.EVENT_NIGHTS=[4,8,11]` 開局洗牌抽 3/8，
   前一夜 `resolveBattles` 夜末推「夜市耳語」預告。總開關 `CFG.EVENT_ON`，false 時零 rng 消耗、
   `trace(1..20)` 與 `d9b2e22` 逐位元組相等（雙向驗證過：true 必不相等）。
2. **三條迴圈共用同一套引擎函式**（`eventForRound`／`eventCtx`／`fillEventChoices`／`settleEvent`）：
   正常頁走異事 UI（`startEventUI`，熱座逐位交棒收密封輸入），simulate／playPolicyGame 走
   `runEventPhaseHeadless()`（真人座位同用各事件的 `ai()` 啟發式）。
3. **異事可在夜中殺人**：settle 後壽命 ≤0 立即出局（心願救不回，與夜末結算不同）；
   若殺到只剩 1 人，該夜**不再進拍賣／對決**直接收束——這條護的是 `aiBids` 毒標選對手時
   的空陣列 crash（實測抓到的，勿移除）。
4. **閘門存證在 `demoEvents`**：plague／ghost 的 analyzeEvent spec 與既有 newShrine 並列，
   2026-09-02 Node 實測三者 verdict 均 PASS。新異事上線前照範例 5 Step 1 跑閘門，不能省。
5. **異事失血不計入 `S.wishNight.extLoss`**——2026-09-02 使用者已裁定**維持「對決＋詛咒」口徑，
   不擴及異事**（依據與三口徑實測數據見 ARCH_SPEC §9 待辦 14，已結案；翻案需先做
   wishNight 初始化時機重構）。平衡實測（n=2000，v0.6 經濟下）：
   事件開關對三策略勝率影響 ≤0.8pp（splitter 11.9→11.9、greedy 11.9→12.7、hoarder 0.3→0.4）。

### 11.5 v0.6 已上線（2026-09-02）——接手前先知道這五件事

1. **拍賣經濟改了**：`CFG.BID_FEE=1`（掛號費）、`CFG.MAX_BIDS=2`（每夜 2 標，引擎在
   `resolveAuction` 開頭裁切）、`CFG.CONS_LOSE_FRAC=0.25`（保守標落標付 25%）。
   三值設回 0 可退回 v0.5 經濟（等價性驗證就是這樣做的）。
2. **心願（WISHES 8 張）與選角（SELECT_ON，10 角選 1 抽 3）已上線**，第 3 節「空殼」的描述過時。
   熱座的心願私有性靠交棒畫面；`wish_east` 吃 `S.wishNight.extLoss`（對決＋詛咒的非自願失血）。
3. **獻祭刀是甲′機制**：`bleed()` 遞增成本（第 n 次 = n×BLOOD_COST）＋所有對手各失 `BLOOD_DRAIN`，
   不再加戰力。改它前先讀 GAME_DESIGN §六之二與 changelog。
4. **實付顯示有可見性規則**（防標書型態洩漏）：得標實付恆顯示；落標實付與 typeLeak 事件
   只在「真人的」或 viewer 有 `showTypes`（普渡爐主）時顯示。改開標演出時不要破壞這條。
5. **新道具上線前必做「條件勝率」檢查**：只看「拿到這張牌的局」的勝率，不是全局平均——
   全局平均會漏掉「稀有但抽到就贏」（獻祭刀 −5 版全局僅 +6pp、條件卻 83.6%＝抽到就贏）。
   目標帶：50~65%，且「用它」要優於「不用它」。

### 11.4 命格系統已上線，但有兩項待裁定（2026-09-02）

六件命格道具（破軍旗／飼鬼甕／過陰咒／福壽綿長／山神庇佑／獻祭刀）已進 `ABILITIES` 與 `POOL`，
係數集中在 `CFG.BLOOD_COST`／`BLOOD_GAIN`／`BLOOD_FLOOR`／`AI_BLOOD_T`／`AI_BLOOD_K`。

**接手前一定要知道的兩件事**（完整數據在 `GAME_DESIGN.md` 六之二「實作狀態與實測結果」）：
1. **獻祭刀目前是陷阱牌**：實測「不放血」嚴格優於放血，`CFG.AI_BLOOD_K` 已設為 `0`（AI 不放血）。
   **不要以為這是漏做**——這是模擬器判讀的結果，機制本身待重設計（`ARCH_SPEC.md` §9 待辦 11）。
2. **命格系統把 splitter 從 53.5% 推到 59.4%**，與「打散分散小額標優勢」的設計目標相反
   （`ARCH_SPEC.md` §9 待辦 12）。之後再加內容時，拿來對照的基準要用 **59.4%**（09-02 版），
   不是 53.5%（09-01 版）。

**已於 v0.6 結案（`ARCH_SPEC.md` §9 待辦 11／12，2026-09-02）**：上面兩點是 09-02 命格剛上線
（v0.5 經濟）當下的量測，**已被同日稍後的 v0.6 拍賣經濟改版取代，不再是現行行為**，保留於此僅
供沿革參考。獻祭刀已改為甲′機制（見 §11.5 第 3 點），持刀條件勝率實測 54.5%（`index.html:290`
註解）；splitter 座位 0 基準勝率隨 v0.6 經濟回落至 **13.10%**（`n=2000`、`HEAD 9707cac` 實測），
已不再高於均衡值 25%。完整依據見 `GAME_DESIGN.md` §六之二「v0.6 更新後現況」。

**放血的唯一實作是 `bleed(p,keep,k)`**（`index.html`，`const has=` 那一行下面），玩家 UI
（`doSacrifice`）、AI（`xianji` 的 `onAiPlan` hook）、模擬器策略（`withBleed`）三邊共用同一份，
不要各寫一份。

**等價性驗證改用新做法**：兩份 `tests/*.json` 基準檔目前都無法用現行 `trace()` 重播
（原因見 `ARCH_SPEC.md` §9 待辦 13）。第 6.4 節那段腳本仍然可用，但比對對象改成
**`git show <改動前的 commit>:index.html` 跑同一支 `trace()` 的結果**，而不是那兩個 JSON 檔。
純新增內容時記得做雙向檢查：把新項目從 `POOL` 拿掉要相等、放回去要不相等
（只驗前者的話，「道具根本沒進牌局」會靜默通過）。

## 12. 傳說三尊的 3D 接線（2026-09-07 美術卷）

三尊走 `LEGENDS`（`index.html`），**不在 `POOL` 裡**。要改它們的 3D 時記得四件事：

1. **模型鍵是 `m` 不是 `ab`**。`LEGENDS` 沒有 `ab`（沒有 `ab` ＝ 不帶任何拍賣能力，`collectEffects` 只認 `ab`）；
   組對決隊伍時 `index.html:2859` 用 `ab: x.ab || x.m || null`，所以 3D 那一側拿到的字串是 `m`。
   `m` 直接就是 `assets/creatures/<m>.glb` 的檔名（`creatureGlbUrl` 只在 `CREATURE_GLB` 有列時改寫，三尊沒列）。
   **現值**：`canri`／`dashiye`／`youyinggong`。
2. **治具要另外登記**。`tests/tools/duel-perf.mjs` 的 `ALL`（bounds 要量到）、`HEAVY`（效能閘門要含三尊）、
   `FAC`（系別），以及 `tests/tools/faction-sheet.mjs` 的 `FAC` —— 這四張表都是**手寫的**，加新尊要自己補，
   忘了補的話三尊會落在所有治具的視野之外、靜默不受檢。
   `duel-perf perf --heavy=base` 是 V6 專用的基準組（原本最重 8 隻、不含三尊），只給「同 session 交錯比較」用。
3. **`traitfx-drive.mjs` 的名冊反查有兩條 regex**。`LEGENDS` 的欄位順序與 `POOL` 不同（`legend:true` 夾在
   `p` 與 `m` 之間），所以 `casesFromIndex()` 另有一條 `reL`；動 `LEGENDS` 的欄位順序會讓三招從名冊消失
   （不會報錯，只會少三套）。
4. **三招的編舞在三個系別檔裡**：`eliteBlind`（`js/trait-fx/zuling.js`）／`wardGuardAll`（`xianghuo.js`）／
   `hauntAnswer`（`yinqi.js`）。骨骼名＝spec 的關節名：`canri` 有 `Root,Hips,Spine,Chest,Neck,Crown,Disc`；
   `dashiye` 有 `Foot,Hips,Waist,Chest,Shoulder,Neck,HeadRoot,Skull,Brow,Crown,JawRoot,Jaw1,JawTip,TongueRoot,Tong1..3,ShrineRoot,Shr1..3,Eave`；
   `youyinggong` 有 `Waist,Spine,Chest,Top,MistRoot,Mist1..2,MistTip,Eave,Censer`。`st.rot` 對不存在的骨回 `false`、不會炸。

### 11.26 請神 3.0「香火池」（2026-09-10，v0.53 上線）——接手前先知道這幾件事

規格＝`docs/proposals/2026-09-10-legend-v3-pool.md` §二（13 條規則是權威）；驗收凍結＝`docs/experiments/2026-09-10-acceptance-legend-v3.md`（H0–H11）；實測報告＝`docs/experiments/2026-09-10-legend-v3-report.md`。

1. **★2.0 的三樣東西已整組移除，別回頭引用★**：`sh.night`（尊→夜每局洗牌）、`sh.h`（逐龕香火）、
   請神夜的落空**階段獎勵**（`shrineClose`／`out.rewards`），連同 UI 的 `incPick`（選尊按鈕）。
   §11.24 那一節寫的是 2.0，讀它只為了看沿革，**不要照著它接手**。
2. **香火在 `S.incPool[pid]`，不綁尊**。三尊只剩 `{i,fac,open,takenBy,round,dawn}`。
   讀某人手上的香火一律 `S.incPool[pid]`；`S.incBurn[pid]`／`S.incBack[pid]` 是整局燒掉／局末退回的純記錄（閘門 H4 用）。
3. **`resolveShrines` 是兩段式**。`resolveShrines()`（headless 三條迴圈）一次做完；
   `resolveShrines({interactive:true})` 在**真人得主**時提早回傳 `out.pending={pid,h,choices}`、
   **尊還沒發**，等 UI 的選尊視窗選完再呼叫 `finishShrines(out, idx)` 收尾（發尊＋最後一夜回天＋`recordShrines`）。
   ★三條迴圈的口徑一致★：只有 `startShrine` 傳 `interactive`，simulate／playPolicyGame 都不傳 ⇒ 走 AI 規則。
4. **得主自選的兩條路收在同一支 `awardLegend`**：`idx` 為 null／不合法／已被請走 ⇒ 退回 `aiPickShrine`
   （袋中最多陣營同系、同數取 `LEGENDS` 順序靠前者）。要改選尊規則只改 `aiPickShrine` 一處。
5. **請神夜的三個判斷只讀 `CFG.SHRINE_NIGHTS`**：`isShrineNight(r)`／`shrineNightsLeft(r)`／`lastShrineNight()`。
   AI 停損、結算入口、香火榜倒數、燒香列全問這三支，不得各自再寫一份。
6. **「三尊都沒了就不收封籤」在 `resolveShrines` 的燒香段最前面**（`anyOpen`）。
   UI（`initIncense`）、AI（`aiIncense`）、策略（`policyIncenseMax`）也都問同一支 `openShrines()`——
   這是四道同義的門，改其中一道記得四道一起改（防線按危險的效果寫，不按已知入口寫）。
7. **亂數帳**：3.0 的請神引擎段**零 `S.rng()`**；唯一還會走 rng 的是局末結清抽小法寶
   （`settleShrinesEnd` → `shrineReward`）。所以「ON 與 OFF 在 `makeState` 之後的亂數游標必須落在同一格」
   ——`legend.test.mjs` H5⑧ 與 `legend-gate.mjs` H0 各有一支探針在守它。
8. **UI 是「香火榜一行＋三尊待請卡」**（`shrinesHTML`，在 `#stage` 法寶卡正上方）。
   高度預算沿用 2.0 覆審 HIGH-1 甲：**平常 `slim`＝榜與三卡擠成一列**，
   只有**請神夜前一夜與當夜** `wide`＝拆成兩列、卡上多印招式名。`#felt` 在 844×390 是零餘裕（§11.12），
   要加東西先跑 `tests/tools/felt-probe.mjs`。
9. **治具**：閘門 `tests/tools/legend-gate.mjs`（H0–H4／H9，基準 `e83028c`＝v0.52）；
   單元 `tests/legend.test.mjs`（H5／H10／H11，`node tests/legend.test.mjs old-main.html` 是它的鑑別力檢查）；
   Playwright `tests/tools/legend-drive.mjs`（H6／H11，`--base=` 帶 `felt-probe --root=<基準靜態根>` 產的表）。
   **埠一律用 95xx 段**，避免撞別的 session。
10. **局末結清那一條是主對話自定的**（提案 §二 6 有星號標記，未經使用者逐條裁定）。
    ★但「H1 紅就拿掉局末退還」這根槓桿**實測無效**（n=2000：+7.65→+8.05pp），因為它只影響落空者、贏家的香火本來就歸零；別再拉它。★
11. **使用者 2026-09-10 裁甲的兩個數值**：`INC_TITHE` 1→2、`SHRINE_NIGHTS` [4,7,10]→[5,8,11]。第一輪 n=10000 閘門 H1（燒滿−splitter +9.88pp）與 H3（局長中位 9 夜、greedy −6pp）紅；歸因＝3.0 關掉請神局長 11、2.0 也是 11、3.0 開著 9——縮短來自「自選」讓第 4 夜得主拿到最配系的尊滾雪球，不是燒太多（每局燒 21 < 2.0 的 26.75）。供奉 2 治 H1、延後一夜治 H3，兩者合併 n=2000 七策略全進帶（燒滿 −0.8pp、greedy −1.3、中位 10）。凍結檔 §2.1 修訂一有完整表。**回天彈窗使用者裁定留著**（09-10：真人也可能不按「要」）。
12. **★開標後燒香曾重觸發整夜結算（v0.53.1 修，2026-09-11 真機回報「同一夜競標兩次、扣兩次壽命」）★**
    **根因**：燒香列自 09-07 覆審起併進底列 `#budget`（在 `#south`），而 `#south` **不像 `#stage` 會被開標演出重畫**——
    那兩顆「＋／−」因此活過開標，停在「🏮 本夜成交總覽」畫面上還按得動；`incBump()` 無條件呼叫 `showMarket()`，
    `showMarket()` 又把 `#mainbtn` 重新綁回 `submitHumanBids`（`index.html` 的 `showMarket` 尾段）⇒ 相位倒退回出價，
    再按一次「蓋牌開標」就讓同一夜的 `resolveAuction` 跑第二次、信封 `S.incense` 重收一次香火 ⇒ 壽命扣兩次。
    **修法**：加相位旗標 `BIDS_OPEN`（宣告在 `sheetIdx/YB/INC` 旁）。`startBidUI` 開、`submitHumanBids` 與
    `startReveal` 關；`submitHumanBids` 重入直接 return，`showMarket` 在關閉時不重畫（把 6 個 `showMarket`
    呼叫點一次涵蓋），並比照 `showHandoff` 的清場慣例移除 `#south .incbar`（讓鈕**不存在**，不是按了沒反應）。
    **防線按危險的效果寫**：守的是「本夜出價被結算第二次」，不是「燒香那顆鈕被按到」。
    `incBump` 自己也帶閘（覆審 F3）：它是**先改 `INC.amt` 再重畫**，只擋 renderer 的話封籤內容仍會被改。
    **治具**：`tests/tools/reveal-reentry-probe.mjs`（真實 UI、solo＋hotseat，單一指令，埠 95xx 段）。
    對 `c866b01` 紅在 A1／A2／A3／A6／A7 的行為斷言、對修好的版本 8/8 綠；A4 兩條（出價階段「＋」仍加得動、
    燒的香真的扣壽命）在**兩個版本都綠**＝探針有活性。`trace-eq` 對 `c866b01` **equal**（只動 UI 流程，引擎零位移）。
    ★**A7 是覆審逼出來的**★：一開始只有 A1／A6，而它們的綠燈 100% 來自「按鈕被移除」——`BIDS_OPEN`
    那道閘一行都沒被執行到，刪掉它探針照樣全綠。A7 改成在總覽畫面**直接呼叫**
    `showMarket()`／`incBump(1)`／`submitHumanBids()`，量的是閘擋不擋得住。鑑別力用兩個「只刪一行」的
    突變體驗過：刪掉 `showMarket` 的閘 ⇒ A7／A4-2／A8 紅；刪掉交卷清場（閘留著）⇒ 仍全綠
    （使用者那一下真的按到了：`plus2.ok=1`、`incBtns=2`，是閘擋下的）。**改這一段一定要一併跑突變體**。
    **同族缺陷（覆審 F4）已於 v0.53.3 修掉**，詳見下面第 13 條。
13. **★主鈕在相位切換的那一下吃到第二次點擊（v0.53.3 修，2026-09-11；覆審 F4 追修）★**
    **根因**：`#mainbtn` 是整局唯一的主鈕，一路被重複綁到不同動作上。有些 handler 在**自己的同步執行裡**
    就把它換了手並留在可按——使用者還沒看到新標籤，第二下就落在新動作上。
    分母（grep 數出來，**同步**換手且留在可按）**N=4**：
    ① 「進入下一夜」`nextRound`（`index.html:5657`）→`beginRound`→`beginRoundCore`→`proceedToBids`→
    `startBidUI`→`showMarkUI`／`showMarket` ⇒ 第二下把**盯上宣告整個跳過**（`S.marks[0]` 被寫成 null）；
    ② 「不盯任何一件」（4409 的 arrow →`pickMark(null)`）→`showMarket` ⇒ 第二下＝`submitHumanBids`＝
    **0 出價、0 燒香交卷開標（整夜白費）**；③ 「前往拍賣」（4353，異事夜）同②；
    ④ 「看最終結果」`endGame`→綁 `()=>location.reload()` ⇒ 第二下**整頁重載、局直接沒了**。
    **修法（收斂，不是逐一堵入口）**：`waitMain` 前面加一段守衛——把 `#mainbtn` 的 `onclick` 用
    `Object.defineProperty` 換成自家存取器、由自家 `click` listener 派送。所有 `$("mainbtn").onclick=…`
    由建構上都經過這裡，之後新增第 5、第 6 個入口自動吃到。判準是
    **「這一下點擊在自己的同步堆疊裡把主鈕換了手」** ⇒ 記 `MAIN_SWAP_AT`，之後 `MAIN_GUARD_MS=500`（＝Windows
    預設雙擊間隔）內、**按下時刻**（`e.timeStamp`，不是 listener 跑到的時刻）落在視窗內的點擊直接吞掉。
    用 `e.timeStamp` 是因為相位切換的 handler 會同步重畫市集＋更新 3D，實測可阻塞主執行緒 ~440ms；
    排隊中的第二下解凍後才派送，用 `Date.now()` 去比早就超出視窗、擋不到（覆審實測 701ms）。
    ★`waitMain` 那串的實測結論（**別照直覺推，這裡原本寫錯過**）★：「蓋牌開標」→`submitHumanBids`→
    `startReveal` 在第一個 `await` 之前就同步呼叫了 `waitMain("開標 ▸")`（那句 `await sleep` 包在
    `if(S.bleedLog.length)` 裡、平常不執行）⇒ **第一下「開標 ▸」會被吞**（可接受：使用者剛按完蓋牌）；
    第二次以後的「下一件拍品 ▸」才真的在 `await` 之後 ⇒ 不武裝，連按推演出照舊。探針 B6 逐項驗這兩句。
    ★不用 `stopImmediatePropagation`★：那會連帶擋掉 document 上的 `audioWake`（iOS 解鎖音訊那條）。
    ★headless 安全★：`tests/tools/load.mjs` 的 document stub 讓 `getElementById` 回 null，守衛直接 return，
    引擎三條迴圈一格不受影響（`trace-eq` 對 v0.53.2 **equal**）。
    **治具**：`tests/tools/mainbtn-dblclick-probe.mjs`（真實 UI、B1–B8、內建 `--mutate` 兩個突變體）。
    B6＝開標演出的武裝行為逐項驗；**B7＝把主執行緒卡住 700ms、期間送真滑鼠點擊，驗 `e.timeStamp` 那條路**；
    B8＝異事夜「前往拍賣」入口（`CFG.EVENT_NIGHTS=[1]` 只為走到那條路，不動門檻）。
    `--mutate` 兩個突變體：M1 刪掉守衛那一行 ⇒ B1/B2/B3 紅；M2 只把 `e.timeStamp` 換回 `nowMs()` ⇒ **B7 紅**
    （正常速度的雙擊兩種寫法都擋得到，只有「凍住＋排隊」分得出來，所以 B7 一定要配 M2 才有證明力）。
    對 `05b9036` 連跑 3 次都紅在 B1／B2／B3／B8；對本版連跑 5 次全綠；兩個突變體如上。
    ★**這支探針的兩個坑，改之前先讀**★：
    (a) 判準要寫「**第二下不得生效**」（第一下後與第二下後的畫面逐欄相同），不要去猜第二下會落在哪個動作——
    第一版猜「會交卷」，實際第二夜先進盯上宣告頁，於是**對壞掉的實作也會綠**＝零鑑別力；
    (b) 兩下之間的間隔**必須由頁面自己的 `setTimeout` 控**（整個雙擊包在單一 `page.evaluate` 裡）。
    用 `page.click`／`page.mouse.click` 跨行程來回會卡在主執行緒（Three.js 重繪、GC）後面，實測把 120ms
    撐到 785ms、衝出 500ms 視窗而忽紅忽綠。探針另有 `gapOk` 前提斷言：第二下沒落在視窗內就直接紅，
    不讓它因為錯過視窗而偷偷綠。B3 的「有沒有重載」要數 `framenavigated`，不能只看事後快照
    （`location.reload()` 是非同步的，只看快照會忽紅忽綠）。
    ★**這道守衛守得到的只有「第二下落在 `#mainbtn` 上」那一半**★（fresh-context 對抗覆審實測；
    **三條都不是 v0.53.3 造成的，使用者 2026-09-11 裁定續修，已於 v0.53.4 全部修掉——見第 14 條**）：
    第二下是**依座標**落地的，換手之後那個位置若蓋的是別的東西，守衛完全碰不到。
    ① 連按兩下「🕯️ 請神」——`startShrine` 同步開 `#modal`（`inset:0`），主鈕正中心
    `elementFromPoint` 回的是 `#modal` 背景，第二下＝`legendPick(null)`＝**放棄自己挑尊**、退回 AI 規則。
    ② 熱座連按兩下交棒鈕 `#hoBtn`——`cont()=startBidUI` 同步重繪，`#hoBtn` 的面積有 **66%（190/286 取樣點）**
    落在 `.mcard` 上，第二下＝`pickMark(i)`＝**替玩家公開宣告一件他沒選的盯上**（吃虛張稅、影響信譽）；
    這一下不是打在 `#mainbtn` 上，`dispatching` 為 false ⇒ 守衛連武裝都沒有。
    ③ `showTitheAsk`（供奉危急提示）**沒有** `showLegendPick` 那道「背景點一下也要 resolve」的保險
    （`#modal` 的 inline onclick 走 `closeModal` 只把視窗藏起來）⇒ 點背景會讓 promise 永不 resolve，
    `startBattle` 的 `await showTitheAsk()` 就是**整局永久卡死**，只能重載。
    真要根治得把閘設在「相位切換」本身（切換瞬間讓整個互動層吸收 500ms），而不是單一按鈕；
    ③ 則比照 `showLegendPick` 補一道 resolve 保險即可。**兩件都已於 v0.53.4 做掉，見下一條。**
14. **★相位閘：整個互動層（v0.53.4 修，2026-09-11）★**
    修掉第 13 條末段那三件。**兩個獨立的危險效果，分別處理**：
    **甲「`await` 的 promise 永不 resolve ⇒ 整局卡死」**（`showTitheAsk`，`index.html:5690` 附近）。
    分母＝全檔 `new Promise` 7 處，扣掉 4 處純 `setTimeout` 的，**會 await 且靠 modal 按鈕才 resolve 的只有 2 支**：
    `showLegendPick`（早就有背景保險）與 `showTitheAsk`（漏了）。現在兩支都有：
    `tk.addEventListener("click",onBgTithe)`，背景點一下＝「要，繼續供奉」（＝headless 三條迴圈的預設，語意一致），
    並在 `fin()` 裡把 listener 拆掉。**這一類日後新增 modal-gated promise 一定要一起補**。
    **乙「第二下落在使用者還沒看過的互動面上」**：v0.53.3 的守衛只掛在 `#mainbtn`，
    而第二下是**依座標**落地的 ⇒ 相位一換，同一個座標底下常常已經是別的東西，那時 `dispatching` 是 false、
    連武裝都沒有。改成 **`armPhaseGate`**（`index.html:2153` 附近）：一個 `document` 上的 **capture** 監聽，
    量的是「使用者手指那個點**現在能做什麼**有沒有變」——變了就把 `PHASE_AT` 設成現在，
    之後 `MAIN_GUARD_MS` 內、**按下時刻**（`e.timeStamp`）落在視窗裡的點擊由 `phaseSwallow` 整個互動層吸收。
    ★收斂：不逐入口加 `disabled`★——任何入口（現在的、以後新增的）只要同步換掉手指下那塊互動面就自動吃到。
    ★**四個踩過的坑，改之前一定要讀**★：
    (a) **比對時機**：微任務檢查點發生在**每一個 listener 之間**（堆疊一空就跑），
    `Promise.resolve().then()` 會排在目標元素的 `onclick` **之前**、什麼都比不到（實測：`PHASE_AT` 從頭到尾沒被設過，
    C2／C3 照樣紅，看起來像「閘沒生效」，其實是比對時機錯）。
    (a2) ★**主要武裝點必須是 document 的 bubble 監聽，不能只靠 `setTimeout`**★（覆審 F1）：
    `setTimeout` 排在 timer task，而**瀏覽器的輸入佇列優先權高於 timer 佇列**——相位切換阻塞主執行緒時
    （註解 (c) 講的那幾百毫秒），排隊中的第二下會**先**派送、那時 `PHASE_AT` 還沒設，
    閘在它最該生效的情境下等於不存在。bubble 監聽與目標 handler 在**同一個任務**裡跑完，武裝一定早於下一個輸入事件。
    `setTimeout` 留著當備援，涵蓋會 `stopPropagation` 的那一個（全檔只有座位卡的 ⓘ）。
    (b) **比的是「簽名」不是節點**（`id|最近的 inline onclick|class`）：`#budget` 重繪會換掉燒香「＋」的節點，
    但它做的事沒變 ⇒ 不是相位切換、不該武裝；拿節點比對會把「連按燒香 ＋」也擋掉。
    (c) **`phaseSwallow` 用 `stopImmediatePropagation`，一定要明文補叫 `audioWake()`**——
    iOS 解鎖音訊靠 document 上那個 click 監聽，不補叫就會斷掉（探針 C5 在守，M1 突變體實測會紅）。
    **治具**：`tests/tools/phase-gate-probe.mjs`（真實 UI、**一律用 `page.mouse.click` 真座標**，C1／C1b／C2–C6，
    內建 `--mutate` **四個**突變體）。
    **C1b＝走真實路徑**（覆審 F7）：真人第 1 夜請到一尊、把 `CFG.TITHE_WARN` 抬高（只為走到那條路，不動門檻），
    夜末 `await showTitheAsk()` 會**自己**把視窗跳出來，再真滑鼠點背景 ⇒ 局必須在 1s 內走到夜末畫面。
    對 `8d8360c` 的紅燈是決定性的：「點背景後解開耗時ms：**沒解開（卡死）**／停在：開戰」。
    **C6＝真滑鼠連按燒香「＋」三下都要生效**（覆審 F9：整組驗收原本沒有任何一條在守「閘不吃正常的第一下」，
    C4 用合成點擊、由建構上被閘的座標守衛放行）。
    **四個突變體**：M1 刪掉閘的吞 ⇒ C2/C3 紅；M2 刪掉供奉視窗背景保險 ⇒ C1/C1b 紅；
    **M3 讓 `sigAt` 恆變（偵測過度武裝）⇒ C6 紅**；**M4 刪掉被吞那一下補叫的 `audioWake` ⇒ C5 紅**。
    M3／M4 是覆審 F6／F8 逼出來的——原本兩個突變體**只覆蓋「吞」那一半**，「偵測」那一半沒有任何守衛。
    ★C2／C3 的量測前提★：被閘吞掉的點擊**不會**進到 `window.__clicks`（capture 那層 `stopImmediatePropagation`
    擋掉了），所以「第二下有沒有被吞」可以直接量；沒被吞時再用 `e.timeStamp − PHASE_AT` 分辨
    「閘漏了」與「治具太慢、根本沒測到」，後者才換一局重跑（最多 3 次）。
    **兩下之間絕對不要做跨行程取樣**——實測那會把 120ms 撐過 500ms 視窗而忽紅忽綠。
    C3 的落點是**掃出來的**不是猜的（乾跑一次、在 `#hoBtn` 矩形內逐點 `elementFromPoint`，找會落在 `pickMark(...)`
    上的座標；實測 `372,265 → pickMark(1)`）——掃不到就直接紅，不讓它因為點到空白而偷偷綠。
    ★用真座標不用 `el.click()`★：這一卷守的就是「第二下打到座標底下的東西」，`el.click()` 走 id、繞過 hit-test，
    量不到要量的現象（v0.53.3 覆審 Q4-1 指出的缺口）。
    對 `8d8360c` 連跑 2 次都紅在 C1／C1b／C2／C3；對本版連跑 5 次全綠；四個突變體全紅。
    ★**這道閘原本的盲點已於 v0.53.5 補掉**★——見下面第 15 條。
15. **★「同一顆按鈕原地改語意」的連點盲點（v0.53.5 修，2026-09-11）★**
    v0.53.4 的簽名是 `id｜最近的 inline onclick｜class`——**看不到「這一點下去會做的事」變了**。
    分母（grep：同一顆按鈕**原地**改語意，三項卻不變）：
    ① **`#bloodBtn` 獻祭放血**（`index.html:590`／`renderBloodBtn`）：第一下之後 `innerHTML` 改成
    **新價錢**（`BLOOD_COST×(n+1)`：2→4→6）⇒ 第二下用他沒看過的價錢又放一次血
    （自己再扣、所有對手再各 −4，**直接改壽命、不可逆**）。
    ② **`#titheKeep`／`#titheDrop`**（`showTitheAsk` 的 `step()`）：佇列推進到**下一位**時，
    `#modalbox` 換成他的那一題，但按鈕的三項與**文字**逐位元組相同
    ⇒ 第二下替下一位把唯一一次「送神回天」答掉（同一尊只問一次）。
    ③ `flipType()`／`ybFlip()`／`#sfxBtn`：文字換了＝語意真的變了，連點被吸收 500ms 屬設計意圖。
    ④ 燒香 `incBump(±1)`／出價視窗 `bump(±1)`／`ybBump(±1)`：**只有旁邊的數字變、按鈕語意沒變**，
    這一類**必須照常連按**（探針 C6／D3 在守）。
    **修法（按效果寫，四類走同一道偵測，不逐顆加 `disabled`）**：`sigAt` 補兩段——
    **(4) 元素自己的 `textContent`**（抓 ①：燒香／出價視窗的「＋」文字恆為「＋」，所以 ④ 不受影響）；
    **(5) 疊在上面那個問句的內容雜湊**，**只認 `#modal`**（抓 ②）。
    ★**不能認 `#sheet`**★：它是**持續編輯**的面，裡面的數字每按一下都在變，認了會把「在出價視窗連按 ＋」
    也擋掉——D3 就是在守這一條。同理 `disabled` **不可以**進簽名：開標演出時 `PENDING()` 會同步把
    `#mainbtn` 設成 disabled，進了簽名就會武裝、把「連按下一件拍品 ▸」擋死。
    **治具**：`phase-gate-probe.mjs` 的 **D1／D2／D3**，`--mutate` 加到**五個**突變體。
    對 `16dc2ea` 紅在 D1（自己少 6＝2+4、對手各少 8、`sacrificed=2`、鈕上的字 2→6）與 D2（第二位的題目被答掉、視窗關了）；
    對本版全綠（D1 自己只少 2、對手各只少 4、`sacrificed=1`；D2 第二位的題目還在）。
    **M5＝簽名退回三項** ⇒ D1／D2 紅，且 D1 的量測回報 `armed:false`（閘根本沒為 `#bloodBtn` 武裝）——
    那正是這一卷要補的東西。**M3（`sigAt` 恆變）同時紅在 C6／D3**，守住「偵測不得過度武裝」那一邊。
    ★**沒有座標的點擊也要武裝**★（對抗覆審實測到的真漏洞）：相位閘原本「吞」在前、「武裝」在後，
    中間那句 `if(!(x>0||y>0)) return;` 讓**鍵盤觸發的 click（按鈕聚焦後 Enter／Space，`clientX/Y` 都是 0）
    只會被吞、永遠不武裝** ⇒ 按住 Enter 在放血鈕上就是 D1 那個 bug 的完整替代入口。
    現在沒落點時改追**同一個元素節點**的簽名（節點被移除也算變），
    且**只收 `e.isTrusted`**——沒座標的不可信事件只有治具的 `el.click()`（產品自己一次都沒呼叫過 `.click()`），
    讓它武裝只會把治具的驅動點擊吞掉、防不到任何玩家問題。探針 **E1**（真鍵盤連按兩下）＋突變體 **M6** 在守。
    ★治具的時間前置★：v0.53.5 起，真滑鼠／鍵盤的量測前都先等 700ms——`driveUntil` 用 `el.click()` 推畫面，
    最後那一下會武裝相位閘，緊接著送的量測點擊若落在 500ms 內會被吞。**判準一格沒動**（第一下有沒有生效
    仍由 `finalAmt`／`sacrificed` 這些行為斷言在守）。
    **記錄不修（LOW，非本卷造成）**：`__introNext`「下一頁 ▸」五項逐位元組相同（連按跳過一頁教學）；
    `#hoBtn` 的 property 重綁是結構性盲點（今天沒有活路徑）；座位卡 ⓘ 的 `stopPropagation` 讓武裝退回
    `setTimeout` 備援；`#sfxBtn` 本卷起會被武裝（關掉音效後 500ms 內按不回來）。

### 11.28 拍賣桌整片掏空 **0.56a**「版面卷」（2026-09-10，桌面先平面）——接手前先知道這十三件事

規格＝`docs/proposals/2026-09-10-plan-table3d.md`（§1 檔案清單／§2 介面已寫死／§3 不做什麼／§7 裁定）；
驗收凍結＝`docs/experiments/2026-09-10-acceptance-table3d.md`（**T0–T6 是本卷，T7–T12 屬上桌卷**）；
> ★版號：計畫檔與凍結檔寫的「0.55a／0.55b」＝這裡的 **0.56a／0.56b**（0.54／0.55 另有其卷，主對話 2026-09-11 改號），同一卷、同一份驗收。
分母清單＝`docs/experiments/2026-09-10-table3d-a-worklog.md`；實跑報告＝`docs/experiments/2026-09-10-table3d-a-report.md`。
純版面／DOM／CSS 卷：`js/` 一格未動，引擎 `trace(1..20)` 與 `84b1a0c` 逐位元組相等。

1. **★掏空是「依頁面切換」，不是全域開關★**：`#felt` 是**所有階段**的舞台（`$("stage").innerHTML=` 全檔 11 處），
   全掏空的話開標揭盅會變成一張浮在木桌上的無底文字（使用者裁 Q1 甲）。
   只有**出價頁**（`showMarket`）與**盯上頁**（`showMarkUI`）走 `setHollow(true)`，其餘 9 頁 `setHollow(false)`。
   新增任何一個會寫 `#stage` 的畫面，**一定要順手決定它的 `setHollow`**——漏掉就會出現「玻璃面板不見了」。
2. **`setHollow(false)` 同時負責清空側欄與北列**（`#railW`／`#railE`／`#northPrev`／`#northShr`）。
   這四個容器的生命週期收斂在這一支，不要在別處各寫一份清空——那會變成 11 個要記得的點。
3. **`renderSeats()` 只寫 `#northSeat`／`#westSeat`／`#eastSeat`**（原本直接覆寫 `#north`／`#west`／`#east`）。
   座位卡容器**預設 `display:contents`** ⇒ 座位卡仍是 `#north`／`#west`／`#east` 的直接 flex 項目，
   v0.53 的版面因此逐像素不變。全檔就這三行在覆寫座位卡；`renderSeats` 的 20 個呼叫點一行都不必改。
4. **掏空版面的每一條 CSS 都寫在 `#table.t3d` ＋ `@media (orientation:landscape)` 裡面**。
   ⇒ `?table3d=0`（kill switch）與**直式**由**建構上**回到 v0.53，不靠另寫一份覆蓋（Q6 甲）。
   改這一段時千萬別把規則搬出媒體查詢——直式 390px 扣兩根 168px 側欄只剩 −6px，版面會直接爆。
5. **側欄的垂直帳是死的：256 ＝ 座位 62 ＋ 4 ＋（卡列 190：上緣 8 ＋ 卡 88 ＋ 4 ＋ 卡 88）**。
   座位卡壓到 62px 靠的是字級與內距（`.av` 18px／`.nm` 11.5px／`.st` 9px），不是把東西藏起來——
   `felt-probe --sel=#west,#east` 量的是 `scrollHeight − clientHeight`，藏不掉。要加東西先跑它。
6. **掛在卡角外側的徽章要記得翻進來**：`.markb`（left:-4px）／`.mybid`／`.pickbox`（right:-4px、top:-8px）
   會把卡列撐出 3px 橫向溢出；`.seat` 的 `.dir`／`.windb`／`.roleInfoBtn`／`.bubble` 則會把 `#north` 撐出 11px 直向溢出
   （**基準 v0.53 本來就有這 11px**，是這一卷順手修掉的）。做法是 `.rail{padding:8px 5px 0}` 留位置＋把北席那幾顆的座標翻進卡內。
7. **`#tray` 是 0.56b 的預留命中層，在 0.56a 是空操作**：`trayTap`／`trayHover` 收 `pointerdown`／`pointermove`
   但什麼都不做。`#felt.hollow #stage` 疊在 `#tray` 之上（z-index 2 對 1）且 `pointer-events:none`、
   子元素才 `auto` ⇒ 桌心空白處的 tap 落到 `#tray`、押寶夜的 stepper 仍然點得到。
   **0.56b 接手時：`#tray` 的 z-index 不得高過 `#veil` 的 6**（否則開標黑幕蓋不住），也不得高過 `#stage` 的 2。
8. **觸控白名單兩處字串（`index.html:34` CSS 與 `:6637` JS）一字未動**：`#tray` 是 `#felt` 的子元素，
   `closest("#felt,…")` 沿祖先鏈找 ⇒ 仍然命中。新增的只有 `#tray{touch-action:manipulation}`。
   白名單真的要變成三處的情境只有一種：做拖曳轉桌／捏合縮放（本卷 §3 明令不做）。
9. **★`#felt.hollow` 一定要有 `isolation:isolate`★**（二版修的 CRITICAL）：v0.53 的 `#felt` 靠 `backdrop-filter`
   順便建立了**堆疊環境**，把 `#helpBtn` 的 `z-index:25` 關在 `#felt` 裡；掏空拿掉 backdrop-filter 之後那個環境消失，
   25 逃到根環境、**贏過 `#modal` 的 20**，`？` 鈕就壓在袋子／角色資訊／說明面板上並吃掉那一塊的點擊
   （側欄 120→168 讓 `#felt` 右緣左移 48px，剛好滑進置中 460px 的 `#modalbox`）。
   計畫 §6 Q1③ 說「backdrop-filter 那條理由已經過期」**只對了一半**：對 `position:fixed` 的包含塊過期了，
   對堆疊環境沒有。動 `#felt.hollow` 的任何一條時不要順手把它拿掉；`legend-drive --modal` 就是守它的。
10. **牌桌上「清掉上一位的私有東西」一律用 `#table ` 前綴，不要用 `#stage `**（二版修的 HIGH）：
   熱座交棒的雙保險清場（`showHandoff`）在掏空後對 `#railW`／`#railE` 的 `.mybid`／`.pickbox` 一顆都不命中。
   `legend-drive --handoff` 走真實路徑（封一筆「押 2」→ 蓋牌 → 交棒當下數；掏空與 `?table3d=0` 兩條路都跑）守它，
   判定式含**活性斷言**「這一輪真的封出過一顆 `.mybid`」——只驗「殘留 0」是歸零斷言，會恆綠。
11. **★北列 56px 是固定的——而且至少有三種組合同時停在 52.8／56 的天花板★**（三版修的 HIGH-A、四版補齊，覆審 R3 LOW-J）：
   `#north` 是 `grid-template-rows:56px 1fr 62px` 的固定列、`overflow:visible`，撐爆會直接衝出畫面上緣並壓到座位卡。
   `.preview` 的高度是量化的：**15.7／29.4／43.1／52.8／62.4 ＝ 1／2／3／4／5 行**，而 56px 的列**最多吃到 52.8（4 行）**，
   再多一行（62.4）就溢出（二版實測 62.4 那一格 `#north` 溢出 4px、89.8 那一格 17px）。實測停在 52.8 的有：
   ① **solo 規則夜（第 3／7 夜）不讓寬那一側**：343.8px／52.8（只剩 3.2px）
   ② **押寶夜落在第 7 夜時的出價頁**：`showMarket` 的樣板是 `(rl && !stake)`（押寶夜的規則說明寫在一注條裡、**不進預告框**）
      ⇒ 那一頁沒有 `.rulein`、`wide && !hasRule` 成立、**照樣讓寬**，179.4px 下也正好 52.8（只剩 1.6px）。
      覆審實測 seeds 1..40 有 **11 顆**把押寶夜排在第 7 夜（3,4,11,13,18,22,28,31,33,38,40，**含官方跑的 seed 3**）；
      同一夜兩頁的版面會左右互換（盯上 254.2／出價 418.6），那是 `.rulein` 判準的必然結果，不是 bug。
   ③ **熱座的規則夜（第 3 夜就會遇到）**：預告框多一段「【西家・玩家二 出價中｜壽命 N】」，343.8px 下也是 52.8。
   ⇒ **「第 7 夜最緊」只說對了 solo**；動北列任何字級、內距或欄寬之前，這三種都要重量。
   裁乙的「讓寬」**對規則夜不生效**（`fillRails` 掛 `.shwide` 的條件是「`#shrines.wide` **且** 預告框裡沒有 `.rulein`」）。
   閘門：`legend-drive` 的直向判定四版起量 `#north`／`#west`／`#east` 且**溢出 >0 一律紅**、夜數走到 `--vrounds=8`；
   `felt-probe --rounds=7`（預設）是診斷用的逐格表。**熱座第 7 夜沒有任何閘門走得到**（熱座一局要跑一萬次以上迴圈，
   覆審跑 22 分鐘沒走到）——0.56b 最省的做法是給 `felt-probe` 加一個 `--mode=hotseat`。
12. **裁乙在規則夜有已知代價（0.56b 要處理）**：規則夜不讓寬 ⇒ 香火榜退回 254px，
   三張待請卡的**尊名與招式名都會被 ellipsis 切掉**（實測 solo seed 1 第 7 夜：殘日 `.shn` 16/9、大士爺紙尊 40/24、
   有應公 24/6；系別 chip 22/22 沒被切）。第 7 夜同時是請神夜前一夜，正是裁乙要保的兩夜之一 ⇒
   **那一夜把裁乙要保的三樣裡的兩樣交還回去了**。現況的取捨是「規則讀不到比尊名被切嚴重」，
   但這是**已知代價、不是已解決**；0.56b 版面重排（托盤上桌時北列本來就要重排）時一併處理。

13. **★tap 探針與相位閘的時序（2026-09-11 合併樹補驗）★**：`legend-drive --taps` 換頁之後**不能立刻點**。
   產品的相位閘（`armPhaseGate`，`index.html` 的 `MAIN_GUARD_MS=500`）在「手指底下那塊互動面的簽名變了」時武裝，
   期間 document 的 capture 監聽把整層點擊吸收掉。tap 掃描原本是「按主鈕換頁 →（12ms 輪詢偵測到）→ 立刻逐一 tap」，
   **每頁的第一下**正好落在那 500ms 裡被閘門**正確吸收**，卻被治具記成「沒命中」。
   實測（`--tapdbg` 的 `[DEBUG-tp7]`，262c157）：12 頁裡 10 頁的第一下落在 **456.8～577.2ms**——**跨在 500ms 門檻上**，
   所以同一棵樹重跑會在 165／169／175／177 之間跳；非第一下的 tap 距上次相位切換最近也有 **1081.9ms**，從來不受影響。
   交叉表乾淨到沒有例外：`dPhase<500` 的 2 下全 MISS、`dPhase≥500` 的 175 下全 HIT。
   **修法在治具不在產品**：每次進頁面與每一下 tap 之前，先問頁面「閘門還要關多久」
   （`MAIN_GUARD_MS`／`PHASE_AT`／`MAIN_SWAP_AT` 都**從頁面讀**，治具不寫死也不縮短），等它開了再打。
   實測這道等待在 12 頁裡的 10 頁真的出力（等 164.6～287.5ms），另 2 頁是 `newGame` 進場、閘門從未武裝。
   ⇒ **不得為了讓 `--taps` 變綠去關閘門、縮短 `MAIN_GUARD_MS` 或在產品加測試後門**（`02 §2.1`）。
   `--tapnowait` 是退回舊量法的對照組、`--tapdbg` 印歸因，兩個都只給診斷用，日常閘門跑預設路徑。
   同一個坑的另一半：`page.evaluate(<字串>, 引數)` 在 Playwright 是**把字串當運算式求值、引數直接丟掉** ⇒
   探針要帶引數就得把值內嵌進運算式（`` `${FN}({x:${x}})` ``）；而字串裡的 `\s` 會先被 template literal 吃掉（變成純字元 s），正規表示式要寫成 `\\s`。

**治具**：`felt-probe --sel=`（一支量四個容器，T2／T3）／`legend-drive --sel=`（橫向溢出清單，T4）／
`legend-drive --taps`（逐一 tap 命中回歸＋字面引數，T5；`--tapsonly` 只跑這段拿基準）／`legend-drive --t3d`（kill switch 與直式 computed 值，T1／T6）／
`legend-drive --modal`（面板遮擋，R1-CRITICAL-1）／`legend-drive --handoff`（熱座交棒清場，R1-HIGH-1）／
`layout-shot --sel=`／`mkt-probe --sel=`（`#market` 這個 id 在掏空頁退役，三支一律改吃 `--sel`，不逐支複製選擇器）。
**三支的 `--sel` 預設值都是掏空版現行的容器，找不到元素一律 throw**——量 `?table3d=0`／v0.53 要自己帶
`--sel=#felt`（felt-probe）／`--sel=#market`（layout-shot、mkt-probe）。一版曾經「少拍一張圖卻 exit 0」，別再讓它靜默。
`layout-shot` 順帶量請神夜前一夜三張待請卡的 `scrollWidth>clientWidth`（尊名／系別 chip／招式名一個都不許被切），切到就非零離開。
**埠用 96xx 段**（95xx 是請神卷的）。量基準要一個靜態根：把基準 commit 的 `index.html` 放進一個目錄、`js/`／`assets/` 用 junction 接回來，
`--root=` 指過去（治具全程不動 worktree 的 `index.html`）。

### 11.29 招式可辨性卷 **0.55** 批 0（2026-09-12，語彙＋積木 API＋MAT_SOLID）——接手前先知道這十件事

規格＝`docs/proposals/2026-09-11-plan-fx-legibility.md`（§1 檔案清單／§2 介面寫死／§6 逐招診斷表／§7 三系語彙表／§8 裁定）；
驗收凍結＝`docs/experiments/2026-09-11-acceptance-fx-legibility.md`（L0–L12）；
批 0 工作計畫＝`docs/experiments/2026-09-12-plan-fx-legibility-b0.md`；實跑報告＝`docs/experiments/2026-09-12-fx-legibility-b0-report.md`。
**批 0 只做地基與四支示範招，另外 23 支沒動**；批 1／2／3 才逐系換（祖靈／香火／陰氣各 9 支）。
`index.html` 一格未動（VERSION 留到合併時定 0.55）。

1. **這一卷在修什麼**：2026-09-11 的盲讀實測（兩位 context-free 讀者，`docs/experiments/2026-09-11-fx-blindread-r{1,2,3}/`）——
   27 支招的**完整版就有 14 支兩位都認不出**。三個機制成因，全部是「共用語彙」：
   白 `orb` 光球 15／27、腳下 `ring`／`disc` 19／27、裸 `beam` 白虛線 9／27（**這組數字是批 0 自己重數的**，
   計畫 §6 記的 14／17／8 是 0.54 併入前的 `main`，短版上線後又多了幾支）。
   加上加色材質＋bloom 把系色推白、5 支的法寶本體根本不在 GLB 裡。

2. **單一事實來源＝`js/trait-fx/vocab.js`**（`FX_PAL`／`BEAT_FRAC`＋`beatOf`／`ICON`／`PHASE_GATE`／`EMBLEM_OF`／`DEPRECATED`）。
   人類可讀版是 `docs/design/ART_BIBLE.md` §10（設計理由的權威）與 `docs/experiments/2026-09-11-fx-vocab.md`（逐格對照），
   **後者與 `vocab.js` 由 `tests/fxvocab.test.mjs` 釘在一起，不一致判紅**（凍結檔 L12）。改任一邊都要同時改另外兩份。
   ★**三個系別檔不 import `vocab.js`**★——值由 `makeStage()` 掛到 `st` 上（`st.colors`／`st.beat`／`st.kind`）。
   理由：系別檔是被 `import(file + V)` 帶 cache-busting query 載進來的，它們若自己 `import './vocab.js'`
   會多出一份沒有 query 的 module instance。編舞裡**不得再出現任何色碼字面值**。

3. **`BEAT` 是比例不是毫秒**（踩過一次才改的）。第一版寫成 `BEAT = {2:{…settle:[760,900]}}`，
   0.54 的 F1 閘門（`tests/fxtier.test.mjs` 掃 runtime 的 900 字面值）當場紅——它說得對，
   那是 `PW_FX.TRAIT_MS_BY_TIER[2]` 的複製品。現在 `vocab.js` 只有 `BEAT_FRAC`（三級各三個切點），
   毫秒窗由 `beatOf(tier, run.ms)` 用**真正在跑的時長**乘回去；`fxvocab` 另有一條斷言
   「`vocab.js` 裡不得出現 260／900／1400 任一字面值」。要改節拍**改比例**，不要寫毫秒。

4. **`MAT_SOLID` 是第三支材質模板，但 program 數不增**。徽記本體走 `NormalBlending`——
   加色的東西一旦越過 bloom 門檻就往白色去，系色在畫面上活不下來，這就是「顏色分不出、全是白」的機制成因
   （解法是換材質與換形狀，**不是調 bloom 或 EXPOSURE**，ART_BIBLE §8 明寫那兩個一動整張牌桌要重驗）。
   ★實測發現★：`blending`／`opacity`／`color` 都是 render state 與 uniform，**不進 program cacheKey**，
   所以 `MAT_SOLID` 與 `MAT_GLOW` 共用同一支 shader——**材質模板是 3 支、program 仍是 2 支**，
   `traitfx-drive` 三個 tier 的 `programsGrew` 全部 0。計畫 §2.1 預期的「2→3 支 program」沒有發生，不必為它付錢。
   預熱物件仍照加（`warmSolid`），代價是常駐 +1 個 draw call。

5. **六個新積木**（`js/trait-fx.js`，名字照計畫 §2.3 寫死）：
   `st.icon(kind,pos,o)` 一片朝鏡頭的法寶剪影／`st.icons(kind,positions,o)` 同 kind ≥3 份走 InstancedMesh（1 個 draw call）／
   `st.trail(obj,from,to,o)` 飛行物＋拖尾（取代裸 beam）／`st.mark(fig,kind,o)` 蓋在受招方身上並跟著走／
   `st.colors`／`st.beat`／`st.kind`／`st.phase(name)`。另外 `st.fade`／新增的 `st.alpha` 會走 `userData.fxParts`
   把「本體＋ink 底板（＋描邊）」三片一起淡——只淡本體會留下一片孤零零的黑底板。
   ★`o.outline` 預設畫的是 **ink 色的實心底板**，不是 `MAT_LINE` 描邊★：加色的細線正是盲讀抱怨的「白虛線」，
   而且 1px 線在 780×360 的盲讀格上連面積都量不到。真的要 `MAT_LINE` 外框就開 `o.rimLine`。
   `o.flat` 把徽記壓平貼桌（陰氣的水漬／暗斑、香火的貼桌陣），壓平的就不逐幀 billboard。

6. **徽記 geometry 是全場共用的**（`js/trait-fx/emblems.js` 的 `geomOf` Map 快取，一個 kind 建一次）。
   因此 `finish()` 的清場保險絲改成**跳過 `geometry.userData.fxShared` 的**——照原樣 dispose 掉，
   下一次用到同一個 kind 的招會在 GPU 上拿到空 buffer。加新 kind 時記得這件事。
   複雜度上限 ≤24 個外框頂點（`fxvocab` 在守）；`coin` 是唯一挖洞的（外圓內方，方孔是它唯一的辨識點）。

7. **`st.phase` 不是「喊了就算」**。打點只是打點，記不記進 `run.sig.phases` 由**打點當下那一段的實際條件**決定
   （門檻在 `vocab.js` 的 `PHASE_GATE`）。三個實作細節是踩出來的：
   (a) **打點要放在前一段 tween 的 `done` 裡**——編舞函式是在 `run.vt=0` 時同步跑完的，
       寫在函式頂層的 `st.phase('react')` 會在第 0 毫秒就結算；
   (b) **travel 的基準要在打點當下抓**，不能留給逐幀評估惰性抓：打點發生在 `done` 裡，
       同一幀後面還有飛行 tween 會先改掉位置（實測千里眼因此從 1.38 掉到 0.70，硬生生低於門檻）；
   (c) **react 量「打點之後變了多少」，而且場上只有施術者一個人時就量他自己**——
       量絕對值會被 windup 留下的位移弄成恆真；一律排掉施術者則對自益招（獻祭刀在治具裡只有 1 尊）恆假。
       `sig.phaseDetail[].solo` 會標出是哪一種情況。

8. **短版與完整版是同一支函式**。`SHORT[trId] = MOVES[trId]`，時間軸全部從 `st.beat` 換算。
   0.54 的「27 支各寫一條原生短版」是既有的分岔源，本卷不再往上疊第二層。
   系別檔的 `export default {…}` 因此改寫成 `const MOVES = {…}; export default MOVES;`。
   ★寫時間軸的兩條硬紀律（0.54 那一節已經寫過，這裡再提是因為又踩了一次）★：
   **最後一條補間結束在 `st.ms × 0.88`**（`rate` 公式在 dt=16.7ms 下的分母是 `ms − max(endMargin×k, dt×1.5)`，
   tier 1 只有 235ms，horizon 超過就 `rate>1`、F2 的 `rateOK` 紅）；
   **`st.flinch` 一定要帶 `ms`**——預設是 `TFX.flinchMs×k`（tier 1 下 69ms），從 react 起算會把 horizon 推到 249。

9. **L3 對比閘門怎麼量**（`tests/tools/fx-contrast.mjs` ＋ `fx-contrast-metrics.py`）：
   凍幀 A/B 差圖，**同一次載入、同一格畫面、兩幀之間只有 `visible` 一個變數**（抓手是 `st.spawn` 打的
   `userData.fxKind`，治具端是 `__tfx.fxVis(on)`）。判定：`|ΔLuma|≥6` 的特效像素 ≥ 全畫面 **0.8%**
   **且** 這些像素的 CIE76 ΔE 中位 ≥ **28**。`fxVis` 回傳 0 直接判 DEAD——那代表根本沒量到東西。
   ★量測位置★：治具頁是真實牌桌與夜紫天，但 **bloom threshold 0.5、產品 `js/renderer.js` 是 0.7**；
   門檻低＝更容易爆白，所以在這裡過是保守的。要量產品端那一格得走 `duel-drive` 的真實對決場景（批 1–3 的正式 L3）。

10. **盲讀材料的兩個坑**（`tests/tools/blindread-sheet.mjs`）：
    ★HUD 會洩題★——治具頁左上角那行 debug 文字寫著招名與 ab，批 0 第一版六格全帶，
    等於在盲讀材料上直接印答案；截圖前一定要 `addStyleTag` 把 `#hud` 藏掉。
    ★幀位寫死在本檔的 `FRAME_AT`★（`BEAT[tier]` 的 windup 中點／travel 起／中／末／react 起／末），
    其中「travel 末」與「react 起」在 `BEAT` 上是同一個瞬間，各自往自己那一段內縮 5%／15% 才不會有兩格一樣。
    規格：6 幀 2×3、每格 780×360、總圖 1560×1080，短版與完整版混洗成匿名編號，
    對應表 `mapping-HIDDEN.json` **讀者不得看**。`--label` 只給修者自己看。

**治具**：`fx-contrast.mjs`（L3 凍幀 A/B）／`fx-contrast-metrics.py`（面積％＋CIE76 ΔE 中位）／
`blindread-sheet.mjs`（6 幀 2×3 盲讀材料）／`tests/fxvocab.test.mjs`（文件↔`vocab.js` 對齊，`--mutate=1/2/3` 三個突變體）。
**埠用 884x／887x 段**（`fx-contrast` 預設 8845、`blindread-sheet` 預設 8846）。
**Playwright 治具一律單獨跑**，兩支並發會讓彼此的 `http.server` 假紅。
`tests/tools/dmg-readability.mjs` **在 worktree 跑不起來**（只有一段 playwright 候選路徑，R2 覆審 N8 那個坑這支還沒補）——
批 0 沒跑它，要跑得先補第二段候選路徑。
