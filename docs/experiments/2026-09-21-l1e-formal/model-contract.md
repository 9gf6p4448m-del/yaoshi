# L1e 六之四：完整跨夜模型契約與接線盤點

基準為 `cb64f4e` 的產品規則；機器可讀逐項清單在 [model-contract.json](model-contract.json)。這是可交接的審計範圍，**不是**已可執行的整局窮舉或六之四 PASS。現況 `sixOfFour=incomplete`、`formalStatus=incomplete`、`releaseEligible=false`。本輪不改產品規則、數值、門檻或聲稱範圍。

## 被檢查的賽局

三組 `water`／`twinTiger`／`eyes` 分別在原 `solo` 四席、原 `CFG.ROUNDS=12` 的有限擴展式賽局內檢查。從**每個合法初始化與其完整機率支持集**出發，展開每個可達決策與 chance 分支，直到原 `playPolicyGame` 的終止點：座位 0 死亡、全桌至多一人存活或達第 12 夜。異事可在開標前結束當夜；終點依原順序做請神局末結清、移除 `endStrip` 道具，再按存活、壽命作穩定排序。全員死亡與同壽命情形仍遵原排序，不能補跑 AI 殘局。這是原 runner 的終點語意，不主張未來可能的完整四席續局。

`makeState('solo', ...)` 目前從整數 seed 的 PRNG 建狀態。正式模型的 root 是所有合法角色／牌堆／咒牌堆／規則與異事排程／首兩夜市場等初始化結果，及其正確權重；`seeds 1..10000` 是 H1/H9 量測計畫，並非這個 root 或後續 chance 的全集。不能從「12 夜有限」推得目前已有可負擔的完整枚舉數或已完成求解。

## 決策、觀測與轉移

每個**活著且有資格**的座位，在每個原規則決策點可取所有合法動作；headless 的 AI、`scriptedBids` 和具名 `POLICIES` 只可作比對治具，不能取代對手選項。決策節點需保持原相位順序、密封提交與揭盅時點。行動集合包括盯上或不盯、各異事的實際選項與金額／目標、每件拍品的空標或整數正標額及 `cons`／`yaming`、`keep`／合法毒標與合法目標、掛號費及 `MAX_BIDS`／預算上限；一注多押夜還需獨立列整數注額、標型與所有合法的拍品子集合，保留只付一次費與最多中一件的原規則。請神香火 `0..` 當刻合法整數上限、得主從未請走的尊中自選、送神回天／繼續供奉等會改規則的後續選擇都屬決策。額度上限須由當刻生命、保守上限與 hooks／夜規計算，不可預先選幾個價位，也不可把結算時才夾掉的輸入默認等價。`model-contract.json` 的 action 項是範圍與 adapter 工作單；尚未宣稱上述清單已由程式全數生成。

同一玩家的資訊集合由他到當刻**合法可見的完整歷史**決定，包含本人袋子、私有心願、自己的先前動作、公開市場／盯上／揭盅結果與依法取得的預告；千眼上夜第二高標額只在上一夜揭盅後、該席有資格且未被遮蔽時入記憶。對手未揭露袋子、當夜未揭密封標、牌堆順序、未來市場及 RNG 狀態不能作該席資訊集合的分辨鍵。記憶不能因眼前數值相同就刪除。策略須在相同資訊集合選同一動作，且包含**每個**後續資訊集合的條件選擇，而非單晚選項或固定 AI 策略矩陣。

每個隨機分支需枚舉完整支持集與條件權重，保留無放回抽取和既有 RNG 呼叫順序對機率的影響。`mulberry32` 的計數器藏在 closure；目前沒有能在任意相位精確 snapshot／restore 的 API。adapter 要保存 RNG closure、物件參照與 alias、袋子／牌堆／市場的順序、債務到期、香火池／尊的持有、盯上信譽、角色與 hook 記憶、情報取得歷史及未決提交。任何 canonical state 合併先要證明合法動作、觀測、後續機率與收益完全相同；不能為了減狀態數就排序袋子或丟掉歷史。

## 收益與六之四判定

終局 `winnerId` 指標（勝者 1、其他 0）的期望值可作**候選**終局勝負效用，須用完整 chance 權重計算。在每個對手完整條件策略組合下，若某席策略 A 相對每個自身替代策略 B 都從不更差，便依原 `analyzeEvent` 口徑報 dominant；全部同值仍報 `strict:false`，不可加「必須至少一次嚴格較好」來放行。這個比較跨所有合法資訊集合與後續夜晚。

`freeLunch` 仍有獨立缺口。原 `analyzeEvent` 問的是「全員選同一事件選項時，每人原事件 payoff／淨收益是否都 > 0」，而 winner indicator 的正期望只是勝率，不是原事件的正淨收益；四人勝者指標也沒有自然的「全員相同標單」跨夜對應。必須先給出 L1 連攜跨夜對應的事件收益單位、比較基準、共同選項／策略的映射，再驗證它忠於原六之四語意，才可判 `freeLunch`。在此前，即使 dominance adapter 完成也只能報 incomplete，不能把未映射項視為 false。

## 現有 API 邊界與下一步

`index.html` 的 `makeState`、`resolveAuction`、`resolveShrines`、`resolveBattles`、`playPolicyGame` 提供真規則與比對 trace；現有 `analyzeEvent({players,options,payoff})` 只枚舉所有席**共用靜態選項**的單次 payoff 表，且拒絕超過 2,000,000 個組合。它不是跨夜有限擴展式求解器。`playPolicyGame` 的真人策略只覆寫座位 0；其他席走 AI，headless 異事及請神也有預設決策。現有千眼 `policyInformationContext` 是一席實驗策略的有限白名單，尚非四席資訊集合 API。`model-contract.json` 對每一項標明 `implemented`、`existingEvidence`、`missingAdapter`、`nextAcceptance`、`exclusions` 與 `blockingReason`；其中 terminal 部分既有規則可重用，完整模型整體仍未實作。

下一個工程交付是**可跑的 contract auditor**：載入凍結來源與本契約，逐項以真引擎治具檢查 adapter 覆蓋，對缺相位、缺 chance 權重、錯誤資訊集合、無法重現的 state 或未定收益基準一律 fail closed／回 incomplete。之後才有資格執行整個所聲稱範圍的窮舉並提交三組各自的六之四結果。正式萬局 H1/H9 是另一閘門，樣本量不能補這個模型缺口；本輪沒有縮小原六之四範圍，也沒有提出正式 PASS。

## 2026-09-24 狀態追記

依使用者對[新發布裁定提案](../2026-09-23-destiny/release-decision-proposal-x.md)的裁定（甲，因正對照不報警而依事先規則轉丁），本契約描述的完整跨夜模型改列**非阻塞已知項**。`sixOfFour` 仍為 `incomplete`，未改寫成 pass；證據見[終止報告](../2026-09-24-x-local-subgame/report.md)。本文其餘內容保持原樣。
