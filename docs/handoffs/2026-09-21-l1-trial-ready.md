# L1 三組連攜試玩接續（2026-09-21）

使用者「繼續開工到完成需要試玩段落」。候選版本 v0.57.37 在 `feat/l1-water-chain`，工作樹 `C:/Users/shung/wt/yaoshi/l1-water-chain`；正式站仍 v0.57.35，本次不把候選合併發布。候選收尾 `d746a87`，Astra 最終放行 `d0fa90d`，瀏覽器卷 `44ee465`。

- [完整報告與證據](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1-trial/README.md)
- [凍結契約](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1-trial/acceptance.md)
- [Astra 覆審](https://github.com/9gf6p4448m-del/yaoshi/blob/feat/l1-water-chain/docs/experiments/2026-09-21-l1-trial/review.md)
- 本機試玩 http://127.0.0.1:9637/tests/tools/l1-playtest.html；伺服器停止時，在候選工作樹執行 `python -m http.server 9637 --bind 127.0.0.1`。

已做：水陸阻擋、千眼三件預告／已公開標額整理、雙虎部隊融合與獨立黑金模型、私有補件／啟動提示與 AI 加價；三組固定首夜練習與正常隨機局入口。練習 JSON 有 practice 標記，勿混入平衡或 A3 資料。

核心驗證：相關測試15/15、版面版本3/3；空表trace seeds1–20對de471a2逐位元組相等；千眼隱藏／雙虎撕甲兩個本輪語意突變皆被抓到；五個明列函式V8 source positions 2131/2172=98.11%，非整體覆蓋率。預設3D三組練習皆走到第二夜，雙虎成套新模型及缺件恢復原虎已核對；844×390／1280×720與390×844轉橫、最終無浮層與？返回選單通過。Astra APPROVE，0 open P1/P2，限獨立試玩候選。正常局初次probe曾因按鈕跨階段競態逾時，原失敗保存；穩定操作修正後新隨機局已走到第二夜，不冒稱遺失seed的同局回歸。

下一步是玩家試玩：看補件提示、三組效果是否清楚、黑金虎可讀性、卡住或遮擋。A3 六局仍依使用者決定暫緩，不算通過。正式L1e六之四與n≥10000平衡、美術盲讀仍未完成；先凍結策略與分母，不能以練習局替代。

原主工作樹09-15未提交檔案保持原樣；隔離分支承載所有本次產品改動。接手請先讀分支報告與git差異，不重跑已驗證水陸／A3工作。
