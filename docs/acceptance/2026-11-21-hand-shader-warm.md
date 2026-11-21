# 驗收條件：手部 shader 開頁預編（2026-11-21，動手前凍結）

**要解決的事**：出價頁第一次出手時，手的蒙皮材質 `hand-skin-proto-b` 才第一次編 shader，ANGLE D3D11（桌機 RTX 5070 Ti）同步卡約 3.1 秒，主執行緒整段停住；`tests/wishchip.test.mjs` H／J（`:217`）、K（`:270`）因此在桌機必紅（歸因見 memory `project_yaoshi_desktop.md`「wishchip H／J 歸因」）。
**作法**：手載好後在背景用 `renderer.compileAsync` 編好手的 shader（比照 `js/renderer.js:221` warmAppraise），不改任何規則、數值、畫面。製作人 2026-11-21 選 B。

## 量測工具
- 探針 `tmp/wishchip-loop/probe5.mjs`（不進 git；init script 包 WebGL 的 getProgramInfoLog／getProgramParameter 計時、longtask buffered）。
  - R 路徑＝`PROBE_WAIT=8000`（開頁後 8 秒才開局，像真人看標題、選角）；T 路徑＝`PROBE_WAIT=0`（測試的極速路徑）。
- 「post」＝pickMark 之後 5.5 秒內；「pre」＝開頁到 pickMark 之前。

## 條件（全部要過；基準＝main 7a67c32c 實測）
1. **出價頁不再卡**：R 路徑連跑 5 次，每次 hand 程式的 getProgramInfoLog post 最大值 ≤ 100ms，且 longtask post 最大值 < 1000ms。
   基準：5/5 紅（hand post 3123–3173ms、longtask post 3174–3221ms）。
2. **測試**：`node --test tests/wishchip.test.mjs` 整檔連跑 5 次全綠。基準：1 次，H／J 紅在 `:217`、K 紅在 `:270`。
3. **沒把卡頓搬到載入期**：R 路徑 5 次，longtask pre 最大值 ≤ 1167ms（基準最大 867ms＋300ms）。
   基準：5/5 綠（444–867ms）。鑑別力驗法：改成同步編（compile 後立刻 getProgramInfoLog）的突變版要讓這條變紅。
4. **預編真的生效且版本對得上**：R 路徑 5 次，pickMark 前 `hand-skin-proto-b` 程式數 ≥ 1，出價頁後仍 = 1（沒有另編第二個版本）。
   基準：5/5 紅（pickMark 前 0）。
5. **沒有回歸**：全套 `node --test tests/*.test.mjs` 的失敗集合 ⊆ {nightwalk #1、relic-micro}（基準已知；relic-micro 若紅，單獨跑 5/5 綠才算）。
6. **引擎逐位元組相同**：`node tests/tools/trace-eq.mjs <main 的 index.html> <分支的 index.html>` exit 0；`--mutate` exit 1。
7. **範圍**：`git diff --stat main..分支` 只動 `js/table-tray.js`、`js/renderer.js`、`index.html`（只限 VERSION／VERSION_NOTE／RELEASE_VERSION 三處）、本檔。
8. 所有探針執行 pageerror = 0。

T 路徑的數字照實記錄，不另設門檻（測試走的就是 T 路徑，由條件 2 把關）。

## 執行中的更正紀錄（原文不刪）
- 2026-11-21 條件 6 的「`--mutate` exit 1」是我寫錯：`tests/tools/trace-eq.mjs --mutate` 抓到差異時回 exit 0＋`"differs":true`＋「突變驗紅 ✅」（exit 1 是它內部對突變體比對的預期）。這一小項只驗工具本身抓得到引擎差異，與實作對錯無關，照字面無論實作如何都不可能過 ⇒ 依 02 §2.1 例外自行更正為「`differs:true` 且 verdict ✅」，事後回報。
- 2026-11-21 版號不在本分支遞增：`tests/ui-hierarchy.test.mjs:25` 釘選 `RELEASE_VERSION="0.66.0"`，且要求 safe-area.css 的 `?v=` 等於版號；完整遞增要連動測試釘選與 `?v=`（先例 `73acc81c`），超出條件 7 的範圍，且下一版版號要等製作人 iPhone 試玩後才定。合併上線時照先例一次改齊。`index.html` 因此在本分支沒有改動（仍在條件 7 範圍內）。

## 製作人 2026-11-21 逐條同意的修改（對話中以選項明確點頭，不是「照建議」）
- **條件 1 改為只算手**：R 路徑 5 次，hand 程式 getProgramInfoLog post 最大值 ≤ 100ms；原文「longtask post 最大值 < 1000ms」作廢。
  - 原標準錯在：它算的是出價頁之後所有長任務，包含與手無關、基準就有的 ghost_wisp（約 340ms）＋robe（約 320ms）首次編譯（基準 T-1 沒出手也有 971ms）；凍結時只留 29ms 餘裕。
  - 為什麼現在才知道：最終驗證 R-1 量到 1005ms（手 0ms），之前 9 次都在 1000ms 以下。ghost_wisp／robe 另記為範圍外發現，未處理。
- **wishchip 測試先等手的 shader 編完才開始**（`tests/wishchip.test.mjs` withPage，斷言一條都不動）。
  - 原標準錯在：測試一開頁就開局，手模型和進出價頁幾乎同時載好，背景預編來不及，剩約 2.5 秒仍卡在出價頁；全套 15 個瀏覽器並行時更長，吃掉心願標籤 3.5 秒的自動展開窗口（K 在全套紅在 `:273`）。真人從標題到出價頁遠超過 3 秒。
  - 為什麼現在才知道：單獨跑 10/10 綠，最終全套那一次才紅。
- **條件 7 範圍擴充**：`tests/wishchip.test.mjs`（上條）；`tests/curse-cam-off.test.mjs` V3 埠 9761→9765（製作人同意）。順手修同型撞埠（只改預設埠、不動斷言）：`tests/h1-guide.test.mjs` 9767、`tests/h2-cards.test.mjs` 9769、`tests/h3-affordance.test.mjs` 9772、`tests/light-aplus-robust.test.mjs` 9747→9749。依據：全套並行時 curse-cam-off 紅在 ERR_CONNECTION_REFUSED×3，單跑 5/5 綠；9761 原本 5 支共用、9747 原本 2 支共用。

## Codex yaoshi-v0.66.1-r1 之後的修正與重驗（2026-11-22，原文不刪）
- F2：`warmHands` 改用 `compileQuietly`（`js/table-tray.js`，three 0.158 `compileAsync` 的安全版），context 恢復後再背景編一次；F5：新增 `tests/hand-warm-context.test.mjs`（A：第一次出手前手的材質已有程式；B：context 遺失恢復時不丟例外且重編）。f2ff1ad7 紅在 B（`TypeError ... reading 'isReady'`），main 紅在 A（0/1），新版綠。範圍因此多一支測試檔，門檻都沒動。
- 換成 `compileQuietly` 後以 probe5 重量 R 路徑 5 次：條件 1 手程式 post 最大 0ms ×5；條件 3 longtask pre 最大 441–870ms（≤1167）；條件 4 開局前已有手程式、出價頁後 1 支 ×5；pageerror 0。
- 2026-11-22 共用載入器改寫（563ba1af、29975875，手的 GLB 也走它）後重量 probe5 R 路徑 5 次：條件 1 手程式 post 最大 0ms ×5；條件 3 longtask pre 最大 845–896ms；條件 4 開局前已有手程式、出價頁後 1 支 ×5。hand-warm-context 測試綠。
