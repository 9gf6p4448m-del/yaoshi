# L1e 正式口徑與全席診斷交接

使用者要求「繼續下一步」。工作在 `feat/l1-water-chain`、`C:/Users/shung/wt/yaoshi/l1-water-chain`。正式站 v0.57.35／候選 v0.57.37 不變，本卷未改產品。

- [本卷報告](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1e-protocol/README.md)
- [正式量測規格](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1e-protocol/protocol.md)
- [工具覆審](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1e-protocol/tool-review.md)

Astra 對照原始碼確認 H9 是全四席曾持有集合，採原預設 scriptedBids／AI 桌，分子為勝者屬於holder、分母為至少一位holder的局；normal／zero各自條件化，非因果差。千眼的原桌不消費情報，仍有能力量測盲點。原85%上限列來源保留，六之四範圍不縮減。

本輪工具只用既有 1,400 筆原始紀錄，新增全四席局末持有診斷；不是恢復 ever-held，不套正式H9門檻。raw雜湊不變，沒有重跑模擬。測試與覆審的最終數字以分支報告為準。

下一個有界工程：依 protocol 的曾持有記錄契約盤點真實袋子變更，實作每席每組首次成套的round／phase／mutation sequence與去重集合。須包含同夜完成後失去、失而復得、持有者死亡、多席與試算副本界線；啟閉 recorder 玩法trace相同。接著千眼合法情報策略，再凍結正式策略池／窮舉域與跑正式萬局。原六之四、正式平衡、美術盲讀仍未完成；A3六局依使用者指示暫緩。

不重做前次連攜功能／試玩入口／探索樣本。主工作樹原有09-15修改保留，不 add -A／reset／clean。

收卷：候選分支 d2250a8 已推送，獨立 JS 覆審 APPROVE 診斷用途，無未解 HIGH／MEDIUM。8/8 測試通過；新增工具行覆蓋96.32%、分支94.74%、函式100%。總局數遺漏與junction輸出保護已修，有行為層RED→GREEN；舊錯誤證據／報表保留。主分支僅更新交接文件。
