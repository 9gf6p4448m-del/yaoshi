// v0.59.2 凍結 #8 後半：牌桌態鏡頭／燈光與 86e4676 逐值相同、每 rAF draw 不多於 86e4676；
// 鑑賞態每 rAF draw 不多於牌桌態。跑法：
//   node tests/tools/appraise-perf-probe.mjs [--port N] [--out <file>]
// 對照基準另跑：cd ../base592 && node tests/tools/appraise-perf-probe.mjs --port N2 --out <file2> --table-only
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', 9841));
const OUT = path.resolve(arg('--out', path.join(ROOT, 'docs/experiments/2026-09-28-appraise-panels/perf-head.json')));
const TABLE_ONLY = process.argv.includes('--table-only'); // 基準（86e4676）沒有鑑賞態，只量牌桌態
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 30000 });
await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 90000 }).catch(() => {});
await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
await page.evaluate(() => startEntry('solo'));
await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
await page.waitForTimeout(80);
await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
await page.waitForFunction(() => window.__yaoshi.S && window.__yaoshi.S.round >= 1);
for (let i = 0; i < 4000; i++) {
  await page.waitForTimeout(8);
  const cls = await page.evaluate(() => { const b = document.getElementById('mainbtn'); const t = b ? b.textContent : '', dis = b ? b.disabled : true; if (/不盯任何一件/.test(t)) return 'mark'; if (/^蓋牌/.test(t) && !dis) return 'bid'; return 'busy'; });
  if (cls === 'bid' || cls === 'mark') break;
  await page.evaluate(`(()=>{const b=document.getElementById('mainbtn'); if(b&&!b.disabled){b.click();return;} const m=document.getElementById('modal'); if(m&&getComputedStyle(m).display!=='none'){const k=document.getElementById('titheKeep'); if(k){k.click();return;} const bs=[...document.querySelectorAll('#modalbox .legendPick')]; if(bs.length){bs[0].click();return;}} })()`);
}
await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n; }, null, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(300); // 讓桌面姿態穩定（沒有 hover／appraise）

const sampleDraws = async (frames) => page.evaluate(async (n) => {
  const r = window.__yaoshi3d.renderer;
  const out = [];
  for (let i = 0; i < n; i++) {
    await new Promise((res) => requestAnimationFrame(res));
    out.push(r.info.render.calls);
  }
  return out;
}, frames);
const camSnap = () => page.evaluate(() => ({ pos: [window.__yaoshi3d.camera.position.x, window.__yaoshi3d.camera.position.y, window.__yaoshi3d.camera.position.z], quat: [window.__yaoshi3d.camera.quaternion.x, window.__yaoshi3d.camera.quaternion.y, window.__yaoshi3d.camera.quaternion.z, window.__yaoshi3d.camera.quaternion.w] }));
const lightSnap = () => page.evaluate(() => { const l = []; window.__yaoshi3d.scene.traverse((o) => { if (o.isLight) l.push([o.type, +o.intensity.toFixed(6), o.color.getHexString()]); }); return l; });

const tableCam = await camSnap();
const tableLight = await lightSnap();
const tableDraws = await sampleDraws(30);

let apprDraws = null;
if (!TABLE_ONLY) {
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.railTabs button')].map((b) => ({ rail: b.closest('.rail').id, slot: Number(b.dataset.slot) })));
  if (tabs.length) {
    await page.evaluate(([r, s]) => railTabClick(r, s), [tabs[0].rail, tabs[0].slot]);
    await page.waitForTimeout(500);
    apprDraws = await sampleDraws(30);
  }
}

await browser.close();
srv.kill();
const result = { tableCam, tableLight, tableDrawsMax: Math.max(...tableDraws), tableDrawsAvg: tableDraws.reduce((a, b) => a + b, 0) / tableDraws.length, apprDrawsMax: apprDraws ? Math.max(...apprDraws) : null, apprDrawsAvg: apprDraws ? apprDraws.reduce((a, b) => a + b, 0) / apprDraws.length : null };
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log('寫入', OUT, JSON.stringify(result));
