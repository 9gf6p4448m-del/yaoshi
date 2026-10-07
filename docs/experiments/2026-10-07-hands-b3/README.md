# v0.63.0 席位之手 批 3 配件——實作與驗收報告（第二輪）

分支 `feat/hands-b3`（工作樹 `C:/Users/shung/wt/yaoshi/hands-b3`），基準 `85c38c6a`（基準樹 `C:/Users/shung/wt/yaoshi/hands-b3-base`，已接 tools junction）。
驗收以 `acceptance.md`（凍結 ff66c398）為準，**一字未改、門檻未放寬**。量測位置：本機桌機 Chromium（ANGLE D3D11）／node；**iPhone 未驗**。未 push、未 merge。

## 結論
- 過（有實測證據）：1、2、3、4、5、6、7（含抓取兩種姿勢）、8、10、11
- 12：相關測試全綠、新測試在基準紅；全套 502/504 其中 1 紅（sfx-wiring 超時，同碼另兩次綠、未歸因）＝全套訊號不可信，不宣告全套通過
- 依指示未做：9 盲讀、13 使用者簽收（素材已產，路徑見下）
- 部分：14（版本字串已改；不 push ⇒ 線上 curl／Pages 時間未做）
- 需主對話知悉：條件 8 的最大遮擋在條件 10 修正後由 3.15% 升到 4.18%（仍 ≤10%）；`tests/ui-hierarchy.test.mjs:25` 版本釘改動（主對話另報使用者）

## 逐條
| # | 狀態 | 證據 |
|---|---|---|
| 1 trace 等價＋亂數 | 過 | `node tests/tools/trace-eq.mjs <base>/index.html index.html` → `c1/trace-eq.txt`（及修正後重跑 `c1/trace-eq-r2.txt`）equal:true；`--mutate` 驗紅 `c1/trace-eq-mutate.txt`。`node tools/c1-random.mjs` → `c1/random-b3.json`／`c1/random-b3-r2.json`：420 幀 Math.random 0、每幀最大 0、幾何物件前後同一份 |
| 2 既有手不變 | 過 | `tools/c2-pixels.mjs`＋`tools/c2_compare.py`：修正前 `c2/c2-pixels-compare.json`、修正後 `c2/c2-pixels-compare-r2.json`（new3/new4）——既有手（一般＋收驚婆／當鋪／獵人＋批 1 四角色）對 85c38c6a **32/32 格 0 差**（兩次）；正對照批 3 **0/12 格相同**（差 537–7,823 px）；同樹連跑 32/32＋12/12 相同。rgba 原檔在 scratchpad（不進 git） |
| 3 配件全上場 | 過（基準紅） | `node tools/c3-features.mjs --root=.` → `c3/c3-new.json` 47/47；基準 `c3/c3-base.json`、`?handb3=0` `c3/c3-new-handb3off.json` 皆 13/47。內容：每件配件有三角形送進 GPU；原手頂點位置與預設手逐值相同（不縮放不改形）；皮膚區頂點色 0 差、只有袖口區不同；aSkin＝9/10/11（v0.62.5 同值）；無 UV、無貼圖；閭山符形頂點全朱紅。符形＝頂上三點＋上下折雷紋＋底部螺旋（`js/hand-b3.js` FU_STROKES），不含「朱砂」；**「不是可讀漢字」機械無法證明，交條件 9 盲讀** |
| 4 面數／draw call | 過 | 每席面數 `[5416, 5748, 5650, 6058]`（孝女／閭山／爐主／組頭，`c1/random-b3-r2.json`）；實頁 `c3/c3-new.json` `[5416, 5748, 5650, 4792]`；最終截圖治具 `final/raw/final-measure.json` 每手 calls 增量 1。擺盪不另加 mesh（同一份 position 改寫一段＋updateRange） |
| 5 圓度 | 過（基準紅） | `node tests/tools/hand-acc-roundness.mjs --cam=auto --groups=…` → `c5/c5-roundness-new.json`：念珠 13 顆 特寫 min 0.9406／遊戲 min 0.9469；骨扳指 0.9753／0.9202；玉戒 0.9663／0.9557。基準 `c5/c5-roundness-base.json` 0 顆（紅）。幾何在條件 10 修正中未變（修正只動碰撞取樣） |
| 6 垂尾長度 | 過 | 結點→尾端 0.342、0.303 dm，手掌長 0.716 dm ⇒ 0.478×、0.423×；`tests/table-hands-b3.test.mjs` 第 2 條綠（修正後 `c12/related-table-hands-b3.txt`） |
| 7 擺盪 | 過 | **推錢（node，`tools/c7-swing.mjs --freeze=60` → `c7/r2/c7-swing-freeze60.json`）**：a 峰值/長 0.220–0.45（≥0.05）；b 停 1.5 s 後最大偏移/峰值 ≤0.0079（<0.10）、靜止 sd/峰值 ≤0.0019（<0.02）；c 尖端離桌/長 最小 0.142（含推→拍→扒全套 S3）；鑑別力重驗：GAIN=0 `c7/r2/mutant-gain0.json` a 全紅（峰值 0），ZETA=0 `c7/r2/mutant-zeta0.json` b 全紅（停後/峰值≈1.0）。**抓取（實頁，`tools/c7-grab.mjs` → `c7/r2/c7-grab.json`）**：得標抓法寶 S／N、詛咒推按 cSN／cNS／cSW／cNE，量做動作那一席：a 0.336–0.45、b 停後/峰值 0.0008–0.0070、sd/峰值 ≤0.0017、c 最小 1.97，停段手確實不動（stopRigidMaxStepOverLen＝0）。說明：抓取腳本每幀直接送擺位規格，只 setFrozen 停不住手（第一版量到停段手仍在動 0.3–1.35×長/幀，b 無效），改為落定起忽略新規格＋凍結才量 b；遊戲中得標抓完 0.52 s 就收手、不會停滿 1.5 s。**d** `c7/r2/c7d-scan.json`：更新路徑 new／幾何建構 0 處 |
| 8 遮擋 | 過（數值升） | `tools/hands-occlusion-b3.mjs --seats=xiaonv,lvshan,luzhu,zutou` 連 5 次：修正後 `c8/r2/` 5/5 pass，最大 4.08–4.18%（≤10%）；修正前 `c8/` 最大 3.15–3.17%；基準同座位 `c8/base-occl-1.json` 3.15%。升的是「推（四家同一格）」。試過兩個變體都壓不回（垂掛物不進碰撞 4.17%、凸出門檻 0.06 dm 4.09%），推測是共用取樣骨架改變了取樣點順序（俯角掃描的隔點取樣 coarse 落在不同點），未再追 |
| 9 盲讀 | 未做（依指示） | 素材見下 |
| 10 效能 | **過** | 見下「條件 10 診斷與修正」。修正後 `c10/r2/summary.txt`：A 段 p95 base [2.7, 3.0, 3.5, 2.5, 2.8] 中位 2.8；new [3.1, 3.0, 3.1, 3.0, 2.9] 中位 3.0 ≤ 門檻 2.8×1.15＝3.22（也 ≤ 第一輪基準算的 3.45）。iPhone 未驗 |
| 11 開關 | 過 | `tools/eq-frames-b3.mjs` 手的 GPU 輸入逐幀雜湊，`tools/eq_compare.py` → `c11/compare-*.txt`：時鐘起點 1e7，`?handb3=0` 對 85c38c6a 連 3 次 **190/190 ×3**；起點 4000 再 1 次 190/190；正對照（批 3 開）108/190（不等 82 幀全在批 3 段，欄＝幾何、矩陣）；`?handreal=0` 新版對基準 190/190。無波動。附記：起點 4000 的兩次（基準與新版都有）console 各 12 筆 404，兩邊相同、原因未查，不影響雜湊；1e7 的各次 0 錯誤 |
| 12 測試 | 相關測試過；全套不可信 | 相關測試 `c12/related.txt`：table-hands 24/24、table-hands-roles 29/29、table-hands-b3 6/6、hand-jitter 5/5、hand-realism-render 1/1、hand-skin-default 1/1、grab-motion 19/19、ui-hierarchy 3/3（hand-acc-roundness 沒有 .test 檔，以條件 5 治具代替）。全套：第一次 `c12/full-suite-run1-lf-workcopy.txt` 496 過／1 紅（l1-destiny-focus），歸因＝我用 Python 改檔時把工作複本的 CRLF 寫成 LF，該治具用 `\r\n` 錨點比對 index.html；git 內容不變。重新 checkout 恢復 CRLF 後該檔 7/7。全套重跑 `c12/full-suite.txt`：504 項 502 過／1 紅／1 略過——紅的是 `sfx-wiring.test.mjs` 凍結 #6①（seed 3 第 9 夜 driveUntil 300 s 超時，揭盅動畫旗標未落）。同一份產品碼：第一次全套該項綠（782 s）、單獨重跑綠（`c12/sfx-wiring-new-solo.txt`，12 m 14 s）、基準單獨重跑綠（`c12/sfx-wiring-base-solo.txt`）。該測試走真實時間、同 seed 每次夜數不同（非決定性），本卷的手與揭盅結算無資料往來；**這 1 紅未歸因，按 §6.2 標『訊號不可信』，不據以宣告全套通過**（相關測試 8 檔全綠另見上）。新增斷言在 85c38c6a 上：`c12/new-tests-on-85c38c6a.txt`／`-r2.txt` 全紅，紅在行為斷言。既有斷言：只有 ui-hierarchy:25 版本釘（主對話另報） |
| 13 簽收 | 未做（依指示）；素材已產 | 見「素材」 |
| 14 版本 | 部分 | index.html VERSION／RELEASE_VERSION／theme.css、safe-area.css `?v=0.63.0`、VERSION_NOTE 前置一段；未 push ⇒ 線上 curl 與 Pages 時間未做 |

## 條件 10 診斷與修正
1. 假設「配件碰撞點多約 20%」**被否證**：交錯 2 輪（第 3 輪中止）`c10/diag/`，A 段 p95：base 2.7／2.7、new 3.8／4.0、只關擺盪 3.9／3.7、只拿掉配件碰撞點 3.7／4.2——兩個單獨移除都壓不下來。
2. node CPU profile（`tools/cpu-node.mjs`，批 3 開 vs 關、同事件）多出的時間：qrot +837 ms、localPoints +360 ms、placeAt +299 ms、rotated +183 ms（12.2 s vs 10.2 s 總計）。qrot／localPoints 是 hand-motion `prepare`（姿勢 → 全部取樣點蒙皮）——它的快取以「取樣骨架」為單位。基準裡孝女／閭山／爐主共用同一副預設手骨架，同一姿勢算一次；批 3 三種手各一副，同一姿勢要算三遍。
3. 修正（commit 42dc047b）：三種批 3 手共用一副取樣骨架＝原手＋袖管（三種逐值相同）＋三種配件「凸出皮膚 >0.03 dm」頂點的聯集，並以 0.05 dm 格降採樣（垂掛物尖端點必留）（`js/hand-b3.js` collideSource／COLLIDE、`js/table-hands.js` 批 3 分支）。保守：每種手都避開三種配件的靜止位置。修正後 profile：qrot／localPoints 的增量降到 +99／+80 ms。
4. 修正後重量：6（幾何未變、測試綠）、7（含鑑別力）、8、10、2、11、12 如上表。新加的穿入測試（下節）在修正後綠。

## 補的測試（條件 12）
`tests/table-hands-b3.test.mjs` 新增 L／P 兩條「批 3 #C1/#C2」：`loadHands({ b3: true })` 下四席＝孝女／閭山／爐主／組頭，推、拍、揭盅收、四家推 12 枚，每幀把三席**全部蒙皮頂點（含配件、擺盪中的垂尾與福袋）**拿去對錢與令牌的實際實例體積判穿入（判法同 table-hands.test.mjs #C1）。先斷言受測的是批 3 的手、三席都上場、有配件頂點進判定（85c38c6a 上紅在「受測的是批 3 的手」）。

## hand-fixture.mjs 改動為什麼不會讓既有測試變容易
`loadHands(o = {})` 只有在 `o.b3` 為真時才把 hand-b3.js 換成 data: 模組；既有測試都呼叫 `loadHands()`（不帶參數），走的字串替換與 85c38c6a 完全相同（hand-b1、hand-realism、creature-figures 的替換一行未動），table-hands 的 `import('./hand-b3.js')` 在 data: 模組下解析失敗 ⇒ 批 3 三角色退回 v0.62.5 的手，與基準行為一致。也就是說既有測試的受測物、輸入與斷言都沒變；批 3 的覆蓋另由 table-hands-b3.test.mjs 以 `{ b3: true }` 補上（不是替既有測試換掉受測物）。

## 素材（條件 9／13 用，主對話轉交）
- 並排圖：`C:\Users\shung\wt\yaoshi\hands-b3\docs\experiments\2026-10-07-hands-b3\final\compare-all.jpg`、`compare-xiaonv.jpg`、`compare-lvshan.jpg`、`compare-luzhu.jpg`（每列：參考圖 | 手背朝上裁切 | 抓取（敗方扒錢）裁切；下列為 844×390 含 HUD 整張）
- 盲讀截圖（檔名無角色）：`...\final\blind\shot-a.png`、`shot-b.png`、`shot-c.png`
- 答案鍵（另資料夾）：`...\final\blind-key\answer-key.json`
- 原始截圖與量測：`...\final\raw\`（`final-measure.json`；遊戲取景 844×390、南席手背朝上＝推錢 28 步、抓取＝敗方扒錢 12 步）

## 改了什麼
- `js/hand-b3.js`（新）：三角色配件、袖口色、擺盪執行體、共用碰撞取樣來源。
- `js/table-hands.js`：`?handb3=0`／`opts.b3`、批 3 幾何、共用取樣骨架、`swingStep`、`stats().b3/b3Error`、`b3Swing()` 治具出口。
- `tests/hand-fixture.mjs`（opt-in `{ b3 }`）、`tests/table-hands-b3.test.mjs`（新）、`tests/ui-hierarchy.test.mjs:25`、`index.html` 版本。

## 已知風險
iPhone 效能未驗；條件 8 遮擋最大值 +1.0 點（仍過）；符形可讀性待盲讀；遊戲中抓取的手停不滿 1.5 s，b 是以「落定後強制靜止」量的。
