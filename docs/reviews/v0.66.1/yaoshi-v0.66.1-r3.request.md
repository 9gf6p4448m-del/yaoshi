
review-id: yaoshi-v0.66.1-r3

全部用繁體中文回答，輸出必須符合給你的 JSON schema。JSON 的 `review_id` 欄位填 `yaoshi-v0.66.1-r3`，`summary` 的第一行照抄 `review-id: yaoshi-v0.66.1-r3`。

## 你的角色
你是妖市（瀏覽器 3D 拍賣卡牌遊戲，靜態 HTML／JS，`index.html` 主檔、`js/` 是 3D 層）的獨立技術與規則審查者。你沒參與實作。你的任務是**找出會出錯的情境**，不是確認看起來沒事。

## 你手上有什麼、能做什麼
- 工作目錄是受審 commit `79af5f85` 的唯讀快照，含 `docs/`，**沒有 .git**，也沒有基準版的檔案。
- 要審的 diff（`bebb8fd9..79af5f85`，只含規則面路徑；規則面的定義見快照 `CLAUDE.md` 開頭第 7 行）已附在本要求末段「diff」節，**不必也無法自己重算**。若 diff 看起來被截斷，在 summary 寫明，並直接讀快照裡的檔案補完。
- 你可以讀任何檔案、跑不寫檔的唯讀指令（例如 `grep`、`node -e` 讀檔）。環境是唯讀的：不要跑瀏覽器測試、不要跑會寫暫存檔的工具（例如 `tests/tools/trace-eq.mjs`）。
- 修正前的行為只能從 diff 的刪除行與靜態推論得知；iOS Safari 的實機行為也只能靜態推論。**沒辦法實際驗證的判斷，請在 finding 的 `detail` 開頭寫「（推測）」，並在對應 coverage 的 `note` 說明。**
- 本版宣稱做了什麼、驗收條件是什麼：docs/acceptance/2026-11-21-hand-shader-warm.md, docs/acceptance/2026-11-21-lot-prefetch.md（在快照裡）。請拿驗收條件對照實作，條件本身有漏洞也要指出。

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
  "line": 181,
  "title": "拍品逾時重抓成功後，已上桌的格子仍綁著舊請求",
  "detail": "逾時只移除快取項目並結束預載端的等待。已取得舊 Promise 的正式載入仍等原請求。唯讀探針用受控載入器確認，明夜批次已放行且同 URL 重抓已成功，原消費端仍是 pending。托盤在 js/table-tray.js:982 等該次正式載入成功才顯示模型。驗收檔第 44 行也記載這條空桌路徑。",
  "failure_scenario": "第 1 夜預載某件法寶時，連線在送出部分資料後停住。玩家在 20 秒內進入出價頁，托盤共用該請求。逾時後，即使另一個消費端重抓並拿到模型，只要舊請求未結束且本夜未重新推送拍品，原格就一直空著。",
  "fix_hint": "讓正式載入共用具有限時重試的結果，並在更新模型前核對格子仍屬於同一批拍品。"
 },
 {
  "id": "F2",
  "severity": "MEDIUM",
  "file": "js/creature-figures.js",
  "line": 138,
  "title": "每次逾時重抓都留下舊下載，新請求仍可能和舊請求搶頻寬",
  "detail": "（推測）逾時後只靠遞增查詢參數啟動新請求。Three.js r158 的 FileLoader 沒有可供此呼叫端取消請求的介面。舊傳輸若稍後恢復，兩份資料都可能下載並解析。驗收檔第 20–22 行只看正常線路的請求起始順序與重複項目，無法判定逾時重抓時的頻寬競爭。[Three.js r158 FileLoader 原始碼](https://raw.githubusercontent.com/mrdoob/three.js/r158/src/loaders/FileLoader.js)",
  "failure_scenario": "慢線路連續兩次停頓超過門檻，玩家換夜時再次用到同一模型。原 URL、retry=1 和 retry=2 各自有未結束的請求。網路恢復後，舊請求可能與最新請求一起傳輸，拉長玩家正在等的拍品載入時間。",
  "fix_hint": "使用可取消的下載流程，在重試前中止舊傳輸，並加入逾時後檢查同一模型在途請求數的驗收案例。"
 },
 {
  "id": "F3",
  "severity": "MEDIUM",
  "file": "tests/hand-warm-context.test.mjs",
  "line": 55,
  "title": "手部回歸測試能驗證程式已建立，無法驗證首次出手不卡頓",
  "detail": "（推測）新測試補上首頁已有手部程式的斷言，但只數 currentProgram，沒有觸發或量測實際出手。在缺少 KHR_parallel_shader_compile 的裝置上，Three.js r158 會直接將 isReady() 視為 true，首次繪製仍可能阻塞。驗收檔第 41 行記載桌機 R 路徑的實測，快速入局與缺少擴充功能的路徑仍無同等證據。[Three.js r158 WebGLProgram 原始碼](https://raw.githubusercontent.com/mrdoob/three.js/r158/src/renderers/webgl/WebGLProgram.js)",
  "failure_scenario": "玩家用缺少該擴充功能的裝置，在手模型剛載好時快速進出價頁。首頁程式存在的斷言已能通過，第一次繪製手時仍可能等 GPU 完成，與首頁版本說明的「第一次有人出手時，畫面不再卡住」不符。",
  "fix_hint": "新增缺少擴充功能及快速入局的首次出手量測，並依實測範圍描述發布效果。"
 },
 {
  "id": "F4",
  "severity": "MEDIUM",
  "file": "tests/lot-prefetch.test.mjs",
  "line": 59,
  "title": "拍品回歸測試用系統時鐘量測，校時可能掩蓋超時",
  "detail": "（推測）市場事件即時記錄起點，已消除上一輪的輪詢補記問題。起點與終點仍取 Date.now()，而第 98 行僅驗證差值不大於 1000ms，系統時鐘向後調整時，耗時可能被低估，負值也可通過。",
  "failure_scenario": "第 2 夜市場事件派出後，模型實際花 2600ms 才就緒。期間系統時鐘往回調 2000ms，測試便只記到 600ms，放行超出門檻的結果。",
  "fix_hint": "頁內事件及就緒時間統一用 performance.now()，並將有效區間限制為 0 到 1000ms。"
 }
]
```

## diff
```diff
diff --git a/.gitignore b/.gitignore
index 8b519486..2b9ee4e7 100644
--- a/.gitignore
+++ b/.gitignore
@@ -11,3 +11,5 @@ legend-drive.json
 COMMITMSG.txt
 # 量測用的樹副本與中間產物（r6 LOW-6：以前只靠「記得不要 git add -A」，改成機械擋）
 scratchpad/
+# Codex 審查的原始 stdout 只留本機（可能夾帶本機環境資訊；14 §3）
+docs/reviews/**/*.stdout.log
diff --git a/index.html b/index.html
index 19fd52ee..ebeb96ad 100644
--- a/index.html
+++ b/index.html
@@ -10,7 +10,7 @@
 <meta name="mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-capable" content="yes">
 <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
-<link rel="stylesheet" href="assets/theme.css?v=0.66.0"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
+<link rel="stylesheet" href="assets/theme.css?v=0.66.1"><!-- v0.59.0：字型與色票 token 改了，同樣帶發布版本當快取鑰匙（與下方 safe-area.css 同一個值） -->
 <style>
 /* ===== 佔位美術：正式版整批替換，邏輯層不得依賴任何樣式 =====
    ===== 美術層（2026-09-03 起）：色彩／字型變數與動畫 keyframes 在 assets/theme.css，
@@ -1235,7 +1235,7 @@ h2{font-size:16px;color:var(--gold);margin:2px 0 8px}
   .asc-fold{background:none;border:0;border-bottom:1px dashed var(--asc-zhu);font-size:.92em}
   .asc-fold::after{content:" ▾";font-weight:700}
 </style>
-<link rel="stylesheet" href="assets/safe-area.css?v=0.66.0"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
+<link rel="stylesheet" href="assets/safe-area.css?v=0.66.1"><!-- ?v＝RELEASE_VERSION（tests/ui-hierarchy.test.mjs 核對兩者相同）。
   不照 sfx／renderer 用 RELEASE_VERSION 字串拼接：這個 <link> 在 <head>、早於主 script，那時 RELEASE_VERSION 還沒定義；
   挪到主 script 之後注入會先畫一幀沒套這份樣式的畫面，而主 script 前又不能多開一支 script 標籤（tests/tools/load.mjs 只抓第一個）。 -->
 <script type="importmap">
@@ -2948,9 +2948,9 @@ function chainHintHTML(p,it){
 /* ?sim=1 進平衡模擬器工具頁，不影響正常遊戲頁（不自動執行、不動任何既有流程） */
 /* ===== 版本字串單一事實來源（2026-09-02 使用者裁定）：每次改版只改下面這一行，<title> 與首頁那行都由此帶出；
    使用者以首頁字串判斷是否已推上線；線上檢查用 grep 'VERSION="' ===== */
-const VERSION="0.66.0", VERSION_NOTE="0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
+const VERSION="0.66.1", VERSION_NOTE="0.66.1：出價頁第一次有人出手時，畫面不再卡住約 3 秒（手的著色程式在開頁後先在背景編好；桌機實測，手機尚未實測）。牌桌法寶的模型改成每夜一開始就在背景下載（今夜＋明夜），網路慢時進出價頁要等的時間大幅縮短：前一夜待得夠久、下載得完時，下一夜的法寶一進出價頁就在桌上；網路很慢、或很快就點進出價頁時，仍可能晚幾秒才出現（網址加 ?prefetch=0 可回到舊的下載時機做比對）。純效能，畫面與結算不變。0.66.0：選角說明文字更正——收驚婆、孝女白琴、普渡爐主的說明原本寫的起始壽命（34、36、42）是舊制數字，改成實際開局壽命 44、46、52（純文字，結算不變）。3D 牌桌頂部的「今夜心願」不再另佔一整條擋住法寶——預設縮成一顆小標籤「🌒 心願名」，點一下浮出完整文案（再點、點別處、或 6 秒後收回，浮層不推版面；純呈現，結算不變）。中央卡片（教學、異事、局末、夜行錄章末）比畫面高時，動作鈕固定在卡片底部不再被底列切掉，卡片還能往下捲時鈕上方顯示「▾ 還有」；異事輸入頁主鈕不再留著「進入下一夜」；交卷後底列的出價摘要清掉，夜末與局末不再掛著與左側大字不符的壽命數（純呈現，結算不變）。拍品窄籤尾端多一個「›」、點過的籤變實心；第一次進鑑賞頁會提示「點空白返回・左右滑換件」（3 秒後消失、每局一次）；出價或盯上後，窄籤角上會看到「押 N」或 👁 標記；北列與押寶面板的箭頭統一（▾＝可展開、▴＝可收起），北列箭頭放大到 14px；押寶夜的面板預設收合、不再蓋住桌上的法寶（點一下可展開，純呈現，結算不變）。出價頁、盯上頁在前兩夜桌心多一行操作提示（點拍品出價／點拍品或卷軸盯上，第 3 夜起不顯示）；鑑賞卷軸加上實體按鈕「出價這一件」「盯這一件」，「規則原文」改成小字▾按鈕與它區隔；盯上頁「不盯任何一件」改成次要樣式（純呈現，結算不變）。桌角信物空閒時會做小動作——當鋪的算盤每隔幾秒撥一下珠、收驚婆與普渡爐主的香頭冒出一縷薄煙（北席不演；出價時不演；純演出，結算不變；網址加 ?fx=0 關閉）。0.65.5：對白框換新造型——深色木牌配金細線、左右兩側依說話角色上色、帶一個指向說話者座位的小尾巴；香火系（收驚婆、閭山法師、普渡爐主、大家樂組頭）右上角多一枚朱紅小印、祖靈系（獵人）底緣一圈骨色菱紋、陰氣系（紅衣婆婆、孝女白琴、陰間當鋪、青面攤主）框外泛暗綠微光並帶斷續綠火線，斷手書生只有角色色邊（純呈現，結算不變）。0.65.4：招式特寫——每支招式出手時鏡頭拉近出招者與對面、多停一拍讓你看清「誰做了什麼」（預設輕：每招多停 0.25 秒起；網址加 ?movecam=2 為中、?movecam=0 關閉回 0.65.3），招式字幕不再被下一則立刻蓋掉——舊字幕縮成一行留在下方至少 1.8 秒才淡出，三拍打完最後一則也補滿 1.8 秒才收（純演出，結算不變）。0.65.3：對白泡放慢——角色說話的泡停留隨字數（約 3.5～6.5 秒，原本固定 2.3 秒）、字放大到 14px、同一席連說不再被舊計時器提早收掉、畫面重畫時未到期的泡不再消失（純呈現，結算不變；按「跳過」仍 0.3 秒）。0.65.2：修正對戰字幕出現「法寶：undefined」與血祭過陰的字幕；中咒時的鏡頭推近預設關閉（網址加 ?cursecam=1 可開）。0.65.1：牌桌光影升級——四盞燈籠換成燭火暖橘、光圈收得更集中，桌後上方多一盞燭火聚光，桌上的法寶會在紅布上投出影子；背景的夜空與遠處屋簷維持原本的深藍紫層次。只在牌桌與首頁生效，對決畫面的燈籠、曝光與聚光照舊（只多一層很淡的環境反光）。純畫面，結算不變；網址加 ?fx=0 可退回 0.64.0 的燈光做比對。0.64.0：孝女白琴、閭山法師、普渡爐主有了自己的手——孝女手腕綁一圈米白粗麻帶、側邊打結垂下兩條短布尾，指尖與手背沾著淡淡紙錢灰；閭山法師戴黑檀念珠、拇指套黃骨扳指，手背一道朱紅毛筆符；普渡爐主腕上繞黃色雙股編繩、垂著一顆米白布福袋，無名指戴淡青綠玉戒。布尾與福袋會跟著手的動作晃、手停下就慢慢停住（純畫面，結算不變；網址加 ?handb3=0 回到 0.62.5 的手）。0.63.0：寫實美術上線——10 位角色的頭像（健康／蒼白／瀕死三種氣色）、選角大圖與 32 件法寶／詛咒品圖示全部換成寫實風格；「抓交替水符」依圖示改名「水鬼名冊」（效果不變）；白虎煞改成插針的白虎紙、冥婚紅包與林投姐髮簪、水鬼浮標等重畫成小圖也認得出。圖載入失敗時自動退回舊圖，選角後立刻按入市也不會被吞。純畫面，結算不變；網址加 ?pic=0 可退回舊圖做比對。0.62.6：擺錢推重新設計——錢改從自家信物前緣出發，手從身側斜斜伸過來、指尖抵著錢柱一路推，推錢時手不再來回彈跳；北席的錢要推過整個托盤，手只能伸到托盤後緣就停，最後約三成路程仍是錢自己滑過去；西席推到中線右邊那格時，越過中線前也有一小段錢自己走；推錢排隊換格等少數時刻手的朝向仍會一幀甩約 60°（0.62.5 排隊換格本來就有約 80° 的甩動，現在推錢途中也會出現）。拍令牌、敗方扒錢、勝方停一拍維持原樣。直式手機上（未納入這次驗收、尚未改善）：手偶爾會穿過別席的信物（比上一版多）；西席推錢剛開始約 6～9 幀看不到手；推到一半手看不見的幀數變多（量測劇本 75／111 幀，0.62.5 為 46／67）；手貼著錢推的程度未達橫式標準（最差一段只有 0.217／0.241）；西席推到中線右邊那格時，錢出了手搆得到的範圍後看不到手；推錢時手的計算量約為上一版的 6～7 倍。純畫面，結算不變。0.62.5：擺錢推的手動作回到 0.62.3 的跟錢方式（0.62.4 改版後手會停在原地、錢自己滑過去）；因此推錢時偶爾來回彈跳回到 0.62.3 的程度，拍令牌等其他動作的改善保留（純畫面，結算不變）。0.62.4：擺錢推與拍令牌時，手偶爾來回彈跳的問題略有改善（純畫面，結算不變）。0.62.3：詛咒時手的發抖與符紙堆擺動頻率跟著放慢，不再抖得比動作快（純畫面，結算不變）。0.62.2：手的動作預設放慢——擺錢、拍令牌、敗方扒錢、勝方停一拍與收手預設慢 1.5 倍，得標抓法寶與詛咒推按預設慢 1.3 倍（不用再加網址參數）；想回到之前的原速，網址後面加 ?handslow=1&grabslow=1。純畫面，結算不變。0.62.1：新增兩個網址參數，讓你在手機上自己調手的動作速度（不加參數＝跟之前一模一樣）——在網址後面加 ?handslow=2，擺錢、拍令牌、敗方扒錢、勝方停一拍與收手會整組慢 2 倍（錢柱、令牌跟著手一起慢，開標前公告也等手收完才出）；加 ?grabslow=2，得標抓法寶與詛咒推按慢 2 倍（揭盅卡跟著晚出）；兩個可以一起用，例如 ?handslow=2&grabslow=1.5。數字可以有小數，建議先試 1.5 與 2，找到順眼的值告訴我再寫成預設；0、負數、超過 10 或不是數字都當 1。純畫面，結算不變。0.62.0：新手模型上線——五指有指節、手背看得到血管與肌腱，皮膚更細緻；獵人的疤改成有凹凸的疤，青面攤主維持大塊斑，孝女白琴、閭山法師、普渡爐主的皮膚各自不同；拇指與手腕交界的細橫紋修掉了。純畫面，結算不變；網址加 ?skin=0 可退回新手網格＋舊皮膚做比對。0.61.1：毒標塞詛咒品放慢到約 2 秒——施放者的手臂從自己座位那側伸過來，把符紙堆貼著桌面繞過別件拍品推到受害者手上按住（按住約 0.7 秒才收手）；符紙堆不再被抬到半空，碰到桌上的錢或令牌時小幅抬過；北席塞給西、東席時先往前推、再沿著桌前繞過去，手一路蓋在符紙堆上不停頓；收手時先把手抬起再退回。桌機量過 12 種誰塞給誰的組合各一個擺法，手機與其他擺法未逐一驗（純演出，結算不變）。0.61.0：四位角色有了自己的手——青面攤主（青灰斑、泛黃長指甲、腕上一串銅錢）、紅衣婆婆（乾枯灰白、鉤狀長指甲、黑髮辮繞腕）、斷手書生（手腕一道斜斜的縫合痕、指尖墨漬）、大家樂組頭（粗短、金戒、舊錶、手背寫著號碼）；拍令牌時拇指收攏一些（純演出，結算不變；網址加 ?handb1=0 回舊的手、?thumb=0 回舊的拍法）；0.60.1：毒標塞詛咒品改成「推到受害者面前按住就停」——符紙堆按在受害者手上後留在他席前，不再被受害者拖回去（原本看起來像被拿走；純演出，結算不變）；0.60.0：得標改成「得標的人伸手把法寶抓回自己面前」——法寶被抓起時會掙扎一下，拿回後在席前停一下才收起；毒標塞詛咒品改成「施放者把符紙堆推過桌心、按在受害者手上」，按住時一條紙錢繩纏上受害者手腕、手會發抖（純演出，結算不變；可按「跳過」；網址加 ?grab=0 回舊的拋物線）；0.59.12：開標擺錢一席一席依序——一次只有一隻手在推，每席推完（含多格）再換下一席，最後一隻手收完稍停一下才出現開標前公告（純演出，結算不變；可按「跳過」）；0.59.11：開標擺錢放慢——錢從席位推到桌面的飛行、同席多格排隊與手的動作一起放慢（約 0.42→0.70 秒），開標前公告等到手與錢都停下再多停 1 秒才出現（純演出，結算不變；可按「跳過」）；0.59.10：開局載入修正——3D 牌桌比開局晚載好時桌面不再一片黑（補播開局事件）、預先攤平載入鏈讓牌桌更快出現、載入慢時顯示「請神入座中…」（純呈現，結算不變）；0.59.9：展開「盯上宣告」「你・倒數」面板改成不透明、蓋過席位名牌（底下的字不再穿透交錯）；0.59.8：開標先看擺錢——按「蓋牌開標」後先讓你看完大家把錢擺到桌上（約 2 秒，可按「跳過」），「開標前公告」才出現（純演出，結算不變）；0.59.7：席位之手中等寫實——所有角色的手換程式生成寫實皮膚（指甲、指節紋、肌腱、靜脈），收驚婆老皺乾、獵人粗有繭疤、當鋪蒼白修長；紅繩改圓繩繞腕、木珠球形、護腕加鉚釘；手連著延伸到畫面外的手臂（純演出，大小不變）；0.59.6：收驚婆、當鋪、獵人的手各帶角色記號（紅線、黑袖套＋算盤珠戒指、皮護腕＋舊疤，純演出）；0.59.5：四席各一隻寫實右手——出價時推錢柱、盯上時跟著令牌拍下、開標時敗方把錢扒回（純演出，可跳過，結算不變）；0.59.4：窄橫式手機燒香框不再被截成「第 5 夜…」，只留「你 x／敵 y」、請神夜改金框；0.59.3：出價時桌角信物依角色做一個小動作（算盤晃、白幡擺、獸夾合、法印壓…）；點窄籤進法寶鑑賞頁（鏡頭推近＋自轉＋idle浮動，取代開卡停靠）＋成交總覽／戰況改買家分欄與心願／對決／天明三段（Y版）";
 /* 每次部署遞增此版號；首頁顯示與 asset query 都讀它，讓玩家可核實公開頁。 */
-const RELEASE_VERSION="0.66.0";
+const RELEASE_VERSION="0.66.1";
 /* ===== 音訊診斷與喚醒（2026-09-03，使用者回報 v0.27 iPhone 整個沒聲音、🔇 與靜音撥桿都排除）=====
    我沒有 iPhone 可重現，所以把每一層的狀態印在規則頁最上面，讓使用者唸給我聽：
    ctx 有沒有／state（iOS 特有 "interrupted"）／取樣率／音效開關／sfx.js 有沒有載到（聲部數）／最後一次 play 與例外／
@@ -3838,6 +3838,11 @@ function market3dItems(){
    純讀取：不耗亂數、不寫任何賽局欄位——與 market3dItems 同一條紀律。
    ★為什麼夾在 ys:market 裡而不另開事件★：信物要換的時機（開了新的一局、換了座位）
    一定伴隨著一次 showMarket／showMarkUI，多開一個事件只是多一條要記得派的路。 */
+/* 拍品提前下載（2026-11-21，驗收 docs/acceptance/2026-11-21-lot-prefetch.md）：每夜開始（beginRound）就把今夜＋明夜的
+   拍品鍵交給 3D 層先抓模型，不等出價頁 pushMarket3d——iPhone 慢網路下原本要等十幾到幾十秒。鍵的取法與 market3dItems 相同
+   （it.ab||it.m；詛咒品沒有模型）。純讀取：不耗亂數、不寫任何賽局欄位（trace 與基準逐位元組相等）。 */
+function prefetchKeys(list){ return (Array.isArray(list)?list:[]).map(it=>it&&!it.curse?(it.ab||it.m||null):null).filter(Boolean); }
+function prefetch3d(){ if(typeof S==="undefined"||!S) return; fx3d("ys:prefetch",{now:prefetchKeys(S.market),next:prefetchKeys(S.nextMarket),round:S.round}); }
 function market3dSeats(){
   return (S&&S.players?S.players:[]).map(p=>({ id:p.id, role:p.roleId||null, alive:!!p.alive }));
 }
@@ -6419,6 +6424,7 @@ function ys3dJournal(name,d){
   }else if(name==="ys:bid") J.bids[(d.seat|0)+":"+(d.slot|0)]={seq:++J.seq,detail:d};
   else if(name==="ys:mark") J.marks[d.seat|0]={seq:++J.seq,detail:d};
   else if(name==="ys:reveal-result"){ if(d.slot!==undefined&&d.slot!==null) J.results[d.slot|0]={seq:++J.seq,detail:d}; }
+  else if(name==="ys:prefetch") J.prefetch={seq:++J.seq,detail:d}; /* 2026-11-21 拍品提前下載：只留最新一份（開局多半比 renderer 早派） */
   else if(name==="ys:duel") J.vis={seq:++J.seq,visible:false};
   else if(name==="ys:duel-end") J.vis={seq:++J.seq,visible:true};
 }
@@ -6921,6 +6927,7 @@ function openHelp(){
 }
 function beginRound(){
   fx3d("ys:table"); /* 新的一夜：鏡頭回到牌桌俯視機位（局末拉遠後也靠這裡復位） */
+  prefetch3d();     /* 今夜＋明夜拍品的模型先在背景下載（第 1 夜在教學頁之前就開始） */
   bgm("market");    /* 牌桌層：盯上／出價／開標全程同一首，夜與夜之間不重頭播 */
   if(S.round===1&&!introSeen()){ showIntro(beginRoundCore); return; }
   beginRoundCore();
diff --git a/js/creature-figures.js b/js/creature-figures.js
index c7d79033..30af6f33 100644
--- a/js/creature-figures.js
+++ b/js/creature-figures.js
@@ -122,13 +122,78 @@ const WATER = {
 // 再用 SkeletonUtils.clone 各自複製骨架（clone 會連 skeleton 一起重建，
 // 直接 object3D.clone() 會讓兩個實例共用同一副骨頭、動起來互相拉扯）。
 const glbCache = new Map();
+/* 下載卡住的處理（Codex yaoshi-v0.66.1-r1 F3、r2 F1／F2）：所有消費端（托盤、夜戰、預載）共用同一個 promise，
+   所以「卡住就重抓」要做在這一層，重抓成功時已經接上這個 promise 的托盤格子才會跟著出現。
+   - 自己 fetch＋逐塊讀（拿得到每一塊資料的時間），讀完交給 GLTFLoader.parseAsync（0.158 有）。遊戲沒用 LoadingManager／THREE.Cache，
+     繞過 FileLoader 不影響別處。
+   - 連續 GLB_STALL_MS 沒收到任何資料＝卡住：中止舊請求（不跟新的搶頻寬），換網址 ?retry=N 再抓——不換網址的話，瀏覽器會把同網址的
+     新請求併進還掛著的舊請求一起等（Chromium 實測 8 秒內不發新請求）。GLB 自包含，加查詢參數不影響內容。最多 GLB_MAX_TRIES 次（含第一次）。
+   - HTTP 錯誤（404 等）與解析失敗照舊直接失敗、不重試；失敗的不留在快取（覆審 LOW：網路抖一次不該讓這隻整個 session 都載不到）。
+   - 「排隊」不算卡住：只有這一件 GLB_STALL_MS 沒資料、**而且**所有 GLB 下載合計 GLB_IDLE_MS 都沒進任何資料（線路整條停了）才算卡住。
+     別件還在進資料時，這件只是排在後面（HTTP/1.1 每主機連線數、或擁塞線路的排隊）——慢線路實測一件排隊 20 秒拿不到第一個位元組，
+     誤判重抓等於同一份抓兩次，浪費的正是最缺的頻寬（v0.66.1 r2 修正後重驗 5 次中 1 次重複下載，由此發現）。
+   glbState：promise → { lastData }＝最後一次真的收到資料的時間（給 prefetchGlb 決定何時放行下一批，不受重試重設影響）。 */
+const GLB_STALL_MS = 20000;
+const GLB_IDLE_MS = 15000;
+const GLB_MAX_TRIES = 3;
+const glbState = new WeakMap();
+let glbLastAnyData = 0; // 任何一份 GLB 最後一次收到資料的時間
 let loader = null;
+/** 這一份（lastData）算不算卡住：自己 stallMs 沒資料，且整條線路 GLB_IDLE_MS 沒資料。 */
+function glbStalled(lastData, stallMs = GLB_STALL_MS) {
+  const now = Date.now();
+  return now - lastData > stallMs && now - glbLastAnyData > GLB_IDLE_MS;
+}
+
+/** 下載一份 GLB 的位元組；每收到一塊資料呼叫 onData。signal 中止時 reject。 */
+async function fetchGlbBytes(u, signal, onData) {
+  const res = await fetch(u, signal ? { signal } : undefined);
+  if (!res.ok) throw new Error(`GLB HTTP ${res.status}：${u}`);
+  onData();
+  if (!res.body || typeof res.body.getReader !== 'function') return res.arrayBuffer();
+  const reader = res.body.getReader();
+  const parts = [];
+  let n = 0;
+  for (;;) {
+    const { done, value } = await reader.read();
+    if (done) break;
+    parts.push(value); n += value.byteLength; onData();
+  }
+  const buf = new Uint8Array(n);
+  let o = 0;
+  for (const c of parts) { buf.set(c, o); o += c.byteLength; }
+  return buf.buffer;
+}
 
 function loadGlb(url) {
   if (!glbCache.has(url)) {
     if (!loader) loader = new GLTFLoader();
-    const p = loader.loadAsync(url);
-    // 失敗的不留在快取：網路抖一次不該讓這隻整個 session 都載不到（覆審 LOW）
+    const st = { lastData: Date.now() };
+    const p = new Promise((resolve, reject) => {
+      let settled = false, tries = 0, lastAt = Date.now(), timer = null, cur = null;
+      const finish = (ok, v) => {
+        if (settled) return;
+        settled = true; clearInterval(timer);
+        if (cur) cur.abort();
+        (ok ? resolve : reject)(v);
+      };
+      const start = () => {
+        if (cur) cur.abort(); // 換網址前先中止卡住的舊請求
+        const n = tries++;
+        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
+        cur = ctl; lastAt = Date.now();
+        const u = n ? url + (url.includes('?') ? '&' : '?') + 'retry=' + n : url;
+        fetchGlbBytes(u, ctl && ctl.signal, () => { if (cur === ctl) { lastAt = st.lastData = glbLastAnyData = Date.now(); } })
+          .then((buf) => loader.parseAsync(buf, THREE.LoaderUtils.extractUrlBase(url)))
+          .then((g) => finish(true, g), (e) => { if (ctl && ctl.signal.aborted && !settled) return; finish(false, e); });
+      };
+      start();
+      timer = setInterval(() => {
+        if (settled || !glbStalled(lastAt)) return;
+        if (tries < GLB_MAX_TRIES) start(); else finish(false, new Error('GLB 下載卡住（' + tries + ' 次）：' + url));
+      }, 1000);
+    });
+    glbState.set(p, st);
     p.catch(() => { if (glbCache.get(url) === p) glbCache.delete(url); });
     glbCache.set(url, p);
   }
@@ -150,6 +215,28 @@ export function cloneSkinnedGlb(url) {
 }
 /** 治具出口（只讀）：這個 URL 是否已在 GLB 快取裡（證明席位之手與紙紮妖共用同一份 glbCache）。 */
 export function glbCached(url) { return glbCache.has(url); }
+/**
+ * 提前下載（2026-11-21，驗收 docs/acceptance/2026-11-21-lot-prefetch.md）：拍品一抽出來就把 GLB 抓進同一份 glbCache，
+ * 出價頁 setItems／夜戰 clone 時直接拿快取。iPhone 慢網路下，原本要到出價頁才開始抓，一夜 3–4 件要等十幾到幾十秒。
+ * 只下載＋解析，不 clone、不進場景、不上 GPU。載到回 true、失敗回 false。
+ * 卡住時不讓呼叫端的下一批一直等（Codex r1 F3）：這件連續 stallMs 沒收到資料、而且整條線路也停了（glbStalled）就先回 false 放行。
+ * 看的是「多久沒收到資料」不是「總共多久」：慢網路下一件本來就可能抓幾十秒、也可能排在別件後面，不能誤判。
+ * 這一件本身不放棄——loadGlb 自己會換網址重抓，接在同一個 promise 上的托盤格子
+ * 重抓成功就會出現（r2 F1）。
+ * @param {string} url
+ * @param {number} [stallMs]
+ * @returns {Promise<boolean>}
+ */
+export function prefetchGlb(url, stallMs = GLB_STALL_MS) {
+  const p = loadGlb(url);
+  const st = glbState.get(p);
+  return new Promise((resolve) => {
+    let timer = null;
+    const finish = (ok) => { if (timer) clearInterval(timer); timer = null; resolve(ok); };
+    p.then(() => finish(true), () => finish(false));
+    timer = setInterval(() => { if (st && glbStalled(st.lastData, stallMs)) finish(false); }, 1000);
+  });
+}
 
 /* ── 邊光 ＋ dissolve 的 shader 注入 ─────────────────────────────────────────
  * 不換材質、不寫第二支 pass：直接在 MeshStandardMaterial 的既有 shader 尾巴
diff --git a/js/renderer.js b/js/renderer.js
index 062a39ba..871136b3 100644
--- a/js/renderer.js
+++ b/js/renderer.js
@@ -18,7 +18,7 @@ const { createCharacterBillboards } = await import('./characters-billboard.js' +
 const { createPlayerBridge } = await import('./bridge-players.js' + V);
 const { createCameraDirector } = await import('./camera-director.js' + V);
 const { createDuelFigures, makeLayeredFigure } = await import('./duel-figures.js' + V);
-const { makeCreatureFigure, creatureGlbUrl, createFigureLightRig, attachFactionFx, FACTION_RIM, createOutlineWarmup, setOutlineCrowd, MAIN_OUTLINE } = await import('./creature-figures.js' + V);
+const { makeCreatureFigure, creatureGlbUrl, createFigureLightRig, attachFactionFx, FACTION_RIM, createOutlineWarmup, setOutlineCrowd, MAIN_OUTLINE, prefetchGlb } = await import('./creature-figures.js' + V);
 const { createTraitFx } = await import('./trait-fx.js' + V);
 const { createTableTray, TRAY } = await import('./table-tray.js' + V);
 const { fitSubject } = await import('./table-framing.js' + V);
@@ -219,6 +219,7 @@ function init() {
   };
   const tray = createTableTray(scene, camera, { outline: !TRAY_URL.lite, lite: TRAY_URL.lite, hands: TRAY_URL.hands, director, frameSubjects });
   tray.warmAppraise(renderer); // 丙案疊層兩支 shader 開頁就編好，第一次點籤不卡
+  tray.warmHands(renderer); // 手的 shader 等手載好就在背景編好，第一次出手不卡（D3D11 實測原本卡約 3.1 秒）
   document.addEventListener('ys:reveal-slot', e => {
     const slot = Number(e.detail?.slot);
     revealSlot = Number.isInteger(slot) && slot >= 0 && slot < 4 ? slot : -1;
@@ -266,6 +267,24 @@ function init() {
   document.addEventListener('ys:fx-trait-cancel', () => { tray.props.finish(); tray.finishGrabs(); tray.hands.finish(); }); // v0.60.0：進行中的抓取演出也直接到終態
   document.addEventListener('ys:duel', () => tray.setVisible(false));
   document.addEventListener('ys:duel-end', () => tray.setVisible(true));
+  /* 拍品提前下載（2026-11-21）：每夜開始（beginRound）index.html 派 `ys:prefetch` {now:今夜拍品鍵, next:明夜拍品鍵}。
+     先把今夜的全抓完才抓明夜——同一條網路上同時抓會拖慢今夜（驗收條件 3）。同一個 URL 由 glbCache 去重，不會抓兩次。
+     不看 TRAY_URL：夜戰的紙紮妖用同一批 GLB，桌上不擺也用得到。`?prefetch=0` 關閉＝回到出價頁才抓（對照用）。 */
+  const PREFETCH_ON = (() => { try { return new URLSearchParams(location.search || '').get('prefetch') !== '0'; } catch (e) { return true; } })();
+  /* 世代號（Codex yaoshi-v0.66.1-r1 F1）：同一分頁重開新局（或換夜）時，上一份預載的「明夜」批次還沒開始的就作廢——
+     不然舊局今夜抓完後才啟動的舊局明夜，會跟新局眼前要用的模型搶頻寬。已經在抓的請求無法取消，留在共用快取裡。
+     prefetchGlb 自己會處理「卡住」（太久沒收到資料就放手，F3），今夜批次不會永遠擋住明夜。 */
+  let prefetchGen = 0;
+  const onPrefetch = (d) => {
+    if (!PREFETCH_ON) return;
+    const gen = ++prefetchGen;
+    const urls = (a) => (Array.isArray(a) ? a : []).filter(Boolean).map((k) => creatureGlbUrl(k));
+    const now = urls(d.now), next = urls(d.next);
+    Promise.all(now.map((u) => prefetchGlb(u)))
+      .then(() => { if (gen === prefetchGen) return Promise.all(next.map((u) => prefetchGlb(u))); })
+      .catch(() => {});
+  };
+  document.addEventListener('ys:prefetch', (e) => onPrefetch((e && e.detail) || {}));
   /* ★補播（v0.59.10）★：上面這幾個 listener 要等整條 import 鏈（約 28 個模組）跑完才註冊，renderer 比開局晚到時
      index.html 的 fx3d 早就派過 `ys:market`／`ys:bid`／`ys:mark`／`ys:reveal-result`（一次性事件、無人接）——
      桌面全黑、錢與令牌也不在，要等下一次 `ys:market` 才補上（慢網下 45 秒內從未出現）。
@@ -278,6 +297,7 @@ function init() {
     if (J && regSeq > 0) {
       const missed = (x) => x && x.seq <= regSeq;
       try {
+        if (missed(J.prefetch)) onPrefetch(J.prefetch.detail); // 開局就派的預載多半比 renderer 早；先補它，下面 onMarket 的 setItems 才接得上同一份下載
         if (missed(J.market)) onMarket(J.market.detail);
         const rest = [];
         for (const k in J.bids) if (missed(J.bids[k])) rest.push([J.bids[k].seq, () => onBid(J.bids[k].detail)]);
diff --git a/js/table-tray.js b/js/table-tray.js
index d96c10db..c5410a63 100644
--- a/js/table-tray.js
+++ b/js/table-tray.js
@@ -468,6 +468,34 @@ function makeCursePile(seed, kind = null) {
   };
 }
 
+/**
+ * `renderer.compileAsync` 的安全版（Codex yaoshi-v0.66.1-r1 F2）。three 0.158 的 compileAsync 在 setTimeout 裡輪詢
+ * `properties.get(material).currentProgram.isReady()`，用的是建 renderer 時閉包裡那一份 properties；WebGL context 遺失後恢復，
+ * initGLContext 會換一份新的 properties，舊輪詢讀到 currentProgram＝undefined，在計時器裡丟出沒人接的 TypeError。
+ * 這裡照同樣兩步（compile 起編＋輪詢 isReady；有 KHR_parallel_shader_compile 時 isReady 不阻塞，沒有時 three 直接回 true），
+ * 但每次輪詢都重讀 `renderer.properties`、context 遺失就停、程式不見了就當這顆不用等。回傳的 Promise 只會 resolve（true＝編好）。
+ * @returns {Promise<boolean>}
+ */
+function compileQuietly(renderer, obj, camera, scene) {
+  return new Promise((resolve) => {
+    let mats;
+    try { mats = renderer.compile(obj, camera, scene); } catch (e) { resolve(false); return; }
+    const gl = renderer.getContext();
+    const check = () => {
+      try {
+        if (gl.isContextLost()) { resolve(false); return; }
+        for (const m of mats) {
+          const p = renderer.properties.get(m).currentProgram;
+          if (!p || p.isReady()) mats.delete(m);
+        }
+        if (mats.size === 0) { resolve(true); return; }
+      } catch (e) { resolve(false); return; }
+      setTimeout(check, 10);
+    };
+    setTimeout(check, 10);
+  });
+}
+
 /**
  * 建立桌心托盤。
  * @param scene  THREE.Scene（本函式自己把 group 加進去）
@@ -1499,6 +1527,18 @@ export function createTableTray(scene, camera, opts = {}) {
     },
     /** 開頁預先編譯疊層 shader（renderer.js init 呼叫一次）。 */
     warmAppraise(renderer) { getFx().warm(renderer); },
+    /** 開頁預先編譯手的 shader（renderer.js init 呼叫一次）：手平常收著不畫，原本到出價頁第一次出手才編，
+     *  ANGLE D3D11 實測主執行緒同步卡約 3.1 秒（2026-11-21，docs/acceptance/2026-11-21-hand-shader-warm.md）。
+     *  等手載好（材質已套上）後用 compileQuietly（compileAsync 的安全版，見檔內）在背景編：燈光與霧取自整個場景、輸出目標＝螢幕，與牌桌直接 render 同一個版本。
+     *  編不過或手沒載到就算了，第一次出手時照舊再編（純演出不得拖垮牌桌）。 */
+    warmHands(renderer) {
+      if (!handsOn || !hands.group) return;
+      const warm = () => hands.ready().then(() => { if (hands.loaded()) return compileQuietly(renderer, hands.group, camera, scene); }).catch(() => {});
+      warm();
+      // WebGL context 遺失又恢復（iOS 切背景會遇到）：新 context 裡手的程式全沒了，恢復後再背景編一次（Codex yaoshi-v0.66.1-r1 F2）。
+      // three 自己的 restored 處理在建 renderer 時就註冊，先跑；這裡排到下一個 task 保險。
+      renderer.domElement.addEventListener('webglcontextrestored', () => { setTimeout(warm, 0); });
+    },
     /** renderer.js 在畫完世界那一趟之後呼叫：疊層（壓暗＋鏡子＋符紙）→ 清深度 → 只畫焦點法寶那一層 → 火星。
      *  ★draw 計數★：renderer.info 預設每次 render() 開頭歸零，這裡暫時關掉 autoReset，讓這幾趟累加在世界那一趟
      *  之後——`renderer.info.render.calls` 讀到的才是這一幀真正的總數（凍結 #8／#11(e) 量的就是它）。 */
diff --git a/tests/curse-cam-off.test.mjs b/tests/curse-cam-off.test.mjs
index d24943e2..7442332d 100644
--- a/tests/curse-cam-off.test.mjs
+++ b/tests/curse-cam-off.test.mjs
@@ -13,7 +13,7 @@ import { fileURLToPath } from 'node:url';
 const HERE = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
 const ROOT = path.resolve(process.env.CURSE_CAM_ROOT || HERE);
 const QS = ['', 'cam=0', 'cursecam=1', 'cam=0&cursecam=1'];
-const VPS = [['V3', 9761], ['V2', 9762]]; // 844×390、932×430
+const VPS = [['V3', 9765], ['V2', 9762]]; // 844×390、932×430
 const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'curse-cam-off-'));
 
 function probe(vp, port) {
diff --git a/tests/h1-guide.test.mjs b/tests/h1-guide.test.mjs
index aa1b3ece..4fa344d8 100644
--- a/tests/h1-guide.test.mjs
+++ b/tests/h1-guide.test.mjs
@@ -17,7 +17,7 @@ import { driveToFirst, openGame, waitTrayReady, waitSettled, scr, DRIVE_STEP } f
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
-const PORT = Number(process.env.H1_PORT || 9761);
+const PORT = Number(process.env.H1_PORT || 9767);
 const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
 const ALL = { A: { w: 844, h: 390, safe: [0, 0, 0, 0] }, B: { w: 667, h: 375, safe: [0, 0, 0, 0] }, C: { w: 932, h: 430, safe: [0, 0, 0, 0] } };
 const VPS = (process.env.H1_VPS || 'A,B,C').split(',');
diff --git a/tests/h2-cards.test.mjs b/tests/h2-cards.test.mjs
index 15ed2cae..f3da9f57 100644
--- a/tests/h2-cards.test.mjs
+++ b/tests/h2-cards.test.mjs
@@ -17,7 +17,7 @@ import { fileURLToPath } from 'node:url';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
-const PORT = Number(process.env.YAOSHI_H2_PORT || 9761);
+const PORT = Number(process.env.YAOSHI_H2_PORT || 9769);
 const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
 const SIZES = [[844, 390], [667, 375], [932, 430]];
 
diff --git a/tests/h3-affordance.test.mjs b/tests/h3-affordance.test.mjs
index a9ed29de..80c29cc6 100644
--- a/tests/h3-affordance.test.mjs
+++ b/tests/h3-affordance.test.mjs
@@ -10,7 +10,7 @@ import { fileURLToPath } from 'node:url';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
-const PORT = Number(process.env.YAOSHI_H3_PORT || 9761);
+const PORT = Number(process.env.YAOSHI_H3_PORT || 9772);
 const SHOT_DIR = process.env.YAOSHI_SHOT_DIR || '';
 const SIZES = [[844, 390], [667, 375], [932, 430]];
 
diff --git a/tests/hand-warm-context.test.mjs b/tests/hand-warm-context.test.mjs
new file mode 100644
index 00000000..644ef33a
--- /dev/null
+++ b/tests/hand-warm-context.test.mjs
@@ -0,0 +1,90 @@
+// 手部 shader 預編的回歸測試（v0.66.1；Codex yaoshi-v0.66.1-r1 F2、F5）。
+// A（F5）：還沒有任何一隻手被畫出來之前，手的每顆材質在 renderer.properties 裡就已經有 currentProgram——
+//    預編真的在第一次出手前發生（main 沒有預編時這條紅：手要到出價頁第一次出手才編，ANGLE D3D11 實測主執行緒卡約 3.1 秒）。
+// B（F2）：WebGL context 遺失→恢復的同一刻觸發預編，不得丟出未捕捉例外，恢復後手的程式要重新編好。
+//    three 0.158 的 compileAsync 在計時器裡讀「建 renderer 時那份」properties，恢復後 initGLContext 換新的一份，
+//    舊輪詢讀到 undefined.isReady() → TypeError（f2ff1ad7 的寫法上這條紅）。
+// 全程走真頁面、真 three、真托盤 warmHands 與瀏覽器內建 WEBGL_lose_context，沒有替身。
+// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import path from 'node:path';
+import { spawn } from 'node:child_process';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
+const PORT = Number(process.env.YAOSHI_HANDWARM_PORT || 9793);
+
+function loadPlaywright() {
+  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
+    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
+  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
+  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
+}
+
+/** 頁內：手的每顆材質在「目前這份」renderer.properties 裡有沒有 currentProgram。 */
+const HAND_PROGRAMS = `(() => {
+  const Y = window.__yaoshi3d, R = Y && Y.renderer, H = Y && Y.tray && Y.tray.hands;
+  if (!R || !H || !H.group || !H.loaded()) return { loaded: false, mats: 0, withProgram: 0 };
+  const mats = new Set();
+  H.group.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && mats.add(m)); });
+  let withProgram = 0;
+  for (const m of mats) if (R.properties.get(m).currentProgram) withProgram++;
+  return { loaded: true, mats: mats.size, withProgram };
+})()`;
+
+test('手部 shader：第一次出手前已預編；context 遺失恢復時預編不丟例外且會重編', { timeout: 120000 }, async () => {
+  const { chromium } = loadPlaywright();
+  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
+  for (let i = 0; i < 75; i++) {
+    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
+    if (ok) break; await new Promise((r) => setTimeout(r, 200));
+  }
+  const browser = await chromium.launch();
+  const errs = [];
+  try {
+    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
+    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
+    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
+    await page.waitForFunction('!!window.__yaoshi3d && !!window.__yaoshi3d.tray && !!window.__yaoshi3d.tray.hands', { timeout: 60000 });
+    // 首頁停著、還沒開局：手從沒被畫過。等手載好，再給背景預編最多 10 秒。
+    let a = null;
+    for (let i = 0; i < 200; i++) {
+      a = await page.evaluate(HAND_PROGRAMS);
+      if (a.loaded && a.mats > 0 && a.withProgram === a.mats) break;
+      await page.waitForTimeout(50);
+    }
+    assert.ok(a.loaded && a.mats > 0, `手沒載到（mats=${a && a.mats}），測試沒行使到預編`);
+    assert.equal(a.withProgram, a.mats, `第一次出手前手的材質只有 ${a.withProgram}/${a.mats} 顆有編好的程式（預編沒發生）`);
+
+    // B：遺失 → 恢復的同一個 task 裡觸發預編（restored 事件排在之後才派，輪詢第一次檢查時 properties 已換新）
+    const seq = await page.evaluate(async () => {
+      const Y = window.__yaoshi3d, R = Y.renderer, cv = R.domElement, gl = R.getContext();
+      const ext = gl.getExtension('WEBGL_lose_context');
+      if (!ext) return { ext: false };
+      let lost = 0, restored = 0;
+      cv.addEventListener('webglcontextlost', () => { lost++; });
+      cv.addEventListener('webglcontextrestored', () => { restored++; });
+      const waitFor = (f) => new Promise((res) => { const t0 = performance.now(); const k = () => (f() || performance.now() - t0 > 5000 ? res() : setTimeout(k, 5)); k(); });
+      ext.loseContext();
+      await waitFor(() => lost > 0);
+      ext.restoreContext();
+      Y.tray.warmHands(R);
+      await waitFor(() => restored > 0);
+      return { ext: true, lost, restored };
+    });
+    assert.ok(seq.ext, '瀏覽器沒有 WEBGL_lose_context，測不到 F2');
+    assert.ok(seq.lost > 0 && seq.restored > 0, `context 沒有真的遺失並恢復（lost=${seq.lost} restored=${seq.restored}）`);
+    let b = null;
+    for (let i = 0; i < 100; i++) {
+      await page.waitForTimeout(50);
+      b = await page.evaluate(HAND_PROGRAMS);
+      if (b.loaded && b.mats > 0 && b.withProgram === b.mats) break;
+    }
+    await page.waitForTimeout(300); // 讓舊寫法可能殘留的輪詢計時器有機會觸發
+    assert.deepEqual(errs, [], 'context 恢復時預編丟出未捕捉例外');
+    assert.equal(b.withProgram, b.mats, `context 恢復後手的材質只有 ${b.withProgram}/${b.mats} 顆重新編好`);
+  } finally { await browser.close(); srv.kill(); }
+});
diff --git a/tests/light-aplus-robust.test.mjs b/tests/light-aplus-robust.test.mjs
index dc3061e8..ab38bc2b 100644
--- a/tests/light-aplus-robust.test.mjs
+++ b/tests/light-aplus-robust.test.mjs
@@ -10,7 +10,7 @@ import { fileURLToPath } from 'node:url';
 
 const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
-const PORT = 9747;
+const PORT = 9749;
 
 async function open(browser, opts = {}) {
   const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
diff --git a/tests/lot-prefetch.test.mjs b/tests/lot-prefetch.test.mjs
new file mode 100644
index 00000000..6df5635e
--- /dev/null
+++ b/tests/lot-prefetch.test.mjs
@@ -0,0 +1,102 @@
+// 拍品提前下載的回歸測試（驗收 docs/acceptance/2026-11-21-lot-prefetch.md 條件 8）。
+// 起因：製作人 iPhone 慢網路下，進出價頁後牌桌法寶要等十幾到幾十秒才出現（原本到出價頁 pushMarket3d 才開始抓模型）。
+// 做法：assets/creatures/*.glb 走一條共用頻寬的假線路（FIFO、RATE 位元組／秒），其餘資源照常；
+// 真頁面、固定種子開局 → 翻到第 1 夜拍品上桌 → 在第 1 夜停 N1_MS（真人一夜遠比這久）→ 推進到第 2 夜拍品上桌，
+// 斷言第 2 夜拍品推上桌後 1000ms 內，非詛咒品全部 ready 且 visible。
+// 鑑別力：main（沒有預載）上同一支要紅——第 2 夜到出價頁才開始抓，等待＝第 2 夜模型總大小 ÷ RATE（數秒）。
+// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
+import assert from 'node:assert/strict';
+import test from 'node:test';
+import fs from 'node:fs';
+import path from 'node:path';
+import { spawn } from 'node:child_process';
+import { createRequire } from 'node:module';
+import { fileURLToPath } from 'node:url';
+
+const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
+const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
+const PORT = Number(process.env.YAOSHI_PREFETCH_PORT || 9791);
+const RATE = 409600; // 400KB/s 原始大小：兩夜各 4 件最大檔 ≈8.8MB 也在 22 秒內抓完，第 1 夜停 20 秒＋推進時間足夠
+const N1_MS = 20000;
+const SEED = 1;
+
+function loadPlaywright() {
+  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
+    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
+  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
+  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
+}
+
+test('拍品提前下載：慢線路下第 2 夜拍品推上桌 1 秒內全部就緒且看得到', { timeout: 240000 }, async () => {
+  const { chromium } = loadPlaywright();
+  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
+  for (let i = 0; i < 75; i++) {
+    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
+    if (ok) break; await new Promise((r) => setTimeout(r, 200));
+  }
+  const browser = await chromium.launch();
+  const errs = [];
+  let linkFreeAt = 0;
+  try {
+    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
+    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
+    await ctx.route(/\/assets\/creatures\/[^?]*\.glb/, async (route) => {
+      const u = new URL(route.request().url());
+      const body = fs.readFileSync(path.join(SRV_ROOT, decodeURIComponent(u.pathname)));
+      const t = Date.now(), end = Math.max(t, linkFreeAt) + body.length / RATE * 1000;
+      linkFreeAt = end;
+      await new Promise((r) => setTimeout(r, end - t));
+      await route.fulfill({ status: 200, contentType: 'model/gltf-binary', body });
+    });
+    // 頁內記錄器（Codex yaoshi-v0.66.1-r1 F4）：起點在 `ys:market` 派出的當下由 listener 記（不靠輪詢補記，
+    // 輪詢被長任務拖住時起點終點會一起晚、把數秒等待算成 0）；同時記下這一批的拍品鍵。終點由 50ms 輪詢記，
+    // 而且要桌上的拍品鍵已換成這一批才算——輪詢晚到只會讓等待變長（保守），不會變短。
+    await ctx.addInitScript(() => {
+      window.__pl = { push: {}, keys: {}, ready: {}, real: {} };
+      document.addEventListener('ys:market', (e) => {
+        const d = (e && e.detail) || {}, r = Number(d.round) || 0;
+        if (r > 0 && !(r in window.__pl.push)) {
+          window.__pl.push[r] = performance.now(); // 單調時鐘（Codex r2 F4：系統校時不影響）
+          window.__pl.keys[r] = (d.items || []).map((it) => (it && !it.curse ? it.key : null)).filter(Boolean).join(','); // 只比非詛咒品，空格不算
+        }
+      });
+      setInterval(() => {
+        const Y = window.__yaoshi3d, P = window.__pl;
+        for (const r of Object.keys(P.push)) {
+          if (r in P.ready || !(Y && Y.tray && Y.tray.items)) continue;
+          const it = Y.tray.items();
+          if (it.map((s) => (s.key && !s.curse ? s.key : null)).filter(Boolean).join(',') !== P.keys[r]) continue; // 桌上還不是這一批
+          const real = it.filter((s) => s.key && !s.curse);
+          P.real[r] = real.length;
+          if (real.length > 0 && real.every((s) => s.ready && s.visible)) P.ready[r] = performance.now();
+        }
+      }, 50);
+    });
+    const page = await ctx.newPage();
+    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
+    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
+    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 30000 });
+    await page.waitForFunction('!!window.__yaoshi3d && !!window.__yaoshi3d.tray', { timeout: 60000 });
+    await page.evaluate((seed) => { window.__yaoshi.newGame('solo', seed, ['qingmian']); }, SEED);
+    const journalRound = () => page.evaluate(() => { const J = window.__ys3dJournal; return J && J.market && J.market.detail ? J.market.detail.round : -1; });
+    const advance = async () => {
+      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); return { d: !b || !b.offsetParent || b.disabled }; })()`);
+      if (!st.d) await page.click('#mainbtn').catch(() => {});
+      else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button, button')].find(x=>x.offsetParent&&!x.disabled&&/下一頁|開始|知道了|進入|確定|不盯|繼續|跳過|下一夜|蓋牌|開標/.test(x.innerText)); if(e)e.click(); })()`);
+      await page.waitForTimeout(60);
+    };
+    for (let i = 0; i < 2000 && (await journalRound()) < 1; i++) await advance();
+    assert.equal(await journalRound(), 1, '沒走到第 1 夜拍品上桌');
+    await page.waitForTimeout(N1_MS);
+    for (let i = 0; i < 4000 && (await journalRound()) < 2; i++) await advance();
+    assert.equal(await journalRound(), 2, '沒走到第 2 夜拍品上桌');
+    for (let i = 0; i < 300; i++) { if (await page.evaluate(() => 2 in window.__pl.ready)) break; await page.waitForTimeout(100); }
+    const pl = await page.evaluate(() => window.__pl);
+    // 活性：第 2 夜確實有要載模型的拍品（全是詛咒品的話這個測試什麼都沒驗到）
+    assert.ok(pl.real[2] > 0, `第 2 夜沒有非詛咒拍品，測試沒行使到預載（real=${pl.real[2]}）`);
+    assert.ok(2 in pl.ready, '第 2 夜拍品 30 秒內都沒到齊');
+    const wait = pl.ready[2] - pl.push[2];
+    assert.ok(wait >= 0 && wait <= 1000, `第 2 夜拍品推上桌後等了 ${Math.round(wait)}ms 才全部就緒（有效區間 0–1000ms）`);
+    assert.deepEqual(errs, []);
+  } finally { await browser.close(); srv.kill(); }
+});
diff --git a/tests/ui-hierarchy.test.mjs b/tests/ui-hierarchy.test.mjs
index 727894bd..6c604245 100644
--- a/tests/ui-hierarchy.test.mjs
+++ b/tests/ui-hierarchy.test.mjs
@@ -22,7 +22,7 @@ test('從側欄查看拍品時，3D 桌上同一件也會進入檢視態', () =>
 });
 
 test('首頁顯示可核對的發布版本', () => {
-  assert.match(page, /const RELEASE_VERSION="0.66.0"/, '本次公開版需遞增語意版本');
+  assert.match(page, /const RELEASE_VERSION="0.66.1"/, '本次公開版需遞增語意版本');
   assert.match(page, /v\$\{RELEASE_VERSION\}/, '首頁版本列必須顯示發布版本');
   assert.match(page, /renderer\.js\?v="\+RELEASE_VERSION/, '3D 模組快取鍵必須隨發布版本更新');
   const rel = page.match(/const RELEASE_VERSION="([^"]+)"/)[1];
diff --git a/tests/wishchip.test.mjs b/tests/wishchip.test.mjs
index 045970df..7e4cb467 100644
--- a/tests/wishchip.test.mjs
+++ b/tests/wishchip.test.mjs
@@ -40,6 +40,11 @@ async function withPage(fn) {
     const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
     await page.goto(`http://127.0.0.1:${PORT}/index.html`);
     await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
+    /* 2026-11-21 製作人逐條同意（docs/acceptance/2026-11-21-hand-shader-warm.md 更正紀錄）：先等手載好、已建立的 shader 全部編完才開始。
+       手的 shader 開頁後在背景預編（js/table-tray.js warmHands）；真人從標題到出價頁遠超過它要的約 3 秒，本檔卻一開頁就開局——
+       不等的話，出價頁第一次出手會同步卡住數秒、吃掉心願標籤 3.5 秒的自動展開窗口（與心願標籤無關的環境卡頓，全套並行時更長）。
+       只改開始的時間點，斷言一條都不動；預編若被拿掉，這裡會立刻放行（手的程式還沒建立），出價頁照舊卡住、H／J／K 照舊紅。 */
+    await page.waitForFunction(() => { const Y = window.__yaoshi3d; return Y.tray.hands.loaded() && Y.renderer.info.programs.every((p) => p.isReady()); }, null, { timeout: 30000 });
     await fn(page, errs);
   } finally { await browser.close(); srv.kill(); }
 }

```
