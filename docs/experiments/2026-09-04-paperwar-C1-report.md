# 《紙紮夜戰》卷 C1 — 三拍時間軸演出底座＋順手修　完成報告（2026-09-04）

基準：main `2879882`（程式碼＝v0.30 `d5da9be`，`PAPERWAR_ON` 預設 false）。本卷不 commit、不 push。
驗收條件凍結檔：`docs/experiments/2026-09-04-acceptance-paperwar-C1.md`（**一字未改，見 §6 的逐檔點名**）。

環境：headed Chromium（Playwright 1.61.1），viewport 一律 **844×390**，本機伺服器 **8793** 埠。
GPU＝`ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)`，`bloomOn=true`、`html.ys3d=true`。
（批 1 報告 §1 的軟體 GL 限制照舊：headless SwiftShader 上 bloom 不開，所有瀏覽器驗收都在真實 GPU 的 headed 上跑。）

---

## 1. 一覽（結論先行）

| 條 | 內容 | 結論 |
|---|---|---|
| C-A0 | OFF 等價：`trace(1..20)` 逐位元組相等＋對決 3D 事件序與基準相同 | ✅ 過 |
| C-A1 | ON 加欄位不動判定：`duelBags` 勝率矩陣逐值相同、D-A0 仍過 | ✅ 過 |
| C-A2 | ON 完整一局 console 0 error；burn 事件數＝燒毀演出數＝`war.burned*`；trait 事件數＝招式字幕數 | ✅ 過（14 場全中） |
| C-A3 | SKIP=false 每場 4–8 秒（實測 4425–7547ms）；SKIP ≤0.5 秒（實測 1–3ms）且 fx 計數不變 | ✅ 過 |
| C-A4 | rAF 中位數 132（門檻 ≥50）、最低 119＝批 1 J4 的 99.2%；粒子同時存活 180（門檻 ≤400） | ✅ 過 |
| C-A5 | `index.html` 與 `js/` 所有本地 script/import 都帶 `?v=0.31`；network 逐條印出；`html.ys3d` 有掛上 | ✅ 過 |
| C-A6 | `?paperwar=1/0` 只影響該次載入、不寫 localStorage（key 清單前後相同） | ✅ 過 |
| C-A7 | 五套測試 8/5/16/28/36 全綠；`index.html` 的 `Math.random` 0；OFF 牌桌畫面與基準逐項相同 | ✅ 過 |
| C-A8 | 活性：一局 `fxBurn` 36 次；11 種不同 `trId` 的招式字幕（門檻 5）；三拍字幕各 14 次 | ✅ 過 |
| 追加 | **3D 模型接口**（09-04 中途裁定）：`parts` / `burn()` / figure-aware `TRAIT_FX` | ✅ 已接，另有實跑證據 |

**沒有任何一條未過，也沒有與凍結檔的出入**（§5 只列兩件「凍結檔沒寫、我自己決定」的事）。

---

## 2. 改了哪些檔

`git diff --stat 2879882`：

```
 index.html         | 409 +++++++++++++++++++++++++++++++++++++++++++++++------
 js/duel-figures.js | 288 ++++++++++++++++++++++++++++++-------
 js/renderer.js     |  26 ++--
 3 files changed, 617 insertions(+), 106 deletions(-)
```

**`tests/` 零改動、`tests/tools/` 零改動、`docs/experiments/` 的凍結檔零改動、`js/particles.js`／`js/bloom.js`／
`js/scene-env.js`／`js/camera-director.js`／`js/bridge-players.js`／`js/characters-billboard.js` 零改動、
`CFG` 既有數值零改動。**

### index.html

| 位置（新版行號） | 做什麼 | 對應 |
|---|---|---|
| `222-249` | ON 分支的 CSS：`#duelBeat`／`#duelMove`（OFF 時 `display:none`，連高度都不佔）、`.pwcnt`／`.pwunit`／`.pwbody`／`.pwchips`／`.pwchip`（隻數牌）、`#duel.pw .fpw{display:none}` | C1-2a |
| `410`、`412` | `#duel` 裡多兩個空 div：`#duelBeat`（在 arena 上）、`#duelMove`（在 arena 下） | C1-2b |
| `521-528` | `?paperwar=1/0` 覆寫 `CFG.PAPERWAR_ON`（緊接 `CFG` 定義之後，不寫 localStorage） | C1-4 |
| `1659` | `VERSION` 0.30→**0.31**、`VERSION_NOTE` 換成本卷內容 | C1-6 |
| `1731` | `doSkip()` 多叫一次 `PW_WAKE()`（叫醒三拍時間軸目前那段等待） | C1-3 |
| `2445-2461` | **`pwRec` 多收一個可選的 `trId`；`pwFire` 多收 `sd`（招的主人）並往 beats 記一筆 `{kind:"trait",trId}`** | C1-1 |
| `2506`–`2749`（29 處） | 每一處 `pwFire(...)` 補上第四個參數＝這個招屬於哪一側（`sd`／`foe`／`X`／`Y`／`win`） | C1-1 |
| `3100-3131` | `PW_FX` 可調參數表（全部【試玩必調】，C1-3 要求的「集中一處」）＋ `FXC` 驗收計數器（`?fxcount=1` 才掛 `window.__ysFxCount`） | C1-3 |
| `3171` | `fxBurn` 開頭加 `FXC.burnDom++`（走 DOM 那條的次數） | C-A2 |
| `3853-4074` | **三拍時間軸整段**：`TRAIT_ITEM`／`PW_BODY`／`PW_KIND`／`PW_BEAT_SFX`／`TRAIT_FX` 掛鉤表／`pwArmyView`／`pwCompText`／`pwEvFac`／`pwSleep`／`pwRise`／`pwCap`／`pwArenaHTML`／`pwLineUp`／`pwThin`／`pwBurnOne`／`pwPlayBeat`／`playDuelWar` | C1-2 |
| `4079-4090` | `playDuel` 開場：ON 時多算 `views`、`ys:duel` 的 detail 多帶 `armies`；`if(views) await playDuelWar(...) else {` 開分支 | C1-2 |
| `4134-4135` | 分支結尾 `}`＋退場多一行 `ov.classList.remove("pw")` | C1-2 |
| `4160-4166` | 戰況列表：ON 時把 `f.war` 那場的 `war.log` 補在對決結果那一行下面（見 §5②） | C1-2c 配套 |
| `4855-4856` | `window.__yaoshi` 多出 `PW_FX, TRAIT_FX, TRAIT_ITEM`（試玩調參與慢動作自審用） | 工具 |
| `4901-4903` | 首頁版本字串旁標「紙紮夜戰：開／關」 | C1-4 |
| `4917-4924` | `js/renderer.js` 的 `<script type="module">` 改成由 JS 注入、帶 `?v=VERSION` | C1-5 |

**OFF 的時間軸（`playDuel` 裡 `else {` 之後那一段）一個字都沒動**——只是整段被包進 else，
所以 diff 看起來有縮排以外的變化時請對照 `git diff -w`。

### js/renderer.js

| 位置 | 做什麼 |
|---|---|
| `6-20` | 七個相對 import 改成 `await import('./x.js' + V)`，`V = new URL(import.meta.url).search`（C1-5；`three` 是 importmap 裸名，不動） |
| `112-118` | `window.__yaoshi3d` 多出 `duelFigures`（給 `TRAIT_FX` 掛鉤查 figure 物件） |

### js/duel-figures.js

| 位置 | 做什麼 |
|---|---|
| `17-22` | 快取破除接力：`V = new URL(import.meta.url).search`，`bridge-players.js` 用 `await import` 帶同一個查詢字串 |
| `54-68` | `FIG` 新增列陣參數：`maxFigures/rowStepPx/rowDepth/bodyScale/crowdShrink/crowdMin/hauntFloat/hauntOpacity/hauntBob/burnMs/burnRise`（全部【試玩必調】） |
| `121-138` | 工廠介面註解補上兩個**可選**成員 `parts` / `burn()`（見 §4） |
| `141-157` | `setFigureOpacity()`：整尊的透明度（作祟半透明、燒毀淡出），跳過 AdditiveBlending 那層（逆光歸 `setRim` 管） |
| `184-224` | 預設工廠多回一個 `parts:{rim,front,layers}`（可選成員的示範；**五個必要成員一個沒增沒減**） |
| `257-334` | 每邊一個「紙紮池」`pool[2]`＋名冊 `roster[2]`＋`burnState[2]`；`onDuel` 讀 `detail.armies`；`onFigBurn` 接 `ys:fx-burn`（有 `burn()` 就交給工廠、把 Promise 放回 `detail.done`） |
| `350-360` | `tmpFwd`、`pxWorld`、`aligned` |
| `376-388` | `realign()` 回報有沒有真的對到兩欄（`aligned`） |
| `398-472` | `update()` 改成雙層迴圈：每側 1..N 尊，體型縮放／作祟飄浮半透明／燒毀淡出上飄／列陣間距與前後交錯 |
| `474-487` | `figuresOf(side)` / `figureOf(side,unitId)` 出口 |

---

## 3. 每條閘門：指令原文與輸出

驗收腳本都放在 worktree 的 `scratchpad/`（未進 git）：`serve.js`（8793／8794 埠靜態伺服器）、
`drive.js`（OFF 事件序驅動）、`evseq.js`（事件序比對）、`gate.js`（ON 完整一局的計數／時長／rAF／粒子）、
`j7.js`（牌桌對照）、`layout.js`（版面溢出量測）、`offfig.js`（OFF 3D 人形逐項對照）、
`figpos.js`（人形投影位置）、`shots.js`（對決中途截圖與慢動作）、`summary.js`（彙整）。

### C-A0　OFF 等價

**① `trace(1..20)` 逐位元組相等**（`tests/tools/paperwar-gate-D.mjs` 的 D-A0，`--old` 指向基準的 `index.html`）：

```
$ node tests/tools/paperwar-gate-D.mjs 10000 --only=D-A0,D-A1 --old=scratchpad/base-index.html
## D-A0 Kill switch（OFF 與基準逐位元組相等；ON 必不等）
- OFF vs 基準：長度 310435 / 310435，逐位元組相等 → ✅
- ON  vs 基準：不相等 → ✅
- 判定：✅ 通過
```

「ON 必不等」那半條就是這組比對的**鑑別力**：同一支比對在「有動到 ON 行為」時會紅，
所以 OFF 那半條的綠燈不是恆真。

**② OFF 一局的對決 3D 事件序**——**先在基準錄**（動手前，工作樹還是 `2879882` 時錄的），
再用同一支腳本錄新版。驅動法：真實點擊「單人入市」→ 第一張角色卡 →「入市」，
再用 `newGame('solo',7,picks)` 固定種子重開，之後固定策略「有 `#stage button` 就按第一顆，沒有才按 `#mainbtn`」。

先驗這個訊號本身可信（`02 §6.2`：忽紅忽綠的訊號不算證據）——**基準連跑三次**：

```
$ node scratchpad/drive.js "http://127.0.0.1:8793/index.html" scratchpad/base-off-1.json --duels=6
$ node scratchpad/drive.js "http://127.0.0.1:8793/index.html" scratchpad/base-off-2.json --duels=6
$ node scratchpad/drive.js "http://127.0.0.1:8793/index.html" scratchpad/base-off-3.json --duels=6
$ node scratchpad/evseq.js scratchpad/base-off-1.json scratchpad/base-off-2.json
A n=50  B n=50
RESULT: 事件序逐項相等
$ node scratchpad/evseq.js scratchpad/base-off-1.json scratchpad/base-off-3.json
A n=50  B n=50
RESULT: 事件序逐項相等
```

基準的 50 筆事件序（`ys:hitstop` 附毫秒、`ys:duel` 附兩個座位、`ys:fx-impact` 附系別）：

```
ys:table ys:reveal ×4 ys:duel(0,3) ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact(xianghuo) ys:fx-lunge ys:duel-end
ys:duel(1,2) ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact(zuling) ys:fx-lunge ys:duel-end
ys:table ys:reveal ×3 ys:duel(0,1) ys:duel-end ys:duel(2,3) ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact(xianghuo) ys:fx-lunge ys:duel-end
ys:table ys:reveal ×3 ys:duel(0,2) ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact(zuling) ys:fx-lunge ys:duel-end
ys:duel(3,1) ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact(xianghuo) ys:fx-lunge ys:duel-end
```

新版（全部改完之後最後一次跑的）：

```
$ node scratchpad/drive.js "http://127.0.0.1:8793/index.html" scratchpad/FINAL-off.json --duels=6
duels= 6 errors= 0 ys3d= true bloomOn= true
$ node scratchpad/evseq.js scratchpad/base-off-1.json scratchpad/FINAL-off.json
A n=50  B n=50
RESULT: 事件序逐項相等
```

**③ 追加自查：OFF 的 3D 人形有沒有被我改到。**
`duel-figures.js` 改成 1..N 尊之後，OFF 走的是「一邊一尊」的退路——**這條退路第一版寫錯了**：
`body:'elite'` 會吃到 `bodyScale.elite=1.15`，OFF 的人形會無聲地大一圈；`rowDepth` 也會把它往後推 0.1。
兩處都在交件前修掉（`js/duel-figures.js:296`、`440`），並補了一支對照量測：
基準（8794 埠服務 `git archive 2879882` 的完整快照）與新版（8793 埠）跑同一支腳本、同一顆種子，
在對決開始後 900ms（相機補間 700ms 已到位、碰撞位移還沒發生）掃 scene 裡可見的人形 Group：

```
$ node scratchpad/offfig.js "http://127.0.0.1:8794/index.html" scratchpad/offfig-base.json   # 基準 v0.30
{"rows":[{"y":0.1607,"scale":1.0044,"rotY":0.3316,"rotZ":0.1047,"lat":1.0581,...},
         {"y":0,"scale":1,...},
         {"y":0.1655,"scale":1.0044,"rotY":1.2392,"rotZ":-0.1047,"lat":1.058,...}],"camDist":4.2}
$ node scratchpad/offfig.js "http://127.0.0.1:8793/index.html" scratchpad/FINAL-offfig-new.json  # 新版 v0.31
{"rows":[{"y":0.1339,"scale":1.0044,"rotY":0.3316,"rotZ":0.1047,"lat":1.0581,...},
         {"y":0,"scale":1,...},
         {"y":0.1306,"scale":1.0044,"rotY":1.2392,"rotZ":-0.1047,"lat":1.058,...}],"camDist":4.2}
```

`scale`／`lat`（離畫面中心的水平距離）／`rotY`／`rotZ`／`camDist` **逐項相同**。
只有 `y` 不同（0.1607/0.1655 vs 0.1339/0.1306）——那是 `FIG.bobAmp` 的呼吸位移，
值＝`sin(now×…)`，本來就跟取樣時刻綁在一起；振幅 `0.02×1.0044=0.0201`、基準線 `footY=0.15`，
四個值全部落在 `0.1299–0.1701` 這個區間內，**這一欄跨執行不可比，不能拿來當證據，也沒有拿來當證據**。

### C-A1　ON 加欄位不動判定

`duelBags` 勝率矩陣用凍結檔指定的「`paperwar-gate-D.mjs` 既有 D-A1 配對」，n=10000。
**C1 動手前先在基準錄一份**（`scratchpad/base-DA1.txt`），改完再跑一次，逐行比對表格資料列：

```
$ node tests/tools/paperwar-gate-D.mjs 10000 --only=D-A1 > scratchpad/base-DA1.txt     # 動手前（工作樹＝2879882）
$ node tests/tools/paperwar-gate-D.mjs 10000 --only=D-A0,D-A1 --old=scratchpad/base-index.html  # 改完
$ node -e "...只取表格資料列做字串比對..."
D-A1 勝率矩陣 C1 前後逐值相同
```

新版的 D-A1 表（節錄前兩列，九列全 ✅）：

```
| 群體 vs 精英（band 40–60%） | 五營旗＋陰陽眼銅錢＋拼板舟 | 射日神弓＋巴冷公主珠鍊 | 13/13 | 2466/2510/5024 | 49.56% | ✅ |
| 群體 vs 精英（band 40–60%） | 五營旗＋山豬牙飾＋飼鬼甕 | 獻祭刀＋王爺劍 | 12/12 | 2466/2510/5024 | 49.56% | ✅ |
...
## 一覽
- D-A0：✅ 過
- D-A1：✅ 過
```

（D-A1 在**只做完 C1-1（引擎補 trait 事件）當下**也各跑過一次、與基準 `diff` 全空，
所以「加欄位不動判定」這條是在改動的當下就驗過的，不是最後一次性驗。）

### C-A2　ON 完整一局

指令（`?paperwar=1` 開演出、`?fxcount=1` 掛計數器；一路打到「看最終結果」）：

```
$ node scratchpad/gate.js "http://127.0.0.1:8793/index.html?paperwar=1&fxcount=1" scratchpad/FINAL-on.json
duels=14 errors=0 deaths=1 round=7
```

- **console error 0**（`console`、`pageerror`、`requestfailed` 三種都掛了監聽）
- **含至少一次淘汰**：`deaths=1`（第 7 夜真人壽命耗盡，牌局提前結束）
- 逐場對數（`[burn 事件數, 燒毀演出次數, war.burnedA+burnedB | trait 事件數, 招式字幕數]`）：

```
[1,1,1|0,0] [1,1,1|1,1] [1,1,1|0,0] [7,7,7|4,4] [1,1,1|2,2] [1,1,1|1,1] [1,1,1|1,1]
[3,3,3|4,4] [1,1,1|0,0] [13,13,13|7,7] [1,1,1|5,5] [3,3,3|4,4] [1,1,1|3,3] [1,1,1|5,5]
14 場全部 burnEv==burnCalls==warBurn 且 traitEv==traitCap
ys:fx-burn 事件數 36 ＝ FXC.burn 36
```

計數器 `window.__ysFxCount`（只有 `?fxcount=1` 才掛）記的是
`burn`（燒毀演出總次數，**不論走 3D 還是 DOM**）／`burnDom`／`burnFig`／`trait`／`beat`／`duels`／
逐 `trId` 的 `traits`／逐拍名的 `beats`／逐場的 `fights`。

### C-A3　時長

```
SKIP=false 逐場（ms，量測位置＝ys:duel → ys:duel-end 之間）：
4775, 5199, 4425, 7515, 4692, 5207, 4941, 5290, 4487, 7547, 5301, 5316, 5015, 5301
min 4425 / max 7547（門檻 4000–8000）　14 場全部在帶內

$ node scratchpad/gate.js "...?paperwar=1&fxcount=1" scratchpad/FINAL-on-skip.json --skip
SKIP=true 逐場（ms）：3, 2, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1　→ max 3ms（門檻 ≤500）
SKIP   計數 {"burn":36,"trait":37,"beat":42,"duels":14}
非SKIP 計數 {"burn":36,"trait":37,"beat":42,"duels":14}   ← 逐值相同
```

「SKIP 仍呼叫所有 fx 計數器」這條的證據就是上面兩行**逐值相同**——不是「應該有呼叫」，
是同一組數字在 5 秒版與 2 毫秒版上完全一樣。

達成 SKIP ≤0.5 秒需要一個額外處理：批 1 的 `sleep()` 只在**呼叫的那一刻**看 `SKIP`，
所以按下跳過時已經排下去的那一段仍會等滿。OFF 只有兩三段等待、感覺不出來；
三拍時間軸有十幾段，不處理就會變成「按了跳過還在演」，而且第一場一定會超過 0.5 秒
（`ENTER_MS=480` 那一段跑滿）。因此新增可中斷的 `pwSleep()`＋`doSkip()` 叫醒目前那一段。
**OFF 路徑不會設 `PW_WAKE`（恆為 null），行為完全沒變**——C-A0 的事件序比對就是這件事的守衛。

### C-A4　效能

量測位置寫明：**`requestAnimationFrame` 回呼裡每秒數幀**（與批 1 J4 同一個位置），
只取 `ys:duel`～`ys:duel-end` 之間那幾格；粒子存活數在同一個回呼裡讀
`window.__yaoshi3d` 的 `smoke/embers/impact` 三個 Points（可見時計入其 position count）。

```
C-A4 對決期間 rAF：中位數 132，最低 119，樣本 76 秒
   批 1 J4 對照：120,132,129,129,132,131,130,129,130,131（最低 120、中位數 130）
   最低值比 99.2%（門檻：不退步超過 20% ＝ ≥96）
   粒子同時存活最大值 180（門檻 ≤400）
```

粒子上限本來就有結構性保證：`createImpactBurst` 是**固定大小的池**（`BURST.count=110`），
加上線香煙 50、餘燼 20，理論上限 180——量到的最大值 180 正好等於理論上限，代表這個量測真的量到了滿載。

### C-A5　快取破除

`index.html` 裡所有 `<script>`（`grep -n "<script" index.html`）：

| 行 | 內容 | 帶 `?v=` 了嗎 |
|---|---|---|
| 361 | `<script type="importmap">` | 不適用（只映射裸名 `three` → unpkg CDN，非本地檔） |
| 430 | `<script>`（主程式，內嵌無 src） | 不適用（隨 index.html 本身更新） |
| 4918 | `document.write('<script src="assets/audio/sfx.js?v='+VERSION+'">…bgm.js?v='+VERSION+'…')` | ✅ 兩支都帶 |
| 4924 | `(function(){var s=document.createElement("script");s.type="module";s.src="js/renderer.js?v="+VERSION;…})()` | ✅ |

`js/` 內部所有相對 import（`grep -n "import(\|from '\./" js/*.js`）——8 條，全部帶 `V`：

```
js/duel-figures.js:22:const { getTexture, loadSvgText } = await import('./bridge-players.js' + V);
js/renderer.js:14:const { createBloom } = await import('./bloom.js' + V);
js/renderer.js:15:const { createSceneEnv, resizeSceneEnv, FOG_DENSITY } = await import('./scene-env.js' + V);
js/renderer.js:16:const { createIncenseSmoke, createEmbers, createImpactBurst, SPARK_COLOR } = await import('./particles.js' + V);
js/renderer.js:17:const { createCharacterBillboards } = await import('./characters-billboard.js' + V);
js/renderer.js:18:const { createPlayerBridge } = await import('./bridge-players.js' + V);
js/renderer.js:19:const { createCameraDirector } = await import('./camera-director.js' + V);
js/renderer.js:20:const { createDuelFigures } = await import('./duel-figures.js' + V);
```

做法：入口由 index.html 注入 `?v=VERSION`，各模組再用 `new URL(import.meta.url).search` 把查詢字串接力下去。
**版本號因此仍然只有 `VERSION` 這一份**（沒有第二個要記得改的地方）。
brief 提醒的「同一模組被視為不同 URL」正是這裡的主要風險——`bridge-players.js` 同時被
`renderer.js` 與 `duel-figures.js` import，兩條路只要有一條沒帶就會載成兩份、貼圖快取分岔。
Playwright 的 network 清單證明只載了一份：

```
/assets/audio/sfx.js?v=0.31   /assets/audio/bgm.js?v=0.31
/js/renderer.js?v=0.31   /js/bloom.js?v=0.31   /js/scene-env.js?v=0.31   /js/particles.js?v=0.31
/js/characters-billboard.js?v=0.31   /js/bridge-players.js?v=0.31
/js/camera-director.js?v=0.31   /js/duel-figures.js?v=0.31
```

（去重前後都是 10 筆＝每支剛好一次；`ys3d=true`、`bloomOn=true`，3D 正常載入。）

### C-A6　URL 參數

```
$ node scratchpad/urlparam.js "http://127.0.0.1:8793/index.html"
（不帶參數，第一次）        PAPERWAR_ON=false | localStorage=[] | __ysFxCount=undefined
?paperwar=1                PAPERWAR_ON=true  | localStorage=[] | __ysFxCount=undefined
（不帶參數，開過 =1 之後重載） PAPERWAR_ON=false | localStorage=[] | __ysFxCount=undefined
?paperwar=0                PAPERWAR_ON=false | localStorage=[] | __ysFxCount=undefined
?paperwar=1&fxcount=1      PAPERWAR_ON=true  | localStorage=[] | __ysFxCount=object
```

第三列是關鍵：開過 `=1` 之後不帶參數重載會回到 false ⇒ 沒有寫進 localStorage。
完整一局跑完再驗一次 key 清單（測試自己塞的 `yaoshi_intro_v1` 除外，零新增）：

```
localStorage before / after: ["yaoshi_intro_v1"] / ["yaoshi_intro_v1"]
```

首頁版本字串：`v0.31・紙紮夜戰：開・《紙紮夜戰》卷 C1：三拍時間軸演出底座、紙紮列陣與燒毀、?paperwar=1 試玩開關`
（`?paperwar=0` 或不帶時是「紙紮夜戰：關」，上表逐列都印了）。

### C-A7　測試、`Math.random`、牌桌畫面

```
$ node tests/conscap.test.mjs      → 通過 5　失敗 0
$ node tests/aistake.test.mjs      → 通過 8　失敗 0
$ node tests/nightrules.test.mjs   → 結果：16 綠 ／ 0 紅
$ node tests/review.test.mjs       → 通過 28　失敗 0
$ node tests/wish16.test.mjs       → 結果：PASS=36 FAIL=0
$ grep -c "Math.random" index.html → 0
$ grep -c "Math.random" js/*.js
js/bloom.js:0  js/bridge-players.js:0  js/camera-director.js:0  js/characters-billboard.js:0
js/duel-figures.js:0  js/particles.js:18  js/renderer.js:0  js/scene-env.js:0
```

`js/particles.js` 的 18 處是批 1 就記錄過的既有債（15 處程式碼＋3 處註解），**本卷沒有動這個檔**
（`git diff --stat` 只有三個檔）。新寫的程式碼零 `Math.random`、零 `S.rng`——
時間軸只讀 `f.war.beats` 與 `S.rngUi()`（演出流）。

牌桌畫面（批 1 J7 口徑，同一顆種子 `solo,7`，量 `#felt` 溢出、四張座位卡 rect、`#feltHead`／`#stage`／`#mainbtn` 文字）：

```
$ node scratchpad/j7.js "http://127.0.0.1:8793/index.html" scratchpad/new-j7.json scratchpad/new-j7
逐項比對結果: 兩頁所有量測項逐項相同
errors base/new: 0 0
```

截圖：`scratchpad/base-j7-mark.png` ↔ `scratchpad/new-j7-mark.png`、
`scratchpad/base-j7-bid.png` ↔ `scratchpad/new-j7-bid.png`（肉眼看過，唯一差別是 3D 背景的餘燼與霧
——那是逐幀動的東西，跟批 1 J7 一樣不列入比對）。

### C-A8　活性

```
一局內 fxBurn（燒毀演出）36 次 ≥ 1
招式字幕出現 11 種不同 trId ≥ 5：
  wardAbsorb4（送王船）、eliteSelfCut（獻祭刀）、wardAtkAll1（媽祖令旗）、swarmRally（五營旗）、
  wardHpAll1（山神庇佑）、eliteCleave（斬瘟）、swarmLastStand（殘旗插心）、hauntLost（迷途）、
  eliteVsSwarm（咬手指）、swarmFeed1（飼鬼甕）、hauntSteal（偷命）
三拍字幕：{"一拍・撞":14,"二拍・護":14,"三拍・祟":14}   ← 14 場每場三拍各一次
```

實際畫面上的字樣（`scratchpad/shots.js` 逐時點抓 DOM 文字）：

```
01-lineup   beat:""                        left:"陰間當鋪 / 8 / 護法紙人×4・飄影×4"  right:"獵人 / 4 / 小紙人×3・大紙偶×1"  chips 0/12 燒
02-beat1    beat:"一拍・撞　🌓上弦・祖靈拍 hp+1"  move:"✦ 獻祭刀：割祭"
04-beat2    beat:"二拍・護"                   move:"✦ 五營旗：五方調兵"              chips 2/12 燒
05-beat3    beat:"三拍・祟"                                                        chips 5/12 燒
06-end      res:"陰間當鋪 勝！獵人 −6 壽命"
            sub:"🔥 獵人 燒掉 3/4 隻 → −6 壽命・陰間當鋪 燒掉 4/8 隻"                 chips 7/12 燒
```

截圖：`scratchpad/FINAL-01-lineup.png`（列陣）、`FINAL-03-beat1-mid.png`（一拍交鋒）、
`scratchpad/pw2-06-end.png`（結尾＋灰燼）。

---

## 4. 3D 模型接口（09-04 中途裁定的兩個掛鉤）

人形之後要換成真 3D 模型互打。C1 **沒有做任何 3D 模型**，只把兩個掛鉤留好並實跑驗過。

### ① 工廠的兩個可選成員 `parts` / `burn()`

必要介面沒有增減，仍是 `{ group, shadow, setPortrait, setCloth, setRim, ready }`（`js/duel-figures.js:121-138`）。
新工廠**可以**再回傳兩個可選成員：

```js
parts?: { body, armL, armR, head, ... }   // 子群組表。骨架動畫要動的是這幾個子群組，不是整個 group。
                                          // 鍵名由工廠自己定，duel-figures 一律不假設有哪幾個，
                                          // 只把整張表原樣交給招式演出（ctx.actorFigs[i].parts）。
burn?: (opts) => Promise                  // 這一尊自己的燒毀／倒地演出。opts.ms＝希望的長度、opts.body＝體型。
```

接法（`js/duel-figures.js:305-334`）：`ys:fx-burn` 的接收端先找到那一尊，
**有 `burn()` 就呼叫它**，把回傳的 Promise 放進 `detail.done`、`detail.handled=true`，
並且**本檔不再自己做淡出上飄**（`burnState[i]` 的 `custom` 旗標讓 `update()` 完全不碰那一尊，
演完才 `group.visible=false`）；工廠的 `burn()` 丟例外時自動退回內建演出，不讓一支動畫弄壞整場。

index.html 這一端（`pwBurnOne`）：`CustomEvent` 是同步派送的，所以 `fx3d(...)` 回來就能讀 `detail`：

```js
FXC.burn++;                                   // ← 單一計數點，兩條路共用
const det={side,unit,ms,handled:false,done:null};
fx3d("ys:fx-burn",det);
if(det.handled&&det.done) { FXC.burnFig++; job=det.done; }   // 3D 人形自己燒
else                      { job=fxBurn(el,{...}); }          // 沒有 burn() → 退回 DOM 版 fxBurn
```

**C-A2 的「burn 事件數＝fxBurn 呼叫數」因此改記在 `FXC.burn` 這一個點上，驗收語意不變。**

實跑證據（不是「應該可以」）：在 Playwright 用 `addInitScript` 掛一個假的接收端，
把 `detail.handled` 設 true 並回一個 Promise——走的是**同一段程式碼**，只有約定那一條線不同：

```
$ node scratchpad/gate.js "http://127.0.0.1:8793/index.html?paperwar=1&fxcount=1" scratchpad/gate-figburn.json --figburn
duels=14 errors=0 deaths=1 round=7
3D 接口：burn=36 burnDom=0 burnFig=36，errors=0，時長 4195–6437ms
```

對照沒掛假接收端的同一局：`burn=36 burnDom=36 burnFig=0`。
**兩條路的 `burn` 都是 36、與 `war.burnedA+burnedB` 相同**——這就是「不論走哪條，驗收語意不變」的證據；
而 `burnDom` 從 36 變 0 證明真的換了路，不是這個開關沒接上。

### ② `TRAIT_FX[trId]` 拿得到 figure 物件

掛鉤簽名（`index.html:3877-3893`、呼叫點 `4008-4014`）：

```js
TRAIT_FX[trId] = (ctx) => { ... }
// ctx = {
//   trId, side('A'|'B'), foeSide, fac(三系色鍵), power,
//   el,                       // 招式字幕的 DOM 元素（#duelMove）
//   actorFigs,                // 出招方那一側的 figure 物件陣列（每個帶 .group/.parts/.unit）
//   targetFigs,               // 對面那一側的 figure 物件陣列
//   figureOf(side, unitId),   // 要挑特定一隻時用
// }
```

figure 物件就是工廠回傳的那個物件本身（多掛一個 `.unit={id,body,fac}`），所以 `parts` 直接摸得到。
出口鏈：`duel-figures.createDuelFigures()` 回傳 `figuresOf/figureOf` → `renderer.js:115` 掛進
`window.__yaoshi3d.duelFigures` → index.html 的 `pwFigsOf/pwFigureOf` 包一層 try/catch。
**3D 沒載入時 `actorFigs`／`targetFigs` 是空陣列、`figureOf` 回 null**——掛鉤一律要先判空
（批 1 J8 的「3D 沒載入也能玩」那條退化路徑仍然成立）。實跑確認出口在：

```
figApi: {"hasFiguresOf":true,"hasFigureOf":true}
```

C1 沒有往 `TRAIT_FX` 填任何一件，27 件全部走 `pwTraitFxDefault`（通用 flash＋噴發）。

---

## 5. 慢動作自審發現與處置

`PW_FX` 的所有 `*_MS` 常數整體乘 3 跑一次（`scratchpad/shots.js --slow=3`，透過
`window.__yaoshi.PW_FX` 就地改，不動檔案），加上原速逐時點截圖。找到並處理的四件：

| # | 看到的問題 | 證據 | 修法 |
|---|---|---|---|
| 1 | **結尾字幕被裁掉**。390px 高的手機上多了拍首／招式兩行，整個 `#duel` 的 `scrollHeight=396 > clientHeight=390`，「🔥 …燒掉 x 隻 → −n 壽命」那一行有一半在畫面外；`f.extra`（戰況 log）接在同一行時會再多一整行、更糟 | `scratchpad/pw-06-end.png`；`scratchpad/layout.js` 量到 396/390 | ON 模式把上下留白整排收緊（`#duelBeat` margin 8→2、`#duelMove` 8→2、`#duelResult` margin-top 14→6、`.pwchips` 5→3、`.pwcnt` 24→21px 並固定 line-height），並把 `f.extra` 從結尾那行移到對決後的「戰況」列表。修後 `scrollHeight=390=clientHeight`，`#duelSub` 底 379 < 390。844×828（高視窗）也量了：390/390 → 828/828，同樣不溢出 |
| 2 | **八尊擠成一面牆、互相蓋住臉**；三尊的情況也一樣 | `scratchpad/pw-03-beat1-mid.png`、`slow1-01-lineup.png` | `FIG.rowStepPx` 30 → **50**，並保留 `crowdShrink`（每多一尊整排再縮 5%、下限 0.62）把八尊收回畫面內。修後實測投影位置：A 側八尊 x＝138,163,211,242,290,324,369,407（畫面寬 844），B 側四尊 441,495,541,599——沒有一尊掉出畫面（`scratchpad/figpos.js`） |
| 3 | **列陣第一格站錯位置**（有幾尊掉到畫面左緣外）。原因有兩層：① `ys:duel` 發出時 `#duelArena` 還是上一場的內容，`realign()` 會用舊座標；② 相機正從牌桌機位補間到對決機位（`DUEL_SHOT.ms=700`），投影本來就在動 | `scratchpad/s3-01-lineup.png` | ①修掉：`onDuel` 重設 `nextAlign=0` 並加 `aligned` 旗標，**沒真的對到兩欄之前一尊都不畫**（`js/duel-figures.js:296-300, 355, 398`）。②**沒有處理，這是刻意的**：700ms 的相機推近讓紙紮從外側收攏進來，讀起來就是「入場」，而 `ENTER_MS=480` 也蓋掉大半。要改的話是調 `DUEL_SHOT.ms`，那是批 1 的機位參數，不在本卷範圍 |
| 4 | **同一側的紙紮全是同一張臉**（八尊一模一樣的頭像） | 所有列陣截圖 | **不修，這是 C1 的設計邊界**：C1 用批 1 現有的人形工廠當佔位，逐件外觀是 C2/之後的 3D 模型。體型差（多／大／飄）已經做出區別，讀得出「誰帶了什麼陣」 |

另外兩件在自審清單上但**確認沒問題**：
- `prefers-reduced-motion: reduce` 下整局跑過一次（`--reduced`），0 error、時長與計數與一般模式相同；
  字幕與隻數牌的進場動畫在 reduced 下只留 opacity、拿掉 `translateY`／`scale`（`pwRise()` 判 `pwReduced()`）。
- 只動 `transform`／`opacity`：新加的動畫全部是 WAAPI 的 `{opacity, transform}` 兩個 key
  （`pwRise`），沒有動任何會觸發 layout 的屬性；`.pwchip.burnt` 只改 `opacity`／`filter`。

---

## 6. 做不到的事／與凍結檔的出入

**沒有做不到的條，也沒有降低任何門檻。** 兩件凍結檔沒寫、由我判斷後決定的事，列在這裡：

① **`f.extra`（`war.log`）在 ON 的對決結尾那行拿掉了，改掛在對決後的「第 N 夜・戰況」列表**
（`index.html:4160-4166`）。凍結檔 C1-2c 只要求結尾顯示「燒掉 x 隻 → −dmg 壽命」，沒說 `extra` 要留在哪；
把它留在原位會讓 390px 高的畫面溢出（§5 第 1 件）。資訊一條都沒少，而且那些招式在三拍裡已經逐筆打過字幕。
**OFF 完全不受影響**（`if(f.war&&…)` 才執行，OFF 沒有 `f.war`）。

② **新增了 `pwSleep()` 這個可中斷的等待，並在 `doSkip()` 裡叫醒它**（§3 的 C-A3 有完整理由）。
凍結檔沒提，但不做就過不了「SKIP ≤0.5 秒」——這是為了**達到**凍結的門檻而加的實作，不是為了繞過它。
OFF 路徑不會設 `PW_WAKE`，事件序比對（C-A0）就是這件事的守衛。

**要你知道的三件事**：

1. **`?paperwar=1` 是網址參數，重新整理不帶參數就回到關。** 真機試玩要記得存成書籤或每次都貼參數；
   首頁版本字串那一行會寫「紙紮夜戰：開／關」，一眼看得出這次載入到底開了沒。
2. **`PAPERWAR_ON` 預設仍是 `false`**（凍結檔要求「不開預設」），所以直接開 GitHub Pages 看到的還是舊對決。
3. **`window.__ysFxCount` 只在 `?fxcount=1` 時存在**，正式頁面上沒有這個全域；
   `window.__yaoshi.PW_FX` 則永遠在（試玩時可以直接改毫秒數看手感，重整就回預設）。

---

## 7. `git diff --stat` 與判準檔逐檔點名

```
$ git diff --stat 2879882
 index.html         | 409 +++++++++++++++++++++++++++++++++++++++++++++++------
 js/duel-figures.js | 288 ++++++++++++++++++++++++++++++-------
 js/renderer.js     |  26 ++--
 3 files changed, 617 insertions(+), 106 deletions(-)

$ git status --short
 M index.html
 M js/duel-figures.js
 M js/renderer.js
?? scratchpad/          ← 未進 git 的驗收腳本、截圖與基準快照（工作材料，非產品檔）
```

**判準檔（驗收條件、測試碼、治具、fixture、設定）逐檔點名——本 session 一個都沒動：**

| 判準檔 | 本 session 有沒有被動到 |
|---|---|
| `docs/experiments/2026-09-04-acceptance-paperwar-C1.md`（凍結檔本體） | **未動**（不在 `git diff --stat` 裡） |
| `tests/conscap.test.mjs` | **未動** |
| `tests/aistake.test.mjs` | **未動** |
| `tests/nightrules.test.mjs` | **未動** |
| `tests/review.test.mjs` | **未動** |
| `tests/wish16.test.mjs` | **未動** |
| `tests/tools/paperwar-gate-D.mjs`（C-A1／D-A0 的閘門治具） | **未動** |
| `tests/tools/load.mjs`（所有 headless 驗收的載入器） | **未動** |
| `tests/baseline-traces.json`、`tests/baseline-v2-ai.json` | **未動** |
| `CFG` 既有數值（`index.html`） | **未動**（只在 `CFG` 定義**之後**加了 `?paperwar` 覆寫，並新增 `PW_FX` 這張新表） |
| 執行指令原文與環境變數 | 全部逐字列在 §3，沒有額外環境變數 |

`git diff --stat` 只有三個產品檔，判準側零改動，所以「拿去對的那份驗收條件，跟動手前訂下的是同一份」。

---

## 8. 收尾

- 8793／8794 兩個本機伺服器在驗收結束後以 PID 關閉。
- 未 commit、未 push（凍結檔要求）。
- `scratchpad/` 是未追蹤的工作材料：驗收腳本、逐條輸出的 JSON、截圖、
  以及 `scratchpad/basefull/`（`git archive 2879882` 的完整基準快照，OFF 3D 對照用）。
  要清掉直接刪整個目錄即可，產品檔不依賴它。
