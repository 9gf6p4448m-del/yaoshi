// v0.65.0 光影 A+ 凍結 #7：控制台零錯誤（正常頁、?sim=1、?fx=0 各一次）。
// 每個網址：開頁 → 等 3D（?sim=1 是工具頁、不等 3D）→ 正常頁與 ?fx=0 另開一局單人推到第 1 夜開標前 → 收 pageerror 與 console.error。
// 用法：node tests/tools/light-aplus-console.mjs <root>
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(HERE, '../../tools/anyCreature/package.json'))('playwright');
const ROOT = process.argv[2] || path.resolve(HERE, '../..');
const PORT = 9930;
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const res = {};
try {
  for (const q of ['', '?sim=1', '?fx=0']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = [], cons = [];
    page.on('pageerror', (e) => errs.push(String(e.message || e)));
    page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`, { waitUntil: 'load' });
    let reached = null;
    if (q !== '?sim=1') {
      await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 3, ['qingmian']); });
      for (let i = 0; i < 1500; i++) {
        const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
        if (st.r >= 1 && !st.d && /^蓋牌/.test(st.t)) { reached = st; break; }
        if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
        await page.waitForTimeout(20);
      }
      await page.waitForTimeout(1500);
    } else {
      await page.waitForTimeout(4000);
    }
    res[q || '(none)'] = { reached, pageerror: errs, consoleError: cons };
    await ctx.close();
  }
} finally { await browser.close(); srv.kill(); }
console.log(JSON.stringify(res, null, 1));
process.exit(Object.values(res).every((r) => !r.pageerror.length && !r.consoleError.length) ? 0 : 1);
