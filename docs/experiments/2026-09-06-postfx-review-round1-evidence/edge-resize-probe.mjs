// 覆審探針：bloom.setSize() 在「尺寸沒變」時仍 depthTex.dispose()，之後 tDepth 是否還是
// FBO 上那張深度貼圖。做法照 edge-shot.mjs：同一頁同一幀連拍，只在中間插一次 setSize。
//   ① setEdge(false) → render → read  = off
//   ② setEdge(true)  → render → read  = onBefore
//   ③ bloom.setSize(同尺寸) → render → read = onAfterSame
//   ④ bloom.setSize(不同尺寸) → 還原 → render → read = onAfterRealResize
// 期望（沒 bug）：diff(off,onBefore) ≈ diff(off,onAfterSame) ≈ diff(off,onAfterRealResize)
// 若 onAfterSame 的差異塌到 ~0 → 邊緣線在一次「同尺寸 resize」後靜默消失。
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
const port = Number(opt.port || 8891);
const W = Number(opt.w || 844), H = Number(opt.h || 390), DSF = Number(opt.dsf || 2), N = Number(opt.n || 3);

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
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

        B.setEdge(false); B.render(Y3.scene, Y3.camera); const off = read();
        B.setEdge(true); B.render(Y3.scene, Y3.camera); const onBefore = read();
        // ③ 同尺寸再 setSize 一次（＝一個 innerWidth/innerHeight 沒變的 resize 事件）
        B.setSize(iw, ih); B.render(Y3.scene, Y3.camera); const onAfterSame = read();
        // ④ 真的換尺寸再換回來
        B.setSize(iw - 20, ih); B.render(Y3.scene, Y3.camera);
        B.setSize(iw, ih); B.render(Y3.scene, Y3.camera); const onAfterReal = read();
        // ⑤ 再 render 一次，看是不是只有第一幀壞
        B.render(Y3.scene, Y3.camera); const onAfterReal2 = read();

        return {
          w, h, total: w * h, iw, ih,
          edgePxBefore: diff(off, onBefore),
          edgePxAfterSameSize: diff(off, onAfterSame),
          edgePxAfterRealResize: diff(off, onAfterReal),
          edgePxAfterRealResize2: diff(off, onAfterReal2),
          edgeReady: Y3.edgeReady, edgeOn: Y3.edgeOn, crowded: Y3.crowded, bloomOn: Y3.bloomOn, gl: Y3.glName,
          figs: Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B')).filter((f) => f.group.visible).length,
        };
      }, { heavy: HEAVY, fac: FAC, N });
    },
  });
  const pct = (c) => res ? +(100 * c / res.total).toFixed(3) : null;
  const summary = res && {
    px: `${res.w}x${res.h}`, figsVisible: res.figs, gl: res.gl, edgeReady: res.edgeReady, edgeOn: res.edgeOn, crowded: res.crowded,
    pctBefore: pct(res.edgePxBefore), pctAfterSameSize: pct(res.edgePxAfterSameSize),
    pctAfterRealResize: pct(res.edgePxAfterRealResize), pctAfterRealResize2: pct(res.edgePxAfterRealResize2),
    raw: { before: res.edgePxBefore, afterSame: res.edgePxAfterSameSize, afterReal: res.edgePxAfterRealResize, afterReal2: res.edgePxAfterRealResize2 },
  };
  if (out) fs.writeFileSync(out, JSON.stringify({ res: null, summary, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ summary, errors: r.errors.slice(0, 5) }, null, 1));
  await browser.close();
} finally { srv.kill(); }
