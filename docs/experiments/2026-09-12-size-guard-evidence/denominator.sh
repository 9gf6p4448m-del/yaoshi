#!/bin/sh
# 分母掃描（2026-09-12 尺寸防線卷）。跑法：sh docs/experiments/2026-09-12-size-guard-evidence/denominator.sh
# 目的：裝防線之前先數出「對徽記 mesh 做縮放」這個危險動作在 repo 有幾個入口（02 §6.1 第 7 條）。
set -e
echo "== 1. js/trait-fx/ 下所有 scale 寫法（含 23 支未改招的 ring／disc／orb，不是全部都屬於徽記）=="
for p in '\.scale\.setScalar\(' '\.scale\.set\(' '\.scale\.multiplyScalar\(' '\.scale\.[xyz][ 	]*[-+*/]?=' '\.scale\.(copy|setX|setY|setZ|setComponent|fromArray|lerp|multiply|applyMatrix4)\('; do
  n=$(grep -rnE "$p" js/trait-fx/ | wc -l)
  echo "  $p  → $n 處"
done
echo
echo "== 2. 徽記入口的呼叫點（st.icon／st.icons／st.mark）=="
grep -rnE 'st\.(icon|icons|mark)\(' js/trait-fx/zuling.js js/trait-fx/xianghuo.js js/trait-fx/yinqi.js || true
echo
echo "== 3. 編舞裡引用 ICON 尺寸來源的地方（＝徽記 mesh 真正被縮放的那幾處）=="
grep -rnE 'st\.(iconSize|iconFlatSize|markSize)|st\.iconScale\(' js/trait-fx/zuling.js js/trait-fx/xianghuo.js js/trait-fx/yinqi.js || true
echo
echo "== 4. 直接碰徽記 mesh 的 .scale（收斂之後這一項必須是 0）=="
grep -rnE '(knife|bell|seal|stamp|guard|marks|stain|F\.mesh|m2)[^;]*\.scale' js/trait-fx/zuling.js js/trait-fx/xianghuo.js js/trait-fx/yinqi.js || echo "  （0 處）"
echo
echo "== 5. js/trait-fx.js（積木本身）裡對徽記 mesh 的 scale 寫入 =="
grep -nE '\.scale\.(setScalar|set|copy|multiplyScalar)\(' js/trait-fx.js || true
