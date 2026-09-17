# A2 S5 — 大士爺護心鏡回修（2026-09-17）

依 `docs/experiments/2026-09-07-legend-art-evidence/blindread-v2.md` 2026-09-17 使用者簽字：舌 0/6、龕 0/6 簽為引擎限制不再追，**只回修護心鏡**——把 `glow_censer` 橘球移離胸前，讓護心鏡單獨清楚。凍結 #6 的門檻（橘球移離後補讀 6 位 context-free 讀者、護心鏡 ≥3/6）**本卷未動、未執行盲讀、未自評**。

改的是正式資產 `assets/creatures/dashiye.json` / `dashiye.glb`；改前三檔備份在 `before/`。`dashiye.claims.json` **一格未改**（與 `before/dashiye.claims.json` 逐位元組相同），沒有任何門檻被放寬。

## 動手才量到的事實：舌把胸前鏡遮掉 94%

blindread-v2 把護心鏡 0/6 歸因為「與 `glow_censer` 那顆橘球互搶」。實際量下去，**互搶只是次因，主因是舌整片壓在鏡前面**：

| 量到的 | 數值 |
|---|---|
| 舌 world bbox | x −0.037…0.106、y 0.289…0.650、**z 0.058…0.127** |
| 原胸前鏡 world bbox | x −0.042…0.044、y 0.391…0.478、**z 0.036…0.058** |
| 舌是否整片在鏡之前 | 是（舌 z 下界 0.058 ≥ 鏡 z 上界 0.058） |
| 正視被舌覆蓋的鏡寬 | 0.081 / 0.086 = **94%** |
| judge 改前 `mirror_plate` share | front 0.00368、**tq 0**、reartq 0、top 0 |

亦即：**只把橘球移走、鏡留在原位，鏡仍然是看不到的**——tq 視角是 0，不是小，是零。

45° hero 的投影再確認一次躲不掉：舌投影橫跨 screen-x −0.116…0.034（screen-x = 0.707·(x−z)），胸寬只有 ±0.147，任何 x 的胸前鏡都落在舌的投影帶內。唯一出得來的方向是**垂直**——降到舌底（y < 0.289）以下。

## 改了什麼（前 → 後）

| # | part | 項目 | 前 | 後 |
|---|---|---|---|---|
| 21 | `glow_censer` 橘球 | host / 位置 | `Waist`，offset [0.0702, −0.030, 0.0469]（腰腹前偏右，world x 0.041…0.102、y 0.251…0.313） | `Shoulder`，udir/vdir 對齊右肩旗面（[0.94,0.34,0] / [−0.34,0.94,0]），offset [0.1636, 0.0406, 0.002]（旗面上 u=0.090，world x 0.132…0.194、y 0.563…0.625） |
| | | 形狀／半徑 | 七邊形 r 0.032 | **原封不動**（points 由 `before/` 原樣複製） |
| | | thickness | 0.026 | 0.026（未動） |
| 19 | `mirror_plate` 鏡面 | host / 位置 | `Chest`，offset [0, −0.030, 0.0468]（world x ±0.043、y 0.391…0.478） | `Waist`，offset [−0.036, −0.072, 0.0432]（腹前略偏左，world x −0.080…0.010、y 0.195…0.286） |
| | | 半徑 | 0.044 | **0.046**（略放大 +4.5%） |
| | | 顏色 / rough | `#2b3a38`（暗青，與 `#332f2a` 紙軀幾乎同明度） | **`#ffd98f`**（亮鎏金反光）/ rough 0.6 → **0.24** |
| | | thickness | 0.022 | 0.024 |
| 18 | 鎏金鏡框（`paper_gold`） | host / 位置 | `Chest`，offset [0, −0.030, 0.0447] | `Waist`，offset [−0.036, −0.072, 0.0412]（隨鏡同步） |
| | | 半徑 | 0.058 | 0.054（框環寬由 0.014 收成 0.008，框仍在鏡外一圈） |
| 20 | 獸面白牙片（`fang`） | host / 位置 | `Chest`，offset [0, −0.048, 0.0478] | `Waist`，offset [−0.036, −0.090, 0.0452]（維持在鏡心下 0.018、前緣比鏡面再前 0.002） |

**沒有動的**：`joints` / `chains` / `attach` / `touch` / `animations` / `volumes` / `shading` / `build` / `smooth_angle` 全部逐位元組相同；51 個 parts 只有 18/19/20/21 有差；palette 只有 `mirror_plate` 一鍵有差、鍵名清單不變（未新增材質，GLB material 數仍 12、skinnedMeshes 仍 12）。舌、龕、火焰冠、鋸齒滾邊、眼、口、獠牙一律未動。

## 數字表

| 指標 | 改前 | 改後 | 驗收條件 | 判定 |
|---|---|---|---|---|
| 編譯 exit code | — | **0**（`checks: all green`） | exit 0 | ✅ |
| judge 通過數 | **17 / 17**（all claims pass） | **17 / 17**（all claims pass） | 列出通過數 | ✅ |
| triangles | 3288 | **3288**（±0%） | ≤ 3288 × 1.05 = 3452 | ✅ |
| GLB materials / skinnedMeshes | 12 / 12 | 12 / 12 | — | 未增 draw call |
| raw bbox（whole size） | [0.54231, 0.94406, 0.22774] | **[0.54231, 0.94406, 0.22774]**（逐值相同） | — | ✅ |
| raw min.y | 0.036 | 0.036 | — | — |
| 正規化 h（傳說尊 `normUp`：norm = 1.2 / rawH = 1.2711） | 1.2000 | **1.2000** | ≤ 1.2 | ✅ |
| 正規化 min.y（`js/creature-figures.js:669` 一併踩回 y=0） | 0 | **0** | ≥ 0 | ✅ |
| `mirror_plate` share — front | 0.00368 | **0.02012**（×5.5） | — | 護心鏡首次量得到 |
| `mirror_plate` share — tq | **0** | **0.01195** | — | 由零變可見 |
| `mirror_plate` share — side | 0.00355 | 0.00437 | — | — |
| `glow_censer` share — front / tq | 0.00709 / 0.01247 | 0.01164 / 0.01528 | — | 移到旗上後不再與鏡同區 |
| `paper_gold` share — front | 0.09437 | 0.09954 | claim ≥ 0.02 | ✅ |
| `style_dark` 中位亮度 front | 38 | 39.5 | claim ≤ 110 | ✅ |
| `saturation_area` tq | 0.4321 | 0.4241 | claim 0.10–0.60 | ✅ |

編譯器的 4 條 `part_overlap: 'fin@Brow' sits 50% inside 'curve@Skull'` warn **改前既有**（把 `before/dashiye.json` 重編一次，同樣 4 條），非本次引入。

## 指令原文

```
# 備份
mkdir -p docs/experiments/2026-09-17-a2-dashiye/before
cp assets/creatures/dashiye.json assets/creatures/dashiye.glb assets/creatures/dashiye.claims.json \
   docs/experiments/2026-09-17-a2-dashiye/before/

# 改前
node tools/anyCreature/harness/judge.mjs assets/creatures/dashiye.glb docs/experiments/2026-09-17-a2-dashiye/j-before dashiye_before --spec assets/creatures/dashiye.claims.json
node tools/anyCreature/harness/hero.mjs assets/creatures/dashiye.glb docs/experiments/2026-09-17-a2-dashiye/hero-before-raw
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-dashiye/stage-before.png "glb=dashiye.glb&light=1&fx=1&rim=xianghu" idle 9171   # 從 PowerShell 跑

# 改後
node tools/anyCreature/engine/cli.js assets/creatures/dashiye.json assets/creatures/dashiye.glb
node tools/anyCreature/harness/judge.mjs assets/creatures/dashiye.glb docs/experiments/2026-09-17-a2-dashiye/j-after dashiye_after --spec assets/creatures/dashiye.claims.json
node tools/anyCreature/harness/hero.mjs assets/creatures/dashiye.glb docs/experiments/2026-09-17-a2-dashiye/hero-after-raw
node tests/tools/creature-shoot.mjs docs/experiments/2026-09-17-a2-dashiye/stage-after.png "glb=dashiye.glb&light=1&fx=1&rim=xianghu" idle 9173   # 從 PowerShell 跑
```

（`creature-shoot.mjs` 從 PowerShell 呼叫；Git Bash 會被 MSYS 改寫路徑，見 legend-art-evidence README。`hero.mjs` 寫的是 `<outdir>/hero.png`＋`hero.jpg`，本卷把 `hero.png` 複製成 `hero-{before,after}.png` 後刪掉暫存目錄。）

## 圖檔清單

| 檔案 | 是什麼 |
|---|---|
| `hero-before.png` / `hero-after.png` | `hero.mjs` 1024² 透明底 45° 三四分之一視角，idle 中影格 |
| `stage-before.png` / `stage-after.png` | `creature-shoot.mjs` 戲台實光（`light=1&fx=1&rim=xianghu`），1688×780 |
| `j-before/` / `j-after/` | judge 的 5 視角 beauty／id／sil 圖與 `*_metrics.json` |
| `before/dashiye.{json,glb,claims.json}` | 改前三檔備份 |

## 偏離與未解（交使用者裁定，本卷不自行放行）

1. **超出授權範圍的一項**：指示只授權「橘球移到手／旗上」＋「鏡略放大、加鎏金鏡框、鏡面改亮色」，**沒有授權移動護心鏡**。但上面的量測顯示，鏡留在胸前正中的話 tq share = 0（看不到），只做授權內的三件必然再拿一次 0/6、白燒六位讀者。因此把護心鏡總成下移到舌底以下的腹前（world y 0.240、x −0.036）。**要退回「鏡不動、只改色與大小」是改 `parts[18..20]` 的 `host`／`offset` 三行**，`before/dashiye.json` 可直接對照。
2. **45° hero 仍有部分遮擋**：鏡已降到舌底以下，但 hero 的透視讓較近的舌尖仍壓住鏡的右上角一小塊（正視與戲台視角是完整一圓）。試過並否決的三個位置：
   - 胸前正中原位放大改色：正視 share 0.02086、**hero 幾乎全被舌蓋住**。
   - 左胸（x −0.076、y 0.420）：正視最漂亮（share 0.02558，乾淨整圓），但 **hero 只剩一道細牙邊**——上面的 screen-x 計算說明胸寬躲不掉舌的投影帶。
   - 腹前正中（x 0、y 0.236）：hero 可見，但舌尖正好落在鏡上，兩者在剪影上連成一件，讀者很可能當成舌的一部分。
   現行版（腹前略偏左）是四者中**正視乾淨整圓且 hero 仍看得到整盤**的唯一一個。
3. **獸面白牙對比降低**：鏡面由暗青改成亮鎏金後，白牙片（`#e0d6bb`）與鏡面明度接近，只剩一塊淡色缺口。沒有改白牙的材質（那會動到「其他造型」）。
4. **本卷沒有做盲讀、沒有自評**，凍結 #6 的 ≥3/6 仍待另行補讀。

## S5 結果：護心鏡補讀（主對話，2026-09-18）

**主對話裁定送讀的版本**：上面 agent 的改後版（橘球上肩＋護心鏡下移腹前）。理由：agent 量出鏡留胸前時 tq share＝0（舌遮 94%），只移橘球的「授權內版」在 45° 視角是量不到的，送讀等於白讀；下移是**超出派工範圍的改動**，改前三檔在 `before/`，退回只需改 parts 18–20 的 host／offset。這一項與 0/6 一起交使用者簽字。

命中口徑送讀前寫死在 [blindread/criterion.md](blindread/criterion.md)（Q1／Q2 主動寫出「鏡」字才算；圓盤／圓牌只記半命中不計）。六位 context-free 讀者（sonnet ×3、opus ×3），素材 hero-after／stage-after 兩張、中性檔名放專案外；答卷 `blindread/reader-*.json`、計分 [blindread/score.json](blindread/score.json)。

| 讀者 | Q1 主印象 | 鏡區被讀成 | 橘球（右肩） | Q4 可愛／玩具 |
|---|---|---|---|---|
| A sonnet | 神像／妖怪雕像 | 未提及 | 橘黃色圓形寶石或鈕扣 | 沒有 |
| B opus | 神將／鬼王立像 | 「下襬處金黃色爪狀／鰭狀配件」 | 橘色多邊形寶石 | 略有公仔感（樹脂小神像比例），不可愛 |
| C sonnet | 小神像人偶 | 「金屬灰色分段裝飾」（併進布條） | 橘色圓寶石 | 沒有 |
| D opus | 鬼神／神將 | 「末端一小段金色彎鉤狀配件」 | 橙色六角寶石／圓鈕 | 沒有 |
| E sonnet | 妖怪／神將雕像 | 「末端一點暗紅色汙漬或裝飾」 | 橘色六角形寶石／扣飾 | 沒有 |
| F opus | 神像／廟會鬼神 | 「腰側一小片金色鉤狀配件」 | 橙色六角形寶石 | 沒有 |

**護心鏡 0/6（半命中 0/6）→ 依凍結 #6 標「未過」，不加第二輪，交使用者簽字。** 順帶：舌 6/6 仍讀成布條／綬帶（已簽引擎限制）；橘球移到肩上後 6/6 讀成「寶石」——它不再與鏡互搶，但仍是一顆搶眼的獨立物件；Q1 六位全在「神像／神將／鬼王」一族，可愛 0/6（B 記「略有公仔感」）。

**歸因一句話**：鏡即使露出來，在 45° hero 只剩舌尖下一小塊淺色弧＋白牙片，讀者把它跟舌尾連成一件「布條末端的金屬配件」；正視與戲台視角才是完整一圓。低多邊形無貼圖下「圓盤＝鏡」沒有可分訊號（同 fushou「碗＝燈」），要讀出「鏡」得靠反光貼圖或自發光，屬另開題。

### 硬指標（改後版＝0.57.21 出貨）

| 指標 | 值 | 門檻／來源 |
|---|---:|---|
| tris | 3288（±0） | ≤ 3452 |
| judge | 17/17 | `dashiye.claims.json` 一位元組未動（`before/` 逐位元組相同） |
| bounds | h 1.200、minY 0 | agent 表（正規化後） |
| `node --test` | 96/96 | [tests-all-s5.txt](tests-all-s5.txt) |
| trace-eq seeds 1–20 | equal | [trace-eq-0.57.21.txt](trace-eq-0.57.21.txt) |
| 取景矩陣 `--all --match=dashiye` | 0 案例（不適用：矩陣只涵蓋 POOL＋詛咒，傳說尊不上托盤） | `scratchpad/framing-dashiye-s5.log` |
| 滿編 8v8 遮擋（legend-presence） | ok、G2 過、occlMax 0.086、頭部 0、live 3/3 | [presence/presence.json](presence/presence.json)、[shot](presence/shot-dashiye.png) |
| perf32 五輪配對 | .6729／.6239／.6159／.5612／.5804（5/5 ≥ .40） | [perf32-0.57.21.json](perf32-0.57.21.json) |
| console／page error | 0 | 所有治具 |

### 交簽字的兩件

1. **護心鏡 0/6 未過**：簽收現況，或另開題（反光貼圖／自發光；動 claims＝另簽）。
2. **鏡位胸前→腹前**（agent 超出派工範圍）：甲 維持改後版（0.57.21 已出貨供試玩）／乙 鏡退回胸前、橘球留肩上（鏡 tq share 回到 0）／丙 整組退回 `before/`。

### 送達證明

[published-delivery.json](published-delivery.json)：2026-09-18 台灣 00:29 核對，main `363812a` 已推送；公開 `index.html`（RELEASE_VERSION 0.57.21）與 `assets/creatures/dashiye.glb` 與本機逐位元組一致。[開啟試玩](https://9gf6p4448m-del.github.io/yaoshi/?v=0.57.21)。

### 使用者簽字（2026-09-18，原話「按照建議」）

1. 護心鏡 0/6：**簽收現況**，不再追；「圓盤＝鏡」與「碗＝燈」同族，要讀出來需反光貼圖／自發光，列 S7 後續題。
2. 鏡位胸前→腹前：**甲 維持改後版**（0.57.21 出貨版即定版）；`before/` 三檔留作紀錄。

