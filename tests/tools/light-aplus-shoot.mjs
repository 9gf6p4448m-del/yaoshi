// v0.65.0 光影 A+ 治具（凍結 docs/experiments/2026-10-08-light-aplus/acceptance.md #2／#3／#4／#5）。
//
// 「跨頁同一凍結幀」的做法：Playwright 假時鐘（page.clock）從載入前就暫停，遊戲的 setTimeout／rAF／performance.now
// 只在治具呼叫 runFor 時前進；每一步前先等網路靜止＋實時 150ms（GLB／圖片解碼），所以拍品載入落在同一個虛擬時刻。
// 兩棵樹（v0.64.0 基準與本分支）或同一棵樹兩個網址，走同一串輸入到同一個虛擬時刻＝同一幀，才能逐像素比。
// 這支治具本身的鑑別力：同一棵樹同網址跑兩次要 0 像素差（決定性），A+ 對基準要 >0（見 README）。
//
// 用法：node tests/tools/light-aplus-shoot.mjs <root> <query> <scene: bid|reveal|phone> <outPrefix> [--perf] [--cycle]
//   產出 <outPrefix>.png（凍結幀）、<outPrefix>.json（燈數、program 數、陰影統計、HUD 方框）；
//   A+ 開著時另出 <outPrefix>-nosh.png（同一幀、陰影取樣關掉＝bias −10，不重編 shader）。
//   --perf：凍結幀拍完後改真實時間量 draw call／CPU（量法同示意 shoot-light.mjs：每段 2.5 秒交錯兩輪由呼叫端排）。
//   --mock=<light-mock.js>：（只對 v0.64.0 樹）同一凍結幀再套示意 A／B／C／A+／base 各拍一張 <outPrefix>-mock*.png。
//   --cycle：拍完後繼續把遊戲推到下一夜開標前，記錄每次換場的 program 數與燈數。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const { chromium } = createRequire(path.join(REPO, 'tools/anyCreature/package.json'))('playwright');
const [ROOT, QUERY = '', SCENE = 'bid', OUT] = process.argv.slice(2);
const PERF = process.argv.includes('--perf'), CYCLE = process.argv.includes('--cycle');
const TUNE = (process.argv.find((x) => x.startsWith('--tune=')) || '').slice(7) || null; // 調光試驗 JSON（陣列）
const MOCK = (process.argv.find((x) => x.startsWith('--mock=')) || '').slice(7) || null; // 示意 light-mock.js 的路徑（唯讀）
if (!ROOT || !OUT) { console.error('usage: light-aplus-shoot.mjs <root> <query> <bid|reveal|phone> <outPrefix> [--perf] [--cycle]'); process.exit(2); }
const PORT = 9760 + Math.floor(Math.random() * 200);
const SEED = 3;
const VP = SCENE === 'phone' ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const SAFE = SCENE === 'phone' ? [0, 47, 21, 47] : [0, 0, 0, 0];
const WANT = SCENE === 'reveal' ? 'reveal' : 'bid';

const SCREEN = `(() => {
  const $ = (id) => document.getElementById(id);
  const on = (id) => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none'; };
  if (on('review')) return 'review'; if (on('duel')) return 'duel';
  if (on('modal')) return 'modal'; if (on('handoff')) return 'handoff';
  if (!on('table')) return 'none';
  const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
  const sb = [...document.querySelectorAll('#stage button')];
  if (sb.some((e) => /passEvent|pickEventOpt|confirmEventNum/.test(e.getAttribute('onclick') || ''))) return 'event';
  if (/不盯任何一件/.test(t)) return 'mark';
  if (/^蓋牌/.test(t) && !dis) return 'bid';
  if (/下一件拍品|查看成交總覽/.test(t)) return 'reveal';
  return 'busy';
})()`;
const DRIVE_STEP = `(() => {
  const ho = document.getElementById('handoff');
  if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && /看最終結果/.test(txt) && !dis) return 2;
  if (b && !dis) { b.click(); return 0; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return 0; }
  }
  return 1;
})()`;
const PROBE = `(() => {
  const Y3 = window.__yaoshi3d, R = Y3.renderer; let lights = 0, spots = 0, shadowLights = 0, cast = [], recv = 0;
  Y3.scene.traverse((o) => { if (o.isLight) { lights++; if (o.isSpotLight) spots++; if (o.castShadow) shadowLights++; } if (o.castShadow) cast.push(o.name || o.type); if (o.receiveShadow) recv++; });
  const lots = Y3.tray.lotNodes ? Y3.tray.lotNodes() : [];
  const inLot = (o) => { for (let a = o; a; a = a.parent) if (lots.includes(a)) return true; return false; };
  let castOutside = 0; Y3.scene.traverse((o) => { if (o.castShadow && !o.isLight && !inLot(o)) castOutside++; });
  return { programs: R.info.programs.length, lights, spots, shadowLights, casters: cast.length, castOutside, receivers: recv,
    shadowEnabled: R.shadowMap.enabled, autoUpdate: R.shadowMap.autoUpdate, exposure: R.toneMappingExposure, env: !!Y3.scene.environment,
    lotCount: lots.length, shadowRenders: window.__shadowRenders || 0, fx: Y3.lightFx ? Y3.lightFx.stats() : null };
})()`;
const HUD = `(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (!e || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, text: (e.textContent || '').trim().slice(0, 40) }; };
  return { mainbtn: r('#mainbtn'), revealCard: r('#revealCard'), wish: r('.wishbar'), feltHead: r('#feltHead') };
})()`;

const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const out = { root: ROOT, query: QUERY, scene: SCENE, viewport: VP, seed: SEED, errors: [], console: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  // 假時鐘的 performance.now 起點在 1～5ms 之間跳（Playwright 安裝時對真實 timeOrigin 取整），renderer 開頁讀到的 lastT 跟著跳，
  // 之後每幀 dt 序列（煙粒重生、燈籠閃爍相位）就不同。實測起點相同的兩次執行逐像素相同，所以起點不是 READY_AT 就整頁重開（最多 20 次）。
  // 這是治具的決定性條件（與受測版本無關、各樹同一規則），不是挑結果。
  const READY_AT = 1;
  let ctx, page, inflight = 0, quiet, run;
  for (let attempt = 0; ; attempt++) {
    ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
    // 亂數分四條流：particles.js（煙／火星，在 rAF 裡重生）、three.module.js（generateUUID，不影響畫面）、其他 js/ 3D 模組、其餘（頁面本身）。
    // 共用一條流時，各來源呼叫的交錯順序受非同步載入（GLB 到達時刻）影響，同一凍結幀的煙粒位置與 UI 亂數會在兩次執行間不同（實測 1754 px）；
    // 分流後每條流只依自己的呼叫序。
    await ctx.addInitScript(() => { const mk = (seed) => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }; const ui = mk(20260926), px = mk(777001), th = mk(5150), g3 = mk(9091); window.__rc = { u: 0, p: 0, t: 0, g: 0 }; Math.random = function () { const st = new Error().stack || ''; if (/particles\.js/.test(st)) { window.__rc.p++; return px(); } if (/three\.module\.js/.test(st)) { window.__rc.t++; return th(); } if (/\/js\/[^\s]*\.js/.test(st)) { window.__rc.g++; return g3(); } window.__rc.u++; return ui(); };
      let c = 777; crypto.getRandomValues = function (arr) { for (let i = 0; i < arr.length; i++) { c = (c * 1103515245 + 12345) >>> 0; arr[i] = (c >>> 16) & 0xff; } return arr; }; });
    await ctx.addInitScript((safe) => {
      try { localStorage.setItem('yaoshi_intro_v1', '1'); localStorage.setItem('__lfSafe', JSON.stringify(safe)); } catch (e) {}
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`;
        document.head.appendChild(s);
      });
    }, SAFE);
    page = await ctx.newPage();
    inflight = 0;
    page.on('request', () => { inflight++; });
    page.on('requestfinished', () => { inflight--; });
    page.on('requestfailed', () => { inflight--; });
    page.on('pageerror', (e) => out.errors.push(String(e.message || e)));
    page.on('console', (m) => { if (m.type() === 'error') out.console.push(m.text()); });
    const T0 = new Date('2026-10-08T12:00:00Z').getTime();
    await page.clock.install({ time: T0 });
    await page.clock.pauseAt(T0 + 1000);
    // 推虛擬時間前一律先等：網路靜止＋托盤這一批 GLB 與手都到位（實時等，虛擬時間不動）⇒ 模型出現在同一個虛擬時刻
    quiet = async () => {
      for (let ok = 0, n = 0; ok < 3 && n < 600; n++) { await sleep(50); ok = inflight <= 0 ? ok + 1 : 0; }
      await page.evaluate(async () => { const T = window.__yaoshi3d && window.__yaoshi3d.tray; if (!T) return; await T.loaded(); if (T.hands && T.hands.ready) await T.hands.ready(); });
      await sleep(150);
    };
    run = async (ms) => { await quiet(); await page.clock.runFor(ms); };
    await page.goto(`http://127.0.0.1:${PORT}/index.html${QUERY}`, { waitUntil: 'load' });
    // 3D 起來之前不推虛擬時間（實時等）：renderer 的第一幀時間戳才不會隨載入快慢漂移
    const ready3d = 'typeof window.__yaoshi === "object" && typeof window.__yaoshi3d === "object" && !!window.__yaoshi3d.tray';
    for (let i = 0; i < 600 && !(await page.evaluate(ready3d)); i++) await sleep(100);
    for (let i = 0; ; i++) { if (i > 400) throw new Error('3D 沒起來'); if (await page.evaluate(ready3d)) break; await run(50); }
    out.readyAtVirtual = await page.evaluate(() => performance.now());
    out.attempts = attempt + 1;
    if (out.readyAtVirtual === READY_AT) break;
    if (attempt >= 19) throw new Error('假時鐘起點 20 次都不是 ' + READY_AT + '：' + out.readyAtVirtual);
    out.errors.length = 0; out.console.length = 0;
    await ctx.close();
  }
  // 對齊到同一個虛擬起點（A+ 開頁多烘一張環境圖，就緒時刻曾晚 1ms；之後全部輸入在同一條虛擬時間軸上）
  await page.clock.runFor(Math.max(0, 50 - Math.ceil(out.readyAtVirtual)));
  await page.evaluate(() => {
    const R = window.__yaoshi3d.renderer, sm = R.shadowMap, orig = sm.render; window.__shadowRenders = 0;
    sm.render = function (lights, scene, camera) { if (sm.enabled && (sm.autoUpdate || sm.needsUpdate) && lights.length) window.__shadowRenders++; return orig.call(this, lights, scene, camera); };
  });
  out.atLoad = await page.evaluate(PROBE);
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate(() => startEntry('solo'));
  for (let i = 0; ; i++) { if (i > 200) throw new Error('選角頁沒出現'); await run(50); if (await page.evaluate(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0)) break; }
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await run(100);
  await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', sd, SEL.picks); }, SEED);
  const driveTo = async (want, minRound = 0) => {
    for (let i = 0, idle = 0; ; i++) {
      if (i > 6000) throw new Error('stuck driving to ' + want);
      await run(16);
      const st = await page.evaluate(SCREEN);
      if (st === want && (await page.evaluate(() => window.__yaoshi.S.round)) >= minRound) return;
      const r = await page.evaluate(DRIVE_STEP);
      if (r === 2) throw new Error('reached end');
      idle = r === 1 ? idle + 1 : 0;
      if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
    }
  };
  await driveTo(WANT, 1);
  for (let i = 0; i < 18; i++) await run(100); // 鏡頭與托盤演出收斂（虛擬 1.8 秒，與示意同）
  // 凍結（同示意 shoot-light.mjs）：rAF 回呼收到固定時間戳 ⇒ renderer 的 dt=0、導演的 now 不動，照樣每幀重畫。
  // 之後每一張都是「同一個 3D 狀態重畫一幀」：主圖、陰影取樣關掉、示意各案，彼此只差燈光。
  await page.evaluate(() => { const raf = window.requestAnimationFrame; window.__freezeT = performance.now(); window.requestAnimationFrame = (cb) => raf((t) => cb(window.__freezeT == null ? t : window.__freezeT)); });
  await page.clock.runFor(50);
  out.state = await page.evaluate(() => ({ round: window.__yaoshi.S.round, btn: document.getElementById('mainbtn').textContent }));
  out.frozen = await page.evaluate(PROBE);
  out.det = await page.evaluate(() => { const Y3 = window.__yaoshi3d; const lan = []; Y3.scene.traverse((o) => { if (o.isPointLight && o.userData.baseIntensity) lan.push(+o.intensity.toFixed(6)); }); const sp = Y3.smoke.points.geometry.attributes.position.array; return { rc: { ...window.__rc }, now: performance.now(), lan, smoke0: [sp[0], sp[1], sp[2]].map((v) => +v.toFixed(5)), cam: Y3.camera.position.toArray().map((v) => +v.toFixed(5)) }; });
  out.hud = await page.evaluate(HUD);
  await quiet();
  const shot = async (suffix) => { await page.clock.runFor(34); await page.screenshot({ path: OUT + suffix + '.png', animations: 'disabled' }); };
  await shot('');
  // 3D 像素遮罩用：同一刻把 3D 畫布藏起來再拍（只剩 HUD 與網頁底色）；與上一張差 >4 的像素＝3D 透得出來的地方
  await page.evaluate(() => { document.querySelectorAll('canvas').forEach((c) => { c.dataset.vis = c.style.visibility; c.style.visibility = 'hidden'; }); });
  await page.screenshot({ path: OUT + '-nocanvas.png', animations: 'disabled' });
  await page.evaluate(() => { document.querySelectorAll('canvas').forEach((c) => { c.style.visibility = c.dataset.vis || ''; }); });
  // 靜止幀：凍結中再跑 1 秒虛擬時間（約 60 幀），數陰影圖重畫次數與每幀 draw
  await page.evaluate(() => { window.__shadowRenders = 0; window.__gldc = 0; const gl = window.__yaoshi3d.renderer.getContext(); for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = gl[f].bind(gl); gl[f] = (...a) => { window.__gldc++; return o(...a); }; } const R = window.__yaoshi3d.renderer, orig = R.render.bind(R); window.__frames = 0; R.render = (s, c) => { window.__frames++; return orig(s, c); }; });
  await page.clock.runFor(1000);
  out.still = await page.evaluate(() => ({ frames: window.__frames, shadowRenders: window.__shadowRenders, drawsPerFrame: window.__gldc / Math.max(1, window.__frames) }));
  await shot('-after');
  if (out.frozen.fx && out.frozen.fx.on) {
    // 同一幀、陰影取樣關掉（bias −10：深度比較恆通過；bias 是 uniform，不重編、不重畫陰影圖）
    await page.evaluate(() => { const s = window.__yaoshi3d.lightFx.spot; window.__bias = s.shadow.bias; s.shadow.bias = -10; });
    await shot('-nosh');
    await page.evaluate(() => { window.__yaoshi3d.lightFx.spot.shadow.bias = window.__bias; });
    await shot('-resh');
  }
  if (MOCK) {
    // 示意各案（lightmock/js/light-mock.js，唯讀引用）在同一凍結幀重畫：只在 v0.64.0 的頁上做（示意本來就套在 v0.64.0 上）
    await page.route('**/__lightmock.js', (r) => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(MOCK, 'utf8') }));
    await page.addScriptTag({ type: 'module', content: "import('./__lightmock.js').then(() => { window.__lmReady = true; }).catch((e) => { window.__lmErr = String(e); });" });
    for (let i = 0; i < 100 && !(await page.evaluate('window.__lmReady || window.__lmErr')); i++) await sleep(100);
    const err = await page.evaluate('window.__lmErr'); if (err) throw new Error(err);
    for (const v of ['A', 'B', 'C', 'Aplus', 'base']) {
      await page.evaluate((x) => window.__lightMock.apply(x), v);
      await page.clock.runFor(34);
      await shot('-mock' + v);
    }
  }
  if (TUNE) {
    // 調光試驗（只對 A+ 頁）：同一凍結幀改燈光 uniform（不增減燈、不重編）再拍；每案從 A+ 原值出發
    const variants = JSON.parse(fs.readFileSync(TUNE, 'utf8'));
    const orig = await page.evaluate(() => { const Y = window.__yaoshi3d, s = Y.lightFx.spot; const lan = []; let hemi = 0; Y.scene.traverse((o) => { if (o.isPointLight && o.userData.baseIntensity) lan.push(o.userData.baseIntensity); if (o.isHemisphereLight) hemi = o.intensity; }); return { si: s.intensity, ang: s.angle, pen: s.penumbra, tg: s.target.position.toArray(), pos: s.position.toArray(), lan, hemi, exp: Y.renderer.toneMappingExposure }; });
    for (let i = 0; i < variants.length; i++) {
      await page.evaluate(([o, v]) => { const Y = window.__yaoshi3d, s = Y.lightFx.spot; s.intensity = o.si * (v.spotK ?? 1); s.angle = v.angle ?? o.ang; s.penumbra = v.pen ?? o.pen; s.target.position.fromArray(v.target ?? o.tg); s.position.fromArray(v.pos ?? o.pos); s.target.updateMatrixWorld(); let k = 0; Y.scene.traverse((l) => { if (l.isPointLight && l.userData.baseIntensity) { l.userData.baseIntensity = o.lan[k++] * (v.lanK ?? 1); } if (l.isHemisphereLight) l.intensity = o.hemi * (v.hemiK ?? 1); }); Y.renderer.toneMappingExposure = v.exp ?? o.exp; Y.renderer.shadowMap.needsUpdate = true; }, [orig, variants[i]]);
      await shot('-tune' + i);
    }
  }
  await page.evaluate(() => { window.__freezeT = null; });
  if (CYCLE) {
    // 換場：開標前 → 揭盅 → … → 夜戰（對決）→ 下一夜開標前；每到一站記一次 program 數與燈數
    out.cycle = [{ at: 'bid1', ...(await page.evaluate(PROBE)) }];
    let sawDuel = false;
    for (const [want, round, tag] of [['reveal', 1, 'reveal1'], ['bid', 2, 'bid2'], ['bid', 3, 'bid3']]) {
      for (let i = 0, idle = 0; ; i++) {
        if (i > 8000) throw new Error('stuck cycle ' + tag);
        await run(16);
        const st = await page.evaluate(SCREEN);
        if (st === 'duel' && !sawDuel) { sawDuel = true; out.cycle.push({ at: 'duel' + round, ...(await page.evaluate(PROBE)) }); }
        if (st === want && (await page.evaluate(() => window.__yaoshi.S.round)) >= round) break;
        const r = await page.evaluate(DRIVE_STEP);
        if (r === 2) throw new Error('reached end');
        idle = r === 1 ? idle + 1 : 0;
        if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
      }
      for (let i = 0; i < 10; i++) await run(100);
      out.cycle.push({ at: tag, ...(await page.evaluate(PROBE)) });
      if (tag === 'bid2') sawDuel = false;
    }
  }
  if (PERF) {
    // 真實時間量效能：解除假時鐘暫停，2.5 秒
    await page.clock.resume();
    await sleep(1500);
    await page.evaluate(() => {
      const R = window.__yaoshi3d.renderer; window.__dc = []; window.__cpu = [];
      const raf = window.requestAnimationFrame.bind(window);
      let n0 = window.__gldc;
      const orig = R.render; R.render = function (s, c) { const a = performance.now(); const n = window.__gldc; const r = orig.call(this, s, c); window.__cpu.push(performance.now() - a); window.__dc.push(window.__gldc - n); return r; };
      window.__sr0 = window.__shadowRenders;
    });
    await sleep(2500);
    out.perf = await page.evaluate(() => { const med = (x) => { const s = [...x].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; }; return { frames: window.__dc.length, drawMed: med(window.__dc), drawMax: Math.max(...window.__dc), renderCpuMed: med(window.__cpu), shadowRenders: window.__shadowRenders - window.__sr0 }; });
  }
  await ctx.close();
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(OUT + '.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ state: out.state, frozen: out.frozen, still: out.still, errors: out.errors, console: out.console.slice(0, 5), cycle: out.cycle && out.cycle.map((c) => [c.at, c.programs, c.lights, c.shadowLights]), perf: out.perf }));
