#!/bin/bash
# 節錄 60 秒無縫環 + 響度對齊 + AAC。用法：make.sh "<wav>" <out.m4a> <targetLUFS> [start]
set -e
IN="$1"; OUT="$2"; TGT="$3"; S="${4:-30}"; XF=4; LEN=60
TMP="${OUT%.m4a}.tmp.wav"
# 1) 先做環（線性 PCM）：head = A[0..XF] 淡入 + B[0..XF] 淡出（B＝A 結尾之後的 XF 秒），rest = A[XF..LEN]
ffmpeg -nostats -loglevel error -y -i "$IN" -filter_complex "
[0:a]atrim=start=$S:end=$((S+LEN)),asetpts=PTS-STARTPTS,asplit[a1][a2];
[0:a]atrim=start=$((S+LEN)):end=$((S+LEN+XF)),asetpts=PTS-STARTPTS,afade=t=out:st=0:d=$XF:curve=hsin[tail];
[a1]atrim=start=0:end=$XF,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=$XF:curve=hsin[headin];
[headin][tail]amix=inputs=2:normalize=0[head];
[a2]atrim=start=$XF:end=$LEN,asetpts=PTS-STARTPTS[rest];
[head][rest]concat=n=2:v=0:a=1[out]" -map "[out]" -c:a pcm_s16le "$TMP"
# 2) 量響度 → 算增益 → 套增益＋限幅 → AAC
LUFS=$(ffmpeg -nostats -i "$TMP" -af ebur128 -f null - 2>&1 | grep -E "^ +I:" | tail -1 | awk '{print $2}')
GAIN=$(python -c "print(round($TGT-($LUFS),2))")
ffmpeg -nostats -loglevel error -y -i "$TMP" -af "volume=${GAIN}dB,alimiter=limit=0.79:level=0:attack=5:release=50" -c:a aac -b:a 80k -movflags +faststart "$OUT"
rm -f "$TMP"
FIN=$(ffmpeg -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E "^ +I:|Peak:" | tail -2 | tr -s ' ' | tr '\n' ' ')
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
SZ=$(stat -c %s "$OUT")
echo "$(basename "$OUT") | 原 $LUFS LUFS 增益 ${GAIN}dB → $FIN | 長 ${DUR}s | $SZ bytes"
