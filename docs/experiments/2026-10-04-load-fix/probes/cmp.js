const [fa, fb] = process.argv.slice(2);
const a = require(fa), b = require(fb);
const red = (c) => c.items.length > 0 || (c.guard && (c.guard.spill.length || c.guard.overlap.length));
const flat = (R) => { const m = {}; for (const [k, C] of Object.entries(R.cells)) for (const [v, cell] of Object.entries(C.vp)) m[k + '@' + v] = cell; return m; };
const A = flat(a), B = flat(b);
const common = Object.keys(A).filter((k) => k in B), onlyA = Object.keys(A).filter((k) => !(k in B)), onlyB = Object.keys(B).filter((k) => !(k in A));
const newRed = common.filter((k) => red(B[k]) && !red(A[k])), goneRed = common.filter((k) => red(A[k]) && !red(B[k]));
const sig = (c) => JSON.stringify(c.items.map((i) => [i.sel, i.full, i.shown]));
const itemChanged = common.filter((k) => sig(A[k]) !== sig(B[k]));
console.log(JSON.stringify({ cellsA: Object.keys(A).length, cellsB: Object.keys(B).length, common: common.length, onlyBase: onlyA.length, onlyHead: onlyB.length, redBase: Object.values(A).filter(red).length, redHead: Object.values(B).filter(red).length,
  commonNewRed: newRed.length, commonGoneRed: goneRed.length, commonItemSigChanged: itemChanged.length }));
console.log('newRed', newRed.slice(0, 20)); console.log('goneRed', goneRed.slice(0, 10)); console.log('itemChanged', itemChanged.slice(0, 10));
console.log('onlyBase sample', onlyA.slice(0, 8)); console.log('onlyHead sample', onlyB.slice(0, 8));
const itm = (R) => Object.fromEntries(Object.entries(R.summary.items).map(([k, v]) => [v.sel, v.where.length]));
console.log('summary.items base', JSON.stringify(itm(a))); console.log('summary.items head', JSON.stringify(itm(b)));
