// 極簡 PNG 解碼器（v0.59.2 法寶鑑賞頁驗收用）：只吃 8-bit、非交錯、色彩型態 2(RGB)/6(RGBA) 的 PNG
// （Playwright page.screenshot() 輸出的格式），回傳 {width,height,data:Uint8Array(RGBA)}。
// 不依賴任何第三方套件（repo 沒有 pngjs/sharp），只用 node 內建 zlib 做 inflate。
import zlib from 'node:zlib';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePNG(buf) {
  if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error('not a PNG');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); pos += 4;
    const type = buf.toString('ascii', pos, pos + 4); pos += 4;
    const data = buf.subarray(pos, pos + len); pos += len;
    pos += 4; // CRC
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
  }
  if (bitDepth !== 8) throw new Error('only 8-bit PNG supported, got ' + bitDepth);
  if (interlace !== 0) throw new Error('interlaced PNG not supported');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : (() => { throw new Error('unsupported colorType ' + colorType); })();
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let prevRow = new Uint8Array(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const row = raw.subarray(p, p + stride); p += stride;
    const cur = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const bpp = channels;
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prevRow[x];
      const c = x >= bpp ? prevRow[x - bpp] : 0;
      let v = row[x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) v = (v + paeth(a, b, c)) & 0xff;
      cur[x] = v;
    }
    for (let x = 0; x < width; x++) {
      const si = x * channels, di = (y * width + x) * 4;
      if (channels === 4) { out[di] = cur[si]; out[di + 1] = cur[si + 1]; out[di + 2] = cur[si + 2]; out[di + 3] = cur[si + 3]; }
      else if (channels === 3) { out[di] = cur[si]; out[di + 1] = cur[si + 1]; out[di + 2] = cur[si + 2]; out[di + 3] = 255; }
      else { out[di] = out[di + 1] = out[di + 2] = cur[si]; out[di + 3] = 255; }
    }
    prevRow = cur;
  }
  return { width, height, data: out };
}

/** 一個矩形區域（CSS px＝螢幕 px，因為治具一律 deviceScaleFactor:1）的平均亮度（0..255，簡單 RGB 均值）。
 *  排除清單 exclude=[{left,top,right,bottom},...] 內的像素不計入。回傳 null＝矩形整個被排除或超出畫面。 */
export function avgBrightness(img, rect, exclude = []) {
  const x0 = Math.max(0, Math.floor(rect.left)), y0 = Math.max(0, Math.floor(rect.top));
  const x1 = Math.min(img.width, Math.ceil(rect.right)), y1 = Math.min(img.height, Math.ceil(rect.bottom));
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (exclude.some(e => x >= e.left && x < e.right && y >= e.top && y < e.bottom)) continue;
      const i = (y * img.width + x) * 4;
      sum += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
      n++;
    }
  }
  return n ? sum / n : null;
}
