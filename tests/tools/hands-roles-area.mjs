// R1a 色塊面積／三角形數量測（acceptance-roles-r2.md）。單位＝手的局部座標（dm），蒙皮前的靜止姿勢。
// 色塊＝三個頂點的顏色都落在「色塊色清單」內（容差 1e-3）且 alpha>0.5 的三角形；面積加總。
// 用法：node tests/tools/hands-roles-area.mjs [--block='{"shoujing":[[r,g,b]],...}']  （不給＝讀 ROLE_HAND.ROLES[k].BLOCK；基準版沒有 BLOCK，要手給舊 CUFF）
import { THREE, loadProps, loadHands, LAYOUTS } from '../hand-fixture.mjs';

export function blockArea(geometry, colors) {
  const pos = geometry.attributes.position, col = geometry.attributes.color, idx = geometry.index.array, cs = col.itemSize;
  const inBlock = (v) => (cs < 4 || col.array[v * cs + 3] > 0.5)
    && colors.some((c) => Math.abs(col.array[v * cs] - c[0]) < 1e-3 && Math.abs(col.array[v * cs + 1] - c[1]) < 1e-3 && Math.abs(col.array[v * cs + 2] - c[2]) < 1e-3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0, tris = 0, verts = new Set();
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
    if (!(inBlock(i0) && inBlock(i1) && inBlock(i2))) continue;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    area += b.sub(a).cross(c.sub(a)).length() / 2; tris++; verts.add(i0); verts.add(i1); verts.add(i2);
  }
  return { area, tris, verts: verts.size };
}

export async function measureRoles(blocks) {
  const { createTableProps } = await loadProps();
  const { createTableHands } = await loadHands();
  const parent = new THREE.Group();
  const props = createTableProps(parent, { handPaths: true, onSlam() {} });
  props.setLayout(...LAYOUTS.L);
  const roles = ['shoujing', 'dangpu', 'hunter', 'qingmian'];
  props.setSeats(roles.map((role, id) => ({ id, role })));
  const hands = createTableHands(parent, props);
  hands.setSeats(roles.map((role, id) => ({ id, role }))); await hands.ready();
  const out = {};
  roles.forEach((role, s) => {
    let m = null; hands.group.children[s].traverse((o) => { if (o.isSkinnedMesh) m = o; });
    const r = role === 'qingmian' ? blocks.shoujing || [] : blocks[role];
    out[role === 'qingmian' ? 'default' : role] = { ...blockArea(m.geometry, r), triangles: m.geometry.index.count / 3, vertices: m.geometry.attributes.position.count };
  });
  hands.dispose(); props.dispose();
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('hands-roles-area.mjs')) {
  const arg = process.argv.find((x) => x.startsWith('--block='));
  let blocks;
  if (arg) blocks = JSON.parse(arg.slice(8));
  else { const M = await import('../../js/hand-motion.js'); blocks = Object.fromEntries(['shoujing', 'dangpu', 'hunter'].map((k) => [k, M.ROLE_HAND.ROLES[k].BLOCK])); }
  console.log(JSON.stringify(await measureRoles(blocks), null, 1));
}
