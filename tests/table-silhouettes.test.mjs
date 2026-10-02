// 後景人影 階段三 #E：凍結驗收 docs/experiments/2026-10-01-acceptance-seat-hands.md E1（有體積、每尊 ≤200 三角形）、
// 提案 §5（靜態、不耗亂數、不進 hitTest）的 node 部分。實頁部分（draw call 增量、掏空窗內、不蓋托盤／拍品／HUD、
// 對決隱藏／牌桌顯示的真渲染）在 tests/tools/silhouettes-probe.mjs；突變驗紅在 tests/tools/silhouettes-mutants.mjs。
// 突變驗紅：YAOSHI_SIL_PATH 指向暫存的突變體副本（原檔不動）。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { THREE, ROOT, threeURL } from './hand-fixture.mjs';

const asModule = (src) => 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
const sceneURL = asModule(fs.readFileSync(path.join(ROOT, 'js/scene-env.js'), 'utf8').replace("from 'three'", `from '${threeURL}'`));
const SRC_PATH = process.env.YAOSHI_SIL_PATH || path.join(ROOT, 'js/table-silhouettes.js');
const SRC = fs.readFileSync(SRC_PATH, 'utf8');
const mod = await import(asModule(SRC.replace("from 'three'", `from '${threeURL}'`).replace("import('./scene-env.js' + V)", `import('${sceneURL}')`)));
const { createTableSilhouettes, SIL } = mod;

const mk = (mode = 'L') => { const parent = new THREE.Group(); return { parent, s: createTableSilhouettes(parent, { mode }) }; };
const posOf = (s) => Array.from(s.mesh.geometry.attributes.position.array);

test('E1 每尊 ≤200 三角形、共三尊、L／P 兩版都核', () => {
  for (const m of ['L', 'P']) {
    const { s } = mk(m); const st = s.stats();
    assert.equal(st.figures, 3);
    assert.equal(st.trisByFigure.length, 3);
    for (const t of st.trisByFigure) assert.ok(t > 0 && t <= 200, `${m} 某尊 ${t} 三角形`);
    assert.equal(s.mesh.geometry.attributes.position.count / 3, st.totalTris, '統計值必須等於幾何實際頂點數÷3');
  }
});

test('B1 三尊合併成單一 mesh、單一材質（淨增 1 draw call，上限 3）', () => {
  const { parent, s } = mk();
  let meshes = 0; parent.traverse((o) => { if (o.isMesh) meshes++; });
  assert.equal(meshes, 1);
  assert.equal(Array.isArray(s.mesh.material), false);
  assert.equal(s.mesh.material.vertexColors, true);
});

test('E1 有體積、非平面貼片：每尊至少三個可辨部位（頭／肩／身），高度帶分離且有厚度', () => {
  const { s } = mk(); const st = s.stats();
  const g = s.mesh.geometry, p = g.attributes.position, c = g.attributes.color;
  let off = 0;
  st.trisByFigure.forEach((tris, fi) => {
    const n = tris * 3, b = st.bounds[fi];
    const size = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
    assert.ok(size[1] > 0.3, `第 ${fi} 尊太矮 ${size[1]}`);
    assert.ok(size[0] > 0.2 && size[2] > 0.1, `第 ${fi} 尊太扁（x ${size[0]} z ${size[2]}）＝貼片`);
    /* 以頂點色分部位：膚色＝頭、肩色＝肩、袍色＝身；各自的 y 中位數必須頭 > 肩 > 身 */
    const key = (i) => [c.getX(i), c.getY(i), c.getZ(i)].map((v) => v.toFixed(3)).join(',');
    const byCol = new Map();
    for (let i = off; i < off + n; i++) { const k = key(i); (byCol.get(k) || byCol.set(k, []).get(k)).push(p.getY(i)); }
    const hex = (h) => { const k = new THREE.Color(h); return [k.r, k.g, k.b].map((v) => v.toFixed(3)).join(','); }; // 頂點色存在工作色彩空間（線性）
    const med = (a) => { const t = a.slice().sort((x, y) => x - y); return t[t.length >> 1]; };
    const yOf = (h) => { const a = byCol.get(hex(h)); assert.ok(a && a.length >= 6, `第 ${fi} 尊缺 ${hex(h)} 這個部位`); return med(a); };
    assert.ok(byCol.size >= 3, '顏色群太少');
    assert.ok(yOf(SIL.COL.skin) > yOf(SIL.COL.shoulder), `第 ${fi} 尊頭不在肩之上`);
    assert.ok(yOf(SIL.COL.shoulder) > yOf(SIL.COL.robe), `第 ${fi} 尊肩不在身之上`);
    off += n;
  });
});

test('純呈現：建構與換版面都不呼叫 Math.random，且兩次建構結果逐值相同（決定性）', () => {
  const orig = Math.random; let calls = 0; Math.random = () => { if (!/generateUUID/.test(new Error().stack)) calls++; return 0.5; }; // three 內部給物件配 uuid 也會呼叫；只計其他來源
  let a, b;
  try { const x = mk(); x.s.setLayout('P'); x.s.setLayout('L'); a = posOf(x.s); b = posOf(mk().s); } finally { Math.random = orig; }
  assert.equal(calls, 0);
  assert.deepEqual(a, b);
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(/Math\.random/.test(code), false, '原始碼（去註解後）不得出現 Math.random');
});

test('靜態：換版面只換幾何指標（不重算、不配置新幾何）；沒有每幀 update', () => {
  const { s } = mk('L'); const gL = s.mesh.geometry;
  s.setLayout('P'); const gP = s.mesh.geometry;
  assert.notEqual(gL, gP);
  s.setLayout('L'); assert.equal(s.mesh.geometry, gL, '切回 L 必須是同一個幾何物件（預烘，不重建）');
  s.setLayout('P'); assert.equal(s.mesh.geometry, gP);
  assert.equal(typeof s.update, 'undefined');
  assert.equal(s.mode(), 'P');
  const gx = s.stats().bounds.map((b) => b.min[0].toFixed(3)).join();
  s.setLayout('L'); assert.notEqual(gx, s.stats().bounds.map((b) => b.min[0].toFixed(3)).join(), 'L／P 擺位應不同');
});

test('不進 hitTest：mesh.raycast 停用，Raycaster 打穿三尊的正中央也零命中', () => {
  const { parent, s } = mk(); parent.updateMatrixWorld(true);
  const rc = new THREE.Raycaster();
  for (const b of s.stats().bounds) {
    const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    rc.set(new THREE.Vector3(cx, cy, cz + 3), new THREE.Vector3(0, 0, -1));
    assert.equal(rc.intersectObject(parent, true).length, 0);
  }
});

test('對決隱藏的接線：人影掛在 tray 的 group 之下（setVisible(false) 一次收掉），且不進 hitTest 代理', () => {
  const tray = fs.readFileSync(path.join(ROOT, 'js/table-tray.js'), 'utf8');
  assert.match(tray, /createTableSilhouettes\(group,/);
  assert.match(tray, /sil\.setLayout\(L\.mode\)/);
  const ht = tray.slice(tray.indexOf('hitTest(u, v) {'), tray.indexOf('hitTest(u, v) {') + 1500);
  assert.equal(/\bsil\b|silhouettes/.test(ht), false, 'hitTest 內不得碰人影');
});

test('dispose 後 group 從父節點移除、幾何釋放不丟錯', () => {
  const { parent, s } = mk(); s.dispose();
  assert.equal(parent.children.length, 0);
});
