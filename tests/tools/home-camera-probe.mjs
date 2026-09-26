// 首頁機位與聚光（凍結 docs/experiments/2026-09-26-acceptance-visual-polish-p2.md #7(b)(c)）
// 基準（--base，git show 供檔）與工作樹各跑一次：
//   首頁：相機位置／朝向（視線方向）／fov、場景燈光清單、光池（home-pool）狀態、首頁每幀 draw calls（renderer.info，只記錄）
//   牌桌（solo seed 3 第 1 夜出價頁，V1）：同一組相機與燈光欄位。
// 判定：(b) 改後首頁相機 ≠ 改後牌桌相機；改後牌桌相機 fov／aspect／view 與基準逐值相同（位置另記——牌桌鏡頭有待機微擺時照列）
//       (c) 改後牌桌燈光清單與靜態參數（型別、色、位置、distance、decay、angle、penumbra、基準亮度）與基準逐值相同；光池在牌桌不可見
// 用法：node tests/tools/home-camera-probe.mjs [--base 14ac1f2] [--out <json>] [--port 9661]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', '14ac1f2');
const OUT = arg('--out', null);
const PORT = Number(arg('--port', 9661));
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.m4a': 'audio/mp4' };
const cache = new Map();
const fromBase = (p) => { if (!cache.has(p)) { let b = null; try { b = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} cache.set(p, b); } return cache.get(p); };
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

const READ = () => {
  const Y = window.__yaoshi3d, c = Y.camera, r6 = (v) => +v.toFixed(6);
  const dir = [0, 0, -1]; { const q = c.quaternion; const v = new c.position.constructor(0, 0, -1).applyQuaternion(q); dir[0] = r6(v.x); dir[1] = r6(v.y); dir[2] = r6(v.z); }
  const lights = []; Y.scene.traverse((o) => { if (o.isLight) lights.push({ type: o.type, name: o.name, color: o.color.getHexString(), ground: o.groundColor ? o.groundColor.getHexString() : null, pos: o.position.toArray().map(r6), distance: o.distance ?? null, decay: o.decay ?? null, angle: o.angle ?? null, penumbra: o.penumbra ?? null, base: o.userData && o.userData.baseIntensity != null ? o.userData.baseIntensity : null, visible: o.visible, parent: o.parent && o.parent.type }); });
  const pool = Y.scene.getObjectByName('home-pool');
  return { pos: c.position.toArray().map(r6), dir, fov: c.fov, aspect: r6(c.aspect), view: c.view ? JSON.parse(JSON.stringify(c.view)) : null, lights, pool: pool ? { visible: pool.visible, opacity: r6(pool.material.opacity) } : null, canvasOpacity: document.querySelector('canvas').style.opacity };
};
const drawCalls = async (page) => page.evaluate(() => new Promise((res) => { const r = window.__yaoshi3d.renderer; const out = []; let n = 0; const tick = () => { out.push(r.info.render.calls); if (++n < 30) requestAnimationFrame(tick); else res(out); }; requestAnimationFrame(tick); }));

async function run(useBase) {
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  if (useBase) await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => { const u = new URL(route.request().url()); const p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname); const b = fromBase(p); return b ? route.fulfill({ status: 200, body: b, contentType: CT[path.extname(p)] || 'application/octet-stream' }) : route.continue(); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction('!!window.__yaoshi3d', null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  const home = await page.evaluate(READ); home.drawCalls = await drawCalls(page);
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate(() => startEntry('solo')); await page.waitForTimeout(400);
  const select = await page.evaluate(READ);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click()); await page.waitForTimeout(100);
  await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
  let table = null;
  for (let i = 0; i < 8000 && !table; i++) {
    await page.waitForTimeout(10);
    const st = await page.evaluate(() => { const m = document.getElementById('mainbtn'); return { t: m.textContent, d: m.disabled, r: window.__yaoshi.S.round }; });
    if (/^蓋牌/.test(st.t) && !st.d && st.r === 1) { await page.waitForTimeout(1500); const a = await page.evaluate(READ); await page.waitForTimeout(300); const b = await page.evaluate(READ); table = { ...a, poseStill: JSON.stringify(a.pos) === JSON.stringify(b.pos) }; table.drawCalls = await drawCalls(page); break; }
    await page.evaluate(() => { const b = document.getElementById('mainbtn'); if (b && !b.disabled) { b.click(); return; } const els = [...document.querySelectorAll('#stage button')]; const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled); if (sb) sb.click(); });
  }
  await ctx.close();
  return { home, select, table, errs };
}

let base, head;
try { base = await run(true); head = await run(false); } finally { await browser.close(); srv.kill(); }
const J = (x) => JSON.stringify(x);
const lightKey = (l) => ({ ...l });
const out = {
  base: BASE,
  b_homeDiffersFromTable: { pos: J(head.home.pos) !== J(head.table.pos), dir: J(head.home.dir) !== J(head.table.dir), fov: head.home.fov !== head.table.fov },
  b_tableCameraEqualsBase: { fov: head.table.fov === base.table.fov, aspect: head.table.aspect === base.table.aspect, view: J(head.table.view) === J(base.table.view), pos: J(head.table.pos) === J(base.table.pos), dir: J(head.table.dir) === J(base.table.dir), basePoseStill: base.table.poseStill, headPoseStill: head.table.poseStill },
  b_selectCameraEqualsBaseTableShot: { pos: J(head.select.pos) === J(base.select.pos), dir: J(head.select.dir) === J(base.select.dir) },
  c_tableLightsEqualBase: J(head.table.lights.map(lightKey)) === J(base.table.lights.map(lightKey)),
  c_homeLightsEqualBase: J(head.home.lights.map(lightKey)) === J(base.home.lights.map(lightKey)),
  c_poolOnTable: head.table.pool, c_poolOnHome: head.home.pool,
  drawCallsPerFrame: { baseHome: base.home.drawCalls.slice(-5), headHome: head.home.drawCalls.slice(-5), baseTable: base.table.drawCalls.slice(-5), headTable: head.table.drawCalls.slice(-5) },
  errs: { base: base.errs, head: head.errs },
  raw: { base, head },
};
if (OUT) fs.writeFileSync(path.resolve(OUT), JSON.stringify(out, null, 1), 'utf8');
const { raw, ...brief } = out;
console.log(JSON.stringify(brief, null, 1));
