# 後處理卷 對抗式覆審 第 3 輪（最後一輪，2026-09-06）— 反駁第 2 輪修復「已修好」

- 受審 commit：`918b641`（＝`bb208df` 第 2 輪修復 ＋ `9e8ff0b` L-3／round2 紀錄的合併）。基準：`5f76adc`（v0.34）、`ae7b77b`（第 1 輪修復後）、`59f7483`（第 1 輪覆審）。
- 框架：**反駁「我已修好」**，逐條三態。不採信作者的量測窗與數字——每一格都用本輪自己重跑或自寫的探針重取；凍結條的改動一律用「把程式碼改壞 → 該斷言必須紅」實測。
- 環境：worktree `.claude/worktrees/agent-a77942d132ea3fbec`（**不是**主工作樹，覆審前 `git reset --hard 918b641`）；GPU `ANGLE (AMD, AMD Radeon 780M Graphics, Direct3D11)`；`tools/anyCreature/node_modules` 以 junction 指向主工作樹；埠 8911–8919。**沒有改任何程式碼**（`git status` 只有本報告與 evidence 兩個未追蹤項）。
- 本輪探針與原始輸出：`docs/experiments/2026-09-06-postfx-review-round3-evidence/`（`cam-r3.mjs`、`edge-flag.mjs` 兩支新寫的可直接重跑）。

---

## 結論先行（五條，一行一條）

| # | 覆審條 | 裁定 | 一句話 |
|---|---|---|---|
| 1 | **HIGH 折回段 goto 破口**（`goto` 一律從 `cur*` 出發） | **真的修好** | 自寫 638 格序列探針（間隔 0／1／2 幀 × 四種脈絡 × 正常／reduced）**K 組 593 格的最大 f1 ＝ 0.049060**（reduced 0.000651）、**dLenMax >0.2 者 0 格**；第一幀 `cur*` 未寫入、標題頁連發、punch 進行中 goto 四種情形全部 f1 ≤ 5.7e-05。把 `goto` 起點改回 `target` → 同一支探針 **322/593 紅、最大 f1 7.673789**，兩個方向都驗。 |
| 2 | **MEDIUM lean 上升沿**（`riseMs=120`） | **真的修好**（每幀 ≤0.20 成立）；但**「X5 壓不下去」的理由是錯的** | 上升沿 0.632427 → f1 0.006785／逐幀 0.181669；真頁面 `lean-px` 首幀相機位移 0.4829 → **0.0511** 世界單位、844×390 上場物螢幕位移中位 7.25 px → **0.73 px**。`X5=0.2627` 判為**合法疊加**（f1 只有 0.0558 ≈ 0.8 px；峰值 ≈ 3.8 px/幀，與被接受的乾淨 reveal 轉場 0.2471 ≈ 3.5 px/幀同級）。**但**作者寫「再拉長上升沿會讓 A3 變紅（200ms → 約 4.7°）」——實測 `riseMs=200` 時 A3 是 **5.4229／5.4278（>5，PASS）**、`ALL_PASS` 仍是 **True**，而 X5 掉到 **0.199688**（<0.20）。理由不成立。 |
| 3 | **凍結條改動審查**（A7 案例集＋上限規則、A8 記錄值、A3 餘裕） | **A7／A8／A3 三項都不會讓壞掉的實作通過**；但 A7 的上限**是自我參照的**，可被【試玩必調】旋鈕稀釋 | mutA（`goto` 起點改回 `target`）→ A7 紅 14 格、`A7_refs` **逐值不變**；mutB（拔掉 lean ease-in）→ A7 紅 `F5 0.632427>0.2`；mutE（拔掉折回段）→ A4 紅（殘留 1.5816／27.85°）。**但** mutC 證明：只要把 `SHOTS.reveal.ms` 550→20（一個【試玩必調】常數），`R2_reveal` 參考值就從 0.247075 漲到 **2.675657**，E7／F3 三格的 `max_new`（1.14／1.19／1.78／2.59）全部落到上限之下，只靠另一條固定的 `f1_new > 0.20` 才留在 `A7_over`。 |
| 4 | **L-3 `edgeOn` getter** | **真的修好** | 真頁面四狀態實測：標題頁 `edgeOn=false`、2v2 對決 `true`、8v8 滿編 `false`（`crowded=true`）、`?edge=0` 對決 `false`（同格線本來畫得出 5.8535% 像素）。URL／`kind==='duel'`／`crowded`／`bloomOK`／`depthTex` 五個條件全部反映到位。 |
| 5 | **全套回歸** | **全綠** | `traitfx-drive` **27/27 · 重複簽章 0**；`duel-drive --duels=4` **errors 0 · ys3d true · burn 10 · trait 5 · load 12/12**；`cam-unit --base` **ALL_PASS true**；`duel-perf lineup --na=8 --nb=8` **A n8 maxR 1.753 minPair 0.549 offTable 0／B n8 maxR 1.642 minPair 0.550 offTable 0／gap 0.803 · errors 0**（R-1／R-2／R-3 全過，minPair 與可讀性小卷紀錄的 0.549 逐值相同）。 |

**新 finding：MEDIUM 1、LOW 4**（清單見「未解 finding」一節）。**沒有新的 HIGH。**

---

## 逐條反駁

### 1. HIGH 折回段 goto 破口 → **真的修好**

作者的修法：`js/camera-director.js:180-182` `goto()` 一律 `startTween({cur*}, shot, ms)`，刪掉 `foldFrom`（`:146-152`／`:366`）。

#### 任務單點名的四個反駁點，逐一實測（自寫 `cam-r3.mjs`，每個情境建**全新的一對 director**，相機初值照 `js/scene-env.js:38-43` 的真實開場機位）

| 反駁點 | 結論 | 數字 |
|---|---|---|
| **第一幀 `cur*` 尚未寫入**（頁面剛載入／`update` 從未跑過） | 安全，且是**構造保證**不是巧合 | `curDist/Tilt/Yaw/LookY` 初值＝`base`＝`SHOTS.table`＝`{3.6, 35°, 0, 0.1}`，而 `scene-env.js:39-43` 的開場相機正是 `dist 3.6 / tilt 35° / yaw 0 / lookAt(0,0.1,0)`——**同一組數字**。實測 `P1_table` `P5_duelEnd` `P6_cancel` `P7_trait_then_table` `P8_duel_then_table` 的 f1 **＝0**；`P2_end` 2.1e-05、`P3_duel` 5.3e-05、`P4_reveal` 5.7e-05、`P9_duel_1frame_then_table` 5.3e-05。 |
| **`ys:table`／`ys:end` 在標題頁（非對決）連發** | 安全 | `T1_table_x5_sameFrame` f1 0、`T2_table_x5_1frameApart` 0、`T4_end_table_sameFrame` 0、`T7_table_every2frames_x20` 0、`T3_end_table_end_1frameApart` f1 2.1e-05／max 0.117032、`T8_end_every2frames_x20` f1 2.1e-05、`T5_end_settle_then_table` f1 2.1e-05／max 0.179913（＝`end→table` 這段轉場本身的速度）。 |
| **punch 進行中 goto（`cur*` 不含 punch），punch 結束時會不會跳** | 安全 | `U_*` 24 格：`U_punch_then_{table,reveal,end}_at{0,3,12}f` 的 f1／max **全部 ＝ 0.5061**（＝punch **上升沿**那一幀，`maxAt=0`），也就是整段（含 punch 衰減結束）**沒有任何一幀比 punch 自己的上升沿更大**；burn 同理全部 0.7592。`U_*_then_duel2_*` 的 max 0.9906–0.9911 落在 v0.34 既有的換場 yaw 擺盪上（`maxAt` 21–33，不是 goto 當幀）。對照組 `U_punch_alone` 0.506132／`U_burn_alone` 0.759199 逐值相同。 |
| **reduced-motion 下 goto** | 安全 | 同一支探針的 reduced 分頁：K 組 593 格**最大 f1 ＝ 0.000651**；P／T 組除了 `P10_punch`（punch 本身 0.532353）之外最大只有 `P3_duel`／`P9` 的 **0.000134**。 |

#### 連續事件間隔 0／1／2 幀的矩陣（任務單要求的新序列探針）

`cam-r3.mjs` 的 K 組＝ 7 個事件（`ys:duel`×2 組座位、`ys:duel-end`、`ys:table`、`ys:reveal`、`ys:end`、`ys:fx-trait-cancel`）**兩兩配對** × 間隔 **0／1／2 幀** × 四種脈絡（`clean` 對決靜止／`orbit` 進場中／`fold` 折回中／`foldLean` lean 折回中）＝ **593 格**，正常與 reduced 各跑一遍：

```
                     normal                    reduced
K 組格數             593                       593
最大 f1              0.049060                  0.000651
  （最大那一格）      K_fold_cancel__duel_g1     K_clean_duel__duel2_g0
f1 > 0.05 的格數      0                         0
f1 > 0.20 的格數      0                         0
dLenMax > 0.20 的格數 0                         0
max > 0.20 的格數     172（值全部落在 0.2466–0.9911）  214（0.2467–0.8191）
```

`max > 0.20` 的那些值只有六個群落：0.2466–0.2480（＝`reveal` 550ms 轉場的固有速度）、0.6458–0.6466、0.6628–0.6632、0.8182–0.8191、0.8252–0.8256、0.8352–0.8429、0.9907–0.9911（＝v0.34 就有的 `duel→duel` 換場 yaw 擺盪，`f1` 都在 1e-3 以下）。**沒有任何一格是「事件當幀的瞬移」。**

另外三連發（SKIP 的真實形狀）：`K3_cancel_duelEnd_duel_g1` f1 **0**／max 0.173227、`K3_trait_cancel_duelEnd_duel_g1` f1 **0.000256**／max 0.082951、`K3_cancel_duelEnd_duel_g0` f1 **0.000137**／max 0.173233。`ys:reveal` 自動返回（`REVEAL_HOLD_MS=1500`）到期那一幀：`K_revealAutoReturn` f1 **0.000357**／max 0.247075（＝reveal 轉場固有速度）、折回中版本 `K_reveal_midFold_autoReturn` f1 **0.000145**／max 0.108900。

#### 鑑別力：把 `goto` 的起點改回 `target`（＝作者原本選的 v0.34 語意）

`tests/tools/_tmp-mutA.js`＝HEAD 的 `js/camera-director.js` 只改一行 `:181` → `startTween(target, shot, ms)`。同一支 `cam-r3.mjs`：

```
                     HEAD(918b641)      mutA（起點改回 target）
K 組 f1 > 0.20        0 / 593           322 / 593   （reduced 121 / 593）
K 組最大 f1           0.049060          7.673789    （K_clean_duel2__end_g0）
P8_duel_then_table    0                 2.746496    ← 第一幀 cur* 未寫入這一格也紅
T4_end_table_sameFrame 0                3.301519    ← 標題頁連發這一格也紅
errors                []                []
```

兩個方向都成立：壞掉的版本紅在**位移量**這個行為斷言上（不是 `TypeError` 之類的旁枝錯誤），健康版本綠且探針量得到 0.049–0.99 這個量級的差（不是恆 0 的探針）。

#### 用第 2 輪覆審員自己的探針重驗（不是只用我自己寫的）

`cam-r2.mjs`（26 情境、逐幀量整段 240 幀，`--port=8917`）在 HEAD 上與作者 `cam-r2-after.json` **26 格逐鍵逐值相同**，其中第 2 輪判 HIGH 的三格：

```
scene                          round2 量到(ae7b77b)   本輪 HEAD        作者宣稱
C4_duel_midFold                2.265545 / 2.265545   0.000664 / 0.835598 †  同值
C6_duelEnd_midFold             2.266218 / 2.266218   0.000031 / 0.061689    同值
C7_trait_then_cancel_midFold   0.583479 / 0.583479   0.042275 / 0.174295    同值
D3_lean_onset                  0.632427 / 0.632427   0.006785 / 0.181669    同值
G1_cancel_during_long_tween    0.000259 / 0.359335   0.000043 / 0.196049    同值
H1_duelEnd_then_duel_sameFrame 1.077288 / 1.077288   0.000656 / 0.825567 †  同值
errors                         []                    []
```
† max 落在 v0.34 既有的 `duel→duel` 180° 基座擺盪（舊版 0.819084），`f1` 只有 6.6e-04。

折回期間 `|camera.position|` 恆定（排法鎖點閘門）：`A2／A7／C3／C5／C7／E1／F1／H1` 的 `dLenMax` 全部是 8.88e-16～1.78e-15。

`skip-real.mjs --skipat=900`（真的按 SKIP）：`duelEndInsideFoldWindow=true`（cancel@909.1ms → duel-end@909.9ms，間隔 0.8ms，確實踩進折回窗）、`stepAtDuelEndFrame` **0.001266**、`maxAroundDuelEnd_pm4` **0.001266**、`foldWindow_cancel_to_700ms.max` 0.056292、`wholeRun.max` 0.088392、`lenAtCancel`＝`lenAtDuelEnd`＝4.2。

#### 一項**證據品質**問題（不影響裁定，但作者的數字不可重現）→ `L3-1`

作者在修復報告寫真頁面探針 `fold-race.mjs` 的 `oneFrameApart maxStepAtDuelEnd_pm4` 是 **0.000538**。我**連跑五次**（固定 `--at=900`，其餘條件不動）：

```
run   sameFrame pm4   sameFrame afterCancel   oneFrameApart pm4   oneFrameApart afterCancel
1     0.721613        0.833538                0.721553            0.855511
2     0.721933        0.831624                0.650034            0.853922
3     0.721597        0.833463                0.721046            0.856959
4     0.721893        0.818610                0.649624            0.854036
5     0.721944        0.818274                0.721145            0.857071
```

五次全部落在 **0.6496–0.7216**，沒有一次接近 0.000538。歸因：`maxStepAtDuelEnd_pm4` 量的是 duel-end 前後 ±4 幀的最大單幀位移，而**這個窗裡有沒有一發 `ys:fx-punch`／`ys:fx-burn` 是隨真頁面時序浮動的**（punch 上升沿 0.5061、burn 0.7592，剛好就是那兩個群落）；作者取到的是恰好沒有 punch 落在窗裡的那一次。**結論不變**——`oneFrameApart` 已經降到與 `sameFrame` 對照組同級（0.72 vs 0.72），第 2 輪量到的 **2.306696 折回瞬移確實消失了**；但修復報告那個「2.306696 → 0.000538」的降幅**誇大了三個數量級**，而且 `maxStepAtDuelEnd_pm4` 這個訊號在 punch 家族未改的前提下**不是決定性訊號**，不該拿單次取樣當宣告完成的證據（`02 §6.2`）。

---

### 2. MEDIUM lean 上升沿 → **真的修好**（每幀 ≤0.20），但 X5 的處置理由**不成立**

`js/camera-director.js:73` `LEAN.riseMs = 120`、`:349-350` `leanK = leanRise × (1 − easeOutCubic(leanU))`。

**每幀 ≤0.20 的驗證**（三支互相獨立的量測）：

```
                              修復前(ae7b77b)   HEAD          量法
cam-unit F5_lean_onset        0.632427          f1 0.006785 / max 0.181669   我重跑
cam-r2   D3_lean_onset        0.632427          f1 0.006785 / max 0.181669   覆審員的探針
cam-r2   E1_lean_window       0.632427          f1 0.006785 / max 0.181669   同上，另一個窗
lean-px  首幀相機世界位移      0.4829            0.0511                        真頁面 844×390
lean-px  場物螢幕位移（中位）   7.25 px           0.73 px                       同上
lean-px  場物螢幕位移（最大點）  18.93 px          2.02 px                       同上
```

`lean-px` 的兩次量測互相對得上（px/世界單位：中位 15.0 → 14.3、最大點 39.2 → 39.5），所以這把尺可以用來換算其他數字。

**`X5_lean_onset_midFold = 0.262710`（我獨立重跑逐值相同，`cam-r2` 的 `C3_trait_midFold` 也是 0.26271）判為「合法疊加」，不是玩家看得到的抖動**，理由是換算過的像素：

```
                        世界單位/幀   844×390 螢幕位移（中位 / 最大點）
X5 事件當幀 f1           0.055845     0.80 px / 2.21 px
X5 逐幀峰值 max          0.262710     3.76 px / 10.38 px
（對照）R2 乾淨 reveal 轉場 0.247075   3.53 px /  9.76 px   ← 被接受的既有運鏡速度
（對照）burn 上升沿 f1     0.759199    10.85 px / 29.99 px  ← 裁定不改，真正的「瞬移」
（對照）punch 上升沿 f1    0.506132     7.24 px / 19.99 px  ← v0.34 既有
```

事件當幀只動 0.8 px，峰值 3.8 px/幀 ＝ 每秒 226 px 的平移，和遊戲裡**已經被接受的最快乾淨轉場（reveal）同一級**。這是運鏡速度，不是跳。

**但作者不修它的理由是錯的。** 修復報告寫：「沒有把它壓下去的理由，一句話：再拉長上升沿會讓 A3 變紅（`riseMs` 120ms → 6.89°，160ms → 約 5.5°，200ms → 約 4.7°），而 A3 的凍結條要求 200ms 內偏 >5°」。實測 `riseMs = 200`（`_tmp-mutD.js`，只改 `:73` 一個常數）：

```
                      HEAD(riseMs=120)   mutD(riseMs=200)
A3_leanA peak200      -6.8908            -5.4229     （門檻 <-5，PASS）
A3_leanB peak200       6.8957             5.4278     （門檻  >5，PASS）
A3_PASS               True               True
ALL_PASS              True               True
F5_lean_onset         f1 0.006785 / max 0.181669   f1 0.001466 / max 0.090387
X5_lean_onset_midFold f1 0.055845 / max 0.262710   f1 0.050526 / max 0.199688  ← 掉到 0.20 以下
```

也就是說：**`riseMs=200` 同時把 X5 壓進門檻、A3 仍然過、全套仍然 `ALL_PASS=True`**。作者宣稱的「200ms → 約 4.7°」與實測的 5.4278 差了 0.7°，那個數字沒有跑過。真正的取捨不是「做不到」，而是「A3 餘裕從 1.89° 縮到 0.42°」——這是使用者該裁的取捨（`03 R3` 路徑 1／`R6` 品味題），不是可以用一句未驗證的推估帶過的。列為新 finding `L3-2`。

---

### 3. 凍結條改動審查（重點）

判準（`02 §2.1`）：**這個改動會不會讓一份壞掉的實作變成通過**。三個突變體，都是「只改一行、把該條守的行為弄壞」，實測該斷言必須紅。

| 突變體 | 改法（相對 HEAD） | `ALL_PASS` | 紅在哪 |
|---|---|---|---|
| **mutA** | `:181` `goto` 起點改回 `target` | **False** | `A7_over` 14 格：`E1 2.407514`／`E3 2.407514`／`E4 0.461413`／`E5 0.461260`／`E7 2.407237`／`E8 2.407577`／`E9 2.406845`／`F1_q1 2.266287`／`F1_q2 1.257369`／`F2_q1 2.266339`／`F2_q2 1.257425`／`F3_q1 2.266062`／`F3_q2 1.257154`／`F4 2.746479` |
| **mutB** | `:350` 拔掉 ease-in（`leanK = 1 − easeOutCubic(leanU)`） | **False** | `A7_over`：`F5_lean_onset 0.632427 > 0.2` |
| **mutC** | mutA ＋ `SHOTS.reveal.ms` 550→20（一個【試玩必調】常數） | **False** | 15 格，**但見下方 `L3-3`** |
| **mutD** | `:73` `riseMs` 120→200 | **True** | （不是壞掉的實作，是本輪用來檢驗「拉長上升沿會不會撞 A3」的） |
| **mutE** | `clearOrbitLean` 拔掉折回段（偏移直接歸零、不 `startTween`） | **False** | `A4_PASS` False：`A4_skip_residual_pos 1.581618`、`A4_skip_residual_yaw_deg 27.848854`（A7 抓不到——見 `L3-4`） |

#### ① A7 案例集擴編 ＋ 上限規則 `max(0.20, R*)` → **不會讓壞掉的實作通過**，但上限本身自我參照

- **參考值不會被 mutA 帶歪**：mutA 的 `A7_refs` ＝ `{R1_table 0.152624, R2_reveal 0.247075, R3_end 0.170377, R4_duel 0.082951}`，與 HEAD **逐值相同**。所以 mutA 那 14 格是拿沒被污染的尺量出來的。
- **0.20 → 0.247075 這個放寬是必要的，不是搬及格線**：`R2_reveal_clean`（從靜止的對決機位單獨派一次 `ys:reveal`、完全沒被打斷）本身就是 **0.247075**，HEAD 自己的 `F3_q3` 是 0.238405。也就是說**用一律 0.20 去要求 reveal 家族，任何正確實作都不可能通過**——這正是 `02 §2.1` 例外條款講的「原條件恆假」。放寬之後鑑別力仍在：mutA 的 `F3_q1／q2` 是 2.266062／1.257154，離 0.247075 差一個數量級。
- **代價要記著**：在 mutA 上，`F3_q3` ＝ 0.247075（＝上限本身）**綠**，用舊的一律 0.20 它會紅。所以這個放寬確實把「單一格」從紅翻綠——只是整條 A7 的判定沒被翻，因為 q1／q2 還在。
- **真正的弱點（新 finding `L3-3`）**：`tests/tools/cam-unit.mjs:415` `const refOf = (k) => E[k].max_new;`——上限是**從受測實作自己這一輪的量測算出來的**，而 R1–R4 這四格**自己從來不被斷言**（不在 `CASE_LIMIT` 裡）。mutC 實測：

```
                      HEAD        mutC（reveal.ms 550→20）
A7_refs.R2_reveal     0.247075    2.675657          ← 上限被一個【試玩必調】常數灌大 10.8 倍
E7_reveal_during_orbit max 2.407237(mutA) → 1.137508(mutC)   1.137508 < 2.675657  ← max 這一半失效
F3_q1 / q2 / q3       2.266062/1.257154/0.247075   1.191255/1.777759/2.585318  ← 全部 < 2.675657
```
  這四格之所以還留在 `A7_over`，**只因為另一條固定的 `E[k].f1_new > MAX_FRAME_STEP`（0.20）**。換句話說 A7 現在是「一條固定門檻（f1）＋ 一條會自我稀釋的門檻（max）」，而修復報告只把它描述成加嚴。附帶：這種情形下 `A7_over` 印出來的訊息是假的（`tests/tools/cam-unit.mjs:432` 一律用 `worstOf > limitOf` 組字串），mutC 的輸出裡就有 `E7_reveal_during_orbit 1.137508 > 2.675657` 這種讀不通的行。

#### ② A8 改記錄值 → **不是搬及格線，但也沒有變成防線**

`tests/tools/cam-unit.mjs:440-446`：斷言 `A8_PASS = leanLenMax < 1e-3` 與它的窗（`lenStep(traitAAt, traitBAt)`／`lenStep(traitBAt, burnAt)`）**逐字未動**，新增的 `A8_burn_dLenMax`／`A8_punch_dLenMax` 是另外兩個鍵、不進 `ALL_PASS`。所以：既沒有讓壞掉的實作通過，**也沒有讓 burn 動 `dist` 這件事被守住**——`burn` 的 0.75755（`camStable` 門檻 1e-3 的 **758 倍**）現在是一個沒有斷言的數字，之後誰把 `BURN_PUNCH_POWER` 調大，沒有任何一條會紅（`02 §6.1` 第 7 條：防線要按危險的效果寫）。列為 `L3-5`。

#### ③ A3 餘裕縮到 1.89° → **門檻沒動，是實測值往門檻靠**

`A3_PASS` 的判準（`leanA.peak200 < -5 && leanB.peak200 > 5 && atMs < 0.5`）逐字未動；9.4522／9.4571（mutB＝沒有 ease-in 的形狀）→ 6.8908／6.8957。這不是搬及格線。鑑別力：A3 守的是「lean 真的偏得夠多、且時間到會回位」，拔掉 ease-in 反而讓它更容易過（mutB 的 A3 是 9.45、PASS）——**守 ease-in 的是 F5，不是 A3**，分工正確。但餘裕 1.89° 這件事要跟第 2 條的 mutD 一起看：`riseMs=200` 時餘裕只剩 0.42°。

#### ④ 沒被任何斷言蓋到的失敗形狀（`L3-4`）

mutE（折回段整段拔掉）在 A7 上是 **全綠**：因為它的失敗形狀不是「跳」而是「相機凍住在帶偏移的位置」（`forceWrite`／`foldWrite` 都沒設，`t>=1` 且三層歸零時寫入區塊整段不執行），逐幀位移反而是 0。抓到它的是 A4 的殘留斷言（1.581618／27.848854°），而 A4 只涵蓋 S4 那一條 SKIP 序列。A7 這把尺量的是「相鄰幀差」，對「停在錯的地方」沒有解析度——這是既有的設計邊界，記錄即可。

---

### 4. L-3 `edgeOn` getter → **真的修好**

`js/renderer.js:166` `get edgeOn() { return bloomOK && bloom.edgeOn; }`，而 `js/bloom.js:298` `edgeOn = !!(edgeWant && depthTex)`，`edgeWant` 由 `js/renderer.js:223` 每幀寫入 `EDGE_URL_ON && kind === 'duel' && !crowded`。

**條件是否等價（逐條）**：真正畫線要同時成立 ①`bloomOK && (!warmedUp || kind==='duel')` 才走 `bloom.render`（`:224`）②`edgeWant && depthTex && camera.isPerspectiveCamera` 才 `uEdge=1`（`js/bloom.js:284`）。`edgeWant` 為真已蘊含 `kind==='duel'`，所以 ① 的第二段自動成立；`camera` 是 `js/scene-env.js:38` 的 `PerspectiveCamera`，構造上恆真。故 getter 與每幀畫線條件等價。

**真頁面實測**（自寫 `edge-flag.mjs`，844×390／dsf 2，四狀態 × 有無 `?edge=0`）：

```
狀態                       edgeOn   bloomEdgeOn   crowded   同幀 setEdge(on) vs (off) 的線像素佔比
title                      false    false         false     0        （牌桌機位本來就畫不出線）
duel 2v2                   true     true          false     5.8540 %
duel 8v8（滿編）            false    false         true      4.4907 %  ← 線畫得出來，但旗標正確地說「沒在畫」
title  &edge=0             false    false         false     0
duel 2v2 &edge(=0)         false    false         false     5.8535 %  ← 同上，URL 關掉時旗標也跟著關
duel 8v8 &edge=0           false    false         true      4.5123 %
errors 0
```

`crowded` 與 `?edge=0` 兩格的「線本來畫得出 4.5%／5.85% 像素，但旗標回 false」就是反面對照：旗標不是恆假的。

**誠實揭露（量測位置的限制）**：我原本想再驗一層「旗標 ＝ 現場那一幀真的有沒有線」，做法是把 render loop 剛畫完的 default framebuffer 讀出來跟兩張重繪比。這一臂**沒有鑑別力**——`liveVsOffPct` 與 `liveVsOnPct` 在六個狀態下**全部是 100%**（含應該是 0% 的格），成因是 WebGL default framebuffer 在合成之後內容未定義（沒開 `preserveDrawingBuffer`）。所以「旗標與畫面逐像素一致」這件事我**沒有驗到**，上面的結論靠的是條件等價的推導 ＋ 旗標在六種狀態下的實測值。

---

### 5. 全套回歸（本輪自己跑，指令與實際輸出）

```
$ node tests/tools/traitfx-drive.mjs _scratch3/r3-traitfx.json --port=8918
27/27 pass · 重複簽章 0

$ node tests/tools/duel-drive.mjs "http://127.0.0.1:8918/index.html?paperwar=1&fxcount=1&seed=7" \
      _scratch3/r3-dueldrive.json --duels=4 --port=8918
{"duels":4,"errors":0,"ys3d":true,"abOnAllUnits":true,"burn":10,"burnFig":7,"burnDom":3,"trait":5,"traitFig":5,
 "load":{"ms":48,"total":12,"loaded":12,"timedOut":false},
 "ver":"v0.35・紙紮夜戰：開・《紙紮夜戰》後處理卷：系色描邊＋深度邊緣線（滿編自動收斂）、對決運鏡（環繞進場、招式輕推、燒毀震鏡）"}

$ node tests/tools/cam-unit.mjs _scratch3/r3-camunit-head.json --port=8911 --base=_scratch3/camdir-v034.js
A1_PASS True  A2_PASS True  A3_PASS True  A4_PASS True  A5_PASS True
A6_PASS True  A7_PASS True  A8_PASS True  A9_PASS True  errors 0  ALL_PASS True
A7_clear_frameStep_max 0.238405（worst F3_reveal_midFold_q3，上限 0.247075）  A7_over []
A7_refs {R1_table 0.152624, R2_reveal 0.247075, R3_end 0.170377, R4_duel 0.082951}
A8_lean_dLenMax 1.776e-15 · A8_burn_dLenMax 0.75755（記錄值）· A8_punch_dLenMax 0.50511（記錄值）

$ node tests/tools/duel-perf.mjs lineup _scratch3/r3-lineup.json --na=8 --nb=8 --port=8918
{"A":{"n":8,"maxR":1.753,"minPair":0.549,"offTable":0},
 "B":{"n":8,"maxR":1.642,"minPair":0.550,"offTable":0},"gap":0.803,"errors":0}
   R-1 站在桌面內：offTable 0/0（兩側）
   R-2 最遠半徑：1.753 / 1.642（桌面半徑 3.4）
   R-3 同側最小間距：0.549 / 0.550（與可讀性小卷紀錄的 0.549 逐值相同）；兩側間隙 gap 0.803 > 0
```

---

## 未解 finding（等級＋檔案:行號＋一句＋玩家可見程度）

| 級別 | 檔案:行號 | 一句話 | 玩家可見程度 |
|---|---|---|---|
| **MEDIUM** `L3-2` | `js/camera-director.js:73`（`LEAN.riseMs = 120`）＋ `docs/experiments/2026-09-06-postfx-fix-round2.md`「還沒解決的一項」 | 「再拉長上升沿會讓 A3 變紅」這個不修 X5 的理由**沒有跑過**：實測 `riseMs=200` 時 A3 是 5.4229／5.4278（PASS）、`ALL_PASS` 仍 True，而 `X5_lean_onset_midFold` 從 0.262710 掉到 0.199688。真正的取捨是「A3 餘裕 1.89° → 0.42°」，該由使用者裁，不該以「做不到」結案。 | **低**（X5 本身只是 3.8 px/幀的平移，看得出來的是「lean 起手多慢」——120ms vs 200ms 的手感差，屬【試玩必調】） |
| **LOW** `L3-1` | `docs/experiments/2026-09-06-postfx-fix-round2.md`（`fold-race` 那一列） | 修復報告的真頁面數字 `oneFrameApart 0.000538` 是單次取樣；固定條件連跑五次得到 0.6496／0.6500／0.7210／0.7211／0.7216，**沒有一次接近它**（窗裡有沒有 punch／burn 隨真頁面時序浮動）。結論（HIGH 已消失）不變，但降幅被誇大三個數量級，且這個訊號在 punch 家族未改前不具決定性。 | **無**（只是報告數字，不是行為） |
| **LOW** `L3-3` | `tests/tools/cam-unit.mjs:415`（`refOf = (k) => E[k].max_new`）＋ `:405-424`（R1–R4 不在 `CASE_LIMIT`） | A7 的上限 `max(0.20, R*)` 由**受測實作自己**在同一輪算出來，而參考格 R1–R4 從不被斷言：mutC 實測把 `SHOTS.reveal.ms` 550→20 就讓 `R2_reveal` 從 0.247075 漲到 2.675657，E7／F3 三格的 `max_new`（1.14–2.59）全部落到上限之下，只剩固定的 `f1 > 0.20` 那一條在守。`SHOTS.*.ms` 是【試玩必調】，真的會被改。 | **無**（治具的鑑別力，不是行為） |
| **LOW** `L3-4` | `tests/tools/cam-unit.mjs:426-433`（`A7_over` 的訊息組法）＋ `:404-424` | ① 上限被灌大時 `A7_over` 印出讀不通的行（mutC 實輸出：`E7_reveal_during_orbit 1.137508 > 2.675657`），因為訊息一律用 `worstOf > limitOf` 組字串、不區分是哪一條 clause 觸發的。② A7 量的是相鄰幀差，對「相機停在錯的位置」沒有解析度：mutE（折回段整段拔掉）在 A7 上全綠，只有 A4 抓到（殘留 1.581618／27.85°），而 A4 只涵蓋 S4 那一條序列。 | **無**（治具可讀性／覆蓋邊界） |
| **LOW** `L3-5` | `tests/tools/cam-unit.mjs:443-446`（`A8_burn_dLenMax` 為記錄值）＋ `js/camera-director.js:95`（`BURN_PUNCH_POWER`） | 第 2 輪的 N-2（burn punch 讓 `camera.position.length()` 單幀動 0.75755 ＝ `duel-figures.js:467` `camStable` 門檻 1e-3 的 758 倍）依裁定不改行為，A8 把它從量測窗外挪進 verdict 是進步——但它**只是記錄值**，之後誰調大 `BURN_PUNCH_POWER` 不會有任何一條變紅。 | **中**（真頁面 burn 上升沿單幀 0.759 世界單位 ≈ 844×390 上 10.9 px 中位／30 px 最大點，是全場最大的單幀跳；但這是**已裁定保留**的演出，不是回歸） |

### 沿用前輪、本輪未動的未了項（提醒，不重複計數）

- 凍結檔 `2026-09-06-acceptance-postfx.md` **兩項仍未簽字**：① `LEAN.dist` 從 P-4 (b) 明寫的 −0.3 改成 0（`js/camera-director.js:69`）；② P-4 (c)「維持現行 punch」在 `prefers-reduced-motion` 下被解讀成「不震」（`:288`）。
- **M-4**（`bloomOK=false` 時邊緣線不畫、外殼照畫，與 P-3「逐位元組不變」條文不一致）第 2 輪判「應修或簽字」，第 2 輪修復明說沒碰，本輪也沒碰——**仍然空著**。
- punch 家族的單幀位移（punch 上升沿 0.5061、burn 上升沿 0.7592、`onDuelEnd` 歸零 0.4160）依裁定原封不動，是這一場最大的單幀位移來源。

---

## 我查過、沒找到問題的地方（附查法）

| 類別 | 結論 | 查法 |
|---|---|---|
| 第一幀 `cur*` 未寫入 | 安全，且構造保證 | `cur*` 初值＝`SHOTS.table`＝`scene-env.js:39-43` 的開場機位（同一組數字）；`cam-r3.mjs` P 組 11 格實測 f1 ≤5.7e-05 |
| 標題頁連發 `ys:table`／`ys:end` | 安全 | `cam-r3.mjs` T 組 8 格，f1 ≤2.1e-05；mutA 上 `T4` 是 3.301519（探針有鑑別力） |
| punch／burn 進行中 goto，punch 結束時 | 安全 | `cam-r3.mjs` U 組 26 格：整段最大幀差 ＝ punch／burn 自己的上升沿（`maxAt=0`），goto 沒有加碼 |
| reduced-motion 下所有 goto | 安全 | `cam-r3.mjs` reduced 分頁 638 格：K 組最大 f1 0.000651 |
| 連續事件 0／1／2 幀 | 安全 | K 組 593 格 × 2 模式，f1 > 0.20 者 0 格；mutA 上 322/593 紅 |
| 折回期間 `\|camera.position\|` 恆定（鎖排法閘門） | 恆定 | `cam-r2` `A2／A7／C3／C5／C7／E1／F1／H1` 的 `dLenMax` ＝ 8.88e-16～1.78e-15；`cam-r3` K 組 `dLenMax > 0.2` 者 0 格 |
| `ys:reveal` 自動返回到期那一幀 | 安全 | `cam-r3` `K_revealAutoReturn` f1 0.000357、`K_reveal_midFold_autoReturn` f1 0.000145 |
| 真 SKIP 出貨路徑 | 安全 | `skip-real --skipat=900`：`duelEndInsideFoldWindow=true`、`stepAtDuelEndFrame` 0.001266、`foldWindow.max` 0.056292 |
| A7 的參考值會不會被 mutA 帶歪 | 不會 | mutA 的 `A7_refs` 與 HEAD 逐值相同 |
| A8 的斷言有沒有被鬆動 | 沒有 | `A8_PASS` 判準與窗逐字未動，新增的兩個是獨立鍵、不進 `ALL_PASS` |
| A3 的門檻有沒有被動 | 沒有 | `A3_PASS` 判準逐字未動（`>5`／`<-5`／`atMs<0.5`）；動的是實測值 9.45→6.89 |
| `edgeOn` 與 `?edge=0`／`crowded`／`kind` | 一致 | `edge-flag.mjs` 六個狀態實測（含「線畫得出來但旗標為 false」的兩格反面對照） |

---

## 重跑指令（全部從 repo 根執行）

```bash
# 依賴（.gitignore 已含 tools/anyCreature/）
powershell -c "New-Item -ItemType Junction -Path '<worktree>\tools\anyCreature\node_modules' -Target 'C:\Users\shung\OneDrive\桌面\妖市\tools\anyCreature\node_modules'"
mkdir -p _scratch3 && git show 5f76adc:js/camera-director.js > _scratch3/camdir-v034.js

# 作者治具（--base 必帶）
node tests/tools/cam-unit.mjs _scratch3/r3-camunit-head.json --port=8911 --base=_scratch3/camdir-v034.js

# 本輪新探針
node docs/experiments/2026-09-06-postfx-review-round3-evidence/cam-r3.mjs    _scratch3/r3-camr3-head.json --port=8914
node docs/experiments/2026-09-06-postfx-review-round3-evidence/edge-flag.mjs _scratch3/r3-edgeflag.json    --port=8919

# 突變體（跑完記得刪 tests/tools/_tmp-mut*.js）
sed 's|    startTween({ dist: curDist, tilt: curTilt, yaw: curYaw, lookY: curLookY }, shot, ms);|    startTween(target, shot, ms);|' js/camera-director.js > tests/tools/_tmp-mutA.js
sed 's|      const leanK = leanRise \* (1 - easeOutCubic(leanU)); // leanU=1 → 0|      const leanK = 1 - easeOutCubic(leanU);|' js/camera-director.js > tests/tools/_tmp-mutB.js
sed 's|  reveal: { dist: 3.2, tilt: 30, yaw: 0, lookY: 0.3, ms: 550 }|  reveal: { dist: 3.2, tilt: 30, yaw: 0, lookY: 0.3, ms: 20 }|' tests/tools/_tmp-mutA.js > tests/tools/_tmp-mutC.js
sed 's|  riseMs: 120,|  riseMs: 200,|' js/camera-director.js > tests/tools/_tmp-mutD.js
MSYS_NO_PATHCONV=1 node tests/tools/cam-unit.mjs _scratch3/r3-camunit-mutA.json --port=8912 --base=_scratch3/camdir-v034.js --new=/tests/tools/_tmp-mutA.js
MSYS_NO_PATHCONV=1 node docs/experiments/2026-09-06-postfx-review-round3-evidence/cam-r3.mjs _scratch3/r3-camr3-mutA.json --port=8915 --new=/tests/tools/_tmp-mutA.js

# 第 2 輪覆審員的探針（cam-r2 預設讀 _scratch/camdir-v034.js）
mkdir -p _scratch && cp _scratch3/camdir-v034.js _scratch/camdir-v034.js
node docs/experiments/2026-09-06-postfx-review-round2-evidence/cam-r2.mjs    _scratch3/r3-camr2-head.json --port=8917
node docs/experiments/2026-09-06-postfx-review-round2-evidence/fold-race.mjs _scratch3/r3-foldrace.json   --port=8916 --at=900   # 連跑 5 次，見 L3-1
node docs/experiments/2026-09-06-postfx-review-round2-evidence/skip-real.mjs _scratch3/r3-skipreal-900.json --port=8916 --skipat=900
node docs/experiments/2026-09-06-postfx-review-round2-evidence/lean-px.mjs   _scratch3/r3-leanpx.json     --port=8916

# 回歸
node tests/tools/traitfx-drive.mjs _scratch3/r3-traitfx.json --port=8918
node tests/tools/duel-drive.mjs "http://127.0.0.1:8918/index.html?paperwar=1&fxcount=1&seed=7" _scratch3/r3-dueldrive.json --duels=4 --port=8918
node tests/tools/duel-perf.mjs lineup _scratch3/r3-lineup.json --na=8 --nb=8 --port=8918
```
