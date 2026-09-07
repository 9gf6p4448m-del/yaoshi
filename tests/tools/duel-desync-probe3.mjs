/* 唯讀探針 3：2000 局預設 AI 桌統計。
   (a) 「正式對決」(resolveBattles 那條)：對每一夜每一場戰鬥，先比對雙方在 mid 快照（auction 後、
       battle 前）的袋子是否逐項相同；相同才比對 winnerId/dmg/pa/pb——這是唯一能排除「AI 上游決策
       已經分岔、雙方根本不是同一場戰鬥」干擾之後，真正檢驗 paperWar 本身有沒有對同一組輸入給出不同
       輸出的比法。袋子不同的場次另計，屬「上游分岔」不算 resolveBattles 的不同。
   (b) AI 估價（pwTrialAvg）：對每一夜、每個存活玩家，用該夜 pre 快照（進入這一夜拍賣前的袋子）＋
       其餘存活玩家的袋子，外部重算 pwTrialAvg(myBag, foeBags, round)（用匯出的 G.pwTrial 逐一平均，
       等價於 index.html 內部 pwTrialAvg 的算法，讀原始碼可證：pwFoeBagsOf 只是過濾存活且非自己，
       pwTrialAvg 只是逐個 foeBag 呼叫 pwTrial 取平均），比較新舊兩版的值，找出第一次不同的 seed／夜、
       與總計不同的 (seed,夜,玩家) 組數。
   跑法：node tests/tools/duel-desync-probe3.mjs --old=<af12d4d 版 index.html> [--new=index.html] [--n=2000] */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGame } from './load.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, dflt) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : dflt; };
const OLD_HTML = path.resolve(arg('old'));
const NEW_HTML = path.resolve(arg('new', path.join(ROOT, 'index.html')));
const N = Number(arg('n', 2000));

const OLD = loadGame(OLD_HTML);
const NEW = loadGame(NEW_HTML);

function itemsOf(G, names) {
  return names.map((n) => {
    const it = G.POOL.find((x) => x.n === n);
    if (it) return { ...it };
    const cu = (G.CURSES || []).find((x) => x.n === n);
    if (cu) return { ...cu, curse: true };
    return null;
  }).filter(Boolean);
}
function pwTrialAvgExternal(G, myNames, foeNamesList, round) {
  const myBag = itemsOf(G, myNames);
  const foeBags = foeNamesList.map((names) => itemsOf(G, names));
  if (!foeBags.length) return 0;
  let s = 0; for (const b of foeBags) s += G.pwTrial(myBag, b, round);
  return s / foeBags.length;
}

const seeds = Array.from({ length: N }, (_, i) => i + 1);

// ---------- (a) resolveBattles：袋子相同時是否結果相同 ----------
let sameBagBattles = 0, sameBagDiffResult = 0, diffBagBattles = 0;
let firstBagDivergence = null;
const diffResultExamples = [];

// ---------- (b) pwTrialAvg 值不同 ----------
let pwCompareCount = 0, pwDiffCount = 0;
let firstPwDivergence = null;

for (const seed of seeds) {
  const to = OLD.simulate(seed), tn = NEW.simulate(seed);
  const nights = Math.min(to.nights.length, tn.nights.length);
  for (let ni = 0; ni < nights; ni++) {
    const no = to.nights[ni], nn = tn.nights[ni];
    // (b) 用這一夜的 pre 快照（本夜拍賣前）外部重算 pwTrialAvg
    const preO = no.pre, preN = nn.pre;
    if (preO && preN && preO.length === preN.length) {
      for (let pid = 0; pid < preO.length; pid++) {
        if (!preO[pid].alive || !preN[pid].alive) continue;
        const foeO = preO.filter((q, j) => j !== pid && q.alive).map((q) => q.bag);
        const foeN = preN.filter((q, j) => j !== pid && q.alive).map((q) => q.bag);
        const vO = pwTrialAvgExternal(OLD, preO[pid].bag, foeO, no.round);
        const vN = pwTrialAvgExternal(NEW, preN[pid].bag, foeN, nn.round);
        pwCompareCount++;
        if (Math.abs(vO - vN) > 1e-9) {
          pwDiffCount++;
          if (!firstPwDivergence) firstPwDivergence = { seed, night: ni, round: no.round, pid, vOld: vO, vNew: vN, myBag: preO[pid].bag };
        }
      }
    }
    // (a) 逐場戰鬥比對
    no.battles.forEach((bo, bi) => {
      const bn = nn.battles[bi];
      if (!bn) return;
      const midO = no.mid, midN = nn.mid;
      if (!midO || !midN) return;
      const bagA_O = midO[bo.aId] ? midO[bo.aId].bag : null, bagB_O = midO[bo.bId] ? midO[bo.bId].bag : null;
      const bagA_N = midN[bn.aId] ? midN[bn.aId].bag : null, bagB_N = midN[bn.bId] ? midN[bn.bId].bag : null;
      const sameA = JSON.stringify(bagA_O) === JSON.stringify(bagA_N);
      const sameB = JSON.stringify(bagB_O) === JSON.stringify(bagB_N);
      const sameAids = bo.aId === bn.aId && bo.bId === bn.bId;
      if (sameA && sameB && sameAids) {
        sameBagBattles++;
        const resSame = bo.winnerId === bn.winnerId && bo.dmg === bn.dmg && bo.pa === bn.pa && bo.pb === bn.pb;
        if (!resSame) {
          sameBagDiffResult++;
          if (diffResultExamples.length < 5) diffResultExamples.push({ seed, night: ni, old: bo, new: bn });
        }
      } else {
        diffBagBattles++;
        if (!firstBagDivergence) firstBagDivergence = { seed, night: ni, aId_old: bo.aId, bId_old: bo.bId, aId_new: bn.aId, bId_new: bn.bId, bagA_old: bagA_O, bagA_new: bagA_N, bagB_old: bagB_O, bagB_new: bagB_N };
      }
    });
  }
}

console.log(`探針 3：seeds 1..${N}，指令：node tests/tools/duel-desync-probe3.mjs --old=<af12d4d index.html> --n=${N}\n`);
console.log('(a) resolveBattles：');
console.log(`    雙方袋子相同的戰鬥場次：${sameBagBattles}　其中結果不同的場次：${sameBagDiffResult}（應為 0——這才是「同一場戰鬥，paperWar 本身有沒有給出不同答案」）`);
console.log(`    雙方袋子已不同（上游 AI 決策分岔，不是同一場戰鬥）的場次：${diffBagBattles}`);
if (diffResultExamples.length) { console.log('    ❗ 相同袋子但結果不同的例子（前 5 筆）：'); diffResultExamples.forEach((e) => console.log('      ', JSON.stringify(e))); }
if (firstBagDivergence) console.log(`    最早出現「袋子已不同」的 seed=${firstBagDivergence.seed} 夜=${firstBagDivergence.night + 1}：`, JSON.stringify(firstBagDivergence));
console.log('\n(b) pwTrialAvg（AI 估價，外部依 pwFoeBagsOf/pwTrialAvg 原演算法重算）：');
console.log(`    比對次數（每夜每存活玩家一次）：${pwCompareCount}　值不同次數：${pwDiffCount}`);
if (firstPwDivergence) console.log(`    最早出現的 seed=${firstPwDivergence.seed} 夜=${firstPwDivergence.night + 1}（round ${firstPwDivergence.round}）玩家 pid=${firstPwDivergence.pid}：舊值=${firstPwDivergence.vOld} 新值=${firstPwDivergence.vNew}　該玩家當時的袋子=${JSON.stringify(firstPwDivergence.myBag)}`);
else console.log('    未發現任何差異');
