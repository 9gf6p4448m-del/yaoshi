/* 美術甲卷 A8（2026-09-07）：`?fps=1` 回填欄位的雙向檢查。
   跑法：node tests/tools/art-a-fps.mjs [--port=8971] [--root=<靜態根目錄>]
   判定：不帶參數時 DOM 上**沒有** #fpsDiag；帶 ?fps=1 時它存在、2 秒後 fps 中位與 draw calls 都非 0。
   兩個方向都驗（只驗「有」的話，「參數沒生效、永遠都印」會靜默通過）。 */
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const argv = process.argv.slice(2);
const opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = Number(opt.port || 8971);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;

const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRC_ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

async function run(browser, query) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?paperwar=1${query}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.click('button:has-text("單人入市")');
  await page.waitForSelector('#selectScr.on');
  await page.click('#selGrid .rcard');
  await page.click('#selBtn:not([disabled])');
  await page.waitForTimeout(2600);
  await page.evaluate(() => { if (typeof window.openHelp === 'function') window.openHelp(); else { const b = document.getElementById('helpBtn'); if (b) b.click(); } });
  await page.waitForTimeout(2200);
  const r = await page.evaluate(() => {
    const el = document.getElementById('fpsDiag');
    return { exists: !!el, text: el ? el.textContent : null };
  });
  const m = r.text && r.text.match(/fps 平均 (\d+)[^|]*\|\s*draw calls (\d+)\s*\|\s*三角形 (\d+)/);
  await page.close();
  return { query: query || '(none)', ...r, fps: m ? Number(m[1]) : null, calls: m ? Number(m[2]) : null, tris: m ? Number(m[3]) : null, errors: errs };
}

try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const off = await run(browser, '');
  const on = await run(browser, '&fps=1');
  await browser.close();
  const pass = off.exists === false && on.exists === true && on.fps > 0 && on.calls > 0 && off.errors.length === 0 && on.errors.length === 0;
  console.log(JSON.stringify({ off, on, pass }, null, 1));
  process.exit(pass ? 0 : 1);
} finally { srv.kill(); }
