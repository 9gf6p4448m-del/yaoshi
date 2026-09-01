# 妖市 架構規格 v1 — 資料表驅動 ＋ hook 分派

> 本檔是**實作契約**，不是建議。實作者依此改寫 `index.html`，不得自行更動 hook 名稱、
> 參數形狀與呼叫順序——後續所有內容擴充都依賴這份契約的穩定性。
> 目的：讓「加內容」從寫程式變成往資料表填一筆。

---

## 0. 前置：種子化亂數（必須最先做）

現行 `Math.random()` 讓同一局無法重現，導致「重構前後行為一致」無法驗證。

**要求**：
- 加入 `mulberry32` 之類的 PRNG，狀態存於 `S.rng`，種子存於 `S.seed`
- `newGame(mode, seed)` 接受可選種子；未給則用 `Date.now()` 並記錄到 `S.seed`
- **全域禁用 `Math.random()`**：所有隨機（洗牌、AI 抖動、平標決勝、事件）一律走 `S.rng()`
  ——實作完成後 `grep "Math.random" index.html` 必須零結果
- 提供 `window.__yaoshi = { newGame, S, simulate, trace }` 之類的測試出口，讓自動化測試取得狀態

**為什麼先做**：這是本次唯一能證明「重構沒改壞行為」的手段。沒有它，驗收只能靠肉眼。

---

## 1. 五張資料表（放在 `CFG` 之後、`POOL` 之前）

| 表 | 內容 | 本次要填 |
|---|---|---|
| `ABILITIES` | 法寶／命格道具的能力（現有 `ABTXT` 併入，文案與效果同一筆） | 現有 17 種 ＋ 命格 6 種 |
| `ROLES` | 角色：被動、AI 行為模式、台詞、頭像、起始壽命 | 先 4 個 |
| `WISHES` | 今夜心願：描述、判定函式、獎勵 | 先 8 張 |
| `EVENTS` | 妖市異事：描述、輸入型態、結算函式 | 先 3 個 |
| `NIGHTRULES` | 今夜市集規則 | 本次留空表，只建結構 |

**每筆的統一形狀**：

```js
{
  id: 'sword',                    // 唯一鍵，程式用
  name: '王爺劍',                  // 顯示名
  desc: '你袋中詛咒品的負值減半',   // 玩家看到的說明（原 ABTXT 的值）
  hooks: {                        // 只寫用得到的 hook，其餘省略
    onItemValue(ctx){ ... }
  }
}
```

**硬性要求**：新增內容**只能**往這五張表加一筆，不得在引擎函式裡寫 `if (id === 'xxx')`。
實作完成後，引擎函式裡不應出現任何內容專屬的字串比對。

---

## 2. Hook 分派器

```js
function collectEffects(p) { /* 回傳該玩家當下生效的所有 effect 物件 */ }
function applyHooks(name, ctx, p) { /* 依序呼叫每個 effect 的 hooks[name](ctx) */ }
```

**effect 來源與呼叫順序（必須固定，否則結果不可重現）**：

1. `p.role`（`ROLES[p.roleId]`）
2. `p.bag` 內每件有 `ab` 的道具，**依袋中順序**（`ABILITIES[item.ab]`）
3. `S.nightRule`（若有）
4. `S.event`（若有）

與玩家無關的全域 hook（`onMarketDraw`）只取 3、4。

**ctx 是可變累加器**：effect 直接改 ctx 的欄位，不回傳值。

---

## 3. Hook 契約（逐一列出，參數形狀不得更動）

### 3.1 `onItemValue(ctx)` — 單件道具的戰力值
`ctx = { p, item, value }`　effect 改 `ctx.value`
- 王爺劍：`if (ctx.item.curse && ctx.value < 0) ctx.value = -Math.ceil(Math.abs(ctx.value)/2)`
- 閭山法師（角色）：`if (ctx.item.curse) ctx.value = 0`

### 3.2 `onFacCount(ctx)` — 陣營件數（共鳴用）
`ctx = { p, faction, count }`　effect 改 `ctx.count`
- 雷女之火／五營旗／水鬼浮標：對應陣營 `ctx.count++`

### 3.3 `onPowerCalc(ctx)` — 總戰力
`ctx = { p, itemSum, resonance, flat: 0, resonanceMul: 1 }`
最終戰力 ＝ `itemSum + resonance * resonanceMul + flat`
- 斷手書生（角色）：`if (facCount(p, p.spec) >= 4) ctx.flat += 4`
- 破軍旗：`ctx.flat += Math.min(12, Math.max(0, 20 - p.life) * 0.6)`
- 飼鬼甕：`ctx.flat += Math.min(12, Math.max(0, 15 - p.life) * 1)`
- 山神庇佑：`if (p.life >= 30) ctx.resonanceMul *= 1.5`
- 過陰咒：`if (p.life < 15) ctx.resonanceMul *= 2`
- 獻祭刀：`ctx.flat += (p.sacrificed || 0) * 3`

> `power()` 重寫為：逐件跑 `onItemValue` 加總 → 逐陣營跑 `onFacCount` 算共鳴
> → 跑 `onPowerCalc` → 回傳。**四捨五入只在顯示層做，內部保留小數。**

### 3.4 `onBidCap(ctx)` — 保守標上限（逐筆）
`ctx = { p, cap }`　effect 改 `ctx.cap`
- 媽祖令旗：`ctx.cap = Math.floor(ctx.cap * 1.5)`
- 大家樂組頭（角色）：`ctx.cap = Math.max(1, Math.floor(p.life / 2))`

### 3.5 `onBudget(ctx)` — 一輪出價總額上限
`ctx = { p, budget }`（預設 `budget = p.life`）　effect 改 `ctx.budget`
- 陰間當鋪（角色）：`ctx.budget += 8`

### 3.6 `onBidEff(ctx)` — 比價用的有效值
`ctx = { p, bid, item, eff }`（預設 `eff = bid.amt`）　effect 改 `ctx.eff`
- 魔神仔紅帽：`if (bid.intent === 'poison') ctx.eff += 2`
- 青面攤主（角色）：`if (item.f === S.lastWon[<對手>]) ctx.eff += 2`

> 平標決勝順序：`onBidEff` 算完 → 取最大 → 平手時**風位優先** → 仍平則 `S.rng()` 決。

### 3.7 `onBidSettle(ctx)` — 得標付款與落標退款
`ctx = { p, bid, item, isWinner, cost, events }`
（預設：得標 `cost = bid.amt`；落標且押命標 `cost = ceil(amt/2)`；落標保守標 `cost = 0`）
effect 改 `ctx.cost`，可 `ctx.events.push({txt})`
- 黃色小雨衣：`if (!isWinner && bid.type === 'yaming') ctx.cost = 0`
- 閭山法師（角色）：詛咒品且為唯一 `keep` 出價者時 `ctx.cost = Math.ceil(ctx.cost/2)`
- 落魄夜（市集規則）：`ctx.cost = bid.amt`（全付）

### 3.8 `onWinItem(ctx)` — 得標後的連鎖
`ctx = { winner, item, target, events }`（`target` 僅毒標時有值）
- 送王船：把自己袋中最負的詛咒品送給戰力最高的對手
- 虎爺印（被塞方持有）：下手者 −2

### 3.9 `onBattle(ctx)` — 對戰傷害
`ctx = { w, l, pw, pl, dmg, extra }`　effect 改 `ctx.dmg`、可 push `ctx.extra`
- 射日神弓（勝者持有）：`ctx.dmg += 2`
- 百步蛇紋盾（敗者持有）：`ctx.dmg = Math.max(1, ctx.dmg - 2)`
- 林投姐髮簪（敗者持有）：勝者 −1
- 虎姑婆指甲（勝者持有）：勝者 +1
- 獵人（角色，勝者）：`if (ctx.pl > ctx.pw - <風位加成>) ` 從敗者袋中奪一件
  （判準以「敗者裸戰力 > 勝者裸戰力」為準，需在 ctx 帶入裸值 `pwRaw`／`plRaw`）

### 3.10 `onNightEnd(ctx)` — 夜末結算
`ctx = { p, log }`　effect 直接改 `p.life`、push `ctx.log`
呼叫順序固定：**詛咒 drain → 道具 → 角色 → 心願判定 → 異事後效**
- 魔神仔的芭樂：`p.life -= drain`
- 拼板舟：`p.life += 1`
- 祖靈之眼：本夜未得標則 `+2`
- 收驚婆（角色）：未得標法寶 `+3`；整夜零出價改 `+5`
- 大家樂組頭（角色）：得標 ≥2 件 `+2`；0 件 `−2`

### 3.11 `onMarketDraw(ctx)` — 拍品產生
`ctx = { market, round }`　effect 可改寫 `ctx.market`
- 收祟夜：全部換成詛咒品
- 闇市夜：為每件加上 `masked: true`

### 3.12 `onReveal(ctx)` — 開標渲染
`ctx = { reveal, viewerId, showEntries, showTypes }`
- 無面人（市集規則）：`ctx.showEntries = false`
- 普渡爐主（角色）：`ctx.showTypes = true`

---

## 4. 新增狀態欄位

**玩家 `p`**：
```
roleId      角色 id
wish        本夜心願（{id, done:false}），私有
grudge      {pid: number}  紅衣婆婆用
spec        'zuling'|'xianghuo'|'yinqi'  斷手書生用（不公開）
sacrificed  本夜已放血次數（獻祭刀用），每夜歸零
pawned      是否已典當（陰間當鋪用）
stats       { won, bids, yaming, lost, poisonHit:{pid:n}, poisonTaken }  記事面板用
```

**全域 `S`**：
```
seed        本局種子
rng         PRNG 函式
lastWon     {pid: faction}  上一夜各家得標陣營（青面攤主用）
nightRule   本夜市集規則（可為 null）
event       本夜異事（可為 null）
```

---

## 5. 本次重構的驗收條件（凍結，不得事後放寬）

1. **`grep "Math.random" index.html` 零結果**
2. **同種子重現**：同一個 seed 連跑兩次，完整狀態軌跡逐項相同
3. **重構前後等價**：
   - 先在**現行程式**加種子化（只加種子，不重構），跑 20 個種子錄下完整軌跡當基準
   - 重構後用同 20 個種子重跑，**每夜每人的壽命、袋子內容、戰力、勝負、得標結果全部逐項相等**
   - 允許的唯一差異：浮點顯示（內部保留小數後，顯示層四捨五入）
   - **有任何一項不等就是重構失敗**，要修的是重構不是基準
4. **引擎無內容字串**：引擎函式內不得出現內容專屬的 id 字串比對
5. **既有功能全在**：風位輪轉、毒標勒索、買下銷毀、雙人熱座、開標手動節奏、
   對決動畫、跳過鍵，全部照常運作
6. **console 0 error**，手機 844×390 版面不變

---

## 6. 實作順序（強制，每步可獨立驗證）

1. 加種子化 PRNG，錄 20 種子基準軌跡（**此步不動任何邏輯**）
2. 建五張表結構 ＋ `collectEffects` / `applyHooks`
3. 把現有 17 種法寶能力搬進 `ABILITIES`，改走 hook——搬完跑等價比對
4. 把現有三隻 AI 搬進 `ROLES`（先只放 AI 參數，行為模式之後才改）——再跑等價比對
5. 其餘引擎函式改用 hook 掛點——最後一次等價比對

**每一步都要能單獨跑等價比對**，不可一次改完才驗。
