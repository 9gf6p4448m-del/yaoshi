# 2026-09-12 L10 取樣決定性小卷 — 證據

報告本文：`docs/experiments/2026-09-12-l10-determinism-report.md`
worktree：`.claude/worktrees/agent-af605d875c0e0e52d`（基準 `417b197`）

| 目錄 | 內容 | 怎麼讀 |
|---|---|---|
| `pump/` | **新法**（逐幀 pump 的虛擬時鐘，現行預設）seed 1／3 各 5 跑的 `metrics.txt` | 同 seed 的 5 份 md5 **全等** ⇒ 取樣決定性（驗收 1） |
| `orig/orig-s1-*` | **舊法**（改前的原始治具檔案副本）seed 1 的 5 跑 | md5 **全不同**，`R2` 在 2🟢／3🔴 之間翻（驗收 3 甲） |
| `orig/orig-s3-*` | 同上，seed 3 的 5 跑 | md5 全不同，但 `maskN=0` 穩定 ⇒ seed 3 的 0 樣本**舊法就有**，不是本卷造成的 |
| `orig/wallclock-flag-*` | 現行治具加 `--wallclock=1`（seed 1 duels=2） | 證明同一顆二進位切得回舊時鐘（`clock=wallclock`） |
| `canary/` | 產品端突變（跳字 hit 字級 ×0.5）那一跑的判定與還原紀錄 | R1 轉紅、紅在行為斷言、用備份副本還原（驗收 3 乙） |
| `probe/boot-race.txt` | 「3D 層在第幾個 tick 上線」的單獨探針 | 修掉前兩跑截圖 57.36% 像素不同；修掉後逐位元組相同 |
| `md5.txt` | 上面所有 `metrics.txt` 的 md5 | — |

`metrics.txt` 由 `tests/tools/dmg-readability.mjs` 每跑自動產生：
判定（`res.*`）＋全部統計量（`sum.*`）＋樣本數與活性，一行一項、排序固定。

逐跑的 `pix.json` 與 `frames/*.png` 留在 `scratchpad/l10/`（在 `.gitignore` 內，不版控）。
