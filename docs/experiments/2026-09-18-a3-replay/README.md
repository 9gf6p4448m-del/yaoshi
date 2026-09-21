# A3 S7 再玩研究（凍結 #11）——執行紀錄（2026-09-18 起，v0.57.33）

> **2026-09-21 現行 Q1 判讀（使用者批准 F1/F2 修補）**：依 [修補凍結](../2026-09-21-ledger-attribution/acceptance.md) 的 `loss-interval-v2`，原「某人／某拍品＝主因」已退役。選出非勝者淨失血最多的區間，再對照該區間完整拍賣支出與夜戰紀錄；玩家指出對應人／區間並說出至少一項可核對事件或累積損失，沒有與數據衝突即可；缺乏逐項紀錄時可明說不足，不能要求猜異事。單一物件名不再自動算過，也不能要求玩家把所有損失算給它。這衡量對失血區間與事件的理解，**不能證明全局唯一勝敗因果**。Q2、人數／局數、門檻、原話及 p1 已批准的截斷局例外不變。下文舊 Q1 單件判法為歷史，以本節為準。
>
> 新遊戲使用 v0.57.35。已玩 v0.57.34 的 JSON／原話仍保留，附原版本；對照工具顯示當前算法重建，不宣稱是玩家當時所見。不自動重玩、增局或改原話。新／舊版分列，若已有資料受舊敘事提示影響，收件時如實標記，不能無註記合併。


凍結：[2026-09-18-acceptance-a3-experience-slice.md #11](../2026-09-18-acceptance-a3-experience-slice.md)。計畫：[plans/2026-09-18-a3-experience-slice.md S7](../../../plans/2026-09-18-a3-experience-slice.md)。基準：v0.57.32（main `ffd5d04`）。

#11 原文要點（不重述全文）：使用者＋家人共 **3 人各 2 局**、手機、正式線上版、不預先講解規則；每局後立刻問兩題並記**原話**；Q1「這局主要輸／贏在哪」的判者是**主對話對照該局 JSON 的主因（口徑同 #9，`tests/ledger.test.mjs` 的 `mainCause`）**，不是玩家自評；Q2「下一局想換什麼打法」要說得出一個具體要改的動作；以人為單位、兩局取一；**兩指標各 ≥2/3 人**。結果不論好壞不改口徑、不加人、不加局。

## 前置工程（本 session，v0.57.33）：讓「每局 `S.history` JSON 落檔」在手機正式版做得到

v0.57.32 的遊戲**沒有任何匯出 `S.history` 的入口**（手機打不開 console）。#11 要求 JSON 落檔，所以先補一條純呈現的出口，不動引擎、不動結算：

- `index.html`：`replayExport(S)` 純函式（在 `reviewSummary` 之前）——只讀 `S`，回 `{kind:"yaoshi-replay", ver, seed, mode, players:[{id,dir,name,roleId,human,alive,life}], history:S.history}`；不重算主因（口徑留在測試檔）。`window.__yaoshi` 匯出。
- `index.html`：本局回顧標題列新增「**複製本局紀錄**」（`#rvCopy`，`copyReplay()`）：`navigator.clipboard.writeText` 成功→按鈕顯示「已複製 ✓」1.6 秒；剪貼簿不可用（舊 Safari、非安全來源、被拒）→ 在因果段上方攤開 `#rvExport` 唯讀文字框並全選，按鈕顯示「請長按全選複製」。不用 alert／confirm。
- `tests/replay-export.test.mjs`：seeds 1–10 真實引擎打完→打包→`JSON.stringify`→`JSON.parse` 貼回：history 逐值相同、`winnerOf`／`mainCause` 在貼回的資料上算得相同、`ledgerNarrative` 句子相同、同一局打包兩次逐位元組相同（無時間戳／亂數）、末壽命與引擎一致、活性（每局 ≥1 夜、十局 ≥8 局算得出主因）；靜態守「回顧頁有且只有一顆複製按鈕」「`copyReplay` 用 `replayExport` 打包、不用對話框、有文字框備援」。`YAOSHI_INDEX` 環境變數只供突變驗紅指到副本。
- `tests/tools/replay-export-probe.mjs`：headless 真實路徑實跑一局（solo、seed 3）到回顧頁，按 `#rvCopy` 讀回剪貼簿、再拿掉 `navigator.clipboard` 按一次走備援，兩條路徑內容都要 === `JSON.stringify(replayExport(S))`；南家 `human:true`、pageerror 0。
- `tests/tools/replay-judge.mjs <replay.json>…`：主對話判 Q1 的對照工具——印版本／種子／四家身分／勝者／主因（口徑 `mainCause`）／局末因果句；另印每位真人「自己跌最多的一夜與那夜的事」，**標明是補充、不是判準**（只為了對得上玩家原話在講哪一夜）。

### 機械閘（本 session 實跑）

```
node --test --test-reporter=tap tests/replay-export.test.mjs   → # tests 2 / # pass 2 / # fail 0
突變驗紅（YAOSHI_INDEX 指到改壞的副本）：
  A history 只帶 life 不帶 nights → not ok 1「seed 1 history 貼回後不同」
  B 回顧頁按鈕拿掉               → not ok 2「回顧頁要有且只有一顆『複製本局紀錄』」
  C 打包時塞 Date.now()+Math.random() → not ok 1「seed 1 同一局打包兩次要逐位元組相同」
  原版再跑 → pass 2 / fail 0
node tests/tools/trace-eq.mjs <v0.57.32 index.html> index.html → equal:true（seeds 1..20，346441 bytes 兩邊相同）
node tests/tools/replay-export-probe.mjs 3 → clip {equal:true,len:17087,btn:"已複製 ✓",taShown:false}
                                              fallback {shown:true,equal:true,btn:"請長按全選複製"}
                                              meta {human:[true,false,false,false],nights:12,ver:"0.57.33"} pageerrors []
node --test tests/*.test.mjs → 107 案：第一趟 105 過 2 紅（release-update 兩案＝VERSION／VERSION_NOTE 沒跟著 RELEASE_VERSION 一起 bump）→ 補 bump 後 release-update／ui-hierarchy／replay-export 7/7 綠、trace-eq 仍 equal；其餘 105 案（含 sfx-wiring seeds 1–3 本趟全過）在只差版本字串的檔上跑過，未重跑
```

## 研究規程（使用者側；照 #11 原文，本節只是操作步驟）

1. 手機開 `https://9gf6p4448m-del.github.io/yaoshi/`，首頁版本列要是 **v0.57.35**（不是就重新整理；PWA 舊快取要關掉再開）。
2. 三位玩家（p1＝使用者本人、p2／p3＝家人）各玩 **2 局** solo。家人**不預先講解規則**（遊戲內教學可看，人不教）。
3. 每局打到天亮或出局 →「看最終結果」→「本局回顧」→ 按「**下載本局紀錄**」→ 手機跳出分享面板就選「儲存到檔案」（或直接傳 LINE 當附件）；沒跳分享面板就是一般下載，檔案在「檔案 → 下載項目」。檔名 `yaoshi-replay-v0.57.34-seed<種子>.json`，六局檔名不會撞。
   （v0.57.33 的「複製本局紀錄」保留當備援，但**文字經 LINE 轉貼會被截斷**——2026-09-18 使用者第一局兩次貼回都斷在第七夜同一位置，單則訊息 10,000 字上限——所以正式收件只收檔案。）
4. **每局結束立刻**問兩題，逐字記原話（不潤飾、不追問引導）：
   - Q1「這局主要輸／贏在哪？」
   - Q2「下一局想換什麼打法？」
5. 交回主對話：六局玩完把六個 .json 檔一次丟給主對話（或放進本目錄），另附「哪個種子＝誰的第幾局」＋原話（六局合寫一份 `answers.md`，格式見下）。主對話依種子改名 `p1-g1.json`…`p3-g2.json` 落本目錄。
6. 主對話跑 `node tests/tools/replay-judge.mjs docs/experiments/2026-09-18-a3-replay/p*-g*.json`，逐局對照 Q1 與 `mainCause`；Q2 照原文判「說得出一個具體要改的動作」；填下表。

### 原話記錄格式（`answers.md`）

```
## p1-g1（誰：本人／家人甲／家人乙；日期時間）
Q1：「（原話）」
Q2：「（原話）」
```

## 裁定紀錄：p1 的 v0.57.33 截斷局不計（2026-09-18 晚，使用者裁「甲」）

- 事實：使用者本人第一局在 v0.57.33 用「複製本局紀錄」經 LINE 貼回，兩次都斷在第七夜（單則 10,000 字上限）；history 不完整，`mainCause` 算不出來，該局 Q1 無從判定。
- 主對話給的兩案：甲＝該局記「無完整 JSON、不計」，p1 在 v0.57.34 另打 2 局；乙＝該局算 p1-g1、Q1 記「不可判＝不過」，p1 只再打 1 局。**使用者裁甲。**
- 原標準為什麼要動、為什麼現在才知道：#11 要求「每局 JSON 落檔」，訂的時候不知道手機經 LINE 轉貼會截斷；該局不是「玩家答不出來」而是「紀錄工具壞了」，判不了不等於不過。
- 代價（如實記）：p1 比 p2／p3 多一局經驗，屬於**會讓 p1 通過機率上升**的改動，故走 §2.1 取得使用者針對這一條的同意；其餘 #11 條文（人數、每人 2 局、門檻 ≥2/3、判法）一字未動，p2／p3 不適用本條。

## 逐人逐局紀錄（#11 要求逐人逐局有紀錄；未填＝尚未進行）

| 局 | JSON | 勝者（口徑） | 主因（口徑） | Q1 原話 | Q1 判 | Q2 原話 | Q2 判 |
|----|------|-------------|-------------|---------|-------|---------|-------|
| p1-g1 | | | | | | | |
| p1-g2 | | | | | | | |
| p2-g1 | | | | | | | |
| p2-g2 | | | | | | | |
| p3-g1 | | | | | | | |
| p3-g2 | | | | | | | |

以人為單位（兩局取一）：Q1 ＿/3、Q2 ＿/3；門檻各 ≥2/3。判準：Q1「過」＝原話指到的人／夜／事與 `mainCause` 一致（人與事對即算，夜次說錯一夜不扣；只說「運氣」「出價太高」而不指到那件事＝不過）；Q2「過」＝原話含一個具體動作（「第一夜不押命標」「不要跟獵人搶」算；「不知道／隨便／再玩看看／小心一點」不算）。這兩句判法是 #11 的細化，送讀前寫死於此，不因結果改。
