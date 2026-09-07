# 美術甲「夜市燈火」渲染基礎包 — 實作與驗收報告（2026-09-07，v0.46）

凍結檔：`docs/experiments/2026-09-07-acceptance-art-a.md`（A1–A10，本卷全程未動）。
基準 SHA：`7ab389e`（＝凍結檔那一筆；凍結檔自己寫的基準是它的前一筆 `5565364`，兩者之間只有凍結檔本身）。
證據目錄：`docs/experiments/2026-09-07-art-a-evidence/`。量測機器：同一台、同一 session、ANGLE (AMD Radeon 780M, D3D11)。

> **先講四件不好的事**（細節在 §4；前三件要你裁，第四件是我已自行決定、只是報備）：
> ① **A3 這一條零鑑別力**——基準版就已經 24.96 ≥ 15（凍結檔預期 <5），它量到的是 DOM 面板的上下色差，不是背景漸層。**要你裁量法**。
> ② **A5 同樣零鑑別力**——基準版就已經 0.6487 < 0.8（凍結檔預期 ≥0.9）；凍結檔自己預告過這個風險並指定了改量法，本報告照 `02 §2.1` 記錄但**沒有動門檻**。**要你裁量法**。
> ③ **A4 是靠「對決時把遠景剪影收掉」達成的**，不是靠擺位閃開；若不收掉，實測 6 場對決共 33 處重疊。**要你裁對決要不要留遠景**。
> ④ **A10 的檔案清單多了一個 `tests/tools/creature-preview.html`**（+9/−5）——它是 A6 指定要用的量測工具、自己建 renderer，不同步就會量到錯的東西。這一件**我自行決定改了、沒等你點頭**，理由在 §4.4；覺得不該改就退回這一個檔。
>
> 整體判定：**有條件通過**——A1／A2／A6／A7／A8／A9 乾淨過，A3／A5 過了但門檻本身沒有鑑別力，A4 過了但做法要你確認，A10 多一個檔。

---

## 1. 本輪修改（一句話）

牌桌／市集畫面補上全域 ACES 色調映射、四種色溫的燈籠、漸層夜空與遠景剪影、CSS 暈角，並加上 `?fps=1` 的手機 fps 回填欄位；引擎零改動。

## 2. 截圖（contact sheet）

| 用途 | 路徑 |
|------|------|
| 場景前後對照（牌桌含 UI／牌桌純 3D／對決 ×2，左基準右新版） | `docs/experiments/2026-09-07-art-a-evidence/sheet-scene.png` |
| 27 隻 lookdev（基準） | `…/sheet-lookdev-base.png` |
| 27 隻 lookdev（新版） | `…/sheet-lookdev-new.png` |
| 原圖 | `…/base-table3d.png`／`new-table3d.png`（純 3D）、`base-table.png`／`new-table.png`（含 UI）、`base-duel1,3.png`／`new-duel1,3.png` |

**「純 3D」那兩張是本卷最該看的一張對照**：治具把 DOM 面板整層藏起來（只留 canvas 與 `#vignette`），
基準是「一片平的紫 ＋ 一張均勻打亮的橘桌」，新版是「上藍紫下暖紅的夜空 ＋ 天際線剪影與燈籠點 ＋ 左暖右冷的桌面 ＋ 四角壓暗」。

## 3. 驗收清單對照（A1–A10）

| # | 判定 | 指令原文 | 數字 |
|---|------|----------|------|
| **A1** | ✅ | `node tests/tools/scene-shot.mjs <前綴> --gate --port=8970` | 新版 `toneMapping=4`(ACESFilmic)、`exposure=1.1`（＝`ENV.EXPOSURE`）、`colorSpace="srgb"`；基準同指令讀到 `toneMapping=0`、`exposure=1`。`grep -c "ACES\|aces" js/bloom.js` → **1**，且該行是註解（`js/bloom.js:13`「v0.45 之前這裡是自己手刻一段 ACES＋sRGB」），GLSL 裡的 `aces()`／`toSRGB()` 兩個函式已整段刪除（見 `git diff 7ab389e -- js/bloom.js`） |
| **A2** | ✅ | 同上 | 新增 1 顆 `HemisphereLight`（`#6b6a96`／地 `#8a5626`，1.8）；4 顆 `PointLight` hex 兩兩互異（`#ffa855`／`#a8402a`／`#ffc070`／`#d8e8ff`）、基準強度 7.0／3.6／5.6／5.0 非全等。戲台三燈：`js/creature-figures.js` **在 diff 中完全沒有出現**，`renderer.js` 的 `createFigureLightRig({ scale: 1.7 })` 逐字未改 |
| **A3** | ⚠️ **達標但零鑑別力** | `python tests/tools/art-a-metrics.py …/new-table.png` | 新版 ΔE(CIE76)=**19.65** ≥ 15 ✅；**但基準版同一量法＝24.96**，遠高於凍結檔預期的「<5」。詳見 §4.1 |
| **A4** | ✅（做法見註） | `node tests/tools/art-a-duel.mjs …/new --port=8975 --duels=2` | 牌桌機位：`far-` 開頭物件 5 個（`far-temple/arch/banyan/eaves/stalls`）全部 `visible=true` 且在視錐內（NDC 包圍盒與畫面相交）→ ≥3 ✅。對決機位：6 場全部 `overlaps=0`、`errors=0`。**達成方式是對決時整組淡出**（`farGroupVisible=false`、`opacity≈0.02`）；反事實見 §4.3 |
| **A5** | ⚠️ **達標但零鑑別力** | `…scene-shot --gate`＋`art-a-metrics.py` | DOM：`#vignette` 存在、`pointer-events:none`、`z-index:-1`，canvas `z-index:-2`，HUD（`#felt`）是 in-flow（`position:relative`、`z-index:auto`）＝畫在負 z-index 之上；角落點擊落在 UI（`elementFromPoint(4,4)` → `north`）。亮度比：新版 **0.4398** < 0.8 ✅；**基準版 0.6487**，已經 <0.8。詳見 §4.2 |
| **A6** | ✅（人眼最終由主對話判） | `node tests/tools/art-a-lookdev.mjs`＋`art-a-sheet.py` | 27 隻兩版各拍完（`errorCount=0`），contact sheet 兩張已附。我這邊的判讀：**沒有一隻糊成一團或曝掉**，新版整體略暖、高光去飽和（ACES 的特性），`tiger_c` 的火焰不再削頂、`bell`／`sword` 的紅稍降飽和但辨識不變；牌桌能看出左（南／西暖燈）亮、右（東青白）冷、北側最暗 |
| **A7** | ✅ | `node tests/tools/duel-perf.mjs perf … --n=10 --uncap` 與 `--n=8`（基準加 `--root=<7ab389e worktree>`） | `--n=10 --uncap`：基準 rafMedian **113.6** → 新版 **111.1**（比 0.978 ≥ 0.9 ✅；rendersPerSec 505.1→488.0，比 0.966）。`--n=8`：基準 **59.9** → 新版 **59.9**（比 1.000；rendersPerSec 282.7→284.2）。牌桌 draw calls：基準 **8** → 新版 **14**（**+6** ≤ 10 ✅；治具另量了把穹頂與剪影暫時關掉的 `callsWithoutNew=8`，證明 +6 全部來自本卷新增物） |
| **A8** | ✅（`ash-freeze` 見註） | 見下方逐條 | `?fps=1` 雙向：不帶參數 `#fpsDiag` 不存在、帶參數存在且 2s 後 `fps 中位 60／draw calls 14／三角形 855`（`node tests/tools/art-a-fps.mjs` → `pass:true`）。8 套測試：aistake 8/0、conscap 5/0、duel-desync 7 綠、legend 17/0、lineup-order 5 綠、nightrules 16 綠、review 28/0、wish16 36/0。`duel-drive --duels=6` → `errors:0`、`abOnAllUnits:true`。`ash-freeze-probe.mjs`：新版「F1 凍結 Points 數＝2 ❌／0 error true／F6 硬切段數 0 ✅」，**基準版同一指令逐字相同**（`--root` 對 7ab389e 跑），所以這個 ❌ 不是本卷造成的 |
| **A9** | ✅ | `node tests/tools/trace-eq.mjs <基準 index.html> index.html` | `{"seeds":"1..20","bytesOld":332125,"bytesNew":332125,"equal":true}`，exit 0。活性證據：輸出 332,125 bytes（不是空的），且同一支腳本對 `?paperwar` 相關開關的既有雙向測試（wish16／legend 等 8 套）全綠 |
| **A10** | ⚠️ 多一個檔 | `git diff --stat 7ab389e` | 清單見 §5。**多出凍結檔沒列的 `tests/tools/creature-preview.html`**（+9/−5；§5 表裡的「14」是 git diff --stat 的「總變動行數」，兩個數字是同一件事的兩種寫法），理由見 §4.4 |

## 4. 凍結檔哪幾條有問題（只報告，未動門檻）

### 4.1 A3「背景漸層」是零鑑別力的量法
- 條文：牌桌截圖上 10% 與下 10% 的平均 RGB，ΔE(CIE76) ≥ 15；**預期基準 < 5**。
- 實測：**基準 24.96**、新版 19.65。基準版早就過門檻。
- 為什麼：這張截圖上下兩條各 10% 的帶子，上面是「北家座位卡＋深色面板」、下面是「底部 HUD 條」，量到的是**兩塊 DOM 面板的色差**，不是天空的漸層。而且即使只量 canvas（治具另拍的純 3D 圖），基準也有 38.62——因為牌桌機位的「上」是背景、「下」是木桌，兩者本來就差很多。**這條量的是「上下有沒有差」，不是「天空有沒有漸層」**。
- 補充量測（加嚴、不取代條文）：純 3D 圖新版 ΔE=25.21、基準 38.62。新版數字反而較低，因為基準是「純紫背景 vs 亮橘木桌」這種極端對比，而新版天空與桌面都往夜色收。
- 要真的量漸層，得**只取天空那一段**（例如畫面上緣 3% 對「桌沿以上、上緣以下」那一條）再比 ΔE。這是新的量法，**我沒有自行改**。

### 4.2 A5「暈角」同樣零鑑別力（凍結檔已預告）
- 條文：四角 5% 平均亮度 < 中央 20% × 0.8；**預期基準 ≥ 0.9**。
- 實測：**基準 0.6487**、新版 0.4398。基準已經 <0.8。
- 為什麼：中央 20% 是最亮的 `#felt` 面板與拍品卡，四角是背景與座位卡邊緣——基準版本來就「中間亮、四角暗」。
- 凍結檔第 A5 條末自己寫了：「若基準也 <0.8 要改量『有無疊層』並記 §2.1——訂的當下承認此風險」。**依此改量的部分我做了、也照要求記在這裡**：DOM 層條件（存在／`pointer-events:none`／夾在 canvas 與 HUD 之間／不吃點擊）全部通過，數字見 A3 那一列。**亮度比那一半的門檻我沒有動，原值原樣回報**。
- 補充量測（加嚴）：純 3D 圖 新版 0.4446、基準 0.8185——這一組才看得出暈角本身生效。

### 4.3 A4 是靠「對決時收掉剪影」達成的
- 幾何上做不到「擺位閃開」：對決機位俯角 19.5°、垂直半 FOV 25°，離地站著的東西在 8～14 單位處，底邊落在 NDC y **0.28～0.53**；而人形實測佔 NDC y **−0.53～0.75**。要讓剪影底邊高過人形頭頂（0.75）需要距離約 **489** 單位——不在凍結檔給的 8～14 範圍內，也不是任何合理的夜市尺度。
- 所以實作選擇：對決時把 `far-group` 跟著戲台燈反向淡出（`js/renderer.js` 的 `stageOn` 那一段），`visible=false` 就不進 render list，順帶少 5 個 draw call 在最重的場景。
- **反事實（不隱藏會怎樣）**：治具第一版沒有把「祖先 visible=false」算進去，等於量到「假設剪影仍然可見」的情形——同樣 6 場對決共 **33 處重疊**（`far-banyan/A`、`far-stalls/B`…）。這個數字就是「A4 若靠擺位是過不了的」的證據。
- 待使用者裁：對決時要不要留一點遠景（例如只留最遠那片、或壓到人形頭頂以上的一條窄帶）。

### 4.4 A10 的檔案清單少一個必要的檔
- 多出 `tests/tools/creature-preview.html`（`git diff --numstat 7ab389e` → **+9/−5**）。這是 A6 指定要用的 lookdev 治具，它**自己建 renderer**，而且原本刻意不設 `outputColorSpace`（註解寫「最後的 linear→sRGB 由 bloom 的合成 shader 自己做」）。本卷把手刻映射從 `js/bloom.js` 拿掉之後，這一頁若不同步就會輸出線性值——**尺跟產品不同刻度，A6 的前後對照就沒有意義**。改動只有三行 renderer 設定＋bloom threshold 對齊＋一行 `userData.baseIntensity`。
- 另外凍結檔允許但本卷**沒有用到**的：`assets/theme.css`（暈角的 CSS 放進 `index.html` 的既有 `<style>`，跟其他覆蓋層一致）。

### 4.5 其他兩件實作上的重要發現（不是凍結檔的問題）
- **不存在「雙重映射」**：凍結檔範圍 §1 的理由是「bloom 合成 shader 那顆手刻 ACES 拿掉避免雙重」。實際上 three r158 只在**畫到畫布**那一趟注入 tonemapping／colorspace（`WebGLPrograms.js`：`currentRenderTarget === null || isXRRenderTarget`），bloom 的場景那一趟畫進 `sceneRT`，本來就吃不到 renderer 的設定——所以照原樣加上 `renderer.toneMapping` 並**不會**造成雙重映射；但若只是把手刻那段刪掉、不做別的，bloom 那條路就會完全沒有映射（輸出線性值，畫面變濁）。實作採取的做法是把合成那一趟從 `RawShaderMaterial` 換成 `ShaderMaterial`＋`#include <tonemapping_fragment>`／`<colorspace_fragment>`，讓 three 用**同一組設定**收尾——這樣兩條路曲線一致、手刻整段移除、亮部萃取仍在線性 HDR 上做（順序正確）。SwiftShader 上 `ShaderMaterial` 會連結失敗，但 `renderer.js` 的 `bloomOK` 在軟體 GL 上根本不呼叫 `bloom.render()`，那支 program 不會被編譯。
- **exposure 1.1 一度把對決洗白**：中途版本（霧色 `#33254c`）實測對決畫面中央亮度從基準 51.3／39.9 衝到 **114.1／72.3**，整場糊成灰紫霧。歸因是**霧色**不是曝光（對決霧密度 0.115，霧色一亮整個背景就抬起來）；把 `ENV.SKY_FOG` 壓回 `#1c1330`（與基準 `#1a0a2e` 同量級）之後回到 43.6／54.6，與基準同量級。曝光維持凍結檔範圍寫的 1.1。

### 4.6 額外的邊界測試（不在 A1–A10 內，是 `03 R5` 的「一個邊界」；擺在這一節是因為它印證了 §4.5 的第一點）
本卷最高風險的改動是「bloom 合成從 `RawShaderMaterial` 換成 `ShaderMaterial`」——`js/bloom.js` 檔頭記載
ShaderMaterial 在 SwiftShader（軟體 GL）上會連結失敗。推論是「`bloomOK` 在軟體 GL 上根本不呼叫
`bloom.render()`，那支 program 不會被編譯」，但推論不算數，所以真的跑了一遍：

`node tests/tools/art-a-swgl.mjs --port=8973 --duels=2`（chromium 不給 `--use-gl=angle`，退回 SwiftShader）
→ `{"gl":{"bloomOn":false,"glName":"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …), SwiftShader driver)","programs":16},"errors":0,"pass":true}`
確認：真的跑在 SwiftShader 上、bloom 真的關著、console/pageerror **0 筆**。

## 5. 改動清單（`git diff --stat 7ab389e`，不含證據目錄與本報告）

```
docs/GAME_DESIGN.md               |  10 ++
 docs/IMPLEMENTATION_GUIDE.md      |  23 ++++
 docs/design/ART_BIBLE.md          |  19 ++++
 index.html                        |  42 ++++++-
 js/bloom.js                       |  40 ++++---
 js/renderer.js                    |  42 +++++--
 js/scene-env.js                   | 229 ++++++++++++++++++++++++++++++++++++--
 tests/tools/art-a-duel.mjs        | 114 +++++++++++++++++++
 tests/tools/art-a-fps.mjs         |  54 +++++++++
 tests/tools/art-a-lookdev.mjs     |  58 ++++++++++
 tests/tools/art-a-metrics.py      |  66 +++++++++++
 tests/tools/art-a-sheet.py        |  50 +++++++++
 tests/tools/art-a-swgl.mjs        |  41 +++++++
 tests/tools/creature-preview.html |  14 ++-
 tests/tools/scene-shot.mjs        | 161 ++++++++++++++++++++++++++-
 tests/tools/trace-eq.mjs          |  18 +++
 16 files changed, 936 insertions(+), 45 deletions(-)
```

逐檔對應需求：`js/*` ＝範圍 1–5；`index.html` ＝範圍 1（VERSION）、5（暈角）、6（`?fps=1`）；`docs/*` ＝範圍 7；`tests/tools/*` ＝ A1–A9 的機械證據。**沒有一行動到引擎**（A9 逐位元組相等即為此背書）。

## 6. 新常數在哪（全部【試玩必調】）

`js/scene-env.js` 的 `ENV`（曝光、`SKY_STOPS` 五站夜空、`SKY_FOG`、剪影顏色與透明度、補光與環境光）與 `LANTERNS`（四盞燈籠各自的色溫與亮度）；
`js/renderer.js` 的 `BLOOM.threshold`（跟曝光綁在一起，改一個要重看另一個）；
`index.html` 的 `#vignette` 那條 radial-gradient。理由全部寫在 `docs/design/ART_BIBLE.md` §8。

## 7. 下一步

1. **真機試玩**（使用者側）：橫持開 `?fps=1` → 進規則頁截一張圖回報，就補齊了從未回填過的 iPhone fps／draw call。
2. **兩件待裁**（§4.1／§4.2）：A3／A5 兩條零鑑別力的量法要不要改成「只量天空那一段」與「只驗有無疊層」——**我沒有動，等你點頭**。
3. **一件待裁**（§4.3）：對決要不要留一點遠景剪影。
3b. **一件報備**（§4.4）：`tests/tools/creature-preview.html` 我自行改了三行 renderer 設定（不改的話 A6 的尺會壞掉）。覺得不該碰就退這一個檔，其餘不受影響。
4. **剪影只露出上緣一條**：牌桌是俯視，離地 0.85 世界單位以上的東西會跑出畫面，所以現在看到的是天際線的下半截（已把剪影縱向壓扁 0.26～0.34 補救）。真正解「市集沒有東西看」的是**乙卷**（妖怪站上桌），不是再加剪影。
5. bloom 高光在 ACES 下會往白色去飽和（`new-duel1.png` 中央那團），若試玩覺得太白，調 `BLOOM.strength` 或 `ENV.EXPOSURE`，**不要調回手刻映射**。
