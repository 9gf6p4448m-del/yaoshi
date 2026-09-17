/* A1 描邊外殼合併（對決卷二，2026-09-17）：同一尊的外殼由「每顆本體 mesh 一顆」併成「一尊一顆」。
 * 這裡驗 mergeOutlineGeometry 的合併語意（屬性串接、index 位移、ghost 群組剔除、不合前提回 null）；
 * 「每尊外殼數 197→16、像素相同」的行為紅綠在真實頁面探針（docs/experiments/2026-09-17-a1-outline-merge）。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
register('./tools/three-node-resolver.mjs', import.meta.url);
const THREE = await import('three');

const noop = () => {};
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ({ createRadialGradient: () => ({ addColorStop: noop }), fillRect: noop, fillStyle: null }) }),
    addEventListener: noop, removeEventListener: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    body: { style: {}, appendChild: noop }, documentElement: { style: {} }, hidden: false,
  };
}
const { mergeOutlineGeometry } = await import(pathToFileURL(path.join(ROOT, 'js/creature-figures.js')).href);

/** 合成一顆蒙皮部件：nVerts 個頂點、tris 個三角形（index 依序）、位置值＝base+i，skinIndex 全指向 bone。 */
function part(nVerts, tris, base, bone, materials, groups) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: nVerts * 3 }, (_, i) => base + i), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(nVerts * 3).fill(1), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(nVerts * 3).fill(0.5), 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(nVerts * 4).fill(bone), 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(nVerts * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
  g.setIndex(tris.flat());
  if (groups) groups.forEach((gr) => g.addGroup(gr.start, gr.count, gr.materialIndex));
  const m = new THREE.SkinnedMesh(g, materials.length === 1 ? materials[0] : materials);
  return m;
}
const mat = (name) => Object.assign(new THREE.MeshStandardMaterial(), { name });
const isGhost = (m) => /^ghost_/i.test((m && m.name) || '');

test('merge: two parts concatenate every attribute and offset the second index range', () => {
  const a = part(4, [[0, 1, 2], [1, 2, 3]], 100, 0, [mat('body')]);
  const b = part(3, [[0, 1, 2]], 200, 1, [mat('arm')]);
  const g = mergeOutlineGeometry([a, b], isGhost);
  assert.ok(g, '兩個合格部件必須併得出來');
  for (const k of ['position', 'normal', 'color', 'skinIndex', 'skinWeight']) assert.equal(g.attributes[k].count, 7, `${k} count 應為 4+3`);
  assert.equal(g.index.count, 9, 'index 應為 6+3');
  assert.deepEqual(Array.from(g.index.array), [0, 1, 2, 1, 2, 3, 4, 5, 6], '第二段 index 要位移 4');
  assert.equal(g.attributes.position.getX(4), 200, '第二段 position 接在後面且值不變');
  assert.equal(g.attributes.skinIndex.getX(0), 0); assert.equal(g.attributes.skinIndex.getX(6), 1, 'skinIndex 是骨頭編號，不得被位移');
  assert.ok(g.attributes.skinIndex.array instanceof Uint16Array, '屬性型別沿用來源');
});

test('merge: ghost material groups are dropped, other groups kept; all-ghost part contributes nothing', () => {
  const twoMat = part(6, [[0, 1, 2], [3, 4, 5]], 300, 2, [mat('ghost_skirt'), mat('torso')], [{ start: 0, count: 3, materialIndex: 0 }, { start: 3, count: 3, materialIndex: 1 }]);
  const ghostOnly = part(3, [[0, 1, 2]], 400, 3, [mat('ghost_hair')]);
  const solid = part(3, [[0, 1, 2]], 500, 4, [mat('head')]);
  const g = mergeOutlineGeometry([twoMat, ghostOnly, solid], isGhost);
  assert.ok(g);
  assert.equal(g.attributes.position.count, 9, '全 ghost 的部件整個不併（6+3）');
  assert.deepEqual(Array.from(g.index.array), [3, 4, 5, 6, 7, 8], 'ghost 群組的三角形剔除，torso 群組保留；solid 段位移 6');
  assert.equal(g.groups.length, 0, '合併後單一材質，不留 groups');
});

test('merge: returns null when a part has no index or a different attribute set (caller falls back to per-part shells)', () => {
  const a = part(3, [[0, 1, 2]], 0, 0, [mat('a')]);
  const noIndex = part(3, [[0, 1, 2]], 0, 0, [mat('b')]); noIndex.geometry.setIndex(null);
  assert.equal(mergeOutlineGeometry([a, noIndex], isGhost), null);
  const extraUv = part(3, [[0, 1, 2]], 0, 0, [mat('c')]); extraUv.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(6), 2));
  assert.equal(mergeOutlineGeometry([a, extraUv], isGhost), null);
  assert.equal(mergeOutlineGeometry([part(3, [[0, 1, 2]], 0, 0, [mat('ghost_all')])], isGhost), null, '全部都是 ghost → null');
});
