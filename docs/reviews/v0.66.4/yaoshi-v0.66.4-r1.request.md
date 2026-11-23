review-id: yaoshi-v0.66.4-r1

全部用繁體中文回答，輸出必須符合給你的 JSON schema。JSON 的 `review_id` 欄位填 `yaoshi-v0.66.4-r1`，`summary` 的第一行照抄 `review-id: yaoshi-v0.66.4-r1`。

## 你的角色
你是妖市（瀏覽器 3D 拍賣卡牌遊戲，靜態 HTML／JS，`index.html` 主檔、`js/` 是 3D 層）的獨立技術與規則審查者。你沒參與實作。你的任務是**找出會出錯的情境**，不是確認看起來沒事。

## 你手上有什麼、能做什麼
- 工作目錄是受審 commit `ae2a56a5` 的唯讀快照，含 `docs/`，**沒有 .git**，也沒有基準版的檔案。
- 要審的 diff（`14f13664..ae2a56a5`，只含規則面路徑；規則面的定義見快照 `CLAUDE.md` 開頭第 7 行）已附在本要求末段「diff」節，**不必也無法自己重算**。若 diff 看起來被截斷，在 summary 寫明，並直接讀快照裡的檔案補完。
- 你可以讀任何檔案、跑不寫檔的唯讀指令（例如 `grep`、`node -e` 讀檔）。環境是唯讀的：不要跑瀏覽器測試、不要跑會寫暫存檔的工具（例如 `tests/tools/trace-eq.mjs`）。
- 修正前的行為只能從 diff 的刪除行與靜態推論得知；iOS Safari 的實機行為也只能靜態推論。**沒辦法實際驗證的判斷，請在 finding 的 `detail` 開頭寫「（推測）」，並在對應 coverage 的 `note` 說明。**
- 本版宣稱做了什麼、驗收條件是什麼：docs/acceptance/2026-11-23-loader-tests.md、docs/acceptance/2026-11-23-gpu-launch.md、docs/acceptance/2026-11-23-v0.66.4.md（在快照裡）。請拿驗收條件對照實作，條件本身有漏洞也要指出。

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
diff --git a/.gitattributes b/.gitattributes
index 963f8130..437eaf74 100644
--- a/.gitattributes
+++ b/.gitattributes
@@ -41,3 +41,6 @@ docs/experiments/2026-09-28-appraise-c/signoff/signoff-west.png -text
 docs/experiments/2026-09-28-appraise-c/cloud-reference/b-east.png -text
 docs/experiments/2026-09-28-appraise-c/cloud-reference/b-west.png -text
 docs/experiments/2026-09-28-appraise-c/cloud-reference/NOTES.md -text
+
+# bash 腳本在 Windows 取出也要是 LF
+tools/gated.sh text eol=lf
diff --git a/index.html b/index.html
index d23ad2a8..0684be70 100644
--- a/index.html
+++ b/index.html
@@ -10,7 +10,7 @@
 <meta name="mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
-<link rel="stylesheet" href="assets/theme.css?v=0.66.3"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
+<link rel="stylesheet" href="assets/theme.css?v=0.66.4"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
 <style>
 /* ===== 佔位美術：正式版整批替換，邏輯層不得依賴任何樣式 =====
    ===== 美術層（2026-09-03 起）：色彩／字型變數與動畫 keyframes 在 assets/theme.css，
@@ -1235,7 +1235,7 @@ h2{font-size:16px;color:var(--gold);margin:2px 0 8px}
   .asc-fold{background:none;border:0;border-bottom:1px dashed var(--asc-zhu);font-size:.92em}
   .asc-fold::after{content:" ▾";font-weight:700}
 </style>
-<link rel="stylesheet" href="assets/safe-area.css?v=0.66.3"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
+<link rel="stylesheet" href="assets/safe-area.css?v=0.66.4"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
   不照 sfx／renderer 用 RELEASE_VERSION 字串拼接：這個 <link> 在 <head>、早於主 script，那時 RELEASE_VERSION 還沒定義；
   挪到主 script 之後注入會先畫一幀沒套這份樣式的畫面，而主 script 前又不能多開一支 script 標籤（tests/tools/load.mjs 只抓第一個）。 -->
 <script type="importmap">
@@ -2948,11 +2948,11 @@ function chainHintHTML(p,it){
 /* ?sim=1 進平衡模擬器工具頁，不影響正常遊戲頁（不自動執行、不動任何既有流程） */
 /* ===== 版本字串單一事實來源（2026-09-02 使用者裁定）：每次改版只改下面這一行，<title> 與首頁那行都由此帶出；
    使用者以首頁字串判斷是否已推上線；線上檢查用 grep 'VERSION="' ===== */
-const VERSION="0.66.3", VERSION_NOTE="0.66.3：法寶模型下載的內部處理——換夜後不再留著用不到的等待。純效能，畫面與結算不變。0.66.2：網路慢時，法寶模型下載到一半停住，約 20 秒後會另外再下載一份（原本那份不中斷，哪份先下載完就用哪份；原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；還沒開始下載的模型最多排隊 45 秒就重新要一次；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；牌桌某一格換成別件法寶後，前一件才載入失敗時，不會再把新的那一格當成已經擺好。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
+const VERSION="0.66.4", VERSION_NOTE="0.66.4：不是請神夜、也沒有人燒香的晚上，開標後直接「開戰」，不用先按一次沒有結果可看的「請神」；規則頁（右上 ？）的音訊診斷與效能資訊移到最下面；點別人的座位看袋子，公開戰力改成和座位上一樣的「幾隻・血多少」。結算、數值不變。0.66.3：法寶模型下載的內部處理——換夜後不再留著用不到的等待。純效能，畫面與結算不變。0.66.2：網路慢時，法寶模型下載到一半停住，約 20 秒後會另外再下載一份（原本那份不中斷，哪份先下載完就用哪份；原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；還沒開始下載的模型最多排隊 45 秒就重新要一次；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；牌桌某一格換成別件法寶後，前一件才載入失敗時，不會再把新的那一格當成已經擺好。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
 /* 每次部署遞增此版號；首頁顯示與 asset query 都讀它，讓玩家可核實公開頁。 */
-const RELEASE_VERSION="0.66.3";
+const RELEASE_VERSION="0.66.4";
 /* ===== 音訊診斷與喚醒（2026-09-03，使用者回報 v0.27 iPhone 整個沒聲音、🔇 與靜音撥桿都排除）=====
-   我沒有 iPhone 可重現，所以把每一層的狀態印在規則頁最上面，讓使用者唸給我聽：
+   我沒有 iPhone 可重現，所以把每一層的狀態印在規則頁最下面（v0.66.4 M5 由最上面搬過去），讓使用者唸給我聽：
    ctx 有沒有／state（iOS 特有 "interrupted"）／取樣率／音效開關／sfx.js 有沒有載到（聲部數）／最後一次 play 與例外／
    音樂層 scene、playing、缺曲表。同時加防護：任何觸控或點擊、以及切回前景時，ctx 不是 running 就 resume()——
    iOS 在來電、Siri、切 app 後常把 ctx 留在 interrupted，之前沒有任何地方會再喚醒它。 */
@@ -4996,6 +4996,19 @@ function awardLegend(out,win,idx){
   }
   return sh;
 }
+/* 今夜的香火段有沒有東西可看（v0.66.4 M2）：請神夜一律有；其餘夜看有沒有人真的會燒到香。
+   判斷與 resolveShrines 的收香同一套（還有沒有尊、一人一尊、神王命自動進香、沒封的座位問 aiIncense、夾 INC_MAX 與 incCap）。
+   ★只給成交總覽的主鈕挑字用★：純讀取、零亂數；真正的結算仍是 resolveShrines。 */
+function shrineHasNews(){
+  if(isShrineNight(S.round)) return true;
+  if(!openShrines().length) return false;
+  return S.players.some(p=>{
+    if(!p.alive||hasLegend(p)) return false;
+    if(hasFlag(p,"shrineAutoIncense")) return true;
+    const inc=S.incense[p.id]===undefined?aiIncense(p):S.incense[p.id];
+    return !!inc&&Math.min(CFG.INC_MAX,inc.amt|0,incCap(p))>0;
+  });
+}
 /* 請神一夜（提案 §二 1／3／4／5）。opts.interactive＝真人得主要跳選尊視窗（只有 startShrine 會傳）；
    三條 headless 迴圈一律不傳 ⇒ 走 AI 規則，行為與 2.0 一樣是「一次呼叫做完」。 */
 function resolveShrines(opts){
@@ -6880,7 +6893,6 @@ function openHelp(){
     /* 關閉時 DOM 沒有 #fpsDiag，取樣器與對決監聽也移除。 */
     +(FPS_ON?`<div id="fpsDiag" style="font-size:11px;color:var(--dim);line-height:1.6;word-break:break-all;border:1px dashed var(--line);padding:4px 6px;border-radius:6px;margin-top:4px">📈 fps 診斷：${fpsDiagText()}</div>`:"");
   $("modalbox").innerHTML=`<h2>？ 妖市規則</h2><div style="text-align:left">
-    ${diag}
     ${sec("🏮 目標",`壽命＝錢包＋血條。撐過 ${CFG.ROUNDS} 夜，活到最後或天亮時壽命最高者勝。壽命歸零出局（夜末心願回血可救回）。${CFG.NIGHT_REGEN>0?`每夜天明，存活者回 ${CFG.NIGHT_REGEN} 壽命。`:""}`)}
     ${sec("🌙 每夜流程",`①抽今夜心願（私有）→${CFG.MARK_ON?"②盯上宣告（公開釘一件"+(CFG.MARK_TAX>0?"，盯了沒出價付 "+CFG.MARK_TAX+" 虛張稅":"")+"）→③":"②"}妖市出價→開標→結算戰→夜末結算（詛咒侵蝕、心願判定、貸款攤還${CFG.NIGHT_REGEN>0?"、天明回血":""}）。`)}
     ${CFG.MARK_ON?sec("👁 盯上宣告",`封標前每人公開釘一件拍品。它不改任何數字，只改對手的想法：怯場型的 AI 會避開被盯的拍品、搶標型的反而更想搶、無視型不理。每個角色的反應寫在角色卡（ⓘ）。訣竅在盯哪一件：滿桌怯場型時盯你的小額側標，對手會讓路；滿桌搶標型時別盯側標，會被圍剿。${CFG.MARK_TAX>0?`盯了那件卻沒出價要付 ${CFG.MARK_TAX} 壽命。`:""}`):""}
@@ -6924,6 +6936,7 @@ function openHelp(){
     ${sec("🧧 法寶疊加規則",`每件非詛咒法寶都會召出自己的<b>紙紮部隊</b>，重複法寶也會增加部隊。同系法寶可觸發共鳴；招式依各隊規則發動。法寶的夜末、減傷等能力是否累加，請看各件效果說明。詛咒物不召喚部隊，各自效果按件數累加。`)}
     ${(S.chainsOff)?"":/* 擋點 G4 */sec("✦ 連鎖配方",Object.values(CHAINS).map(c=>`<div class="descRow"><b>${c.name}</b>：${c.requirements.map(ab=>POOL.find(x=>x.ab===ab)?.n||ab).join("＋")}。${c.desc||""}；材料不消耗、重複不疊加，缺件失效。</div>`).join(""))}
     ${nwDestinyHidden()?"":/* 擋點 G7 */sec("🌟 天命密函",`開局每席私抽一封，可抽到相同連鎖。只有你的指定配方在拍賣入袋時補齊，才公開覺醒；材料離袋後真效果暫停，補回便恢復。普通連鎖仍可由所有人使用。<br>${Object.entries(TRUE_DESTINY_RULES).map(([id,r])=>`<div class="descRow"><b>真・${CHAINS[id].name}</b>：白天 ${r.day}；夜戰 ${r.night}。</div>`).join("")}`)}
+    <div style="margin-top:14px">${diag}</div>
     </div>
     <button class="bigbtn" style="margin-top:12px;width:100%" onclick="closeModal()">關閉</button>`;
   $("modal").style.display="flex";
@@ -7902,7 +7915,9 @@ async function startReveal(){
   $("stage").innerHTML=revealPanelHTML(rv.reveal);
   pnlFitRails(); if(typeof requestAnimationFrame==="function") requestAnimationFrame(()=>requestAnimationFrame(pnlFitRails));
   /* 請神（第 4 卷）插在開標與開戰之間——三條迴圈的順序一致：resolveAuction → resolveShrines → resolveBattles */
-  if(CFG.LEGEND_ON&&S.shrines){ $("mainbtn").textContent="🕯️ 請神"; $("mainbtn").onclick=startShrine; }
+  if(CFG.LEGEND_ON&&S.shrines&&shrineHasNews()){ $("mainbtn").textContent="🕯️ 請神"; $("mainbtn").onclick=()=>startShrine(false); }
+  /* 安靜夜（v0.66.4 M2）：沒有結果可看的「請神」不出現；香火段照樣跑一次再開打（神王命沒地方進香時的 +1 命照給，和夜戰一起看到） */
+  else if(CFG.LEGEND_ON&&S.shrines){ $("mainbtn").textContent="開戰"; $("mainbtn").onclick=()=>startShrine(true); }
   else{ $("mainbtn").textContent="開戰"; $("mainbtn").onclick=startBattle; }
   $("mainbtn").disabled=false;
   $("skipbtn").style.display="none";
@@ -7943,7 +7958,7 @@ function showLegendPick(pend){
 }
 /* 請神結算演出（純呈現）：結算本身在 resolveShrines／finishShrines，這裡只把它回傳的東西攤開來給人看。
    香火是公開資訊，所以四家燒了多少、誰請走了誰全都照實顯示。 */
-async function startShrine(){
+async function startShrine(quiet){
   $("mainbtn").disabled=true;
   SKIP=false; $("skipbtn").style.display="block";
   /* interactive＝真人得主要跳選尊視窗；AI 得主與 headless 三條迴圈都不傳，走引擎的 AI 規則 */
@@ -7975,6 +7990,7 @@ async function startShrine(){
     renderSeats();
     await sleep(CFG.T*0.5);
   }
+  else if(quiet){ startBattle(); return; }   /* 安靜夜：沒有結果要攤開，同一下直接開打；停在總覽時狀態變了（有結果）就走上面那段 */
   SKIP=false; $("skipbtn").style.display="none";
   $("mainbtn").textContent="開戰";
   $("mainbtn").disabled=false;
@@ -9151,7 +9167,7 @@ function showBag(pid){
   }
   const p=S.players[pid];
   if(!canViewPrivateBag(pid)){
-    $("modalbox").innerHTML=`<h2>${DIRS[pid]}家・${p.name}</h2>${destinyLetterHTML(p)}<p class="mut">袋中持有只供本人私下查看。</p><p>公開戰力：${Math.round(power(p))}</p><button class="bigbtn stickyClose" style="width:100%" onclick="closeModal()">關閉</button>`;
+    $("modalbox").innerHTML=`<h2>${DIRS[pid]}家・${p.name}</h2>${destinyLetterHTML(p)}<p class="mut">袋中持有只供本人私下查看。</p><p style="margin-bottom:12px">公開戰力：${CFG.PAPERWAR_ON?paperForceText(p):Math.round(power(p))}</p><button class="bigbtn stickyClose" style="width:100%" onclick="closeModal()">關閉</button>`;
     $("modal").style.display="flex";
     return;
   }
@@ -10073,7 +10089,7 @@ window.__yaoshi={ newGame, makeState, simulate, trace, mulberry32, pwCurseFeedba
   /* 傳說三尊「請神 3.0 香火池」測試出口：資料表、結算、得主自選、回天、AI 啟發式、局末結清 */
   LEGENDS, resolveShrines, finishShrines, settleShrinesEnd, settleTithe, releaseLegend, aiIncense, incAiOf, shrineReward, mainFaction,
   shrineWindOrder, shrineWinner, aiPickShrine, awardLegend, openShrines, isShrineNight, shrineNightsLeft, lastShrineNight,
-  hasLegend, windPid, incCap, unitRow, unitRowText, bagPreviewHTML,
+  hasLegend, windPid, incCap, shrineHasNews, unitRow, unitRowText, bagPreviewHTML,
   /* 地基 2：平衡模擬器＋優勢策略窮舉器（見 docs/GAME_DESIGN.md 六之四、docs/ARCH_SPEC.md） */
   runMany, analyzeEvent, playPolicyGame, statsToMarkdown, POLICIES, bleed, withBleed,
   drawWishes, judgeWish, wishBarHTML, /* 心願系統測試出口 */
diff --git a/tests/anim-slow-page.test.mjs b/tests/anim-slow-page.test.mjs
index 7688a2f7..d53bfef8 100644
--- a/tests/anim-slow-page.test.mjs
+++ b/tests/anim-slow-page.test.mjs
@@ -8,6 +8,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -19,7 +20,7 @@ test('?handslow／?grabslow：CFG 生效值＝原值×k、3D 讀同一份倍率
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const cases = [['', 1.5, 1.3], ['?handslow=1&grabslow=1', 1, 1], ['?handslow=2', 2, 1.3], ['?grabslow=2', 1.5, 2], ['?handslow=2&grabslow=1.5', 2, 1.5], ['?handslow=0&grabslow=0', 1.5, 1.3], ['?handslow=abc&grabslow=abc', 1.5, 1.3], ['?handslow=99&grabslow=99', 1.5, 1.3], ['?handslow=&grabslow=', 1.5, 1.3], ['?handslow=3', 3, 1.3]];
     for (const [q, kh, kg] of cases) {
diff --git a/tests/browser-launch-scan.test.mjs b/tests/browser-launch-scan.test.mjs
new file mode 100644
index 00000000..54cfd165
--- /dev/null
+++ b/tests/browser-launch-scan.test.mjs
@@ -0,0 +1,130 @@
+// 測試開瀏覽器一律走 tests/browser.mjs 的 launchGpu（WebGL 走顯示卡）。
+//   ① 掃 tests/*.test.mjs 與它們用到的 tests/、tools/ 內腳本，程式碼裡出現啟動／連線瀏覽器的字樣就紅。認的是字樣、不是某一種寫法。
+//      例外：測試檔註記「// 不走顯示卡：<理由>」（同一行尾端，或上一整行）；測試以外的腳本，啟動那一行的參數裡自己帶 d3d11。
+//      跟檔：測試檔裡任何寫到的腳本路徑都跟（import、變數載入、子程序、只寫檔名都算）；其他腳本只跟含 import／from／require／new URL 的那幾行。
+//      註解以外的文字（字串、區塊註解）提到那幾個字被誤擋時，換個說法即可。
+//   ② browser.mjs 只准有那一行啟動，逐字相同（要改旗標就連這裡一起改）。③ 判準正反例 ④ 跟檔正反例（治具樹）。
+//   ⑤ launchGpu 開出來的頁面，WebGL 繪圖器不是 CPU 模擬（只在 Windows 驗：旗標是 D3D11）。
+// 沒涵蓋：字串拼出來的路徑、省略副檔名的 require、測試以外的腳本把路徑寫在別行或再開子程序叫的腳本、playwright 以外的套件、直接執行瀏覽器程式。
+// 環境：YAOSHI_PW_ROOT（含 node_modules/playwright）。
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import fs from 'node:fs';
+import os from 'node:os';
+import path from 'node:path';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
+
+const SELF = fileURLToPath(import.meta.url), HERE = path.dirname(SELF), ROOT = path.join(HERE, '..');
+const HELPER = path.join(HERE, 'browser.mjs');
+const rel = (p, root = ROOT) => path.relative(path.join(root, 'tests'), p).split(path.sep).join('/');
+const noExt = (s) => s.replace(/\.\w+$/, '');
+const L = 'lau' + 'nch', C = 'con' + 'nect'; // 拆開寫：這支檔自己也在被掃的範圍內
+const TOKEN = new RegExp(String.raw`\b${L}(?:PersistentContext|Server)?\b|\b${C}OverCDP\b|\b(?:chromium|firefox|webkit)\.${C}\b`);
+const TOOL_GPU = new RegExp(String.raw`\.${L}\(\{\s*args:\s*\[[^\]]*'--use-angle=d3d11'[^\]]*\]\s*\}\)`);
+const NOTE = /\/\/\s*不走顯示卡[:：]\s*\S.{5,}$/;
+const HELPER_LINE = `export const launchGpu = (chromium) => chromium.${L}({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });`;
+// 不帶旗標、但只有右邊那支測試提到，而且它只測「參數被拒」、沒走到開瀏覽器
+const KNOWN = new Map([['tools/market-card-readability', 'tool-options.test.mjs']]);
+
+function violations(src, isTest = true) {
+  const lines = src.split(/\r?\n/).map((l) => l.trimEnd());
+  return lines.flatMap((l, i) => {
+    if (!TOKEN.test(l) || /^\s*\/\//.test(l)) return [];
+    if (isTest ? NOTE.test(l) || (/^\s*\/\//.test(lines[i - 1] || '') && NOTE.test(lines[i - 1])) : TOOL_GPU.test(l) && !/'--disable-gpu'/.test(l)) return [];
+    return [`${i + 1}: ${l.trim().slice(0, 120)}`];
+  });
+}
+
+/** 測試檔與它們用到的腳本 → Map<檔, 提到它的檔（相對 tests/）>。 */
+function closure(root = ROOT) {
+  const T = path.join(root, 'tests');
+  const inScope = (f) => [T, path.join(root, 'tools')].some((d) => f.startsWith(d + path.sep)) && !f.includes(`${path.sep}node_modules${path.sep}`) && fs.existsSync(f);
+  const byName = new Map();
+  for (const f of fs.readdirSync(T, { recursive: true })) if (/\.(?:mjs|cjs|js)$/.test(f)) byName.set(path.basename(f), [...(byName.get(path.basename(f)) || []), path.join(T, f)]);
+  const q = fs.readdirSync(T).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join(T, f)), refs = new Map(q.map((p) => [p, new Set()]));
+  while (q.length) {
+    const p = q.pop();
+    for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
+      const code = l.replace(/(^|\s)\/\/.*$/, '');
+      if (!p.endsWith('.test.mjs') && !/\b(?:import|require|createRequire|new URL)\b|\bfrom\s*['"`]/.test(code)) continue;
+      for (const m of code.match(/[\w.@/-]+\.(?:mjs|cjs|js)\b/g) || []) {
+        const n = m.replace(/^\/+/, '');
+        const hit = [path.dirname(p), T, path.join(T, 'tools'), root].map((b) => path.resolve(b, n)).find(inScope);
+        for (const t of hit ? [hit] : n.includes('/') ? [] : byName.get(n) || []) {
+          if (!refs.has(t)) { refs.set(t, new Set()); q.push(t); }
+          refs.get(t).add(rel(p, root));
+        }
+      }
+    }
+  }
+  return refs;
+}
+
+test('測試開瀏覽器一律走 launchGpu，直接啟動要有理由註記', (t) => {
+  const refs = closure(), files = [...refs.keys()];
+  const known = (p) => KNOWN.has(noExt(rel(p))) && [...refs.get(p)].every((r) => r === KNOWN.get(noExt(rel(p))));
+  const bad = files.filter((p) => p !== HELPER && !known(p))
+    .flatMap((p) => violations(fs.readFileSync(p, 'utf8'), p.endsWith('.test.mjs')).map((v) => `${rel(p)}:${v}`)).sort();
+  const tests = files.filter((p) => p.endsWith('.test.mjs') && p !== SELF).map((p) => [rel(p), fs.readFileSync(p, 'utf8')]);
+  const users = tests.filter(([, s]) => /\blaunchGpu\(/.test(s)), noted = tests.filter(([, s]) => s.split(/\r?\n/).some((l) => NOTE.test(l)));
+  t.diagnostic(`掃 ${files.length} 支檔，用 launchGpu 的測試 ${users.length} 支，有理由註記的 ${noted.length} 支：${noted.map(([f]) => f).join(' ')}`);
+  assert.deepEqual(bad, [], `${bad.length} 處直接啟動瀏覽器又沒有理由註記：\n${bad.join('\n')}`);
+  assert.ok(users.length > 0, '沒有任何測試在用 launchGpu，掃描沒行使到');
+  const got = new Set(files.map((p) => noExt(rel(p)))); // 真樹抽查：靜態 import、子程序、只寫檔名、變數載入、第二跳 import、第二跳 pathToFileURL
+  for (const n of ['tools/appraise-c-lib', 'tools/curse-cam-probe', 'tools/scene-shot', 'tools/l1e-event-action-adapter', 'tools/duel-drive', 'tools/grab-probe']) assert.ok(got.has(n), `跟檔漏了 ${n}`);
+});
+
+test('browser.mjs 只有一行啟動，逐字相同', () => {
+  const lines = fs.readFileSync(HELPER, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^\s*\/\//.test(l));
+  assert.deepEqual(lines, [HELPER_LINE], 'browser.mjs 的程式碼跟這裡記的不一樣（改旗標或加出口要連這條一起改）');
+});
+
+test('判準正反例', () => {
+  const bad = [`const b = await chromium.${L}();`, `const b = await loadChromium().${L}({ args: [] });`, `const { ${L}: go } = chromium;`, `await chromium['${L}']();`,
+    `await pw.chromium\n  .${L}({})`, `await chromium.${L}PersistentContext('x');`, `await chromium.${L}Server();`, `await chromium.${C}OverCDP('x');`, `await chromium.${C}('x');`,
+    `const b = await chromium.${L}({ args: ['--use-angle=d3d11'] });`, // 測試檔裡自己帶旗標也不行：一律走共用函式
+    `// 不走顯示卡：\nawait chromium.${L}();`, `// 不走顯示卡\nawait chromium.${L}();`, `// 不走顯示卡：xx        \nawait chromium.${L}();`, `/* x */ await chromium.${L}();`,
+    `// 不走顯示卡：理由寫在兩行之前\n\nawait chromium.${L}();`, `await a(); // 不走顯示卡：理由在上一行的行尾\nawait chromium.${L}();`];
+  for (const s of bad) assert.equal(violations(s).length, 1, `該擋沒擋：${s}`);
+  const ok = ['const browser = await launchGpu(chromium);', `// 說明：chromium.${L}() 會走 CPU`, `osc.${C}(gain);`,
+    `// 不走顯示卡：只在 CPU 繪圖下才量得到\nawait chromium.${L}();`, `await chromium.${L}(); // 不走顯示卡：只在 CPU 繪圖下才量得到`];
+  for (const s of ok) assert.deepEqual(violations(s), [], `不該擋卻擋：${s}`);
+  const toolBad = [`await chromium.${L}();`, `await chromium.${L}(); // 原本帶 '--use-angle=d3d11'`, `await chromium.${L}(cond ? { args: ['--use-angle=d3d11'] } : {});`,
+    `await chromium.${L}({ args: ['--use-angle=d3d11', '--disable-gpu'] });`, `// 不走顯示卡：工具檔不認這種註記\nawait chromium.${L}();`];
+  for (const s of toolBad) assert.equal(violations(s, false).length, 1, `工具檔該擋沒擋：${s}`);
+  for (const s of [`await chromium.${L}({ args: ['--use-gl=angle', '--use-angle=d3d11', '--disable-gpu-vsync'] });`, `const b=await chromium.${L}({args:['--use-angle=d3d11']});`]) assert.deepEqual(violations(s, false), [], `工具檔不該擋卻擋：${s}`);
+});
+
+test('跟檔正反例', () => {
+  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaoshi-scan-'));
+  try {
+    const put = (f, s) => { const p = path.join(dir, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
+    const yes = ['tests/zz-static.mjs', 'tests/tools/zz-var.mjs', 'tests/tools/zz-furl.mjs', 'tests/zz-plain.js', 'tests/zz-query.mjs', 'tests/zz-tick.mjs', 'tests/zz-url.mjs', 'tests/zz-req.cjs',
+      'tests/tools/zz-spawn.mjs', 'tests/tools/zz-slash.mjs', 'tests/tools/sub/zz-deep.mjs', 'tools/zz-out.mjs', 'tests/zz-hop2.mjs', 'tests/tools/zz-hop2b.mjs'];
+    const no = ['tests/tools/zz-comment.mjs', 'tests/tools/zz-usage.mjs', 'tools/node_modules/zz-dep.mjs', 'js/zz-product.js'];
+    for (const f of [...yes, ...no]) put(f, '');
+    put('tests/zz-a.test.mjs', ["import './zz-static.mjs';", "const v = './tools/zz-var.mjs';", 'await import(v);', "await import(pathToFileURL(path.join(ROOT, 'tests/tools/zz-furl.mjs')).href);",
+      "import './zz-plain.js';", "await import('./zz-query.mjs?v=1');", 'await import(`./zz-tick.mjs`);', "new URL('./zz-url.mjs', import.meta.url);", "createRequire(import.meta.url)('./zz-req.cjs');",
+      'spawn(process.execPath, [`${ROOT}/tests/tools/zz-spawn.mjs`]);', "spawn(process.execPath, [HERE + '/tools/zz-slash.mjs']);", "spawn(process.execPath, [path.join(HERE, 'tools', 'sub', 'zz-deep.mjs')]);",
+      "import '../tools/zz-out.mjs';", '// 說明：另見 ./tools/zz-comment.mjs', "import '../tools/node_modules/zz-dep.mjs';", "import '../js/zz-product.js';"].join('\n'));
+    put('tests/zz-static.mjs', ["export * from './zz-hop2.mjs';", "await import(pathToFileURL(path.join(HERE, 'tools/zz-hop2b.mjs')).href);", "const usage = 'node tests/tools/zz-usage.mjs';"].join('\n'));
+    const got = [...closure(dir).keys()].map((p) => path.relative(dir, p).split(path.sep).join('/')).sort();
+    assert.deepEqual(got, ['tests/zz-a.test.mjs', ...yes].sort());
+  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
+});
+
+test('launchGpu 開的頁面，WebGL 不是 CPU 模擬', { skip: process.platform === 'win32' ? false : 'D3D11 只在 Windows' }, async (t) => {
+  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
+  let pw; for (const c of cands) { try { pw = createRequire(c)('playwright'); break; } catch (e) { /* 下一個 */ } }
+  assert.ok(pw, '找不到 playwright（設 YAOSHI_PW_ROOT）');
+  const browser = await launchGpu(pw.chromium);
+  try {
+    const page = await browser.newPage();
+    const r = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return g ? String(g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER)) : null; });
+    t.diagnostic(`WebGL 繪圖器：${r}`);
+    assert.ok(r, '頁面開不出 WebGL2');
+    assert.doesNotMatch(r, /SwiftShader|llvmpipe|Basic Render/i, `WebGL 在 CPU 上模擬：${r}`);
+  } finally { await browser.close(); }
+});
diff --git a/tests/browser.mjs b/tests/browser.mjs
new file mode 100644
index 00000000..47f288d3
--- /dev/null
+++ b/tests/browser.mjs
@@ -0,0 +1,4 @@
+// 測試共用的瀏覽器啟動（不是測試檔；檔名不以 .test.mjs 結尾，node --test 不會單獨跑它）：WebGL 一律走顯示卡（D3D11）。
+// 不帶這三個旗標時，headless Chromium 用 CPU 模擬 WebGL（SwiftShader）：glb-loader 的 W＋W2 要 9.3 核，走顯示卡 1.6 核（2026-11-23 實測）。
+// tests/ 裡的測試一律用這支開瀏覽器；真的只在 CPU 繪圖下才成立的，直接啟動並在上一行寫「// 不走顯示卡：<理由>」（tests/browser-launch-scan.test.mjs 會掃）。
+export const launchGpu = (chromium) => chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
diff --git a/tests/bubble-dwell.test.mjs b/tests/bubble-dwell.test.mjs
index 28a71257..eddb9b00 100644
--- a/tests/bubble-dwell.test.mjs
+++ b/tests/bubble-dwell.test.mjs
@@ -11,6 +11,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -28,7 +29,7 @@ async function withPage(fn) {
   const { chromium } = loadPlaywright();
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tests/bubble-skin.test.mjs b/tests/bubble-skin.test.mjs
index 130e0a22..89a69006 100644
--- a/tests/bubble-skin.test.mjs
+++ b/tests/bubble-skin.test.mjs
@@ -13,6 +13,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -32,7 +33,7 @@ async function withPage(fn) {
   const { chromium } = loadPlaywright();
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tests/glb-loader.test.mjs b/tests/glb-loader.test.mjs
index 7f10471e..e69c6d17 100644
--- a/tests/glb-loader.test.mjs
+++ b/tests/glb-loader.test.mjs
@@ -21,6 +21,10 @@
 //   Codex yaoshi-v0.66.3-r2 後：M（r2 F1）五件原請求佔五條連線（這件收過本體後停住、約第 35 秒恢復，另四件斷續有資料），這件的重抓佔第六條、
 //   16 秒後才回 404，之後別件排隊 → 不得因為「別件在排隊」中止這件會恢復的原下載，那格要出現；
 //   W 加嚴（r2 F2）：第 2–4 次預載派發當下，不得有人對 bell 的共用下載承諾掛 then（catch／finally／Promise.all 也經過 then）。
+//   v0.66.3-r3 後（驗收 docs/acceptance/2026-11-23-loader-tests.md）：
+//   W 再加嚴（r3 F2）：第 2 次預載派發前到 45 秒放行後，整段都數 bell 共用下載承諾被讀 constructor 的次數（then／catch／finally／Promise.all／race／await
+//   每次都要讀，延到微任務或計時器才掛的也數得到）；W2（r3 F3）：明夜批次啟動後換世代 → 舊明夜批次的等待者要解除、
+//   明夜路徑也不得對共用承諾掛回呼、作廢的批次不得替舊明夜開新下載。
 //   送 r3 前預審（fresh agent 模擬的 M′）：K 六件原請求佔滿六條連線（這件收過本體後停住、約第 35 秒恢復，另五件斷續有資料），這件的重抓只能排隊、
 //   16 秒後才會回 404 → 名額不是全被停住的請求佔著（別件還在傳、遲早讓出），不得中止會恢復的原下載，那格要出現。
 // 時間一律用伺服器端（Node）的時鐘量，頁內校時影響不到量測。
@@ -32,6 +36,7 @@ import http from 'node:http';
 import path from 'node:path';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -177,6 +182,29 @@ const cf = (page, fn, ...args) => page.evaluate(async ({ fn, args }) => {
   if (typeof m[fn] !== 'function') throw new Error('creature-figures 沒有 ' + fn);
   return m[fn](...args);
 }, { fn, args });
+/** 數共用下載承諾被掛了幾次回呼（v0.66.3-r3 F2）：在承諾上放自有的 constructor 存取器——then／catch／finally／Promise.all／race／await
+ *  每次都要讀它，延到微任務或計時器才掛的也數得到。 */
+const watchShared = (page, url) => page.evaluate(async (u) => {
+  const s = [...document.scripts].find((x) => /\/js\/renderer\.js(\?|$)/.test(x.src));
+  const m = await import(new URL('creature-figures.js' + new URL(s.src).search, s.src).href);
+  const p = typeof m.glbShared === 'function' ? m.glbShared(u) : null;
+  if (!p) return false;
+  const sc = window.__subCnt = { p, n: 0, at: [] };
+  Object.defineProperty(p, 'constructor', { configurable: true, get() { sc.n++; if (sc.at.length < 3) sc.at.push(String(new Error().stack).split('\n').slice(2, 5).map((x) => x.trim()).join(' < ')); return Promise; } });
+  return true;
+}, url);
+/** 收次數、做正對照（延到微任務才掛的 then、await 各要數到 1 次），再拆掉計數。 */
+const readShared = (page) => page.evaluate(async () => {
+  const c = window.__subCnt; if (!c) return null;
+  const turn = () => new Promise((r) => setTimeout(r, 100));
+  const n = c.n, at = c.at.slice();
+  queueMicrotask(() => { c.p.then(() => {}, () => {}); }); await turn();
+  const ctlThen = c.n - n;
+  (async () => { try { await c.p; } catch (e) {} })(); await turn();
+  const ctlAwait = c.n - n - ctlThen;
+  delete c.p.constructor; window.__subCnt = null;
+  return { n, at, ctlThen, ctlAwait };
+});
 /** 點過教學／事件頁，直到頁內 window.__pm（pushMarket3d 的頁內時間）出現 since 之後的一筆；回那一筆。 */
 async function toMarketSince(page, since) {
   for (let i = 0; i < 2000; i++) {
@@ -193,7 +221,7 @@ async function toMarketSince(page, since) {
 test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗回呼核對身分、明夜等今夜下載完', { timeout: 1200000 }, async (t) => {
   const { chromium } = loadPlaywright();
   const S = await startServer();
-  const browser = await chromium.launch();
+  const browser = await launchGpu(chromium);
   const sub = (id, name, fn) => t.test(name, ONLY.length && !ONLY.includes(id) ? { skip: 'YAOSHI_GLBLOADER_ONLY' } : {}, fn);
   try {
     await sub('F1', 'F1：傳到一半停住、同夜別件斷續有資料 → 停住那件約 20 秒重抓、托盤那格出現；明夜批次 50 秒內開始', async () => {
@@ -657,6 +685,7 @@ test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗
           Promise.prototype.then = function (...a) { if (c.on) { c.all++; if (p && this === p) c.shared++; } return orig.apply(this, a); };
           return !!p;
         }, url);
+        const hasSub = await watchShared(page, url); // r3 F2：第 2 次派發前開始數，數到 45 秒放行後
         for (let i = 1; i < 4; i++) { await fire(); await sleep(1000); }
         const tc = await page.evaluate(() => { Promise.prototype.then = window.__thenOrig; const c = window.__thenCnt; window.__thenCnt = null; return c; });
         const lastAt = S.now();
@@ -667,6 +696,10 @@ test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗
         assert.ok(tc.all > 0, `第 2–4 次預載派發當下沒有任何 then 呼叫（${JSON.stringify(tc)}），計數沒行使到`);
         assert.equal(tc.shared, 0, `第 2–4 次預載派發當下對 bell 的共用下載承諾掛了 ${tc.shared} 次 then（取消後這些回呼拆不掉，會隨換夜累積）`);
         const w0 = await untilBy(S, async () => ((await cf(page, 'glbWaiters', url)) === 0 ? true : null), lastAt + 50000, 500);
+        const sub = await readShared(page); // r3 F2：到這裡（含 45 秒放行）為止
+        assert.ok(hasSub && sub, 'bell 的共用下載承諾沒裝上計數');
+        assert.equal(sub.n, 0, `第 2 次預載派發前到放行後，bell 的共用下載承諾被掛了 ${sub.n} 次回呼（取消後拆不掉，會隨換夜累積）：${sub.at.join(' ｜ ')}`);
+        assert.deepEqual([sub.ctlThen, sub.ctlAwait], [1, 1], `正對照沒數到（微任務後的 then、await 應各 1 次）：${JSON.stringify(sub)}`);
         const bells = S.log.filter((r) => r.f === 'bell.glb');
         // 活性：整段期間 bell 只有一份共用下載、一直在傳（沒下載完、沒被判卡住重抓、沒被中止）
         assert.equal(bells.length, 1, `bell 被請求 ${bells.length} 次（應只有一份共用下載）：${bells.map((r) => (r.q || '-') + '@' + r.t).join(' ')}`);
@@ -676,6 +709,58 @@ test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗
       } finally { await ctx.close(); }
     });
 
+    await sub('W2', 'W2：明夜批次啟動後換世代 → 舊明夜批次掛在共用下載上的等待者解除，共用下載照舊', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        const url = 'assets/creatures/bell.glb';
+        S.decide = (f) => (f === 'bell.glb' ? TRICKLE : NORMAL); // bell 每 10 秒 2KB：一直在動、不算卡住，也下載不完；其餘正常
+        const fire = (now, next) => page.evaluate((d) => { document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: d })); }, { now, next });
+        const waiters = () => cf(page, 'glbWaiters', url);
+        const started = () => until(async () => ((await waiters()) >= 1 ? true : null), 15000, 100);
+        // 第 1 世代：今夜 chair 很快下載完 → 明夜 bell 啟動、一直傳不完
+        await fire(['chair'], ['bell']);
+        const g1 = await started();
+        const chairEnd = (S.log.find((r) => r.f === 'chair.glb') || {}).end;
+        const w1 = await waiters();
+        const hasSub = await watchShared(page, url); // 第 2–5 世代不得再對 bell 的共用承諾掛回呼（明夜路徑也算）
+        // 第 2 世代：只有今夜 shield、沒有明夜
+        await fire(['shield'], []); await sleep(1000);
+        const w2 = await waiters();
+        // 第 3 世代：明夜又是 bell → 只掛自己的 1 個
+        await fire(['chair'], ['bell']);
+        const g3 = await started(); await sleep(500);
+        const w3 = await waiters();
+        // 第 4 世代（真的換夜：昨夜的明夜變今夜）：舊明夜解除，只剩今夜的 1 個。只看數量；「舊的沒解除、新的沒掛」這種抵銷由第 5 世代的 0 擋。
+        // 明夜 flag 是整段沒人要過的模型：今夜 bell 下載不完，換世代後這批作廢，flag 不得被下載
+        await fire(['bell'], ['flag']); await sleep(1000);
+        const w4 = await waiters();
+        // 第 5 世代：不再需要 bell
+        await fire(['chair'], []); await sleep(1000);
+        const w5 = await waiters();
+        const sub = await readShared(page);
+        const flags = S.log.filter((r) => r.f === 'flag.glb');
+        const bells = S.log.filter((r) => r.f === 'bell.glb');
+        // 活性（啟動）：明夜批次真的啟動過，而且是今夜 chair 下載完之後才啟動
+        assert.ok(g1, '第 1 世代的明夜批次 15 秒內沒在 bell 上掛等待者，沒行使到');
+        assert.equal(w1, 1, `第 1 世代的明夜批次應掛 1 個等待者（${w1}）`);
+        assert.ok(chairEnd !== undefined && chairEnd !== null && bells.length > 0 && chairEnd <= bells[0].t, `今夜 chair 沒先下載完（chair 結束 ${chairEnd}、bell 開始 ${bells.length ? bells[0].t : '沒有'}）`);
+        assert.equal(w2, 0, `換世代後，舊明夜批次還在 bell 的共用下載上掛著 ${w2} 個等待者`);
+        assert.ok(g3, '第 3 世代的明夜批次 15 秒內沒在 bell 上掛等待者，沒行使到');
+        assert.equal(w3, 1, `第 3 世代後 bell 上掛著 ${w3} 個等待者（只該有自己的 1 個）`);
+        assert.equal(w4, 1, `換夜後 bell 上掛著 ${w4} 個等待者（舊明夜要解除，只該有今夜的 1 個）`);
+        assert.equal(w5, 0, `不再需要 bell 之後還掛著 ${w5} 個等待者`);
+        assert.ok(hasSub && sub, 'bell 的共用下載承諾沒裝上計數');
+        assert.equal(sub.n, 0, `第 2–5 世代對 bell 的共用下載承諾掛了 ${sub.n} 次回呼（取消後拆不掉，會隨換夜累積）：${sub.at.join(' ｜ ')}`);
+        assert.deepEqual([sub.ctlThen, sub.ctlAwait], [1, 1], `正對照沒數到（微任務後的 then、await 應各 1 次）：${JSON.stringify(sub)}`);
+        assert.equal(flags.length, 0, `換世代後，舊批次還替自己的明夜開了新下載：flag.glb 被請求 ${flags.length} 次`);
+        // 活性（共用下載照舊）：整段只有一份請求、沒下載完、沒被中止
+        assert.equal(bells.length, 1, `bell 被請求 ${bells.length} 次（應只有一份共用下載）：${bells.map((r) => (r.q || '-') + '@' + r.t).join(' ')}`);
+        assert.ok(bells[0].end === null && bells[0].aborted === null, 'bell 已下載完或被中止，沒行使到「共用下載還在進行」');
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
     await sub('N', 'N：同頁開新局 →「請神入座」從新局自己的第一次市集事件起算；上一局遮罩已結束的新局也重新監看', async () => {
       const errs = [];
       const { ctx, page } = await openGame(browser, S, errs);
diff --git a/tests/h1-guide.test.mjs b/tests/h1-guide.test.mjs
index 4fa344d8..217629bc 100644
--- a/tests/h1-guide.test.mjs
+++ b/tests/h1-guide.test.mjs
@@ -14,6 +14,7 @@ import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
 import { driveToFirst, openGame, waitTrayReady, waitSettled, scr, DRIVE_STEP } from './tools/appraise-c-lib.mjs';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -179,7 +180,7 @@ before(async () => {
   const { chromium } = loadPlaywright();
   srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  browser = await launchGpu(chromium);
   for (const k of VPS) {
     const d = { rounds: null };
     const { ctx, page } = await openGame(browser, PORT, ALL[k], 'solo', 3, { clock: false, destiny: DESTINY });
diff --git a/tests/h2-cards.test.mjs b/tests/h2-cards.test.mjs
index f3da9f57..57c60909 100644
--- a/tests/h2-cards.test.mjs
+++ b/tests/h2-cards.test.mjs
@@ -14,6 +14,7 @@ import fs from 'node:fs';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -55,7 +56,7 @@ before(async () => {
   const { chromium } = loadPlaywright();
   srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await wait(900);
-  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  browser = await launchGpu(chromium);
   const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
   const page = await ctx.newPage();
   const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
diff --git a/tests/h3-affordance.test.mjs b/tests/h3-affordance.test.mjs
index 80c29cc6..1920441c 100644
--- a/tests/h3-affordance.test.mjs
+++ b/tests/h3-affordance.test.mjs
@@ -7,6 +7,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -30,7 +31,7 @@ async function withMarket(size, fn, { stake = false } = {}) {
     const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
     if (ok) break; await new Promise((r) => setTimeout(r, 200));
   }
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, hasTouch: true });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tests/hand-first-throw.test.mjs b/tests/hand-first-throw.test.mjs
index d5f24387..07fd94d3 100644
--- a/tests/hand-first-throw.test.mjs
+++ b/tests/hand-first-throw.test.mjs
@@ -12,6 +12,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -37,7 +38,7 @@ test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，
     if (ok) break; await new Promise((r) => setTimeout(r, 200));
   }
   // 要走真的 GPU（ANGLE D3D11）：預設 headless 是 SwiftShader 軟體繪圖，編譯快、量不出差別（2026-11-22 實測：拿掉預編仍綠）
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   const errs = [];
   try {
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
diff --git a/tests/hand-realism-render.test.mjs b/tests/hand-realism-render.test.mjs
index 2abe712a..c7c1dd53 100644
--- a/tests/hand-realism-render.test.mjs
+++ b/tests/hand-realism-render.test.mjs
@@ -10,6 +10,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT; // 突變驗紅：指向暫存的突變樹
@@ -19,7 +20,7 @@ test('寫實皮膚實頁像素：獵人疤強度歸零⇒疤的像素改變；
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tests/hand-skin-default.test.mjs b/tests/hand-skin-default.test.mjs
index 244542df..d7e9875d 100644
--- a/tests/hand-skin-default.test.mjs
+++ b/tests/hand-skin-default.test.mjs
@@ -10,6 +10,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT; // 突變驗紅：指向修改前的暫存樹
@@ -19,7 +20,7 @@ test('預設皮膚＝B 皮膚（青面斑塊與拇指橫紋已調整）；?skin=
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const out = {};
     for (const q of ['', '?skin=0', '?skin=off', '?skin=a', '?skin=ab', '?handreal=0']) {
diff --git a/tests/hand-warm-context.test.mjs b/tests/hand-warm-context.test.mjs
index 644ef33a..b1be709a 100644
--- a/tests/hand-warm-context.test.mjs
+++ b/tests/hand-warm-context.test.mjs
@@ -42,6 +42,7 @@ test('手部 shader：第一次出手前已預編；context 遺失恢復時預
     const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
     if (ok) break; await new Promise((r) => setTimeout(r, 200));
   }
+  // 不走顯示卡：B 段要抓的未捕捉例外（f2ff1ad7 的 compileAsync）走顯示卡不會發生（2026-11-23 實測：CPU 3/3 紅在 TypeError，顯示卡 3/3 沒有例外）
   const browser = await chromium.launch();
   const errs = [];
   try {
diff --git a/tests/integration-066.test.mjs b/tests/integration-066.test.mjs
index b7348c54..7d54cfce 100644
--- a/tests/integration-066.test.mjs
+++ b/tests/integration-066.test.mjs
@@ -22,6 +22,7 @@ import { execFileSync } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
 import { DRIVE_STEP, scr, driveToFirst, waitTrayReady, waitSettled } from './tools/appraise-c-lib.mjs';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -99,7 +100,7 @@ const kinds = (m) => new Set(m.els.map((e) => e.kind));
 async function withGame(mode, size, fn) {
   const { chromium } = loadPlaywright();
   const srv = await serve(mode);
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, hasTouch: true });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tests/light-aplus-fx0.test.mjs b/tests/light-aplus-fx0.test.mjs
index e5f32440..e1fc56dc 100644
--- a/tests/light-aplus-fx0.test.mjs
+++ b/tests/light-aplus-fx0.test.mjs
@@ -12,6 +12,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -47,7 +48,7 @@ test('?fx=0：燈光清單與渲染器旗標逐項等於 v0.64.0', { timeout: 24
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tests/light-aplus-robust.test.mjs b/tests/light-aplus-robust.test.mjs
index ab38bc2b..b5e7224e 100644
--- a/tests/light-aplus-robust.test.mjs
+++ b/tests/light-aplus-robust.test.mjs
@@ -7,6 +7,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -26,7 +27,7 @@ test('光影 A+ 韌性：環境圖抓不到照常啟動；context 復原後環
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     await t.test('① RoomEnvironment.js 被擋 ⇒ 3D 層照常啟動、A+ 開著但無環境圖、0 pageerror', async () => {
       const { ctx, page, errs } = await open(browser, { blockEnv: true });
diff --git a/tests/light-aplus.test.mjs b/tests/light-aplus.test.mjs
index d51bae62..d4440648 100644
--- a/tests/light-aplus.test.mjs
+++ b/tests/light-aplus.test.mjs
@@ -14,6 +14,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT; // 對基準驗紅：指向 v0.64.0 的樹
@@ -69,7 +70,7 @@ test('光影 A+：預設開啟／?fx=0 退回／陰影僅法寶／燈數固定',
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const on = await openGame(browser, '');
     const off = await openGame(browser, '?fx=0');
diff --git a/tests/lot-prefetch.test.mjs b/tests/lot-prefetch.test.mjs
index 6df5635e..74157967 100644
--- a/tests/lot-prefetch.test.mjs
+++ b/tests/lot-prefetch.test.mjs
@@ -34,6 +34,7 @@ test('拍品提前下載：慢線路下第 2 夜拍品推上桌 1 秒內全部
     const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
     if (ok) break; await new Promise((r) => setTimeout(r, 200));
   }
+  // 不走顯示卡：等待值 CPU 8–330ms、顯示卡 673–743ms（2026-11-23 實測），多的那段推算不是下載（那時假線路已空），會吃掉 1000ms 門檻的餘裕
   const browser = await chromium.launch();
   const errs = [];
   let linkFreeAt = 0;
diff --git a/tests/movecam.test.mjs b/tests/movecam.test.mjs
index 4bad9dc1..7dad9799 100644
--- a/tests/movecam.test.mjs
+++ b/tests/movecam.test.mjs
@@ -18,6 +18,7 @@ function loadPlaywright() {
   throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
 }
 const { chromium } = loadPlaywright();
+// 不走顯示卡：這支用 file:// 開頁、沒有 WebGL context（2026-11-23 實測 0 個），旗標對它沒作用，時序判準不跟著動
 const browser = await chromium.launch();
 async function open(query = '', { fixtureLoop = true } = {}) {
   const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
diff --git a/tests/nightwalk.test.mjs b/tests/nightwalk.test.mjs
index d347b091..0ad0fac5 100644
--- a/tests/nightwalk.test.mjs
+++ b/tests/nightwalk.test.mjs
@@ -14,6 +14,8 @@ const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const TARGET = process.env.NW_TARGET || path.join(ROOT, 'index.html');
 const COPY = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/experiments/2026-09-25-n1-nightwalk/copy-r1.json'), 'utf8'));
 const BASE_SHA = '3a0d971';
+// 3a0d971 之後改過名的拍品（v0.63.0 97c766aa）：#1 比拍品名時把基準版的舊名視為現名，其餘比對不動（製作人 2026-11-23 同意，DECISIONS 同日）
+const RENAMED = { 抓交替水符: '水鬼名冊' };
 
 const memStore = () => { const m = new Map(); const calls = []; return { m, calls, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { calls.push(k); m.set(k, String(v)); } }; };
 const load = (storage) => loadGame(TARGET, storage ? { storage } : {});
@@ -185,7 +187,7 @@ test('#1 常規局：S 不多欄位；座位與亂數流與 3a0d971 相同（see
       assert.ok(!('chapter' in G.S) && !('chainsOff' in G.S));
       assert.deepEqual(G.S.players.map((p) => [p.roleId, !!p.ai, p.name]), B.S.players.map((p) => [p.roleId, !!p.ai, p.name]));
       assert.deepEqual([G.S.rng(), G.S.rng(), G.S.rng()], [B.S.rng(), B.S.rng(), B.S.rng()], `seed ${seed} ${mode} 亂數流不同`);
-      assert.deepEqual(G.S.market.map((x) => x.n), B.S.market.map((x) => x.n));
+      assert.deepEqual(G.S.market.map((x) => x.n), B.S.market.map((x) => RENAMED[x.n] ?? x.n));
     }
   }
 });
diff --git a/tests/relic-micro-visible.test.mjs b/tests/relic-micro-visible.test.mjs
index a594427e..414b39a7 100644
--- a/tests/relic-micro-visible.test.mjs
+++ b/tests/relic-micro-visible.test.mjs
@@ -10,6 +10,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -66,7 +67,7 @@ async function measure() {
     const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
     if (ok) break; await new Promise((r) => setTimeout(r, 200));
   }
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   const runs = [];
   try {
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
diff --git a/tests/sfx-wiring.test.mjs b/tests/sfx-wiring.test.mjs
index f0fa0a24..c9d91d56 100644
--- a/tests/sfx-wiring.test.mjs
+++ b/tests/sfx-wiring.test.mjs
@@ -14,6 +14,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
 const PORT = 9612;
@@ -154,7 +155,7 @@ test('凍結 #6①：封標／揭盅／受咒／落籌接線與 SKIP、?sfx=0 
   const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch();
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
     await ctx.addInitScript(HOOK);
diff --git a/tests/ui-hierarchy.test.mjs b/tests/ui-hierarchy.test.mjs
index 5de09acd..db7f8036 100644
--- a/tests/ui-hierarchy.test.mjs
+++ b/tests/ui-hierarchy.test.mjs
@@ -22,7 +22,7 @@ test('從側欄查看拍品時，3D 桌上同一件也會進入檢視態', () =>
 });
 
 test('首頁顯示可核對的發布版本', () => {
-  assert.match(page, /const RELEASE_VERSION="0.66.3"/, '本次公開版需遞增語意版本');
+  assert.match(page, /const RELEASE_VERSION="0.66.4"/, '本次公開版需遞增語意版本');
   assert.match(page, /v\$\{RELEASE_VERSION\}/, '首頁版本列必須顯示發布版本');
   assert.match(page, /renderer\.js\?v="\+RELEASE_VERSION/, '3D 模組快取鍵必須隨發布版本更新');
   const rel = page.match(/const RELEASE_VERSION="([^"]+)"/)[1];
diff --git a/tests/ux-0664.test.mjs b/tests/ux-0664.test.mjs
new file mode 100644
index 00000000..d485e334
--- /dev/null
+++ b/tests/ux-0664.test.mjs
@@ -0,0 +1,361 @@
+// v0.66.4 三項介面修正的實頁驗收（凍結檔 docs/acceptance/2026-11-23-v0.66.4.md）。
+//   M2：不是請神夜、今夜也沒有人真的燒到香 → 成交總覽的主鈕直接是「開戰」，一按就開打；其餘夜照舊先「🕯️ 請神」。
+//       判斷式 shrineHasNews() 另用 headless 對結算結果逐筆對照（同一個狀態：說「有」⇔ 結算真的有東西可看；呼叫它不動狀態、不改設定、不耗亂數）。
+//       真滑鼠連按：「查看成交總覽 ▸」120ms 連按停在總覽；安靜夜「開戰」120ms 連按只結算一次。
+//   M5：規則頁第一節就是「🏮 目標」，音訊診斷與效能資訊鈕移到全部規則之後、關閉鈕之前；切換效能資訊後鈕還在眼前。
+//   M6：別人的袋子上那行公開戰力＝牌桌座位上同一串「N 隻・血 M」（舊規則的戰力數字只在 PAPERWAR_ON=false 時用）。
+// 基準對照：YAOSHI_RENDER_ROOT=<舊版樹> 對舊版跑同一份（a、j、M5、M6 應紅在行為斷言；b–g、i 舊版就綠）。
+// 瀏覽器規矩：一次只開一個 chromium；每個情境各開一頁。YAOSHI_SHOT_DIR=<目錄> 時另存截圖。
+import assert from 'node:assert/strict';
+import test, { before, after } from 'node:test';
+import fs from 'node:fs';
+import path from 'node:path';
+import { spawn } from 'node:child_process';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
+import { loadGame } from './tools/load.mjs';
+
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
+const PORT = Number(process.env.YAOSHI_UX0664_PORT || 9777);
+const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
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
+async function open({ size = [844, 390], query = '' } = {}) {
+  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
+  const page = await ctx.newPage();
+  const errors = [];
+  page.on('pageerror', (e) => errors.push(String(e)));
+  await page.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) { /* 無痕 */ } });
+  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`);
+  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
+  return { page, errors, close: () => ctx.close() };
+}
+async function shot(page, name) { if (!SHOT_DIR) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) }); }
+
+/* 開一局、關掉等待、數兩支結算被叫幾次，並照情境改好狀態（都在出價之前）。 */
+const START = ({ seed, prep }) => {
+  CFG.T = 1;
+  for (const k of Object.keys(window.__yaoshi.PW_FX)) if (/_MS$/.test(k)) window.__yaoshi.PW_FX[k] = 1;
+  window.__calls = [];
+  for (const n of ['resolveShrines', 'resolveBattles']) {
+    const o = window[n];
+    window[n] = function () { const r = o.apply(this, arguments); window.__calls.push(n); if (n === 'resolveShrines') window.__shrineOut = JSON.parse(JSON.stringify(r)); return r; };
+  }
+  if (prep.noAi) window.aiIncense = () => null;
+  if (prep.nights) CFG.SHRINE_NIGHTS = prep.nights;
+  if (prep.auto !== undefined) { const o = window.hasFlag; window.hasFlag = (p, f) => (f === 'shrineAutoIncense' && p.id === prep.auto) || o(p, f); }
+  window.__yaoshi.newGame('solo', seed, ['qingmian']);
+};
+/* 推到主鈕文字符合為止（連點守衛會吞掉太快的點擊，所以是「按到畫面真的變了」；讀字與按鈕在同一次 evaluate 裡）。 */
+async function driveTo(page, re, tag) {
+  for (let i = 0; i < 900; i++) {
+    const r = await page.evaluate((src) => {
+      const b = document.getElementById('mainbtn'), t = b ? b.textContent : '';
+      if (b && !b.disabled && new RegExp(src).test(t)) return { hit: true, t };
+      if (b && !b.disabled) b.click();
+      return { hit: false, t };
+    }, re.source);
+    if (r.hit) return r.t;
+    await page.waitForTimeout(30);
+  }
+  throw new Error(`${tag}：主鈕一直沒有變成 ${re}（目前「${await page.evaluate(() => document.getElementById('mainbtn')?.textContent)}」）`);
+}
+/* 真的用滑鼠按主鈕一下（先等守衛視窗過去，節奏跟人一樣）。 */
+async function tapMain(page) {
+  await page.waitForTimeout(700);
+  await page.click('#mainbtn');
+}
+/* 真滑鼠在同一點連按兩下（先等守衛視窗過去）。落點取主鈕靠右：換字後鈕會變窄、靠右，中心點會落空。回傳第二下按下去之前，手指下是什麼。 */
+async function tapTwice(page, gap) {
+  await page.waitForTimeout(700);
+  const r = await page.locator('#mainbtn').boundingBox();
+  const x = r.x + r.width - 18, y = r.y + r.height / 2;
+  await page.mouse.click(x, y);
+  await page.waitForTimeout(gap);
+  const hit = await page.evaluate(([px, py]) => {
+    const e = document.elementFromPoint(px, py), m = document.getElementById('mainbtn'), on = !!e && !!e.closest('#mainbtn');
+    return { onMain: on, live: on && !m.disabled, text: m.textContent, top: e ? (e.id || e.closest('[id]')?.id || e.tagName) : null };
+  }, [x, y]);
+  await page.mouse.click(x, y);
+  return hit;
+}
+const STATE = () => ({ txt: document.getElementById('mainbtn').textContent, calls: window.__calls.slice(), shz: document.getElementById('shz')?.innerText || '',
+  lives: S.players.map((p) => p.life), burn: window.__shrineOut ? window.__shrineOut.burn.map((b) => [b.pid, b.amt]) : null, round: S.round });
+
+/* 走到「本夜成交總覽」（第 1 夜）。plus＝出價時真人自己按一次燒香「＋」。 */
+async function toSummary(page, { seed = 7, prep = {}, plus = false }) {
+  await page.evaluate(START, { seed, prep });
+  await driveTo(page, /蓋牌/, '出價畫面');
+  if (plus) {
+    const ok = await page.evaluate(() => { const bs = [...document.querySelectorAll('.incbar button')]; if (bs.length < 2 || bs[1].disabled) return false; bs[1].click(); return INC && INC.amt; });
+    assert.equal(ok, 1, '真人燒香沒有加到 1（治具沒生效）');
+  }
+  const txt = await driveTo(page, /請神|開戰/, '成交總覽');
+  assert.ok(await page.evaluate(() => !!document.querySelector('#stage .pnl, #stage #pnl, #stage [class*="pnl"]')), '這一頁不是成交總覽面板');
+  return txt;
+}
+
+/* ---------------- M2 ---------------- */
+test('M2-a 安靜夜（非請神夜、沒有人燒香）：主鈕是「開戰」，按一下就開打，不出現請神那一頁', async () => {
+  const { page, errors, close } = await open();
+  try {
+    const txt = await toSummary(page, { prep: { noAi: true } });
+    await shot(page, 'm2-quiet-summary');
+    assert.equal(txt, '開戰', `安靜夜的主鈕還是「${txt}」`);
+    const before_ = await page.evaluate(STATE);
+    assert.deepEqual(before_.calls, [], '還沒按就已經結算');
+    await tapMain(page);
+    await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
+    const s = await page.evaluate(STATE);
+    assert.deepEqual(s.calls, ['resolveShrines', 'resolveBattles'], '結算順序或次數不對（香火段要照跑一次、再開戰）');
+    assert.deepEqual(s.burn, [], '安靜夜不該有人燒香（治具沒生效）');
+    assert.equal(await page.evaluate(() => !!document.getElementById('shz')), false, '安靜夜不該出現請神那一頁');
+    await driveTo(page, /進入下一夜|看最終結果/, '夜末');
+    assert.deepEqual((await page.evaluate(STATE)).calls, ['resolveShrines', 'resolveBattles'], '同一夜結算了第二次');
+    assert.deepEqual(errors, []);
+  } finally { await close(); }
+});
+
+for (const [id, name, opt, want] of [
+  ['b', 'AI 有燒香', { prep: {} }, /燒了/],
+  ['c', '請神夜、沒有人燒香', { prep: { noAi: true, nights: [1, 8, 11] } }, /沒有人請得動/],
+  ['d', '只有真人燒香', { prep: { noAi: true }, plus: true }, /燒了 1 壽命/],
+  ['e', '神王命自動進香', { prep: { noAi: true, auto: 2 } }, /燒了/],
+]) {
+  test(`M2-${id} ${name}：照舊先「🕯️ 請神」、看得到結果，再「開戰」`, async () => {
+    const { page, errors, close } = await open();
+    try {
+      const txt = await toSummary(page, opt);
+      if (id === 'b') await shot(page, 'm2-news-summary');
+      assert.equal(txt, '🕯️ 請神', `主鈕是「${txt}」`);
+      await tapMain(page);
+      await page.waitForFunction(() => { const b = document.getElementById('mainbtn'); return document.getElementById('shz') && b.textContent === '開戰' && !b.disabled; }, null, { timeout: 8000 });
+      const s = await page.evaluate(STATE);
+      assert.match(s.shz, want, '請神那一頁沒有該有的內容');
+      assert.deepEqual(s.calls, ['resolveShrines'], '還沒按開戰就開打');
+      await tapMain(page);
+      await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
+      assert.deepEqual(errors, []);
+    } finally { await close(); }
+  });
+}
+
+test('M2-f 沒開請神（?legend=0）：主鈕照舊是「開戰」', async () => {
+  const { page, errors, close } = await open({ query: '?legend=0' });
+  try {
+    assert.equal(await toSummary(page, { prep: {} }), '開戰');
+    await tapMain(page);
+    await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
+    assert.deepEqual(errors, []);
+  } finally { await close(); }
+});
+
+test('M2-g 停在成交總覽的時候狀態變了（有人的香進來了）：結果照樣攤開，不會被吃掉', async () => {
+  const { page, errors, close } = await open();
+  try {
+    await toSummary(page, { prep: { noAi: true } });
+    await page.evaluate(() => { S.incense[1] = { amt: 1 }; });
+    await tapMain(page);
+    await page.waitForFunction(() => { const b = document.getElementById('mainbtn'); return document.getElementById('shz') && b.textContent === '開戰' && !b.disabled; }, null, { timeout: 8000 });
+    const s = await page.evaluate(STATE);
+    assert.deepEqual(s.burn, [[1, 1]]);
+    assert.match(s.shz, /燒了 1 壽命/, '香火結果沒有攤開');
+    assert.deepEqual(s.calls, ['resolveShrines'], '結果還沒看到就開打');
+    assert.deepEqual(errors, []);
+  } finally { await close(); }
+});
+
+test('M2-i 「查看成交總覽 ▸」連按兩下（120ms）：停在總覽，不會直接開打', async () => {
+  const { page, errors, close } = await open();
+  try {
+    await page.evaluate(START, { seed: 7, prep: { noAi: true } });
+    await driveTo(page, /蓋牌/, '出價畫面');
+    await driveTo(page, /查看成交總覽/, '最後一件');
+    const hit = await tapTwice(page, 120);
+    console.log('M2-i 第二下落點', JSON.stringify(hit));
+    assert.ok(hit.live && /^(🕯️ 請神|開戰)$/.test(hit.text), `第二下沒落在已換字、可按的主鈕上（治具沒打到危險的點）：${JSON.stringify(hit)}`);
+    await page.waitForTimeout(1500);
+    const s = await page.evaluate(STATE);
+    assert.deepEqual(s.calls, [], '連按把總覽跳掉、直接結算了');
+    assert.match(s.txt, /^(🕯️ 請神|開戰)$/, `沒有停在成交總覽（主鈕「${s.txt}」）`);
+    assert.deepEqual(errors, []);
+  } finally { await close(); }
+});
+
+test('M2-j 安靜夜的「開戰」連按兩下（120ms）：香火段與開戰各只結算一次，第二下打不到可按的主鈕', async () => {
+  const { page, errors, close } = await open();
+  try {
+    assert.equal(await toSummary(page, { prep: { noAi: true } }), '開戰', '安靜夜的主鈕不是「開戰」');
+    const hit = await tapTwice(page, 120);
+    console.log('M2-j 第二下落點', JSON.stringify(hit));
+    await page.waitForFunction(() => window.__calls.includes('resolveBattles'), null, { timeout: 8000 });
+    await page.waitForTimeout(800);
+    assert.deepEqual((await page.evaluate(STATE)).calls, ['resolveShrines', 'resolveBattles'], '連按讓同一夜結算了兩次');
+    assert.equal(hit.live, false, `第二下打得到可按的主鈕：${JSON.stringify(hit)}`);
+    await driveTo(page, /進入下一夜|看最終結果/, '夜末');
+    assert.deepEqual((await page.evaluate(STATE)).calls, ['resolveShrines', 'resolveBattles'], '同一夜結算了第二次');
+    assert.deepEqual(errors, []);
+  } finally { await close(); }
+});
+
+test('M2-h shrineHasNews() 與結算結果逐筆一致、不動狀態、不耗亂數（headless：隨機狀態＋整局走訪）', () => {
+  const src = fs.readFileSync(path.join(SRV_ROOT, 'index.html'), 'utf8');
+  const G = loadGame(null, { sourceText: src });
+  assert.equal(typeof G.shrineHasNews, 'function', 'shrineHasNews 沒有出口');
+  const news = (o) => !!(o && (o.burn.length || o.taken.length || o.dawn.length || o.skip || o.pending));
+  let yes = 0, no = 0;
+  const check = (tag) => {
+    const before_ = JSON.stringify(G.S), cfg = JSON.stringify(G.CFG), o1 = G.S.rng, o2 = G.S.rngUi;
+    let draws = 0;
+    G.S.rng = () => { draws++; return o1(); };
+    if (o2) G.S.rngUi = () => { draws++; return o2(); };
+    const said = G.shrineHasNews();
+    G.S.rng = o1; if (o2) G.S.rngUi = o2;
+    assert.equal(draws, 0, `${tag}：shrineHasNews 耗了 ${draws} 次亂數`);
+    assert.equal(JSON.stringify(G.S), before_, `${tag}：shrineHasNews 動到了狀態`);
+    assert.equal(JSON.stringify(G.CFG), cfg, `${tag}：shrineHasNews 改了設定`);
+    const real = news(G.resolveShrines());
+    assert.equal(said, real, `${tag}：說「${said}」但結算是「${real}」`);
+    if (real) yes++; else no++;
+  };
+  const rnd = G.mulberry32(20261123);
+  const pick = (n) => Math.floor(rnd() * n);
+  const shape = {};
+  for (let t = 0; t < 3000; t++) {
+    G.makeState('solo', 1 + (t % 200));
+    const S = G.S;
+    S.round = 1 + pick(12);
+    S.players.forEach((p) => {
+      p.life = pick(4) === 0 ? pick(3) : 1 + pick(30);
+      p.alive = p.life > 0;
+      S.incPool[p.id] = pick(9);
+      if (pick(3) === 0) G.CHAINS.godKing.requirements.forEach((ab) => p.bag.push({ ...G.POOL.find((x) => x.ab === ab) }));
+      const k = pick(4);
+      if (k === 1) S.incense[p.id] = null;
+      if (k === 2) S.incense[p.id] = { amt: pick(5) };
+      if (k === 3) S.incense[p.id] = { amt: 0 };
+    });
+    S.shrines.forEach((sh) => { const k = pick(4); if (k === 1) { sh.open = false; sh.takenBy = pick(4); } if (k === 2) { sh.open = false; sh.dawn = true; } });
+    if (pick(5) === 0) S.shrines.forEach((sh) => { sh.open = false; });
+    const key = [G.isShrineNight(S.round) ? '請神夜' : '平常夜', G.openShrines().length ? '有尊' : '沒尊', S.players.some((p) => p.alive && G.hasFlag(p, 'shrineAutoIncense')) ? '有神王' : '沒神王'].join('／');
+    shape[key] = (shape[key] || 0) + 1;
+    check(`隨機 ${t}`);
+  }
+  console.log('M2-h 隨機狀態 有／沒有東西可看：', yes, no, JSON.stringify(shape));
+  assert.ok(yes >= 300 && no >= 300, `兩種都要走到夠多次：${yes}／${no}`);
+  assert.equal(Object.keys(shape).length, 8, `八種組合要都走到：${JSON.stringify(shape)}`);
+  /* 整局走訪：在真的結算入口前先問一次，40 局每夜都要對得上，而且整局紀錄與沒問時逐位元組相同 */
+  const A = 'function resolveShrines(opts){';
+  assert.equal(src.split(A).length, 2, '找不到結算入口（引擎結構變了要更新這支治具）');
+  globalThis.__m2walk = [];
+  const W = loadGame(null, { sourceText: src.replace(A, 'function resolveShrines(opts){ const said=(CFG.LEGEND_ON&&S.shrines)?shrineHasNews():null; const o=__rs0(opts); if(said!==null) globalThis.__m2walk.push([said,!!(o&&(o.burn.length||o.taken.length||o.dawn.length||o.skip||o.pending)),S.round]); return o; }\nfunction __rs0(opts){') });
+  const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
+  assert.equal(JSON.stringify(W.trace(seeds)), JSON.stringify(G.trace(seeds)), '整局裡先問 shrineHasNews 會改變紀錄（耗亂數或動到狀態）');
+  const walk = globalThis.__m2walk, bad = walk.filter(([said, real]) => said !== real), yesN = walk.filter(([, r]) => r).length;
+  console.log('M2-h 整局走訪 夜數', walk.length, '有／沒有東西可看', yesN, walk.length - yesN);
+  assert.deepEqual(bad, [], '整局走訪對不上');
+  assert.ok(yesN >= 50 && walk.length - yesN >= 20, `整局走訪兩種都要走到：${yesN}／${walk.length - yesN}`);
+});
+
+/* ---------------- M5 ---------------- */
+for (const size of [[844, 390], [667, 375]]) {
+  test(`M5 規則頁（${size.join('×')}）：開頭就是目標，診斷在最後，切換效能資訊後鈕還在眼前`, async () => {
+    const { page, errors, close } = await open({ size });
+    try {
+      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); openHelp(); });
+      await page.waitForFunction(() => document.getElementById('modal').style.display === 'flex');
+      await shot(page, `m5-help-top-${size[0]}`);
+      const m = await page.evaluate(() => {
+        const box = document.getElementById('modalbox'), br = box.getBoundingClientRect();
+        const titles = [...box.querySelectorAll('div')].filter((d) => d.style.fontWeight === 'bold' && d.style.fontSize === '13px');
+        const diag = [...box.querySelectorAll('div')].filter((d) => d.textContent.startsWith('🔧 音訊診斷') && !d.querySelector('div'));
+        const tg = document.getElementById('fpsToggle'), close = [...box.querySelectorAll('button')].filter((b) => b.textContent === '關閉');
+        const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); // b 在 a 之後
+        const r0 = titles[0].getBoundingClientRect();
+        return { titles: titles.length, first: titles[0].textContent, firstVisible: r0.top >= br.top && r0.bottom <= br.bottom, nDiag: diag.length, nClose: close.length,
+          diagAfterLast: after(titles[titles.length - 1], diag[0]), toggleAfterLast: after(titles[titles.length - 1], tg), closeAfterToggle: after(tg, close[0]),
+          firstText: box.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), scrollH: box.scrollHeight, clientH: box.clientHeight };
+      });
+      console.log(`M5 ${size.join('×')}`, JSON.stringify(m));
+      assert.ok(m.titles >= 8, `規則節數 ${m.titles} 太少（治具沒找到節標題）`);
+      assert.equal(m.nDiag, 1, '音訊診斷要剛好一份');
+      assert.match(m.firstText, /^？ 妖市規則 🏮 目標/, `規則頁開頭不是目標：「${m.firstText}」`);
+      assert.ok(m.firstVisible, '打開規則頁第一眼看不到「目標」');
+      assert.ok(m.diagAfterLast, '音訊診斷不在最後一節規則之後');
+      assert.ok(m.toggleAfterLast, '效能資訊鈕不在最後一節規則之後');
+      assert.ok(m.nClose === 1 && m.closeAfterToggle, '診斷要在關閉鈕之前');
+      const look = () => page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
+        const b = document.getElementById('modalbox').getBoundingClientRect(), t = document.getElementById('fpsToggle').getBoundingClientRect(), f = document.getElementById('fpsDiag');
+        res({ text: document.getElementById('fpsToggle').textContent, inView: t.top >= b.top - 1 && t.bottom <= b.bottom + 1, diag: !!f, diagTopInView: f ? f.getBoundingClientRect().top < b.bottom : null });
+      }))));
+      await page.locator('#fpsToggle').scrollIntoViewIfNeeded();
+      await shot(page, `m5-help-bottom-${size[0]}`);
+      const off = await look();
+      assert.deepEqual([off.text, off.diag], ['顯示效能資訊', false]);
+      await page.click('#fpsToggle');
+      const on = await look();
+      await shot(page, `m5-help-fps-${size[0]}`);
+      assert.deepEqual([on.text, on.diag, on.inView, on.diagTopInView], ['隱藏效能資訊', true, true, true], '打開效能資訊後，鈕或數字不在眼前');
+      await page.waitForTimeout(700); // 同一點的鈕剛換字，遊戲的連點守衛會吞掉 500ms 內的第二下（沒改的產品也一樣），等過去再點
+      await page.click('#fpsToggle');
+      const off2 = await look();
+      assert.deepEqual([off2.text, off2.diag, off2.inView], ['顯示效能資訊', false, true], '關掉效能資訊後，鈕不在眼前');
+      assert.deepEqual(errors, []);
+    } finally { await close(); }
+  });
+}
+
+/* ---------------- M6 ---------------- */
+test('M6 別人的袋子：公開戰力＝座位上同一串「N 隻・血 M」；舊規則（PAPERWAR_ON=false）照舊顯示戰力數字', async () => {
+  const { page, errors, close } = await open();
+  try {
+    await page.evaluate(() => {
+      CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']);
+      S.players[1].bag.push(...POOL.slice(0, 3).map((x) => ({ ...x })));
+      S.players[2].bag.push({ ...POOL[5] });
+      renderSeats();
+    });
+    const rows = [];
+    for (const id of [1, 2, 3]) {
+      rows.push(await page.evaluate((pid) => {
+        showBag(pid);
+        const box = document.getElementById('modalbox'), line = [...box.querySelectorAll('p')].map((p) => p.textContent).find((t) => t.startsWith('公開戰力')) || '';
+        const seat = document.querySelector(`#seat${pid} .st`).innerText.split('\n').map((t) => t.trim());
+        const lineEl = [...box.querySelectorAll('p')].find((p) => p.textContent.startsWith('公開戰力')), cb = [...box.querySelectorAll('button')].find((x) => x.textContent === '關閉');
+        const gap = lineEl && cb ? +(cb.getBoundingClientRect().top - lineEl.getBoundingClientRect().bottom).toFixed(1) : null;
+        return { pid, line, seat, gap, power: Math.round(power(S.players[pid])), own: canViewPrivateBag(pid) };
+      }, id));
+      if (id === 1) await shot(page, 'm6-bag');
+    }
+    console.log('M6', JSON.stringify(rows));
+    for (const r of rows) {
+      assert.equal(r.own, false, '這一席不該看得到私有袋子（治具沒走到公開分支）');
+      const seatForce = r.seat.find((t) => /隻・血/.test(t));
+      assert.match(seatForce || '', /^\d+ 隻・血 \d+$/, `座位上沒有兵力：${JSON.stringify(r.seat)}`);
+      assert.equal(r.line, `公開戰力：${seatForce}`, `座位 ${r.pid} 的袋子寫「${r.line}」，牌桌座位寫「${seatForce}」`);
+    }
+    for (const r of rows) assert.ok(r.gap >= 10, `座位 ${r.pid}：公開戰力那行離關閉鈕只有 ${r.gap}px，會被鈕的陰影蓋住（要 ≥10）`);
+    assert.notEqual(rows[0].line, rows[2].line, '三席兵力都一樣（治具沒造成差異）');
+    const legacy = await page.evaluate(() => { CFG.PAPERWAR_ON = false; showBag(1); return { line: [...document.querySelectorAll('#modalbox p')].map((p) => p.textContent).find((t) => t.startsWith('公開戰力')), power: Math.round(power(S.players[1])) }; });
+    assert.equal(legacy.line, `公開戰力：${legacy.power}`);
+    assert.deepEqual(errors, []);
+  } finally { await close(); }
+});
diff --git a/tests/wishchip.test.mjs b/tests/wishchip.test.mjs
index 7e4cb467..f9d90bda 100644
--- a/tests/wishchip.test.mjs
+++ b/tests/wishchip.test.mjs
@@ -12,6 +12,7 @@ import path from 'node:path';
 import { spawn } from 'node:child_process';
 import { createRequire } from 'node:module';
 import { fileURLToPath } from 'node:url';
+import { launchGpu } from './browser.mjs';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
@@ -32,7 +33,7 @@ async function withPage(fn) {
   const { chromium } = loadPlaywright();
   const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
   await new Promise((r) => setTimeout(r, 900));
-  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const browser = await launchGpu(chromium);
   try {
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
     await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
diff --git a/tools/gated.sh b/tools/gated.sh
new file mode 100644
index 00000000..613be448
--- /dev/null
+++ b/tools/gated.sh
@@ -0,0 +1,19 @@
+# 驗收腳本共用：每件重工作各過一次桌機閘門、做完交還。用法：腳本裡 source tools/gated.sh 之後
+#   gated <指令…>     一般的一件
+#   gated_x <指令…>   -Exclusive：只給量效能、或怕別人負載造成假紅的測試；呼叫那行要註明理由
+# 每個驗收條件各包一次，不要把整份腳本包成一件；效能量測同一組改前／改後算一件，組內不放掉。
+# 整段寫成腳本檔再跑：命令列上直接寫長指令又接管線，閘門會把自己的 bash 認成重工作、等自己等不完（2026-11-23 實際卡 10 分鐘）。
+# 不要巢狀：被包的指令裡再呼叫 gated，內層交還會把外層的租約還掉。被包的函式裡不要 exit：會跳過交還，要等腳本結束才失效。
+# 桌機目前（2026-11-23）從腳本呼叫，gated 與 gated_x 都會被判成獨佔；差別留給之後的放行規則，所以照實分。
+# GATE_LOG＝閘門輸出要寫到哪（不設就丟掉）。
+GATE="powershell -NoProfile -File C:/Users/shung/tether-wt/gate.ps1"
+_gated() {
+  local ex="$1" _log="${GATE_LOG:-/dev/null}" _r=0; shift
+  case "$_log" in /*|[A-Za-z]:*) ;; *) _log="$PWD/$_log" ;; esac # 先記成絕對路徑：被包的指令 cd 走之後，相對路徑寫不進去，bash 會整條不執行、閘門就漏還
+  $GATE -Wait $ex >> "$_log" 2>&1 || { echo "閘門沒放行：$*" >&2; return 97; }
+  "$@" || _r=$? # 寫成 || 是讓呼叫端有 set -e 時也走得到下面的交還（代價：被包的函式裡 set -e 不會中途停，要自己回傳失敗碼）
+  $GATE -Release >> "$_log" 2>&1 || $GATE -Release > /dev/null 2>&1 || echo "閘門沒交還成功（腳本結束才會失效）：$*" >&2
+  return $_r
+}
+gated() { _gated "" "$@"; }
+gated_x() { _gated "-Exclusive" "$@"; }

