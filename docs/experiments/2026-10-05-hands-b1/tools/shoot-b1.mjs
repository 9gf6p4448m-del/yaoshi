/* v0.61.0 驗收：由 phase2-mock/hand-variants-b1/tools/ 同名檔複製（量法不動；路徑與部件名改成產品版：鋸齒針腳→針腳、HERE→hands-b1-impl）。 */
/* 席位之手「批 1 身分變體」示意治具（不是產品、不是 gate）。
   node shoot-b1.mjs --root=<要服務的樹> --tag=<名> [--q=handb1=1] [--vp=844x390] [--safe=0,47,21,47] [--port=8995] [--hands=all|default,qingmian…]
   遊戲真實取景：844×390、瀏海安全區（landscape-fit-probe V3 同法：覆寫 --safe-* CSS 變數）、newGame('solo',1,['qingmian']) 第 1 夜出價中，
   手動時鐘（rAF 換成每步 1/60 秒，同 hands-occlusion）→ 同一串事件、同一步數 ⇒ 決定性。
   每隻手（角色放在指定席，其餘三席放預設手角色）三個姿勢：
     back＝手背朝上（推錢 push：ys:bid 後 28 步、手背朝上推著錢柱；原想用勝方停一拍 hold，但南席 hold 落在 HUD 底下看不到）、claw＝爪形取錢（敗方收 rake）、press＝掌心按住（拍令牌 slam）。
   南席（seat 0，近側）三姿勢＋北席（seat 1，遠側）手背朝上。每格：整張遊戲畫面（含 HUD）＋特寫（無 HUD，固定相對手骨的相機）。
   量測（寫進 <tag>-measure.json）：手的投影包圍盒、指根寬 px、每 dm 幾 px（該手所在深度）、批 1 辨識物（geometry.userData.b1parts）的投影包圍盒 px、
   只開這隻手的 draw call／三角面增量、手的狀態機。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import crypto from 'node:crypto';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root), TAG = opt.tag, [W, H] = String(opt.vp || '844x390').split('x').map(Number), PORT = Number(opt.port || 8995);
const SAFE = String(opt.safe || '0,47,21,47').split(',').map(Number);
const OUT = path.resolve(opt.out || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'raw')); fs.mkdirSync(OUT, { recursive: true });
/* 手 → 角色 id（default 用孝女白琴：批 3、現行預設手） */
const ALL = { default: 'xiaonv', shoujing: 'shoujing', dangpu: 'dangpu', hunter: 'hunter', qingmian: 'qingmian', hongyi: 'hongyi', duanshou: 'duanshou', zutou: 'zutou' };
const HANDS = opt.hands && opt.hands !== 'all' ? opt.hands.split(',') : Object.keys(ALL);
const FILL = ['lvshan', 'luzhu', 'xiaonv']; // 其餘席的角色（都是預設手）
const POSES = String(opt.poses || 'back,claw,press').split(',');
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
  await page.evaluate(async () => {
    const Y = window.__yaoshi3d; await Y.tray.loaded(); await Y.tray.hands.ready();
    Y.tray.props.clearRound(); Y.tray.hands.clear();
    const native = requestAnimationFrame.bind(window); await new Promise(native);
    const queue = []; let id = 0; window.requestAnimationFrame = (cb) => { queue.push(cb); return ++id; };
    await new Promise(native);
    const clock = { now: performance.now(), step(n = 1) { for (let k = 0; k < n; k++) { const cbs = queue.splice(0); if (!cbs.length) throw new Error('rAF queue empty'); clock.now += 1000 / 60; for (const cb of cbs) cb(clock.now); } } };
    window.__sb = { clock, ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })) };
  });
  await page.evaluate(() => window.__sb.clock.step(180)); // 開局運鏡回穩
  for (const hk of HANDS) for (const [seat, poses] of [[0, POSES], [1, ['back']]]) for (const pose of poses) {
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
    await page.waitForTimeout(60);
    const name = `${TAG}-s${seat}-${hk}-${pose}`;
    const shot = await page.screenshot({ path: path.join(OUT, name + '-game.png') });
    /* 同一幀、同一台遊戲相機，隱去 HUD（DOM）再拍一張：拼圖格用這張（手被 HUD 蓋到時仍看得到手） */
    await page.evaluate(() => { const st = document.createElement('style'); st.id = '__nohud'; st.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}'; document.head.appendChild(st); }); // 不重畫：畫布保留同一幀（重畫會繞過後製 bloom）
    await page.waitForTimeout(40);
    await page.screenshot({ path: path.join(OUT, name + '-nohud.png') });
    await page.evaluate(() => document.getElementById('__nohud')?.remove());
    const m = await page.evaluate(async ({ seat }) => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, T = Y.tray, g = T.hands.group, holder = g.children[seat];
      let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      holder.updateMatrixWorld(true); mesh.skeleton.update();
      const cw = Y.renderer.domElement.clientWidth, ch = Y.renderer.domElement.clientHeight, v = new THREE.Vector3();
      const projV = (i) => { v.fromBufferAttribute(mesh.geometry.attributes.position, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); const w = v.clone(); v.project(Y.camera); return { x: (v.x + 1) / 2 * cw, y: (1 - v.y) / 2 * ch, w }; };
      const col = mesh.geometry.attributes.color, pos = mesh.geometry.attributes.position;
      const box = (ids) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0; const c = new THREE.Vector3(); for (const i of ids) { const p = projV(i); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); c.add(p.w); n++; } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, c: c.multiplyScalar(1 / Math.max(1, n)) }; };
      const all = []; for (let i = 0; i < pos.count; i++) if (!(col.itemSize === 4 && col.getW(i) < 0.5)) all.push(i);
      const hb = box(all);
      const bw = (n) => mesh.skeleton.bones.find((x) => x.name === n).getWorldPosition(new THREE.Vector3());
      const pr = (p) => { const q = p.clone().project(Y.camera); return [(q.x + 1) / 2 * cw, (1 - q.y) / 2 * ch]; };
      const a = pr(bw('IndexA')), b = pr(bw('PinkyA'));
      /* 每 dm 幾 px（該點深度，透視相機）：dm → 世界＝holder.scale */
      const pxPerDm = (wp) => { const d = wp.clone().applyMatrix4(Y.camera.matrixWorldInverse).z * -1; return holder.scale.x * ch / (2 * Math.tan(Y.camera.fov * Math.PI / 360) * d) * Y.camera.zoom; };
      const parts = (mesh.geometry.userData.b1parts || []).map((p) => { const ids = p.base ? p.base : Array.from({ length: p.to - p.from }, (_, k) => p.from + k); const bb = box(ids); return { name: p.name, w: +bb.w.toFixed(1), h: +bb.h.toFixed(1), max: +Math.max(bb.w, bb.h).toFixed(1), pxPerDm: +pxPerDm(bb.c).toFixed(1) }; });
      /* 只開這隻手 vs 收掉：draw call／三角面 */
      const others = g.children.filter((h) => h !== holder).map((h) => [h, h.visible]); for (const [h] of others) h.visible = false;
      const info = Y.renderer.info; info.autoReset = false;
      const r1 = () => { info.reset(); Y.renderer.render(Y.scene, Y.camera); return { calls: info.render.calls, tris: info.render.triangles }; };
      const on = r1(); holder.visible = false; const off = r1(); holder.visible = true; info.autoReset = true;
      for (const [h, vis] of others) h.visible = vis;
      Y.renderer.render(Y.scene, Y.camera);
      const c = bw('Palm'); // 特寫對準掌心骨（全骨重心含前臂，會偏到手腕後面）
      return { handBox: { x0: +hb.x0.toFixed(1), y0: +hb.y0.toFixed(1), w: +hb.w.toFixed(1), h: +hb.h.toFixed(1) }, knucklePx: +Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(1), pxPerDmHand: +pxPerDm(hb.c).toFixed(1),
        parts, calls: on.calls - off.calls, tris: on.tris - off.tris, centroid: c.toArray(), yaw: holder.rotation.y, scale: holder.scale.x };
    }, { seat });
    /* 既有手（一般手＋三角色）在示意材質下畫出來的像素，與 v0.60.1 原本的寫實材質逐像素比較：同一幀、同一台相機、場景不動，只換這隻手的材質，
       畫進離屏目標讀回（不經後製，所以沒有時間雜訊）。只在 ?handb1=1 時做；批 1 角色當正對照（原材質畫不出新四種手，應該要不同）。 */
    let matcmp = null;
    if (opt.q && /handb1=1/.test(opt.q)) matcmp = await page.evaluate(async ({ seat }) => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, holder = Y.tray.hands.group.children[seat]; let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /js\/hand-realism\.js/.test(n));
      const HR = await import(url);
      const m1 = mesh.material, U = m1.userData.realU, m0 = HR.makeSkinMaterial(m1.clone(), { J: U.uJ.value.map((v) => v.toArray()), wrist: U.uWr.value.toArray() });
      const cw = Y.renderer.domElement.width, ch = Y.renderer.domElement.height, rt = new THREE.WebGLRenderTarget(cw, ch), a = new Uint8Array(cw * ch * 4), b = new Uint8Array(cw * ch * 4);
      const shot = (mat, buf) => { mesh.material = mat; Y.renderer.setRenderTarget(rt); Y.renderer.clear(); Y.renderer.render(Y.scene, Y.camera); Y.renderer.readRenderTargetPixels(rt, 0, 0, cw, ch, buf); Y.renderer.setRenderTarget(null); };
      shot(m0, a); shot(m1, b); shot(m0, a); shot(m1, b); // 各畫兩次（第一次含編譯），取第二次
      mesh.material = m1;
      let diff = 0, max = 0, hand = 0; const c = new Uint8Array(cw * ch * 4); shot(m1, c); // 手的像素數（參考）：同一材質再畫一次，與「手藏起來」比
      holder.visible = false; const d = new Uint8Array(cw * ch * 4); shot(m1, d); holder.visible = true;
      for (let i = 0; i < a.length; i += 4) { const dd = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (dd) diff++; max = Math.max(max, dd); if (c[i] !== d[i] || c[i + 1] !== d[i + 1] || c[i + 2] !== d[i + 2]) hand++; }
      rt.dispose(); m0.dispose();
      return { diffPx: diff, maxDiff: max, handPx: hand, m0: m0.name, m1: m1.name };
    }, { seat });
    const hudCover = null; // 改在拼圖時以「有 HUD／無 HUD 兩張同幀截圖」逐像素比（contact-b1.py）
    /* 特寫（南席才拍）：相機在手骨重心「朝席位那側後上方」，同一套相對位置；拍完還原 */
    let close = null;
    if (seat === 0) {
      await page.evaluate(({ c, yaw }) => {
        const st = document.createElement('style'); st.id = '__nohud'; st.textContent = 'body > *:not(canvas):not(#vignette){visibility:hidden !important}'; document.head.appendChild(st);
        const Y = window.__yaoshi3d; window.__camKeep = { p: Y.camera.position.toArray(), q: Y.camera.quaternion.toArray(), zoom: Y.camera.zoom };
        const bx = -Math.sin(yaw), bz = -Math.cos(yaw); // 指回席位的方向
        Y.camera.position.set(c[0] + bx * 0.36 + 0.03, c[1] + 0.36, c[2] + bz * 0.36); Y.camera.lookAt(c[0] - bx * 0.02, c[1] - 0.02, c[2] - bz * 0.02); Y.camera.updateMatrixWorld(true); Y.renderer.render(Y.scene, Y.camera);
      }, { c: m.centroid, yaw: m.yaw });
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(OUT, name + '-close.png') });
      await page.evaluate(() => { const Y = window.__yaoshi3d, k = window.__camKeep; Y.camera.position.fromArray(k.p); Y.camera.quaternion.fromArray(k.q); Y.camera.zoom = k.zoom; Y.camera.updateProjectionMatrix(); Y.camera.updateMatrixWorld(true); document.getElementById('__nohud')?.remove(); Y.renderer.render(Y.scene, Y.camera); });
      close = name + '-close.png';
    }
    const row = { hand: hk, role, seat, pose, ...r, ...m, hudCover, matcmp, game: name + '-game.png', nohud: name + '-nohud.png', close, sha256: crypto.createHash('sha256').update(shot).digest('hex') };
    results.push(row); console.log(JSON.stringify({ hand: hk, seat, pose, state: r.state[seat], vis: r.visible, tris: m.tris, calls: m.calls, box: m.handBox, parts: m.parts.map((p) => p.name + ':' + p.max).join(' '), matcmp, hudCover }));
  }
  fs.writeFileSync(path.join(OUT, `${TAG}-measure.json`), JSON.stringify({ root: ROOT, q: opt.q || '', vp: [W, H], safe: SAFE, errs, results }, null, 1));
  console.log(JSON.stringify({ errs: errs.slice(0, 8) }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
