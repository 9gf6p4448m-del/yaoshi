// Additive layout check: 852x393 and 393x852, not a change to frozen 844x390 gates.
// Synthetic safe-area values are fixtures, NOT measurements from an iPhone.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium, devices } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
const out = path.join(root, 'docs/experiments/2026-09-15-iphone-standalone');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 8974);
let browser;
const errors = [], checks = [], captures = [];
const check = (name, pass, details) => checks.push({ name, pass: !!pass, details });
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 } });
  await ctx.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8974/index.html?seed=1&fps=1');
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
  const fixture = async (top, right, bottom, left) => page.evaluate(v => {
    ['top', 'right', 'bottom', 'left'].forEach((side, i) => document.documentElement.style.setProperty(`--safe-${side}`, `${v[i]}px`));
  }, [top, right, bottom, left]);
  // 59/59/21 is a stress fixture, not an assertion about the user's OS safe-area values.
  await fixture(0, 59, 21, 59);
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  await page.waitForSelector('#table.on');
  for (let i = 0; i < 30; i++) {
    const state = await page.evaluate(() => {
      const b = document.querySelector('#mainbtn');
      return { mark: b?.textContent.includes('不盯'), disabled: !b || b.disabled };
    });
    if (state.mark) break;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(el => !el.disabled)?.click());
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => document.querySelector('#mainbtn')?.textContent.includes('不盯'));
  await page.waitForTimeout(500);
  const rects = async selectors => page.evaluate(sels => Object.fromEntries(sels.map(s => {
    const el = document.querySelector(s), r = el.getBoundingClientRect();
    return [s, { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
      scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }];
  })), selectors);
  const inside = r => r.x >= 58.5 && r.right <= 793.5 && r.y >= 0 && r.bottom <= 372.5;
  let r = await rects(['#north', '#west', '#east', '#south', '#mainbtn']);
  for (const [id, box] of Object.entries(r)) check(`safe bounds ${id}`, inside(box), box);
  const snap = async name => { await page.screenshot({ path: path.join(out, `${name}.png`), scale: 'css' }); captures.push(name); };
  await snap('landscape-mark');
  await page.evaluate(() => pickMark(2));
  await page.waitForTimeout(500);
  await snap('landscape-bid');
  // User approved named pages in short landscape instead of clipped scroll rails.
  await page.locator('#west .railTabs button').nth(1).click();
  check('market name switch shows complete second card', await page.locator('#west .railPages .railSelected').evaluate(el => {
    const r=el.getBoundingClientRect(), rail=el.closest('.rail').getBoundingClientRect();
    return el.id==='mc1' && r.bottom<=rail.bottom+1;
  }));
  await page.locator('#west .railTabs button').nth(0).click();
  r = await rects(['#south', '#mainbtn']);
  for (const [id, box] of Object.entries(r)) check(`bid safe bounds ${id}`, inside(box), box);
  await page.evaluate(() => openSheet(0));
  r = await rects(['#sheetbox']);
  check('bid sheet safe bounds', inside(r['#sheetbox']), r['#sheetbox']);
  const scroll = await page.evaluate(() => {
    const el = document.querySelector('#sheetbox');
    el.scrollTop = el.scrollHeight;
    return { top: el.scrollTop, max: el.scrollHeight - el.clientHeight, overflow: getComputedStyle(el).overflowY };
  });
  check('bid sheet scroll reaches bottom', scroll.overflow === 'auto' && Math.abs(scroll.top - scroll.max) <= 1, scroll);
  await snap('landscape-sheet');
  await page.evaluate(() => closeSheet());
  await page.click('#helpBtn');
  r = await rects(['#modalbox']);
  check('help safe bounds', inside(r['#modalbox']), r['#modalbox']);
  await page.locator('#modalbox').hover();
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);
  check('help scroll responds to input', await page.locator('#modalbox').evaluate(el => el.scrollTop > 0));
  await snap('landscape-help');
  const beforeToggle = await page.evaluate(() => ({ round: window.__yaoshi.S.round, url: location.href }));
  await page.locator('#modalbox').evaluate(el => { el.scrollTop = 0; });
  await page.click('#fpsToggle');
  check('FPS toggle off removes diagnostic', await page.locator('#fpsDiag').count() === 0);
  const offN = await page.evaluate(() => FPS_DIAG.n);
  await page.waitForTimeout(600); // Product's 500ms phase guard absorbs immediate second clicks.
  check('FPS off stops sampler', await page.evaluate(n => FPS_DIAG.n === n && FPS_STOP === null && !FPS_DIAG.duelOn, offN));
  await page.click('#fpsToggle');
  await page.waitForTimeout(400);
  check('FPS toggle on starts sampler', await page.evaluate(() => FPS_DIAG.n > 0 && !!FPS_STOP));
  check('FPS toggle preserves current game without navigation', await page.evaluate(round => window.__yaoshi.S.round === round && !location.search.includes('fps='), beforeToggle.round));
  check('diagnostic distinguishes browser mode', (await page.locator('#fpsDiag').textContent()).includes('瀏覽器分頁'));
  const cold = await ctx.newPage();
  await cold.goto('http://127.0.0.1:8974/index.html');
  await cold.waitForFunction(() => window.__yaoshi);
  check('FPS preference survives query-free cold start', await cold.evaluate(() => FPS_ON && !!FPS_STOP && localStorage.getItem('ys_fps') === 'on'));
  await cold.reload();
  await cold.waitForFunction(() => window.__yaoshi);
  check('FPS preference survives reload', await cold.evaluate(() => FPS_ON && !!FPS_STOP));
  await cold.evaluate(() => { window.__yaoshi.newGame('solo', 1, ['qingmian']); openHelp(); });
  await cold.click('#fpsToggle');
  await cold.reload();
  await cold.waitForFunction(() => window.__yaoshi);
  check('FPS off preference survives reload', await cold.evaluate(() => !FPS_ON && FPS_STOP === null));
  await cold.close();
  await page.evaluate(() => closeModal());
  await page.setViewportSize({ width: 393, height: 852 });
  await fixture(59, 0, 34, 0);
  check('portrait rotate hint', await page.locator('#rotateHint').isVisible());
  await snap('portrait-rotate');
  await page.setViewportSize({ width: 852, height: 393 });
  await fixture(0, 59, 21, 59);
  check('rotate back resumes table', !(await page.locator('#rotateHint').isVisible()) && await page.locator('#mainbtn').isVisible());
  await fixture(0, 0, 0, 0);
  await page.setViewportSize({ width: 1280, height: 720 });
  const selectors = ['#table', '#north', '#west', '#east', '#south', '#mainbtn'];
  const zero = await rects(selectors);
  await page.evaluate(() => { document.querySelector('link[href="assets/safe-area.css"]').disabled = true; });
  const baseline = await rects(selectors);
  check('desktop zero-inset bounds unchanged', JSON.stringify(zero) === JSON.stringify(baseline), { zero, baseline });
  await page.evaluate(() => { document.querySelector('link[href="assets/safe-area.css"]').disabled = false; });
  await snap('desktop-zero-inset');
  await page.setViewportSize({ width: 852, height: 393 });
  await fixture(0, 59, 21, 59);
  // Red control: keep the same fixtures, disable only the new CSS padding.
  await page.addStyleTag({ content: '#table { padding: 4px !important; }' });
  r = await rects(['#west', '#east', '#south']);
  check('red control detects original unsafe bounds', Object.values(r).some(box => !inside(box)), r);
  await ctx.close();
} catch (error) {
  check('probe completed', false, error.message);
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    server.kill();
  }
  check('no page errors', errors.length === 0, errors);
  const result = { browser: 'Chromium mobile emulation; not Safari or physical iPhone',
    fixture: 'landscape 852x393, safe T/R/B/L=0/59/21/59; portrait 393x852,59/0/34/0; synthetic, not measured',
    checks, captures, errors };
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
if (checks.some(c => !c.pass)) process.exitCode = 1;
