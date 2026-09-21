# L1e 曾持有記錄器：架構覆審

日期：2026-09-21。審查基準為 d2250a8，對照工作樹中 `index.html` 的 recorder helpers、19 處 mutation observation 與 `playPolicyGame` opt-in scope。此為獨立架構與接點完整性審查，並非正式平衡放行。

## 結論

程式架構與接點盤點通過；未發現未解 HIGH／MEDIUM。採顯式寫入後觀測、私有 recorder、真實 state／player identity guard 的方向適合本卷，沒有必要引入 Proxy、改寫 bag 容器或重排結算。

此結論依據原碼與 diff 審閱。完整測試、RED→GREEN、核心覆蓋率、語意突變以及基準 trace 等價結果由實作與主代理的證據另行提供；本審查未重跑實作代理的測試，不以原碼審查代替執行驗證。

## 接點與計數

基準 `index.html` 有 **18 個原始碼行、19 個真實 bag 寫入 statement**；新程式有 **19 個 observation 呼叫**。原行依序為 965、966、1095、1305、1306、1754、1811、1832、1875、1879、1908、1986、2915、3394、3403、3515、3547、3643；1811 包含兩次寫入。各入口詳見 [mutation-map.md](mutation-map.md)。

初次回報的 20 次是盤點錯誤：`const bag=ctx.l.bag`（1300）只建立別名，不是修改玩家袋子；真正透過別名修改的是 1305 的 `bag.splice`。已用排除局部別名宣告的搜尋式再次核數，沒有為湊數新增接點。亦檢查 bag 索引寫入、length 裁剪、其他陣列 mutator 及原地修改材料 ab／curse 的形式，未找到額外生產寫入。

所有寫入均在原操作完成後同步觀測。拍賣入袋觀測在 onWinItem hooks 之前；ghost、hunter 與 wangchuan 的移出及移入分別觀測；wind 保留先遍歷全圈移出、再遍歷全圈移入的順序。stripEndgameItems 保留原 filter replacement，只有實際移除材料才增加序號。初始化空袋不算 mutation。

## 隔離與時點

- `observeBagMutation` 同時確認 recorder 綁定當前 S，以及傳入物件是 S.players 的真實成員；相同 id 或共用 bag 引用本身不足以通過。這點涵蓋 pwTrial 建立新玩家 wrapper、但可能引用原 bag 的邊界。
- activeChains、chainsCompletedBy、collectEffects、buildArmy 保持純查詢。chainsCompletedBy 和 paperWarMarketHint 的假設取得副本不會產生觀測，AI 估值與 UI 演出也沒有新增 recorder 接線。
- mutationSequence 在 guard 通過後、配方掃描前遞增，記錄的是全局實際 bag 變更順序，並非只數首次成套。phase 是固定 mutation 來源字串，已在 ARCH_SPEC 明定；例如 pawn.enter 不冒稱能區分典當發生於拍賣、戰鬥或夜末。
- first 只在該席該組尚無紀錄時寫入，沒有 alive 過濾或失去時清除的分支。holders 由 first 派生、依座位排序，不受多副本、失而復得或死亡影響。
- 配方查詢重用 activeChains 的 requirements 判定；只歸零 CHAINS 效果而保留配方的對照臂仍可取得紀錄。

## 生命週期與資料流

只有 `playPolicyGame` 第四參數的 `recordChainHoldings === true` 啟用記錄。recorder 沒有新增到 CFG、S、players、history、策略參數或測試出口；遊戲執行中沒有提供讀取記錄的 API。結果僅在結束時附加 detached snapshot，第一時點物件與 holders 陣列都重新建立。

scope 從 makeState 後開始，直到局末 shrineReward、stripEndgameItems 與排名計算完成才取 snapshot，因此結清獎勵湊齊配方也能記錄。return 或例外都經 finally 清理。active recorder 期間呼叫 nested playPolicyGame 會在 makeState 前拒絕，避免替換外局狀態；這不是對任意策略程式碼的 sandbox，既有策略仍可直接操作引擎出口。

新觀測函式只讀配方與當前袋子並寫私有統計，不呼叫亂數、不改玩家欄位、不回傳結算決策；原 bag 操作及原 rng 呼叫位置保留。預設回傳物件不新增欄位，simulate／trace 未接入 recorder。

## 驗證交接

已提醒實作代理：純查詢預覽測試不會執行 observeBagMutation，不能單獨證明 identity guard。完整測試須另讓相同 id 的副本及共用 bag 的 wrapper 通過真正寫入入口，確認 mutationCount 與 first 不受污染。此為測試要求，不是目前程式架構的已知缺陷。

正式交付仍須完成 acceptance.md 所列執行證據；本卷通過亦不補足正式 H9 桌、千眼情報策略、六之四或萬局樣本，formalStatus 維持 incomplete。
