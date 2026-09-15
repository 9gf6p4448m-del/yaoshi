import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as THREE from '../tools/anyCreature/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../tools/anyCreature/node_modules/three/examples/jsm/loaders/GLTFLoader.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PHASES = [0, .25, .5, .75, 1];

async function framing() {
  const source = fs.readFileSync(new URL('../js/table-framing.js', import.meta.url), 'utf8');
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

function poolKeys() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const pool = html.slice(html.indexOf('const POOL = ['), html.indexOf('];', html.indexOf('const POOL = [')) + 2);
  return [...pool.matchAll(/\b(?:ab|m):"([^"]+)"/g)].map(m => m[1]);
}

async function loadAsset(key) {
  const file = path.join(ROOT, 'assets', 'creatures', `${key}.glb`);
  const bytes = await fs.promises.readFile(file);
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}

function contains(outer, inner, label) {
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(outer.min[axis] <= inner.min[axis] + 1e-8, `${label}: min.${axis} escapes fast bounds (${outer.min[axis]} > ${inner.min[axis]})`);
    assert.ok(outer.max[axis] >= inner.max[axis] - 1e-8, `${label}: max.${axis} escapes fast bounds (${outer.max[axis]} < ${inner.max[axis]})`);
  }
}

function skinned(scene) {
  const meshes = [];
  scene.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  return meshes;
}

function updateScene(scene) {
  scene.updateWorldMatrix(true, false);
  scene.updateMatrixWorld(true); // uses SkinnedMesh.updateMatrixWorld and refreshes bindMatrixInverse
  for (const mesh of skinned(scene)) mesh.skeleton.update();
}

test('posedBounds conservatively contains every POOL skin pose across every authored clip', async () => {
  const { posedBounds } = await framing();
  assert.equal(typeof posedBounds, 'function', 'table-framing must export posedBounds(mesh)');
  const keys = poolKeys();
  assert.equal(keys.length, 27, 'POOL asset list changed; update this full-asset geometry contract deliberately');
  for (const key of keys) {
    const gltf = await loadAsset(key);
    const scene = gltf.scene;
    // Parent transforms must not leave bindMatrixInverse stale before bounding.
    scene.position.set(.37, -.22, .41);
    scene.rotation.set(.23, -.31, .17);
    scene.scale.set(1.18, .83, 1.09);
    const mixer = new THREE.AnimationMixer(scene);
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip).reset().play();
      for (const phase of PHASES) {
        mixer.setTime(clip.duration * phase);
        updateScene(scene);
        for (const mesh of skinned(scene)) {
          mesh.computeBoundingBox();
          const fast = posedBounds(mesh);
          assert.ok(fast?.isBox3 && !fast.isEmpty(), `${key}/${clip.name}@${phase}: no posed Box3`);
          contains(fast, mesh.boundingBox, `${key}/${clip.name}@${phase}/${mesh.name}`);
        }
      }
      action.stop();
    }
  }
});

function weightedSkin(weights) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.4, 0, 0, .4, 0, 0, 0, .8, 0,
  ], 3));
  const indices = new Uint16Array(3 * 4);
  const skinWeights = new Float32Array(3 * 4);
  for (let i = 0; i < 3; i++) {
    indices.set([0, 1, 0, 0], i * 4);
    skinWeights.set([weights[0], weights[1], 0, 0], i * 4);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  const left = new THREE.Bone(), right = new THREE.Bone();
  mesh.add(left, right);
  mesh.bind(new THREE.Skeleton([left, right]));
  left.position.set(-.8, .2, 0); right.position.set(.9, -.3, .1);
  const root = new THREE.Group(); root.add(mesh);
  root.position.set(.2, -.4, .3); root.rotation.set(.1, -.2, .3); root.scale.set(1.1, .9, 1.2);
  updateScene(root);
  return { root, mesh };
}

test('posedBounds covers mixed and non-normalized skin weights', async () => {
  const { posedBounds } = await framing();
  assert.equal(typeof posedBounds, 'function', 'table-framing must export posedBounds(mesh)');
  for (const [label, weights] of [['mixed-normalized', [.25, .75]], ['non-normalized', [2, 1]]]) {
    const { root, mesh } = weightedSkin(weights);
    // Change the attached root again after binding: this catches stale bind inverses.
    root.position.x += .17; root.rotation.y += .11; updateScene(root);
    mesh.computeBoundingBox();
    const fast = posedBounds(mesh);
    assert.ok(fast?.isBox3 && !fast.isEmpty(), `${label}: no posed Box3`);
    contains(fast, mesh.boundingBox, label);
  }
});
