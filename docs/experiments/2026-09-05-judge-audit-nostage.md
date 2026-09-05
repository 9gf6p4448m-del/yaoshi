# 2026-09-05 — judge.mjs 不帶 `--stage` 全隻覆核

## 結論先行

**21 隻全跑，21 隻全過，0 隻 BLOCK。** `fushou` 卷發現的「`--stage HIGH` 只跑 HIGH 那批 claims」破口（`judge.mjs:271` 全等比對）確實存在，但**實測結果是：目前 main 上的 21 隻裡，只有 `ashcharm` 的原始報告記錄的指令帶了 `--stage HIGH`**；其餘 19 隻（含 `fushou` 本身）原始報告記的指令本來就沒帶 `--stage`，等於本來就跑過完整 spec。本次對 `ashcharm` 補跑不帶 `--stage` 的完整版，同樣 **all claims pass**，沒有翻出新的 BLOCK。

排除範圍：`tiger_a`／`tiger_b`／`tiger`（look-dev 廢案，無對應 GLB 或非量產隻），實跑對象為 `tiger_c`。

## 逐隻結果表

| 隻名 | claims 總數 | 本次結果（不帶 `--stage`） | BLOCK 明細 | 輸出檔 |
|---|---|---|---|---|
| ashcharm | 22 | **all claims pass** | 無 | judge-audit/ashcharm.txt |
| balen | 19 | **all claims pass** | 無 | judge-audit/balen.txt |
| bell | 17 | **all claims pass** | 無 | judge-audit/bell.txt |
| boat | 13 | **all claims pass** | 無 | judge-audit/boat.txt |
| bow | 15 | **all claims pass** | 無 | judge-audit/bow.txt |
| eye | 12 | **all claims pass** | 無 | judge-audit/eye.txt |
| flag | 14 | **all claims pass** | 無 | judge-audit/flag.txt |
| fushou | 23 | **all claims pass** | 無（原報告本就不帶 `--stage`） | judge-audit/fushou.txt |
| hairpin | 16 | **all claims pass** | 無 | judge-audit/hairpin.txt |
| nail | 13 | **all claims pass** | 無 | judge-audit/nail.txt |
| pojun | 16 | **all claims pass** | 無 | judge-audit/pojun.txt |
| raincoat | 14 | **all claims pass** | 無 | judge-audit/raincoat.txt |
| redhat | 12 | **all claims pass** | 無 | judge-audit/redhat.txt |
| shanshen | 20 | **all claims pass** | 無 | judge-audit/shanshen.txt |
| shield | 12 | **all claims pass** | 無 | judge-audit/shield.txt |
| sword | 12 | **all claims pass** | 無 | judge-audit/sword.txt |
| thunder | 19 | **all claims pass** | 無 | judge-audit/thunder.txt |
| tiger_c | 11 | **all claims pass** | 無 | judge-audit/tiger_c.txt |
| wangchuan | 21 | **all claims pass** | 無 | judge-audit/wangchuan.txt |
| wuying | 15 | **all claims pass** | 無 | judge-audit/wuying.txt |
| xianji | 18 | **all claims pass** | 無 | judge-audit/xianji.txt |

（`judge-audit/` 完整路徑：`C:\Users\shung\AppData\Local\Temp\claude\C--Users-shung\53e77be7-cfed-4bc9-8534-516ea6825ca4\scratchpad\judge-audit\<ab>.txt`，每個檔存的是該隻 judge 的完整 stdout，含 metrics JSON 與最後一行 pass/BLOCK 訊息。全部 21 個檔用 `grep -il "BLOCK\|fail"` 掃過，零命中；`grep -c "all claims pass"` 每檔皆為 1。）

## 各隻本次實跑指令原文

```
node tools/anyCreature/harness/judge.mjs assets/creatures/ashcharm.glb  .tmp/judge ashcharm  --spec assets/creatures/ashcharm.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/balen.glb    .tmp/judge balen    --spec assets/creatures/balen.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/bell.glb     .tmp/judge bell     --spec assets/creatures/bell.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/boat.glb     .tmp/judge boat     --spec assets/creatures/boat.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/bow.glb      .tmp/judge bow      --spec assets/creatures/bow.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/eye.glb      .tmp/judge eye      --spec assets/creatures/eye.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/flag.glb     .tmp/judge flag     --spec assets/creatures/flag.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/fushou.glb   .tmp/judge fushou   --spec assets/creatures/fushou.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/hairpin.glb  .tmp/judge hairpin  --spec assets/creatures/hairpin.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/nail.glb     .tmp/judge nail     --spec assets/creatures/nail.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/pojun.glb    .tmp/judge pojun    --spec assets/creatures/pojun.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/raincoat.glb .tmp/judge raincoat --spec assets/creatures/raincoat.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/redhat.glb   .tmp/judge redhat   --spec assets/creatures/redhat.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/shanshen.glb .tmp/judge shanshen --spec assets/creatures/shanshen.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/shield.glb   .tmp/judge shield   --spec assets/creatures/shield.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/sword.glb    .tmp/judge sword    --spec assets/creatures/sword.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/thunder.glb  .tmp/judge thunder  --spec assets/creatures/thunder.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/tiger_c.glb  .tmp/judge tiger_c  --spec assets/creatures/tiger_c.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/wangchuan.glb .tmp/judge wangchuan --spec assets/creatures/wangchuan.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/wuying.glb   .tmp/judge wuying   --spec assets/creatures/wuying.claims.json
node tools/anyCreature/harness/judge.mjs assets/creatures/xianji.glb   .tmp/judge xianji   --spec assets/creatures/xianji.claims.json
```

（全部**不帶 `--stage`**，符合 `judge.mjs:4-6` 用法：無 `--stage`＝跑 spec 裡全部 claims，不論 `stage` 欄位是 LOW/MID/HIGH 或未填。）

## 原報告是否只記了 `--stage HIGH`

對每隻的原始報告（`docs/experiments/*-<ab>-report.md`，`tiger_c` 取 `2026-09-04-lookdev-tiger_c-report.md`）逐檔 `grep -n -- "--stage"`：

| 隻名 | 原報告指令帶 `--stage HIGH`？ |
|---|---|
| **ashcharm** | **是**——`2026-09-04-creature-ashcharm-report.md:7,20,156` 三處都寫 `judge.mjs --spec --stage HIGH`，實際跑的指令（第 155-156 行）確實帶了 `--stage HIGH`。這隻的原始「all claims pass」**只驗證了 HIGH 那批**，MID 那批（`part_exists`/`part_visible`/`part_signature`/`focal_contrast`/`share_hierarchy`/`style_dark` 等）從未被跑過——直到本次補跑才第一次跑滿 22 條，結果同樣全過。 |
| fushou | 否——報告明確寫「刻意不帶 `--stage`」（`fushou-report.md:149`），本來就跑滿 23 條。 |
| balen / bell / boat / bow / eye / flag / hairpin / nail / pojun / raincoat / redhat / shanshen / shield / sword / thunder / tiger_c / wangchuan / wuying / xianji（共 19 隻） | 否——19 份原始報告的 `judge.mjs` 指令原文裡全部**沒有 `--stage` 字樣**（`grep -n -- "--stage"` 零命中），代表這些隻原本就是跑不帶 `--stage` 的完整 spec，MID 批次本來就有被檢查過。 |

**結論**：fushou 卷提出的「全卷共用破口」在實際指令紀錄上只命中 `ashcharm` 一隻；其餘 20 隻（含 fushou 本身）的原始「all claims pass」紀錄已經是完整 spec 的結果，不是只驗了 HIGH 三條。本次全部 21 隻重跑不帶 `--stage` 版本，結果與各自原報告一致，**沒有發現任何一隻藏著先前未被檢查出的 BLOCK**。
