/* 對等對照：三策略同一套出價（主標 5 在戰力最高件、側標 1 在次高件），只差盯哪件：top／second／none */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'3000',10);
function pols(G){
  const top2=p=>{ const o=G.S.market.map((it,i)=>({i,v:it.curse?-99:it.p})).sort((a,b)=>b.v-a.v); return [o[0]?o[0].i:null,o[1]?o[1].i:null]; };
  const base=p=>{ const b=G.S.market.map(()=>({amt:0,type:"cons",intent:"keep",target:null})); if(!p.alive) return b;
    const [t,d]=top2(p); if(t!=null) b[t]={amt:Math.min(G.consCapFor(p),5),type:"cons",intent:"keep",target:null}; if(d!=null) b[d]={amt:1,type:"cons",intent:"keep",target:null}; return b; };
  const mtop=p=>base(p); mtop.mark=p=>top2(p)[0];
  const msec=p=>base(p); msec.mark=p=>top2(p)[1];
  const mnone=p=>base(p);
  return {mtop,msec,mnone};
}
const tables={mixed:null, avoid:G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='avoid'; }), contest:G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='contest'; })};
const cfgs=[{MARK_CONTEST:3,MARK_SCARE:3},{MARK_CONTEST:6,MARK_SCARE:3},{MARK_CONTEST:6,MARK_SCARE:1.5},{MARK_CONTEST:4,MARK_SCARE:2}];
console.log(`n=${N}`);
for(const c of cfgs){
  console.log('\n'+JSON.stringify(c));
  for(const t of Object.keys(tables)){
    const r={};
    for(const name of ['mtop','msec','mnone']){ const G=loadGame(P); Object.assign(G.CFG,c); if(tables[t]) tables[t](G); r[name]=(G.runMany({n:N,policies:{0:pols(G)[name]}}).winRate[0]*100); }
    console.log(`  ${t.padEnd(8)} `+Object.keys(r).map(k=>`${k} ${r[k].toFixed(1)}`).join('  ')+`   top−none ${(r.mtop-r.mnone).toFixed(1)}  sec−none ${(r.msec-r.mnone).toFixed(1)}  top−sec ${(r.mtop-r.msec).toFixed(1)}`);
  }
}
