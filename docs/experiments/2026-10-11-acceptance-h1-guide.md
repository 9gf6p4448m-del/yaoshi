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
