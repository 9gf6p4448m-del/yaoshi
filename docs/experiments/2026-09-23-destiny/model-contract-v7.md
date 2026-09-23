# 六之四模型契約 v7：跨相位 full recall

日期：2026-09-24。狀態：**單席回憶 envelope partial；六之四仍 incomplete**。v2–v6 凍結產品治具保持不變；v7 把已存在的異事、盯印、放血、拍賣和請神選尊 observation／action 接成同一條有序歷史。

## 凍結來源與驗證

機器契約：[model-contract-v7.json](model-contract-v7.json)。測試：[l1e-full-recall-adapter.test.mjs](../../../../tests/l1e-full-recall-adapter.test.mjs)，adapter：[l1e-full-recall-adapter.mjs](../../../../tests/tools/l1e-full-recall-adapter.mjs)。來源仍固定為產品 `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`／blob `8ba772b9d960eff8b9c42eac77040433f809c57d`／SHA256 `8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d`。RED `52187eb`／GREEN `b10af04`。

六項測試把五種 schema/action 接成單席歷史，並有一條使用實際凍結引擎 adapters 產生 event→mark→sacrifice→auction→shrine-pick observation 的跨夜序列。它拒絕不同席位、phase/schema 不匹配、非法事件／盯印／放血／選尊動作和常見原始 engine state 欄位；穩定 key 受有序歷史內容影響，回憶資料會深複製並凍結。新測試 **6/6**；v2–v7、天命／夜戰／資訊投影與模型盤點合跑 **107/107**。

## 邊界

這個 envelope **沒有自行產生** phase observation，也沒有證明任一帶正確 schema 的凍結物件必定出自可信投影函式；auction action 在 envelope 層驗 schema／席位／形狀，完整合法提交仍由 v3 的動作列舉器負責。它目前不記錄決策之間的公開揭露／自動轉移，只將它們視為下一 observation 可見資訊的一部分。因此這是 full-recall 線路的一段，不是完整資訊集合等價證明。

事件夜盯印時序仍維持兩種實際順序：AI 在開盅前、真人在開盅後。這輪沒有量化對玩家結果的影響，也沒有改規則、產品 `index.html` 或平衡值。`information.fullRecall=partial`、`chance.fullGame=incomplete`、`state.snapshotRestore.crossNight=incomplete`、`sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false`。

下一步要把公開揭露及自動轉移納入歷史、將每個接受的 observation 綁回可信產生器，再做完整 chance／跨夜快照與 canonicalization。只有這些關口完成後才討論 solver 或遊戲修改。
