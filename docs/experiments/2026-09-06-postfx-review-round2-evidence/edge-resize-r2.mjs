// 第 2 輪覆審探針（H-2）：bloom.setSize 的深度貼圖重建。作者只驗了「同尺寸／真換尺寸」兩種，
// 本探針另外驗 dpr 變化（renderer.setPixelRatio 後再 setSize）、連續多次同尺寸、
// 以及 sceneRT.width 的**單位**是不是 framebuffer 像素（＝與 fw 同一把尺）。
// 量法照 edge-resize-probe.mjs：同一頁同一幀連拍，只在中間插入 setSize。
// 用法：node docs/experiments/2026-09-06-postfx-review-round2-evidence/edge-resize-r2.mjs <out.json> [--port=8904] [--n=3]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const HEAVY = ['fushou', 'ashcharm', 'wangchuan', 'boartusk', 'shanshen', 'balen', 'yinyangcoin', 'boat'];
const FAC = { fushou: 'xianghuo', ashcharm: 'xianghuo', wangchuan: 'xianghuo', boartusk: 'zuling', shanshen: 'zuling', balen: 'zuling', yinyangcoin: 'yinqi', boat: 'zuling' };

const { pos, opt } = parseArgs(process.argv.slice(2));
const [out] = pos;
const port = Number(opt.port || 8904);
const W = Number(opt.w || 844), H = Number(opt.h || 390), DSF = Number(opt.dsf || 2), N = Number(opt.n || 3);

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  // 鑑別力用：把 js/bloom.js 換成修復前那一版（--bloom=<path>），這組證據必須變紅
  if (opt.bloom) {
    const body = fs.readFileSync(path.resolve(opt.bloom), 'utf8');
    await page.route('**/js/bloom.js*', (rt) => rt.fulfill({ status: 200, contentType: 'text/javascript', body }));
  }
  let res = null;
  const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
    duels: 1,
    onDuel: async (pg, n) => {
      if (n !== 1) return;
      res = await pg.evaluate(async ({ heavy, fac, N }) => {
        const Y3 = window.__yaoshi3d;
        const cur = window.__rec.duels[window.__rec.duels.length - 1];
        const units = () => heavy.slice(0, N).map((ab, i) => ({ id: i, body: 'elite', fac: fac[ab], ab }));
        const others = [0, 1, 2, 3].filter((s) => s !== cur.a && s !== cur.b);
        document.addEventListener('ys:fx-burn', (ev) => ev.stopImmediatePropagation(), true);
        const det = { a: others[0], b: others[1], armies: [{ units: units() }, { units: units() }] };
        document.dispatchEvent(new CustomEvent('ys:duel', { detail: det }));
        await det.ready;
        await new Promise((r) => setTimeout(r, 1600));

        const gl = Y3.renderer.getContext();
        const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const read = () => { const b = new Uint8Array(w * h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
        const diff = (a, b) => { let d8 = 0; for (let i = 0; i < a.length; i += 4) { const m = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (m > 8) d8++; } return d8; };
        const B = Y3.bloom;
        const iw = window.innerWidth, ih = window.innerHeight;
        const R = Y3.renderer;
        const shot = (tag) => { B.render(Y3.scene, Y3.camera); return read(); };

        B.setEdge(false); const off = shot('off');
        B.setEdge(true); const onBefore = shot('before');
        // ① 同尺寸 setSize 連三次
        B.setSize(iw, ih); B.setSize(iw, ih); B.setSize(iw, ih);
        const onSame3 = shot('same3');
        // ② 真換尺寸再換回來
        B.setSize(iw - 20, ih); B.render(Y3.scene, Y3.camera);
        B.setSize(iw, ih); const onReal = shot('real');
        // ③ dpr 變化：renderer.setPixelRatio 後再 setSize（同樣的 CSS 尺寸，framebuffer 尺寸變了）
        const dpr0 = R.getPixelRatio();
        R.setPixelRatio(1); R.setSize(iw, ih); B.setSize(iw, ih); B.render(Y3.scene, Y3.camera);
        const midDpr = { rendererPR: R.getPixelRatio(), sceneRTw: Y3.bloom.cfg && null };
        R.setPixelRatio(dpr0); R.setSize(iw, ih); B.setSize(iw, ih);
        const onDpr = shot('dpr');
        // ④ dpr 變化後再來一次同尺寸 setSize
        B.setSize(iw, ih); const onDprSame = shot('dprSame');

        return {
          w, h, total: w * h, iw, ih, dpr0,
          edgePxBefore: diff(off, onBefore),
          edgePxSame3: diff(off, onSame3),
          edgePxReal: diff(off, onReal),
          edgePxAfterDpr: diff(off, onDpr),
          edgePxAfterDprSame: diff(off, onDprSame),
          edgeReady: Y3.edgeReady, edgeOn: Y3.edgeOn, crowded: Y3.crowded, bloomOn: Y3.bloomOn, gl: Y3.glName,
          figs: Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B')).filter((f) => f.group.visible).length,
        };
      }, { heavy: HEAVY, fac: FAC, N });
    },
  });
  const pct = (c) => res ? +(100 * c / res.total).toFixed(3) : null;
  const summary = res && {
    px: `${res.w}x${res.h}`, dpr0: res.dpr0, figsVisible: res.figs, gl: res.gl,
    edgeReady: res.edgeReady, edgeOn: res.edgeOn, crowded: res.crowded,
    pctBefore: pct(res.edgePxBefore), pctAfterSameSizeX3: pct(res.edgePxSame3),
    pctAfterRealResize: pct(res.edgePxReal), pctAfterDprChange: pct(res.edgePxAfterDpr),
    pctAfterDprThenSameSize: pct(res.edgePxAfterDprSame),
    raw: { before: res.edgePxBefore, same3: res.edgePxSame3, real: res.edgePxReal, dpr: res.edgePxAfterDpr, dprSame: res.edgePxAfterDprSame },
  };
  if (out) fs.writeFileSync(out, JSON.stringify({ summary, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ summary, errors: r.errors.slice(0, 5) }, null, 1));
  await browser.close();
} finally { srv.kill(); }
