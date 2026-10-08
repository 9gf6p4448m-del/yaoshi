# 驗收（草稿，待主 session 審後凍結）— 運鏡批：中咒鏡頭＋喊價鏡頭（使用者裁定「運鏡選乙」）

基準：origin/main 5c91bdc7（v0.65.0）。格式照 `docs/experiments/2026-10-08-light-aplus/acceptance.md`。
狀態：**草稿**。凍結前可改；凍結後依 02 §2.1，只能細化／加嚴，要放寬須先寫「原標準錯在哪、為什麼現在才知道」並取得使用者針對該條的明確同意。
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
- 量法（桌機，`tests/tools/light-aplus-perf.mjs` 同法：關 vsync、DPR 1、每案 2.5 秒交錯兩輪，每案各開一頁，基準樹＝v0.65.0）：場景＝喊價最後 3 秒（收緊中）、中咒命中 0.8s 窗、一般牌桌 idle。指標：draw call 數、CPU 幀時間中位、p95。
- 條件：draw call 增加 = 0（鏡頭只動相機，不新增物件／後製）；CPU 幀時間中位增加 ≤ +0.3 ms；p95 增加 ≤ +0.5 ms；idle（無鏡頭事件）幀時間與基準的差不超過「基準自己重跑兩次的最大差」（≥4 次基準重跑取，同 light-aplus 修訂 3 做法）。
- 紅：鏡頭每幀 new Vector3／配置物件使 CPU 增加；喊價鏡頭在 idle 也常駐更新；中咒時額外加後製／粒子（draw call >0）；陰影簽章（`POSE_REFRESH_S`）被鏡頭移動誤判為結構變動，使陰影圖每幀重畫（量 shadow 更新次數：鏡頭動時不得比基準多）。
- 未驗（須明寫）：iPhone 真機 FPS；列使用者側待驗。

## 6. 鏡頭行為本身
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
- 全套 `node --test tests/*.test.mjs` 不得比基準多任何失敗；基準數字先在 5c91bdc7 量好貼出（已知基準：529 tests／527 pass／1 fail［nightwalk #1］／1 skip，以實測為準）。記憶體吃緊時分批並明寫範圍。
- 新增測試至少涵蓋 §2（旗標）、§3（不變量）、§4（reduced-motion）、§6（時序）；**新測試對 5c91bdc7 必須紅在行為斷言，不得紅在例外**（如 AttributeError／缺函式；斷言順序要行為在前）。
- 控制台零錯誤：正常頁、`?sim=1`、`?cam=0` 各一次。VERSION／RELEASE_VERSION 升新版號（0.65.0 已佔，用 0.65.1 以上），`theme.css`／`safe-area.css` 的 `?v=` 手改一致（`ui-hierarchy` 會抓）。

## 9. 範圍檢查
- `git diff --stat` 逐檔一句對應條件；僅允許動 `js/camera-director.js`、index.html 的事件發送與旗標解析、相關測試、版本字串、docs。不得動 `js/light-fx.js`、結算、AI。
- 與並行 session 的檔案分工：本卷動鏡頭相關檔期間，其他 session 不碰 `js/camera-director.js` 與 index.html 的事件發送段。

## 10. 品味題與未驗項（03 R6，不假裝能機械判）
- 「推得好不好看、0.8s 夠不夠」是品味，模型不判；各數值【試玩必調】，列使用者 iPhone 肉眼回報，格式「好／普通／怪＋一句話」。盲讀不作為驗收條件（light-aplus #8 已證明該量法對這類差異無鑑別力）。
- 未驗須明寫：iPhone 真機 FPS；推鏡暈眩感；與 `?closeup=0` 同時開的組合（建議納入 §2 軌跡等價矩陣：`cam=0`×`closeup=0/1`）。

## 待主 session 審的決定點
1. §1 亂數：我寫成「S.rng 與 S.rngUi 都不碰」，比來信的「只能用 S.rngUi」更嚴，原因是 `js/camera-director.js:8` 現行紀律如此。若你要放寬成可用 S.rngUi，須說明哪裡需要亂數。
2. §5 門檻 +0.3 ms／p95 +0.5 ms 是我先訂的起點，無基準實測支撐；凍結前請先量 5c91bdc7 的雜訊底線再定（否則依 02 §2.1 這條可能是「無效條件」）。
3. §6.1 「0.6–1.0 s」窗口與 §6.2 「|ΔK| ≤ 0.15」是我據使用者語意推的，未經裁定。
4. §2 矩陣是否納入 `?closeup=0` 組合。
