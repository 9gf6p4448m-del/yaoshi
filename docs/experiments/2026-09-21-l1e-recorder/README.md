# L1e 曾持有記錄器

本卷承接 d2250a8，新增 opt-in 無頭量測，保存每席每組連攜首次成套的時間；不改玩家介面、數值或公開資訊。候選仍 v0.57.37，公開 v0.57.35，本卷不發布。依 [執行前契約](acceptance.md)與[真實寫入盤點](mutation-map.md)。

## 使用方式與資料邊界

```js
const result = G.playPolicyGame(seed, policies, picks, {
  recordChainHoldings: true
});
const {first, holders, mutationCount} = result.chainHoldings;
```

first按chainId／seatId保存首次 `{round, phase, mutationSequence}`；holders為每組曾持有者席位集合，排序且去重；mutationCount為本局真實袋子變更次數。phase是mutation來源，不是由UI或殘留event推測的階段。沒開啟時維持原回傳形狀。

19個真實bag寫入後觀測，於得標hook前已能捕捉取得；每次移轉的移出／移入分別計序，保留大風吹兩圈順序。局末香火獎勵也包含，endStrip只有確實移除物品才增加序號。首次成套後失去、死亡或再次取得，不覆蓋第一次紀錄。相同id的副本或共用bag的試算wrapper不算真實玩家。

記錄在私有scope，結果完成後才回detached snapshot，不掛S、players、history、CFG或UI。觀測期間nested playPolicyGame明確拒絕，finally在正常或異常退出清理。記錄器不消耗亂數。

## 驗證

- 新增測試 **13/13 通過**；真實取得入口包含拍賣、異事、典當、獵人、夜規、請神、局末香火獎勵與送神。反例包含同夜取得再失去、對手／死亡／重得、共用bag副本、nested runner拒絕、例外清理與新局隔離。
- 原CFG全開 seeds1..20，off/on結果移除純記錄欄位後逐位元組一致，下一個玩法RNG值一致；另保留固定系統條件的20種子對照。
- 改前 d2250a8 與最終產品碼的預設 trace seeds1..20 均為357496 bytes，逐位元組相同；既有相關回歸Node測試17/17通過（其中legend腳本另列32斷言、夜規16斷言，不把內嵌斷言冒稱額外Node測試）。[檢查紀錄](checks/baseline-regression.json)的source hash與最終index相同，不因僅測試／文件收尾重跑既有驗證。
- 兩個新增核心函式 observeBagMutation／chainHoldingsSnapshot 的V8最內層source range非空白UTF-16單位覆蓋 **670/687＝97.53%**，不是整個index或整個runner的覆蓋率。
- 三個語意突變均被抓到：只在夜末記錄（8項紅）、只記seat0（4項紅）、漏拍賣得標接點（1項紅）；健康13項綠。[證據](verification/coverage-mutations.json)。
- [Astra接點／架構覆審](architecture-review.md)、[程式與證據覆審](code-review.md)。RED 910982b → GREEN cd16098，最終測試／證據b0cdbae。

```powershell
node --test tests/chain-holdings.test.mjs
node tests/tools/chain-holdings-evidence.mjs
```

index最終SHA256：`c6de98e38e6a0a28827c1e83526e9bdc53e44020accf0c72cb4787c79f501807`。本卷無畫面改動，沒有重做既有視覺驗證。

## 剩餘工作

這個記錄器提供曾持有資料，沒有執行正式H9或n≥10000；先前1,400局endpoint raw不回填虛構歷史。下一步補千眼合法情報策略／資訊對照與正式runner接線，維持H9預設桌和H1追件桌分開。完整六之四狀態域仍待建模，不能用局部或隨機抽樣取代。玩家試玩、美術盲讀與A3暫緩六局的狀態不變。
