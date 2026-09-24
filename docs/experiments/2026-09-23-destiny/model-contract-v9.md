# 六之四模型契約 v9：跨夜檢查點與 RNG 恢復

日期：2026-09-24。狀態：**partial；不代表六之四模型通過**。

## 凍結來源與範圍

- 產品來源仍為 `index.html`，commit `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`，blob `8ba772b9d960eff8b9c42eac77040433f809c57d`，SHA256 `8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d`，版本 `0.57.40`。
- v9 在記憶體內擷取一局真實 headless 夜戰結算後的四席 state graph，包括袋子／市場等物件 alias、`Set`、公開歷史、私有天命、AI 資訊回憶與 runner 統計欄位。快照分開保存玩法 RNG 與 UI RNG 的 32-bit counter，不保留 VM 函式閉包。
- 快照可匯入另一個由同一凍結來源載入的引擎：目標引擎保留自己的 RNG 函式，只恢復 state graph 與兩個 counter。修改一側 state 不會改到另一側。
- 兩個引擎都呼叫凍結產品的 `nextRound`；治具在市集移交、抽出下一市集後，於 DOM 綁定的 `beginRound` 前停止。它比較夜號、市集、次夜市集、歷史與 RNG 狀態。

## 本批可證明與限制

`tests/l1e-cross-night-restore-v9.test.mjs` 的完整第一夜是經由產品 `playPolicyGame`、`drawWishes`、異事、拍賣、請神與 `resolveBattles` 跑出，並非手造夜末欄位。跨夜恢復只驗一個檢查點及下一夜市場排程；不表示後續事件、所有人類動作、所有夜末路徑或完整遊戲都能由治具續跑。runner 的策略函式仍是外部實驗設定，快照不把策略程式碼封裝進 state。

這是跨引擎、同程序的測試物件，不是可存檔的跨程序格式；沒有證明 canonicalization，也不會把 seeded PRNG 序列展開為 chance 支持集。RNG counter 還原只證明重播狀態，**不證明各分枝及機率權重完整**。

## 完整 chance 的盤點

機器契約以來源函式名列出待建模的隨機範圍：`makeState`／`rosterSeats`／`shuffle` 的局初角色與牌序、`drawWishes`／`drawMarks`／`runEventPhaseHeadless` 的夜初與異事、`drawMarket`／`aiBids`／`resolveAuction` 的市場與競標、`paperWar`／`resolveBattles`／`settleShrinesEnd`／`shrineReward` 的戰鬥與結算。這是一份來源盤點，不是已驗完的 chance call graph；其中條件分枝、無放回抽取相關性與權重仍未枚舉。`S.rngUi` 另存供重播，但目前排除在策略 payoff 的 chance 範圍外。

## 驗證

```powershell
node --test tests/l1e-cross-night-restore-v9.test.mjs
```

契約仍明列 `chance.fullGame=incomplete`、`state.canonicalization=incomplete`、`policyEnumeration=incomplete`、`sixOfFourSolver=not-run` 及 `releaseEligible=false`。未變更 `index.html`、遊戲規則、係數或發布狀態。

下一步要補可從 checkpoint 恢復的完整 runner／公開轉移時間線，並逐來源建立精確 chance 支持與權重；再處理 canonicalization、terminal payoff 和可行的 solver 範圍。完整機器狀態見 [model-contract-v9.json](model-contract-v9.json)。
