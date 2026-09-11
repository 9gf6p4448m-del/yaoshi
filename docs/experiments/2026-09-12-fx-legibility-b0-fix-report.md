# 招式可辨性卷 v0.55 批 0 — 覆審 r1 findings 修補報告（2026-09-12）

> 覆審報告＝`scratchpad/review-legibility-b0-r1.md`（5 CRITICAL／5 HIGH／6 MEDIUM／4 LOW）。
> 本檔只記**修補**；批 0 原報告 `2026-09-12-fx-legibility-b0-report.md` 與凍結檔
> `2026-09-11-acceptance-fx-legibility.md` **一字未改**（門檻、案例集、幀位、seed 規格全部不動）。
> 修補範圍＝「不需使用者裁定」那些；C3／C4／M2／M4／M5、`ICON.size` 的 0.44 這個數字本身、
> 刀／印／帽剪影回修**不在本批**（全部是使用者裁定項，見 §4）。

- **起點 SHA**：`88ad10c`（分支 `worktree-agent-ae35c60b976f8dca0`，基準 main `6a839de`）
- **終點 SHA**：見本檔最末（收尾時填）
- 工作樹：`.claude/worktrees/agent-ae35c60b976f8dca0`，未動主 repo

---

## 1. 逐項三態

| # | findings | 三態 | 證據（檔案:行號／指令＋輸出） |
|---|---|---|---|
| **C1** | 尺寸單一事實來源 | **真的修好** | 見 §2.1 |
| **C2** | `ICON.size=0.44` 沒有 L3 證據 | **真的量出來了（結論交使用者裁）** | 見 §2.2 |
| **H3** | L3 沒量在條文指定的位置 | **部分修好（治具棚已對齊產品；`duel-drive` 那一格仍是批 1–3）** | 見 §2.2 |
| **H4** | `bloomCfg()` 是第二份複製品＋檔頭「保守」宣稱 | **真的修好** | 見 §2.3 |
| **H5** | L10 整條未跑 | **真的修好（跑起來了）；但 L10 條文本身在基準上就不成立** | 見 §2.4 |
| **C5-③** | 剪影互撞機械檢查 | **做出來了，但校準失敗（負結果照實記錄）** | 見 §2.5 |
| **M1** | L2 的 react 在 solo 時量出招方自己 | **真的修好** | 見 §2.6 |
| **M3** | program 數不是量測 | **真的修好** | 見 §2.7 |
| **M6** | 評分腳本不能照原樣重跑 | **真的修好** | 見 §2.8 |
| **H1** | L5／B0-8 對本批零鑑別力 | **真的修好（定位寫明＋補上有鑑別力的替代證據）** | 見 §2.9 |
| **LOW1** | `--mutate=1` 的數字寫錯 | **真的修好** | 見 §2.10 |
| **LOW2** | tier 2 `maxRate` 口徑 | **真的修好** | 見 §2.10 |
| **LOW3** | 逐函式 md5 驗法收進 repo | **真的修好** | 見 §2.10 |

---

## 2. 逐項細節

### 2.1 C1　尺寸收斂成單一事實來源（commit `a47de34`）

**病灶**：四支示範招各自寫死 `const SZ`，`ICON.size` 對它們是死碼 ⇒ 凍結檔 L3 指名的
「`ICON.size` 改 0.02 必須紅」實測**逐位數不變**＝恆綠的儀式。

**改法**（數值一字未改，只是搬家）：

- `js/trait-fx/vocab.js:48-68`　`ICON` 加 `byKind`（`knife:0.56／bell:0.46／seal:0.62／hat:0.40`）、
  `flatByKind`（`hat:0.20`）與 `sizeOf(kind)`／`flatSizeOf(kind)`。
- `js/trait-fx.js:489`（`icon()`）／`:525`（`icons()`）預設尺寸改走 `ICON.sizeOf`／`ICON.flatSizeOf`；
  `js/trait-fx.js:483-487` 新增 `st.iconSize`／`st.iconFlatSize`。
- 四支示範招刪掉 `SZ` 字面值（`zuling.js` 獻祭刀、`xianghuo.js` 千里眼／虎爺印、`yinqi.js` 魔神仔）。
- `tests/fxvocab.test.mjs` 新增三條：`sizeOf` 表行為、文件 §5 覆寫表對齊、
  **「編舞檔不得出現尺寸字面值」掃描**（分母＝`js/trait-fx/` 下除 `vocab.js` 外的**全部** .js，目前 4 個；
  規則是 `size: <數字>` 與 `const SZ|SIZE = <數字>` 兩條路，不是只盯那四支招 ——`02 §6.1` 第 7 條）。
- `docs/experiments/2026-09-11-fx-vocab.md` §5 補覆寫表（L12 的文件↔程式對齊測試在釘它）。

**把修正拿掉會紅的證據**：

```
node tests/fxvocab.test.mjs            → 14 綠 ／ 0 紅   exit 0
node tests/fxvocab.test.mjs --mutate=1 → 10 綠 ／ 4 紅   exit 1
node tests/fxvocab.test.mjs --mutate=2 → 13 綠 ／ 1 紅   exit 1
node tests/fxvocab.test.mjs --mutate=3 → 13 綠 ／ 1 紅   exit 1
node tests/fxvocab.test.mjs --mutate=4 → 13 綠 ／ 1 紅   exit 1
   FAIL 編舞檔不得出現徽記尺寸字面值 — 編舞裡有尺寸字面值 1 處：zuling.js:413 SZ = 0
```
（`--mutate=4` 在**記憶體裡**把 `const SZ = 0.56;` 塞回 `zuling.js`，原檔全程唯讀，不做反向 sed。）

**L3 canary（單一來源突變 → 四支必須紅）**：把 `ICON.sizeOf()` 改成固定回 `0.02`（一行、一個檔）。

| 量測位置 | 招 | 現值 | canary | 判定 |
|---|---|---|---|---|
| **舊**（720×405／bloom 0.5） | eliteSelfCut | 1.189% ／ ΔE 63.35 | **0.0689% ／ 54.42** | `ok:false` |
| | wardImmuneLost | 2.2795% ／ 109.5 | **0.0806% ／ 20.51** | `ok:false` |
| | biteGamble | 2.4174% ／ 65.03 | **0.0000% ／ 0.00** | `ok:false` |
| | hauntLost | 2.6241% ／ 82.02 | **0.0765% ／ 32.83** | `ok:false` |
| | 總表 | `pass 4` | **`pass 0`、failed 四支全列** | |

★**現值那一欄與批 0 報告 B0-7 逐位數相同**★（1.189/63.35、2.2795/109.5、2.4174/65.03、2.6241/82.02）
——證明 C1 只是搬家，沒有改行為。對照：覆審 r1 照凍結檔字面只改 `ICON.size=0.02` 時是 `pass 4`（0/4 紅）。

證據目錄 `docs/experiments/2026-09-12-fx-legibility-b0-fix-evidence/l3/l3-old-current/`、`…/l3-old-canary/`。

### 2.2 C2＋H3　L3 的量測位置與 `ICON.size=0.44` 的實測（commit `3f641dc`）

**改法**（`tests/tools/fx-contrast.mjs`、`tests/tools/traitfx-preview.html`）：

- 視口 `720×405` → **`844×390` ＋ `deviceScaleFactor 2`**（理由與 `blindread-sheet.mjs` 同一條：
  `js/duel-figures.js` 的人偶是固定 CSS 像素高，治具視口 ≠ 玩家視口就會量錯佔比）。
- 治具 bloom 五個參數逐一對齊產品 `js/renderer.js:34` 的 `BLOOM`（threshold `0.5`→**`0.7`**）。
- **seed 記進 `shots.json`**（治具頁新增 `?seed=`、`__tfx.seed`，預設 7）。
- `shots.json` 另記 `productBloom`／`bthrOverride`／`programs`／`matPrograms`。

**★改視口會改 `area_pct` 的絕對值，新舊不可跨視口比對★**（門檻是「佔全畫面的百分比」）。

**三組數字（全部在新量測位置：844×390@2x、bloom 0.7、seed 7）**：

| 招 | ① 現值（`byKind` 0.56/0.46/0.62/0.40） | ② 四支全走 `ICON.size` 預設 **0.44** | ③ canary（`sizeOf`→0.02） |
|---|---|---|---|
| eliteSelfCut 獻祭刀 | **0.9728%** ／ ΔE 63.35 ✅ | **0.6629%** ／ 63.35 ❌ | 0.0595% ／ 54.12 ❌ |
| wardImmuneLost 千里眼 | **1.2210%** ／ 107.27 ✅ | **1.1411%** ／ 106.39 ✅ | 0.0507% ／ 84.85 ❌ |
| biteGamble 虎爺印 | **1.9519%** ／ 64.53 ✅ | **0.7799%** ／ 64.53 ❌ | 0.0012% ／ 47.02 ❌ |
| hauntLost 魔神仔 | **2.1682%** ／ 82.02 ✅ | **2.5201%** ／ 82.02 ✅ | 0.0623% ／ 32.83 ❌ |
| 總表 | `pass 4` | **`pass 2`，failed `eliteSelfCut`／`biteGamble`** | `pass 0`，四支全 failed |

★**這是要交使用者裁的那件事**★：使用者簽准的 `ICON.size` 預設 **0.44**，在**產品的量測位置**上
讓四支示範招裡的**兩支跌破 L3 的 0.8% 門檻**（0.6629％、0.7799％）。
批 1–3 的另外 23 支若照預設走，用的就是這個值。
**本批不動 0.44**（`02 §2.1`：那是使用者簽的數字，動它＝移動及格線）；餘裕多少、要不要調，交使用者裁。
現值那一組之所以全過，是因為四支示範招各自用了 0.40–0.62 的**逐招覆寫**——那不是預設值的證據。

**本批 L3 量在治具棚**（`traitfx-preview.html`，bloom／視口已對齊產品），
**不是凍結檔 L3 指定的 `duel-drive` 真實對決場景**；那一格是批 1–3 的正式 L3（H3 只修好一半，照實記）。

**決定性**：同參數連跑兩次，`fx-contrast-metrics.py` 的輸出**逐位元組相同**，
四張 `-A.png` 的 md5 也相同（`l3-new-current` vs `l3-new-current-2`）。

證據 `…-fix-evidence/l3/{l3-new-current,l3-new-size044,l3-new-canary}/metrics.txt`。

### 2.3 H4　`bloomCfg()` 改讀 live ＋ 刪掉沒有實測支持的「保守」宣稱（commit `3f641dc`）

- `traitfx-preview.html` 的 `bloomCfg()` 由**寫死字面值**改成
  `Object.assign({ on: true }, bloom.cfg, { edge: bloom.edgeOn })`——`bloom.cfg` 是 `createBloom()`
  內部真正拿去建 uniform 的那個物件，`edgeOn` 是 getter。
- `fx-contrast.mjs` 新增**量測位置守衛**：解析 `js/renderer.js` 的 `BLOOM` 字面值，
  與治具頁回報的 live `bloomCfg()` 逐鍵比對，分岔就 `throw`（帶 `--bthr=` 的反向實驗才放行）。
- 檔頭那段「門檻低＝保守」刪掉，改寫成**雙向實測數字**。

**把修正拿掉會紅的三個證據**：

```
# ① bloomCfg 真的讀 live（改真值它要跟著變）
node tests/tools/fx-contrast.mjs … --bthr=0.9 --only=wardImmuneLost
→ summary 的 "bloom": {... "threshold": 0.9 ...}          （舊版恆回 0.5）

# ② 覆寫真的進到 shader（不是只改了回報欄位）
--bthr=0.3 → wardImmuneLost area_pct 1.2210% → 2.2846%    （同一招、同一格）

# ③ 守衛真的會擋：把治具頁的 bloom threshold 故意改成 0.5 再跑
Error: 治具 bloom 與產品 js/renderer.js 的 BLOOM 分岔：threshold 治具 0.5 vs 產品 0.7
   at shoot (tests/tools/fx-contrast.mjs:120:13)
還原後同一條指令通過。
```
證據 `…-fix-evidence/l3/{l3-bthr09,l3-bthr03}/metrics.txt`。

### 2.4 H5　L10 跑起來了（commit `a7d1cc6`）——但 L10 的條文在基準上就不成立

**改法**：`tests/tools/dmg-readability.mjs:27-33` 與 `tests/tools/closeup-drive.mjs:26-32`
補第二段 playwright 候選路徑（照 `fx-contrast.mjs:44-48` 的寫法）。改前在 worktree 直接 `MODULE_NOT_FOUND`。

**鑑別力（怎麼知道不是本批弄壞的）**：把整棵基準樹取出來跑同一組指令——
`git archive 6a839de | tar -x -C scratchpad/fix-r1/base6a839de`（取出的 `index.html` md5
`cae859bf91ea11f45fa9367ffc24ca10`，與工作樹相同），用 `--root=` 指過去。逐跑對照。

**結果（完整表在 `…-fix-evidence/l10/README.md`，15 次實跑）**：

| 條 | 本批 | 基準 `6a839de` | 判讀 |
|---|---|---|---|
| **R1**（字級／分類／色相） | 🟢 全綠 | 🟢 全綠 | **決定性**：九跑的字級全是 hit 27.2px(1.60×)／kill 35.36px(2.08×)／unit 17px，`fontBad=kindBad=hueBad=0` |
| **R2** seed 1（duels=8） | 🔴（6.18／6.37） | 🔴（5.75） | **基準本來就過不了**，不是本批弄壞的 |
| **R2** seed 3（duels=8） | 🔴（0 可判樣本，fail-closed） | 🔴（同上） | 無資訊 |
| **R2** seed 3（duels=20，各連跑 5 次） | 🟢2／🔴3 | 🟢4／🔴1 | **兩樹都忽紅忽綠**，見下 |
| `closeup-judge` P 系列 | nullCount **21**；P1🟢 P2🔴 P3🟢 P4🔴 P5🔴 P7🟢 | nullCount **22**；**逐項相同** | 沒有退步（null 數還少 1） |

**`02 §6.2` 的處置**：R2 在 seed 3 上固定條件各連跑 5 次，本批 2 綠 3 紅、基準 4 綠 1 紅——
**基準自己也翻過一次**。波動來源落在**量測那一側**：同樣的 seed 與 duels，可判樣本數逐跑不同
（`maskN` 10–12、`maskDropped.moved` 逐跑不同），也就是「這一跑抽到哪幾次閃紅」本身就在變。
依 `02 §6.2`，**這個訊號目前不可信**——不得拿它宣告「本批讓 R2 退步」，也不得拿它宣告「沒退步」。
（要判得動，得先讓治具的取樣變決定性，那是 `dmg-readability` 本身的工作，不在本批範圍。）

**★L10 的條文本身在基準上就不成立★**：凍結檔寫「R1／R2 **維持綠**」「`closeup-judge` P 系列 null 數**必須 0**」，
但基準 `6a839de` 的 R2 在 seed 1 是紅的、`closeup-judge` 的 nullCount 是 **22**。
這條閘門要重新校準（或改寫成「與基準同 seeds 比對、不得變差」），否則批 1–3 每批都會撞同一面牆。
**這是要交使用者裁的第三件事。**

### 2.5 C5-③　剪影互撞的機械檢查（commit `a7d1cc6`）——**做出來了，但校準失敗**

覆審要求「把剪影互撞寫成機械檢查，門檻**用實測定**：六位讀者已知互撞的三組必須判紅、
`bell` 對本系其餘 kind 必須判綠」。**這個校準做不到**，而且不是差一點——照實記在測試與工具檔頭裡。

**量法**（`tests/tools/emblem-sim.mjs`）：低解析度（12×12）灰階 IoU、面積歸一（保留長寬比）、質心對齊。
直接載入 `js/trait-fx/emblems.js`（把 `import * as THREE` 換成空物件、以 `data:` URL 動態載入），
不另抄一份頂點表；系別從 `vocab.js` 的 `EMBLEM_OF` 分段註解讀。

**校準實測**（435 對，相似度由高到低排名）：

| 人眼互撞（必須紅） | IoU | 排名 | | `bell` 同系（必須綠） | IoU | 排名 |
|---|---|---|---|---|---|---|
| `knife`~`blade` 獻祭刀→王爺劍 | 0.5000 | 第 **227** | | `bell`~`lamp` | **0.8352** | 第 **4** |
| `seal`~`tornflag` 虎爺印→破軍旗 | 0.3784 | 第 **337** | | `boat`~`bell` | 0.7692 | 第 32 |
| `seal`~`chair` 虎爺印→椅仔姑竹椅 | 0.3275 | 第 **374** | | `bell`~`seal` | 0.7444 | 第 46 |
| `hat`~`wave` 紅帽→拼板舟 | 0.4247 | 第 **292** | | `bell`~`talis` | 0.6526 | 第 110 |
| `hat`~`banner5` 紅帽→五營旗 | 0.4864 | 第 **241** | | 其餘四對 | 0.39–0.41 | 308–328 |

⇒ 要讓五組人眼互撞判紅，門檻必須 ≤0.3275；那會讓 `bell` 的**八對同系全部**判紅。**無解。**

不是只有一種量法失敗：

- **Hu moments**（旋轉不變）更差：五組落在第 **193／282／305／233／217** 名，`bell~lamp` 第 15 名。
- **IoU × 三種歸一（面積／RMS／bbox）× 七種解析度（6/8/10/12/16/24/48）× {IoU, NCC}＝28 組設定**全掃過，
  `min(人眼互撞) − max(bell 同系)` 落在 **−0.358 ～ −0.630**，沒有一組可分。

**所以這支測試的紅不等於「讀者會認錯」**（寫進檔頭與 GUIDE §11.29 第 13 條），
不得拿它的綠去宣稱剪影不會互撞——人眼閘門仍然是 L4 盲讀。它實際守的是
「同系有沒有**新的**幾何近似冒出來」，以及「量法本身有沒有鑑別力」：

```
node tests/emblem-collision.test.mjs             → 7 綠 ／ 0 紅  exit 0
  ① 自我對照＝1.0（30/30）                      活性
  ② 自我擾動放大 1.5 倍 全部 ≤0.50              死性（度量對形狀有反應，不是恆 1）
  ③ 相似度有動態範圍（最小 0.1737、最大 0.9290）
  ④ bolt~seal ≤0.60（實測 0.4787）
  ⑤ 校準記錄：min(人眼互撞) < max(bell 同系) ← 關係翻轉就判紅，逼記錄跟著更新
  ⑥ 同系 ≥0.80 必須在 KNOWN_DEBT 清單裡
  ⑦ KNOWN_DEBT 不得有死條目（修好就要刪，防豁免長住）
node tests/emblem-collision.test.mjs --mutate=1  → 5 綠 ／ 2 紅  exit 1
  （記憶體裡把 lamp 的頂點換成 talis：⑥「新的同系互撞 talis~lamp=1」⑦「bell~lamp 已不超標」雙紅）
```

**目前 IoU ≥0.80 的全部紅配對 16 對**（批 1 前置回修的材料；**本批不改任何剪影設計**）：

| # | IoU | 配對 | 系 |
|---|---|---|---|
| 1 | 0.9290 | `bell` 千里眼銅鈴 ~ `shade` 過陰咒 | 跨系 xianghuo/yinqi |
| 2 | 0.8698 | `urn` 飼鬼甕 ~ `drop` 黃色小雨衣 | **同系 yinqi** |
| 3 | 0.8480 | `crag` 山神庇佑 ~ `urn` 飼鬼甕 | 跨系 zuling/yinqi |
| 4 | 0.8352 | `bell` 千里眼銅鈴 ~ `lamp` 福壽綿長 | **同系 xianghuo** |
| 5 | 0.8333 | `rhomb` 百步蛇紋盾 ~ `talis` 香灰符 | 跨系 zuling/xianghuo |
| 6 | 0.8258 | `lamp` 福壽綿長 ~ `shade` 過陰咒 | 跨系 xianghuo/yinqi |
| 7 | 0.8202 | `talis` 香灰符 ~ `tablet` 有應公 | 跨系 xianghuo/legend |
| 8 | 0.8182 | `bead` 巴冷珠鍊 ~ `drop` 黃色小雨衣 | 跨系 zuling/yinqi |
| 9 | 0.8161 | `bead` 巴冷珠鍊 ~ `urn` 飼鬼甕 | 跨系 zuling/yinqi |
| 10 | 0.8136 | `bead` 巴冷珠鍊 ~ `sundisc` 殘日 | 跨系 zuling/legend |
| 11 | 0.8118 | `seal` 虎爺印 ~ `urn` 飼鬼甕 | 跨系 xianghuo/yinqi |
| 12 | 0.8068 | `bell` 千里眼銅鈴 ~ `urn` 飼鬼甕 | 跨系 xianghuo/yinqi |
| 13 | 0.8034 | `crag` 山神庇佑 ~ `sundisc` 殘日 | 跨系 zuling/legend |
| 14 | 0.8011 | `sun` 射日神弓 ~ `sundisc` 殘日 | 跨系 zuling/legend |
| 15 | 0.8000 | `knife` 獻祭刀 ~ `tablet` 有應公 | 跨系 zuling/legend |
| 16 | 0.8000 | `drop` 黃色小雨衣 ~ `shade` 過陰咒 | **同系 yinqi** |

★注意這張表**沒有**包含六位讀者真正認錯的那五組★——那正是校準失敗的意思。
全表 435 對落檔 `…-fix-evidence/emblem-sim.json`／`emblem-sim-all.txt`。

### 2.6 M1　L2 的 react 在 solo 時量出招方自己（commit `74e0ebc`）

`js/trait-fx.js` 的 `evalPhases` 註解②明寫「場上只有他一個人時就量他自己」（不這樣寫這條會恆假），
但凍結檔 L2 的假綠清單要求「增益招的 react 量在**受益方**身上」。治具的獻祭刀是 `count=1`。

**改法**：`tests/tools/traitfx-drive.mjs` 的 `verdict` 加 `reactSolo`（來自 `sig.phaseDetail` 的 `react.solo`），
`summary` 加 `soloReact` 清單，收尾印
「★M1 未在條文情境下驗證（react 量在出招方自己身上，場上只有他一個人）：…」＋
「自益招要量在受益方身上，請另跑一次 `--only=<trId> --count=2`」。

治具結構**做得到** `count≥2`（`--count` 是既有旗標），所以除了標註之外另跑一次證明 react 真的會換對象：

```
# POOL 的原始名冊（count=1）
node tests/tools/traitfx-drive.mjs … --tier=2
  eliteSelfCut  reactSolo=true   react={"ok":true,"model":0.0566,"solo":true}   ← 量的是鹿自己的收勢
  收尾印：★M1 未在條文情境下驗證（…）：eliteSelfCut

# 加一個隊友（count=2）＝條文要的情境
node tests/tools/traitfx-drive.mjs … --tier=2 --only=eliteSelfCut --count=2
  eliteSelfCut  reactSolo=false  react={"ok":true,"model":0.0416,"solo":false}  ← 量在受益方身上
  summary.soloReact = []          1/1 pass
```

★`solo` 從 `true` 翻成 `false` 且 react 仍然 `ok`（0.0416 ≥ `PHASE_GATE.reactDelta` 0.03）★——
自益招的 react 在**條文指定的情境**下也成立，不是靠 solo 那條退路過的。
三個 tier 的 `summary.soloReact`：tier 1 `["eliteSelfCut"]`、tier 2 `["eliteSelfCut"]`、tier 3 `[]`
（27＋3 套裡只有這一支是 solo）。

### 2.7 M3　program 數改成實測（commit `74e0ebc`）

**病灶**：`js/trait-fx.js:752` 的 `matTemplates: 3` 是寫死字面值，而報告拿
「三個 tier `programsGrew` 全 0」當「program 仍 2 支」的證據——`programsGrew=0` 在 2 支與 3 支下**都**成立
（暖身物件在取樣前就把兩支都預熱掉了），那是推理不是量測。

**改法**：
- `js/trait-fx.js:125-126`　新增 `MAT_TEMPLATES = [['MAT_GLOW',…],['MAT_LINE',…],['MAT_SOLID',…]]`；
- `matTemplates` 改成 `MAT_TEMPLATES.length`（數陣列，不寫死數字）；
- 新增 `matPrograms(renderer)`：回報三支模板**實際拿到的 program id**
  （`renderer.properties.get(mat).currentProgram.id`），拿不到就回 `null`（**不給預設值**——
  `null` 是「沒量到」，不是「2」）；
- 治具 `__tfx.matPrograms()` → `fx-contrast` 寫進 `shots.json` → `metrics` 印 `mat_programs`。

**實測值**（`…-fix-evidence/l3/l3-final/metrics.txt`）：

```
"mat_programs": {"templates": 3, "measured": 3, "distinct": 2,
                 "rows": [{"name":"MAT_GLOW","program":13},
                          {"name":"MAT_LINE","program":14},
                          {"name":"MAT_SOLID","program":13}]}
```

★`MAT_SOLID` 與 `MAT_GLOW` 拿到**同一支 program（id 13）**，三支模板共佔 **2 支 program**★——
原本「從 cacheKey 規則推出來」的結論**是對的**，但現在它是量出來的。
凍結檔 Q10 預期的「program **2→3**」**沒有發生**（實測仍是 2），不必為它付錢。
（`"programs": 19` 是整個治具場景的 program 總數，不是 trait-fx 的貢獻，別把兩個數字混在一起讀。）

### 2.8 M6　L4-pre 評分腳本可以就地跑（commit `74e0ebc`）

**病灶**：`l4pre-r1/score.mjs` 讀的是 `l4pre-mapping-HIDDEN.json`／`reader-A.json`，
但目錄裡的檔名是 `r1-*`；`ev` 那條相對路徑也多疊了一層 `docs/experiments/`；r2／r3 沒有腳本。

**改法**：三個目錄各放一份**逐字相同**的 `score.mjs`，輪次由所在目錄名（`l4pre-rN`）推出，
讀 `rN-shuffle-mapping-HIDDEN.json`／`rN-reader-{A,B}.json`，寫回 `rN-score.json`。
判定仍用凍結檔 L4-pre 的**原文對照組**（修訂二與其勘誤改的是「哪幾格算數」，那份重算在批 0 報告 §9，不動本檔——
否則三輪的原始評分就不可比了）。

**把修正拿掉會紅的證據**（重跑必須與 committed 的逐格相同）：

```
node docs/experiments/2026-09-12-fx-legibility-b0-evidence/l4pre-r1/score.mjs
node …/l4pre-r2/score.mjs
node …/l4pre-r3/score.mjs
→ 三份 rN-score.json 與 committed 的那份 **逐位元組相同**（diff 無輸出）
   r1 d1ok=false d2ok=true valid=false ／ r2 同 ／ r3 同
```
（改前：`node l4pre-r1/score.mjs` 直接 `ENOENT: l4pre-mapping-HIDDEN.json`。）
逐輪的輸出另存 `rN-score.txt`。

### 2.9 H1　L5／B0-8 對本批的定位，以及有鑑別力的替代證據（commit `74e0ebc`）

**定位（照實寫進批 1–3 的起點）**：`tests/tools/load.mjs:5-6` 只抽 `index.html` 的第一個 `<script>`
在 node 裡跑，**完全不載入 `js/`**。本批 `index.html` 零 diff
（工作樹與 `git archive 6a839de` 取出的 index.html md5 同為 `cae859bf91ea11f45fa9367ffc24ca10`）
⇒ B0-1 的「`trace(1..20)` 逐位元組相等」與 B0-8 的九套規則測試，對本批的改動**恆真**，
證明的只是 B0-9（`index.html` 零 diff）已經證明過的事。它們是**回歸護欄**，不是本批的獨立證據。
`--mutate` 有鑑別力，但只對 `index.html` 裡的引擎差異。

**替代證據（做到了）**：`traitfx-drive --sigdump=<檔>` 把每套的簽章正規化成一行
（`trId / tier / ms / bones / meshes / target / phases(+solo) / acts / horizon / maxRate`），
批 1–3 直接 `diff` 兩份 dump 就知道**哪一套的演出真的變了**——那才是對 `js/trait-fx*` 有鑑別力的等價證據。
實跑輸出見 §3 驗收 6。

### 2.10 LOW1／LOW2／LOW3

- **LOW1**（`--mutate=1` 的數字）：批 0 報告寫「7 綠／3 紅」，總數對不上 11。
  **修補後的正確數字（本檔為準）**：健康態 **14 綠／0 紅**；`--mutate=1` **10 綠／4 紅**、
  `--mutate=2` **13 綠／1 紅**、`--mutate=3` **13 綠／1 紅**、`--mutate=4` **13 綠／1 紅**，四個都 `exit 1`。
  （綠的總數從 11 變 14 是本批新增三條測試；`--mutate=1` 多一條紅是因為它把 `EMBLEM_OF.eliteSelfCut`
  改成 `sun`，`knife` 於是不在 `EMBLEM_OF` 裡了，新的 `ICON.byKind` 一致性檢查跟著紅——那是真的破了。）
- **LOW2**（tier 2 `maxRate` 2.1429 的口徑）：**不是違規**。`rateOK`（`maxRate ≤1.0`）依
  `traitfx-drive.mjs:164-172` 的設計**只對 tier 1 與 tier 3 納入 pass**；tier 2 的完整版在滿編錯開時
  本來就會被 `run.rate` 等比加速（v0.53 既有行為，rateMax 2.2），tier 2 只把 `maxRate` 印出來當記錄。
  凍結檔 L6 也只要求 tier 1。正確寫法是「tier 1 `maxRate` 1.000；**tier 2 的 2.1429 是記錄項、不進判定**」，
  不能寫成或被讀成「三個 tier 都 ≤1」。
- **LOW3**（逐函式 md5 驗法收進 repo）：新增 `tests/tools/fn-hash.mjs`
  （`node tests/tools/fn-hash.mjs <舊 ref> [新 ref|WORKTREE] [檔案…]`，`--allow=` 明列預期變動）。
  把系別檔切成 `MOVES:<trId>`／`SHORT:<trId>` 區塊各算 md5；**比對前一律把 CRLF 收成 LF**
  （git blob 是 LF、Windows checkout 可能是 CRLF，不正規化會把每一支都誤判成變動）。
  同一段驗法寫進 `docs/IMPLEMENTATION_GUIDE.md` §11.29 第 12 條。

---

## 3. 驗收 1–8 逐條

### 驗收 1　`fxvocab` 全綠、四個突變各 1 紅、尺寸掃描健康態 0 命中 —— **綠**

```
node tests/fxvocab.test.mjs            → 14 綠 ／ 0 紅  exit 0
  PASS  編舞檔不得出現徽記尺寸字面值（尺寸只能來自 vocab.js 的 ICON）   ← 健康態 0 命中
node tests/fxvocab.test.mjs --mutate=1 → 10 綠 ／ 4 紅  exit 1
node tests/fxvocab.test.mjs --mutate=2 → 13 綠 ／ 1 紅  exit 1
node tests/fxvocab.test.mjs --mutate=3 → 13 綠 ／ 1 紅  exit 1
node tests/fxvocab.test.mjs --mutate=4 → 13 綠 ／ 1 紅  exit 1
```

### 驗收 2　L3 canary ＋ 三組數字 —— **綠**

見 §2.1 與 §2.2 的兩張表。要點：
舊量測位置的現值**與 B0-7 逐位數相同**；canary（`sizeOf`→0.02）在**新舊兩個量測位置**都是 `pass 0`、四支全 `ok:false`；
新量測位置三組數字（現值／0.44／canary）已貼出，`ICON.size=0.44` 讓兩支跌破門檻（交使用者裁，本批不動它）。

### 驗收 3　`bloomCfg()` 讀 live —— **綠**

`--bthr=0.9` → `summary.bloom.threshold` 回 **0.9**（舊版恆回 0.5）；
`--bthr=0.3` → 面積由 1.2210% 變 **2.2846%**（覆寫真的進到 shader）；
把治具 threshold 故意改 0.5 → 守衛 `throw`，還原後通過。詳見 §2.3。

### 驗收 5　剪影互撞測試 —— **黃（測試做出來了，校準做不到）**

三對已知互撞**判不了紅**、`bell` 本系**判不了綠**——不是實作沒做，是**純幾何量不到人眼**（28 組設定全掃過）。
全部紅配對 16 對已列（§2.5）。這條的處置與「刀／印／帽回修」一樣，要交使用者裁。

### 驗收 4　L10 實跑輸出 —— **黃（跑起來了；R2 綠與 null 數 0 都達不到，且基準也達不到）**

見 §2.4。R1 兩樹全綠且決定性；R2 seed 1 兩樹皆紅（基準 5.75）；R2 seed 3 兩樹都忽紅忽綠（`02 §6.2`：訊號不可信）；
`closeup-judge` nullCount 本批 **21**、基準 **22**，P 系列逐項與基準相同。

### 驗收 6　等價與回歸 —— **綠**

```
# trace-eq（基準用 git show 6a839de 取檔）
node tests/tools/trace-eq.mjs scratchpad/fix-r1/base-6a839de.html index.html
  {"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}                    exit 0
node tests/tools/trace-eq.mjs scratchpad/fix-r1/base-6a839de.html index.html --beats
  {"mode":"beats","bytesOld":540776,"bytesNew":540776,"equal":true,"injected":true,
   "verdict":"拍序列逐位元組相等 ✅"}                                                     exit 0
node tests/tools/trace-eq.mjs index.html --mutate
  {"mode":"mutate","mutation":"CFG.ROUNDS 12 -> 11","differs":true,
   "verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}                                      exit 0
  ★注意：`trace-eq` 沒有 `--fxtier` 模式★——凍結檔的「`?fxtier=0` 也相等」是由
  `duel-drive …&fxtier=0` 那一跑承擔的（見下）。H1 已寫明這兩條對本批恆真。

# traitfx-drive 三個 tier（與批 0 報告 B0-2/B0-3 同結果）
--tier=1 → 27/27 pass · 重複簽章 0 · F10 動作數 5–30（全部 ≥2）
--tier=2 → 30/30 pass · 重複簽章 0
--tier=3 → 3/3  pass · 重複簽章 0
三份都另存 sig 序列（--sigdump），落檔 …-fix-evidence/gates/sig-t{1,2,3}.txt

# M1 的條文情境
--tier=2 --only=eliteSelfCut --count=2 → 1/1 pass · reactSolo=false · soloReact=[]

# duel-drive 4 場（seed 7）＋ ?fxtier=0 4 場
兩份都 errors 0、ys3d true、burn 6／trait 4／traitFig 4（與 B0-5 逐欄相同）

# 九套規則測試＋fxtier＋fxvocab＋新的 emblem-collision（全部 node 端，exit 0）
review 28／nightrules 16／duel-desync 7／lineup-order 8／legend 32／aistake 8／
conscap 5／roles-balance 32／wish16 36／fxtier 14／fxvocab 14／emblem-collision 7　全部 0 紅
```

### 驗收 7　逐函式 md5 —— **綠**

```
node tests/tools/fn-hash.mjs abe2f69 WORKTREE
逐函式 md5：abe2f69 → WORKTREE（3 檔）
未變動：53 ／ 變動：4 ／ 新增：0 ／ 消失：0
  CHANGED js/trait-fx/zuling.js   MOVES:eliteSelfCut     fa5f4e5be4 -> 38ac0ec897
  CHANGED js/trait-fx/xianghuo.js MOVES:wardImmuneLost   aa5704a387 -> 4d32f438ed
  CHANGED js/trait-fx/xianghuo.js MOVES:biteGamble       2cb6f1130a -> e4bb5613c0
  CHANGED js/trait-fx/yinqi.js    MOVES:hauntLost        f1a5ccb516 -> bbbf74789d
```
★另外 23 支（含全部 `SHORT`／`ALIAS`）53 個區塊位元組完全相同★。四支示範招的**完整 diff**（`git diff abe2f69`）：

```
-    const SZ = 0.46;
-    const bell = st.icon(st.kind, src, { size: SZ, color: C.key, inkColor: C.ink, opacity: 0 });
+    const bell = st.icon(st.kind, src, { color: C.key, inkColor: C.ink, opacity: 0 });
-      bell.scale.setScalar(SZ * (0.4 + 0.6 * e));
+      bell.scale.setScalar(st.iconSize * (0.4 + 0.6 * e));
-    const SZ = 0.62;
-    const seal = st.icon(st.kind, start, { size: SZ, color: C.hot, inkColor: C.ink, opacity: 0 });
+    const seal = st.icon(st.kind, start, { color: C.hot, inkColor: C.ink, opacity: 0 });
-        seal.scale.setScalar(SZ * (0.35 + 0.75 * e)); // 過衝一點再收，印才有「蓋下來」的重量
+        seal.scale.setScalar(st.iconSize * (0.35 + 0.75 * e)); // 過衝一點再收，印才有「蓋下來」的重量
-    const SZ = 0.40;
-      return { f, from, to, mesh: st.icon(st.kind, from, { size: SZ, color: C.hot, inkColor: C.ink, opacity: 0 }) };
+      return { f, from, to, mesh: st.icon(st.kind, from, { color: C.hot, inkColor: C.ink, opacity: 0 }) };
-    const stain = prints.length ? st.icons(st.kind, prints, { flat: true, rolls, size: 0.20, … }) : null;
+    const stain = prints.length ? st.icons(st.kind, prints, { flat: true, rolls, size: st.iconFlatSize, … }) : null;
-      st.alpha(F.mesh, e); F.mesh.scale.setScalar(SZ * (0.55 + 0.45 * e));
+      st.alpha(F.mesh, e); F.mesh.scale.setScalar(st.iconSize * (0.55 + 0.45 * e));
-    const SZ = 0.56;
-    const knife = st.icon(st.kind, A, { size: SZ, color: C.key, inkColor: C.ink, opacity: 0, roll: -1.1 });
+    const knife = st.icon(st.kind, A, { color: C.key, inkColor: C.ink, opacity: 0, roll: -1.1 });
-        knife.scale.setScalar(SZ * (0.5 + 0.5 * e));
+        knife.scale.setScalar(st.iconSize * (0.5 + 0.5 * e));
```
★只有 `SZ`→`sizeOf` 那幾行，沒有第五支招被動到，也沒有任何數值被改★。
`js/trait-fx/emblems.js` 對 `abe2f69` **零 diff**（本批連一個剪影頂點都沒動）。

### 驗收 8　工作樹乾淨、`index.html` 零 diff —— **綠**

```
git diff 6a839de -- index.html     → （空）
git status --short                 → （空）
```
`git diff --stat 88ad10c..` 50 個檔：`js/trait-fx*` 5 個、`tests/` 10 個、
`docs/IMPLEMENTATION_GUIDE.md`＋`docs/experiments/2026-09-11-fx-vocab.md` 2 個、
其餘 33 個全部是本批新增的證據檔（`…-fix-evidence/` 與 L4-pre 的 `score.mjs`／`rN-score.txt`）。
**凍結檔 `2026-09-11-acceptance-fx-legibility.md` 與批 0 報告 `2026-09-12-fx-legibility-b0-report.md` 不在清單裡（一字未改）。**

---

## 4. 沒修到／做不到的項目與原因

| 項目 | 狀態 | 原因 |
|---|---|---|
| **C3** L4-pre 縮案例集 | **沒修（使用者裁定項）** | 任務書明列不做。凍結檔 §2.1 已有「修訂二勘誤」把射日神弓短版放回、L4-pre 退回「未通過」；統計量與處置待使用者裁。 |
| **C4** 讀者對之間紅綠翻轉 | **沒修（使用者裁定項）** | 同上。改判準（兩位平均 ≥4／3 對取多數）＝動及格線，要走 `02 §2.1`。 |
| **C2 的 `ICON.size=0.44` 本身** | **沒改（刻意）** | 那是使用者簽准的數字（凍結檔 §2.1 記錄項③）。本批只**量**它：在產品量測位置上讓兩支示範招跌破 0.8%（§2.2）。動它＝移動及格線。 |
| **M2** draw call 取樣點 | **沒修（使用者已裁延後）** | 使用者裁定延到批 1–3 合併前一次量。 |
| **M4／M5** L4-pre 方向②鑑別力／一次換兩個變數 | **沒修（使用者裁定項）** | 兩條都是改 L4-pre 的設計與判準。 |
| **刀／印／帽剪影回修** | **沒改（另一小卷）** | 任務書明列不做（Q8 的 GLB／剪影回修小卷）。本批連一個頂點都沒動（`js/trait-fx/emblems.js` 對 `abe2f69` 零 diff）。 |
| **H3 的「走 `duel-drive` 的正式 L3」** | **只修一半** | 本批把治具棚的 bloom 與視口對齊產品、記下 seed；凍結檔 L3 指定的 `duel-drive` 真實對決場景那一格是批 1–3 的正式 L3（任務書也這麼寫）。 |
| **C5-③ 的門檻校準** | **做不到** | 純幾何（IoU／Hu／28 組設定）都排不出六位讀者的誤讀，詳見 §2.5。不編一個「看起來能過」的門檻（`03 R6`）。 |
| **L10 的 R2 綠** | **達不到（不是本批造成的部分＋一段歸不出來的部分）** | 見 §2.4。 |

---

## 5. 給批 1 的三個新前置（本批查出來、不在原覆審 §7 清單裡）

1. **`ICON.size` 預設 0.44 在產品量測位置上不夠用**（§2.2）：23 支招若照預設走，
   獻祭刀型的小剪影會落在 0.66–0.78%，低於 L3 的 0.8%。要嘛調預設（走 `02 §2.1`，那是使用者簽的數字），
   要嘛接受「每支招的尺寸是要量出來的值」並逐支覆寫 `ICON.byKind`。**兩條路都要使用者點頭。**
2. **剪影互撞的機械檢查不能當人眼的代理**（§2.5）：它抓得到「新的幾何近似」，抓不到「讀者會認錯」。
   批 1 前置回修（刀／印／帽）做完之後，仍然要跑一次小盲讀才算數。
3. **L10 的 R2 在基準上就是紅的**（§2.4）：凍結檔寫「維持綠」，但基準 `6a839de` 在 seed 1 就過不了。
   這條閘門的原文要重新校準（或改成「與基準同 seeds 比對、不得變差」），否則批 1–3 每批都會撞到同一面牆。
