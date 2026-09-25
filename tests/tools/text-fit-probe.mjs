// 文字完整顯示治具（凍結 docs/experiments/2026-09-25-acceptance-text-fit.md #1 #2 #3）
// 驅動與安全區模擬沿用 tests/tools/landscape-fit-probe.mjs（覆寫 --safe-*；重建模型，不是真機）。
// 模式：solo（單人整局＋袋子／角色ⓘ／規則）、hot（雙人熱座整局）、nw1（夜行錄第 1 章整局＋殘卷）、nw2／nw3（第 2／3 章打到第 2 夜出價）。
// 每種畫面鍵第一次出現時跑 V1–V5：對所有可見文字元素判截斷（凍結 #1 定義），並量桌面文字條的背景不透明度（#3）。
// 出價／盯上／異事／請神畫面的鍵帶夜數（第 N 夜），請神夜前一夜、異事夜、規則夜因此各自成格。
// 另在每次畫面切換時於 V1 量一次（不換視口，抓只在轉場出現的字）。
// 用法：node tests/tools/text-fit-probe.mjs [--base <sha>] [--out <dir>] [--tag <name>] [--seed N] [--modes solo,hot,nw1,nw2,nw3]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', null);
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-25-text-fit')));
const TAG = arg('--tag', BASE ? 'base-' + BASE : 'head');
const SEED = Number(arg('--seed', 3));
const MODES = arg('--modes', 'solo,hot,nw1,nw2,nw3').split(',');
const PORT = 9643;
const SHOTS = path.join(OUT, 'shots-' + TAG);
fs.mkdirSync(SHOTS, { recursive: true });

const VP = {
  V1: { w: 852, h: 393, safe: [0, 59, 21, 59] },
  V2: { w: 932, h: 430, safe: [0, 59, 21, 59] },
  V3: { w: 844, h: 390, safe: [0, 47, 21, 47] },
  V4: { w: 667, h: 375, safe: [0, 0, 0, 0] },
  V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] },
};
const LAND = ['V1', 'V2', 'V3', 'V4', 'V5'];

const OVERRIDE = new Map();
const fromBase = (p) => {
  if (!OVERRIDE.has(p)) { let buf = null; try { buf = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} OVERRIDE.set(p, buf); }
  return OVERRIDE.get(p);
};
const CT = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

const PAGE_LIB = `
window.__tf = {
  vis(el){ return !!el && el.checkVisibility && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); },
  sel(el){
    const parts = [];
    for (let a = el; a && a !== document.body && parts.length < 4; a = a.parentElement) {
      let s = a.tagName.toLowerCase();
      if (a.id) { parts.unshift('#' + a.id); break; }
      if (typeof a.className === 'string' && a.className.trim()) s += '.' + a.className.trim().split(/\\s+/).slice(0, 2).join('.');
      parts.unshift(s);
    }
    return parts.join(' > ');
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
  /* 凍結 #1：可見文字元素 scrollWidth > clientWidth+1 或 scrollHeight > clientHeight+1，且 overflow 非 visible／text-overflow:ellipsis／line-clamp。
     overflow:auto|scroll 的另標 scrollable（內容可捲到，盤點照列、分類另判）。shown＝逐字以 Range 判斷落在裁切框內的字。 */
  trunc(){
    const out = [], ells = [];
    const clipBox = (el) => {
      let r = el.getBoundingClientRect(), x = { l: r.left + el.clientLeft, t: r.top + el.clientTop, r: r.left + el.clientLeft + el.clientWidth, b: r.top + el.clientTop + el.clientHeight };
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const ar = a.getBoundingClientRect(); x = { l: Math.max(x.l, ar.left), t: Math.max(x.t, ar.top), r: Math.min(x.r, ar.right), b: Math.min(x.b, ar.bottom) }; }
      }
      x.l = Math.max(x.l, 0); x.t = Math.max(x.t, 0); x.r = Math.min(x.r, innerWidth); x.b = Math.min(x.b, innerHeight);
      return x;
    };
    const shownText = (el) => {
      const x = clipBox(el); let s = '', hidden = 0;
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const rg = document.createRange();
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        const p = n.parentElement; if (!p || !this.vis(p)) continue;
        const t = n.textContent;
        for (let i = 0; i < t.length; i++) {
          if (/\\s/.test(t[i])) { s += t[i]; continue; }
          rg.setStart(n, i); rg.setEnd(n, i + 1);
          const q = rg.getBoundingClientRect();
          if (q.width < 0.1) { hidden++; continue; }
          const cx = (q.left + q.right) / 2, cy = (q.top + q.bottom) / 2;
          if (q.right <= x.r + 1 && q.left >= x.l - 1 && cy <= x.b && cy >= x.t) s += t[i]; else hidden++;
        }
      }
      return { shown: s.replace(/\\s+/g, ' ').trim(), hidden };
    };
    for (const el of document.body.querySelectorAll('*')) {
      if (/^(SCRIPT|STYLE|CANVAS|TEMPLATE)$/.test(el.tagName) || el.closest('svg') || el.closest('#rotateHint') || /^__/.test(el.id)) continue;
      if (!this.vis(el)) continue;
      const full = (el.innerText || '').replace(/\\s+/g, ' ').trim();
      if (!full) continue;
      const r0 = el.getBoundingClientRect(); if (r0.width < 1 || r0.height < 1) continue;
      const cs = getComputedStyle(el);
      /* 本身直接帶有「…」的字（程式截斷候選）：只收葉層 */
      if ([...el.childNodes].some((c) => c.nodeType === 3 && /…|\\.\\.\\./.test(c.textContent))) ells.push({ sel: this.sel(el), text: full.slice(0, 80) });
      const clipX = cs.overflowX !== 'visible', clipY = cs.overflowY !== 'visible';
      const ell = cs.textOverflow === 'ellipsis', clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
      if (!(clipX || clipY || ell || clamp)) continue;
      const ow = el.scrollWidth > el.clientWidth + 1, oh = el.scrollHeight > el.clientHeight + 1;
      if (!ow && !oh) continue;
      const scrollable = (ow && /auto|scroll/.test(cs.overflowX)) || (oh && /auto|scroll/.test(cs.overflowY));
      const st = shownText(el);
      const reach = scrollable ? this.reach(el) : null;
      out.push({ sel: this.sel(el), cls: typeof el.className === 'string' ? el.className : '', full: full.slice(0, 300), shown: (st.shown + (ell && ow ? '…' : '')).slice(0, 300), hiddenChars: st.hidden,
        ow, oh, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, ellipsis: ell, clamp: !!clamp, overflow: cs.overflowX + '/' + cs.overflowY, scrollable, reach });
    }
    return { items: out, ells };
  },
  /* 回歸護欄（凍結條文之外、本卷自加）：本卷把頂列與香火榜的 ellipsis 改成 overflow:visible，凍結 #1 的判定對 visible 不作用，
     所以另量兩件「換行版可能出的事」：spill＝區塊元素內容比自己寬／高（字溢出自己的框）；overlap＝同一列的兄弟框互相疊到（>1px）。 */
  spill(){
    const roots = [...document.querySelectorAll('#feltHead, #northShr, #northPrev')].filter((e) => this.vis(e));
    const spill = [], overlap = [];
    for (const R0 of roots) for (const el of [R0, ...R0.querySelectorAll('*')]) {
      if (!this.vis(el) || !(el.innerText || '').trim()) continue;
      const cs = getComputedStyle(el); if (cs.display === 'inline' || el.closest('svg')) continue;
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) spill.push(this.sel(el) + ' ' + el.scrollWidth + '/' + el.clientWidth + ' ' + el.scrollHeight + '/' + el.clientHeight);
      const kids = [...el.children].filter((k) => this.vis(k) && getComputedStyle(k).position !== 'absolute' && getComputedStyle(k).display !== 'inline' && (k.innerText || '').trim());
      for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
        const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) overlap.push(this.sel(kids[i]) + ' ✕ ' + this.sel(kids[j]) + ' ' + Math.round(w) + 'x' + Math.round(h));
      }
    }
    return { spill, overlap };
  },
  /* 可捲容器的「全文位置」驗證：把容器從頭捲到尾（每步 0.8 個可視高／寬），逐字記錄是否曾落在容器可視框內；
     全部字都曾出現＝全文捲得到（巢狀的內層捲動框另成一項、自己驗）。量完還原捲動位置。 */
  reach(el){
    const t0 = el.scrollTop, l0 = el.scrollLeft, seen = new Set(), nodes = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const p = n.parentElement; if (!p || !this.vis(p)) continue;
      let inner = false;
      for (let a = p; a && a !== el; a = a.parentElement) { const c = getComputedStyle(a); if (/auto|scroll/.test(c.overflowY + c.overflowX) && (a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1)) { inner = true; break; } }
      if (!inner) nodes.push(n);
    }
    const steps = (max, page) => { const o = []; for (let v = 0; ; v += Math.max(20, page * 0.8)) { o.push(Math.min(v, max)); if (v >= max) break; } return o; };
    const rg = document.createRange();
    for (const y of steps(el.scrollHeight - el.clientHeight, el.clientHeight)) for (const x of steps(el.scrollWidth - el.clientWidth, el.clientWidth)) {
      el.scrollTop = y; el.scrollLeft = x;
      const r = el.getBoundingClientRect(), bx = { l: r.left + el.clientLeft, t: r.top + el.clientTop, r: r.left + el.clientLeft + el.clientWidth, b: r.top + el.clientTop + el.clientHeight };
      nodes.forEach((n, ni) => { const t = n.textContent; for (let i = 0; i < t.length; i++) {
        if (/\\s/.test(t[i]) || seen.has(ni + ':' + i)) continue;
        rg.setStart(n, i); rg.setEnd(n, i + 1); const q = rg.getBoundingClientRect(); if (q.width < 0.1) continue;
        const cy = (q.top + q.bottom) / 2;
        if (q.left >= bx.l - 1 && q.right <= bx.r + 1 && cy >= bx.t && cy <= bx.b) seen.add(ni + ':' + i);
      } });
    }
    let total = 0; nodes.forEach((n) => { for (const c of n.textContent) if (!/\\s/.test(c)) total++; });
    el.scrollTop = t0; el.scrollLeft = l0;
    return { chars: total, reached: seen.size, ok: seen.size >= total };
  },
  /* 凍結 #3：桌面文字條（浮在 3D 桌面上）的背景不透明度。own＝自己的 background-color（＋漸層最低色標）alpha；eff＝自己＋祖先（到 #table 為止）疊加；shadow＝text-shadow。 */
  strips(){
    const alpha = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c); if (!m) return 0; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length >= 4 ? parseFloat(p[3]) : 1; };
    /* 背景圖是漸層時取各色標中最低的不透明度（保守）；Chrome 把 color-mix 算成 color(srgb r g b / a)，也認 */
    const galpha = (img) => {
      if (!img || img === 'none' || !/gradient/.test(img)) return 0;
      const st = [];
      for (const m of img.matchAll(/rgba?\\(([^)]*)\\)/g)) { const p = m[1].split(/[ ,/]+/).filter(Boolean); st.push(p.length >= 4 ? parseFloat(p[3]) : 1); }
      for (const m of img.matchAll(/color\\(srgb([^)]*)\\)/g)) { const a = /\\/\\s*([\\d.]+)/.exec(m[1]); st.push(a ? parseFloat(a[1]) : 1); }
      return st.length ? Math.min(...st) : 0;
    };
    const layer = (cs) => 1 - (1 - alpha(cs.backgroundColor)) * (1 - galpha(cs.backgroundImage));
    const sels = ['#feltHead', '#feltHead .headCompact', '#feltHead .wishbar', '#felt #stage > *', '#northPrev > *', '#table .bubble.show', '#felt .stakebar', '#felt .preview', '#felt .chainHint', '#felt .chainStatus', '#felt .aihint'];
    const seen = new Set(), rows = [];
    for (const s of sels) for (const el of document.querySelectorAll(s)) {
      if (seen.has(el) || !this.vis(el)) continue; seen.add(el);
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      const txt = (el.innerText || '').replace(/\\s+/g, ' ').trim(); if (!txt) continue;
      const cs = getComputedStyle(el); let rem = 1 - layer(cs);
      for (let a = el.parentElement; a && a.id !== 'table' && a !== document.body; a = a.parentElement) rem *= 1 - layer(getComputedStyle(a));
      rows.push({ sel: this.sel(el), q: s, text: txt.slice(0, 40), bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 120), own: +layer(cs).toFixed(3), eff: +(1 - rem).toFixed(3), shadow: cs.textShadow === 'none' ? '' : cs.textShadow, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
    }
    return rows;
  },
};`;

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const R = { tag: TAG, base: BASE, seed: SEED, viewports: VP, cells: {}, transitions: [], notes: [], pageErrors: {} };

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
const scr = (page) => page.evaluate(() => window.__tf.screen());
const round = (page) => page.evaluate(() => (window.__yaoshi && window.__yaoshi.S && window.__yaoshi.S.round) || 0);
const PER_NIGHT = /^(bid|mark|event|event-result|shrine|night-end)$/;

async function cellsFor(page, mode, cls) {
  const n = await round(page);
  const onTable = !/^(title|select|nw-|review$|none)/.test(cls);
  const key = `${mode}|${cls}${onTable && PER_NIGHT.test(cls) ? '|n' + n : ''}`;
  const C = R.cells[key] || (R.cells[key] = { mode, cls, night: onTable ? n : null, vp: {} });
  const todo = LAND.filter((v) => !C.vp[v]);
  if (!todo.length) return;
  for (const v of todo) {
    await setVP(page, v);
    if (await scr(page) !== cls) { C.lost = (C.lost || 0) + 1; break; }
    const t = await page.evaluate(() => window.__tf.trunc());
    const strips = await page.evaluate(() => window.__tf.strips());
    if (await scr(page) !== cls) { C.lost = (C.lost || 0) + 1; break; }
    const guard = await page.evaluate(() => window.__tf.spill());
    const cell = { items: t.items, ells: t.ells, strips, guard };
    if (v === 'V1' && cls === 'bid' && !R.wishShot) {
      const wr = await page.evaluate(() => { const e = document.querySelector('#feltHead .wishbar'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
      if (wr) { R.wishShot = `wishbar-V1-${TAG}.png`; await page.screenshot({ path: path.join(OUT, R.wishShot), clip: { x: Math.max(0, wr[0] - 40), y: Math.max(0, wr[1] - 40), width: Math.min(VP.V1.w - Math.max(0, wr[0] - 40), wr[2] + 80), height: wr[3] + 80 } }); }
    }
    if (v === 'V1' && (t.items.length || /^(bid|mark)$/.test(cls))) { cell.shot = `${key.replace(/[|:]/g, '_')}-${v}.png`; await page.screenshot({ path: path.join(SHOTS, cell.shot) }); }
    C.vp[v] = cell;
  }
  await setVP(page, 'V1');
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

async function drive(page, mode, stopAt) {
  let last = null, idle = 0, extrasDone = mode !== 'solo';
  for (let i = 0; i < 20000; i++) {
    await page.waitForTimeout(10);
    const cls = await scr(page);
    if (cls !== last) {
      last = cls;
      if (!/^busy|^none/.test(cls)) {
        const t = await page.evaluate(() => window.__tf.trunc());
        R.transitions.push({ mode, cls, night: await round(page), n: t.items.length, items: t.items.map((x) => x.sel + ' 「' + x.full.slice(0, 30) + '」→「' + x.shown.slice(0, 30) + '」') });
        await cellsFor(page, mode, cls);
        if (await scr(page) !== cls) continue;
      }
      if (stopAt && stopAt(cls, await round(page))) return 'stopped';
      if (cls === 'bid' && !extrasDone) {
        extrasDone = true;
        for (const fn of ['showBag(0)', 'showRoleInfo(1)', 'openHelp()']) {
          await page.evaluate(fn); await page.waitForTimeout(150);
          const c = await scr(page);
          await cellsFor(page, mode, c);
          await page.evaluate(() => { if (typeof closeSheet === 'function' && getComputedStyle(document.getElementById('sheet')).display !== 'none') closeSheet(); closeModal(); });
          await page.waitForTimeout(100);
        }
        last = null; continue;
      }
    }
    const r = await page.evaluate(DRIVE_STEP);
    if (r === 2) return 'end';
    idle = r === 1 ? idle + 1 : 0;
    if (idle > 300) { idle = 0; await page.evaluate(() => { const sk = document.getElementById('skipbtn'); if (sk && sk.style.display === 'block' && !sk.disabled) sk.click(); }); }
  }
  throw new Error('drive 卡住：' + await scr(page));
}

async function newCtx(q = '') {
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
  await page.goto(`http://127.0.0.1:${PORT}/index.html${q}`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object" && !!window.__tf', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await setVP(page, 'V1');
  return { ctx, page, errs };
}
const pickFirstRole = async (page) => {
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(100);
};

async function runRegular(mode) {
  const { ctx, page, errs } = await newCtx();
  try {
    await cellsFor(page, mode, 'title');
    await page.evaluate((m) => startEntry(m), mode === 'hot' ? 'hotseat' : 'solo');
    await pickFirstRole(page);
    await cellsFor(page, mode, 'select');
    if (mode === 'hot') { await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; renderSelect(); }); await pickFirstRole(page); }
    await page.evaluate(([sd, md]) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame(md, sd, SEL.picks); }, [SEED, mode === 'hot' ? 'hotseat' : 'solo']);
    await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
    await drive(page, mode);
    await page.evaluate(() => document.getElementById('mainbtn').click());
    await page.waitForFunction(() => /再入妖市/.test(document.getElementById('mainbtn').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(200);
    await cellsFor(page, mode, 'end');
    await page.evaluate(() => showReview()); await page.waitForTimeout(200);
    await cellsFor(page, mode, 'review');
  } finally { R.pageErrors[mode] = errs; await ctx.close(); }
}

async function runNw(ch, full) {
  const mode = 'nw' + ch;
  const { ctx, page, errs } = await newCtx('?nwall=1');
  try {
    await page.evaluate(() => startEntry('nightwalk'));
    await page.waitForFunction(() => document.getElementById('nwScr').classList.contains('on') && document.getElementById('nwScr').dataset.view === 'menu');
    await page.waitForTimeout(150);
    await cellsFor(page, mode, 'nw-menu');
    await page.evaluate((c) => document.querySelector(`#nwScr .nwCard[data-ch="${c}"] .nwBtns button`).click(), ch);
    await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'intro');
    await page.waitForTimeout(150);
    await cellsFor(page, mode, 'nw-intro');
    await page.evaluate(() => document.getElementById('nwGo').click());
    await pickFirstRole(page);
    await cellsFor(page, mode, 'select');
    await page.evaluate(() => document.getElementById('selBtn').click());
    await page.waitForFunction((c) => window.__yaoshi.S && window.__yaoshi.S.chapter === c, ch);
    if (!full) { await drive(page, mode, (cls, n) => cls === 'bid' && n >= 2); return; }
    await drive(page, mode);
    await page.evaluate(() => {
      const Y = window.__yaoshi, S = Y.S, c = Y.nwChapter(S.chapter);
      const me = S.players.find((p) => !p.ai), boss = S.players.find((p) => p.ai && p.roleId === c.boss);
      boss.alive = false; boss.life = 0; me.alive = true; me.life = Math.max(me.life, 5);
    });
    await page.evaluate(() => document.getElementById('mainbtn').click());
    await page.waitForFunction(() => /回章節選單/.test(document.getElementById('mainbtn').textContent), null, { timeout: 30000 });
    await page.waitForTimeout(200);
    await cellsFor(page, mode, 'end');
    await page.evaluate(() => document.getElementById('nwReadScroll').click());
    await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'scroll');
    await page.waitForTimeout(150);
    await cellsFor(page, mode, 'nw-scroll');
  } finally { R.pageErrors[mode] = errs; await ctx.close(); }
}

try {
  for (const m of MODES) {
    const t0 = Date.now();
    if (m === 'solo' || m === 'hot') await runRegular(m);
    else if (m === 'nw1') await runNw(1, true);
    else if (m === 'nw2') await runNw(2, false);
    else if (m === 'nw3') await runNw(3, false);
    console.error(`[text-fit] ${m} done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
} finally { await browser.close(); srv.kill(); }

/* 彙總：一格＝(畫面鍵, 視口)。項目鍵＝選擇器（盤點以選擇器歸併） */
const sum = { cells: 0, cellsRed: 0, byVp: {}, items: {}, lost: [], ells: {} };
for (const [key, C] of Object.entries(R.cells)) {
  if (C.lost) sum.lost.push(key + ' lost' + C.lost);
  for (const [v, cell] of Object.entries(C.vp)) {
    sum.cells++; const bv = sum.byVp[v] || (sum.byVp[v] = { cells: 0, red: 0, redScrollOnly: 0 });
    bv.cells++;
    const hard = cell.items.filter((x) => !x.scrollable);
    if (cell.items.length) { sum.cellsRed++; bv.red++; if (!hard.length) bv.redScrollOnly++; }
    for (const x of cell.items) {
      const I = sum.items[x.sel] || (sum.items[x.sel] = { sel: x.sel, scrollable: x.scrollable, ellipsis: x.ellipsis, examples: [], where: [] });
      I.where.push(`${key}@${v}`);
      if (I.examples.length < 4 && !I.examples.some((e) => e.full === x.full)) I.examples.push({ full: x.full, shown: x.shown, sw: x.sw, cw: x.cw, sh: x.sh, ch: x.ch, overflow: x.overflow });
    }
    for (const e of cell.ells) (sum.ells[e.text] || (sum.ells[e.text] = { sel: e.sel, where: [] })).where.push(`${key}@${v}`);
  }
}
sum.itemCount = Object.keys(sum.items).length;
/* 可捲容器的全文位置驗證彙總；文字條 alpha 表（選擇器去掉系色 class 歸併） */
for (const I of Object.values(sum.items)) if (I.scrollable) {
  const rs = []; for (const C of Object.values(R.cells)) for (const cell of Object.values(C.vp)) for (const x of cell.items) if (x.sel === I.sel && x.reach) rs.push(x.reach);
  I.reach = { n: rs.length, ok: rs.filter((r) => r.ok).length, worst: rs.reduce((w, r) => (!w || r.reached / r.chars < w.reached / w.chars ? r : w), null) };
}
sum.guard = { cells: 0, spill: {}, overlap: {} };
for (const [key, C] of Object.entries(R.cells)) for (const [v, cell] of Object.entries(C.vp)) {
  if (!cell.guard) continue;
  if (cell.guard.spill.length || cell.guard.overlap.length) sum.guard.cells++;
  for (const s of cell.guard.spill) { const k = s.replace(/ [\d/ ]+$/, ''); (sum.guard.spill[k] || (sum.guard.spill[k] = [])).push(`${key}@${v} ${s.slice(k.length + 1)}`); }
  for (const s of cell.guard.overlap) { const k = s.replace(/ \d+x\d+$/, ''); (sum.guard.overlap[k] || (sum.guard.overlap[k] = [])).push(`${key}@${v}`); }
}
sum.strips = {};
for (const C of Object.values(R.cells)) for (const [v, cell] of Object.entries(C.vp)) for (const x of cell.strips || []) {
  const k = x.sel.replace(/\.fac-\w+/g, '');
  const a = sum.strips[k] || (sum.strips[k] = { n: 0, minOwn: 1, minEff: 1, noShadowLowAlpha: 0, screens: [], text: x.text });
  a.n++; a.minOwn = Math.min(a.minOwn, x.own); a.minEff = Math.min(a.minEff, x.eff);
  if (x.eff < 0.85 && !x.shadow) { a.noShadowLowAlpha++; if (a.screens.length < 6) a.screens.push(`${C.mode}|${C.cls}@${v}`); }
}
R.summary = sum;
fs.writeFileSync(path.join(OUT, `probe-${TAG}.json`), JSON.stringify(R, null, 1), 'utf8');
console.log(JSON.stringify({ tag: TAG, cells: sum.cells, cellsRed: sum.cellsRed, byVp: sum.byVp, items: sum.itemCount, lost: sum.lost, pageErrors: R.pageErrors,
  guard: { cells: sum.guard.cells, spill: Object.fromEntries(Object.entries(sum.guard.spill).map(([k, v]) => [k, `${v.length} 格，例 ${v[0]}`])), overlap: Object.fromEntries(Object.entries(sum.guard.overlap).map(([k, v]) => [k, `${v.length} 格，例 ${v[0]}`])) },
  strips: Object.entries(sum.strips).map(([k, a]) => `${k} n${a.n} minOwn ${a.minOwn} minEff ${a.minEff} 低於.85且無字影 ${a.noShadowLowAlpha} ${a.screens.join(',')}`),
  itemList: Object.values(sum.items).map((I) => `${I.scrollable ? `[scroll reach ${I.reach.ok}/${I.reach.n}] ` : ''}${I.sel} ×${I.where.length} 「${I.examples[0].full.slice(0, 24)}」→「${I.examples[0].shown.slice(0, 24)}」`) }, null, 1));
