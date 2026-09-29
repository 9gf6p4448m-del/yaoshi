#!/bin/bash
# 第四批（09-30，#8(b) 戰況收緊＋#11(h) 鏡框連珠／鏡面反光＋#11(g′)(j)(k) 卷軸題字與「對你而言」之後）：
# 全部在同一個 HEAD 一次跑完，依序、一次只開一支瀏覽器治具。基準 86e4676 的 vp／text-fit 原始量測沿用 run.sh 的 probe-base.json（基準碼沒變）。
# 用法：TAG=head4 bash docs/experiments/2026-09-28-appraise-c/run-d.sh [步驟名...]（不給＝全部）
cd /c/Users/shung/wt/yaoshi/v0592c
E=docs/experiments/2026-09-28-appraise-c; BASE=/c/Users/shung/wt/yaoshi/base592; T=${TAG:-head4}
MOCK=/c/Users/shung/wt/yaoshi/phase2-mock/appraise
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress.log; }
STEPS="${*:-plain panels cprobe markeq switch youk contact perf vp textfit landscape suite}"
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
log run-d start HEAD=$(git rev-parse --short HEAD) dirty=$(git status --porcelain --untracked-files=no | wc -l) steps="$STEPS"
if has plain; then node tests/tools/appraise-plain-check.mjs --out $E/plain-check-$T.json > $E/plain-check-$T.txt 2>&1; log plain done; fi
if has panels; then mkdir -p $E/panels4; node tests/tools/panels-probe.mjs --vps V1,V2,V3,V4,V5 --modes solo,hot --nights 5 --out $E/panels4 --port 9821 > $E/panels4/panels.log 2>&1; log panels done; fi
if has cprobe; then node tests/tools/appraise-c-probe.mjs --out $E --tag $T --port 9941 --shots > $E/cprobe-$T.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/$T-raw.json --out $E/$T-judge.json > $E/$T-judge.txt 2>&1; log cprobe done; fi
if has markeq; then node tests/tools/appraise-mark-eq.mjs --base-root $BASE --out $E/mark-eq-$T-raw.json --port 9951 > $E/mark-eq-$T.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/$T-raw.json --mark $E/mark-eq-$T-raw.json --out $E/$T-judge.json > $E/$T-judge.txt 2>&1; log markeq done; fi
if has switch; then node tests/tools/appraise-switch.mjs --out $E --tag $T --port 9961 > $E/switch-$T.log 2>&1; log switch done; fi
if has youk; then node tests/tools/appraise-you-k.mjs --out $E/you-k-$T.json --port 9981 > $E/you-k-$T.log 2>&1; log youk done; fi
if has contact; then C=$E/contact4; mkdir -p $C
  node tests/tools/appraise-contact.mjs --tag head --slots 1,3 --out $C --port 9971 > $E/contact4-head.log 2>&1
  node tests/tools/appraise-contact.mjs --tag base --slots 1,3 --root $BASE --out $C --port 9972 > $E/contact4-base.log 2>&1
  python tests/tools/appraise-c-sheet.py $C $E/contact-appraise-c4.png > $E/contact4-sheet.log 2>&1
  python tests/tools/appraise-signoff-sheet.py $C $MOCK $E/signoff >> $E/contact4-sheet.log 2>&1; log contact done; fi
if has perf; then node tests/tools/appraise-perf-probe.mjs --out $E/perf-$T.json --port 9973 > $E/perf-$T.log 2>&1; log perf done; fi
if has vp; then P=$E/vp
  node tests/tools/visual-polish-probe.mjs --tag $T --out $P --port 9976 > $E/vp-$T.log 2>&1
  node tests/tools/visual-polish-p2-judge.mjs $P/probe-base.json $P/probe-$T.json --out $E/vp-judge-$T.json > $E/vp-judge-$T.txt 2>&1; log vp done; fi
if has textfit; then node tests/tools/text-fit-probe.mjs --out $E/textfit --tag $T > $E/tf-$T.log 2>&1; log textfit done; fi
if has vp || has textfit; then
  node tests/tools/appraise-common-cells.mjs --tf-base $E/textfit/probe-base.json --tf-head $E/textfit/probe-$T.json --vp-base $E/vp/probe-base.json --vp-head $E/vp/probe-$T.json --out $E/common-cells-$T.json > $E/common-cells-$T.txt 2>&1; fi
if has landscape; then node tests/tools/landscape-fit-probe.mjs --out $E/landscape --tag $T --port 9980 > $E/lf-$T.log 2>&1; log landscape done; fi
if has suite; then
  # 全套在「CRLF 取出」的乾淨工作樹跑（本卷工具若以 LF 重寫 index.html 會讓 l1-destiny-focus 錨點不符，見 README 第三批）
  # 每次開一棵新的（帶 HEAD 短 SHA）；不自動刪——樹裡的 tools 是接到本樹的 junction，遞迴刪除有穿過 junction 的風險
  H=$(git rev-parse --short HEAD); W=/c/Users/shung/wt/yaoshi/v0592c-suite-$H
  [ -d $W ] || git worktree add --detach $W $H > /dev/null 2>&1
  [ -e $W/tools ] || powershell -NoProfile -Command "New-Item -ItemType Junction -Path 'C:/Users/shung/wt/yaoshi/v0592c-suite-$H/tools' -Target 'C:/Users/shung/wt/yaoshi/v0592c/tools' | Out-Null"
  (cd $W && node --test tests/*.test.mjs) > $E/suite-$T-crlf.txt 2>&1
  node tests/tools/trace-eq.mjs ../base592/index.html index.html > $E/trace-eq-$T.txt 2>&1; log suite done; fi
log run-d ALL DONE
