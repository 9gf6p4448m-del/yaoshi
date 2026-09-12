/* P4 評分（香火批 1，判準在答卷回來前凍結）。跑法：node scratchpad/p4-b1/score.mjs <worktree 根>
   格＝(trId, A-t1)／(trId, A-t2)／(trId, B-t2) 共 27 格。
   每格每對：兩位讀者 Q1 效果、Q2 對象、Q3 系 **三題皆對**（真值或 alt 皆算對）＝該對 ✅；三對中 ≥2 對 ✅＝多數 ✅（修訂三 ①）。
   每支招：三格皆多數 ✅ ＝ 該招過。批 1 P4 通過＝9 支全過；否則列出未過的招與格。Q4 法寶名只記錄不判。 */
import fs from 'node:fs'; import path from 'node:path';
const root=process.argv[2]; const EV=path.join(root,'docs/experiments/2026-09-13-xianghuo-b1-evidence');
const truth=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(EV,'p4-truth.json'),'utf8')).map(t=>[t.trId,t]));
const ok=(t,r,k)=>r[k]===t[k]||(t.alt&&t.alt[k]&&r[k]===t.alt[k]);
const cell={}; const pairs=['p1','p2','p3'];
for(const p of pairs){
  const map=JSON.parse(fs.readFileSync(path.join(EV,'p4-blindread',p,`${p}-shuffle-mapping-HIDDEN.json`),'utf8')).map;
  const RA=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(EV,'p4-blindread',p,`${p}-reader-A.json`),'utf8')).map(r=>[r.sheet,r]));
  const RB=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(EV,'p4-blindread',p,`${p}-reader-B.json`),'utf8')).map(r=>[r.sheet,r]));
  for(const m of map){ const t=truth[m.trId]; const a=RA[m.code], b=RB[m.code];
    const pa=ok(t,a,'effect')&&ok(t,a,'target')&&ok(t,a,'faction'), pb=ok(t,b,'effect')&&ok(t,b,'target')&&ok(t,b,'faction');
    const k=`${m.trId}|${m.material}-t${m.tier}`; (cell[k]??=[]).push({p,A:`${a.effect}/${a.target}/${a.faction}${pa?'✓':'✗'}`,B:`${b.effect}/${b.target}/${b.faction}${pb?'✓':'✗'}`,pass:pa&&pb,nameA:a.name,nameB:b.name}); } }
const out=[]; const say=s=>{out.push(s);console.log(s);};
say('P4 盲讀（香火批 1，三對多數）'); say('格                           p1              p2              p3              多數');
const maj={}; for(const k of Object.keys(cell).sort()){const v=cell[k]; const n=v.filter(x=>x.pass).length; maj[k]=n>=2; say(`${k.padEnd(28)} ${v.map(x=>(x.pass?'✅':'❌')).join('               ')}   ${n>=2?'✅':'❌'} ${n}/3`);}
const traits=[...new Set(Object.keys(cell).map(k=>k.split('|')[0]))]; const failed=[];
for(const t of traits){const ks=Object.keys(maj).filter(k=>k.startsWith(t+'|')); const bad=ks.filter(k=>!maj[k]); say(`${t.padEnd(18)} ${bad.length?'❌ 未過：'+bad.map(k=>k.split('|')[1]).join('、'):'✅ 過'}`); if(bad.length) failed.push(t);}
say(`批 1 P4：${failed.length?'❌ 未過（'+failed.length+' 支）':'✅ 通過（9 支全過）'}`);
say('Q4 法寶名（只記錄）：'+traits.map(t=>{const v=Object.keys(cell).filter(k=>k.startsWith(t+'|')).flatMap(k=>cell[k]).flatMap(x=>[x.nameA,x.nameB]); const hit=v.filter(n=>n===truth[t].name).length; return `${t} ${hit}/${v.length}`;}).join('；'));
fs.writeFileSync(path.join(EV,'p4-blindread','score.txt'),out.join('\n')+'\n'); fs.writeFileSync(path.join(EV,'p4-blindread','score.json'),JSON.stringify({cell,maj,failed},null,1));
