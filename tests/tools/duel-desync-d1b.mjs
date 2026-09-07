/* D1 補充：預設 AI 桌（runMany／simulate 走真實 resolveBattles→paperWar，AI 自己選袋、自己出價）
   逐位元組比對 trace(seeds) 修前(af12d4d)/修後(index.html)，確認四處存活檢查沒有動到預設 AI 桌的任何結果。
   跑法：node tests/tools/duel-desync-d1b.mjs [--old=old.html] [--new=index.html] [--n=2000] */
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

const OLD = loadGame(OLD_HTML);
const NEW = loadGame(NEW_HTML);

let diffSeeds = [];
for (let s = 1; s <= N; s++) {
  const to = JSON.stringify(OLD.simulate(s));
  const tn = JSON.stringify(NEW.simulate(s));
  if (to !== tn) diffSeeds.push(s);
}
console.log(`預設 AI 桌 seeds 1..${N}：逐位元組比對 simulate(seed) 修前/修後`);
console.log(`不同的 seed 數：${diffSeeds.length}`);
if (diffSeeds.length) console.log('前 20 個：', diffSeeds.slice(0, 20));
process.exit(diffSeeds.length ? 1 : 0);
