/* 位移歸因：(a) 8 張＋單一新牌 各自的三策略位移 (b) 24 張但新 16 張 hooks 全拆（只留判定與獎勵） */
import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const N=parseInt(process.argv[2]||'10000',10);
const NEW_IDS=['wish_zuling','wish_xianghuo','wish_trinity','wish_bigfish','wish_allin','wish_bargain','wish_yamingwin','wish_solo',
  'wish_rival','wish_crowd','wish_poisonrival','wish_bloodbath','wish_unscathed','wish_crush','wish_comeback','wish_exorcise'];
const pols=['splitter','greedy','hoarder'];
function measure(prep){ const r={}; for(const name of pols){ const G=loadGame(P); prep(G); r[name]=G.runMany({n:N,policies:{0:G.POLICIES[name]}}).winRate[0]*100; } return r; }
const fmt=(b,a)=>pols.map(n=>`${n} ${(a[n]-b[n])>=0?'+':''}${(a[n]-b[n]).toFixed(2)}`).join('  ');
console.log(`n=${N}`);
const base=measure(G=>NEW_IDS.forEach(id=>{ delete G.WISHES[id]; }));
console.log('基準（8 張）:',pols.map(n=>`${n} ${base[n].toFixed(2)}`).join('  '));
const full=measure(()=>{}); console.log('24 張:',fmt(base,full));
const nohook=measure(G=>NEW_IDS.forEach(id=>{ delete G.WISHES[id].hooks; })); console.log('24 張、新牌 hooks 全拆:',fmt(base,nohook));
const noreward=measure(G=>NEW_IDS.forEach(id=>{ G.WISHES[id].reward=()=>{}; })); console.log('24 張、新牌獎勵歸零(留 hooks):',fmt(base,noreward));
console.log('\n逐張（8 張＋該牌）位移：');
for(const id of NEW_IDS){
  const r=measure(G=>NEW_IDS.filter(x=>x!==id).forEach(x=>{ delete G.WISHES[x]; }));
  console.log(`  ${id.padEnd(18)} ${fmt(base,r)}`);
}
