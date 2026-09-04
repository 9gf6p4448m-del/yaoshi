// 3D 生物預覽截圖（look-dev／量產統一用）
// 用法：node tests/tools/creature-shoot.mjs <out.png> "<query>" [phase] [port]
//   例：node tests/tools/creature-shoot.mjs docs/experiments/x.png "glb=tiger_c&light=1&fx=1&rim=xianghu" idle
// 依賴：tools/anyCreature/node_modules/playwright（chromium 已裝）；自起 python http.server，用完關掉。
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');
const [out, query = '', phase = 'idle', portArg] = process.argv.slice(2);
if (!out) { console.error('need <out.png>'); process.exit(2); }
const port = Number(portArg || 8801);
const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tests/tools/creature-preview.html?auto=0&${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__preview && window.__preview.ready, null, { timeout: 60000 });
  await page.evaluate(() => window.__preview.ready);
  await page.evaluate(p => window.__preview.setPhase(p), phase);
  await page.waitForTimeout(phase === 'burn' ? 900 : 1400);
  await page.evaluate(() => { document.querySelectorAll('body *').forEach(e => { if (e.children.length === 0 && /^n=\d/.test(e.textContent || '')) e.style.display = 'none'; }); });
  await page.screenshot({ path: out });
  const info = await page.evaluate(() => ({ fps: window.__preview.fps ? window.__preview.fps() : null, calls: window.__preview.drawCalls, loadMs: window.__preview.loadMs, particles: window.__preview.particleCount }));
  console.log(JSON.stringify({ out, query, phase, ...info, errors: errs }));
  await browser.close();
} finally { srv.kill(); }
