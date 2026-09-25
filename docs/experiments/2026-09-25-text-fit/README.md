# 文字完整顯示（v0.58.2）證據

凍結檔：`../2026-09-25-acceptance-text-fit.md`（v1.0，未改）。治具：`tests/tools/text-fit-probe.mjs`（量測）＋`tests/tools/text-fit-inventory.mjs`（盤點表）。起因截圖 `user-report-iphone-2.jpg`。

## 結果

| 條 | 基準 f105ea2（v0.58.1） | 修正後 |
|---|---|---|
| #1 基準判紅 | V1 出價（solo／hot／nw1／nw2／nw3 第 1 夜）皆紅，含 `#feltHead > span.headCompact`（另三項：`.ibgap`「你 0・平…」、`.ibwhen`「第 5 夜請神・倒數…」、`.shn`「大士爺…」） | — |
| #1 盤點 | 950 格（畫面鍵×V1–V5）；**22 項**＝資訊類 15、可縮寫類（可捲動）7；含資訊類截斷的格 766（V1 179／V2 140／V3 179／V4 176／V5 92） | 790 格；**資訊類截斷 0 格**（V1–V4 各 158 格、V5 158 格全 0）；剩 7 項全是可捲容器 |
| #2 可縮寫類全文位置 | — | 7 項全部「同一容器捲動即見」，治具逐字捲過驗證 reach **162/162 格**全到（`#felt` 92／`#railE` 24／`#railW` 16／`#nwBody .nwBig` 12／`#review` 10／`#modalbox` 5／`#nwScr` 3） |
| #3 文字條 alpha | 心願條 .62、預告／盯上說明框 .25、押寶條 .62（皆無字影）；頂列 0 且揭盅結果／夜末等非掏空頁無字影 | 心願條／預告框／押寶條／頂列縮寫 **.90**；揭盅條 .88；成交總覽卡、對話泡 1；頂列容器 0 但全畫面有字影。低於 .85 且無字影：**0 格** |
| #4 landscape-fit（同一支治具重跑） | 105/105（前卷修正後） | **105/105**；嚴格 96/105（同前卷，差的 9 格是 `#modal` 全螢幕底層豁免）；主按鈕 105/105；直式 21/21；轉場 188/188；切換 4/4；pageerror 0（`landscape/probe-head-textfit.json`） |
| #4 trace-eq（seeds 1..20，對 f105ea2） | — | `equal:true`；`--mutate` 突變驗紅 ✅（`trace-eq.txt`） |
| #4 全套 node --test | 402/402（`suite-before.txt`，8m07s） | **402/402**（`suite-after.txt`，7m38s）；改前通過的 402 個測試檔名逐一比對，0 遺失 |
| pageerror | 0 | 0 |

基準數字是用最終版治具重跑的第二次（`probe-base-f105ea2.json`）。同一支治具的第一次基準跑（治具加 alpha 漸層解析與捲動驗證之前、截斷判定相同）得 883 格／23 項，多一項同選擇器拆分；兩次基準都含 `#duel`（10～12 格）與 `#nwScr`（引言卡外層 3px）。

### 量測程序（改產品前定下）

- 截斷判定一字照凍結 #1：可見、含字、`scrollWidth>clientWidth+1` 或 `scrollHeight>clientHeight+1`，且 overflow 非 visible／有 ellipsis／line-clamp。`overflow:auto|scroll` 的另標「可捲」，**照列入盤點**，分類時歸可縮寫類並驗全文位置（下節）。另掃葉層文字帶「…」者當程式截斷候選：全數是台詞原文的刪節號（`index.html` 無 slice＋「…」的截斷碼，grep 過）。
- 顯示文＝逐字以 Range 取字框，中心落在元素與所有裁切祖先的交集內才算顯示。
- 矩陣：solo（seed 3）整局＋袋子／角色ⓘ／規則；hot 整局；夜行錄第 1 章整局＋殘卷（`?nwall=1`）；第 2、3 章打到第 2 夜出價。出價／盯上／異事／請神／夜末畫面鍵帶夜數，所以規則夜（3、7）、異事夜（4、8、11）、請神夜前一夜（4、7、10）各自成格。安全區以覆寫 `--safe-*` 模擬（重建模型，不是真機）。
- **限制**：整局路徑由 UI 驅動，兩次跑到的畫面不全相同（同碼兩次基準跑 883／950 格；修正後 solo 與 nw1 在第 9 夜結束、基準跑到第 12 夜——`trace-eq` 證明引擎逐位元組相同，差在治具點擊時序）。第 10–12 夜在修正後由 hot 整局覆蓋（出價 1–12 夜齊）。

## #2 分類

| 項 | 分類 | 理由／全文位置 |
|---|---|---|
| `#feltHead .headCompact`（頂列縮寫） | 資訊類 | 風位、月相與受惠陣營、異事名、規則名（凍結點名） |
| `.incboard .ibgap`／`.ibwhen` | 資訊類 | 領先落後、請神倒數（凍結點名） |
| `.shname`／`.shn`（三系各一＋已請走卡） | 資訊類 | 尊名（凍結點名） |
| `.shmove`（三系）／`.shtaken` | 資訊類 | 招式名、「已請走：X 家／已回天」＝還能請哪尊 |
| `#duel` | 資訊類 | 夜戰字幕；#duel 為 overflow:hidden，整欄比視口高 6–12px 時上緣拍數燈、下緣字幕被切 |
| `#nwScr`（intro／scroll，overflow-y:hidden） | 資訊類 | 引言卡／殘卷卡底被切 3px |
| `#felt`（非掏空頁）、`#modalbox`、`#review`、`#railW/#railE .railPages`、`.nwBig`、`#nwScr`（章節選單） | 可縮寫類（可捲動） | 全文在同一容器捲動即見；治具 `reach()` 把容器從頭捲到尾、逐字記錄曾落在可視框內，修正後 162/162 格全到（基準 `#felt` 125/139：少的 14 格就是頂列縮寫被 ellipsis 吃掉的字） |

完整逐項（全文、顯示文、畫面×視口）：`inventory-base.md`／`.json`（基準）、`inventory-head.md`／`.json`（修正後）。

## 每類問題的修法比較（實測：`compare/`，solo seed 3 出價頁，V1＝852×393 瀏海、V4＝667×375）

**頂列縮寫 `.headCompact`**（基準 V1 只分到 114px，V4 只剩 39px；整句 167px，規則／異事夜 221px 起）

| 方案 | 截斷（第 1／4／7／8 夜 × V1–V4） | 頂列高（第 4 夜 V4） | 判定 |
|---|---|---|---|
| 基準 ellipsis | 16/16 格截 | 69px | ✗ |
| A 原地換行 | 0 | **174px**（V4 只剩 39px 寬 ⇒ 一行 2～3 字、約 8 行，`bid-n4-H1wrap-V4.png`） | ✗ 字被拆碎 |
| B 原地換行＋右側讓位 115→46px | 0 | V1 第 4 夜 120px（心願條擠上第一列，縮寫只剩 38px，`bid-n4-H2wrap46-V1.png`） | ✗ 同病 |
| C 縮短措辭 | 最短寫法「東風・🌑朔月｜陰氣 HP+1」約 135px，仍 > V1 的 114px、V4 的 39px | — | ✗ 單用不夠，且要改字 |
| **D 放不下就整句落到下一列（採用）** | **0** | 100px（第 1 夜 V1 由 54→72px） | ✓ |

D 的做法：`flex-basis:auto`（整句寬）＋每段 `.hcs` inline-block，只在「・」「｜」之間換行；加 `--strip-bg` 底，因為落到第二列正好壓在 3D 拍品上方（未加底的版本字被燈籠火光吃掉，`compare/headCompact-shadowOnly-V1.png`）。

**香火榜與三尊待請卡**（北列 56px 原本只用 35.4px）

| 方案 | 截斷 | 副作用 | 判定 |
|---|---|---|---|
| 基準 | ibgap／ibwhen／尊名／招式／已請走 全截 | — | ✗ |
| N1 只讓香火榜換行 | 剩尊名、招式（V4 請神前一夜 6 項） | — | ✗ |
| N3 香火榜換行＋待請卡換排（行高 1.35） | 0 | 三尊都已請走時卡排成三排，北列內容 62px > 56px（35 格，治具護欄 spill） | ✗ |
| 縮「已請走：北家」→「北家請走」＋已請走卡拿掉系別 chip | 算寬：V4 仍三排（有 chip 時）；拿掉 chip 丟資訊 | 改字＋少資訊 | ✗ |
| 北列改 minmax(56px,auto) 長高 | 可解 | 動到 3D 取景的 HUD 輸入（1599 矩陣） | ✗ 範圍外 |
| **N3＋行高 1.2、列距 1px（採用）** | **0** | 最壞情況（夜行錄第 12 夜 V1、solo 第 9 夜 V4）塞回 56px；spill 0 | ✓ |

**文字條被 3D 壓字（#3）**：採「底色不透明度 .62→.90，單一變數 `--strip-bg`」。比較過：只靠字影（頂列原本就有；縮寫落到第二列、只留字影的版本，「全隊」被燈籠火光蓋掉，`compare/headCompact-shadowOnly-V1.png`，2x）；backdrop-filter 模糊（既有註解：iPhone 牌桌只有 55–58fps，不採）。修後心願條：`wishbar-V1-after.png`（修前 `wishbar-V1-before.png`）。

**#duel**：矮橫向（max-height 440）把字幕之間的外距收成 0／1px（共省 15px）。比較過：縮 `.fav` 172px 佔位框（3D 人形用 `FIG.pixelH` 176 對它，會錯位，不採）；#duel 改 overflow:visible（等於讓治具看不見，不採）。修後 25 格夜戰 0 紅。已知：演出中的橫向滑入（`#dL` translateX）與傷害飄字是暫態，本輪量到 0 次，但時序不同時可能再量到。

**#nwScr**：`assets/safe-area.css` 把引言卡最大高改扣實際上下 padding（原本寫死 28px，瀏海機底部 21px 時多 3px）。

## 措辭改動

無。頂列縮寫只多包 `<span class="hcs">`，`textContent` 與改前逐字相同（「・」「｜」分隔原樣保留）；其餘全是 CSS。

## 回歸護欄（凍結以外、本卷自加）

改成 overflow:visible 之後凍結 #1 對它們不作用，所以治具另量 spill（區塊內容溢出自己的框）與 overlap（同列兄弟框互疊 >1px），範圍 `#feltHead`、`#northShr`、`#northPrev`。修正後 overlap 0；spill 只剩 `#northPrev` 的預告框（`.preview` 29/27、熱座 V4 `#northPrev` 62/56），基準同樣有（264／24 格），非本卷引入、未處理。

## 不回退

數字見上表；原始輸出：`landscape/probe-head-textfit.{json,log}`、`trace-eq.txt`、`suite-before.txt`／`suite-after.txt`。index.html 維持 CRLF（8671 行、8671 個 CRLF，改完逐次核對）。

## 未入庫

`shots-base-f105ea2/`、`shots-head/`、`landscape/shots-head-textfit/`（每格 V1 截圖，合計約 60MB）留在工作樹本機、不提交；關鍵畫面已複製到 `compare/`。重跑：`node tests/tools/text-fit-probe.mjs [--base f105ea2]`（全模式約 30 分鐘），`node tests/tools/text-fit-inventory.mjs <probe.json> <前綴>`。
