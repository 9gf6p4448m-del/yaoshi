/* 條件 7 歸因用（不是 gate）：tests/table-hands-roles.test.mjs「配件隨骨」同一套量法，但「配件」範圍改成真正的配件頂點
   （寫實幾何 userData.real.nBase 之後；原測試以 GLB 頂點數 819 為界，細分後 819 之後是細分新增的手部頂點），
   錨點＝最近的「手部」頂點（< nBase）。v0.59.7 袖管（userData.real.arm 範圍）不算配件，另列它頭兩圈接袖口處的拉開量。另列手部新增頂點（819..nBase）同法的最大拉開，說明原測試紅在哪一群。
   跑法：node docs/experiments/2026-10-02-hand-realism/tools/acc-follow-check.mjs */
import { pathToFileURL } from 'node:url';
const F = await import(pathToFileURL(process.cwd() + '/tests/hand-fixture.mjs').href);
const { THREE } = F; const DT = 1 / 60;
const { createTableHands } = await F.loadHands(); const { createTableProps } = await F.loadProps();
const parent = new THREE.Group(); const props = createTableProps(parent, { handPaths: true, onSlam() {} }); props.setLayout(...F.LAYOUTS.L);
const roles = ['shoujing', 'dangpu', 'hunter', 'qingmian']; props.setSeats(roles.map((role, id) => ({ id, role })));
const hands = createTableHands(parent, props); hands.setSeats(roles.map((role, id) => ({ id, role }))); await hands.ready(); parent.updateMatrixWorld(true);
const meshOf = (s) => { let m = null; hands.group.children[s].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
const groups = [];
for (let s = 0; s < 3; s++) {
  const g = meshOf(s).geometry, pos = g.attributes.position.array, nb = g.userData.real.nBase, arm = g.userData.real.arm || [g.attributes.position.count, g.attributes.position.count], n = arm[0];
  const near = (from, to, step, poolEnd) => { const out = []; for (let e = from; e < to; e += step) { let best = 0, bd = Infinity; for (let v = 0; v < poolEnd; v++) { if (v === e) continue; const dx = pos[v * 3] - pos[e * 3], dy = pos[v * 3 + 1] - pos[e * 3 + 1], dz = pos[v * 3 + 2] - pos[e * 3 + 2], d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v; } } out.push([e, best, Math.sqrt(bd)]); } return out; };
  /* 硬配件（aAcc 類別 3／4：木珠、鉚釘、錢、鐵扣）整顆抄「離重心最近的手部頂點」的權重（hand-realism 同一規則），錨點改用那個頂點 */
  const A = g.attributes.aAcc.array, idx = g.index.array, par = new Int32Array(n).map((_, i) => i), find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (a >= nb && b >= nb && c >= nb && a < n && b < n && c < n) { par[find(a)] = find(b); par[find(b)] = find(c); } }
  const comp = new Map(); for (let e = nb; e < n; e++) { const r = find(e); if (!comp.has(r)) comp.set(r, []); comp.get(r).push(e); }
  const rigidPairs = [];
  for (const vs of comp.values()) { if (!vs.every((e) => [3, 4].includes(Math.round(A[e * 3])))) continue;
    let x = 0, y = 0, z = 0; for (const e of vs) { x += pos[e * 3]; y += pos[e * 3 + 1]; z += pos[e * 3 + 2]; } x /= vs.length; y /= vs.length; z /= vs.length;
    let best = 0, bd = Infinity; for (let v = 0; v < nb; v++) { const d = (pos[v * 3] - x) ** 2 + (pos[v * 3 + 1] - y) ** 2 + (pos[v * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = v; } }
    for (const e of vs) rigidPairs.push([e, best, Math.hypot(pos[e * 3] - pos[best * 3], pos[e * 3 + 1] - pos[best * 3 + 1], pos[e * 3 + 2] - pos[best * 3 + 2])]); }
  const rigidSet = new Set(rigidPairs.map((x) => x[0]));
  groups.push({ s, acc: near(nb, n, 3, nb).filter((x) => !rigidSet.has(x[0])), rigid: rigidPairs, mid: near(819, nb, 7, 819), tubeJoint: near(arm[0], Math.min(arm[1], arm[0] + 24), 1, nb) }); // 袖管頭兩圈（接袖口處）
}
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(); const worst = { acc: -Infinity, rigid: -Infinity, mid: -Infinity, tubeJoint: -Infinity }; let frames = 0, checked = 0;
for (let k = 0; k < 6; k++) {
  if (k % 2 === 0) for (let s = 0; s < 4; s++) { props.bid(s, (s + k) % 4, 6); hands.bid(s, (s + k) % 4, 6); } else for (let s = 0; s < 4; s++) { props.mark(s, (s + k) % 4); hands.mark(s, (s + k) % 4); }
  for (let i = 0; i < 60; i++) {
    props.update(DT); hands.update(DT); parent.updateMatrixWorld(true);
    for (const G of groups) { const m = meshOf(G.s); if (!m.parent.visible) continue; m.skeleton.update(); frames++;
      for (const key of ['acc', 'rigid', 'mid', 'tubeJoint']) for (const [e, b, d0] of G[key]) { m.getVertexPosition(e, v1); m.getVertexPosition(b, v2); worst[key] = Math.max(worst[key], v1.distanceTo(v2) - d0); checked++; } }
  }
}
console.log(JSON.stringify({ frames, checked, accessoriesMaxDrift_dm: +worst.acc.toExponential(3), rigidPiecesMaxDrift_dm: +worst.rigid.toExponential(3), subdivMidpointsMaxDrift_dm: +worst.mid.toFixed(4), tubeJointMaxDrift_dm: +worst.tubeJoint.toFixed(4), gate: '原測試門檻 0.01 dm', accPass: worst.acc < 0.01 && worst.rigid < 0.01 }));
