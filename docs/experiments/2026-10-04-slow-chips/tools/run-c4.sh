#!/bin/bash
# 條件 4 的整批跑法（依序、同時只一支瀏覽器治具）。bash run-c4.sh
N=C:/Users/shung/wt/yaoshi/slow-chips; B=C:/Users/shung/wt/yaoshi/slow-chips-base; O=$N/docs/experiments/2026-10-04-slow-chips/out
cd $N
for pair in "base:$B" "new:$N"; do tag=${pair%%:*}; root=${pair#*:}
  node tests/tools/hands-occlusion.mjs --root=$root --out=$O/c4a-occlusion-$tag.json > $O/c4a-occlusion-$tag.log 2>&1
  node tests/tools/hands-probe.mjs --root=$root --out=$O/c4a-probe-$tag.json > $O/c4a-probe-$tag.log 2>&1
done
for pair in "base:$B" "new:$N"; do tag=${pair%%:*}; root=${pair#*:}
  (cd $root && node tests/tools/table-framing-check.mjs --all --out=c4b-framing-$tag.json > $O/c4b-framing-$tag.log 2>&1; cp c4b-framing-$tag.json $O/ 2>/dev/null)
done
for scen in "solo-844x390|844x390|solo|qingmian" "solo-1280x720|1280x720|solo|qingmian" "hotseat-844x390|844x390|hotseat|qingmian,shoujing"; do IFS='|' read name vp mode picks <<< "$scen"
  for pair in "base|$B|" "new|$N|" "off|$N|handreal=0"; do IFS='|' read tag root q <<< "$pair"
    node tests/tools/hand-arm-holes.mjs --root=$root --vp=$vp --mode=$mode --picks=$picks --seed=101 --throttle=4 --natural=1 ${q:+--q=$q} --shotprefix=$O/c4c-$name-$tag --out=$O/c4c-$name-$tag.json > $O/c4c-$name-$tag.log 2>&1
  done
done
echo ALLDONE > $O/c4.done
