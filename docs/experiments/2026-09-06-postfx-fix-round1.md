# 後處理卷 第 1 輪覆審 修復（2026-09-06）— H-1／M-1／M-2／M-3

- 基準 commit：`59f7483`（第 1 輪覆審，只審不改碼）。動到的檔只有 `js/camera-director.js`、`tests/tools/cam-unit.mjs`、`tests/tools/cam-drive.mjs`（＋本報告與 evidence）。事件定義沒動，其他檔沒動，零亂數（本檔一如既往不碰 `S.rng`／`S.rngUi`）。
- 治具輸出（修剪成 verdict／summary 存檔）：`docs/experiments/2026-09-06-postfx-fix-round1-evidence/`。
- 環境：worktree `.claude/worktrees/agent-aa5247276bf17f244`；GPU `ANGLE (AMD, AMD Radeon 780M Graphics, Direct3D11)`；埠 8897（cam-unit）／8898（duel-drive、traitfx-drive）／8899（cam-drive）。

## 結論先行（逐條三態）

| 覆審條 | 狀態 | 一句話 |
|---|---|---|
| **H-1** clearOrbitLean 沒折回基座 → 單幀跳 2.41 | **真的修好** | 清除時改以「當下實際機位」當補間起點，以固定角速度收回基座；六個清除入口的清除當幀位移從 **2.407594 → 0.000148**（最壞格），整段折回逐幀最大 **0.175812**（門檻 0.20）。 |
| **M-1** lean 被清零單幀跳 0.50 | **真的修好** | 同一套折回涵蓋 lean：`E4/E5/E6` 從 **0.504283／0.504148／0.504223 → 0.000092／0.000069／0.001089**。 |
| **M-2** lean 的 dist −0.3 打到 camStable 閘門 | **真的修好** | `LEAN.dist` 改 0（常數註解寫明原因），lean 期間 \|Δ`camera.position.length()`\| 從 **0.2836 → 1.776e-15**。 |
| **M-3** reduced-motion 下多一個燒毀震鏡 | **真的修好** | `onBurn` 加 `prefersReduced()` gate，reduced 下 `ys:fx-burn` 與「沒有這個監聽器的 v0.34」逐項相同（**0.515 → 0**），同場 `ys:fx-punch` 仍照動（0.3433，證明不是治具沒餵事件）。 |

**兩件需要使用者裁定的事**（我沒有自行改凍結檔，見文末「凍結條的動到之處」）：① `LEAN.dist` 從凍結檔 P-4 (b) 寫的 −0.3 改成 0；② 凍結檔 P-4 「(c) 維持現行 punch」在 reduced-motion 下的解讀，我採覆審員 M-3 的讀法（現行＝v0.34＝不震）。

## 改了什麼（檔案:行號）

### `js/camera-director.js`

| 行號 | 改動 | 對應 |
|---|---|---|
| `62-71` | `LEAN.dist: 0.3 → 0`，並在常數上寫明「\|camera.position\| 恆等於 dist，而它就是 `duel-figures.js:467` `camStable` 的閘門」 | M-2 |
| `73-81` | 新增 `CLEAR_DEG_PER_MS`／`CLEAR_MS_MIN`／`CLEAR_MS_MAX`：折回用**固定角速度**而不是固定時間 | H-1／M-1 |
| `134-146` | 新增 `foldWrite`、`curDist/curTilt/curYaw/curLookY`、`foldFrom` 五個狀態 | H-1 |
| `155-170` | `goto()` 拆成 `startTween(src, shot, ms)` ＋ `goto(shot, ms)`；`goto` 的起點預設仍是「上一個 target」（v0.34 語意不動），只有 `foldFrom` 有值時才改從實際機位接續 | H-1 |
| `179-201` | `clearOrbitLean()` 改成：偏移層歸零 ＋ 把當下實際機位記進 `foldFrom` ＋ 以固定角速度往目前的目標補間 | H-1／M-1 |
| `214-221` | `onDuel` 把 `clearOrbitLean()` 挪到 `goto()` **之前**（不然 `goto` 會先把 `from` 設成上一個 target，折回的起點就被丟掉） | H-1 |
| `266-273` | `onBurn` 加 `prefersReduced()` 早退 | M-3 |
| `318-350` | 寫入區塊：合成結果另外記進 `cur*`（不含 punch）；條件加 `foldWrite`；折回段最後一幀（t 剛好到 1）也寫；`update()` 結尾把 `foldFrom` 作廢 | H-1 |

浮點等價：`tilt`／`yaw`／`dist` 三行只是把同一串運算拆成先存 `cur*` 再乘 `DEG`／再減 punch，結合順序不變（`a - b - c` 仍是 `(a-b)-c`），偏移全零時逐位元相同——A2 實測 `afterDuelEnd_diff = 0` 佐證。

### `tests/tools/cam-unit.mjs`（新增三條常駐斷言 ＋ 兩處量測窗調整）

| 行號 | 改動 |
|---|---|
| `59-62` | 治具把 `performance.now` 綁到合成時鐘（見下方「治具校正」） |
| `132` | SKIP 場的 cancel 後從 60 幀延長到 120 幀（折回段最長 700ms，殘留要在折回結束後量） |
| `137-227` | 新增 S7 邊界戲：E1–E9 九個清除情境 ＋ X1／X2 兩個 v0.34 既有情境（只揭露不斷言） |
| `286-298` | A4 的殘留量測窗改成「折回段跑完之後」（`CLEAR_F`），另外揭露舊窗口的值 |
| `308-312` | 新增 `rBurnNoop`：reduced-motion 下 burn 與 v0.34 的逐項差 |
| `314-331` | 新增 A7（清除單幀位移 ≤ `MAX_FRAME_STEP` 0.20）與 A8（lean 期間 \|Δlength\|）的量測 |
| `351-366` | verdict：A6 的 (c) 改判、新增 A7／A8／A9，`ALL_PASS` 納入九條 |

### `tests/tools/cam-drive.mjs`

`107-111`：只改註解——原註解寫「lean 的 dist −0.3 …用 dist 驗回位最乾淨」已過時，改成寫明 `distDip` 現在量到的是 punch 漏出來的殘量（實證見下），並指向 cam-unit 的 A8。

## 驗收（先紅後綠，兩個方向都驗）

### 鑑別力：同一份治具跑在**修復前**的 `camera-director.js` 上

```
$ node tests/tools/cam-unit.mjs <out> --port=8897 \
    --base=<v0.34(5f76adc) 的 camera-director.js> \
    --new=/tests/tools/_tmp-prefix-camdir.js      ← 59f7483 的 camera-director.js 暫時放進 repo
A1_PASS = True      A2_afterDuelEnd_diff = 0   A2_PASS = True   A3_PASS = True
A4_skip_residual_pos = 0   A4_PASS = True      A5_PASS = True
A6_reduced_burn_noop = 0.515      A6_PASS = False   ← M-3 紅
A7_clear_frameStep_max = 2.407594 A7_PASS = False   ← H-1／M-1 紅
A8_lean_dLenMax = 0.2836          A8_PASS = False   ← M-2 紅
A9_reduced_burn_noop = 0.515      A9_PASS = False   ← M-3 紅
errors = 0  ALL_PASS = False
```

紅在**行為斷言**上（位移量、長度變化量、與基準版的逐項差），不是屬性或載入錯誤；A1–A5 在修復前仍是綠的，代表新斷言沒有順手把既有條也弄紅。存檔：`…-evidence/cam-unit-before.json`。

修復前逐格（`f1_new` ＝清除當幀位移）：

```
E1_duelEnd_during_orbit      2.407514      E6_traitCancel_during_lean  0.504223
E2_traitCancel_during_orbit  2.407594      E7_reveal_during_orbit      2.407237
E3_table_during_orbit        2.407514      E8_end_during_orbit         2.407577
E4_duelEnd_during_lean       0.504283      E9_duel_during_orbit        2.406845
E5_table_during_lean         0.504148
```

### 反面：健康狀態下這組證據會變綠

```
$ node tests/tools/cam-unit.mjs <out> --port=8897 --base=<v0.34 的 camera-director.js>
A1_orbit_dLenMax 8.882e-16   A1_PASS True
A2_afterDuelEnd_diff 0       A2_PASS True   （揭露 A2_duelSettled_diff 1.485e-4，與修復前同值）
A3_leanA {peak200 -9.4522, atMs 0.0024, distDrop 0}
A3_leanB {peak200  9.4571, atMs 0.0024, distDrop 0}   A3_PASS True
A4_skip_peak_before_deg 27.7188  A4_skip_residual_pos 0  A4_skip_residual_yaw_deg 0  A4_PASS True
A5_ratio 1.5                 A5_PASS True
A6_reduced_noop_max 0  A6_reduced_burn_noop 0  A6_reduced_refPunch_drop 0.3433  A6_PASS True
A7_clear_frameStep_max 0.175812（worst E2_traitCancel_during_orbit，門檻 0.20）  A7_PASS True
A8_lean_dLenMax 1.776e-15    A8_PASS True
A9_reduced_burn_noop 0       A9_PASS True
errors 0                     ALL_PASS True
```

修復後逐格（`f1_new` / `max_new` / max 落在第幾幀）：

```
E1 0.000029 / 0.058096 @26     E6 0.001089 / 0.099071 @6
E2 0.000148 / 0.175812 @20     E7 0.000137 / 0.103791 @16
E3 0.000029 / 0.058096 @26     E8 0.000022 / 0.130868 @42
E4 0.000092 / 0.173894 @26     E9 0.000656 / 0.825567 @20（見下）
E5 0.000069 / 0.131733 @26
X2_punchPeak_duelEnd 0.415986（v0.34 既有，新舊逐值相同）
```

**決定性**：同指令連跑兩次，verdict 逐鍵逐值相同（`cam-unit-after.json` vs `cam-unit-after-run2.json`）。

### 真頁面（不是只有單元治具）

```
$ node tests/tools/duel-drive.mjs "…/index.html?paperwar=1&fxcount=1&seed=7" <out> --duels=4 --port=8898
{"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":10,"trait":5,
 "load":{"ms":79,"total":12,"loaded":12,"timedOut":false}, "ver":"v0.35・…"}

$ node tests/tools/cam-drive.mjs "…&seed=7" <out> --duels=4 --port=8899
errors 0 · orbit_dLenMax_all 4.252e-07 · orbit_dLen_PASS true
traits_n 5 · traits_signOk 5 · traits_backOk 5 · trait_PASS true

$ node tests/tools/traitfx-drive.mjs <out> --port=8898
27/27 pass · 重複簽章 0
```

（附帶：同一支 `cam-drive` 跑在**修復前**的 director 上 `trait_PASS` 是 **false**（duel 4 第一招 `backDist` 量不到），修復後 true。存檔 `cam-drive-before.json` / `cam-drive-after.json`。）

## 三個要說清楚的判讀

### 1. 折回時間為什麼是「固定角速度」而不是任務單建議的 250ms

先照建議做了 250ms，A7 的**清除當幀**確實降到 0.0029，但整段折回的逐幀最大值落在第 7 幀 = **0.457592**，仍是平滑補間既有上限（0.152624）的三倍——只是把「一次瞬移」換成「一次甩鏡」，離「單幀位移 ≤ 0.20」還差得遠。原因是折回的角度是變數（orbit 滿幅 38°、lean 只有 10°），固定時間等於固定不了角速度。改成固定角速度（38° 用 700ms，夾在 200–700ms）之後 E2 的整段最大值降到 **0.175812**，而 lean 這種小偏移仍在 200ms 內收完、不會變得拖沓。

實務上這個時間多半用不到上限：六個清除入口裡有五個（duel／duel-end／table／reveal／end）後面緊接一個 `goto()`，它會用掉同一個折回起點、換成自己的 ms（table 900／reveal 550／end 1400／duel 700）；只有 `ys:fx-trait-cancel` 是真的靠折回段自己收。

### 2. A7 為什麼 E9 只查前 5 幀、X1／X2 只揭露不斷言

- `E9_duel_during_orbit` 的量測窗裡含一段 **v0.34 就有的** 180° `duel→duel` 基座擺盪（新 0.825567／舊 0.819084，落在第 20 幀）。那是既有運鏡速度，不是清除造成的瞬移，本次不動它——所以 E9 只斷言清除當幀與前 5 幀。
- `X2_punchPeak_duelEnd` 0.415986（新舊逐值相同）＝ `onDuelEnd` 把 `punchU` 設回 1 的既有行為，任務單明講 punch 同族維持。它同時是這支量測的**反面對照**：修好之後 E1–E8 全部 ≤0.20 而 X2 仍在門檻之上，代表這支量測不是恆小、0.20 這條線不是恆真。

### 3. cam-drive 的 `distDip` 已經不是 lean 的量（實證）

修復後 `distDip` 仍是 0.2242／0.2818。拿修復前後同 seed 各跑一次真頁面比對：

```
              duel2 side B     duel4（四招）
修復前 0.2241            0.2817 / 0.2817 / 0.2818 / 0.2818
修復後 0.2242            0.2818 / 0.2818 / 0.2818 / 0.2818
```

**逐值不變**＝它跟 `LEAN.dist` 無關。成因是 hitstop 把 punch 的牆鐘時長拖過 `cam-drive.mjs` 那個 420ms 的排除窗，漏進來的 punch 殘量（0.2818 / 0.6 ≈ 0.47 的 punch 包絡）。真正驗「lean 不動 dist」的是 cam-unit 的 A8（決定性、1.776e-15 vs 修復前 0.2836）。已把這段寫進 `cam-drive.mjs:107-111` 的註解，免得下一個人再被這個數字誤導。

## 治具校正（不是放寬，是把量錯的地方量對）

`cam-unit.mjs` 的合成時鐘（`now` 從 1000 起跳、每幀 +16.67）與 director 的 `REVEAL_HOLD_MS` 排程用的 `performance.now()` 不同源：治具幾毫秒真實時間內就推完幾萬毫秒合成時間，所以 `ys:reveal` 的自動返回會在**下一幀**就到期，`E7` 量到的是「reveal 補間才開始就被 goto(table) 打斷」的治具假象（f1 = 1.173461，恰與覆審探針 `cam-edge.json` 的 `SD` 同值）。把 `performance.now` 綁到同一把尺之後，E7 修復前 2.407237、修復後 0.000137，量的才是導演行為。此改動不影響 A1–A6：既有 S1–S6 序列從不派 `ys:reveal`，而 director 只有 `onReveal` 讀 `performance.now()`。

## 凍結條的動到之處（`02 §2.1`，逐條寫明，未經同意者不當作已通過）

1. **A4 的殘留量測窗**：原本從 `cancel` 的下一幀起算（修復前是瞬間清零，那個窗口等價）；折回是刻意引入的行為改變，殘留只有在折回段跑完後量才有意義，所以窗口改成 `cancelAt + 46 幀`（700ms 上限 + 4 幀）起算，並把 cancel 後的取樣從 60 幀延到 120 幀。**折回段沒有變成空窗**：它被新的 A7 逐幀盯著（每一幀 ≤0.20），而 A4 的門檻本身（`<1e-6`）沒有放寬，修復後實測仍是 **0**（不是「小到可以接受」，是 0）。舊窗口的值也照樣揭露在 verdict 裡（`A4_residual_from_cancel_frame` = 1.573052 ＝折回段本身）。
2. **A6 的 (c) 判準**：原本寫死 `rBurnRatio === 1.5`（＝把「reduced-motion 下也震鏡」當通過條件），改成「與沒有 burn 監聽器的 v0.34 逐項相同」。這是**加嚴**，而且是覆審 M-3 指出「原判準把新增的動態當成既有行為」的直接後果——但它同時改變了對凍結檔 P-4 「(c) 維持現行 punch」的解讀，所以列在這裡等使用者確認。
3. **`LEAN.dist` 從凍結檔 P-4 (b) 明寫的 −0.3 改成 0**：這是覆審 M-2 的修法，會讓 P-4 (b) 的條文與實作不一致。**我沒有改凍結檔**（動它要走 `02 §2.1` 的同意程序），請使用者裁定條文怎麼寫。
4. 沒有動的：A1／A2／A3／A5 的門檻、案例集、fixture、執行指令；`ORBIT`／`PUNCH`／`BURN_PUNCH_POWER`／`REVEAL_HOLD_MS` 全部原值。

## `git diff --stat` 逐檔對應

```
 js/camera-director.js     |  98 ++++++++++++++++++++-----   H-1／M-1（折回）、M-2（LEAN.dist=0）、M-3（onBurn gate）
 tests/tools/cam-drive.mjs |   7 +-                          純註解：distDip 已非 lean 的量，指向 A8
 tests/tools/cam-unit.mjs  | 146 +++++++++++++++++++++++++-  新增 A7／A8／A9 常駐斷言、A4 窗口、A6 (c) 判準、時鐘校正
 3 files changed, 223 insertions(+), 28 deletions(-)
```

（外加新檔：本報告與 `2026-09-06-postfx-fix-round1-evidence/` 七個修剪過的治具輸出。）

## 沒做的事 / 剩下的風險

- 覆審的 **H-2（`bloom.setSize()` 無條件 dispose 深度貼圖）**、**M-4（`bloomOK=false` 下外殼照畫）**、L-1～L-5 都**沒碰**——任務單只指定 H-1／M-1／M-2／M-3。H-2 仍是 HIGH。
- `E9_duel_during_orbit` 的 180° 基座擺盪（0.8256）與 `X1`／`X2` 是 v0.34 既有的運鏡速度，本次未動。
- 三個折回常數（`CLEAR_DEG_PER_MS`／`MIN`／`MAX`）與 `LEAN.dist=0` 都是**手感題**，只有機械證據（單幀位移上限），沒有真機試玩過。
