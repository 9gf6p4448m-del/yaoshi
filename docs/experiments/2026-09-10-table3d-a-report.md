# 0.56a 版面卷 實跑報告（拍賣桌整片掏空，2026-09-10；**二版**回應冷讀覆審 R1）

> **版號**：計畫檔與凍結檔寫的「0.55a／0.55b」＝本檔的 **0.56a／0.56b**（0.54／0.55 另有其卷，主對話 2026-09-11 改號）。同一卷、同一份驗收，門檻一字未動。
> **二版**（`7fc8fb1` 起）修掉冷讀覆審 R1 的 CRITICAL-1／HIGH-1／MEDIUM-1／MEDIUM-2，並落實使用者裁乙；
> **三版**（`d81060f` 起）修掉冷讀覆審 R2 的 HIGH-A／MEDIUM-A／LOW-B／LOW-C／LOW-E；
> **四版**（`923ba30` 起）補冷讀覆審 R3 的 MEDIUM-E／MEDIUM-D／MEDIUM-F 與 LOW-J。逐條三態見本檔末段三節。
> 卷＝ROADMAP_V2 Top 1 的 **版面卷**（桌面先平面；托盤／Raycaster／木紋香灰是上桌卷）。
> 規格＝`docs/proposals/2026-09-10-plan-table3d.md`；驗收凍結＝`docs/experiments/2026-09-10-acceptance-table3d.md`（**T0–T6**；T7–T12 屬 0.56b）。
> 分母清單＝`docs/experiments/2026-09-10-table3d-a-worklog.md`；證據＝`docs/experiments/2026-09-10-table3d-a-evidence/`。
> 基準 commit＝**`84b1a0c`**（v0.53）。基準靜態根＝`.base84/`（基準 `index.html` 實體複製＋`js`／`assets`／`tests` junction；不進版控，驗完刪）。
> **門檻一字未改**（`02 §2.1`）：本卷沒有動任何 T 條的門檻、seeds、選擇器清單、fixture 或執行範圍。
> 唯一與凍結檔字面有出入的是 T5 括號裡的「25」——那不是門檻，是**假綠指標的值**，說明見 T5 那一節與 worklog 的 N3。

---

## 一眼表

| 條 | 狀態 | 關鍵數字 | 證據 |
|---|---|---|---|
| **T0** 引擎逐位元組相等 | **綠** | seeds 1..20 `equal:true`（357285 bytes 兩邊相同）；`--mutate` `differs:true` | `evidence/T0-trace-eq.txt` |
| **T1** kill switch 雙向 | **綠** | `?table3d=0`：`120px 588px 120px`／hollow=false／`#tray` none／rail 子元素 0,0／`#market .mcard`=4；預設：`168px 492px 168px`／hollow=true／`#tray` block／rail 子元素 2,2／`#market .mcard`=0（側欄 4） | `evidence/T4-legend-drive-new.txt`、`evidence/t3d-new.json` |
| **T2** `#felt` 直向恆 0 | **綠** | **三版把取樣拉到整局**（seeds 1,2,3 × `--rounds=12`）：**50 格全 0**；配套 `scrollHeight` **50 格全 252 ≤ 260**（基準 11 格 0＋1 格 54） | `evidence/T2-T3-felt-probe-new.txt`、`felt-new.json` |
| **T3** 側欄與北列不溢出 | **綠** | `#west`／`#east`／`#north` 各 **50 格全 0**（含**第 7 夜**——R2 抓到的 17px 就在那一格；**基準 `#north` 本來就是 11**，本卷順手修掉） | 同上 |
| **T4** 橫向溢出 0＋0 error | **綠** | seeds 1..6 跑完 6 局：橫向溢出**橫式 0 筆、直式 0 筆**；`console error 0／pageerror 0／requestfailed 0`；治具總判定 `✅ 通過` | `evidence/T4-legend-drive-new.txt` |
| **T5** 觸控命中回歸 | **綠** | 基準清單 177 個可測元素**全部命中**（177／177），`trayTap` 被呼叫 **0** 次；**鑑別力突變驗紅**：`#tray{top:0;z-index:9}` ⇒ 174／177、`trayTap` **3** 次、exit 1 | `evidence/T5-base-84b1a0c.txt`、`T4-legend-drive-new.txt`、`T5-mutation-check.txt` |
| **T6** 直式蓋板行為不變 | **綠** | 390×844：`#rotateHint`=flex／`120px 134px 120px`／`.rail`=none／`#table` 橫向溢出 0／`#felt` backdrop-filter=`blur(7px)`；**對基準逐項相同** | `evidence/T4-legend-drive-new.txt`、`t3d-base.json` vs `t3d-new.json` |
| 9 套單元測試 | **綠** | 8／5／7／32／8／16／28／32／36 ＝ 172 條全過、0 紅 | `evidence/unit-tests.txt` |
| **R1-CRITICAL-1** 面板遮擋（二版新加） | **綠** | 真的打開袋子／三席 ⓘ／說明 5 種面板，`#helpBtn` 矩形上 25 個取樣點**全部落在 `#modal` 裡**；基準綠、一版 `51a8e5a` 紅 | `evidence/R1-gates-{new,base-84b1a0c,v1-51a8e5a}.txt` |
| **R1-HIGH-1** 熱座交棒清場（二版新加、三版加活性斷言與兩條路） | **綠** | 掏空（封在 `#railW`）與 `?table3d=0`（封在 `#stage`）兩條路都「封標後 `.mybid` **1**（活性斷言 >0）、交棒當下殘留 **0**」；基準 0（綠）、一版 **1**（紅，`railW:mybid="押 2"`） | 同上 |
| **R3-MEDIUM-E** 北列與側欄直向恆 0（四版新加） | **綠** | `legend-drive` 的直向判定擴到 `#north`／`#west`／`#east`、取樣第 1～**8** 夜：**282 格、溢出 >0 的 0 格**；**對二版 `90b5274` 跑 ⇒ 4 格紅、全部在第 7 夜**（seed 1／2 各「出價 17、盯上 4」）、`EXIT=1` | `evidence/T4-legend-drive-new.txt`、`R3-MEDIUM-E-v2-90b5274.txt` |

> 上表是**四版最終碼**（`923ba30`）單獨跑出來的（沒有任何併發）；T5 的基準清單用同一版治具對 `84b1a0c` 產（177 可測／177 命中／**152 個驗了字面引數**／引數對不上 0）。

---

## 逐條

### T0 引擎逐位元組相等（兩卷都適用）

```
git show 84b1a0c:index.html > docs/experiments/base84-index.tmp.html
node tests/tools/trace-eq.mjs docs/experiments/base84-index.tmp.html index.html
{"old":"docs/experiments/base84-index.tmp.html","new":"index.html","seeds":"1..20","bytesOld":357285,"bytesNew":357285,"equal":true}

node tests/tools/trace-eq.mjs index.html --mutate
{"mode":"mutate","mutation":"CFG.ROUNDS 12 -> 11","bytesSrc":357285,"bytesMutant":341041,"differs":true,
 "verdict":"突變驗紅 ✅（這支腳本抓得到引擎差異）"}
```

**綠。** 兩半都跑了（相等性斷言本身沒有證明力，`02 §6.1` 第 1 條）。
`js/` 一格未動、規則／AI／請神／共鳴／`ART_BIBLE`／`GAME_DESIGN`／GLB 一格未動，`git diff --stat` 可核對。

### T1 kill switch 雙向

`legend-drive --t3d`：`?table3d=0` 與**不帶旗標**各走到第 1 夜出價頁，量的是 **computed 值與真的 DOM 內容**，不是「旗標有沒有被讀到」；**兩邊都量**（只驗開不驗關＝反向探針）。

| 量 | `?table3d=0` | 預設 | 凍結檔要求 |
|---|---|---|---|
| `#table` `grid-template-columns` | `120px 588px 120px` | `168px 492px 168px` | 前者 120px…120px、後者相反 ✅ |
| `#felt.classList` 含 `hollow` | `false` | `true` | ✅ |
| `#tray` `display` | `none` | `block` | ✅ |
| `#railW`／`#railE` `childElementCount` | `0` / `0` | `2` / `2` | ✅ |
| `#market .mcard` | `4` | `0`（側欄 `.rail .mcard` ＝ 4） | ✅ |

**綠。** kill switch 之所以能「完全回到 v0.53」是**建構上**的：掏空版面的每一條 CSS 都寫在 `#table.t3d` ＋
`@media (orientation:landscape)` 裡面，不加 class 就一條都不生效；座位卡容器預設 `display:contents`，
座位卡仍是 `#north`／`#west`／`#east` 的直接 flex 項目。

### T2 `#felt` 直向溢出恆 0（比基準加嚴）

```
node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --tag=new --port=9647   # 二版起這四個容器就是預設
- **#felt**：12 格　最大溢出 0　非 0 的格數 0
```

**綠。** 12 格全 0（基準 v0.53 是 11 格 0 ＋ seed 1 第 3 夜出價頁 **54**；基準 36 格版本裡有 3 格非 0、最大 54）。
**配套斷言也綠**：`#felt` 的 `scrollHeight` 12 格**全部 252**（clientH 252），≤ 260。
高度**是搬走不是藏起來**：`.preview` 進 `#northPrev`、香火榜進 `#northShr`、四張卡進 `#railW`／`#railE`，
`#felt` 裡只剩 `#feltHead`（17px）＋`#stage`（心願條／押寶條）；`#skipbtn`／`#helpBtn`／`#tray`／`#veil` 本來就是絕對定位。

### T3 側欄與北列不溢出

同一次跑：`#west` 12 格 0、`#east` 12 格 0、`#north` 12 格 0。

**綠**，但有一件要講白：**基準 v0.53 的 `#north` 本來就直向溢出 11px**（`scrollHeight 67 / clientHeight 56`，實測），
來源是北席卡掛在卡外的 `.roleInfoBtn`（`bottom:-7px`）與 `.bubble`（`top:calc(100% + 4px)`）。
T3 要求 12 格全 0 ⇒ 本卷把北席這幾顆的座標翻進卡內（只在 `#table.t3d` 底下）。**這是加嚴，不是放寬**：11 → 0。

**配套人眼（T3 的字面要求）**：`evidence/shot-055a-railW.png`／`-railE.png` 是側欄卡片特寫，
四張卡的**名稱／戰力＋系別 chip／招式行（`✦ …`）／部隊預覽（`飄影×4・攻 0・血 5・3 拍`）四樣都完整可見**，
沒有 ellipsis 到看不出招式。做法是卡片矮 10px、寬 24.7px 之後把字級一起收
（`.nm` 11.5／`.pw` 10／`.ab` 9／`.uline` 9），**`.uline` 與 `.ab` 維持同級**（請神 2.0 凍結檔 G11 明訂不得更小）。

### T4 橫向溢出 0＋0 error

```
node tests/tools/legend-drive.mjs …/legend-drive-new.json --all --seeds=1,2,3,4,5,6 \
  --base=…/felt-base.json --taps --t3d --modal --handoff --tapseeds=1,3 --port=9661 …
```

- **橫向溢出：橫式 0 筆、直式 0 筆 → ✅**（量的清單＝T4 的 12 個
  `#table`／`#north`／`#shrines`／`.incboard`／`.shcards`／`#felt`／`#stage`／`#south`／**`#railW`**／**`#railE`**／`.incbar`／`.preview`
  ＋加嚴的 `#market`／`.legendPicks`，另外 `html`／`body` 也一起量。清單改吃 `--sel=`，預設就是這一份）。
- **`console error 0`／`pageerror 0`／`requestfailed 0` → ✅**
- 治具總判定：**`- 判定：✅ 通過`**

順帶證明「遊戲還玩得完、請神那一整套沒被版面卷弄壞」（這幾條是治具原本就有的 H6 檢查，不是本卷新加）：
6 局全部跑完（7～10 夜），**請走 11 尊／真人選尊視窗出現並選擇 6 次（點的那一尊沒對上 0）／落空保留 22 人次**，
熱座交棒的燒香列清乾淨（`.incbar` 個數 0），袋子面板「送神回天」按下 1 次。

*T4 的假綠（「把新加的兩條 rail 從選擇器清單裡漏掉」）已堵死*：`#railW`／`#railE` 就在預設 `--sel` 清單裡，
而且實測**它們一開始真的溢出 3px**（卡角徽章 `right:-4px`），是 `.rail{padding:8px 5px 0}` 之後才變 0——
換句話說這兩個選擇器**在這一卷裡真的抓到過東西**，不是擺著好看的。

### T5 觸控命中回歸（逐一 tap，不是數數量）

**做法**（凍結檔 T5 的字面）：在第 1～3 夜的出價頁與盯上頁，對**每一個** `#table [onclick]` 元素各 tap 一次，
記錄「這一 tap 有沒有讓對應的處理函式被呼叫」。實作三件事：

1. 用 `page.touchscreen.tap(x, y)` 打在元素中心的**座標**上 ⇒ 真的走瀏覽器的命中測試（`#tray` 蓋住就會被它吃掉）。
2. 頁面端把每個 `onclick` 用到的全域函式換成**計數 proxy** ⇒ tap 完全不改遊戲狀態，掃描順序不影響結果。
3. 同時數 `trayTap` 被呼叫幾次 ⇒ 驗「`#tray` 不得吃掉任何一個原本可點元素的事件」。

| | 基準 `84b1a0c` | 本卷 | 突變體（鑑別力檢查） |
|---|---|---|---|
| 掃過的頁 | 12 | 12 | 12 |
| `#table [onclick]` 總筆數 | 207 | 207 | 207 |
| **可測元素**（看得見＋沒被產品停用） | **177** | **177** | 177 |
| 命中 | 177／177 | **177／177** | **174／177** |
| 基準清單漏掉 | — | **0** | 0 |
| `trayTap` 被呼叫 | 0（基準沒這支） | **0** | **3** |
| 判定 | ✅ | ✅ | **❌（exit 1）** |

**鑑別力檢查實跑了、而且是紅的**（`02 §6.1` 第 1 條）：把 `#felt.hollow #tray` 的 `top:26px` 改成 `top:0`、
`z-index:1` 改成 `z-index:9`，T5 立刻紅——沒命中的三個正是 **seed 1 第 3 夜（押寶夜）出價頁**的
`ybBump(-1)`／`ybBump(1)`／`ybFlip()`，而且 `trayTap` 被呼叫 **3** 次，
直接證明「`#tray` 蓋住了 `#felt` 裡的可點元素、把事件吃掉了」這件事驗得到。
**還原方式是另建一份突變體靜態根 `.mut84/`**（原檔全程唯讀，不做反向 sed，`02 §6.1` 第 1 條），
`diff index.html .mut84/index.html` 只有那一行。

**★關於凍結檔 T5 括號裡的「實測 25 個」★**：25 ＝ `document.querySelectorAll('[onclick]').length`（**整份文件**，
含標題頁的兩顆入市鈕、`#updBar` 等），而 **T5 正文要的是 `#table [onclick]` 逐一 tap**。
更關鍵的是——**只數那個總數正好是 T5 自己列的假綠**（「元素還在不代表點得到」）。
實測三個口徑（基準版第 1 夜出價頁）：`document [onclick]` = **25**／`#table [onclick]` = 18／其中看得見的 = 16。
本卷照 T5 正文走，分母＝基準同治具跑出來的那一份逐項清單（177 個可測元素）。**沒有改門檻**，
只是把括號裡那個數字的口徑講清楚，完整推導在 worklog 的 N3。

**為什麼 tap 掃描挑 seeds 1,3**：與 `felt-probe --seeds=1,3` 同一組；而且 **seed 1 的第 3 夜是押寶夜**
（`RULE_NIGHTS=[3,7]`、`ruleOrder[0]='yabao'`），`#stage` 裡因此有三顆 stepper——
那是**唯一**落在 `#felt` 內、z-index 低於突變值的可點元素，鑑別力突變要靠它才驗得紅。
換句話說：**這一組 seed 讓檢查更嚴，不是更鬆**。

### T6 直式蓋板行為不變

390×844 量 computed 值（只截圖看「有沒有蓋住」看不出蓋板底下版面爆掉）：

| 量 | 基準 `84b1a0c` | 本卷 | |
|---|---|---|---|
| `#rotateHint` `display` | `flex` | `flex` | ＝ |
| `#table` `grid-template-columns` | `120px 134px 120px` | `120px 134px 120px` | ＝ |
| `.rail` `display` | （基準沒有 `.rail`） | `none` | 語意等價 |
| `#table` 橫向溢出 | `0` | `0` | ＝ |
| `#felt` `backdrop-filter` | `blur(7px)` | `blur(7px)` | ＝（直式仍是玻璃面板，Q6 甲） |

**綠。** 直式之所以「維持 v0.53」也是建構上的：掏空的每一條 CSS 都關在 `@media (orientation:landscape)` 裡。
`#rotateHint` 的顯示條件與文案一字未動。

### 9 套單元測試

`aistake` 8／`conscap` 5／`duel-desync` 7／`legend` 32／`lineup-order` 8／`nightrules` 16／`review` 28／
`roles-balance` 32／`wish16` 36 ＝ **172 條全綠、0 紅**（`evidence/unit-tests.txt`）。

---

## 人眼 contact sheet（844×390；T12 前四張本卷先出）

`node tests/tools/layout-shot.mjs docs/experiments/2026-09-10-table3d-a-evidence/shot-055a --port=9645`（二版起 `--sel` 預設就是 `#railW,#railE`）
（`console error 0`）

| 檔 | 是什麼 | T12 對應 |
|---|---|---|
| `shot-055a-n1.png` | **第 1 夜出價頁** | T12 第 1 張 ✅ |
| `shot-055a-mark2.png` | **第 2 夜盯上頁** | T12 第 2 張 ✅ |
| `shot-055a-railW.png`／`-railE.png` | **側欄卡片特寫**（左右卡列各一） | T12 第 5 張 ✅ |
| `shot-055a-portrait.png` | **直式蓋板** | T12 第 6 張 ✅ |
| `shot-055a-preshrine.png` | 請神夜前一夜出價頁（wide 香火榜） | T12 第 3 張（順手也出了） |
| `shot-055a-bag.png` | 袋子面板 | T12 第 4 張（順手也出了） |

**六張都出了**，但**T12 是 0.55b 的驗收條件**（要看到木紋、香灰、紅布托盤與 4 尊拍品），
0.55a 的桌心是現況那顆八角柱桌面＋燈籠光＋線香煙，所以本卷**不宣告 T12 通過**，只交圖。

**實作過程中靠這批圖抓到、已修的兩件**：
1. `preshrine` 那一張的右半被一團 bloom 洗白、心願條的字讀不到 ⇒ `.preview`／`.wishbar`／`.stakebar`
   在掏空頁的底色從 `rgba(0,0,0,.25)` 加深到 `rgba(8,5,16,.62)`。**沒有用 backdrop-filter**：
   iPhone 牌桌基準只有 55–58 fps，一趟全區模糊換不到等值的可讀性。
2. `layout-shot` 的第 ③ 張本來拍出跟第 ② 張一模一樣的畫面——請神 3.0 已移除 `sh.night`（GUIDE §11.26 第 1 點），
   舊寫法 `map(s=>s.night)` 全是 `undefined`、`Math.min` 變 `NaN` 就直接 break。改問 `CFG.SHRINE_NIGHTS`。

**（已裁定並落地）使用者裁乙**：請神夜前後 `wide` 兩夜，把預告框的寬讓給香火榜。
一版量到的是：待請卡的**尊名／系別 chip／招式名三樣全被 ellipsis 切掉**（覆審 R1-LOW-1 逐欄量過）。
二版落地後實測：北列格 254→**418.6px**、卡寬 81.4→**136.2px**、**被切掉的欄位 3 卡 ×3 欄 → 0 個**、
`#north` 直向溢出仍 **0**（`evidence/T12-layout-shot.txt`，新的 `shot-055a-preshrine.png` 上三張卡的
「殘日 祖靈 餘暉灼目」「大士爺紙尊 香火 普渡」「有應公 陰氣 有求必應」都完整）。
這個量測已經變成 `layout-shot` 的斷言（切到就非零離開），不是只留一張圖。

---

## `git diff --stat 84b1a0c..HEAD`

```
 docs/IMPLEMENTATION_GUIDE.md                       |  39 ++++
 docs/experiments/2026-09-10-table3d-a-evidence/*   | （實跑輸出：txt 8 份、json 12 份、png 7 張）
 docs/experiments/2026-09-10-table3d-a-report.md    | 新增
 docs/experiments/2026-09-10-table3d-a-worklog.md   | 新增
 index.html                                         | 195 +++++++++++++++--
 tests/tools/felt-probe.mjs                         |  47 +++--
 tests/tools/layout-shot.mjs                        |  23 +-
 tests/tools/legend-drive.mjs                       | 232 ++++++++++++++++++++-
 tests/tools/mkt-probe.mjs                          |  28 ++-
```

`git diff --name-only 84b1a0c..HEAD -- js assets docs/design docs/GAME_DESIGN.md` ⇒ **0 檔**
（`js/`、`assets/`、`ART_BIBLE`、`GAME_DESIGN` 一格未動）。

逐檔對得上需求：

| 檔 | 為什麼動 |
|---|---|
| `index.html` | 版面主體：DOM 拆分、`#felt.hollow`／`#tray`、`?table3d`、兩頁掏空切換、9 頁 `setHollow(false)`、`markCardHTML` 抽出 |
| `tests/tools/felt-probe.mjs` | `--sel=`（一支量四個容器，T2／T3） |
| `tests/tools/legend-drive.mjs` | `--sel=`（T4 清單）、`--taps`（T5）、`--t3d`（T1／T6） |
| `tests/tools/layout-shot.mjs` | `--sel=`（`#market` 退役）＋請神夜前一夜那一張的 `sh.night` bug |
| `tests/tools/mkt-probe.mjs` | `--sel=`（`#market` 退役） |
| `docs/IMPLEMENTATION_GUIDE.md` | 新增 §11.28（接手八件事） |
| `docs/experiments/2026-09-10-table3d-a-worklog.md` | 分母清單（N1／N2／N3） |
| `docs/experiments/2026-09-10-table3d-a-report.md`＋`-evidence/` | 本報告與實跑輸出 |

**`VERSION` 不改**（合併時由主對話定）；`js/` 一格未動；`docs/design/ART_BIBLE.md`、`docs/GAME_DESIGN.md`、`assets/` 未動。

---

## 覆審 R1 逐條三態（真的修好／表面修好／沒修到）

> 覆審全文＝`scratchpad/review-table3d-a-r1.md`（冷讀、無作者對話史、worktree 唯讀）。
> 覆審員自己重跑的 T0–T6 六條判定是「**六條全部真的綠**、沒有一條假綠」，另抓出兩個從閘門縫隙掉出去的真實回歸。
> 下表是**我對他每一條的處置**，判準照 `02 §6.1` 附則：修完要能說出「這個修正會不會讓一份壞掉的實作變成通過」。

| 覆審條目 | 三態 | 做了什麼／為什麼算數 |
|---|---|---|
| **CRITICAL-1** `#helpBtn` 壓在 `#modal` 面板上並吃掉點擊 | **真的修好** | **根因不是幾何、是堆疊環境**：v0.53 的 `#felt` 有 `backdrop-filter`，順便建立了堆疊環境，把 `#helpBtn` 的 `z-index:25` 關在 `#felt` 裡；掏空拿掉 backdrop-filter 之後那個環境消失，25 逃到根環境、**贏過 `#modal` 的 20**。修法＝`#felt.hollow{isolation:isolate}` 把環境補回來（**沒動** `#sheet`／`#modal`／`#duel` 的 30／20／40，計畫 §3 第 6 條；`#felt` 內部 1／2／5／6／25 的相對順序也一格不變）。**證據是行為不是推理**：新閘門 `legend-drive --modal` 真的打開五種面板、在 `#helpBtn` 矩形上取樣 25 點，`elementFromPoint` 全部落在 `#modal` 裡。**鑑別力雙向都驗**：對 `84b1a0c` 綠、對一版 `51a8e5a` **紅**（5 種面板的鈕心全部回 `helpBtn`、exit 1）。注意**重疊面積仍是 28×34**——修的是誰贏命中測試，不是把鈕挪開，這正是「基準也重疊 0×34 卻沒問題」的同一個機制。 |
| **HIGH-1** 熱座交棒雙保險清場對掏空頁失效 | **真的修好** | `showHandoff` 的清場選擇器 `#stage .mybid,#stage .pickbox,…` 全部改 `#table ` 前綴（一次涵蓋 `#stage`、兩條 rail、北列兩塊，對 0.56b 的右側抽屜也免疫）。這是「防線按危險的**效果**寫，不按已知的入口寫」：要清的是牌桌上任何一顆私有徽章。新閘門 `legend-drive --handoff` 走真實路徑（熱座 → 出價頁 → `openSheet(0);bump(1);bump(1);closeSheet()` 封「押 2」→ 蓋牌 → 交棒畫面出現當下數）。**三邊都跑**：基準 0（綠，封在 `#stage`）／一版 **1**（紅，封在 `#railW`、殘留 `railW:mybid="押 2"`，與覆審實測逐字相同）／二版 **0**（綠，封在 `#railW`）。 |
| **MEDIUM-1** 三支治具 `--sel` 預設值指退役容器、失敗靜默 | **真的修好** | 預設值改成掏空版現行容器：`felt-probe` → `#felt,#west,#east,#north`、`layout-shot` → `#railW,#railE`、`mkt-probe` → `#railW`；三支**找不到元素一律 throw**（`layout-shot` 從「印一行就跳過、照樣 exit 0」改成拋錯）。`legend-drive --base=` 同時吃兩種鍵格式（`seed|round|page` 與 `#felt|seed|round|page`），所以 felt-probe 換預設不會把 T4 的直向判定弄啞。量 `?table3d=0`／v0.53 要自己帶 `--sel=`，錯了會炸而不是靜默少一張圖。 |
| **MEDIUM-2** T5 的命中不驗參數 | **真的修好** | `--taps` 的 stub 從「只計數」改成「連第一個引數一起記」，並從 `onclick` 屬性解析字面引數（`openSheet(2)` ⇒ `"2"`）兩邊比對；對不上就紅。**本次實測 177 個可測元素裡有 152 個帶字面引數**（拍品卡 `openSheet`／`pickMark`／`ybToggle`、座位 `showBag(id)`／`showRoleInfo(id)`），基準與二版都是**引數對不上 0 個**。0.56b 的 T8 要驗 `i`，這一半已經先做好。 |
| **MEDIUM-3** `VERSION` 還是 `0.53` | **沒修到（刻意）** | 版號由主對話合併時定（本卷不改），我把它留在回報的第一段。覆審把它列出來就是為了不讓它掉，這裡再記一次：**合併 PR 不含首頁版本字串就等於沒有送達證明**。 |
| **LOW-1** `wide` 兩夜的截斷比報告寫的更廣（chip 也被切） | **真的修好（＝使用者裁乙）** | 使用者裁乙選②「讓寬」＋覆審建議的 chip 配套一起做：`#north.shwide` 時預告框 `flex 1.15→0.6`、香火榜 `0.85→1.4`（只有請神夜前一夜與當夜生效，class 由 `fillRails` 依渲染出來的 `#shrines.wide` 掛上，不另抄一份「哪兩夜」的規則）；尊名另包 `.shn`、chip 改 `flex:0 0 auto` ⇒ **chip 不再參與縮排**。**實測**（`layout-shot` 新增的量測，量 `scrollWidth > clientWidth` 不是看圖）：北列格 254→**418.6px**、卡寬 81.4→**136.2px**、被切掉的欄位（尊名／chip／招式名，三張卡共 9 欄）**3 卡全切 → 0 個**，`#north` 直向溢出仍 **0**。這個量測已變成 `layout-shot` 的斷言（切到就非零離開）。 |
| **LOW-2** `#skipbtn` 那一半沒被實際行使；凍結檔對突變機制的描述不準 | **沒修到（記錄，不動）** | 兩件都不影響判定：① `#skipbtn` 在被掃的 12 頁全是 `display:none`，而它 z-index 5 且只在 `setHollow(false)` 的頁面顯示、與 `#tray` 永遠不同框；② 凍結檔寫「`z-index:9`（蓋住 helpBtn）」是錯的（helpBtn 是 25），但**要求本身仍然滿足**——突變仍靠押寶夜三顆 stepper 驗紅（二版重跑：**174／177、trayTap 3**）。**凍結檔的字我一個都沒改**（`02 §2.1`）。覆審另做的 `z-index:30` 突變（162／177）記在這裡當第二條鑑別力證據。 |
| **LOW-3** `display:contents` 的容器在探針裡回零矩形 | **沒修到（記錄）** | `#northSeat`／`#westSeat`／`#eastSeat` 的 `getBoundingClientRect()` 回 `(0,0,0,0)` 是規範行為，不影響任何閘門（`#north` 的 `scrollWidth − clientWidth` 是 0）。已寫進 GUIDE §11.28 給 0.56b 的幾何探針提醒。 |
| 覆審「查了但不成立」的四條 | **不處置** | `#west` 橫向 23px（基準逐值相同）／北席 `.windb` × `.mark-stamp` 重疊 14×15（基準一模一樣）／非掏空頁 `#felt` 直向溢出（基準整局對照過、且不在 T2 範圍）／`#market` 退役沒有漏改的呼叫點。我重新確認過覆審的歸因，同意都是既有行為，不是本卷造成的。 |

### 二版新加的兩道閘門，鑑別力都是雙向驗過的

| 閘門 | 基準 `84b1a0c` | 一版 `51a8e5a` | 二版（本版） |
|---|---|---|---|
| `legend-drive --modal` | ✅ 25/25 點落在 `#modal` 裡 | ❌ 5 種面板的鈕心全回 `helpBtn`、exit 1 | ✅ 25/25 |
| `legend-drive --handoff` | ✅ 殘留 0 | ❌ 殘留 1（`railW:mybid="押 2"`） | ✅ 殘留 0 |

證據檔：`evidence/R1-gates-base-84b1a0c.txt`／`R1-gates-v1-51a8e5a.txt`／`R1-gates-new.txt`
（＋最終那一輪合併在 `evidence/T4-legend-drive-new.txt` 的前兩段），明細 json `evidence/r1-modal-{base,v1,new}.json`。
兩個對照靜態根都是另建目錄（`.v1/`＝`git show 51a8e5a:index.html`、`.base84/`＝`84b1a0c`，`js`／`assets`／`tests` 用 junction 接回來），
**worktree 的 `index.html` 全程唯讀、不做反向 sed**（`02 §6.1` 第 1 條）；驗完即刪。

### 覆審點名的盲區，寫在這裡不讓它再掉一次

**T5 的計數 proxy 把 `showBag`／`showRoleInfo`／`openHelp` 換成空函式，所以整輪 tap 掃描裡那三種面板一次都沒真的打開過**
——CRITICAL-1 就是從這個縫掉出去的。再加上 T4／T5 的量測範圍只有 `#table` 內，
而 `#modal` 是 `position:fixed`、在 `#table` 之外，不在任何一條 T 的範圍裡。
**這一類「被 stub 掉的東西本身就是缺陷所在」的盲區，結構上閘門看不見。**
二版的 `--modal` 是專門補這一塊的：它**不 stub 任何東西**，真的把面板打開再量命中測試。
0.56b 若再加任何 proxy／stub，先問一句「我 stub 掉的那支函式，會不會就是我要驗的東西」。

---

## 覆審 R2 逐條三態（三版，`d81060f` 起）

> 覆審全文＝`scratchpad/review-table3d-a-r2.md`（冷讀、worktree 唯讀）。
> R2 的結論是「R1 五條全部真的修好、T0–T6 親跑真綠」，但**裁乙的『讓寬』帶進一個新的版面回歸**（HIGH-A），
> 另有 1 個 MEDIUM 與 5 個 LOW。下表是我對每一條的處置。

| R2 條目 | 三態 | 做了什麼／為什麼算數 |
|---|---|---|
| **HIGH-A** 第 7 夜 `#north` 溢出 17px（出價）／4px（盯上） | **真的修好** | **成因是機械的**：第 7 夜同時是規則夜（`RULE_NIGHTS [3,7]`）與 wide 夜（`SHRINE_NIGHTS [5,8,11]` 的前一夜），預告框那一夜要多印一整段規則說明；裁乙的讓寬把它縮到 179.4px 之後排成 **89.8px**，撐爆固定 56px 的 `#north`（`overflow:visible` ⇒ 第一行衝出畫面上緣、底下壓到座位卡、規則說明句中斷）。**修法＝規則夜不讓寬**：`fillRails` 掛 `.shwide` 的條件從「`#shrines.wide`」收緊成「`#shrines.wide` **且** 預告框裡沒有 `.rulein`」，退回 343.8px。判準直接問**渲染出來的 DOM**，不另抄一份「哪幾夜是規則夜／wide」的規則（兩邊的唯一事實來源分別是 `ruleForRound` 與 `shrinesHTML`）。**配套把閘門的覆蓋範圍補上**（見下一列）。**取捨講白（四版依 R3 MEDIUM-D 照實改）**：那一夜香火榜退回 254px，被切的**不只招式名——三張待請卡的尊名也被切**（實測 solo seed 1 第 7 夜：殘日 `.shn` 16/9、大士爺紙尊 40/24、有應公 24/6；系別 chip 22/22 沒被切，`.shn` 包層那一半有效）。第 7 夜同時是請神夜前一夜，正是裁乙要保的兩夜之一 ⇒ **那一夜把裁乙要保的三樣裡的兩樣交還回去了**。取捨仍成立（規則讀不到比尊名被切嚴重），但這是**已知代價、不是已解決**，已寫進 GUIDE 新的第 12 條交給 0.56b。 |
| **HIGH-A 配套** `felt-probe --rounds` 預設 3 → 7 | **真的修好（加嚴，自行記錄）** | 第 7 夜本來就在 T2／T3 的取樣範圍外，所以這個縫沒有任何閘門守著。預設拉到 **7**（`02 §2.1`：這是**提高**難度，自行記錄即可）；另加「局末（主按鈕變『再入妖市』）就收工」的守衛，`--rounds=12` 才跑得完整局而不會點到 `location.reload()` 逾時。**本次官方跑的是 `--seeds=1,2,3 --rounds=12`**：四個容器各 **50 格全 0**、`#felt` `scrollHeight` 50 格全 252 ≤ 260、`EXIT=0`。★四版依 R3 MEDIUM-F 更正：這**不等於「整局」**——`felt-probe` 的內層有 1500 步上限。四版那一輪治具自己印出來的收工理由是：**seed 1／2 步數跑滿 1500 仍未結束（那兩局沒打完，停在第 8 夜）**、seed 3「這一局打完了（局末，第 11 夜）」。量到的 50 格確實全 0、三顆 seed 的**第 7 夜都在裡面**，結論不受影響；但四版起治具會逐顆 seed 印出收工理由、跑滿時另外印一行提醒，並可用 `--steps=` 放寬——不再靜默截斷。★ |
| **MEDIUM-A** `--handoff` 缺活性斷言 | **真的修好** | 判定式加 `sealedCount > 0`：只驗「殘留 0」是歸零斷言，`openSheet`／`bump`／`closeSheet` 任何一支改名都會讓這一輪根本沒封出徽章、殘留自然是 0 ⇒ 恆綠（`02 §6.1` 第 1 條）。另外依 R2「未確認」那一條，改成**掏空與 `?table3d=0` 兩條路都跑**，兩條都要「封出 1 顆、交棒當下殘留 0」才算過。 |
| **LOW-B** 「讓寬反而可能收回一行」與實測相反 | **真的修好** | CSS 註解與報告都換成實測：請神夜前一夜出價頁 343.8px/29.4px（**2 行**）→ 179.4px/43.1px（**3 行**）、當夜 15.7px（**1 行**）→ 43.1px（**3 行**）。讓寬是**多出行**，只是一般夜的 56px 吃得下；第 7 夜吃不下，那正是 HIGH-A。 |
| **LOW-C** 裁乙斷言三欄只有 `.shmove` 有鑑別力 | **真的修好（鑑別力實測過）** | `g()` 找不到元素回 `null` ＋ 判定 `r[k] && r[k].cut` ⇒ **缺席＝視為沒被切**；inline 的 `.shfac` 在非 flex 的 `.shname` 裡 `scrollWidth/clientWidth` 都是 0、`0 > 0.5` 恆假。現在：**必填欄位（`.shname`／`.shn`／`.shfac`／`.shmove`）缺席或量不到（0/0）一律算紅**，`.shtaken` 為選配；`.shname` 本身也納入量測；那一夜 `#north` 溢出非 0 也算紅。**突變驗紅**：從 HEAD **只拿掉 `#northShr .shname{display:flex…}` 這一個宣告**（原檔先 `cp` 一份備份、跑完用備份還原，不做反向 sed），斷言立刻報 **6 個欄位紅**（三張卡的 `.shn`／`.shfac` 全部「量不到（0/0）」）——**這正是舊版會漏報成 `shfac 0/0 ✅` 的那兩欄**。 |
| **LOW-E** GUIDE §11.28 條號亂掉 | **真的修好** | 順序排回 **1–11**（原本 1–7、9、10、8），標題改「十一件事」，並新增第 11 條「北列 56px 是固定的，而且第 7 夜最緊」把 HIGH-A 的成因與 `--rounds=7` 的理由寫給接手。 |
| **LOW-D** `--modal` 把「helpBtn 不可見」也判紅 | **沒修到（刻意，記錄）** | R2 指出 `bad` 的條件含 `!r.pts.length`，所以「開面板時把 `？` 收起來」那種修法會被判紅。**本卷沒走那條路**（走的是 `isolation:isolate`），而且現行語意「`？` 要在、而且要被面板蓋住」比「不得贏得命中」**更嚴**，我認為現在這樣是對的。若 0.56b 真的要改成隱藏 `？`，記得**一起**改這道閘門的語意——不要靜默放寬。 |
| **MEDIUM-3（沿用）** `VERSION` 仍 `0.53` | **沒修到（刻意）** | 版號由主對話合併時定。第三次記在這裡：**合併 PR 不含首頁版本字串＝沒有送達證明**。 |
| R2 對 R1 五條的「真的修好」判定 | **接受** | 包含他做的單變數突變（從 HEAD 只拔掉 `isolation:isolate` 就回紅）——那比我自己的三邊對照更強，我沒有再重做一次。 |
| R2 §7.1 的「第 1 輪 103 個 requestfailed」 | **接受歸因，並照做** | 那是治具自己起的 `python -m http.server` 被三套 Playwright 併發壓垮（`pageerrors` 是 0、失敗全是自家 fixture server 的 GLB 請求）。**本次三版的官方那一輪是單獨跑的、沒有任何併發**。R2 給下一手的建議（把「連自家 fixture server 失敗」與「產品自己的錯誤」分成兩個計數器）我記在這裡，**本卷不動**——那會動到 `legend-drive` 的既有判定式，屬於 0.56b 的範圍。 |

### HIGH-A 的修法為什麼不是「表面修好」

- **不是把溢出藏起來**：`#north` 沒有加 `overflow:hidden`，`.preview` 也沒有被截斷或縮字級——
  規則夜的預告框**退回 343.8px 的原寬**，內容一個字沒少（`#northPrev` 56／`.preview` 52.8）。
- **不是只改門檻**：凍結檔一個字沒動；改的是**閘門的覆蓋範圍**（`--rounds` 3 → 7、官方跑到整局），
  那是**提高**難度——同一份門檻現在要在 50 格上成立，不是 12 格。
- **反面也驗了**：三版之前的那一版（`90b5274`）在第 7 夜是 17px／4px，R2 逐頁量過；
  三版在**同一顆 seed、同一夜**是 0（本卷 `T2-T3-felt-probe-new.txt` 的 `seed 1 第 7 夜` 兩行）。

---

## 覆審 R3 逐條三態（四版，`923ba30` 起）

> 覆審全文＝`scratchpad/review-table3d-a-r3.md`（冷讀、worktree 全程唯讀、前後各查一次 `git status`）。
> R3 判**可以合併**，R2 那五條**全部真的修好**（含他自己做的單變數突變：只拔掉 `isolation:isolate` 回紅、
> 只把 `bump()` 改成無效就讓 `--handoff` 在二版假綠、只拿掉 `.shname{display:flex}` 讓裁乙斷言報 6 欄紅）。
> 四版只做他列的三個 MEDIUM 與一個 LOW，**不動已經修好的碼**。

| R3 條目 | 三態 | 做了什麼／為什麼算數 |
|---|---|---|
| **MEDIUM-E** 第 7 夜的北列溢出仍然沒有任何閘門會紅 | **真的修好** | 他說中了：三版「把閘門的覆蓋範圍補上」實際上只補了**人眼**——`felt-probe` 是純診斷（`process.exitCode` 只在容器不存在時非 0）、`legend-drive` 的直向只量 `#felt` 且取樣寫死第 1～3 夜、`layout-shot` 的 `northOver` 斷言只走「最早那個請神夜的前一夜」＝第 4 夜。四版把 `legend-drive` 的直向判定擴成：`VOVERFLOW` 同時量 **`#felt`／`#north`／`#west`／`#east`**、取樣夜數 `--vrounds` 預設 **8**（涵蓋規則夜 3／7 與 wide 夜 4,5,7,8）、**`#north`／`#west`／`#east` 溢出 >0 一律紅**（固定高度的格，不吃基準也不吃 slack），並加活性斷言（真的量到過樣本、沒有量不到的格）。**`#felt` 那一條的門檻一個字沒動。** **鑑別力雙向都驗**：對二版 `90b5274` 跑 ⇒ **溢出 >0 的 4 格、全部落在第 7 夜**（seed 1／2 各「出價 17、盯上 4」，與 R2 實測逐值相同）、判定 ❌、`EXIT=1`；對四版 HEAD 跑 ⇒ 見下方一眼表。 |
| **MEDIUM-D** 「第 7 夜只有 `.shmove` 被切」與實測不符 | **真的修好（改字＋交給 0.56b）** | 實測三張待請卡的**尊名全被切**：殘日 `.shn` 16/9、大士爺紙尊 40/24、有應公 24/6（系別 chip 22/22 沒被切）。CSS 註解（`index.html`）與本報告 HIGH-A 那一列都已改成這組數字，並寫明「第 7 夜同時是請神夜前一夜，正是裁乙要保的兩夜之一 ⇒ **那一夜把裁乙要保的三樣裡的兩樣交還回去了**」。**修法不改**（規則讀不到比尊名被切嚴重，R3 也同意），但列為**已知代價、不是已解決**，寫進 GUIDE **新的第 12 條**交給 0.56b（托盤上桌時北列本來就要重排）。 |
| **MEDIUM-F** 報告寫「`--rounds=12`（整局）」，實際是靜默截斷 | **真的修好** | `felt-probe` 的內層是 `for(let i=0;i<1500;i++)`，跑滿就**靜默**離開、不出聲也不影響 exit code——與 R1-MEDIUM-1 修掉的「治具靜默失敗」同一類。四版記下三種收工理由（跑到 `--rounds` 上限／這一局打完了／**步數跑滿仍未結束**），**逐顆 seed 印出來**，有 seed 跑滿時另外印一行提醒，並新增 `--steps=` 放寬上限。報告那句「整局」也改成事實（seed 1／2 停在第 7 夜沒打完、seed 3 走到第 11 夜）。**不改任何門檻**：截斷不會讓紅變綠，量到的格子照樣逐格判。 |
| **LOW-J** GUIDE 第 11 條只寫了一種組合 | **真的修好（不改碼）** | 第 11 條改寫成「**至少三種組合同時停在 `.preview` 52.8／北列 56 的天花板**」：① solo 規則夜不讓寬那一側 343.8px（剩 3.2px）② **押寶夜落在第 7 夜的出價頁**——`showMarket` 的樣板是 `(rl && !stake)`，押寶夜的規則說明寫在一注條裡、**不進預告框** ⇒ 那一頁沒有 `.rulein`、`wide && !hasRule` 成立、**照樣讓寬**，179.4px 下也正好 52.8（只剩 1.6px）；覆審實測 seeds 1..40 有 **11 顆**把押寶夜排在第 7 夜（**含官方跑的 seed 3**），同一夜兩頁的版面會左右互換（盯上 254.2／出價 418.6），那是 `.rulein` 判準的必然結果、不是 bug ③ **熱座規則夜（第 3 夜就會遇到）**——預告框多一段「【西家・玩家二 出價中｜壽命 N】」，343.8px 下也是 52.8。並記下 `.preview` 的量化高度（15.7／29.4／43.1／52.8／62.4 ＝ 1～5 行，56px 最多吃到 4 行）與「**熱座第 7 夜沒有任何閘門走得到**」＋0.56b 最省的做法（`felt-probe` 加 `--mode=hotseat`）。 |
| **LOW-H** GUIDE 第 8 條的行號過期 | **順手修掉** | 觸控白名單 JS 那條寫 `:6430`，實際在 **`:6637`**（我重 grep 過）。純文件錯字，改掉。 |
| **LOW-G** `.shmove` 列必填、但被請走的卡沒有這一欄 | **沒修到（記錄）** | 今天不會誤紅（`layout-shot` 只拍第 4 夜，那時沒有卡被請走）；**把拍攝目標改成「任一請神夜前一夜」就會在正常畫面上判紅**。0.56b 若動拍攝目標，記得把 `.shmove` 改成「`.shcard` 沒有 `.gone` 時才必填」。 |
| **LOW-I** `--tapsonly` 會印 3 行 ❌ 然後總判定 ✅ | **沒修到（記錄）** | `H6 三條路徑`／`直式蓋板`／`直向（沒帶 --base=）` 在 tapsonly 下本來就沒資料。判定式是對的（只 AND 該模式相關的項），但**貼進報告時極易被誤讀**。看 `--tapsonly` 的輸出時只看 `--modal`／`--handoff`／`--taps` 那幾行。 |
| **LOW-K** `felt-probe --rounds` 預設改動跨卷 | **沒修到（記錄，R3 已追過影響）** | 請神 2.0／3.0 兩份凍結檔寫的 `felt-probe --seeds=1,3` 不帶 `--rounds`、吃預設。R3 逐條追過：那兩卷用它產的是**基準表**，而 `legend-drive` 的直向判定只讀第 1～3 夜的鍵，多出來的第 4～7 夜鍵不會被讀到 ⇒ **不影響那兩卷的判定、也沒讓它們變鬆**。動共用治具的預設值時要順手掃一次誰在吃預設。 |
| **LOW-D**（沿用） `--modal` 把「helpBtn 不可見」也判紅 | **沒修到（刻意）** | R3 同意現行語意比較嚴。0.56b 若改成隱藏 `？`，**要一起改這道閘門**。 |
| **MEDIUM-3**（沿用） `VERSION` 仍 `0.53` | **沒修到（刻意）** | 第四次記：合併 PR 不含首頁版本字串＝沒有送達證明。 |
| R3 §9.1 的額外實測（`?table3d=0` 逐夜對 `84b1a0c` 14 頁逐值相同） | **接受，並記下它補掉的洞** | 那一輪在**第 4～7 夜**（凍結檔 T1 從沒量過的夜）上比，順便把 R2 §十「二版新增的 `.shn` 包層會不會動到非掏空算繪」從推理補成實測：**不會**。 |

### MEDIUM-E 的閘門為什麼不是「表面補上」

- **紅的原因是行為斷言**（`#north` 的 `scrollHeight − clientHeight`），不是旁枝錯誤；二版四格紅的位置與 R2 獨立量到的
  「第 7 夜出價 17／盯上 4」**逐值相同**。
- **反面也驗了**：同一支判定在四版 HEAD 上綠（見一眼表）。
- **沒有放寬任何既有條件**：`#felt` 那一條的門檻、seeds、基準鍵一個字沒動；新增的是**另一組容器**與**更多夜**，
  兩者都只會讓通過變難（`02 §2.1`：加嚴自行記錄即可）。
- **活性斷言**：`okVert2` 要求 `vsamples2 > 0` 且沒有「量不到的格」——不會因為選擇器全部查不到而恆綠。
