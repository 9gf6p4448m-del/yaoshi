// node lf-imgdiff.mjs a.png b.png  → 輸出相異像素數（任一通道差 >0 即算）
import fs from 'node:fs'; import { chromium } from './lf-lib.mjs';
const [a, b] = process.argv.slice(2, 4);
const browser = await chromium.launch(); const page = await browser.newPage();
const r = await page.evaluate(async ([A, B]) => {
  const load = async (s) => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(bm.width, bm.height); const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return { w: bm.width, h: bm.height, d: g.getImageData(0, 0, bm.width, bm.height).data }; };
  const x = await load(A), y = await load(B); if (x.w !== y.w || x.h !== y.h) return { sizeMismatch: [x.w, x.h, y.w, y.h] };
  let diff = 0, maxd = 0; for (let i = 0; i < x.d.length; i += 4) { const d = Math.max(Math.abs(x.d[i] - y.d[i]), Math.abs(x.d[i + 1] - y.d[i + 1]), Math.abs(x.d[i + 2] - y.d[i + 2])); if (d > 0) { diff++; if (d > maxd) maxd = d; } }
  const grid = {}; let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1; for (let i = 0; i < x.d.length; i += 4) { const d = Math.max(Math.abs(x.d[i] - y.d[i]), Math.abs(x.d[i + 1] - y.d[i + 1]), Math.abs(x.d[i + 2] - y.d[i + 2])); if (d > 0) { const p = i / 4, px = p % x.w, py = (p / x.w) | 0; const k = Math.floor(px / 100) + ',' + Math.floor(py / 100); grid[k] = (grid[k] || 0) + 1; bx0 = Math.min(bx0, px); by0 = Math.min(by0, py); bx1 = Math.max(bx1, px); by1 = Math.max(by1, py); } }
  return { w: x.w, h: x.h, diffPixels: diff, maxChannelDelta: maxd, bbox: [bx0, by0, bx1, by1], grid100: grid };
}, [fs.readFileSync(a).toString('base64'), fs.readFileSync(b).toString('base64')]);
console.log(JSON.stringify(r)); await browser.close();
