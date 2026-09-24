# 真版長明／神王加強試跑結果（2026-09-24）

**結論**：依 [凍結規則](acceptance.md)，**長明選 flame-M**（護盾 +3、白天回命 +2）：原案 +5.23pp（95% +3.39..+7.19）**pass**。**神王 S、M 皆 incomplete**（原案 +4.22，+2.54..+6.02），停手回報使用者。

| 鏈 | 模式 | 現值 | S | M |
|---|---|---|---|---|
| 長明 | 原案 | +2.88（+1.44..+4.43）incomplete | +3.01（+1.57..+4.57）incomplete | **+5.23（+3.39..+7.19）pass** |
| 長明 | 候選 | +2.09（+0.78..+3.42）incomplete | +2.09（同現值） | +4.44（+2.74..+6.28）incomplete |
| 神王 | 原案 | +2.77（+1.45..+4.12）incomplete | +4.22（+2.54..+6.02）incomplete | +4.22（同 S） |
| 神王 | 候選 | +1.45（+0.36..+2.65）fail | +2.77（+1.45..+4.12）incomplete | 同 S |

- 其他四鏈 S、M 與現值逐位相同（真版常數只在焦點鏈生效）。
- 神王 M 的「天誅 a+=2」幾乎未被走到：829 點中 S 與 M 只有 1 點不同、勝負無變化（`trueGodKingBonus` 只在 `index.html:4451` 擊殺條件下設定）。神王分期：early +7.96、middle +6.10、late +1.34，卡在晚期覺醒。
- 長明 S（只加護盾）幾乎沒變，與吸收量報告「盾量利用率 25%」一致；M 的白天回命才是主要來源。

## 證據

- HEAD `433e3f4`，磁碟 `index.html` 未改（sha256 `8da0a4f4…2197`）。包裝腳本 [focus-candidate.mjs](focus-candidate.mjs)：只在讀入原文後做字面替換（各斷言命中 1 次），其餘沿用或逐字照抄 `tests/tools/l1-destiny-focus.mjs`；覺醒前 checkpoint 一致、只允許焦點席焦點鏈真事件、對照重放與 baselineRaw 一致等檢查全部保留且未觸發。
- 忠實性：base（不替換）shard 1（10001..10500）與 `scratchpad/destiny-focus-v2/formal-switch-01.json` 逐局相同，檢查點檔位元組相同。
- 候選產品 sha256：S `62ca4e01…1261`、M `dca892aa…305f`；彙整 [summary-S.json](summary-S.json)、[summary-M.json](summary-M.json)；10,000 種子、4,883 檢查點；40 片合計 617 秒。主對話親自核對長明／神王原案數字。

## 第二輪（凍結 `a894b9c`）：variant L＝flame-M＋king-L（神王請神回命 +7）

| 鏈 | 原案 | 候選 | 判定（原案） |
|---|---|---|---|
| 神王 | **+6.63（+4.78..+8.57）**，真事件 491 | +4.22 incomplete | **pass** |
| 長明 | +5.23（+3.39..+7.19），真事件 5,590 | +4.44 incomplete | pass（同 M） |

- 其他四鏈與現值逐位相同。20 片皆 exit 0，彙整 [summary-L.json](summary-L.json)。
- 依規則：長明 flame-M 與神王 king-L 一起進正式驗收。
