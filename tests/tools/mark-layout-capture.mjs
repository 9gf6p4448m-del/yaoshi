// Real game baseline plus explicitly synthetic same-slot 3D stress cases.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
const safe = process.argv.includes('--safe');
const outArg = process.argv.find(arg => arg.startsWith('--out='));
const out = path.join(root, outArg ? outArg.slice(6) : 'docs/experiments/2026-09-15-mark-b-layout', safe ? 'synthetic-safe' : '.');
fs.mkdirSync(out, { recursive: true });
const port = 8995, server = await serve(root, port);
let browser;
const errors = [], samples = [];
try {
  browser = await chromium.launch({args:['--use-gl=angle','--use-angle=d3d11','--ignore-gpu-blocklist']});
  const page = await browser.newPage({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, hasTouch: true });
  await page.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  if (safe) await page.evaluate(() => {
    for (const [side, px] of Object.entries({ top: 0, right: 59, bottom: 21, left: 59 }))
      document.documentElement.style.setProperty(`--safe-${side}`, `${px}px`);
  });
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    const state = await page.evaluate(() => {
      const b = document.getElementById('mainbtn');
      return { text: b.textContent, disabled: b.disabled, round: window.__yaoshi.S.round };
    });
    if (state.round === 1 && !state.disabled && state.text.includes('不盯任何一件')) { ready = true; break; }
    if (!state.disabled) await page.click('#mainbtn');
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click());
    await page.waitForTimeout(100);
  }
  if (!ready) throw new Error('Mark phase missing');
  await page.evaluate(async () => { await window.__yaoshi3d.tray.loaded(); pickMark(2); });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(out, 'natural-mark.png'), scale: 'css' });
  for (let slot = 0; slot < 4; slot++) {
    await page.evaluate(slot => {
      const p = window.__yaoshi3d.tray.props;
      p.clearRound();
      for (let seat = 0; seat < 4; seat++) p.mark(seat, slot);
    }, slot);
    await page.waitForTimeout(1000);
    samples.push(await page.evaluate(slot => ({ slot, synthetic: true, stats: window.__yaoshi3d.tray.props.stats() }), slot));
    if (samples.at(-1).stats.tokens !== 4) throw new Error('Missing stress tokens');
    await page.screenshot({ path: path.join(out, `four-at-${slot}.png`), scale: 'css' });
  }
  for (const assignment of [[0,1,2,3], [0,0,1,1], [0,0,0,1]]) {
    await page.evaluate(a => {
      const p = window.__yaoshi3d.tray.props; p.clearRound();
      a.forEach((slot, seat) => p.mark(seat, slot));
    }, assignment);
    await page.waitForTimeout(1000);
    const stats = await page.evaluate(() => window.__yaoshi3d.tray.props.stats());
    if (stats.tokens !== 4) throw new Error('Missing mixed-slot stamps');
    samples.push({assignment,synthetic:true,stats});
    await page.screenshot({path:path.join(out, `slots-${assignment.join('-')}.png`),scale:'css'});
  }
  const perf = await page.evaluate(async () => {
    const y = window.__yaoshi3d;
    const times = [];
    await new Promise(resolve => {
      const tick = t => { times.push(t); if (times.length === 121) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const info = y.renderer.info, oldReset = info.autoReset;
    let drawCalls, triangles;
    try {
      info.autoReset = false;
      await new Promise(resolve => requestAnimationFrame(() => {
        info.reset();
        requestAnimationFrame(() => { drawCalls = info.render.calls; triangles = info.render.triangles; resolve(); });
      }));
    } finally { info.autoReset = oldReset; }
    return { desktopOnly: true, fps: 1000 * (times.length - 1) / (times.at(-1) - times[0]), drawCalls, triangles, gpu: y.glName };
  });
  fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify({ viewport: [852, 393], syntheticSafeInsets: safe ? [0, 59, 21, 59] : null, samples, perf, errors }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ out, cases: samples.length, errors }));
} finally { try { await browser?.close(); } finally { server.kill(); } }
