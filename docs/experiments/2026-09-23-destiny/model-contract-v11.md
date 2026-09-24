# 六之四模型契約 v11：市場生成 chance 節點

日期：2026-09-24。狀態：**partial；不代表六之四模型通過**。

## 凍結來源與機率假設

- 產品仍固定為 `index.html`，commit `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`、blob `8ba772b9d960eff8b9c42eac77040433f809c57d`、正規化 SHA256 `8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d`、版本 `0.57.40`；v11 經 v10 loader 沿用 v9 的來源驗證與測試引擎，並另外固定 `drawMarketFor`／`ruleForRound`／`collectEffects`／`CFG`／`NIGHTRULES`／`S` 的屬性描述與收祟夜 `onMarketDraw` 函式身分。
- 權重精確成立於 `iid-uniform-rng-call-v1`（同 v10）：每一次玩法 RNG 呼叫在目前 state 條件下視為獨立的 `[0,1)` 均勻抽樣。凍結 `drawMarket` 以 `u < CFG.CURSE_PROB` 判定詛咒（即使 `S.cdeck` 為空也照樣耗掉這次 RNG），Fisher–Yates 第 i 步取 `floor(u * (i + 1))`。`CFG.CURSE_PROB` 取其 binary64 表示的**精確有理數**（0.65 的 double 值，不是 13/20），因此權重與總和為 1 都是精確比對，不是近似。
- 這**不是**有限 32-bit `mulberry32` seed 空間的精確機率模型，也沒有證明該 PRNG 序列彼此獨立。這是明示的建模邊界；全遊戲 chance 仍 incomplete，直到採納此抽象或改用精確 seed-space 模型。

## 節點內容

入口是凍結的 `drawMarketFor(forRound)`（`drawMarket` 本身未匯出；`drawMarketFor` 會暫掛目標夜規則再呼叫它，這正是遊戲實際路徑）。在 `S.deck.length ≥ CFG.MARKET` 時：

- 詛咒分枝（僅 `S.cdeck` 非空）：deck 抽 `MARKET−1` 件、cdeck 抽 1 件，權重 `CURSE_PROB / MARKET!`；
- 一般分枝：deck 抽 `MARKET` 件，權重 `(1 − CURSE_PROB) / MARKET!`；cdeck 空時詛咒機率質量併入此分枝，權重 `1 / MARKET!`；
- 每個分枝乘上全部 `MARKET!` 個 Fisher–Yates swap 序列（凍結版 `MARKET=4` → 24 種）；
- 目標夜的全域 effect 若帶有被固定的收祟夜 `onMarketDraw`：每個分枝後接該確定性掛鉤（被換下的牌各回牌堆底、再從 cdeck 頂抽 `MARKET` 件），前提是掛鉤不需補洗 CURSES；
- 消耗恆為 `MARKET` 次玩法 RNG（1 次詛咒判定＋`MARKET−1` 次 swap），收祟夜掛鉤不另耗。

每個分枝輸出市場物件序列（身分與品名）、`drawMarketFor` 之後的 `S.deck`／`S.cdeck` 內容與順序、各次抽樣所屬區間。

**Fail closed**：`S.deck` 不足 `MARKET`（會 `shuffle([...POOL])` 補洗，凍結版 POOL 為 27 件、補洗是 27! 級支持集）、收祟夜掛鉤需要補洗 CURSES、或目標夜出現任何其他／被替換的 `onMarketDraw` 掛鉤時，節點直接丟錯，不產出支持集。只要一般分枝需補洗就整個節點 fail closed（即使詛咒分枝本身不需要）。

建構節點在攔截玩法與 UI RNG 的純度檢查內進行；若檢查期間 RNG 游標、`deck`／`cdeck`／`market`／`nextMarket` 或 `nightRule` 改變，會還原並丟錯。節點不可變，列舉器拒絕自行拼出的節點並核對權重總和。這些約束只保護此測試適配器的模型輸入，不是產品安全邊界。

## 已驗證範圍

測試 `tests/l1e-market-chance-v11.test.mjs`（12 項）：契約語義與 gate 的 fail-closed 核對；無補洗狀態（規則夜 3＝押寶夜、無掛鉤）48 分枝的精確權重與總和＝1（測試以 DataView 位元獨立換算 `CURSE_PROB` 的有理值）；**每個列舉分枝**以落在該分枝區間內的腳本化 u 序列交回凍結 `drawMarketFor`，逐一比對市場品名序列與物件身分、之後的 deck／cdeck 內容與順序、實際 RNG 呼叫數＝節點宣告消耗、`S.market`／`S.nextMarket` 未動；cdeck 空（首抽刻意落在 `u < CURSE_PROB` 區仍走一般分枝、仍耗 1 次）；收祟夜（第 7 夜）48 分枝全詛咒市場的逐分枝重播；deck 剩 `MARKET−1`／0 件與收祟夜 cdeck 過短兩種補洗狀態的 fail closed，並實跑凍結引擎證明該狀態確實多耗 RNG；未知／被替換掛鉤的 fail closed；建構節點前後 RNG 與四個牌陣列不變。

## 未涵蓋與限制

- 補洗（POOL 與收祟夜 CURSES）一律 fail closed，未列舉；需要時須另立精確列舉或 seed-space 模型。
- 只驗凍結 fixture（seed 123、`ruleOrder=['yabao','shousui']`）下的狀態；`S.event` 目前沒有任何 `onMarketDraw` 掛鉤，若未來出現即 fail closed。
- `drawMarketFor` 讀當下的 `S.event`（不是目標夜的異事）——這是凍結產品的行為，節點照實建模，未另行判斷其設計意圖。
- 不含拍賣／標單、市集消耗、夜晚結算、其餘 chance 節點；不提供全遊戲 runner、決策間公開轉移、跨程序 canonicalization、terminal payoff、策略窮舉或 solver。

## 驗證

```powershell
node --test tests/l1e-market-chance-v11.test.mjs
node --test tests/l1e-*.test.mjs
node --experimental-test-coverage --test tests/l1e-market-chance-v11.test.mjs
```

v11 專項 **12/12**；l1e 全套 **105/105**；適配器行／分支／函式覆蓋 **100%／86.93%／100%**。`chance.fullGame=incomplete`、`state.canonicalization=incomplete`、`sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false`；inventory `chance.night.drawMarket=partial`。沒有修改 `index.html`、遊戲規則、效果係數或發布狀態。機器契約見 [model-contract-v11.json](model-contract-v11.json)。局部通過不得升格為全遊戲通過。
