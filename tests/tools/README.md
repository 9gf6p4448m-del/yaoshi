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

**取樣時點：推鏡停穩之後才凍幀（2026-09-12 Q1，凍結檔 §2.1 修訂六 ②）**

R2 的刺激（合成 `ys:fx-hit`）**不再釘在 `ys:hitstop`**。舊法那條路的理由是「hitstop 期間
renderer 的 dt 歸零、鏡頭完全不動」——**實測是錯的**：`js/renderer.js:197` 只把 dt 歸零，
但 `js/camera-director.js:367`／`:397` 的 focus／cinema 包絡吃的是**絕對時間**，
而 `index.html:4313 HITSTOP_DMG` 與 `:4336 FOCUS_DMG` 是同一個門檻（都是 3）
⇒ **會停格的那一下必定同時推鏡**，量到的差分裡永遠混著鏡頭位移。

現行做法：每幀盯住**一對**尊（這一刻畫面上最大的那一尊＋對面那一欄最大的一尊），
連續 `--boxstill` 幀、兩尊的螢幕方框逐幀位移都 ≤ `--boxeps` px，才開凍幀序列。

| 參數 | 預設 | 意思 |
|---|---|---|
| `--boxstill` | 6 | 要連續停穩幾幀（≈100ms） |
| `--boxeps` | 1 | 每幀方框位移上限（px）。`MOVE_MAX` 是 40ms 內 4px，40ms ≈ 2.4 幀 ⇒ 每幀 1px 留有餘裕 |
| `--candmax` | 120 | 同一個候選盯最多幾幀（2 秒）還不穩就換一個 |
| `--warmup` | 0 | 對決開場多久之內不量（ms）。舊法是 1600，那是「進場整個畫面都在變」的**代理**；現在由停穩量測直接處理，淡入淡出另有 `#duel` opacity 的硬閘 |

**這些不是判準門檻**——7 個門檻常數（`MASK_TH`／`MOVE_MAX`／`BASE_FONT`／`FONT_MIN`／
`BACK_MAX`／`BURN_MAX`／`CTRL_MAX`）、主門檻（中位 ≥25、≥25 比例 ≥0.70）、`seed` 集與 `duels`
數一格未動；位移閘門（`MOVE_MAX`）也留著，它現在是**第二道**防線而不是唯一一道。
刺激的**速率**也沒變：`tryFire` 的冷卻沿用舊計時器那條路的 220ms。
改法與改前改後的數字見 `docs/experiments/2026-09-12-l10-determinism-report.md` §9。

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
  - `acct.ok=`：`flashRuns == maskN + burnMaskN + Σ maskDropped + noSil` 的帳目恆等式。
    拿不到剪影的那幾輪在 `judgePix` 裡是靜默 `continue`、不進 `maskDropped`，
    整批壞掉時會出現「`maskN=0` 但 `errors=0`、md5 照樣逐跑相同」的假綠。**應為 `true`。**
  - `acct.noSil=`：上面那個「靜默掉出統計」的筆數（凍幀當下方框已是 `null`／拿不到剪影）。
    **不是 0 就要看一眼**——它不影響判定，但每一筆都是一個沒量到的樣本。
    治具只負責把它算出來；`judgePix` 那一側的修法列在凍結檔 §2.1 修訂六 ⑤ 的待辦。
- **這支治具不能拿來驗連點守衛／相位閘**（`index.html:2262 armMainBtnGuard`、`:2331` 的相位閘）：
  pump 模式把 `Event.prototype.timeStamp` 換成了虛擬時鐘，那正是這兩道守衛在比的東西，量了會假綠。
- `pump` 模式開跑前會等 `__yaoshi3d` 上線＋網路靜止（這段期間虛擬時間停在 0）；
  等不到會在 `errors` 裡留一行，不會靜默放行。
- `--batch` 預設 36（≈600ms 虛擬時間）**不得調到 500ms 以下**：index.html 的 `MAIN_GUARD_MS` 是 500，
  小於它的話每一下點擊都會被連點守衛吞掉。

腳本裡的 `index.html` 路徑是絕對路徑（`C:/Users/shung/OneDrive/桌面/妖市/index.html`），搬 repo 要改。
實驗報告與驗收凍結檔在 `docs/experiments/`。

## 徽記世界尺寸的防線與 L3 canary（v0.55 招式可辨性卷，覆審 r3 N11／N12 → r4 修補批）

危險的**效果**＝「徽記在**世界空間**的實際尺寸，來自 ICON 表以外的第二份來源」。
★r3 那一版只鎖了 `Object3D.scale`，卻宣稱「涵蓋 100%」；覆審 r4 實測四條繞法（父層 Group 縮放／
置換 `geometry`／自寫 `matrix`／`Object.defineProperty` 蓋掉 accessor）三道防線全綠，
其中一條讓 L3 canary 跑出 `ok:true`＝恆綠儀式復現。★ 現在的防線是：

1. **入口拒收**（`js/trait-fx.js` 的 `iconSizeSrc`）：`st.icon()`／`st.icons()`／`st.mark()` 傳 `o.size` 就 throw。
2. **執行期鎖**（`lockIconScale`）：徽記（本體、ink 底板與描邊子節點、`st.icons` 的 InstancedMesh）
   凡是會改變世界尺寸的屬性一律鎖成 accessor／不可再定義（**`configurable: false`**）：
   `scale` 這個屬性本身與它的 `x`／`y`／`z`、`geometry`、`matrixAutoUpdate`、`matrixWorldAutoUpdate`、
   `userData.fxIconBase`／`fxIconKind`、`userData.fxIcons.size`。寫了就記帳＋throw。
   編舞唯一的合法縮放介面是 **`st.iconScale(mesh, 相對倍率)`**（＝ ICON 表基準 × 倍率，
   倍率必須落在 `ICON.scaleRange`——否則 `st.iconScale(m, 0.02 / base)` 就是絕對尺寸的後門）。
3. **世界尺寸稽核**（`auditOne`／`auditAtDraw`，**按效果寫的那一道**）：取世界縮放
   （`matrixWorld.decompose()`），和「積木自己最後一次合法寫進去的值（祖先鏈連乘）」比對，
   另查 `geometry` 的**身分與內容指紋**、祖先規則、InstancedMesh 逐實例矩陣與 `o.sizes` 區間。
   ★**量測位置有兩個，缺一不可**（覆審 r2 H1 的教訓）★：
   (i) `traitFx.update` 的最後（frame 內）、(ii) 每一片徽記自己的 **`onAfterRender`**。
   three 的 renderObject 順序是 `onBeforeRender → modelViewMatrix ← matrixWorld → draw → onAfterRender`，
   所以只有 (ii) 量得到「**真正送進 GPU 的那一顆矩陣**」。只做 (i) 時，在 `onBeforeRender` 裡改
   `matrixWorld` 可以讓四道防線全綠而 L3 canary `ok:true`（實測 `area 0.8522` vs 健康 `0.8531`）。
   ★判定為什麼不用 `Box3.setFromObject` 的跨距★：徽記是逐幀朝鏡頭的 billboard，旋轉中物件的
   世界 AABB 跨距隨朝向變（同尺寸能差 √2 倍），要用它判就得鬆到能放行 0.93 倍的繞法。
   判定用旋轉無關的「世界縮放 × geometry 單位寬」，`Box3` 的對角線只當診斷欄抽樣記錄。
   ★**場景掃描**★（覆審 r2 M1）：稽核本身只看登記表，所以另外每 6 次稽核 `scene.traverse` 一遍，
   凡是 geometry 屬於徽記剪影、卻不在登記表上的 mesh 一律判紅（手造第二顆徽記那條路）。
4. **原始碼掃描**（`tests/fxvocab.test.mjs`，第四道）：編舞不得出現 `size:` 這個鍵、不得碰徽記的
   `scale`／`geometry`／`matrix`／`matrixWorld`／`matrixAutoUpdate`／`matrixWorldAutoUpdate`／
   **`onBeforeRender`／`onAfterRender`**／`parent`／`children`／`traverse`
   （任何成員鏈、別名、索引都算）、不得 `st.grow(徽記)` 或 `.add(徽記)`、
   不得直接碰 `ICON.`（含 import vocab.js）、**不得把 ICON 的來源放到除號右邊**
   （`0.50 / st.iconFlatSize` 就是把 ICON 從乘積裡消掉＝絕對尺寸，覆審 r2 H2）。
   `--mutate=4..20` 是**十七條**繞法各自的回歸案例（原檔全程唯讀，不做反向 sed）：
   4＝`const S` ＋ `setScalar(S*…)`／5＝`{size:…}`／6＝`setScalar(0.56*…)`／7＝別名／
   8＝`multiplyScalar`／9＝`scale.x=`／10＝子節點與索引取用／
   11＝父層 Group 縮放／12＝置換 geometry／13＝自寫 matrix／14＝`defineProperty` 蓋掉 accessor／
   **15＝`onBeforeRender` 改 matrixWorld／16＝`o.sizes` 把 ICON 除掉／17＝手造第二顆徽記／
   18＝就地改共用剪影／19＝掛到另一顆徽記底下／20＝執行期改 ICON 表**。
   ★掃描擋得到的是「直接寫」的那一形；15／17／18／19 用 helper 包一層就避得開名字追蹤
   ——那幾條靠的是第 2、3 道（鎖與世界尺寸稽核）。**這是掃描的結構限制，不是待修的 bug。**

### ★已知未涵蓋（照實列，別當它是 100%）★

- 稽核只驗**世界縮放**與 **geometry 的內容指紋**：不驗材質、不驗位置、不驗畫面上真的長怎樣
  （那是 L3 與盲讀的事）。
- 稽核與掃描都只管**徽記**（`st.icon`／`st.icons`／`st.mark` 三條路，加上場景掃描抓同剪影的手造 mesh）。
  紙紮道具之後要接進來，就在自己的工廠裡呼叫 `lockIconScale(run, obj, base, kind, geom, host)`。
- 掃描按名字追蹤，helper 包一層就避得開（見上）。
- `traitfx-drive` 的治具頁逐幀 `step()` 但**不逐幀 `render()`**，所以量測位置 (ii) 在那支治具上
  **一次都不會觸發**（覆審 r3 N-2 實測 0 格；之前寫「少數幾格」是錯的）。
  三支治具現在都把稽核次數依量測位置分開印成 `u<update>+d<draw>`，
  `traitfx-drive` 在 `made>0 且 draw===0` 時另印一行「★draw 量測位置本跑未觸發★」。
  **(ii) 的主場是 `fx-contrast` 與 `duel-drive`（真實 renderer 迴圈）。**
- **`st.paperStamp`／`st.paperProps`（紙紮道具）不在尺寸鎖裡**：尺寸鎖只接 `st.icon`／`st.icons`／`st.mark`
  三條路。它們自己建的 mesh（`paperStamp` 的三片、`paperProps` 的 InstancedMesh）在場景掃描的
  放行名單（`BLOCK_MADE`）裡，不會被誤判成手造徽記。
  **2026-09-13 招式演出卷批 1 的現況**：`biteGamble` 正式版用這兩支演出，所以它的大印／印文／金箔
  **走的是 `.scale.setScalar(st.iconSize * …)` 而不是 `st.iconScale`**（後者只吃 SIZED 的物件，
  餵紙紮道具會 throw）。於是 `tests/fxvocab.test.mjs` 的原始碼掃描也**維持只認那三支入口**
  ——把 `paperStamp`／`paperProps` 加進 `emblemNames()` 會讓這些合法寫法整批判紅，
  而它們沒有合法的替代寫法可走。**這一條是有意識留著的缺口，不是漏掉**：
  單件尺寸仍收斂在 `ICON.sizeOf`／`markSizeOf` 一處（兩支積木都呼叫 `iconSizeSrc` 拒收 `o.size`），
  但「編舞乘上任意倍率」這一層目前沒有機械防線。要補的方向同 N-5：在積木的工廠裡呼叫
  `lockIconScale(...)` 把它們接進鎖與稽核，那要先讓 `st.iconScale` 支援 Group 與 InstancedMesh。
- 場景掃描按 **geometry 內容指紋**認徽記（覆審 r3 N-1：改前用 uuid，`geometry.clone()` 整組穿過去）。
  它抓得到「多了一顆假徽記」，但**像素閘門抓不到**——一顆用合法尺寸渲染的假徽記，
  `fx-contrast-metrics.py` 的 `area_pct` 分不出它是誰造的。紅在 `fx-contrast` 自己的 exit code。
- ★**N-5（HIGH，覆審 r4，未修）：場景掃描只認「一位元組不差的複製品」**★
  `geomSig()` 是**零容差**的（頂點數＋座標校驗和）。實測三個變體**四道防線＋L3 像素閘門全綠**：
  ① `geometry.clone()` ＋ `geometry.scale(1.0001, 1.0001, 1)`
  ② `clone()` ＋ 只把 `position.array[0]` 加 `1e-4`
  ③ 整支招**完全不呼叫** `st.icon`／`st.icons`／`st.mark`、手抄頂點自建同剪影
  ——畫面上是一顆世界縮放 **1.6** 的假徽記（`ICON.byKind.knife` 是 0.56，三張表裡沒有這個數），
  L3 差圖面積 **3.5466%**（健康態 0.9728%），而 `traitfx-drive`／`fx-contrast`／`duel-drive`
  與 `metrics` 全部 exit 0。③ 另有一個結構成因：`js/trait-fx.js` 的
  **`if (run.sized.length) auditSizes(run)`** 讓「這一支招沒登記任何徽記」時**連掃描都不跑**。
  ★這不是本卷打開的洞★（改前用 uuid 認身分，三個變體一樣全綠），但**它是 HIGH 等級的繞法**，
  在這裡照實列出來，不得再宣稱「按效果寫的那一道會接住新的繞法」。
  往下走的方向（招式演出卷把防線擴到 `st.paperStamp`／紙紮道具時一併處理）：
  **首選收斂**——`st.spawn` 是編舞唯一的進場口，在那裡擋「geometry 不是積木造的、卻長得像徽記」的 mesh，
  分母歸一；退而求其次才是把指紋改成容差比對（頂點數＋面積／外框近似）並拿掉 `run.sized.length` 這個前置條件。
- ★**N-6（MEDIUM，覆審 r4，未修）：`duel-drive --seed=7` 只量得到 `hat` 一個 kind**★
  實測 seed 7／12 場的 `世界寬度` 只有 `hat`／`hat:part`／`hat:instanced`。
  把繞法放進 `eliteSelfCut` 時 `traitfx-drive` 與 `fx-contrast` 都 exit 1，而 **`duel-drive --seed=7` exit 0**；
  同一條繞法搬進 `hauntLost` 才 exit 1。⇒ **正式 L3 對四支示範招裡的其他三支零鑑別力**。
  下一卷要嘛多跑幾顆 seed 直到覆蓋到的 kind 集合等於推導出的名單，要嘛讓 `duel-drive` 印出
  「本跑量到哪些 kind／哪幾支沒量到」——**別讓 exit 0 看起來像全覆蓋**。
- ★**N-7（LOW，覆審 r4，未修）：`emblemCasesFromSource()` 的活性下限只釘得住批 0 那四支**★
  `MUST` 寫死四支、檔案清單寫死三個系別檔。批 1–3 之後若解析只漏掉**新加的**招
  （縮排不同、或新開第四個系別檔），四支仍在 ⇒ 下限通過、新招靜默 `n/a`＝同一個病換形狀。
  **批 1–3 每次鋪開就要把新招加進 `MUST`**（或改成「推導出的支數 ≥ 上次落檔的支數」）。

**執行期斷言（三支治具都讀）**：`traitfx-drive.mjs`、`fx-contrast.mjs` 讀 `__tfx.stats()`，
`duel-drive.mjs` 讀 `window.__yaoshi3d.traitFx.sizeGuard()`（**批 1–3 的正式 L3 走的是 duel-drive**）。
判定是**三態**——`n/a`（這一套沒產出徽記，不計進總判定）／`ok`／`fail`：
`violations > 0`、`iconLocked !== iconMade`、`sizeAudits === 0`、`tweenErrors > 0` 任一成立就是 `fail`。
★`made === 0` 一律不得當成通過★（r4 MEDIUM-2：那是空真）；`traitfx-drive` 另有 `EMBLEM_CASES` 名單，
用到徽記語彙的招掉到 `n/a` 就判紅——**批 1–3 每把一支招換成新語彙就要把 trId 加進那份名單**。
★v0.55.1 之後那份名單**只在 `--fxvocab=1` 下成立**★：預設（`PW_FX.VOCAB_ON=false`）四支示範招跑的是
0.54 本體（`V054`／`V054_SHORT`），那一版本來就沒有徽記 ⇒ `n/a` 是正確狀態，判紅會是假警報。
所以這三支治具驗尺寸防線時一律帶 `--fxvocab=1`（`duel-drive` 是網址帶 `?fxvocab=1`）；
預設狀態也要跑一次，證明 27/27、0 error、**不誤報**。
★那份名單不是手工維護的（覆審 r2 L2）★：`emblemCasesFromSource()` 讀三個系別檔、切到 `V054` 之前、
逐函式看有沒有呼叫三支入口——批 1–3 加新招不必記得改名單。逐套判定也會印 `FAIL`，
不是只有 summary 與 exit code 紅。

### ★正式 L3（`duel-drive`）一定要固定 seed★（覆審 r2 M4）

`duel-drive` 有沒有量到徽記，取決於那一局抽到誰。實測**不帶 seed 跑 16 場對決、44 次 trait 事件，
四支示範招一支都沒抽到** ⇒ `n/a`。所以：`--fxvocab=1` 之下 `made === 0` **一律判紅並 exit 非 0**
（「exit 0」不等於「量到了」），正式量測固定帶種子：

```bash
node tests/tools/duel-drive.mjs \
  "http://127.0.0.1:8963/index.html?paperwar=1&fxcount=1&fxvocab=1&seed=7" out.json --duels=12 --port=8963
# 實測 seed=7 抽得到用徽記的招（覆審 r2：鎖上 11 of 11、稽核 572 次、ok）
```
`tweenErrors`（r4 MEDIUM-1）＝編舞在 `tween`／`timer`／`done` 裡丟出來的例外：
那三個 `catch` 的用意是「一段壞了不擋整招」，不是「一段壞了沒人知道」。

### L3 canary（尺寸的單一來源突變 → 用到徽記的招必須全紅）

```bash
# 1) 把三張尺寸表的共同出口換掉（一行、一個檔）：
#    js/trait-fx/vocab.js 的 `_resolve(kind, tableName, dflt) { … }` → `_resolve() { return 0.02; }`
# 2) 跑同一組參數（★v0.55.1 之後一定要帶 --fxvocab=1★，不帶＝0.54 演出、根本沒有徽記）
node tests/tools/fx-contrast.mjs <outdir> --fxvocab=1 --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost
python tests/tools/fx-contrast-metrics.py <outdir>      # 預期 pass 0、四支全 ok:false
# 3) 用改壞前的備份副本還原 vocab.js（不做反向編輯），再跑一次確認回到現值
```

★**L3 canary 只驗得到「凍幀當下畫面上的主體」**（r4 MEDIUM-4，已知限制）★
凍幀點是 `travel` 中點（凍結檔寫死），而**印記（`markByKind`）與貼桌陣（`flatByKind`）在
`react` 段才淡入**，那一刻幾乎不貢獻像素（實測 `biteGamble` 在 canary 下整張差圖只剩 4 px）。
⇒ 批 1–3 若以印記或貼桌陣為主視覺，**L3 這一格對「尺寸來源」零鑑別力**。
這條殘留由第 3 點的**世界尺寸稽核**補上：它每幀量每個徽記、不依賴凍幀、不依賴像素，
印記與貼桌陣（含 InstancedMesh 逐實例）都在它的涵蓋裡。要在 L3 也看得到就得另挑時點或另加一格。


★**canary 一定要打 `_resolve`，不要打 `sizeOf()`**★（覆審 r3 N12）：`markSizeOf`（印記）與有覆寫的
`flatSizeOf`（貼桌陣）都**不經過** `sizeOf`，打 `sizeOf()` 對 `ICON.markByKind`（`seal` 0.20）與
`ICON.flatByKind`（`hat` 0.20）完全打不到——主視覺是印記或貼桌陣的招在那種 canary 下照樣綠。
`_resolve` 是三張表的共同出口，一行蓋三表；`tests/fxvocab.test.mjs` 有一條測試在釘「三者都要跟著變」。
