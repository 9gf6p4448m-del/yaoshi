// 信物小動作「肉眼看得出」驗收（凍結檔 docs/experiments/2026-10-11-acceptance-props-micro.md 修訂 4）：
// V-bead（珠位移 ≥4 CSS px）、V-smoke（煙螢幕包圍盒高 ≥14 CSS px）、V-smoke-alpha（峰值不透明度 ≥0.6）、
// M6′（動作窗內子 Mesh 不與 UI 矩形、別席信物、3D 拍品相交）。844×390、DPR 2、真頁面、單一 chromium。
// 四席角色輪轉 4 次，使每種角色都輪到每個座位；每次取樣一整個 6 秒週期。
// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試（須紅在行為斷言）。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_MICRO_PORT || 9763);
const BASE_ROLES = ['dangpu', 'shoujing', 'luzhu', 'zutou'];
const SAMPLE_MS = Number(process.env.YAOSHI_MICRO_MS || 6600);

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

/** 頁內探針：一次回傳 beads 位移、煙的螢幕包圍盒高與不透明度、以及 M6′ 需要的所有螢幕矩形（CSS px）。 */
const PROBE = `((rolesOfSeat) => {
  const Y = window.__yaoshi3d, cam = Y.camera, V = cam.position.constructor;
  const P = (v, mw) => { const t = v.clone().applyMatrix4(mw).project(cam); return [(t.x + 1) / 2 * innerWidth, (1 - t.y) / 2 * innerHeight]; };
  const shown = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
  const box = (o) => { o.updateWorldMatrix(true, false); const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) { const q = new V(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z); const p = P(q, o.matrixWorld); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return { x0, y0, x1, y1 }; };
  const out = { beads: [], smoke: [], micro: [], relics: [], lots: [] };
  Y.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (o.name.startsWith('relic-micro-')) {
      if (!shown(o)) return;
      const seat = Number(o.name.split('-')[2]), b = box(o);
      out.micro.push({ name: o.name, seat, ...b });
      if (/beads-[ab]$/.test(o.name)) {
        const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox;
        const c = new V((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
        const cur = c.clone().add(o.position), rest = c.clone().add(new V(0, o.position.y, o.position.z));
        const a = P(cur, o.parent.matrixWorld), r = P(rest, o.parent.matrixWorld);
        out.beads.push({ name: o.name, seat, d: Math.hypot(a[0] - r[0], a[1] - r[1]) });
      } else if (o.name.endsWith('-smoke')) out.smoke.push({ name: o.name, seat, h: b.y1 - b.y0, op: o.material.opacity });
    } else if (o.name.startsWith('relic-') && shown(o)) {
      const role = o.name.slice(6), seat = rolesOfSeat.indexOf(role);
      out.relics.push({ name: o.name, seat, ...box(o) });
    }
  });
  for (const root of Y.tray.lotNodes()) { root.updateWorldMatrix(true, true); root.traverse((o) => { if (o.isMesh && o.geometry && shown(o)) out.lots.push({ name: root.name || 'lot', ...box(o) }); }); }
  return out;
})`;

/** UI 矩形：可見的 button、有底色或邊框的元素，面積 < 視窗 35%（與凍結檔修訂 4、shoot.mjs 的 domRects 同一個挑法）。 */
const DOMRECTS = `(() => { const r = []; for (const e of document.querySelectorAll('body *')) { if (e.tagName === 'CANVAS' || e.tagName === 'SCRIPT' || e.tagName === 'STYLE') continue; const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue; const b = e.getBoundingClientRect(); if (b.width < 8 || b.height < 8) continue; if (b.width * b.height > innerWidth * innerHeight * 0.35) continue; const bg = s.backgroundColor, hasBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'; const bord = parseFloat(s.borderTopWidth) > 0; if (!(e.tagName === 'BUTTON' || hasBg || bord)) continue; r.push({ k: (e.id || String(e.className) || e.tagName).slice(0, 40), x0: b.left, y0: b.top, x1: b.right, y1: b.bottom }); } return r; })()`;

const hit = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0;

async function measure() {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  for (let i = 0; i < 75; i++) {
    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (ok) break; await new Promise((r) => setTimeout(r, 200));
  }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const runs = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 30000 });
    await page.waitForFunction('!!window.__yaoshi3d && !!window.__yaoshi3d.tray', { timeout: 30000 });
    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    for (let i = 0; i < 600; i++) {
      const st = await page.evaluate(`(() => { const b=document.getElementById('mainbtn'); const S=window.__yaoshi.S; return { t:b?b.textContent:'', d:b?b.disabled:true, r:S?S.round:0 }; })()`);
      if (st.r === 1 && /不盯任何一件/.test(st.t) && !st.d) break;
      if (!st.d) await page.click('#mainbtn').catch(() => {}); else await page.evaluate(`(() => { const e=[...document.querySelectorAll('#stage button')].find(x=>!x.disabled); if(e)e.click(); })()`);
      await page.waitForTimeout(14);
    }
    await page.evaluate(`(async () => { const t=window.__yaoshi3d.tray; if(t&&t.loaded) await t.loaded(); })()`);
    await page.waitForTimeout(500);
    const rects = await page.evaluate(DOMRECTS);
    for (let rot = 0; rot < 4; rot++) {
      const roles = BASE_ROLES.map((_, i) => BASE_ROLES[(i + rot) % 4]);
      await page.evaluate((rs) => { window.__yaoshi3d.tray.props.setSeats(rs.map((role, id) => ({ id, role }))); }, roles);
      await page.waitForTimeout(300);
      const best = { beads: {}, smoke: {}, viol: [], samples: 0, detail: {} };
      const t0 = Date.now();
      while (Date.now() - t0 < SAMPLE_MS) {
        const v = await page.evaluate(`(${PROBE})(${JSON.stringify(roles)})`); best.samples++;
        for (const b of v.beads) best.beads[b.name + '@' + b.seat] = Math.max(best.beads[b.name + '@' + b.seat] || 0, b.d);
        for (const s of v.smoke) { const k = s.name + '@' + roles[s.seat]; const e = best.smoke[k] || (best.smoke[k] = { h: 0, op: 0 }); e.h = Math.max(e.h, s.h); e.op = Math.max(e.op, s.op); }
        for (const m of v.micro) {
          for (const r of rects) if (hit(m, r)) { best.viol.push(`${m.name} × UI ${r.k}`); best.detail[`${m.name}|${r.k}`] = { m: [m.x0, m.y0, m.x1, m.y1].map(Math.round), ui: [r.x0, r.y0, r.x1, r.y1].map(Math.round), parent: v.relics.filter((q) => q.seat === m.seat).map((q) => [q.name, q.x0, q.y0, q.x1, q.y1].map((z) => typeof z === 'number' ? Math.round(z) : z)) }; }
          for (const q of v.relics) if (q.seat !== m.seat && hit(m, q)) best.viol.push(`${m.name} × 別席信物 ${q.name}`);
          for (const l of v.lots) if (hit(m, l)) best.viol.push(`${m.name} × 3D 拍品`);
        }
        await page.waitForTimeout(25);
      }
      runs.push({ roles, ...best });
    }
  } finally { await browser.close(); srv.kill(); }
  return runs;
}

const runs = await measure();
const uniq = (a) => [...new Set(a)];

test('V-bead 算盤動作窗內兩排珠子各自螢幕位移 ≥4 CSS px（四個座位各量）', () => {
  const rows = runs.flatMap((r) => Object.entries(r.beads));
  assert.ok(rows.length >= 8, '量不到 4 席 × 2 排珠子（前提不成立）：' + JSON.stringify(rows));
  for (const [k, d] of rows) assert.ok(d >= 4, `${k} 位移 ${d.toFixed(2)}px < 4`);
});

test('V-smoke 煙在動作窗內螢幕包圍盒高度最大值 ≥14 CSS px（收驚婆、爐主各在四個座位量）', () => {
  const rows = runs.flatMap((r) => Object.entries(r.smoke));
  assert.ok(rows.length >= 8, '量不到 2 種煙 × 4 席（前提不成立）：' + JSON.stringify(rows));
  for (const [k, e] of rows) assert.ok(e.h >= 14, `${k} 煙高 ${e.h.toFixed(2)}px < 14`);
});

test('V-smoke-alpha 真頁面煙峰值不透明度 ≥0.6', () => {
  const rows = runs.flatMap((r) => Object.entries(r.smoke));
  assert.ok(rows.length >= 8);
  for (const [k, e] of rows) assert.ok(e.op >= 0.6, `${k} 峰值不透明度 ${e.op.toFixed(3)} < 0.6`);
});

test('M6′ 動作窗內子 Mesh 螢幕包圍盒不與 UI 矩形／別席信物／3D 拍品相交', () => {
  const samples = runs.reduce((n, r) => n + r.samples, 0);
  assert.ok(samples > 100, '取樣太少 ' + samples);
  const bad = uniq(runs.flatMap((r) => r.viol));
  assert.equal(bad.length, 0, '相交：' + bad.slice(0, 12).join('；'));
});

if (process.env.YAOSHI_MICRO_DUMP) (await import('node:fs')).writeFileSync(process.env.YAOSHI_MICRO_DUMP, JSON.stringify(runs, null, 1));
