// 盯牌令牌丙 §7 效能量具（凍結檔 docs/experiments/2026-10-08-mark-bing/acceptance.md）。
// 由 tests/tools/light-aplus-perf.mjs 複製，量法逐行相同（關 vsync、DPR 1、1280×720、到達場景後等 0.8 秒＋1.8 秒、量 2.5 秒；
// draw call＝每次 renderer.render 送出的 drawElements／drawArrays（含 Instanced、含陰影圖）；CPU＝同一 rAF 時間戳下回呼 JS 合計）。
// 只新增場景 'mark'：走到第 1 夜「不盯任何一件」畫面，托盤載入後立刻 props.mark＋hands.mark（南 0、西 2、東 3 三家同盯槽 1），
//   等同樣的 2.6 秒後量 2.5 秒（令牌已落定、手已收）。另記量測窗內所有 prop-token* InstancedMesh 的 setMatrixAt 呼叫數
//   （staticTokenWrites，靜止時應為 0）與 drawcall 計數器。bid／reveal 仍請用 light-aplus-perf.mjs（不改原量具）。
// 用法：node tests/tools/mark-perf.mjs <root> <query> mark <out.json> [--mm=Cp]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(HERE, '../../tools/anyCreature/package.json'))('playwright');
const [ROOT, QUERY = '', SCENE = 'bid', OUTF] = process.argv.slice(2);
// --vsync：不關 vsync、不解鎖幀率（rAF 約 60Hz）。覆審 HIGH-1：不鎖幀時重畫比會被高幀率稀釋，所以「每幀陰影重畫比」與 draw 中位數以 60Hz 這組為準。
const VSYNC = process.argv.includes('--vsync');
const CAM_TRIGGER = process.argv.includes('--cam-trigger');
const MM = (process.argv.find((a) => a.startsWith('--mm=')) || '').slice(5) || null; // 只給示意樹（window.__MM）
const PORT = 9960 + Math.floor(Math.random() * 30);
const SEED = 3;
const VP = SCENE === 'phone' ? { width: 844, height: 390 } : { width: 1280, height: 720 };
const SAFE = SCENE === 'phone' ? [0, 47, 21, 47] : [0, 0, 0, 0];
const WANT = SCENE === 'reveal' ? 'reveal' : SCENE === 'mark' ? 'mark' : 'bid';

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

const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist', ...(VSYNC ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit'])] });
const out = { root: ROOT, query: QUERY, scene: SCENE, errors: [] };
try {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { let a = 20260926; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await ctx.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.__rafStats = null;
    window.requestAnimationFrame = (cb) => raf((t) => {
      const st = window.__rafStats; if (!st) return cb(t);
      const a = performance.now(); cb(t); const d = performance.now() - a;
      st.byT.set(t, (st.byT.get(t) || 0) + d);
    });
  });
  if (MM) await ctx.addInitScript((mm) => { window.__MM = mm; }, MM);
  await ctx.addInitScript((safe) => {
    try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = `:root{--safe-top:${safe[0]}px!important;--safe-right:${safe[1]}px!important;--safe-bottom:${safe[2]}px!important;--safe-left:${safe[3]}px!important}`; document.head.appendChild(s); });
  }, SAFE);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errors.push(String(e.message || e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html${QUERY}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && typeof window.__yaoshi3d === "object" && !!window.__yaoshi3d.tray', null, { timeout: 60000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate(() => startEntry('solo'));
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(100);
  await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', sd, SEL.picks); }, SEED);
  await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
  for (let i = 0, idle = 0; ; i++) {
    if (i > 20000) throw new Error('stuck');
    await page.waitForTimeout(10);
    if (await page.evaluate(SCREEN) === WANT) break;
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) throw new Error('reached end');
    idle = r === 1 ? idle + 1 : 0;
    if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
  }
  out.state = await page.evaluate(() => ({ round: window.__yaoshi.S.round, btn: document.getElementById('mainbtn').textContent }));
  await page.evaluate(async () => { await window.__yaoshi3d.tray.loaded(); });
  if (SCENE === 'mark') {
    await page.waitForFunction(() => window.__yaoshi3d.tray.hands.loaded(), null, { timeout: 30000 });
    await page.evaluate(() => { const T = window.__yaoshi3d.tray; for (const s of [0, 2, 3]) { T.props.mark(s, 1); T.hands.mark(s, 1); } });
  }
  await page.waitForTimeout(1800 + 800);
  await page.evaluate(() => {
    const R = window.__yaoshi3d.renderer, orig = R.render.bind(R), gl = R.getContext(); let n = 0;
    for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = gl[f].bind(gl); gl[f] = (...a) => { n++; return o(...a); }; }
    window.__dc = []; R.render = (s, c) => { n = 0; orig(s, c); if (window.__dcOn) window.__dc.push(n); };
    const sm = R.shadowMap, so = sm.render; window.__sr = 0;
    sm.render = function (l, s, c) { if (window.__dcOn && sm.enabled && (sm.autoUpdate || sm.needsUpdate) && l.length) window.__sr++; return so.call(this, l, s, c); };
    window.__tokW = 0;
    for (const m of window.__yaoshi3d.tray.props.group.children.filter((c) => c.isInstancedMesh && /^prop-token/.test(c.name))) { const o = m.setMatrixAt.bind(m); m.setMatrixAt = (...a) => { if (window.__dcOn) window.__tokW++; return o(...a); }; }
    window.__tokCount = window.__yaoshi3d.tray.props.group.children.filter((c) => c.isInstancedMesh && /^prop-token/.test(c.name)).map((m) => m.name + ':' + m.count);
    window.__rafStats = { byT: new Map() }; window.__dcOn = true;
  });
  if (CAM_TRIGGER) await page.evaluate((scene) => {
    const fire = (n, d) => document.dispatchEvent(new CustomEvent(n, { detail: d }));
    // 活性紀錄（不進量測）：觸發前與窗內某一刻的相機位置——基準樹應相同、新版應不同，證明觸發真的有被鏡頭吃到
    const C = window.__yaoshi3d.camera, snap = () => C.position.toArray();
    window.__camLive = { before: snap() };
    setTimeout(() => { window.__camLive.during = snap(); }, scene === 'reveal' ? 1200 : 1600);
    if (scene === 'reveal') { fire('ys:reveal-result', { winner: 2, slot: null, transferTarget: 3, destroy: false, grabMs: 1260, curseMs: 2000, skip: false }); return; }
    fire('ys:bid', { seat: 1, slot: 0, amount: 3 });
    setTimeout(() => { if (window.__dcOn) fire('ys:bid', { seat: 3, slot: 0, amount: 4 }); }, 1200);
  }, SCENE);
  await page.waitForTimeout(2500);
  if (CAM_TRIGGER) out.camLive = await page.evaluate(() => window.__camLive);
  const r = await page.evaluate(() => { window.__dcOn = false; const st = window.__rafStats; window.__rafStats = null; return { ts: [...st.byT.keys()], cpu: [...st.byT.values()], dc: window.__dc, sr: window.__sr, programs: window.__yaoshi3d.renderer.info.programs.length, tokW: window.__tokW, tokCount: window.__tokCount }; });
  // 活性（不進量測）：量測窗後同一相機直接畫一次，令牌全顯示 vs 全隱藏的 draw call 差＝令牌在這個畫面真的有被畫到幾趟
  out.tokLive = await page.evaluate(() => {
    const Y = window.__yaoshi3d, R = Y.renderer, ms = Y.tray.props.group.children.filter((c) => /^prop-token/.test(c.name));
    const calls = () => { R.info.autoReset = false; R.info.reset(); R.render(Y.scene, Y.camera); const c = R.info.render.calls; R.info.autoReset = true; return c; };
    const a = calls(); const sv = ms.map((m) => m.visible); ms.forEach((m) => (m.visible = false)); const b = calls(); ms.forEach((m, i) => (m.visible = sv[i]));
    return { withTok: a, withoutTok: b, screen: document.getElementById('mainbtn').textContent };
  });
  const intv = []; for (let i = 1; i < r.ts.length; i++) intv.push(r.ts[i] - r.ts[i - 1]);
  out.raw = { cpu: r.cpu, intv, dc: r.dc };
  out.shadowRenders = r.sr; out.frames = r.cpu.length; out.programs = r.programs; out.staticTokenWrites = r.tokW; out.tokCount = r.tokCount;
  await ctx.close();
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(OUTF, JSON.stringify(out));
const med = (x) => { const s = [...x].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(JSON.stringify({ scene: SCENE, q: QUERY, trig: CAM_TRIGGER, camLive: out.camLive, frames: out.frames, cpuMed: med(out.raw.cpu), dcMed: med(out.raw.dc), dcMax: Math.max(...out.raw.dc), staticTokenWrites: out.staticTokenWrites, tokLive: out.tokLive, tokCount: out.tokCount, intvMed: med(out.raw.intv), shadowRenders: out.shadowRenders, errors: out.errors }));
