# 演出可讀性小卷（v0.34 / e2ce81f）對抗式覆審——一輪

**CRITICAL 0、HIGH 3、MEDIUM 3、LOW 4。**

範圍：`git diff f5492bb..e2ce81f -- index.html js/duel-figures.js js/trait-fx.js js/renderer.js tests/tools/`。
凍結檔 `docs/experiments/2026-09-05-acceptance-duel-readability.md`、報告 `docs/experiments/2026-09-05-duel-readability-report.md`。
本輪探針全在 scratchpad，未動 repo 任何檔案。

---

## HIGH

### H-1 招式字幕「靠出招側」方向完全相反——出招方在左，字幕往右靠

- **情境**：任何一筆招式字幕。C-1 只驗 class 名（`side-A|side-B`），沒有驗字幕實際落在畫面哪一側，所以這個反向在 7/7 全綠下存活。
- **`index.html:236`**

  ```css
  #duel.pw #duelMove.side-A{text-align:left;padding-left:6%} #duel.pw #duelMove.side-B{text-align:right;padding-right:6%}
  ```

- **為什麼反**：`#duel` 是 `flex-direction:column; align-items:center`（`index.html:204-205`），`#duelMove` 是 cross-size auto 的 flex item，寬度＝shrink-to-fit＝**文字寬＋padding**，整個盒子置中。side-A 加左內距 → 盒子變寬、文字被推到盒子的**右**緣，盒子又置中 → 文字淨往右位移 padding/2；side-B 同理往左。而 A＝`#dL`＝畫面左欄（`index.html:3975` 的 `tag==="A"?"dL":"dR"`，dL 是 `#duelArena` flex row 的第一個子元素）。
- **實跑**（`scratchpad/review4-capreal.mjs`，844×390，**報告自己那組 `seed=20260905` 的同 7 筆招式**）：

  | side | dL 中心 | dR 中心 | 畫面中心 | 字幕文字中心 | 離「該靠的欄」 | 置中時 |
  |---|---|---|---|---|---|---|
  | A | 317 | 527 | 422 | **446** | 129 | 105 |
  | B | 317 | 527 | 422 | **398** | 129 | 105 |
  | B | 317 | 527 | 422 | 407 | 120 | 105 |

  7 筆全部「離目標欄比置中還遠」。另在乾淨頁面直接呼叫 `pwMoveCap()` 複驗（`scratchpad/review4-cap.mjs`）：844 寬時置中版 textMid=422、side-A=447、side-B=398。
- **順帶**：位移量只有 padding/2＝25px（390 寬直式只有 12px），就算把方向修對也讀不出「靠向誰」。
- **修法**：別用 padding 推 shrink-to-fit 的盒子。把 `#duelMove` 撐滿寬（`align-self:stretch` 或 `width:100%`）再用 `text-align:left/right` ＋ `padding-inline` 定位；並補一條「字幕文字中心比置中更靠近出招方欄位中心」的量測進 C-1，不要只驗 class 名。

### H-2 R-3「同側不疊」在驗收自己的視窗、用真實牌組就不成立（三尊疊成一坨）

- **情境**：一側的名冊是三件 elite 法寶（射日神弓 `bow` ＋ 王爺劍 `sword` ＋ 虎爺印 `tiger`，POOL 各 `elite×1`）＝ n=3 走「一排三尊」。
- **`js/duel-figures.js:512-516`**

  ```js
  const W = Math.max(0, hi - lo - fIn - fOut);
  const s = m <= 1 ? step0 : Math.min(W / (2 * need), Math.max(step0, FIG.rowMinStep));
  ```

  `s` 只有上限沒有下限：腳印一大 `W` 就被吃光，`rowMinStep=0.55` 這個「保證」直接被 `Math.min` 丟掉。
- **實跑**（`scratchpad/review4-lineup.mjs`，**844×390＝驗收自己的視窗**，量法逐字沿用 `duel-perf lineup`）：

  | 名冊 | maxFoot | **minPair** | R-3 門檻 |
  |---|---|---|---|
  | bow+sword+tiger（皆 elite，n=3） | 0.941 | **0.341** | 0.50 ✗ |
  | boat×3 body=elite（n=3） | 0.770 | **0.390** | ✗ |
  | boat×4 body=elite（n=4） | 0.763 | **0.308** | ✗ |
  | 全 elite 貼片 n=3 @780×360 / 330 / 300 | 0.519/0.554/0.617 | **0.489 / 0.457 / 0.402** | ✗ |
  | boat×3 body=elite @780×330 | 1.011 | **0.000** | ✗（退化） |

  截圖 `scratchpad/review4-elite3.png`：左側三尊完全糊成一團，看不出是三隻——正是本卷要修的那個症狀。
  `minPair=0.000` 是退化分支：`fIn+fOut > hi-lo` → `W=0` → `s=0`，`js/duel-figures.js:516` 的 `c=(lo+hi)/2` 把整排壓成一個點；n=3 時第 0、2 尊連 `depth`（`(j%2?1:-1)`）都同號，**兩尊世界座標完全相同**。
- **為什麼證據沒抓到**：`tests/tools/duel-perf.mjs:158` 的 `mk()` 是 `i%3` 循環 elite/swarm/ward、`k%8` 循環 ab，所以**同一排兩端永遠不會同時是大模型**。R-1~R-3 的五組證據（3v3/4v4/6v6/8v8/5v7）全是這種混編，等於沒測到最壞名冊。
- **另外**：本卷的 clamp 常數（`centerGap` `rimMax` `rowMinStep` `rowGap3d`，`js/duel-figures.js:80-87`）是**絕對世界單位**，腳印卻隨 `pxWorld ∝ 1/視窗高` 放大——視窗越矮破口越大，而所有證據只有 390 高一組。
- **修法**：`s` 補下限，塞不下時**改排法**（`rows++` 或 `perRow` 降到 1）而不是壓 `s`；退化分支不得讓同排同深度兩尊落在同座標。驗收側：`mk()` 加一組「同排兩端都是最大腳印」的最壞名冊，並至少加一個矮視窗（360 或 330 高）。

### H-3 R-2「不踩桌緣 r ≤ 2.20」的量法在本 commit 被改成排除撞擊位移，而撞擊正是把最外那尊推出去的機制

- **`tests/tools/duel-perf.mjs:159-161`**（本次新增）

  ```js
  // 用「不在真對決裡」的兩個座位：ys:fx-lunge 的 w/l 對不上就不會推（push=0），量到的才是靜態站位
  const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b);
  ```

  凍結檔（f5492bb）當下的治具用 `cur.a / cur.b`，會吃到 `ys:fx-lunge`；改成非對決座位後 `push` 恆為 0。
- **敗方位移**：`js/duel-figures.js:571` 的 `push = side*FIG.lungeBack(0.32)*kick*hitPower*sc`，`hitPower` 夾在 `[0.3, 2]`（`js/duel-figures.js:423`），實際值＝`fxPower(dmg*2)*PW_KIND[].p`，`POWER_MAX=1.6`、`bite/bolt` 再 ×1.25/1.5（`index.html:3106, 3882-3886`），所以上限 2 打得到。
- **實跑**（`scratchpad/review4-lunge.mjs`，844×390，靜態量完後補派一發 `ys:fx-lunge`，取 20 幀峰值）：

  | 編制 | 靜態 maxR（敗方側） | power=1.0 | power=2.0 | 腳印外緣 @power=2 |
  |---|---|---|---|---|
  | 8v8 | 1.78–1.80 | 2.096 | **2.428** | **2.944** |
  | 4v4 | 1.51 | 1.931 | **2.241** | 2.49 |
  | 3v3 | 1.51 | 1.881 | **2.243** | 2.92 |

  8v8 在 power 約 1.3（＝一發傷害約 1.8 的普通命中）就越過 R-2 的 2.20；腳印外緣 2.94 對上八邊形桌面內切半徑 3.14，就是凍結檔說要避免的「踩到桌緣剪影」。
- **真對決複驗**（`scratchpad/review4-real.mjs`，`seed=20260905`、4 場、957 幀逐幀量）：`maxR` 峰值 **2.443**，17 幀 >2.20。這 17 幀落在 n=2 那一側（走 R-4 凍結的舊路徑，而 R-2 的四組沒涵蓋 n≤2），嚴格說 R-2 條文沒被違反——但使用者原始回饋「站到紅色區塊外」在 v0.34 仍然重現得到，而且沒有任何一條驗收守著它。
- **程序面**：凍結後改量法、方向是**提高通過機率**；報告「中途修過」第 3 點只寫「被撞擊位移污染（1v1 差 0.11）」，沒有附 02 §2.1 要求的改前／改後實測對照。
- **修法**：R-2 拆成「靜態站位」與「撞擊峰值」兩個量測點（治具跑完靜態後補派最大 `power` 再量一次），或把 `rimMax` 扣掉 `lungeBack*hitPowerMax*sc` 的餘裕；n≤2 也要納入 R-2 的組別。

---

## MEDIUM

### M-1 報告的 R-1/R-2/R-3 數字與所附證據檔對不上

報告逐條證據表 vs `docs/experiments/2026-09-05-readability-evidence/lineup-new-*.json`（我逐檔讀出，並確認 scratchpad 的同名檔與 committed 版 byte-identical，沒有第二組來源）：

| 條 | 報告寫 | 證據檔實際 |
|---|---|---|
| R-1 gap | 8v8 **0.577**／4v4 **0.440**／5v7 **0.468** | 8v8 **0.842**／4v4 **0.702**／5v7 **0.68** |
| R-2 maxR | 8v8 **1.683**／3v3 **1.852**／6v6 1.471／4v4 1.496 | 8v8 **1.852**／3v3 **1.525**／6v6 1.529／4v4 1.594（8v8 與 3v3 互換） |
| R-3 minPair | 8v8 0.549／4v4 0.550 | A 側 **0.539**／**0.544**（報告取了較寬鬆那一側） |

結論仍然全過，但這張表照抄不回去＝驗收不可核對。修法：表格數字直接由證據 json 產生，一律取兩側較差值。

### M-2 R-3 用「中心距」、R-1 用「腳印外緣」——兩條判準不同座標系，R-3 量不到「疊」

`tests/tools/duel-perf.mjs:180-184`：`gap` 用 `lat ± foot`（外緣），`minPair` 用 `Math.hypot(dx, dz)`（純中心距）。實測腳印半徑 0.16–0.94，中心距 0.55 的兩尊腳印必然相交（見 H-2 截圖）。R-3 的 0.50 門檻只保證「中心不重合」，不保證「看得出兩隻」。修法：`minPair` 改成 `dist − foot_i − foot_j`，門檻另訂。

### M-3 `perRow=2` 把 8 尊排成 4 排、後排被前排整隻遮住——沒有任何驗收條件守「看得出幾隻」

`js/duel-figures.js:503`（`rows = Math.ceil(n / FIG.perRow)`）＋ `:581`（`depth = ((rows-1)/2 - r) * rowGap3d`，第 0 排最靠鏡頭）。證據截圖 `docs/experiments/2026-09-05-readability-evidence/lineup-new-8v8.png` 與我跑的 `scratchpad/review4-e8v8.png`：前排大模型幾乎蓋掉後三排，8 尊數不出來。使用者回饋 1 的另一半（「看得出幾隻」）在 R-1~R-3 三條裡完全沒有對應量測。報告「不在本卷／待裁」已自承此點待真機看；此處記為**驗收缺口**而非新 bug。

---

## LOW

- **L-1** `js/duel-figures.js:86` 註解寫「奇數排往外錯**半格**（×step）」，`:517` 實作是 `s * FIG.brickShift / 2` ＝ `0.25 × step`（`brickShift=0.5` 已經是「半」，又除了一次 2）。註解與數值二選一改。
- **L-2** `js/duel-figures.js:581` rows≥2 的深度一律用 `FIG.rowGap3d`（0.55），不分 `is3d`；既有慣例是 `is3d ? rowDepth3d : rowDepth`（0.32 / 0.1）。n≥3 純貼片人形（無 `ab` 的肉身／多件無 unit 法寶）那一側前後深度從 0.1 變 0.55。我實測貼片 n=3/4/8 仍全過 R-1~R-3（gap 0.44–1.01、maxR ≤1.85、minPair ≥0.519），只是命名與行為不一致，而且證據集裡沒有任何貼片路徑的 n≥3 樣本。
- **L-3** `js/duel-figures.js:509` 的 `footOf` 讀 `g.shadow.scale.x`，而 `shadow.scale` 要到同一迴圈的 `:592` 才寫入——本幀的排法用的是**上一幀**（重用 pool 的尊則是**上一場**，`onDuel` 的回收沒有 reset scale，`:355-361`）的縮放。因為 `aligned`／`ready()` 之前不畫，實際看不到跳動；仍建議直接算 `sc*bs*geometry.parameters.radius`，不要跨幀取狀態。
- **L-4** `plan` 用名冊長度 `n`（`roster[i].length`），燒掉的尊不縮 `n`：8 尊燒到剩 2 尊仍維持 4 排、留下空洞。可能是刻意（位置穩定），但沒有註解說明。

---

## 追過、沒找到的

- **字幕 XSS／`<` 破版**：`pwMoveCap` 的 `who/item/move/desc` 全來自靜態表——`who` 是 `ROLES[].name` 或 hotseat 的樣板字串（`index.html:1947, 1969`，沒有任何自由文字輸入欄）、`item` 來自 `TRAIT_ITEM`（POOL 的 `n`）、`move`/`desc` 來自 `TRAITS`。**27 件 TRAITS 逐一確認都有 `desc`**（`index.html:1623-1650`），第二行不會缺行。
- **`offset[i]` 符號與 `side` 不一致**：`#dL` 恆為 `#duelArena` flex row 的第一個子元素（`index.html:3975`）＝畫面左；而且新路徑用 `side * |offset[i]|`（`js/duel-figures.js:578`），就算欄位互換也只會與名字錯位，不會把整排丟到對面或飛出畫面。
- **R-4 的 `else` 分支**：與 `fae1eec` 逐項等價——`lane` 逐字相同；`if (depth)` 對 `n>1` 恆真（`depth = ±rowDepth ≠ 0`）、`n===1` 時 `depth=0`＝原本的 `if (n>1)`。`r4-compare.mjs` 用的 worktree `wt033` 我實跑 `git -C wt033 status`：HEAD＝`fae1eec`，**只有 `tests/tools/traitfx-preview.html` 被改**（即報告聲明的手加 `positions()`），其餘原樣。
- **打光 rig 的 base**：`js/renderer.js:99-106` 先 `stageRig.position.y=0.15` ＋ `scene.add` 才 `createTraitFx(..., {rig: stageRig})`；治具頁 `tests/tools/traitfx-preview.html:87` 同樣先設 `rig.position.y=0.15` 再於 `:100` 建 traitFx。兩邊 `rigBase` 都是 `(0, 0.15, 0)`，`cancelAll` 回的位置正確。`renderer.js:184` 每幀只寫 `rotation.y`，不與 `position` 打架。
- **C-2 恆真？** 不是。`tests/tools/traitfx-drive.mjs:113` 的 `rigBack = after.slice(endIdx+9).every(...)` 尾段有 **65 幀**（N=140、FIRE_AT=12、endIdx≈54），非空；證據 `traitfx-all-v034.json` 第一例 rig 由 0.384 → 0.96（10 幀內）、尾段 max 0.01。`focus` 的 `fired.handled ? ... : true` 短路只影響 throw/block 分支，主分支的 `verdict.pass` 已經 `&& fired.handled`。27/27 的 rig 峰值 0.71–0.96，門檻 0.5 有餘裕。
- **`rigGoal` 只記最後一套**：真對決的招式是循序的（`index.html:4069` `await pwSleep(PW_FX.TRAIT_MS)`），不會有兩套同時在演。
- **C-4 恆真？** 不是，但也沒問題。我實測 844×390 與 390×844 兩種視窗、`side-A/side-B` 都是 `scrollHeight == clientHeight`；`#duelResult`（min-height 26）與 `#duelSub`（18）在字幕出現時已經佔位，且 `pwMoveCap(null)` 在寫結果字幕前就清空（`index.html:4104`），兩者不會同時滿載，招式當下確實是版面最高的一刻。
- **`pwMoveCap(null)` 的呼叫點**：`index.html:4143` 那個 `innerHTML=""` 迴圈只清內容不清 `className`，但緊接著 `playDuelWar` 的 `:4093` 會呼叫 `pwMoveCap(null)` 重設；OFF 路徑不進 `.pw`，`#duelMove` 是 `display:none`。沒有殘留 class 洩到下一場。
- **治具 `lineup` 換座位是否影響量測**：不影響。`gap` 用相機方位角 `az` 推出的 `right` 向量、`onTable` 用同一台相機投影，全部是相機相對量；`realign()` 讀的 `#dL/#dR` 仍是真對決那一對的欄位，`want` 因此與真對決一致。camera-director 轉去別的 yaw 只影響截圖角度，不改變這些數值。
- **真對決下的 R-1／R-3**：957 幀逐幀量，最差 `gap` 0.426（門檻 0.30）、最差 2D `minPair` 0.550（門檻 0.50），兩條在實戰中成立。
- **`pageerror`**：本輪所有探針（lineup 15 組、lunge 8 組、真對決 4 場、字幕 2 視窗）`errors` 全 0。

---

## 探針與產物（全在 scratchpad，未動 repo）

`review4-cap.mjs`（字幕靜態量）、`review4-capreal.mjs` ＋ `review4-capreal.json`（真對決 7 筆字幕位置）、`review4-lineup.mjs` ＋ `review4-lineup.json` ＋ `review4-*.png`（最壞名冊列陣）、`review4-lunge.mjs` ＋ `review4-lunge.json`（撞擊峰值）、`review4-real.mjs` ＋ `review4-real.json`（真對決逐幀）。
