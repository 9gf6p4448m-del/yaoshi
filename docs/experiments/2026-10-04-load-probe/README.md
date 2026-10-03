# 開局到 3D 牌桌可見：量測報告（2026-10-04，唯讀量測；原型只為量效益，非成品）

基準：origin/main `f8c32942`（v0.59.9，與線上 Pages 內容相同，僅換行差異）。原型分支 `feat/load-probe`（worktree `C:/Users/shung/wt/yaoshi/load-probe`），未動 main、未 push。

## 結論先行

1. **「桌面全黑、等很久」有兩個疊在一起的成因，第一個是 bug 不是慢：**
   `ys:market` 是一次性事件（`index.html:3643 pushMarket3d` → `fx3d`），tray 的 listener 要等 `js/renderer.js` 的整條 import 鏈跑完才註冊（`js/renderer.js:231` 附近）。renderer 比開局晚到時事件就丟了，**沒有任何補播**；tray 保持空（實測 `tray.items()` 四格 key 全為 null，`S.market.length=4`、出價鈕已亮）。桌面要等「下一次 `ys:market`」才補上：本機 Fast4G、不補播、自動連點推進 → 28.7 s 才可見（`raw/loc-fast4g-cpu1-base-advance.json`）；不推進則 45 s 內從未出現（live Fast4G／Slow4G 都是）。這就是「等久就出來」。
2. **renderer 本身到位也很慢，瓶頸是「串行 import 鏈＋與字型／BGM 搶頻寬」，不是 GLB：**
   - 開局只載 **本局拍品＋手**：實測 4 個 GLB（`hand_r.glb`＋本局 3 件；詛咒品是程式生成不載檔），共 **0.59–0.61 MB（gzip）**，不是 35 個／24 MB。
   - 冷快取總下載 6.6–6.9 MB（約 124 req）：**字型 3.45 MB（55 req，Google Fonts CJK 切片）占 50%**、BGM 1.23 MB（title＋market 兩首 m4a）18%、index.html 被抓 3 次共 0.85 MB（兩次是版本探針 `?upd=`）12%、自家 JS 0.49 MB、three（unpkg）0.28 MB、GLB 0.6 MB（9%）。
   - 自家 28 個 JS 模組由 top-level await 的 `await import()` **串行**載入（`js/renderer.js:14-26`、`js/table-tray.js:19-27` 等）：live 無節流下 renderer.js 到 1.75 s 才開始請求、第一個 GLB 在 7.9 s 才發請求（自家 JS 鏈 1.4→7.8 s，每跳約 0.3 s，GitHub Pages TTFB）。
   - 量到的數字（桌面 headless Chromium，WebGL＝SwiftShader 軟體渲染，**不是 iPhone GPU**；cold；表中假設 renderer 就緒時外部補播一次 `ys:market`＝「修好事件遺失後」的下限）：

| 場景 | 出價 HUD 出現 | renderer 就緒(tray 定義) | 4 格全可見 |
|---|---|---|---|
| live 無節流 cpu1（乾淨重跑） | 2.0 s | 6.0 s | **7.4 s** |
| live Fast4G(9 Mbps/60 ms) cpu1（乾淨重跑） | 3.3 s | 8.9 s | **9.8 s** |
| 本機受控 Fast4G cpu1 | 3.0 s | 7.5 s | **8.1 s** |
| 本機受控 Fast4G cpu4 | 4.4 s | 8.7 s | **10.7 s** |
| 本機受控 Slow4G(1.6 Mbps/150 ms) cpu1 | 12.3 s | 32.1 s | **35.1 s** |
| 本機受控 Slow4G cpu4 | 13.8 s | 33.4 s | **36.1 s** |
| 暖快取（同 context 第二次，600 s 內） | 1.7 s | 1.0 s | 2.3–3.0 s |

   出價 HUD 比 tray 早 5–23 s 出現——使用者看到的「HUD 有、桌面黑」就是這段空窗。
3. **網路 vs CPU**：renderer 就緒前全是網路／串行（cpu4 只讓就緒 +1.2~1.3 s）。GLB 到手後到畫面可見的「解析＋建 geometry＋首次編 shader」：cpu1 約 0.5–1.1 s、cpu4 約 2 s（例：Fast4G cpu4 GLB 完成 8.5 s → 全可見 10.7 s）。**CPU 是次要項（≈1–2 s）；網路與串行鏈是主因。** iPhone 的 GPU 上傳／編譯成本未量到。
4. **最小有效組合**（效益為本機受控、cpu1、cold；皆實測於原型）：
   ① 補播最後一次 `ys:market`（修遺失；無此項其他優化都可能被賽跑吃掉）；
   ② `<link rel=modulepreload>` 攤平串行鏈：renderer 就緒 Fast4G 7.5→**4.0 s**、Slow4G 32.1→**14.8 s**；
   ③ 開局關鍵路徑讓路給 tray：字型＋BGM 不與 renderer／GLB 搶頻寬（以 abort 模擬上限）：Fast4G 全可見 6.2→**4.2 s**、Slow4G 30.5→**12.3 s**；
   ④ 載入畫面（見 §3-d），不縮短時間但消除「以為壞掉」。
   GLB 瘦身（量化）只省 ≈0.28 MB／局，優先序最低。

## 1. 請求清單、大小、壓縮、快取

實測 `curl -I -H 'Accept-Encoding: gzip'`（Pages）：`bell.glb` raw 706,648 → 傳 140,784（`Content-Encoding: gzip`）；`.json`、`.js`、`.html`（284 KB 傳輸）皆 gzip；`Cache-Control: max-age=600`、弱 ETag；m4a、woff2 本就是壓縮格式，無 content-encoding。unpkg（three 0.158.0）：gzip，`max-age=31536000`。

- GLB 載入邏輯：`js/creature-figures.js:127-135 loadGlb`（單例 `glbCache`、`GLTFLoader.loadAsync`，無 manager、無進度回呼）；拍賣桌 `js/table-tray.js:933 fillSlot` 只載本局 `setItems` 傳入的 key（`creatureGlbUrl(key)`，`js/creature-figures.js:98`）；手 `js/table-hands.js:31`（`hand_r.glb`）；對決才載 8v8 的單位。**沒有全量預載。**
- **GLB 網址不帶 `?v=`**（`js/creature-figures.js:98-100`）；JS／CSS 帶 `?v=RELEASE_VERSION`（`index.html:2812` 起各處）。後果：每次發版 28 個 JS（0.49 MB）全換鑰匙重抓；GLB 不隨版本失效，只靠 10 分鐘 max-age＋ETag 重驗（GLB 內容改了而檔名不變時，使用者最多 10 分鐘看到舊檔；非本問題成因）。超過 10 分鐘的重訪＝約 120 個條件請求（其中 28 個 JS 仍是串行鏈、每跳一個 RTT）——此「過期重驗」情境**未量**。
- 重複下載：`index.html?upd=…` 版本探針在載入時抓 2 次（各 284 KB，`index.html:2960 checkForUpdate`，`cache:"no-store"`）；`js/trait-fx/vocab.js` 以帶／不帶 `?v` 各載一次（14.8 KB，模組快取鍵分岔）；`assets/characters/*.svg` 開頁先抓 12 個再由 `preloadArt` 命中快取。
- 逐請求明細：`raw/*.json`（t0／回應／完成時間、傳輸 bytes、content-encoding）；彙總用 `node analyze.mjs raw/<檔>.json`，已存 `raw/analysis2.txt`。

live 冷快取代表性時序（`raw/clean-live-none-cpu1-replay1.json`，無節流）：index.html 0→0.76 s；`renderer.js` 1.75 s 起（等 sfx.js／bgm.js／ui-icons.js 的 document.write 同步鏈）；three.module.js 1.81→2.05；其後約 24 個自家模組逐一串行到 7.8 s（第一輪數字，含污染，見 §5）；`hand_r.glb` 7.9→8.2；本局 3 件 GLB 8.4→9.0。

## 2. 節流實測

治具：`probe.mjs`（Playwright CDP：`Network.emulateNetworkConditions`＋`Emulation.setCPUThrottlingRate`；頁內 25 ms 取樣 `tray.items()/readyCount()`；一次只開一支瀏覽器）。流程＝首頁→`startEntry('solo')`→選角→`newGame`→自動點到出價。`--replay 1`＝renderer 一就緒就從外部呼叫 `pushMarket3d()`（模擬補播，不改產品碼）；`--replay 0`＝現況。

| 組合 | 結果 |
|---|---|
| live Fast4G，現況（replay0） | renderer 就緒 7.7 s；**45 s 內 tray 從未出現**（HUD 3.0 s） |
| live Slow4G，現況（replay0） | renderer 就緒 32.3 s；**45 s 內從未出現**（HUD 12.5 s） |
| 本機 Fast4G，現況＋自動推進 | tray 28.7 s 才出現（下一次 `ys:market`） |
| live Slow4G cpu1／cpu4，replay1（第一輪，有污染） | 全可見 36.7 s／37.8 s（本機受控 35.1／36.1 同量級，表以後者為準） |

CPU 4× 對 GLB 後段（renderer 就緒→全可見）：Fast4G cpu1 0.6–0.9 s → cpu4 約 2.0–2.2 s。

## 3. 候選方案效益與風險（原型實測；伺服器＝`serve.mjs` 仿 Pages：gzip、max-age=600）

| 本機受控 cpu1 cold | Fast4G 就緒／全可見 | Slow4G 就緒／全可見 |
|---|---|---|
| 現況（不補播） | 7.9 s／**從未** | 32.0 s／**從未** |
| (R) 補播 | 7.5／8.1 | 32.1／35.1 |
| (M) modulepreload（無補播；賭贏賽跑才可見） | 4.0／6.3 | 14.8／30.5 |
| (M+R) | 4.0／6.2 | 14.8／30.5 |
| (M+R+G) 再加 `newGame` 當刻預取本局 GLB | 4.0／6.2 | 14.8／30.5 |
| (R) 並砍字型＋BGM（abort 模擬） | 4.4／5.0 | 12.1／15.0 |
| (M+R+G) 並砍字型＋BGM | 2.5／**4.2** | 7.3／**12.3** |
| (M+R+G) 只砍字型 | 2.5／4.2 | 7.0／14.3 |
| cpu4：(R)／(M+R+G) | 8.7→10.7／6.3→8.0 | 33.4→36.1／17.0→31.1 |

- **(a) 只載本局 GLB**：**現況已是這樣**（4 個 GLB、0.6 MB gzip）。無可再省，勿在此投入。
- **(b) 背景預載**：本局拍品在 `newGame` 才決定（`market3dItems`），選角／首頁階段不知道要預載哪些；唯一確定的是 `hand_r.glb`（36 KB gzip），收益可忽略。上表 (G) 在 `newGame` 當刻預取、與 `setItems` 同刻，**無增益**（實測相同）。若要預載需先約定「可預知的拍品池」（預載 27 隻全量＝5.1 MB gzip，慢網只會更擠）——不建議。
- **(M) modulepreload／攤平 import 鏈**：高效益、低風險、**不改任何像素**。要列出約 24 個模組網址並帶 `?v=<RELEASE_VERSION>&fxvocab=<0|1>`（模組快取鍵是整個網址，錯一字元就變成白抓兩份）；需有測試比對清單與版本（比照 `tests/ui-hierarchy.test.mjs` 對 `safe-area.css?v=` 的做法）。three 的 4 個 unpkg 檔也要預載。限制：`fxvocab` 由頁內 `PW_FX.VOCAB_ON` 決定（`index.html:6144/6183`），預載清單須在其解析後產生（原型只驗預設 0）。
- **(R) 補播**：必做。renderer 就緒後若 `window.__lastMarket3d`（由 `fx3d` 記錄最後一次 `ys:market` detail）存在就重派。風險：低；需確認補播與 `trayRound`／`clearRound` 的語意（同一夜重派＝不清桌，`js/renderer.js:226-227`）。**不改任何像素。**
- **字型＋BGM 讓路**：最大單項，但**會碰視覺**：(i) 字型：Google Fonts 載 LXGW WenKai TC＋Noto Sans TC 55 個切片 3.45 MB；改自託管精簡子集（只含遊戲實用字，估 100–300 KB，**未量**）、或 tray 可見後才載（FOUT、文字換字型）。凡涉字型的畫面比對（text-fit、card-dock-font 類凍結）都會受影響。(ii) BGM：把 `market.m4a`（615 KB）延到 tray 可見後才抓，只影響聽覺起點。(iii) 版本探針 `?upd=` 兩次 0.57 MB：延到 tray 可見後再跑，無視覺影響。
- **(c) GLB 壓縮**：本機**沒有** gltfpack／gltf-transform（`which` 查無；`tools/anyCreature/node_modules` 只有 playwright、three），meshopt／Draco **未實測**。改以可重現估算替代（`glb-quant-estimate.mjs`，非 meshopt）：35 檔屬性量化（position int16、normal int8、color／weights u8、joints u8）後重新 gzip：**5.10 MB → 2.74 MB（−46%）**；本局 4 檔約 0.6 MB → 0.32 MB，**每局只省 ≈0.28 MB**（相對 6.6 MB 總量 4%）。GLB 解剖（`glb-anatomy.mjs`、`raw/glb-anatomy.tsv`）：23.8 MB raw 中 skin(joints/weights) 8.2 MB、position／normal／color 各 4.07 MB、index 1.8 MB、動畫 0.54 MB、**貼圖 0**。風險：量化改頂點精度與法線，**逐像素驗收（hand-realism、table-framing、A2 各件凍結檔）全要重驗**；GLB 由 `tools/anyCreature` 產線輸出，需在產線端處理。優先序最低。
- **(d) 載入畫面**：現有程式有可掛點：
  - 對決已有現成機制：`ys:duel-loading {loaded,total}`（`js/duel-figures.js:856`）＋`#duelLoad`「召喚中… n/total」＋`PW_FX.LOAD_SHOW_MS`／`LOAD_MAX_MS` 上限逾時（`index.html:7735-7747 pwAwaitFigures`）。拍賣桌**沒有**對應物。
  - 拍賣桌可掛的點：`tray.setItems()` 回傳 `Promise.all(jobs)`（`js/table-tray.js:1005`）、`tray.loaded()`、`tray.readyCount()`（皆已存在）；`loadGlb` 可傳 `loadAsync(url, onProgress)` 取位元組進度（目前未用）。
  - renderer 尚未就緒的階段（本次最大空窗）沒有任何事件可聽：`window.__yaoshi3d` 在 `js/renderer.js:305` 才賦值；需新增「3D 就緒」事件或讓 index.html 輪詢 `window.__yaoshi3d?.tray`。
  - 建議：開局時若 `!window.__yaoshi3d` 或 tray 未全就緒就顯示「請神入座中…」，進度＝`readyCount()／本局件數`，上限比照 `LOAD_MAX_MS` 逾時撤除。DOM 疊層，**不改 3D 像素**；但與 HUD 層級／面板驗收（panel-opaque、ui-hierarchy 類）互動，需過一次。

## 4. 建議最小有效組合與驗收影響

| 項 | 修什麼 | 預期（Fast4G／Slow4G 全可見，cold） | 逐像素 3D 驗收（hand-realism、table-framing、A2 凍結檔） |
|---|---|---|---|
| R 補播最後一次 `ys:market` | 事件遺失（根因 1） | 現況「從未」→ 8.1／35.1 s | 不受影響（同一份資料晚點餵給 tray；若凍結檔量「進場後第 N 幀」需對齊起點時序） |
| M modulepreload 攤平鏈 | 串行 import | → 6.2／30.5 s（就緒 4.0／14.8） | 不受影響（載入順序，不改內容） |
| 字型＋BGM＋版本探針讓路 | 搶頻寬 | → 約 4.2／12.3 s | 字型方案**影響文字比對**類凍結（text-fit、card-dock-font）；BGM／探針不影響像素 |
| D 載入遮罩（含上限逾時） | 體驗 | 不縮短，消除「以為壞掉」 | 不改 3D；需過 HUD 層級驗收 |
| GLB 量化／meshopt | 位元組 | 每局 −0.28 MB | **全部重驗**（頂點精度變） |

建議順序：R（必做）→ M → D → 讓路 → 最後才考慮 GLB 壓縮。R＋M＋D 都不改 3D 像素，可在不動凍結檔的前提下先出。

## 5. 量不到／限制

- 全部是桌面 headless Chromium＋SwiftShader（`ANGLE (Vulkan, SwiftShader)`），**不是 iPhone Safari**：GPU 上傳／編譯成本、Safari 連線數與優先級、`modulepreload` 在 iOS 的行為皆未實測（需實機）。CPU 4× 節流只管主執行緒，不影響 GPU。
- live 數字含這台機器到 GitHub Pages 的實際 RTT（TTFB 約 0.3 s／檔，使串行偏貴）；受控組用本機伺服器＋CDP 延遲 60／150 ms，兩組並列。台灣手機到 Fastly 的實際 RTT 未知。
- 第一輪 live 矩陣（`raw/live-*.json`）執行期間，有一支我先前啟動、未回收的探針瀏覽器同時開著（閒置但持續渲染），發現後已殺掉；none／Fast4G 兩項以乾淨重跑取代（`raw/clean-live-*.json`：renderer 就緒 6.0 s vs 8.4 s、8.9 s vs 8.0 s，顯示污染量約 ±1–2 s）。live 的 Slow4G／cpu4／replay0 未重跑，表中 Slow4G 以本機受控值為準。
- 每格只跑 1 次（無重複取樣、無變異數）；跨組差異 <1 s 不構成結論。
- 過期重驗（>10 分鐘重訪）、`fxvocab=1` 的預載清單未量。
- 原型只在 `feat/load-probe` 的 `index.html`（head 內 `LOAD-PROBE PROTOTYPE` 區塊、`fx3d` 記錄＋預取）與 `js/renderer.js`（補播一行）；以 `?proto=pre,replay,glb` 開關，**不是成品**，不得合併。
