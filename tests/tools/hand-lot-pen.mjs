/* 手×拍品穿模量測（真頁面）：拍令牌時手的蒙皮頂點（袖口邊以前不分，全部頂點）落在「拍品網格內部」的幀數與點數。
   做法（覆審 N1 的射線奇偶法）：先用拍品 3D 外接盒篩候選頂點，再從頂點向 +y 打射線、雙面求交，交點數為奇數＝在網格內。
   跑法：node tests/tools/hand-lot-pen.mjs [--vp=844x390] [--out=<json>] [--seats=0123] [--root=<樹>] [--port=9330]
   輸出每席總計 {frames, points}；基準 5c91bdc7 為 0／0。 */
import fs from 'node:fs';
import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = opt.root ? path.resolve(opt.root) : HERE, PORT = Number(opt.port || 9330), SEATS = (opt.seats || '0123').split('').map(Number);
const [VW, VH] = (opt.vp || '844x390').split('x').map(Number);
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 900));
let browser, out;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage(); await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q || ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) { const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; }); if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break; if (!st.d) await page.click('#mainbtn').catch(() => {}); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click()); await page.waitForTimeout(20); }
  out = await page.evaluate(async (SEATS) => {
    const T = await import('three'); const Y = window.__yaoshi3d; await Y.tray.loaded(); if (Y.tray.hands.ready) await Y.tray.hands.ready();
    const native = requestAnimationFrame.bind(window); await new Promise(native); const queue = []; window.requestAnimationFrame = (cb) => { queue.push(cb); return 1; }; await new Promise(native);
    let now = performance.now(); const step = () => { const cbs = queue.splice(0); now += 1000 / 60; for (const cb of cbs) cb(now); };
    const v = new T.Vector3(), rc = new T.Raycaster(), up = new T.Vector3(0, 1, 0);
    const lots = () => Y.tray.lotNodes();
    const meshesOf = (obj) => { const ms = []; obj.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && o.visible) ms.push(o); }); return ms; };
    const inside = (ms, p) => { const sv = ms.map((m) => [m, m.material.side]); ms.forEach((m) => { if (!Array.isArray(m.material)) m.material.side = T.DoubleSide; }); rc.set(p, up); const hits = rc.intersectObjects(ms, false); sv.forEach(([m, sd]) => { if (!Array.isArray(m.material)) m.material.side = sd; }); return hits.length % 2 === 1; };
    const res = [];
    for (const seat of SEATS) for (let slot = 0; slot < 4; slot++) {
      Y.tray.props.clearRound(); Y.tray.hands.clear(); for (let i = 0; i < 20; i++) step();
      document.dispatchEvent(new CustomEvent('ys:mark', { detail: { seat, slot } }));
      window.__hf = []; window.__hp = []; let frames = 0, points = 0, handFrames = 0;
      for (let f = 0; f < 130; f++) { step();
        const holder = Y.tray.hands.group.children[seat]; if (!holder || !holder.visible) continue; let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh) mesh = o; }); if (!mesh) continue; handFrames++;
        mesh.updateWorldMatrix(true, true); mesh.skeleton.update(); const P = mesh.geometry.attributes.position;
        if (f === 70) { const tk = Y.tray.props.tokenAt(seat); const pb = mesh.skeleton.bones.find((b) => b.name === 'Palm'); const pp = pb ? pb.getWorldPosition(new T.Vector3()) : null; (window.__dbg ||= []).push({ seat, slot, tok: tk ? [tk.x, tk.z].map((x) => +x.toFixed(2)) : null, palm: pp ? [pp.x, pp.y, pp.z].map((x) => +x.toFixed(2)) : null }); }
        const L = lots(), B = L.map((o) => new T.Box3().setFromObject(o)), M = L.map(meshesOf), cand = [];
        for (let i = 0; i < P.count; i += 3) { if (P.getZ(i) < 0) continue; v.fromBufferAttribute(P, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld);
          for (let k = 0; k < B.length; k++) { const bx = B[k]; if (v.x > bx.min.x && v.x < bx.max.x && v.z > bx.min.z && v.z < bx.max.z && v.y < bx.max.y && v.y > bx.min.y) { if (cand.length < 400) cand.push([v.clone(), k]); } } }
        if (cand.length && f % 2 === 0) { let hit = 0; const stp = Math.max(1, Math.floor(cand.length / 60)); for (let c = 0; c < cand.length; c += stp) if (inside(M[cand[c][1]], cand[c][0])) { hit++; if (!window.__hp) window.__hp = []; if (window.__hp.length < 400) window.__hp.push([f, cand[c][1], ...cand[c][0].toArray().map((x) => +x.toFixed(2))]); } if (hit) { frames++; points += hit; (window.__hf ||= []).push(f); } }
      }
      res.push({ seat, slot, frames, points, handFrames, hitFrames: window.__hf.slice(), hitPts: window.__hp.slice(0, 60) });
    }
    return { res, dbg: window.__dbg };
  }, SEATS);

} finally { await browser?.close(); server.kill(); }
const DBG = out.dbg; out = out.res;
const bySeat = [0, 1, 2, 3].map((s) => { const r = out.filter((x) => x.seat === s); return r.length ? { seat: s, frames: r.reduce((a, x) => a + x.frames, 0), points: r.reduce((a, x) => a + x.points, 0), handFrames: r.reduce((a, x) => a + x.handFrames, 0) } : null; }).filter(Boolean);
const total = { frames: bySeat.reduce((a, x) => a + x.frames, 0), points: bySeat.reduce((a, x) => a + x.points, 0) };
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), JSON.stringify({ out, bySeat, total }, null, 1));
if (opt.dbg) console.log(JSON.stringify(DBG));
console.log(JSON.stringify({ vp: `${VW}x${VH}`, bySeat, total }));
