# 計畫：招式可辨性卷（2026-09-11）

> 排程：0.54（招式三級，**進行中、尚未併入 main**）之後、0.55b 拍賣桌上桌之前。建議版號 **0.55a**。
> 基準：`main` `ac6f2e7`（VERSION 0.53）＋ 0.54 合併後的狀態。
> 依據：`docs/experiments/2026-09-11-fx-blindread-r1/README.md`（27 支短版只過 2、完整版本來就不可辨 14）、
> `docs/experiments/2026-09-10-acceptance-fx-blindread.md` §2.1 修訂一（絕對門檻 ≥24/27 搬到本卷）、
> `docs/experiments/2026-09-10-acceptance-fx-tiers.md`（三級與 260/900/1400 是本卷前提，不得動）、
> `docs/design/ART_BIBLE.md` §0–§9、`docs/experiments/2026-09-05-traitfx-bones.md`（骨骼表）。

## 0. 開卷前必須先確認的三件事實（動手前第一步，查不到就停手問人）

1. **0.54 是否已併入 main**。治具盤點實測（2026-09-11）：`main` `ac6f2e7` 上
   - `tests/tools/traitfx-drive.mjs` **沒有** `--tier=`（`parseArgs`／`main()` 全檔無 `tier` 字樣）；
   - `tests/tools/fx-consts.mjs` **不存在**（`tests/tools/` 91 個檔案裡沒有）；
   - contact sheet 幀位是寫死的**絕對幀號** `shotAt=[8,22,36]`（`tests/tools/traitfx-drive.mjs:76`，註解「出招後 ~130／370／600ms」），不是 20%/45%/75%；
   - `sheet-t1-short.png`／`sheet-t2-full.png` 這兩個檔名只出現在 0.54 的計畫文件裡，main 上沒有任何腳本產它們；
   - `stats` 物件（`js/trait-fx.js:117`）**沒有 `rate` 欄位**，`rate` 只是 `js/trait-fx.js:368,421-425` 每套演出內部的加速倍率，沒有彙整進 `verdict`。
   0.54 的 commit（`342f495`、`4f0da1b`、`bcb6c8d` 等）只存在於 `worktree-agent-a858c067dfd8802b5` 分支，**不是 main 的祖先**。
   → **本卷的所有 `--tier=` 指令、`fx-consts.mjs` 斷言、260ms 短版都以「0.54 已合併」為前提。0.54 沒合併就不准開本卷**（否則寫出來的短版沒有時長來源、驗收指令跑不起來）。
2. **draw call 的除以 2 陷阱**：`tests/tools/duel-perf.mjs:102` 印的欄位叫 `drawCallsPerFrame`，但它是**跨兩次 rAF 的兩幀和**（`docs/proposals/2026-09-10-plan-table3d.md:412` 記下這件事）。現況對決 8v8 的原始輸出是 **965**，每幀才是 **482**（同檔 `:392`、`:490`）。本卷的門檻一律寫**原始欄位值**，不寫「每幀」，否則會訂出一個恆真的門檻。
3. **兩個 agent 正在 worktree 改招式與版面**：本卷開工前先確認那兩支都已合併或已收工，同一 repo 同時只允許一個會寫檔的 agent（`02 §7`）。

---

## 1. 檔案清單（`git diff --stat` 只准出現這些）

**新增**
| 檔案 | 內容 |
|---|---|
| `js/trait-fx/vocab.js` | 三系特效語彙的**單一事實來源**：三系色票（`FX_PAL`）、節拍表（`BEAT`）、法寶徽記對照（`EMBLEM_OF`：trId → emblem kind）。27 支與三尊全部讀這一份。 |
| `js/trait-fx/emblems.js` | 27（＋3）個徽記的 2D 剪影頂點表 → 共用 `THREE.ShapeGeometry`，每個 kind 建一次、全場共用。 |
| `tests/tools/fx-contrast.mjs` | 對比閘門（L3）：凍幀 A/B 差圖治具，作法沿用 `tests/tools/outline-probe.mjs` 的 `width` 模式（同一次載入、同一格畫面、只切 `visible`）。 |
| `tests/tools/fx-contrast-metrics.py` | 差圖的 CIE76 ΔE／面積統計，`srgb_to_lab` 直接沿用 `tests/tools/art-a-metrics.py:24-36` 那一支（不重寫）。 |
| `tests/tools/blindread-sheet.mjs` | 新規格盲讀材料產生器（6 幀 2×3、混洗、遮代號），取代 0.54 的 `traitfx-sheet.mjs` 三格版。 |
| `docs/experiments/2026-09-11-acceptance-fx-legibility.md` | 本卷凍結檔（第 5 節就是它的草案）。 |
| `docs/experiments/2026-09-11-fx-vocab.md` | 三系語彙表的人類可讀版（第 7 節），與 `vocab.js` 互為對照，兩邊不一致要有單元測試判紅。 |

**修改**
| 檔案 | 改什麼 | 不准改什麼 |
|---|---|---|
| `js/trait-fx.js` | 新增 `st.icon`／`st.icons`／`st.trail`／`st.mark`／`st.colors`／`st.phase`；新增第三支材質模板 `MAT_SOLID` 與它的預熱物件；`run.sig` 加 `phases`。 | `TFX` 既有常數、骨骼 delta 機制、保險絲、`makeStage` 既有方法的簽章一律不動（27 支現有呼叫全部要照舊能跑）。 |
| `js/trait-fx/zuling.js` | 9 支（不含 `eliteBlind`）的 tier1／tier2 時間軸改寫。 | 函式名、匯出形狀、`st` 既有 API 的用法。 |
| `js/trait-fx/xianghuo.js` | 9 支（不含 `wardGuardAll`）同上。 | 同上。 |
| `js/trait-fx/yinqi.js` | 9 支（不含 `hauntAnswer`）同上。 | 同上。 |
| `index.html` | 只改 `VERSION`／`VERSION_NOTE`。 | **`TRAITS`／`POOL`／`LEGENDS`／`PW_FX`／`paperWar`／`buildArmy` 一格不動**（`git diff` 對這幾段必須為空）。 |
| `docs/design/ART_BIBLE.md` | **新增** §10「招式特效語彙」（需使用者先同意，見第 8 節 Q5）。 | §0–§9 一字不動。 |
| `docs/IMPLEMENTATION_GUIDE.md` | 新增一節（§11.28 或 0.54 之後的下一個號）。 | 其餘不動。 |

**明確不碰**：`js/bloom.js`、`js/scene-env.js`、`js/renderer.js`、`js/particles.js`（含 `SPARK_COLOR`）、`js/creature-figures.js`、`js/duel-figures.js`、`js/camera-director.js`、所有 GLB、`docs/GAME_DESIGN`、所有規則測試的斷言。

---

## 2. 介面（新積木 API／材質／常數先寫死）

### 2.1 材質模板：從兩支變三支

現況 `js/trait-fx.js:100-101` 只有 `MAT_GLOW`（加色 mesh）與 `MAT_LINE`（加色 line）。**盲讀「顏色分不出、全是白的」的直接成因**：加色混合的東西一旦亮度越過 bloom 門檻（`js/bloom.js:175` `threshold: 0.55`、`strength: 1.15`）就往白色去，系色在畫面上根本存活不下來。

```js
// js/trait-fx.js（緊接 MAT_GLOW／MAT_LINE 之後）
// 徽記本體用「不加色」的實心材質：系色才留得住（加色＋bloom 會把任何亮色推成白）。
const MAT_SOLID = new THREE.MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 1,
  blending: THREE.NormalBlending, depthWrite: false, depthTest: true,
  side: THREE.DoubleSide, fog: false, toneMapped: false,
});
```
- 預熱：比照 `js/trait-fx.js:106-110` 的 `warm` 群組再加一個 `warmSolid`（`frustumCulled=false`、常駐桌底），否則第一次用會在演到一半編 program（`traitfx-drive` 的 `programsGrew` 會抓到）。
- **program 數固定為 3**，`traitfx-drive` 的 `programsGrew` 必須維持 0。

### 2.2 徽記幾何：`js/trait-fx/emblems.js`

```js
// 每個 kind 一份 2D 外框頂點（單位圓內，[-1,1]²），建一次 ShapeGeometry 全場共用。
// 為什麼是剪影不是模型：GLB 裡有一半的法寶根本沒有對應骨骼（見第 6 節「法寶不在模型裡」那一欄），
// 而剪影是低多邊形唯一剩下的辨識手段（ART_BIBLE §7）。
export const EMBLEM = {
  sun: [...], bolt: [...], bead: [...], rhomb: [...], tusk: [...], wave: [...], knife: [...], crag: [...], eye: [...],
  flag: [...], blade: [...], boat: [...], bell: [...], banner5: [...], seal: [...], talis: [...], lamp: [...], tornflag: [...],
  hat: [...], pin: [...], chair: [...], drop: [...], buoy: [...], claw: [...], coin: [...], shade: [...], urn: [...],
};
export function geomOf(kind) { /* 惰性建、快取在 module 內的 Map */ }
export function disposeAll() { /* 只在頁面卸載時呼叫 */ }
```
- **一招一 kind、一 kind 一招**（雙射）：27 支各自唯一，L1 用它當機械斷言。
- 幾何複雜度上限：每個 kind ≤ 24 個外框頂點（三角化後 ≤ 22 個三角形），27 個 kind 合計 ≈ 600 tris，對現況 176,624 tris 是 0.34%。

### 2.3 `st` 新增的積木（全部掛在 `makeStage` 回傳的 `st` 上）

```js
/** 徽記：一片朝鏡頭的法寶剪影。solid 走 MAT_SOLID（系色留得住），outline 另加一圈 MAT_LINE 描邊。
 *  o = { size=0.28, color=st.colors.key, opacity=1, outline=true, billboard=true } */
st.icon(kind, pos, o = {})            // → THREE.Mesh（已 spawn，自動清場）

/** 同一 kind ≥3 份時走 InstancedMesh（4 尊作祟 × 1 徽記 = 1 個 draw call，不是 4 個） */
st.icons(kind, positions /* Vector3[] */, o = {})   // → THREE.InstancedMesh

/** 飛行物＋拖尾：把徽記從 from 飛到 to，尾巴是綁在它身上的 MAT_LINE，取代現在滿場飛的裸 beam。
 *  o = { ms, delay, ease, arc, spin, trail=true, done } */
st.trail(obj, from, to, o = {})       // → tween

/** 印記：在受招方身上蓋一枚徽記並跟著它走（因果第三段的「證據」）。
 *  o = { ms=220, size=0.2, color, at='chest'|'top'|'foot' } */
st.mark(fig, kind, o = {})            // → THREE.Mesh

/** 本系色票（取代編舞裡直接用 st.color）：{ key, hot, line, ink } 四個 hex */
st.colors                              // ← 讀 vocab.js 的 FX_PAL[det.fac]

/** 因果三段的標記：編舞自己在對的時點呼叫，L2 靠它做機械判定（不是靠猜） */
st.phase('windup' | 'travel' | 'react')
```

**`st.phase` 的判準（防「喊了就算」）**：`st.phase(name)` 只是打點，`run.sig.phases` 記的是**打點當下該段的實際條件是否成立**——
- `windup`：該幀之後 120ms 內，出招方有任一骨骼 `rot`／`shift` 的絕對值 ≥ 0.08 rad，或 `move`／`scale` 的 delta ≥ 0.04（**只有 `rim` 變化不算**）；
- `travel`：該段內有一個 spawn 出來的物件，其世界座標位移 ≥ 出招方到目標距離的 40%（**貼在原地脹大的環、罩、光球不算**）；
- `react`：該幀之後 200ms 內，受招方（或增益招的受益方）有 `flinch`／`scale`／`move` 的 delta ≥ 0.03（**只有 `rim` 或 `burst` 不算**）。
編舞打了點但條件不成立 → `phases` 不記，L2 判紅。

### 2.4 `js/trait-fx/vocab.js`（先寫死的常數）

```js
export const FX_PAL = {
  // key＝徽記本體、hot＝命中／爆點、line＝連線與描邊、ink＝暗部（描邊外緣，把亮色從背景上切出來）
  zuling:   { key: 0x3f6fd8, hot: 0xffd9a0, line: 0x7ea8ff, ink: 0x0a1230 }, // 靛藍主導（ART_BIBLE §2 已授權靛藍為次色）
  xianghuo: { key: 0xffc21e, hot: 0xff5a3c, line: 0xffe08a, ink: 0x2a1004 }, // 鎏金主導＋硃紅命中
  yinqi:    { key: 0xbdf0dc, hot: 0xff2f3a, line: 0x6fae90, ink: 0x04120c }, // 冷屍白青＋「一點刺眼的紅」只給命中
};
export const BEAT = {
  1: { windup: [0, 90],  travel: [90, 180],  react: [180, 240], settle: [240, 260] },
  2: { windup: [0, 300], travel: [300, 560], react: [560, 760], settle: [760, 900] },
  3: { windup: [0, 460], travel: [460, 860], react: [860, 1180], settle: [1180, 1400] },
};
export const ICON = { size: 0.28, outlineW: 0.02, billboardTiltDeg: 12, markSize: 0.20 };
export const EMBLEM_OF = { eliteOpenShot: 'sun', boltGamble: 'bolt', /* …27 支全表，見第 6 節… */ };
```
- **`SPARK_COLOR`（`js/particles.js:140-146`）一格不動**。招式徽記走 `FX_PAL`，命中火星仍走 `SPARK_COLOR`——兩者職責不同，改 `SPARK_COLOR` 會波及燒毀與通用交鋒（見第 8 節 Q6）。
- 三個系別檔一律 `import { FX_PAL, BEAT, EMBLEM_OF } from './vocab.js'`，**不得在編舞裡寫任何色碼字面值**（L0 的 grep 就是查這件事）。

---

## 3. 不做什麼

1. **不動 GLB、不改造型**。第 6 節查到三組造型互撞（拼板舟↔山豬牙飾、百步蛇紋盾↔拼板舟、虎爺印↔山豬牙飾）——那是模型層的問題，本卷只能靠演出語彙硬拉開，拉不開就列名交裁（第 8 節 Q8），**不得順手改 `tools/anyCreature` 的 JSON 或重出 GLB**。
2. **不動 0.54 的三級定義與 260／900／1400**。`pwBeatTier`、`TRAIT_MS_BY_TIER`、`?fxtier=0` 全部沿用。
3. **不動對決引擎、`TRAITS` 規則欄位、AI、拍賣、請神、共鳴**（純演出卷，`trace-eq` 逐位元組相等要證明這件事）。
4. **不動盲讀量表**：Q1 從 27 個招名選一、Q2 1–5、必附「看到了什麼」、兩位 context-free opus 讀者、讀者與修者分開——一字不動（`docs/experiments/2026-09-10-acceptance-fx-blindread.md` §量表）。
5. **不動 bloom／色調映射／燈光／霧／天空**。「特效太白」的解法是換材質與換形狀（第 2.1 節），不是調 `threshold` 或 `EXPOSURE`——那兩個一動，整張牌桌與 27 隻的 lookdev 全部要重驗（ART_BIBLE §8 明寫）。
6. **不加音效、不加新後製、不做鏡頭語言**（tier 3 的 `CINEMA` 與黑條是 0.54 的東西，本卷不碰）。
7. **不做三尊三招的盲讀閘門**（它們是 tier 3、材料規格不同；只做語彙與色票同步＋視覺回歸，見第 8 節 Q9）。
8. **不改切圖程序去遷就分數**：新材料規格在第 5 節 L4 一次訂死，訂完凍結（`02 §2.1`）。

---

## 4. 端到端驗證步驟（指令原文）

> 全部從 repo 根目錄 `C:\Users\shung\OneDrive\桌面\妖市` 跑。專案**沒有 `package.json`、沒有建置步驟**，每支治具自己起 `python -m http.server`（`docs/IMPLEMENTATION_GUIDE.md:1084`：`file:` 協定在 Playwright 被擋）。
> 標了 **[0.54]** 的指令只有在 0.54 已併入 main 之後才存在；未合併前那幾條跑不起來（第 0 節）。

```bash
# ── S0 基準凍結：動手前先把「改之前」的數字全部留檔 ────────────────────────
git rev-parse HEAD > scratchpad/fxleg-base-sha.txt
cp index.html scratchpad/fxleg-base-index.html          # trace-eq 的對照本，改壞前的備份副本

# ── S1 等價（純演出：規則一格不能動）────────────────────────────────────
node tests/tools/trace-eq.mjs scratchpad/fxleg-base-index.html index.html
node tests/tools/trace-eq.mjs index.html --mutate       # 突變驗紅：預期 exit 1

# ── S2 招式驅動器：27＋3 套全跑、三個 tier ───────────────────────────────
node tests/tools/traitfx-drive.mjs scratchpad/fxleg-t1.json --tier=1 --shots=scratchpad/shots-t1   # [0.54]
node tests/tools/traitfx-drive.mjs scratchpad/fxleg-t2.json --tier=2 --shots=scratchpad/shots-t2   # [0.54]
node tests/tools/traitfx-drive.mjs scratchpad/fxleg-t3.json --tier=3 --shots=scratchpad/shots-t3   # [0.54]
# 0.54 未合併時的退路（只驗 900ms 完整版、無 tier 概念）：
node tests/tools/traitfx-drive.mjs scratchpad/fxleg-full.json --ms=900 --shots=scratchpad/shots-full

# ── S3 對比閘門（本卷新治具；沿用 outline-probe 的凍幀 A/B 手法）────────────
node tests/tools/fx-contrast.mjs scratchpad/fxcontrast --port=8845
python tests/tools/fx-contrast-metrics.py scratchpad/fxcontrast/*.png > scratchpad/fxcontrast.json
# 突變驗紅（改壞前先備份副本、用副本還原，不用反向 sed）：
cp js/trait-fx/vocab.js scratchpad/vocab-backup.js
#   把 ICON.size 改成 0.02 → 重跑 S3，預期 L3 紅；然後 cp scratchpad/vocab-backup.js js/trait-fx/vocab.js

# ── S4 盲讀材料（本卷新治具）＋兩位 fresh 讀者 ────────────────────────────
node tests/tools/blindread-sheet.mjs scratchpad/shots-t1 scratchpad/shots-t2 \
     docs/experiments/2026-09-11-fx-blindread-r2 --seed=20260911 --frames=6 --cell=780x360
# 讀者由主對話另派兩個 context-free opus subagent，不繼承本卷任何對話史

# ── S5 對決真實路徑：節奏、零錯、可讀性不退 ──────────────────────────────
node tests/tools/duel-drive.mjs "http://127.0.0.1:8831/index.html?paperwar=1&fxcount=1&seed=7" scratchpad/fxleg-duel.json --duels=4
node tests/tools/duel-drive.mjs "http://127.0.0.1:8831/index.html?paperwar=1&fxcount=1&seed=7&fxtier=0" scratchpad/fxleg-duel-off.json --duels=4
node tests/tools/dmg-readability.mjs dom scratchpad/fxleg-dmg.json --seed=1 --duels=10 --port=9002
node tests/tools/dmg-readability.mjs pix scratchpad/fxleg-dmgpix --seed=1 --duels=6 --port=9001
node tests/tools/closeup-judge.mjs scratchpad/fxleg-closeup.json --base=scratchpad/fxleg-closeup-base.json

# ── S6 效能：fps 比值與 draw calls（注意 drawCallsPerFrame 是兩幀和）──────────
node tests/tools/duel-perf.mjs scratchpad/fxleg-perf.json
# 基準版同指令在 worktree/base checkout 跑一次，兩份數字並排

# ── S7 規則測試全綠（一條都不准新增毫秒斷言）──────────────────────────────
node tests/review.test.mjs
node tests/nightrules.test.mjs
node tests/duel-desync.test.mjs
node tests/lineup-order.test.mjs
node tests/legend.test.mjs
node tests/aistake.test.mjs && node tests/conscap.test.mjs && node tests/roles-balance.test.mjs && node tests/wish16.test.mjs

# ── S8 範圍檢查（R5 第 3 件套，證據要實際貼出來）──────────────────────────
git diff --stat $(cat scratchpad/fxleg-base-sha.txt)..
git diff $(cat scratchpad/fxleg-base-sha.txt).. -- index.html | grep -c "TRAITS\|POOL\|LEGENDS\|paperWar\|buildArmy"   # 預期 0
```

---

## 5. 凍結檔草案 L0–L12

> 本節訂下後即凍結（`02 §2.1`）。要改只有「原標準錯在哪、為什麼現在才知道」＋使用者逐條同意一條路。

### L0 分母先歸一（動手前 30 秒，`02 §6.1` 第 7 條）
動手前自己 grep 數出 N，寫進凍結檔（**不得憑本計畫的數字**）：
```bash
# 逐招列出共用語彙的使用者（分子），再對 27 支（分母）算涵蓋
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.(ring|disc)\(/{print "ring/disc",fn}' js/trait-fx/*.js | sort -u
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.dome\(/{print "dome",fn}'        js/trait-fx/*.js | sort -u
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.orb\(/{print "orb",fn}'          js/trait-fx/*.js | sort -u
awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=FILENAME" "$1} /st\.beam\(/{print "beam",fn}'        js/trait-fx/*.js | sort -u
grep -n "0x[0-9a-fA-F]\{6\}" js/trait-fx/*.js         # 編舞裡的色碼字面值
```
（注意函式名含數字，正規表示式一定要寫 `[A-Za-z0-9]+`——只寫 `[a-zA-Z]+` 會漏掉 `wardHpFront2`、`hauntDread1` 這類，第一次數就是這樣數錯的。）
改後：三個系別檔裡**色碼字面值 = 0 處**（全部走 `FX_PAL`）；`st.ring`／`st.disc` 的用量按第 7 節的限縮規則收斂（祖靈 0 處、陰氣 0 處、香火保留）。
**什麼實作會讓它假綠**：把色碼搬進同檔的 `const` 常數（仍是分岔，要求 import 自 `vocab.js`）；把 `st.ring` 改名包一層再叫（要求數 spawn 出來的 `RingGeometry`／`CircleGeometry` 而不是數函式名）。

### L1 一招一新增元素，且雙射（機械）
27 支在 **tier 1 與 tier 2 都各自 spawn 至少一個 `emblem` 徽記**，且 `EMBLEM_OF` 是 trId ↔ kind 的**雙射**（27 對 27，無重複、無遺漏）。由 `traitfx-drive` 統計 `run.sig.meshes` 裡的 `emblem:<kind>` 標記並印表。
**什麼實作會讓它假綠**：兩支招共用同一個 kind（雙射斷言擋）；只在 tier 2 有、tier 1 砍掉（兩個 tier 各自斷言）；徽記 spawn 了但 `opacity` 全程 0 或 `scale` 全程 < 0.02（要求 L3 的像素面積下限同時成立）；徽記被別的 mesh 完全遮住（L3 量的是畫面像素，不是場景圖）。

### L2 因果三段（機械）
`run.sig.phases` 記到的段數：**tier 1 每支 ≥ 2 段、tier 2 每支 = 3 段**。判準見第 2.3 節（`rim` 變化與 `burst` 都不算數）。
**什麼實作會讓它假綠**：把 `st.flinch` 當成 travel（travel 要求 spawn 物位移 ≥ 兩方距離 40%）；把 `rim` 暴亮當成 windup（windup 要求骨骼／model 的實際 delta）；增益招沒有受招方就跳過 react（增益招的 react 量在**受益方**身上，同一組門檻）。

### L3 對比：暗紅桌面＋紫夜空上的真實可見度（機械，真實路徑）
量法（沿用 `tests/tools/outline-probe.mjs` `width` 模式的手法，**同一次載入、同一格畫面**）：
1. 在真實對決場景（不是空棚）演該招，於 `BEAT[tier].travel` 中點派 `ys:hitstop` 凍住時間軸；
2. 截圖 A（徽記與連線 `visible=true`）；只把該 run 的 `emblem`／`trail`／`mark` mesh 切 `visible=false`，**其餘一切不動**，截圖 B；
3. 差圖：`|ΔLuma| ≥ 6` 的像素即「特效像素」；
4. 判定：**特效像素數 ≥ 全畫面 0.8%**（活性證據，`02 §6.1` 第 1 條相等性斷言那條的要求）**且**這些像素「A 對同座標 B」的 **CIE76 ΔE 中位數 ≥ 28**（`srgb_to_lab` 沿用 `tests/tools/art-a-metrics.py:24-36`）。
5. 27 支全部要過。
**什麼實作會讓它假綠**：整個畫面提亮讓什麼都變差很多（B 幀必須逐位元組等於「同一格沒有徽記」的畫面，兩幀之間只有 `visible` 一個變數）；只取最亮那幾顆像素（用**中位數**＋面積下限，不用最大值）；在沒有背景的空棚量（要求走 `duel-drive` 的真實對決場景，凍結檔記下 seed）；把門檻挑成現況剛好過的值（**突變驗紅**：`ICON.size` 改 0.02 或 `opacity` 改 0.05 → 必須紅；**反面也要驗**：健康狀態下 27 支全綠）。

### L4 盲讀（人眼閘門，本卷的主閘門）
- **材料**：每支招一張圖，**6 幀 2×3 排列、每格 780×360、總圖 1560×1080**（現行是 3 格 × 370px）。幀位在 `BEAT[tier]` 的 windup 中點／travel 起／travel 中／travel 末／react 起／react 末——**寫死在 `blindread-sheet.mjs`，不得逐招調**。短版與完整版混洗成匿名編號、去招名、遮代號，對應表 `r2-mapping-HIDDEN.json` 讀者不得看。
  - 圖檔長邊訂 1560px 的理由：讀者端讀圖有長邊上限（超過會被縮，格內細節反而更差）。這一條**開卷前用 L4-pre 實測**，不是照抄。
- **讀者**：兩位 fresh、context-free opus，各自獨立，不重用前輪讀者，不給辨識元素表、不給 tier 標記、不給對話史。
- **量表**：Q1 從 27 個招名選一（可答「認不出」）、Q2 1–5 並必附一句「看到了什麼」——與 `2026-09-10-acceptance-fx-blindread.md` 一字不差。
- **及格線（從量表 §2.1 修訂一原封搬過來）**：**27 支中 ≥24 支（≥89%）兩位讀者 Q1 皆對且 Q2 皆 ≥4**。短版與完整版各自成立。未過的每支列名。
- **上限 3 輪**：第 3 輪仍未過就停手，列清單交使用者裁（與量表一致）。
**什麼實作會讓它假綠**：讀者拿到辨識元素表或招式效果說明（禁）；讀者知道哪張是短版（混洗）；只用一位讀者（要兩位）；材料挑最好看的幀（幀位寫死在 `BEAT` 上）；修者兼讀者（禁）；改切圖程序或量表（禁）。

### L4-pre 材料鑑別力（L4 之前必過，不過就不准用新材料）
新材料先跑 4 支對照，**舊結論必須重現**：
- 已知可辨：`eliteVsSwarm` 虎姑婆指甲（r1：A 4／B 4–5）、`eliteOpenShot` 射日神弓（r1：A 4／B 4–5）→ 新材料上兩位仍須 Q1 對且 Q2 ≥4；
- 已知不可辨：`eliteSelfCut` 獻祭刀（r1：B short 給 1）、`biteGamble` 虎爺印（r1：兩位兩版皆錯）→ **在「還沒改的版本」上**新材料仍須判不可辨。
兩個方向任一不重現 → 新材料無效，回頭修材料，**不得先改招式再說材料沒問題**。
**什麼實作會讓它假綠**：只驗「可辨的仍可辨」不驗反面（那只證明材料夠亮，不證明它有鑑別力）；拿改過的版本去跑不可辨那兩支（要用基準 SHA 的 checkout）。

### L5 等價（純演出的底線）
`trace-eq` 對基準 `index.html` 的 `trace(1..20)` **逐位元組相等**（預設與 `?fxtier=0` 都相等）；`--mutate` 模式必須 exit 1。9 套規則測試全綠、**零毫秒斷言新增**。
**什麼實作會讓它假綠**：trace 沒把 `war.beats` 的 kind/side/trId 全部序列化（現有欄位不得縮）；改了 `TRAITS` 又把 trace 對應欄位一起改。

### L6 短版原生合身（沿用 0.54 F2）
`traitfx-drive --tier=1` 30 套 `onTime` 全過、`clean`（`cut===0 && fused===0`）全過、`rate ≤ 1.0`；`--tier=2` 與 0.54 合併點同結果；`--tier=3` 三尊 1400ms clean。治具讀 `fx-consts.mjs` 不得寫死。
**注意**：`rate` 目前**不在** `stats`／`verdict` 裡（`js/trait-fx.js:117`），0.54 要先把它彙整出來，否則這條恆綠。
**什麼實作會讓它假綠**：短版只是把完整版 `rate` 拉高硬擠（`rate ≤1.0` 擋）；`--tier=1` 其實還在跑 900（治具斷言 `run.ms===260`）；放寬 `clean` 判準。

### L7 短版品質下限（沿用 0.54 F10）
每支短版時間軸至少含 **2 個以上非 flinch 的 `tween`／`fly`／`fade`／`grow`**，由 `traitfx-drive --tier=1` 統計並印表。
**什麼實作會讓它假綠**：把徽記的淡入淡出拆成兩個 `fade` 湊數（同時要過 L2 的三段）。

### L8 效能
- `duel-perf.mjs` 的 **`drawCallsPerFrame` ≤ 1000**（＝每幀 ≤ 500；現況原始值 965／每幀 482。**這個欄位是兩幀和**，門檻寫原始值，不寫「每幀」）；
- 桌機 `?fps=1` 對決期間 `rendersPerSec` 比值（新／基準，同 seed）**≥ 0.90**；
- `traitfx-drive` 的 `programsGrew` = 0（材質模板固定 3 支、全部預熱）；
- 三角形數增量 ≤ 基準的 1%（現況 176,624）。
- iPhone `?fps=1` 由使用者回填（記錄項，不擋合併）。
**什麼實作會讓它假綠**：把門檻寫成「每幀 ≤ 1000」（等於放寬一倍，恆真）；量在沒有招式在演的那幾幀（要求在 `traitfx-drive` 每套的 travel 中點取樣，取 27 支的**最大值**）；用 `InstancedMesh` 規避 draw call 卻讓 tris 爆掉（tris 增量另有門檻）。

### L9 零錯
`duel-drive` 4 場（seed 7）＋ `?fxtier=0` 4 場 ＋ `traitfx-drive` 三個 tier 全套：**0 console error／pageerror／requestfailed**。
**什麼實作會讓它假綠**：把錯誤 try/catch 吞掉（`js/trait-fx.js` 的編舞 throw 會讓 `det.handled=false` 退回 fallback，那是**靜默降級**——`traitfx-drive` 的 `handled` 必須 27/27 為 true，不能只看 errors 為 0）。

### L10 既有可讀性不退
`dmg-readability` seeds 1/3 的 R1（字級 ≥1.6×）／R2（中位 ≥+25 且 ≥25 比例 ≥70%＋Δ200 單向 ≤+5）**維持綠，門檻一字不動**；`closeup-judge` P 系列在 tier 1 拍不得回 null（null 數印出、必須 0）。
**什麼實作會讓它假綠**：徽記蓋住傷害跳字讓 R2 的對比反而變好（要求同時看 R1 的對位項與 `closeup-judge` 的 null 數）。

### L11 範圍
`git diff --stat <基準 SHA>..` 只含第 1 節列出的檔；`index.html` 的 diff 只有 `VERSION`／`VERSION_NOTE`；`TRAITS`／`POOL`／`LEGENDS`／`PW_FX`／引擎函式的 diff 為空（以 diff 證明，不是以宣稱）。
**什麼實作會讓它假綠**：先 commit 再收尾讓 `HEAD` 恆綠（比的是**落點建立時的 SHA**，不是 `HEAD`，`03 R2`）。

### L12 文件
`docs/IMPLEMENTATION_GUIDE.md` 新一節（三系語彙、`vocab.js` 單一來源、`MAT_SOLID` 為什麼要有第三支、`st.icon`／`st.phase` 怎麼用、L3 的量法）；`ART_BIBLE.md` **只多出 §10**（§0–§9 diff 為空）；`VERSION`＋`VERSION_NOTE` 首段寫本卷；`docs/experiments/2026-09-11-fx-vocab.md` 與 `js/trait-fx/vocab.js` 由單元測試對齊（不一致判紅）。
**什麼實作會讓它假綠**：文件寫了一套、`vocab.js` 是另一套（對齊測試擋）。

---

## 6. 逐招診斷表（27 列）

> 「讀者摘要」取自 `r1-reader-A.json`／`r1-reader-B.json` 的 `seen` 欄；`S`＝短版 260ms、`F`＝完整版 900ms，括號是 Q2。
> 失敗類型：**A** 常駐造型當特效／**B** 語彙重複／**C** 對比不足（含加色＋bloom 爆白）／**D** 無新增元素／**E** 因果斷裂／**F** 法寶不在 GLB 裡（骨骼表查證）。

### 祖靈系（9 支，`js/trait-fx/zuling.js`）

| # | 招（trId） | 現況演出一句 | 讀者 seen 摘要 | 失敗類型 | 建議的「出招瞬間新增元素」 | 徽記 kind |
|---|---|---|---|---|---|---|
| 1 | 射日神弓 `eliteOpenShot` | 拉弓→`SunNock` 凝金球→190ms 直射最壯者→軌跡線→火星 | A S4「半空懸著發亮黃球像太陽，弓弧射出細線」／B F5「拉開大弓、金色太陽球飛向敵人」 | **無（標竿）** | 保留。只把太陽改成 `sun` 徽記（現在是裸 `orb`，會被誤讀成任何白球——見雷女之火），軌跡改 `st.trail` | `sun` |
| 2 | 百步蛇紋盾 `wardHpFront2` | 鱗紋行進波→三片盾牆張開→蛇頭吐信→`dome`＋腳下環 | A S4「長方形盾、藍菱紋像蛇皮、盾後淡色護罩」／**B 兩版都讀成「拼板舟」** | B（`dome` 與 5 支撞）＋造型撞拼板舟 | 出招瞬間沿盾牆展開一條**菱紋帶**（`rhomb` 徽記串成一列，靛藍實心＋描邊），蛇頭吐信提到第一段；`dome` 在祖靈系退役 | `rhomb` |
| 3 | 巴冷公主珠鍊 `eliteArmor` | Trunk 五顆珠逐顆亮→心口 `orb`＋`dome`→本隊腳下環 | **A S 直接讀成「山神庇佑」**（同一個 `dome`）／B S3「鑲滿藍珠的人形罩起白色圓罩」 | **B（`dome` 撞山神庇佑）** | 護罩換成**繞身旋轉的琉璃珠圈**（`bead` 徽記 ×7 走 `st.icons`，靛藍），`dome` 拿掉 | `bead` |
| 4 | 祖靈之眼 `wardFirst` | 眼瞼 `Sl0-3` 掀開→`beam` 注視→本方搶半步→腳下環 | A S2「藍色圓環一直亮著，三格幾乎沒動」→**猜陰陽眼銅錢**／B F4「藍色巨眼射出白光直線」 | D（短版只有骨骼開合）＋B（藍圓環撞銅錢） | 睜眼瞬間在眼前生出一枚**放大的祖靈之眼徽記**（`eye`），注視光束改靛藍寬束＋瞳孔收縮；本方前鋒腳下改**垂直光柱**（祖靈＝垂直線條主導） | `eye` |
| 5 | 雷女之火 `boltGamble` | 撐翼仰頸→`EmberSeed` 脹→火種**升空成球**→兩道 `bolt` 劈下 | **A S 讀成「射日神弓」**（「天上一顆淡黃圓球」）／B S4「銀翼變成鋸齒閃電，白電線從天而降」 | **B（升空的白球＝射日的專屬語彙，兩招直接撞）** | **刪掉「圓球升空」那一段**；火種改成 `bolt` 鋸齒徽記直接在翼上炸開再落雷（B 已認出鋸齒＝可用的辨識元素） | `bolt` |
| 6 | 拼板舟 `swarmHalfSplash` | 三舟壓浪→躍離→腳下漣漪環＋水花盤 | A S2「扁平白色小船閃金光」／**B 兩版都讀成「白色獠牙／骨頭狀」** | 造型撞山豬牙飾（模型層）＋B（漣漪環） | 躍起瞬間船底生出**三道平行浪弧**（`wave` 徽記）＋濺起水柱；漣漪環退役。造型撞留 Q8 交裁 | `wave` |
| 7 | 山豬牙飾 `swarmThorn` | 低頭刨地→`DiscRoot` 牙盤轉→410ms 牙尖射獠光→火星 | A S3「獠牙處閃出一小片黃白光點」／**B S2「鼻頭亮了一下，右邊敵人完全沒反應」、F「中間看不到任何東西飛過去」** | **D＋E（短版把 410ms 的獠光砍掉了，只剩骨骼）** | 反傷改成**兩根獠牙徽記從目標身上彈回出招方**（`tusk`，反向飛行＝「反擊」的因果），`DiscFace` 牙盤同時轉亮 | `tusk` |
| 8 | 獻祭刀 `eliteSelfCut` | 鹿頸下彎→胸口 `orb` 血火星→本隊每尊拉一條 `beam` 升天 | **A S「認不出」、B S 給 1「三格幾乎一模一樣，畫面上完全沒有特效」**／F：A 猜椅仔姑、B 猜山神庇佑 | **F（`xianji` GLB 骨骼表裡完全沒有刀，只有一隻鹿）＋D** | 出招瞬間在頸邊生出一把**黑曜石刃徽記**（`knife`，近黑實心＋靛藍描邊——`ink` 色就是為這個而設），橫劃出一道弧、血火星炸開，本隊每尊身上蓋一枚 `knife` 印記 | `knife` |
| 9 | 山神庇佑 `wardHpAll1` | 屈膝沉身→`Crag*` 隆起→腳下 `disc`＋頭頂**白 `orb` 升空** | **A 兩版都讀成「千里眼銅鈴」**（「頭上白圓球」）／B F3「整個被打亮、兩顆月亮般的光球」 | **B（白 `orb` 升空撞千里眼、射日、雷女）＋F（山神沒有法寶本體）** | 拿掉頭頂 `orb`；`Crag*` 隆起加倍，腳下改**環繞一圈的岩塊徽記**（`crag` ×6 走 `st.icons`），受益方頭上蓋 `crag` 印記 | `crag` |

### 香火系（9 支，`js/trait-fx/xianghuo.js`）

| # | 招（trId） | 現況演出一句 | 讀者 seen 摘要 | 失敗類型 | 建議的「出招瞬間新增元素」 | 徽記 kind |
|---|---|---|---|---|---|---|
| 10 | 王爺劍 `eliteCleave` | 舉劍→200ms 扇形劍光掃過整排→逐隻火星退縮 | **S 兩位都「認不出」(2/2)、F 兩位都認出(4/3)——全 27 支裡短版掉最多的一支**／B F3「舉起發紅光的刀劍、地上拖出橘紅斬擊軌跡」 | **短版把劍光砍了 → D**（`sword` GLB 有 `BladeRoot..BladeTip`，法寶在模型裡卻沒被用） | 短版**必須保留斬擊弧**：改成 `blade` 徽記從劍尖拖出的一道金色弧（`st.trail`），`Blade*` 骨骼邊光單獨暴亮 | `blade` |
| 11 | 送王船 `wardAbsorb4` | 桅頂燃火→船前滑半身位→金 `dome`＋貼地光盤 | A S4「船身沿邊燒橘火、罩起一層淡光」／B S3「整艘船被大半透明圓罩包住」 | B（`dome`，Q2 上不去） | `dome` 換成**船身四周立起的金箔帆罩**（`boat` 徽記 ×4 圍成方框）；吸收的傷害演成被燒成灰飄走 | `boat` |
| 12 | 媽祖令旗 `wardAtkAll1` | 旗桿後倒→猛甩→兩道令波環推過本方→各尊側踏＋頭頂火星 | **A 兩版猜送王船、B 兩版猜香灰符**／A S2「頂上插著橘色火把，三格幾乎沒變化」 | **A（旗是常駐造型，第一格就在）＋B（令波環）＋C（粉橘 `#f08060` 對暗紅桌 ΔE 最低）** | 揮旗瞬間旗面**展開成一面金紅大旗徽記**（`flag`，鎏金實心＋硃紅描邊）掃過本方整排；令波環退役 | `flag` |
| 13 | 千里眼銅鈴 `wardImmuneLost` | 舉鈴→三次甩鈴→三圈鈴波環→一條 `beam` 串到同伴 | **A 猜五營旗、B 猜虎爺印（兩版皆錯）**／A S2「只有幾點橘色火星，看不出做了什麼」 | **D（短版只剩骨骼＋火星）＋B（鈴波環）**；效果本身是被動免疫，沒有可演的因果 | 鈴波改成**金色同心方框**（香火專屬形狀）；被免疫的同伴頭上蓋一枚**銅鈴徽記**（`bell`）＝「這幾尊被護到了」，把被動效果演成可見的受益方反應 | `bell` |
| 14 | 五營旗 `swarmRally` | 舉旗→旗尖 `orb`→腳下五方陣（`disc`＋五 `orb`＋五 `beam`）→三尊頓足 | **A 猜香灰符、B 猜魔神仔紅帽（兩版皆錯）**／B F3「一大片淡色光圈、兩顆白光球、一條虛線拉來拉去」 | **B（`disc`＋`orb`＋`beam` 三種共用語彙疊在一起，反而更糊）** | 五方陣改成**五面小旗插在五個方位**（`banner5` 徽記 ×5 走 `st.icons`，1 個 draw call）；中央光盤與五道連線退役 | `banner5` |
| 15 | 香灰符 `wardHpFirst` | 符鏈飄揚→捧灰到胸→金灰 `orb` 拋物線到前鋒頭頂→腳下環 | **兩位兩版都猜「五營旗」**（「身上插滿旗／符」）／A S2「只有第三格頂端冒出一小撮白煙」 | **A（符是常駐造型）＋C（白煙太小太淡）** | 香灰改成**一撮金灰顆粒流**（不是白煙），落下時在前鋒身上蓋一張**金色方符徽記**（`talis`） | `talis` |
| 16 | 福壽綿長 `wardRegen1` | 燈焰 `FlmR` 脹→暖火 `orb` 飛到同伴→光柱＋三顆上飄火星 | **A S 猜飼鬼甕、B S 給 2**「三格之間幾乎沒變化」／A F3「前面放著燒火的紅色供盤」 | **A（燈火是常駐造型）＋D（短版幾乎沒動）** | 出招瞬間 `FlmR` 暴漲成一朵**金色燈焰徽記**（`lamp`）脫離燈罩飛向同伴（現在是白 `orb`，跟另外四支撞） | `lamp` |
| 17 | 虎爺印 `biteGamble` | 伏身張口→撲出→咬合→兩道咬痕 `bolt`→重退縮 | **兩位兩版都讀成「山豬」**（B S3「背上燒著金火的長牙野獸」→猜山豬牙飾） | **F（`tiger_c` 骨骼表裡完全沒有「印」）＋造型撞 boartusk** | 咬合瞬間在咬點蓋一枚**朱紅方印徽記**（`seal`，方框＋篆字塊）——這是唯一能把「虎爺**印**」和「山豬**牙**」分開的元素 | `seal` |
| 18 | 破軍旗 `swarmLastStand` | 倒矛過頂→插心→腳下紅 `disc`＋胸口 `orb`→旗桿餘顫 | **A F 猜福壽綿長**（「腳下暖橘地光＋白泡泡」）／**B 兩版猜魔神仔紅帽** | **B（`disc`＋`orb`）＋C（橘光池與暗紅桌糊在一起）** | 插心瞬間**殘破軍旗徽記**（`tornflag`，缺角旗面）在身後展開，紅改高飽和硃紅；胸口 `orb` 換成旗桿貫穿的實心直線 | `tornflag` |

### 陰氣系（9 支，`js/trait-fx/yinqi.js`）

| # | 招（trId） | 現況演出一句 | 讀者 seen 摘要 | 失敗類型 | 建議的「出招瞬間新增元素」 | 徽記 kind |
|---|---|---|---|---|---|---|
| 19 | 虎姑婆指甲 `eliteVsSwarm` | 長爪高舉→撲下→逐隻火星退縮→舔爪 | **兩位兩版全對，B F 給 5**「袖口伸出一排又長又白的尖指甲」 | **無（標竿）** | 保留。爪尖 `orb` 換成 `claw` 徽記讓它在小圖上更像爪 | `claw` |
| 20 | 椅仔姑竹椅 `hauntSee` | 竹椅前後搖→椅頭抬起→腳下環→細 `beam` 指向每一隻 | 兩位兩版全對（3–4）／**B S4「憑空多出一張椅子並在地上畫出光圈」** | B（腳下環＋細 `beam`），Q2 卡在 4 邊緣 | 強化 B 已經看到的好訊號：**憑空多一張椅子**（`chair` 徽記淡入）；細線換成陰氣的抖動細絲 | `chair` |
| 21 | 飼鬼甕 `swarmFeed1` | 甕口張開→敵方頭頂灰火弧線吸進甕口→甕身脹→本方腳下暖光 | A S3／**B S4「甕口冒出綠色鬼影，敵人身上出現兩三點白色鬼火」** | 接近過，差在吸入的方向感 | 灰火改 `urn` 徽記的小型複本被吸進甕口（方向性），甕身脹幅加大 | `urn` |
| 22 | 黃色小雨衣 `hauntDread1` | 兜帽抬起→閃現靠近→敵方腳下一圈暗陰氣環→群體縮小 | A S3／**B S4「四隻穿黃色連帽雨衣、滴水的小鬼」**／A F 誤讀成過陰咒（「綠色光環」） | B（那一圈 `ring` 與過陰咒的兩圈暗環直接撞） | 掃出的環退役，改成**雨滴徽記**（`drop` ×6 走 `st.icons`）從敵方頭上落下＋地面留不規則水漬 | `drop` |
| 23 | 水鬼浮標 `hauntSwap` | 繩後盪→甩繩→`bolt` 繩線勾住小兵拖半步→本方最後一尊沉沒＋漣漪 | A S3／B S4／**兩位都提到「一條白色虛線」** | B（白虛線＝全場最泛濫的語彙） | 繩子改成**粗濕繩徽記**（`buoy`，末端帶結）；沉沒那尊補一根水柱 | `buoy` |
| 24 | 林投姐髮簪 `hauntSteal` | 髮瀑揚起→每隻敵人拉一條陰綢→命火被吸到鬼頭上 | 兩位兩版都答對但 **Q2 全是 3**（「四五條細長淡色線條」） | **F（`hairpin` GLB 沒有「簪」骨，只有 `HairA-E`／`Veil*`）＋B（細線）** | 出招瞬間頭上生出一支**銀簪徽記**（`pin`），簪飛出去戳中目標、帶著一顆命火飛回——三段齊全且法寶現身 | `pin` |
| 25 | 過陰咒 `hauntFearX2` | 本尊俯身→`VRoot` 虛影分離抬起→腳下兩圈暗環→敵方縮 30% | **B 兩版讀成「百步蛇紋盾」**（把 `guoyin` 的圓盤讀成盾牌）／A S3「腳下淡紫色圓圈」 | **B（兩圈暗環）＋C（淡紫在夜紫天前面幾乎消失）** | 虛影 `VRoot` 拉到體外更遠＋加**冷屍白青描邊**（`shade` 徽記貼在虛影上）；暗環退役，改腳下不規則暗斑 | `shade` |
| 26 | 魔神仔紅帽 `hauntLost` | 帽尖後仰→前點→敵方小兵頭上鬼火繞圈、原地打轉 | **A S「認不出」、B S「中間看不到任何飛行物」**；A F 猜水鬼浮標 | **E（沒有飛行物，只有原地繞圈的 0.052 小球）＋C** | 迷途改成在被迷那隻頭上生出**旋轉的紅帽徽記**（`hat`，用陰氣授權的「一點刺眼的紅」）＋地面踩出錯亂腳印 | `hat` |
| 27 | 陰陽眼銅錢 `swarmPierce` | 銅錢貼眼旋亮→兩道 `beam` 穿過目標再延伸 1.35 身位 | **兩位兩版 Q2 都只有 2，都說「看不清飛的是什麼東西」** | **B（白細虛線）＋E** | `yinyangcoin` GLB **有** `CoinA`／`CoinB`——把**銅錢本體徽記放大飛出去**（`coin`，外圓內方）穿過目標，線降級成銅錢的殘影拖尾 | `coin` |

**跨招撞名總表（本卷要拆開的四組）**
> 下表的支數是 2026-09-11 在 `main ac6f2e7` 實測（指令：
> `awk '/^  [A-Za-z0-9]+\(st\) \{/{fn=$1} /st\.(ring|disc|dome|orb|beam)\(/{print fn}' js/trait-fx/*.js | sort -u`）。
> **L0 動手前仍要自己重數一次**，不得引用本表的數字（`02 §6.1` 第 7 條：分母要自己數出來）。

| 撞什麼 | 實測用量（27 支中，不含三尊） | 涉及 | 拆法 |
|---|---|---|---|
| `orb` 白光球（升空／浮頭上／飛出去） | **14／27** | 射日、雷女、山神、巴冷、獻祭刀、破軍旗、五營旗、送王船、香灰符、福壽、虎姑婆、魔神仔、林投姐、飼鬼甕 | 只有射日保留「球」（那是太陽），其餘 13 支換成各自徽記 |
| `dome` 半圓護罩 | **3／27**（另 2 尊傳說） | 百步蛇紋盾、巴冷公主珠鍊、送王船 | 祖靈系（前兩支）退役；香火（送王船）換方框帆罩 |
| 腳下 `ring`／`disc` | **17／27** | 祖靈 6（巴冷、拼板舟、山豬牙、祖靈之眼、山神、百步蛇）、香火 6（破軍旗、五營旗、送王船、媽祖令旗、香灰符、千里眼）、陰氣 5（黃雨衣、過陰咒、椅仔姑、水鬼、飼鬼甕） | 限縮成香火專用（＝儀仗的「陣」）；祖靈 6 支改垂直光柱、陰氣 5 支改不規則水漬 |
| 裸 `beam` 白色細線 | **8／27**（另 1 尊傳說） | 射日、獻祭刀、祖靈之眼、五營旗、千里眼、福壽、椅仔姑、陰陽眼 | 一律降級成飛行物的拖尾（`st.trail`），不得單獨當主體 |

---

## 7. 三系語彙表

> 與 ART_BIBLE §1–§3 的四件事（剪影／主色／材質／節奏）一一對應；本表是它在**特效層**的延伸，建議進 ART_BIBLE §10（Q5）。

| | 祖靈 | 香火 | 陰氣 |
|---|---|---|---|
| **形狀語彙（專屬）** | 菱形／三角／直線；**垂直光柱**；菱紋帶 | **同心方框**（不是圓環）；旗面；金箔片；顆粒流 | 不規則細長曲線；濕布飄帶；鬼火點；**缺一角的形** |
| **形狀禁區** | 圓環、半圓罩（讓給香火／退役） | 圓球升空（讓給射日）、細白虛線 | 幾何規整的圓與方（那是另外兩系） |
| **動態** | **靜→瞬發**：一格內從 0 到滿，無漸強（ART_BIBLE §2「靜時如樹，動時瞬發」） | **蓄—落—餘 三拍**，像抬轎；有明確的「落下」重音 | **卡頓三段跳**：不補間、拍子錯開；出招前一拍完全靜止 |
| **主色（`FX_PAL`）** | `key #3f6fd8` 靛藍／`hot #ffd9a0` 土金／`line #7ea8ff`／`ink #0a1230` | `key #ffc21e` 鎏金／`hot #ff5a3c` 硃紅／`line #ffe08a`／`ink #2a1004` | `key #bdf0dc` 冷屍白青／`hot #ff2f3a` 那一點刺眼的紅／`line #6fae90` 苔綠／`ink #04120c` |
| **為什麼是這三色** | 靛藍是 ART_BIBLE §2 已授權的次色；**對暗紅褐桌面 `#6b3418` 是色相反向**，是三系裡分離度最高的一組 | 現行 `#f08060`（淡橘粉）對 `#6b3418` 的色相與亮度都太近——盲讀 5 支香火招被誤讀都與它有關。鎏金 `#ffc21e` 亮度高得多，暗紅桌與夜紫天都拉得開 | 現行 `#70b080` 中明度綠在夜紫天前面會沉下去；改高明度的白青當本體、苔綠只當描邊 |
| **背景的兩個對手** | 桌面 `TABLE_COLOR 0x6b3418`（`js/scene-env.js:8`）＋牌桌段夜空 `0x1e1a46`／水平線 `0x4a2030`（`ENV.SKY_STOPS`） | 同左 | 同左 |
| **對比怎麼量** | **不用色票算 ΔE**（加色混合＋bloom 之後畫面上的顏色不等於色票值——那是重建的模型，不是真實路徑）。一律用 **L3 的凍幀 A/B 差圖**：特效像素 ≥ 全畫面 0.8%、CIE76 ΔE 中位數 ≥ 28 | 同左 | 同左 |
| **徽記材質** | `MAT_SOLID` 實心本體（系色留得住）＋`MAT_LINE` 描邊；`MAT_GLOW` 只用在命中的爆點 | 同左 | 同左，另加 `ink` 外描邊（陰氣本體很亮，需要暗邊才切得出背景） |
| **腳下語彙** | **垂直光柱**（祖靈＝垂直線條主導，ART_BIBLE §2） | **貼桌方陣**（`ring`／`disc` 限縮到本系） | **不規則暗斑／水漬**（濕、無主、邊緣不規則） |

**退役／限縮清單（本卷要收斂的共用語彙）**
| 語彙 | 處置 | 理由 |
|---|---|---|
| 貼桌 `ring`／`disc` 光環（17／27） | **限縮為香火系專用** | 兩位讀者獨立指出「只用腳下光環的招太多互相分不出」 |
| `dome` 半圓護罩（3／27） | **祖靈系退役**（巴冷、百步蛇），香火（送王船）換方框帆罩 | 讀者 A 直接把巴冷公主珠鍊的 `dome` 讀成山神庇佑 |
| 白色 `orb`（14／27） | **只留射日神弓** | 十四支招共用；雷女之火因此被讀成射日、山神庇佑被讀成千里眼銅鈴 |
| 裸 `beam` 白色細線（8／27） | **降級成飛行物拖尾**，不得單獨當主體 | 讀者原話「看不清飛的是什麼東西」「一條白色虛線」 |
| 編舞裡的色碼字面值 | **全數移進 `vocab.js`** | 分母歸一：色票要有單一事實來源，否則下一卷又分岔 |

**因果三段怎麼壓進 260ms**（`BEAT[1]`）
| 段 | 時窗 | 內容 | 能不能省 |
|---|---|---|---|
| windup 出招方動作 | 0–90ms | 骨骼前搖到位（不是慢慢來，是**一格到位**）＋徽記在手上／身上亮相 | **不能省**——這是「誰在出招」的唯一來源，砍掉它就變成王爺劍短版（兩位讀者都認不出） |
| travel 飛行物／連線 | 90–180ms | 徽記本體飛出去／掃過去（`st.trail`），拖尾跟著 | **不能省**——這是「哪一招」的唯一載體；砍掉它就變成山豬牙飾（「中間看不到任何東西飛過去」） |
| react 受招方反應 | 180–240ms | `flinch`＋命中火星＋在目標身上蓋印記（`st.mark`） | **不能省**——砍掉就沒有因果。增益招沒有受招方時，這一段量在**受益方**身上（罩上／托起／蓋印記） |
| settle 收勢 | 240–260ms | 回彈 20ms，其餘交清場保險絲 | **可以省**（唯一可省的一段）——完整版的 140ms 收勢在短版壓成 20ms |

**與 0.54 的接縫**
- **新元素同一份，短版只砍節拍**：`EMBLEM_OF`／`FX_PAL`／徽記幾何 tier 1／2／3 共用一份，時間軸差別只在 `BEAT[tier]` 這張表。三套各寫一份會立刻分岔（0.54 的「27 支專屬短版」已經是分岔源，不能再加一層）。
- **三尊三招**：語彙與色票納入（同一份 `vocab.js`），盲讀閘門**不納入**——它們是 tier 3、有 CINEMA 機位與黑條，材料規格不同。另立一條「三尊沿用新語彙、`traitfx-drive --tier=3` clean 且視覺回歸不退」。交裁見 Q9。

---

## 8. 需要使用者裁的題（每題附建議答案）

| # | 題目 | ➡️ 建議答案 |
|---|---|---|
| **Q1** | 本卷版號與排程：0.54 之後、0.55b 拍賣桌上桌之前，版號 **0.55a**？ | **是**。並且**0.54 沒併回 main 就不准開本卷**（第 0 節：`--tier=`、`fx-consts.mjs`、260ms 短版都是它的產物）。 |
| **Q2** | 分批：**批 0**＝語彙表＋`vocab.js`／`emblems.js`／新 API／`MAT_SOLID`／L3 治具；**批 1／2／3**＝祖靈／香火／陰氣各 9 支，各自合併？ | **是**。批 0 不合併就開批 1 會讓三系各自發明語彙（分岔），這正是現在要修的病。 |
| **Q3** | 每批的盲讀讀哪些：只讀該批 9 支的圖（**名單仍給 27 個招名**，選項空間不變），合併後再跑一次全 27 支的總驗收？ | **是**。給 9 個名單會把猜對機率從 1/27 拉到 1/9（等於偷偷降門檻）；**≥24/27 的判定只認最後那次全 27 的總驗收**。 |
| **Q4** | 及格線與輪次：≥24/27 兩位皆 Q1 對且 Q2 ≥4，上限 3 輪，第 3 輪未達就列清單交裁？ | **是**（與量表 §2.1 修訂一、`02 §6.1` 附則的 3 輪上限一致）。 |
| **Q5** | `ART_BIBLE.md` 要不要**新增** §10「招式特效語彙」？（它是權威文件，0.54 凍結檔明訂「不動 ART_BIBLE」） | **要**。特效語彙沒有權威落點就會每卷重新發明。§0–§9 一字不動，只在檔尾加 §10。**這一題的「同意」就是動 ART_BIBLE 的授權**。 |
| **Q6** | 香火主色從 `#f08060` 換成鎏金 `#ffc21e`＋硃紅 `#ff5a3c`——要不要連 `js/particles.js` 的 `SPARK_COLOR.xianghuo` 一起改？ | **不要**。只改招式徽記的 `FX_PAL`（`vocab.js`），`SPARK_COLOR` 一格不動——它同時餵命中火星與燒毀演出，改了會波及整個對決與 27 隻的 lookdev。 |
| **Q7** | 腳下光環（`ring`／`disc`）限縮為香火系專用、祖靈改垂直光柱、陰氣改不規則水漬——同意？ | **同意**。這是盲讀兩位讀者獨立指出的第二件事（「只用腳下光環的招太多互相分不出」）。 |
| **Q8** | **造型互撞不是演出層修得掉的**：`shield`↔`boat`（B 兩版把盾讀成船、把船讀成獠牙）、`tiger_c`↔`boartusk`（兩位都把虎爺讀成山豬）。要不要另開 GLB 回修小卷？ | **本卷先用演出語彙硬拉開**（菱紋帶／浪弧／方印／獠牙四個徽記各走各的），總驗收後若這四支仍未過，**再開 GLB 回修卷**——不要在演出卷裡動模型（範圍會炸）。 |
| **Q9** | 三尊三招（`eliteBlind`／`wardGuardAll`／`hauntAnswer`）納不納入本卷？ | **語彙與色票納入、盲讀閘門不納入**。另立一條「`--tier=3` clean＋視覺回歸不退」的機械項。 |
| **Q10** | 新增第三支材質模板 `MAT_SOLID`（非加色）——會多一支 shader program（現在是 2 支，審查 M-3 的教訓是「clone 共用 program」）。同意？ | **同意**。加色＋bloom（`threshold 0.55`）就是「顏色分不出、全是白」的機制成因；不換材質，換色票也白換。比照現有兩支做常駐預熱，`programsGrew` 維持 0。 |
| **Q11** | draw call 上限訂 `duel-perf.mjs` 的 `drawCallsPerFrame` **≤1000**（＝每幀 ≤500；現況原始值 965／每幀 482）？ | **是**。務必寫**原始欄位值**——那個欄位是兩幀和（`plan-table3d.md:412`），寫成「每幀 ≤1000」等於放寬一倍、恆真。 |
| **Q12** | 盲讀材料規格：**6 幀 2×3、每格 780×360、總圖 1560×1080**（現行 3 格 × 370px），且開卷前先跑 L4-pre 材料鑑別力（2 支已知可辨＋2 支已知不可辨都要重現）？ | **是**。長邊 1560 是為了避開讀者端讀圖的縮圖上限；這一條由 L4-pre 實測確認，不照抄。 |

---

## 附：draw call 預算估算

| 項目 | 現況 | 本卷變動 | 依據 |
|---|---|---|---|
| 對決 8v8 每幀 draw calls | **482**（`duel-perf.mjs` 原始欄位 965 ÷ 2） | 峰值 +8～+10、平均 +3～+4 | `docs/proposals/2026-09-10-plan-table3d.md:392,412,490` |
| 單招新增的 mesh | — | 單體招 +2～3（徽記 1＋拖尾 1＋印記 1）；群體招（4 尊作祟）用 `st.icons` **InstancedMesh 合成 1 個 call**，不是 4 個 | 第 2.3 節 |
| 退役的 mesh | `dome`／`ring`／`disc`／裸 `beam` | −2～3（祖靈退 `dome`、四系退白 `beam`、五營陣退 `disc`＋5`orb`＋5`beam`＝**單這一支就 −11**） | 第 7 節退役清單 |
| **淨值** | — | **峰值 ≈ +8（492 < 500）、平均接近持平或略減** | 五營旗、山神庇佑、千里眼三支是淨減 |
| 三角形 | 176,624 | +≈600（27 個徽記 × ≤22 tris，且同一 kind 共用 geometry）＝ **+0.34%** | 第 2.2 節 |
| shader program | 2 支 | **3 支**（新增 `MAT_SOLID`，常駐預熱） | 第 2.1 節、Q10 |

**門檻（L8）**：`drawCallsPerFrame ≤ 1000`（原始欄位）、`rendersPerSec` 比值 ≥0.90、`programsGrew`＝0、tris 增量 ≤1%。
**假綠**：在沒有招式在演的幀取樣（要求在每套的 travel 中點取樣、取 27 支的最大值）；用 InstancedMesh 壓 call 卻讓 tris 爆掉（tris 另有門檻）。
