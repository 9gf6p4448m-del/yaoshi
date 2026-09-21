# L1e 正式口徑與全席診斷

2026-09-21，承接 601f126。使用者要求「繼續下一步」；本卷完成正式量測口徑蒐證、[規格](protocol.md)及全四席局末持有診斷工具。沒有重跑既有 1,400 局，沒有改產品 index.html／數值，沒有縮小六之四範圍或發布候選。

## 本輪完成

- 原 H9 的 holder 來自取得歷史，不是局末袋子；正式候選採全四席曾持有集合。H9 還使用獨立預設 scriptedBids／AI 桌，不能直接套探索追件桌。零分母維持不可判定，85% 原 H9 上限分列保留。
- [endpoint 診斷](holder-audit/report.md)從同一批 raw 計算任何席局末持有與勝者是否持有；原 raw SHA256 不變。資料不足以恢復 ever-held，因此診斷不套正式門檻。
- 新工具 `tests/tools/l1-holder-audit.mjs` 在完整驗證七臂、種子、四席配方與勝者後才輸出，拒絕寫入原 pilot 目錄。
- 新測試 8/8 通過；工具 Node coverage 行 96.32%、分支 94.74%、函式 100%。故意只計座位0的突變使兩項測試轉紅，恢復後全綠。[證據](holder-audit/README.md)。

正式規格經 [Astra 原碼對照](architecture-review.md)：補齊 H9 預設桌不使用千眼情報的盲點；H1 情報策略不會自動修復 H9。第二高標額是該席依法可見的私有資訊，不是全桌公開資料。六之四繼續保持未完成；完整同值選項也沿用原窮舉器的 dominant 判定，不改定義來提高通過率。

## 下一個有界工程

依 [曾持有契約](protocol.md)，先盤點全部真實袋子變更與試算副本界線，再實作 recorder：每局、每席、每組首次成套的 round／phase／mutation sequence 與 ever-held 集合。必須記到同夜完成後失去、失而復得、對手取得與淘汰；記錄器啟閉玩法 trace 相同。這個步驟不必等待六之四建模，也不需要重問既有開工授權。

其後才補千眼合法情報策略與對照、凍結完整正式策略池／六之四狀態域、執行正式 n≥10000。當前 formalStatus 仍 incomplete；三組試玩／美術盲讀待完成，A3 六局暫緩，v0.57.37 保留候選，公開 v0.57.35。

## 驗證命令

```powershell
node --experimental-test-coverage --test tests/l1-holder-audit.test.mjs
node tests/tools/l1-holder-audit.mjs
```

第二條只讀原始紀錄並輸出診斷，不執行遊戲模擬。RED 9b6d35f → GREEN f93c3fc → 證據 e628d61；獨立工具覆審見 [tool-review.md](tool-review.md)。

覆審另修正摘要總局數遺漏及 Windows junction 繞過輸出保護，兩者各有 RED→GREEN；修補／證據至 5e411d4。初版報告保留 holder-audit/initial-report，重印後各臂 games=200，raw 雜湊不變，沒有重跑模擬。
