# v0.66.0 發布候選整合——驗收條件（凍結，2026-10-12，動手前）

基準：origin/main db281fa9。整合分支 release/0.66.0（worktree C:/Users/shung/wt/yaoshi/release-066）。
依序 `git merge --no-ff`：
1 fix/role-desc-life 890743e8　2 fix/wishbar-chip 63397198　3 fix/h2-cards ae31a166
4 fix/h3-affordance 900200e2　5 fix/h1-guide 4697bb4f　6 feat/props-micro ab7e760a
不整合 n1/ch4-6-options。不 push、不動 main、不 force。

版本四處（index.html RELEASE_VERSION／VERSION／VERSION_NOTE、theme.css／safe-area.css 的 ?v=）與
tests/ui-hierarchy.test.mjs 的版本斷言一律 0.66.0；VERSION_NOTE 以「0.66.0：」開頭、合併各分支說明。

## 條件

① 六條分支新測試在整合版全綠：role-desc-life、wishchip、h2-cards、h3-affordance、h1-guide、relic-micro、relic-micro-visible；
   且 `git diff <分支HEAD> -- <測試檔>` 為空（為版本字串被迫改的除外，逐行說明）。
   變紅的實作：解衝突時丟掉任一分支的功能行（例：h1 提示、wishchip 標籤、h3 押 N 標記）、或兩分支同一函式互相覆蓋。
② 新增 tests/integration-066.test.mjs：三尺寸 844×390、667×375、932×430；solo 夜 1 盯上頁／出價頁、押寶夜（夜 7，以既有
   appraise-c-lib DRIVE_STEP 真實流程逐夜推進進入，且斷言 S.round===7 且 S.nightRule.id==='yabao'）出價頁。量測：
   (a) 新元件存在：#h1hint（夜 1）、.wishchip、窄籤上的出價／盯上標記（.tabbid／.tabmark，以真實 openSheet→closeSheet、
       盯上流程產生）、押寶夜收合的 .stakebar.collapsed、卷軸按鈕（鑑賞頁 .asc-act 內按鈕）；缺任一＝紅。
   (b) 上列新元件外框兩兩交集面積 =0（心願標籤量收合態；自動展開浮層關閉後再量）。
   (c) 任一新元件與 3D 拍品外框（tray.bboxScreen）、座位卡（#westSeat/#northSeat/#eastSeat）、主鈕（#mainbtn）交集 =0。
       （卷軸按鈕位於鑑賞頁，該頁本就把拍品推近，(c) 對卷軸按鈕只量與座位卡、主鈕；拍品不量——此為設計前提非放寬，回報註明。）
   若量出相交：不調整任何分支凍結條件，停下回報數字。
   變紅的實作：兩分支元件疊在同一角落（例 #h1hint 與 .wishchip 都放左下）。
③ `node tests/tools/trace-eq.mjs <origin/main 的 index.html> index.html` → equal:true（最終 commit 上量）。
   變紅的實作：任何合併改到結算／AI／賽局邏輯。
④ 全套 `node --test --test-concurrency=1 tests/*.test.mjs`（序列、單一 chromium、啟動前 tasklist 確認無其他 yaoshi／chrome 程序）：
   失敗集合 ⊆ {nightwalk #1 既有紅、sfx-wiring 逾時既有}；其他紅燈單跑重現再歸因並標明取得條件。不加 retry、不拉長 timeout。
⑤ `git diff --stat origin/main..HEAD` 逐檔一句對應哪條分支；列出全部手動解的衝突。
⑥ 舊版鑑別：以 YAOSHI_RENDER_ROOT=<origin/main worktree> 跑 integration-066 與六組新測試，須紅，且紅在行為斷言
   （至少 integration-066 對新元件的存在斷言），非啟動／旁枝錯誤。
⑦ 截圖存 D:/yaoshi-out/release-066/：844×390 夜 1 盯上頁、夜 1 出價頁、押寶夜出價頁、點開心願標籤、鑑賞頁首次提示、局末卡、異事卡各 1 張。

未驗證（先聲明）：iPhone 真機一律未驗證。

## 整合修訂 1（2026-10-12）——驗收實測才發現的跨分支漏項，只加嚴

原條①–⑦一字未動（含②門檻）。整合首跑 relic-micro-visible M6′ 紅：relic-micro-2-body × #h1hint（props-micro × h1-guide 跨分支，
兩分支各自都綠）。協調者裁示：只在整合分支調 #h1hint 位置／寬度（h1 分支的程式），屬加嚴，不需使用者簽。補條：

⑧ #h1hint 與信物全面不相交：三尺寸 × 夜 1 盯上頁／出價頁 × 角色排列
   {種子 3 自然排列；['dangpu','shoujing','luzhu','zutou'] 四席輪轉 4 次（含 dangpu 在座位 2），每排列連續取樣 6.6 秒（含動作窗的子 Mesh）；
    全部角色每席各輪到一次的 10 組靜止排列}，
   #h1hint 外框與 table-props 內每個可見 mesh（信物本體＋relic-micro 子 Mesh，排除 prop-contact-shadows 貼花）外框交集面積全為 0，
   且與 3D 拍品外框、座位卡、主鈕交集為 0。工具：tests/tools/h1hint-relic-sweep.mjs（有任何交集 exit 1）。
   改前實測（現行樣式）：844 盯上頁 dangpu@座位2 474px²、duanshou 886px²、luzhu 118px² 等；667 盯上頁 dangpu@座位0 329px²；932 盯上頁 duanshou 380px²；844 出價頁 duanshou 2.3px²。
   同時須綠：h1-guide 全部（含條 6、條 7）、relic-micro-visible M6′。
   紅：提示改回 844／932 盯上頁兩行（dangpu 座位 2 相交）；667 改成一行（橫跨座位 0 信物）。

## 整合修訂 2（2026-10-12）——條②「新元件與 3D 拍品外框交集為 0」改訂（使用者明確同意，選項 A）

依 02 §2.1：
- **原標準錯在哪**：訂條②時沒先量舊版基準。origin/main 同場景下，舊心願條／舊押寶面板（展開態）本身與 3D 拍品外框交集就是
  2248–25099 px²（docs/experiments/2026-10-12-release-066/b-old-vs-new.json），「為 0」連 origin/main 都過不了，是恆紅條件。
- **為什麼現在才知道**：整合首跑 integration-066 三尺寸紅在此條，協調者要求以同一治具量舊版基準（b-old-vs-new.json）後才確認。
- **同意**：使用者 2026-10-12 於主 session 針對這一條明確同意改 A（協調者轉達）。

新條件（取代條② 中「任一新元件與 3D 拍品外框交集為 0」對下列元件的部分；其餘不動）：
(i) 心願標籤 .wishchip（收合態）與收合押寶面板 .stakebar.collapsed 對 3D 拍品外框的交集面積，逐場景（三尺寸 × 夜 1 盯上頁／出價頁）
    不得大於 origin/main 同場景舊心願條（#feltHead .wishbar）／舊押寶面板（.stakebar 展開態）的交集面積。基準在測試裡用同一治具
    對 origin/main（db281fa9，git 物件直出）重量，不寫死；舊基準元件須存在（否則前提不成立＝紅）。
(ii) 夜 7 押寶夜：上述面積只記錄、不當門檻（同 seed 兩次跑拍品不同，已證不穩）。
(iii) 窄籤本體與出價／盯上標記對拍品的交集：只記錄，列為已知限制（667 夜 1 窄籤 2581→3138、844 夜 7 0→405，原因是新增出價標記），不當門檻。
(iv) 新元件彼此之間、與座位卡、主鈕的交集維持必須為 0；#h1hint 與 3D 拍品外框交集維持必須為 0（原條件不動）。
(v) 原存在斷言全部保留。
鑑別力：對 origin/main 跑須紅在 #h1hint 元件缺失；突變（心願標籤放大使交集超過舊版）須紅在 (i)；突變以備份副本還原、git diff 驗無殘留。
