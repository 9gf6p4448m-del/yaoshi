// v0.59.7 修訂 5（條件 16a／16b）：寫實皮膚「真的畫出來」的實頁斷言——量的是畫面像素，不是 uniform 值或原始碼字串。
// 走真實鏈路：本機 http.server＋Playwright Chromium 開 index.html，獵人坐南席推錢、凍結，遊戲相機搬到手的特寫位置畫一張，
// 再只改寫實材質的一個參數畫第二張，比兩張的像素差：
//   ① 疤：把獵人那種手的疤強度 uMarksA[獵人].y 設 0 ⇒ 疤所在的像素必須變（疤畫在皮膚上；若疤的著色分支永遠不走，兩張相同＝紅）
//   ② 皮膚：把獵人膚色 uSkinA[獵人] 換成純綠 ⇒ 手的像素必須大量改變（若 onBeforeCompile 沒注入寫實著色，uniform 不影響畫面＝紅）
// 突變驗紅見 docs/experiments/2026-10-02-hand-realism/README.md（疤分支 >99、onBeforeCompile 直接 return）。
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRV_ROOT = process.env.YAOSHI_RENDER_ROOT || ROOT; // 突變驗紅：指向暫存的突變樹
const PORT = 9731;

test('寫實皮膚實頁像素：獵人疤強度歸零⇒疤的像素改變；膚色換純綠⇒手的像素大量改變', { timeout: 240000 }, async () => {
  const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
  const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SRV_ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`);
    await page.waitForFunction(() => window.__yaoshi3d?.tray && window.__yaoshi, null, { timeout: 60000 });
    await page.evaluate(() => { CFG.T = 1; window.__yaoshi.newGame('solo', 1, ['qingmian']); });
    for (let i = 0; i < 400; i++) {
      const st = await page.evaluate(() => { const b = document.getElementById('mainbtn'); return { t: b.textContent, d: b.disabled, r: window.__yaoshi.S.round }; });
      if (st.r === 1 && !st.d && /不盯任何一件/.test(st.t)) break;
      if (!st.d) await page.evaluate(() => document.getElementById('mainbtn').click()); else await page.evaluate(() => [...document.querySelectorAll('#stage button')].find((b) => !b.disabled)?.click());
      await page.waitForTimeout(20);
    }
    const r = await page.evaluate(async () => {
      const THREE = await import('three');
      const Y = window.__yaoshi3d, T = Y.tray, R = Y.renderer;
      await T.loaded(); await T.hands.ready();
      const seats = [0, 1, 2, 3].map((id) => ({ id, role: ['hunter', 'qingmian', 'hongyi', 'zutou'][id] }));
      T.props.clearRound(); T.hands.clear(); T.props.setSeats(seats); T.hands.setSeats(seats);
      document.dispatchEvent(new CustomEvent('ys:bid', { detail: { seat: 0, slot: 1, amount: 8 } }));
      await new Promise((res) => setTimeout(res, 170)); T.hands.setFrozen(true); T.props.update = () => {};
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const raf0 = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; // 停住遊戲迴圈，相機與手都不再動
      const holder = T.hands.group.children[0]; let mesh = null; holder.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
      const c = new THREE.Vector3(); let n = 0; holder.traverse((o) => { if (o.isBone) { c.add(o.getWorldPosition(new THREE.Vector3())); n++; } }); c.multiplyScalar(1 / n);
      const C = Y.camera;
      /* 遊戲迴圈（setAnimationLoop）仍會在 await 之間動相機與場景：每次畫之前重設相機、把整個場景的時間凍住（props／手已凍結） */
      const grab = () => { C.position.set(c.x + 0.05, c.y + 0.42, c.z + 0.42); C.lookAt(c); C.updateMatrixWorld(true); R.render(Y.scene, C); const url = R.domElement.toDataURL('image/png'); return new Promise((res) => { const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); res(g.getImageData(0, 0, im.width, im.height).data); }; im.src = url; }); };
      /* 場景裡有自己會動的東西（粒子、燈籠閃爍）：只數「改參數前後兩張（A、C）一模一樣」的穩定像素裡，改參數那張（B）差很多的像素 */
      const d3 = (a, b, i) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      const diff = (a, b, c = a) => { let px = 0, stable = 0; for (let i = 0; i < a.length; i += 4) { if (d3(a, c, i) > 0) continue; stable++; if (d3(a, b, i) > 12) px++; } return { px, stable }; };
      const u = mesh.material.userData.realU, kind = mesh.geometry.userData.real && mesh.geometry.userData.real.kind;
      if (!u || kind === undefined) { window.requestAnimationFrame = raf0; return { noReal: true }; }
      R.setAnimationLoop(null); // 停掉遊戲的繪圖迴圈：量測期間畫面只由這裡畫
      const img0 = await grab(); const img0b = await grab(); /* 量測本身：同一參數連畫兩張 */
      const y0 = u.uMarksA.value[kind].y; u.uMarksA.value[kind].y = 0; const img1 = await grab(); u.uMarksA.value[kind].y = y0; const img1c = await grab();
      const s0 = u.uSkinA.value[kind].clone(); u.uSkinA.value[kind].setRGB(0, 1, 0); const img2 = await grab(); u.uSkinA.value[kind].copy(s0); const img2c = await grab();
      window.requestAnimationFrame = raf0;
      return { kind, scarY: y0, noise: diff(img0, img0b), scar: diff(img0, img1, img1c), skin: diff(img1c, img2, img2c), errs: [] };
    });
    console.log('RENDER', JSON.stringify(r));
    assert.ok(!r.noReal, '南席獵人手不是寫實手');
    assert.equal(r.noise.px, 0, `同一畫面畫兩次要逐像素相同（量測本身穩定） ${JSON.stringify(r.noise)}`);
    assert.ok(r.scarY > 0, '獵人疤強度 >0');
    assert.ok(r.scar.px >= 150, `疤強度歸零後應有疤的像素改變（≥150 px），實際 ${JSON.stringify(r.scar)}`);
    assert.ok(r.skin.px >= 3000, `膚色換純綠後手的像素應大量改變（≥3000 px），實際 ${JSON.stringify(r.skin)}`);
    assert.deepEqual(errs, []);
  } finally { await browser.close(); srv.kill(); }
});
