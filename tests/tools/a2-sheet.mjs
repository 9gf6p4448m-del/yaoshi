/* A2 標竿治具（2026-09-17）：對一件標竿（POOL 的 ab key）一次產出「實際桌面大小」與「滿編 8v8」兩張真實頁面截圖
 * ＋硬指標 JSON；英雄視角／stage-lit 由 anyCreature 的 hero.mjs 與 creature-shoot.mjs 另拍，四張再用 a2-sheet.py 拼 contact sheet。
 * 方案變體不改產品碼：`--glb=<變體 glb>` 時建一個靜態覆蓋根（repo 目錄以 junction 接進去、assets/creatures 複製一份並把 <key>.glb 換成變體），
 * 遊戲照原本 `assets/creatures/<key>.glb` 路徑載入，看到的就是變體。
 * 跑法：node tests/tools/a2-sheet.mjs --key=boat --name=base [--glb=assets/creatures/boat_a.glb] --out=docs/experiments/2026-09-17-a2-boat [--port=8971]
 * 輸出：<out>/table-<name>.png、duel-<name>.png、metrics-<name>.json。這是截圖與計數證據，不是 fps 證據。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { pos, opt } = parseArgs(process.argv.slice(2));
const KNOWN = ['key', 'name', 'glb', 'out', 'port', 'fac'];
{ const bad = Object.keys(opt).filter((k) => !KNOWN.includes(k)); if (bad.length || pos.length) throw new Error(`a2-sheet 不吃：${bad.map((k) => '--' + k).concat(pos).join(' ')}`); }
const KEY = String(opt.key || ''), NAME = String(opt.name || 'base'), OUT = path.resolve(ROOT, String(opt.out || 'scratchpad/a2-sheet'));
if (!KEY) throw new Error('--key 必填（POOL 的 ab key，如 boat）');
if (path.relative(ROOT, OUT).startsWith('..')) throw new Error('--out must stay inside the repository');
const port = Number(opt.port || 8971);
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = (() => {
  for (const c of [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')]) { try { return createRequire(c)('playwright'); } catch { /* 下一個 */ } }
  throw new Error('找不到 playwright：worktree 需要 tools/anyCreature');
})();

/** 靜態覆蓋根：只把 assets/creatures 複製一份並換掉 <key>.glb，其餘目錄用 junction 指回 repo。 */
function buildOverlayRoot(glbPath) {
  const root = path.join(ROOT, 'scratchpad', `a2-root-${KEY}-${NAME}`);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  const junction = (target, link) => { const r = spawnSync('cmd', ['/c', 'mklink', '/J', link, target], { stdio: 'ignore' }); if (r.status !== 0) throw new Error(`mklink /J 失敗：${link}`); };
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (ent.name === 'assets' || ent.name === 'scratchpad' || ent.name === 'tools' || ent.name === 'node_modules' || ent.name.startsWith('.')) continue; // tools 在 worktree 是 junction、頁面也用不到
    if (ent.isDirectory() || (ent.isSymbolicLink() && fs.statSync(path.join(ROOT, ent.name)).isDirectory())) junction(path.join(ROOT, ent.name), path.join(root, ent.name));
    else fs.copyFileSync(path.join(ROOT, ent.name), path.join(root, ent.name));
  }
  for (const ent of fs.readdirSync(path.join(ROOT, 'assets'), { withFileTypes: true })) {
    if (ent.name === 'creatures') { fs.cpSync(path.join(ROOT, 'assets/creatures'), path.join(root, 'assets/creatures'), { recursive: true }); continue; }
    if (ent.isDirectory()) junction(path.join(ROOT, 'assets', ent.name), path.join(root, 'assets', ent.name));
    else fs.copyFileSync(path.join(ROOT, 'assets', ent.name), path.join(root, 'assets', ent.name));
  }
  fs.copyFileSync(path.resolve(ROOT, glbPath), path.join(root, 'assets/creatures', `${KEY}.glb`));
  return root;
}
const SRV_ROOT = opt.glb ? buildOverlayRoot(String(opt.glb)) : ROOT;

/** 頁面端：把一個 Object3D 子樹的所有 mesh 包圍盒投影成螢幕像素框（同 table-framing-check 的量法） */
const screenBox = (root) => {
  const s = window.__yaoshi3d, cam = s.camera; s.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
  const V = root.position.constructor; const p = new V(); const xs = [], ys = [];
  const visible = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  root.traverse((o) => {
    if (!visible(o) || !(o.isMesh || o.isSkinnedMesh) || !o.geometry) return;
    if (o.isSkinnedMesh) { o.skeleton?.update(); o.computeBoundingBox?.(); }
    const b = o.isSkinnedMesh ? (o.boundingBox || o.geometry.boundingBox) : (o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox));
    if (!b) return;
    for (const a of [b.min.x, b.max.x]) for (const bY of [b.min.y, b.max.y]) for (const c of [b.min.z, b.max.z]) { p.set(a, bY, c).applyMatrix4(o.matrixWorld).project(cam); xs.push((p.x + 1) / 2 * innerWidth); ys.push((1 - p.y) / 2 * innerHeight); }
  });
  if (!xs.length) return null;
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return { left: +left.toFixed(1), top: +top.toFixed(1), right: +right.toFixed(1), bottom: +bottom.toFixed(1), width: +(right - left).toFixed(1), height: +(bottom - top).toFixed(1) };
};

const srv = await serve(SRV_ROOT, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const metrics = { tool: 'tests/tools/a2-sheet.mjs', key: KEY, name: NAME, glb: opt.glb || `assets/creatures/${KEY}.glb`, viewport: [844, 390], deviceScaleFactor: 2, errors: [] };
try {
  // ── 情境 1：實際桌面大小（844×390 DPR2，四槽同件、hover slot1）──
  {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch {} });
    const page = await context.newPage();
    page.on('pageerror', (e) => metrics.errors.push('table pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error') metrics.errors.push('table console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__yaoshi3d', null, { timeout: 30000 });
    await page.evaluate(() => { CFG.T = 1; const fx = window.__yaoshi.PW_FX; for (const k of Object.keys(fx)) if (/_MS$/.test(k)) fx[k] = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    let reached = false;
    for (let i = 0; i < 400 && !reached; i++) {
      await page.waitForTimeout(12);
      const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { text: b?.textContent || '', disabled: !b || b.disabled, round: window.__yaoshi.S?.round || 0 }; });
      if (/蓋牌/.test(st.text) && !st.disabled && st.round === 1) { reached = true; break; }
      if (!st.disabled) await page.click('#mainbtn').catch(() => {}); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    }
    if (!reached) throw new Error('did not reach the seed-1 round-1 bid page');
    const fac = opt.fac || await page.evaluate((k) => (POOL.find((it) => (it.ab || it.m) === k) || {}).f || 'zuling', KEY);
    await page.evaluate(async ({ k, f }) => {
      const tray = window.__yaoshi3d.tray; await tray.setItems([]); await tray.loaded();
      window.fx3d('ys:market', { round: 10000, items: [0, 1, 2, 3].map(() => ({ key: k, fac: f, curse: false })) });
      await tray.loaded();
    }, { k: KEY, f: fac });
    await page.waitForTimeout(900);
    await page.evaluate((v) => window.__yaoshi3d.tray.setHover(v), 1);
    await page.waitForTimeout(900);
    metrics.table = await page.evaluate((fn) => {
      const s = window.__yaoshi3d, info = s.renderer.info; const screenBox = new Function('root', fn);
      info.autoReset = false; info.reset(); s.renderer.render(s.scene, s.camera); const calls = info.render.calls, tris = info.render.triangles; info.autoReset = true;
      const x = s.tray.slotXs()[1];
      const meshCount = (root) => { let n = 0; root.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && o.geometry) n++; }); return n; };
      const root = s.tray.group.children.filter((o) => o.isObject3D && o.visible && !o.name && meshCount(o)).reduce((best, o) => !best || Math.abs(o.position.x - x) < Math.abs(best.position.x - x) ? o : best, null);
      const felt = document.querySelector('#felt')?.getBoundingClientRect();
      return { calls, tris, hoverSlot: 1, items: s.tray.items().map((i) => ({ key: i.key, ready: i.ready, visible: i.visible, outlines: i.outlines })), subjectBox: root ? screenBox(root) : null, felt: felt && { left: felt.left, top: felt.top, right: felt.right, bottom: felt.bottom } };
    }, `return (${screenBox.toString()})(root);`);
    await page.screenshot({ path: path.join(OUT, `table-${NAME}.png`) });
    await context.close();
  }
  // ── 情境 2：滿編 8v8（A 側本件 ×3＋重型 5、B 側重型 8；同 duel-perf 的隔離作法）──
  {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
    await context.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch {} });
    const page = await context.newPage();
    let duel = null;
    const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
      duels: 2,
      onDuel: async (pg, n) => {
        if (n !== 2) return;
        duel = await pg.evaluate(async ({ k, fn }) => {
          const Y3 = window.__yaoshi3d; const screenBox = new Function('root', fn);
          const cur = window.__rec.duels[window.__rec.duels.length - 1];
          const FAC = { fushou: 'xianghuo', ashcharm: 'xianghuo', wangchuan: 'xianghuo', boartusk: 'zuling', shanshen: 'zuling', balen: 'zuling', yinyangcoin: 'yinqi', boat: 'zuling', canri: 'zuling', dashiye: 'xianghuo', youyinggong: 'yinqi', buoy: 'yinqi', redhat: 'yinqi', bell: 'xianghuo' };
          const poolItem = POOL.find((it) => (it.ab || it.m) === k) || {}; const fac = poolItem.f || FAC[k] || 'zuling'; const body = (poolItem.unit && poolItem.unit.body) || 'elite';
          const A = [k, k, k, 'fushou', 'ashcharm', 'boartusk', 'shanshen', 'wangchuan'].map((ab, i) => ({ id: i, body: ab === k ? body : 'elite', fac: ab === k ? fac : FAC[ab], ab }));
          const B = ['balen', 'yinyangcoin', 'boartusk', 'fushou', 'ashcharm', 'shanshen', 'wangchuan', 'buoy'].map((ab, i) => ({ id: i, body: ab === 'buoy' ? 'haunt' : 'elite', fac: FAC[ab], ab }));
          const det = { a: cur.a, b: cur.b, armies: [{ units: A }, { units: B }] };
          const origDispatch = document.dispatchEvent.bind(document);
          document.dispatchEvent = (ev) => (ev && /^ys:/.test(ev.type) && !ev.__a2 ? true : origDispatch(ev));
          const ev0 = new CustomEvent('ys:duel', { detail: det }); ev0.__a2 = true; origDispatch(ev0);
          await det.ready; await new Promise((res) => setTimeout(res, 700));
          origDispatch(Object.assign(new CustomEvent('ys:hitstop', { detail: { ms: 4000 } }), { __a2: true })); // 凍幀拍圖（同 duel-drive --traitshot）
          await new Promise((res) => setTimeout(res, 120));
          const info = Y3.renderer.info; info.autoReset = false; info.reset(); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
          const calls = info.render.calls, tris = info.render.triangles; info.autoReset = true; // 兩次 rAF 之間的和（同 duel-perf 的量法）
          const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B'));
          const targets = figs.filter((f) => f.ab === k).map((f) => ({ visible: f.group.visible, box: screenBox(f.group) }));
          return { drawCallsOver2Raf: calls, trianglesOver2Raf: tris, visible: figs.filter((f) => f.group.visible).length, total: figs.length, targets, camera: Y3.camera.position.toArray().map((v) => +v.toFixed(3)) };
        }, { k: KEY, fn: `return (${screenBox.toString()})(root);` });
        await pg.screenshot({ path: path.join(OUT, `duel-${NAME}.png`) });
        await pg.evaluate(() => { const ev = new CustomEvent('ys:hitstop', { detail: { ms: 0 } }); ev.__a2 = true; document.dispatchEvent(ev); });
      },
    });
    metrics.duel = duel; metrics.errors.push(...(r.errors || []).map((e) => 'duel ' + e));
    await context.close();
  }
} finally { await browser.close().catch(() => {}); srv.kill(); }
fs.writeFileSync(path.join(OUT, `metrics-${NAME}.json`), JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify({ out: OUT, name: NAME, table: metrics.table && { calls: metrics.table.calls, tris: metrics.table.tris, subjectBox: metrics.table.subjectBox, ready: metrics.table.items?.filter((i) => i.ready).length }, duel: metrics.duel && { drawsOver2Raf: metrics.duel.drawCallsOver2Raf, trisOver2Raf: metrics.duel.trianglesOver2Raf, visible: metrics.duel.visible, targets: metrics.duel.targets }, errors: metrics.errors }, null, 1));
