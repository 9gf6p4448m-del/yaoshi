// Browser regression for curse effect copy. The market is synthetic, while the
// cards, bidding sheet and rules are the production DOM and event handlers.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
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
const requestedUrl = optionValue('url');
if (requestedUrl) {
  const parsed = new URL(requestedUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('--url 必須是 http(s) URL');
}
const out = repoOutput(optionValue('out'), 'docs/experiments/2026-09-15-curse-effects');
const quick = process.argv.includes('--quick');
const targetUrl = requestedUrl || 'http://127.0.0.1:8996/';
fs.mkdirSync(out, { recursive: true });

const server = requestedUrl ? null : await serve(root, 8996);
let browser;
const errors = [], checks = [], captures = [];
const check = (name, pass, details) => checks.push({ name, pass, details });
const safeName = value => value.replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 852, height: 393 }, hasTouch: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  await page.goto(targetUrl);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
  await page.evaluate(() => {
    for (const [side, px] of Object.entries({ top: 0, right: 59, bottom: 21, left: 59 }))
      document.documentElement.style.setProperty(`--safe-${side}`, `${px}px`);
    CFG.T = 1;
    window.__yaoshi.newGame('solo', 1, ['qingmian']);
  });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => document.querySelector('#mainbtn')?.textContent.includes('不盯'))) break;
    await page.evaluate(() => {
      const main = document.querySelector('#mainbtn');
      if (main && !main.disabled) main.click();
      else [...document.querySelectorAll('#stage button')].find(button => !button.disabled)?.click();
    });
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => document.querySelector('#mainbtn')?.textContent.includes('不盯'));
  await page.evaluate(() => pickMark(2));

  const fixture = async (viewport, mode, curseName) => {
    await page.setViewportSize(viewport);
    await page.evaluate(({ mode, curseName }) => {
      const curse = CURSES.find(item => item.n === curseName);
      if (!curse) throw new Error(`找不到詛咒品：${curseName}`);
      S.nightRule = mode === 'normal' ? null : NIGHTRULES[mode];
      BIDS_OPEN = true;
      YB = mode === 'yabao' ? { amt: 0, type: 'cons', pick: [false, false, false, false] } : null;
      myBids = Array.from({ length: 4 }, () => ({ amt: 0, type: 'cons', intent: 'keep', target: null }));
      S.market = Array.from({ length: 4 }, () => ({ ...curse }));
      showMarket();
      pushMarket3d();
    }, { mode, curseName });
    await settle(page);
    const card = await page.locator('#mc0').evaluate(element => ({
      text: element.innerText,
      locked: element.classList.contains('locked'),
      onclick: element.getAttribute('onclick'),
      visible: element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
    }));
    const prefix = `${viewport.width}x${viewport.height}-${mode}-${safeName(curseName)}`;
    const cardShot = path.join(out, `${prefix}-card.png`);
    await page.screenshot({ path: cardShot, scale: 'css' });
    captures.push(path.relative(root, cardShot).replaceAll('\\', '/'));
    check(`${prefix} card states attack penalty`, /每件[\s\S]*持有者[\s\S]*紙紮[\s\S]*攻擊\s*[−–-]\s*1/.test(card.text), card);
    if (curseName === '魔神仔的芭樂')
      check(`${prefix} card states life drain`, /每夜末[\s\S]*失\s*1\s*壽命/.test(card.text), card.text);
    if (mode === 'yabao') {
      check(`${prefix} wager night keeps curse unavailable`, card.locked && card.onclick === null && /不開標/.test(card.text), card);
      return;
    }

    await page.locator('#mc0').click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#sheet')).display === 'flex');
    await settle(page);
    const sheet = await page.locator('#sheetbox').evaluate(element => {
      const max = Math.max(0, element.scrollHeight - element.clientHeight);
      element.scrollTop = max;
      return {
        text: element.innerText,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        maxScrollTop: max,
        reachedBottom: Math.abs(element.scrollTop - max) <= 1,
      };
    });
    check(`${prefix} sheet states per-item per-beat penalty`, /每件[\s\S]*可出手紙紮[\s\S]*每拍[\s\S]*攻擊\s*[−–-]\s*1/.test(sheet.text), sheet.text);
    check(`${prefix} sheet states stacking`, /疊加|累加/.test(sheet.text), sheet.text);
    check(`${prefix} sheet states non-positive attack cannot act`, /攻擊[\s\S]*(?:≤|小於等於|不高於)\s*0[\s\S]*不出手/.test(sheet.text), sheet.text);
    check(`${prefix} sheet states immunity scope`, /免疫[\s\S]*(?:纏身|減益)[\s\S]*不免[\s\S]*(?:侵蝕|失血|壽命)/.test(sheet.text), sheet.text);
    if (curseName === '魔神仔的芭樂')
      check(`${prefix} sheet states life drain`, /每夜末[\s\S]*失\s*1\s*壽命/.test(sheet.text), sheet.text);
    check(`${prefix} sheet content reaches bottom`, sheet.reachedBottom, sheet);
    const before = Number(await page.locator('#shAmt').textContent());
    await page.locator('#sheetbox .stepper button').last().click();
    const after = Number(await page.locator('#shAmt').textContent());
    check(`${prefix} sheet bid control works`, after === before + 1, { before, after });
    if (mode === 'shousui') {
      const options = await page.locator('#shTgt option').allTextContents();
      check(`${prefix} spirit-collection keeps destroy forbidden`, options.length > 0 && options.every(text => !/銷毀/.test(text)), options);
    }
    const sheetShot = path.join(out, `${prefix}-sheet.png`);
    await page.screenshot({ path: sheetShot, scale: 'css' });
    captures.push(path.relative(root, sheetShot).replaceAll('\\', '/'));
    await page.locator('#sheetbox .bigbtn').click();
    check(`${prefix} sheet confirm closes`, !(await page.locator('#sheet').isVisible()));
  };

  const viewports = quick ? [{ width: 852, height: 393 }] : [{ width: 844, height: 390 }, { width: 852, height: 393 }];
  const modes = quick ? ['normal'] : ['normal', 'shousui', 'yabao'];
  const curseNames = quick ? ['縛靈鎖'] : await page.evaluate(() => CURSES.map(item => item.n));
  for (const viewport of viewports)
    for (const mode of modes)
      for (const curseName of curseNames)
        await fixture(viewport, mode, curseName);

  const mechanics = await page.evaluate(() => {
    const G = window.__yaoshi;
    const cleanItem = G.POOL.find(item => item.n === '巴冷公主珠鍊');
    const target = { n: '測試厚紙人', f: G.BEAT_FAC[0], p: 1, unit: { body: 'ward', count: 1, atk: 0, hp: 99 } };
    const hit = (roleId, curses) => {
      const A = { id: 0, name: '甲', roleId, bag: [{ ...cleanItem }, ...curses.map(item => ({ ...item }))] };
      const B = { id: 1, name: '乙', roleId: 'human', bag: [{ ...target }] };
      const result = G.paperWar(A, B, { rng: () => 0.5, phase: null, windId: null });
      return result.beats.find(event => event.side === 'A' && event.kind === 'hit')?.amount ?? null;
    };
    const cleanHit = hit('human', []);
    const perCurse = G.CURSES.map(curse => ({ name: curse.n, hit: hit('human', [curse]) }));
    const stackedHit = hit('human', G.CURSES.slice(0, 2));
    const wardHit = hit('lvshan', [G.CURSES[0]]);
    const low = { n: '測試紙人', f: G.BEAT_FAC[0], p: 1, unit: { body: 'ward', count: 1, atk: 1, hp: 99 } };
    const lowA = { id: 0, name: '甲', roleId: 'human', bag: [{ ...low }, { ...G.CURSES[0] }] };
    const lowB = { id: 1, name: '乙', roleId: 'human', bag: [{ ...target }] };
    const lowWar = G.paperWar(lowA, lowB, { rng: () => 0.5, phase: null, windId: null });
    G.makeState('solo', 1, ['qingmian']);
    const player = G.S.players[0];
    G.S.players.forEach((candidate, index) => { candidate.alive = index === 0; candidate.bag = []; });
    player.life = 20;
    player.bag = [{ ...G.CURSES.find(item => item.drain) }];
    const nightRegen = G.CFG.NIGHT_REGEN;
    G.CFG.NIGHT_REGEN = 0;
    const lifeBefore = player.life;
    const battle = G.resolveBattles();
    G.CFG.NIGHT_REGEN = nightRegen;
    return {
      cleanHit,
      perCurse,
      stackedHit,
      wardHit,
      lowAttackProducedHit: lowWar.beats.some(event => event.side === 'A' && event.kind === 'hit'),
      bananaDrain: lifeBefore - player.life,
      bananaLog: battle.nightly,
    };
  });
  check('every curse reduces holder attack by one', mechanics.perCurse.every(row => row.hit === mechanics.cleanHit - 1), mechanics);
  check('curse attack penalty stacks per item', mechanics.stackedHit === mechanics.cleanHit - 2, mechanics);
  check('attack at zero does not act', mechanics.lowAttackProducedHit === false, mechanics);
  check('curse ward prevents attack penalty', mechanics.wardHit === mechanics.cleanHit, mechanics);
  check('banana drains one life at night end', mechanics.bananaDrain === 1 && mechanics.bananaLog.some(line => /侵蝕\s*-1/.test(line)), mechanics);

  const result = {
    syntheticMarket: true,
    url: targetUrl,
    quick,
    safeInsets: { top: 0, right: 59, bottom: 21, left: 59 },
    errors,
    checks,
    captures,
    summary: { passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length },
  };
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ out, errors, summary: result.summary, failures: checks.filter(row => !row.pass).map(row => row.name) }, null, 2));
  if (errors.length || result.summary.failed) process.exitCode = 1;
} finally {
  try { await browser?.close(); } finally { server?.kill(); }
}
