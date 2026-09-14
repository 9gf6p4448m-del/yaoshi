import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = fs.readFileSync(path.join(root, 'js', 'table-props.js'), 'utf8');

test('128 physical coins use the eight-sided square-hole geometry budget', () => {
  assert.match(source, /SEG:\s*8\b/, 'coins must use the 8-segment profile selected for the 128-coin budget');
  assert.match(source, /HOLE:\s*0\.024/, 'performance work must retain the readable square hole');
  assert.match(source, /T:\s*0\.024/, '128-coin budget must retain the readable, stacked-coin thickness');
  assert.match(source, /b\.quad\(P\(o0, yT\).*錢面/, 'performance work must retain the lit coin face');
  assert.match(source, /b\.quad\(P\(i0, yT\).*方孔內壁/, 'performance work must retain the dark inner wall');
});
