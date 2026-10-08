# 驗收（凍結，2026-10-08）— 運鏡批：中咒鏡頭＋喊價鏡頭（使用者裁定「運鏡選乙」）

基準：origin/main 5c91bdc7（v0.65.0）。格式照 `docs/experiments/2026-10-08-light-aplus/acceptance.md`。
狀態：**凍結**（主 session 審閱後裁示四點，2026-10-08；§5 門檻已於凍結前用 5c91bdc7 實測基準訂定，不算移動及格線）。凍結後依 02 §2.1，只能細化／加嚴；要放寬須先寫「原標準錯在哪、為什麼現在才知道」並取得使用者針對該條的明確同意。主 session 的指示、本檔作者的建議都不算同意。
範圍：中咒鏡頭（命中時慢推向受咒者約 0.8s）＋喊價鏡頭（出價微推喊價者，最後 3 秒隨倒數收緊）。純畫面改動，不得動結算／引擎／AI。

每條固定三欄：**條件**／**量法**／**什麼實作會讓它變紅**（02 §2 第 2 點）。

## 1. 引擎等價
- 條件：`trace(1..20)` 與 origin/main 5c91bdc7 逐位元組相等。
- 量法：`node tests/tools/trace-eq.mjs <index.html>`；同腳本 `--mutate`（改一個引擎常數 `CFG.ROUNDS`）必須判不等。`git diff` 不得觸及 simulate／trace／結算區塊。
- 亂數紀律：新鏡頭程式**不呼叫 S.rng，也不呼叫 S.rngUi**（`js/camera-director.js:8` 現行紀律就是兩者都不碰；比「只能用 S.rngUi」更嚴，鏡頭時序、抖動全部用確定性函數）。若實作者主張某處必須抽亂數，須先回報、不得自行加（那會改變 UI 亂數流，下游台詞挑選位移）。
- 紅：鏡頭程式抽了 S.rng（trace 位移）；鏡頭事件在引擎區塊內被觸發時改寫了狀態；`--mutate` 判相等＝腳本失效。另附：測試對整份 `js/camera-director.js` 與 index.html 新增差異 grep `S\.rng|rngUi|Math\.random`，命中即紅。

## 2. 退回開關 `?cam=0`
- 條件：`?cam=0` ＝ 中咒鏡頭與喊價鏡頭整個不發生，鏡頭行為與 v0.65.0 相同；預設（無參數）＝新鏡頭開。
- 設計約束：`camera-director.js` 刻意不讀 PW_FX／CFG（見 `js/camera-director.js:401`），旗標一律由 index.html 解析後經事件 `detail` 帶入（參考 `:403` `d.cinema!==false`：缺欄位視為開，合成事件與舊治具照舊）。新欄位命名由實作者定，但須同一模式：`detail.xxx !== false` 才動。
- 量法（兩個證明，缺一不可）：
  a. **鏡頭軌跡等價**：同種子、同腳本事件序列，`?cam=0` 與 v0.65.0 樹逐幀記錄 `camera.position`／`camera.quaternion`／`camera.fov`，最大差 ≤ 1e-9（確定性，不是像素雜訊）。涵蓋喊價階段整段與一次中咒。
  c. **組合矩陣**：`?cam=0` × `?closeup=0/1` × `?fxtier=0/1`（8 格）各做一次 a 的軌跡等價（基準＝同一組 closeup／fxtier 設定下的 v0.65.0 樹）；預設（無 cam 參數）在 closeup／fxtier 任一關閉時，新鏡頭仍須依 §6 觸發（不得被 closeup／fxtier 旗標誤關，也不得誤開）。
  b. **旗標單元測試**：對 camera-director 直接餵事件，`detail.<flag>=false` 時鏡頭 K 值全程 0；省略欄位時開；`true` 時開。
- 紅：`?cam=0` 仍推鏡（軌跡差 >1e-9）；旗標只擋了其中一種鏡頭（中咒或喊價其一仍動）；旗標被寫成 director 內讀 `PW_FX`／`location.search`（grep 命中即紅）；預設也關（預設測試紅）。
- 突變驗紅：把旗標判斷 `!== false` 改成恆真，a 與 b 都必須紅；測試須實跑貼出該紅燈。

## 3. 不動的常數與不變量
- 條件：fov 維持 50（`js/scene-env.js:426`）；逐槽微距的 `dist:1.65, tilt:22` 維持（`tests/reveal-table.test.mjs:72` 釘住）；任何時刻 `|camera.position|` 恆等於當下 dist（`tests/tools/cam-unit.mjs:26,448` 的 lean 不變量，擴及新鏡頭）。
- 量法：既有 `reveal-table.test.mjs` 不改一行即綠；`cam-unit.mjs` 新增兩個場景（喊價鏡頭、中咒鏡頭）逐幀量 `|Δ position.length() − Δ dist|` ≤ 1e-6 與 fov 恆 50；新增 `git diff` 檢查不得出現對 `fov`、`dist: 1.65`、`tilt: 22` 的改動。
- 紅：以改 fov 做推近（fov 逐幀變）；推鏡用平移相機而不縮 dist 使 |position|≠dist；改了微距常數去遷就新鏡頭。
- 注意：推近必須走既有 dist／tilt 通道（像 CINEMA 疊在 focus 之後、punch 之前），不另開第二套位移。

## 4. prefers-reduced-motion
- 條件：`prefers-reduced-motion: reduce` 時，兩種新鏡頭都不動鏡頭（K 恆 0）。判法沿用 `js/camera-director.js:147` `prefersReduced()`。
- 量法：單元測試把 `matchMedia` 替身成 reduce＝true，餵喊價與中咒事件，逐幀 camera 與無事件基線相同；再換成 false 同事件必須會動（雙向，防「永遠不動」也綠）。
- 紅：漏掉其中一個接收端的 `prefersReduced()`（兩個接收端各一個測試）；reduce 時仍有橫向微震；把 reduce 判斷放在事件發送端而非接收端，導致直接餵事件仍會動。

## 5. 效能：iPhone「不比 v0.65.0 更卡」
- 做法照 light-aplus 凍結檔：**門檻對產品同幀量，不抄示意圖數字**；iPhone 真機未量，不得宣稱。
- 量法：`tests/tools/light-aplus-perf.mjs` 同法（關 vsync、DPR 1、解凍後等 0.8s 再量 2.5s；每案各開一頁；工具 sha 取自 5c91bdc7）。基準＝5c91bdc7 重跑 5 次。新版同樣重跑 ≥5 次，取各指標的**中位數**與基準中位數比。場景 `bid`（喊價階段）與 `reveal`（揭盅）。工具目前只驅動到「到達場景」，量不到「最後 3 秒收緊」與「中咒 0.8s 窗」本身；實作者須擴充驅動（只加觸發，不改量法）並把擴充 diff 附在回報裡，擴充後的基準須在 5c91bdc7 以同一擴充重量（本節數字是未擴充的 idle 場景基準）。
- **基準原始數字（5c91bdc7，5 次，單位 ms）**
  - bid：cpuMed 2.8／2.9／2.7／2.6／2.5；cpuP95 5.2／5.5／5.4／5.6／4.8；dcMed 84×5；dcP95 87×5；dcMax 147／147／147／146／146；陰影重畫 18／18／17／16／14；frames 746／718／745／734／830。
  - reveal：cpuMed 2.1／2.2／1.9／2.0／1.5；cpuP95 3.4／3.5／2.9／2.9／2.7；dcMed 83×5；dcP95 83×5；dcMax 141×5；陰影重畫 5×5；frames 1039／1014／1165／1128／1404。
  - 雜訊底線＝5 次基準兩兩最大差：bid cpuMed 0.4、cpuP95 0.8、dcMed 0；reveal cpuMed 0.7、cpuP95 0.8、dcMed 0。
  - 原始 JSON（含逐幀）：scratchpad `perf/out-{bid,reveal}-{1..5}.json`（暫存，未入庫）。
- **條件（新版中位數 ≤ 基準中位數 ＋ 雜訊底線）**
  - bid：cpuMed ≤ 2.7＋0.4＝**3.1**；cpuP95 ≤ 5.4＋0.8＝**6.2**；dcMed ≤ **84**；dcMax ≤ **147**；陰影重畫 ≤ **18**。
  - reveal：cpuMed ≤ 2.0＋0.7＝**2.7**；cpuP95 ≤ 2.9＋0.8＝**3.7**；dcMed ≤ **83**；dcMax ≤ **141**；陰影重畫 ≤ **5**。
  - 鏡頭只動相機，不新增物件／後製，所以 draw call 與陰影重畫次數不容許增加（雜訊底線為 0）。
- 紅：鏡頭每幀配置物件使 CPU 增加；喊價鏡頭在 idle 也常駐更新；中咒時額外加後製／粒子（draw call >0）；陰影簽章（`POSE_REFRESH_S`）把鏡頭移動誤判為結構變動，使陰影重畫次數增加。
- 已知限制：雜訊底線取自 5 次、桌機、不鎖幀；cpu 中位數受 frames 數影響（bid 718–830、reveal 1014–1404）；p95 在 2.5s 窗內只有 ~1–2 個尖峰幀，鑑別力有限，故以中位數與 draw call 為主。iPhone 真機 FPS 列使用者側待驗。
## 6. 鏡頭行為本身
- **本節的數值（0.8s、0.6–1.0s 窗、|ΔK| 0.15）是實作規格，不是通過門檻**：使用者只說「約 0.8s」，數值【試玩必調】，試玩後可調而不算移動及格線。**驗收只守**：①有觸發（事件到了 K>0）②時序單調（推近段 K 不減、回位段 K 不增、喊價最後 3 秒 K 單調不減）③結束後回到基準機位（差 ≤ 1e-9）④reduced-motion 不動（§4）。下列 6.1–6.3 中的數字門檻以此為準降為「規格值，超出須在回報說明」。
- 6.1 中咒鏡頭：命中事件後相機朝受咒者推近，約 0.8s 內到位並於結束後回位；推近量與時長用 `detail.ms`／常數表帶入，**不得在 director 內寫第二個時長來源**（沿用 `:388` 缺 ms 即 throw 的紀律）。量法：單元測試逐幀記錄 K(t)，最大 K 到位時間 ∈ [0.6, 1.0] s（取使用者語意「約 0.8s」，允許 ±25%）；結束後 K 回 0 且 `forceWrite` 使相機回到事件前姿態（差 ≤ 1e-9）。紅：永遠不回位；回位後殘留偏移；受咒者席位判錯（朝向另一席）；事件取消（`ys:duel-end`／`ys:table`／`ys:end`）後仍卡在推近。
- 6.2 喊價鏡頭：出價時微推喊價者；**最後 3 秒隨倒數收緊**（K 隨剩餘秒數單調不減，最後一秒 K 最大）。量法：單元測試餵剩餘秒數 3→0，K 單調不減；剩餘 >3 秒時 K 只含微推常數；喊價者切換時從當前 K 接續（不跳變，相鄰幀 |ΔK| ≤ 0.15）。紅：K 在倒數中反向；>3 秒就收緊；切喊價者時瞬移；倒數歸零後不回位。
- 6.3 兩鏡頭疊加（中咒發生在喊價鏡頭進行中）：不得超出單一鏡頭的最大推近量（取兩者最大，不相加），|position| 仍恆等於 dist。紅：兩者相加導致過近穿模（dist 低於 FOCUS_FLOOR，`js/camera-director.js:662`）。
- 6.4 與既有鏡頭並存：tier 1／2 的畫面逐項不變；既有 `cam-unit.mjs` 全場景、`closeup-cam-unit.mjs` 全綠。

## 7. HUD 與可玩性
- 條件：推鏡期間按鈕（蓋牌開標、下一件拍品）、心願條、倒數數字不被 3D 遮住；南家盯牌按鈕位置不受影響。
- 量法：fixed 視窗 1280×720 與 844×390，喊價最後 3 秒與中咒峰值各拍一張，對 HUD 區域做遮擋偵測（3D 像素是否覆蓋按鈕矩形，取 DOM `getBoundingClientRect` 對比），與基準同幀相比 HUD 可見面積不得減少。
- 紅：推近使拍品／手遮住按鈕；推鏡改了 canvas 尺寸或 CSS 使按鈕位移。
- 備註：主 session 正在查的「南家盯牌按鈕沒對正拍品」是獨立 bug，不在本卷驗收；本卷只要求不惡化。

## 8. 全套測試與控制台
- 全套 `node --test tests/*.test.mjs` 不得比基準多任何失敗；**基準（5c91bdc7 實測，2026-10-08）：`node --test tests/*.test.mjs` → tests 529／pass 527／fail 1／skipped 1／cancelled 0**；唯一失敗＝`#1 常規局：S 不多欄位；座位與亂數流與 3a0d971 相同（seeds 1–50、solo／hotseat）`（基準即有）。新版必須 tests ≥ 529、fail 仍只有這 1 條、pass ≥ 527＋新增數。注意：worktree 需 `tools/anyCreature` junction 指向主工作樹，否則另有 28 條因找不到 playwright 等環境因素失敗（首次無 junction 實跑 tests 430／pass 400／fail 29，已排除，不作基準）。記憶體吃緊時分批並明寫範圍。
- 新增測試至少涵蓋 §2（旗標）、§3（不變量）、§4（reduced-motion）、§6（時序）；**新測試對 5c91bdc7 必須紅在行為斷言，不得紅在例外**（如 AttributeError／缺函式；斷言順序要行為在前）。
- 控制台零錯誤：正常頁、`?sim=1`、`?cam=0` 各一次。VERSION／RELEASE_VERSION 升新版號（0.65.0 已佔，用 0.65.1 以上），`theme.css`／`safe-area.css` 的 `?v=` 手改一致（`ui-hierarchy` 會抓）。

## 9. 範圍檢查
- `git diff --stat` 逐檔一句對應條件；僅允許動 `js/camera-director.js`、index.html 的事件發送與旗標解析、相關測試、版本字串、docs。不得動 `js/light-fx.js`、結算、AI。
- 與並行 session 的檔案分工：本卷動鏡頭相關檔期間，其他 session 不碰 `js/camera-director.js` 與 index.html 的事件發送段。

## 10. 品味題與未驗項（03 R6，不假裝能機械判）
- 「推得好不好看、0.8s 夠不夠」是品味，模型不判；各數值【試玩必調】，列使用者 iPhone 肉眼回報，格式「好／普通／怪＋一句話」。盲讀不作為驗收條件（light-aplus #8 已證明該量法對這類差異無鑑別力）。
- 未驗須明寫：iPhone 真機 FPS；推鏡暈眩感；與 `?closeup=0` 同時開的組合（建議納入 §2 軌跡等價矩陣：`cam=0`×`closeup=0/1`）。

## 裁示紀錄（主 session，2026-10-08）
1. 亂數：採嚴格版（S.rng、S.rngUi 都不碰）。2. §5 先量再訂，+0.3／+0.5 ms 刪除，已改為實測基準＋雜訊底線。3. §6 數值為實作規格、試玩可調；驗收只守觸發／單調／回位／reduced-motion。4. ?closeup=0、?fxtier=0 納入 §2 矩陣。
