# v0.55.1　`?fxvocab` 開關：四支示範招預設退回 0.54 演出（2026-09-12）

**結論先行**：開關做好了，七條驗收**全綠**。線上（不帶參數）＝ 0.54 的演出，`?fxvocab=1` ＝ v0.55 的徽記剪影版。

| 驗收 | 結果 |
|---|---|
| 1 預設＝0.54（`traitfx-drive` 27/27 t1、3/3 t3、四支 t2 4/4、0 error；sigdump ↔ `6a839de` 逐行相同；`_v054` 本體 md5 相同） | 🟢 |
| 2 `?fxvocab=1`＝0.55（sigdump ↔ `417b197` 逐行相同；`fxvocab.test.mjs` 全綠且**一行斷言未動**；L3 四支數字逐位數相同） | 🟢 |
| 3 等價（`trace-eq` 對基準 HEAD 逐位元組相等，開／關各一次；`--mutate` differs） | 🟢 |
| 4 規則測試套全綠（12 套，exit 0） | 🟢 |
| 5 鑑別力（登記點分派反過來 → 驗收 1 的 sigdump 立刻不同；還原後再綠） | 🟢 |
| 6 手機視口實拍（關＝無橘色階梯方塊、開＝有） | 🟢 |
| 7 `git diff --stat` 逐檔對應、每步 commit、未合併 main、未 push | 🟢 |

基準 HEAD＝`417b197`（v0.55）。worktree＝`C:\Users\shung\OneDrive\桌面\妖市\.claude\worktrees\agent-add254abd18f6312a`。
證據目錄＝`docs/experiments/2026-09-12-fxvocab-switch-evidence/`。

---

## 1. 做了什麼（改動檔案:行號）

### 1.1 0.54 本體回到三個系別檔（逐字不動，只改函式名）

| 檔 | 行 | 內容 |
|---|---|---|
| `js/trait-fx/zuling.js` | 850–944 | `export const V054`（`eliteSelfCut_v054`）／`export const V054_SHORT`（`eliteSelfCut_v054short`） |
| `js/trait-fx/xianghuo.js` | 980–1150 | `wardImmuneLost_v054`／`biteGamble_v054`／兩支 `_v054short` |
| `js/trait-fx/yinqi.js` | 841–951 | `hauntLost_v054`／`hauntLost_v054short` |

本體取自 `git show 6a839de:js/trait-fx/<系>.js`，**只改了函式標頭那一行**（加 `_v054`／`_v054short` 後綴，
否則會與同檔的 0.55 同名函式撞在一起，`tests/tools/fn-hash.mjs` 也會把兩份切成同一個區塊）。
0.55 的 `MOVES`／`SHORT` 一行未動（驗收 1 的 `fn-hash` 57 個區塊未變動）。

### 1.2 開關本身

| 檔 | 行 | 內容 |
|---|---|---|
| `index.html` | 4330–4339 | `PW_FX.VOCAB_ON:false` ＋ 為什麼要有它的註解（**開關的唯一來源**） |
| `index.html` | 4374–4379 | `?fxvocab=1/0` 解析，寫法與上面兩條 `?closeup`／`?fxtier` 逐字同一套 |
| `index.html` | 6949–6955 | renderer.js 入口的 src 由 `?v=VERSION` 變成 `?v=VERSION&fxvocab=0\|1` |
| `index.html` | 2091 | `VERSION="0.55.1"`、`VERSION_NOTE` 首段 |
| `js/trait-fx.js` | 32–34 | `loadMoves` 多讀 `V054`／`V054_SHORT` 兩個 export |
| `js/trait-fx.js` | 41–52 | `VOCAB_ON`：先讀模組查詢字串 `V`（產品頁那條路），`V` 為空才退到 `location.search`（治具頁那條路） |
| `js/trait-fx.js` | 56–61 | `byTrId()` 剝掉後綴 ＋ **登記點的唯一一次分派** |
| `js/trait-fx.js` | 63–69 | `TRAIT_MOVES`／`TRAIT_MOVES_SHORT` 尾巴多 `Object.assign` 一層；`export const FX_VOCAB_ON` 給治具讀 |

**為什麼開關的值要繞模組查詢字串**：`PW_FX` 是 classic script 的 `const`，3D 層（module）看不到它。
既有的 `?v=<VERSION>` 已經是「index.html → renderer.js → 各模組」那條接力路（`js/renderer.js:8-13` 檔頭），
本批只是在同一條路上多帶一個鍵，不另開第二條。四支函式本體裡**一個 `if` 都沒有**。

### 1.3 治具

| 檔 | 行 | 內容 |
|---|---|---|
| `tests/tools/traitfx-drive.mjs` | 4–7 / 58–62 | 用法補 `--fxvocab=1`；新增並 export `fxvocabQ(opt)`（三支治具共用，不各寫一份） |
| `tests/tools/traitfx-drive.mjs` | 95 | 治具頁 URL 尾巴接 `${fxvocabQ(opt)}` |
| `tests/tools/blindread-sheet.mjs` | 4–5 / 29 / 88 / 96 / 161 | 用法、import、`shootOne(..., opt)`、URL |
| `tests/tools/fx-contrast.mjs` | 6–8 / 48 / 115 | 用法、import、URL |
| `tests/tools/duel-drive.mjs` | **未動** | 它本來就吃完整 URL，`?fxvocab=1` 直接寫在 URL 裡（與 `?fxtier=0` 同一條路） |

---

## 2. 驗收逐條（指令原文＋輸出）

### 驗收 1　預設＝0.54 —— **綠**

```
$ node tests/tools/traitfx-drive.mjs …/gates/t1-work.json --tier=1 --port=8862 --sigdump=…/sig-t1-work.txt
27/27 pass · 重複簽章 0        （全 27 行 err=0）
$ node tests/tools/traitfx-drive.mjs …/gates/t3-work.json --tier=3 --port=8864 --sigdump=…/sig-t3-work.txt
3/3 pass · 重複簽章 0
$ node tests/tools/traitfx-drive.mjs …/gates/t2four-work.json --tier=2 \
      --only=eliteSelfCut,biteGamble,wardImmuneLost,hauntLost --port=8865 --sigdump=…/sig-t2four-work.txt
4/4 pass · 重複簽章 0
```

`--root=` 對 `6a839de` 基準樹（`git worktree add --detach scratchpad/base6a839de 6a839de`）跑同一支治具：

```
$ node tests/tools/traitfx-drive.mjs …/gates/t1-base054.json --tier=1 --port=8863 \
      --root=scratchpad/base6a839de --sigdump=…/sig-t1-base054.txt        → 27/27 pass
$ diff …/sig-t1-base054.txt …/sig-t1-work.txt                             → 無輸出（27 行逐行相同）
$ diff …/sig-t2four-base054.txt …/sig-t2four-work.txt                     → 無輸出（4 行逐行相同）
$ diff …/sig-t3-base054.txt …/sig-t3-work.txt                             → 無輸出（3 行逐行相同）
```

★注意★：基準樹那一跑的 `phases=` 本來就是空的（0.54 的 `js/trait-fx.js` 沒有 `phaseDetail`），
本批**四支 0.54 本體從不呼叫 `st.phase()`**，`run.phaseClaims` 也是空陣列，所以兩邊同樣是 `phases=`
——這不是「治具看不到」，是兩邊真的都沒有打點。其餘 23 支與三尊本來就不呼叫。

逐函式本體 md5（`tests/tools/fn-hash.mjs` 的 `splitFns()`，把 `_v054` 標頭還原成 0.54 的形狀再切）：

```
$ node docs/experiments/2026-09-12-fxvocab-switch-evidence/body-md5.mjs
  SAME  js/trait-fx/zuling.js    MOVES:eliteSelfCut     6a839de=18bc1db769 v054=18bc1db769
  SAME  js/trait-fx/zuling.js    SHORT:eliteSelfCut     6a839de=1ad8ccea59 v054=1ad8ccea59
  SAME  js/trait-fx/xianghuo.js  MOVES:wardImmuneLost   6a839de=b9289be097 v054=b9289be097
  SAME  js/trait-fx/xianghuo.js  SHORT:wardImmuneLost   6a839de=24d5b0651b v054=24d5b0651b
  SAME  js/trait-fx/xianghuo.js  MOVES:biteGamble       6a839de=c58f7068b3 v054=c58f7068b3
  SAME  js/trait-fx/xianghuo.js  SHORT:biteGamble       6a839de=adc3fc6787 v054=adc3fc6787
  SAME  js/trait-fx/yinqi.js     MOVES:hauntLost        6a839de=e9ebf4d5c2 v054=e9ebf4d5c2
  SAME  js/trait-fx/yinqi.js     SHORT:hauntLost        6a839de=446c4f2fa6 v054=446c4f2fa6
相同 8 ／ 不同 0（預期 8 ／ 0）                                                     exit 0
```

0.55 那 27 支有沒有被碰到：

```
$ node tests/tools/fn-hash.mjs 417b197 WORKTREE
未變動：57 ／ 變動：0 ／ 新增：8 ／ 消失：0
  ADDED   …  SHORT:eliteSelfCut_v054 / _v054short / wardImmuneLost_v054 / … （8 個＝本批新增的 0.54 本體）
```

★`ADDED` 的區塊標成 `SHORT:` 是 `fn-hash.mjs` 的既有行為★：它只認得 `export default {`／`const MOVES = {`／
`export const SHORT = {` 三個區塊起點，新的 `export const V054 = {` 不在其中，於是沿用上一個區塊名。
**這不影響它的判定力**——8 個鍵都是新名字，不會覆蓋任何既有鍵，27 支的 57 個區塊仍逐一比對到（變動 0）。
本批沒有改這支治具（改驗收工具是移動及格線的一種），只在這裡記下這個讀法。

### 驗收 2　`?fxvocab=1`＝0.55 —— **綠**

```
$ node tests/tools/traitfx-drive.mjs …/gates/t1-on.json --tier=1 --fxvocab=1 --port=8867 --sigdump=…/sig-t1-on.txt
27/27 pass · 重複簽章 0
$ node tests/tools/traitfx-drive.mjs …/gates/t1-base055.json --tier=1 --port=8868 \
      --root=scratchpad/base417b197 --sigdump=…/sig-t1-base055.txt      → 27/27 pass
$ diff …/sig-t1-base055.txt …/sig-t1-on.txt                             → 無輸出（27 行逐行相同）
$ diff …/sig-t2four-base055.txt …/sig-t2four-on.txt                     → 無輸出（4 行逐行相同）
```

單元測試（**斷言、門檻、案例集一行未改**，它本來就不吃這個開關——它量的是 `vocab.js` ↔ 文件 ↔ `emblems.js`
的原始碼對齊，與跑哪一版編舞無關，所以不需要旗標就直接全綠）：

```
$ node tests/fxvocab.test.mjs              → 15 綠 ／ 0 紅   exit 0
$ node tests/fxvocab.test.mjs --mutate=1   → 11 綠 ／ 4 紅
$ node tests/fxvocab.test.mjs --mutate=2   → 14 綠 ／ 1 紅
$ node tests/fxvocab.test.mjs --mutate=3   → 14 綠 ／ 1 紅
$ node tests/fxvocab.test.mjs --mutate=4   → 14 綠 ／ 1 紅
```
四個突變的紅數與 b0 修補報告 §7.1 的 `15 綠/0 紅`、`11/4`、`14/1`、`14/1`、`14/1` 逐項相同。
唯一變動的是那條掃描印出來的**分母**：`79 處 scale 呼叫 → 85 處`（本批新增的 0.54 本體帶進 6 處
`orb`／`ring` 的縮放），落在徽記 mesh 上的仍是 **5 處**（活性門檻 `≥5` 的那一項照舊）。分母變大＝掃得更多，
不是放寬。

L3（`fx-contrast.mjs`，同修補批參數：視口 844×390@2x、bloom 0.7、seed 7、tier 2、凍在 430ms）：

```
$ node tests/tools/fx-contrast.mjs scratchpad/l3-on --only=eliteSelfCut,wardImmuneLost,biteGamble,hauntLost \
      --fxvocab=1 --port=8872
$ python tests/tools/fx-contrast-metrics.py scratchpad/l3-on
eliteSelfCut   area 0.9728% / ΔE 63.35      biteGamble  area 1.9519% / ΔE 64.53
wardImmuneLost area 1.2210% / ΔE 107.27     hauntLost   area 2.1682% / ΔE 82.02
{"gate":{"area_pct_min":0.8,"de_median_min":28.0,...},"nobloom":false,"n":4,"pass":4,"failed":[]}
```
與 `2026-09-12-fx-legibility-b0-fix-report.md` §2.2 **現值欄逐位數相同**（0.9728／1.2210／1.9519／2.1682，
ΔE 63.35／107.27／64.53／82.02）。

### 驗收 3　等價 —— **綠**

```
$ git show 417b197:index.html > scratchpad/base-417b197.html
$ node tests/tools/trace-eq.mjs scratchpad/base-417b197.html index.html
{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}                       exit 0
$ node tests/tools/trace-eq.mjs scratchpad/base-417b197.html scratchpad/vocabon-index.html
{"seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}                       exit 0
$ node tests/tools/trace-eq.mjs index.html --mutate
{"mutation":"CFG.ROUNDS 12 -> 11","differs":true,"verdict":"突變驗紅 ✅"}                exit 0
$ node tests/tools/trace-eq.mjs scratchpad/base-417b197.html index.html --beats
{"equal":true,"injected":true,"verdict":"拍序列逐位元組相等 ✅"}
```

★「開關開著」那一跑怎麼做的★：`tests/tools/load.mjs:8` 把 `location` 寫死成 `{search:''}`，
所以 `?fxvocab=1` 在 node 端**永遠打不開**，拿原檔跑兩次只會得到同一份 trace（那是恆真、沒有證明力）。
所以改成把**預設值本身翻過來**：`scratchpad/vocabon-index.html` ＝ `index.html` 的副本、
`VOCAB_ON:false` 改成 `VOCAB_ON:true`（原檔全程唯讀，腳本 `scratchpad/vocab_on_copy.py`）。
這樣比的才是「開關開著時引擎輸出一樣」。

### 驗收 4　規則測試套 —— **綠**

```
$ sh scratchpad/run-tests.sh
review             通過 28　失敗 0               exit 0
nightrules         結果：16 綠 ／ 0 紅           exit 0
duel-desync        結果：7 綠 ／ 0 紅            exit 0
lineup-order       結果：8 綠 ／ 0 紅            exit 0
legend             32 過 / 0 失敗                exit 0
aistake            通過 8　失敗 0                exit 0
conscap            通過 5　失敗 0                exit 0
roles-balance      32 過 / 0 失敗                exit 0
wish16             PASS=36 FAIL=0                exit 0
fxtier             結果：14 綠 ／ 0 紅           exit 0
fxvocab            結果：15 綠 ／ 0 紅           exit 0
emblem-collision   結果：9 綠 ／ 0 紅            exit 0
```
十二套的數字與 b0 修補報告驗收 6 逐項相同。

### 驗收 5　鑑別力 —— **綠**

把 `js/trait-fx.js:60-61` 的分派**刻意反過來**（`VOCAB_ON ? byTrId(...) : {}`，＝開關關卻選 0.55），
重跑驗收 1 的 tier 1 sigdump 與 `6a839de` 基準比：

```
$ diff …/gates/sig-t1-base054.txt scratchpad/sig-t1-mut.txt         → exit 1，8 行（4 對）不同
biteGamble     meshes=bolt+burst                → meshes=burst+emblem:seal+mark:seal+trail
eliteSelfCut   meshes=beam+burst+orb            → meshes=burst+emblem:knife+trail
hauntLost      meshes=orb                       → meshes=burst+emblem:hat+trail
wardImmuneLost meshes=beam+burst+ring           → meshes=burst+emblem:bell+mark:bell+trail
（phases 也由空變成 windup:1,travel:1,react:1）
```

**還原用備份副本**（`cp scratchpad/trait-fx.js.backup js/trait-fx.js`，不做反向 sed），
還原後 `git status --porcelain js/` 乾淨，且四支的 tier 1 簽章又與 `6a839de` 逐行相同：

```
$ node tests/tools/traitfx-drive.mjs … --tier=1 --only=<四支> --port=8874 --sigdump=scratchpad/sig-t1-restore.txt
4/4 pass
$ diff scratchpad/sig-t1-base054-four.txt scratchpad/sig-t1-restore.txt   → 無輸出
```
＝**反面也驗過了**：壞掉會紅、健康會綠。

### 驗收 6　手機視口實拍 —— **綠**

```
$ node tests/tools/blindread-sheet.mjs scratchpad/br-off --only=biteGamble --tiers=1 --label --port=8875
$ node tests/tools/blindread-sheet.mjs scratchpad/br-on  --only=biteGamble --tiers=1 --label --fxvocab=1 --port=8876
（兩跑都 handled=true err=0，視口 844×390＋DSF2，六格 1560×1080）
```

- `shots/biteGamble-t1-fxvocab-off.png`　**六格都沒有橘色階梯方塊**：畫面上只有虎爺撲咬、邊光與火星。
- `shots/biteGamble-t1-fxvocab-on.png`　**前四格有大片橘紅色的階梯狀塊面**（`seal` 徽記剪影＋貼桌印記）
  ——正是製作人說的「平面單色 billboard 貼在紙紮 3D 上像剪貼畫」。

### 驗收 7　範圍 —— **綠**

```
$ git diff --stat 417b197..HEAD
 index.html                      |  25 +++++-
 js/trait-fx.js                  |  32 +++++++-
 js/trait-fx/xianghuo.js         | 171 ++++++++++++++++++++++++++++++++++++++++
 js/trait-fx/yinqi.js            | 111 ++++++++++++++++++++++++++
 js/trait-fx/zuling.js           |  95 ++++++++++++++++++++++
 tests/tools/blindread-sheet.mjs |  11 +--
 tests/tools/fx-contrast.mjs     |   6 +-
 tests/tools/traitfx-drive.mjs   |  12 ++-
 8 files changed, 448 insertions(+), 15 deletions(-)
```

| 檔 | 對應哪一條需求 |
|---|---|
| `index.html` | 做法 2（`PW_FX.VOCAB_ON` ＋ `?fxvocab` 解析 ＋ 把值送進 3D 層）與做法 3（`VERSION`／`VERSION_NOTE`）。引擎、`TRAITS`／`POOL`／`LEGENDS`、其餘 `PW_FX` 欄位零 diff |
| `js/trait-fx.js` | 做法 2 的登記點分派（只此一處），＋`FX_VOCAB_ON` 診斷用 export |
| `js/trait-fx/{zuling,xianghuo,yinqi}.js` | 做法 1（0.54 本體以 `_v054` 新名回到各自檔案；0.55 的 57 個區塊 md5 未變動） |
| `tests/tools/{traitfx-drive,blindread-sheet,fx-contrast}.mjs` | 做法 2 末段（headless 治具的 `--fxvocab=1`） |

**未動**（做法 4 的禁列，以 `git diff --stat` 沒有它們為證）：引擎與規則、任何門檻／seed／視口、
`js/trait-fx/vocab.js`、`js/trait-fx/emblems.js`、`tests/*.test.mjs`、其他 23 支招與三尊、`duel-drive.mjs`。

commit：`a9d0393`（實作）＋本批文件 commit；**未合併 main、未 push**。

---

## 3. 額外做的一件事（不在七條裡，但必要）

七條驗收全部量在 **`traitfx-preview.html` 治具頁**上，而那一頁是**直接 `import` `js/trait-fx.js`**
（模組 URL 沒有查詢字串），走的是 `VOCAB_ON` 的 `location.search` 退路。
**產品頁面走的是另一條**：`index.html` → `renderer.js?v=…&fxvocab=` → 各模組用 `import.meta.url` 接力。
治具全綠證明不了產品那條路通（`02 §6.1` 第 5 條：驗在對方的接收端）。所以另外量了一次：

```
$ node docs/experiments/2026-09-12-fxvocab-switch-evidence/page-vocab-probe.mjs --port=8877
PASS index.html（不帶參數）  renderer?v=0.55.1&fxvocab=0  FX_VOCAB_ON=false  招數=30
     短版即完整版={"eliteSelfCut":false,"biteGamble":false,"wardImmuneLost":false,"hauntLost":false} err=0
PASS index.html?fxvocab=0    renderer?v=0.55.1&fxvocab=0  FX_VOCAB_ON=false  …（同上）           err=0
PASS index.html?fxvocab=1    renderer?v=0.55.1&fxvocab=1  FX_VOCAB_ON=true   招數=30
     短版即完整版={"eliteSelfCut":true,"biteGamble":true,"wardImmuneLost":true,"hauntLost":true}  err=0
三組全部符合預期                                                                                  exit 0
```

判準是**行為**不是字串：v0.55 的四支示範招 `SHORT[trId] === MOVES[trId]`（短版就是完整版、只換 BEAT 比例表），
0.54 的短版是另寫的一支函式 ⇒ 兩者不相等。三種狀態各自落在該落的一邊。

以及產品頁面的端到端零錯（`gates/duel-drive.txt`）：

```
預設          → duels 4, errors 0, ys3d true, burn 6/3/3, trait 4, traitFig 4, ver v0.55.1
?fxvocab=1    → 同上逐欄相同
?fxtier=0     → 同上逐欄相同
```
與 b0 修補報告的 `duel-drive` 逐欄相同（只有 `ver` 由 `v0.56a` 變 `v0.55.1`，那正是本批改的 `VERSION`）。

---

## 4. 留給下一棒的三件事

1. **`docs/proposals/2026-09-12-plan-fx-performance.md` 目前不存在**：`VERSION_NOTE` 與
   `index.html`／三個系別檔的註解都指向它（派工指定的字樣）。方向重定的計畫寫好後補上，
   否則那幾個指路變成死連結。
2. **`fn-hash.mjs` 認不得 `export const V054 = {`**：8 個新區塊被標成 `SHORT:`（見驗收 1 末段）。
   目前不影響判定，但批 1 若把更多招搬進 `V054`，值得替它補一個區塊起點——那要另外開工單，
   本批不動驗收工具。
3. **`?fxvocab=1` 的 0.55 版本仍是「已知不可辨」的狀態**（兩輪盲讀 0/3）：它留在開關後面是給治具
   與後續參考用的，不是待驗收的候選版本。
