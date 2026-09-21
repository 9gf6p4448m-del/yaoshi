# 妖市：Claude Code 專案入口

**2026-09-21 L1e 記錄器續接**：[曾持有記錄器](docs/experiments/2026-09-21-l1e-recorder/README.md)已實作 opt-in headless 取得歷史，19個真實bag接點、私有scope與首次成套snapshot；預設玩法／回傳形狀不變。下一步千眼合法情報策略與正式runner接線，仍未跑正式萬局或完成六之四，A3六局暫緩。候選仍v0.57.37，未發布。

**2026-09-21 L1e 口徑續接**：[正式口徑與全席診斷](docs/experiments/2026-09-21-l1e-protocol/README.md)已完成。原 H9 是全席曾持有＋獨立預設桌，舊 raw 只有 endpoint，不能直接升格。新增診斷8/8測試通過，產品未改；下一個有界工程是曾持有 recorder（含同夜成套後失去、玩法 trace 不變），再補千眼情報策略。原六之四／正式平衡未過，A3 六局仍暫緩。

**2026-09-21 L1e 最新續接**：[探索量測卷](docs/experiments/2026-09-21-l1e-measurement/README.md)已新增七臂 runner、固定 1,400 局原始紀錄、11 項測試與突變證據。只完成探索工具，正式六之四／n≥10000 尚未通過；產品仍 v0.57.37 候選，數值未改。下一步凍結正式策略／分母／窮舉域，保留既有試玩入口與 A3 六局暫緩。

**2026-09-21 L1 最新續接**：使用者要求「繼續開工到完成需要試玩段落」。三組連攜候選 v0.57.37 在 `feat/l1-water-chain`（`C:/Users/shung/wt/yaoshi/l1-water-chain`），公開仍 v0.57.35。水陸／千眼／雙虎、私有補件提示、AI 加價、新黑金虎資產已整合；固定材料練習入口 `tests/tools/l1-playtest.html` 另提供正常隨機局。以 [L1 試玩報告](docs/experiments/2026-09-21-l1-trial/README.md) 的實際驗證與待辦為準，勿再重做水陸或把候選當正式發布。A3 六局仍暫緩；六之四／n≥10000 平衡與美術盲讀仍待完成。

**2026-09-21 最新排程**：使用者要求「六局可以先跳過 開始依照進度下一步嗎」。[A3 工程收卷](docs/experiments/2026-09-21-a3-closeout/README.md)完成，S7 真人研究暫緩、不是通過；接續 [L1 法寶連鎖規格準備／D2 建議案](plans/2026-09-21-l1-chains.md)。D2 尚未批准新規則，先依計畫裁定資訊邊界；勿再把六局當成所有後續工作的阻塞。以下舊入口依本節更新。

本檔是跨工具續接入口。使用者的最新指示優先；不要把 Codex 對話、子代理或尚未存檔的記憶當成已取得的上下文。

**2026-09-21 最新入口**：[Astra 接手報告](docs/handoffs/2026-09-21-astra-review.md)與 [F1/F2 修補結果](docs/experiments/2026-09-21-ledger-attribution/README.md)。使用者已批准修正，**v0.57.35 已發布並核對送達**（產品 84264db，部署 e2f6eca）。因果回顧改為最大淨失血區間＋逐項事件，不再強歸單件拍品；Q1 改 loss-interval-v2。回歸13/13、三位讀者六題全過、trace相等、橫式回顧開圖通過；全套115/116，保留既有音效seed3「開戰」卡住。S6 未過已簽，不重開；S7 真人六局 JSON／原話仍待提供，不自動重玩或改原話。D5 已裁（競技全開、熟練度僅外觀／列傳），下文舊「未裁」句以總藍圖最新裁定為準。

## 開始時只讀必要入口

1. `git status --short`、`git log -5 --oneline`，確認所在分支與既有修改。
2. [當前 A1 交接](docs/handoffs/2026-09-15-a1-premium-table.md)：已裁事項、公開版本、未過項及下一步。
3. [總藍圖](docs/MASTER_BLUEPRINT.md)：產品範圍與優先序；舊 Antigravity 內容已逐項整併，原文仍保留。
4. 要改 A1 時讀 [凍結驗收 v1.1](docs/experiments/2026-09-15-acceptance-a1-premium-table.md)，再按問題讀相關原始證據，不整批讀 experiments。

## 已裁邊界

- A 方向「廟埕暗桌・紙紮顯靈」與依 HUD 空間自動退鏡已批准，不重問；FOV、模型世界尺寸、文字及演出時長仍依契約。
- 延續 Astra 已定方向與構圖契約。Claude Code 可接實作、除錯、測試與紀錄；接手不代表重新選美術方向或推翻凍結標準。新的實質視覺／架構取捨依使用者與專案規範處理，不冒稱完成 Astra 覆審。
- v0.57.12 已依使用者批准實作六種詛咒差異化／造型及正式戰力退役，85 測試、300 詛咒幾何通過；已隨 `b3ea547` 發布並核對公開 HTML／造型檔送達；201 詛咒手機、768 卡面、36 物品與袋子名稱、夜戰同側回饋均通過。先讀 [本卷報告](docs/experiments/2026-09-15-curse-migration/README.md)。功能／幾何通過不等於 A1 最終驗收；相對效能、手機真機與原 P4／M-A1 未過項保留。
- v0.57.13（2026-09-17，`bc6359d`）：A1 效能診斷第一個單一修補——牌桌取景對描邊外殼不再重複計算骨骼包絡，畫面／規則／時長不變；87 測試、1599 取景矩陣、trace 相等。32 枚正式 gate 仍 RED（.3403）；128 枚中位 .403 過目前可執行 gate 但與本修補無關、逐輪 3/5。先讀 [本卷報告](docs/experiments/2026-09-17-a1-framing-dedupe/README.md)。
- v0.57.14（2026-09-17，`a53b99c`）：第二個單一修補——同一尊網格共用一副骨架，每幀骨骼貼圖上傳 51→5；89 測試、1599 矩陣、trace 相等。**A1 桌機相對效能 gate 首次全過**：perf32 .4270（paired 5/5）、perf128 .4660（5/5）。這是本機 Chromium 速度比，不是 Safari fps；真機仍待回報。先讀 [本卷報告](docs/experiments/2026-09-17-a1-skeleton-share/README.md) 與 [交接末段](docs/handoffs/2026-09-15-a1-premium-table.md)。
- v0.57.15（2026-09-17）：第三個單一修補——桌面 decal（接觸陰影／硃砂符／月印）與招式特效模板加 `forceSinglePass`，Three 0.158 對 transparent＋DoubleSide 每幀分兩趟畫並兩次 needsUpdate；每幀 getParameters 10→0、draw 94→89，像素逐位元組相同；91 測試、矩陣 slot1、trace 相等；perf32 .6585／perf128 .6943（配對 5/5，分母偏低要打折看）。報告 [docs/experiments/2026-09-17-a1-program-churn](docs/experiments/2026-09-17-a1-program-churn/README.md)。
- v0.57.16（2026-09-17）：第四個單一修補——對決畫面的浮標水面（圓盤／緣光／3 環）與殘日餘暉碟加 `forceSinglePass`，同一機制搬到對決側量：8v8 每 rAF getParameters 52→0、draw 503→477，三個取樣像素逐位元組相同；93 測試、牌桌探針不變、trace 相等；對決側只記錄相對值（交錯 3 輪修補後皆較快，duel-perf 的 fixture 不含此路徑、差在雜訊內）；perf32 .6058（paired 5/5）GREEN。報告 [docs/experiments/2026-09-17-a1-duel-singlepass](docs/experiments/2026-09-17-a1-duel-singlepass/README.md)。
- v0.57.17（2026-09-17）：第五個單一修補——紙紮妖的描邊外殼由「每個部件一顆」併成「一尊一顆」（geometry 依 GLB URL 快取、前提不符退回逐部件）；8v8 對決每 rAF draw 477→296、牌桌 hover 89→77，合併殼 vs 逐部件殼同幀像素 0 相異；96 測試、釋放 5 輪不漏、矩陣 slot1、trace 相等；perf32 .585／perf128 .6069（配對 5/5）GREEN。**使用者裁定：本卷後停追效能，轉向 A1 最終驗收剩餘項（P4 盲讀、M-A1 傳說美術簽字），再整批問 A2 開卷與 D2／D3／D5。** 報告 [docs/experiments/2026-09-17-a1-outline-merge](docs/experiments/2026-09-17-a1-outline-merge/README.md)。
- **A1 已結案（2026-09-17，[結案卷](docs/experiments/2026-09-17-a1-closeout/README.md)）；A2 已開卷**（[計畫](plans/2026-09-17-a2-benchmarks.md)、[凍結 v0.1](docs/experiments/2026-09-17-acceptance-a2-benchmarks.md)）。v0.57.18：A2 第一件標竿拼板舟甲案（使用者挑）第 3 輪版入正式資產——概念 4/4、色系①4/4、桌面剪影 2/2、特徵 4/5，可愛／玩具 3/4 依凍結標**未過待簽**；硬指標全過。報告 [docs/experiments/2026-09-17-a2-boat](docs/experiments/2026-09-17-a2-boat/README.md)。下一件：福壽綿長＋「我方單一」語彙（S3）。
- v0.57.19（2026-09-17）：A2 S3——福壽綿長甲案（使用者挑）第 3 輪版入正式資產：概念「龜」2/2、桌面色系 2/2，但「燈」三輪 0/6、可愛 1/2 → 依凍結標**未過待簽**；wardRegen1「我方單一」語彙修法出貨但重讀對象 5/18 未過（記已知）。報告 [docs/experiments/2026-09-17-a2-fushou](docs/experiments/2026-09-17-a2-fushou/README.md)。下一件：紅帽（S4）。
- v0.57.20（2026-09-17）：A2 S4——魔神仔紅帽甲案「紅帽猴精」（使用者挑）第 2 輪版入正式資產：概念「妖怪／紙紮」4/4、特徵 3/5、可愛 0/4、桌面系別③ 2/2 → **依凍結過**（已知缺口：猴臉 0/4）。報告 [docs/experiments/2026-09-17-a2-redhat](docs/experiments/2026-09-17-a2-redhat/README.md)。下一件：大士爺護心鏡回修（S5）。
- v0.57.21（2026-09-18）：A2 S5——大士爺橘球（glow_censer）移到右肩旗面、護心鏡下移腹前改亮鎏金；補讀 6 位護心鏡 **0/6 依凍結未過，使用者 09-18 簽收現況**（真因＝舌遮 94%，橘球只是次因；鏡下移超出派工範圍，使用者簽甲維持）。硬指標全過。報告 [docs/experiments/2026-09-17-a2-dashiye](docs/experiments/2026-09-17-a2-dashiye/README.md)。下一件：冥婚紅包（S6）。
- v0.57.22（2026-09-18）：A2 S6——拍賣桌詛咒品「冥婚紅包」換成甲案「綑屍紅包」第 3 輪版（薄扁亮紅＋金印、白布綑綁垂尾、血黑漬、黑髮束）：桌面「不祥」2/2、七種並排指認 6/6、768 卡面 9/9 → **依凍結 #7 過**（已知：白布帶被讀成白紙人）。報告 [docs/experiments/2026-09-17-a2-wedding](docs/experiments/2026-09-17-a2-wedding/README.md)。下一件：S7 收卷。
- **A2 已結案（2026-09-18，[結案卷](docs/experiments/2026-09-17-a2-closeout/README.md)）**：六件＝2 過（紅帽、冥婚紅包）、3 簽未過（拼板舟、福壽綿長、大士爺護心鏡）、1 記已知（我方單一語彙）；未解四題同族「低多邊形無貼圖讀不出身分」待裁下一卷方向。
- v0.57.23（2026-09-18）：燈可行性閘——福壽綿長燈碗內壁原本沒被畫出來（cup caps none），補封板＋黃銅碗＋火苗；4 讀者字面 1/4、語意 3/4，**使用者裁語意計過閘**；材質卷（鏡／猴臉／划手）排 A3 之後。滿編指認補做 0/6 未過（構圖題，併 A3）。報告 [docs/experiments/2026-09-18-lamp-gate](docs/experiments/2026-09-18-lamp-gate/README.md)。**A3 六題已裁（見交接末段），下一步開 A3 計畫與凍結檔。**
- **A3 已開卷（2026-09-18）**：[計畫](plans/2026-09-18-a3-experience-slice.md)、[凍結 #1–#12](docs/experiments/2026-09-18-acceptance-a3-experience-slice.md)，順序聲音→台詞→因果→滿編構圖→再玩研究。v0.57.24／v0.57.25：聽板 `tests/tools/sfx-board.html`＋離線渲染 `sfx-render.mjs`（S1）；四事件新音候選、使用者挑定（落籌乙／封標甲／揭盅甲／受咒乙）、#3 閘門 54/54、接線＋`tests/sfx-wiring.test.mjs` 綠、`?sfx=0`（S2）。v0.57.26／0.57.27：S3 使用者手機盲聽 6/8 過、序列 0 對、12 支 hurt 換甲「紙裂」、真機四事件「四個都有」——**聲音段 #2–#7 結案**。v0.57.28 首頁 BGM 小卷（A3 外，使用者裁乙，`home`＝alt take 2）。v0.57.29 S4 角色台詞：十角色七鍵、`lineFor`＋evRef、三個新掛點；`tests/lines.test.mjs` 綠；讀者 r1 13/14、r2 獵人落標句 3/6 **未過待簽**（`docs/experiments/2026-09-18-a3-lines/`）；落籌銅錢候選 chip_c／chip_d 待使用者挑。v0.57.30：獵人落標句帶拍品名（使用者同意第 3 輪，6/6）、落籌換使用者挑的銅錢 chip_c、盲聽 r2 8/8，S4 14/14、聲音段重關。v0.57.31 S5 因果短敘事：`ledgerNarrative`＋本局回顧「這一局的因果」3–6 句；口徑在 `tests/ledger.test.mjs`；機械 2/2、trace equal、headless pageerror 0；讀者 r1 1/6（「最狠的一手」被當主因）→ 改措辭 r2 **6/6 過**（[報告](docs/experiments/2026-09-18-a3-ledger/README.md)）。v0.57.32 S6 滿編構圖：對決 8v8 同型錯位（`dupGroups`／`dupStagger`）＋三件描邊改主色（`MAIN_OUTLINE`，只在對決端）；遮擋率拼板舟／紅帽過、福壽未過（幾何極限）；讀者 r1 **2/6 未過**（紅帽 2/2；拼板舟敗在敵方王船、福壽敗在燈碗身分，皆不在 #10 改法內）；硬指標 draw 296／trace equal／矩陣 48/48×3／perf32 5/5；`sfx-wiring` seed 3 卡「開戰」歸因見報告（[報告](docs/experiments/2026-09-18-a3-crowd/README.md)）。使用者裁第 2 輪不用 ⇒ **#10 未過簽字收現況**。v0.57.33 S7 前置工程：本局回顧「複製本局紀錄」（`replayExport` 純函式＋剪貼簿／文字框備援）、`tests/replay-export.test.mjs`、headless 探針、`tests/tools/replay-judge.mjs` 對照工具；trace equal。**下一步：使用者側 3 人各 2 局（[規程](docs/experiments/2026-09-18-a3-replay/README.md)），JSON＋原話交回後逐局判 #11**。
- D2 連鎖、D3 幽靈、D5 進度等未裁，不因總藍圖收錄而直接實作。
- 持續發布授權有效：必要驗證後可正常提交、push 並核對公開送達。不要 force push；不能只有 push 成功就稱網站已更新。

## 工作樹與工具

- 不用 `git add -A`、reset 或 clean 處理既有 dirty files；具體清單見交接。避免兩個工具同時編輯同一工作樹；平行工作需各自 worktree 與明確檔案責任。
- 搜尋限當前專案來源；排除 `.claude/worktrees/`、`.codex-worktrees/`、`scratchpad/`、`node_modules/`，除非正在查指定舊證據。**2026-09-17 起工作樹一律開在 OneDrive 外的 `C:/Users/shung/wt/yaoshi/`**（OneDrive 同步 40 多棵樹曾吃掉 12 GB 記憶體）；舊樹已清，有未提交內容的四棵搬到 `wt/yaoshi/keep/`，Codex 的 table-ui-hierarchy 在 `wt/yaoshi/codex/`，其餘未追蹤檔歸檔在 `wt/yaoshi/archive/`。新樹裡沒有 `tools/`，用 junction 接主 repo：`cmd /c mklink /J tools <主repo>/tools`。
- 靜態 HTML／JS 遊戲。快速檢查：`node --test tests/*.test.mjs`；純呈現改動另以同版基準跑 `tests/tools/trace-eq.mjs`。
- 瀏覽器工具使用本機、未追蹤的 `tools/anyCreature/` 依賴。2026-09-15 實測 Node 24.16.0、Python 3.14.5、Playwright 1.62.1、本機測試套件 Three 0.180.0；遊戲 importmap 實際載入 Three 0.158.0，兩者不能混稱。同機可沿用；換機需先確認依賴，Git 不包含這個目錄。不因版本不同而擅自升級遊戲。
- 效能診斷與正式 gate 分開；CPU profile 不能證明 Safari fps。正式性能量測獨占 GPU browser，不與截圖／矩陣同跑。
- 有受影響的程式改動才跑必要檢查。未改產品時不用重跑 1599 矩陣；不能反覆重測直到挑到綠燈。

Claude Code 的專案記憶機制參考：[官方文件](https://code.claude.com/docs/en/memory)。
