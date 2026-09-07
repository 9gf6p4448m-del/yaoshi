// 傷害可讀性批 2-a：把 dmg-readability.mjs pix 模式存下來的凍幀重新讀一遍，
// 印出每一個閃紅樣本的分佈——不只凍結檔 R2 要的「整個方框平均紅偏量」，
// 還有「方框內有幾成像素的紅偏量 >25」與「最紅的那顆像素」。
// R2 的門檻是方框**平均**，而方框裡本來就有一大片背景（四足獸的包圍盒只有三成是身體），
// 所以平均值天生被稀釋；這支只負責把稀釋前後的數字都攤開，不改任何判準。
//   node tests/tools/dmg-redstat.mjs <pix 輸出目錄> [...更多目錄]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

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

function stat(im, b) {
  const x0 = Math.max(0, Math.floor(b.x0)), x1 = Math.min(im.w - 1, Math.ceil(b.x1));
  const y0 = Math.max(0, Math.floor(b.y0)), y1 = Math.min(im.h - 1, Math.ceil(b.y1));
  let n = 0, s = 0, hot = 0, mx = -999;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * im.w + x) * im.ch;
    const d = im.data[i] - (im.data[i + 1] + im.data[i + 2]) / 2;
    s += d; n++; if (d > 25) hot++; if (d > mx) mx = d;
  }
  return n ? { mean: s / n, hot: hot / n, max: mx, n } : null;
}

for (const dir of process.argv.slice(2)) {
  const J = JSON.parse(fs.readFileSync(path.join(dir, 'pix.json'), 'utf8'));
  const by = new Map();
  for (const r of J.samples.flashes) { if (!by.has(r.run)) by.set(r.run, {}); by.get(r.run)[r.step] = r; }
  const rows = [];
  for (const [run, g] of by) {
    if (!g[1] || !g[2] || !g[1].box || !g[2].box) continue;
    const pre = stat(decodePng(fs.readFileSync(path.join(dir, 'frames', g[1].file))), g[1].box);
    const fl = stat(decodePng(fs.readFileSync(path.join(dir, 'frames', g[2].file))), g[2].box);
    if (!pre || !fl) continue;
    rows.push({ run, burning: !!g[1].meta.burning, boxPx: fl.n,
      dMean: +(fl.mean - pre.mean).toFixed(2), hotPre: +pre.hot.toFixed(3), hotFlash: +fl.hot.toFixed(3),
      maxPre: +pre.max.toFixed(0), maxFlash: +fl.max.toFixed(0), file: g[2].file });
  }
  const live = rows.filter((r) => !r.burning);
  const s = (a) => a.slice().sort((x, y) => x - y);
  const dm = s(live.map((r) => r.dMean));
  console.log(JSON.stringify({ dir, samples: rows.length, live: live.length,
    dMean: { min: dm[0], p50: dm[Math.floor(dm.length / 2)], max: dm[dm.length - 1] },
    ge25: live.filter((r) => r.dMean >= 25).length,
    hotFlashMed: s(live.map((r) => r.hotFlash))[Math.floor(live.length / 2)],
    maxFlashMed: s(live.map((r) => r.maxFlash))[Math.floor(live.length / 2)],
    burning: rows.filter((r) => r.burning).map((r) => r.dMean) }, null, 0));
  for (const r of rows) console.log('  ', JSON.stringify(r));
}
