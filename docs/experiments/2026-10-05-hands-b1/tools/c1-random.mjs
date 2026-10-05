// 條件 1（後半）＋條件 9（每幀重建 0 的執行期證據）：批 1 四角色上桌後，整段事件序列（四席推→拍→揭盅收）每幀 Math.random 呼叫次數、
// 幾何／材質建構次數（three 的 uuid 會耗 Math.random，所以「每幀 0 次」同時證明沒有每幀 new BufferGeometry／Material）。
// 跑法：YAOSHI_ROOT=<樹> node c1-random.mjs [--roles=qingmian,hongyi,duanshou,zutou] [--out=<json>]
import fs from 'node:fs';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const { F, loadHandsB1, ROOT } = await import('./b1-node.mjs');
const roles = String(opt.roles || 'qingmian,hongyi,duanshou,zutou').split(',');
const { createTableProps } = await F.loadProps();
const { createTableHands } = await loadHandsB1();
const parent = new F.THREE.Group();
const props = createTableProps(parent, { handPaths: true, onSlam() {} });
props.setLayout(...F.LAYOUTS.L);
const seats = roles.map((role, id) => ({ id, role }));
props.setSeats(seats);
const hands = createTableHands(parent, props);
hands.setSeats(seats);
await hands.ready();
parent.updateMatrixWorld(true);
const st0 = hands.stats();
const orig = Math.random; let calls = 0; Math.random = () => { calls++; return orig(); };
const DT = 1 / 60, perFrame = []; let visFrames = 0;
const step = () => { const c0 = calls; props.update(DT); hands.update(DT); parent.updateMatrixWorld(true); perFrame.push(calls - c0); if (hands.stats().visible.length) visFrames++; };
for (let s = 0; s < 4; s++) { props.bid(s, (s + 1) % 4, 3 + s); hands.bid(s, (s + 1) % 4, 3 + s); }
for (let i = 0; i < 120; i++) step();
for (let s = 0; s < 4; s++) { props.mark(s, (s + 1) % 4); hands.mark(s, (s + 1) % 4); }
for (let i = 0; i < 120; i++) step();
props.bid(2, 1, 9); hands.bid(2, 1, 9); for (let i = 0; i < 60; i++) step();
props.reveal(1, 0); hands.reveal(1, 0); for (let i = 0; i < 120; i++) step();
Math.random = orig;
const st1 = hands.stats();
const out = { root: ROOT, roles, b1: st0.b1, b1Error: st0.b1Error, thumb: st0.thumb, variants: st0.variants, materialNames: st0.materialNames, trisByHand: st0.trisByHand,
  frames: perFrame.length, framesWithHands: visFrames, mathRandomTotal: perFrame.reduce((a, b) => a + b, 0), mathRandomMaxPerFrame: Math.max(...perFrame),
  variantBuildsBefore: st0.variantBuilds, variantBuildsAfter: st1.variantBuilds, realGeoCountBefore: st0.realGeoCount, realGeoCountAfter: st1.realGeoCount,
  sameGeometryObjects: st1.trisByHand.every((t, i) => t === st0.trisByHand[i]) };
console.log(JSON.stringify(out));
if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
