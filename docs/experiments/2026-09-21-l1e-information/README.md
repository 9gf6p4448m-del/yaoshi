# L1e 千眼合法情報與具名策略

承接 c2a1074，依[執行前契約](acceptance.md)補上策略可消費的合法資訊與增量盲對照。未調數值／UI，候選仍v0.57.37，公開v0.57.35。正式萬局、H9、六之四仍未完成。

## 完成範圍

policyInformation:true讓headless策略多收純資料context，當夜只含依法可見的明夜預告，以及上夜揭盅當刻已向該席提供的第二高標額。預設策略呼叫形狀不變。跨局記憶獨立，不借PUBLIC_REVEAL；clone/freeze避免引用回寫。這是明確資料介面，不是任意JavaScript策略的安全沙箱。

publicSecondBid旗標使效果歸零能關閉第二高資訊；原bell預告2件、default1及其他來源仍保留。增量盲對照只去連攜多出的預告和第二高記憶，原有能力不變。

具名eyes-informed-v1以target-chaser-v1為基底，按固定最高p拍品目標，上夜第二高最多促成+2加價，看到明夜更高p非咒拍品時預留2預算。三臂共用同一決策函式與費用／筆數／保守上限裁切。這是事前固定探索啟發式，沒有最佳性保證；舊追件策略沒有改寫。

## 驗證與小樣本

固定seeds1..20、三臂共 **60局**已執行一次，來源／工具／Git版本及逐局紀錄見[smoke報告](smoke/report.md)。三臂皆7/20勝局，ever-held條件分母皆9局、其中7局由持有者勝出；不套正式帶。

informed-normal共190次策略呼叫，23次可見額外預告、19次有合法第二高、**10次出價與該局面的blind不同**；blind／zero沒有這項出價差。這證明固定樣本中情報確實被策略消費，不證明能力優勢；勝率相同不代表情報無價值。這是情報策略桌，不是原H9的scriptedBids預設桌，條件分母各臂獨立、非因果差。

raw SHA256 `fbd87fcff8a37bd1f33bec7784c5c5cbb57ab6adb4521c590142890d82947f8e`，專用LF規則保留跨checkout位元組。測量source/tool hash與Git HEAD在summary，後續test/doc/log格式整理沒有改測量程式；沒有重抽樣。

- 引擎新增 **10/10**、策略 **9/9**；既有相關回歸 **46/46** 通過。
- 舊版c2a1074與新預設trace seeds1..20均357496 bytes、逐位元組相同；原CFG、忽略context的策略optin/off seeds1..20結果／history／next RNG一致。最終source hash與[checks](checks/summary.json)已驗證版本相同。
- 引擎兩個新helper非空白V8 source units **889/900=98.78%**，三個語意突變皆驗紅：[證據](engine-verification/mutation-results.json)。
- 策略七個明列核心函式V8 UTF-16 source units（含空白／註解）**6011/6679≈90.00%**，不含CLI／formatter；健康原位與temp綠、忽略第二高／忽略預告兩個突變紅：[證據](policy-verification/evidence.json)。上述均不是整個專案覆蓋率。
- [Astra邊界覆審](architecture-review.md)修正並核對預告硬截與同名價查找偏差；[JS程式與資料覆審](code-review.md)另核對生命週期／統計／provenance。

流程缺口保留：引擎有RED f1bf4e0 → GREEN 5352734；策略最初RED有執行但漏獨立checkpoint commit，不能稱完整TDD提交鏈。策略GREEN 67d0ec0、加強test e410b8d與兩個語意突變證據仍可重現；詳[策略驗證說明](policy-verification/README.md)，沒有事後偽造初始RED提交。

```powershell
node --test tests/policy-information.test.mjs tests/l1-information.test.mjs
node tests/tools/policy-information-evidence.mjs
node tests/tools/l1-information-evidence.mjs
node tests/tools/l1-information.mjs --n 20 --out docs/experiments/2026-09-21-l1e-information/smoke
```

最後一行是本次已執行的固定量測命令；後續如需新實驗使用另一輸出目錄，不覆蓋封存資料。

## 下一步

具名情報策略和曾持有資料具備後，需固定正式策略池與各H1/H9桌的角色／對照，並把完整六之四跨夜狀態域建模；不能用60局或萬局隨機樣本代替窮舉。A3六局暫緩、玩家試玩／美術盲讀待完成。
