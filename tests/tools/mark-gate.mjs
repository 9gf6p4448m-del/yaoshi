/* 盯上宣告閘門（GAME_DESIGN §5.8）。跑法：node mark-gate.mjs [n]（閘門 n≥10000）

   ★★ 2026-09-03 使用者裁定：放行門檻＝ G1′／G2′；G1 降為歷史觀察值，不再擋上線 ★★
   為什麼換軸：原版 G1 的軸是「誠實／虛張／不盯」，但三張桌實測**純虛張（盯了不出價）一律最差**，
   連 TAX=0 都輸誠實 1.7pp——這個軸上根本不存在「換桌會翻盤」，留著它等於永遠紅燈。
   G1′ 換成**對等對照**：三個策略出價完全一樣（主標 5＋側標＝次高行情一半；2026-09-03 裁定甲前側標為 1），只差「盯哪一件」，
   量到的位移就純粹來自宣告本身，不混入「有沒有出價」的成本差。

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
console.log('');
console.log('===== G1 歷史軸（僅供參考，2026-09-03 起不擋上線）=====');
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

/* ===== G1′（2026-09-02 探索後追加，待使用者裁定是否取代 G1）：對等出價（主標 5＋側標＝次高行情一半，2026-09-03 前為 1），只差盯哪件 ===== */
function fairPolicies(G){
  const top2=p=>{ const o=G.S.market.map((it,i)=>({i,v:it.curse?-99:it.p})).sort((a,b)=>b.v-a.v); return [o[0]?o[0].i:null,o[1]?o[1].i:null]; };
  const base=p=>{ const b=G.S.market.map(()=>({amt:0,type:"cons",intent:"keep",target:null})); if(!p.alive) return b;
    const [t,d]=top2(p); if(t!=null) b[t]={amt:Math.min(G.consCapFor(p),5),type:"cons",intent:"keep",target:null}; if(d!=null) b[d]={amt:Math.max(1,Math.ceil(Math.abs(G.S.market[d].p)/2)),type:"cons",intent:"keep",target:null}; return b; };
  /* 側標金額 1 → 次高件行情的一半（2026-09-03 使用者裁定甲）：信譽層上線後「盯次高卻只出 1」會被記 0.17、宣告形同廢話，
     G1′ 量到的不再是「換桌會不會翻盤」而是「沒人信的宣告有多少影響」。改成可信的宣告（cred≈0.5）再量翻盤；三策略出價仍完全相同、P1/P2/P3 門檻未動。 */
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
    /* G2′ 反事實量尺（2026-09-03 使用者裁定）：真人主標那件（top2[0]）上「別人」的出價筆數。
       mtop 與 mnone 出價完全相同、同種子，唯一差別是有沒有盯它——差值就是宣告的純效果，
       不再混入「那件本來就最搶手」。掛 onBidSettle 純讀，不動引擎。 */
    let topItems=0,topOthers=0;
    const top2=()=>{ const o=G.S.market.map((it,i)=>({i,v:it.curse?-99:it.p})).sort((a,b)=>b.v-a.v); return o[0]?o[0].i:null; };
    for(const R of Object.values(G.ROLES)){ R.hooks=R.hooks||{}; const old=R.hooks.onBidSettle;
      R.hooks.onBidSettle=function(ctx){ if(!ctx.p.ai&&ctx.p.id===0){ const t=top2(); if(t!=null&&ctx.item===G.S.market[t]){ topItems++; topOthers+=ctx.nBids-1; } } if(old) return old.apply(this,arguments); }; }
    const st=G.runMany({n:N,policies:{0:pol}});
    out[name]={win:st.winRate[0]*100, topOthersAvg:topItems?topOthers/topItems:NaN};
  }
  return out;
}
const fm=run=>Object.keys(run).map(k=>`${k} ${run[k].win.toFixed(2)}%`).join('  ');
const fMixed=runFair(null), fAvoid=runFair(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='avoid'; })), fContest=runFair(G=>Object.values(G.ROLES).forEach(R=>{ if(R.ai) R.ai.markReact='contest'; }));
const sp=o=>{ const w=Object.values(o).map(x=>x.win); return Math.max(...w)-Math.min(...w); };
console.log('');
console.log('===== G1′／G2′ 放行門檻（2026-09-03 使用者裁定）=====');
/* 判定條件（可機械判定，訂於 2026-09-03；日後要改走 02 §2.1）：
     P1 混合桌：三者最大差 ≤3pp——預設桌上沒有一種釘法支配另外兩種
     P2 全怯場桌：盯側標 − 不盯 ≥ +5pp——滿桌怯場時，把人從側標趕走是有利的
     P3 全搶標桌：盯側標 − 不盯 ≤ −3pp——同一招換到滿桌搶標要變成有害（＝換桌會翻盤）
       ★P3 門檻 −5 → −3（2026-09-03 使用者裁定乙′）。原標準錯在哪：−5 是「11σ」的統計門檻，卻被當成設計上的最小傷害；
       而且它立在信譽層（v0.21）存在之前、預設所有宣告等重。信譽上線後實測 n=10000：側標 1／行情一半／全額 → −4.90／−4.10／−2.10pp，
       宣告越可信傷害越小（成本壓扁差距，不是 AI 反應變弱），−5 在此引擎上沒有任何側標金額能到。−3 仍 ≈6.7σ，統計意義未變。
       為什麼現在才知道：信譽層把「宣告」從等重變成加權，P3 的量測對象跟著縮水，是本卷才出現的前提變更（docs/experiments/2026-09-03-markcred-report.md §4.7）。★
   三條全過才算 G1′ 通過。±5pp 的來由：n=10000 時單點 SE≈0.45pp，5pp≈11σ，
   遠大於量測雜訊；不是為了讓現況剛好過（現況實測是 +22.69／−10.68，離門檻很遠）。 */
const P1=sp(fMixed)<=3;
const dAvoid=fAvoid.msec.win-fAvoid.mnone.win, dContest=fContest.msec.win-fContest.mnone.win;
const P2=dAvoid>=5, P3=dContest<=-3;
console.log('[G1′ 混合桌]',fm(fMixed),`  最大差 ${sp(fMixed).toFixed(2)}pp　P1(≤3pp) ${P1?'✅':'❌'}`);
console.log('[G1′ 全怯場桌]',fm(fAvoid),`  盯側標−不盯 ${dAvoid>=0?'+':''}${dAvoid.toFixed(2)}pp　P2(≥+5pp) ${P2?'✅':'❌'}`);
console.log('[G1′ 全搶標桌]',fm(fContest),`  盯側標−不盯 ${dContest>=0?'+':''}${dContest.toFixed(2)}pp　P3(≤-3pp) ${P3?'✅':'❌'}`);
console.log('');
console.log(`[G1′ 總判定] ${P1&&P2&&P3?'✅ 通過（換桌會翻盤，且預設桌上沒有支配釘法）':'❌ 未通過'}`);
/* G2′ 活性：被盯拍品的出價人數有沒有真的被推開／吸過來。
   ★已知量測缺陷（2026-09-03 記錄，本輪不處置）★：mtop 盯的永遠是「p 值最高的那件」，
   而那件本來就最多人搶——「被盯」與「本來就最搶手」被混在同一個數字裡。
   所以這兩格量的不是純粹的趨避/吸引，**兩個方向都可能被污染**：
   實測也證明它不穩——2026-09-02 的引擎版本上是怯場桌紅、搶標桌綠，
   2026-09-03（v0.19）反過來變成怯場桌綠、搶標桌紅，而中間沒有人動過盯上的邏輯。
   要修得改成「同一件在被盯與沒被盯兩次跑之間的出價人數差」（控制住『它本來多搶手』）。
   ★2026-09-03 已修成反事實量法（見 runFair 的 topOthersAvg）：同種子、同出價，只差有沒有盯主標，比較主標那件上別人的出價數。
   上面這段保留為沿革。G2′ 仍是活性檢查（機制有沒有在動），放行仍看 G1′ 三條。 */
console.log('');
{ const rA=fAvoid.mtop.topOthersAvg/fAvoid.mnone.topOthersAvg, rC=fContest.mtop.topOthersAvg/fContest.mnone.topOthersAvg;
  console.log(`[G2′ 反事實活性] 主標那件上別人的出價數（盯 vs 不盯，同種子同出價）：怯場桌 ${fAvoid.mtop.topOthersAvg.toFixed(2)} vs ${fAvoid.mnone.topOthersAvg.toFixed(2)}（×${rA.toFixed(2)}）${rA<=0.9?'✅ 讓路':'❌'}；搶標桌 ${fContest.mtop.topOthersAvg.toFixed(2)} vs ${fContest.mnone.topOthersAvg.toFixed(2)}（×${rC.toFixed(2)}）${rC>=1.1?'✅ 撲上':'❌'}；混合桌 ${fMixed.mtop.topOthersAvg.toFixed(2)} vs ${fMixed.mnone.topOthersAvg.toFixed(2)}`); }
