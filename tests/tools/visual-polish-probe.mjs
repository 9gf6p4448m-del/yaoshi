// 畫面精美度第一階段（客觀瑕疵）治具——凍結 docs/experiments/2026-09-25-acceptance-visual-polish.md #1–#6
// 驅動與安全區模擬沿用 tests/tools/text-fit-probe.mjs（覆寫 --safe-*；重建模型，不是真機）：
//   模式 solo（單人整局＋袋子／角色ⓘ／規則）、hot（熱座整局）、nw1（夜行錄第 1 章整局＋殘卷）、nw2／nw3（打到第 2 夜出價）。
// 每種畫面鍵第一次出現時跑 V1–V5，量：
//   #1 breaks  短標籤的斷行點（Range 逐字取框，字框換到下一行＝一個斷點；判斷斷點前後字元）
//   #2 spill   有可見框線／底色的容器，其內文字的 em 框超出容器外框 >1px
//   #3 font    可見文字計算字級（×祖先 transform 縮放）< 10px
//   #4 contrast 截圖取文字框範圍像素中位色當背景，前景＝computed color（含 alpha 與祖先 opacity）疊在背景上，WCAG 對比
//   #5 target  可點元素的實際命中範圍（過中心的水平／垂直掃描線，elementFromPoint 命中自己或子孫的連續長度）≥ 40×40
//   #6 align   同列同類元件（左右座位卡、左右拍品卡、左右拍品頁籤、北列三格、底列 side 鈕）上緣／下緣／高度差 ≤ 2px
// 用法：node tests/tools/visual-polish-probe.mjs [--base <sha>] [--out <dir>] [--tag <name>] [--seed N] [--modes solo,hot,nw1,nw2,nw3] [--vps V1,V2,...]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', null);
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-25-visual-polish')));
const TAG = arg('--tag', BASE ? 'base-' + BASE : 'head');
const SEED = Number(arg('--seed', 3));
const MODES = arg('--modes', 'solo,hot,nw1,nw2,nw3').split(',');
const PORT = 9645;
const SHOTS = path.join(OUT, 'shots-' + TAG);
fs.mkdirSync(SHOTS, { recursive: true });

const VP = {
  V1: { w: 852, h: 393, safe: [0, 59, 21, 59] },
  V2: { w: 932, h: 430, safe: [0, 59, 21, 59] },
  V3: { w: 844, h: 390, safe: [0, 47, 21, 47] },
  V4: { w: 667, h: 375, safe: [0, 0, 0, 0] },
  V5: { w: 1280, h: 720, safe: [0, 0, 0, 0] },
};
const LAND = arg('--vps', 'V1,V2,V3,V4,V5').split(',');

const OVERRIDE = new Map();
const fromBase = (p) => {
  if (!OVERRIDE.has(p)) { let buf = null; try { buf = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} OVERRIDE.set(p, buf); }
  return OVERRIDE.get(p);
};
const CT = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

const PAGE_LIB = String.raw`
window.__tf = {
  vis(el){ return !!el && el.checkVisibility && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); },
  sel(el){
    const parts = [];
    for (let a = el; a && a !== document.body && parts.length < 4; a = a.parentElement) {
      let s = a.tagName.toLowerCase();
      if (a.id) { parts.unshift('#' + a.id); break; }
      if (typeof a.className === 'string' && a.className.trim()) s += '.' + a.className.trim().split(/\s+/).filter((c) => !/^fac-/.test(c)).slice(0, 2).join('.');
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
  trunc(){ return { items: [] }; },
};
window.__vp = {
  SKIP: /^(SCRIPT|STYLE|CANVAS|TEMPLATE|NOSCRIPT)$/,
  skip(el){ return this.SKIP.test(el.tagName) || !!el.closest('svg') || !!el.closest('#rotateHint') || /^__/.test(el.id); },
  alpha(c){ const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return 0; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length >= 4 ? parseFloat(p[3]) : 1; },
  rgba(c){ const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length >= 4 ? p[3] : 1]; },
  /* 可見的文字節點（父元素可見、含非空白字） */
  textNodes(root, keepBlank){
    const out = [], tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const p = n.parentElement; if (!p || (!keepBlank && !/\S/.test(n.textContent)) || this.skip(p) || !__tf.vis(p)) continue;
      out.push(n);
    }
    return out;
  },
  /* 祖先裁切框（含父元素本身）∩ 視口 */
  clipOf(el){
    if (this.__clip && this.__clip.has(el)) return this.__clip.get(el);
    const r0 = this.clipOf0(el); if (this.__clip) this.__clip.set(el, r0); return r0;
  },
  clipOf0(el){
    let x = { l: 0, t: 0, r: innerWidth, b: innerHeight };
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const ar = a.getBoundingClientRect(); x = { l: Math.max(x.l, ar.left), t: Math.max(x.t, ar.top), r: Math.min(x.r, ar.right), b: Math.min(x.b, ar.bottom) }; }
    }
    return x;
  },
  /* 逐字（以 code point 為單位）取字框；回傳可見字的 {n,i,ch,l,t,r,b} */
  chars(root){
    const out = [], rg = document.createRange();
    for (const n of this.textNodes(root, true)) {   /* 含純空白節點：段與段之間的空白也是斷點 */
      const t = n.textContent, clip = this.clipOf(n.parentElement);
      for (let i = 0; i < t.length;) {
        const cp = t.codePointAt(i), len = cp > 0xffff ? 2 : 1, ch = t.slice(i, i + len);
        if (/\s/.test(ch)) { out.push({ n, i, ch, space: true }); i += len; continue; }
        rg.setStart(n, i); rg.setEnd(n, i + len);
        const rs = rg.getClientRects(); const q = rs[rs.length - 1] || rg.getBoundingClientRect();
        if (q && q.width >= 0.1) {
          const cy = (q.top + q.bottom) / 2, cx = (q.left + q.right) / 2;
          if (cx >= clip.l - 1 && cx <= clip.r + 1 && cy >= clip.t && cy <= clip.b) out.push({ n, i, ch, l: q.left, t: q.top, r: q.right, b: q.bottom });
        }
        i += len;
      }
    }
    return out;
  },
  isInlineDisp(el){ const d = getComputedStyle(el).display; return d === 'inline' || d === 'contents'; },
  boxOf(el){ let a = el; while (a && this.isInlineDisp(a)) a = a.parentElement; return a; },

  /* ===== #1 斷行位置 =====
     短標籤＝可見、非 inline 顯示（或 BUTTON／帶 onclick／role=tab）、非空白字數 ≤ 24 的元素。
     斷點＝相鄰兩個可見字，後字字框頂 > 前字字框中線且後字左緣 < 前字左緣（換到下一行）。
     允許：前字是 ・｜| 或標點（，。、：；！？）」』】〕…—／/,.:;!?)、後字是 ・｜|（（「『【〔、兩字之間有空白（但空白一側是數字、另一側是字——數字與單位／標籤之間——不允許）、
     兩字之間有 <br>、兩字分屬不同的非 inline 盒（例如 .hcs 段落 inline-block）。其餘＝詞中斷行（紅）。
     同一個斷點只算給最內層的短標籤。例外表 EXC（凍結 #1 點名的刻意兩行）先宣告。 */
  EXC: [ { sel: /#mainbtn$/, text: '蓋牌開標', before: '開' } ],
  breaks(){
    this.__clip = new Map();
    const P_AFTER = /[・｜|，。、：；！？）」』】〕…—／\/,.:;!?)]/, P_BEFORE = /[・｜|（「『【〔(]/;
    const cands = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (this.skip(el) || !__tf.vis(el)) continue;
      const txt = (el.innerText || '').replace(/\s+/g, ''); if (!txt || txt.length > 24) continue;
      const btn = el.tagName === 'BUTTON' || el.hasAttribute('onclick') || el.getAttribute('role') === 'tab';
      if (!btn && this.isInlineDisp(el)) continue;
      /* 加速：內容高 < 1.6 倍字級＝一定只有一行，不會有斷點 */
      { const c = getComputedStyle(el), ch = el.getBoundingClientRect().height - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom) - parseFloat(c.borderTopWidth) - parseFloat(c.borderBottomWidth); if (ch < parseFloat(c.fontSize) * 1.6) continue; }
      let depth = 0; for (let a = el; a; a = a.parentElement) depth++;
      cands.push({ el, depth, btn });
    }
    cands.sort((a, b) => b.depth - a.depth);
    const seen = new Set(), out = [];
    const hasBrBetween = (a, b) => { const r = document.createRange(); r.setStart(a.n, a.i + a.ch.length); r.setEnd(b.n, b.i); const f = r.cloneContents(); return !!f.querySelector && !!f.querySelector('br'); };
    for (const { el, btn } of cands) {
      const cs = this.chars(el);
      let prev = null, space = false, spaceCh = '';
      for (const c of cs) {
        if (c.space) { if (prev) space = true; continue; }
        if (prev) {
          const h = prev.b - prev.t;
          if (c.t > prev.t + h * 0.5) {   /* 換到下一行（置中對齊時下一行的字不一定比上一字靠左，不能用左緣判斷） */
            const key = (prev.n === c.n ? '' : 'x') + c.i + '@' + (c.n.__vpid || (c.n.__vpid = Math.random().toString(36).slice(2)));
            if (!seen.has(key)) {
              seen.add(key);
              const digit = (s) => /[0-9０-９]/.test(s), word = (s) => /[\p{L}\p{N}]/u.test(s);
              let ok = P_AFTER.test(prev.ch) || P_BEFORE.test(c.ch);
              if (!ok && space) ok = !((digit(prev.ch) && word(c.ch)) || (digit(c.ch) && word(prev.ch)));
              if (!ok && (prev.n !== c.n) && (hasBrBetween(prev, c) || this.boxOf(prev.n.parentElement) !== this.boxOf(c.n.parentElement))) ok = true;
              const full = (el.innerText || '').replace(/\s+/g, ' ').trim();
              const s = __tf.sel(el);
              const exc = !ok && this.EXC.some((e) => e.sel.test(s) && full.replace(/\s/g, '') === e.text && c.ch === e.before);
              const lines = [];
              { let cur = '', lt = null; for (const d of cs) { if (d.space) { cur += ' '; continue; } if (lt !== null && d.t > lt + (d.b - d.t) * 0.5) { lines.push(cur.trim()); cur = ''; } if (lt === null || d.t > lt + (d.b - d.t) * 0.5) lt = d.t; cur += d.ch; } lines.push(cur.trim()); }
              /* 句子（含 ，。；：！？ 的說明文）不是短標籤：照記、另標 sentence，不計紅 */
              const sentence = !btn && (/[，。；！？]/.test(full) || !!el.closest('.ab'));   /* .ab＝拍品能力說明文 */
              out.push({ sel: s, btn, full, lines: lines.join(' ／ '), at: prev.ch + '|' + c.ch, space, ok, exc, sentence });
            }
          }
        }
        prev = c; space = false;
      }
    }
    return out.filter((x) => !x.ok);
  },

  /* ===== #2 文字不越框 =====
     有框＝background-color alpha>0.05、或 background-image 非 none、或任一邊框（寬>0、樣式非 none/hidden、色 alpha>0.05）。
     每個文字節點找最近的有框祖先 B；取該節點各行片段（Range.getClientRects），垂直改用 em 框（片段中線 ±0.5×字級，排除字型 ascent/descent 的空白），
     再與文字自己的祖先裁切框取交集（被裁掉的字屬截斷題，text-fit 管）；超出 B 外框 >1px 為紅。 */
  boxed(el){
    const cs = getComputedStyle(el);
    if (this.alpha(cs.backgroundColor) > 0.05 || (cs.backgroundImage && cs.backgroundImage !== 'none')) return true;
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (parseFloat(cs['border' + s + 'Width']) > 0 && !/none|hidden/.test(cs['border' + s + 'Style']) && this.alpha(cs['border' + s + 'Color']) > 0.05) return true;
    return false;
  },
  spill(){
    this.__clip = new Map();
    const out = [], rg = document.createRange();
    for (const n of this.textNodes(document.body)) {
      const p = n.parentElement;
      /* inline 的有框元素（chip、徽章）的外框本來就是字的行片段，不當容器：往上找非 inline 的有框祖先 */
      let B = p; while (B && B !== document.body && !(this.boxed(B) && !this.isInlineDisp(B))) B = B.parentElement;
      if (!B || B === document.body || B === document.documentElement) continue;
      const t = n.textContent, a = t.search(/\S/), z = t.length - (t.match(/\s*$/) || [''])[0].length;
      rg.setStart(n, a); rg.setEnd(n, z);
      const fs = parseFloat(getComputedStyle(p).fontSize), clip = this.clipOf(p), br = B.getBoundingClientRect();
      let worst = 0, side = '';
      for (const q of rg.getClientRects()) {
        if (q.width < 0.5) continue;
        const cy = (q.top + q.bottom) / 2;
        let l = Math.max(q.left, clip.l), r = Math.min(q.right, clip.r), tt = Math.max(cy - fs / 2, clip.t), b = Math.min(cy + fs / 2, clip.b);
        if (r - l < 0.5 || b - tt < 0.5) continue;
        const d = { L: br.left - l, R: r - br.right, T: br.top - tt, B: b - br.bottom };
        for (const [k, v] of Object.entries(d)) if (v > worst) { worst = v; side = k; }
      }
      /* 診斷欄（不是凍結判定）：文字行片段的原始框（字型 content area）對容器「框線內緣」（padding box）的超出量 */
      const bcs = getComputedStyle(B), inner = { l: br.left + parseFloat(bcs.borderLeftWidth), r: br.right - parseFloat(bcs.borderRightWidth), t: br.top + parseFloat(bcs.borderTopWidth), b: br.bottom - parseFloat(bcs.borderBottomWidth) };
      let raw = 0, rawSide = '';
      for (const q of rg.getClientRects()) {
        if (q.width < 0.5) continue;
        const l = Math.max(q.left, clip.l), r = Math.min(q.right, clip.r), tt = Math.max(q.top, clip.t), b = Math.min(q.bottom, clip.b);
        if (r - l < 0.5 || b - tt < 0.5) continue;
        for (const [k, v] of Object.entries({ L: inner.l - l, R: r - inner.r, T: inner.t - tt, B: b - inner.b })) if (v > raw) { raw = v; rawSide = k; }
      }
      if (worst > 1 || raw > 1) out.push({ box: __tf.sel(B), sel: __tf.sel(p), text: t.trim().slice(0, 30), px: +worst.toFixed(1), side, raw: +raw.toFixed(1), rawSide, diag: !(worst > 1) });
    }
    return out;
  },

  /* ===== #3 字級 ===== 計算字級 × 祖先 transform 縮放（元素框寬 ÷ offsetWidth）。 */
  fonts(){
    this.__clip = new Map();
    const out = [], seen = new Set();
    for (const n of this.textNodes(document.body)) {
      const p = n.parentElement; if (seen.has(p)) continue; seen.add(p);
      if (!/[\p{L}\p{N}]/u.test(n.textContent)) continue;
      const r = p.getBoundingClientRect(); if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue;
      const b = this.boxOf(p) || p;
      /* offsetWidth 是取整數，框寬是小數：比值只在差 >3% 時才當成真的 transform 縮放（否則 9.94px 這類是取整假象） */
      let sc = b.offsetWidth > 0 ? b.getBoundingClientRect().width / b.offsetWidth : 1;
      if (!(Math.abs(sc - 1) > 0.03)) sc = 1;
      const fs = parseFloat(getComputedStyle(p).fontSize) * (sc > 0 && isFinite(sc) ? sc : 1);
      if (fs < 9.95) out.push({ sel: __tf.sel(p), text: n.textContent.trim().slice(0, 30), px: +fs.toFixed(2) });
    }
    return out;
  },

  /* ===== #4 對比 ===== 在頁內解截圖（主程式傳 base64 PNG），逐文字節點取行片段範圍的像素中位色。
     跳過：不含字母／數字的字（表情符號等）、中心被其他層蓋住（elementFromPoint 不是自己、祖先或子孫）、color alpha=0。
     inactive＝在 disabled 按鈕內（WCAG 1.4.3 對非作用中元件豁免），照列但另標。 */
  async contrast(b64, dpr, anim){
    this.__clip = new Map();
    /* 量測前與量測當下兩次取「正在跑的動畫」：兩張截圖之間畫面還在演（夜戰、揭盅），任一次在跑都算暫態 */
    this.__anim = (anim || []).concat(document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target).map((a) => a.effect.target));
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const cv = new OffscreenCanvas(img.width, img.height), cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const out = [], rg = document.createRange(), seen = new Set();
    for (const n of this.textNodes(document.body)) {
      const p = n.parentElement; if (!/[\p{L}\p{N}]/u.test(n.textContent)) continue;
      const cs = getComputedStyle(p), col = this.rgba(cs.color); if (!col || col[3] === 0) continue;
      let op = 1; for (let a = p; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
      const t = n.textContent, a0 = t.search(/\S/), z = t.length - (t.match(/\s*$/) || [''])[0].length;
      rg.setStart(n, a0); rg.setEnd(n, z);
      const clip = this.clipOf(p), px = [[], [], []];
      let hitOk = false, any = false;
      for (const q of rg.getClientRects()) {
        const fs = parseFloat(cs.fontSize), cy = (q.top + q.bottom) / 2;
        const l = Math.max(q.left, clip.l), r = Math.min(q.right, clip.r), tt = Math.max(cy - fs / 2, clip.t), b = Math.min(cy + fs / 2, clip.b);
        if (r - l < 1 || b - tt < 1) continue;
        /* 被捲動容器切掉一部分的行（捲到才讀得完整）：取樣會混到容器邊框，不量 */
        if (cy - fs / 2 < clip.t - 0.5 || cy + fs / 2 > clip.b + 0.5) continue;
        any = true;
        const h = document.elementFromPoint((l + r) / 2, (tt + b) / 2);
        if (h && (h === p || p.contains(h) || h.contains(p))) hitOk = true;
        const X = Math.floor(l * dpr), Y = Math.floor(tt * dpr), W = Math.max(1, Math.floor((r - l) * dpr)), H = Math.max(1, Math.floor((b - tt) * dpr));
        const d = cx.getImageData(X, Y, W, H).data;
        for (let i = 0; i < d.length; i += 4) { px[0].push(d[i]); px[1].push(d[i + 1]); px[2].push(d[i + 2]); }
      }
      if (!any || !hitOk) continue;
      const med = px.map((arr) => { arr.sort((x, y) => x - y); return arr[arr.length >> 1]; });
      const fa = col[3] * op, fg = [0, 1, 2].map((k) => col[k] * fa + med[k] * (1 - fa));
      const l1 = L(fg), l2 = L(med), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const fsz = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700 || cs.fontWeight === 'bold';
      const need = fsz >= 18 || (bold && fsz >= 14) ? 3 : 4.5;
      /* inactive：disabled 鈕（WCAG 1.4.3 豁免）；夜戰已燒毀的紙紮籌碼（.pwchip.burnt 刻意淡到 15% 表示陣亡）另標 burnt */
      const inactive = !!p.closest('button:disabled, [aria-disabled="true"]');
      const burnt = !!p.closest('.burnt');
      /* 演出中（自己或祖先有正在跑的動畫／transition）＝暫態，照列、另標 transient，不計紅 */
      const op0 = this.__op0 && this.__op0.get(p);
      /* op < 0.1＝淡入前／淡出後，字實際上看不到 */
      /* op0 == null＝量測前這個元素還不存在（兩張截圖之間被重畫出來的）；op < 0.1＝淡入前／淡出後 */
      const transient = this.__anim.some((a) => a === p || a.contains(p)) || op0 == null || Math.abs(op0 - op) > 0.02 || op < 0.1;
      if (ratio < need) {
        const s = __tf.sel(p) + '「' + t.trim().slice(0, 12) + '」'; if (seen.has(s)) continue; seen.add(s);
        out.push({ sel: __tf.sel(p), text: t.trim().slice(0, 30), ratio: +ratio.toFixed(2), need, fg: fg.map(Math.round), bg: med, op: +op.toFixed(2), inactive, transient, burnt });
      }
    }
    return out;
  },

  dbgPrev(){
    const e = document.querySelector('#northPrev .preview'); if (!e || !__tf.vis(e)) return null;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e), rg = document.createRange(); rg.selectNodeContents(e);
    const lines = [...rg.getClientRects()].map((q) => [q.top, q.bottom, q.left, q.right].map((v) => +v.toFixed(1)));
    return { box: [r.top, r.bottom, r.left, r.right].map((v) => +v.toFixed(1)), sh: e.scrollHeight, ch: e.clientHeight, fs: cs.fontSize, lh: cs.lineHeight, pad: cs.padding, lines: lines.slice(0, 40) };
  },
  effOp(p){ let op = 1; for (let a = p; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity); return op; },
  /* 量測前先記一次每個文字父元素的有效 opacity；對比量到時若已改變（淡入淡出中）＝暫態 */
  snapOp(){ this.__op0 = new WeakMap(); for (const n of this.textNodes(document.body)) if (!this.__op0.has(n.parentElement)) this.__op0.set(n.parentElement, this.effOp(n.parentElement)); },
  /* ===== #5 觸控目標 ===== 可點＝button、a[href]、input、select、[onclick]、[role=button|tab]、label[for]；中心被蓋住（不可點）者不計。 */
  targets(){
    this.__clip = new Map();
    const out = [];
    const hit = (el, x, y) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false; const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
    for (const el of document.body.querySelectorAll('button, a[href], input:not([type=hidden]), select, [onclick], [role=button], [role=tab], label[for]')) {
      if (this.skip(el) || !__tf.vis(el)) continue;
      if (el.parentElement && el.parentElement.closest('button')) continue; /* 按鈕內的子元素不另計（巢狀在 onclick 卡片裡的獨立 onclick，例如座位卡的 ⓘ，照計） */
      const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      if (!hit(el, cx, cy)) continue;
      let l = 0, rr = 0, u = 0, d = 0;
      while (l < 60 && hit(el, cx - l - 1, cy)) l++;
      while (rr < 60 && hit(el, cx + rr + 1, cy)) rr++;
      while (u < 60 && hit(el, cx, cy - u - 1)) u++;
      while (d < 60 && hit(el, cx, cy + d + 1)) d++;
      let w = l + rr + 1, h = u + d + 1;
      /* 在可捲容器裡被捲出一部分的鈕：看到的高度是捲動位置造成的，不是鈕的尺寸——改用「沒被蓋的那一側」與框尺寸判（捲到就完整） */
      const cb = this.clipOf(el.parentElement), clipped = r.top < cb.t - 0.5 || r.bottom > cb.b + 0.5 || r.left < cb.l - 0.5 || r.right > cb.r + 0.5;
      if (clipped) { w = Math.max(w, Math.min(r.width, 121)); h = Math.max(h, Math.min(r.height, 121)); }
      if (w < 39.5 || h < 39.5) out.push({ sel: __tf.sel(el), text: (el.innerText || el.getAttribute('title') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 20), w, h, box: [Math.round(r.width), Math.round(r.height)] });
    }
    return out;
  },

  /* ===== #6 同列對齊 ===== 每組取各元件的外框（「格」取其內第一個有框的可見子孫），比上緣／下緣／高度的最大差。 */
  firstBoxed(root){
    const q = [...root.children];
    while (q.length) { const e = q.shift(); if (__tf.vis(e) && this.boxed(e) && e.getBoundingClientRect().height > 4) return e; q.push(...e.children); }
    return null;
  },
  /* 「格」的可見外框＝格內所有可見、有框子孫（含自己）的聯集；沒有任何有框子孫＝空格（不計） */
  extent(root){
    let u = null;
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (!__tf.vis(e) || !this.boxed(e) || this.skip(e)) continue;
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 4) continue;
      u = u ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }
    if (!u) return null;
    u.height = u.bottom - u.top; u.id = root.id;
    return { __rect: u, id: root.id };
  },
  align(){
    const V = (els) => els.filter((e) => e && __tf.vis(e) && e.getBoundingClientRect().height > 1);
    const RECT = (e) => e.__rect || e.getBoundingClientRect(), NAME = (e) => e.__rect ? '#' + e.id + '（格內有框聯集）' : __tf.sel(e);
    const groups = {
      seats: V([document.querySelector('#westSeat > *'), document.querySelector('#eastSeat > *')]),
      /* 左右拍品卡：左欄第 i 張可見卡對右欄第 i 張（桌機一欄疊兩張、橫式手機一欄只顯示選中那張） */
      ...Object.fromEntries([0, 1, 2].map((i) => ['railCards' + (i ? i + 1 : ''), V(['#railW', '#railE'].map((id) => V([...document.querySelectorAll(id + ' .railPages > .mcard')])[i]))])),
      railTabs: V([...document.querySelectorAll('#railW .railTabs > *, #railE .railTabs > *')]),
      north: ['#northPrev', '#northSeat', '#northShr'].map((s) => { const c = document.querySelector(s); return c && (__tf.vis(c) || getComputedStyle(c).display === 'contents') ? this.extent(c) : null; }).filter(Boolean),   /* #northSeat 在直式是 display:contents（沒有盒），仍要量裡面的座位卡 */
      southSide: V([...document.querySelectorAll('#south button.side')]),
    };
    const out = [];
    for (const [g, els] of Object.entries(groups)) {
      if (els.length < 2) continue;
      const rs = els.map(RECT);
      const rng = (f) => { const v = rs.map(f); return Math.max(...v) - Math.min(...v); };
      const dt = rng((r) => r.top), db = rng((r) => r.bottom), dh = rng((r) => r.height);
      const worst = Math.max(dt, db, dh);
      /* 演出中（元件或祖先有正在跑的動畫，例如開標時座位燈籠光）＝暫態，不計紅 */
      const transient = els.some((e) => !e.__rect && (window.__vpAnim || []).some((a) => a === e || a.contains(e)));
      out.push({ g, n: els.length, dt: +dt.toFixed(1), db: +db.toFixed(1), dh: +dh.toFixed(1), red: worst > 2, transient, els: els.map((e, i) => NAME(e) + ' ' + [rs[i].top, rs[i].bottom].map(Math.round).join('-')) });
    }
    return out;
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

async function measure(page) {
  await page.evaluate(() => { window.__vpAnim = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target).map((a) => a.effect.target); __vp.snapOp(); });
  const b = await page.evaluate(() => ({ breaks: __vp.breaks(), spill: __vp.spill(), font: __vp.fonts(), target: __vp.targets(), align: __vp.align() }));
  const png = await page.screenshot();
  /* 凍結 #4「文字框下方像素」：把所有字設成透明（不動版面）再拍一張，取文字框範圍的中位色＝字底下的背景 */
  await page.evaluate(() => { const s = document.createElement('style'); s.id = '__vpHide'; s.textContent = '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}'; document.head.appendChild(s); });
  const bgPng = await page.screenshot();   /* 不用 animations:'disabled'：它會把進場動畫快轉／取消，夜戰籌碼的系字徽因此整顆不見 */
  await page.evaluate(() => document.getElementById('__vpHide').remove());
  b.contrast = await page.evaluate(([s, d]) => __vp.contrast(s, d, window.__vpAnim), [bgPng.toString('base64'), 1]);
  b.dbgPrev = await page.evaluate(() => __vp.dbgPrev());
  return { m: b, png };
}

async function cellsFor(page, mode, cls) {
  const t0 = Date.now();
  const n = await round(page);
  const onTable = !/^(title|select|nw-|review$|none)/.test(cls);
  const key = `${mode}|${cls}${onTable && PER_NIGHT.test(cls) ? '|n' + n : ''}`;
  const C = R.cells[key] || (R.cells[key] = { mode, cls, night: onTable ? n : null, vp: {} });
  const todo = LAND.filter((v) => !C.vp[v]);
  if (!todo.length) return;
  for (const v of todo) {
    await setVP(page, v);
    if (await scr(page) !== cls) { C.lost = (C.lost || 0) + 1; break; }
    const { m, png } = await measure(page);
    if (await scr(page) !== cls) { C.lost = (C.lost || 0) + 1; break; }
    if (v === LAND[0]) { m.shot = `${key.replace(/[|:]/g, '_')}-${v}.png`; fs.writeFileSync(path.join(SHOTS, m.shot), png); }
    C.vp[v] = m;
  }
  await setVP(page, LAND[0]);
  console.error(`[visual-polish] ${key} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
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
    console.error(`[visual-polish] ${m} done ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
} finally { await browser.close(); srv.kill(); }

/* 彙總：一格＝(畫面鍵, 視口)；每條件按「項」歸併（選擇器＋文字/組名），記錄出現的畫面×視口 */
const K = ['breaks', 'spill', 'font', 'contrast', 'target', 'align'];
const itemKey = {
  breaks: (x) => `${x.sel}「${x.full.slice(0, 16)}」${x.at}${x.exc ? ' [例外]' : ''}${x.sentence ? ' [句子]' : ''}`,
  spill: (x) => `${x.box} ⊃ ${x.sel}`,
  font: (x) => `${x.sel} ${x.px}px`,
  contrast: (x) => `${x.sel}${x.inactive ? ' [inactive]' : ''}${x.transient ? ' [transient]' : ''}${x.burnt ? ' [burnt]' : ''}`,
  align: (x) => x.g + (x.transient ? ' [transient]' : ''),
  target: (x) => x.sel,
};
const sum = { cells: 0, lost: [], byCond: {} };
for (const k of K) sum.byCond[k] = { byVp: {}, items: {} };
for (const [key, C] of Object.entries(R.cells)) {
  if (C.lost) sum.lost.push(key + ' lost' + C.lost);
  for (const [v, m] of Object.entries(C.vp)) {
    sum.cells++;
    for (const k of K) {
      const S = sum.byCond[k], bv = S.byVp[v] || (S.byVp[v] = { cells: 0, redCells: 0, redItems: 0, redCellsNoExc: 0 });
      bv.cells++;
      let list = m[k] || [];
      if (k === 'align') list = list.filter((x) => x.red);
      /* #2 判定採加嚴版（content area 對框線內緣，raw）；凍結原字面版（em 框對外框，px）另記在 spillLiteral */
      const hard = list.filter((x) => !x.exc && !x.inactive && !x.sentence && !x.transient && !x.burnt);
      if (list.length) bv.redCells++;
      if (hard.length) bv.redCellsNoExc++;
      bv.redItems += list.length;
      for (const x of list) {
        const ik = itemKey[k](x);
        const I = S.items[ik] || (S.items[ik] = { key: ik, ex: x, where: [], n: 0 });
        I.n++; if (I.where.length < 400) I.where.push(`${key}@${v}`);
        if (k === 'contrast' && x.ratio < I.ex.ratio) I.ex = x;
        if ((k === 'spill' || k === 'align') && (x.px || Math.max(x.dt, x.db, x.dh)) > (I.ex.px || Math.max(I.ex.dt || 0, I.ex.db || 0, I.ex.dh || 0))) I.ex = x;
      }
    }
  }
}
/* 對照：#2 凍結字面版（em 框對容器外框 >1px）的格數——判定用的是加嚴版（content area 對框線內緣），這裡留字面版數字供對照 */
sum.spillDiag = { byVp: {}, items: {} };
for (const [key, C] of Object.entries(R.cells)) for (const [v, m] of Object.entries(C.vp)) {
  const bv = sum.spillDiag.byVp[v] || (sum.spillDiag.byVp[v] = { cells: 0, redCells: 0 }); bv.cells++;
  const l = (m.spill || []).filter((x) => x.px > 1); if (l.length) bv.redCells++;
  for (const x of l) { const ik = `${x.box} ⊃ ${x.sel}`; const I = sum.spillDiag.items[ik] || (sum.spillDiag.items[ik] = { key: ik, n: 0, max: 0, where: [] }); I.n++; if (x.px > I.max) { I.max = x.px; I.ex = x; } if (I.where.length < 50) I.where.push(`${key}@${v}`); }
}
R.summary = sum;
fs.writeFileSync(path.join(OUT, `probe-${TAG}.json`), JSON.stringify(R, null, 1), 'utf8');
const brief = { tag: TAG, cells: sum.cells, lost: sum.lost, pageErrors: Object.fromEntries(Object.entries(R.pageErrors).map(([k, v]) => [k, v.length])) };
for (const k of K) {
  const S = sum.byCond[k];
  brief[k] = { byVp: Object.fromEntries(Object.entries(S.byVp).map(([v, b]) => [v, `${b.redCellsNoExc}/${b.cells} 格紅（含例外 ${b.redCells}）`])), items: Object.keys(S.items).length,
    list: Object.values(S.items).sort((a, b) => b.n - a.n).slice(0, 40).map((I) => `${I.key} ×${I.n}` + (k === 'contrast' ? ` ${I.ex.ratio}/${I.ex.need}` : k === 'target' ? ` ${I.ex.w}x${I.ex.h}` : k === 'spill' ? ` ${I.ex.px}px${I.ex.side}` : k === 'align' ? ` dt${I.ex.dt} db${I.ex.db} dh${I.ex.dh}` : k === 'breaks' ? ` 「${I.ex.lines}」` : '')) };
}
console.log(JSON.stringify(brief, null, 1));
