// 診斷（不是 gate）：批 3 幾何的原手／配件／袖管頂點數，與共用碰撞取樣（collideSource）在不同降採樣格寬下的點數。
import { THREE, loadProps, loadHands, LAYOUTS } from '../../../../tests/hand-fixture.mjs';
const { createTableProps } = await loadProps(); const { createTableHands } = await loadHands({ b3: true });
const parent = new THREE.Group(); const props = createTableProps(parent, { handPaths: true, onSlam() {} }); props.setLayout(...LAYOUTS.L);
const seats = ['xiaonv', 'lvshan', 'luzhu', null].map((role, id) => ({ id, role })); props.setSeats(seats);
const hands = createTableHands(parent, props); hands.setSeats(seats); await hands.ready();
const g = (s) => { let m; hands.group.children[s].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m.geometry; };
const out = {}; for (let s = 0; s < 4; s++) { const r = g(s).userData.real; out[s] = { key: r.key, nBase: r.nBase, acc: r.arm[0] - r.nBase, tube: r.arm[1] - r.arm[0], all: r.arm[1] }; }
console.log(JSON.stringify(out));
const dedupe = (P, SI, SW) => { const s = new Set(); for (let v = 0; v < P.length / 3; v++) s.add(Array.from(P.slice(v * 3, v * 3 + 3)).join(',') + '|' + Array.from(SI.slice(v * 4, v * 4 + 4)).join(',') + '|' + Array.from(SW.slice(v * 4, v * 4 + 4)).join(',')); return s.size; };
const d = g(3).attributes; console.log('預設手 全頂點', d.position.count, '去重', dedupe(d.position.array, d.skinIndex.array, d.skinWeight.array));
for (const G of [0.02, 0.03, 0.04, 0.05, 0.06]) { let tot = 0; for (let s = 0; s < 3; s++) { const gg = g(s), r = gg.userData.real, p = gg.attributes.position.array, c = new Set(); for (let v = r.nBase; v < r.arm[0]; v++) c.add(Math.floor(p[v * 3] / G) + ',' + Math.floor(p[v * 3 + 1] / G) + ',' + Math.floor(p[v * 3 + 2] / G)); tot += c.size; } console.log('格寬', G, '三種配件降採樣後合計', tot, '共用取樣總點數≈', 2437 + tot); }
/* 加「離皮」篩選：配件頂點到最近原手頂點的距離 > D 才算凸出（貼皮的配件由皮膚點代表） */
for (const D of [0.02, 0.03, 0.04]) for (const G of [0.04, 0.06]) { let tot = 0; for (let s = 0; s < 3; s++) { const gg = g(s), r = gg.userData.real, p = gg.attributes.position.array, c = new Set();
  for (let v = r.nBase; v < r.arm[0]; v++) { let bd = 1e9; for (let b = 0; b < r.nBase; b++) { const dx = p[b * 3] - p[v * 3], dy = p[b * 3 + 1] - p[v * 3 + 1], dz = p[b * 3 + 2] - p[v * 3 + 2], dd = dx * dx + dy * dy + dz * dz; if (dd < bd) bd = dd; } if (Math.sqrt(bd) <= D) continue; c.add(Math.floor(p[v * 3] / G) + ',' + Math.floor(p[v * 3 + 1] / G) + ',' + Math.floor(p[v * 3 + 2] / G)); } tot += c.size; }
  console.log('離皮>', D, '格寬', G, '合計', tot); }
