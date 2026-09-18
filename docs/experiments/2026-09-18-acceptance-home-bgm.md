# 首頁 BGM 小卷：驗收凍結（2026-09-18）

使用者 2026-09-18 問「首頁是不是沒有 BGM」，三案裁**乙**：首頁專屬備選曲 `assets/audio/bgm/alt/title-alt.m4a`（Flow Music「Lantern-Lit Night Market (Take 2)」），選角畫面才切到正式 `title`。範圍在 A3 之外（A3 凍結 #7「BGM `TRACKS`／`FADE`／`volume` 不動」指的是既有四首；本卷只**新增**一個 `home` 場景，四首路徑、`FADE`、`volume` 一格不動）。基準：v0.57.27（main `2aef73e`）。

| # | 條件 | 什麼實作會讓它變紅 |
|---|---|---|
| 1 | 標題頁**第一次點任何地方**（不限按鈕）就起 `home` 曲：headless 載 `index.html`、在標題頁點一下非按鈕區域後 `YS_BGM.scene==="home"` 且 `YS_BGM._cur.scene==="home"`；點之前 `scene===null`。 | 只掛在按鈕上；點了沒起 |
| 2 | 按「單人入市」後場景切為 `title`（選角畫面）：`YS_BGM.scene==="title"`；標題頁那次點擊的 document 監聽**不得**把 `title` 蓋回 `home`。 | 開局後還在放 home |
| 3 | 從選角畫面退回標題頁時回到 `home`。 | 退回標題頁仍放 title |
| 4 | `TRACKS` 既有四首路徑、`FADE`、`volume`、`READY` 四旗標逐字不變（`git diff` 只多 `home` 一行與旗標一個）；不新開 AudioContext；`?sfx=0`／🔇 下不播。 | 改到四首任一 |
| 5 | trace seeds 1–20 相等、`node --test` 全綠、console 0 error；bump `VERSION`；線上 `grep 'VERSION="'` 核對送達。 | 沒 bump；線上舊版 |
| 6 | 使用者真機：開首頁點一下就聽到曲子、按開局後換成選角那首；原話落本檔。 | 只在 headless 過 |

## 執行紀錄
- **實作（2026-09-18，v0.57.28）**：`assets/audio/bgm.js` `TRACKS.home`＝`alt/title-alt.m4a`＋`READY.home`（四首路徑、`FADE`、`volume` diff 0 行）；`index.html` `homeBgmTap()` 掛 document click／touchend（只在 `scene` 為 null 或 home 時起，startEntry 同步切 title 後冒泡到此不覆蓋）、`backToTitle()` 回 `home`。headless（http.server＋autoplay 旗標）：點標題頁文字前 `scene:null` → 後 `scene:"home"`、`_cur.scene:"home"`、`playing:true`、`_buf:["home"]`（#1）；按單人入市 → `scene:"title"`（#2）；返回 → `scene:"home"`（#3）；pageerror／console error 0；trace seeds 1–20 equal；`node --test` 96 綠（#4／#5）。#6 待使用者真機原話。
