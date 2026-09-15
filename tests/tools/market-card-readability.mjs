// Synthetic market fixtures use real card HTML and live game handlers. This is
// a Chromium layout check; safe insets are stress inputs, not device measurements.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { serve } from './duel-drive.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
const out = path.join(root, 'docs/experiments/2026-09-15-market-card-readability');
const baseline = process.argv.includes('--baseline');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 8978);
let browser;
const errors = [], checks = [];
const check = (name, pass, details) => checks.push({ name, pass, details });
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 852, height: 393 }, hasTouch: true });
  if (baseline) {
    const html=execFileSync('git',['show','HEAD:index.html'],{cwd:root,encoding:'utf8'});
    const css=execFileSync('git',['show','HEAD:assets/safe-area.css'],{cwd:root,encoding:'utf8'});
    await page.route('http://127.0.0.1:8978/',route=>route.fulfill({body:html,contentType:'text/html'}));
    await page.route('**/assets/safe-area.css*',route=>route.fulfill({body:css,contentType:'text/css'}));
  }
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  await page.goto('http://127.0.0.1:8978/');
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
  await page.evaluate(() => {
    for (const [side, px] of Object.entries({ top: 0, right: 59, bottom: 21, left: 59 }))
      document.documentElement.style.setProperty(`--safe-${side}`, `${px}px`);
    CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']);
  });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => document.querySelector('#mainbtn').textContent.includes('不盯'));
    if (ready) break;
    await page.evaluate(() => {
      const b = document.querySelector('#mainbtn');
      if (!b.disabled) b.click();
      else [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click();
    });
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => document.querySelector('#mainbtn').textContent.includes('不盯'));
  await page.evaluate(() => pickMark(2));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const names = ['祖靈之眼', '縛靈鎖', '破軍旗', '香灰符'];
    S.market = names.map(n => ({ ...[...POOL, ...CURSES].find(x => x.n === n) }));
    showMarket(); pushMarket3d();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, baseline?'baseline-clipped.png':'landscape-first.png'), scale: 'css' });
  const geometry = await page.evaluate(() => [...document.querySelectorAll('.rail .mcard')].map(el => {
    const r = el.getBoundingClientRect(), parent = el.parentElement.getBoundingClientRect();
    return { name: el.querySelector('.nm').textContent, top: r.top, bottom: r.bottom, parentBottom: parent.bottom, visible: getComputedStyle(el).display !== 'none' };
  }));
  check('visible cards fit rail', geometry.every(r => !r.visible || r.bottom <= r.parentBottom + 1), geometry);
  if (!baseline) {
  const before = await page.evaluate(() => JSON.stringify({ market:S.market,marks:S.marks,bids:myBids,round:S.round }));
  await page.locator('#railW .railTabs button').nth(1).click();
  await page.locator('#railE .railTabs button').nth(1).click();
  check('page switches preserve marks, bids and game state', before === await page.evaluate(() => JSON.stringify({ market:S.market,marks:S.marks,bids:myBids,round:S.round })));
  check('second cards visible and first cards hidden', await page.locator('#mc1').isVisible() && await page.locator('#mc3').isVisible() && !await page.locator('#mc0').isVisible());
  await page.screenshot({ path: path.join(out, 'landscape-second.png'), scale: 'css' });
  await page.evaluate(() => showMarket());
  check('same night redraw retains selected cards', await page.locator('#mc1').isVisible() && await page.locator('#mc3').isVisible());
  check('all page buttons have 44px touch height', await page.locator('.railTabs button').evaluateAll(els => els.every(el => el.getBoundingClientRect().height >= 44)));
  const allCardGeometry = await page.evaluate(() => {
    const original = S.market, night = S.round, result = [];
    for (let round = 1; round <= CFG.ROUNDS; round++) {
      S.round = round;
      for (const it of [...POOL,...CURSES]) {
        S.market = Array.from({length:4},() => ({...it}));
        showMarket();
        for (const rail of document.querySelectorAll('.rail')) {
          const card=rail.querySelector('.railSelected'), cr=card.getBoundingClientRect(), rr=rail.getBoundingClientRect();
          result.push({name:it.n,round,height:cr.height,bottom:cr.bottom,railBottom:rr.bottom,overflow:card.scrollWidth>card.clientWidth+1});
        }
      }
    }
    S.market=original; S.round=night; showMarket(); return result;
  });
  check('every market card fits across all moon phases', allCardGeometry.every(x => x.bottom <= x.railBottom+1 && !x.overflow), { samples:allCardGeometry.length, failures:allCardGeometry.filter(x=>x.bottom>x.railBottom+1||x.overflow), tallest:allCardGeometry.reduce((a,b)=>a.height>b.height?a:b) });
  await page.evaluate(() => { S.round++; showMarket(); });
  check('new night resets both pages', await page.locator('#mc0').isVisible() && await page.locator('#mc2').isVisible());
  await page.locator('#mc0').click();
  check('visible card still opens bidding detail', await page.locator('#sheet').isVisible());
  await page.evaluate(() => closeSheet());
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(() => { for(const side of ['top','right','bottom','left']) document.documentElement.style.setProperty(`--safe-${side}`,'0px'); });
  check('desktop shows four cards and no page buttons', (await page.locator('.rail .mcard:visible').count())===4 && (await page.locator('.railTabs:visible').count())===0);
  await page.screenshot({path:path.join(out,'desktop-four-cards.png'),scale:'css'});
  }
  fs.writeFileSync(path.join(out, baseline?'baseline-result.json':'result.json'), JSON.stringify({ synthetic: true, baseline, errors, checks }, null, 2));
  console.log(JSON.stringify({ errors, checks }));
  if (errors.length || checks.some(x => !x.pass)) process.exitCode = 1;
} finally {
  try { await browser?.close(); } finally { server.kill(); }
}
