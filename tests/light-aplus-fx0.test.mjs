// v0.65.0 光影 A+ 驗收修訂 1 #2：`?fx=0` 的燈光清單（型別／數量／強度／位置／顏色／衰減）與渲染器旗標
// （shadowMap、toneMapping、曝光、色彩空間、環境圖）逐項等於 v0.64.0（ae92bf2a）。
// 基準快照 tests/light-aplus-v064-lights.json 是在 ae92bf2a 的樹上用本檔同一支探針實抓的
// （YAOSHI_RENDER_ROOT=<ae92bf2a 樹> YAOSHI_FX_QUERY= YAOSHI_SNAPSHOT_WRITE=1 node --test tests/light-aplus-fx0.test.mjs）。
// 燈籠每幀閃爍，所以燈籠比 userData.baseIntensity（閃爍的基準），其餘燈比 intensity。
// 這支測試的性質是「退回開關不得帶進任何新燈／陰影」的回歸守門：對 ae92bf2a 本來就綠；鑑別力靠突變（fx=0 仍建聚光／開陰影圖 ⇒ 紅），
// 見 docs/experiments/2026-10-08-light-aplus/README.md。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const QUERY = process.env.YAOSHI_FX_QUERY ?? '?fx=0';
const SNAP = path.join(ROOT, 'tests/light-aplus-v064-lights.json');
const PORT = 9745;

const PROBE = () => {
  const Y = window.__yaoshi3d, R = Y.renderer, r6 = (v) => Math.round(v * 1e6) / 1e6;
  const lights = [];
  Y.scene.traverse((o) => {
    if (!o.isLight) return;
    const p = new o.position.constructor(); o.getWorldPosition(p);
    lights.push({
      type: o.type, name: o.name || '', color: o.color.getHex(), ground: o.groundColor ? o.groundColor.getHex() : null,
      intensity: o.userData.baseIntensity !== undefined ? { base: r6(o.userData.baseIntensity) } : r6(o.intensity),
      pos: [r6(p.x), r6(p.y), r6(p.z)], decay: o.decay ?? null, distance: o.distance ?? null,
      angle: o.angle ?? null, penumbra: o.penumbra ?? null, castShadow: !!o.castShadow, visible: o.visible,
    });
  });
  return {
    lights,
    renderer: {
      shadowEnabled: R.shadowMap.enabled, shadowType: R.shadowMap.type, shadowAutoUpdate: R.shadowMap.autoUpdate,
      toneMapping: R.toneMapping, exposure: R.toneMappingExposure, outputColorSpace: R.outputColorSpace,
      environment: Y.scene.environment ? 'set' : null, background: Y.scene.background ? Y.scene.background.getHex() : null,
    },
    shadowCasters: (() => { let n = 0; Y.scene.traverse((o) => { if (o.isMesh && o.castShadow) n++; }); return n; })(),
  };
};

test('?fx=0：燈光清單與渲染器旗標逐項等於 v0.64.0', { timeout: 240000 }, async () => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html${QUERY}`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    const atLoad = await page.evaluate(PROBE);
    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await page.evaluate(async () => { await window.__yaoshi3d.tray.loaded(); });
    await page.waitForTimeout(800);
    const inGame = await page.evaluate(PROBE);
    const got = { atLoad, inGame };
    if (process.env.YAOSHI_SNAPSHOT_WRITE === '1') { fs.writeFileSync(SNAP, JSON.stringify(got, null, 1) + '\n'); return; }
    const want = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
    assert.deepEqual(errs, [], '0 pageerror');
    assert.deepEqual(got.atLoad.renderer, want.atLoad.renderer, '開頁時渲染器旗標＝v0.64.0');
    assert.deepEqual(got.inGame.renderer, want.inGame.renderer, '開局後渲染器旗標＝v0.64.0');
    assert.deepEqual(got.atLoad.lights, want.atLoad.lights, '開頁時燈光清單＝v0.64.0（型別／數量／強度／位置）');
    assert.deepEqual(got.inGame.lights, want.inGame.lights, '開局後燈光清單＝v0.64.0');
    assert.equal(got.inGame.shadowCasters, 0, '沒有任何網格投影');
    await ctx.close();
  } finally { await browser.close(); srv.kill(); }
});
