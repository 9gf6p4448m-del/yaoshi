# 虎爺印（biteGamble）演出原型 A／B／C／D — 交裁報告（2026-09-12）

> **這一卷的產出是候選版本，不是一個決定。** 挑哪一版是品味題（`03 R6`），由製作人裁。
> 上半部（§1–§5b）是 A／B／C 三版；**§6 起是 2026-09-12 晚的追加**：tier 1 改 300ms、印面字改「虎」、
> 以及製作人裁定的 **D 版**（C 的華麗＋B 的落地重音）。
> 四版都**不是預設**：不帶 `?proto=` 時，`biteGamble` 與 v0.55 現況**逐欄位相同**（證據見 §4.1／§7.7）。
>
> 基準 SHA：`417b1972691de989ea4781fa1d4d53e896142846`（v0.55，main HEAD）
> worktree：`C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-a0917744177b854a1`

---

## 1. 為什麼要重做（製作人的判定）

0.55 批 0 的「徽記剪影」是**一片平面單色 billboard 貼在紙紮 3D 上**，逐幀正對鏡頭。
製作人看了判定「像剪貼畫、粗糙」，兩輪盲讀也 0/3。現況連拍：
`docs/experiments/2026-09-12-tiger-proto-evidence/base/biteGamble-base-t2-20fps.gif`

機制上它壞在三件事（這三件是三版共同要修的）：

| 病 | 機制 |
|---|---|
| 像貼紙 | `faceCamera()` 逐幀把徽記轉正對鏡頭 ⇒ 它永遠沒有厚度、沒有透視，只能是一張貼紙 |
| 像色塊 | 一片 `ShapeGeometry` 平塗，0.62 世界單位（≈虎身高的六成）⇒ 讀者看到的是「一大塊紅色」不是「一枚印」 |
| 飛行物看不清 | `st.trail` 的 `MAT_LINE` 在 WebGL 只畫得出 1px ⇒ 就是盲讀原話的「一條白色虛線」（`ART_BIBLE §10.5` 退役清單第 4 條） |

新方向：**招式演出＝本體動作＋小型紙紮道具＋受招方反應**。法寶身分由 3D 本體承擔，不靠 logo。

---

## 2. 三版各一句話

| 版 | 一句話 | 立場 |
|---|---|---|
| **A｜撲咬為主** | 虎滿幅蹲伏、跨 1.15 個身位躍出咬下去，口中那枚小紅印隨撲擊翻滾飛到咬點、烙在獵物胸口 | 道具最少，**動作**說完整件事 |
| **B｜印為主** | 虎只輕撲；一枚鎏金大印從虎頭上方橫移到獵物頭頂**砸下來**，落地一記重音（震動＋香火貼桌陣），彈起後在獵物身上留下硃紅印文 | 香火系「蓄—落—餘」三拍，**那個「落」是整招的重音** |
| **C｜香火為主** | 撲擊時虎背上九片金箔被拉成一道顆粒流飛向獵物，咬中炸成金色紙錢；印文原本是暗的，命中那一刻**由暗轉硃紅＝被燒出來** | 系別語彙最重，**「香火」三個字演得出來** |

三版共同骨架（缺一不可，每一版都有）：
① 虎本體真的撲（`tiger_c` 的 34 根骨：蹲伏→躍出→下顎猛闔→收勢）
② 受招方反應（`st.flinch` 退縮 ＋ 等比壓縮 ＋ 骨骼抖動 ＋ 邊光 3.2 倍）
③ 一枚**紙紮印文**留在受招方身上（見 §3）

---

## 3. 新積木：`st.paperStamp()`（`js/trait-fx.js:636-741`）

一枚**實體**印，不是貼紙。與 `st.icon`／`st.mark` 的三個差別：

1. **不是 billboard**：朝向在 spawn 當下凍住（鏡頭方向再壓一個俯仰／偏擺），之後只跟位置走 ⇒ 看得到厚度側邊。
2. **有厚度**：`ExtrudeGeometry` 擠出 `ink` 色本體，正面再疊一片**縮到 0.74** 的 `key`／`hot` 色面板 ⇒ 露出來的那一圈 ink 就是**墨線描邊**，而本體的側面就是**厚度**。
3. **翹曲**：頂點依 `x²`／`y` 推 z，紙不是平的。
4. **印面有字**：`o.glyph` 在印面上壓一個字（初版是「王」，**2026-09-12 製作人裁定改「虎」**，見 §7.5）。N 個矩形筆畫合成**一個** `ShapeGeometry`，不論幾畫都只多一個 draw call。

材質仍是 `MAT_SOLID.clone()`（`NormalBlending`、平塗硬邊＝`ART_BIBLE §9`「紙」的三件幾何訊號之一），
與現有三支模板共用 program ⇒ **`programsGrew` 全程 0，shader program 數不變（19 支）**。

配套小積木：
- `st.solid(color, opacity)`（`js/trait-fx.js:420-422`）：非加色實心材質，給金箔片／紙錢用（加色的東西一越過 bloom 門檻就往白色去，那是 `ART_BIBLE §10.2` 第 5 條的機制成因）。
- `st.stick(mesh, fig, o)`（`js/trait-fx.js:726-741`）：把飛行物黏在某尊身上。飛的那一枚**落下來就變成印記**，不必生兩份（省一半 draw call）。

---

## 4. 驗收（指令原文＋實際輸出）

### 4.1 條件 1：`trace-eq` 對基準 HEAD 逐位元組相等（純演出）

```
git show 417b197:index.html > scratchpad/base-index.html
node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html
{"old":"scratchpad/base-index.html","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}

node tests/tools/trace-eq.mjs index.html --mutate      ← 鑑別力：把引擎改壞，這支要變紅
{"mode":"mutate","mutation":"CFG.ROUNDS 12 -> 11","differs":true,"verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}
```

**★這條的證明力有上限，要講清楚★**：`trace-eq` 只抽 `index.html` 的第一個 `<script>` 在 node 裡跑，
**完全不載入 `js/`**（見 `trace-eq.mjs` 檔頭與 `traitfx-drive.mjs` 的 `--sigdump` 那段註解）。
本卷 `index.html` 零 diff ⇒ 這條**恆真**，證明不了 `js/trait-fx*` 有沒有被動到。
對 `js/` 有鑑別力的等價證據是 sigdump 逐招比對：

```
git archive 417b197 | tar -x -C scratchpad/basetree
node tests/tools/traitfx-drive.mjs scratchpad/sig-new-t1.json  --tier=1 --sigdump=scratchpad/sig-new-t1.tsv
node tests/tools/traitfx-drive.mjs scratchpad/sig-base-t1.json --tier=1 --sigdump=scratchpad/sig-base-t1.tsv --root=scratchpad/basetree
diff scratchpad/sig-base-t1.tsv scratchpad/sig-new-t1.tsv     → 0 行差異（27/27 pass 兩邊都是）
```

**反面（證明這份 diff 不是恆綠）**：同一支治具帶 `--proto=tigerA` 再跑一次，
`diff` 只吐出 **biteGamble 一行**（`meshes` 從 `burst+emblem:seal+mark:seal+trail` 變成 `burst+emblem:seal`、
`acts` 9→8），其餘 26 支逐字元相同。

### 4.2 條件 2：`traitfx-drive` 三版 × t1／t2，0 error，phase gate 全過

```
node tests/tools/traitfx-drive.mjs <out> --only=biteGamble --tier=<1|2> --proto=<tigerA|tigerB|tigerC>
```

| 版 | tier | pass | acts | fill | rate | err | prog+ | 簽章 |
|---|---|---|---|---|---|---|---|---|
| A | 1 | PASS | 7 | 0.881 | 1 | 0 | 0 | 28b／burst+emblem:seal／T |
| A | 2 | PASS | 7 | 0.880 | 1 | 0 | 0 | 同上 |
| B | 1 | PASS | 13 | 0.881 | 1 | 0 | 0 | 28b／burst+emblem:seal+mark:seal+ring／T |
| B | 2 | PASS | 13 | 0.880 | 1 | 0 | 0 | 同上 |
| C | 1 | PASS | 43 | 0.881 | 1 | 0 | 0 | 28b／burst+emblem:seal+foil／T |
| C | 2 | PASS | 43 | 0.880 | 1 | 0 | 0 | 同上 |

`PHASE_GATE` 三段（`windup`／`travel`／`react`）**三版六跑全部成立**（不是「喊了就算」，是量出來的）：

| 跑 | phases | windup bone（門檻 0.08）／model（0.04） | travel 位移／門檻 | react delta（門檻 0.03） |
|---|---|---|---|---|
| A t1 | windup,travel,react | 0.2846／0.0784 | 2.0174／1.2481 | 0.2401 |
| A t2 | windup,travel,react | 0.0977／0.0269 | 1.2838／1.2481 | 0.1250 |
| B t1 | windup,travel,react | 0.1708／0.0471 | 1.7254／1.2481 | 0.2401 |
| B t2 | windup,travel,react | 0.1107／0.0305 | 1.9217／1.2481 | 0.1250 |
| C t1 | windup,travel,react | 0.2220／0.0612 | 1.8261／1.2481 | 0.2401 |
| C t2 | windup,travel,react | 0.1440／0.0397 | 1.6236／1.2481 | 0.1250 |

> **B 版的 windup 一度只剩 0.003 的餘裕**（蹲伏幅度 0.45 時 t2 量到 0.083 對門檻 0.080）。
> 處置是**把動作做足**——蹲伏 0.45→0.60、跨距 0.42→0.46，量到 0.1107；
> **不是**把門檻搬下來（`PHASE_GATE` 一個數字都沒動，`js/trait-fx/vocab.js` 不在本卷的 diff 裡）。
> 0.60 仍明顯小於 A 的滿幅 1.0，「虎讓位給印」這個立場沒有改。

回歸（不帶 `--proto`，確認沒弄壞別人）：
```
node tests/tools/traitfx-drive.mjs scratchpad/reg-t2.json --tier=2   → 30/30 pass · 重複簽章 0
node tests/tools/traitfx-drive.mjs scratchpad/reg-t3.json --tier=3   → 3/3  pass · 重複簽章 0
node tests/fxvocab.test.mjs           → 15 綠 ／ 0 紅
node tests/fxtier.test.mjs            → 14 綠 ／ 0 紅
node tests/emblem-collision.test.mjs  → 9 綠 ／ 0 紅
node tests/review.test.mjs            → 通過 28　失敗 0
node tests/legend.test.mjs            → 32 過 / 0 失敗
```

### 4.3 條件 3：視覺交付

目錄：`docs/experiments/2026-09-12-tiger-proto-evidence/`

| 版 | 6 幀連拍 t1（當時是 260ms；§6 之後改 300ms 已重出） | 6 幀連拍 t2（900ms） | 動態（慢動作 GIF） | 動態（原速 WebM） |
|---|---|---|---|---|
| A | `A/sheet-t1.png` | `A/sheet-t2.png` | `A/biteGamble-tigerA-t1-12fps.gif`、`A/biteGamble-tigerA-t2-20fps.gif` | `A/biteGamble-tigerA-t1-60fps.webm`、`A/biteGamble-tigerA-t2-60fps.webm` |
| B | `B/sheet-t1.png` | `B/sheet-t2.png` | `B/biteGamble-tigerB-t1-12fps.gif`、`B/biteGamble-tigerB-t2-20fps.gif` | `B/biteGamble-tigerB-t1-60fps.webm`、`B/biteGamble-tigerB-t2-60fps.webm` |
| C | `C/sheet-t1.png` | `C/sheet-t2.png` | `C/biteGamble-tigerC-t1-12fps.gif`、`C/biteGamble-tigerC-t2-20fps.gif` | `C/biteGamble-tigerC-t1-60fps.webm`、`C/biteGamble-tigerC-t2-60fps.webm` |
| 現況對照 | — | — | `base/biteGamble-base-t1-12fps.gif`、`base/biteGamble-base-t2-20fps.gif` | — |

- 連拍＝`tests/tools/blindread-sheet.mjs`（6 幀 2×3、每格 780×360、總圖 1560×1080），
  截圖視口 844×390 CSS ＋ `deviceScaleFactor 2`＝玩家真的看到的比例。**幀位、格寬、視口、混洗一行沒動**，
  只加了一個 `--proto=` 的網址參數轉送。
- 動態＝`tests/tools/proto-record.mjs`（本卷新治具）：逐幀走 `traitfx-preview.html` 的**真實引擎路徑**
  （`ys:duel` → `ys:fx-trait` → `js/trait-fx.js` → 三系編舞），Playwright 逐幀截圖，`ffmpeg` 合成。
  **沒有一張是手繪或後製的。**
- 慢動作倍率：t1 的 12fps ＝ 5× 慢；t2 的 20fps ＝ 3× 慢。60fps 的 WebM 是原速。

### 4.4 條件 4：`threejs-visual-loop` 的迴圈紀錄（三輪，逐輪「看圖→發現→修→再看」）

**第 0 步（skill 第十節）——驗證工具盤點**：專案已有三樣，沿用不另建：
自動截圖＝`tests/tools/blindread-sheet.mjs`／`duel-drive.mjs --shots`；
除錯鉤＝`window.__tfx`（`traitfx-preview.html`）；效能＝`tests/tools/duel-perf.mjs`。
本卷只補了一支**逐幀連續**錄影器（`proto-record.mjs`），因為 blindread-sheet 的幀位是凍結的 6 格，
回答的是「讀者看得懂嗎」，不是「這個動作看起來對不對」。

#### 第 1 輪
**看圖**：`scratchpad/r1-{A,B,C}/a01.png`（三版 t2 連拍）。
**發現**：
1. 三版的印**幾乎看不到**（A 版 0.55×markSize ≈ 0.11 世界單位，在 780×360 的格子上是一顆紅點）。
2. B 版的大印**整片在畫面外**（`st.top(cat)+0.30`，對決機位 tilt 24°／dist 4.2 直接切掉上緣），第一格只看到左上角半截，之後完全消失。
3. `st.trail` 的白色 1px 線是畫面上最顯眼的特效元素——**正是退役清單第 4 條在講的那條線**。
4. 蹲伏像「洩氣」不像「壓低重心」（等比壓縮 0.05 太重、Rump 0.42 把整尊壓平）。
5. 受招方反應在這個尺寸下幾乎讀不出來。
**修**：印放大到 1.1×markSize（飛行）／2.4×（蓋印）；B 的大印改成「頭前一點、只高 0.06」並把懸停點從 +0.58 降到 +0.40；A／C 拿掉 `st.trail` 的線（A 改成印自己翻滾著飛、C 由金箔顆粒流承擔）；蹲伏改「前低後高」（Rump 0.42→0.26、Chest −0.26→−0.38、壓縮 0.05→0.025）；flinch 1.8→2.4、邊光 2.2→3.2 倍。

#### 第 2 輪
**看圖**：`scratchpad/rec-A/montage.png`（16 格逐幀蒙太奇）。
**發現**：印在 travel 全程**還是不見**，但這次不是尺寸問題——截圖分不出是「出框／被遮／透明度 0／太小」哪一種。
**量**：加了唯讀診斷 `window.__tfx.fxDump()`（世界座標／NDC／縮放／透明度），跑 `scratchpad/probe.mjs`：

```
f18 t300ms  emblem:seal[ndc -0.27,-0.16 s0.11 op0]     ← opacity 掉到 0
f30 t500ms  emblem:seal[ndc  0.10, 0.19 s0.11 op0]
```

**真因**：我用 `EASE.wind` 驅動 windup。`wind` 是**「去慢回快」的脈衝**（`t=1` 時回到 0），不是「windup」。
於是 windup 結束那一幀，蓄勢整個彈回、`st.alpha(stamp, e*2.4)` 的 e 回到 0 ⇒ 印的 opacity 歸零，
之後沒有任何 tween 再設它 ⇒ **飛行全程 op=0**。改成 `ease: 'out'`，三版都中。
**再看**：印出現了，但在 780×360 上只是一塊紅色色塊（讀不出是「印」），而且落在受招方身上時角度亂七八糟。
**修**：印面加「王」字（`o.glyph`）；飛行翻滾在落點**回正**（`quaternion.copy(q0)` 再給一點歪＝手蓋的）；
印記往鏡頭方向推 `+X 0.26`（`MAT_SOLID` 開 `depthTest`，不推就有一半埋進受招方模型裡被切掉）。

#### 第 3 輪
**看圖**：`scratchpad/rec-B/zoom.png`（大印 2× 放大）、`scratchpad/rec-C/mont2.png`。
**發現**：
1. 「王」被橫向拉扁成「≡」——`seal` 的方印身本來就是寬 1.56×高 0.75 的扁框，字面 `w 0.50` 太寬；
   而且 `cy −0.52／h 0.27` 有半條下橫**掉到縮小後的印面之外**。
2. 墨線太細（面板縮 0.80 露不出邊）。
3. C 版九片金箔擠成一坨金色團塊。
4. B 版 `depth 0.42` 的厚度變成一塊過重的深色磚。
**修**：字面 `w 0.30／h 0.20／cy −0.40`、直畫比橫畫粗（`t×1.05`，否則小尺寸下被三條橫畫吃掉）；
面板縮 0.80→0.74；金箔沿脊背跨距 0.30→0.72 並往鏡頭方向散開；B 的 `depth 0.42→0.26`、`tilt 34°→28°`。
**再看**：`docs/experiments/2026-09-12-tiger-proto-evidence/{A,B,C}/sheet-t1.png` —— 三版的
「誰對誰做了什麼」在 6 格裡都讀得出來，印面的「王」在 t1 短版也認得出。

#### 第 4 次修（收尾）
t1 的第 6 格（`react` 末＝237ms）**在演出 horizon（229ms）之後**，任何淡出都會讓最後一格的「印住了」消失
——而那正是這一招的因果證據。三版的印記**改成不自己淡出**，清場交給 `finish()` 統一拆（`restored` 仍綠）。

### 4.5 條件 5：`git diff --stat`

程式碼與治具（證據檔與報告的 28 個檔另見 §7 表）：

```
git diff --stat 417b197..HEAD -- js tests
js/trait-fx.js                   | 118 ++++++++++++++++
 js/trait-fx/proto/tiger.js       | 284 +++++++++++++++++++++++++++++++++++++++
 tests/tools/blindread-sheet.mjs  |   6 +-
 tests/tools/proto-record.mjs     | 142 ++++++++++++++++++++
 tests/tools/traitfx-drive.mjs    |   4 +-
 tests/tools/traitfx-preview.html |  29 ++++
 6 files changed, 581 insertions(+), 2 deletions(-)
```

`tests/tools/` 兩支既有治具的 6+4 行變動**全部是網址模板多接一個 `&proto=`、加一行註解與一個 `let PROTO`**，逐行核對見 `git diff 417b197..HEAD -- tests/tools/traitfx-drive.mjs tests/tools/blindread-sheet.mjs`——判定邏輯、門檻、`FRAME_AT`／`CELL`／`SHEET`／`SHOT`／混洗種子一個字元沒動。
`js/trait-fx.js` 的 118 行**全部是新增**（0 刪除）：三個新積木與 `?proto=` 的 if 區塊，既有 27 支招走的路徑一行沒碰（sigdump 逐招 0 行差異是這句話的證據，見 §4.1）。

---

## 5. 效能（不設門檻，只記錄）

### 5.1 有鑑別力的那個量測位置：招式真的在演的那一幀

`tests/tools/proto-record.mjs` 逐幀關掉 `renderer.info.autoReset` 再 `reset()`，量**整幀**的
draw call 與三角形（`bloom` 的多趟 pass 全算進去；`autoReset` 開著只會量到最後一趟＝合成的那 1 call）。
場景＝`traitfx-preview.html` 的 1v4（虎 ×1 對 3 舟 ＋1 劍）。

| 版 | idle draw call | 招式峰值 | 增量 | 峰值三角形 | 三角形增量 | shader program |
|---|---|---|---|---|---|---|
| **0.55 現況** | 151 | **161** | +10 | 50 728 | +64 | 19 |
| **A** | 151 | **158** | **+7** | 50 768 | +104 | 19 |
| **B** | 151 | **166** | +15 | 51 032 | +368 | 19 |
| **C** | 151 | **176** | +25 | 50 804 | +140 | 19 |

- **A 比現況還便宜**（少了 `st.trail` 的線與第二枚印記）。
- **C 最貴**（九片金箔＝九個 draw call；要壓可以換 `InstancedMesh`，本卷沒做）。
- **三版都沒有新增 shader program**（19 支，與 idle 相同）——`paperStamp` 走 `MAT_SOLID.clone()`。
- t1 與 t2 的峰值相同（同一份幾何，差別只在時間軸）。

### 5.2 `duel-perf`（8v8 全場景 fps）

```
node tests/tools/duel-perf.mjs perf scratchpad/perf-worktree.json
{"rendersPerSec":297.7,"rafMedianFps":59.9,"drawCallsPerFrame":932,"trianglesPerFrame":344918,"visible":15,...}

node tests/tools/duel-perf.mjs perf scratchpad/perf-base.json --root=scratchpad/basetree
{"rendersPerSec":269.2,"rafMedianFps":59.9,"drawCallsPerFrame":963,"trianglesPerFrame":353152,"visible":16,...}
```

**★這兩個數字不可以直接相減，也不能拿來分辨三個原型★**，兩個理由：

1. `duel-perf perf` 派的是一個**合成 `ys:duel`**，它**從來不派 `ys:fx-trait`**——三個原型在這支治具裡
   一次都沒演過，量出來的差異對「A/B/C 誰比較貴」是**零鑑別力**（所以沒有分版跑三次：跑了也只是三份雜訊）。
2. 兩次取樣的 `visible` 是 15 與 16（有一尊在量測窗內還沒現身），**場景本身就不一樣**，
   932 與 963 的差來自那一尊，不是來自本卷的改動。

有鑑別力的效能數字是 §5.1。桌機 `rafMedianFps` 兩邊都是 59.9（貼著 vsync），**手機 fps 只有使用者量得到**。

---

## 5b. 我看到還粗的地方（A／B／C；D 版另見 §7.9）

1. **`seal` 的剪影本身就像一塊招牌**：方印身（寬 1.56 × 高 0.75）＋頂上一個小印鈕，
   在任何角度都接近「掛牌／價標」。這是 `js/trait-fx/emblems.js` 的凍結頂點表，
   本卷**沒有動它**（那是批 0 的單一事實來源）。要真的像印章，得改那張表：印身改成接近正方、印鈕加高。
2. **B 版大印落下時是「面朝鏡頭」落下的**，不是「印面朝下」——印面朝下才是蓋章的真動作，
   但那樣就看不到印文。這是「物理正確」與「讀得到」的取捨，我選了讀得到；如果製作人選 B，這一題要裁。
3. **C 版九片金箔的初始位置貼著虎背，撲出去的頭 3 幀會有幾片穿過虎身**（`depthTest` 讓它們忽隱忽現）。
   要修得把 spawn 點往鏡頭方向再推，或改成撲出**之後**才生。
4. **受招方的反應仍然偏弱**。`st.scale` 只吃等比（`w.mo.s` 是純量），做不出真正的 squash-stretch；
   現在是「等比壓縮＋骨骼抖動＋邊光」三件湊出來的。要更狠得讓 `duel-figures` 支援非等比縮放，超出本卷範圍。
5. **三版的 windup 都只有一尊在動**。滿編 8v8 時同隊其他尊完全沒反應，整排站著看同伴撲出去。
6. **「王」字是我挑的**（虎額上那個字，也是印章最好認的字形）。要用篆體「虎」得另外做頂點表。
7. **沒有跑盲讀**。本卷的產出是「給製作人挑方向」，不是「過 L4 閘門」；方向定了之後才值得花兩位讀者的額度。

---

---

# 追加（2026-09-12 晚）：tier 1 改 300ms ＋ D 版

## 6. tier 1 短版 260ms → 300ms（凍結檔 §2.1 修訂，使用者裁定）

### 6.1 改了哪一處

| 檔 | 改動 | 性質 |
|---|---|---|
| `index.html:4327` | `PW_FX.TRAIT_MS_BY_TIER:{1:260→300,2:900,3:1400}` | **單一事實來源**（runtime 唯一一處） |
| `tests/tools/fx-consts.mjs:14` | `TRAIT_MS_BY_TIER = { 1: 300, … }` | **鏡像常數**——該檔檔頭自己寫「要新的數值就改 index.html，這裡跟著改」，而 `assertPageConsts()` 每次跑治具都把兩邊逐鍵比對、不一致就 throw。不同步改的話所有治具當場停 |
| `tests/fxvocab.test.mjs:88` | 禁止字面值清單 `['260','900','1400']` → `['260','300','900','1400']` | **鏡像常數，且處置是加嚴**：這一列列的是「PW_FX 現在有哪些值」，跟著單一來源走；把 300 加進去而**不拿掉 260**，是嚴格的超集合——沒有任何一份實作會因為這一行變得比較容易過 |
| `js/trait-fx/vocab.js:32` | 註解 `短版 → 90／180／240` 改 `104／208／277` | 純註解（`BEAT_FRAC` 是**比例**不是毫秒，一個數字都沒動；切點自己跟著時長走） |

**驗證權威**：`git show origin/main:docs/experiments/2026-09-10-acceptance-fx-tiers.md` 的
「§2.1 修訂（2026-09-12 晚，使用者裁定「直接做 300，確保動作都讀得到」）」一節，
內含「原標準錯在哪／為什麼現在才知道／使用者針對本條明確同意」三項（`02 §2.1` 要求的程序）。
我沒有合併 main，只用 `git show` 讀 remote ref 核對原文。

**沒有別的地方寫死 260**：`grep -rn "260" tests/ js/ index.html` 的其餘命中全是註解、
無關的數字（`20260912` 種子、`waitForTimeout(2600)`、`burstPool`）或說明文字，逐條看過。

### 6.2 `trace-eq`：改了 index.html，引擎仍逐位元組相等

```
node tests/tools/trace-eq.mjs scratchpad/base-index.html index.html
{"old":"scratchpad/base-index.html","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}
```

這一次 `index.html` **真的動了一格**（前面幾節那次是零 diff、這條恆真），所以這個綠燈這回有內容：
它證明 `TRAIT_MS_BY_TIER` 是純演出常數，引擎的 `trace()` 讀不到它。

### 6.3 ★27 支既有短版在 300 下：4 綠 / 23 紅★

```
node tests/tools/traitfx-drive.mjs scratchpad/t300-t1.json --tier=1
4/27 pass · 重複簽章 0
```

**23 支全部只紅在同一項：`fillOK`**（`sig.horizon / run.ms ≥ 0.85`）。
其餘每一項——`rateOK`（F2 短版原生合身）、`actionsOK`（F10 品質下限）、`onTime`、`clean`、
`restored`、`within`、`focus`、`msOK`、`reducedOK`——**27 支全綠，一支都沒紅**。

機制是一句話：**那 23 支的短版時間軸是寫死的絕對毫秒**（`st.tween({ms:80, delay:78})` 這種），
原生就是照 260 排的；時長變 300 之後它們仍在 222–244ms 收工，**最後 56–78ms 畫面上沒東西在動**。
另外 4 支綠的（`eliteSelfCut`／`wardImmuneLost`／`biteGamble`／`hauntLost`）正好是 v0.55 批 0
改寫成走 `st.beat` **比例**的那四支示範招——比例自動跟著 300 走，horizon 264–266、fill 0.88。

**歸因證據（不是本卷的程式碼造成的）**：把**基準樹**（`417b197`，`git archive` 解出來的副本）的
`PW_FX` 也改成 300 之後跑同一支治具，同樣是 **4/27**，而且 sigdump 與本樹**逐位元組相同**：

```
node tests/tools/traitfx-drive.mjs … --tier=1 --sigdump=… --root=scratchpad/basetree   → 4/27
diff scratchpad/sig-base300-t1.tsv scratchpad/sig-new300-t1.tsv                        → 0 行差異
```

★另一個要講清楚的事實★：`phase gate` 三段在 300 下只有 4 支成立——
但那 23 支在 **260 下也一樣不成立**（基準樹實測同為 4/27），因為它們**根本沒呼叫 `st.phase()`**
（批 0 只改寫了 4 支）。**這不是 300 造成的回歸**，不要算進這次的帳。

| 紅的招（23 支，全部只紅 `fillOK`） | horizon(ms) | fill（門檻 0.85） |
|---|---|---|
| `eliteOpenShot` | 235 | 0.783 |
| `wardHpFront2` | 230 | 0.767 |
| `eliteArmor` | 225 | 0.75 |
| `wardFirst` | 228 | 0.76 |
| `boltGamble` | 222 | 0.74 |
| `swarmHalfSplash` | 230 | 0.767 |
| `swarmThorn` | 232 | 0.773 |
| `wardHpAll1` | 230 | 0.767 |
| `wardAtkAll1` | 226 | 0.753 |
| `eliteCleave` | 232 | 0.773 |
| `wardAbsorb4` | 228 | 0.76 |
| `swarmRally` | 226 | 0.753 |
| `wardHpFirst` | 227 | 0.757 |
| `wardRegen1` | 230 | 0.767 |
| `swarmLastStand` | 231 | 0.77 |
| `hauntSteal` | 230 | 0.767 |
| `hauntSee` | 228 | 0.76 |
| `hauntDread1` | 228 | 0.76 |
| `hauntSwap` | 228 | 0.76 |
| `eliteVsSwarm` | 244 | 0.813 |
| `swarmPierce` | 228 | 0.76 |
| `hauntFearX2` | 228 | 0.76 |
| `swarmFeed1` | 230 | 0.767 |

**沒有動它們，也沒有動判準**（`fillOK` 的 0.85 一個字元沒改）。回修歸各批：
批 1 祖靈 9 支、批 2 香火 8 支（`biteGamble` 已綠）、批 3 陰氣 8 支（`hauntLost` 已綠）——
每一支的修法都一樣：把絕對毫秒換成 `st.beat` 的比例，與那四支示範招同一個做法。

### 6.4 其餘測試

```
node tests/fxtier.test.mjs           → 14 綠 ／ 0 紅
node tests/fxvocab.test.mjs          → 15 綠 ／ 0 紅
node tests/emblem-collision.test.mjs → 9 綠 ／ 0 紅
node tests/review.test.mjs           → 通過 28　失敗 0
node tests/nightrules.test.mjs       → 16 綠 ／ 0 紅
node tests/duel-desync.test.mjs      → 7 綠 ／ 0 紅
node tests/lineup-order.test.mjs     → 8 綠 ／ 0 紅
node tests/legend.test.mjs           → 32 過 / 0 失敗
node tests/aistake.test.mjs          → 通過 8　失敗 0
node tests/conscap.test.mjs          → 通過 5　失敗 0
node tests/roles-balance.test.mjs    → 32 過 / 0 失敗
node tests/wish16.test.mjs           → PASS=36 FAIL=0
node tests/tools/traitfx-drive.mjs … --tier=2  → 30/30 pass（完整版不受影響）
node tests/tools/traitfx-drive.mjs … --tier=3  → 3/3  pass
```

---

## 7. D 版（`?proto=tigerD`）

### 7.1 它是什麼

C 的華麗（金箔顆粒流、咬中炸金色紙錢、印文由暗燒成硃紅）
＋ B 的落地重音（大印砸落、落地震動、香火貼桌陣、彈起留印文）。

兩個和 B 不一樣的作法：

1. **印面朝下與讀得到兼顧**：大印的俯仰角**逐幀算**（`pitchTo()`，不是 `paperStamp` spawn 當下凍住的固定值）：
   橫移 8°→22°、砸落 22°→38°（印面朝下、仍有 52° 面對著鏡頭）、
   落地**前 2 幀拉回 4°＝正面對鏡頭**（「蓋章那一格」），之後才彈起淡出。
2. **金箔走 `InstancedMesh`**：九片＝**1 個 draw call**（C 版是九個各自的 `Mesh`，那正是 C 貴在哪）。
   逐片出場的錯開改用「縮放從 0 長出來」做。

### 7.2 ★t1（300ms）的落印拍佔幾 ms——交裁★

實測時間軸（`js/trait-fx/proto/tiger.js` 的具名切點 × `BEAT_FRAC[1]` × 300）：

| 段 | t1（300ms） | 幀數 @60fps | t2（900ms） |
|---|---|---|---|
| 蓄勢（蹲伏＋大印浮現＋金箔長出） | 0–81.1ms | 4.9 | 0–234ms |
| 大印橫移到獵物頭頂 | 81.1–140.4ms（59.3ms） | 3.6 | 234–391ms |
| **大印砸落（印面朝下 22°→38°）** | **140.4–208ms（67.6ms）** | **4.1** | 391–560ms（169ms） |
| **正面亮相（印面轉正 38°→4°）** | **208–241ms（33.0ms）** | **2.0** | 560–630ms（69.6ms） |
| 大印彈起淡出 | 241–264ms（23.0ms） | 1.4 | 630–792ms |
| **印文由暗燒成硃紅**（與上兩段重疊） | **208–255.6ms（47.6ms）** | **2.9** | 560–757ms（197ms） |
| **落印拍合計（砸落起 → 燒完）** | **140.4–255.6ms ＝ 115.2ms（佔 38.4%）** | **6.9** | 391–757ms（366ms） |

**我認為需要多少**：這一拍要送出**三件資訊**，每件至少 3 幀（50ms）才會被眼睛登記——
① 印面朝下砸下來 ② 正面亮相（「蓋章」那一格）③ 印文燒紅。
現在只有 ①（4.1 幀）勉強夠，② 只有 **2.0 幀**、③ 2.9 幀，都在下限之下。
**需要約 184ms（砸落 68 ＋ 正面 58 ＋ 燒印 58），比現在多 ~70ms。**

兩條路，**都交裁、我沒有自己選**：

| 選項 | 做法 | 代價 |
|---|---|---|
| 甲 | t1 再從 300 → **370ms** | 每場對決再 +7%；且又要動單一來源＋27 支重跑一次 |
| 乙 | **砍掉「橫移」那 59.3ms**：大印不從虎頭出發，直接在獵物頭頂上方生成 | 省下的 59ms 剛好補上缺口，t1 不必再動；代價是「這枚印是虎爺的」少了一個鏡頭語言（印不再從虎身上出來），要靠色票與金箔流承擔 |

**現況（本卷交付的這一版）走的是「300ms、落印拍 115ms」**——三拍都在、但 ②③ 偏短。
連拍 `D/sheet-t1.png` 的第 5 格就是那 2 幀的正面亮相，讀得到；動態要放慢 5 倍（12fps GIF）才看得清。

### 7.3 機械驗收

```
node tests/tools/traitfx-drive.mjs scratchpad/Dfin-t1.json --only=biteGamble --tier=1 --proto=tigerD
PASS biteGamble  tiger  t1/300ms msOK=true rate=1 fill=0.88 acts=16 handled=true alive=true restored=true
                        onTime=true clean=true focus=true end=29 maxD=2.3108 err=0 prog+0
                        sig=28b/burst+emblem:seal+foil+mark:seal+ring/T
node tests/tools/traitfx-drive.mjs scratchpad/Dfin-t2.json --only=biteGamble --tier=2 --proto=tigerD
PASS biteGamble  tiger  t2/900ms … fill=0.88 acts=16 … err=0 prog+0（同一組簽章）
```

phase gate（門檻 windupBone 0.08／windupModel 0.04／travel 0.40×距離／react 0.03）：

| 跑 | phases | windup bone／model | travel 位移／門檻 | react delta |
|---|---|---|---|---|
| D t1 | windup,travel,react | 0.2627／0.0724 | 2.2964／1.2481 | 0.3321 |
| D t2 | windup,travel,react | 0.1048／0.0289 | 1.6902／1.2481 | 0.1250 |

（B 那個「餘裕只剩 0.003」的教訓照樣適用：D 的蹲伏幅度是 **0.85**，不是踩線的 0.45，
t2 的 windup bone 量到 0.1048，對門檻 0.08 有 0.025 的餘裕。）

### 7.4 視覺迴圈（三輪）

#### 第 1 輪
**看圖**：`scratchpad/rec-D/montage.png`（t1 逐幀 11 格）。
**發現**：① 砸落全程大印被壓成一根窄條（俯仰 30°→46° 疊上機位本身 24° 的俯角）；
② 落地峰值 1.16×iconSize（≈0.72 世界單位）整個蓋住獵物，反而看不到「誰被蓋印」。
**修**：俯仰改 22°→38°；落地峰值 1.16→0.96。

#### 第 2 輪
**看圖**：`scratchpad/rec-D/zoom-land.png`（落地四格 2× 放大）。
**發現**：大印是**一塊沒有字的金磚**——鎏金 `#ffc21e` 越過 bloom 門檻（`js/renderer.js` `BLOOM.threshold 0.7`）
之後往白色去，光暈半徑比筆畫還寬，把 ink 色的字整個吃掉；把字加粗到 `w 0.40` 仍然吃不住。
**修**：不是調 bloom（`ART_BIBLE §8` 明寫那個一動整張牌桌要重驗），是**換配置**——
印面＝ink 暗底（留得住細節）、印身與厚度＝鎏金（遠看認得出是金印）、字＝鎏金（會發光的那個才是主角）。
這剛好也是實體印章的樣子：金邊、暗印面、陽刻的字。

#### 第 3 輪
**看圖**：`scratchpad/rec-D/zoom-land.png` 第 2 版，仍看不到字。
**量**（不用猜的）：`window.__tfx.fxDump()` 補了「複合物逐片列色與三角形數」之後，探針印出

```
emblem:seal[… kids=[{"c":"#ffc21e","tris":36},{"c":"#2a1004","tris":8},{"c":"#ffc21e","tris":20}]]
```

三片都建出來了、`visible` 全 true、`opacity` 全 1——**字不是沒畫，是印身在螢幕上只有 ~18px 高**
（`seal` 的方印身是 1.56×0.75 的扁框，整枚只有 0.48 世界單位）。
**修**：字面跟著印身的比例拉寬壓扁（`w 0.52／h 0.25`）、落地峰值 0.96→1.05。
**再看**：`scratchpad/rec-D/zoom2.png` —— 大印的金字與獵物身上那枚硃紅印文的「虎」都讀得出來。

### 7.5 印面字：「王」→「虎」（A／B／C 一併換）

`js/trait-fx.js` 的 `o.glyph` 從四畫的「王」換成十畫的「虎」（虍＋几，矩形拼筆）。
仍然是 **N 個 shape 合成一個 `ShapeGeometry`**，所以不論幾畫都只多一個 draw call（實測 20 個三角形）。
A／B／C 的印文一併換掉，連拍與 t2 GIF 都重出（GIF 檔名帶 `-hu`）。

**誠實話**：在 780×360 的格子上，這枚印讀得到的是「**印上刻著一個字**」，
不是「這個字是虎」——`seal` 的方印身是 2:1 的扁框，十畫的字塞進去每一筆只有 1–2px。
要真的讀出「虎」得改 `js/trait-fx/emblems.js` 的 `seal` 頂點表（印身改接近正方），那是批 0 的凍結表。

### 7.6 效能（`proto-record`，量整幀；idle 151 calls / 50,664 tris）

| 版 | 招式峰值 draw call | 增量 | 峰值三角形 | shader program（idle → 峰值） |
|---|---|---|---|---|
| 0.55 現況 | 161 | +10 | 50,728 | 19 → 19 |
| A | 158 | +7 | 50,792 | 19 → 19 |
| B | 166 | +15 | 51,080 | 19 → 19 |
| C | 176 | +25 | 50,828 | 19 → 19 |
| **D** | **168** | **+17** | 51,116 | **19 → 21** |

**D 的 168 ≤ C 的 176 ✅**（目標達成）：D 比 C 多了「大印＋貼桌陣」共 4 個物件，
但九片金箔由 9 個 draw call 收斂成 1 個，淨值仍比 C 低 8。

**★D 的 program 19→21 要講清楚★**：`InstancedMesh` 在 three 是另一支 shader 變體（`USE_INSTANCING`），
演出中當場編、演完又釋放——所以 `traitfx-drive` 的 `programsGrew`（比的是演出前後）看不到它，讀數仍是 0。
**這是既有狀況，不是 D 帶進來的**：現況的魔神仔紅帽 `hauntLost`（`js/trait-fx/yinqi.js:150` 走 `st.icons`）
實測同樣是 **20 → 22**。試修過（比照另外三支材質模板常駐一顆 0.01² 的 instanced 暖身物件），
確實讓 idle 與峰值相等（D 23→23、hauntLost 24→24，不再當場編），
**代價是常駐 +4 支 program、+2 draw call**——那是產品層的取捨（手機少一次編譯停頓 vs 每幀多兩個 call），
**交裁，沒有把它夾在原型卷裡改**（量到的數字與取捨留在 `js/trait-fx.js` 暖身區的註解裡）。

### 7.7 等價性（sigdump：本卷的程式碼有沒有動到別的招）

★關鍵設計★：`260→300` 是**裁定的常數**，`js/trait-fx.js` 的新積木是**本卷的程式碼**。
要分開這兩個變數，比對的兩棵樹就得**常數相同、只有程式碼不同**——
所以把量測用的基準樹副本（`scratchpad/basetree`）的 `PW_FX` 也改成 300。

```
diff scratchpad/sig-base300-t2.tsv scratchpad/sig-new300-t2.tsv   → 0 行差異（30/30 pass 兩邊都是）
diff scratchpad/sig-base300-t1.tsv scratchpad/sig-new300-t1.tsv   → 0 行差異（4/27 pass 兩邊都是）
```

鑑別力（同一支治具帶 `--proto=` 時 diff 只吐 biteGamble 一行）前面已驗過，仍然成立。

### 7.8 交付檔案

| 版 | 連拍 t1 | 連拍 t2 | 慢動作 GIF | 原速 WebM |
|---|---|---|---|---|
| **D** | `D/sheet-t1.png` | `D/sheet-t2.png` | `D/biteGamble-tigerD-t1-12fps.gif`、`D/biteGamble-tigerD-t2-20fps.gif` | `D/biteGamble-tigerD-t1-60fps.webm`、`D/biteGamble-tigerD-t2-60fps.webm` |
| A（換虎字） | `A/sheet-t1.png` | `A/sheet-t2.png` | `A/biteGamble-tigerA-t2-hu-20fps.gif` | 沿用 `A/biteGamble-tigerA-t*-60fps.webm` |
| B（換虎字） | `B/sheet-t1.png` | `B/sheet-t2.png` | `B/biteGamble-tigerB-t2-hu-20fps.gif` | 同上 |
| C（換虎字） | `C/sheet-t1.png` | `C/sheet-t2.png` | `C/biteGamble-tigerC-t2-hu-20fps.gif` | 同上 |

A／B／C 的 `sheet-t*.png` 都已用「虎」字＋300ms 重出（連拍只保留最新那一份，所以檔名沒加 `-hu`）。
`base/` 底下是 0.55 現況的對照，維持 260ms 那一版不動——它的用途就是「改之前長什麼樣」。

### 7.9 D 版我看到還粗的地方

1. **正面亮相只有 2 幀**（見 §7.2），t1 上「蓋章那一格」是踩在下限上的。
2. **「虎」字在 t1 的印身上只讀得到「有個字」**（見 §7.5），要真的讀出字得改凍結的 `seal` 頂點表。
3. **大印落地時會擋住獵物上半身 1–2 幀**（峰值 1.05×iconSize ≈ 0.65 世界單位）。印文在它前面、讀得到，但構圖上是壓著的。
4. **金箔在撲出的頭 3 幀會穿過虎身**（`depthTest` 讓它們忽隱忽現）——要修得把生成點往鏡頭方向推，或改成撲出**之後**才生。
5. **InstancedMesh 的 shader 當場編**（見 §7.6），已量到、已寫明取捨、未修。
6. §5b 那七條對 D 一樣成立：受招方只能等比壓縮、滿編時只有一尊在動、沒跑盲讀。

---

## 8. 範圍（`git diff --stat`）

完整輸出見 §4.5（程式碼與治具）；證據目錄另有 28 個檔（6 張連拍、6 段 GIF、6 段 WebM、8 份逐幀 record.json、2 段現況對照 GIF）。動到的**程式碼／治具**只有六個檔：

| 檔 | 改了什麼 | 對應需求 |
|---|---|---|
| `js/trait-fx.js` | 新增 `st.paperStamp()`／`st.solid()`／`st.stick()`；`?proto=` 登記點切換 | 三版共同骨架③、切換機制 |
| `js/trait-fx/proto/tiger.js`（新） | 三個原型函式＋共用的 crouch／lunge／snapJaw／recover／preyHit | 三個候選本體 |
| `tests/tools/proto-record.mjs`（新） | 逐幀錄影＋整幀 draw call 量測＋GIF／WebM 合成 | 條件 3 的動態紀錄、條件 5 |
| `tests/tools/traitfx-preview.html` | 唯讀診斷 `renderMeasured()`／`fxDump()` | 條件 5、迴圈第 2 輪的歸因 |
| `tests/tools/traitfx-drive.mjs` | `--proto=` **純轉送**給治具頁 | 條件 2 |
| `tests/tools/blindread-sheet.mjs` | `--proto=` **純轉送**給治具頁 | 條件 3 |

**兩支既有治具的判準一行沒動**：`blindread-sheet` 的 `FRAME_AT`／`CELL`／`SHEET`／`SHOT`／混洗種子、
`traitfx-drive` 的 `verdict` 邏輯與所有門檻，都與基準樹逐字元相同（`git diff` 可逐行核對）。
`js/trait-fx/proto/` 是**子目錄**，`tests/fxvocab.test.mjs` 的 `readdirSync` 只掃 `js/trait-fx/` 的
頂層 `.js`，所以那條「徽記尺寸單一事實來源」的掃描分母沒有被稀釋（15 綠不是因為少掃了東西）。

---

## 9. 製作人要裁的題

| # | 題目 | 我的看法（不是建議答案，這是品味題） |
|---|---|---|
| Q1 | A／B／C 選哪一版當 `biteGamble` 的正式演出？ | 三版都過機械閘門。A 最便宜且「虎撲」最有力；B 的因果最好讀（大印砸下來＝一眼看出發生了什麼）；C 的系別（香火）最明確但最貴 |
| Q2 | 選定的那一版要不要**推廣成其他 26 支招的模板**？ | 若要，`st.paperStamp` 與「動作＋小道具＋反應」的三段骨架就得進 `ART_BIBLE §10`，並另開一卷逐招換掉現有的平面徽記 |
| Q3 | `emblems.js` 的 `seal` 頂點表要不要改（§6 第 1 條）？ | 那是批 0 的凍結表，改它要走 `02 §2.1` 的程序 |
