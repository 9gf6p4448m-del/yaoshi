import {loadGame} from './load.mjs';
const P='C:/Users/shung/OneDrive/桌面/妖市/index.html';
const N=parseInt(process.argv[2]||'2000',10);
const pols=['splitter','greedy','hoarder'];
const out={};
for(const on of [false,true]){
  for(const name of pols){
    const G=loadGame(P);
    G.CFG.RULE_ON=on;
    const t0=Date.now();
    const st=G.runMany({n:N, policies:{0:G.POLICIES[name]}});
    out[`${on?'ON ':'OFF'}/${name}`]={
      win:(st.winRate[0]*100),
      len:st.avgGameLength, life:st.avgFinalLife[0],
      unsold:st.unsoldRate*100,
      ruleFired:st.ruleFired, ruleStat:st.ruleStat,
      ms:Date.now()-t0,
    };
  }
}
console.log(`n=${N}`);
for(const k of Object.keys(out)){
  const o=out[k];
  console.log(`${k}\t勝率 ${o.win.toFixed(2)}%\t平均長度 ${o.len.toFixed(2)}\t最終壽命 ${o.life.toFixed(2)}\t流標率 ${o.unsold.toFixed(1)}%\t(${o.ms}ms)`);
  console.log(`    規則觸發=${JSON.stringify(o.ruleFired)} 強制塞袋=${o.ruleStat.forced} 一注壓中多件=${o.ruleStat.multi} 落標多付=${o.ruleStat.extra}`);
}
console.log('\n位移（ON − OFF，pp）：');
for(const name of pols){
  const d=out[`ON /${name}`].win-out[`OFF/${name}`].win;
  console.log(`  ${name}: ${out[`OFF/${name}`].win.toFixed(2)} → ${out[`ON /${name}`].win.toFixed(2)}　位移 ${d>=0?'+':''}${d.toFixed(2)}pp ${Math.abs(d)<=1.5?'✅ ≤1.5pp':'❌ 超過 1.5pp'}`);
}
