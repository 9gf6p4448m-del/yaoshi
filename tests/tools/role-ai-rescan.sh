#!/usr/bin/env bash
# 角色平衡卷二版 ③ AI 風格重掃（2026-09-07，使用者裁定放寬格點）
#   格點：aggr∈{0.3,0.45,0.6,0.8,1.0} × spite∈{0.1,0.25,0.4} × markReact∈{avoid,ignore,contest}
#   ＋各角色原值必列為候選（青面 .85/.25/contest、閭山 .5/.2/ignore 不在格點上，另外加跑）
# 跑法：bash tests/tools/role-ai-rescan.sh <輸出目錄> <n> <並行數>
set -u
OUT="${1:-docs/experiments/2026-09-07-role-balance-evidence/scan-v2}"
N="${2:-2000}"
PAR="${3:-14}"
mkdir -p "$OUT"
i=0
run() {  # run <role> <aggr> <spite> <markReact>
  local r=$1 a=$2 sp=$3 mk=$4
  local t="$r-a$a-s$sp-$mk"
  [ -s "$OUT/log-$t.txt" ] && grep -q 勝率 "$OUT/log-$t.txt" && return   # 已跑過就跳過（可續跑）
  node tests/tools/role-measure.mjs --n="$N" --roles="$r" --only=b \
    --ai="$r:$a/$sp/$mk" --tag="scanv2-$t" --out="$OUT" > "$OUT/log-$t.txt" 2>&1 &
  i=$((i+1)); [ $((i % PAR)) -eq 0 ] && wait
}
for r in qingmian duanshou lvshan dangpu; do
  for a in 0.3 0.45 0.6 0.8 1.0; do
    for sp in 0.1 0.25 0.4; do
      for mk in avoid ignore contest; do run "$r" "$a" "$sp" "$mk"; done
    done
  done
done
# 各角色原值（不在格點上的兩個；另兩隻的原值已含在格點內）
run qingmian 0.85 0.25 contest
run lvshan   0.5  0.2  ignore
wait
echo "RESCAN_DONE $(ls "$OUT"/log-*.txt | wc -l) 組"
