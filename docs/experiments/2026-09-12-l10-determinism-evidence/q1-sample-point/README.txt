Q1（凍結檔 §2.1 修訂六 ②）：取樣時點由「釘在 ys:hitstop」改成「推鏡停穩後再凍幀」
報告：docs/experiments/2026-09-12-l10-determinism-report.md §9
樹：main 0.55.1（50df83a）；兩邊都是 pump 虛擬時鐘，差別只有取樣時點。

before/  ＝ 48d599a 的治具（pump 時鐘 ＋ 舊的 hitstop 取樣點），跑在同一棵 main 0.55.1
after/   ＝ 現行治具（方框停穩取樣點）
canary/  ＝ 條件 (c)：index.html:499 跳字 hit 字級 ×0.5 → R1 必須轉紅
wallclock-diag-*.metrics.txt ＝ 條件 (d)：--wallclock=1 仍跑得起來（clock=wallclock）

md5（見 md5.txt）
  before s1  a736939c588e3f76b1a526219799e76b ×5   ← 5 跑逐位元組相同
  after  s1  cace748a7e08c4d5f44ff8af85847378 ×5   ← 5 跑逐位元組相同
  before s3  3328873cc2664863ba54e300a8cd2109 ×5
  after  s3  1d0db14c77d53fdbd885507a629064ca ×5

條件驗收
  (a) seed 1 改前改後並排：R1 兩邊 🟢、字級簽章逐位數相同；
      ★Δ200 5.85 → 4.31，R2 由 🔴 翻 🟢★（maskN 13→16、moved 5→3、ctrlMax 4.49→0.68）
  (b) seed 3 maskN 0 → 7（>0），5 跑逐位元組相同；moved 4→0
  (c) 突變 canary：res.R1=false（字級 13.6px < 27.2px ×5 筆），用備份副本還原、產品碼 diff 為空
  (d) --wallclock=1 保留，clock=wallclock，不進閘門
  (e) README 已寫（tests/tools/README.md「取樣時點」一節）

誠實記錄
  ・改後 seed 1 的 acct.noSil = 1：有一輪刺激在凍幀當下 figBox 回 null、拿不到剪影，
    在 judgePix 是靜默 continue 掉出統計的。本卷不改 judgePix（修訂六 ⑤ 的待辦），
    只把帳算完整：flashRuns(24) = maskN(16) + burnMaskN(4) + maskDropped(3) + noSil(1)。
    那一筆樣本仍然沒有被量到。
  ・這一改**提高通過機率**（這就是修訂六 ② 同意的內容）：§8.3 追出來讓 seed 1 判紅的那一筆
    （run 20、move200 = 13.8px）正是新閘門會擋掉的形狀。不是產品變好了，是取樣點換了。
