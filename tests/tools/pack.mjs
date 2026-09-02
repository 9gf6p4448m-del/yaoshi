/* 節奏包量測（角色壽命已改相對位移）：局長、到 12 夜、出局、換手、四策略勝率 */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'10000',10);
const pols=['splitter','greedy','hoarder','aiLike'];
console.log(`n=${N}\nLIFE\tTHR\tREGEN\t中位夜\t到12夜%\t出局人\t換手\t`+pols.join('\t'));
for(const [life,thr,regen] of [[40,0.45,0],[40,0.3,5],[50,0.3,5],[50,0.3,4]]){
  const G=loadGame(P); G.CFG.LIFE=life; G.CFG.AI_THROTTLE=thr; G.CFG.NIGHT_REGEN=regen;
  const lens=[],deads=[],chs=[];
  for(let s=1;s<=N;s++){ const g=G.playPolicyGame(s,{0:G.POLICIES.aiLike}); lens.push(g.gameLength); deads.push(g.finalLife.filter(x=>x<=0).length);
    let ch=0,prev=null; g.lifeByRound.forEach(a=>{ const l=a.indexOf(Math.max(...a)); if(prev!==null&&l!==prev) ch++; prev=l; }); chs.push(ch); }
  lens.sort((a,b)=>a-b); const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const wr=pols.map(name=>{ const H=loadGame(P); H.CFG.LIFE=life; H.CFG.AI_THROTTLE=thr; H.CFG.NIGHT_REGEN=regen; return (H.runMany({n:N,policies:{0:H.POLICIES[name]}}).winRate[0]*100).toFixed(1); });
  console.log(`${life}\t${thr}\t${regen}\t${lens[Math.floor(N/2)]}\t${(lens.filter(x=>x>=12).length/N*100).toFixed(0)}%\t${avg(deads).toFixed(2)}\t${avg(chs).toFixed(2)}\t`+wr.join('\t'));
}
