# L1e 千眼情報：獨立架構與觀測邊界覆審

日期：2026-09-21。依事前凍結的 `acceptance.md`（70c3412）覆審；未改門檻、策略常數、種子或正式量測範圍。覆審者為獨立 Astra 架構代理；只修改本紀錄，不實作引擎或策略。

## 結論

引擎與策略第二輪覆審後，沒有未解 HIGH／MEDIUM 實作問題。合法情報 API、連攜增量盲對照與全桌歸零作用域符合本輪契約。此結論只涵蓋資訊隔離與固定策略接線，不代表千眼優勢、H1／H9 或完整六之四通過。

## 已核對的邊界

- 既有 `playPolicyGame` 預設仍呼叫 `pol(p)`；只有明確 opt-in 才投影 context 與觀測揭盅。沒有改 UI 的 `PUBLIC_REVEAL` 更新流程。
- context 只包含白名單純資料。preview 在決策當刻按合法權限切片；每項只留下名稱、系別、行情、能力代號與詛咒標記，陣列和物件均凍結。
- 上夜第二高在 `resolveAuction` 後、請神與對決前，按該席資格與 `onReveal` 可見性計算，保存不可變數值。下一夜失去配方不抹除已看資訊；下一夜才取得配方不回填舊資訊。首夜無記憶，同額照第二筆，隱藏或不足兩筆為 null。
- `publicSecondBid` flag 把第二高能力納入既有歸零路徑；只刪指定連攜 effects。原銅鈴 preview 2、基本 preview 1 與其他來源都保留。
- blind 只截除連攜新增的 preview 並移除第二高記憶。`basePreviewCount` 排除的是 `CHAINS.eyes` 同一物件；其他來源合法 preview 4 仍保留。
- 純決策函式只讀顯式輸入，adapter 只讀本人袋子、當夜公開市場與原有預算查詢。getter 反例檢查隱藏未來市場、對手袋子；沒有宣稱任意 JavaScript 閉包受到安全沙箱限制。
- 新具名策略沿用舊追件標單作基底，再按固定最高行情目標、昨夜非 null 第二高最大值、上調至多 2 與預留 2 預算處理。成套後仍消費資訊，兩臂共用同一決策函式。
- runner 的三臂具名且種子配對；曾持有資料來自引擎 recorder，全四席集合與 winner 判斷接線正確。條件勝率各臂使用自己的分母，零分母為 null，差值明示非因果，原 H9 預設桌沒有混入。

## 覆審發現及處理

第一輪發現三處 MEDIUM 規格偏差：blind 對基礎預告數硬設 3 上限、純決策再次將合法 preview 截成 3 件，以及第二高按今夜同名拍品查找而非取昨夜合法最大值。第二輪已核對：兩處硬截移除，第二高改為全部合法非 null 值的最大值；沒有更改凍結策略以適應測試。

另補強驗證鑑別力：預設不執行 hook 的測例確保該 hook 實際處於有效連攜上；失去配方後的測例檢查至少一筆非 null 記憶；成套策略測例修正為實際 eye＋bell 配方。其他來源 preview 4 與當夜標單 getter 的補測已補齊，獨立檢查與重跑皆通過。

## 獨立實跑

- `node --test tests/policy-information.test.mjs`：10／10 PASS。
- `node --test tests/l1-information.test.mjs`：9／9 PASS；補入 blind 保留 preview 4 與 `humanBids` getter 的既有測例後，再次獨立實跑仍為 9／9 PASS。

覆審時引擎 SHA256：`55046ee5df05e4b55ff137708ae99fbc089e7659ef865e217f35ac7faa7602aa`。

本代理未執行 60 局 smoke 或正式萬局；固定小樣本、原版本 trace、完整原 CFG opt-in/off 與 JS 程式覆審由主對話整合驗證。沒有以這兩組單元測試替代該等驗收。
