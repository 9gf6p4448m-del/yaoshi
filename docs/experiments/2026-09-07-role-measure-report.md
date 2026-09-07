# 角色量法＋被動消融卷 報告（2026-09-07，只量測、不改數值）

驗收凍結檔：`docs/experiments/2026-09-07-acceptance-role-measure.md`（M0–M6）。
基準 SHA：`5565364`（凍結檔本身寫 `cfbb30a`，本卷起跑時 HEAD 已是 `5565364`＝凍結檔的 commit，
`index.html` 在這兩個 commit 之間沒有差異，故兩者對本卷等價）。

<!-- 結論先行段由 06 節之後回填 -->

---

## 0. 方法

### 0.1 治具

| 檔案 | 用途 |
|---|---|
| `tests/tools/role-measure.mjs` | 四種量法 (a)(b)(c)(d)＋四個補充變體 (cL)(dL)(c2)(bm)；`--seat2` 走 M3；`--aggrsweep=` 走 (b) 的鑑別力 |
| `tests/tools/role-measure-m0.mjs` | M0 三件（內容相同、`trace(1..20)` 相同、記憶體覆寫不外洩）＋反面驗證 |
| `tests/tools/role-measure-agg.mjs` | 把落下的 JSON 聚合成 M1／M2／M4 的表 |

全部只呼叫 `tests/tools/load.mjs` 的 `loadGame()`，在**回傳的那一份實例的記憶體裡**改 `G.ROLES[x]`，
**不寫 `index.html`、不寫 `js/`**。每個 (變體 × 角色) 各 `loadGame` 一份全新實例。

### 0.2 四種量法（M1）

| 變體 | 座位 0 的出價 | 被動 |
|---|---|---|
| (a) 基準 | `POLICIES.aiLike`（`policyAiLike`） | 原樣 |
| (b) 風格 | 同 `policyAiLike` 的結構，但塞進 `p.ai` 的是**該角色自己的 `ROLES[x].ai`** | 原樣 |
| (c) 風格＋被動關 | 同 (b) | 清 `hooks`／`traits`／`flags`／`life0d` |
| (d) 基準＋被動關 | 同 (a) | 同 (c) |

**`policyAiLike` 到底吃不吃 `ROLES.ai`？——不吃。** `index.html:4939-4943`：

```js
function policyAiLike(p){
  const saved=p.ai; p.ai={aggr:0.7,spite:0.15};
  let b; try{ b=aiBids(p); } finally { p.ai=saved; }
  ...
}
```

它把 `p.ai` **覆寫**成寫死的 `{aggr:0.7,spite:0.15}` 才呼叫 `aiBids`，`markReact` 連欄位都沒有
（`undefined`）。所以 `roles-res0.md` 那張表裡，10 個角色的座位 0 全部用同一種出價人格在打，
角色自己的 `aggr 0.3~1.0`／`spite 0.1~0.6`／`markReact avoid|contest|ignore` 一項都沒生效。
`aiBids` 讀 `p.ai` 的三個位置：`index.html:2180`（`p.ai.spite` 決定毒標）、
`index.html:2229`（`p.ai.markReact` 決定對「被別人盯的拍品」加價還是退避）、
`index.html:2253/2257`（`p.ai.aggr` 決定出價金額與押命標機率）。

### 0.3 「被動」欄位清單（凍結檔要求逐欄位說明）

`ROLES` 一筆的所有欄位（實測盤點見 `docs/experiments/2026-09-07-role-measure-evidence/role-fields.txt`）：

| 欄位 | 算不算被動 | 理由 |
|---|---|---|
| `id`／`name`／`av`／`pool`／`desc`／`lines` | ✗ | 純呈現與索引，不進任何結算式 |
| `ai:{aggr,spite,markReact}` | ✗（是變體 b 的**自變數**） | 這是「AI 出價風格」，不是玩家被動；把它一起關掉就分不出「量法偏」與「被動弱」 |
| `hooks` 裡的 `onAi*`（`onAiValue`／`onAiPlan`／`onAiAmount`／`onAiCurse`／`onAiExtraBids`） | △ | 只在 `aiBids()` 內觸發（GUIDE §11.1），**真人玩家永遠吃不到**。凍結檔 M1(c) 字面要求「清 `hooks`」＝連它一起清，所以 (c) 混進了「AI 風格 hook」這一項；本報告另立 **(c2)** 只清非 `onAi*` 的 hook 來拆開 |
| `hooks` 裡的其餘 hook | ✓ | 玩家被動的實作處（GUIDE §11.8） |
| `traits` | ✓（但**本專案 10 個角色一個都沒有**） | `traitMax()` 讀的靜態數值特性 |
| `flags` | ✓（但**本專案 10 個角色一個都沒有**） | `hasFlag()` 讀的靜態布林特性 |
| `life0d` | ✓（但另立 (cL)(dL) 對照） | 起始壽命位移（`index.html:784` `roleLife0=R=>CFG.LIFE+(R.life0d||0)`）。**算被動的理由**：它是角色不對稱的一部分、玩家實際感受得到（收驚婆起始 44、閭山 42、爐主 52），而且設計上明擺著是「強被動的對價」；**不算被動的理由**：它不是一條「能力」，關掉它等於同時改了角色的資源基準線，會讓 (b)−(c) 這把尺量到兩件事。兩邊都有道理 ⇒ **兩種都跑**（(c)/(d) 含 life0d、(cL)/(dL) 保留 life0d） |
| `order` | ✗ | 只影響同一次 `applyHooks` 內多個 effect 的先後；`hooks` 清空後無作用（只有陰間當鋪有 `order:95`） |

**必須先講清楚的兩個口徑瑕疵**（不是實作瑕疵，是「被動」這個詞本身在這個引擎裡不乾淨）：

1. **有兩個「玩家被動」同時也會改 AI 自己的出價**：大家樂組頭的 `onBidCap`（保守標上限 ×1.5）與
   陰間當鋪的 `onBudget`（總額上限＝壽命+8）——`aiBids` 自己就會呼叫 `consCapFor(p)`／`budgetFor(p)`
   （`index.html:2166`、`2256`），所以關掉它們同時削掉了 AI 的出價能力。這兩隻的「被動貢獻」欄位
   天然含 AI 行為成分，(c2) 也切不乾淨。
2. **普渡爐主的 `onReveal`（開標看得到標書型態）在 headless 模擬裡貢獻恆為 0**：`showTypes` 只被
   UI 的開標畫面消費，`playPolicyGame` 這條路根本不讀它。所以爐主的資訊型被動在本卷的所有數字裡
   **一律量不到**——它的價值只存在於真人對局。

### 0.4 樣本與座位

- `n=10000`、`seed 1..10000`（`runMany({n})` 的預設 seeds 就是 `1..n`，`index.html:5126`）。
- 座位 0＝受測角色（`picks:[role]`），**其餘三席由 `S.rng()` 每一局各自洗牌抽**
  （`rosterSeats`，`index.html:2047-2060`），不是固定同一組。
- SE ＝ `sqrt(p(1−p)/n)`，n=10000 時在 p≈25% 附近 ≈ **0.43pp**，兩點差的 SE ≈ 0.6pp。

---

<!-- 以下由實測回填 -->
