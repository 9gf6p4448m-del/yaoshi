# A3 S5 因果短敘事（凍結 #9）——執行紀錄（2026-09-18，v0.57.31）

凍結：[2026-09-18-acceptance-a3-experience-slice.md #9](../2026-09-18-acceptance-a3-experience-slice.md)。計畫：[plans/2026-09-18-a3-experience-slice.md S5](../../../plans/2026-09-18-a3-experience-slice.md)。基準：v0.57.30（main `553cac7`）。

## 交付

- `index.html`：`ledgerNarrative(H,P)` 純函式（在 `reviewSummary` 之後）——只讀 `S.history`，回 `{winner,cause,lines:[{text,evRef}]}`，3–6 句：①誰活到天亮 ②「這一局的分水嶺」（主因）③勝者最大的一注 ④毒標一句（有才出）⑤出局名單（有才出）⑥請神一句（有才出且不超過 6 句）。夜次用國字（第五夜），句子不帶任何數字。`showReview` 在「本局回顧」標題下新增「這一局的因果」段（`.rvLedger`）。`window.__yaoshi` 匯出 `ledgerNarrative`。
- `tests/ledger.test.mjs`：**口徑函式 `winnerOf`／`mainCause` 在這裡**（讀者材料工具 `LEDGER_IMPORT_ONLY=1` 動態 import 同一支）；seeds 1–20 機械閘；邊界合成（補快照、無毒標、空局、全員出局）。
- `tests/tools/ledger-material.mjs`／`ledger-score.mjs`：讀者題產生與評分（每題＝敘事句＋四人名單＋四個候選事件，答「誰贏」「主因第幾個」；候選＝真主因＋同局其他公開事件當干擾項）。
- `tests/tools/ledger-probe.mjs`：headless 真實路徑實跑一局到「本局回顧」，量 `.rvLedger p` 句數、與純函式逐字相同、pageerror。
- `tests/tools/lines-material.mjs`：S4 留下的缺陷修掉——毒標交易「塞人／被塞」雙面紀錄共用 `txn`，清單只列一條、答案鍵兩面都算對（重生 14 題驗證：poisoned 題清單只剩合併後一條，見下）。

## 主因口徑（凍結 #9 的細化，寫在 `ledger.test.mjs` 同一函式）

- 勝者：末筆壽命 >0 者取最高，同分座位序小；無人存活取最晚歸零者。
- 主因：勝者以外「單夜跌幅」最大的人與夜（`life[k-1]-life[k]`）；同分取較晚的夜、同夜取座位序小。那一夜裡「那件事」＝該人**付了壽命的拍賣取實付最高者**（實付同額取 `auction[]` 序號小）→ `kind='pay'`；該夜沒付拍賣取輸掉的夜戰 `fight`；都沒有記 `event`；補快照那段一律 `event`。
- 凍結原文只寫「同夜取 `auction[]` 序號較小者」，未寫先取實付最高——本卷細化為「先實付最高、同額才看序號」，理由：主因要對得上真實因果（1 命的小標排在 10 命的大標前面時，序號規則會點錯件）。這是細化不是降標：口徑任何一種定義對讀者題的難度相同（讀者只看敘事，測試與敘事共用同一函式）。

## 機械閘（凍結 #9 機械項）

```
node --test --test-reporter=tap tests/ledger.test.mjs   → # tests 2 / # pass 2 / # fail 0
  診斷：cause kinds {"pay":20,"fight":0,"event":0,"none":0}  evRef types {"dawn":20,"pay":20,"win":20,"poison":18,"death":20,"shrine":20}  no-poison games: 2（seeds 15、19 之外另有 26／29 在 21–40）
node tests/tools/trace-eq.mjs <v0.57.30 index.html> index.html → equal:true（seeds 1..20，346441 bytes 兩邊相同）
```

- 鑑別力探針（不是正式閘）：把產品端 `ledgerCause` 的「取實付最高」突變成「最低」，20 局有 **8 局** cause 與口徑不符（測試會紅）；真版 0。
- `fight`／`event` 型主因在 seeds 1–20 沒自然出現（出價實付主導單夜跌幅），只有合成邊界（補快照 → `event`）量到；記為已知，不加 seed 硬湊。

## headless 真實路徑（seed 3，`ledger-probe.mjs`）

第 1 輪文字：12 夜、`.rvLedger` 6 句、與純函式逐字相同、段標「這一局的因果」、`RELEASE_VERSION 0.57.31`、pageerror 0（截圖 `review-seed3.png`）。第 2 輪改寫後重跑：同 seed 12 夜、6 句（「這一局的分水嶺在第五夜：西家・閭山法師 為「送王船」付出一大截壽命，從此再沒站起來。」／「毒標也沒少：第一夜 …」）、`sameAsPure:true`、pageerror 0（截圖 `review-seed3-r2.png`）。

## 讀者（凍結 #9：3 位只看敘事答「誰贏、主因」，≥2/3，最多 2 輪）

材料 `reader-material-r*.json`（seeds 2／5／8／11／14／17 六局），答案鍵 `reader-key-r*.json`（勝者＝`winnerOf`、主因＝`mainCause`），讀者＝3 位 fresh sonnet（只准讀材料檔），評分 `reader-score-r*.json`。判準：每題勝者與主因**都**對的讀者 ≥2/3，六題全過。

| 輪 | 勝者 | 主因 | 每題兩者皆對 | 結果 |
|---|---|---|---|---|
| r1 | 18/18 | 6/18（只有 g05） | 1/6 | **未過** |
| r2 | 18/18 | 18/18 | 6/6 | **過** |

- r1 失敗原因（三位讀者 notes 一致）：毒標句「**最狠的一手**在第 n 夜：…」是全段唯一帶判斷詞的句子，讀者一律把它當主因；主因句「X 在第 n 夜為「item」付出大半條命」沒有標記自己是主因。g05 過只因為候選裡對不上那句毒標。
- r2 改寫（只改措辭，口徑、seeds、候選、讀者數都不變）：主因句改「**這一局的分水嶺在第 n 夜**：X 為「item」付出…」；毒標句改中性「毒標也沒少：第 n 夜 A 把「item」塞給了 B」。三位讀者 notes：六題都由「分水嶺」句直接對到候選，無「看不出來」；一位提醒 g03 主因者「元氣大傷」未出局、敘事沒交代其去向（設計如此：主因者不一定死）。
- 附帶發現（r1 讀者）：「請下傳說尊」句點名的常不是贏家，可能誤導「拿到尊的人＝贏家」——本輪勝者 18/18 未受影響，記錄不改。

## 範圍（`git diff --stat` 對 553cac7）

`index.html` +89/−3（敘事函式、回顧段、CSS、匯出、VERSION）、`tests/tools/lines-material.mjs` +13/−3（雙面合併）；新檔 `tests/ledger.test.mjs`、`tests/tools/ledger-{material,score,probe}.mjs`、本目錄。規則與引擎零改動（trace equal）。
