# 六之四模型契約 v5：盯印、放血與請神選尊

日期：2026-09-24。狀態：**局部動作治具；六之四仍 incomplete**。v2–v4 的密函、拍賣與異事 fixtures 保持不變；v5 加入單人模式真人席的盯印、獻祭放血和請神選尊。

## 凍結來源

機器契約：[model-contract-v5.json](model-contract-v5.json)。測試：[l1e-remaining-player-action-adapter.test.mjs](../../../../tests/l1e-remaining-player-action-adapter.test.mjs)，adapter：[l1e-remaining-player-action-adapter.mjs](../../../../tests/tools/l1e-remaining-player-action-adapter.mjs)。載入器驗證 `d63f03ecc6f9cb4ed2bbd6dd03c87757aec3bf7a`、產品 blob／SHA256 與工作樹檔案；只在測試插樁加入引擎入口，不修改產品程式。

## 動作與資訊

- **盯印**：單人桌的真人席可選不盯或當夜任一拍品。觀察包含目前拍品、玩家可見摘要、當前規則／異事、信譽提示及「哪些席位已落印」；不含 AI 落印的拍品索引，也不提前提供出價頁才出現的明夜拍品預告。之後的拍賣 observation 才包含公開的完整落印。
- **獻祭放血**：每次決策可選繼續到封標或再放一次血；能否放血由獻祭刀旗標、遞增成本與引擎壽命下限共同決定。每次動作都呼叫凍結引擎 `bleed`，記錄全席壽命變化，再重新列出下一步合法動作。
- **請神選尊**：只有引擎算出真人席為當夜合法得主時才產生決策；合法選擇是仍開著的傳說尊索引。選擇交給原 `finishShrines` 落地；觀察只列本席袋中同系件數，不讀其他人的袋子。

**時序差異**：產品 UI 的真人盯印在異事開盅後才出現，但 `drawMarks()` 先於異事結算，AI 落印因此使用異事前狀態。v5 保留這個當前產品順序，將它記為待量測差異，不自行把 AI 延後或修改玩家體驗。若異事改變玩家袋物／壽命，兩邊可能依不同資訊作決定；目前尚未量化其勝率影響。

放血 UI 可以和尚未提交的私有出價草稿交錯操作；v5 將放血序列正規化到複合拍賣提交之前，測動作合法度與壽命轉移，**不證明**任意草稿順序下的完整資訊集合等價。這也是部分治具，不能拿來宣告 solver 完成。

## 證據與限制

```powershell
node --test tests/l1e-remaining-player-action-adapter.test.mjs
```

測試核對盯印的「不盯／四個槽位」動作集、落印目標遮蔽、放血逐次成本與最低壽命，以及三個仍開放傳說的真人得主選擇。每個 Shrine fixture 使用一個指定合法選擇，非全部跨夜事件分枝；產品 `index.html`、平衡數值與 H9 門檻沒有變更。契約維持 `sixOfFour=incomplete`、`solverStatus=not-run`、`releaseEligible=false`。

仍缺戰鬥／死亡／夜末與終局轉移、獻祭與私有出價草稿的所有順序、跨相位 full recall、全局 chance、跨夜快照／canonicalization、完整終局 payoff、策略枚舉與 solver。真人冷讀及 SFX 間歇診斷也不由這批測試涵蓋。
