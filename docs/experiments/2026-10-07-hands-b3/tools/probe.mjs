// 探針（不是 gate）：node 端建一桌，印每手面數、批 3 部件、擺盪登記。
import { THREE, M, loadProps, loadHands, LAYOUTS } from '../../../../tests/hand-fixture.mjs';
const { createTableProps } = await loadProps();
const { createTableHands } = await loadHands({ b3: !process.env.NO_B3 });
const roles = process.argv.slice(2).length ? process.argv.slice(2) : ['xiaonv','lvshan','luzhu','qingmian'];
const parent = new THREE.Group();
const props = createTableProps(parent, { handPaths: true, onSlam() {} });
props.setLayout(...LAYOUTS.L); props.setSeats(roles.map((role,id)=>({id,role})));
const hands = createTableHands(parent, props); hands.setSeats(roles.map((role,id)=>({id,role})));
await hands.ready();
const st = hands.stats();
console.log(JSON.stringify({tris: st.trisByHand, b1: st.b1, b3: st.b3, b3Error: st.b3Error, variants: st.variants, materials: st.materials, real: st.realInfo.map(r=>r&&{key:r.key,kind:r.kind,verts:r.verts})}));
hands.group.children.forEach((h,i)=>h.traverse(o=>{ if(o.isSkinnedMesh){ const p=o.geometry.userData.b1parts; const sw=o.geometry.userData.b3swing; if(p) console.log(i, p.map(x=>x.name+':'+(x.to-x.from)).join(' | ')); if(sw) console.log(i,'swing', sw.map(s=>s.name+' bone='+s.bone+' len='+s.len.toFixed(3)+' n='+(s.to-s.from)).join(' ; ')); }}));
