# v0.61.1 curse-slow 進度與 SHA

- 基準：709e313a（v0.61.0，origin/main）；凍結驗收 0f9818c9＋修訂 4fce43fa／1e7688f1
- ① CURSE_MS＋腳本放慢＋揭卡等待：c81a3763
- ①b 抬升連續化＋繩加粗：b93b9f94；變數改名（純度掃描）：82cc16cd；規劃取樣 1/15s：e3bf11f4
- ② 判定器／治具（12 組合）：c2ca17aa；開演成本量測＋連拍產生器：89a025ed
- ③ 測試改寫（使用者已簽清單）：784d0fc2
- ④ 版本 0.61.1：8591d51d
- 最終證據：HEAD 89a025ed，evidence/progress.log（2026-10-05 21:04–21:36，依序單一瀏覽器）
- 證據與報告提交：見本檔下一個 commit（docs only）
- 未 push

## 第二輪（條件 14–24，f4b7aca6）
- C 槽剩餘：開工前 478M（df，清掉本卷自己的 scratchpad 暫存後 881M），量完基準後 662M。暫存一律在 D:/yaoshi-scratch/curse-slow2/。
- 判定器：tests/tools/grab-probe.mjs `--modes=r2`（judgeCurseR2），口徑寫在函式上方註解。條件 15「高度」讀作抬升量（受害者 liftOf、堆節點 y − dest.y），與 0.185 的出處（tests/grab-motion.test.mjs 抬升規劃斷言的 Lv）同一座標。條件 16「手背中心」兩種量法都記：Palm 骨（dh）與可見手頂點重心（dhCentroid）。
- 條件 15 施放者貼堆距離上限（凍結）：覆審列為正常的 5 組（cSW、cSN、cSE、cNS、cEW）在 d147dbc1 的按住段施放者 nearItem 最大值＝0.0101（cSN）→ ×1.25 ＝ **CASTER_NEAR_MAX = 0.0126**。709e313a 同 5 組最大值 0。之後不改。
- 基準量測（evidence-r2/baseline-r2-*.json）：**觸發條件 14 的停手條款**——覆審列為正常的組在基準判紅：
  - 條件 14：cSE 堆最高 1.2305（d147）／1.23（709），上限 1.0777，兩邊都紅。
  - 條件 16：正常 5 組堆中心距受害者手背 Palm 骨 0.19–0.28、距手頂點重心 0.088–0.121，兩種量法都 > 0.08，兩邊都紅（底高條件 ≤0.05 都過）。
  - 條件 17：cSE 堆與槽 2 拍品包圍盒重疊 9 幀（d147）／3 幀（709）。
- 依條件 14 停手，未動實作。
- 修訂（bee31a5b）後判定器重量兩基準：正常 4/4 過、浮空 8/8 紅（00de9566，evidence-r2/baseline-r2-summary.log）。
- **中斷**：00de9566 之後 API 憑證錯誤（SELF_SIGNED_CERT_IN_CHAIN）中斷；主對話指示自 00de9566 續做第二輪修復。續做時工作樹無未提交修改。
- 第二輪修復：0a11dee5（planPath 貼桌繞行、受害者另找空桌面、施放者改從後方推、規劃分攤、CURSE_MS≤0、跳過等待、VERSION_NOTE 實述）、158f5650（單元測試＋治具）。
- 證據（evidence-r2/，於 158f5650 上 2026-10-06 00:03–00:45 依序單一瀏覽器跑完，progress.log）：條件 14–17 正常 4/4 過、原浮空 8 組全過（c14-17-summary.log）；條件 18 開演 p95 中位 20.0ms（基準 17.8ms，門檻 30）；條件 19 CURSE_MS 0/1500/2000/2600 與 skipwait；條件 11 全套 475/475。
- **中斷（第二次）**：00:53 實作者在未提交狀態試改 js/table-tray.js（PLAN_DT 1/15→1/10、PLAN_PER_FRAME 8→0），未有任何證據覆蓋、且 session 結束。主對話（10-06）判定此為未完成實驗：已存 D:/yaoshi-scratch/curse-slow2/uncommitted-tabletray-0053.patch 後還原，驗證狀態＝158f5650。
