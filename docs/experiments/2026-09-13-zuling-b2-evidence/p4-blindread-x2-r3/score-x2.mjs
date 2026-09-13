/* P4 新三輪評分（香火＋祖靈 18 支）。跑法：node scratchpad/p4-b1/score-x2.mjs <worktree 根> <輪次>
   判準（凍結，同香火三輪）：格＝(trId, A-t1)／(A-t2)／(B-t2)；每對兩位讀者 Q1 效果、Q2 對象、Q3 系三題皆對（真值或 alt）＝✅；三對 ≥2 ✅＝多數；每支三格皆多數＝過；18 支全過＝批過。Q4 只記錄。 */
import fs from 'node:fs'; import path from 'node:path';
const [root,rnd]=process.argv.slice(2); const EV=path.join(root,'docs/experiments/2026-09-13-zuling-b2-evidence');
const rows=[...(JSON.parse(fs.readFileSync(path.join(root,'docs/experiments/2026-09-13-xianghuo-b1-evidence/p4-truth.json'),'utf8')).rows), ...(JSON.parse(fs.readFileSync(path.join(EV,'p4-truth-zuling.json'),'utf8')).rows||[])];
const truth=Object.fromEntries(rows.map(t=>[t.trId,t])); if(Object.keys(truth).length!==18) throw new Error('真值不是 18 支：'+Object.keys(truth).length);
const ok=(t,r,k)=>r[k]===t[k]||(t.alt&&t.alt[k]&&r[k]===t.alt[k]);
const cell={}; for(const p of ['p1','p2','p3']){const D=path.join(EV,`p4-blindread-x2-${rnd}`,p); const map=JSON.parse(fs.readFileSync(path.join(D,`${p}-shuffle-mapping-HIDDEN.json`),'utf8')).map;
  const RA=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(D,`${p}-reader-A.json`),'utf8')).map(r=>[r.sheet,r])); const RB=Object.fromEntries(JSON.parse(fs.readFileSync(path.join(D,`${p}-reader-B.json`),'utf8')).map(r=>[r.sheet,r]));
  for(const m of map){const t=truth[m.trId], a=RA[m.code], b=RB[m.code]; const pa=ok(t,a,'effect')&&ok(t,a,'target')&&ok(t,a,'faction'), pb=ok(t,b,'effect')&&ok(t,b,'target')&&ok(t,b,'faction'); (cell[`${m.trId}|${m.material}-t${m.tier}`]??=[]).push({p,pass:pa&&pb,a,b});}}
const out=[]; const say=s=>{out.push(s);console.log(s);}; const maj={}; for(const k of Object.keys(cell).sort()){const n=cell[k].filter(x=>x.pass).length; maj[k]=n>=2; say(`${k.padEnd(30)} ${cell[k].map(x=>x.pass?'✅':'❌').join('  ')}  多數 ${n>=2?'✅':'❌'} ${n}/3`);}
const traits=[...new Set(Object.keys(cell).map(k=>k.split('|')[0]))]; const failed=[]; for(const t of traits){const bad=Object.keys(maj).filter(k=>k.startsWith(t+'|')&&!maj[k]); say(`${t.padEnd(16)} ${truth[t].faction} ${bad.length?'❌ '+bad.map(k=>k.split('|')[1]).join('、'):'✅'}`); if(bad.length) failed.push(t);}
say(`P4（18 支）：${failed.length?'❌ 未過（'+failed.length+' 支）':'✅ 通過'}`);
// 逐題
const acc={}; for(const k of Object.keys(cell)){const t=k.split('|')[0]; (acc[t]??={e:0,tg:0,f:0,n:0}); for(const x of cell[k]) for(const r of [x.a,x.b]){acc[t].n++; if(ok(truth[t],r,'effect'))acc[t].e++; if(ok(truth[t],r,'target'))acc[t].tg++; if(ok(truth[t],r,'faction'))acc[t].f++;}}
say('逐題（各/18）：'+traits.map(t=>`${t} 效${acc[t].e} 對${acc[t].tg} 系${acc[t].f}`).join('；'));
const D=path.join(EV,`p4-blindread-x2-${rnd}`); fs.writeFileSync(path.join(D,'score.txt'),out.join('\n')+'\n'); fs.writeFileSync(path.join(D,'score.json'),JSON.stringify({cell:Object.fromEntries(Object.entries(cell).map(([k,v])=>[k,v.map(x=>({p:x.p,pass:x.pass}))])),maj,failed,acc},null,1));
