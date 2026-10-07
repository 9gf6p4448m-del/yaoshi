/* v0.63.0 條件 3（＋4 的面數／材質）：批 3 三角色配件全部上場、色只落配件與袖口、皮膚無貼圖無 UV、手不縮放不改形（實頁、遊戲實際送進 GPU 的幾何）。
   node c3-features.mjs --root=<樹> [--q=handb3=0] [--out=<json>] [--port=8993]
   四席＝孝女白琴／閭山法師／普渡爐主／無角色（預設手，當同一隻手的對照）。基準樹或 ?handb3=0 ⇒ 預期紅（沒有專屬配件）。 */
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = path.resolve(opt.root || '.'), PORT = Number(opt.port || 8993);
const { chromium } = createRequire('C:/Users/shung/OneDrive/桌面/妖市/tools/anyCreature/package.json')('playwright');
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
let browser; const errs = [];
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html${opt.q ? '?' + opt.q : ''}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const T = window.__yaoshi3d.tray; await T.loaded(); await T.hands.ready();
    const roles = ['xiaonv', 'lvshan', 'luzhu', null], seats = roles.map((role, id) => ({ id, role }));
    T.props.setSeats(seats); T.hands.setSeats(seats);
    const st = T.hands.stats(), mesh = (s) => { let m = null; T.hands.group.children[s].traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; };
    const checks = []; const ok = (role, name, pass, value) => checks.push({ role, name, pass: !!pass, value });
    const NEED = { xiaonv: ['袖口', '麻布帶', '側結', '垂尾1', '垂尾2', '紙錢灰'], lvshan: ['袖口', ...Array.from({ length: 13 }, (_, i) => '念珠' + (i + 1)), '骨扳指（拇指）', '朱紅符形'], luzhu: ['袖口', '黃編繩1', '黃編繩2', '福袋', '玉戒（無名指）'] };
    const ref = mesh(3).geometry, refN = ref.userData.real ? ref.userData.real.nBase : 0;
    ['xiaonv', 'lvshan', 'luzhu'].forEach((role, s) => {
      const m = mesh(s), g = m.geometry, parts = g.userData.b1parts || [], idx = g.index.array, col = g.attributes.color, pos = g.attributes.position, sk = g.attributes.aSkin;
      const drawn = (p) => { let n = 0; for (let t = 0; t < idx.length; t += 3) if (idx[t] >= p.from && idx[t] < p.to) n++; return n; };
      ok(role, '這一席掛的是批 3 專屬幾何（variants＝角色鍵、userData.real.key＝角色）', st.variants[s] === role && g.userData.real && g.userData.real.key === role, { variant: st.variants[s], key: g.userData.real && g.userData.real.key });
      for (const n of NEED[role]) { const p = parts.find((x) => x.name === n); ok(role, `配件「${n}」有三角形送進 GPU`, p && drawn(p) > 0, p ? drawn(p) : null); }
      const nB = g.userData.real ? g.userData.real.nBase : 0;
      /* 手不改形：原手頂點（前 nBase 個）位置與預設手逐值相同 */
      let posDiff = 0, colSkin = 0, colCuff = 0; const CF = -0.08;
      if (nB === refN && nB > 0) for (let v = 0; v < nB; v++) {
        if (pos.getX(v) !== ref.attributes.position.getX(v) || pos.getY(v) !== ref.attributes.position.getY(v) || pos.getZ(v) !== ref.attributes.position.getZ(v)) posDiff++;
        const d = Math.abs(col.getX(v) - ref.attributes.color.getX(v)) + Math.abs(col.getY(v) - ref.attributes.color.getY(v)) + Math.abs(col.getZ(v) - ref.attributes.color.getZ(v));
        if (d > 1e-6) { if (pos.getZ(v) < CF) colCuff++; else colSkin++; }
      }
      ok(role, '手不縮放不改形（原手頂點位置與預設手逐值相同；seatMul＝1）', nB === refN && nB > 0 && posDiff === 0 && st.seatMul[s] === 1, { nBase: nB, refN, posDiff, seatMul: st.seatMul[s] });
      ok(role, '色只落袖口：原手頂點色與預設手不同者全在袖口區（z＜−0.08），皮膚區 0', nB === refN && nB > 0 && colSkin === 0 && colCuff > 0, { colSkin, colCuff });
      let skBad = 0, accBad = 0; const want = sk.getX(0); for (let v = 0; v < sk.count; v++) { const x = sk.getX(v); if (v < nB) { if (x !== want) skBad++; } else if (x !== 0) accBad++; }
      ok(role, '皮膚＝skin-proto 該角色那一組（原手 aSkin 全同一值且＝原 v0.62.5 的值 9/10/11）、配件 aSkin＝0', skBad === 0 && accBad === 0 && want === 9 + s, { aSkin: want, skBad, accBad });
      ok(role, '無 UV（程式生成皮膚）', !g.attributes.uv, Object.keys(g.attributes));
      ok(role, '每手 ≤6,500 面', idx.length / 3 <= 6500, idx.length / 3);
      if (role === 'lvshan') { const p = parts.find((x) => x.name === '朱紅符形'); let red = 0, n = 0; if (p) for (let v = p.from; v < p.to; v++) { n++; if (col.getX(v) > 0.3 && col.getY(v) < 0.1 && col.getZ(v) < 0.1) red++; }
        ok(role, '手背符形為朱紅（全部頂點）', p && n > 0 && red === n, { red, n }); }
    });
    const mat = mesh(0).material;
    ok('all', '四隻手一份材質、無任何貼圖', st.materials === 1 && !['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'aoMap', 'emissiveMap', 'alphaMap'].some((k) => mat[k]), { materials: st.materials, name: mat.name });
    return { stats: { variants: st.variants, trisByHand: st.trisByHand, materialNames: st.materialNames, b3: st.b3, b3Error: st.b3Error, seatMul: st.seatMul }, pass: checks.filter((c) => c.pass).length, total: checks.length, checks };
  });
  out.root = ROOT; out.q = opt.q || ''; out.errs = errs;
  const s = JSON.stringify(out, null, 1); if (opt.out) fs.writeFileSync(opt.out, s);
  console.log(JSON.stringify({ pass: out.pass, total: out.total, fails: out.checks.filter((c) => !c.pass).map((c) => c.role + '：' + c.name).slice(0, 8), stats: out.stats, errs }));
} finally { await browser?.close(); server.kill(); }
