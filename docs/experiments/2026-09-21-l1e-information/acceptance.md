# L1e 千眼情報策略：執行前契約

基準 c2a1074；只補合法情報API、具名策略與探索量測接線，不改遊戲數值／UI，不執行正式萬局，不更改六之四／H1／H9門檻。

## 引擎API

playPolicyGame第四參數policyInformation:true才向pol(p,context)傳第二參數。預設仍pol(p)，不跑額外onReveal hook。記憶由runner私有local保存，不借UI的PUBLIC_REVEAL。

context為純資料deep clone/freeze，白名單：round、preview（n/f/p/ab/curse）、basePreviewCount、previousReveal（null或{round,items:[{name,secondBid}]}）。preview當刻按traitMax(p,'preview',1)取slice；basePreviewCount排除CHAINS.eyes同一effect後，其他來源preview最大值且至少1。

每夜resolveAuction後、請神／對決前，依該席onReveal的showEntries與當刻千眼資格算第二高，投影為數值後凍結，下一夜才提供。首夜null、無兩筆或隱藏null、同價算第二筆。不因下一夜失去而抹除已合法取得資訊，也不因翌夜才成套回填上夜資訊。

CHAINS.eyes新增publicSecondBid flag，eyesSecondBid使用flag判定；歸零刪除flags/traits後關閉連攜資訊，但原bell的preview2／default1及其他來源不變。UI正常效果應等價，不改視覺。

此context是資料界線，不宣稱把既有任意JavaScript策略變成安全沙箱；純決策函式不得讀G，adapter只讀必要本人／當夜公開資料。

## 固定具名策略 eyes-informed-v1

既有target-chaser-v1不改寫，使用其標單為基底；具名新策略即使已成套也繼續消費情報。

1. 目標＝今夜非咒最高p拍品，同分按市場索引。
2. 若上夜合法secondBid有非null值，取最大值+1為目標標額，相對目標原標額最多上調2，不降低原標、不超保守上限。
3. 合法明夜非咒preview最高p大於今夜最高p時，保留2預算；沒有這個訊號不保留。未成套也可用原有合法預告。
4. 所有臂共用目標優先、其餘市場索引的裁切，預算含BID_FEE，符合MAX_BIDS與保守cap。這是固定探索啟發式，不是最優策略，測後不按勝率調參。
5. increment-blind-normal只截preview到basePreviewCount、清previousReveal；仍保留原有預告，其餘決策完全相同。informed-zero停用eyes效果後使用當刻合法context，保留配方與AI追件動機。

## 本輪固定小樣本

三臂 informed-normal、increment-blind-normal、informed-zero，原CFG、seat0青面、其他席引擎AI。每臂seeds1..20，共60局，source/tool/Git版本封存後一次產出raw。此為資訊策略實驗桌，不是原H9的scriptedBids預設桌。

報告列逐seed、角色、winner、ever-held集合；全局勝率差逐seed配對，持有者分母每臂各自條件化，差非因果。所有formalStatus=incomplete，沒有正式帶判定，不重跑前次1400局。

## 必過驗證

RED→GREEN；首夜null、凍結取得資格／資訊時點、hide／不足兩筆／同額、第三件能改決策、第四件不可見、blind保留原preview、zero原能力仍在、其他來源preview更高仍保留。Context不含raw entries／player／完整nextMarket，不能透過參照改原state；純策略getter反例拒讀秘密。策略固定情境證明preview與secondBid各能影響下一次決策。

預設與改前trace seeds1..20相同；原CFG且使用忽略context的策略時optin/off seeds1..20玩法結果／history／next RNG一致；跨局無記憶。核心覆蓋≥80%，至少兩種語意突變被抓到。獨立Astra邊界＋JS程式覆審無未解HIGH/MEDIUM。資訊觀測啟用不代表千眼正式能力優勢或六之四已完成。
