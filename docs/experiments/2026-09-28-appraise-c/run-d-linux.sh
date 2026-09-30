#!/bin/bash
# run-d.sh 的雲端 Linux 版（09-30 起）。步驟、矩陣、判定器與 run-d.sh 相同；只改環境：
#   · root＝本 repo（git rev-parse），BASE＝../base592（86e46763 detached worktree，tools 以 symlink 接本樹）
#   · MOCK＝卷內 cloud-reference/（示意乙 b-west／b-east，判準圖不替換）
#   · python → python3；suite 段 junction → symlink
#   · 瀏覽器環境：source tools/cloud-env/env.sh（未追蹤；見 README「雲端 Linux 環境」）
#   · 基準 86e4676 的 vp／text-fit／landscape／perf／contact 在同一 Linux 環境重量（tag linuxbase）：
#     Windows 的 probe-base.json 是另一套字型與 Chromium 量的，不能和 Linux 的 head 逐格比。
# 用法：TAG=cloud1 bash docs/experiments/2026-09-28-appraise-c/run-d-linux.sh [步驟名...]（不給＝全部）
set -u
ROOT=$(git rev-parse --show-toplevel); cd "$ROOT"
E=docs/experiments/2026-09-28-appraise-c; BASE=${BASE:-$(cd "$ROOT/.." && pwd)/base592}; T=${TAG:-cloud1}; BT=linuxbase
MOCK=$E/cloud-reference
source "$ROOT/tools/cloud-env/env.sh"
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress-linux.log; }
STEPS="${*:-plain panels cprobe markeq switch youk contact perf vpbase vp tfbase textfit common lfbase landscape suite}"
has(){ case " $STEPS " in *" $1 "*) return 0;; esac; return 1; }
log run-d-linux start HEAD=$(git rev-parse --short HEAD) BASE=$(git -C $BASE rev-parse --short HEAD) dirty=$(git status --porcelain --untracked-files=no | wc -l) steps="$STEPS" chromium=$(ls -l tools/cloud-env/pwb/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell | sed 's/.*-> //')
if has plain; then node tests/tools/appraise-plain-check.mjs --out $E/plain-check-$T.json > $E/plain-check-$T.txt 2>&1; log plain done; fi
if has panels; then mkdir -p $E/panels-$T; node tests/tools/panels-probe.mjs --vps V1,V2,V3,V4,V5 --modes solo,hot --nights 5 --out $E/panels-$T --port 9821 > $E/panels-$T/panels.log 2>&1; log panels done; fi
if has cprobe; then node tests/tools/appraise-c-probe.mjs --out $E --tag $T --port 9941 --shots > $E/cprobe-$T.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/$T-raw.json --out $E/$T-judge.json > $E/$T-judge.txt 2>&1; log cprobe done; fi
if has markeq; then node tests/tools/appraise-mark-eq.mjs --base-root $BASE --out $E/mark-eq-$T-raw.json --port 9951 > $E/mark-eq-$T.log 2>&1
  node tests/tools/appraise-c-judge.mjs $E/$T-raw.json --mark $E/mark-eq-$T-raw.json --out $E/$T-judge.json > $E/$T-judge.txt 2>&1; log markeq done; fi
if has switch; then node tests/tools/appraise-switch.mjs --out $E --tag $T --port 9961 > $E/switch-$T.log 2>&1; log switch done; fi
if has youk; then node tests/tools/appraise-you-k.mjs --out $E/you-k-$T.json --port 9981 > $E/you-k-$T.log 2>&1; log youk done; fi
if has contact; then C=$E/contact-$T; mkdir -p $C
  node tests/tools/appraise-contact.mjs --tag head --slots 1,3 --out $C --port 9971 > $E/contact-$T-head.log 2>&1
  node tests/tools/appraise-contact.mjs --tag base --slots 1,3 --root $BASE --out $C --port 9972 > $E/contact-$T-base.log 2>&1
  python3 tests/tools/appraise-c-sheet.py $C $E/contact-appraise-$T.png > $E/contact-$T-sheet.log 2>&1
  python3 tests/tools/appraise-signoff-sheet.py $C $MOCK $E/signoff-$T >> $E/contact-$T-sheet.log 2>&1; log contact done; fi
if has perf; then node tests/tools/appraise-perf-probe.mjs --out $E/perf-$T.json --port 9973 > $E/perf-$T.log 2>&1
  node tests/tools/appraise-perf-probe.mjs --root $BASE --table-only --out $E/perf-$BT.json --port 9974 > $E/perf-$BT.log 2>&1; log perf done; fi
if has vpbase; then node tests/tools/visual-polish-probe.mjs --base 86e46763 --tag $BT --out $E/vp --port 9975 > $E/vp-$BT.log 2>&1; log vpbase done; fi
if has vp; then P=$E/vp
  node tests/tools/visual-polish-probe.mjs --tag $T --out $P --port 9976 > $E/vp-$T.log 2>&1
  node tests/tools/visual-polish-p2-judge.mjs $P/probe-$BT.json $P/probe-$T.json --out $E/vp-judge-$T.json > $E/vp-judge-$T.txt 2>&1; log vp done; fi
if has tfbase; then node tests/tools/text-fit-probe.mjs --base 86e46763 --out $E/textfit --tag $BT --port 9977 > $E/tf-$BT.log 2>&1; log tfbase done; fi
if has textfit; then node tests/tools/text-fit-probe.mjs --out $E/textfit --tag $T > $E/tf-$T.log 2>&1; log textfit done; fi
if has common; then
  node tests/tools/appraise-common-cells.mjs --tf-base $E/textfit/probe-$BT.json --tf-head $E/textfit/probe-$T.json --vp-base $E/vp/probe-$BT.json --vp-head $E/vp/probe-$T.json --out $E/common-cells-$T.json > $E/common-cells-$T.txt 2>&1; log common done; fi
if has lfbase; then node tests/tools/landscape-fit-probe.mjs --base 86e46763 --out $E/landscape --tag $BT --port 9979 > $E/lf-$BT.log 2>&1; log lfbase done; fi
if has landscape; then node tests/tools/landscape-fit-probe.mjs --out $E/landscape --tag $T --port 9980 > $E/lf-$T.log 2>&1; log landscape done; fi
if has suite; then
  # 全套在「CRLF 取出」的乾淨工作樹跑（run-d.sh 同一理由）；Linux 以 core.autocrlf=true 取出、tools 用 symlink
  H=$(git rev-parse --short HEAD); W=$(cd "$ROOT/.." && pwd)/yaoshi-suite-$H
  [ -d $W ] || git -c core.autocrlf=true worktree add --detach $W $H > /dev/null 2>&1
  [ -e $W/tools ] || ln -s "$ROOT/tools" $W/tools
  log suite tree $W index.html=$(file -b $W/index.html | grep -o 'CRLF' || echo LF)
  (cd $W && node --test tests/*.test.mjs) > $E/suite-$T-crlf.txt 2>&1
  node tests/tools/trace-eq.mjs $BASE/index.html index.html > $E/trace-eq-$T.txt 2>&1; log suite done; fi
log run-d-linux ALL DONE
