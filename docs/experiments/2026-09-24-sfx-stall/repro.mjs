// [DEBUG-sfx7] SFX 長測「卡在主鈕」診斷重現腳本（只診斷，不改 tests/ 或 index.html）
// 用法：node docs/experiments/2026-09-24-sfx-stall/repro.mjs [--driver=old|new] [--seeds=1,2,3] [--runs=5] [--port=9671]
//        [--cap=4000] [--patch=<name,...>] [--tag=xxx] [--continue=1] [--nosmoke]
//   --driver=old：逐字複製 998f2fc^ 舊驅動（輪詢次數計閒置、閒置 >300 次在任何層按跳過、4000 次上限後判卡）
//   --driver=new：逐字複製 998f2fc 新驅動邏輯（牆鐘 3 秒閒置、只在可見 #duel 層按跳過、5 分鐘上限）
//   --continue=1：舊驅動判「卡住」後不拋錯，改成「不設上限、同一套點擊邏輯繼續推」最多 6 分鐘，看局會不會自己打完
//                 （會打完＝不是遊戲端永久停滯，是輪詢預算用完）
//   --patch：診斷用 monkeypatch（見 PATCHES）
// 條件同原測：headless Chromium 844x390、CFG.T=1、PW_FX 所有 *_MS=1、solo、['qingmian']、seeds 1–3 整局到「看最終結果」。
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..'); /* 自 scratchpad/sfx-stall 移入 docs/experiments/2026-09-24-sfx-stall */
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DRIVER = arg('driver', 'old');
const SEEDS = arg('seeds', '1,2,3').split(',').map(Number);
const RUNS = +arg('runs', '5');
const PORT = +arg('port', '9671');
const CAP = +arg('cap', '4000');
const PATCH = arg('patch', '').split(',').filter(Boolean);
const TAG = arg('tag', `${DRIVER}${PATCH.length ? '-' + PATCH.join('+') : ''}`);
const CONTINUE = arg('continue', '1') === '1';
const OUT = path.join(HERE, `runs-${TAG}.jsonl`);

const HOOK = `(() => {
  let real = null; window.__sfxLog = [];
  Object.defineProperty(window, 'YS_SFX', { configurable: true, get() { return real; }, set(v) {
    real = v;
    if (v && typeof v.play === 'function' && !v.__hooked) {
      const o = v.play;
      v.play = function (name, opts) {
        let round = 0, skip = null;
        try { round = window.__yaoshi && window.__yaoshi.S ? window.__yaoshi.S.round : 0; } catch (e) {}
        try { skip = typeof SKIP !== 'undefined' ? SKIP : null; } catch (e) {}
        window.__sfxLog.push({ name, round, skip });
        return o.call(this, name, opts);
      };
      v.__hooked = 1;
    }
  } });
  try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
})()`;

/* [DEBUG-sfx7] 關鍵等待點記錄：在 load 之後把全域函式宣告包一層（呼叫端走全域綁定，所以包得到）。
   環形緩衝 window.__dbg；PW_WAKE／PENDING／SKIP 是 script 範圍的 let，同一個全域詞法環境讀得到。 */
const DEBUG = `(() => {
  const P = '[DEBUG-sfx7]';
  window.__dbg = []; window.__dbgCnt = {};
  const now = () => Math.round(performance.now());
  const st = () => { try { return { skip: SKIP, pending: typeof PENDING === 'function', wake: typeof PW_WAKE === 'function', rev: REVEAL_ANIMATING, round: window.__yaoshi && window.__yaoshi.S ? window.__yaoshi.S.round : null }; } catch (e) { return { err: String(e) }; } };
  const log = (ev, extra) => { window.__dbgCnt[ev] = (window.__dbgCnt[ev] || 0) + 1; window.__dbg.push({ t: now(), ev, ...st(), ...(extra || {}) }); if (window.__dbg.length > 600) window.__dbg.splice(0, 200); };
  window.__dbgLog = log;
  window.addEventListener('unhandledrejection', (e) => log('unhandledrejection', { msg: String(e.reason && (e.reason.stack || e.reason)) .slice(0, 300) }));
  window.addEventListener('error', (e) => log('error', { msg: String(e.message).slice(0, 300) }));
  window.addEventListener('load', () => {
    const wrapAsync = (name) => { const o = window[name]; if (typeof o !== 'function') { log('nowrap', { name }); return; }
      window[name] = function (...a) { log(name + ':enter', { a0: typeof a[0] === 'string' ? a[0] : undefined }); let r;
        try { r = o.apply(this, a); } catch (e) { log(name + ':throw', { msg: String(e).slice(0, 200) }); throw e; }
        if (r && typeof r.then === 'function') r.then(() => log(name + ':resolve'), (e) => log(name + ':reject', { msg: String(e && e.stack || e).slice(0, 300) }));
        return r; }; };
    ['waitMain', 'startReveal', 'startBattle', 'startShrine', 'playDuel', 'playDuelWar', 'pwAwaitFigures', 'nextRound', 'endGame', 'doSkip'].forEach(wrapAsync);
    /* pwSleep 記 ms 與「註冊後 PW_WAKE 是不是自己」 */
    const ps = window.pwSleep;
    if (typeof ps === 'function') window.pwSleep = function (ms) { const r = ps.call(this, ms); const mine = typeof PW_WAKE === 'function'; window.__dbgCnt.pwSleep = (window.__dbgCnt.pwSleep || 0) + 1; return r; };
    log('wrapped');
  });
})()`;

/* 診斷用 monkeypatch（page 內，於 newGame 之前套上；不改 index.html） */
const PATCHES = {
  // 無：保留位
};

function serve() {
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  return srv;
}

async function newGame(page, seed, rounds) {
  await page.waitForFunction('typeof window.__yaoshi === "object"', { timeout: 20000 });
  await page.evaluate(({ sd, rd }) => {
    CFG.T = 1; if (rd) CFG.ROUNDS = rd;
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__sfxLog.length = 0;
    initSfx();
    window.__yaoshi.newGame('solo', sd, ['qingmian']);
  }, { sd: seed, rd: rounds || 0 });
}

const POLL = (src, skipReveals) => `(() => {
  const re = new RegExp(${JSON.stringify(src)});
  const ho = document.getElementById('handoff');
  if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return { hit: 0, act: 'handoff' }; }
  const sk = document.getElementById('skipbtn');
  if (${skipReveals ? 'true' : 'false'} && sk && sk.style.display === 'block' && !sk.disabled) { sk.click(); return { hit: 0, act: 'skipReveals' }; }
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && re.test(txt) && !dis) return { hit: 1, txt };
  if (b && !dis) { b.click(); return { hit: 0, act: 'main', txt }; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return { hit: 0, act: 'tithe' }; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return { hit: 0, act: 'legend' }; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return { hit: 0, act: 'stage' }; }
  }
  return { hit: 0, idle: 1, txt, dis };
})()`;

const DUMP = () => {
  const b = document.getElementById('mainbtn'), sk = document.getElementById('skipbtn'), duel = document.getElementById('duel');
  let pend = null, skip = null, rev = null, wake = null;
  try { pend = typeof PENDING === 'function'; skip = SKIP; rev = REVEAL_ANIMATING; wake = typeof PW_WAKE === 'function'; } catch (e) {}
  return {
    t: Math.round(performance.now()),
    text: b && b.textContent, disabled: b && b.disabled, PENDING: pend, SKIP: skip, REVEAL_ANIMATING: rev, PW_WAKE: wake,
    round: window.__yaoshi && window.__yaoshi.S && window.__yaoshi.S.round,
    skipbtn: sk && sk.style.display,
    duel: duel ? { display: getComputedStyle(duel).display, cls: duel.className } : null,
    modal: document.getElementById('modal') ? getComputedStyle(document.getElementById('modal')).display : null,
    stage: (document.getElementById('stage') && document.getElementById('stage').textContent || '').replace(/\s+/g, ' ').slice(0, 200),
    dbgTail: (window.__dbg || []).slice(-25), dbgCnt: window.__dbgCnt,
  };
};

/* 舊驅動（998f2fc^ 逐行語意）＋量測；cap 到了不拋錯而回報，並可選擇續推 */
async function driveOld(page, re, opts = {}) {
  const src = re.source; let idle = 0; const stalls = []; const t0 = Date.now();
  const hist = {}; let iters = 0; let evalMs = 0; let stuck = null;
  const cap = opts.cap ?? CAP; let idleT0 = null; let maxIdle = { ms: 0 };
  for (let i = 0; ; i++) {
    if (i >= cap && !stuck) {
      stuck = { atIter: i, wallMs: Date.now() - t0, dump: await page.evaluate(DUMP), histTop: Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6) };
      if (!opts.continueAfter) break;
    }
    if (stuck && Date.now() - t0 - stuck.wallMs > 6 * 60 * 1000) { stuck.continued = { finished: false, extraIters: i - stuck.atIter }; break; }
    await page.waitForTimeout(10);
    const e0 = Date.now();
    const r = await page.evaluate(POLL(src, opts.skipReveals));
    evalMs += Date.now() - e0; iters++;
    const key = r.hit ? 'HIT' : r.idle ? `idle:${r.txt}|dis=${r.dis}` : `act:${r.act}`;
    hist[key] = (hist[key] || 0) + 1;
    if (r.hit) {
      if (stuck) stuck.continued = { finished: true, extraIters: i - stuck.atIter, extraMs: Date.now() - t0 - stuck.wallMs };
      return { ok: !stuck, text: r.txt, maxIdle, iters, wallMs: Date.now() - t0, evalMsAvg: +(evalMs / iters).toFixed(2), stalls, stuck, hist };
    }
    idle = r.idle ? idle + 1 : 0;
    if (r.idle) { idleT0 ??= Date.now(); const ms = Date.now() - idleT0; if (ms > maxIdle.ms) maxIdle = { ms, text: r.txt, iter: i }; } else idleT0 = null;
    if (Date.now() - t0 > 15 * 60 * 1000) { stuck = stuck || { atIter: i, wallMs: Date.now() - t0, wallLimit: true, dump: await page.evaluate(DUMP) }; break; }
    if (idle > 300) {
      idle = 0;
      const info = await page.evaluate(() => { const sk = document.getElementById('skipbtn'); const duel = document.getElementById('duel');
        const duelVis = !!(duel && getComputedStyle(duel).display !== 'none' && duel.classList.contains('on'));
        const b = document.getElementById('mainbtn');
        const pre = { round: window.__yaoshi.S.round, duelVis, text: b && b.textContent, wake: typeof PW_WAKE === 'function', pending: typeof PENDING === 'function', rev: REVEAL_ANIMATING };
        if (sk && sk.style.display === 'block' && !sk.disabled) { sk.click(); return { clicked: true, ...pre, wakeAfter: typeof PW_WAKE === 'function', skipAfter: SKIP }; } return { clicked: false, ...pre }; });
      stalls.push({ iter: i, ...info });
    }
  }
  return { ok: false, maxIdle, iters, wallMs: Date.now() - t0, evalMsAvg: +(evalMs / Math.max(1, iters)).toFixed(2), stalls, stuck, hist };
}

/* 新驅動（998f2fc 語意）：牆鐘閒置 3 秒、只在可見對決層按跳過 */
async function driveNew(page, re, opts = {}) {
  const src = re.source; const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000; const t0 = Date.now(); const deadline = t0 + timeoutMs;
  const skipAttempts = []; let idleSince = null; let iters = 0; const hist = {};
  while (Date.now() < deadline) {
    await page.waitForTimeout(10);
    const r = await page.evaluate(POLL(src, opts.skipReveals)); iters++;
    const key = r.hit ? 'HIT' : r.idle ? `idle:${r.txt}|dis=${r.dis}` : `act:${r.act}`;
    hist[key] = (hist[key] || 0) + 1;
    if (r.hit) return { ok: true, text: r.txt, iters, wallMs: Date.now() - t0, skipAttempts, hist };
    if (r.idle) idleSince ??= Date.now(); else idleSince = null;
    if (idleSince !== null && Date.now() - idleSince >= 3000) {
      idleSince = Date.now();
      const attempt = await page.evaluate(() => {
        const sk = document.getElementById('skipbtn'); const duel = document.getElementById('duel');
        const duelVisible = duel && getComputedStyle(duel).display !== 'none' && duel.classList.contains('on');
        const b = document.getElementById('mainbtn');
        const pre = { round: window.__yaoshi.S.round, text: b && b.textContent, duelVisible: !!duelVisible, skipbtn: sk && sk.style.display, wake: typeof PW_WAKE === 'function', pending: typeof PENDING === 'function', dbgTail: (window.__dbg || []).slice(-8) };
        if (!duelVisible || !sk || sk.style.display !== 'block' || sk.disabled) return { clickAttempted: false, ...pre };
        const wakePending = typeof PW_WAKE === 'function'; sk.click();
        return { clickAttempted: true, skipActivated: SKIP === true, wakeSignaled: wakePending && typeof PW_WAKE !== 'function', ...pre };
      });
      skipAttempts.push(attempt);
    }
  }
  return { ok: false, iters, wallMs: Date.now() - t0, skipAttempts, hist, stuck: { dump: await page.evaluate(DUMP) } };
}

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = serve();
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
console.log(`[DEBUG-sfx7] driver=${DRIVER} seeds=${SEEDS} runs=${RUNS} cap=${CAP} patch=${PATCH.join('+') || '-'} → ${OUT}`);
try {
  for (let run = 1; run <= RUNS; run++) {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
    await ctx.addInitScript(HOOK);
    await ctx.addInitScript(DEBUG);
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    for (const seed of SEEDS) {
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
      for (const p of PATCH) { if (!PATCHES[p]) throw new Error('unknown patch ' + p); await page.evaluate(PATCHES[p]); }
      await newGame(page, seed);
      const res = DRIVER === 'old'
        ? await driveOld(page, /看最終結果/, { continueAfter: CONTINUE })
        : await driveNew(page, /看最終結果/);
      const tail = await page.evaluate(() => ({ nights: window.__yaoshi.S.history.nights.length, round: window.__yaoshi.S.round, dbgCnt: window.__dbgCnt, sfx: window.__sfxLog.reduce((c, e) => (c[e.name] = (c[e.name] || 0) + 1, c), {}) }));
      const rec = { tag: TAG, run, seed, ...res, ...tail, pageerrors: errors.splice(0) };
      fs.appendFileSync(OUT, JSON.stringify(rec) + '\n');
      const s = res.stuck ? ` STUCK@iter${res.stuck.atIter ?? ''} wall${res.stuck.wallMs ?? ''}ms text=${JSON.stringify(res.stuck.dump.text)} dis=${res.stuck.dump.disabled} round=${res.stuck.dump.round} cont=${JSON.stringify(res.stuck.continued || null)}` : '';
      const sk = res.stalls ? ` skips=${JSON.stringify(res.stalls.map((x) => [x.round, x.text, x.duelVis, x.clicked, x.wake]))}` : ` skipAttempts=${JSON.stringify((res.skipAttempts || []).map((x) => [x.round, x.text, x.clickAttempted, x.wakeSignaled]))}`;
      console.log(`[DEBUG-sfx7] run ${run} seed ${seed}: ok=${res.ok} iters=${res.iters} wall=${res.wallMs}ms evalAvg=${res.evalMsAvg ?? '-'} nights=${tail.nights} maxIdle=${JSON.stringify(res.maxIdle||null)}${s}${sk}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  srv.kill();
}
