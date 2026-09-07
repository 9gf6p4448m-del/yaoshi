/* 陣列卷 G6（docs/experiments/2026-09-07-acceptance-lineup.md）：對一側 ≥10 隻的對決截圖，供人眼驗版面。
   D3 治具同一套袋子（四座位 11 隻；這裡 hp 不壓 1，讓開場列陣站久一點），第一場 ys:duel 後等 ~2.5s 截 844×390，
   再截一張 DOM 晶片列（#pwch-A／#pwch-B）的特寫。也順手印出兩側名冊的 fac 序列（應為 祖靈…→香火…→陰氣…）。
   跑法：node tests/tools/lineup-shot.mjs <png 前綴> [--port=8891] [--root=<靜態根目錄>] */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const argv = process.argv.slice(2);
const opt = {}; const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUT = pos[0] || path.join(ROOT, 'lineup');
const PORT = Number(opt.port || 8891);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

const INIT = `(() => {
  window.__ls = { duels: 0, last: null };
  document.addEventListener('ys:duel', (e) => { window.__ls.duels++; window.__ls.last = e.detail; });
})();`;

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const errs = [];
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.addInitScript(INIT);
    await page.goto(`http://127.0.0.1:${PORT}/index.html?paperwar=1&fxcount=1`, { waitUntil: 'load' });
    await page.click('button:has-text("單人入市")');
    await page.waitForSelector('#selectScr.on');
    await page.click('#selGrid .rcard');
    await page.click('#selBtn:not([disabled])');
    await page.evaluate(() => {
      const Y = window.__yaoshi, S = Y.S;
      const by = (n) => Y.POOL.find((x) => x.n === n);
      // 取得順序刻意 陰氣→香火→祖靈：排序後畫面應是 祖靈在前
      const bag = [{ ...by('魔神仔紅帽') }, { ...by('五營旗') }, { ...by('林投姐髮簪') }];
      S.players.forEach((p) => { p.bag = bag.map((x) => ({ ...x, unit: { ...x.unit } })); });
    });
    const t0 = Date.now(); let shot = false;
    while (Date.now() - t0 < 120000 && !shot) {
      const st = await page.evaluate(() => {
        const mb = document.getElementById('mainbtn'); const ho = document.getElementById('hoBtn');
        const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
        const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
        return { mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, duels: window.__ls.duels };
      });
      if (st.duels >= 1) {
        await page.waitForTimeout(2500);
        await page.screenshot({ path: OUT + '-arena.png' });
        const info = await page.evaluate(() => {
          const d = window.__ls.last || {};
          const facs = (d.armies || []).map((a) => a.units.map((u) => (u.fac || 'none')[0]).join(''));
          const chips = ['A', 'B'].map((t) => [...document.querySelectorAll('#pwch-' + t + ' .pwchip')].map((c) => (c.className.match(/fac-([a-z]+)/) || [])[1] || '?').map((f) => f[0]).join(''));
          const D = window.__yaoshi3d && window.__yaoshi3d.duelFigures;
          const vis = D ? ['A', 'B'].map((s) => D.figuresOf(s).filter((f) => f.group.visible).length) : null;
          const hud = ['A', 'B'].map((t) => { const el = document.getElementById('pwn-' + t); return el ? el.textContent : null; });
          return { maxFig: d.maxFig, armyFacs: facs, chipFacs: chips, visible3d: vis, hud };
        });
        const el = await page.$('#duelArena');
        if (el) await el.screenshot({ path: OUT + '-chips.png' }).catch(() => {});
        console.log(JSON.stringify({ out: OUT, info, errors: errs }, null, 1));
        shot = true; break;
      }
      if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(200);
    }
    await browser.close();
    process.exit(shot && errs.length === 0 ? 0 : 1);
  } finally { srv.kill(); }
}
main();
