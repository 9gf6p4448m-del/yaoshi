import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

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
