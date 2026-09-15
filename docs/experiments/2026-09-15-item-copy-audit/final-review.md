# 物品文案最終獨立覆審（2026-09-15）

範圍：aeb269a 之後的 index.html、curse-effects.test.mjs、item-copy-semantics.test.mjs、curse-effect-check.mjs 與 item-copy-check.mjs。未執行瀏覽器或修改產品。

## HIGH

無。差異沒有改 CFG、hook 實作、數值、出價或紙紮結算路徑；新增的 itemAbilityText、itemSummaryText 只產生顯示字串（index.html:5269-5294）。

## MEDIUM

無未解的產品或工具缺陷。

### 測試範圍（非發布阻擋）

all-items 工具刻意驗證 35 件物品在真實 renderer 中的來源身分、文案存在性、Range 可讀性與捲動安全區；它不宣稱逐項證明機制語意。機制語意由 23 項 ability、30 項 trait 的逐項人工對引擎稽核，以及 65 個單元測試補足。這是分工邊界，不要求再為 35 件重複建立自動 mechanic assertions。

## 通過事項

- 23 項 ABILITIES 與 30 個 TRAITS 的此輪新文案均未帶入可觀察的規則改動；紙紮數值和 hook 欄位未變。
- 純帳面能力的顯示分流正確：王爺劍、破軍旗、飼鬼甕、福壽綿長只以戰力評估說明，不宣稱改紙紮攻擊或詛咒件數（index.html:5277-5293）。
- item-copy-check 的預設本機 server 回應會逐位元組（正規化 CRLF）對照工作區 index.html（51-60）；卡片與詳情工具都拒絕 repo 外的 out 路徑（16-22）。
- item-copy-check 的詳情與袋子逐個建立 DOM Range、scrollIntoView 並檢查容器與安全區，這部分不是單靠 innerText（135-160、185-206）。
- curse-effect-check 對完整詛咒詳情使用 Range，捲入視窗後檢查每個裁切祖先與安全區，並在捲到底驗確認鈕（tests/tools/curse-effect-check.mjs:142-236）。
- 竹椅已明示電腦對手持有不公開，與 chairSeen 的人類且存活條件一致（index.html:976, 2685-2686）。
- 袋子總則已改為「每件非詛咒法寶各自召喚一隊；招式能否疊加依個別說明」，與逐件建隊和逐隊 trait 行為一致（index.html:3671-3680, 6674）。
- 「共鳴 N 拍」的標籤正確：unitRow 以陣營映射 N（3694-3704），紙紮共鳴只在同系該拍套用（3912-3915）；它不再把每拍都會攻擊的單位誤稱為只在 N 拍出手。
