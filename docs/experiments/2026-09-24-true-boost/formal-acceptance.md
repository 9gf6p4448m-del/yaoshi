# 真版長明 flame-M＋神王 king-L 正式驗收（2026-09-24，跑前凍結）

**候選**（本提交寫入 `index.html`）：真長明餓鬼進食護盾 `+2 → +3`（候選模式仍夾 2）、白天壽命最低額外回命 `+1 → +2`；真神王請神成功回命 `+3 → +7`。`TRUE_DESTINY_RULES` 說明、事件文字與事件 `amount` 同步。模擬行為應與試跑 variant L 相同。

## 跑法（正式工具，不改工具、協定、門檻、種子）

1. 普通對照：`node tests/tools/l1-destiny-run.mjs --group destiny --arm ordinary-ai-off --private-draw-table scratchpad/destiny-formal-v1/private-draws.json --out scratchpad/destiny-formal-v3/ordinary-ai-off.json`
2. 焦點 20 shard 與彙整：`node tests/tools/l1-destiny-focus.mjs ...`，輸出 `scratchpad/destiny-focus-v3/`。
3. 普通 H1／H9 14 臂（`l1-destiny-run.mjs --group ordinaryH1|ordinaryH9`，種子 `10001..20000`）＋ `l1-destiny-ordinary-analyze.mjs`，輸出 `scratchpad/ordinary-formal-v3/`。
4. `sfx-wiring` 以外全部 `tests/*.test.mjs`。
全部在本提交的 HEAD 上跑完才可再提交；舊 raw 不覆寫。

## 成敗

- **成功**＝焦點比較長明原案、神王原案皆 pass（95% 區間全落 `+3..+10pp`，有真事件）。
- 一致性：兩鏈原案數字應與試跑 [summary-L.json](summary-L.json) 相同；不同須查明原因再判。
- 普通 H1／H9：真版常數不影響普通組，應與 `0592512` 正式結果相同；任一鏈判定改變即回報。
- 測試：失敗須逐一歸因；因真版數值改變而過期的斷言，先回報使用者再改。
- 任一失敗 → 停手回報，`index.html` 以 `git revert` 退回。
