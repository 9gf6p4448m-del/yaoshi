/* 階段三 角色變體截圖：node tests/tools/hands-roles-shots.mjs --out=<資料夾> [--vp=1280x720] [--layout=L|P] [--roles=shoujing,dangpu,hunter,default]
   手的大小＝遊戲實際（不放大）；每張只讓一席動作。檔名 <prefix>-<seat>-<action>-<role>.jpg，盲讀檔另行改名。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const OUT = path.resolve(opt.out || 'shots'); fs.mkdirSync(OUT, { recursive: true });
const [W, H] = String(opt.vp || '1280x720').split('x').map(Number), lay = opt.layout || 'L', PORT = Number(opt.port || 8978);
const ROLES = String(opt.roles || 'shoujing,dangpu,hunter,qingmian').split(',');
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: HERE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (/DBG/.test(m.text())) console.log(m.text()); if (m.type() === 'error' && !/DBG/.test(m.text())) errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  if (lay === 'P') await page.addStyleTag({ content: '#rotateHint{display:none !important}' });
  if (opt.close) await page.addStyleTag({ content: 'body > *:not(canvas):not(#vignette){visibility:hidden !important}' });
  await page.evaluate(async () => { const t = window.__yaoshi3d.tray; await t.loaded(); await t.hands.ready(); t.props.clearRound(); t.hands.clear(); });
  const shoot = async (name, seats, fire, waitMs) => {
    await page.evaluate(async ({ seats, fire, waitMs }) => {
      const T = window.__yaoshi3d.tray, hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
      if (window.__raf0) { window.requestAnimationFrame = window.__raf0; const c = window.__held; window.__held = null; if (c) window.requestAnimationFrame(c); }
      T.hands.setFrozen(false); T.hands.finish(); T.props.clearRound(); T.hands.clear();
      T.props.setSeats(seats); T.hands.setSeats(seats);
      for (const [n, d] of fire.prep || []) hp(n, d);
      if ((fire.prep || []).length) await new Promise((r) => setTimeout(r, 1300));
      for (const [n, d] of fire.go) hp(n, d);
      await new Promise((r) => setTimeout(r, waitMs)); T.hands.setFrozen(true);
      await new Promise((r) => { let k = 0; const f = () => (++k >= 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    }, { seats, fire, waitMs });
    if (opt.close) await page.evaluate(async ({ seat, d }) => {
      /* 設計對照用特寫（不是遊戲視角）：停掉遊戲的 rAF 迴圈、手動把相機貼近該席的手、渲染一次。 */
      const Y = window.__yaoshi3d, h = Y.tray.hands.group.children[seat], p = h.position.clone(); let n = 0; p.set(0, 0, 0); const q = p.clone(); h.updateMatrixWorld(true); h.traverse((o) => { if (o.isBone) { o.getWorldPosition(q); p.add(q); n++; } }); p.multiplyScalar(1 / n); const w = true;
      window.__raf0 = window.__raf0 || window.requestAnimationFrame; window.requestAnimationFrame = (cb) => { window.__held = cb; return 0; };
      await new Promise((r) => window.__raf0(() => window.__raf0(r))); // 已排隊的那一幀先跑完，之後遊戲迴圈不再動相機
      Y.camera.position.set(p.x + d[0], p.y + d[1], p.z + d[2]); Y.camera.lookAt(p.x, p.y, p.z); Y.camera.updateMatrixWorld(true);
      Y.renderer.render(Y.scene, Y.camera);
    }, { seat: 0, d: String(opt.close).split(',').length === 3 ? String(opt.close).split(',').map(Number) : [0, 0.30, 0.22] });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 90 });
  };
  const seatsFor = (role, seat) => [0, 1, 2, 3].map((id) => ({ id, role: id === seat ? role : ['qingmian', 'hongyi', 'xiaonv', 'zutou'][id] }));
  const jobs = JSON.parse(opt.jobs || '[]'); // [[role, seat, 'push'|'slam', slot]]
  for (const [role, seat, act, slot] of jobs) {
    const seats = seatsFor(role === 'default' ? 'qingmian' : role, seat);
    const fire = act === 'push' ? { go: [['ys:bid', { seat, slot, amount: 8 }]] } : { go: [['ys:mark', { seat, slot }]] };
    await shoot(`${opt.prefix || 'shot'}-${role}-s${seat}-${act}`, seats, fire, act === 'push' ? 170 : 300);
  }
  console.log(JSON.stringify({ errs: errs.slice(0, 5), out: OUT }));
  await ctx.close();
} finally { await browser?.close(); server.kill(); }
