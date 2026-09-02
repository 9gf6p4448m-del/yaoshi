import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
/* A. 每夜壽命去向（seat 0，simulate 的 scriptedBids 座位；600 局） */
for(const life of [40,80]){
  const G=loadGame(P); G.CFG.LIFE=life; let auc=0,bat=0,n=0, fee=0;
  for(let s=1;s<=600;s++){ const t=G.simulate(s); t.nights.forEach(nt=>{ const a=nt.pre[0].life-nt.mid[0].life, b=nt.mid[0].life-nt.post[0].life; if(nt.pre[0].alive){ auc+=a; bat+=b; n++; } }); }
  console.log(`LIFE=${life}: 每夜拍賣階段淨失 ${(auc/n).toFixed(2)}／對決＋夜末淨失 ${(bat/n).toFixed(2)}（含心願回血）`);
}
/* B. 回血旋鈕網格 */
const pols=['splitter','greedy','hoarder','aiLike']; const N=3000;
console.log(`\nn=${N}\nLIFE\tREGEN\t中位夜\t到12夜%\t出局人\t換手\t`+pols.join('\t'));
for(const life of [40,50]) for(const regen of [0,2,3,4,5]){
  if(regen===0&&life===40) continue;
  const G=loadGame(P); G.CFG.LIFE=life; G.CFG.NIGHT_REGEN=regen;
  const lens=[],deads=[],chs=[];
  for(let s=1;s<=N;s++){ const g=G.playPolicyGame(s,{0:G.POLICIES.aiLike}); lens.push(g.gameLength); deads.push(g.finalLife.filter(x=>x<=0).length);
    let ch=0,prev=null; g.lifeByRound.forEach(a=>{ const l=a.indexOf(Math.max(...a)); if(prev!==null&&l!==prev) ch++; prev=l; }); chs.push(ch); }
  lens.sort((a,b)=>a-b); const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const wr=pols.map(name=>{ const H=loadGame(P); H.CFG.LIFE=life; H.CFG.NIGHT_REGEN=regen; return (H.runMany({n:N,policies:{0:H.POLICIES[name]}}).winRate[0]*100).toFixed(1); });
  console.log(`${life}\t${regen}\t${lens[Math.floor(N/2)]}\t${(lens.filter(x=>x>=12).length/N*100).toFixed(0)}%\t${avg(deads).toFixed(2)}\t${avg(chs).toFixed(2)}\t`+wr.join('\t'));
}
