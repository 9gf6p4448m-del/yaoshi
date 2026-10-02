/* 席位之手「中等寫實」v0.59.7 驗收量測（docs/experiments/2026-10-02-hand-realism/acceptance.md 條件 1／2／4）。
   跑法：node tests/tools/hand-realism-measure.mjs --root=<要服務的樹> [--vp=1280x720] [--out=<json>] [--port=8993]
   局面同示意圖（phase2-mock/hand-realism/shoot.mjs）：newGame('solo',1,['qingmian']) 第 1 夜，受測角色放南席（seat 0），
   派 ys:bid（seat 0、slot 1、8 枚）→ 170ms 後凍結手與錢 → 量：
     #1 指根骨距：IndexA–PinkyA 蒙皮骨的世界座標距離（世界單位）；基準 v0.59.6＝0.2014。
     #2 材質：該席 SkinnedMesh 的材質名、program 快取鍵、幾何有沒有 aSkin（寫實皮膚的遮罩屬性）。
        另查「實際開局」路徑：newGame 後 renderer 自己 setSeats 的四席材質名。
     #4 投影高：手包圍盒（蒙皮頂點，只算 alpha>0.5）與那一疊錢（prop-chips 全部 instance 的頂點）在畫面上的 y 跨度（px）。
   角色名單＝頁面上的 ROLES 表（Object.keys(ROLES)），外加空席（role 缺）——N 由頁面數出來，不寫死。
   不改產品、不耗遊戲亂數以外的狀態；量完即關。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root || HERE), [W, H] = String(opt.vp || '1280x720').split('x').map(Number), PORT = Number(opt.port || 8993);
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser; const out = { root: ROOT, vp: [W, H], base: 0.2014, errs: [], natural: null, roles: [] };
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') out.errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  /* 實際開局路徑（#2）：renderer 自己依 S.players 呼叫 setSeats 之後，四席手的材質名 */
  out.natural = await page.evaluate(async () => {
    const T = window.__yaoshi3d.tray; await T.loaded(); await T.hands.ready();
    const meshes = T.hands.group.children.map((h) => { let m = null; h.traverse((o) => { if (o.isSkinnedMesh && !m) m = o; }); return m; });
    return { players: window.__yaoshi.S.players.map((p) => p.role || p.id), materials: meshes.map((m) => m.material.name || '(無名)'), programKeys: meshes.map((m) => (m.material.customProgramCacheKey ? m.material.customProgramCacheKey() : '')) };
  });
  const roleIds = await page.evaluate(() => Object.keys(ROLES));
  await page.evaluate(async () => { const t = window.__yaoshi3d.tray; t.props.clearRound(); t.hands.clear(); });
  for (const role of [...roleIds, null]) {
    const seats = [0, 1, 2, 3].map((id) => (id === 0 ? (role ? { id, role } : { id }) : { id, role: ['qingmian', 'hongyi', 'xiaonv', 'zutou'][id] }));
    await page.evaluate(async (seats) => {
      const T = window.__yaoshi3d.tray, hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
      if (window.__propsUpd0) { T.props.update = window.__propsUpd0; window.__propsUpd0 = null; }
      T.hands.setFrozen(false); T.hands.finish(); T.props.clearRound(); T.hands.clear();
      T.props.setSeats(seats); T.hands.setSeats(seats);
      hp('ys:bid', { seat: 0, slot: 1, amount: 8 });
      await new Promise((r) => setTimeout(r, 170)); T.hands.setFrozen(true);
      window.__propsUpd0 = T.props.update; T.props.update = () => {};
      await new Promise((r) => { let k = 0; const f = () => (++k >= 4 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    }, seats);
    const m = await page.evaluate(async () => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, T = Y.tray, holder = T.hands.group.children[0];
      let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      holder.updateMatrixWorld(true); mesh.skeleton.update();
      const bw = (n) => mesh.skeleton.bones.find((x) => x.name === n).getWorldPosition(new THREE.Vector3());
      const Wd = Y.renderer.domElement.clientWidth, Hd = Y.renderer.domElement.clientHeight, v = new THREE.Vector3();
      const box = () => ({ x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
      const add = (b, p) => { p.project(Y.camera); const sx = (p.x + 1) / 2 * Wd, sy = (1 - p.y) / 2 * Hd; b.x0 = Math.min(b.x0, sx); b.x1 = Math.max(b.x1, sx); b.y0 = Math.min(b.y0, sy); b.y1 = Math.max(b.y1, sy); };
      /* 手：蒙皮頂點（只算看得見的：頂點 alpha>0.5） */
      const pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color, hb = box();
      for (let i = 0; i < pos.count; i++) {
        if (col && col.itemSize === 4 && col.getW(i) < 0.5) continue;
        v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); add(hb, v);
      }
      /* 錢：托盤道具群裡的 prop-chips（InstancedMesh）全部 instance 的每個頂點 */
      let chips = null; T.props.group.traverse((o) => { if (o.name === 'prop-chips') chips = o; });
      chips.updateMatrixWorld(true);
      const cb = box(), cpos = chips.geometry.attributes.position, im = new THREE.Matrix4();
      for (let k = 0; k < chips.count; k++) {
        chips.getMatrixAt(k, im);
        for (let i = 0; i < cpos.count; i++) { v.fromBufferAttribute(cpos, i).applyMatrix4(im).applyMatrix4(chips.matrixWorld); add(cb, v); }
      }
      const mat = mesh.material, ga = mesh.geometry.attributes;
      return {
        knuckleW: bw('IndexA').distanceTo(bw('PinkyA')), holderScale: holder.scale.x,
        material: mat.name || '(無名)', programKey: mat.customProgramCacheKey ? mat.customProgramCacheKey() : '', hasSkinAttr: !!ga.aSkin,
        tris: mesh.geometry.index.count / 3, visible: holder.visible, state: T.hands.stats().state?.[0] || null,
        handBox: [hb.x0, hb.y0, hb.x1, hb.y1].map((x) => +x.toFixed(1)), handH: +(hb.y1 - hb.y0).toFixed(1),
        coins: chips.count, coinBox: [cb.x0, cb.y0, cb.x1, cb.y1].map((x) => +x.toFixed(1)), coinH: +(cb.y1 - cb.y0).toFixed(1),
      };
    });
    const row = { role: role || '(空席)', ...m, knuckleRatio: +(m.knuckleW / out.base).toFixed(4), coinLtHand: m.coinH < m.handH };
    out.roles.push(row); console.log(JSON.stringify(row));
  }
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
if (opt.out) { fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true }); fs.writeFileSync(path.resolve(opt.out), JSON.stringify(out, null, 1)); }
console.log(JSON.stringify({ natural: out.natural, n: out.roles.length, errs: out.errs.slice(0, 5) }));
