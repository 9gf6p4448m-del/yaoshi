#!/bin/bash
# 第三批（09-29，面板 Y 可讀性修補＋照妖鏡亮度 #11(f) 之後）：全部在同一個 HEAD 重跑，依序、一次只開一支瀏覽器治具。
# 基準 86e4676 的 vp／text-fit／landscape 原始量測沿用 run.sh 的 probe-base.json（基準碼沒變）。
# 用法：bash docs/experiments/2026-09-28-appraise-c/run-c.sh [步驟名...]（不給＝全部）
cd /c/Users/shung/wt/yaoshi/v0592c
E=docs/experiments/2026-09-28-appraise-c; BASE=/c/Users/shung/wt/yaoshi/base592; T=${TAG:-head2}
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress.log; }
STEPS="${*:-panels cprobe markeq switch contact perf vp textfit landscape suite}"
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
log run-c start HEAD=$(git rev-parse --short HEAD) steps="$STEPS"
if has panels; then mkdir -p $E/panels; node tests/tools/panels-probe.mjs --vps V1,V2,V3,V4,V5 --modes solo,hot --nights 5 --out $E/panels --port 9821 > $E/panels/panels.log 2>&1; log panels done; fi
if has cprobe; then node tests/tools/appraise-c-probe.mjs --out $E --tag $T --port 9941 --shots > $E/cprobe-$T.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/$T-raw.json --out $E/$T-judge.json > $E/$T-judge.txt 2>&1; log cprobe done; fi
if has markeq; then node tests/tools/appraise-mark-eq.mjs --base-root $BASE --out $E/mark-eq-$T-raw.json --port 9951 > $E/mark-eq-$T.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/$T-raw.json --mark $E/mark-eq-$T-raw.json --out $E/$T-judge.json > $E/$T-judge.txt 2>&1; log markeq done; fi
if has switch; then node tests/tools/appraise-switch.mjs --out $E --tag $T --port 9961 > $E/switch-$T.log 2>&1; log switch done; fi
if has contact; then mkdir -p $E/contact2
  node tests/tools/appraise-contact.mjs --tag head --out $E/contact2 --port 9971 > $E/contact2-head.log 2>&1
  cp $E/contact/base-* $E/contact2/ 2>/dev/null
  python tests/tools/appraise-c-sheet.py $E/contact2 $E/contact-appraise-c2.png > $E/contact2-sheet.log 2>&1; log contact done; fi
if has perf; then node tests/tools/appraise-perf-probe.mjs --out $E/perf-$T.json --port 9973 > $E/perf-$T.log 2>&1; log perf done; fi
if has vp; then P=$E/vp
  node tests/tools/visual-polish-probe.mjs --tag $T --out $P --port 9976 > $E/vp-$T.log 2>&1
  node tests/tools/visual-polish-p2-judge.mjs $P/probe-base.json $P/probe-$T.json --out $E/vp-judge-$T.json > $E/vp-judge-$T.txt 2>&1; log vp done; fi
if has textfit; then node tests/tools/text-fit-probe.mjs --out $E/textfit --tag $T > $E/tf-$T.log 2>&1; log textfit done; fi
if has landscape; then node tests/tools/landscape-fit-probe.mjs --out $E/landscape --tag $T --port 9980 > $E/lf-$T.log 2>&1; log landscape done; fi
if has suite; then node --test tests/*.test.mjs > $E/suite-$T.txt 2>&1; node tests/tools/trace-eq.mjs ../base592/index.html index.html > $E/trace-eq-$T.txt 2>&1; log suite done; fi
log run-c ALL DONE
