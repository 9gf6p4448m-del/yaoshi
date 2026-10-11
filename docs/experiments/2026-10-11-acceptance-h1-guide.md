# H1 出價／盯上引導（甲案）驗收條件——動手前凍結（base origin/main db281fa9 v0.65.5，分支 fix/h1-guide）

（派工要求放 scratchpad/acceptance-h1.md；repo 的 scratchpad/ 被 .gitignore，無法進 git，故落在此檔並 commit；同內容另複製到 scratchpad。）

甲案（使用者已裁，不做乙案）：①夜數<=2 出價頁／盯上頁桌心常駐一行提示，第 3 夜起不顯示；②鑑賞卷軸加實體鈕（出價頁「出價這一件」、盯上頁「盯這一件」，沿用 .asc-pick 樣式），規則原文入口與出價入口視覺分開；③盯上頁主鈕「不盯任何一件」改次要樣式，功能不變。

測試檔：tests/h1-guide.test.mjs（Playwright 實頁）。每條後面寫「什麼實作會讓它變紅」。

1. 三尺寸 844x390／667x375／932x430，夜 1、夜 2 的出價頁與盯上頁各有一個可見的提示元素（#h1hint，文字非空、display 非 none、rect 寬高>0）；夜 3 該元素不可見。
   紅：只在第 1 夜顯示；只做出價頁；夜 3 仍顯示；元素存在但 display:none／寬高 0；文字空。
2. 提示出現前後 #felt、#feltHead 的 getBoundingClientRect 高度逐值相同（量法：同頁同相位，把 #h1hint 設 display:none 與恢復各量一次）；且提示 rect 與下列矩形的交集面積皆為 0：每件 3D 拍品的 tray.bboxScreen(i)（可見者）、#westSeat／#northSeat／#eastSeat 座位卡、#mainbtn。
   紅：提示用 in-flow 元素（撐高 #felt）；提示壓在 3D 拍品或座位卡或主鈕上。
3. 鑑賞卷軸（railTabClick 開啟、等穩定）內有 .asc-act 實體鈕；點擊後賽局狀態與點紙面（card.click()）逐欄位相同：出價頁＝#sheet 開啟且 sheetIdx 相同、myBids 相同；盯上頁＝S.marks[ACTIVE] 相同。667x375 下按鈕 rect 完整落在視窗內，且其中心 elementFromPoint 命中該按鈕。
   紅：按鈕不存在；按鈕點了沒動作；按鈕行為不同於點紙面（例如直接寫 amt）；667 下被切掉／被別的元素蓋住。
4. 規則原文入口（.asc-fold）與出價入口（.asc-act）class 不同、可讀文字不同，且計算樣式的 background-color 與 border-top-style 不同（出價鈕實底、規則鈕為無底）。
   紅：兩者用同一 class；文字相同；樣式相同。
5. 盯上頁 #mainbtn（「不盯任何一件」）：background-color 不等於出價頁主鈕（蓋牌開標）的 background-color；height 小於出價頁主鈕 height；文字對背景的對比（背景 alpha 為 0 時以 #south 背景合成）不高於出價頁主鈕。功能不變：點它仍 pickMark(null)（S.marks[ACTIVE]===null 且進入出價頁）。
   紅：沒改樣式；改了出價頁主鈕；改了功能。
6. 舊版（origin/main 的 index.html，用 YAOSHI_RENDER_ROOT 指向）跑同一支測試，紅在行為斷言（#h1hint／.asc-act 不存在的斷言），不是 pageerror／逾時。
7. tests/tools/trace-eq.mjs 對 origin/main vs 改後 index.html equal；node --test tests/*.test.mjs 改後失敗集合 ⊆ 改前失敗集合（同 worktree 先於改動跑一次記錄）。tests/ui-hierarchy.test.mjs 的 RELEASE_VERSION 斷言隨版本改為 0.65.9（版本號斷言，非及格線移動）。
8. 每條各做一個突變體（暫存目錄的 index.html 副本，原檔不動）：1 夜數判斷改 <=3；2 提示改 position:static；3 按鈕 handler 改成空函式；4 規則原文鈕套 asc-act class；5 還原主鈕樣式（移除 quiet 規則）。五個突變體跑同一支測試，各自預期紅在對應條。

版本：0.65.5 -> 0.65.9（VERSION、RELEASE_VERSION、theme.css?v、safe-area.css?v 四處＋VERSION_NOTE 開頭＋ui-hierarchy 測試斷言）。
不動：窄籤（約 3643）與鑑賞頁首次提示（fix/h3-affordance）、卡片（fix/h2-cards）。

## 修訂（加嚴）2026-10-12——驗收實測才發現的漏項，只加嚴、不降低任何原條件

原條 1–8 一字未動。18d590d2 版實測（tests/tools/h1-hint-props-probe.mjs）發現兩個原條件沒涵蓋的退步，由協調者裁示補條（可逆、屬實作修正，不需使用者簽）：

9. 鑑賞卷軸鏡子半徑：同一卷軸暫時隱藏 .asc-act 前後 appraiseLayout().r 差 <= 0.5px，涵蓋三尺寸、盯上頁與出價頁、所有 rail、所有拍品。18d590d2 在 667x375 railE slot 2（172.07→165.32）與 slot 3（187.46→179.54）紅。
   實作改法：實體鈕併進「規則原文」那一列（.asc-ctl，左右並列），兩鈕同高（28／tight 22），不新增高度。
   紅：按鈕獨立一列使鏡子變小。
10. 提示與所有可見桌上道具（table-props 內每個 mesh 的螢幕外框，排除 prop-contact-shadows 貼花）面積交集＝0。18d590d2 的置中位置與 relic-qingmian（骰子）相交 417–771 px²。
   實作改法：提示移到 #felt 左下角、max-width 116px（盯上頁句折兩行）。
   紅：提示改回置中。
11. 加嚴突變：m6 按鈕改回獨立一列（紅在條 9）、m7 提示位置改回置中（紅在條 10）。舊版 18d590d2 跑條 9／10 必須紅（9 紅在 667 railE）。

### 修訂補記（方案選擇，2026-10-12）
18d590d2 的 .asc-tags 同列版與 22a50094 的 .asc-ctl 併列版，在 667x375 都使鏡子半徑變小（紙面只有約 110px，規則原文鈕被擠成多行、整卷超高）。協調者代決（可逆實作選擇）採方案 1：667 寬（max-width:700px）用短標籤——出價頁「出價」、盯上頁「盯它」，規則鈕縮成「規則 N 條▾」；844／932 維持「出價這一件」「盯這一件」「✦ 規則原文 N 條・點開 ▾」。條 9（r 差 <=0.5px）不放寬；方案 1 若量不到才退方案 3（絕對定位疊角落，並加「按鈕與卷軸文字外框交集為 0」測試）。實測方案 1 在 667 的 4 枚籤 r 全相等（187.5／187.5／172.07／187.46）。條 3 的標籤斷言隨之改為依視窗寬分別檢查（<=700 看短標籤）。

## 整合修訂（2026-10-12，release/0.66.0）——驗收實測才發現的跨分支漏項，只加嚴
整合 feat/props-micro 後 #h1hint 與信物小動作子 Mesh 相交（M6′ 紅）；另以全角色排列掃描發現靜止信物本體也會相交（原條 10 只量種子 3 的自然排列）。
加嚴：條 10 的量測範圍擴大到 docs/experiments/2026-10-12-release-066/acceptance.md 條⑧ 的全部排列；原條 1–11 不變。
