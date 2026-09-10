/* Tier 3 的黑條 letterbox 與 CINEMA 機位「只在 tier 3 出現」的機械斷言（v0.54，凍結檔 F5 機械段）。
 * 用法：node tests/tools/lbox-probe.mjs <out.json> [--port=9552] [--root=<靜態根>]
 *
 * 三件事一起驗（正反都要，02 §6.1 第 1 條）：
 *   L1 反面（tier 1／2 一個 CINEMA 幀都不該有）：派 tier 1 與 tier 2 的 ys:fx-trait，
 *      逐幀取樣 director.cinemaOn()，全程必須 false。
 *   L2 正面（tier 3 真的會出現）：派 tier 3 的 ys:fx-trait，cinemaOn() 必須在 ms 內為 true，
 *      並在 ms+outMs 之後回到 false（不會卡住）。
 *   L3 黑條 DOM：pwLetterbox(true) 之後 #lbTop／#lbBot 的實際高度 >0，
 *      pwLetterbox(false) 之後回到 0；正式頁面初始狀態必須是 0（沒人開就不存在）。
 *
 *   L4 黑條不進 renderer：同一頁面、同一場景、同一幀只切黑條，draw calls／triangles 逐值相同。
 *   L5 取消路徑（R1 覆審 C1）：tier 3 演到一半派 ys:fx-trait-cancel（＝doSkip 那條），
 *      CINEMA.outMs＋餘裕內 cinemaOn() 必須是 false；再驗 ys:duel-end 與 ys:table 兩條入口。
 *
 * 為什麼還要在這裡派合成事件：一局裡有沒有 tier 3 取決於袋子裡有沒有三尊，在這支探針裡逼不出來。
 * ★真實對局那一半在 tests/tools/duel-drive.mjs★：它對 #lbTop／#lbBot 掛 MutationObserver，
 * 逐場算出「黑條可見的累計毫秒」（cur.lboxMs），配 FXC.tiers 的逐場快照判「tier 1／2 的場必須是 0」。
 * （一版這裡寫「由 duel-drive 的 MutationObserver 覆蓋」時，那個 observer 根本不存在——R1 覆審 H3 抓到的不實宣稱。）
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { msOf, TIER_BASE_MS, LETTERBOX_IDS } from './fx-consts.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright');
})();

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else pos.push(a); }
const out = pos[0] || path.join(ROOT, 'scratchpad', 'lbox-probe.json');
const port = Number(opt.port || 9552);
const root = opt.root ? path.resolve(opt.root) : ROOT;

const srv = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

/* 極簡 PNG 解碼（只支援 Playwright 截圖會產出的 8-bit RGBA，colorType 6）：
   把 IDAT 拼起來 inflate，逐 scanline 反 filter，回傳平均亮度 (R+G+B)/3。
   為什麼要自己解：H2 要驗的是「玩家看不看得到黑條」＝**像素**，
   一版只驗 getBoundingClientRect().height（DOM 幾何），對這件事零鑑別力
   （實測 z-index:-1 時黑條只把亮度從 27.27 壓到 17.31，畫面上是灰紫帶不是黑條）。 */
function pngMeanLuma(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('不是 PNG');
  let pos = 8, w = 0, h = 0, bd = 0, ct = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  // Playwright 不透明截圖給的是 colorType 2（RGB，3 bytes/px）；有 alpha 時是 6（RGBA，4）
  if (bd !== 8 || (ct !== 6 && ct !== 2)) throw new Error(`只支援 8-bit RGB/RGBA，拿到 bd=${bd} ct=${ct}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const A = x >= bpp ? cur[x - bpp] : 0, B = prev[x], C = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (ft === 1) v += A; else if (ft === 2) v += B; else if (ft === 3) v += (A + B) >> 1;
      else if (ft === 4) { const pa = Math.abs(B - C), pb = Math.abs(A - C), pc = Math.abs(A + B - 2 * C); v += (pa <= pb && pa <= pc) ? A : (pb <= pc ? B : C); }
      cur[x] = v & 255;
    }
  }
  let sum = 0;
  for (let i = 0; i < out.length; i += bpp) sum += (out[i] + out[i + 1] + out[i + 2]) / 3;
  return +(sum / (w * h)).toFixed(2);
}

const res = {};
try {
  await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window.__yaoshi3d && window.__yaoshi3d.director), null, { timeout: 30000 });

  // L3：黑條 DOM 的初始狀態與開關能力
  res.L3 = await page.evaluate((ids) => {
    const h = () => ids.map((id) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().height : -1; });
    const before = h();
    window.__yaoshi.pwLetterbox(true);
    const onCls = ids.map((id) => document.getElementById(id).classList.contains('on'));
    window.__yaoshi.pwLetterbox(false);
    const offCls = ids.map((id) => document.getElementById(id).classList.contains('on'));
    return { before, onCls, offCls, exists: ids.every((id) => !!document.getElementById(id)) };
  }, LETTERBOX_IDS);
  // CSS transition 要時間才長出來：開著等 400ms 再量真實高度
  res.L3.onHeight = await page.evaluate(async (ids) => {
    window.__yaoshi.pwLetterbox(true);
    await new Promise((r) => setTimeout(r, 400));
    const v = ids.map((id) => document.getElementById(id).getBoundingClientRect().height);
    window.__yaoshi.pwLetterbox(false);
    await new Promise((r) => setTimeout(r, 400));
    const back = ids.map((id) => document.getElementById(id).getBoundingClientRect().height);
    return { open: v, back };
  }, LETTERBOX_IDS);

  /* L4：黑條是 DOM，不得增加 draw call（凍結檔 F6）。
     ★為什麼不比「新版 vs 基準」的 duel-perf 數字★：那個量測在**基準自己身上**就會在
     926～960 之間跳（實測 base 926／960／926，new 924／964／962／960，兩組分布重疊），
     波動來源是每局袋子不同→場上妖的種類不同→mesh 數不同，屬於輸入資料的自然波動。
     用它判「有沒有 +1」沒有鑑別力。改成**同一頁面、同一場景、同一幀**只切黑條：
     開與關的 renderer.info.render.calls 必須逐值相同——這才是決定性的對照。 */
  res.L4 = await page.evaluate(async () => {
    const R = window.__yaoshi3d.renderer;
    const frame = () => new Promise((r) => requestAnimationFrame(() => r({ calls: R.info.render.calls, tris: R.info.render.triangles })));
    window.__yaoshi.pwLetterbox(false);
    await frame(); const off = await frame();
    window.__yaoshi.pwLetterbox(true);
    await frame(); const on = await frame();
    window.__yaoshi.pwLetterbox(false);
    await frame(); const off2 = await frame();
    return { off, on, off2 };
  });

  // L1／L2：對每個 tier 派一次 ys:fx-trait，逐幀取樣 cinemaOn()
  const probe = async (tier, ms) => page.evaluate(async ({ tier, ms, base }) => {
    const D = window.__yaoshi3d.director;
    const samples = [];
    document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { trId: 'probe', side: 'A', foeSide: 'B', fac: 'zuling', power: 0.8, ms, tier, baseMs: base, handled: false, done: null } }));
    const t0 = performance.now();
    // 取樣到 ms + 600（涵蓋 CINEMA 的 outMs 320 ＋ 餘裕），每 ~16ms 一筆
    while (performance.now() - t0 < ms + 600) {
      samples.push({ t: Math.round(performance.now() - t0), on: !!D.cinemaOn(), k: +D.cinemaK().toFixed(3) });
      await new Promise((r) => requestAnimationFrame(r));
    }
    return samples;
  }, { tier, ms, base: TIER_BASE_MS });

  for (const tier of [1, 2, 3]) {
    const ms = msOf(tier);
    const s = await probe(tier, ms);
    const onCount = s.filter((x) => x.on).length;
    const maxK = Math.max(0, ...s.map((x) => x.k));
    const during = s.filter((x) => x.t <= ms);
    const tail = s.filter((x) => x.t > ms + 400);
    res['tier' + tier] = {
      ms, samples: s.length, onCount, maxK,
      onDuring: during.filter((x) => x.on).length,
      onAtTail: tail.filter((x) => x.on).length,
    };
    await page.waitForTimeout(500); // 讓上一次完全收乾淨再測下一個
  }
  /* L5（R1 覆審 C1）：CINEMA 的三條取消路徑。派 tier 3 之後演到一半就送取消事件，
     CINEMA.outMs(320)＋餘裕內 cinemaOn() 必須變成 false。三個入口各驗一次。 */
  const cancelProbe = async (evName) => page.evaluate(async ({ evName, ms, base }) => {
    const D = window.__yaoshi3d.director;
    document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { trId: 'probe', side: 'A', foeSide: 'B', fac: 'zuling', power: 0.8, ms, tier: 3, baseMs: base, handled: false, done: null } }));
    const t0 = performance.now();
    while (performance.now() - t0 < 400) await new Promise((r) => requestAnimationFrame(r)); // 讓 CINEMA 推到滿幅
    const kAtCancel = D.cinemaK();
    document.dispatchEvent(new CustomEvent(evName, { detail: {} }));
    const tc = performance.now();
    const samples = [];
    while (performance.now() - tc < 700) { samples.push({ t: Math.round(performance.now() - tc), on: !!D.cinemaOn(), k: +D.cinemaK().toFixed(3) }); await new Promise((r) => requestAnimationFrame(r)); }
    return { kAtCancel: +kAtCancel.toFixed(3), samples };
  }, { evName, ms: msOf(3), base: TIER_BASE_MS });

  res.L5 = {};
  for (const ev of ['ys:fx-trait-cancel', 'ys:duel-end', 'ys:table']) {
    const r = await cancelProbe(ev);
    const after300 = r.samples.filter((x) => x.t >= 320 + 80);
    res.L5[ev] = { kAtCancel: r.kAtCancel, onAfter300: after300.filter((x) => x.on).length, samples: r.samples.length,
      lastOnT: r.samples.filter((x) => x.on).map((x) => x.t).pop() ?? -1 };
    await page.waitForTimeout(500);
  }

  /* L6（R1 覆審 H2）：黑條的**像素**證據。同一個畫面 on／off 各截一張，
     比上下 8vh 帶的平均亮度；中段當對照組（不該變）。 */
  const shot = async (on) => {
    await page.evaluate((v) => window.__yaoshi.pwLetterbox(v), on);
    await page.waitForTimeout(400); // CSS transition 220ms
    const h = 390, band = Math.round(h * 0.08);
    const top = await page.screenshot({ clip: { x: 0, y: 0, width: 844, height: band } });
    const bot = await page.screenshot({ clip: { x: 0, y: h - band, width: 844, height: band } });
    const mid = await page.screenshot({ clip: { x: 0, y: Math.round(h / 2) - 20, width: 844, height: 40 } });
    return { top: pngMeanLuma(top), bot: pngMeanLuma(bot), mid: pngMeanLuma(mid) };
  };
  // 先把對決覆蓋層叫出來（黑條的意義是「蓋在對決畫面上」）
  await page.evaluate(() => { const d = document.getElementById('duel'); if (d) d.style.display = 'block'; });
  res.L6 = { off: await shot(false), on: await shot(true) };
  await page.evaluate(() => window.__yaoshi.pwLetterbox(false));

} finally {
  await ctx.close();
  await browser.close();
  srv.kill();
}

// 判定
const v = {
  // L1：tier 1／2 期間 CINEMA 一幀都不准出現（凍結檔 F5「CINEMA 僅 tier 3」）
  L1: res.tier1.onCount === 0 && res.tier2.onCount === 0,
  // L2：tier 3 期間必須真的出現（正面），而且結束後會收乾淨（不卡住）
  L2: res.tier3.onDuring > 0 && res.tier3.maxK > 0.9 && res.tier3.onAtTail === 0,
  // L3：黑條初始高度 0、開了之後 >0、關了回到 0
  L3: res.L3.exists && res.L3.before.every((h) => h === 0)
    && res.L3.onHeight.open.every((h) => h > 0) && res.L3.onHeight.back.every((h) => h === 0),
  // L4：黑條開關不得動到 draw call／三角形數（它是 DOM，不進 renderer）
  L4: res.L4.on.calls === res.L4.off.calls && res.L4.on.calls === res.L4.off2.calls
    && res.L4.on.tris === res.L4.off.tris,
  // L5（R1 C1）：三條取消路徑都要在 outMs＋餘裕內把 CINEMA 收掉
  L5: Object.values(res.L5).every((x) => x.kAtCancel > 0.9 && x.onAfter300 === 0),
  // L6（R1 H2）：黑條要真的把上下帶壓黑（≤10/255），中段不得變（對照組，證明量測位置對）
  L6: res.L6.on.top <= 10 && res.L6.on.bot <= 10
    && res.L6.on.top < res.L6.off.top && res.L6.on.bot < res.L6.off.bot
    && Math.abs(res.L6.on.mid - res.L6.off.mid) < 2,
  errors: errors.length,
};
v.PASS = v.L1 && v.L2 && v.L3 && v.L4 && v.L5 && v.L6 && errors.length === 0;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ verdict: v, res, errors }, null, 1));
console.log(JSON.stringify({ verdict: v, tier1: res.tier1, tier2: res.tier2, tier3: res.tier3, lbox: res.L3, draws: res.L4, cancel: res.L5, pixels: res.L6 }));
console.log(`VERDICT L1=${v.L1 ? 'PASS' : 'FAIL'} L2=${v.L2 ? 'PASS' : 'FAIL'} L3=${v.L3 ? 'PASS' : 'FAIL'} L4=${v.L4 ? 'PASS' : 'FAIL'} L5=${v.L5 ? 'PASS' : 'FAIL'} L6=${v.L6 ? 'PASS' : 'FAIL'} err=${errors.length} → ${v.PASS ? 'PASS' : 'FAIL'}`);
process.exit(v.PASS ? 0 : 1);
