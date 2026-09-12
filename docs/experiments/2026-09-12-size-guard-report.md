# 徽記尺寸防線收斂報告（覆審 r3 N11／N12，2026-09-12）

> 基準＝main `417b197`（v0.55）。工作樹＝`.claude/worktrees/agent-ae64830f5be869b94`（**未合併、未 push**）。
> 證據目錄 `docs/experiments/2026-09-12-size-guard-evidence/`。

**一句話**：N11 用的是**收斂**（執行期把徽記 mesh 的 `scale` 鎖死，掃描退居第二道）；
N12 **一次蓋三表**（`sizeOf`／`flatSizeOf`／`markSizeOf` 全走共同出口 `ICON._resolve`）；
七條繞法**全紅**（每條都貼了是哪一道防線紅的）；健康態四項全綠、效能不退。

---

## 1. 分母（動手前先數，`02 §6.1` 第 7 條）

指令原文＝`docs/experiments/2026-09-12-size-guard-evidence/denominator.sh`
（`sh docs/experiments/2026-09-12-size-guard-evidence/denominator.sh`）。
輸出：收斂前 `denominator-before.txt`、收斂後 `denominator-after.txt`。

| 危險動作（`js/trait-fx/` 下全部 .js，含 `vocab.js`／`emblems.js`；grep 含註解） | 收斂前 | 收斂後 |
|---|---|---|
| `.scale.setScalar(` | **73** | **68** |
| `.scale.set(` | 0 | 0 |
| `.scale.multiplyScalar(` | 0 | 0 |
| `.scale.[xyz] =` | 0 | 1（只有 `vocab.js` 註解裡引述繞法⑥的那一行） |
| `.scale.copy/setX/setY/setZ/setComponent/fromArray/lerp/multiply/applyMatrix4(` | 0 | 0 |

- **`st.icon(`／`st.icons(`／`st.mark(` 的呼叫點：8 處**（`zuling.js:454,456`／`xianghuo.js:260,261,407,408`／`yinqi.js:137,150`）。
- **真正屬於「徽記 mesh 的縮放」的：5 處**（`zuling.js:470`／`xianghuo.js:272,422,448`／`yinqi.js:169`）。
  收斂後這 5 處全部改走 `st.iconScale(...)`，`.scale.setScalar(` 因此由 73 掉到 68（差值 5，逐處對得上）。
- 剩下的 68 處全部是 23 支未改招的 ring／disc／orb／光球縮放——**不是**本條要防的危險效果；
  把它們一起判紅只會讓防線恆紅、一週內被拆掉。
- 測試自己印的分母（去註解、`X.scale` 的成員／索引／賦值寫法）＝ **74 處**，
  與上表不同口徑（上表含註解且只數 `setScalar`），兩份都在證據目錄裡。
- **「直接碰徽記 mesh 的 `.scale`」：收斂前 5 處 → 收斂後 0 處**（`denominator-after.txt` 第 4 段）。

### 收斂 vs 涵蓋的取捨

N11 的危險效果＝「徽記 mesh 的世界尺寸來自 ICON 表以外的第二份來源」。
**首選收斂**（`02 §6.1` 第 7 條的優先序）：`js/trait-fx.js` 的 `lockIconScale()` 把
`st.icon()`／`st.icons()`／`st.mark()` 產出的物件的 `scale` 這個 `THREE.Vector3` 的 `x`／`y`／`z`
換成 accessor。**three.js 的每一個 Vector3 變動方法（`set`／`setScalar`／`copy`／`multiplyScalar`／
`applyMatrix4`／`fromArray`／`lerp`…）最後都是對 `this.x`／`this.y`／`this.z` 賦值**，
直接寫 `.scale.x =` 也一樣——所以 r3 列的四條繞法（別名、`multiplyScalar`、`scale.x=`、
子節點／索引取用）連同「還沒有人想到的第五條」落在**同一個扼口**上，分母歸一、涵蓋自然 100%。
鎖的範圍：徽記本體、它的 ink 底板與描邊子節點、`st.icons` 的 `InstancedMesh`，
以及 `InstancedMesh` 的 `userData.fxIcons.size`（那是逐幀重排時乘進矩陣的值，改它同樣是第二份來源）。
`userData.fxIconBase`／`fxIconKind` 也設成唯讀，堵掉「改基準再呼叫合法 API」這條。

**合法動畫怎麼辦**：四支示範招都有「呼吸縮放」（`st.iconSize * (0.5 + 0.5*e)`），
那是**相對倍率**、ICON 的值仍在乘積裡，不構成第二份來源。
新增 `st.iconScale(mesh, k)` 當唯一合法介面，它算的是 `mesh.userData.fxIconBase * k`，
而 `fxIconBase` 就是建構當下 `ICON` 表給的值 ⇒ **編舞再也拿不到「把絕對尺寸寫進去」的手把**。
`st.grow()`（寫絕對縮放的通用積木）套在徽記上會被鎖 throw，掃描也另外禁。

**為什麼鎖是 throw ＋ 記帳兩件事都做**：`js/trait-fx.js` 的 tween 迴圈對 `update` 是 `try/catch`
（一段壞了不擋整招），光 throw 會被吃掉、`pageerror` 也看不到。
所以違規同時記進 `stats.sizeViolations`／`stats.sizeViolationMsg`，
由 `traitfx-drive`／`fx-contrast` 讀 `__tfx.stats()` 判紅——那就是執行期斷言。

**執行期斷言的形狀（為什麼不是「world scale === ICON.sizeOf(kind)」）**：
四支示範招的呼吸縮放在健康態就讓 world scale ≠ 基準，那種等式會是恆紅的儀式。
鎖保證的是「每一次寫入都以 ICON 表的基準為因數」，所以斷言判的是
① `sizeViolations === 0`（沒有人繞過）② `iconLocked === iconMade`（鎖真的掛上去了＝這條不會變恆綠）。
整跑 `iconMade === 0`（例如 `--tier=3`：三尊還沒鋪語彙）會印「★未量到★」，不得當成通過。

---

## 2. N11 鑑別力：七條繞法全紅

完整輸出（含每條的還原核對）＝`docs/experiments/2026-09-12-size-guard-evidence/bypass7.md`。
做法：`cp js/trait-fx/zuling.js scratchpad/sg/zuling.bak.js` 備份 →
②～⑦**加行**（合法的 `st.iconScale` 留著，旁邊多一條第二來源）、①把 `o.size` 塞回建構式 →
跑兩道防線 → **用備份副本 copy 回去還原**（md5 核對，不做反向 sed）→ 重跑 `fxvocab` 確認回綠。

| 繞法 | 掃描（`node tests/fxvocab.test.mjs`） | 執行期（`traitfx-drive --only=eliteSelfCut`） | 判紅的是哪一道 |
|---|---|---|---|
| ①`{size:S}` | **exit 1**　`zuling.js:416 size:（…o.size 已拒收…）` | **case FAIL**（`handled=false`、`size=0/0of0`、`★未量到★`）；process exit 0 | **建構式 throw**（`iconSizeSrc`）＋掃描 |
| ②`setScalar(S * …)` | **exit 1**　`zuling.js:432 knife.scale` | **exit 1**　`違規 1 次`、`scale.x 被直接寫成 0.324122085048011` | 執行期斷言＋掃描 |
| ③`setScalar(0.56 * …)` | **exit 1**　`zuling.js:432 knife.scale` | **exit 1**　同上 | 執行期斷言＋掃描 |
| ④別名後 `setScalar` | **exit 1**　`zuling.js:432 m2.scale` | **exit 1**　`scale.x 被直接寫成 0.02` | 執行期斷言＋掃描 |
| ⑤`multiplyScalar` | **exit 1**　`zuling.js:432 knife.scale` | **exit 1**　`scale.x 被直接寫成 0.011575788751714677` | 執行期斷言＋掃描 |
| ⑥`scale.x=` | **exit 1**　3 處 `knife.scale` | **exit 1**　`scale.x 被直接寫成 0.02` | 執行期斷言＋掃描 |
| ⑦子節點／索引取用 | **exit 1**　`knife.children[0].scale`、`marks[0].scale` | **exit 1**　`徽記 knife:part 的 scale.x 被直接寫成 0.02` | 執行期斷言＋掃描 |

**還原**：七次每次都貼了「還原後 `node tests/fxvocab.test.mjs` → exit 0／16 綠 0 紅」。

**照實記錄兩件事**：
1. **①在執行期是「沒演成」而不是「尺寸被擋」**——`st.icon` 在建構式 throw ⇒ `fn(stage)` 整支掛掉 ⇒
   `handled=false`、`stats.thrown=1`，`traitfx-drive` 那一套判 FAIL（`0/1 pass`），
   但 `traitfx-drive` 的**行程** exit code 沿用既有慣例（逐套 FAIL 不改行程碼），所以那一跑 exit 0。
   ①的 exit 1 來自掃描那一道。
2. **①那一跑的尺寸鎖印的是「★未量到★」**——沒有任何徽記被造出來，`iconMade=0`。
   這正是活性條款設計要講的話：那一跑**沒有量到**這條斷言，不是「通過」。

**掃描自身的鑑別力（in-memory 突變體，原檔唯讀）**：`--mutate=4..10` 就是這七條，
七個全部 **exit 1**，而且紅在**行為斷言**（「徽記尺寸有第二份來源 N 處」）而不是旁枝的活性計數
——活性檢查已刻意排在行為斷言之後（`02 §6.1` 第 1 條）。

---

## 3. N12 鑑別力：canary 一次蓋三表

值的證據＝`docs/experiments/2026-09-12-size-guard-evidence/n12-canary-values.txt`（走真實 `vocab.js`，不是重建的模型）：

```
健康態          sizeOf(knife)=0.56   flatSizeOf(hat)=0.2    markSizeOf(seal)=0.2
舊 canary（只改 sizeOf）  =0.02            =0.2  ← 沒被打到      =0.2  ← 沒被打到
新 canary（改 _resolve）  =0.02            =0.02              =0.02
用備份副本還原後          =0.56            =0.2               =0.2
```

**改法**：`sizeOf`／`flatSizeOf`／`markSizeOf` 一律改成呼叫 `ICON._resolve(kind, tableName, dflt)`，
canary 打 `_resolve`（一行、一個檔）就三張表一起中。程序寫進 `tests/tools/README.md`
與 `js/trait-fx/vocab.js` 的 `_resolve` 註解、`tests/tools/fx-contrast.mjs` 檔頭。

**這條規則自己有沒有鑑別力**（`n12-mutation.txt`）：把 `markSizeOf` 改回「直接讀表、不經 `_resolve`」的舊寫法，
新增的測試 **exit 1**：`canary 下的 markSizeOf(seal)…得到 0.2，預期 0.02`；還原後 16 綠 0 紅。

### L3（844×390@2x、bloom 0.7、seed 7；量測位置未動）

`node tests/tools/fx-contrast.mjs <out> --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost`
＋`python tests/tools/fx-contrast-metrics.py <out>`
（`l3-current-metrics.txt`／`l3-canary-metrics.txt`）：

| 招 | 本樹現值 | 修補報告 §2.2／§7.1 現值欄 | 逐位數 | canary（`_resolve`→0.02） |
|---|---|---|---|---|
| eliteSelfCut | **0.9728% / ΔE 63.35 / px 3202** ✅ | 0.9728 / 63.35 / 3202 | **相同** | 0.0595% / 54.12 ❌ |
| wardImmuneLost | **1.2210% / 107.27 / px 4019** ✅ | 1.2210 / 107.27 / 4019 | **相同** | 0.0507% / 84.85 ❌ |
| biteGamble | **1.9519% / 64.53 / px 6425** ✅ | 1.9519 / 64.53 / 6425 | **相同** | 0.0012% / 47.02 ❌ |
| hauntLost | **2.1682% / 82.02 / px 7137** ✅ | 2.1682 / 82.02 / 7137 | **相同** | 0.0623% / 32.83 ❌ |
| 總表 | `pass 4` | — | | **`pass 0`、四支全 failed** |

⇒ N11／N12 的改法對演出是**零變動**（純重構），canary **4/4 紅**。
四套的 `size=0/…of…` 全是 `違規 0 次／鎖上 15 of 產出 15`。

**★誠實記錄：這四支的 L3 數字分辨不出新舊 canary★**
凍幀點是 `travel` 中點（凍結檔寫死、本卷不得調），而 `hauntLost` 的貼桌腳印（`flatByKind.hat`）
與 `biteGamble` 的印記（`markByKind.seal`）都在 **react 段**才淡入，凍幀當下 `opacity=0`、不進差圖。
所以這四支在**舊 canary 下本來就紅**（紅來自走 `sizeOf` 的飛行徽記），
新 canary 的四格數字與 r2 §7.1 的 canary 欄逐位數相同——**L3 對「N12 有沒有修好」零鑑別力**。
N12 的鑑別力證據是上面那兩項（三個值的真實路徑取值＋`markSizeOf` 繞過 `_resolve` 時測試變紅）。
批 1–3 只要有一支招在 travel 中點的主視覺是貼桌陣或印記，舊 canary 就會對它綠——那才是 N12 要防的洞。

---

## 4. 健康態不退

| 項目 | 指令 | 結果 |
|---|---|---|
| 語彙單元測試 | `node tests/fxvocab.test.mjs` | **16 綠 ／ 0 紅**，exit 0 |
| 同上（任務書指定的形式） | `node --test tests/fxvocab.test.mjs` | `pass 1 / fail 0`，exit 0 |
| 規則測試套（12 檔） | `scratchpad/sg/suite.py`（逐檔 `node tests/*.test.mjs`） | **12/12 exit 0**，見 `suite.txt` |
| 演出治具 27 支 | `node tests/tools/traitfx-drive.mjs … --tier=1 --port=8881` | **27/27 pass**、`err=0`、重複簽章 0；尺寸鎖 `違規 0／鎖上 15 of 15` |
| 演出治具 3 尊 | `node tests/tools/traitfx-drive.mjs … --tier=3 --port=8882` | **3/3 pass**、`err=0`；尺寸鎖 `0 of 0` ＋**★未量到★**（三尊尚未鋪語彙） |
| 四支示範招（tier 2） | `… --tier=2 --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost` | **4/4 pass**、`size=0/15of15` |
| 引擎等價 | `git show 417b197:index.html > scratchpad/sg/old.html; node tests/tools/trace-eq.mjs scratchpad/sg/old.html index.html` | `{"equal":true}`、seeds 1..20 逐位元組相等 |

`suite.txt` 逐檔：aistake 8／conscap 5／duel-desync 7／emblem-collision 9／fxtier 14／fxvocab 16／
legend 32／lineup-order 8／nightrules 16／review 28／roles-balance 32／wish16 36，**失敗全 0**。

**★`trace-eq` 對本卷零鑑別力，照實記★**（GUIDE §11.29 第 14 點，`docs/IMPLEMENTATION_GUIDE.md:1829`）：`index.html` 零 diff，
而 `load.mjs` 只抽 `index.html` 的第一個 `<script>` 在 node 裡跑、**完全不載入 `js/`**，
所以「逐位元組相等」在這一卷是恆真。對 `js/trait-fx*` 有鑑別力的等價證據是上表的
L3 四格逐位數相同、與 27＋3 支 `traitfx-drive` 全綠。

---

## 5. 效能不退

**沒有加每幀重設**：鎖走的是 accessor（讀取完全不攔），不是「每幀把 scale 寫回去」。
理論成本只有「≤5 個物件的 `scale.x/y/z` 讀取變成 getter」，而且只在 27 支裡的 4 支演出期間存在。
即使如此仍照凍結檔量了 `duel-perf`。

基準樹＝`git archive 417b197 | tar -x -C scratchpad/sg/base417`（不用 `git worktree`，本 agent 被隔離）。
指令：`node tests/tools/duel-perf.mjs perf <out>.json --uncap --port=888x [--root=scratchpad/sg/base417]`。
全部數字在 `perf.txt`。

**★訊號忽紅忽綠，先歸因再用（`02 §6.2`）★**
第一輪用**區塊**順序（先跑完 3 次新版、再跑 3 次基準），比值 **0.9518**（壓在 0.95 線上、全距不重疊）。
改成**交錯**（base／new 一輪一支，共 7 輪）之後，同一份程式碼的新版落在 480.6–546.2，
把區塊那 3 跑（480.8／491.3／491.7）整個包進去 ⇒ 波動來源是**環境時序（機器狀態）**，不是受測物：
同一棵樹、同一份程式碼在不同時段就能差 13%。採用的是交錯那一組（GUIDE §11.27「量測紀律（二版學到的）」，`docs/IMPLEMENTATION_GUIDE.md:817-820`：
「交錯跑、看中位的中位與全距有沒有重疊」）。

| 組 | n | `rendersPerSec` 中位 | 全距 | 比值 |
|---|---|---|---|---|
| 基準 `417b197` | 6 | **525.3** | 487.1–546.6 | — |
| 本樹 | 7 | **529.6** | 480.6–546.2 | **1.0082 ≥ 0.95 ✅** |
| （區塊組，受汙染、僅記錄） | 3 / 3 | 516.2 / 491.3 | — | 0.9518 |

交錯組的兩個全距幾乎完全重疊 ⇒ **量不到差異**。

**draw call（依 `visible` 分層；`02 §2.1` 修訂八：不同 `visible` 不可比）**

| `visible` | 基準 | 本樹 |
|---|---|---|
| 15 | 926, 927, 930, 931, 931, 932 | 908, 928, 930 |
| 16 | 961, 970 | 962, 966, 968, 968, 968, 968, 970 |

兩層的本樹最大值都**沒有超過**基準最大值（930 ≤ 932、970 ≤ 970）⇒ **不增**。
（`visible=14` 只有基準有一個樣本 890，不成對，不入比對。）
`renderPassesPerFrame` 兩邊都是 10、`gl` 兩邊同為 ANGLE/D3D11 AMD 780M。

---

## 6. 改動清單與範圍對應

`git diff --stat 417b197..HEAD`（見 §7 實際輸出）逐檔對應任務書範圍：

| 檔案 | 對應範圍條 | 改了什麼 |
|---|---|---|
| `js/trait-fx/vocab.js` | 積木／`ICON`（**數字一個沒動**） | `_resolve` 共同出口（N12）＋改寫尺寸防線註解（N11） |
| `js/trait-fx.js`（`makeStage`／`st.icon` 所在檔） | 積木本身 | `lockIconScale()`／`setLockedScale()`／`st.iconScale()`／`stats.sizeViolations`·`iconMade`·`iconLocked`·`sizeViolationMsg`；`icon()`／`icons()` 掛鎖；`iconSizeSrc` 訊息改指 `st.iconScale` |
| `js/trait-fx/zuling.js` | 四支示範招之一（`eliteSelfCut`） | 1 行：`knife.scale.setScalar(st.iconSize * (…))` → `st.iconScale(knife, …)` |
| `js/trait-fx/xianghuo.js` | 四支示範招之二三（`wardImmuneLost`／`biteGamble`） | 3 行：`bell`／`seal`／`stamp` 同上 |
| `js/trait-fx/yinqi.js` | 四支示範招之四（`hauntLost`） | 1 行：`F.mesh` 同上 |
| `tests/fxvocab.test.mjs` | 掃描 | 規則改成按效果寫（成員鏈／別名／索引／`st.grow`）；`--mutate=4..10` 七條繞法；新增 `_resolve` 共同出口測試；行為斷言排到活性之前 |
| `tests/tools/traitfx-drive.mjs` | 執行期斷言 | 每套讀回 `stats` 判 `sizeOK`，納入 `verdict.pass`；逐套與彙總印 `size=違規/鎖上of產出`；違規時 `process.exitCode=1` |
| `tests/tools/fx-contrast.mjs` | canary 程序＋執行期斷言 | 檔頭寫入 canary 打 `_resolve` 的程序與理由；每套讀回 `stats` 判 FAIL；`shots.json` 多記 `sizeGuard` |
| `tests/tools/README.md` | 文件 | 三道防線的總覽＋L3 canary 程序 |
| `docs/experiments/2026-09-12-size-guard-report.md`／`-evidence/` | 新增報告與證據 | 本檔與實跑輸出 |

**沒動**：`index.html`（`trace-eq` 逐位元組相等）、引擎、`ICON` 的任何數字
（`size 0.44`／`byKind 0.56,0.46,0.62,0.40`／`flatByKind hat 0.20`／`markByKind seal 0.20` 一字未改）、
其他 23 支招、任何門檻／seed／視口（L3 門檻 0.8%／ΔE 28、seed 7、844×390@2x 都是原值）。

**四支示範招的 L3 數字與修補報告 §2.2 現值欄逐位數相同**（§3 的表）⇒ 那四支是純重構。

### 範圍外、留給呼叫端的一件事 —— **修補批已納入範圍並改掉（見 §8 LOW-1）**

~~`docs/IMPLEMENTATION_GUIDE.md` §11.26 第 11 點仍寫「L3 的 canary 打在 `ICON.sizeOf()` 的回傳值上」~~
★章節號本身也寫錯了（覆審 r4 LOW-1）：實際是 **§11.29 第 11 點**（`docs/IMPLEMENTATION_GUIDE.md:1798-1805`）。
修補批已把它改成 `ICON._resolve()`、把過時的掃描規則改掉，並補上 MEDIUM-4 的已知限制。

---

## 7. 指令原文與最終狀態

```
$ git diff --stat 417b197..HEAD
（見下方實際輸出）

$ sh docs/experiments/2026-09-12-size-guard-evidence/denominator.sh
$ node tests/fxvocab.test.mjs                       → 16 綠 ／ 0 紅（exit 0）
$ node --test tests/fxvocab.test.mjs                → pass 1 / fail 0（exit 0）
$ node tests/fxvocab.test.mjs --mutate=4..10        → 七條各 exit 1（行為斷言）
$ node tests/tools/traitfx-drive.mjs scratchpad/sg/drive-t1.json --tier=1 --port=8881   → 27/27 pass
$ node tests/tools/traitfx-drive.mjs scratchpad/sg/drive-t3.json --tier=3 --port=8882   → 3/3 pass
$ node tests/tools/fx-contrast.mjs scratchpad/sg/l3/current --port=8845 --only=<四支>
$ python tests/tools/fx-contrast-metrics.py scratchpad/sg/l3/current                    → pass 4
$ node tests/tools/fx-contrast.mjs scratchpad/sg/l3/canary  --port=8847 --only=<四支>   （canary 套在 _resolve）
$ python tests/tools/fx-contrast-metrics.py scratchpad/sg/l3/canary                     → pass 0
$ git show 417b197:index.html > scratchpad/sg/old.html
$ node tests/tools/trace-eq.mjs scratchpad/sg/old.html index.html                       → equal:true
$ node tests/tools/duel-perf.mjs perf scratchpad/sg/perf-new<i>.json  --uncap --port=8884
$ node tests/tools/duel-perf.mjs perf scratchpad/sg/perf-base<i>.json --uncap --port=8885 --root=scratchpad/sg/base417
```

`scratchpad/` 在 `.gitignore` 內（中間產物不版控）；要重跑的人照上面的指令重建即可。


---

# 8. 修補批（覆審 r1 ＝對抗式覆審 r4，2026-09-12）

> 起點 `0117315`。覆審報告原文 `scratchpad/review-size-guard-r1.md`（scratchpad 在 .gitignore 內）。
> 覆審結論：**N12 真的修好；N11 表面修好（HIGH）**——覆審員自己設計四條繞法，三道防線全綠，
> 其中一條讓 L3 canary 跑出 `ok:true` ＝恆綠儀式復現。

## 8.0 逐條三態

| # | 項目 | 三態 | 證據 |
|---|---|---|---|
| **HIGH-1** | 「涵蓋自然 100%」是假的；四條繞法（父層 Group／換 geometry／自寫 matrix／`defineProperty` 蓋 accessor）全綠 | **真的修好** | §8.1 收斂＋§8.2 按效果寫的世界尺寸稽核；十一條繞法逐條實跑全紅（`bypass11.md`）；決定性繞法 F 的 canary 由 `ok:true` 翻成 `pass 0`（`decisive-F.md`）；三處「100%」字樣已刪（§8.6） |
| **MEDIUM-1** | 違規的 throw 被吞掉、還靜默殺死整條 tween | **真的修好** | `js/trait-fx.js` 三個 `catch` 改走 `noteThrow()`，記進 `stats.tweenErrors`／`tweenErrorMsg`，三支治具納入判定（§8.3）。實測：繞法 E（`defineProperty` 蓋 accessor，丟的是 TypeError 不經記帳線）靠這一條變紅 |
| **MEDIUM-2** | 23 套 `made=0` 卻 `sizeOK:true`＝空真 | **真的修好** | 三態 `n/a`／`ok`／`fail` ＋ `EMBLEM_CASES` 名單；`--tier=1` 實跑印 `ok 4／n/a 23／fail 0`；把示範招的徽記拿掉 ⇒ `★用到徽記的招卻是 n/a` ＋ exit 1（`medium2-empty-truth.md`） |
| **MEDIUM-3** | 正式 L3 走的 `duel-drive` 不讀這筆記帳 | **真的修好** | `duel-drive.mjs` 從 `window.__yaoshi3d.traitFx.sizeGuard()` 取回、寫進 `out.json` 的 `sizeState`、fail 時 exit 非 0。**真實對決實跑到 `ok`**：14 場、鎖上 92 of 產出 92、稽核 1872 次（§8.4） |
| **MEDIUM-4** | L3 凍幀 430ms 量不到印記／貼桌陣 | **表面修好（限制照實寫下來，殘留由別的防線補）** | L3 這一格的鑑別力沒有變；改的是把限制寫進 `tests/tools/README.md` 與 GUIDE §11.29 第 11 點，並說明世界尺寸稽核**不依賴凍幀**、印記與貼桌陣（含 InstancedMesh 逐實例）都在它的涵蓋裡（§8.5） |
| **LOW-1** | 報告三處章節引用錯 | **真的修好** | §5／§6／§7 的 `§11.26` 改成 `§11.29 第 14 點`／`§11.27`；GUIDE §11.29 第 11 點本身也改了（§8.6） |
| **LOW-2** | `fxIcons.scale` 是沒鎖的可寫倍率欄 | **真的修好** | `auditInstances()` 每幀檢查它是有限數且落在 `ICON.scaleRange`，否則判違規 |
| 覆審 §4.5 未確認的疑慮 | `im.setMatrixAt(i, m)` 繞得過鎖與掃描 | **真的修好** | `auditInstances()` 逐 instance `decompose()`，對 `fxIcons.size × 相對倍率` 比對 |

## 8.1 收斂：把「會改變世界尺寸的屬性」全部鎖死

`js/trait-fx.js` 的 `lockIconScale()`（`:189-236`）現在鎖的是一組屬性，不是一顆 Vector3：

| 鎖住的東西 | 擋掉的繞法 | 形式 |
|---|---|---|
| `scale` 這個屬性本身 | `Object.defineProperty(knife,'scale',{value:new Vector3(0.02)})` | `writable:false, configurable:false` |
| `scale.x`／`y`／`z` | r3 七條（別名／`multiplyScalar`／`scale.x=`／子節點與索引…） | accessor，**`configurable:false`**（r3 寫 `true`＝繞法 E 的入口） |
| `geometry` | r4 **B**（置換 geometry） | accessor（不是 `writable:false`——後者丟的 TypeError 不帶語意） |
| `matrixAutoUpdate`／`matrixWorldAutoUpdate` | r4 **C**／**F**（自寫 `matrix`／`matrixWorld`） | accessor，只准是 `true` |
| `userData.fxIconBase`／`fxIconKind` | 改基準再呼叫合法 API | `writable:false, configurable:false` |
| `userData.fxIcons.size` | 群體徽記改逐幀重排用的尺寸 | `writable:false` |

合法入口 `st.iconScale(mesh, k)` 另加**倍率區間** `ICON.scaleRange = [0.2, 2.2]`（`vocab.js`）
——沒有它，`st.iconScale(m, 0.02 / base)` 就是絕對尺寸的後門，合法入口自己變成第二份來源。
四支示範招實際用到 0.35～1.9，區間留了餘裕；要超出代表這個 kind 的**尺寸**該改，請改三張表。

## 8.2 按效果寫：每幀量世界尺寸（`auditSizes`）

`js/trait-fx.js:241-300`，排在 run 每幀更新的最後（量到的是這一幀真正要送去畫的世界矩陣）：

1. `geometry` 身分＝`emblems.js` 的共用幾何（換了就判紅，即使鎖被繞過）；
2. `updateWorldMatrix(true, true)` → `matrixWorld.decompose()` 取**世界縮放**，
   必須等於「積木自己最後一次合法寫進去的值」沿祖先鏈的連乘；
3. 祖先鏈上**未登記**的節點縮放必須是 1（r4 繞法 A 的父層 Group 就是踩這條）；
4. InstancedMesh 逐 instance `decompose()`，對 `fxIcons.size × 相對倍率` 比對（`setMatrixAt` 那條路）；
5. 診斷欄：世界寬度（世界縮放 × geometry 單位寬，**旋轉無關**）與 `Box3.setFromObject` 的對角線（抽樣）。

**★判定為什麼不直接用 `Box3.setFromObject` 的跨距（與任務書字面的差異，理由寫在這裡）★**
徽記是逐幀朝鏡頭的 billboard，旋轉中物件的世界 AABB 跨距隨朝向變（同尺寸能差到 √2 倍）。
要用它當判準就得把容差放寬到「連 0.93 倍的繞法都放行」——那正是 r4 決定性繞法 F 的倍率
（寫死 0.52 對 `base 0.56`）。所以判定用旋轉無關的量，`Box3` 只留在診斷欄。
`updateWorldMatrix(true, true)` 與 `Box3.setFromObject` 兩支 API 都照任務書用了。

**★量測位置為什麼在引擎裡而不是在治具裡（第二個差異）★**
任務書寫「在 `traitfx-drive.mjs` 與 `duel-drive.mjs` 加世界包圍盒斷言」。實作放在
`js/trait-fx.js`，由三支治具讀 `stats`／`traitFx.sizeGuard()`。三個理由：
① 治具那一側**拿不到那些物件**——`traitfx-preview.html` 與 `index.html` 都在本批的「不動」清單裡，
沒有把徽記清單暴露出來的 API；② 寫在引擎裡才量得到**每一幀**（治具只能在幾個取樣點量，
而繞法 A／C 的效果可能只在某幾幀成立）；③ 一份實作、三支治具共用，不會出現兩份會分岔的斷言
——這正是整卷在做的「單一事實來源」。治具那一側做的是判定與活性檢查（三態）。

**通用性**（製作人交代「之後要沿用到紙紮道具」）：稽核吃的是 `SIZED` 這份登記表，
`lockIconScale(run, obj, base, kind, geom)` 是通用的登記入口——之後的紙紮道具只要在自己的
工廠裡呼叫它就進入同一道防線。**本批只接 `st.icon`／`st.icons`／`st.mark` 三條路**。

## 8.3 十一條繞法全紅（＋決定性繞法 F）

完整輸出：`docs/experiments/2026-09-12-size-guard-evidence/bypass11.md`、`decisive-F.md`。
做法同前批：備份副本 → **加行**（①是把 `o.size` 塞回建構式）→ 跑兩支治具 → copy 備份副本還原（md5 核對）
→ 重跑 `fxvocab` 確認回綠（每條都貼了）。

| # | 繞法 | 掃描 exit | 執行期 exit | 判紅的是哪一道 |
|---|---|---|---|---|
| 1 | ①`{size:S}`（建構式） | **1** | **1** | 入口 throw（`handled=false`）＋`EMBLEM_CASES` 的 `n/a` 判紅＋掃描 |
| 2 | ②`setScalar(S * …)` | **1** | **1** | 執行期鎖＋掃描 |
| 3 | ③`setScalar(0.56 * …)` | **1** | **1** | 執行期鎖＋掃描 |
| 4 | ④別名後 `setScalar` | **1** | **1** | 執行期鎖＋掃描 |
| 5 | ⑤`multiplyScalar` | **1** | **1** | 執行期鎖＋掃描 |
| 6 | ⑥`scale.x =` | **1** | **1** | 執行期鎖＋掃描 |
| 7 | ⑦子節點／索引取用 | **1** | **1** | 執行期鎖＋掃描 |
| 8 | **A 父層縮放 Group**（r4） | **1** | **1** | **世界尺寸稽核**（未登記祖先縮放 ≠ 1）＋掃描（`.add(knife)`／`knife.parent`） |
| 9 | **B 置換 geometry**（r4） | **1** | **1** | `geometry` accessor ＋稽核的 geometry 身分＋掃描（`knife.traverse`） |
| 10 | **C `matrixAutoUpdate=false` ＋自寫 matrix**（r4） | **1** | **1** | `matrixAutoUpdate` accessor ＋掃描 |
| 11 | **E `defineProperty` 蓋掉 accessor**（r4） | **1** | **1** | `configurable:false` ⇒ TypeError，由 **MEDIUM-1 的 `tweenErrors`** 記起來＋掃描 |
| 12 | **F 每幀 compose 絕對值 0.52**（r4 決定性實驗） | **1** | **1** | `matrixAutoUpdate` accessor（違規 1 次）＋掃描 |
| 13 | F2 只寫 `matrix`、不關 `matrixAutoUpdate`（對照組） | **1** | **0** | 只有掃描。**執行期綠是對的**：`matrixAutoUpdate` 仍是 true ⇒ `updateMatrix()` 每幀把手寫矩陣蓋回去，**效果根本沒發生**，稽核量到的世界尺寸與健康態相同 |

**★決定性實驗的翻轉（`decisive-F.md`）★**

| | r3（覆審 r4 實測） | 本批 |
|---|---|---|
| F ＋ 健康態 | `area_pct 1.0132／de 61.31／ok:true` | `size=fail`、違規 1 次、`fx-contrast` **exit 1**；像素 `area 0.4059／ok:false／pass 0` |
| F ＋ L3 canary（`_resolve()=>0.02`） | **與健康態逐位數相同**、`GATE pass 1` ⇒ 恆綠儀式 | `area 0.0425／ok:false／**pass 0**`、`fx-contrast` exit 1 |

⇒ 健康態與 canary 態**不再逐位數相同**（0.4059 vs 0.0425），canary 恢復鑑別力。

## 8.4 三支治具都讀這筆記帳（MEDIUM-3）

| 治具 | 讀法 | 實跑 |
|---|---|---|
| `traitfx-drive.mjs` | `__tfx.stats()` | `--tier=1` **27/27 pass**、`ok 4／n/a 23／fail 0`、稽核 240 次；`--tier=3` **3/3 pass**、`n/a 3` ＋★未量到★ |
| `fx-contrast.mjs` | `__tfx.stats()` | 四支 `size=ok`、稽核 390 次；`pass 4` |
| `duel-drive.mjs`（**批 1–3 的正式 L3**） | `window.__yaoshi3d.traitFx.sizeGuard()`（`js/renderer.js:182` 已把 traitFx 掛上，不動 `index.html`） | 真實對決 14 場：`徽記世界尺寸斷言：ok　違規 0／鎖上 92 of 產出 92／稽核 1872／tween 安靜死掉 0`，世界寬度 `{"knife":[0.24,0.448],"hat":[0.578957,0.784],"hat:instanced":[0.392,0.392]…}` |

`duel-drive` 先跑 `--duels=4` 時是 `n/a`（那四場沒抽到用徽記的招），治具**照實印「未量到，不得當成通過」**；
加到 `--duels=16`（實際打了 14 場）才量到 `ok`。這一段是「驗在對方的接收端」的實證，不是結構推論。

## 8.5 MEDIUM-4：L3 的已知限制寫進文件

`tests/tools/README.md` 與 `docs/IMPLEMENTATION_GUIDE.md` §11.29 第 11 點都加了：
L3 凍在 `travel` 中點，**印記（`markByKind`）與貼桌陣（`flatByKind`）在 `react` 段才淡入**，
那一刻幾乎不貢獻像素（`biteGamble` 在 canary 下整張差圖只剩 4 px）⇒ 以它們為主視覺的招，
L3 那一格對「尺寸來源」零鑑別力；**這條殘留由世界尺寸稽核補**（每幀量、不依賴凍幀、不依賴像素，
印記與貼桌陣含 InstancedMesh 逐實例都在涵蓋裡）。要在 L3 也看得到就得另挑時點或另加一格。

**★沒有動凍結檔本身★**：`docs/experiments/2026-09-11-acceptance-fx-legibility.md` 是判準檔，
本批只在「引用處」（README、GUIDE、本報告）寫下這條限制，沒有改它一個字
（`02 §2.1`：判準檔要改得走同意程序）。要不要把這條收進凍結檔的 §2.1 修訂紀錄，交呼叫端裁。

## 8.6 HIGH-1 的宣稱字樣

三處「分母歸一／涵蓋自然 100%／把還沒有人想到的第五條一起收掉」全部刪掉並改寫成據實的範圍：
`js/trait-fx/vocab.js`（改成逐條列出 r4 四條繞法與現在的四道防線）、
`tests/fxvocab.test.mjs`（明寫「那句是假的，已刪：鎖住一個屬性 ≠ 收斂一個效果」）、
`tests/tools/README.md`（改寫成四道防線各自守得住什麼）。
本報告 §2 那句也在本節一併作廢——**能說的只有「①②④按入口寫、③按效果寫，新的繞法要由③接住」**。

## 8.7 驗收重跑（原七條＋第 8 條）

| # | 項目 | 結果 |
|---|---|---|
| 1 | 分母 | 未變（§1；本批沒有新增／刪除編舞裡的縮放點） |
| 2 | 鑑別力 | **十一條繞法＋F 全紅**（§8.3 表；`bypass11.md`、`decisive-F.md`），每條都用備份副本還原並重驗回綠 |
| 3 | N12 | 未動；`_resolve` canary 仍 `pass 0`、三值同時變 0.02（`n12-canary-values.txt`） |
| 4 | 健康態 | `node tests/fxvocab.test.mjs` **16 綠 0 紅**；12 檔測試套全 exit 0（`r4-suite.txt`）；`traitfx-drive --tier=1` **27/27**、`--tier=3` **3/3**、err=0；`trace-eq` 對 `417b197` `equal:true` |
| 5 | 效能 | 交錯 9 輪：base 中位 **533.3**（n=13，全距 489.3–548.2）／new 中位 **521.0**（n=8，全距 457.5–575.1），比值 **0.9768 ≥0.95**，全距大幅重疊（`r4-perf.txt`） |
| 6 | 範圍 | `git diff --stat 417b197..HEAD`（§8.8），新增 `duel-drive.mjs`（覆審 MEDIUM-3 要求）與 `docs/IMPLEMENTATION_GUIDE.md`（LOW-1 納入） |
| 7 | commit | 逐步 commit、繁體中文、**未合併、未 push** |
| 8 | 十一條突變全紅表 | §8.3 |

**L3 四支逐位數（與修補報告 §2.2 現值欄比對）**：
`0.9728/63.35/3202`、`1.2210/107.27/4019`、`1.9519/64.53/6425`、`2.1682/82.02/7137`
——**四格全部逐位數相同**（`r4-l3-current-metrics.txt`）⇒ 每幀稽核對畫面零影響。
canary（`_resolve()=>0.02`）**`pass 0`、四支全 `ok:false`**（`r4-l3-canary-metrics.txt`）。

**★draw call 照實記★**（`r4-perf.txt`）：依 `visible` 分層後
`visible=16` 本樹 [964, 970] 落在基準 [957…1016] 內；
`visible=15` 本樹 [926, 926, 928, 928, 930, **946**] 對基準 [926, 926, 928, 928, 930, 930]
——**有一個樣本 946 超出基準全距 16 個 call**。兩件事一起說：
① 機制上這道防線**不產生任何可畫的東西**（只讀矩陣、不建 mesh／material／geometry），
② `visible` 是場景組成的粗略代理（GUIDE §11.27 修訂八自己寫過「燒掉一尊 ≈30 個 draw call」），
單一樣本落在 6 樣本窄帶外不足以判定變化。**這一格記為「未完全落在基準全距內」，不宣稱通過。**

## 8.8 修補批的改動清單

| 檔案 | 對應 | 改了什麼 |
|---|---|---|
| `js/trait-fx.js` | HIGH-1／MEDIUM-1／LOW-2 | `lockIconScale` 擴成鎖一組屬性（`configurable:false`）、新增 `auditSizes`／`auditInstances`／`expectedWorldScale`／`unitWidthOf`／`sizeGuard()`、`noteThrow()`、`run.sized`、`stats` 六個新欄位、`st.iconScale` 加倍率區間 |
| `js/trait-fx/vocab.js` | HIGH-1 | 新增 `ICON.scaleRange`；刪掉「涵蓋 100%」的宣稱，改寫成 r4 四條繞法與四道防線 |
| `tests/fxvocab.test.mjs` | HIGH-1 | 掃描規則由 `.scale` 擴成 `scale/geometry/matrix/matrixWorld/matrixAutoUpdate/matrixWorldAutoUpdate/parent/children/traverse` ＋ 禁 `.add(徽記)`；`--mutate` 由 7 條擴成 **11 條** |
| `tests/tools/traitfx-drive.mjs` | MEDIUM-1／2 | 三態 `sizeState`、`EMBLEM_CASES` 名單、`tweenErrors`、世界寬度診斷欄、彙總與 exit code |
| `tests/tools/fx-contrast.mjs` | MEDIUM-1／2 | 同上（L3 每一套都用徽記，所以 `made===0` 在這支就是 `fail`） |
| `tests/tools/duel-drive.mjs` | **MEDIUM-3** | 收工時讀 `window.__yaoshi3d.traitFx.sizeGuard()`，`sizeState` 落 `out.json`，fail 時 exit 非 0 |
| `tests/tools/README.md` | HIGH-1／MEDIUM-4 | 四道防線改寫、三態說明、L3 的已知限制 |
| `docs/IMPLEMENTATION_GUIDE.md` | **LOW-1** | §11.29 第 11 點：canary 改 `_resolve()`、掃描規則改寫、指向 README 當權威、補 MEDIUM-4 限制 |
| 本報告 | LOW-1 | 三處章節引用改正；新增本節 |
| `…-evidence/bypass11.md`／`decisive-F.md`／`medium2-empty-truth.md`／`r4-*.txt` | 證據 | 十一條繞法、決定性實驗、空真突變、L3 現值／canary、測試套、效能 |
