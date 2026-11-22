# 驗收條件：測試開瀏覽器收成一個共用函式、WebGL 走顯示卡（2026-11-23，動手前凍結）

**要解決的事**：`tests/*.test.mjs` 有 20 支開瀏覽器，15 支各抄同一段顯示卡旗標，5 支（glb-loader、hand-warm-context、lot-prefetch、movecam、sfx-wiring）沒帶，WebGL 走 CPU 模擬（SwiftShader）——一支吃 9–15 核、風扇大聲，全套並行時還拖累別的測試。製作人 2026-11-23 對硬體調度提案回「按照建議」，其中一項是「妖市走顯示卡＋共用啟動函式＋掃描測試＋驗收拆件」（memory `project_hardware_scheduling.md`）。

**⚠ 併進 main 前要製作人對下面這條點頭**：5 支（修訂一、二之後剩 2 支：glb-loader、sfx-wiring）凍結測試的啟動旗標改成走顯示卡。斷言、門檻、等待時間、案例一字不動，但負載變輕會讓「忙碌造成的假紅」變少，通過機率會上升，屬 02 §2.1 要本人同意的改動。在那之前只放分支 `test/gpu-launch`。

**作法**（產品程式一行不動；不單獨出版、不推 main；GPT：略過，純技術）：
- 新 `tests/browser.mjs`：`launchGpu(chromium)`，旗標與現有 15 支逐字相同。
- 20 支測試各改兩行：加 import、啟動改 `launchGpu(chromium)`。其餘一字不動。
- 新 `tests/browser-launch-scan.test.mjs`：①掃測試檔與它們載入的本地模組，程式碼裡出現啟動／連線瀏覽器的字樣就紅，例外要在同一行或上一行寫「// 不走顯示卡：<理由>」②判準正反例③`launchGpu` 開的頁面 WebGL 不是 CPU 模擬。
- 新 `tools/gated.sh`：`gated`／`gated_x`，驗收腳本每條件各過一次閘門、做完交還；`CLAUDE.md`「工作樹與工具」加一條。
- 不動：`tests/tools/`、`tools/anyCreature/`。4 支測試用子程序呼叫 `tests/tools` 的腳本：curse-cam-probe、hand-lot-pen、scene-shot 都已帶 d3d11，throw-seat-timing 不開瀏覽器。
- 「只能在 CPU 下成立」的測試：0 支。逐像素比對基準圖的測試：0 支（截圖都只是 `SHOT_DIR` 存檔佐證）。

## 凍結前基準（ecd1b3ca 的測試，桌機、過閘門；紀錄在 `tmp/v0664/`，不進 git）

**改前（CPU）／改後（顯示卡，用 `gpu-preload.mjs` 只換旗標、測試檔沒動）**

| 測試 | 繪圖器 改前→改後 | CPU 改前→改後 | 時間 改前→改後 | 現行產品 |
|---|---|---|---|---|
| glb-loader（W＋W2） | SwiftShader→RTX 5070 Ti | 9.3→1.6 核 | 66.6→63.5 秒 | 綠→綠 |
| glb-loader（整檔 19 項） | 同上 | —→0.5–1.0 核 | 686→673、676 秒 | 綠→綠×2 |
| hand-warm-context | SwiftShader→RTX 5070 Ti | 4.0→1.3 核 | 3.3→5.7 秒 | 綠→綠 |
| lot-prefetch | SwiftShader→RTX 5070 Ti | 11.2→1.1 核 | 34.2→30.5 秒 | 綠→綠 |
| movecam | 沒開 WebGL（兩邊都 0 個 context） | 1.0→0.7 核 | 112.5→112.4 秒 | 綠→綠 |
| sfx-wiring | SwiftShader→RTX 5070 Ti | 14.6→0.6 核 | 713→663 秒 | 綠→綠 |

（glb-loader 的核數是 `gl-gpu.test.mjs`＝只換旗標的副本量的。空白頁 rAF 兩種都 60.1 fps。）

**壞版本紅綠（改前 CPU／改後顯示卡）**

| 測試 | 壞版本 | 改前 | 改後 |
|---|---|---|---|
| glb-loader W／W2 | sync micro timer await nonext nosig nextthen noguard | 8 個全紅（`2026-11-23-loader-tests.md`） | 8 個全紅，同一條斷言 |
| glb-loader 整檔 | 舊樹 79af5f85（v0.66.1） | F1、F2、F3、F5×2 紅、F6 綠（`2026-11-22-v0.66.2-loader.md`） | 同樣紅綠；F5 往前撥 8449ms（原 8484ms） |
| hand-warm-context | 舊樹 bebb8fd9（v0.66.0） | 紅「0/1 顆有編好的程式」 | 紅，同句 |
| lot-prefetch | 舊樹 bebb8fd9 | 紅「等了 7162ms」 | 紅「等了 7071ms」 |
| movecam | 舊樹 71918da5、2a144ac7 | 紅「MOVECAM_HOLD 仍是有限數陣列：undefined」（結構差異，另補下面三個行為面的） | 紅，同句 |
| movecam | hold：`MOVECAM_HOLD` 輕的 250→0 | 紅「輕：tier1 每招比 movecam=0 多停 250ms」 | 紅，同句 |
| movecam | ghost：殘影上移 12px | 紅「M2 1→2 行：殘影與主字幕 rect 不得相交」 | 紅，同句、同座標 |
| movecam | end：結尾列上緣貼齊 arena 底 | 紅「r4-L2 844x390 垂直相交 ≤2.44px，實測 3.25px」 | 紅，實測 3.26px（都 37 幀） |
| sfx-wiring | 不播揭盅 | 紅「seed 1 揭盅音次數 ≠ 得標件數」 | 紅，同句 |
| sfx-wiring | 落籌播成木魚／跳過時不靜音／`?sfx=0` 不靜音 | 沒跑（每支 11 分鐘、14.6 核） | 三個都紅在對應斷言 |

**掃描測試對基準版**：紅，「20 處直接啟動瀏覽器又沒有理由註記」，逐行列出的 20 處＝`grep chromium.launch(` 的 20 處；判準正反例綠。套用改法的暫存副本：3／3 綠，掃 134 支檔、用 `launchGpu` 的 20 支；條件 1 的突變 a、b、c 各 1 次都紅在該處（`tmp/v0664/scan-summary.txt`）。

**全套基準**：c2f8abfc `--test-concurrency=6` 獨佔 670 項：668 過、1 紅（nightwalk #1）、1 跳過（`2026-11-22-v0.66.3.md` 條件 10）。分支另加 glb-loader W2。

## 條件（全部要過）
1. **掃描測試**：改後 3／3 綠，用 `launchGpu` 的測試檔＝20。突變各自要紅：(a) 拿掉 `browser.mjs` 的旗標 → ③ 紅在「WebGL 在 CPU 上模擬」；(b) 任一支改回 `chromium.launch()` → ① 紅且只列那 1 處；(c) 把直接啟動搬進一支被測試 import 的 `tests/tools` 模組 → ① 紅且列出那支模組。
2. **只換旗標**：`git diff --numstat ecd1b3ca -- tests` 的 20 支既有檔各 +2／−1，內容只有 import 行與啟動行；`launchGpu` 傳給 `chromium.launch` 的參數與 15 支原本的字面值深度相等；產品（`index.html`、`js/`、`assets/`）差異 0 行。
3. **真的走顯示卡**：改後的測試檔實跑時（`gpu-preload.mjs` 只記錄、不換旗標），glb-loader、hand-warm-context、lot-prefetch、sfx-wiring 記到的繪圖器只有 RTX 5070 Ti、SwiftShader 0 次；CPU 平均 ≤4 核。
4. **沒變紅**：改後 hand-warm-context、lot-prefetch、movecam 各連跑 5 次全綠；glb-loader 整檔 1 次、sfx-wiring 2 次全綠。movecam 的 r4-L2 若紅（DECISIONS 2026-10-11 已記 0.5px 既有波動），照 v0.66.2 修訂一：同條件下與 ecd1b3ca 各 5 次對照，紅的次數相當才算。
5. **鑑別力還在**（改後的測試檔）：hand-warm-context、lot-prefetch 對 bebb8fd9 紅在上表同一句；movecam 對 hold、ghost、end 紅在上表同一句；glb-loader 對 micro、nosig 紅；sfx-wiring 對「不播揭盅」紅。
6. **全套**：`node --test --test-concurrency=6 tests/*.test.mjs`（獨佔）失敗集合 ⊆ {nightwalk #1}；依 v0.66.2 驗收修訂一至四列管的負載型（movecam、H3-b、V-bead、relic-micro、hand-first-throw、開頁逾時）若紅，照那幾條的既有程序處理。
7. **拆件**：`gl3-run.sh` 用 `tools/gated.sh`，每條件各過一次閘門；`gl3-gate.log` 的放行次數＝條件件數；`gated_x` 每處都有理由註解。
8. **冷讀**：沒有對話史的 fresh agent 讀 diff 反駁「判準沒放寬、掃描擋得住」，CRITICAL／HIGH 為 0 或修完後三態複審。

## 電腦忙時會假紅的測試與症狀（盤點，出處＝括號內的驗收檔）
| 測試 | 症狀 | 現行處理 |
|---|---|---|
| movecam r4-L2 | 版面判準差 0.5px（932×430 `res.top` 293.09 對 293.59），單獨跑也有 4／5 的時候；M2 殘影也紅過 | 與 main 同條件對照、紅的次數相當才算（v0.66.2 修訂一；DECISIONS 2026-10-11） |
| h3-affordance H3-b | 「出現不到 2 秒就消失」：頁內計時器與 node 端時間對不齊 | 與 main 同條件對照（v0.66.2 修訂一） |
| hand-first-throw | 「點下去到第一次畫手之間主執行緒最長卡了」411／419／422ms，單獨 244–262ms | 單獨跑（v0.66.2 修訂四） |
| relic-micro（含 V-smoke、V-bead） | 像素差落在門檻邊緣（3.90 對 4） | 單獨 5／5（v0.66.2 條件 10） |
| hand-realism-render、light-aplus-robust | `page.goto` 30 秒開頁逾時，斷言沒跑到 | 獨佔單獨 5／5（v0.66.2 修訂二） |
| wishchip | 手的 shader 背景編譯吃掉 3.5 秒窗口 | 已改成預編後再開局（2026-11-21-hand-shader-warm） |
| glb-loader F2 | 取樣太早 | 已改取樣點（v0.66.2 修訂二） |
| sfx-wiring | 15 並行時單局開很久 | 已放寬時間預算（2026-10-10）；改顯示卡後待觀察 |
| 全套 | 15 並行每次紅的不一樣 | 固定 `--test-concurrency=6` 獨佔（v0.66.2 修訂三） |

## 執行中的修訂（一）（2026-11-23，冷讀第 1 輪之後；原文不刪。⚠ 第 1 點縮小了改動範圍，併 main 前一起請製作人過目）
冷讀（沒有對話史的 opus，審 7d7a30aa）：CRITICAL 0、HIGH 4。逐條：

1. **hand-warm-context、movecam 不走顯示卡，改回直接啟動、只加一行理由註記（HIGH-1）。** 走顯示卡的剩 3 支：glb-loader、lot-prefetch、sfx-wiring；用 `launchGpu` 的共 18 支。
   - 原標準錯在：以為換繪圖方式不影響 hand-warm-context 的鑑別力，壞版本只跑了 bebb8fd9（紅在 A 段就結束，沒走到 B 段），檔頭點名的 f2ff1ad7 沒跑。movecam 沒開 WebGL，改了沒有好處、只有動到時序判準的風險。
   - 為什麼現在才知道：凍結前沒有逐段對照檔頭寫的鑑別力；冷讀指出後才補量。
   - 數字（`tmp/v0664/gl4-summary.txt`，各 3 次）：f2ff1ad7 在 CPU 3／3 紅「context 恢復時預編丟出未捕捉例外」（TypeError … isReady）；顯示卡 3／3 沒有例外，紅在另一條「0／1 顆重新編好」。另一個壞寫法（`compileQuietly` 換回 `renderer.compileAsync`、保留恢復重編）CPU 3／3、顯示卡 3／3 都綠——這是測試原有的盲點，不是這次造成，記錄、不在本批處理。
   - 這兩支回到 ecd1b3ca 的啟動方式，通過機率與改前相同。
   - 條件跟著改：條件 1 的「＝20」→ 用 `launchGpu` 18 支＋有理由註記 2 支；條件 2 的 20 支各 +2／−1 → 18 支各 +2／−1、movecam 與 hand-warm-context 各 +1／−0（只有註解）；條件 3 的名單去掉 hand-warm-context。條件 4、5 裡這兩支照跑（CPU）。
2. **掃描測試加嚴（HIGH-2、HIGH-3）。** 跟檔改成「測試檔裡任何指向 tests/ 內腳本的路徑字樣」（變數載入、子程序、path.join 都算）再照 import 跟到底；`browser.mjs` 鎖成只准有那一行、逐字相同；上一行註記必須是整行註解、理由至少 6 字；測試以外的腳本要自己帶 d3d11；跟檔用四支真檔當正例（靜態 import、子程序、只寫檔名、變數載入）；`connect` 只認 `chromium.connect` 這類，WebAudio 的 `osc.connect()` 不再誤擋；繪圖器實測只在 Windows 跑。掃的範圍 134→158 支檔。
   - 條件 1 的突變增為 a–g：(d) `browser.mjs` 多一個出口、(e) 測試用變數載入的新模組裡直接啟動、(f) 被子程序呼叫的 `curse-cam-probe` 拿掉 d3d11、(g) 上一行只有行尾註記 → 各自要紅。
3. **`tools/gated.sh`（HIGH-4）**：記錄檔先轉成絕對路徑、交還失敗再試一次並印出來；註解寫明不要巢狀、桌機目前兩個函式效果相同。假閘門驗過：相對路徑＋被包的函式 cd 走＋失敗碼 5、沒放行、交還失敗、含空白的參數（`scratchpad/gt/t.sh`）。
4. **加嚴的補量**：
   - 條件 3 加「每支至少記到 1 筆」。條件 5 加：hand-warm-context 對 f2ff1ad7 紅在「未捕捉例外」、sfx-wiring 對「不播受咒」「不播封標」紅（改前 CPU、改後顯示卡都已量過，同一條斷言）。
   - sfx-wiring 同一個種子每次走的局不同：CPU 就是這樣（seed 1：10 夜 26 件、8 夜 23 件、9 夜 25 件、8 夜 21 件），不是顯示卡造成。
   - lot-prefetch 的等待值：單獨 CPU 8／92／324ms、顯示卡 683／677／685ms；五支瀏覽器測試當負載時 CPU 105／330／96／88／97ms、顯示卡 687／689／688／674／743ms（門檻 1000，10／10 綠）。顯示卡下頁面走得快，等待接近假線路頻寬算出來的值，比 CPU 嚴；壞版本 7162→7071ms。
   - 表裡漏寫：glb-loader 舊樹 79af5f85 在顯示卡上 K、P 是綠的——這兩個守的是後來修法可能犯的錯（P：541eab03 曾紅；K：v0.66.3 r3 前預審模擬的壞寫法），舊樹本來就過，CPU 對照表也沒列它們。
5. 不處理（記錄）：理由註記的內容好壞機械判不了；字串拼出來的路徑、腳本再開子程序叫的腳本、playwright 以外的套件不涵蓋（檔頭有寫）；Linux 雲端 session 跑不了這 18 支（15 支原本就是）；movecam 條件 4「紅的次數相當」沒有數字——movecam 已不改，條件只用來確認沒動到它。

## 執行中的修訂（二）（2026-11-23，冷讀第 2 輪之後；原文不刪。⚠ 與修訂一第 1 點一樣縮小改動範圍，併 main 前要製作人針對這兩點明確同意）
冷讀第 2 輪（另一個沒有對話史的 opus，審 b2a99d88）：原 4 條 HIGH＝3 真的修好、HIGH-2 表面修好；新 CRITICAL 0、新 HIGH 1。逐條：

1. **lot-prefetch 也留在 CPU（新 HIGH-N1、M-3）。** 走顯示卡的剩 **2 支：glb-loader、sfx-wiring**；用 `launchGpu` 共 17 支，有理由註記 3 支（hand-warm-context、lot-prefetch、movecam）。
   - 修訂一第 4 點的兩句話是錯的，更正：①「五支瀏覽器測試當負載」不實——light-aplus 在那份副本裡找不到 playwright、1.35ms 就結束，其餘三支 32–106 秒跑完後只剩 h1-guide，實際只有 gpu-5（743ms）是較重負載；②「等待接近假線路頻寬算出來的值」算術不合——第 1 夜 4 件＋第 2 夜 3 件＋手共 15.2 秒就下完，測試停 20 秒，第 2 夜上桌時線路早已空。多出來的約 680ms 推算不是下載，真因沒實測。
   - 因此顯示卡會讓跟預載無關的時間吃掉 1000ms 門檻的餘裕（670ms 以上→257–326ms），不改比較好。這支單獨只跑 34 秒，省下的有限。
   - 為什麼現在才知道：第一輪之後才補量等待值，又沒有檢查負載那幾支真的有跑起來。
   - 條件跟著改：條件 1 → 17 支＋3 支註記；條件 2 → 17 支各 +2／−1、3 支各 +1／−0；條件 3 → glb-loader、sfx-wiring 兩支，每支至少記到 1 筆 RTX、SwiftShader 0 次。條件 4、5 裡這三支照跑（CPU）。
2. **movecam 的說明更正（M-4）。** 「0 個 WebGL context」凍結表就寫了，當時仍想統一成一種寫法；修訂一說「現在才知道」對它不成立，改的理由是「沒有好處、只有動到時序判準的風險」。另外中止的 gl3 那輪 `movecam-5` 是紅的（`newPage: Target crashed`）：那是我 04:53–04:54 手動停腳本、逐一結束程序造成（`gl3-gate.log` 持有者 04:54 死亡；同一輪前 4 次綠），不是測試結果，不採計。
3. **掃描測試再補（HIGH-2、M-1、M-2、M-7、正例不足）。** 第二跳也跟（含 import／from／require／new URL 的行）；範圍加 `tools/`；開頭斜線、只寫檔名（子資料夾）也解析；測試以外的腳本，d3d11 必須真的在啟動參數裡、不得同時 `--disable-gpu`；`KNOWN` 只對 tool-options 這一個提到者有效；理由先去尾空白；跟檔另用治具樹驗 14 種要跟、4 種不跟。掃 159 支檔（多了 grab-probe）。
   - 條件 1 的突變增為 a–k（另有 b2）：b 回到凍結時的定義「任一支改回 `chromium.launch()`」，b2＝拿掉 movecam 的註記；(h) 第二跳的 grab-probe 裸啟動、(i) `tools/` 裡的新模組裸啟動、(j) d3d11 只寫在註解、(k) 別支測試也用 market-card-readability → 各自要紅。
4. **`tools/gated.sh`（M-6）**：`"$@" || r=$?`，呼叫端 `set -e` 也會交還（假閘門驗過）；註解寫明被包的函式不要 `exit`。
5. **補量（M-5）**：glb-loader 的 K 對 89f52efa、M 對 ea8fc377、P 對 541eab03，CPU 與顯示卡各 1 次，6 次都紅在同一條行為斷言（「會恢復的原下載在預定恢復前就被中止」「已收的位元組丟掉」；`tmp/v0664/gl7a-summary.txt`）。修訂一把 K 寫成「預審模擬的壞寫法」不準：K 紅在 89f52efa、M 紅在 ea8fc377、P 紅在 541eab03，都是可直接跑的 commit。
6. sfx-wiring「同種子每次局不同，CPU 就是這樣」：4 筆 CPU 裡只有 1 筆是現行產品，另 3 筆是壞版本（不播揭盅、受咒、封標——這三種只改聲音呼叫、仍照抽亂數）。
7. 不處理（記錄）：`const { chromium: c } = pw; c.connect(ws)`、省略副檔名的 require、測試以外腳本把路徑寫在別行；工具檔多行寫啟動參數會被誤擋（換成一行即可）。

## 執行中的修訂（三）（2026-11-23，冷讀第 3 輪之後；原文不刪。⚠ 第 1 點是放寬，併 main 前和修訂一第 1 點、修訂二第 1 點一起請製作人同意）
冷讀第 3 輪（另一個沒有對話史的 opus，審 75b6e61b）：前一輪 11 條＝9 真的修好、2 表面修好（M-1、M-7）、0 沒修到；新 CRITICAL 0、新 HIGH 0。三輪額度用完，以下都不到 HIGH。逐條：

1. **掃描測試有一處比凍結版寬，修訂一第 2 點沒講（N-3）。** 凍結版對「被測試載入的模組」是有啟動字樣就紅；修訂一之後，測試以外的腳本自己帶 d3d11 就放行。冷讀實測：同一行帶三個旗標的啟動加進 `appraise-c-lib.mjs`，7d7a30aa 紅、75b6e61b 綠。修訂一把它寫在「加嚴」底下，不對，這是放寬。
   - 原標準錯在：凍結版只跟測試的 import，跟檔範圍補到子程序之後，`tests/tools` 裡原本就自己帶 d3d11 的腳本（例：curse-cam-probe）會全部被擋，而它們本來就走顯示卡。
   - 為什麼現在才知道：凍結時沒有跟子程序，基準版掃不到這些腳本。
   - `connect` 只認 `chromium.connect` 這類（修訂一第 2 點已寫理由）同樣是收窄，一併列入請製作人同意的清單。
2. 修訂二的更正：
   - 第 1 點①「實際只有 gpu-5 是較重負載」漏了 cpu-1（L-1）：兩輪負載約 05:35:56、05:40:49 起，cpu-1（105ms）與 gpu-5（743ms）都落在各輪前 40 秒。補上之後更支持 lot-prefetch 留在 CPU。
   - 第 3 點「d3d11 必須真的在啟動參數裡」說過頭（N-1）：工具檔這四種寫法仍綠——裸啟動後面接行尾註解裡的完整啟動、同一行三元兩個啟動、參數裡三元選 swiftshader、d3d11 後再接 swiftshader 或雙引號的 `--disable-gpu`。掃描範圍內目前都沒有這樣寫的檔。
   - 條件 3 的重述漏了「CPU 平均 ≤4 核」；條件 7 的 `gl3-run.sh`／`gl3-gate.log` 那輪已中止，實際用的是 `gl7-run.sh`／`gl7-gate.log`（L-2）。兩條都照原文判。
3. **`tools/gated.sh`（N-2，已修）**：被包的函式沒宣告 local 就用變數 `r` 時，gated 會回錯的失敗碼（`r=9; return 0` → 回 9），是修訂二第 4 點帶進來的；同名的 `log` 也會讓交還寫錯記錄檔。改成 `_r`、`_log`。假閘門（`scratchpad/gt/n.sh`）：改前 rc=9、改後 rc=0；`t.sh`、`e.sh` 照舊全對。gl7 各函式都有 local，數字不受影響。
4. 不處理（記錄）：N-1；M-1 殘留（`path.join(ROOT,'tools','x.mjs')` 這種多段寫法跟不到根 `tools/`，目前根 `tools/` 沒有進版控的 js）；N-4 複製有註記的測試當新測試範本會一起放行（只印在診斷、沒有斷言）；M-7 殘留（tool-options 自己真的去跑 market-card-readability 仍綠）；`.mts`、第二跳換行寫路徑不跟。這幾條的後果都只是「某支測試或工具走 CPU」，不會讓壞產品通過。

## 執行結果（2026-11-23，桌機；被測 75b6e61b，`tmp/v0664/gl7-summary.txt`，起訖工作樹都乾淨）
| 條件 | 結果 | 數字 |
|---|---|---|
| 1 掃描測試 | 過 | 5／5 綠，掃 159 支、`launchGpu` 17 支、註記 3 支；突變 a、b、b2、c–k 共 12 個各 1 次全紅，還原後全綠（`scan3-summary.txt`） |
| 2 只換旗標 | 過 | 17 支各 +2／−1、3 支各 +1／−0；旗標與 15 支原字面值深度相等 15／15（`argeq.mjs`）；`index.html`、`js/`、`assets/` 差異 0 行 |
| 3 真的走顯示卡 | 過 | glb-loader：RTX 5070 Ti 18 筆、SwiftShader 0、CPU 平均 0.7 核；sfx-wiring 兩次：RTX 各 6 筆、SwiftShader 0、0.7／0.8 核（上限 4 核） |
| 4 沒變紅 | 過 | hand-warm-context、lot-prefetch、movecam 各 5／5 綠（CPU，movecam r4-L2 沒紅）；glb-loader 整檔 19／19（674 秒）；sfx-wiring 2／2（711、700 秒） |
| 5 鑑別力 | 過 | hand-warm-context：bebb8fd9 紅「0/1 顆有編好的程式」、f2ff1ad7 紅「TypeError … isReady」；lot-prefetch：bebb8fd9 紅「等了 7184ms」；movecam：hold、ghost、end 紅在表上同一句（end 3.26px、37 幀）；glb-loader：micro 紅 W＋W2、nosig 紅 W2；sfx-wiring：不播揭盅、不播受咒、不播封標紅在對應斷言 |
| 6 全套 | 過 | `--test-concurrency=6` 獨佔 676 項：674 過、1 紅（nightwalk #1，既有，只差「抓交替水符→水鬼名冊」）、1 跳過（`YAOSHI_OLD_GM_PATH` 沒給）；1126 秒、CPU 平均 2.4 核。負載型的測試都沒紅 |
| 7 拆件 | 過 | `gl7-run.sh` 19 件，`gl7-gate.log` 放行 19、交還 19、沒放行／漏還 0；`gated_x` 4 處都有理由註解 |
| 8 冷讀 | 過 | 3 輪，最後一輪 CRITICAL 0、HIGH 0 |

全套的 CPU 是整輪平均；改前沒有在桌機量過同條件的整輪 CPU，不拿來比。`tools/gated.sh` 的變數改名在 gl7 之後，只重跑掃描測試與假閘門，產品與測試檔沒再動。

**未做**：製作人同意（啟動旗標＋修訂一第 1 點、修訂二第 1 點、修訂三第 1 點），所以沒併 main。
