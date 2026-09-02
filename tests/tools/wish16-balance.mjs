/* W4 平衡量測（docs/experiments/2026-09-02-acceptance-wish16.md）。跑法：node wish16-balance.mjs [n]（閘門 n≥10000）
   1) 24 張逐張達成率（judgeWish 判定次數／達成次數，包 check 計數，不改結果）
   2) 座位 0（aiLike）條件勝率：該局座位 0 至少抽到一次牌 X 的局，座位 0 勝率；並列無條件基準
   3) 三策略位移：牌庫 8 張（執行期刪新 16 鍵）vs 24 張 */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const N=parseInt(process.argv[2]||'10000',10);
const NEW_IDS=['wish_zuling','wish_xianghuo','wish_trinity','wish_bigfish','wish_allin','wish_bargain','wish_yamingwin','wish_solo',
  'wish_rival','wish_crowd','wish_poisonrival','wish_bloodbath','wish_unscathed','wish_crush','wish_comeback','wish_exorcise'];
function instrument(G){
  const st={judged:{},ach:{},gamesWith:{},winsWith:{}};
  let drewThisGame=new Set();
  Object.keys(G.WISHES).forEach(id=>{
    st.judged[id]=0; st.ach[id]=0; st.gamesWith[id]=0; st.winsWith[id]=0;
    const w=G.WISHES[id], orig=w.check;
    w.check=function(ctx){ const r=orig.call(w,ctx); st.judged[id]++; if(r) st.ach[id]++; if(ctx.p.id===0) drewThisGame.add(id); return r; };
  });
  st.begin=()=>{ drewThisGame=new Set(); };
  st.end=(g)=>{ drewThisGame.forEach(id=>{ st.gamesWith[id]++; if(g.winnerId===0) st.winsWith[id]++; }); };
  return st;
}
console.log(`n=${N}`);
/* ---- 1)+2) aiLike 座位 0 ---- */
{
  const G=loadGame(P); const st=instrument(G); let wins=0; const t0=Date.now();
  for(let s=1;s<=N;s++){ st.begin(); const g=G.playPolicyGame(s,{0:G.POLICIES.aiLike}); st.end(g); if(g.winnerId===0) wins++; }
  const base=wins/N*100;
  console.log(`\n[基準] 座位 0 aiLike 無條件勝率 ${base.toFixed(2)}%（${Date.now()-t0}ms）`);
  console.log('\n牌\t判定次\t達成率\t\t抽到局數\t條件勝率\t相對基準');
  const rows=[];
  Object.keys(G.WISHES).forEach(id=>{
    const ar=st.judged[id]?st.ach[id]/st.judged[id]*100:NaN;
    const cw=st.gamesWith[id]?st.winsWith[id]/st.gamesWith[id]*100:NaN;
    const rel=cw/base;
    const flagA=(ar<15||ar>80)?'❌達成率':'';
    const flagB=(rel<0.7||rel>1.5)?'❌條件勝率':'';
    rows.push({id,ar,cw,rel,flag:(flagA+flagB)||'✅'});
    console.log(`${id}${NEW_IDS.includes(id)?'*':''}\t${st.judged[id]}\t${ar.toFixed(1)}%\t\t${st.gamesWith[id]}\t\t${cw.toFixed(2)}%\t\t×${rel.toFixed(2)}\t${(flagA+flagB)||'✅'}`);
  });
  console.log('（* = 新 16 張；條件勝率帶＝基準 ×0.7～×1.5，見報告的 §2.1 例外說明）');
}
/* ---- 3) 三策略位移 ---- */
const pols=['splitter','greedy','hoarder']; const out={};
for(const on of [false,true]) for(const name of pols){
  const G=loadGame(P); if(!on) NEW_IDS.forEach(id=>{ delete G.WISHES[id]; });
  const t0=Date.now(); const r=G.runMany({n:N,policies:{0:G.POLICIES[name]}});
  out[`${on?'24':'8'}/${name}`]={win:r.winRate[0]*100,ms:Date.now()-t0};
}
console.log('\n三策略位移（24 張 − 8 張，pp）：');
for(const name of pols){
  const a=out[`8/${name}`].win,b=out[`24/${name}`].win,d=b-a;
  console.log(`  ${name}: ${a.toFixed(2)} → ${b.toFixed(2)}　位移 ${d>=0?'+':''}${d.toFixed(2)}pp ${Math.abs(d)<=1.5?'✅ ≤1.5pp':'❌ 超過 1.5pp'}`);
}
