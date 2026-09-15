/* A1 resize regression: turn a live reveal push from landscape to portrait and
 * back.  Portrait intentionally does not fit the tabletop, but it must not
 * retain the landscape view offset; returning to landscape must refit. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium, devices } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const PORT = 8995;

async function toMark(page) {
  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate(() => {
      const button = document.querySelector('#mainbtn');
      return { text: button?.textContent || '', disabled: !button || button.disabled };
    });
    if (!state.disabled && /不盯任何一件/.test(state.text)) return;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(button => !button.disabled)?.click());
    await page.waitForTimeout(160);
  }
  throw new Error('seed 1 did not reach the normal mark phase');
}

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
let browser;
const errors = [];
try {
  await new Promise(resolve => setTimeout(resolve, 900));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 } });
  await ctx.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await toMark(page);
  await page.waitForFunction(() => window.__yaoshi3d.tray.items().every(item => item.ready), null, { timeout: 60000 });
  await page.evaluate(() => {
    window.__resizePush = { slot: null };
    document.addEventListener('ys:reveal-slot', event => { if (window.__resizePush.slot === null) window.__resizePush.slot = event.detail?.slot; });
  });
  await page.click('#mainbtn');
  await page.waitForFunction(() => /蓋牌開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  await page.evaluate(() => { openSheet(2); bump(1); closeSheet(); });
  await page.waitForTimeout(550);
  await page.click('#mainbtn');
  await page.waitForFunction(() => /^開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  await page.waitForTimeout(550);
  await page.click('#mainbtn');
  await page.waitForFunction(() => window.__resizePush?.slot !== null && window.__yaoshi3d.framing?.fit === true, null, { timeout: 30000 });
  await page.waitForTimeout(120);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  const portrait = await page.evaluate(() => ({ active: window.__yaoshi3d.framing.active === true, fit: window.__yaoshi3d.framing.fit === true, viewOffset: window.__yaoshi3d.camera.view?.enabled === true, inner: [innerWidth, innerHeight] }));
  await page.setViewportSize({ width: 852, height: 393 });
  await page.waitForTimeout(80);
  const landscape = await page.evaluate(() => ({ active: window.__yaoshi3d.framing.active === true, fit: window.__yaoshi3d.framing.fit === true, viewOffset: window.__yaoshi3d.camera.view?.enabled === true, inner: [innerWidth, innerHeight] }));
  const stalePortraitOverlay = !portrait.active && portrait.viewOffset;
  const recovered = landscape.active && landscape.fit && landscape.viewOffset;
  const pass = !stalePortraitOverlay && recovered && errors.length === 0;
  console.log(JSON.stringify({ fixture: 'seed 1 normal UI reveal push; landscape -> portrait -> landscape during first slot', portrait, landscape, stalePortraitOverlay, recovered, errors, pass }, null, 2));
  if (!pass) process.exitCode = 1;
  await ctx.close();
} finally {
  await browser?.close();
  server.kill();
}
