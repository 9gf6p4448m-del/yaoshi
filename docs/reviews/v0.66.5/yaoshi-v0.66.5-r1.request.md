review-id: yaoshi-v0.66.5-r1

全部用繁體中文回答，輸出必須符合給你的 JSON schema。JSON 的 `review_id` 欄位填 `yaoshi-v0.66.5-r1`，`summary` 的第一行照抄 `review-id: yaoshi-v0.66.5-r1`。

## 你的角色
你是妖市（瀏覽器 3D 拍賣卡牌遊戲，靜態 HTML／JS，`index.html` 主檔、`js/` 是 3D 層）的獨立技術與規則審查者。你沒參與實作。你的任務是**找出會出錯的情境**，不是確認看起來沒事。

## 你手上有什麼、能做什麼
- 工作目錄是受審 commit `e7ee2a3c` 的唯讀快照，含 `docs/`，**沒有 .git**，也沒有基準版的檔案。
- 要審的 diff（`ae2a56a5..e7ee2a3c`，只含規則面路徑；規則面的定義見快照 `CLAUDE.md` 開頭第 7 行）已附在本要求末段「diff」節，**不必也無法自己重算**。若 diff 看起來被截斷，在 summary 寫明，並直接讀快照裡的檔案補完。
- 你可以讀任何檔案、跑不寫檔的唯讀指令（例如 `grep`、`node -e` 讀檔）。環境是唯讀的：不要跑瀏覽器測試、不要跑會寫暫存檔的工具（例如 `tests/tools/trace-eq.mjs`）。
- 修正前的行為只能從 diff 的刪除行與靜態推論得知；iOS Safari 的實機行為也只能靜態推論。**沒辦法實際驗證的判斷，請在 finding 的 `detail` 開頭寫「（推測）」，並在對應 coverage 的 `note` 說明。**
- 本版宣稱做了什麼、驗收條件是什麼：docs/acceptance/2026-11-23-v0.66.5.md（在快照裡）。請拿驗收條件對照實作，條件本身有漏洞也要指出。

## 必查情境（8 項都要出現在 `coverage`，各一次；沒查的 `checked:false` 並在 `note` 寫原因）
1. engine-determinism：引擎亂數流與賽局狀態不可被呈現層改動影響；新程式有沒有在引擎路徑上耗亂數、寫賽局欄位，或在 headless 模擬（沒有 window／document）時丟例外。
2. layer-contract：3D 層（`js/`）不讀寫賽局狀態，只吃 `index.html` 用 `fx3d()` 派的事件；`window.__ys3dJournal` 補播要冪等（renderer 晚到時不漏、早到時不重播）。
3. async-loading：載入、快取、去重、競態（同一格被換掉、換夜、新局、重開局）、記憶體增長、重複下載浪費流量。
4. failure-paths：網路失敗、404、逾時、解析失敗、WebGL context lost、URL 開關（`?tray3d=0`、`?table3d=0` 等）下會不會卡死、空桌、丟未捕捉例外。
5. mobile-safari：iOS Safari／Apple GPU 的差異（沒有 requestIdleCallback、記憶體較緊、背景分頁、慢網路）；製作人只用 iPhone 試玩。
6. version-and-cache：版號、版本說明、css `?v=` 快取鑰匙、測試釘選是否一致；玩家會不會拿到舊檔。
7. tests-discriminating：新增或修改的測試在修正前的程式上會不會紅、修正後會不會綠；有沒有把斷言改鬆、跳過，或用替身蓋掉決定成敗的那段。
8. scope：diff 有沒有超出驗收檔宣稱的範圍。

## 嚴重度
- CRITICAL：規則判定錯誤、會影響勝負；存檔或紀錄毀損；遊戲卡死或無法進行；結論錯誤。
- HIGH：明確的 bug，或會導致錯誤的設計決策。
- MEDIUM：影響可信度或維護性。
- LOW：風格問題。

## 每個欄位怎麼填
- `verdict`：還有任何 CRITICAL 或 HIGH ＝ `FAIL`，否則 `PASS`。
- `counts`：必須等於 `findings` 裡各嚴重度的實際筆數。
- `findings`：每筆 `id` 本輪內唯一（F1、F2…）；`title` 一句話講是什麼問題；`detail` 講為什麼是問題（推測的開頭標「（推測）」）；`failure_scenario` 寫具體的輸入／狀態／操作順序 → 出什麼錯；`file` 是快照內的相對路徑、`line` 是**快照檔案**的行號（1 起算，整檔層級填 0）；`fix_hint` 一句建議改法。沒有具體失敗情境的疑慮，嚴重度最多 MEDIUM。
- `prior_findings`：第 1 輪給空陣列 `[]`。第 2 輪起，對上一輪的每一筆 finding（見下節）各給一筆，`status` 三選一：`fixed`（真的修好）、`superficially_fixed`（表面修好：症狀消失但根因還在，或只修了其中一條路徑）、`not_fixed`（沒修到），`note` 寫判斷依據與檔案行號。

## 上一輪的 findings
無（第 1 輪）

## diff
diff --git a/index.html b/index.html
index 0684be70..125c711b 100644
--- a/index.html
+++ b/index.html
@@ -10,7 +10,7 @@
 <meta name="mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
-<link rel="stylesheet" href="assets/theme.css?v=0.66.4"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
+<link rel="stylesheet" href="assets/theme.css?v=0.66.5"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
 <style>
 /* ===== 佔位美術：正式版整批替換，邏輯層不得依賴任何樣式 =====
    ===== 美術層（2026-09-03 起）：色彩／字型變數與動畫 keyframes 在 assets/theme.css，
@@ -1235,7 +1235,7 @@ h2{font-size:16px;color:var(--gold);margin:2px 0 8px}
   .asc-fold{background:none;border:0;border-bottom:1px dashed var(--asc-zhu);font-size:.92em}
   .asc-fold::after{content:" ▾";font-weight:700}
 </style>
-<link rel="stylesheet" href="assets/safe-area.css?v=0.66.4"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
+<link rel="stylesheet" href="assets/safe-area.css?v=0.66.5"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
   不照 sfx／renderer 用 RELEASE_VERSION 字串拼接：這個 <link> 在 <head>、早於主 script，那時 RELEASE_VERSION 還沒定義；
   挪到主 script 之後注入會先畫一幀沒套這份樣式的畫面，而主 script 前又不能多開一支 script 標籤（tests/tools/load.mjs 只抓第一個）。 -->
 <script type="importmap">
@@ -2948,9 +2948,9 @@ function chainHintHTML(p,it){
 /* ?sim=1 進平衡模擬器工具頁，不影響正常遊戲頁（不自動執行、不動任何既有流程） */
 /* ===== 版本字串單一事實來源（2026-09-02 使用者裁定）：每次改版只改下面這一行，<title> 與首頁那行都由此帶出；
    使用者以首頁字串判斷是否已推上線；線上檢查用 grep 'VERSION="' ===== */
-const VERSION="0.66.4", VERSION_NOTE="0.66.4：不是請神夜、也沒有人燒香的晚上，開標後直接「開戰」，不用先按一次沒有結果可看的「請神」；規則頁（右上 ？）的音訊診斷與效能資訊移到最下面；點別人的座位看袋子，公開戰力改成和座位上一樣的「幾隻・血多少」。結算、數值不變。0.66.3：法寶模型下載的內部處理——換夜後不再留著用不到的等待。純效能，畫面與結算不變。0.66.2：網路慢時，法寶模型下載到一半停住，約 20 秒後會另外再下載一份（原本那份不中斷，哪份先下載完就用哪份；原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；還沒開始下載的模型最多排隊 45 秒就重新要一次；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；牌桌某一格換成別件法寶後，前一件才載入失敗時，不會再把新的那一格當成已經擺好。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
+const VERSION="0.66.5", VERSION_NOTE="0.66.5：關掉袋子、角色資訊（ⓘ）或規則頁之後，馬上點別的地方不會再沒反應（原本關掉後半秒內整個畫面都按不動）；只有剛按「關閉」的那一點附近仍會擋半秒，防止連按兩下點到底下的東西。結算、數值不變。0.66.4：不是請神夜、也沒有人燒香的晚上，開標後直接「開戰」，不用先按一次沒有結果可看的「請神」；規則頁（右上 ？）的音訊診斷與效能資訊移到最下面；點別人的座位看袋子，公開戰力改成和座位上一樣的「幾隻・血多少」。結算、數值不變。0.66.3：法寶模型下載的內部處理——換夜後不再留著用不到的等待。純效能，畫面與結算不變。0.66.2：網路慢時，法寶模型下載到一半停住，約 20 秒後會另外再下載一份（原本那份不中斷，哪份先下載完就用哪份；原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；還沒開始下載的模型最多排隊 45 秒就重新要一次；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；牌桌某一格換成別件法寶後，前一件才載入失敗時，不會再把新的那一格當成已經擺好。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
 /* 每次部署遞增此版號；首頁顯示與 asset query 都讀它，讓玩家可核實公開頁。 */
-const RELEASE_VERSION="0.66.4";
+const RELEASE_VERSION="0.66.5";
 /* ===== 音訊診斷與喚醒（2026-09-03，使用者回報 v0.27 iPhone 整個沒聲音、🔇 與靜音撥桿都排除）=====
    我沒有 iPhone 可重現，所以把每一層的狀態印在規則頁最下面（v0.66.4 M5 由最上面搬過去），讓使用者唸給我聽：
    ctx 有沒有／state（iOS 特有 "interrupted"）／取樣率／音效開關／sfx.js 有沒有載到（聲部數）／最後一次 play 與例外／
@@ -3186,6 +3186,37 @@ const gStamp=e=>{
    ★為什麼用「簽名」而不是節點本身★：#budget 重繪會換掉燒香「＋」的節點，但它做的事沒變
    （還是同一個 incBump(1)）——那不是相位切換，不該武裝；拿節點比對會把「連按燒香 ＋」也擋掉。 */
 let PHASE_AT=-1e9;
+/* ═════ 關掉「只能看的視窗」：只擋關閉那一點附近（v0.66.5，2026-11-23；DECISIONS 同日「製作人選甲」；凍結檔 docs/acceptance/2026-11-23-v0.66.5.md）═════
+   製作人 iPhone 試玩：「開局按 然後後續想按第二次按不出來」「按了沒反應 再按第二次」——點座位看完袋子、按關閉，
+   馬上點另一席，那一下被吞。原因是上面這道閘：關閉那一下讓手指底下從「關閉鈕」換成桌面，簽名變了，
+   於是整個畫面吸收 MAIN_GUARD_MS（實測關閉後 150／300／450ms 點座位都被吞，v0.66.3 與 v0.66.4 逐格相同，是既有行為）。
+   ★只能看的視窗關掉後，回到的是打開前那一面，使用者都看過★；剩下的風險只有「連按關閉兩下」的第二下，
+   落在關閉鈕底下那塊——實測三個橫式尺寸，別人袋子的關閉鈕底下都壓著托盤 1 號格（盯上頁＝pickMark，公開、不可逆）。
+   ⇒ 這一種切換改成只武裝**落點附近**：半徑 VIEW_GUARD_R 內、MAIN_GUARD_MS 內的點擊照樣吞，其他位置馬上可點。
+   ・**只認一種**：按下那一刻 #modal 開著、內容帶 `data-viewonly` 標記（只有 showBag 三種、showRoleInfo、openHelp 有），
+     而且這一下派送完 #modal 已經關了。視窗裡按了別的（送神回天、切換效能資訊）沒有關掉視窗，照舊整層武裝；
+     其他視窗（請神選尊、供奉詢問…）沒有標記，一律照舊。標記放在視窗內容裡，任何視窗換上自己的內容時就自然消失。
+   ・沒有座標的點擊（鍵盤 Enter／Space）照舊整層武裝：沒有落點，就沒有「附近」可言。
+   ・托盤收的是 pointerdown，不經過下面那個 click 監聽 ⇒ trayTap 另外呼叫同一支 viewGateHeld（防線按效果寫，兩條路都蓋）。
+   ・VIEW_GUARD_R＝100 CSS px：Android 判定「同一處連點兩下」的距離上限（ViewConfiguration 的 DOUBLE_TAP_SLOP＝100dp）。
+     實測（tmp/v0665/geom.log）：844×390、667×375、932×430 三個尺寸，各視窗關閉鈕中心到任一席座位 ≥175px、到主鈕 ≥216px。
+   ・已知取捨：視窗開著的時候底下若自己換了東西（例如開標演出還在跑），關掉後點別處不會再被這道閘吸收——
+     和沒開視窗時看著畫面變化是同一種處境，這道閘本來也只管「點擊同步造成的切換」。 */
+const VIEW_GUARD_R=100;
+let VIEW_GATE=null;   /* {x,y,at}：最近一次「關掉只能看的視窗」的落點與時刻（performance 時間軸） */
+function modalShown(){ const m=document.getElementById("modal"); return !!(m&&m.style.display==="flex"); }
+function viewOnlyModalOpen(){
+  if(!modalShown()) return false;
+  const b=document.getElementById("modalbox");
+  return !!(b&&b.querySelector&&b.querySelector("[data-viewonly]"));
+}
+/* t＝按下時刻（gStamp），x／y＝落點；沒有座標的一律當作在附近 */
+function viewGateHeld(t,x,y){
+  const g=VIEW_GATE;
+  if(!g||t-g.at>=MAIN_GUARD_MS) return false;
+  if(!(x>0||y>0)) return true;
+  return Math.hypot(x-g.x,y-g.y)<VIEW_GUARD_R;
+}
 function phaseSwallow(e){
   /* ★不能連 audioWake 一起擋★：iOS 解鎖音訊靠 document 上那個 click 監聽，
      stopImmediatePropagation 之後它收不到，所以這裡明文補叫一次（探針 C5 在驗）。 */
@@ -3225,6 +3256,7 @@ let PENDING_PT=null;   /* 這一下點擊的落點與「按之前那裡能做什
   document.addEventListener("click",function(e){
     const t=gStamp(e);
     if(t-PHASE_AT<MAIN_GUARD_MS){ phaseSwallow(e); return; }
+    if(viewGateHeld(t,e.clientX,e.clientY)){ phaseSwallow(e); return; }   /* v0.66.5：剛關掉只能看的視窗，只擋那一點附近 */
     const x=e.clientX, y=e.clientY;
     /* ★沒有座標的點擊也要武裝★（v0.53.5 覆審 F1：這裡原本直接 return，於是
        **鍵盤啟動的點擊（按鈕聚焦後按 Enter／Space，clientX/Y 都是 0）只會被吞、永遠不會武裝**
@@ -3238,7 +3270,8 @@ let PENDING_PT=null;   /* 這一下點擊的落點與「按之前那裡能做什
        讓它武裝只會把治具的驅動點擊吞掉、什麼玩家問題都防不到。 */
     const el=(!byPoint&&e.isTrusted&&e.target&&e.target.nodeType===1)?e.target:null;
     if(!byPoint&&!el) return;
-    PENDING_PT={x,y,el,sig:byPoint?sigAt(x,y):sigOf(el)};
+    /* view：按下這一刻開著的是不是只能看的視窗（要在派送之前量，派送完它可能已經關了） */
+    PENDING_PT={x,y,el,sig:byPoint?sigAt(x,y):sigOf(el),view:byPoint&&viewOnlyModalOpen()};
     /* ★備援★：若這一下的冒泡被誰擋掉（全檔只有座位卡的 ⓘ 會 stopPropagation），下面那個 bubble
        監聽就收不到，改由這個 task 補比。
        ★一定不能用微任務★：微任務檢查點發生在**每一個 listener 之間**（堆疊一空就跑），
@@ -3256,7 +3289,11 @@ let PENDING_PT=null;   /* 這一下點擊的落點與「按之前那裡能做什
     PENDING_PT=null;
     /* 有落點就比落點，沒落點就比同一個節點；節點已經從文件裡消失＝那個動作不在原處了，算變了 */
     const now=p.el?(p.el.isConnected?sigOf(p.el):"✂"):sigAt(p.x,p.y);
-    if(now!==p.sig) PHASE_AT=gNow();
+    if(now!==p.sig){
+      /* v0.66.5：這一下關掉了只能看的視窗 ⇒ 只武裝落點附近；其他切換照舊整層 */
+      if(p.view&&!modalShown()) VIEW_GATE={x:p.x,y:p.y,at:gNow()};
+      else PHASE_AT=gNow();
+    }
   }
 })();
 /* 等使用者按主按鈕才繼續（跳過中則直接通過） */
@@ -3974,6 +4011,7 @@ function trayTap(ev){
      用「現在」去比早就超出 500ms 的視窗、擋不到，而使用者其實是在畫面凍住那段按的。 */
   const now=gStamp(ev);
   if(now-PHASE_AT<MAIN_GUARD_MS||now-TRAY_TAP_AT<MAIN_GUARD_MS) return;
+  if(viewGateHeld(now,ev.clientX,ev.clientY)) return;   /* v0.66.5：剛關掉只能看的視窗、這一下落在關閉點附近（連按關閉的第二下）→ 不收 */
   const before=TRAY_PHASE;
   /* ★觸控裝置沒有 hover★：`pointermove` 只在手指**按著**的時候發，所以手機玩家從來不會經過
      `trayHover` ⇒ 描邊（只掛 hover 那一件）與鏡頭微推在手機上永遠看不到。
@@ -6892,7 +6930,7 @@ function openHelp(){
     +`<button id="fpsToggle" class="side" style="margin-top:6px" aria-pressed="${FPS_ON}" onclick="toggleFpsDiag()">${FPS_ON?"隱藏效能資訊":"顯示效能資訊"}</button>`
     /* 關閉時 DOM 沒有 #fpsDiag，取樣器與對決監聽也移除。 */
     +(FPS_ON?`<div id="fpsDiag" style="font-size:11px;color:var(--dim);line-height:1.6;word-break:break-all;border:1px dashed var(--line);padding:4px 6px;border-radius:6px;margin-top:4px">📈 fps 診斷：${fpsDiagText()}</div>`:"");
-  $("modalbox").innerHTML=`<h2>？ 妖市規則</h2><div style="text-align:left">
+  $("modalbox").innerHTML=`<h2 data-viewonly>？ 妖市規則</h2><div style="text-align:left">
     ${sec("🏮 目標",`壽命＝錢包＋血條。撐過 ${CFG.ROUNDS} 夜，活到最後或天亮時壽命最高者勝。壽命歸零出局（夜末心願回血可救回）。${CFG.NIGHT_REGEN>0?`每夜天明，存活者回 ${CFG.NIGHT_REGEN} 壽命。`:""}`)}
     ${sec("🌙 每夜流程",`①抽今夜心願（私有）→${CFG.MARK_ON?"②盯上宣告（公開釘一件"+(CFG.MARK_TAX>0?"，盯了沒出價付 "+CFG.MARK_TAX+" 虛張稅":"")+"）→③":"②"}妖市出價→開標→結算戰→夜末結算（詛咒侵蝕、心願判定、貸款攤還${CFG.NIGHT_REGEN>0?"、天明回血":""}）。`)}
     ${CFG.MARK_ON?sec("👁 盯上宣告",`封標前每人公開釘一件拍品。它不改任何數字，只改對手的想法：怯場型的 AI 會避開被盯的拍品、搶標型的反而更想搶、無視型不理。每個角色的反應寫在角色卡（ⓘ）。訣竅在盯哪一件：滿桌怯場型時盯你的小額側標，對手會讓路；滿桌搶標型時別盯側標，會被圍剿。${CFG.MARK_TAX>0?`盯了那件卻沒出價要付 ${CFG.MARK_TAX} 壽命。`:""}`):""}
@@ -9161,13 +9199,13 @@ function downloadReplay(){
 /* ================= 袋子檢視 ================= */
 function showBag(pid){
   if(REVEAL_ANIMATING){
-    $("modalbox").innerHTML=`<h2>逐件開標中</h2><p>本夜拍品揭完後即可查看袋子。</p><button class="bigbtn" style="width:100%" onclick="closeModal()">關閉</button>`;
+    $("modalbox").innerHTML=`<h2 data-viewonly>逐件開標中</h2><p>本夜拍品揭完後即可查看袋子。</p><button class="bigbtn" style="width:100%" onclick="closeModal()">關閉</button>`;
     $("modal").style.display="flex";
     return;
   }
   const p=S.players[pid];
   if(!canViewPrivateBag(pid)){
-    $("modalbox").innerHTML=`<h2>${DIRS[pid]}家・${p.name}</h2>${destinyLetterHTML(p)}<p class="mut">袋中持有只供本人私下查看。</p><p style="margin-bottom:12px">公開戰力：${CFG.PAPERWAR_ON?paperForceText(p):Math.round(power(p))}</p><button class="bigbtn stickyClose" style="width:100%" onclick="closeModal()">關閉</button>`;
+    $("modalbox").innerHTML=`<h2 data-viewonly>${DIRS[pid]}家・${p.name}</h2>${destinyLetterHTML(p)}<p class="mut">袋中持有只供本人私下查看。</p><p style="margin-bottom:12px">公開戰力：${CFG.PAPERWAR_ON?paperForceText(p):Math.round(power(p))}</p><button class="bigbtn stickyClose" style="width:100%" onclick="closeModal()">關閉</button>`;
     $("modal").style.display="flex";
     return;
   }
@@ -9180,7 +9218,7 @@ function showBag(pid){
       :`該系最多紙隊增員 +${lv}`;
     bonus+=`<div class="bagit"><span>紙紮共鳴：${FAC[f].n}×${c}</span><b class="heal">${effect}</b></div>`;
   }
-  $("modalbox").innerHTML=`<h2>${DIRS[pid]}家・${p.name}（${faceLbl(p)}）</h2>
+  $("modalbox").innerHTML=`<h2 data-viewonly>${DIRS[pid]}家・${p.name}（${faceLbl(p)}）</h2>
     ${destinyLetterHTML(p)}
     ${chainStatusDisclosureHTML(p)}
     ${p.bag.length?p.bag.map(x=>`<div class="bagit"><span>${x.n}<span class="fchip ${FAC[x.f].cls}">${FAC[x.f].n}</span>
@@ -9222,7 +9260,7 @@ function showRoleInfo(pid){
   const p=S.players[pid];
   /* 信譽在 roleDescHTML 之外另掛一行：那支只吃 roleId（選角畫面也用它，當下還沒有玩家物件），
      而信譽是「這一席這個人」的紀錄、不是角色屬性——公開資訊，自己與對手都照樣顯示。 */
-  $("modalbox").innerHTML=`<h2>${DIRS[pid]}家・${p.name}</h2>
+  $("modalbox").innerHTML=`<h2 data-viewonly>${DIRS[pid]}家・${p.name}</h2>
     ${roleDescHTML(p.roleId,!!p.ai)}
     ${credRowHTML(p)}
     <button class="bigbtn" style="margin-top:10px;width:100%" onclick="closeModal()">關閉</button>`;
diff --git a/tests/tools/phase-gate-probe.mjs b/tests/tools/phase-gate-probe.mjs
index c0ccb5d7..77e98f7d 100644
--- a/tests/tools/phase-gate-probe.mjs
+++ b/tests/tools/phase-gate-probe.mjs
@@ -789,7 +789,9 @@ const mutate = async () => {
   const m4 = cut('try{ audioWake(); }catch(_){}', 'M4 被吞那一下補叫 audioWake');
   /* M3：讓 sigAt 恆回不同字串 ⇒ 每一下點擊都被判成相位切換、整個畫面永遠在吸收
      ⇒ 正常的重複操作（C6 連按燒香）必須紅。守的是「偵測不得過度武裝」。 */
-  const SIG_LINE = 'let s=(el.id||"")+"|"';
+  /* 定位字串跟著程式碼搬家（v0.66.5 補）：sigOf 後來改成以「承載 onclick 的元素」b 為準（sigof-decoration 那一卷），
+     這裡還寫 el.id 就找不到、--mutate 整支丟例外。只改定位字串與 M5 的替換式（同樣用 b），突變的語意不變。 */
+  const SIG_LINE = 'let s=(b.id||"")+"|"';
   const m3src = src.slice();
   const j3 = m3src.findIndex((l) => l.includes(SIG_LINE));
   if (j3 < 0) throw new Error('找不到 sigAt 組簽名的那一行');
@@ -799,7 +801,8 @@ const mutate = async () => {
      其餘一字不動 ⇒ 「同一顆按鈕原地改語意」那一類又看不到 ⇒ D1／D2 必須紅。 */
   const m5src = src.slice();
   const j5 = m5src.findIndex((l) => l.includes(SIG_LINE));
-  m5src[j5] = '    let s=(el.id||"")+"|"+(a?(a.getAttribute("onclick")||""):"")+"|"+(el.className||"");\n';
+  if (j5 < 0) throw new Error('找不到 sigAt 組簽名的那一行（M5）');
+  m5src[j5] = '    let s=(b.id||"")+"|"+(a?(a.getAttribute("onclick")||""):"")+"|"+(b.className||"");\n';
   const j5b = m5src.findIndex((l) => l.includes('el.closest("#modal")'));
   if (j5b < 0) throw new Error('找不到 #modal 雜湊那一行');
   const gone5 = m5src[j5b].trim();
diff --git a/tests/ui-hierarchy.test.mjs b/tests/ui-hierarchy.test.mjs
index db7f8036..b6385a73 100644
--- a/tests/ui-hierarchy.test.mjs
+++ b/tests/ui-hierarchy.test.mjs
@@ -22,7 +22,7 @@ test('從側欄查看拍品時，3D 桌上同一件也會進入檢視態', () =>
 });
 
 test('首頁顯示可核對的發布版本', () => {
-  assert.match(page, /const RELEASE_VERSION="0.66.4"/, '本次公開版需遞增語意版本');
+  assert.match(page, /const RELEASE_VERSION="0.66.5"/, '本次公開版需遞增語意版本');
   assert.match(page, /v\$\{RELEASE_VERSION\}/, '首頁版本列必須顯示發布版本');
   assert.match(page, /renderer\.js\?v="\+RELEASE_VERSION/, '3D 模組快取鍵必須隨發布版本更新');
   const rel = page.match(/const RELEASE_VERSION="([^"]+)"/)[1];
diff --git a/tests/ux-0665.test.mjs b/tests/ux-0665.test.mjs
new file mode 100644
index 00000000..b1da86a9
--- /dev/null
+++ b/tests/ux-0665.test.mjs
@@ -0,0 +1,350 @@
+// v0.66.5 連點守衛放寬的實頁驗收（凍結檔 docs/acceptance/2026-11-23-v0.66.5.md）。
+// 製作人 iPhone：關掉別人的袋子後馬上點另一席，「按了沒反應 再按第二次」——相位閘在關閉那一下整個畫面吸收 500ms。
+// v0.66.5：關掉「只能看的視窗」（袋子、角色卡 ⓘ、規則頁）之後，只擋關閉那一點半徑 100px 內，其他位置馬上可以點。
+//   V1  關掉後 150／250／350ms 點座位 2 要打開（4 種視窗 × 按關閉鈕／點背景 × 2 個尺寸）
+//   V2  連按關閉鈕兩下（120ms）：第二下照樣被吞——關閉鈕底下多半壓著托盤 1 號格（盯上頁＝公開盯上，不可逆）
+//   V2b 點背景關袋子、落點底下是托盤格，連點兩下：盯上頁不得盯上
+//   V2c 同上在出價頁：不得打開出價視窗
+//   V3  「附近」的邊界：關閉點正上方 0／60／90px 吞、110／160px 放行（?tray3d=0，只量點擊那條路）
+//   V4  視窗裡按了別的（自己袋子的「送神回天」）不算關閉：150ms 後點背景照樣被吞、視窗還開著
+//   V5  鍵盤（Enter）關掉：沒有座標，照舊整層吸收，150ms 後點座位 2 被吞
+//   V6  不是只能看的視窗（供奉詢問）：按「要，繼續供奉」後 150ms 點座位 2 照舊被吞
+//   V7  「只能看」的標記只出現在那五個視窗（showBag 三種、showRoleInfo、openHelp），其他視窗一個都沒有
+// 基準對照：YAOSHI_RENDER_ROOT=<舊版樹> 對舊版跑同一份（V1、V3 放行那兩點、V7 應紅；其餘舊版就綠）。
+// 每一下「應該被吞／應該放行」都先驗量測前提：關閉那一下真的關了、兩下點擊的按下時刻相隔 < 500ms（MAIN_GUARD_MS）。
+// 瀏覽器規矩：一次只開一個 chromium；每個情境各開一頁。觸控模擬（iPhone 那條路：pointerdown＋click 都帶座標）。
+import assert from 'node:assert/strict';
+import test, { before, after } from 'node:test';
+import fs from 'node:fs';
+import path from 'node:path';
+import { spawn } from 'node:child_process';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
+
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
+const PORT = Number(process.env.YAOSHI_UX0665_PORT || 9778);
+const GUARD = 500;   /* MAIN_GUARD_MS（凍結數字）；量測前提用，不從頁面讀——舊版也要能跑 */
+const wait = (ms) => new Promise((r) => setTimeout(r, ms));
+
+function loadPlaywright() {
+  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
+    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
+  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
+  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
+}
+
+let srv, browser;
+before(async () => {
+  const { chromium } = loadPlaywright();
+  srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
+  await wait(900);
+  browser = await launchGpu(chromium);
+});
+after(async () => { await browser?.close(); srv?.kill(); });
+
+/* 量測用的掛鉤：window capture 記下每一下點擊（含被相位閘吞掉的），document bubble 只收到沒被吞的；
+   動作函式包一層記呼叫（inline onclick 與 trayTap 都是照名字找全域函式，包 window 上那支就攔得到）。 */
+const INSTR = () => {
+  window.__clk = []; window.__bub = []; window.__calls = [];
+  window.addEventListener('click', (e) => window.__clk.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), true);
+  document.addEventListener('click', (e) => window.__bub.push({ t: e.timeStamp, x: e.clientX, y: e.clientY }), false);
+  for (const n of ['showBag', 'showRoleInfo', 'openHelp', 'closeModal', 'pickMark', 'openSheet', 'toggleSfx', 'incBump', 'giveUpLegend', 'toggleFpsDiag']) {
+    const o = window[n]; if (typeof o !== 'function') continue;
+    window[n] = function () { window.__calls.push(`${n}(${[...arguments].map((a) => JSON.stringify(a)).join(',')})`); return o.apply(this, arguments); };
+  }
+};
+async function open({ size = [844, 390], query = '' } = {}) {
+  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
+  const page = await ctx.newPage();
+  const errors = [];
+  page.on('pageerror', (e) => errors.push(String(e)));
+  await page.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) { /* 無痕 */ } });
+  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`);
+  await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi && (window.__yaoshi3d.tray || /tray3d=0/.test(location.search)), null, { timeout: 60000 });
+  await page.evaluate(INSTR);
+  await page.evaluate(() => window.__yaoshi.newGame('solo', 3, ['qingmian']));
+  await page.waitForFunction(() => document.getElementById('seat2') && TRAY_PHASE === 'mark', null, { timeout: 30000 });
+  await page.waitForTimeout(4000);   /* 開局的模型下載與相位切換都過去，量的是穩定畫面上的點擊 */
+  return { page, errors, W: size[0], H: size[1], close: () => ctx.close() };
+}
+/* 推到主鈕文字符合為止（用 el.click()：沒有座標的不可信事件，相位閘不武裝也不吞）。 */
+async function driveTo(page, re, tag) {
+  for (let i = 0; i < 900; i++) {
+    const hit = await page.evaluate((src) => {
+      const b = document.getElementById('mainbtn');
+      if (b && !b.disabled && new RegExp(src).test(b.textContent)) return true;
+      if (b && !b.disabled && document.getElementById('modal').style.display !== 'flex') b.click();
+      return false;
+    }, re.source);
+    if (hit) return;
+    await page.waitForTimeout(30);
+  }
+  throw new Error(`${tag}：主鈕一直沒有變成 ${re}`);
+}
+const tap = (page, [x, y]) => page.touchscreen.tap(x, y);
+async function pointOf(page, sel, fx = 0.5, fy = 0.5) {
+  const r = await page.locator(sel).first().boundingBox();
+  assert.ok(r, `找不到 ${sel}`);
+  return [Math.round(r.x + r.width * fx), Math.round(r.y + r.height * fy)];
+}
+/* 視窗最後一顆「只做 closeModal()」的鈕：捲進眼前、回中心點與那一點底下（關掉之後）的托盤格。 */
+async function closePoint(page) {
+  await page.evaluate(() => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => (b.getAttribute('onclick') || '') === 'closeModal()'); bs[bs.length - 1]?.scrollIntoView({ block: 'nearest' }); });
+  await page.waitForTimeout(200);
+  const r = await page.evaluate(() => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => (b.getAttribute('onclick') || '') === 'closeModal()'); const b = bs[bs.length - 1]; if (!b) return null; const q = b.getBoundingClientRect(); return [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)]; });
+  assert.ok(r, '視窗裡找不到關閉鈕');
+  return r;
+}
+const trayAt = (page, [x, y]) => page.evaluate(([px, py]) => { const T = window.__yaoshi3d?.tray; if (!T) return -1; try { return T.hitTest((px / innerWidth) * 2 - 1, -((py / innerHeight) * 2 - 1)); } catch (e) { return -1; } }, [x, y]);
+async function reset(page) {
+  await page.evaluate(() => { if (document.getElementById('modal').style.display === 'flex') closeModal(); });
+  await page.waitForTimeout(700);   /* 上一輪武裝的守衛（不論哪一種）都過期 */
+  await page.evaluate(() => { window.__clk.length = 0; window.__bub.length = 0; window.__calls.length = 0; });
+}
+const snap = (page) => page.evaluate(() => ({ calls: window.__calls.slice(), clk: window.__clk.slice(), bub: window.__bub.slice(),
+  modal: document.getElementById('modal').style.display === 'flex', h2: document.querySelector('#modalbox h2')?.textContent || '',
+  mark0: window.__yaoshi.S.marks ? window.__yaoshi.S.marks[0] : undefined, sheet: (() => { const s = document.getElementById('sheet'); return !!(s && s.style.display && s.style.display !== 'none'); })() }));
+/* 量測前提：第 i、j 下點擊（window capture 的順序）都派送了，而且按下時刻相隔 < 500ms，才算量在守衛視窗裡。 */
+function gapOk(r, i, j, tag) {
+  assert.ok(r.clk.length > j, `${tag}：量測沒成立——只收到 ${r.clk.length} 下點擊（${JSON.stringify(r.clk)}）`);
+  const dt = Math.round(r.clk[j].t - r.clk[i].t);
+  assert.ok(dt < GUARD, `${tag}：量測沒成立——兩下相隔 ${dt}ms，不在 ${GUARD}ms 的守衛視窗裡`);
+  return dt;
+}
+const ACTION = /^(pickMark|openSheet|showBag|showRoleInfo|openHelp|toggleSfx|incBump|giveUpLegend|toggleFpsDiag)\(/;
+const OPENERS = {
+  '別人的袋子': { sel: '#seat1', fx: 0.35, fy: 0.6, call: 'showBag(1)' },
+  '角色卡 ⓘ': { sel: '#seat1 .roleInfoBtn', call: 'showRoleInfo(1)' },
+  '規則頁': { sel: '#helpBtn', call: 'openHelp()' },
+  '自己的袋子': { sel: '#south button[onclick="showBag(0)"]', call: 'showBag(0)' },
+};
+async function openBy(page, name) {
+  const op = OPENERS[name];
+  await tap(page, await pointOf(page, op.sel, op.fx, op.fy));
+  await page.waitForTimeout(900);
+  const ok = await page.evaluate((c) => document.getElementById('modal').style.display === 'flex' && window.__calls.includes(c), op.call);
+  assert.ok(ok, `${name}：點了打不開（${JSON.stringify(await page.evaluate(() => window.__calls))}）`);
+}
+const SIZES = [[844, 390], [667, 375]];
+
+for (const size of SIZES) {
+  test(`V1 ${size.join('×')} 關掉只能看的視窗後 150／250／350ms 點座位 2，要打開座位 2 的袋子`, { timeout: 240000 }, async () => {
+    const s = await open({ size });
+    try {
+      const miss = [], seen = [];
+      /* 間隔只到 350ms：點擊本身（觸控派送＋往返）約 40–70ms，450ms 那格實測會被撐到 501／519ms、落到守衛視窗外（基準第一次跑） */
+      const seat2 = await pointOf(s.page, '#seat2', 0.35, 0.6);   /* 先算好，兩下之間不再多一次往返 */
+      for (const name of Object.keys(OPENERS)) for (const how of ['按關閉鈕', '點背景']) for (const g of [150, 250, 350]) {
+        const tag = `${name}／${how}／${g}ms`;
+        await reset(s.page);
+        await openBy(s.page, name);
+        const cp = how === '按關閉鈕' ? await closePoint(s.page) : [s.W - 10, Math.round(s.H / 2)];
+        await tap(s.page, cp);
+        await s.page.waitForTimeout(g);
+        await tap(s.page, seat2);
+        await s.page.waitForTimeout(700);
+        const r = await snap(s.page);
+        assert.ok(r.calls.includes('closeModal()'), `${tag}：量測沒成立——關閉那一下沒有關掉視窗（${JSON.stringify(r.calls)}）`);
+        const dt = gapOk(r, 1, 2, tag);
+        seen.push(`${tag}=${dt}ms`);
+        if (!r.calls.includes('showBag(2)')) miss.push(`${tag}（實際相隔 ${dt}ms）`);
+      }
+      console.log(`V1 ${size.join('×')} 實際間隔`, seen.join(' '));
+      assert.deepEqual(miss, [], `關掉之後點座位 2 被吞了：${miss.join('、')}`);
+      assert.deepEqual(s.errors, []);
+    } finally { await s.close(); }
+  });
+
+  test(`V2 ${size.join('×')} 連按關閉鈕兩下（120ms）：第二下照樣被吞，不得點到關閉鈕底下的東西`, { timeout: 120000 }, async () => {
+    const s = await open({ size });
+    try {
+      const bad = [];
+      for (const name of Object.keys(OPENERS)) {
+        await reset(s.page);
+        await openBy(s.page, name);
+        const cp = await closePoint(s.page);
+        await tap(s.page, cp);
+        const under = await trayAt(s.page, cp);
+        await s.page.waitForTimeout(120);
+        await tap(s.page, cp);
+        await s.page.waitForTimeout(700);
+        const r = await snap(s.page);
+        assert.ok(r.calls.includes('closeModal()'), `${name}：量測沒成立——第一下沒有關掉視窗`);
+        const dt = gapOk(r, 1, 2, name);
+        const after = r.calls.slice(r.calls.indexOf('closeModal()') + 1).filter((c) => ACTION.test(c));
+        const leaked = r.bub.filter((b) => b.t >= r.clk[2].t).length;
+        console.log(`V2 ${size.join('×')} ${name}：關閉點 ${cp} 底下托盤格 ${under}、相隔 ${dt}ms、之後的動作 ${JSON.stringify(after)}、第二下送達 ${leaked}、盯上 ${r.mark0}`);
+        if (name === '別人的袋子') assert.ok(under >= 0, `量測沒成立：別人袋子的關閉鈕底下不是托盤格（${under}），這一條守的危險不在場`);
+        if (after.length || leaked || r.mark0 !== undefined) bad.push(`${name}：動作 ${JSON.stringify(after)}、第二下送達 ${leaked}、盯上 ${r.mark0}`);
+      }
+      assert.deepEqual(bad, [], `連按關閉鈕的第二下沒被擋住：${bad.join('；')}`);
+      assert.deepEqual(s.errors, []);
+    } finally { await s.close(); }
+  });
+
+  test(`V2b ${size.join('×')} 點背景關掉別人的袋子、落點底下是托盤格：連點兩下（120ms）不得盯上`, { timeout: 90000 }, async () => {
+    const s = await open({ size });
+    try {
+      await reset(s.page);
+      await openBy(s.page, '別人的袋子');
+      const p = await s.page.evaluate(() => {
+        const mb = document.getElementById('modalbox').getBoundingClientRect(), W = innerWidth, H = innerHeight, T = window.__yaoshi3d.tray;
+        for (let y = H - 8; y > 0; y -= 6) for (let x = 8; x < W; x += 6) {
+          if (x >= mb.left - 4 && x <= mb.right + 4 && y >= mb.top - 4 && y <= mb.bottom + 4) continue;
+          let i = -1; try { i = T.hitTest((x / W) * 2 - 1, -((y / H) * 2 - 1)); } catch (e) { /* 量不到 */ }
+          if (i >= 0 && document.elementFromPoint(x, y) === document.getElementById('modal')) return [x, y, i];
+        }
+        return null;
+      });
+      assert.ok(p, '量測沒成立：找不到落在背景上、底下是托盤格的點');
+      await tap(s.page, p);
+      await s.page.waitForTimeout(120);
+      await tap(s.page, p);
+      await s.page.waitForTimeout(700);
+      const r = await snap(s.page);
+      assert.ok(r.calls.includes('closeModal()'), '量測沒成立：第一下沒有關掉視窗');
+      const dt = gapOk(r, 1, 2, 'V2b');
+      console.log(`V2b ${size.join('×')} 落點 ${p}、相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}、盯上 ${r.mark0}`);
+      assert.equal(r.mark0, undefined, `第二下替玩家盯上了托盤 ${p[2]} 號格`);
+      assert.deepEqual(r.calls.filter((c) => /^(pickMark|openSheet)\(/.test(c)), []);
+      assert.deepEqual(s.errors, []);
+    } finally { await s.close(); }
+  });
+
+  test(`V3 ${size.join('×')} 「附近」的邊界：關閉點正上方 0／60／90px 吞、110／160px 放行`, { timeout: 120000 }, async () => {
+    const s = await open({ size, query: '?tray3d=0' });
+    try {
+      const got = {};
+      for (const d of [0, 60, 90, 110, 160]) {
+        await reset(s.page);
+        await openBy(s.page, '別人的袋子');
+        const cp = await closePoint(s.page);
+        await tap(s.page, cp);
+        await s.page.waitForTimeout(150);
+        const q = [cp[0], cp[1] - d];
+        const under = await s.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className || e.tagName) : null; }, q);
+        await tap(s.page, q);
+        await s.page.waitForTimeout(700);
+        const r = await snap(s.page);
+        assert.ok(r.calls.includes('closeModal()'), `${d}px：量測沒成立——關閉那一下沒有關掉視窗`);
+        const dt = gapOk(r, 1, 2, `${d}px`);
+        got[d] = r.bub.some((b) => b.t >= r.clk[2].t) ? '放行' : '吞';
+        console.log(`V3 ${size.join('×')} ${d}px：落點 ${q} 底下 ${under}、相隔 ${dt}ms → ${got[d]}`);
+      }
+      assert.deepEqual(got, { 0: '吞', 60: '吞', 90: '吞', 110: '放行', 160: '放行' });
+      assert.deepEqual(s.errors, []);
+    } finally { await s.close(); }
+  });
+}
+
+test('V2c 844×390 出價頁：點背景關掉別人的袋子、落點底下是托盤格，連點兩下（120ms）不得打開出價視窗', { timeout: 90000 }, async () => {
+  const s = await open({ size: [844, 390] });
+  try {
+    await driveTo(s.page, /蓋牌/, 'V2c 出價頁');
+    await s.page.waitForTimeout(1500);
+    await reset(s.page);
+    await openBy(s.page, '別人的袋子');
+    const p = await s.page.evaluate(() => {
+      const mb = document.getElementById('modalbox').getBoundingClientRect(), W = innerWidth, H = innerHeight, T = window.__yaoshi3d.tray;
+      for (let y = H - 8; y > 0; y -= 6) for (let x = 8; x < W; x += 6) {
+        if (x >= mb.left - 4 && x <= mb.right + 4 && y >= mb.top - 4 && y <= mb.bottom + 4) continue;
+        let i = -1; try { i = T.hitTest((x / W) * 2 - 1, -((y / H) * 2 - 1)); } catch (e) { /* 量不到 */ }
+        if (i >= 0 && document.elementFromPoint(x, y) === document.getElementById('modal')) return [x, y, i];
+      }
+      return null;
+    });
+    assert.ok(p, '量測沒成立：找不到落在背景上、底下是托盤格的點');
+    assert.equal(await s.page.evaluate(() => TRAY_PHASE), 'bid', '量測沒成立：不在出價頁');
+    await tap(s.page, p);
+    await s.page.waitForTimeout(120);
+    await tap(s.page, p);
+    await s.page.waitForTimeout(700);
+    const r = await snap(s.page);
+    assert.ok(r.calls.includes('closeModal()'), '量測沒成立：第一下沒有關掉視窗');
+    const dt = gapOk(r, 1, 2, 'V2c');
+    console.log(`V2c 落點 ${p}、相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}、出價視窗 ${r.sheet}`);
+    assert.deepEqual(r.calls.filter((c) => /^openSheet\(/.test(c)), [], '第二下打開了出價視窗');
+    assert.equal(r.sheet, false);
+    assert.deepEqual(s.errors, []);
+  } finally { await s.close(); }
+});
+
+test('V4 844×390 自己袋子裡按「送神回天」不算關閉：150ms 後點背景照樣被吞、視窗還開著', { timeout: 90000 }, async () => {
+  const s = await open({ size: [844, 390] });
+  try {
+    await s.page.evaluate(() => { const me = window.__yaoshi.S.players[0]; me.bag.push({ ...LEGENDS[0], legend: true }); });
+    await reset(s.page);
+    await openBy(s.page, '自己的袋子');
+    await s.page.evaluate(() => document.querySelector('#modalbox .tithebtn')?.scrollIntoView({ block: 'nearest' }));
+    await s.page.waitForTimeout(200);
+    const tb = await s.page.evaluate(() => { const b = document.querySelector('#modalbox .tithebtn'); if (!b) return null; const q = b.getBoundingClientRect(); return [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)]; });
+    assert.ok(tb, '量測沒成立：自己的袋子沒有「送神回天」鈕');
+    await tap(s.page, tb);
+    await s.page.waitForTimeout(150);
+    await tap(s.page, [s.W - 10, Math.round(s.H / 2)]);
+    await s.page.waitForTimeout(700);
+    const r = await snap(s.page);
+    assert.equal(r.calls.filter((c) => /^giveUpLegend\(/.test(c)).length, 1, `量測沒成立：送神回天沒有按到一次（${JSON.stringify(r.calls)}）`);
+    const dt = gapOk(r, 1, 2, 'V4');
+    console.log(`V4 相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}、視窗 ${r.modal}`);
+    assert.equal(r.modal, true, '送神回天之後馬上點背景，視窗被關掉了（視窗裡的切換被當成關閉）');
+    assert.ok(!r.calls.slice(r.calls.findIndex((c) => /^giveUpLegend\(/.test(c)) + 1).includes('closeModal()'));
+    assert.deepEqual(s.errors, []);
+  } finally { await s.close(); }
+});
+
+test('V5 844×390 用鍵盤（Enter）關掉別人的袋子：沒有座標，照舊整層吸收，150ms 後點座位 2 被吞', { timeout: 90000 }, async () => {
+  const s = await open({ size: [844, 390] });
+  try {
+    await reset(s.page);
+    await openBy(s.page, '別人的袋子');
+    await s.page.evaluate(() => { const bs = [...document.querySelectorAll('#modalbox button')].filter((b) => (b.getAttribute('onclick') || '') === 'closeModal()'); bs[bs.length - 1].focus(); });
+    await s.page.keyboard.press('Enter');
+    await s.page.waitForTimeout(150);
+    await tap(s.page, await pointOf(s.page, '#seat2', 0.35, 0.6));
+    await s.page.waitForTimeout(700);
+    const r = await snap(s.page);
+    assert.ok(r.calls.includes('closeModal()'), `量測沒成立：Enter 沒有關掉視窗（${JSON.stringify(r.calls)}）`);
+    assert.ok(r.clk[1] && r.clk[1].x === 0 && r.clk[1].y === 0, `量測沒成立：關閉那一下不是沒有座標的鍵盤點擊（${JSON.stringify(r.clk[1])}）`);
+    const dt = gapOk(r, 1, 2, 'V5');
+    console.log(`V5 相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}`);
+    assert.ok(!r.calls.includes('showBag(2)'), '鍵盤關掉之後 150ms 點座位 2 被放行了');
+    assert.deepEqual(s.errors, []);
+  } finally { await s.close(); }
+});
+
+test('V6 844×390 供奉詢問（不是只能看的視窗）：按「要，繼續供奉」後 150ms 點座位 2 照舊被吞', { timeout: 90000 }, async () => {
+  const s = await open({ size: [844, 390] });
+  try {
+    await driveTo(s.page, /蓋牌/, 'V6 出價頁');
+    await s.page.waitForTimeout(1500);
+    await reset(s.page);
+    await s.page.evaluate(() => {
+      const S = window.__yaoshi.S, item = { ...LEGENDS[0], legend: true };
+      S.players[0].bag.push(item); S.titheAsk = [{ pid: 0, item: item.n }];
+      window.__titheDone = 0; showTitheAsk().then(() => { window.__titheDone = 1; });
+    });
+    await s.page.waitForTimeout(900);
+    await tap(s.page, await pointOf(s.page, '#titheKeep'));
+    await s.page.waitForTimeout(150);
+    await tap(s.page, await pointOf(s.page, '#seat2', 0.35, 0.6));
+    await s.page.waitForTimeout(700);
+    const r = await snap(s.page);
+    const done = await s.page.evaluate(() => window.__titheDone);
+    assert.equal(done, 1, '量測沒成立：「要，繼續供奉」沒有收掉詢問');
+    const dt = gapOk(r, 0, 1, 'V6');
+    console.log(`V6 相隔 ${dt}ms、呼叫 ${JSON.stringify(r.calls)}`);
+    assert.ok(!r.calls.includes('showBag(2)'), '供奉詢問收掉之後 150ms 點座位 2 被放行了（非只能看的視窗也被放寬）');
+    assert.deepEqual(s.errors, []);
+  } finally { await s.close(); }
+});
+
+test('V7 「只能看」的標記只出現在五個視窗：showBag 三種、showRoleInfo、openHelp', () => {
+  const src = fs.readFileSync(path.join(SRV_ROOT, 'index.html'), 'utf8');
+  const fnStarts = [...src.matchAll(/\nfunction ([A-Za-z0-9_$]+)\s*\(/g)].map((m) => [m.index, m[1]]);
+  /* 任何 HTML 標籤上的 data-viewonly（不限 h2；標籤與屬性要在同一行——註解與判斷式裡的字面不算），歸屬到它所在的頂層函式 */
+  const owners = [...src.matchAll(/<[a-zA-Z][a-zA-Z0-9]*\b[^<>\n]*\bdata-viewonly\b/g)].map((m) => { let o = null; for (const [i, n] of fnStarts) { if (i < m.index) o = n; else break; } return o; });
+  assert.deepEqual(owners.sort(), ['openHelp', 'showBag', 'showBag', 'showBag', 'showRoleInfo'], `data-viewonly 出現在：${JSON.stringify(owners)}`);
+});

