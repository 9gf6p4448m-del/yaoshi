// 傷害可讀性批 2-a：把 dmg-readability.mjs pix 模式存下來的凍幀重新讀一遍，離線算兩件事。
//
//   node tests/tools/dmg-redstat.mjs <pix 輸出目錄> [...更多目錄]        → R2 的紅偏量（兩種量法並列）
//   node tests/tools/dmg-redstat.mjs --r1 <pix 輸出目錄> [...]           → R1 的逐筆記錄（字級／class／kind／色相類別）
//
// ── R2 的兩種量法 ──
//  (A)【方框平均】凍結檔 R2 的字面量法：該尊投影方框內**全部**像素的 R−(G+B)/2 平均差。
//      問題：3D 妖在自己的包圍盒裡只佔約三成，其餘七成是背景，訊號被稀釋。
//  (B)【遮罩平均】只量**屬於那一尊的像素**：拿「命中前那一幀」與「閃紅瞬間那一幀」逐像素差分，
//      在方框內取「任一通道 |Δ| > MASK_TH(8)」的像素當遮罩，在遮罩內算 R−(G+B)/2 的平均差。
//      **門檻不動（+25）**，改的是量測位置——把方框裡沒動過的背景排掉。
//      遮罩是用「有沒有變」選的、不是用「有沒有變紅」選的（用亮度差三通道取最大，不是用紅偏量），
//      所以它不會自動把樣本挑成紅的；基準版（沒有閃紅接收端）跑同一套，遮罩選到的是鏡頭移動造成的
//      邊緣像素，那些像素的紅偏量差應該 ≈0——這就是這個量法的鑑別力對照。
//      仍要揭露的偏差：鏡頭在動時遮罩會混進背景邊緣，所以本檔一律把 maskFrac（遮罩佔方框幾成）印出來。
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MASK_TH = 8; // 遮罩門檻：任一通道的絕對差超過這個值就算「這個像素變了」

function decodePng(buf) {
  let p = 8, w = 0, h = 0, bd = 0, ct = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const t = buf.toString('ascii', p + 4, p + 8); const d = buf.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; }
    else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6)) throw new Error('unsupported png');
  const ch = ct === 6 ? 4 : 3; const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch; const out = Buffer.alloc(h * stride); let o = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[o++]; const line = raw.subarray(o, o + stride); o += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride); const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev ? prev[x] : 0, c = x >= ch && prev ? prev[x - ch] : 0;
      let v = line[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}

const clampBox = (im, b) => ({
  x0: Math.max(0, Math.floor(b.x0)), x1: Math.min(im.w - 1, Math.ceil(b.x1)),
  y0: Math.max(0, Math.floor(b.y0)), y1: Math.min(im.h - 1, Math.ceil(b.y1)),
});

/** 方框內全部像素的紅偏量平均、>25 的比例、最紅的像素（量法 A 的素材）。 */
function boxStat(im, b) {
  const r = clampBox(im, b);
  let n = 0, s = 0, hot = 0, mx = -999;
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
    const i = (y * im.w + x) * im.ch;
    const d = im.data[i] - (im.data[i + 1] + im.data[i + 2]) / 2;
    s += d; n++; if (d > 25) hot++; if (d > mx) mx = d;
  }
  return n ? { mean: s / n, hot: hot / n, max: mx, n } : null;
}

/** 量法 B：兩幀在各自方框的交集區域上逐像素差分，取「有變」的像素當遮罩，算遮罩內的紅偏量平均差。 */
function maskStat(imA, boxA, imB, boxB) {
  if (imA.w !== imB.w || imA.h !== imB.h) return null;
  const a = clampBox(imA, boxA), b = clampBox(imB, boxB);
  const x0 = Math.min(a.x0, b.x0), x1 = Math.max(a.x1, b.x1);
  const y0 = Math.min(a.y0, b.y0), y1 = Math.max(a.y1, b.y1);
  let n = 0, tot = 0, sA = 0, sB = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * imA.w + x) * imA.ch;
    tot++;
    const dr = Math.abs(imA.data[i] - imB.data[i]);
    const dg = Math.abs(imA.data[i + 1] - imB.data[i + 1]);
    const db = Math.abs(imA.data[i + 2] - imB.data[i + 2]);
    if (Math.max(dr, dg, db) <= MASK_TH) continue;
    sA += imA.data[i] - (imA.data[i + 1] + imA.data[i + 2]) / 2;
    sB += imB.data[i] - (imB.data[i + 1] + imB.data[i + 2]) / 2;
    n++;
  }
  return { n, frac: tot ? n / tot : 0, pre: n ? sA / n : null, flash: n ? sB / n : null, d: n ? (sB - sA) / n : null };
}

const num = (v, k = 2) => (v === null || v === undefined || !isFinite(v) ? null : +v.toFixed(k));
const s = (a) => a.slice().sort((x, y) => x - y);
const q = (a, p) => (a.length ? s(a)[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

function r2(dirs) {
  for (const dir of dirs) {
    const J = JSON.parse(fs.readFileSync(path.join(dir, 'pix.json'), 'utf8'));
    const by = new Map();
    for (const r of J.samples.flashes) { if (!by.has(r.run)) by.set(r.run, {}); by.get(r.run)[r.step] = r; }
    const rows = [];
    for (const [run, g] of by) {
      if (!g[0] || !g[1] || !g[2] || !g[1].box || !g[2].box) continue;
      // 與治具 judge 同一組有效性閘門：噪音底 ≤5、窗內沒有燒毀、四格都還在對決演出中
      const d0 = g[0].t !== null && g[1].t !== null ? g[1].t - g[0].t : null;
      const burnIn = (g[2].bn !== undefined && g[0].bn !== undefined) ? (g[2].bn - g[0].bn) > 0 : false;
      const on = [0, 1, 2].every((k) => g[k] && g[k].on !== false);
      const usable = d0 !== null && Math.abs(d0) <= 5 && !burnIn && on;
      const imPre = decodePng(fs.readFileSync(path.join(dir, 'frames', g[1].file)));
      const imFl = decodePng(fs.readFileSync(path.join(dir, 'frames', g[2].file)));
      const bPre = boxStat(imPre, g[1].box), bFl = boxStat(imFl, g[2].box);
      if (!bPre || !bFl) continue; // 方框整個掉出畫面（尊被收起來／投影跑掉）：沒有像素可量
      const m = maskStat(imPre, g[1].box, imFl, g[2].box);
      rows.push({ run, usable, burning: !!g[1].meta.burning,
        boxD: num(bFl.mean - bPre.mean), maskD: m ? num(m.d) : null, maskFrac: m ? num(m.frac, 3) : null, maskPx: m ? m.n : 0,
        hotPre: num(bPre.hot, 3), hotFlash: num(bFl.hot, 3), maxPre: num(bPre.max, 0), maxFlash: num(bFl.max, 0),
        file: g[2].file });
    }
    const live = rows.filter((r) => r.usable && !r.burning);
    const burn = rows.filter((r) => r.usable && r.burning);
    const box = live.map((r) => r.boxD), msk = live.filter((r) => r.maskD !== null).map((r) => r.maskD);
    console.log(JSON.stringify({ dir, samples: rows.length, live: live.length,
      box: { min: q(box, 0), p50: q(box, 0.5), max: q(box, 1), ge25: box.filter((x) => x >= 25).length },
      mask: { min: q(msk, 0), p50: q(msk, 0.5), max: q(msk, 1), ge25: msk.filter((x) => x >= 25).length,
        fracP50: q(live.map((r) => r.maskFrac), 0.5) },
      burning: { n: burn.length, boxAbsMax: burn.length ? Math.max(...burn.map((r) => Math.abs(r.boxD))) : null,
        maskAbsMax: burn.filter((r) => r.maskD !== null).length ? Math.max(...burn.filter((r) => r.maskD !== null).map((r) => Math.abs(r.maskD))) : null } }));
    for (const r of rows) console.log('  ', JSON.stringify(r));
  }
}

/* ── R1 的逐筆記錄（判定不動，只是把「可讀性」該有的欄位印出來）──
   hue：把文字色分成 warm-red（傷害／擊殺的暖紅橙）／green（治療）／neutral（灰白）三類，
   判準只看色相與飽和度，不看亮度：G 最大且 G−max(R,B) ≥ 20＝green；R 最大且 R−G ≥ 40 且 R−B ≥ 40＝warm-red；
   其餘＝neutral。**R−G 那一項是關鍵**：v0.45 的乳白 #ffe6c0 的 R−B 有 63、但 R−G 只有 25，
   它是「暖白」不是「紅」——少了這一項就會把基準的乳白也判成 warm-red，那樣這個欄位就分不出新舊。 */
function hueOf(c) {
  if (!c || c.length < 3) return 'unknown';
  const [r, g, b] = c;
  if (g >= r && g >= b && g - Math.max(r, b) >= 20) return 'green';
  if (r >= g && r >= b && r - g >= 40 && r - b >= 40) return 'warm-red';
  return 'neutral';
}
function r1(dirs) {
  for (const dir of dirs) {
    const J = JSON.parse(fs.readFileSync(path.join(dir, 'pix.json'), 'utf8'));
    const rows = J.samples.floats.map((f) => {
      const kill = /\bkill\b/.test(f.cls), unit = /\bunit\b/.test(f.cls), heal = /\bheal\b/.test(f.cls);
      const cat = unit ? 'unit' : kill ? 'kill' : heal ? 'heal' : 'hit';
      // class 與事件 kind 對得上嗎：unit 只能來自 burn；kill／hit 只能來自非 burn 的交鋒
      // 基準版（v0.45／v0.48）根本沒有 data-kind 這個欄位，那不是「對不上」，是「沒有這個欄位」——分開數
      const noKind = !f.kind;
      const kindOk = noKind ? null : (unit ? f.kind === 'burn' : f.kind !== 'burn');
      const hue = hueOf(f.color);
      const hueOk = cat === 'unit' ? hue === 'neutral' : cat === 'heal' ? hue === 'green' : hue === 'warm-red';
      return { seq: f.seq, cat, kind: f.kind, noKind, font: f.font, ratio: f.ratio, color: f.color, hue, kindOk, hueOk, text: f.text };
    });
    const byCat = {};
    for (const r of rows) {
      const c = (byCat[r.cat] = byCat[r.cat] || { n: 0, fonts: new Set(), ratios: [], kindBad: 0, noKind: 0, hueBad: 0, hues: new Set() });
      c.n++; c.fonts.add(r.font); c.ratios.push(r.ratio); c.hues.add(r.hue);
      if (r.noKind) c.noKind++; else if (!r.kindOk) c.kindBad++;
      if (!r.hueOk) c.hueBad++;
    }
    const out = {};
    for (const k of Object.keys(byCat)) {
      const c = byCat[k];
      out[k] = { n: c.n, fontPx: [...c.fonts].sort((a, b) => a - b), hue: [...c.hues],
        ratio: { min: q(c.ratios, 0), p50: q(c.ratios, 0.5), max: q(c.ratios, 1) },
        kindMismatch: c.kindBad, noKindField: c.noKind, hueMismatch: c.hueBad };
    }
    console.log(JSON.stringify({ dir, total: rows.length, byCat: out }));
  }
}

const args = process.argv.slice(2);
if (args[0] === '--r1') r1(args.slice(1)); else r2(args);
