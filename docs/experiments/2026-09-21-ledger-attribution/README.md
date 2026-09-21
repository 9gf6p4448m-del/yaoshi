# S5／S7 因果歸因修補（v0.57.35）

基準 `6b96087`／v0.57.34；使用者 2026-09-21「按照建議開工」。[凍結修訂](acceptance.md)保留原始驗收、讀者與真人紀錄，取代 #9／#11 的單件主因推定。

## 玩家與研究者看到的改變

原版 seed1：破軍旗實付 2 命，整夜淨掉 16 命，卻說「為破軍旗付出大半條命」。修補後先說哪一段壽命合計減少，再並列已記錄的拍賣支出與夜戰落敗，不將整夜淨變化強歸單件拍品。不再由局末死亡推成當夜「從此再沒站起來」；沒有對應夜紀錄時明說逐項紀錄不足。

`ledgerCause` 與研究 `mainCause` 回傳最大失血區間、snapshotIndex、完整 payments／fights；拍賣 cost 與夜戰 damage 各自保留。沒有對应夜紀錄的補快照回 interval、round=null，不創造夜次或異事。night 仍取非勝者最大淨跌幅、平手取較晚區間與較小座位；勝者口徑未改。

S7 對照工具列出原版本與修訂口徑 `loss-interval-v2`，區分單筆實付與整夜淨損；當前算法重建明標「非玩家當時所見」。真人原始檔不修改、不自動重玩或增局。Q1 衡量失血區間與事件理解，不能證明全局唯一勝敗因果；Q2 與三人兩局／≥2/3 門檻不變。

## 驗證證據

- 原版健康：既有 ledger 2/2（[baseline.txt](baseline.txt)）。
- 新回歸：五項 RED（[red.txt](red.txt)），初修後 ledger／回歸／匯出 10/10（[green-initial.txt](green-initial.txt)）。
- 研究工具：材料與版本語意 2 RED → 2 GREEN（[tools-red](tools-red.txt)、[tools-green](tools-green.txt)）。
- 覆審補抓零傷害敗戰：6 案中該案 RED → 6/6 GREEN（[zero-damage-red](zero-damage-red.txt)、[zero-damage-green](zero-damage-green.txt)）。
- 突變：單件 cost=drop、假出局時序、補快照編造夜次，三者均 exit1 被抓到（[mutations.json](mutations.json)）；原產品檔未改壞，以暫存副本注入。
- 原檔還原檢查：ledger／回歸／研究工具／匯出 13/13（[restored-green.txt](restored-green.txt)）。V8 執行範圍聯集：ledgerCause 99.14%、ledgerNarrative 95.31%、mainCause 94.46%（[範圍摘要](coverage-summary.json)、[原始範圍](coverage-ranges.json)）；這是修改函式的 source-range coverage，不冒稱整個專案 statement coverage。
- seeds 1–20 引擎 trace：346441 bytes，逐位元組相等（[trace-eq.json](trace-eq.json)）。
- 全套：115/116 通過（[tests-all.txt](tests-all.txt)，耗時 655.7 秒）；唯一 RED 為 sfx-wiring seed3 `driveUntil 卡住：開戰`，seed1／2 的封標 9／9、揭盅 26／26、受咒 7／5 通過。與 [S6 原有基準對照](../2026-09-18-a3-crowd/README.md)記錄的失敗相同；本輪音效檔、接線測試、對決檔零差異，原始引擎 trace 相等。保留已知 RED，不宣稱全套綠；不重測直到偶然通過，也不據此新增根因結論。
- 新口徑讀者 r1：仍用 2/5/8/11/14/17 六種子，三位互不共享上下文的 gpt-5.6-sol 讀者只讀材料，不讀答案鍵；六題每题勝者與失血區間 3/3，合計 6/6（[原始材料](reader-material-r1.json)、[答案鍵](reader-key-r1.json)、reader-r1-1/2/3.json、[評分](reader-score-r1.json)）。先前 Claude sonnet 六題過關紀錄原地保留；本輪模型不同與題意修訂已明示，不當等價重測。只驗理解，不驗證真正單一因果。
- 真實 UI 路徑 seed3：12 夜、6 句、sameAsPure=true、v0.57.35、pageerrors=[]，探針 exit0（[review-probe.json](review-probe.json)）。主責已開 [橫式圖](review-seed3.png)確認可讀、無水平文字溢出；[直式圖](review-seed3.portrait.png)是既有「請把手機轉橫」蓋板，屬預期限制，**直式 DOM 的 inViewport=true 不代表蓋板後的敘事可見**。本輪未放寬遊戲橫式要求。工具增補兩視口及 Range 檢查亦已獨立 JS 覆審核准。

## 獨立覆審

由 context-free Astra code reviewer 對產品 JS、測試、材料工具與研究判法做對抗覆審。三項 MEDIUM 已修：零傷害敗戰漏列、工具將 damage 標為扣款與凍結措辭不一致、缺夜紀錄卻斷言未發生事件。最終 APPROVE，無未解 HIGH／MEDIUM；覆審者獨立核心 7/7，最後局部差異及 diff-check 通過。

資料蒐證確認 `bids.cost` 是 onBidSettle 後扣款，`fights.dmg` 是 onBattle 後扣款值，history.life 為含其他增減與回復的夜末淨快照；三者不應互相替代。為避免與歸零截斷／淨值混稱，研究工具統稱夜戰「紀錄傷害」。

## 範圍與剩餘

只改回顧敘事、研究材料／對照、版本與必要測試／規程。未改規則、RNG、3D、模型、鏡頭、音效、演出時長或 S6 簽收；不重跑 3D 矩陣／效能／盲聽。S7 真人六局 JSON／原話仍待提供，A3 尚未整卷結案。

## 公開送達

2026-09-21 12:25（台灣），[Pages 部署](https://github.com/9gf6p4448m-del/yaoshi/actions/runs/35560761304)成功（e2f6eca）；HTTP200、VERSION／RELEASE_VERSION 均0.57.35，公開 HTML 正規化換行後與本機 SHA-256 完全一致，見 [published-delivery.json](published-delivery.json)。部署未完成時的0.57.34快照留 [published-pending.json](published-pending.json)。測試輸出僅正規化行末空白，數據與失敗內容未改。
