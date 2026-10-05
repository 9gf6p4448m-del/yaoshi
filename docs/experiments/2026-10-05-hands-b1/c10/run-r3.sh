# 條件 10：每幀手 CPU（hands.update），本機 Chromium 未節流；基準／新版交錯各 5 輪。
cd "$(dirname "$0")/.."
for i in 1 2 3 4 5; do
  timeout 900 node tools/perf-b1.mjs --root=C:/Users/shung/wt/yaoshi/hands-b1-base --tag=r3-base-$i --outdir=c10 | tail -1 >> c10/progress-r3.log
  timeout 900 node tools/perf-b1.mjs --root=C:/Users/shung/wt/yaoshi/hands-b1-impl --tag=r3-new-$i --outdir=c10 | tail -1 >> c10/progress-r3.log
done
echo DONE >> c10/progress-r3.log
