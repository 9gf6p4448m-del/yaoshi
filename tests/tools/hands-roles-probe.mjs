/* 階段三 角色變體 實頁探針（凍結 V3 draw call／面數、V2 實頁接線）：L、P 各量一次。
   ① 實頁接線：用真實開局（newGame 指定你的角色）後，hands.stats().variants 必須與 renderer 傳給 props.setSeats 的 d.seats 同一份角色。
   ② 四席依序換成 收驚婆／當鋪／獵人／預設，經產品事件（ys:bid）讓四隻手上場並凍結：draw call 差（有手 vs 全收）≤4、每手面數 ≤2500。
   跑法：node tests/tools/hands-roles-probe.mjs [--out=<json>] [--port=8980]；退出碼：全部閘門 pass ⇒ 0。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const PORT = Number(opt.port || 8980);
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: HERE, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const out = {}; let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  for (const [lay, vp] of [['L', { width: 852, height: 393 }], ['P', { width: 393, height: 852 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    const role0 = lay === 'L' ? 'shoujing' : 'hunter';
    await page.evaluate((r) => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, [r]); }, role0);
    for (let i = 0; i < 400; i++) {
      const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
      if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
      if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
      await page.waitForTimeout(20);
    }
    if (lay === 'P') await page.addStyleTag({ content: '#rotateHint{display:none !important}' });
    const r = await page.evaluate(async () => {
      const Y = window.__yaoshi3d, T = Y.tray, H = T.hands, hp = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
      await T.loaded(); await H.ready();
      const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const calls = async () => { const info = Y.renderer.info; info.autoReset = false; info.reset(); await frames(2); const c = info.render.calls / 2, t = info.render.triangles / 2; info.autoReset = true; return { calls: c, tris: t }; };
      /* ① 實頁接線：開局後 renderer 實際傳進去的席位角色 */
      const wired = { variants: H.stats().variants.slice(), roles: window.__yaoshi.S.players ? window.__yaoshi.S.players.map((p) => p.role || p.roleId || p.id) : null };
      /* ② 三變體＋預設同場 */
      const seats = [{ id: 0, role: 'shoujing' }, { id: 1, role: 'dangpu' }, { id: 2, role: 'hunter' }, { id: 3, role: 'qingmian' }];
      T.props.setSeats(seats); H.setSeats(seats);
      T.props.clearRound(); H.clear();
      for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) hp('ys:bid', { seat: s, slot: k, amount: a });
      for (let i = 0; i < 60 && H.stats().visible.length < 4; i++) await frames(1);
      H.setFrozen(true);
      await new Promise((res) => setTimeout(res, 900));
      const on = await calls(), vis = H.stats().visible.length, st = H.stats();
      H.finish(); await frames(2);
      const off = await calls(); H.setFrozen(false);
      return { wired, handsVisible: vis, callsWithHands: on.calls, callsWithout: off.calls, delta: on.calls - off.calls, trisDelta: on.tris - off.tris, trisByHand: st.trisByHand, variants: st.variants, materials: st.materials, geometries: st.geometries, variantBuilds: st.variantBuilds };
    });
    out[lay] = { viewport: vp, errors: errs, ...r };
    await ctx.close();
  }
} finally { if (browser) await browser.close(); server.kill(); }
const all = (f) => ['L', 'P'].every((k) => f(out[k]));
out.gates = {
  V3_drawCallDelta_le4: all((x) => x.handsVisible === 4 && x.delta <= 4 && x.delta >= 1),
  V3_trisPerHand_le2500: all((x) => x.trisByHand.every((t) => t <= 2500)),
  V3_oneMaterial: all((x) => x.materials === 1),
  V1_variantsLive: all((x) => JSON.stringify(x.variants) === JSON.stringify(['shoujing', 'dangpu', 'hunter', null])),
  V2_wiredFromRealGame: all((x) => x.wired.variants.length === 4),
  noPageErrors: all((x) => x.errors.length === 0),
};
out.pass = Object.values(out.gates).every(Boolean);
const s = JSON.stringify(out, null, 1); console.log(s);
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), s);
process.exit(out.pass ? 0 : 1);
