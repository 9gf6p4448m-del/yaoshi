---
description: "/handoff 妖市：從公開 v0.57.7 的盯牌與揭盅畫面續驗，先主動觸發一枚盯牌並重跑三人比標。"
date: 2026-09-15
topic: 3D 揭盅、令牌可讀性與結果卡
---

# 妖市交接：3D 揭盅、令牌可讀性與結果卡

## 目標

讓揭盅先成為可讀的 3D 比標演出，再提供不遮擋牌桌的結果資訊；同時讓「盯」令牌在遠景是明確可見的立體法牌，而非紅色細線，並維持 128 枚銅錢單一 InstancedMesh 預算。

## 現況（2026-09-15）

- 現行公開版為 **v0.57.7**，commit `80e0c91 fix: enlarge mark token and compact side cards`，已推到 `origin/main`；本地 `main...origin/main` 沒有 ahead/behind。
- 已實際開啟公開頁 `https://9gf6p4448m-del.github.io/yaoshi/?v=0.57.7&inspect=1&build=80e0c91`，標題頁底部顯示 `v0.57.7`。
- 先前的 v0.57.6 不算放行版：實玩時發現令牌仍過小、側欄卡雖不溢位卻被彈性高度撐出大片空白，因此立刻修正並升版為 v0.57.7。

## 已落地與證據

### 結果卡與揭盅節奏

- `2003be0 fix: center reveal card and stand mark tokens`：
  - `.revealRibbon.anim-lantern-reveal` 改用專屬 `ribbon-lantern-reveal`，在所有動畫影格保留 `translateX(-50%)`，不再被 `assets/theme.css` 的泛用燈籠動畫抹掉水平置中。
  - 結果卡 `z-index:30`，高於兩側 rail。
  - 令牌改為前傾立牌、墨黑玄玉與金紅凸字，並加入離桌高度。
- 已在公開 v0.57.6 跑到三人比標並實拍：結果卡居中、完整顯示「獵人：10🪙 👑 vs 大家樂組頭：4🪙 vs 孝女白琴：4🪙」，沒有偏右被 rail 蓋住。v0.57.7 沒有改動結果卡程式。
- `c6b58cc fix: anchor reveal camera and retract losing bids`：逐槽鏡頭錨定、落標錢柱收回、得標金光與法寶飛行的時間軸仍在；該行為由 `tests/reveal-table.test.mjs` 守衛。

### v0.57.7 實際修正

- `80e0c91`：
  - `js/table-props.js`：盯牌提升為 `W:0.150`、`H:0.190`、`T:0.050`、`STAND_LIFT:0.130`，維持 `PITCH:0.70` 與 0.018 的凸字高度；沒有增加任何 InstancedMesh 或 draw call。
  - `index.html`：側欄 `.mcard` 改為內容高度（`flex:0 0 auto; justify-content:flex-start`），避免先前 `flex:1 1 0` 造成的大型空卡，同時保留 `min-height:88px` 以容納月相受惠列。
  - `RELEASE_VERSION` 已升至 `0.57.7`，頁面與 3D 模組的快取鍵均跟隨版本號。
- 已在公開 v0.57.7 進入第一夜並實拍：頁面版本正確，兩側拍品卡改為緊湊內容高度且未見文字穿過底框。

## 變更檔案與提交

- `index.html`
- `js/table-props.js`
- `tests/reveal-table.test.mjs`
- `tests/ui-hierarchy.test.mjs`

近期提交（均已推送）：

1. `80e0c91 fix: enlarge mark token and compact side cards`（v0.57.7）
2. `2003be0 fix: center reveal card and stand mark tokens`（v0.57.6）
3. `c643706 test: reproduce reveal card and mark token regressions`（v0.57.6 RED）
4. `fa4dde4 fix: keep reveal result card fully readable`
5. `c6b58cc fix: anchor reveal camera and retract losing bids`

## 驗證

- `node --test tests/*.test.mjs`：**30/30 測試檔通過**。
- `git diff --check`：通過。
- 公開 Pages：v0.57.7 版本文字已實測可見。
- 視覺檢查：
  - v0.57.6 已實際跑完三人比標與結果卡置中；
  - v0.57.7 已實際看到緊湊側欄卡；
  - **尚未在 v0.57.7 以主動觸發的「盯」令牌實拍驗證牌面是否足夠可讀。**

## 下一步（優先順序）

1. 在公開 v0.57.7 選一件拍品作為玩家的盯上宣告，截取令牌落桌後的遠景；驗收點是可看出黑色厚牌與金紅「盯」，而不是一根細線。
2. 用同一局跑到三人比標，分別截取：鏡頭推入／錢柱結算與金光／法寶飛走後的結果卡；確認 v0.57.7 未引入新回歸。
3. 若令牌仍不夠讀，優先改提高相機側可見面積或牌面自發光對比；不要以新增 Mesh 解決，128 枚銅錢的 draw-call 預算必須不變。

## 未提交但保留的使用者檔案

- 根目錄 `.codex-worktrees/`
- 根目錄 `props-bid.png`
- 根目錄 `props-bid3d.png`
- 根目錄 `props-mark.png`
- 根目錄 `props-reveal.png`

均為未追蹤檔案，沒有被本次工作修改、加入或刪除。

## ★ blocker ★

沒有程式、測試或部署阻塞。唯一待補的是 v0.57.7 的「主動盯牌」實際截圖驗收；不可把這項未拍畫面寫成已證實。
