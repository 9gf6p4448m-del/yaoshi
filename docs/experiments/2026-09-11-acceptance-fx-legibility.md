# 驗收凍結：招式可辨性卷 v0.55（2026-09-11）

> 計畫 `docs/proposals/2026-09-11-plan-fx-legibility.md`（唯讀 opus 產出；主對話親讀結論、第 8 節與 draw call 預算）。盲讀第一輪證據 `docs/experiments/2026-09-11-fx-blindread-r1/`。使用者 2026-09-11 對 §8 十二題裁定：
> - **版號重排（主對話定）**：0.54 招式三級 → **0.55 招式可辨性（本卷）** → 0.56a 拍賣桌版面／0.56b 上桌（原 0.55a/b 改號，凍結檔 `2026-09-10-acceptance-table3d.md` 內容不變）。
> - **Q1**：0.54 未合併 main 前不得開卷（短版時長來源、`--tier=`、`fx-consts.mjs` 都在 0.54）。
> - **Q2**：批 0 語彙＋積木 API＋`MAT_SOLID`＋三系各一支示範招 contact sheet **停下給使用者看**；批 1／2／3 每系 9 支各自合併。**Q3**：每批盲讀只讀該批 9 支，名單仍給 27 個；≥24/27 只認最後全 27 總驗收。**Q4**：及格 ≥24/27（兩位 context-free 讀者 Q1 皆對且 Q2 ≥4）、上限 3 輪。
> - **Q5（使用者授權）**：ART_BIBLE 新增 §10「招式視覺語彙」，§1–§9 不動。**Q6**：`SPARK_COLOR` 不動。**Q7**：香火＝鎏金＋硃紅、腳下光環限縮香火專用；祖靈＝垂直光柱；陰氣＝地面水漬與陰影滋長——批 0 出圖後使用者可改方向。**Q8**：造型互撞先用語彙硬拉開，盲讀仍不過的再開 GLB 回修小卷。**Q9**：三尊三招語彙納入、盲讀閘門不納入。**Q10**：新增非加色材質 `MAT_SOLID`（program 2→3，常駐預熱）。**Q11**：`drawCallsPerFrame`（原始欄位＝兩幀和）≤1000。**Q12**：盲讀材料改 6 幀 2×3、1560×1080，先跑材料鑑別力（L4-pre），基準同法。
> 使用者動機原話：「想做遊戲大作、不想做出垃圾遊戲、野心大一點、看 Fable 5.1 極限」。本檔訂下後即凍結（`02 §2.1`）。

## 範圍
依計畫檔 §1 檔案清單、§2 介面、§3 不做什麼、§6 逐招診斷表、§7 三系語彙表。純演出卷：`TRAITS` 規則欄位、對決引擎、AI、0.54 的三級與 260/900/1400 時長不動；`trace-eq` 逐位元組相等。

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

## §2.1 修訂紀錄
（無）
