# 0.55a 版面卷 實跑報告（拍賣桌整片掏空，2026-09-10）

> 卷＝ROADMAP_V2 Top 1 的 **0.55a 版面卷**（桌面先平面；托盤／Raycaster／木紋香灰是 0.55b）。
> 規格＝`docs/proposals/2026-09-10-plan-table3d.md`；驗收凍結＝`docs/experiments/2026-09-10-acceptance-table3d.md`（**T0–T6**；T7–T12 屬 0.55b）。
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
| **T2** `#felt` 直向恆 0 | **綠** | 12 格**全 0**（基準 11 格 0＋1 格 54）；配套 `scrollHeight` 12 格**全 252 ≤ 260** | `evidence/T2-T3-felt-probe-new.txt`、`felt-new.json` |
| **T3** 側欄與北列不溢出 | **綠** | `#west` 12 格 0／`#east` 12 格 0／`#north` 12 格 0（**基準 `#north` 本來就是 11**，本卷順手修掉） | 同上 |
| **T4** 橫向溢出 0＋0 error | **綠** | seeds 1..6 跑完 6 局：橫向溢出**橫式 0 筆、直式 0 筆**；`console error 0／pageerror 0／requestfailed 0`；治具總判定 `✅ 通過` | `evidence/T4-legend-drive-new.txt` |
| **T5** 觸控命中回歸 | **綠** | 基準清單 177 個可測元素**全部命中**（177／177），`trayTap` 被呼叫 **0** 次；**鑑別力突變驗紅**：`#tray{top:0;z-index:9}` ⇒ 174／177、`trayTap` **3** 次、exit 1 | `evidence/T5-base-84b1a0c.txt`、`T4-legend-drive-new.txt`、`T5-mutation-check.txt` |
| **T6** 直式蓋板行為不變 | **綠** | 390×844：`#rotateHint`=flex／`120px 134px 120px`／`.rail`=none／`#table` 橫向溢出 0／`#felt` backdrop-filter=`blur(7px)`；**對基準逐項相同** | `evidence/T4-legend-drive-new.txt`、`t3d-base.json` vs `t3d-new.json` |
| 9 套單元測試 | **綠** | 8／5／7／32／8／16／28／32／36 ＝ 172 條全過、0 紅 | `evidence/unit-tests.txt` |

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
node tests/tools/felt-probe.mjs --seeds=1,3 --rounds=3 --sel=#felt,#west,#east,#north --tag=new --port=9601
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

**配套人眼（T3 的字面要求）**：`evidence/shot-055a-west.png`／`-east.png` 是側欄卡片特寫，
四張卡的**名稱／戰力＋系別 chip／招式行（`✦ …`）／部隊預覽（`飄影×4・攻 0・血 5・3 拍`）四樣都完整可見**，
沒有 ellipsis 到看不出招式。做法是卡片矮 10px、寬 24.7px 之後把字級一起收
（`.nm` 11.5／`.pw` 10／`.ab` 9／`.uline` 9），**`.uline` 與 `.ab` 維持同級**（請神 2.0 凍結檔 G11 明訂不得更小）。

### T4 橫向溢出 0＋0 error

```
node tests/tools/legend-drive.mjs …/legend-drive-new.json --all --seeds=1,2,3,4,5,6 \
  --base=…/felt-base.json --taps --t3d --tapseeds=1,3 --port=9628 …
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

`node tests/tools/layout-shot.mjs docs/experiments/2026-09-10-table3d-a-evidence/shot-055a --port=9627 --sel=#west,#east`
（`console error 0`）

| 檔 | 是什麼 | T12 對應 |
|---|---|---|
| `shot-055a-n1.png` | **第 1 夜出價頁** | T12 第 1 張 ✅ |
| `shot-055a-mark2.png` | **第 2 夜盯上頁** | T12 第 2 張 ✅ |
| `shot-055a-west.png`／`-east.png` | **側欄卡片特寫**（左右各一） | T12 第 5 張 ✅ |
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

**留給使用者裁的一件（品味題，`03 R6`）**：請神夜前一夜的 `wide` 香火榜進了 299px 的北列格之後，
三張待請卡的**招式名被 ellipsis 成兩三個字**（「餘暉…」「普…」「有求…」，見 `shot-055a-preshrine.png`）。
在 v0.53 那一列有 564px。可選：① 照現況（招式名在請神夜的選尊視窗與 `？` 裡都看得到）
② `wide` 那兩夜把預告框讓寬給香火榜 ③ `wide` 那兩夜香火榜改浮在桌心。**本卷不自行決定。**

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
