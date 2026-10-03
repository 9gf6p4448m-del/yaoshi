#!/bin/bash
cd "$(dirname "$0")"
B=http://127.0.0.1:9880/index.html
run(){ name=$1; shift; echo "### $name"; node probe.mjs "$@" --out raw/$name.json 2>&1 | tail -2 | cut -c1-260; }
# A. 乾淨重跑 live（剛才第一輪有一支殘留的閒置瀏覽器同時開著，已殺；此為對照）
run clean-live-none-cpu1-replay1   --net none   --cpu 1 --replay 1 --wait 60000
run clean-live-fast4g-cpu1-replay1 --net fast4g --cpu 1 --replay 1 --wait 120000
# B. 受控：本機 gzip 伺服器＋CDP 節流（RTT＝profile 延遲）
for net in fast4g slow4g; do
  run loc-$net-cpu1-base    --url $B --net $net --cpu 1 --wait 40000
  run loc-$net-cpu1-replay  --url "$B?proto=replay" --net $net --cpu 1 --wait 200000
  run loc-$net-cpu1-pre     --url "$B?proto=pre" --net $net --cpu 1 --wait 60000
  run loc-$net-cpu1-prerep  --url "$B?proto=pre,replay" --net $net --cpu 1 --wait 200000
  run loc-$net-cpu1-prerepglb --url "$B?proto=pre,replay,glb" --net $net --cpu 1 --wait 200000
  run loc-$net-cpu4-replay  --url "$B?proto=replay" --net $net --cpu 4 --wait 200000
  run loc-$net-cpu4-prerepglb --url "$B?proto=pre,replay,glb" --net $net --cpu 4 --wait 200000
done
echo ALLDONE2
