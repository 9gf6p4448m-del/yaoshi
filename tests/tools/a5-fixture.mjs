import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const N=parseInt(process.argv[2]||'2000',10);
const pols=['splitter','greedy','hoarder'];
/* 治具變體：策略在「全詛咒市集」的行為
   raw     ＝原樣（只會出 keep → 收祟夜被作廢＝白吃）
   abstain ＝全詛咒市集一律不出手
   poison  ＝全詛咒市集對第一件詛咒品下 1 點毒標，塞給壽命最高的存活對手 */
function wrap(G,f,mode){
  return p=>{
    const b=f(p);
    const m=G.S.market;
    if(mode==='raw'||!m.length||!m.every(it=>it.curse)) return b;
    if(mode==='abstain') return m.map(()=>null);
    const foes=G.S.players.filter(q=>q.alive&&q.id!==p.id);
    if(!foes.length||p.life<=2) return m.map(()=>null);
    const tgt=foes.reduce((a,q)=>q.life>a.life?q:a,foes[0]);
    const out=m.map(()=>null); out[0]={amt:1,type:"cons",intent:"poison",target:tgt.id}; return out;
  };
}
for(const mode of ['raw','abstain','poison']){
  const res={};
  for(const on of [false,true]) for(const name of pols){
    const G=loadGame(P); G.CFG.RULE_ON=on;
    const st=G.runMany({n:N, policies:{0:wrap(G,G.POLICIES[name],mode)}});
    res[`${on}/${name}`]=st.winRate[0]*100;
  }
  console.log(`\n[${mode}] n=${N}`);
  for(const name of pols){ const off=res[`false/${name}`],on=res[`true/${name}`],d=on-off;
    console.log(`  ${name}: ${off.toFixed(2)} → ${on.toFixed(2)}  位移 ${d>=0?'+':''}${d.toFixed(2)}pp ${Math.abs(d)<=1.5?'✅':'❌'}`); }
}
