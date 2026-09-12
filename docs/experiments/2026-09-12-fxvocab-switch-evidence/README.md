# v0.55.1 `?fxvocab` 開關卷的證據目錄（2026-09-12）

報告＝`../2026-09-12-fxvocab-switch-report.md`。基準 HEAD＝`417b197`（v0.55），0.54 基準＝`6a839de`。

| 檔 | 是什麼 |
|---|---|
| `gates/sig-t1-{work,base054}.txt` | 驗收 1：開關關（＝預設）的 27 支 tier 1 簽章 ↔ `6a839de` 基準樹，`diff` 無輸出 |
| `gates/sig-t2four-{work,base054}.txt` | 驗收 1：四支示範招 tier 2 ↔ `6a839de`，`diff` 無輸出 |
| `gates/sig-t3-{work,base054}.txt` | 驗收 1：三尊 tier 3 ↔ `6a839de`，`diff` 無輸出 |
| `gates/sig-t1-{on,base055}.txt`、`gates/sig-t2four-{on,base055}.txt` | 驗收 2：`--fxvocab=1` ↔ `417b197` 基準樹，`diff` 無輸出 |
| `gates/*-summary.json`、`gates/*.log` | 上面每一跑的 `traitfx-drive` 摘要與 stdout（逐幀原始資料太大，只留 summary） |
| `gates/duel-drive.txt` | 產品頁面 4 場 × 3 種狀態（預設／`?fxvocab=1`／`?fxtier=0`）零錯 |
| `page-vocab-probe.mjs`／`page-vocab-probe.txt` | **在產品頁面上**量開關（治具頁走的是另一條退路，證明不了產品那條路） |
| `body-md5.mjs`／`body-md5.txt` | 驗收 1 後半：四支 `_v054` 的函式**本體** md5 與 `6a839de` 相同（去掉標頭那一行） |
| `fn-hash-{417b197,6a839de}.txt` | 27 支既有招逐函式 md5 未變動（57 個區塊），只多出 8 個 `_v054` 區塊 |
| `l3-on-metrics.txt` | 驗收 2 的 L3：`--fxvocab=1` 的四支數字，與 b0 修補報告 §2.2 現值欄逐位數相同 |
| `trace-eq-{off,on,mutate,beats}.txt` | 驗收 3：引擎 `trace(1..20)` 對基準逐位元組相等；`--mutate` differs |
| `rule-tests.txt` | 驗收 4：12 套 node 端測試全綠 |
| `killtest-t1-diff.txt` | 驗收 5：把登記點的分派刻意反過來，驗收 1 的 sigdump 立刻差 4 支（8 行） |
| `shots/biteGamble-t1-fxvocab-{off,on}.png` | 驗收 6：手機視口（844×390@2x）實拍，關＝沒有橘色階梯方塊、開＝有 |
| `diff-stat.txt` | 驗收 7：`git diff --stat 417b197..HEAD` |
