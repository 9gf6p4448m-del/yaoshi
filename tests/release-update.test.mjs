import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const version = html.match(/const VERSION="([^"]+)"/)[1];
const release = html.match(/const RELEASE_VERSION="([^"]+)"/)[1];
const probe = html.slice(html.indexOf('let UPD_LAST='), html.indexOf('function applyUpdate()'));

test('首頁、更新探針與資產快取使用相同發布版本', () => {
  assert.equal(version, release);
});

async function check(local, remote) {
  const banner = { textContent: '', classList: { add(name) { banner.shown = name; } } };
  const fetch = async () => ({ ok: true, text: async () => remote });
  const run = new Function('VERSION', 'fetch', 'location', 'document', probe + '\ncheckForUpdate(true);');
  run(local, fetch, { protocol: 'https:', pathname: '/yaoshi/index.html' }, { getElementById: () => banner });
  await new Promise(resolve => setImmediate(resolve));
  return banner;
}

test('舊主畫面版本可以發現本次發布；同版與舊版不提示', async () => {
  const old = await check('0.56e', html);
  assert.equal(old.shown, 'on');
  assert.ok(old.textContent.includes(release));
  assert.equal((await check(version, html)).shown, undefined);
  assert.equal((await check(version, 'const VERSION="0.55.9";')).shown, undefined);
});
