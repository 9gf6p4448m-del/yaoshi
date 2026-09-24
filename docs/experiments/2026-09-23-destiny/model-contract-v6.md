# 六之四模型契約 v6：自動夜戰與夜末／終局轉移

日期：2026-09-24。狀態：**選定路徑 fixtures；六之四仍 incomplete**。v2–v5 的密函、拍賣、異事、盯印、放血與請神選尊治具保持不變；v6 加入凍結引擎的自動戰鬥、夜末結算及終局收尾。

## 凍結來源

機器契約：[model-contract-v6.json](model-contract-v6.json)。測試：[l1e-battle-settlement-adapter.test.mjs](../../../../tests/l1e-battle-settlement-adapter.test.mjs)，adapter：[l1e-battle-settlement-adapter.mjs](../../../../tests/tools/l1e-battle-settlement-adapter.mjs)。載入器驗證產品來源 commit `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`、blob `8ba772b9d960eff8b9c42eac77040433f809c57d`、SHA256 `8ac04722a9e77f4ca6a2f28695080c74f793e393031c4fdbd533917f777fe23d`，並拒絕工作樹 `index.html` 偏離該來源。

TDD checkpoints：RED `37f423a`／GREEN `ad7cd83`。測試直接呼叫凍結版 `resolveBattles`、`settleShrinesEnd`、`stripEndgameItems` 與 `finalizeHistory`；adapter 只包裝結果投影，沒有重寫戰鬥或結算規則。

## 已驗證範圍

- 雷女之火天雷的固定狀態治具分別提供 `0.149999` 和 `0.15`，驗證引擎 `< 0.15` 分支邊界、一次擲值和對戰結果；沒有宣稱已窮盡同場多個雷女／虎爺反咬或全遊戲 chance tree。
- 夜末治具驗證詛咒 drain 到 0 的死亡旗標、無力支付神債時傳說回天、天明回血，以及 `recordNightEnd` 關閉夜紀錄並寫入壽命快照。
- 終局治具驗證神龕回天結清、標記 `endStrip` 的法寶移除、最終歷史壽命列，以及與 `endGame` 相同的存活優先／壽命排序。只報名次，不自創 solver 數值 payoff。
- 新測試 **4/4**；v2–v6、六鏈／天命／夜戰／資訊投影及模型盤點合跑 **101/101**。來源 hash 和測試 provenance 由 adapter 回報。

曾有一個夜末反例被治具角色設定污染：座位預設抽到「普渡爐主」，其被動會再扣出局者壽命。治具現固定 `human` 無被動角色，讓因果只涵蓋明確設定的夜末轉移；這是測試修正，不是產品修正。

## 尚未證明

這批是選定局面，不等於所有夜戰、死亡與夜末 hook 的聯合狀態空間。全面 chance 支持、跨相位 full recall、跨夜快照 restore／canonicalization、所有終局停止條件、效用函數、策略窮舉與 solver 獨立覆核仍未完成。事件夜盯印仍是 AI 開盅前、真人開盅後；尚未做配對量測，不能只依呼叫順序改掉單人資訊優勢。`sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false`；未修改產品 `index.html`、平衡值或發布門檻。

下一步先把同一玩家的事件、盯印、拍賣、放血、選尊觀察與行動串成跨相位歷史，再研究全局機率和跨夜快照。事件夜盯印的可能體驗補償須用固定策略／配對種子量測，不先改產品。
