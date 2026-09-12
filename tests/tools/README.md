# tests/tools — 平衡量測與等價比對腳本（2026-09-02 自 session scratchpad 收進 repo）

- `load.mjs`：在 Node 載入 `index.html` 的 `<script>`，回傳 `window.__yaoshi`（GUIDE §6.4）。
- `a1.mjs`：等價比對。先 `git show <改前commit>:index.html > old.html`（放在 cwd），再在本目錄 `node a1.mjs`；雙向（開關關閉相等／開啟不等）。
- `balance.mjs [n]`：三策略（splitter/greedy/hoarder）ON/OFF 勝率位移。**閘門判定一律 n≥10000**（GUIDE §7）。
- `a5-fixture.mjs [n]`：收祟夜「棄權／毒標／原樣」治具對照（ARCH_SPEC 待辦 15 的實驗）。
- `a1-wish16.mjs`：心願第二批的等價比對（`WISH_ON=false` 相等／`true` 不等／執行期只留原 8 張相等）。先 `git show 365230a:index.html > old.html`。
- `wish16-balance.mjs [n]`：24 張逐張達成率、座位 0（aiLike）條件勝率、三策略位移（8 張 vs 24 張）。
- `wish16-ablate.mjs [n]`／`wish16-dilute.mjs [n]`：位移歸因實驗（逐張消融、拆 hooks、拆獎勵、稀釋對照）。結論見 `docs/experiments/2026-09-02-wish16-balance.md`。


## `dmg-readability.mjs`（L10「既有可讀性不退」的量測治具）

```
node tests/tools/dmg-readability.mjs pix  <outdir> [--seed=1] [--duels=8] [--port=9001]
                                                   [--maxfloat=50] [--maxhit=20] [--root=<靜態根目錄>]
                                                   [--wallclock=1] [--batch=36]
node tests/tools/dmg-readability.mjs dom  <out.json> [--seed=1] [--duels=10] [--port=9002]
node tests/tools/dmg-readability.mjs judge <outdir...>      # 離線重判已存的 pix.json，不開瀏覽器
```

- `pix`＝R1（跳字字級／分色／對比度）、R2（被打的尊閃紅，剪影遮罩內的紅偏量）、R5 像素版。
- `dom`＝R3／R4／R5 與 `ys:fx-hit` 對演出交鋒的逐筆對位。
- **L10 的標準跑法**（與凍結檔 `docs/experiments/2026-09-11-acceptance-fx-legibility.md` 對應）：
  ```
  node tests/tools/dmg-readability.mjs pix <outdir> --seed=<1|3> --duels=8 --port=<埠> --maxfloat=50 --maxhit=20
  ```
  `duels`／`maxfloat`／`maxhit`／門檻數字**凍結**，要動照 `02 §2.1` 走同意程序。

**時鐘（2026-09-12 L10 決定性小卷）**

| 模式 | 怎麼跑 | 取樣決定性 |
|---|---|---|
| `pump`（**預設**） | 整場由治具逐幀 pump 的虛擬時鐘驅動（`--batch` 個 tick 一批，`tickMs=1000/60`） | ★是★：同 seed 連跑 5 次 `metrics.txt` 逐位元組相同 |
| `wallclock`（`--wallclock=1`） | 舊法：只在凍幀那一瞬停時鐘，兩次凍結之間走真實時間 | 否（留著當鑑別力對照，見 `docs/experiments/2026-09-12-l10-determinism-report.md`） |

- 每次跑都會寫兩個檔：`<outdir>/pix.json`（逐樣本明細＋截圖索引）與 `<outdir>/metrics.txt`
  （判定＋全部統計量，一行一項、排序固定）。**驗決定性就 `md5sum <outdir>/metrics.txt`**。
- `metrics.txt` 裡有兩欄是**健康檢查**，看數字前先看它們：
  - `swallowed=`：虛擬時鐘接管 rAF／計時器之後，回呼裡被 try/catch 吞掉的例外數。
    虛擬化之後這些例外**不會**變成 `pageerror`，所以 `errors=0` 不等於「遊戲跑正常」。**應為 0。**
  - `acct.ok=`：`flashRuns == maskN + burnMaskN + Σ maskDropped` 的帳目恆等式。
    拿不到剪影的那幾輪在 `judgePix` 裡是靜默 `continue`、不進 `maskDropped`，
    整批壞掉時會出現「`maskN=0` 但 `errors=0`、md5 照樣逐跑相同」的假綠。**應為 `true`。**
- **這支治具不能拿來驗連點守衛／相位閘**（`index.html:2262 armMainBtnGuard`、`:2331` 的相位閘）：
  pump 模式把 `Event.prototype.timeStamp` 換成了虛擬時鐘，那正是這兩道守衛在比的東西，量了會假綠。
- `pump` 模式開跑前會等 `__yaoshi3d` 上線＋網路靜止（這段期間虛擬時間停在 0）；
  等不到會在 `errors` 裡留一行，不會靜默放行。
- `--batch` 預設 36（≈600ms 虛擬時間）**不得調到 500ms 以下**：index.html 的 `MAIN_GUARD_MS` 是 500，
  小於它的話每一下點擊都會被連點守衛吞掉。

腳本裡的 `index.html` 路徑是絕對路徑（`C:/Users/shung/OneDrive/桌面/妖市/index.html`），搬 repo 要改。
實驗報告與驗收凍結檔在 `docs/experiments/`。
