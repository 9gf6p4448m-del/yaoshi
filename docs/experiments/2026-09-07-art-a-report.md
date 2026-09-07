# 美術甲「夜市燈火」渲染基礎包 — 實作與驗收報告（**二版**，2026-09-07，v0.46）

- 凍結檔：`docs/experiments/2026-09-07-acceptance-art-a.md`。**A1–A10 原文一字未刪**；四條的 §2.1
  修訂紀錄寫在該檔末，每一條都附「原標準錯在哪／為什麼現在才知道／改前改後實測數字／使用者裁定同意」。
- **基準：`85ca73e`**（本分支已 `merge origin/main` 兩次：`15588a7` 請神 2.0、`85ca73e` 對決近景切鏡批 1）。
  合併衝突只有 `index.html` 的 VERSION 行（取 `0.46`，NOTE **保留** closeup／legend 的開關說明再加「夜市燈火」）
  與兩份 docs 的 changelog／章節編號（我方的 §11.22 讓給切鏡卷，改成 §11.23）。`js/bloom.js`／`renderer.js`／
  `scene-env.js` 三個檔零衝突。
- 證據目錄：`docs/experiments/2026-09-07-art-a-evidence/`。
- **本報告所有數字都是合併 `85ca73e` 之後重跑的**；PNG 與數字同一次產出。

---

## 1. A1–A10 一行表

| # | 判定 | §2.1 | 數字 |
|---|------|------|------|
| A1 | ✅ | – | `toneMapping=4`／`exposure=1.1`／`colorSpace=srgb`；基準 `0`／`1`。`grep -c "ACES\|aces" js/bloom.js` = **1**（唯一那行是檔頭註解；GLSL 的 `aces()`／`toSRGB()` 已整段刪除） |
| A2 | ✅ | – | 新增 1 顆 `HemisphereLight`(1.8, 天 `#6b6a96`／地 `#8a5626`)；4 顆 `PointLight` hex 兩兩互異（`#ffa855`／`#a8402a`／`#ffc070`／`#d8e8ff`）、基準強度 7.0／3.6／5.6／5.0 非全等。`js/creature-figures.js` **不在 diff 中**；`createFigureLightRig({ scale: 1.7 })` 逐字未改 |
| A3 | ✅ | **有** | 天空帶 ΔE：**新版 9.20**（≥8）／**基準 0.00**（<5）。合併前後共六次新版量測 8.93～10.22，基準四次全 0.00 |
| A4 | ✅ | **有** | **兩種對決機位都過**。近景切鏡開（預設）：6 個取樣點（3 個 `focus` ＋ 3 個 `duel-end`）全 `depthPass=true`；`closeup=0` 全景：3 個 `duel-end` 全過。minFar 6.575～11.467 > maxFig 3.006～5.047。兩個負控組都紅（§3） |
| A5 | ✅（基準側 4/5） | **有** | 新版 **0.6048**（五次 0.3707～0.6048，全 <0.8）／基準 **0.8085**（五次 0.7563／0.8003／0.8085／0.8205／0.8383，4/5 不過）。基準側跨在門檻上，見 §4.1 |
| A6 | ✅（人眼最終由主對話判） | – | 27 隻兩版各拍完、0 error；bloom 0.7 的量化前後差見 §3 |
| A7 | ✅ | – | n=10 uncap **8 對交錯**：rafMedian 中位 **53.0 → 62.25（比 1.17）**、rendersPerSec 中位 214.55 → 217.2（比 1.012）。n=8 **4 對**：59.9 → 59.9（比 **1.000**）、rendersPerSec 199.9 → 198.25（比 0.992）。牌桌 draw calls **8 → 14（+6 ≤10）**。量測環境雜訊的處置見 §4.2 |
| A8 | ✅ | – | `?fps=1` 雙向 pass（`fps 平均 44（最近 2s，n=79）｜draw calls 14｜三角形 855`）；**8 套**測試全綠；`duel-drive --duels=6` **切鏡開／關各一輪，兩輪都 0 error、`abOnAllUnits:true`**；`ash-freeze-probe` F1=0 ✅、0 error |
| A9 | ✅ | – | `trace(1..20)` 對 `85ca73e` 逐位元組相等（兩邊 386,483 bytes）；**突變驗紅通過**（§3） |
| A10 | ✅ | **有** | 檔案清單見 §5，全部落在凍結檔（含 §2.1）允許的範圍 |

**記了 §2.1 的四條**：A3（換量法）、A4（換判準＋對決保留剪影）、A5（換量測位置）、A10（加 `creature-preview.html`）。
四條都有使用者裁定，改前／改後實測數字寫在凍結檔本身。

---

## 2. 覆審 findings 的三態

| 項目 | 三態 | 證據 |
|------|------|------|
| **A4 改法**：保留剪影 0.30、改深度判準、拿掉 `shown()` 短路 | **真的修好** | `ENV.FAR_DUEL_OPACITY = 0.30`；`far.visible` 全程 true。深度判準在**兩種機位**都過。負控組見 §3 |
| **A5 量測位置**改純 3D 圖 | **真的修好（基準側 4/5，見 §4.1）** | 新版 0.6048／基準 0.8085 |
| **A10** 接受多改一檔 | **真的修好** | 已寫入凍結檔 §2.1 |
| **bloom threshold 0.9→0.7** | **真的修好** | 同一場對決同一時點 `setStrength(1.05)` vs `0`：**平均差 3.706/255、最大 236/255、36.52% 畫素變動**（0.9 時是 0.022/255）＝**168 倍** |
| **MEDIUM-2 對決不是同場景** | **真的修好** | `art-a-duel.mjs --seed=N`。`sheet-scene.png` 第 3／4 列是**同一場**：青面攤主 0 vs 獵人 3、閭山法師 1 vs 陰間當鋪 2 |
| **MEDIUM-1 數字與 PNG 不同 run** | **真的修好** | A3／A5 的數字全部來自 `scene-shot --gate` 那一次產出的 `*-table3d.png` |
| **MEDIUM-6 `?fps=1` 擾動被測物** | **真的修好** | 定長 `Float64Array(256)` 環形緩衝＋每 250ms 才更新文字＋平均 `(n−1)/(t_last−t_first)×1000`；穩態零配置、不排序、不每幀寫 DOM |
| **MEDIUM-3 註解口徑** | **真的修好** | `js/bloom.js` 檔頭與 `js/renderer.js` 的 renderer 設定段改成「不透明幾何逐值一致（<1/255）；半透明與粒子因混色空間不同仍差 ~12/255」，不再寫「同一條曲線」 |
| **LOW-1 `far-group` 改名** | **真的修好** | 容器改名 `far`；`farCount` 現在是 5 不是 6 |
| **LOW-3** | **沒修到（缺內容）** | 派工只寫「LOW-3 註記」，沒給內容，我手上沒有覆審報告全文——**不猜**。把那一條貼過來我補 |
| **先 merge main 再重量 A4** | **真的修好** | 已合併 `85ca73e`；A4 在近景（`focus`，相機半徑 2.10～2.23、高 0.66～0.73）與全景（`duel-end`，半徑 3.837、高 1.708）**兩種機位各取樣**。近景反而寬鬆（maxFig 只有 3.0～3.1），最壞情況仍是全景 |

---

## 3. 鑑別力：每個關鍵判準都配了會紅的對照

| 判準 | 把系統改成什麼 | 結果 |
|------|----------------|------|
| **A4 深度** | 對決時 `far.visible=false`（`mutant-farhidden`：只改 `js/renderer.js` 一行的副本） | `farVisible 0/5` → `depthPassAll=false` ❌，且 `minFarDist` **照樣算得出 10.115／6.575**（證明沒有 `shown()` 短路） |
| **A4 深度** | 基準版 `85ca73e`（根本沒有 far-*） | `farVisible 0/0` → `depthPassAll=false` ❌ |
| **A3 天空帶 ΔE** | 基準版（純色背景） | **0.00**（四次全 0.00）❌；新版 8.93～10.22 ✅ |
| **A9 逐位元組相等** | `node tests/tools/trace-eq.mjs index.html --mutate`：`CFG.ROUNDS 12→11` 寫進**暫存副本**（原檔全程唯讀；「還原」＝刪掉暫存體，不做反向 sed） | `differs:true`、**突變驗紅 ✅**（386,483 vs 377,059 bytes） |
| **bloom threshold** | 同幀 `bloom.setStrength(0)` | 0.7 時平均差 3.706/255（0.9 時 0.022/255） |
| **`?fps=1`** | 不帶參數 | `#fpsDiag` 不存在 ❌→ 帶參數才存在且數字非 0 ✅ |

**邊界測試**（`03 R5` 第 2 項）：本卷最高風險的改動是「bloom 合成從 `RawShaderMaterial` 換成
`ShaderMaterial`」，而 `js/bloom.js` 檔頭記載 ShaderMaterial 在 SwiftShader 上會連結失敗。
`node tests/tools/art-a-swgl.mjs`（chromium 不給 `--use-gl=angle`）→ `{"bloomOn":false,"errors":0,"pass":true}`：
真的跑在 SwiftShader 上、bloom 真的關著、console/pageerror **0 筆**。

---

## 4. 三件要你知道的（沒有動任何門檻）

### 4.1 A5 的**基準側**跨在門檻上（`02 §6.2`）
- 新版：0.3707／0.4474／0.4705／0.4752／0.6048（**五次全過，離 0.8 有餘裕**）——這一側穩。
- 基準：0.7563／0.8003／**0.8085**／0.8205／0.8383（**4/5 不過，1 次過**）。
- **歸因**：四角 5% 取樣框裡有會動的東西——`createEmbers(20)` 的火星、線香煙，加上四盞燈籠的正弦閃爍
  （每盞相位不同）。角落絕對亮度只有 19～20，一顆火星飄進角落就把比值推過門檻。
- **講法**：新版通過可信；「基準不過」有 4/5 的把握。**我沒有動門檻、沒有加 retry、沒有改取樣框**。
  要讓它穩下來只有兩條路（都要你點頭）：截圖前把動畫定格，或改成多次取樣取中位。

### 4.2 A7 的量測環境被別的 agent 佔住
- 量測當下機器上有 5～10 個 `chrome-headless-shell`（其他妖市 worktree agent 的 Playwright）、CPU **93～100%**。
  同一支治具在本 session 稍早（機器閒置時）量到 `rendersPerSec 505`，這幾輪只有 150～290。
- **處置（讓比較成立，不是把數字調好看）**：**配對交錯**跑（基準／新版一前一後緊接著），n=10 跑 8 對、
  n=8 跑 4 對，再比**中位數**——單一對的數字在這種負載下沒有意義（同一版在不同對之間就能差 2 倍）。
- n=10 uncap 逐對（base→new）：55.2→39.4、32.9→54.6、64.5→33.3、60.6→71.9、74.6→70.9、50.8→37.2、
  50.3→69.9、49.3→79.4；**中位 53.0 → 62.25（比 1.17）**。rendersPerSec 中位 214.55 → 217.2（比 1.012）。
- n=8（vsync 封頂）逐對：59.9→59.9、59.9→59.9、59.5→59.9、59.9→59.9；**比 1.000**。
  rendersPerSec 中位 199.9 → 198.25（比 0.992）。
- **這一節的絕對數字在機器閒置時要重量一次才算定案**；本輪成立的結論是「配對比較下沒有退步」。

### 4.3 A4 判準逼著剪影往外推（副作用，已接受）
深度判準是 `min(剪影距相機) > max(人形距相機)`，而全景對決相機在半徑 3.84 的圓上繞四個座位，
最壞情況是相機正對某一片剪影 → 距離只剩 `D − 3.84`。人形最遠實測 5.38，所以 **D 必須 > 9.24**。
一版的 D=8.5～9.0 在六場裡紅了一場（minFar 5.076 < maxFig 5.379，**紅的原因不是遮擋，是相機停在剪影旁邊**）。
**改的是實作不是判準**：D 推到 10.0～10.8、方位角往畫面左右外側推。代價是牌桌機位下剪影底邊
從 NDC 0.57～0.87 上移到 0.60～0.92——現在是畫面最上緣的一條天際線。5 片仍**全部**在視錐內且 `visible`，
A4 的「≥3」有餘裕。近景切鏡併入後這條更寬鬆（近景相機半徑只有 2.1～2.2），最壞情況仍是全景那組。

---

## 5. 改動清單（`git diff --stat 85ca73e`，不含證據目錄與本報告）

```
 docs/GAME_DESIGN.md                             |  11 +   changelog v0.46
 docs/IMPLEMENTATION_GUIDE.md                    |  26 ++  §11.23 接手六件事＋「對決機位不只一種」
 docs/design/ART_BIBLE.md                        |  19 ++  §8 燈光與色調（常數表＋理由）
 docs/experiments/2026-09-07-acceptance-art-a.md |  52 ++  §2.1 修訂紀錄（只加不刪）
 index.html                                      |  48 +-  VERSION 0.46／#vignette CSS+DOM／?fps=1 段
 js/bloom.js                                     |  43 +-  合成改 ShaderMaterial、手刻映射移除
 js/renderer.js                                  |  44 +-  ACES+exposure+colorSpace／canvas z −2／燈籠 baseIntensity／遠景 0.30／bloom 0.7
 js/scene-env.js                                 | 240 +-  ENV／LANTERNS、漸層穹頂、HemisphereLight、五片剪影
 tests/tools/art-a-duel.mjs                      | 169 ++  A4 深度判準（新治具）
 tests/tools/art-a-fps.mjs                       |  54 ++  A8 ?fps=1 雙向（新治具）
 tests/tools/art-a-lookdev.mjs                   |  58 ++  A6 27 隻一次拍完（新治具）
 tests/tools/art-a-metrics.py                    |  86 ++  A3／A5 畫素量測（新治具）
 tests/tools/art-a-sheet.py                      |  50 ++  contact sheet（新治具）
 tests/tools/art-a-swgl.mjs                      |  41 ++  軟體 GL 邊界（新治具）
 tests/tools/creature-preview.html               |  14 +-  lookdev 尺對齊產品（§2.1 已允許）
 tests/tools/scene-shot.mjs                      | 162 +-  --gate：關 intro／draw call 歸因／far-* 視錐／暈角 DOM／純 3D 截圖
 tests/tools/trace-eq.mjs                        |  48 ++  A9 等價＋--mutate 突變驗紅（新治具）
```

逐檔對應：`js/*` ＝凍結檔範圍 1–5；`index.html` ＝範圍 1（VERSION 0.46）、5（`#vignette`）、6（`?fps=1`）；
`docs/*` ＝範圍 7 ＋ §2.1 紀錄；`tests/tools/*` ＝ A1–A9 的機械證據與負控組。**引擎零改動**（A9 背書）。

## 6. Contact sheet

| 用途 | 路徑 |
|------|------|
| 場景前後對照（牌桌含 UI／牌桌純 3D／**同種子同一場**對決 ×2，左基準右新版） | `docs/experiments/2026-09-07-art-a-evidence/sheet-scene.png` |
| 27 隻 lookdev 基準／新版 | `…/sheet-lookdev-base.png`／`…/sheet-lookdev-new.png` |
| bloom 有無對照（threshold 0.7） | `…/bl-duel1.png`（strength 1.05）／`…/bl-duel1-bloom0.png`（strength 0） |
| A4 逐取樣點原始值（含 far／fig 的距離與包圍盒） | `…/new-a4.json`（新版）／`…/mutant-a4.json`（負控）／`…/base-a4.json`（基準） |

## 7. 常數（全部【試玩必調】）

`js/scene-env.js` 的 `ENV`（`EXPOSURE` 1.1、`SKY_STOPS` 五站夜空、`SKY_FOG`、`FAR_DARK`／`FAR_LAMP`、
`FAR_OPACITY` 1.0／**`FAR_DUEL_OPACITY` 0.30**、`HEMI_*`、`AMBIENT_*`）與 `LANTERNS`（四盞燈籠色溫與亮度）；
`js/renderer.js` 的 `BLOOM.threshold` **0.7**（跟 `EXPOSURE` 綁在一起，改一個要重看另一個）；
`index.html` 的 `#vignette` radial-gradient。理由全部在 `docs/design/ART_BIBLE.md` §8。

## 8. 下一步

1. **真機試玩**：橫持開 `?fps=1` → 進規則頁截圖回報（補齊從未有過的 iPhone fps／draw call）。
2. **A5 要不要穩下來**（§4.1）：定格動畫或多次取樣取中位，兩條都要你點頭才動。
3. **A7 機器閒置時重量一次**（§4.2）。
4. **LOW-3 的內容給我**（§2 倒數第二列），補上就結。
5. 剪影現在只剩畫面最上緣一條天際線（§4.3）——真正解「市集沒東西看」的是**乙卷**，不是再加剪影。
