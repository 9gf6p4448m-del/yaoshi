// 橫向版面入框治具（凍結 docs/experiments/2026-09-25-acceptance-landscape-fit.md #1 #2 #3 #6b）
// Playwright；安全區以覆寫 assets/safe-area.css 的 --safe-top/right/bottom/left 模擬（重建模型，不是真機）。
// 兩條路徑各從首頁走一次：
//   solo：首頁 → 選角 → 單人局（seed 固定，newGame 與 confirmRole 同一支）自動打到局末 → 本局回顧
//   nw  ：首頁 → 夜行錄選單 → 第 1 章引言卡 → 選角 → 打到局末（局末前把主角設成出局＝過關，同 nightwalk-probe）→ 殘卷卡
// 每種畫面第一次出現時跑 V1–V5 矩陣（#1 入框、#2 主按鈕可點）＋直式 P（#6b 轉向提示在最上層）；
// 每次畫面切換都在 V1 量一次 #1（#3 轉場後）；出價／夜戰／局末／引言卡做「P→V1」「V1→V3」切換重量＋canvas 尺寸（#3）。
// 用法：node tests/tools/landscape-fit-probe.mjs [--base <sha>] [--out <dir>] [--tag <name>] [--seed N]
//   --base：index.html／assets 等在 <sha> 與工作樹不同的檔案，改由 git show <sha>:<path> 供應（量基準版）。
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', null);
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-25-landscape-fit')));
const TAG = arg('--tag', BASE ? 'base-' + BASE : 'head');
const SEED = Number(arg('--seed', 3));
const PORT = 9641;
const SHOTS = path.join(OUT, 'shots-' + TAG);
fs.mkdirSync(SHOTS, { recursive: true });

const VP = {
  V1: { w: 852, h: 393, safe: [0, 59, 21, 59] },
  V2: { w: 932, h: 430, safe: [0, 59, 21, 59] },
  V3: { w: 844, h: 390, safe: [0, 47, 21, 47] },
  V4: { w: 667, h: 375, safe: [0, 0, 0, 0] },
  V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] },
  P: { w: 393, h: 852, safe: [59, 0, 34, 0] },
};
const LAND = ['V1', 'V2', 'V3', 'V4', 'V5'];

/* --base：每個請求都先試 git show <sha>:<path>（基準有這個檔就用基準版，沒有才落回工作樹）；改碼期間跑基準也不會讀到新碼 */
const OVERRIDE = new Map();
const fromBase = (p) => {
  if (!OVERRIDE.has(p)) { let buf = null; try { buf = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} OVERRIDE.set(p, buf); }
  return OVERRIDE.get(p);
};
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

/* ---------- 頁內函式 ---------- */
const PAGE_LIB = `
window.__lf = {
  vis(el){ return !!el && el.checkVisibility && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); },
  desc(el){
    let s = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
    let a = el.parentElement, trail = [];
    while (a && a !== document.body && trail.length < 3) { if (a.id) { trail.push('#' + a.id); } a = a.parentElement; }
    const t = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 24);
    return (trail.length ? trail.reverse().join(' ') + ' > ' : '') + s + (t ? ' 「' + t + '」' : '');
  },
  screen(){
    const $ = (id) => document.getElementById(id);
    const on = (id) => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none'; };
    if (on('review')) return 'review';
    if (on('duel')) return 'duel';
    if (on('sheet')) return 'bag';
    if (on('modal')) {
      if (document.querySelector('#modalbox .legendPick')) return 'shrine-pick';
      if ($('titheKeep')) return 'tithe';
      return 'modal:' + ((document.querySelector('#modalbox h2') || {}).textContent || '').slice(0, 8);
    }
    if (on('handoff')) return 'handoff';
    const nw = $('nwScr'); if (nw && nw.classList.contains('on')) return 'nw-' + nw.dataset.view;
    const sel = $('selectScr'); if (sel && sel.classList.contains('on')) return 'select';
    if (on('titleScr')) return 'title';
    if (!on('table')) return 'none';
    const b = $('mainbtn'), t = b ? b.textContent : '', dis = b ? b.disabled : true;
    const sb = [...document.querySelectorAll('#stage button')];
    if (sb.some((e) => /passEvent|pickEventOpt|confirmEventNum/.test(e.getAttribute('onclick') || ''))) return 'event';
    if (/不盯任何一件/.test(t)) return 'mark';
    if (/^蓋牌/.test(t) && !dis) return 'bid';
    if (/下一件拍品|查看成交總覽/.test(t)) return 'reveal';
    if (/請神/.test(t)) return dis ? 'shrine-run' : 'shrine';
    if (/^開戰/.test(t) && !dis) return 'reveal-result';
    if (/進入下一夜|看最終結果/.test(t) && !dis) return 'night-end';
    if (/前往拍賣/.test(t) && !dis) return 'event-result';
    if (/再入妖市|回章節選單/.test(t)) return 'end';
    if (/^蓋牌/.test(t) && dis) return 'reveal';
    return 'busy:' + t.slice(0, 8);
  },
  /* #1：可見文字容器＋可點元素的外框（扣掉非根的裁切祖先之後的可見部分）落在視口扣安全區內（±1px）；
     不在框內且有可捲祖先 → scrollIntoView 後再量一次。完事把捲動位置還原。 */
  measure(safe){
    const [st, sr, sb, sl] = safe, W = innerWidth, H = innerHeight;
    const box = { l: sl - 1, t: st - 1, r: W - sr + 1, b: H - sb + 1 };
    const CLICK = 'button,a[href],input,select,textarea,[onclick],[role=button],[role=tab],.seat,.mcard,.rcard,.nwCard';
    const scrollers = new Map();
    const clipRect = (el) => {
      let r = el.getBoundingClientRect(); let x = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      if (getComputedStyle(el).position === 'fixed') return { x, sc: [] };
      const sc = [];
      for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          const ar = a.getBoundingClientRect();
          x = { l: Math.max(x.l, ar.left), t: Math.max(x.t, ar.top), r: Math.min(x.r, ar.right), b: Math.min(x.b, ar.bottom) };
          if ((/auto|scroll/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 1) || (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1)) sc.push(a);
        }
        if (cs.position === 'fixed') break;
      }
      return { x, sc };
    };
    const inside = (x) => x.l >= box.l && x.t >= box.t && x.r <= box.r && x.b <= box.b;
    const bad = [], backdrops = []; let n = 0, clipped = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (/^(SCRIPT|STYLE|CANVAS|TEMPLATE)$/.test(el.tagName) || el.closest('svg') || el.closest('#rotateHint') || el.id === '__lfSafe') continue;
      const clickable = el.matches(CLICK);
      const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      if (!clickable && !hasText) continue;
      if (!this.vis(el)) continue;
      const r0 = el.getBoundingClientRect(); if (r0.width < 1 || r0.height < 1) continue;
      /* 凍結 #1「純背景不在此限」：全螢幕、position:fixed、本身沒有文字的底層（#modal／#sheet 的半透明底，點了關閉）不量外框，
         它的內容（#modalbox 等）照量；逐格記在 backdrops，彙總另給不略過的嚴格數字 */
      if (!hasText && getComputedStyle(el).position === 'fixed' && r0.left <= 0.5 && r0.top <= 0.5 && r0.right >= W - 0.5 && r0.bottom >= H - 0.5) { backdrops.push(this.desc(el).slice(0, 40)); continue; }
      let { x, sc } = clipRect(el);
      const empty = (q) => q.r - q.l < 0.5 || q.b - q.t < 0.5;
      let scrolled = false;
      if ((empty(x) || !inside(x)) && sc.length) {
        for (const s of sc) if (!scrollers.has(s)) scrollers.set(s, [s.scrollTop, s.scrollLeft]);
        el.scrollIntoView({ block: 'center', inline: 'center' }); scrolled = true;
        ({ x, sc } = clipRect(el));
      }
      if (empty(x)) { clipped++; continue; }
      n++;
      if (!inside(x)) {
        const r = el.getBoundingClientRect();
        bad.push({ el: this.desc(el), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), vis: [x.l, x.t, x.r, x.b].map(Math.round), scrolled,
          over: { l: Math.round(Math.max(0, box.l - x.l)), t: Math.round(Math.max(0, box.t - x.t)), r: Math.round(Math.max(0, x.r - box.r)), b: Math.round(Math.max(0, x.b - box.b)) } });
      }
    }
    for (const [s, [t, l]] of scrollers) { s.scrollTop = t; s.scrollLeft = l; }
    const dsw = document.documentElement.scrollWidth;
    const T = document.getElementById('table'), tr = T.getBoundingClientRect();
    const grid = getComputedStyle(T).display === 'none' ? null : { cols: getComputedStyle(T).gridTemplateColumns, rect: [tr.left, tr.right].map(Math.round) };
    return { ok: bad.length === 0 && dsw <= W, n, clippedSkipped: clipped, docScrollWidth: dsw, innerWidth: W, innerHeight: H, t3d: !!document.querySelector('#table.t3d'), grid, backdrops, bad };
  },
  /* #2：主按鈕 scrollIntoView 後中心 elementFromPoint 命中自己 */
  buttons(sels){
    const out = [];
    for (const sel of sels) {
      const el = [...document.querySelectorAll(sel)].find((e) => this.vis(e));
      if (!el) { out.push({ sel, found: false, ok: false }); continue; }
      const keep = []; for (let a = el.parentElement; a; a = a.parentElement) keep.push([a, a.scrollTop, a.scrollLeft]);
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const ok = !!hit && (hit === el || el.contains(hit));
      out.push({ sel, found: true, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), hit: hit ? this.desc(hit) : null, ok });
      for (const [a, t, l] of keep) { a.scrollTop = t; a.scrollLeft = l; }
    }
    return out;
  },
  /* #6b：直式時畫面中心與四角命中 #rotateHint */
  rotateTop(){
    const W = innerWidth, H = innerHeight, rh = document.getElementById('rotateHint');
    const pts = [[W / 2, H / 2], [2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]];
    const hits = pts.map(([x, y]) => { const h = document.elementFromPoint(x, y); return { p: [x, y], ok: !!h && (h === rh || rh.contains(h)), hit: h ? this.desc(h) : null }; });
    return { ok: hits.every((h) => h.ok), hits };
  },
  canvases(){
    return [...document.querySelectorAll('canvas')].filter((c) => this.vis(c)).map((c) => { const r = c.getBoundingClientRect(); return { el: this.desc(c), w: Math.round(r.width), h: Math.round(r.height), bw: c.width, bh: c.height, big: r.width * r.height > 0.5 * innerWidth * innerHeight }; });
  },
};`;

const MAIN_BTNS = {
  title: ['#titleScr .btns button', '#nwEntry'],
  select: ['#selBtn', '#selHead .selback'],
  'nw-menu': ['#nwScr .nwCard[data-ch="1"] .nwBtns button'],
  'nw-intro': ['#nwGo'],
  'nw-scroll': ['#nwScrollClose'],
  mark: ['#mainbtn'], bid: ['#mainbtn'], 'reveal-result': ['#mainbtn'], 'night-end': ['#mainbtn'], 'event-result': ['#mainbtn'],
  shrine: ['#mainbtn'], 'shrine-run': ['#skipbtn'], end: ['#mainbtn'],
  reveal: ['#mainbtn'],
  event: ['#stage button'],
  duel: [],
  bag: ['#modalbox button.bigbtn, #sheetbox button.bigbtn'],
  'modal:role': ['#modalbox button.bigbtn'], 'modal:help': ['#modalbox button.bigbtn'],
  'shrine-pick': ['#modalbox .legendPick'], tithe: ['#titheKeep'],
  review: ['#rvCopy', '#rvDl'],
};
const btnsFor = (k) => MAIN_BTNS[k.replace(/^nw:/, '')] || MAIN_BTNS[k] || [];

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const R = { tag: TAG, base: BASE, seed: SEED, viewports: VP, matrix: {}, transitions: [], switches: [], notes: [] };

async function setVP(page, name) {
  const v = VP[name];
  await page.setViewportSize({ width: v.w, height: v.h });
  await page.evaluate(([t, r, b, l]) => {
    try { localStorage.setItem('__lfSafe', JSON.stringify([t, r, b, l])); } catch (e) {}
    let s = document.getElementById('__lfSafe');
    if (!s) { s = document.createElement('style'); s.id = '__lfSafe'; document.head.appendChild(s); }
    s.textContent = `:root{--safe-top:${t}px!important;--safe-right:${r}px!important;--safe-bottom:${b}px!important;--safe-left:${l}px!important}`;
  }, v.safe);
  await page.waitForTimeout(350);
}
const scr = (page) => page.evaluate(() => window.__lf.screen());

async function outlineShot(page, file, safe) {
  const h = await page.evaluate(([t, r, b, l]) => { const d = document.createElement('div'); d.id = '__lfBox';
    d.style.cssText = `position:fixed;left:${l}px;top:${t}px;right:${r}px;bottom:${b}px;border:1px dashed #0f0;pointer-events:none;z-index:2147483647`;
    document.body.appendChild(d); return 1; }, safe);
  await page.screenshot({ path: file });
  await page.evaluate(() => { const d = document.getElementById('__lfBox'); if (d) d.remove(); });
  return h;
}

/* 一格＝(畫面, 視口)：量之前與量之後畫面分類都要相同，否則這格作廢、等下一次同型畫面 */
async function matrixFor(page, key, cls) {
  const M = R.matrix[key] || (R.matrix[key] = { cls, cells: {} });
  const todo = [...LAND, 'P'].filter((v) => !M.cells[v]);
  if (!todo.length) return true;
  for (const v of todo) {
    await setVP(page, v);
    const before = await scr(page);
    if (before !== cls) { M.lost = (M.lost || 0) + 1; break; }
    let cell;
    if (v === 'P') cell = { rotate: await page.evaluate(() => window.__lf.rotateTop()) };
    else cell = { m1: await page.evaluate((s) => window.__lf.measure(s), VP[v].safe), m2: await page.evaluate((s) => window.__lf.buttons(s), btnsFor(key)) };
    const after = await scr(page);
    if (after !== cls) { M.lost = (M.lost || 0) + 1; break; }
    if (v !== 'P') {
      cell.ok1 = cell.m1.ok; cell.ok2 = cell.m2.every((b) => b.ok);
      if (v === 'V1' || !cell.ok1 || !cell.ok2) { cell.shot = `${key.replace(/[:]/g, '_')}-${v}.png`; await outlineShot(page, path.join(SHOTS, cell.shot), VP[v].safe); }
    } else {
      cell.ok6 = cell.rotate.ok;
      if (!cell.ok6) { cell.shot = `${key.replace(/[:]/g, '_')}-P.png`; await page.screenshot({ path: path.join(SHOTS, cell.shot) }); }
    }
    M.cells[v] = cell;
  }
  await setVP(page, 'V1');
  return [...LAND, 'P'].every((v) => M.cells[v]);
}

/* #3：P→V1、V1→V3 切換後重量 #1 #2＋canvas */
async function switchTest(page, key, cls) {
  const rec = { key, cls, steps: [] };
  for (const [from, to] of [['P', 'V1'], ['V1', 'V3']]) {
    await setVP(page, from);
    await setVP(page, to);
    await page.waitForTimeout(250);
    const s0 = await scr(page);
    const m1 = await page.evaluate((s) => window.__lf.measure(s), VP[to].safe);
    const m2 = await page.evaluate((s) => window.__lf.buttons(s), btnsFor(key));
    const cv = await page.evaluate(() => window.__lf.canvases());
    const s1 = await scr(page);
    const big = cv.filter((c) => c.big);
    const canvasOk = big.length > 0 && big.every((c) => Math.abs(c.w - VP[to].w) <= 2 && Math.abs(c.h - VP[to].h) <= 2);
    const step = { from, to, sameScreen: s0 === cls && s1 === cls, ok1: m1.ok, ok2: m2.every((b) => b.ok), canvasOk, canvases: cv, m1, m2 };
    step.ok = step.sameScreen && step.ok1 && step.ok2 && step.canvasOk;
    if (!step.ok) { step.shot = `switch-${key.replace(/[:]/g, '_')}-${from}to${to}.png`; await outlineShot(page, path.join(SHOTS, step.shot), VP[to].safe); }
    rec.steps.push(step);
  }
  await setVP(page, 'V1');
  rec.ok = rec.steps.every((s) => s.ok);
  if (rec.steps.some((s) => !s.sameScreen)) { R.lostSwitches = (R.lostSwitches || 0) + 1; return rec; } /* 畫面在切換中途結束（夜戰）：作廢，等下一次同型畫面重做 */
  R.switches.push(rec);
  return rec;
}

async function transitionMeasure(page, mode, cls) {
  const m = await page.evaluate((s) => window.__lf.measure(s), VP.V1.safe);
  R.transitions.push({ mode, cls, ok: m.ok, n: m.n, bad: m.bad, docScrollWidth: m.docScrollWidth, grid: m.grid });
  if (process.env.LF_DEBUG) console.log('[LF-DEBUG]', mode, cls, m.ok, m.bad.length, JSON.stringify(m.grid));
  if (process.env.LF_QUICK && cls === 'bid') throw new Error('LF_QUICK stop');
}

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

/* 自動打到「看最終結果」：每次畫面分類改變量一次 #1（V1）；未量滿的畫面型跑矩陣；第一次出價時另開袋子／ⓘ／規則 */
async function drive(page, mode, P) {
  let last = null, idle = 0, extrasDone = false, markDone = false;
  for (let i = 0; i < 20000; i++) {
    await page.waitForTimeout(10);
    const cls = await scr(page);
    if (cls !== last) {
      last = cls;
      if (!/^busy/.test(cls)) await transitionMeasure(page, mode, cls);
      const key = mode === 'nw' ? 'nw:' + cls : cls;
      const want = mode === 'solo' ? !/^busy|^handoff|^none|^modal:/.test(cls) : /^(mark|bid)$/.test(cls);
      if (want && !(R.matrix[key] && Object.keys(R.matrix[key].cells).length === 6)) {
        await matrixFor(page, key, cls);
        if (await scr(page) !== cls) continue;
      }
      if (mode === 'solo' && cls === 'duel' && !R.switches.some((s) => s.key === 'duel')) { await switchTest(page, 'duel', 'duel'); if (await scr(page) !== cls) continue; }
      if (cls === 'mark') markDone = true;
      if (cls === 'bid' && mode === 'solo' && !R.switches.some((s) => s.key === 'bid')) await switchTest(page, 'bid', 'bid');
      if (cls === 'bid' && mode === 'solo' && !extrasDone) {
        extrasDone = true;
        for (const [k, fn] of [['bag', 'showBag(0)'], ['modal:role', 'showRoleInfo(1)'], ['modal:help', 'openHelp()']]) {
          await page.evaluate(fn); await page.waitForTimeout(150);
          const c = await scr(page);
          await transitionMeasure(page, mode, c);
          R.matrix[k] = R.matrix[k] || { cls: c, cells: {} };
          await matrixFor(page, k, c);
          await page.evaluate(() => { if (typeof closeSheet === 'function' && getComputedStyle(document.getElementById('sheet')).display !== 'none') closeSheet(); closeModal(); });
          await page.waitForTimeout(100);
        }
        last = null; continue;
      }
    }
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return;
    idle = r === 1 ? idle + 1 : 0;
    if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
  }
  throw new Error('drive 卡住：' + await scr(page));
}

async function newCtx() {
  const ctx = await browser.newContext({ viewport: { width: VP.V1.w, height: VP.V1.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => {
      let v = null; try { v = JSON.parse(localStorage.getItem('__lfSafe')); } catch (e) {}
      if (!v) return;
      const s = document.createElement('style'); s.id = '__lfSafe';
      s.textContent = `:root{--safe-top:${v[0]}px!important;--safe-right:${v[1]}px!important;--safe-bottom:${v[2]}px!important;--safe-left:${v[3]}px!important}`;
      document.head.appendChild(s);
    });
  });
  await ctx.addInitScript(PAGE_LIB);
  if (BASE) {
    await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => {
      const u = new URL(route.request().url()); const raw = decodeURIComponent(u.pathname), p = raw === '/' ? '/index.html' : raw;
      const buf = fromBase(p);
      if (buf) return route.fulfill({ status: 200, body: buf, contentType: CT[path.extname(p)] || 'application/octet-stream' });
      return route.continue();
    });
  }
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  return { ctx, page, errs };
}
const boot = async (page) => {
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__lf', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
};

async function runSolo() {
  const { ctx, page, errs } = await newCtx();
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await boot(page); await setVP(page, 'V1');
    await transitionMeasure(page, 'solo', 'title');
    await matrixFor(page, 'title', 'title');
    await page.evaluate(() => document.querySelector('#titleScr .btns button').click());
    await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard').length > 0);
    await page.evaluate(() => document.querySelectorAll('#selGrid .rcard')[0].click());
    await page.waitForTimeout(100);
    await transitionMeasure(page, 'solo', 'select');
    await matrixFor(page, 'select', 'select');
    /* confirmRole 同一支，只把 FX_SEED 換成固定種子（可重現） */
    await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(SEL.mode, sd, SEL.picks); }, SEED);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    await drive(page, 'solo');
    await page.evaluate(() => document.getElementById('mainbtn').click());
    await page.waitForFunction(() => /再入妖市/.test(document.getElementById('mainbtn').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(200);
    await transitionMeasure(page, 'solo', 'end');
    await matrixFor(page, 'end', 'end');
    await switchTest(page, 'end', 'end');
    await page.evaluate(() => showReview()); await page.waitForTimeout(200);
    await transitionMeasure(page, 'solo', 'review');
    await matrixFor(page, 'review', 'review');
    R.soloSeed = await page.evaluate(() => window.__yaoshi.S.seed);
  } finally { R.soloPageErrors = errs; await ctx.close(); }
}

async function runNw() {
  const { ctx, page, errs } = await newCtx();
  try {
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await boot(page); await setVP(page, 'V1');
    await page.evaluate(() => document.getElementById('nwEntry').click());
    await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'menu');
    await page.waitForTimeout(150);
    await transitionMeasure(page, 'nw', 'nw-menu');
    await matrixFor(page, 'nw-menu', 'nw-menu');
    await page.evaluate(() => document.querySelector('#nwScr .nwCard[data-ch="1"] .nwBtns button').click());
    await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'intro');
    await page.waitForTimeout(150);
    await transitionMeasure(page, 'nw', 'nw-intro');
    await matrixFor(page, 'nw-intro', 'nw-intro');
    await switchTest(page, 'nw-intro', 'nw-intro');
    await page.evaluate(() => document.getElementById('nwGo').click());
    await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard').length > 0);
    await page.evaluate(() => document.querySelectorAll('#selGrid .rcard')[0].click());
    await page.waitForTimeout(100);
    await transitionMeasure(page, 'nw', 'select');
    await matrixFor(page, 'nw:select', 'select');
    await page.evaluate(() => document.getElementById('selBtn').click());
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.chapter === 1);
    await drive(page, 'nw');
    R.nwForce = await page.evaluate(() => {
      const Y = window.__yaoshi, S = Y.S, ch = Y.nwChapter(S.chapter);
      const me = S.players.find((p) => !p.ai), boss = S.players.find((p) => p.ai && p.roleId === ch.boss);
      const natural = Y.nightwalkPass(S, ch);
      boss.alive = false; boss.life = 0; me.alive = true; me.life = Math.max(me.life, 5);
      return { natural, seed: S.seed };
    });
    await page.evaluate(() => document.getElementById('mainbtn').click());
    await page.waitForFunction(() => /回章節選單/.test(document.getElementById('mainbtn').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(200);
    await transitionMeasure(page, 'nw', 'end');
    await matrixFor(page, 'nw:end', 'end');
    await page.evaluate(() => document.getElementById('nwReadScroll').click());
    await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'scroll');
    await page.waitForTimeout(150);
    await transitionMeasure(page, 'nw', 'nw-scroll');
    await matrixFor(page, 'nw-scroll', 'nw-scroll');
  } finally { R.nwPageErrors = errs; await ctx.close(); }
}

try { await runSolo(); await runNw(); }
finally { await browser.close(); srv.kill(); }

/* 彙總 */
const REQUIRED = { '首頁': ['title'], '選角': ['select'], '夜行錄選單': ['nw-menu'], '引言卡': ['nw-intro'], '殘卷卡': ['nw-scroll'],
  '第1夜盯上': ['mark', 'nw:mark'], '出價': ['bid', 'nw:bid'], '揭盅／開標': ['reveal', 'reveal-result'], '紙紮夜戰': ['duel'], '夜末': ['night-end'],
  '異事夜抉擇': ['event'], '請神夜': ['shrine'], '袋子': ['bag'], '角色ⓘ': ['modal:role'], '規則？': ['modal:help'], '局末卡': ['end', 'nw:end'], '本局回顧': ['review'] };
const sum = { cells: 0, pass1: 0, pass2: 0, pass12: 0, portrait: 0, pass6: 0, missing: [], red: [] };
for (const [name, keys] of Object.entries(REQUIRED)) for (const k of keys) {
  const M = R.matrix[k];
  if (!M) { sum.missing.push(`${name}:${k}`); continue; }
  for (const v of LAND) {
    const c = M.cells[v];
    if (!c) { sum.missing.push(`${name}:${k}:${v}`); continue; }
    sum.cells++; if (c.ok1 && c.ok2 && !(c.m1.backdrops.length && VP[v].safe.some((x) => x > 0))) sum.passStrict = (sum.passStrict || 0) + 1;
    if (c.ok1) sum.pass1++; if (c.ok2) sum.pass2++; if (c.ok1 && c.ok2) sum.pass12++;
    else sum.red.push({ screen: name, key: k, vp: v, ok1: c.ok1, ok2: c.ok2, bad: c.m1.bad.map((b) => b.el + ' over' + JSON.stringify(b.over)).slice(0, 12), nBad: c.m1.bad.length, docSW: c.m1.docScrollWidth, btn: c.m2.filter((b) => !b.ok) });
  }
  const p = M.cells.P;
  if (!p) sum.missing.push(`${name}:${k}:P`); else { sum.portrait++; if (p.ok6) sum.pass6++; else sum.red.push({ screen: name, key: k, vp: 'P', rotate: p.rotate.hits.filter((h) => !h.ok) }); }
}
const extra = Object.keys(R.matrix).filter((k) => !Object.values(REQUIRED).flat().includes(k));
sum.extraScreens = extra.map((k) => ({ k, ok: Object.values(R.matrix[k].cells).every((c) => c.ok6 !== false && c.ok1 !== false && c.ok2 !== false) }));
sum.transitions = { n: R.transitions.length, pass: R.transitions.filter((t) => t.ok).length, red: R.transitions.filter((t) => !t.ok).map((t) => `${t.mode}:${t.cls} ${t.bad.length}bad dsw${t.docScrollWidth}`) };
sum.switches = R.switches.map((s) => ({ key: s.key, ok: s.ok, steps: s.steps.map((x) => ({ [`${x.from}->${x.to}`]: { same: x.sameScreen, ok1: x.ok1, ok2: x.ok2, canvas: x.canvasOk, cv: x.canvases.filter((c) => c.big).map((c) => `${c.w}x${c.h}`) } })) }));
sum.pageErrors = { solo: R.soloPageErrors, nw: R.nwPageErrors };
R.servedFromBase = BASE ? [...OVERRIDE].filter(([, v]) => v).map(([k]) => k) : [];
R.summary = sum;
fs.writeFileSync(path.join(OUT, `probe-${TAG}.json`), JSON.stringify(R, null, 1), 'utf8');
console.log(JSON.stringify({ tag: TAG, cells: `${sum.pass12}/${sum.cells}`, cellsStrictNoBackdropExempt: `${sum.passStrict || 0}/${sum.cells}`, m1: sum.pass1, m2: sum.pass2, portrait: `${sum.pass6}/${sum.portrait}`, missing: sum.missing,
  transitions: `${sum.transitions.pass}/${sum.transitions.n}`, switches: sum.switches.map((s) => `${s.key}:${s.ok}`), extra: sum.extraScreens, pageErrors: sum.pageErrors,
  redScreens: [...new Set(sum.red.map((r) => r.key + '@' + r.vp))] }, null, 1));
