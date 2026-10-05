# v0.61.1 詛咒轉移放慢——實作卷報告

分支 `feat/v0611-curse-slow`（未 push）。凍結驗收：[acceptance.md](acceptance.md)（基準一律讀作 `709e313a`，v0.61.0）。基準樹：`C:/Users/shung/wt/yaoshi/curse-slow-base`（稀疏簽出，不含 docs/）。
SHA 與指令時序：[progress.md](progress.md)、[evidence/progress.log](evidence/progress.log)。最終證據跑在 HEAD `89a025ed`。

## 結論：13 條裡 9 過、2 條部分紅（#3 11/12、#6 11/12）、#10 一件有問題、#12／#13 待使用者

| # | 結果 | 證據 |
|---|---|---|
| 1 | 過 | `c1-trace.log`：trace(1..20) 與 709e313a 逐位元組相等（GRAB_ON 開／關都等），Math.random 0/0/0，突變抓得到差異 |
| 2 | 過 12/12 | `c2-6-compare.log`：12 組落定 1983–2000ms（CFG.CURSE_MS＝2000，±10%）；基準 12/12 紅（983ms，cNW 867ms） |
| 3 | **紅 11/12** | 推 1650–1683ms ≥1200、按住 683–733ms ≥600 全 12 組過；每 100ms 螢幕位移對基準比 0.29–0.54 有 11 組過，**西塞北（cWN）0.85 紅**（10.2px／基準 12px）。基準 12/12 紅 |
| 4 | 過 12/12 | 施放者＋受害者手最低點 ≥0.156（桌面 0.152）、落進非被推拍品外接盒 0 點；extra 南塞西槽 0／1／3 也過 |
| 5 | 過 12/12 | 卡片 2800ms ≥ 落定；推的整段施放者 Palm 在 #felt 內、法寶框壓 HUD 0px；index.html 揭卡 sleep＝`round(CURSE_MS×CURSE_CARD_K)−GRAB_MS`＋`GRAB_MS＋GAP`（CURSE_CARD_K＝CURSE.T.hold/T.press，單元測試守相等） |
| 6 | **紅 11/12** | 繩階段外 0 幀、844 寬 ≥3.2px、幾何 1 個、受害者交替峰 ≥23（11 組）；**北塞西（cNW）**施放者在按住段整隻手被抬 0.54（手臂越過別件拍品），量不到「按住階段」→ 繩 42 幀全算階段外。基準同組也紅（舊病，見下） |
| 7 | 過 30/30 | `result-skip30-head.json`：12 組各一次＋18 個隨機時刻（50–3000ms），30/30 都在演出中跳過、下一幀法寶在終點、四手不可見 |
| 8 | 過 | 一般得標 6/6 落定 1267ms、穿拍品 0；HUD 40 列裡得標 30 列 0px；`c8-legacy-eq.log` 2080 幀 sha256 與 709e313a 相同（活性 hold/push/rake/retract/slam）；`?grab=0` 對 709e313a 222 幀 0 像素差（`c8-diff-grab0.log`）；`c5-realflow-head.log` pass |
| 9 | 過（附一則新發現） | perf12 5 輪 p95 中位 新 2.5ms／基準 2.5ms＝1.00（≤1.25）。**另量到開演那一幀的一次性成本**（抬升規劃）：reveal-result 派送 51–91ms，基準 13–20ms（`c9-plan-cost-*.log`，桌機 Chromium）。條件 9 量的是每幀 update，不含這一幀；iPhone 未驗 |
| 10 | 5 種都播；1 件有問題 | `result-kinds-head.json`：五種 × 3 組（南塞西、北塞南、東塞西）15 次全部落定 2000ms、不穿桌不穿拍品 15/15；**縛靈鎖＋東塞西**條件 6 紅（施放者按住時沒貼在堆上：階段內 13 幀、外 40 幀）。依指示不改模型，只記錄 |
| 11 | 過 | `c11-suite.log` 474/474。只改清單內：tests/grab-motion.test.mjs（改寫 v0.60 的「落定 ≤1300ms」＋新增三組斷言）、tests/tools/grab-probe.mjs（新模式，舊模式未動）、tests/ui-hierarchy.test.mjs 版本釘。新斷言對 709e313a 紅 3/12（`c11-grab-motion-on-base.log`：CURSE_MS 不存在、落定 1.556s、抬升規劃 API 不存在（TypeError，屬新功能）） |
| 12 | 待使用者 | 連拍條與 contact sheet 見下 |
| 13 | 未做 | 不在本卷（不 push） |

## 改了什麼
1. `CFG.CURSE_MS=2000`（落定時長，單一常數）經 `ys:reveal-result` 的 `curseMs` 交給 3D；`grab-motion` 的 CURSE 時間軸改以 MS_REF＝2000 寫、依它等比縮放：蓋上 0.30s → 貼桌推 1.55s → 推上手背 0.15s（落定 2.0s）→ 按住 0.7s → 收手 0.3s。與 GRAB_MS 脫鉤。揭卡等到按住結束（2.79s）。
2. **抬升連續化（本卷新增，非原計畫）**：12 組合實測發現舊版符紙堆在越過別件、西／東越中線、壓上手背時是「一幀瞬移 0.1–0.9」，放慢後仍是快速掠過（條件 3 有 8/12 因此紅）。改為開演時沿腳本預算可達需要量，取斜率上限包絡（上升 1.4、落定前 0.4s 內下降 3.0 世界單位／秒），只往上墊（不穿）；hand-motion `grabFrame` 多吃 `minLift`（一般得標不帶＝行為不變，legacy-eq 與 ?grab=0 像素證明）。
3. 紙錢繩 R 0.011→0.0145（北席受害者 844 寬原本 2.4px，條件 6 要 ≥3）。
4. 版本 0.61.1。

## 已知問題（只記錄未處理，需使用者裁定）
- **西塞北（cWN）條件 3 紅**：西席要從槽 2 推，手臂必須越過槽 1 的拍品，整隻手連堆被抬約 0.45。基準是推的第一幀瞬移上去（落在量測窗起點之前，所以基準的窗內位移小），新版是平順抬起、在窗內 → 比值 0.85。要過只能讓推的路徑不必抬（動手臂可達或改推的路線），屬設計變更。
- **北塞西（cNW）施放者按住時浮在半空**（手臂越過別件，按 box 規則整手抬 0.54），基準同樣（舊病，v0.60 只驗過北塞南／西塞東）。
- **西塞東／西塞南的受害者手浮起約 0.9**（受害者伸手方向穿過別件拍品，`victimReach` 找不到空位時退到下限），符紙堆壓在浮起的手上。基準一樣。
- **越中線推（西／東席推對面槽）符紙堆被整個抬到 0.4–1.0 高**（施放者手臂要高過別件），看起來是「拿起來搬過去」而不是貼桌推。基準一樣，只是現在不再瞬移。
- **縛靈鎖＋東塞西**：施放者按住時沒貼在堆上（條件 6 該組紅）。
- **開演那一幀多 35–75ms**（抬升規劃），桌機量；iPhone 可能更久，真機試玩請留意揭曉當下是否頓一下。
- 治具連拍畫面帶著 stage 的 HUD 文字（與 v0.60 治具相同口徑），手機上實際畫面較乾淨。

## 給使用者看
- 總表：[strips/contact-sheet.jpg](strips/contact-sheet.jpg)（12 組＋南塞西其餘 3 槽，每列 0–2800ms 八格）
- 每組一條：`strips/strip-<組合>.jpg`（每格 200ms），南塞西＝[strips/strip-cSW.jpg](strips/strip-cSW.jpg)
- 五種詛咒物：[strips/kinds/contact-sheet.jpg](strips/kinds/contact-sheet.jpg)、`strips/kinds/strip-*.jpg`
- 對照舊版（709e313a）：[strips/base-709e313a/contact-sheet.jpg](strips/base-709e313a/contact-sheet.jpg)
