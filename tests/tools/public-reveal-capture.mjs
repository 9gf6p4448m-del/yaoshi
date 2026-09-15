// Public release, ordinary game inputs only. Never skips or changes timing/state.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../..', import.meta.url));
const seed = Number(process.argv.slice(2).find(value => !value.startsWith('--')) || 1);
if (!Number.isFinite(seed)) throw new Error('seed 必須是數字');
const optionValue = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find(value => value.startsWith(prefix));
  return arg === undefined ? undefined : arg.slice(prefix.length);
};
const repoOutput = (value, fallback) => {
  if (value === undefined) return path.join(root, fallback);
  if (!value || path.isAbsolute(value)) throw new Error('--out 必須是非空的 repo 相對路徑');
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('--out 不得離開 repo');
  return resolved;
};
const url = optionValue('url') || 'https://9gf6p4448m-del.github.io/yaoshi/'; // --url=http://127.0.0.1:PORT/
let parsedUrl;
try { parsedUrl = new URL(url); } catch { throw new Error('--url 必須是有效的 http(s) URL'); }
if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('--url 只接受 http(s) URL');
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
// --out=docs/... lets candidate runs coexist with the published evidence.
const out = repoOutput(optionValue('out'), `docs/experiments/2026-09-15-public-reveal-evidence/seed-${seed}`);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log(`Reveal page loaded: ${url}`);
  await page.waitForFunction('!!window.__yaoshi3d?.tray && !!window.__yaoshi', { timeout: 60000 });
  const version = await page.evaluate(() => ({ release: typeof RELEASE_VERSION === 'string' ? RELEASE_VERSION : null, legacy: VERSION, timing: CFG.T }));
  await page.evaluate(seed => {
    window.__publicRevealEvents = [];
    for (const kind of ['ys:reveal-slot', 'ys:reveal-result', 'ys:reveal-card']) document.addEventListener(kind, e => window.__publicRevealEvents.push({ kind, detail: { ...e.detail }, t: performance.now() }));
    window.__yaoshi.newGame('solo', seed, ['qingmian']);
  }, seed);
  let mark = false;
  for (let n = 0; n < 80; n++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled }; });
    if (!st.d && /不盯任何一件/.test(st.t)) { mark = true; break; }
    if (!st.d) await page.click('#mainbtn');
    else if (await page.locator('button[onclick="__introNext()"]').count()) await page.locator('button[onclick="__introNext()"]').click();
    await page.waitForTimeout(650);
  }
  if (!mark) throw new Error('First-night mark phase not reached');
  await page.evaluate(() => pickMark(2));
  await page.waitForTimeout(800);
  await page.evaluate(() => { for (const slot of [0, 2]) { openSheet(slot); for (let i = 0; i < 5; i++) bump(1); closeSheet(); } });
  await page.waitForTimeout(800);
  await page.click('#mainbtn');
  await page.waitForFunction(() => !document.getElementById('mainbtn').disabled && document.getElementById('mainbtn').textContent.includes('開標 ▸'), { timeout: 30000 });
  const announcement = await page.locator('#stage').innerText();
  await page.screenshot({ path: path.join(out, 'announcement.png'), scale: 'css' });
  console.log(JSON.stringify({ seed, announcement }));
  if (!/3\s*人出價/.test(announcement)) {
    fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify({ version, seed, announcement, errors, foundThree: false }, null, 2));
    process.exitCode = errors.length ? 1 : 2;
  } else {
  const slots = [];
  for (let ordinal = 0; ordinal < 4; ordinal++) {
    const before = await page.evaluate(() => window.__publicRevealEvents.length);
    await page.waitForTimeout(650); // Allow the product's phase-change click guard to expire.
    await page.click('#mainbtn');
    await page.waitForFunction(n => window.__publicRevealEvents.slice(n).some(e => e.kind === 'ys:reveal-slot'), before);
    const slot = await page.evaluate(() => window.__publicRevealEvents.filter(e => e.kind === 'ys:reveal-slot').at(-1).detail.slot);
    await page.waitForTimeout(480);
    await page.screenshot({ path: path.join(out, `slot-${slot}-push.png`), scale: 'css' });
    await page.waitForFunction(n => window.__publicRevealEvents.slice(n).some(e => e.kind === 'ys:reveal-result'), before, { timeout: 6000 });
    await page.waitForTimeout(170);
    await page.screenshot({ path: path.join(out, `slot-${slot}-gold.png`), scale: 'css' });
    await page.waitForFunction(() => !!document.getElementById('revealCard') && !document.getElementById('mainbtn').disabled, { timeout: 15000 });
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(out, `slot-${slot}-card.png`), scale: 'css' });
    slots.push({ slot, text: await page.locator('#revealCard').innerText() });
  }
  const events = await page.evaluate(() => window.__publicRevealEvents);
  const report = { url: page.url(), version, seed, inputs: 'newGame solo qingmian; normal main-button progression; pickMark(2); openSheet(0) and openSheet(2), bump(1) five times each, closeSheet(); all other bids zero; click reveal/next item, never skip', announcement, slots, events, errors, timingAfter: await page.evaluate(() => CFG.T) };
  fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
  }
} finally { await browser.close(); }
