# 畫面精美度第二階段（首頁甲＋牌桌戊，v0.59.0 候選）證據

凍結檔：`../2026-09-26-acceptance-visual-polish-p2.md`（v1.0，**未改**）。分支 `feat/visual-polish-p2`，基準 `14ac1f2`（v0.58.3）。未 push、未合併（#11 送達留給主對話）。

## 結論

| 條 | 判定 | 量法 | 基準 14ac1f2 → 改後 | 證據 |
|---|---|---|---|---|
| #1 無 emoji | 過 | visual-polish-probe 全模式 V1–V5，文字節點＋::before/::after＋title/placeholder/value 掃 Extended_Pictographic | 850 格有 emoji（出價頁含 😊🔊）→ 0／986 格 | `judge.json` #1 |
| #2 拍品窄籤 | 過（附註） | 出價／盯上 390 格×1560 籤：預設無卡、全名、高≥40、無截斷、系色條＝`--sys-<系>`、逐籤點開 missing 0、收起後無卡 | 360/360 格紅（整張卡可見、無色條）→ 違規 0；四系都出現 | `judge.json` #2 |
| #3 結果窄條 | 過 | 揭盅結果（成交總覽、請神）210 格：下緣距底列、看得到的項目 ⊇ 全部項目、字級 | 距底列 −3～477px → 恆 2px；missing 0；15／12px | `judge.json` #3 |
| #4 祖靈色 ΔE | 過 | CIEDE2000，實測計算色 | 基準無色條（祖靈 token 對 --gold 12.7、祖靈↔香火 19.4）→ 祖靈條 #8b6040 對 --gold 35.7、對籤框金線 26.4；四系兩兩最小 23.8 | `judge.json` #4 |
| #5 北列摘要 | 過 | 摘要字級、實際背景對比；第一階段北列 (a)(b)(d) | 10px／13.8 → 11px／最低 10.0；北列紅格 31 → 0（見註 3）；(c) 取景見 #7b | `judge.json` #5 |
| #6 字體分工 | 過 | 各類元素計算 font-family 首選 | 基準全明體 → 標題／卡名／數字 17 類皆 Noto Serif TC、內文 9 類皆 Noto Sans TC；兩套字檔皆已載入 | `judge.json` #6 |
| #7a 首頁版面 | 過 | 標題區中心、入口鈕命中、版本列 | 中心 (0.50,0.50) → V1–V5 x 0.185–0.355、y 0.617–0.822；三鈕命中 ≥40×40；`v0.59.0` 可見 | `judge.json` #7a |
| #7b 首頁相機 | 過（附註） | `home-camera-probe.mjs`：首頁 vs 牌桌、牌桌 vs 基準；`north-camera-probe.mjs` 同法 | 首頁相機位置／視線 ≠ 牌桌（fov 同 50）；牌桌第 1 夜位置／視線／fov／aspect／view 與基準逐值相同；north-camera 第 1 夜 V1/V3/V4 相等，V2 只有 #feltHead 框不同（見註 4） | `home-camera.json`、`north-camera.json` |
| #7c 聚光只在首頁 | 過 | 場景燈光清單與靜態參數 | 牌桌燈光逐值相同；聚光是加法混色光池面片（非燈），牌桌 visible=false | `home-camera.json` |
| #8 只換皮 | **未過（回顧 3.1px）** | `skin-rects-probe.mjs`（同一局內容）V1 根＋直接子元素 | 選角 0.2、夜行錄選單 0、引言卡 0、局末 1.9、**本局回顧 3.1**；夜戰（矩陣 4 格）2.2 | `skin-rects.json`、`judge.json` #8 |
| #9 不回退 | **未過（align railTabs）** | 同治具同矩陣第一階段 #1–#6；text-fit；landscape-fit；trace-eq；全套；draw／getParameters | 見下 | 下表 |
| #10 對照 | 交主對話目視 | — | — | `contact-mock-vs-impl-V1.png`、`contact-other-before-after-V1.png` |

### #9 細項

| 項 | 基準 | 改後 |
|---|---|---|
| 第一階段 #1 斷行／#2 越框／#4 對比／#5 觸控（V1–V5 紅格） | 全 0 | 全 0 |
| #3 字級（紅格，全是夜戰系字徽已列例外） | 4/3/3/3/3 | 4/3/3/3/3 |
| **#6 對齊** | 0 | **123 格／視口，全是 `railTabs` 一組**（見註 1） |
| text-fit 截斷（非捲動）／護欄 | 0／0 | 0／0（紅格都是「可捲到」類，V1–V4 62/37/62/65 → 52/40/52/55） |
| landscape-fit | 105/105、嚴格 96/105、直式 21/21、轉場 199/199 | 105/105、96/105、21/21、185/185 |
| trace-eq seeds 1..20 | — | equal:true；`--mutate` 驗紅 ✅（`trace-eq.txt`） |
| 全套 `node --test` | 398/402（4 個都是 tool-options 的 10s spawn 逾時，機器滿載；單獨重跑仍 1–3 個逾時） | **402/402** |
| 牌桌每 rAF draw／getParameters（gl-frame-probe） | 77／0 | 77／0；首頁 draw 17 → 18（光池） |

## 需要主對話裁定

1. **#9 第一階段 #6 railTabs**：治具把左右欄所有頁籤當成「同一列」比上緣。戊的窄籤是每欄直排兩枚，任何直排都必紅（同列的左 1／右 1、左 2／右 2 實際對齊）。凍結檔禁止我自己改分組或放寬，照紅列。建議：分組改成「左欄第 i 枚 vs 右欄第 i 枚」。
2. **#8 本局回顧 3.1px**：同一局內容下，回顧長捲動區每夜卡累積 −0.6px（黑體行高 1.448 vs 明體 1.437，加上 emoji 字形會撐高行框、線條圖示不會），到最後幾格累積 3.1px，超過 2px。兩個原因都是 #1、#6 要求的改動本身；試過把 body 行高鎖成明體行高，反而差到 8.7px（原本有 emoji 的行較高），已撤回。沒有對著這台機器的 emoji 字型調參數。
3. 附註：
   - **整局不決定性（改動前就存在）**：UI 驅動整局，同一版連跑三次在第 3 夜前後就分岔（基準自己 3 次實測；`north-camera-base-vs-base.json` 基準對基準 n3 以後 framing／cam 也不同）。所以「對基準逐格」只在同一局同一刻才比；#2 有 8 項（solo 第 5 夜盯章寫誰盯了）因局面分岔不同，改後同格內展開全過。
   - 第一階段北列基準紅 31 格是基準自己的量測結果，改後 0。
   - 分片 vs 序列：`shard-vs-serial-nw23.json`，nw2＋nw3 格鍵 26/26 相同、110 格第一階段判定全同；只有 10 格「逐件揭盅」動畫中途的 emoji 清單不同（兩邊都有 emoji，#1 判定相同）。
4. **#7b 註**：V2 第 1 夜 #feltHead 高 56→41（圖示比 Segoe emoji 窄，頂列少折一行）；不在出價頁的相機參數裡，但它是揭盅／hover 取景的障礙物輸入，開啟取景時框位會不同。

## 治具改動（全部在量基準之前或不影響基準數字）

- `visual-polish-probe.mjs`：加第二階段原始量測（emoji、字體、容器矩形、窄籤、結果條、北列摘要、首頁）；把 `svg.ic` 當成一個非字母字元（與基準把 emoji 當字相同）、`.icT` 原字在圖示可見時算看得到、北列原始項目按 emoji 拆段；章節局改用 `--seed`（原本是 Date.now()，每跑一次是不同的一局）。基準沒有圖示，前三項不改基準數字；章節種子改動後基準 nw1–3 重跑。
- 新增 `visual-polish-p2-judge.mjs`、`home-camera-probe.mjs`、`skin-rects-probe.mjs`、`visual-polish-p2-sheet.py`。
- `tests/ui-hierarchy.test.mjs` 的 `RELEASE_VERSION="0.58.3"` → `"0.59.0"`：每次發布都改這一行（歷次 commit 同型），不是版面斷言。

## 字型（#6 iOS）

標題／卡名／數字用 Noto Serif TC，內文用 Noto Sans TC，兩者都由既有的 Google Fonts `@import` 載入（沒有新增外部資源），iOS Safari 下載得到，實際就是這兩套。字檔抓不到時：內文退到 PingFang TC；明體那串的 `Songti TC` 在 iOS 沒有內建，會落到系統預設字（實質上也是 PingFang）。

## 跟示意圖不同的地方

- 聚光：示意用 CSS backdrop 提亮；實作是 3D 加法混色光池＋首頁機位推近（0.62 不透明畫布），比示意暗一點、桌面更大。
- 頂列（夜份／風位）用明體（示意是黑體）：換黑體會改變頂列寬度與 3D 取景的障礙物框。
- 頂列「X 拍」前的系色小方塊（示意 JS 加的）沒做。
- 結果條內每件拍品按內容寬排（示意是固定兩欄）：兩欄時成交總覽會長到壓住側欄窄籤。
- 窄籤只顯示名稱，拍品卡上的押／盯徽章要點開才看得到（示意同樣如此）。
- 首頁入口鈕是金底線樣式（甲），其他畫面的主鈕是朱印（戊）。

## 重跑

`node tests/tools/visual-polish-probe.mjs [--base 14ac1f2] --modes <m> --tag <t> --out probe --port <p>`（按模式分 5 片並行，約 1 小時）→ `--merge a.json,b.json,… --tag base-merged|head-merged` → `node tests/tools/visual-polish-p2-judge.mjs probe/probe-base-merged.json probe/probe-head-merged.json --out judge.json`。原始 probe JSON（每份 9MB）與截圖留在工作樹本機，沒有提交。
