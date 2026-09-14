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

test('從側欄查看拍品時，3D 桌上同一件也會進入檢視態', () => {
  const openSheet = page.match(/function openSheet\(i\)\{([\s\S]*?)\n\}/)?.[1] || '';

  assert.match(openSheet, /tray\.setHover\(i\)/,
    '側欄卡片與 3D 模型必須共享同一個拍品索引的檢視態');
});

test('首頁顯示可核對的發布版本', () => {
  assert.match(page, /const RELEASE_VERSION="0\.57\.2"/, '本次公開版需遞增語意版本');
  assert.match(page, /v\$\{RELEASE_VERSION\}/, '首頁版本列必須顯示發布版本');
  assert.match(page, /renderer\.js\?v="\+RELEASE_VERSION/, '3D 模組快取鍵必須隨發布版本更新');
});
