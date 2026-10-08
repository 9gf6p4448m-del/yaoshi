/* 南席拍令牌時「手遮住自己選的那件拍品」的螢幕面積（修前修後比較用）。
   跑法：node tests/tools/mark-south-occl.mjs [--vp=852x393] [--seat=0] [--out=<json>] [--root=<樹>]
   做法同 hands-occlusion.mjs（離屏兩趟：拍品純色有手／無手），只拍 --seat（預設南＝0）、槽 0..3 各一次；每 2 幀量一次，
   回報每槽「自己那件被手蓋掉的比例」最大值（百分比）與蓋掉的像素數。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = opt.root ? path.resolve(opt.root) : HERE;
const PORT = Number(opt.port || 8985);
const [VW, VH] = (opt.vp || '852x393').split('x').map(Number);
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const errors = [];
const SEAT = Number(opt.seat || 0);
let browser, result;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  await page.evaluate(async () => {
    const T = await import('three');
    const Y = window.__yaoshi3d; await Y.tray.loaded(); if (Y.tray.hands.ready) await Y.tray.hands.ready();
    Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear();
    /* 手動時鐘（同 table-framing-check）：renderer 的 frame() 從此只在 step() 時跑，每步 1/60 秒。 */
    const native = requestAnimationFrame.bind(window); await new Promise(native);
    const queue = []; let id = 0; window.requestAnimationFrame = (cb) => { queue.push(cb); return ++id; };
    await new Promise(native);
    const clock = { now: performance.now(), step() { const cbs = queue.splice(0); if (!cbs.length) throw new Error('rAF queue empty'); clock.now += 1000 / 60; for (const cb of cbs) cb(clock.now); } };
    const W = 426, H = 196, rt = new T.WebGLRenderTarget(W, H), buf = new Uint8Array(W * H * 4);
    const COLORS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1]];
    const itemMats = COLORS.map((c) => new T.MeshBasicMaterial({ color: new T.Color(c[0], c[1], c[2]), toneMapped: false, fog: false }));
    const visibleChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const itemRoots = () => Y.tray.group.children.filter((o) => !o.name && o.visible && o.isObject3D);
    const handMeshes = () => { const out = []; Y.tray.hands.group.children.forEach((h) => { if (h.visible) h.traverse((o) => { if (o.isSkinnedMesh) out.push(o); }); }); return out; };
    function measure() {
      const R = Y.renderer, scene = Y.scene, cam = Y.camera;
      const hands = handMeshes();
      const roots = itemRoots();
      const items = roots.map((r) => { const ms = []; r.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && visibleChain(o)) ms.push(o); }); return ms; });
      const saved = []; scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { saved.push([o, o.visible]); o.visible = false; } });
      const savedMat = []; items.forEach((ms, i) => ms.forEach((m) => { savedMat.push([m, m.material]); m.material = itemMats[i % 4]; m.visible = true; }));
      const bg = scene.background, cc = R.getClearColor(new T.Color()), ca = R.getClearAlpha();
      scene.background = null; R.setClearColor(0x000000, 1);
      const count = () => { R.setRenderTarget(rt); R.clear(); R.render(scene, cam); R.readRenderTargetPixels(rt, 0, 0, W, H, buf); const n = [0, 0, 0, 0]; let any = 0;
        for (let p = 0; p < W * H; p++) { const r = buf[p * 4], g = buf[p * 4 + 1], b = buf[p * 4 + 2]; if (r || g || b) any++;
          for (let k = 0; k < 4; k++) { const c = COLORS[k]; if ((c[0] ? r >= 250 : r <= 6) && (c[1] ? g >= 250 : g <= 6) && (c[2] ? b >= 250 : b <= 6)) { n[k]++; break; } } }
        return { n, any }; };
      hands.forEach((m) => { m.visible = true; });
      const withHands = count();
      hands.forEach((m) => { m.visible = false; });
      const without = count();
      /* 歸因：逐隻手各畫一趟（只有那一隻＋拍品），看是哪一席遮的 */
      const perHand = hands.map((m) => { m.visible = true; const c = count(); m.visible = false;
        return { hand: m.parent && m.parent.parent ? (m.parent.parent.name || m.parent.name) : '?', occl: without.n.map((a, i) => (a >= 40 ? +((a - c.n[i]) / a).toFixed(4) : null)) }; });
      items.forEach((ms) => ms.forEach((m) => { m.visible = false; }));
      const bright = new T.MeshBasicMaterial({ vertexColors: true, color: new T.Color(8, 8, 8), toneMapped: false, fog: false });
      const hm = hands.map((m) => [m, m.material]);
      hands.forEach((m) => { bright.alphaHash = !!m.material.alphaHash; bright.transparent = !!m.material.transparent; bright.alphaTest = m.material.alphaTest || 0; m.material = bright; m.visible = true; });
      const handOnly = count();
      hm.forEach(([m, mat]) => { m.material = mat; });
      bright.dispose();
      savedMat.forEach(([m, mat]) => { m.material = mat; });
      saved.forEach(([o, v]) => { o.visible = v; });
      scene.background = bg; R.setClearColor(cc, ca); R.setRenderTarget(null);
      const per = without.n.map((a, i) => (a >= 40 ? (a - withHands.n[i]) / a : null));
      return { hands: hands.length, items: roots.length, itemPx: without.n, occl: per, perHand, handShare: handOnly.any / (W * H) };
    }
    window.__ho = { clock, measure, ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })) };
  });

  const rows = [];
  for (let slot = 0; slot < 4; slot++) {
    await page.evaluate(() => { const Y = window.__yaoshi3d; Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear(); });
    await page.evaluate(({ seat, slot }) => window.__ho.ev('ys:mark', { seat, slot }), { seat: SEAT, slot });
    let maxOcc = 0, maxPx = 0, itemPx = 0, live = 0;
    for (let s = 1; s <= 70; s++) {
      const m = await page.evaluate(({ meas }) => { window.__ho.clock.step(); return meas ? window.__ho.measure() : null; }, { meas: s % 2 === 0 });
      if (!m || m.hands < 1) continue; live++;
      const o = m.occl[slot]; if (o === null) continue;
      itemPx = m.itemPx[slot]; if (o > maxOcc) maxOcc = o; maxPx = Math.max(maxPx, o * m.itemPx[slot]);
    }
    rows.push({ slot, occlPct: +(maxOcc * 100).toFixed(2), occlPx: Math.round(maxPx), itemPx, liveSamples: live });
  }
  result = { vp: opt.vp || '852x393', seat: SEAT, rows };
  console.log(JSON.stringify(result));
  if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(result, null, 1));
  if (errors.length) console.log('ERRORS', errors.slice(0, 5));
} finally { if (browser) await browser.close(); server.kill(); }
