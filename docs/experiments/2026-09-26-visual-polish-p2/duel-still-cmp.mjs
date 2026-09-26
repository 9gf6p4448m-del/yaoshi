import fs from 'node:fs';
const [dir, ...refs] = process.argv.slice(2);
const L = (n) => JSON.parse(fs.readFileSync(`${dir}/${n}.json`, 'utf8')).runs.map((r) => r.rects);
const B = L('base');
const d = (x, y) => { let m = 0, k = null; for (const [key, a] of Object.entries(x)) { const b = y[key]; if (!b) continue; const v = Math.max(...a.map((q, i) => Math.abs(q - b[i]))); if (v > m) { m = v; k = key; } } return { m: +m.toFixed(1), k, onlyX: Object.keys(x).filter((q) => !y[q]), onlyY: Object.keys(y).filter((q) => !x[q]) }; };
let noise = { m: 0 }; for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const r = d(B[i], B[j]); if (r.m >= noise.m) noise = r; }
console.log('base-vs-base noise', JSON.stringify(noise));
for (const n of refs) { const H = L(n); let w = { m: 0 }; const per = {}; for (const h of H) for (const b of B) { const r = d(b, h); if (r.m >= w.m) w = r; } for (const [key] of Object.entries(H[0])) { let m = 0; for (const h of H) for (const b of B) if (b[key] && h[key]) m = Math.max(m, ...b[key].map((q, i) => Math.abs(q - h[key][i]))); per[key] = +m.toFixed(1); }
  console.log(n, 'vs base max', JSON.stringify(w)); console.log(' per-container', JSON.stringify(per)); }
