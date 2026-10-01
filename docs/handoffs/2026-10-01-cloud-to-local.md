# 妖市：雲端 → 本機 接手包（2026-10-01）

## 現況（main `f8bcd0cb`，Pages 建置成功 run 36772831992）
- 公開版本 **v0.59.3**＝使用者另一個「信物活起來」session 的成果（`ee3e0316` 十席信物出價整件小動作、`a6f77737`＋`43a132d2` 席位寫實手＋後景人影提案藍圖，已記入 D1/D3/D5/D7 裁定：每隻手 2,500 三角形、先做收驚婆／當鋪／獵人三角色、斷手書生缺整隻手、信物小動作合併上線；提案見 `docs/proposals/2026-09-30-seat-hands-silhouettes.md` §8.1，**尚未實作手與人影**）。雲端這邊只合併、讀過提交與提案、未驗證其行為；＋雲端 session 的 v0.59.2 鑑賞頁／面板 Y 已簽收＋三項試玩熱修（見下）。
- 雲端沙箱連不到 github.io，**公開網址的 HTML／資產版本我沒逐項核對**，只看到 GitHub Pages workflow 成功。本機請 `curl` 核對 `RELEASE_VERSION="0.59.3"`、`assets/theme.css?v=0.59.3`，並在手機無痕開一局。

## 這個 session 做了什麼
1. **v0.59.2**：法寶鑑賞頁（燒符＋照妖鏡＋卷軸題字）與成交／戰況面板 Y；#11(i) 使用者試玩簽收。卷報告 `docs/experiments/2026-09-28-appraise-c/README.md`（第四批 Linux、發布與簽收、試玩熱修三段）。
2. **#8 兩格回退歸因**：不是產品回退。夜行錄局正式量測不固定種子（兩版走到不同事件）＋夜戰對比量測時刻不同幀。固定種子後共同 235 格 203→203、worse 0；夜戰停拍 base＝head。**依凍結 #8(b) 字面，正式量法仍判不過**；凍結檔已記「改量法」修訂（使用者同意），但尚未用新量法跑出正式通過數字。
3. **試玩熱修（已上線）**：
   - 押寶夜勾選回來（0.59.2 新回退：展開卡被鑑賞頁取代後勾選入口消失）。窄籤尾端有勾選框（點框＝勾、點名字＝鑑賞），鑑賞卷軸有「押這一件」鈕。`tabPickHTML`／`ascPickHTML`。
   - 對白氣泡被擋：`#table .seat{position:relative;z-index:19}`。基準 86e4676 也被擋（舊問題）。
   - 燒香框壓放血鈕：`.incbar` 可縮＋文字省略號。基準同樣（舊問題）。

## 未完成／待辦
1. **缺提交 `3a0d971`**：`tests/nightwalk.test.mjs` 的 #1、#6 要 `git show 3a0d971:index.html`，雲端複本沒有此提交 → 本機請補跑 `node --test tests/nightwalk.test.mjs`。
2. **全套測試最終數字**：雲端 2026-10-01 補跑 402 項，398 過、4 失敗（`l1-destiny-focus` LF 假紅、nightwalk #1／#6 缺 `3a0d971`、`sfx-wiring` 子程序卡住 37 分鐘後被手動終止）。4 項皆為已知，無新回退；本機請在 CRLF、有 `3a0d971`、瀏覽器環境正確下重跑確認。（原記：容器重啟中斷。）已跑到的部分只有已知失敗：`l1-destiny-focus`（LF 工作樹假紅，需 CRLF 取出）、nightwalk 兩項（缺提交）。`sfx-wiring` 在缺瀏覽器環境時會假紅，環境正確時過。
3. **補跑量測**（押寶夜窄籤多了一個框）：鑑賞主矩陣 `appraise-c-probe`、切換 `appraise-switch`、`text-fit-probe`（建議 `--nw-seed 3` 兩版同一局）。
4. **#8(b) 新量法正式數字**：`text-fit-probe --nw-seed 3` base／head 全模式＋`appraise-common-cells`；夜戰對比用 `appraise-duel-freeze.mjs`。
5. **待使用者裁定**：押寶夜面板（`.stakebar`，在 #stage 桌心）在窄畫面（V4 667×375）被擠成又高又窄的一條、壓住桌心——**基準也如此**，非本版回退。方案：縮成單行／移到桌面下緣／可收合。
6. **待使用者回覆**：使用者說「押寶夜擋在中間也沒辦法看鑑賞」；雲端點窄籤名字能正常進鑑賞，未重現。請問是點窄籤還是想點桌上 3D 法寶（後者原本就不是入口）。
7. 手機實機 fps 沒量（本機無頭 Chromium 數字）。使用者說晚點再玩一局實機，有回饋再記。

## 雲端環境與工具（換機可略；本機有原環境）
- `docs/experiments/2026-09-28-appraise-c/run-d-linux.sh`：Linux 版全量 runner（本機 Windows 仍用 `run-d.sh`）。
- 新工具：`tests/tools/appraise-duel-freeze.mjs`（夜戰停拍）、`bubble-cover-probe.mjs`（對白氣泡像素可見度）、`south-overlap-probe.mjs`（底列重疊）、`text-fit-probe.mjs --nw-seed`（opt-in）。簽收圖工具加了 Linux CJK 字型退路。
- 雲端用 `tools/cloud-env/`（未追蹤）：別名 Chromium、three 0.158 本地供應、Google 字型快取。**不要把它帶回本機**，本機照舊用 `tools/anyCreature/`。
- 診斷教訓：`elementFromPoint` 點不到 `pointer-events:none` 的層（氣泡自己、#felt 一部分），做「被蓋住」判定請用像素法。

## 接手前先做
1. `git fetch origin && git log --oneline -8 origin/main`，確認本機 main 與遠端同步（雲端這邊是用合併不是 rebase，沒有改寫歷史）。
2. 讀本檔 → `docs/experiments/2026-09-28-appraise-c/README.md` 最後三段 → `docs/experiments/2026-09-28-acceptance-appraise-panels.md` 文末修訂。
3. 雲端分支 `cloud/v0592-head8` 的內容已全部在 main，可刪；PR #2 可關。

喚醒指令：`接手妖市 v0.59.3；先讀 docs/handoffs/2026-10-01-cloud-to-local.md，補跑未完成量測並回報押寶面板與「鑑賞」兩題給使用者。`
