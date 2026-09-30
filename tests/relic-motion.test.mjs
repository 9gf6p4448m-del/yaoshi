import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// relic-motion.js 是純函式、無 three 依賴；專案沒有 package.json type，改以 data URL 當 ES module 載入。
const src = fs.readFileSync(new URL('../js/relic-motion.js', import.meta.url), 'utf8');
const { relicPose, RELIC_MOVE, RELIC_MOVE_MS } = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));

const ROLES = ['shoujing', 'dangpu', 'zutou', 'qingmian', 'hongyi', 'duanshou', 'hunter', 'xiaonv', 'lvshan', 'luzhu'];
const IDLE = { dy: 0, rx: 0, ry: 0, rz: 0, sy: 1 };

test('十個角色各有自己的動作，沒有漏角色', () => {
  assert.deepEqual(Object.keys(RELIC_MOVE).sort(), [...ROLES].sort());
});

test('t≤0 與 t≥1 精確回到原擺位（動作結束時信物不能漂移）', () => {
  for (const role of [...ROLES, 'unknown-role']) {
    for (const t of [-1, 0, 1, 2, NaN]) assert.deepEqual(relicPose(role, t), IDLE, `${role} t=${t}`);
  }
});

test('動作進行中確實有位移，且每個角色的動作互不相同', () => {
  const sig = new Set();
  for (const role of ROLES) {
    let moved = false;
    const row = [];
    for (let i = 1; i < 20; i++) {
      const o = relicPose(role, i / 20);
      row.push(o.dy.toFixed(5), o.rx.toFixed(5), o.ry.toFixed(5), o.rz.toFixed(5), o.sy.toFixed(5));
      if (o.dy !== 0 || o.rx !== 0 || o.ry !== 0 || o.rz !== 0 || o.sy !== 1) moved = true;
    }
    assert.ok(moved, `${role} 整段沒有任何動作`);
    sig.add(row.join(','));
  }
  assert.equal(sig.size, ROLES.length, '有兩個角色的動作曲線完全相同');
});

test('幅度上限：信物只是「小動作」，不能搶拍品', () => {
  for (const role of ROLES) {
    for (let i = 0; i <= 200; i++) {
      const o = relicPose(role, i / 200);
      assert.ok(Math.abs(o.dy) <= 0.025, `${role} dy=${o.dy}`);
      for (const a of [o.rx, o.ry, o.rz]) assert.ok(Math.abs(a) <= 0.4, `${role} 旋轉 ${a} rad 過大`);
      assert.ok(o.sy >= 0.85 && o.sy <= 1.06, `${role} sy=${o.sy}`);
    }
  }
});

test('決定性：同一個 t 每次結果相同，沒有亂數', () => {
  for (const role of ROLES) assert.deepEqual(relicPose(role, 0.37), relicPose(role, 0.37));
});

test('未知角色（退路素木牌）也有動作，不會丟例外', () => {
  const o = relicPose('nobody', 0.5);
  assert.ok(o.dy > 0);
  assert.ok(RELIC_MOVE_MS > 0.42, '動作要比籌碼飛行（0.42s）略長');
});
