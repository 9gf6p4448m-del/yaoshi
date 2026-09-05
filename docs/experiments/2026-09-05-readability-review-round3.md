# 演出可讀性小卷（b96cb7c）對抗式覆審——第 3 輪（最後一輪）：反駁「H-2／H-3 已真的修好」

**真的修好 2（H-3、量測母體）／表面修好 0／沒修到 1（H-2）。新 finding：CRITICAL 0、HIGH 1、MEDIUM 3、LOW 4。**

範圍：`git diff 303ac93..b96cb7c -- js/duel-figures.js tests/tools/duel-perf.mjs`。
基準：第 2 輪報告 `docs/experiments/2026-09-05-readability-review-round2.md`、
實作者處置表 `docs/experiments/2026-09-05-duel-readability-report.md:44-51`。
本輪**未修改 repo 任何檔案**（`git status --porcelain` 空）；探針與產物全在 scratchpad。
唯一的 repo metadata 動作：`git worktree add --detach scratchpad/wt303 303ac93`（做 §6.1 鑑別力對照用，
與第 2 輪的 `wt033` 同性質；要清用 `git worktree remove`）。實跑一律 AMD 780M、埠 8971–8976。

---

## 結論表

| 條 | 三態 | 一句話 |
|---|---|---|
| H-2 排數自適應的逃生門 | **沒修到**（且回退） | 第 2 輪點名的「rows 加到 n、排距 2.0/(n−1)」確實堵死了（`rowsMax=4`），但接手的 `fitSteps` 被 `rowsFit` 的鎖點打掉：鎖在第一幀，那時 creature 的 GLB 還沒載完、`shadow.geometry.parameters.radius` 還是預設 0.42，選完就整場不再重驗。凍結視窗 844×390、8 尊虎爺印 **minPair 0.146**（R-3 門檻 0.50），5/5 次一致；**修復前同名冊同量法是 0.286／0.29**，即這一版比修之前更糟 |
| H-3 撞擊夾限只削推出量 | **真的修好** | ①`lane` 不含 `push`、`stat` 是真的靜態徑向；②夾完之後沒有第二個橫向寫入者；③同名冊修復前／後對照：`maxR 2.082→1.457`、腳印外緣 `2.796→2.150`（貼齊 `rimMax`）；R-4 四組 maxΔ **0.00000** |
| 量測母體恢復全母體 | **真的修好** | `visible` 過濾兩處都拿掉，實測每組兩側都回到 n=8；被燒凍住的那尊不會扭曲 minPair（見下） |

---

## H-2 —— 沒修到（新 finding HIGH-1）

### 先講已經修好的那半
`FIG.rowsMax = 4`（`js/duel-figures.js:87`）與 `for (let rows = rows0; rows <= Math.min(FIG.rowsMax, n); rows++)`
（`js/duel-figures.js:557`）確實讓 `rows` 上不去 n，第 2 輪算的排距 2.0/(n−1)＝0.286 這條路封死了。
`fitSteps` 這個機制**本身也是對的**——證據在下面「歸因」那一段：同一頁、同一名冊，只要選排數那一幀拿得到正確腳印，
780×330 這種矮視窗會落到 fit 0.6 並守住 minPair 0.53／0.549。

### 沒修好的那半：`rowsFit` 鎖在「GLB 還沒載完」的那一幀

**碼**
- `js/duel-figures.js:515` `footBase`：腳印半徑讀 `g.shadow.geometry.parameters.radius`。
- `js/creature-figures.js:249-251`：影子建立時是 `new THREE.CircleGeometry(0.42, 22)`，**預設 0.42**。
- `js/creature-figures.js:288-291`：真正的模型腳印 `foot = max(w,d)*0.38` 要等 `loadGlb().then(...)` 才換上去。
- `js/duel-figures.js:373-378`：`onDuel` **同步**把所有 slot 都配好（所以第 2 輪第四問問的 `!g → 0.3` 退路根本走不到，見 LOW-4），
  但配到的是「GLB 還在路上」的圖，半徑還是 0.42。
- `js/duel-figures.js:551-560`：`rowsFit[i]` 第一幀選完就鎖；重用路徑 `plan = layout(rowsFit[i].rows, rowsFit[i].fit)`
  **完全不看 `plan.ok`**，沒有任何重選。

**實測（凍結視窗 844×390、8 尊 `tiger:elite`、`--lunge=2`，5 次重跑）**

| 跑次 | A.minPair | B.minPair | gap | 檔 |
|---|---|---|---|---|
| 1–5 | **0.146** | **0.146** | 0.437–0.44 | `review6-t8-rep1..5.json` |

R-3 門檻 0.50，**五次全不過且完全決定性**（不是忽紅忽綠，`02 §6.2` 的歸因步驟因此不適用）。

**§6.1 第 1 條 鑑別力（把碼換回修復前，這個證據會不會不一樣）**
用**現在這支** `duel-perf.mjs`（同一份量法、全母體）去量 `303ac93` 的 worktree（`--root=scratchpad/wt303`）：

| 版本 | 8 虎爺 minPair | 靜態 gap | 撞擊 maxEdge | 檔 |
|---|---|---|---|---|
| 修復前 303ac93 | **0.286 / 0.29** | 0.729 | 2.184 | `review6-pre-t8.json` |
| 修復後 b96cb7c | **0.146** | 0.44 | 2.150 | `review6-t8-rep1.json` |

兩版都不過 R-3，**但修復後把同一個名冊擠得更緊（0.29 → 0.146，約一半）**。截圖 `review6-pre-t8.png` 對
`review6-t8-rep1.png` 也看得出來：修復後八尊疊在一起、蓋掉隻數牌與 VS，正是這一卷開宗明義要修掉的「糊成一團」。

**歸因（`§6.1` 第 4 條：走真實路徑，不是重建的模型）**
`review6-lock.mjs`：同一頁連派兩場**完全相同名冊**的合成 `ys:duel`。第 1 場圖是新建的（GLB 未載，鎖點半徑 0.42），
第 2 場從池子重用（鎖點半徑已是 0.6863）。**兩場之間唯一的差別就是「選排數那一幀拿到的腳印半徑」**：

| 視窗 | 場次 | 鎖點時 shadow radius | 選到的 fit（由 shadow.scale 反推） | 收斂後 minPair | R-3 |
|---|---|---|---|---|---|
| 844×390 | 第 1 場（新建） | **0.42** | 1.0 | **0.156** | 不過 |
| 844×390 | 第 2 場（重用） | 0.6863 | 0.7 | **0.55**（B 側） | 過 |
| 780×330 | 第 1 場（新建） | **0.42** | 1.0 | **0.000** | 不過 |
| 780×330 | 第 2 場（重用） | 0.6863 | 0.6 | **0.53 / 0.549** | 過 |

檔：`review6-lock-844.json`、`review6-lock-780x330.json`。
**反面也驗了**（`§6.1` 第 1 條要求）：健康狀態（鎖點拿得到正確半徑）下這個證據會變綠，第 2 場就是。

**逐條回答第 2 輪的四個追問**

① **`fitSteps` 走到 0.5 仍 `!ok` 時 R-3 守不守？** 這一問在實機上**問不到**，因為它根本走不到 0.5：
780×330 的 8 虎爺在鎖點半徑正確時停在 fit 0.6 就 ok 了（minPair 0.53）。真正發生的是另一回事：鎖點時半徑 0.42
→ 誤判 fit 1 為 ok → 鎖死 → GLB 載完後 `plan.ok` 恆 false。實測 `review6-tiger8-780x330.json`：
**minPair 0.000**（A 側兩對、B 側兩對座標逐位小數完全相同，如 `(-0.029, -1.385)` 出現兩次）、
靜態 gap **0.278**（R-1 門檻 0.30，不過）、撞擊 maxEdge **2.205**（超過 `rimMax` 2.15）。
數學對得上：foot 0.82、rows 4、gap 0.667、最前排 depth 1.0 →
`hiOut = sqrt((2.15-0.82)^2 - 1^2) = 0.877`，`W = max(0, 0.877-0.22-0.82) = 0`，`s = 0` → 同排兩尊同座標；
`c = (0.22+0.82+0.877)/2 = 0.9585`，與量到的 `lat 0.959` 一致。
截圖 `review6-tiger8-780x330.png`：八尊糊成兩坨、蓋住 VS 與名牌、且明顯壓出紅色桌面。

② **`rowsFit` 沿用只看 `n`，`offset[i]` 變了會不會讓沿用的 plan 變 `!ok` 而沒人重選？**
`offset[i]` 這條**不會**：`want = |offset[i]|`（`:516`）只進 `c`（排中心），完全不進 `P.ok` 的兩個判斷（`:541-542`）。
但**「沒人重選」這個洞是真的、而且更嚴重**：`P.ok` 吃 `step0`（來自 `pxWorld`）與 `footOf`（來自 `figScale3d` 與 geometry radius），
這些量在一場之內都會變，而重用路徑一次都不重驗。上面的 GLB 半徑就是這個洞被踩爆的實例。
另外 `rowsFit[i].n === n` 這個守衛在一場之內是**恆真**的（名冊長度不因燒毀縮水，`onDuel` 才會重設 `rowsFit`），
看起來像重驗、實際上什麼都沒驗（LOW-2）。

③ **`footBase` 用的 `figScale3d`／`figScale` 是不是在 `realign()` 之後才算的？** **是，這一條沒問題。**
`update()` 開頭 `js/duel-figures.js:483-485` 先跑 `realign()`（`:459-479` 內更新 `pxWorld`／`figScale`／`figScale3d`／`offset`），
n≥3 的 plan 區塊在 `:509-560`，順序正確、同一幀內一致。**但這一條救不了整體**：過期的不是縮放，是幾何半徑。

④ **第一幀 `slots[i][jj]` 還沒建好、`!g` 退路 0.3 會不會選錯後被鎖死？** `!g` 這條路**走不到**
（`onDuel` `:373-378` 同步建完所有 slot），所以註解裡點名的那個危險不存在；**真正的首幀危險是同一形狀的另一個變體**
（geometry radius 還是 0.42），而 `footBase` 沒有守到它。等於防線寫在「已知的入口」而不是「危險的效果」上。

**修法建議**：`rowsFit` 的沿用條件加上「所有 slot 的 `f.ready()` 皆為真」，或在任一 slot 的
`shadow.geometry.parameters.radius` 變動時把 `rowsFit[i]` 設回 null 重選；最省事的是把離散選擇延後到
`onDuel` 的 `d.ready` resolve 之後（載入畫面本來就在等它）。另外重用路徑仍應檢查 `plan.ok`，
`!ok` 就重選一次，一場一次的成本可以忽略。

---

## H-3 —— 真的修好

### ① `lane` 有沒有把 `push` 算進 `stat`？沒有，`stat` 是乾淨的靜態值
- n≤2（`plan === null`）：`lane = n <= 1 ? 0 : (j - (n-1)/2) * step`（`js/duel-figures.js:627`），不含 `push`。
- n≥3：`lane = side*(plan.centers[r] + (k-(m-1)/2)*st) - offset[i]`（`:622`），也不含 `push`。
- `push` 只在 `:629` 的 `x = offset[i] + lane + push` 出現一次；`stat = side*(offset[i] + lane)`（`:636`）因此**恆等於這一幀的靜態徑向座標**。
- 副作用：靜態時 `side*x === stat`，`side*x > stat` 為 false → **靜態逐項不動是結構保證的**，不只是量出來的巧合。

### ② 夾完之後還有沒有別的東西動 `f.group.position` 的橫向？沒有
- `:645` `f.group.position.copy(tmpRight).multiplyScalar(x)`；`:648` `addScaledVector(tmpFwd, depth)`。
  `tmpRight = (cos az, 0, -sin az)`、`tmpFwd = (sin az, 0, cos az)`（`:490-491`），內積為 0（正交），
  所以 `r^2 = x^2 + depth^2`，`lim = sqrt((rimMax-foot)^2 - depth^2)` 這條式子是對的。
- `:651-654` 只寫 `position.y`；`:657-676` 只寫 `rotation`。
- 全 repo 只有 `js/trait-fx.js` 另外碰到人形，而它動的是 **group 裡面的 model／bone**
  （`js/trait-fx.js:161,166,173`），不是 `f.group.position`；`js/trait-fx.js:190` 的 `centroid()` 只是讀。
  夾限守得住 group 的世界座標（但書見 LOW-3）。

### ③ 2v2 精英撞擊：是靠夾限還是本來就進不去？靠夾限，同名冊對照有鑑別力
`--unitsa=fushou:elite,boartusk:elite --unitsb=同 --lunge=2 --w=844 --h=390`：

| 版本 | 撞擊 maxR | 撞擊腳印外緣 maxEdge | minGap | 檔 |
|---|---|---|---|---|
| 修復前 303ac93（`--root=wt303`） | **2.082** | **2.796** | 0.119 | `review6-pre-2v2.json` |
| 修復後 b96cb7c | **1.457** | **2.150**（貼齊 rimMax） | 0.117 | `review6-2v2-big.json` |

修復前紅（外緣 2.796 遠出桌緣、中心 r 2.082 逼近 R-2 的 2.20），修復後綠且外緣**剛好**停在 2.150，
代表夾限確實在咬、不是「本來就沒超過」。這一組同時補上了實作者報告缺的那個對照（見 MEDIUM-2）。

### R-4 靜態不變：實跑 maxΔ 0.00000
`node scratchpad/review6-r4.mjs`（等同提示指定的 `r4-compare.mjs`，只把埠改成 8975/8976，比 worktree `fae1eec` 與 HEAD）：

```
1v1 n 2 2 maxΔ 0.00000
2v2 n 4 4 maxΔ 0.00000
2v1 n 3 3 maxΔ 0.00000
1v2 n 3 3 maxΔ 0.00000
```

### 但書（不改判定）
夾限寫的是 `x = side*Math.max(lim, stat)`，**當靜態站位本身已經在 `lim` 外時，夾限退化成「完全不推」**。
780×330 那組就是：靜態外緣已經 2.205，撞擊逐幀 maxEdge 也是 2.205（一步都沒推出去）。
所以 H-3 的契約（撞擊不得把人推出桌緣）在那裡仍然成立，破線的是 H-2 的靜態站位，不是 H-3。

---

## 量測母體 —— 真的修好

- `tests/tools/duel-perf.mjs:172,186` 兩處 `.filter((f) => f.group.visible)` 都拿掉了，
  實測每一組兩側都回到 `n=8`（第 2 輪量到的是 A 側恆少一尊）。
- **`hitDir` 對非對決座位真的是 0**：`js/duel-figures.js:431`
  `hitDir = seats.map((s) => (s === d.l ? -1 : s === d.w ? 1 : 0))`，`seats` 是合成的那兩個座位（`:341`），
  真對決的 `ys:fx-lunge` 帶的 `w/l` 不在裡面，三元式全落到 0，`push = 0 * kick * ... = 0`（`:614`），
  且 `dir === -1` 的歪身旋轉（`:663`、`:672`）也不會觸發。`hitAt`／`hitPower` 雖然被設了（`:429-430`），
  但只影響 `kick` 這個係數，乘上 0 仍是 0。→ **被燒凍住的尊不會停在「正被推出去」的位置。**
- 反面查核：`review6-t8-rep1.json` 的 A 側確實有一尊 `vis:false` 被燒凍住，它停在 `(-0.064, -1.35)`，
  與同排活著的鄰居距 0.15，和同排活尊之間的間距（s≈0.146）同一個量級，代表它停的就是同一份 plan 的合法站位，
  沒有把 minPair 拉低。更關鍵的是 **B 側整場沒有任何燒毀，minPair 一樣是 0.146**，
  所以上面 H-2 的紅燈**不是量測污染造成的**。

---

## 新 finding

### HIGH-1 `rowsFit` 鎖在 GLB 未載入的第一幀、整場不重驗；8 虎爺在凍結視窗 R-3 0.146（比修復前更糟）
`js/duel-figures.js:515`（讀 `shadow.geometry.parameters.radius`）＋`:551-560`（鎖與沿用，不看 `plan.ok`），
以及 `js/creature-figures.js:249,288-291`（半徑先 0.42、GLB 載完才換）。
**觸發條件（具體、非假設性）**：任一側 n≥3 且含**首次載入**的大腳印 3D 妖（虎爺印 radius 0.6863 對預設 0.42）。
**後果**：整場排錯。844×390 minPair 0.146（5/5）；780×330 minPair 0.000，外加靜態 gap 0.278 破 R-1、外緣 2.205 出 `rimMax`。
**既有守衛為什麼擋不住**：`footBase` 的 `!g → 0.3` 退路只守「slot 還沒建」，而 `onDuel:373-378` 已同步建完，
真正過期的是 geometry；`rowsFit[i].n === n` 在一場內恆真。
**真實玩家路徑**：合成治具與正式對決走的是同一個 `onDuel`／`update()`；第一次出場的妖排錯、第二次（池子重用）才對，
是「同一個牌組看起來時好時壞」的成因。
（等同 H-2 的「沒修到」判定；因根因是這一版**新引入**的、第 2 輪未指出，故計入新 finding。）

### MEDIUM-1 報告的證據列「8 虎爺 0.55」重現不出來，且無 committed json
`docs/experiments/2026-09-05-duel-readability-report.md:48`。同視窗同名冊 5 次實跑全是 **0.146**（`review6-t8-rep1..5.json`），
差距不是雜訊等級。`docs/experiments/2026-09-05-readability-evidence/` 底下沒有對應的 tiger8 檔
（`lineup-elite8.json` 有，我也重現到同一個 0.549，那一列是誠實的）。表格裡至少有一個數字沒有可查證的來源。

### MEDIUM-2 「2v2 撞擊 2.092 → 1.887」是換了名冊的前後比（`02 §2.1` 移動案例集）
第 2 輪量到的 2.092 用的是 **fushou:elite + tiger:elite**（`review5-2v2.json`，foot 0.693）；
實作者拿來對照的 1.887 出自 `docs/experiments/2026-09-05-readability-evidence/lineup-e2v2.json`，
名冊是 **bow:elite + sword:elite**（腳印小得多）。前後兩個數字不是同一組案例，這份對照證明不了夾限有效。
（結論不受影響：我用同名冊 fushou+boartusk 補了對照，2.082/2.796 → 1.457/2.150，夾限確實有效。）

### MEDIUM-3 驗收只在 844×390 一個視窗量過，矮視窗全面破線
凍結檔的 R-1 到 R-3 只綁一個視窗。780×330（手機橫向加瀏覽器 chrome 的常見尺寸）下
minPair 0.000、gap 0.278（R-1 0.30 不過）、外緣 2.205（`rimMax` 2.15 不過），見 `review6-tiger8-780x330.json/png`。
根因是 HIGH-1，但「驗收母體只有一個視窗」本身讓這類問題整卷都看不見。建議把視窗維度加進驗收；
這是動驗收條件，依 `02 §2.1` 需使用者裁定。

### LOW-1 夾限在「靜態已在 lim 外」時退化成完全不推，撞擊演出無聲消失
`js/duel-figures.js:636` 的 `Math.max(lim, stat)`。780×330 實測撞擊 maxEdge 與靜態外緣同為 2.205，代表一步都沒動。
語意上正確（不許往內拉），但視覺上那一尊的受擊回饋整個不見了，沒有任何 log 或退路。

### LOW-2 `rowsFit[i].n === n` 是恆真守衛，讀起來像重驗、實際不驗
`js/duel-figures.js:552`。名冊長度在一場內不變（燒毀不縮 roster，`onDuel` 才重設 `rowsFit`），
所以這個條件永遠成立；真正該檢查的 `plan.ok` 在沿用路徑上被跳過。

### LOW-3 `trait-fx` 會在 group 內平移 model，夾限與量測都看不到
`js/trait-fx.js:166` `m.position.copy(w.base.p).add(w.mo.p)`。夾限守的是 `f.group.position`，
量測讀的也是它，招式演出把身體推出去的部分兩邊都量不到。屬 C3 卷既有機制、不在本 diff 範圍，僅記錄。

### LOW-4 `footBase` 的 `!g → 0.3` 是死路
`js/duel-figures.js:515`。`onDuel:373-378` 同步把所有 slot 配好，`slots[i][jj]` 在第一幀就非 null。
註解宣稱它擋的是「首幀選錯」，但首幀真正的過期來源是 geometry radius（HIGH-1），這條退路一次都不會執行。

---

## 探針與產物（全在 scratchpad，未動 repo）
- `review6-lock.mjs` — 鎖點半徑 A/B 探針（同頁連派兩場同名冊合成對決），產物 `review6-lock-844.json`、`review6-lock-780x330.json`（埠 8973、8975）
- `review6-t8-rep1..5.json/.png` — 8 虎爺 844×390 五次重跑（埠 8971–8975）
- `review6-tiger8-780x330.json/.png`、`review6-tiger8-844x390.json/.png` — 矮視窗與凍結視窗單跑（埠 8971、8972）
- `review6-pre-t8.json/.png`、`review6-pre-2v2.json/.png` — 修復前 303ac93（`--root=scratchpad/wt303`）同量法對照（埠 8973、8974）
- `review6-2v2-big.json/.png` — 修復後 2v2 大體型精英撞擊（埠 8972）
- `review6-elite8-repro.json/.png` — 重現 committed `lineup-elite8.json` 的 0.549（埠 8976）
- `review6-r4.mjs` — R-4 對 `fae1eec` 逐尊比（等同 `r4-compare.mjs`，改埠 8975/8976）
