#!/bin/bash
# v0.59.1 驗收全套（主對話 2026-09-27 起跑）。基準 5dfa1b1，改後＝工作樹 HEAD。
cd /c/Users/shung/wt/yaoshi/p2; echo $$ > /tmp/run591.pid
E=docs/experiments/2026-09-27-card-dock-font/run; P=$E/probe; mkdir -p $P
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress.log; }
log start HEAD=$(git rev-parse --short HEAD)
mkdir -p $E/card-dock; node tests/tools/card-dock-probe.mjs --out $E/card-dock --port 9681 > $E/card-dock.log 2>&1
node tests/tools/card-dock-judge.mjs $E/card-dock/card-dock-raw.json > $E/card-dock-judge.txt 2>&1; log card-dock done
for side in base head; do
  pids=(); i=0
  for m in solo hot nw1 nw2 nw3; do
    b=""; [ $side = base ] && b="--base 5dfa1b1"
    node tests/tools/visual-polish-probe.mjs $b --modes $m --tag $side-$m --out $P --port $((9690+i)) > $E/vp-$side-$m.log 2>&1 & pids+=($!); i=$((i+1))
  done
  wait "${pids[@]}"; log vp $side done
  node tests/tools/visual-polish-probe.mjs --merge $(ls $P/probe-$side-*.json | grep -v merged | paste -sd,) --tag $side-merged --out $P > $E/vp-$side-merge.log 2>&1
done
node tests/tools/visual-polish-p2-judge.mjs $P/probe-base-merged.json $P/probe-head-merged.json --out $E/vp-judge.json > $E/vp-judge.txt 2>&1
node tests/tools/rail-tabs-align-recalc.mjs $P/probe-base-merged.json $P/probe-head-merged.json > $E/railtabs.txt 2>&1; log vp judged
node tests/tools/text-fit-probe.mjs --base 5dfa1b1 --out $E/textfit --tag base > $E/tf-base.log 2>&1
node tests/tools/text-fit-probe.mjs --out $E/textfit --tag head > $E/tf-head.log 2>&1; log textfit done
node tests/tools/landscape-fit-probe.mjs --base 5dfa1b1 --out $E/landscape --tag base > $E/lf-base.log 2>&1
node tests/tools/landscape-fit-probe.mjs --out $E/landscape --tag head > $E/lf-head.log 2>&1; log landscape done
node tests/tools/north-camera-probe.mjs --base 5dfa1b1 --out $E/north-camera-head.json > $E/nc-head.log 2>&1; log north-camera done
node tests/tools/gl-frame-probe.mjs --out=$E/gl-frame-head.json > $E/gl-head.log 2>&1; (cd /c/Users/shung/wt/yaoshi/base591 && node tests/tools/gl-frame-probe.mjs --out=gl-frame-base.json > /c/Users/shung/wt/yaoshi/p2/$E/gl-base.log 2>&1; cp gl-frame-base.json /c/Users/shung/wt/yaoshi/p2/$E/ 2>/dev/null); log gl-frame done
node --test tests/*.test.mjs > $E/suite.txt 2>&1; log suite done
log ALL DONE
