# 驗收凍結檔：切鏡批 2-a「傷害可讀性」（2026-09-07；使用者試玩 v0.45 回報「扣血看不太出來、顏色分不出」）

基準 SHA：`443f802`（v0.46）。VERSION 0.49（角色 0.47、請神 2.0 0.48 先佔；合併時再對）。純演出層，不動引擎。

## 範圍（使用者裁「照建議」四件）
1. **跳字**：`.dmgfloat` 字級 ×1.6、粗體、深色描邊（`text-shadow` 或 `-webkit-text-stroke`）；傷害＝暖紅橙（`--c-danger`）、治療／回血＝綠（`--c-safe`）、擊殺再 ×1.3＋系色底光（`.kill`）；出現先彈（scale 1.3→1.0，120ms）再上飄淡出（沿用 `DMG_MS`）。
2. **被打的尊閃紅**：命中瞬間該尊邊光與材質 tint 閃紅 `HIT_FLASH_MS`(120) 再回原值——3D 妖用既有 `setRim` 倍率＋短暫紅 tint（`creature-figures` 的 fresnel／tint uniform），貼片人形用逆光層變紅；燒毀中的尊不閃（燒毀有自己的曲線）；SKIP／cancel 一次清乾淨。
3. **量表紅殘影**：`.pwgauge` 縮短時，掉的那一段先變紅停 `GAUGE_GHOST_MS`(300) 再收掉；己方（南家）那側被打時 `#duel` 左右邊緣閃一圈淡紅暈 150ms（CSS，pointer-events:none）。
4. **「−1 隻」小字**：每筆 burn 事件在該尊位置多跳一個灰白小字「−1 隻」（與傷害數字分色、字級 ×1.0），同樣走 `.dmgfloat` 池；同一拍上限沿用 `MAX_HITS`。
- 旗標：沿用 `PW_FX.CLOSEUP_ON`（`?closeup=0` 全關）；新增常數 `HIT_FLASH_MS`／`GAUGE_GHOST_MS`／`DMG_SCALE` 集中 `PW_FX`，全部【試玩必調】。

## 驗收條件（動手前訂；門檻不得為了過而調）
- **R0 退路等價**：`?closeup=0` 下與基準逐事件相同（沿用 closeup P0 治具：`closeup-trace` 逐位元組＋seeds 1–3 三局 FXC 同場次收手比原始總數）；引擎 `trace(1..20)` 逐位元組相等。
- **R1 跳字對比度**：Playwright 對每個 `.dmgfloat` 取文字色與其背後 8px 環帶平均色，WCAG 對比度 ≥ **4.5:1**，seeds 1/3/5 各 10 場全部筆數通過；基準版（v0.45 白字無描邊）同一量法 <4.5 的筆數 >0（鑑別力）。傷害／治療／擊殺三類 class 與事件 kind 逐筆對得上。
- **R2 被打尊閃紅**：命中事件後 40ms 內對 target 尊截圖，取該尊投影方框內像素的 R−(G+B)/2 平均值，與命中前 100ms 比 ≥ **+25**（0–255 尺度），200ms 後回到 ±5；燒毀中的尊差值 <5（不閃）；基準版差值 <5（鑑別力）。seeds 1/3/5 各 10 場，每場至少 3 筆可量。
- **R3 量表殘影**：每次 `pwBurnOne` 後 50ms 內 `.pwgauge` 內存在 `.ghost` 元素、寬度＝掉的段落 ±1%，`GAUGE_GHOST_MS+100` 後消失；己方受擊時 `#duel` 的邊緣暈元素出現且 150ms＋50 內消失；對方受擊時不出現。
- **R4 「−1 隻」**：每筆 burn 事件對應恰一個 `.dmgfloat.unit` 且文字「−1 隻」，與同拍傷害數字不重疊（中心距離 ≥ 字高）。
- **R5 SKIP／cancel**：`doSkip()` 後 300ms：`.dmgfloat` 0、閃紅尊 0（R2 量法差值 <5）、`.ghost` 0、邊緣暈 0。
- **R6 效能**：`duel-perf --n=10 --uncap` 中位 fps ≥ 基準 ×0.9；閃紅不新建材質、不重編 shader（`renderer.info.programs.length` 對決前後不變）。
- **R7 截圖**：844×390 連拍 ≥6 張（命中前／閃紅瞬間／跳字彈出／量表殘影／擊殺跳字／SKIP 後乾淨）contact sheet；主對話親看：跳字一眼可辨、閃紅不刺眼、殘影有「掉血感」。
- **R8 測試與範圍**：8 套（屆時 9 套）測試綠；`ash-freeze-probe` 綠；`git diff --stat` 只含 `index.html`（CSS／跳字／量表／旗標／VERSION）、`js/duel-figures.js`（閃紅狀態）、`js/creature-figures.js`（tint uniform，若需要）、治具、docs、本檔。

什麼實作會讓 R1 假綠：把跳字背景加一整塊不透明底板（會擋畫面）——底板寬度不得超過文字 1.2 倍。什麼實作會讓 R2 假綠：整個畫面閃紅（非 target 尊差值也 ≥25＝紅）。
