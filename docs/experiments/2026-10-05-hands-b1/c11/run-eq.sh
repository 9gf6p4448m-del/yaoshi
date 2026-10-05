# 條件 11 正式比對：同一個時鐘起點下，基準 4691a7ce 對 本卷各開關（每個起點都兩邊同起點）。
cd "$(dirname "$0")/.."
B=C:/Users/shung/wt/yaoshi/hands-b1-base; N=C:/Users/shung/wt/yaoshi/hands-b1-impl
for s in 4000 10000000 1000000 30000; do
  timeout 300 node tools/eq-frames.mjs --root=$B --tag=eq-base-$s --clock0=$s --outdir=c11 | tail -1 >> c11/progress2.log
  for r in 1 2 3; do timeout 300 node tools/eq-frames.mjs --root=$N --tag=eq-b1off-thumb0-$s-r$r --q="handb1=0&thumb=0" --clock0=$s --outdir=c11 | tail -1 >> c11/progress2.log; done
  timeout 300 node tools/eq-frames.mjs --root=$N --tag=eq-b1off-$s --q=handb1=0 --clock0=$s --outdir=c11 | tail -1 >> c11/progress2.log
  timeout 300 node tools/eq-frames.mjs --root=$N --tag=eq-default-$s --clock0=$s --outdir=c11 | tail -1 >> c11/progress2.log
  timeout 300 node tools/eq-frames.mjs --root=$N --tag=eq-thumb0-$s --q=thumb=0 --clock0=$s --outdir=c11 | tail -1 >> c11/progress2.log
done
echo DONE >> c11/progress2.log
