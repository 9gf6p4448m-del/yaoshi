// #11(k)（2026-09-30 修訂：雙向判定）「對你而言」個人化提示的正確性。
// 凍結：docs/experiments/2026-09-28-acceptance-appraise-panels.md 修訂 #11(g′)(3)③、#11(k)。
//   固定 20 個種子 × 每局前 3 夜 × 每件拍品 × 每位人類玩家視角，於鑑賞態判定：
//   (a) 顯示與否：三種情況（①連鎖 ②共鳴啟動／升級 ③≥2 家盯上）「條件成立⇔該行出現」逐格雙向相符
//       （窄畫面只出優先序最高一行、較寬最多兩行，優先序 連鎖＞共鳴＞盯上），差 0；
//   (b) 出現時句中每個數字＝測試在「複製當下狀態＋把該件加入該玩家」上以同一套遊戲函式重算的值，差 0
//       （整句逐字比對：句子由簽收樣板代入這些值而來，數字不同句子必不同；另把數字抽出來逐一列出）；
//   (c) 活性：三種情況各至少出現 1 次，且至少 1 格「沒事」（整行不出現）。
//   另驗：照妖鏡半徑沒有被擠小（等於題字欄 CSS 基準寬度時的鏡子半徑；#11(g′)(3)③「任何情況鏡子半徑與現行相同」）。
// ★重算不呼叫產品的 apprYouLines★：本檔自己深拷貝玩家、自己把拍品放進拷貝的袋子，直接叫遊戲規則函式
// （activeChains／pwResLv／facCount／BEAT_FAC／FAC／CHAINS／POOL／S.marks），句子用本檔自己讀的簽收檔樣板代入。
// 對局驅動：人類玩家每夜出價期對一件拍品下保守標上限（優先能補齊連鎖的、其次同系件數多的）——讓袋子裡真的有東西，
// 共鳴與連鎖才有機會成立；出價是玩家操作（寫 myBids，同出價面板），不改任何賽局規則。
// 用法：node tests/tools/appraise-you-k.mjs [--out <json>] [--port N] [--seeds 1-20] [--configs V1:solo,V5:solo,V1:hot]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { VP, DRIVE_STEP, scr, openGame, waitTrayReady } from './appraise-c-lib.mjs';

const HERE = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', HERE));
const PORT = Number(arg('--port', 9981));
const OUT = arg('--out', null);
const [s0, s1] = arg('--seeds', '1-20').split('-').map(Number);
const SEEDS = Array.from({ length: s1 - s0 + 1 }, (_, k) => s0 + k);
const CONFIGS = arg('--configs', 'V1:solo,V5:solo,V1:hot').split(',').map((c) => { const [v, m] = c.split(':'); return { v, m }; });
const NIGHTS = 3;

/* 簽收樣板（本檔自己讀，不取產品常數） */
const md1 = fs.readFileSync(path.join(HERE, 'docs/experiments/2026-09-28-appraise-c/plain-copy-signed.md'), 'utf8').replace(/\r\n/g, '\n');
const TWIN = {};
for (const l of md1.split('## 對你而言提示句')[1].split('## 卡面文字修訂')[0].split('\n')) {
  const c = l.split('|').map((s) => s.trim()); if (/^(虎爺印|虎姑婆指甲)$/.test(c[1] || '')) TWIN[c[1] + '|' + c[2]] = c[3];
}
const md2 = fs.readFileSync(path.join(HERE, 'docs/experiments/2026-09-28-appraise-c/plain-copy-signed-2.md'), 'utf8').replace(/\r\n/g, '\n');
const TPL = {};
for (const l of md2.split('\n')) {
  const m = l.match(/^\d+\. ([^：]+)：「(.*)」(?:（[^）]*）)?\s*$/); if (!m) continue;
  TPL[m[1] === '共鳴啟動' ? 'resOn' : m[1] === '共鳴升級' ? 'resUp' : m[1] === '盯上' ? 'mark' : 'chain'] = m[2];
}
if (Object.keys(TWIN).length !== 2 || Object.keys(TPL).length !== 4) throw new Error('簽收樣板讀不齊 ' + JSON.stringify({ TWIN, TPL }));

const { chromium } = createRequire(path.join(HERE, 'tools/anyCreature/package.json'))('playwright');
const srv = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();

/** 頁內：這一席、每件拍品——測試自己的重算＋進鑑賞態讀產品畫出來的行。 */
const MEASURE = async ([TWIN, TPL]) => {
  const fill = (t, v) => Object.entries(v).reduce((s, [k, x]) => s.split(`{${k}}`).join(String(x)), t);
  const me0 = S.players[ACTIVE];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const rows = [];
  const tray = window.__yaoshi3d.tray;
  for (let i = 0; i < S.market.length; i++) {
    const it = S.market[i];
    // ── 測試自己的重算（深拷貝當下狀態＋把該件放進拷貝的袋子）──
    const me = clone(me0), itc = clone(it), after = { ...me, bag: [...(me.bag || []), itc] };
    const exp = [], nums = {};
    if (!itc.curse && itc.ab) {
      const before = new Set(activeChains(me).map((c) => c.id));
      const added = activeChains(after).filter((c) => !before.has(c.id));
      if (added.length) {
        const c = added[0], partners = c.requirements.filter((ab) => ab !== itc.ab).map((ab) => (POOL.find((x) => x.ab === ab) || {}).n || ab).join('、');
        exp.push({ k: 'chain', t: TWIN[itc.n + '|' + partners] || fill(TPL.chain, { '缺件': partners, '名': c.name }) });
        nums.chain = { id: c.id, partners };
      }
    }
    if (!itc.curse) {
      const l0 = pwResLv(me, itc.f), l1 = pwResLv(after, itc.f);
      if (l1 > l0) {
        const v = { '系': FAC[itc.f].n, N: facCount(after, itc.f), '拍': BEAT_FAC.indexOf(itc.f) + 1 };
        exp.push({ k: 'res', t: l0 === 0 ? fill(TPL.resOn, { ...v, lv: l1 }) : fill(TPL.resUp, { ...v, a: l0, b: l1 }) });
        nums.res = { N: v.N, beat: v['拍'], l0, l1 };
      }
    }
    if (CFG.MARK_ON && S.marks) {
      const who = Object.keys(S.marks).filter((id) => S.marks[id] === i && +id !== me.id && S.players[+id] && S.players[+id].alive).map((id) => `${DIRS[+id]}家`);
      if (who.length >= 2) { exp.push({ k: 'mark', t: fill(TPL.mark, { n: who.length }).replace('{甲家}、{乙家}', who.join('、')) }); nums.mark = { n: who.length, who }; }
    }
    const max = innerHeight >= 500 ? 2 : 1;
    // ── 進鑑賞態（跟點籤同一條路），跳過揭幕，讀產品畫出來的行 ──
    const rail = appraiseRailOf(i);
    try { closeAppraise(); } catch (e) {}
    railTabClick(rail, i);
    if (tray.appraiseIntro && tray.appraiseIntro()) { tray.skipAppraiseIntro(); appraiseScrollTick(); }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const el = document.querySelector('#' + rail + ' .railPages .asc');
    const got = el ? [...el.querySelectorAll('.asc-yrow')].map((r) => ({ k: ['chain', 'res', 'mark'].find((k) => r.classList.contains(k)) || null, t: r.textContent.replace(/^對你而言/, ''), vis: r.getBoundingClientRect().height > 0 })) : null;
    const fx = tray.appraiseFx(), M = fx && fx.mirror;
    /* 鏡子沒被擠小：題字欄以 CSS 基準寬（clamp(150px,21vw,240px)）放時的鏡子半徑 */
    const pg = document.querySelector('#' + rail + ' .railPages'), pr = pg.getBoundingClientRect();
    const w0 = Math.min(240, Math.max(150, 0.21 * innerWidth));
    const rBase = appraiseLayout(rail === 'railW' ? { left: pr.left, right: pr.left + w0 } : { left: pr.right - w0, right: pr.right }).r;
    rows.push({ slot: i, name: it.n, curse: !!it.curse, bag: (me0.bag || []).map((x) => x.n), expAll: exp, exp: exp.slice(0, max), max, got, nums,
      mirrorR: M ? M.r : null, rBase, scrollP: el ? Number(el.dataset.p) : null, fold: el ? el.classList.contains('fold') : null });
    try { closeAppraise(); } catch (e) {}
  }
  return rows;
};
/** 出價：補齊連鎖的優先，其次同系件數最多的非詛咒件；下保守標上限（同出價面板能填的最大值）。 */
const BID = () => {
  const me = S.players[ACTIVE]; if (!me || typeof myBids === 'undefined' || !myBids.length) return null;
  let best = -1, sc = -1;
  S.market.forEach((it, i) => {
    if (it.curse) return;
    const s = (chainsCompletedBy(me, it).length ? 100 : 0) + facCount({ ...me, bag: [...me.bag, it] }, it.f) * 10 + (Object.values(CHAINS).some((c) => c.requirements.includes(it.ab)) ? 3 : 0);
    if (s > sc) { sc = s; best = i; }
  });
  if (best < 0) return null;
  const amt = Math.max(1, consCapFor(me));
  myBids[best] = { amt, type: 'cons', intent: 'keep', target: null };
  return { slot: best, amt };
};

const results = { root: ROOT, seeds: SEEDS, configs: CONFIGS, cells: [], notes: [] };
try {
  for (const { v, m } of CONFIGS) for (const seed of SEEDS) {
    const { ctx, page } = await openGame(browser, PORT, VP[v], m, seed, { clock: false });
    const done = new Set();
    try {
      for (let step = 0; step < 6000; step++) {
        const round = await page.evaluate(() => window.__yaoshi.S.round);
        if (round > NIGHTS) break;
        const cls = await scr(page);
        if (cls === 'bid') {
          const who = await page.evaluate(() => ACTIVE);
          const key = `${round}|${who}`;
          if (!done.has(key)) {
            done.add(key);
            if (!(await waitTrayReady(page))) { results.notes.push(`${v}|${m}|s${seed} 第 ${round} 夜 3D 未就緒（量不到，判紅）`); results.cells.push({ v, m, seed, round, who, err: '3D 未就緒' }); }
            else {
              await page.waitForTimeout(250);
              const rows = await page.evaluate(MEASURE, [TWIN, TPL]).catch((e) => ({ err: e.message }));
              if (rows.err) results.cells.push({ v, m, seed, round, who, err: rows.err });
              else for (const r of rows) results.cells.push({ v, m, seed, round, who, ...r });
              const bid = await page.evaluate(BID);
              results.notes.push(`${v}|${m}|s${seed} 第 ${round} 夜 席${who} 出價 ${JSON.stringify(bid)}`);
            }
          }
        }
        const r = await page.evaluate(DRIVE_STEP);
        if (r === 2) break;
        await page.waitForTimeout(6);
      }
    } catch (e) { results.notes.push(`${v}|${m}|s${seed} 例外 ${e.message}`); results.cells.push({ v, m, seed, err: e.message }); }
    finally { await ctx.close().catch(() => {}); }
    console.log(v, m, seed, 'cells', results.cells.filter((c) => c.v === v && c.m === m && c.seed === seed).length);
  }
} finally { await browser.close(); srv.kill(); }

// ── 判定 ──
const fails = [], act = { chain: 0, res: 0, mark: 0, calm: 0 }, numsSeen = { chain: [], res: [], mark: [] };
let n = 0;
for (const c of results.cells) {
  const key = `${c.v}|${c.m}|s${c.seed}|n${c.round}|席${c.who}|#${c.slot}(${c.name})`;
  n++;
  if (c.err || !c.got) { fails.push(`${key} 量不到 ${c.err || '（沒有卷軸）'}`); continue; }
  const e = c.exp.map((x) => x.k + ':' + x.t), g = c.got.map((x) => x.k + ':' + x.t);
  if (JSON.stringify(e) !== JSON.stringify(g)) fails.push(`${key} 應出 ${JSON.stringify(e)} 實出 ${JSON.stringify(g)}`);
  if (c.got.some((x) => !x.vis)) fails.push(`${key} 有一行不可見`);
  if (!(c.scrollP === 1)) fails.push(`${key} 跳過後卷軸未全開 p=${c.scrollP}`);
  if (!(c.mirrorR != null && c.mirrorR >= c.rBase - 0.5)) fails.push(`${key} 鏡子被擠小 ${c.mirrorR && c.mirrorR.toFixed(1)} < 基準 ${c.rBase && c.rBase.toFixed(1)}`);
  for (const x of c.got) { act[x.k] = (act[x.k] || 0) + 1; }
  if (!c.got.length) act.calm++;
  for (const k of ['chain', 'res', 'mark']) if (c.nums && c.nums[k] && c.got.some((x) => x.k === k)) numsSeen[k].push({ key, ...c.nums[k] });
}
const activity = { ...act, ok: act.chain >= 1 && act.res >= 1 && act.mark >= 1 && act.calm >= 1 };
if (!activity.ok) fails.push(`活性不足：${JSON.stringify(act)}（三種情況各 ≥1、沒事 ≥1）`);
const expected = { chain: results.cells.filter((c) => c.expAll && c.expAll.some((x) => x.k === 'chain')).length, res: results.cells.filter((c) => c.expAll && c.expAll.some((x) => x.k === 'res')).length, mark: results.cells.filter((c) => c.expAll && c.expAll.some((x) => x.k === 'mark')).length };
results.verdict = { cells: n, fail: fails.length, pass: fails.length === 0, activity, conditionsTrue: expected };
results.fails = fails;
results.numbers = { chain: numsSeen.chain.slice(0, 20), res: numsSeen.res.slice(0, 20), mark: numsSeen.mark.slice(0, 20) };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(JSON.stringify(results.verdict));
for (const f of fails.slice(0, 20)) console.log('  ✗', f);
