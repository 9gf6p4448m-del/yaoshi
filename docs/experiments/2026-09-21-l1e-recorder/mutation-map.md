# 真實袋子變更盤點

Astra 對照 d2250a8 的 index.html；20個寫入statement、19個原始碼行。下列行號是改動前定位，不是改後永久行號。記錄器採 private closure、state與player identity檢查；activeChains／chainsCompletedBy／預覽／AI估值繼續純查詢。

| 原行 | 引擎入口 | 寫入次序 |
|---|---|---|
|965–966|wangchuan onWinItem|移出詛咒，再移入對手|
|1095|pawnNow|抵押鎖入袋|
|1305–1306|hunter onBattle|局部bag別名移出，再勝者入袋|
|1754|plague|獎勵入袋|
|1811|ghost|同一行：先受害者移出，再得標者移入|
|1832|zongzi|王船煞入袋|
|1875、1879|wind|先遍歷全圈移出，再遍歷全圈移入；不能改為逐對交換|
|1908|poe|獎勵入袋|
|1986|夜規強制塞袋|目標入袋|
|2915|stripEndgameItems|filter replacement；沒有實際移除時不算材料mutation|
|3394|resolveAuction毒標|接收者實際入袋之後|
|3403|resolveAuction普通得標|入袋之後、onWinItem等hook之前|
|3515|shrineReward|獎勵入袋|
|3547|awardLegend|傳說入袋|
|3643|releaseLegend|傳說移出|

初始mkPlayer的空袋不是取得。預覽與試算用的spread bag／buildArmy／pwTrial不是上述真實mutation，不接記錄。即使傳入有相同id的副本，identity guard也拒絕。資料僅在量測scope結束後以detached snapshot返回；不可讓策略在局中讀取其他席取得紀錄。

Astra 排除 Proxy：splice 的逐索引中間態、bag replacement需重裝以及淺拷貝預覽容易傳遞代理，都會增加漏記或誤記風險。顯式接點可逐條檢查，代價是將來新增真實bag寫入時必須同步接觀測並更新本表。
