// 規則頁探針：真頁面開 openHelp()，抓「⚔ 結算戰」段文字、溢出、console error，截圖
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'C:/Users/shung/OneDrive/桌面/妖市';
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');
const { serve } = await import('file:///C:/Users/shung/OneDrive/%E6%A1%8C%E9%9D%A2/%E5%A6%96%E5%B8%82/tests/tools/duel-drive.mjs');
const OUT = process.argv[2]; const port = 8846;
const srv = await serve(ROOT, port);
const out = {};
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  for (const pw of ['1', '0']) {
    const errs = [];
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    page.on('pageerror', e => errs.push('pageerror: ' + e));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=${pw}&fxcount=1&seed=3`, { waitUntil: 'load' });
    await page.click('button:has-text("單人入市")');
    await page.waitForSelector('#selectScr.on');
    await page.click('#selGrid .rcard');
    await page.click('#selBtn:not([disabled])');
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      openHelp();
      const mb = document.getElementById('modalbox');
      const secs = [...mb.querySelectorAll('div[style*="margin-top:10px"]')];
      const s = secs.find(d => d.textContent.startsWith('⚔ 結算戰'));
      const w = secs.find(d => d.textContent.startsWith('🀄 風位'));
      return { pwOn: CFG.PAPERWAR_ON, PW_MIN: CFG.PW_MIN, PW_MAX: CFG.PW_MAX,
        battle: s ? s.textContent : null, wind: w ? w.textContent : null,
        modalOverflow: mb.scrollWidth - mb.clientWidth, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        secBoxW: s ? Math.round(s.getBoundingClientRect().width) : null, modalW: mb.clientWidth };
    });
    await page.evaluate(() => { const s=[...document.querySelectorAll('#modalbox div[style*="margin-top:10px"]')].find(d=>d.textContent.startsWith('⚔')); s && s.scrollIntoView(); });
    await page.screenshot({ path: path.join(OUT, `rules-pw${pw}.png`) });
    out['pw' + pw] = { ...r, errs };
    await page.close();
  }
  await browser.close();
} finally { srv.kill(); }
fs.writeFileSync(path.join(OUT, 'rules-probe.json'), JSON.stringify(out, null, 2));
for (const k of Object.keys(out)) { const o = out[k]; console.log(`[${k}] pwOn=${o.pwOn} errs=${o.errs.length} modalOverflow=${o.modalOverflow} docOverflow=${o.docOverflow} secW=${o.secBoxW}/${o.modalW}`); console.log('  ⚔ ' + o.battle); console.log('  🀄 ' + o.wind); if (o.errs.length) console.log('  ERRS', o.errs); }
