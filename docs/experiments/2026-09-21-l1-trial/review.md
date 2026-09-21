# L1 試玩候選 Astra 覆審

審查基準：`5b73313`；最終程式核對至 `b42141a`，並閱讀本輪瀏覽器驗證工具及原始證據；已閱讀 `acceptance.md` 凍結契約。範圍涵蓋三組整合、千眼公開資料快照、熱座私有提示、融合來源、撕甲與反傷、AI 正式紙紮模式，以及試玩入口。水陸先前已證規則未重做。此紀錄不代表正式發布平衡或美術盲讀通過。

## 已修正發現

| 等級 | 位置 | 具體問題 | 覆核 |
|---|---|---|---|
| P2 / MEDIUM | `index.html` 的 `bagPreviewHTML` | 袋子依序為 nail、other、tiger 時，融合列原依配方第一個材料 tiger 的位置顯示，與 `buildArmy` 插在最早材料位置的規則不同。 | `c2ff20a` RED → `9181491` GREEN；改以 `Math.min(...s.indices)` 定位，逆序案例已加入測試。 |
| P2 / MEDIUM | `index.html` 的 `.chainAwaken` 與兩處通知模板 | 原只有單菱形與整串材料字距收縮，未落實凍結的雙材料合攏及同心方陣。 | 已閱讀修補：兩個材料 span 分別由左右移入；兩個同心方框；reduced-motion 使用靜態。親開 eyes 第二夜圖可見兩層方框。 |
| P2 / MEDIUM | `tests/tools/l1-practice.mjs` 與 `l1-playtest.html` | 千眼練習指引原將 eye/bell 稱作陰陽眼銅錢／引魂鈴，與實際材料不同。 | 已改為祖靈之眼／千里眼銅鈴，兩處一致。 |
| P2 / MEDIUM | `tests/tools/l1-playtest.html` 的入口浮層 | 初版左上遮住明夜預告；移右上後又遮正常局神龕。 | `b42141a` 遊戲中隱藏常駐浮層，工具頁包裝 `openHelp`，在既有「？」視窗加入返回選單與練習標示；iframe 尺寸不變。已親開最終正常局、help、返回選單三圖，神龕完整，返回按鈕可用。 |

## 核心程式核對

- `chainsCompletedBy` 使用本人的非詛咒材料，已生效組合及副本不再加價。正式 `PAPERWAR_ON=true` 實跑：bonus 0→2 時 water 出價 4→6、eyes 4→6、twinTiger 2→4；已有整組時副本出價皆不變。紙紮估值原有的對手袋子讀取未在本輪擴增為新的連鎖決策。
- 千眼由開標 hook 後的 `rv` 建立僅含原始 `amt` 的公開快照；`showEntries=false`、不足兩筆、沒有有效組合皆不輸出第二高；並列 8、8、4 回傳 8。沒有保存尚未開標的出價或標書型態。
- 私有袋子限定當前活著的真人操作階段；交棒及開標先關閉袋子 modal，移除 chainHint、chainStatus、chainAwaken。既有瀏覽器測試含對手袋子不顯材料與交棒清場。
- 融合只替換首件有效 tiger/nail，保留材料、額外副本及非部隊被動。戰報名稱改讀 `buildArmy.sources`，避開融合後索引錯位；單件卡仍走單件部隊。
- 撕甲和無視吸收分成獨立欄位。雙虎直接傷害 9、全額濺射 9；送王船吸收後為 5。反傷呼叫未傳入攻擊者旗標；另以雙虎注入 armor:2 對 thorn 的鑑別案例實跑，三拍反傷均為 1，未繼承 armorPierce。
- 實跑 `node --test tests/l1-ui.test.mjs tests/l1-tiger.test.mjs`：5 tests 通過。上列正式紙紮 AI 與反傷案例亦實跑通過。測試不是正式平衡樣本。
- 已閱讀更新的完整驗證原始報告：15/15 tests 通過，清空 CHAINS 的 seeds 1–20 對 `de471a2` trace 495,019 bytes exact equal。V8 source-range 覆蓋分母為五支函式的 2,172 個非空白 UTF-16 source positions，命中 2,131（98.11%），不是 UTF-8 byte coverage。
- 本輪兩個語意突變均有原始失敗紀錄：移除千眼 `showEntries` guard 後測試得到 5 而非 null；停用撕甲 guard 後雙虎傷害 7 而非 9。兩者皆 exit 1；健康版本 exit 0。

## 視覺與入口範圍

已親開 asset/hero.png、asset/stage-lit.png 與 l1-trial-ui 三個尺寸截圖。新虎可辨長身四足、尖牙、金護肩、黑金配色，舞台金色比重較強，仍可作實際試玩候選；未宣稱 context-free 盲讀通過。390×844 維持轉橫提示。現有 market 圖走 table3d=0，asset 舞台圖是獨立舞台，不能代替預設 3D 正式戰鬥接線驗收。

入口為獨立工具頁；練習重載 iframe 後注入固定材料及拍品，正常隨機局重新載入原遊戲。已核對練習標示與匯出 `practice` metadata，避免預置局被誤讀成一般平衡結果。

已親開預設 3D 的 tiger 正式戰鬥入場及第二夜圖，單尊新虎、戰報名稱與部隊數一致；JSON 中 `twinTiger.glb` HTTP 200，無新增 pageerror／404。千眼第二夜 JSON 顯示三件預告及公開第二高 3；圖中可見新通知和提示。

缺件恢復已讀原始證據並親開新圖：真人第一夜自然取得第二件、走完整戰鬥後，治具明示 test-only fixture 移除 nail，第二夜正常開標進戰。實際 `restoredFigure` 為 `ab:tiger`、`ready:true`、`visible:true`，材質沒有 `shoulder_gold`，`tiger_c.glb` HTTP 200；單件原虎已恢復。此注入不是玩家操作或自然失去材料的宣稱。

已讀六組最新瀏覽器結果：water／eyes／tiger 的 844×390、tiger 的 1280×720、eyes 的 390×844、normal 的 844×390 皆 pass，無新增 pageerror／404／水平溢出；直式 rotate true，正常局保留 12 夜。正常隨機局初次 probe timeout 的原始 JSON 已保留，讀取 disabled 按鈕舊標籤的競態已改為先等待可用再核對 expected label；新版正常局走到第二夜。初次失敗未記種子，不能宣稱重跑相同 seed；這是證據限制，不把初次紀錄刪除。

最終入口改動後的五組 smoke JSON（water／eyes／tiger／normal 844×390，以及 tiger 1280×720）皆 pass，無新增 pageerror／404／水平溢出。已親開 `normal-844x390-smoke-market.png`、`normal-844x390-smoke-help-modal.png`、`normal-844x390-smoke-returned-menu.png`，確認神龕與主鈕完整，原生規則視窗仍可讀，`helpReturn:true`。390×844 的最終轉橫提示圖亦已親開。較早含浮層圖只保留為歷程，不作最終版面通過證據。

試玩段落無待修阻擋。仍待使用者實際回覆補件提示、觸發辨識、黑金虎將造型、替換清晰度與操作感受；正式六之四／n≥10000 平衡及美術盲讀未通過，不以本輪候選覆審代替。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 open | 4 fixed |
| LOW | 0 | pass |

Verdict: APPROVE — 放行獨立 L1 試玩候選與正常隨機局入口；無開放 P1／P2 缺陷。此結論不包含正式發布平衡、美術盲讀或使用者試玩簽收。
