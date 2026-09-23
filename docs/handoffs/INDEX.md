# 妖市交接索引

**最新入口（2026-09-24）**：[六連鎖、天命與發布 Premortem](../reviews/2026-09-23-destiny-final-review.md)及[續作計畫](../../plans/2026-09-23-destiny-next-steps.md)。隔離分支 `feat/l1-water-chain` 已有候選提交 `5bd3817`、量測歷史驗證提交 `3640120`；產品字串仍為 v0.57.40，**v0.57.41 尚未發布**。普通 H1/H9 各七臂、真版六臂均固定 10,000 局；雙虎／血祭活動及逐件配對診斷也各完成 10,000 組，三臂端點吻合舊 raw。千眼知情策略補充已完成三臂各 10,000 局：知情策略改變 18.69% 對局的至少一次出價，座位 0 對盲策略勝率差 −0.18pp（95% 配對 bootstrap −0.44..+0.08），不能改變正式千眼 H9 `incomplete`。本輪另完成千眼公告、私函、四件預告的 844×390／1280×720 六張畫面覆核：手機私函可捲動但關閉鈕在首屏下方，四件預告未標示額外第四件；[報告](../experiments/2026-09-24-eyes-informed-supplement/report.md)與[真人冷讀記分表](../experiments/2026-09-24-eyes-informed-supplement/blindread-scorecard.md)已備妥，至少五位真人尚未實測。長時 SFX 原測曾卡於「下一件拍品」；修正測試驅動後完整 `sfx-wiring` 長測通過一次（1/1、403.7 秒），但原始間歇原因仍未定位。普通正式 H9 仍是雙虎／血祭 fail、千眼 incomplete；真版焦點四鏈 fail、兩鏈 incomplete。下一步是真人盲讀、六之四跨夜模型及長時 SFX 間歇復現診斷；不發布。逐局 raw 留在忽略版控 `scratchpad/`，本補充 raw SHA256 `968a767b1f7088014e8c47a47efc129b7dd85778bca849b578177549496bc908`。

X v5 進度（2026-09-24）：[盯印／放血／選尊契約](../experiments/2026-09-23-destiny/model-contract-v5.md) RED `c099e06`／GREEN `85eff22`；新增 4/4，v2–v5 合跑 75/75。已完成事件夜盯印 10k 配對診斷（[報告](../experiments/2026-09-24-mark-timing/report.md)）；至少一席 AI 換標 1,110/9,999 局，座位 0 勝率差 −0.06pp（95% −0.30..+0.18），暫保留時序與係數；戰鬥、夜末結算、跨階段 full recall 與 solver 仍缺，發布資格不變。

X v6 進度（2026-09-24）：[夜戰／夜末／終局契約](../experiments/2026-09-23-destiny/model-contract-v6.md) RED `37f423a`／GREEN `ad7cd83`；新測試 4/4，v2–v6、天命／資訊／模型盤點合跑 101/101。只覆蓋天雷門檻、選定死亡與神債回天、終局收尾，不等於完整 chance／full recall／跨夜模型；產品與平衡未改，發布資格仍 false。

X v7 進度（2026-09-24）：[跨相位回憶契約](../experiments/2026-09-23-destiny/model-contract-v7.md) RED `52187eb`／GREEN `b10af04`；新測試 6/6，v2–v7 與相關 suite 107/107。實際凍結 adapters 產出的五階段 observation/action 已串成單席歷史；未含 decision 間公開轉移，也未證 projection provenance。full recall 僅 partial，產品與數值未改。
X v8 進度（2026-09-24）：[投影來源與公開轉移契約](../experiments/2026-09-23-destiny/model-contract-v8.md)目前工作樹專項 22/22、v2–v8 與相鄰 adapter／盤點 suite 72/72；複核找到並修正跨決策物件事件選擇衝突、歷史未揭露／未提交卻前進、盯印或拍賣先記錄後才開事件，以及舊事件過期仍可結算／同輪重開。已補事件決策版本及先後綁定、決策節點動作綁定、事件揭露與先前動作提交檢查、單次解析／提交鎖與 freshness 回歸。拍賣只參與相位順序索引；其 action/state、完整 chance、其餘自動轉移、跨夜 restore／canonicalization、solver 未完成。產品與平衡未改，releaseEligible=false。

事件夜盯印時序補測（2026-09-24）：[配對診斷報告](../experiments/2026-09-24-mark-timing/report.md)，凍結來源下在乾淨 worktree 跑 10,000 組；首事件 9,999/9,999 相同，AI 至少一席換標 1,110/9,999 局；座位 0 勝率差 −0.06pp（95% −0.30..+0.18）。保留現行時序與係數，勝率方向不明，不作發布依據。正式 raw SHA256 `394e5ae656ec003bad45bebe273a35b06a43e83587067229681af412d9cd377b` 存於忽略版控 scratchpad。

來源稽核追加（2026-09-24）：正式天命 raw 的 `gitHead=2eb164d` 不是產品來源證明；產品 SHA 對上後來候選 `5bd3817`，而 runner 未驗 `productBaseline`。舊 raw 保留不改；新實驗先鎖 commit/hash 並要求乾淨工作樹。稀疏密函輸入與交接後隱藏 DOM 殘留已修，局部回歸通過；平衡與發布關口仍未通過。長時 SFX 驗證追加：目前測試驅動版本三 seed 完整長測 1/1 通過；原始間歇卡點仍未定位。

X fixtures 追加（2026-09-24）：[v2 六鏈／天命模型契約](../experiments/2026-09-23-destiny/model-contract-v2.md)固定 `d63f03e` 產品來源；TDD checkpoints `8e1af2b`／`d34dc99`。私函支持集、首次拍賣局部 restore、揭露前 replay 與逐席投影 fixtures 7/7 通過；與既有天命、資訊及舊契約盤點測試合計 61/61。局部 fixture 不等於完整 chance／snapshot／資訊集合，`sixOfFour=incomplete`、`releaseEligible=false`。下一個 X 工程是所有席位合法動作與 observation-history adapter；五人真人冷讀和 SFX 間歇原因仍待處理。

X 拍賣 adapter 追加（2026-09-24）：[v3 契約](../experiments/2026-09-23-destiny/model-contract-v3.md)；TDD checkpoints `84f92f7`／`8091039`。任一存活席位一般夜與押寶夜的密封提交可 lazy-enumerate，並以凍結 `resolveAuction` 結算小型 fixture；逐席拍賣 observation／本席歷史鍵遮蔽未揭資訊。新測試 6/6，合併 v2、天命、資訊和 v1 盤點回歸 67/67。其餘相位、異事選擇結果、跨階段 full recall、solver 均未完成；產品和平衡沒有變更，仍不發布。

| 日期 | 主題 | 目前狀態 | 下一句喚醒語 |
|---|---|---|---|
| 2026-09-24 | [六連鎖、天命與發布 Premortem](../reviews/2026-09-23-destiny-final-review.md) | 規格凍結、候選實作、普通／真版 10k 對照、焦點比較、雙虎／血祭逐件配對與千眼知情補充各完成 10k 配對；另備千眼雙尺寸畫面與真人冷讀記分表。X v2–v7 治具及天命／夜戰／資訊／模型盤點合跑 107/107；v6 僅局部轉移、v7 僅單席回憶 envelope。完整 chance、決策間公開轉移、跨夜 restore／canonicalization、terminal payoff／solver 仍缺。事件夜盯印時序已完成乾淨 worktree 10k 配對（見報告）；至少一席 AI 換標 1,110/9,999 局，座位 0 淨差 −0.06pp（95% −0.30..+0.18），保留規則。普通 H9 雙虎／血祭 fail、千眼 incomplete；焦點四鏈 fail／兩鏈 incomplete。SFX 間歇原因未定位；真人盲讀未做，不發布 | `/handoff 妖市：讀最終審視、v2–v7 契約與續作計畫；承接盯印時序配對結果，補公開轉移／完整 chance／跨夜模型，維持產品不調值、releaseEligible=false；先做真人冷讀及 SFX 間歇復現診斷。` |
| 2026-09-22 | [L1e 正式八臂量測工具與六之四模型契約](2026-09-21-l1e-formal.md) | 80,000 局長跑全數完成，H1 全過，使用者裁定選項甲（數值維持、H9 記已知診斷基線），本卷結案並發布 v0.57.37 | /handoff 妖市：v0.57.37 已發布，真機試玩三組連鎖手感。 |
| 2026-09-15 | [v0.57.12 六詛咒／全物品文字](../experiments/2026-09-15-curse-migration/README.md) | 已批准並實作六種效果／實物造型與正式戰力退役；b3ea547 已公開並核對送達；85 測試、300 幾何、201 手機詛咒、768 卡面、36 全物品與袋子修補通過；A1 原未過項保留 | /handoff 妖市：接 v0.57.12 手機回饋與 A1；先讀 CLAUDE.md、最新功能卷，保留 D2／D3。 |
| 2026-09-15 | [A1 v0.57.11 手機試玩](2026-09-15-a1-premium-table.md) | **最新交付**：aa7aa7b 已公開；根目錄 CLAUDE.md 與本卷已備跨工具續接；自動退鏡、頁籤與 3D 焦點及 A 向介面已實作。55 測試／1599 幾何通過；相對性能仍 RED、真機待回報 | /handoff 妖市：接 v0.57.11 A1 手機試玩；自動退鏡已批准，保留速度比未過與 D2／D3。 |
| 2026-09-15 | [總藍圖與A1精品牌桌開卷](../MASTER_BLUEPRINT.md) | **最新工作入口**：舊七章＋Astra內容已整併，A方向已裁，A1已實作；55測試與1599幾何通過，v0.57.11已公開，速度比仍RED。D2／D3／D5及原失敗項保留 | `/handoff 妖市：接總藍圖A1精品牌桌，A已裁、自動退鏡已批准；接v0.57.11手機試玩，保留D2／D3與原門檻。` |
| 2026-09-15 | [Astra 全遊戲初次檢視](../proposals/2026-09-15-astra-game-blueprint.md) | 初次提案留作沿革；A方向已由後續裁定採用，現行入口見總藍圖 | `/handoff 妖市：讀總藍圖與A1計畫，勿重問A方向。` |
| 2026-09-15 | [完整法寶卡與桌面盯印](2026-09-15-table-stamps.md) | 正式版基準：v0.57.10／eafec13；40測試、768卡面、256分配既有證據；玩家已回報整局通關，手機逐項與原失敗項仍保留。持續發布授權有效 | `/handoff 妖市：接總藍圖A1；v0.57.10為基準，連鎖／幽靈等D2／D3。` |
| 2026-09-15 | [3D揭盅與結果卡](2026-09-15-3d-reveal-and-retention.md) | 公開v0.57.8三人同槽、不跳過的推鏡／金光／結果卡證據已補齊；飛行模型碰頂仍待修。舊文待補／待選紀錄以最新收工入口覆蓋 | `/handoff 妖市：接公開揭盅飛行模型碰頂問題，先讀v0.57.10收工紀錄。` |
| 2026-09-15 | [轉場卷](2026-09-15-highlight-cuts.md) | 三種命中圖已齊，存活判斷已修，隨v0.57.9發布。舊文不可自行push限制已由使用者持續發布授權覆蓋 | `/handoff 妖市：轉場證據已齊，接v0.57.10手機回饋；連鎖／幽靈等D2／D3。` |
| 2026-09-15 | [盯牌縮放與後續驗收](2026-09-15-mark-scale-and-followups.md) | 縮放、tier1每拍短推、通用安全區已发布；B立牌已被v0.57.10平放印籌取代。有應公未過、P4真機待回報 | `/handoff 妖市：接v0.57.10手機回饋；保留有應公M-A1、P4未過與D2／D3待裁。` |
