# 驗收凍結檔：破軍旗 hp 1→2（2026-09-07，使用者裁定甲）

基準 SHA：ca14065（v0.42）。起因：使用者真機試玩，第一夜持破軍旗（p 2，swarm×1 atk1 hp1）輸給空袋（兜底隊 atk1 hp3）並 −8。
診斷（scratchpad diag-empty.md，收進 docs/experiments/2026-09-07-balance-evidence/）：27 件單件對空袋 n=2000，只有破軍旗 24%，其餘 100%；角色表與共鳴開關無關。
修法：POOL 破軍旗 unit.hp 1→2（凍結「不得改體型，僅可補數值」——hp 屬數值）。其他 26 件、兜底隊、PW 公式一律不動。

## 驗收條件（動手前訂）
- P1 鑑別力：修前 index.html 跑「單件對空袋 n=2000」破軍旗 <50%（已有：24%）；修後 27 件全部 ≥50%，且其餘 26 件數字不變（100%）。
- P2 範圍：git diff ca14065.. 只動 index.html 的破軍旗那一行的 hp 與 VERSION 行，加文件；trace(1..20) 與 ca14065 必不相等（改的是真實路徑）。
- P3 既有 5 套 tests/*.test.mjs 綠。
- P4 共鳴閘門重跑（GUIDE §11.19 第 6 條：動 unit hp 要重跑）：R2′（M1）與 R4 仍綠；R3（M1）六策略仍各 ≤40%（n=10000）。R0 對 31504b0 因 POOL 已變不適用，改記「MODE 0 與 ca14065 的 MODE 0 必不等」。
- P5 VERSION 0.42.1、GAME_DESIGN changelog 一行、線上 curl 驗版本。
什麼實作會讓它變紅：P1—hp 改了但兜底隊也被動到（26 件數字變）；P4—hp+1 讓某策略衝過 40%。

## 結果（2026-09-07 實跑；證據 2026-09-07-balance-evidence/）
- P1 ✅ 破軍旗 24% → 59%（740/510/750，平手 750）；其餘 26 件數字不變（25 件 100%、山豬牙飾 83%）。
- P2 ✅ diff 只有 index.html 破軍旗行 hp 與 VERSION 行＋文件；trace(1..20) 與 ca14065 不相等。
- P3 ✅ 5 套 8/5/16/28/36 綠。
- P4 ✅ R2′（M1）+8.05pp、100% 配對 121≤136；R4 ✅；R3 六策略 splitter 20.49／greedy 19.24／hoarder 9.58／specialist 26.95 皆 ≤40%。
- P5 VERSION 0.42.1，線上 curl 見 commit 訊息。
