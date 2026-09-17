# A2 紙紮夜戰與資產標竿：執行計畫（2026-09-17 開卷）

使用者 2026-09-17 裁定「開 A2」（[交接信九題裁定](../docs/handoffs/2026-09-15-a1-premium-table.md)）。範圍依 [總藍圖 §2.2／§5](../docs/MASTER_BLUEPRINT.md)：**三系各一件、詛咒一件、傳說一尊的標竿**，分**英雄視角／實際桌面大小／滿編**三種使用情境檢查；**來源／對象可讀**（＝P4 對象題的回修）是本卷交付的一部分。凍結驗收：[2026-09-17-acceptance-a2-benchmarks.md](../docs/experiments/2026-09-17-acceptance-a2-benchmarks.md)。

## 0. 已裁與不裁

- 標竿件（已裁）：祖靈＝**拼板舟 boat**（P4 對象 6/18、R-A2 三輪未過）、香火＝**福壽綿長 fushou**（P4 對象 3/18）、陰氣＝**魔神仔紅帽 redhat**（有正式演出，R-A2 三輪未過但「不可愛」0/6 成立）、傳說＝**大士爺 dashiye**（M-A1 已簽字，護心鏡與 `glow_censer` 互搶回修排此卷）。
- 詛咒一件：**冥婚紅包 wedding**（S0 已裁）。拼板舟方向：甲／乙並排、丙對照；「我方單一」語彙：甲（bodySpot＋道具落受益者）。
- 不動：規則、亂數、演出時長契約（`PW_FX.TRAIT_MS_BY_TIER`）、ART_BIBLE 三系色票與「不可愛」守則、A1 構圖契約（取景／退鏡／HUD 不相交）、原 P4／M-A1 門檻。
- 美術是品味題（`03 R6`）：每件標竿先出 **2–3 個差異化方案**（contact sheet＋三情境各一張）讓使用者挑，**不自定稿**；挑定後才做正式盲讀。

## 1. 步驟

| 步驟 | 交付 | 退出條件 |
|---|---|---|
| S0 開卷拷問（一輪） | 詛咒件三選一；拼板舟方案方向 2–3 個；「我方單一」增益語彙候選 2 個 | 使用者一次回完（可只回「都照建議」） |
| S1 標竿治具 | `tests/tools/a2-sheet.mjs`：對一件標竿一次產出英雄視角（closeup 機位）、實際桌面大小（tray hover 視口 844×390 與 1280×720）、滿編 8v8 三張圖＋硬指標 JSON（tris、draw、包圍盒、盲讀材料） | 對現版四件跑通、0 console error、輸出檔存在且含三情境欄位 |
| S2 拼板舟（第一件） | 2–3 方案的 contact sheet → 使用者挑 → 實作 → 盲讀（≤3 輪） | 凍結 #3／#4 通過或三輪上限到、標「未過」交裁 |
| S3 福壽綿長＋「我方單一」語彙 | 同 S2；連同增益對象語彙修法（凍結 #5） | 同上＋P4 對象題重讀（只讀本件，不重跑 18 支） |
| S4 魔神仔紅帽 | 同 S2 | 同上 |
| S5 大士爺護心鏡回修 | 橘球移到手上或旗上（blindread-v2 建議）→ 補讀一次 | 護心鏡 ≥3/6 或標未過交裁 |
| S6 詛咒一件 | 同 S2（造型在 `table-tray.js` makeCursePile 分派） | 同上 |
| S7 收卷 | 報告、送達核對、藍圖 §5 A2 狀態、交接 | 凍結 #1–#9 逐條有證據；未過項列出 |

每件標竿一個子卷目錄 `docs/experiments/2026-09-XX-a2-<key>/`，含 acceptance 執行紀錄、方案 contact sheet、盲讀材料與讀者 JSON。

## 2. 既有治具與來源（不重造）

- 英雄視角：`tests/tools/closeup-shots.mjs`／`closeup-drive.mjs`／`closeup-judge.mjs`。實際桌面大小：`table-framing-check.mjs`、`framing-bench.mjs`、`gl-frame-probe.mjs`。滿編：`duel-perf.mjs`、`legend-blindread.mjs`、`lineup-shot.mjs`、`gl-duel-probe.mjs --drawBudget=1`。
- 盲讀：`blindread-sheet.mjs`、P4 讀者 JSON 格式見 `docs/experiments/2026-09-13-zuling-b2-evidence/p4-blindread-x2-r*/`。
- P4 對象題候選修法：`docs/experiments/2026-09-13-zuling-b2-report.md:373–377、516、1081、1194`（增益道具落點改到受益方、「我方單一」改用 `st.bodySpot`、送王船「降」動作被讀成減益箭頭）。
- 資產：`assets/creatures/{boat,fushou,redhat,dashiye}.glb`；招式 `js/trait-fx/xianghuo.js`（swarmHalfSplash :806、wardRegen1 :1410、wardGuardAll :202）、`js/trait-fx/yinqi.js`（hauntLost :156）；語彙表 `js/trait-fx/vocab.js`。
- 守則：`docs/design/ART_BIBLE.md:11`（不可愛）、`:24/:33/:42`（三系色票）；紙紮材質提醒在 `docs/experiments/2026-09-07-ref-dashiye.md`。VFX 規範 `docs/design/2026-09-16-duel-vfx-pipeline-spec.md`（碎裂 16–32 片紙紮碎屑；色票／節奏／效能三紅線）。

## 3. 風險

- 拼板舟與紅帽的 R-A2 三輪額度已用完：本卷是**新方案**的盲讀，不是舊方案重跑；報告要寫明「方案 X 第 1 輪」，不沿用舊輪數，也不拿新綠燈覆蓋舊紀錄。
- 動模型會動 `duel-perf bounds`（`min.y ≥ 0`）與取景矩陣：每件實作後跑 `--match=<key>` 那一塊與 bounds。
- 效能：每件實作後 perf32 一次（門檻 .40 逐輪）、對決 `gl-duel-probe` draw 記錄；不得因美術把 8v8 draw 推回 400 以上（現 296）。
