#!/bin/bash
cd "$(dirname "$0")"
B=http://127.0.0.1:9880/index.html
BL='fonts\.(googleapis|gstatic)\.com|/audio/bgm/'
run(){ name=$1; shift; echo "### $name"; node probe.mjs "$@" --out raw/$name.json 2>&1 | tail -2 | cut -c1-260; }
for net in fast4g slow4g; do
  run loc-$net-cpu1-replay-noFontBgm     --url "$B?proto=replay" --net $net --cpu 1 --wait 200000 --block "$BL"
  run loc-$net-cpu1-prerepglb-noFontBgm  --url "$B?proto=pre,replay,glb" --net $net --cpu 1 --wait 200000 --block "$BL"
  run loc-$net-cpu1-prerepglb-noFontsOnly --url "$B?proto=pre,replay,glb" --net $net --cpu 1 --wait 200000 --block 'fonts\.(googleapis|gstatic)\.com'
done
echo ALLDONE3
