/* 判定摘要：node tests/tools/curse-r3-summary.cjs <result-r3.json>（judgeCurseR3：條件 2、3〔絕對量〕、14–17、25、26、30、31；第四輪條件 33：不濾掉任何組，延伸組標 (extra)） */
const r = require(require('path').resolve(process.argv[2])).modes.r3.rows;
const P = (c) => (c ? '過' : '紅'), keys = ['c14', 'c15', 'c16', 'c17', 'c25', 'c26', 'c30', 'c31', 'c37'];
const all = (x) => x.c2.pass && x.c3.passAbs && keys.every((k) => x[k].pass);
for (const x of r) console.log((x.extra ? '(extra) ' : '') + x.name, 'c2', x.c2.landedMs, P(x.c2.pass), '| c3abs', P(x.c3.passAbs), '| c14', x.c14.pileMax + '/' + x.c14.limit, P(x.c14.pass), '| c15 near', x.c15.casterNearMax, P(x.c15.pass), '| c16', P(x.c16.pass), '| c17', x.c17.hitFrames, P(x.c17.pass),
  '| c25 push', x.c25.pushCosMin, 'retArm', x.c25.retractArmCosMin, 'retMove', x.c25.retractMoveCosMin, P(x.c25.pass), '| c26 hit', x.c26.hitFrames + '/' + x.c26.movedFrames, 'tall', x.c26.tallHitFrames, JSON.stringify(x.c26.byKind), P(x.c26.pass),
  '| c30 gap', x.c30.maxGap, 'bad', x.c30.badNonExempt + '(全' + x.c30.badFrames + ')/' + x.c30.frames, x.c30.first ? '@' + x.c30.first.tms : '', P(x.c30.pass), '| c37', JSON.stringify(x.c37.segments.map((g) => [g.fromMs, g.durMs, g.pileMaxMove])), P(x.c37.pass), '| c31 bad', x.c31.bad, x.c31.first.length ? JSON.stringify(x.c31.first.slice(0, 3)) : '', P(x.c31.pass), '| 全', P(all(x)));
console.log('SUMMARY（含延伸組）', ['c2', 'c3abs', ...keys].map((k) => { const f = (x) => (k === 'c2' ? x.c2.pass : k === 'c3abs' ? x.c3.passAbs : x[k].pass); const red = r.filter((x) => !f(x)); return k + ' 紅 ' + red.length + '/' + r.length + (red.length ? ' [' + red.map((x) => x.name).join(',') + ']' : ''); }).join(' | '));
console.log('全過', r.filter(all).length + '/' + r.length);
