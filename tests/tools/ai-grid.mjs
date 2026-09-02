/* 待辦 22 參數網格：AI_IDLE_P × AI_THROTTLE，三腳本策略勝率（越低＝AI 越強）＋ aiLike 座位 0（應趨近 25%） */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'10000',10);
const pols=['splitter','greedy','hoarder','aiLike'];
console.log(`n=${N}\nIDLE\tTHR\t`+pols.join('\t'));
for(const idle of [0,0.15,0.25,0.35]) for(const thr of [0.45,0.35,0.30]){
  const r=pols.map(name=>{ const G=loadGame(P); G.CFG.AI_IDLE_P=idle; G.CFG.AI_THROTTLE=thr; return (G.runMany({n:N,policies:{0:G.POLICIES[name]}}).winRate[0]*100).toFixed(2); });
  console.log(`${idle}\t${thr}\t`+r.join('\t'));
}
