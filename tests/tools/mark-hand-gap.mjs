// 拍令牌（slam）時「手」與「令牌」的距離量測。用法：node tests/tools/mark-hand-gap.mjs [--out=<json>] [--vps=844x390,932x430,667x375] [--nosafe]
// 每個視窗 × 四席 × 四槽：props.mark + hands.mark，落地後逐幀取手網格頂點（skinned）與令牌 8 角的投影，
// 取落地後「手與令牌螢幕框最小間距」最小的那一幀。輸出 JSON（也可 import 用 measure()）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(path.join(root, 'tools/anyCreature/package.json'))('playwright');
export const SEATS = ['南', '北', '西', '東'];
export async function measure({ vps = ['844x390', '932x430'], safe = true, port = 8994, seats = [0, 1, 2, 3], slots = [0, 1, 2, 3] } = {}) {
  const server = await serve(root, port);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const out = [];
  try {
    for (const name of vps) {
      const [w, h] = name.split('x').map(Number);
      const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      await page.addInitScript(() => localStorage.setItem('yaoshi_intro_v1', '1'));
      await page.goto(`http://127.0.0.1:${port}/`);
      if (safe) await page.evaluate(() => { for (const [s, px] of Object.entries({ top: 0, right: 59, bottom: 21, left: 59 })) document.documentElement.style.setProperty(`--safe-${s}`, `${px}px`); });
      await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi);
      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
        if (st.r === 1 && !st.d && st.t.includes('不盯任何一件')) { ready = true; break; }
        if (!st.d) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find(b => !b.disabled)?.click());
        await page.waitForTimeout(100);
      }
      if (!ready) throw new Error('盯上頁沒出現');
      await page.evaluate(() => window.__yaoshi3d.tray.loaded());
      await page.waitForFunction(() => window.__yaoshi3d.tray.hands.loaded(), null, { timeout: 30000 });
      await page.evaluate(() => new Promise(res => {
        const c = window.__yaoshi3d.camera; let last = '', same = 0;
        const tick = () => { const k = c.position.toArray().map(x => x.toFixed(6)).join() + c.quaternion.toArray().map(x => x.toFixed(6)).join();
          same = k === last ? same + 1 : 0; last = k; same >= 30 ? res() : requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }));
      const rows = await page.evaluate(async ({ seats, slots }) => {
        const Y = window.__yaoshi3d, T = Y.tray, P = T.props, cam = Y.camera, W = innerWidth, H = innerHeight;
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const frame = () => new Promise(r => requestAnimationFrame(() => r()));
        const V3 = cam.position.constructor;
        const tmp = new V3();
        const proj = v => { cam.updateMatrixWorld(); tmp.copy(v).project(cam); return { x: (tmp.x * .5 + .5) * W, y: (1 - (tmp.y * .5 + .5)) * H }; };
        const box2 = pts => ({ l: Math.min(...pts.map(p => p.x)), r: Math.max(...pts.map(p => p.x)), t: Math.min(...pts.map(p => p.y)), b: Math.max(...pts.map(p => p.y)) });
        const gapRect = (a, b) => Math.hypot(Math.max(0, a.l - b.r, b.l - a.r), Math.max(0, a.t - b.b, b.t - a.b));
        const out = [];
        const TK = { W: 0.075, H: 0.095, T: 0.05 };
        for (const seat of seats) for (const slot of slots) {
          P.clearRound(); T.hands.clear(); await wait(200);
          P.mark(seat, slot); T.hands.mark(seat, slot);
          let best = null, landedAt = null;
          const t0 = performance.now();
          while (performance.now() - t0 < 3500) {
            await frame();
            const tk = P.tokenAt(seat); if (!tk || tk.t < 1) continue;
            if (landedAt === null) landedAt = performance.now();
            const holder = T.hands.group.children.find(c => c.name === T.hands.stats().names[seat]);
            let mesh = null;
            if (holder && holder.visible) holder.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
            if (!mesh) continue;
            mesh.updateWorldMatrix(true, true); mesh.skeleton.update();
            const pos = mesh.geometry.attributes.position;
            const pts = [], pts3 = []; const step = Math.max(1, Math.floor(pos.count / 1200));
            for (let i = 0; i < pos.count; i += step) { const v = new V3().fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); pts3.push(v); pts.push(proj(v)); }
            const hb = box2(pts);
            const g = P.group; g.updateWorldMatrix(true, false);
            const cs = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) cs.push(new V3(tk.x + sx * TK.W, tk.y + sy * TK.T / 2, tk.z + sz * TK.H).applyMatrix4(g.matrixWorld));
            const tb = box2(cs.map(proj));
            const hmin = new V3(1e9, 1e9, 1e9), hmax = new V3(-1e9, -1e9, -1e9);
            for (const p of pts3) { hmin.min(p); hmax.max(p); }
            const tmin = new V3(1e9, 1e9, 1e9), tmax = new V3(-1e9, -1e9, -1e9);
            for (const p of cs) { tmin.min(p); tmax.max(p); }
            const g3 = Math.hypot(Math.max(0, hmin.x - tmax.x, tmin.x - hmax.x), Math.max(0, hmin.y - tmax.y, tmin.y - hmax.y), Math.max(0, hmin.z - tmax.z, tmin.z - hmax.z));
            let gs = 1e9, gv = null;
            pts.forEach((p, i) => { const d = Math.hypot(Math.max(0, tb.l - p.x, p.x - tb.r), Math.max(0, tb.t - p.y, p.y - tb.b)); if (d < gs) { gs = d; gv = i; } });
            // 手的最近頂點 vs 令牌 3D AABB
            let g3m = 1e9; for (const p of pts3) g3m = Math.min(g3m, Math.hypot(Math.max(0, tmin.x - p.x, p.x - tmax.x), Math.max(0, tmin.y - p.y, p.y - tmax.y), Math.max(0, tmin.z - p.z, p.z - tmax.z)));
            const palmB = mesh.skeleton.bones.find(b => /palm/i.test(b.name)) || mesh.skeleton.bones.find(b => /hand/i.test(b.name));
            const pw = palmB ? palmB.getWorldPosition(new V3()) : null; const pp = pw ? proj(pw) : null;
            const palm = pp ? { x: pp.x, y: pp.y, name: palmB.name, d3: Math.hypot(pw.x - (tmin.x + tmax.x) / 2, pw.z - (tmin.z + tmax.z) / 2) } : null;
            if (!best || gs < best.gapPx || false) {
              const c = proj(new V3(tk.x, tk.y, tk.z).applyMatrix4(g.matrixWorld));
              best = { seat, slot, tokSlot: tk.slot, tok: { x: c.x, y: c.y, ...tb }, hand: hb, gapPx: gs, gap3: g3m, palm, tokWorld: [tk.x, tk.z], handWorldMin: [hmin.x, hmin.z], handWorldMax: [hmax.x, hmax.z], tms: Math.round(performance.now() - landedAt) };
            }
          }
          out.push(best || { seat, slot, none: true });
        }
        P.clearRound(); T.hands.clear();
        return out;
      }, { seats, slots });
      for (const r of rows) out.push({ vp: name, ...r });
      await page.close();
    }
  } finally { await browser.close(); server.kill(); }
  return out;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const res = await measure({ vps: (arg('vps') || '844x390,932x430').split(','), safe: !process.argv.includes('--nosafe') });
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(res, null, 1));
  console.log('vp        seat slot  gapPx  gap3D   tokCx  tokCy  palm(x,y)  palmDx palmDy palmD3 name');
  for (const r of res) console.log(r.none ? `${r.vp} ${SEATS[r.seat]} ${r.slot} NONE` : `${r.vp.padEnd(8)} ${SEATS[r.seat]}   ${r.slot}   ${r.gapPx.toFixed(1).padStart(6)} ${r.gap3.toFixed(3).padStart(6)}  ${r.tok.x.toFixed(0).padStart(5)} ${r.tok.y.toFixed(0).padStart(5)}  ${r.palm ? [r.palm.x.toFixed(0), r.palm.y.toFixed(0), (r.palm.x - r.tok.x).toFixed(0), (r.palm.y - r.tok.y).toFixed(0), r.palm.d3.toFixed(3), r.palm.name].join(' ') : '-'}`);
  process.exit(0);
}
