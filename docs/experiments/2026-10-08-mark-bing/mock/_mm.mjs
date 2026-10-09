import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
const OUT = process.argv[2], RUN = process.argv[3] || 'r1';
const VPS = (process.argv[4] || '844x390,932x430').split(','), VARS = ['cur', 'B', 'C'];
const SCENES = [
  { id: 's1a', marks: [[0, 0]], hands: false },
  { id: 's1b', marks: [[0, 1]], hands: false },
  { id: 's2', marks: [[0, 1], [2, 1], [3, 1]], hands: false },
  { id: 's3a', marks: [[0, 1]], hands: true, frame: 'hit' },
  { id: 's3b', marks: [[0, 1]], hands: true, frame: 'settled' },
];
const server = await serve(root, 8997);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const metrics = [];
async function measure(page, slot, W, H) {
  return page.evaluate(async ({ slot, W, H }) => {
    const THREE = await import('three');
    const Y = window.__yaoshi3d, { scene, camera, renderer } = Y;
    const slots = Y.tray.__mmSlots();
    const node = slots[slot].fig ? slots[slot].fig.group : slots[slot].pile.group;
    const tokens = Y.tray.props.group.children.find(c => c.name === 'prop-tokens');
    const renderables = []; scene.traverse(o => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) renderables.push([o, o.visible, o.material]); });
    const redM = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }), blueM = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    const figSet = new Set(); node.traverse(o => figSet.add(o));
    const rt = new THREE.WebGLRenderTarget(W, H);
    const prevBg = scene.background, prevFog = scene.fog, prevAC = renderer.autoClear, prevCC = renderer.getClearColor(new THREE.Color()), prevCA = renderer.getClearAlpha();
    const px = new Uint8Array(W * H * 4);
    const savedTokMat = tokens.material, savedTokVis = tokens.visible, savedTokIC = tokens.instanceColor;
    const pass = (showTok) => {
      for (const [o] of renderables) o.visible = false;
      for (const [o, vis] of renderables) { if (figSet.has(o)) { o.visible = vis; o.material = redM; } }
      tokens.visible = showTok && tokens.count > 0; tokens.material = blueM; tokens.instanceColor = null;
      scene.background = null; scene.fog = null; renderer.autoClear = true; renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
      renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      const red = new Uint8Array(W * H), blue = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4, j = y * W + x; if (px[i] > 128 && px[i + 2] < 64) red[j] = 1; if (px[i + 2] > 128 && px[i] < 64) blue[j] = 1; }
      return { red, blue };
    };
    let p0, p1;
    try { p0 = pass(false); p1 = pass(true); }
    finally {
      for (const [o, vis, m] of renderables) { o.visible = vis; o.material = m; }
      tokens.visible = savedTokVis; tokens.material = savedTokMat; tokens.instanceColor = savedTokIC;
      scene.background = prevBg; scene.fog = prevFog; renderer.autoClear = prevAC; renderer.setClearColor(prevCC, prevCA); rt.dispose();
    }
    let F0 = 0, F1 = 0, tokPx = 0;
    for (let k = 0; k < W * H; k++) { F0 += p0.red[k]; F1 += p1.red[k]; tokPx += p1.blue[k]; }
    const hulls = [];
    tokens.updateMatrixWorld(true);
    const bb = tokens.geometry.boundingBox || (tokens.geometry.computeBoundingBox(), tokens.geometry.boundingBox);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    for (let i = 0; i < tokens.count; i++) {
      tokens.getMatrixAt(i, m4); m4.premultiply(tokens.matrixWorld);
      const pts = [];
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) {
        v.set(x, y, z).applyMatrix4(m4).project(camera); pts.push([(v.x * .5 + .5) * W, (1 - (v.y * .5 + .5)) * H]);
      }
      pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], up = [];
      for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (const p of [...pts].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      hulls.push(lo.slice(0, -1).concat(up.slice(0, -1)));
    }
    // 凸包內判定：y 朝下的座標系下，凸包頂點順序固定同號，取全部邊同號為內
    const inside = (h, x, y) => { let pos = 0, neg = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; const c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (c > 0) pos++; else if (c < 0) neg++; } return pos === 0 || neg === 0; };
    let box = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p0.red[y * W + x] && hulls.some(h => inside(h, x + .5, y + .5))) box++;
    return { figPx: F0, figVisibleWithTok: F1, occludedPx: F0 - F1, occludedFrac: F0 ? (F0 - F1) / F0 : null, boxOverlapPx: box, boxOverlapFrac: F0 ? box / F0 : null, tokPx, nTok: tokens.count };
  }, { slot, W, H });
}
try {
  for (const vp of VPS) {
    const [W, H] = vp.split('x').map(Number);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await page.addInitScript((v) => { localStorage.setItem('yaoshi_intro_v1', '1'); window.__MM = v; }, 'cur');
    await page.goto(`http://127.0.0.1:8997/`);
    await page.evaluate(() => { for (const [s, px] of Object.entries({ top: 0, right: 59, bottom: 21, left: 59 })) document.documentElement.style.setProperty(`--safe-${s}`, `${px}px`); });
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    for (let i = 0; i < 100; i++) {
      const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
      if (st.r === 1 && !st.d && st.t.includes('不盯任何一件')) break;
      if (!st.d) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click());
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.__yaoshi3d.tray.loaded());
    await page.waitForFunction(() => window.__yaoshi3d.tray.hands.loaded(), null, { timeout: 30000 });
    await page.addStyleTag({ content: 'body *:not(canvas){visibility:hidden !important} canvas{visibility:visible !important}' });
    await page.waitForTimeout(3000);
    await page.clock.install({ time: 1e6 });
    await page.clock.pauseAt(2e6);
    await page.evaluate(() => { const Y = window.__yaoshi3d; Y.smoke.points.visible = false; Y.embers.points.visible = false; });
    const run = (ms) => page.clock.runFor(Math.max(16, Math.round(ms / 16) * 16));
    let last = '', same = 0;
    for (let i = 0; i < 400 && same < 40; i++) {
      await run(50);
      const k = await page.evaluate(() => { const c = window.__yaoshi3d.camera; return c.position.toArray().map(x => x.toFixed(7)).join() + c.quaternion.toArray().map(x => x.toFixed(7)).join(); });
      same = k === last ? same + 1 : 0; last = k;
    }
    await run(1000);
    const clip = { x: Math.round(W * 0.17), y: Math.round(H * 0.17), width: Math.round(W * 0.66), height: Math.round(H * 0.60) };
    for (const pass of ['r1', 'r2']) for (const variant of VARS) for (const sc of SCENES) {
      await page.evaluate((v) => { window.__MM = v; }, variant);
      await page.evaluate(() => { const T = window.__yaoshi3d.tray; window.__mmZero = true; for (const sl of T.__mmSlots()) if (sl.fig && sl.fig.__mmReset) sl.fig.__mmReset(); T.props.clearRound(); T.hands.clear(); });
      await run(600);
      await page.evaluate(({ marks, hands }) => { const T = window.__yaoshi3d.tray; for (const [s, k] of marks) { T.props.mark(s, k); if (hands) T.hands.mark(s, k); } }, sc);
      if (sc.frame === 'hit') { for (let i = 0; i < 80; i++) { await run(16); if (await page.evaluate(() => window.__yaoshi3d.tray.props.tokenAt(0)?.hit)) break; } }
      else await run(3000);
      const slot = sc.marks[0][1];
      const m = await measure(page, slot, W, H);
      const tk = await page.evaluate(() => [0, 1, 2, 3].map(s => { const t = window.__yaoshi3d.tray.props.tokenAt(s); return t && { s, x: +t.x.toFixed(4), y: +t.y.toFixed(4), z: +t.z.toFixed(4), t: +t.t.toFixed(3) }; }));
      fs.mkdirSync(`${OUT}/raw/${pass}`, { recursive: true });
      const file = `${OUT}/raw/${pass}/${vp}_${variant}_${sc.id}.png`;
      await page.screenshot({ path: file, clip });
      const dbg = await page.evaluate(() => { const Y = window.__yaoshi3d, c = Y.camera; return { cam: c.position.toArray().concat(c.quaternion.toArray()).map(x => +x.toFixed(6)), figs: Y.tray.__mmSlots().map(s => { const g = (s.fig || s.pile).group; return [g.position.x, g.position.y, g.position.z, g.rotation.y, g.scale.x].map(x => +x.toFixed(6)); }), fov: c.fov, anim: Y.tray.__mmSlots().map(s => s.fig && s.fig.animTime ? +s.fig.animTime().toFixed(4) : null), played: Y.tray.__mmSlots().map(s => !!s.played), hover: Y.tray.hover(), vo: c.view && c.view.enabled ? [c.view.offsetX, c.view.offsetY] : null }; });
      metrics.push({ dbg, run: pass, vp, variant, scene: sc.id, ...m, tokens: tk.filter(Boolean) });
      console.log(vp, variant, sc.id, JSON.stringify({ occ: m.occludedFrac?.toFixed(4), box: m.boxOverlapFrac?.toFixed(4), fig: m.figPx, tok: m.tokPx }));
    }
    await page.close();
  }
} finally { await browser.close(); server.kill(); }
for (const pass of ['r1', 'r2']) fs.writeFileSync(`${OUT}/raw/${pass}/metrics.json`, JSON.stringify(metrics.filter(m => m.run === pass), null, 1));
process.exit(0);
