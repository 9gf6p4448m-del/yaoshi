// node skip-check.mjs <out json>  — 條件 G 跳過：skipT 之後 ≤100ms 所有錢 t≥1 且手不在推（揭盅的扒回/停一拍不算擺錢，同 0.59.11 條件 5 口徑）；公告 ≤500ms
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), skipT = d.skipT, F = d.frames;
const settled = F.find((f) => f.t >= skipT && f.st.every(([, , t]) => t >= 1) && f.hs.every((h) => !h || !h.startsWith('push')));
const ann = d.metrics.announceAt;
const r = { file: process.argv[2], skipT: +skipT.toFixed(1), settleAfterMs: settled ? +(settled.t - skipT).toFixed(1) : null, announceAfterMs: +(ann - skipT).toFixed(1), errors: d.errors.length };
r.pass = r.settleAfterMs !== null && r.settleAfterMs <= 100 && r.announceAfterMs <= 500 && r.errors === 0;
console.log(JSON.stringify(r));
