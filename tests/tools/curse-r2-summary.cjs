const f = process.argv[2], NORMAL = ['cSW', 'cSN', 'cNS', 'cEW'];
const r = require(f).modes.r2.rows.filter((x) => !x.extra);
for (const x of r) console.log((NORMAL.includes(x.name) ? '正常 ' : '浮空 ') + x.name, 'c14', x.c14.pileMax + '/' + x.c14.limit, x.c14.pass ? '過' : '紅', '| c15 v', x.c15.victimLiftMax, 'p', x.c15.pileLiftMax, 'near', x.c15.casterNearMax, x.c15.pass ? '過' : '紅', '| c16 in', x.c16.inHandBox, 'bot', x.c16.bottomOverPalm, x.c16.pass ? '過' : '紅', '| c17', x.c17.hitFrames, x.c17.pass ? '過' : '紅', '| 全', [x.c14, x.c15, x.c16, x.c17].every((c) => c.pass) ? '過' : '紅');
const n = r.filter((x) => NORMAL.includes(x.name)), fl = r.filter((x) => !NORMAL.includes(x.name)), all = (x) => [x.c14, x.c15, x.c16, x.c17].every((c) => c.pass);
console.log('SUMMARY normal all-pass', n.filter(all).length + '/' + n.length, '| floating red', fl.filter((x) => !all(x)).length + '/' + fl.length);
