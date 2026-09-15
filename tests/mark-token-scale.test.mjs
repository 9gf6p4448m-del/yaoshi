import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// Run the real geometry and instance updates with the project's existing Three dependency.
const threeURL = new URL('../tools/anyCreature/node_modules/three/build/three.module.js', import.meta.url).href;
const THREE = await import(threeURL);
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const source = name => fs.readFileSync(new URL('../js/' + name, import.meta.url), 'utf8')
  .replace("from 'three'", `from '${threeURL}'`);
const sceneURL = asModule(source('scene-env.js'));
const propsURL = asModule(source('table-props.js')
  .replace("import('./scene-env.js' + V)", `import('${sceneURL}')`));
const { createTableProps, PROPS } = await import(propsURL);

test('同槽四席盯牌的投影互不疊字，重設版面與揭盅後仍成立', () => {
  const props = createTableProps(new THREE.Group());
  const cam = new THREE.PerspectiveCamera(50, 852 / 393, 0.01, 100);
  cam.position.set(0, Math.sin(35 * Math.PI / 180) * 3.6, Math.cos(35 * Math.PI / 180) * 3.6);
  cam.lookAt(0, 0.1, 0); cam.updateMatrixWorld();
  const check = () => {
    const tokens = props.group.getObjectByName('prop-tokens');
    const matrix = new THREE.Matrix4(), v = new THREE.Vector3();
    tokens.geometry.computeBoundingBox();
    const b = tokens.geometry.boundingBox;
    const boxes = [];
    for (let i = 0; i < tokens.count; i++) {
      tokens.getMatrixAt(i, matrix);
      const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      for (let k = 0; k < 8; k++) {
        v.set(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(matrix).project(cam);
        box.x0 = Math.min(box.x0, v.x); box.x1 = Math.max(box.x1, v.x);
        box.y0 = Math.min(box.y0, v.y); box.y1 = Math.max(box.y1, v.y);
      }
      boxes.push(box);
      assert.ok(box.x0 >= 2 * 227 / 852 - 1 && box.x1 <= 1 - 2 * 227 / 852,
        `token ${i} enters side rail: ${JSON.stringify(box)}`);
      assert.ok(box.y0 >= 1 - 2 * 310 / 393, `token ${i} enters bottom controls: ${JSON.stringify(box)}`);
    }
    assert.equal(boxes.length, 4);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0,
        `token ${i}/${j} overlaps: ${JSON.stringify([a, b])}`);
    }
  };
  try {
    assert.equal(PROPS.TOKEN.W, 0.150, '使用者已選 B 中型牌');
    // All 4^4 legal seat/slot combinations also catch adjacent groups colliding.
    for (let assignment = 0; assignment < 256; assignment++) {
      const slot = assignment & 3;
      props.clearRound();
      props.setLayout('L', [-1.35, -0.45, 0.45, 1.35], 0.15, 0.1, 1);
      for (let seat = 0; seat < 4; seat++) props.mark(seat, (assignment >> (seat * 2)) & 3);
      props.update(1); check();
      props.setLayout('L', [-1.35, -0.45, 0.45, 1.35], 0.15, 0.1, 1);
      check();
      props.reveal(slot, 1); check();
    }
  } finally { props.dispose(); }
});

test('盯牌在陰影、出價、揭盅與換夜後仍保持原始牌面比例', () => {
  const props = createTableProps(new THREE.Group());
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
  const check = label => {
    const tokens = props.group.getObjectByName('prop-tokens');
    assert.ok(tokens.count > 0, label + ': missing tokens');
    for (let i = 0; i < tokens.count; i++) {
      tokens.getMatrixAt(i, matrix);
      scale.setFromMatrixScale(matrix);
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Math.abs(scale[axis] - 1) < 1e-6,
          `${label}: token ${i} ${axis} scale=${scale[axis]}, expected 1`);
      }
    }
  };
  try {
    props.setLayout('L', [-1.35, -0.45, 0.45, 1.35], 0.15, 0.1, 1);
    props.setSeats(['qingmian', 'shoujing', 'hongyi', 'xiaonv'].map((role, id) => ({ id, role })));
    assert.equal(props.stats().relics.length, 4);
    for (let seat = 0; seat < 4; seat++) props.mark(seat, seat);
    props.update(1);
    check('marks with relic shadows');
    for (let seat = 0; seat < 4; seat++) for (let slot = 0; slot < 4; slot++) props.bid(seat, slot, 8);
    assert.equal(props.stats().chips, 128);
    props.update(1);
    check('128 coins and compact shadows');
    props.reveal(0, 0);
    props.update(0.1);
    check('winner pulse');
    props.clearRound();
    props.setLayout('P', [-0.5, -0.17, 0.17, 0.5], 0.15, 0.1, 1);
    props.mark(1, 2);
    props.update(1);
    check('new round portrait');
  } finally {
    props.dispose();
  }
});
