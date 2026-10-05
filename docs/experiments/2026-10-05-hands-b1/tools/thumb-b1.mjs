/* v0.61.0 驗收：由 phase2-mock/hand-variants-b1/tools/ 同名檔複製（量法不動；路徑與部件名改成產品版：鋸齒針腳→針腳、HERE→hands-b1-impl）。 */
/* thumb-b1.mjs：由 shoot-b1.mjs 複製，只量拇指外展角（南席、推錢 28 步）。原檔頭：席位之手「批 1 身分變體」示意治具（不是產品、不是 gate）。
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
  for (const hk of HANDS) for (const pose of POSES) {
    const role = ALL[hk];
    const r = await page.evaluate(async ({ role, FILL, STEPS, pose }) => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, T = Y.tray, S = window.__sb, seat = 0, slot = 1;
      T.props.clearRound(); T.hands.clear();
      let f = 0; const seats = [0, 1, 2, 3].map((id) => ({ id, role: id === seat ? role : FILL[f++] }));
      T.props.setSeats(seats); T.hands.setSeats(seats); S.clock.step(240);
      if (pose === 'back') { S.ev('ys:bid', { seat, slot, amount: 8 }); S.clock.step(STEPS.back); }
      else if (pose === 'claw') { S.ev('ys:bid', { seat, slot, amount: 8 }); S.ev('ys:bid', { seat: 1, slot, amount: 5 }); S.clock.step(120); S.ev('ys:reveal-result', { slot, winner: 1 }); S.clock.step(STEPS.claw); }
      else { S.ev('ys:mark', { seat, slot }); for (let k = 0; k < 240; k++) { S.clock.step(1); if (T.hands.group.children[seat].visible) break; } S.clock.step(11); }
      const holder = T.hands.group.children[seat]; let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      holder.updateMatrixWorld(true); mesh.skeleton.update();
      const B = (n) => mesh.skeleton.bones.find((x) => x.name === n).getWorldPosition(new THREE.Vector3());
      const wr = B('Wrist'), ia = B('IndexA'), it = B('IndexTip'), ma = B('MiddleA'), pa = B('PinkyA'), ta = B('ThumbA'), tb = B('ThumbB'), tt = B('ThumbTip');
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3().subVectors(ia, pa), new THREE.Vector3().subVectors(ma, wr)).normalize();
      const proj = (v) => v.clone().sub(n.clone().multiplyScalar(v.dot(n)));
      const ang = (a, b) => { const x = proj(a).normalize(), y = proj(b).normalize(); return +(Math.acos(Math.max(-1, Math.min(1, x.dot(y)))) * 180 / Math.PI).toFixed(1); };
      const idx = new THREE.Vector3().subVectors(it, ia);
      /* 網格量法：主骨＝拇指遠端（ThumbC／ThumbTip）頂點的蒙皮重心 − 拇指根（ThumbA）頂點重心；食指同理（IndexC/Tip − IndexA） */
      const g = mesh.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, names = mesh.skeleton.bones.map((b) => b.name);
      const nb = g.userData.real ? g.userData.real.nBase : pos.count;
      const cen = (set) => { const c = new THREE.Vector3(), v = new THREE.Vector3(); let k = 0; for (let i = 0; i < nb; i++) { let bi = 0, bw = -1; for (let q = 0; q < 4; q++) { const w = sw.getComponent(i, q); if (w > bw) { bw = w; bi = si.getComponent(i, q); } } if (!set.includes(names[bi])) continue; v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); c.add(v); k++; } return c.multiplyScalar(1 / Math.max(1, k)); };
      const tm = new THREE.Vector3().subVectors(cen(['ThumbC', 'ThumbTip']), cen(['ThumbA'])), im = new THREE.Vector3().subVectors(cen(['IndexC', 'IndexTip']), cen(['IndexA']));
      /* 畫面角：兩軸投影到螢幕後的夾角 */
      const scr = (p) => { const q = p.clone().project(Y.camera); return new THREE.Vector2(q.x * innerWidth, q.y * innerHeight); };
      const a2 = (p0, p1, q0, q1) => { const u = scr(p1).sub(scr(p0)).normalize(), w = scr(q1).sub(scr(q0)).normalize(); return +(Math.acos(Math.max(-1, Math.min(1, u.dot(w)))) * 180 / Math.PI).toFixed(1); };
      return { boneAbd_tb_tt: ang(new THREE.Vector3().subVectors(tt, tb), idx), boneAbd_ta_tt: ang(new THREE.Vector3().subVectors(tt, ta), idx), meshAbd: ang(tm, im), screenAbd: a2(tb, tt, ia, it), state: T.hands.stats().state[0], mat: mesh.material.name, tris: g.index.count / 3 };
    }, { role, FILL, STEPS, pose });
    results.push({ hand: hk, role, pose, ...r }); console.log(JSON.stringify({ hand: hk, pose, ...r }));
  }
  fs.writeFileSync(path.join(OUT, `${TAG}-thumb.json`), JSON.stringify({ root: ROOT, q: opt.q || '', vp: [W, H], safe: SAFE, errs, results }, null, 1));
  console.log(JSON.stringify({ errs: errs.slice(0, 8) }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
