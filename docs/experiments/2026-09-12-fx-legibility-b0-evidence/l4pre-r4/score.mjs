/* L4-pre 評分：對照隱藏 mapping，算兩個方向 ＋ 四支示範招改前改後。
   跑法（★就地跑，不必改路徑★，覆審 r1 M6）：
     node docs/experiments/2026-09-12-fx-legibility-b0-evidence/l4pre-r1/score.mjs
   r2／r3 各有一份**逐字相同**的副本，輪次由所在目錄名（l4pre-rN）推出來，讀檔名前綴 rN-*。
   它會重寫同目錄的 rN-score.json——三輪跑出來與 committed 的那份逐格相同（那是本檔的驗收）。

   ★判定用的是凍結檔 L4-pre 的原文對照組★（已知可辨＝eliteVsSwarm＋eliteOpenShot、
   已知不可辨＝eliteSelfCut＋biteGamble）。凍結檔 §2.1 修訂二與其勘誤改的是「哪幾格算數」，
   那份重算寫在報告裡，不動本檔——否則三輪的原始評分就不可比了。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const D = path.dirname(fileURLToPath(import.meta.url));          // …/l4pre-rN
const EV = path.join(D, '..');                                    // …/2026-09-12-fx-legibility-b0-evidence
const R = path.basename(D).replace(/^l4pre-/, '');                // r1 / r2 / r3
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const NAME = { eliteSelfCut: '獻祭刀', biteGamble: '虎爺印', wardImmuneLost: '千里眼銅鈴',
  hauntLost: '魔神仔紅帽', eliteVsSwarm: '虎姑婆指甲', eliteOpenShot: '射日神弓' };
const shuffle = rd(path.join(D, `${R}-shuffle-mapping-HIDDEN.json`)).map;
const after = rd(path.join(EV, 'sheets-after/mapping-HIDDEN.json')).mapping;
const before = rd(path.join(EV, 'sheets-before/mapping-HIDDEN.json')).mapping;
const A = rd(path.join(D, `${R}-reader-A.json`));
const B = rd(path.join(D, `${R}-reader-B.json`));

const byCode = (arr) => Object.fromEntries(arr.map((r) => [r.sheet, r]));
const rA = byCode(A), rB = byCode(B);
const rows = shuffle.map(({ code, orig }) => {
  const set = orig[0] === 'a' ? 'after' : 'before';
  const m = (set === 'after' ? after : before).find((x) => x.code === 'a' + orig.slice(1));
  const a = rA[code], b = rB[code];
  const ok = (r) => r && r.guess === NAME[m.trait];
  const pass = ok(a) && ok(b) && a.q2 >= 4 && b.q2 >= 4;
  return { code, set, trait: m.trait, name: NAME[m.trait], tier: m.tier,
    A: a ? `${a.guess}/${a.q2}` : '缺', B: b ? `${b.guess}/${b.q2}` : '缺',
    A_ok: ok(a), B_ok: ok(b), pass };
});
rows.sort((x, y) => x.set.localeCompare(y.set) || x.trait.localeCompare(y.trait) || x.tier - y.tier);
console.log(`L4-pre ${R}`);
console.log('set    trait            tier  A(答/Q2)         B(答/Q2)         兩位皆對且≥4');
for (const r of rows) console.log(`${r.set.padEnd(6)} ${r.trait.padEnd(16)} ${r.tier}     ${r.A.padEnd(16)} ${r.B.padEnd(16)} ${r.pass ? '✅' : '❌'}`);

const d1 = rows.filter((r) => r.set === 'after' && ['eliteVsSwarm', 'eliteOpenShot'].includes(r.trait));
const d1ok = d1.every((r) => r.pass);
const d2 = rows.filter((r) => r.set === 'before' && ['eliteSelfCut', 'biteGamble'].includes(r.trait));
const d2ok = d2.every((r) => !r.pass);
console.log(`\n方向① 已知可辨仍可辨（after eliteVsSwarm/eliteOpenShot 4 格皆 pass）：${d1ok ? '✅ 重現' : '❌ 未重現'}  ${d1.filter((r) => r.pass).length}/4`);
console.log(`方向② 已知不可辨仍不可辨（before eliteSelfCut/biteGamble 4 格皆不 pass）：${d2ok ? '✅ 重現' : '❌ 未重現'}  不可辨 ${d2.filter((r) => !r.pass).length}/4`);
console.log(`L4-pre：${d1ok && d2ok ? '✅ 材料有效' : '❌ 材料無效（回頭修材料，不得先改招式）'}`);
console.log('\n參考（非閘門）：四支示範招 改前→改後');
for (const t of ['eliteSelfCut', 'biteGamble', 'wardImmuneLost', 'hauntLost']) {
  for (const tier of [1, 2]) {
    const bf = rows.find((r) => r.set === 'before' && r.trait === t && r.tier === tier);
    const af = rows.find((r) => r.set === 'after' && r.trait === t && r.tier === tier);
    console.log(`  ${NAME[t].padEnd(6)} t${tier}  改前 A ${bf.A} B ${bf.B} ${bf.pass ? '✅' : '❌'}  →  改後 A ${af.A} B ${af.B} ${af.pass ? '✅' : '❌'}`);
  }
}
fs.writeFileSync(path.join(D, `${R}-score.json`), JSON.stringify({ rows, d1ok, d2ok, valid: d1ok && d2ok }, null, 1));
