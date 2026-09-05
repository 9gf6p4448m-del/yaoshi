# 演出可讀性小卷（260a241）對抗式覆審——第 4 輪：反駁「H-2 這次真的修好」

**H-2 真的修好。新 finding：CRITICAL 0、HIGH 0、MEDIUM 2、LOW 2。**

範圍：`git diff b96cb7c..260a241 -- js/duel-figures.js tests/tools/duel-perf.mjs`（實作 19 行、治具 3 行）。
基準：第 3 輪報告 `docs/experiments/2026-09-05-readability-review-round3.md`、實作者處置
`docs/experiments/2026-09-05-duel-readability-report.md:51-56`。
本輪**未修改 repo 任何檔案**；唯一的 repo metadata 動作是 `git worktree add --detach scratchpad/wt-b96 b96cb7c`
（做 §6.1 鑑別力對照；與第 3 輪的 `wt303`、R-4 用的 `wt033` 同性質，要清用 `git worktree remove`）。
實跑一律 AMD 780M、埠 8981–8986，產物全在 scratchpad。

---

## 結論表

| 追問 | 結果 | 一句話 |
|---|---|---|
| ① 鎖點時機（`ready()` 為真時腳印換好了沒） | **對** | `shadow.geometry` 換成真腳印在 `js/creature-figures.js:290-291`，`loaded = true` 在 `:295`，`ready()`（`:327`）回的就是它 → `ready()` 真 ⇒ 幾何已換。順序正確，第 3 輪的 0.42 過期路徑封死了 |
| ① GLB 404 那一側 | **會永遠不鎖、每幀重選、隨 punch 翻面**（MEDIUM-1） | 實測 8 尊中 1 尊 404：5 秒內 fit 在 0.6↔0.7 之間翻 4 次；對照組（全就位）0 次。不卡死、無 pageerror |
| ② 鏡頭 punch 會不會讓鎖住的排法重選 | **不會**（讀碼＋實測皆證） | punch 只會把 `dist` 變小（`js/camera-director.js:34,169`）→ pxWorld↓→腳印↓→ `P.ok` 的兩條判斷都更寬鬆，不可能由 ok 轉 !ok。控制組 300 幀（camD 3.31–4.2）fit／rows 各只有 1 個值 |
| ② 一場裡會不會跳一次排 | **會，但不是 punch 造成的**（MEDIUM-2） | 真進場時鏡頭是 3.6→4.2（牌桌→對決機位），鎖點落在 3.6、腳印小 14% → 進場 300–450ms 時 `!ok` 重選一次：780×330 fit 0.7→0.6、844×390 fit 0.8→0.7 |
| ③ 治具攔 `ys:fx-burn` 會不會卡住真對決 | **不會** | 攔得到（`FXC.burnFig` 2→0、`burnDom` 2→4）；真對決三場照常結束（`rec.ends` 3、時長 5755/6912/5973 vs 對照 5759/6912/5968），errors 0。保險絲在 `index.html:4037`（3×BURN_MS）＋未 handled 時走 DOM `fxBurn` 退路 |
| ④ 實跑複驗 | **全部對得上** | 見下表；R-4 四組 maxΔ 0.00000 |

---

## H-2 —— 真的修好（含雙向鑑別力）

**改對的地方**：`js/duel-figures.js:555` 的 `allReady` 把離散鎖點延到該側每一尊 `ready()` 都真之後；
`:564-567` 的沿用路徑補上 `!plan.ok → 重選一次，找得到 ok 才換`。
`js/creature-figures.js` 的載入順序證明前者有效：`:290-291` 先換 `shadow.geometry`（真腳印 `foot = max(w,d)*0.38`）、
`:295` 才 `loaded = true`；`:327` `ready(){return loaded}`。第 3 輪點名的「鎖在 radius 還是 0.42 的那一幀」不可能再發生。

**§6.1 第 1 條 雙向鑑別力**（同一支 committed 治具、同一條指令，只換 `--root` 指到的程式碼）：

| 版本 | 8 虎爺 844×390 minPair | gap | 8 虎爺 780×330 minPair | gap | 撞擊 maxEdge(780) | 檔 |
|---|---|---|---|---|---|---|
| 修復前 b96cb7c（worktree） | **0.146** | 0.44 | **0.000** | 0.278（破 R-1） | **2.205**（破 rimMax 2.15） | `review7-pre-t8-844.json`／`review7-pre-t8-780.json` |
| 修復後 260a241 | **0.55** | 0.59 | **0.549** | 0.562 | 2.150 | `review7-t8-844.json`／`review7-t8-780x330.json` |

壞版本紅、健康版本綠，兩面都驗過。**這也順帶否證了「治具攔燒毀才是關鍵」**：修復前那兩跑用的是同一支
含攔截的治具，照樣 0.146／0.000 → 綠燈是實作那 19 行掙來的。

### ④ 實跑複驗（與實作者報告逐項對照）

| 組別 | 報告 | 本輪實測 | 檔 |
|---|---|---|---|
| 8 虎爺 844×390 | minPair 0.549／gap 0.591／lunge maxR 1.695 | **0.55／0.59／1.668**、maxEdge 2.15、offTable 0 | `review7-t8-844.json` |
| 8 虎爺 780×330 | minPair 0.52／gap 0.562／lunge maxR 1.719 | **0.549／0.562／1.703**、maxEdge 2.15、offTable 0 | `review7-t8-780x330.json` |
| 4v4 連跑 3 次 | 0.549／0.549／0.549 | **0.549／0.549／0.549**，gap 0.643×3、maxR 1.910／1.899／1.903、maxEdge 2.15 | `review7-4v4-r1..3.json` |
| R-4（對 `fae1eec`） | 四組 Δ 0 | **1v1／2v2／2v1／1v2 maxΔ 0.00000** | `review7-r4.mjs`（＝提示的 `r4-compare.mjs`，只改埠 8985/8986） |

差異都在 ±0.03 以內且方向不定（780×330 的 A 側我量到 0.549，比報告的 0.52 好），無一組跌破門檻。

---

## 新 finding

### MEDIUM-1 一尊 GLB 沒到就整側不鎖：每幀重選，鏡頭一晃就翻面（＝鎖點當初要防的那件事）
**碼**：`js/duel-figures.js:555` `allReady` 要求該側**每一尊**都 `ready()`；`:568-570` 只有 `allReady` 才寫 `rowsFit[i]`。
`ready()` 永遠假的來源不只 404：`js/creature-figures.js:257,300`（`loadGlb` reject → `loaded` 永遠 false）、
`index.html:3136,4009`（`LOAD_MAX_MS` 12000 逾時照演，「妖晚到晚現身」）、貼片工廠的 `ready(){return hasPortrait}`（`js/duel-figures.js:270`）。
**後果**：該側整場走 `plan = search()`（`:569`）逐幀重算。`search()` 吃 `pxWorld`，而 `realign()` 每 150ms
（`:28,485`）跟著鏡頭 punch 重算一次 → ok/!ok 在邊界上來回 → 排法翻面。
**實測**（780×330、A 側 7 tiger + 1 sword 且只把 `sword.glb` 攔成 404，真對決仍在跑、它的 punch 會晃鏡頭；
B 側放 2 尊當基準，`fit = scaleA/scaleB/crowd` 與 pxWorld 無關）：

| 組 | fit 變動次數 | 變動點（frame, fit, camD） | rows 變動 | minPairA |
|---|---|---|---|---|
| 對照（8 尊全就位） | **1**（＝沒變過） | 0:0.6 | 1 | 0.55 |
| 1 尊 404 | **5** | 0:0.6 → 33:0.7 → 42:0.6 → 51:0.7 → 59:0.6 | 1 | 0.55 |

檔：`review7-lock2-ctrl.json`／`review7-lock2-404.json`（探針 `review7-lock2.mjs`）。
一次 fit 0.6→0.7 是**整側八尊同時放大 17% 並重新排位**，0.5 秒內來回四次。
**為什麼算 finding**：`js/duel-figures.js:306-307` 的註解自己寫「逐幀重選會在撞擊那幾幀翻面（實測 6v6 minPair 0.152）」，
鎖點就是為了擋它；現在只要有一尊沒到，這道防線就整側失效。
**不升 HIGH 的理由**：門檻沒破（每一幀選到的都是 ok 的排法，minPair 全程 0.55），純視覺；且要有載入失敗／逾時才觸發。
`--noglb` 全 404 實跑（`review7-noglb.json`）：兩場對決正常打完（5079／5376ms）、**無 pageerror**、`burnDom 3` 走 DOM 退路，不卡死。

### MEDIUM-2 鎖點仍落在「還在變的量」上：真進場時鏡頭 3.6→4.2，每場開頭固定跳一次排
**碼**：`js/camera-director.js:18`（牌桌 dist 3.6）、`:23`（對決 4.2）、`:106-111`（`ys:duel` 才 `goto(DUEL_SHOT)`，700ms 補間）。
`js/duel-figures.js:467-469` `pxWorld ∝ dist` → `figScale3d` ∝ dist → 腳印 ∝ dist。
GLB 快取命中（第 2 場之後都是）時 `onDuel:381` 同步判定 `ready()` 為真 → 第一幀就 `allReady` → **鎖在 dist≈3.6、腳印比最終小 14%**；
補到 4.2 後腳印變大 → `P.ok` 轉假 → `:567` 重選一次。
**實測**（探針 `review7-entry.mjs`：先暖機一場讓 GLB 進快取 → `ys:duel-end` 讓鏡頭回 3.6 → 再派同名冊，從第一幀量）：

| 視窗 | ys:duel 當下 camD | fit 變動 | 發生在 |
|---|---|---|---|
| 780×330 | 3.600 | 0.7 → **0.6** | frame 19（camD 3.859，約進場後 300ms） |
| 844×390 | 3.600 | 0.8 → **0.7** | frame 27（camD 4.111，約 450ms） |

檔：`review7-entry-780.json`／`review7-entry-844.json`。
**後果**：列陣進場那一刻，兩側各八尊同時換一級大小並重新排位——正是這一卷要顧的「看得清楚」的那 0.5 秒。
**門檻沒破**：重選與 `!ok` 發生在同一幀（`:565-567` 同步），不存在「先疊在一起幾幀再修正」的空窗；R-1／R-2／R-3 全程成立。
**為什麼驗收看不到**：`tests/tools/duel-perf.mjs:151-168` 是在真對決開始後才派合成 `ys:duel`，那時鏡頭已經停在 4.2，
所以 committed 的 lineup json 對「進場那一刻」零鑑別力。要驗得先讓鏡頭回牌桌機位（本輪探針的作法）。
**根因未除**：第 3 輪 H-2 的形狀是「用還在變的量做離散鎖點」，這一版只把「GLB 幾何」那個來源補上，
「鏡頭距離」這個來源仍在，靠新加的重選事後補救——代價就是看得見的跳一次。

### LOW-1 五個 committed 證據檔不可能是這一版治具產的
`docs/experiments/2026-09-05-readability-evidence/lineup-tiger8.json`、`-tiger8-small`、`-elite8`、`-elite8-small`、`-e2v2-big`
各有 1 尊 `"vis": false`，且那一尊的 `foot` 與同側其餘尊只差 0.003（0.482 vs 0.485）、座標落在同一份 plan 的合法站位
→ 它是**畫過之後才被燒掉隱藏**的，代表 `onFigBurn` 有跑到。但 committed 治具（`duel-perf.mjs:167`）在 capture 階段
攔掉 `ys:fx-burn`，本輪實測攔得住（`review7-burn.json`：`det.handled` 為 false、四尊全程可見；
`review7-burn2-block/ctrl.json`：`FXC.burnFig` 2→0、`rec.burns` 4→0）。我用 committed 治具同指令跑 7 次
（含 pre-fix worktree 2 次）**全部 0 尊 `vis:false`**。→ 這幾個檔是攔截那行加進去之前跑的。
數字本身我重現得出來（見上表），所以只影響證據的可追溯性，不影響結論。

### LOW-2 治具的攔截連 duel-drive 錄音機的燒毀紀錄一起攔掉
`tests/tools/duel-perf.mjs:167` 用 capture 階段的 `stopImmediatePropagation`，會停掉**所有**後續監聽器，
包含 `tests/tools/duel-drive.mjs:81` RECORDER 自己那條（實測 `rec.burns` 由 4 變 0，`review7-burn2-*.json`）。
lineup 模式目前不落 `rec`，所以現在沒事；但註解只寫「攔掉真對決的燒毀」，沒寫「錄音機的 burns 會變空」，
之後誰把 lineup 跟燒毀證據合用就會拿到靜默的 0。

---

## 探針與產物（全在 scratchpad，未動 repo）
- `review7-burn.mjs` → `review7-burn.json`（埠 8981）：真實路徑驗攔截是否生效（capture 階段在 target 上先於 bubble 監聽器跑）
- `review7-burn2.mjs` → `review7-burn2-block.json`／`-ctrl.json`（埠 8981）：攔／不攔的三場對決時長、`rec.ends`、FXC 對照
- `review7-lock2.mjs` → `review7-lock2-ctrl.json`／`review7-lock2-404.json`（埠 8984）：fit／rows 逐幀（B 側 2 尊當 pxWorld 基準）
- `review7-lock.mjs` → `review7-lock-ctrl.json`／`review7-lock-404.json`(.png)（埠 8984）：v1（scale 受鏡頭污染，只留作原始資料）
- `review7-entry.mjs` → `review7-entry-780.json`／`review7-entry-844.json`(.png)（埠 8986）：真進場時序（鏡頭 3.6→4.2）的跳排
- `review7-resize.mjs` → `review7-resize.json`(+before/after.png)（埠 8985）：鎖住後視窗變矮 → 重選確實會走到，且走完 R-1/2/3 仍守住
- `review7-realjump.mjs` → `review7-realjump.json`(+-raw)（埠 8982）：真對決逐幀（本 seed 每側只有 1–2 尊，走 n≤2 路徑，不含 plan）
- `review7-t8-844.json`／`review7-t8-780x330.json`／`review7-4v4-r1..3.json`（埠 8983）：④ 複驗
- `review7-pre-t8-844.json`／`review7-pre-t8-780.json`（埠 8982、`--root=scratchpad/wt-b96`）：鑑別力對照
- `review7-noglb.json`（埠 8981）：`--noglb` 全 404 兩場對決
- `review7-r4.mjs`（埠 8985/8986）：R-4 對 `fae1eec` 逐尊比
