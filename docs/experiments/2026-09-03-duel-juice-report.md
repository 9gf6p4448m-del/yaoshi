# 妖市「對決場景大作化」批 1 — 完成報告（2026-09-03）

## 1. 驗收結論

**J1 過／J2 過／J3 過／J4 過／J5 過／J6 過／J7 過／J8 過。**

一項要先講明的環境限制（J3 相關，不是不過，但你要知道）：**bloom 在軟體 GL（SwiftShader／llvmpipe）上不開**。
Playwright 預設的 headless Chromium 用 SwiftShader，那條路上「把場景畫進 render target」會讓桌面與粒子的
shader 直接編譯失敗（`compiled=false`、info log 全空），console 冒兩個 `THREE.WebGLProgram: Shader Error`——
換成自製 RawShaderMaterial 也一樣，所以不是 shader 寫法的問題。真實 GPU（實測 ANGLE/AMD Radeon 780M D3D11）
完全正常。因此 `js/renderer.js:84` 加了一道 `bloomOK` 閘門：GPU 名稱像軟體光柵就整個不開 bloom、退回直接 render。
**所有瀏覽器驗收都改在有真實 GPU 的 headed Chromium 上跑**（每條驗收的輸出都印了 GL 字串）。

---

## 2. 改了哪些檔

### 新增
| 檔案 | 做什麼 |
|---|---|
| `js/bloom.js`（全新，140 行） | 自製半解析度 bloom：場景→全解析度 RT →亮部萃取（半解析度）→兩趟分離式高斯模糊→合成（ACES＋linear→sRGB）。四支 RawShaderMaterial。不用 UnrealBloomPass 的理由寫在檔頭。 |
| `js/duel-figures.js`（全新，330 行） | 對決立體站姿。頭＝既有角色 SVG 圓形頭像（三態貼圖與牌桌共用 `bridge-players.getTexture`），身體＝程序化廟口版畫袍子剪影（垂袖＋粗黑描邊），厚度＝整個人形往鏡頭反方向疊四層、愈後愈暗，逆光＝最後一層燈籠色加色副本。袍子色從角色 SVG 的 `--cloth` 讀出來，不另建色表。 |

### 修改
| 位置 | 一句話 |
|---|---|
| `index.html:224-236` | `body.hitstop` 停格 CSS（`animation-play-state:paused`）＋ `fxBurn` 用的 `burnAway` keyframes＋它的 reduced-motion 條目 |
| `index.html:237-251` | `html.ys3d` 那組：3D 在場時收掉對決的平貼頭像（`visibility:hidden` 保留 172px 佔位框）、對決背景更透、碰撞閃光改成中央亮邊緣透的暖光、名字加描邊 |
| `index.html:2474-2481` | `FX` 參數表（見下節） |
| `index.html:2486-2540` | **演出積木庫**：`fxPower`／`fxHitstop`／`fxPunch`／`fxImpact`／`fxLunge`／`fxFlash`／`fxBurn`／`fxFacOf` |
| `index.html:3236-3241` | `playDuel` 受擊那一拍改成「按順序叫積木」六行 |
| `index.html:1568` | `VERSION` 0.26→**0.27**、`VERSION_NOTE` 換成本批內容 |
| `js/scene-env.js:23,36` | `THREE.Fog`（線性 6→16）換成 `FogExp2`，密度兩段（`FOG_DENSITY`） |
| `js/particles.js:140-330` | 新增 `SPARK_COLOR` 三系色表、`makeLcg`、`createImpactBurst()`（噴發池，沿用既有 Points 系統） |
| `js/camera-director.js:34-39,73-74,116-128,144,155-176` | `ys:fx-punch` 積木接收端：推近＋微震、easeOutCubic 回位；機位補間改成每幀都算（punch 歸零時位置與舊版逐項相同） |
| `js/bridge-players.js:45,66` | `loadSvgText`／`getTexture` 改成 export，給 duel-figures 共用同一份快取與同一套三態規則（防分岔） |
| `js/renderer.js` | 接上 bloom（84 行的軟體 GL 閘門）、hitstop 凍結（126）、`ys:fx-impact` 接收端（99-112）、對決霧與線香煙的兩段補間（153-159）、掛 duel-figures（73）、量測出口 `window.__yaoshi3d`（115） |
| `docs/IMPLEMENTATION_GUIDE.md` | 新增 §11.16「對決大作化 批 1——接手前先知道這七件事」 |

`git diff --stat`：`docs/IMPLEMENTATION_GUIDE.md | 33 +`、`index.html | 118 +`、`js/bridge-players.js | 5`、
`js/camera-director.js | 43`、`js/particles.js | 161 +`、`js/renderer.js | 99`、`js/scene-env.js | 7`
＋新檔 `js/bloom.js`、`js/duel-figures.js`。**`tests/` 零改動、`CFG` 零改動、閘門零改動。**

### 演出積木（使用者中途追加的要求，已照做）
效果全部做成**可重複呼叫、參數化**的積木，`playDuel` 只是第一個組裝它們的地方：

```
fxHitstop(ms)                 停格（回 Promise）
fxPunch(力道)                 鏡頭推近＋微震＋easeOutCubic 回位
fxImpact(pos, 系別, 力道)     命中噴火星；系別＝zuling/xianghuo/yinqi/curse/lantern
fxLunge(勝方id, 敗方id, 力道) 3D 人形：勝方前撞、敗方後仰
fxFlash(元素id)               全螢幕閃光
fxBurn(元素, {ms,fac,pos})    燒燬（焦邊→燒亮→化灰）＋同色灰燼，回 Promise
```
對應的 3D 事件刻意不含「duel」字樣：`ys:hitstop` / `ys:fx-punch` / `ys:fx-impact` / `ys:fx-lunge`。
下一卷《紙紮夜戰》改三拍制＝在每一拍各叫一次，不必回頭改積木。
人形也留了換皮介面：`createDuelFigures(scene, camera, { makeFigure: 你的工廠 })`，工廠回傳
`{group, shadow, setPortrait, setCloth, setRim, ready}` 即可，其餘程式碼一行不動（`js/duel-figures.js:92-105`）。

### 新增的可調參數（全部標【試玩必調】）
| 在哪 | 參數 | 預設 |
|---|---|---|
| `index.html:2474` `FX` | `HITSTOP_MS` | **70**（規格 50–100ms） |
| | `PUNCH` / `IMPACT` / `LUNGE` | 1 / 1 / 1（力道倍率的基準） |
| | `BURN_MS` | 620 |
| | `POWER_MIN` / `POWER_MAX` / `POWER_DMG` | 0.7 / 1.6 / 6（傷害→力道的換算） |
| `js/camera-director.js:34` `PUNCH` | `dist` / `ms` / `shake` / `shakeHz` | **0.6** / 420 / 0.05 / 9 |
| `js/particles.js:149` `BURST` | `count` / `speed` / `spread` / `gravity` / `drag` / `life` / `size` | 110 / 3.1 / 0.6 / 3.2 / 1.8 / 1.05 / 0.2 |
| `js/particles.js:140` `SPARK_COLOR` | 三系＋詛咒＋燈籠的火星色 | 對齊 `theme.css` 的 `--c-*-light` |
| `js/renderer.js:19` `BLOOM` | `strength` / `threshold` / `knee` / `radius` / `scale` | 1.05 / 0.5 / 0.3 / 1.7 / **0.5（＝半解析度）** |
| `js/scene-env.js:23` `FOG_DENSITY` | `table` / `duel` | **0.055 / 0.115** |
| `js/duel-figures.js:25` `FIG` | `pixelH` / `headR` / `bodyH` / `faceTurn` / `layers` / `layerGap` / `rimOpacity` / `rimScale` / `lean` / `lunge*` | 176 / 0.4 / 1.08 / 26° / [1,.42,.22,.1] / 0.055 / 0.26 / 1.11 / 6° / 0.22,0.32,15°,520ms |

---

## 3. 每條驗收：指令原文與實際輸出

### J1 `trace(1..20)` 與 49dba77 逐位元組相等＋反面必不等

比對腳本（`scratchpad/eq.mjs`，用 `tests/tools/load.mjs` 各載一份跑同一支 `trace`）：
```
node scratchpad/eq.mjs scratchpad/old.html <worktree>/index.html
A bytes: 310435  B bytes: 310435
RESULT: 逐位元組相等
```
反面（把 `CFG.LIFE` 50→51 存成 `scratchpad/neg-life51.html`，其他完全不動）：
```
node scratchpad/eq.mjs scratchpad/old.html scratchpad/neg-life51.html
A bytes: 310435  B bytes: 320364
RESULT: 有差異
```
→ 這組比對有鑑別力：改到賽局數值會紅，我這批只動演出層所以綠。

### J2 五套測試＋`Math.random`

```
node tests/conscap.test.mjs    → 通過 5　失敗 0
node tests/aistake.test.mjs    → 通過 8　失敗 0
node tests/nightrules.test.mjs → 結果：16 綠 ／ 0 紅
node tests/review.test.mjs     → 通過 28　失敗 0
node tests/wish16.test.mjs     → 結果：PASS=36 FAIL=0
```
```
grep -c "Math.random" index.html          → 0
grep -ro "Math.random" js/ | wc -l        → 18   （49dba77 是 16）
```
**多的 2 個都在註解裡，程式碼一個都沒加。** 逐檔：`bloom.js`／`bridge-players.js`／`camera-director.js`／
`characters-billboard.js`／`duel-figures.js`／`renderer.js`／`scene-env.js` 全部 0；只有 `js/particles.js` 有，
共 18 處＝**15 處程式碼（既有，未動）＋3 處註解**：
- 既有程式碼 15 處：`createIncenseSmoke` 的 spawn（111,112,114,116,118,119,120）與 `createEmbers` 的 spawn（294,295,296,297,299,302,303,304）
- 註解 3 處：檔頭第 2 行（既有）＋我新增的第 135、137 行（寫明「既有債，新程式碼不再增加」）
- 新增的噴發池用自帶的決定性 LCG（`js/particles.js:151 makeLcg`），種子由呼叫端給，**零 Math.random**

### J3 Playwright 844×390 實跑對決、console 0 error、事件序

驅動法：真實點擊「單人入市」→ 第一張角色卡 →「入市」，之後**只按 `#stage button`，沒有才按 `#mainbtn`**
（沒有硬呼叫任何演出函式）。輸出（headed Chromium）：
```
GL: ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)
bloomOn: True | errors: 0 | duels: 4
evSeq: ys:reveal ×4  ys:duel  ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact ys:fx-lunge  ys:duel-end
       ys:duel  ys:hitstop(70) ys:hitstop(0) ys:fx-punch ys:fx-impact ys:fx-lunge  ys:duel-end  ys:table
       ys:reveal ×3  ys:duel ... ys:duel-end   ys:duel ... ys:duel-end
```
→ `ys:duel` → `ys:duel-end` 四場全部成對且順序正確；停格永遠在噴效果之前（`hitstop(70)`→`hitstop(0)`→punch/impact/lunge）。
`requestfailed` 監聽也是 0（沒有任何資源 404）。

### J4 效能與記憶體

同一次跑動裡量的（每秒一格 rAF 計數，只取 `ys:duel`~`ys:duel-end` 之間那幾格）：
```
duelFps: 120,132,129,129,132,131,130,129,130,131   （最低 120／秒，門檻 50）
全程 rAF 最低值 allFpsMin: 114
```
記憶體／資源不累積——連跑 **6 場**對決，每場結束各拍一次：
```
duel1 : geometries=15 textures=6 heap=8517913
duel2 : geometries=15 textures=8 heap=8444477
duel3 : geometries=15 textures=8 heap=8540167
duel4 : geometries=15 textures=8 heap=7942703
duel5 : geometries=15 textures=8 heap=8556113
duel6 : geometries=15 textures=8 heap=9061109
duelFps min（6 場）: 117
```
→ `geometries` 全程 15 不動；`textures` 在第 2 場之後停在 8（角色三態貼圖是 `roleId:state` 快取，
上限＝角色數×3，不隨場次成長）；`heap` 在 7.94M–9.06M 之間上下震盪，**不是單調上升**。

### J5 hitstop 活性

量測位置＝`body.hitstop` 這個 class 的加上／移除（那就是真正讓 CSS 動畫停格的東西），用 `MutationObserver`
配 `performance.now()`；**這一輪沒有任何 setTimeout 加速治具，是原速實測**：
```
hitstop 區間：76.4ms / 77.1ms / 75.3ms / 75.1ms      （規格 50–100ms）
```
同時證明 3D 真的凍住（不是只有 DOM）——每幀取線香煙第 0 顆的 y 座標：
```
  停格核心窗（class 加上後 2ms ~ 65ms）內 y 的變化量 core = 0 / 0 / 0 / 0
  對照組（停格「之前」同樣長度的窗）        ctrl = 0.02475 / 0.02714 / 0.02522 / 0.02923
  停格期間 renderer 仍 render 的幀數 framesRendered = 45 / 45 / 40 / 45
```
→ 停格期間場景時間前進量正好 0，而同長度的對照窗前進 0.025 世界單位；rAF 與 render 照跑（沒有靠停掉迴圈假裝凍住）。
（76ms > 70ms 是因為 `body` class 由 `setTimeout` 移除、比 3D 的解凍時刻晚幾毫秒；核心窗刻意取在 65ms 以內。）

**SKIP=true**：
```
errors: 0 | duels: 4 | hitstop 區間數: 0
evSeq: ys:reveal ×3  ys:duel ys:duel-end  ys:duel ys:duel-end  ys:table  ys:reveal ×2  ys:duel ys:duel-end  ys:duel ys:duel-end
```
→ 快轉時 hitstop／punch／噴發／lunge **全部不發生**（區間數 0，總長 0ms ≤ 300ms）。

### J6 截圖自審（四個時點 × 兩組解析度）

截圖時點由事件觸發（`ys:duel`+900ms／`ys:hitstop`／`ys:fx-impact`+130ms／`ys:fx-impact`+600ms），
在同一個 node 行程裡直接 `page.screenshot()`。**「命中停格」那一張為了拍得到，把 60–90ms 這一段排程放慢
30 倍（＝只有 hitstop 那一支）**，畫面內容與 70ms 版本是同一格，其餘時點原速。

844×390：
- `scratchpad/duel-844-1-charge.png`（蓄力）
- `scratchpad/duel-844-2-hitstop.png`（命中停格）
- `scratchpad/duel-844-3-spark.png`（粒子噴出）
- `scratchpad/duel-844-4-end.png`（結束）

1268×828：`scratchpad/duel-1268-1-charge.png` / `-2-hitstop.png` / `-3-spark.png` / `-4-end.png`

**自審清單：我看過之後認定最粗糙的三處，以及修法**（修前存在 `scratchpad/duel-pre-844-*.png`，同樣四個時點）：

| # | 修前的問題 | 修法 | 修前／修後對照 |
|---|---|---|---|
| 1 | **命中那一格整片泛白**：`#flashfx` 原本是整片 `#fff` 開到 0.85，疊上 bloom 與人形逆光之後，火星、人臉、袍子全被洗成乳白色，看不出「打到誰」 | 3D 在場時換成中央亮、邊緣透的暖光徑向漸層，峰值 .85→**.5**、時長 .35s→**.26s**（`index.html:247-249`） | `duel-pre-844-3-spark.png` ↔ `duel-844-3-spark.png` |
| 2 | **線香煙變成擋臉的灰斑**：對決機位貼著桌面，既有的線香煙從鏡頭前飄過去，在兩個人臉上糊出一團團大灰點 | 對決時把煙的不透明度補間壓到 22%，回牌桌自動恢復（`js/renderer.js:153-159`）。牌桌機位遠，那裡的煙是氛圍，不動 | `duel-pre-844-2-hitstop.png` ↔ `duel-844-2-hitstop.png` |
| 3 | **逆光變成貼在身上的一條硬金邊**：rim 只放大 1.055、亮度 0.42，而且是以腳底為樞紐放大，所以只在單側露出一條硬邊，讀起來像描邊不像光 | 亮度 0.42→**0.26**、放大 1.055→**1.11**、樞紐改成人形中段 `rimPivotY:0.85`；受擊爆閃 +0.85→+0.6（`js/duel-figures.js:34-36,113`）。順手把火星加大（size .15→.2、speed 2.6→3.1、count 96→110），打擊點才讀得出來 | `duel-pre-844-*.png` ↔ `duel-844-*.png` |

**第四件（在 1268×828 才看得到，一併修掉）**：人形原本用固定的世界單位高度，在 390px 高的手機剛好，
到 828px 高的桌機就變成兩個巨人、把 DOM 的名字整個蓋掉。改成用 **CSS 像素**換算（`FIG.pixelH=176`，
與 `.fav` 佔位框同高），火星也跟著同一個尺度倍率縮放（`js/renderer.js:99` 的 `fxScale()`）。
人形的水平位置本來就是對齊 DOM `#dL`／`#dR` 欄位中心算的，所以名字、戰力、人形在任何視窗大小下都對得上。

過程中另外修掉的兩件（不列入上面三件，因為是實作中期發現不是最後自審）：
- 人形原本只有「頭＋沒有袖子的梯形袍」，讀起來像不倒翁 → 剪影加上垂袖（`js/duel-figures.js:66-84`）
- 人形原本正對鏡頭，加厚那四層完全被前層擋住、看不出厚度 → 改成側身 26°（`FIG.faceTurn`），
  同時也讀成「面向對手」

### J7 牌桌畫面不受影響

同一支腳本、同一顆種子（`newGame('solo',7)`）跑新舊兩版，844×390：

| | v0.27（本批） | 49dba77（基準） |
|---|---|---|
| 盯上頁 `#felt` 溢出 | **X=0, Y=0** | X=0, Y=0 |
| 出價頁 `#felt` 溢出 | **X=0, Y=0** | X=0, Y=0 |
| `#south` | x=4 y=324 w=836 h=62 | x=4 y=324 w=836 h=62 |
| `#seat1` | x=262 y=4 w=320 h=56 | x=262 y=4 w=320 h=56 |
| `#seat2` | x=4 y=145 w=120 h=94 | x=4 y=145 w=120 h=94 |
| `#seat3` | x=720 y=145 w=120 h=94 | x=720 y=145 w=120 h=94 |
| 舞台文字 | 「👁 盯上宣告…」／「🔮 明夜預告：「冥婚紅包」…」 | 完全相同 |
| console error | 0 | 0 |

截圖：`scratchpad/j7-new-mark.png` / `j7-new-bid.png` ↔ `scratchpad/j7-base-mark.png` / `j7-base-bid.png`。
**四張座位卡與所有 DOM 逐項相同。** 唯一看得出的差別是 3D 背景：霧從線性 `Fog(6,16)` 換成
`FogExp2(0.055)`，桌沿的暗度分布略有不同（刻意把牌桌那一段密度取得保守就是為了這個）。
這是有意識的改動，不是意外——`FOG_DENSITY.table` 動了就要重看這組對照。

### J8 3D 未載入的退化

作法：用 Playwright 路由攔截把 `index.html` 裡 `<script type="module" src="js/renderer.js"></script>`
那一行換成註解再送給瀏覽器（**檔案本身完全沒動，跑完自然還原**），然後打到一場真的對決：
```
strippedTag: true          （確認真的有拿掉那一行）
duels: 1
duelSeen: { ys3d:false, canvases:0, fighters:2, avSvg:2, favVisibility:"visible",
            names:["青面攤主","獵人"], pw:["-4","8"] }
lastResult: { result:"獵人 勝！青面攤主 −5 壽命", sub:"戰力差 12 → 傷害 3＋2＝5" }
errors: []
```
→ 沒有 canvas、`html` 上沒有 `ys3d`，所以 DOM 的平貼頭像**照常顯示**（`favVisibility: visible`、兩張 SVG 都在），
兩名對戰者的名字、戰力、勝負文字、傷害公式全在，console 0 error。截圖 `scratchpad/j8-no3d-duel.png`。

---

## 4. 做不到／要你知道的事

1. **bloom 在軟體 GL 上不開**（見第 1 節）。真機（手機、你的筆電）都是真實 GPU，不受影響；
   但如果哪天在某台 Android 上看到對決沒有光暈，先查那台是不是掉進了 WebView 的軟解退路。
   我沒有真手機可測，**「手機效能守住」這條只有 844×390 視窗＋真實 GPU 的數字（對決 120–132 rAF/秒），
   不是真手機實測**。
2. **`VERSION` 撞號風險**：我 bump 到 `0.27`。驗收期間發現同一個 Playwright 瀏覽器上有另一條線在跑
   `localhost:8765` 的妖市 **v0.27.1 / v0.27.2**——代表有另一批工作也在改版本號。合併時要挑一個不衝突的號。
3. **`window.__yaoshi3d` 是新的量測出口**（`js/renderer.js:115`），角色與 `window.__yaoshi` 相同：
   只讀不寫、遊戲本身不依賴它。J4 要讀 `renderer.info` 的 geometries/textures、J5 要取粒子座標，都靠它。
   不想留就要另想辦法量這兩件事。
4. **對決 DOM 的頭像在 3D 在場時是 `visibility:hidden` 不是 `display:none`**——那個 172px 的空框是
   3D 人形的佔位，拿掉會讓名字與戰力整排往上塌。
5. **沒做**：牌桌場景的 bloom／陰影（`castShadow`）／桌面材質貼圖／開標與局末場景的積木化。批 1 的範圍就是對決。

## 5. 建議下一批（列出但沒做）

1. **《紙紮夜戰》三拍制**：積木與換皮介面都備好了，做的是「時間軸」與「紙紮人形工廠」，不必再動效果本身。
2. **牌桌也吃 bloom＋陰影**：現在牌桌是直接 render。要開的話得先量牌桌那一段的 rAF（對決能跑 120+，
   但牌桌同時有四張半透明面板在合成，成本結構不同），而且會動到 J7 的對照基準。
3. **桌面材質**：現在是單色八角柱，低角度看是一片紅棕色圓頂。一張木紋／布紋 normal map 的投報率很高。
4. **`fxBurn` 目前沒有任何呼叫點**（積木已寫好並掛上 keyframes，但這一批沒有要燒的東西）。
   下一卷用它燒紙紮人時，記得那是本批唯一**還沒在真實流程上跑過**的積木。
5. **`SHOW_SEAT_FIGURES`**：牌桌仍然不畫 3D 人，維持原判定。若之後想在牌桌也用立體站姿，
   要先解決「同一張臉出現兩次」（DOM 座位卡也有頭像）。
