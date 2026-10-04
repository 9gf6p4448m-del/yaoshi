/* A1 regression gate: use the real reveal UI, then press the real Skip button
 * while the first slot camera wait is pending.
 * v0.60.0（驗收 #6／#12 列名的終點姿態改寫）：舊版跳過後法寶仍飛完 0.86 秒拋物線、要求「飛行全程有框」；
 * 新設計（手抓回）跳過＝直接到終態——跳過之後開的每一件 3D 都直接落在終點並隱藏、手全收，
 * 所以改斷言：跳過後 0 幀法寶在動、0 幀有手可見，最後一張卡出現 350ms 後鏡頭位移已還原。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium, devices } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const PORT = 8994;
const REDUCED = process.argv.includes('--reduced');

async function toMark(page) {
  await page.evaluate(() => window.__yaoshi.newGame('solo', 1, ['qingmian']));
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate(() => {
      const b = document.querySelector('#mainbtn');
      return { text: b?.textContent || '', disabled: !b || b.disabled };
    });
    if (!state.disabled && /不盯任何一件/.test(state.text)) return;
    if (!state.disabled) await page.click('#mainbtn');
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click());
    await page.waitForTimeout(160);
  }
  throw new Error('seed 1 did not reach the normal mark phase');
}

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
let browser;
const errors = [];
try {
  await new Promise(resolve => setTimeout(resolve, 900));
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: 852, height: 393 } });
  await ctx.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__yaoshi3d?.tray && !!window.__yaoshi, null, { timeout: 60000 });
  await toMark(page);
  await page.waitForFunction(() => window.__yaoshi3d.tray.items().every(item => item.ready), null, { timeout: 60000 });
  await page.evaluate(() => {
    const V = window.__yaoshi3d;
    const models = V.tray.group.children.filter(node => node.isObject3D && node.visible && !node.name);
    const baseline = new Map(models.map(node => [node.uuid, node.position.clone()]));
    const log = { slots: [], skipAt: null, awards: [], cards: [], frames: [], done: false };
    window.__tableFramingSkip = log;
    document.addEventListener('ys:reveal-slot', event => {
      log.slots.push({ slot: event.detail?.slot, t: performance.now() });
      if (log.skipAt !== null) return;
      // This lands within startReveal's mandatory first 700ms wait, rather than
      // synthesizing a result event or altering the tray lifecycle.
      setTimeout(() => { log.skipAt = performance.now(); window.doSkip(); }, 120);
    });
    document.addEventListener('ys:reveal-result', event => log.awards.push({ slot: event.detail?.slot, t: performance.now() }));
    document.addEventListener('ys:reveal-card', () => log.cards.push({ t: performance.now() }));
    const started = performance.now();
    const sample = () => {
      const moving = models.some(node => node.visible && node.position.distanceTo(baseline.get(node.uuid)) > .01);
      if (log.skipAt !== null) log.frames.push({ t: performance.now() - log.skipAt, moving, hands: !!V.tray.hands.group && V.tray.hands.group.children.some(h => h.visible),
        active: V.framing?.active === true, fit: V.framing?.fit === true,
        card: !!document.querySelector('#revealCard'), viewOffset: V.camera.view?.enabled === true });
      if (log.skipAt === null || performance.now() - log.skipAt < 3600) requestAnimationFrame(sample); else log.done = true;
    };
    requestAnimationFrame(sample);
  });
  await page.click('#mainbtn'); // no mark -> market
  await page.waitForFunction(() => /蓋牌開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  // A real bid avoids the separate "no bids" confirmation before submission.
  await page.evaluate(() => { openSheet(2); bump(1); closeSheet(); });
  await page.waitForTimeout(550); // production's phase guard deliberately absorbs immediate semantic re-clicks
  await page.click('#mainbtn'); // submit sealed bids -> reveal's confirmation
  await page.waitForFunction(() => /^開標/.test(document.querySelector('#mainbtn')?.textContent || '') && !document.querySelector('#mainbtn')?.disabled, null, { timeout: 8000 });
  await page.waitForTimeout(550);
  await page.click('#mainbtn');
  await page.waitForFunction(() => window.__tableFramingSkip?.done, null, { timeout: 10000 });
  const result = await page.evaluate(() => window.__tableFramingSkip);
  const flight = result.frames.filter(row => row.moving);
  const handFrames = result.frames.filter((row, i) => i > 0 && row.hands); // 跳過那一幀之後
  const lastCard = result.cards.length ? result.cards.at(-1).t - result.skipAt : NaN;
  const settledCard = Number.isFinite(lastCard) ? result.frames.filter(row => row.t > lastCard + 350) : [];
  const restored = settledCard.length > 0 && settledCard.every(row => !row.viewOffset);
  const pass = result.slots.length > 0 && result.skipAt !== null && result.awards.length > 0 && result.cards.length > 0 && result.frames.length > 0 && flight.length === 0 && handFrames.length === 0 && restored && errors.length === 0;
  console.log(JSON.stringify({ fixture: 'seed 1, normal UI reveal, doSkip 120ms after first ys:reveal-slot', reducedMotion: REDUCED, slots: result.slots, skipAt: result.skipAt, awards: result.awards, cards: result.cards, frameCount: result.frames.length, flightFrames: flight.length, firstFlight: flight[0] || null, handFrames: handFrames.length, settledCardFrames: settledCard.length, viewOffsetRestored: restored, errors, pass }, null, 2));
  if (!pass) process.exitCode = 1;
  await ctx.close();
} finally {
  await browser?.close();
  server.kill();
}
