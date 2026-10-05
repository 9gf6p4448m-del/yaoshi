# v0.61.0 席位之手 批 1 身分變體＋拍令牌拇指收角——實作與驗收報告（①–④；⑤⑥ 待簽核）

分支 `feat/v0610-hands-b1`（工作樹 `C:/Users/shung/wt/yaoshi/hands-b1-impl`），基準 `4691a7ce`（乾淨基準樹 `C:/Users/shung/wt/yaoshi/hands-b1-base`）。
驗收以 `acceptance.md`（凍結，commit 6d08af39）為準，**一個字未改**。量測位置：本機桌機 Chromium（ANGLE D3D11）／node；**iPhone 未驗**。未 push。
SHA 與分段見 `progress.md`。

## 總表

| # | 結果 | 一句話證據 |
|---|---|---|
| 1 trace 等價 | 過 | `c1-trace-eq.txt`：seeds 1..20 equal:true（`--mutate` 驗紅 `c1-trace-eq-mutate.txt`）；批 1 四席整段事件 420 幀 Math.random 0 次、每幀 0（`c1-random-new.json`）。index.html 尚未改版本字串，⑥ 改後須重跑 |
| 2 既有手不變 | 過 | `c2-pixels-compare.json`：既有手 16 格對 4691a7ce 逐像素 0 差（兩次各 16/16）；正對照批 1 16 格 0/16 相同（差 1,535–8,864 px）；同樹連跑 16/16＋16/16（決定性） |
| 3 四角色上場 | 過（基準紅） | `c3-features-new.json` 40/40 項；基準 `c3-features-base.json` 0/4；同碼 `?handb1=0` 等效 `c3-features-new-handb1off.json` 紅 |
| 4 拇指 | 過（基準紅） | 拍令牌主量法 40.8°、次量法 39.8°（網格法 40.5°）八種手全同（差 0°）；基準與 `?thumb=0` 49.8°（紅）；推錢／收錢逐幀與開關前相同（0/30、0/30 不等，只有拍令牌 20/35 不等） |
| 5 圓度／面數／draw | **紅（銅錢）** | 10-02 治具（`tests/tools/hand-acc-roundness.mjs --cam=auto`，只用 `--groups` 指定色，量法未動）：金戒 0.956/0.956、錶殼 0.964、錶面 0.946 過；**銅錢 8 枚 min 0.266、中位 0.914**（5/8 ≥0.85；低的是側對相機的錢）。每手 ≤6,214 面、1 draw |
| 6 遮擋 | **不宣告通過**（數值全 ≤10%，但有一次量不到未歸因） | 批 1 四席：第 1 組 5 次中第 4 次治具崩潰、輸出 0 位元組（當時 stderr 丟掉，原因未知；量不到＝紅）；之後第 2 組 5 次（留 log）全 ≤10%，最大 9.46–9.57%（推（四家同一格））。有效量測 9/9 ≤10%、`tests/tools/hands-occlusion.mjs` 原樣（自然座位）5/5 ≤10%（9.47–9.48%）；基準同座位 4.48%。第 2 組不能抵銷第 1 組，需主對話裁定是否接受 |
| 7 辨識度盲讀 | 過 7/7（第 1 輪） | `blind-key/results.md` |
| 8 書生故事盲讀 | 過 2/2、2/2 | 縫痕帶寬中位 2.3px（min 2.1）、單針長中位 4.5px（上方 8 針 min 3.4）≥2.0／3.0；基準無此物（量不到＝紅） |
| 9 髮辮 | 過（基準紅） | 南席直徑中位 3.4px（min 2.8）、北席 2.3px；`c9-scan.txt` 建構只在 buildAcc（setSeats 快取內）、apply／update 0 處；執行期每幀 Math.random 0、幾何份數不變 |
| 10 效能 | **紅** | 三批各 5 輪（交錯）：批 1 席 p95 中位 7.5／7.6／7.1 ms vs 門檻 7.125／7.5／7.0 ms（基準一般手 ×1.25）。第 3 批已含去重複頂點（逐位元相同）仍差 0.1 ms。iPhone 未驗 |
| 11 開關與等價 | 過（附解讀） | `?handb1=0&thumb=0` 對 4691a7ce：四個時鐘起點各 3 次＝12/12 次 190/190；只帶 `?handb1=0`＝150/190（不等的 40 幀全是拍令牌＝拇指，見下）；`?handreal=0` 對 4691a7ce 逐幀相等。181/190 已歸因（見下） |
| 12 全套測試 | 未改測試前 471/471 綠，但**不代表批 1 被測到**（見下）；⑤ 待簽核 |
| 13 版本／送達 | 未做（⑥） | 版本字串未改；`tests/ui-hierarchy.test.mjs:25` 釘 0.60.1，改版時必改（清單外，照前例） |
| 14 範圍外 | 只記錄 | 見末段 |

## 改了什麼（產品）
- `js/hand-b1.js`（新）：四角色的皮膚參數、袖口色、配件（長指甲、銅錢 8 枚＋穿錢繩、黑髮辮＋垂髮＋毛邊、V4 斜切口縫痕帶＋15 針橫針、金戒×2＋錶帶／錶殼／錶面），8 種手的共用材質（uniform 陣列 4→8，既有四種分支不變），組頭手背數字與書生墨漬、V4 前臂色差為 shader 程式圖樣。由示意 `hand-mock-b1/js/hand-b1.js` 轉來：拿掉 `?b1stitch` 1–3 方案與 `STITCH_VAR`，V4 寫死；錶殼另給 `CASE_C`（與錶帶分色，量圓度才挑得出單一錶殼；視覺差 <0.02）；部件名「鋸齒針腳」改「針腳」。
- `js/table-hands.js`：寫實開著時預設載入批 1；`?handb1=0`／`HAND.B1_ON=false`／`opts.b1=false` 退回（不載入 hand-b1.js，整套與 v0.60.1 同一路徑）。批 1 模組載不到時退回預設手（`stats().b1Error`）。拇指：`?thumb=0`／`HAND.SLAM_THUMB.ON=false`／`opts.thumb=false` 退回；`?handreal=0` 一律舊姿勢。效能：批 1 手的碰撞／信物／伸入點集去掉「位置＋蒙皮權重完全相同」的重複頂點（commit 05bf58f8；node 4 段事件序列與實頁 190 幀雜湊逐位元相同）。
- `js/hand-motion.js`：`HAND.B1_ON`、`HAND.SLAM_THUMB {ON, DEG:17}`、`POSES.spreadT`（只換 ThumbA 外展 26°→17°）、director `per.slamPose`（拍令牌那兩處）、`ROLE_PARTS` 出口、`allIndex` 吃 `rig.collide`。
- `js/hand-realism.js`：FRAG_* 匯出、`realGeometry(..., ext)` 掛配件、`userData.b1parts`。

## 條件 11：181/190 的波動來源（§6.2）
- 假設「錢柱抖動亂數受開頭真實時間影響」**不成立**：`table-props.js` 沒有 Math.random（籌碼色用 `seedRnd(60613)`、錢柱擺動用 sin 雜湊）；手的整段事件 Math.random 0 次（`c1-random-*.json`）。
- 實際來源：**手動時鐘的起點**。治具把 rAF 換成「起點＝當下 `performance.now()`、每步 +1000/60」的時鐘；渲染迴圈的 `dt=(now−lastT)/1000` 其捨入位元取決於 now 的量級，dt 位元不同 ⇒ 累加時間在少數跨門檻的幀換到另一側。
- 證據（同一棵基準樹、同一支治具，只換起點；`c11/`）：起點 3,728–4,654（真實時間 6 次）與 4,000–4,002（16 個）全部 190/190；起點固定 1e7 連 3 次都是 181/190（不等 9 幀、只有矩陣欄），1e6 為 189/190；30,000 為 190/190。同一起點重跑結果逐位元相同 ⇒ 決定性、可重現。
- 處置：正式比對一律「兩邊同一個固定起點」（`eq-frames.mjs --clock0`；4000、1e7、1e6、30000 四個起點各比一次），結果 12/12 次 190/190。量法（雜湊內容、事件、步數）未動。
- 解讀需主對話確認：條件 11 寫「`?handb1=0` 退回時對 4691a7ce 190/190」。拇指收角是條件 4 要求的「所有手」改動，`?handb1=0` 不關它 ⇒ 只帶 `?handb1=0` 時拍令牌 40 幀必然不等（150/190，不等幀 100% 落在 slam 段、只有矩陣欄）。兩個開關都關（`?handb1=0&thumb=0`）＝190/190×12。若主對話認為條件 11 指的是「只帶 handb1=0」，那這條按字面是紅（設計上與條件 4 互斥）。

## 條件 2 的量法補充（治具自身的兩個波動，已歸因後才比）
`tools/c2-pixels.mjs` 只畫手（藏起所有非手的網格／粒子）讀回 RGBA。第一版同樹連跑也不相等：①燈籠強度＝sin(elapsed…)，elapsed 含開局前真實時間 ⇒ 量手時把有 baseIntensity 的燈固定在基準亮度；②第一次揭盅（得標者南／北各一次）帶到開局前的殘留，診斷欄證實差在**相機**、手的世界矩陣與骨矩陣逐值相同 ⇒ 先各做一次不記錄的暖身。兩項處置後 base1↔base2、new1↔new2 皆 32/32 相同，才拿新舊比。

## 條件 5（紅）：原標準在哪裡不適用
10-02 治具量的是「投影到相機的剪影凸包」，對木珠（球）每顆都對；銅錢是繞腕一圈的扁圓片，單一相機下總有幾枚側對相機，剪影本來就是扁條（圓度 0.27／0.32 的兩枚＝側對；正對的 0.98）。這量法把「朝向」和「多面體稜角」混在一起。依凍結不改量法 ⇒ 判紅、停手回報；示意卷的另一量法（沿錢的法線正對投影）0.987，但那是不同量法，不拿來代替。

## 條件 10（紅）
| 批 | 基準一般手 p95 中位 | 門檻 ×1.25 | 新版批 1 席 p95 中位 | 新版既有手 p95 中位 |
|---|---|---|---|---|
| r1（原碼） | 5.7 | 7.125 | 7.5 | 6.8 |
| r2（只去重複 all 點集，已撤回再改） | 6.0 | 7.5 | 7.6 | 7.2 |
| r3（commit 05bf58f8） | 5.6 | 7.0 | 7.1 | 7.0 |
參考：基準樹自己的既有三角色＋一般手就是 6.5–6.8 ms＝一般手的 1.18 倍（配件多＝碰撞點多）。profile：`placeAt` 47.5%、`relicHit` 14.5%（點數線性）。可能的下一步（需裁定，未做）：配件頂點只取外輪廓進碰撞（會改擺位，需重跑 6／7／8）；或接受為已知風險，有 `?handb1=0` 可退。

## 條件 12：測試現況與紅燈清單（不改測試）
- 全套 `node --test tests/*.test.mjs`：471/471 綠（`c12-full-suite-new-before-rewrite.txt`）。**但** `tests/hand-fixture.mjs` 用 data: 模組載 table-hands，`import('./hand-b1.js')` 解析不到 ⇒ node 測試裡批 1 退回預設手（`stats().b1Error`），綠燈沒有驗到批 1。
- 把批 1 真的接進同一批測試（`YAOSHI_HANDS_PATH` 指向接好 hand-b1 的 table-hands 暫存副本；`c12-hand-tests-b1-wired.txt`、`c12-roles-b1-wired-per-test.txt`）：
  - `tests/table-hands.test.mjs:83`（#B1）：期望 `hand-real-v2`、實得 `hand-real-b1` ——清單內。
  - `tests/table-hands-roles.test.mjs` 第 66 行 V1：期望第 4 席 variants＝null、實得 'qingmian' ——清單內。
  - 第 127 行 V2：第 137 行「同一席的預設手沿用同一份幾何」不成立（開局第 0 席是青面的批 1 幾何），assert 格式化兩份大幾何時 `RangeError: Array buffer allocation failed`（整檔一起跑時變成 V8 Zone OOM、整檔崩）——清單內（四角色當預設手）。
  - 第 163 行 V3 L／P：「三個變體都比預設手多出配件面」——第 4 席是青面（批 1）面數更多 ——清單內（四角色當預設手）。
  - 第 187 行 V4：variantBuilds 期望 3、實得 4（青面也建了） ——清單內。
  - 第 203–227 行（Math.random 計數）、hand-realism-render（材質陣列）：**接上批 1 後仍綠**，預期中的改寫可能不需要。
  - **清單外**：①`tests/hand-fixture.mjs` 要接上 hand-b1（不改，node 測試就永遠驗不到批 1）；②版本改 0.61.0 時 `tests/ui-hierarchy.test.mjs:25`。兩者都需裁定。

## 繼承表（10-02 acceptance／README）
| 10-02 條件 | 本卷對應與實測 |
|---|---|
| 1 尺寸（修訂 3：不縮放） | 過：`seatMul`＝1、`HAND.USER_SCALE`＝1（c3）；指根骨距未另量 |
| 2 全角色寫實材質覆蓋 | 過：四席批 1＝`hand-real-b1`（8 種手共用一支 program）；既有手畫出來與 4691a7ce 逐像素相同（c2） |
| 3 身分盲讀 | 由本卷條件 7 取代：7/7 |
| 4 銅錢比例 | 未量 |
| 5 避讓不退步 | 遮擋＝本卷條件 6（過）；1599 取景矩陣、hands-probe 穿入未量 |
| 6 效能（perf-diag 比值） | 未量（改量本卷條件 10＝紅）；每手 ≤6,500 面、1 draw 過 |
| 7 引擎零改 | trace 過；全套 471/471（批 1 未被測到，見上）；console 0 error（各治具 errs:[]） |
| 8 版本與送達 | 未做（⑥） |
| 9 簽收圖 | 已產 `final/contact-v061.png`、`final/contact-v061-north.png`、`final/compare-*.png`（未經使用者看） |
| 10 配件寫實 | 圓度＝本卷條件 5（銅錢紅）；盲讀未針對配件材質另做 |
| 11 手臂連續（修訂 6 漸隱） | 未量（批 1 共用同一段袖管程式 `realGeometry`，未改） |
| 12 袖管不穿信物／13 換邊／14 長度 | 未量 |
| 15 節流 4× 效能 | 未量 |
| 16 斷言鑑別力 | 未量（⑤ 改寫後再做） |
| 18 手臂盲讀 | 未量 |
| `?handreal=0` 等價（修訂 4） | 過：對 4691a7ce 逐幀相等（既有三角色＋青面、批 1 四角色兩組；`c11-handreal-off.json`）。對 95f621db 已不相等，但基準 4691a7ce 自己對 95f621db 也不相等（v0.59.11 擺錢放慢等既有改動，`c11-base-vs-95f621db.json`），故以 4691a7ce 為準 |

## 範圍外（只記錄，未處理）
皮膚寫實度、斑點迷彩感、手尺寸、批 3 角色、北席縫痕（北席縫痕帶寬 1.0px、針長 2.4px）、詛咒推按速度。另記：盲讀讀者把青面腕上的銅錢串讀成「紅繩」、組頭花襯衫袖讀成「迷彩手環」；兩位書生讀者都說紅色會讓人第一眼聯想紅繩。遮擋「推（四家同一格）」由基準 1.9% 升到 9.5%（仍 ≤10%）。

## 檔案
- 工具：`tools/`（b1-node.mjs、c1-random、c2-pixels＋c2_compare.py、c3-features、c11-handreal-off、eq-frames＋eq_compare.py、shoot／thumb／detail／perf／hands-occlusion 由示意卷複製、blind_set.py、contact_v061.py）。
- 盲讀圖：`blind-c7-r1/`、`blind-c8/`；鍵與紀錄：`blind-key/`。
- 給使用者看：`final/contact-v061.png`、`final/contact-v061-north.png`、`final/compare-{qingmian,hongyi,duanshou,zutou}.png`。

---

## 第二輪（2026-10-05，依 acceptance 修訂記錄 09a9ce7f：A 效能一輪、B 遮擋補跑、C 圓度新量法、D 測試改寫、E 版本、F 重跑）

### 總表（第二輪後）
| # | 結果 | 一句話證據 |
|---|---|---|
| 1 | 過 | 版本改 0.61.0 後重跑 `c1-trace-eq-v0610.txt` equal:true；`rerun/c1-random-new.json` 每幀 Math.random 0 |
| 2 | 過 | `c2/r2new{1,2}-pixels.json`：既有手 16/16 對 4691a7ce 逐像素相同；批 1 正對照 0/16 相同；32/32 格與 17719639 版逐位元組相同（外觀未變） |
| 3 | 過 | `rerun/c3-features-new.json` 40/40 |
| 4 | 過 | `rerun/r2new-thumb.json`：拍令牌八種手 40.8°／39.8°，推錢／收錢角度不變；`?handb1=0` 不等幀只在 slam 段 |
| 5 | 過（新量法） | `c5-roundness-facing-none.json`：銅錢朝向 ≤45° 的 3 枚 min 0.9757（特寫）／0.9644（遊戲）；金戒 0.956、錶殼 0.964、錶面 0.946（原量法原門檻）。正對照：正方形銅錢 `c5-roundness-facing-square.json` min 0.786＝紅；方塊 `c5-roundness-facing-box.json` 朝向 ≤45° 的 0 枚＝量不到＝紅 |
| 6 | 過（附記） | 補跑 `c6/occl-b1seats-11..15.json`＋同名 .log（stderr 保留）：5/5 量到、最大 9.46–9.55% ≤10%、未再崩潰。如實記載：第一輪第 4 次曾崩潰一次，原因未查到，不以補跑抵銷 |
| 7、8 | 過（沿用第 1 輪盲讀） | 外觀與 17719639 逐像素相同（條件 2 的 32/32），依指示不重讀 |
| 9 | 過 | `rerun/r2new-detail.json`：髮辮南 3.4px／北 2.3px；縫痕帶 2.3px、針長 4.5px（同前） |
| 10 | **過** | 三批交錯各 5 輪（`c10/r4{a,b,c}-*`）：批 1 席 p95 中位 5.5／5.8／5.7 ms ≤ 門檻 6.875（基準一般手 5.5×1.25）；既有手 5.3／5.1／5.4 ms。本機 Chromium；**iPhone 未驗** |
| 11 | 過 | `rerun/r2-b1off-thumb0-{4000,10000000}-r{1,2,3}`：6/6 次 190/190；只帶 `?handb1=0` 150/190、不等幀全在 slam；`rerun/c11-handreal-off.json` 對 4691a7ce 逐幀相等 |
| 12 | 過 | `c12-full-suite-final.txt` 472/472（fixture 已接上 hand-b1，新增的批 1 測試在綠燈中＝真的驗到批 1）；改寫後斷言放回 4691a7ce：`c12-rewritten-tests-on-4691a7ce.txt` 6 紅 |
| 13 | 版本字串過；送達未做 | VERSION／RELEASE_VERSION／theme.css、safe-area.css `?v=0.61.0`（commit 94e47f68）；未 push |
| 14 | 只記錄 | 同第一輪 |

### A 效能（commit 46f43171）
`placeAt` 的外框與最低點改用旋轉結果的快取統計（浮點加減對常數單調：min(rx＋w)＝rx＋min(w)、max(c−y)＝c−min(y)），「連最低點都抬不過」時整圈省掉；`relicHit` 以外框與最低點整件剔除不可能命中的信物。證明（同 05bf58f8 法）：node 4 段事件序列（L／P×兩種座位）雜湊改前改後相同；實頁 `rerun/r2-default-*` 對改前 `c11/eq-default-*` 190/190（兩個時鐘起點）；外觀 32/32 逐位元組相同。這段程式碼所有手共用，既有手同樣逐位元相同（條件 2）。

### C 圓度新量法（`tools/hand-acc-roundness-facing.mjs`）
由 10-02 治具原樣複製，凸包圓度、焊接連通分量、兩台相機都不動；只加「朝向角」：配件世界頂點的共變異矩陣最小特徵向量＝平面法線，與「配件中心→相機」夾角取 |cos|，≤45° 才計入（只套銅錢群組 `--facing=coin`）。朝向 ≤45° 的枚數為 0 ⇒ 量不到＝紅。

### D 測試改寫（commit d0282ca9）
- `tests/hand-fixture.mjs:64–72`：data: 模組把 `import('./hand-b1.js')` 也換掉（hand-b1 自己的 motion／realism 指向同一實例）；4691a7ce 沒有 hand-b1 ⇒ 不換。
- `tests/table-hands.test.mjs:83–87`：材質鍵 `hand-real-b1`＋uniform 陣列 8 種。
- `tests/table-hands-roles.test.mjs`：OTHER7 拆成 B1_4／OTHER3；V1、V3、V4 第 4 席預設手對照由青面改孝女白琴（只換輸入，斷言原意不變；這兩條在 4691a7ce 上仍綠，B1 行為由 V2 新增段與新測試把關）；V2 加「批 1 四角色各拿專屬手」、份數上限 4 種×4 席→8 種×4 席、幾何同一性改 `assert.ok(===)`（失敗時不格式化大幾何，避開 RangeError／OOM）；V3 材質鍵改 `hand-real-b1`；新增「批 1：…專屬手」測試（辨識物真的送進 GPU、≤6,500 面、無貼圖、每幀不重建）。
- `tests/ui-hierarchy.test.mjs:25`：版本釘 0.61.0。
- 4691a7ce 上紅的：#B1、V2、V3 L／P、批 1 新測試、版本釘（6 紅）；其餘清單外測試沒有被迫改。
