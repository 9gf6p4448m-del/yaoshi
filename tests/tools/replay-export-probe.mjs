// A3 S7 再玩研究（凍結 #11）：headless 真實路徑實跑一局到「本局回顧」，按「複製本局紀錄」：
//   ①剪貼簿路徑：讀回剪貼簿的字串 === JSON.stringify(replayExport(S))、按鈕回饋「已複製 ✓」
//   ②備援路徑：把 navigator.clipboard 拿掉再按一次，#rvExport 文字框攤開、內容相同、按鈕回饋「請長按全選複製」
//   ③solo 模式南家標 human:true、其餘三家 false；pageerror 0
// 驅動器與 tests/tools/ledger-probe.mjs 同一套（主鈕推進、交棒／供奉／請神視窗、停滯 3 秒按跳過）。
// 用法：node tests/tools/replay-export-probe.mjs [seed=3] [out.png]
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PORT = 9614;
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
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
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
  await page.waitForSelector('#rvCopy', { timeout: 5000 });
  /* ①剪貼簿路徑 */
  await page.click('#rvCopy');
  await page.waitForTimeout(400);
  const clip = await page.evaluate(async () => {
    const want = JSON.stringify(window.__yaoshi.replayExport(window.__yaoshi.S));
    const got = await navigator.clipboard.readText();
    return { equal: got === want, len: got.length, btn: document.getElementById('rvCopy').textContent, taShown: !!document.getElementById('rvExport') && document.getElementById('rvExport').style.display === 'block' };
  });
  /* ②備援路徑：把剪貼簿拿掉 */
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); });
  await page.click('#rvCopy');
  await page.waitForTimeout(200);
  const fb = await page.evaluate(() => {
    const want = JSON.stringify(window.__yaoshi.replayExport(window.__yaoshi.S));
    const ta = document.getElementById('rvExport');
    return { shown: !!ta && getComputedStyle(ta).display !== 'none', equal: !!ta && ta.value === want, btn: document.getElementById('rvCopy').textContent };
  });
  const meta = await page.evaluate(() => {
    const E = window.__yaoshi.replayExport(window.__yaoshi.S);
    return { human: E.players.map((p) => p.human), nights: E.history.nights.length, ver: E.ver, page: RELEASE_VERSION, back: JSON.parse(JSON.stringify(E)).history.nights.length };
  });
  if (OUT) { await page.evaluate(() => { document.getElementById('review').scrollTop = 0; }); await page.screenshot({ path: OUT }); }
  const out = { seed: SEED, clip, fallback: fb, meta, pageerrors: errors };
  console.log(JSON.stringify(out, null, 1));
  const ok = errors.length === 0 && clip.equal && clip.btn === '已複製 ✓' && !clip.taShown
    && fb.shown && fb.equal && fb.btn === '請長按全選複製'
    && JSON.stringify(meta.human) === JSON.stringify([true, false, false, false]) && meta.nights >= 1 && meta.ver === meta.page;
  if (!ok) process.exitCode = 1;
} finally { await browser.close(); srv.kill(); }
