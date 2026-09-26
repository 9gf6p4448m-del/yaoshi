// 北列收合 × 3D 取景不變（凍結 visual-polish 修訂 (c)）：同一局（solo seed 3）打到指定夜的出價頁，
// V1–V4 各讀一次 3D 取景的輸入與輸出——#felt 框、取景避讓的障礙物框（renderer.js 的 obstacles 清單）、
// window.__yaoshi3d.framing（fitSubject 的結果）、相機 fov／aspect／viewOffset——基準與修後逐值比對。
// 相機的 position／quaternion 另記但不比：牌桌鏡頭有待機微擺（camera-director），同一版連讀兩次也不同（見輸出的 selfDiff）。
// 用法：node tests/tools/north-camera-probe.mjs [--nights 1,3,4,7] [--out <json>]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NIGHTS = arg('--nights', '1,3,4,7').split(',').map(Number);
const OUT = arg('--out', path.join(ROOT, 'docs/experiments/2026-09-25-visual-polish/north-camera.json'));
const BASE = arg('--base', 'e29a753');
const PORT = Number(arg('--port', 9655));
const VP = { V1: [852, 393, [0, 59, 21, 59]], V2: [932, 430, [0, 59, 21, 59]], V3: [844, 390, [0, 47, 21, 47]], V4: [667, 375, [0, 0, 0, 0]] };
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.m4a': 'audio/mp4' };
const cache = new Map();
const fromBase = (p) => { if (!cache.has(p)) { let b = null; try { b = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} cache.set(p, b); } return cache.get(p); };

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const READ = () => {
  const Y = window.__yaoshi3d, c = Y && Y.camera;
  const rect = (s) => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map((v) => +v.toFixed(3)); };
  const r6 = (v) => (typeof v === 'number' ? +v.toFixed(6) : v);
  const deep = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? r6(v) : v)));
  return {
    felt: rect('#felt'), feltHead: rect('#feltHead'), helpBtn: rect('#helpBtn'), skipbtn: rect('#skipbtn'), revealCard: rect('#revealCard'), north: rect('#north'),
    framing: Y ? deep(Y.framing) : null,
    cam: c ? { fov: r6(c.fov), aspect: r6(c.aspect), view: c.view ? deep(c.view) : null } : null,
    pose: c ? { p: c.position.toArray().map(r6), q: c.quaternion.toArray().map(r6) } : null,
  };
};

async function run(useBase) {
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  if (useBase) await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => { const u = new URL(route.request().url()); const p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname); const b = fromBase(p); return b ? route.fulfill({ status: 200, body: b, contentType: CT[path.extname(p)] || 'application/octet-stream' }) : route.continue(); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction('typeof window.__yaoshi==="object"');
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate(() => startEntry('solo')); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click()); await page.waitForTimeout(100);
  await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
  await page.waitForFunction('!!window.__yaoshi3d', null, { timeout: 180000 });
  const setVP = async (v) => { const [w, h, s] = VP[v]; await page.setViewportSize({ width: w, height: h }); await page.evaluate((s) => { let e = document.getElementById('__s'); if (!e) { e = document.createElement('style'); e.id = '__s'; document.head.appendChild(e); } e.textContent = `:root{--safe-top:${s[0]}px!important;--safe-right:${s[1]}px!important;--safe-bottom:${s[2]}px!important;--safe-left:${s[3]}px!important}`; }, s); await page.waitForTimeout(1200); };
  const res = {}, done = new Set();
  for (let i = 0; i < 8000 && done.size < NIGHTS.length; i++) {
    await page.waitForTimeout(10);
    const st = await page.evaluate(() => { const m = document.getElementById('mainbtn'); return { t: m.textContent, d: m.disabled, r: window.__yaoshi.S.round }; });
    if (/^蓋牌/.test(st.t) && !st.d && NIGHTS.includes(st.r) && !done.has(st.r)) {
      done.add(st.r);
      for (const v of Object.keys(VP)) {
        await setVP(v);
        const a = await page.evaluate(READ); await page.waitForTimeout(300); const b = await page.evaluate(READ);
        res[`n${st.r}@${v}`] = { ...a, selfPoseSame: JSON.stringify(a.pose) === JSON.stringify(b.pose) };
        if (!useBase) { /* 展開面板時再讀一次：取景輸入不得因展開而變 */
          await page.evaluate(() => { const x = document.querySelector('#north .nsum'); if (x) x.click(); }); await page.waitForTimeout(600);
          res[`n${st.r}@${v}:open`] = await page.evaluate(READ);
          await page.evaluate(() => toggleNorth(false)); await page.waitForTimeout(300);
        }
      }
      await setVP('V1');
    }
    await page.evaluate(() => { const b = document.getElementById('mainbtn'); if (b && !b.disabled) { b.click(); return; }
      const m = document.getElementById('modal'); if (m && getComputedStyle(m).display !== 'none') { const k = document.getElementById('titheKeep'); if (k) { k.click(); return; } const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return; } }
      const els = [...document.querySelectorAll('#stage button')]; const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled); if (sb) sb.click(); });
  }
  await ctx.close();
  return { res, errs };
}

let base, head;
try { base = await run(true); head = await run(false); } finally { await browser.close(); srv.kill(); }
const CMP = ['felt', 'feltHead', 'helpBtn', 'skipbtn', 'revealCard', 'framing', 'cam'];
const rows = [];
for (const k of Object.keys(base.res)) {
  const b = base.res[k], h = head.res[k], o = head.res[k + ':open'];
  if (!h) { rows.push({ k, missing: true }); continue; }
  const diff = CMP.filter((f) => JSON.stringify(b[f]) !== JSON.stringify(h[f]));
  const diffOpen = o ? CMP.filter((f) => JSON.stringify(h[f]) !== JSON.stringify(o[f])) : ['noOpen'];
  rows.push({ k, equal: diff.length === 0, diff, openEqual: diffOpen.length === 0, diffOpen, northH: [b.north && b.north[3], h.north && h.north[3]], basePoseStill: b.selfPoseSame, headPoseStill: h.selfPoseSame });
}
const out = { base: BASE, nights: NIGHTS, compared: CMP, rows, errs: { base: base.errs, head: head.errs }, raw: { base: base.res, head: head.res } };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify({ cells: rows.length, equal: rows.filter((r) => r.equal).length, openEqual: rows.filter((r) => r.openEqual).length, missing: rows.filter((r) => r.missing).length, diffs: rows.filter((r) => !r.equal || !r.openEqual), errs: out.errs }, null, 1));
