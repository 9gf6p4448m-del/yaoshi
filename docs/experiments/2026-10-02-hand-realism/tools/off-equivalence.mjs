/* 修訂 4：寫實總開關關閉（createTableHands opts.real=false，與 ?handreal=0／HAND.REAL_ON=false 同一條分支）時，
   與 95f621db 的手逐項等價：同一串事件（四席推四格、拍、揭盅）逐幀比 holder 可見／位置／朝向／縮放、24 骨四元數，
   以及每席幾何面數、頂點數、材質種類與透明設定。跑法：node docs/experiments/2026-10-02-hand-realism/tools/off-equivalence.mjs */
import { pathToFileURL } from 'node:url';
const NEW = 'C:/Users/shung/wt/yaoshi/hand-realism', BASE = 'C:/Users/shung/wt/yaoshi/base-hr';
async function run(root, opts) {
  const F = await import(pathToFileURL(root + '/tests/hand-fixture.mjs').href);
  const { createTableHands } = await F.loadHands(); const { createTableProps } = await F.loadProps();
  const parent = new F.THREE.Group(); const props = createTableProps(parent, { handPaths: true, onSlam() {} }); props.setLayout(...F.LAYOUTS.L);
  const roles = ['shoujing', 'dangpu', 'hunter', 'qingmian'].map((role, id) => ({ id, role })); props.setSeats(roles);
  const hands = createTableHands(parent, props, opts); hands.setSeats(roles); await hands.ready(); parent.updateMatrixWorld(true);
  const mesh = (s) => { let m = null; hands.group.children[s].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
  const statics = [0, 1, 2, 3].map((s) => { const m = mesh(s); return [m.geometry.index.count / 3, m.geometry.attributes.position.count, m.material.type, m.material.transparent, m.material.alphaTest, m.material.depthWrite, !!m.material.onBeforeCompile.toString().match(/hand|uSkin/)]; });
  const frames = []; const DT = 1 / 60;
  const step = () => { props.update(DT); hands.update(DT); parent.updateMatrixWorld(true); frames.push(hands.group.children.map((h) => { const q = []; h.traverse((o) => { if (o.isBone) q.push(...o.quaternion.toArray()); }); return [h.visible, ...h.position.toArray(), h.rotation.x, h.rotation.y, h.scale.x, ...q]; })); };
  for (let k = 0; k < 4; k++) {
    for (let s = 0; s < 4; s++) { props.bid(s, (k + s) % 4, 3 + s); hands.bid(s, (k + s) % 4, 3 + s); } for (let i = 0; i < 50; i++) step();
    for (let s = 0; s < 4; s++) { props.mark(s, (k + s) % 4); hands.mark(s, (k + s) % 4); } for (let i = 0; i < 50; i++) step();
    props.reveal(k, k); hands.reveal(k, k); for (let i = 0; i < 70; i++) step();
  }
  return { statics, frames };
}
const a = await run(NEW, { real: false }), b = await run(BASE, {}), c = await run(NEW, {});
const eqF = (x, y) => x.frames.length === y.frames.length && x.frames.every((f, i) => JSON.stringify(f) === JSON.stringify(y.frames[i]));
const vis = b.frames.reduce((n, f) => n + f.filter((h) => h[0]).length, 0);
console.log(JSON.stringify({ frames: b.frames.length, visibleHandFrames: vis, off_vs_95f621db: { framesEqual: eqF(a, b), staticsEqual: JSON.stringify(a.statics) === JSON.stringify(b.statics), statics: a.statics },
  on_vs_95f621db_control: { framesEqual: eqF(c, b), staticsEqual: JSON.stringify(c.statics) === JSON.stringify(b.statics) }, base_statics: b.statics }));
