// v0.65.0 光影 A+ 覆審 MEDIUM-1／MEDIUM-2 的實頁守門（http.server＋Playwright Chromium 開真實 index.html）：
//   ① RoomEnvironment.js 抓不到（請求被中止）⇒ 3D 層照常啟動（window.__yaoshi3d、html.ys3d），A+ 仍開但沒有環境圖，0 pageerror
//   ② WebGL context lost→restored ⇒ 環境圖重新有 GPU 貼圖、陰影圖重畫過且有 GPU 貼圖
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = 9747;

async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  if (opts.blockEnv) await ctx.route('**/RoomEnvironment.js*', (r) => r.abort());
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`);
  return { ctx, page, errs };
}

test('光影 A+ 韌性：環境圖抓不到照常啟動；context 復原後環境圖與陰影都在', { timeout: 240000 }, async (t) => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    await t.test('① RoomEnvironment.js 被擋 ⇒ 3D 層照常啟動、A+ 開著但無環境圖、0 pageerror', async () => {
      const { ctx, page, errs } = await open(browser, { blockEnv: true });
      let up = true;
      try { await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 30000 }); } catch (e) { up = false; }
      const r = up ? await page.evaluate(() => ({ ys3d: document.documentElement.classList.contains('ys3d'), fx: window.__yaoshi3d.lightFx && window.__yaoshi3d.lightFx.stats(), env: !!window.__yaoshi3d.scene.environment })) : null;
      await ctx.close();
      assert.ok(up, '環境圖抓不到時 3D 層仍要起來（window.__yaoshi3d）' + JSON.stringify(errs));
      assert.equal(r.ys3d, true, 'html.ys3d 要在');
      assert.equal(r.fx && r.fx.on, true, 'A+ 仍開著（聚光／陰影）' + JSON.stringify(r));
      assert.equal(r.env, false, '沒有環境圖');
      assert.deepEqual(errs, [], '0 pageerror');
    });

    await t.test('② loseContext→restoreContext ⇒ 環境圖與陰影圖都重建', async () => {
      const { ctx, page, errs } = await open(browser);
      await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
      await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
      await page.evaluate(async () => { await window.__yaoshi3d.tray.loaded(); });
      await page.waitForTimeout(800);
      const r = await page.evaluate(async () => {
        // three 復原時會重建 properties 與 shadowMap 物件（initGLContext），所以每次都從 renderer 現取，不沿用復原前的參考
        const Y = window.__yaoshi3d, R = Y.renderer;
        const gpu = () => ({ env: !!(Y.scene.environment && R.properties.get(Y.scene.environment).__webglTexture), shadow: !!(Y.lightFx.spot.shadow.map && R.properties.get(Y.lightFx.spot.shadow.map.texture).__webglTexture) });
        const before = gpu();
        let sr = 0;
        const wrap = () => { const sm = R.shadowMap, orig = sm.render; sm.render = function (l, s, c) { if (sm.enabled && (sm.autoUpdate || sm.needsUpdate) && l.length) sr++; return orig.call(this, l, s, c); }; };
        R.domElement.addEventListener('webglcontextrestored', wrap); // 排在 three 與 light-fx 的處理之後：包到的是復原後那一個 shadowMap
        document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 1e9 } })); // 時間軸停住：拍品不動，陰影重畫只能來自復原處理
        await new Promise((res) => setTimeout(res, 300));
        const ext = R.getContext().getExtension('WEBGL_lose_context');
        sr = 0; ext.loseContext();
        await new Promise((res) => setTimeout(res, 500));
        ext.restoreContext();
        await new Promise((res) => setTimeout(res, 1500));
        const after = gpu();
        document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 0 } }));
        return { before, after, shadowRendersAfterRestore: sr };
      });
      await ctx.close();
      assert.deepEqual(r.before, { env: true, shadow: true }, '復原前環境圖與陰影圖都有 GPU 貼圖 ' + JSON.stringify(r));
      assert.equal(r.after.env, true, '復原後環境圖要重建 ' + JSON.stringify(r));
      assert.ok(r.shadowRendersAfterRestore >= 1 && r.after.shadow, '復原後陰影圖要重畫（時間軸停住、拍品沒動）' + JSON.stringify(r));
      assert.deepEqual(errs, [], '0 pageerror');
    });
  } finally { await browser.close(); srv.kill(); }
});
