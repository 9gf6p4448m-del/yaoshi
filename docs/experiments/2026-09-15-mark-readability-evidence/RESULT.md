# 盯牌縮放故障與尺寸待裁

## 已修的根因

`js/table-props.js` 的 `writeChips()` 會呼叫 `writeContactShadows()`，後者把共用暫存 `Sv` 設成陰影的非等比尺寸。隨後 `writeTokens()` 組合令牌矩陣，卻未初始化 `Sv`，使盯牌沿用陰影縮放。不是牌面朝向問題。

修正：在每枚令牌 `M.compose` 前加入 `Sv.setScalar(1)`。保留現行 W/H/PITCH/STAND_LIFT、InstancedMesh 數量與 128 枚銅錢預算。

## 驗證

- `tests/mark-token-scale.test.mjs` 執行真正 Three 幾何與 instance 更新，涵蓋四席信物陰影、四枚盯牌、128 枚銅錢、得標脈衝、換夜與直式 layout。
- 寫測試前未修來源為紅；修後綠。覆審發現初版 setSeats 誤傳字串，已修成 `{id,role}`，並明確斷言 4 件信物與 128 枚銅錢。
- 獨立覆審以記憶體還原舊來源：四件信物情境 scale≈`[0.19,0.12,1]`；修後≈`[1,1,1]`。新測試對真實故障有鑑別力。
- `props-probe.mjs` 改前／改後皆跑 1280×590 DPR2，seed1，正常出價／盯牌／揭盅、兩個 kill switch，runtime errors=[]，exit0。
- 34/34 測試項目曾全綠，原始輸出 `tests.txt`；後續高光修補的最终全測另見交接紀錄。

```powershell
node --test tests/mark-token-scale.test.mjs
node tests/tools/props-probe.mjs docs/experiments/2026-09-15-mark-readability-evidence/after --port=8918 --w=1280 --h=590
node tests/tools/mark-size-options.mjs
```

## 視覺尚未完成

`before-mark.png` 可見窄條；`after-mark.png` 正常寬高比例，但先前累次放大的牌面現在遮住拍品。**縮放 bug 已修，不代表盯牌美術已驗收。**

`size-options-sheet.png` 為同一 844×390 版面的 route-only A/B/C 尺寸候選，不改產品。B 建議中型，C 更省空間；候選尺寸與零錯誤資料見 `size-options.json`。另有多席盯同一槽互疊，尺寸本身不能完全解決。等待使用者選定尺寸後，再調整牌位與做最終截圖。

## 桌機滿編預檢（非手機 P4）

```powershell
node tests/tools/duel-perf.mjs perf docs/experiments/2026-09-15-mark-readability-evidence/desktop-full-army.json --n=8 --port=8923
```

- GPU：AMD Radeon 780M / ANGLE D3D11。
- 合成最重 8v8，16/16 尊可見；rAF 中位 59.9fps、P95 16.7ms、988 draw calls/frame、355472 triangles/frame、10 render passes/frame、errors=[]。
- `rendersPerSec=300.1` 是 render 呼叫速率，**不可稱 300fps**。
- 此測試不是手機量測，也不是 P4 對象題通過證據。正式真機仍待型號／瀏覽器、實際裝置遊玩、原 P4 三對讀者題目。
