/* 橫向溢出定位探針（請神 2.0 版面卷，凍結檔 G6：橫式溢出門檻回到 0）
   用法：node tests/tools/overflow-probe.mjs [--port=8992] [--seed=1] [--rounds=3]
   做的事：844×390 橫式開一局，走到「盯上宣告」與「出價」兩頁，把**每一個**
   右緣超出 #table 的元素列出來（tag/id/class/rect），直接指出是誰把版面撐開的。
   純診斷、不判定；判定在 legend-drive.mjs。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
function loadChromium() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fs.existsSync(c)) return createRequire(c)('playwright').chromium;
  throw new Error('找不到 playwright');
}
const argv = process.argv.slice(2);
const opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = +(opt.port || 8992);
const SEED = +(opt.seed || 1);

const SCAN = `(() => {
  const t = document.getElementById('table');
  const tr = t.getBoundingClientRect();
  const rows = [];
  document.querySelectorAll('#table *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const overR = r.right - tr.right, overL = tr.left - r.left;
    if (overR > 0.5 || overL > 0.5)
      rows.push({ tag: el.tagName, id: el.id || '', cls: (el.className || '').toString().slice(0, 40),
        left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1),
        overR: +overR.toFixed(1), overL: +overL.toFixed(1),
        txt: (el.textContent || '').trim().slice(0, 24) });
  });
  return { table: { left: +tr.left.toFixed(1), right: +tr.right.toFixed(1), w: +tr.width.toFixed(1) },
    docScroll: document.documentElement.scrollWidth, docClient: document.documentElement.clientWidth,
    tableScroll: t.scrollWidth, tableClient: t.clientWidth, rows };
})()`;

const main = async () => {
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const browser = await loadChromium().launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
    await page.evaluate((sd) => { CFG.T = 1;
      const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
      window.__yaoshi.newGame('solo', sd, ['qingmian']); }, SEED);
    const seen = {};
    for (let step = 0; step < 900; step++) {
      await page.waitForTimeout(12);
      const st = await page.evaluate(`(() => { const b = document.getElementById('mainbtn');
        return { txt: b ? b.textContent : '', dis: b ? b.disabled : true,
          round: window.__yaoshi.S ? window.__yaoshi.S.round : 0 }; })()`);
      const key = `${st.round}｜${st.txt}`;
      if (!st.dis && !seen[key]) {
        seen[key] = true;
        const scan = await page.evaluate(SCAN);
        if (scan.rows.length || scan.docScroll > scan.docClient) {
          console.log(`\n=== ${key}　#table ${scan.tableClient}px（scrollW ${scan.tableScroll}）　html ${scan.docClient}/${scan.docScroll}`);
          scan.rows.slice(0, 12).forEach(r => console.log('   ', JSON.stringify(r)));
        }
      }
      if (st.txt === '再入妖市') break;
      if (st.round > (+(opt.rounds || 3))) break;
      if (!st.dis) await page.click('#mainbtn');
      else {
        const hit = await page.evaluate(`(() => { const els=[...document.querySelectorAll('#stage button')];
          const b=els.find(e=>/passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick')||''))||els.find(e=>!e.disabled);
          if(!b) return null; b.click(); return 1; })()`);
        if (!hit) await page.waitForTimeout(20);
      }
    }
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }
};
main().catch(e => { console.error(e); process.exit(2); });
