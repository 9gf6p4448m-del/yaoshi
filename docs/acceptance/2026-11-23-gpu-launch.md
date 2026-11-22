# 驗收條件：測試開瀏覽器收成一個共用函式、WebGL 走顯示卡（2026-11-23，動手前凍結）

**要解決的事**：`tests/*.test.mjs` 有 20 支開瀏覽器，15 支各抄同一段顯示卡旗標，5 支（glb-loader、hand-warm-context、lot-prefetch、movecam、sfx-wiring）沒帶，WebGL 走 CPU 模擬（SwiftShader）——一支吃 9–15 核、風扇大聲，全套並行時還拖累別的測試。製作人 2026-11-23 對硬體調度提案回「按照建議」，其中一項是「妖市走顯示卡＋共用啟動函式＋掃描測試＋驗收拆件」（memory `project_hardware_scheduling.md`）。

**⚠ 併進 main 前要製作人對下面這條點頭**：5 支凍結測試的啟動旗標改成走顯示卡。斷言、門檻、等待時間、案例一字不動，但負載變輕會讓「忙碌造成的假紅」變少，通過機率會上升，屬 02 §2.1 要本人同意的改動。在那之前只放分支 `test/gpu-launch`。

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
