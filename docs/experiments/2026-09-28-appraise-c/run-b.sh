#!/bin/bash
# 第二批（run.sh 之後）：修正後的 #4 切換判定器、天命對齊後的盯上狀態等價、以及把第一階段／text-fit 的基準
# 換成 3cb06240（本卷起點＝面板 Y 已在、丙案未做）做歸因——區分「丙案造成」與「面板 Y（#5–#7，他卷）造成」。
cd /c/Users/shung/wt/yaoshi/v0592c
E=docs/experiments/2026-09-28-appraise-c; BASE=/c/Users/shung/wt/yaoshi/base592
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress.log; }
log run-b start HEAD=$(git rev-parse --short HEAD)
node tests/tools/appraise-switch.mjs --out $E --tag head --port 9961 > $E/switch-head.log 2>&1; log switch done
node tests/tools/appraise-mark-eq.mjs --base-root $BASE --out $E/mark-eq-raw.json --port 9951 > $E/mark-eq.log 2>&1
node tests/tools/appraise-c-judge.mjs $E/head-raw.json --mark $E/mark-eq-raw.json --out $E/head-judge.json > $E/head-judge.txt 2>&1; log markeq done
P=$E/vp; node tests/tools/visual-polish-probe.mjs --base 3cb06240 --tag base3cb --out $P --port 9975 > $E/vp-base3cb.log 2>&1
node tests/tools/visual-polish-p2-judge.mjs $P/probe-base3cb.json $P/probe-head.json --out $E/vp-judge-vs3cb.json > $E/vp-judge-vs3cb.txt 2>&1; log vp3cb done
node tests/tools/text-fit-probe.mjs --base 3cb06240 --out $E/textfit --tag base3cb > $E/tf-base3cb.log 2>&1; log textfit3cb done
log run-b ALL DONE
