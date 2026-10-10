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
async function open(query = '', { fixtureLoop = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.goto(pathToFileURL(TARGET).href + '?paperwar=1' + query, { waitUntil: 'load' });
  if (fixtureLoop) await page.evaluate(() => { /* sfx-wiring 治具（tests/sfx-wiring.test.mjs newGame）逐字同一個迴圈 */
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
  if (steps.vp) await page.setViewportSize(steps.vp);
  const r = await page.evaluate(async (steps) => {
    const d = document.getElementById('duel'); d.classList.add('pw'); d.style.display = 'flex'; /* 真版面：#duel 是 column flex（不是 display:block 假版面） */
    if (steps.arena) { /* 真的 arena：產品 pwArenaHTML＋8 枚隻數牌，才有 .pwchips／#duelArena 可比 */
      const mk = (n) => ({ units: Array.from({ length: n }, (_, i) => ({ id: i, t: 'a', fac: 'zuling', body: 'swarm', nm: '甲' + i })), comp: { swarm: n, elite: 1 }, curses: 0 });
      const P = window.__yaoshi.S.players;
      document.getElementById('duelArena').innerHTML = window.pwArenaHTML({ A: P[0], B: P[1], war: { unitsA: 8, unitsB: 8 } }, [mk(8), mk(8)]);
      document.getElementById('duelBeat').textContent = '三拍・祟';
    }
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
    if (steps.end) { /* 正式順序：先 pwMoveCapEnd，再寫結果列 */
      window.pwMoveCapEnd();
      document.getElementById('duelResult').textContent = '勝負已分　x 勝！';
      document.getElementById('duelSub').textContent = '🔥 乙 燒掉 3/8 隻 → −2 壽命・甲 燒掉 1/8 隻';
      await sleep(300);
      const el = [...document.querySelectorAll('#duelMove,.mvghost')].find((e) => e.textContent.includes(steps.watch));
      const duel = document.getElementById('duel');
      out.push({ cap: el ? rect(el) : null, capH: el ? el.getBoundingClientRect().height : 0,
        chips: [...document.querySelectorAll('.pwchips')].map(rect), arena: rect(document.getElementById('duelArena')),
        result: rect(document.getElementById('duelResult')), sub: rect(document.getElementById('duelSub')),
        lay: { sh: duel.scrollHeight, ch: duel.clientHeight } });
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
    { const g0 = last.ghosts[0]; assert.ok(g0.top - last.main.bottom <= 3, `M2 ${name}：第一則殘影緊貼主字幕下緣（縫隙 ${g0.top - last.main.bottom}px ≤ 3；用舊高度排版在 2→1 行時實測縫隙 8px；2→2 行新舊高度相同，本條對 2a144ac7 無鑑別力）`);
    }
  }
  /* L1（覆審 r2 MEDIUM）：三拍結束最後一則留在畫面 ≥1800ms，且與隻數牌／arena／結果列 rect 交集＝0（多種視窗、正式順序、真 arena） */
  for (const vp of [{ width: 844, height: 390 }, { width: 852, height: 393 }, { width: 932, height: 430 }, { width: 667, height: 375 }]) {
    const e = await layoutRun('&movecam=1', { vp, arena: true, watch: T20, caps: [cap('乙', '乙的說明', 'B', 100), cap('甲', T20, 'A', 100)], end: true, tail: 2200 });
    const end = e.out[2], tag = `${vp.width}x${vp.height}`;
    assert.ok(end.cap, `L1 ${tag}：最後一則仍在畫面（活性）`);
    assert.ok(end.chips.length === 2, `L1 ${tag}：真 arena 有雙方隻數牌（活性）`);
    for (const [nm, r] of [...end.chips.map((c, i) => ['隻數牌' + i, c]), ['arena', end.arena], ['結果列', end.result], ['結尾副行', end.sub]]) {
      assert.ok(!inter(end.cap, r), `L1 ${tag}：最後一則字幕與${nm} rect 不得相交：cap ${JSON.stringify(end.cap)} ${nm} ${JSON.stringify(r)}`);
    }
    assert.ok(end.capH <= 19, `L1 ${tag}：結尾字幕不加高版面（${end.capH}px）`);
    assert.ok(e.lastSeen >= 1800, `L1 ${tag}：最後一則仍可見 ≥1800ms，實測 ${Math.round(e.lastSeen)}ms`);
  }
  /* 開局中途開新局：殘影與計時器不殘留 */
  {
    const page = await open('&movecam=1');
    const r = await page.evaluate(async () => {
      const d = document.getElementById('duel'); d.classList.add('pw'); d.style.display = 'flex';
      window.pwMoveCap('甲', '劍', '斬', '說明', 'zuling', 'A'); window.pwMoveCap('乙', '盾', '擋', '說明二', 'xianghuo', 'B');
      const before = document.querySelectorAll('.mvghost').length;
      window.__yaoshi.newGame('solo', 2, ['qingmian']);
      await new Promise((r) => setTimeout(r, 2600));
      return { before, after: document.querySelectorAll('.mvghost').length, main: document.getElementById('duelMove').textContent };
    });
    assert.equal(r.before, 1, '前置：newGame 前有 1 則殘影（活性）');
    assert.equal(r.after, 0, `newGame 後 2.6s 殘影不殘留（實測 ${r.after}）`);
    await page.close();
  }
}

/* ── ③ 真流程（覆審 r3 MEDIUM-1／2）：真 playDuelWar（真 END_MS 等待、不套 *_MS→1 迴圈）＋ playDuel 結尾同一行 .pw 移除；
   量「最後一則字幕從出現到被 .pw 移除而隱藏」的連續可見毫秒；staged（pwTraitFx 回 true）與 fallback（回 false）兩路徑；667 寬完整可見 */
async function endFlow(vp, staged) {
  const page = await open('&movecam=1', { fixtureLoop: false });
  await page.setViewportSize(vp);
  const r = await page.evaluate(async ({ staged }) => {
    const Y = window.__yaoshi; Y.newGame('solo', 1, ['qingmian']);
    const P = Y.S.players, tr1 = Object.keys(Y.TRAITS).find((k) => Y.pwMoveTier(k, 1) === 1 && Y.pwMoveCapText(k).item);
    const tr2 = Object.keys(Y.TRAITS).filter((k) => Y.pwMoveTier(k, 1) === 1 && Y.pwMoveCapText(k).item).sort((a, b) => Y.pwMoveCapText(b).desc.length - Y.pwMoveCapText(a).desc.length)[0];
    const it = (k) => Y.pwMoveCapText(k).item;
    const mk = (nms) => ({ units: nms.map((nm, i) => ({ id: i, t: 'a', fac: 'zuling', body: 'swarm', nm })), comp: { swarm: nms.length }, curses: 0 });
    const views = [mk([it(tr1), '甲2', '甲3']), mk([it(tr2), '乙2', '乙3'])];
    window.pwBeatTier = () => 1; /* 最後一拍也是 tier1：最後一則字幕在戰鬥結束前只剩短短一段（覆審 r3 量到的情境） */
    window.pwTraitFx = () => staged; window.pwAwaitFigures = async () => {};
    window.pwFigsOf = () => [{ group: { visible: true }, unit: { id: 0 } }]; window.pwFigureOf = (s, id) => ({ group: { visible: true }, unit: { id } });
    window.fx3d = () => {};
    const f = { A: P[0], B: P[1], w: P[0], l: P[1], tie: false, dmg: 2, war: { phase: null, unitsA: 3, unitsB: 3, burnedA: 0, burnedB: 1,
      beats: [{ beat: 1, kind: 'trait', trId: tr1, side: 'A', amount: 0 }, { beat: 3, kind: 'trait', trId: tr2, side: 'B', amount: 0 }] } };
    const ov = document.getElementById('duel'); ov.style.display = 'flex'; ov.classList.add('on'); ov.classList.add('pw');
    const mv = document.getElementById('duelMove'); let first = 0, last = 0, lastText = '', trunc = null, curText = '';
    const vis = () => { const cs = getComputedStyle(mv); return mv.textContent.trim() && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05 && getComputedStyle(ov).display !== 'none'; };
    const poll = setInterval(() => {
      const t = mv.textContent.trim(); const now = performance.now();
      if (t !== curText) { curText = t; if (t && !mv.classList.contains('mvend')) first = 0; } /* 換了一則新字幕：重新計首次可見 */
      if (!first && vis()) first = now;
      if (vis()) { last = now; lastText = t; if (mv.classList.contains('mvend')) { const rg = document.createRange(); rg.selectNodeContents(mv); const rr = rg.getBoundingClientRect(), cr = mv.getBoundingClientRect();
        trunc = { sw: mv.scrollWidth, cw: mv.clientWidth, inside: rr.left >= cr.left - 0.5 && rr.right <= cr.right + 0.5, h: cr.height }; } }
    }, 8);
    await window.playDuelWar(f, views);
    ov.classList.remove('on'); ov.classList.remove('pw'); /* playDuel 結尾同一行：.pw 一移除，#duelMove 就 display:none */
    await new Promise((r) => setTimeout(r, 400)); clearInterval(poll);
    return { visibleMs: last - first, lastText, trunc, tr2desc: Y.pwMoveCapText(tr2).desc.length };
  }, { staged });
  await page.close();
  return r;
}
for (const staged of [true, false]) {
  for (const vp of [{ width: 844, height: 390 }, { width: 852, height: 393 }, { width: 932, height: 430 }, { width: 667, height: 375 }]) {
    const r = await endFlow(vp, staged), tag = `${vp.width}x${vp.height}／${staged ? 'staged' : 'fallback'}`;
    assert.ok(r.trunc, `r3 ${tag}：結尾字幕有進入就地單行狀態（活性）`);
    assert.ok(r.visibleMs >= 1800, `r3 ${tag}：最後一則在真流程（含 .pw 移除）連續可見 ≥1800ms，實測 ${Math.round(r.visibleMs)}ms`);
    assert.ok(r.trunc.sw <= r.trunc.cw && r.trunc.inside, `r3 ${tag}：結尾說明完整可見（scrollWidth ${r.trunc.sw} ≤ clientWidth ${r.trunc.cw}，文字 Range 在容器內：${r.trunc.inside}）`);
    assert.ok(r.trunc.h <= 19, `r3 ${tag}：結尾字幕列高 ≤ 基準 18px（${r.trunc.h}px）`);
  }
}
await browser.close();
console.log('movecam: 多停毫秒（治具迴圈下）／特寫對準在場出招者／殘影不蓋字幕／結尾列／字幕留存 PASS');
