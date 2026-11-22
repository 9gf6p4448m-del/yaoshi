// 第一次出手會不會卡（v0.66.2；Codex yaoshi-v0.66.1-r3 F4；驗收 docs/acceptance/2026-11-22-v0.66.2-loader.md）。
// 舊的 hand-warm-context 只數 currentProgram（程式在不在），沒有量真的第一次出手。這支走真人節奏（開頁就緒後停 8 秒再開局，
// 像看標題、選角），在「沒有 KHR_parallel_shader_compile」的配置下（init script 把擴充功能藏起來；three 0.158 這時 isReady() 直接回 true，
// 背景預編只能靠瀏覽器自己在背景編）走到出價頁盯上一件（第一次出手），量手的程式第一次被拿來畫時，
// getProgramInfoLog／getProgramParameter 同步等了多久（ANGLE D3D11 沒預編時約 2.5–3.1 秒）。
// 已知不涵蓋：手模型一載好就在 3 秒內出手的極速入局——不論有沒有擴充功能，桌機都要等編譯（約 2.5 秒），見驗收檔 F4。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_FIRSTTHROW_PORT || 9796);
const HAND = 'hand-skin-proto-b';
const WAIT = 8000;
const FRAME_MAX = 300; // 第一次畫手那一幀的長任務上限（Codex yaoshi-v0.66.2-r1 F6）
const PRE_FIRST_MAX = 400; // 點下去到第一次畫手之間最長的長任務（r2 F5；基準約 250ms＝進出價頁那一下）
const PICK_TO_FIRST_MAX = 1000; // 點下去到第一次畫手（r2 F5；基準約 650ms＝手的動畫起手）

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

test('第一次出手：沒有平行編譯擴充功能、真人節奏入局，手的程式第一次使用時同步等待 ≤ 300ms', { timeout: 180000 }, async () => {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  for (let i = 0; i < 75; i++) {
    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (ok) break; await new Promise((r) => setTimeout(r, 200));
  }
  // 要走真的 GPU（ANGLE D3D11）：預設 headless 是 SwiftShader 軟體繪圖，編譯快、量不出差別（2026-11-22 實測：拿掉預編仍綠）
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const errs = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
      window.__gl = []; window.__lt = [];
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ s: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
      for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
        if (!C) continue;
        const ge = C.prototype.getExtension, gs = C.prototype.getSupportedExtensions;
        C.prototype.getExtension = function (n) { return n === 'KHR_parallel_shader_compile' ? null : ge.apply(this, arguments); };
        C.prototype.getSupportedExtensions = function () { const a = gs.apply(this, arguments); return a ? a.filter((n) => n !== 'KHR_parallel_shader_compile') : a; };
        for (const fn of ['getProgramInfoLog', 'getProgramParameter']) {
          const o = C.prototype[fn];
          C.prototype[fn] = function (prog) { const a = performance.now(); const r = o.apply(this, arguments); window.__gl.push({ fn, t: a, d: performance.now() - a, prog }); return r; };
        }
      }
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    const glName = await page.evaluate(() => String(window.__yaoshi3d.glName || ''));
    assert.match(glName, /D3D11/, `不是 ANGLE D3D11（${glName}），量不到真的編譯等待`);
    const extSeen = await page.evaluate(() => !!window.__yaoshi3d.renderer.getContext().getExtension('KHR_parallel_shader_compile'));
    assert.equal(extSeen, false, '擴充功能沒藏起來，量的不是「沒有平行編譯」的配置');
    await page.waitForTimeout(WAIT);
    const handsLoaded = await page.evaluate(() => !!(window.__yaoshi3d.tray.hands && window.__yaoshi3d.tray.hands.loaded()));
    assert.ok(handsLoaded, `開頁就緒後 ${WAIT}ms 手還沒載好，量不到第一次出手`);
    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    await page.waitForSelector('#table.on');
    for (let i = 0; i < 40; i++) {
      const st = await page.evaluate(() => { const b = document.querySelector('#mainbtn'); return { mark: !!b && b.textContent.includes('不盯'), disabled: !b || b.disabled }; });
      if (st.mark) break;
      if (!st.disabled) await page.click('#mainbtn'); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((el) => !el.disabled)?.click());
      await page.waitForTimeout(150);
    }
    await page.waitForFunction(() => document.querySelector('#mainbtn')?.textContent.includes('不盯'), null, { timeout: 30000 });
    const pickAt = await page.evaluate(() => { const a = performance.now(); pickMark(2); return a; });
    await page.waitForTimeout(5000);
    const r = await page.evaluate(({ H, P }) => {
      const R = window.__yaoshi3d.renderer;
      const handProgs = new Set(R.info.programs.filter((p) => p.name === H).map((p) => p.program));
      const hand = window.__gl.filter((x) => handProgs.has(x.prog));
      const post = hand.filter((x) => x.t >= P);
      const first = post.length ? Math.min(...post.map((x) => x.t)) : null;
      // 第一次畫手所在的那一幀：包含第一次手程式查詢的長任務（沒有＝那幀不到 50ms）（Codex yaoshi-v0.66.2-r1 F6）
      const frame = first === null ? null : window.__lt.filter((e) => e.s <= first && first <= e.s + e.d).reduce((m, e) => Math.max(m, e.d), 0);
      return { progs: handProgs.size, pre: hand.filter((x) => x.t < P).length, post: post.length, maxPost: Math.round(Math.max(0, ...post.map((x) => x.d))),
        sumPost: Math.round(post.reduce((a, x) => a + x.d, 0)), frame: frame === null ? null : Math.round(frame), pickToFirst: first === null ? null : Math.round(first - P), ltObserved: window.__lt.length,
        // 點下去到第一次畫手之間（含第一次畫手那一刻）最長的主執行緒卡頓（Codex yaoshi-v0.66.2-r2 F5）
        preFirst: first === null ? null : Math.round(window.__lt.filter((e) => e.s <= first && e.s + e.d >= P).reduce((m, e) => Math.max(m, e.d), 0)) };
    }, { H: HAND, P: pickAt });
    // 活性：手的程式在第一次出手之後才第一次被拿來畫（three 第一次使用時才查 getProgramInfoLog；查過就不再查）
    assert.ok(r.progs > 0, '出價頁後找不到手的程式，第一次出手沒畫手');
    assert.ok(r.post > 0 && r.pre === 0, `手的程式第一次使用不在出手之後（出手前 ${r.pre} 次、出手後 ${r.post} 次），沒量到第一次出手`);
    console.log('[FIRSTTHROW] ' + JSON.stringify(r));
    assert.ok(r.maxPost <= 300, `第一次出手時手的程式同步等了 ${r.maxPost}ms（上限 300ms）`);
    assert.ok(r.ltObserved > 0, '瀏覽器沒回報任何長任務，量不到整幀卡頓');
    assert.ok(r.sumPost <= 300, `第一次出手後手的程式同步等待合計 ${r.sumPost}ms（上限 300ms）`);
    assert.ok(r.frame <= FRAME_MAX, `第一次畫手那一幀主執行緒卡了 ${r.frame}ms（上限 ${FRAME_MAX}ms）`);
    // Codex yaoshi-v0.66.2-r2 F5：點下去到第一次畫手之間也不能卡（541eab03 系三次 preFirst 252／247／244ms、pickToFirst 651／652／635ms）
    assert.ok(r.preFirst <= PRE_FIRST_MAX, `點下去到第一次畫手之間主執行緒最長卡了 ${r.preFirst}ms（上限 ${PRE_FIRST_MAX}ms）`);
    assert.ok(r.pickToFirst <= PICK_TO_FIRST_MAX, `點下去 ${r.pickToFirst}ms 後才第一次畫手（上限 ${PICK_TO_FIRST_MAX}ms）`);
    assert.deepEqual(errs, []);
  } finally { await browser.close(); srv.kill(); }
});
