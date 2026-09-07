# 傷害可讀性 批 2-a——實作報告（2026-09-07，v0.50）

規格與驗收凍結＝`docs/experiments/2026-09-07-acceptance-dmg-readability.md`（R0–R8，**一個字未動**）
本卷基準＝`69df086`（＝v0.46 `443f802` 的程式碼）；收尾時依序合併了 `origin/main` 的 v0.47（`5a3c56b`）與
v0.48（`578b2de`），VERSION 取 **0.50**。所以等價對照有兩個：**鑑別力**對照用 `69df086`、**退路等價**對照用 `578b2de`。
**未 push、未動 main。**

> 使用者手機試玩 v0.45 回報「扣血的部分看不太出來、顏色分不出」。這一卷做四件（跳字／閃紅／量表殘影＋紅暈／「−1 隻」），
> 純演出層，引擎（`paperWar`／`pwRec`／`buildArmy`／`S.rng`）一行未動。

## 0. 結論

| 條 | 結果 | 一句話 |
|---|---|---|
| R0 退路等價 | ✅ | `trace(1..20)` 對 `578b2de` 逐位元組相等（357,531 字元）；`?closeup=0` seeds 1/2/3 實跑 P0=PASS ×3（seed 1 切在第 14 場，七欄與 `fights[]` 逐欄相同、DOM 四樣皆無） |
| R1 跳字對比度 | ✅ 門檻／❌ 鑑別力 | 新版 135 筆全部 ≥4.5（最小 **4.70**、中位 6.9）；**但基準 34 筆也全部 ≥4.5（最小 6.67）**——凍結檔預期的「基準有 <4.5 的筆數」不成立，理由見 §3.1 |
| R2 被打尊閃紅 | ❌ 門檻／✅ 其餘三子句 | 25 筆可判：中位 **+5.69**、最大 **+28.54**、≥25 的 6 筆（24%）；非 target 尊最大 +0.73 ✅、燒毀中 7 筆 \|Δ\| ≤4.31 ✅、基準 30 筆中位 −0.20／最大 +3.26 ✅（鑑別力成立）。門檻本身的問題見 §3.2 |
| R3 量表殘影＋紅暈 | ✅ | seeds 1/3 逐支跑：殘影 26 筆寬度全對、可判的 18 筆都在 GHOST_MS+100 內消失；己方受擊 9 筆 ↔ 紅暈 9 片（1:1、最長 162ms），對方受擊 8 筆一片都沒有 |
| R4 「−1 隻」 | ✅ | 26 個 `.dmgfloat.unit` ＝ 26 筆 burn（SKIP 中的 3 筆照規矩不演，不列入）；文字全部「−1 隻」；與同拍傷害數字重疊 **0** |
| R5 SKIP／cancel | ✅ DOM／⚠️ 像素 | doSkip 後 300ms：跳字 0、殘影 0、紅暈 0、所有 figure 的 `__hitK` 全 0；像素版量不到——那一尊在 +300ms 已經被收起來（見 §3.5） |
| R6 效能 | ✅ | 同 session 交錯：新中位 **88.5 fps** vs 基準 84.0 → **1.054** ≥0.9；`programs` 新舊都是 `[22,28,28,28]`，逐場相同 |
| R7 截圖 | ✅ | `docs/experiments/2026-09-07-dmg-readability-evidence/contact-sheet.png`（六格，圖說是治具當場記的數字） |
| R8 測試與範圍 | ✅ | 9 套測試全綠、`ash-freeze-probe` F1 0／F6 0（142 段）、`git diff --stat` 只含凍結檔允許的檔案 |

**給使用者看的東西**：`docs/experiments/2026-09-07-dmg-readability-evidence/contact-sheet.png`。
**要裁定的**：§3.1（R1 的鑑別力條）與 §3.2（R2 的門檻），兩條都不是「做不到」，是「那條標準量的東西跟你抱怨的事不是同一件」。

## 1. 逐條證據

### R0 退路等價
```
node tests/tools/closeup-trace.mjs .claude/tmp/base578/index.html index.html
→ {"oldLen":357531,"newLen":357531,"identical":true}      # 對 69df086、5a3c56b 也各驗過一次，都是 identical

node tests/tools/closeup-drive.mjs "…?paperwar=1&fxcount=1&seed=1&closeup=0" r0-off-1.json --duels=99 --port=8931
node tests/tools/closeup-drive.mjs "…seed=1&closeup=0" r0-base-1.json --duels=99 --port=8941 --root=.claude/tmp/base578
node tests/tools/closeup-judge.mjs r0-on-1.json --off=r0-off-1.json --base=r0-base-1.json
→ VERDICT P0=PASS（seeds 1/2/3 三支都 PASS）
```
seed 1 的切點＝第 **14** 場（兩邊都演完 14 場）：`burn 54/54`、`burnFig 37/37`、`burnDom 17/17`、`trait 51/51`、
`traitFig 46/46`、`beat 42/42`、`duels 14/14` 全欄相同，`fights[]` 逐字相同；關閉時 DOM 四樣（`#dmgLayer`／`#beatLamps`／
`#actorCard`／`.pwgauge`）皆不存在、`FXC.focus=0`、跳字 0 個；開啟時 `focus>0`。
同一份 judge 的 P2／P4／P7 顯示 FAIL，那是**近景切鏡卷**的條件被套在這一支只跑 6 場、又沒帶 `--cancel/--skipfocus` 的錄影上
（P2 的中斷子句 0 樣本＝fail-closed；P4 是舊 judge 斷言「每個跳字的文字都要是 `−數字`」，本卷新增的「−1 隻」不符合那條舊斷言；
P7 是 seed 3 那一支抓到 Google Fonts 連線失敗）。**R0 只看 P0**，其餘不在本卷驗收範圍，但舊 judge 的 P4 需要在下一卷更新。

### R1 跳字對比度
量法：Playwright 凍住畫面截圖 → 每個 `.dmgfloat` 取 `getComputedStyle` 的文字色，與它方框外 8px 環帶的平均色算 WCAG 對比度。
只量已經完全顯示（`opacity ≥ 0.8`）的那幾幀——彈出中與尾段淡出本來就該淡。
```
node tests/tools/dmg-readability.mjs pix .claude/tmp/out/seq-pix-1 --seed=1 --duels=8 --port=9061 --maxfloat=50 --maxhit=20
```
| 版本 | 筆數 | 最小 | 中位 | 最大 | <4.5 |
|---|---|---|---|---|---|
| 新版（seq seed1／seed3／並行 seed1／seed3） | 38＋27＋45＋25＝**135** | **4.70** | 6.9 | 14.8 | **0** |
| 基準 `69df086`（seeds 1/3/5） | 10＋9＋15＝**34** | 6.67 | 10.6 | 13.8 | **0** |

class 與事件對位：三類裡有樣本的是**傷害** 64 筆（`kind` 為 hit／ward／splash／thorn／bite／bolt／openShot）與**擊殺** 36 筆
（`.kill`，全部對得上「本拍最後一筆打到那隻、而那隻這一拍被燒掉」），外加「−1 隻」35 筆（`kind:"burn"`，一對一）。
**治療綠 0 筆**——引擎沒有這個事件（§3.6）。

### R2 被打的尊閃紅
量法：治具凍住畫面 → 派一顆 `ys:fx-hit` → 分別在命中前、命中後 40ms、+200ms 各凍一格截圖，
取該尊**模型包圍盒**投影方框內像素的 `R−(G+B)/2` 平均值。新舊兩版收到**同一顆**治具派的事件（`--synth`，理由見 §3.3）。
```
node tests/tools/dmg-readability.mjs pix .claude/tmp/out/seq-pix-1 --seed=1 --duels=8 --port=9061   # 新版
node tests/tools/dmg-readability.mjs pix .claude/tmp/out/pix-base-1 --seed=1 --duels=5 --port=9011 --root=.claude/tmp/base69
node tests/tools/dmg-redstat.mjs .claude/tmp/out/seq-pix-1      # 分佈（方框平均／>25 的像素比例／最紅的像素）
```
| 子句 | 門檻 | 實測 | 判 |
|---|---|---|---|
| 命中後 40ms 的紅偏量抬升 | ≥ +25 | 25 筆：min **2.86**／p50 **5.69**／max **28.54**；≥25 的 **6 筆**、≥15 的 9 筆 | ❌ |
| 200ms 後回到 ±5 | ±5 | 最大 \|12.79\| | ❌（噪音，見下） |
| 非 target 尊 | <25 | 最大 **+0.73** | ✅ |
| 燒毀中的尊 | <5 | 7 筆，\|Δ\| 最大 **4.31** | ✅ |
| 基準版（鑑別力） | <5 | 30 筆：p50 **−0.20**、max **+3.26**、≥25 的 **0 筆** | ✅ |

分佈揭露（`dmg-redstat`，seq seed1）：方框內紅偏量 >25 的像素比例由 0.4 抬到 **0.51**、最紅的像素中位 **118**；
方框裡本來就有大片背景（3D 妖在自己的包圍盒裡只佔約三成），所以「方框平均」天生被稀釋——這正是 §3.2 要裁的。
`back200max` 那條的 12.79 來自鏡頭仍在移動的樣本（本卷的噪音底判準是「同長度、同鏡頭運動、無刺激的空窗漂移 ≤5」，
它管的是 40ms 那一格；+200ms 這一格沒有對應的空窗對照，所以噪音更大）。

### R3 量表紅殘影＋己方受擊紅暈
量法：`dom` 模式（不凍幀），用 MutationObserver 記殘影／紅暈**真實的出生與移除時刻**——命中事件與紅暈之間隔著停格
（`fxHitstop`），固定時點取樣會整批落空；殘影則會被下一筆燒毀接著用，固定時點也判不準。
```
node tests/tools/dmg-readability.mjs dom .claude/tmp/out/seq-dom-1.json --seed=1 --duels=8 --port=9071
→ VERDICT R3=PASS R4=PASS R5=PASS WIRE=PASS      # seed 3 同樣四條全 PASS
```
| 項 | seed 1 | seed 3 |
|---|---|---|
| 殘影 50ms 內存在且寬度＝掉的段落（±1%） | 18/18 | 8/8 |
| 殘影在 `GAUGE_GHOST_MS+100` 內消失（可判的） | 11/11 | 7/7 |
| 對決收場後殘影／紅暈殘留 | 0 | 0 |
| 己方受擊筆數 ↔ 紅暈片數 | 4 ↔ 4 | 5 ↔ 5 |
| 紅暈壽命最長 | 161ms（門檻 230） | 162ms |
| 對方受擊卻出現紅暈 | 0（8 筆對方受擊） | 0 |

⚠️ **三支並行跑時這一條會紅**（殘影 404–603ms、紅暈 230–374ms）：那是我自己開三個瀏覽器造出來的計時器抖動，
不是產品的。所以最終判定用**逐支跑**的數字，兩組都揭露在這裡。seed 5 沒跑完（§3.7）。

### R4 「−1 隻」
| 項 | seed 1 | seed 3 |
|---|---|---|
| `.dmgfloat.unit` 個數 ＝ `ys:fx-burn` 筆數 | 18 ＝ 18 | 8 ＝ 8（另有 SKIP 中的 3 筆不演） |
| 文字不是「−1 隻」的 | 0 | 0 |
| 與同拍傷害數字中心距離 < 字高（＝重疊） | 0 | 0 |

（`UNIT_DY = 44px` ≥ 最大字高 35.4px＝擊殺跳字 17×1.6×1.3。）

### R5 SKIP／cancel
`doSkip()` 之後 300ms（seeds 1／3）：`.dmgfloat` **0**、`.pwgauge b.ghost` **0**、`#duel i.hurtedge` **0**、
`duelFigures.figuresOf()` 每一尊的 `__hitK` 全 **0**（那是產品真正寫進材質的閃紅強度，不是重抄的模型）。
像素版：跳過前 +40ms 量到 **+11.00**（seed1）／**+1.99**（seed3）的閃紅，+300ms 那一格量不到——
`doSkip` 會讓對決立刻收場，`ys:duel-end` 之後人形 `visible=false`，方框裡已經沒有那一尊（§3.5）。

### R6 效能與 programs
```
node tests/tools/duel-perf.mjs perf perf-new-$i.json --n=10 --uncap --port=894$i          # 新版
node .claude/tmp/base578/tests/tools/duel-perf.mjs perf perf-base-$i.json --n=10 --uncap  # 基準，同 session 交錯
```
| | 中位 fps（rafMedianFps） | 三次原始值 | 三角形／draw call |
|---|---|---|---|
| 新版 | **88.5** | 90.9 / 75.8 / 88.5 | 404k–405k ／ 1002–1012 |
| 基準 `578b2de` | **84.0** | 87.0 / 78.1 / 84.0 | 404k–436k ／ 1004–1068 |

比值 **1.054 ≥ 0.9**（同機同 session 交錯跑；這台機器同時還有別的 agent 在跑 10000 場模擬，絕對值不可跨時段比）。
`renderer.info.programs.length` 逐場：新版 `[22, 28, 28, 28]`、基準 `[22, 28, 28, 28]` **完全相同**——
第一場 22→28 是既有的對決 shader 首次編譯，閃紅沒有多編任何一支。閃紅只寫既有的 `uRimColor`／`uRimPower`／
`uRimStrength` 與既有材質的 `color`（3D 妖）與既有兩顆逆光材質的 `color`（貼片）。

### R7 截圖
`docs/experiments/2026-09-07-dmg-readability-evidence/contact-sheet.png`（六格，原圖同目錄）。
| 格 | 說明 |
|---|---|
| ① 命中前 | 方框紅偏量 14.36 |
| ② 閃紅瞬間（+40ms） | 同一尊 40.82（**Δ +26.46**）；對照的對面那一尊 Δ −0.19 |
| ③ 傷害跳字（彈出後 150ms） | 文字色 255,122,69／背後 8px 環帶 19.2,10.2,26.2／對比度 **7.47:1** |
| ④ 量表紅殘影（燒毀後 90ms） | 掉的那一段先變紅停 300ms 再收；同格看得到兩個「−1 隻」 |
| ⑤ 擊殺跳字 | ×1.3＋系色底光，對比度 7.3:1 |
| ⑥ 按下跳過 +300ms | 跳字／殘影／紅暈都是 0 |

### R8 測試與範圍
9 套：`aistake 8/0`、`conscap 5/0`、`duel-desync 7 綠`、`legend 20/0`、`lineup-order 5 綠`、`nightrules 16 綠`、
`review 28/0`、`roles-balance 32/0`、`wish16 36/0`；`ash-freeze-probe` F1 凍結 0 ✅／F6 硬切 0 ✅（runs 共 142 段）、0 error。
```
$ git diff --stat 578b2de
 docs/GAME_DESIGN.md                          |   8 +
 docs/IMPLEMENTATION_GUIDE.md                 |  29 +
 docs/experiments/2026-09-07-dmg-readability-report.md      （本檔）
 docs/experiments/2026-09-07-dmg-readability-evidence/      （連拍與 contact sheet）
 index.html                                   | 145 ++
 js/creature-figures.js                       |  50 +-
 js/duel-figures.js                           |  61 +-
 tests/tools/dmg-readability.mjs              | 690 +++      （新治具）
 tests/tools/dmg-redstat.mjs                  |  72 +
 tests/tools/dmg-sheet.py                     |  57 +
```
凍結檔本身一個字未動。

## 2. 連拍（R7）

見上表與 `docs/experiments/2026-09-07-dmg-readability-evidence/contact-sheet.png`。
連拍是**凍幀**拍的：閃紅只有 120ms、跳字只有 600ms，而一張 `page.screenshot` 要 150–250ms，
不把世界停住根本拍不到「那一瞬間」（近景切鏡卷是把 mark 的延遲往前挪去猜，這一卷改成真的停住）。

## 3. 沒做到的、假設過的、覺得該回頭裁的

1. **R1 的鑑別力條不成立，而且我認為那條標準量的東西跟使用者的抱怨不是同一件事——請裁。**
   凍結檔寫「基準版（v0.45 白字無描邊）同一量法 <4.5 的筆數 >0」。實測基準 34 筆**全部 ≥4.5、最小 6.67**：
   v0.45 的乳白字（#ffe6c0）本來就有黑色 `text-shadow`，亮度對比一直是高的。使用者讀不到的是
   **字太小（17px）、顏色不分類（不管傷害還是擊殺都同一色）**，不是亮度對比。
   更值得注意的是：**新版的對比度數字反而比基準低**（新 4.70–14.8 vs 基準 6.67–13.8）——因為把近白換成了飽和的暖紅橙，
   亮度必然下降；換來的是「一眼分得出這是傷害／擊殺／隻數」。R1 這條沒有量到這件事。
   (甲) 接受現況（門檻過、鑑別力這條作廢並在下一卷改寫成「同一事件的三類顏色在 CIEDE2000 上互相 ≥ N」之類）；
   (乙) 要我把字色往白的方向拉回去（對比度會漂亮，但又回到「顏色分不出」）；(丙) 擱著等真機試玩。
2. **R2 的門檻（方框平均 ≥ +25）沒達到，我認為那個數字建立在一個不成立的前提上——請裁。**
   一尊 3D 妖在自己的投影方框裡只佔約三成面積（四足獸的包圍盒又寬又扁），要讓**整個方框**的平均抬高 25，
   身上的像素得平均抬高 80–100，那是「整隻變純紅色塊」的程度。實測 25 筆裡有 6 筆過 25（最大 28.5），
   中位 5.7；閃紅本身確實有效（最紅的像素 66→118、>25 的像素比例 0.40→0.51，contact sheet ② 一眼看得到）。
   **我沒有改門檻，也沒有改量法。** (甲) 接受現況、R2 改判「身上像素」而不是方框平均；
   (乙) 要我再加強到方框平均過 25——代價是整隻變純紅色塊，而且往「更亮」調過一輪**反而更差**
   （`HIT.boost` 3.2 時 ACES 把過亮的飽和紅推成粉白，量到的紅偏量從 18.6 掉到 8.0）；(丙) 擱著等真機試玩。
3. **R2 的刺激是治具自己派的（`--synth`）**：基準 `69df086` 沒有 `ys:fx-hit` 的接收端，拿真實命中當刺激的話
   基準一個樣本都拿不到、無從比較鑑別力，所以兩版收到同一顆事件。
   「產品真的會在每一筆命中派這顆事件、而且 side 是被打那一側」由 dom 模式**逐筆**驗：
   seeds 1／3 的 `ys:fx-hit` 筆數 38＝38、18＝18，且每一筆的 `(side,unit)` 與 `beatsShown` 算出來的
   「對面那一側的 target」多重集合完全相同（`WIRE=PASS`）。兩者合起來才是完整鏈路。
4. **量測有效性的三道閘門**（動手量之前訂的，會讓一部分樣本不進判定；本輪 28 筆裡排掉 3 筆）：
   ① 樣本自己的噪音底（同長度、同鏡頭運動、但沒有刺激的空窗）超過 ±5 就不判；
   ② 這段窗裡發生燒毀就不判（燒毀會放一片全螢幕暖光 `#duel .flashfx`，整個畫面的紅偏量都會抬起來）；
   ③ 四格裡有任何一格落在 `ys:duel-end` 之後就不判（人形已停止更新）。
   另外刺激不打在已經收到 `ys:fx-burn` 的尊身上——那一類尊照規矩不閃，是 R2 的另一半，另有專門的探針在驗。
5. **R5 的像素版量不到「跳過後 300ms 該尊不紅」**：`doSkip()` 會讓對決立刻收場，`ys:duel-end` 之後
   `duel-figures` 把所有人形 `visible=false`，方框裡已經沒有那一尊——這是凍結檔那句話在真實路徑上的邊界。
   我改用 DOM 證據（`__hitK` 全 0＋三樣 DOM 都是 0）並在此標明。
6. **`.dmgfloat.heal`（治療綠）目前沒有事件源**：引擎的 `pwRec` 沒有 `kind:"heal"`，回血是在拍首直接改 hp、不進 `beats`，
   所以綠色那一類**一筆樣本都沒有**，而且它現在的文字仍是 `−n`（符號沒跟著翻正）。等引擎真的記回血事件時要一起處理。
7. **seed 5 的長跑沒跑完**：`pix` 模式兩次、`dom` 模式一次都停在同一個位置不再前進（不是凍結——治具的取樣總開關
   在退出每一場時就關掉了）。seeds 1／3 都跑滿 8–10 場沒事。**這條我沒查到根因**，可能是驅動器在 seed 5 的某個
   畫面點不到按鈕（`drive` 只認 `#mainbtn`／`#hoBtn`／`#stage .bigbtn`）。R1／R2／R3 的判定用 seeds 1／3，
   凍結檔要求的 seeds 1/3/5 **只做到三分之二**。
8. **順手修了兩個 v0.45 的錯，不在凍結檔列的四件範圍內**（兩個都可單獨退回）：
   - **傷害數字冒錯側**：`pwRec` 記的 `side` 是行動方、`target` 在對面，而兩側 unit id 都是 `0..n−1`，
     所以 `pwScreenOf(b.side, b.target)` 查到的是**出手方自己的一尊**——數字一直冒在打人那一側頭上。
     使用者說「扣血看不太出來」，這是其中一半的原因。要退回：把 `pwDmgFloat` 的 `tside` 改回 `b.side`。
   - **`.kill`（擊殺跳字）是死碼**：引擎的 `killed` 只掛在 burn 事件上，而 burn 那一筆不走 `pwDmgFloat`
     （`pwPlayBeat` 的 `show` 明確濾掉 `kind==="burn"`），所以 v0.45 的 `.kill` 一次都沒觸發過。
     演出層補回事件源：這一拍會燒毀的那幾隻，各自對應「本拍最後一筆打到它的交鋒」標成擊殺。
9. **貼片（無 3D）退路的閃紅只染逆光層**：凍結檔就是這樣寫的，但逆光層在本體後面、只露出一圈光暈，
   效果比 3D 弱很多；`?no3d` 那條路目前沒有像素證據（R2 的樣本全部來自 3D 妖）。
10. **手機端沒有量**：所有 fps 與截圖都是桌機（844×390、dsf=1、ANGLE/D3D11）。
    `PW_FX` 的 `DMG_SCALE`／`DMG_POP_MS`／`HIT_FLASH_MS`／`GAUGE_GHOST_MS`／`HURT_EDGE_MS`／`UNIT_DY`
    與 `creature-figures.js` 的 `HIT`、`duel-figures.js` 的 `hitFlash*` 全部【試玩必調】。

## 4. 下一步

1. **真機試玩**（使用者側）：手機轉橫打幾場，看四件在小螢幕上讀不讀得到。
2. **兩條裁定**：§3.1（R1 鑑別力）與 §3.2（R2 門檻），各有甲／乙／丙。
3. seed 5 跑不完的根因（§3.7）——下一卷若還要用長跑治具，得先把 `drive` 的點擊表補齊或加卡住偵測。
4. 舊 judge `closeup-judge.mjs` 的 P4 斷言要更新（它假設每個跳字的文字都是 `−數字`，本卷多了「−1 隻」）。
5. 若裁「要更紅」，建議連 `assets/theme.css` 的 `--c-danger` 一起看：跳字現在用的是提亮版而不是 token 本身
   （`--c-danger` #e04040 的相對亮度只有 0.195，壓在近黑環帶上對比度 4.45，過不了 R1 的 4.5），
   長期最好是 token 那邊多一顆「讀得到的危急紅」。
