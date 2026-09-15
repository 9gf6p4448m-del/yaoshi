// Synthetic inventory, production renderers: checks every auction card/detail and
// every bag row without pretending that legends can appear in the market.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
const valueOf = name => {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find(value => value.startsWith(prefix));
  return arg === undefined ? undefined : arg.slice(prefix.length);
};
const repoOutput = (value, fallback) => {
  if (value === undefined) return path.join(root, fallback);
  if (!value || path.isAbsolute(value)) throw new Error('--out 必須是非空的 repo 相對路徑');
  const resolved = path.resolve(root, value), relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error('--out 不得離開 repo');
  return resolved;
};
const requestedUrl = valueOf('url');
if (requestedUrl && !['http:', 'https:'].includes(new URL(requestedUrl).protocol))
  throw new Error('--url 必須是 http(s) URL');
const out = repoOutput(valueOf('out'), 'docs/experiments/2026-09-15-item-copy');
const targetUrl = requestedUrl || 'http://127.0.0.1:8995/';
const localHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const normalizeCrLf = value => value.replace(/\r\n?/g, '\n');
const PURE_POWER = new Set(['sword', 'pojun', 'sigui', 'fushou']);
const CURSE_EXPECTED = {
  '冥婚紅包': { card: /得標[\s\S]*每件[\s\S]*1 壽命[\s\S]*禮金/, full: [/本夜有得標[\s\S]*每件付 1 壽命禮金/, /沒有得標不收/, /不增加標額或買路錢/, /淨化不免/] },
  '魔神仔的芭樂': { card: /夜末[\s\S]*每件[\s\S]*失 1 壽命/, full: [/每夜末每件失 1 壽命/, /可累加/, /淨化不免/] },
  '抓交替水符': { card: /每戰首次[\s\S]*折損[\s\S]*牽連[\s\S]*每件[\s\S]*傷害 1/, full: [/每戰首次[\s\S]*紙紮燒毀後/, /血量最低[\s\S]*每件受 1 傷害/, /只牽連一次/, /不觸發反傷、吸收或再次牽連/, /沒有其他存活者/, /淨化免除/] },
  '縛靈鎖': { card: /第1拍[\s\S]*最高基礎攻擊[\s\S]*每件攻擊 −2/, full: [/第1拍[\s\S]*基礎攻擊最高[\s\S]*本拍每件攻擊 −2/, /同分先入陣/, /總攻擊 ≤0 不出手/, /第2拍恢復/, /淨化免除/] },
  '白虎煞': { card: /戰敗[\s\S]*每件[\s\S]*額外失 1 壽命[\s\S]*減傷前/, full: [/每次戰敗[\s\S]*每件[\s\S]*增加 1 壽命損失/, /一般傷害上限外/, /再套用法寶減傷/, /獲勝或平手不生效/, /淨化免除/] },
  '王船煞': { card: /第1拍[\s\S]*血量最高[\s\S]*每件失 1 血[\s\S]*最低 1/, full: [/第1拍[\s\S]*目前血量最高[\s\S]*每件失 1 血量[\s\S]*最低留 1/, /同分先入陣/, /局末送出海/, /淨化免除/] },
};
const views = [{ width: 844, height: 390 }, { width: 852, height: 393 }];
fs.mkdirSync(out, { recursive: true });

const server = requestedUrl ? null : await serve(root, 8995);
let browser;
const errors = [], checks = [], captures = [], cards = [], sheets = [], bags = [];
let help = null;
const check = (name, pass, details) => checks.push({ name, pass, details });
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const has = (text, value) => !value || text.includes(value);
const compactCurse = (name, text) => CURSE_EXPECTED[name]?.card.test(text)
  && !/每件[\s\S]*紙紮攻擊\s*[−–-]\s*1/.test(text);
const fullCurse = (name, text) => CURSE_EXPECTED[name]?.full.every(pattern => pattern.test(text))
  && !/每件[\s\S]*紙紮攻擊\s*[−–-]\s*1/.test(text);

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: views[1], hasTouch: true });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
  const response = await page.goto(targetUrl);
  const servedHtml = response ? await response.text() : '';
  const versions = await page.evaluate(() => ({ VERSION, RELEASE_VERSION }));
  const sourceIdentity = {
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

  const inventory = await page.evaluate(() => {
    const row = item => {
      const unit = unitRow(item);
      return {
        name: item.n, ab: item.ab || null, curse: !!item.curse, drain: item.drain || 0,
        legend: !!item.legend, curseKind: curseKind(item), abilityDesc: item.ab && ABILITIES[item.ab] ? ABILITIES[item.ab].desc : '',
        move: unit && !unit.curse ? unit.move : '', traitDesc: unit && !unit.curse ? unit.desc : '',
      };
    };
    const eventCurse = { n: '王船煞', f: 'curse', p: CFG.ZONGZI_PW,
      d: '送王船沾上的煞，局末自動送出海', curse: true, endStrip: true };
    return { auction: [...POOL, ...CURSES].map(row), bag: [...POOL, ...CURSES, eventCurse, ...LEGENDS].map(row) };
  });
  check('inventory has 32 auction items and 36 bag items', inventory.auction.length === 32 && inventory.bag.length === 36, {
    auction: inventory.auction.map(item => item.name), bag: inventory.bag.map(item => item.name),
  });
  check('legends are bag-only fixtures', inventory.bag.filter(item => item.legend).length === 3
    && inventory.auction.every(item => !item.legend), inventory.bag.filter(item => item.legend).map(item => item.name));
  check('event curse is bag-only synthetic fixture', inventory.bag.some(item => item.name === '王船煞' && item.curseKind === 'boat')
    && inventory.auction.every(item => item.name !== '王船煞'), inventory.bag.find(item => item.name === '王船煞'));

  const renderCard = async (item, phase, viewport) => {
    await page.evaluate(({ name, phase }) => {
      const item = [...POOL, ...CURSES].find(candidate => candidate.n === name);
      S.market = Array.from({ length: 4 }, () => ({ ...item }));
      myBids = Array.from({ length: 4 }, () => ({ amt: 0, type: 'cons', intent: 'keep', target: null }));
      YB = null; S.nightRule = null; BIDS_OPEN = true;
      if (phase === 'mark') showMarkUI(); else showMarket();
    }, { name: item.name, phase });
    await settle(page);
    const measured = await page.locator('#mc0').evaluate(element => {
      const plain = rect => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
      const card = element.getBoundingClientRect(), rail = element.closest('.rail').getBoundingClientRect();
      const effect = element.querySelector('.ab'), range = document.createRange();
      range.selectNodeContents(effect);
      const text = range.getBoundingClientRect(), style = getComputedStyle(document.documentElement);
      const safe = { left: parseFloat(style.getPropertyValue('--safe-left')) || 0,
        top: parseFloat(style.getPropertyValue('--safe-top')) || 0,
        right: innerWidth - (parseFloat(style.getPropertyValue('--safe-right')) || 0),
        bottom: innerHeight - (parseFloat(style.getPropertyValue('--safe-bottom')) || 0) };
      const inside = (outer, inner) => inner.left >= outer.left - 1 && inner.top >= outer.top - 1
        && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
      return { text: element.innerText, effectText: effect.textContent, card: plain(card), rail: plain(rail), effect: plain(text), safe,
        visible: getComputedStyle(element).display !== 'none' && card.width > 0 && card.height > 0,
        readable: text.width > 0 && text.height > 0 && inside(card, text) && inside(rail, text) && inside(safe, text) };
    });
    const summaryOK = item.curse ? compactCurse(item.name, measured.effectText)
      : PURE_POWER.has(item.ab) ? /^夜戰[：:]/.test(measured.effectText) && has(measured.effectText, item.traitDesc)
        && !has(measured.effectText, item.abilityDesc) && !/戰力評估/.test(measured.effectText)
        : item.ab ? has(measured.effectText, item.abilityDesc) : has(measured.effectText, item.traitDesc);
    const record = { viewport: `${viewport.width}x${viewport.height}`, phase, item: item.name, summaryOK, ...measured };
    cards.push(record);
    if (viewport.width === 852 && phase === 'bid' && ['王爺劍', '巴冷公主珠鍊'].includes(item.name)) {
      const shot = path.join(out, `${item.name}-card.png`);
      await page.screenshot({ path: shot, scale: 'css' });
      captures.push(path.relative(root, shot).replaceAll('\\', '/'));
    }
    return record;
  };

  const inspectSheet = async (item, viewport) => {
    await page.evaluate(() => openSheet(0));
    await settle(page);
    const measured = await page.locator('#sheetbox').evaluate(element => {
      const style = getComputedStyle(document.documentElement);
      const safe = { left: parseFloat(style.getPropertyValue('--safe-left')) || 0,
        top: parseFloat(style.getPropertyValue('--safe-top')) || 0,
        right: innerWidth - (parseFloat(style.getPropertyValue('--safe-right')) || 0),
        bottom: innerHeight - (parseFloat(style.getPropertyValue('--safe-bottom')) || 0) };
      const inside = (outer, inner) => inner.left >= outer.left - 1 && inner.top >= outer.top - 1
        && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
      const nodes = [...element.querySelectorAll('.desc,.umd')];
      const ranges = nodes.map(node => {
        node.scrollIntoView({ block: 'center' });
        const range = document.createRange(); range.selectNodeContents(node);
        const rect = range.getBoundingClientRect(), box = element.getBoundingClientRect();
        return { text: node.textContent, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
          readable: rect.width > 0 && rect.height > 0 && inside(box, rect) && inside(safe, rect) };
      });
      element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight);
      return { text: element.innerText, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
        reachedBottom: Math.abs(element.scrollTop - Math.max(0, element.scrollHeight - element.clientHeight)) <= 1, ranges };
    });
    const copyOK = item.curse ? fullCurse(item.name, measured.text)
      : has(measured.text, item.move) && has(measured.text, item.traitDesc)
        && (PURE_POWER.has(item.ab)
          ? !has(measured.text, item.abilityDesc) && !/戰力評估/.test(measured.text)
          : has(measured.text, item.abilityDesc));
    const valuationOK = /參考行情\s*[+−-]?\d+[\s\S]*心願[\s\S]*信譽依此判定/.test(measured.text);
    const record = { viewport: `${viewport.width}x${viewport.height}`, item: item.name, copyOK, valuationOK, ...measured };
    sheets.push(record);
    if (viewport.width === 852 && item.name === '王爺劍') {
      const shot = path.join(out, '王爺劍-sheet.png');
      await page.screenshot({ path: shot, scale: 'css' });
      captures.push(path.relative(root, shot).replaceAll('\\', '/'));
    }
    await page.evaluate(() => closeSheet());
  };

  for (const viewport of views) {
    await page.setViewportSize(viewport);
    for (const item of inventory.auction) {
      await renderCard(item, 'mark', viewport);
      await renderCard(item, 'bid', viewport);
      await inspectSheet(item, viewport);
    }

    await page.evaluate(() => {
      const p = S.players[ACTIVE];
      const eventCurse = { n: '王船煞', f: 'curse', p: CFG.ZONGZI_PW,
        d: '送王船沾上的煞，局末自動送出海', curse: true, endStrip: true };
      p.bag = [...POOL, ...CURSES, eventCurse, ...LEGENDS].map(item => ({ ...item }));
      showBag(ACTIVE);
    });
    await settle(page);
    const bagRows = await page.locator('#modalbox').evaluate(element => {
      const style = getComputedStyle(document.documentElement);
      const safe = { left: parseFloat(style.getPropertyValue('--safe-left')) || 0,
        top: parseFloat(style.getPropertyValue('--safe-top')) || 0,
        right: innerWidth - (parseFloat(style.getPropertyValue('--safe-right')) || 0),
        bottom: innerHeight - (parseFloat(style.getPropertyValue('--safe-bottom')) || 0) };
      const inside = (outer, inner) => inner.left >= outer.left - 1 && inner.top >= outer.top - 1
        && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1;
      const inspect = row => {
        row.scrollIntoView({ block: 'center' });
        const effect = row.querySelector('.umd') || row, range = document.createRange();
        range.selectNodeContents(effect);
        const rect = range.getBoundingClientRect(), box = element.getBoundingClientRect();
        return { text: row.innerText, effectText: effect.textContent,
          readable: rect.width > 0 && rect.height > 0 && inside(box, rect) && inside(safe, rect) };
      };
      const primaryAll = [...element.querySelectorAll(':scope > .bagit:not(.bagsum):not(.uprev)')];
      const primary = primaryAll.slice(0, 36).map(inspect);
      const preview = [...element.querySelectorAll(':scope > .bagit.uprev')].map(inspect);
      element.scrollTop = 0;
      return { primary, preview, primaryItemCount: primary.length, previewItemCount: preview.length,
        extraSummaryRows: primaryAll.length - primary.length, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
    });
    bags.push({ viewport: `${viewport.width}x${viewport.height}`, ...bagRows });

    if (viewport.width === 852) {
      const shot = async (name, action) => {
        await page.locator('#modalbox').evaluate(action);
        await settle(page);
        const file = path.join(out, `${name}.png`);
        await page.screenshot({ path: file, scale: 'css' });
        captures.push(path.relative(root, file).replaceAll('\\', '/'));
      };
      await shot('bag-top', element => { element.scrollTop = 0; });
      await shot('bag-middle', element => { element.scrollTop = (element.scrollHeight - element.clientHeight) / 2; });
      await shot('bag-curse', element => element.querySelectorAll(':scope > .bagit.uprev')[27].scrollIntoView({ block: 'center' }));
      await shot('bag-event-curse', element => element.querySelectorAll(':scope > .bagit.uprev')[32].scrollIntoView({ block: 'center' }));
      await shot('bag-legend', element => element.querySelectorAll(':scope > .bagit.uprev')[33].scrollIntoView({ block: 'center' }));
    }
    await page.evaluate(() => closeModal());
  }

  await page.evaluate(() => openHelp());
  await settle(page);
  help = await page.locator('#modalbox').evaluate(element => ({
    text: element.innerText,
    visible: getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0
      && element.getBoundingClientRect().height > 0,
  }));
  check('formal help uses market valuation language without combat power copy', help.visible && /行情/.test(help.text) && !/戰力/.test(help.text), help);
  await page.evaluate(() => closeModal());

  const cardFailures = cards.filter(row => !row.visible || !row.readable || !row.summaryOK);
  const sheetFailures = sheets.filter(row => !row.copyOK || !row.valuationOK || !row.reachedBottom || row.ranges.some(range => !range.readable));
  const bagFailures = [];
  for (const bag of bags) inventory.bag.forEach((item, index) => {
    const primary = bag.primary[index], preview = bag.preview[index];
    const ok = bag.primaryItemCount === 36 && bag.previewItemCount === 36
      && primary && preview && primary.text.includes(item.name) && preview.text.includes(item.name)
      && !/戰力/.test(primary.text) && preview.readable
      && (PURE_POWER.has(item.ab) ? !has(primary.text, item.abilityDesc) && !/戰力評估/.test(primary.text) : has(primary.text, item.abilityDesc))
      && (item.curse ? fullCurse(item.name, preview.text)
        : has(preview.text, item.move) && has(preview.text, item.traitDesc));
    if (!ok) bagFailures.push({ viewport: bag.viewport, item: item.name, primary, preview });
  });
  check('all mark and bid card summaries are readable', cardFailures.length === 0, cardFailures);
  check('all 32 auction sheets expose complete readable effects', sheetFailures.length === 0, sheetFailures);
  check('all 36 bag items expose complete effects without retired power copy', bagFailures.length === 0, bagFailures);

  const result = { syntheticFixture: true, naturalPlaythrough: false, eventCurseFixture: '王船煞 is render-only here and does not enter the auction market', url: targetUrl, sourceIdentity,
    safeInsets: { top: 0, right: 59, bottom: 21, left: 59 }, views, errors, checks, cards, sheets, bags, help, captures,
    summary: { passed: checks.filter(row => row.pass).length, failed: checks.filter(row => !row.pass).length } };
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ out, sourceIdentity, errors, summary: result.summary,
    cardFailures: cardFailures.length, sheetFailures: sheetFailures.length, bagFailures: bagFailures.length }, null, 2));
  if (errors.length || result.summary.failed) process.exitCode = 1;
} finally {
  try { await browser?.close(); } finally { server?.kill(); }
}
