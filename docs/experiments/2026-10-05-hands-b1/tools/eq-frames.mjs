/* v0.61.0 條件 11：由 phase2-mock/hand-variants-b1/tools/eq-frames.mjs 複製；只加 ①--clock0（手動時鐘起點，見下）②--outdir ③輸出記錄時鐘起點。量法（雜湊內容、事件、步數）不動。
   --clock0=perf（預設，與示意階段相同：起點＝performance.now() 當下的真實時間）｜<數字>（固定起點 ms）｜perf+<數字>（真實時間再加偏移）。
   原檔頭：逐幀等價（示意開關 ?handb1 預設關時，與 origin/main 4691a7ce 逐幀相等的證據；不是 gate）。
   node eq-frames.mjs --root=<樹> --tag=<名> [--q=handb1=1] [--port=8996]
   844×390＋安全區 47/47/21、newGame('solo',1,['qingmian'])、手動時鐘（每步 1/60 秒）。兩段事件：
     A 四席＝批 1 四角色（青面／紅衣婆婆／斷手書生／組頭）：四席推、四席拍、揭盅；
     B 四席＝既有三角色＋一般手（收驚婆／當鋪／獵人／孝女白琴）：同一串事件。
   每 2 步截一張整頁（含 HUD）算 sha256，並記 hands.stats() 的可見席、每手面數、材質名。輸出 <tag>-frames.json。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import crypto from 'node:crypto';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root), TAG = opt.tag, PORT = Number(opt.port || 8996), W = 844, H = 390, SAFE = [0, 47, 21, 47];
const OUT = path.resolve(opt.outdir || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'eq')); fs.mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire('C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/package.json')('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser; const errs = [], frames = [];
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q ? '?' + opt.q : ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(([t, r, b, l]) => { const s = document.createElement('style'); s.textContent = `:root{--safe-top:${t}px!important;--safe-right:${r}px!important;--safe-bottom:${b}px!important;--safe-left:${l}px!important}`; document.head.appendChild(s); }, SAFE);
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(600);
  const CLOCK0 = String(opt.clock0 || 'perf');
  const clockInfo = await page.evaluate(async (CLOCK0) => {
    const Y = window.__yaoshi3d; await Y.tray.loaded(); await Y.tray.hands.ready();
    Y.tray.props.clearRound(); Y.tray.hands.clear();
    const native = requestAnimationFrame.bind(window); await new Promise(native);
    const queue = []; let id = 0; window.requestAnimationFrame = (cb) => { queue.push(cb); return ++id; };
    await new Promise(native);
    const pn = performance.now(), m = /^perf\+(.+)$/.exec(CLOCK0);
    const start = CLOCK0 === 'perf' ? pn : m ? pn + Number(m[1]) : Number(CLOCK0);
    const clock = { now: start, step(n = 1) { for (let k = 0; k < n; k++) { const cbs = queue.splice(0); if (!cbs.length) throw new Error('rAF queue empty'); clock.now += 1000 / 60; for (const cb of cbs) cb(clock.now); } } };
    window.__eq = { clock, ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })) };
    clock.step(180);
    return { clock0: CLOCK0, start, perfAtStart: pn };
  }, CLOCK0);
  const grab = async (label) => { const buf = await page.screenshot(); if (opt.save && frames.length % 20 === 0) fs.writeFileSync(path.join(OUT, `${TAG}-${frames.length}.png`), buf);
    /* 手送進 GPU 的全部輸入的雜湊：每席可見、網格世界矩陣、骨矩陣（蒙皮）、幾何陣列（位置／顏色／蒙皮／索引／aSkin／aAcc）、材質名＋實際編譯出的 shader 原始碼。
       整張截圖在同一棵樹連跑兩次也不相等（環境粒子用 Math.random、畫面雜訊），所以拿這組輸入當逐幀證據。 */
    const st = await page.evaluate(async () => {
      const Y = window.__yaoshi3d, s = Y.tray.hands.stats(), gl = Y.renderer.getContext(), enc = new TextEncoder();
      const dig = async (parts) => { let n = 0; for (const p of parts) n += p.byteLength; const u = new Uint8Array(n); let o = 0; for (const p of parts) { u.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), o); o += p.byteLength; } return [...new Uint8Array(await crypto.subtle.digest('SHA-256', u))].map((x) => x.toString(16).padStart(2, '0')).join(''); };
      window.__geoSig = window.__geoSig || new Map(); window.__matSig = window.__matSig || new Map();
      const per = [];
      for (const holder of Y.tray.hands.group.children) {
        let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
        if (!holder.visible) { per.push('hidden'); continue; }
        mesh.updateMatrixWorld(true); mesh.skeleton.update();
        const g = mesh.geometry; if (!window.__geoSig.has(g.uuid)) { const arrs = Object.keys(g.attributes).sort().map((k) => g.attributes[k].array); arrs.push(g.index.array); window.__geoSig.set(g.uuid, await dig(arrs)); }
        const m = mesh.material; if (!window.__matSig.has(m.uuid)) { const pr = Y.renderer.properties.get(m).currentProgram; window.__matSig.set(m.uuid, pr ? await dig([enc.encode(m.name + '|' + gl.getShaderSource(pr.vertexShader) + '|' + gl.getShaderSource(pr.fragmentShader))]) : 'noprog'); }
        per.push(await dig([new Float32Array(mesh.matrixWorld.elements), mesh.skeleton.boneMatrices]) + ':' + window.__geoSig.get(g.uuid).slice(0, 16) + ':' + window.__matSig.get(m.uuid).slice(0, 16));
      }
      return { vis: s.visible, tris: s.trisByHand, mats: s.materialNames, hands: per };
    }); frames.push({ label, sha: crypto.createHash('sha256').update(buf).digest('hex'), ...st }); };
  for (const [seg, roles] of [['A', ['qingmian', 'hongyi', 'duanshou', 'zutou']], ['B', ['shoujing', 'dangpu', 'hunter', 'xiaonv']]]) {
    await page.evaluate((roles) => { const T = window.__yaoshi3d.tray; T.props.clearRound(); T.hands.clear(); const seats = roles.map((role, id) => ({ id, role })); T.props.setSeats(seats); T.hands.setSeats(seats); window.__eq.clock.step(60); }, roles);
    const phase = async (name, fire, n) => { await page.evaluate((fire) => { for (const [e, d] of fire) window.__eq.ev(e, d); }, fire); for (let s = 1; s <= n; s++) { await page.evaluate(() => window.__eq.clock.step(1)); if (s % 2 === 0) await grab(`${seg}-${name}-${s}`); } };
    await phase('push', [0, 1, 2, 3].map((s) => ['ys:bid', { seat: s, slot: (s + 1) % 4, amount: 3 + s }]), 60);
    await phase('slam', [0, 1, 2, 3].map((s) => ['ys:mark', { seat: s, slot: (s + 1) % 4 }]), 70);
    await phase('reveal', [['ys:bid', { seat: 2, slot: 1, amount: 9 }], ['ys:reveal-result', { slot: 1, winner: 0 }]], 60);
  }
  fs.writeFileSync(path.join(OUT, `${TAG}-frames.json`), JSON.stringify({ root: ROOT, q: opt.q || '', clock: clockInfo, errs, frames }, null, 1));
  console.log(JSON.stringify({ tag: TAG, clock: clockInfo, frames: frames.length, framesWithHands: frames.filter((f) => f.vis.length).length, errs: errs.slice(0, 5) }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
