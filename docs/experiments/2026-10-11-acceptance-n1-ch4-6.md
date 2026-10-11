# N1 夜行錄第 4–6 章「規則補課」驗收凍結檔 v1.0

凍結時間：2026-10-11，提交於 `n1/ch4-6-options`，早於任何產品／測試程式改動。基準 `origin/main db281fa9 / v0.65.5`。方案見 [options README](2026-10-11-n1-ch4-6-options/README.md)（甲案，主 session 2026-10-11 裁定）。**不改 [N1 凍結檔](2026-09-25-acceptance-n1-nightwalk.md) 任何條文**（其 #8「首 3 章」維持；本檔另訂第 4–6 章條件）。

**規則**：本檔條文一經提交即凍結。任何讓通過機率上升的改動須先寫明原標準錯在哪、取得使用者針對該條的同意（`02 §2.1`，經主 session 轉達）。細化與加嚴可自行記錄。每條附「什麼實作會讓它變紅」。證據目錄：`docs/experiments/2026-10-11-n1-ch4-6/`。

**範圍**：第 4 章閭山法師 `lvshan`「禁壇收祟」（教市集規則夜）／第 5 章大家樂組頭 `zutou`「六合開彩」（教心願與盯上）／第 6 章陰間當鋪 `dangpu`「當鋪典命」（教異事與請神）。三章 `rules` 皆 `{chains:true,destiny:true}`，對手沿用種子抽，**不新增任何開關、欄位、引擎行**。不做：K01、`foes`、熟練度、妖幣、第 7–10 章、版本號／推送／Pages（合併時由主 session 處理）。**難度不屬驗收項，標「未驗證」。**

## 機械驗收

**#1 常規局逐位元組不變**
- `node tests/tools/trace-eq.mjs <db281fa9 的 index.html> index.html` 相等（seeds 1–20）；`--mutate` 輸出 `differs:true`。
- 變紅：新章邏輯改到常規局亂數／狀態形狀。

**#2 全套測試不退步**
- 動手前在本 worktree（內容＝db281fa9 產品檔）跑全套存 `baseline-suite-db281fa9.txt`；改後全套：基準通過者全部仍通過，新測試全過。紅者必須在 db281fa9 同條件重跑並錯誤逐字相同，才可判為既有，不得以重跑到綠代替。
- 變紅：任何基準通過案轉紅。

**#3 章節設定**（`tests/nightwalk.test.mjs` 擴充）
- 第 4、5、6 章各跑 seeds 1–50：主角 `lvshan`／`zutou`／`dangpu` 恰出現一次且在 AI 席、四席角色互不重複、真人席不是主角、`S.chapter` 等於章號、`S.chainsOff===false`、`destinyEffectMode==="original"`。
- 各章對一位玩家的袋子注入任一組連鎖完整材料：`activeChains` 回非空（與第 3 章同；對照第 1 章回 `[]`）。
- 突變驗紅（副本檔、不反向 sed）：把第 4 章 `rules.chains` 改 false → 第 4 章連鎖注入斷言要紅。
- 變紅：主角沒入座、規則被關、主角落真人席。

**#4 章節開放與選角**
- `nwMenuModel`：`cleared=[]` → 只有第 1 章開；`[1,2,3]` → 第 4 章開、第 5、6 章鎖；`[1..5]` → 第 6 章開；`?nwall=1` → 6 章全開；已通關的章恆開。
- `selectPool(4|5|6)` 恰排除該章主角（9 個）；常規 `selectPool()` 仍 10 個。
- 突變驗紅：把 `nwChapterOpen` 改成恆回 true → `[1,2,3]` 案要紅。
- 變紅：新章提早開放、鎖死、選角可選主角。

**#5 過關與存檔（第 4–6 章）**
- 對每章用表格狀態：真人活＋主角出局→過；皆活＋真人壽命大→過；相等→未過；真人出局→未過。`nwRecord` 過關才寫入 `yaoshi_nightwalk_v1` 且含該章號、重複通關不重複；未過不寫。
- 突變驗紅：`nightwalkPass` 的主角判斷寫死成 `"qingmian"` → 第 4–6 章案全紅。
- 變紅：比錯對象、第 4–6 章章號存不進。

**#6 教學文字與引擎相符**（防「文案說的規則和遊戲實際不同」）
- 第 4 章 `teach` 必含：落魄夜、收祟夜、押寶夜三個名稱（各須等於 `NIGHTRULES[*].name`），且其「第 X 夜」數字集合等於 `CFG.RULE_NIGHTS`。
- 第 5 章 `teach` 必含「心願」「盯上」，且 `CFG.MARK_ON` 與 `CFG.WISH_ON` 皆為 true。
- 第 6 章 `teach` 必含：「異事」其夜數集合等於 `CFG.EVENT_NIGHTS`；「請神」其夜數集合等於 `CFG.SHRINE_NIGHTS`；提到的異事名稱必須存在於 `EVENTS[*].name`；`CFG.LEGEND_ON` 為 true。
- 抽取夜數的規則（寫進測試）：`第([0-9０-９、／和及]+)夜` 的所有數字。
- 突變驗紅：副本把 `RULE_NIGHTS:[3,7]` 改 `[3,8]` → 第 4 章案紅；把 `NIGHTRULES.luopo.name` 改名 → 第 4 章案紅；`EVENT_NIGHTS` 改 → 第 6 章案紅。
- 變紅：文案數字或名稱與引擎不一致。

**#7 文案檔與切換**
- 新檔 `docs/experiments/2026-10-11-n1-ch4-6/copy-r2.json`：`status:"待簽"`、`selected:"v1"`，每章含 `v1`／`v2` 兩版（欄位同 `copy-r1.json`：`n,title,boss,intro,teach,feud,scroll`，兩版 `n,boss,rules` 相同、文字不同）。
- 測試：`NIGHTWALK` 第 4–6 筆（取 `n,title,boss,intro,teach,feud,scroll`）逐字等於 `copy-r2.json` 的 `selected` 版；第 1–3 筆仍逐字等於 `copy-r1.json`。
- 切換工具 `tests/tools/nw-copy-apply.mjs <v1|v2> <index.html輸出路徑>`：只改 `index.html` 內 `/*NW-COPY-4-6 BEGIN*/…/*NW-COPY-4-6 END*/` 之間的文字；測試對 `v2` 副本：①跑 #7 逐字比對（針對 v2）與 #8 全過 ②副本與原檔的差異行全在標記區間內。對 `v1` 套用於原檔須為零差異（冪等）。
- 變紅：index.html 與 JSON 不一致、v2 不合格式、切換工具改到標記外。

**#8 文案格式**（兩版都要過）
- 引言 3–5 句（以。！？結尾計句）、`teach` 2–4 條、`feud.open／bossLose／bossWin` 各 ≥1 句、殘卷標題＋內文 150–300 字（去空白後字元數，含標點）；全部不含簡體字（沿用 `tests/nightwalk.test.mjs` 既有簡體字表，≥100 字）。
- 變紅：缺欄位、字數超界、混入簡體字。

**#9 範圍守衛（不動引擎）**
- `git diff --stat db281fa9..HEAD` 只允許觸及：`index.html`、`tests/nightwalk.test.mjs`、`tests/tools/nw-*.mjs`（新）、`docs/**`。
- `git diff -U0 db281fa9..HEAD -- index.html` 的所有 hunk 必須落在 `NIGHTWALK` 陣列內（新增三筆＋標記註解），其餘行零差異；證據＝貼出 hunk 起訖行號對照 `NIGHTWALK` 起訖行。
- 變紅：index.html 有任何 NIGHTWALK 陣列外的改動。

## 讀者與使用者

**#10 讀者（3 位 fresh、無對話史；v1、v2 各讀）**
- 關鍵事實在讀者開跑前寫入 `docs/experiments/2026-10-11-n1-ch4-6/key-facts.md` 並提交（含：人物／怪事／收場，及每章 3 題「本章新規則」理解題與標準答案要點）。
- 每位讀三章「引言＋本章新規則＋殘卷」，答：(a) 一句話複述誰／怪事／收場 (b) 像不像台灣民間怪談（是／否＋理由）(c) 看不懂的詞 (d) 三題規則理解題。
- 判準（每個「章×版本」各自判）：(a) 命中 ≥2/3 位、(b)「是」≥2/3 位、(d) 每題答對 ≥2/3 位。最多 3 輪；過不了的版本照實列未過，不放行為預設。
- (c) 的詞不計分，但須回應。
- 變紅：規則說明讀不懂、殘卷像普通奇幻。

**#11 使用者簽字文案**：允許暫緩；暫緩時一律標「待簽」，**任何回報不得寫「文案已定」**。第 1 版為預設掛載版。

## 版面與整局（需瀏覽器，一次只開一個，開前先向主 session 要 go）

**#12 手機版面**
- 390×844 與 844×390：①章節選單（6 顆）②第 4、5、6 章引言卡（含最長的 `teach`＋`intro`）③殘卷卡，共 ≥9 畫面各截圖落檔。判準同 N1 #12：`documentElement.scrollWidth ≤ 視寬`，卡片完整顯示或可捲，第 6 顆章節按鈕、引言「入市」鈕、殘卷收起鈕 `scrollIntoView` 後在視口內且可點。
- 變紅：選單 6 顆撐破寬度或最後一顆點不到、引言卡長文被截斷不能捲。

**#13 整局無錯**
- 第 4、5、6 章各從首頁點「夜行錄」→該章（用 `?nwall=1`）→引言卡→選角→自動打完整局，各跑過關／未過兩條路徑（掛點只改存活欄位，畫面走真實 `endGame`）：`pageerror` 0、console error 0、局末卡含「過關／未過關」並點名該章主角、過關路徑出現殘卷、未過路徑出現「再挑戰」。
- 正對照：這三章局中打開「？妖市規則」頁，必含「連鎖配方」與「天命密函」區塊（與第 1 章相反）。
- 變紅：新章 crash、局末不判定、規則頁缺連鎖／天命。

## 審查

**#14 程式碼審查**：fresh 代理（無對話史）審 `db281fa9..HEAD` 的 `index.html` 與測試／工具 diff，任務是反駁「這包改動不影響常規局且新章資料正確」；CRITICAL／HIGH 全修或經使用者簽准；有 CRITICAL／HIGH 時依 `02 §6.1` 附則送三態覆審。

## 已知不驗

難度（真人過關率）、台語用字正確性、直式 390×844 被既有 `#rotateHint` 蓋住（既有設計）、發布（版本號／推送／Pages）皆不在本卷驗收內，回報時逐項標「未驗證」。
