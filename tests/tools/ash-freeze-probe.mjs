/* F1／F6（驗收凍結檔 docs/experiments/2026-09-07-acceptance-ash-freeze.md）：
   燒毀灰燼「凍結殘留」探針。D3 治具同一套流程（四座位 11 隻、hp 壓 1，跑到 3 次 ys:duel-end），
   每 300ms 掃 scene 裡所有 visible 的 THREE.Points：
     未停在 PARK(-999) 的粒子數 >0、且位置陣列與上一筆逐值相同、且同一筆掃描裡另有 Points 有變動（render loop 活著）
     ＝一次凍結命中。任一 Points 連續凍結 ≥ FREEZE_N(7) 筆（2.1s，長過灰燼最長壽命 1.47s）＝紅。
   F6：每個 Points「最後一次有變動→visible=false」之前的連續變動筆數，修後每一段灰燼都要 ≥2（自然燒完，不是硬切）。
   跑法：node tests/tools/ash-freeze-probe.mjs [--port=8889] [--root=<靜態根目錄，預設 repo 根>]
        對基準：git worktree add --detach <path> ff227a7 → --root=<path> 必紅 */
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
const PORT = Number(opt.port || 8889);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
const FREEZE_N = 7;

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

const INIT = `(() => {
  window.__ash = { duels: 0, ends: 0, endSamples: [], objs: {}, samples: 0, loopDead: 0 };
  const PARK = -999;
  const scan = () => {
    const Y3 = window.__yaoshi3d; if (!Y3 || !Y3.scene) return;
    const seen = {}; let anyChanged = false; const rows = [];
    Y3.scene.traverse((o) => {
      if (!o.isPoints) return;
      // 祖先鏈任一不可見就不會被畫（被藏起來那尊身上的環境粒子不算）
      for (let q = o; q; q = q.parent) if (!q.visible) return;
      const attr = o.geometry && o.geometry.getAttribute && o.geometry.getAttribute('position'); if (!attr) return;
      const a = attr.array; let live = 0, h = 0;
      for (let i = 0; i < a.length; i += 3) { if (a[i + 1] !== PARK) { live++; h += a[i] * 1.31 + a[i + 1] * 2.17 + a[i + 2] * 3.07; } }
      rows.push({ id: o.uuid, live, h, n: a.length / 3 });
    });
    for (const r of rows) {
      const o = window.__ash.objs[r.id] || (window.__ash.objs[r.id] = { n: r.n, live: 0, h: null, frozen: 0, frozenMax: 0, moving: 0, moved: false, movingRuns: [], wasVisible: false });
      seen[r.id] = true;
      const changed = o.h !== null && (o.h !== r.h || o.live !== r.live);
      if (changed) anyChanged = true;
      o.__changed = changed; o.__live = r.live; o.__h = r.h;
    }
    for (const id in window.__ash.objs) {
      const o = window.__ash.objs[id];
      if (seen[id]) {
        // 只算「曾經動過、之後才凍住」的：從頭到尾沒動過的是靜態裝飾，不是殘留的灰燼
        if (o.__live > 0 && o.h !== null && !o.__changed && o.moved) { if (anyChanged) { o.frozen++; if (o.frozen > o.frozenMax) o.frozenMax = o.frozen; } }
        else { o.frozen = 0; }
        if (o.__changed && o.__live > 0) { o.moving++; o.moved = true; }
        o.h = o.__h; o.live = o.__live; o.wasVisible = true;
      } else if (o.wasVisible) {
        // 這一筆不見了（visible=false）：把這段的連續變動筆數收進 movingRuns（F6）
        o.movingRuns.push(o.moving); o.moving = 0; o.frozen = 0; o.h = null; o.live = 0; o.wasVisible = false;
      }
    }
    if (!anyChanged && rows.length) window.__ash.loopDead++;
    window.__ash.samples++;
  };
  setInterval(scan, 300);
  document.addEventListener('ys:duel', () => { window.__ash.duels++; });
  document.addEventListener('ys:duel-end', () => {
    const F = window.__ysFxCount || {}; const last = (F.fights || [])[F.fights.length - 1] || {};
    window.__ash.ends++; window.__ash.endSamples.push({ warBurn: last.warBurn, burnEv: last.burnEv });
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
    const bagInfo = await page.evaluate(() => {
      const Y = window.__yaoshi, S = Y.S;
      const by = (n) => Y.POOL.find((x) => x.n === n);
      const bag = [{ ...by('魔神仔紅帽') }, { ...by('林投姐髮簪') }, { ...by('五營旗') }]
        .map((x) => ({ ...x, unit: { ...x.unit, hp: 1 } }));
      const n = bag.reduce((s, x) => s + (x.unit ? x.unit.count : 1), 0);
      S.players.forEach((p) => { p.bag = bag.map((x) => ({ ...x, unit: { ...x.unit } })); });
      return { n, names: bag.map((x) => x.n) };
    });
    const t0 = Date.now();
    let lastEnd = 0, endAt = 0;
    while (Date.now() - t0 < 240000) {
      const st = await page.evaluate(() => {
        const mb = document.getElementById('mainbtn');
        const ho = document.getElementById('hoBtn');
        const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
        const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
        return { mainText: mb ? mb.textContent : '', mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, ends: window.__ash.ends };
      });
      // 每次對決結束後多等 3.5s 再往下點：讓寬限期（2s）與灰燼壽命（≤1.47s）都走完，凍結才量得到／量得準
      if (st.ends !== lastEnd) { lastEnd = st.ends; endAt = Date.now(); }
      if (endAt && Date.now() - endAt < 3500) { await page.waitForTimeout(200); continue; }
      if (st.ends >= 3) break;
      if (/再入妖市/.test(st.mainText)) break;
      if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(3500);
    const R = await page.evaluate(() => window.__ash);
    const MAXFIG = await page.evaluate(() => window.PW_FX ? window.PW_FX.MAXFIG : null).catch(() => null);
    await browser.close();
    const objs = Object.values(R.objs);
    const frozenObjs = objs.filter((o) => o.frozenMax >= FREEZE_N);
    const cap = MAXFIG || 8;
    const reinforceActive = R.endSamples.some((s) => (s.warBurn || 0) > cap);
    // F6：有噴發過的 Points（movingRuns 內有值），每一段都要 ≥2 筆連續變動才隱藏
    const runs = objs.flatMap((o) => o.movingRuns);
    const hardCut = runs.filter((m) => m < 2).length;
    console.log(JSON.stringify({ root: SRC_ROOT, bagInfo, MAXFIG, samples: R.samples, loopDead: R.loopDead, duels: R.duels, ends: R.ends,
      endSamples: R.endSamples, points: objs.map((o) => ({ n: o.n, frozenMax: o.frozenMax, runs: o.movingRuns })), errors: errs }, null, 1));
    console.log('判定 F1：凍結 Points 數（連續 >=' + FREEZE_N + ' 筆）=', frozenObjs.length, frozenObjs.length === 0 ? '✅' : '❌',
      '｜ 遞補有動（burn>MAXFIG）', reinforceActive, '｜ 0 error', errs.length === 0,
      '｜ F6 硬切段數=', hardCut, hardCut === 0 ? '✅' : '❌', '（runs 共', runs.length, '段）');
    process.exit(frozenObjs.length === 0 && reinforceActive && errs.length === 0 && hardCut === 0 ? 0 : 1);
  } finally { srv.kill(); }
}
main();
