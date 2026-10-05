# 條件 6：遮擋（10-02 條件 5 同一治具）連跑 5 次。b1seats＝四席換成批 1 四角色（示意卷複製版，只加 --seats/--q）；natural＝tests/tools/hands-occlusion.mjs 原樣（開局自然座位）。
cd "$(dirname "$0")/.."
N=C:/Users/shung/wt/yaoshi/hands-b1-impl; B=C:/Users/shung/wt/yaoshi/hands-b1-base
for i in 2 3 4 5; do timeout 600 node tools/hands-occlusion-b1.mjs --root=$N --seats=qingmian,hongyi,duanshou,zutou --out=c6/occl-b1seats-$i.json > /dev/null 2>&1; echo "b1seats $i exit $?" >> c6/progress.log; done
for i in 1 2 3 4 5; do (cd $N && timeout 600 node tests/tools/hands-occlusion.mjs --root=$N --out=docs/experiments/2026-10-05-hands-b1/c6/occl-natural-$i.json > /dev/null 2>&1); echo "natural $i exit $?" >> c6/progress.log; done
for i in 1 2; do timeout 600 node tools/hands-occlusion-b1.mjs --root=$B --seats=qingmian,hongyi,duanshou,zutou --out=c6/base-occl-b1seats-$i.json > /dev/null 2>&1; echo "base b1seats $i exit $?" >> c6/progress.log; done
echo DONE >> c6/progress.log
