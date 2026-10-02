/* 席位之手配件「剪影圓度」量測（v0.59.7 驗收條件 10b／10c）。
   跑法：node tests/tools/hand-acc-roundness.mjs --root=<樹> --cam=auto|<特寫相機 json> [--vp=1280x720] [--out=<json>] [--port=8994]
   局面同 hand-realism-measure.mjs（南席推 8 枚、170ms 凍結）。對每個受測角色：
     依頂點色挑出配件頂點（木珠／鉚釘／寶石等，色表見 GROUPS），焊接同位置頂點後以三角形連通分量切成「一顆一顆」，
     每顆的蒙皮頂點投影到特寫相機（與示意圖同一台，--cam 給的 at／from）與遊戲相機，取投影點凸包——凸物件的剪影＝投影凸包——
     圓度＝4π·面積／周長²（圓＝1、正六邊形 0.907、正方形 0.785）。另記每顆的世界直徑（凸包外接，量珠徑變化用）。
   注意：凸包法對「凸的配件」才等於真實剪影（珠、釘頭、寶石皆凸）；凹物件不適用。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root || HERE), [W, H] = String(opt.vp || '1280x720').split('x').map(Number), PORT = Number(opt.port || 8994);
const CAM = opt.cam && opt.cam !== 'auto' ? JSON.parse(fs.readFileSync(opt.cam, 'utf8')) : {};
/* 受測配件的頂點色（線性 RGB，GLB／hand-motion 同一空間）。舊版與新版各自的色寫在這裡；挑不到就回 0 顆（明列，不當成過）。 */
const GROUPS = JSON.parse(opt.groups || JSON.stringify({
  shoujing: { bead: [[0.055, 0.026, 0.012]] },
  hunter: { rivet: [[0.16, 0.16, 0.17]] },
  dangpu: { gem: [] },
}));
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser; const out = { root: ROOT, vp: [W, H], errs: [], roles: {} };
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
  await page.evaluate(async () => { const t = window.__yaoshi3d.tray; await t.loaded(); await t.hands.ready(); t.props.clearRound(); t.hands.clear(); });
  for (const role of Object.keys(GROUPS)) {
    const seats = [0, 1, 2, 3].map((id) => ({ id, role: id === 0 ? role : ['qingmian', 'hongyi', 'xiaonv', 'zutou'][id] }));
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
    out.roles[role] = await page.evaluate(async ({ groups, cam }) => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, holder = Y.tray.hands.group.children[0];
      let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      holder.updateMatrixWorld(true); mesh.skeleton.update();
      const g = mesh.geometry, pos = g.attributes.position, col = g.attributes.color, idx = g.index.array;
      const world = (i) => { const v = new THREE.Vector3().fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); return v.applyMatrix4(mesh.matrixWorld); };
      /* 特寫相機＝把遊戲相機本身搬到 cam.from、看 cam.at（與 shoot.mjs 拍特寫的做法逐字相同：遊戲相機掛在父節點下，
         position 是父座標；複製一台無父節點的相機會變成另一台相機），投影完再放回原位。 */
      const C0 = Y.camera, keep = { p: C0.position.clone(), q: C0.quaternion.clone() };
      const snap = (c) => { c.updateMatrixWorld(true); const m = c.matrixWorldInverse.clone(), pm = c.projectionMatrix.clone(); return { project: (v) => v.applyMatrix4(m).applyMatrix4(pm) }; };
      const cams = { game: snap(C0) };
      /* cam＝'auto'：以這隻手的骨重心為準（同 shoot.mjs 沒給 --cam 時的算法：at＝重心、from＝重心＋[0.05, 0.42, 0.42]）——
         手在世界中的落點會隨牌桌取景而變，固定世界座標的相機不一定拍得到手。 */
      if (cam === 'auto') { const c = new THREE.Vector3(); let n = 0; holder.traverse((o) => { if (o.isBone) { c.add(o.getWorldPosition(new THREE.Vector3())); n++; } }); c.multiplyScalar(1 / n); cam = { at: c.toArray(), from: [c.x + 0.05, c.y + 0.42, c.z + 0.42] }; }
      if (cam) { C0.position.set(...cam.from); C0.lookAt(...cam.at); cams.close = snap(C0); C0.position.copy(keep.p); C0.quaternion.copy(keep.q); C0.updateMatrixWorld(true); }
      const Wd = Y.renderer.domElement.clientWidth, Hd = Y.renderer.domElement.clientHeight;
      const hull = (pts) => { pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = []; for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
        for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
        return lo.slice(0, -1).concat(up.slice(0, -1)); };
      const res = {};
      for (const [name, colors] of Object.entries(groups)) {
        const match = (i) => colors.some((c) => Math.abs(col.getX(i) - c[0]) + Math.abs(col.getY(i) - c[1]) + Math.abs(col.getZ(i) - c[2]) < 2e-3);
        /* 焊接＋三角形連通分量 */
        const key = (i) => pos.getX(i).toFixed(4) + ',' + pos.getY(i).toFixed(4) + ',' + pos.getZ(i).toFixed(4);
        const par = new Map(); const find = (k) => { while (par.get(k) !== k) { par.set(k, par.get(par.get(k))); k = par.get(k); } return k; };
        const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par.set(a, b); };
        const vk = new Map();
        for (let t = 0; t < idx.length; t += 3) {
          const tri = [idx[t], idx[t + 1], idx[t + 2]]; if (!tri.every(match)) continue;
          const ks = tri.map(key); for (const [k, i] of ks.map((k, j) => [k, tri[j]])) { if (!par.has(k)) par.set(k, k); vk.set(k, i); }
          uni(ks[0], ks[1]); uni(ks[0], ks[2]);
        }
        const comps = new Map(); for (const [k, i] of vk) { const r = find(k); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(i); }
        const items = [];
        for (const verts of comps.values()) {
          const W3 = verts.map(world); let diam = 0; for (const a of W3) for (const b of W3) diam = Math.max(diam, a.distanceTo(b));
          const row = { verts: verts.length, diamWorld: +diam.toFixed(5) };
          for (const [cn, c] of Object.entries(cams)) {
            const P = W3.map((v) => { const q = c.project(v.clone()); return [(q.x + 1) / 2 * Wd, (1 - q.y) / 2 * Hd]; });
            const h = hull(P); let A = 0, L = 0; for (let i = 0; i < h.length; i++) { const a = h[i], b = h[(i + 1) % h.length]; A += a[0] * b[1] - b[0] * a[1]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); }
            A = Math.abs(A) / 2; row[cn] = { round: L ? +(4 * Math.PI * A / (L * L)).toFixed(4) : null, px: +Math.sqrt(A).toFixed(2), hullN: h.length };
          }
          items.push(row);
        }
        const st = (cn) => { const r = items.map((x) => x[cn]?.round).filter((x) => x != null).sort((a, b) => a - b); return r.length ? { min: r[0], median: r[r.length >> 1], max: r[r.length - 1] } : null; };
        const d = items.map((x) => x.diamWorld).sort((a, b) => a - b), dm = d.length ? d[d.length >> 1] : 0;
        res[name] = { n: items.length, close: st('close'), game: st('game'), diamSpread: d.length ? [+(d[0] / dm - 1).toFixed(3), +(d[d.length - 1] / dm - 1).toFixed(3)] : null, items };
      }
      return res;
    }, { groups: GROUPS[role], cam: opt.cam === 'auto' ? 'auto' : (CAM[role] || null) });
    console.log(role, JSON.stringify(Object.fromEntries(Object.entries(out.roles[role]).map(([k, v]) => [k, { n: v.n, close: v.close, game: v.game, diamSpread: v.diamSpread }]))));
  }
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
if (opt.out) { fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true }); fs.writeFileSync(path.resolve(opt.out), JSON.stringify(out, null, 1)); }
console.log(JSON.stringify({ errs: out.errs.slice(0, 5) }));
