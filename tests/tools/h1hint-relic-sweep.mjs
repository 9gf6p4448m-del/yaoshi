// v0.66.0 整合修訂 1（docs/experiments/2026-10-12-release-066/acceptance.md 條⑧）：#h1hint × 全部信物本體／動作子 Mesh 外框交集。
// 三尺寸 × 夜 1 盯上／出價 × {種子 3 自然排列、BASE 四席輪轉 4 次（各取樣 6.6 秒）、全角色 10 組靜止排列}。
// 現行樣式（cur）對信物、3D 拍品、座位卡、主鈕任一交集 >0 ⇒ exit 1。
// 用法：node tests/tools/h1hint-relic-sweep.mjs <served root> <out.json> [variantsJson]
// variants：{名稱: 額外 CSS（套在 #h1hint 上）}；"cur" 永遠是現行樣式。每次取樣對每個 variant 量一次提示外框。
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const [ROOT, OUT, VJ] = process.argv.slice(2);
const VARIANTS = { cur: '', ...(VJ ? JSON.parse(fs.readFileSync(VJ, 'utf8')) : {}) };
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const lib = await import('file:///' + path.join(ROOT, 'tests/tools/appraise-c-lib.mjs').replace(/\\/g, '/'));
const PORT = 9768;
const SIZES = { A: [844, 390], B: [667, 375], C: [932, 430] };
const BASE = ['dangpu', 'shoujing', 'luzhu', 'zutou'];
const SAMPLE_MS = 6600;
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 75; i++) { if (await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false)) break; await new Promise((r) => setTimeout(r, 200)); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });

const PROBE = async (variants) => {
  const THREE = await import('three'); const Y = window.__yaoshi3d; const g = Y.scene.getObjectByName('table-props');
  const W = innerWidth, H = innerHeight, boxes = [];
  g.updateMatrixWorld(true);
  g.traverse((o) => { if (!(o.isMesh || o.isInstancedMesh)) return; for (let p = o; p; p = p.parent) if (!p.visible) return;
    const nm = o.name || (o.parent && o.parent.name) || o.type; if (nm === 'prop-contact-shadows') return;
    const box = new THREE.Box3().setFromObject(o); if (box.isEmpty()) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const t = new THREE.Vector3();
    for (let i = 0; i < 8; i++) { t.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(Y.camera); const px = (t.x * .5 + .5) * W, py = (1 - (t.y * .5 + .5)) * H; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
    boxes.push({ name: nm, l: x0, t: y0, r: x1, b: y1 }); });
  const n = window.__yaoshi.S.market.length, lots = [];
  for (let i = 0; i < n; i++) { const b = Y.tray.bboxScreen(i); if (b) lots.push({ name: 'lot' + i, l: b.left, t: b.top, r: b.right, b: b.bottom }); }
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const fixed = ['westSeat', 'northSeat', 'eastSeat', 'mainbtn'].map((id) => document.getElementById(id)).filter(Boolean).map((e) => ({ name: e.id, ...R(e) }));
  const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const h = document.getElementById('h1hint'); const out = {};
  let st = document.getElementById('__hv'); if (!st) { st = document.createElement('style'); st.id = '__hv'; document.head.appendChild(st); }
  for (const [k, css] of Object.entries(variants)) {
    st.textContent = css ? `#felt.hollow #h1hint.on{${css}}` : '';
    const hr = R(h); const vis = getComputedStyle(h).display !== 'none' && hr.r > hr.l;
    out[k] = { hint: hr, vis, props: boxes.map((b) => [b.name, inter(hr, b)]).filter((x) => x[1] > 0), lots: lots.map((b) => [b.name, inter(hr, b)]).filter((x) => x[1] > 0), fixed: fixed.map((b) => [b.name, inter(hr, b)]).filter((x) => x[1] > 0) };
  }
  st.textContent = '';
  return out;
};

const res = {};
try {
  for (const [key, size] of Object.entries(SIZES)) {
    for (const phase of ['mark', 'bid']) {
      const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1, hasTouch: true });
      await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/index.html`);
      await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 3, ['qingmian']); });
      await lib.driveToFirst(page, new Set(['mark']), 6000);
      if (phase === 'bid') { await page.evaluate(() => pickMark(null)); for (let i = 0; i < 300 && (await lib.scr(page)) !== 'bid'; i++) await page.waitForTimeout(20); }
      await lib.waitTrayReady(page); await lib.waitSettled(page); await page.waitForTimeout(1000);
      const roleIds = await page.evaluate(() => Object.keys(window.__yaoshi.ROLES));
      const natural = await page.evaluate(() => window.__yaoshi.S.players.map((p) => p.role || p.id));
      const layouts = [{ tag: 'natural', roles: null, sample: true }];
      for (let r = 0; r < 4; r++) layouts.push({ tag: 'base' + r, roles: BASE.map((_, i) => BASE[(i + r) % 4]), sample: true });
      for (let k = 0; k < roleIds.length; k++) layouts.push({ tag: 'all' + k, roles: [0, 1, 2, 3].map((i) => roleIds[(k + i) % roleIds.length]), sample: false });
      const rows = [];
      for (const L of layouts) {
        if (L.roles) { await page.evaluate((rs) => window.__yaoshi3d.tray.props.setSeats(rs.map((role, id) => ({ id, role }))), L.roles); await page.waitForTimeout(300); }
        const agg = {}; let samples = 0; const t0 = Date.now();
        do {
          const m = await page.evaluate(PROBE, VARIANTS); samples++;
          for (const [k, v] of Object.entries(m)) {
            const a = agg[k] || (agg[k] = { hint: v.hint, vis: v.vis, props: {}, lots: {}, fixed: {} });
            for (const grp of ['props', 'lots', 'fixed']) for (const [n, ar] of v[grp]) a[grp][n] = Math.max(a[grp][n] || 0, ar);
          }
          if (!L.sample) break;
          await page.waitForTimeout(25);
        } while (Date.now() - t0 < SAMPLE_MS);
        rows.push({ tag: L.tag, roles: L.roles || natural, samples, agg });
      }
      res[key + '-' + phase] = rows;
      console.log(key, phase, 'layouts', rows.length, 'cur hits:', JSON.stringify(rows.flatMap((r) => Object.entries(r.agg.cur.props).map(([n, a]) => `${r.tag}:${n}=${a.toFixed(1)}`))));
      await ctx.close();
    }
  }
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));

const bad = Object.entries(res).flatMap(([k, rows]) => rows.flatMap((r) => ['props', 'lots', 'fixed'].flatMap((g) => Object.entries(r.agg.cur[g]).map(([n, a]) => `${k}/${r.tag}:${n}=${a.toFixed(2)}`))));
const vis = Object.entries(res).filter(([, rows]) => !rows[0].agg.cur.vis).map(([k]) => k);
console.log(JSON.stringify({ hits: bad.length, sample: bad.slice(0, 12), hintInvisible: vis }));
if (bad.length || vis.length) process.exit(1);
