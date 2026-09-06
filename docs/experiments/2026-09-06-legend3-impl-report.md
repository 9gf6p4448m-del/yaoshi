# 第 4 卷「傳說三尊」實作卷 實跑報告（2026-09-06 深夜，v0.43）

基準 SHA `ca14065`（v0.42）。凍結檔＝`docs/experiments/2026-09-06-acceptance-legend3-impl.md`（L0–L7，動手前訂、**全程一個字沒動**）。
規格＝`docs/proposals/2026-09-06-legend3-design.md`。閘門原始輸出全文＝`docs/experiments/2026-09-06-legend3-evidence/`。

## 一、結論表

| 條件 | 判定 | 一行摘要 |
|---|---|---|
| **L0** kill switch | ✅ | `LEGEND_ON=false` 的 `trace(1..20)` 與 `ca14065` 逐位元組相等（325288 字元對 325288）；ON 不等（392280）。 |
| **L1** 優勢策略窮舉 | ❌ **無法達成** | 三個狀態都存在優勢策略。兩個獨立紅因：①「四人三龕、各拜主系」的治具**一定有人獨佔一龕**，獨佔者的收益完全不隨對手變動 ⇒ 依定義必有優勢策略；②即使把四家全擠到同一龕，**「h 全 0」下「每夜燒滿」找不到任何能打敗它的對手組合**。「永不燒」三個狀態都被打敗（那一半 ✅）。詳見 §三。 |
| **L2** 活性 | ✅ | 至少一尊被請走 **99.24%**（≥60%）；殘日 92.06%／大士爺 85.33%／有應公 84.20%（各 ≥25%）。 |
| **L3** 有感不支配 | ❌ **無法達成（相對帶）／✅（持有者勝率）** | 相對帶 **2.147**（門檻 1.15–1.60）。但**把三尊的紙紮全部歸零、在夜戰裡毫無作用時，相對帶仍有 1.490**——這條量法本身含選樣混淆，門檻上緣 1.60 的可用區間只夠容納「一件毫無作用的東西」。持有者最終勝率 **37.71%** ≤55% ✅。詳見 §四。 |
| **L4** 無支配策略 | ❌ **未過（差 0.08pp）** | 六策略中五個過，`incenseMax` **40.08%** > 40%。這正是凍結檔預言的紅法「incenseMax 靠獨一份衝 >40%」。n=10000 時 40% 附近的單點 SE≈0.49pp，所以 40.08 與門檻在統計上分不開——但**照條文的字面判定就是紅**，我不改門檻也不改數值。詳見 §五。 |
| **L5** 節奏 | ✅ | 預設桌中位 **11** 夜（門檻 10–12）；同種子 `LEGEND_ON=false` 對照也是 11 夜（＝請神沒有把局縮短）。 |
| **L6** 測試與瀏覽器 | ✅（測試／0 error／兩條路）＋❌（無橫向溢出） | 既有 5 套全綠；`tests/legend.test.mjs` 15 案新版全綠、對 `ca14065` **15 案全紅且全部紅在行為斷言**；Playwright 六局跑到「再入妖市」，0 console error／pageerror，「請走」15 次、「天亮回天」收攤 3 龕（結出 2 筆階段獎勵）；規則頁三輪 fresh read-back 過。**「無橫向溢出」照字面判是紅的**——但同一支治具對 `?legend=0` 的對照組量到**逐值相同**的溢出，這一卷沒有讓它變差（見 §7.2）。 |
| **L7** 範圍 | ✅ | 只動 `index.html`＋兩份既有文件＋新增治具與證據檔；POOL／CURSES／ROLES／TRAITS 既有條目與 CFG 既有鍵**逐位元組相同**（機械比對，見 §八）。 |

**未達成的三條（L1／L3／L4）要使用者裁定**——我沒有動門檻、沒有動凍結條文、也沒有動 `LEGENDS` 或 `CFG` 的任何數值（`02 §2.1`；派工也明寫「其他數值不得動」）。可選路線與代價寫在 §三～§五。

## 二、做了什麼（檔案:行號）

行號以 `index.html` v0.43（HEAD）為準。

| 段落 | 位置 | 內容 |
|---|---|---|
| CFG 新鍵 | `index.html:578-591` | `LEGEND_ON/INC_MAX/INC_K/INC_PITY/INC_GIFT_P/INC_AI`；**既有鍵一個沒動** |
| `?legend=0/1` | `index.html:604-605` | 只影響這一次載入（與 `?paperwar`／`?res` 同一段） |
| `LEGENDS` 表 | `index.html:1680-1694` | 3 筆，與 POOL 同形＋`legend:true`，不進 `S.deck`；`m` 欄＝3D 佔位模型鍵 |
| 新 TRAITS | `index.html:1733-1738` | `eliteBlind{blindFront:2}`／`wardGuardAll{hpAll:2}`／`hauntAnswer{curseHaunt:1}` |
| `blindFront` | `index.html:2851-2857`（`pwBolt`） | 一拍開打前對面前鋒 atk −2（下限 0） |
| `curseHaunt` | `index.html:2884-2892`（`pwHaunt`） | 三拍：對面每有一件詛咒品多燒 1 隻 |
| 神龕狀態 | `index.html:2096-2105`（`makeState`） | `S.shrines`／`S.incense`／`S.shrineStat`；`LEGEND_ON=false` 時**一個欄位都不建** |
| 請神引擎 | `index.html:2478-2604` | `incAiOf`／`aiIncense`／`shrineReward`／`shrineClose`／`resolveShrines`／`settleShrinesEnd` |
| 請神紀錄 | `index.html:3231-3240`（`recordShrines`） | 掛在該夜的 `S.history.nights[]` |
| 三條迴圈接線 | `3683`（`beginRoundCore` 清空 `S.incense`）、`4218-4249`（UI `startShrine`，內部 `4221` 呼叫）＋`4635`（`endGame` 回天）、`5007`／`5032`（`playPolicyGame`）、`5308`／`5327`（`simulate`） | 順序一律 `resolveAuction → resolveShrines → resolveBattles` |
| POLICIES | `index.html:4955-4966` | `incenseMax`／`incenseNever`（出價一律照 splitter，變因只有燒香） |
| 神龕列 UI | `66-92`（CSS）／`3313-3331`（`shrinesHTML`）／`3295`（`renderSeats`） | 北席**旁**三格，不新增 grid 列（`#felt` 高度預算零餘裕） |
| 燒香列 UI | `93-99`（CSS）／`3915-3934`（`incbarHTML`／`incPick`／`incBump`）／`3775`（`initIncense`）／`4344`（`submitHumanBids`） | 密封，交卷時才寫進 `S.incense` |
| 規則頁 | `index.html:3657-3667` | 🕯️ 請神節（三輪 read-back 定稿） |
| 局末回顧 | `4690-4694`（逐夜「請神」列）／`4671-4675`＋`4725`（「天亮回天」列） | 純呈現 |
| 版本 | `index.html:1757` | `VERSION="0.43"` |

新檔：`tests/tools/legend-gate.mjs`（L0–L5，含 `dominantScan` 與 L3 消融診斷）、`tests/legend.test.mjs`（15 案）、`tests/tools/legend-drive.mjs`（Playwright）。
文件：`docs/IMPLEMENTATION_GUIDE.md §11.20`、`docs/GAME_DESIGN.md` changelog。

## 三、L1 為什麼過不了（無法達成＋原因）

### 3.1 收益模型（`tests/tools/legend-gate.mjs:51-118`，動手前就寫死在治具檔頭）

凍結檔字面：「請到＝＋該尊在紙紮夜戰對桌上其餘三袋的**邊際勝場** × PW 均傷；沒請到＝−燒的量＋階段獎勵」。
「邊際勝場」實作成 **Δ勝率 × 剩餘夜數**（傳說進袋之後留到局末；只算一夜等於把永久法寶當一次性道具，會系統性低估）。這個解讀寫在治具註解裡供覆核，**它本身不是門檻**。

### 3.2 兩個獨立的紅因

**紅因 A（治具結構性）**：四人、三龕、「各拜自己主系」⇒ 只要主系分佈不是四家全同，就有人**獨佔一龕**。獨佔者的收益矩陣每一格都與對手無關（閘門輸出裡北家、西家那兩列 `min=avg=max`），依「弱優勢＝每一種對手組合下都不劣」的定義**必然**有優勢策略。這是四人三龕的結構性後果，不是機制缺陷——但它就是 L1 字面條件下的判定依據。

**紅因 B（機制本身）**：治具另外跑了一組 `contend`（四家主系全設祖靈、四人擠同一龕），紅因 A 消失後，**狀態①「h 全 0」下「每夜燒滿」仍然 0 筆被打敗的對手組合**。原因是燒滿的下檔被夾死：一夜最多燒 3，最差就是被搶走、領 `⌈3/3⌉=1` 香灰，淨損 2；而請到的期望值（V 依袋子在 5.9～55.8 之間）遠大於 2。狀態②（有人 h=6 領先）與狀態③（自己 h=8）的「燒滿」都被打敗了 ✅——**擋得住燒滿的只有「有人已經領先到你追不上」**。

L4 的 `incenseMax` 40.08% 是同一件事的另一個面向（見 §五），兩條紅可以一起處理。

### 3.3 兩條路（要使用者裁定）

1. **改機制**，讓「h 全 0 時燒滿」也有真下檔。候選旋鈕：降 `INC_MAX`（3→2→1，直接壓縮單夜可下的注）／拿掉最低段的階段獎勵／改「同夜燒最多的人反而後擲」。前兩個都會動已裁定的規格（§4.1、§4.2），第三個是新機制。
2. **改量法**：在「單夜快照＋燒 0 的收益恆為 0」這個模型下，V 夠大必出現燒滿優勢、V 夠小必出現永不燒優勢，可用區間極窄；要真的測「搶請賽局」得做**多夜展開**（把香火累積的選擇權價值算進去）再窮舉。這是改寫凍結條件，走 `02 §2.1` ＋使用者同意（前例：R2→R2′）。

## 四、L3 為什麼過不了（無法達成＋原因）

### 4.1 量到的數字（n=10000）

- 請到者（自請到那夜起）：**71.82%**（106098/147719 場）
- 同局未請到者：**33.46%**（65218/194913 場）
- 相對帶 **2.147**（門檻 1.15–1.60）❌
- 持有任一尊者的最終勝率 **37.71%**（7814/20723，門檻 ≤55%）✅

### 4.2 這個量法本身的下限（消融，n=2000，同一批種子）

| 版本 | 請到者 | 未請到者 | 相對帶 | 持有者最終勝率 |
|---|---|---|---|---|
| **零紙紮**（三尊 `unit.count=0`＝在夜戰裡完全沒有貢獻） | 61.51% | 41.27% | **1.490** | 29.57% |
| 現行三尊（對照） | 72.15% | 33.38% | **2.161** | 38.30% |

**讀法**：拿得到傳說的人本來就比較有餘裕（燒得起壽命）、也活得比較久；「未請到者」那一組則裝滿了快出局的人。這個選樣混淆單獨就值 **1.490**，吃掉門檻上緣 1.60 的絕大部分——**L3 的可用區間只夠塞一件毫無作用的東西**。

補充（快篩 n=400）：把 AI 啟發式改成「不看壽命、每夜一律燒滿」拆掉「有錢才燒」這條相關性之後，零紙紮版的相對帶仍有 **1.597**。所以混淆不是來自啟發式，是來自「持有＝活著」這件事本身。

### 4.3 無混淆的有感度（同一個袋子 ±這一尊，`duelBags` n=1000，`gate-10000-L3.md`）

| 尊 | 對祖靈袋 | 對香火袋 | 對陰氣袋 | 平均位移 |
|---|---|---|---|---|
| 殘日 | 46.67%→100.00%（+53.3pp） | 61.04%→100.00%（+39.0pp） | 100.00%→100.00%（+0.0pp） | 30.8pp |
| 大士爺紙尊 | 34.09%→100.00%（+65.9pp） | 46.67%→100.00%（+53.3pp） | 100.00%→100.00%（+0.0pp） | 39.7pp |
| 有應公 | 0.00%→100.00%（+100.0pp） | 0.00%→13.00%（+13.0pp） | 46.67%→100.00%（+53.3pp） | 55.4pp |

（`duelBags` 是決定性引擎，勝率會撞到 0%／100% 的天花板，所以這張表只能讀「有沒有感」與「大概多有感」，不能拿來當精細刻度——同樣的顆粒度問題在共鳴卷的 R2 已經遇過一次。）三尊都明顯有感，且**偏強**。

### 4.4 兩條路（要使用者裁定）

1. **改量法（建議）**：照 R2→R2′ 的前例，把 L3 改寫成「同一袋 ± 這一尊」的反事實位移帶，並解決 `duelBags` 的天花板（例如改用多組袋子的平均、或改看 hp 差而不是勝率）。
2. **砍傳說數值**：技術上做得到，但 §4.2 已經證明砍到相對帶 ≤1.60 等於砍到「幾乎沒有戰鬥貢獻」，違背這一卷的前提。**不建議，而且我沒有動 `LEGENDS` 的任何數值**（維持提案 §三的原始值）。

## 五、L4 為什麼過不了

| 策略 | LEGEND_ON=false | LEGEND_ON=true | 位移 | 判定 |
|---|---|---|---|---|
| splitter | 20.47% | 23.67% | +3.20pp | ✅ |
| greedy | 19.35% | 20.98% | +1.63pp | ✅ |
| hoarder | 9.68% | 8.09% | −1.59pp | ✅ |
| specialist | 26.62% | 31.99% | +5.37pp | ✅ |
| **incenseMax** | 20.47% | **40.08%** | **+19.61pp** | ❌ |
| incenseNever | 20.47% | 13.99% | −6.48pp | ✅ |

`incenseMax` 與 `incenseNever` 的出價完全一樣（都走 splitter），差別只有「每夜燒滿 vs 一輩子不燒」——所以 **40.08% vs 13.99% 這 26pp 的落差就是燒香這一件事的價值**。凍結檔預言的紅法（「incenseMax 靠獨一份衝 >40%」）成立。

**兩件事要分開講**：
- 照條文字面判定，40.08% > 40% ＝ 紅。
- n=10000 時 40% 附近的單點 SE ≈ 0.49pp，40.08 與門檻在統計上分不開。要不要把它當「實質過關」是**使用者的裁定**，不是我可以自己判的（那等於把及格線搬到腳邊）。

**修法**與 L1 紅因 B 同源：最直接的是降 `INC_MAX`（3→2）。提案 §八-5 只授權「L5 破了才降 INC_MAX」，L4 沒有這條授權，所以**我沒有動它**。想試的話一行 CFG 改完重跑 `legend-gate.mjs 10000 --only=L1,L4` 即可（約 55 分鐘）。

## 六、不變量掃描（動手前做的，`02 §6.1` 第 6 條）

| 判斷式 | 恆真／恆假？ | 依據 |
|---|---|---|
| `h≥INC_PITY` 必成 vs `h/(h+K)` | 都不會 | 有資格擲的人 h≥1（本夜必須燒過），機率恆在 (0,1)；h 到 9 才變 1。單夜最多 h=3 ⇒ 第一夜不可能必成；三夜燒滿 9 ⇒ 必成一定達得到（`LIFE=50` ≫ 9）。 |
| 四人同拜同尊只有一人拿到 | 不會恆真 | 迴圈在第一個成功者處 `break`，該龕 `open=false`；單元測試「獨一份」案在守。 |
| 燒 0 的人不得擲 | 不會恆假 | `rollers` 只收本夜 `amt>0` 的人；單元測試用「骰子必中 + h=8 + 今夜燒 0 → 拿不到／改燒 1 → 拿得到」**兩面**驗（只驗前半會是反向探針）。 |
| `blindFront` | 不會恆假 | 前鋒＝`body!=="haunt"`，任一側至少有一隊前鋒（`buildArmy` 的肉身兜底是 swarm）。 |
| `curseHaunt` | 對面沒詛咒品時整場不動作，但不恆假 | 實測見下。 |
| `wardGuardAll`（`hpAll:2`） | 不會恆假 | 只在該系那一拍套用。 |

**招式活性實測（1500 局、25979 場正式對決，`S.pwStat.tr`）**：

```
eliteBlind    9262 次（每千場 356.5）
wardGuardAll  8320 次（每千場 320.3）
hauntAnswer   3325 次（每千場 128.0）　有求必應多燒掉的隻數合計 6278
整批 1500 局中一次都沒觸發的招：（無）
```

三個新招都活著，而且**既有 27 個招沒有任何一個因為這一卷變成零觸發**。

## 七、跑了什麼（指令原文）與實際輸出

```
git show ca14065:index.html > old-l.html
node tests/tools/legend-gate.mjs 10000                       # → docs/experiments/2026-09-06-legend3-evidence/gate-10000.md
node tests/tools/legend-gate.mjs 10000 --only=L3             # → 同目錄 gate-10000-L3.md（L3 診斷 (b) 的治具修正後重跑）
node tests/legend.test.mjs                                   # 15 過 / 0 失敗
node tests/legend.test.mjs old-l.html                        # 0 過 / 15 失敗（鑑別力）
node tests/aistake.test.mjs      # 通過 8　失敗 0
node tests/conscap.test.mjs      # 通過 5　失敗 0
node tests/nightrules.test.mjs   # 16 綠 ／ 0 紅
node tests/review.test.mjs       # 通過 28　失敗 0
node tests/wish16.test.mjs       # PASS=36 FAIL=0
node tests/tools/legend-drive.mjs docs/experiments/2026-09-06-legend3-evidence/legend-drive.json      --port=8854 --seeds=3,5,7,2
node tests/tools/legend-drive.mjs docs/experiments/2026-09-06-legend3-evidence/legend-drive-dawn.json --port=8855 --seeds=1,4,6,8,9,11 --burn=0   # 走「天亮回天」那條路
node tests/tools/legend-drive.mjs docs/experiments/2026-09-06-legend3-evidence/legend-drive-OFF.json  --port=8849 --seeds=1 --legend=0            # 橫向溢出對照組
grep -c "Math.random" index.html # → 0
```

閘門完整輸出在 `docs/experiments/2026-09-06-legend3-evidence/gate-10000.md`（L0/L1/L2/L3/L5/L4 全文，含 L1 三個狀態 ×2 組治具的收益矩陣）與 `gate-10000-L3.md`。
**注意**：`gate-10000.md` 裡 L3 診斷 (b) 那張表是治具修正前的版本（自己只給 2 件、對手 3 件，底線勝率 0% ⇒ 位移全被夾成 0 或 +100pp，量不到東西）。修正後（兩邊都 3 件）的正確版本在 `gate-10000-L3.md`，也就是本報告 §4.3 那張。

### 7.1 鑑別力（`02 §6.1` 第 1 條，兩面都驗）

- **修復前的版本會不會紅**：`node tests/legend.test.mjs old-l.html`（`old-l.html` ＝ `git show ca14065:index.html`）→ **15 案全紅**，且每一案的第一條失敗訊息都是行為斷言，例如
  `燒滿 3 夜（h=9 ≥ 天井 9）後，南家袋裡的傳說法寶件數：預期 1，實際 0`、
  `燒 2 之後的壽命：預期 58，實際 60`、
  `LEGEND_ON=true、兩家都燒了香 → 應該有人擲骰（消耗亂數次數 >0）`。
  第一版寫出來時有三案是紅在治具的 `NaN` 前置守衛（＝屬性錯誤排在行為斷言前面），已把守衛移到行為斷言之後、並給治具常數加 fallback 修掉。
- **健康狀態下會不會綠**：同一組 15 案對 HEAD 全綠。另外第 14／15 案（覆審 H1／H2 的回歸）對**修復前的 commit `b7ffc08`** 也各自紅在行為斷言、對 HEAD 綠——見 §十一。
- **kill switch 兩面都驗**：OFF 對基準相等、ON 對基準不等（L0）；單元測試第 10 案同時斷言「OFF 零亂數消耗」與「ON 一定要擲骰」——只驗前半的話舊版（永遠不擲）會靜默通過。

### 7.2 Playwright（L6）

治具＝`tests/tools/legend-drive.mjs`：自起 `python -m http.server`，用真的 Chromium（844×390 橫式）把整局玩完，錄 console error／pageerror／requestfailed、走沒走到「請走」與「天亮回天」、以及每次換頁的橫向溢出。

**跑法 A（真人每夜燒滿 → 一定走到「請走」）**
`node tests/tools/legend-drive.mjs …/legend-drive.json --port=8854 --seeds=3,5,7,2`

```
- 局數 4：seed 3（12 夜・請走 3 尊・燒香 5 夜）；seed 5（11 夜・請走 3 尊）；seed 7（9 夜・請走 3 尊）；seed 2（12 夜・請走 3 尊）
- console error 0、pageerror 0、requestfailed 0 → ✅
- 走到「請走」12 次
```

**跑法 B（真人整局不燒香 → 才留得住沒被請走的龕，走到「天亮回天」）**
`node tests/tools/legend-drive.mjs …/legend-drive-dawn.json --port=8855 --seeds=1,4,6,8,9,11 --burn=0`

```
- 局數 2：seed 1（9 夜・請走 2 尊・回天收攤 1 龕）；seed 4（8 夜・請走 1 尊・回天收攤 2 龕／結清 2 筆）
- console error 0、pageerror 0、requestfailed 0 → ✅
- 走到「請走」3 次、「天亮回天」收攤 3 龕（其中結出階段獎勵 2 筆）→ ✅
```

四局都跑到「再入妖市」（＝真的走完整局，含 `endGame` 的回天結清），中途另外開過「本局回顧」與規則頁各一次，全程 0 error。

**橫向溢出：❌ 但不是這一卷造成的。** 同一支治具對 `?legend=0`（＝把本卷加的神龕列與燒香列整個關掉）跑一次當對照組：

| 量測點 | `?legend=1`（本卷） | `?legend=0`（對照） |
|---|---|---|
| 固定頁對照（同一局同一頁「蓋牌開標」）橫式 | **無溢出** | **無溢出** |
| 固定頁對照 直式 390×844 | `#stage` 6px、`#market` 6px | `#stage` 6px、`#market` 6px（**逐值相同**） |
| 逐頁掃描 橫式 844×390 | 盯上頁 `body`/`#table` 19／7／2px、出價頁 `#market` 3px | 盯上頁 `body`/`#table` 19／7／2px、出價頁 `#market` 3px |

也就是說：`#shrines` 與 `.incbar` 在兩個尺寸下都**沒有**把版面撐開（`.incbar` 自己是 `overflow-x:auto` 的可捲容器，探針依 `overflow-x` 把這類容器排除，判準與 `index.html` 底部那份「放行名單」一致）；量到的溢出在 `LEGEND_ON=false` 的對照組上逐值相同，來源是既有的 `#south` 底列與 `#market` 四欄格線。**凍結檔 L6 的「無橫向溢出」照字面判是紅的，但它在基準上就已經是紅的**——這一卷沒有讓它變差，要不要另開一卷修那 19px 是使用者的事。

直式（390×844）本來就被 `#rotateHint` 全螢幕蓋住要玩家轉橫，本卷另外加了 `@media (orientation:portrait){ #shrines{display:none} }`——加之前直式的 `#north` 會多 5px，加之後與對照組逐值相同。

## 八、L7 範圍逐檔對應

`git diff --stat ca14065..HEAD`：

```
 docs/GAME_DESIGN.md                                       |   8 +
 docs/IMPLEMENTATION_GUIDE.md                              |   9 +
 docs/experiments/2026-09-06-legend3-evidence/*            | 357 +
 docs/experiments/2026-09-06-legend3-impl-report.md        | （本檔）
 index.html                                                | 384 +, 10 -
 tests/legend.test.mjs                                     | 267 +
 tests/tools/legend-drive.mjs                              | 182 +
 tests/tools/legend-gate.mjs                               | 311 +
```

| 檔案 | 對應凍結檔範圍的哪一條 |
|---|---|
| `index.html` | 「引擎」＋「UI」兩段全部：LEGENDS 表、2 個新效果欄位、燒香欄位、請神結算、階段獎勵、AI 啟發式、神龕列、燒香列、請神演出、規則頁、局末回顧、`VERSION`。 |
| `tests/tools/legend-gate.mjs` | 「治具」段的 `legend-gate.mjs`（L0–L5）。 |
| `tests/legend.test.mjs` | 「治具」段的 `legend.test.mjs`（單元，15 案）。 |
| `tests/tools/legend-drive.mjs` | L6 的 Playwright（凍結檔沒有指定檔名，派工授權「可仿 duel-drive 或寫新的 legend-drive」）。 |
| `docs/IMPLEMENTATION_GUIDE.md` | 派工 E：新增 §11.20（接手前先知道的五件事）。 |
| `docs/GAME_DESIGN.md` | 派工 E：changelog 一行。 |
| `docs/experiments/2026-09-06-legend3-evidence/*`、`…-impl-report.md` | 本卷的證據與報告落檔（回報格式要求）。 |

**「不動 27 隻、不動 CFG 既有值」的機械證據**（把 CRLF 正規化後逐段比對 `git show ca14065:index.html`）：

```
POOL 27 隻逐位元組相同： true
CURSES 逐位元組相同：    true
ROLES 逐位元組相同：     true
TRAITS 舊 27 條整段原封不動（新條目只是接在後面）： true
CFG 既有鍵被改值：       []
CFG 新增鍵：             LEGEND_ON,INC_MAX,INC_K,INC_PITY,INC_GIFT_P,INC_AI
```

`js/creature-figures.js` 與 `js/trait-fx*.js` 完全沒有出現在 diff 裡（禁區）。

## 九、規格缺口與我做的取捨

1. **天井 vs 獨一份互相矛盾（提案 §4.2）**：規格說「h≥P 必請，不會落到階段獎勵那一列」，但獨一份表示四人同夜都到天井時只有排最前面的請得走。**本實作讓落敗的天井者領最高那一段**（退 `⌈h/2⌉` ＋一件小法寶），規則頁也補了這一句（第三輪 read-back 正是被這一點問住）。**要使用者確認這是不是他要的。**
2. **「走既有牌庫」的解讀（提案 §4.2 第三段）**：本實作＝「POOL 該系 `p≤INC_GIFT_P` 當抽取母體、發一份新複本」，**不從 `S.deck` 抽走**。從 `S.deck` 抽會讓神龕獎勵改變後續市集的牌堆組成，耦合過大。
3. **`blindFront` 的持續時間（提案 §三）**：規格寫「第 1 拍開打前，對面前鋒 atk −2」。本實作在第一拍施加一次、**降下去的 atk 三拍都算**（跟射日 `openShot` 造成的傷害一樣不回復）。要改成「只有第一拍」得多一個還原用的狀態欄位。
4. **3D 佔位**：`LEGENDS[].m` 借用既有模型鍵（`bow`／`wangchuan`／`redhat`），系色由 `f` 帶——`js/creature-figures.js` 與 `js/trait-fx*.js` 一個位元組都沒動。美術卷再換真模型。
5. **`ROLES[*].ai.inc` 目前沒有任何角色覆寫**：預設全走 `CFG.INC_AI`。掛鉤是活的，單元測試第 12 案用「覆寫 `minLifeFrac` 之後那個角色就不拜了」在守它；要給角色個性是往 `ROLES` 填一筆，不用回頭改引擎。
6. **一個實作 bug，在 Playwright 那一輪抓到並修掉**：真人遊戲路徑原本沒有每夜清空 `S.incense`，導致 AI 的燒香從第 2 夜起不再重新評估（沿用前一夜的封籤）。headless 兩條迴圈本來就有清，所以閘門數字不受影響。修在 `beginRoundCore`（`index.html:3683`）。
7. **另一個實作 bug（自己抓的）**：`settleShrinesEnd()` 一開始是在局末**另外 push 一筆**壽命快照，害 `tests/review.test.mjs` 的「`life.length === nights.length+1`」與「末筆快照＝局末各人壽命」兩案齊紅。改成**就地覆寫最後那一筆**（回天＝最後一夜的天亮，本來就同一個時刻），並同步 `playPolicyGame` 的 `lifeByRound` 末筆與 `simulate` 最後一夜的 `post`。

## 十、規則頁 fresh read-back（三輪）

用 fresh subagent（只給規則頁那一節的渲染後純文字，不給任何對話史、不給程式碼），要它當第一次玩的人回答 8 題。

| 輪 | 結果 | 改了什麼 |
|---|---|---|
| 1 | 8 題答對 7；第 8 題指出「**h 到 9 就必請**」跟上面的 `h÷(h+6)` 表衝突，他不確定天井是不是真的 100%，說會害他算錯資源規劃 | 改成「h 一旦到 9（含）以上，那一夜就**不擲骰、直接請下來**……上面那條公式在天井之後不適用（不要自己去算 9÷15）」 |
| 2 | 天井那題答對；新指出「出價的時候多一列燒香」沒講清楚**燒香要不要跟出價綁在一起** | 加上「**燒香跟出價各算各的**——今夜一件都不標，照樣可以燒香；標了一堆，也可以燒 0」 |
| 3 | 前三題全對；指出結清表沒涵蓋「h 已到天井卻被別人搶先」這一格（＝§九第 1 點那個規格缺口） | 加上「h 到了 9 以上卻還是被人搶先……也比照這一檔」 |

定稿全文＝`docs/experiments/2026-09-06-legend3-evidence/rules-shrine-text.md`。

## 十一、對抗式覆審（fresh context，`opus`）

宣告完成前另派一個 fresh-context 覆審員冷讀 diff，prompt 寫的是「**找出會讓賽局結果算錯或狀態毀損的情境**」而不是「看看有沒有問題」。它逐條實跑探針之後回報 **CRITICAL 0／HIGH 2／MEDIUM 3／LOW 3**。

**兩個 HIGH 都已修，並各補一個會在修復前變紅的回歸測試**（`tests/legend.test.mjs` 第 14、15 案；對修復前的 commit `b7ffc08` 跑，兩案分別紅在
`南家 h=9（天井）、燒光最後 1 點壽命 → 這一尊仍應歸他：預期 1，實際 0` 與
`末筆不屬於本輪時，壽命曲線不得被就地改寫：預期 "[[60,60,60,60]]"，實際 "[[58,60,60,60]]"`——都是行為斷言，不是屬性錯誤）。

| 嚴重度 | 位置 | 問題 | 處置 |
|---|---|---|---|
| HIGH | `resolveShrines` ②③ 之間 | 死亡掃描插在擲骰**之前**：燒香把壽命燒到 0 的人（香火是「當場扣、不退」＝錢已經付了）會被剝奪本該天井必成的請神，尊直接落到第二名手上。覆審員實測四家全掛 `incenseMax` 的 400 局裡發生 7 次，其中 1 次是天井被剝奪。 | **已修**：拿掉中間那次掃描，只留結算最後一行——與 `resolveAuction`／`settleEvent`／`resolveBattles` 三處既有慣例對齊；語意同「心願回血可以救回歸零者」。 |
| HIGH | `settleShrinesEnd` | 無條件覆寫 `S.history.life` 末筆。異事夜殺到剩一人那條路沒有 `recordNightEnd`，末筆停在**前一夜**，覆寫會把那一夜的壽命快照整個抹掉（局末回顧的曲線會把出局畫到錯的夜）。原本註解引用的那條不變量在這個情境下照樣是綠的＝零鑑別力的檢查。 | **已修**：加上「末筆確實是本輪收尾快照」的守衛（`HN.closed && HN.round===S.round && life.length===nights.length+1`），不是的話交回 `finalizeHistory` 自己補一筆。 |
| MEDIUM | `aiIncense` 的領先者掃描 | 沒有 `q.alive` 條件 ⇒ **已出局者殘留的香火**被當成競爭者（龕沒關就不會歸零），活著的 AI 全體棄拜、整座龕鎖到天亮，會壓低 L2／L3 量到的活性。 | **已修**（加 `q.alive&&`）。這一條會動到閘門數字，所以全套閘門在修完之後**重跑了一次**。 |
| MEDIUM | `resolveShrines` 不冪等 | 正規化後的信封留在 `S.incense` 直到下一夜才清，同一夜再呼叫一次會再扣一次壽命。目前唯一入口 `startShrine` 在第一個 `await` 之前就 `disabled=true`，覆審員找不到可觸發路徑。 | **已修**（結算完就 `S.incense={}`）。 |
| MEDIUM | 三條迴圈的「真人座位預設」不同 | 真人 UI 預設不燒（`INC.amt=0`），`simulate()` 沒寫 `S.incense` ⇒ 那個座位會跑 AI 啟發式＝**會燒**。亂數序仍然一致（實測同種子重跑逐位元組相同），但 `simulate()` 的 trace 不是「被動真人」的忠實模型。 | **記錄不修**：`simulate()` 本來就是「四家都照預設打法」的模型，這是口徑不是 bug。寫在這裡供覆核。 |
| LOW×3 | `incAiOf` 的 `aggr||0.6`／`recordShrines` 沒存 `out.rolls`／三處末筆覆寫的條件寫法不一致 | — | `aggr` 那條**已修**（改 `aggr!=null` 判定，免得日後有角色把 `aggr` 設 0 被 `||` 吃掉）；另兩條記錄不修。 |

覆審員明確「找不到問題」**而且有實跑證據**的項目：外部輸入把關（`shrine:99/-1`、`amt:NaN/2.9/999/-5/"3"` 全被夾住）、`p.life` 不會變負、同一龕不會被請走兩次、階段獎勵不會重複領、贏家不會又領一份、階段獎勵三段區間與規格逐值相符、`shrineReward` 抽小法寶的 rng 條件三條迴圈一致、`LEGEND_ON=false` 時 40 顆種子的 `simulate()` trace 與 `ca14065` 逐位元組相等（ON 時 40/40 都不同）、AI 啟發式零亂數、`simulate`／`playPolicyGame` 各跑兩次逐位元組相同、`blindFront` 只在第 1 拍施加一次且下限 0、`curseHaunt` 不會空轉或無限迴圈、引擎碼無尊名／角色 id 字串比對、`index.html` 全檔 0 個 `Math.random`。

`02 §6.1` 附則的「修補也要送審」還沒跑第二輪——修完之後補上的是**會在修復前變紅的回歸測試**而不是口頭宣稱；要不要再派一輪「反駁我已修好這個宣稱」由使用者決定。
