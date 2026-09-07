#!/bin/sh
# 角色量法卷 第二批：c3／bm（n=10000）＋ M3 座位控制 ＋ aggr 鑑別力 ＋ PAPERWAR 對照 ＋ 被動生效計數
# 用法：sh tests/tools/role-measure-batch2.sh   （在 worktree 根目錄跑）
E=docs/experiments/2026-09-07-role-measure-evidence
R="qingmian hongyi duanshou shoujing hunter xiaonv lvshan zutou dangpu luzhu"

echo "== 2a: c3 + bm, n=10000 =="
for r in $R; do
  node tests/tools/role-measure.mjs --n=10000 --roles=$r --only=c3,bm --tag=$r-b2-n10000 --out=$E > $E/log-$r-b2-n10000.txt 2>&1 &
done
wait

echo "== 2b: M3 座位 2（前三／後三，n=10000）=="
for r in $SEAT2ROLES; do
  node tests/tools/role-measure.mjs --seat2 --n=10000 --roles=$r --tag=$r-n10000 --out=$E > $E/log-seat2-$r-n10000.txt 2>&1 &
done
wait

echo "== 2c: aggr 掃描（M1(b) 的鑑別力）n=10000 =="
for r in shoujing hongyi; do
  node tests/tools/role-measure.mjs --n=10000 --aggrsweep=0.3,0.7,1.0 --roles=$r --tag=aggr-$r-n10000 --out=$E > $E/log-aggr-$r-n10000.txt 2>&1 &
done
wait

echo "== 2d: PAPERWAR=0 對照（b / c2），n=10000 =="
for r in duanshou lvshan; do
  node tests/tools/role-measure.mjs --n=10000 --paperwar=0 --roles=$r --only=b,c2 --tag=pw0-$r-n10000 --out=$E > $E/log-pw0-$r-n10000.txt 2>&1 &
done
wait

echo "== 2e: 被動生效計數（n=2000，變體 b）=="
for r in $R; do
  node tests/tools/role-measure.mjs --n=2000 --eff --roles=$r --only=b --tag=eff-$r-n2000 --out=$E > $E/log-eff-$r-n2000.txt 2>&1 &
done
wait

echo "BATCH2 DONE"
