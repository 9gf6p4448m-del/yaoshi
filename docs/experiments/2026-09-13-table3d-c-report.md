# 報告：拍賣桌 3D 實體化**第二段** v0.56b（2026-09-13）

> 凍結檔：`docs/experiments/2026-09-13-acceptance-table3d-c.md`（動手前訂、期間一格未動）。
> 基準：本 worktree 的 `0771e04`（main 最新，v0.56b 含上桌卷第一段）。
> 證據目錄：`docs/experiments/2026-09-13-table3d-c-evidence/`。
> worktree：`C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-ad9899303c405bc7f`（**未合併 main、未 push**）。

## 0. 一句話結論

四件**全做完**；U0 ✅／U1 **橫式 ✅・直式 ❌（`#north` 11px，與基準逐值相同、非本卷造成）**／
U2 ✅／U3 ✅（比值最低一次 0.4012，貼線）／U4 ✅（含突變驗紅）／U5 ✅／U6 ✅。
**U1 直式那一條沒有為了綠燈動過門檻**，紅在哪、為什麼紅寫在 §3 U1。

---

## 1. 改了哪些檔（檔案:行號）

| 檔 | 動了什麼 |
|---|---|
| **`js/table-props.js`（新）** | 全檔。`PROPS` 常數表（`CHIP`／`TOKEN`／`RELIC`／`SEAT`／`DROP_Z`）、銅錢幾何 `chipGeometry`（:129）、令牌幾何 `tokenGeometry`（:154）、十件信物 `RELIC`（:213～）、`createTableProps()`（:400～）與 `bid／mark／settle／clearBids／clearRound／setSeats／setLayout／update／stats／dispose` |
| `js/table-tray.js` | :23 載入 table-props；:79–96 `TRAY.P` 直式分支；:100 `layoutOf()`；:278 `L`＋`slotX`；:298 建道具層（`onSlam`→那一格抖一下）；:299 首次 `relayout()`；:350 `fitProxy`；:367 `relayout`；:426 `api.props`／:428 `mode()`／:431 `slotXs()`；:507 轉向偵測＋`props.update`；:530 落地震動 `jolt`；dispose 加 `props.dispose()` |
| `js/renderer.js` | :159–172 `ys:market` 加 `round` 換夜清場與 `seats`→`setSeats`；:174–178 `ys:bid`；:179–183 `ys:mark`；:184–191 `ys:reveal` 的 `slot`→`settle` |
| `index.html` | :2449 `market3dSeats()`；:2452 `pushMarket3d` 加 `seats`；:2458 `pushBid3d`；:2463 `clearBids3d`；:2467 `pushMark3d`（含 `sfx("woodslam")`）；:2474 `pushMarks3d`；:4592 `ys:reveal` 加 `slot`；:4951 `pickMark` 拍令牌；:4988 `showHandoff` 清銅錢；:5024 `showMarket` 補推已公開的盯上；:5241 `closeSheet` 封籤即推錢；:5286 `submitHumanBids` 交卷推錢；:5311 開標一次推全部。**`VERSION` 一格未動**（`git diff` 對 `VERSION=` 命中 0） |
| `assets/audio/sfx.js` | 新聲部 `woodslam`（:88–98，合成器那一段，其餘一行未動） |
| `tests/tools/props-probe.mjs`（新） | 本卷的道具探針（NDC 包圍盒／hitTest 排除／記憶體五輪／GIF 連拍／`--roles`／`--curse`／`--portrait`／`--root`） |
| `tests/tools/scene-shot.mjs` | `--perf` 量測前用產品自己的 `props.bid／mark` **把最壞情境真的擺上桌**；分母表加三個道具桶；`triOf` 對 InstancedMesh 乘 `count`；回報 `props` 明細 |
| `tests/tools/felt-probe.mjs` | 加 `--portrait`（390×844，量的東西一字不變）；直式改用 `el.click()` 繞過 `#rotateHint` 蓋板 |
| `tests/tools/legend-drive.mjs` | 連點守衛段：兩下改成**背靠背排進 CDP**、加 `stimulusGap` 前提斷言與逐下時刻歸因（見 §3 U2） |

`js/trait-fx*`／`js/duel-figures.js`／`js/creature-figures.js`／`js/scene-env.js`／`js/camera-director.js`
／`js/bloom.js`／`js/particles.js`／`js/characters-billboard.js`／`js/bridge-players.js` — **全部零 diff**（`git diff --stat` 空）。

---

## 2. 四件各做了什麼

### 2.1 壽命銅錢籌碼
方孔銅錢：12 段外緣、外緣／錢面／方孔內壁三階頂點色，**96 三角形／枚**（≤300 ✅）。
32 枚（4 席 × 8）走**一顆 `InstancedMesh`＝1 個 draw call**；逐枚亮度與少數幾枚的綠鏽用 `instanceColor`（0 成本）。
- 幾命幾枚：`pushBid3d(seat, slot, amount)` → `props.bid()`，`amount` 直接就是枚數。
- **上限 8 枚，超過改成一串**：`amount > 8` 時同一批 instance 換成「立起來沿短弧排」的姿態（`CHIP.STRING`），
  0 新幾何、0 新 draw call。實測 `myBids` 押 9 → 桌上 8 枚立姿（`r6-bid.png` 右側）。
- **開標後依結果**：`ys:reveal` 帶 `slot`＋`winner` → `props.settle(slot, winner)`，得標者的錢留在桌上、
  其餘各家的飛回自己席位（`r6-reveal.png`：開標後 27 枚仍在場、分兩批）。

★規格之外多推一次、理由寫在這裡★：凍結檔字面是「**送出出價時**推出」，但單人局按下「蓋牌開標」會**同步**
進開標、`setHollow(false)` 當場把玻璃面板蓋回桌心——只在交卷那一刻推的話，玩家**一次都看不到自己的錢**
（r1 拍到的 `-bid.png` 是「開標前公告」頁）。所以 `submitHumanBids` 照推（規格字面，`index.html:5286`），
另外在 `closeSheet()`（`#sheet` 的唯一關閉點，:5241）也推一次，封籤當下就看得見；`props.bid` 同一席同一格
是覆寫、不疊兩份。**這是加事件不是改判準**，凍結檔一格未動。

★熱座外洩的補洞★：桌上的銅錢＝私有出價（幾枚就是幾壽命）。`showHandoff` 既有的「雙保險清場」
只清 DOM 徽章，銅錢會被下一位看到 ⇒ `index.html:4988` 補 `clearBids3d()`（走 `amount:0` 的同一條路，
不另開事件）；開標時改推**每一筆**（不只 AI），真人被清掉的那幾筆在攤開那一刻補回來。

### 2.2 血玉令牌
圓角方牌（12 點外框）＋**陽刻**「盯」（左「目」五道、右「丁」兩道，共七道凸條），暗紅玉三階，
**132 三角形／枚**（≤300 ✅），4 枚走一顆 `InstancedMesh`＝1 個 draw call。
- `pickMark(i)` → `pushMark3d` → `ys:mark` → 從自己席位**先舉高再加速落下**（easeInQuad）、落地回彈。
- **落地震動**：`onSlam(slot)` 回呼讓托盤那一格的拍品做一次衰減阻尼上下頓（`table-tray.js:530`），
  只動那一格的 y，不碰相機、不碰別格、不寫任何狀態。
- **木撞擊音**：`assets/audio/sfx.js` 新增 `woodslam`（低頻重擊＋木頭共鳴方波＋乾的高頻敲擊噪音＋悶尾），
  走既有 `sfx()` 路徑、不帶 `rnd`＝完全決定性。離線渲染實測 **peak 0.8425／rms 0.06411**
  （對照既有的 `stamp` peak 0.655／rms 0.05667）⇒ 真的出得了聲，不是只註冊了名字。
- 留到開標：只有「換一夜」（`ys:market` 的 `round` 變了）才清。

### 2.3 十席信物（名稱以 `ROLES` 為準，語意自定）

| `ROLES` id | 角色 | 信物 | 語意 | 三角形 |
|---|---|---|---|---:|
| `shoujing` | 收驚婆 | **白米香爐** | 一碗白米插三炷香——收驚的米卦 | 114 |
| `dangpu` | 陰間當鋪 | **算盤＋當票** | 小算盤（五檔上下珠）斜靠一張捲角當票 | 148 |
| `zutou` | 大家樂組頭 | **字花明牌** | 立著的木牌，三道墨字＝今期「明牌」 | 60 |
| `qingmian` | 青面攤主 | **白骨骰子** | 兩顆骨色骰子（五點／三點），攤主的賭具 | 44 |
| `hongyi` | 紅衣婆婆 | **紅繡鞋** | 翹頭小紅繡鞋一隻，金繡一道 | 40 |
| `duanshou` | 斷手書生 | **斷筆** | 從中間折斷的毛筆，兩截岔開、斷口留白茬 | 52 |
| `hunter` | 獵人 | **獸夾** | 張開的弧形夾口＋一排尖齒 | 60 |
| `xiaonv` | 孝女白琴 | **白幡** | 竹竿挑一面白幡，兩道喪字 | 54 |
| `lvshan` | 閭山法師 | **法印** | 帶鈕方印，印面沾硃砂，旁一小盒硃砂 | 56 |
| `luzhu` | 普渡爐主 | **三足香爐** | 三足銅爐、香灰面、雙耳、一炷香 | 132 |

全部 ≤300 ✅（最大 148）。四件在場＝4 個 draw call。
依 `renderSeats` 的席序（`DIRS` 0 南／1 北／2 西／3 東）擺，一律面向桌心。
角色資料經 `ys:market` 的新欄位 `seats`（`{id, role, alive}`）單向送進來，3D 層不回頭讀 `S`。

### 2.4 直式
`TRAY.P`（`js/table-tray.js:90`）：`XS [-0.50,-0.167,0.167,0.50]`、`SCALE 0.40`、`Z 0.06`、
紅布**非均勻 scale**（0.42×0.72，0 新幾何）、命中盒 `HITK 0.56`；
道具走 `PROPS.SEAT.P` 與 `DROP_Z.P 0.40`。轉向偵測在 `update()` 裡比 `camera.aspect < 1`，翻面才 `relayout()`。
數字是量出來的：直式 fov 50 是**垂直**的，390/844 把水平半視角壓到 12.2° ⇒ 托盤那一排的畫面邊緣
只對應到世界 x=±0.75，外側槽位再加上擺在槽前的籌碼（槽 x ±0.1）必須收到 ±0.50 才不出框。
實測（`p3`）：六件道具的 NDC 包圍盒全部落在 ±1 之內、`hitTest` 全回 −1。
`?tray3d=0` 全關：`killSwitch` 實測 chips 0／tokens 0／relics `[]`。

---

## 3. 閘門逐條（指令原文＋實際輸出）

### U0 引擎零變動 → ✅
```
$ node tests/tools/trace-eq.mjs .base/index.html index.html
{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}
$ node tests/tools/trace-eq.mjs index.html --mutate
{"mutation":"CFG.ROUNDS 12 -> 11","differs":true,"verdict":"突變驗紅 ✅"}
```
（`.base/` 是 `git archive 0771e04` 解出來的完整基準樹，原檔全程唯讀、不做反向 sed。）

**新派發點 grep**（`git diff 0771e04 -- index.html | grep '^+'`，新增行中所有 `S.xxx`）：
```
6 S.market   3 S.marks   5 S.players   1 S.rng   2 S.round
```
逐行看過：`S.rng` 那一筆在**註解裡**（「不耗玩法亂數（`S.rng`）」）；其餘 16 筆**全部是讀取**
（`S.players.map`／`S.market.indexOf`／`Object.keys(S.marks)`／`S.round` 當 key）。
**賽局欄位寫入 0 筆、玩法亂數呼叫 0 次** ✅。

### U1 版面 → **橫式 ✅／直式 ❌（非本卷造成）**
```
$ node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --port=8962
- **#felt**：12 格 最大溢出 0 非 0 的格數 0
- **#west**：12 格 最大溢出 0 非 0 的格數 0
- **#east**：12 格 最大溢出 0 非 0 的格數 0
- **#north**：12 格 最大溢出 0 非 0 的格數 0        → 橫式 ✅
```
```
$ node tests/tools/felt-probe.mjs --portrait --seeds=1,3 --rounds=3 --sel=... --port=8965   （本樹）
- #felt 0 / #west 0 / #east 0 / **#north 12 格 最大溢出 11 非 0 的格數 12**
$ node tests/tools/felt-probe.mjs --portrait ... --root=.base --tag=base --port=8966        （基準樹）
- **#north 12 格 最大溢出 11 非 0 的格數 12**
```
**紅在哪、為什麼**：直式 `#north` 每一格都溢出 **11px**，而**基準 `0771e04` 是同樣的 11px、同樣 12/12**
⇒ 這是產品在直式的既有狀態（直式整片被 `#rotateHint` 蓋住、根本不可玩），**本卷的 Δ＝0**。
**我沒有動這條門檻**——照凍結檔的字面它就是紅的，交製作人裁「這一條要不要改寫成『對基準 Δ≤0』」。

**「直式 tap 回歸（現有 `legend-drive --taps` 直式模式）N/N」**：
★這個模式**不存在**★。`--taps` 全段寫死 844×390（`legend-drive.mjs:385` 的 `newContext`），
沒有直式分支；而且直式下 `#rotateHint`（滿版不透明、z-index 99）**攔下每一個真實點擊**——
實測 Playwright 在直式對 `#mainbtn` 連續重試到逾時（`intercepts pointer events`）。
也就是說「直式 tap N/N」在這個產品上**無論實作對錯都不可能通過**（`03 R6`／`02 §2.1` 例外的那一類），
但我**沒有自行判它免除**。改為據實交兩件事：
① 直式版面溢出照量（上面那一段，含基準對照）；
② 直式 3D 分支的量測（`p3`，六件道具 NDC 全在畫面內、`hitTest` 全 −1、0 error）。
**這一條記為未達成，理由如上，請製作人裁。**

### U2 tap 回歸 → ✅
```
$ node tests/tools/legend-drive.mjs .base/ld-final.json --taps --trayslots --tapsonly \
      --tapbase=<0771e04 的 tapout> --port=8990
- T5 觸控命中：可測元素 177 個（基準 177）　命中 177／177　基準清單漏掉 0　沒命中 0
  驗了字面引數的 152 個、引數對不上 0　**trayTap 被呼叫 0 次** → ✅
- T2 托盤槽位 tap：出價頁 4/4 標題對　盯上頁 4/4 引數對　空白 3/3 回 −1 且不觸發
  逐槽 GLB 檔名 4/4 對　hover 微推雙向 ✅　#sheet 後收 hover ✅　**連點守衛 ✅**　觸控點亮 ✅　error 0 → ✅
- H-1 kill switch 下點桌心：S.marks 逐值不變 ✅　#sheet 沒開 ✅ → ✅
- console error 0、pageerror 0、requestfailed 0
```
**籌碼／令牌不攔截任何點擊**（兩條都驗，只驗一條會被「剛好沒對準」蒙混）：
```
$ node tests/tools/props-probe.mjs docs/.../r6 --port=9003
hit prop-chips=-1 prop-tokens=-1 relic-qingmian=-1 relic-dangpu=-1 relic-shoujing=-1 relic-zutou=-1
```
① `tray.hitTest` 的目標清單只有四顆命中代理盒（`proxies`），道具層**一顆都不在裡面**（`props.stats().names`
與 raycaster 目標比對）；② 對**每一件道具的世界中心**投影成 NDC 再叫產品自己的 `hitTest`，六件全回 −1。

★過程中真的抓到一次、已修★：信物第一版擺 `(±2.02, −0.42)`、第二版退到 `(±2.42, −1.55)`，
`hitTest` 對西／東信物中心**兩次都回 0／3**——不是道具攔截了點擊，是**從相機射出去的那條線先穿過
命中盒**（命中盒依 GLB 包圍盒收緊，半邊約 0.42、高 0.84）。改擺到「近側桌角」（z≈+1.0）之後，
同一條線在 y=0.84／y=0 兩個高度的 z 都落在盒子的 z 範圍（−0.32～0.52）之外 ⇒ 幾何上穿不到，
**不必去動命中盒**（動它會動到 T2）。

#### ★連點守衛：紅過一次，歸因＋治具修正＋突變驗紅★（`02 §6.2`）
第一次跑是 **❌**（`swallowed:false`）。**沒有直接判它是產品壞了**，先建歸因：
給治具加「逐下按下時刻」記錄之後量到——
| | 兩下的**按下時刻**間隔 | 結果 |
|---|---:|---|
| 基準樹 `0771e04` | **456.2 ms** | 勉強落在 500ms 窗內 → 綠 |
| 本樹 | **659.1 ms** | 已在窗外 → 紅 |

治具的註解寫「80ms ≪ 500ms」，但兩下之間夾了一次 `page.evaluate` 往返，而**一次
`page.touchscreen.tap()` 在這個頁面上的往返實測要 450～590ms**（3D 全速在跑、CDP 通道忙）
⇒ 它送出去的根本不是連點，量到的是通道延遲。**產品的 `trayTap` 對基準逐位元組零 diff**
（`git diff 0771e04 -- index.html | grep trayTap` ⇒ 空）。

修法（**加嚴、不是放寬**）：① 兩下**不 await 第一下、背靠背排進 CDP**（實測間隔降到 **0.1 ms**）
② 加**前提斷言** `stimulusGap < guardMs`，送不進窗內就報「前提不成立」，不得靜默當成通過或當成守衛壞了。
```
修後（本樹）：stimulusGap 0.1ms　premise true　phase1 "bid"　swallowed true　reopened true → ok ✅
突變驗紅：把 index.html 的 `if(now-PHASE_AT<MAIN_GUARD_MS||now-TRAY_TAP_AT<MAIN_GUARD_MS) return;`
         換成註解（複本在 .mut/，原檔全程唯讀）→ swallowed false、ok false ❌ ⇒ 這道檢查抓得到
```

### U3 效能 → ✅
```
$ node tests/tools/scene-shot.mjs .base/t3d-c --perf --runs=5 --port=8991
  （最壞情境由治具用產品自己的 props.bid／props.mark 真的擺上桌，量測結果附 props 明細佐證）
```
| 變體 | draw calls／幀 | 三角形／幀 | passes／幀 | renders/s 中位 | 場上道具 |
|---|---:|---:|---:|---:|---|
| `?tray3d=0`（分母） | 18 | 1707 | 1 | 1045.3 | 0／0／0 |
| 預設・無 hover | 74 | 23645 | 1 | 503.0 | 32 枚／4 枚／4 件 |
| **預設・最壞 hover** | **87** ✅≤135 | **29369** ✅≤33000 | **1** ✅ | 473.8 | **32 枚／4 枚／4 件** |
| `?table3d=lite` | 73 | 23263 | 1 | 494.3 | 32／4／4 |

**三角形分母表（最壞 hover）**：托盤拍品本體 17972・托盤描邊外殼 5724・**壽命銅錢籌碼 3072**・
夜空穹頂 720・**血玉令牌 528**・紅布托盤 422・木紋桌面 368・**席角信物 366**・遠景剪影 98・香灰＋符咒 90・其他 5。
本卷新增合計 **3966 三角形／6 個 draw call**（籌碼 1＋令牌 1＋信物 4），與第一段的 68 calls／19679 tris 相減完全對得上。

**renders/s 比值（逐次配對，分子÷同一 run 的分母）**
| | 5 次 | 中位 | 全距 |
|---|---|---:|---|
| 預設・無 hover | 0.6071／0.4373／0.5092／0.4795／0.4653 | 0.4812 | 0.4373–0.6071 |
| **預設・最壞 hover** | 0.5721／0.4012／0.5095／0.4402／0.4340 | **0.4533** ✅≥0.40 | **0.4012–0.5721** ✅ 不跨線 |
| `?table3d=lite` | 0.6088／0.4539／0.5157／0.4729／0.4369 | 0.4729 | 0.4369–0.6088 |

★照實說：最低那一次 0.4012，離門檻只有 0.0012★。照凍結檔的字面是通過（中位 0.4533、全距不跨 0.40），
但這一格實質上是**貼線**，下一手動任何東西都可能翻紅。第一段的報告已記過這個指標跨 run 有 ±30% 的自然波動，
本卷不另做處置（`02 §6.2`：沒歸清楚之前不得靠加 retry／換條件把它弄綠）。

**對決頁 draw call（同路徑、同機器、背靠背）**
```
$ node tests/tools/duel-perf.mjs perf .base/dp-mine.json --port=8992 --uncap            → drawCallsPerFrame 988
$ node tests/tools/duel-perf.mjs perf .base/dp-base.json --port=8993 --uncap --root=.base → drawCallsPerFrame 988
```
**Δ ＝ 0**（容差 ±5）✅；errors 兩邊都是 0。

### U4 記憶體 → ✅（含突變驗紅）
```
$ node tests/tools/props-probe.mjs .base/mem --mem --port=8995
籌碼令牌 5 輪（每輪四席各推 9 枚＝走「一串」那條路＋四枚令牌，再 clearRound）：
  32/4 geo75→75 tex56→56 | ×5 逐輪逐值不變（+0／+0）
信物換角 5 輪（A 組 qingmian/hongyi/duanshou/hunter ⇄ B 組 xiaonv/lvshan/luzhu/dangpu）：
  base geo75 tex56 → 五輪每一次 mid/back 都是 geo75 tex56（+0／+0）
errors []
```
★**鑑別力說明**（`02 §6.1` 第 1 條）：籌碼與令牌走**固定池**（各一顆 `InstancedMesh`，建一次不再長），
所以上面那五輪 +0／+0 是**建構上保證**的，對「有沒有漏」幾乎零鑑別力——這一點照實寫出來，不當成證據。
真的會逐件 new／dispose 的是**信物**，所以另補了換角 5 輪，並做突變驗紅：
```
把 js/table-props.js 的 relics[i].mesh.geometry.dispose() 換成註解（複本在 .mut/，原檔唯讀）
$ node tests/tools/props-probe.mjs ... --mem --root=.mut
  輪1 geo 86 → 輪2 94 → 輪3 102 → 輪4 110 → 輪5 118（每輪 +8 geometries）❌ ⇒ 這條判準抓得到
```
★過程中抓到的治具缺陷★：`props-probe` 第一版把 `--root` **靜默吃掉**（寫死 `serve(ROOT)`），
第一次突變驗紅因此「沒有紅」——那不是判準沒力，是治具沒換頁。已修（`props-probe.mjs` 的 `SRC_ROOT`），
修完再驗才是上面那組數字。

### U5 視覺交付 → ✅
| 交付 | 檔 |
|---|---|
| **出價推籌碼 GIF** | `…-c-evidence/bid.gif`（10 格連拍 contact sheet：`sheet-bid.png`；原始幀由 `props-probe --gif=<dir>` 重產，體積太大未進版控） |
| **盯上拍令牌 GIF** | `…-c-evidence/mark.gif`（10 格連拍 contact sheet：`sheet-mark.png`；同上） |
| **四席信物・橫式** | `r6-bid.png`（含 UI）／`r6-bid3d.png`（純 3D）；十件分兩批：`rA3-roles.png`＋`rB3-roles.png`，特寫 `crop-A3.png`／`crop-B3.png` |
| **四席信物・直式** | `p3-bid3d.png`（390×844；`p3-bid.png` 含蓋板） |
| **詛咒品托盤前令牌** | `c1-curse.png`／`c1-curse3d.png`（seed 2 第 2 夜槽 2「縛靈鎖（詛咒）」） |

**`threejs-visual-loop` 自評（截圖存檔→用 Read 實際打開看→逐條比對→修→再截圖）：走了四輪**

- **r1**：西／東信物壓在托盤外側兩格上（`hitTest` 回 0／3）；`-bid.png` 拍到的是「開標前公告」頁
  ⇒ 規格「送出出價時推」在單人局**看不到**。→ 改落點、`closeSheet` 補推、治具改在封籤當下拍。
- **r3**：一切太小太暗——信物只有 20～28px，「讀成桌上幾點雜物」。
  → 銅錢 R 0.052→0.072、令牌 0.072×0.094→0.098×0.128、信物 SCALE 1.0→1.75，
  三種材質各加一點 `emissive`（做法與理由同第一段把 `RIM_BASE` 1.3→2.9 的那一課：
  桌面只吃得到四盞燈籠的一點邊光，不自己透光的小物一律沉進背景）。
- **r4（抓到真因）**：骰子頂面是**牛皮紙箱色**、點數完全看不見。放大四倍裁切（`crop-dice.png`）之後確認
  ——不是亮度也不是色溫，是**法線方向錯了**：`box()` 六個面的頂點繞法全部是反的，
  `computeVertexNormals` 算出來的頂面法線**指向下方**，只吃得到 `HemisphereLight` 的**地面色**
  `0x8a5626`（暖褐）。修：六面繞法整個倒過來；信物材質改 `DoubleSide`（手寫小片幾何的繞法不再是視覺缺陷，
  0 draw call、0 三角形，同第一段 `tray-cloth`／`tray-curse` 已在用的那條）；骰點放大並改冷骨白；
  斷筆整件重做（第一版桿半徑 0.008、只做三個面 ⇒ 成圖上整件不可辨）。
- **r5／r6（收尾）**：十件逐件打開看過，全部可辨（特寫見 `crop-A3.png`／`crop-B3.png`）。

**還粗的地方（記錄，不修）**：
1. **南席信物偏暖**：南燈籠是四盞裡最亮最橘的（`LANTERNS.south` 7.0／`0xffa855`），
   擺在南席的骨白物（骰子）在成圖上偏米色。點數已經看得清楚，形狀也讀得出來，本卷接受。
2. `relic-shoujing` 的包圍盒左緣落在 NDC −0.591（掏空窗是 ±0.583），**外側約 1% 被西側卡列蓋住**；
   中心 −0.507 在窗內，肉眼看不出來。
3. 開標那一段桌心的玻璃面板會蓋回來（`setHollow(false)`，0.55a／0.56a 的既有版面決定），
   所以「AI 的錢一次推出」那一刻是隔著 52% 不透明的面板看的。本卷沒有動那個版面決定。

### U6 範圍 → ✅
```
$ git diff --stat 0771e04 -- js index.html assets tests docs
 assets/audio/sfx.js                              |  10 ++
 docs/experiments/2026-09-13-acceptance-table3d-c.md | 84 +++++++++
 index.html                                       |  58 ++++++-
 js/renderer.js                                   |  27 +++
 js/table-tray.js                                 | 125 +++++++++-----
 tests/tools/felt-probe.mjs                       |  17 +-
 tests/tools/legend-drive.mjs                     |  38 ++--
 tests/tools/scene-shot.mjs                       |  28 ++-
（另有新檔 js/table-props.js、tests/tools/props-probe.mjs、docs/…-c-evidence/）
$ git diff --stat 0771e04 -- js/trait-fx.js js/trait-fx js/duel-figures.js js/creature-figures.js \
      js/bloom.js js/particles.js js/characters-billboard.js js/bridge-players.js \
      js/camera-director.js js/scene-env.js
（空 ＝ 零 diff）
$ git diff 0771e04 -- index.html | grep -c 'VERSION='   → 0
```
```
$ for f in tests/*.test.mjs; do node "$f"; done   → 12/12 全綠
$ node tests/tools/traitfx-drive.mjs <out> --tier=2 --port=8961   → 30/30 pass · 重複簽章 0
```

---

## 4. 做不到／沒做到的（不得用「應該」帶過）

1. **U1 直式 `#north` 11px 溢出**：紅。與基準 `0771e04` 逐值相同（11px／12 格），本卷 Δ＝0。
   **門檻沒動**，要不要改寫成「對基準 Δ≤0」請製作人裁。
2. **U1「直式 tap 回歸 N/N」**：所引的 `legend-drive --taps 直式模式`**不存在**，
   而且直式下 `#rotateHint` 攔下所有真實點擊 ⇒ 這一條在本產品上無論實作對錯都不可能通過。
   已改為據實交「直式版面溢出（含基準對照）＋直式 3D 分支量測」兩件，**沒有自行判它免除**。
3. **U3 比值貼線**：最壞情境最低一次 0.4012（門檻 0.40）。照字面通過，但實質是黃燈。
4. **真機試玩／iPhone `?fps=1`**：在使用者側，本卷沒有數字（同第一段 §7.5 的待辦，未解決）。
5. **U4 籌碼／令牌那一半零鑑別力**：固定池，建構上不會漏；有鑑別力的是信物那一段（已補、已突變驗紅）。

---

## 5. §2.1 修訂紀錄

**無**。凍結檔 U0–U6 從訂下到現在**一格未動**；上面所有「加嚴」都落在治具的量法上
（連點守衛的刺激時序＋前提斷言、U4 補信物換角那一段、perf 真的把道具擺上桌），
沒有任何一項讓「一份壞掉的實作變成通過」。
