# 千眼私函關閉鈕＋「千眼多看」徽章：結果（2026-09-25，v0.57.42）

**結論**：[凍結驗收](acceptance.md)（`bb5d088`）A1–A5 全部符合。純介面：`index.html` 新增兩條 CSS、兩處袋子「關閉」加 `stickyClose`、預告列第 4 件在本席真千眼覺醒時加 `.eyesExtra`。

| 項 | 改動前 `f76ad39` | 改動後 |
|---|---|---|
| A1 844×390 關閉鈕 | top 593／bottom 637（視窗高 390），不可見、中心點點不到 | top 309／bottom 353，可見、中心點＝關閉鈕 |
| A1 1280×720 關閉鈕 | 可見（616／660） | 可見（616／660） |
| A2 真千眼覺醒、預告 4 件 | 徽章 0 | 徽章 1，緊接第 4 件（兩尺寸） |
| A2 普通千眼 3 件（天命固定水陸） | 0 | 0 |
| A2 無千眼（雙虎練習，預告 1 件） | 0 | 0 |
| A3 主鈕中心點 | 主鈕 | 主鈕 |
| A4 `trace-eq.mjs f76ad39 → 現行` | — | `equal:true`（seeds 1..20）；`--mutate` 驗紅 ✅ |
| A5 `node --test tests/*.test.mjs` | — | 384/384（含 `sfx-wiring` 394 秒） |

- 探針：`scratchpad/eyes-ui/probe.mjs`（練習場「千眼天命（冷讀）」走真實開標覺醒）；反例用 `probe2.mjs` 以 `FORCE_DESTINY=water` 固定本席天命。pageerror 皆 0。
- 版本升 0.57.42 後 `release-update`／`ui-hierarchy` 5/5、trace 仍 equal。
