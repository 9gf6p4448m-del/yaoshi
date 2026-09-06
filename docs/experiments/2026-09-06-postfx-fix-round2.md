# 後處理卷 第 2 輪覆審 修復（2026-09-06）— HIGH（折回段的 goto 破口）／lean 上升沿／A8 涵蓋 burn／治具兩條 LOW

- 基準 commit：`de090e1`（＝`ae7b77b` 第 1 輪修復 ＋ `7f56084` H-2 修 ＋ `e9cc66f` 第 2 輪覆審報告的合併）。
- 動到的檔只有 `js/camera-director.js` 與 `tests/tools/cam-unit.mjs`（＋本報告與 evidence）。事件定義沒動，其他檔沒動，零亂數。
- 治具輸出：`docs/experiments/2026-09-06-postfx-fix-round2-evidence/`。
- 環境：worktree `.claude/worktrees/agent-aa5247276bf17f244`；GPU `ANGLE (AMD, AMD Radeon 780M Graphics, Direct3D11)`；埠 8897（cam-unit）／8898（duel-drive、traitfx-drive）／8899（cam-drive）／8902（cam-r2）／8903（skip-real）／8906（fold-race）。

## 結論先行（逐條三態）

| 覆審條 | 狀態 | 一句話 |
|---|---|---|
| **N-1（HIGH）** 折回段進行中來 goto 入口 → 單幀跳 2.2662／2.3067 | **真的修好** | 補間起點改成**一律**用「上一幀實際寫入的機位」`cur*`，不再靠 `foldFrom` 這種只在特定入口記、只活一幀的旁路。折回 1/4／2/4／3/4 處插 `ys:duel`／`ys:table`／`ys:reveal` 九格：**2.2662／1.2564 → f1 ≤0.000344、逐幀 ≤0.2384**；SKIP 出貨序列（cancel→1 幀→duel-end→1 幀→duel）**2.7465 → 0.0830**；覆審員自己的真頁面探針 `fold-race.mjs` `maxStepAtDuelEnd_pm4` **2.306696 → 0.000538**。 |
| **N-3（MEDIUM）** lean 上升沿當幀橫跳 0.6324 | **真的修好** | `LEAN.riseMs = 120` ＋ 包絡改成「上升沿 × 下降沿」。上升沿 **0.632427 → f1 0.006785、逐幀最大 0.181669**；覆審員的 `cam-r2.mjs` `D3_lean_onset`／`E1_lean_window` 獨立量到同值。 |
| **N-2（MEDIUM）** burn punch 動 `dist` 0.75755、A8 的窗看不到它 | **窗修好，行為照裁定不動** | A8 的量測窗延伸到 burn 與 punch 兩段並寫進 verdict（`A8_burn_dLenMax` **0.75755**、`A8_punch_dLenMax` 0.50511），但**是記錄值不是斷言**——主對話裁定不改 burn punch 的行為（punch 同族、v0.34 既有形狀、鎖排法一場只選一次）。理由與殘餘風險見文末。 |
| **LOW（折回時間只看 yaw）** | **真的修好** | 折回時長改由 yaw／tilt／dist 三者換算成世界距離後取最大值，且不得短於基座補間的剩餘時間。`cam-r2.mjs` 的 `G1_cancel_during_long_tween` 逐幀 **0.359335 → 0.196049**（同段乾淨基準 `G0` 是 0.170377）。 |
| **LOW（cam-unit 沒帶 `--base` 會輸出誤導的 FAIL）** | **真的修好** | 沒帶 `--base` 直接 `process.exit(2)` 並說明為什麼；`--base` 指到不存在的檔也擋。 |

## 改了什麼（檔案:行號）

### `js/camera-director.js`

| 行號 | 改動 | 對應 |
|---|---|---|
| `70-73` | `LEAN.riseMs = 120`（新增常數，【試玩必調】） | N-3 |
| `77-89` | `CLEAR_DEG_PER_MS` → `CLEAR_WORLD_PER_MS`（＝2.544/700），註解寫明為什麼不能只看 yaw | LOW |
| `146-152` | `cur*` 的註解改成「**所有**基座補間的起點」；刪掉 `foldFrom` | HIGH |
| `170-181` | `goto()` 一律 `startTween(cur*, shot, ms)`；註解寫明第 1 輪的旁路錯在哪 | HIGH |
| `191-221` | `clearOrbitLean()`：起點改 `cur*`、時長改三分量取最大、且 `Math.max(paced, 基座剩餘時間)` | HIGH／LOW |
| `235` | `onDuel` 的註解更新（清除與 goto 的順序已不影響結果） | HIGH |
| `346-350` | `leanK = leanRise × (1 − easeOutCubic(leanU))`，`leanRise = easeInOutCubic(min(1, 已過 ms / riseMs))` | N-3 |
| `366` | 刪掉 `update()` 結尾作廢 `foldFrom` 那三行 | HIGH |

**為什麼這次是根治而不是再補一個入口**：第 1 輪的修法要求「每一個會清除偏移的入口都記得把實際機位交棒給下一個 goto」，於是有了 `foldFrom`——而它只活一幀、`active=false` 早退時不記，破口就落在「折回段還在跑、但偏移已經歸零」這 700ms 裡。改成 `goto` 無條件從 `cur*` 出發之後，「哪個入口記過、哪個沒記」這個分類整個消失：任何入口、任何時刻，第 0 幀寫進去的位置都是 `from`（`k = easeInOutCubic(0) = 0`），而 `from` 就是前一幀寫進去的位置——**構造上不可能跳**，不需要再列舉入口。

**代價（誠實揭露）**：偏移全零且基座已停穩時，`cur*` 比 `target` 差「t 剛好到 1 的那一幀不寫入」造成的 0.0024 度（v0.34 每次 `goto` 都有的既有行為）。它傳到下一段補間的終點是 ~4e-9，A2 的門檻是 1e-6，**實測 A2 仍然是 0**。

### `tests/tools/cam-unit.mjs`

| 行號 | 改動 |
|---|---|
| `16-23` | 檔頭補 S10／S11／S12 三組的說明 |
| `161-173` | 新增 R1–R4「乾淨轉換」參考情境（見下方判準） |
| `228-245` | 新增 S10：折回 1/4（10 幀）／2/4（20 幀）／3/4（31 幀）處各插一次 `ys:duel`／`ys:table`／`ys:reveal`（F1–F3 九格） |
| `247-260` | 新增 S11：SKIP 出貨序列 F4（cancel → 1 幀 → duel-end → 1 幀 → duel） |
| `262-285` | 新增 S12：F5 lean 上升沿；X3／X4 既有 punch／burn 上升沿；X5 lean 上升沿疊在折回段上（皆只揭露不斷言） |
| `297-305` | 沒帶 `--base` 直接報錯退出（含檔案不存在） |
| `405-433` | A7 的案例集與**上限規則**改寫（見下）；`A7_over` 改成帶數字的清單、新增 `A7_refs` |
| `440-446` | A8 的窗延伸涵蓋 burn／punch 兩段，作為記錄值寫進 verdict |

## 判準（動手前訂下，不隨量到的數字調整）

A7 的規則：**每一幀的位移都要 ≤ 0.20，除非同一段機位轉換在「沒被打斷」時本來就跑得那麼快**。

上限 ＝ `max(0.20, 對應的 R* 參考值)`。R1–R4 是本次新增的四格「乾淨轉換」情境：從靜止的對決機位單獨派一次 `ys:table`／`ys:reveal`／`ys:end`，以及從牌桌單獨派一次 `ys:duel`，量它們自己的逐幀最大值：

```
R1_table 0.152624   R2_reveal 0.247075   R3_end 0.170377   R4_duel 0.082951
```

**刻意不用 `max_old`**（v0.34 在同一串事件裡的最大值）當上限：v0.34 自己在 `duel-end→duel` 這種序列上就有 2.746 的瞬移（它的 `goto` 起點是上一個 target），拿它當上限等於允許新版也跳 2.7——F4 那一格的 `max_old` 正是 **2.746375**，用 `max_old` 當上限這一條就會恆真。R* 量的是乾淨轉換，不含任何瞬移。

兩個沿用第 1 輪的例外，原因沒變：`E9_duel_during_orbit` 只查清除當幀與前 5 幀（窗裡含 v0.34 就有的 180° 換場擺盪，新 0.8256／舊 0.8191）；`X` 開頭的五格只揭露不斷言（v0.34 同族路徑或本卷裁定不改的行為）。

## 驗收（先紅後綠，兩個方向都驗）

### 鑑別力：**新的**治具跑在**第 1 輪修復後**的 director（`ae7b77b`）上

```
$ node tests/tools/cam-unit.mjs <out> --port=8897 \
    --base=<v0.34(5f76adc) 的 camera-director.js> \
    --new=/tests/tools/_tmp-r1-camdir.js          ← ae7b77b 的 camera-director.js 暫時放進 repo

A1_PASS True  A2_PASS True  A3_PASS True  A4_PASS True  A5_PASS True  A6_PASS True
A8_PASS True  A9_PASS True  errors 0
A7_PASS False   ALL_PASS False
A7_over:
    F1_duel_midFold_q1   2.266166 > 0.2
    F1_duel_midFold_q2   1.256372 > 0.2
    F2_table_midFold_q1  2.266218 > 0.2
    F2_table_midFold_q2  1.256429 > 0.2
    F3_reveal_midFold_q1 2.265941 > 0.247075
    F3_reveal_midFold_q2 1.256157 > 0.247075
    F4_skipSequence_1frameApart 2.746479 > 0.2
    F5_lean_onset        0.632427 > 0.2
```

紅在**位移量**這個行為斷言上；A1–A6／A8／A9 在修復前仍是綠的，代表新斷言沒有順手把既有條也弄紅。數字與第 2 輪覆審探針對得上（`C4` 2.265545／`C6` 2.266218／`D3` 0.632427）。存檔：`…-evidence/cam-unit-before.json`。

### 反面：修復後全綠

```
$ node tests/tools/cam-unit.mjs <out> --port=8897 --base=<v0.34 的 camera-director.js>

A1_orbit_dLenMax 8.882e-16                     A1_PASS True
A2_afterDuelEnd_diff 0                         A2_PASS True
A3_leanA {peak200 -6.8908, atMs 0.0024, distDrop 0}
A3_leanB {peak200  6.8957, atMs 0.0024, distDrop 0}   A3_PASS True
A4_skip_residual_pos 0   A4_skip_residual_yaw_deg 0   A4_PASS True
A5_ratio 1.5                                   A5_PASS True
A6_reduced_noop_max 0  A6_reduced_burn_noop 0  A6_reduced_refPunch_drop 0.3433   A6_PASS True
A7_over []   A7_clear_frameStep_max 0.238405（worst F3_reveal_midFold_q3，上限 0.247075）  A7_PASS True
A8_lean_dLenMax 1.776e-15                      A8_PASS True
A8_burn_dLenMax  0.75755（記錄值）   A8_punch_dLenMax 0.50511（記錄值）
A9_reduced_burn_noop 0                         A9_PASS True
errors 0                                       ALL_PASS True
```

修復前後逐格（`f1_new` / `max_new`）：

```
                              修復前(ae7b77b)          修復後
F1_duel_midFold_q1    2.266166 / 2.266166      0.000013 / 0.082951
F1_duel_midFold_q2    1.256372 / 1.256372      0.000069 / 0.087246
F1_duel_midFold_q3    0.123832 / 0.173233      0.000131 / 0.164771
F2_table_midFold_q1   2.266218 / 2.266218      0.000031 / 0.061689
F2_table_midFold_q2   1.256429 / 1.256429      0.000051 / 0.098057
F2_table_midFold_q3   0.123892 / 0.152624      0.000078 / 0.147058
F3_reveal_midFold_q1  2.265941 / 2.265941      0.000145 / 0.108900
F3_reveal_midFold_q2  1.256157 / 1.256157      0.000230 / 0.162864
F3_reveal_midFold_q3  0.123632 / 0.247075      0.000344 / 0.238405
F4_skipSequence       0.000258 / 2.746479      0.000256 / 0.082951
F5_lean_onset         0.632427 / 0.632427      0.006785 / 0.181669
E1–E9（第 1 輪那批）  逐格不變或更好（E4 0.173894→0.173498、E6 0.099071→0.097236）
X2 punchPeak_duelEnd  0.415986 / 0.415986      0.415986 / 0.415986   ← 反面對照：仍在門檻之上
X3 punch_onset        0.506132                 0.506132              ← 裁定不改，逐值不變
X4 burn_onset         0.759198                 0.759198              ← 裁定不改，逐值不變
```

**決定性**：同指令連跑兩次，verdict 逐鍵逐值相同（`cam-unit-after.json` vs `cam-unit-after-run2.json`）。

### 用覆審員自己的探針重驗（不是只用我改過的治具）

`cam-r2.mjs`（26 個情境，逐幀量整段 240 幀）在修復後：

```
scene                            覆審量到(ae7b77b) f1/max      修復後 f1/max
C4_duel_midFold                  2.265545 / 2.265545          0.000664 / 0.835598 †
C6_duelEnd_midFold               2.266218 / 2.266218          0.000031 / 0.061689
C7_trait_then_cancel_midFold     0.583479 / 0.583479          0.042275 / 0.174295
C3_trait_midFold                 0.681349 / 0.681349          0.055845 / 0.262710 ‡
D3_lean_onset / E1_lean_window   0.632427 / 0.632427          0.006785 / 0.181669
G1_cancel_during_long_tween      0.000259 / 0.359335          0.000043 / 0.196049
H1_duelEnd_then_duel_sameFrame   1.077288 / 1.077288          0.000656 / 0.825567 †
A1–A7／B1／B2／F1                 逐值不變或更好（見 cam-r2-after.json）
C1/C2/D1/D2/E2/E3（punch 家族）   逐值不變（裁定不改行為）
errors                           []                           []
```

† `max` 落在 v0.34 就有的 180° `duel→duel` 基座擺盪（舊版 0.819084），不是清除造成的瞬移。
‡ 見下方「還沒解決的一項」。

真頁面（覆審員的 `fold-race.mjs`，真實 `index.html`、真實 rAF，只控制 cancel 與 duel-end 之間隔不隔一幀）：

```
                                  覆審量到      修復後
sameFrame   maxStepAtDuelEnd±4    0.721526     0.721630   ← 這是 punch 那一層，不是折回
oneFrameApart maxStepAtDuelEnd±4  2.306696     0.000538   ← HIGH 在真頁面上消失
```

`skip-real.mjs --skipat=900`（真的按 SKIP）：`stepAtDuelEndFrame` 0.001273 → 0.000097；`beforeSkip.max` 0.143319 → **0.078330**（＝lean 上升沿的改善在真頁面上也量得到）。

### 真頁面回歸

```
$ node tests/tools/duel-drive.mjs "…?paperwar=1&fxcount=1&seed=7" <out> --duels=4 --port=8898
{"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":10,"trait":5,"load":{"total":12,"loaded":12,"timedOut":false}}

$ node tests/tools/cam-drive.mjs "…&seed=7" <out> --duels=4 --port=8899
errors 0 · orbit_dLenMax_all 4.251e-07 · orbit_dLen_PASS true
traits_n 5 · traits_signOk 5 · traits_backOk 5 · trait_PASS true

$ node tests/tools/traitfx-drive.mjs <out> --port=8898
27/27 pass · 重複簽章 0
```

## 還沒解決的一項（不藏）

`X5_lean_onset_midFold` ＝ **0.262710**（cam-r2 的 `C3_trait_midFold` 獨立量到同值）：lean 的上升沿**疊在折回段上**時，兩層各自都在門檻內（折回 ≤0.176、上升沿 ≤0.182），疊起來超過 0.20。`f1` 只有 0.0558，所以它是兩段合法平滑運動的疊加，不是瞬移。

沒有把它壓下去的理由，一句話：**再拉長上升沿會讓 A3 變紅**。`riseMs` 每拉長一格，lean 在 200ms 內的峰值就往下掉（120ms → 6.89°，160ms → 約 5.5°，200ms → 約 4.7°），而 A3 的凍結條要求 200ms 內偏 >5°。120ms 是「上升沿夠慢」與「A3 還過得去」之間僅剩的窗口。同一種疊加在 punch／burn 上是 **0.5309／0.7928**（`C1`／`C2`），依主對話裁定不改行為——所以把 lean 這一格單獨壓到 0.20 也不會改變這一場最大的單幀位移。列為記錄值等真機試玩再定。

## 凍結條的動到之處（`02 §2.1`）

1. **A7 的案例集擴編與上限規則**：新增 R1–R4／F1–F5 十四格、上限從「一律 0.20」改成 `max(0.20, R*)`。這一項**同時加嚴與放寬**，逐項說明：加嚴的是案例集（第 1 輪的 E1–E9 之外多了 14 格，全部要過）；放寬的只有 `E7`／`F3_*` 三格的上限（0.20 → 0.247075），理由是 `SHOTS.reveal.ms = 550` 這段轉換**乾淨跑**時本來就是 0.247075（R2 實測），拿 0.20 要求它等於要求改機位時長，不在本卷範圍。**這個放寬不會讓壞掉的實作變成通過**：`F3` 修復前是 2.2659／1.2562，離 0.247075 差一個數量級。
2. **A8 涵蓋 burn 但不斷言**：依主對話裁定（burn punch 行為不改）。窗擴大是加嚴（值被記進 verdict 而不是被窗擋在外面），但沒有把它變成 PASS 條件——這一點必須明說，不能算「A8 現在守住了 burn」。
3. **A3 的實測值從 9.45° 降到 6.89°**（門檻 >5° 未動）：這是 lean 上升沿的直接後果，不是改門檻。餘裕從 4.45° 縮到 1.89°，記在這裡，之後若再拉長 `riseMs` 就會撞線。
4. 前一輪掛起、**至今仍未簽字**的兩項照舊：① `LEAN.dist` 從凍結檔 P-4 (b) 明寫的 −0.3 改成 0；② P-4 (c)「維持現行 punch」在 reduced-motion 下的解讀。

## `git diff --stat` 逐檔對應

```
 js/camera-director.js    |  76 ++++++++++++++-----   HIGH（goto 一律從 cur*）、N-3（lean 上升沿）、LOW（折回時長三分量＋不壓縮基座剩餘時間）
 tests/tools/cam-unit.mjs | 138 ++++++++++++++++++--  R1–R4 參考、F1–F5 新斷言、X3–X5 揭露、A7 上限規則、A8 涵蓋 burn、--base 必填
 2 files changed
```

（外加新檔：本報告與 `2026-09-06-postfx-fix-round2-evidence/` 九個修剪過的治具輸出。）

## 沒做的事 / 剩下的風險

- **M-4**（`bloomOK=false` 下邊緣線不畫、外殼照畫、mesh 翻倍；覆審判「應修或簽字」）與 **L-3**（`js/renderer.js:165` 的 `edgeOn` getter 少 `kind === 'duel'`，覆審判「應修、一行、零風險」）**都沒碰**——本次任務單只指定折回破口、lean 上升沿、A8 涵蓋、治具兩條 LOW。
- punch 家族的單幀位移（onset 0.5061／burn onset 0.7592／`onDuelEnd` 歸零 0.4160／疊在折回上 0.53–0.79）依裁定原封不動，是這一場**最大的**單幀位移來源。
- 所有新常數（`LEAN.riseMs`、`CLEAR_WORLD_PER_MS` 與上下限）只有機械證據（單幀位移上限），**沒有真機試玩過**；`riseMs` 與 A3 門檻之間只剩 1.89° 餘裕。
- 治具固定 60fps；真頁面掉幀時每幀位移會等比放大（這對所有補間都成立，不是本卷新增的性質）。
