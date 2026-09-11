# 批 0 工作計畫：招式可辨性卷 v0.55（2026-09-12）

> 權威規格：`docs/experiments/2026-09-11-acceptance-fx-legibility.md`（凍結檔，L0–L12＋檔頭十二題裁定）、
> `docs/proposals/2026-09-11-plan-fx-legibility.md`（§1 檔案清單／§2 介面寫死／§3 不做什麼／§6 逐招診斷表／§7 三系語彙表／§8 裁定）。
> 基準 SHA：`6a839de`（＝本 worktree 落點，`scratchpad/fxleg-b0-base-sha.txt`）。
> 批 0 的產出**停下給使用者看**（凍結檔檔頭 Q2）；批 1／2／3 才逐系換招。

---

## 0. 開卷前三件事實（計畫 §0，本卷開工當下逐項查證）

| # | 要查的事 | 實測（2026-09-12，`6a839de`） |
|---|---|---|
| 1 | 0.54 是否已併入 | **已併**。`tests/tools/fx-consts.mjs` 存在（`TRAIT_MS_BY_TIER = {1:260,2:900,3:1400}`）；`traitfx-drive.mjs` 有 `--tier=`（`:74`）；截圖點已改成按 tier 比例換算（`:100`）。`git log` 第 8 筆＝`8204f97 v0.54 合併招式三級視覺分級`。 |
| 2 | draw call 的除以 2 陷阱 | `tests/tools/duel-perf.mjs` 印的 `drawCallsPerFrame` 是兩幀和；門檻一律寫**原始欄位值** ≤1000。 |
| 3 | 有沒有別的 agent 在同一 repo 寫檔 | 本 agent 在獨立 worktree `agent-ae35c60b976f8dca0`，落點 `6a839de`，不合併 main、不動 origin。 |

## 1. L0 分母（**本批自己數出來的**，不引用計畫 §6 的數字）

指令（凍結檔 L0 原文，`[A-Za-z0-9]+` 版）：

```bash
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.(ring|disc)\(/{print "ringdisc",fn}' js/trait-fx/*.js | sort -u
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.dome\(/{print "dome",fn}'          js/trait-fx/*.js | sort -u
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.orb\(/{print "orb",fn}'            js/trait-fx/*.js | sort -u
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.beam\(/{print "beam",fn}'          js/trait-fx/*.js | sort -u
grep -c "0x[0-9a-fA-F]\{6\}" js/trait-fx/zuling.js js/trait-fx/xianghuo.js js/trait-fx/yinqi.js
```

| 共用語彙 | 出現的（檔, 函式）對 | 扣掉三尊後 = 分母中的分子 | 計畫 §6 記的舊數字 |
|---|---|---|---|
| `st.ring`／`st.disc` | 22 | **19／27** | 17／27 |
| `st.dome` | 5 | **3／27** | 3／27 |
| `st.orb` | 17 | **15／27** | 14／27 |
| 裸 `st.beam` | 10 | **9／27** | 8／27 |
| 編舞裡的色碼字面值 | zuling 2 ＋ xianghuo 1 ＋ yinqi 6 | **9 處** | —（計畫只說「要歸零」） |

**為什麼比計畫的數字大**：計畫 §6 量的是 `main ac6f2e7`（0.54 併入前，只有 27 支完整版）；
`6a839de` 上多了 0.54 的 27 支 `SHORT` 短版，短版沿用同一批語彙 ⇒ 同名函式在兩個 export 裡各出現一次，
`sort -u` 去重之後仍多出幾支「只有短版用到」的。**後續一律以本表為分母**（`02 §6.1` 第 7 條：分母自己數）。

三尊（`eliteBlind`／`wardGuardAll`／`hauntAnswer`）不計入 27 的分母，但語彙與色票要納入（Q9）。

## 2. 批 0 做什麼（六件）

1. `docs/design/ART_BIBLE.md` **新增 §10「招式視覺語彙」**（Q5 授權），§0–§9 一字不動。
2. **積木 API**：`js/trait-fx/vocab.js`＋`js/trait-fx/emblems.js` 新檔；`js/trait-fx.js` 加
   `MAT_SOLID`（非加色）與常駐預熱、`st.icon`／`st.icons`／`st.trail`／`st.mark`／`st.colors`／`st.phase`、
   `run.sig.phases`／`run.sig.emblems`。**純新增**：既有 27 支一行未動，`st` 既有方法簽章不變。
3. **示範招**（下節）：完整版（tier 2）與 260ms 短版（tier 1）都做。
4. **盲讀材料治具**：`tests/tools/blindread-sheet.mjs`（6 幀 2×3、1560×1080、幀位寫死）
   ＋改前／改後兩份 sheet（L4-pre 材料鑑別力的材料）。
5. **對比治具**：`tests/tools/fx-contrast.mjs`＋`tests/tools/fx-contrast-metrics.py`（L3 的凍幀 A/B 差圖）。
6. **文件**：`docs/IMPLEMENTATION_GUIDE.md` §11.29、`docs/experiments/2026-09-11-fx-vocab.md`（語彙表人類版）
   ＋`tests/fxvocab.test.mjs`（文件與 `vocab.js` 對齊，L12）。**`index.html` 一格不動**（VERSION 留到合併時定 0.55）。

## 3. 示範招：四支，不是三支

派工指名三支：獻祭刀 `eliteSelfCut`／虎爺印 `biteGamble`／千里眼銅鈴 `wardImmuneLost`。
對照計畫 §6 的系別欄：**`biteGamble` 與 `wardImmuneLost` 兩支都是香火系，這三支裡沒有任何陰氣招**，
與凍結檔檔頭 Q2「批 0 ……**三系各一支**示範招 contact sheet 停下給使用者看」不符。

處置：**三支照做，另加一支陰氣系 `hauntLost` 魔神仔紅帽**（診斷表第 26 列，失敗類型 E＋C，
是陰氣 9 支裡兩位讀者短版都答不出的那一支）。理由：

- 凍結檔 Q7 明訂「陰氣＝地面水漬與陰影滋長……**批 0 出圖後使用者可改方向**」。
  批 0 若沒有任何陰氣示範招，使用者在這個決策點上就看不到陰氣語彙，
  這條授權會**跳過批 0 直接進批 3**，等於少一次方向回簽。
- `eliteSelfCut`／`biteGamble` 另有第二個職責：它們是凍結檔 **L4-pre「已知不可辨」的兩支對照**，
  改前版本必須用新材料重跑並仍判不可辨 ⇒ 這兩支一定要在批 0 的材料裡。

四支都做完整版＋短版；contact sheet 出**改前**（`6a839de` 的編舞）與**改後**各一份，同一組寫死幀位。

## 4. 檔案清單（`git diff --stat 6a839de..` 只准出現這些）

**新增**
| 檔案 | 內容 | 計畫 §1 有列？ |
|---|---|---|
| `js/trait-fx/vocab.js` | `FX_PAL`／`BEAT`／`ICON`／`EMBLEM_OF`（單一事實來源） | ✅ |
| `js/trait-fx/emblems.js` | 27＋3 個徽記剪影頂點表、`geomOf(kind)` 快取 | ✅ |
| `tests/tools/fx-contrast.mjs` | L3 凍幀 A/B 差圖治具 | ✅ |
| `tests/tools/fx-contrast-metrics.py` | 差圖的面積與 CIE76 ΔE 中位數 | ✅ |
| `tests/tools/blindread-sheet.mjs` | 6 幀 2×3 盲讀材料產生器（幀位寫死在本檔） | ✅ |
| `tests/fxvocab.test.mjs` | `2026-09-11-fx-vocab.md` ↔ `vocab.js` 對齊（L12 要求「由單元測試對齊」，§1 漏列落點） | ❌ **本批增列** |
| `docs/experiments/2026-09-11-fx-vocab.md` | 三系語彙表人類可讀版 | ✅ |
| `docs/experiments/2026-09-12-plan-fx-legibility-b0.md` | 本檔 | ❌ 本批增列（派工要求） |
| `docs/experiments/2026-09-12-fx-legibility-b0-report.md` | 批 0 實跑報告 | ❌ 本批增列（派工要求） |
| `docs/experiments/2026-09-12-fx-legibility-b0-evidence/` | 證據目錄（sheet／差圖／JSON） | ❌ 本批增列（派工要求） |

**修改**
| 檔案 | 改什麼 | 計畫 §1 有列？ |
|---|---|---|
| `js/trait-fx.js` | 純新增（`MAT_SOLID`＋預熱、六支積木、`sig.phases`／`sig.emblems`、`spawn` 打 `userData.fxKind`） | ✅ |
| `js/trait-fx/zuling.js` | 只改 `eliteSelfCut`（完整版＋短版） | ✅ |
| `js/trait-fx/xianghuo.js` | 只改 `biteGamble`／`wardImmuneLost`（完整版＋短版） | ✅ |
| `js/trait-fx/yinqi.js` | 只改 `hauntLost`（完整版＋短版） | ✅ |
| `docs/design/ART_BIBLE.md` | **只多 §10** | ✅ |
| `docs/IMPLEMENTATION_GUIDE.md` | 只多 §11.29 | ✅ |
| `tests/tools/traitfx-preview.html` | 加 `__tfx.fxVis(on)`（L3 的 A/B 只准切 `visible`，治具要有這個開關）與 `__tfx.bloomCfg()` | ❌ **本批增列** |

**不碰**：`index.html`（VERSION 留到合併）、`js/bloom.js`／`scene-env.js`／`renderer.js`／`particles.js`（含 `SPARK_COLOR`）／
`creature-figures.js`／`duel-figures.js`／`camera-director.js`、所有 GLB、`tests/tools/traitfx-drive.mjs`、
`tests/tools/traitfx-sheet.mjs`、其餘 23 支招式編舞、所有規則測試的斷言。

> **與計畫 §1 的三處增列都寫在上表**，合併前要由使用者裁（凍結檔 L11 只准出現 §1 列的檔）。
> 增列的理由分別是：L12 明文要求單元測試但 §1 沒給落點；派工要求批 0 自己的計畫／報告／證據目錄；
> L3 的量法要求「兩幀之間只有 `visible` 一個變數」，治具頁不給開關就做不到。

## 5. 介面（照計畫 §2，一個名字都不改）

```js
// js/trait-fx/vocab.js
export const FX_PAL   = { zuling:{key,hot,line,ink}, xianghuo:{...}, yinqi:{...} };
export const BEAT     = { 1:{windup,travel,react,settle}, 2:{...}, 3:{...} };
export const ICON     = { size, outlineW, billboardTiltDeg, markSize };
export const EMBLEM_OF= { <trId>: '<kind>' };           // 27 支 ＋ 三尊，雙射

// js/trait-fx/emblems.js
export const EMBLEM = { sun:[...], bolt:[...], ... };    // 每 kind ≤24 個外框頂點
export function geomOf(kind);                            // 惰性建、Map 快取、全場共用
export function disposeAll();

// js/trait-fx.js（makeStage 回傳的 st 上）
st.icon(kind, pos, o)      // → Mesh（MAT_SOLID 本體＋MAT_LINE 描邊，朝鏡頭）
st.icons(kind, positions, o) // → InstancedMesh（同 kind ≥3 份走這支，1 個 draw call）
st.trail(obj, from, to, o) // → tween（飛行＋拖尾，取代裸 beam）
st.mark(fig, kind, o)      // → Mesh（蓋在受招／受益方身上並跟著走）
st.colors                  // → FX_PAL[det.fac]
st.phase('windup'|'travel'|'react')  // 打點；是否記入 run.sig.phases 由實測條件決定
```

`st.phase` 的判準（計畫 §2.3，**寫死不得放寬**）：
- `windup`：打點後 120ms×k 內，出招方任一骨骼 `rot`／`shift` 絕對值 ≥0.08，或 `move`／`scale` delta ≥0.04（`rim` 不算）。
- `travel`：該段內有一個 spawn 物的世界座標位移 ≥ 出招方到目標距離的 **40%**（原地脹大不算）。
- `react`：打點後 200ms×k 內，受招方（增益招＝受益方）有 `flinch`／`scale`／`move` delta ≥0.03（`rim`／`burst` 不算）。

**退役語彙**（`dome`／裸 `beam`／五方陣／腳下 `ring`+`disc` 在祖靈與陰氣）：批 0 **標 deprecated 但不刪**，
批 1–3 逐招換掉後才刪。示範招自己不得再用退役語彙。

## 6. 不做什麼（批 0）

1. 不動 `TRAITS` 規則欄位、對決引擎、AI、拍賣、請神、共鳴（純演出）。
2. 不動 0.54 的三級定義與 260／900／1400、`PW_FX` 節奏常數、`pwBeatTier`、`?fxtier=0`。
3. 不動 bloom／色調映射／燈光／霧／天空、不動 `SPARK_COLOR`（Q6）。
4. 不動 GLB、不改造型（Q8：造型互撞先用語彙硬拉開）。
5. **不改另外 23 支招**——它們在批 1／2／3 才換，批 0 只證明方向。
6. 不跑 L4 盲讀本體（要兩位 fresh 讀者，讀者由主對話派）；批 0 只產材料並跑 **L4-pre** 的對照組材料。
7. 不改盲讀量表、不改任何門檻。

## 7. 驗證指令（原文；紅了據實記）

```bash
# S1 等價（純演出）
node tests/tools/trace-eq.mjs scratchpad/fxleg-b0-base-index.html index.html
node tests/tools/trace-eq.mjs scratchpad/fxleg-b0-base-index.html index.html --beats
node tests/tools/trace-eq.mjs index.html --mutate           # 預期 exit 1

# S2 招式驅動器（三個 tier 全套；Playwright 單獨跑，不並發）
node tests/tools/traitfx-drive.mjs scratchpad/b0-t1.json --tier=1 --port=8841
node tests/tools/traitfx-drive.mjs scratchpad/b0-t2.json --tier=2 --port=8842
node tests/tools/traitfx-drive.mjs scratchpad/b0-t3.json --tier=3 --port=8843

# S3 對比閘門（示範招；A/B 只切 visible）
node tests/tools/fx-contrast.mjs scratchpad/b0-contrast --port=8845 --only=eliteSelfCut,biteGamble,wardImmuneLost,hauntLost
python tests/tools/fx-contrast-metrics.py scratchpad/b0-contrast > scratchpad/b0-contrast.json
# 突變驗紅：cp js/trait-fx/vocab.js scratchpad/vocab-backup.js → ICON.size 改 0.02 → 重跑 → 預期紅 → cp 還原

# S4 盲讀材料（改後）
node tests/tools/blindread-sheet.mjs docs/experiments/2026-09-12-fx-legibility-b0-evidence/sheets-after --port=8846 \
     --only=eliteSelfCut,biteGamble,wardImmuneLost,hauntLost
# 改前對照組：git worktree add --detach <tmp> 6a839de → 同指令、同幀位

# S5 對決真實路徑
node tests/tools/duel-drive.mjs "http://127.0.0.1:8831/index.html?paperwar=1&fxcount=1&seed=7" scratchpad/b0-duel.json --duels=4
node tests/tools/duel-perf.mjs scratchpad/b0-perf.json

# S6 規則測試全綠
node tests/review.test.mjs && node tests/nightrules.test.mjs && node tests/duel-desync.test.mjs \
 && node tests/lineup-order.test.mjs && node tests/legend.test.mjs && node tests/aistake.test.mjs \
 && node tests/conscap.test.mjs && node tests/roles-balance.test.mjs && node tests/wish16.test.mjs \
 && node tests/fxtier.test.mjs && node tests/fxvocab.test.mjs

# S7 範圍
git diff --stat 6a839de..
git diff 6a839de.. -- index.html            # 預期空
```

## 8. 批 0 適用的閘門（凍結檔的子集；門檻一字不改）

| 代號 | 條件 | 來源 |
|---|---|---|
| B0-1 | `trace-eq` 對 `6a839de` 的 `index.html` 逐位元組相等，`--beats` 也相等，`--mutate` exit 1 | L5 |
| B0-2 | `traitfx-drive --tier=1` 27 套 `onTime`／`clean`／`rateOK`(≤1.0)／`actionsOK`／`msOK`(260) 全過 | L6／L7 |
| B0-3 | `traitfx-drive --tier=2` 30 套、`--tier=3` 三尊 全過 | L6 |
| B0-4 | `programsGrew` = 0（三個 tier） | L8 |
| B0-5 | `duel-drive` 4 場 0 console error／pageerror／requestfailed | L9 |
| B0-6 | `duel-perf` 的 `drawCallsPerFrame` ≤1000（原始欄位）、tris 增量 ≤1%、`rendersPerSec` 比值 ≥0.90 | L8 |
| B0-7 | 示範招凍幀 A/B：特效像素 ≥ 全畫面 **0.8%** 且 CIE76 ΔE 中位 ≥ **28**；`ICON.size=0.02` 突變必須紅 | L3 |
| B0-8 | 九套規則測試全綠、零毫秒斷言新增；`fxtier.test.mjs`／`fxvocab.test.mjs` 綠 | L5／L12 |
| B0-9 | `git diff 6a839de.. -- index.html` 為空；`--stat` 只出現第 4 節的檔 | L11 |

**不在批 0 判定範圍**（批 1–3 或總驗收才成立）：L1 徽記雙射 27／27（批 0 只有 4 支換好）、
L2 三段（批 0 只要求「至少兩段」）、L4 盲讀 ≥24／27、L10 `dmg-readability`／`closeup-judge`
（示範招沒改任何跳字或特寫路徑，但仍列為記錄項）。

## 9. 凍結

本檔第 3／4／5／6／8 節訂下後即凍結（`02 §2.1`）。要改只有「原標準錯在哪、為什麼現在才知道」
＋使用者針對該條的明確同意一條路。

### §2.1 修訂紀錄
（無）
