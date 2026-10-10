/* 招式特寫＋字幕不阻塞（?movecam，使用者 2026-10-10 裁乙＋出招者特寫）。
   跑法：node tests/movecam.test.mjs [index.html 路徑]（預設＝../index.html）
   鑑別力：對 71918da5 的 index.html 跑必須紅在行為斷言（招式多停的毫秒、特寫事件、字幕留存毫秒），不是 ReferenceError。
   ① 真的跑 pwPlayBeat（vm 取出原始碼＋替身）：量一支招式實際 sleep 幾毫秒、有沒有派 ys:fx-focus
   ② 真頁面：舊字幕被新字幕取代後是否仍在畫面上、20 字說明可見毫秒、?movecam=0 退回硬切 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(process.argv[2] || path.join(HERE, '..', 'index.html'));
const html = fs.readFileSync(TARGET, 'utf8');

/* ── ① pwPlayBeat：一支 staged 招式實際等多久、派了什麼鏡頭 ── */
function runBeat({ level, tier }) {
  const sleeps = []; const ev = [];
  const noop = () => {};
  const TIER_MS = { 1: 300, 2: 900, 3: 1400 };
  const stage = {
    Date, Set, Map, Math, Promise, SKIP: false, S: { rngUi: () => 0 },
    FXC: { tiers: {}, beats: {}, traits: {}, beat: 0, trait: 0, focus: 0 },
    PHASES: {}, BEAT_FAC: [], BEAT_NAME: ['一', '二'], PW_BEAT_SFX: [],
    PW_FX: { MOVECAM_LEVEL: level, MOVECAM_HOLD_MS: [0, 250, 500], MOVECAM_TIER_MUL: { 1: 1, 2: 1.5, 3: 2 },
      FOCUS_DIM: 0.35, FOCUS_SHRINK: 0.92, EV_MIN_MS: 45, EV_MAX_MS: 260, EV_BUDGET_MS: 1050, BANNER_MS: 0, MAX_HITS: 5 },
    PW_BEAT_LOG: null, TRAIT_ITEM: {}, TRAITS: {}, TRUE_DESTINY_MOVES: {},
    pwBeatTier: () => tier, pwThin: x => x, pwCloseup: () => true,
    pwEvFac: () => 'x', pwMoveTier: () => tier, pwTierMs: (t) => TIER_MS[t], pwBeatMinMs: () => 0,
    pwTraitFx: () => true,
    pwSleep: async (ms) => { sleeps.push(ms); }, pwCap: noop, pwLamps: noop, sfx: noop, pwMoveCap: noop,
    pwMoveCapText: () => ({ item: '五營旗', move: '招', desc: '說明' }),
    pwFigsOf: (side) => side === 'A' ? [{ group: { visible: true }, unit: { id: 7 } }] : [{ group: { visible: true }, unit: { id: 2 } }],
    pwFigureOf: noop, fx3d: (n, d) => ev.push([n, d]), pwActorCard: noop, $: () => ({}),
  };
  vm.createContext(stage);
  vm.runInContext(html.slice(html.indexOf('function pwMoveFocus(') >= 0 ? html.indexOf('function pwMoveFocus(') : html.indexOf('async function pwPlayBeat('),
    html.indexOf('async function playDuelWar(')), stage);
  const views = [{ units: [{ id: 7, nm: '別的' }] }, { units: [{ id: 3, nm: '五營旗' }] }]; // 五營旗在 B 側 id 3
  return stage.pwPlayBeat({ war: {}, A: { name: 'A' }, B: { name: 'B' } }, 1, [{ kind: 'trait', trId: 'x', side: 'B' }], views)
    .then(() => ({ sleeps, ev }));
}
{
  const TIER_MS = { 1: 300, 2: 900, 3: 1400 };
  const off = await runBeat({ level: 0, tier: 1 });
  assert.equal(off.sleeps.reduce((a, b) => a + b, 0), 300, 'movecam=0：tier1 招式只等 300（71918da5 行為）');
  assert.ok(!off.ev.some(([n, d]) => n === 'ys:fx-focus' && d.kind === 'trait'), 'movecam=0 不派特寫');
  const light = await runBeat({ level: 1, tier: 1 });
  assert.equal(light.sleeps.reduce((a, b) => a + b, 0), 300 + 250, '輕：tier1 每招多停 250ms');
  const mid = await runBeat({ level: 2, tier: 1 });
  assert.equal(mid.sleeps.reduce((a, b) => a + b, 0), 300 + 500, '中：tier1 每招多停 500ms');
  const mid2 = await runBeat({ level: 2, tier: 2 });
  assert.equal(mid2.sleeps.reduce((a, b) => a + b, 0), 900 + 750, '中：tier2 多停 500×1.5');
  const f = light.ev.find(([n, d]) => n === 'ys:fx-focus' && d.kind === 'trait');
  assert.ok(f, '輕：招式派出 ys:fx-focus（kind=trait）');
  assert.deepEqual([f[1].side, f[1].actor, f[1].foeSide, f[1].target], ['B', 3, 'A', 7], '特寫對準出招者（法寶名反查 id 3）與對面第一尊可見的（id 7）');
  assert.equal(f[1].ms, 550, '特寫長度＝招式時長＋hold');
}

/* ── ② 真頁面：字幕留存 ── */
const require = createRequire(pathToFileURL(path.join(HERE, '..', 'tools', 'anyCreature', 'package.json')));
const { chromium } = require('playwright');
const browser = await chromium.launch();
async function capRun(query) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.goto(pathToFileURL(TARGET).href + '?paperwar=1' + query, { waitUntil: 'load' });
  const r = await page.evaluate(async () => {
    const d = document.getElementById('duel'); d.style.display = 'block'; d.classList.add('pw');
    const visibleMs = (txt) => { /* 取樣：畫面上（含殘影）是否還有含 txt 的可見元素 */
      return [...document.querySelectorAll('#duelMove,.mvghost')].some(e => e.textContent.includes(txt) && getComputedStyle(e).opacity > 0.05);
    };
    const T1 = '甲甲說明二十字說明二十字說明二十字';
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const t0 = performance.now(); let lastSeen = 0;
    const poll = setInterval(() => { if (visibleMs(T1)) lastSeen = performance.now() - t0; }, 16);
    pwMoveCap('甲', '劍', '斬', T1, 'zuling', 'A');
    await sleep(300);
    pwMoveCap('乙', '盾', '擋', '乙的說明', 'xianghuo', 'B'); /* 300ms 後被新字幕取代 */
    await sleep(2600);
    clearInterval(poll);
    return { lastSeen, len: T1.length };
  });
  await page.close();
  return r;
}
{
  const off = await capRun('&movecam=0');
  assert.ok(off.lastSeen < 700, `movecam=0：被取代後立刻消失（硬切），實測 ${Math.round(off.lastSeen)}ms`);
  const on = await capRun('&movecam=1');
  assert.ok(on.lastSeen >= 1800, `movecam=1：20 字說明被新字幕取代後仍至少可見 1800ms，實測 ${Math.round(on.lastSeen)}ms`);
}
await browser.close();
console.log('movecam: 招式多停毫秒／特寫事件／字幕留存 PASS');
