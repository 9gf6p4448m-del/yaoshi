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
/* 【凍結檔 §2.1 修訂 2】R2 的量測位置：只量「屬於那一尊的像素」。
   命中前那一幀 vs 閃紅瞬間那一幀逐像素差分，任一通道 |Δ| > MASK_TH 的像素集合＝那一尊的遮罩，
   在遮罩內算 R−(G+B)/2 的平均差。門檻仍是 +25。遮罩用「有沒有變」選（三通道亮度差取最大），
   不是用「有沒有變紅」選，所以不會自動把樣本挑成紅的；基準版跑同一套選到的是鏡頭移動的邊緣像素。 */
const MASK_TH = 8;
const MOVE_MAX = 4; // 位移閘門：+40ms 那一幀的方框相對命中前不得移動超過這麼多像素（剪影才對得上）
function maskDelta(imA, boxA, imB, boxB) {
  if (!imA || !imB || !boxA || !boxB || imA.w !== imB.w || imA.h !== imB.h) return null;
  const x0 = Math.max(0, Math.floor(Math.min(boxA.x0, boxB.x0))), x1 = Math.min(imA.w - 1, Math.ceil(Math.max(boxA.x1, boxB.x1)));
  const y0 = Math.max(0, Math.floor(Math.min(boxA.y0, boxB.y0))), y1 = Math.min(imA.h - 1, Math.ceil(Math.max(boxA.y1, boxB.y1)));
  let n = 0, tot = 0, sA = 0, sB = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * imA.w + x) * imA.ch;
    tot++;
    if (Math.max(Math.abs(imA.data[i] - imB.data[i]), Math.abs(imA.data[i + 1] - imB.data[i + 1]), Math.abs(imA.data[i + 2] - imB.data[i + 2])) <= MASK_TH) continue;
    sA += imA.data[i] - (imA.data[i + 1] + imA.data[i + 2]) / 2;
    sB += imB.data[i] - (imB.data[i + 1] + imB.data[i + 2]) / 2;
    n++;
  }
  return n ? { d: (sB - sA) / n, n, frac: n / tot, keep: { x0: x0, y0: y0, x1: x1, y1: y1 } } : null;
}
/** 剪影遮罩：同一時刻的兩幀（那一尊在／不在）差分出它佔的像素；回傳像素索引陣列與佔方框的比例。 */
function silhouette(imOn, imOff, boxA, boxB) {
  if (!imOn || !imOff || imOn.w !== imOff.w || imOn.h !== imOff.h) return null;
  const x0 = Math.max(0, Math.floor(Math.min(boxA.x0, boxB.x0))), x1 = Math.min(imOn.w - 1, Math.ceil(Math.max(boxA.x1, boxB.x1)));
  const y0 = Math.max(0, Math.floor(Math.min(boxA.y0, boxB.y0))), y1 = Math.min(imOn.h - 1, Math.ceil(Math.max(boxA.y1, boxB.y1)));
  const px = []; let tot = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * imOn.w + x) * imOn.ch;
    tot++;
    if (Math.max(Math.abs(imOn.data[i] - imOff.data[i]), Math.abs(imOn.data[i + 1] - imOff.data[i + 1]), Math.abs(imOn.data[i + 2] - imOff.data[i + 2])) <= MASK_TH) continue;
    px.push(i);
  }
  return px.length ? { px: px, n: px.length, frac: tot ? px.length / tot : 0 } : null;
}
/** 在給定的遮罩像素上量兩幀的紅偏量平均差。 */
function maskDeltaOnMask(imA, imB, px) {
  if (!imA || !imB || !px || !px.length || imA.w !== imB.w) return null;
  let s = 0;
  for (const i of px) s += (imB.data[i] - (imB.data[i + 1] + imB.data[i + 2]) / 2) - (imA.data[i] - (imA.data[i + 1] + imA.data[i + 2]) / 2);
  return s / px.length;
}
/** 用「已經算好的遮罩範圍」再量一次另一幀（舊量法留著給 dmg-redstat 的對照用）。 */
function maskDeltaOn(imA, imB, keep, imRef) {
  if (!imA || !imB || !keep || !imRef || imA.w !== imB.w) return null;
  let n = 0, sA = 0, sB = 0;
  for (let y = keep.y0; y <= keep.y1; y++) for (let x = keep.x0; x <= keep.x1; x++) {
    const i = (y * imA.w + x) * imA.ch;
    if (Math.max(Math.abs(imA.data[i] - imRef.data[i]), Math.abs(imA.data[i + 1] - imRef.data[i + 1]), Math.abs(imA.data[i + 2] - imRef.data[i + 2])) <= MASK_TH) continue;
    sA += imA.data[i] - (imA.data[i + 1] + imA.data[i + 2]) / 2;
    sB += imB.data[i] - (imB.data[i + 1] + imB.data[i + 2]) / 2;
    n++;
  }
  return n ? { d: (sB - sA) / n, n } : null;
}
/* 【凍結檔 §2.1 修訂 1】R1 的主判準：字級與分類。
   BASE_FONT＝基準（v0.48）實測的跳字字級，全部是 17px（同一支治具量的，見報告 R1 那一節）。 */
const BASE_FONT = 17;
const FONT_MIN = 1.6; // 傷害／擊殺要 ≥ 基準 ×1.6；「−1 隻」照凍結檔範圍 4 是 ×1.0，不套這一條
function hueOf(c) {
  if (!c || c.length < 3) return 'unknown';
  const [r, g, b] = c;
  if (g >= r && g >= b && g - Math.max(r, b) >= 20) return 'green';
  if (r >= g && r >= b && r - g >= 40 && r - b >= 40) return 'warm-red';
  return 'neutral';
}
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
  /* 單步：把排在佇列裡的 rAF 回呼跑一次，**虛擬時間不前進**（傳同一個 vnow）。
     用來在凍結狀態下重畫一幀——剪影遮罩要「同一時刻、同一機位，只差那一尊在不在」兩幀。 */
  F.step = () => {
    const q = F.rafQ.splice(0);
    const t = vnow();
    q.forEach((x) => { try { x.cb(t); } catch (e) {} });
    return q.length;
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
  /* 這一尊是什麼皮：3D 妖（creature）還是貼片人形（layered）、模型鍵、體型。
     閃紅在兩種皮上的做法不同（3D 動 albedo＋邊光 uniform，貼片只染逆光層），分布會分成兩群，
     不記下來的話報告只會寫「有些樣本沒反應」，看不出是哪一類。 */
  M.figInfo = (side, unit) => {
    try {
      const D = fig(); const f = D && D.figureOf(side, unit);
      if (!f) return null;
      return { skin: f.skin || 'layered', ab: f.ab === undefined ? null : f.ab, body: f.unit && f.unit.body, haunt: !!(f.unit && f.unit.body === 'haunt') };
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
        // hk 要在 onStep 之前讀：onStep 可能是 doSkip()，它會把閃紅清掉，讀在後面永遠是 0
        const snap = { cam: M.camPos(), hk: M.hitK(), bn: M.burns.length, on: !!M.duelOn, ids: [M.liveUnits('A'), M.liveUnits('B')] };
        if (onStep) { try { onStep(k); } catch (e) {} } // 凍住之後才動作（例如派刺激）：畫面停在動作發生前那一幀
        M.ready = Object.assign({ tag: tag, meta: meta, step: k, at: steps[k] }, snap);
      };
      if (d <= 0) go(); else setTimeout(go, d);
    };
    M.next = step; step(); return true;
  };
  M.camPos = () => { try { const K = cam(); return K ? [+K.position.x.toFixed(4), +K.position.y.toFixed(4), +K.position.z.toFixed(4)] : null; } catch (e) { return null; } };
  W.__frzGo = () => { M.ready = null; F.resume(); if (M.next) M.next(); };
  /* 剪影遮罩用的兩個鉤子：切那一尊的可見性、原地重畫一幀（都不動虛擬時鐘）。 */
  /* 藏一尊：**不能動 visible**——duel-figures 的主迴圈每幀最後都會把它寫回 true
     （js/duel-figures.js 的主迴圈結尾那一行 "if (!f.group.visible) f.group.visible = true;"），
     我們單步重畫的那一幀正好會把藏起來的那一尊又打開，差分出來 0 個像素（實測 6/7 個樣本都這樣）。
     改動 layers：把整棵子樹丟到相機看不到的層，主迴圈不碰 layers，所以藏得住；還原時寫回原本的 mask。 */
  W.__figVis = (side, unit, vis) => {
    try {
      const D = window.__yaoshi3d && window.__yaoshi3d.duelFigures;
      const f = D && D.figureOf(side, unit);
      if (!f || !f.group) return false;
      const each = (root) => { if (!root) return; root.traverse((o) => {
        if (vis) { if (o.__savedLayers !== undefined) { o.layers.mask = o.__savedLayers; o.__savedLayers = undefined; } }
        else { if (o.__savedLayers === undefined) o.__savedLayers = o.layers.mask; o.layers.set(31); }
      }); };
      each(f.group); each(f.shadow);
      return true;
    } catch (e) { return false; }
  };
  /* 單步「真的畫出來」：直接呼叫 rAF 回呼雖然會 render，但那是在瀏覽器的 render lifecycle 之外，
     合成器不會把新畫面交出去——實測截到的還是上一張（剪影差分 0 個像素）。
     所以改成排一次**原生** rAF、在那裡面跑回呼（時間戳仍是凍住的 vnow，遊戲狀態不前進），
     再多等一次 rAF 確定這一幀已經送出去。 */
  /* 凍結中把虛擬時鐘往前推 ms 毫秒：遊戲的其它東西（timer）仍然停著，只有「下一次畫的那一幀
     會拿到 t+ms」——閃紅的包絡與鏡頭的補間都是吃這個時間，所以這等於「往後 ms 毫秒的那一幀」，
     而且完全不看牆鐘。原本靠 setTimeout(40) 等真實時間，機器一忙那一格就落在 80–120ms、
     閃紅早就衰退掉（實測 hk 0.48／0 的樣本一大把）。 */
  W.__frzWarp = (ms) => { if (!F.on) return null; F.off -= Number(ms) || 0; return vnow(); };
  W.__frzStepReal = () => new Promise((res) => {
    const q = F.rafQ.splice(0);
    const t = vnow();
    RAF(() => { q.forEach((x) => { try { x.cb(t); } catch (e) {} }); RAF(() => res(q.length)); });
  });
  W.__frzDraw = () => F.step();

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
    // 三版 MEDIUM-4：己方不再是單一側（熱座兩位真人時兩側都算），產品的出口改成 pwMySides 陣列
    S.edge.push({ t: now(), duel: M.duelN, side: d.side, unit: d.unit, skip: skipNow(),
      mySides: (typeof pwMySides === 'undefined' ? null : pwMySides.slice()) });
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
if (!mode || !out) { console.error('need <dom|pix|judge> <out.json|outdir>'); process.exit(2); }
const port = Number(opt.port || (mode === 'pix' ? 9001 : 9002));
const root = opt.root ? path.resolve(opt.root) : ROOT;
const seed = Number(opt.seed || 1);
const duels = Number(opt.duels || (mode === 'pix' ? 6 : 10));
const url = opt.url || `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${seed}`;

// 工作區 index.html 宣告的版本（--root 指到別的 worktree 時不比對）
const expectVer = (() => { try { const m = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/const VERSION="([0-9.]+)"/); return m ? m[1] : null; } catch (e) { return null; } })();
/* 離線重判：judge 只吃已經存好的 pix.json，重新套一次現行判準（不開瀏覽器、不重跑遊戲）。
   判準改了要回頭重判舊證據時用它，省掉一整輪錄影。 */
if (mode === 'judge') {
  const dirs = pos.slice(1);
  for (const d of dirs) {
    const f = fs.existsSync(path.join(d, 'pix.json')) ? path.join(d, 'pix.json') : d;
    const J = JSON.parse(fs.readFileSync(f, 'utf8'));
    const v = judgePix(J.samples);
    J.verdict = v;
    fs.writeFileSync(f, JSON.stringify(J, null, 1));
    console.log(d, JSON.stringify({ res: v.res, ...v.summary }));
    console.log('VERDICT ' + Object.entries(v.res).map(([k, x]) => `${k}=${x === null ? '（未訂）' : x ? 'PASS' : 'FAIL'}`).join(' '));
    if (v.bad.length) console.log(v.bad.slice(0, 8).join('\n'));
  }
  process.exit(0);
}

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
  const r = await drive(page, url, { duels: duels, timeoutMs: 900000, onDuel: async (pg, n) => {
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
  console.log('VERDICT ' + Object.entries(v.res).map(([k, x]) => `${k}=${x === null ? '（新尺規，門檻未訂）' : x ? 'PASS' : 'FAIL'}`).join(' '));
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
  const hits = S.edge.filter((h) => !h.skip && Array.isArray(h.mySides) && h.mySides.length);
  const mine = hits.filter((h) => h.mySides.indexOf(h.side) >= 0);
  const foe = hits.filter((h) => h.mySides.indexOf(h.side) < 0);
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
    M.cfg = { on: true, synth: ${synth}, maxFloat: ${maxFloat}, maxHit: ${maxHit} };
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
        if (!M.cfg.on || M.nFloat >= M.cfg.maxFloat) return;
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
      // 只凍一次：命中前／剪影／+40ms／+200ms 四張都在這一次凍結裡由 Node 端用 warp 拍完（見 pump）。
      return M.run('flash', meta, [0]);
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
    M.tryFire = (via) => {
      if (!M.cfg.on || M.busy || M.nHit >= M.cfg.maxHit || !M.cfg.synth) return false;
      if (!M.duelOn || performance.now() - M.duelT < 1600) return false;
      if (via !== 'hitstop' && performance.now() - M.lastFloatT < 700) return false; // 剛冒出跳字：讓 R1 的取樣先做完（hitstop 是好時機，不讓）
      const ov = document.getElementById('duel');
      if (!ov || getComputedStyle(ov).opacity !== '1') return false; // 淡入淡出中不量
      const side = (M.nHit % 2) ? 'B' : 'A', foe = side === 'B' ? 'A' : 'B';
      const rows = M.pickTarget(side), frows = M.pickTarget(foe);
      if (!rows.length || rows[0].a < 4000 || !frows.length) return false; // 太小的尊：方框裡幾乎都是背景
      // 對照組取**對面那一欄**最大的一尊：同一欄的兩尊在畫面上會互相疊到（擠堆時方框幾乎重合）。
      const t = rows[0].b, c = frows[0].b;
      const overlap = !(c.x1 < t.x0 || c.x0 > t.x1 || c.y1 < t.y0 || c.y0 > t.y1);
      if (overlap) return false;
      M.nHit++;
      M.fire(side, rows[0].u, { control: frows[0].u, ctrlSide: foe, via: via || 'timer' });
      return true;
    };
    /* 取樣時機釘在 hitstop（覆審 HIGH-1）：ys:hitstop 期間 renderer 的 dt 歸零、鏡頭完全不動，
       命中前那一幀與閃紅那一幀才是同一個機位；不然量到的差分裡混著鏡頭位移。
       沒等到 hitstop（例如整場沒有夠重的交鋒）才退回計時器輪詢，並在 JSON 裡標明來源。 */
    M.viaHitstop = 0; M.viaTimer = 0;
    document.addEventListener('ys:hitstop', () => {
      if (!M.duelOn) return;
      M.lastHitstop = performance.now();
      setTimeout(() => { if (M.tryFire('hitstop')) M.viaHitstop++; }, 8);
    });
    document.addEventListener('ys:duel', () => {
      const tick = () => {
        // hitstop 在最近 1.5 秒內出現過就交給它，計時器不插隊
        if (!(performance.now() - (M.lastHitstop || -1e9) < 1500)) { if (M.tryFire('timer')) M.viaTimer++; }
        if (M.nHit < M.cfg.maxHit) setTimeout(tick, 220);
      };
      setTimeout(tick, 1700);
    });
    // 燒毀中的尊不得閃紅：燒到一半對同一尊派一顆 hit（真實路徑上的守衛探針）
    document.addEventListener('ys:fx-burn', (e) => {
      const d = e.detail || {};
      if (!M.cfg.on || !M.cfg.synth || (M.done.burnProbe || 0) >= 4) return;
      setTimeout(() => {
        if (M.busy) return;
        const us = M.liveUnits(d.side);
        M.done.burnProbe = (M.done.burnProbe || 0) + 1;
        M.fire(d.side, d.unit, { burning: true, control: us.find((u) => u !== d.unit) });
      }, 60);
    });
    // 量表紅殘影的凍幀（R7 用）：燒毀之後 90ms 凍住，殘影一定還在（GAUGE_GHOST_MS 300）
    document.addEventListener('ys:fx-burn', () => {
      if (!M.cfg.on || (M.done.ghostShot || 0) >= 2) return;
      // 忙就再等一拍（跳字的凍幀幾乎一直在排隊）；殘影有 GAUGE_GHOST_MS(300)＋收起來那 60ms 可以等
      let tries = 0;
      const go = () => {
        if (!M.cfg.on || (M.done.ghostShot || 0) >= 2) return;
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
      if (!M.cfg.on || M.busy || !rows.length || !M.duelOn) return false;
      const unit = rows[0].u;
      return M.run('skip', { side: side, unit: unit }, [0, 40, 340], (k) => {
        if (k === 0) { try { document.dispatchEvent(new CustomEvent('ys:fx-hit', { detail: { side: side, unit: unit, ms: 120, __synth: true } })); } catch (e) {} }
        // 跳過鍵由 Node 端在「截完 +40ms 那一格之後」才按：onStep 是在凍結當下跑的，
        // 在這裡按會先把閃紅清掉、那一格就拍不到「正在閃」了
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
  const seqIms = [];      // 這一輪凍幀序列的解碼影像（遮罩量法要拿前一格來差分）
  const lastBox = [];     // 各格的目標方框
  let lastCbox = null;    // 對照組方框
  let lastMask = null;    // 剪影遮罩（+200ms 沿用同一組像素）
  let silIm = null;       // 這一輪的剪影幀（把目標尊藏起來的那一張）
  let silDiag = null;     // 剪影拍不到時的診斷（藏成功沒／單步畫了幾個回呼）

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
        if (r.step === 0) seqIms.length = 0;
        seqIms[r.step] = im;
        const boxes = await pg.evaluate((m) => ({ t: window.__dmg.figBox(m.side, m.unit), c: m.control === undefined || m.control === null ? null : window.__dmg.figBox(m.ctrlSide || m.side, m.control) }), r.meta).catch(() => null);
        const row = { run: runId, step: r.step, at: r.at, meta: r.meta, file: path.basename(file), cam: r.cam, hk: r.hk, bn: r.bn, on: r.on, ids: r.ids, box: boxes && boxes.t ? boxes.t : null, cbox: boxes && boxes.c ? boxes.c : null,
          t: num(boxes && boxes.t ? redness(im, boxes.t) : null),
          c: num(boxes && boxes.c ? redness(im, boxes.c) : null) };
      // 【覆審 HIGH-1】剪影遮罩：命中前那一幀拍完之後，原地（虛擬時鐘不前進）把那一尊藏起來重畫一幀，
      // 兩幀差分出來的就是「這一尊在畫面上佔哪些像素」——遮罩與刺激無關。拍完再顯示回去、才派刺激。
        if (r.tag === 'flash' && r.step === 0) {
        /* 【覆審 HIGH-1】整段量測都在**這一次凍結**裡做完，四張圖的順序是：
             P 命中前 → S 剪影（同一時刻把那一尊丟到相機看不到的層，重畫一幀）→ 派刺激
             → warp(+40ms) 重畫 → F 閃紅 → warp(+160ms) 重畫 → A 命中後 200ms
           warp 是「把虛擬時鐘往前推」，不是等牆鐘——閃紅只有 120ms，靠 setTimeout(40) 等真實時間的話
           機器一忙那一格就落到 80–120ms、閃得差不多了（實測一半以上的樣本 hk 只剩 0.5 或 0）。
           遮罩＝P 與 S 的差分，跟「哪些像素變紅」無關（那是覆審說的「刺激選遮罩＝換尺規」）。 */
        const shot = async (tag) => {
          const f2 = path.join(shotDir, `${String(++nshot).padStart(4, '0')}-${tag}.png`);
          await pg.screenshot({ path: f2 }).catch(() => {});
          try { return { im: decodePng(fs.readFileSync(f2)), file: path.basename(f2) }; } catch (e) { return { im: null, file: path.basename(f2) }; }
        };
        const boxNow = async () => pg.evaluate((m) => ({ t: window.__dmg.figBox(m.side, m.unit), c: m.control === undefined || m.control === null ? null : window.__dmg.figBox(m.ctrlSide || m.side, m.control) }), r.meta).catch(() => null);
        row.figInfo = await pg.evaluate((m) => window.__dmg.figInfo(m.side, m.unit), r.meta).catch(() => null);
        const okHide = await pg.evaluate((m) => window.__figVis(m.side, m.unit, false), r.meta).catch(() => false);
        let sil = null;
        if (okHide) {
          await pg.evaluate(() => window.__frzStepReal()).catch(() => {});
          const S1 = await shot('sil');
          await pg.evaluate((m) => window.__figVis(m.side, m.unit, true), r.meta).catch(() => {});
          await pg.evaluate(() => window.__frzStepReal()).catch(() => {});
          if (S1.im && im && row.box) sil = silhouette(im, S1.im, row.box, row.box);
        }
        await pg.evaluate((m) => { try { document.dispatchEvent(new CustomEvent('ys:fx-hit', { detail: { side: m.side, unit: m.unit, ms: (window.PW_FX && window.PW_FX.HIT_FLASH_MS) || 120, __synth: true } })); } catch (e) {} }, r.meta).catch(() => {});
        await pg.evaluate(() => window.__frzWarp(40)).catch(() => {});
        await pg.evaluate(() => window.__frzStepReal()).catch(() => {});
        const F1 = await shot('flash40');
        const hk40 = await pg.evaluate(() => window.__dmg.hitK()).catch(() => null);
        const bx40 = await boxNow();
        row.box40 = bx40 && bx40.t ? bx40.t : null; // 位移閘門：+40ms 那一幀那一尊的方框
        await pg.evaluate(() => window.__frzWarp(160)).catch(() => {});
        await pg.evaluate(() => window.__frzStepReal()).catch(() => {});
        const A1 = await shot('after200');
        const bx200 = await boxNow();
        row.box200 = bx200 && bx200.t ? bx200.t : null; // +200ms 那一幀的方框（Δ200 那條子判準的位移閘門）
        row.sil = sil ? { n: sil.n, frac: num(sil.frac) } : null;
        row.silDiag = { okHide: okHide, hasSil: !!sil };
        row.hk40 = hk40;
        if (sil && F1.im) row.maskD = num(maskDeltaOnMask(im, F1.im, sil.px));
        if (sil && A1.im) row.maskD200 = num(maskDeltaOnMask(im, A1.im, sil.px));
        if (sil) row.maskFrac = num(sil.frac);
        // 對照組（對面那一欄最大的一尊）：同一套剪影流程太貴，改用它自己的方框平均差當旁證
        if (boxes && boxes.c && bx40 && bx40.c && F1.im) row.maskC = num(redness(F1.im, bx40.c) - redness(im, boxes.c));
        row.files = [F1.file, A1.file];
      }
        lastBox[r.step] = row.box; lastCbox = boxes && boxes.c ? boxes.c : null;
        (r.tag === 'skip' ? samples.skip : samples.flashes).push(row);
      }
      shots.push({ file: path.basename(file), tag: r.tag, step: r.step, at: r.at, meta: r.meta });
      // R5：+40ms 那一格（正在閃）拍完了才按跳過，下一格量的才是「跳過之後」
      if (r.tag === 'skip' && r.step === 1) await pg.evaluate(() => { try { window.doSkip(); } catch (e) {} }).catch(() => {});
      await pg.evaluate(() => window.__frzGo()).catch(() => {});
    }
  };

  let skipDone = false;
  // drive 預設 300s 就收手；凍幀讓牆鐘遠長於遊戲時間（一場對決要 2–4 分鐘），不放寬會只跑到兩三場
  const r = await drive(page, url, { duels: duels, timeoutMs: 2400000, onDuel: async (pg, n) => {
    const t0 = Date.now();
    // 進場先把取樣打開（上一場退出時關掉了，見迴圈後）
    await pg.evaluate((c) => { window.__dmg.cfg.on = true; window.__dmg.cfg.maxFloat = c.f; window.__dmg.cfg.maxHit = c.h; }, { f: maxFloat, h: maxHit }).catch(() => {});
    // 上限放到 150s：每一格凍幀在牆鐘上要 300–500ms（截圖＋兩次 evaluate），一場對決常常有上百格。
    // **退出前一定要把畫面放行**（見迴圈後那一行）：這個迴圈是唯一會呼叫 __frzGo() 的地方，
    // 帶著凍結退出＝整個頁面從此停住，後面一場對決都跑不出來（踩過：10 場只跑到 1 場）。
    while (Date.now() - t0 < 400000) {
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
    // 退出這一場的抽取迴圈之前：先把取樣關掉（不然下一次凍結沒人來截圖，畫面會永遠停住——
    // 這個迴圈是唯一會呼叫 __frzGo() 的地方），把還沒走完的序列抽乾，最後無條件放行。
    await pg.evaluate(() => { window.__dmg.cfg.on = false; }).catch(() => {}); // 總開關：任何一種凍幀都不再自己啟動
    for (let i = 0; i < 12; i++) {
      await pump(pg);
      const busy = await pg.evaluate(() => window.__dmg.busy).catch(() => false);
      if (!busy) break;
      await pg.waitForTimeout(40);
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
  samples.via = await page.evaluate(() => ({ hitstop: window.__dmg.viaHitstop || 0, timer: window.__dmg.viaTimer || 0 })).catch(() => null);
  const meta = await page.evaluate(() => ({ floats: window.__dmg.floats.length, hits: window.__dmg.hits.length, burns: window.__dmg.burns.length,
    froze: window.__frz.froze, note: window.__dmg.note, ver: (document.getElementById('verLine') || {}).textContent }));
  // 服到的到底是哪一版？serve() 起 http.server 時**不會檢查埠有沒有被別人佔著**——
  // 之前有一支被 kill 掉的錄影留下 root 指到基準 worktree 的 server 佔著同一個埠，
  // 新版那一支就整場都在量基準（實測 v2-pix-1 的 verLine 是 v0.48，字級全 17px、一次閃紅都沒有）。
  meta.expectVersion = expectVer;
  meta.versionOk = !opt.root ? (expectVer && String(meta.ver || '').includes('v' + expectVer + '・')) : null;
  if (meta.versionOk === false) console.log(`!! 版本不符：期望 v${expectVer}，實際 ${String(meta.ver || '').slice(0, 30)} —— 這個埠多半被別的 http.server 佔著，數字全部作廢`);
  const v = judgePix(samples);
  fs.writeFileSync(path.join(outdir, 'pix.json'), JSON.stringify({ url: url, seed: seed, duels: duels, synth: synth, verdict: v, samples: samples, shots: shots, meta: meta, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ outdir: outdir, seed: seed, froze: meta.froze, errors: r.errors.length, versionOk: meta.versionOk, ...v.summary }));
  console.log('VERDICT ' + Object.entries(v.res).map(([k, x]) => `${k}=${x === null ? '（新尺規，門檻未訂）' : x ? 'PASS' : 'FAIL'}`).join(' '));
  if (v.bad.length) console.log(v.bad.slice(0, 12).join('\n'));
}

function judgePix(S) {
  const bad = [];
  // 【凍結檔 §2.1 修訂 1】R1 主判準＝字級＋分類；對比度 ≥4.5 降為附帶條件（仍須全過）
  const under = S.floats.filter((f) => f.ratio < 4.5);
  for (const f of under.slice(0, 8)) bad.push(`R1 對比度 ${f.ratio} < 4.5 seq=${f.seq} cls=${f.cls} ring=${f.ring}`);
  const ratios = S.floats.map((f) => f.ratio).sort((a, b) => a - b);
  const catOf = (f) => (/(^|\s)unit(\s|$)/.test(f.cls) ? 'unit' : /(^|\s)kill(\s|$)/.test(f.cls) ? 'kill' : /(^|\s)heal(\s|$)/.test(f.cls) ? 'heal' : 'hit');
  const fontBad = [], kindBad = [], hueBad = [];
  for (const f of S.floats) {
    const cat = catOf(f);
    // 字級：傷害／擊殺要 ≥ 基準 ×1.6；「−1 隻」照凍結檔範圍 4 是 ×1.0（見 §2.1 修訂 1 的附註）
    const wantFont = cat === 'unit' ? BASE_FONT : BASE_FONT * FONT_MIN;
    if (!(f.font >= wantFont - 0.01)) fontBad.push(`seq=${f.seq} ${cat} ${f.font}px < ${wantFont.toFixed(1)}px`);
    // class 與事件 kind 逐筆對應：unit 只能來自 burn，其餘只能來自非 burn 的交鋒
    const kindOk = f.kind ? (cat === 'unit' ? f.kind === 'burn' : f.kind !== 'burn') : false;
    if (!kindOk) kindBad.push(`seq=${f.seq} ${cat} kind=${f.kind || '(無)'}`);
    // 色相類別：傷害／擊殺＝暖紅橙、治療＝綠、「−1 隻」＝灰白
    const hue = hueOf(f.color), wantHue = cat === 'unit' ? 'neutral' : cat === 'heal' ? 'green' : 'warm-red';
    if (hue !== wantHue) hueBad.push(`seq=${f.seq} ${cat} hue=${hue} want=${wantHue}`);
  }
  for (const x of fontBad.slice(0, 5)) bad.push('R1 字級 ' + x);
  for (const x of kindBad.slice(0, 5)) bad.push('R1 class↔kind ' + x);
  for (const x of hueBad.slice(0, 5)) bad.push('R1 色相 ' + x);
  const fonts = {};
  for (const f of S.floats) { const c = catOf(f); (fonts[c] = fonts[c] || new Set()).add(f.font); }
  // R2：pre → +40 的紅偏量差 ≥25、+200 回到 ±5、非 target 尊 <25、燒毀中 <5
  const byKey = new Map();
  for (const r of S.flashes) {
    if (!byKey.has(r.run)) byKey.set(r.run, {});
    byKey.get(r.run)[r.step] = r;
  }
  const seqs = [];
  /* 【覆審 HIGH-1】現在一次凍結就把「命中前／剪影／+40ms／+200ms」四張拍完（虛擬時鐘 warp，不等牆鐘），
     所以每一輪只有 step 0 一列，欄位（maskD／maskD200／maskFrac／maskC／hk40）都掛在那一列上。 */
  const shiftPx = (a2, b2) => (a2 && b2 ? Math.max(Math.abs(a2.x0 - b2.x0), Math.abs(a2.y0 - b2.y0), Math.abs(a2.x1 - b2.x1), Math.abs(a2.y1 - b2.y1)) : null);
  for (const g of byKey.values()) {
    const r0 = g[0];
    if (!r0 || r0.maskD === undefined) continue;
    const hk = r0.hk40 && r0.meta ? (r0.hk40[r0.meta.side === 'B' ? 1 : 0] || []) : null;
    /* 【第三輪覆審】usable 閘門講清楚，被剔掉的要印筆數與原因：
         ① 拿不到剪影遮罩（noMask）② 剪影太小（tinyMask，<10% 方框）
         ③ 這一格畫面在動（moved）：+40ms 那一幀的方框相對命中前位移 > MOVE_MAX(4px)——
            那表示鏡頭或人形在動，剪影已經對不上，量到的差分混著背景
         ④ 窗內發生燒毀（burnIn）⑤ 落在 ys:duel-end 之後（offDuel） */
    const mv40 = shiftPx(r0.box, r0.box40);
    /* 位移閘門對「燒毀中的尊」不適用：化灰本來就會讓那一尊縮小上飄，方框一定在動，
       套下去的話那一條子判準永遠 0 樣本＝空過（fail-open）。燒毀那幾筆改成不套位移閘門，
       在輸出裡標 burnLoose，讓看的人知道它們的量測比較鬆。 */
    const isBurn = !!r0.meta.burning;
    const why = r0.maskD === null || r0.maskD === undefined ? 'noMask'
      : (r0.maskFrac || 0) < 0.1 ? 'tinyMask'
      : (isBurn ? null : (mv40 === null ? 'noBox40' : (mv40 > MOVE_MAX ? 'moved' : null)))
      || (r0.on === false ? 'offDuel' : null);
    seqs.push({ burning: !!r0.meta.burning,
      maskD: r0.maskD === undefined ? null : r0.maskD,
      maskD200: r0.maskD200 === undefined ? null : r0.maskD200,
      maskFrac: r0.maskFrac === undefined ? null : r0.maskFrac,
      maskC: r0.maskC === undefined ? null : r0.maskC,
      move40: mv40 === null ? null : +mv40.toFixed(1), why: why,
      /* Δ200 那一條要自己的位移閘門：遮罩是命中前那一幀的像素集合，200ms 後那一尊已經呼吸／微動過，
         固定像素集合會開始吃到背景，量到的負值是「尊移開了」不是「還在紅」（實測 −8～−61 全是這樣來的）。
         位移 >4px 的那幾筆對這一條記成不可判（back200Unjudged），不當違規也不當通過。 */
      move200: (function () { const m2 = shiftPx(r0.box, r0.box200); return m2 === null ? null : +m2.toFixed(1); })(),
      boxD40: null, d0: 0, d200: r0.maskD200 === undefined ? null : r0.maskD200,
      d40: r0.maskD === undefined ? null : r0.maskD, ctrl40: r0.maskC === undefined ? null : r0.maskC,
      hkMax: hk ? Math.max(0, ...hk.map((x) => +x || 0)) : null,
      sil: r0.sil || null, files: r0.files || [r0.file], figInfo: r0.figInfo || null,
      burnLoose: isBurn, usable: !why });
  }
  const moved = seqs.filter((x) => !x.usable);
  const live = seqs.filter((x) => x.usable && !x.burning), burning = seqs.filter((x) => x.usable && x.burning);
  /* 【覆審 HIGH-1】R2 現在是**新尺規**：剪影遮罩內的紅偏量平均差。舊的 25 是給「方框平均」訂的，
     兩者不是同一把尺，所以這一版**不判門檻**，只輸出分布交使用者訂新數字（治具的 R2 欄位固定回 null）。
     有效樣本＝拿得到剪影、且 maskFrac ≥ MASK_FRAC_MIN（剪影太小＝那一尊在畫面上幾乎看不到，量了沒意義）。 */
  const valid = live;               // usable 閘門已經在上面把不合格的剔掉了
  const dropped = {};               // 逐項原因統計（含 burning 的那幾筆）
  for (const x of seqs) if (x.why) dropped[x.why] = (dropped[x.why] || 0) + 1;
  const burnValid = burning;
  /* 【第三輪覆審】主門檻待使用者裁，但**三個子判準恢復判定**（它們跟主門檻無關，是「有沒有亂閃」）：
       ・+200ms 要回到原值：|Δ200| ≤ 5
       ・燒毀中的尊不得閃：|Δ| ≤ 10（化灰本身會讓紅偏量動，比原本的 5 放寬並寫明理由）
       ・對照尊（對面那一欄最大的一尊）不得跟著紅：max < 10 */
  const BACK_MAX = 5, BURN_MAX = 10, CTRL_MAX = 10;
  const mSorted = valid.map((x) => x.maskD).sort((a2, b2) => a2 - b2);
  const mMed = mSorted.length ? mSorted[Math.floor(mSorted.length / 2)] : null;
  const mRatio = mSorted.length ? +(mSorted.filter((x) => x >= 25).length / mSorted.length).toFixed(3) : null;
  const back200Judgeable = valid.filter((x) => x.maskD200 !== null && x.move200 !== null && x.move200 <= MOVE_MAX);
  const back200Unjudged = valid.filter((x) => x.maskD200 !== null && !(x.move200 !== null && x.move200 <= MOVE_MAX)).length;
  const badBack = back200Judgeable.filter((x) => Math.abs(x.maskD200) > BACK_MAX);
  const badBurn = burnValid.filter((x) => x.maskD !== null && Math.abs(x.maskD) > BURN_MAX);
  const badCtrl = valid.filter((x) => x.maskC !== null && x.maskC >= CTRL_MAX);
  if (!burnValid.length) bad.push('R2 「燒毀中不得閃」0 樣本＝空過，不算通過（fail-closed）');
  if (!back200Judgeable.length) bad.push('R2 「+200ms 回到原值」0 個可判樣本＝空過，不算通過（fail-closed）');
  if (mSorted.length && !(mMed >= 25 && mRatio >= 0.70)) bad.push(`R2 主門檻（方案 A）未過：中位 ${mMed}（要 ≥25）、≥25 比例 ${mRatio}（要 ≥0.70）、n=${mSorted.length}`);
  for (const x of badBack.slice(0, 5)) bad.push(`R2 +200ms 未回到原值 Δ=${x.maskD200}（門檻 ±${BACK_MAX}）`);
  for (const x of badBurn.slice(0, 5)) bad.push(`R2 燒毀中的尊閃了 Δ=${x.maskD}（門檻 ±${BURN_MAX}）`);
  for (const x of badCtrl.slice(0, 5)) bad.push(`R2 對照尊也紅 Δ=${x.maskC}（門檻 <${CTRL_MAX}；整片閃紅＝假綠）`);
  // R5 像素版
  const sk = {};
  for (const r of S.skip) sk[r.step] = r;
  const skD = sk[0] && sk[2] && sk[0].t !== null && sk[2].t !== null ? +(sk[2].t - sk[0].t).toFixed(2) : null;
  const skFlash = sk[0] && sk[1] && sk[0].t !== null && sk[1].t !== null ? +(sk[1].t - sk[0].t).toFixed(2) : null;
  if (skD !== null && Math.abs(skD) > 5) bad.push(`R5 跳過後 300ms 仍紅 Δ=${skD}`);
  const res = {
    R1: S.floats.length > 0 && fontBad.length === 0 && kindBad.length === 0 && hueBad.length === 0 && under.length === 0,
    /* 【使用者 2026-09-08 裁定：方案 A】剪影遮罩（含位移 ≤4px 閘門）下的分布式門檻：
       **中位 ≥ +25 且「≥+25 的樣本比例」≥ 70%**，再加三個子判準全部通過才算綠。 */
    R2: valid.length > 0 && mMed !== null && mMed >= 25 && mRatio !== null && mRatio >= 0.70
      && burnValid.length > 0 && back200Judgeable.length > 0 && badBack.length === 0 && badBurn.length === 0 && badCtrl.length === 0,
    R2main: valid.length > 0 && mMed !== null && mMed >= 25 && mRatio !== null && mRatio >= 0.70,
    R2sub: valid.length > 0 && burnValid.length > 0 && back200Judgeable.length > 0 && badBack.length === 0 && badBurn.length === 0 && badCtrl.length === 0,
    R5pix: skD !== null && Math.abs(skD) <= 5,
  };
  const mk = valid.map((x) => x.maskD).sort((a, b) => a - b);
  const bk = burnValid.map((x) => x.maskD).sort((a, b) => a - b);
  const bk200 = valid.filter((x) => x.maskD200 !== null).map((x) => x.maskD200).sort((a, b) => a - b);
  return { res: res, bad: bad, summary: {
    floats: S.floats.length, underMin: ratios[0] === undefined ? null : ratios[0], p50: ratios[Math.floor(ratios.length / 2)] ?? null, max: ratios[ratios.length - 1] ?? null, under45: under.length,
    fontPx: Object.fromEntries(Object.entries(fonts).map(([k, v]) => [k, [...v]])), fontBad: fontBad.length, kindBad: kindBad.length, hueBad: hueBad.length,
    bySkin: (() => { const o = {}; for (const x of valid) { const k = (x.figInfo && x.figInfo.skin) || '?'; (o[k] = o[k] || []).push(x.maskD); } for (const k of Object.keys(o)) { const a2 = o[k].sort((p, q) => p - q); o[k] = { n: a2.length, min: a2[0], p50: a2[Math.floor(a2.length / 2)], max: a2[a2.length - 1], ge25: a2.filter((v) => v >= 25).length }; } return o; })(),
    maskN: mk.length, maskMin: mk[0] ?? null, maskP50: mk[Math.floor(mk.length / 2)] ?? null, maskMax: mk[mk.length - 1] ?? null,
    maskGe25: mk.filter((x) => x >= 25).length, maskFracP50: valid.length ? valid.map((x) => x.maskFrac).sort((a, b) => a - b)[Math.floor(valid.length / 2)] : null,
    maskDropped: dropped, maskGe15: mk.filter((x) => x >= 15).length, maskGe25Ratio: mRatio, via: S.via || null,
    move40P50: valid.length ? valid.map((x) => x.move40).filter((x) => x !== null).sort((a2, b2) => a2 - b2)[Math.floor(valid.length / 2)] : null,
    burnMaskN: bk.length, burnMaskAbsMax: bk.length ? Math.max(...bk.map((x) => Math.abs(x))) : null,
    back200MaskN: back200Judgeable.length, back200Unjudged: back200Unjudged,
    back200MaskAbsMax: back200Judgeable.length ? Math.max(...back200Judgeable.map((x) => Math.abs(x.maskD200))) : null,
    flashes: live.length, d40min: live.length ? Math.min(...live.map((x) => x.d40)) : null, d40med: live.length ? live.map((x) => x.d40).sort((a, b) => a - b)[Math.floor(live.length / 2)] : null,
    back200max: live.filter((x) => x.d200 !== null).length ? Math.max(...live.filter((x) => x.d200 !== null).map((x) => Math.abs(x.d200))) : null,
    ctrlMax: live.filter((x) => x.ctrl40 !== null).length ? Math.max(...live.filter((x) => x.ctrl40 !== null).map((x) => x.ctrl40)) : null,
    burnProbes: burning.length, burnMax: burning.length ? Math.max(...burning.map((x) => Math.abs(x.d40))) : null,
    rejected: moved.length, rejBurn: seqs.filter((x) => x.burnIn).length, rejOffDuel: seqs.filter((x) => !x.duelOn).length, noiseMax: live.filter((x) => x.d0 !== null).length ? Math.max(...live.map((x) => Math.abs(x.d0 || 0))) : null,
    skipFlash: skFlash, skipAfter300: skD } };
}
