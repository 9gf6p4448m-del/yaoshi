/* B3 節奏與整體（凍結檔 docs/experiments/2026-09-07-acceptance-role-balance.md）：
     ① 預設 AI 桌（座位 0 不塞策略、四席全走 aiBids）局長中位落在 10～12 夜
     ② splitter／greedy／hoarder 三策略的座位 0 勝率，對基準的位移 ≤ ±2pp
   跑法：node tests/tools/role-balance-b3.mjs <基準 index.html> [新版 index.html] [--n=10000] [--only=len|pol] [--pols=greedy]
         （--only／--pols 是為了拆成多個行程並行跑；判定值不因為拆開而改變）
   局長中位是 runMany 沒有回傳的，所以逐局走 playPolicyGame 自己收 gameLength。 */
import path from 'path';
import {fileURLToPath} from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const {loadGame} = await import('file:///' + path.join(HERE, 'load.mjs').replace(/\\/g, '/'));

const argv = process.argv.slice(2);
const pos = argv.filter(a => !a.startsWith('--'));
const arg = (k, d) => { const h = argv.find(a => a.startsWith('--' + k + '=')); return h ? h.slice(k.length + 3) : d; };
const BASE = path.resolve(pos[0] || '');
const NEW = path.resolve(pos[1] || path.join(ROOT, 'index.html'));
const N = parseInt(arg('n', '10000'), 10);
const ONLY = arg('only', '');
const POLS = arg('pols', 'splitter,greedy,hoarder').split(',').filter(Boolean);

function median(a) { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

function lenStats(file) {
  const G = loadGame(file);
  const lens = [];
  for (let sd = 1; sd <= N; sd++) lens.push(G.playPolicyGame(sd, {}).gameLength);   /* 空 policies＝四席全 AI */
  return {median: median(lens), mean: lens.reduce((a, b) => a + b, 0) / lens.length,
    min: Math.min(...lens), max: Math.max(...lens)};
}
function polWin(file, name) {
  const G = loadGame(file);
  return G.runMany({n: N, policies: {0: G.POLICIES[name]}}).winRate[0] * 100;
}

console.log(`n=${N}\n基準：${BASE}\n新版：${NEW}\n`);
if (ONLY !== 'pol') {
  for (const [tag, f] of [['基準', BASE], ['新版', NEW]]) {
    const s = lenStats(f);
    console.log(`[B3①] ${tag} 預設 AI 桌局長：中位 ${s.median}　平均 ${s.mean.toFixed(2)}　範圍 ${s.min}–${s.max}`
      + `　${tag === '新版' ? (s.median >= 10 && s.median <= 12 ? '✅ 落在 10～12' : '❌ 不在 10～12') : ''}`);
  }
}
if (ONLY !== 'len') {
  console.log('');
  for (const name of POLS) {
    const a = polWin(BASE, name), b = polWin(NEW, name), d = b - a;
    console.log(`[B3②] ${name}\t基準 ${a.toFixed(2)}%\t新版 ${b.toFixed(2)}%\t位移 ${d >= 0 ? '+' : ''}${d.toFixed(2)}pp`
      + `\t${Math.abs(d) <= 2 ? '✅ ≤2pp' : '❌ 超過 2pp'}`);
  }
}
