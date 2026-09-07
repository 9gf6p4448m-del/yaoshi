# 驗收凍結檔：請神 2.0「神債暗標」＋神龕版面（2026-09-07）

基準 SHA：待填＝派工時的 main（切鏡 0.45 合併之後）。規格＝`docs/proposals/2026-09-07-legend-v2-debt-auction.md` §二（九條）。使用者裁定：採 2.0；請神夜固定 4／7／10、尊→夜每局洗牌並公開；版面依「北家正中、三龕搬進中央面板法寶卡上方、四家香火一行、盯上說明第二夜起收一行、修 19px 溢出、教學卡加請神」。VERSION 0.47（或派工時的下一號）。

## 範圍
- `index.html`：`makeState` 洗牌尊→夜；`resolveShrines` 改為請神夜結算（h 最高、同分風位順時針、h 全 0 回天）；移除擲骰／`INC_K`／`INC_PITY`／`shrineRollOrder`／天井文案；階段獎勵改以本龕最高 h 比例；一人一尊封籤鎖；供奉（夜末 −`INC_TITHE`，付不出回天、不重開）；AI 追價啟發式；神龕卡／規則頁／教學卡／回顧口徑；版面搬動與溢出修正；`CFG.SHRINE_NIGHTS`／`INC_TITHE`／`INC_MAX` 常數化。
- 治具：`tests/legend.test.mjs` 重寫（舊擲骰案移除、依 G5 新案）、`tests/tools/legend-gate.mjs` 改成 G0–G4、`legend-drive.mjs` 依新流程。
- **不動**：對決引擎、共鳴、心願、其他規則。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **G0 kill switch 雙向**：`?legend=0`（`LEGEND_ON=false`）下 `trace(1..20)` 與基準的 OFF 路徑逐位元組相等；預設開不等且 `S.shrines` 三龕各帶 `night∈{4,7,10}` 且互異。
- **G1 優勢策略（n=10000，六策略：splitter／greedy／hoarder／specialist／incenseMax／incenseNever／追價 AI）**：`incenseMax − splitter ≤ +5pp`；`incenseNever ≥ splitter − 8pp`；任一策略座位 0 ≤ 40%。基準（1.0）數字：incenseMax 33.68／splitter 22.96／incenseNever 15.77。
- **G2 活性**：≥80% 的局至少一尊被請走；供奉回天發生在 1%～20% 的局；三尊被同一人請走的局 = 0（一人一尊）。
- **G3 節奏**：預設 AI 桌局長中位 10～12 夜；三策略位移 ≤ ±2pp（相對 0.44 基準）。
- **G4 消耗戰**：每個請神夜，燒香總量前三名的平均投入 ≤ 9 壽命；落空者平均淨損（燒掉 − 階段獎勵退回）≤ 6 壽命。什麼實作會讓它紅：AI 追價沒有停損、三家互追到死。
- **G5 單元測試（對基準必紅在行為斷言）**：①請神夜 h 最高者得、同分風位順時針 ②h 全 0 回天且不重開 ③一人一尊：已請者的封籤被拒且 UI 鎖 ④供奉：夜末 −1、壽命 ≤1 時回天並移出袋 ⑤階段獎勵依本龕最高 h 比例 ⑥尊→夜洗牌用 `S.rng`、seed 固定可重現、三夜互異 ⑦OFF 路徑零 rng 消耗。
- **G6 Playwright（`legend-drive.mjs` 新流程，seeds ≥6）**：請走／回天／落空獎勵各至少一次；0 console error；**橫式橫向溢出 0**（本卷把 `#shrines` 溢出修掉，門檻回到 0）；直式蓋板行為不變。
- **G7 版面截圖（人眼，844×390）**：北家卡在頂端正中、西東對稱；三龕整排在中央面板法寶卡正上方、四家香火一行；盯上說明第二夜起一行；第 1 夜與請神夜前一夜各一張；10v10 對決截圖與 0.45 一致（不受影響）。
- **G8 文件與範圍**：GAME_DESIGN §五請神段改寫＋changelog；GUIDE 新一節（含「1.0 擲骰已移除，別回頭引用」）；ART_BIBLE 不動；`git diff --stat` 只含上述檔。

什麼實作會讓 G1 假綠：拿掉 incenseMax 策略或改它的定義；量法固定用 `legend-gate.mjs` 現有策略池加「追價 AI」。什麼實作會讓 G4 假綠：把落空獎勵調高到補足損失（那會反過來讓 G1 紅——兩條互相牽制，訂的當下已確認）。
