// load-fix 治具共用庫（Playwright＋本機仿 Pages 伺服器＋CDP 節流）。一次只開一支瀏覽器。
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TOOLS_PKG = path.resolve(HERE, '../../../tools/anyCreature/package.json');
export const { chromium } = createRequire(TOOLS_PKG)('playwright');
export const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
export const NETS = { none: null, fast4g: { d: 9e6 / 8, u: 1.5e6 / 8, l: 40 }, slow4g: { d: 1.6e6 / 8, u: 0.75e6 / 8, l: 150 } };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.m4a': 'audio/mp4', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const GZ = new Set(['.html', '.js', '.json', '.css', '.svg', '.glb', '.webmanifest']);
export function startServer(rootIn, port) {
  const root = path.resolve(rootIn), cache = new Map();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let f = path.join(root, decodeURIComponent(u.pathname)); if (f.endsWith(path.sep) || !path.extname(f)) f = path.join(f, 'index.html');
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    const ext = path.extname(f); let body = fs.readFileSync(f); const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: 'W/"' + crypto.createHash('md5').update(body).digest('hex').slice(0, 12) + '"' };
    if (GZ.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { const k = f + body.length; if (!cache.has(k)) cache.set(k, zlib.gzipSync(body, { level: 6 })); body = cache.get(k); h['Content-Encoding'] = 'gzip'; }
    h['Content-Length'] = body.length; res.writeHead(200, h); res.end(body);
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok(srv)));
}
/* 頁內觀察者：ys:market 首次時間、#trayLoad 的 add/remove（MutationObserver）、25ms 取樣 tray 狀態、錯誤。 */
export const INIT = () => {
  try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {}
  const L = window.__lf = { marketAt: null, ov: [], trayDefAt: null, allReadyAt: null, errs: [] };
  document.addEventListener('ys:market', () => { if (L.marketAt === null) L.marketAt = performance.now(); });
  window.addEventListener('error', (e) => L.errs.push('error:' + e.message));
  window.addEventListener('unhandledrejection', (e) => L.errs.push('rej:' + (e.reason && e.reason.message || e.reason)));
  const isOv = (n) => n.nodeType === 1 && (n.id === 'trayLoad' || (n.querySelector && n.querySelector('#trayLoad')));
  const mo = new MutationObserver((recs) => { for (const r of recs) { for (const n of r.addedNodes) if (isOv(n)) { const el = n.id === 'trayLoad' ? n : n.querySelector('#trayLoad'); L.ov.push({ ev: 'add', t: performance.now(), text: el.textContent }); }
    for (const n of r.removedNodes) if (isOv(n)) L.ov.push({ ev: 'rm', t: performance.now() }); } });
  mo.observe(document, { childList: true, subtree: true });
  setInterval(() => { const t = performance.now(), Y = window.__yaoshi3d; if (Y && Y.tray) { if (L.trayDefAt === null) L.trayDefAt = t; try { const n = window.__yaoshi.S.market.length; if (L.allReadyAt === null && n > 0 && Y.tray.readyCount() >= n) L.allReadyAt = t; } catch (e) {} } }, 25);
};
export async function openPage(ctx, { url, net = 'none', cpu = 1, delayRenderer = 0, hangRenderer = null }) {
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const reqs = []; let base = null;
  cdp.on('Network.requestWillBeSent', (e) => { if (base === null) base = e.timestamp; reqs.push({ url: e.request.url, t0: e.timestamp - base, id: e.requestId }); });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.find((x) => x.id === e.requestId); if (r) { r.t1 = e.timestamp - base; r.bytes = e.encodedDataLength; } });
  if (NETS[net]) { const n = NETS[net]; await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: n.l, downloadThroughput: n.d, uploadThroughput: n.u }); }
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const errs = []; page.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); page.on('console', (c) => { if (c.type() === 'error') errs.push('console.error: ' + c.text().slice(0, 200)); });
  if (delayRenderer > 0) await page.route(/\/js\/renderer\.js/, async (r) => { await new Promise((ok) => setTimeout(ok, delayRenderer)); try { await r.continue(); } catch (e) {} });
  if (hangRenderer === 'abort') await page.route(/\/js\/renderer\.js/, (r) => r.abort());
  if (hangRenderer === 'hang') await page.route(/\/js\/renderer\.js/, async (r) => { await new Promise((ok) => setTimeout(ok, 60000)); try { await r.continue(); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 180000 });
  return { page, cdp, reqs, errs, base: () => base };
}
export const nowP = (page) => page.evaluate(() => performance.now());
/* 首頁→solo→選角→newGame(seed)；回傳 newGame 的頁內時間。 */
export async function startSolo(page, seed = 3) {
  await page.evaluate(() => startEntry('solo'));
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0, null, { timeout: 180000 });
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(80);
  const t = await nowP(page);
  await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', sd, SEL.picks); }, seed);
  return t;
}
/* 自動點到出價頁（#mainbtn 文字開頭「蓋牌」且可按）。 */
export async function advanceToBid(page, maxLoops = 3000) {
  for (let i = 0; i < maxLoops; i++) {
    const st = await page.evaluate(`(()=>{const b=document.getElementById('mainbtn'); if(b&&!b.disabled&&/^蓋牌/.test(b.textContent)) return 'bid'; if(b&&!b.disabled){b.click();return 'clk';} const m=document.getElementById('modal'); if(m&&getComputedStyle(m).display!=='none'){const k=document.getElementById('titheKeep'); if(k){k.click();return 'k';} const bs=[...document.querySelectorAll('#modalbox .legendPick')]; if(bs.length){bs[0].click();return 'l';}} return 'w';})()`);
    if (st === 'bid') return true; await page.waitForTimeout(40);
  }
  return false;
}
export const trayState = (page) => page.evaluate(() => { const Y = window.__yaoshi3d; if (!Y || !Y.tray) return { trayDef: false }; const it = Y.tray.items(); const st = Y.tray.props && Y.tray.props.stats ? Y.tray.props.stats() : null; return { trayDef: true, keys: it.map((i) => i.key), ready: it.map((i) => i.ready), visible: it.map((i) => i.visible), curse: it.map((i) => i.curse), n: it.length, readyCount: Y.tray.readyCount(), chips: st && st.chips, tokens: st && st.tokens, bids: st && st.bids }; });
export const expectState = (page) => page.evaluate(() => ({ marketKeys: market3dItems().map((i) => i.key), curse: market3dItems().map((i) => i.curse), n: S.market.length, round: S.round, active: ACTIVE, myBids: (typeof myBids !== 'undefined' ? myBids.map((b) => b && b.amt) : null) }));
export const lfDump = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__lf)));
export const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
export async function withBrowser(fn, { width = 852, height = 393 } = {}) {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await ctx.addInitScript(INIT);
  try { return await fn(ctx, browser); } finally { await browser.close(); }
}
