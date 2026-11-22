review-id: yaoshi-v0.66.3-r3

全部用繁體中文回答，輸出必須符合給你的 JSON schema。JSON 的 `review_id` 欄位填 `yaoshi-v0.66.3-r3`，`summary` 的第一行照抄 `review-id: yaoshi-v0.66.3-r3`。

## 你的角色
你是妖市（瀏覽器 3D 拍賣卡牌遊戲，靜態 HTML／JS，`index.html` 主檔、`js/` 是 3D 層）的獨立技術與規則審查者。你沒參與實作。你的任務是**找出會出錯的情境**，不是確認看起來沒事。

## 你手上有什麼、能做什麼
- 工作目錄是受審 commit `14f13664` 的唯讀快照，含 `docs/`，**沒有 .git**，也沒有基準版的檔案。
- 要審的 diff（`668d98c3..14f13664`，只含規則面路徑；規則面的定義見快照 `CLAUDE.md` 開頭第 7 行）已附在本要求末段「diff」節，**不必也無法自己重算**。若 diff 看起來被截斷，在 summary 寫明，並直接讀快照裡的檔案補完。
- 你可以讀任何檔案、跑不寫檔的唯讀指令（例如 `grep`、`node -e` 讀檔）。環境是唯讀的：不要跑瀏覽器測試、不要跑會寫暫存檔的工具（例如 `tests/tools/trace-eq.mjs`）。
- 修正前的行為只能從 diff 的刪除行與靜態推論得知；iOS Safari 的實機行為也只能靜態推論。**沒辦法實際驗證的判斷，請在 finding 的 `detail` 開頭寫「（推測）」，並在對應 coverage 的 `note` 說明。**
- 本版宣稱做了什麼、驗收條件是什麼：docs/acceptance/2026-11-22-v0.66.3.md（在快照裡）。請拿驗收條件對照實作，條件本身有漏洞也要指出。

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
```json
[
  {
    "id": "F1",
    "severity": "HIGH",
    "file": "js/creature-figures.js",
    "line": 244,
    "title": "別件模型排隊會讓已送達的重抓被誤判為排隊",
    "detail": "（推測）`glbOpen > 6` 即使能證明有請求排隊，也無法指出排隊的是哪一筆。以六條連線的唯讀 Node 模擬執行快照載入器，只多加一筆排隊中的模型請求，就使已送達伺服器的重抓觸發原下載中止。同樣的時序拿掉那筆排隊請求，原下載便能完成。驗收檔第 72 行把全域請求數當成讓出連線的依據，C 只測重抓確實堵住的情況，R 沒把併發墊過六筆，C2 只驗證協定分支。",
    "failure_scenario": "模型 A 和另外四件先佔五條 HTTP/1.1 連線。A 的原下載收過本體後停住，第 22 秒重抓送達並佔第六條，第 24 秒另一件預載排隊。第 33 秒載入器砍掉 A 的原下載，釋放的連線給排隊的另一件。A 原可在第 35 秒續傳、第 36 秒收齊，現在只剩第 38 秒回 404 的重抓，當次托盤那格保持空白。",
    "fix_hint": "用載入器自己的同源併發排程替重抓保留容量，並補測「A 的重抓已送達、B 正在排隊、A 原下載稍後恢復」的案例。"
  },
  {
    "id": "F2",
    "severity": "MEDIUM",
    "file": "tests/glb-loader.test.mjs",
    "line": 564,
    "title": "W 的等待者計數抓不到共用承諾回呼復發",
    "detail": "（推測）W 透過 `glbWaiters` 只讀取訂閱集合大小。用唯讀 Node 對快照載入器做記憶體內突變，在每次訂閱時重新掛一組 `.then`，保留原取消清理。連續取消 124 次後，等待者是 0，但尚未完成的共用承諾已掛上 124 組回呼。W 的計數和單次下載斷言都可維持成立，瀏覽器中的 W 未重跑。",
    "failure_scenario": "日後有人在 `prefetchGlb` 補回逐次掛在共用承諾上的完成回呼，換夜仍照常移除集合中的等待者。W 仍量到 1→0，玩家反覆換夜後，被取消批次的回呼卻繼續累積在斷續下載上。",
    "fix_hint": "讓 W 直接檢查待決共用承諾的訂閱次數，並確認補回逐次掛 `.then` 的突變會使測試失敗。"
  },
  {
    "id": "F3",
    "severity": "MEDIUM",
    "file": "index.html",
    "line": 6425,
    "title": "同頁重開同一夜數會保留上一局的補播事件",
    "detail": "（推測）本版 `newGame` 重設載入遮罩，既有日誌仍只在夜數改變時清出價、盯上與揭盅事件。唯讀 Node 執行日誌函式已確認，兩局同為第 1 夜時，新市集會覆蓋舊市集，舊出價卻仍留著。晚到的 renderer 會先套新市集，再依序補舊出價。這是既有的同頁入口缺口，N 只量遮罩，且公開的局末按鈕會整頁重載。",
    "failure_scenario": "renderer 尚在載入時，第一局第 1 夜對第 0 格出價 5。透過同頁 `newGame` 開第二局，仍在第 1 夜，第 0 格已是另一件拍品。此時 renderer 才註冊，會把上一局的 5 枚錢補到第二局的新拍品前。",
    "fix_hint": "在同頁新局送出局次變更事件，讓日誌與已就緒的托盤一起清場，並補測兩局同夜數且 renderer 晚到的情境。"
  }
]
```

## diff
```diff
diff --git a/index.html b/index.html
index c76580aa..d23ad2a8 100644
--- a/index.html
+++ b/index.html
@@ -10,7 +10,7 @@
 <meta name="mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
-<link rel="stylesheet" href="assets/theme.css?v=0.66.2"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
+<link rel="stylesheet" href="assets/theme.css?v=0.66.3"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
 <style>
 /* ===== 佔位美術：正式版整批替換，邏輯層不得依賴任何樣式 =====
    ===== 美術層（2026-09-03 起）：色彩／字型變數與動畫 keyframes 在 assets/theme.css，
@@ -1235,7 +1235,7 @@ h2{font-size:16px;color:var(--gold);margin:2px 0 8px}
   .asc-fold{background:none;border:0;border-bottom:1px dashed var(--asc-zhu);font-size:.92em}
   .asc-fold::after{content:" ▾";font-weight:700}
 </style>
-<link rel="stylesheet" href="assets/safe-area.css?v=0.66.2"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
+<link rel="stylesheet" href="assets/safe-area.css?v=0.66.3"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
   不照 sfx／renderer 用 RELEASE_VERSION 字串拼接：這個 <link> 在 <head>、早於主 script，那時 RELEASE_VERSION 還沒定義；
   挪到主 script 之後注入會先畫一幀沒套這份樣式的畫面，而主 script 前又不能多開一支 script 標籤（tests/tools/load.mjs 只抓第一個）。 -->
 <script type="importmap">
@@ -2948,9 +2948,9 @@ function chainHintHTML(p,it){
 /* ?sim=1 進平衡模擬器工具頁，不影響正常遊戲頁（不自動執行、不動任何既有流程） */
 /* ===== 版本字串單一事實來源（2026-09-02 使用者裁定）：每次改版只改下面這一行，<title> 與首頁那行都由此帶出；
    使用者以首頁字串判斷是否已推上線；線上檢查用 grep 'VERSION="' ===== */
-const VERSION="0.66.2", VERSION_NOTE="0.66.2：網路慢時，法寶模型下載到一半停住，約 20 秒後會另外再下載一份（原本那份不中斷，哪份先下載完就用哪份；原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；還沒開始下載的模型最多排隊 45 秒就重新要一次；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；牌桌某一格換成別件法寶後，前一件才載入失敗時，不會再把新的那一格當成已經擺好。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
+const VERSION="0.66.3", VERSION_NOTE="0.66.3：法寶模型下載的內部處理——換夜後不再留著用不到的等待。純效能，畫面與結算不變。0.66.2：網路慢時，法寶模型下載到一半停住，約 20 秒後會另外再下載一份（原本那份不中斷，哪份先下載完就用哪份；原本要等其他模型都下載完、線路整條安靜下來才重抓，期間桌上那一格一直空著）；還沒開始下載的模型最多排隊 45 秒就重新要一次；下一夜的法寶模型最多等今夜 45 秒就開始在背景下載；牌桌某一格換成別件法寶後，前一件才載入失敗時，不會再把新的那一格當成已經擺好。純效能，畫面與結算不變。0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
 /* 每次部署遞增此版號；首頁顯示與 asset query 都讀它，讓玩家可核實公開頁。 */
-const RELEASE_VERSION="0.66.2";
+const RELEASE_VERSION="0.66.3";
 /* ===== 音訊診斷與喚醒（2026-09-03，使用者回報 v0.27 iPhone 整個沒聲音、🔇 與靜音撥桿都排除）=====
    我沒有 iPhone 可重現，所以把每一層的狀態印在規則頁最上面，讓使用者唸給我聽：
    ctx 有沒有／state（iOS 特有 "interrupted"）／取樣率／音效開關／sfx.js 有沒有載到（聲部數）／最後一次 play 與例外／
@@ -3850,7 +3850,8 @@ function pushMarket3d(){ fx3d("ys:market",{items:market3dItems(),seats:market3dS
 /* ===== 開局載入畫面（v0.59.10）=====
    新局第一次需要 3D 桌面（第一次 pushMarket3d）起算：1000ms 後 tray 仍未全就緒才露出 #trayLoad「請神入座中…」（快取命中不閃），
    tray 就緒（readyCount>=本夜件數）立即移除；上限 12 秒也移除（之後桌面晚到仍靠 renderer 補播補上，遊戲不等它）。
-   一個頁面生命週期只跑一次（之後每夜換件走既有路，不再顯示）；?table3d=0／?tray3d=0 不顯示。
+   每局只跑一次（之後每夜換件走既有路，不再顯示）；同頁開新局時 newGame 呼叫 trayLoadReset 重設，新局從自己的第一次市集事件起算
+   （v0.66.3，Codex yaoshi-v0.66.2-r3 F4；局末一律整頁重載，玩家實際體驗不變）。?table3d=0／?tray3d=0 不顯示。
    renderer 尚未載入時沒有事件可聽，所以每 100ms 輪詢 window.__yaoshi3d.tray（只讀）。進度＝readyCount／本夜件數；tray 未定義時是不確定進度。 */
 const TRAYLOAD={SHOW_MS:1000,MAX_MS:12000,state:"idle",el:null,showT:0,maxT:0,poll:0};
 function trayReady3d(){ try{ const Y=window.__yaoshi3d, n=S&&S.market?S.market.length:0; return !!(Y&&Y.tray&&n>0&&Y.tray.readyCount()>=n); }catch(e){ return false; } }
@@ -3876,6 +3877,7 @@ function trayLoadEnd(){
   clearTimeout(L.showT); clearTimeout(L.maxT); clearInterval(L.poll);
   try{ if(L.el&&L.el.parentNode) L.el.parentNode.removeChild(L.el); }catch(e){} L.el=null;
 }
+function trayLoadReset(){ trayLoadEnd(); TRAYLOAD.state="idle"; } /* 同頁新局：清掉上一局的計時與遮罩，回到等第一次市集事件 */
 function trayLoadWatch(){
   const L=TRAYLOAD; if(L.state!=="idle"||typeof TABLE3D==="undefined"||!TABLE3D||!TRAY3D) return;
   L.state="wait";
@@ -4378,6 +4380,7 @@ function makeState(mode,seed,picks,privateDestinyDraws,destinyEffectMode="origin
   return S;
 }
 function newGame(mode,seed,picks,opts){
+  trayLoadReset();
   TAB_SEEN=new Set(); APPR_HINT_DONE=false; apprHintRemove();
   YB_COLLAPSED=false; CHAIN_SEEN.clear(); WISHCHIP_SEEN.clear(); PUBLIC_REVEAL=null; PRIVATE_PHASE="none"; REVEAL_ANIMATING=false; NW_OPEN_SAID=false; NW_BUBBLE=null; bubClear();
   try{ if(opts&&opts.chapter!=null) makeState(mode,seed,picks,undefined,undefined,undefined,opts); else makeState(mode,seed,picks);}catch(e){
diff --git a/js/creature-figures.js b/js/creature-figures.js
index 847cdf29..c99b3f83 100644
--- a/js/creature-figures.js
+++ b/js/creature-figures.js
@@ -143,8 +143,9 @@ const glbCache = new Map();
      · 第 GLB_MAX_TRIES 次也卡住 → 放棄（中止全部）。
    - 解析中（位元組收齊）：不歸下載計時管、不重抓本體；超過 GLB_PARSE_MAX_MS 沒回成功或失敗 → 判失敗、清出快取，下次要這件會重新下載（r1 F3）。
    - 計時一律用單調時鐘（monoNow），系統校時不影響（r3 F5）。
-   glbState：promise → { stalled, waiters }＝這一份曾被判卡住（開始重抓或放棄）；waiters＝等「判卡住」通知的預載呼叫（判卡住時一次通知並清空，
-   不各自開計時器輪詢，r2 F2）。 */
+   glbState：promise → { stalled, settled, waiters }：stalled＝這一份曾被判卡住（開始重抓或放棄）；settled＝null 還沒結束／true 成功／false 失敗；
+   waiters＝預載呼叫的訂閱（函式，收 'stall'、true、false），判卡住或結束時通知，不各自開計時器輪詢（r2 F2）。每份共用載入只掛一組完成回呼來通知它們，
+   預載呼叫不再自己對共用承諾加 then——取消時從集合移除就不留任何回呼（v0.66.3，Codex yaoshi-v0.66.3-r1 F2）。 */
 const GLB_STALL_MS = 20000;
 const GLB_IDLE_MS = 15000;
 const GLB_QUEUE_MAX_MS = 45000;
@@ -187,7 +188,7 @@ async function fetchGlbBytes(u, signal, onData) {
 function loadGlb(url) {
   if (!glbCache.has(url)) {
     if (!loader) loader = new GLTFLoader();
-    const st = { stalled: false, waiters: new Set() };
+    const st = { stalled: false, settled: null, waiters: new Set() };
     const p = new Promise((resolve, reject) => {
       let settled = false, tries = 0, timer = null;
       const live = []; // 還在的請求 { ctl, startAt, lastAt（標頭或本體）, bodyAt（本體）, gotBody, parsing, parseAt }，最後一個最新
@@ -225,13 +226,15 @@ function loadGlb(url) {
         if (cur.parsing) { if (now - cur.parseAt > GLB_PARSE_MAX_MS) finish(false, new Error('GLB 解析逾時：' + url)); return; }
         if (!glbStalled(live, now)) return;
         st.stalled = true;
-        for (const w of [...st.waiters]) w();
+        for (const w of [...st.waiters]) w('stall');
         if (tries >= GLB_MAX_TRIES) { finish(false, new Error('GLB 下載卡住（' + tries + ' 次）：' + url)); return; }
         for (const a of live.slice()) if (!a.gotBody) drop(a); // 沒收到本體的先中止；收到過的留著並行
         start();
       }, 1000);
     });
     glbState.set(p, st);
+    const notify = (ok) => { st.settled = ok; for (const w of [...st.waiters]) w(ok); };
+    p.then(() => notify(true), () => notify(false)); // 每份只這一組（r1 F2）
     p.catch(() => { if (glbCache.get(url) === p) glbCache.delete(url); });
     glbCache.set(url, p);
   }
@@ -253,6 +256,10 @@ export function cloneSkinnedGlb(url) {
 }
 /** 治具出口（只讀）：這個 URL 是否已在 GLB 快取裡（證明席位之手與紙紮妖共用同一份 glbCache）。 */
 export function glbCached(url) { return glbCache.has(url); }
+/** 治具出口（只讀，v0.66.3 Codex yaoshi-v0.66.2-r3 F2）：這個 URL 目前的共用下載上還掛著幾個預載等待者（不在快取＝0）。 */
+export function glbWaiters(url) { const p = glbCache.get(url); const st = p && glbState.get(p); return st ? st.waiters.size : 0; }
+/** 治具出口（v0.66.3，Codex yaoshi-v0.66.3-r2 F2）：這個 URL 目前的共用下載承諾（不在快取＝null）。只給測試數「有沒有人對它掛 then」；遊戲程式不要用。 */
+export function glbShared(url) { return glbCache.get(url) || null; }
 /**
  * 提前下載（2026-11-21，驗收 docs/acceptance/2026-11-21-lot-prefetch.md）：拍品一抽出來就把 GLB 抓進同一份 glbCache，
  * 出價頁 setItems／夜戰 clone 時直接拿快取。iPhone 慢網路下，原本要到出價頁才開始抓，一夜 3–4 件要等十幾到幾十秒。
@@ -260,19 +267,29 @@ export function glbCached(url) { return glbCache.has(url); }
  * 卡住時不讓呼叫端的下一批一直等（Codex r1 F3）：loadGlb 判這件卡住（開始重抓）就先回 false 放行；判法見 loadGlb 上方的說明。
  * 這一件本身不放棄——loadGlb 自己會換網址重抓，接在同一個 promise 上的托盤格子
  * 重抓成功就會出現（r2 F1）。
+ * signal（v0.66.3，Codex yaoshi-v0.66.2-r3 F2）：呼叫端不再等時（換夜／新局換世代、批次等待上限到了）中止它——從共用下載的訂閱集合移除並回 false；
+ * 共用下載本身不取消（別的呼叫端照用）。這個呼叫只有那一筆訂閱，沒有對共用承諾加 then，移除後不留任何回呼（Codex yaoshi-v0.66.3-r1 F2）。
  * @param {string} url
+ * @param {AbortSignal} [signal]
  * @returns {Promise<boolean>}
  */
-export function prefetchGlb(url) {
+export function prefetchGlb(url, signal) {
   const p = loadGlb(url);
   const st = glbState.get(p);
   return new Promise((resolve) => {
     let done = false;
-    const finish = (ok) => { if (done) return; done = true; if (st) st.waiters.delete(onStall); resolve(ok); };
-    const onStall = () => finish(false);
-    if (st && st.stalled) { finish(false); return; } // 這份之前就判過卡住：不擋下一批
-    if (st) st.waiters.add(onStall);
-    p.then(() => finish(true), () => finish(false));
+    const finish = (ok) => {
+      if (done) return; done = true;
+      st.waiters.delete(w);
+      if (signal) signal.removeEventListener('abort', onAbort);
+      resolve(ok);
+    };
+    const w = (ev) => finish(ev === true); // 'stall'／false → 放行；true → 載到
+    const onAbort = () => finish(false);
+    if (st.settled !== null) { finish(st.settled); return; }
+    if ((signal && signal.aborted) || st.stalled) { finish(false); return; } // 已取消，或這份之前就判過卡住：不擋下一批
+    st.waiters.add(w);
+    if (signal) signal.addEventListener('abort', onAbort);
   });
 }
 
diff --git a/js/renderer.js b/js/renderer.js
index a881bc10..df25dfe1 100644
--- a/js/renderer.js
+++ b/js/renderer.js
@@ -274,18 +274,27 @@ function init() {
   /* 世代號（Codex yaoshi-v0.66.1-r1 F1）：同一分頁重開新局（或換夜）時，上一份預載的「明夜」批次還沒開始的就作廢——
      不然舊局今夜抓完後才啟動的舊局明夜，會跟新局眼前要用的模型搶頻寬。已經在抓的請求無法取消，留在共用快取裡。
      prefetchGlb 自己會處理「卡住」（判卡住開始重抓就放手，F3）。今夜有一件一直斷斷續續有資料、不算卡住也下載不完時，
-     明夜最多等 PREFETCH_NEXT_MAX_MS 就開始（v0.66.2，Codex yaoshi-v0.66.1-r3 F1：明夜批次要有獨立且有上限的等待）。 */
+     明夜最多等 PREFETCH_NEXT_MAX_MS 就開始（v0.66.2，Codex yaoshi-v0.66.1-r3 F1：明夜批次要有獨立且有上限的等待）。
+     不再等的就解除訂閱（v0.66.3，Codex yaoshi-v0.66.2-r3 F2）：每批今夜、明夜各一個中止器；換世代時中止上一批兩個，今夜等到上限時中止今夜那個——
+     舊批次不再掛著等待者（共用下載本身照舊，別的呼叫端照用）。 */
   const PREFETCH_NEXT_MAX_MS = 45000;
-  let prefetchGen = 0;
+  const abortCtl = () => (typeof AbortController === 'function' ? new AbortController() : null);
+  let prefetchBatch = null;
   const onPrefetch = (d) => {
     if (!PREFETCH_ON) return;
-    const gen = ++prefetchGen;
+    if (prefetchBatch) { if (prefetchBatch.now) prefetchBatch.now.abort(); if (prefetchBatch.next) prefetchBatch.next.abort(); }
+    const batch = prefetchBatch = { now: abortCtl(), next: abortCtl() };
+    const sig = (c) => (c ? c.signal : undefined);
     const urls = (a) => (Array.isArray(a) ? a : []).filter(Boolean).map((k) => creatureGlbUrl(k));
     const now = urls(d.now), next = urls(d.next);
     let capTimer = null;
     const cap = new Promise((r) => { capTimer = setTimeout(r, PREFETCH_NEXT_MAX_MS); });
-    Promise.race([Promise.all(now.map((u) => prefetchGlb(u))), cap])
-      .then(() => { clearTimeout(capTimer); if (gen === prefetchGen) return Promise.all(next.map((u) => prefetchGlb(u))); })
+    Promise.race([Promise.all(now.map((u) => prefetchGlb(u, sig(batch.now)))), cap])
+      .then(() => {
+        clearTimeout(capTimer);
+        if (batch.now) batch.now.abort(); // 今夜等完或到上限：還掛著的今夜等待者一律解除
+        if (batch === prefetchBatch) return Promise.all(next.map((u) => prefetchGlb(u, sig(batch.next))));
+      })
       .catch(() => {});
   };
   document.addEventListener('ys:prefetch', (e) => onPrefetch((e && e.detail) || {}));
diff --git a/tests/glb-loader.test.mjs b/tests/glb-loader.test.mjs
index 9f516812..7f10471e 100644
--- a/tests/glb-loader.test.mjs
+++ b/tests/glb-loader.test.mjs
@@ -10,6 +10,19 @@
 //   H：40 秒才回標頭、之後沒有本體 → 排隊上限從請求開始算（43–50 秒重抓），不被晚到的標頭重設。
 //   X：解析永遠不回 → 45 秒後判失敗、期間不重抓本體；之後再要同一件會重新下載並出現。
 //   Codex yaoshi-v0.66.2-r2 後：Q（r2 F1）原請求收過本體後停住、重抓要排隊 25 秒 → 排隊中的重抓不得被 20 秒門檻砍掉；F1 明夜下限 43 秒（r2 F3）。
+//   v0.66.3（Codex yaoshi-v0.66.2-r3；驗收 docs/acceptance/2026-11-22-v0.66.3.md）：
+//   C（r3 F1：HTTP/1.1 六條全被停住的原請求佔滿時重抓要送得出去）已撤：製作人 2026-11-22 同意撤掉讓出機制與條件 1（驗收檔修訂一）。C2、R、M、K 留著守
+//   「不中止會恢復的原下載」，以後要再加讓出規則得先過它們。
+//   W（r3 F2）：同一件一直斷續有資料時連續 4 次預載（換夜／新局）→ 舊批次的等待者要解除，只留最新一批；45 秒上限放行後也要解除。
+//   N（r3 F4）：同頁開新局 →「請神入座」遮罩從新局自己的第一次市集事件起算（不被上一局的 12 秒計時收掉；上一局已結束的也要重新監看）。
+//   X 加上下界、新增 Y（r3 F7）：解析逾時要在解析開始後 43–50 秒收尾；解析 40 秒後才完成的那件要上桌。
+//   Codex yaoshi-v0.66.3-r1 後：R（r1 F1）原下載收過本體後停住、約第 35 秒恢復，重抓已送達但 16 秒後才回 404 → 不得中止會恢復的原下載，那格要出現；
+//   C2（r1 F1）六件原請求都收過本體後停住（原 C 的布置）、頁面回報 h2 → 不讓出連線。
+//   Codex yaoshi-v0.66.3-r2 後：M（r2 F1）五件原請求佔五條連線（這件收過本體後停住、約第 35 秒恢復，另四件斷續有資料），這件的重抓佔第六條、
+//   16 秒後才回 404，之後別件排隊 → 不得因為「別件在排隊」中止這件會恢復的原下載，那格要出現；
+//   W 加嚴（r2 F2）：第 2–4 次預載派發當下，不得有人對 bell 的共用下載承諾掛 then（catch／finally／Promise.all 也經過 then）。
+//   送 r3 前預審（fresh agent 模擬的 M′）：K 六件原請求佔滿六條連線（這件收過本體後停住、約第 35 秒恢復，另五件斷續有資料），這件的重抓只能排隊、
+//   16 秒後才會回 404 → 名額不是全被停住的請求佔著（別件還在傳、遲早讓出），不得中止會恢復的原下載，那格要出現。
 // 時間一律用伺服器端（Node）的時鐘量，頁內校時影響不到量測。
 // 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
 import assert from 'node:assert/strict';
@@ -49,6 +62,8 @@ const TRICKLE = { kind: 'trickle', every: 10000, step: 2048 };
 const PAUSE = { kind: 'pause', frac: 0.3, pause: 22000 };
 const LATEHEADERS = { kind: 'lateheaders', delay: 40000 };
 const DELAYED = { kind: 'delayed', delay: 25000 }; // 排隊 delay 毫秒才回標頭，之後照 RATE 送完
+const LONGPAUSE = { kind: 'pause', frac: 0.3, pause: 34000 }; // v0.66.3 r1 F1：停 34 秒後恢復（約第 35 秒）
+const LATE404 = { kind: 'late404', delay: 16000 }; // v0.66.3 r1 F1：伺服器收到請求後 16 秒才回 404（重抓已送達、標頭晚到又失敗）
 const HOLD = { kind: 'hold' };
 const NF = { kind: 'nf' };
 
@@ -99,6 +114,7 @@ function startServer() {
     let body;
     try { body = fs.readFileSync(file); } catch (e) { res.writeHead(404); res.end('not found'); rec.status = 404; rec.end = S.now(); return; }
     if (plan.kind === 'nf') { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); return; }
+    if (plan.kind === 'late404') { later(() => { if (res.destroyed) return; rec.headersAt = S.now(); res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found'); rec.status = 404; rec.end = S.now(); }, plan.delay); return; }
     if (plan.kind === 'delayed') { later(() => { if (!res.destroyed) stream(res, rec, body, NORMAL); }, plan.delay); return; }
     if (plan.kind === 'lateheaders') {
       later(() => { if (res.destroyed) return; res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': body.length, 'Cache-Control': 'no-store' }); res.flushHeaders(); rec.headersAt = S.now(); }, plan.delay);
@@ -128,9 +144,11 @@ async function until(fn, ms, step = 200) { const t0 = Date.now(); for (;;) { con
 async function untilBy(S, fn, deadline, step = 100) { for (;;) { if (S.now() > deadline) return null; const v = await fn(); if (v && S.now() <= deadline) return v; await sleep(step); } }
 
 /** 開一個全新 context（不共用快取）的遊戲頁，等托盤與手都載好、線路安靜 3 秒。 */
-async function openGame(browser, S, errs) {
+async function openGame(browser, S, errs, init) {
   const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true });
+  S.decide = () => NORMAL; // 上一個情境的送法不帶進開頁（v0.66.3 r2：M 的送法會讓手的模型斷續送、開頁等不到，後面的情境不論實作都過不了）
   await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
+  if (init) await ctx.addInitScript(init);
   const page = await ctx.newPage();
   page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
   await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
@@ -152,8 +170,27 @@ async function toRound1(page) {
   return round();
 }
 const slotOf = (page, key) => page.evaluate((k) => window.__yaoshi3d.tray.items().find((s) => s.key === k) || null, key);
+/** 頁內呼叫遊戲正在用的同一份 creature-figures 模組（網址照 renderer 的版本參數組，才是同一個實例）。 */
+const cf = (page, fn, ...args) => page.evaluate(async ({ fn, args }) => {
+  const s = [...document.scripts].find((x) => /\/js\/renderer\.js(\?|$)/.test(x.src));
+  const m = await import(new URL('creature-figures.js' + new URL(s.src).search, s.src).href);
+  if (typeof m[fn] !== 'function') throw new Error('creature-figures 沒有 ' + fn);
+  return m[fn](...args);
+}, { fn, args });
+/** 點過教學／事件頁，直到頁內 window.__pm（pushMarket3d 的頁內時間）出現 since 之後的一筆；回那一筆。 */
+async function toMarketSince(page, since) {
+  for (let i = 0; i < 2000; i++) {
+    const t = await page.evaluate((s) => (window.__pm || []).find((x) => x >= s) ?? null, since);
+    if (t !== null) return t;
+    const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); return { d: !b || !b.offsetParent || b.disabled }; })()`);
+    if (!st.d) await page.click('#mainbtn').catch(() => {});
+    else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button, button')].find(x=>x.offsetParent&&!x.disabled&&/下一頁|開始|知道了|進入|確定|不盯|繼續|跳過|下一夜|蓋牌|開標/.test(x.innerText)); if(e)e.click(); })()`);
+    await sleep(60);
+  }
+  return null;
+}
 
-test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗回呼核對身分、明夜等今夜下載完', { timeout: 600000 }, async (t) => {
+test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗回呼核對身分、明夜等今夜下載完', { timeout: 1200000 }, async (t) => {
   const { chromium } = loadPlaywright();
   const S = await startServer();
   const browser = await chromium.launch();
@@ -251,6 +288,168 @@ test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗
       } finally { await ctx.close(); }
     });
 
+    /** C2 的布置（與已撤的 C 共用過）：每件原請求送 30% 後停住（連線不關）、重抓正常；今夜拍品＋另補幾件湊滿 6 份停住的原請求。 */
+    const setupC = async (page) => {
+      S.decide = (f, q) => (q ? NORMAL : PARTIAL);
+      await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+      const pf = await prefetchOf(page);
+      assert.ok(pf && pf.now && pf.now.length >= 2, '開局沒派今夜預載（至少要 2 件）');
+      const nowFiles = [...new Set(pf.now.map(fileOf))], nextFiles = new Set(pf.next.map(fileOf));
+      // 另外補幾件模型一起下載（＝仍在背景下載的模型），湊滿 6 份停住的原請求。用預載事件派：換了世代，明夜批次不會再開始，線上只剩這 6 份
+      const extra = fs.readdirSync(path.join(SRV_ROOT, 'assets/creatures')).filter((f) => f.endsWith('.glb') && !/^hand/.test(f) && f !== 'tiger.glb'
+        && !nowFiles.includes(f) && !nextFiles.has(f)).sort().slice(0, Math.max(0, 6 - nowFiles.length)).map((f) => f.replace(/\.glb$/, ''));
+      await page.evaluate((now) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now, next: [] } })), [...pf.now, ...extra]);
+      assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
+      const want = [...nowFiles, ...extra.map((k) => k + '.glb')];
+      // 活性：6 份原請求同時收過本體、停住、連線還開著（＝瀏覽器對這台主機的 6 條連線全被佔住）
+      const full = await until(() => { const o = S.log.filter((r) => !r.q && want.includes(r.f) && r.bytes > 0 && r.end === null && r.aborted === null); return o.length >= 6 ? o : null; }, 15000);
+      assert.ok(full, `沒湊滿 6 份停住的原請求（${S.log.filter((r) => !r.q).map((r) => r.f + ':' + r.bytes).join(' ')}）`);
+      const first = Math.min(...full.map((r) => r.t));
+      const hist = (f) => S.log.filter((r) => r.f === f).map((r) => (r.q || '-') + '@' + r.t + (r.first !== null ? '▶' + r.first : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
+      const proto = await page.evaluate(() => performance.getEntriesByType('navigation')[0].nextHopProtocol);
+      return { pf, want, full, first, hist, proto };
+    };
+
+    await sub('C2', 'C2：六件原請求都收過本體後停住（原 C 的布置）、頁面回報 h2 → 不讓出連線（第一次請求後 40 秒內沒有任何原請求被中止）', async () => {
+      const errs = [];
+      // 本機測試伺服器只有 HTTP/1.1：把頁面看到的協定改報 h2，守「不中止會恢復的原下載」（當初量的是「只有 HTTP/1.1 才讓出」那道開關，讓出機制已撤；實際 h2 傳輸未在本機量，正式站實測 h2 見 DECISIONS 2026-11-22）
+      const { ctx, page } = await openGame(browser, S, errs, () => {
+        Object.defineProperty(PerformanceResourceTiming.prototype, 'nextHopProtocol', { configurable: true, get() { return 'h2'; } });
+      });
+      try {
+        const { full, first, hist, proto } = await setupC(page);
+        assert.equal(proto, 'h2', `頁面看到的協定沒改成 h2（${proto}）`);
+        await until(() => S.now() >= first + 40000, 60000, 250);
+        const early = full.filter((r) => r.aborted !== null && r.aborted < first + 40000);
+        assert.deepEqual(early.map((r) => r.f), [], `頁面回報 h2，原請求仍被中止讓出連線：${early.map((r) => r.f + '[' + hist(r.f) + ']').join(' ')}`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('R', 'R：原下載收過本體後停住、約第 35 秒恢復；重抓已送達但 16 秒後才回 404 → 不中止會恢復的原下載，那格在第一次請求後 45 秒內出現', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        const order = [];
+        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); return order.indexOf(f) === 0 ? (q ? LATE404 : LONGPAUSE) : NORMAL; };
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        const pf = await prefetchOf(page);
+        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
+        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
+        assert.ok(a, '情境沒布好（長停頓那件沒被請求）');
+        const key = pf.now.find((k) => fileOf(k) === a.f);
+        assert.ok(key, `長停頓那件（${a.f}）不是今夜拍品`);
+        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 45000, 250);
+        await until(() => S.log.some((r) => r.f === a.f && r.q && r.end !== null), Math.max(0, a.t + 45000 - S.now()), 250);
+        const r1 = S.log.find((r) => r.f === a.f && /retry=1/.test(r.q));
+        const hist = S.log.filter((r) => r.f === a.f).map((r) => (r.q || '-') + '@' + r.t + (r.headersAt !== null ? 'H' + r.headersAt : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
+        // 活性（只看布置，不看結果）：原下載先收過本體才停；重抓真的送到伺服器，而且到伺服器預定讓原下載恢復時，重抓已等標頭超過 10 秒（＝舊規則會在這段中止原下載）
+        assert.ok(a.pauseAt !== null && a.bytes > 0, `原下載沒有先收到部分本體就停（bytes=${a.bytes}）`);
+        assert.ok(r1, `沒有重抓（${hist}）`);
+        const resumePlan = a.pauseAt + LONGPAUSE.pause;
+        assert.ok(resumePlan - r1.t > 10000 && (r1.headersAt === null || r1.headersAt > resumePlan), `預定恢復（${resumePlan}ms）時重抓（${r1.t}ms 送出、標頭 ${r1.headersAt}ms）沒有等標頭超過 10 秒，沒行使到「重抓標頭晚到」：${hist}`);
+        assert.ok(a.aborted === null || a.aborted >= resumePlan, `會恢復的原下載在預定恢復（${resumePlan}ms）前就被中止（${a.aborted}ms）：${hist}`);
+        assert.ok(slot, `第一次請求後 45 秒內那格（${key}）沒有就緒且看得到：${hist}`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('M', 'M：五件原請求佔五條連線（這件收過本體後停住、約第 35 秒恢復，另四件斷續有資料）、這件的重抓佔第六條且 16 秒後才回 404、之後別件排隊 → 不中止會恢復的原下載，那格在第一次請求後 45 秒內出現', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        const order = []; let bFile = null;
+        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); if (order.indexOf(f) === 0) return q ? LATE404 : LONGPAUSE; return f === bFile ? NORMAL : TRICKLE; };
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        const pf = await prefetchOf(page);
+        assert.ok(pf && pf.now && pf.now.length >= 1, '開局沒派今夜預載');
+        const nowFiles = [...new Set(pf.now.map(fileOf))], nextFiles = new Set(pf.next.map(fileOf));
+        assert.ok(nowFiles.length <= 5, `今夜 ${nowFiles.length} 件，超過 5 件，布不出「五件原請求＋這件的重抓＝6 條」`);
+        // 另外補幾件（斷續有資料、一直傳不完）湊滿 5 份原請求；再留一件 B（正常線路）之後派來排隊。用預載事件派：換了世代，明夜批次不會開始
+        const pool = fs.readdirSync(path.join(SRV_ROOT, 'assets/creatures')).filter((f) => f.endsWith('.glb') && !/^hand/.test(f) && f !== 'tiger.glb'
+          && !nowFiles.includes(f) && !nextFiles.has(f)).sort();
+        const extra = pool.slice(0, 5 - nowFiles.length).map((f) => f.replace(/\.glb$/, ''));
+        bFile = pool[5 - nowFiles.length];
+        await page.evaluate((now) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now, next: [] } })), [...pf.now, ...extra]);
+        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
+        const proto = await page.evaluate(() => performance.getEntriesByType('navigation')[0].nextHopProtocol);
+        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
+        assert.ok(a, '情境沒布好（長停頓那件沒被請求）');
+        const key = pf.now.find((k) => fileOf(k) === a.f);
+        assert.ok(key, `長停頓那件（${a.f}）不是今夜拍品`);
+        // 這件的重抓送到伺服器 2 秒後，派一件新的預載（B）：6 條連線都被佔著，B 只能排隊
+        const r1 = await until(() => S.log.find((r) => r.f === a.f && /retry=1/.test(r.q)), Math.max(0, a.t + 30000 - S.now()), 100);
+        await until(() => r1 && S.now() >= r1.t + 2000, 5000, 100);
+        const tB = S.now();
+        await page.evaluate((k) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now: [k], next: [] } })), bFile.replace(/\.glb$/, ''));
+        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 45000, 250);
+        await until(() => S.log.some((r) => r.f === bFile) && S.log.some((r) => r.f === a.f && r.q && r.end !== null), Math.max(0, a.t + 60000 - S.now()), 250);
+        const b = S.log.find((r) => r.f === bFile);
+        const hist = (f) => S.log.filter((r) => r.f === f).map((r) => (r.q || '-') + '@' + r.t + (r.headersAt !== null ? 'H' + r.headersAt : '') + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
+        const resumePlan = a.pauseAt + LONGPAUSE.pause;
+        const openAt = (t) => S.log.filter((r) => r.t <= t && (r.end === null || r.end > t) && (r.aborted === null || r.aborted > t));
+        // 活性（只看布置，不看結果）：HTTP/1.x；原下載先收過本體才停；重抓真的送到伺服器、佔的是第 6 條（當下另有 5 份請求開著）、
+        // 預定恢復時已等標頭超過 10 秒；B 在預定恢復前 10 秒以上派出、而且真的排過隊（派出 5 秒後才到伺服器）；另四件到預定恢復時都還開著
+        assert.match(proto, /^http\/1/i, `頁面不是走 HTTP/1.x（${proto}），沒行使到每主機 6 條連線上限`);
+        assert.ok(a.pauseAt !== null && a.bytes > 0, `原下載沒有先收到部分本體就停（bytes=${a.bytes}）`);
+        assert.ok(r1, `沒有重抓（${hist(a.f)}）`);
+        const others = openAt(r1.t).filter((r) => r !== r1);
+        assert.equal(others.length, 5, `重抓送到伺服器時另有 ${others.length} 份請求開著（要 5 份：重抓佔第 6 條）：${others.map((r) => r.f + (r.q || '')).join(' ')}`);
+        assert.ok(resumePlan - r1.t > 10000 && (r1.headersAt === null || r1.headersAt > resumePlan), `預定恢復（${resumePlan}ms）時重抓（${r1.t}ms 送出、標頭 ${r1.headersAt}ms）沒有等標頭超過 10 秒：${hist(a.f)}`);
+        assert.ok(resumePlan - tB > 10000, `B 在 ${tB}ms 才派出，離預定恢復（${resumePlan}ms）不到 10 秒`);
+        assert.ok(b && b.t - tB > 5000, `B（${bFile}）派出（${tB}ms）後 ${b ? b.t - tB + 'ms 就' : '一直沒'}到伺服器，沒行使到「別件在排隊」`);
+        const trk = S.log.filter((r) => r.kind === 'trickle' && !r.q);
+        assert.ok(trk.length === 4 && trk.every((r) => r.aborted === null || r.aborted > resumePlan), `斷續有資料的另四件沒有一直佔著連線到預定恢復：${trk.map((r) => r.f + '[' + hist(r.f) + ']').join(' ')}`);
+        // 行為
+        assert.ok(a.aborted === null || a.aborted >= resumePlan, `別件排隊時，會恢復的原下載在預定恢復（${resumePlan}ms）前就被中止（${a.aborted}ms）：${hist(a.f)}`);
+        assert.ok(slot, `第一次請求後 45 秒內那格（${key}）沒有就緒且看得到：${hist(a.f)}`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('K', 'K：六件原請求佔滿六條連線（這件收過本體後停住、約第 35 秒恢復，另五件斷續有資料）、這件的重抓只能排隊且 16 秒後才會回 404 → 別件還在傳，不中止會恢復的原下載，那格在第一次請求後 45 秒內出現', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        const order = [];
+        S.decide = (f, q) => { if (!order.includes(f)) order.push(f); if (order.indexOf(f) === 0) return q ? LATE404 : LONGPAUSE; return q ? NORMAL : TRICKLE; };
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        const pf = await prefetchOf(page);
+        assert.ok(pf && pf.now && pf.now.length >= 1, '開局沒派今夜預載');
+        const nowFiles = [...new Set(pf.now.map(fileOf))], nextFiles = new Set(pf.next.map(fileOf));
+        assert.ok(nowFiles.length <= 6, `今夜 ${nowFiles.length} 件，超過 6 件，布不出「六件原請求佔滿六條」`);
+        // 另外補幾件（斷續有資料、一直傳不完）湊滿 6 份原請求。用預載事件派：換了世代，明夜批次不會開始
+        const extra = fs.readdirSync(path.join(SRV_ROOT, 'assets/creatures')).filter((f) => f.endsWith('.glb') && !/^hand/.test(f) && f !== 'tiger.glb'
+          && !nowFiles.includes(f) && !nextFiles.has(f)).sort().slice(0, 6 - nowFiles.length).map((f) => f.replace(/\.glb$/, ''));
+        await page.evaluate((now) => document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now, next: [] } })), [...pf.now, ...extra]);
+        assert.equal(await toRound1(page), 1, '沒走到第 1 夜拍品上桌');
+        const proto = await page.evaluate(() => performance.getEntriesByType('navigation')[0].nextHopProtocol);
+        const a = await until(() => S.log.find((r) => r.kind === 'pause'), 10000);
+        assert.ok(a, '情境沒布好（長停頓那件沒被請求）');
+        const key = pf.now.find((k) => fileOf(k) === a.f);
+        assert.ok(key, `長停頓那件（${a.f}）不是今夜拍品`);
+        const slot = await untilBy(S, async () => { const s = await slotOf(page, key); return s && s.ready && s.visible ? s : null; }, a.t + 45000, 250);
+        const resumePlan = a.pauseAt + LONGPAUSE.pause;
+        await until(() => S.now() > resumePlan, Math.max(0, resumePlan - S.now() + 5000), 250);
+        const hist = (f) => S.log.filter((r) => r.f === f).map((r) => (r.q || '-') + '@' + r.t + (r.aborted !== null ? '✗' + r.aborted : '') + (r.end !== null ? '✓' + r.end : '')).join(' ');
+        const openAt = (t) => S.log.filter((r) => r.t <= t && (r.end === null || r.end > t) && (r.aborted === null || r.aborted > t));
+        // 活性（只看布置，不看結果）：HTTP/1.x；原下載先收過本體才停；停住 22 秒時（已判卡住、重抓在排隊）伺服器上正好 6 份原請求開著＝六條全佔；
+        // 另五件斷續有資料、到預定恢復時都還開著、預定恢復前 20 秒內都有資料（＝佔著名額的不是全都停住）。
+        // 預定恢復（停住後 34 秒）晚於「判卡住（約 21 秒）＋排隊 10 秒」，r2 的讓出規則會在這段中止原下載
+        assert.match(proto, /^http\/1/i, `頁面不是走 HTTP/1.x（${proto}），沒行使到每主機 6 條連線上限`);
+        assert.ok(a.pauseAt !== null && a.bytes > 0, `原下載沒有先收到部分本體就停（bytes=${a.bytes}）`);
+        const full = openAt(a.pauseAt + 22000);
+        assert.ok(full.length === 6 && full.includes(a) && full.every((r) => !r.q), `停住 22 秒時伺服器上開著的不是 6 份原請求：${full.map((r) => r.f + (r.q || '')).join(' ')}`);
+        const trk = S.log.filter((r) => r.kind === 'trickle' && !r.q);
+        assert.ok(trk.length === 5 && trk.every((r) => (r.aborted === null || r.aborted > resumePlan) && r.chunks.some((c) => c > resumePlan - 20000 && c <= resumePlan)),
+          `另五件沒有一直開著、在預定恢復前 20 秒內有資料：${trk.map((r) => r.f + '[' + hist(r.f) + '] ' + r.chunks.join(',')).join(' ')}`);
+        // 行為
+        assert.ok(a.aborted === null || a.aborted >= resumePlan, `別件還在傳時，會恢復的原下載在預定恢復（${resumePlan}ms）前就被中止（${a.aborted}ms）：${hist(a.f)}`);
+        assert.ok(slot, `第一次請求後 45 秒內那格（${key}）沒有就緒且看得到：${hist(a.f)}`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
     await sub('H', 'H：40 秒才回標頭、之後沒有本體、別件斷續有資料 → 仍在第一次請求後 43–50 秒重抓（排隊上限從請求開始算，不被標頭重設）', async () => {
       const errs = [];
       const { ctx, page } = await openGame(browser, S, errs);
@@ -284,13 +483,18 @@ test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗
           document.head.appendChild(sc);
         });
         await page.waitForFunction('!!window.__hang', { timeout: 10000 });
+        const off = S.now() - (await page.evaluate(() => performance.now())); // 頁內時間 → 伺服器時間
         const t0 = S.now();
         await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
-        const ready = await untilBy(S, async () => { const s = await slotOf(page, 'bell'); return s && s.ready ? s : null; }, t0 + 60000, 250);
+        let readyAt = null;
+        const ready = await untilBy(S, async () => { const s = await slotOf(page, 'bell'); if (s && s.ready) { readyAt = S.now(); return s; } return null; }, t0 + 60000, 250);
         const hang = await page.evaluate(() => window.__hang);
         assert.ok(hang.at !== null, '沒行使到永不回的解析');
         assert.ok(ready, '解析永不回時，60 秒內那格一直沒有收尾（待決承諾留著）');
         assert.equal(ready.visible, false, '解析沒完成，那格卻看得到');
+        // v0.66.3（Codex yaoshi-v0.66.2-r3 F7）：從解析開始算，收尾要接近 45 秒上限（過短的上限會讓 35 秒就能完成的解析被判失敗）
+        const el = Math.round(readyAt - (hang.at + off));
+        assert.ok(el >= 43000 && el <= 50000, `解析開始後 ${el}ms 就收尾（有效區間 43000–50000ms）`);
         assert.deepEqual(S.log.filter((r) => r.f === 'bell.glb').map((r) => r.q), [''], '解析等待期間本體被重抓');
         // 之後再要同一件：要重新下載（快取已清），這次解析正常 → 出現
         await page.evaluate(() => { window.__yaoshi3d.tray.setItems([]); window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
@@ -406,5 +610,123 @@ test('GLB 載入器：卡住重抓、解析另計、單調時鐘、托盤失敗
         assert.deepEqual(errs, []);
       } finally { await ctx.close(); }
     });
+
+    await sub('Y', 'Y：解析 40 秒後才完成（接近 45 秒上限但來得及）→ 那格出現、不重抓本體', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        await page.evaluate(() => {
+          const sc = document.createElement('script'); sc.type = 'module';
+          sc.textContent = "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; const P = GLTFLoader.prototype, orig = P.parseAsync;"
+            + " window.__slow40 = { at: null, done: null, n: 0 };"
+            + " P.parseAsync = function (...a) { window.__slow40.n++; if (window.__slow40.at !== null) return orig.apply(this, a);"
+            + " window.__slow40.at = performance.now(); return new Promise((r) => setTimeout(r, 40000)).then(() => orig.apply(this, a)).then((g) => { window.__slow40.done = performance.now(); return g; }); };";
+          document.head.appendChild(sc);
+        });
+        await page.waitForFunction('!!window.__slow40', { timeout: 10000 });
+        const off = S.now() - (await page.evaluate(() => performance.now()));
+        await page.evaluate(() => { window.__yaoshi3d.tray.setItems([{ key: 'bell' }]); });
+        const at = await until(() => page.evaluate(() => window.__slow40.at), 10000, 100);
+        assert.ok(at, '沒行使到慢解析（bell 沒進到解析）');
+        const slot = await untilBy(S, async () => { const s = await slotOf(page, 'bell'); return s && s.ready ? s : null; }, at + off + 50000, 250);
+        const s40 = await page.evaluate(() => window.__slow40);
+        assert.ok(slot, '解析開始後 50 秒內那格一直沒有收尾');
+        assert.equal(slot.visible, true, `解析 40 秒後完成，那格卻是空的（被判解析逾時）：${JSON.stringify(slot)}`);
+        assert.ok(s40.done !== null && s40.done - s40.at >= 39000, `慢解析沒真的拖到 40 秒（${JSON.stringify(s40)}）`);
+        assert.deepEqual(S.log.filter((r) => r.f === 'bell.glb').map((r) => r.q), [''], '解析等待期間本體被重抓');
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('W', 'W：同一件一直斷續有資料時連續 4 次預載 → 舊批次的等待者解除、只留最新一批；45 秒上限放行後也解除', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        const url = 'assets/creatures/bell.glb';
+        S.decide = (f) => (f === 'bell.glb' ? TRICKLE : NORMAL); // 每 10 秒 2KB：一直在動、不算卡住，也下載不完
+        // 派發當下（同步執行預載處理）才計數：window.__thenCnt.on
+        const fire = () => page.evaluate(() => { const c = window.__thenCnt; if (c) c.on = true; try { document.dispatchEvent(new CustomEvent('ys:prefetch', { detail: { now: ['bell'], next: [] } })); } finally { if (c) c.on = false; } });
+        await fire(); await sleep(1000);
+        // r2 F2：第 1 次預載已建好 bell 的共用下載承諾；之後 3 次派發當下，數對它呼叫 then 的次數（catch／finally／Promise.all 都經過 then）
+        const hasShared = await page.evaluate(async (u) => {
+          const s = [...document.scripts].find((x) => /\/js\/renderer\.js(\?|$)/.test(x.src));
+          const m = await import(new URL('creature-figures.js' + new URL(s.src).search, s.src).href);
+          const p = typeof m.glbShared === 'function' ? m.glbShared(u) : null;
+          const c = window.__thenCnt = { on: false, all: 0, shared: 0 };
+          const orig = window.__thenOrig = Promise.prototype.then;
+          Promise.prototype.then = function (...a) { if (c.on) { c.all++; if (p && this === p) c.shared++; } return orig.apply(this, a); };
+          return !!p;
+        }, url);
+        for (let i = 1; i < 4; i++) { await fire(); await sleep(1000); }
+        const tc = await page.evaluate(() => { Promise.prototype.then = window.__thenOrig; const c = window.__thenCnt; window.__thenCnt = null; return c; });
+        const lastAt = S.now();
+        const w4 = await cf(page, 'glbWaiters', url);
+        assert.equal(w4, 1, `連續 4 次預載後 bell 的共用下載上還掛著 ${w4} 個等待者（只該留最新一批的 1 個）`);
+        // 活性：bell 的共用下載承諾在；計數真的開著（派發當下預載處理自己的 Promise.all／race 有經過 then）
+        assert.ok(hasShared, '拿不到 bell 的共用下載承諾（治具出口 glbShared）');
+        assert.ok(tc.all > 0, `第 2–4 次預載派發當下沒有任何 then 呼叫（${JSON.stringify(tc)}），計數沒行使到`);
+        assert.equal(tc.shared, 0, `第 2–4 次預載派發當下對 bell 的共用下載承諾掛了 ${tc.shared} 次 then（取消後這些回呼拆不掉，會隨換夜累積）`);
+        const w0 = await untilBy(S, async () => ((await cf(page, 'glbWaiters', url)) === 0 ? true : null), lastAt + 50000, 500);
+        const bells = S.log.filter((r) => r.f === 'bell.glb');
+        // 活性：整段期間 bell 只有一份共用下載、一直在傳（沒下載完、沒被判卡住重抓、沒被中止）
+        assert.equal(bells.length, 1, `bell 被請求 ${bells.length} 次（應只有一份共用下載）：${bells.map((r) => (r.q || '-') + '@' + r.t).join(' ')}`);
+        assert.ok(bells[0].end === null && bells[0].aborted === null && bells[0].chunks.length >= 4, `bell 已下載完、被中止或沒在傳（${bells[0].chunks.length} 塊），沒行使到「一直有資料、還沒下載完」`);
+        assert.ok(w0, `最新一批等滿 45 秒放行後，bell 上的等待者到 ${lastAt + 50000}ms 仍沒解除（${await cf(page, 'glbWaiters', url)} 個）`);
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
+
+    await sub('N', 'N：同頁開新局 →「請神入座」從新局自己的第一次市集事件起算；上一局遮罩已結束的新局也重新監看', async () => {
+      const errs = [];
+      const { ctx, page } = await openGame(browser, S, errs);
+      try {
+        S.decide = () => HOLD; // 模型一直不回：托盤不會就緒，遮罩只會被 12 秒上限收掉
+        await page.evaluate(() => {
+          window.__pm = []; const o = pushMarket3d;
+          pushMarket3d = function () { window.__pm.push(performance.now()); return o.apply(this, arguments); };
+          window.__tl = [];
+          new MutationObserver(() => { const on = !!document.getElementById('trayLoad'), l = window.__tl; if (!l.length || l[l.length - 1].on !== on) l.push({ t: performance.now(), on }); })
+            .observe(document.body, { childList: true, subtree: true });
+        });
+        const pnow = () => page.evaluate(() => performance.now());
+        const waitUntilPage = (t) => page.waitForFunction((x) => performance.now() >= x, t, { timeout: 60000, polling: 100 });
+        const tl = () => page.evaluate(() => window.__tl);
+        const isOn = (L, t) => { let on = false; for (const e of L) if (e.t <= t) on = e.on; return on; };
+        // 第一局
+        const g1 = await pnow();
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
+        const a1 = await toMarketSince(page, g1);
+        assert.ok(a1 !== null, '第一局沒走到市集');
+        await waitUntilPage(a1 + 6000);
+        assert.ok(isOn(await tl(), a1 + 5900), '第一局模型一直不回，遮罩卻沒出現（情境沒布好）');
+        // 第二局：在第一局 12 秒上限之前開
+        const g2 = await pnow();
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 2, ['qingmian']));
+        const b1 = await toMarketSince(page, g2);
+        assert.ok(b1 !== null, '第二局沒走到市集');
+        assert.ok(b1 < a1 + 11000, `第二局第一次市集事件太晚（第一局起算 ${Math.round(b1 - a1)}ms），第一局的 12 秒計時沒落在第二局遮罩期間，沒行使到`);
+        await waitUntilPage(b1 + 13500);
+        const L2 = (await tl()).filter((e) => e.t >= b1);
+        const offIn = L2.filter((e) => !e.on && e.t > b1 + 2000 && e.t < b1 + 11500);
+        const off2 = L2.find((e) => !e.on && e.t >= b1 + 2000);
+        const fmt = (L, base) => L.map((e) => (e.on ? '+' : '-') + Math.round(e.t - base)).join(' ');
+        assert.ok(isOn(await tl(), b1 + 2000), `第二局第一次市集事件後 2 秒遮罩不在（相對第二局：${fmt(L2, b1)}）`);
+        assert.deepEqual(offIn.map((e) => Math.round(e.t - b1)), [], `第二局遮罩在自己 12 秒上限前被收掉（相對第二局 ms；第一局起算 ${Math.round(b1 - a1)}ms）`);
+        assert.ok(off2 && off2.t - b1 >= 11500 && off2.t - b1 <= 13000, `第二局遮罩收掉的時間不在第二局起算 11500–13000ms（${off2 ? Math.round(off2.t - b1) : '沒收'}）`);
+        // 第三局：上一局遮罩已經結束 → 新局要重新監看、再出現
+        await waitUntilPage(off2.t + 1000);
+        const g3 = await pnow();
+        await page.evaluate(() => window.__yaoshi.newGame('solo', 3, ['qingmian']));
+        const c1 = await toMarketSince(page, g3);
+        assert.ok(c1 !== null, '第三局沒走到市集');
+        await waitUntilPage(c1 + 2500);
+        const L3 = (await tl()).filter((e) => e.t >= c1);
+        const on3 = L3.find((e) => e.on);
+        assert.ok(on3 && on3.t - c1 >= 800 && on3.t - c1 <= 2000, `上一局遮罩已結束，第三局第一次市集事件後 0.8–2 秒遮罩沒再出現（相對第三局：${fmt(L3, c1)}）`);
+        // 活性：整段模型都沒回（托盤沒就緒），遮罩只會因上限收掉
+        assert.equal(await page.evaluate(() => trayReady3d()), false, '托盤已就緒，沒行使到「模型一直沒到」');
+        assert.deepEqual(errs, []);
+      } finally { await ctx.close(); }
+    });
   } finally { await browser.close(); await S.close(); }
 });
diff --git a/tests/hand-first-throw.test.mjs b/tests/hand-first-throw.test.mjs
index 2fce9d7c..d5f24387 100644
--- a/tests/hand-first-throw.test.mjs
+++ b/tests/hand-first-throw.test.mjs
@@ -4,6 +4,8 @@
 // 背景預編只能靠瀏覽器自己在背景編）走到出價頁盯上一件（第一次出手），量手的程式第一次被拿來畫時，
 // getProgramInfoLog／getProgramParameter 同步等了多久（ANGLE D3D11 沒預編時約 2.5–3.1 秒）。
 // 已知不涵蓋：手模型一載好就在 3 秒內出手的極速入局——不論有沒有擴充功能，桌機都要等編譯（約 2.5 秒），見驗收檔 F4。
+// v0.66.3（Codex yaoshi-v0.66.2-r3 F3；驗收 docs/acceptance/2026-11-22-v0.66.3.md）：「第一次畫手」的終點改成手的程式第一次真的送出繪製
+// （攔 useProgram 記下目前的程式、攔 draw* 記每個程式第一次畫的時間），不再拿第一次程式查詢代替；程式查詢的同步等待照舊另外量。
 import assert from 'node:assert/strict';
 import test from 'node:test';
 import path from 'node:path';
@@ -41,7 +43,7 @@ test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，
     const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
     await ctx.addInitScript(() => {
       try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
-      window.__gl = []; window.__lt = [];
+      window.__gl = []; window.__lt = []; window.__fd = new Map();
       try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
       for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
         if (!C) continue;
@@ -52,6 +54,13 @@ test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，
           const o = C.prototype[fn];
           C.prototype[fn] = function (prog) { const a = performance.now(); const r = o.apply(this, arguments); window.__gl.push({ fn, t: a, d: performance.now() - a, prog }); return r; };
         }
+        // 每個程式第一次真的送出繪製的時間（r3 F3）
+        const up = C.prototype.useProgram;
+        C.prototype.useProgram = function (p) { this.__ysProg = p; return up.apply(this, arguments); };
+        for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
+          const o = C.prototype[fn]; if (!o) continue;
+          C.prototype[fn] = function () { const p = this.__ysProg; if (p && !window.__fd.has(p)) window.__fd.set(p, performance.now()); return o.apply(this, arguments); };
+        }
       }
     });
     const page = await ctx.newPage();
@@ -81,10 +90,15 @@ test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，
       const handProgs = new Set(R.info.programs.filter((p) => p.name === H).map((p) => p.program));
       const hand = window.__gl.filter((x) => handProgs.has(x.prog));
       const post = hand.filter((x) => x.t >= P);
-      const first = post.length ? Math.min(...post.map((x) => x.t)) : null;
-      // 第一次畫手所在的那一幀：包含第一次手程式查詢的長任務（沒有＝那幀不到 50ms）（Codex yaoshi-v0.66.2-r1 F6）
+      const firstQuery = post.length ? Math.min(...post.map((x) => x.t)) : null;
+      // 第一次畫手＝手的程式第一次真的送出繪製（r3 F3；舊版用第一次程式查詢 firstQuery 代替）
+      const draws = [...handProgs].map((p) => window.__fd.get(p)).filter((x) => x !== undefined);
+      const drawPost = draws.filter((x) => x >= P);
+      const first = drawPost.length ? Math.min(...drawPost) : null;
+      // 第一次畫手所在的那一幀：包含第一次畫手的長任務（沒有＝那幀不到 50ms）（Codex yaoshi-v0.66.2-r1 F6）
       const frame = first === null ? null : window.__lt.filter((e) => e.s <= first && first <= e.s + e.d).reduce((m, e) => Math.max(m, e.d), 0);
-      return { progs: handProgs.size, pre: hand.filter((x) => x.t < P).length, post: post.length, maxPost: Math.round(Math.max(0, ...post.map((x) => x.d))),
+      return { progs: handProgs.size, pre: hand.filter((x) => x.t < P).length, post: post.length, drawPre: draws.filter((x) => x < P).length, drawPost: drawPost.length,
+        queryToDraw: first === null || firstQuery === null ? null : Math.round(first - firstQuery), maxPost: Math.round(Math.max(0, ...post.map((x) => x.d))),
         sumPost: Math.round(post.reduce((a, x) => a + x.d, 0)), frame: frame === null ? null : Math.round(frame), pickToFirst: first === null ? null : Math.round(first - P), ltObserved: window.__lt.length,
         // 點下去到第一次畫手之間（含第一次畫手那一刻）最長的主執行緒卡頓（Codex yaoshi-v0.66.2-r2 F5）
         preFirst: first === null ? null : Math.round(window.__lt.filter((e) => e.s <= first && e.s + e.d >= P).reduce((m, e) => Math.max(m, e.d), 0)) };
@@ -92,6 +106,7 @@ test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，
     // 活性：手的程式在第一次出手之後才第一次被拿來畫（three 第一次使用時才查 getProgramInfoLog；查過就不再查）
     assert.ok(r.progs > 0, '出價頁後找不到手的程式，第一次出手沒畫手');
     assert.ok(r.post > 0 && r.pre === 0, `手的程式第一次使用不在出手之後（出手前 ${r.pre} 次、出手後 ${r.post} 次），沒量到第一次出手`);
+    assert.ok(r.drawPost > 0 && r.drawPre === 0, `手的程式第一次送出繪製不在出手之後（出手前 ${r.drawPre} 個、出手後 ${r.drawPost} 個程式），沒量到第一次畫手`);
     console.log('[FIRSTTHROW] ' + JSON.stringify(r));
     assert.ok(r.maxPost <= 300, `第一次出手時手的程式同步等了 ${r.maxPost}ms（上限 300ms）`);
     assert.ok(r.ltObserved > 0, '瀏覽器沒回報任何長任務，量不到整幀卡頓');
diff --git a/tests/ui-hierarchy.test.mjs b/tests/ui-hierarchy.test.mjs
index bb6ecbf0..5de09acd 100644
--- a/tests/ui-hierarchy.test.mjs
+++ b/tests/ui-hierarchy.test.mjs
@@ -22,7 +22,7 @@ test('從側欄查看拍品時，3D 桌上同一件也會進入檢視態', () =>
 });
 
 test('首頁顯示可核對的發布版本', () => {
-  assert.match(page, /const RELEASE_VERSION="0.66.2"/, '本次公開版需遞增語意版本');
+  assert.match(page, /const RELEASE_VERSION="0.66.3"/, '本次公開版需遞增語意版本');
   assert.match(page, /v\$\{RELEASE_VERSION\}/, '首頁版本列必須顯示發布版本');
   assert.match(page, /renderer\.js\?v="\+RELEASE_VERSION/, '3D 模組快取鍵必須隨發布版本更新');
   const rel = page.match(/const RELEASE_VERSION="([^"]+)"/)[1];
```
