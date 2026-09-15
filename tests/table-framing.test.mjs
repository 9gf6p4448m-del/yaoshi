import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as THREE from '../tools/anyCreature/node_modules/three/build/three.module.js';

test('framing moves an intact projected subject away from HUD using the least displacement', async () => {
  const source = fs.readFileSync(new URL('../js/table-framing.js', import.meta.url), 'utf8');
  const { placeSubject } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const area = { left: 230, top: 65, right: 622, bottom: 306 };
  const head = { left: 240, top: 70, right: 612, bottom: 125 };
  const subject = { left: 330, top: 95, right: 430, bottom: 205 };
  assert.deepEqual(placeSubject(subject, area, [head]), { x: 0, y: 30 });
  assert.deepEqual(placeSubject({ left: 330, top: 140, right: 430, bottom: 250 }, area, [head]), { x: 0, y: 0 });
  assert.deepEqual(placeSubject({ left: 100, top: 140, right: 200, bottom: 250 }, area, [head]), { x: 130, y: 0 });
  assert.equal(placeSubject({ left: 0, top: 0, right: 400, bottom: 300 }, area, [head]), null,
    'an impossible fit must stay a failure, not shrink or clip the subject');
  assert.equal(placeSubject({ left: NaN, top: 0, right: 30, bottom: 30 }, area, []), null);
  assert.equal(placeSubject(null, area, []), null, 'missing geometry cannot pass');
  const multi = [head, { left: 480, top: 150, right: 622, bottom: 306 }];
  const b = { left: 500, top: 170, right: 600, bottom: 270 };
  assert.deepEqual(placeSubject(b, area, multi), { x: -120, y: 0 });
});

test('flight depth prevents approach magnification and projection counts only visible geometry', async () => {
  const source = fs.readFileSync(new URL('../js/table-framing.js', import.meta.url), 'utf8');
  const { keepFlightDepth, projectSubject } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const camera = new THREE.PerspectiveCamera(50, 852 / 393, .01, 100);
  camera.position.set(0, 1, 2); camera.lookAt(0, .2, 0); camera.updateMatrixWorld();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .8, .3), new THREE.MeshBasicMaterial()));
  const hidden = new THREE.Group(); hidden.visible = false;
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50), new THREE.MeshBasicMaterial()));
  group.add(hidden); group.position.set(0, .4, .1);
  const from = group.position.clone();
  const before = projectSubject(group, camera, 852, 393);
  assert.ok(before.right - before.left < 150);
  group.position.set(.2, .6, 1.6);
  keepFlightDepth(group, from, camera);
  const after = projectSubject(group, camera, 852, 393);
  const depth = p => p.clone().applyMatrix4(camera.matrixWorldInverse).z;
  assert.ok(Math.abs(depth(group.position) - depth(from)) < 1e-10);
  assert.deepEqual(group.scale.toArray(), [1, 1, 1]);
  assert.ok(Math.abs((after.bottom - after.top) - (before.bottom - before.top)) < 15);
  group.visible = false;
  assert.equal(projectSubject(group, camera, 852, 393), null);
});

test('adaptive camera retreats to fit HUD space without changing model scale', async () => {
  const source = fs.readFileSync(new URL('../js/table-framing.js', import.meta.url), 'utf8');
  const { fitSubject, projectSubject } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const camera = new THREE.PerspectiveCamera(50, 852 / 393, .01, 100);
  camera.position.set(0, .6, 1.6); camera.lookAt(0, .4, .1); camera.updateMatrixWorld();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(.6, 1.2, .4), new THREE.MeshBasicMaterial()));
  group.position.set(.2, .6, .1); group.scale.setScalar(.7);
  const area = { left: 235, top: 160, right: 617, bottom: 302 };
  const report = fitSubject(group, camera, area, [], 852, 393);
  assert.equal(report.fit, true); assert.ok(report.retreat > 0);
  const b = projectSubject(group, camera, 852, 393);
  assert.ok(b.left >= area.left - 1e-6 && b.right <= area.right + 1e-6);
  assert.ok(b.top >= area.top - 1e-6 && b.bottom <= area.bottom + 1e-6);
  assert.deepEqual(group.scale.toArray(), [.7, .7, .7]);
  assert.equal(camera.fov, 50);
});
