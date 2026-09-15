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
const localHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const normalizeCrLf = value => value.replace(/\r\n?/g, '\n');
fs.mkdirSync(out, { recursive: true });

const server = requestedUrl ? null : await serve(root, 8996);
let browser;
const errors = [], checks = [], captures = [];
let sourceIdentity = null;
const check = (name, pass, details) => checks.push({ name, pass, details });
const safeName = value => value.replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '');
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const expected = {
  '冥婚紅包': { card: /得標[\s\S]*每件[\s\S]*1 壽命[\s\S]*禮金/, full: [/本夜有得標[\s\S]*每件付 1 壽命禮金/, /沒有得標不收/, /不增加標額或買路錢/, /淨化不免/] },
  '魔神仔的芭樂': { card: /夜末[\s\S]*每件[\s\S]*失 1 壽命/, full: [/每夜末每件失 1 壽命/, /可累加/, /淨化不免/] },
  '抓交替水符': { card: /每戰首次[\s\S]*折損[\s\S]*牽連[\s\S]*每件[\s\S]*傷害 1/, full: [/每戰首次[\s\S]*紙紮燒毀後/, /血量最低[\s\S]*每件受 1 傷害/, /只牽連一次/, /不觸發反傷、吸收或再次牽連/, /沒有其他存活者/, /淨化免除/] },
  '縛靈鎖': { card: /第1拍[\s\S]*最高基礎攻擊[\s\S]*每件攻擊 −2/, full: [/第1拍[\s\S]*基礎攻擊最高[\s\S]*本拍每件攻擊 −2/, /同分先入陣/, /總攻擊 ≤0 不出手/, /第2拍恢復/, /淨化免除/] },
  '白虎煞': { card: /戰敗[\s\S]*每件[\s\S]*額外失 1 壽命[\s\S]*減傷前/, full: [/每次戰敗[\s\S]*每件[\s\S]*增加 1 壽命損失/, /一般傷害上限外/, /再套用法寶減傷/, /獲勝或平手不生效/, /淨化免除/] },
};
const matches = (text, patterns) => patterns.every(pattern => pattern.test(text));

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 852, height: 393 }, hasTouch: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const response = await page.goto(targetUrl);
  const servedHtml = response ? await response.text() : '';
  const versions = await page.evaluate(() => ({ VERSION, RELEASE_VERSION }));
  sourceIdentity = {
    responseUrl: response?.url() || null,
    status: response?.status() || null,
    htmlMatchesLocal: normalizeCrLf(servedHtml) === normalizeCrLf(localHtml),
    ...versions,
  };
  check('page.goto HTML matches local index.html', sourceIdentity.htmlMatchesLocal, sourceIdentity);
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
    const card = await page.locator('#mc0').evaluate(element => {
      const box = value => ({ left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height });
      const cardRect = element.getBoundingClientRect();
      const railRect = element.closest('.rail').getBoundingClientRect();
      const effect = element.querySelector('.ab');
      const range = document.createRange();
      range.selectNodeContents(effect);
      const effectRect = range.getBoundingClientRect();
      const styles = getComputedStyle(document.documentElement);
      const safeRect = {
        left: parseFloat(styles.getPropertyValue('--safe-left')) || 0,
        top: parseFloat(styles.getPropertyValue('--safe-top')) || 0,
        right: innerWidth - (parseFloat(styles.getPropertyValue('--safe-right')) || 0),
        bottom: innerHeight - (parseFloat(styles.getPropertyValue('--safe-bottom')) || 0),
      };
      const contains = (outer, inner) => inner.left >= outer.left - 1 && inner.top >= outer.top - 1
        && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
      return {
        text: element.innerText,
        effectText: effect.textContent,
        locked: element.classList.contains('locked'),
        onclick: element.getAttribute('onclick'),
        visible: getComputedStyle(element).display !== 'none' && cardRect.width > 0 && cardRect.height > 0,
        cardRect: box(cardRect),
        railRect: box(railRect),
        effectRect: box(effectRect),
        safeRect,
        effectInCard: contains(cardRect, effectRect),
        effectInRail: contains(railRect, effectRect),
        effectInSafeViewport: contains(safeRect, effectRect),
      };
    });
    const prefix = `${viewport.width}x${viewport.height}-${mode}-${safeName(curseName)}`;
    const cardShot = path.join(out, `${prefix}-card.png`);
    await page.screenshot({ path: cardShot, scale: 'css' });
    captures.push(path.relative(root, cardShot).replaceAll('\\', '/'));
    check(`${prefix} card effect is visible in card, rail and safe viewport`, card.visible && card.effectRect.width > 0
      && card.effectRect.height > 0 && card.effectInCard && card.effectInRail && card.effectInSafeViewport, card);
    check(`${prefix} card states distinct curse effect`, expected[curseName].card.test(card.effectText)
      && !/每件[\s\S]*紙紮攻擊\s*[−–-]\s*1/.test(card.effectText), card);
    if (mode === 'yabao') {
      check(`${prefix} wager night keeps curse unavailable`, card.locked && card.onclick === null && /不開標/.test(card.text), card);
      return;
    }

    await page.locator('#mc0').click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#sheet')).display === 'flex');
    await settle(page);
    const effectGeometry = await page.locator('#sheetbox .desc > b').first().evaluate(node => {
      node.scrollIntoView({ block: 'center' });
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      const plain = value => ({ left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height });
      const clippedBy = [];
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        const clipsX = /^(auto|scroll|hidden|clip)$/.test(style.overflowX);
        const clipsY = /^(auto|scroll|hidden|clip)$/.test(style.overflowY);
        if (!clipsX && !clipsY) continue;
        const box = ancestor.getBoundingClientRect();
        const visible = (!clipsX || (rect.left >= box.left - 1 && rect.right <= box.right + 1))
          && (!clipsY || (rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1));
        clippedBy.push({ tag: ancestor.tagName, id: ancestor.id, className: ancestor.className,
          overflowX: style.overflowX, overflowY: style.overflowY, rect: plain(box), visible });
      }
      const styles = getComputedStyle(document.documentElement);
      const safeRect = {
        left: parseFloat(styles.getPropertyValue('--safe-left')) || 0,
        top: parseFloat(styles.getPropertyValue('--safe-top')) || 0,
        right: innerWidth - (parseFloat(styles.getPropertyValue('--safe-right')) || 0),
        bottom: innerHeight - (parseFloat(styles.getPropertyValue('--safe-bottom')) || 0),
      };
      const inSafeViewport = rect.left >= safeRect.left - 1 && rect.top >= safeRect.top - 1
        && rect.right <= safeRect.right + 1 && rect.bottom <= safeRect.bottom + 1;
      return { text: node.textContent, rect: plain(rect), safeRect, inSafeViewport, clippedBy,
        readable: rect.width > 0 && rect.height > 0 && inSafeViewport && clippedBy.every(item => item.visible) };
    });
    await settle(page);
    check(`${prefix} sheet curse effect range is readable through clipping ancestors`, effectGeometry.readable, effectGeometry);
    const sheet = await page.locator('#sheetbox').evaluate(element => {
      const max = Math.max(0, element.scrollHeight - element.clientHeight);
      const initialScrollTop = element.scrollTop;
      element.scrollTop = max;
      return {
        text: element.innerText,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        initialScrollTop,
        maxScrollTop: max,
        reachedBottom: Math.abs(element.scrollTop - max) <= 1,
      };
    });
    check(`${prefix} sheet states complete distinct curse effect`, matches(sheet.text, expected[curseName].full)
      && !/每件[\s\S]*紙紮攻擊\s*[−–-]\s*1/.test(sheet.text), sheet.text);
    check(`${prefix} sheet content reaches bottom`, sheet.reachedBottom, sheet);
    // Opening a sheet deliberately arms the production 500 ms phase guard so a
    // second tap cannot land on a newly exposed control. Wait that native guard,
    // then use the real plus button to prove the sheet is operable.
    await page.waitForTimeout((await page.evaluate(() => MAIN_GUARD_MS)) + 20);
    const before = Number(await page.locator('#shAmt').textContent());
    await page.locator('#sheetbox .stepper button').last().click();
    const after = Number(await page.locator('#shAmt').textContent());
    check(`${prefix} sheet bid control works`, after === before + 1, { before, after });
    if (mode === 'shousui') {
      const options = await page.locator('#shTgt option').allTextContents();
      check(`${prefix} spirit-collection keeps destroy forbidden`, options.length > 0 && options.every(text => !/銷毀/.test(text)), options);
    }
    const buttonGeometry = await page.locator('#sheetbox').evaluate(element => {
      element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
      const button = element.querySelector('.bigbtn');
      const rect = button.getBoundingClientRect();
      const styles = getComputedStyle(document.documentElement);
      const safeRect = {
        left: parseFloat(styles.getPropertyValue('--safe-left')) || 0,
        top: parseFloat(styles.getPropertyValue('--safe-top')) || 0,
        right: innerWidth - (parseFloat(styles.getPropertyValue('--safe-right')) || 0),
        bottom: innerHeight - (parseFloat(styles.getPropertyValue('--safe-bottom')) || 0),
      };
      return {
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        safeRect,
        reachedBottom: Math.abs(element.scrollTop - Math.max(0, element.scrollHeight - element.clientHeight)) <= 1,
        inSafeViewport: rect.width > 0 && rect.height > 0 && rect.left >= safeRect.left - 1 && rect.top >= safeRect.top - 1
          && rect.right <= safeRect.right + 1 && rect.bottom <= safeRect.bottom + 1,
      };
    });
    await settle(page);
    check(`${prefix} sheet confirm is visible in safe viewport at scroll bottom`, buttonGeometry.reachedBottom && buttonGeometry.inSafeViewport, buttonGeometry);
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

  const result = {
    syntheticMarket: true,
    url: targetUrl,
    quick,
    safeInsets: { top: 0, right: 59, bottom: 21, left: 59 },
    sourceIdentity,
    mechanicsCoverage: { command: 'node --test tests/curse-migration.test.mjs', expectedTests: 12,
      note: 'Distinct mechanics are covered by the unit suite; this browser probe checks production DOM copy and interaction only.' },
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
