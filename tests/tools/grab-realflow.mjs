/* v0.60.0 驗收 #7（真實流程）：正常 UI 開標（不按跳過、真的 rAF 與 setTimeout），逐件記
 *   ys:reveal-result 時刻 → 3D 法寶落定時刻（tray.grabLog 的 landed 出現的那一幀）→ ys:reveal-card 時刻，
 *   每件都要「卡片時刻 ≥ 落定時刻」；並記搬運中鏡頭是否在取景（framing.active && fit）。
 * node tests/tools/grab-realflow.mjs [--port=8997] [--q=grab=0]
 * 基準（155a7e7f）沒有 grabLog ⇒ 落定時刻量不到 ⇒ 判紅（不記 null 當過）。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = Number(opt.port || 8997);
const { chromium, devices } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');

async function toMark(page) {
  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => { const b = document.querySelector('#mainbtn'); return { text: b?.textContent || '', disabled: !b || b.disabled }; });
    if (!st.disabled && /不盯任何一件/.test(st.text)) return;
    if (!st.disabled) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(160);
  }
  throw new Error('seed 1 did not reach the mark phase');
}
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
let browser; const errors = [];
try {
  await new Promise((r) => setTimeout(r, 900));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 844, height: 390 } });
  await ctx.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q ? '?' + opt.q : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 90000 });
  await toMark(page);
  await page.waitForFunction(() => window.__yaoshi3d.tray.items().every((it) => it.ready), null, { timeout: 60000 });
  await page.evaluate(() => {
    const V = window.__yaoshi3d, log = { items: [], frames: 0 }; window.__rf = log; let cur = null, seen = 0;
    document.addEventListener('ys:reveal-result', (e) => { cur = { slot: e.detail?.slot, grabMs: e.detail?.grabMs, result: performance.now(), landed: null, card: null, framedHeld: 0, heldFrames: 0 }; log.items.push(cur); });
    document.addEventListener('ys:reveal-card', () => { if (cur && cur.card === null) cur.card = performance.now(); });
    const tick = () => {
      log.frames++;
      const gl = V.tray.grabLog ? V.tray.grabLog() : null;
      if (gl && gl.length > seen) { for (const x of gl.slice(seen)) if (x.ev === 'landed' && cur && cur.landed === null && x.slot === cur.slot) cur.landed = performance.now(); seen = gl.length; }
      if (cur && cur.landed === null && V.tray.grabState && V.tray.grabState().length) { cur.heldFrames++; if (V.framing?.active && V.framing?.fit) cur.framedHeld++; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.click('#mainbtn'); // 不盯 → 出價
  await page.waitForFunction(() => /蓋牌開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  await page.evaluate(() => { openSheet(2); bump(1); closeSheet(); });
  await page.waitForTimeout(550);
  await page.click('#mainbtn');
  await page.waitForFunction(() => /^開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 15000 });
  await page.waitForTimeout(550);
  await page.click('#mainbtn');
  for (let k = 0; k < 4; k++) {
    await page.waitForFunction(() => /下一件拍品|查看成交總覽/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 20000 });
    await page.waitForTimeout(300);
    const last = await page.evaluate(() => /查看成交總覽/.test(document.querySelector('#mainbtn').textContent));
    await page.click('#mainbtn');
    if (last) break;
  }
  const log = await page.evaluate(() => window.__rf);
  const rows = log.items.map((x) => ({ slot: x.slot, grabMs: x.grabMs, landedAfterMs: x.landed === null ? null : Math.round(x.landed - x.result), cardAfterMs: x.card === null ? null : Math.round(x.card - x.result), cardAfterLanded: x.landed !== null && x.card !== null && x.card >= x.landed, heldFrames: x.heldFrames, framedHeldFrames: x.framedHeld }));
  const pass = rows.length > 0 && rows.every((r) => r.cardAfterLanded && r.heldFrames > 0 && r.framedHeldFrames === r.heldFrames) && errors.length === 0;
  console.log(JSON.stringify({ fixture: 'seed 1 solo，正常 UI 開標（不跳過、真實時序），844×390', q: opt.q || '', rows, frames: log.frames, errors, pass }, null, 1));
  if (!pass) process.exitCode = 1;
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
