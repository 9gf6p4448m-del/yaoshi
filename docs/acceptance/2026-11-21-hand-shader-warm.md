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
