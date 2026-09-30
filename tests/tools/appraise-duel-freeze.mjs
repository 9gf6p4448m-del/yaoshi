// #8 歸因診斷（09-30 雲端）：夜戰籌碼系字徽 #pwch-* > i.pwfac 的對比，在「同一局、同一拍、畫面靜止」下 base 與 head 是否相同。
// 背景：common-cells-head8 第一階段 contrast 回退 1 格＝nw2|duel@V1 #pwch-B > i.pwfac 1.04（op 1、非 transient）；
//   base 同格同局（章節局固定種子 3）是 op .04/.08 transient；同一 HEAD 在 Linux 重跑時該格整格 lost（量測中畫面已換）。
//   visual-polish-probe 的 contrast 是「藏字截圖」與「量測當下 rect／opacity」兩個時刻拼出來的，夜戰一直在演，兩刻之間可能不是同一幀。
// 做法：與 visual-polish-probe 同一條章節路徑（nw2、--seed 3、PW_FX *_MS＝1）打到第一場夜戰，
//   一進 #duel 就把 PW_FX 所有 *_MS 拉到 10 分鐘（夜戰停在當拍），finish() 所有 WAAPI，
//   再用與 probe 相同的算法（藏字截圖取字框中位色＝底，字色×累乘 opacity 疊底＝前景）算每一枚 .pwfac 的對比。
//   base／head 各跑一次、逐枚比。只診斷，不是判定器，不改任何門檻。
// 用法：node tests/tools/appraise-duel-freeze.mjs [--base 86e46763] [--seed 3] [--ch 2] [--out <json>]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', '86e46763'), SEED = Number(arg('--seed', 3)), CH = Number(arg('--ch', 2)), PORT = Number(arg('--port', 9990));
const OUT = arg('--out', null);
const { chromium } = createRequire(path.join(ROOT, 'tools/anyCreature/package.json'))('playwright');
const CT = { '.svg': 'image/svg+xml', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' };
const cache = new Map();
const fromBase = (p) => { if (!cache.has(p)) { let b = null; try { b = execFileSync('git', ['show', `${BASE}:${p.slice(1)}`], { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) {} cache.set(p, b); } return cache.get(p); };

const DRIVE_STEP = `(() => {
  const ho = document.getElementById('handoff');
  if (ho && getComputedStyle(ho).display !== 'none') { document.getElementById('hoBtn').click(); return 0; }
  const b = document.getElementById('mainbtn');
  const txt = b ? b.textContent : '', dis = b ? b.disabled : true;
  if (b && /看最終結果/.test(txt) && !dis) return 2;
  if (b && !dis) { b.click(); return 0; }
  const m = document.getElementById('modal');
  if (m && getComputedStyle(m).display !== 'none') {
    const k = document.getElementById('titheKeep'); if (k) { k.click(); return 0; }
    const bs = [...document.querySelectorAll('#modalbox .legendPick')]; if (bs.length) { bs[0].click(); return 0; }
  }
  if (b && dis) {
    const els = [...document.querySelectorAll('#stage button')];
    const sb = els.find((e) => /passEvent|pickEventOpt|confirmEventNum|__introNext/.test(e.getAttribute('onclick') || '')) || els.find((e) => !e.disabled);
    if (sb) { sb.click(); return 0; }
  }
  return 1;
})()`;

/* 一進 #duel 就停拍：在頁內掛 MutationObserver，#duel 一顯示就同步把 PW_FX *_MS 拉長（之後所有 pwSleep 都等 10 分鐘） */
const FREEZE_HOOK = () => {
  const mo = new MutationObserver(() => {
    const d = document.getElementById('duel');
    if (!d || window.__frozen || getComputedStyle(d).display === 'none') return;
    const F = window.__yaoshi && window.__yaoshi.PW_FX; if (!F) return;
    for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 600000;
    window.__frozen = Date.now();
  });
  mo.observe(document.documentElement, { subtree: true, attributes: true, childList: true, attributeFilter: ['style', 'class'] });
};

async function one(browser, tag) {
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.setItem('yaoshi_intro_v1', '1'); } catch (e) {} });
  if (tag === 'base') await ctx.route(`http://127.0.0.1:${PORT}/**`, (route) => {
    const u = new URL(route.request().url()); const raw = decodeURIComponent(u.pathname), p = raw === '/' ? '/index.html' : raw;
    const buf = fromBase(p); if (buf) return route.fulfill({ status: 200, body: buf, contentType: CT[path.extname(p)] || 'application/octet-stream' });
    return route.continue();
  });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html?nwall=1`, { waitUntil: 'load' });
  await page.waitForFunction('typeof window.__yaoshi === "object"', null, { timeout: 30000 });
  await page.evaluate(() => { CFG.T = 1; const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1; });
  await page.evaluate(() => startEntry('nightwalk'));
  await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'menu');
  await page.evaluate((c) => document.querySelector(`#nwScr .nwCard[data-ch="${c}"] .nwBtns button`).click(), CH);
  await page.waitForFunction(() => document.getElementById('nwScr').dataset.view === 'intro');
  await page.evaluate(() => document.getElementById('nwGo').click());
  await page.waitForFunction(() => document.querySelectorAll('#selGrid .rcard:not(.taken)').length > 0);
  await page.evaluate(() => document.querySelectorAll('#selGrid .rcard:not(.taken)')[0].click());
  await page.waitForTimeout(100);
  await page.evaluate(FREEZE_HOOK);
  await page.evaluate((sd) => { SEL.picks.push(SEL.cur); SEL.cur = null; document.getElementById('selectScr').classList.remove('on'); newGame('solo', sd, SEL.picks, { chapter: SEL.chapter }); }, SEED);
  for (let i = 0; i < 20000; i++) {
    if (await page.evaluate(() => !!window.__frozen)) break;
    await page.evaluate(DRIVE_STEP); await page.waitForTimeout(10);
  }
  /* 停拍後等目前這一拍的 pwSleep（已用 1ms 起算的）走完、進到下一個 10 分鐘的等待；再讓所有 WAAPI 到終點 */
  await page.waitForFunction(() => document.querySelectorAll('#pwch-A i.pwfac, #pwch-B i.pwfac').length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
  await page.waitForTimeout(200);
  const state = await page.evaluate(() => { const S = window.__yaoshi.S; return { round: S.round, chapter: S.chapter, seats: S.players.map((p) => p.roleId), bags: S.players.map((p) => p.bag.map((x) => x.id || x.n).join(',')) }; });
  const hide = async (on) => page.evaluate((v) => { let s = document.getElementById('__h'); if (v && !s) { s = document.createElement('style'); s.id = '__h'; s.textContent = '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}'; document.head.appendChild(s); } if (!v && s) s.remove(); }, on);
  const rectsBefore = await page.evaluate(() => [...document.querySelectorAll('#pwch-A i.pwfac, #pwch-B i.pwfac')].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)); }));
  await hide(true); const bg = await page.screenshot(); await hide(false);
  const chips = await page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const cv = new OffscreenCanvas(img.width, img.height), cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    return [...document.querySelectorAll('#pwch-A i.pwfac, #pwch-B i.pwfac')].map((p) => {
      const cs = getComputedStyle(p), col = cs.color.match(/[\d.]+/g).map(Number); let op = 1; for (let a = p; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
      const rg = document.createRange(); rg.selectNodeContents(p); const q = rg.getClientRects()[0]; const fs = parseFloat(cs.fontSize), cy = (q.top + q.bottom) / 2;
      const d = cx.getImageData(Math.floor(q.left), Math.floor(cy - fs / 2), Math.max(1, Math.floor(q.width)), Math.max(1, Math.floor(fs))).data;
      const px = [[], [], []]; for (let i = 0; i < d.length; i += 4) { px[0].push(d[i]); px[1].push(d[i + 1]); px[2].push(d[i + 2]); }
      const med = px.map((a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; });
      const fa = (col[3] == null ? 1 : col[3]) * op, fg = [0, 1, 2].map((k) => col[k] * fa + med[k] * (1 - fa));
      const l1 = L(fg), l2 = L(med);
      return { sel: '#' + p.parentElement.id + ' > i.pwfac', text: p.textContent, cls: p.className, ratio: +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2)), fg: fg.map(Math.round), bg: med, op: +op.toFixed(2), bgCss: cs.backgroundColor };
    });
  }, bg.toString('base64'));
  const rectsAfter = await page.evaluate(() => [...document.querySelectorAll('#pwch-A i.pwfac, #pwch-B i.pwfac')].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)); }));
  const shot = OUT ? OUT.replace(/\.json$/, `-${tag}.png`) : null; if (shot) await page.screenshot({ path: shot });
  await ctx.close();
  return { tag, state, chips, stable: JSON.stringify(rectsBefore) === JSON.stringify(rectsAfter), errs, shot: shot && path.basename(shot) };
}

const srv = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
let res;
try { res = { base: await one(browser, 'base'), head: await one(browser, 'head') }; } finally { await browser.close(); srv.kill(); }
const sameState = JSON.stringify(res.base.state) === JSON.stringify(res.head.state);
const pair = res.base.chips.map((b, i) => { const h = res.head.chips[i] || {}; return { sel: b.sel, text: [b.text, h.text], ratio: [b.ratio, h.ratio], bg: [b.bg, h.bg], same: b.text === h.text && b.ratio === h.ratio && JSON.stringify(b.bg) === JSON.stringify(h.bg) }; });
const out = { seed: SEED, ch: CH, base: BASE, sameState, stable: [res.base.stable, res.head.stable], allSame: sameState && pair.length === res.head.chips.length && pair.every((x) => x.same), minRatio: Math.min(...res.head.chips.map((c) => c.ratio)), pair, raw: res };
console.log(JSON.stringify({ sameState: out.sameState, stable: out.stable, allSame: out.allSame, minRatio: out.minRatio, pair }, null, 1));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
