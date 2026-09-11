# 批 0 覆審 r1 修補的證據目錄（2026-09-12）

報告＝`../2026-09-12-fx-legibility-b0-fix-report.md`。

- `l3/`　L3 對比閘門的七組跑次：
  - `l3-old-current`／`l3-old-canary`　**舊**量測位置（720×405、bloom 0.5）＝與批 0 報告 B0-7 逐位數比對用
  - `l3-new-current`／`l3-new-size044`／`l3-new-canary`／`l3-final`　**新**量測位置（844×390@2x、bloom 0.7、seed 7）
  - `l3-bthr09`／`l3-bthr03`　證明 `bloomCfg()` 讀 live、且覆寫真的進到 shader
  - 每個目錄有 `shots.json`（含 `seed`／`productBloom`／`programs`／`matPrograms`）與 `metrics.txt`
- `l10/`　`dmg-readability` 15 次實跑（本批 × 基準 `6a839de`）的摘要與判讀，見該目錄 `README.md`
- `gates/`　`traitfx-drive` 三個 tier ＋ `--count=2` 的摘要、三份 `sigdump`、`duel-drive` 輸出
- `emblem-collision.txt`／`emblem-sim.json`／`emblem-sim-all.txt`　剪影互撞的 435 對全表與測試輸出
