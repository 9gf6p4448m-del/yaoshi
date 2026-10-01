# 席位之手 階段二 2a：四席寫實右手（推／拍／收／閒置）

日期：2026-10-01。版本：v0.59.5（**未部署、未 push**）。基準：`68d25790`（v0.59.4）。
凍結驗收：`docs/experiments/2026-10-01-acceptance-seat-hands.md` 的 #B、#C（未改任何一條）。提案：`docs/proposals/2026-09-30-seat-hands-silhouettes.md` §3、§4、§6、§8.1。
結果口徑照 #F：只寫「觀察到／未觀察到／未驗證」。

## 做了什麼

| 檔 | 內容 |
|---|---|
| `assets/creatures/hand_r.glb` | 階段一原型（1,362 三角形、24 骨、單 primitive、頂點色）原樣複製 |
| `js/hand-motion.js`（新） | 純函式（無 three）：常數表 `HAND`（縮放 0.35、時序）、三姿勢骨旋轉、與 three 同算法的線性混合蒙皮、依目標高度解擺位（俯角＋捲指掃描、逐頂點過地板）、每席一個動作狀態機 |
| `js/table-hands.js`（新） | 四隻手的 three 物件：經 `creature-figures.cloneSkinnedGlb` 載入（同一份 glbCache＋SkeletonUtils.clone＋shareSkeletons），共用一份材質；閒置＝不可見 |
| `js/creature-figures.js` | 新增 `cloneSkinnedGlb`、`glbCached`（管線出口；不穿邊光／描邊外殼，免多 draw call） |
| `js/table-props.js` | `handPaths` 模式：錢整柱被推著滑（取代拋物線，0.42 秒、終點不變）、落標整柱被扒回（0.22＋0.42 秒，不拋起）；唯讀出口 `stackAt／tokenAt／stackSeats／handObstacles／mode／tableY`；`finish()`（跳過：同一條 update 路徑快轉，令牌落地仍由 update 發 onSlam） |
| `js/table-tray.js` | 建立 hands 掛進 group（對決整組收），不進 proxies；lite 與 `?hands=0` 不建 |
| `js/renderer.js` | 既有 ys:bid／ys:mark／ys:market／ys:reveal-result listener 同一處呼叫 hands；doSkip 既有的 ys:fx-trait-cancel → props.finish＋hands.finish |
| `index.html`、`tests/ui-hierarchy.test.mjs` | VERSION／RELEASE_VERSION／兩個 css ?v＝0.59.5（專案版號慣例：ui-hierarchy 的字面版號每版跟著改） |

## 驗收證據

| 條 | 證據 | 結果 |
|---|---|---|
| B1 draw call ≤4 | `hands-probe.mjs`：同一桌面狀態四手凍在場上 vs 全收，L 78−74＝**4**、P 75−71＝**4**；三角形 +5,448＝4×1,362 | 觀察到通過 |
| B1 每手 ≤2,500 | 1,362（node 測試讀 GLB、實頁 stats） | 觀察到通過 |
| B2 perf32／perf128 | `scene-shot.mjs --perf --runs=5`：defaultOnHover **.5954**（paired .519–.737）；`--coins=128 --gate128`：**.6196**、gate128.pass=true；兩者 errors 0 | 觀察到 GREEN（≥.40） |
| B2 補充（非 gate） | 正式 gate 量測時手早已收回（穩態不可見，calls 77/75 與手無關）＝對手的成本零鑑別力。另以 `hands-perf-diag.mjs` 交錯 5 輪量「四手在場 vs 收掉」：中位比 **.7595**（第一版 .5792，優化後；見下） | 觀察到 |
| B3 trace-eq | 對 `68d25790` equal:true；`--mutate` 驗紅 ✅（`trace-eq.txt`） | 觀察到通過 |
| B4 全套測試 | `node --test tests/*.test.mjs`：**423/423**（基準 408 ＋新 15；本輪 sfx-wiring 亦綠）（`full-tests.txt`） | 觀察到通過 |
| B4 取景矩陣 1599 | `table-framing-check.mjs --all`：**1599/1599** 通過、pageErrors 0（三個 viewport；`framing-all-summary.json`）。手不在取景主體內（group 有名稱、selectRoot 排除），矩陣也不出價 | 觀察到通過（不變差） |
| C1 指尖不穿 | node：每幀、每個真實蒙皮頂點 vs 錢／令牌的實例體積（L/P、四席×四格×1/8/12 枚、拍、收、得標脈衝細步進）；實頁（three 0.158）：L 729 幀、P 696 幀，穿入 0 | 觀察到通過 |
| C1 收手後不遮 HUD | 實頁：動作狀態全歸零後可見手 0、與 HUD 框相交 0；node：推／拍／收做完四手皆不可見 | 觀察到通過 |
| C1 不進 hitTest | 實頁：四手在場時於手的投影框內取 324（L）／306（P）點，與「手整組搬走」同步對照逐點相同 | 觀察到通過 |
| C2 P/L | 以上 node 與實頁皆兩版面；P 縮放×0.72 | 觀察到通過 |
| C3 跳過／縮時 | 1/120、1/60、1/20 步進終點逐位元相同，且與「不開手」錢終點相同；中途跳過：手當下全收、終點＝正常播完、令牌各落地一次；結算由 B3 | 觀察到通過 |
| C4 決定性 | Math.random 計數 0；同序列兩次逐幀相同 | 觀察到通過 |
| C5 覆寫／清場 | 同席同格連出 5 次只有 1 手、物件數不增；四席四格 bid 0 同一事件內收手 | 觀察到通過 |
| C6 ys:mark-slam | node：手模組 0 個 DOM 事件、onSlam 落在令牌 t→1 那一幀；實頁：4 個事件，每個發生時已落地令牌數遞增 | 觀察到通過 |
| A2 遺留「走管線」 | 實頁：hand_r.glb 網路請求 1 次（四手）、`glbCached`＝true（以頁面同一 URL import creature-figures 取同一模組實例）、shareSkeletons 有回報 | 觀察到通過 |

### 突變驗紅（原檔不動，突變體放系統暫存目錄，跑完刪除）
- node（`hands-mutants.mjs` → `mutants-node.json`）：14/14 紅，無突變基準 15/15 綠。
- 實頁（`hands-probe-mutants.mjs` → `mutants-probe.json`，L）：6/6 對應閘門轉紅（hitTest 打到手、閒置不歸零、手自己派 slam、每手多一顆網格、地板忽略錢與令牌、繞過 glbCache），原樹全綠。

### 過程中測試抓到並修掉的真因（改實作，不改測試）
1. 實頁探針抓到「收」時手穿進勝方錢柱：得標脈衝把錢放大 ×1.24，手的地板外框沒跟著放大 → `stackAt` 乘上脈衝倍率；並補 node 細步進測試重現（回退即紅）。
2. 新增「地板外框蓋得住真實幾何」測試抓到：外框半徑沒算錢厚（傾斜錢緣突出 R 之外約 0.0006）→ 半徑加 T/2。傾斜頂高同理。
3. 全套測試抓到：node 環境 GLB 載不到時 unhandledRejection → table-hands 載入失敗改為整組不上場（`loadError`）。另：我以 Python 改檔時把 CRLF 寫成 LF，使 `l1-destiny-focus` 的 CRLF 錨點失配，已還原 CRLF。
4. 探針自身：動作窗口原以幀數截斷，uncapped 幀率變高後「收」未做完就量收手後狀態 → 改牆鐘時間並等狀態歸零。此為量測窗口修正（量的仍是收手之後），非放寬。

### 效能優化（B2 補充量測驅動）
四手在場的 CPU 成本來自每幀 819 頂點蒙皮＋逐障礙地板查詢。改為：姿勢插值量化 1/32 後快取蒙皮點、只對手的水平外框碰得到的障礙查地板。比值 .5792 → .7595（同機、交錯 5 輪）。

## 截圖（真遊戲頁、走產品事件、手凍在動作中段；jpg）
`L-push.jpg`、`L-slam.jpg`、`L-rake.jpg`、`P-push.jpg`、`P-slam.jpg`、`P-rake.jpg`（P 依 props-probe 慣例藏 DOM 只看 3D；產品直式本來就整片蓋 #rotateHint）。

## 已知缺口（觀察到但不在凍結條內）／未驗證
- **觀察到**：西／東席位在近側桌角，手臂與深色袖口離鏡頭近，畫面上很大；北席要越過整張托盤才碰得到托盤前的錢與令牌，前臂與袖口在推／拍／收過程中會遮住拍品。直式（P）袖口幾乎蓋滿托盤。收手後不遮（C1 只約束閒置）。是否縮小、換角度或北席不做手，屬品味題，待使用者看圖裁定。
- **觀察到**：動作中手的螢幕外接框與 HUD 框相交的幀很多（見 probe.json `hudDuringAction`；外接框粗估）。HUD 是 DOM 疊在 canvas 上，3D 不會蓋到 HUD，但手會被 HUD 蓋住一部分。
- 同一席一次推多格（AI 開標時一席多格同時推）只有最後一格有手，其餘錢柱自己滑；未做排隊（排隊會改變錢的時序）。
- 席角信物（relic）不列入手的地板：推的起手那幾幀手可能與信物相交。手臂／袖口不檢查與拍品紙紮妖的相交。
- 只做右手、不做鏡像（D6 未驗負縮放繞法，依指示不確定就不鏡像）。
- 跳過走既有的 `ys:fx-trait-cancel`（doSkip 唯一派發點）；props.finish 也讓錢立即到終點，這是本卷新增行為。
- **未驗證**：iPhone 真機 fps 與觀感（本機 Chromium 相對值≠Safari fps）；人眼盲讀（#D 屬後續階段）。
