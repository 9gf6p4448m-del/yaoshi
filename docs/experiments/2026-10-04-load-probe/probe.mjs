// 開局到 tray 可見的量測治具（唯讀，不改產品）。
// node probe.mjs --url <站台> --net none|fast4g|slow4g --cpu 1|4 [--warm 1] --out <json>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URLB = arg('--url', 'https://9gf6p4448m-del.github.io/yaoshi/index.html');
const NET = arg('--net', 'none'), CPU = Number(arg('--cpu', 1)), WARM = arg('--warm', '0') === '1', REPLAY = arg('--replay', '0') === '1', WAITMS = Number(arg('--wait', 60000)), ADV = arg('--advance', '0') === '1', BLOCK = arg('--block', ''), OUT = arg('--out', 'out.json');
const NETS = { none: null, fast4g: { d: 9e6 / 8, u: 1.5e6 / 8, l: 60 }, slow4g: { d: 1.6e6 / 8, u: 0.75e6 / 8, l: 150 } };
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
async function run(label, throttle) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const reqs = new Map(); let base = null;
  cdp.on('Network.requestWillBeSent', (e) => { if (base === null) base = e.timestamp; const r = reqs.get(e.requestId); if (r && e.redirectResponse) { r.redir = true; } reqs.set(e.requestId, { url: e.request.url, t0: e.timestamp - base, type: e.type }); });
  cdp.on('Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (!r) return; r.status = e.response.status; r.enc = e.response.headers['content-encoding'] || e.response.headers['Content-Encoding'] || ''; r.cc = e.response.headers['cache-control'] || ''; r.fromCache = !!e.response.fromDiskCache || !!e.response.fromMemoryCache; r.tResp = e.timestamp - base; r.mime = e.response.mimeType; });
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (!r) return; r.t1 = e.timestamp - base; r.bytes = e.encodedDataLength; });
  if (process.env.DBG) setInterval(() => { const pend = [...reqs.values()].filter((r) => r.t1 === undefined); L('pending ' + pend.length + ' ' + pend.slice(0,4).map((r) => r.url.split('/').slice(-2).join('/')).join(',') + ' total=' + reqs.size); }, 5000).unref();
  if (throttle && NETS[NET]) { const n = NETS[NET]; await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: n.l, downloadThroughput: n.d, uploadThroughput: n.u }); }
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const m = {};
  if (BLOCK) await page.route(new RegExp(BLOCK), (r) => r.abort());
  const L = (s) => process.env.DBG && console.error(new Date().toISOString().slice(14,23), s);
  page.on('crash', () => L('CRASH')); page.on('requestfailed', (r) => L('reqfail ' + r.url().slice(-60))); page.on('pageerror', (e) => L('pageerror ' + e.message)); page.on('console', (c) => { if (c.type()==='error') L('console.error ' + c.text().slice(0,200)); });
  const dump = () => page.evaluate(() => { const Y = window.__yaoshi3d, P = window.__probe; let it = null; try { it = Y.tray.items().map((i) => [i.key, i.ready, i.visible]); } catch (e) { it = String(e); } const b = document.getElementById('mainbtn'); return JSON.stringify({ trayDef: !!(Y && Y.tray), P, it, mk: window.__yaoshi.S.market.length, rnd: window.__yaoshi.S.round, btn: b ? b.textContent.slice(0, 20) : null, dis: b ? b.disabled : null }); }).then((s) => L('STATE ' + s), (e) => L('dumpfail'));
  if (process.env.DBG) setInterval(dump, 7000).unref();
  const nowP = () => page.evaluate(() => performance.now());
  await page.goto(URLB, { waitUntil: 'load', timeout: 180000 }); m.load = await nowP(); L('loaded');
  await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 180000 }); m.yaoshiObj = await nowP(); L('yaoshi');
  m.gl = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
  await page.evaluate(() => startEntry('solo'));
  m.startEntry = await nowP(); L('startEntry');
  await page.waitForFunction(() => document.getElementById('selectScr').classList.contains('on') && document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0, null, { timeout: 180000 });
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  L('picked'); await page.waitForTimeout(80);
  // 觀察者：每 25ms 記 tray 狀態（頁內計時）
  await page.evaluate(([REPLAYFLAG, ADVFLAG]) => { window.__REPLAY = REPLAYFLAG; window.__ADV = ADVFLAG; window.__probe = null; window.__nominal = 0; window.__probe = { trayDefAt: null, slots: {}, allAt: null, bidAt: null }; const P = window.__probe; const iv = setInterval(() => { const t = performance.now(); const Y = window.__yaoshi3d; if (Y && Y.tray && P.trayDefAt === null) { P.trayDefAt = t; if (window.__REPLAY) { try { pushMarket3d(); P.replayAt = t; } catch (e) { P.replayErr = String(e); } } } if (Y && Y.tray) { try { Y.tray.items().forEach((it, i) => { if (it.ready && P.slots[i] === undefined) P.slots[i] = t; }); const n = window.__yaoshi.S.market.length; if (P.allAt === null && Y.tray.readyCount() >= n && Y.tray.items().filter((it) => it.visible).length >= n) P.allAt = t; } catch (e) {} } const b = document.getElementById('mainbtn'); if (P.bidAt === null && b && /^蓋牌/.test(b.textContent) && !b.disabled) P.bidAt = t; }, 25); }, [REPLAY, ADV]);
  m.newGame = await nowP();
  await page.evaluate(() => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', 3, SEL.picks); });
  // 推進到出價（auto-click mainbtn 同治具）
  for (let i = 0; i < (ADV ? 1500 : 6000); i++) {
    const st = await page.evaluate(`(()=>{const P=window.__probe; const b=document.getElementById('mainbtn'); const t=b?b.textContent:''; if(P.allAt!==null||(P.bidAt!==null&&!window.__ADV)) return 'done'; if(b&&!b.disabled){b.click();return 'clk';} const m=document.getElementById('modal'); if(m&&getComputedStyle(m).display!=='none'){const k=document.getElementById('titheKeep'); if(k){k.click();return 'k';} const bs=[...document.querySelectorAll('#modalbox .legendPick')]; if(bs.length){bs[0].click();return 'l';}} return 'w';})()`);
    if (st === 'done') break; await page.waitForTimeout(40);
  }
  await page.waitForFunction(() => window.__probe.allAt !== null, null, { timeout: WAITMS }).catch(() => { m.timeout = true; });
  const P = await page.evaluate(() => window.__probe); Object.assign(m, { probe: P });
  m.marketKeys = await page.evaluate(() => { try { return window.__yaoshi3d.tray.items().map((i) => i.key); } catch (e) { return null; } });
  m.heap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);
  m.glbParse = await page.evaluate(() => performance.getEntriesByType('measure').map((x) => [x.name, x.duration]));
  await page.close();
  const list = [...reqs.values()].filter((r) => r.t1 !== undefined || r.status !== undefined);
  return { label, m, reqs: list };
}
const out = { net: NET, cpu: CPU, runs: [] };
out.runs.push(await run('cold', true));
if (WARM) out.runs.push(await run('warm', true));
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
for (const r of out.runs) { const t = r.reqs.reduce((a, x) => a + (x.bytes || 0), 0); console.log(r.label, 'reqs', r.reqs.length, 'bytes', t, 'timeline(ms)', JSON.stringify({ load: Math.round(r.m.load), startEntry: Math.round(r.m.startEntry), newGame: Math.round(r.m.newGame), trayDef: Math.round(r.m.probe.trayDefAt), allVisible: Math.round(r.m.probe.allAt), bid: Math.round(r.m.probe.bidAt), timeout: r.m.timeout }), r.m.gl); }
