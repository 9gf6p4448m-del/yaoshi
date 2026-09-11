// L4-pre 評分：對照隱藏 mapping，算兩個方向 + 四支示範招改前改後
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('.', import.meta.url));
const ev = D + '../../docs/experiments/2026-09-12-fx-legibility-b0-evidence/';
const NAME = { eliteSelfCut:'獻祭刀', biteGamble:'虎爺印', wardImmuneLost:'千里眼銅鈴',
  hauntLost:'魔神仔紅帽', eliteVsSwarm:'虎姑婆指甲', eliteOpenShot:'射日神弓' };
const shuffle = JSON.parse(fs.readFileSync(D+'l4pre-mapping-HIDDEN.json','utf8')).map;
const after  = JSON.parse(fs.readFileSync(ev+'sheets-after/mapping-HIDDEN.json','utf8')).mapping;
const before = JSON.parse(fs.readFileSync(ev+'sheets-before/mapping-HIDDEN.json','utf8')).mapping;
const A = JSON.parse(fs.readFileSync(D+'reader-A.json','utf8'));
const B = JSON.parse(fs.readFileSync(D+'reader-B.json','utf8'));
const byCode = arr => Object.fromEntries(arr.map(r => [r.sheet, r]));
const rA = byCode(A), rB = byCode(B);
const rows = shuffle.map(({code, orig}) => {
  const set = orig[0]==='a' ? 'after' : 'before';
  const m = (set==='after' ? after : before).find(x => x.code === 'a'+orig.slice(1));
  const a = rA[code], b = rB[code];
  const ok = r => r && r.guess === NAME[m.trait];
  const pass = ok(a) && ok(b) && a.q2 >= 4 && b.q2 >= 4;
  return { code, set, trait: m.trait, name: NAME[m.trait], tier: m.tier,
    A: a ? `${a.guess}/${a.q2}` : '缺', B: b ? `${b.guess}/${b.q2}` : '缺',
    A_ok: ok(a), B_ok: ok(b), pass };
});
rows.sort((x,y)=> x.set.localeCompare(y.set) || x.trait.localeCompare(y.trait) || x.tier - y.tier);
console.log('set    trait            tier  A(答/Q2)         B(答/Q2)         兩位皆對且≥4');
for (const r of rows) console.log(`${r.set.padEnd(6)} ${r.trait.padEnd(16)} ${r.tier}     ${r.A.padEnd(16)} ${r.B.padEnd(16)} ${r.pass?'✅':'❌'}`);
// 方向①：改後材料，已知可辨兩支，兩 tier 皆須 pass
const d1 = rows.filter(r => r.set==='after' && ['eliteVsSwarm','eliteOpenShot'].includes(r.trait));
const d1ok = d1.every(r => r.pass);
// 方向②：改前材料，已知不可辨兩支，兩 tier 皆須「不 pass」
const d2 = rows.filter(r => r.set==='before' && ['eliteSelfCut','biteGamble'].includes(r.trait));
const d2ok = d2.every(r => !r.pass);
console.log(`\n方向① 已知可辨仍可辨（after eliteVsSwarm/eliteOpenShot 4 格皆 pass）：${d1ok?'✅ 重現':'❌ 未重現'}  ${d1.filter(r=>r.pass).length}/4`);
console.log(`方向② 已知不可辨仍不可辨（before eliteSelfCut/biteGamble 4 格皆不 pass）：${d2ok?'✅ 重現':'❌ 未重現'}  不可辨 ${d2.filter(r=>!r.pass).length}/4`);
console.log(`L4-pre：${d1ok && d2ok ? '✅ 材料有效' : '❌ 材料無效（回頭修材料，不得先改招式）'}`);
// 參考：四支示範招改前→改後
console.log('\n參考（非閘門）：四支示範招 改前→改後');
for (const t of ['eliteSelfCut','biteGamble','wardImmuneLost','hauntLost']) for (const tier of [1,2]) {
  const bf = rows.find(r=>r.set==='before'&&r.trait===t&&r.tier===tier);
  const af = rows.find(r=>r.set==='after'&&r.trait===t&&r.tier===tier);
  console.log(`  ${NAME[t].padEnd(6)} t${tier}  改前 A ${bf.A} B ${bf.B} ${bf.pass?'✅':'❌'}  →  改後 A ${af.A} B ${af.B} ${af.pass?'✅':'❌'}`);
}
fs.writeFileSync(D+'l4pre-score.json', JSON.stringify({rows, d1ok, d2ok, valid: d1ok&&d2ok}, null, 1));
