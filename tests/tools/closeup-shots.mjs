// 近景切鏡卷 批 1（v0.45）P8：一場對決的連拍。
// 844×390 橫式抓 ≥8 張（全景列陣→第一次 focus 進→停格含跳字→回全景→burn 跟拍→拍末），
// 390×844 直式抓 2 張（順便量 #duel 的 scrollHeight/clientHeight，看 HUD 有沒有把結尾擠出畫面）。
//   node tests/tools/closeup-shots.mjs <outdir> [--port=8961] [--url=...] [--min=6] [--portrait]
// 標記（marks）在頁面端排時間、Node 端輪詢到期就截圖：對決是自己在跑的時間軸，
// 用牆鐘 sleep 對不準，用事件＋相對延遲才拍得到「那一瞬間」。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const MARKS = `(() => {
  const M = window.__marks = { q: [], armed: false, done: [], note: {} };
  const min = window.__shotMin || 6;
  const mark = (name, dt) => M.q.push({ name: name, at: performance.now() + dt, dt: dt });
  let hitDone = false, burnDone = false, locked = false;
  document.addEventListener('ys:duel', (e) => {
    const d = e.detail || {};
    const n = (d.armies || []).reduce((s, x) => s + x.units.length, 0);
    if (locked) return;
    if (n < min) { M.armed = false; return; } // 人太少看不出退暗，換下一場
    // 這一場沒同時抓到 hit 與 burn 的話，下一場重來一遍（連拍要是**同一場**，不能東拼西湊）
    M.armed = true; hitDone = false; burnDone = false; M.q.length = 0;
    M.note.units = (d.armies || []).map((x) => x.units.length);
    mark('01-lineup', 1100);
    mark('02-beat1-wide', 2100);
  });
  document.addEventListener('ys:fx-focus', (e) => {
    if (!M.armed) return;
    const d = e.detail || {};
    if (d.kind === 'hit' && !hitDone) {
      hitDone = true;
      // 延遲都往前挪：Node 端輪詢＋page.screenshot 一次要 250–450ms，
      // 照「想拍到的時刻」直接排會整批落在切鏡結束之後（實測 07 排 +160ms、拍到的是 +830ms 的全景）
      mark('03-focus-in', 40);
      mark('04-focus-hold', 150);
      mark('05-focus-dmg', 280);
      mark('06-focus-back', (d.ms || 650) + 300);
    } else if (d.kind === 'burn' && !burnDone) {
      burnDone = true;
      mark('07-burn-follow', 0);
      mark('08-burn-ash', 120);
      mark('09-burn-back', (d.ms || 600) + 300);
    }
  });
  document.addEventListener('ys:duel-end', () => {
    if (!M.armed) return;
    mark('10-duel-end', 60);
    if (hitDone && burnDone) locked = true; // 這一場齊了，之後不再重拍
  });
})();`;

const { pos, opt } = parseArgs(process.argv.slice(2));
const outdir = pos[0];
if (!outdir) { console.error('need <outdir>'); process.exit(2); }
fs.mkdirSync(outdir, { recursive: true });
const port = Number(opt.port || 8961);
const portrait = !!opt.portrait;
const url = opt.url || `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${opt.seed || 11}`;

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: portrait ? { width: 390, height: 844 } : { width: 844, height: 390 }, deviceScaleFactor: 1 } /* dsf=1：一張截圖從 ~270ms 降到 ~150ms，切鏡那 600ms 才拍得進去 */);
  await page.addInitScript(`window.__shotMin = ${Number(opt.min || 6)};`);
  // 直式：產品本身在 orientation:portrait 會蓋一整片 #rotateHint「請轉橫」（index.html:39），
  // 蓋板連點擊都擋掉。要看「HUD 在窄畫面會不會溢出」只能把蓋板關掉再拍——
  // 這是**刻意造出來的條件**，不是玩家會看到的畫面，報告與圖說都要照這樣寫。
  if (portrait) await page.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{
    const st=document.createElement('style'); st.textContent='#rotateHint{display:none!important}'; document.head.appendChild(st); });`);
  await page.addInitScript(MARKS);
  const shots = [];
  const pump = async () => {
    const due = await page.evaluate(() => {
      const M = window.__marks; if (!M) return [];
      const now = performance.now();
      const out = [];
      M.q = M.q.filter((x) => { if (now >= x.at) { out.push({ name: x.name, at: x.at, late: now - x.at }); return false; } return true; });
      return out;
    }).catch(() => []);
    for (const d0 of due) {
      const name = d0.name;
      const file = path.join(outdir, (portrait ? 'p-' : '') + name + '.png');
      const c0 = Date.now();
      await page.screenshot({ path: file }).catch(() => {});
      const capMs = Date.now() - c0;
      const info = await page.evaluate(() => {
        const du = document.getElementById('duel');
        const g = [...document.querySelectorAll('.pwgauge i')].map((x) => x.style.width);
        const K = (window.__yaoshi3d || {}).camera;
        return { dist: K ? +Math.hypot(K.position.x, K.position.y, K.position.z).toFixed(3) : null,
          scroll: du ? [du.scrollHeight, du.clientHeight] : null,
          lamps: document.querySelectorAll('#beatLamps i.on').length,
          floats: document.querySelectorAll('.dmgfloat').length,
          card: document.querySelectorAll('#actorCard.on').length, gauge: g,
          beat: (document.getElementById('duelBeat') || {}).textContent };
      }).catch(() => null);
      shots.push({ name, file, info, late: +d0.late.toFixed(0), capMs });
      console.log('shot', name, 'late=' + d0.late.toFixed(0), 'cap=' + capMs, JSON.stringify(info));
    }
  };
  const r = await drive(page, url, { duels: Number(opt.duels || 5), onDuel: async () => {
    // 這一場拍完（或超時）才把控制權還給 drive 的點擊迴圈——對決期間本來就不需要點任何東西
    const t0 = Date.now();
    while (Date.now() - t0 < 26000) {
      await pump();
      const st = await page.evaluate(() => { const M = window.__marks; return M ? { armed: M.armed, left: M.q.length } : null; }).catch(() => null);
      if (st && st.armed && st.left === 0 && Date.now() - t0 > 4000) break;
      if (st && !st.armed && Date.now() - t0 > 12000) break;
      await page.waitForTimeout(25);
    }
  } });
  const note = await page.evaluate(() => (window.__marks || {}).note || {});
  await browser.close();
  fs.writeFileSync(path.join(outdir, portrait ? 'shots-portrait.json' : 'shots.json'), JSON.stringify({ url, portrait, note, shots, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ outdir, n: shots.length, units: note.units, errors: r.errors.length }));
} finally { srv.kill(); }
