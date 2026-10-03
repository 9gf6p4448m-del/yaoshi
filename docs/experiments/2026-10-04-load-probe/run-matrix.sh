#!/bin/bash
# 一次只跑一支瀏覽器：全部串行
cd "$(dirname "$0")"
run(){ name=$1; shift; echo "### $name"; node probe.mjs "$@" --out raw/$name.json 2>&1 | tail -3; }
run live-none-cpu1-replay1   --net none   --cpu 1 --replay 1 --warm 1 --wait 60000
run live-fast4g-cpu1-replay1 --net fast4g --cpu 1 --replay 1 --warm 1 --wait 180000
run live-slow4g-cpu1-replay1 --net slow4g --cpu 1 --replay 1 --warm 1 --wait 300000
run live-fast4g-cpu4-replay1 --net fast4g --cpu 4 --replay 1 --wait 240000
run live-slow4g-cpu4-replay1 --net slow4g --cpu 4 --replay 1 --wait 400000
run live-fast4g-cpu1-replay0 --net fast4g --cpu 1 --replay 0 --wait 45000
run live-slow4g-cpu1-replay0 --net slow4g --cpu 1 --replay 0 --wait 45000
run live-none-cpu4-replay1   --net none   --cpu 4 --replay 1 --wait 120000
echo ALLDONE
