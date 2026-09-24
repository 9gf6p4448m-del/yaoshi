# 真版長明 flame-M＋神王 king-L 正式驗收結果（2026-09-24）

**結論**：依 [正式驗收規則](formal-acceptance.md)，**成功**。產品 `1f59b10`，全部量測在同一 HEAD 上以正式工具完成（普通對照＋20 shard＋14 臂，共 2,612 秒）。

| 項目 | 結果 |
|---|---|
| 真長明焦點原案 | **+5.23pp（95% +3.39..+7.19）pass**，真事件 5,590 |
| 真神王焦點原案 | **+6.63pp（95% +4.78..+8.57）pass**，真事件 491 |
| 與試跑 variant L 一致 | 六鏈原案差值與真事件數逐位相同 |
| 其他四鏈焦點 | 水陸 +0.37、千眼 0.00、雙虎 +0.48、血祭 0.00，仍 fail（未改） |
| 普通 H1／H9 六鏈 | 與 `0592512` 正式結果逐位相同（真版常數不影響普通組） |
| 測試（`sfx-wiring` 以外） | 改數值後 378/383：5 項為真版舊數值斷言；經使用者同意更新（神王 +3→+7、長明白天 +1→+2、原案護盾 2→3；候選護盾上限 2 與到期斷言不變）後 **383/383** |

- 鑑別：更新後的 `tests/l1-destiny-chains.test.mjs`、`tests/l1-destiny-night.test.mjs` 在新產品 38/38；`index.html` 暫換回 `1f59b10~1` 時同 5 項失敗（33/38），還原後全套 383/383。
- 摘要：[formal-focus-summary.json](formal-focus-summary.json)、[formal-ordinary-summary.json](formal-ordinary-summary.json)；raw 在忽略版控的 `scratchpad/destiny-formal-v3/`、`scratchpad/destiny-focus-v3/`、`scratchpad/ordinary-formal-v3/`。
- 候選（削峰）模式只照實記錄：長明 +4.44、神王 +4.22，皆 incomplete；遊戲預設為原案。
