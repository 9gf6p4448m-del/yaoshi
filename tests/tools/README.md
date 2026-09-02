# tests/tools — 平衡量測與等價比對腳本（2026-09-02 自 session scratchpad 收進 repo）

- `load.mjs`：在 Node 載入 `index.html` 的 `<script>`，回傳 `window.__yaoshi`（GUIDE §6.4）。
- `a1.mjs`：等價比對。先 `git show <改前commit>:index.html > old.html`（放在 cwd），再在本目錄 `node a1.mjs`；雙向（開關關閉相等／開啟不等）。
- `balance.mjs [n]`：三策略（splitter/greedy/hoarder）ON/OFF 勝率位移。**閘門判定一律 n≥10000**（GUIDE §7）。
- `a5-fixture.mjs [n]`：收祟夜「棄權／毒標／原樣」治具對照（ARCH_SPEC 待辦 15 的實驗）。
- `a1-wish16.mjs`：心願第二批的等價比對（`WISH_ON=false` 相等／`true` 不等／執行期只留原 8 張相等）。先 `git show 365230a:index.html > old.html`。
- `wish16-balance.mjs [n]`：24 張逐張達成率、座位 0（aiLike）條件勝率、三策略位移（8 張 vs 24 張）。
- `wish16-ablate.mjs [n]`／`wish16-dilute.mjs [n]`：位移歸因實驗（逐張消融、拆 hooks、拆獎勵、稀釋對照）。結論見 `docs/experiments/2026-09-02-wish16-balance.md`。

腳本裡的 `index.html` 路徑是絕對路徑（`C:/Users/shung/OneDrive/桌面/妖市/index.html`），搬 repo 要改。
實驗報告與驗收凍結檔在 `docs/experiments/`。
