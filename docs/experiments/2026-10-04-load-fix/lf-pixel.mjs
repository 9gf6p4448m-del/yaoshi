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
/* 修正（見 acceptance.md 修訂記錄）：私下天命每顆種子在每個新瀏覽器環境重抽（index.html privateDestinyDrawsForSeed），會改變 AI 的盯上選擇→令牌落點不同。
   與 tests/tools/appraise-c-lib.mjs openGame 同法，兩邊預先寫入同一組。 */
await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, ['yaoshi-private-destiny-v1:' + seed, JSON.stringify(['water', 'eyes', 'twinTiger', 'godKing'])]);
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 60000 });
await page.waitForFunction(() => window.__yaoshi3d && window.__yaoshi3d.tray, null, { timeout: 120000 });
/* 修正（見 acceptance.md 修訂記錄）：拍品妖的待機骨骼動畫以 dt 累積，暫停點落在不同相位→人形區塊相異（≤243）。
   開局前（拍品模型尚未建立）把 AnimationMixer.update 換成空操作：骨骼停在綁定姿勢，兩邊同樣處理。 */
if (arg('--freeze-mixers', '1') === '1') await page.evaluate(async () => { const T = await import('three'); T.AnimationMixer.prototype.update = function () { return this; }; });
await startSolo(page, seed); await advanceToBid(page);
await page.waitForFunction(() => { const t = window.__yaoshi3d.tray, n = window.__yaoshi.S.market.length; return t.readyCount() >= n && t.items().filter((it) => it.visible).length >= n && !document.getElementById('trayLoad'); }, null, { timeout: 60000 });
const snap = () => page.evaluate(() => JSON.stringify(window.__yaoshi3d.tray.items().map((it) => window.__yaoshi3d.tray.pose(it.slot))));
let a = await snap(); for (let i = 0; i < 40; i++) { await page.waitForTimeout(200); const b = await snap(); if (a === b) break; a = b; }
/* 修正（見 acceptance.md 修訂記錄）：首頁聚光（home-pool）離開首頁後以 homeK 指數衰減，要渲染到 homeK<0.01 才歸零並隱藏；實跑幀數少時（SwiftShader）
   暫停點可能落在衰減途中，造成桌心一圈 ≤13 的亮度差。等它真的隱藏再暫停（兩邊同樣處理）。 */
await page.waitForFunction(() => { const h = window.__yaoshi3d.scene.getObjectByName('home-pool'); return !h || h.visible === false; }, null, { timeout: 120000, polling: 100 });
if (hideP) await page.evaluate(() => { const Y = window.__yaoshi3d; for (const k of ['smoke', 'embers', 'impact']) { const o = Y[k]; if (o && o.points) o.points.visible = false; if (o && o.group) o.group.visible = false; if (o && o.object) o.object.visible = false; if (o && o.mesh) o.mesh.visible = false; } });
/* 修正（見 acceptance.md 修訂記錄）：燈籠閃爍 light.intensity=base*(1+sin(elapsed…)) 隨 renderer 啟動後經過的時間而變（js/renderer.js 的 lanterns.forEach），
   基準對基準第三次實跑即出現 102,757 個相異像素——原凍結法沒涵蓋這一項。這裡把四盞燈的 intensity 鎖成 baseIntensity（兩邊同樣處理）。 */
if (arg('--lock-lanterns', '1') === '1') await page.evaluate(() => { const Y = window.__yaoshi3d; let n = 0; Y.scene.traverse((o) => { if (o.isLight && o.userData && o.userData.baseIntensity !== undefined) { const v = o.userData.baseIntensity; Object.defineProperty(o, 'intensity', { get: () => v, set: () => {}, configurable: true }); n++; } }); window.__lockedLights = n; });
/* 修正（見 acceptance.md 修訂記錄）：令牌落地動畫不在 tray.pose 內，原「pose 兩次相同」判準看不到它→暫停點可能落在令牌飛行途中。
   改以「先隱藏 HUD、連續兩張實際截圖逐位元組相同」判定畫面靜止（最多 40 次、間隔 300ms），之後才暫停時鐘截最後一張（兩邊同樣處理）。 */
await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden'; document.body.style.background = '#000'; });
{ let prev = await page.screenshot(), stable = false, tries = 0; for (; tries < 40; tries++) { await page.waitForTimeout(300); const cur = await page.screenshot(); if (Buffer.compare(prev, cur) === 0) { stable = true; break; } prev = cur; } console.log('stableAfterTries', tries, stable); }
for (const pad of [250, 800, 2000, 5000]) { const now = await page.evaluate(() => Date.now()); try { await page.clock.pauseAt(now + pad); break; } catch (e) { if (!/past/.test(e.message)) throw e; } }
await page.waitForTimeout(1500);
await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== 'CANVAS') el.style.visibility = 'hidden'; document.body.style.background = '#000'; });
console.log('marks', await page.evaluate(() => JSON.stringify({ marks: S.marks, round: S.round, seed: S.seed, market: S.market.map((i) => i.ab || i.m), order: S.players.map((p) => p.roleId) })));
console.log('cam', JSON.stringify(await page.evaluate(() => { const Y = window.__yaoshi3d; return { pos: Y.camera.position.toArray().map((x) => +x.toFixed(6)), fov: Y.camera.fov, lights: Y.scene.children.filter((o) => o.isLight).map((l) => +l.intensity.toFixed(4)), frames: Y.renderer.info.render.frame, fx: Y.framing && Y.framing.active }; })));
await page.screenshot({ path: out });
console.log('lockedLights', await page.evaluate(() => window.__lockedLights), 'shot', out, fs.statSync(out).size, 'errs', JSON.stringify(errs));
await browser.close(); srv.close();
