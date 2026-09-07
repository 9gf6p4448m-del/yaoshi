/* D3（驗收凍結檔 docs/experiments/2026-09-07-acceptance-duel-desync.md）：
   用一側 >=10 隻的袋（魔神仔紅帽×4＋林投姐髮簪×4＋五營旗×3＝11 隻，四個座位全套同一份袋子，
   確保不論回合怎麼配對，兩邊都吃到這個規模）跑一場對決，驗證：
   ① 對決期間場上任一時刻可見（visible）且未燒毀的 3D 尊數不超過 PW_FX.MAXFIG
   ② 對決結束（ys:duel-end 這一刻，duel-figures 自己的收尾 listener 還沒把畫面藏起來之前）
      可見未燒的 3D 尊數 = min(HUD 隻數, MAXFIG)
   ③ 0 console error / pageerror / requestfailed
   跑法：node tests/tools/duel-desync-d3.mjs [--port=8887] [--root=<靜態根目錄，預設 repo 根>] */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const argv = process.argv.slice(2);
const opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = Number(opt.port || 8887);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

const INIT = `(() => {
  window.__d3 = { maxVisible: { A: 0, B: 0 }, endSamples: [], duels: 0 };
  const figApi = () => { try { return window.__yaoshi3d && window.__yaoshi3d.duelFigures; } catch (e) { return null; } };
  const visCount = (side) => { const D = figApi(); if (!D) return null; return D.figuresOf(side).filter((f) => f.group.visible).length; };
  const hudCount = (tag) => { const el = document.getElementById('pwn-' + tag); return el ? (parseInt(el.textContent, 10) || 0) : null; };
  setInterval(() => {
    const a = visCount('A'), b = visCount('B');
    if (a != null && a > window.__d3.maxVisible.A) window.__d3.maxVisible.A = a;
    if (b != null && b > window.__d3.maxVisible.B) window.__d3.maxVisible.B = b;
  }, 60);
  document.addEventListener('ys:duel', () => { window.__d3.duels++; });
  // 這個 listener 在 addInitScript 階段就掛上，比 duel-figures.js（頁面自己的 script）早註冊，
  // 所以同一個事件目標上，我們的 handler 會比 duel-figures.js 的 onDuelEnd（把畫面全部藏起來）先跑。
  document.addEventListener('ys:duel-end', () => {
    const F = window.__ysFxCount || {};
    const last = (F.fights || [])[F.fights.length - 1] || {};
    window.__d3.endSamples.push({
      visA: visCount('A'), visB: visCount('B'),
      hudA: hudCount('A'), hudB: hudCount('B'),
      warBurn: last.warBurn, burnEv: last.burnEv,
    });
  });
})();`;

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const errs = [];
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('requestfailed', (r) => errs.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText));
    await page.addInitScript(INIT);
    await page.goto(`http://127.0.0.1:${PORT}/index.html?paperwar=1&fxcount=1`, { waitUntil: 'load' });
    await page.click('button:has-text("單人入市")');
    await page.waitForSelector('#selectScr.on');
    await page.click('#selGrid .rcard');
    await page.click('#selBtn:not([disabled])');
    // 遊戲狀態這時已經 makeState 過（confirmRole 同步呼叫 newGame）：四個座位全套同一份 >=10 隻的袋子。
    const bagInfo = await page.evaluate(() => {
      const Y = window.__yaoshi, S = Y.S;
      const by = (n) => Y.POOL.find((x) => x.n === n);
      // hp 全部壓到 1：確保只要對面打得到，這一側大量死亡（>MAXFIG）才驗得到「遞補上場」真的有在動，
      // 不是靠運氣等一場剛好死很多隻的對局。
      const bag = [{ ...by('魔神仔紅帽') }, { ...by('林投姐髮簪') }, { ...by('五營旗') }]
        .map((x) => ({ ...x, unit: { ...x.unit, hp: 1 } }));
      const n = bag.reduce((s, x) => s + (x.unit ? x.unit.count : 1), 0);
      S.players.forEach((p) => { p.bag = bag.map((x) => ({ ...x, unit: { ...x.unit } })); });
      return { n, names: bag.map((x) => x.n) };
    });
    let stageOkSeen = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 180000) {
      const st = await page.evaluate(() => {
        const mb = document.getElementById('mainbtn');
        const ho = document.getElementById('hoBtn');
        const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
        const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
        return { mainText: mb ? mb.textContent : '', mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, duels: window.__d3.duels, ends: window.__d3.endSamples.length };
      });
      if (st.ends >= 3) break;
      if (/再入妖市/.test(st.mainText)) break;
      if (st.stageOk) { stageOkSeen = true; await page.click('#stage .bigbtn:not([disabled])').catch(() => {}); }
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(200);
    }
    const result = await page.evaluate(() => window.__d3);
    // v0.43.3：PW_FX 是 const、不在 window 上，以前這裡恆 null → 判定一律退回 8 猜；改讀 __yaoshi.PW_FX（真 cap），再退回 window.PW_FX
    const MAXFIG = await page.evaluate(() => (window.__yaoshi && window.__yaoshi.PW_FX && window.__yaoshi.PW_FX.MAXFIG) || (window.PW_FX ? window.PW_FX.MAXFIG : null)).catch(() => null);
    await browser.close();
    console.log(JSON.stringify({ bagInfo, MAXFIG, result, errors: errs }, null, 1));
    const cap = MAXFIG || 8;
    const maxOk = result.maxVisible.A <= cap && result.maxVisible.B <= cap;
    const endOk = result.endSamples.length > 0 && result.endSamples.every((s) =>
      s.visA === Math.min(s.hudA, cap) && s.visB === Math.min(s.hudB, cap));
    const reinforceActive = result.endSamples.some((s) => (s.warBurn || 0) > cap);
    console.log('判定：maxVisible<=MAXFIG', maxOk, '｜ endSample visible=min(hud,MAXFIG)', endOk,
      '｜ 至少一場 burn 數 > MAXFIG（證明遞補真的有在動）', reinforceActive, '｜ 0 error', errs.length === 0);
    process.exit(maxOk && endOk && errs.length === 0 ? 0 : 1);
  } finally { srv.kill(); }
}
main();
