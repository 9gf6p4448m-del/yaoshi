import fs from 'node:fs';
const cat = (u) => /fonts\.(googleapis|gstatic)/.test(u) ? 'fonts' : /\/audio\/bgm\//.test(u) ? 'bgm(m4a)' : /unpkg\.com/.test(u) ? 'three(unpkg)' : /creatures\/.*\.glb/.test(u) ? 'glb' : /\.js(\?|$)/.test(u) ? 'js(own)' : /index\.html/.test(u) ? 'index.html' : /^data:/.test(u) ? 'data:' : /\.(svg|css|json|m4a|png)/.test(u) ? 'svg/css/other' : 'other';
const f = process.argv[2]; const o = JSON.parse(fs.readFileSync(f)); const out = [];
for (const r of o.runs) {
  const by = {}; let tot = 0, n = 0; const glb = [];
  for (const x of r.reqs) { const c = cat(x.url); by[c] = by[c] || { n: 0, b: 0 }; by[c].n++; by[c].b += x.bytes || 0; tot += x.bytes || 0; n++; if (c === 'glb') glb.push(x); }
  const js = r.reqs.filter((x) => /js\/.*\.js/.test(x.url) && !/unpkg/.test(x.url)).sort((a, b) => a.t0 - b.t0);
  const chain = js.length ? [js[0].t0, Math.max(...js.map((x) => x.t1 || 0))] : null;
  const P = r.m.probe, rn = (x) => x == null ? null : Math.round(x);
  out.push(`${o.net}/cpu${o.cpu}/${r.label}: total ${(tot / 1e6).toFixed(2)}MB ${n}req | ` + Object.entries(by).map(([k, v]) => `${k} ${v.n}/${(v.b / 1e6).toFixed(2)}MB`).join(', ') +
    ` | own-js chain ${chain ? chain[0].toFixed(1) + '→' + chain[1].toFixed(1) + 's' : '-'} | glb ${glb.map((g) => g.url.split('/').pop().replace('.glb', '') + '@' + g.t0.toFixed(1) + '→' + (g.t1 || 0).toFixed(1)).join(' ')}` +
    ` | marks(ms) load ${rn(r.m.load)} newGame ${rn(r.m.newGame)} bidHUD ${rn(P.bidAt)} trayDef ${rn(P.trayDefAt)} slotsReady ${JSON.stringify(Object.values(P.slots).map(rn))} allVisible ${rn(P.allAt)}${r.m.timeout ? ' TIMEOUT(never)' : ''}`);
}
console.log(out.join('\n'));
