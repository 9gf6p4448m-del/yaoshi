// 讀 appraise-c-probe.mjs 的 raw JSON，依凍結 docs/experiments/2026-09-28-acceptance-appraise-panels.md
// #1（修訂）／#2／#3／#8（鑑賞態 draw）／#11(a)–(e) 逐格判定。任何欄位量不到（null／缺）一律判紅。
// 用法：node tests/tools/appraise-c-judge.mjs <raw.json> [--mark <mark-eq raw.json>] [--out <summary.json>]
import fs from 'node:fs';
import { png, bandStats, MOCK_B_WEST, mockSheenRim } from './appraise-c-lib.mjs';

const RAW = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const { cases, notes, root, tag } = JSON.parse(fs.readFileSync(RAW, 'utf8'));
const TAU = Math.PI * 2;
const fails = { c1: [], c1skip: [], c2: [], c3: [], c8: [], c11a: [], c11b: [], c11c: [], c11d: [], c11e: [], c11f: [], c11h: [], c11g: [] };
const cnt = Object.fromEntries(Object.keys(fails).map((k) => [k, 0]));
const stats = { hFrac: [], hFracSkip: [], hFracSpinMin: [], dim: [], ringDE: [], ringFrac: [], bandMean: [], bandRatio: [], rimPeaks: [], rimMedian: [], sheenRatio: [], sheenPeak: [], titleFs: [], scrollBlank: [], scrollBlankV5: [], dimEx: [], drawsTable: [], drawsAppr: [], drawsBurn: [], cornerMax: [], spinRate: [], fontMin: [] };
const ov = (a, b) => (!a || !b) ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const inSafe = (r, s, W, H) => !!(r && s) && r.left >= s.left - 0.5 && r.top >= s.top - 0.5 && r.right <= W - s.right + 0.5 && r.bottom <= H - s.bottom + 0.5;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d < 0) d += TAU; return d; };
const BURN_END_MS = 800; // 只用來挑「燒符中」那幾幀量火光；判定本身讀每幀的符紙像素

/* #11(f) 示意基準：b-west.png 同一環帶（示意鏡面 0.73R 到外圈 R，幾何見 MOCK_B_WEST） */
const MOCK_FILE = arg('--mock', new URL('../../docs/experiments/2026-09-28-appraise-c/mirror/b-west.png', import.meta.url));
const MOCK = (() => { const M = MOCK_B_WEST, img = png(fs.readFileSync(MOCK_FILE)); const b = bandStats(img, M.cx, M.cy, M.R * M.face, M.R); return { mean: b.mean, peaks: b.peaks, median: b.median }; })();
/* #11(h) 示意基準（09-30 加嚴）：同一張 b-west.png——連珠環帶（0.9R..R 裡峰群最多那一圈）中位亮度、斜向反光帶最高格絕對亮度 */
const MOCK_H = (() => { const img = png(fs.readFileSync(MOCK_FILE)), m = mockSheenRim(img); return { rimRadius: m.rim.radius, rimPeaks: m.rim.peaks, rimMedian: m.rim.median, sheenDeg: m.sheen.bestOblique && m.sheen.bestOblique.deg, sheenRatio: m.sheen.bestOblique && m.sheen.bestOblique.ratio, sheenPeak: m.sheen.bestOblique && m.sheen.bestOblique.peak, faceMedian: m.sheen.median }; })();
let refCell = null, refCellH = null;
/* #11(g′)(3)①：「標下它」白話句的簽收版（逐字；表格欄同 tests/tools/appraise-plain-check.mjs） */
const SIGNED = (() => {
  const md = fs.readFileSync(new URL('../../docs/experiments/2026-09-28-appraise-c/plain-copy-signed.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const sec = md.split('## 對照表')[1].split('## 對你而言提示句')[0], m = {};
  for (const l of sec.split('\n')) if (/^\| \d+ \|/.test(l)) { const c = l.split('|').map((s) => s.trim()); m[c[2]] = c[6]; }
  return m;
})();
const rgb = (s) => { const m = String(s || '').match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/); return m ? [+m[1], +m[2], +m[3]] : null; };
const isGold = (c) => !!c && c[0] >= 200 && c[1] >= 160 && c[2] <= 170 && c[0] - c[2] >= 60;
const isZhu = (c) => !!c && c[0] >= 120 && c[1] <= 90 && c[2] <= 90 && c[0] - c[1] >= 60;
/** 矩形與圓（外半徑）重疊：圓心到矩形最近點的距離 < 半徑 */
const rectCircle = (r, cx, cy, R) => { if (!r) return false; const dx = Math.max(r.left - cx, 0, cx - r.right), dy = Math.max(r.top - cy, 0, cy - r.bottom); return Math.hypot(dx, dy) < R - 0.5; };
for (const row of cases) {
  if (row.notready) for (const k of Object.keys(fails)) fails[k].push(`${row.vp}|${row.mode} 有階段沒量到（見 notes）`);
  for (const p of row.picks || []) {
    const key = `${p.vp}|${p.mode}|${p.phase}|${p.rail}#${p.slot}(${p.name})`;
    const W = p.W, H = p.H;
    for (const k of Object.keys(cnt)) cnt[k]++;
    if (p.err) { for (const k of Object.keys(fails)) if (k !== 'c1skip') fails[k].push(`${key} 量測例外：${p.err}`); }
    const s = p.panel && p.panel.safe;
    const pnl = p.panel && p.panel.rect;
    const bb = p.at1300 && p.at1300.bbox;
    const M = p.at1300 && p.at1300.fx && p.at1300.fx.mirror;
    // ── #1（修訂）：1.3 秒時穩定態＋(a)(b)(c)(d) ──
    {
      const f = [];
      if (!p.at1300) f.push('沒有 1.3 秒量測');
      else {
        if (!p.at1300.apprOn) f.push('1.3 秒時不在鑑賞態');
        if (p.at1300.focusRendered !== true) f.push('1.3 秒時焦點法寶沒被畫');
        if (!p.ring || !(p.ring.frac >= 0.5)) f.push('1.3 秒時找不到照妖鏡系色環（未穩定或沒有鏡子）');
        if (!bb) f.push('(a) 投影框量不到');
        else {
          const hf = (bb.bottom - bb.top) / H; stats.hFrac.push(hf);
          if (!(hf >= 0.35)) f.push(`(a) 高度 ${hf.toFixed(3)} < 0.35`);
          if (!inSafe(bb, s, W, H)) f.push('(a) 投影框出安全區');
          if (!pnl) f.push('(a) 題字欄量不到');
          else if (ov(bb, pnl) > 0) f.push(`(a) 與題字欄重疊 ${ov(bb, pnl).toFixed(1)}px²`);
          const pbs = p.bboxScreen;
          if (!pbs || Math.abs(pbs.left - bb.left) > 0.01 || Math.abs(pbs.bottom - bb.bottom) > 0.01) f.push('(a) 產品 bboxScreen 與判定器自算的框不一致');
        }
        /* (b)（09-29 修訂）：再排除照妖鏡外圈（含光暈）外接圓；有鏡子就一定用修訂量法（dimEx），沒有鏡子的舊版才退回原量法 */
        const D = M ? p.dimEx : p.dim;
        const dr = D && D.ref && D.after != null ? D.after / D.ref : null;
        if (M && !p.dimEx) f.push('(b) 修訂量法（排除鏡子外接圓）量不到');
        else if (dr == null) f.push('(b) 暗糊量不到'); else { stats.dim.push(dr); if (!(dr <= 0.70)) f.push(`(b) 暗糊比 ${dr.toFixed(3)} > 0.70`); }
        // (c)：spin[0..1] 是穩定後第 1 秒（p0→spin[1] 共 1000ms 遊戲時間）
        if (!p.pose0 || !p.spin || p.spin.length < 4 || !p.pose0.me) f.push('(c) 自轉／浮動量不到');
        else {
          const d1 = angDiff(p.pose0.me.rotY, p.spin[1].pose.rotY), dt = (p.spin[1].t - p.pose0.t) / 1000;
          const rate = d1 / dt; stats.spinRate.push(rate);
          if (!(Math.abs(rate - TAU / 6) <= (TAU / 6) * 0.2)) f.push(`(c) 自轉 ${rate.toFixed(3)} rad/s 不在 2π/6±20%`);
          const ys = [p.pose0.me.y, ...p.spin.slice(0, 4).map((q) => q.pose.y)];
          if (!(Math.max(...ys) - Math.min(...ys) > 0)) f.push('(c) 2 秒內 position.y 沒有起伏');
        }
        // (d)：其餘拍品 1 秒內 rotation.y 變化 0（p0 → poseEnd 其實 6 秒，更嚴）
        if (!p.pose0 || !p.poseEnd) f.push('(d) 量不到');
        else for (const o of p.pose0.others) { const o1 = p.poseEnd.others.find((x) => x.slot === o.slot); if (!o.pose || !o1 || !o1.pose) f.push(`(d) slot${o.slot} 姿態量不到`); else if (o1.pose.rotY !== o.pose.rotY) f.push(`(d) slot${o.slot} 轉了`); }
      }
      if (f.length) fails.c1.push(`${key} ${f.join('；')}`);
    }
    // ── #1 修訂：揭幕中點空白 0.1 秒內跳到穩定態、不返回 ──
    {
      const k = p.skip, f = [];
      if (!k || k.err) f.push('量測例外 ' + (k && k.err));
      else {
        if (!k.blank) f.push('找不到空白處');
        const b0 = k.before;
        const inIntro = b0 && (b0.fx ? b0.fx.ms < 1060 : true);
        if (!inIntro) f.push('點空白時已不在揭幕中（量測時機錯）');
        const a = k.after;
        if (!a || !a.apprOn) f.push('點空白後返回了牌桌（應跳過、不返回）');
        else {
          if (a.focusRendered !== true) f.push('跳過後 0.1 秒焦點法寶未現身');
          if (!a.paperCover || a.paperCover.corners >= 3 || (a.paperAlpha != null && a.paperAlpha > 0)) f.push(`跳過後符紙還在（紙矩形四點中 ${a.paperCover && a.paperCover.corners} 點是紙、回報不透明度 ${a.paperAlpha}）`);
          if (!a.ring || !(a.ring.frac >= 0.5)) f.push('跳過後 0.1 秒鏡子未全現');
          const b = a.bbox;
          if (!b) f.push('(a) 框量不到');
          else {
            const hf = (b.bottom - b.top) / H; stats.hFracSkip.push(hf);
            if (!(hf >= 0.35)) f.push(`(a) 高度 ${hf.toFixed(3)}`);
            if (!inSafe(b, k.panel && k.panel.safe, W, H)) f.push('(a) 出安全區');
            if (!k.panel || ov(b, k.panel.rect) > 0) f.push('(a) 與題字欄重疊或題字欄量不到');
          }
        }
        if (k.closed !== true) f.push('跳過後再點空白沒有返回');
      }
      if (f.length) fails.c1skip.push(`${key} ${f.join('；')}`);
    }
    // ── #2（＝#11(c) 的一部分）：題字欄同側、內容等價、安全區、無截斷、不越框、cut ──
    const panelFails = [];
    if (!p.panel) panelFails.push('題字欄量不到');
    else {
      const P = p.panel, cx = (P.rect.left + P.rect.right) / 2;
      if ((p.rail === 'railW') !== (cx < W / 2)) panelFails.push(`題字欄在錯的一側（中心 x=${cx.toFixed(0)}）`);
      if (!P.content || !P.content.match) panelFails.push('內容與原拍品卡不等價');
      if (!P.content || !P.content.markBadge) panelFails.push('盯上徽章不一致');
      if (!inSafe(P.rect, P.safe, W, H)) panelFails.push('題字欄出安全區');
      if (P.trunc.length) panelFails.push('截斷：' + P.trunc.slice(0, 3).join('｜'));
      if (P.outside.length) panelFails.push('越框：' + P.outside.slice(0, 3).join('｜'));
      if (P.cut.length) panelFails.push('cut：' + P.cut.slice(0, 3).join('｜'));
    }
    if (panelFails.length) fails.c2.push(`${key} ${panelFails.join('；')}`);
    // ── #3（含 #11(d) 返回後逐值相同）──
    {
      const f = [];
      if (!p.before || !p.after) f.push('量不到');
      else {
        if (p.after.apprOn !== false) f.push('點空白後沒有返回');
        if (!eq(p.before.cam, p.after.cam)) f.push('鏡頭不同 ' + JSON.stringify(p.before.cam) + ' → ' + JSON.stringify(p.after.cam));
        if (!eq(p.before.feltHead, p.after.feltHead)) f.push('#feltHead 矩形不同');
        if (!eq(p.before.lights, p.after.lights)) f.push('燈光不同');
        if (!eq(p.before.items, p.after.items)) {
          const d = [];
          for (const it of p.before.items) { const j = p.after.items.find((x) => x.slot === it.slot); if (!eq(it, j)) d.push('slot' + it.slot + (j && !eq(it.kids, j.kids) ? '(子物件/材質/圖層)' : '(位置/旋轉/可見)')); }
          f.push('拍品不同：' + d.join(','));
        }
        if (!p.blank) f.push('找不到 40×40 的空白返回觸控區');
      }
      if (f.length) fails.c3.push(`${key} ${f.join('；')}`);
    }
    // ── #8／#11(e)：鑑賞態（燒符中＋穩定）每 rAF draw ≤ 牌桌態 ──
    {
      const f = [];
      const tbl = p.drawsTable && p.drawsTable.length ? Math.max(...p.drawsTable) : null;
      const burnD = (p.burn || []).filter((q) => q.ms > 0).map((q) => q.draws);
      const stD = [p.at1300 && p.at1300.draws, ...(p.spin || []).map((q) => q.draws)].filter((x) => x != null);
      if (tbl == null || !burnD.length || !stD.length) f.push('draw 量不到');
      else {
        stats.drawsTable.push(tbl); stats.drawsBurn.push(Math.max(...burnD)); stats.drawsAppr.push(Math.max(...stD));
        if (Math.max(...burnD) > tbl) f.push(`燒符中 draw ${Math.max(...burnD)} > 牌桌 ${tbl}`);
        if (Math.max(...stD) > tbl) f.push(`穩定態 draw ${Math.max(...stD)} > 牌桌 ${tbl}`);
      }
      if (f.length) { fails.c8.push(`${key} ${f.join('；')}`); fails.c11e.push(`${key} ${f.join('；')}`); }
    }
    // ── #11(a) 燒符 ──
    {
      const f = [], B = p.burn || [];
      const within = B.filter((q) => q.ms <= 900);
      const covered = within.filter((q) => q.paperCover && q.paperCover.center && q.paperCover.center.yellow >= 0.25 && q.paperCover.center.paper >= 0.5 && q.paperCover.corners >= 3 && (q.paperApi ? q.paperRectHasCenter : true));
      if (!within.length) f.push('0.9 秒內沒有量到任何幀');
      else if (!covered.length) f.push('0.9 秒內沒有任何一幀符紙蓋住法寶框中心（像素）');
      // 燒符結束前焦點法寶不可見：符紙還在（產品回報符紙不透明度>0，或像素上中心還是符紙）的每一幀，焦點都不能被畫
      const paperFrames = B.filter((q) => (q.paperApi && q.paperApi.alpha > 0) || (q.paperCover && q.paperCover.corners >= 3));
      const seen = paperFrames.filter((q) => q.focusRendered !== false);
      if (seen.length) f.push(`符紙還在時焦點法寶被畫出（${seen.map((q) => q.ms).join(',')}ms）`);
      // 火光：燒的那幾幀（符紙在燒：產品回報 0<burn<1；沒有產品回報就取 0.2–0.8 秒）燒符區比燒符前同區亮
      const burning = B.filter((q) => q.paperApi ? (q.paperApi.burn > 0 && q.paperApi.burn < 1) : (q.ms >= 200 && q.ms <= BURN_END_MS));
      if (!burning.length) f.push('沒有燒符中的幀');
      for (const q of burning) if (!(q.burnLum != null && q.refLum != null && q.burnLum > q.refLum)) f.push(`${q.ms}ms 燒符區亮度 ${q.burnLum && q.burnLum.toFixed(1)} ≤ 燒符前 ${q.refLum && q.refLum.toFixed(1)}`);
      // 每一幀都還在鑑賞態（切換／進場中途不回牌桌）
      if (B.some((q) => q.ms > 0 && !q.apprOn)) f.push('揭幕中途離開鑑賞態');
      if (f.length) fails.c11a.push(`${key} ${f.join('；')}`);
    }
    // ── #11(b) 照妖鏡 ──
    {
      const f = [];
      if (!p.ring || !(p.ring.frac >= 0.5)) f.push(`像素上找不到系色環（最佳比例 ${p.ring ? (p.ring.frac || 0).toFixed(2) : 'null'}）`);
      else {
        stats.ringDE.push(p.ring.dE); stats.ringFrac.push(p.ring.frac);
        if (!(p.ring.dE <= 15)) f.push(`鏡緣色 ΔE00 ${p.ring.dE.toFixed(1)} > 15（中位色 ${p.ring.median} vs ${p.token && p.token.css}）`);
        if (!M) f.push('產品沒有回報鏡子幾何');
        else {
          const R = M.r * M.scale;
          if (!(p.ring.radius >= R * M.line[0] - 2 && p.ring.radius <= R * M.line[1] + 2)) f.push(`像素環半徑 ${p.ring.radius} 不在回報的光線帶 ${(R * M.line[0]).toFixed(1)}–${(R * M.line[1]).toFixed(1)}`);
        }
      }
      if (!p.bagua || p.bagua.api0 == null || p.bagua.api1 == null) f.push('八卦環角度量不到');
      else {
        if (!(Math.abs(p.bagua.api1 - p.bagua.api0) > 0)) f.push('八卦環 1 秒內角度沒變');
        if (!(p.bagua.pixDiff > 1)) f.push(`八卦環帶 1 秒前後像素差 ${p.bagua.pixDiff} ≤ 1（沒在轉）`);
      }
      // 12 個等距角度（每 0.5 秒＝30°）每個的投影框四角都在內圈圓內
      if (!p.spin || p.spin.length !== 12) f.push('12 角度量不到');
      else {
        let prev = p.pose0 && p.pose0.me ? p.pose0.me.rotY : null, worst = 0;
        for (const q of p.spin) {
          if (!q.bbox || !q.mirror || !q.pose) { f.push('某角度量不到'); break; }
          const step = prev == null ? null : angDiff(prev, q.pose.rotY); prev = q.pose.rotY;
          if (step == null || Math.abs(step - TAU / 12) > 0.05) f.push(`角度間距 ${step && step.toFixed(3)} 不等距`);
          const R = q.mirror.r * q.mirror.scale * q.mirror.face;
          let m = 0; for (const x of [q.bbox.left, q.bbox.right]) for (const y of [q.bbox.top, q.bbox.bottom]) m = Math.max(m, Math.hypot(x - q.mirror.cx, y - q.mirror.cy));
          worst = Math.max(worst, m / R);
          if (m > R + 0.5) f.push(`rotY=${q.pose.rotY.toFixed(2)} 框角距鏡心 ${m.toFixed(1)} > 內圈 ${R.toFixed(1)}`);
          stats.hFracSpinMin.push((q.bbox.bottom - q.bbox.top) / H);
        }
        stats.cornerMax.push(worst);
      }
      if (f.length) fails.c11b.push(`${key} ${f.join('；')}`);
    }
    // ── #11(f) 鏡子亮度對齊示意（09-29 新增）──
    {
      const f = [];
      if (!p.band || p.band.mean == null || p.nonFocus == null) f.push('鏡緣環帶量不到');
      else {
        const ratio = p.band.mean / p.nonFocus; stats.bandMean.push(p.band.mean); stats.bandRatio.push(ratio);
        if (!(ratio >= 2)) f.push(`鏡緣環帶平均亮度 ${p.band.mean.toFixed(1)} < 焦點以外畫面 ${p.nonFocus.toFixed(1)} 的 2 倍（${ratio.toFixed(2)}）`);
        if (p.vp === 'V1' && p.mode === 'solo' && p.phase === 'bid' && p.rail === 'railW' && p.name === '虎爺印') {
          refCell = { key, mean: p.band.mean, peaks: p.band.peaks, median: p.band.median };
          if (!(p.band.mean >= 0.85 * MOCK.mean)) f.push(`環帶平均亮度 ${p.band.mean.toFixed(1)} < 示意 ${MOCK.mean.toFixed(1)} 的 85%（${(0.85 * MOCK.mean).toFixed(1)}）`);
          if (!(p.band.peaks >= 8)) f.push(`八卦紋峰群 ${p.band.peaks} < 8`);
        }
      }
      if (f.length) fails.c11f.push(`${key} ${f.join('；')}`);
    }
    // ── #11(h) 鏡框連珠與鏡面斜向反光（09-29 原條文＋09-30 加嚴）──
    {
      const f = [];
      if (!p.rim || !p.rim.radius) f.push('鏡框外緣環帶量不到（或峰群 0）');
      else { stats.rimPeaks.push(p.rim.peaks); stats.rimMedian.push(p.rim.median); if (!(p.rim.peaks >= 24)) f.push(`連珠峰群 ${p.rim.peaks} < 24（r=${p.rim.radius}）`); }
      const so = p.sheen && p.sheen.bestOblique;
      if (!so || so.ratio == null) f.push('鏡面斜向反光量不到');
      else { stats.sheenRatio.push(so.ratio); stats.sheenPeak.push(so.peak); if (!(so.ratio >= 1.5)) f.push(`斜向反光比 ${so.ratio.toFixed(2)} < 1.5（${so.deg}°）`); }
      if (p.vp === 'V1' && p.mode === 'solo' && p.phase === 'bid' && p.rail === 'railW' && p.name === '虎爺印') {
        refCellH = { key, rimRadius: p.rim && p.rim.radius, rimPeaks: p.rim && p.rim.peaks, rimMedian: p.rim && p.rim.median, sheenDeg: so && so.deg, sheenRatio: so && so.ratio, sheenPeak: so && so.peak, faceMedian: p.sheen && p.sheen.median };
        if (!(p.rim && p.rim.median >= 0.85 * MOCK_H.rimMedian)) f.push(`連珠環帶中位亮度 ${p.rim && p.rim.median && p.rim.median.toFixed(1)} < 示意 ${MOCK_H.rimMedian.toFixed(1)} 的 85%（${(0.85 * MOCK_H.rimMedian).toFixed(1)}）`);
        if (!(so && so.peak >= 0.85 * MOCK_H.sheenPeak)) f.push(`斜向反光帶峰值 ${so && so.peak && so.peak.toFixed(1)} < 示意 ${MOCK_H.sheenPeak.toFixed(1)} 的 85%（${(0.85 * MOCK_H.sheenPeak).toFixed(1)}）`);
      }
      if (f.length) fails.c11h.push(`${key} ${f.join('；')}`);
    }
    // ── #11(g′) 卷軸題字（09-29 修訂；③「對你而言」依主對話 09-30 指示暫緩實作，不在此判定）──
    {
      const f = [], sc = p.scroll;
      if (!sc) f.push('1.3 秒時沒有卷軸');
      else {
        // (1) 載體與展開
        if (!(sc.p === 1 && sc.opacity === 1)) f.push(`1.3 秒時卷軸未全開（p=${sc.p}、opacity=${sc.opacity}）`);
        if (!sc.rods || !sc.rods.top || !sc.rods.bot) f.push('上桿／下軸不在');
        const B = (p.burn || []).filter((q) => q.scroll);
        if (!B.length) f.push('揭幕逐幀量不到卷軸');
        else {
          const b0 = B.find((q) => q.ms === 0);
          if (!b0 || !(b0.scroll.opacity === 0 || b0.scroll.p === 0)) f.push('點籤當下卷軸不是捲起的');
          if (!B.some((q) => q.scroll.p > 0 && q.scroll.p < 1)) f.push('揭幕中沒有任何一幀是「展開到一半」（沒有展開過程）');
        }
        const ks = p.skip && p.skip.after && p.skip.after.scroll;
        if (!ks || !(ks.p === 1 && ks.opacity === 1)) f.push(`燒符中點空白後 0.1 秒卷軸未全開（p=${ks && ks.p}）`);
        // (2) 標題（B 案）
        const ref = sc.ref;
        if (!ref) f.push('卷軸對應不到拍品');
        if (!sc.title || !sc.title.vis) f.push('沒有直書標題');
        else {
          stats.titleFs.push(sc.title.fs);
          if (ref && sc.title.text !== ref.name) f.push(`標題「${sc.title.text}」≠ 法寶名「${ref && ref.name}」`);
          if (sc.title.wm !== 'vertical-rl') f.push(`標題 writing-mode=${sc.title.wm}`);
          if (!(sc.title.fs >= 24)) f.push(`標題字級 ${sc.title.fs} < 24`);
          if (!isGold(rgb(sc.title.color))) f.push(`標題不是金色（${sc.title.color}）`);
        }
        if (!sc.seal || !sc.seal.vis) f.push('沒有朱印');
        else {
          if (ref && sc.seal.text !== ref.fac) f.push(`朱印「${sc.seal.text}」≠ 系別「${ref && ref.fac}」`);
          if (!isZhu(rgb(sc.seal.bg))) f.push(`朱印底色不是紅（${sc.seal.bg}）`);
        }
        // (3)① 白話句逐字＝簽收版；② 數值標籤＝unitRow
        if (!sc.gain || !sc.gain.vis) f.push('沒有「標下它」白話句');
        else if (ref) {
          if (sc.gain.text !== SIGNED[ref.name]) f.push(`白話句與簽收版不同：${JSON.stringify(sc.gain.text)}`);
          if (sc.gain.label !== (ref.curse ? '注意' : '標下它')) f.push(`白話句標籤「${sc.gain.label}」`);
        }
        if (ref) {
          const want = ref.curse ? ['詛咒品・不召喚'] : [`攻${ref.atk}`, `血${ref.hp}`, ...(ref.beat ? [`共鳴第${ref.beat}拍`] : [])];
          if (JSON.stringify(sc.tags) !== JSON.stringify(want)) f.push(`數值標籤 ${JSON.stringify(sc.tags)} ≠ 拍品 ${JSON.stringify(want)}`);
        }
        // (3)④ 規則原文：放得下全文；收成一行時「規則原文 N 條・點開」，點開後全文可見且與原拍品卡逐字等價
        if (sc.fold) {
          if (sc.foldText !== `✦ 規則原文 ${sc.n} 條・點開` || !(sc.n > 0)) f.push(`收合列文字「${sc.foldText}」（N=${sc.n}）`);
          if (sc.cardVisible) f.push('收合時卡片仍顯示');
          const u = p.unfold;
          if (!u) f.push('收合了但沒量到點開後');
          else {
            if (!u.hit) f.push('「點開」那一行點不到（被別的元素蓋住）');
            if (!u.apprOn) f.push('點開後離開了鑑賞態');
            const us = u.scroll, up = u.panel;
            if (!us || us.fold || !us.cardVisible || !us.abVisible || (us.hasExtra && !us.extraVisible)) f.push('點開後規則原文沒有全部顯示');
            if (!up || !up.content || !up.content.match) f.push('點開後內容與原拍品卡不等價');
            if (up && (up.trunc.length || up.outside.length || up.cut.length)) f.push('點開後截斷／越框／cut：' + [...up.trunc, ...up.outside, ...up.cut].slice(0, 3).join('｜'));
            if (up && !(up.fontMin >= 13)) f.push(`點開後字級 ${up.fontMin} < 13`);
            const M2 = u.fx && u.fx.mirror;
            if (us && M2 && rectCircle(us.rect, M2.cx, M2.cy, M2.r * M2.scale)) f.push('點開後卷軸與鏡子重疊');
            if (us && u.bbox && ov(us.rect, u.bbox) > 0) f.push('點開後卷軸與法寶框重疊');
          }
        } else if (!sc.cardVisible || !sc.abVisible || (sc.hasExtra && !sc.extraVisible)) f.push('沒收合但規則原文沒全部顯示');
        // (4) 版面：與鏡子（外圈）、焦點法寶投影框、窄籤重疊 0；卷面空白 ≤ 40%
        if (M && rectCircle(sc.rect, M.cx, M.cy, M.r * M.scale)) f.push('卷軸與鏡子重疊');
        if (bb && ov(sc.rect, bb) > 0) f.push(`卷軸與法寶框重疊 ${ov(sc.rect, bb).toFixed(1)}px²`);
        for (const t of sc.tabs || []) if (ov(sc.rect, t) > 0) { f.push('卷軸與窄籤重疊'); break; }
        if (sc.blank == null) f.push('卷面空白量不到');
        else { stats.scrollBlank.push(sc.blank); if (p.vp === 'V5') stats.scrollBlankV5.push(sc.blank); if (!(sc.blank <= 0.4)) f.push(`卷面空白 ${(sc.blank * 100).toFixed(1)}% > 40%`); }
      }
      if (f.length) fails.c11g.push(`${key} ${f.join('；')}`);
    }
    // ── #11(c) 題字 ──
    {
      const f = [...panelFails];
      if (p.panel) { stats.fontMin.push(p.panel.fontMin); if (!(p.panel.fontMin >= 13)) f.push(`字級 ${p.panel.fontMin} < 13：${p.panel.small.slice(0, 3).join('｜')}`); }
      if (f.length) fails.c11c.push(`${key} ${f.join('；')}`);
    }
    // ── #11(d) 其餘拍品：鑑賞態不可見（返回後逐值相同在 #3）──
    {
      const f = [];
      if (!p.others || !p.others.length) f.push('其餘拍品量不到');
      else for (const o of p.others) { if (!o.has) f.push(`slot${o.slot} 節點找不到`); else if (o.rendered !== false) f.push(`slot${o.slot} 鑑賞中仍被畫出`); }
      if (fails.c3.some((x) => x.startsWith(key + ' ') && /拍品不同/.test(x))) f.push('返回後拍品不同（見 #3）');
      if (f.length) fails.c11d.push(`${key} ${f.join('；')}`);
    }
  }
}
// 盯上按鈕的賽局狀態等價（#2 後半，另一支 appraise-mark-eq.mjs 的結果）
let markEq = null;
if (arg('--mark')) {
  const m = JSON.parse(fs.readFileSync(arg('--mark'), 'utf8'));
  markEq = { total: m.rows.length, equal: m.rows.filter((r) => r.equal === true).length, bad: m.rows.filter((r) => r.equal !== true).map((r) => `${r.vp}|${r.mode}|${r.rail}#${r.slot} ${r.diff || r.err || '不等'}`) };
  for (const b of markEq.bad) fails.c2.push('盯上狀態 ' + b);
}
const q = (a) => { if (!a.length) return null; const v = [...a].filter((x) => x != null).sort((x, y) => x - y); return { min: v[0], med: v[v.length >> 1], max: v[v.length - 1], n: v.length }; };
const summary = {
  raw: RAW, root, tag, notes,
  picks: cases.reduce((a, c) => a + (c.picks || []).length, 0),
  verdict: Object.fromEntries(Object.keys(fails).map((k) => [k, { pass: fails[k].length === 0 && cnt[k] > 0 && !cases.some((c) => c.notready), fail: fails[k].length, of: cnt[k] }])),
  stats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, q(v)])),
  markEq,
  c11f: { mock: MOCK, refCell },
  c11h: { mock: MOCK_H, refCell: refCellH },
  fails,
};
if (!refCell) fails.c11f.push('V1|solo|bid|railW 虎爺印 那一格量不到（#11(f) 對示意判紅）');
if (!refCellH) fails.c11h.push('V1|solo|bid|railW 虎爺印 那一格量不到（#11(h) 對示意判紅）');
for (const k of ['c11f', 'c11h']) summary.verdict[k] = { pass: fails[k].length === 0 && cnt[k] > 0 && !cases.some((c) => c.notready), fail: fails[k].length, of: cnt[k] };
const out = arg('--out');
if (out) fs.writeFileSync(out, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ picks: summary.picks, c11f: summary.c11f, c11h: summary.c11h, verdict: summary.verdict, stats: summary.stats, markEq: markEq && { total: markEq.total, equal: markEq.equal }, notes }, null, 1));
for (const [k, v] of Object.entries(fails)) if (v.length) console.log(`\n[${k}] ${v.length} 格不過，前 6：\n  ` + v.slice(0, 6).join('\n  '));
