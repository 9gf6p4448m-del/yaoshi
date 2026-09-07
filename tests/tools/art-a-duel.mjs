/* 美術甲卷 A4（2026-09-07；判準二版）：對決機位下「遠景剪影不得擋到人形」的機械判定＋對決截圖。
   跑法：node tests/tools/art-a-duel.mjs <png 前綴> [--port=8971] [--root=<靜態根目錄>] [--duels=2]

   ## 判準為什麼從 2D 包圍盒換成深度（記 `02 §2.1`；原標準錯在哪、為什麼現在才知道）
   一版用「人形 2D 包圍盒與 far-* 2D 包圍盒不得相交」。**那個判準量的是「有沒有畫在同一塊螢幕
   區域」，不是「有沒有擋住」**——遠景在人形後面時，兩者本來就會在螢幕上重疊，但誰也沒被擋到。
   照那個判準做，唯一過得了的實作是「把遠景整組藏起來」，而那是把判準搬淺、不是把問題解掉。
   覆審實測攤開了這件事：對決機位下 min(剪影距相機)=9.30 > max(人形距相機)=4.93，每一尊都在
   剪影前面——遮擋根本不存在。二版判準因此改成深度式：

     pass = (far-* 全部 visible) 且 min(剪影頂點距相機) > max(人形頂點距相機)

   **左半邊那個條件是刻意留的紅燈**：把遠景整組 `visible=false` 時這條**必須紅**。所以本檔的
   包圍盒計算**不再做 `shown()` 短路**（短路會讓隱藏的物件回 null、右半邊條件空手通過）；
   可見性單獨當成一個要件檢查。取樣時機＝**每場對決結束**（`ys:duel-end`），人形站位已定。

   ## 一併回報但不當判準
   2D 包圍盒的重疊數仍然算給人看（`overlaps2d`），純資訊——它在剪影保留時本來就會 > 0。 */
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

/* 頁面端取樣器：在任何 script 之前掛上（addInitScript），每場 ys:duel-end 記一筆。
   距離＝頂點世界座標到相機位置的歐氏距離（不是 NDC z，NDC z 非線性、跨物件不好比）。 */
const SAMPLER = `(() => {
  const A = window.__artA = { samples: [] };
  const dist = (root, mode) => {
    const Y3 = window.__yaoshi3d; if (!Y3 || !root) return null;
    const cam = Y3.camera; const V3 = cam.position.constructor; const tmp = new V3();
    let best = mode === 'min' ? Infinity : -Infinity; let seen = 0;
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;               // 刻意不看 o.visible：可見性是另一個要件
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox; if (!b) return;
      for (let i = 0; i < 8; i++) {
        tmp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        tmp.applyMatrix4(o.matrixWorld);
        const d = tmp.distanceTo(cam.position);
        seen++;
        if (mode === 'min') { if (d < best) best = d; } else if (d > best) best = d;
      }
    });
    return seen ? best : null;
  };
  const ndcBox = (root) => {
    const Y3 = window.__yaoshi3d; if (!Y3 || !root) return null;
    const cam = Y3.camera; const V3 = cam.position.constructor; const tmp = new V3();
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, any = false;
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox; if (!b) return;
      for (let i = 0; i < 8; i++) {
        tmp.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z);
        tmp.applyMatrix4(o.matrixWorld); tmp.project(cam);
        if (tmp.z < -1 || tmp.z > 1) continue;
        any = true;
        if (tmp.x < minx) minx = tmp.x; if (tmp.x > maxx) maxx = tmp.x;
        if (tmp.y < miny) miny = tmp.y; if (tmp.y > maxy) maxy = tmp.y;
      }
    });
    return any ? { minx: +minx.toFixed(4), miny: +miny.toFixed(4), maxx: +maxx.toFixed(4), maxy: +maxy.toFixed(4) } : null;
  };
  const overlap = (a, b) => !!a && !!b && a.minx < b.maxx && b.minx < a.maxx && a.miny < b.maxy && b.miny < a.maxy;
  const take = (tag) => {
    const Y3 = window.__yaoshi3d; if (!Y3) return;
    const fars = []; Y3.scene.traverse((o) => { if (o.name && o.name.indexOf('far-') === 0) fars.push(o); });
    const D = Y3.duelFigures; const figs = [];
    for (const side of ['A', 'B']) {
      const list = (D && D.figuresOf) ? D.figuresOf(side) : [];
      for (const f of list) { const node = f && f.group; if (node) figs.push({ side, node }); }
    }
    let minFar = Infinity, maxFig = -Infinity, farVisible = 0;
    const farRows = [];
    for (const o of fars) {
      const d = dist(o, 'min');
      let vis = true; for (let n = o; n; n = n.parent) if (!n.visible) { vis = false; break; }
      if (vis) farVisible++;
      if (d != null && d < minFar) minFar = d;
      farRows.push({ name: o.name, visible: vis, minDist: d == null ? null : +d.toFixed(3), box: ndcBox(o) });
    }
    const figRows = [];
    for (const f of figs) {
      const d = dist(f.node, 'max');
      if (d != null && d > maxFig) maxFig = d;
      figRows.push({ side: f.side, maxDist: d == null ? null : +d.toFixed(3), box: ndcBox(f.node) });
    }
    let overlaps2d = 0;
    for (const fr of farRows) for (const fg of figRows) if (overlap(fr.box, fg.box)) overlaps2d++;
    const opacity = (() => { try { return +Y3.far.children[0].material.opacity.toFixed(3); } catch (e) { return null; } })();
    A.samples.push({ tag, t: Date.now(), farCount: fars.length, farVisible, figures: figs.length,
      minFarDist: minFar === Infinity ? null : +minFar.toFixed(3), maxFigDist: maxFig === -Infinity ? null : +maxFig.toFixed(3),
      depthPass: fars.length >= 3 && farVisible === fars.length && minFar > maxFig,
      overlaps2d, farOpacity: opacity, farGroupVisible: (() => { try { return !!Y3.far.visible; } catch (e) { return null; } })(),
      cam: (() => { const c = Y3.camera.position; return { x: +c.x.toFixed(3), y: +c.y.toFixed(3), z: +c.z.toFixed(3) }; })(),
      farRows, figRows });
  };
  document.addEventListener('ys:duel-end', () => take('duel-end'));
  window.__artATake = take; // 治具也可以現場叫一次（除錯用）
})()`;

const shots = [];
const srv = await serve(SRC_ROOT, PORT);
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await page.addInitScript(SAMPLER);
  // --seed=N：帶 ?fxcount=1&seed=N（index.html:3567 的治具鉤），基準版與新版才會玩到**同一場**對決，
  // 截圖才是同場景對照（覆審 MEDIUM-2：一版拿兩場不同的對決並排，比的是內容不是渲染）。
  const url = `http://127.0.0.1:${PORT}/index.html?paperwar=1` + (opt.seed ? `&fxcount=1&seed=${opt.seed}` : '');
  const r = await drive(page, url, {
    duels: Number(opt.duels || 2),
    onDuel: async (pg, n) => {
      await pg.waitForTimeout(1400);
      const f = `${OUT}-duel${n}.png`; await pg.screenshot({ path: f }); shots.push(f);
      // --bloomprobe：同一幀把 bloom 強度切 0 再拍一張。兩張的差異＝「光暈到底畫了多少」。
      // 覆審在 threshold 0.9 時量到整張只差 0.022/255（＝光暈實質消失），這支就是拿來重驗門檻的。
      if (opt.bloomprobe && n === 1) {
        await pg.evaluate(() => { window.__yaoshi3d.bloom.setStrength(0); });
        await pg.waitForTimeout(260);
        const f0 = `${OUT}-duel${n}-bloom0.png`; await pg.screenshot({ path: f0 }); shots.push(f0);
        await pg.evaluate(() => { window.__yaoshi3d.bloom.setStrength(1.05); });
        await pg.waitForTimeout(260);
      }
    },
  });
  const samples = await page.evaluate(() => (window.__artA ? window.__artA.samples : []));
  await browser.close();
  fs.writeFileSync(OUT + '-a4.json', JSON.stringify({ samples, errors: r.errors }, null, 1));
  const bad = samples.filter((s) => !s.depthPass);
  console.log(JSON.stringify({
    json: OUT + '-a4.json', shots, duelEnds: samples.length,
    depthPassAll: samples.length > 0 && bad.length === 0,
    minFarDist: samples.map((s) => s.minFarDist),
    maxFigDist: samples.map((s) => s.maxFigDist),
    farVisible: samples.map((s) => `${s.farVisible}/${s.farCount}`),
    farOpacity: samples.map((s) => s.farOpacity),
    overlaps2dInfoOnly: samples.map((s) => s.overlaps2d),
    figures: samples.map((s) => s.figures),
    errors: r.errors.length,
  }, null, 1));
  if (r.errors.length) console.log(r.errors.slice(0, 8).join('\n'));
  process.exit(r.errors.length === 0 && samples.length > 0 && bad.length === 0 ? 0 : 1);
} finally { srv.kill(); }
