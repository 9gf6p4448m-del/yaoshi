// A3 S5 因果短敘事：headless 真實路徑實跑一局到「本局回顧」，量回顧頁裡 .rvLedger 的句數與 pageerror。
// 用法：node tests/tools/ledger-probe.mjs [seed=3] [out.png]
// 驅動器與 tests/sfx-wiring.test.mjs 同一套（主鈕推進、交棒／供奉／請神視窗、停滯 3 秒按跳過）；CFG.T 與 PW_FX.*_MS 壓 1ms 只為跑得動。
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PORT = 9613;
const SEED = Number(process.argv[2] || 3);
const OUT = process.argv[3] || '';
async function driveUntil(page, re) {
  const src = re.source; let idle = 0;
  for (let i = 0; i < 6000; i++) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(`(() => {
      const re = new RegExp(${JSON.stringify(src)});
      const ho = document.getElementById('handoff');
      if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0 }; }
      const b = document.getElementById('mainbtn');
      const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
      if (b && re.test(txt) && !dis) return { hit: 1, txt };
      if (b && !dis) { b.click(); return { hit: 0 }; }
      const m = document.getElementById('modal');
      if (m && getComputedStyle(m).display !== 'none') {
        const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0 }; }
        const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0 }; }
      }
      if (b && dis) {
        const els = [...document.querySelectorAll('#stage button')];
        const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
        if (sb) { sb.click(); return { hit: 0 }; }
      }
      return { hit: 0, idle: 1 };
    })()`);
    if (r.hit) return r.txt;
    idle = r.idle ? idle + 1 : 0;
    if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
  }
  throw new Error('driveUntil 卡住：' + await page.evaluate(() => document.getElementById('mainbtn') && document.getElementById('mainbtn').textContent));
}
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate((sd) => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; initSfx(); window.__yaoshi.newGame('solo', sd, ['qingmian']); }, SEED);
  await driveUntil(page, /看最終結果/);
  await page.click('#mainbtn');
  await page.waitForFunction(() => /再入妖市/.test(document.getElementById('mainbtn').textContent), null, { timeout: 20000 });
  await page.evaluate(() => showReview());
  await page.waitForSelector('#review .rvLedger', { timeout: 5000 });
  const out = await page.evaluate(() => {
    const ps = [...document.querySelectorAll('#review .rvLedger p')].map((p) => p.textContent);
    const R = window.__yaoshi.ledgerNarrative(window.__yaoshi.S.history, window.__yaoshi.S.players);
    const first = document.querySelector('#reviewbox').children[1];
    return { ps, sameAsPure: JSON.stringify(ps) === JSON.stringify(R.lines.map((l) => l.text)), winner: R.winner, cause: R.cause, nights: window.__yaoshi.S.history.nights.length, sectionTitle: first ? first.textContent : null, version: RELEASE_VERSION };
  });
  if (OUT) { await page.evaluate(() => { document.getElementById('review').scrollTop = 0; }); await page.screenshot({ path: OUT }); }
  console.log(JSON.stringify({ seed: SEED, ...out, pageerrors: errors }, null, 1));
  if (errors.length || out.ps.length < 3 || out.ps.length > 6 || !out.sameAsPure) process.exitCode = 1;
} finally { await browser.close(); srv.kill(); }
