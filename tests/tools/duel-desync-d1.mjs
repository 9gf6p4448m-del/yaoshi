/* 驗收凍結檔 D1（docs/experiments/2026-09-07-acceptance-duel-desync.md）：
   對 seeds 1..2000 的「調查用的例牌配對」（沿用 paperwar-gate.mjs A1／唯讀調查探針同一組三角配對，
   兩個方向都跑）逐場比對修前（af12d4d）／修後（index.html）：winner、dmg、aliveA/B、hpA/B、burnedA/B
   須逐場相同，差異只允許出現在 beats 的 kind:"trait" 筆數（修後 ≤ 修前）。
   跑法：先 `git show af12d4d:index.html > old.html`，再
         node tests/tools/duel-desync-d1.mjs [--old=old.html] [--new=index.html] [--n=2000] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGame } from './load.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, dflt) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : dflt; };
const OLD_HTML = path.resolve(arg('old', path.join(ROOT, 'old.html')));
const NEW_HTML = path.resolve(arg('new', path.join(ROOT, 'index.html')));
const N = Number(arg('n', 2000));

if (!fs.existsSync(OLD_HTML)) { console.error(`找不到 ${OLD_HTML}（先 git show af12d4d:index.html > old.html）`); process.exit(2); }

const OLD = loadGame(OLD_HTML);
const NEW = loadGame(NEW_HTML);

function bagsOf(G) {
  const by = n => G.POOL.find(x => x.n === n);
  const bag = (...ns) => ns.map(n => ({ ...by(n) }));
  return [
    [bag('魔神仔紅帽', '林投姐髮簪'), bag('射日神弓', '巴冷公主珠鍊')],
    [bag('椅仔姑竹椅', '過陰咒'), bag('獻祭刀', '雷女之火')],
    [bag('黃色小雨衣', '水鬼浮標'), bag('巴冷公主珠鍊', '虎姑婆指甲')],
    [bag('五營旗', '陰陽眼銅錢', '拼板舟'), bag('射日神弓', '巴冷公主珠鍊')],
    [bag('五營旗', '山豬牙飾', '飼鬼甕'), bag('獻祭刀', '王爺劍')],
    [bag('媽祖令旗', '千里眼銅鈴'), bag('射日神弓', '虎姑婆指甲')],
  ];
}

const SEEDS = Array.from({ length: N }, (_, i) => i + 1);

function runOne(G, bagA, bagB, seed) {
  const rng = G.mulberry32(seed >>> 0);
  const round = 1 + Math.floor(rng() * G.CFG.ROUNDS);
  const w = Math.floor(rng() * 4);
  const wid = (w === 0) ? 0 : (w === 1 ? 1 : null);
  const A = { id: 0, name: '甲', bag: bagA }, B = { id: 1, name: '乙', bag: bagB };
  const r = G.paperWar(A, B, { rng, phase: G.phaseFor(round), windId: wid });
  const traitBeats = r.beats ? r.beats.filter(b => b.kind === 'trait').length : 0;
  return {
    winner: r.winner ? r.winner.id : null, dmg: r.dmg,
    aliveA: r.aliveA, aliveB: r.aliveB, hpA: r.hpA, hpB: r.hpB,
    burnedA: r.burnedA, burnedB: r.burnedB, traitBeats,
  };
}

const oldPairs = bagsOf(OLD), newPairs = bagsOf(NEW);
let scanned = 0;
const mismatches = [];
let traitDelta = 0, traitDeltaBad = 0, traitDeltaGames = 0;
oldPairs.forEach(([bagA_old, bagB_old], pi) => {
  const [bagA_new, bagB_new] = newPairs[pi];
  for (const s of SEEDS) {
    for (const dir of [0, 1]) {
      const oA = dir === 0 ? bagA_old : bagB_old, oB = dir === 0 ? bagB_old : bagA_old;
      const nA = dir === 0 ? bagA_new : bagB_new, nB = dir === 0 ? bagB_new : bagA_new;
      const ro = runOne(OLD, oA, oB, s);
      const rn = runOne(NEW, nA, nB, s);
      scanned++;
      const fields = ['winner', 'dmg', 'aliveA', 'aliveB', 'hpA', 'hpB', 'burnedA', 'burnedB'];
      const diffs = fields.filter(f => ro[f] !== rn[f]);
      if (diffs.length) mismatches.push({ pair: pi, dir, seed: s, diffs, old: ro, new: rn });
      if (rn.traitBeats !== ro.traitBeats) {
        traitDeltaGames++;
        traitDelta += (ro.traitBeats - rn.traitBeats);
        if (rn.traitBeats > ro.traitBeats) traitDeltaBad++;
      }
    }
  }
});

console.log(`掃描場數：${scanned}（${oldPairs.length} 對 × 2 方向 × ${N} seeds）`);
console.log(`欄位不同場數（winner/dmg/aliveA/B/hpA/B/burnedA/B）：${mismatches.length}`);
console.log(`trait 筆數有變動的場數：${traitDeltaGames}（總共少了 ${traitDelta} 筆；修後 > 修前的不合理場數：${traitDeltaBad}）`);
if (mismatches.length) {
  console.log('前 20 筆不同：');
  mismatches.slice(0, 20).forEach(m => console.log(JSON.stringify(m)));
}
process.exit(mismatches.length || traitDeltaBad ? 1 : 0);
