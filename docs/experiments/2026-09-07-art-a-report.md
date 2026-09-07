# 美術甲「夜市燈火」渲染基礎包 — 實作與驗收報告（**二版**，2026-09-07，v0.46）

凍結檔：`docs/experiments/2026-09-07-acceptance-art-a.md`（A1–A10 原文一字未刪；四條的 §2.1 修訂
紀錄已寫進該檔末，**每一條都附「原標準錯在哪／為什麼現在才知道／改前改後實測數字」與「使用者裁定同意」**）。
基準：**`15588a7`**（本分支已 `merge origin/main`；`main` 這段只動 `index.html`／`tests`／`docs`，
`js/` 一行未動，所以渲染面的基準與 `7ab389e` 等價）。
證據目錄：`docs/experiments/2026-09-07-art-a-evidence/`。

> **一版與二版的差別**（冷讀覆審無 CRITICAL、可合併但要二版）：
> A4 從「2D 包圍盒不得相交」換成深度判準且**對決保留剪影**（不再整組藏）；A3／A5 改量純 3D 圖；
> bloom threshold 0.9→0.7（0.9 等於光暈消失）；`?fps=1` 取樣器不再擾動被測物；同種子對決對照；
> 註解口徑改成實測數字。**下面每一條都是二版重跑的數字，PNG 與數字同一次產出。**

---

## 1. A1–A10 一行表

| # | 判定 | 有沒有記 §2.1 | 一句話 |
|---|------|--------------|--------|
| A1 | ✅ | – | `toneMapping=4`／`exposure=1.1`／`colorSpace=srgb`；基準 `0`／`1`。`grep -c "ACES\|aces" js/bloom.js` = **1**（唯一那行是檔頭註解，GLSL 的 `aces()`／`toSRGB()` 已整段刪除） |
| A2 | ✅ | – | 新增 1 顆 `HemisphereLight`(1.8, `#6b6a96`/`#8a5626`)；4 顆 `PointLight` hex 互異、基準強度 7.0／3.6／5.6／5.0 非全等；`js/creature-figures.js` 不在 diff 中 |
| A3 | ✅ | **有**（換量法） | 新量法 新版 **9.61**（五次：10.22／9.38／8.93／10.03／9.61，全 ≥8）；基準 **0.00**（四次全 0.00，<5） |
| A4 | ✅ | **有**（換判準＋保留剪影） | 6 場對決 `depthPassAll=true`；minFar 6.459～12.18 > maxFig 4.80～5.38。**兩個負控組都紅**（見 §3） |
| A5 | ⚠️ **過，但基準側的鑑別力只有 3/4** | **有**（換量測位置） | 新版 0.3707～0.5569（五次全 <0.8，離門檻約 2 倍）；基準 0.7563／0.8003／0.8205／0.8383——**跨在 0.8 上**。詳見 §4 |
| A6 | ✅（人眼最終由主對話判） | – | 27 隻兩版各拍完、0 error；contact sheet 兩張。bloom 0.7 的前後對照見 §3 的量化數字 |
| A7 | ✅ | – | n=10 uncap 配對中位 基準 60.2 → 新版 61.7（比 **1.025**）；n=8 配對 59.9→59.9（比 **1.000**）。牌桌 draw calls 8→14（**+6** ≤10）。量測環境的雜訊處置見 §4 |
| A8 | ✅ | – | `?fps=1` 雙向 pass；8 套測試全綠；`duel-drive --duels=6` 0 error；`ash-freeze-probe` 這一輪 **F1=0 ✅ 全綠** |
| A9 | ✅ | – | `trace(1..20)` 對 `15588a7` 逐位元組相等（386,483 bytes 兩邊相同）；**突變驗紅通過**（見 §3） |
| A10 | ✅ | **有**（加 `creature-preview.html`） | 檔案清單見 §5，全部落在凍結檔（含 §2.1）允許的範圍內 |

**記了 §2.1 的四條：A3（換量法）、A4（換判準）、A5（換量測位置）、A10（加一個檔）**，全部有使用者裁定，
且四條的「改前／改後實測數字」都寫進凍結檔本身。

---

## 2. 每條修補的三態＋數字（覆審 findings 的處置）

| 覆審項 | 三態 | 數字／證據 |
|--------|------|-----------|
| **A4 改法**（保留剪影 0.30、改深度判準、拿掉 `shown()` 短路） | **真的修好** | `ENV.FAR_DUEL_OPACITY = 0.30`（`js/scene-env.js`），`far.visible` 全程 true。6 場 `depthPass` 全 true。治具 `art-a-duel.mjs` 的距離計算**刻意不看 `o.visible`**，可見性單獨當一個要件——負控組（把 far 在對決 `visible=false` 的突變副本）回 `farVisible 0/5`、`depthPassAll=false`，而 `minFarDist` 照樣算得出 10.115／6.575（證明沒有短路） |
| **A5 量測位置**改純 3D 圖 | **真的修好（但見 §4）** | 新版 0.4474／0.4705／0.3707／0.4752／0.5569；基準 0.7563／0.8003／0.8205／0.8383 |
| **A10** 接受多改一檔 | **真的修好** | 已寫入凍結檔 §2.1，含「不改則 A6 的尺與產品不同刻度」的理由 |
| **bloom threshold 0.9→0.7** | **真的修好** | 同一場對決同一時點，`bloom.setStrength(1.05)` vs `0` 兩張對比：**平均差 3.706/255、最大 236/255、36.52% 的畫素有變動**（覆審在 0.9 時量到的是 0.022/255）。倍率 ≈ **168×**。證據 `bl-duel1.png` / `bl-duel1-bloom0.png` |
| **MEDIUM-2 對決不是同場景** | **真的修好** | `art-a-duel.mjs` 加 `--seed=N`（`?fxcount=1&seed=N`）。`sheet-scene.png` 第 3、4 列是**同一場**：青面攤主 0 vs 獵人 3、閭山法師 1 vs 陰間當鋪 2，基準與新版逐格對得上 |
| **MEDIUM-1 數字與 PNG 不同 run** | **真的修好** | §1 的 A3／A5 數字全部來自 `scene-shot --gate` 那一次產出的 `new-table3d.png`／`base-table3d.png`，指令與 PNG 同一次 |
| **MEDIUM-6 `?fps=1` 擾動被測物** | **真的修好** | 改成定長 `Float64Array(256)` 環形緩衝＋每 250ms 才更新文字＋平均 `(n−1)/(t_last−t_first)×1000`，**穩態零配置、不排序、不每幀寫 DOM**（`index.html` 的 `FPS_DIAG`）。實跑：`fps 平均 39（最近 2s，n=66）｜draw calls 14｜三角形 855`，雙向 pass |
| **MEDIUM-3 註解口徑** | **真的修好** | `js/bloom.js:14-16`／`js/renderer.js:87-90` 改成「**不透明幾何兩條路逐值一致（<1/255）；半透明與粒子因混色空間不同仍有落差（~12/255）**」，不再寫「同一條曲線」 |
| **LOW-1 `far-group` 改名** | **真的修好** | `js/scene-env.js` 的容器改名 `far`；治具掃 `far-` 前綴，`farCount` 現在是 5 不是 6 |
| **LOW-3** | **沒修到（缺內容）** | 派工只寫「LOW-3 註記」，沒有給 LOW-3 的內容，我手上沒有覆審報告全文——**不猜**。請把 LOW-3 那一條貼過來，我補 |
| **A4 重量時機**（先 merge main） | **真的修好** | 已 `merge origin/main`（`15588a7`），衝突只有 VERSION 一行（取 0.46）。**`main` 這段沒有動 `js/`**，切鏡 0.45 尚未進來，所以對決機位仍是 `dist 4.2／tilt 24°`；深度判準與 30% 截圖都在合併後的機位上量 |

---

## 3. 鑑別力：三組負控組都紅

一版最大的問題是「綠燈跟待驗行為脫鉤」。二版每個關鍵判準都配了會紅的對照：

| 判準 | 把系統改成什麼 | 結果 |
|------|----------------|------|
| **A4 深度** | 對決時 `far.visible=false`（`mutant-farhidden` 突變副本，只改 `js/renderer.js` 一行） | `farVisible 0/5` → `depthPassAll=false` ❌，且 `minFarDist` 仍算得出來（沒短路） |
| **A4 深度** | 基準版（`15588a7`，根本沒有 far-*） | `farVisible 0/0` → `depthPassAll=false` ❌ |
| **A3 天空帶 ΔE** | 基準版（純色背景） | **0.00**（四次全 0.00）❌，新版 8.93～10.22 ✅ |
| **A9 逐位元組相等** | `node tests/tools/trace-eq.mjs index.html --mutate`：把 `CFG.ROUNDS 12→11` 寫進**暫存副本**（原檔全程唯讀，「還原」＝刪掉暫存體，不做反向 sed） | `differs:true`、`突變驗紅 ✅`；bytes 386483 vs 377059 |
| **bloom threshold** | `bloom.setStrength(0)` 同幀對照 | 0.7：平均差 3.706/255（0.9 時只有 0.022/255） |

另外一個**邊界**（`03 R5` 第 2 項）：本卷最高風險的改動是「bloom 合成從 `RawShaderMaterial` 換成
`ShaderMaterial`」，而 `js/bloom.js` 檔頭記載 ShaderMaterial 在 SwiftShader 上會連結失敗。
`node tests/tools/art-a-swgl.mjs --port=8973`（chromium 不給 `--use-gl=angle`）→
`{"gl":{"bloomOn":false,"glName":"…SwiftShader driver","programs":13},"errors":0,"pass":true}`。

---

## 4. 兩件要你知道的（沒有動任何門檻）

### 4.1 A5 的基準側跨在門檻上（`02 §6.2`：訊號忽紅忽綠先歸因，再說話）
- 新版：0.4474／0.4705／0.3707／0.4752／0.5569（**五次全過，離 0.8 約 2 倍**）——這一側是穩的。
- 基準：0.7563／**0.8003**／**0.8205**／**0.8383**（四次裡 3 次不過、1 次過）——**跨在 0.8 上**。
- **歸因**：四角 5% 的取樣框裡有會動的東西——`createEmbers(20)` 的火星、線香煙，加上四盞燈籠的正弦
  閃爍（每盞相位不同）。截圖落在任意動畫相位，角落亮度因此有 ±5% 的來回；角落絕對亮度只有 19～20，
  一顆火星飄進角落就會把比值推過門檻。
- **結論的講法**：新版通過是可信的（margin 2 倍）；**「基準不過」這件事只有 3/4 的把握**。
  覆審給的 0.8185 是這個分布裡的一次抽樣。**我沒有動門檻、沒有加 retry、沒有改取樣框**——
  要讓這條穩下來只有兩條路（都要你點頭）：截圖前把動畫定格，或改成多次取樣取中位數。

### 4.2 A7 的量測環境被別的 agent 佔住
- 量測當下機器上有 **10 個 `chrome-headless-shell`**（其他妖市 worktree agent 的 Playwright）、
  CPU **93%**。同一支治具在本 session 稍早（機器閒置時）量到 `rendersPerSec 505`，這一輪只有 ~200。
- **處置（不是把數字調好看，是讓比較成立）**：改成**配對交錯**跑（基準／新版一前一後緊接著，共 3 對 n=10、
  5 對 n=8），這樣兩邊看到的是同一段負載；再逐對比、取中位。
- n=10 uncap：pair1 基準 32.7／新 58.8（**這一對作廢**：基準那次撞到負載尖峰，且兩邊 `visible` 15≠16
  ＝場景不同）、pair2 60.2／61.7、pair3 69.9／65.8 → 有效兩對的中位 **60.2 → 61.7，比 1.025** ✅
- n=8（vsync 封頂 59.9）：基準 59.9／59.9／59.9／**30**／59.9，新版 59.9／**30**／59.9／59.9／59.9——
  **兩側各出現一次 30.0**（半 vsync 卡頓），對稱出現＝環境造成，不是被測物。去掉那兩次後
  兩側都是 59.9，比 **1.000** ✅；`rendersPerSec` 中位 189.9 → 202.3（比 1.066）。
- 這一節的數字**在機器閒置時要重量一次才算定案**；本輪的結論是「配對比較下沒有退步」，不是「絕對 fps 是多少」。

### 4.3 A4 判準逼著剪影往外推（副作用，已接受）
深度判準是 `min(剪影距相機) > max(人形距相機)`，而對決相機在半徑 3.84 的圓上繞四個座位，
最壞情況是相機正對某一片剪影 → 距離只剩 `D − 3.84`。人形最遠實測 5.38，所以 **D 必須 > 9.24**。
一版的 D=8.5～9.0 在六場裡紅了一場（minFar 5.076 < maxFig 5.379，**紅的原因不是遮擋，是相機停在剪影旁邊**）。
**改的是實作不是判準**：D 推到 10.0～10.8、方位角往畫面左右外側推。代價是牌桌機位下剪影的底邊
從 NDC 0.57～0.87 上移到 **0.60～0.92**，看得到的部分變少（現在是畫面最上緣的一條天際線）。
5 片仍全部在視錐內、全部 `visible`，A4 的 ≥3 有餘裕。

---

## 5. 改動清單（`git diff --stat 15588a7`，不含證據目錄與本報告）

```
 docs/GAME_DESIGN.md                             |  10 +
 docs/IMPLEMENTATION_GUIDE.md                    |  23 +++
 docs/design/ART_BIBLE.md                        |  19 ++
 docs/experiments/2026-09-07-acceptance-art-a.md |  52 +++++   ← §2.1 修訂紀錄（只加不刪）
 index.html                                      |  48 ++++-
 js/bloom.js                                     |  43 +++--
 js/renderer.js                                  |  44 ++++-
 js/scene-env.js                                 | 240 +++++++++++++++++++++++-
 tests/tools/art-a-duel.mjs                      | 157 ++++++++++++++++
 tests/tools/art-a-fps.mjs                       |  54 ++++++
 tests/tools/art-a-lookdev.mjs                   |  58 ++++++
 tests/tools/art-a-metrics.py                    |  86 +++++++++
 tests/tools/art-a-sheet.py                      |  50 +++++
 tests/tools/art-a-swgl.mjs                      |  41 ++++
 tests/tools/creature-preview.html               |  14 +-
 tests/tools/scene-shot.mjs                      | 162 +++++++++++++++-
 tests/tools/trace-eq.mjs                        |  48 +++++
 17 files changed, 1104 insertions(+), 45 deletions(-)
```

逐檔對應：`js/*` ＝凍結檔範圍 1–5；`index.html` ＝範圍 1（VERSION 0.46）、5（`#vignette`）、6（`?fps=1`）；
`docs/*` ＝範圍 7 ＋ §2.1 紀錄；`tests/tools/*` ＝ A1–A9 的機械證據與負控組。**引擎零改動**（A9 背書）。

## 6. Contact sheet

| 用途 | 路徑 |
|------|------|
| 場景前後對照（牌桌含 UI／牌桌純 3D／**同種子同一場**對決 ×2，左基準右新版） | `docs/experiments/2026-09-07-art-a-evidence/sheet-scene.png` |
| 27 隻 lookdev 基準／新版 | `…/sheet-lookdev-base.png`／`…/sheet-lookdev-new.png` |
| bloom 有無對照（threshold 0.7） | `…/bl-duel1.png`（strength 1.05）／`…/bl-duel1-bloom0.png`（strength 0） |

## 7. 常數（全部【試玩必調】）

`js/scene-env.js` 的 `ENV`（`EXPOSURE` 1.1、`SKY_STOPS` 五站夜空、`SKY_FOG`、`FAR_DARK`／`FAR_LAMP`、
`FAR_OPACITY` 1.0／**`FAR_DUEL_OPACITY` 0.30**、`HEMI_*`、`AMBIENT_*`）與 `LANTERNS`（四盞燈籠色溫與亮度）；
`js/renderer.js` 的 `BLOOM.threshold` **0.7**（跟 `EXPOSURE` 綁在一起，改一個要重看另一個）；
`index.html` 的 `#vignette` radial-gradient。理由全部在 `docs/design/ART_BIBLE.md` §8。

## 8. 下一步

1. **真機試玩**：橫持開 `?fps=1` → 進規則頁截圖回報（補齊從未有過的 iPhone fps／draw call）。
2. **A5 要不要穩下來**（§4.1）：定格動畫或多次取樣取中位，兩條都要你點頭才動。
3. **A7 機器閒置時重量一次**（§4.2）。
4. **LOW-3 的內容給我**（見 §2 最後一列），我補上就結。
5. 剪影現在只剩畫面最上緣一條天際線（§4.3）——真正解「市集沒東西看」的是**乙卷**，不是再加剪影。
