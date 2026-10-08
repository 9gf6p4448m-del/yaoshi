# v0.65.0 光影升級 A+：實作與驗收紀錄（2026-10-08）

分支 `feat/light-aplus`（基準 origin/main `ae92bf2a`＝v0.64.0）。凍結驗收：[acceptance.md](acceptance.md)（`d1327124`，本卷未改）。
對照圖：[contact-base-vs-aplus.jpg](contact-base-vs-aplus.jpg)（左 v0.64.0、右 A+；三列＝開標前／揭盅／手機橫式，同一凍結幀）。

## 做了什麼

- `js/light-fx.js`（新檔）：A+ 參數表 `LIGHT_FX` 與 `createLightFx()`。照示意 `light-mock.js` 的 `Aplus()`：燈籠燭火暖橘（×1.3、衰減 2.6、距離 6）、曝光 0.95、半球光 45%、
  桌後燭火聚光（PCFSoft 1024²）投影、室內環境反射 0.12（烘進環境圖，等同所有標準材質 envMapIntensity=0.12）；天空、遠景、環境光不動。
  - 燈數開頁就定：聚光、陰影圖、環境圖在 `createSceneEnv` 之後、任何暖身編譯之前一次建好；之後只調 uniform。
  - 陰影只給法寶：每幀把托盤上「當夜拍品」（`tray.lotNodes()`）的受光不透明網格設為投影，其餘一律不投影；托盤內受光網格與木桌收影。
  - 靜止不重畫陰影圖：`shadowMap.autoUpdate=false`，拍品（含骨頭）世界矩陣與上次畫陰影圖時差 >`SHADOW_EPS`(2e-3) 才標 `needsUpdate`。
  - 對決：燈籠、曝光、半球光、聚光隨戲台燈係數收回 v0.64.0 值（A+ 只給牌桌與首頁）；環境反射與陰影圖仍在（程式不重編的代價）。
  - `?fx=0`：什麼都不建（不抓 RoomEnvironment、無聚光、無陰影圖），與 v0.64.0 逐像素相同（見 #2）。
- `js/renderer.js`：載入 light-fx、開頁建立、每幀 render 前 `lightFx.update(stageOn, tray)`；`window.__yaoshi3d.lightFx` 治具出口。
- `js/table-tray.js`：只讀 `lotNodes()`。
- `index.html`：VERSION／RELEASE_VERSION／VERSION_NOTE 0.65.0、theme.css／safe-area.css `?v=0.65.0`、預載清單加 `light-fx` 與（非 `?fx=0` 時）RoomEnvironment。
- 測試：`tests/light-aplus.test.mjs`（實頁四項）；治具 `tests/tools/light-aplus-shoot.mjs`（假時鐘同幀拍照）、`light-aplus-metrics.py`、`light-aplus-perf.mjs`、`light-aplus-console.mjs`。

## 治具：跨頁同一凍結幀

示意在同一頁執行期切燈光；產品的燈光開頁就定，只能兩頁比。`light-aplus-shoot.mjs` 用 Playwright 假時鐘從載入前暫停，每一步先等網路靜止＋托盤 GLB／手到位（實時），
再推虛擬時間；亂數分四條流（particles.js／three.module.js／其他 js／頁面）；假時鐘起點不是 1ms 就整頁重開（起點會在 1–5ms 跳，影響 renderer 的 dt 序列）。
到場景後虛擬 1.8 秒收斂，再用示意同法凍結 rAF 時間戳。治具鑑別力：同樹同網址兩次 → 0 像素差（bid、phone）；A+ 對基準 → 79.5 萬像素差。

## 驗收逐條

（下列數字皆來自 scratchpad 實跑；指令見各條。）

### #1 引擎等價 — 過
`node tests/tools/trace-eq.mjs <ae92bf2a>/index.html index.html` → `"equal":true`（bytes 352793/352793）；`--mutate` → `"differs":true`。
`git diff ae92bf2a -- index.html` 只動 CSS `?v=`、VERSION 三常數、預載清單兩行；未觸及 simulate／trace／結算。

### #2 `?fx=0` 退回 — 開標前、手機：過（0 像素差）；揭盅：治具雜訊下限內，不能宣稱 0
| 場景 | base vs base（治具自身） | base vs `?fx=0` |
|---|---|---|
| bid 1280×720 | 0 px | 0 px |
| phone 844×390 | 0 px | 0 px |
| reveal 1280×720 | 7547 px（max 14） | 6360 px（max 13） |

揭盅那一欄的差異只在桌下暗處的淡粒子（第 3 夜、跑了 26 秒虛擬時間），同樹兩次也有，尚未找到來源；所以揭盅的 `?fx=0`＝v0.64.0 只能說「在治具雜訊內」，不是像素差 0。
預設＝A+：三場景對基準差 24～80 萬像素；實頁測試 ① 斷言聚光／陰影圖／曝光／燈籠色。

### #3 視覺數字（同治具、同凍結幀）
a. 四周帶 3D 亮度（距邊 15%）。「3D 像素」用示意同判準：v0.64.0 頁同一凍結幀套示意 A／B／C／A+ 再加產品 A+，六案間差 >4 的像素。

| 場景 | 遮罩 px | 現況 | 產品 A+ | ÷現況 | 同幀示意 A | ÷同幀 A | 示意公布 A×3 |
|---|---|---|---|---|---|---|---|
| bid | 167233 | 11.04 | 9.31 | 0.843 ✔ | 1.88 | 4.95 ✔ | 8.1 → 9.31 ✔ |
| reveal | 162731 | 11.16 | 9.43 | 0.845 ✔ | 2.01 | 4.69 ✔ | 11.7 → 9.43 ✘ |
| phone | 35491 | 13.56 | 11.89 | 0.877 ✔ | 5.24 | 2.27 ✘ | 10.8 → 11.89 ✔ |

「≥ 現況 75%」三場景全過。「≥ 示意 A 的 3 倍」兩種讀法各有一場景不過（見下方疑義）。產品 A+ 與同幀示意 A+ 數值相同（9.31／9.43／11.89），即實作忠於示意。
另一判準（畫布藏起來的遮罩，較寬、含極暗像素）：bid 6.74→5.77（0.856）、reveal 6.20→5.27（0.850）、phone 7.70→6.79（0.882）。

b. 桌面中心區亮度標準差

| 場景 | 現況 | 產品 A+ | 增加≥0 | 同幀示意 A+ | 差 | 示意公布 A+ | 差 |
|---|---|---|---|---|---|---|---|
| bid | 35.90 | 40.60 | ✔ | 40.46 | 0.14 | 40.3 | 0.30 ✔ |
| reveal | 35.41 | 39.18 | ✔ | 39.14 | 0.04 | 41.7 | 2.52 ✔ |
| phone | 35.28 | 39.54 | ✔ | 39.42 | 0.12 | 49.4 | 9.86 ✘ |

手機那格對公布值不過：示意的手機凍結幀正好有一隻手推錢停在桌心（亮），本治具同一局的凍結幀手已收回（並排圖 scratchpad `cmp-phone.png`）；同幀示意 A+ 只差 0.12。

c. 法寶投影（同幀「陰影取樣關掉」對「開著」，取 8 大塊，鄰帶＝塊外 3–12px 且無影亮度相近）：
bid 8/8 塊、phone 8/8 塊、reveal 3/8 塊同時滿足「A+ 比鄰帶暗 ≥15%、`?fx=0` 同處 <15%」。例：bid 最大塊 38.2% vs fx0 −8.8%；reveal 桌布上一塊 37.7% vs 8.6%。過。
（reveal 有幾塊 fx0 本來就暗 40%+：既有接觸陰影貼花／詛咒品，判為不合格塊，不計。）

### #4 效能（桌機 Chromium／ANGLE D3D11，關 vsync、DPR 1，每案 2.5 秒，base→A+ 交錯兩輪；iPhone 未量）
| 場景 | draw 中位 base→A+ | draw 平均 | draw 最大（陰影重畫那幀） | CPU 中位 | 陰影重畫／幀 |
|---|---|---|---|---|---|
| bid | 84→84 | 84.9→96.9（+14%） | 88→147（+67%） | 1.9→2.4（+0.5ms） | 0.205 |
| reveal | 67→83（兩輪 base 狀態不同） | 74.6→88.7（+19%） | 84→141（+68%） | 0.7→1.0（+0.3ms） | 0.099 |
| phone | 84→84 | 84.8→93.0（+10%） | 88→147（+67%） | 1.2→1.5（+0.3ms） | 0.139 |

即使只看最壞那幀也 ≤ +75%；CPU 中位 ≤ +1.0ms。靜止幀（凍結 1 秒、62 幀）陰影重畫 0 次、每幀 draw 84＝base（三場景）。
燈數：開頁到第 3 夜燈數恆 10（base 9）、投影燈恆 1；program 數 bid1→duel→reveal→bid2→bid3：base 34/36/45/46/46、A+ 36/38/45/48/48，每次換場的增量 ≤ base、bid2→bid3 相等。

### #5 HUD 可讀性 — 過
同框 5%／95% 分位 WCAG 對比，A+ 對現況：主按鈕 0%（bid／phone 3.994、reveal 3.037）、心願條 0%、揭盅結果卡 +0.16%、頂列 0～+4.3%。無一下降。
主按鈕平均色 A+ (200,83,63)／揭盅 (195,72,52)，與現況相同（紅）。

### #6 全套測試
基準（ae92bf2a，4 批、concurrency 2）：519 tests、517 pass、1 fail（`nightwalk.test.mjs` #1「抓交替水符→水鬼名冊」改名，既有）、1 skip（需 YAOSHI_OLD_GM_PATH）。
本分支（4 批同法）：524 tests、522 pass、2 fail、1 skip——fail＝同一條既有 nightwalk #1，另一條是 `ui-hierarchy.test.mjs`「首頁顯示可核對的發布版本」（斷言字面寫死 0.64.0，每次發版都要改的版本字串）；改成 0.65.0 後該檔 3/3。故相對基準多 0 個失敗（+5 條新測試全綠）。新測試 `tests/light-aplus.test.mjs` 本分支 5/5；對 ae92bf2a（`YAOSHI_RENDER_ROOT`）①②③④ 全紅在行為斷言（無投影燈、燈數相同、投影網格 0、開頁無聚光）。
突變：陰影 dirty 恆真 → ④ 紅「靜止幀陰影圖重畫次數必須 0 {frames:54, shadowRenders:54}」；托盤全部投影 → ③ 紅「拍品以外不得投影」。

### #7 控制台 — 過
`node tests/tools/light-aplus-console.mjs .`：正常頁（推到第 1 夜開標前）、`?sim=1`、`?fx=0` 各 0 pageerror、0 console.error。版本字串四處 0.65.0。

### #8 盲讀 — 未過（2/3）
fresh sonnet agent 只看 6 張圖（順序隨機，鑰匙在 scratchpad `blind-key.json`）。Q1「哪張比較有燭火氛圍」：開標前選 A+ ✔、手機選 A+ ✔、**揭盅選了現況 ✘**；
Q2「背景是否看得出層次」：A+ 三張皆「看得出」✔。揭盅那組讀者理由：「圖2（現況）光集中在桌面中央…對比比圖1 強」。

### #9 範圍 — 過
`git diff ae92bf2a --stat`：index.html（版本字串＋預載兩行）、js/renderer.js（接線）、js/table-tray.js（只讀 lotNodes）、tests/ui-hierarchy.test.mjs（版本字面）、acceptance.md（凍結檔，d1327124）；新增 js/light-fx.js、tests/light-aplus.test.mjs、tests/tools/light-aplus-*.mjs／.py、本 README 與對照圖。無結算／引擎／AI 檔。

## 疑義（需使用者裁定，未自行放寬）
1. #3a「≥ 示意 A 的 3 倍」：用示意公布值（2.7／3.9／3.6）時揭盅不過（9.43<11.7）；用同幀重拍示意 A 時手機不過（2.27 倍）。示意自己的 A+ 對 A 也只有 2.9 倍（NOTES）。產品 A+ 與示意 A+ 同幀同值。
2. #3b「與示意 A+ 相差 ≤3」：手機對公布值 49.4 差 9.9，因示意那一幀有亮的手停在桌心；同幀差 0.12。
3. #8 揭盅組盲讀選錯；若要追，需調揭盅時的燈光（新一輪示意＋新讀者）。
4. #2 揭盅治具自身有 7547px 雜訊，未能證明 0 像素差。

## 未驗
- iPhone 真機 FPS、揭盅文字對比（使用者側）。
- 對決畫面視覺未拍（燈籠／曝光已收回現況，但多環境反射與陰影圖成本）；首頁未拍。

---

# 修訂 1 收尾（2026-10-08，依 acceptance.md 末段「修訂 1」）

## 改了什麼
- `js/light-fx.js` 新增 `LIGHT_FX.REVEAL`（揭盅收光）：揭盅結果卡（`#revealCard`）在場時，聚光強度 ×2.0、角度 0.75→0.40、半影 0.6→0.45、目標移到桌心前緣 (0,0,0.3)，
  燈籠 ×0.6、半球光 ×0.7；以 3/s 緩入緩出。只改 uniform，不增減燈；聚光角度與目標寫進陰影簽章（變了才重畫陰影圖）。開標前／手機（無結果卡）逐像素不變（新舊 A+ 0 px 差）。
- `js/renderer.js`：`lightFx.update(stageOn, tray, !!#revealCard, dt)`。
- `tests/light-aplus-fx0.test.mjs`＋`tests/light-aplus-v064-lights.json`（修訂 1 #2 新證明）。快照在 ae92bf2a 樹上以同一支探針實抓。
- 調光試驗：治具加 `--tune=<json>`（同一凍結幀改 uniform 再拍），兩批共 10 案，取「揭盅中心標準差 ≤ 同幀示意 A+＋3」內光池最集中的一案。

## 9 條（修訂後）
| # | 結果 | 證據 |
|---|---|---|
| 1 | 過 | trace-eq `"equal":true`（352793/352793）；`--mutate` `"differs":true`（CFG.ROUNDS 12→11） |
| 2 | 過 | 開標前、手機 `?fx=0` vs v0.64.0 0 px；揭盅 6360 px／max 13 ≤ 同樹重跑底線 7547 px／max 14；`light-aplus-fx0.test.mjs` 1/1；突變「fx=0 仍建 A+」→紅「開頁時渲染器旗標＝v0.64.0」、突變「fx=0 只開陰影圖」→紅（同句） |
| 3a | 過 | ≥現況 75%：開標前 0.843、揭盅 0.830、手機 0.877 |
| 3b | 過 | 中心標準差 現況→A+（同幀示意 A+，差）：開標前 35.90→40.60（40.46，0.14）、揭盅 35.41→41.62（39.14，2.48）、手機 35.28→39.54（39.42，0.12） |
| 3c | 過 | 合格陰影塊：開標前 8/8、手機 8/8、揭盅 3/8（A+ 暗 ≥15% 且 fx=0 <15%） |
| 4 | 過（桌機） | 交錯兩輪：draw 最壞幀 +67%／+69.9%／+67%，平均 +15%／+7.7%／+10.1%；CPU 中位 +0.4／+0.2／+0.3 ms；靜止 62 幀陰影重畫 0、每幀 draw＝base（84／93／84）；修訂後重量：燈數恆 10、投影燈恆 1，program 數 bid1→duel→reveal→bid2→bid3＝36/38/45/48/48（base 34/36/45/46/46），增量 ≤ base、bid2→bid3 相等 |
| 5 | 過 | 揭盅結果卡 WCAG +0.09%、主按鈕 0%、心願條 0%、頂列 0～+4.3%；主按鈕平均色紅 (195,72,52)／(200,83,63) |
| 6 | 過 | 修訂後全套 4 批（concurrency 2）：525 tests、523 pass、1 fail（既有 nightwalk #1，基準同）、1 skip；基準 519/517/1/1。新增 6 條（light-aplus 5＋fx0 1）全綠 |
| 7 | 過 | 修訂後重跑 `light-aplus-console.mjs`：正常頁／?sim=1／?fx=0 各 0 pageerror、0 console.error；版本 0.65.0 |
| 8 | **未過** | 新 fresh 讀者（非上次那位），三畫面隨機順序：Q1 三組都選「圖2」——揭盅組圖2＝A+ ✔，開標前與手機組圖2＝現況 ✘；Q2 A+ 三張「看得出」✔。讀者自述「差距都很小、信心低」。三組全選同一位置，屬位置偏誤跡象。依指示已調一輪，不再調到過為止。 |
| 9 | 過 | diff 只含渲染／燈光／測試／版本／docs |

鑰匙：scratchpad `blind2-key.json`（set1＝開標前 img1 A+、set2＝揭盅 img2 A+、set3＝手機 img1 A+）。

---

# 覆審修補（冷讀對抗審查 HIGH-1／MEDIUM-1／MEDIUM-2／LOW-3／LOW-1）

## HIGH-1 拍品 idle 讓陰影圖幾乎每幀重畫——修法與取捨
- 選法：**簽章分兩層＋姿態限頻**（`js/light-fx.js` shadowPass）。
  - 結構簽章（立刻重畫）：托盤顯隱、拍品數、聚光角度／目標、每件拍品**根節點**世界矩陣、每個網格的 visible／layers.mask／castShadow（一併修 LOW-3）。
  - 姿態簽章（網格＋骨頭世界矩陣）：只在變動 >2e-3 且距上次重畫 ≥0.5 秒（`POSE_REFRESH_S`）才重畫。
- 為什麼不選其他：「簽章不放骨頭」會讓影子永遠停在第一幀姿態（骨頭驅動的網格也不會更新）；「全域限 10–15Hz」搬動拍品時影子會明顯跟不上；「停播 idle」改了既有動畫外觀。
- 代價：idle 擺動時影子最多落後姿態 0.5 秒；idle 擺幅實測 ≤0.023 世界單位。修前後同幀像素比（A+ 修前 vs 修後）：開標前 699 px（>8 的 67 px，max 21）、手機 205 px（>8 的 16 px）、揭盅 6043 px（>8 的 1137 px，max 148，影子輪廓局部位移；肉眼並排看不出差別，圖 scratchpad `shots/fixdiff-reveal.png`）。拍品被搬動（hover、抓取、鑑賞自轉、根節點位移）仍 1～2 幀內重畫。
- 每幀不再配置新陣列（預配置緩衝＋set）。
- 量測缺口一併補：新測試 ⑤ 不凍時間軸、60Hz；效能治具加 `--vsync`。

## MEDIUM-1 RoomEnvironment 抓不到：try/catch，退回無環境圖、聚光與陰影照開（`console.warn`，非 error）。
## MEDIUM-2 context restored：重烘環境圖、清兩層簽章、標陰影圖重畫。
## LOW-1 `?fx=0` 不再 import／預載 light-fx.js（renderer 換成什麼都不做的替身）。

## 新測試與鑑別力
- `tests/light-aplus.test.mjs` ⑤（不凍時間軸、≥119 幀、間隔中位 ≥12ms）：重畫 <0.2 次／幀、draw 中位與 ?fx=0 差 ≤5%、最壞幀 ≤+75%、剛重畫後 15 幀內 0 次、根節點挪 0.05 後 2 幀內重畫（挪回亦然）。
  - 對 6a8a8d82：紅「一般牌桌陰影圖重畫要 <0.2 次／幀 {aplus: frames 130, shadowRenders 129, drawMed 118; fx0: drawMed 73}」。
  - 突變「骨頭放回結構簽章」：同句紅（129/130、drawMed 118）。
- `tests/light-aplus-robust.test.mjs`：① 擋掉 RoomEnvironment.js ⇒ 3D 層照常、A+ 開、無環境圖、0 pageerror；② loseContext→restoreContext（時間軸凍住）⇒ 環境圖重建、陰影圖重畫。
  - 對 6a8a8d82：① 紅「環境圖抓不到時 3D 層仍要起來 [TypeError: Failed to fetch dynamically imported module …RoomEnvironment.js]」；② 紅「復原後環境圖要重建 {after:{env:false,shadow:false},shadowRendersAfterRestore:0}」。
  - 突變（拿掉 try/catch＋拿掉 restored 監聽）：同兩句紅。
- `tests/light-aplus-fx0.test.mjs` 突變（fx=0 仍建 A+／替身只開陰影圖）：皆紅「開頁時渲染器旗標＝v0.64.0」。

## 修補後重量
- #4（60Hz，`light-aplus-perf.mjs --vsync`，?fx=0 vs A+ 交錯兩輪，每案 2.5 秒）：
  開標前 重畫 0.087 次／幀、draw 中位 84=84、最壞 147（對 fx0 中位 +75.0%、對 fx0 最壞 88 +67%）、CPU 中位 +0.35ms；
  手機 0.081、84=84、147（+75.0%／+67%）、+0.3ms；
  揭盅 **0.22**、83=83、142（+71%）、+0.3ms——揭盅期間拍品被抓回、聚光收放在動（根節點／聚光角度變動屬結構簽章，立即重畫），不是 idle 牌桌。
  覆審重現腳本 draws.mjs（60Hz、開局後 4 秒、119 幀）：A+ 重畫 4／5 次、draw 中位 73、平均 74.5／74.9、最壞 118；?fx=0 中位 73。
  靜止 62 幀：三場景陰影重畫 0、draw＝fx0。燈數恆 10、投影燈 1；program 36/38/45/48/48（同修前）。
- #2 揭盅雜訊底線：v0.64.0 樹揭盅共跑 4 次，兩兩差 4214～8102 px（max 6～14）；`?fx=0` 對 4 份 v0.64.0 為 7572／1793／8153／5836 px（max 14／5／14／14）。
  對修訂 1 指定的那一對（base vs base2：7547 px／max 14），`?fx=0` vs base 是 7572 px／max 14，**像素數超出 25 px**；落在 4 次 v0.64.0 自身兩兩差的範圍內。開標前、手機 0 px。
- #3：3a 0.843／0.830／0.877；3b 差同幀示意 A+ 0.14／2.45／0.12；3c 開標前 7/8、手機 8/8、揭盅 3/8 塊合格。#5 WCAG 變化 0～+4.3%。
