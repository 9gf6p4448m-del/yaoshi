import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

/* 寫實美術素材守衛（2026-10-07）：index.html 的 POOL／CURSES／CHAR_SVG 每一項都要有對應 webp，
   且尺寸正確。抓「補了法寶／角色卻沒補圖」與「素材腳本沒跑」。
   對照表來源：tools/art-pipeline/manifest.json（由 build_assets.py 從 index.html 解析產生，非手打）。 */
const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('tools/art-pipeline/manifest.json', root), 'utf8'));

function webpSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', file + ' 不是 RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', file + ' 不是 WEBP');
  const fmt = b.toString('ascii', 12, 16);
  if (fmt === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (fmt === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (fmt === 'VP8L') {
    const v = b.readUInt32LE(21);
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
  }
  throw new Error('未知 WEBP 格式 ' + fmt);
}
function poolNames() {
  const i = html.indexOf('const POOL = [');
  const pool = html.slice(i, html.indexOf('\n];', i));
  const k = html.indexOf('const CURSES = [');
  const cur = html.slice(k, html.indexOf('\n];', k));
  const re = /\{n:"([^"]+)"/g;
  const names = [];
  for (const seg of [pool, cur]) for (const m of seg.matchAll(re)) names.push(m[1]);
  return names;
}
const file = rel => new URL(rel, root);

test('POOL＋CURSES 每個品名都在素材對照表，且有 128／384 兩種尺寸的 webp', () => {
  const names = poolNames();
  assert.equal(names.length, 32, 'POOL 27＋CURSES 5');
  for (const n of names) {
    const key = manifest.items[n];
    assert.ok(key, `素材對照表缺品名：${n}（新增法寶後要補圖並重跑 tools/art-pipeline/build_assets.py）`);
    assert.deepEqual(webpSize(file(`assets/items/${key}.webp`)), [128, 128], n + ' 小圖尺寸');
    assert.deepEqual(webpSize(file(`assets/items/${key}-lg.webp`)), [384, 384], n + ' 大圖尺寸');
  }
  assert.equal(Object.keys(manifest.items).length, names.length, '對照表不得有多餘項');
});

test('index.html 的 ITEM_IMG 與素材對照表逐項一致（防手改走樣）', () => {
  const body = html.match(/const ITEM_IMG=\{([\s\S]*?)\};/)[1];
  const inHtml = Object.fromEntries([...body.matchAll(/([^\s,:{}]+):"([\w-]+)"/g)].map(x => [x[1], x[2]]));
  assert.deepEqual(inHtml, manifest.items);
});

test('CHAR_SVG 的十個選角角色各有三態頭像與選角大圖（human 為選角模式不使用的遺留，不要求）', () => {
  const m = html.match(/const CHAR_SVG=\{([^}]*)\}/)[1];
  const map = Object.fromEntries([...m.matchAll(/(\w+):"(\w+)"/g)].map(x => [x[1], x[2]]));
  const ids = Object.keys(map).filter(id => id !== 'human');
  assert.equal(ids.length, 10);
  for (const id of ids) {
    const stem = map[id];
    assert.equal(manifest.characters[id]?.stem, stem, `${id} 的 stem 與 CHAR_SVG 不一致`);
    for (const st of ['healthy', 'pale', 'dying'])
      assert.deepEqual(webpSize(file(`assets/characters/${stem}-${st}.webp`)), [320, 320], `${id} ${st}`);
    assert.deepEqual(webpSize(file(`assets/characters/${stem}-big.webp`)), [640, 640], `${id} big`);
  }
});
