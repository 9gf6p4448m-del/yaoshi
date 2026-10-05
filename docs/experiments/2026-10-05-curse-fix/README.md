# v0.60.1 詛咒轉移「砍掉拖回」實作卷報告

分支 `feat/v0600-grab`（未 push）。凍結驗收：[acceptance.md](acceptance.md)。基準 `cf7b5008`（線上 v0.60.0），基準 worktree `C:/Users/shung/wt/yaoshi/curse-base`。
提交：`8a2b84a4`（①砍拖回＋條件 2 判定器）、`e2ada436`（②清單內測試／治具）、`05ad0710`（③版本 0.60.1）。
最終證據跑在 HEAD `05ad0710`，log 全在 [evidence/](evidence/)，指令與時間戳在 `evidence/progress.log`。

## 結論：8 條裡 6 過、#6 紅（盲讀三輪未過，停手）、#8 只完成版本字串（送達不在本卷）

| # | 結果 | 證據（指令 → 實際輸出） | 基準 cf7b5008 |
|---|---|---|---|
| 1 | 過 | `node tests/tools/grab-trace-check.mjs <base>/index.html --mutate` → equalOn/equalOff true、Math.random 0/0/0、突變抓得到差異（`c1-trace.log`） | ＝參照 |
| 2 | 過 | `grab-probe --modes=award,curse`：cNS／cWE 落定 983ms 後 d 回升 0、水平回升 0、對受害者席點回升 0、終點水平距離 0（`c2458-head.log`、`c2-head.log`） | **紅 2/2**：1433ms 起 d 回升 0.0597／0.0542（水平 0.10）、終點離席前 0.10（`c2458-base.log`、`c2-base.log`） |
| 3 | 過 | 落定 983ms ≤1300；`grab-probe --modes=skip` 30/30（含詛咒推／按住／收手三時刻）：下一幀在終點、四手不可見（`c3-skip-head.log`） | 30/30（本條不要求基準紅） |
| 4 | 過 | 繩只在按住階段（20 幀、階段外 0）、844 寬繩粗 7.7／4.0px、幾何 uuid 1 個；受害者手抖交替峰 17／13、振幅 0.008；單元測試掃描 `new THREE.TubeGeometry` 1 處、在已建守衛後（`c7-suite.log`） | 同 |
| 5 | 過 | v0.60.0 條件 2：6/6 落定 1267ms、掙扎過；3：HUD 40/40（V1–V5×8）；4：8/8 穿拍品 0、最低點≥桌面；5：越中線 0 點＋`grab-legacy-eq` 2080 幀 sha256 與 cf7b5008 相同（活性 hold/push/rake/retract/slam）；6：skip 30/30＋`table-framing-skip-check` pass（0 幀飛行、0 幀手）；7：事件 8/8＋`grab-realflow` 3/3（落定 1238–1250ms、卡片 1352–1363ms、取景 100%）；10：p95 中位數 新 4.40ms／cf7b5008 4.30ms＝1.02（門檻 1.25）；11：`?grab=0` 對 cf7b5008 `?grab=0` 222 幀 0 像素相異（`c5-diff-grab0-v2.log`），`?grab=1` 對 cf7b5008 只有 20 幀相異、全是詛咒 1350ms 之後（＝拖回被砍掉那段），一般得標幀全同 | — |
| 6 | **紅** | 三輪 fresh agent 盲讀：r1 0/2·0/2、r2 1/2·2/2、r3 1/2·1/2，見 [blindread/README.md](blindread/README.md)。第 3 輪未過，依凍結停手 | — |
| 7 | 過 | `node --test tests/*.test.mjs` → 471/471（`c7-suite.log`）。只改清單內：tests/grab-motion.test.mjs 加「詛咒不拖回」（對 cf7b5008 紅在行為斷言「符紙堆離開席前 t=1.305」，`c7-grab-motion-on-base.log`）、tests/tools/grab-probe.mjs（詛咒段判定器與註解）、tests/ui-hierarchy.test.mjs 版本釘 0.60.0→0.60.1 | — |
| 8 | 部分 | VERSION／RELEASE_VERSION／VERSION_NOTE＝0.60.1，theme.css／safe-area.css 的 ?v= 同步；推 main 與送達查核不在本卷 | — |

## 判定器口徑（條件 2，凍結條文沒寫死的地方）
- 「受害者席點」有兩種讀法，兩個都量、兩個都要過（加嚴）：d＝到「受害者席前終點」（演出中 grabState 給的 dest）的 3D 距離；ds＝到受害者席位點（SEAT_XZ）的水平距離。只量 ds 時基準**不會紅**——拖回是往受害者席位拖，ds 反而變小（基準 ds 回升 0），所以真正有鑑別力的是 d。
- 終點容差 0.002 比的是到 dest 的**水平**距離。第一版比 3D，新版終點 3D 距離 0.054／0.065——符紙堆壓在受害者手背上、手被可達抬起約 0.05（v0.60.0 起就這樣，dest.y 不含這段抬升），任何「堆留在手背上」的實作 3D 終點都過不了，屬「無論實作對錯都不可能通過」，已自行改成水平並在這裡回報。3D 的 d 仍判單調不增（上下亂動也紅），3D 終點值照實記在 log（finalD）。基準在兩版判定器下都紅。
- 落定之後的整段（含隱藏後的幀）都算進「單調不增」。

## 已知問題與範圍外（只記錄未處理）
- 盲讀讀不出來的原因（歸納自受試者原答，未驗證）：受害者的手在符紙堆到之前先伸到桌心平放（A 的既有設計），連拍上像「他伸手去拿」；西席手臂從畫面左上進場，和北席不易分；符紙堆落定後約 0.64 秒就依既有終態隱藏。這幾件都在「A＋C 其餘設計不動」之外，留給使用者裁定。
- 盲讀三輪產品同一版，輪間只改連拍呈現（解析度、每格間隔），理由寫在盲讀紀錄。
- 觀察到的既有行為（v0.60.0 就有，未改）：演出自然演完的那一幀 `applyGrab` 不會再被呼叫（update 迴圈的條件是 `g.time < g.script.end`），所以 `finishGrab` 只在跳過時跑；自然演完時符紙堆隱藏前的最後位置＝停住的位置，不會被搬回 dest。
- 範圍外：一般得標手感、手尺寸、角色手變體、畫面升級卷鏡頭、各詛咒物個別特色動作。

## 給使用者看
- 連拍對照：`evidence/strips/head-curse-cNS.jpg`／`head-curse-cWE.jpg`（新版，每格 100ms）對照 `base-curse-*.jpg`（v0.60.0）。
