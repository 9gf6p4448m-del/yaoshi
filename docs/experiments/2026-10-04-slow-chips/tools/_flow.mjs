/* 共用：開伺服器、開瀏覽器、solo 局走到市集、下 MAX_BIDS 筆標。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
export function parseOpt() { const o = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) o[m[1]] = m[2] === undefined ? true : m[2]; } return o; }
export async function launch(opt, ctxOpts = {}) {
  const root = path.resolve(opt.root); const port = Number(opt.port || 8971);
  const req = createRequire(path.resolve(root, 'tools/anyCreature/package.json'));
  const { chromium, devices } = req('playwright');
  const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 }, ...ctxOpts });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const url = `http://127.0.0.1:${port}/index.html${opt.q ? '?' + opt.q : ''}`;
  return { browser, server, page, errors, url, close: async () => { await browser.close(); server.kill(); } };
}
export async function toMark(page, mode = 'solo', seed = 1) {
  await page.evaluate(([m, s]) => window.__yaoshi.newGame(m, s, ['qingmian']), [mode, seed]);
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => { const b = document.querySelector('#mainbtn'); return { text: b?.textContent || '', disabled: !b || b.disabled }; });
    if (!st.disabled && /不盯任何一件/.test(st.text)) return true;
    if (!st.disabled) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(160);
  }
  throw new Error('did not reach mark phase');
}
/* 走到「蓋牌開標」可按：略過盯上、下 nBids 筆標（slot 2、0…）。 */
export async function toMarket(page, nBids) {
  await page.click('#mainbtn');
  await page.waitForFunction(() => /蓋牌開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  const slots = [2, 0, 1, 3].slice(0, nBids);
  for (const k of slots) { await page.evaluate((i) => { openSheet(i); bump(1); closeSheet(); }, k); await page.waitForTimeout(120); }
  await page.waitForTimeout(550);
}
/* 在頁內裝好觀測：#stage 公告時刻、每幀錢／手狀態。 */
export async function installProbe(page) {
  await page.evaluate(() => {
    const P = { t0: null, announceAt: null, lastBusy: null, chipsSeen: false, frames: 0, maxChip: 0, skipAt: null, firstSettledAfterSkip: null, errs: [], timeline: [], lastTl: 0 };
    window.__probe = P;
    const stage = document.getElementById('stage');
    new MutationObserver(() => { if (P.announceAt === null && /開標前公告/.test(stage.innerHTML)) P.announceAt = performance.now(); }).observe(stage, { childList: true, subtree: true, characterData: true });
    const Y = window.__yaoshi3d;
    const tick = () => {
      const T = Y.tray; let busy = false, n = 0, pbusy = false;
      try {
        n = T.props.chipCount(); if (n > P.maxChip) P.maxChip = n; if (n > 0) P.chipsSeen = true;
        for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) { const st = T.props.stackAt(s, k); if (st && (st.t < 1 || st.wait > 0)) { busy = true; pbusy = true; } }
        const hs = T.hands.stats().state; if (hs && hs.some((x) => x !== null)) busy = true; if (hs && hs.some((x) => x && x.kind === 'push')) pbusy = true;
      } catch (e) { P.errs.push(String(e)); }
      const now = performance.now(); P.frames++;
      if (P.t0 !== null && now - P.lastTl >= 100 && P.announceAt === null) { P.lastTl = now; let fl = 0, wt = 0; for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) { const st = T.props.stackAt(s, k); if (st && st.t < 1) fl++; if (st && st.wait > 0) wt++; } P.timeline.push([+((now - P.t0) / 1000).toFixed(2), fl, wt, T.hands.stats().state.map((x) => (x ? x.kind[0] + x.slot : '-')).join(',')]); }
      if (P.t0 !== null && P.chipsSeen && P.announceAt === null && busy) P.lastBusy = now;
      if (P.skipAt !== null && P.firstSettledAfterSkip === null && now >= P.skipAt && !pbusy) P.firstSettledAfterSkip = now; /* 跳過後只看「擺錢動作」（錢飛行／排隊、手在推）；其後揭盅階段的手另當別論 */
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    document.getElementById('mainbtn').addEventListener('click', () => { if (P.t0 === null) P.t0 = performance.now(); }, true);
  });
}
