// Synthetic full-roster camera capture on the real game renderer; never natural-hit evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve } from './duel-drive.mjs';
import { msOf } from './fx-consts.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const { chromium } = createRequire(new URL('../../tools/anyCreature/package.json', import.meta.url))('playwright');
const out = path.resolve(process.argv[2] || 'docs/experiments/2026-09-15-tier1-push');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 9642);
let browser;
const results = [];
try {
  browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  for (const viewport of [{ width: 852, height: 393 }, { width: 1280, height: 720 }]) {
    for (const mode of ['on', 'closeup0', 'reduced']) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
      const errors = []; page.on('pageerror', e => errors.push(String(e)));
      let captured = false;
      try {
        await drive(page, `http://127.0.0.1:9642/index.html?paperwar=1&fxcount=1&seed=7${mode === 'closeup0' ? '&closeup=0' : ''}`, {
          duels: 1,
          onDuel: async () => {
            await page.evaluate(async () => {
              const y = window.__yaoshi3d;
              const fire = document.dispatchEvent.bind(document);
              document.dispatchEvent = e => /^ys:/.test(e.type) ? true : fire(e);
              fire(new CustomEvent('ys:fx-trait-cancel'));
              const heavy = ['canri', 'dashiye', 'youyinggong', 'fushou', 'ashcharm', 'wangchuan', 'boartusk', 'shanshen'];
              const fac = ['zuling', 'xianghuo', 'yinqi', 'xianghuo', 'xianghuo', 'xianghuo', 'zuling', 'zuling'];
              const names = ['殘日', '大士爺', '有應公'];
              const units = side => heavy.map((ab, id) => ({ id, ab, body: 'elite', fac: fac[id], lg: side === 'A' && id < 3, sn: side === 'A' ? names[id] || '' : '' }));
              const det = { a: 0, b: 1, armies: [{ units: units('A') }, { units: units('B') }], maxFig: 8 };
              fire(new CustomEvent('ys:duel', { detail: det })); await det.ready;
              await new Promise(r => setTimeout(r, 2800));
              const raf = requestAnimationFrame; window.requestAnimationFrame = () => 0;
              await new Promise(r => raf(() => raf(r)));
              let now = performance.now(); performance.now = () => now;
              const render = () => { y.camera.updateMatrixWorld(); if (y.bloomOn) y.bloom.render(y.scene, y.camera); else y.renderer.render(y.scene, y.camera); };
              const label = document.createElement('div'); label.textContent = '合成滿編 8v8 · 僅驗鏡頭／裁切，非自然招式命中';
              label.style.cssText = 'position:fixed;bottom:4px;left:0;right:0;z-index:2147483647;text-align:center;background:#110b20;color:#eee;font:12px sans-serif;padding:4px;pointer-events:none';
              document.body.appendChild(label);
              window.__shortCapture = { fire, render, advance(ms) {
                document.getElementById('duelResult').textContent = '合成滿編 8v8 · 僅驗鏡頭與模型裁切';
                document.getElementById('duelSub').textContent = '非自然招式命中；底層 HUD 為進場時的遊玩狀態';
                const steps = Math.max(1, Math.round(ms / (1000 / 60)));
                for (let i = 0; i < steps; i++) { const dt = ms / steps; now += dt; y.director.update(dt / 1000, now); y.duelFigures.update(dt / 1000, now); }
                render();
              } };
              render();
            });
            const frames = [];
            for (const t of [0, msOf(1) / 2, msOf(1)]) {
              if (t === 0) await page.evaluate(ms => {
                // Same flag as pwTraitFx, using the actual page CLOSEUP_ON setting.
                window.__shortCapture.fire(new CustomEvent('ys:fx-trait', { detail: { side: 'A', tier: 1, ms, baseMs: window.__yaoshi.PW_FX.TIER_BASE_MS, shortPush: window.__yaoshi.PW_FX.CLOSEUP_ON, cinema: false } }));
                window.__shortCapture.advance(0);
              }, msOf(1));
              else await page.evaluate(ms => window.__shortCapture.advance(ms), msOf(1) / 2);
              const filename = `${viewport.width}x${viewport.height}-${mode}-${t}ms.png`;
              await page.screenshot({ path: path.join(out, filename) });
              const measure = await page.evaluate(async () => {
                const y = window.__yaoshi3d;
                const THREE = await import('three');
                const figs = y.duelFigures.figuresOf('A').concat(y.duelFigures.figuresOf('B'));
                const excluded = o => { for (let p = o; p && p !== y.scene; p = p.parent) if (/^(outline|faction-fx-|ground-|legend-)/.test(p.name || '')) return true; return false; };
                const rows = figs.map(f => {
                  f.group.updateWorldMatrix(true, true);
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity, vertices = 0;
                  f.group.traverse(o => {
                    if (!o.isMesh || !o.geometry || excluded(o)) return;
                    let visible = true; for (let p = o; p; p = p.parent) if (!p.visible) visible = false;
                    if (!visible) return;
                    const v = new THREE.Vector3();
                    for (let i = 0; i < o.geometry.attributes.position.count; i++) {
                      o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld).project(y.camera);
                      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z); vertices++;
                    }
                  });
                  return { ab: f.ab, vertices, minX, maxX, minY, maxY, minZ, maxZ, inside: vertices > 0 && minX >= -1 && maxX <= 1 && minY >= -1 && maxY <= 1 && minZ >= -1 && maxZ <= 1 };
                });
                const original = [], mats = [];
                figs.forEach((f, i) => {
                  const color = new THREE.Color().setRGB((40 + i * 11) / 255, 37 / 255, 223 / 255, THREE.SRGBColorSpace);
                  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false }); mats.push(mat);
                  f.group.traverse(o => { if (o.isMesh && !excluded(o)) { original.push([o, o.material]); o.material = mat; } });
                });
                y.renderer.render(y.scene, y.camera);
                const c = document.createElement('canvas'); c.width = y.renderer.domElement.width; c.height = y.renderer.domElement.height;
                const ctx = c.getContext('2d'); ctx.drawImage(y.renderer.domElement, 0, 0); const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
                const counts = figs.map(() => 0);
                for (let p = 0; p < pixels.length; p += 4) if (Math.abs(pixels[p + 1] - 37) <= 2 && Math.abs(pixels[p + 2] - 223) <= 2) {
                  const i = Math.round((pixels[p] - 40) / 11); if (i >= 0 && i < counts.length && Math.abs(pixels[p] - (40 + i * 11)) <= 2) counts[i]++;
                }
                for (const [o, mat] of original) o.material = mat; for (const m of mats) m.dispose();
                window.__shortCapture.render();
                return { distance: y.camera.position.length(), framingDistance: y.director.framingDistance(), k: y.director.shortPushK(), rows: rows.map((r, i) => ({ ...r, visiblePixels: counts[i] })), drawCalls: y.renderer.info.render.calls };
              });
              frames.push({ t, filename, ...measure });
            }
            results.push({ viewport, mode, synthetic: true, errors, frames });
            captured = true;
            throw new Error('CAPTURE_DONE');
          },
        });
      } catch (e) { if (e.message !== 'CAPTURE_DONE') throw e; }
      finally { await page.close(); }
      assert.ok(captured, `missing capture: ${viewport.width}x${viewport.height} ${mode}`);
    }
  }
  assert.equal(results.length, 6, 'six viewport/mode cases required');
  assert.equal(new Set(results.map(r => `${r.viewport.width}x${r.viewport.height}:${r.mode}`)).size, 6, 'each case must be unique');
  for (const r of results) assert.deepEqual(r.frames.map(f => f.t), [0, msOf(1) / 2, msOf(1)], 'three timed frames per case');
  fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(results, null, 2));
  const summary = results.map(r => ({ viewport: r.viewport, mode: r.mode, errors: r.errors, frames: r.frames.map(f => ({ t: f.t, distance: f.distance, k: f.k, figures: f.rows.length, inside: f.rows.filter(x => x.inside).length, visible: f.rows.filter(x => x.visiblePixels > 0).length })) }));
  console.log(JSON.stringify(summary, null, 2));
  if (results.some(r => r.errors.length || r.frames.some(f => {
    const expectedK = r.mode === 'on' && f.t === msOf(1) / 2 ? 1 : 0;
    return Math.abs(f.k - expectedK) > 1e-6 || Math.abs(f.distance - (4.2 - 0.1 * expectedK)) > 1e-6 ||
      f.rows.length !== 16 || f.rows.some(x => !x.inside || !x.visiblePixels);
  }))) process.exitCode = 1;
} finally { try { await browser?.close(); } finally { server.kill(); } }
