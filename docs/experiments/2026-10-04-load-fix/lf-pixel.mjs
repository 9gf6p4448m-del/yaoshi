// 條件 5：tray 就緒後出價階段 3D canvas 截圖，逐像素比對。
// node lf-pixel.mjs --root <樹> --out <png> [--seed 9] [--hide-particles 1]
// 做法：新 context 先裝 Playwright 假時鐘（時間照流，pauseAt 後凍結）→ 等 renderer 就緒 → solo 開局（固定種子）→ 到出價頁 →
// 等 tray 全就緒、載入畫面（#trayLoad）消失、桌面靜止 → 暫停時鐘 → 隱藏 canvas 以外所有 body 子元素 → 截圖。
import fs from 'node:fs';
import { startServer, chromium, arg, INIT, startSolo, advanceToBid } from './lf-lib.mjs';
const root = arg('--root'), port = Number(arg('--port', 9881)), out = arg('--out'), seed = Number(arg('--seed', 9)), hideP = arg('--hide-particles', '1') === '1';
const srv = await startServer(root, port);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
await ctx.clock.install();
await ctx.addInitScript(INIT);
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 60000 });
await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 120000 });
await startSolo(page, seed); await advanceToBid(page);
await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n && !document.getElementById('trayLoad'); }, null, { timeout: 60000 });
const snap = () => page.evaluate(() => JSON.stringify(window.__yaoshi3d.tray.items().map((it) => window.__yaoshi3d.tray.pose(it.slot))));
let a = await snap(); for (let i = 0; i < 40; i++) { await page.waitForTimeout(200); const b = await snap(); if (a === b) break; a = b; }
if (hideP) await page.evaluate(() => { const Y = window.__yaoshi3d; for (const k of ['smoke', 'embers', 'impact']) { const o = Y[k]; if (o && o.points) o.points.visible = false; if (o && o.group) o.group.visible = false; if (o && o.object) o.object.visible = false; if (o && o.mesh) o.mesh.visible = false; } });
for (const pad of [250, 800, 2000, 5000]) { const now = await page.evaluate(() => Date.now()); try { await page.clock.pauseAt(now + pad); break; } catch (e) { if (!/past/.test(e.message)) throw e; } }
await page.waitForTimeout(1500);
await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden'; document.body.style.background = '#000'; });
await page.screenshot({ path: out });
console.log('shot', out, fs.statSync(out).size, 'errs', JSON.stringify(errs));
await browser.close(); srv.close();
