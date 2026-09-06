/* D4：trace(1..20) 與 af12d4d 的差異若存在，必須只落在 war.log／beats 的 trait 文字，勝負欄位相同。
   跑法：node tests/tools/duel-desync-d4trace.mjs --old=<af12d4d 版 index.html> [--new=index.html] */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadGame } from './load.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (k, dflt) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : dflt; };
const OLD_HTML = path.resolve(arg('old'));
const NEW_HTML = path.resolve(arg('new', path.join(ROOT, 'index.html')));

const OLD = loadGame(OLD_HTML);
const NEW = loadGame(NEW_HTML);
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const to = OLD.trace(seeds), tn = NEW.trace(seeds);
const sameBytes = JSON.stringify(to) === JSON.stringify(tn);
console.log('逐位元組相等：', sameBytes);
let diffCount = 0;
to.runs.forEach((ro, ri) => {
  const rn = tn.runs[ri];
  ro.nights.forEach((no, ni) => {
    const nn = rn.nights[ni];
    if (!nn) { console.log('缺夜次', ro.seed, ni); diffCount++; return; }
    no.battles.forEach((bo, bi) => {
      const bn = nn.battles[bi];
      const keys = Object.keys(bo).filter(k => k !== 'extra');
      for (const k of keys) {
        if (JSON.stringify(bo[k]) !== JSON.stringify(bn[k])) {
          console.log('DIFF(非 extra 欄位) seed', ro.seed, 'night', ni, 'battle', bi, 'field', k, bo[k], '->', bn[k]);
          diffCount++;
        }
      }
      const eo = (bo.extra || []).length, en = (bn.extra || []).length;
      if (eo !== en) console.log('extra 筆數不同 seed', ro.seed, 'night', ni, 'battle', bi, eo, '->', en, eo < en ? '(變多，不合理)' : '(變少，屬預期內的鬼觸發文字消失)');
      if (eo < en) diffCount++;
    });
    if (JSON.stringify(no.post) !== JSON.stringify(nn.post)) { console.log('POST 不同 seed', ro.seed, 'night', ni); diffCount++; }
    if (JSON.stringify(no.deaths) !== JSON.stringify(nn.deaths)) { console.log('DEATHS 不同 seed', ro.seed, 'night', ni); diffCount++; }
  });
});
console.log('非 extra 欄位（含 extra 變多）差異數：', diffCount);
process.exit(diffCount ? 1 : 0);
