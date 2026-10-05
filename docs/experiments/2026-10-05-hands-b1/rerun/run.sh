# 第二輪（46f43171＋d0282ca9＋94e47f68）重跑：條件 2/4/9/11 → 條件 10 三批 → 條件 6 補跑 5 次（保留 stderr）。一次一支瀏覽器，依序。
cd "$(dirname "$0")/.."
N=C:/Users/shung/wt/yaoshi/hands-b1-impl; B=C:/Users/shung/wt/yaoshi/hands-b1-base; S=C:/Users/shung/AppData/Local/Temp/claude/C--Users-shung/6d0fa9b9-5717-4e07-aa63-1f363a9e9b09/scratchpad/c2f
log=rerun/progress.log
for t in r2new1 r2new2; do timeout 900 node tools/c2-pixels.mjs --root=$N --tag=$t --out=$S > rerun/c2-$t.log 2>&1; echo "c2 $t exit $?" >> $log; done
timeout 1200 node tools/thumb-b1.mjs --root=$N --tag=r2new --out=rerun > rerun/c4.log 2>&1; echo "c4 exit $?" >> $log
timeout 900 node tools/detail-b1.mjs --root=$N --tag=r2new --out=rerun --hands=hongyi,duanshou > rerun/c9.log 2>&1; echo "c9 exit $?" >> $log
for s in 4000 10000000; do
  timeout 300 node tools/eq-frames.mjs --root=$N --tag=r2-default-$s --clock0=$s --outdir=rerun >> rerun/c11.log 2>&1; echo "eq default $s exit $?" >> $log
  for r in 1 2 3; do timeout 300 node tools/eq-frames.mjs --root=$N --tag=r2-b1off-thumb0-$s-r$r --q="handb1=0&thumb=0" --clock0=$s --outdir=rerun >> rerun/c11.log 2>&1; echo "eq b1off-thumb0 $s r$r exit $?" >> $log; done
  timeout 300 node tools/eq-frames.mjs --root=$N --tag=r2-b1off-$s --q=handb1=0 --clock0=$s --outdir=rerun >> rerun/c11.log 2>&1; echo "eq b1off $s exit $?" >> $log
done
for b in a b c; do for i in 1 2 3 4 5; do
  timeout 900 node tools/perf-b1.mjs --root=$B --tag=r4$b-base-$i --outdir=c10 > /dev/null 2>> rerun/c10.err; echo "perf $b base $i exit $?" >> $log
  timeout 900 node tools/perf-b1.mjs --root=$N --tag=r4$b-new-$i --outdir=c10 > /dev/null 2>> rerun/c10.err; echo "perf $b new $i exit $?" >> $log
done; done
for i in 11 12 13 14 15; do timeout 600 node tools/hands-occlusion-b1.mjs --root=$N --seats=qingmian,hongyi,duanshou,zutou --out=c6/occl-b1seats-$i.json > c6/occl-b1seats-$i.log 2>&1; echo "occl $i exit $?" >> $log; done
echo DONE >> $log
