# 通用安全區適配與 iPhone 14 Pro 尺寸預檢

使用者設備：iPhone 14 Pro，Safari 加到主畫面。此處是桌機 Chromium 手機尺寸模擬，**不是 P4 真機驗收**。

## 改動與證據

- `assets/safe-area.css` 讀取 `env(safe-area-inset-*)`，保護牌桌、選角、交棒、抽屜、說明與回顧的互動內容；3D canvas 與背景維持滿版。產品没有寫死機型或 59px 留白。
- 牌桌中列改為 `minmax(0, 1fr)`：原本內容的隱含最小高度在縮小安全可用區後，會將底部出價列推到 y406，超過 393px 畫面。現在底列保持 y310–372，主按鈕 y319–363。
- 側欄市集高度不足時可捲動，下方卡片仍可操作。未改舊測試的尺寸、案例或驗收门檻。
- `node tests/tools/iphone-layout-check.mjs`：25/25 checks 通過，page errors 0。機械證據見 [result.json](result.json)。
- 既有 `node tests/tools/fpsdiag-probe.mjs docs/experiments/2026-09-15-iphone-standalone/fpsdiag-regression.json`：D1/D2/D3 全過；兩場皆各自結算最低值，關閉時無診斷 DOM，errors 0。此處 27/57 是當次桌機量測，不是 iPhone 成績。
- 紅控：停用新增牌桌 padding，同一安全區 fixture 下 x4/right848/bottom389，正確被判為超出安全範圍。
- 桌機 1280×720、零 insets：開關新增 stylesheet，牌桌、四席與主按鈕的 rect/scroll measurements 完全相同。
- 已逐張讀取 `landscape-bid.png`、`landscape-sheet.png`、`portrait-rotate.png`：出價確定鈕與底部主鈕可見，側欄第二張卡需捲動；直式保留請轉橫提示。

## 合成 fixture（非真機測量）

| 尺寸 | top/right/bottom/left |
| --- | --- |
| 橫向 852×393 | 0/59/21/59 px |
| 直向 393×852 | 59/0/34/0 px |
| 桌機 1280×720 | 0/0/0/0 px |

Playwright 1.62.1 有 `iPhone 14 Pro` descriptor（DPR 3）；其預設 landscape viewport 734×343 為瀏覽器近似，本次另用完整螢幕尺寸測試主畫面情境。WebKit binary `webkit-2336/Playwright.exe` 本地未安裝。即使安裝 Windows WebKit，也不能代替 iOS Safari 的實機 GPU、Web App、音訊與生命週期驗收。

## 現有主畫面支援與下一步

- `index.html` 已設定 `viewport-fit=cover`、Apple web-app-capable 與 black-translucent status bar；manifest 的 display 為 standalone，orientation 為 landscape，start_url 為 `.`。
- 未發現 service worker 註冊；首頁 manifest 不保留 `?fps=1` 查詢。因此「？」規則頁現在提供「顯示效能資訊／隱藏效能資訊」按鈕，不需輸入 URL、不重新載入或離開主畫面模式。
- 只將開關偏好存入 localStorage `ys_fps`，量測資料不保存、不外傳。關閉會取消取樣 rAF 與移除對決事件監聽；`?fps=1` 仍可強制開啟，按鈕切換會以 history.replaceState 移除 query override，不影響當局。
- 診斷包含 fps 平均、上一場對決最低值、draw calls、三角形、viewport/DPR，以及「主畫面模式／瀏覽器分頁」。已測量開關即時生效、停止取樣、同局不導航、query-free 新頁與重新載入保留設定；這是同源冷啟動近似，不冒稱已點過 iPhone 的實體圖示。
- P4 尚需部署後以使用者實機確認：同一版本、主畫面橫向、上下安全邊、轉向、出價抽屜與侧欄滑動、對決最低 fps、切背景再回來的音訊與狀態。桌機未提供這些真機結果。

安全區依據：[WebKit 官方 Designing Websites for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) 說明 `viewport-fit=cover` 取消自動 inset，重要內容應用 `env(safe-area-inset-*)`，並以 `max()` 保留最小留白。
