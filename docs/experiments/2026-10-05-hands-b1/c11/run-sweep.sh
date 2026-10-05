# 條件 11 波動歸因：同一棵基準樹（4691a7ce）、同一支治具，只改手動時鐘起點。
cd "$(dirname "$0")/.."
B=C:/Users/shung/wt/yaoshi/hands-b1-base
for i in 2 3 4 5 6; do timeout 300 node tools/eq-frames.mjs --root=$B --tag=base-perf-$i --outdir=c11 | tail -1 >> c11/progress.log; done
for i in 1 2 3; do timeout 300 node tools/eq-frames.mjs --root=$B --tag=base-fix1e7-$i --clock0=10000000 --outdir=c11 | tail -1 >> c11/progress.log; done
for k in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do v=$(python -c "print(4000+$k*0.137)"); timeout 300 node tools/eq-frames.mjs --root=$B --tag=base-sweep-$k --clock0=$v --outdir=c11 | tail -1 >> c11/progress.log; done
echo DONE >> c11/progress.log
