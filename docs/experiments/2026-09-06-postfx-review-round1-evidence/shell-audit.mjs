// 覆審探針：外殼與 ghost_* 的分組實況（OUTLINE_SKIP_MAT 到底有沒有被用到）＋燒毀同步。
// 直接 import js/creature-figures.js，不經對決流程。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const req = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'));
const { chromium } = req('playwright');

const ABS = ['redhat', 'raincoat', 'hairpin', 'chair', 'buoy', 'guoyin', 'boartusk', 'sword'];

const HARNESS = `
import * as THREE from 'three';
import { makeCreatureFigure, creatureGlbUrl } from '/js/creature-figures.js';
window.__audit = async (abs) => {
  const out = [];
  for (const ab of abs) {
    const f = makeCreatureFigure({ glbUrl: creatureGlbUrl(ab, '/assets/creatures/'), ab, faction: 'yinqi' });
    try { await f.loaded(); } catch (e) { out.push({ ab, err: String(e) }); continue; }
    const model = f.group.children.find((o) => { let hit = false; o.traverse((c) => { if (c.isBone || c.isSkinnedMesh) hit = true; }); return hit; });
    const bodies = [], shells = [];
    model.traverse((o) => { if (o.isMesh) (o.name === 'outline' ? shells : bodies).push(o); });
    const isGhost = (m) => /^ghost_/i.test((m && m.name) || '');
    const cls = bodies.map((o) => {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const g = mats.filter(isGhost).length;
      return { name: o.name, mats: mats.length, ghostMats: g, kind: g === 0 ? 'none' : (g === mats.length ? 'allGhost' : 'MIXED') };
    });
    // 燒毀同步：把 dissolve 推到底看外殼跟不跟
    const shellMat = shells.length ? (Array.isArray(shells[0].material) ? shells[0].material[0] : shells[0].material) : null;
    const before = shells.map((s) => s.visible);
    let burned = false;
    f.burn({ ms: 200 }).then(() => { burned = true; });
    for (let i = 0; i < 240 && !burned; i++) { await new Promise((r) => requestAnimationFrame(r)); f.update(1 / 60); }
    const afterVis = shells.map((s) => s.visible);
    const burnDone = burned;
    f.reset();
    const resetVis = shells.map((s) => s.visible);
    out.push({
      ab, bodyMeshes: bodies.length, shells: shells.length,
      classes: cls,
      mixedMeshes: cls.filter((c) => c.kind === 'MIXED').length,
      allGhostMeshes: cls.filter((c) => c.kind === 'allGhost').length,
      shellsAllVisibleBefore: before.every(Boolean),
      burnDone, shellDissolve: shellMat && shellMat.userData ? null : null, shellsAllHiddenAfterBurn: afterVis.length ? afterVis.every((v) => v === false) : null,
      shellsVisibleAfterReset: resetVis.length ? resetVis.every(Boolean) : null,
      shellMatIsSkip: shellMat ? shellMat.colorWrite === false : null,
      shellSide: shellMat ? shellMat.side : null,
    });
    f.dispose();
  }
  return out;
};
window.__auditReady = true;
`;

const port = Number(process.argv[3] || 8892);
const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
try {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tests/tools/cam-unit.html`, { waitUntil: 'load' });
  await page.addScriptTag({ type: 'module', content: HARNESS });
  await page.waitForFunction(() => !!window.__auditReady, null, { timeout: 20000 });
  const out = await page.evaluate((abs) => window.__audit(abs), ABS);
  console.log(JSON.stringify({ out, errors: errs.slice(0, 6) }, null, 1));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ out, errors: errs }, null, 1));
  await browser.close();
} finally { srv.kill(); }
