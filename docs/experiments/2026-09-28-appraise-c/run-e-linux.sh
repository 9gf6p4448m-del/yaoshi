#!/bin/bash
# 可續跑版（10-01，雲端容器會不定時重啟，單次 4 小時長跑撐不住）：
#   鑑賞主矩陣、盯上等價、切換矩陣、固定種子 text-fit 全部切成「模式×視口」小塊，每塊做完留 chunks/<名>.done，
#   重啟後再執行同一支指令只補沒做完的塊。矩陣、判定器、門檻與 run-d-linux.sh 相同，只是切塊＋最後合併再判。
# 用法：bash docs/experiments/2026-09-28-appraise-c/run-e-linux.sh   （重複執行安全）
set -u
ROOT=$(git rev-parse --show-toplevel); cd "$ROOT"
E=docs/experiments/2026-09-28-appraise-c; BASE=${BASE:-$(cd "$ROOT/.." && pwd)/base592}; T=cloud2
source "$ROOT/tools/cloud-env/env.sh"
mkdir -p $E/chunks
log(){ echo "[$(date +%H:%M:%S)] $*" | tee -a $E/progress-linux.log; }
# CH <名> <命令...>：已完成就跳過；成功才留標記
CH(){ local n=$1; shift; [ -e "$E/chunks/$n.done" ] && return 0; log "chunk $n start"; if "$@"; then touch "$E/chunks/$n.done"; log "chunk $n done"; else log "chunk $n FAILED"; return 1; fi; }
VPS="V1 V2 V3 V4 V5"; MODES="solo hot"
log run-e start HEAD=$(git rev-parse --short HEAD)
for m in $MODES; do for v in $VPS; do
  CH c-$m-$v node tests/tools/appraise-c-probe.mjs --out $E --tag $T-$m-$v --port 9941 --shots --vps $v --modes $m > $E/chunks/c-$m-$v.log 2>&1
done; done
for m in $MODES; do for v in $VPS; do
  CH mk-$m-$v node tests/tools/appraise-mark-eq.mjs --base-root $BASE --out $E/chunks/markeq-$m-$v.json --port 9951 --vps $v --modes $m > $E/chunks/mk-$m-$v.log 2>&1
done; done
for m in $MODES; do for v in $VPS; do
  CH sw-$m-$v node tests/tools/appraise-switch.mjs --out $E --tag $T-$m-$v --port 9961 --vps $v --modes $m > $E/chunks/sw-$m-$v.log 2>&1
done; done
for m in solo hot nw1 nw2 nw3; do
  CH sb-$m node tests/tools/text-fit-probe.mjs --base 86e46763 --nw-seed 3 --modes $m --out $E/chunks --tag sb-$m --port 9977 > $E/chunks/sb-$m.log 2>&1
done
for m in solo hot nw1 nw2 nw3; do
  CH sh-$m node tests/tools/text-fit-probe.mjs --nw-seed 3 --modes $m --out $E/chunks --tag sh-$m --port 9978 > $E/chunks/sh-$m.log 2>&1
done
# 合併＋判定（冪等）
node - <<'EOF'
const fs = require('fs'); const E = 'docs/experiments/2026-09-28-appraise-c';
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const merge = (files, keys) => { const out = {}; for (const f of files) { const j = rd(f); for (const [k, v] of Object.entries(j)) { if (Array.isArray(v)) out[k] = (out[k] || []).concat(v); else if (v && typeof v === 'object' && keys.includes(k)) out[k] = Object.assign(out[k] || {}, v); else if (!(k in out)) out[k] = v; } } return out; };
const ls = (re) => fs.readdirSync(E).filter((x) => re.test(x)).map((x) => E + '/' + x);
const c = ls(/^cloud2-(solo|hot)-V\d-raw\.json$/); if (c.length) { const m = merge(c, []); m.tag = 'cloud2'; fs.writeFileSync(E + '/cloud2-raw.json', JSON.stringify(m)); console.log('cprobe chunks', c.length, 'cases', (m.cases || []).length); }
const k = fs.readdirSync(E + '/chunks').filter((x) => /^markeq-.*\.json$/.test(x)).map((x) => E + '/chunks/' + x); if (k.length) { const m = merge(k, []); fs.writeFileSync(E + '/mark-eq-cloud2-raw.json', JSON.stringify(m)); console.log('markeq chunks', k.length, Object.keys(m)); }
const s = ls(/^switch-cloud2-(solo|hot)-V\d-raw\.json$/); if (s.length) { const m = merge(s, []); m.tag = 'cloud2'; fs.writeFileSync(E + '/switch-cloud2-raw.json', JSON.stringify(m)); console.log('switch chunks', s.length); }
for (const [pre, out] of [['sb', 'probe-seedbase.json'], ['sh', 'probe-seedhead.json']]) { const f = fs.readdirSync(E + '/chunks').filter((x) => new RegExp('^probe-' + pre + '-.*\\.json$').test(x)).map((x) => E + '/chunks/' + x); if (!f.length) continue; const m = merge(f, ['cells', 'pageErrors']); fs.mkdirSync(E + '/textfit', { recursive: true }); fs.writeFileSync(E + '/textfit/' + out, JSON.stringify(m)); console.log(out, 'chunks', f.length, 'cells', Object.keys(m.cells || {}).length); }
EOF
[ -s $E/cloud2-raw.json ] && node tests/tools/appraise-c-judge.mjs $E/cloud2-raw.json $( [ -s $E/mark-eq-cloud2-raw.json ] && echo --mark $E/mark-eq-cloud2-raw.json ) --out $E/cloud2-judge.json > $E/cloud2-judge.txt 2>&1
[ -s $E/textfit/probe-seedbase.json ] && [ -s $E/textfit/probe-seedhead.json ] && node tests/tools/appraise-common-cells.mjs --tf-base $E/textfit/probe-seedbase.json --tf-head $E/textfit/probe-seedhead.json --out $E/common-cells-seeded.json > $E/common-cells-seeded.txt 2>&1
log run-e finalize done
ls $E/chunks/*.done | wc -l | xargs -I{} echo "chunks done: {}/40" | tee -a $E/progress-linux.log
