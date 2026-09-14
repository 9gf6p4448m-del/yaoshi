import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = fs.readFileSync(path.join(root, 'js', 'table-tray.js'), 'utf8');
const traySource = source.slice(source.indexOf('export function createTableTray'));

test('disposing the tray releases its moon-ring instance buffer', () => {
  const dispose = traySource.match(/dispose\(\) \{[\s\S]*?scene\.remove\(group\);[\s\S]*?\},/);
  assert.ok(dispose, 'tray dispose implementation must be present');
  assert.match(dispose[0], /moonMarks\.dispose\(\)/,
    'moon ring InstancedMesh must dispose its instanceMatrix GPU buffer');
});
