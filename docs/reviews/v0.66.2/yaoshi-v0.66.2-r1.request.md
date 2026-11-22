
review-id: yaoshi-v0.66.2-r1

全部用繁體中文回答，輸出必須符合給你的 JSON schema。JSON 的 `review_id` 欄位填 `yaoshi-v0.66.2-r1`，`summary` 的第一行照抄 `review-id: yaoshi-v0.66.2-r1`。

## 你的角色
你是妖市（瀏覽器 3D 拍賣卡牌遊戲，靜態 HTML／JS，`index.html` 主檔、`js/` 是 3D 層）的獨立技術與規則審查者。你沒參與實作。你的任務是**找出會出錯的情境**，不是確認看起來沒事。

## 你手上有什麼、能做什麼
- 工作目錄是受審 commit `c45dd1b1` 的唯讀快照，含 `docs/`，**沒有 .git**，也沒有基準版的檔案。
- 要審的 diff（`79af5f85..c45dd1b1`，只含規則面路徑；規則面的定義見快照 `CLAUDE.md` 開頭第 7 行）已附在本要求末段「diff」節，**不必也無法自己重算**。若 diff 看起來被截斷，在 summary 寫明，並直接讀快照裡的檔案補完。
- 你可以讀任何檔案、跑不寫檔的唯讀指令（例如 `grep`、`node -e` 讀檔）。環境是唯讀的：不要跑瀏覽器測試、不要跑會寫暫存檔的工具（例如 `tests/tools/trace-eq.mjs`）。
- 修正前的行為只能從 diff 的刪除行與靜態推論得知；iOS Safari 的實機行為也只能靜態推論。**沒辦法實際驗證的判斷，請在 finding 的 `detail` 開頭寫「（推測）」，並在對應 coverage 的 `note` 說明。**
- 本版宣稱做了什麼、驗收條件是什麼：docs/acceptance/2026-11-22-v0.66.2-loader.md（在快照裡）。請拿驗收條件對照實作，條件本身有漏洞也要指出。

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
```diff
diff --git a/index.html b/index.html
index ebeb96ad..7f33b31a 100644
--- a/index.html
+++ b/index.html
@@ -10,7 +10,7 @@
 <meta name="mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
-<link rel="stylesheet" href="assets/theme.css?v=0.66.1"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
+<link rel="stylesheet" href="assets/theme.css?v=0.66.2"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
 <style>
 /* ===== 佔位美術：正式版整批替換，邏輯層不得依賴任何樣式 =====
    ===== 美術層（2026-09-03 起）：色彩／字型變數與動畫 keyframes 在 assets/theme.css，
@@ -1235,7 +1235,7 @@ h2{font-size:16px;color:var(--gold);margin:2px 0 8px}
   .asc-fold{background:none;border:0;border-bottom:1px dashed var(--asc-zhu);font-size:.92em}
   .asc-fold::after{content:" ▾";font-weight:700}
 </style>
-<link rel="stylesheet" href="assets/safe-area.css?v=0.66.1"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
+<link rel="stylesheet" href="assets/safe-area.css?v=0.66.2"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
   不照 sfx／renderer 用 RELEASE_VERSION 字串拼接：這個 <link> 在 <head>、早於主 script，那時 RELEASE_VERSION 還沒定義；
   挪到主 script 之後注入會先畫一幀沒套這份樣式的畫面，而主 script 前又不能多開一支 script 標籤（tests/tools/load.mjs 只抓第一個）。 -->
 <script type="importmap">
@@ -2948,9 +2948,9 @@ function chainHintHTML(p,it){
 /* ?sim=1 進平衡模擬器工具頁，不影響正常遊戲頁（不自動執行、不動任何既有流程） */
 /* ===== 版本字串單一事實來源（2026-09-02 使用者裁定）：每次改版只改下面這一行，<title> 與首頁那行都由此帶出；
    使用者以首頁字串判斷是否已推上線；線上檢查用 grep 'VERSION="' ===== */
-const VERSION="0.66.1", VERSION_NOTE="0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
+const VERSION="0.66.2", VERSION_NOTE="0.66.2：網路慢時，法寶模型下載到一半卡住，約 20 秒後會自己重新下載（原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；快速重開新局時，上一局沒載成的法寶不會再讓新局的「請神入座」提早收掉。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
 /* 每次部署遞增此版號；首頁顯示與 asset query 都讀它，讓玩家可核實公開頁。 */
-const RELEASE_VERSION="0.66.1";
+const RELEASE_VERSION="0.66.2";
 /* ===== 音訊診斷與喚醒（2026-09-03，使用者回報 v0.27 iPhone 整個沒聲音、🔇 與靜音撥桿都排除）=====
    我沒有 iPhone 可重現，所以把每一層的狀態印在規則頁最上面，讓使用者唸給我聽：
    ctx 有沒有／state（iOS 特有 "interrupted"）／取樣率／音效開關／sfx.js 有沒有載到（聲部數）／最後一次 play 與例外／
diff --git a/js/creature-figures.js b/js/creature-figures.js
index 30af6f33..cdf90f92 100644
--- a/js/creature-figures.js
+++ b/js/creature-figures.js
@@ -126,30 +126,38 @@ const glbCache = new Map();
    所以「卡住就重抓」要做在這一層，重抓成功時已經接上這個 promise 的托盤格子才會跟著出現。
    - 自己 fetch＋逐塊讀（拿得到每一塊資料的時間），讀完交給 GLTFLoader.parseAsync（0.158 有）。遊戲沒用 LoadingManager／THREE.Cache，
      繞過 FileLoader 不影響別處。
-   - 連續 GLB_STALL_MS 沒收到任何資料＝卡住：中止舊請求（不跟新的搶頻寬），換網址 ?retry=N 再抓——不換網址的話，瀏覽器會把同網址的
+   - 卡住就中止舊請求（不跟新的搶頻寬），換網址 ?retry=N 再抓——不換網址的話，瀏覽器會把同網址的
      新請求併進還掛著的舊請求一起等（Chromium 實測 8 秒內不發新請求）。GLB 自包含，加查詢參數不影響內容。最多 GLB_MAX_TRIES 次（含第一次）。
    - HTTP 錯誤（404 等）與解析失敗照舊直接失敗、不重試；失敗的不留在快取（覆審 LOW：網路抖一次不該讓這隻整個 session 都載不到）。
-   - 「排隊」不算卡住：只有這一件 GLB_STALL_MS 沒資料、**而且**所有 GLB 下載合計 GLB_IDLE_MS 都沒進任何資料（線路整條停了）才算卡住。
-     別件還在進資料時，這件只是排在後面（HTTP/1.1 每主機連線數、或擁塞線路的排隊）——慢線路實測一件排隊 20 秒拿不到第一個位元組，
-     誤判重抓等於同一份抓兩次，浪費的正是最缺的頻寬（v0.66.1 r2 修正後重驗 5 次中 1 次重複下載，由此發現）。
-   glbState：promise → { lastData }＝最後一次真的收到資料的時間（給 prefetchGlb 決定何時放行下一批，不受重試重設影響）。 */
+   - 每次嘗試分三段判卡住（v0.66.2，Codex yaoshi-v0.66.1-r3 F1／F2；驗收 docs/acceptance/2026-11-22-v0.66.2-loader.md）：
+     · 排隊中（還沒收到任何本體資料）：別件還在進資料時，這件只是排在後面（HTTP/1.1 每主機連線數、HTTP/2 依序送、擁塞線路）——
+       慢線路實測一件排隊 20 秒拿不到第一個位元組，誤判重抓等於同一份抓兩次（v0.66.1 r2 修正後重驗由此發現）。所以要這件 GLB_STALL_MS
+       沒資料**而且**所有 GLB 下載合計 GLB_IDLE_MS 都沒進任何資料（線路整條停了）才算；但最多等 GLB_QUEUE_MAX_MS，別件斷斷續續有資料時不會永遠等下去。
+     · 傳輸中（收到過本體資料）：已經在傳的連線不會再排隊，自己 GLB_STALL_MS 沒資料就算卡住，不看別件（r3 F1：別件每 10 秒有資料時原本永遠不重抓）。
+     · 解析中（位元組收齊）：不歸下載計時管，也不會被重抓；只有目前那次嘗試的結果算數（r3 F2）。
+   - 計時一律用單調時鐘（monoNow），系統校時不影響（r3 F5）。
+   glbState：promise → { stalled }＝這一份曾被判卡住（開始重抓或放棄），prefetchGlb 用它放行下一批。 */
 const GLB_STALL_MS = 20000;
 const GLB_IDLE_MS = 15000;
+const GLB_QUEUE_MAX_MS = 45000;
 const GLB_MAX_TRIES = 3;
 const glbState = new WeakMap();
-let glbLastAnyData = 0; // 任何一份 GLB 最後一次收到資料的時間
+let glbLastAnyData = 0; // 任何一份 GLB 最後一次收到資料的時間（monoNow）
 let loader = null;
-/** 這一份（lastData）算不算卡住：自己 stallMs 沒資料，且整條線路 GLB_IDLE_MS 沒資料。 */
-function glbStalled(lastData, stallMs = GLB_STALL_MS) {
-  const now = Date.now();
-  return now - lastData > stallMs && now - glbLastAnyData > GLB_IDLE_MS;
+const monoNow = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
+/** 這一次嘗試算不算卡住（見上方三段）。 */
+function attemptStalled(att, now) {
+  if (att.parsing) return false;
+  const quiet = now - att.lastAt;
+  if (att.gotBody) return quiet > GLB_STALL_MS;
+  return (quiet > GLB_STALL_MS && now - glbLastAnyData > GLB_IDLE_MS) || quiet > GLB_QUEUE_MAX_MS;
 }
 
-/** 下載一份 GLB 的位元組；每收到一塊資料呼叫 onData。signal 中止時 reject。 */
+/** 下載一份 GLB 的位元組；收到回應標頭時呼叫 onData(false)，每收到一塊本體呼叫 onData(true)。signal 中止時 reject。 */
 async function fetchGlbBytes(u, signal, onData) {
   const res = await fetch(u, signal ? { signal } : undefined);
   if (!res.ok) throw new Error(`GLB HTTP ${res.status}：${u}`);
-  onData();
+  onData(false);
   if (!res.body || typeof res.body.getReader !== 'function') return res.arrayBuffer();
   const reader = res.body.getReader();
   const parts = [];
@@ -157,7 +165,7 @@ async function fetchGlbBytes(u, signal, onData) {
   for (;;) {
     const { done, value } = await reader.read();
     if (done) break;
-    parts.push(value); n += value.byteLength; onData();
+    parts.push(value); n += value.byteLength; onData(true);
   }
   const buf = new Uint8Array(n);
   let o = 0;
@@ -168,28 +176,34 @@ async function fetchGlbBytes(u, signal, onData) {
 function loadGlb(url) {
   if (!glbCache.has(url)) {
     if (!loader) loader = new GLTFLoader();
-    const st = { lastData: Date.now() };
+    const st = { stalled: false };
     const p = new Promise((resolve, reject) => {
-      let settled = false, tries = 0, lastAt = Date.now(), timer = null, cur = null;
+      let settled = false, tries = 0, timer = null, cur = null; // cur＝目前這次嘗試 { ctl, lastAt, gotBody, parsing }
       const finish = (ok, v) => {
         if (settled) return;
         settled = true; clearInterval(timer);
-        if (cur) cur.abort();
+        if (cur && cur.ctl) cur.ctl.abort();
         (ok ? resolve : reject)(v);
       };
       const start = () => {
-        if (cur) cur.abort(); // 換網址前先中止卡住的舊請求
+        if (cur && cur.ctl) cur.ctl.abort(); // 換網址前先中止卡住的舊請求
         const n = tries++;
         const ctl = typeof AbortController === 'function' ? new AbortController() : null;
-        cur = ctl; lastAt = Date.now();
+        const att = { ctl, lastAt: monoNow(), gotBody: false, parsing: false };
+        cur = att;
         const u = n ? url + (url.includes('?') ? '&' : '?') + 'retry=' + n : url;
-        fetchGlbBytes(u, ctl && ctl.signal, () => { if (cur === ctl) { lastAt = st.lastData = glbLastAnyData = Date.now(); } })
-          .then((buf) => loader.parseAsync(buf, THREE.LoaderUtils.extractUrlBase(url)))
-          .then((g) => finish(true, g), (e) => { if (ctl && ctl.signal.aborted && !settled) return; finish(false, e); });
+        fetchGlbBytes(u, ctl && ctl.signal, (body) => { if (cur !== att) return; att.lastAt = glbLastAnyData = monoNow(); if (body) att.gotBody = true; })
+          .then((buf) => {
+            if (cur !== att || settled) return null; // 已被新的嘗試取代
+            att.parsing = true;
+            return loader.parseAsync(buf, THREE.LoaderUtils.extractUrlBase(url)).then((g) => ({ g }));
+          })
+          .then((r) => { if (r && cur === att) finish(true, r.g); }, (e) => { if (cur !== att || settled) return; finish(false, e); });
       };
       start();
       timer = setInterval(() => {
-        if (settled || !glbStalled(lastAt)) return;
+        if (settled || !attemptStalled(cur, monoNow())) return;
+        st.stalled = true;
         if (tries < GLB_MAX_TRIES) start(); else finish(false, new Error('GLB 下載卡住（' + tries + ' 次）：' + url));
       }, 1000);
     });
@@ -219,22 +233,20 @@ export function glbCached(url) { return glbCache.has(url); }
  * 提前下載（2026-11-21，驗收 docs/acceptance/2026-11-21-lot-prefetch.md）：拍品一抽出來就把 GLB 抓進同一份 glbCache，
  * 出價頁 setItems／夜戰 clone 時直接拿快取。iPhone 慢網路下，原本要到出價頁才開始抓，一夜 3–4 件要等十幾到幾十秒。
  * 只下載＋解析，不 clone、不進場景、不上 GPU。載到回 true、失敗回 false。
- * 卡住時不讓呼叫端的下一批一直等（Codex r1 F3）：這件連續 stallMs 沒收到資料、而且整條線路也停了（glbStalled）就先回 false 放行。
- * 看的是「多久沒收到資料」不是「總共多久」：慢網路下一件本來就可能抓幾十秒、也可能排在別件後面，不能誤判。
+ * 卡住時不讓呼叫端的下一批一直等（Codex r1 F3）：loadGlb 判這件卡住（開始重抓）就先回 false 放行；判法見 loadGlb 上方的三段。
  * 這一件本身不放棄——loadGlb 自己會換網址重抓，接在同一個 promise 上的托盤格子
  * 重抓成功就會出現（r2 F1）。
  * @param {string} url
- * @param {number} [stallMs]
  * @returns {Promise<boolean>}
  */
-export function prefetchGlb(url, stallMs = GLB_STALL_MS) {
+export function prefetchGlb(url) {
   const p = loadGlb(url);
   const st = glbState.get(p);
   return new Promise((resolve) => {
     let timer = null;
     const finish = (ok) => { if (timer) clearInterval(timer); timer = null; resolve(ok); };
     p.then(() => finish(true), () => finish(false));
-    timer = setInterval(() => { if (st && glbStalled(st.lastData, stallMs)) finish(false); }, 1000);
+    timer = setInterval(() => { if (st && st.stalled) finish(false); }, 250);
   });
 }
 
diff --git a/js/renderer.js b/js/renderer.js
index 871136b3..a881bc10 100644
--- a/js/renderer.js
+++ b/js/renderer.js
@@ -273,15 +273,19 @@ function init() {
   const PREFETCH_ON = (() => { try { return new URLSearchParams(location.search || '').get('prefetch') !== '0'; } catch (e) { return true; } })();
   /* 世代號（Codex yaoshi-v0.66.1-r1 F1）：同一分頁重開新局（或換夜）時，上一份預載的「明夜」批次還沒開始的就作廢——
      不然舊局今夜抓完後才啟動的舊局明夜，會跟新局眼前要用的模型搶頻寬。已經在抓的請求無法取消，留在共用快取裡。
-     prefetchGlb 自己會處理「卡住」（太久沒收到資料就放手，F3），今夜批次不會永遠擋住明夜。 */
+     prefetchGlb 自己會處理「卡住」（判卡住開始重抓就放手，F3）。今夜有一件一直斷斷續續有資料、不算卡住也下載不完時，
+     明夜最多等 PREFETCH_NEXT_MAX_MS 就開始（v0.66.2，Codex yaoshi-v0.66.1-r3 F1：明夜批次要有獨立且有上限的等待）。 */
+  const PREFETCH_NEXT_MAX_MS = 45000;
   let prefetchGen = 0;
   const onPrefetch = (d) => {
     if (!PREFETCH_ON) return;
     const gen = ++prefetchGen;
     const urls = (a) => (Array.isArray(a) ? a : []).filter(Boolean).map((k) => creatureGlbUrl(k));
     const now = urls(d.now), next = urls(d.next);
-    Promise.all(now.map((u) => prefetchGlb(u)))
-      .then(() => { if (gen === prefetchGen) return Promise.all(next.map((u) => prefetchGlb(u))); })
+    let capTimer = null;
+    const cap = new Promise((r) => { capTimer = setTimeout(r, PREFETCH_NEXT_MAX_MS); });
+    Promise.race([Promise.all(now.map((u) => prefetchGlb(u))), cap])
+      .then(() => { clearTimeout(capTimer); if (gen === prefetchGen) return Promise.all(next.map((u) => prefetchGlb(u))); })
       .catch(() => {});
   };
   document.addEventListener('ys:prefetch', (e) => onPrefetch((e && e.detail) || {}));
diff --git a/js/table-tray.js b/js/table-tray.js
index c5410a63..81258043 100644
--- a/js/table-tray.js
+++ b/js/table-tray.js
@@ -990,7 +990,10 @@ export function createTableTray(scene, camera, opts = {}) {
       s.bb = f.bounds() || null;
       fitProxy(s);
       s.ready = true;
-    }, () => { s.ready = true; /* GLB 404：這一格空著，但不擋整個托盤 */ });
+    }, () => {
+      if (s.fig !== f || s.key !== key) return; // 這一格已經換貨：舊貨失敗不能把新貨標成就緒（v0.66.2，Codex yaoshi-v0.66.1-r3 F3）
+      s.ready = true; /* GLB 404：這一格空著，但不擋整個托盤 */
+    });
   }
 
   /* 得標不改拍賣資料：暫時移動現有的 3D 展示模型，落到席位後隱藏，下一夜 setItems 會照既有生命週期換貨。
diff --git a/tests/glb-loader.test.mjs b/tests/glb-loader.test.mjs
new file mode 100644
index 00000000..804714de
--- /dev/null
+++ b/tests/glb-loader.test.mjs
@@ -0,0 +1,277 @@
+// 共用 GLB 載入器的回歸測試（v0.66.2；Codex yaoshi-v0.66.1-r3 F1、F2、F3、F5、F6；驗收 docs/acceptance/2026-11-22-v0.66.2-loader.md）。
+// 真頁面、真 three、真載入器／托盤，模型檔走本檔自己的 Node 伺服器（分段傳輸：可以傳到一半停住、斷斷續續給資料、扣住不回）。
+//   F1：一件傳到一半停住、同夜另一件每 10 秒還有資料 → 停住那件仍要在約 20 秒重抓、托盤那格要出現；明夜批次要在有限時間內開始。
+//   F2：位元組收齊、解析拖 25 秒 → 不得被當成下載卡住而重抓（同一檔只能被請求一次、只解析一次）。
+//   F5：一件傳到一半停住後把系統時鐘往回撥／往前撥 120 秒 → 重抓時間仍是停住後約 20 秒（不受校時影響）。
+//   F3：托盤一格換貨後，舊貨才載入失敗 → 新貨那格不得被標成就緒；沒換貨時載入失敗仍標就緒（不擋整個托盤）。
+//   F6：正常線路 → 今夜的模型全部下載完，明夜的才開始。
+// 時間一律用伺服器端（Node）的時鐘量，頁內校時影響不到量測。
+// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import fs from 'node:fs';
+import http from 'node:http';
+import path from 'node:path';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
+const PORT = Number(process.env.YAOSHI_GLBLOADER_PORT || 9795);
+const RATE = 409600; // 每個回應 400KB/s（原始大小），16KB 一塊
+const CHUNK = 16384;
+// 只跑指定情境（除錯／突變驗證用）：YAOSHI_GLBLOADER_ONLY=F1,F6
+const ONLY = (process.env.YAOSHI_GLBLOADER_ONLY || "").split(",").filter(Boolean);
+
+function loadPlaywright() {
+  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
+    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
+  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
+  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
+}
+
+const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
+  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary',
+  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
+  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain' };
+
+/** 模型檔的送法。normal＝照 RATE 送完；partial＝送到 frac 就停（連線不關）；trickle＝先送一塊，之後每 every 毫秒送 step 位元組；
+ *  hold＝不回，等 release(file, status)；nf＝直接 404。 */
+const NORMAL = { kind: 'normal' };
+const PARTIAL = { kind: 'partial', frac: 0.3 };
+const TRICKLE = { kind: 'trickle', every: 10000, step: 2048 };
+const HOLD = { kind: 'hold' };
+const NF = { kind: 'nf' };
+
+function startServer() {
+  const T0 = Date.now();
+  const S = { now: () => Date.now() - T0, log: [], holds: new Map(), timers: new Set(), decide: () => NORMAL };
+  const later = (fn, ms) => { const t = setTimeout(() => { S.timers.delete(t); fn(); }, ms); S.timers.add(t); return t; };
+  const stream = (res, rec, body, plan) => {
+    let o = 0;
+    const stop = plan.kind === 'partial' ? Math.floor(body.length * plan.frac) : body.length;
+    const send = (n) => {
+      if (res.destroyed) return false;
+      const c = body.subarray(o, Math.min(o + n, body.length)); o += c.length;
+      res.write(c); rec.bytes = o; rec.last = S.now(); rec.chunks.push(rec.last); if (rec.first === null) rec.first = rec.last;
+      if (o >= body.length) { res.end(); rec.end = S.now(); return false; }
+      return true;
+    };
+    const tick = () => {
+      if (plan.kind === 'trickle' && rec.first !== null) { if (send(plan.step)) later(tick, plan.every); return; }
+      if (o >= stop) return; // partial：停在這裡，連線不關
+      if (send(Math.min(CHUNK, stop - o))) later(tick, plan.kind === 'trickle' ? plan.every : CHUNK / RATE * 1000);
+    };
+    res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
+    tick();
+  };
+  const server = http.createServer((req, res) => {
+    const u = new URL(req.url, 'http://x');
+    let p = decodeURIComponent(u.pathname);
+    if (p.endsWith('/')) p += 'index.html';
+    const file = path.resolve(SRV_ROOT, '.' + p);
+    if (!file.startsWith(path.resolve(SRV_ROOT))) { res.writeHead(403); res.end(); return; }
+    const glb = /^\/assets\/creatures\/[^/]+\.glb$/.test(p);
+    if (!glb) {
+      fs.readFile(file, (err, buf) => {
+        if (err) { res.writeHead(404); res.end('not found'); return; }
+        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' }); res.end(buf);
+      });
+      return;
+    }
+    const f = path.basename(p);
+    const plan = S.decide(f, u.search) || NORMAL;
+    const rec = { f, q: u.search, kind: plan.kind, t: S.now(), first: null, last: null, end: null, bytes: 0, chunks: [], aborted: null, status: 200 };
+    S.log.push(rec);
+    res.on('close', () => { if (rec.end === null) rec.aborted = S.now(); });
+    let body;
+    try { body = fs.readFileSync(file); } catch (e) { res.writeHead(404); res.end('not found'); rec.status = 404; rec.end = S.now(); return; }
+    if (plan.kind === 'nf') { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); return; }
+    if (plan.kind === 'hold') {
+      S.holds.set(f, (status) => {
+        if (res.destroyed) return;
+        if (status === 404) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); }
+        else stream(res, rec, body, NORMAL);
+      });
+      return;
+    }
+    stream(res, rec, body, plan);
+  });
+  server.keepAliveTimeout = 120000;
+  S.release = (f, status) => { const h = S.holds.get(f); if (h) { S.holds.delete(f); h(status); } };
+  S.reset = () => { S.log.length = 0; S.holds.clear(); S.decide = () => NORMAL; };
+  S.close = () => { for (const t of S.timers) clearTimeout(t); S.timers.clear(); server.closeAllConnections(); return new Promise((r) => server.close(() => r())); };
+  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(S)));
+}
+
+const fileOf = (k) => (k === 'tiger' ? 'tiger_c' : k) + '.glb';
+const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
+async function until(fn, ms, step = 200) { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step); } }
+
+/** 開一個全新 context（不共用快取）的遊戲頁，等托盤與手都載好、線路安靜 3 秒。 */
+async function openGame(browser, S, errs) {
+  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
+  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
+  const page = await ctx.newPage();
+  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
+  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
+  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d && !!window.__yaoshi3d.tray', { timeout: 60000 });
+  await page.waitForFunction('!!window.__yaoshi3d.tray.hands && window.__yaoshi3d.tray.hands.loaded()', { timeout: 60000 });
+  await sleep(3000);
+  S.reset();
+  return { ctx, page };
+}
+const prefetchOf = (page) => page.evaluate(() => { const J = window.__ys3dJournal; return J && J.prefetch ? J.prefetch.detail : null; });
+async function toRound1(page) {
+  const round = () => page.evaluate(() => { const J = window.__ys3dJournal; return J && J.market && J.market.detail ? J.market.detail.round : -1; });
+  for (let i = 0; i < 2000 && (await round()) < 1; i++) {
+    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); return { d: !b || !b.offsetParent || b.disabled }; })()`);
+    if (!st.d) await page.click('#mainbtn').catch(() => {});
+    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button, button')].find(x=>x.offsetParent&&!x.disabled&&/下一頁|開始|知道了|進入|確定|不盯|繼續|跳過|下一夜|蓋牌|開標/.test(x.innerText)); if(e)e.click(); })()`);
+    await sleep(60);
+  }
+  return round();
+}
+const slotOf = (page, key) => page.evaluate((k) => window.__yaoshi3d.tray.items().find((s) => s.key === k) || null, key);
+
+test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗回呼核對身分、明夜等今夜下載完', { timeout: 600000 }, async (t) => {
+  const { chromium } = loadPlaywright();
+  const S = await startServer();
+  const browser = await chromium.launch();
+  const sub = (id, name, fn) => t.test(name, ONLY.length && !ONLY.includes(id) ? { skip: 'YAOSHI_GLBLOADER_ONLY' } : {}, fn);
+  try {
+    await sub('F1', 'F1：傳到一半停住、同夜別件斷續有資料 → 停住那件約 20 秒重抓、托盤那格出現；明夜批次 50 秒內開始', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        const order = [];
+        S.decide = (f, q) => { if (q) return NORMAL; if (!order.includes(f)) order.push(f); const i = order.indexOf(f); return i === 0 ? PARTIAL : i === 1 ? TRICKLE : NORMAL; };
+        const t0 = S.now();
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        const pf = await prefetchOf(page);
+        assert.ok(pf && pf.now && pf.now.length >= 2, '開局沒派今夜預載（至少要 2 件）');
+        const nowFiles = pf.now.map(fileOf), nextOnly = [...new Set(pf.next.map(fileOf))].filter((f) => !nowFiles.includes(f));
+        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
+        const hang = await until(() => S.log.find((r) => r.kind === 'partial'), 10000);
+        const trk = await until(() => S.log.find((r) => r.kind === 'trickle'), 10000);
+        assert.ok(hang && trk, '情境沒布好（停住／斷續那兩件沒被請求）');
+        assert.ok(nowFiles.includes(hang.f) && nowFiles.includes(trk.f), `停住（${hang.f}）／斷續（${trk.f}）不是今夜拍品（${nowFiles}）`);
+        const hangKey = pf.now.find((k) => fileOf(k) === hang.f);
+        const retry = await until(() => S.log.find((r) => r.f === hang.f && /retry=1/.test(r.q)), Math.max(0, t0 + 62000 - S.now()), 250);
+        const tomorrow = await until(() => S.log.find((r) => nextOnly.includes(r.f)), Math.max(0, t0 + 62000 - S.now()), 250);
+        let slot = null;
+        if (retry) slot = await until(async () => { const s = await slotOf(page, hangKey); return s && s.ready && s.visible ? s : null; }, Math.max(0, retry.t + 10000 - S.now()), 200);
+        // 活性：停住那件真的收到部分資料後才停；斷續那件在重抓前 15 秒內真的還有資料（＝線路沒有整條停）
+        assert.ok(hang.bytes > 0 && hang.end === null, `停住那件沒有先收到部分資料（bytes=${hang.bytes}）`);
+        assert.ok(retry, `停住那件（${hang.f}，最後一塊 ${hang.last}ms）開局後 62 秒內都沒重抓（斷續那件每 10 秒還在給資料）`);
+        const trkRecent = trk.chunks.filter((c) => c <= retry.t).pop();
+        assert.ok(trkRecent !== undefined && retry.t - trkRecent < 15000, `重抓當下斷續那件最近一塊在 ${retry.t - trkRecent}ms 前（要 <15000，否則沒行使到「別件還有資料」）`);
+        const gap = retry.t - hang.last;
+        assert.ok(gap >= 18000 && gap <= 25000, `停住後 ${gap}ms 才重抓（有效區間 18000–25000ms）`);
+        assert.ok(slot, `重抓後 10 秒內托盤那格（${hangKey}）沒有就緒且看得到`);
+        assert.ok(nextOnly.length > 0, '明夜沒有今夜以外的拍品，量不到明夜批次');
+        assert.ok(tomorrow && tomorrow.t - t0 <= 50000, `明夜批次開局後 ${tomorrow ? tomorrow.t - t0 + 'ms' : '62 秒內都沒'}才開始（上限 50000ms）`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('F2', 'F2：位元組收齊後解析拖 25 秒 → 不重抓、每個檔只請求一次也只解析一次', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        // 換掉遊戲正在用的同一份 GLTFLoader 模組（importmap 解析，同一個實例）：解析的第一次呼叫拖 25 秒
+        await page.evaluate(() => {
+          const sc = document.createElement('script'); sc.type = 'module';
+          sc.textContent = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; const P = GLTFLoader.prototype, orig = P.parseAsync;"
+            + " window.__slow = { at: null, done: null, n: 0 };"
+            + " P.parseAsync = function (...a) { window.__slow.n++; if (window.__slow.at !== null) return orig.apply(this, a);"
+            + " window.__slow.at = performance.now(); return new Promise((r) => setTimeout(r, 25000)).then(() => orig.apply(this, a)).then((g) => { window.__slow.done = performance.now(); return g; }); };";
+          document.head.appendChild(sc);
+        });
+        await page.waitForFunction('!!window.__slow', { timeout: 10000 });
+        const off = S.now() - (await page.evaluate(() => performance.now())); // 頁內時間 → 伺服器時間
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        await until(() => page.evaluate(() => window.__slow.done !== null), 45000, 500);
+        await sleep(3000);
+        const slow = await page.evaluate(() => window.__slow);
+        assert.ok(slow.at !== null && slow.done !== null, `沒行使到慢解析（at=${slow.at} done=${slow.done}）`);
+        const slowAt = slow.at + off;
+        const files = S.log.map((r) => r.f);
+        // 活性：慢解析開始後第 4–20 秒線路上沒有任何資料（舊寫法在第 20 秒時看到「這件 20 秒、整條線路 15 秒以上沒資料」就重抓）
+        const busy = S.log.flatMap((r) => r.chunks.filter((c) => c > slowAt + 4000 && c < slowAt + 20000).map((c) => r.f + '@' + c));
+        assert.deepEqual(busy, [], `慢解析期間線路沒安靜下來（慢解析從 ${Math.round(slowAt)}ms 開始），沒行使到「線路安靜」`);
+        const dup = [...new Set(files.filter((f, i) => files.indexOf(f) !== i))];
+        assert.deepEqual(dup, [], `解析拖著時被重抓：${dup.join(',')}（${S.log.filter((r) => dup.includes(r.f)).map((r) => r.f + r.q + '@' + r.t).join(' ')}）`);
+        assert.equal(slow.n, new Set(files).size, `解析了 ${slow.n} 次，但只下載了 ${new Set(files).size} 個檔（同一檔解析不只一次）`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    for (const [name, shift] of [['往回撥', -120000], ['往前撥', 120000]]) {
+      await sub('F5', `F5：傳到一半停住後系統時鐘${name} 120 秒 → 仍在停住後 18–25 秒重抓`, async () => {
+        const errs = [];
+        const { ctx, page } = await openGame(browser, S, errs);
+        try {
+          let first = null;
+          S.decide = (f, q) => { if (q) return NORMAL; if (first === null) first = f; return f === first ? PARTIAL : NORMAL; };
+          await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+          const hang = await until(() => S.log.find((r) => r.kind === 'partial' && r.last !== null), 10000);
+          assert.ok(hang, '情境沒布好（停住那件沒被請求）');
+          await until(() => S.now() - hang.last >= 8000 && hang.bytes > 0, 20000, 100);
+          const busy = S.log.filter((r) => r !== hang && r.end === null && r.aborted === null);
+          assert.deepEqual(busy.map((r) => r.f), [], '撥時鐘當下還有別的下載在跑（要等線路安靜才撥）');
+          const jumpAt = S.now();
+          await page.evaluate((d) => { const real = Date.now.bind(Date); Date.now = () => real() + d; }, shift);
+          const retry = await until(() => S.log.find((r) => r.f === hang.f && /retry=1/.test(r.q)), Math.max(0, hang.last + 40000 - S.now()), 100);
+          assert.ok(retry, `時鐘${name}後，停住那件（最後一塊 ${hang.last}ms，${jumpAt}ms 撥鐘）40 秒內都沒重抓`);
+          const gap = retry.t - hang.last;
+          assert.ok(gap >= 18000 && gap <= 25000, `時鐘${name}後，停住 ${gap}ms 就重抓（有效區間 18000–25000ms）`);
+          assert.deepEqual(errs, []);
+        } finally { await ctx.close(); }
+      });
+    }
+
+    await sub('F3', 'F3：托盤一格換貨後舊貨才載入失敗 → 新貨那格不算就緒；沒換貨時失敗仍算就緒', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        S.decide = (f) => (f === 'bell.glb' || f === 'bow.glb' ? HOLD : f === 'chair.glb' ? NF : NORMAL);
+        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
+        assert.ok(await until(() => S.holds.has('bell.glb'), 10000, 50), 'bell 沒被請求');
+        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bow' }]); });
+        assert.ok(await until(() => S.holds.has('bow.glb'), 10000, 50), 'bow 沒被請求');
+        S.release('bell.glb', 404);
+        await sleep(1500);
+        const a = await page.evaluate(() => window.__yaoshi3d.tray.items()[0]);
+        assert.equal(S.log.find((r) => r.f === 'bell.glb').status, 404, '舊貨沒有真的回 404（沒行使到失敗回呼）');
+        assert.equal(a.key, 'bow', `第 0 格應已換成 bow（${a.key}）`);
+        assert.equal(a.ready, false, '舊貨 bell 載入失敗，把已換成 bow、還在下載的那格標成就緒');
+        S.release('bow.glb', 200);
+        const b = await until(async () => { const s = await slotOf(page, 'bow'); return s && s.ready && s.visible ? s : null; }, 10000);
+        assert.ok(b, '放行後 bow 那格 10 秒內沒有就緒且看得到');
+        // 沒換貨：這格自己的貨 404 → 照舊標就緒（空著，不擋托盤）
+        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'chair' }]); });
+        const c = await until(async () => { const s = await slotOf(page, 'chair'); return s && s.ready ? s : null; }, 5000);
+        assert.ok(c && c.visible === false, `chair 404 後那格應標就緒且看不到（${JSON.stringify(c)}）`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('F6', 'F6：正常線路 → 今夜的模型全部下載完，明夜的才開始', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        const pf = await prefetchOf(page);
+        const nowFiles = [...new Set(pf.now.map(fileOf))], nextOnly = [...new Set(pf.next.map(fileOf))].filter((f) => !nowFiles.includes(f));
+        assert.ok(nowFiles.length > 0 && nextOnly.length > 0, `今夜／明夜（不重複）至少各要 1 件（${nowFiles}｜${nextOnly}）`);
+        const done = await until(() => [...nowFiles, ...nextOnly].every((f) => S.log.some((r) => r.f === f && r.end !== null)), 40000);
+        assert.ok(done, '40 秒內今夜＋明夜的模型沒全部下載完');
+        const todayEnd = Math.max(...nowFiles.map((f) => S.log.find((r) => r.f === f).end));
+        const nextStart = Math.min(...nextOnly.map((f) => S.log.find((r) => r.f === f).t));
+        assert.ok(nextStart >= todayEnd, `明夜第一件 ${nextStart}ms 就開始下載，今夜最後一件 ${todayEnd}ms 才下載完（明夜拖慢今夜）`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+  } finally { await browser.close(); await S.close(); }
+});
diff --git a/tests/hand-first-throw.test.mjs b/tests/hand-first-throw.test.mjs
new file mode 100644
index 00000000..b46b6b02
--- /dev/null
+++ b/tests/hand-first-throw.test.mjs
@@ -0,0 +1,88 @@
+// 第一次出手會不會卡（v0.66.2；Codex yaoshi-v0.66.1-r3 F4；驗收 docs/acceptance/2026-11-22-v0.66.2-loader.md）。
+// 舊的 hand-warm-context 只數 currentProgram（程式在不在），沒有量真的第一次出手。這支走真人節奏（開頁就緒後停 8 秒再開局，
+// 像看標題、選角），在「沒有 KHR_parallel_shader_compile」的配置下（init script 把擴充功能藏起來；three 0.158 這時 isReady() 直接回 true，
+// 背景預編只能靠瀏覽器自己在背景編）走到出價頁盯上一件（第一次出手），量手的程式第一次被拿來畫時，
+// getProgramInfoLog／getProgramParameter 同步等了多久（ANGLE D3D11 沒預編時約 2.5–3.1 秒）。
+// 已知不涵蓋：手模型一載好就在 3 秒內出手的極速入局——不論有沒有擴充功能，桌機都要等編譯（約 2.5 秒），見驗收檔 F4。
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import path from 'node:path';
+import { spawn } from 'node:child_process';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
+const PORT = Number(process.env.YAOSHI_FIRSTTHROW_PORT || 9796);
+const HAND = 'hand-skin-proto-b';
+const WAIT = 8000;
+
+function loadPlaywright() {
+  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
+    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
+  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
+  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
+}
+
+test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，手的程式第一次使用時同步等待 ≤ 300ms', { timeout: 180000 }, async () => {
+  const { chromium } = loadPlaywright();
+  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
+  for (let i = 0; i < 75; i++) {
+    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
+    if (ok) break; await new Promise((r) => setTimeout(r, 200));
+  }
+  // 要走真的 GPU（ANGLE D3D11）：預設 headless 是 SwiftShader 軟體繪圖，編譯快、量不出差別（2026-11-22 實測：拿掉預編仍綠）
+  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
+  const errs = [];
+  try {
+    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
+    await ctx.addInitScript(() => {
+      try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
+      window.__gl = [];
+      for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
+        if (!C) continue;
+        const ge = C.prototype.getExtension, gs = C.prototype.getSupportedExtensions;
+        C.prototype.getExtension = function (n) { return n === 'KHR_parallel_shader_compile' ? null : ge.apply(this, arguments); };
+        C.prototype.getSupportedExtensions = function () { const a = gs.apply(this, arguments); return a ? a.filter((n) => n !== 'KHR_parallel_shader_compile') : a; };
+        for (const fn of ['getProgramInfoLog', 'getProgramParameter']) {
+          const o = C.prototype[fn];
+          C.prototype[fn] = function (prog) { const a = performance.now(); const r = o.apply(this, arguments); window.__gl.push({ fn, t: a, d: performance.now() - a, prog }); return r; };
+        }
+      }
+    });
+    const page = await ctx.newPage();
+    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
+    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
+    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
+    const glName = await page.evaluate(() => String(window.__yaoshi3d.glName || ''));
+    assert.match(glName, /D3D11/, `不是 ANGLE D3D11（${glName}），量不到真的編譯等待`);
+    const extSeen = await page.evaluate(() => !!window.__yaoshi3d.renderer.getContext().getExtension('KHR_parallel_shader_compile'));
+    assert.equal(extSeen, false, '擴充功能沒藏起來，量的不是「沒有平行編譯」的配置');
+    await page.waitForTimeout(WAIT);
+    const handsLoaded = await page.evaluate(() => !!(window.__yaoshi3d.tray.hands && window.__yaoshi3d.tray.hands.loaded()));
+    assert.ok(handsLoaded, `開頁就緒後 ${WAIT}ms 手還沒載好，量不到第一次出手`);
+    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
+    await page.waitForSelector('#table.on');
+    for (let i = 0; i < 40; i++) {
+      const st = await page.evaluate(() => { const b = document.querySelector('#mainbtn'); return { mark: !!b && b.textContent.includes('不盯'), disabled: !b || b.disabled }; });
+      if (st.mark) break;
+      if (!st.disabled) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((el) => !el.disabled)?.click());
+      await page.waitForTimeout(150);
+    }
+    await page.waitForFunction(() => document.querySelector('#mainbtn')?.textContent.includes('不盯'), null, { timeout: 30000 });
+    const pickAt = await page.evaluate(() => { const a = performance.now(); pickMark(2); return a; });
+    await page.waitForTimeout(5000);
+    const r = await page.evaluate(({ H, P }) => {
+      const R = window.__yaoshi3d.renderer;
+      const handProgs = new Set(R.info.programs.filter((p) => p.name === H).map((p) => p.program));
+      const hand = window.__gl.filter((x) => handProgs.has(x.prog));
+      const post = hand.filter((x) => x.t >= P);
+      return { progs: handProgs.size, pre: hand.filter((x) => x.t < P).length, post: post.length, maxPost: Math.round(Math.max(0, ...post.map((x) => x.d))) };
+    }, { H: HAND, P: pickAt });
+    // 活性：手的程式在第一次出手之後才第一次被拿來畫（three 第一次使用時才查 getProgramInfoLog；查過就不再查）
+    assert.ok(r.progs > 0, '出價頁後找不到手的程式，第一次出手沒畫手');
+    assert.ok(r.post > 0 && r.pre === 0, `手的程式第一次使用不在出手之後（出手前 ${r.pre} 次、出手後 ${r.post} 次），沒量到第一次出手`);
+    assert.ok(r.maxPost <= 300, `第一次出手時手的程式同步等了 ${r.maxPost}ms（上限 300ms）`);
+    assert.deepEqual(errs, []);
+  } finally { await browser.close(); srv.kill(); }
+});
diff --git a/tests/ui-hierarchy.test.mjs b/tests/ui-hierarchy.test.mjs
index 6c604245..bb6ecbf0 100644
--- a/tests/ui-hierarchy.test.mjs
+++ b/tests/ui-hierarchy.test.mjs
@@ -22,7 +22,7 @@ test('從側欄查看拍品時，3D 桌上同一件也會進入檢視態', () =>
 });
 
 test('首頁顯示可核對的發布版本', () => {
-  assert.match(page, /const RELEASE_VERSION="0.66.1"/, '本次公開版需遞增語意版本');
+  assert.match(page, /const RELEASE_VERSION="0.66.2"/, '本次公開版需遞增語意版本');
   assert.match(page, /v\$\{RELEASE_VERSION\}/, '首頁版本列必須顯示發布版本');
   assert.match(page, /renderer\.js\?v="\+RELEASE_VERSION/, '3D 模組快取鍵必須隨發布版本更新');
   const rel = page.match(/const RELEASE_VERSION="([^"]+)"/)[1];
```
