# L1e 探索工具獨立覆審

2026-09-21，Astra。結論：**APPROVE 探索量測工具與本次 200 種子報告**；沒有未解 HIGH／MEDIUM。這不是正式 L1 平衡、H9 或六之四通過，也不批准發布。

## 範圍與判斷

讀取執行前契約、L1 計畫、水陸凍結與量測缺口、原 legend-gate H1/H9、GAME_DESIGN 六之四，並審查 `tests/tools/l1-balance.mjs`、測試及相關 `playPolicyGame`／splitter／CHAINS 呼叫端。最終主工具修補為 `f9be886`；量測執行版本為 `f8bf559`。相對本卷前 `d746a87`，`index.html` 沒有差異。

- 七臂沿用真實紙紮引擎及 CFG；只覆寫座位 0 的出價策略，角色固定青面攤主。每臂 seeds 1–200，原始結果全部保留。
- 追法每夜只選一個加價目標，配方完整或無材料時原樣返回 splitter；預算含買路錢，遵守筆數及保守上限。讀取範圍與防止對手袋子／未來市集存取的測試一致。
- 單組效果欄位停用涵蓋全四席，保留配方、id 與 aiBonus。千眼第二高價 UI helper 沒有被停用，但不在這個無頭策略使用路徑；文件已揭露，不能把零差異解讀為玩家情報無價值。
- winnerId 是唯一勝負依據；局末指 runner 停止點，不續跑玩家死亡後的 AI 殘局。持有者僅是座位 0 在此終點仍有指定完整配方；各臂條件分母不同，不作因果推論。
- 每臂相對 splitter 與每組 normal−zero 分別列明。正式狀態固定為 incomplete；樣本達 10000 也不會自動變成正式通過。

## 已修正事項

1. 初版只有各臂對 splitter 的配對差，容易與 normal−zero 效果差混淆。現已分列兩種比較，並加入手算非零、正負方向測試。
2. 突變治具轉置到暫存目錄後，runner 的 ROOT 指向非 Git 目錄，日誌混入 git fatal。原失敗日誌保留；`6a99846` 固定暫存 runner 的來源根目錄，新增相同轉置的 healthy 綠對照並排除基礎設施失敗。修補由另位 JS reviewer 覆核批准，本審不重複其專門覆核範圍。
3. splitter 沒有指定目標組合，原報告卻把 holder=null 聚合成 0；原始資料中基準席實有 66 局在終點持有至少一組配方，因此 0 會誤導。現以 targetChain=null 及 null／N/A 表示未量測目標持有率；回歸 RED `97a76e0` → GREEN `f9be886`。只從原 raw 重生摘要與報告，沒有重抽樣。

## 實際驗證

- 獨立執行 `node --test tests/l1-balance.test.mjs`：最終 **11/11 PASS**，含七臂真引擎重跑一致、三組歸零範圍、配對方向、分母與基準 N/A。
- 獨立以原 raw 重算 1400 筆：七臂各 200 個不重複種子 1–200；角色、勝局、holder 局數及勝局、條件勝率、對 splitter 差及 normal−zero 差均與最終摘要一致。
- 正常效果的水陸／千眼／雙虎勝率為 31%／36.5%／33.5%；同組 normal−zero 為 +0.5／0／−1.5pp。僅為本策略與種子集合的描述，不據此判定正式帶通過或調整遊戲數值。
- source SHA256 與未變動的 index.html 一致。原量測工具 hash 保留為 `788a2004604fdeb3e7b96c717bc7346d3e1c8da785f6967f9f3eb71a99f7bff0`；報告工具 hash 另列 `25df18dd665191f160cc3f3863e017372f2ca7976c9acbdf8f0f144903c83e55`，分開保存量測與重生報告的 Git HEAD。
- 原 raw 在報告修補前後 SHA256 均為 `cd42d3b3ecfcd1110dcc43f4073e0ef7d74cb977876dea6b653fd311c2b38911`，284590 bytes。原初版報告另封存。
- 證據摘要記錄原位與暫存 healthy 綠、兩種語意突變紅。最終核心覆蓋為 **6154/6515（94.46%）V8 UTF-16 source offsets**；只包含明列八個核心函式，含空白與註解，不是全專案、完整分支或輸出 formatter 覆蓋率。
- `git diff --check` 通過。未重做三組功能／視覺、玩家試玩或正式 10000 局；沒有重跑本次 200 種子模擬。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 open | 3 fixed |
| LOW | 0 | pass |

Verdict: **APPROVE — 探索工具及報告；正式平衡與發布閘門保持未完成。**
