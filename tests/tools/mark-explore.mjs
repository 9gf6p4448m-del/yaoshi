/* 盯上參數探索（n 小、找方向用）：三種桌 × 三策略（＋bluff2＝誘餌上出 1 免稅） */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'3000',10);
function pols(G){
  const top2=p=>{ const o=G.S.market.map((it,i)=>({i,v:it.curse?-99:it.p})).sort((a,b)=>b.v-a.v); return [o[0]?o[0].i:null,o[1]?o[1].i:null]; };
  const base=p=>{ const bids=G.S.market.map(()=>({amt:0,type:"cons",intent:"keep",target:null})); if(!p.alive) return bids;
    const [t]=top2(p); if(t==null) return bids; bids[t]={amt:Math.min(G.consCapFor(p),5),type:"cons",intent:"keep",target:null}; return bids; };
  const honest=p=>base(p); honest.mark=p=>top2(p)[0];
  const bluff=p=>base(p); bluff.mark=p=>top2(p)[1];
  const bluff2=p=>{ const b=base(p); const [,d]=top2(p); if(d!=null&&p.alive) b[d]={amt:1,type:"cons",intent:"keep",target:null}; return b; }; bluff2.mark=p=>top2(p)[1];
  const nomark=p=>base(p);
  return {honest,bluff,bluff2,nomark};
}
const tables={mixed:null, avoid:G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='avoid'; }), contest:G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='contest'; })};
const cfgs=[{MARK_CONTEST:3,MARK_SCARE:3,MARK_TAX:1},{MARK_CONTEST:6,MARK_SCARE:3,MARK_TAX:1},{MARK_CONTEST:6,MARK_SCARE:1,MARK_TAX:1},{MARK_CONTEST:8,MARK_SCARE:1,MARK_TAX:1},{MARK_CONTEST:6,MARK_SCARE:1,MARK_TAX:0}];
console.log(`n=${N}`);
for(const c of cfgs){
  console.log('\n'+JSON.stringify(c));
  for(const t of Object.keys(tables)){
    const r={};
    for(const name of ['honest','bluff','bluff2','nomark']){ const G=loadGame(P); Object.assign(G.CFG,c); if(tables[t]) tables[t](G); r[name]=(G.runMany({n:N,policies:{0:pols(G)[name]}}).winRate[0]*100); }
    console.log(`  ${t.padEnd(8)} `+Object.keys(r).map(k=>`${k} ${r[k].toFixed(1)}`).join('  ')+`   bluff2−honest ${(r.bluff2-r.honest).toFixed(1)}  honest−nomark ${(r.honest-r.nomark).toFixed(1)}`);
  }
}
