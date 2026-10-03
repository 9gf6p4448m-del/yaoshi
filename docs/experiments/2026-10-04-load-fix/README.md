# v0.59.10 開局載入修正：實測報告（2026-10-04）

基準 `f8c32942`（v0.59.9）；分支 `feat/load-fix`（worktree `C:/Users/shung/wt/yaoshi/load-fix`），未 push、未動 main。凍結條件：`acceptance.md`（凍結 commit `ee0aaa5b`，之後只加「修訂記錄」治具效度修正，判準未動）。
環境：Playwright 1.62.1 Chromium headless（SwiftShader 軟體渲染，**不是 iPhone**）、本機仿 Pages 伺服器（gzip、max-age=600）；three 4 個檔走真實 unpkg。證據 JSON 全在 `raw/`、`probes/`。

## 結論先行

| 條件 | 結果 |
|---|---|
| 1 補播 | **過**（NEW 綠、BASE 紅） |
| 2 冪等 | **過**（2a 逐值相同；2b BASE 紅／NEW 綠） |
| 3 modulepreload | **過**（29 個預載網址各恰 1 次；Fast4G 冷快取 renderer 就緒中位數 4.473 s → 3.102 s＝0.694×，≤0.75×） |
| 4 載入畫面 | **4(a)(b)(d)(e) 過；4(c) 不過**（見下，未改寬） |
| 5 像素不變 | **過**（BASE×3 兩兩 0 差異，NEW×3 對 BASE 0 差異；治具修正見 acceptance 修訂記錄） |
| 6 回歸 | trace-eq `equal:true`；`node --test tests/*.test.mjs` 461/461；landscape-fit 逐項相同（transitions 計數 239 vs 232 為走局差異，全過）；**text-fit 判不出劣化但也無法證明「紅格不多於基準」**（見下：基準自己兩次就差 21 個紅格） |
| 7 流程 | **過**（solo／熱座／`?handreal=0` 皆走到成交總覽，pageerror＋console.error 皆空） |
| 8 版本 | 過（0.59.10：VERSION／VERSION_NOTE／RELEASE_VERSION、theme.css 與 safe-area.css 的 `?v=`、ui-hierarchy 一行） |
| 9 範圍 | 過（見末段 diff stat） |

**未過／需使用者裁定的兩件：**
1. **4(c)**：renderer 已就緒、無節流、冷快取開局，`#trayLoad` 仍出現一次（`raw/c4c-new.json`：t0 之後 468 ms 出現「請神入座中… 0/4」，約 380 ms 後 tray 就緒移除；t0→tray 就緒＝850 ms）。原因：本機冷快取下 4 個 GLB 下載＋解析（SwiftShader）要 ~850 ms > 規格的 300 ms 門檻，所以依規格就會顯示。這不是 bug，是門檻（使用者給的「約 300 ms」）與本機 GLB 就緒時間的落差；凍結條件寫的是「正常快速情境全程不出現」，我沒改。選項：A 把門檻拉到 ≥1000 ms（本機約 850 ms 就緒；iPhone 未量）；B 維持 300 ms，把 4(c) 改為「GLB 已在記憶體（同頁第二局）時不出現」；C 維持現狀，接受冷快取開局閃一下約 0.4 s。要改任一種都需要你針對 4(c) 明確同意。
2. **6 的 text-fit「紅格不多於基準」**：`text-fit-probe` 每次實跑的走局不同（夜行錄每次新種子、私下天命每個新環境重抽；治具在 `tests/tools/`，不在本卷範圍不能改），格數與紅格數本身就隨機。實測：BASE 第一次 940 格／紅 173（V1 45、V2 29、V3 45、V4 51、V5 3）；BASE 第二次 890／152（39、26、40、44、3）；NEW 935／167（44、29、44、47、3）。BASE 對 BASE 共同格中就有 3 格新紅、2 格轉綠；BASE 對 NEW 共同格 1 格新紅（`nw2|night-end|n1@V3`，內容是不同局的 `#pnl` 戰況，文字不同）、1 格轉綠。所有紅格都是 `redScrollOnly`（可捲容器）、`guard` 溢出／重疊格數 0、`summary.items` 的選擇器集合相同、pageErrors 全空。結論：NEW 在基準自身的雜訊範圍內（152–173 vs 167），**沒有證據顯示劣化，但本治具無法做到凍結條件要求的「逐格集合相同」比較**；要嚴格比較需讓治具固定天命與夜行錄種子（動 `tests/tools/`，要你點頭）。

## 實作（對應條件）
- `js/renderer.js`：tray 的四類 listener 抽成具名處理函式（`onMarket`／`onBid`／`onMark`／`onRevealResult`），listener 註冊完後依 `window.__ys3dJournal` 補播（條件 1、2）。冪等判準：註冊當下讀 `J.seq` 當 `regSeq`，只補播 `seq <= regSeq` 的項目（註冊前派的）；註冊後派的事件已由 listener 收下、seq 必大於它。直接呼叫處理函式，不重派 DOM 事件。
- `index.html`：`fx3d` 前的 `ys3dJournal`（記 `ys:market`／`ys:bid`／`ys:mark`／`ys:reveal-result`／`ys:duel(-end)`，同夜每鍵留最後一份、換夜清）（條件 1、2）；`pwPreloadRenderer`（head 內注入 29 個 `<link rel=modulepreload>`：版本與 `fxvocab` 後綴與 renderer `<script>` 同一算法、three 網址讀 importmap，沒有第二份版本字串）（條件 3）；`#trayLoad` 的 CSS＋`trayLoadWatch` 一組函式（條件 4）；版本字串（條件 8）。
- 補播範圍的判斷：`ys:market`（拍品、席位、夜數）、`ys:bid`（錢）、`ys:mark`（令牌）、`ys:reveal-result`（開標收錢送拍品）、`ys:duel`／`ys:duel-end`（桌面是否收起）。運鏡、特效、hitstop、`ys:reveal-slot` 等一次性演出不補播（晚到補了只會亂）。
- 預載清單是手維護的模組名單（24 個自家＋`trait-fx/vocab.js` 不帶版本的那一份＋three 4 檔），來源＝冷快取請求紀錄；`c3a` 實測「未預載的 js 請求」只剩 `ui-icons.js`（不在 renderer 鏈上）。新增 renderer 鏈上的模組時要補這個清單（註解已寫）。

## 證據（指令原文；輸出在 `raw/`）
所有指令在 `docs/experiments/2026-10-04-load-fix/` 下執行；`BASE=C:/Users/shung/wt/yaoshi/load-fix-base`、`NEW=C:/Users/shung/wt/yaoshi/load-fix`。

**條件 1**　`node lf-cond.mjs c1 --root <樹> --port N`（renderer.js 延遲 5000 ms；種子 9；進出價頁後 renderer 才就緒）
- BASE（`raw/c1-base.json`）：`pass:false`，marketAt 679.9 ms、trayDefAt 6406.4 ms；就緒＋1500 ms 與 ＋4000 ms 的 `tray.items().map(key)` 皆 `[null,null,null,null]`（預期 `balen,boartusk,flag,xianji`）。
- NEW（`raw/c1-new.json`）：`pass:true`，marketAt 624.7、trayDefAt 6035.5；就緒＋1500 ms 與 ＋4000 ms 皆 `["balen","boartusk","flag","xianji"]`＝`market3dItems()` 的 key。

**條件 2**
- 2a（`raw/c2a-{base,new}.json`、`c2a-bid-{base,new}.json`；renderer 先就緒再開局）：BASE／NEW 皆 `n:4`、`keys:[balen,boartusk,flag,xianji]`、`chips:0`、`tokens:3`；加人類出價 2 時皆 `chips:2`、`bids:[{seat:0,slot:0,want:2,on:2}]`。逐值相同。
- 2b（`raw/c2b-{base,new}.json`；延遲 5000 ms、renderer 就緒前人類在 slot 0 出價 2）：BASE `pass:false`（`bids:[]`、`chips:0`、`tokens:0`）；NEW `pass:true`（`bids:[{seat:0,slot:0,want:2,on:2}]`、`chips:2`＝2a 正常速度同操作的 2、`tokens:3`）。

**條件 3**
- 3a `node lf-cond.mjs c3a --root NEW`（`raw/c3a-new.json`）：`pass:true`；`nLinks:29`、每個 href 請求次數皆 1；`renderer.js` 實際請求 `…/js/renderer.js?v=0.59.10&fxvocab=0` 恰 1 次，與 link 後綴 `v=0.59.10&fxvocab=0` 逐字相同；未預載的 js 請求只有 `ui-icons.js?v=0.59.10`；pageerror／console.error 空。
- 3b：`grep` 驗版本字串只由 `RELEASE_VERSION`／importmap 產生（`pwPreloadRenderer` 內無版本字面值）。
- 3c `node lf-cond.mjs c3c --root <樹>`（Fast4G 9 Mbps／1.5 Mbps／40 ms；CPU 1×；每次新 context；首頁載入到 `__yaoshi3d.tray` 定義，頁內 `performance.now()`）：BASE `[4.367, 4.510, 4.473]` s，中位數 4.473；NEW `[3.116, 3.102, 3.031]` s，中位數 3.102；比值 0.694 ≤ 0.75。（原型 7.5→4.0 的量法不同：原型把預載放 head 最前面、含補播後 tray 可見；本實作在主 script 執行處注入，因 head 讀不到 `RELEASE_VERSION` 且 `tests/tools/load.mjs` 只吃第一個無屬性 `<script>`。）

**條件 4**（`raw/c4*-new.json`）
- 4a（延遲 5000 ms）`pass:true`：add 在 t0＋315.8 ms；t0＋1 s 時存在、文字「請神入座中…」；tray 全就緒 6361.9 ms，remove 6703.7 ms（＋341.8 ms ≤ 500）。
- 4b（60 s 延遲）`pass:true`：add t0＋309.4 ms；remove t0＋12005.8 ms（12 s ± 1 s）；顯示期間 `pointer-events:none`、`elementFromPoint(#mainbtn 中心)` 是 `#mainbtn`、DOM `.click()` 後封標被收下（`BIDS_OPEN===false && S.humanBids[ACTIVE]`）；errs 空；renderer 全程未就緒（`trayDefAt:null`）。
- 4c **不過**：見上。
- 4d `?table3d=0`、`?tray3d=0`（延遲 5000 ms，到出價頁後再 8 s）`pass:true`：add 皆 0。
- 4e `pass:true`：844×390（安全區 0/47/21/47）rect `[347,179.7,497,224.9]` 在 `[47,0,797,369]` 內；852×393（0/59/21/59）rect `[351,181.4,501,226.6]` 在 `[59,0,793,372]` 內；所有子元素 `scrollWidth<=clientWidth` 且 `scrollHeight<=clientHeight`。

**條件 5**　`node lf-pixel.mjs --root <樹> --out raw/pixel-{base,new}-N.png`、`node lf-imgdiff.mjs a b`：`pixel-base-1` 對 `pixel-base-2`、`-3`：`diffPixels:0`；`pixel-base-1` 對 `pixel-new-1/2/3`：皆 `diffPixels:0, maxChannelDelta:0`（852×393）。治具修正史（為什麼舊版 BASE 對 BASE 也會不同、怎麼補）見 `acceptance.md` 修訂記錄；舊版截圖 `pixel-base-run1/2.png` 保留。

**條件 6**
- `node tests/tools/trace-eq.mjs ../load-fix-base/index.html index.html` → `{"seeds":"1..20","bytesOld":353154,"bytesNew":353154,"equal":true}`（凍結檔寫 `trace-eq.mjs f8c32942`，工具實際介面要兩個 index.html 路徑，已用 BASE 樹的檔）。
- `node --test tests/*.test.mjs` → `tests 461 / pass 461 / fail 0`（480.9 s）。
- `node tests/tools/landscape-fit-probe.mjs [--base f8c32942] --out <scratch> --tag …`：BASE 與 NEW 皆 `cells 105/105`、`cellsStrictNoBackdropExempt 96/105`、`m1 105`、`m2 105`、`portrait 21/21`、`missing []`、`redScreens []`、pageErrors 空；只有 `transitions` 239/239 vs 232/232（走局不同，皆全過）。`probes/landscape-fit-*.stdout.txt`。
- `node tests/tools/text-fit-probe.mjs [--base f8c32942] --out <scratch> --tag …`：見上「未過／需裁定」第 2 點；`probes/text-fit-*.stdout.txt`、`probes/cmp-*.txt`（`probes/cmp.js` 逐格比對）、完整 JSON 為 `.json.gz`。

**條件 7**　`node lf-flow.mjs --root NEW`（`raw/c7-new.json`）：solo、hotseat、`?handreal=0` 皆 `reached:true`、`errs:[]`。

## 限制
- 全部是桌面 headless Chromium＋SwiftShader，不是 iPhone Safari；iOS 對 `modulepreload` 的行為、GPU 上傳成本未量。
- 條件 3c 的 three 4 檔走真實 unpkg（被 CDP 節流），有外網變異；各 3 次數字很穩（±0.07 s）。
- 條件 1／4 的「renderer 晚到」用 route 延遲模擬；真實慢網（Slow4G）下的整局行為未重跑（原型報告已有 Slow4G 數字，本卷不重量）。
- 手機實機請使用者看：開局到桌面出現的等待、載入畫面文字是否礙眼。送達（push／Pages）本卷未做，依指示未 push。
