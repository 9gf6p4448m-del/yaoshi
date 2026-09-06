/* D1 補充之二：預設 AI 桌，逐夜逐戰比對「數值」欄位（排除 battles[].extra 這種純文字招式紀錄——
   env.log 只在該招式該場首次觸發時記一次，鬼觸發若剛好是唯一一次觸發，這份文字紀錄本來就該消失，
   這正是驗收凍結檔允許的「trait 相關差異」，不是本腳本要抓的東西）。
   本腳本抓的是：battles[].winnerId／dmg、post[].life、deaths、bye、nightly、market/auction 是否也逐夜相同——
   任何一項不同就不是「只差 trait 記錄」，要停手。
   跑法：node tests/tools/duel-desync-d1c.mjs [--old=old.html] [--new=index.html] [--n=2000] */
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

function strip(night) {
  return {
    round: night.round, market: night.market, auction: night.auction, mid: night.mid,
    battles: night.battles.map(b => ({ aId: b.aId, bId: b.bId, pa: b.pa, pb: b.pb, winnerId: b.winnerId, dmg: b.dmg })),
    bye: night.bye, nightly: night.nightly, deaths: night.deaths,
    event: night.event,
    post: night.post,
  };
}

let numericDiff = [];
let extraShrink = 0, extraGrow = 0;
for (let s = 1; s <= N; s++) {
  const to = OLD.simulate(s), tn = NEW.simulate(s);
  const a = JSON.stringify(to.nights.map(strip));
  const b = JSON.stringify(tn.nights.map(strip));
  if (a !== b) numericDiff.push(s);
  // extra（招式文字紀錄）筆數變化：只看方向，不要求相等
  to.nights.forEach((n, i) => {
    const nn = tn.nights[i]; if (!nn) return;
    n.battles.forEach((f, j) => {
      const ff = nn.battles[j]; if (!ff) return;
      const d = (ff.extra ? ff.extra.length : 0) - (f.extra ? f.extra.length : 0);
      if (d < 0) extraShrink++; else if (d > 0) extraGrow++;
    });
  });
}
console.log(`預設 AI 桌 seeds 1..${N}：排除 extra 文字後的數值欄位比對`);
console.log(`數值不同的 seed 數：${numericDiff.length}`);
if (numericDiff.length) console.log('前 20 個：', numericDiff.slice(0, 20));
console.log(`battles[].extra 筆數變少的場次：${extraShrink}　變多的場次：${extraGrow}（變多＝不合理，應為 0）`);
process.exit(numericDiff.length || extraGrow ? 1 : 0);
