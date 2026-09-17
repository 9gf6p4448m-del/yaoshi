---
description: "妖市接手：先讀 CLAUDE.md 與本交接，延續 v0.57.11 A1；自動退鏡已批准，先處理效能證據與手機回饋，保留原門檻。"
---

# A1：精品牌桌與揭盅

## 授權與範圍

使用者已要求合併舊藍圖、採 A「廟埕暗桌・紙紮顯靈」、開始執行，並明確允許「依 HUD 空間自動退鏡」。模型世界尺寸、FOV、文字和演出時間維持原契約。必要驗證完成後沿用持續發布授權；不再次要求發布許可。

入口：[總藍圖](../MASTER_BLUEPRINT.md)、[計畫](../../plans/2026-09-15-a1-premium-table.md)、[驗收 v1.1](../experiments/2026-09-15-acceptance-a1-premium-table.md)、[執行證據](../experiments/2026-09-15-a1-opening/EXECUTION.md)。

## 已實作

- 真實 DOM 法寶頁籤同步 3D 焦點，四槽實測且賽局狀態逐位元組不變（d86d9fc）。
- 拍品與桌面印籌共同取景；按可見模型、骨骼當幀姿勢、印籌 instance 位置及 HUD 空間計算退鏡與投影移位（ab563b7、0601f31）。
- 保留 .86 秒得標／.72 秒轉移／.62 秒焚毀；終點先量幾何再隱藏。跳過時多件同時飛行仍共同取景，終點保持到結果卡後再釋放（6b94356）。
- 轉直式或離開牌桌時清除橫式取景，回橫式重新計算（b0a5446）。
- A 向漆木、纸色文字與硃紅頁籤；桌機 960px、字級與陣營辨識維持。

## 目前驗證與待辦

55/55 單元測試、768 張卡片、25 項裝置版面、256 種印籌分配、四頁籤真實點擊、trace seeds 1–20、原速 seed3 四槽、跳過、轉向與 reduced-motion 通過。最終 core 07124ed 完整 1599/1599 投影全過、零頁面錯誤。

正式五輪：候選 32／128 速度比 .3596／.3365，基準 eafec13 為 .3635／.3767；全部低於 .40。候選 calls／triangles／passes 與實體數量通過，速度比仍 RED，不因基準同樣失敗而改判。詳細原始數據與性能修補見 EXECUTION。

v0.57.11（aa7aa7b）已推送及公開；兩處版本、55 測試、trace、公開 HTML／四份資產及四槽原速揭盅實載均已驗證。A1 最終驗收未完成；手機真機、D2／D3／D5、原 P4／M-A1 與歷史性能未過項均保留。
## 工作樹保護

開場既有的交接修改、iPhone standalone result、根目錄 props 圖、AGENTS.md、.codex-worktrees 和舊 published 證據保留；不要用全目錄 stage／reset／clean 混入或刪除。當前 A1 產品提交已保留 RED／GREEN 軌跡。

## 2026-09-15 額度與 Claude Code 接手

- 使用者表示 2026-09-17（四）11:00 可用 Claude Code 接手，並要求回答後繼續工作；這不是停止指令，也不是要求建立排程。
- 本次核對 Codex 週額度 usedPercent=75，剩 25%；重置 2026-09-21 01:10:01（Asia/Taipei）。這是當時帳號快照，不保證可換算為固定工作時數；Claude 額度與可用時間以使用者提供為準，未登入驗證。
- 目前採一項問題一次診斷；保留額度供手機回饋與必要修補，不同時展開 A2／連鎖／幽靈。此為本輪執行安排，不是永久額度規則。
- 已新增根目錄 [CLAUDE.md](../../CLAUDE.md)，同機直接開此專案續接即可。跨工具移交的是來源、提交、裁定與證據；Codex 子代理 ID／對話不會自動轉移，也不能把 Astra 覆審身分轉給其他模型。
- 已发布產品提交 `aa7aa7b`；公開證據提交 `e703b32`。接手時再查最新 HEAD；本段不以歷史提交替代當時的 git status。

### ★ blocker ★

速度比門檻仍 RED；Safari 主畫面真機回報未到；原 P4／M-A1 三輪歷史保留。這些阻擋最終驗收，但不阻擋有界蒐證。新視覺取捨或放寬凍結值仍需具體裁定，不能用換工具重新計算輪次。

### 下一步順序

1. 讀本輪 [CPU 診斷報告](../experiments/2026-09-15-a1-performance-followup/README.md)，先確認樣本支持的瓶頸，不直接把 profile 中的百分比當每幀占比或性能 gate。
2. 若有手機回饋，優先定位法寶頁籤、完整起飛、盯印歸屬與轉向／跳過，記錄裝置、瀏覽器／主畫面模式、版本、夜數、法寶及操作順序；原速與舒適度由玩家實測，桌機不代填。
3. 有可靠修補假設後，每次只改一個成本來源，保留 RED／GREEN 和原幾何契約；按受影響範圍跑測試。只有產品修補落地後才重跑正式成對性能與必要完整矩陣。
4. A1 尚未最終收斂前不宣告 A2／新功能已批准；若想並行開新卷，提出具體範圍與依賴，依新裁定執行。

### 本輪續工產物

候選 v0.57.11 與完整 eafec13 基準各一份短 CPU profile 已採集：同初夜 seed1、844×390 DPR2、32 枚銅錢、slot1 陰陽眼銅錢；四模型可見，94 calls／30281 triangles／1 pass，兩份 errors=[]。保存原始 `.cpuprofile` 與摘要；本輪未改 index.html／js／assets／tests，公開產品仍 v0.57.11。詳細採樣方式、插樁負擔與待驗假設以報告為準，不以這兩次短採樣替代原五輪門檻。

交接文件相對連結與 git diff --check 已檢查；未改產品，不重跑已完成的 55 測試／1599 矩陣。`tools/anyCreature` 裡的 Three 0.180.0 是本機測試依賴，遊戲 importmap 實際為 0.158.0；接手勿混用版本結果或直接升級依賴。

### 給 Claude Code 的第一句

> 妖市接手：先讀 CLAUDE.md 與 docs/handoffs/2026-09-15-a1-premium-table.md，再核對 git status 和最新提交。延續 v0.57.11 A1，自動退鏡與 A 方向已批准；先接效能診斷／手機回饋，保留原門檻與 D2／D3。請直接做下一個有證據的有界任務，不重新閱讀全部歷史或重做已完成測試。

續接：`/handoff 妖市：接 v0.57.11 A1 手機試玩；自動退鏡已批准，功能與幾何通過，速度比仍 RED，保留 D2／D3 及原門檻。`


## 2026-09-15 v0.57.12：手機回饋／全物品文字

最新產品提交 `e111914`。玩家回報詛咒缺效果，並要求一併檢視所有法寶：已校對 27 普通＋5 詛咒＋3 傳說、23 能力與 30 招式；補效果／免疫／失血／作用範圍／觸發條件，區分共鳴拍與出手、戰力評估與紙紮攻擊。竹椅電腦持有例外及同名隊伍疊加亦已澄清。

65/65 測試、seeds 1–20 勝負與拍序列完全相等；手機兩尺寸逐件完整性與可讀性驗證，完整最新結果及公開送達見 [本輪報告](../experiments/2026-09-15-item-copy-audit/README.md)。未改數值、hooks、3D 或演出。沿用發布授權；公開是否送達以報告的實際核對為準。

Claude Code 接手先讀本節與該報告，再依最新手機回饋／A1 效能診斷進行下一個有界修補。前文 v0.57.11 及 55 項測試是前輪歷史，勿覆蓋最新狀態；A1 性能 RED、真機／P4／M-A1 與 D2／D3／D5 均保留。

### 最新中止發布／方向更正

使用者指出五詛咒同質化，並重申已決定不看戰力。e111914 為未發布的文案候選，全部 browser 綠燈只驗舊引擎一致性，不能作發布依據。接手先处理取消戰力的殘留與詛咒差異化，勿沿用前文「戰力評估」方案；原始證據保留，未 push。


## 最新：已批准六種詛咒差異化與取消正式戰力

使用者「按照建議開工」並詢問造型。最新產品提交 `4311b8a`／v0.57.12；六種詛咒已各有單一效果與紙紮實物輪廓，正式模式不再呼叫舊 power()。35 固定庫加事件王船煞共 36 件，王船不是普通拍賣品。完整規格、各件文案、RED/GREEN 與造型證據見 [功能卷報告](../experiments/2026-09-15-curse-migration/README.md)。

85/85 程式測試與 300/300 詛咒幾何通過；已隨 `b3ea547` 發布並確認公開 HTML／造型檔送達。201 手機詛咒、768 卡面、36 物品全說明、袋子名稱 RED→GREEN 及兩種夜戰同側回饋皆已完成；產品最後為 `86cd57f`。前面的中止發布是舊文案候選沿革，不能覆蓋本次最新批准。A1 原效能 RED、真機／P4／M-A1 及 D2／D3／D5 保留。Claude Code 接手先讀本節與功能卷，再讀必要原始證據。


## 2026-09-17 Claude Code 接手：v0.57.13 取景鏈去重（A1 效能診斷第一個修補）

沒有新的手機回饋，依交接順序接 A1 效能診斷。重析前輪 `candidate-hover-slot1.cpuprofile`：候選版獨有的每幀成本幾乎全在取景鏈（frameSubjects 319 µs/幀），其中 `posedBounds` 子樹 134 µs 對 13 顆本體＋13 顆可見描邊外殼各算一次，而外殼與本體共用 geometry／skeleton／bindMatrix，結果必然相同。單一修補：同一次取景內共用骨架的網格只算一次骨骼包絡（`js/table-framing.js`）。完整規格、RED／GREEN、矩陣、微基準、五輪與 profile 見 [本卷報告](../experiments/2026-09-17-a1-framing-dedupe/README.md) 與 [凍結驗收](../experiments/2026-09-17-a1-framing-dedupe/acceptance.md)。

- 提交：`8960aeb`（凍結驗收＋微基準＋紅測試）→ `bc6359d`（修補、版本 0.57.13、工具、證據）→ 本交接。分支 `a1/framing-dedupe` 於 `.claude/worktrees/a1-framing-dedupe` 完成，快轉合入 main 後推送；公開送達核對見報告末段。
- 驗證：87/87 測試（85 既有＋2 新增）、1599 取景矩陣修補前後各全過且差異落在同版重跑波動內、trace seeds 1–20 相等、Node 微基準交錯 5 次 −3.4%（結果 hash 相同）、瀏覽器 profile 取景鏈 319→246 µs/幀。
- **正式五輪**：32 枚 ratio .3403 **仍 RED**（前輪 .3596，同一波動帶）；128 枚中位 .403 第一次過目前可執行的 gate（paired 3/5、09-14 逐輪口徑未過），但 128 模式描邊關閉、去重不生效，**不得歸功本修補**。`table3d=lite` 與預設比值幾乎相同，表示門檻卡在托盤 3D 場景的共同底成本。
- 驗收 #3 依 `02 §2.1` 例外修正（矩陣工具本身逐次不確定，改為「差異不超過同版重跑」），理由與數字在報告。
- 未動任何非本 session 的檔案與行程；主 checkout 的既有 dirty 檔（INDEX.md、兩份交接、iPhone result）保留，因 INDEX.md 在主 checkout 有未提交修改，本輪**沒有**改 INDEX.md，請 Codex 在提交自己的 INDEX 修改時補一列指向本節。
- 本機記憶體吃緊（32 GB 剩約 1.2 GB；OneDrive 約 10 GB、約 19 組 session 的 MCP 伺服器約 8 GB），背景長跑會被看門狗中止；矩陣改以 `--match=slot0..3` 前景分塊。要不要清那些行程由使用者決定。

### 下一步順序

1. 有手機回饋先處理（規程同前段）。
2. A1 效能下一個單一假設：修補後 profile 每幀仍有 `getParameters` ≈153 µs 與 `upload`／`texSubImage2D` ≈114／130 µs（基準也有）。先在真實頁面計數每幀 `getProgram` 次數與 `texSubImage2D` 的來源貼圖（骨骼貼圖或其他），確認是每幀重算／重傳再改；不得憑百分比直接動材質管線。
3. 128 枚 gate 的規格文字差異（中位數 vs 逐輪）仍待使用者裁定，本輪不改判。
4. D2／D3／D5、真機、P4／M-A1 照舊保留。

續接（已由下一節取代）：`/handoff 妖市：接 v0.57.13 A1 效能第二個假設（getProgram／texSubImage2D 每幀計數）或手機回饋；32 枚 gate 仍 RED，保留 D2／D3 與原門檻。`


## 2026-09-17 v0.57.14：骨架共用——32／128 枚正式 gate 首次全過

使用者「繼續下一步」後接上節第 2 點。新工具 `tests/tools/gl-frame-probe.mjs` 在真實頁面逐幀計數 WebGL 呼叫：每幀 51 次 16×16 float 骨骼貼圖上傳＝51 副 Skeleton，但只有 5 組不同的骨頭集合——`SkeletonUtils.clone` 逐 mesh 重建骨架（creature-figures.js:831 早有註記）。單一修補 `js/skeleton-share.js`＋`creature-figures.js` clone 後一行：同一尊 bone 陣列與 boneInverses 完全相同的網格共用一副 Skeleton。規格、RED／GREEN、探針、矩陣、五輪見 [本卷報告](../experiments/2026-09-17-a1-skeleton-share/README.md) 與 [凍結驗收](../experiments/2026-09-17-a1-skeleton-share/acceptance.md)。

- 提交：`a53b99c`（修補、版本 0.57.14、測試、工具、證據）→ 本交接。快轉合入 main 後推送；送達核對見報告末段。
- 驗證：89/89 測試（87＋2）；真實頁面上傳 51→5／幀、骨架 51→5、貼圖記憶體 56→10；1599 取景矩陣全過；trace seeds 1–20 相等；dispose 五輪貼圖固定；Node 端共用前後 fitSubject 逐位元組相同。
- **正式五輪**：perf32 ratio **.4270、paired 5/5**；perf128 **.4660、paired 5/5、gate128 pass**。這是 A1 相對效能門檻第一次在中位數與 09-14 逐輪口徑下同時通過；分母（空場）與前幾輪相近，分子（hover）由 380–401 升到 500–544，落在修補命中的路徑。**這是本機桌機 Chromium 的相對速度比，不等於 Safari fps；真機仍待玩家回報。**
- 驗收 #4 依 `02 §2.1` 例外修正：跨版本逐案分佈在此矩陣工具上無論實作對錯都不可能成立（桌機 launch／terminal 絕對值依賴跑序狀態；v0.57.13 前後就有 43 案 >1 px），改以同版重跑穩定＋受影響案例單獨跑相等＋Node 逐位元組相等判綠，理由與數字在報告與驗收檔，請使用者過目。矩陣工具的跑序依賴列為待修。
- 未動任何非本 session 的檔案與行程；主 checkout 的 dirty 檔（INDEX.md 等）保留，INDEX.md 仍未改，請 Codex 提交自己的 INDEX 時補列。

### 下一步順序

1. 有手機回饋先處理。**建議玩家在 Safari 真機重測 v0.57.14 的牌桌流暢度與四槽揭盅**——這是本卷改善最需要的驗證。
2. A1 效能 gate 已綠但只是相對速度比；若要繼續壓成本，下一個候選是每幀 `getParameters`（前輪 profile ≈150 µs，`setProgram` 仍每幀重走 getProgram 的原因未查明；本卷材質共用掃描沒發現 instanced／skinned 混用），先計數再改。
3. 矩陣工具 `table-framing-check.mjs` 桌機視口的跑序依賴（launch／terminal 值隨前案狀態變）待修，修前不得拿跨版本逐案分佈當等價證據。
4. 128 枚 gate 的規格文字差異（中位 vs 逐輪）這次兩者皆過，裁定仍留給使用者。D2／D3／D5、真機、P4／M-A1 照舊保留。

續接：`/handoff 妖市：接 v0.57.14 真機回饋；A1 桌機相對效能 gate 已綠（32 枚 .427、128 枚 .466），保留 D2／D3 與原門檻。`


## 2026-09-17 v0.57.15：兩趟繪製修補——每幀 getParameters 10→0、draw call 94→89

使用者「繼續處理」後接上節第 2 點（`getParameters` 每幀 ≈150 µs、原因未查明）。探針新增 program churn 掃描（包 `Material.prototype.customProgramCacheKey` 精確計數＋攔截 `version` 寫入抓堆疊）：每幀 10 次全來自 5 顆 transparent＋DoubleSide 的 `MeshBasicMaterial`，堆疊落在 Three 0.158 `renderObject`（three.module.js:29725／29729）——對這種材質**分 BackSide／FrontSide 兩趟畫、每趟 `needsUpdate = true`**。五顆是接觸陰影（`js/table-props.js:403`）、硃砂符與月印（`js/table-tray.js:407／412`）、招式特效模板 MAT_GLOW／MAT_SOLID（`js/trait-fx.js:187／198`）。單一修補：各加 `forceSinglePass: true`。規格、RED／GREEN、探針、像素 A/B、五輪與分母交代見 [本卷報告](../experiments/2026-09-17-a1-program-churn/README.md) 與 [凍結驗收](../experiments/2026-09-17-a1-program-churn/acceptance.md)。

- 驗證：91/91 測試（89＋2，新測試經 `tests/tools/three-node-resolver.mjs` 在 Node 真的建構 tray／props／trait-fx 斷言旗標）；真實頁面 getParameters 10→0、draw 94→89、`useProgram` 27→21、program 35→30，骨骼貼圖上傳與 textures 不變；**同幀像素 A/B 四槽翻轉旗標 0 相異像素**（BackSide 負對照 2.1%、同旗標重渲染 0）；矩陣 slot1 399/399；trace seeds 1–20 相等。
- **正式五輪**：perf32 ratio **.6585、paired 5/5**；perf128 **.6943、paired 5/5、gate128 pass**。calls／tris 下降（94→89、30281→29477）對應修補路徑；但這輪空場分母（844–984）比前卷（≈1170）低約 20%（本機有 Edge／WebView2 共 19 個行程），比值上升要打折，工具只認同支瀏覽器交錯配對的相對值。仍是桌機 Chromium 相對速度比，不等於 Safari fps。
- 分母交代：`grep DoubleSide` 14 處逐條列在報告——桌面路徑 5 顆已修；水面／人形邊光／地影／餘暉 4 處是**對決專用**、同一機制、未修（下一個候選，需在對決畫面做同幀像素 A/B）；其餘為不透明 MeshStandard 或註解。
- 未動任何非本 session 的檔案與行程；主 checkout 的 dirty 檔（INDEX.md 等）保留，INDEX.md 仍未改，請 Codex 提交自己的 INDEX 時補列。

### 下一步順序

1. 有手機回饋先處理。**建議玩家在 Safari 真機重測 v0.57.15**（兩卷效能修補疊加後的牌桌流暢度與四槽揭盅）。
2. A1 效能下一個單一假設：對決畫面同一機制的 4 處 DoubleSide 透明材質（水面碟／緣光／漣漪、邊光、地影、餘暉）——先用 `duel-drive` 或同型治具到對決畫面跑 `pixelAB` 式同幀比對，再加旗標；不得憑牌桌的結果直接套。
3. 矩陣工具 `table-framing-check.mjs` 桌機視口的跑序依賴（launch／terminal 值隨前案狀態變）仍待修，修前不得拿跨版本逐案分佈當等價證據。
4. 128 枚 gate 的規格文字差異（中位 vs 逐輪）連續兩卷兩者皆過，裁定仍留給使用者。D2／D3／D5、真機、P4／M-A1 照舊保留。

續接：`/handoff 妖市：接 v0.57.15 真機回饋；A1 桌機相對效能 gate 連兩卷全過（perf32 .6585、perf128 .6943），對決側 4 處 DoubleSide 透明材質為下一候選，保留 D2／D3 與原門檻。`

## 2026-09-17 v0.57.16：對決側兩趟繪製修補——8v8 每 rAF getParameters 52→0、draw 503→477

使用者回報真機回饋可以後接上節第 2 點。前卷探針的三段頁面端函式抽到 `tests/tools/gl-probe-lib.mjs`（牌桌探針重跑數字不變），新工具 `tests/tools/gl-duel-probe.mjs` 走 `duel-drive` 到第 2 場對決、派隔離的合成 8v8（殘日＋5 隻 buoy）量：對決每 rAF 5 趟 render；26 顆 transparent＋DoubleSide 的 `MeshBasicMaterial`（5 隻 buoy × 5 片水面＋殘日餘暉碟）每 rAF 各重走 2 次 `getParameters`、多 1 次 draw，堆疊同樣落在 Three 0.158 `renderObject` 兩趟繪製。單一修補：`creature-figures.js` `makeWaterPool()` 的 `flat()` 與 `duel-figures.js` 餘暉碟材質加 `forceSinglePass: true`；`makeLegendKit` 加 `export` 給 Node 測試。規格、RED／GREEN、探針、像素 A/B、分母交代見 [本卷報告](../experiments/2026-09-17-a1-duel-singlepass/README.md) 與 [凍結驗收](../experiments/2026-09-17-a1-duel-singlepass/acceptance.md)。

- 驗證：93/93（91＋2，`tests/single-pass-duel.test.mjs` 在 Node 真的建構水面與餘暉碟，修補前紅在行為斷言）；真實對決每 rAF getParameters 52→0、materialsCalled 26→0、draw 503→477（剛好少 26）、useProgram 106→55、骨骼貼圖上傳不變；**同幀像素 A/B 三個取樣翻轉旗標 0 相異像素**（BackSide 對照約 8%）；牌桌探針 getParameters 0／draw 89／4 槽 0 相異；trace seeds 1–20 相等。
- 效能：對決側原無 gate，只記錄——交錯 3 輪修補後 670.8／741.2／534.8 vs 修補前 606.1／528.4／502.9 renders/s（三輪皆較快，輪間波動大於差值）；`duel-perf` 728.9 vs 732.8（其 fixture 沒有 buoy，量不到是預期）；牌桌 perf32 .6058、paired 5/5 GREEN。中途曾被 Claude Code 因系統記憶體不足中止（OneDrive 占 12 GB、殘留 MCP 伺服器 4 GB），使用者重啟 OneDrive 後補跑完。
- 分母交代：`grep DoubleSide` 21 處逐條列在報告。2D 貼片人形（邊光／地影）正式路徑走不到（`renderer.js:130` 只在缺 `ab` 時退回）、殘日基座 `paperMat` 只在淡出時暫時 transparent 且裂芒真的兩面重疊——兩者不修、理由在報告 #7。
- 未動任何非本 session 的檔案與行程；主 checkout 的 dirty 檔（INDEX.md 等）保留。

### 下一步順序

1. 有手機回饋先處理。**建議玩家在 Safari 真機重測 v0.57.16**（對決畫面 8v8 有浮標時的流暢度）。
2. A1 效能下一個假設：對決每 rAF 有 5 趟 render（`passesPerRaf` 5，duel-perf 的 fixture 量到 10）——先查 `js/renderer.js` 對決期間的 bloom／合成 pass 數與每趟的 draw 分佈（本卷探針 `perRaf` 已能量），確認哪幾趟是必要的，再決定是否有單一修補。
3. 矩陣工具 `table-framing-check.mjs` 桌機視口的跑序依賴仍待修。
4. 128 枚 gate 的規格文字差異（中位 vs 逐輪）裁定仍留給使用者。D2／D3／D5、真機、P4／M-A1 照舊保留。
5. 環境：本機 OneDrive 同步著妖市 40 多棵 worktree（曾漲到 12 GB），加上舊 session 殘留的 MCP 伺服器，會讓 Claude Code 砍背景工作。把 `.claude/worktrees`／`.codex-worktrees` 搬出 OneDrive 或清舊 worktree 要使用者裁定。

續接：`/handoff 妖市：接 v0.57.16 真機回饋；A1 桌機 gate 連三卷全過，對決每 rAF 5 趟 render 為下一候選，保留 D2／D3 與原門檻。`
