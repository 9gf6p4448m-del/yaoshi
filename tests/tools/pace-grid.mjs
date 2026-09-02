/* 節奏實驗：LIFE × DMG_BASE × DMG_MAX → 局長分布、撐到第 12 夜比例、出局人數、領先換手、三策略＋aiLike 勝率 */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'4000',10);
const pols=['splitter','greedy','hoarder','aiLike'];
console.log(`n=${N}（局長統計用 aiLike）\nLIFE\tBASE\tMAX\t中位夜\t到12夜%\t平均出局人\t換手\t`+pols.join('\t'));
for(const life of [40,50,60,70,80]) for(const base of [3,2]) for(const max of [6,4]){
  if(life===40&&base===3&&max===4) continue;
  const G=loadGame(P); G.CFG.LIFE=life; G.CFG.DMG_BASE=base; G.CFG.DMG_MAX=max;
  const lens=[], deads=[], chs=[];
  for(let s=1;s<=N;s++){ const g=G.playPolicyGame(s,{0:G.POLICIES.aiLike}); lens.push(g.gameLength);
    deads.push(g.finalLife.filter(x=>x<=0).length);
    let ch=0,prev=null; g.lifeByRound.forEach(a=>{ const l=a.indexOf(Math.max(...a)); if(prev!==null&&l!==prev) ch++; prev=l; }); chs.push(ch); }
  lens.sort((a,b)=>a-b); const med=lens[Math.floor(N/2)], to12=lens.filter(x=>x>=12).length/N*100;
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const wr=pols.map(name=>{ const H=loadGame(P); H.CFG.LIFE=life; H.CFG.DMG_BASE=base; H.CFG.DMG_MAX=max; return (H.runMany({n:N,policies:{0:H.POLICIES[name]}}).winRate[0]*100).toFixed(1); });
  console.log(`${life}\t${base}\t${max}\t${med}\t${to12.toFixed(0)}%\t${avg(deads).toFixed(2)}\t${avg(chs).toFixed(2)}\t`+wr.join('\t'));
}
