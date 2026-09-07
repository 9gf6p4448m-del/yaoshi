/* 美術方向研究用：拍「牌桌／市集」與「開標揭曉」兩個常駐場景的現況截圖（threejs-visual-loop 第二節的截圖腳本）。
   跑法：node tests/tools/scene-shot.mjs <png 前綴> [--port=8895] [--root=<靜態根目錄>] [--w=844] [--h=390]
   做的事：自起 http.server，進單人局選角色，在牌桌待機 2.5s 拍一張（table），按主鈕到第一次開標畫面再拍一張（reveal），
   另拍 390×844 直式一張（portrait，產品在直式會蓋「請轉橫」，這張就是玩家看到的樣子）。0 console error 才算成功。 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import fsSync from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
/* worktree 裡沒有 tools/（那是主 repo 的目錄），所以往上找到第一個裝了 playwright 的地方 */
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    path.resolve(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) if (fsSync.existsSync(c)) return createRequire(c)('playwright');
  throw new Error('找不到 playwright（試過：' + cands.join('、') + '）');
})();

const argv = process.argv.slice(2);
const opt = {}; const pos = [];
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)(?:=(.*))?$/i); if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a); }
const OUT = pos[0] || path.join(ROOT, 'scene');
const PORT = Number(opt.port || 8895);
const SRC_ROOT = opt.root ? path.resolve(opt.root) : ROOT;
const W = Number(opt.w || 844), H = Number(opt.h || 390);

function serve(root, port) {
  const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise((r) => setTimeout(() => r(srv), 900));
}

async function main() {
  const srv = await serve(SRC_ROOT, PORT);
  const errs = []; const shots = [];
  try {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(`http://127.0.0.1:${PORT}/index.html?paperwar=1`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + '-title.png' }); shots.push(OUT + '-title.png');
    await page.click('button:has-text("單人入市")');
    await page.waitForSelector('#selectScr.on');
    await page.screenshot({ path: OUT + '-select.png' }); shots.push(OUT + '-select.png');
    await page.click('#selGrid .rcard');
    await page.click('#selBtn:not([disabled])');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: OUT + '-table.png' }); shots.push(OUT + '-table.png');
    // 走到第一次開標揭曉：點主鈕直到 #duel 或揭曉層出現，最多 20 次
    for (let i = 0; i < 20; i++) {
      const st = await page.evaluate(() => {
        const mb = document.getElementById('mainbtn'); const ho = document.getElementById('hoBtn');
        const vis = (el) => !!el && el.offsetParent !== null && !el.disabled;
        const sb = [...document.querySelectorAll('#stage .bigbtn')].find(vis);
        const duel = document.getElementById('duel'); const duelOn = !!duel && getComputedStyle(duel).display !== 'none' && duel.offsetParent !== null;
        return { mainOk: vis(mb), hoOk: vis(ho), stageOk: !!sb, duelOn, txt: mb ? mb.textContent : '' };
      });
      if (st.duelOn) { await page.waitForTimeout(1200); await page.screenshot({ path: OUT + '-duel.png' }); shots.push(OUT + '-duel.png'); break; }
      if (st.stageOk) await page.click('#stage .bigbtn:not([disabled])').catch(() => {});
      else if (st.hoOk) await page.click('#hoBtn').catch(() => {});
      else if (st.mainOk) await page.click('#mainbtn').catch(() => {});
      await page.waitForTimeout(900);
      if (i === 2) { await page.screenshot({ path: OUT + '-mid.png' }); shots.push(OUT + '-mid.png'); }
    }
    const info = await page.evaluate(() => {
      const Y3 = window.__yaoshi3d; if (!Y3) return null;
      const r = Y3.renderer; const cam = Y3.camera;
      return { fov: cam && cam.fov, toneMapping: r && r.toneMapping, exposure: r && r.toneMappingExposure, colorSpace: r && r.outputColorSpace,
        shadow: r && r.shadowMap && r.shadowMap.enabled, pixelRatio: r && r.getPixelRatio(), calls: r && r.info.render.calls, tris: r && r.info.render.triangles,
        fog: Y3.scene.fog ? Y3.scene.fog.type : null, bg: Y3.scene.background ? (Y3.scene.background.isColor ? '#' + Y3.scene.background.getHexString() : Y3.scene.background.type) : null,
        env: !!Y3.scene.environment,
        lights: (() => { const L = []; Y3.scene.traverse((o) => { if (o.isLight) L.push({ t: o.type, i: +o.intensity.toFixed(2), c: '#' + (o.color ? o.color.getHexString() : ''), shadow: !!o.castShadow }); }); return L; })() };
    });
    await browser.close();
    console.log(JSON.stringify({ shots, info, errors: errs }, null, 1));
    process.exit(errs.length === 0 ? 0 : 1);
  } finally { srv.kill(); }
}
main();
