// Review-only TOKEN size variants, served through Playwright routing; product files stay untouched.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
const out = path.join(root, 'docs/experiments/2026-09-15-mark-readability-evidence');
const port = 8993;
const variants = [['A', .230, .280, .250], ['B', .150, .190, .175], ['C', .115, .145, .135]];
const source = fs.readFileSync(path.join(root, 'js/table-props.js'), 'utf8');
const pattern = /W: 0\.230, H: 0\.280, T: 0\.050, BEVEL: 0\.005, PITCH: 1\.05, STAND_LIFT: 0\.250/;
if (!pattern.test(source) || !source.includes('Sv.setScalar(1);')) throw new Error('Unexpected product source; review variants before rerun');
fs.mkdirSync(out, { recursive: true });
const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
const results = [];
try {
  await new Promise(r => setTimeout(r, 1000));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  for (const [name, w, h, lift] of variants) {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
    try {
      await context.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('requestfailed', r => errors.push(r.url()));
      let routed = 0;
      await page.route('**/table-props.js*', route => {
        routed++;
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: source.replace(pattern, `W: ${w}, H: ${h}, T: 0.050, BEVEL: 0.005, PITCH: 1.05, STAND_LIFT: ${lift}`) });
      });
      await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
      await page.waitForFunction('!!window.__yaoshi3d?.tray && !!window.__yaoshi', { timeout: 30000 });
      await page.evaluate(() => {
        CFG.T = 1;
        for (const k of Object.keys(window.__yaoshi.PW_FX)) if (/_MS$/.test(k)) window.__yaoshi.PW_FX[k] = 1;
        window.__yaoshi.newGame('solo', 1, ['qingmian']);
      });
      let ready = false;
      for (let i = 0; i < 600; i++) {
        const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b?.textContent || '', d: !b || b.disabled, r: window.__yaoshi.S?.round }; });
        if (st.r === 1 && /不盯任何一件/.test(st.t) && !st.d) { ready = true; break; }
        if (!st.d) await page.click('#mainbtn');
        else await page.evaluate(() => { const e = [...document.querySelectorAll('#stage button')].find(x => !x.disabled); e?.click(); });
        await page.waitForTimeout(14);
      }
      if (!ready) throw new Error('Mark phase not reached');
      await page.evaluate(async () => { await window.__yaoshi3d.tray.loaded(); });
      await page.evaluate(() => pickMark(2));
      await page.waitForTimeout(1800);
      const token = await page.evaluate(() => ({ stats: window.__yaoshi3d.tray.props.stats() }));
      if (routed !== 1 || token.stats.tokens < 1) throw new Error('Variant route not applied or no tokens');
      await page.screenshot({ path: path.join(out, `option-${name}-mark.png`), scale: 'css' });
      results.push({ name, viewport: '844x390', w, h, lift, routed, errors, token });
      console.log(JSON.stringify({ name, routed, errors }));
    } finally { await context.close(); }
  }
  fs.writeFileSync(path.join(out, 'size-options.json'), JSON.stringify(results, null, 2));
  if (results.some(r => r.errors.length)) process.exitCode = 1;
} finally { await browser?.close(); server.kill(); }
