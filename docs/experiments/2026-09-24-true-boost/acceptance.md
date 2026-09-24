# 真版長明／神王加強候選：試跑凍結規則（2026-09-24）

**性質**：探索試跑，只用來挑候選；不改磁碟上的 `index.html`、不改焦點比較的判準、種子、bootstrap 或既有 raw。

## 使用者裁定（2026-09-24）

- 真版焦點六鏈皆未過（[重跑報告](../2026-09-24-h9-boost/focus-rerun-report.md)）；使用者要求改善，順序：先長明、神王（最接近門檻），再雙虎（普通買路錢），千眼留給真人冷讀。
- 長明：護盾為主。神王：回命為主。只動 `activeTrueDestiny()`（`index.html:2120`）守門後的真版專屬常數；普通版與基線臂不受影響。

## 候選（在試跑記憶體內替換，每個替換須恰好命中 1 處）

| 候選 | 替換 | 現值 → 候選值 |
|---|---|---|
| flame-S | `index.html:4596` 餓鬼進食護盾 | `+2` → `+3` |
| flame-M | 同上＋`index.html:3685` 白天壽命最低額外回命 | 護盾 `+3`，回命 `p.life+=1` → `+=2` |
| king-S | `index.html:3828` 請神成功回壽命 | `win.life+=3` → `+=5` |
| king-M | 同上＋`index.html:4533` 天誅後每拍攻擊 | 回命 `+5`，攻擊 `a++` → `a+=2` |

## 協定

- 與 [2026-09-23 焦點比較](../2026-09-23-destiny/focus-report.md) 相同：種子 `10001..20000`、私函表 `scratchpad/destiny-formal-v1/private-draws.json`、20 shard、bootstrap 10,000 次（種子 20260923，按 game seed 群集）、每鏈 ≥300 檢查點。
- 普通對照沿用 `scratchpad/destiny-formal-v2/ordinary-ai-off.json`（真版常數在 `destinyEffectMode="off"` 時不會被走到）。包裝腳本只把「讀磁碟原文」換成「讀磁碟原文後再替換候選常數」，其餘沿用 `tests/tools/l1-destiny-focus.mjs` 的函式與檢查。
- 先以 base（不替換）跑 1 個 shard，須與 `scratchpad/destiny-focus-v2/formal-switch-01.json` 的逐局結果相同，證明包裝腳本忠實。

## 判準與挑選（跑前凍結，跑後不改）

- 指標：焦點鏈**原案（original）**的配對勝率差；pass＝95% 區間全落 `+3..+10pp` 且有真事件，跨線＝incomplete，全落界外＝fail（同原報告）。候選版（candidate）與其他鏈只照實記錄。
- 每條鏈：S、M 中選 pass 的；兩者都 pass 選 S。
- S、M 都不 pass → 停手回報使用者，不自行加級或換旋鈕。
- 選出的候選才進入正式驗收：改 `index.html`（含 `TRUE_DESTINY_RULES` 說明文字）、以正式工具重跑焦點比較與普通 H1／H9，判準照原口徑。

## 背景事實（凍結時已知）

- [真長明吸收量](../2026-09-24-eternal-absorb/report.md)：原案盾量利用率僅 25%，每覺醒局吸收 2.96 點。加大護盾可能只部分轉成實際吸收；此事實不改變上方候選與判準，結果照實判定。

## 第二輪（2026-09-24，第一輪結果見 report.md 後由使用者同意，跑前凍結）

- 長明：flame-M 已 pass，沿用（護盾 +3、白天回命 +2）。
- 神王：新增 king-L＝請神回命 `win.life+=3` → `+=7`（不含天誅 a+=2，該旋鈕實測幾乎不觸發）。以 variant `L`＝flame-M＋king-L 跑一輪焦點比較，協定同上。
- 挑選：神王原案 pass → 長明 flame-M 與神王 king-L 一起進正式驗收；不 pass → 停手回報，不再自行加級；長明仍以 flame-M 進正式驗收。
