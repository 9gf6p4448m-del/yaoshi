# 驗收（凍結，2026-10-11）— UX 檢視 H3＋M3＋M4＋M9（fix/h3-affordance）

基準：origin/main db281fa9（v0.65.5）。版本：本分支升 0.65.8（四處：index.html RELEASE_VERSION／VERSION／VERSION_NOTE、theme.css?v=、safe-area.css?v=，tests/ui-hierarchy.test.mjs:25；上線時主 session 重排版號）。
來源報告：`C:\Users\shung\AppData\Local\Temp\claude\C--Users-shung\9f7814a6-a582-4320-abd2-e3719902c276\scratchpad\uxreview\REPORT.md` 的 H3、M3、M4、M9。使用者已授權主 session 代決（甲案）。
範圍：純呈現，不改規則、不耗賽局 RNG、不動 `.wishchip`／`wishChip*`（fix/wishbar-chip 分支在改 #feltHead 區）。不 push、不 merge。
狀態：**凍結**（動手改程式前 commit）。依 02 §2.1，凍結後只能加嚴；放寬須寫「原標準錯在哪、為什麼現在才知道」並經主 session 轉使用者同意。
量法統一：真實頁面（Playwright 單一 chromium，一次只開一個）＋ `tests/h3-affordance.test.mjs`；三尺寸＝844×390、667×375、932×430。
每條：**條件**／**什麼實作會讓它變紅**。

## H3-a 窄籤有 ›、點過會變實心（三尺寸）
- 條件：市集出價頁每個 `.railTabs button` 內有 `.tabArr` 且文字含 `›`；按鈕高度 ≥ 40px 且與基準相同、寬度不超出所在欄；點擊一枚籤進鑑賞頁後，該籤有 class `seen`，且 computed `background-color` 與點擊前不同（實心）；沒點過的籤不變。三尺寸皆成立。
- 紅：沒加 ›；加了但點過不變（只加 aria／class 無視覺變化）；點一枚籤結果全部籤變實心；› 把籤撐出欄寬。

## H3-b 鑑賞頁首次提示
- 條件：同一局第一次進入鑑賞頁時出現 `#apprHint`，文字含「點空白返回」與「左右滑換件」，且 ≤ 3.5 秒內從 DOM 移除或不可見（出現 ≥ 2.0 秒，防一閃即逝）；同局第二次進入鑑賞頁 500ms 內不出現；`newGame` 後再進入又出現一次（每局一次）；提示不攔事件（`pointer-events:none`）。
- 紅：每次進入都出現；永不消失／超過 3.5 秒；從不出現；換局不重置；提示攔住點空白返回。

## M3 ▾／▴ 語意統一
- 條件：任一「收起狀態（aria-expanded=false）」的展開鈕，視覺箭頭向下（▾，北列 `.nsumArr` 文字 ▾ 且無旋轉；押寶收合鈕 `.stakeArr` 文字 ▾）；任一「展開狀態（aria-expanded=true）」視覺向上（北列展開後旋轉 180° 或文字 ▴；押寶展開面板的 `.stakeCol` 文字 ▴）。北列 `.nsumArr` computed font-size ≥ 14px（三尺寸）。
- 紅：押寶面板維持舊方向（展開 ▾／收合 ▴）；北列仍 11px；北列展開後不變向。

## M4 出價／盯上後窄籤有標記、不推版面
- 條件：對某槽設出價 amt=N（myBids[i].amt）後重畫，該槽窄籤內有 `.tabbid` 且文字為「押 N」（毒標為「毒 N」）；盯上該槽後有 `.tabmark`（含 👁）；未標的籤沒有。標記前後：`#felt` 矩形、每枚窄籤矩形（x、y、寬、高）逐值相同（|Δ| ≤ 0.5px）——標記疊在籤上、不佔流。
- 紅：標記放進文字流造成籤變寬／變高；只標在別的槽；舊版（無 `.tabbid`）。

## M9 押寶夜面板預設收合
- 條件：押寶夜進出價頁時 `.stakebar.collapsed`（aria-expanded=false）且文字含「押寶」；其矩形底緣 ≤ 3D 拍品區頂端（量法：`tray.lotNodes()` 各節點投影到螢幕的包圍盒，取 min top；兩者皆為實測數字，貼輸出）；點收合鈕展開後 `.stakebar` 內有 `.stepper`、`.typebtn`、`.stakeCol` 且 `ybBump(1)` 後金額 +1（展開仍可用）；換夜（YB 重建）再回押寶夜仍預設收合。
- 紅：預設展開；展開後功能壞；收合了但底緣仍蓋住拍品區（若量到真的做不到，須如實回報、不得改量法）。

## 共同
- **V1 舊版紅在行為斷言**：`tests/h3-affordance.test.mjs` 對 db281fa9 的 index.html 跑，H3-a/H3-b/M3/M4/M9 各條須紅在行為斷言（非 import／選擇器例外；選擇器找不到元素時以「元素缺失」斷言訊息明示算行為紅）。
- **V2 trace-eq**：`node tests/tools/trace-eq.mjs <db281fa9 index.html> index.html` 回 equal？本分支會改 index.html（純呈現），預期 equal:true（seeds 1..20）；`--mutate` 須回 differs:true、exit 0（見 props-micro 修訂 3 對 exit code 的更正）。
- **V3 既有測試**：改前在本樹跑 `node --test tests/*.test.mjs` 失敗集合 B；改後失敗 ⊆ B；若出現 B 以外失敗，先單跑重現，ERR_CONNECTION_REFUSED 類逐字貼訊息並歸因，不得只寫「抖動」。`tests/ui-hierarchy.test.mjs` 版本斷言隨 0.65.8 更新（屬必要連動，非放寬）。
- **V4 突變驗紅**：每條各做一個突變體（暫存副本）實跑須紅在對應條：H3-a 去掉 `.seen` 樣式；H3-b 提示不消失；M3 押寶箭頭不翻；M4 標記改成流內元素；M9 預設不收合。
- **V5 範圍檢查**：`git diff --stat db281fa9..` 只含 index.html、assets/*.css、（版本連動）tests／本凍結檔；不含 `.wishchip`／`wishChip` 相關行。
