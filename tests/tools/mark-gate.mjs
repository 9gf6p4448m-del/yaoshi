/* 盯上宣告閘門（GAME_DESIGN §5.8 G1~G4）。跑法：node mark-gate.mjs [n]（閘門 n≥10000）
   真人座位三策略共用同一套出價（釘法不同）：honest＝盯最高並標它／bluff＝盯次高、標最高／nomark＝不盯。
   換桌：把所有角色的 markReact 改成同一型（avoid／contest），驗「換桌會翻盤」。 */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const N=parseInt(process.argv[2]||'10000',10);
const seeds=Array.from({length:20},(_,i)=>i+1);

function makePolicies(G){
  const top2=p=>{ const o=G.S.market.map((it,i)=>({i,v:it.curse?-99:it.p})).sort((a,b)=>b.v-a.v); return [o[0]?o[0].i:null,o[1]?o[1].i:null]; };
  const base=p=>{ const bids=G.S.market.map(()=>({amt:0,type:"cons",intent:"keep",target:null})); if(!p.alive) return bids;
    const [t]=top2(p); if(t==null) return bids; bids[t]={amt:Math.min(G.consCapFor(p),5),type:"cons",intent:"keep",target:null}; return bids; };
  const honest=p=>base(p); honest.mark=p=>top2(p)[0];
  const bluff=p=>base(p);  bluff.mark=p=>top2(p)[1];
  const nomark=p=>base(p);
  return {honest,bluff,nomark};
}
function run(setup){
  const out={};
  for(const name of ['honest','bluff','nomark']){
    const G=loadGame(P); if(setup) setup(G);
    const pol=makePolicies(G)[name];
    const st=G.runMany({n:N,policies:{0:pol}});
    let tax=0,mi=0,mb=0,ui=0,ub=0;
    /* runMany 沒回傳 markStat 聚合，這裡再跑一次逐局取（同種子，決定性） */
    for(let s=1;s<=N;s++){ const g=G.playPolicyGame(s,{0:pol}); tax+=g.markStat.tax; mi+=g.markStat.markedItems; mb+=g.markStat.markedBids; ui+=g.markStat.unmarkedItems; ub+=g.markStat.unmarkedBids; }
    out[name]={win:st.winRate[0]*100, tax:tax/N, markedAvg:mi?mb/mi:NaN, unmarkedAvg:ui?ub/ui:NaN};
  }
  return out;
}
const fmt=o=>Object.keys(o).map(k=>`${k} ${o[k].win.toFixed(2)}%`).join('  ');
const pp=(a,b)=>(a-b).toFixed(2);
console.log(`n=${N}`);
/* G4 等價 */
{
  const O=loadGame(P); O.CFG.MARK_ON=false; const N1=loadGame(P); N1.CFG.MARK_ON=false;
  const base=JSON.stringify(O.trace(seeds));
  const full=JSON.stringify(loadGame(P).trace(seeds));
  console.log('[G4] MARK_ON=true 與 false 的 trace:', base===full?'相等 ❌（沒進牌局）':'不相等 ✅');
}
/* G1 混合桌（預設角色分型） */
const mixed=run(null);
console.log('\n[G1 混合桌]',fmt(mixed));
const wins=Object.values(mixed).map(x=>x.win); const spread=Math.max(...wins)-Math.min(...wins);
console.log(`  兩兩最大差 ${spread.toFixed(2)}pp ${spread<=3?'✅ ≤3':'❌ >3'}`);
/* G1 換桌 */
const allAvoid=run(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='avoid'; }));
const allContest=run(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='contest'; }));
console.log('[G1 全怯場桌]',fmt(allAvoid),`  honest−bluff ${pp(allAvoid.honest.win,allAvoid.bluff.win)}pp ${allAvoid.honest.win-allAvoid.bluff.win>=2?'✅ 誠實優':'❌'}`);
console.log('[G1 全搶標桌]',fmt(allContest),`  bluff−honest ${pp(allContest.bluff.win,allContest.honest.win)}pp ${allContest.bluff.win-allContest.honest.win>=2?'✅ 虛張優':'❌'}`);
/* G2 活性：被盯拍品的平均出價人數 vs 未盯 */
console.log(`\n[G2 活性] 混合桌 被盯件平均出價人數 ${mixed.honest.markedAvg.toFixed(2)} vs 未盯 ${mixed.honest.unmarkedAvg.toFixed(2)}`);
console.log(`          全怯場桌 ${allAvoid.honest.markedAvg.toFixed(2)} vs ${allAvoid.honest.unmarkedAvg.toFixed(2)} ${allAvoid.honest.markedAvg<=allAvoid.honest.unmarkedAvg*0.9?'✅ −10%':'❌'}`);
console.log(`          全搶標桌 ${allContest.honest.markedAvg.toFixed(2)} vs ${allContest.honest.unmarkedAvg.toFixed(2)} ${allContest.honest.markedAvg>=allContest.honest.unmarkedAvg*1.1?'✅ +10%':'❌'}`);
/* G3 稅有牙 */
const noTax=run(G=>{ G.CFG.MARK_TAX=0; });
console.log(`\n[G3 稅] TAX=0: bluff−honest ${pp(noTax.bluff.win,noTax.honest.win)}pp（不得 ≥+1）${noTax.bluff.win-noTax.honest.win<1?'✅':'❌'}；TAX=1: ${pp(mixed.bluff.win,mixed.honest.win)}pp（應 <0）${mixed.bluff.win<mixed.honest.win?'✅':'❌'}`);
console.log(`  bluff 每局平均繳稅 ${mixed.bluff.tax.toFixed(2)}（TAX=1）`);

/* ===== G1′（2026-09-02 探索後追加，待使用者裁定是否取代 G1）：對等出價（主標 5＋側標 1），只差盯哪件 ===== */
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
    const G=loadGame(P); if(setup) setup(G);
    const pol=fairPolicies(G)[name];
    const st=G.runMany({n:N,policies:{0:pol}});
    let mi=0,mb=0,ui=0,ub=0;
    for(let s=1;s<=N;s++){ const g=G.playPolicyGame(s,{0:pol}); mi+=g.markStat.markedItems; mb+=g.markStat.markedBids; ui+=g.markStat.unmarkedItems; ub+=g.markStat.unmarkedBids; }
    out[name]={win:st.winRate[0]*100, markedAvg:mi?mb/mi:NaN, unmarkedAvg:ui?ub/ui:NaN};
  }
  return out;
}
const fm=run=>Object.keys(run).map(k=>`${k} ${run[k].win.toFixed(2)}%`).join('  ');
const fMixed=runFair(null), fAvoid=runFair(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='avoid'; })), fContest=runFair(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='contest'; }));
const sp=o=>{ const w=Object.values(o).map(x=>x.win); return Math.max(...w)-Math.min(...w); };
console.log('\n[G1′ 混合桌]',fm(fMixed),`  最大差 ${sp(fMixed).toFixed(2)}pp ${sp(fMixed)<=3?'✅':'❌'}`);
console.log('[G1′ 全怯場桌]',fm(fAvoid),`  msec−mnone ${(fAvoid.msec.win-fAvoid.mnone.win).toFixed(2)}pp`);
console.log('[G1′ 全搶標桌]',fm(fContest),`  msec−mnone ${(fContest.msec.win-fContest.mnone.win).toFixed(2)}pp`);
console.log(`[G2′ 活性（排除盯者自己）] 怯場桌 被盯 ${fAvoid.mtop.markedAvg.toFixed(2)} vs 未盯 ${fAvoid.mtop.unmarkedAvg.toFixed(2)} ${fAvoid.mtop.markedAvg<=fAvoid.mtop.unmarkedAvg*0.9?'✅':'❌'}；搶標桌 ${fContest.mtop.markedAvg.toFixed(2)} vs ${fContest.mtop.unmarkedAvg.toFixed(2)} ${fContest.mtop.markedAvg>=fContest.mtop.unmarkedAvg*1.1?'✅':'❌'}`);
