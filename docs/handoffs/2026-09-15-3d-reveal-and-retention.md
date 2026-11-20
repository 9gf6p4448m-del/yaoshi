---
description: "/handoff 妖市：在公開 v0.57.8 重跑三人比標，不按「跳過」，逐件留存推鏡、錢柱／金光、結果卡三個畫面。"
date: 2026-09-15
topic: 3D 揭盅、令牌可讀性與結果卡
---

# 妖市交接：3D 揭盅、令牌可讀性與結果卡

## 目標

讓揭盅先成為可讀的 3D 比標演出，再提供不遮擋牌桌的結果資訊；同時讓「盯」令牌在遠景是明確可見的立體法牌，而非紅色細線，並維持 128 枚銅錢單一 InstancedMesh 預算。

## 現況（2026-09-15，續驗後）

- 現行公開版為 **v0.57.8**，commit `3a0c8d3 fix: make mark token readable at table distance`，已推到 `origin/main`；本地 `main...origin/main` 沒有 ahead/behind。
- 已實際開啟公開頁 `https://9gf6p4448m-del.github.io/yaoshi/?v=0.57.7&inspect=1&build=80e0c91`；即使 URL 保留舊查驗參數，首頁底部實際顯示 `v0.57.8`，與 `index.html` 的 `RELEASE_VERSION="0.57.8"` 一致。
- `3a0c8d3` 是 v0.57.7 後的遠景可讀性修正：令牌改為更大的近直立方牌、金字提亮、凸字加厚；仍使用既有四枚 `InstancedMesh`，沒有新增 draw call 或改動 128 枚銅錢預算。

## 已落地與證據

### 結果卡與揭盅節奏

- `2003be0 fix: center reveal card and stand mark tokens`：
  - `.revealRibbon.anim-lantern-reveal` 改用專屬 `ribbon-lantern-reveal`，在所有動畫影格保留 `translateX(-50%)`，不再被 `assets/theme.css` 的泛用燈籠動畫抹掉水平置中。
  - 結果卡 `z-index:30`，高於兩側 rail。
  - 令牌改為前傾立牌、墨黑玄玉與金紅凸字，並加入離桌高度。
- 已在公開 v0.57.6 跑到三人比標並實拍：結果卡居中、完整顯示「獵人：10🪙 👑 vs 大家樂組頭：4🪙 vs 孝女白琴：4🪙」，沒有偏右被 rail 蓋住。v0.57.7 沒有改動結果卡程式。
- `c6b58cc fix: anchor reveal camera and retract losing bids`：逐槽鏡頭錨定、落標錢柱收回、得標金光與法寶飛行的時間軸仍在；該行為由 `tests/reveal-table.test.mjs` 守衛。

### v0.57.7／v0.57.8 實際修正

- `80e0c91`：
  - `js/table-props.js`：盯牌提升為 `W:0.150`、`H:0.190`、`T:0.050`、`STAND_LIFT:0.130`，維持 `PITCH:0.70` 與 0.018 的凸字高度；沒有增加任何 InstancedMesh 或 draw call。
  - `index.html`：側欄 `.mcard` 改為內容高度（`flex:0 0 auto; justify-content:flex-start`），避免先前 `flex:1 1 0` 造成的大型空卡，同時保留 `min-height:88px` 以容納月相受惠列。
  - `RELEASE_VERSION` 已升至 `0.57.7`，頁面與 3D 模組的快取鍵均跟隨版本號。
- 已在公開 v0.57.7 進入第一夜並實拍：頁面版本正確，兩側拍品卡改為緊湊內容高度且未見文字穿過底框。
- 已在公開 v0.57.8 主動選擇「巴冷公主珠鍊」觸發玩家盯牌。遠景中可辨黑紅厚立牌與正面金色「盯」字，未再呈現為細線；此項原 blocker 已解除。
- 同局開標前公告顯示「過陰咒 3 人出價」，證明三人競標路徑已實跑。以「跳過」快轉會直接略過逐件比價卡，因此尚未保留該三人項目的個別結果卡畫面。

## 變更檔案與提交

- `index.html`
- `js/table-props.js`
- `tests/reveal-table.test.mjs`
- `tests/ui-hierarchy.test.mjs`

近期提交（均已推送）：

1. `80e0c91 fix: enlarge mark token and compact side cards`（v0.57.7）
2. `3a0c8d3 fix: make mark token readable at table distance`（v0.57.8）
3. `2003be0 fix: center reveal card and stand mark tokens`（v0.57.6）
4. `c643706 test: reproduce reveal card and mark token regressions`（v0.57.6 RED）
5. `fa4dde4 fix: keep reveal result card fully readable`
6. `c6b58cc fix: anchor reveal camera and retract losing bids`

## 驗證

- `node --test tests/*.test.mjs`：**30/30 測試檔通過**（v0.57.8 續驗後重跑）。
- `git diff --check`：通過。
- 公開 Pages：v0.57.8 版本文字已實測可見。
- 視覺檢查：
  - v0.57.6 已實際跑完三人比標與結果卡置中；
  - v0.57.7 已實際看到緊湊側欄卡；
  - v0.57.8 已主動觸發盯牌並確認遠景可讀；
  - 三人競標公告已看到，但逐件比價卡／錢柱結算／法寶飛走後結果卡仍缺同一輪完整截圖。

## 下一步（優先順序）

1. `48f644c feat: add highlight cut overlays` 已在本地完成，屬藍圖接下來的「轉場卷」：以純 DOM 疊層加入誅心（盯標得手）、因果・斃命（毒標當夜擊殺）、命懸一線・破曉（低血量冠軍）三種高光。它不寫入 `S`、不使用 RNG、不改 3D mesh／render pass；`tests/highlight-cuts.test.mjs` 守住觸發點、每局最多一次與 reduced-motion。
2. 本地實機走過開標、三人比標與盯標結算；該輪盯標由對手得標，因此誅心沒有誤播。仍應在下一輪刻意走到玩家盯標得手、毒標擊殺與低血量冠軍，各補一張實際轉場畫面。
3. 公開 v0.57.8 的揭盅驗收仍是獨立待辦：重跑三人比標，**不要按「跳過」**；逐件確認推鏡、錢柱／金光、法寶飛走後的居中結果卡。
4. 轉場卷驗收後，依 roadmap 先處理三件小事：三尊造型盲讀 M-A1（有應公）、tier 1 主角拍短暫推鏡、P4 對象題滿編真機。連鎖系統要先取得 D2 裁定，幽靈 PVP 要先取得 D3 裁定，均不應提前開工。

## 未提交但保留的使用者檔案

- 根目錄 `.codex-worktrees/`
- 根目錄 `props-bid.png`
- 根目錄 `props-bid3d.png`
- 根目錄 `props-mark.png`
- 根目錄 `props-reveal.png`

均為未追蹤檔案，沒有被本次工作修改、加入或刪除。

## ★ blocker ★

沒有程式、測試或部署阻塞。主動盯牌的實機可讀性已證實；唯一待補的是 v0.57.8 **不跳過**的三人逐件揭盅結果卡驗收。不可把只看過三人競標公告的同局，寫成已完成三人結果卡驗收。

## 2026-09-15 玩家回報後續（覆核上文）

玩家新照片證明盯牌仍窄，續查確認共用陰影縮放污染；上文可讀性結論不足，已修程式但正常比例的尺寸仍待選B/C，不能宣稱美術完成。公開seed3三人同槽、不跳過的推鏡／金光／結果卡已補，飛行碰頂待修。最新狀態與驗證見 [續接紀錄](2026-09-15-mark-scale-and-followups.md)。
