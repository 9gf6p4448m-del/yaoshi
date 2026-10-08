// v0.65.0 光影 A+（凍結 docs/experiments/2026-10-08-light-aplus/acceptance.md #6 新增測試四項）。
// 走真實鏈路：本機 http.server＋Playwright Chromium 開 index.html（renderer.js → light-fx.js），讀 window.__yaoshi3d 的真實場景，
// 不 import light-fx.js 自己建一份（那會是重抄一份被測邏輯）。四項：
//   ① 預設開啟：桌後一盞投影聚光、陰影圖開且 autoUpdate 關、曝光 0.95、四盞燈籠換成燭火色、有環境圖
//   ② `?fx=0` 退回：沒有任何投影燈、陰影圖關、曝光／燈籠色／衰減／半球光都是 v0.64.0 的值、燈數比預設少一盞（就是那盞聚光）
//   ③ 陰影僅法寶：投影的網格 >0，而且每一個都在托盤當夜拍品底下（不是錢、令牌、手、桌布、桌子）；每件拍品至少一個網格投影
//   ④ 燈數固定：開頁（還沒開局）的燈數／投影燈數＝開局後＝收桌（ys:duel）再擺回（ys:duel-end）之後；
//      第二次收桌擺回前後 program 數相等；3D 時間軸停住（ys:hitstop）時陰影圖 0 次重畫，拍品一動（hover 抬升）就會重畫
// 對 ae92bf2a（v0.64.0）跑：①③④ 紅在行為斷言（沒有投影燈／投影網格 0），② 紅在「燈數比預設少一盞」。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT; // 對基準驗紅：指向 v0.64.0 的樹
const PORT = 9743;
// v0.64.0 的燈籠表（scene-env.js LANTERNS，順序 south／north／west／east）與 ENV
const BASE_LANTERN = [0xffa855, 0xa8402a, 0xffc070, 0xd8e8ff];
const APLUS_LANTERN = [0xff9a40, 0xff7a2a, 0xffb060, 0xffa050];

const PROBE = () => {
  const Y = window.__yaoshi3d, R = Y.renderer, T = Y.tray;
  let lights = 0, shadowLights = 0;
  const lan = [];
  Y.scene.traverse((o) => {
    if (o.isLight) { lights++; if (o.castShadow) shadowLights++; }
    if (o.isPointLight && o.userData.baseIntensity) lan.push({ c: o.color.getHex(), d: o.decay, dist: o.distance });
  });
  let hemi = null; Y.scene.traverse((o) => { if (o.isHemisphereLight) hemi = o.intensity; });
  // 投影的網格：逐一判斷它在誰底下（拍品＝托盤直屬、不是錢／令牌／手／布的那些子群組）
  const tg = T.group, others = new Set([T.props && T.props.group, T.hands && T.hands.group].filter(Boolean));
  const lots = tg ? tg.children.filter((c) => !others.has(c) && c.type === 'Group' && c.name !== 'table-tray') : [];
  const lotOf = (o) => { for (let a = o; a; a = a.parent) if (lots.includes(a)) return a; return null; };
  const casters = []; Y.scene.traverse((o) => { if (o.isMesh && o.castShadow) casters.push(o); });
  const lotHasCaster = lots.filter((g) => g.visible).map((g) => casters.some((m) => lotOf(m) === g));
  return {
    lights, shadowLights, lan, hemi, programs: R.info.programs.length,
    shadowEnabled: R.shadowMap.enabled, autoUpdate: R.shadowMap.autoUpdate, exposure: R.toneMappingExposure, env: !!Y.scene.environment,
    casters: casters.length, castersOutsideLots: casters.filter((m) => !lotOf(m)).map((m) => m.name || m.type).slice(0, 8),
    visibleLots: lotHasCaster.length, lotsWithCaster: lotHasCaster.filter(Boolean).length,
  };
};

async function openGame(browser, query) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/index.html${query}`);
  await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const atLoad = await page.evaluate(PROBE);
  await page.evaluate(() => {
    const sm = window.__yaoshi3d.renderer.shadowMap, orig = sm.render; window.__shadowRenders = 0;
    sm.render = function (l, s, c) { if (sm.enabled && (sm.autoUpdate || sm.needsUpdate) && l.length) window.__shadowRenders++; return orig.call(this, l, s, c); };
    CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']);
  });
  await page.evaluate(async () => { await window.__yaoshi3d.tray.loaded(); });
  await page.waitForTimeout(600);
  const inGame = await page.evaluate(PROBE);
  return { ctx, page, errs, atLoad, inGame };
}

test('光影 A+：預設開啟／?fx=0 退回／陰影僅法寶／燈數固定', { timeout: 300000 }, async (t) => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const on = await openGame(browser, '');
    const off = await openGame(browser, '?fx=0');

    await t.test('① 預設＝A+：一盞投影聚光、陰影圖開且只在需要時重畫、曝光 0.95、燭火燈籠、環境圖', () => {
      const g = on.inGame;
      assert.equal(g.shadowLights, 1, '預設應有且只有一盞投影燈 ' + JSON.stringify(g));
      assert.equal(g.shadowEnabled, true, '陰影圖要開');
      assert.equal(g.autoUpdate, false, '陰影圖不得每幀自動重畫（autoUpdate=false）');
      assert.ok(Math.abs(g.exposure - 0.95) < 1e-9, '曝光 0.95，實得 ' + g.exposure);
      assert.deepEqual(g.lan.map((l) => l.c), APLUS_LANTERN, '燈籠＝燭火暖橘');
      assert.ok(g.lan.every((l) => Math.abs(l.d - 2.6) < 1e-9 && l.dist === 6), '燈籠衰減 2.6、照射距離 6 ' + JSON.stringify(g.lan));
      assert.equal(g.env, true, '有室內環境反射');
      assert.deepEqual(on.errs, [], '預設頁 0 pageerror');
    });

    await t.test('② ?fx=0：燈光回 v0.64.0（無投影燈、陰影圖關、曝光 1.1、原燈籠色、半球光原值），且只比預設少那一盞聚光', () => {
      const g = off.inGame, d = on.inGame;
      assert.equal(g.lights, d.lights - 1, `?fx=0 的燈數應比預設少一盞（聚光），實得 fx0=${g.lights} 預設=${d.lights}`);
      assert.equal(g.shadowLights, 0, '?fx=0 不得有投影燈');
      assert.equal(g.shadowEnabled, false, '?fx=0 陰影圖關');
      assert.ok(Math.abs(g.exposure - 1.1) < 1e-9, '?fx=0 曝光 1.1');
      assert.deepEqual(g.lan.map((l) => l.c), BASE_LANTERN, '?fx=0 燈籠原色');
      assert.ok(g.lan.every((l) => l.d === 2 && l.dist === 10), '?fx=0 燈籠衰減 2、距離 10');
      assert.ok(Math.abs(g.hemi - 1.8) < 1e-9, '?fx=0 半球光 1.8');
      assert.ok(Math.abs(d.hemi - 1.8 * 0.45) < 1e-9, '預設半球光＝現況 45%');
      assert.equal(g.env, false, '?fx=0 無環境圖');
      assert.equal(g.casters, 0, '?fx=0 沒有任何網格投影');
      assert.deepEqual(off.errs, [], '?fx=0 頁 0 pageerror');
    });

    await t.test('③ 陰影僅法寶：投影網格全在當夜拍品底下，每件可見拍品至少一個', () => {
      const g = on.inGame;
      assert.ok(g.casters > 0, '要有網格投影 ' + JSON.stringify(g));
      assert.deepEqual(g.castersOutsideLots, [], '拍品以外（錢、令牌、手、桌布、桌子）不得投影');
      assert.ok(g.visibleLots >= 1 && g.lotsWithCaster === g.visibleLots, `每件可見拍品都要投影：${g.lotsWithCaster}/${g.visibleLots}`);
    });

    await t.test('④ 燈數開頁就定、換場不重編、靜止不重畫陰影圖', async () => {
      const a = on.atLoad, b = on.inGame;
      assert.equal(a.shadowLights, 1, '開頁（還沒開局）就已有那盞投影聚光');
      assert.equal(b.lights, a.lights, '開局後燈數與開頁相同');
      const { page } = on;
      const cycle = async () => {
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('ys:duel')));
        await page.waitForTimeout(400);
        const mid = await page.evaluate(PROBE);
        await page.evaluate(() => document.dispatchEvent(new CustomEvent('ys:duel-end')));
        await page.waitForTimeout(400);
        return { mid, end: await page.evaluate(PROBE) };
      };
      const c1 = await cycle(), c2 = await cycle();
      for (const s of [c1.mid, c1.end, c2.mid, c2.end]) {
        assert.equal(s.lights, a.lights, '收桌／擺回後燈數不變');
        assert.equal(s.shadowLights, 1, '收桌／擺回後投影燈數不變');
      }
      assert.equal(c2.end.programs, c1.end.programs, `第二次收桌擺回不得新編 program：${c1.end.programs}→${c2.end.programs}`);
      // 靜止：3D 時間軸停住（dt=0、照樣每幀重畫）1 秒，陰影圖 0 次重畫
      const still = await page.evaluate(async () => {
        document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 1e9 } }));
        await new Promise((r) => setTimeout(r, 300));
        const R = window.__yaoshi3d.renderer, orig = R.render; let frames = 0;
        R.render = function (s, c) { frames++; return orig.call(this, s, c); };
        const s0 = window.__shadowRenders;
        await new Promise((r) => setTimeout(r, 1000));
        R.render = orig;
        return { frames, shadowRenders: window.__shadowRenders - s0 };
      });
      assert.ok(still.frames >= 10, '靜止期間照樣有在重畫 ' + JSON.stringify(still));
      assert.equal(still.shadowRenders, 0, '靜止幀陰影圖重畫次數必須 0 ' + JSON.stringify(still));
      // 活性：拍品一動（hover 抬升＋自轉）陰影圖就要重畫
      const moved = await page.evaluate(async () => {
        document.dispatchEvent(new CustomEvent('ys:hitstop', { detail: { ms: 0 } }));
        const s0 = window.__shadowRenders;
        window.__yaoshi3d.tray.setHover(1);
        await new Promise((r) => setTimeout(r, 600));
        window.__yaoshi3d.tray.setHover(-1);
        return window.__shadowRenders - s0;
      });
      assert.ok(moved > 0, '拍品移動時陰影圖要重畫，實得 ' + moved);
    });
    await on.ctx.close(); await off.ctx.close();
  } finally { await browser.close(); srv.kill(); }
});
