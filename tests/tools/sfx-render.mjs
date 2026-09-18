// A3 S1（2026-09-18）：音效離線渲染治具——凍結 #3「四種差別」的機械閘＋ #5 的逐支基準。
// headless Chromium 載 assets/audio/sfx.js，用它自己的 YS_SFX.render()（OfflineAudioContext，mono 44100）
// 把每支音渲染成取樣，回 Node 量三特徵：
//   effMs      有效時長：10ms 視窗 RMS ≥ −40 dBFS 的首尾跨度（ms）
//   centroidHz 頻譜質心：有效跨度內 2048 點 Hann 幀（hop 1024）的功率譜，Σf·P／ΣP 跨幀累加（響的幀權重大）
//   peakDb     峰值：max|x| 的 dBFS
// 另附 rmsDb（有效跨度整段 RMS）與每支 VOICES 函式原始碼的 md5（凍結 #5「未點名的一支參數不動」用）。
//
// 用法：
//   node tests/tools/sfx-render.mjs [--out=<json>] [--names=a,b,...] [--rnd=0.5] [--sec=4]
//                                   [--new=chip,seal,reveal,curse] [--gate]
//   --new   指定「新音」集合：跑凍結 #3 的兩兩比對（新音互比＋每支對其餘既有支逐一比），印表。
//   --gate  有 --new 時，閘門不過就 exit 1（S2 用；S1 只跑既有 12 支不帶 --gate）。
//   --rnd   固定 0.5（凍結 #3 口徑）；--sec 每支渲染秒數（wind 是 8 秒循環音，固定另加到 9 秒）。
// 任何 console error／pageerror → exit 1（S1 退出條件「0 console error」）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SFX_PATH = path.join(ROOT, 'assets/audio/sfx.js');
const SR = 44100;

/* ---------- 特徵（純函式，可被測試 import） ---------- */
const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);

export const METHOD = {
  sampleRate: SR, channels: 1,
  effMs: 'RMS over 10 ms windows (441 samples, no overlap); span from first to last window with RMS >= -40 dBFS',
  centroidHz: 'sum over frames (N=2048 Hann, hop=1024, within effective span) of sum_k f_k*P_k / sum_k P_k; P = |FFT|^2',
  peakDb: '20*log10(max|x|)',
  rmsDb: '20*log10(RMS of the effective span)',
  gate: 'pair passes if max/min effMs >= 1.5 or max/min centroidHz >= 2; peakDb of each new voice within [min,max] of existing voices',
};

function fft(re, im) { // in-place radix-2, length must be power of 2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

export function features(samples, sr = SR) {
  const x = samples instanceof Float32Array ? samples : Float32Array.from(samples);
  let peak = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; }
  const win = Math.round(sr * 0.01), nWin = Math.floor(x.length / win);
  let first = -1, last = -1;
  for (let w = 0; w < nWin; w++) {
    let s = 0;
    for (let i = w * win; i < (w + 1) * win; i++) s += x[i] * x[i];
    if (db(Math.sqrt(s / win)) >= -40) { if (first < 0) first = w; last = w; }
  }
  if (first < 0) return { effMs: 0, centroidHz: 0, peakDb: db(peak), rmsDb: -Infinity };
  const a = first * win, b = Math.min(x.length, (last + 1) * win);
  let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i];
  const rmsDb = db(Math.sqrt(s / (b - a)));
  const N = 2048, hop = 1024, re = new Float64Array(N), im = new Float64Array(N);
  let num = 0, den = 0;
  for (let start = a; start < b; start += hop) {
    for (let k = 0; k < N; k++) {
      const idx = start + k;
      re[k] = idx < b ? x[idx] * (0.5 - 0.5 * Math.cos(2 * Math.PI * k / (N - 1))) : 0;
      im[k] = 0;
    }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; num += (k * sr / N) * p; den += p; }
  }
  return { effMs: Math.round((b - a) / sr * 1000), centroidHz: den > 0 ? Math.round(num / den) : 0, peakDb: +db(peak).toFixed(2), rmsDb: +rmsDb.toFixed(2) };
}

/* 凍結 #3：兩兩比對。newNames 互比＋每支 new 對每支 existing 逐一比。 */
export function gate(voices, newNames) {
  const byName = Object.fromEntries(voices.map((v) => [v.name, v]));
  const existing = voices.filter((v) => !newNames.includes(v.name));
  const ratio = (p, q) => (p > 0 && q > 0 ? Math.max(p, q) / Math.min(p, q) : Infinity);
  const cmp = (a, b) => {
    const A = byName[a], B = byName[b];
    const durR = ratio(A.effMs, B.effMs), cenR = ratio(A.centroidHz, B.centroidHz);
    return { a, b, durRatio: +durR.toFixed(2), centRatio: +cenR.toFixed(2), pass: durR >= 1.5 || cenR >= 2 };
  };
  const pairs = [];
  for (let i = 0; i < newNames.length; i++) for (let j = i + 1; j < newNames.length; j++) pairs.push({ kind: 'new-new', ...cmp(newNames[i], newNames[j]) });
  for (const n of newNames) for (const e of existing) pairs.push({ kind: 'new-existing', ...cmp(n, e.name) });
  const peaks = existing.map((v) => v.peakDb), pkMin = Math.min(...peaks), pkMax = Math.max(...peaks);
  const peakChecks = newNames.map((n) => ({ name: n, peakDb: byName[n].peakDb, min: pkMin, max: pkMax, pass: byName[n].peakDb >= pkMin && byName[n].peakDb <= pkMax }));
  const pass = pairs.every((p) => p.pass) && peakChecks.every((p) => p.pass);
  return { newNames, pairs, peakChecks, pass };
}

/* VOICES 逐支函式原始碼 md5（括號配對切出 `name(ctx, …) { … }`）。 */
export function voiceSources(src) {
  const start = src.indexOf('const VOICES = {'); if (start < 0) return {};
  const out = {}; let i = start + 'const VOICES = {'.length;
  const re = /\s*(?:\/\*[\s\S]*?\*\/\s*)*([a-zA-Z_]\w*)\s*\(/y;
  for (;;) {
    re.lastIndex = i; const m = re.exec(src); if (!m) break;
    const name = m[1]; let j = src.indexOf('{', re.lastIndex); // 跳過參數列
    let depth = 0, k = j;
    for (; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (depth === 0) break; } }
    out[name] = crypto.createHash('md5').update(src.slice(m.index + m[0].length - name.length - 1, k + 1).trim()).digest('hex');
    i = k + 1; if (src[i] === ',') i++;
    if (/^\s*};/.test(src.slice(i))) break;
  }
  return out;
}

/* ---------- CLI ---------- */
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (k, d) => { const a = process.argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const has = (k) => process.argv.includes(`--${k}`);
  const rnd = parseFloat(arg('rnd', '0.5')), sec = parseFloat(arg('sec', '4'));
  const only = arg('names', '') ? arg('names').split(',') : null;
  const newNames = arg('new', '') ? arg('new').split(',') : null;
  const out = arg('out', '');

  const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
  const { chromium } = req('playwright');
  const src = fs.readFileSync(SFX_PATH, 'utf8');
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(pathToFileURL(path.join(ROOT, 'tests/tools/sfx-board.html')).href + '?quiet=1');
  const names = await page.evaluate(() => window.YS_SFX.names);
  const list = only || names;
  const fnMd5 = voiceSources(src);
  const voices = [];
  for (const name of list) {
    if (!names.includes(name)) { errors.push('no voice: ' + name); continue; }
    const s = name === 'wind' ? Math.max(sec, 9) : sec;
    const samples = await page.evaluate(([n, r, s]) => window.YS_SFX.render(n, { rnd: r, sec: s }).then((buf) => Array.from(buf.getChannelData(0))), [name, rnd, s]);
    const f = features(samples);
    voices.push({ name, sec: s, ...f, fnMd5: fnMd5[name] || null });
    console.log(`${name.padEnd(9)} eff ${String(f.effMs).padStart(5)} ms  centroid ${String(f.centroidHz).padStart(5)} Hz  peak ${f.peakDb} dBFS  rms ${f.rmsDb} dBFS`);
  }
  await browser.close();
  let g = null;
  if (newNames) {
    g = gate(voices, newNames);
    for (const p of g.pairs) console.log(`  ${p.kind.padEnd(12)} ${p.a}/${p.b}: dur×${p.durRatio} cent×${p.centRatio} ${p.pass ? 'ok' : 'FAIL'}`);
    for (const p of g.peakChecks) console.log(`  peak ${p.name} ${p.peakDb} in [${p.min}, ${p.max}] ${p.pass ? 'ok' : 'FAIL'}`);
    console.log(`GATE(#3) ${g.pass ? 'PASS' : 'FAIL'} — ${g.pairs.filter((p) => p.pass).length}/${g.pairs.length} pairs, peak ${g.peakChecks.filter((p) => p.pass).length}/${g.peakChecks.length}`);
  }
  const result = { at: new Date().toISOString(), sfxMd5: crypto.createHash('md5').update(src).digest('hex'), rnd, method: METHOD, voices, gate: g, errors };
  if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2)); console.log('wrote ' + out); }
  if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  if (has('gate') && g && !g.pass) process.exit(1);
}
