# L1e 探索量測續接（2026-09-21）

使用者要求「繼續實作」。在 `feat/l1-water-chain`／`C:/Users/shung/wt/yaoshi/l1-water-chain` 新增量測工具，產品仍 v0.57.37 試玩候選、公開 v0.57.35，未合併發布。主工作樹原有 09-15 dirty files 保留。

- [完整報告](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1e-measurement/README.md)
- [執行前契約](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1e-measurement/contract.md)
- [Astra 覆審](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1e-measurement/review.md)

已完成七臂 runner：splitter，以及三組各自的探索追材料策略／效果歸零。同一批 seeds 1..200，共 1,400 局，原始 JSONL、摘要、來源與工具雜湊落檔。水陸 normal−zero +0.5pp，千眼 0pp，雙虎 −1.5pp；此樣本只檢驗工具，不套正式門檻或調數值。千眼策略不使用情報，因此零差異不代表能力無價值。歸零影響共用 CHAINS 全四席，持有者是座位0在 runner 終點仍持有配方，與原 H9 不同。

驗證：11/11 測試；相同暫存環境健康基準通過；兩個語意突變被指定斷言抓到。八個核心函式 V8 UTF-16 source offsets 覆蓋 6154/6515＝94.46%，非整體覆蓋率。原暫存路徑失敗紀錄保留，不當作有效突變證據。報表基準組持有欄位修正 N/A，原報表封存；raw 重印前後完全相同 SHA256 cd42d3b3ecfcd1110dcc43f4073e0ef7d74cb977876dea6b653fd311c2b38911，沒有重跑樣本。產品 index.html 相對前次 d746a87 無變動。

下一步：先凍結正式策略池、H9 持有者分母、跨夜六之四窮舉域，再執行正式 n≥10000；工具即使 n10000 也保持 formalStatus=incomplete，不能自動放行。三組玩家試玩與美術盲讀仍待完成，A3 真人六局依使用者決定暫緩。勿重做既有水陸／試玩 UI 驗證，也勿把練習局 JSON 混入平衡資料。

試玩入口沿用 http://127.0.0.1:9637/tests/tools/l1-playtest.html；伺服器停機時在候選工作樹執行 `python -m http.server 9637 --bind 127.0.0.1`。

收卷：候選分支 `601f126` 已推送（報告 e118193、Astra 覆審 378f9b1，APPROVE 探索用途，未解 HIGH/MEDIUM＝0）；raw 以專用 eol=lf 規則保留跨 checkout 的雜湊。主分支本次僅提交交接文件，沒有發布候選。
