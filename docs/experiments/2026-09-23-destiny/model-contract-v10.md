# 六之四模型契約 v10：狀態條件心願抽籤

日期：2026-09-24。狀態：**partial；不代表六之四模型通過**。

## 凍結來源與機率假設

- 產品仍固定為 `index.html`，commit `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`、blob `8ba772b9d960eff8b9c42eac77040433f809c57d`、正規化 SHA256 `8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d`、版本 `0.57.40`；v10 沿用 v9 的來源驗證與測試引擎。
- 這個節點的權重精確成立於 `iid-uniform-rng-call-v1`：每一次玩法 RNG 呼叫在目前 state 條件下都視為獨立的 `[0,1)` 均勻抽樣。凍結 `drawWishes` 以 `floor(u * pool.length)` 選牌，因此每個 eligible pool 選項的抽象機率相同。
- 這**不是**有限 32-bit `mulberry32` seed 空間的精確機率模型，也沒有證明該 PRNG 序列彼此獨立。這是明示的建模邊界；全遊戲 chance 仍 incomplete，直到採納此抽象或改用精確 seed-space 模型。

## 節點內容與已驗證範圍

`night.drawWishes` 讀取凍結引擎當下的玩家、市場、心願表及設定：逐席按 `WISHES` 原插入順序篩選 `canDraw(player)`；若活人沒有可抽選項，沿用引擎回退到全表的行為；死人輸出 `wish=null` 且不耗抽；停用心願或空表時是單一 no-op。抽中的結果包含心願 id、`done:false` 與確定性 `target(player)`（若有）。

適配器以被固定來源載入的引擎作 provenance，另保存心願表、順序、物件身分及 `id`／`canDraw`／`target` 函式描述；載入後若替換規則函式，就拒絕沿用原來源標籤。它檢查玩家座位 id／存活標記及明確布林設定；讀取支持集時攔截玩法與 UI RNG，偵測閉包已捕捉的原 RNG 函式／setter，並在發現游標改變後還原兩條 RNG。節點不可變，列舉器拒絕自行拼出的節點，並核對支持集與共同分母一致。這些約束只保護此測試適配器的模型輸入，不是產品安全邊界。

測試 `tests/l1e-wish-chance-v10.test.mjs` 驗證來源與契約語義、四席整個聯合支持集的分枝數及權重總和、逐席每個選項交回凍結 `drawWishes` 的結果、每名存活玩家恰一個抽樣呼叫、死人／停用／市場改變、閉包捕捉 RNG 後的偵測與復原，以及被替換 `canDraw`／`target` 的 fail-closed。凍結版本至少有一張無 `canDraw` 的心願，因此空支持回退在此版不可達；回退仍照契約實作，但這項路徑未由 fixture 觸發。測試在目前 fixture 中逐一走完整聯合列舉；實際引擎映射檢查逐席遍歷每個支持選項，並未把所有聯合分枝逐一重播到產品函式。

## 未涵蓋與限制

這個節點不含心願完成／獎勵結算、AI 盯印、異事排程與選擇、市場生成、標單／拍賣、戰鬥及其餘 chance；也不提供全遊戲 runner、決策間公開轉移、跨程序 canonicalization、terminal payoff、策略窮舉或 solver。支持列舉只取決於給定的凍結 pre-draw state，不能單獨證明全遊戲資訊集合等價或平衡。

## 驗證

```powershell
node --test tests/l1e-wish-chance-v10.test.mjs
node --experimental-test-coverage --test tests/l1e-wish-chance-v10.test.mjs
```

v10 專項 **12/12**；適配器行／分支／函式覆蓋 **100%／81.94%／96.67%**。兩輪獨立覆審先後發現可利用的契約驗證缺口，已分別補上 provenance、RNG 還原、語義欄位和有限 seed／完整遊戲限制聲明的 fail-closed 核對；最終覆審未發現可操作問題。`chance.fullGame=incomplete`、`state.canonicalization=incomplete`、`sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false`。沒有修改 `index.html`、遊戲規則、效果係數或發布狀態。機器契約見 [model-contract-v10.json](model-contract-v10.json)。

下一步須延伸到尚未覆蓋的自動／公開轉移與 chance 節點，並決定如何處理抽象 iid 假設與有限 seed PRNG 的落差；之後才可補齊跨程序 canonicalization、terminal payoff、可行 solver 範圍和獨立覆審。局部通過不得升格為全遊戲通過。
