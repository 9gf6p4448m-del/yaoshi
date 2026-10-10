/* 招式特寫＋字幕不阻塞（?movecam，使用者 2026-10-10 裁乙＋出招者特寫；覆審 M1／M2／M3／L1 補強）。
   跑法：node tests/movecam.test.mjs [index.html 路徑]（預設＝../index.html）；playwright 找 tools/anyCreature，或設 YAOSHI_PW_ROOT。
   鑑別力：對 71918da5／2a144ac7 的 index.html 跑必須紅在行為斷言（多停毫秒、特寫對準誰、殘影是否蓋住字幕、結尾列），不是例外。
   全部在真頁面真 PW_FX／真 pwPlayBeat／真 CSS 版面上跑（不自己替身 PW_FX——先套 sfx-wiring 治具的「所有 *_MS 設成 1」迴圈，
   證明 hold 與字幕時長鍵不會被它改成 NaN／1）；只換掉會碰 3D 的那幾支（pwTraitFx／pwSleep／fx3d／pwFigsOf／pwFigureOf）。 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const TARGET = path.resolve(process.argv[2] || path.join(ROOT, 'index.html'));
function loadPlaywright() {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'),
    ...(process.env.YAOSHI_PW_ROOT ? [path.join(process.env.YAOSHI_PW_ROOT, 'package.json')] : [])];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright（設 YAOSHI_PW_ROOT 指向含 node_modules/playwright 的目錄）');
}
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
async function open(query = '') {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.goto(pathToFileURL(TARGET).href + '?paperwar=1' + query, { waitUntil: 'load' });
  await page.evaluate(() => { /* sfx-wiring 治具（tests/sfx-wiring.test.mjs newGame）逐字同一個迴圈 */
    const F = window.__yaoshi.PW_FX; for (const k of Object.keys(F)) if (/_MS$/.test(k)) F[k] = 1;
    window.__yaoshi.newGame('solo', 1, ['qingmian']); /* pwPlayBeat 讀 S.rngUi：要有真局面 */
  });
  return page;
}

/* ── ① 真 pwPlayBeat：一支 staged 招式實際等多久、特寫對準誰（M1／M3） ── */
async function runBeat(page, { level, tier, unitsB, figs }) {
  return page.evaluate(async ({ level, tier, unitsB, figs }) => {
    const Y = window.__yaoshi; Y.PW_FX.MOVECAM_LEVEL = level;
    const trId = Object.keys(Y.TRAITS).find((k) => Y.pwMoveTier(k, tier) === tier && Y.pwMoveCapText(k).item);
    const item = Y.pwMoveCapText(trId).item;
    const sleeps = [], ev = []; const save = {};
    for (const n of ['pwSleep', 'pwTraitFx', 'fx3d', 'pwFigsOf', 'pwFigureOf', 'pwBeatTier', 'pwBeatMinMs']) save[n] = window[n];
    window.pwSleep = async (ms) => { sleeps.push(ms); };
    window.pwTraitFx = () => true;
    window.fx3d = (n, d) => ev.push([n, d]);
    window.pwBeatTier = () => tier;
    window.pwBeatMinMs = () => 0;
    const fig = (id, vis) => ({ group: { visible: vis }, unit: { id } });
    window.pwFigsOf = (side) => side === 'A' ? [fig(7, true)] : [];
    window.pwFigureOf = (side, id) => (side === 'B' && figs[id] !== undefined) ? fig(id, figs[id]) : null;
    const views = [{ units: [{ id: 7, nm: '別的' }] }, { units: unitsB.map((id) => ({ id, nm: item })) }];
    try {
      await window.pwPlayBeat({ war: {}, A: { name: 'A' }, B: { name: 'B' } }, 1, [{ kind: 'trait', trId, side: 'B' }], views);
    } finally { Object.assign(window, save); }
    const foc = ev.find(([n, d]) => n === 'ys:fx-focus' && d.kind === 'trait');
    return { sleeps, focus: foc ? foc[1] : null, tierMs: Y.pwTierMs(tier), holdArr: Y.PW_FX.MOVECAM_HOLD, mul: Y.PW_FX.MOVECAM_TIER_MUL };
  }, { level, tier, unitsB, figs });
}
{
  const page = await open();
  const sum = (r) => r.sleeps.reduce((a, b) => a + b, 0);
  const one = { unitsB: [3], figs: { 3: true } };
  const off = await runBeat(page, { level: 0, tier: 1, ...one });
  assert.equal(off.focus, null, 'movecam=0 不派特寫');
  const light = await runBeat(page, { level: 1, tier: 1, ...one });
  assert.ok(Array.isArray(light.holdArr) && light.holdArr.every(Number.isFinite), `治具迴圈後 MOVECAM_HOLD 仍是有限數陣列：${JSON.stringify(light.holdArr)}`);
  assert.equal(sum(light) - sum(off), 250, '輕：tier1 每招比 movecam=0 多停 250ms（治具迴圈之後仍成立）');
  const mid = await runBeat(page, { level: 2, tier: 1, ...one });
  assert.equal(sum(mid) - sum(off), 500, '中：tier1 多停 500ms');
  const mid2 = await runBeat(page, { level: 2, tier: 2, ...one });
  const off2 = await runBeat(page, { level: 0, tier: 2, ...one });
  assert.equal(sum(mid2) - sum(off2), 750, '中：tier2 多停 500×1.5');
  assert.ok(light.focus, '輕：招式派出 ys:fx-focus（kind=trait），治具迴圈下特寫確實執行');
  assert.deepEqual([light.focus.side, light.focus.actor, light.focus.foeSide, light.focus.target], ['B', 3, 'A', 7]);
  assert.equal(light.focus.ms, light.tierMs + 250, '特寫長度＝招式時長＋hold');
  /* M3：同法寶整隊同名，排序第一尊（id 0）已燒毀／被遞補換掉（figureOf 無此尊或不可見），特寫必須對準真正在場的那尊（id 2） */
  for (const figs of [{ 1: false, 2: true }, { 2: true }]) {
    const r = await runBeat(page, { level: 1, tier: 1, unitsB: [0, 1, 2], figs });
    assert.ok(r.focus, 'M3：有在場的出招者就要切鏡');
    assert.equal(r.focus.actor, 2, `M3：特寫對準在場那尊（id 2），不是排序第一尊：${JSON.stringify(figs)}`);
  }
  const none = await runBeat(page, { level: 1, tier: 1, unitsB: [0, 1], figs: { 0: false } });
  assert.equal(none.focus, null, '同名單位全都不在場＝不切鏡（不對著不存在的尊）');
  await page.close();
}

/* ── ② 真頁面版面：字幕留存、殘影不蓋主字幕（M2）、結尾列（L1） ── */
async function layoutRun(query, steps) {
  const page = await open(query);
  const r = await page.evaluate(async (steps) => {
    const d = document.getElementById('duel'); d.classList.add('pw'); d.style.display = 'flex'; /* 真版面：#duel 是 column flex（不是 display:block 假版面） */
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rect = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
    const out = []; const T0 = performance.now();
    const vis = (txt) => [...document.querySelectorAll('#duelMove,.mvghost')].some((e) => e.textContent.includes(txt) && getComputedStyle(e).opacity > 0.05);
    let lastSeen = 0; const poll = setInterval(() => { if (vis(steps.watch)) lastSeen = performance.now() - T0; }, 16);
    for (const s of steps.caps) {
      window.pwMoveCap(s.who, s.item, s.move, s.desc, s.fac, s.side);
      await sleep(s.after);
      out.push({ main: rect(document.getElementById('duelMove')), ghosts: [...document.querySelectorAll('.mvghost')].map(rect) });
    }
    if (steps.end) {
      document.getElementById('duelResult').textContent = '勝負已分　x 勝！';
      window.pwMoveCapEnd(); await sleep(300); /* 等舊殘影淡出收掉（CAP_FADE 被治具設成 1 也無妨） */
      const mv = document.getElementById('duelMove');
      out.push({ endMainText: mv.textContent, endMainH: mv.getBoundingClientRect().height, endGhosts: [...document.querySelectorAll('.mvghost')].map(rect), resultTop: document.getElementById('duelResult').getBoundingClientRect().top });
    }
    await sleep(steps.tail); clearInterval(poll);
    return { out, lastSeen };
  }, steps);
  await page.close();
  return r;
}
const T20 = '甲說明二十字說明二十字說明二十字說明二十'; // 恰 20 字
assert.equal([...T20].length, 20, '前置：測試用說明為真 20 字');
const cap = (who, desc, side = 'A', after = 700) => ({ who, item: '劍', move: '斬', desc, fac: 'zuling', side, after });
const inter = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5;
{
  const off = await layoutRun('&movecam=0', { watch: T20, caps: [cap('甲', T20, 'A', 300), cap('乙', '乙的說明', 'B', 300)], tail: 2300 });
  assert.ok(off.lastSeen < 900, `movecam=0：被取代後立刻消失（硬切），實測 ${Math.round(off.lastSeen)}ms`);
  const on = await layoutRun('&movecam=1', { watch: T20, caps: [cap('甲', T20, 'A', 300), cap('乙', '乙的說明', 'B', 300)], tail: 2300 });
  assert.ok(on.lastSeen >= 1800, `movecam=1：20 字說明被新字幕取代後仍至少可見 1800ms，實測 ${Math.round(on.lastSeen)}ms`);
  /* M2：1→2 行、2→2 行、2→1 行，新字幕寫完 700ms 後殘影與主字幕 rect 交集＝0，且殘影在主字幕下方 */
  for (const [name, a, b] of [['1→2 行', cap('甲', '', 'A'), cap('乙', '乙的說明一行', 'B')],
    ['2→2 行', cap('甲', T20, 'A'), cap('乙', '乙的說明一行', 'B')], ['2→1 行', cap('甲', T20, 'A'), cap('乙', '', 'B')]]) {
    const r = await layoutRun('&movecam=1', { watch: 'x', caps: [a, b], tail: 0 });
    const last = r.out[1];
    assert.ok(last.ghosts.length >= 1, `M2 ${name}：要有殘影（活性）`);
    for (const g of last.ghosts) {
      assert.ok(!inter(g, last.main), `M2 ${name}：殘影與主字幕 rect 不得相交：ghost ${JSON.stringify(g)} main ${JSON.stringify(last.main)}`);
      assert.ok(g.top >= last.main.bottom - 0.5, `M2 ${name}：殘影在主字幕下方`);
    }
  }
  /* L1：三拍結束，最後一則改成單行殘影留在原列：主字幕清空（版面與基準同高）、殘影不蓋結果列、仍留滿 1800ms */
  const e = await layoutRun('&movecam=1', { watch: T20, caps: [cap('乙', '乙的說明', 'B', 100), cap('甲', T20, 'A', 100)], end: true, tail: 2200 });
  const end = e.out[2];
  assert.equal(end.endMainText, '', 'L1：結尾時主字幕清空（版面與基準相同）');
  assert.ok(end.endMainH <= 19, `L1：清空後主字幕列高度不加高（${end.endMainH}px，基準 min-height 18px）`);
  assert.ok(end.endGhosts.length === 1, 'L1：最後一則以單行殘影留著（活性）');
  assert.ok(end.endGhosts[0].bottom <= end.resultTop + 0.5, `L1：殘影不蓋結果列：ghost.bottom ${end.endGhosts[0].bottom} ≤ result.top ${end.resultTop}`);
  assert.ok(e.lastSeen >= 1800, `L1：最後一則仍可見 ≥1800ms，實測 ${Math.round(e.lastSeen)}ms`);
}
await browser.close();
console.log('movecam: 多停毫秒（治具迴圈下）／特寫對準在場出招者／殘影不蓋字幕／結尾列／字幕留存 PASS');
