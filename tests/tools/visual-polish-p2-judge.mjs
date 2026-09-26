// 畫面精美度第二階段判定——凍結 docs/experiments/2026-09-26-acceptance-visual-polish-p2.md #1–#6、#7(a)、#8、#9（第一階段 #1–#6 部分）
// 輸入：visual-polish-probe.mjs 的基準與改後兩份（可先用 --merge 把按 --modes 分片的結果合併）。
// 用法：node tests/tools/visual-polish-p2-judge.mjs <base.json> <head.json> [--out <judge.json>]
// 只讀 JSON、不開瀏覽器；判準照凍結檔字面，量不到的格照列「無資料」，不當通過。
import fs from 'node:fs';

const [baseF, headF] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('--out', null);
const B = JSON.parse(fs.readFileSync(baseF, 'utf8')), H = JSON.parse(fs.readFileSync(headF, 'utf8'));
const VPS = ['V1', 'V2', 'V3', 'V4', 'V5'];
const epSplit = (t) => t.split(/(\p{Extended_Pictographic}️?)/u).map((s) => s.trim()).filter(Boolean);
const norm = (arr) => (arr || []).flatMap(epSplit);
const missingOf = (want, have) => { const pool = have.slice(), miss = []; for (const x of want) { const i = pool.indexOf(x); if (i >= 0) pool.splice(i, 1); else miss.push(x); } return miss; };
const cellsOf = (R) => Object.entries(R.cells).flatMap(([k, C]) => Object.entries(C.vp).map(([v, m]) => ({ k, v, cls: C.cls, m })));
const HB = cellsOf(B), HH = cellsOf(H);
const find = (R, k, v) => R.cells[k] && R.cells[k].vp[v];
/* 同一局同一刻才比「對基準逐項」：UI 驅動的整局在同一版連跑兩次都會在第 3 夜前後分岔（基準 14ac1f2 自己連跑三次實測，
   見 README「整局不決定性」）。判準＝兩邊這一格的四件拍品名與北列摘要（去掉 emoji）都相同。 */
const sig = (m) => { const t = m.p2.tabs; const names = t.tabs.map((x) => x.name).join(',') || Object.values(t.cardItems).map((v) => v[0]).join(','); const ns = (m.p2.nsum || []).map((n) => n.text.replace(/\p{Extended_Pictographic}️?/gu, '').replace(/\s+/g, '')).join('|'); return names + '#' + ns; };
const sameGame = (bm, m) => !!bm && sig(bm) === sig(m);

/* CIEDE2000（sRGB D65） */
function lab([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = f(r), G = f(g), Bl = f(b);
  let X = (R * 0.4124 + G * 0.3576 + Bl * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + Bl * 0.0722, Z = (R * 0.0193 + G * 0.1192 + Bl * 0.9505) / 1.08883;
  const t = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116); X = t(X); Y = t(Y); Z = t(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
function de2000(c1, c2) {
  const [L1, a1, b1] = lab(c1), [L2, a2, b2] = lab(c2), rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hh = (b, a) => { if (a === 0 && b === 0) return 0; let x = Math.atan2(b, a) / rad; return x < 0 ? x + 360 : x; };
  const h1p = hh(b1, a1p), h2p = hh(b2, a2p), dL = L2 - L1, dC = C2p - C1p;
  let dh = 0; if (C1p * C2p !== 0) { dh = h2p - h1p; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh * rad) / 2), Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p !== 0) hb = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dth = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T, RT = -Math.sin(2 * dth * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
const rgb = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
const over = (fg, bg) => fg.c.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));

const J = {};
/* ===== #1 無系統 emoji ===== */
{
  const cnt = (cells) => { const by = {}, ch = {}; let n = 0; for (const { k, v, m } of cells) { const e = (m.p2 && m.p2.emoji) || []; if (e.length) { n++; by[v] = (by[v] || 0) + 1; } for (const x of e) for (const c of [...x.ch]) ch[c] = (ch[c] || 0) + 1; } return { cellsWithEmoji: n, byVp: by, chars: ch, cells: cells.length }; };
  const b = cnt(HB), h = cnt(HH);
  const bidBase = HB.filter((c) => c.cls === 'bid').some((c) => (c.m.p2.emoji || []).some((e) => /😊|🔊/u.test(e.ch)));
  const headList = HH.flatMap(({ k, v, m }) => (m.p2.emoji || []).map((e) => `${k}@${v} ${e.where} ${e.sel} ${e.ch}「${e.text}」`)).slice(0, 40);
  J['#1'] = { pass: h.cellsWithEmoji === 0 && h.cells > 0, baseRed: b.cellsWithEmoji > 0 && bidBase, base: b, head: h, headList };
}
/* ===== #2 拍品窄籤（出價／盯上） ===== */
{
  const cells = HH.filter((c) => c.cls === 'bid' || c.cls === 'mark');
  const bad = [], facSeen = new Set(); let tabsN = 0, expandN = 0, skipped2 = 0;
  const p1 = ['breaks', 'spill', 'font', 'contrast', 'target'];
  for (const { k, v, m } of cells) {
    const T = m.p2.tabs, id = `${k}@${v}`;
    if (T.cardsVisible.length) bad.push(`${id} 預設可見拍品卡 ${T.cardsVisible.join(',')}`);
    if (!T.tabs.length) bad.push(`${id} 沒有窄籤`);
    for (const t of T.tabs) {
      tabsN++;
      const tok = T.tok['--sys-' + t.fac];
      if (t.text !== t.name) bad.push(`${id} ${t.rail}#${t.slot} 籤文「${t.text}」≠ 全名「${t.name}」`);
      if (t.ell || t.scrollOver > 0 || t.overX > 0.5) bad.push(`${id} ${t.rail}#${t.slot} 名稱截斷／越框 ell=${t.ell} scroll=${t.scrollOver} overX=${t.overX}`);
      if (t.rect[3] < 39.5) bad.push(`${id} ${t.rail}#${t.slot} 高 ${t.rect[3]}`);
      if (!(t.bar.w >= 2) || !tok || t.bar.color !== tok) bad.push(`${id} ${t.rail}#${t.slot} 系色條 ${t.bar.w}px ${t.bar.color} ≠ --sys-${t.fac} ${tok}`);
      else facSeen.add(t.fac);
    }
    for (const c of p1) for (const x of m[c] || []) if (/railTabs/.test(x.sel || '') && !x.exc && !x.inactive && !x.sentence && !x.transient && !x.burnt) bad.push(`${id} 第一階段 ${c} ${x.sel} ${x.text || ''} ${x.ratio || ''}${x.w ? x.w + 'x' + x.h : ''}`);
    for (const e of m.p2.expand || []) { expandN++; if (!e.shown || !e.inView || e.missing.length || e.otherCards.length) bad.push(`${id} 展開 ${e.rail}#${e.slot} shown=${e.shown} inView=${e.inView} missing=${JSON.stringify(e.missing)} others=${e.otherCards}`); }
    if (T.tabs.length && !(m.p2.expand || []).length) bad.push(`${id} 沒有做展開量測`);
    if ((m.p2.afterCollapse || []).length) bad.push(`${id} 收起後仍有卡 ${m.p2.afterCollapse}`);
    const bm = find(B, k, v);   /* 與基準同一局同一格的原拍品卡文字項目逐項比對 */
    if (bm && !sameGame(bm, m)) skipped2++;
    if (bm && sameGame(bm, m)) for (const [cid, items] of Object.entries(bm.p2.tabs.cardItems || {})) { const hi = T.cardItems[cid]; if (!hi) { bad.push(`${id} ${cid} 基準有、改後沒有`); continue; } const miss = missingOf(norm(items), hi); if (miss.length) bad.push(`${id} ${cid} 對基準缺 ${JSON.stringify(miss)}`); }
  }
  const baseCells = HB.filter((c) => c.cls === 'bid' || c.cls === 'mark');
  const baseRed = baseCells.filter((c) => c.m.p2.tabs.cardsVisible.length || c.m.p2.tabs.tabs.some((t) => t.bar.w < 2)).length;
  J['#2'] = { pass: cells.length > 0 && bad.length === 0 && ['zuling', 'xianghuo', 'yinqi', 'curse'].every((f) => facSeen.has(f)), cells: cells.length, tabs: tabsN, expanded: expandN, baseCompareSkippedDiffGame: skipped2, factionsSeen: [...facSeen], bad: bad.slice(0, 60), badN: bad.length, base: { cells: baseCells.length, redCells: baseRed } };
}
/* ===== #3 揭盅結果窄條 ===== */
{
  const isRes = (c) => (c.cls === 'reveal-result' || c.cls === 'shrine') && c.m.p2.stage;
  const cells = HH.filter(isRes), bad = [], gaps = []; let skipped3 = 0, cmp3 = 0; const info3 = [];   /* 結果條與原卡是同一段樣板（只換 class），逐項等價在改後同格內量（all ⊆ shown）；對基準同格只當參考——同一夜的開標結果在兩次跑之間本來就可能不同（整局不決定性） */
  for (const { k, v, m } of cells) {
    const s = m.p2.stage, id = `${k}@${v}`;
    if (!/resultStrip/.test(s.cls)) { bad.push(`${id} 不是結果條（${s.cls}）`); continue; }
    gaps.push(s.gap);
    if (!(s.gap >= 0 && s.gap <= 4) || s.overlapSouth) bad.push(`${id} 下緣距底列 ${s.gap}px overlap=${s.overlapSouth}`);
    const miss = missingOf(s.all, s.shown); if (miss.length) bad.push(`${id} 看不到 ${JSON.stringify(miss)}`);
    if (s.big.some((x) => x < 15) || s.rows.some((x) => x < 12)) bad.push(`${id} 字級 big=${s.big} rows=${s.rows}`);
    const bm = find(B, k, v); if (bm && bm.p2.stage && !sameGame(bm, m)) skipped3++; if (bm && bm.p2.stage && sameGame(bm, m)) { cmp3++; const m2 = missingOf(norm(bm.p2.stage.all), s.all); if (m2.length) info3.push(`${id} 與基準同格內容不同 ${JSON.stringify(m2)}`); }
  }
  const bcells = HB.filter(isRes);
  J['#3'] = { pass: cells.length > 0 && bad.length === 0, cells: cells.length, baseCompared: cmp3, baseCompareSkippedDiffGame: skipped3, baseDiffInfo: info3.slice(0, 20), baseDiffN: info3.length, gapRange: gaps.length ? [Math.min(...gaps), Math.max(...gaps)] : null, bad: bad.slice(0, 40), badN: bad.length,
    base: { cells: bcells.length, gapRange: bcells.length ? [Math.min(...bcells.map((c) => c.m.p2.stage.gap)), Math.max(...bcells.map((c) => c.m.p2.stage.gap))] : null } };
}
/* ===== #4 祖靈色可辨（CIEDE2000） ===== */
{
  const bars = {}; let line = null, tok = null;
  for (const { m } of HH) { const T = m.p2.tabs; if (!T.tabs.length) continue; tok = T.tok; for (const t of T.tabs) { bars[t.fac] = bars[t.fac] || t.bar.color; line = line || t.line; } }
  const gold = tok && rgb(tok['--gold']).c, lineC = line && rgb(line), zu = bars.zuling && rgb(bars.zuling).c;
  const lineComp = lineC && over(lineC, [11, 9, 8]);   /* 框線若半透明，疊在籤底（近黑）上的實際色 */
  const pair = {}; const F = Object.keys(bars);
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) pair[F[i] + '-' + F[j]] = +de2000(rgb(bars[F[i]]).c, rgb(bars[F[j]]).c).toFixed(1);
  const zg = zu && +de2000(zu, gold).toFixed(1), zl = zu && lineComp && +de2000(zu, lineComp).toFixed(1);
  /* 基準：沒有系色條；祖靈色 token（--zuling 淺色，基準窄籤框線＝--gold）對金線的 ΔE 供對照 */
  let bt = null; for (const { m } of HB) if (m.p2.tabs.tok && m.p2.tabs.tok['--zuling']) { bt = m.p2.tabs.tok; break; }
  const bz = bt && +de2000(rgb(bt['--zuling']).c, rgb(bt['--gold']).c).toFixed(1);
  const bpair = {}; if (bt) { const K = ['--zuling', '--xianghuo', '--yinqi', '--curse']; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) bpair[K[i] + '|' + K[j]] = +de2000(rgb(bt[K[i]]).c, rgb(bt[K[j]]).c).toFixed(1); }
  J['#4'] = { pass: F.length === 4 && zg >= 20 && zl >= 20 && Object.values(pair).every((x) => x >= 20), bars, line, zulingVsGold: zg, zulingVsLine: zl, pairwise: pair, base: { note: '基準沒有系色條；下列為基準的祖靈 token（--zuling）對 --gold 與四系 token 兩兩', zulingTokenVsGold: bz, pairwise: bpair } };
}
/* ===== #5 北列摘要 ===== */
{
  const fs5 = [], cr = [], bad = []; let nCells = 0;
  for (const { k, v, m } of HH) {
    const ns = m.p2.nsum || []; if (!ns.length) continue; nCells++;
    for (const n of ns) { fs5.push(n.fs, ...n.kids); if (n.fs < 11 || n.kids.some((x) => x < 11)) bad.push(`${k}@${v} 字級 ${n.fs}/${n.kids}`); }
    for (const c of m.nsumContrast || []) { if (c.transient) continue; cr.push(c.ratio); if (c.ratio < 4.5) bad.push(`${k}@${v} 對比 ${c.ratio}「${c.text}」`); }
    for (const x of m.north || []) bad.push(`${k}@${v} 第一階段北列 ${x.kind} ${x.sel} ${x.text || ''}${x.by ? ' ← ' + x.by : ''}`);
  }
  const bfs = [], bcr = []; for (const { m } of HB) { for (const n of m.p2.nsum || []) bfs.push(n.fs); for (const c of m.nsumContrast || []) if (!c.transient) bcr.push(c.ratio); }
  J['#5'] = { pass: nCells > 0 && bad.length === 0, cells: nCells, fontMin: Math.min(...fs5), contrastMin: Math.min(...cr), bad: bad.slice(0, 40), badN: bad.length, base: { fontMin: Math.min(...bfs), contrastMin: Math.min(...bcr) } };
}
/* ===== #6 字體分工 ===== */
{
  const SERIF = ['#titleScr h1', '#titleScr .bigbtn', '.stageCard .big', '#stage h2', '#review h2', '.mcard .nm', '.railTabs button', '.rcard .rnm', '.seat .nm', '#myDir', '#myLife', '#myPow', '.stakebar .amt', '.incamt', '#mainbtn', '.nwCard h3', '#nwScr h2', '.endrank'];
  const SANS = ['#titleScr p:not(#verLine)', '.mcard .ab', '.mcard .uline', '.seat .st', '.bsum', '.nsum', '.bidfly', '#shz > div', '.nwCard'];   /* .mut 是顏色類（淡字），會出現在明體的標題列裡，不當作字體類別 */
  const first = (f) => (f || '').split(',')[0].replace(/["']/g, '').trim();
  const seen = {}, bad = [], loaded = new Set();
  for (const { k, v, m } of HH) { const F = m.p2.fam; for (const f of F.loaded || []) loaded.add(f); for (const [s, fam] of Object.entries(F.fam)) { const want = SERIF.includes(s) ? 'Noto Serif TC' : SANS.includes(s) ? 'Noto Sans TC' : null; if (!want) continue; (seen[s] = seen[s] || new Set()).add(first(fam)); if (first(fam) !== want) bad.push(`${k}@${v} ${s} → ${fam}`); } }
  const bseen = {}; for (const { m } of HB) for (const [s, fam] of Object.entries(m.p2.fam.fam)) (bseen[s] = bseen[s] || new Set()).add(first(fam));
  const L = [...loaded];
  J['#6'] = { pass: bad.length === 0 && L.some((f) => /^Noto Serif TC/.test(f)) && L.some((f) => /^Noto Sans TC/.test(f)), serif: Object.fromEntries(SERIF.map((s) => [s, seen[s] ? [...seen[s]] : '無資料'])), sans: Object.fromEntries(SANS.map((s) => [s, seen[s] ? [...seen[s]] : '無資料'])), loadedFaces: L, bad: [...new Set(bad)].slice(0, 30), badN: bad.length,
    base: Object.fromEntries([...SERIF, ...SANS].map((s) => [s, bseen[s] ? [...bseen[s]] : '無資料'])) };
}
/* ===== #7(a)(d) 首頁 ===== */
{
  const rows = [], bad = [];
  for (const { k, v, m } of HH) { const h = m.p2.home; if (!h) continue; const cx = h.center[0] / h.vw, cy = h.center[1] / h.vh; rows.push({ k, v, cx: +cx.toFixed(3), cy: +cy.toFixed(3), btns: h.btns.map((b) => `${b.text} ${b.hitW}x${b.hitH}${b.vis ? '' : ' 不可見'}`), ver: h.ver.text + (h.ver.vis ? '' : ' 不可見') });
    if (!(cx < 0.4 && cy > 0.5)) bad.push(`${k}@${v} 中心 ${cx.toFixed(3)},${cy.toFixed(3)}`);
    for (const b of h.btns) if (!b.vis || b.hitW < 39.5 || b.hitH < 39.5) bad.push(`${k}@${v} ${b.text} ${b.hitW}x${b.hitH} vis=${b.vis}`);
    if (!h.ver.vis || !/^v\d/.test(h.ver.text)) bad.push(`${k}@${v} 版本列 ${h.ver.text} vis=${h.ver.vis}`); }
  const brow = []; for (const { k, v, m } of HB) { const h = m.p2.home; if (h) brow.push({ k, v, cx: +(h.center[0] / h.vw).toFixed(3), cy: +(h.center[1] / h.vh).toFixed(3) }); }
  J['#7a'] = { pass: rows.length > 0 && bad.length === 0, rows, bad, base: brow };
}
/* ===== #8 其餘畫面只換皮（V1 主要容器矩形 ≤2px） ===== */
{
  const SCR = ['duel', 'select', 'nw-menu', 'nw-intro', 'review', 'end'];
  const per = {}, bad = [];
  for (const { k, v, cls, m } of HH) {
    if (v !== 'V1' || !SCR.includes(cls) || !m.p2.rects) continue;
    const bm = find(B, k, v); if (!bm || !bm.p2.rects) { (per[cls] = per[cls] || { cells: 0, keys: 0, maxDelta: 0, noBase: 0 }).noBase++; continue; }
    const P = per[cls] = per[cls] || { cells: 0, keys: 0, maxDelta: 0, noBase: 0, onlyBase: [], onlyHead: [] }; P.cells++;
    /* 只比兩邊都在畫面上的容器；只有一邊有的（演出中才出現的閃光層、拍首字幕等）另列，不當成矩形差 */
    for (const [rk, br] of Object.entries(bm.p2.rects)) { const hr = m.p2.rects[rk]; if (!hr) { P.onlyBase.push(rk); continue; } P.keys++; const d = Math.max(...br.map((x, i) => Math.abs(x - hr[i]))); if (d > P.maxDelta) P.maxDelta = +d.toFixed(1); if (d > 2) bad.push(`${k} ${rk} 差 ${d.toFixed(1)}px 基準[${br}] 改後[${hr}]`); }
    for (const rk of Object.keys(m.p2.rects)) if (!bm.p2.rects[rk]) P.onlyHead.push(rk);
  }
  J['#8'] = { pass: SCR.every((s) => per[s] && per[s].cells > 0) && bad.length === 0, perScreen: per, bad: bad.slice(0, 40), badN: bad.length };
}
/* ===== #9 第一階段 #1–#6（＋北列）違規格數：逐條不多於基準（V1–V4），V5 不變差 ===== */
{
  const K = ['breaks', 'spill', 'font', 'contrast', 'target', 'align', 'north'];
  const S = (R) => { const o = {}; for (const k of K) { o[k] = {}; for (const v of VPS) o[k][v] = 0; } for (const C of Object.values(R.cells)) for (const [v, m] of Object.entries(C.vp)) for (const k of K) { let l = m[k] || []; if (k === 'align') l = l.filter((x) => x.red); if (l.some((x) => !x.exc && !x.inactive && !x.sentence && !x.transient && !x.burnt)) o[k][v]++; } return o; };
  const sb = S(B), sh = S(H), worse = [];
  for (const k of K) for (const v of VPS) if (sh[k][v] > sb[k][v]) worse.push(`${k}@${v} ${sb[k][v]}→${sh[k][v]}`);
  /* 逐項：改後才出現的紅項（選擇器層級），方便看是哪一樣變多 */
  const items = (R, k) => { const o = {}; for (const [ck, C] of Object.entries(R.cells)) for (const [v, m] of Object.entries(C.vp)) { let l = m[k] || []; if (k === 'align') l = l.filter((x) => x.red); for (const x of l) { if (x.exc || x.inactive || x.sentence || x.transient || x.burnt) continue; const id = (x.sel || x.g || x.kind) + (x.open ? ' [展開]' : ''); (o[id] = o[id] || []).push(ck + '@' + v); } } return o; };
  const newItems = {}; for (const k of K) { const bi = items(B, k), hi = items(H, k); for (const [id, w] of Object.entries(hi)) if (!bi[id]) newItems[k + ' ' + id] = { n: w.length, ex: w.slice(0, 4) }; }
  J['#9-phase1'] = { pass: worse.length === 0, base: sb, head: sh, worse, newItems, cells: { base: HB.length, head: HH.length } };
}
const brief = Object.fromEntries(Object.entries(J).map(([k, x]) => [k, x.pass]));
const out = { baseFile: baseF, headFile: headF, brief, detail: J };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1), 'utf8');
console.log(JSON.stringify({ brief, n1: { base: J['#1'].base.cellsWithEmoji, head: J['#1'].head.cellsWithEmoji, baseRed: J['#1'].baseRed }, n2: { badN: J['#2'].badN, cells: J['#2'].cells, tabs: J['#2'].tabs, fac: J['#2'].factionsSeen, bad: J['#2'].bad.slice(0, 8), base: J['#2'].base }, n3: { badN: J['#3'].badN, gap: J['#3'].gapRange, base: J['#3'].base, bad: J['#3'].bad.slice(0, 6) }, n4: J['#4'], n5: { font: J['#5'].fontMin, contrast: J['#5'].contrastMin, base: J['#5'].base, bad: J['#5'].bad.slice(0, 6) }, n6: { badN: J['#6'].badN, bad: J['#6'].bad.slice(0, 6), loaded: J['#6'].loadedFaces }, n7a: J['#7a'].bad.slice(0, 6), n8: { per: J['#8'].perScreen && Object.fromEntries(Object.entries(J['#8'].perScreen).map(([s, p]) => [s, { cells: p.cells, keys: p.keys, maxDelta: p.maxDelta, noBase: p.noBase }])), bad: J['#8'].bad.slice(0, 8) }, n9: { worse: J['#9-phase1'].worse, newItems: Object.keys(J['#9-phase1'].newItems).slice(0, 15) } }, null, 1));
