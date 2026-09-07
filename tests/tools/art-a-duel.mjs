/* 美術甲卷 A4（2026-09-07）：對決機位下「遠景剪影不得擋到人形」的機械判定＋對決截圖。
   跑法：node tests/tools/art-a-duel.mjs <png 前綴> [--port=8971] [--root=<靜態根目錄>] [--duels=2]
   做法：直接借 duel-drive.mjs 的 drive()（已驗過能穩定把一局玩到對決），用它的 onDuel 鉤子在對決現場
        ① 拍一張 844×390 的對決截圖 ② 算每尊人形與每個 name 以 `far-` 開頭的物件在螢幕空間（NDC）的 2D
        包圍盒，回報有沒有重疊。判定：overlaps 為空＝A4 的「不得擋人」通過。
   為什麼不放進 scene-shot.mjs：scene-shot 的點擊迴圈到不了對決（實測 20 次仍停在出價頁），
   對決要走 duel-drive 那套 driver。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { drive, serve, parseArgs } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const { pos, opt } = parseArgs(process.argv.slice(2));
const OUT = pos[0] || path.join(ROOT, 'art-a-duel');
const PORT = Number(opt.port || 8971);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;

/* 與 scene-shot.mjs --gate 同一套 NDC 包圍盒算法（同一份判準，兩支治具不得分岔）。 */
const PROBE = `(() => {
  const Y3 = window.__yaoshi3d; if (!Y3) return null;
  const cam = Y3.camera, scene = Y3.scene;
  const V3 = cam.position.constructor;
  const tmp = new V3();
  function ndcBox(root) {
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, any = false, clipped = 0, total = 0;
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox; if (!b) return;
      for (let i = 0; i < 8; i++) {
        tmp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        tmp.applyMatrix4(o.matrixWorld);
        tmp.project(cam);
        total++;
        if (tmp.z < -1 || tmp.z > 1) { clipped++; continue; }
        any = true;
        if (tmp.x < minx) minx = tmp.x; if (tmp.x > maxx) maxx = tmp.x;
        if (tmp.y < miny) miny = tmp.y; if (tmp.y > maxy) maxy = tmp.y;
      }
    });
    if (!any) return null;
    return { minx: +minx.toFixed(4), miny: +miny.toFixed(4), maxx: +maxx.toFixed(4), maxy: +maxy.toFixed(4), clipped, total };
  }
  const onScreen = (b) => !!b && b.maxx > -1 && b.minx < 1 && b.maxy > -1 && b.miny < 1;
  const overlap = (a, b) => !!a && !!b && a.minx < b.maxx && b.minx < a.maxx && a.miny < b.maxy && b.miny < a.maxy;
  const fars = [];
  scene.traverse((o) => { if (o.name && o.name.indexOf('far-') === 0) fars.push(o); });
  const D = Y3.duelFigures;
  const figs = [];
  for (const side of ['A', 'B']) {
    const list = (D && D.figuresOf) ? D.figuresOf(side) : [];
    for (const f of list) {
      const node = f && (f.group || f.root || f.obj || f.object3d || (f.isObject3D ? f : null));
      if (!node) continue;
      const b = ndcBox(node);
      if (b) figs.push({ side, box: b });
    }
  }
  const out = { figures: figs.length, figBoxes: figs, fars: [], overlaps: [],
    figKeys: (D && D.figuresOf && D.figuresOf('A')[0]) ? Object.keys(D.figuresOf('A')[0]).slice(0, 14) : [],
    cam: { x: +cam.position.x.toFixed(3), y: +cam.position.y.toFixed(3), z: +cam.position.z.toFixed(3) } };
  for (const o of fars) {
    const fb = ndcBox(o);
    out.fars.push({ name: o.name, visible: o.visible, box: fb, onScreen: onScreen(fb) });
    for (const f of figs) if (overlap(fb, f.box)) out.overlaps.push({ far: o.name, side: f.side, farBox: fb, figBox: f.box });
  }
  return out;
})()`;

const results = [];

const srv = await serve(SRC_ROOT, PORT);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const r = await drive(page, `http://127.0.0.1:${PORT}/index.html?paperwar=1`, {
    duels: Number(opt.duels || 2),
    onDuel: async (pg, n) => {
      await pg.waitForTimeout(1400);
      const file = `${OUT}-duel${n}.png`;
      await pg.screenshot({ path: file });
      const probe = await pg.evaluate(PROBE);
      results.push({ n, file, probe });
    },
  });
  await browser.close();
  const overlaps = results.flatMap((x) => (x.probe && x.probe.overlaps) || []);
  fs.writeFileSync(OUT + '-a4.json', JSON.stringify({ results, errors: r.errors }, null, 1));
  console.log(JSON.stringify({
    json: OUT + '-a4.json',
    shots: results.map((x) => x.file),
    duels: results.length,
    figures: results.map((x) => x.probe && x.probe.figures),
    farCount: results.map((x) => (x.probe && x.probe.fars.length) || 0),
    farOnScreen: results.map((x) => ((x.probe && x.probe.fars) || []).filter((f) => f.onScreen).length),
    overlaps: overlaps.length,
    overlapNames: overlaps.map((o) => o.far + '/' + o.side),
    figKeys: results[0] && results[0].probe && results[0].probe.figKeys,
    errors: r.errors.length,
  }, null, 1));
  if (r.errors.length) console.log(r.errors.slice(0, 8).join('\n'));
  process.exit(r.errors.length === 0 && overlaps.length === 0 ? 0 : 1);
} finally { srv.kill(); }
