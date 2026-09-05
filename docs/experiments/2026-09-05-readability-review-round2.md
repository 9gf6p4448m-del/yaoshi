# 演出可讀性小卷（303ac93）對抗式覆審——第 2 輪：反駁「我已修好」

**真的修好 1（H-1）／表面修好 2（H-2、H-3）／沒修到 0。新 finding：CRITICAL 0、HIGH 0、MEDIUM 3、LOW 4。**
（H-2／H-3 的「表面修好」本身即等同未結案的 HIGH，不另外重複計入新 finding。）

範圍：`git diff 7bf2672..303ac93`。基準：凍結檔 `docs/experiments/2026-09-05-acceptance-duel-readability.md`、
第 1 輪報告 `docs/experiments/2026-09-05-readability-review-round1.md`、實作者報告 `docs/experiments/2026-09-05-duel-readability-report.md`。
本輪未修改 repo 任何檔案；探針與產物全在 scratchpad（清單見文末）。實跑一律 844×390、AMD 780M、埠 8961–8966。

---

## H-1 字幕靠出招側 —— 真的修好

### 證實方式
1. **實跑**（沿用報告自己的量法）：`node tests/tools/duel-drive.mjs "http://127.0.0.1:8961/index.html?paperwar=1&fxcount=1&seed=20260905" review5-drive.json --duels=4 --port=8961` → `review5-drive.json`，7/7 筆招式的 `moves[].geo`：

   | side | 字心 textCx | dL | dR | 畫面中心 |
   |---|---|---|---|---|
   | A（2 筆） | **261.6** | 316.7／295.7 | 527.3 | 422 |
   | B（5 筆） | **582.4** | 316.7／295.7 | 527.3 | 422 |

   第 1 輪量到的是 A=446／B=398（方向相反、比置中還遠）。現在 A 在畫面左半、B 在右半，離自己那一欄 55px、離對面那一欄 265px，置中版是 105px。**方向錯反已消失。**
2. **讀碼**（`index.html:236-239`）：`#duel` 在 OFF 與 `.pw` 兩種狀態的 `align-items` 都是 `center`（實測 `review5-cap.json` 六個視窗皆 `off=center / on=center`），但 `#duelMove` 是 `#duel` 的**直接子元素**（`index.html:421-426`），所以 `align-self:flex-start|flex-end` 生效、覆寫 `align-items`。OFF 模式 `#duelBeat,#duelMove{display:none}`（`index.html:230`，實測 `off=display:none`），新規則不會外洩到 OFF 退路。
3. **別的視窗會不會反過來？結構上不可能。** `width:62%` 加 `align-self:flex-start` 使 side-A 盒子恆為 `[0, 0.62W]`、字心恆在 `0.31W`；side-B 恆在 `0.69W`。`#duelArena` 是置中 flex row，`dL` 中心恆小於 `W/2`、`dR` 中心恆大於 `W/2`。因 `0.31W < W/2`，A 的字心到 dL 的距離恆小於到 dR（B 對稱）。實測六個視窗（844×390／740×360／667×375／568×320／390×844／1280×720）字心一律 `0.31W`／`0.69W`（`review5-cap.json`）。

### 順帶查過、沒問題
- **62% 折行沒把 C-4 撐破**：用真表最長字串（`who=大家樂組頭`、`item=巴冷公主珠鍊`、`move=鱗紋護體`、`desc=三拍：燒掉對面 1 隻小兵、本方也燒 1 隻`）量，`.mvline` 只有 221px，62% 盒子最窄的一次（390 寬）仍有 241.8px；六個視窗全部 `scrollHeight == clientHeight`、元素高固定 36px（兩行、未折行）。真對決 7 筆的 `scroll` 也全是 `[390,390]`。

---

## H-2 排數自適應 —— 表面修好

### 修好的那一半（已獨立複驗）
`duel-perf.mjs lineup review5-elite3.json --unitsa=bow:elite,sword:elite,tiger:elite --unitsb=同 --lunge=2 --port=8961`
→ B 側 `minPair 0.553`（第 1 輪同一牌組是 **0.341**）、`gap 0.416`、`maxR 1.469`。第 1 輪 H-2 點名的「三精英同排糊成一團」確實解掉了。

### 沒修好的那一半：逃生門把「同排擠」換成「同一列前後擠」，破的是同一條 R-3
- **`js/duel-figures.js:531`**：`if (m > 1 && s < FIG.rowMinStep) P.ok = false;` —— `m === 1`（每排一尊）時**不檢查任何東西**，所以 `rows === n` 這個終點恆為 `ok`。
- **`js/duel-figures.js:518`**：`gap = Math.min(FIG.rowGap3d, FIG.rowSpanMax / (rows - 1))` —— `rows` 加到 n 時 `gap = 2.0/(n−1)`：n=7 得 **0.333**、n=8 得 **0.286**，遠低於 R-3 的 0.50，而且**沒有任何一行在檢查排距**（`rowMinStep` 只管排內橫向）。
- **`js/duel-figures.js:543`**：`while (!plan.ok && rows < n) { rows++; plan = layout(rows); }` —— 瓶頸每一級都是同一排（最前排 depth 1.0 最窄），所以實測一路衝到 `rows = n`，不會停在中間。

**實跑（844×390＝凍結檔自己的視窗；R-3 的 `minPair` 是含深度的世界平面距離，`tests/tools/duel-perf.mjs:192`）**

| 名冊（皆 `--lunge=2`） | rows | 排距 | **minPair** | R-3 門檻 0.50 | 檔 |
|---|---|---|---|---|---|
| 7 件 POOL 真 elite 法寶（射日神弓・虎爺印・王爺劍・獻祭刀・巴冷公主珠鍊・雷女之火・虎姑婆指甲） | 7 | 0.333 | **0.351** | 不過 | `review5-real7.json` |
| 8 件 ab 全 elite（tiger,boartusk,bow,fushou,sword,shanshen,balen,xianji） | 8 | 0.286 | **0.303** | 不過 | `review5-elite8b.json` |
| 8 尊虎爺印 | 8 | 0.286 | **0.286／0.288** | 不過 | `review5-tiger8.json` |
| 8 件 ab 全 elite（bow,sword,tiger,fushou,shanshen,balen,boartusk,xianji） | 4 | 0.667 | 0.549 | 過 | `review5-elite8.json` |

第 1 列與第 4 列的差別只有**名冊順序**：`order` 只按 `bodyScale` 排（`js/duel-figures.js:512`），八尊同為 elite 時等於名冊順序，所以「虎爺印（腳印 0.694）落在最前排」純看玩家先買哪一件。最前排一旦是「腳印大於 0.288 的一尊 加 虎爺印」，`W < 0.55` 就升排，直落 rows = n。
第 1 列是**完全真實的牌組**（七件都在 POOL、`unit.body === "elite"`、`count:1`，見 `index.html:1587/1589/1594/1597/1601` 等），不是治具捏造的體型。

**視覺後果**：rows=8 時八尊排成一路縱隊、前後距 0.286，而虎爺印的腳印直徑就有 1.39——第 1 輪 H-2 截圖那個「糊成一團」轉 90 度又回來了（`review5-tiger8.json` 八尊的 lat 只在 1.058／1.16 兩個值間交錯）。

**修法建議**：`P.ok` 對 `m === 1` 的排也要檢查 `gap ≥ rowMinStep`；`rows` 的天花板應是 `floor(rowSpanMax/rowMinStep)+1 = 5`，超過就得縮 `crowd`／收 `rimMax`／降體型，而不是無限加排。

### 第三問 `footOf` 讀上一幀 → 會不會跳排：機制在、我沒重現到（列為 LOW-2）
- **碼實**：`plan` 每幀在 `update()` 內重算（`js/duel-figures.js:503-543`），無記憶、無 hysteresis；`footOf`（`:508`）讀 `g.shadow.scale.x`，該值本幀要到 `:619` 才寫；池子新建時是 1（影子半徑 0.42，creature 載入後才換成模型腳印，`js/creature-figures.js:250,291`）。
- **實測**：`review5-flap-boartusk.json`（220 幀）腳印在**同一場內**由 0.499 掉到 0.449（負 10%；來源是 camera-director 移鏡頭導致 `realign()` 重算 `pxWorld`／`figScale3d`，`js/duel-figures.js:461-463`）；`review5-frames.json` 另量到 tiger 0.694 掉到 0.639。腳印會漂，`rows` 這個離散量原則上會跟著跳。
- 但三組實跑（boartusk 八尊、sword/tiger 交錯八尊、shanshen 開頭八尊）的 `rowsSeen` 都只有單一值，**沒跳**。臨界腳印約 0.519（解 `sqrt((2.15−f)²−1) = 0.77+f`），實測名冊都不在漂動區間內。
- 池子重用的第一幀也沒抓到錯排（`review5-frames.json` 的 `sword-reuse` 第一個取樣點 t=56ms 已是穩態 4 排）——`f.ready()` 之前不畫（`:569`）擋掉大部分。
- 結論：**不宣稱重現**；但第 1 輪 L-3 的殺傷力已從「站位差幾公分」升級成「整組換排數」，建議 `rows` 記在 plan 上、只在名冊或視窗變更時重算。

---

## H-3 撞擊夾限 —— 表面修好

### 第一問 夾 x 沒夾 depth：這點成立，不是問題
`push` 只有橫向：`js/duel-figures.js:594` 的 `push` 只加進 `x`（`:609`），`depth` 由 plan 決定、撞擊不動它。夾限 `lim = sqrt((rimMax−foot)²−depth²)`（`:612`）因此保證 `x²+depth² ≤ (rimMax−foot)²`，即 `r + foot ≤ 2.15`。實跑 `review5-frames.json`（八尊王爺劍、power 2、83 幀逐尊）最大 `r+foot = 2.150`，剛好貼齊 `rimMax`，夾限確實在咬。

### 第二問 `--lunge=2` 打得到真對決上限：成立
`js/duel-figures.js:424`：`hitPower = Math.max(0.3, Math.min(2, Number(d.power) || 1))`。真對決的 power 再大也被夾在 2。

### 但這三件讓它只算表面修好

**(a) `n ≤ 2` 完全沒夾，而第 1 輪 H-3 的實測峰值正落在那裡。**
`:612` 的夾限包在 `if (plan)` 裡，`plan` 只在 `n ≥ 3` 建（`:504`）。實跑
`lineup review5-2v2.json --unitsa=tiger:elite,fushou:elite --unitsb=同 --lunge=2 --port=8965`：
撞擊逐幀 **maxR 2.092**、**腳印外緣 3.059**（八邊形內切半徑 3.14）；靜態 **gap −0.12**（兩側腳印已在中線交錯）。
第 1 輪量到的真對決峰值 2.443 與 17 幀超過 2.20 就是 n=2 那一側，**這一輪原樣重現**；使用者原始回饋「站到紅色區塊外」在最常見的小編制上仍看得到。
碼裡的理由「n≤2 不夾（R-4）」**不成立**：報告自己的 R-4 證據行寫的是「治具頁（**固定時鐘、無撞擊**）對 `fae1eec` worktree 逐尊比」——R-4 根本不在撞擊中量，替 n≤2 加撞擊夾限動不到 R-4 任何一個數字。

**(b) 只夾外側，勝方往中央撞沒夾，兩側在中央重疊。**
`:612` 是 `if (side * x > lim) x = side * lim`，只擋外推；勝方 `push = −side*lungeIn*kick*hitPower*sc`（`:594`）往中線去、無上限。實測 `lunge.minGap`：三精英 3v3 **−0.095**、2v2 **−0.124**（負代表交錯），即撞擊當下兩側腳印壓過中線——正是凍結檔開宗明義要修的「兩側在中央交錯把 VS 蓋掉」。committed 五組（0.42 到 0.65）沒踩到，是因為那五組用的是混編治具名冊。

**(c) 第三問「新量法比較嚴」：我只同意一半。**
- **同意**：新法（非對決座位、自派 power=2、兩個方向、每幀取最大）在力道與相位這個維度上**支配**舊法（同座位、單一時刻、power 不超過 2 的隨機一幀）。
- **不同意**：新法同時把**母體**改小了。`tests/tools/duel-perf.mjs:186` 與 `:172` 都加了 `.filter((f) => f.group.visible)`，被真對決 `ys:fx-burn` 燒掉的尊直接不算。實測 committed 五個證據檔，**A 側每一組都少一尊**：

  | 檔 | 宣稱編制 | 實際量到 |
  |---|---|---|
  | `lineup-lunge-3v3.json` | 3v3 | **2**v3 |
  | `lineup-lunge-4v4.json` | 4v4 | **3**v4 |
  | `lineup-lunge-5v7.json` | 5v7 | **4**v7 |
  | `lineup-lunge-6v6.json` | 6v6 | **5**v6 |
  | `lineup-lunge-8v8.json` | 8v8 | **7**v8 |

  我自己跑的六組也一樣（A 側 n=1/2/3/6/7/7）。R-2 與 R-3 的條文是「同四組**每尊**」——這一版證據對 A 側每組各有一尊**完全沒量到**。
  **舊法會抓到、新法會放過的具體情境**：燒掉那尊的位置雖然凍住，但那組座標是同一個 `plan` 算出來的合法站位（`n` 不因燒毀縮水，第 1 輪 L-4），所以若排法把它擺到 `r = 2.3`，舊法（不濾 visible）會把它算進 `maxR` 而變紅，新法直接跳過、照樣印過關。以三精英 3v3 為例，A 側只量到 2 尊，而 R-3 這條要守的正是「三尊擠一排」。
  另外這是**凍結後第二次改量法**（第一次是換座位，第 1 輪 H-3 已點名缺 §2.1 的改前與改後對照），這次同樣只有報告第 44 行一句附註、沒有對照數字、沒有使用者簽准。

**修法建議**：合成名冊改用不會被真對決燒到的 unit id（或在合成前清 `burnState`），母體回到 n；`visible` 只在排除已演完的燒毀時用，並把 `n` 一起印進報告表格。

---

## 新 finding

### MEDIUM-1 證據母體被 `group.visible` 濾掉一尊（每組 A 側），R-1/R-2/R-3 的「每尊」不成立
見 H-3(c)。`tests/tools/duel-perf.mjs:186,172`。這同時是**驗收條件的量測位置被改動而未走 02 §2.1**。

### MEDIUM-2 撞擊只夾外側、內側無限制，兩側腳印在中線交錯
見 H-3(b)。`js/duel-figures.js:594,612`。實測 `lunge.minGap` −0.095（三精英 3v3）與 −0.124（2v2）。

### MEDIUM-3 `n ≤ 2` 沒有任何撞擊夾限，第 1 輪的峰值原樣重現
見 H-3(a)。`js/duel-figures.js:504,612`。實測 2v2 撞擊 `maxR 2.092`、腳印外緣 **3.059**。
不列 HIGH 的理由：R-2 條文只綁 8v8/6v6/4v4/3v3 四組，形式上沒違反；但它正面命中使用者原始回饋，且「R-4 所以不能夾」的理由不成立，需使用者裁定要不要納入。

### LOW-1 字幕錨在視窗比例、不是欄位中心，寬視窗會比置中更遠
字心恆為 `0.31W／0.69W`（`index.html:238-239`），完全不看 `dL/dR`。844×390 時離自己那欄 55px（優於置中的 105px）；1280×720 時欄位中心約 535／745、字心 397／883，離自己那欄約 138px，**比置中（105px）還遠**（方向仍正確）。`index.html:236-237` 註解寫「字的中心落在該側欄位附近」在寬視窗不成立。手機橫向（專案真機情境，直式另有 `index.html:39` 的 `#rotateHint`）沒問題。

### LOW-2 `rows` 逐幀重算、無 hysteresis，而腳印會隨鏡頭移動漂正負 10%
見 H-2 第三問。`js/duel-figures.js:503-543,508,461-463`。機制齊備、臨界值 f 約 0.519 算得出來，但三組實跑沒觸發，不宣稱重現。

### LOW-3 committed 3v3 證據有一幀 `r + foot = 2.22`，超過 rimMax 2.15
`lineup-lunge-3v3.json` 的 `lunge.maxEdge = 2.22`（6v6 是 2.194），而夾限的設計上限是 2.15（我自己的八尊 sword 實測剛好 2.150）。代表那一幀「夾限用的 foot」與「量到的 foot」不同幀，兩個候選：夾限跨幀讀 `shadow.scale.x`（同 LOW-2 根因），或 `st.custom` 的燒毀中那尊在 `:581` 就 `continue`、沒過夾限卻仍 `visible`。我沒有逐幀證實是哪一個。**不影響判定**：R-2 量的是中心 `r`（不超過 1.99），不是腳印外緣。

### LOW-4 `--units` 的系別一律退 `zuling`
`tests/tools/duel-perf.mjs:161`：`fac: fac[ab] || 'zuling'`，而 `FAC` 只有 HEAVY 那 8 隻。`sword`（POOL 是 `xianghuo`，`index.html:1597`）、`tiger`（`xianghuo`，`:1601`）在治具裡都成了 `zuling`。只影響邊光顏色與系別特效，**不影響任何幾何量測**；但拿 `lineup-*.png` 當視覺基準會看到錯的顏色。

---

## `--units` 對 `tiger` 的解析：正確
`parseUnits`（`tests/tools/duel-perf.mjs:161`）把 `tiger:elite` 解成 `{ab:'tiger', body:'elite'}`；`js/renderer.js:90` 用 `creatureGlbUrl(u.ab)`，`js/creature-figures.js:82` 的 `CREATURE_GLB = { tiger: 'tiger_c' }` 轉成 `tiger_c.glb`。
實跑佐證：`review5-elite8.json` 裡 tiger 腳印 0.694，與其他 ab（0.184 到 0.499）明顯不同，代表真的載到那個模型；`duel-drive` 有收 `requestfailed`（`tests/tools/duel-drive.mjs:121`），六次跑全部 `errors: 0`，沒有 404 退 fallback。

---

## 探針與產物（全在 scratchpad，未動 repo）
- `review5-drive.json` — H-1 真對決 7 筆字幕 geo（`duel-drive.mjs`，seed 20260905，埠 8961）
- `review5-cap.mjs` 與 `review5-cap.json` — H-1 六視窗靜態幾何、OFF/ON align-items、最長字串折行（埠 8966）
- `review5-elite3.json`（三精英）、`review5-elite8.json`、`review5-elite8b.json`、`review5-tiger8.json`、`review5-real7.json`（七件真 elite）、`review5-2v2.json` — `duel-perf lineup --lunge=2`，埠 8961 到 8965
- `review5-frames.mjs` 與 `review5-frames.json` — 逐幀列陣與撞擊逐尊明細（池子重用、maxEdge 歸因，埠 8966）
- `review5-flap.mjs`、`review5-flap-boartusk.json`、`review5-flap-swordtiger.json`、`review5-flap-shanshen.json` — 跳排偵測（埠 8966）
