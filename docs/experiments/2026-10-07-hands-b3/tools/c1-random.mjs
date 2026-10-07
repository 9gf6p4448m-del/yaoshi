// 條件 1（後半）＋7d 執行期證據：由 2026-10-05-hands-b1/tools/c1-random.mjs 改寫（事件序列不動），改用 loadHands({ b3 })。
// 批 3 三角色上桌，整段事件（四席推→拍→揭盅收）每幀 Math.random 呼叫次數（three 的 uuid 耗 Math.random ⇒ 每幀 0＝沒有每幀 new 幾何／材質）、幾何份數前後。
// node c1-random.mjs [--roles=xiaonv,lvshan,luzhu,zutou] [--nob3] [--out=<json>]
import fs from 'node:fs';
import { THREE, loadProps, loadHands, LAYOUTS } from '../../../../tests/hand-fixture.mjs';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const roles = String(opt.roles || 'xiaonv,lvshan,luzhu,zutou').split(',');
const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands({ b3: !opt.nob3 });
const parent = new THREE.Group();
const props = createTableProps(parent, { handPaths: true, onSlam() {} });
props.setLayout(...LAYOUTS.L);
const seats = roles.map((role, id) => ({ id, role }));
props.setSeats(seats);
const hands = createTableHands(parent, props);
hands.setSeats(seats);
await hands.ready();
parent.updateMatrixWorld(true);
const st0 = hands.stats();
const geo0 = hands.group.children.map((h) => { let g = null; h.traverse((o) => { if (o.isSkinnedMesh) g = o.geometry; }); return g; });
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
const geo1 = hands.group.children.map((h) => { let g = null; h.traverse((o) => { if (o.isSkinnedMesh) g = o.geometry; }); return g; });
const out = { roles, b3: st0.b3, b3Error: st0.b3Error, variants: st0.variants, materialNames: st0.materialNames, trisByHand: st0.trisByHand,
  frames: perFrame.length, framesWithHands: visFrames, mathRandomTotal: perFrame.reduce((a, b) => a + b, 0), mathRandomMaxPerFrame: Math.max(...perFrame),
  variantBuildsBefore: st0.variantBuilds, variantBuildsAfter: st1.variantBuilds, realGeoCountBefore: st0.realGeoCount, realGeoCountAfter: st1.realGeoCount,
  sameGeometryObjects: geo0.every((g, i) => g === geo1[i]) };
console.log(JSON.stringify(out));
if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
