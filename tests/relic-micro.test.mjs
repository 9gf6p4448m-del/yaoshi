// 信物局部小動作（撥珠、冒煙）驗收，凍結檔 docs/experiments/2026-10-11-acceptance-props-micro.md（M1–M9）。
// 走真實 createTableProps（hand-fixture 的 loadProps，three 0.180）＋決定性步進。基準版 = db281fa9 的 table-props.js（git show 存暫存檔，原檔不動）。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { THREE, ROOT, loadProps, LAYOUTS } from './hand-fixture.mjs';

const BASE_SHA = 'db281fa9';
const basePath = path.join(os.tmpdir(), 'relic-micro-base-' + process.pid + '.js');
fs.writeFileSync(basePath, execFileSync('git', ['show', `${BASE_SHA}:js/table-props.js`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
process.on('exit', () => { try { fs.unlinkSync(basePath); } catch (e) { /* ignore */ } });

const saved = process.env.YAOSHI_PROPS_PATH;
async function load(base) {
  if (base) process.env.YAOSHI_PROPS_PATH = basePath; else if (saved) process.env.YAOSHI_PROPS_PATH = saved; else delete process.env.YAOSHI_PROPS_PATH;
  try { return (await loadProps()).createTableProps; } finally { if (saved) process.env.YAOSHI_PROPS_PATH = saved; else delete process.env.YAOSHI_PROPS_PATH; }
}
const CUR = await load(false), BASE = await load(true);

const WORST = ['dangpu', 'shoujing', 'luzhu', 'zutou'];
function make(create, { fx = true, roles = WORST, layout = 'L', slow } = {}) {
  globalThis.location = { search: fx ? '' : '?fx=0' };
  globalThis.YS_ANIM_SLOW = slow ? { hand: slow, grab: 1 } : undefined;
  const parent = new THREE.Group();
  const props = create(parent, {});
  props.setLayout(...LAYOUTS[layout]);
  props.setSeats(roles.map((role, id) => ({ id, role })));
  parent.updateMatrixWorld(true);
  return { parent, props, group: props.group };
}
const relicMeshes = (g) => g.children.filter((c) => c.name && c.name.startsWith('relic-') && !c.name.startsWith('relic-micro'));
const kids = (g) => { const out = []; g.traverse((o) => { if (o.isMesh && o.name.startsWith('relic-micro-')) out.push(o); }); return out; };
const seatOf = (k) => Number(k.name.split('-')[2]);
const visMeshes = (g) => { let n = 0; g.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible) { let p = o.parent, ok = true; while (p) { if (!p.visible) ok = false; p = p.parent; } if (ok) n++; } }); return n; };
const allMeshes = (g) => { let n = 0; g.traverse((o) => { if (o.isMesh) n++; }); return n; };
const pose = (g) => relicMeshes(g).map((m) => [...m.position.toArray(), m.rotation.x, m.rotation.y, m.rotation.z, ...m.scale.toArray()]);
const tris = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
const DT = 1 / 60;
function sim(r, secs, each) { const n = Math.round(secs / DT); for (let i = 0; i < n; i++) { r.props.update(DT); r.parent.updateMatrixWorld(true); if (each) each(i, (i + 1) * DT); } }
const close = (a, b, e = 1e-12) => a.length === b.length && a.every((v, i) => Array.isArray(v) ? close(v, b[i], e) : Math.abs(v - b[i]) <= e);

test('M1 ?fx=0：Mesh 數與信物姿態每步和基準逐值相等，且不建子 Mesh', () => {
  const a = make(CUR, { fx: false }), b = make(BASE, { fx: false });
  assert.equal(kids(a.group).length, 0, 'fx=0 不得建子 Mesh');
  assert.equal(allMeshes(a.group), allMeshes(b.group));
  let n = 0; sim(a, 30, () => { b.props.update(DT); n++; assert.ok(close(pose(a.group), pose(b.group)), 'step ' + n); assert.equal(visMeshes(a.group), visMeshes(b.group)); });
  a.props.dispose(); b.props.dispose();
});

test('M2 預設開：空閒期間父信物姿態與基準逐值相等（動作只在子 Mesh）', () => {
  const a = make(CUR), b = make(BASE); let n = 0;
  sim(a, 30, () => { b.props.update(DT); n++; assert.ok(close(pose(a.group), pose(b.group)), 'step ' + n); });
  a.props.dispose(); b.props.dispose();
});

test('M3 draw call：可見 Mesh 數 − 基準 ≤ 4、至少出現過 1；分件三角形總和＝父 Mesh（修訂 A）、煙 ≤ 4；信物 tris 不變', () => {
  const a = make(CUR), b = make(BASE); let max = -9, seen = false;
  sim(a, 30, () => { b.props.update(DT); const d = visMeshes(a.group) - visMeshes(b.group); max = Math.max(max, d); if (d >= 1) seen = true; });
  assert.ok(seen, '子 Mesh 從未出現（空轉）');
  assert.ok(max <= 4 && max >= 1, 'max delta=' + max);
  assert.ok(kids(a.group).length > 0);
  // 修訂 A（2026-10-11，使用者經主 session 同意）：算盤分件（body＋兩排珠）三角形總和 == 父 Mesh；煙 ≤ 4
  const parts = kids(a.group).filter((k) => !k.name.includes('smoke')), parent0 = relicMeshes(a.group)[0];
  assert.equal(parts.length, 3);
  assert.equal(parts.reduce((n, k) => n + tris(k), 0), tris(parent0), '分件總和 ≠ 父 Mesh（珠子外觀被改）');
  for (const k of kids(a.group).filter((q) => q.name.includes('smoke'))) assert.ok(tris(k) <= 4, k.name + ' tris=' + tris(k));
  assert.deepEqual(a.props.stats().relics.map((x) => x.tris), b.props.stats().relics.map((x) => x.tris));
  a.props.dispose(); b.props.dispose();
});

test('M4 只在空閒：出價動作期間該席子 Mesh 不可見且珠位移為 0', () => {
  const a = make(CUR), seat0 = () => kids(a.group).filter((k) => seatOf(k) === 0);
  let guard = 0;
  while (!seat0().some((k) => k.visible) && guard++ < 1200) sim(a, DT);
  assert.ok(seat0().some((k) => k.visible), '等不到 seat0 動作窗');
  a.props.bid(0, 0, 3);
  for (let i = 0; i < 40; i++) { // 0.667s < RELIC_MOVE_MS 0.7
    a.props.update(DT);
    for (const k of seat0()) { assert.equal(k.visible, false, '出價期間 ' + k.name + ' 仍可見 step ' + i); assert.equal(k.position.x, 0); }
  }
  a.props.dispose();
});

test('M4b dt=0 不演', () => {
  const a = make(CUR); for (let i = 0; i < 50; i++) a.props.update(0);
  assert.equal(kids(a.group).filter((k) => k.visible).length, 0); a.props.dispose();
});

test('M5 動作確實有、精確回位：珠偏移 0.006–0.012、結束為 0；煙峰值 ≥0.25 且不可見時為 0', () => {
  const a = make(CUR), rows = kids(a.group).filter((k) => k.name.includes('beads-'));
  assert.equal(rows.length, 2, '算盤應有兩排珠子 Mesh');
  const smokes = kids(a.group).filter((k) => k.name.includes('smoke')); assert.equal(smokes.length, 2, '收驚婆與爐主各一縷煙');
  let maxX = 0, peak = 0, idleZero = true, prevOn = false, endsZero = true;
  sim(a, 20, () => {
    const on = rows.some((r) => r.visible);
    for (const r of rows) maxX = Math.max(maxX, Math.abs(r.position.x));
    if (prevOn && !on) endsZero = endsZero && rows.every((r) => r.position.x === 0);
    prevOn = on;
    for (const s of smokes) { peak = Math.max(peak, s.material.opacity); if (!s.visible && s.material.opacity !== 0) idleZero = false; }
  });
  assert.ok(maxX >= 0.006 && maxX <= 0.012, 'maxX=' + maxX);
  assert.ok(endsZero, '動作結束珠子未精確回位');
  assert.ok(peak >= 0.25, 'peak=' + peak);
  assert.ok(idleZero, '煙不可見時不透明度應為 0');
  a.props.dispose();
});

test('M6 不增遮擋：子 Mesh 世界 AABB ⊆ relicBoxes；兩套版面 relicBoxes／relicObstacles 與基準相等', () => {
  for (const layout of ['L', 'P']) {
    const a = make(CUR, { layout }), b = make(BASE, { layout });
    assert.equal(JSON.stringify(a.props.relicBoxes()), JSON.stringify(b.props.relicBoxes()), layout + ' relicBoxes');
    assert.equal(JSON.stringify(a.props.relicObstacles()), JSON.stringify(b.props.relicObstacles()), layout + ' relicObstacles');
    const boxes = a.props.relicBoxes(), box = new THREE.Box3(); let checked = 0; const E = 1e-9;
    sim(a, 24, () => {
      for (const k of kids(a.group).filter((q) => q.visible)) {
        const B = boxes.find((x) => x.seat === seatOf(k)); box.setFromObject(k);
        assert.ok(box.min.x >= B.x - B.hx - E && box.max.x <= B.x + B.hx + E && box.min.z >= B.z - B.hz - E && box.max.z <= B.z + B.hz + E && box.max.y <= B.top + E, `${layout} ${k.name} 超出 relicBoxes`);
        checked++;
      }
    });
    assert.ok(checked > 100, 'checked=' + checked);
    a.props.dispose(); b.props.dispose();
  }
});

test('M7 決定性與幀率無關；新增行不含隨機／牆鐘', () => {
  const log = (dt) => {
    const r = make(CUR), out = []; const n = Math.round(12 / dt);
    for (let i = 1; i <= n; i++) {
      r.props.update(dt); const q = Math.round(i * dt / 0.25);
      if (Math.abs(i * dt - q * 0.25) < 1e-9 && q % 2 === 1) out.push([q, kids(r.group).map((c) => [c.visible ? 1 : 0, c.position.x, c.position.y, c.scale.x, c.scale.y, c.material.opacity])]);
    }
    r.props.dispose(); return out;
  };
  const a = log(1 / 60), a2 = log(1 / 60), c = log(1 / 20);
  assert.equal(JSON.stringify(a), JSON.stringify(a2));
  assert.equal(a.length, c.length);
  assert.ok(a.some((x) => x[1].some((k) => k[0] === 1)), '取樣點上從未有子 Mesh 可見（比對空轉）');
  for (let i = 0; i < a.length; i++) { assert.equal(a[i][0], c[i][0]); assert.ok(close(a[i][1], c[i][1], 1e-9), '時刻 ' + a[i][0] * 0.25); }
  const files = ['js/table-props.js', 'js/relic-motion.js'];
  const diff = execFileSync('git', ['diff', BASE_SHA, '--', ...files], { cwd: ROOT, encoding: 'utf8' }); // 含未提交
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  assert.ok(!/Math\.random|Date\.now|performance\.now/.test(added), '新增行含隨機／牆鐘');
});

test('M8 ?handslow=2：第一次動作起點時刻為 k=1 的 2 倍', () => {
  const first = (slow) => { const r = make(CUR, { slow }); let t = 0, f = null; for (let i = 0; i < 1800 && f === null; i++) { r.props.update(DT); t += DT; if (kids(r.group).some((k) => k.visible)) f = t; } r.props.dispose(); return f; };
  const f1 = first(undefined), f2 = first(2);
  globalThis.YS_ANIM_SLOW = undefined;
  assert.ok(f1 !== null && f2 !== null);
  assert.ok(Math.abs(f2 / f1 - 2) < 0.05, `f1=${f1} f2=${f2}`);
});

test('M9 setSeats 換角色與 dispose：子 geometry／material 皆 dispose、無殘留', () => {
  const watch = (r, into) => { for (const k of kids(r.group)) for (const o of [k.geometry, k.material]) { const rec = { n: k.name, d: false }; o.addEventListener('dispose', () => { rec.d = true; }); into.push(rec); } };
  const a = make(CUR), seen = []; watch(a, seen);
  assert.ok(seen.length >= 8, 'seen=' + seen.length);
  a.props.setSeats([0, 1, 2, 3].map((id) => ({ id, role: 'hunter' })));
  assert.ok(seen.every((s) => s.d), '換角色後子資源未釋放：' + JSON.stringify(seen.filter((s) => !s.d)));
  assert.equal(kids(a.group).length, 0);
  const b = make(CUR), seen2 = []; watch(b, seen2);
  b.props.dispose();
  assert.ok(seen2.length && seen2.every((s) => s.d), 'dispose 後子資源未釋放');
  a.props.dispose();
});

test('M3b（加嚴，凍結檔修訂 2）煙只在動作窗可見：窗外不可見且不透明度 0；30 秒內可見步數占比 ≤ 動作窗占比＋2%', () => {
  const a = make(CUR), smokes = kids(a.group).filter((k) => k.name.includes('smoke')); let total = 0, vis = 0;
  assert.equal(smokes.length, 2);
  sim(a, 30, () => {
    for (const s of smokes) {
      total++;
      if (s.visible) { vis++; assert.ok(s.material.opacity > 0, s.name + ' 可見但不透明度 0'); } else assert.equal(s.material.opacity, 0, s.name + ' 不可見時不透明度須為 0');
    }
  });
  assert.ok(vis > 0, '煙從未出現');
  assert.ok(vis / total <= 1.4 / 6 + 0.02, '煙可見占比 ' + (vis / total).toFixed(3));
  a.props.dispose();
});
