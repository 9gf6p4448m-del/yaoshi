// 傷害可讀性批 2-a（v0.49）的量測治具。凍結檔＝docs/experiments/2026-09-07-acceptance-dmg-readability.md。
// 兩個模式：
//   node tests/tools/dmg-readability.mjs dom <out.json> [--seed=1] [--duels=10] [--port=9002] [--root=.]
//       → R3（量表紅殘影／己方紅暈）、R4（「−1 隻」與不重疊）、R5（doSkip 後清乾淨）、跳字與引擎事件的對位
//   node tests/tools/dmg-readability.mjs pix <outdir> [--seed=1] [--duels=6] [--port=9001] [--root=.] [--shots]
//       → R1（跳字對比度：截圖量文字色 vs 背後 8px 環帶）、R2（被打的尊閃紅：截圖量 R−(G+B)/2）、R5 的像素版
//
// 為什麼要「凍結畫面」才量得到：閃紅只有 120ms、跳字只有 600ms，而 page.screenshot 一張要 100–250ms。
// 所以本治具在頁面端裝一組**虛擬時鐘**（addInitScript，產品碼一行沒動）：
//   requestAnimationFrame／setTimeout／performance.now／Date.now 全部被包起來，freeze() 之後
//   遊戲的時間完全停住（rAF 不派、timer 不燒、時鐘不走、WAAPI／CSS 動畫 pause），
//   畫面停在最後畫出來的那一幀；Node 端慢慢截圖、量完再 resume()，遊戲從原本的時刻繼續。
//   量到的是**產品自己畫出來的畫面**，不是重建的模型。
//
// R2 的刺激來源（鑑別力）：對「被打的尊閃紅」這件事，基準版 69df086 根本不派 ys:fx-hit，
// 拿真實命中當刺激的話基準版一個樣本都拿不到、無從比較。所以 pix 模式一律**由治具自己派**
// 一顆 ys:fx-hit 給場上一尊（--synth，預設開），新舊兩版收到完全相同的刺激：新版會閃、舊版沒有接收端。
// 「產品真的會在命中時派這顆事件」由 dom 模式另外驗（逐筆對 beatsShown 的交鋒數與 target 側別）。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from './duel-drive.mjs';
import { createRequire } from 'node:module';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

/* ─────────── PNG 解碼（8-bit RGB／RGBA、非交錯；Playwright 的截圖就是這種） ─────────── */
function decodePng(buf) {
  let p = 8; let w = 0; let h = 0; let bd = 0; let ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; if (data[12] !== 0) throw new Error('interlaced png'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error(`unsupported png bd=${bd} ct=${ct}`);
  const ch = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let o = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[o++]; const line = raw.subarray(o, o + stride); o += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0; const b = prev ? prev[x] : 0; const c = x >= ch && prev ? prev[x - ch] : 0;
      let v = line[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pa = Math.abs(b - c); const pb = Math.abs(a - c); const pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}
const num = (v) => (v === null || v === undefined || !isFinite(v) ? null : +v.toFixed(2));
const px = (im, x, y) => { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
const srgb = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (c1, c2) => { const a = lum(...c1) + 0.05; const b = lum(...c2) + 0.05; return a > b ? a / b : b / a; };
/** 方框外圈 band 像素的平均色（不含框內）。 */
function ringAvg(im, r, band) {
  const x0 = Math.max(0, Math.floor(r.x0 - band)); const x1 = Math.min(im.w - 1, Math.ceil(r.x1 + band));
  const y0 = Math.max(0, Math.floor(r.y0 - band)); const y1 = Math.min(im.h - 1, Math.ceil(r.y1 + band));
  let n = 0; let R = 0; let G = 0; let B = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) continue;
    const [a, b, c] = px(im, x, y); R += a; G += b; B += c; n++;
  }
  return n ? { rgb: [R / n, G / n, B / n], n } : null;
}
/** 方框內像素的「紅偏量」平均：R−(G+B)/2（0–255 尺度；凍結檔 R2 的量法）。 */
function redness(im, r) {
  const x0 = Math.max(0, Math.floor(r.x0)); const x1 = Math.min(im.w - 1, Math.ceil(r.x1));
  const y0 = Math.max(0, Math.floor(r.y0)); const y1 = Math.min(im.h - 1, Math.ceil(r.y1));
  let n = 0; let s = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const [R, G, B] = px(im, x, y); s += R - (G + B) / 2; n++; }
  return n ? s / n : null;
}

/* ─────────── 頁面端：虛擬時鐘 ＋ 探針 ─────────── */
const HARNESS = `(() => {
  const W = window, P0 = performance.now.bind(performance), D0 = Date.now.bind(Date);
  const RAF = W.requestAnimationFrame.bind(W), CAF = W.cancelAnimationFrame.bind(W);
  const ST = W.setTimeout.bind(W), CT = W.clearTimeout.bind(W);
  const F = W.__frz = { on: false, off: 0, atP: 0, atD: 0, rafQ: [], timers: new Map(), id: 1, anims: [], froze: 0 };
  performance.now = () => (F.on ? F.atP : P0()) - F.off;
  Date.now = () => (F.on ? F.atD : D0()) - F.off;
  const vnow = () => performance.now();
  // rAF 的時戳一定要換成虛擬時鐘：renderer.js 的 frame(now) 直接把它當 performance.now 用
  // （duel-figures 的閃紅／退暗包絡都拿它跟 performance.now() 記的 t0 相減）。
  // 不換的話 off 一累積，第一次凍結之後所有包絡都會被算成「早就結束」——閃紅永遠量不到。
  W.requestAnimationFrame = (cb) => { const w = () => cb(vnow()); if (!F.on) return RAF(w); const id = F.id++; F.rafQ.push({ id: id, cb: w }); return -id; };
  W.cancelAnimationFrame = (h) => { if (h < 0) { F.rafQ = F.rafQ.filter((x) => x.id !== -h); return; } CAF(h); };
  W.setTimeout = function (cb, ms) {
    const args = [].slice.call(arguments, 2), id = F.id++;
    const rec = { ms: Math.max(0, ms | 0), start: vnow(), h: 0 };
    rec.arm = () => { rec.h = ST(() => { F.timers.delete(id); cb.apply(null, args); }, Math.max(0, rec.ms - (vnow() - rec.start))); };
    F.timers.set(id, rec);
    if (!F.on) rec.arm();
    return -id;
  };
  W.clearTimeout = (h) => { if (h < 0) { const r = F.timers.get(-h); if (r) { if (r.h) CT(r.h); F.timers.delete(-h); } return; } CT(h); };
  F.freeze = () => {
    if (F.on) return false;
    F.atP = P0(); F.atD = D0(); F.on = true; F.froze++;
    for (const r of F.timers.values()) { if (r.h) { CT(r.h); r.h = 0; } }
    F.anims = [];
    try { document.getAnimations().forEach((a) => { if (a.playState === 'running') { a.pause(); F.anims.push(a); } }); } catch (e) {}
    return true;
  };
  F.resume = () => {
    if (!F.on) return false;
    F.off += P0() - F.atP; F.on = false;
    F.anims.forEach((a) => { try { a.play(); } catch (e) {} }); F.anims = [];
    for (const r of F.timers.values()) if (!r.h) r.arm();
    const q = F.rafQ.splice(0); q.forEach((x) => RAF(x.cb));
    return true;
  };

  // ── 探針 ──
  const M = W.__dmg = { ready: null, busy: false, next: null, floats: [], hits: [], burns: [], ends: [], duelN: 0, seq: 0, note: {}, done: {} };
  const fig = () => { try { return window.__yaoshi3d && window.__yaoshi3d.duelFigures; } catch (e) { return null; } };
  const cam = () => { try { return window.__yaoshi3d && window.__yaoshi3d.camera; } catch (e) { return null; } };
  // 那一尊在畫面上實際佔的方框（世界包圍盒八角投影＋canvas rect；與產品的 pwScreenOf 不同路）
  M.figBox = (side, unit) => {
    try {
      const D = fig(), K = cam(), Y3 = window.__yaoshi3d; if (!D || !K || !Y3 || !Y3.renderer) return null;
      const f = D.figureOf(side, unit); if (!f || !f.group || !f.group.visible) return null;
      const g = f.group; g.updateWorldMatrix(true, true);
      let mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
      // 「那一尊」的方框＝**模型本身**的包圍盒（3D 妖的工廠 bounds()）。
      // 不用整個 group 的原因：group 底下還掛著腳下的水面（groundFx）與特效，
      // 水面比獸本身寬一大截，框進去等於在框空地——量出來的是背景不是那一尊。
      // 貼片人形沒有 bounds()，退回遞迴所有網格（它本來就只有人形那幾片）。
      const bb = typeof f.bounds === 'function' ? f.bounds() : null;
      if (bb) {
        for (const cx of [bb.min.x, bb.max.x]) for (const cy of [bb.min.y, bb.max.y]) for (const cz of [bb.min.z, bb.max.z]) {
          const v = new g.position.constructor(cx, cy, cz).applyMatrix4(g.matrixWorld);
          mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z);
        }
      }
      if (!bb) g.traverse((o) => {
        const geo = o.geometry; if (!geo || !geo.attributes || !geo.attributes.position) return;
        if (!geo.boundingBox) geo.computeBoundingBox();
        const b = geo.boundingBox; if (!b) return;
        for (const cx of [b.min.x, b.max.x]) for (const cy of [b.min.y, b.max.y]) for (const cz of [b.min.z, b.max.z]) {
          const v = new o.position.constructor(cx, cy, cz).applyMatrix4(o.matrixWorld);
          mnx = Math.min(mnx, v.x); mxx = Math.max(mxx, v.x); mny = Math.min(mny, v.y); mxy = Math.max(mxy, v.y); mnz = Math.min(mnz, v.z); mxz = Math.max(mxz, v.z);
        }
      });
      if (!isFinite(mnx)) return null;
      const rect = Y3.renderer.domElement.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const cx of [mnx, mxx]) for (const cy of [mny, mxy]) for (const cz of [mnz, mxz]) {
        const v = new g.position.constructor(cx, cy, cz).project(K);
        const sx = rect.left + (v.x * 0.5 + 0.5) * rect.width, sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      return { x0: x0, y0: y0, x1: x1, y1: y1 };
    } catch (e) { return null; }
  };
  M.liveUnits = (side) => { const D = fig(); if (!D) return []; try { return D.figuresOf(side).filter((f) => f.group && f.group.visible).map((f) => f.unit && f.unit.id); } catch (e) { return []; } };
  M.hitK = () => { const D = fig(); if (!D) return null; try { return ['A', 'B'].map((s) => D.figuresOf(s).map((f) => +(f.__hitK || 0))); } catch (e) { return null; } };
  M.floatsNow = () => [...document.querySelectorAll('.dmgfloat')].map((el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const m = (cs.color.match(/[\\d.]+/g) || []).map(Number);
    return { seq: +(el.dataset.mseq || 0), cls: el.className, kind: el.dataset.kind || '', side: el.dataset.side, unit: +el.dataset.unit,
      text: el.textContent, mode: el.dataset.mode, color: [m[0], m[1], m[2]], font: parseFloat(cs.fontSize),
      op: parseFloat(cs.opacity), rect: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } };
  });
  M.domNow = () => ({
    floats: document.querySelectorAll('.dmgfloat').length,
    units: document.querySelectorAll('.dmgfloat.unit').length,
    ghosts: [...document.querySelectorAll('.pwgauge b.ghost')].map((g) => ({ id: g.parentNode.id, left: g.style.left, w: g.style.width })),
    edges: document.querySelectorAll('#duel i.hurtedge').length,
    gauge: [...document.querySelectorAll('.pwgauge')].map((g) => ({ id: g.id, w: (g.querySelector('i') || {}).style ? g.querySelector('i').style.width : null })),
  });
  // 每一格凍結：freeze 之後把 ready 掛上去，Node 端截完圖再呼叫 __frzGo() 往下一格
  M.run = (tag, meta, steps, onStep) => {
    if (M.busy) return false;
    M.busy = true;
    let i = 0;
    const step = () => {
      if (i >= steps.length) { M.busy = false; M.next = null; return; }
      const prev = i ? steps[i - 1] : 0, d = steps[i] - prev, k = i; i++;
      const go = () => {
        F.freeze();
        if (onStep) { try { onStep(k); } catch (e) {} } // 凍住之後才動作（例如派刺激）：畫面停在動作發生前那一幀
        M.ready = { tag: tag, meta: meta, step: k, at: steps[k], cam: M.camPos(), hk: M.hitK(), bn: M.burns.length, on: !!M.duelOn, ids: [M.liveUnits('A'), M.liveUnits('B')] };
      };
      if (d <= 0) go(); else setTimeout(go, d);
    };
    M.next = step; step(); return true;
  };
  M.camPos = () => { try { const K = cam(); return K ? [+K.position.x.toFixed(4), +K.position.y.toFixed(4), +K.position.z.toFixed(4)] : null; } catch (e) { return null; } };
  W.__frzGo = () => { M.ready = null; F.resume(); if (M.next) M.next(); };

  // 跳字：一冒出來就編號（重用池會讓同一個節點再用，所以每次都要重編）
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((ms) => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (!n.classList || !n.classList.contains('dmgfloat')) continue;
        const seq = ++M.seq;
        n.dataset.mseq = String(seq);
        M.floats.push({ seq: seq, t: vnow(), duel: M.duelN, cls: n.className, kind: n.dataset.kind || '', side: n.dataset.side, unit: +n.dataset.unit,
          text: n.textContent, left: n.style.left, top: n.style.top, font: parseFloat(getComputedStyle(n).fontSize) });
        if (W.__dmgArmFloat) W.__dmgArmFloat(seq);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
  const skipNow = () => { try { return !!SKIP; } catch (e) { return null; } }; // SKIP 是 let 全域：只能用裸名字取，window.SKIP 拿不到
  document.addEventListener('ys:fx-hit', (e) => { const d = e.detail || {}; M.hits.push({ t: vnow(), duel: M.duelN, side: d.side, unit: d.unit, ms: d.ms, synth: !!d.__synth, skip: skipNow() }); });
  document.addEventListener('ys:fx-burn', (e) => { const d = e.detail || {}; M.burns.push({ t: vnow(), duel: M.duelN, side: d.side, unit: d.unit, skip: skipNow() }); });
  document.addEventListener('ys:duel', () => { M.duelN = (M.duelN || 0) + 1; M.note.duels = M.duelN; });
  document.addEventListener('ys:duel-end', () => { M.note.ends = (M.note.ends || 0) + 1; M.ends.push({ n: M.duelN, t: vnow() }); });
})();`;

/* ─────────── dom 模式（不凍結）：R3／R4／R5 與事件對位 ─────────── */
const DOM_PROBE = `(() => {
  const M = window.__dmg, S = window.__dmgDom = { edge: [], skip: null, burns: [], edges: [], ghosts: [], ends: [] };
  const now = () => performance.now();
  const ghostMs = () => (typeof PW_FX === 'undefined' ? 300 : PW_FX.GAUGE_GHOST_MS);
  const skipNow = () => { try { return !!SKIP; } catch (e) { return null; } };
  // 邊緣紅暈：用 MutationObserver 記「什麼時候長出來、什麼時候被拿掉」，不用固定時點取樣
  // ——命中事件與紅暈之間隔著 fxHitstop（停格），固定 20ms 量會整批落空。
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((ms) => {
      for (const m of ms) {
        for (const n of m.addedNodes) {
          if (n.classList && n.classList.contains('hurtedge')) { const row = { t: now(), duel: M.duelN, gone: null }; n.__row = row; S.edges.push(row); }
          if (n.classList && n.classList.contains('ghost')) { const row = { t: now(), duel: M.duelN, side: (n.parentNode || {}).id, gone: null }; n.__grow = row; S.ghosts.push(row); }
        }
        for (const n of m.removedNodes) {
          if (n.classList && n.classList.contains('hurtedge') && n.__row) n.__row.gone = now();
          if (n.classList && n.classList.contains('ghost') && n.__grow) n.__grow.gone = now();
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
  document.addEventListener('ys:fx-burn', (e) => {
    const d = e.detail || {};
    const g = document.getElementById('pwg-' + d.side);
    const w0 = g && g.querySelector('i') ? parseFloat(g.querySelector('i').style.width) : null;
    const row = { t: now(), duel: M.duelN, side: d.side, unit: d.unit, w0: w0, at50: null, atGhostEnd: null, skip: skipNow() };
    S.burns.push(row);
    setTimeout(() => {
      const gg = g && g.querySelector('b.ghost'), bar = g && g.querySelector('i');
      row.at50 = { has: !!gg, left: gg ? gg.style.left : null, w: gg ? gg.style.width : null,
        bar: bar ? bar.style.width : null, from: gg ? gg.dataset.from : null };
      row.units = document.querySelectorAll('.dmgfloat.unit').length;
    }, 50);
    setTimeout(() => { row.atGhostEnd = document.querySelectorAll('#pwg-' + d.side + ' b.ghost').length; }, ghostMs() + 100);
  });
  document.addEventListener('ys:fx-hit', (e) => {
    const d = e.detail || {};
    S.edge.push({ t: now(), duel: M.duelN, side: d.side, unit: d.unit, skip: skipNow(),
      mySide: (typeof pwMySide === 'undefined' ? null : pwMySide) });
  });
  document.addEventListener('ys:duel-end', () => {
    // 對決收場之後殘影／紅暈都不得留著（下一場的量表是新建的，留著就是跨場殘留）
    setTimeout(() => { S.ends.push({ t: now(), duel: M.duelN,
      ghosts: document.querySelectorAll('.pwgauge b.ghost').length,
      edges: document.querySelectorAll('#duel i.hurtedge').length }); }, ghostMs() + 200);
  });
  window.__dmgSkip = (n) => {
    if (S.skip) return false;
    S.skip = { t: now(), n: n, before: M.domNow() };
    try { window.doSkip(); } catch (e) { S.skip.err = String(e); }
    setTimeout(() => { S.skip.after300 = M.domNow(); S.skip.hitK = M.hitK(); }, 300);
    return true;
  };
})();`;

/* ─────────── 共用：起頁面 ─────────── */
async function openPage(browser, opt, extra) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  await page.addInitScript(HARNESS);
  if (extra) await page.addInitScript(extra);
  return page;
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const mode = pos[0];
const out = pos[1];
if (!mode || !out) { console.error('need <dom|pix> <out.json|outdir>'); process.exit(2); }
const port = Number(opt.port || (mode === 'pix' ? 9001 : 9002));
const root = opt.root ? path.resolve(opt.root) : ROOT;
const seed = Number(opt.seed || 1);
const duels = Number(opt.duels || (mode === 'pix' ? 6 : 10));
const url = opt.url || `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${seed}`;

const srv = await serve(root, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  if (mode === 'dom') await runDom(browser);
  else await runPix(browser);
  await browser.close();
} finally { srv.kill(); }

/* ═══════════ dom 模式 ═══════════ */
async function runDom(browser) {
  const page = await openPage(browser, opt, DOM_PROBE);
  const skipAt = Number(opt.skipat || Math.max(2, Math.floor(duels / 2)));
  const r = await drive(page, url, { duels: duels, onDuel: async (pg, n) => {
    if (n !== skipAt) return;
    await pg.waitForTimeout(2600); // 讓這一場演到有跳字／殘影再按跳過
    await pg.evaluate((k) => window.__dmgSkip(k), n);
    await pg.waitForTimeout(600);
  } });
  const data = await page.evaluate(() => ({ dom: window.__dmgDom, dmg: { floats: window.__dmg.floats, hits: window.__dmg.hits, burns: window.__dmg.burns, note: window.__dmg.note },
    fxc: window.__ysFxCount || null, mySide: typeof pwMySide === 'undefined' ? null : pwMySide, pwfx: typeof PW_FX === 'undefined' ? null : JSON.parse(JSON.stringify(PW_FX)) }));
  const v = judgeDom(data);
  fs.writeFileSync(out, JSON.stringify({ url: url, seed: seed, duels: duels, verdict: v, data: data, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ out: out, seed: seed, errors: r.errors.length, ...v.summary }));
  console.log('VERDICT ' + Object.entries(v.res).map(([k, x]) => `${k}=${x ? 'PASS' : 'FAIL'}`).join(' '));
  if (v.bad.length) console.log(v.bad.slice(0, 12).join('\n'));
}

function judgeDom(D) {
  const bad = [];
  const S = D.dom, M = D.dmg;
  const ghostMs = (D.pwfx && D.pwfx.GAUGE_GHOST_MS) || 300;
  const edgeMs = (D.pwfx && D.pwfx.HURT_EDGE_MS) || 150;
  // ── R3-a 量表紅殘影 ──
  // 「殘影消失」只在這一側 GHOST_MS+100 內沒有下一筆燒毀時才判：後面那一筆會把同一條殘影接著用，
  // 這時候還在畫面上是對的（右緣固定、左緣跟著新的存活寬度走）。
  let g50 = 0, gBad = 0, gEnd = 0, gEndBad = 0, gSkip = 0;
  const burnsAll = S.burns.slice().sort((a, b) => a.t - b.t);
  for (const b of burnsAll) {
    if (b.skip) { gSkip++; continue; }
    if (!b.at50) continue;
    g50++;
    const w = b.at50.w ? parseFloat(b.at50.w) : null, from = b.at50.from ? parseFloat(b.at50.from) : null, bar = b.at50.bar ? parseFloat(b.at50.bar) : null;
    if (!b.at50.has || w === null || from === null || bar === null || Math.abs(w - (from - bar)) > 1) {
      gBad++; bad.push('R3 ghost@50 side=' + b.side + ' unit=' + b.unit + ' ' + JSON.stringify(b.at50));
    }
    const later = burnsAll.some((x) => x !== b && x.side === b.side && x.t > b.t && x.t <= b.t + ghostMs + 100);
    if (b.atGhostEnd !== null && !later) { gEnd++; if (b.atGhostEnd !== 0) { gEndBad++; bad.push('R3 ghost 未消失 side=' + b.side + ' n=' + b.atGhostEnd); } }
  }
  for (const e of S.ends) if (e.ghosts !== 0 || e.edges !== 0) { gEndBad++; bad.push('R3 對決收場後仍有殘留 ' + JSON.stringify(e)); }
  // 每一條殘影自己的壽命（MutationObserver 量的真實出生／移除時刻）：GHOST_MS+100 內要收掉。
  // 被後面那一筆燒毀接著用的殘影，壽命是從第一次冒出來算到最後收掉，門檻順延到最後一次更新
  const ghosts = (S.ghosts || []).filter((g) => g.gone !== null);
  const ghostLifeMax = ghosts.length ? Math.max(...ghosts.map((g) => g.gone - g.t)) : null;
  const ghostSlow = ghosts.filter((g) => {
    const last = burnsAll.filter((b) => !b.skip && ('pwg-' + b.side) === g.side && b.t >= g.t - 30 && b.t <= g.gone).map((b) => b.t);
    const base = last.length ? Math.max(...last) : g.t;
    return g.gone - base > ghostMs + 100;
  });
  if (ghostSlow.length) { gEndBad++; bad.push('R3 殘影超時 ' + ghostSlow.length + ' 條，最長 ' + Math.max(...ghostSlow.map((g) => Math.round(g.gone - g.t))) + 'ms'); }
  // ── R3-b 己方紅暈 ──
  const hits = S.edge.filter((h) => !h.skip && h.mySide);
  const mine = hits.filter((h) => h.side === h.mySide);
  const foe = hits.filter((h) => h.side !== h.mySide);
  const edges = S.edges;
  let eBad = 0;
  if (mine.length !== edges.length) { eBad++; bad.push('R3 己方受擊 ' + mine.length + ' 筆 ≠ 紅暈 ' + edges.length + ' 片'); }
  const lateGone = edges.filter((e) => e.gone === null || e.gone - e.t > edgeMs + 80);
  if (lateGone.length) { eBad++; bad.push('R3 紅暈沒在 ' + edgeMs + '+80ms 內收掉：' + lateGone.length + ' 片'); }
  for (const e of edges) if (!mine.some((h) => e.t - h.t >= -5 && e.t - h.t < 500)) { eBad++; bad.push('R3 找不到對應的己方受擊（紅暈 t=' + e.t.toFixed(0) + '）'); }
  // ── R4 「−1 隻」 ──
  const unitFloats = M.floats.filter((f) => /\bunit\b/.test(f.cls));
  const burnsSkipped = M.burns.filter((b) => b.skip).length;
  const burnsN = M.burns.length - burnsSkipped; // SKIP 之後不演（與 pwLamps／pwGauge 同一條 L-3 規矩）
  const unitOk = unitFloats.length === burnsN;
  if (!unitOk) bad.push('R4 「−1 隻」' + unitFloats.length + ' ≠ burn ' + burnsN + '（SKIP 中的 ' + burnsSkipped + ' 筆不算）');
  let overlap = 0;
  for (const u of unitFloats) {
    const near = M.floats.filter((f) => f.seq !== u.seq && !/\bunit\b/.test(f.cls) && Math.abs(f.t - u.t) < 600 && f.side === u.side && f.unit === u.unit);
    for (const f of near) {
      const dy = Math.abs(parseFloat(f.top) - parseFloat(u.top)), dx = Math.abs(parseFloat(f.left) - parseFloat(u.left));
      const need = Math.max(f.font || 27, u.font || 17);
      if (Math.hypot(dx, dy) < need) { overlap++; bad.push('R4 重疊 seq=' + u.seq + '/' + f.seq + ' d=' + Math.hypot(dx, dy).toFixed(1) + ' need=' + need); }
    }
  }
  const texts = unitFloats.filter((f) => f.text !== '−1 隻');
  if (texts.length) bad.push('R4 文字不是「−1 隻」：' + texts.length + ' 筆');
  // ── R5 doSkip ──
  const sk = S.skip;
  const skOk = !!sk && sk.after300 && sk.after300.floats === 0 && sk.after300.ghosts.length === 0 && sk.after300.edges === 0
    && !!sk.hitK && sk.hitK.every((s) => s.every((k) => k === 0));
  if (sk && !skOk) bad.push('R5 skip 殘留 ' + JSON.stringify(sk.after300) + ' hitK=' + JSON.stringify(sk.hitK));
  if (!sk) bad.push('R5 沒按到跳過（樣本 0）');
  // ── 接線：ys:fx-hit 逐筆對 beatsShown ──
  let evOk = true, evShown = 0; const evBad = [];
  const fights = (D.fxc && D.fxc.fights) || [];
  const skipN = S.skip ? S.skip.n : -1; // 按過跳過的那一場不比
  const wants = [];
  fights.forEach((f, i) => {
    if ((i + 1) === skipN) return;
    for (const b of (f.beatsShown || [])) for (const x of (b.shown || [])) {
      if (x.kind === 'trait') continue;
      evShown++;
      wants.push((x.side === 'B' ? 'A' : 'B') + ':' + x.target);
    }
  });
  // 只比「已經演完並記進 fights」的那幾場：驅動器停手時常常還開著下一場（同 closeup P0 的收手邊界）
  const useHit = (h) => !h.synth && !h.skip && h.duel <= fights.length && h.duel !== skipN;
  const realHits = M.hits.filter(useHit).length;
  if (evShown && realHits !== evShown) { evOk = false; evBad.push('ys:fx-hit ' + realHits + ' ≠ 演出交鋒 ' + evShown); }
  const got = M.hits.filter(useHit).map((h) => h.side + ':' + h.unit);
  const cnt = (a) => a.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  const cw = cnt(wants), cg = cnt(got);
  for (const k of new Set([...Object.keys(cw), ...Object.keys(cg)])) if ((cw[k] || 0) !== (cg[k] || 0)) { evOk = false; evBad.push('target 對位 ' + k + ': want ' + (cw[k] || 0) + ' got ' + (cg[k] || 0)); }
  if (!evOk) bad.push('WIRE ' + evBad.slice(0, 5).join('; '));
  const res = { R3: g50 > 0 && gBad === 0 && gEndBad === 0 && eBad === 0 && mine.length > 0 && foe.length > 0,
    R4: unitOk && overlap === 0 && texts.length === 0 && burnsN > 0, R5: skOk, WIRE: evOk && realHits > 0 };
  return { res: res, bad: bad,
    summary: { ghostSamples: g50, ghostBad: gBad, ghostGoneChecked: gEnd, ghostGoneBad: gEndBad, ghostSkipped: gSkip,
      hitMine: mine.length, hitFoe: foe.length, edges: edges.length, edgeBad: eBad,
      edgeLifeMax: edges.filter((e) => e.gone !== null).length ? Math.max(...edges.filter((e) => e.gone !== null).map((e) => +(e.gone - e.t).toFixed(0))) : null,
      unitFloats: unitFloats.length, burns: burnsN, burnsSkipped: burnsSkipped, overlap: overlap,
      hits: realHits, shownHits: evShown, skipAfter: sk ? sk.after300 : null } };
}

/* ═══════════ pix 模式 ═══════════ */
async function runPix(browser) {
  const outdir = out;
  fs.mkdirSync(outdir, { recursive: true });
  const synth = opt.synth === undefined ? true : opt.synth !== '0';
  const maxFloat = Number(opt.maxfloat || 40);
  const maxHit = Number(opt.maxhit || 10);
  const PIX_PROBE = `(() => {
    const M = window.__dmg;
    M.cfg = { synth: ${synth}, maxFloat: ${maxFloat}, maxHit: ${maxHit} };
    M.nFloat = 0; M.nHit = 0;
    // 跳字：冒出來 +150ms（彈完、正在飄）凍住量對比度
    // 跳字冒出來 +150ms（彈完、還沒開始淡）凍住量對比度。忙就再等一拍——
    // 閃紅的凍幀序列一次佔住 4 格，不重試的話跳字的樣本會被吃光（實測一整場只剩 2 筆）。
    M.lastFloatT = -1e9;
    window.__dmgArmFloat = (seq) => {
      if (M.nFloat >= M.cfg.maxFloat) return;
      M.lastFloatT = performance.now();
      let tries = 0;
      const go = () => {
        if (M.nFloat >= M.cfg.maxFloat) return;
        const el = document.querySelector('.dmgfloat[data-mseq="' + seq + '"]');
        if (!el) return; // 已經飄完了就算了
        if (M.busy) { if (++tries < 8) setTimeout(go, 60); return; }
        M.nFloat++;
        M.run('float', { seq: seq }, [0]);
      };
      setTimeout(go, 150);
    };
    // 閃紅：由治具自己派刺激（新舊兩版同一顆事件）。四格 [0, 40, 40, 200]：
    //   f0＝探路、f1＝命中前（**在這一格凍住之後才派事件**，所以畫面停在命中前）、f2＝命中後 40ms、f3＝+200ms。
    // f0→f1 是「同樣的 40ms 但沒有刺激」的空白對照：那一段方框有沒有移動（鏡頭在推近／人在被撞退）
    // 決定這個樣本能不能用——量兩張不同構圖的圖，差值量到的是鏡頭不是閃紅。
    M.fire = (side, unit, extra) => {
      const meta = { side: side, unit: unit, foe: side === 'B' ? 'A' : 'B' };
      if (extra) Object.assign(meta, extra);
      const ms = (window.PW_FX && window.PW_FX.HIT_FLASH_MS) || 120;
      return M.run('flash', meta, [0, 40, 80, 280], (k) => {
        if (k !== 1) return;
        try { document.dispatchEvent(new CustomEvent('ys:fx-hit', { detail: { side: side, unit: unit, ms: ms, __synth: true } })); } catch (e) {}
      });
    };
    // 對決演到一半才打（不在進場／收場的淡入淡出上量：那時整個畫面都在變）；每 300ms 試一次
    M.duelOn = false; M.duelT = 0;
    document.addEventListener('ys:duel', () => { M.duelOn = true; M.duelT = performance.now(); });
    document.addEventListener('ys:duel-end', () => { M.duelOn = false; });
    // 已經被燒掉（或正在燒）的尊不當刺激目標：燒毀中的尊照規矩就不閃（凍結檔 R2 的另一半），
    // 拿它當「應該要閃」的樣本量到的必然是 0，那不是實作壞了，是刺激打錯對象。
    M.burnt = new Set();
    document.addEventListener('ys:fx-burn', (e) => { const d = e.detail || {}; M.burnt.add(d.side + ':' + d.unit); });
    document.addEventListener('ys:duel', () => { M.burnt.clear(); });
    M.pickTarget = (side) => {
      const us = M.liveUnits(side).filter((u) => typeof u === 'number' && !M.burnt.has(side + ':' + u));
      const rows = us.map((u) => { const b = M.figBox(side, u); return { u: u, a: b ? (b.x1 - b.x0) * (b.y1 - b.y0) : 0, b: b }; })
        .filter((r) => r.b && r.b.x0 > -20 && r.b.x1 < innerWidth + 20 && r.b.y0 > -20 && r.b.y1 < innerHeight + 20)
        .sort((p, q) => q.a - p.a);
      return rows;
    };
    M.tryFire = () => {
      if (M.busy || M.nHit >= M.cfg.maxHit || !M.cfg.synth) return;
      if (!M.duelOn || performance.now() - M.duelT < 1600) return;
      if (performance.now() - M.lastFloatT < 700) return; // 剛冒出跳字：讓 R1 的取樣先做完
      const ov = document.getElementById('duel');
      if (!ov || getComputedStyle(ov).opacity !== '1') return; // 淡入淡出中不量
      const side = (M.nHit % 2) ? 'B' : 'A', foe = side === 'B' ? 'A' : 'B';
      const rows = M.pickTarget(side), frows = M.pickTarget(foe);
      if (!rows.length || rows[0].a < 4000 || !frows.length) return; // 太小的尊：方框裡幾乎都是背景，量不出東西
      // 對照組取**對面那一欄**最大的一尊：同一欄的兩尊在畫面上會互相疊到（擠堆時方框幾乎重合），
      // 拿同欄的當對照，target 一閃連對照也跟著紅，會誤判成「整片閃紅」。
      const t = rows[0].b, c = frows[0].b;
      const overlap = !(c.x1 < t.x0 || c.x0 > t.x1 || c.y1 < t.y0 || c.y0 > t.y1);
      if (overlap) return;
      M.nHit++;
      M.fire(side, rows[0].u, { control: frows[0].u, ctrlSide: foe });
    };
    document.addEventListener('ys:duel', () => {
      const tick = () => { M.tryFire(); if (M.nHit < M.cfg.maxHit) setTimeout(tick, 220); };
      setTimeout(tick, 1700);
    });
    // 燒毀中的尊不得閃紅：燒到一半對同一尊派一顆 hit（真實路徑上的守衛探針）
    document.addEventListener('ys:fx-burn', (e) => {
      const d = e.detail || {};
      if (!M.cfg.synth || (M.done.burnProbe || 0) >= 4) return;
      setTimeout(() => {
        if (M.busy) return;
        const us = M.liveUnits(d.side);
        M.done.burnProbe = (M.done.burnProbe || 0) + 1;
        M.fire(d.side, d.unit, { burning: true, control: us.find((u) => u !== d.unit) });
      }, 60);
    });
    // 量表紅殘影的凍幀（R7 用）：燒毀之後 90ms 凍住，殘影一定還在（GAUGE_GHOST_MS 300）
    document.addEventListener('ys:fx-burn', () => {
      if ((M.done.ghostShot || 0) >= 2) return;
      // 忙就再等一拍（跳字的凍幀幾乎一直在排隊）；殘影有 GAUGE_GHOST_MS(300)＋收起來那 60ms 可以等
      let tries = 0;
      const go = () => {
        if ((M.done.ghostShot || 0) >= 2) return;
        if (M.busy) { if (++tries < 6) setTimeout(go, 60); return; }
        if (!document.querySelector('.pwgauge b.ghost')) { if (++tries < 6) setTimeout(go, 60); return; }
        M.done.ghostShot = (M.done.ghostShot || 0) + 1;
        M.run('ghost', {}, [0]);
      };
      setTimeout(go, 80);
    });
    // R5：派一顆 hit → +40ms 按跳過 → +300ms 量
    window.__dmgSkipPix = () => {
      const side = 'A', rows = M.pickTarget(side); // 已燒掉的尊不能當目標（它照規矩本來就不閃）
      if (M.busy || !rows.length || !M.duelOn) return false;
      const unit = rows[0].u;
      return M.run('skip', { side: side, unit: unit }, [0, 40, 340], (k) => {
        if (k === 0) { try { document.dispatchEvent(new CustomEvent('ys:fx-hit', { detail: { side: side, unit: unit, ms: 120, __synth: true } })); } catch (e) {} }
        if (k === 1) { try { window.doSkip(); } catch (e) {} } // 正在閃的時候按跳過
      });
    };
  })();`;
  const page = await openPage(browser, opt, PIX_PROBE);
  const shots = [];
  const samples = { floats: [], flashes: [], skip: [] };
  const shotDir = path.join(outdir, 'frames');
  fs.mkdirSync(shotDir, { recursive: true });
  let nshot = 0;
  let runId = 0;
  const seenFloat = new Set();

  const pump = async (pg) => {
    for (let guard = 0; guard < 6; guard++) {
      const r = await pg.evaluate(() => (window.__dmg.ready ? { tag: window.__dmg.ready.tag, meta: window.__dmg.ready.meta, step: window.__dmg.ready.step, at: window.__dmg.ready.at, cam: window.__dmg.ready.cam, hk: window.__dmg.ready.hk, bn: window.__dmg.ready.bn, on: window.__dmg.ready.on, ids: window.__dmg.ready.ids } : null)).catch(() => null);
      if (!r) return;
      if (r.step === 0) runId++;
      const file = path.join(shotDir, `${String(++nshot).padStart(4, '0')}-${r.tag}-${r.step}.png`);
      await pg.screenshot({ path: file }).catch(() => {});
      let im = null;
      try { im = decodePng(fs.readFileSync(file)); } catch (e) { im = null; }
      // 每一張凍幀都順便量畫面上的跳字（不限 tag）：閃紅的凍幀一樣看得到跳字，
      // 不順便量的話 R1 的樣本會被 R2 的凍幀排擠掉（實測一整場只剩 5 筆）。
      // 只量**已經完全顯示**的（opacity ≥ 0.8）：跳字有 120ms 的彈出與尾段淡出，
      // 半透明那幾幀本來就該淡，拿去判對比度是量錯東西。
      if (im) {
        const fl = await pg.evaluate(() => window.__dmg.floatsNow()).catch(() => []);
        for (const f of fl) {
          if (!f.seq || seenFloat.has(f.seq)) continue;
          if (!f.rect || f.rect.x1 <= f.rect.x0) continue;
          if (!(f.op >= 0.8)) continue;
          const ring = ringAvg(im, f.rect, 8);
          if (!ring) continue;
          seenFloat.add(f.seq);
          samples.floats.push({ seq: f.seq, cls: f.cls, kind: f.kind, text: f.text, font: f.font, mode: f.mode, op: f.op,
            color: f.color, ring: ring.rgb.map((x) => +x.toFixed(1)), n: ring.n,
            ratio: +contrast(f.color, ring.rgb).toFixed(2), file: path.basename(file) });
        }
      }
      if ((r.tag === 'flash' || r.tag === 'skip') && im) {
        const boxes = await pg.evaluate((m) => ({ t: window.__dmg.figBox(m.side, m.unit), c: m.control === undefined || m.control === null ? null : window.__dmg.figBox(m.ctrlSide || m.side, m.control) }), r.meta).catch(() => null);
        const row = { run: runId, step: r.step, at: r.at, meta: r.meta, file: path.basename(file), cam: r.cam, hk: r.hk, bn: r.bn, on: r.on, ids: r.ids, box: boxes && boxes.t ? boxes.t : null, cbox: boxes && boxes.c ? boxes.c : null,
          t: num(boxes && boxes.t ? redness(im, boxes.t) : null),
          c: num(boxes && boxes.c ? redness(im, boxes.c) : null) };
        (r.tag === 'skip' ? samples.skip : samples.flashes).push(row);
      }
      shots.push({ file: path.basename(file), tag: r.tag, step: r.step, at: r.at, meta: r.meta });
      await pg.evaluate(() => window.__frzGo()).catch(() => {});
    }
  };

  let skipDone = false;
  const r = await drive(page, url, { duels: duels, onDuel: async (pg, n) => {
    const t0 = Date.now();
    // 上限放到 150s：每一格凍幀在牆鐘上要 300–500ms（截圖＋兩次 evaluate），一場對決常常有上百格。
    // **退出前一定要把畫面放行**（見迴圈後那一行）：這個迴圈是唯一會呼叫 __frzGo() 的地方，
    // 帶著凍結退出＝整個頁面從此停住，後面一場對決都跑不出來（踩過：10 場只跑到 1 場）。
    while (Date.now() - t0 < 150000) {
      await pump(pg);
      const st = await pg.evaluate(() => ({ busy: window.__dmg.busy, nf: window.__dmg.nFloat, nh: window.__dmg.nHit, ended: (window.__dmg.note.ends || 0) })).catch(() => null);
      if (!st) break;
      if (st.ended >= n) break;
      // R5 像素版：最後一場演到一半才觸發（doSkip 要有東西可以清）
      if (n >= duels && !skipDone && !st.busy && Date.now() - t0 > 4000) {
        skipDone = await pg.evaluate(() => (window.__dmgSkipPix ? window.__dmgSkipPix() : false)).catch(() => false);
      }
      await pg.waitForTimeout(20);
    }
    await pg.evaluate(() => { if (window.__frz && window.__frz.on) window.__frzGo(); }).catch(() => {});
  } });
  // R5 的像素版：最後一場對決手動觸發（drive 已結束時場上可能沒尊了，所以放在 onDuel 之外的 best-effort）
  if (!skipDone) { // 最後一場沒觸發到就再試一次（best-effort）
    skipDone = await page.evaluate(() => (window.__dmgSkipPix ? window.__dmgSkipPix() : false)).catch(() => false);
  }
  // 收尾統一把還沒走完的凍幀序列抽乾：按下跳過會讓對決立刻收場，drive 的迴圈就結束了，
  // 但世界是凍住的（虛擬時鐘），序列停在原地等人來截圖——不抽乾就只剩第一格。
  for (let i = 0; i < 60; i++) {
    await pump(page);
    const busy = await page.evaluate(() => window.__dmg.busy).catch(() => false);
    if (!busy) break;
    await page.waitForTimeout(40);
  }
  const meta = await page.evaluate(() => ({ floats: window.__dmg.floats.length, hits: window.__dmg.hits.length, burns: window.__dmg.burns.length,
    froze: window.__frz.froze, note: window.__dmg.note, ver: (document.getElementById('verLine') || {}).textContent }));
  const v = judgePix(samples);
  fs.writeFileSync(path.join(outdir, 'pix.json'), JSON.stringify({ url: url, seed: seed, duels: duels, synth: synth, verdict: v, samples: samples, shots: shots, meta: meta, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ outdir: outdir, seed: seed, froze: meta.froze, errors: r.errors.length, ...v.summary }));
  console.log('VERDICT ' + Object.entries(v.res).map(([k, x]) => `${k}=${x ? 'PASS' : 'FAIL'}`).join(' '));
  if (v.bad.length) console.log(v.bad.slice(0, 12).join('\n'));
}

function judgePix(S) {
  const bad = [];
  // R1：每一筆 .dmgfloat 對比度 ≥4.5
  const under = S.floats.filter((f) => f.ratio < 4.5);
  for (const f of under.slice(0, 8)) bad.push(`R1 對比度 ${f.ratio} < 4.5 seq=${f.seq} cls=${f.cls} ring=${f.ring}`);
  const ratios = S.floats.map((f) => f.ratio).sort((a, b) => a - b);
  // R2：pre → +40 的紅偏量差 ≥25、+200 回到 ±5、非 target 尊 <25、燒毀中 <5
  const byKey = new Map();
  for (const r of S.flashes) {
    if (!byKey.has(r.run)) byKey.set(r.run, {});
    byKey.get(r.run)[r.step] = r;
  }
  const seqs = [];
  const shift = (a, b) => (a && b ? Math.max(Math.abs(a.x0 - b.x0), Math.abs(a.y0 - b.y0), Math.abs(a.x1 - b.x1), Math.abs(a.y1 - b.y1)) : null);
  for (const g of byKey.values()) {
    if (!g[0] || !g[1] || !g[2]) continue;
    const mv = shift(g[0].box, g[1].box); // f0→f1 是「沒有刺激的同長度空窗」：動了就代表鏡頭／人形在動
    const row = { burning: !!g[1].meta.burning, move: mv === null ? null : +mv.toFixed(1),
      pre: g[1].t, flash: g[2].t,
      d40: g[1].t !== null && g[2].t !== null ? +(g[2].t - g[1].t).toFixed(2) : null,
      d0: g[0].t !== null && g[1].t !== null ? +(g[1].t - g[0].t).toFixed(2) : null, // 空窗的自然漂移（噪音底）
      d200: g[3] && g[3].t !== null && g[1].t !== null ? +(g[3].t - g[1].t).toFixed(2) : null,
      ctrl40: g[1].c !== null && g[2].c !== null ? +(g[2].c - g[1].c).toFixed(2) : null,
      files: [g[1].file, g[2].file] };
    // 能不能用，判準是**這個樣本自己的噪音底**：f0→f1 是同樣長度、同樣有鏡頭運動、但沒有刺激的空窗，
    // 它的紅偏量漂移就是本樣本的量測噪音。噪音 ≤5（＝R2「回到 ±5」的同一把尺）才拿來判 +25。
    // 鏡頭幾乎一直在動（每 40ms 位移 0.1～1.0 世界單位），拿「方框不准動」當閘門會把樣本全篩掉；
    // 方框是逐幀跟著那一尊算的，所以鏡頭動不影響量測——實測空窗漂移只有 0.6～2。
    // 有燒毀夾進來的樣本一律作廢：燒毀會放一片全螢幕暖光（#duel .flashfx，ys3d 下是橘黃漸層），
    // 整個畫面的紅偏量都會抬起來——那不是「被打的尊在閃」，量到的是背景。
    row.burnIn = (g[2].bn !== undefined && g[0].bn !== undefined) ? (g[2].bn - g[0].bn) : null;
    // 對決收場（ys:duel-end）之後人形停止更新、閃紅照規矩不演——那不是實作壞了，是刺激落在演出之外。
    row.duelOn = [0, 1, 2].every((k) => g[k] && g[k].on !== false);
    row.usable = row.d40 !== null && row.d0 !== null && Math.abs(row.d0) <= 5 && !row.burnIn && row.duelOn;
    seqs.push(row);
  }
  const moved = seqs.filter((x) => !x.usable);
  const live = seqs.filter((x) => x.usable && !x.burning), burning = seqs.filter((x) => x.usable && x.burning);
  const badFlash = live.filter((x) => x.d40 < 25);
  const badBack = live.filter((x) => x.d200 !== null && Math.abs(x.d200) > 5);
  const badCtrl = live.filter((x) => x.ctrl40 !== null && x.ctrl40 >= 25);
  const badBurn = burning.filter((x) => Math.abs(x.d40) >= 5);
  for (const x of badFlash.slice(0, 5)) bad.push(`R2 閃紅不足 Δ40=${x.d40}（噪音底 ${x.d0}）${x.files}`);
  for (const x of badBack.slice(0, 5)) bad.push(`R2 200ms 未回 Δ=${x.d200}`);
  for (const x of badCtrl.slice(0, 5)) bad.push(`R2 非 target 尊也紅 Δ=${x.ctrl40}（整片閃紅＝假綠）`);
  for (const x of badBurn.slice(0, 5)) bad.push(`R2 燒毀中的尊閃了 Δ=${x.d40}`);
  // R5 像素版
  const sk = {};
  for (const r of S.skip) sk[r.step] = r;
  const skD = sk[0] && sk[2] && sk[0].t !== null && sk[2].t !== null ? +(sk[2].t - sk[0].t).toFixed(2) : null;
  const skFlash = sk[0] && sk[1] && sk[0].t !== null && sk[1].t !== null ? +(sk[1].t - sk[0].t).toFixed(2) : null;
  if (skD !== null && Math.abs(skD) > 5) bad.push(`R5 跳過後 300ms 仍紅 Δ=${skD}`);
  const res = {
    R1: S.floats.length > 0 && under.length === 0,
    R2: live.length > 0 && badFlash.length === 0 && badBack.length === 0 && badCtrl.length === 0 && badBurn.length === 0,
    R5pix: skD !== null && Math.abs(skD) <= 5,
  };
  return { res: res, bad: bad, summary: {
    floats: S.floats.length, underMin: ratios[0] === undefined ? null : ratios[0], p50: ratios[Math.floor(ratios.length / 2)] ?? null, max: ratios[ratios.length - 1] ?? null, under45: under.length,
    flashes: live.length, d40min: live.length ? Math.min(...live.map((x) => x.d40)) : null, d40med: live.length ? live.map((x) => x.d40).sort((a, b) => a - b)[Math.floor(live.length / 2)] : null,
    back200max: live.filter((x) => x.d200 !== null).length ? Math.max(...live.filter((x) => x.d200 !== null).map((x) => Math.abs(x.d200))) : null,
    ctrlMax: live.filter((x) => x.ctrl40 !== null).length ? Math.max(...live.filter((x) => x.ctrl40 !== null).map((x) => x.ctrl40)) : null,
    burnProbes: burning.length, burnMax: burning.length ? Math.max(...burning.map((x) => Math.abs(x.d40))) : null,
    rejected: moved.length, rejBurn: seqs.filter((x) => x.burnIn).length, rejOffDuel: seqs.filter((x) => !x.duelOn).length, noiseMax: live.filter((x) => x.d0 !== null).length ? Math.max(...live.map((x) => Math.abs(x.d0 || 0))) : null,
    skipFlash: skFlash, skipAfter300: skD } };
}
