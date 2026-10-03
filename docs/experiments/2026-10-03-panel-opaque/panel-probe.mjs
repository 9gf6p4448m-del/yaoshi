// 北列展開面板驗收治具（凍結 docs/experiments/2026-10-03-panel-opaque/acceptance.md #1 #3 #4）
// 用法：node docs/experiments/2026-10-03-panel-opaque/panel-probe.mjs [--base <sha>] [--tag name]
// --base：index.html／assets 以 git show <sha>:<path> 供應（量基準）。輸出 JSON 到 out/<tag>.json，截圖到 out/<tag>-*.png
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', null), TAG = arg('--tag', BASE ? 'base-' + BASE : 'head'), SEED = 3, PORT = 9652;
const OUT = path.join(ROOT, 'docs/experiments/2026-10-03-panel-opaque/out'); fs.mkdirSync(OUT, { recursive: true });
const VPS = { 'V3-844x390': { w: 844, h: 390, safe: [0, 47, 21, 47] }, 'V1-852x393-iphone': { w: 852, h: 393, safe: [0, 59, 21, 59] } };
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const cache = new Map();
const fromBase = (p) => { if (!cache.has(p)) { let b = null; try { b = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} cache.set(p, b); } return cache.get(p); };
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const R = { tag: TAG, base: BASE, states: [], pass: true };
const LIB = `window.__pp = {
  sample(sel){
    const p = document.querySelector(sel); if (!p) return { err: 'no panel ' + sel };
    const cs = getComputedStyle(p); if (cs.display === 'none') return { err: 'hidden ' + sel };
    const r = p.getBoundingClientRect(); let n = 0, ok = 0; const bad = {};
    for (let y = r.top + 2; y < r.bottom - 2; y += 4) for (let x = r.left + 2; x < r.right - 2; x += 4) {
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      n++; const t = document.elementsFromPoint(x, y)[0];
      if (t && p.contains(t)) ok++; else { const k = t ? (t.id ? '#' + t.id : t.tagName + '.' + String(t.className).slice(0, 30)) : 'null'; bad[k] = (bad[k] || 0) + 1; }
    }
    const m = cs.backgroundColor.match(/[\\d.]+/g).map(Number); const alpha = m.length > 3 ? m[3] : 1;
    return { sel, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), n, ok, frac: n ? ok / n : 0, alpha, bg: cs.backgroundColor, z: cs.zIndex, bad };
  },
  btn(){ const b = document.getElementById('mainbtn'); const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { text: b.textContent.trim().slice(0, 12), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), topIsBtn: !!t && b.contains(t), top: t ? (t.id || t.tagName) : null }; },
  nopen(){ return document.getElementById('north').classList.contains('nopen'); },
  overlap(a, b){ const A = document.querySelector(a).getBoundingClientRect(), B = document.querySelector(b).getBoundingClientRect(); return !(A.right <= B.left || A.left >= B.right || A.bottom <= B.top || A.top >= B.bottom); }
};`;
async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => { let v = null; try { v = JSON.parse(localStorage.getItem('__lfSafe')); } catch (e) {} if (!v) return;
      const s = document.createElement('style'); s.id = '__lfSafe'; s.textContent = `:root{--safe-top:${v[0]}px!important;--safe-right:${v[1]}px!important;--safe-bottom:${v[2]}px!important;--safe-left:${v[3]}px!important}`; document.head.appendChild(s); }); });
  await ctx.addInitScript(LIB);
  if (BASE) await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => {
    const u = new URL(route.request().url()); const raw = decodeURIComponent(u.pathname), p = raw === '/' ? '/index.html' : raw; const buf = fromBase(p);
    if (buf) return route.fulfill({ status: 200, body: buf, contentType: CT[path.extname(p)] || 'application/octet-stream' }); return route.continue(); });
  return ctx;
}
async function setVP(page, v) {
  await page.setViewportSize({ width: v.w, height: v.h });
  await page.evaluate(([t, r, b, l]) => { try { localStorage.setItem('__lfSafe', JSON.stringify([t, r, b, l])); } catch (e) {}
    let s = document.getElementById('__lfSafe'); if (!s) { s = document.createElement('style'); s.id = '__lfSafe'; document.head.appendChild(s); }
    s.textContent = `:root{--safe-top:${t}px!important;--safe-right:${r}px!important;--safe-bottom:${b}px!important;--safe-left:${l}px!important}`; }, v.safe);
  await page.waitForTimeout(400);
}
const phase = (page) => page.evaluate(() => { const t = document.getElementById('mainbtn').textContent; const dis = document.getElementById('mainbtn').disabled;
  if (/不盯任何一件/.test(t)) return 'mark'; if (/^蓋牌/.test(t) && !dis) return 'bid'; return 'other:' + t.slice(0, 10); });
const ctx = await newCtx(); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__pp', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate(() => document.querySelector('#titleScr .btns button').click());
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard')[0].click()); await page.waitForTimeout(100);
  await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(SEL.mode, sd, SEL.picks); }, SEED);
  await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
  let ph = '';
  for (let i = 0; i < 40; i++) { ph = await phase(page); if (ph === 'bid') break;
    if (ph === 'mark') await page.evaluate(() => document.getElementById('mainbtn').click()); await page.waitForTimeout(250); }
  const closeM = async () => { const t = await page.evaluate(() => { const m = document.getElementById('modal'); if (m && getComputedStyle(m).display !== 'none') { const t = m.innerText.slice(0, 30); closeModal(); return t; } return null; }); if (t) (R.closedModals ||= []).push(t); await page.waitForTimeout(150); };
  await closeM();
  R.reachedPhase = ph; if (ph !== 'bid') { R.pass = false; throw new Error('沒走到出價階段：' + ph); }
  for (const [vn, v] of Object.entries(VPS)) {
    await setVP(page, v); await closeM(); await page.evaluate(() => toggleNorth(false)); await page.waitForTimeout(150);
    const st0 = await page.addStyleTag({ content: 'canvas{visibility:hidden!important}' });
    const nr = await page.evaluate(() => { const r = document.getElementById('north').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    await page.screenshot({ path: path.join(OUT, `${TAG}-${vn}-collapsed.png`), clip: nr, animations: 'disabled' });
    R.peek ||= {}; R.peek[vn] = await page.evaluate((nr) => [[140,52],[590,52],[470,10],[470,45]].map(([x,y]) => document.elementsFromPoint(nr.x + x, nr.y + y).slice(0,4).map(e => (e.id ? '#' + e.id : e.tagName) + '.' + String(e.className).slice(0,25))), nr);
    await page.evaluate((e) => e.remove(), st0);
    const states = [['click-left', async () => page.click('#northPrev .nsum')], ['click-right', async () => page.click('#northShr .nsum')], ['both', async () => page.evaluate(() => toggleNorth(true))]];
    for (const [sn, act] of states) {
      await closeM(); await page.evaluate(() => toggleNorth(false)); await page.waitForTimeout(100); await act(); await page.waitForTimeout(200);
      const st = { vp: vn, state: sn, open: await page.evaluate(() => window.__pp.nopen()) };
      st.left = await page.evaluate(() => window.__pp.sample('#northPrev .nfull')); st.right = await page.evaluate(() => window.__pp.sample('#northShr .nfull'));
      st.btn = await page.evaluate(() => window.__pp.btn());
      st.btnOverlapsPanel = { left: await page.evaluate(() => window.__pp.overlap('#mainbtn', '#northPrev .nfull')), right: await page.evaluate(() => window.__pp.overlap('#mainbtn', '#northShr .nfull')) };
      await page.screenshot({ path: path.join(OUT, `${TAG}-${vn}-${sn}.png`) });
      const okP = (s) => !s.err && s.frac >= 0.95 && s.alpha >= 0.9;
      st.pass = st.open && okP(st.left) && okP(st.right) && st.btn.topIsBtn; if (!st.pass) R.pass = false; R.states.push(st);
      const c = st.left.rect; await page.mouse.click(c[0] + 3, c[1] + 3); await closeM(); await page.waitForTimeout(150);
      st.collapseByPanelClick = !(await page.evaluate(() => window.__pp.nopen()));
      if (!st.collapseByPanelClick) R.pass = false;
      if (sn !== 'both') { await page.evaluate(() => { window.__clk = []; document.addEventListener('click', (e) => window.__clk.push((e.target.id || e.target.className || e.target.tagName) + '@' + e.clientX + ',' + e.clientY), true); }); st.fp = await page.evaluate((q) => { const e = document.querySelector(q); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2), t ? (t.id || t.className || t.tagName) : null]; }, sn === 'click-left' ? '#northPrev .nsum' : '#northShr .nsum'); st.pre = await page.evaluate(() => window.__pp.nopen()); await page.waitForTimeout(700); await act(); await page.waitForTimeout(300); st.mid = await page.evaluate(() => window.__pp.nopen()); st.clk = await page.evaluate(() => window.__clk); const was = await page.evaluate(() => window.__pp.nopen());
        await page.click(sn === 'click-left' ? '#northPrev .nsum' : '#northShr .nsum'); await page.waitForTimeout(150);
        st.sumDbg = { was, after: await page.evaluate(() => window.__pp.nopen()) }; st.collapseBySumClick = was && !(await page.evaluate(() => window.__pp.nopen())); if (!st.collapseBySumClick) R.pass = false; }
      await page.evaluate(() => toggleNorth(false));
    }
  }
} finally { R.pageErrors = errs; await ctx.close(); await browser.close(); srv.kill(); }
fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(R, null, 1));
const f3 = (x) => (x == null ? x : +x.toFixed(3));
for (const s of R.states) console.log(s.vp, s.state, 'open=' + s.open, 'L', JSON.stringify({ f: f3(s.left.frac), a: s.left.alpha, bad: s.left.bad }), 'R', JSON.stringify({ f: f3(s.right.frac), a: s.right.alpha, bad: s.right.bad }), 'btnTop=' + s.btn.topIsBtn, 'collapsePanel=' + s.collapseByPanelClick, 'collapseSum=' + s.collapseBySumClick, s.pass ? 'PASS' : 'FAIL');
console.log(TAG, R.pass ? 'ALL-PASS' : 'RED', 'errs=' + R.pageErrors.length);
