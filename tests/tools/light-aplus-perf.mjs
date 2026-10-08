// v0.65.0 光影 A+ 效能量測（凍結 #4）。量法同示意 phase2-mock/light/shoot-light.mjs：關 vsync／不鎖幀、DPR 1、
// 到達場景後解凍等 0.8 秒，再量 2.5 秒：draw call＝在 WebGL context 上數 drawElements／drawArrays（含 Instanced）每次 renderer.render
// 實際送出的數量（含陰影圖那幾趟）；CPU 幀時間＝同一個 rAF 時間戳底下所有回呼的 JS 執行時間合計；幀間隔＝rAF 時間戳差。
// 與示意不同處：示意在同一頁執行期切燈光；產品的燈光開頁就定，所以每案各開一頁（v0.64.0 樹 vs 本分支），由呼叫端交錯跑兩輪。
// 用法：node tests/tools/light-aplus-perf.mjs <root> <query> <bid|reveal|phone> <out.json> [--vsync] [--cam-trigger]
// --cam-trigger（v0.65.1 運鏡乙驗收 §5，只加觸發、不改量法）：量測窗一開始就派鏡頭事件，讓 2.5 秒窗落在新鏡頭作用中——
//   bid：0 秒 seat 1、1.2 秒 seat 3 各派一次 ys:bid（出價微推＋喊價者切換；「最後 3 秒收緊」已刪，10-08 使用者同意）；
//   reveal：派一次 ys:reveal-result（transferTarget 3、curseMs 2000、slot null）＝中咒 0.8 秒推近＋停留＋回位都在窗內。
//   reveal 的 slot null 讓 renderer 的托盤結算整段早退（只有鏡頭收這個事件），基準樹（5c91bdc7）沒有這個監聽者＝同一份觸發下的空操作；
//   bid 的 ys:bid 兩棵樹的托盤錢柱／席位之手都會收（推錢演出），兩邊同一份觸發，差異只剩鏡頭。
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
const PORT = 9960 + Math.floor(Math.random() * 30);
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
  await page.waitForTimeout(1800 + 800);
  await page.evaluate(() => {
    const R = window.__yaoshi3d.renderer, orig = R.render.bind(R), gl = R.getContext(); let n = 0;
    for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = gl[f].bind(gl); gl[f] = (...a) => { n++; return o(...a); }; }
    window.__dc = []; R.render = (s, c) => { n = 0; orig(s, c); if (window.__dcOn) window.__dc.push(n); };
    const sm = R.shadowMap, so = sm.render; window.__sr = 0;
    sm.render = function (l, s, c) { if (window.__dcOn && sm.enabled && (sm.autoUpdate || sm.needsUpdate) && l.length) window.__sr++; return so.call(this, l, s, c); };
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
  const r = await page.evaluate(() => { window.__dcOn = false; const st = window.__rafStats; window.__rafStats = null; return { ts: [...st.byT.keys()], cpu: [...st.byT.values()], dc: window.__dc, sr: window.__sr, programs: window.__yaoshi3d.renderer.info.programs.length }; });
  const intv = []; for (let i = 1; i < r.ts.length; i++) intv.push(r.ts[i] - r.ts[i - 1]);
  out.raw = { cpu: r.cpu, intv, dc: r.dc };
  out.shadowRenders = r.sr; out.frames = r.cpu.length; out.programs = r.programs;
  await ctx.close();
} finally { await browser.close(); srv.kill(); }
fs.writeFileSync(OUTF, JSON.stringify(out));
const med = (x) => { const s = [...x].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; };
console.log(JSON.stringify({ scene: SCENE, q: QUERY, trig: CAM_TRIGGER, camLive: out.camLive, frames: out.frames, cpuMed: med(out.raw.cpu), dcMed: med(out.raw.dc), intvMed: med(out.raw.intv), shadowRenders: out.shadowRenders, errors: out.errors }));
