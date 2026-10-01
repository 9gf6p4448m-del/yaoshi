/* 席位之手 第二輪：橫式遮擋量測＋連續幀拼圖（使用者看不到動態，只能看截圖）。
   ① 遮擋：每 2 幀在離屏目標上畫兩趟——拍品（托盤上每一格的紙紮妖／詛咒堆，各一個純色、不打光）＋手（原材質）、
      以及只有拍品——逐格數像素：被手蓋掉的比例＝(只有拍品 − 有手)／只有拍品。深度照常測，手在拍品後面就不算遮。
      另畫一趟「只有手」數非黑像素＝手佔整個畫面的比例。量完同一個同步區段內還原，不跨幀。
   ② 決定性：把 requestAnimationFrame 換成手動時鐘（同 table-framing-check --all 的做法），每步 1/60 秒。
   ③ --sheets=<資料夾>：推／拍／收各 6 幀等距、AI 一次推多格、熱座清場＋跳過前後、進入對決前後，拼成 jpg。
   跑法：node tests/tools/hands-occlusion.mjs [--root=<樹>] [--out=<json>] [--sheets=<資料夾>] [--port=8983]
   只量橫式 L（使用者裁定只玩橫式）。 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = {}; for (const a of process.argv.slice(2)) { const m = a.match(/^--([a-z]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; }
const ROOT = opt.root ? path.resolve(opt.root) : HERE;
const PORT = Number(opt.port || 8983);
const SHEETS = opt.sheets ? path.resolve(HERE, opt.sheets) : null;
const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
if (SHEETS) fs.mkdirSync(SHEETS, { recursive: true });

const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const errors = [];
let browser, result;
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
    if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
    if (!st.d) await page.click('#mainbtn').catch(() => {});
    else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
    await page.waitForTimeout(20);
  }
  await page.evaluate(async () => {
    const T = await import('three');
    const Y = window.__yaoshi3d; await Y.tray.loaded(); if (Y.tray.hands.ready) await Y.tray.hands.ready();
    Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear();
    /* 手動時鐘（同 table-framing-check）：renderer 的 frame() 從此只在 step() 時跑，每步 1/60 秒。 */
    const native = requestAnimationFrame.bind(window); await new Promise(native);
    const queue = []; let id = 0; window.requestAnimationFrame = (cb) => { queue.push(cb); return ++id; };
    await new Promise(native);
    const clock = { now: performance.now(), step() { const cbs = queue.splice(0); if (!cbs.length) throw new Error('rAF queue empty'); clock.now += 1000 / 60; for (const cb of cbs) cb(clock.now); } };
    const W = 426, H = 196, rt = new T.WebGLRenderTarget(W, H), buf = new Uint8Array(W * H * 4);
    const COLORS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1]];
    const itemMats = COLORS.map((c) => new T.MeshBasicMaterial({ color: new T.Color(c[0], c[1], c[2]), toneMapped: false, fog: false }));
    const visibleChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const itemRoots = () => Y.tray.group.children.filter((o) => !o.name && o.visible && o.isObject3D);
    const handMeshes = () => { const out = []; Y.tray.hands.group.children.forEach((h) => { if (h.visible) h.traverse((o) => { if (o.isSkinnedMesh) out.push(o); }); }); return out; };
    function measure() {
      const R = Y.renderer, scene = Y.scene, cam = Y.camera;
      const hands = handMeshes();
      const roots = itemRoots();
      const items = roots.map((r) => { const ms = []; r.traverse((o) => { if ((o.isMesh || o.isSkinnedMesh) && visibleChain(o)) ms.push(o); }); return ms; });
      const saved = []; scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { saved.push([o, o.visible]); o.visible = false; } });
      const savedMat = []; items.forEach((ms, i) => ms.forEach((m) => { savedMat.push([m, m.material]); m.material = itemMats[i % 4]; m.visible = true; }));
      const bg = scene.background, cc = R.getClearColor(new T.Color()), ca = R.getClearAlpha();
      scene.background = null; R.setClearColor(0x000000, 1);
      const count = () => { R.setRenderTarget(rt); R.clear(); R.render(scene, cam); R.readRenderTargetPixels(rt, 0, 0, W, H, buf); const n = [0, 0, 0, 0]; let any = 0;
        for (let p = 0; p < W * H; p++) { const r = buf[p * 4], g = buf[p * 4 + 1], b = buf[p * 4 + 2]; if (r || g || b) any++;
          for (let k = 0; k < 4; k++) { const c = COLORS[k]; if ((c[0] ? r >= 250 : r <= 6) && (c[1] ? g >= 250 : g <= 6) && (c[2] ? b >= 250 : b <= 6)) { n[k]++; break; } } }
        return { n, any }; };
      hands.forEach((m) => { m.visible = true; });
      const withHands = count();
      hands.forEach((m) => { m.visible = false; });
      const without = count();
      /* 歸因：逐隻手各畫一趟（只有那一隻＋拍品），看是哪一席遮的 */
      const perHand = hands.map((m) => { m.visible = true; const c = count(); m.visible = false;
        return { hand: m.parent && m.parent.parent ? (m.parent.parent.name || m.parent.name) : '?', occl: without.n.map((a, i) => (a >= 40 ? +((a - c.n[i]) / a).toFixed(4) : null)) }; });
      items.forEach((ms) => ms.forEach((m) => { m.visible = false; }));
      const bright = new T.MeshBasicMaterial({ vertexColors: true, color: new T.Color(8, 8, 8), toneMapped: false, fog: false });
      const hm = hands.map((m) => [m, m.material]);
      hands.forEach((m) => { bright.alphaHash = !!m.material.alphaHash; bright.transparent = !!m.material.transparent; bright.alphaTest = m.material.alphaTest || 0; m.material = bright; m.visible = true; });
      const handOnly = count();
      hm.forEach(([m, mat]) => { m.material = mat; });
      bright.dispose();
      savedMat.forEach(([m, mat]) => { m.material = mat; });
      saved.forEach(([o, v]) => { o.visible = v; });
      scene.background = bg; R.setClearColor(cc, ca); R.setRenderTarget(null);
      const per = without.n.map((a, i) => (a >= 40 ? (a - withHands.n[i]) / a : null));
      return { hands: hands.length, items: roots.length, itemPx: without.n, occl: per, perHand, handShare: handOnly.any / (W * H) };
    }
    window.__ho = { clock, measure, ev: (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d })) };
  });

  /** 一段動作：派事件、走 steps 步，每 2 步量一次；shots＝要截圖的步數。 */
  async function scenario(name, prep, fire, steps, shots = []) {
    await page.evaluate(({ prep }) => { const Y = window.__yaoshi3d; Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear(); for (const [n, d] of prep) window.__ho.ev(n, d); }, { prep });
    if (prep.length) await page.evaluate(() => { for (let i = 0; i < 100; i++) window.__ho.clock.step(); });
    await page.evaluate(({ fire }) => { for (const [n, d] of fire) window.__ho.ev(n, d); }, { fire });
    const samples = [], frames = [];
    for (let s = 1; s <= steps; s++) {
      const m = await page.evaluate(({ meas }) => { window.__ho.clock.step(); return meas ? window.__ho.measure() : null; }, { meas: s % 2 === 0 });
      if (m) { m.step = s; samples.push(m); }
      if (shots.includes(s)) frames.push({ label: `${name} t=${(s / 60).toFixed(2)}s`, buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
    }
    const live = samples.filter((x) => x.hands > 0);
    const occ = live.flatMap((x) => x.occl.filter((v) => v !== null));
    const perSampleMax = live.map((x) => Math.max(0, ...x.occl.filter((v) => v !== null)));
    return { name, samples: samples.length, samplesWithHands: live.length,
      occlusionMax: occ.length ? Math.max(...occ) : 0, occlusionMeanOfFrameMax: perSampleMax.length ? perSampleMax.reduce((a, b) => a + b, 0) / perSampleMax.length : 0,
      handShareMax: live.length ? Math.max(...live.map((x) => x.handShare)) : 0, handShareMean: live.length ? live.reduce((a, x) => a + x.handShare, 0) / live.length : 0,
      worst: live.slice().sort((a, b) => Math.max(0, ...b.occl.filter((v) => v !== null)) - Math.max(0, ...a.occl.filter((v) => v !== null)))[0] || null, frames };
  }
  const six = (n) => [0, 1, 2, 3, 4, 5].map((k) => 1 + Math.round(k * (n - 1) / 5));
  const bids = (list) => list.map(([s, k, a]) => ['ys:bid', { seat: s, slot: k, amount: a }]);
  const runs = [];
  runs.push(await scenario('推', [], bids([[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]), 46, six(44)));
  runs.push(await scenario('推（四家同一格）', [], bids([[0, 2, 3], [1, 2, 6], [2, 2, 8], [3, 2, 12]]), 46));
  runs.push(await scenario('拍', [], [0, 1, 2, 3].map((s) => ['ys:mark', { seat: s, slot: (s + 1) % 4 }]), 56, six(54)));
  runs.push(await scenario('收', bids([[0, 1, 3], [1, 1, 6], [2, 1, 8], [3, 1, 5]]), [['ys:reveal-result', { slot: 1, winner: 3 }]], 62, six(60)));
  /* 第四輪：一席推多格改排隊，整段演出最長 ≈1.56 秒——量測窗從 46 步（0.77 秒）拉到 100 步（1.67 秒），排隊後段也量到 */
  runs.push(await scenario('AI 一次推多格', [], bids([1, 2, 3].flatMap((s) => [0, 1, 2, 3].map((k) => [s, k, 2 + ((s + k) % 6)]))), 100, six(98)));
  const eight = (n) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => 1 + Math.round(k * (n - 1) / 7));
  runs.push(await scenario('南席一次推四格', [], bids([0, 1, 2, 3].map((k) => [0, k, 3 + k])), 100, eight(96)));
  /* 熱座清場與跳過：前後各一幀 */
  /* 第三輪：西席起手／收錢特寫（裁出西席信物附近的畫面），看手與收驚婆香爐有沒有相交 */
  const westClip = await page.evaluate(() => { const Y = window.__yaoshi3d, p = Y.tray.props.seatPosition(2), v = Y.camera.position.clone().set(p.x, p.y, p.z).project(Y.camera);
    const x = (v.x + 1) * innerWidth / 2, y = (1 - v.y) * innerHeight / 2; return { x: Math.max(0, x - 150), y: Math.max(0, y - 110), width: 300, height: 190 }; });
  const west = [];
  const westShot = async (label) => west.push({ label, buf: await page.screenshot({ type: 'jpeg', quality: 80, scale: 'css', clip: westClip }) });
  await page.evaluate(() => { const Y = window.__yaoshi3d; Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear(); window.__ho.ev('ys:bid', { seat: 2, slot: 1, amount: 8 }); });
  for (let s = 1; s <= 18; s++) { await page.evaluate(() => window.__ho.clock.step()); if ([1, 4, 8, 12, 18].includes(s)) await westShot(`西席推 起手 t=${(s / 60).toFixed(2)}s`); }
  await page.evaluate(() => { for (let i = 0; i < 60; i++) window.__ho.clock.step(); window.__ho.ev('ys:bid', { seat: 0, slot: 1, amount: 9 }); for (let i = 0; i < 60; i++) window.__ho.clock.step(); window.__ho.ev('ys:reveal-result', { slot: 1, winner: 0 }); });
  for (let s = 1; s <= 40; s++) { await page.evaluate(() => window.__ho.clock.step()); if ([14, 26, 34, 40].includes(s)) await westShot(`西席收（錢拖回香爐旁）t=${(s / 60).toFixed(2)}s`); }
  const special = [];
  await page.evaluate(() => { const Y = window.__yaoshi3d; Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear(); });
  await page.evaluate(() => { for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) window.__ho.ev('ys:bid', { seat: s, slot: k, amount: a }); for (let i = 0; i < 10; i++) window.__ho.clock.step(); });
  special.push({ label: '熱座清場前（推到一半）', buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
  const afterHandoff = await page.evaluate(() => { for (let s = 0; s < 4; s++) for (let k = 0; k < 4; k++) window.__ho.ev('ys:bid', { seat: s, slot: k, amount: 0 }); window.__ho.clock.step(); return window.__yaoshi3d.tray.hands.group.children.filter((h) => h.visible).length; });
  special.push({ label: `熱座清場後下一幀（可見手 ${afterHandoff}）`, buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
  await page.evaluate(() => { for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) window.__ho.ev('ys:bid', { seat: s, slot: k, amount: a }); for (const s of [0, 1, 2, 3]) window.__ho.ev('ys:mark', { seat: s, slot: s }); for (let i = 0; i < 10; i++) window.__ho.clock.step(); });
  special.push({ label: '跳過前（推＋拍中途）', buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
  const afterSkip = await page.evaluate(() => { window.__ho.ev('ys:fx-trait-cancel', {}); window.__ho.clock.step(); return window.__yaoshi3d.tray.hands.group.children.filter((h) => h.visible).length; });
  special.push({ label: `跳過後下一幀（可見手 ${afterSkip}）`, buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
  /* 進入對決：前後各一幀（ys:duel → tray.setVisible(false)，手在 tray 的 group 裡） */
  const duel = [];
  await page.evaluate(() => { const Y = window.__yaoshi3d; Y.tray.props.clearRound(); Y.tray.hands.clear && Y.tray.hands.clear(); for (const [s, k, a] of [[0, 1, 8], [1, 2, 5], [2, 0, 3], [3, 3, 6]]) window.__ho.ev('ys:bid', { seat: s, slot: k, amount: a }); for (let i = 0; i < 12; i++) window.__ho.clock.step(); });
  duel.push({ label: '進入對決前一幀', buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
  const afterDuel = await page.evaluate(() => { window.__ho.ev('ys:duel', {}); for (let i = 0; i < 3; i++) window.__ho.clock.step(); const Y = window.__yaoshi3d; let vis = 0; Y.tray.hands.group.traverse((o) => { if (o.isSkinnedMesh) { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) v = false; if (v) vis++; } }); return { trayVisible: Y.tray.visible(), handsRendered: vis }; });
  duel.push({ label: `進入對決後（托盤 visible=${afterDuel.trayVisible}、畫得到的手 ${afterDuel.handsRendered}）`, buf: await page.screenshot({ type: 'jpeg', quality: 70, scale: 'css' }) });
  result = { root: ROOT, runs: runs.map(({ frames, ...r }) => r), handoff: { visibleAfter: afterHandoff }, skip: { visibleAfter: afterSkip }, duel: afterDuel, errors };
  if (SHEETS) {
    const sheet = async (file, title, frames, cols) => {
      const imgs = frames.map((f) => `<figure><img src="data:image/jpeg;base64,${f.buf.toString('base64')}"><figcaption>${f.label}</figcaption></figure>`).join('');
      const p2 = await ctx.newPage();
      await p2.setViewportSize({ width: cols * 430, height: 300 });
      await p2.setContent(`<html><body style="margin:0;background:#111;color:#ddd;font:13px sans-serif"><div style="padding:4px 8px">${title}</div><div style="display:grid;grid-template-columns:repeat(${cols},426px);gap:4px;padding:0 4px 4px">${imgs}</div><style>figure{margin:0}img{width:426px;display:block}figcaption{padding:2px 0}</style></body></html>`);
      await p2.screenshot({ path: path.join(SHEETS, file), type: 'jpeg', quality: 72, fullPage: true });
      await p2.close();
    };
    const fr = (n) => runs.find((r) => r.name === n).frames;
    await sheet('sheet-push.jpg', '推：6 幀等距（0～0.72 秒）', fr('推'), 3);
    await sheet('sheet-slam.jpg', '拍：6 幀等距（0～0.9 秒）', fr('拍'), 3);
    await sheet('sheet-rake.jpg', '收：6 幀等距（開標後 0～1.0 秒；東席得標）', fr('收'), 3);
    await sheet('sheet-multi.jpg', 'AI 一次推多格（北／西／東各推四格，排隊）：6 幀等距（0～1.63 秒）', fr('AI 一次推多格'), 3);
    await sheet('sheet-queue4.jpg', '南席一次推四格（排隊：0.42／+0.06+0.22×3）：8 幀等距（0～1.6 秒）', fr('南席一次推四格'), 4);
    await sheet('sheet-handoff-skip.jpg', '熱座清場／跳過：前後各一幀', special, 2);
    await sheet('sheet-duel.jpg', '進入對決：前後各一幀', duel, 2);
    await sheet('sheet-west-closeup.jpg', '西席起手／收錢特寫（收驚婆香爐附近）', west, 3);
  }
} finally { await browser?.close(); server.kill(); }
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), JSON.stringify(result, null, 1));
const summary = Object.fromEntries(result.runs.map((r) => [r.name, { occlMax: +r.occlusionMax.toFixed(4), occlMeanFrameMax: +r.occlusionMeanOfFrameMax.toFixed(4), handShareMax: +r.handShareMax.toFixed(4), handShareMean: +r.handShareMean.toFixed(4), n: r.samplesWithHands }]));
/* 第二輪加嚴的自我驗收：橫式三動作（含同格、一次多格）每一格拍品被手遮住的比例，最大值 ≤10%；每段都要真的有手上場（活性）。 */
const gates = {
  occlusion_le_10pct: result.runs.every((r) => r.samplesWithHands > 5 && r.occlusionMax <= 0.10),
  handoffClears: result.handoff.visibleAfter === 0, skipClears: result.skip.visibleAfter === 0,
  duelHides: result.duel.trayVisible === false && result.duel.handsRendered === 0, noPageErrors: result.errors.length === 0,
};
result.gates = gates; result.pass = Object.values(gates).every(Boolean);
if (opt.out) fs.writeFileSync(path.resolve(HERE, opt.out), JSON.stringify(result, null, 1));
console.log(JSON.stringify({ gates, pass: result.pass, summary, handoff: result.handoff, skip: result.skip, duel: result.duel, errors: result.errors.slice(0, 5) }, null, 1));
process.exit(result.pass ? 0 : 1);
