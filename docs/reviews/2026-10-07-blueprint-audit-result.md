# 妖市藍圖整理：執行結果（2026-10-07）

任務來源：[交接任務](../handoffs/2026-10-07-blueprint-audit-for-claude.md)（使用者：「整理藍圖內容，看看有沒有矛盾，或是需要調整與優化的地方，讓 Claude Code 處理執行。」）。執行者：Claude Code，在隔離工作樹 `C:/Users/shung/wt/yaoshi/blueprint-audit-20261007`，分支 `docs/blueprint-audit-20261007`。

## 結論

B01–B10 十項都已處置：九項依現有來源同步了文件，B06 確認兩處講的是同一條 `collectEffects` 收集鏈，所以在舊表上方加了現行順序框，原表保留。這次只修文件，沒有改產品碼、凍結／acceptance 檔、素材、harness 或憑證，也沒有合併 main、push 或發布。所有簽收未過、暫緩、已知限制都照原樣保留；沒有證據的演出項標成「部分」或「未確認」。

- 基準：`git rev-parse HEAD` 與 `origin/main` 都是 `85c38c6a9186685d37ab266cfd32e2bbf5afb5fa`（v0.62.5），開工時工作樹只有交接檔一個未追蹤檔。行號已在這個基準上重新核對，沒有照交接檔的舊行號機械改字。
- 本次只確認 Git 狀態，沒有核對公開網站或 Safari 真機，文件裡寫到版本的地方都註明了這一點。
- 凍結驗收：動手前寫在 `scratchpad/acceptance-blueprint-audit-20261007.md`（被 git 忽略，所以全文抄在本報告附錄 A）。

## B01–B10 逐項：原衝突 → 來源 → 修正／保留 → 驗證

行號是改動後的位置。

| ID | 原衝突 | 來源（現行檔核對） | 修正／保留 | 驗證 |
|---|---|---|---|---|
| B01 | 總藍圖 §0 與 CLAUDE.md 仍寫 D2／D3／D5 未裁 | `MASTER_BLUEPRINT.md` §6 D2 列（09-21 批准）、D5 列（09-17 已裁）；§0 第 9 題 ⑨ | `MASTER_BLUEPRINT.md:9`（新增 10-07 現況段）、`:17`（D 句改寫，並註明原句已被覆蓋）；`:98–102` E01–E05 改為 D5 已裁、流派內容留 E1 待裁；`:137` N02 寫明通關只解鎖殘卷；`:181` Top3-2；`:274` D2 列補記六組擴充的來源、`:277–279` D6–D8 標待裁、`:282` 局部 D 編號說明；`CLAUDE.md:1`、`:60`（含 D8）。**D3 保留待裁** | 附錄 B 的「待裁保留」檢查；fresh read-back 第 2 題 |
| B02 | 六鏈已發布，但 §3.3 L01／L05／F03／F11 仍寫未實作，§3.7 寫先 3 組只是建議 | `index.html` `const CHAINS`：water／eyes／twinTiger／bloodOath／godKing／eternalFlame 共六組；`chainHintHTML` 用 `chainsCompletedBy`；`chainAwaken` 是 1.5 秒私有覺醒提示；`startBattle` 的 `chainBanner`；`js/table-tray.js` `chainMarks`；L1 試玩凍結第 31 行寫「既有演出時長與鏡頭不變」；`handoffs/INDEX.md` v0.57.41 發布段 | `:115–118` L01–L04 改為已實作，附上 H9／真版／X 限制；`:119` L05 改「部分」，金光引線的形式標未確認；`:122` F03 改「部分」，3D 浮空碰合／法陣標未確認；`:130` F11 改「部分」，騰空合體／震屏標未確認；`:178` Top2-2；`:226` L1 列加「引線／破陣屬部分」 | 用 grep 找過關鍵字（`連鎖破陣\|碰合\|法陣\|震屏\|騰空\|合體`），找不到 3D 演出實作，所以標未確認，沒有推定成已完成 |
| B03 | N01 寫未實作章節，但 v0.58.0 已上線首三章 | `docs/experiments/2026-09-25-n1-nightwalk/README.md:9–12, 25–30`；CLAUDE.md v0.58.0 段 | `:136–138` N01 改「部分」、N02 改首 3 章已實作、N03 改「部分」；4–10 章未做；#10 文案簽字、#11 實機第 1 章保留暫緩 | 實跑 `node --test tests/nightwalk.test.mjs` 18/18 通過（附錄 B） |
| B04 | README 停在 09-02／v0.10；CLAUDE.md 與 INDEX 的最新入口停在 v0.59.3；INDEX 同時寫 v0.59.2「已發布」與「未發布」 | `git log` 第一筆是 `85c38c6a` v0.62.5；`index.html` `RELEASE_VERSION="0.62.5"` | `README.md:20–24` 新增 10-07 狀態，舊段標為沿革；`CLAUDE.md:1` 新增 10-07 入口，`:3` 把 10-01 段標為沿革；`INDEX.md:1` 新增入口，`:3` 標沿革，`:7` 把 09-30 未發布那段標成已被覆蓋。三處都註明「只確認 Git」 | 本地連結檢查（附錄 B） |
| B05 | 雲端接手包 :16–17 已記押寶面板收合與窄畫面修好，:31 與 CLAUDE.md 卻仍列待裁 | `2026-10-01-cloud-to-local.md` 10-01 補充；提交 `88e4dd48` | `2026-10-01-cloud-to-local.md:3` 加覆蓋指路，`:33` 第 5 項劃掉「待使用者裁定」；第 6 項的使用者原因已記錄，但桌上 3D 法寶是否算鑑賞入口標未確認；第 1 項經實跑已解決；第 2 項引用提交訊息裡的 472/472（本次沒重跑全套）；第 3、4、7 項仍待驗；註明 D1／D3／D5／D7 是提案的局部編號。`CLAUDE.md:3` 同步 | nightwalk 18/18；`git log f8bcd0cb..85c38c6a -- docs/experiments/2026-09-28-appraise-c` 最後一筆是 `c9ecfdfa`，之後沒有補跑量測的提交 |
| B06 | ARCH_SPEC 開頭寫角色→道具→連鎖→心願→夜規→異事，§2 舊表只有角色→道具→夜規→異事 | `index.html` `function collectEffects`：`role();items();chains();` 之後是 wish→nightRule→event；`itemsFirst` 時為 `items();chains();role();`；`HOOK_ORDER={onNightEnd:"itemsFirst"}`；全域 hook 用 `p=null` | **確認是同一條收集鏈**。`ARCH_SPEC.md:66–72` 在舊表上方加現行順序框（含傳說法寶的 `eff` 與啟動中的真版天命 effect），舊表保留為 v1 原契約；另外說明 §3.10 的夜末流程是另一層，hook 那一步的內部順序照 itemsFirst。IMPLEMENTATION_GUIDE `:179`、`:685` 加指路。產品順序沒動 | 逐行對照程式（行號會漂移，以符號名為準） |
| B07 | §5 簡表的「完成」容易被讀成全綠 | §5 原表、A1／A2 結案卷摘要、INDEX 發布裁定 | 新增 `:252` §5.1 四軸現況表（實作／發布／品質驗收／待裁待驗）；`:219` 在 §5 表前說明「完成＝卷結案」。表中保留 A1 未解五條、A2「2 過／3 簽未過／1 已知」、A3 S6 簽未過與 S7 未通過、L1 的 H9／真版／X、N1 #10／#11 暫緩 | 限制字串計數：改後不少於改前（附錄 B） |
| B08 | §5 P0 寫「可在 A1 後研究」，§6 D3 寫延到 A3 後；共享多人契約與幽靈原型混在一起 | §0 09-17 第 ⑧ 題、§6 D3 列；§4 A09／A10／A11 | `:227` P0 列改依 ⑧，並把「①共享多人契約（A10，好友房和天梯都需要的正當前置）」和「②幽靈分岔反例與原型（A09／A11，只服務 D3）」分開寫；依賴圖 `:243` 改成 A3→P0。P1／P2 產品形式仍待裁，P0→P1 的依賴沒有刪 | read-back 第 3 題 |
| B09 | IMPLEMENTATION_GUIDE §6.4 寫範例可以直接照抄，§7 卻說歷史基準不能當 oracle；開頭還停在 v0.5 | `IMPLEMENTATION_GUIDE.md` §7 正式規程；`tests/tools/trace-eq.mjs` 檔頭說明 | `IMPLEMENTATION_GUIDE.md:3–5` 加現行入口框（v0.5 的敘述已過時、`js/` 模組、trace 契約：純演出必須逐位元組相等，規則／數值改動依該卷凍結檔）；`:508` §6.4 加歷史警告，`:538` 把「可以直接照抄」註明只適用當時。§2.2 的「baseline 唯讀」與 §7 內文沒動 | 連結檢查；read-back |
| B10 | 總藍圖 A3 仍列暫緩，但再玩規程已記 09-25 恢復 | `docs/experiments/2026-09-18-a3-replay/README.md:3`（恢復、v0.57.42、新舊分列）、`:69–75`（收件表空） | `:225` A3 列補上 09-25 恢復、新局 v0.57.42、與舊資料分列不混算、收件表仍空、#11 仍未通過；§5.1 A3 列同步 | read-back 第 2 題 |

## 本次沒有改、留給使用者裁定的提案

以下是交接 §3 的建議和本次發現，**都不是已裁條款**，文件裡沒有寫成已裁。

1. **單一現況表要不要取代沿革段**：§5.1 已經是四軸摘要，但 CLAUDE.md 和 INDEX 仍保留很長的沿革段落。選項 A：維持現在這樣，沿革標註後原地保留（本次做法，好追溯）。選項 B：把沿革移到 `docs/handoffs/` 的歷史檔，入口只留一段。B 比較好讀，但會動到很多檔的連結。
2. **先驗理解，再擴內容的優先序**（交接 §3-4）：新手理解、夜戰來源與對象、手機長局恢復，排在第 4 章以後與新特效之前。這是排序提案，不會重開已簽未過的項目。
3. **鑑賞頁 ≠ K04 圖鑑**：已發布的鑑賞頁不代表 K04 跨局收集、民俗故事和持久化做完了；K01／K02／K03／K05 照原本待裁。
4. **上架最低交付**：`GAME_DESIGN.md:493` 已定首版是 AI＋同機熱座，`:495` 定以上架為終點，這兩點不重問。R1 列到 L1／N1／E1／P1／P2，但 N1 的 `yaoshi_nightwalk_v1` 是本機存檔，不是跨裝置進度契約。如果要把好友房或跨裝置進度放進上架首發，需要另外比較成果、代價與前置再裁定。
5. **L05／F03／F11 原案演出**：金光引線的連線形式、雙法寶浮空碰合／法陣、雙虎騰空合體／震屏都沒找到實作證據。要不要補做、或正式改成「現行私有提示＋橫幅就夠」，需要使用者（及 Astra 視覺裁定）決定。
6. **INDEX 原本就有的斷鏈**：`docs/handoffs/INDEX.md` 最後兩列連到的 `2026-09-15-highlight-cuts.md`、`2026-09-15-mark-scale-and-followups.md` 在基準 `85c38c6a` 的 Git 樹裡就不存在（可能只在主 checkout 未追蹤）。本次沒有改這兩條，要找回原檔還是改指向卷報告，請使用者決定。
7. **允許清單外的文件**：`GAME_DESIGN.md` 和 `ART_BIBLE.md` 本次沒讀全文也沒改；其他 `docs/proposals/*` 的過期狀態也沒逐份掃。建議下次整理時，以「被入口直接連到的檔」為範圍再查一輪。

## 驗證

見附錄 B（實際指令與輸出）與附錄 C（fresh read-back 紀錄）。

## 附錄 A：凍結驗收（動手前訂定，原文）

（見 `scratchpad/acceptance-blueprint-audit-20261007.md`，內容抄錄如下）

1. 變更範圍只能落在 7 個允許檔加上本報告（交接原文另外以獨立提交加入）。
2. `git diff --check 85c38c6a` 退出 0、沒有輸出。
3. MASTER_BLUEPRINT 改前出現的每個 ID 改後都還在。
4. 限制字串（「P4 8 支」「M-A1」「簽未過」「我方單一」「#11」「H9」「真版平衡」「暫緩」「X」「待裁」）改後仍找得到。
5. 七檔加本報告的相對連結都指向存在的路徑。
6. B01–B10 每項都有「原衝突→來源→修正／保留→驗證」與新行號。
7. fresh read-back 沒有偏離，或偏離已修正。
8. D3、D6、D7、D8、E1、P1/P2 產品形式、K01–K06 仍標待裁。

## 附錄 B：驗證指令與實際輸出

**凍結條件第 4 條的修正（照例外條款自行修正、事後回報）**：條件裡的「真版平衡」和「X」兩個字串，在改前的 MASTER_BLUEPRINT 本來就是 0 筆（真版限制原本只寫在 INDEX 與 CLAUDE.md），所以這兩項無論文件怎麼改都不可能「仍在」，屬於恆假條件。修正方式是改成檢查實際寫進去的限制文字「未達設計目標」「X 改列非阻塞／X 非阻塞」（改後各 ≥1）。原本的 8 個字串仍照原樣比對，這個修正不會讓抹掉限制的版本變成通過。

1. 基準核對
   ```
   $ git rev-parse --show-toplevel HEAD ; git log -1 --format=%H origin/main
   C:/Users/shung/wt/yaoshi/blueprint-audit-20261007
   85c38c6a9186685d37ab266cfd32e2bbf5afb5fa
   85c38c6a9186685d37ab266cfd32e2bbf5afb5fa
   ```
2. ID、限制、待裁、連結（腳本 `verify.py` 放在本次工作的暫存目錄，不入版控，以 `PYTHONIOENCODING=utf-8 python verify.py` 執行）
   ```
   [ID] before 90 after 90 missing: none
   [limit] 'P4 8 支' before 1 after 1
   [limit] 'M-A1' before 7 after 8
   [limit] '簽未過' before 4 after 6
   [limit] '我方單一' before 1 after 2
   [limit] '#11' before 1 after 6
   [limit] 'H9' before 1 after 5
   [limit] '真版平衡' before 0 after 0
   [limit] '暫緩' before 2 after 6
   [limit] 'X ' before 0 after 2
   [limit] '待裁' before 19 after 27
   [limit] '未達設計目標' before 0 after 2
   [limit] 'X 改列非阻塞' before 0 after 1
   [limit] 'X 非阻塞' before 0 after 1
   [pending] | D3 幽靈 | present
   [pending] | D6 天梯 | present
   [pending] | D7 送神與網路相位 | present
   [pending] | D8 環境管線 | present
   [pending] K01-K06 rows with 待裁: 6 /6
   [link] pre-existing docs/handoffs/INDEX.md -> 2026-09-15-highlight-cuts.md
   [link] pre-existing docs/handoffs/INDEX.md -> 2026-09-15-mark-scale-and-followups.md
   [link] checked 134 relative links; new broken: 0
   exit=0
   ```
   ID 的抽取規則是 `\b(?:[CELFNPVAK]\d{2}|D[1-8])\b`，比對 `git show 85c38c6a:docs/MASTER_BLUEPRINT.md` 與工作樹版本。兩條 pre-existing 斷鏈見提案第 6 點。
3. 空白與範圍
   ```
   $ git -c core.safecrlf=false diff --check 85c38c6a ; echo "diff-check exit=$?"
   diff-check exit=0
   $ git diff --name-only 85c38c6a
   CLAUDE.md
   README.md
   docs/ARCH_SPEC.md
   docs/IMPLEMENTATION_GUIDE.md
   docs/MASTER_BLUEPRINT.md
   docs/handoffs/2026-10-01-cloud-to-local.md
   docs/handoffs/INDEX.md
   $ git status --short --untracked-files=all   （未追蹤部分）
   ?? docs/handoffs/2026-10-07-blueprint-audit-for-claude.md
   ?? docs/reviews/2026-10-07-blueprint-audit-result.md
   $ grep -c -E ' +$' docs/reviews/2026-10-07-blueprint-audit-result.md
   0
   ```
   七個已追蹤檔都在允許清單內；新檔只有本報告，交接原文另外以獨立提交加入。沒有改到 `index.html`、`js/`、`tests/`、acceptance／凍結檔或素材。
4. B05 第 1 項的產品測試（只讀；確認缺件的 nightwalk 兩項在本機已補齊）
   ```
   $ node --test tests/nightwalk.test.mjs
   ℹ tests 18
   ℹ pass 18
   ℹ fail 0
   ℹ duration_ms 2350.457
   ```
   全套 `node --test tests/*.test.mjs` 沒有重跑：產品沒改，交接也寫明不需要。

## 附錄 C：fresh read-back

- 執行方式：派一個沒有本次對話史的 `general-purpose` 代理（`sonnet`），只讀改後的 CLAUDE.md 開頭與已裁邊界、README、MASTER_BLUEPRINT 全文、INDEX 開頭、雲端接手包全文、ARCH_SPEC 第 55–85 行、IMPLEMENTATION_GUIDE 開頭與 §6.4。不給交接檔和本報告，回答 8 題，並列出「可能誤讀處」。
- 結果：8 題都和作者原意一致。版本與基準（只確認 Git）、A1／A2／A3／L1／N1 的四軸狀態、D2／D5 已裁且 D3／D6–D8 待裁、P0 延到 A3 後且分成兩類工作、L05／F03／F11 部分與未確認、現行 hook 順序與舊表不能照用、trace 改用 `trace-eq.mjs`、雲端接手包第 1、5 項已解、第 3、4、7 項待驗、第 6 項未確認，全部讀對。
- 它指出的可能誤讀處與處置：
  1. §5 的「完成」要讀到 §5.1 才知道是結案 → 已修：在 §5 表前加一句說明（`MASTER_BLUEPRINT.md:219`）。
  2. D2 批的是三組，卻發布六組，文件沒講六組有沒有另外裁定 → 已修：D2 列補上天命續作計畫（使用者已選 1.B）與 2026-09-24 發布裁定的來源（`:274`）。
  3. CLAUDE.md 的「18/18」可能被當成全套 → 已修：註明是 nightwalk 單檔、全套沒重跑（`CLAUDE.md:3`）。
  4. D6–D8 在 §6 沒明寫待裁，CLAUDE.md 的待裁清單漏了 D8 → 已修：§6 D6–D8 列加「待裁」（`:277–279`）、CLAUDE.md:60 補 D8。
  5. v0.59.4–v0.62.5 的品質沒整理 → 保留：這本來就寫明「未確認」，不在本次範圍，已列為提案第 7 點。
  6. CLAUDE.md 舊段的「Pages 成功／核對送達」是舊版歷史 → 保留：新入口已寫「以本段為準」，舊段是沿革。
  7. IMPLEMENTATION_GUIDE「可以直接照抄」只靠括號覆蓋 → 保留：§6.4 開頭另有醒目警告，檔首入口框也講了，原句留作沿革。
- 修正後重跑附錄 B 第 2、3 項：`[ID] before 90 after 90 missing: none`；D3／D6／D7／D8 都還在、K01–K06 有 6/6 列標待裁；`checked 136 relative links; new broken: 0`；`diff-check exit=0`。
