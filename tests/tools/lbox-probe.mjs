/* 凍結檔 F5「機械段」的判定（v0.54 收尾版，2026-09-11 §2.1 修訂七之後）。
 * 用法：node tests/tools/lbox-probe.mjs <out.json> [--port=9552] [--root=<靜態根>] [--baserects=<v0.53 rect 快照>]
 *
 * ★本卷的 tier 3 只剩兩件事：1400ms 與 CINEMA 低角度仰視機位★
 * 黑邊 letterbox 經 r2–r5 五輪覆審後，由使用者 2026-09-11 裁定移出本卷（連同「對決版面安全區」
 * 留給招式可辨性卷重做，理由見凍結檔 §2.1 修訂七）。所以這支探針要守的事換成三條：
 *
 *   L1 反面（CINEMA 只在 tier 3）：派 tier 1 與 tier 2 的 ys:fx-trait，逐幀取樣 director.cinemaOn()，
 *      全程必須 false。
 *   L2 正面（tier 3 真的會出現、而且收得乾淨）：派 tier 3，cinemaOn() 必須在 ms 內為 true，
 *      並在 ms+outMs 之後回到 false。
 *   L5 取消路徑（R1 覆審 C1）：tier 3 演到一半派 ys:fx-trait-cancel／ys:duel-end／ys:table，
 *      CINEMA.outMs(320)＋餘裕內 cinemaOn() 必須是 false。
 *   L8 CINEMA 吃 ?closeup=0（R2 覆審 N5）：?closeup=0 時 tier 3 的 maxK 必須是 0。
 *      ★收尾版起 ?closeup=0 只管 CINEMA 這一件事★（黑條沒了，原本那半條斷言一併移除）。
 *   L9 黑條 DOM 不存在：#lbTop／#lbBot 在 DOM 中查不到，且原始碼裡沒有 `.lbox` 規則、沒有 pwLetterbox。
 *   ★L10 tier 3 的版面與 v0.53 逐值相同★（本節主條，取代 r2–r5 的 L3/L4/L6/L7）：
 *      真實對局裡三尊大招那一拍，#duel 底下**所有可見子孫**的 rect 與 v0.53 基準樹同錨點逐值相同。
 *      取樣＝錨點 +300／+700／+800ms、**與基準配對成功的錨點 ≥3 個**（分屬 3 場不同的對決）、橫式與直式兩種方向。
 *      量測與比對在 tests/tools/duel-rects.mjs（那支檔頭寫了為什麼改成相等性、以及兩棵樹怎麼對齊）。
 *      基準快照用 `--baserects=` 指進來（由 v0.53 樹跑同一支 duel-rects 產生）。
 *      **沒給 --baserects 就整支紅**，不是跳過——「拿不到基準」不得當成通過。
 *
 * 為什麼 L1／L2／L5／L8 還要在這裡派合成事件：一局裡有沒有 tier 3 取決於袋子裡有沒有三尊，
 * 在單頁探針裡逼不出來；L10 那一條才是走真實對局的（由 duel-rects 驅動）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './duel-drive.mjs';
import { msOf, TIER_BASE_MS, LETTERBOX_IDS } from './fx-consts.mjs';
import { loadChromium, collectRects, compareRects, assertTier3Ids } from './duel-rects.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const chromium = loadChromium();

const argv = process.argv.slice(2);
const pos = [], opt = {};
const KNOWN = new Set(['port', 'root', 'baserects', 'duels']);
for (const a of argv) {
  const m = a.match(/^--([a-z0-9]+)=(.*)$/i);
  if (m) { if (!KNOWN.has(m[1])) throw new Error(`未知旗標 --${m[1]}（合法：${[...KNOWN].join('/')}）`); opt[m[1]] = m[2]; }
  else pos.push(a);
}
const out = pos[0] || path.join(ROOT, 'scratchpad', 'lbox-probe.json');
const port = Number(opt.port || 9552);
const root = opt.root ? path.resolve(opt.root) : ROOT;
const duels = Number(opt.duels || 18);
const baseRectsPath = opt.baserects ? path.resolve(opt.baserects) : null;

const srv = await serve(root, port);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const res = {};
try {
  await page.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window.__yaoshi3d && window.__yaoshi3d.director), null, { timeout: 30000 });

  /* L9：黑條的每一個殘跡都要不存在。DOM 兩個 id ＋ 原始碼三個字串（CSS 規則、開關函式、匯出）。
     為什麼連原始碼一起掃：只驗 getElementById 回 null，改成 `display:none` 的 div 也會過。 */
  res.L9 = await page.evaluate((ids) => ({
    dom: ids.map((id) => !!document.getElementById(id)),
    api: typeof (window.__yaoshi || {}).pwLetterbox,
  }), LETTERBOX_IDS);
  {
    const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    res.L9.src = {
      lbox: (src.match(/\.lbox\b/g) || []).length,
      pwLetterbox: (src.match(/pwLetterbox/g) || []).length,
      ids: LETTERBOX_IDS.map((id) => (src.match(new RegExp('"' + id + '"', 'g')) || []).length),
    };
  }
  // 錨點與實作不得分岔（新版樹才有 tier 欄位）
  res.tier3Ids = await assertTier3Ids(page);

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

  /* L8（R2 覆審 N5）：?closeup=0 是「近景切鏡」的總開關，CINEMA 也是近景（dist 2.9／tilt 8°，
     比 FOCUS 的 2.6 更兇），所以它要一起被關掉。另開一個 context 載 ?closeup=0 的頁面來量。
     ★走演出層那條路★：det.cinema 由 pwTraitFx 帶 pwCloseup()，這裡照抄同一個表達式，
     驗的是「那條路徑會不會切機位」，不是「直接派 cinema:true 切不切得動」。 */
  {
    const ctx2 = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', (e) => errors.push('closeup0: ' + String((e && e.message) || e)));
    p2.on('console', (m) => { if (m.type() === 'error') errors.push('closeup0 console: ' + m.text()); });
    await p2.goto(`http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=7&closeup=0`, { waitUntil: 'load' });
    await p2.waitForFunction(() => !!(window.__yaoshi3d && window.__yaoshi3d.director), null, { timeout: 30000 });
    res.L8 = await p2.evaluate(async ({ ms, base }) => {
      const D = window.__yaoshi3d.director;
      const closeupOn = !!window.__yaoshi.PW_FX.CLOSEUP_ON;
      document.dispatchEvent(new CustomEvent('ys:fx-trait', { detail: { trId: 'probe', side: 'A', foeSide: 'B', fac: 'zuling', power: 0.8, ms, tier: 3, cinema: window.__yaoshi.PW_FX.CLOSEUP_ON, baseMs: base, handled: false, done: null } }));
      const t0 = performance.now();
      let maxK = 0, onCount = 0;
      while (performance.now() - t0 < ms + 400) { const k = D.cinemaK(); if (k > maxK) maxK = k; if (D.cinemaOn()) onCount++; await new Promise((r) => requestAnimationFrame(r)); }
      return { closeupOn, maxK: +maxK.toFixed(3), onCount };
    }, { ms: msOf(3), base: TIER_BASE_MS });
    await ctx2.close();
  }

  /* ★L10★：tier 3 那一拍的版面與 v0.53 基準樹逐值相同（真實對局、兩種方向）。 */
  const url = `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=7`;
  res.L10 = {
    baserects: baseRectsPath,
    land: await collectRects(browser, url, { w: 844, h: 390, duels }),
    port: await collectRects(browser, url, { w: 390, h: 844, duels }),
  };
  if (baseRectsPath) {
    const base = JSON.parse(fs.readFileSync(baseRectsPath, 'utf8'));
    res.L10.cmpLand = compareRects(res.L10.land.rects, base.land.rects);
    res.L10.cmpPort = compareRects(res.L10.port.rects, base.port.rects);
  }
} finally {
  await ctx.close();
  await browser.close();
  srv.kill();
}

// 判定
const NEED_ANCHORS = 3, NEED_TIMEPOINTS = 3;
const l10 = (side, cmp) => {
  if (!cmp) return { ok: false, why: '沒給 --baserects（拿不到 v0.53 基準快照＝不算過）' };
  const rs = res.L10[side].rects;
  const anchors = cmp.matchedAnchors;           // ★配對成功的錨點數★，不是新版自己有幾個
  const els = cmp.elsChecked;                   // ★真的逐值比過的元素數★
  /* 活性（相等性斷言必附，02 §6.1 第 1 條）：配對成功的錨點 ≥3、每個錨點三個時點都配上、
     真的比到元素、而且沒有頁面錯誤。兩邊一起空也會「逐值相同」，所以這四條缺一不可。 */
  if (anchors < NEED_ANCHORS) return { ok: false, why: `配對成功的錨點只有 ${anchors} 個（需 ≥${NEED_ANCHORS}）`, anchors, els, unmatched: cmp.unmatched };
  if (cmp.checked < anchors * NEED_TIMEPOINTS) return { ok: false, why: `配對樣本 ${cmp.checked} < 錨點 ${anchors}×${NEED_TIMEPOINTS} 時點`, anchors, els };
  if (!rs.every((s) => s.n > 0)) return { ok: false, why: '有樣本掃到 0 個可見元素', anchors, els };
  if (res.L10[side].errors.length) return { ok: false, why: `頁面錯誤 ${res.L10[side].errors.length}`, anchors, els };
  if (!cmp.same) return { ok: false, why: `rect 與基準不同：${cmp.diffs.length} 處（首筆 ${JSON.stringify(cmp.diffs[0])}）`, anchors, els, diffs: cmp.diffs.slice(0, 8) };
  return { ok: true, anchors, els, checked: cmp.checked, elsChecked: cmp.elsChecked, unmatched: cmp.unmatched.length };
};
const jLand = l10('land', res.L10.cmpLand), jPort = l10('port', res.L10.cmpPort);

const v = {
  // L1：tier 1／2 期間 CINEMA 一幀都不准出現（凍結檔 F5「CINEMA 僅 tier 3」）
  L1: res.tier1.onCount === 0 && res.tier2.onCount === 0,
  // L2：tier 3 期間必須真的出現（正面），而且結束後會收乾淨（不卡住）
  L2: res.tier3.onDuring > 0 && res.tier3.maxK > 0.9 && res.tier3.onAtTail === 0,
  // L5（R1 C1）：三條取消路徑都要在 outMs＋餘裕內把 CINEMA 收掉
  L5: Object.values(res.L5).every((x) => x.kAtCancel > 0.9 && x.onAfter300 === 0),
  // L8（R2 N5）：?closeup=0 時 tier 3 一個 CINEMA 幀都不該有
  L8: res.L8.closeupOn === false && res.L8.maxK === 0 && res.L8.onCount === 0,
  // L9（修訂七）：黑條在 DOM、在 API、在原始碼裡都不存在
  L9: res.L9.dom.every((x) => x === false) && res.L9.api === 'undefined'
    && res.L9.src.lbox === 0 && res.L9.src.pwLetterbox === 0 && res.L9.src.ids.every((n) => n === 0),
  // L10（修訂七主條）：tier 3 那一拍的版面與 v0.53 逐值相同，橫式與直式都要
  L10: jLand.ok && jPort.ok,
  errors: errors.length,
};
v.L10detail = { land: jLand, port: jPort };
v.PASS = v.L1 && v.L2 && v.L5 && v.L8 && v.L9 && v.L10 && errors.length === 0;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ verdict: v, res, errors }, null, 1));
console.log(JSON.stringify({ verdict: { ...v, L10detail: undefined }, tier1: res.tier1, tier2: res.tier2, tier3: res.tier3, cancel: res.L5, closeup0: res.L8, lbGone: res.L9, rects: v.L10detail }));
console.log(`VERDICT L1=${v.L1 ? 'PASS' : 'FAIL'} L2=${v.L2 ? 'PASS' : 'FAIL'} L5=${v.L5 ? 'PASS' : 'FAIL'} L8=${v.L8 ? 'PASS' : 'FAIL'} L9=${v.L9 ? 'PASS' : 'FAIL'} L10=${v.L10 ? 'PASS' : 'FAIL'} err=${errors.length} → ${v.PASS ? 'PASS' : 'FAIL'}`);
process.exit(v.PASS ? 0 : 1);
