# 真版焦點比較：血祭改值後重跑（2026-09-24）

**結論**：在現行產品（HEAD `89ecd49`，`index.html` sha256 `8da0a4f4…2197`，含 `0592512` 血祭改值）上照 [2026-09-23 焦點比較](../2026-09-23-destiny/focus-report.md) 原協定重跑，**血祭仍 fail**（原案與候選皆 0.00pp，95% −0.85..+0.85，826 點）。其他鏈唯一判定變化：**神王候選 incomplete → fail**（+1.45，+0.36..+2.65）。六鏈仍無任何一組 pass。

| 鏈 | 點數 舊→新 | 原案 舊 | 原案 新 | 候選 舊 | 候選 新 |
|---|---|---|---|---|---|
| 水陸 | 812→811 | +0.37（−0.25..+0.99）fail | +0.37（−0.25..+0.99）fail | +0.49（−0.12..+1.11）fail | +0.49（0.00..+1.11）fail |
| 千眼 | 829→825 | 0.00（−0.84..+0.84）fail | 0.00（−0.85..+0.85）fail | 同左 fail | 0.00（−0.85..+0.85）fail |
| 雙虎 | 826→827 | +0.85（+0.12..+1.69）fail | +0.48（−0.36..+1.33）fail | +0.73（0.00..+1.46）fail | +0.36（−0.48..+1.21）fail |
| 血祭 | 826→826 | −0.24（−1.21..+0.73）fail | 0.00（−0.85..+0.85）fail | −0.24（−1.21..+0.73）fail | 0.00（−0.85..+0.85）fail |
| 神王 | 824→829 | +3.03（+1.70..+4.49）incomplete | +2.77（+1.45..+4.12）incomplete | +1.82（+0.73..+3.03）incomplete | +1.45（+0.36..+2.65）**fail** |
| 長明 | 769→765 | +3.77（+2.22..+5.35）incomplete | +2.88（+1.44..+4.43）incomplete | +2.99（+1.57..+4.53）incomplete | +2.09（+0.78..+3.42）incomplete |

- 血祭：真事件 2,925 次、每點皆有觸發；原案 7 局轉贏、7 局轉輸。改值那一行普通與真版共用，普通對照的血祭勝局也從 395 升到 408，所以**真版相對普通版的增益仍為 0**：這次改值提高了血祭持有者整體（普通 H9 過關），但沒有拉開真版與普通版的差距。
- 非血祭鏈的變動只照實列出，不作因果解讀；可能來源是普通對照局面與檢查點集合改變。

## 協定與證據

- 種子 `10001..20000`，10,000 局，4,883 檢查點（舊 4,886）；20 shard×500 種子；bootstrap 10,000 次、種子 20260923、按 game seed 群集；門檻：區間全落 +3..+10pp、每鏈 ≥300 點。焦點工具、事前契約、配置雜湊與舊批相同；沿用私函表 `scratchpad/destiny-formal-v1/private-draws.json`（sha256 `f0ef8da0…cbee4`）。
- 指令：`node tests/tools/l1-destiny-run.mjs --group destiny --arm ordinary-ai-off --private-draw-table scratchpad/destiny-formal-v1/private-draws.json --out scratchpad/destiny-formal-v2/ordinary-ai-off.json`；20 shard `node tests/tools/l1-destiny-focus.mjs --baseline … --draws … --start $s --end $e --out scratchpad/destiny-focus-v2/formal-switch-$n.json --checkpoints …gzrecords`；彙整 `--shards … --checkpoint-files … --out scratchpad/destiny-focus-v2/formal-switch-summary.json`（sha256 `77bd0ae4fae4193639ae6ed31b2fa1c859140f77f0818c4c5f9f62b2452752e2`，已由主對話親自核對血祭／神王數字）。
- raw 在忽略版控的 `scratchpad/destiny-formal-v2/`、`scratchpad/destiny-focus-v2/`；舊 v1 raw 未覆寫。`arms.json:4` 的 `productBaseline` 仍記 `2eb164d`、無程式讀取，本輪屬「現行產品重新量測」，非原批次重現。
