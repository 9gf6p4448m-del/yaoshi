import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../tools/anyCreature/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../tools/anyCreature/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../tools/anyCreature/node_modules/three/examples/jsm/utils/SkeletonUtils.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// helper 不存在時退回「什麼都不做」：讓紅燈落在骨架數的行為斷言，而不是 import 錯誤。
const { shareSkeletons } = await import(pathToFileURL(path.join(ROOT, 'js/skeleton-share.js')).href)
  .catch(() => ({ shareSkeletons: () => null }));

async function loadCoin() {
  const bytes = await fs.promises.readFile(path.join(ROOT, 'assets/creatures/yinyangcoin.glb'));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
const skinned = root => { const out = []; root.traverse(o => { if (o.isSkinnedMesh) out.push(o); }); return out; };
const boneSets = meshes => new Set(meshes.map(m => m.skeleton.bones.map(b => b.uuid).join(',') + '|' + m.skeleton.boneInverses.map(x => x.elements.join(' ')).join(';')));
function pose(root, meshes, mixer, seconds) {
  mixer.setTime(seconds);
  root.updateMatrixWorld(true);
  for (const m of meshes) m.skeleton.update();
  const v = new THREE.Vector3();
  return meshes.map(m => [0, 7, 31, 101, m.geometry.attributes.position.count - 1].filter(i => i >= 0 && i < m.geometry.attributes.position.count)
    .map(i => { m.getVertexPosition(i, v); return [v.x, v.y, v.z]; }));
}

test('cloned figure meshes with identical bone sets share one skeleton and skin to the same positions', async () => {
  const gltf = await loadCoin();
  const model = cloneSkinned(gltf.scene);
  const meshes = skinned(model);
  assert.ok(meshes.length > 1, 'fixture must have several skinned meshes');
  const before = new Set(meshes.map(m => m.skeleton)).size, sets = boneSets(meshes).size;
  assert.ok(before > sets, `SkeletonUtils.clone should rebuild one skeleton per mesh (${before}) for ${sets} bone set(s); otherwise this test guards nothing`);
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(gltf.animations[0]).play();
  const expected = pose(model, meshes, mixer, .37);
  shareSkeletons(model);
  const after = new Set(meshes.map(m => m.skeleton)).size;
  assert.equal(after, sets, 'meshes with the same bones and inverses must share one skeleton object');
  assert.deepEqual(pose(model, meshes, mixer, .37), expected, 'sharing the skeleton must not move any skinned vertex');
  assert.notDeepEqual(pose(model, meshes, mixer, .91), expected, 'the sampled pose must actually depend on the animation time');
});

test('sharing stays inside one figure: separate clones keep independent skeletons and poses', async () => {
  const gltf = await loadCoin();
  const a = cloneSkinned(gltf.scene), b = cloneSkinned(gltf.scene);
  shareSkeletons(a); shareSkeletons(b);
  const ma = skinned(a), mb = skinned(b);
  const skA = new Set(ma.map(m => m.skeleton)), skB = new Set(mb.map(m => m.skeleton));
  assert.equal([...skA].filter(s => skB.has(s)).length, 0, 'two figures must never share a skeleton');
  const mixA = new THREE.AnimationMixer(a), mixB = new THREE.AnimationMixer(b);
  mixA.clipAction(gltf.animations[0]).play(); mixB.clipAction(gltf.animations[0]).play();
  const poseA = pose(a, ma, mixA, .2);
  pose(b, mb, mixB, 1.3);
  assert.deepEqual(pose(a, ma, mixA, .2), poseA, 'posing figure B must not pull figure A');
});
