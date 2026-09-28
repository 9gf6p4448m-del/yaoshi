#!/bin/bash
# v0.59.2 丙案驗收全套（依序、一次只開一支瀏覽器治具；凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md）。
# 基準：86e4676（base592 工作樹）；#11 判紅基準：3cb06240（現行 0.59.2 鑑賞頁，v0592c-red 工作樹）。
# 用法：bash docs/experiments/2026-09-28-appraise-c/run.sh [步驟名...]（不給＝全部）
cd /c/Users/shung/wt/yaoshi/v0592c
E=docs/experiments/2026-09-28-appraise-c; mkdir -p $E
BASE=/c/Users/shung/wt/yaoshi/base592; RED=/c/Users/shung/wt/yaoshi/v0592c-red
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress.log; }
want(){ [ $# -eq 0 ] && return 0; }
STEPS="${*:-cprobe cred switch markeq contact perf vp textfit landscape suite}"
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
log start HEAD=$(git rev-parse --short HEAD) steps="$STEPS"
if has cprobe; then node tests/tools/appraise-c-probe.mjs --out $E --tag head --port 9941 --shots > $E/cprobe-head.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/head-raw.json --out $E/head-judge.json > $E/head-judge.txt 2>&1; log cprobe done; fi
if has cred; then node tests/tools/appraise-c-probe.mjs --root $RED --out $E --tag red3cb0 --vps V1,V4 --modes solo,hot --phases bid --port 9943 > $E/cprobe-red.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/red3cb0-raw.json --out $E/red3cb0-judge.json > $E/red3cb0-judge.txt 2>&1; log cred done; fi
if has switch; then node tests/tools/appraise-switch.mjs --out $E --tag head --port 9961 > $E/switch-head.log 2>&1; log switch done; fi
if has markeq; then node tests/tools/appraise-mark-eq.mjs --base-root $BASE --out $E/mark-eq-raw.json --port 9951 > $E/mark-eq.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/head-raw.json --mark $E/mark-eq-raw.json --out $E/head-judge.json > $E/head-judge.txt 2>&1; log markeq done; fi
if has contact; then mkdir -p $E/contact
  node tests/tools/appraise-contact.mjs --tag head --out $E/contact --port 9971 > $E/contact-head.log 2>&1
  node tests/tools/appraise-contact.mjs --tag base --root $BASE --out $E/contact --port 9972 > $E/contact-base.log 2>&1
  python tests/tools/appraise-c-sheet.py $E/contact $E/contact-appraise-c.png > $E/contact-sheet.log 2>&1; log contact done; fi
if has perf; then node tests/tools/appraise-perf-probe.mjs --out $E/perf-head.json --port 9973 > $E/perf-head.log 2>&1
  node tests/tools/appraise-perf-probe.mjs --root $BASE --table-only --out $E/perf-base.json --port 9974 > $E/perf-base.log 2>&1; log perf done; fi
if has vp; then P=$E/vp; mkdir -p $P
  node tests/tools/visual-polish-probe.mjs --base 86e46763 --tag base --out $P --port 9975 > $E/vp-base.log 2>&1
  node tests/tools/visual-polish-probe.mjs --tag head --out $P --port 9976 > $E/vp-head.log 2>&1
  node tests/tools/visual-polish-p2-judge.mjs $P/probe-base.json $P/probe-head.json --out $E/vp-judge.json > $E/vp-judge.txt 2>&1
  node tests/tools/rail-tabs-align-recalc.mjs $P/probe-base.json $P/probe-head.json > $E/vp-railtabs.txt 2>&1; log vp done; fi
if has textfit; then node tests/tools/text-fit-probe.mjs --base 86e46763 --out $E/textfit --tag base --port 9977 > $E/tf-base.log 2>&1
  node tests/tools/text-fit-probe.mjs --out $E/textfit --tag head --port 9978 > $E/tf-head.log 2>&1; log textfit done; fi
if has landscape; then node tests/tools/landscape-fit-probe.mjs --base 86e46763 --out $E/landscape --tag base --port 9979 > $E/lf-base.log 2>&1
  node tests/tools/landscape-fit-probe.mjs --out $E/landscape --tag head --port 9980 > $E/lf-head.log 2>&1; log landscape done; fi
if has suite; then node --test tests/*.test.mjs > $E/suite.txt 2>&1; log suite done; fi
log ALL DONE
