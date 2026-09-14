---
description: "/handoff 妖市：先核實 d010129 的 GitHub Pages 部署，再以實機截圖檢視 3D 揭盅與局末回顧，修正最明顯的視覺或留存落差。"
date: 2026-09-15
topic: 3D 揭盅、128 枚銅錢與重玩動機
---

# 妖市交接：3D 揭盅與重玩動機

## 目標

把拍賣揭盅從遮住 3D 牌桌的 2D 收據，改為看得見各方錢堆、得標與詛咒結果的桌面演出；同時把局末回顧改成可採取行動的下一局策略提示，並保住最多 128 枚實體銅錢的效能預算。

## 已落地（有證據）

- `d010129`（2026-09-15 00:43 +08:00）已在 `main`，且本地 `main...origin/main` 沒有 ahead/behind：3D 揭盅、接觸陰影、硃砂法陣、月相受惠、勝負演出、局末策略建議與 128 枚效能治理均在此 commit。
- 改動檔案：`index.html`、`js/camera-director.js`、`js/renderer.js`、`js/table-props.js`、`js/table-tray.js`、`tests/perf128.test.mjs`、`tests/reveal-table.test.mjs`、`tests/tools/scene-shot.mjs`；commit 統計為 295 additions / 48 deletions。
- `tests/reveal-table.test.mjs` 4/4 綠：揭盅維持 3D 可見、托盤法陣/月相/結果狀態、接觸陰影與錢堆並列、局末只有一個完整回顧入口且策略不再硬優先心願。
- `tests/perf128.test.mjs` 4/4 綠；`tests/coin-geometry-budget.test.mjs` 1/1 綠：128 枚使用八邊方孔幾何，效能樣本先預熱，採交錯五輪中位數。
- 2026-09-15 收工重跑 `tests/*.test.mjs`：17 個測試檔全綠，包含 `review` 28、`wish16` 36、`roles-balance` 32、`fxtier` 14、`fxvocab` 30、`nightrules` 16、`legend` 32、`reveal-table` 4、`perf128` 4。

## 下一步（優先順序）

1. **核實公開版本**：開啟 `https://9gf6p4448m-del.github.io/yaoshi/`，確認部署是否已含 `d010129`；前一輪有「手機仍像舊版」回報，尚未以這個 commit 後的公開頁實測，故不得宣稱已上線可見。
2. **跑視覺閉環**：使用既有 `tests/tools/scene-shot.mjs`／`tests/tools/props-probe.mjs` 或真機，至少拍 1280×720 與 390×844 的競標、揭盅、局末回顧。每張圖必實際開啟檢視，依 `threejs-visual-loop` 比對接觸陰影、法陣民俗感、錢堆可比性、月相標記與閱讀層級。
3. **只修實證差距**：若公開頁或截圖仍沒有月相光標、下一局實驗或揭盅 3D 錢堆，先查 Service Worker/版本快取與部署來源，不要先重寫演出。
4. 若視覺已通過，依 `docs/proposals/2026-09-12-roadmap-v2-progress.md` §6 的既定順序，接續轉場卷；連鎖卷仍需製作人先裁 D2。

## 未提交但保留的使用者檔案

- 根目錄 `props-bid.png`、`props-bid3d.png`、`props-mark.png`、`props-reveal.png` 是試玩/參考截圖，未追蹤；不可擅自刪除或加入 commit。
- 根目錄 `.codex-worktrees/` 未追蹤；不可擅自刪除。

## ★ blocker ★

沒有程式或測試阻塞。唯一未落地存檔的驗收是：`d010129` 的公開 GitHub Pages 與手機畫面尚未在收工時重新截圖驗證。

