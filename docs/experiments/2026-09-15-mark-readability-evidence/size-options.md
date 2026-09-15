# 盯牌尺寸候選（2026-09-15）

供使用者比較；未選定產品尺寸，未改驗收門檻。

## 重現

`node tests/tools/mark-size-options.mjs`

治具沿用 props-probe 的 seed 1、solo qingmian、第一夜 `pickMark(2)` 路徑；三種尺寸只由 Playwright route 替換回應中的 TOKEN 常數，產品檔不改。全部保留 PITCH=1.05、雕字隨 W 縮放，產品現有 `Sv.setScalar(1)` 生效。頁面使用 844×390 CSS viewport、deviceScaleFactor=2，截圖以 CSS 尺寸輸出，沒有裁掉 UI。

| 候選 | W / H / STAND_LIFT | page / console / request errors | 畫面觀察（主觀記錄） |
| --- | --- | --- | --- |
| A | 0.230 / 0.280 / 0.250 | 0 | 牌面可讀但大幅佔桌前，中央牌遮住拍品腿部；左側兩席牌重疊。 |
| B | 0.150 / 0.190 / 0.175 | 0 | 牌面縮小後主體清楚，中央牌仍遮部分腿部；左側兩席牌重疊。 |
| C | 0.115 / 0.145 / 0.135 | 0 | 遮擋最少，中央及右側牌縮為小標記；左側兩席牌依然疊字。 |

三張均未遮住左右 DOM 市集卡；主要遮擋對象是中央 3D 拍品下半部。左側兩牌落點接近是三候選共同問題，縮小不能完全解決。這是候選比較，不宣稱完整視覺驗收或真機驗收。

- `option-A-mark.png`、`option-B-mark.png`、`option-C-mark.png`：全 UI 原尺寸截圖。
- `size-options-sheet.png`：Pillow 橫向拼接，2532×430，頂部加英文候選與尺寸文字，沒有更動三張內容。
- `size-options.json`：每個候選 route 命中一次、錯誤清單、道具 stats。
