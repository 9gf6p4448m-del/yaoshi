/* 判定摘要：node tests/tools/curse-r3-summary.cjs <result-r3.json>（judgeCurseR3：條件 2、3〔絕對量〕、14–17、25、26、30、31、40、41；第四輪條件 33：不濾掉任何組，延伸組標 (extra)）
   第六輪：條件 36／37 作廢（條件 39），c37 不再進「全」；c30 回到全面適用；c40（不停頓）、c41（不換邊）只判北席，非北席欄位標「—」。 */
const r = require(require('path').resolve(process.argv[2])).modes.r3.rows;
const P = (c) => (c ? '過' : '紅'), keys = ['c14', 'c15', 'c16', 'c17', 'c25', 'c26', 'c30', 'c31', 'c40', 'c41'];
const all = (x) => x.c2.pass && x.c3.passAbs && keys.every((k) => x[k].pass);
const NA = (c, s) => (c.applies ? s + ' ' + P(c.pass) : '— (' + s + ')');
for (const x of r) console.log((x.extra ? '(extra) ' : '') + x.name, 'c2', x.c2.landedMs, P(x.c2.pass), '| c3abs', P(x.c3.passAbs), '| c14', x.c14.pileMax + '/' + x.c14.limit, P(x.c14.pass), '| c15 near', x.c15.casterNearMax, P(x.c15.pass), '| c16', P(x.c16.pass), '| c17', x.c17.hitFrames, P(x.c17.pass),
  '| c25 push', x.c25.pushCosMin, 'retArm', x.c25.retractArmCosMin, 'retMove', x.c25.retractMoveCosMin, P(x.c25.pass), '| c26 hit', x.c26.hitFrames + '/' + x.c26.movedFrames, 'tall', x.c26.tallHitFrames, JSON.stringify(x.c26.byKind), P(x.c26.pass),
  '| c30 gap', x.c30.maxGap, 'bad', x.c30.badFrames + '/' + x.c30.frames, x.c30.first ? '@' + x.c30.first.tms : '', P(x.c30.pass), '| c31 bad', x.c31.bad, x.c31.first.length ? JSON.stringify(x.c31.first.slice(0, 3)) : '', P(x.c31.pass),
  '| c40', NA(x.c40, 'min ' + x.c40.minMove + ' bad ' + x.c40.bad + '/' + x.c40.windows + (x.c40.first ? ' @' + x.c40.first.tms : '')), '| c41', NA(x.c41, '+' + x.c41.pos + '/-' + x.c41.neg + ' max ' + x.c41.maxAbs + '° miss ' + x.c41.missing + (x.c41.firstFlip ? ' flip@' + x.c41.firstFlip.tms : '')), '| 全', P(all(x)));
console.log('SUMMARY（含延伸組）', ['c2', 'c3abs', ...keys].map((k) => { const f = (x) => (k === 'c2' ? x.c2.pass : k === 'c3abs' ? x.c3.passAbs : x[k].pass); const red = r.filter((x) => !f(x)); return k + ' 紅 ' + red.length + '/' + r.length + (red.length ? ' [' + red.map((x) => x.name).join(',') + ']' : ''); }).join(' | '));
console.log('全過', r.filter(all).length + '/' + r.length);
