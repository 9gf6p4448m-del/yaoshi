import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('3D 拍賣桌把私有心願收進局勢列，不佔桌心 stage', () => {
  assert.match(page, /function setFeltPrivateContext\(p,hollow\)/);
  assert.match(page, /\$\("stage"\)\.innerHTML=`\$\{hollow\?"":prev\}[\s\S]{0,250}\$\{hollow\?"":wishBarHTML\(ap\)\}/);
  assert.match(page, /setFeltPrivateContext\(ap,hollow\);/);
  assert.match(page, /#feltHead \.wishbar/);
});
