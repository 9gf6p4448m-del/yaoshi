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

## 徽記尺寸的防線與 L3 canary（v0.55 招式可辨性卷，覆審 r3 N11／N12）

危險的**效果**＝「徽記的實際世界尺寸出現第二份來源」。防線有三道，**前兩道是收斂，第三道才是掃描**：

1. **入口拒收**（`js/trait-fx.js` 的 `iconSizeSrc`）：`st.icon()`／`st.icons()`／`st.mark()` 傳 `o.size` 就 throw。
2. **執行期鎖**（`js/trait-fx.js` 的 `lockIconScale`）：徽記 mesh（含 ink 底板／描邊子節點、`st.icons` 的
   InstancedMesh 與它的 `userData.fxIcons.size`）的 `scale` 被換成 accessor，外部任何寫入當場 throw
   並記進 `stats.sizeViolations`。three.js 所有 Vector3 變動方法最後都是對 `x`／`y`／`z` 賦值，
   所以別名、`multiplyScalar`、`scale.x=`、子節點與索引取用**同一個扼口全收**。
   編舞唯一的合法縮放介面是 **`st.iconScale(mesh, 相對倍率)`**（＝ ICON 表給的基準 × 倍率）。
3. **原始碼掃描**（`tests/fxvocab.test.mjs`）：編舞不得出現 `size:` 這個鍵、不得直接碰徽記 mesh 的
   `.scale`（任何成員鏈／別名／索引）、不得把徽記餵給 `st.grow()`。
   `--mutate=4..10` 是七條繞法各自的回歸案例（原檔全程唯讀，不做反向 sed）：
   4＝`const S` ＋ `setScalar(S*…)`／5＝`{size:…}`／6＝`setScalar(0.56*…)`／7＝別名／
   8＝`multiplyScalar`／9＝`scale.x=`／10＝子節點與索引取用。

**執行期斷言**：`traitfx-drive.mjs` 與 `fx-contrast.mjs` 每一套都讀回 `__tfx.stats()`，
`sizeViolations > 0` 或 `iconLocked !== iconMade` 一律判紅（後者是活性：鎖沒掛上去時 locked 會小於 made）。
整跑 `iconMade === 0` 會印「未量到」——那一跑不得當成這條斷言通過。

### L3 canary（尺寸的單一來源突變 → 用到徽記的招必須全紅）

```bash
# 1) 把三張尺寸表的共同出口換掉（一行、一個檔）：
#    js/trait-fx/vocab.js 的 `_resolve(kind, tableName, dflt) { … }` → `_resolve() { return 0.02; }`
# 2) 跑同一組參數
node tests/tools/fx-contrast.mjs <outdir> --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost
python tests/tools/fx-contrast-metrics.py <outdir>      # 預期 pass 0、四支全 ok:false
# 3) 用改壞前的備份副本還原 vocab.js（不做反向編輯），再跑一次確認回到現值
```

★**canary 一定要打 `_resolve`，不要打 `sizeOf()`**★（覆審 r3 N12）：`markSizeOf`（印記）與有覆寫的
`flatSizeOf`（貼桌陣）都**不經過** `sizeOf`，打 `sizeOf()` 對 `ICON.markByKind`（`seal` 0.20）與
`ICON.flatByKind`（`hat` 0.20）完全打不到——主視覺是印記或貼桌陣的招在那種 canary 下照樣綠。
`_resolve` 是三張表的共同出口，一行蓋三表；`tests/fxvocab.test.mjs` 有一條測試在釘「三者都要跟著變」。
