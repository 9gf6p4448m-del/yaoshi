/* F3 節奏的 A/B 量測驅動器（v0.54，R1 覆審 H5／M6）。
 * 用法：node tests/tools/pace-ab.mjs <out.json> --a=<A 組靜態根> --b=<B 組靜態根>
 *                                   [--seeds=7,1,3] [--duels=4] [--runs=5] [--port=9580]
 *
 * 為什麼要這支：一版的 F3 只印了「一次 4 場的中位」。覆審員同組態自跑兩次拿到 5337／5245.5，
 * 而另一個組態的兩跑是 5083.5／5637——**單一組態內的擺盪（±550ms）大於要證明的效果（−271ms）**。
 * `02 §6.2`：訊號忽紅忽綠要先歸因，歸不出來就明講「這個訊號目前不可信」，不得拿它宣告完成。
 *
 * 這支做三件一版沒做的事：
 *   ① **交錯跑**（A,B,A,B,…）而不是先跑完 A 再跑 B——把機器狀態的漂移平均掉，
 *      不然「先跑的那一組比較快」這種系統性偏差會整包算到組態頭上。
 *   ② 每組同 seeds 跑 `--runs` 次（預設 5），輸出**每次的中位、以及這些中位的中位與全距**。
 *   ③ seeds 與 url 全部落檔（M6：一版的 duel-*.json 連 url 都沒存，誰都複現不了）。
 *
 * 判讀規則（寫在輸出的 verdict 裡，不是這支自己下結論）：
 *   若兩組的「中位之全距」有重疊，就是**噪音大於效果**，這個量測分辨不出兩組差異。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drive, serve } from './duel-drive.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { chromium } = (() => {
  const cands = [path.join(ROOT, 'tools/anyCreature/package.json'), path.join(ROOT, '../../../tools/anyCreature/package.json')];
  for (const c of cands) { try { return createRequire(c)('playwright'); } catch (e) { /* 下一個 */ } }
  throw new Error('找不到 playwright');
})();

const argv = process.argv.slice(2);
const pos = [], opt = {};
for (const a of argv) { const m = a.match(/^--([a-z0-9]+)=(.*)$/i); if (m) opt[m[1]] = m[2]; else pos.push(a); }
const out = pos[0] || path.join(ROOT, 'scratchpad', 'pace-ab.json');
if (!opt.a || !opt.b) { console.error('need --a=<A 組靜態根> --b=<B 組靜態根>'); process.exit(2); }
const SEEDS = String(opt.seeds || '7').split(',').map((x) => Number(x.trim())).filter(Number.isFinite);
const DUELS = Number(opt.duels || 4);
const RUNS = Number(opt.runs || 5);
const PORT_A = Number(opt.port || 9580);
const PORT_B = PORT_A + 1;

const med = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const range = (a) => (a.length ? [Math.min(...a), Math.max(...a)] : [null, null]);

const srvA = await serve(path.resolve(opt.a), PORT_A);
const srvB = await serve(path.resolve(opt.b), PORT_B);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const runs = { A: [], B: [] };
const raw = [];
try {
  for (let i = 0; i < RUNS; i++) {
    for (const seed of SEEDS) {
      // 交錯：同一輪裡 A、B 各跑一次，順序也交替，避免「先跑的那一個」變成系統性偏差
      const order = i % 2 === 0 ? ['A', 'B'] : ['B', 'A'];
      for (const grp of order) {
        const port = grp === 'A' ? PORT_A : PORT_B;
        const url = `http://127.0.0.1:${port}/index.html?paperwar=1&fxcount=1&seed=${seed}`;
        const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
        const r = await drive(page, url, { duels: DUELS });
        await page.close();
        const durs = (r.rec && r.rec.duels || []).map((x) => x.dur).filter(Number.isFinite);
        const tiers = (r.fxc && r.fxc.tiers) || null;
        runs[grp].push(med(durs));
        raw.push({ run: i + 1, grp, seed, url, durs, median: med(durs), tiers, errors: (r.errors || []).length });
        console.log(`run${i + 1} ${grp} seed=${seed} durs=${JSON.stringify(durs)} median=${med(durs)} tiers=${JSON.stringify(tiers)} err=${(r.errors || []).length}`);
      }
    }
  }
} finally {
  await browser.close();
  srvA.kill(); srvB.kill();
}

const rA = range(runs.A), rB = range(runs.B);
const overlap = !(rA[1] < rB[0] || rB[1] < rA[0]);
const summary = {
  seeds: SEEDS, duels: DUELS, runs: RUNS, rootA: opt.a, rootB: opt.b,
  A: { medians: runs.A, medianOfMedians: med(runs.A), range: rA, spread: rA[1] - rA[0] },
  B: { medians: runs.B, medianOfMedians: med(runs.B), range: rB, spread: rB[1] - rB[0] },
  effect: med(runs.B) - med(runs.A),
  overlap,
  verdict: overlap
    ? '兩組的中位全距重疊 ⇒ 噪音 ≥ 效果，這個量測分辨不出兩組差異（02 §6.2：不得拿它宣告完成）'
    : '兩組的中位全距不重疊 ⇒ 差異大於這台機器的噪音',
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ summary, raw }, null, 1));
console.log('\n' + JSON.stringify(summary, null, 1));
