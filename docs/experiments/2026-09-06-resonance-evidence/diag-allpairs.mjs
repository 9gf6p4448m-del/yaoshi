/* 診斷（非閘門）：全部「同系3件 vs 三系各1件、總p相等」配對，n=2000，各候選相對 MODE 0 的成套勝率位移分布 */
import {loadGame} from 'file:///C:/Users/shung/OneDrive/桌面/妖市/tests/tools/load.mjs';
const NEW='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const G={}; for(const m of [0,1,2,3]){ G[m]=loadGame(NEW); G[m].CFG.PW_RES_MODE=m; }
const g0=G[0]; const pool=g0.POOL.filter(x=>!x.curse); const facs=['zuling','xianghuo','yinqi'];
const byF={}; for(const f of facs) byF[f]=pool.filter(x=>x.f===f);
const combos=a=>{const o=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)for(let k=j+1;k<a.length;k++)o.push([a[i],a[j],a[k]]);return o;};
const sumP=b=>b.reduce((s,x)=>s+x.p,0);
const mixed=[]; for(const a of byF.zuling)for(const b of byF.xianghuo)for(const c of byF.yinqi) mixed.push([a,b,c]);
const cand=[]; for(const f of facs) for(const s of combos(byF[f])){ const m=mixed.find(x=>sumP(x)===sumP(s)&&!x.some(y=>s.includes(y))); if(m) cand.push({f,set:s,mix:m}); }
const bag=b=>b.map(x=>({...x})); const S=Array.from({length:2000},(_,i)=>i+1);
const rows=cand.map(c=>{ const r={f:c.f,p:sumP(c.set),base:g0.duelBags(bag(c.set),bag(c.mix),S).rateDecided}; for(const m of [1,2,3]) r[m]=G[m].duelBags(bag(c.set),bag(c.mix),S).rateDecided; return r; });
const pct=v=>(v*100).toFixed(1)+'%';
console.log(`配對總數 ${rows.length}（zuling ${rows.filter(r=>r.f==='zuling').length}／xianghuo ${rows.filter(r=>r.f==='xianghuo').length}／yinqi ${rows.filter(r=>r.f==='yinqi').length}）`);
console.log('| 候選 | 平均成套勝率（基準→候選） | 平均位移 | 位移>0 的配對 | 位移<0 | 候選下成套 100% 的配對 | 候選下成套 ≥90% |');
console.log('|---|---|---|---|---|---|---|');
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
for(const m of [1,2,3]){ const d=rows.map(r=>r[m]-r.base);
  console.log(`| M${m} | ${pct(mean(rows.map(r=>r.base)))}→${pct(mean(rows.map(r=>r[m])))} | ${(mean(d)*100).toFixed(1)}pp | ${d.filter(x=>x>0.001).length} | ${d.filter(x=>x<-0.001).length} | ${rows.filter(r=>r[m]>=0.999).length} | ${rows.filter(r=>r[m]>=0.90).length} |`); }
console.log('基準下成套 100% 的配對：'+rows.filter(r=>r.base>=0.999).length+'；基準 ≥90%：'+rows.filter(r=>r.base>=0.90).length);
for(const f of facs){ const rs=rows.filter(r=>r.f===f); console.log(`- ${f}：基準均 ${pct(mean(rs.map(r=>r.base)))}；M1 ${pct(mean(rs.map(r=>r[1])))}；M2 ${pct(mean(rs.map(r=>r[2])))}；M3 ${pct(mean(rs.map(r=>r[3])))}`); }
