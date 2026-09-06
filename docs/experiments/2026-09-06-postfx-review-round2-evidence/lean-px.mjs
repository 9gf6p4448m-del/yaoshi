// 第 2 輪覆審探針（M-2 後續）：LEAN.dist 改 0 之後，lean 在螢幕上還看得出來嗎？
// 量法：真實頁面、真實相機。對決中先記下場上每尊 3D 妖與幾個桌面參考點投影到螢幕的像素位置，
//       派一發 ys:fx-trait，等一幀（lean 上升沿是瞬間滿幅）再記一次，取像素位移。
// 同時輸出 v0.35 之前的假想值（LEAN.dist=-0.3 那一版的 dist 位移貢獻）供對照。
// 用法：node docs/experiments/2026-09-06-postfx-review-round2-evidence/lean-px.mjs <out.json> [--port=8905]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve, parseArgs } from '../../../tests/tools/duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const [out] = pos;
const port = Number(opt.port || 8905);
const W = Number(opt.w || 844), H = Number(opt.h || 390), DSF = Number(opt.dsf || 2);

const srv = await serve(ROOT, port);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  let res = null;
  const r = await drive(page, `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1`, {
    duels: 1,
    onDuel: async (pg, n) => {
      if (n !== 1) return;
      res = await pg.evaluate(async () => {
        const Y3 = window.__yaoshi3d;
        await new Promise((r) => setTimeout(r, 2600)); // 等基座推進 700ms ＋ orbit 轉一段，機位穩定
        const THREE = Y3.scene.constructor;
        const cam = Y3.camera;
        const w = window.innerWidth, h = window.innerHeight;
        // 取樣點：兩側 3D 妖的位置（世界座標）＋ 桌面上幾個固定參考點
        const figs = Y3.duelFigures.figuresOf('A').concat(Y3.duelFigures.figuresOf('B')).filter((f) => f.group.visible);
        const pts = figs.map((f) => f.group.position.clone());
        for (const p of [[0, 0, 0], [0.8, 0, 0.8], [-0.8, 0, -0.8], [0.8, 0, -0.8], [-0.8, 0, 0.8]]) {
          pts.push(new (pts[0] ? pts[0].constructor : Object)(p[0], p[1], p[2]));
        }
        const project = () => pts.map((p) => { const v = p.clone().project(cam); return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h }; });
        const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const camPos = () => ({ x: cam.position.x, y: cam.position.y, z: cam.position.z, len: cam.position.length() });
        const before = project(); const c0 = camPos();
        document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { side: 'B', ms: 900 } }));
        await nextFrame();
        const after = project(); const c1 = camPos();
        const d = before.map((b, i) => Math.hypot(after[i].x - b.x, after[i].y - b.y));
        return {
          viewport: { w, h }, fov: cam.fov, aspect: cam.aspect, nFigs: figs.length, nPts: pts.length,
          camBefore: c0, camAfter: c1,
          camMove: Math.hypot(c1.x - c0.x, c1.y - c0.y, c1.z - c0.z),
          dLen: Math.abs(c1.len - c0.len),
          pxMin: +Math.min(...d).toFixed(2), pxMax: +Math.max(...d).toFixed(2),
          pxMed: +d.slice().sort((a, b) => a - b)[Math.floor(d.length / 2)].toFixed(2),
          pxPerPoint: d.map((x) => +x.toFixed(2)),
          // 對照：如果 LEAN.dist 還是 0.3（dolly 0.3 世界單位），桌心平面上的縮放位移約多少 px
          // halfH = tan(fov/2)*dist → 每 1 世界單位 dist 變化，桌心平面上 1 px 對應的世界尺寸變化比
          hypothetical_dist03_scalePct: +(100 * 0.3 / c0.len).toFixed(2),
        };
      });
    },
  });
  if (out) fs.writeFileSync(out, JSON.stringify({ res, errors: r.errors }, null, 1));
  console.log(JSON.stringify({ res, errors: r.errors.slice(0, 5) }, null, 1));
  await browser.close();
} finally { srv.kill(); }
