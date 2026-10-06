/* 第二輪覆審後判定摘要：node tests/tools/curse-r3-summary.cjs <result-r3.json>（條件 14–17、25、26 逐組；judgeCurseR3 的輸出） */
const r = require(require('path').resolve(process.argv[2])).modes.r3.rows.filter((x) => !x.extra);
const P = (c) => (c.pass ? '過' : '紅'), keys = ['c14', 'c15', 'c16', 'c17', 'c25', 'c26'];
for (const x of r) console.log(x.name, 'c14', x.c14.pileMax + '/' + x.c14.limit, P(x.c14), '| c15 near', x.c15.casterNearMax, P(x.c15), '| c16', P(x.c16), '| c17', x.c17.hitFrames, P(x.c17),
  '| c25 push', x.c25.pushCosMin, 'retArm', x.c25.retractArmCosMin, 'retMove', x.c25.retractMoveCosMin, P(x.c25), '| c26 hit', x.c26.hitFrames + '/' + x.c26.movedFrames, 'tall', x.c26.tallHitFrames, JSON.stringify(x.c26.byKind), P(x.c26), '| 全', keys.every((k) => x[k].pass) ? '過' : '紅');
console.log('SUMMARY', keys.map((k) => k + ' 紅 ' + r.filter((x) => !x[k].pass).length + '/' + r.length + (r.some((x) => !x[k].pass) ? ' [' + r.filter((x) => !x[k].pass).map((x) => x.name).join(',') + ']' : '')).join(' | '));
console.log('NOTE c26 tall-only(覆審口徑) 紅', r.filter((x) => x.c26.tallHitFrames > 0).length + '/' + r.length, '[' + r.filter((x) => x.c26.tallHitFrames > 0).map((x) => x.name).join(',') + ']');
