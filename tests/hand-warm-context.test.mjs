// 手部 shader 預編的回歸測試（v0.66.1；Codex yaoshi-v0.66.1-r1 F2、F5）。
// A（F5）：還沒有任何一隻手被畫出來之前，手的每顆材質在 renderer.properties 裡就已經有 currentProgram——
//    預編真的在第一次出手前發生（main 沒有預編時這條紅：手要到出價頁第一次出手才編，ANGLE D3D11 實測主執行緒卡約 3.1 秒）。
// B（F2）：WebGL context 遺失→恢復的同一刻觸發預編，不得丟出未捕捉例外，恢復後手的程式要重新編好。
//    three 0.158 的 compileAsync 在計時器裡讀「建 renderer 時那份」properties，恢復後 initGLContext 換新的一份，
//    舊輪詢讀到 undefined.isReady() → TypeError（f2ff1ad7 的寫法上這條紅）。
// 全程走真頁面、真 three、真托盤 warmHands 與瀏覽器內建 WEBGL_lose_context，沒有替身。
// 舊版對照：YAOSHI_RENDER_ROOT=<舊樹> 跑同一份測試。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT;
const PORT = Number(process.env.YAOSHI_HANDWARM_PORT || 9793);

function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(SRV_ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT）');
}

/** 頁內：手的每顆材質在「目前這份」renderer.properties 裡有沒有 currentProgram。 */
const HAND_PROGRAMS = `(() => {
  const Y = window.__yaoshi3d, R = Y && Y.renderer, H = Y && Y.tray && Y.tray.hands;
  if (!R || !H || !H.group || !H.loaded()) return { loaded: false, mats: 0, withProgram: 0 };
  const mats = new Set();
  H.group.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && mats.add(m)); });
  let withProgram = 0;
  for (const m of mats) if (R.properties.get(m).currentProgram) withProgram++;
  return { loaded: true, mats: mats.size, withProgram };
})()`;

test('手部 shader：第一次出手前已預編；context 遺失恢復時預編不丟例外且會重編', { timeout: 120000 }, async () => {
  const { chromium } = loadPlaywright();
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  for (let i = 0; i < 75; i++) {
    const ok = await fetch(`http://127.0.0.1:${PORT}/index.html`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
    if (ok) break; await new Promise((r) => setTimeout(r, 200));
  }
  // 不走顯示卡：B 段要抓的未捕捉例外（f2ff1ad7 的 compileAsync）走顯示卡不會發生（2026-11-23 實測：CPU 3/3 紅在 TypeError，顯示卡 3/3 沒有例外）
  const browser = await chromium.launch();
  const errs = [];
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction('!!window.__yaoshi3d && !!window.__yaoshi3d.tray && !!window.__yaoshi3d.tray.hands', { timeout: 60000 });
    // 首頁停著、還沒開局：手從沒被畫過。等手載好，再給背景預編最多 10 秒。
    let a = null;
    for (let i = 0; i < 200; i++) {
      a = await page.evaluate(HAND_PROGRAMS);
      if (a.loaded && a.mats > 0 && a.withProgram === a.mats) break;
      await page.waitForTimeout(50);
    }
    assert.ok(a.loaded && a.mats > 0, `手沒載到（mats=${a && a.mats}），測試沒行使到預編`);
    assert.equal(a.withProgram, a.mats, `第一次出手前手的材質只有 ${a.withProgram}/${a.mats} 顆有編好的程式（預編沒發生）`);

    // B：遺失 → 恢復的同一個 task 裡觸發預編（restored 事件排在之後才派，輪詢第一次檢查時 properties 已換新）
    const seq = await page.evaluate(async () => {
      const Y = window.__yaoshi3d, R = Y.renderer, cv = R.domElement, gl = R.getContext();
      const ext = gl.getExtension('WEBGL_lose_context');
      if (!ext) return { ext: false };
      let lost = 0, restored = 0;
      cv.addEventListener('webglcontextlost', () => { lost++; });
      cv.addEventListener('webglcontextrestored', () => { restored++; });
      const waitFor = (f) => new Promise((res) => { const t0 = performance.now(); const k = () => (f() || performance.now() - t0 > 5000 ? res() : setTimeout(k, 5)); k(); });
      ext.loseContext();
      await waitFor(() => lost > 0);
      ext.restoreContext();
      Y.tray.warmHands(R);
      await waitFor(() => restored > 0);
      return { ext: true, lost, restored };
    });
    assert.ok(seq.ext, '瀏覽器沒有 WEBGL_lose_context，測不到 F2');
    assert.ok(seq.lost > 0 && seq.restored > 0, `context 沒有真的遺失並恢復（lost=${seq.lost} restored=${seq.restored}）`);
    let b = null;
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(50);
      b = await page.evaluate(HAND_PROGRAMS);
      if (b.loaded && b.mats > 0 && b.withProgram === b.mats) break;
    }
    await page.waitForTimeout(300); // 讓舊寫法可能殘留的輪詢計時器有機會觸發
    assert.deepEqual(errs, [], 'context 恢復時預編丟出未捕捉例外');
    assert.equal(b.withProgram, b.mats, `context 恢復後手的材質只有 ${b.withProgram}/${b.mats} 顆重新編好`);
  } finally { await browser.close(); srv.kill(); }
});
