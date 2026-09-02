import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'10000',10);
const pols=['splitter','greedy','hoarder','aiLike'];
console.log(`n=${N}\nIDLE\tTHR\t`+pols.join('\t'));
for(const thr of [0.55,0.65,0.8,1.0]){
  const r=pols.map(name=>{ const G=loadGame(P); G.CFG.AI_IDLE_P=0; G.CFG.AI_THROTTLE=thr; return (G.runMany({n:N,policies:{0:G.POLICIES[name]}}).winRate[0]*100).toFixed(2); });
  console.log(`0\t${thr}\t`+r.join('\t'));
}
