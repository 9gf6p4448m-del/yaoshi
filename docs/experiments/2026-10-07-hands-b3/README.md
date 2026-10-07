# v0.63.0 席位之手 批 3 配件——現況報告（中途交出，未完成）

分支 `feat/hands-b3`（工作樹 `C:/Users/shung/wt/yaoshi/hands-b3`），基準 `85c38c6a`（基準樹 `C:/Users/shung/wt/yaoshi/hands-b3-base`，已接 tools junction）。
驗收以 `acceptance.md`（凍結 ff66c398）為準，**一字未改**。量測位置：本機桌機 Chromium（ANGLE D3D11）／node；**iPhone 未驗**。未 push、未 merge。

## 結論
- 有證據且過：1、2、3、4、5、6、7、8、11 的一半（只做了 `?handb3=0` 的 node 端退回，GPU 逐幀雜湊未做）
- 傾向未過（資料未收齊）：**10 效能**——已跑 4 輪交錯，新版 A 段 p95 3.6–3.8 ms vs 基準 2.8–3.2 ms（約 ×1.2，門檻 ×1.15）
- 未做：9（依指示不做）、11 的 GPU 逐幀雜湊（eq-frames）、12 的相關測試整批與全套、13（依指示不做；並排圖與盲讀截圖**還沒產**）、14 推後 curl（不 push，未做；版本字串已改）

## 逐條
| # | 狀態 | 證據 |
|---|---|---|
| 1 trace 等價＋亂數 | 過 | `node tests/tools/trace-eq.mjs <base>/index.html index.html` → `c1/trace-eq.txt` equal:true（seeds 1..20，已含版本字串改動）；`--mutate` 驗紅 `c1/trace-eq-mutate.txt` differs:true。`node tools/c1-random.mjs` → `c1/random-b3.json`：420 幀、Math.random 0 次、每幀最大 0、幾何物件前後同一份 |
| 2 既有手不變 | 過 | `tools/c2-pixels.mjs`（批 1 治具只改角色表）base×2、new×2，`tools/c2_compare.py` → `c2/c2-pixels-compare.json`：既有手（一般＋收驚婆／當鋪／獵人＋批 1 四角色）new vs base **32/32 格 0 差**（兩次）；正對照批 3 三角色 **0/12 格相同**（差 548–7,643 px）；同樹連跑 base1/base2、new1/new2 皆 44/44 相同。rgba 原檔移到 scratchpad（222MB 不進 git），只留 `c2/rgba/*-pixels.json` |
| 3 配件全上場 | 過（基準紅） | `node tools/c3-features.mjs --root=.` → `c3/c3-new.json` **47/47**（每件配件有三角形送進 GPU、原手頂點位置與預設手逐值相同、皮膚區頂點色 0 差只有袖口區不同、aSkin＝9/10/11 同 v0.62.5、無 UV、一份材質無貼圖、閭山符形頂點全為朱紅）。基準樹 `c3/c3-base.json` 13/47、`?handb3=0` `c3/c3-new-handb3off.json` 13/47（紅）。符形＝頂上三點＋上下折雷紋＋底部螺旋（`js/hand-b3.js` FU_STROKES），不含「朱砂」字；**是否「不是可讀漢字」只能靠條件 9 盲讀判定，機械檢查無法證明** |
| 4 面數／draw call | 過 | 每席面數 `[5416, 5748, 5650, 6058]`（孝女／閭山／爐主／組頭，`c1/random-b3.json`；實頁 `c3/c3-new.json` `[5416,5748,5650,4792]`），≤6,500；擺盪不另加 mesh（CPU 改寫同一份 position 的一段，`updateRange`），每手 draw call 增量 1（`raw/v1-measure.json` calls:1，探索版截圖量的；最終版未重量） |
| 5 圓度 | 過（基準紅） | `node tests/tools/hand-acc-roundness.mjs --cam=auto --groups=…` → `c5/c5-roundness-new.json`：念珠 13 顆 特寫 min 0.9406／遊戲 min 0.9469；骨扳指 0.9753／0.9202；玉戒 0.9663／0.9557（全 ≥0.85）。基準 `c5/c5-roundness-base.json` 0 顆（量不到＝紅） |
| 6 垂尾長度 | 過 | 結點→尾端 0.342、0.303 dm；手掌長（Wrist→MiddleA）0.716 dm ⇒ 0.478×、0.423×（區間 0.35–0.55）。node 測試 `tests/table-hands-b3.test.mjs` 第 2 條綠 |
| 7 擺盪 | 過（a/b/c/d） | `node tools/c7-swing.mjs --freeze=60` → `c7/c7-swing-freeze60.json`（量法獨立於產品 state()：尖端頂點 getVertexPosition vs 靜止副本 applyBoneTransform）。**a** 峰值/長：L 垂尾 0.234／0.234、福袋 0.45；P 垂尾 0.279／0.301、福袋 0.45（全 ≥0.05）。**b** 停後 1.5 s 最大偏移/峰值 0.0060–0.0078（<0.10），靜止段 sd/峰值 0.0013–0.0018（<0.02），回到 10% 以下 26–33 幀。**c** 尖端離桌/長 最小 0.18（L 垂尾 2）（≥ −0.05）；全套推→拍→扒 S3 最小 0.17。**d** `c7/c7d-scan.json`：更新路徑（write/flush/reset/update 54 行＋table-hands swingStep 12 行）new／BufferGeometry／clone／陣列配置 0 處；執行期 Math.random 0（條件 1）。鑑別力：GAIN=0 突變 `c7/mutant-gain0.json` a 全紅（峰值 0）；ZETA=0 `c7/mutant-zeta0.json` b 全紅（停後/峰值 ≈1.0）。freeze=24 版 `c7/c7-swing-freeze24.json` 也全過 |
| 8 遮擋 | 過 | `tools/hands-occlusion-b3.mjs --seats=xiaonv,lvshan,luzhu,zutou` 連 5 次 → `c8/occl-b3seats-{1..5}.json`＋.log：5/5 pass，最大 3.15–3.17%（≤10%）。各情境逐次有小差（如「推」0.0000 vs 0.0074），是治具時鐘起點用真實時間（批 1 README 已歸因），不影響判定 |
| 9 盲讀 | 未做（依指示） | — |
| 10 效能 | **未收齊，傾向未過** | `tools/perf-b3.mjs` 交錯 base/new，`c10/progress.log`：A 段（孝女／閭山／爐主／組頭）p95：base 3.0, 2.8, 3.2, 2.8；new 3.7, 3.7, 3.6, 3.8（mean 幾乎相同 1.55–1.68 vs 1.66–1.68）。第 5 輪仍在背景跑。四輪中位 base 2.9 → 門檻 3.34，new 3.7 ⇒ 若第 5 輪不翻轉即**紅**。未診斷來源（推測：配件頂點進碰撞取樣，placeAt 點數 +~20%）；`tools/cpu-node.mjs` 已寫未跑 |
| 11 開關 | 部分 | node：`opts.b3=false` 三角色退回預設手（測試第 4 條綠）；實頁 `?handb3=0` c3 13/47 同基準。**GPU 輸入逐幀雜湊 3 次對 85c38c6a：未做**（`tools/eq-frames-b3.mjs` 已備未跑）。`?handreal=0`：未做 |
| 12 測試 | 部分 | 新測試 `node --test tests/table-hands-b3.test.mjs` 4/4 綠；同檔放到 85c38c6a 跑 `c12/new-tests-on-85c38c6a.txt` 0/4（紅在行為斷言：variants／垂尾數）。既有相關測試整批、全套：**未跑** |
| 13 簽收 | 未做（依指示）；素材也未產 | `tools/contact_b3.py` 已寫未跑 |
| 14 版本 | 字串過；送達未做 | index.html VERSION／RELEASE_VERSION／theme.css、safe-area.css `?v=0.63.0`、VERSION_NOTE 前置一段。**被迫改既有斷言**：`tests/ui-hierarchy.test.mjs:25` 釘 0.62.5→0.63.0（照批 1 前例，需主對話裁定是否接受） |

## 改了什麼
- `js/hand-b3.js`（新）：三角色配件、袖口色、擺盪執行體（彈簧阻尼 ω=9、ζ=0.34、加速度上限、偏移上限 0.45×長、不穿桌夾住）。
- `js/table-hands.js`：`?handb3=0`／`opts.b3` 開關、批 3 幾何與碰撞取樣、`swingStep`、`stats().b3/b3Error`、`b3Swing()` 治具出口。
- `tests/hand-fixture.mjs`：`loadHands({ b3: true })` 才換入 hand-b3（預設不換＝既有測試行為同 85c38c6a）。
- `tests/table-hands-b3.test.mjs`（新）、`tests/ui-hierarchy.test.mjs:25`、`index.html` 版本。

## 已知風險
效能（條件 10）；iPhone 未驗；抓取（grab／詛咒推按）姿勢下的擺盪與不穿桌未量；符形可讀性未經盲讀；既有測試仍未驗到批 3（fixture 預設不載入）。
