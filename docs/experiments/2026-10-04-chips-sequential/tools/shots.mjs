// 截圖版（contact sheet 用）：每 STEP ms 截一張，共 N 張。同 probe.mjs 的啟動邏輯
// 依序擺錢量測：node probe.mjs --root=<樹> --tag=<名> --scenario=s1|s2 [--seed=1] [--port=8981] [--query=] [--skipAt=ms] [--outDir=out]
// 啟動邏輯複製自 phase2-mock/chip-look/probe.mjs。只讀、不改產品檔。輸出 <outDir>/<tag>-<scenario>.json 並印指標。
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([A-Za-z0-9]+)=(.*)$/); if (m) opt[m[1]] = m[2]; }
const root = path.resolve(opt.root), tag = opt.tag, scen = opt.scenario || 's1', seed = +(opt.seed || 1), port = +(opt.port || 8981), query = opt.query || '';
const skipAt = opt.skipAt ? +opt.skipAt : null;
const req = createRequire('C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/package.json');
const { chromium, devices } = req('playwright');
const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 } });
await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errors.push('console:' + m.text()); });
let out;
try {
  await page.goto(`http://127.0.0.1:${port}/index.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(([m, s]) => window.__yaoshi.newGame(m, s, ['qingmian']), ['solo', seed]);
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => { const b = document.querySelector('#mainbtn'); return { text: b?.textContent || '', disabled: !b || b.disabled }; });
    if (!st.disabled && /不盯任何一件/.test(st.text)) break;
    if (!st.disabled) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(160);
  }
  await page.waitForFunction(() => window.__yaoshi3d.tray.items().every((i) => i.ready), null, { timeout: 60000 });
  await page.evaluate(() => window.__yaoshi3d.tray.hands.ready());
  const MAXB = await page.evaluate(() => CFG.MAX_BIDS);
  await page.click('#mainbtn');
  await page.waitForFunction(() => /蓋牌開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  for (const k of (scen === 's2' ? [0, 1] : [2, 0, 1, 3]).slice(0, MAXB)) { await page.evaluate((i) => { openSheet(i); bump(1); closeSheet(); }, k); await page.waitForTimeout(120); }
  await page.waitForTimeout(800);
  await page.evaluate((scen) => {
    if (scen === 's2') { // 治具：只動演出輸入——前兩件補齊四席各一筆、其餘件清空＝4 席×2 柱
      const orig = window.resolveAuction;
      window.resolveAuction = function () {
        const rv = orig.apply(this, arguments);
        rv.forEach((r, i) => { if (i < 2) { S.players.forEach((p, j) => { if (!r.entries.some((e) => e.p === p)) r.entries.push({ p, amt: 3 + j }); }); } else r.entries = r.entries.filter((e) => false); });
        return rv;
      };
    }
    const P = { t0: null, announceAt: null, bids: [], frames: [] }; window.__P = P;
    const T = window.__yaoshi3d.tray;
    document.addEventListener('ys:bid', (e) => { if (P.t0 !== null) P.bids.push({ t: performance.now() - P.t0, ...e.detail }); }, true);
    const stage = document.getElementById('stage');
    new MutationObserver(() => { if (P.announceAt === null && P.t0 !== null && /開標前公告/.test(stage.innerHTML)) { P.announceAt = performance.now() - P.t0; P.chipsAtAnnounce = T.props.chipCount(); } }).observe(stage, { childList: true, subtree: true });
    document.getElementById('mainbtn').addEventListener('click', () => { if (P.t0 === null) P.t0 = performance.now(); }, true);
    const tick = () => {
      requestAnimationFrame(tick);
      if (P.t0 === null) return;
      const now = performance.now() - P.t0; if (P.announceAt !== null && now > P.announceAt + 400) return;
      const st = []; for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) { const x = T.props.stackAt(s, k); if (x) st.push([s, k, +x.t.toFixed(4), +Math.max(0, x.wait).toFixed(3)]); }
      let hs = []; try { hs = T.hands.stats().state.map((x) => (x ? x.kind + ':' + x.slot : null)); } catch (e) { hs = [null, null, null, null]; }
      P.frames.push({ t: +now.toFixed(1), st, hs });
    };
    requestAnimationFrame(tick);
  }, scen);
  const clickP = page.click('#mainbtn');
  const shots = []; const N = +(opt.shots || 20), STEP = +(opt.step || 250);
  await page.waitForFunction(() => window.__P.t0 !== null);
  for (let i = 0; i < N; i++) { const t = await page.evaluate(() => performance.now() - window.__P.t0); const f = path.resolve(opt.outDir, `${tag}-shot-${String(i).padStart(2, '0')}.png`); await page.screenshot({ path: f }); shots.push({ i, t: Math.round(t), f }); const wait = (i + 1) * STEP - (await page.evaluate(() => performance.now() - window.__P.t0)); if (wait > 0) await page.waitForTimeout(wait); }
  if (skipAt !== null) { await page.waitForTimeout(skipAt); await page.evaluate(() => { window.__P.skipT = performance.now() - window.__P.t0; doSkip(); }); }
  await clickP;
  const P = await page.evaluate(() => window.__P);
  
  out = { shots, announceAt: P.announceAt };
} finally { await ctx.close(); await browser.close(); server.kill(); }

fs.writeFileSync(path.resolve(opt.outDir, `${tag}-shots.json`), JSON.stringify(out));
console.log(tag, JSON.stringify(out.shots.map((x) => x.t)), 'announceAt', out.announceAt);
