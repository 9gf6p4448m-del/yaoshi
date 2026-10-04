# v0.59.10 開局載入修正：驗收條件（凍結）

凍結時點：本檔 commit 當下（尚未動任何產品檔）。之後不得改寬；要改須先寫「原標準錯在哪、為什麼現在才知道」並取得使用者針對該條的明確同意（02 §2.1）。
基準 BASE＝`f8c32942`（v0.59.9，detached worktree `C:/Users/shung/wt/yaoshi/load-fix-base`）；新版 NEW＝分支 `feat/load-fix` 的 HEAD。

## 範圍（只動呈現層）
補播（R）、modulepreload（M）、載入畫面（D）。不改結算、不耗亂數、不碰字型／BGM／GLB。

## 共同治具定義
- 治具＝本目錄 `lf-lib.mjs`（Playwright 1.62.1 Chromium headless；SwiftShader，**非 iPhone**）＋`serve.mjs` 同款本機伺服器（gzip、`Cache-Control: max-age=600`、ETag）。視窗 852×393，dsf 1。一次只開一支瀏覽器。
- 固定局：`startEntry('solo')`→選第一張可選角色→`newGame('solo', 9, SEL.picks)`；到出價頁＝`#mainbtn` 文字以「蓋牌」開頭且可按（途中自動點掉盯上頁）。**種子 9 第 1 夜四件為 balen／boartusk／flag／xianji（無詛咒品，key 全非 null；實測於 BASE）**。
- 「renderer 就緒」＝頁內 25ms 取樣第一次看到 `window.__yaoshi3d.tray` 已定義；「tray 就緒」＝`tray.readyCount() >= S.market.length`；t0＝頁內第一次 `ys:market` 事件時間。時間一律是頁內 `performance.now()`。
- 延遲 renderer＝`page.route(/\/js\/renderer\.js/)` 回應前等 N ms（deterministic，不靠網速）。

## 條件

**1. 補播（R）**　renderer.js 延遲 5000 ms；開 solo 局到出價頁（此時 renderer 尚未載入）。判定：renderer 就緒後 ≤1500 ms 時讀 `tray.items()`：長度 4 且四格 `key` 皆非 null、等於 `market3dItems()` 的 key 序列。NEW 必須綠。BASE 同治具必須紅（renderer 就緒後 1500 ms 與 4000 ms 兩個時點四格 key 仍為 null）。兩邊實跑輸出各貼一次。

**2. 冪等**
 (a) renderer 不延遲：開局前先等 renderer 就緒，再開 solo 局到出價頁、等 tray 全就緒後讀：`items().length`、`tray.props.stats().chips`、`stats().tokens`、`items().map(key)` NEW 與 BASE 逐值相同。
 (b) 延遲 5000 ms 情境、renderer 就緒前人類在出價頁下一標（`openSheet(0); bump(1); bump(1); closeSheet()`，即 slot 0 出價 2）：renderer 就緒＋1500 ms 後 `tray.props.stats().bids` 含 `{seat: ACTIVE, slot: 0, want: 2}` 且 `on` 枚數等於 `want`（2），且 `stats().chips` 等於正常速度同操作下的 chips。NEW 綠、BASE 紅（無該列）。

**3. modulepreload（M）**
 (a) 每個 `<link rel=modulepreload>` 的 href，在一局冷快取（新 context）從載入到出價頁 tray 就緒期間被請求恰好 1 次（以 CDP `Network.requestWillBeSent` 的完整 URL 字串計，含 `?v=`）；且預載清單的 `?v=…&fxvocab=…` 後綴與 `renderer.js` 實際請求 URL 的後綴逐字相同。
 (b) 預載清單與版本字串只由 `RELEASE_VERSION` 與 importmap 產生，原始碼中不得另有第二份版本字串（grep 驗）。
 (c) 本機受控 Fast4G（CDP：下載 9 Mbps、上傳 1.5 Mbps、RTT 40 ms；CPU 1×），冷快取（每次新 browser context），只載首頁、量「renderer 就緒」自導航起的秒數；BASE、NEW 各跑 3 次、各取中位數：NEW 中位數 ≤ BASE 中位數 × 0.75。貼 6 個原始數字。（three 的 4 個檔仍走真實 unpkg，被 CDP 節流；此為已知的外網變異來源。）

**4. 載入畫面（D）**　載入畫面節點 id＝`#trayLoad`，只在顯示期間存在於 DOM（MutationObserver 記 add／remove）。
 (a) renderer 延遲 5000 ms：add 時間 − t0 ≥ 300 ms；t0＋1000 ms 時節點存在且文字含「請神入座」；tray 就緒到 remove ≤ 500 ms。
 (b) renderer 延遲 60000 ms（永不回應）：remove 時間 − t0 在 12 s ± 1 s；顯示期間 `getComputedStyle(#trayLoad).pointerEvents==='none'`、`#mainbtn` 中心點的 `elementFromPoint` 屬於 `#mainbtn`、實際點 `#mainbtn` 後遊戲離開出價頁（`#mainbtn` 文字不再以「蓋牌」開頭或進到下一階段）；全程 pageerror＋console.error 皆空。
 (c) renderer 已就緒再開局（正常快速）、無節流：從載入到出價頁後再 3 s，MutationObserver 記到的 `#trayLoad` add 次數＝0。
 (d) `?table3d=0`、`?tray3d=0` 各以 renderer 延遲 5000 ms 開局到出價頁後再 8 s：add 次數＝0。
 (e) 844×390 與 852×393（`--safe-top/right/bottom/left` 覆寫為 0/47/21/47 與 0/59/21/59，沿用 text-fit-probe VP）下，延遲 5000 ms 情境、顯示期間：`#trayLoad` 的 rect 完全落在視窗扣除安全區之內，且其內所有元素 `scrollWidth<=clientWidth`、`scrollHeight<=clientHeight`（無截斷）。另 text-fit-probe 全跑結果見條件 6。

**5. 像素不變**　`lf-pixel.mjs`：假時鐘、renderer 先就緒、種子 9、出價頁、tray 全就緒、`#trayLoad` 已消失、桌面靜止（pose 兩次逐值相同）、隱藏 smoke／embers／impact 三個隨機粒子層、`pauseAt` 暫停、隱藏 canvas 以外的 body 子元素後截 852×393。效度前提：BASE 對 BASE 兩次差異像素＝0（已實測：見 `raw/pixel-base-run1.png`／`run2.png`，diffPixels 0）。判定：NEW 對 BASE 差異像素＝0。

**6. 回歸**
 - `node tests/tools/trace-eq.mjs f8c32942`（BASE 的 index.html 對 NEW）輸出 `equal:true`。
 - `node --test tests/*.test.mjs` 全綠（`tests/ui-hierarchy.test.mjs` 僅改 RELEASE_VERSION 那一行）。
 - `text-fit-probe`、`landscape-fit-probe` 各對 BASE 與 NEW 跑同參數全量（可按 `--modes` 分片，格數與判定逐格相同）；NEW 的紅格集合不得多於 BASE（逐項數字對照，新增紅格＝不過）。

**7. 流程**　熱座、`?handreal=0`、solo 各一局可開標走到成交總覽；console error 與 pageerror 皆空（NEW）。

**8. 版本**　`VERSION`／`VERSION_NOTE`／`RELEASE_VERSION` 升 0.59.10；`assets/` 兩個 CSS 的 `?v=` 同升；`tests/ui-hierarchy.test.mjs` 斷言一行同升。

**9. 範圍**　`git diff --stat f8c32942..HEAD` 只含：`index.html`、`js/renderer.js`（及必要時 `js/table-tray.js`）、載入畫面樣式（落在 index.html 內或既有 CSS）、`tests/ui-hierarchy.test.mjs` 一行、`docs/experiments/2026-10-04-load-fix/*`；逐檔寫對應哪條需求；不得改字型、BGM、GLB。

## 已知詮釋（寫在凍結前，避免事後解讀）
- 補播的狀態型事件範圍由實作判斷（`ys:market`、`ys:bid`、`ys:mark`、`ys:reveal-result`；對決可見性）；其餘（相機、特效、hitstop 等一次性演出）不補播。
- 載入畫面的 t0 取「第一次 `ys:market`」（盯上頁與出價頁都是同一個「桌面該出現」的時刻；盯上頁是新局第一次需要 3D 桌面）。

## 修訂記錄（凍結後；只修治具效度，判準數字與方向一律不動）
凍結 commit `ee0aaa5b`。以下是實作期間發現「治具對同一份程式碼也量出不同結果（基準對基準非 0）」而補的量測修正，**都是對兩邊（BASE、NEW）同樣處理、都不讓通過機率上升**：
1. `lf-lib.mjs openPage`：`goto` 等待條件由 `load` 改 `domcontentloaded`。原因：動態插入的 renderer module script 會延後 `load` 事件，導致「延遲 renderer 5 s」情境下 goto 回來時 renderer 已就緒，根本測不到「晚到」。
2. 條件 5 的 `lf-pixel.mjs`，凍結檔寫「BASE 對 BASE 兩次差異像素＝0」，但擴大到第三次實跑即出現 102,757 個相異像素（前兩次相同是巧合）。逐一查出並鎖定的時間／狀態相依項（皆與本卷改動無關、兩邊同樣處理）：
   a. 燈籠閃爍 `light.intensity = base*(1+sin(elapsed…))`（`js/renderer.js` lanterns.forEach）→ 鎖成 baseIntensity；
   b. 首頁聚光 `home-pool` 指數衰減（離開首頁後要渲染到 homeK<0.01 才隱藏）→ 等它 `visible===false` 再暫停；
   c. 拍品妖待機骨骼動畫（AnimationMixer，dt 累積）→ 開局前把 `AnimationMixer.prototype.update` 換成空操作；
   d. 私下天命每顆種子在每個新瀏覽器環境重抽，影響 AI 盯上選擇 → 與 `tests/tools/appraise-c-lib.mjs` 同法預先寫入同一組 localStorage；
   e. 令牌落地動畫不在 `tray.pose` 內 → 靜止判準改為「連續兩張實際截圖逐位元組相同」。
   修正後 BASE×3 兩兩 0 差異（效度前提成立），再量 NEW。判準仍是 NEW 對 BASE 差異像素＝0。舊版治具的截圖（`pixel-base-run1/2.png`）保留為證據、不再作為判定依據。
3. 條件 4(b) 的「實際點 #mainbtn」：Playwright 滑鼠點擊在 BASE 上同樣不會觸發 `#mainbtn`（實測：base、new 的 `BIDS_OPEN` 皆維持 true），改用治具慣用的 DOM `.click()`；「不被遮住」另由 `elementFromPoint`＋`pointer-events:none` 證明。「離開出價頁」判準改為 `BIDS_OPEN===false && S.humanBids[ACTIVE]` 已寫入（封標被收下；`#mainbtn` 文字在封標後本來就不變）。

## 修訂記錄 2（§2.1 移動及格線，**使用者明確同意**：回「同意」）
- **原標準錯在哪、為什麼現在才知道**：4(a)(c) 的顯示門檻 300 ms 訂定時未實測就緒時間；實作後量得冷快取 4 個 GLB 下載＋解析 t0→tray 就緒約 850 ms（`raw/c4c-new.json` 舊版：t0＋468 ms 顯示、850 ms 就緒），300 ms 過緊，快速載入也會誤觸閃現，4(c) 在 300 ms 下不可能過。
- **改動（只此一項門檻，12 s 上限不變）**：顯示門檻 300 ms → 1000 ms。4(a) 改為：add − t0 ≥ 1000 ms；t0＋1500 ms 時節點存在且含「請神入座」；tray 就緒到 remove ≤ 500 ms。4(c) 判準文字不變（add 次數＝0），須在新版綠。4(a)(b)(d)(e)、補播、冪等、像素等其餘條件一律未放寬。
- 4(e) 補強（使用者要求）：除不截斷、不出界外，另量「顯示期間 `#trayLoad` 與可點元素重疊區中心點的 `elementFromPoint` 是否落在 `#trayLoad` 內」＝0 個。
- text-fit「紅格不多於基準」：使用者接受現況（不動 tests/tools、不固定種子）。
