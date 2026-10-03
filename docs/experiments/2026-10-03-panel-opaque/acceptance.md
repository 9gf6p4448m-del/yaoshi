# 驗收條件（凍結）— 北列展開面板不透明＋蓋過席位名牌／心願條

基準 = origin/main e19302f9（v0.59.8）。分支 feat/panel-opaque。只改呈現層（CSS，必要時極少量 JS class）。
不動遊戲規則／結算；不加「展開一個自動收另一個」。

1. Playwright 844×390 與 iPhone 橫式（852×393＋安全區 [0,59,21,59]，同 tests/tools/landscape-fit-probe.mjs 的 V1 模擬）、solo 局出價階段，
   分別展開：左條（#northPrev）、右條（#northShr）、左右同時。每種狀態下，對展開面板（.nfull）矩形內 >=95% 取樣點
   document.elementsFromPoint()[0] 屬於該面板（或其後代），且面板計算背景 alpha >=0.9。
2. 鑑別力：同一治具對基準 e19302f9 必須紅（至少一種狀態取樣點頂層不是面板，或 alpha<0.9），新版綠；兩邊實跑輸出各貼一次。
3. 收合狀態不變：收合時 HUD 區（#north 矩形）截圖與基準逐像素相同（差異 0）。
4. 展開面板仍可點回收合；不遮住底列「不盯任何一件／開標」按鈕與其可點區（取樣底列按鈕中心 elementFromPoint 為按鈕）。
5. tests/tools/trace-eq.mjs（e19302f9 的 index.html 對新版）equal:true；全套 node --test tests/*.test.mjs 全綠。
6. 版面不退步：text-fit-probe 與 landscape-fit-probe（凍結檔 docs/experiments/2026-09-25-acceptance-text-fit.md、…landscape-fit.md 的基準與口徑）
   新版結果不劣於 e19302f9 基準（逐項對照數字；分片時格數與判定須逐格相同）。
7. 版本：VERSION／VERSION_NOTE／RELEASE_VERSION 升 0.59.9，兩個 CSS 的 ?v= 同步，tests/ui-hierarchy.test.mjs 的 RELEASE_VERSION 斷言只改這一行。
8. git diff --stat 只含：樣式檔／index.html 的面板樣式與版本字串、tests/ui-hierarchy.test.mjs 一行、docs/experiments/2026-10-03-panel-opaque/*。

不得改寬：取樣比例 95%、alpha 0.9、逐像素差異 0、基準 SHA。
