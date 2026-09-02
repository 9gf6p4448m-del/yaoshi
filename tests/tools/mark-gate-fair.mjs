/* G1′／G2″ 正式量測（對等出價，只差盯哪件；活性用反事實：同種子下「真人出價的件」上他人出價數） */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html'; const N=parseInt(process.argv[2]||'10000',10);
function fairPolicies(G){
  const top2=p=>{ const o=G.S.market.map((it,i)=>({i,v:it.curse?-99:it.p})).sort((a,b)=>b.v-a.v); return [o[0]?o[0].i:null,o[1]?o[1].i:null]; };
  const base=p=>{ const b=G.S.market.map(()=>({amt:0,type:"cons",intent:"keep",target:null})); if(!p.alive) return b;
    const [t,d]=top2(p); if(t!=null) b[t]={amt:Math.min(G.consCapFor(p),5),type:"cons",intent:"keep",target:null}; if(d!=null) b[d]={amt:1,type:"cons",intent:"keep",target:null}; return b; };
  const mtop=p=>base(p); mtop.mark=p=>top2(p)[0];
  const msec=p=>base(p); msec.mark=p=>top2(p)[1];
  const mnone=p=>base(p);
  return {mtop,msec,mnone};
}
function runFair(setup){
  const out={};
  for(const name of ['mtop','msec','mnone']){
    const G=loadGame(P); if(setup) setup(G); const pol=fairPolicies(G)[name];
    let wins=0,hi=0,ho=0;
    for(let s=1;s<=N;s++){ const g=G.playPolicyGame(s,{0:pol}); if(g.winnerId===0) wins++; hi+=g.markStat.hItems; ho+=g.markStat.hOthers; }
    out[name]={win:wins/N*100, othersPerItem:hi?ho/hi:NaN};
  }
  return out;
}
const fm=r=>Object.keys(r).map(k=>`${k} ${r[k].win.toFixed(2)}%`).join('  ');
const ac=r=>Object.keys(r).map(k=>`${k} ${r[k].othersPerItem.toFixed(3)}`).join('  ');
const sp=o=>{ const w=Object.values(o).map(x=>x.win); return Math.max(...w)-Math.min(...w); };
console.log(`n=${N}`);
const M=runFair(null), A=runFair(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='avoid'; })), C=runFair(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='contest'; }));
console.log('[G1′ 混合桌]',fm(M),` 最大差 ${sp(M).toFixed(2)}pp ${sp(M)<=3?'✅':'❌'}`);
console.log('[G1′ 全怯場桌]',fm(A),` msec−mnone ${(A.msec.win-A.mnone.win).toFixed(2)}pp ${A.msec.win-A.mnone.win>=2?'✅':'❌'}`);
console.log('[G1′ 全搶標桌]',fm(C),` msec−mnone ${(C.msec.win-C.mnone.win).toFixed(2)}pp ${C.msec.win-C.mnone.win<=-2?'✅':'❌'}`);
console.log('[G2″ 我出價的件上、他人出價筆數／件]');
console.log('  混合桌  ',ac(M)); console.log('  全怯場桌',ac(A),` mtop/mnone ${(A.mtop.othersPerItem/A.mnone.othersPerItem).toFixed(3)} ${A.mtop.othersPerItem<=A.mnone.othersPerItem*0.9?'✅ −10%':'❌'}`);
console.log('  全搶標桌',ac(C),` mtop/mnone ${(C.mtop.othersPerItem/C.mnone.othersPerItem).toFixed(3)} ${C.mtop.othersPerItem>=C.mnone.othersPerItem*1.1?'✅ +10%':'❌'}`);
