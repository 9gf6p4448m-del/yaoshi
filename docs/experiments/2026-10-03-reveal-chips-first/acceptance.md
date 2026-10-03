# 驗收條件（凍結）— 開標先看擺錢、公告後出（修法 C）

動機：使用者 iPhone 試玩回報，按「蓋牌開標」後 startReveal 同刻推出所有人的錢，並立刻在 #stage 顯示「🔔 開標前公告」大卡蓋住桌心，看不到擺錢。
改法：startReveal 內、pushBid3d 迴圈之後、第一個 stage.innerHTML 寫入（bleedLog 條與公告）之前，TABLE3D 為真時等 `CFG.CHIP_SETTLE_MS`（預設 2000，【試玩必調】）；等待期間 #stage 為空、#mainbtn disabled；doSkip 可立即中斷。不改 table-props.js、不改結算、不耗亂數。
基準：main 7c988c95。分支 feat/reveal-chips-first。

1. Playwright 844×390 開一局（solo），人類出價後按蓋牌開標：按下後 t=0.3s 時 #stage 內不含「開標前公告」，且 3D 錢已推出（`__yaoshi3d.tray.props.chipCount()`>0 且有錢的席位數大於按下前）；t≥CHIP_SETTLE_MS+0.3s 時公告出現。
2. 按「跳過」(doSkip) 後公告立即出現（等待期間按，<300ms 內出現）。
3. 鑑別力：基準版跑條件 1 必須紅（0.3s 時公告已在），新版綠；兩邊各貼一次實跑輸出。
4. `tests/tools/trace-eq.mjs` 對 7c988c95 的 index.html 輸出 equal:true。
5. `node --test tests/*.test.mjs` 全綠；有既有 fail 則在基準版同樣跑一次對照。
6. 熱座局開標走通無 JS error（pageerror／console error 為 0）；`?handreal=0` 與預設各跑一次無 console error。
7. `git diff --stat 7c988c95..` 只含 index.html（CFG 常數＋等待＋版本字串）、版本同步必要的 tests/ui-hierarchy.test.mjs（RELEASE_VERSION 斷言）與本資料夾 docs；逐行對應需求。
8. index.html 的 VERSION 與 RELEASE_VERSION 升 0.59.8；其他 `?v=0.59.7` 快取字串（theme.css、safe-area.css）同步。
