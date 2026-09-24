# 普通版 blood-L 正式驗收（2026-09-24，跑前凍結）

**候選**：試跑第二輪選出的 `blood-L`，已寫入 `index.html`（本提交）：血祭低命攻擊加成 `life<=15) a+=1` → `life<=25) a+=2`，玩家可見說明同步改為「殘血（≤25）全隊 atk +2」。其他數值不動，版本字串留待發布時統一。

## 跑法

- 用既有 runner，不改其程式、協定或判準：`node tests/tools/l1-destiny-run.mjs --group <ordinaryH1|ordinaryH9> --arm <臂> --n 10000 --out scratchpad/h9-boost-formal/<臂>.json`，種子 `10001..20000`（與 2026-09-23 正式批次同一組）。
- 全部 14 臂：H1 `h1-splitter`、`h1-{water,eyes,twinTiger,bloodOath,godKing,eternalFlame}`；H9 `h9-normal`、`h9-zero-{同六鏈}`。
- 全部臂在同一個 Git HEAD（本提交）與同一份 `index.html` 上跑完，中途不提交；舊 raw 不覆寫。
- 分析：`node tests/tools/l1-destiny-ordinary-analyze.mjs scratchpad/h9-boost-formal scratchpad/h9-boost-formal/summary.json`。

## 判準（原口徑，不改）

- H9：持有者條件勝率差 `+3 ≤ 差 ≤ +10` 且 normal 絕對率 ≤ 85%；千眼固定 `incomplete`。
- H1：`−8 ≤ 差 ≤ +5`。

## 成敗

- **成功**＝血祭 H9 `pass` 且血祭 H1 `pass`。
- 血祭任一 fail → 本次數值修正失敗：停手回報，`index.html` 以 `git revert` 退回原值。
- 其他五鏈的 H1／H9 照實列出與 2026-09-23 基線的差異；若因本改動由 pass 轉 fail，視為新發現回報使用者，不在本輪自行處理。
- 雙虎依使用者裁定列已知診斷基線，不以本輪結果重新裁定。
- 已知副作用：`tests/tools/l1-destiny-h9-activity.mjs`、`l1-destiny-h9-choice-impact.mjs` 以舊字面值 `life<=15) a+=1` 做字串替換，屬 2026-09-23 診斷工具，會與新產品不相容；本輪不改，另行記錄。
