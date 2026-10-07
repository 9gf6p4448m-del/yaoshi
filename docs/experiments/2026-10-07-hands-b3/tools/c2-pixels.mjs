/* v0.63.0 批 3 條件 2：由 2026-10-05-hands-b1/tools/c2-pixels.mjs 複製，只改角色表（ALL／FILL）；量法不動。 */
/* v0.61.0 條件 2：既有手逐像素不變（對 4691a7ce）。由 shoot-b1.mjs 複製：同一取景（844×390＋安全區 47/47/21）、同一局面與手動時鐘、同一組姿勢步數。
   每格：只畫「手」——場景裡不在 table-hands 底下的可見網格／粒子／線全部暫時藏起來（燈光、背景、霧照舊），以遊戲相機畫進離屏目標、讀回 RGBA
   （不經後製 bloom、不含環境粒子的 Math.random；燈籠閃爍固定在基準亮度，才能跨兩棵樹逐像素比）。格＝手 × 席（南 0／北 1）× 姿勢（back＝推錢 28 步、claw＝敗方收 12 步、press＝拍令牌）。
   node c2-pixels.mjs --root=<樹> --tag=<名> --out=<放 .rgba 的資料夾> [--q=…] [--hands=default,shoujing,…] [--poses=back,claw] [--seats=0,1] [--clock0=<ms>]
   --clock0：手動時鐘起點（預設 1e7 固定值；見條件 11 的波動歸因——起點用真實時間時，第一步 dt 與之後各步 dt 的捨入會隨開跑時刻變）。
   輸出 <out>/<tag>-<hand>-s<seat>-<pose>.rgba（W×H×4，WebGL 讀回的列序）＋ <out>/<tag>-pixels.json（每格 sha256、手像素數、狀態機）。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import crypto from 'node:crypto';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root), TAG = opt.tag, [W, H] = String(opt.vp || '844x390').split('x').map(Number), PORT = Number(opt.port || 8995);
const SAFE = String(opt.safe || '0,47,21,47').split(',').map(Number);
const OUT = path.resolve(opt.out); fs.mkdirSync(OUT, { recursive: true });
/* 手 → 角色 id（default 用孝女白琴：批 3、現行預設手） */
const ALL = { default: null, shoujing: 'shoujing', dangpu: 'dangpu', hunter: 'hunter', qingmian: 'qingmian', hongyi: 'hongyi', duanshou: 'duanshou', zutou: 'zutou', xiaonv: 'xiaonv', lvshan: 'lvshan', luzhu: 'luzhu' }; // v0.63.0：預設手＝無角色（null）；批 3 三角色當正對照
const HANDS = opt.hands && opt.hands !== 'all' ? opt.hands.split(',') : Object.keys(ALL);
const FILL = ['zutou', 'hunter', 'dangpu']; // v0.63.0：其餘席不放批 3 角色（敗方收那格兩隻手同畫面，否則既有手的格會被批 3 的手污染）
const POSES = String(opt.poses || 'back,claw').split(','), SEATS = String(opt.seats || '0,1').split(',').map(Number);
const STEPS = { back: Number(opt.backsteps || 28), claw: Number(opt.clawsteps || 12) };
const { chromium } = createRequire('C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/package.json')('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser; const results = []; const errs = [];
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(opt.dpr || 1), hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q ? '?' + opt.q : ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(([t, r, b, l]) => { const s = document.createElement('style'); s.id = '__safe'; s.textContent = `:root{--safe-top:${t}px!important;--safe-right:${r}px!important;--safe-bottom:${b}px!important;--safe-left:${l}px!important}`; document.head.appendChild(s); }, SAFE);
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(600);
  await page.evaluate(async (C0) => {
    const Y = window.__yaoshi3d; await Y.tray.loaded(); await Y.tray.hands.ready();
    Y.tray.props.clearRound(); Y.tray.hands.clear();
    const native = requestAnimationFrame.bind(window); await new Promise(native);
    const queue = []; let id = 0; window.requestAnimationFrame = (cb) => { queue.push(cb); return ++id; };
    await new Promise(native);
    const clock = { now: C0, step(n = 1) { for (let k = 0; k < n; k++) { const cbs = queue.splice(0); if (!cbs.length) throw new Error('rAF queue empty'); clock.now += 1000 / 60; for (const cb of cbs) cb(clock.now); } } };
    window.__sb = { clock, ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })) };
  }, Number(opt.clock0 || 1e7));
  await page.evaluate(() => window.__sb.clock.step(180)); // 開局運鏡回穩
  /* 暖身（--warmup=0 可關）：開跑後第一次揭盅（敗方收）會帶到開局前真實時間那段的殘留狀態（同一棵樹連跑兩次，第一個 claw 格不相等；見 README 條件 2 歸因），
     先不記錄地把兩種揭盅（得標者南席／北席，與量測格同 slot）各做一次，之後每格都從同一個已回穩的狀態起步。
     診斷（diag 欄）：殘留只在相機（導演鏡頭），手的世界矩陣與骨矩陣兩次跑逐值相同。 */
  if (opt.warmup !== '0') await page.evaluate(() => { const T = window.__yaoshi3d.tray, S = window.__sb; T.props.clearRound(); T.hands.clear();
    const seats = [0, 1, 2, 3].map((id) => ({ id, role: ['xiaonv', 'lvshan', 'luzhu', 'xiaonv'][id] })); T.props.setSeats(seats); T.hands.setSeats(seats); S.clock.step(240);
    for (const [lose, win, slot] of [[0, 1, 1], [1, 0, 2]]) { T.props.clearRound(); T.hands.clear(); S.ev('ys:bid', { seat: lose, slot, amount: 8 }); S.ev('ys:bid', { seat: win, slot, amount: 5 }); S.clock.step(120); S.ev('ys:reveal-result', { slot, winner: win }); S.clock.step(240); } });
  for (const hk of HANDS) for (const seat of SEATS) for (const pose of POSES) {
    const role = ALL[hk], other = seat === 0 ? 1 : 0;
    const r = await page.evaluate(async ({ role, seat, other, pose, FILL, STEPS }) => {
      const Y = window.__yaoshi3d, T = Y.tray, S = window.__sb, slot = seat === 0 ? 1 : 2;
      document.getElementById('__nohud')?.remove();
      T.props.clearRound(); T.hands.clear();
      let f = 0; const seats = [0, 1, 2, 3].map((id) => ({ id, role: id === seat ? role : FILL[f++] }));
      T.props.setSeats(seats); T.hands.setSeats(seats);
      S.clock.step(240); // 上一格的揭盅運鏡回穩（每格同一起點）
      if (pose === 'back') { // 手背朝上＝推錢（ys:bid），推到錢柱上那一刻
        S.ev('ys:bid', { seat, slot, amount: 8 }); S.clock.step(STEPS.back);
      } else if (pose === 'claw') { // 爪形取錢＝敗方收（揭盅後 12 步、扒住錢柱）
        S.ev('ys:bid', { seat, slot, amount: 8 }); S.ev('ys:bid', { seat: other, slot, amount: 5 }); S.clock.step(120);
        S.ev('ys:reveal-result', { slot, winner: other });
        S.clock.step(STEPS.claw);
      } else {
        S.ev('ys:mark', { seat, slot }); let k = 0;
        for (; k < 240; k++) { S.clock.step(1); if (T.hands.group.children[seat].visible) break; }
        S.clock.step(11);
      }
      const st = T.hands.stats();
      return { state: st.state, visible: st.visible, variants: st.variants, tris: st.trisByHand, mats: st.materialNames, real: st.realInfo[seat] };
    }, { role, seat, other, pose, FILL, STEPS });
    const px = await page.evaluate(async ({ seat }) => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, hg = Y.tray.hands.group, under = (o) => { for (let p = o; p; p = p.parent) if (p === hg) return true; return false; };
      const hidden = []; Y.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.visible && !under(o)) { o.visible = false; hidden.push(o); } });
      /* 燈籠閃爍＝sin(elapsed…)，elapsed 含開局前真實時間的累積（每次開跑不同）⇒ 兩次跑的燈光強度不同。量手時把有 baseIntensity 的燈固定在基準亮度（量完還原）。 */
      const lit = []; Y.scene.traverse((o) => { if (o.isLight && o.userData && o.userData.baseIntensity) { lit.push([o, o.intensity]); o.intensity = o.userData.baseIntensity; } });
      const cw = Y.renderer.domElement.width, ch = Y.renderer.domElement.height, rt = new THREE.WebGLRenderTarget(cw, ch), buf = new Uint8Array(cw * ch * 4);
      const shot = () => { Y.renderer.setRenderTarget(rt); Y.renderer.clear(); Y.renderer.render(Y.scene, Y.camera); Y.renderer.readRenderTargetPixels(rt, 0, 0, cw, ch, buf); Y.renderer.setRenderTarget(null); };
      shot(); shot(); // 第一次含編譯；取第二次
      const holder = hg.children[seat]; holder.visible = false; const bg = new Uint8Array(cw * ch * 4); Y.renderer.setRenderTarget(rt); Y.renderer.clear(); Y.renderer.render(Y.scene, Y.camera); Y.renderer.readRenderTargetPixels(rt, 0, 0, cw, ch, bg); Y.renderer.setRenderTarget(null); holder.visible = true;
      let hand = 0; for (let i = 0; i < buf.length; i += 4) if (buf[i] !== bg[i] || buf[i + 1] !== bg[i + 1] || buf[i + 2] !== bg[i + 2]) hand++;
      for (const o of hidden) o.visible = true; for (const [o, v] of lit) o.intensity = v; rt.dispose();
      /* 診斷：相機與每席手（可見、世界矩陣、骨矩陣）的指紋，用來分辨像素差來自相機還是手的姿勢 */
      const fp = (arr) => { let h = 0; for (let i = 0; i < arr.length; i++) h = (h * 31 + Math.round(arr[i] * 1e6)) | 0; return h; };
      Y.camera.updateMatrixWorld(true);
      const diag = { cam: fp(Y.camera.matrixWorld.elements) + '/' + fp(Y.camera.projectionMatrix.elements), hands: hg.children.map((h) => { if (!h.visible) return 'hidden'; let m = null; h.traverse((o) => { if (o.isSkinnedMesh) m = o; }); m.updateMatrixWorld(true); m.skeleton.update(); return fp(m.matrixWorld.elements) + '/' + fp(m.skeleton.boneMatrices); }) };
      let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return { diag, w: cw, h: ch, handPx: hand, hiddenN: hidden.length, litN: lit.length, mat: (() => { let m = null; holder.traverse((o) => { if (o.isSkinnedMesh) m = o.material.name; }); return m; })(), b64: btoa(bin) };
    }, { seat });
    const raw = Buffer.from(px.b64, 'base64'), name = `${TAG}-${hk}-s${seat}-${pose}`;
    fs.writeFileSync(path.join(OUT, name + '.rgba'), raw);
    const row = { hand: hk, role, seat, pose, diag: px.diag, state: r.state[seat], visible: r.visible, mat: px.mat, w: px.w, h: px.h, handPx: px.handPx, hiddenN: px.hiddenN, sha256: crypto.createHash('sha256').update(raw).digest('hex'), file: name + '.rgba' };
    results.push(row); console.log(JSON.stringify({ hand: hk, seat, pose, state: row.state, vis: row.visible, handPx: row.handPx, mat: row.mat, sha: row.sha256.slice(0, 12) }));
  }
  fs.writeFileSync(path.join(OUT, `${TAG}-pixels.json`), JSON.stringify({ root: ROOT, q: opt.q || '', vp: [W, H], safe: SAFE, clock0: Number(opt.clock0 || 1e7), errs, results }, null, 1));
  console.log(JSON.stringify({ errs: errs.slice(0, 8) }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
