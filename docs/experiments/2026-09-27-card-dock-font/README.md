# v0.59.1 開卡停靠＋字型（霞鶩文楷）＋法寶亮一下 — 驗收結果

凍結檔：`docs/experiments/2026-09-27-acceptance-card-dock-font.md`（c14702b；修訂紀錄見檔尾，含使用者同意的 #1 改判準與字型改 B）。基準 5dfa1b1（v0.59.0）。全套腳本 `run-591.sh`（HEAD 530dc0a 起跑），之後修 V4 標題斷字（10f5408）並補驗。

| # | 結果 | 證據 |
|---|---|---|
| #1 不擋被展開那件 | 200/200 格 0 重疊（solo/hot/nw1–3 × V1–V5）；其他件重疊照記 142 筆 | run/card-dock/card-dock-judge.json |
| #2 版面 | 安全區、錨點（北列／座位／窄籤欄／底列／？鈕）、關閉鈕 ≥40、內容逐項等價、關卡後頂列復原、卡外半截字：全 0 違規 | 同上 |
| #3 字型角色 | 明體角色 → LXGW WenKai TC、內文 Noto Sans TC | 代理量測 p2.fam |
| #4 缺字 | WenKai TC Regular／Bold 對 1868 漢字 0 缺 | glyph-coverage.json |
| #5 不回退 | 斷字：V4 雙人局末標題「第 4／名」1 處退步→已修（hot 重跑 V1–V5 0）；越框／對比／觸控 0=0；字級同基準；對齊僅 railTabs 舊分組（成對重算 0/0）；text-fit 僅可捲項、無截斷；landscape-fit 105/105、嚴格 96=96、轉場全過；trace-eq equal；全套 402/402（idle 連 3 次）；gl-frame draw 77=77、getParameters 0=0；鏡頭：第 1 夜逐值相同，第 3 夜起 framing/cam 差異基準對基準同樣存在（雜訊），改後另多 #feltHead 高 72→66（字型行高） | run/ |
| #6 對照 | contact/contact-before-after-V1.png | contact/ |
| #8 亮一下 | 200/200：只亮對應那件、描邊或陰火增亮、姿態 y/rotY 開卡期間逐值不變、關卡復原 | card-dock-judge.json |

已知：全套在另有瀏覽器檢查同時執行時曾 2 fail（未記錄是哪兩支），閒置連跑 3 次 402/402，歸因負載（前卷亦記錄滿載 spawn 逾時）。
